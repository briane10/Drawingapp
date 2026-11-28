/* Marrowby Manor: main app. One page plays two parts:
   - the BOARD (the iPad cast to the TV): lobby, story, map, objections, reveal
   - a PHONE (each detective): search, question, theories, notebook, grid, accusation */
(function () {
  'use strict';

  const E = window.Engine;
  const AVATARS = ['🕵️', '🔍', '🧐', '🦉', '🐈‍⬛', '🦊', '🐶', '🐼', '🦄', '🐸', '🐙', '🦁', '🐯', '🐨', '🐵', '🌟', '⚡', '🍩'];
  const ROUND_KINDS = ['search', 'question', 'theory'];
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

  const SESSION_KEY = 'mm_session' + (params.get('as') ? '_' + params.get('as').replace(/\W/g, '').slice(0, 8) : '');
  const session = lsGet(SESSION_KEY, {}) || {};
  session.players = session.players || {};
  if (!session.deviceKey) session.deviceKey = Math.random().toString(36).slice(2) + Date.now().toString(36);
  function saveSession() { lsSet(SESSION_KEY, session); }
  saveSession();

  const S = {
    view: 'home', code: null, room: null, players: {}, moves: [], me: null,
    tab: 'act', filter: 'all', open: new Set(), online: 'connecting', R: null, Rkey: '',
    seenItems: null, seenEvents: null, draft: {}, accuseDraft: {}, unsub: null, countdown: null, busy: false,
  };
  const C = () => window.MYSTERY_CASES[(S.room && S.room.case_id) || 'marrowby'];
  const isHost = () => !!(S.room && S.room.host_key === session.deviceKey);
  const isBoard = () => isHost() && !S.me;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- small helpers ----------
  function toast(html, kind, ms) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.innerHTML = html;
    $toasts.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, ms || 3800);
  }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 25); } catch (e) { /* ignore */ } }
  function openModal(html) { $modal.innerHTML = '<div class="sheet">' + html + '</div>'; $modal.hidden = false; }
  function closeModal() { $modal.hidden = true; $modal.innerHTML = ''; }
  function speak(text) {
    try {
      if (!('speechSynthesis' in window)) { toast('This device can’t read aloud.'); return; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92;
      u.pitch = 0.9;
      const v = speechSynthesis.getVoices().find((x) => /en-GB/i.test(x.lang)) || speechSynthesis.getVoices().find((x) => /^en/i.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }
  function friendlyError(e) {
    const m = (e && e.message) || String(e);
    if (/mm_rooms|mm_players|mm_moves/.test(m) && /(does not exist|schema cache|not find)/i.test(m)) return 'The database isn’t set up for this game yet. Open <a href="setup.html">setup</a> and run the setup code in Supabase.';
    if (/row-level security/i.test(m)) return 'Too late for that! The round may have just ended.';
    return esc(m);
  }
  const me = () => S.players[S.me] || null;
  const myActor = () => (S.room && me() ? E.actorOf(S.room, me()) : null);
  const inGame = (a) => !!(S.room && (S.room.actors || []).includes(a));

  function actorName(a, opts) {
    if (!a) return '';
    if (a[0] === 't' && /^t\d$/.test(a)) {
      const t = E.TEAMS[+a.slice(1) - 1];
      return (opts && opts.plain ? '' : t.emoji + ' ') + t.name;
    }
    const p = S.players[a];
    return p ? (opts && opts.plain ? '' : p.avatar + ' ') + p.name : 'A detective';
  }
  function actorColor(a) {
    if (/^t\d$/.test(a)) return E.TEAMS[+a.slice(1) - 1].color;
    const i = (S.room.actors || []).indexOf(a);
    return ['#e5484d', '#3e8ef7', '#30a46c', '#f5a524', '#a371f7', '#14b8a6', '#ec4899'][Math.max(0, i) % 7];
  }
  function membersOf(a) {
    if (/^t\d$/.test(a)) return Object.values(S.players).filter((p) => 't' + (p.team || 1) === a);
    return S.players[a] ? [S.players[a]] : [];
  }
  function face(id, mood) { return window.Portraits && window.Portraits.has(id) ? window.Portraits.svg(id, mood) : (E.person(C(), id) || {}).emoji || '❓'; }
  function personChip(id) { const p = E.person(C(), id); return p ? p.emoji + ' ' + esc(p.short) : esc(id); }
  function roomChip(id) { const r = E.item(C(), 'room', id); return r ? r.emoji + ' ' + esc(r.name) : esc(id); }

  // ---------- replay cache ----------
  function R() {
    if (!S.room) return null;
    const key = [S.room.game, S.room.seed, S.room.difficulty, S.room.mode, S.room.ending, (S.room.actors || []).join(','), S.moves.length].join('|');
    if (S.Rkey !== key) { S.R = E.replay(C(), S.room, S.moves); S.Rkey = key; }
    return S.R;
  }

  // ---------- data sync ----------
  function applyAll(data) {
    S.room = data.room;
    S.players = {};
    data.players.forEach((p) => { S.players[p.id] = p; });
    S.moves = data.moves;
    S.Rkey = '';
  }
  function applyChange(ev) {
    const { table, type, row, old } = ev;
    if (table === 'mm_rooms') {
      if (row) {
        const prev = S.room;
        S.room = Object.assign({}, S.room || {}, row);
        onRoomChange(prev, S.room);
      }
    } else if (table === 'mm_players') {
      if (type === 'DELETE') {
        const id = (old && old.id) || (row && row.id);
        delete S.players[id];
        if (id === S.me) { S.me = null; delete session.players[S.code]; saveSession(); toast('You were removed from this game.'); S.view = 'join'; }
      } else if (row) S.players[row.id] = row;
    } else if (table === 'mm_moves') {
      if (row && !S.moves.some((m) => m.id === row.id)) S.moves.push(row);
    }
    S.Rkey = '';
    scheduleRender();
  }
  function onRoomChange(prev, room) {
    if (!prev) return;
    if (prev.game !== room.game) { S.seenItems = null; S.seenEvents = null; S.accuseDraft = {}; S.draft = {}; }
    if (S.me && prev.round !== room.round && room.phase === 'play') { S.tab = 'act'; buzz(60); toast('🕰️ <b>' + E.clock(room, room.round) + '</b>: round ' + room.round + ' begins!', 'gold'); }
    if (S.me && prev.phase !== room.phase) {
      if (room.phase === 'accuse') { S.tab = 'accuse'; buzz(120); }
      if (room.phase === 'play' && prev.phase !== 'play') S.tab = 'act';
    }
    if (isBoard() && prev.phase !== room.phase && room.phase === 'play') speakDevelopment();
  }

  let renderTimer = null;
  function typing() {
    const a = document.activeElement;
    return !!(a && $app.contains(a) && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type !== 'checkbox')));
  }
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
    if (String(data.room.case_id || '').startsWith('board')) { location.replace('board.html?join=' + code); throw new Error('Opening the board game…'); }
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
    ['sbu', 'sbk', 'board'].forEach((k) => url.searchParams.delete(k));
    history.replaceState(null, '', url);
  }
  async function refresh() {
    if (!S.code) return;
    try { applyAll(await store.loadAll(S.code)); scheduleRender(); } catch (e) { /* try later */ }
  }
  setInterval(() => { if (S.code && !document.hidden) refresh(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.code) { refresh(); if (isBoard()) keepAwake(); } });

  async function patchRoom(patch) {
    const row = await store.updateRoom(S.code, patch);
    if (row) { const prev = S.room; S.room = Object.assign({}, S.room, row); onRoomChange(prev, S.room); }
    S.Rkey = '';
    scheduleRender();
  }

  let wake = null;
  async function keepAwake() {
    try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { /* ignore */ }
  }

  // ---------- moves ----------
  async function act(kind, target) {
    const actor = myActor();
    if (!actor || !inGame(actor)) { toast('You’re not in this game.'); return false; }
    const room = S.room;
    const base = { room: S.code, game: room.game || 1, actor, player: S.me, kind, target };
    let tries = [];
    if (ROUND_KINDS.includes(kind)) {
      const lim = E.LIMITS[room.mode][kind];
      const used = (R().state[actor].used[room.round + ':' + kind]) || 0;
      for (let s = used; s < lim; s++) tries.push({ round: room.round, slot: s });
      if (!tries.length) { toast({ search: 'No searches', question: 'No questions', theory: 'No theories' }[kind] + ' left this round.'); return false; }
    } else if (kind === 'accuse') tries = [{ round: 0, slot: 0 }];
    else if (kind === 'object') tries = [{ round: 0, slot: E.statementIndex(C(), target.stmt) }];
    else tries = [{ round: 0, slot: Math.floor(Math.random() * 2e9) }];
    S.busy = true;
    try {
      for (const t of tries) {
        try {
          const row = await store.addMove(Object.assign({}, base, t));
          if (row && !S.moves.some((m) => m.id === row.id)) S.moves.push(row);
          S.Rkey = '';
          return true;
        } catch (e) {
          if (e.code === '23505' || /duplicate/i.test(e.message)) continue; // a teammate used that slot first
          throw e;
        }
      }
      toast(kind === 'accuse' ? 'Your accusation is already locked in.' : 'Your team already used that.');
      await refresh();
      return false;
    } catch (e) {
      toast('⚠️ ' + friendlyError(e), 'bad', 5000);
      refresh();
      return false;
    } finally {
      S.busy = false;
      scheduleRender();
    }
  }

  // ---------- notifications from the replay ----------
  function announce() {
    const r = R();
    if (!r) return;
    if (S.me) {
      const a = myActor();
      const s = r.state[a];
      if (!s) return;
      if (S.seenItems == null) { S.seenItems = s.items.length; return; }
      s.items.slice(S.seenItems).forEach((it) => {
        const mine = it.by === S.me;
        const who = it.by && S.players[it.by] && !mine ? esc(S.players[it.by].name) + ' ' : '';
        if (it.t === 'shared') { toast('📨 ' + esc(actorName(it.from)) + ' shared ' + (it.clue ? 'a clue' : 'a Case Card') + ' with you!', 'gold'); buzz(40); }
        else if (it.t === 'showed') toast('🗂️ Your card <b>' + esc(E.cardName(C(), it.card)) + '</b> was shown to ' + esc(actorName(it.to)) + '.', 'muted');
        else if (!mine && it.t === 'objection') toast((it.ok ? '⚡ ' + who + 'caught ' : '✗ ' + who + 'objected to ') + personChip(it.who) + (it.ok ? ' in a lie!' : ', but it didn’t hold up.'), it.ok ? 'good' : 'bad');
      });
      S.seenItems = s.items.length;
    }
    if (isBoard()) {
      if (S.seenEvents == null) { S.seenEvents = r.events.length; return; }
      r.events.slice(S.seenEvents).forEach((ev) => {
        if (ev.t === 'objection') objectionFlash(ev);
        if (ev.t === 'accuse') toast('🔒 ' + esc(actorName(ev.actor)) + ' locked in an accusation!', 'gold', 4500);
      });
      S.seenEvents = r.events.length;
    }
  }
  function objectionFlash(ev) {
    const el = document.createElement('div');
    el.className = 'objection ' + (ev.ok ? 'ok' : 'bad');
    el.innerHTML = '<div class="big">' + (ev.ok ? 'OBJECTION!' : 'OBJECTION…?') + '</div><div class="sub">' +
      esc(actorName(ev.actor)) + (ev.ok ? ' caught <b>' + personChip(ev.who) + '</b> in a lie!' : ' objected to <b>' + personChip(ev.who) + '</b>… but it didn’t hold up.') + '</div>';
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('out'), 3200);
    setTimeout(() => el.remove(), 3800);
  }

  // ---------- board: round flow ----------
  function allDone() {
    const r = R();
    if (!r || S.room.phase !== 'play') return false;
    return r.actors.length > 0 && r.actors.every((a) => {
      const left = E.actionsLeft(S.room, r.state[a], S.room.round);
      return left.search + left.question + left.theory === 0;
    });
  }
  setInterval(() => {
    if (!isBoard() || S.view !== 'game' || !S.room) return;
    if (S.room.phase === 'play' && allDone() && !S.countdownOff) {
      if (S.countdown == null) S.countdown = Date.now() + 20000;
      const left = Math.ceil((S.countdown - Date.now()) / 1000);
      const el = document.getElementById('countdown');
      if (el) el.textContent = left > 0 ? left : 0;
      else scheduleRender();
      if (left <= 0) { S.countdown = null; nextRound(); }
    } else if (S.countdown != null) { S.countdown = null; scheduleRender(); }
  }, 500);

  async function nextRound() {
    S.countdown = null;
    S.countdownOff = false;
    const N = E.totalRounds(S.room);
    if (S.room.round >= N) await patchRoom({ phase: 'accuse' });
    else { await patchRoom({ round: S.room.round + 1 }); speakDevelopment(); }
  }
  function speakDevelopment() {
    if (!S.room || S.room.phase !== 'play' || !session.autoRead) return;
    speak(E.clock(S.room, S.room.round) + '. ' + E.development(C(), S.room, S.room.round));
  }

  // ---------- videos for filmed scenes ----------
  function videos() { return Object.assign({}, (window.MYSTERY_CONFIG || {}).videos || {}, lsGet('mm_videos', {}) || {}); }
  function ytId(url) { const m = String(url || '').match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/); return m ? m[1] : null; }
  function videoEmbed(key) {
    const id = ytId(videos()[key]);
    if (!id) return '';
    return '<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/' + id + '?rel=0&playsinline=1" title="Filmed scene" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>';
  }

  // =====================================================================
  // RENDER
  // =====================================================================
  // The animated story keeps playing while live updates arrive, so don't redraw over it.
  function storyKey() {
    if (!isBoard() || S.view !== 'game' || !S.room) return null;
    if (S.room.phase === 'intro' && !ytId(videos().intro)) return 'intro';
    if (S.room.phase === 'reveal' && (S.room.reveal_step || 0) === 1) { const end = R().ending; if (!ytId(videos()['reveal_' + end])) return 'reveal_' + end + '_' + (S.room.game || 1); }
    return null;
  }
  function render() {
    const sk = storyKey();
    if (sk && S.story && S.story.key === sk && document.body.contains(S.story.el)) { announce(); return; }
    if (S.story && (!sk || S.story.key !== sk)) { S.story.ctl.destroy(); S.story = null; }
    renderInner();
    const slot = document.getElementById('story-slot');
    if (sk && slot && window.Story) {
      const cards = window.STORY_CARDS[C().id];
      const list = sk === 'intro' ? cards.intro : cards.reveal[R().ending];
      const ctl = window.Story.mount(slot, list, { onEnd: () => { const b = document.querySelector('.story-after .gold'); if (b) b.classList.add('glow'); } });
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
        <div class="crest">🕰️</div>
        <h1 class="title">Murder at<br><span>Marrowby Manor</span></h1>
        <p class="tag"><b>The Detective Case</b>: a challenging mystery for 3–7 detectives, ages 10+.<br>One TV board. Everyone’s phone. Six suspects. One culprit.</p>
        <div class="card">
          <h2>📱 Join a game</h2>
          <div class="row"><input id="code" class="code-in" maxlength="6" placeholder="CODE" autocapitalize="characters" autocomplete="off" value="${esc(params.get('join') || '')}"><button class="btn gold" data-act="join">Join</button></div>
          ${last ? `<button class="btn ghost small" data-act="rejoin">↩︎ Back to game ${esc(last)}</button>` : ''}
        </div>
        <div class="card">
          <h2>📺 Set up the TV board</h2>
          <p class="muted">Do this on the iPad you’ll cast to the TV. Everyone else joins on their phone.</p>
          <button class="btn" data-act="host">✨ Start a new game</button>
          <details class="more"><summary>Open the board for a game that’s already running</summary>
            <div class="row"><input id="bcode" class="code-in" maxlength="6" placeholder="CODE" autocapitalize="characters"><button class="btn ghost" data-act="reboard">Open board</button></div>
          </details>
        </div>
        <a class="card gamepick" href="board.html"><span class="gp-e">🎲</span><span><b>New! The Board Game</b><br><span class="muted">Easier and quicker: roll the dice, explore the mansion on the TV, and solve who, with what, and where.</span></span></a>
        ${store.kind === 'local' ? '<div class="banner warn">🧪 Test mode: no database is connected, so only tabs on this device can share a game. See <a href="setup.html">setup</a>.</div>' : ''}
        <p class="foot"><a href="scripts.html">🎬 Filming scripts</a> · <a href="#" data-act="rules">📜 How to play</a></p>
      </div>`;
  }

  // ---------- join / profile ----------
  function renderJoin() {
    const room = S.room;
    const started = room && room.phase !== 'lobby';
    const p = me() || {};
    const draft = S.draft.profile || { name: p.name || session.name || '', avatar: p.avatar || session.avatar || AVATARS[Math.floor(Math.random() * 8)], team: p.team || null };
    S.draft.profile = draft;
    const others = Object.values(S.players).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    const teamPick = room && room.mode === 'team';
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
          ${teamPick ? `<label class="lbl">Team</label><div class="seg">${E.TEAMS.slice(0, room.teams).map((t) => `<button class="${draft.team === t.n ? 'on' : ''}" style="--c:${t.color}" data-act="pickteam" data-v="${t.n}">${t.emoji} ${t.name.replace('Team ', '')}</button>`).join('')}</div>` : ''}
          <button class="btn gold big" data-act="saveprofile" ${started && !S.me && room.mode !== 'team' ? 'disabled' : ''}>${S.me ? 'Save' : '🔍 Join the investigation'}</button>
          ${S.me ? '<button class="btn ghost small" data-act="back">Cancel</button>' : ''}
        </div>
        ${!S.me && others.length ? `<div class="card"><h2>Already playing on another device?</h2><p class="muted">Tap your name to continue as yourself.</p>
          <div class="reclaim">${others.map((o) => `<button class="chip" data-act="reclaim" data-v="${o.id}">${o.avatar} ${esc(o.name)}</button>`).join('')}</div></div>` : ''}
        <p class="foot"><a href="./">← Home</a></p>
      </div>`;
  }

  // =====================================================================
  // BOARD (TV)
  // =====================================================================
  function renderBoard() {
    const room = S.room;
    const ph = room.phase;
    let body = '';
    if (ph === 'lobby') body = boardLobby();
    else if (ph === 'intro') body = boardIntro();
    else if (ph === 'play') body = boardPlay();
    else if (ph === 'accuse') body = boardAccuse();
    else body = boardReveal();
    $app.innerHTML = `<div class="board phase-${ph}">${boardHeader()}${body}</div>`;
  }
  function boardHeader() {
    const room = S.room;
    const N = E.totalRounds(room);
    const right = room.phase === 'play' ? `<div class="clock"><span>${E.clock(room, room.round)}</span><small>Round ${room.round} of ${N}</small></div>`
      : room.phase === 'accuse' || room.phase === 'reveal' ? '<div class="clock"><span>12:00 AM</span><small>Midnight</small></div>' : '';
    return `<header class="bhead">
      <div class="bt">🕰️ <b>Marrowby Manor</b></div>
      ${right}
      <div class="bcode">Code <b>${esc(S.code)}</b>${S.online !== 'live' ? ' <span class="dot off" title="Reconnecting"></span>' : ''}</div>
    </header>`;
  }
  function joinUrl() {
    const u = new URL(location.href);
    u.search = '';
    u.hash = '';
    if (store.kind === 'supabase' && !(window.MYSTERY_CONFIG || {}).supabaseUrl) { u.searchParams.set('sbu', cfg.supabaseUrl); u.searchParams.set('sbk', cfg.supabaseKey); }
    return u;
  }

  function boardLobby() {
    const room = S.room;
    const ps = Object.values(S.players).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    const u = joinUrl();
    const pchip = (p) => `<button class="pchip" data-act="${room.mode === 'team' ? 'cycleteam' : 'kickask'}" data-v="${p.id}" title="${room.mode === 'team' ? 'Tap to move to another team' : 'Tap to remove'}">${p.avatar} ${esc(p.name)}</button>`;
    const roster = room.mode === 'team'
      ? `<div class="teams">${E.TEAMS.slice(0, room.teams).map((t) => `<div class="teamcol" style="--c:${t.color}"><h3>${t.emoji} ${t.name}</h3>${ps.filter((p) => (p.team || 1) === t.n).map(pchip).join('') || '<p class="muted">Nobody yet</p>'}</div>`).join('')}</div>
         <p class="muted small">Tap a name to move them to another team.</p>`
      : `<div class="plist">${ps.map(pchip).join('') || '<p class="muted">Waiting for detectives…</p>'}</div>`;
    const vids = videos();
    const n = ps.length;
    const actorsNow = E.actorsFor(room, S.players).length;
    const ready = actorsNow >= 2;
    return `<div class="lobby">
      <section class="panel joinbox">
        <h2>Join on your phone</h2>
        <div class="bigcode">${esc(S.code)}</div>
        <p>Open <b class="url">${esc(u.host + u.pathname)}</b><br>and type the code.</p>
        <button class="btn ghost small" data-act="share">📤 Send the invite link</button>
      </section>
      <section class="panel">
        <h2>Detectives <span class="count">${n}</span></h2>
        ${roster}
        ${n && (n < 3 || n > 7) ? `<p class="muted small">Best with 3–7 players${n < 3 ? ', but you can test with 2' : ''}.</p>` : ''}
      </section>
      <section class="panel settings">
        <h2>Game settings</h2>
        <label class="lbl">Mode</label>
        <div class="seg">
          <button class="${room.mode === 'team' ? 'on' : ''}" data-act="set" data-k="mode" data-v="team">👥 Team mode</button>
          <button class="${room.mode === 'solo' ? 'on' : ''}" data-act="set" data-k="mode" data-v="solo">🕵️ Individual mode</button>
        </div>
        <p class="muted small">${room.mode === 'team' ? 'Teams share one notebook. Each round a team gets 3 searches, 2 questions and 1 theory.' : 'Everyone for themselves! Each round you get 2 searches, 1 question and 1 theory. Trade clues… or don’t.'}</p>
        ${room.mode === 'team' ? `<label class="lbl">Teams</label><div class="seg">${[2, 3].map((k) => `<button class="${room.teams === k ? 'on' : ''}" data-act="set" data-k="teams" data-v="${k}">${k} teams</button>`).join('')}</div>
          <button class="btn ghost small" data-act="shuffle">🔀 Shuffle teams</button>` : ''}
        <label class="lbl">Difficulty</label>
        <div class="seg">${['easy', 'normal', 'hard'].map((d) => `<button class="${room.difficulty === d ? 'on' : ''}" data-act="set" data-k="difficulty" data-v="${d}">${{ easy: '🙂 Easy', normal: '🧐 Normal', hard: '😈 Hard' }[d]}</button>`).join('')}</div>
        <p class="muted small">${{ easy: '7 rounds, more Case Cards, hints when a clue doesn’t match a statement, and no penalty for a wrong objection.', normal: '6 rounds. Wrong objections cost 5 points.', hard: '5 rounds, fewer Case Cards, no hints, and wrong objections cost 10 points.' }[room.difficulty]}</p>
        <details class="more" data-k="vids" ${S.open.has('vids') ? 'open' : ''}><summary>🎬 Your filmed scenes ${Object.values(vids).filter(ytId).length ? '(' + Object.values(vids).filter(ytId).length + ' linked)' : ''}</summary>
          <p class="muted small">Paste YouTube links (unlisted is fine). Saved on this iPad only. Leave blank to have the story shown as text.</p>
          ${[['intro', 'Opening scene'], ['reveal_A', 'Reveal: ending 1'], ['reveal_B', 'Reveal: ending 2'], ['reveal_C', 'Reveal: ending 3']].map(([k, l]) => `<label class="lbl">${l}</label><input class="vid" data-k="${k}" placeholder="https://youtu.be/…" value="${esc(vids[k] || '')}">`).join('')}
          <button class="btn ghost small" data-act="savevids">Save links</button>
        </details>
        <details class="more" data-k="adv" ${S.open.has('adv') ? 'open' : ''}><summary>⚙️ Advanced</summary>
          <label class="lbl">Ending</label>
          <div class="seg">${[['random', '🎲 Random'], ['A', '1'], ['B', '2'], ['C', '3']].map(([v, l]) => `<button class="${room.ending === v ? 'on' : ''}" data-act="set" data-k="ending" data-v="${v}">${l}</button>`).join('')}</div>
          <p class="muted small">Keep it on Random so even the host doesn’t know who did it.</p>
          <label class="chk"><input type="checkbox" id="autoread" ${session.autoRead ? 'checked' : ''}> Read each new round aloud</label>
        </details>
        <button class="btn gold big" data-act="start" ${ready ? '' : 'disabled'}>${ready ? '🕯️ Start the mystery' : room.mode === 'team' ? 'Need players on 2 teams' : 'Need at least 2 detectives'}</button>
      </section>
    </div>`;
  }

  function lineup() {
    const r = R();
    return `<div class="lineup">${C().suspects.concat(C().witnesses).map((s) => `<div class="suspect ${s.id === 'pembrook' ? 'witness' : ''}">
      <div class="face">${face(s.id)}</div><div class="nm">${esc(s.short)}</div><div class="rl">${esc(s.role)}</div>
      ${r && r.caught[s.id] ? `<div class="caught">⚡ ${r.caught[s.id]} lie${r.caught[s.id] > 1 ? 's' : ''} caught</div>` : ''}
    </div>`).join('')}</div>`;
  }

  function boardIntro() {
    const vid = videoEmbed('intro');
    if (!vid) {
      return `<div class="intro"><div class="story-slot" id="story-slot"></div>
        <div class="story-after"><button class="btn gold" data-act="begin">🔍 Begin the investigation</button></div></div>`;
    }
    return `<div class="intro">
      ${vid}
      <div class="story collapsed">${C().intro.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
      ${lineup()}
      <div class="controls">
        <button class="btn gold big" data-act="begin">🔍 Begin the investigation</button>
      </div>
    </div>`;
  }

  function boardPlay() {
    const room = S.room;
    const r = R();
    const N = E.totalRounds(room);
    const roundEvents = r.events.filter((e) => e.round === room.round && e.t === 'search');
    const tiles = C().rooms.map((rm) => {
      const here = roundEvents.filter((e) => e.room === rm.id);
      const total = r.events.filter((e) => e.t === 'search' && e.room === rm.id).length;
      return `<div class="tile ${rm.id}">
        <div class="em">${rm.emoji}</div><div class="nm">${esc(rm.name)}</div>
        <div class="dots">${here.map((e) => `<span class="d" style="background:${actorColor(e.actor)}"></span>`).join('')}</div>
        ${total ? `<div class="tot">searched ${total}×</div>` : ''}
      </div>`;
    }).join('');
    const status = r.actors.map((a) => {
      const left = E.actionsLeft(room, r.state[a], room.round);
      const lim = E.LIMITS[room.mode];
      const pips = (k, icon) => icon + ' ' + Array.from({ length: lim[k] }, (_, i) => `<i class="${i < lim[k] - left[k] ? 'used' : ''}"></i>`).join('');
      const done = left.search + left.question + left.theory === 0;
      return `<div class="astat ${done ? 'done' : ''}" style="--c:${actorColor(a)}">
        <div class="an">${esc(actorName(a))}${room.mode === 'team' ? `<small>${membersOf(a).map((p) => p.avatar).join('')}</small>` : ''}</div>
        <div class="pips">${pips('search', '🔍')} ${pips('question', '🗣️')} ${pips('theory', '💭')}</div>
        ${r.state[a].accuse ? '<div class="locked">🔒 Accused</div>' : done ? '<div class="ok">✓ Done</div>' : ''}
      </div>`;
    }).join('');
    const feed = r.events.filter((e) => ['objection', 'accuse', 'share', 'theory'].includes(e.t)).slice(-5).reverse().map((e) => {
      if (e.t === 'objection') return `<li>${e.ok ? '⚡' : '✗'} ${esc(actorName(e.actor))} ${e.ok ? 'caught ' + personChip(e.who) + ' in a lie' : 'objected to ' + personChip(e.who) + ' (didn’t hold up)'}</li>`;
      if (e.t === 'accuse') return `<li>🔒 ${esc(actorName(e.actor))} locked in an accusation</li>`;
      if (e.t === 'share') return `<li>📨 ${esc(actorName(e.actor))} shared something with ${esc(actorName(e.to))}</li>`;
      return `<li>💭 ${esc(actorName(e.actor))} tested a theory${e.shower ? '. ' + esc(actorName(e.shower)) + ' showed a card' : '. Nobody could disprove it!'}</li>`;
    }).join('');
    const last = room.round >= N;
    return `<div class="play">
      <div class="dev"><div class="devtime">${E.clock(room, room.round)}</div><p>${esc(E.development(C(), room, room.round))}</p><button class="icon" data-act="readdev" title="Read aloud">🔊</button></div>
      <div class="playgrid">
        <div class="map">${tiles}</div>
        <div class="side">
          ${lineup()}
          ${feed ? `<ul class="feed">${feed}</ul>` : '<p class="muted feed">Search rooms, question suspects, and catch lies with ⚡ Objection!</p>'}
        </div>
      </div>
      <div class="statusbar">${status}</div>
      <div class="controls">
        ${S.countdown != null ? `<div class="cd">Everyone’s done! Next round in <b id="countdown">20</b>s <button class="btn ghost small" data-act="nocount">Wait</button></div>` : ''}
        <button class="btn ${last ? 'gold' : ''}" data-act="next">${last ? '🕛 Midnight: final accusations' : '⏭ Next round'}</button>
      </div>
    </div>`;
  }

  function boardAccuse() {
    const r = R();
    const waiting = r.actors.filter((a) => !r.state[a].accuse);
    return `<div class="accuse-b">
      <div class="midnight">🕛</div>
      <h1>Midnight.</h1>
      <p class="lead">The snowplow is here. Time to name the culprit: <b>who</b>, <b>how</b>, <b>where</b>, and <b>why</b>.<br>Lock in your final accusation on your phone.</p>
      <div class="statusbar">${r.actors.map((a) => `<div class="astat ${r.state[a].accuse ? 'done' : ''}" style="--c:${actorColor(a)}"><div class="an">${esc(actorName(a))}</div>${r.state[a].accuse ? '<div class="locked">🔒 Locked in</div>' : '<div class="muted">thinking…</div>'}</div>`).join('')}</div>
      <div class="controls"><button class="btn gold big" data-act="reveal">${waiting.length ? '⚖️ Reveal anyway (' + waiting.length + ' still deciding)' : '⚖️ Reveal the truth'}</button></div>
    </div>`;
  }

  function accusationCard(a) {
    const r = R();
    const acc = r.state[a].accuse;
    if (!acc) return `<div class="acc" style="--c:${actorColor(a)}"><h3>${esc(actorName(a))}</h3><p class="muted">No accusation</p></div>`;
    const sus = E.person(C(), acc.suspect);
    return `<div class="acc" style="--c:${actorColor(a)}"><h3>${esc(actorName(a))}</h3>
      <div class="accface">${sus ? face(sus.id) : '❓'}</div><div class="accwho">${sus ? esc(sus.short) : '?'}</div>
      <div class="acclines">${['method', 'room', 'motive'].map((k) => esc(E.cardName(C(), k + ':' + acc[k]))).join('<br>')}</div>
      ${acc.atRound < r.rounds ? `<div class="early">⏱️ locked in at round ${acc.atRound}</div>` : ''}</div>`;
  }

  function boardReveal() {
    const room = S.room;
    const r = R();
    const step = room.reveal_step || 0;
    const ending = r.ending;
    const sol = E.solution(C(), ending);
    if (step === 0) {
      return `<div class="reveal">
        <h1>The detectives accuse…</h1>
        <div class="accs">${r.actors.map(accusationCard).join('')}</div>
        <div class="controls"><button class="btn gold big" data-act="revstep" data-v="1">🎬 What really happened</button></div>
      </div>`;
    }
    if (step === 1) {
      const vid = videoEmbed('reveal_' + ending);
      if (!vid) {
        return `<div class="reveal"><div class="story-slot" id="story-slot"></div>
          <div class="story-after"><button class="btn ghost" data-act="revstep" data-v="0">⬅ Accusations</button><button class="btn gold" data-act="revstep" data-v="2">🏆 Scores</button></div></div>`;
      }
      return `<div class="reveal">
        ${vid}
        <div class="story ${vid ? 'collapsed' : ''}">${C().reveal[ending].map((p, i) => `<p class="${i === 0 ? 'headline' : ''}">${esc(p)}</p>`).join('')}</div>
        <div class="controls">
          <button class="btn ghost" data-act="readreveal">🔊 Read aloud</button>
          <button class="btn gold big" data-act="revstep" data-v="2">🏆 Scores</button>
        </div>
      </div>`;
    }
    const rows = r.actors.map((a) => ({ a, sc: E.score(C(), r, a) })).sort((x, y) => y.sc.total - x.sc.total);
    const culprit = E.person(C(), sol.suspect);
    return `<div class="reveal">
      <div class="solution">
        <div class="sface">${face(culprit.id, 'angry')}</div>
        <div><div class="sname">${esc(culprit.name)}</div>
        <div class="slines">${E.cardName(C(), 'method:' + sol.method)} · ${E.cardName(C(), 'room:' + sol.room)} · ${E.cardName(C(), 'motive:' + sol.motive)}</div></div>
      </div>
      <table class="scores"><thead><tr><th></th><th>Detective</th><th>Who</th><th>How</th><th>Where</th><th>Why</th><th>Early</th><th>⚡</th><th>Total</th></tr></thead><tbody>
      ${rows.map(({ a, sc }, i) => {
        const rk = E.rank(sc.total);
        const cell = (k) => (sc.accused ? (sc.parts[k] ? '✅ ' + sc.parts[k] : '❌') : '–');
        return `<tr class="${i === 0 ? 'win' : ''}"><td>${i === 0 ? '👑' : i + 1}</td><td style="color:${actorColor(a)}"><b>${esc(actorName(a))}</b><br><small>${rk.emoji} ${rk.title}</small></td>
          <td>${cell('suspect')}</td><td>${cell('method')}</td><td>${cell('room')}</td><td>${cell('motive')}</td><td>${sc.early ? '+' + sc.early : ''}</td><td>${sc.objections ? (sc.objections > 0 ? '+' : '') + sc.objections : ''}</td><td class="tot">${sc.total}</td></tr>`;
      }).join('')}
      </tbody></table>
      <div class="controls">
        <button class="btn ghost" data-act="revstep" data-v="1">⬅ The story</button>
        <button class="btn gold" data-act="again">🔁 Play again (new ending)</button>
      </div>
    </div>`;
  }

  // =====================================================================
  // PHONE
  // =====================================================================
  function renderPhone() {
    const room = S.room;
    const p = me();
    const a = myActor();
    const color = a ? actorColor(a) : '#c9a227';
    let main = '';
    if (room.phase === 'lobby') main = phoneLobby();
    else if (!inGame(a)) main = `<div class="card center"><h2>You’re watching this one</h2><p class="muted">This game started before you joined${room.mode === 'team' ? ' and your team isn’t playing. Pick another team in your profile' : ''}. Watch the TV, and you can play next game!</p><button class="btn ghost" data-act="profile">Edit profile</button></div>`;
    else if (room.phase === 'intro') main = `<div class="card center watch"><div class="tvicon">📺</div><h2>Watch the TV!</h2><p class="muted">The story is starting. Here are your Case Cards: things that are definitely <b>not</b> the answer.</p>${cardsList(R().state[a], true)}</div>`;
    else if (room.phase === 'reveal') main = phoneReveal();
    else main = phoneTabs();
    const top = room.phase === 'play' ? `<div class="ptop" style="--c:${color}"><div><b>${E.clock(room, room.round)}</b> · Round ${room.round}/${E.totalRounds(room)}</div><div class="who" data-act="profile">${esc(a ? actorName(a) : '')}${room.mode === 'team' ? ' · ' + esc(p.name) : ''}</div></div>`
      : `<div class="ptop" style="--c:${color}"><div><b>Marrowby Manor</b> · ${esc(S.code)}</div><div class="who" data-act="profile">${p.avatar} ${esc(p.name)}</div></div>`;
    $app.innerHTML = `<div class="phone">${top}${S.online === 'offline' ? '<div class="banner warn small">Reconnecting…</div>' : ''}<div class="pmain">${main}</div>${room.phase === 'play' || room.phase === 'accuse' ? phoneNav() : ''}</div>`;
  }

  function phoneLobby() {
    const room = S.room;
    const p = me();
    const mates = room.mode === 'team' ? Object.values(S.players).filter((x) => (x.team || 1) === (p.team || 1)) : [];
    return `<div class="card center">
      <div class="tvicon">🕯️</div>
      <h2>You’re in, ${esc(p.name)}!</h2>
      <p class="muted">Waiting for the host to start the mystery. Keep this screen open.</p>
      ${room.mode === 'team' ? `<label class="lbl">Your team</label><div class="seg">${E.TEAMS.slice(0, room.teams).map((t) => `<button class="${(p.team || 1) === t.n ? 'on' : ''}" style="--c:${t.color}" data-act="jointeam" data-v="${t.n}">${t.emoji} ${t.name.replace('Team ', '')}</button>`).join('')}</div>
        <p class="muted small">Teammates: ${mates.map((x) => x.avatar + ' ' + esc(x.name)).join(', ')}</p>` : '<p class="muted small">Individual mode: every detective for themselves.</p>'}
      <button class="btn ghost small" data-act="howto">📜 How to play</button>
    </div>`;
  }

  function phoneNav() {
    const tabs = [['act', '🔍', 'Investigate'], ['notes', '📒', 'Notebook'], ['grid', '✅', 'Grid'], ['accuse', '⚖️', 'Accuse']];
    return `<nav class="pnav">${tabs.map(([k, i, l]) => `<button class="${S.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}"><span>${i}</span>${l}</button>`).join('')}</nav>`;
  }

  function phoneTabs() {
    if (S.room.phase === 'accuse' && S.tab === 'act') S.tab = 'accuse';
    if (S.tab === 'notes') return phoneNotes();
    if (S.tab === 'grid') return phoneGrid();
    if (S.tab === 'accuse') return phoneAccuse();
    return phoneAct();
  }

  // ---- Investigate tab ----
  function itemCard(it, opts) {
    const c = C();
    const r = R();
    const ending = r.ending;
    const s = r.state[myActor()];
    const by = it.by && S.players[it.by] && S.room.mode === 'team' ? `<span class="by">${S.players[it.by].avatar} ${esc(S.players[it.by].name)}</span>` : '';
    if (it.t === 'clue' || (it.t === 'shared' && it.clue)) {
      const id = it.id || it.clue;
      const cl = E.clue(c, id);
      const rm = E.item(c, 'room', cl.room);
      return `<div class="ncard clue"><div class="nh">${rm.emoji} <b>${esc(E.pick(cl.title, ending))}</b> <span class="where">${esc(rm.name)}</span>${by}</div>
        <p>${esc(E.pick(cl.text, ending))}</p>
        ${it.t === 'shared' ? `<div class="from">📨 Shared by ${esc(actorName(it.from))}</div>` : ''}
        ${opts && opts.actions ? `<div class="nact"><button class="btn tiny ghost" data-act="share" data-clue="${id}">📨 Share</button></div>` : ''}</div>`;
    }
    if (it.t === 'empty') return `<div class="ncard empty"><div class="nh">${roomChip(it.room)}${by}</div><p class="muted">Nothing new here${it.later ? '… yet. Maybe come back later.' : '. You’ve found everything in this room.'}</p></div>`;
    if (it.t === 'silent') return `<div class="ncard empty"><div class="nh">${personChip(it.who)}${by}</div><p class="muted">“I’ve told you everything${it.later ? '… for now.' : '.'}”</p></div>`;
    if (it.t === 'stmt') {
      const st = E.statementById(c, it.id);
      const per = E.person(c, it.who);
      const lie = E.lieOf(st, ending);
      const obj = s.objected[it.id];
      const hint = S.room.difficulty === 'easy' && !obj && lie && lie.by.some((x) => s.clues.has(x));
      return `<div class="ncard stmt ${obj === 'ok' ? 'broken' : ''}"><div class="nh"><span class="mini-pp">${face(it.who, obj === 'ok' ? 'gasp' : null)}</span> <b>${esc(per.short)}</b> says:${by}</div>
        <p class="quote">“${esc(E.pick(st.text, ending))}”</p>
        ${obj === 'ok' ? `<div class="stamp">LIE CAUGHT</div><p class="truth">“${esc(lie.truth)}”</p>` : ''}
        ${obj === 'bad' ? '<p class="muted small">✗ Your objection didn’t hold up.</p>' : ''}
        ${hint ? '<p class="hint">🤔 Hmm… something you found doesn’t match this.</p>' : ''}
        ${opts && opts.actions && !obj ? `<div class="nact"><button class="btn tiny red" data-act="object" data-stmt="${it.id}">⚡ Objection!</button></div>` : ''}</div>`;
    }
    if (it.t === 'theory') {
      const g = it.guess;
      const line = E.CATS.map((k) => esc(E.cardName(c, k + ':' + g[k]))).join(' · ');
      return `<div class="ncard theory"><div class="nh">💭 <b>Theory</b>${by}</div><p class="small">${line}</p>
        ${it.card ? `<p>${esc(actorName(it.shower))} showed you: <b class="cardname">🗂️ ${esc(E.cardName(c, it.card))}</b><br><span class="muted small">So that one is NOT the answer.</span></p>`
          : '<p><b>Nobody could disprove it!</b><br><span class="muted small">Careful: not every card is dealt, so this doesn’t prove it’s true.</span></p>'}</div>`;
    }
    if (it.t === 'showed') return `<div class="ncard muted"><div class="nh">🗂️ You showed a card</div><p class="small">${esc(actorName(it.to))} saw your card <b>${esc(E.cardName(c, it.card))}</b>.</p></div>`;
    if (it.t === 'shared' && it.card) return `<div class="ncard card"><div class="nh">📨 Case Card from ${esc(actorName(it.from))}</div><p class="cardname">🗂️ ${esc(E.cardName(c, it.card))}</p><p class="muted small">Definitely NOT the answer.</p></div>`;
    if (it.t === 'gave') return `<div class="ncard muted"><div class="nh">📨 You shared with ${esc(actorName(it.to))}</div><p class="small">${it.clue ? esc(E.pick(E.clue(c, it.clue).title, ending)) : esc(E.cardName(c, it.card))}</p></div>`;
    if (it.t === 'objection') {
      const per = E.person(c, it.who);
      return `<div class="ncard ${it.ok ? 'good' : 'bad'}"><div class="nh">⚡ Objection to ${per.emoji} ${esc(per.short)}${by}</div><p class="small">${it.ok ? 'It held up! +' + E.POINTS.objection + ' points.' : 'It didn’t hold up.' + (E.WRONG_OBJECTION[S.room.difficulty] ? ' ' + E.WRONG_OBJECTION[S.room.difficulty] + ' points.' : '')}</p></div>`;
    }
    return '';
  }

  function phoneAct() {
    const room = S.room;
    const c = C();
    const r = R();
    const a = myActor();
    const s = r.state[a];
    const left = room.phase === 'play' ? E.actionsLeft(room, s, room.round) : { search: 0, question: 0, theory: 0 };
    const recent = s.items.filter((it) => it.round === room.round && ['clue', 'empty', 'stmt', 'silent', 'theory'].includes(it.t)).slice(-3).reverse();
    const none = left.search + left.question + left.theory === 0;
    return `
      <div class="devp"><b>${E.clock(room, room.round)}</b> ${esc(E.development(c, room, room.round))}</div>
      ${recent.length ? `<h3 class="sec">This round</h3>${recent.map((it) => itemCard(it, { actions: true })).join('')}` : ''}
      ${none ? `<div class="card center"><h2>✓ All done this round</h2><p class="muted">${room.mode === 'team' ? 'Huddle with your team! Check the Notebook, and use ⚡ Objection when a clue proves someone lied.' : 'Check your Notebook, catch lies with ⚡ Objection, or trade clues.'} The next round starts when everyone’s done.</p></div>` : ''}
      <h3 class="sec">🔍 Search a room <span class="left">${left.search} left</span></h3>
      <div class="grid4">${c.rooms.map((rm) => { const done = !roomHasMore(s, rm.id); return `<button class="tbtn ${done ? 'done' : ''}" data-act="search" data-v="${rm.id}" ${left.search && !S.busy && !done ? '' : 'disabled'}><span>${rm.emoji}</span>${esc(rm.name)}${done ? '<i>✓ for now</i>' : ''}</button>`; }).join('')}</div>
      <h3 class="sec">🗣️ Question someone <span class="left">${left.question} left</span></h3>
      <div class="grid4">${c.suspects.concat(c.witnesses).map((p) => { const done = !personHasMore(s, p.id); return `<button class="tbtn ${done ? 'done' : ''}" data-act="question" data-v="${p.id}" ${left.question && !S.busy && !done ? '' : 'disabled'}>${face(p.id)}${esc(p.short)}${done ? '<i>✓ for now</i>' : ''}</button>`; }).join('')}</div>
      <h3 class="sec">💭 Test a theory <span class="left">${left.theory} left</span></h3>
      <p class="muted small">Name a suspect, method, room and motive. The next detective who holds one of those Case Cards must secretly show you one.</p>
      <button class="btn wide" data-act="theory" ${left.theory && !S.busy ? '' : 'disabled'}>💭 Make a theory</button>
      <h3 class="sec">🗂️ Your Case Cards</h3>
      ${cardsList(s)}`;
  }

  // Is there anything left to find right now? (Keeps kids from wasting a search.)
  function roomHasMore(s, roomId) {
    const ending = R().ending;
    return C().clues.some((x) => x.room === roomId && (x.unlock || 1) <= S.room.round && E.pick(x.text, ending) != null && !s.clues.has(x.id));
  }
  function personHasMore(s, who) {
    const ending = R().ending;
    return (C().statements[who] || []).some((x) => (x.unlock || 1) <= S.room.round && E.pick(x.text, ending) != null && !s.heard.has(x.id));
  }

  function cardsList(s, big) {
    const c = C();
    const own = [...s.cards];
    const learned = [...s.known].filter((k) => !s.cards.has(k));
    if (!own.length && !learned.length) return '<p class="muted small">No Case Cards.</p>';
    return `<div class="cards ${big ? 'big' : ''}">${own.map((k) => `<span class="ccard" ${big ? '' : `data-act="share" data-card="${k}"`}>🗂️ ${esc(E.cardName(c, k))}</span>`).join('')}
      ${learned.map((k) => `<span class="ccard seen" title="Shown to you">👁️ ${esc(E.cardName(c, k))}</span>`).join('')}</div>
      ${big ? '' : '<p class="muted small">All of these are NOT the answer. Tap one of your own cards to share it.</p>'}`;
  }

  // ---- Notebook tab ----
  function phoneNotes() {
    const r = R();
    const s = r.state[myActor()];
    const f = S.filter;
    const match = (it) => f === 'all' || (f === 'clues' && (it.t === 'clue' || (it.t === 'shared' && it.clue))) || (f === 'talk' && it.t === 'stmt') || (f === 'cards' && ['theory', 'showed', 'shared', 'gave'].includes(it.t) && !(it.t === 'shared' && it.clue));
    const items = s.items.filter((it) => !['empty', 'silent', 'objection'].includes(it.t)).filter(match);
    const byRoom = f === 'clues';
    let list;
    if (byRoom) {
      list = C().rooms.map((rm) => {
        const xs = items.filter((it) => E.clue(C(), it.id || it.clue).room === rm.id);
        return xs.length ? `<h3 class="sec">${rm.emoji} ${esc(rm.name)}</h3>` + xs.map((it) => itemCard(it, { actions: true })).join('') : '';
      }).join('');
    } else if (f === 'talk') {
      list = C().suspects.concat(C().witnesses).map((p) => {
        const xs = items.filter((it) => it.who === p.id);
        return xs.length ? `<h3 class="sec">${p.emoji} ${esc(p.short)}</h3>` + xs.map((it) => itemCard(it, { actions: true })).join('') : '';
      }).join('');
    } else list = items.slice().reverse().map((it) => itemCard(it, { actions: true })).join('');
    const notes = lsGet('mm_notes_' + S.code + '_' + (S.room.game || 1), '');
    return `
      <div class="chips">${[['all', 'Everything'], ['clues', '🔍 Clues'], ['talk', '🗣️ Statements'], ['cards', '🗂️ Cards']].map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="filter" data-v="${k}">${l}</button>`).join('')}</div>
      ${list || '<p class="muted center">Nothing here yet. Go investigate!</p>'}
      ${f === 'cards' ? `<h3 class="sec">🗂️ Your Case Cards</h3>${cardsList(s)}` : ''}
      <h3 class="sec">✍️ My notes</h3>
      <textarea id="mynotes" class="notes" placeholder="Timeline ideas, hunches, who's lying…">${esc(notes)}</textarea>
      <p class="muted small">Notes stay on this device.</p>`;
  }

  // ---- Grid tab ----
  const MARKS = ['', '✖', '❓', '⭐'];
  function gridKey() { return 'mm_grid_' + S.code + '_' + (S.room.game || 1); }
  function phoneGrid() {
    const c = C();
    const s = R().state[myActor()];
    const marks = lsGet(gridKey(), {}) || {};
    const showKnown = S.room.difficulty !== 'hard';
    return `<p class="muted small">Tap to mark: ✖ not it · ❓ maybe · ⭐ I think so.${showKnown ? ' 🗂️ = you know from a Case Card that it’s NOT the answer.' : ''}</p>
      ${E.CATS.map((cat) => `<h3 class="sec">${E.CAT_LABEL[cat]}?</h3><div class="glist">${c[E.CAT_LIST[cat]].map((x) => {
        const k = cat + ':' + x.id;
        const m = marks[k] || (S.room.difficulty === 'easy' && s.known.has(k) ? '✖' : '');
        return `<button class="gitem m${MARKS.indexOf(m)}" data-act="mark" data-v="${k}"><span class="ge">${x.emoji}</span><span class="gn">${esc(x.short || x.name)}</span>${showKnown && s.known.has(k) ? '<span class="gk">🗂️</span>' : ''}<span class="gm">${m}</span></button>`;
      }).join('')}</div>`).join('')}
      <button class="btn ghost small" data-act="cleargrid">Clear my marks</button>`;
  }

  // ---- Accuse tab ----
  function phoneAccuse() {
    const c = C();
    const r = R();
    const room = S.room;
    const s = r.state[myActor()];
    if (s.accuse) {
      const acc = s.accuse;
      return `<div class="card center"><h2>🔒 Accusation locked</h2>
        <div class="accface">${face(acc.suspect)}</div>
        <p><b>${esc(E.person(c, acc.suspect).name)}</b><br>${['method', 'room', 'motive'].map((k) => esc(E.cardName(c, k + ':' + acc[k]))).join('<br>')}</p>
        <p class="muted small">${acc.by && S.players[acc.by] ? 'Locked in by ' + esc(S.players[acc.by].name) + '. ' : ''}Wait for midnight to find out if you’re right!</p></div>`;
    }
    const d = S.accuseDraft;
    const N = E.totalRounds(room);
    const bonus = room.phase === 'play' ? E.POINTS.earlyPerRound * Math.max(0, N - room.round) : 0;
    const complete = E.CATS.every((k) => d[k]);
    return `
      ${room.phase === 'accuse' ? '<div class="banner gold">🕛 Midnight! Lock in your final accusation.</div>' : `<p class="muted small">You get ONE accusation${room.mode === 'team' ? ' per team' : ''}. Lock it in early for a bonus${bonus ? ` (<b>+${bonus}</b> right now)` : ''}, but only if you get <b>Who</b> right. You can keep investigating after.</p>`}
      ${E.CATS.map((cat) => `<h3 class="sec">${E.CAT_LABEL[cat]}? <span class="left">${E.POINTS[cat]} pts</span></h3>
        <div class="glist pick">${c[E.CAT_LIST[cat]].map((x) => `<button class="gitem ${d[cat] === x.id ? 'sel' : ''}" data-act="apick" data-k="${cat}" data-v="${x.id}"><span class="ge">${x.emoji}</span><span class="gn">${esc(x.short || x.name)}</span></button>`).join('')}</div>`).join('')}
      <button class="btn red big wide" data-act="accuse" ${complete ? '' : 'disabled'}>⚖️ Lock in my accusation</button>`;
  }

  function phoneReveal() {
    const r = R();
    const a = myActor();
    const step = S.room.reveal_step || 0;
    if (step < 2) return '<div class="card center watch"><div class="tvicon">📺</div><h2>Look at the TV!</h2><p class="muted">The truth is about to come out…</p></div>';
    const sc = E.score(C(), r, a);
    const rk = E.rank(sc.total);
    const sol = E.solution(C(), r.ending);
    const line = (k, label) => `<tr><td>${label}</td><td>${sc.accused ? (sc.parts[k] ? '✅' : '❌') : '–'}</td><td>${E.cardName(C(), k + ':' + sol[k])}</td><td>${sc.parts[k] || 0}</td></tr>`;
    return `<div class="card center"><div class="tvicon">${rk.emoji}</div><h2>${sc.total} points</h2><p><b>${rk.title}</b></p>
      <table class="mini"><tbody>${line('suspect', 'Who')}${line('method', 'How')}${line('room', 'Where')}${line('motive', 'Why')}
      <tr><td>Early bonus</td><td></td><td></td><td>${sc.early}</td></tr><tr><td>Objections</td><td></td><td></td><td>${sc.objections}</td></tr></tbody></table>
      <p class="muted small">Look at the TV for the full scoreboard.</p></div>`;
  }

  // ---------- modals ----------
  function theoryModal() {
    const c = C();
    const d = S.draft.theory || (S.draft.theory = {});
    const ok = E.CATS.every((k) => d[k]);
    openModal(`<h2>💭 Test a theory</h2>
      <p class="muted small">If another detective holds one of these as a Case Card, they’ll secretly show you one.</p>
      ${E.CATS.map((cat) => `<h3 class="sec">${E.CAT_LABEL[cat]}?</h3><div class="glist pick">${c[E.CAT_LIST[cat]].map((x) => `<button class="gitem ${d[cat] === x.id ? 'sel' : ''}" data-act="tpick" data-k="${cat}" data-v="${x.id}"><span class="ge">${x.emoji}</span><span class="gn">${esc(x.short || x.name)}</span></button>`).join('')}</div>`).join('')}
      <div class="mbtns"><button class="btn ghost" data-act="close">Cancel</button><button class="btn gold" data-act="sendtheory" ${ok ? '' : 'disabled'}>Test it</button></div>`);
  }
  function objectModal(stmt) {
    const c = C();
    const r = R();
    const s = r.state[myActor()];
    const st = E.statementById(c, stmt);
    const per = E.person(c, st.who);
    const clues = [...s.clues];
    S.draft.object = { stmt, clue: null };
    openModal(`<h2>⚡ Objection!</h2>
      <p>${per.emoji} <b>${esc(per.short)}</b> said: <i>“${esc(E.pick(st.text, r.ending))}”</i></p>
      <p class="muted small">Pick the clue that PROVES this is a lie. Right: +${E.POINTS.objection} points and the truth comes out.${E.WRONG_OBJECTION[S.room.difficulty] ? ' Wrong: ' + E.WRONG_OBJECTION[S.room.difficulty] + ' points.' : ''} You only get one try per statement.</p>
      <div class="evlist">${clues.length ? clues.map((id) => { const cl = E.clue(c, id); const rm = E.item(c, 'room', cl.room); return `<button class="ev" data-act="evpick" data-v="${id}"><b>${rm.emoji} ${esc(E.pick(cl.title, r.ending))}</b><span>${esc(E.pick(cl.text, r.ending))}</span></button>`; }).join('') : '<p class="muted">You haven’t found any clues yet.</p>'}</div>
      <div class="mbtns"><button class="btn ghost" data-act="close">Cancel</button><button class="btn red" data-act="sendobject" disabled>⚡ Object!</button></div>`);
  }
  function shareModal(what) {
    const r = R();
    const mine = myActor();
    const others = r.actors.filter((x) => x !== mine);
    const label = what.clue ? '“' + esc(E.pick(E.clue(C(), what.clue).title, r.ending)) + '”' : esc(E.cardName(C(), what.card));
    S.draft.share = what;
    openModal(`<h2>📨 Share ${what.clue ? 'a clue' : 'a Case Card'}</h2><p>${label}</p>
      ${S.room.mode === 'team' ? '<p class="muted small">Your teammates already see it. Share it with another team?</p>' : '<p class="muted small">Only the detective you pick will see it.</p>'}
      <div class="evlist">${others.map((o) => `<button class="ev" data-act="sendshare" data-v="${o}"><b>${esc(actorName(o))}</b></button>`).join('') || '<p class="muted">Nobody to share with.</p>'}</div>
      <div class="mbtns"><button class="btn ghost" data-act="close">Cancel</button></div>`);
  }
  function rulesModal() {
    openModal(`<h2>📜 How to play</h2>
      <p><b>The goal:</b> figure out <b>who</b> did it, <b>how</b>, <b>where</b>, and <b>why</b> before the snowplow arrives at midnight.</p>
      <p><b>Each round</b> (15 minutes of game time), your ${'team or you'} can:</p>
      <ul><li>🔍 <b>Search</b> rooms. Each search finds the next clue in that room. Some clues only appear in later rounds.</li>
      <li>🗣️ <b>Question</b> suspects and Pembrook the butler. Some of them lie!</li>
      <li>💭 <b>Test a theory.</b> The next detective holding one of your guesses as a Case Card must secretly show it to you.</li></ul>
      <p>⚡ <b>Objection!</b> When a clue proves a statement is a lie, open the statement in your Notebook and object with that clue. +15 points, and the suspect has to tell the truth.</p>
      <p>🗂️ <b>Case Cards</b> are things that are definitely NOT the answer. Not every card is dealt, so if nobody can disprove your theory, that doesn’t prove it’s right!</p>
      <p>⚖️ <b>Accuse</b> once. Who = 40, How = 20, Where = 20, Why = 20. Lock it in early for a bonus if you get Who right.</p>
      <p>🧠 <b>Tip:</b> the obvious answer is usually a trap. Check the times very carefully.</p>
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
        await store.createRoom({ code, host_key: session.deviceKey, case_id: 'marrowby', mode: 'team', difficulty: 'normal', teams: 2, ending: 'random' });
        delete session.players[code];
        saveSession();
        await openRoom(code);
        S.view = 'game';
        keepAwake();
        render();
        return;
      } catch (e) {
        if (!/duplicate/i.test(e.message)) { toast('⚠️ ' + friendlyError(e), 'bad', 7000); return; }
      }
    }
  }
  async function join(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) { toast('Type the 4-letter code from the TV.'); return; }
    try {
      await openRoom(code);
      S.view = S.me || isHost() ? 'game' : 'join';
      if (isHost() && !S.me) keepAwake();
      render();
    } catch (e) { toast('⚠️ ' + friendlyError(e), 'bad', 6000); }
  }
  async function share() {
    const u = joinUrl();
    u.searchParams.set('join', S.code);
    const text = 'Join our murder mystery at Marrowby Manor! Code ' + S.code;
    try {
      if (navigator.share) { await navigator.share({ title: 'Marrowby Manor', text, url: u.toString() }); return; }
    } catch (e) { return; }
    try { await navigator.clipboard.writeText(u.toString()); toast('Link copied!'); } catch (e) { toast(esc(u.toString())); }
  }
  async function startGame() {
    const room = S.room;
    const actors = E.actorsFor(room, S.players);
    if (actors.length < 2) return;
    const seed = Math.floor(Math.random() * 2147483647);
    await patchRoom({ phase: 'intro', actors, seed, round: 0, reveal_step: 0 });
    S.seenEvents = null;
  }

  document.addEventListener('input', (e) => {
    if (e.target.id === 'pname') S.draft.profile.name = e.target.value;
    if (e.target.id === 'mynotes') lsSet('mm_notes_' + S.code + '_' + (S.room.game || 1), e.target.value);
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'autoread') { session.autoRead = e.target.checked; saveSession(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'code') join(e.target.value);
    if (e.key === 'Enter' && e.target.id === 'bcode') document.querySelector('[data-act=reboard]').click();
  });
  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (d.tagName === 'DETAILS' && d.dataset.k) { if (d.open) S.open.add(d.dataset.k); else S.open.delete(d.dataset.k); }
  }, true);
  $modal.addEventListener('click', (e) => { if (e.target === $modal) closeModal(); });

  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const cmd = el.dataset.act;
    const v = el.dataset.v;
    if (cmd !== 'rules' && el.tagName === 'A') e.preventDefault();
    switch (cmd) {
      // home / join
      case 'join': join(document.getElementById('code').value); break;
      case 'rejoin': join(session.lastCode); break;
      case 'host': hostNew(); break;
      case 'reboard': {
        const code = document.getElementById('bcode').value.toUpperCase().trim();
        try {
          await openRoom(code);
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
      case 'rules': e.preventDefault(); rulesModal(); break;
      case 'howto': rulesModal(); break;
      case 'close': closeModal(); break;
      case 'avatar': S.draft.profile.avatar = v; renderJoin(); break;
      case 'pickteam': S.draft.profile.team = +v; renderJoin(); break;
      case 'saveprofile': {
        const d = S.draft.profile;
        const name = (document.getElementById('pname').value || '').trim().slice(0, 20);
        if (!name) { toast('Type your name first.'); return; }
        const room = S.room;
        let team = d.team;
        if (room.mode === 'team' && !team) {
          // fill the smallest team
          const counts = E.TEAMS.slice(0, room.teams).map((t) => ({ n: t.n, c: Object.values(S.players).filter((p) => (p.team || 1) === t.n).length }));
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
      case 'reclaim': S.me = v; session.players[S.code] = v; saveSession(); S.view = 'game'; S.seenItems = null; render(); break;
      case 'back': S.draft.profile = null; S.view = 'game'; render(); break;
      case 'profile': S.draft.profile = null; S.view = 'join'; render(); break;
      case 'jointeam': await store.updatePlayer(S.me, { team: +v }); S.players[S.me].team = +v; S.seenItems = null; render(); break;

      // board
      case 'share': if (el.dataset.clue || el.dataset.card) shareModal({ clue: el.dataset.clue, card: el.dataset.card }); else share(); break;
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
      case 'cycleteam': {
        const p = S.players[v];
        const next = ((p.team || 1) % S.room.teams) + 1;
        await store.updatePlayer(v, { team: next });
        p.team = next;
        render();
        break;
      }
      case 'kickask':
        if (confirm('Remove ' + S.players[v].name + ' from the game?')) { await store.removePlayer(v); delete S.players[v]; render(); }
        break;
      case 'shuffle': {
        const ps = Object.values(S.players).sort(() => Math.random() - 0.5);
        await Promise.all(ps.map((p, i) => store.updatePlayer(p.id, { team: (i % S.room.teams) + 1 })));
        await refresh();
        break;
      }
      case 'savevids': {
        const vids = {};
        document.querySelectorAll('input.vid').forEach((inp) => { if (inp.value.trim()) vids[inp.dataset.k] = inp.value.trim(); });
        const bad = Object.entries(vids).filter(([, u]) => !ytId(u));
        lsSet('mm_videos', vids);
        toast(bad.length ? '⚠️ ' + bad.length + ' link(s) don’t look like YouTube links.' : '🎬 Saved!', bad.length ? 'bad' : 'good');
        render();
        break;
      }
      case 'start': await startGame(); break;
      case 'readintro': speak(C().intro.join(' ')); break;
      case 'begin': await patchRoom({ phase: 'play', round: 1 }); break;
      case 'readdev': speak(E.clock(S.room, S.room.round) + '. ' + E.development(C(), S.room, S.room.round)); break;
      case 'next':
        if (S.room.round >= E.totalRounds(S.room) || allDone() || confirm('Not everyone is done. Start the next round anyway?')) nextRound();
        break;
      case 'nocount': S.countdown = null; S.countdownOff = true; render(); break;
      case 'reveal': await patchRoom({ phase: 'reveal', reveal_step: 0 }); break;
      case 'revstep': await patchRoom({ reveal_step: +v }); break;
      case 'readreveal': speak(C().reveal[R().ending].join(' ')); break;
      case 'again':
        if (confirm('Start a new game with the same players? (The ending will be different… or will it?)')) {
          await patchRoom({ phase: 'lobby', game: (S.room.game || 1) + 1, round: 0, actors: [], reveal_step: 0, seed: 0 });
          S.seenEvents = null;
        }
        break;

      // phone
      case 'tab': S.tab = v; render(); window.scrollTo(0, 0); break;
      case 'filter': S.filter = v; render(); break;
      case 'search': buzz(); await act('search', { room: v }); break;
      case 'question': buzz(); await act('question', { who: v }); break;
      case 'theory': theoryModal(); break;
      case 'tpick': {
        S.draft.theory[el.dataset.k] = v;
        el.parentNode.querySelectorAll('.gitem').forEach((b) => b.classList.toggle('sel', b === el));
        document.querySelector('[data-act=sendtheory]').disabled = !E.CATS.every((k) => S.draft.theory[k]);
        break;
      }
      case 'sendtheory': {
        const d = S.draft.theory;
        closeModal();
        if (await act('theory', { suspect: d.suspect, method: d.method, room: d.room, motive: d.motive })) S.draft.theory = {};
        break;
      }
      case 'object': objectModal(el.dataset.stmt); break;
      case 'evpick': {
        S.draft.object.clue = v;
        document.querySelectorAll('.ev').forEach((b) => b.classList.toggle('sel', b.dataset.v === v));
        document.querySelector('[data-act=sendobject]').disabled = false;
        break;
      }
      case 'sendobject': {
        const d = S.draft.object;
        closeModal();
        if (await act('object', { stmt: d.stmt, clue: d.clue })) {
          const s = R().state[myActor()];
          const ok = s.objected[d.stmt] === 'ok';
          buzz(ok ? [60, 40, 60] : 200);
          toast(ok ? '⚡ <b>OBJECTION!</b> It held up! +' + E.POINTS.objection : '✗ That didn’t prove it…', ok ? 'good' : 'bad', 4500);
          S.tab = 'notes';
          S.filter = 'talk';
          render();
        }
        break;
      }
      case 'sendshare': {
        const d = S.draft.share;
        closeModal();
        if (await act('share', Object.assign({ to: v }, d.clue ? { clue: d.clue } : { card: d.card }))) toast('📨 Shared with ' + esc(actorName(v)) + '.', 'good');
        break;
      }
      case 'mark': {
        const marks = lsGet(gridKey(), {}) || {};
        const s = R().state[myActor()];
        const cur = marks[v] || (S.room.difficulty === 'easy' && s.known.has(v) ? '✖' : '');
        marks[v] = MARKS[(MARKS.indexOf(cur) + 1) % MARKS.length];
        lsSet(gridKey(), marks);
        render();
        break;
      }
      case 'cleargrid': if (confirm('Clear all your marks?')) { lsSet(gridKey(), {}); render(); } break;
      case 'apick': S.accuseDraft[el.dataset.k] = v; render(); break;
      case 'accuse': {
        const d = S.accuseDraft;
        const who = E.person(C(), d.suspect);
        if (!confirm('Accuse ' + who.name + '?\n\nYou can only do this ONCE' + (S.room.mode === 'team' ? ' for your whole team' : '') + '.')) return;
        await act('accuse', { suspect: d.suspect, method: d.method, room: d.room, motive: d.motive, atRound: S.room.phase === 'play' ? S.room.round : E.totalRounds(S.room) });
        break;
      }
      default: break;
    }
  });

  // ---------- start ----------
  (async function start() {
    const code = (params.get('join') || '').toUpperCase();
    if (code) {
      try {
        await openRoom(code);
        S.view = S.me || isHost() ? 'game' : 'join';
        if (isHost() && !S.me) keepAwake();
      } catch (e) { S.view = 'home'; toast('⚠️ ' + friendlyError(e), 'bad', 6000); }
    }
    render();
  })();
})();
