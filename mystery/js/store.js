/* Data layer. Two backends with the same shape:
   - Supabase (phones and the TV board on different devices)
   - Local test mode (no setup; syncs between tabs on one device) */
(function (root) {
  'use strict';

  const TABLES = ['mm_rooms', 'mm_players', 'mm_moves'];
  const LIMITS = { team: { search: 3, question: 2, theory: 1 }, solo: { search: 2, question: 1, theory: 1 } };

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
        const { data, error } = await sb.from(table).select('*').eq(col, code).order('created_at').range(from, from + 999);
        if (error) throw err(error);
        rows.push(...data);
        if (data.length < 1000) break;
      }
      return rows;
    }
    return {
      kind: 'supabase',
      async getRoom(code) {
        const { data, error } = await sb.from('mm_rooms').select('*').eq('code', code).maybeSingle();
        if (error) throw err(error);
        return data;
      },
      async createRoom(row) {
        const { data, error } = await sb.from('mm_rooms').insert(row).select().single();
        if (error) throw err(error);
        return data;
      },
      async updateRoom(code, patch) {
        const { data, error } = await sb.from('mm_rooms').update(Object.assign({}, patch, { updated_at: new Date().toISOString() })).eq('code', code).select().single();
        if (error) throw err(error);
        return data;
      },
      async loadAll(code) {
        const [room, players, moves] = await Promise.all([this.getRoom(code), all('mm_players', 'room', code), all('mm_moves', 'room', code)]);
        return { room, players, moves };
      },
      async addPlayer(row) {
        const { data, error } = await sb.from('mm_players').insert(row).select().single();
        if (error) throw err(error);
        return data;
      },
      async updatePlayer(id, patch) {
        const { error } = await sb.from('mm_players').update(patch).eq('id', id);
        if (error) throw err(error);
      },
      async removePlayer(id) {
        const { error } = await sb.from('mm_players').delete().eq('id', id);
        if (error) throw err(error);
      },
      async addMove(row) {
        const { data, error } = await sb.from('mm_moves').insert(row).select().single();
        if (error) throw err(error);
        return data;
      },
      subscribe(code, onChange, onStatus) {
        const ch = sb.channel('mm-' + code + '-' + Math.random().toString(36).slice(2, 7));
        TABLES.forEach((t) => {
          ch.on('postgres_changes', { event: '*', schema: 'public', table: t, filter: (t === 'mm_rooms' ? 'code' : 'room') + '=eq.' + code }, (p) => {
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
    const KEY = 'mm_local_db_v1';
    const bc = 'BroadcastChannel' in root ? new BroadcastChannel('mm_local') : null;
    const listeners = new Set();
    function read() {
      try {
        const db = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (db) return db;
      } catch (e) { /* ignore */ }
      return { mm_rooms: {}, mm_players: {}, mm_moves: {} };
    }
    function write(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ } }
    function emit(ev) {
      listeners.forEach((fn) => fn(ev));
      if (bc) bc.postMessage(ev);
    }
    if (bc) bc.onmessage = (m) => listeners.forEach((fn) => fn(m.data));
    const uuid = () => (root.crypto && crypto.randomUUID ? crypto.randomUUID() : 'x' + Math.random().toString(36).slice(2));
    let tick = 0;
    const now = () => new Date(Date.now() + ((tick++) % 1000) / 1000).toISOString();
    const DEFAULTS = { case_id: 'marrowby', phase: 'lobby', mode: 'team', difficulty: 'normal', teams: 2, ending: 'random', seed: 0, round: 0, game: 1, actors: [], reveal_step: 0 };
    function denied() { const e = new Error('new row violates row-level security policy'); e.code = '42501'; return e; }
    function moveOk(room, m) {
      if (!room || m.game !== room.game) return false;
      if (['search', 'question', 'theory'].includes(m.kind)) {
        const lim = (LIMITS[room.mode] || LIMITS.solo)[m.kind];
        return room.phase === 'play' && room.round === m.round && m.slot >= 0 && m.slot < lim;
      }
      if (m.kind === 'accuse') return ['play', 'accuse'].includes(room.phase) && m.round === 0 && m.slot === 0;
      return ['play', 'accuse'].includes(room.phase);
    }
    return {
      kind: 'local',
      async getRoom(code) { return read().mm_rooms[code] || null; },
      async createRoom(row) {
        const db = read();
        if (db.mm_rooms[row.code]) throw new Error('duplicate key');
        db.mm_rooms[row.code] = Object.assign({}, DEFAULTS, row, { created_at: now() });
        write(db);
        emit({ table: 'mm_rooms', type: 'INSERT', row: db.mm_rooms[row.code] });
        return db.mm_rooms[row.code];
      },
      async updateRoom(code, patch) {
        const db = read();
        if (!db.mm_rooms[code]) throw new Error('Room not found');
        db.mm_rooms[code] = Object.assign({}, db.mm_rooms[code], patch, { updated_at: now() });
        write(db);
        emit({ table: 'mm_rooms', type: 'UPDATE', row: db.mm_rooms[code] });
        return db.mm_rooms[code];
      },
      async loadAll(code) {
        const db = read();
        const by = (t) => Object.values(db[t]).filter((r) => r.room === code);
        return { room: db.mm_rooms[code] || null, players: by('mm_players'), moves: by('mm_moves') };
      },
      async addPlayer(row) {
        const db = read();
        const p = Object.assign({ id: uuid(), team: 1, created_at: now() }, row);
        db.mm_players[p.id] = p;
        write(db);
        emit({ table: 'mm_players', type: 'INSERT', row: p });
        return p;
      },
      async updatePlayer(id, patch) {
        const db = read();
        if (!db.mm_players[id]) return;
        db.mm_players[id] = Object.assign({}, db.mm_players[id], patch);
        write(db);
        emit({ table: 'mm_players', type: 'UPDATE', row: db.mm_players[id] });
      },
      async removePlayer(id) {
        const db = read();
        const old = db.mm_players[id];
        delete db.mm_players[id];
        write(db);
        emit({ table: 'mm_players', type: 'DELETE', row: null, old: old || { id } });
      },
      async addMove(row) {
        const db = read();
        const room = db.mm_rooms[row.room];
        if (!moveOk(room, row)) throw denied();
        const dupe = Object.values(db.mm_moves).some((m) => m.room === row.room && m.game === row.game && m.actor === row.actor && m.kind === row.kind && m.round === row.round && m.slot === row.slot);
        if (dupe) { const e = new Error('duplicate key value violates unique constraint'); e.code = '23505'; throw e; }
        const m = Object.assign({ id: uuid(), created_at: now(), target: {} }, row);
        db.mm_moves[m.id] = m;
        write(db);
        emit({ table: 'mm_moves', type: 'INSERT', row: m });
        return m;
      },
      subscribe(code, onChange, onStatus) {
        const fn = (ev) => {
          const r = ev.row || ev.old || {};
          if ((ev.table === 'mm_rooms' ? r.code : r.room) === code || (ev.type === 'DELETE' && ev.table === 'mm_players')) onChange(ev);
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

  root.Store = { create };
})(window);
