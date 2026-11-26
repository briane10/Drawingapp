/* Data layer. Two backends with the same shape:
   - Supabase (real games across phones anywhere)
   - Local test mode (no setup; syncs between tabs on one device) */
(function (root) {
  'use strict';

  const TABLES = ['pc_rooms', 'pc_players', 'pc_picks', 'pc_results'];
  const PK = {
    pc_rooms: (r) => r.code,
    pc_players: (r) => r.id,
    pc_picks: (r) => [r.room, r.player, r.kind, r.round].join('|'),
    pc_results: (r) => [r.room, r.kind, r.round].join('|'),
  };

  function err(e) {
    const msg = (e && (e.message || e.error_description || e.details)) || String(e);
    const x = new Error(msg);
    x.code = e && e.code;
    return x;
  }

  // ---------- Supabase ----------
  function supabaseStore(url, key) {
    const sb = root.supabase.createClient(url, key, { realtime: { params: { eventsPerSecond: 20 } } });

    async function all(table, col, code) {
      const rows = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from(table).select('*').eq(col, code).range(from, from + 999);
        if (error) throw err(error);
        rows.push(...data);
        if (data.length < 1000) break;
      }
      return rows;
    }

    return {
      kind: 'supabase',
      async getRoom(code) {
        const { data, error } = await sb.from('pc_rooms').select('*').eq('code', code).maybeSingle();
        if (error) throw err(error);
        return data;
      },
      async createRoom(row) {
        const { data, error } = await sb.from('pc_rooms').insert(row).select().single();
        if (error) throw err(error);
        return data;
      },
      async updateRoom(code, patch) {
        const { data, error } = await sb.from('pc_rooms').update(Object.assign({}, patch, { updated_at: new Date().toISOString() })).eq('code', code).select().single();
        if (error) throw err(error);
        return data;
      },
      async loadAll(code) {
        const [room, players, picks, results] = await Promise.all([
          this.getRoom(code), all('pc_players', 'room', code), all('pc_picks', 'room', code), all('pc_results', 'room', code),
        ]);
        return { room, players, picks, results };
      },
      async addPlayer(row) {
        const { data, error } = await sb.from('pc_players').insert(row).select().single();
        if (error) throw err(error);
        return data;
      },
      async updatePlayer(id, patch) {
        const { error } = await sb.from('pc_players').update(patch).eq('id', id);
        if (error) throw err(error);
      },
      async removePlayer(id) {
        const { error } = await sb.from('pc_players').delete().eq('id', id);
        if (error) throw err(error);
      },
      async upsertPick(row) {
        const { error } = await sb.from('pc_picks').upsert(Object.assign({}, row, { updated_at: new Date().toISOString() }), { onConflict: 'room,player,kind,round' });
        if (error) throw err(error);
      },
      async upsertResults(rows) {
        if (!rows.length) return;
        const { error } = await sb.from('pc_results').upsert(rows, { onConflict: 'room,kind,round' });
        if (error) throw err(error);
      },
      subscribe(code, onChange, onStatus) {
        const ch = sb.channel('pc-' + code + '-' + Math.random().toString(36).slice(2, 7));
        TABLES.forEach((t) => {
          ch.on('postgres_changes', { event: '*', schema: 'public', table: t, filter: (t === 'pc_rooms' ? 'code' : 'room') + '=eq.' + code }, (p) => {
            onChange({ table: t, type: p.eventType, row: p.new && Object.keys(p.new).length ? p.new : null, old: p.old });
          });
        });
        ch.subscribe((s) => onStatus && onStatus(s));
        return () => sb.removeChannel(ch);
      },
    };
  }

  // ---------- Local test mode ----------
  function localStore() {
    const KEY = 'pc_local_db_v1';
    const bc = 'BroadcastChannel' in root ? new BroadcastChannel('pc_local') : null;
    const listeners = new Set();
    function read() {
      try {
        const db = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (db) return db;
      } catch (e) { /* ignore */ }
      return { pc_rooms: {}, pc_players: {}, pc_picks: {}, pc_results: {} };
    }
    function write(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ } }
    function emit(ev) {
      listeners.forEach((fn) => fn(ev));
      if (bc) bc.postMessage(ev);
    }
    if (bc) bc.onmessage = (m) => listeners.forEach((fn) => fn(m.data));
    function put(table, row, type) {
      const db = read();
      const k = PK[table](row);
      const existed = !!db[table][k];
      db[table][k] = Object.assign({}, db[table][k] || {}, row);
      write(db);
      emit({ table, type: type || (existed ? 'UPDATE' : 'INSERT'), row: db[table][k] });
      return db[table][k];
    }
    function pickOpen(r, k, n) {
      const room = read().pc_rooms[r];
      if (!room) return false;
      return (k === 'play' && room.round === n) || (k === 'drive' && room.rz_phase === 'open' && room.rz_round === n);
    }
    const uuid = () => (root.crypto && crypto.randomUUID ? crypto.randomUUID() : 'p' + Math.random().toString(36).slice(2));
    const ROOM_DEFAULTS = { league: 'nfl', auto: true, round: 1, pending: [], lock_log: [], delay: null, last_seq: null, rz_phase: 'none', rz_round: 0, rz_drive: null, rz_label: null, rz_done: null, status: null, note: null, event_id: null, game_label: null };

    return {
      kind: 'local',
      async getRoom(code) { return read().pc_rooms[code] || null; },
      async createRoom(row) {
        if (read().pc_rooms[row.code]) throw new Error('duplicate key');
        return put('pc_rooms', Object.assign({}, ROOM_DEFAULTS, row, { created_at: new Date().toISOString() }), 'INSERT');
      },
      async updateRoom(code, patch) {
        if (!read().pc_rooms[code]) throw new Error('Room not found');
        return put('pc_rooms', Object.assign({}, patch, { code, updated_at: new Date().toISOString() }));
      },
      async loadAll(code) {
        const db = read();
        const by = (t) => Object.values(db[t]).filter((r) => r.room === code);
        return { room: db.pc_rooms[code] || null, players: by('pc_players'), picks: by('pc_picks'), results: by('pc_results') };
      },
      async addPlayer(row) { return put('pc_players', Object.assign({ id: uuid(), created_at: new Date().toISOString() }, row), 'INSERT'); },
      async updatePlayer(id, patch) { put('pc_players', Object.assign({}, patch, { id })); },
      async removePlayer(id) {
        const db = read();
        const old = db.pc_players[id];
        delete db.pc_players[id];
        Object.keys(db.pc_picks).forEach((k) => { if (db.pc_picks[k].player === id) delete db.pc_picks[k]; });
        write(db);
        emit({ table: 'pc_players', type: 'DELETE', row: null, old: old || { id } });
      },
      async upsertPick(row) {
        if (!pickOpen(row.room, row.kind, row.round)) {
          const e = new Error('new row violates row-level security policy');
          e.code = '42501';
          throw e;
        }
        put('pc_picks', Object.assign({}, row, { updated_at: new Date().toISOString() }));
      },
      async upsertResults(rows) { rows.forEach((r) => put('pc_results', Object.assign({ void: false, source: 'auto' }, r))); },
      subscribe(code, onChange, onStatus) {
        const fn = (ev) => {
          const r = ev.row || ev.old || {};
          if ((ev.table === 'pc_rooms' ? r.code : r.room) === code || (ev.type === 'DELETE' && ev.table === 'pc_players')) onChange(ev);
        };
        listeners.add(fn);
        if (onStatus) setTimeout(() => onStatus('SUBSCRIBED'), 0);
        return () => listeners.delete(fn);
      },
    };
  }

  function create(cfg) {
    if (cfg && cfg.supabaseUrl && cfg.supabaseKey && root.supabase) return supabaseStore(cfg.supabaseUrl, cfg.supabaseKey);
    return localStore();
  }

  root.Store = { create, PK };
})(window);
