/* Marrowby Manor: The Board Game. The TV shows the mansion board; phones roll, move, guess, and keep a picture notebook. */
(function () {
  'use strict';

  const D = window.BoardData;
  const BE = window.BoardEngine;
  const P = window.Portraits;
  const AVATARS = ['🕵️', '🔍', '🧐', '🦉', '🐈‍⬛', '🦊', '🐶', '🐼', '🦄', '🐸', '🐙', '🦁', '🐯', '🐨', '🐵', '🌟', '⚡', '🍩'];
  const $app = document.getElementById('app');
  const $modal = document.getElementById('modal');
  const $toasts = document.getElementById('toasts');

  // ---------- config + session ----------
  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  const params = new URLSearchParams(location.search);
  if (params.get('sbu') && params.get('sbk')) lsSet('mm_cfg', { supabaseUrl: params.get('sbu'), supabaseKey: params.get('sbk') });
  const fileCfg = window.MYSTERY_CONFIG || {};
  const cfg = fileCfg.supabaseUrl && fileCfg.supabaseKey ? fileCfg : lsGet('mm_cfg', {}) || {};
  const store = window.Store.create(cfg);
  const SESSION_KEY = 'mb_session' + (params.get('as') ? '_' + params.get('as').replace(/\W/g, '').slice(0, 8) : '');
  const session = lsGet(SESSION_KEY, {}) || {};
  session.players = session.players || {};
  if (!session.deviceKey) session.deviceKey = Math.random().toString(36).slice(2) + Date.now().toString(36);
  function saveSession() { lsSet(SESSION_KEY, session); }
  saveSession();

  const S = { view: 'home', code: null, room: null, players: {}, moves: [], me: null, online: 'connecting', G: null, Gkey: '', draft: {}, busy: false, seenLog: null, shownTok: {}, story: null, open: new Set() };
  const isHost = () => !!(S.room && S.room.host_key === session.deviceKey);
  const isBoard = () => isHost() && !S.me;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const me = () => S.players[S.me] || null;
  const myActor = () => { const p = me(); if (!p || !S.room) return null; return S.room.mode === 'team' ? 't' + (p.team || 1) : p.id; };
  const inGame = (a) => !!(S.room && (S.room.actors || []).includes(a));
  const face = (id, mood) => (P && P.has(id) ? P.svg(id, mood) : '');

  function toast(html, kind, ms) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.innerHTML = html;
    $toasts.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, ms || 3800);
  }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 25); } catch (e) { /* ignore */ } }
  function sfx(n) { if (window.Sfx) window.Sfx.play(n); }
  function openModal(html) { $modal.innerHTML = '<div class="sheet">' + html + '</div>'; $modal.hidden = false; }
  function closeModal() { $modal.hidden = true; $modal.innerHTML = ''; }
  function friendlyError(e) {
    const m = (e && e.message) || String(e);
    if (/mm_rooms|mm_players|mm_moves/.test(m) && /(does not exist|schema cache|not find)/i.test(m)) return 'The database isn’t set up yet. Open <a href="setup.html">setup</a>.';
    return esc(m);
  }

  // ---------- names & colors ----------
  function actorName(a, plain) {
    if (a === 'evidence') return (plain ? '' : '🤵 ') + 'Pembrook';
    if (/^t\d$/.test(a)) { const t = BE.TEAMS[+a.slice(1) - 1]; return (plain ? '' : t.emoji + ' ') + t.name; }
    const p = S.players[a];
    return p ? (plain ? '' : p.avatar + ' ') + p.name : 'A detective';
  }
  function actorColor(a) {
    if (/^t\d$/.test(a)) return BE.TEAMS[+a.slice(1) - 1].color;
    const i = ((S.room && S.room.actors) || []).indexOf(a);
    return BE.COLORS[Math.max(0, i) % BE.COLORS.length];
  }
  function actorBadge(a) {
    if (/^t\d$/.test(a)) return BE.TEAMS[+a.slice(1) - 1].emoji;
    const p = S.players[a];
    return p ? p.avatar : '🕵️';
  }
  const roomById = (id) => D.ROOMS.find((r) => r.id === id);
  const sus = (id) => D.SUSPECTS.find((x) => x.id === id);
  const wep = (id) => D.WEAPONS.find((x) => x.id === id);

  // ---------- game state ----------
  function G() {
    if (!S.room) return null;
    const key = [S.room.game, S.room.seed, S.room.difficulty, (S.room.actors || []).join(','), S.moves.length].join('|');
    if (S.Gkey !== key) { S.G = BE.replay(S.room, S.moves); S.Gkey = key; }
    return S.G;
  }

  function applyAll(data) {
    S.room = data.room;
    S.players = {};
    data.players.forEach((p) => { S.players[p.id] = p; });
    S.moves = data.moves;
    S.Gkey = '';
  }
  function applyChange(ev) {
    const { table, type, row, old } = ev;
    if (table === 'mm_rooms' && row) {
      const prev = S.room;
      S.room = Object.assign({}, S.room || {}, row);
      if (prev && prev.game !== S.room.game) { S.seenLog = null; S.shownTok = {}; S.draft = {}; }
    } else if (table === 'mm_players') {
      if (type === 'DELETE') {
        const id = (old && old.id) || (row && row.id);
        delete S.players[id];
        if (id === S.me) { S.me = null; delete session.players[S.code]; saveSession(); S.view = 'join'; }
      } else if (row) S.players[row.id] = row;
    } else if (table === 'mm_moves' && row && !S.moves.some((m) => m.id === row.id)) S.moves.push(row);
    S.Gkey = '';
    scheduleRender();
  }
  let renderTimer = null;
  function typing() { const a = document.activeElement; return !!(a && $app.contains(a) && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type !== 'checkbox'))); }
  document.addEventListener('focusout', () => setTimeout(() => { if (S.pending && !typing()) { S.pending = false; scheduleRender(); } }, 50));
  function scheduleRender() {
    if (S.view !== 'game') return;
    if (typing()) { S.pending = true; return; }
    if (renderTimer) return;
    renderTimer = requestAnimationFrame(() => { renderTimer = null; render(); });
  }

  async function openRoom(code) {
    if (S.unsub) { S.unsub(); S.unsub = null; }
    S.code = code;
    const data = await store.loadAll(code);
    if (!data.room) throw new Error('No game with code ' + code);
    if (data.room.case_id !== 'board') { location.replace('./?join=' + code); return false; }
    applyAll(data);
    S.me = session.players[code] && S.players[session.players[code]] ? session.players[code] : null;
    session.lastCode = code;
    saveSession();
    S.unsub = store.subscribe(code, applyChange, (st) => {
      S.online = st === 'SUBSCRIBED' ? 'live' : /ERROR|TIMED_OUT|CLOSED/.test(st) ? 'offline' : 'connecting';
      if (st === 'SUBSCRIBED') refresh();
      scheduleRender();
    });
    const url = new URL(location.href);
    url.searchParams.set('join', code);
    ['sbu', 'sbk'].forEach((k) => url.searchParams.delete(k));
    history.replaceState(null, '', url);
    return true;
  }
  async function refresh() { if (!S.code) return; try { applyAll(await store.loadAll(S.code)); scheduleRender(); } catch (e) { /* later */ } }
  setInterval(() => { if (S.code && !document.hidden) refresh(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.code) { refresh(); if (isBoard()) keepAwake(); } });
  async function patchRoom(patch) {
    const row = await store.updateRoom(S.code, patch);
    if (row) S.room = Object.assign({}, S.room, row);
    S.Gkey = '';
    scheduleRender();
  }
  let wake = null;
  async function keepAwake() { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { /* ignore */ } }

  // Every board-game action is stored as a move; the engine decides what it means.
  async function act(target, asActor) {
    const g = G();
    const actor = asActor || myActor();
    if (!actor) return false;
    S.busy = true;
    scheduleRender();
    try {
      const row = await store.addMove({ room: S.code, game: S.room.game || 1, actor, player: S.me, kind: 'share', round: 0, slot: Math.floor(Math.random() * 2e9), target: Object.assign({ turn: g.turn }, target) });
      if (row && !S.moves.some((m) => m.id === row.id)) S.moves.push(row);
      S.Gkey = '';
      return true;
    } catch (e) {
      toast('⚠️ ' + friendlyError(e), 'bad', 5000);
      refresh();
      return false;
    } finally {
      S.busy = false;
      scheduleRender();
    }
  }

  // ---------- notifications ----------
  function announce() {
    const g = G();
    if (!g) return;
    if (S.seenLog == null) { S.seenLog = g.log.length; return; }
    const fresh = g.log.slice(S.seenLog);
    S.seenLog = g.log.length;
    const mine = myActor();
    fresh.forEach((e) => {
      if (isBoard()) {
        if (e.t === 'roll') sfx('tick');
        if (e.t === 'guess') sfx(e.shows.length ? 'whoosh' : 'sting');
        if (e.t === 'special' && e.kind === 'lights') sfx('crash');
        if (e.t === 'special' && e.kind !== 'lights') sfx('sparkle');
        if (e.t === 'passage') sfx('whoosh');
        if (e.t === 'accuse') { sfx(e.ok ? 'chime' : 'sting'); accuseFlash(e); }
      }
      if (S.me && mine) {
        if (e.t === 'guess' && e.actor !== mine) {
          const mineShown = e.shows.find((x) => x.by === mine);
          if (mineShown) { toast('🤫 You showed <b>' + esc(BE.cardLabel(mineShown.card)) + '</b> to ' + esc(actorName(e.actor)) + '.', 'gold', 5000); buzz(40); }
        }
        if (e.t === 'skipturn' || e.t === 'guess' || e.t === 'skip' || e.t === 'special' || e.t === 'accuse') {
          if (g.current === mine && !g.over && e.actor !== mine) { toast('🎲 <b>Your turn!</b>', 'gold', 3500); buzz([80, 60, 80]); }
        }
        if (e.t === 'special' && e.kind === 'lights') toast('🕯️ Lights out! Everyone stumbled into a random room.', 'bad', 4500);
      }
    });
  }
  function accuseFlash(e) {
    const el = document.createElement('div');
    el.className = 'objection ' + (e.ok ? 'ok' : 'bad');
    el.innerHTML = '<div class="big">' + (e.ok ? 'SOLVED!' : 'WRONG!') + '</div><div class="sub">' + esc(actorName(e.actor)) + ' accused ' +
      esc(sus(e.who).name) + ', with the ' + esc(wep(e.what).name) + ', in the ' + esc(roomById(e.where).name) + (e.ok ? '!' : '… but that’s not right!') + '</div>';
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('out'), 3600);
    setTimeout(() => el.remove(), 4200);
  }

  // ---------- board host: end the game when someone wins ----------
  setInterval(() => {
    if (!isBoard() || !S.room || S.room.phase !== 'play') return;
    const g = G();
    if (g && g.over && !S.endingSoon) {
      S.endingSoon = true;
      setTimeout(async () => { S.endingSoon = false; if (S.room.phase === 'play') await patchRoom({ phase: 'reveal', reveal_step: 0 }); }, 4500);
    }
  }, 700);

  // =====================================================================
  // RENDER
  // =====================================================================
  function storyKey() {
    if (!isBoard() || S.view !== 'game' || !S.room) return null;
    if (S.room.phase === 'intro') return 'intro';
    if (S.room.phase === 'reveal' && (S.room.reveal_step || 0) === 0) return 'reveal' + (S.room.game || 1);
    return null;
  }
  function render() {
    const sk = storyKey();
    if (sk && S.story && S.story.key === sk && document.body.contains(S.story.el)) { announce(); return; }
    if (S.story && (!sk || S.story.key !== sk)) { S.story.ctl.destroy(); S.story = null; }
    if (isBoard() && S.view === 'game' && S.room && S.room.phase === 'play' && document.getElementById('bg-board') && S.boardGame === S.room.game) {
      announce();
      updateBoardPlay();
      return;
    }
    renderInner();
    const slot = document.getElementById('story-slot');
    if (sk && slot && window.Story) {
      const cards = sk === 'intro' ? D.INTRO : revealCards();
      const ctl = window.Story.mount(slot, cards, { onEnd: () => { const b = document.querySelector('.story-after .gold'); if (b) b.classList.add('glow'); } });
      S.story = { key: sk, el: slot, ctl };
    }
  }
  function renderInner() {
    document.body.className = S.view === 'game' ? (isBoard() ? 'is-board' : 'is-phone') : '';
    if (S.view === 'home') return renderHome();
    if (S.view === 'join') return renderJoin();
    announce();
    if (isBoard()) return renderBoard();
    if (!S.me) { S.view = 'join'; return renderJoin(); }
    return renderPhone();
  }

  // ---------- home ----------
  function renderHome() {
    const last = session.lastCode;
    $app.innerHTML = `
      <div class="home">
        <div class="crest">🎲</div>
        <h1 class="title">Marrowby Manor<br><span>The Board Game</span></h1>
        <p class="tag">Roll the dice, explore the mansion, and figure out <b>who</b> did it, <b>with what</b>, and <b>where</b>.<br>2–7 players (or teams) · ages 8+ · 20–40 minutes</p>
        <div class="card">
          <h2>📱 Join a game</h2>
          <div class="row"><input id="code" class="code-in" maxlength="6" placeholder="CODE" autocapitalize="characters" autocomplete="off" value="${esc(params.get('join') || '')}"><button class="btn gold" data-act="join">Join</button></div>
          ${last ? `<button class="btn ghost small" data-act="rejoin">↩︎ Back to game ${esc(last)}</button>` : ''}
        </div>
        <div class="card">
          <h2>📺 Set up the TV board</h2>
          <p class="muted">Do this on the iPad you’ll mirror to the TV.</p>
          <button class="btn" data-act="host">✨ Start a new board game</button>
          <details class="more"><summary>Open the board for a game that’s already running</summary>
            <div class="row"><input id="bcode" class="code-in" maxlength="6" placeholder="CODE" autocapitalize="characters"><button class="btn ghost" data-act="reboard">Open board</button></div>
          </details>
        </div>
        ${store.kind === 'local' ? '<div class="banner warn">🧪 Test mode: no database connected, so only tabs on this device can share a game.</div>' : ''}
        <p class="foot"><a href="#" data-act="rules">📜 How to play</a> · <a href="./">🕵️ The Detective Case (harder)</a></p>
      </div>`;
  }

  function renderJoin() {
    const room = S.room;
    const started = room && room.phase !== 'lobby';
    const p = me() || {};
    const draft = S.draft.profile || { name: p.name || session.name || '', avatar: p.avatar || session.avatar || AVATARS[Math.floor(Math.random() * 8)], team: p.team || null };
    S.draft.profile = draft;
    const others = Object.values(S.players).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    const teamPick = room && room.mode === 'team';
    const blocked = started && !S.me && room.mode !== 'team';
    $app.innerHTML = `
      <div class="home">
        <h1 class="title small"><span>Marrowby Manor</span></h1>
        <div class="card">
          <h2>${S.me ? 'Your detective' : 'Join game ' + esc(S.code)}</h2>
          ${started && !S.me ? `<div class="banner">This game has already started. ${room.mode === 'team' ? 'You can still join a team!' : 'If you were already playing, tap your name below.'}</div>` : ''}
          <label class="lbl">Your name</label>
          <input id="pname" maxlength="20" placeholder="Detective name" value="${esc(draft.name)}">
          <label class="lbl">Pick a badge</label>
          <div class="avatars">${AVATARS.map((a) => `<button class="av ${a === draft.avatar ? 'on' : ''}" data-act="avatar" data-v="${a}">${a}</button>`).join('')}</div>
          ${teamPick ? `<label class="lbl">Team</label><div class="seg">${BE.TEAMS.slice(0, room.teams).map((t) => `<button class="${draft.team === t.n ? 'on' : ''}" style="--c:${t.color}" data-act="pickteam" data-v="${t.n}">${t.emoji} ${t.name.replace('Team ', '')}</button>`).join('')}</div>` : ''}
          <button class="btn gold big" data-act="saveprofile" ${blocked ? 'disabled' : ''}>${S.me ? 'Save' : '🎲 Join the game'}</button>
          ${S.me ? '<button class="btn ghost small" data-act="back">Cancel</button>' : ''}
        </div>
        ${!S.me && others.length ? `<div class="card"><h2>Already playing on another device?</h2><p class="muted">Tap your name to continue as yourself.</p>
          <div class="reclaim">${others.map((o) => `<button class="chip" data-act="reclaim" data-v="${o.id}">${o.avatar} ${esc(o.name)}</button>`).join('')}</div></div>` : ''}
        <p class="foot"><a href="board.html">← Home</a></p>
      </div>`;
  }

  // =====================================================================
  // BOARD (TV)
  // =====================================================================
  function renderBoard() {
    const ph = S.room.phase;
    let body = '';
    if (ph === 'lobby') body = boardLobby();
    else if (ph === 'intro') body = `<div class="intro"><div class="story-slot" id="story-slot"></div><div class="story-after"><button class="btn gold" data-act="begin">🎲 Start playing</button></div></div>`;
    else if (ph === 'play') { $app.innerHTML = boardPlayShell(); S.boardGame = S.room.game; S.tokPos = {}; updateBoardPlay(); return; }
    else body = boardReveal();
    $app.innerHTML = `<div class="board phase-${ph}"><header class="bhead"><div class="bt">🎲 <b>Marrowby Manor</b></div><div class="bcode">Code <b>${esc(S.code)}</b>${S.online !== 'live' ? ' <span class="dot off"></span>' : ''}</div></header>${body}</div>`;
  }

  function joinUrl() {
    const u = new URL(location.href);
    u.search = '';
    u.hash = '';
    if (store.kind === 'supabase' && !(window.MYSTERY_CONFIG || {}).supabaseUrl) { u.searchParams.set('sbu', cfg.supabaseUrl); u.searchParams.set('sbk', cfg.supabaseKey); }
    return u;
  }
  function actorsFor(room, players) {
    const ps = Object.values(players).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    if (room.mode === 'team') return BE.TEAMS.slice(0, room.teams || 2).filter((t) => ps.some((p) => (p.team || 1) === t.n)).map((t) => 't' + t.n);
    return ps.map((p) => p.id);
  }

  function boardLobby() {
    const room = S.room;
    const ps = Object.values(S.players).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    const u = joinUrl();
    const pchip = (p) => `<button class="pchip" data-act="${room.mode === 'team' ? 'cycleteam' : 'kickask'}" data-v="${p.id}">${p.avatar} ${esc(p.name)}</button>`;
    const roster = room.mode === 'team'
      ? `<div class="teams">${BE.TEAMS.slice(0, room.teams).map((t) => `<div class="teamcol" style="--c:${t.color}"><h3>${t.emoji} ${t.name}</h3>${ps.filter((p) => (p.team || 1) === t.n).map(pchip).join('') || '<p class="muted">Nobody yet</p>'}</div>`).join('')}</div><p class="muted small">Tap a name to move them to another team.</p>`
      : `<div class="plist">${ps.map(pchip).join('') || '<p class="muted">Waiting for players…</p>'}</div>`;
    const ready = actorsFor(room, S.players).length >= 2;
    return `<div class="lobby">
      <section class="panel joinbox"><h2>Join on your phone</h2><div class="bigcode">${esc(S.code)}</div>
        <p>Open <b class="url">${esc(u.host + u.pathname)}</b><br>and type the code.</p>
        <button class="btn ghost small" data-act="share">📤 Send the invite link</button></section>
      <section class="panel"><h2>Players <span class="count">${ps.length}</span></h2>${roster}</section>
      <section class="panel settings"><h2>Game settings</h2>
        <label class="lbl">Mode</label>
        <div class="seg"><button class="${room.mode === 'team' ? 'on' : ''}" data-act="set" data-k="mode" data-v="team">👥 Teams</button><button class="${room.mode === 'solo' ? 'on' : ''}" data-act="set" data-k="mode" data-v="solo">🕵️ Everyone for themselves</button></div>
        ${room.mode === 'team' ? `<label class="lbl">Teams</label><div class="seg">${[2, 3].map((k) => `<button class="${room.teams === k ? 'on' : ''}" data-act="set" data-k="teams" data-v="${k}">${k} teams</button>`).join('')}</div><button class="btn ghost small" data-act="shuffle">🔀 Shuffle teams</button>` : ''}
        <label class="lbl">Difficulty</label>
        <div class="seg">${['easy', 'normal', 'hard'].map((d) => `<button class="${room.difficulty === d ? 'on' : ''}" data-act="set" data-k="difficulty" data-v="${d}">${{ easy: '🙂 Easy', normal: '🧐 Normal', hard: '😈 Hard' }[d]}</button>`).join('')}</div>
        <p class="muted small">${{ easy: 'Up to 3 players show you a card for each guess. Walking into a room tells you if it’s the crime scene. A wrong accusation just shows you one mistake. Start with 2 magnifying glasses.', normal: 'Up to 2 players show you a card for each guess. Rooms tell you if they’re the crime scene. A wrong accusation knocks you out. 1 magnifying glass.', hard: 'Classic rules: one card per guess, rooms don’t tell you anything, and a wrong accusation knocks you out.' }[room.difficulty]}</p>
        <button class="btn gold big" data-act="start" ${ready ? '' : 'disabled'}>${ready ? '🕯️ Start the game' : room.mode === 'team' ? 'Need players on 2 teams' : 'Need at least 2 players'}</button>
      </section></div>`;
  }

  // ---- the board itself (static SVG drawn once per game) ----
  const CELL = 100;
  function boardSVG() {
    const halls = Object.values(D.NODES).filter((n) => n.hall).map((n) => {
      const sp = n.special ? D.SPECIAL_INFO[n.special] : null;
      return `<g class="hall ${n.special || ''}"><rect x="${n.x * CELL + 4}" y="${n.y * CELL + 4}" width="${CELL - 8}" height="${CELL - 8}" rx="14"/>${sp ? `<text x="${n.x * CELL + 50}" y="${n.y * CELL + 66}" text-anchor="middle" font-size="46">${sp.emoji}</text>` : ''}</g>`;
    }).join('');
    const rooms = D.ROOMS.map((r) => {
      const x = r.x * CELL;
      const y = r.y * CELL;
      const doors = r.doors.map(([dx, dy]) => {
        // a doorway on the room edge that faces the hallway square
        const cx = dx * CELL + 50;
        const cy = dy * CELL + 50;
        if (dx < r.x) return `<rect class="door" x="${x + 2}" y="${cy - 24}" width="14" height="48" rx="4"/>`;
        if (dx > r.x + 2) return `<rect class="door" x="${x + 284}" y="${cy - 24}" width="14" height="48" rx="4"/>`;
        if (dy < r.y) return `<rect class="door" x="${cx - 24}" y="${y + 2}" width="48" height="14" rx="4"/>`;
        return `<rect class="door" x="${cx - 24}" y="${y + 284}" width="48" height="14" rx="4"/>`;
      }).join('');
      const passage = r.passage ? `<text class="passage" x="${x + (r.x === 0 ? 30 : 270)}" y="${y + (r.y === 0 ? 46 : 270)}" text-anchor="middle" font-size="34">🔑</text>` : '';
      return `<g class="room ${r.tower ? 'tower' : ''}" id="room-${r.id}">
        <rect x="${x + 8}" y="${y + 8}" width="284" height="284" rx="26" fill="${r.floor}" stroke="${r.color}" stroke-width="10"/>
        <rect x="${x + 8}" y="${y + 8}" width="284" height="284" rx="26" fill="url(#roomshade)"/>
        <text x="${x + 150}" y="${y + 170}" text-anchor="middle" font-size="${r.tower ? 110 : 96}" opacity=".9">${r.emoji}</text>
        <text class="rname" x="${x + 150}" y="${y + 270}" text-anchor="middle">${esc(r.name)}</text>
        ${r.tower ? `<text class="rsub" x="${x + 150}" y="${y + 60}" text-anchor="middle">⚖️ Accuse here</text>` : ''}
        ${doors}${passage}
      </g>`;
    }).join('');
    return `<svg id="bg-board-svg" viewBox="0 0 1100 1100" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="roomshade" cx=".5" cy=".4" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient></defs>
      <rect width="1100" height="1100" rx="30" fill="#2a1d14"/>
      ${halls}${rooms}
      <g id="hl"></g>
    </svg>`;
  }
  function boardPlayShell() {
    return `<div class="board phase-play bgplay">
      <div class="bg-main">
        <div id="bg-board" class="bg-board">${boardSVG()}<div id="bg-pawns" class="bg-layer"></div><div id="bg-tokens" class="bg-layer"></div></div>
      </div>
      <aside class="bg-side" id="bg-side"></aside>
    </div>`;
  }
  // Where on the board (in %) to draw something.
  function nodeXY(node, slot, count) {
    const N = D.NODES[node];
    if (!N) return [50, 50];
    if (N.hall) {
      const off = count > 1 ? ((slot % 4) - (Math.min(count, 4) - 1) / 2) * 18 : 0;
      return [((N.x + 0.5) * CELL + off) / 11, ((N.y + 0.5) * CELL + (slot >= 4 ? 18 : 0)) / 11];
    }
    const r = roomById(N.room);
    const cols = Math.min(count, 4);
    const row = Math.floor(slot / 4);
    const col = slot % 4;
    const x = r.x * CELL + 150 + (col - (cols - 1) / 2) * 62;
    const y = r.y * CELL + 205 + row * 56 - (count > 4 ? 28 : 0);
    return [x / 11, y / 11];
  }
  function updateBoardPlay() {
    const g = G();
    const room = S.room;
    // tokens
    const layer = document.getElementById('bg-tokens');
    const byNode = {};
    g.actors.forEach((a) => { (byNode[g.pos[a]] = byNode[g.pos[a]] || []).push(a); });
    g.actors.forEach((a) => {
      let el = layer.querySelector(`[data-tok="${a}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'tok';
        el.dataset.tok = a;
        layer.appendChild(el);
      }
      el.innerHTML = `<span>${actorBadge(a)}</span>`;
      el.style.setProperty('--c', actorColor(a));
      el.classList.toggle('cur', g.current === a);
      el.classList.toggle('out', !!g.out[a]);
      const target = g.pos[a];
      const list = byNode[target];
      const xy = nodeXY(target, list.indexOf(a), list.length);
      const prev = S.tokPos[a];
      if (prev && prev.node !== target) {
        // walk square by square along the hallway
        const lastMove = [...g.log].reverse().find((e) => e.actor === a && (e.t === 'move' || e.t === 'passage' || (e.t === 'special' && e.kind === 'lights')));
        const steps = lastMove && lastMove.t === 'move' && lastMove.from === prev.node ? D.path(prev.node, target) : null;
        if (steps && steps.length > 2 && steps.length < 16) {
          const token = ++S.walk;
          steps.slice(1, -1).forEach((n, i) => setTimeout(() => { if (S.walk !== token) return; const p = nodeXY(n, 0, 1); el.style.left = p[0] + '%'; el.style.top = p[1] + '%'; if (i % 2 === 0) sfx('tick'); }, i * 190));
          setTimeout(() => { if (S.walk !== token) return; el.style.left = xy[0] + '%'; el.style.top = xy[1] + '%'; }, (steps.length - 2) * 190);
        } else { el.style.left = xy[0] + '%'; el.style.top = xy[1] + '%'; }
      } else { el.style.left = xy[0] + '%'; el.style.top = xy[1] + '%'; }
      S.tokPos[a] = { node: target };
    });
    // suspects + weapons sitting in rooms
    const pawnLayer = document.getElementById('bg-pawns');
    const inRoom = {};
    D.SUSPECTS.concat(D.WEAPONS).forEach((x) => { (inRoom[g.pawns[x.id]] = inRoom[g.pawns[x.id]] || []).push(x); });
    pawnLayer.innerHTML = Object.keys(inRoom).map((rid) => {
      const r = roomById(rid);
      return inRoom[rid].map((x, i) => {
        const px = (r.x * CELL + 40 + (i % 5) * 55) / 11;
        const py = (r.y * CELL + 40 + Math.floor(i / 5) * 55) / 11;
        const isS = !!x.why;
        return `<div class="pawn ${isS ? 'sus' : 'wep'}" style="left:${px}%;top:${py}%" title="${esc(x.name)}">${isS ? face(x.id) : x.emoji}</div>`;
      }).join('');
    }).join('');
    // reachable squares glow while the current player chooses
    const hl = document.getElementById('hl');
    if (g.stage === 'move' && g.current) {
      const opts = BE.moveOptions(g.pos[g.current], g.roll);
      hl.innerHTML = opts.map((o) => {
        const N = D.NODES[o.to];
        if (N.hall) return `<rect class="glow" x="${N.x * CELL + 4}" y="${N.y * CELL + 4}" width="92" height="92" rx="14" style="--c:${actorColor(g.current)}"/>`;
        const r = roomById(N.room);
        return `<rect class="glow" x="${r.x * CELL + 8}" y="${r.y * CELL + 8}" width="284" height="284" rx="26" style="--c:${actorColor(g.current)}"/>`;
      }).join('');
    } else hl.innerHTML = '';
    // side panel
    document.getElementById('bg-side').innerHTML = sidePanel(g, room);
    if (g.last && g.last.t === 'roll' && S.diceShown !== g.log.length) { S.diceShown = g.log.length; const d = document.querySelector('.dice'); if (d) d.classList.add('rolling'); }
  }

  function dieSVG(n) {
    const pts = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[26, 26], [50, 50], [74, 74]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]], 6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]] }[n] || [];
    return `<svg class="die" viewBox="0 0 100 100"><rect x="4" y="4" width="92" height="92" rx="18" fill="#fffdf5" stroke="#c9a227" stroke-width="4"/>${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#2a1d14"/>`).join('')}</svg>`;
  }
  function stageText(g) {
    if (g.over) return g.winner ? '🏆 ' + esc(actorName(g.winner)) + ' solved it!' : 'Nobody solved it!';
    const r = D.NODES[g.pos[g.current]];
    if (g.stage === 'start') return '🎲 Roll the dice!';
    if (g.stage === 'move') return '🚶 Rolled <b>' + g.roll + '</b>. Pick where to go!';
    if (g.stage === 'guess') return '🔍 In the ' + esc(roomById(r.room).name) + '. Make a guess!';
    if (g.stage === 'tower') return '⚖️ In the Clock Tower. Accuse… or not yet?';
    return '';
  }
  function lastEventCard(g) {
    const e = [...g.log].reverse().find((x) => ['guess', 'special', 'accuse', 'passage', 'hint', 'skipturn', 'search'].includes(x.t) && x.turn >= g.turn - 1);
    if (!e) return '<div class="evt muted">Make guesses in rooms. Other players secretly show you cards that rule things out. Then go to the 🕰️ Clock Tower to accuse!</div>';
    const who = `<b style="color:${actorColor(e.actor)}">${esc(actorName(e.actor))}</b>`;
    if (e.t === 'guess') {
      const s = sus(e.who);
      const w = wep(e.what);
      const r = roomById(e.where);
      return `<div class="evt guess"><div class="evh">${who} guessed:</div>
        <div class="trio"><div>${face(s.id, 'gasp')}<small>${esc(s.name)}</small></div><div><span class="big">${w.emoji}</span><small>${esc(w.short)}</small></div><div><span class="big">${r.emoji}</span><small>${esc(r.name)}</small></div></div>
        ${e.shows.length ? e.shows.map((x) => `<div class="showed">🤫 ${esc(actorName(x.by))} showed a card</div>`).join('') : '<div class="nobody">😮 Nobody could prove it wrong!</div>'}</div>`;
    }
    if (e.t === 'special') {
      const sp = D.SPECIAL_INFO[e.kind];
      return `<div class="evt special"><div class="bigemoji">${sp.emoji}</div><div>${who} landed on <b>${sp.name}</b><br><span class="muted">${esc(sp.text)}</span></div></div>`;
    }
    if (e.t === 'accuse') return `<div class="evt"><div class="bigemoji">${e.ok ? '🏆' : '❌'}</div><div>${who} accused ${esc(sus(e.who).name)}… ${e.ok ? 'and was RIGHT!' : 'and was wrong!'}</div></div>`;
    if (e.t === 'passage') return `<div class="evt"><div class="bigemoji">🔑</div><div>${who} took the secret passage!</div></div>`;
    if (e.t === 'hint') return `<div class="evt"><div class="bigemoji">🔎</div><div>${who} used a magnifying glass for a hint.</div></div>`;
    if (e.t === 'search') return `<div class="evt"><div class="bigemoji">🔍</div><div>${who} searched the ${esc(roomById(e.room).name)}. Pembrook whispered something…</div></div>`;
    return '';
  }
  function sidePanel(g, room) {
    const cur = g.current;
    const dice = g.dice && g.roll != null ? g.dice : (g.last && g.last.t === 'roll' ? g.last.dice : null);
    const players = g.actors.map((a) => `<div class="pl ${a === cur ? 'cur' : ''} ${g.out[a] ? 'out' : ''}" style="--c:${actorColor(a)}">
      <span class="pdot">${actorBadge(a)}</span><span class="pn">${esc(actorName(a, true))}${room.mode === 'team' ? `<small>${Object.values(S.players).filter((p) => 't' + (p.team || 1) === a).map((p) => p.avatar).join('')}</small>` : ''}</span>
      <span class="pm" title="Magnifying glasses">🔎${g.mags[a]}</span>${g.out[a] ? '<span class="pout">OUT</span>' : ''}</div>`).join('');
    return `
      <div class="turnbox" style="--c:${cur ? actorColor(cur) : '#888'}">
        <div class="tb-who">${cur ? actorBadge(cur) + ' ' + esc(actorName(cur, true)) + '’s turn' : 'Game over'}</div>
        <div class="tb-stage">${stageText(g)}</div>
        ${dice && g.stage === 'move' ? `<div class="dice">${dieSVG(dice[0])}${dieSVG(dice[1])}</div>` : ''}
      </div>
      ${lastEventCard(g)}
      <div class="plist2">${players}</div>
      <div class="hostbar"><span class="muted small">Code <b>${esc(S.code)}</b>${S.online !== 'live' ? ' · reconnecting…' : ''}</span>
        ${cur ? '<button class="btn ghost tiny" data-act="skipturn">⏭ Skip turn</button>' : ''}<button class="btn ghost tiny" data-act="rules">📜 Rules</button></div>`;
  }

  // ---- reveal ----
  function revealCards() {
    const g = G();
    const s = sus(g.sol.s);
    const w = wep(g.sol.w);
    const r = roomById(g.sol.r);
    const win = g.winner;
    return [
      win ? { bg: 'tower', sfx: 'chime', sfxAt: 300, props: [{ e: '🏆', x: 50, y: 34, s: 22, anim: 'pop' }], title: 'Case solved!', sub: actorName(win, true) + ' cracked the case!' }
        : { bg: 'tower', fx: ['dark'], sfx: 'sting', sfxAt: 300, title: 'Nobody solved it…', sub: 'Let’s see who really did it.' },
      { bg: 'dining', fx: ['spot'], sfx: 'sting', sfxAt: 200, cast: [{ id: s.id, mood: 'angry', x: 50, size: 1.2, anim: 'zoom' }], title: s.full.toUpperCase(), sub: 'in the ' + r.name + ' · with the ' + w.name },
      { bg: r.scene, fx: ['sepia'], cast: [{ id: 'ozzie', mood: 'happy', x: 26 }, { id: s.id, mood: 'sly', x: 74 }], props: [{ e: w.emoji, x: 52, y: 44, s: 11, anim: 'pop', delay: 1.4 }],
        caption: s.full + ' asked Grandpa Ozzie to come to the ' + r.name + ' for a little chat… and then used ' + w.how + '.' },
      { bg: r.scene, fx: ['sepia', 'dim'], props: [{ e: '⌚', x: 50, y: 30, s: 14, anim: 'fall' }],
        caption: 'Then ' + s.name + ' slipped back to the party as if nothing had happened.' },
      { bg: 'dining', cast: [{ id: s.id, mood: 'sad', x: 50, size: 1.05 }], caption: 'Why? Because ' + s.why + '.' },
      { bg: 'manor', fx: ['snow', 'police'], sfx: 'siren', sfxAt: 300, title: 'Case closed', sub: win ? 'Solved by ' + actorName(win, true) + '!' : 'Better luck next time, detectives!' },
    ];
  }
  function boardReveal() {
    const room = S.room;
    const g = G();
    if ((room.reveal_step || 0) === 0) {
      return `<div class="reveal"><div class="story-slot" id="story-slot"></div><div class="story-after"><button class="btn gold" data-act="revstep" data-v="1">🏆 Results</button></div></div>`;
    }
    const s = sus(g.sol.s);
    const w = wep(g.sol.w);
    const r = roomById(g.sol.r);
    const rows = g.actors.map((a) => {
      const known = Object.keys(g.known[a]).filter((k) => g.known[a][k].by !== 'own').length;
      return `<tr class="${g.winner === a ? 'win' : ''}"><td>${g.winner === a ? '👑' : g.out[a] ? '❌' : ''}</td><td style="color:${actorColor(a)}"><b>${esc(actorName(a))}</b></td><td>${g.guesses[a]}</td><td>${known}</td><td>${g.winner === a ? 'Solved it!' : g.out[a] ? 'Wrong accusation' : ''}</td></tr>`;
    }).join('');
    return `<div class="reveal">
      <div class="solution"><div class="sface">${face(s.id, 'angry')}</div><div><div class="sname">${esc(s.full)}</div><div class="slines">${w.emoji} ${esc(w.name)} · ${r.emoji} ${esc(r.name)}</div></div></div>
      <table class="scores"><thead><tr><th></th><th>Detective</th><th>Guesses</th><th>Cards learned</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      <div class="controls"><button class="btn ghost" data-act="revstep" data-v="0">⬅ The story</button><button class="btn gold" data-act="again">🔁 Play again</button></div>
    </div>`;
  }

  // =====================================================================
  // PHONE
  // =====================================================================
  function renderPhone() {
    const room = S.room;
    const p = me();
    const a = myActor();
    const g = G();
    const color = a && inGame(a) ? actorColor(a) : '#c9a227';
    let main = '';
    if (room.phase === 'lobby') main = phoneLobby();
    else if (!inGame(a)) main = '<div class="card center"><h2>You’re watching this one</h2><p class="muted">This game started before you joined. Watch the TV, and you can play next game!</p></div>';
    else if (room.phase === 'intro') main = `<div class="card center watch"><div class="tvicon">📺</div><h2>Watch the TV!</h2><p class="muted">These are your cards. They are definitely <b>NOT</b> the answer. They’re crossed off in your notebook already.</p><div class="cards big">${g.hands[a].map((k) => `<span class="ccard">${esc(BE.cardLabel(k))}</span>`).join('')}</div></div>`;
    else if (room.phase === 'reveal') main = phoneReveal(g, a);
    else main = phoneTurn(g, a) + notebook(g, a);
    const mine = room.phase === 'play' && g && g.current === a;
    $app.innerHTML = `<div class="phone"><div class="ptop ${mine ? 'myturn' : ''}" style="--c:${color}"><div><b>${a && inGame(a) ? esc(actorName(a)) : 'Marrowby Manor'}</b>${room.mode === 'team' ? ' · ' + esc(p.name) : ''}</div><div class="who" data-act="profile">${p.avatar} ✏️</div></div>
      ${S.online === 'offline' ? '<div class="banner warn small">Reconnecting…</div>' : ''}<div class="pmain">${main}</div></div>`;
  }
  function phoneLobby() {
    const room = S.room;
    const p = me();
    return `<div class="card center"><div class="tvicon">🎲</div><h2>You’re in, ${esc(p.name)}!</h2><p class="muted">Waiting for the host to start. Keep this screen open.</p>
      ${room.mode === 'team' ? `<label class="lbl">Your team</label><div class="seg">${BE.TEAMS.slice(0, room.teams).map((t) => `<button class="${(p.team || 1) === t.n ? 'on' : ''}" style="--c:${t.color}" data-act="jointeam" data-v="${t.n}">${t.emoji} ${t.name.replace('Team ', '')}</button>`).join('')}</div>` : ''}
      <button class="btn ghost small" data-act="rules">📜 How to play</button></div>`;
  }

  function myResultCard(g, a) {
    const e = g.lastByActor[a];
    if (!e || e.turn < g.turn - g.actors.length) return '';
    if (e.t === 'guess') {
      return `<div class="result"><div class="rh">Your last guess: ${esc(sus(e.who).name)} · ${esc(wep(e.what).short)} · ${esc(roomById(e.where).name)}</div>
        ${e.shows.length ? e.shows.map((x) => `<div class="shown"><span>${esc(actorName(x.by))} showed you:</span><b>${esc(BE.cardLabel(x.card))}</b><i>❌ not it</i></div>`).join('')
          : `<div class="shown none">😮 <b>Nobody could prove it wrong!</b><span>${e.own.length ? 'Some of those were your own cards, though.' : 'All three could be the answer…'}</span></div>`}</div>`;
    }
    if (e.t === 'special' && e.kind === 'clue') return e.card ? `<div class="result"><div class="rh">🔦 Clue square</div><div class="shown"><span>Pembrook slipped you:</span><b>${esc(BE.cardLabel(e.card))}</b><i>❌ not it</i></div></div>` : '';
    if (e.t === 'special' && e.kind === 'mag') return '<div class="result"><div class="rh">🔎 You found a magnifying glass!</div></div>';
    if (e.t === 'hint') return `<div class="result"><div class="rh">🔎 Hint</div><div class="shown"><span>The magnifying glass shows:</span><b>${esc(BE.cardLabel(e.card))}</b><i>❌ not it</i></div></div>`;
    if (e.t === 'accuse' && !e.ok) return `<div class="result bad"><div class="rh">❌ Wrong accusation</div>${e.wrong ? `<div class="shown"><span>This part was wrong:</span><b>${esc(BE.cardLabel(e.wrong))}</b></div>` : '<p>You’re out of the race, but you still show cards to others.</p>'}</div>`;
    return '';
  }
  function searchBanner(g, a) {
    const e = [...g.log].reverse().find((x) => x.t === 'search' && x.actor === a && x.turn === g.turn);
    if (!e) return '';
    return e.crime ? `<div class="result crime"><div class="rh">😱 Pembrook whispers: “Something terrible happened in the ${esc(roomById(e.room).name)}…”</div><p><b>This is the crime scene!</b> It’s starred in your notebook.</p></div>`
      : `<div class="result"><div class="rh">🔍 Pembrook whispers: “Nothing happened in the ${esc(roomById(e.room).name)}.”</div><p>Crossed off: ❌ ${esc(roomById(e.room).name)}</p></div>`;
  }

  function phoneTurn(g, a) {
    if (g.over) return `<div class="card center"><h2>${g.winner === a ? '🏆 You solved it!' : g.winner ? esc(actorName(g.winner)) + ' solved it!' : 'Game over'}</h2><p class="muted">Look at the TV!</p></div>`;
    if (g.current !== a) {
      const res = myResultCard(g, a);
      return `${res}<div class="waiting" style="--c:${actorColor(g.current)}">${actorBadge(g.current)} <b>${esc(actorName(g.current, true))}’s turn</b><span>Watch the TV!</span></div>${g.out[a] ? '<p class="muted small center">You made a wrong accusation, so you can’t win this one, but you still show cards.</p>' : ''}`;
    }
    const here = D.NODES[g.pos[a]];
    const hereRoom = here && !here.hall ? roomById(here.room) : null;
    const magBtn = g.mags[a] > 0 ? `<button class="btn ghost wide" data-act="hint" ${S.busy ? 'disabled' : ''}>🔎 Use a magnifying glass for a hint (${g.mags[a]} left)</button>` : '';
    let body = '';
    if (g.stage === 'start') {
      body = `<h2 class="yt">🎲 Your turn!</h2>
        <p class="muted center">You’re ${hereRoom ? 'in the ' + hereRoom.emoji + ' <b>' + esc(hereRoom.name) + '</b>' : 'in the hallway'}.</p>
        <button class="btn gold big" data-act="roll" ${S.busy ? 'disabled' : ''}>🎲 Roll the dice</button>
        ${hereRoom && hereRoom.passage ? `<button class="btn wide" data-act="passage" ${S.busy ? 'disabled' : ''}>🔑 Take the secret passage to the ${esc(roomById(hereRoom.passage).name)}</button>` : ''}
        ${hereRoom && !hereRoom.tower ? `<button class="btn wide" data-act="stay" ${S.busy ? 'disabled' : ''}>🔍 Stay here and guess again</button>` : ''}
        ${magBtn}`;
    } else if (g.stage === 'move') {
      const opts = BE.moveOptions(g.pos[a], g.roll);
      body = `<h2 class="yt">You rolled ${g.roll}! ${g.dice ? '<span class="pdice">' + dieSVG(g.dice[0]) + dieSVG(g.dice[1]) + '</span>' : ''}</h2>
        <p class="muted center">Where do you want to go?</p>
        <div class="opts">${opts.map((o) => {
          const sub = o.kind === 'toward' ? `${o.more} more step${o.more === 1 ? '' : 's'} next turn${o.also ? ' · also toward the ' + esc(o.also) : ''}` : o.kind === 'tower' ? 'Make your accusation here' : o.kind === 'special' ? D.SPECIAL_INFO[D.NODES[o.to].special].text : 'Go in and make a guess';
          const crossed = o.kind === 'room' && g.known[a]['r:' + D.NODES[o.to].room] && g.known[a]['r:' + D.NODES[o.to].room].by !== 'own' ? ' crossed' : '';
          return `<button class="opt ${o.kind}${crossed}" data-act="move" data-v="${o.to}" ${S.busy ? 'disabled' : ''}><span class="oe">${o.emoji}</span><span class="ot"><b>${esc(o.label)}</b><small>${sub}</small></span></button>`;
        }).join('')}</div>`;
    } else if (g.stage === 'guess') {
      const d = S.draft.guess || (S.draft.guess = {});
      body = `${searchBanner(g, a)}<h2 class="yt">🔍 Make a guess in the ${hereRoom.emoji} ${esc(hereRoom.name)}</h2>
        <p class="muted center small">Pick a suspect and an object. Other players will secretly show you cards that prove it wrong.</p>
        ${picker('who', D.SUSPECTS, d.who, g, a, 's')}${picker('what', D.WEAPONS, d.what, g, a, 'w')}
        <button class="btn gold big" data-act="guess" ${d.who && d.what && !S.busy ? '' : 'disabled'}>🔍 Make my guess</button>
        <button class="btn ghost wide" data-act="skip" ${S.busy ? 'disabled' : ''}>Skip guessing this turn</button>${magBtn}`;
    } else if (g.stage === 'tower') {
      const d = S.draft.acc || (S.draft.acc = {});
      body = `<h2 class="yt">⚖️ The Clock Tower</h2>
        <p class="center">Ready to accuse? You must get <b>all three</b> right${S.room.difficulty === 'easy' ? '.' : ', or you’re out!'}</p>
        ${picker('who', D.SUSPECTS, d.who, g, a, 's', 'acc')}${picker('what', D.WEAPONS, d.what, g, a, 'w', 'acc')}${picker('where', D.CRIME_ROOMS, d.where, g, a, 'r', 'acc')}
        <button class="btn red big" data-act="accuse" ${d.who && d.what && d.where && !S.busy ? '' : 'disabled'}>⚖️ I accuse!</button>
        <button class="btn ghost wide" data-act="skip" ${S.busy ? 'disabled' : ''}>Not yet. End my turn.</button>${magBtn}`;
    }
    return `<div class="myturn-card">${body}</div>${myResultCard(g, a)}`;
  }
  function picker(field, list, sel, g, a, cat, draftKey) {
    const label = { who: 'Who?', what: 'With what?', where: 'Where?' }[field];
    return `<h3 class="sec">${label}</h3><div class="pick-grid">${list.map((x) => {
      const k = cat + ':' + x.id;
      const kn = g.known[a][k];
      const crossed = kn ? ' crossed' : '';
      const star = cat === 'r' && g.scene[a] === x.id ? ' star' : '';
      return `<button class="pk${sel === x.id ? ' sel' : ''}${crossed}${star}" data-act="pick" data-d="${draftKey || 'guess'}" data-k="${field}" data-v="${x.id}">${cat === 's' ? face(x.id) : `<span class="pe">${x.emoji}</span>`}<span class="pn">${esc(x.short || x.name)}</span>${kn ? '<i>❌</i>' : ''}${star ? '<i>⭐</i>' : ''}</button>`;
    }).join('')}</div>`;
  }

  const MARKS = ['', '❓', '⭐'];
  function notebook(g, a) {
    const marks = lsGet('mb_marks_' + S.code + '_' + (S.room.game || 1), {}) || {};
    const known = g.known[a];
    const left = (cat, list) => list.filter((x) => !known[cat + ':' + x.id]);
    const ls = left('s', D.SUSPECTS);
    const lw = left('w', D.WEAPONS);
    const lr = g.scene[a] ? [roomById(g.scene[a])] : left('r', D.CRIME_ROOMS);
    const solved = ls.length === 1 && lw.length === 1 && lr.length === 1;
    const section = (title, cat, list) => `<h3 class="sec">${title}</h3><div class="nb-grid">${list.map((x) => {
      const k = cat + ':' + x.id;
      const kn = known[k];
      const scene = cat === 'r' && g.scene[a] === x.id;
      const by = kn ? (kn.by === 'own' ? 'Your card' : kn.by === 'clue' ? '🔦 Clue' : kn.by === 'hint' ? '🔎 Hint' : kn.by === 'search' ? '🔍 Searched' : kn.by === 'accuse' ? '⚖️ Wrong guess' : kn.by === 'evidence' ? '🤵 Pembrook' : actorName(kn.by, true)) : '';
      const m = !kn && !scene ? (marks[k] || '') : '';
      return `<button class="nb ${kn ? (kn.by === 'own' ? 'own' : 'x') : ''} ${scene ? 'scene' : ''}" data-act="mark" data-v="${k}" ${kn || scene ? 'disabled' : ''}>
        ${cat === 's' ? face(x.id, kn ? 'neutral' : null) : `<span class="pe">${x.emoji}</span>`}<span class="pn">${esc(x.short || x.name)}</span>
        ${kn ? `<span class="nbx">❌</span><span class="nbby">${esc(by)}</span>` : ''}${scene ? '<span class="nbby">⭐ Crime scene!</span>' : ''}${m ? `<span class="nbm">${m}</span>` : ''}</button>`;
    }).join('')}</div>`;
    return `<div class="notebook">
      <div class="nb-head"><h2>📒 My notebook</h2><div class="still">Still possible: <b>${ls.length}</b> 👤 · <b>${lw.length}</b> 🔪 · <b>${lr.length}</b> 🚪</div></div>
      ${solved ? `<div class="solvedbox">🎯 You’ve figured it out: <b>${esc(ls[0].name)}</b>, <b>${esc(lw[0].short)}</b>, <b>${esc(lr[0].name)}</b>!<br>Get to the 🕰️ Clock Tower and accuse!</div>` : ''}
      ${section('Who? 👤', 's', D.SUSPECTS)}${section('With what? 🔪', 'w', D.WEAPONS)}${section('Where? 🚪', 'r', D.CRIME_ROOMS)}
      <p class="muted small">❌ = definitely not it. Tap a question mark ❓ or a star ⭐ on the others to keep track of your hunches.</p></div>`;
  }
  function phoneReveal(g, a) {
    if ((S.room.reveal_step || 0) === 0) return '<div class="card center watch"><div class="tvicon">📺</div><h2>Look at the TV!</h2><p class="muted">Who did it?</p></div>';
    const s = sus(g.sol.s);
    return `<div class="card center"><div class="tvicon">${g.winner === a ? '🏆' : '🕵️'}</div><h2>${g.winner === a ? 'You solved it!' : g.winner ? esc(actorName(g.winner)) + ' solved it!' : 'Nobody solved it'}</h2>
      <p>It was <b>${esc(s.full)}</b>, with the <b>${esc(wep(g.sol.w).name)}</b>, in the <b>${esc(roomById(g.sol.r).name)}</b>.</p></div>`;
  }

  function rulesModal() {
    openModal(`<h2>📜 How to play</h2>
      <p><b>The goal:</b> be the first to figure out <b>who</b> did it, <b>with what</b>, and <b>where</b>, then accuse in the 🕰️ Clock Tower.</p>
      <ol>
        <li>🎲 On your turn, <b>roll the dice</b> on your phone and pick where to go. Watch your token walk on the TV!</li>
        <li>🔍 <b>In a room, make a guess:</b> a suspect + an object + that room. The other players secretly show you cards that prove it wrong. Those get crossed off in your notebook automatically.</li>
        <li>🗂️ <b>Your own cards</b> are never the answer. They’re already crossed off.</li>
        <li>⚖️ When only one suspect, one object, and one room are left, <b>go to the Clock Tower and accuse!</b></li>
      </ol>
      <p><b>Special squares:</b> 🔦 free clue card · 🔎 magnifying glass (spend it on your turn for a hint) · 🕯️ lights out (everyone ends up in a random room!)</p>
      <p><b>Shortcuts:</b> 🔑 corner rooms have secret passages to the opposite corner. You can also stay in a room and guess again.</p>
      <p>😮 If <b>nobody</b> can prove your guess wrong, those cards might be the answer… unless you’re holding them yourself!</p>
      <div class="mbtns"><button class="btn gold" data-act="close">Got it</button></div>`);
  }

  // =====================================================================
  // ACTIONS
  // =====================================================================
  function genCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
  async function hostNew() {
    for (let i = 0; i < 5; i++) {
      const code = genCode();
      try {
        await store.createRoom({ code, host_key: session.deviceKey, case_id: 'board', mode: 'solo', difficulty: 'easy', teams: 2, ending: 'random' });
        delete session.players[code];
        saveSession();
        await openRoom(code);
        S.view = 'game';
        keepAwake();
        render();
        return;
      } catch (e) { if (!/duplicate/i.test(e.message)) { toast('⚠️ ' + friendlyError(e), 'bad', 7000); return; } }
    }
  }
  async function join(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) { toast('Type the 4-letter code from the TV.'); return; }
    try {
      if (!(await openRoom(code))) return;
      S.view = S.me || isHost() ? 'game' : 'join';
      if (isHost() && !S.me) keepAwake();
      render();
    } catch (e) { toast('⚠️ ' + friendlyError(e), 'bad', 6000); }
  }
  async function share() {
    const u = joinUrl();
    u.searchParams.set('join', S.code);
    const text = 'Join our Marrowby Manor board game! Code ' + S.code;
    try { if (navigator.share) { await navigator.share({ title: 'Marrowby Manor', text, url: u.toString() }); return; } } catch (e) { return; }
    try { await navigator.clipboard.writeText(u.toString()); toast('Link copied!'); } catch (e) { toast(esc(u.toString())); }
  }

  document.addEventListener('input', (e) => { if (e.target.id === 'pname') S.draft.profile.name = e.target.value; });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'code') join(e.target.value);
    if (e.key === 'Enter' && e.target.id === 'bcode') document.querySelector('[data-act=reboard]').click();
  });
  $modal.addEventListener('click', (e) => { if (e.target === $modal) closeModal(); });

  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const cmd = el.dataset.act;
    const v = el.dataset.v;
    if (el.tagName === 'A') e.preventDefault();
    const g = S.room ? G() : null;
    switch (cmd) {
      case 'join': join(document.getElementById('code').value); break;
      case 'rejoin': join(session.lastCode); break;
      case 'host': hostNew(); break;
      case 'reboard': {
        const code = document.getElementById('bcode').value.toUpperCase().trim();
        try {
          if (!(await openRoom(code))) return;
          await patchRoom({ host_key: session.deviceKey });
          delete session.players[code];
          S.me = null;
          saveSession();
          S.view = 'game';
          keepAwake();
          render();
        } catch (err) { toast('⚠️ ' + friendlyError(err), 'bad'); }
        break;
      }
      case 'rules': rulesModal(); break;
      case 'close': closeModal(); break;
      case 'avatar': S.draft.profile.avatar = v; renderJoin(); break;
      case 'pickteam': S.draft.profile.team = +v; renderJoin(); break;
      case 'saveprofile': {
        const d = S.draft.profile;
        const name = (document.getElementById('pname').value || '').trim().slice(0, 20);
        if (!name) { toast('Type your name first.'); return; }
        let team = d.team;
        if (S.room.mode === 'team' && !team) {
          const counts = BE.TEAMS.slice(0, S.room.teams).map((t) => ({ n: t.n, c: Object.values(S.players).filter((p) => (p.team || 1) === t.n).length }));
          team = counts.sort((x, y) => x.c - y.c)[0].n;
        }
        session.name = name;
        session.avatar = d.avatar;
        try {
          if (S.me) await store.updatePlayer(S.me, { name, avatar: d.avatar, team: team || me().team || 1 });
          else {
            const p = await store.addPlayer({ room: S.code, name, avatar: d.avatar, team: team || 1 });
            S.players[p.id] = p;
            S.me = p.id;
            session.players[S.code] = p.id;
          }
          saveSession();
          S.draft.profile = null;
          await refresh();
          S.view = 'game';
          render();
        } catch (err) { toast('⚠️ ' + friendlyError(err), 'bad'); }
        break;
      }
      case 'reclaim': S.me = v; session.players[S.code] = v; saveSession(); S.view = 'game'; S.seenLog = null; render(); break;
      case 'back': S.draft.profile = null; S.view = 'game'; render(); break;
      case 'profile': S.draft.profile = null; S.view = 'join'; render(); break;
      case 'jointeam': await store.updatePlayer(S.me, { team: +v }); S.players[S.me].team = +v; render(); break;
      case 'share': share(); break;
      case 'set': {
        const k = el.dataset.k;
        await patchRoom({ [k]: k === 'teams' ? +v : v }).catch((err) => toast('⚠️ ' + friendlyError(err), 'bad'));
        const ps = Object.values(S.players);
        if (S.room.mode === 'team' && ps.length >= 2 && (k === 'mode' || k === 'teams') && (new Set(ps.map((p) => p.team || 1)).size === 1 || ps.some((p) => (p.team || 1) > S.room.teams))) {
          await Promise.all(ps.sort(() => Math.random() - 0.5).map((p, i) => store.updatePlayer(p.id, { team: (i % S.room.teams) + 1 })));
          await refresh();
        }
        break;
      }
      case 'cycleteam': { const p = S.players[v]; const nx = ((p.team || 1) % S.room.teams) + 1; await store.updatePlayer(v, { team: nx }); p.team = nx; render(); break; }
      case 'kickask': if (confirm('Remove ' + S.players[v].name + ' from the game?')) { await store.removePlayer(v); delete S.players[v]; render(); } break;
      case 'shuffle': {
        const ps = Object.values(S.players).sort(() => Math.random() - 0.5);
        await Promise.all(ps.map((p, i) => store.updatePlayer(p.id, { team: (i % S.room.teams) + 1 })));
        await refresh();
        break;
      }
      case 'start': {
        const actors = actorsFor(S.room, S.players);
        if (actors.length < 2) return;
        await patchRoom({ phase: 'intro', actors: shuffleActors(actors), seed: Math.floor(Math.random() * 2147483647), round: 0, reveal_step: 0 });
        S.seenLog = null;
        break;
      }
      case 'begin': await patchRoom({ phase: 'play' }); break;
      case 'skipturn':
        if (g && g.current && confirm('Skip ' + actorName(g.current, true) + '’s turn?')) await act({ a: 'skipturn' }, g.current);
        break;
      case 'revstep': await patchRoom({ reveal_step: +v }); break;
      case 'again':
        if (confirm('Play again with the same players? (New mystery!)')) { await patchRoom({ phase: 'lobby', game: (S.room.game || 1) + 1, actors: [], reveal_step: 0, seed: 0 }); S.seenLog = null; }
        break;

      // phone turn actions
      case 'roll': buzz(); if (window.Sfx) window.Sfx.unlock(); await act({ a: 'roll' }); break;
      case 'passage': await act({ a: 'passage' }); break;
      case 'stay': await act({ a: 'stay' }); break;
      case 'hint': await act({ a: 'hint' }); break;
      case 'move': buzz(); await act({ a: 'move', to: v }); break;
      case 'skip': S.draft.guess = {}; S.draft.acc = {}; await act({ a: 'skip' }); break;
      case 'pick': {
        const d = el.dataset.d;
        S.draft[d] = S.draft[d] || {};
        S.draft[d][el.dataset.k] = v;
        render();
        break;
      }
      case 'guess': { const d = S.draft.guess; if (await act({ a: 'guess', who: d.who, what: d.what })) S.draft.guess = {}; break; }
      case 'accuse': {
        const d = S.draft.acc;
        if (!confirm('Accuse ' + sus(d.who).full + ', with the ' + wep(d.what).name + ', in the ' + roomById(d.where).name + '?')) return;
        if (await act({ a: 'accuse', who: d.who, what: d.what, where: d.where })) S.draft.acc = {};
        break;
      }
      case 'mark': {
        const key = 'mb_marks_' + S.code + '_' + (S.room.game || 1);
        const marks = lsGet(key, {}) || {};
        marks[v] = MARKS[(MARKS.indexOf(marks[v] || '') + 1) % MARKS.length];
        lsSet(key, marks);
        render();
        break;
      }
      default: break;
    }
  });
  function shuffleActors(list) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  (async function start() {
    S.walk = 0;
    const code = (params.get('join') || '').toUpperCase();
    if (code) {
      try {
        if (!(await openRoom(code))) return;
        S.view = S.me || isHost() ? 'game' : 'join';
        if (isHost() && !S.me) keepAwake();
      } catch (e) { S.view = 'home'; toast('⚠️ ' + friendlyError(e), 'bad', 6000); }
    }
    render();
  })();
})();
