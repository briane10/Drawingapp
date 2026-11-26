/* Play Caller: main app. */
(function () {
  'use strict';

  const { POINTS, LABELS, scorePick, leaderboard } = window.Scoring;
  const AVATARS = ['🏈', '🦅', '🐻', '🦁', '🐯', '🐬', '🐴', '🦬', '🐏', '🦈', '🐆', '🐺', '🦊', '🐸', '🐐', '🤠', '👑', '🔥', '⚡', '💪', '🧢', '🍕', '🌮', '🦃'];
  const $app = document.getElementById('app');
  const $modal = document.getElementById('modal');
  const $toasts = document.getElementById('toasts');

  // ---------- config + session ----------
  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }

  const params = new URLSearchParams(location.search);
  // A shared invite link can carry the Supabase settings when they weren't put in config.js.
  if (params.get('sbu') && params.get('sbk')) lsSet('pc_cfg', { supabaseUrl: params.get('sbu'), supabaseKey: params.get('sbk') });
  const fileCfg = window.PLAYCALL_CONFIG || {};
  const cfg = fileCfg.supabaseUrl && fileCfg.supabaseKey ? fileCfg : lsGet('pc_cfg', {}) || {};
  const cfgFromFile = !!(fileCfg.supabaseUrl && fileCfg.supabaseKey);
  const store = window.Store.create(cfg);

  const field = window.Field.create();
  const wideMQ = window.matchMedia('(min-width: 820px)');
  if (wideMQ.addEventListener) wideMQ.addEventListener('change', () => scheduleRender());
  const S = {
    view: 'home',
    code: null,
    me: null, // player id
    room: null,
    players: {},
    picks: {},
    results: {},
    draft: {}, // my in-progress pick per round, for instant feedback
    rzDraft: {},
    rzSel: {},
    earlyNext: null,
    resultSeenAt: {},
    squares: {},
    rzEdit: null,
    games: null,
    gamesLeague: 'nfl',
    gamesDay: 0,
    feed: { ok: null, at: 0, msg: '' },
    online: 'connecting',
    seenResults: new Set(),
    unsub: null,
  };
  // ?as=2 lets a second person play from the same browser (each "as" gets its own player).
  const SESSION_KEY = 'pc_session' + (params.get('as') ? '_' + params.get('as').replace(/\W/g, '').slice(0, 8) : '');
  const session = lsGet(SESSION_KEY, {}) || {};
  function saveSession() { lsSet(SESSION_KEY, session); }
  if (!session.deviceKey) { session.deviceKey = Math.random().toString(36).slice(2) + Date.now().toString(36); saveSession(); }

  const isHost = () => !!(S.room && S.room.host_key && S.room.host_key === session.deviceKey);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- toasts ----------
  function toast(html, kind, ms) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.innerHTML = html;
    $toasts.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, ms || 3500);
  }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 25); } catch (e) { /* ignore */ } }

  // ---------- local cache ----------
  const pickKey = (r) => [r.player, r.kind, r.round].join('|');
  const resKey = (r) => r.kind + '|' + r.round;
  function applyAll(data) {
    S.room = data.room;
    S.players = {};
    data.players.forEach((p) => { S.players[p.id] = p; });
    S.picks = {};
    data.picks.forEach((p) => { S.picks[pickKey(p)] = p; });
    S.results = {};
    data.results.forEach((r) => { S.results[resKey(r)] = r; S.seenResults.add(resKey(r) + JSON.stringify([r.play_type, r.dir, r.dist, r.drive, r.void])); });
    S.squares = {};
    (data.squares || []).forEach((q) => { S.squares[q.idx] = q; });
    S.sqWinsSeen = ((data.room && data.room.sq_wins) || []).length;
  }
  function applyChange(ev) {
    const { table, type, row, old } = ev;
    if (table === 'pc_rooms') {
      if (row) S.room = Object.assign({}, S.room || {}, row);
    } else if (table === 'pc_players') {
      if (type === 'DELETE') {
        const id = (old && old.id) || (row && row.id);
        delete S.players[id];
        Object.keys(S.picks).forEach((k) => { if (S.picks[k].player === id) delete S.picks[k]; });
        if (id === S.me) { S.me = null; delete session.players[S.code]; saveSession(); toast('You were removed from this game.'); }
      } else if (row) S.players[row.id] = row;
    } else if (table === 'pc_picks') {
      if (type === 'DELETE') { if (old) delete S.picks[pickKey(old)]; } else if (row) S.picks[pickKey(row)] = row;
    } else if (table === 'pc_results') {
      if (row) { if (!S.results[resKey(row)]) S.resultSeenAt[resKey(row)] = Date.now(); S.results[resKey(row)] = row; announceResult(row); }
    } else if (table === 'pc_squares') {
      if (type === 'DELETE') { if (old && S.squares[old.idx] && (!old.player || S.squares[old.idx].player === old.player)) delete S.squares[old.idx]; } else if (row) S.squares[row.idx] = row;
    }
    if (table === 'pc_rooms') announceSquares();
    scheduleRender();
  }
  let renderTimer = null;
  function scheduleRender() {
    // Only the game screen shows live data; redrawing the other screens would wipe what someone is typing.
    if (renderTimer || S.view !== 'game') return;
    renderTimer = requestAnimationFrame(() => { renderTimer = null; render(); });
  }

  function announceResult(r) {
    const sig = resKey(r) + JSON.stringify([r.play_type, r.dir, r.dist, r.drive, r.void]);
    if (S.seenResults.has(sig)) return;
    S.seenResults.add(sig);
    if (!S.me) return;
    const pk = S.picks[[S.me, r.kind, r.round].join('|')];
    if (r.void) {
      if (S.view === 'game' && r.kind === 'play') field.play(r);
      if (pk) toast('Play #' + r.round + ' doesn’t count: no points either way.', 'muted');
      return;
    }
    const s = scorePick(pk, r);
    const what = r.kind === 'drive' ? '🚨 Drive: ' + LABELS[r.drive] : resultLine(r);
    if (S.view === 'game') field.play(r);
    if (!pk) toast(esc(what) + '<br><small>You didn’t make a call.</small>', 'muted');
    else if (s.total > 0) { toast('<b>+' + s.total + '</b> ' + esc(what), 'good', 4500); buzz(40); }
    else toast('0 pts · ' + esc(what), 'bad');
  }

  // ---------- connect to a room ----------
  async function openRoom(code) {
    if (S.unsub) { S.unsub(); S.unsub = null; }
    S.code = code;
    const data = await store.loadAll(code);
    if (!data.room) throw new Error('No game with code ' + code);
    applyAll(data);
    session.players = session.players || {};
    S.me = session.players[code] && S.players[session.players[code]] ? session.players[code] : null;
    session.lastCode = code;
    saveSession();
    S.unsub = store.subscribe(code, applyChange, (st) => {
      S.online = st === 'SUBSCRIBED' ? 'live' : st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED' ? 'offline' : 'connecting';
      if (st === 'SUBSCRIBED') refresh();
      scheduleRender();
    });
    const url = new URL(location.href);
    url.searchParams.set('join', code);
    ['sbu', 'sbk'].forEach((k) => url.searchParams.delete(k));
    history.replaceState(null, '', url);
  }
  async function refresh() {
    if (!S.code) return;
    try { applyAll(await store.loadAll(S.code)); scheduleRender(); } catch (e) { /* try again later */ }
  }
  setInterval(() => { if (S.code && !document.hidden) refresh(); }, 45000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && S.code) { refresh(); if (isHost()) { keepAwake(); hostTick(true); } }
  });

  // ---------- host engine ----------
  let hostQueue = Promise.resolve();
  function hostDo(fn) {
    hostQueue = hostQueue.then(fn).catch((e) => { console.error(e); toast('⚠️ ' + esc(e.message), 'bad'); });
    return hostQueue;
  }
  async function patchRoom(patch) {
    const row = await store.updateRoom(S.code, patch);
    if (row) S.room = Object.assign({}, S.room, row);
    scheduleRender();
  }

  let lastScoreboard = 0;
  let lastEv = null;
  let lastEvId = null;
  let lastSummary = 0;
  let ticking = false;
  async function hostTick(force) {
    if (!isHost() || !S.room || ticking) return;
    const room = S.room;
    if (!room.event_id || !room.auto) return;
    const now = Date.now();
    const st = room.status || {};
    const live = st.state === 'in' || room.pending.length || room.rz_phase !== 'none';
    const every = live ? 5000 : 30000;
    if (!force && now - lastSummary < every) return;
    ticking = true;
    lastSummary = now;
    try {
      let ev = null;
      if (force || now - lastScoreboard > (live ? 5000 : 30000)) {
        lastScoreboard = now;
        ev = await ESPN.getScoreboardEvent(room.league, room.event_id);
        if (ev) { lastEv = ev; lastEvId = room.event_id; }
      }
      if (!ev && lastEvId === room.event_id) ev = lastEv;
      const summary = await ESPN.getSummary(room.league, room.event_id);
      const feed = ESPN.readFeed(summary, ev, room.league);
      S.feed = { ok: true, at: Date.now(), msg: '' };
      await hostDo(async () => {
        const r = S.room;
        if (r.event_id !== room.event_id) return;
        const out = ESPN.engineStep(r, feed, Date.now());
        const patch = out.patch;
        if (feed.status) {
          const prev = JSON.stringify(r.status || {});
          const next = JSON.stringify(feed.status);
          if (prev !== next) patch.status = feed.status;
        }
        if (out.results.length) {
          await store.upsertResults(out.results.map((x) => ({
            room: S.code, kind: x.kind, round: x.round, void: !!x.void, play_type: x.play_type || null, dir: x.dir || null,
            dist: x.dist || null, yards: x.yards == null ? null : x.yards, drive: x.drive || null, text: (x.text || '').slice(0, 600), source: 'auto', anim: x.anim || null,
          })));
        }
        if (r.sq_cols && r.sq_rows && feed.status) {
          const owners = {};
          Object.values(S.squares).forEach((q) => { owners[q.idx] = q.player; });
          const wins = Squares.newWins(r, feed.status, owners);
          if (wins.length) patch.sq_wins = (r.sq_wins || []).concat(wins);
        }
        if (Object.keys(patch).length) await patchRoom(patch);
      });
    } catch (e) {
      S.feed = { ok: false, at: S.feed.at, msg: e.message };
    } finally {
      ticking = false;
      scheduleRender();
    }
  }
  setInterval(() => { if (!document.hidden) hostTick(false); }, 1000);

  // ---------- every device keeps its own scoreboard fresh ----------
  // Scoring still comes from the host, but the score, clock, down, ball spot and recent plays are read
  // straight from ESPN on each phone, so the board stays live even if the host's phone falls asleep.
  let cSb = 0;
  let cSum = 0;
  let cBusy = false;
  let cSummary = null;
  let cSummaryId = null;
  let cEv = null;
  async function clientTick() {
    const room = S.room;
    if (!room || !room.event_id || S.view !== 'game' || document.hidden || cBusy || isHost()) return;
    const now = Date.now();
    const live = !room.status || room.status.state !== 'post';
    if (now - cSb < (live ? 5000 : 60000)) return;
    cBusy = true;
    cSb = now;
    try {
      const ev = await ESPN.getScoreboardEvent(room.league, room.event_id);
      if (ev) cEv = ev;
      if (cSummaryId !== room.event_id || now - cSum > 20000) {
        cSum = now;
        cSummary = await ESPN.getSummary(room.league, room.event_id);
        cSummaryId = room.event_id;
      }
      if (cEv && String(cEv.id) === String(room.event_id)) {
        const feed = ESPN.readFeed(cSummaryId === room.event_id ? cSummary : {}, cEv, room.league);
        const prev = S.local && JSON.stringify(S.local.status);
        S.local = { eventId: room.event_id, status: feed.status, at: Date.now() };
        if (prev !== JSON.stringify(feed.status)) scheduleRender();
      }
    } catch (e) { /* keep showing what we have */ } finally { cBusy = false; }
  }
  setInterval(clientTick, 1000);
  function liveStatus() {
    const r = S.room;
    if (!r) return null;
    if (S.local && S.local.eventId === r.event_id && Date.now() - S.local.at < 30000 && S.local.status) return S.local.status;
    return r.status;
  }
  // ---------- TV sync: hold the scoreboard back to match this TV ----------
  const statusLog = []; // [{ at, st, key }]
  S.firstSeen = {};
  function noteStatus() {
    const st = liveStatus();
    if (!st) return;
    const key = JSON.stringify(st);
    const last = statusLog[statusLog.length - 1];
    if (last && last.key === key) return;
    const now = Date.now();
    statusLog.push({ at: now, st, key });
    const lp = st.recent && st.recent[0] ? st.recent[0].text : st.lastPlay;
    if (lp && !S.firstSeen[lp]) S.firstSeen[lp] = now;
    while (statusLog.length > 2 && statusLog[1].at < now - 6 * 60e3) statusLog.shift();
  }
  function tvDelayMs() { return Math.max(0, (session.tvDelay || 0) * 1000); }
  /** What this screen shows: the live status, or the one from tvDelay seconds ago. */
  function shownStatus() {
    noteStatus();
    const d = tvDelayMs();
    if (!d || !statusLog.length) return liveStatus();
    const cutoff = Date.now() - d;
    let pick = null;
    for (const e of statusLog) { if (e.at <= cutoff) pick = e; else break; }
    return (pick || statusLog[0]).st;
  }
  let shownKey = '';
  setInterval(() => {
    if (S.view !== 'game' || !S.room) return;
    const st = shownStatus();
    const k = st ? JSON.stringify(st) : '';
    if (k !== shownKey) { shownKey = k; scheduleRender(); }
  }, 1000);
  function showTvSync() {
    const st = liveStatus();
    const lp = st ? (st.recent && st.recent[0] ? st.recent[0].text : st.lastPlay) : '';
    const shown = shownStatus();
    const shownLp = shown ? (shown.recent && shown.recent[0] ? shown.recent[0].text : shown.lastPlay) : '';
    const d = session.tvDelay || 0;
    openModal(`<h2>📺 Sync with my TV</h2>
      <p class="small">If the app shows plays before your TV does, hold it back so nothing gets spoiled. This only changes <b>this device</b>.</p>
      <div class="tvsync-now">Holding back: <b>${d ? d + ' seconds' : 'nothing (live)'}</b></div>
      ${lp ? `<p class="small muted">Newest play from ESPN:</p><p class="tvsync-play">${esc(lp)}</p>
      <button class="btn primary big" data-act="tvsyncnow">✅ That play just happened on my TV</button>
      <p class="small muted">Wait for it on TV, then tap. The app measures the gap for you.</p>` : '<p class="small muted">Waiting for the first play from ESPN…</p>'}
      <div class="row wrap gap"><button class="btn small" data-act="tvadj" data-v="-5">−5s</button><button class="btn small" data-act="tvadj" data-v="5">+5s</button>
        <button class="btn small" data-act="tvadj" data-v="15">+15s</button><button class="btn small ghost" data-act="tvadj" data-v="0">Reset to live</button></div>
      ${shownLp && shownLp !== lp ? `<p class="small muted">Showing now: ${esc(shownLp)}</p>` : ''}`);
  }

  function hostAway() {
    const r = S.room;
    if (!r || isHost() || !r.event_id || !r.auto || !r.host_key || !S.local || S.local.eventId !== r.event_id) return false;
    const mine = S.local.status;
    if (!mine || mine.state !== 'in' || !r.status) return false;
    const behind = mine.clock !== r.status.clock || mine.period !== r.status.period || mine.lastPlay !== r.status.lastPlay;
    return behind && Date.now() - Date.parse(r.updated_at || 0) > 90000;
  }

  let wake = null;
  async function keepAwake() {
    try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { /* not allowed yet */ }
  }

  let lastLockTap = 0;
  function lockNow() {
    if (!isHost()) return;
    const t = Date.now();
    if (t - lastLockTap < 4000) { toast('Already locked: one tap per snap.', 'muted', 1500); return; }
    lastLockTap = t;
    buzz(60);
    keepAwake();
    const flash = document.querySelector('.lockbar button');
    if (flash) { flash.classList.add('flash'); setTimeout(() => flash.classList.remove('flash'), 400); }
    return hostDo(async () => {
      const r = S.room;
      const entry = { r: r.round, t };
      const patch = {
        round: r.round + 1,
        pending: (r.pending || []).concat([entry]),
        lock_log: (r.lock_log || []).concat([entry]).slice(-25),
      };
      if (r.rz_phase === 'open') patch.rz_phase = 'locked';
      await patchRoom(patch);
      toast('🔒 Play #' + entry.r + ' locked', 'muted', 1500);
    });
  }

  // ---------- helpers for display ----------
  function resultLine(r) {
    if (!r) return '';
    if (r.void) return 'No play';
    if (r.kind === 'drive') return LABELS[r.drive] || '';
    const bits = [LABELS[r.play_type]];
    if (r.dir) bits.push(LABELS[r.dir].toLowerCase());
    if (r.yards != null) bits.push((r.yards >= 0 ? r.yards : r.yards) + ' yds');
    else if (r.dist) bits.push(LABELS[r.dist]);
    return bits.join(' · ');
  }
  function pickLine(p) {
    if (!p) return '—';
    if (p.kind === 'drive') return p.drive ? LABELS[p.drive] : '—';
    const bits = [];
    if (p.play_type) bits.push(LABELS[p.play_type]);
    if (p.dir) bits.push(LABELS[p.dir]);
    if (p.dist) bits.push(LABELS[p.dist]);
    return bits.join(' · ') || '—';
  }
  const myPick = (kind, round) => S.me ? S.picks[[S.me, kind, round].join('|')] : null;
  const playersList = () => Object.values(S.players).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

  // ---------- views ----------
  function render() {
    if (S.view === 'home') return renderHome();
    if (S.view === 'profile') return renderProfile();
    if (S.view === 'game') return renderGame();
  }

  function renderHome() {
    const last = session.lastCode;
    const preset = (params.get('join') || '').toUpperCase();
    $app.innerHTML = `
      <section class="hero">
        <img src="icons/icon.svg" alt="" class="hero-logo">
        <h1>Play Caller</h1>
        <p class="tag">Watch the game. Call the next play. Beat your friends.</p>
      </section>
      ${store.kind === 'local' ? `<div class="banner warn">🧪 <b>Test mode</b>: no database is connected, so games only work between tabs on this device.
        <button class="link" data-act="setup">Connect Supabase</button></div>` : ''}
      <section class="card">
        <h2>Join a game</h2>
        <form class="row" data-form="join">
          <input id="joinCode" maxlength="8" placeholder="Game code" autocomplete="off" autocapitalize="characters" value="${esc(preset || '')}" aria-label="Game code">
          <button class="btn primary">Join</button>
        </form>
        ${last && last !== preset ? `<button class="btn ghost small" data-act="rejoin">↩︎ Back to game ${esc(last)}</button>` : ''}
      </section>
      <section class="card">
        <h2>Host a game</h2>
        <p class="muted">Pick the NFL or college game you’re watching, share the code, and tap <b>LOCK</b> at each snap.
          Results come in automatically from the live ESPN feed.</p>
        <button class="btn big" data-act="host">🏈 Start a new game</button>
      </section>
      <section class="card how">
        <h2>How it works</h2>
        <ol>
          <li>Before each snap, call it: <b>Run</b> or <b>Pass</b>, which way (<b>left / middle / right</b>), and how far (<b>&lt;5, 5–9, 10+ yds</b>).</li>
          <li>The host taps <b>LOCK</b> when the ball is snapped. No changes after that!</li>
          <li>When the play shows up in the live feed, everybody gets points:
            <b>${POINTS.type}</b> for run/pass, <b>+${POINTS.dir}</b> for direction, <b>+${POINTS.dist}</b> for distance.</li>
          <li>🚨 In the red zone, also call how the drive ends: <b>TD, FG or nothing</b> for <b>${POINTS.drive}</b> points.</li>
        </ol>
      </section>
      <p class="foot">${store.kind === 'supabase' ? '☁️ Connected' : ''}</p>`;
    const input = document.getElementById('joinCode');
    if (preset && input) input.focus();
  }

  function renderProfile() {
    const me = S.me ? S.players[S.me] : null;
    const name = (me && me.name) || session.name || '';
    const av = (me && me.avatar) || session.avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)];
    S.pendingAvatar = S.pendingAvatar || av;
    $app.innerHTML = `
      <header class="top"><button class="btn ghost small" data-act="home">‹ Back</button><span>Game <b>${esc(S.code)}</b></span><span></span></header>
      <section class="card">
        <h2>${me ? 'Edit your player' : 'Who’s playing?'}</h2>
        <form data-form="profile" class="stack">
          <label>Your name<input id="pname" maxlength="20" value="${esc(name)}" placeholder="Nickname" autocomplete="nickname" required></label>
          <div class="label">Pick an avatar</div>
          <div class="avatars">${AVATARS.map((a) => `<button type="button" class="av ${a === S.pendingAvatar ? 'on' : ''}" data-act="avatar" data-v="${a}">${a}</button>`).join('')}</div>
          <button class="btn primary big">${me ? 'Save' : 'Join the game'}</button>
        </form>
        <p class="muted small">Everyone in this game can see your name, so a nickname is perfect.</p>
      </section>`;
  }

  function scorebug() {
    const st = shownStatus();
    if (!st) {
      return `<div class="bug empty">${S.room.event_id ? 'Loading the scoreboard…' : (isHost() ? '<button class="btn small" data-act="games">📺 Pick the game you’re watching</button>' : 'Waiting for the host to pick a game…')}</div>`;
    }
    const team = (t, side) => `<div class="tm ${st.poss === t.abbr ? 'poss' : ''}">
        ${t.logo ? `<img src="${esc(t.logo)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span class="ab">${esc(t.abbr)}</span><span class="sc">${esc(t.score)}</span>${st.poss === t.abbr ? '<span class="ball" title="Has the ball">🏈</span>' : ''}</div>`;
    const qtr = (n) => (n == null ? '' : n <= 4 ? ['1st', '2nd', '3rd', '4th'][n - 1] + ' QTR' : n === 5 ? 'OT' : n - 4 + 'OT');
    const live = st.state === 'in';
    const half = /half/i.test(st.detail || '');
    const center = live && !half && st.period
      ? `<div class="qtr">${esc(qtr(st.period))}</div><div class="clock">${esc(st.clock || '')}</div>`
      : `<div class="clock">${esc(st.detail || '')}</div>`;
    // Keep the last known down & distance on screen through timeouts and reviews.
    if (st.downShort) S.lastDD = { id: st.id, down: st.downShort, ballOn: st.ballOn };
    const keep = !st.downShort && live && S.lastDD && S.lastDD.id === st.id ? S.lastDD : null;
    const downTxt = st.downShort || (keep && keep.down);
    const spotTxt = st.downShort ? st.ballOn : keep ? keep.ballOn : st.ballOn;
    const dd = downTxt
      ? `<div class="ddrow"><span class="down">${esc(downTxt)}</span>${spotTxt ? `<span class="spot">Ball on <b>${esc(spotTxt)}</b></span>` : ''}${st.los != null && st.possHome != null && (st.possHome ? 100 - st.los : st.los) <= 20 && (st.possHome ? 100 - st.los : st.los) > 0 ? '<span class="rzpill">🚨 RED ZONE</span>' : ''}</div>`
      : live ? '<div class="ddrow"><span class="spot muted">Kickoff / change of possession</span></div>' : '';
    const qShort = (n) => (n == null ? '' : n <= 4 ? 'Q' + n : 'OT');
    const recent = (st.recent && st.recent.length ? st.recent : st.lastPlay ? [{ text: st.lastPlay }] : []).slice(0, 5);
    let ticker = '';
    if (recent.length) {
      const newest = recent[0].text;
      // Keep the scroll position steady across redraws by offsetting from when this text first appeared.
      if (S.tickerText !== newest) { S.tickerText = newest; S.tickerStart = Date.now(); }
      const len = Math.max(8, Math.round(newest.length / 6));
      const delay = -(((Date.now() - S.tickerStart) / 1000) % len);
      const open = !!session.recentOpen;
      ticker = `<button class="ticker" data-act="recent" aria-expanded="${open}" aria-label="Last play. Tap to ${open ? 'hide' : 'show'} the last ${recent.length} plays">
          <span class="tk-label">LAST PLAY</span>
          <span class="tk-viewport"><span class="tk-text" style="--len:${len}s;animation-delay:${delay.toFixed(2)}s">${esc(newest)}</span></span>
          <span class="tk-more">${open ? '▴' : '▾ ' + recent.length}</span></button>
        ${open ? `<div class="recent"><ol>${recent.map((p, i) => `
          <li class="${i === 0 ? 'newest' : ''}"><span class="rc-meta">${esc([qShort(p.q), p.clock].filter(Boolean).join(' '))}${p.dd ? `<small>${esc(p.dd)}</small>` : ''}</span><span class="rc-text">${esc(p.text)}</span></li>`).join('')}</ol></div>` : ''}`;
    }
    const yte = st.los != null && st.possHome != null ? (st.possHome ? 100 - st.los : st.los) : null;
    const inRz = !!downTxt && yte != null && yte > 0 && yte <= 20;
    const syncBtn = `<button class="tvsync-btn" data-act="tvsync" title="Match the app to your TV">📺 ${session.tvDelay ? '−' + session.tvDelay + 's' : 'TV sync'}</button>`;
    return `<div class="bug ${inRz ? 'rz' : ''}">${syncBtn}
        <div class="bugrow">${team(st.away, 'away')}<div class="mid">${center}</div>${team(st.home, 'home')}</div>
        ${dd}${ticker}
      </div>`;
  }

  /** Heading for the pick board: who has the ball, the down and yards to go (falls back to "Play #N"). */
  function situationHead(round) {
    const st = shownStatus();
    const live = st && st.state === 'in';
    const keep = st && !st.downShort && live && S.lastDD && S.lastDD.id === st.id ? S.lastDD : null;
    const down = st && (st.downShort || (keep && keep.down));
    const spot = st && (st.downShort ? st.ballOn : keep ? keep.ballOn : '');
    const team = st && st.poss ? (st.poss === st.home.abbr ? st.home : st.poss === st.away.abbr ? st.away : { abbr: st.poss }) : null;
    if (!live || !team || !down) return `<h2>Play #${round}</h2>`;
    return `<div class="sithead"><h2>${team.logo ? `<img src="${esc(team.logo)}" alt="" onerror="this.remove()">` : '🏈 '}${esc(team.abbr)} ball · <span class="sitdown">${esc(down)}</span></h2>
      <div class="small muted">${spot ? 'at ' + esc(spot) + ' · ' : ''}Play #${round}</div></div>`;
  }

  function pickBoard() {
    const r = S.room;
    if (r.status && r.status.state === 'post' && !(r.pending || []).length && r.rz_phase === 'none') {
      const rows = leaderboard(playersList(), Object.values(S.picks), Object.values(S.results), squareBonus());
      const w = rows[0];
      return `<section class="card board final"><h2>🏁 Final</h2>
        ${w ? `<p class="winner">${esc(w.player.avatar)} <b>${esc(w.player.name)}</b> wins with <b>${w.total}</b> points!</p>` : ''}
        ${isHost() ? '<p class="small muted">Watching another game? Tap <b>Change</b> in Host controls. Scores carry over.</p>' : ''}</section>`;
    }
    const round = r.round;
    // Between LOCK and the result: show the locked call and wait (unless this player chose to call the next one early).
    const pend = r.pending || [];
    const waiting = pend.length ? pend[pend.length - 1] : null;
    if (waiting && S.earlyNext !== round && !myPick('play', round)) {
      const pk = myPick('play', waiting.r);
      const older = pend.length > 1 ? `<p class="small muted">Also waiting on ${pend.length - 1} earlier play${pend.length > 2 ? 's' : ''}.</p>` : '';
      return `<section class="card board locked">
        <div class="board-head">${situationHead(waiting.r)}</div>
        <div class="locked-box"><div class="locked-title">🔒 Locked at the snap</div>
          <div class="locked-call">${pk ? 'Your call: <b>' + esc(pickLine(pk)) + '</b>' : '<span class="muted">You didn’t make a call on this one.</span>'}</div>
          <div class="locked-wait"><span class="spin"></span> Waiting for the result…</div></div>
        ${older}
        <p class="center small"><button class="link" data-act="earlynext">Next snap coming? Call it now</button></p>
      </section>`;
    }
    const saved = myPick('play', round) || {};
    const d = Object.assign({}, saved, S.draft[round] || {});
    const btn = (field, val, label, icon) => `<button class="choice ${d[field] === val ? 'on' : ''}" data-act="pick" data-f="${field}" data-v="${val}">${icon ? `<span class="ic">${icon}</span>` : ''}${label}</button>`;
    const hasType = !!d.play_type;
    const status = !S.me ? '<span class="warn">Join the game to play</span>'
      : S.draft[round] && S.draft[round]._saving ? 'Saving…'
      : saved.play_type ? '✓ Locked in. Change it until the snap.'
      : 'Tap Run or Pass to make your call.';
    return `<section class="card board">
      <div class="board-head">${situationHead(round)}<span class="hint">${status}</span></div>
      <div class="grid2">${btn('play_type', 'run', 'RUN', '🏃')}${btn('play_type', 'pass', 'PASS', '🎯')}</div>
      <div class="sub ${hasType ? '' : 'dim'}">Which way? <small>+${POINTS.dir}</small></div>
      <div class="grid3">${btn('dir', 'left', 'Left', '⬅︎')}${btn('dir', 'center', 'Middle', '⬆︎')}${btn('dir', 'right', 'Right', '➡︎')}</div>
      <div class="sub ${hasType ? '' : 'dim'}">How far? <small>+${POINTS.dist}</small></div>
      <div class="grid3">${btn('dist', 'short', '&lt; 5', '')}${btn('dist', 'mid', '5–9', '')}${btn('dist', 'long', '10+', '')}</div>
    </section>`;
  }

  function rzCard() {
    const r = S.room;
    if (r.rz_phase === 'none') return '';
    const round = r.rz_round;
    const saved = myPick('drive', round);
    const open = r.rz_phase === 'open';
    const label = { td: '🙌 Touchdown', fg: '🥅 Field goal', none: '🚫 No points' };
    const hostRow = isHost() ? `<div class="rz-host"><span class="small">Host: drive ended in</span>
        <button class="btn small" data-act="rzend" data-v="td">TD</button><button class="btn small" data-act="rzend" data-v="fg">FG</button><button class="btn small" data-act="rzend" data-v="none">Nothing</button>
        <button class="btn small ghost" data-act="rzcancel">✕ Cancel</button></div>` : '';
    // Collapsed once you've submitted (or once it's locked): one line with your call.
    if ((saved && saved.drive && S.rzEdit !== round) || !open) {
      const yours = saved && saved.drive ? `Your call: <b>${label[saved.drive]}</b>` : 'You didn’t make a call';
      return `<div class="rz-wrap"><button class="card redzone rz-line" data-act="${open ? 'rzedit' : ''}" ${open ? '' : 'disabled'}>
        <span>🚨 <b>Red zone</b> · ${yours}</span>
        <span class="rz-state">${open ? 'Change ✎' : '🔒 Locked'}</span></button>${hostRow}</div>`;
    }
    const sel = S.rzSel[round] || (saved && saved.drive) || null;
    const btn = (v, txt) => `<button class="choice ${sel === v ? 'on' : ''}" data-act="rzsel" data-v="${v}">${txt}</button>`;
    return `<section class="card redzone">
      <div class="board-head"><h2>🚨 Red zone!</h2><span class="hint">${esc(r.rz_label || '')}</span></div>
      <p class="small">How does this drive end? <b>${POINTS.drive} pts</b> · locks at the next snap</p>
      <div class="grid3">${btn('td', '🙌 TD')}${btn('fg', '🥅 FG')}${btn('none', '🚫 Nothing')}</div>
      <button class="btn primary big rz-submit" data-act="rzsubmit" ${sel ? '' : 'disabled'}>${S.rzSaving ? 'Saving…' : 'Submit my call'}</button>
      ${hostRow}
    </section>`;
  }

  function pendingStrip() {
    const pend = (S.room.pending || []).slice(-4);
    if (!pend.length) return '';
    return `<div class="pending">${pend.map((p) => {
      const pk = myPick('play', p.r);
      return `<span class="chip">⏳ #${p.r} waiting for ESPN · you: ${esc(pk ? pickLine(pk) : 'no call')}</span>`;
    }).join('')}</div>`;
  }

  /** True for ~2 minutes after the newest play result arrives (shown above the fresh pick board). */
  function freshResult() {
    const res = Object.values(S.results).filter((x) => x.kind === 'play').sort((a, b) => b.round - a.round)[0];
    if (!res) return false;
    const at = S.resultSeenAt[resKey(res)] || (res.created_at ? Date.parse(res.created_at) : 0) || 0;
    return Date.now() - at < 120e3;
  }

  function lastResultCard() {
    const res = Object.values(S.results).filter((r) => r.kind === 'play').sort((a, b) => b.round - a.round)[0];
    if (!res) return '';
    const pk = myPick('play', res.round);
    const s = scorePick(pk, res);
    const mark = (v) => (v === true ? '✅' : v === false ? '❌' : '·');
    return `<section class="card result ${res.void ? 'void' : s.total > 0 ? 'won' : 'lost'}">
      <div class="board-head"><h3>Play #${res.round}: ${esc(resultLine(res))}</h3><span class="pts">${res.void ? 'no play' : '+' + s.total}</span></div>
      <p class="playtext">${esc(res.text || '')}</p>
      ${!res.void && pk ? `<p class="small">You: ${esc(pickLine(pk))} · ${s.type ? [mark(true) + ' run/pass', s.dir != null ? mark(s.dir) + ' direction' : '', s.dist != null ? mark(s.dist) + ' distance' : ''].filter(Boolean).join(' ') : mark(false) + ' wrong play type'}</p>` : ''}
      ${!res.void && !pk ? '<p class="small muted">You didn’t make a call on this one.</p>' : ''}
    </section>`;
  }

  function board() {
    const rows = leaderboard(playersList(), Object.values(S.picks), Object.values(S.results), squareBonus());
    const r = S.room;
    const lockedRound = (r.pending || []).length ? r.pending[r.pending.length - 1].r : null;
    return `<section class="card lb">
      <div class="board-head"><h2>Leaderboard</h2><span class="hint">${rows.length} player${rows.length === 1 ? '' : 's'}</span></div>
      ${rows.length ? '' : '<p class="muted">No players yet. Share the code!</p>'}
      <ol>${rows.map((row) => {
        const p = row.player;
        const ready = !!S.picks[[p.id, 'play', r.round].join('|')];
        const shown = lockedRound != null ? S.picks[[p.id, 'play', lockedRound].join('|')] : null;
        const last = row.last ? row.last.total : null;
        return `<li class="${p.id === S.me ? 'me' : ''}">
          <span class="rk">${row.rank}</span><span class="pav">${esc(p.avatar)}</span>
          <span class="nm">${esc(p.name)}${row.streak >= 3 ? ` <span class="fire" title="${row.streak} in a row">🔥${row.streak}</span>` : ''}
            <small>${shown ? '#' + lockedRound + ': ' + esc(pickLine(shown)) : ''}</small></span>
          <span class="rd" title="${ready ? 'Has made a call for the next play' : 'Still thinking'}">${ready ? '✓' : '…'}</span>
          <span class="tot">${row.total}${last != null ? `<small class="${last > 0 ? 'up' : ''}">${last > 0 ? '+' + last : '0'}</small>` : ''}</span>
          ${isHost() && p.id !== S.me ? `<button class="x" data-act="kick" data-id="${p.id}" title="Remove player">✕</button>` : ''}
        </li>`;
      }).join('')}</ol>
    </section>`;
  }

  function historyCard() {
    const res = Object.values(S.results).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '') || b.round - a.round).slice(0, 12);
    if (!res.length) return '';
    return `<details class="card log"><summary>Play log</summary><ul>${res.map((r) => {
      const pk = myPick(r.kind, r.round);
      const s = scorePick(pk, r);
      return `<li><b>${r.kind === 'drive' ? '🚨 Drive' : '#' + r.round}</b> ${esc(resultLine(r))} <span class="pts small">${r.void ? '' : '+' + s.total}</span>
        ${isHost() ? `<button class="link small" data-act="fix" data-kind="${r.kind}" data-round="${r.round}">Fix</button>` : ''}
        <div class="playtext">${esc(r.text || '')}${r.source === 'host' ? ' <i>(entered by host)</i>' : ''}</div></li>`;
    }).join('')}</ul></details>`;
  }

  function hostPanel() {
    if (!isHost()) return '';
    const r = S.room;
    const ago = S.feed.at ? Math.round((Date.now() - S.feed.at) / 1000) : null;
    const feedLine = !r.event_id ? 'You’ll enter each result yourself (or tap Change to pick a game).'
      : !r.auto ? 'Auto results are off: you’ll enter results yourself.'
      : S.feed.ok === false ? '⚠️ Can’t reach ESPN right now (' + esc(S.feed.msg) + '). Retrying…'
      : ago == null ? 'Connecting to ESPN…' : '🟢 ESPN feed checked ' + ago + 's ago';
    const pend = r.pending || [];
    return `<section class="card host">
      <div class="board-head"><h2>🎛️ Host controls</h2><span class="hint">Code <b>${esc(S.code)}</b></span></div>
      <div class="hostrow"><div><b>${esc(r.game_label || 'No game picked')}</b><div class="small muted">${feedLine}</div>
        ${r.delay != null && r.auto && r.event_id ? `<div class="small muted">Your TV is about ${Math.max(0, Math.round(r.delay / 1000))}s behind live.</div>`
          : r.auto && r.event_id && pend.length ? '<div class="small muted">⏱️ Learning how far your TV is behind live. The first results show up after a few locks.</div>' : ''}</div>
        <button class="btn small" data-act="games">Change</button></div>
      ${r.event_id ? `<label class="toggle"><input type="checkbox" data-act="auto" ${r.auto ? 'checked' : ''}> Get results from ESPN automatically</label>` : ''}
      ${pend.length ? `<div class="sub">Waiting for results</div><ul class="plist">${pend.map((p) => `<li>Play #${p.r} <span class="small muted">locked ${new Date(p.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span>
        <button class="btn small" data-act="enter" data-round="${p.r}">Enter result</button></li>`).join('')}</ul>` : ''}
      <div class="sub">Red zone</div>
      ${r.rz_phase === 'none' ? '<button class="btn small" data-act="rzopen">🚨 Start the red zone mini-game</button> <span class="small muted">Open it when a team gets inside the 20. It scores itself when the drive ends.</span>'
        : `<div class="row wrap">${r.rz_phase === 'open' ? '<button class="btn small" data-act="rzlock">🔒 Lock it</button>' : ''}
          <span class="small">Drive ended in:</span><button class="btn small" data-act="rzend" data-v="td">TD</button><button class="btn small" data-act="rzend" data-v="fg">FG</button><button class="btn small" data-act="rzend" data-v="none">Nothing</button>
          <button class="btn small ghost" data-act="rzcancel">Cancel</button></div>`}
      <div class="row wrap gap">
        <button class="btn small" data-act="share">📤 Invite players</button>
        <button class="btn small ghost" data-act="rules">Rules</button>
      </div>
    </section>`;
  }

  // ---------- squares mini-game ----------
  function squareBonus() {
    return ((S.room && S.room.sq_wins) || []).filter((w) => w.player).map((w) => ({ player: w.player, points: Squares.pointsFor(w.q) }));
  }
  function myWinsBadge() {
    const n = ((S.room && S.room.sq_wins) || []).filter((w) => w.player && w.player === S.me).length;
    return n ? ` <span class="badge">🏆${n > 1 ? n : ''}</span>` : '';
  }
  function announceSquares() {
    const wins = (S.room && S.room.sq_wins) || [];
    if (S.sqWinsSeen == null) { S.sqWinsSeen = wins.length; return; }
    if (wins.length <= S.sqWinsSeen) { S.sqWinsSeen = wins.length; return; }
    wins.slice(S.sqWinsSeen).forEach((w) => {
      const per = Squares.PERIODS.find((p) => p.q === w.q);
      const p = w.player && S.players[w.player];
      const st = shownStatus() || {};
      const score = `${(st.away && st.away.abbr) || 'Away'} ${w.away} – ${(st.home && st.home.abbr) || 'Home'} ${w.home}`;
      if (p && w.player === S.me) { toast(`🏆 <b>You won ${per.name} squares!</b> +${per.points}<br><small>${esc(score)}</small>`, 'good', 7000); buzz(80); }
      else toast(`🔢 ${per.name} squares: ${p ? esc(p.avatar + ' ' + p.name) + ' wins +' + per.points : 'empty square, no winner'}<br><small>${esc(score)}</small>`, p ? '' : 'muted', 6000);
    });
    S.sqWinsSeen = wins.length;
  }

  function squaresView() {
    const r = S.room;
    const st = shownStatus() || {};
    const away = (st.away && st.away.abbr) || 'AWAY';
    const home = (st.home && st.home.abbr) || 'HOME';
    const drawn = !!(r.sq_cols && r.sq_rows);
    const open = (r.sq_phase || 'open') === 'open' && !drawn;
    const wins = r.sq_wins || [];
    const winBy = {};
    wins.forEach((w) => { if (w.idx != null) (winBy[w.idx] = winBy[w.idx] || []).push(Squares.PERIODS.find((p) => p.q === w.q).name); });
    const taken = Object.keys(S.squares).length;
    const mine = Object.values(S.squares).filter((q) => q.player === S.me).map((q) => q.idx).sort((a, b) => a - b);
    let cells = `<div class="sq-corner"><span>${esc(away)} →</span><span>${esc(home)} ↓</span></div>`;
    for (let c = 0; c < 10; c++) cells += `<div class="sq-h">${drawn ? r.sq_cols[c] : '?'}</div>`;
    for (let row = 0; row < 10; row++) {
      cells += `<div class="sq-h">${drawn ? r.sq_rows[row] : '?'}</div>`;
      for (let c = 0; c < 10; c++) {
        const i = row * 10 + c;
        const q = S.squares[i];
        const p = q && S.players[q.player];
        const w = winBy[i];
        const cls = ['sq', q ? 'taken' : 'free', q && q.player === S.me ? 'mine' : '', w ? 'won' : ''].join(' ');
        const label = p ? `${esc(p.avatar)}<small>${esc(p.name.slice(0, 5))}</small>` : q ? '<small>?</small>' : open ? '+' : '';
        cells += `<button class="${cls}" data-act="sq" data-i="${i}" ${open ? '' : 'tabindex="-1"'} title="${drawn ? esc(away + ' ' + r.sq_cols[c] + ' · ' + home + ' ' + r.sq_rows[row]) : ''}">${w ? '<span class="sq-trophy">🏆</span>' : ''}${label}</button>`;
      }
    }
    const counts = {};
    Object.values(S.squares).forEach((q) => { counts[q.player] = (counts[q.player] || 0) + 1; });
    const owners = Object.keys(counts).map((id) => S.players[id]).filter(Boolean).sort((a, b) => counts[b.id] - counts[a.id]);
    const myList = drawn && mine.length
      ? `<div class="sq-mine">${mine.map((i) => `<span class="chip on">${esc(away)} <b>${r.sq_cols[i % 10]}</b> · ${esc(home)} <b>${r.sq_rows[Math.floor(i / 10)]}</b></span>`).join('')}</div>`
      : `<p class="small muted">${mine.length ? `You have <b>${mine.length}${r.sq_max && mine.length <= r.sq_max ? ' of ' + r.sq_max : ''}</b> square${(r.sq_max && mine.length <= r.sq_max ? r.sq_max : mine.length) === 1 ? '' : 's'}${r.sq_max && mine.length > r.sq_max ? ' (the limit is now ' + r.sq_max + ')' : ''}. Your numbers appear when the host draws them.` : open ? `Tap empty squares to claim them${r.sq_max ? ` (up to <b>${r.sq_max}</b> each)` : ''}. Tap one of yours to give it back.` : 'You don’t have any squares in this game.'}</p>`;
    const periodRows = Squares.PERIODS.map((per) => {
      const w = wins.find((x) => x.q === per.q);
      const p = w && w.player && S.players[w.player];
      return `<li><b>${per.name}</b> <span class="small muted">+${per.points}</span>
        <span class="sq-score">${w ? `${esc(away)} ${w.away} – ${esc(home)} ${w.home}` : ''}</span>
        <span class="sq-win">${!w ? '<span class="muted">—</span>' : p ? `🏆 ${esc(p.avatar)} ${esc(p.name)}` : '<span class="muted">Empty square</span>'}</span></li>`;
    }).join('');
    const host = isHost() ? `<div class="sq-host">${!drawn
      ? `<div class="sq-cap"><span class="small"><b>Max squares per player:</b> ${r.sq_max || 'no limit'}</span>
          <div class="row wrap"><button class="btn small" data-act="sqmax" data-v="even">Even split (${Math.max(1, Math.floor(100 / Math.max(1, playersList().length)))})</button>
          <button class="btn small" data-act="sqmax" data-v="ask">Set a number…</button>
          ${r.sq_max ? '<button class="btn small ghost" data-act="sqmax" data-v="none">No limit</button>' : ''}</div></div>
        <button class="btn primary big" data-act="sqdraw">🎲 Lock board &amp; draw numbers</button><p class="small muted">Do this before kickoff once everyone has picked. After the draw, nobody can change squares.</p>`
      : `<p class="small muted">Numbers are drawn. Winners are scored automatically at the end of Q1, halftime, Q3 and the final.</p>
         ${wins.length ? '' : '<button class="btn small ghost" data-act="sqreopen">Re-open the board (clears the numbers)</button>'}`}</div>` : '';
    return `<section class="card squares">
      <div class="board-head"><h2>🔢 Squares</h2><span class="hint">${taken}/100 taken${r.sq_max ? ' · max ' + r.sq_max + ' each' : ''}${drawn ? ' · numbers drawn' : open ? ' · open' : ''}</span></div>
      <div class="sq-grid">${cells}</div>
      ${myList}
      ${owners.length ? `<p class="small muted sq-owners">${owners.map((p) => `${esc(p.avatar)} ${esc(p.name)} ${counts[p.id]}`).join(' · ')}</p>` : ''}
    </section>
    <section class="card"><h2>Winners</h2><ul class="sq-periods">${periodRows}</ul>
      <p class="small muted">Winning square = last digit of each team’s score at the end of the period (${esc(away)} across the top, ${esc(home)} down the side).</p>
      ${host}</section>`;
  }

  async function tapSquare(i) {
    const r = S.room;
    if (r.sq_cols || (r.sq_phase || 'open') !== 'open') { toast('🔒 The board is locked.', 'muted'); return; }
    if (!S.me) { S.view = 'profile'; render(); return; }
    const q = S.squares[i];
    if (q && q.player !== S.me) { const p = S.players[q.player]; toast((p ? esc(p.name) : 'Someone') + ' has that square.', 'muted'); return; }
    const cap = r.sq_max || null;
    const have = Object.values(S.squares).filter((x) => x.player === S.me).length;
    if (!q && cap && have >= cap) { toast(`You already have ${cap} square${cap === 1 ? '' : 's'}, the most allowed. Tap one of yours to give it back.`, 'muted', 4500); return; }
    buzz(15);
    try {
      if (q) {
        delete S.squares[i];
        render();
        await store.releaseSquare(S.code, i, S.me);
      } else {
        S.squares[i] = { room: S.code, idx: i, player: S.me };
        render();
        await store.claimSquare(S.code, i, S.me);
      }
    } catch (e) {
      if (e.code === '23505' || /duplicate/i.test(e.message)) toast('Someone grabbed that square first!', 'bad');
      else if (e.code === '42501' || /row-level security/i.test(e.message)) toast(S.room.sq_max ? '🔒 That’s over the square limit, or the board is locked.' : '🔒 The board is locked.', 'bad');
      else if (/pc_squares|relation|schema cache/i.test(e.message)) toast('⚠️ Squares needs the updated database setup. Ask the host to re-run it (playcall/setup.html).', 'bad', 7000);
      else toast('⚠️ ' + esc(e.message), 'bad');
      refresh();
    }
  }

  function renderGame() {
    const r = S.room;
    const tab = session.tab === 'squares' ? 'squares' : 'plays';
    if (!r) { $app.innerHTML = '<p class="muted center">Loading…</p>'; return; }
    const me = S.me ? S.players[S.me] : null;
    const onlineDot = S.online === 'live' ? '' : `<span class="net ${S.online}">${S.online === 'offline' ? 'Reconnecting…' : 'Connecting…'}</span>`;
    $app.innerHTML = `
      <header class="top">
        <button class="btn ghost small" data-act="home" aria-label="Home">🏠</button>
        <button class="codechip" data-act="share" title="Invite players">Code <b>${esc(S.code)}</b> 📤</button>
        <button class="btn ghost small mebtn" data-act="profile">${me ? esc(me.avatar) + ' ' + esc(me.name) : 'Join'}</button>
      </header>
      ${onlineDot}
      ${store.kind === 'local' ? '<div class="banner warn small">🧪 Test mode: only tabs on this device share this game.</div>' : ''}
      ${hostAway() ? `<div class="banner warn">😴 The host’s device stopped updating, so new plays won’t be scored.
        Ask the host to open the game, or <button class="link" data-act="takehost">make this device the host</button>.</div>` : ''}
      ${scorebug()}
      <div class="tabs maintabs"><button class="${tab === 'plays' ? 'on' : ''}" data-act="tab" data-v="plays">🏈 Play calls</button><button class="${tab === 'squares' ? 'on' : ''}" data-act="tab" data-v="squares">🔢 Squares${myWinsBadge()}</button></div>
      ${tab === 'squares' ? squaresView() : `
      <div id="fieldSlotNarrow" class="fieldslot"></div>
      <div class="layout">
        <div class="col">
          ${rzCard()}
          ${freshResult() ? lastResultCard() : ''}
          ${pickBoard()}
          ${freshResult() ? '' : lastResultCard()}
        </div>
        <div class="col">
          <div id="fieldSlotWide" class="fieldslot"></div>
          ${board()}
          ${historyCard()}
          ${hostPanel()}
          ${!isHost() ? `<p class="center small muted"><button class="link" data-act="rules">Rules</button> · <button class="link" data-act="takehost">Make this device the host</button></p>` : ''}
        </div>
      </div>`}
      ${isHost() ? `<div class="lockbar"><button data-act="lock">🔒 LOCK <small>${(r.pending || []).length ? 'locked · waiting for the result · tap again at the next snap' : 'tap at the snap'}</small></button></div>` : ''}`;
    document.body.classList.toggle('has-lockbar', isHost());
    const slot = document.getElementById(wideMQ.matches ? 'fieldSlotWide' : 'fieldSlotNarrow');
    if (slot) { slot.appendChild(field.el); field.update(shownStatus()); }
  }

  // ---------- modals ----------
  function openModal(html) {
    $modal.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><button class="close" data-act="close" aria-label="Close">✕</button>${html}</div>`;
    $modal.hidden = false;
  }
  function closeModal() { $modal.hidden = true; $modal.innerHTML = ''; }

  async function showGames() {
    const lg = S.gamesLeague;
    const day = new Date(Date.now() + S.gamesDay * 864e5);
    openModal(`<h2>Which game are you watching?</h2>
      <div class="tabs"><button class="${lg === 'nfl' ? 'on' : ''}" data-act="glg" data-v="nfl">NFL</button><button class="${lg === 'college-football' ? 'on' : ''}" data-act="glg" data-v="college-football">College</button></div>
      <div class="daynav"><button class="btn ghost small" data-act="gday" data-v="-1">‹</button><b>${day.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</b><button class="btn ghost small" data-act="gday" data-v="1">›</button></div>
      <div id="glist" class="glist"><p class="muted">Loading games…</p></div>
      <button class="btn ghost" data-act="nogame">No game feed: I’ll enter results myself</button>`);
    try {
      const games = await ESPN.listGames(lg, day);
      const el = document.getElementById('glist');
      if (!el) return;
      el.innerHTML = games.length ? games.map((g) => `<button class="game ${g.state}" data-act="pickgame" data-id="${g.id}" data-lg="${lg}" data-label="${esc(g.away.abbr + ' @ ' + g.home.abbr)}">
          <span class="gt">${g.away.logo ? `<img src="${esc(g.away.logo)}" alt="" onerror="this.remove()">` : ''}${esc(g.away.abbr)} ${esc(g.away.score)}</span>
          <span class="gs">${g.state === 'in' ? '🔴 ' : ''}${esc(g.detail)}</span>
          <span class="gt">${esc(g.home.score)} ${esc(g.home.abbr)}${g.home.logo ? `<img src="${esc(g.home.logo)}" alt="" onerror="this.remove()">` : ''}</span></button>`).join('')
        : '<p class="muted">No games on this day.</p>';
    } catch (e) {
      const el = document.getElementById('glist');
      if (el) el.innerHTML = `<p class="warn">Couldn’t load games from ESPN: ${esc(e.message)}</p>`;
    }
  }

  function showResultEntry(kind, round) {
    const existing = S.results[kind + '|' + round] || {};
    S.entry = { kind, round, play_type: existing.void ? 'void' : existing.play_type || null, dir: existing.dir || null, dist: existing.dist || null, drive: existing.drive || null };
    renderEntry();
  }
  function renderEntry() {
    const e = S.entry;
    const b = (f, v, l) => `<button class="choice ${e[f] === v ? 'on' : ''}" data-act="entry" data-f="${f}" data-v="${v}">${l}</button>`;
    if (e.kind === 'drive') {
      openModal(`<h2>Red zone drive result</h2><div class="grid3">${b('drive', 'td', 'TD')}${b('drive', 'fg', 'FG')}${b('drive', 'none', 'Nothing')}</div>
        <button class="btn primary big" data-act="entrysave">Save</button>`);
      return;
    }
    openModal(`<h2>Play #${e.round} result</h2>
      <div class="grid3">${b('play_type', 'run', 'Run')}${b('play_type', 'pass', 'Pass')}${b('play_type', 'void', 'No play')}</div>
      ${e.play_type === 'void' ? '<p class="muted small">Nobody gets points for this one (penalty before the snap, kneel-down, punt…).</p>' : `
      <div class="sub">Direction</div><div class="grid3">${b('dir', 'left', 'Left')}${b('dir', 'center', 'Middle')}${b('dir', 'right', 'Right')}</div>
      <div class="sub">Yards gained</div><div class="grid3">${b('dist', 'short', '&lt; 5')}${b('dist', 'mid', '5–9')}${b('dist', 'long', '10+')}</div>`}
      <button class="btn primary big" data-act="entrysave" ${e.play_type ? '' : 'disabled'}>Save result</button>`);
  }
  async function saveEntry() {
    const e = S.entry;
    const row = { room: S.code, kind: e.kind, round: e.round, source: 'host', yards: null, text: 'Entered by the host.' };
    if (e.kind === 'drive') Object.assign(row, { void: false, drive: e.drive || 'none', play_type: null, dir: null, dist: null });
    else if (e.play_type === 'void') Object.assign(row, { void: true, play_type: null, dir: null, dist: null, drive: null });
    else Object.assign(row, { void: false, play_type: e.play_type, dir: e.dir, dist: e.dist, drive: null });
    const old = S.results[e.kind + '|' + e.round];
    if (old && old.text && old.source === 'auto') row.text = old.text + ' (corrected by host)';
    closeModal();
    await hostDo(async () => {
      await store.upsertResults([row]);
      S.results[resKey(row)] = Object.assign({}, old || {}, row);
      if (e.kind === 'play') {
        const pending = (S.room.pending || []).filter((p) => p.r !== e.round);
        if (pending.length !== (S.room.pending || []).length) await patchRoom({ pending });
      }
    });
    scheduleRender();
  }

  function showRules() {
    openModal(`<h2>How to play</h2>
      <table class="rules"><tr><td>Run or pass right</td><td><b>${POINTS.type}</b></td></tr>
      <tr><td>…and the direction (left / middle / right)</td><td><b>+${POINTS.dir}</b></td></tr>
      <tr><td>…and the distance (&lt;5, 5–9, 10+ yards)</td><td><b>+${POINTS.dist}</b></td></tr>
      <tr><td>🚨 Red zone: how the drive ends (TD / FG / nothing)</td><td><b>${POINTS.drive}</b></td></tr></table>
      <ul class="small">
        <li>Direction and distance only count if you got run/pass right.</li>
        <li>Sacks and QB scrambles count as <b>passes</b>. They have no direction.</li>
        <li>Middle runs include runs between the guards (“up the middle”, “left guard”, “right guard”).</li>
        <li>An incomplete pass gains 0 yards, so it counts as <b>&lt; 5</b>.</li>
        <li>Flags during a play don’t erase it: the run/pass that was called still counts. False starts, kneel-downs, spikes, punts and field goals don’t count.</li>
        <li>Picks lock when the host taps <b>LOCK</b> at the snap.</li>
      </ul>`);
  }

  function inviteUrl() {
    const u = new URL(location.href);
    u.search = '?join=' + S.code;
    if (!cfgFromFile && store.kind === 'supabase') { u.searchParams.set('sbu', cfg.supabaseUrl); u.searchParams.set('sbk', cfg.supabaseKey); }
    return u.toString();
  }
  async function share() {
    const url = inviteUrl();
    const text = 'Join my Play Caller game! Code ' + S.code;
    try {
      if (navigator.share) { await navigator.share({ title: 'Play Caller', text, url }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); toast('Invite link copied!'); } catch (e) {
      openModal(`<h2>Invite players</h2><p>Game code: <b class="big">${esc(S.code)}</b></p><input readonly value="${esc(url)}" onclick="this.select()">`);
    }
  }

  function showSetup() {
    openModal(`<h2>Connect Supabase</h2>
      <p class="small">Paste the <b>Project URL</b> and the <b>anon public</b> (or publishable) key from Supabase → Project Settings → API.
      This saves them on this device only. To make them permanent for everyone, put them in <code>playcall/js/config.js</code>.</p>
      <form data-form="setup" class="stack">
        <label>Project URL<input id="sbu" placeholder="https://xxxx.supabase.co" value="${esc(cfg.supabaseUrl || '')}"></label>
        <label>Anon / publishable key<input id="sbk" placeholder="eyJ… or sb_publishable_…" value="${esc(cfg.supabaseKey || '')}"></label>
        <button class="btn primary">Save &amp; reload</button>
        ${cfg.supabaseUrl ? '<button type="button" class="btn ghost" data-act="unsetup">Disconnect (back to test mode)</button>' : ''}
      </form>`);
  }

  // ---------- actions ----------
  function genCode() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)];
    return s;
  }
  async function hostNew() {
    for (let i = 0; i < 5; i++) {
      const code = genCode();
      try {
        await store.createRoom({ code, host_key: session.deviceKey });
        await openRoom(code);
        S.view = S.me ? 'game' : 'profile';
        render();
        return;
      } catch (e) {
        if (!/duplicate/i.test(e.message)) { toast('⚠️ ' + esc(e.message), 'bad', 6000); return; }
      }
    }
  }
  async function join(code) {
    code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) { toast('Enter the game code from the host.'); return; }
    try {
      await openRoom(code);
      S.view = S.me ? 'game' : 'profile';
      render();
    } catch (e) { toast('⚠️ ' + esc(e.message), 'bad', 5000); }
  }

  let pickSeq = 0;
  async function setPick(field, val) {
    if (!S.me) { S.view = 'profile'; render(); return; }
    const round = S.room.round;
    const cur = Object.assign({}, myPick('play', round) || {}, S.draft[round] || {});
    const next = { play_type: cur.play_type || null, dir: cur.dir || null, dist: cur.dist || null };
    next[field] = next[field] === val && field !== 'play_type' ? null : val;
    S.draft[round] = Object.assign({}, next, { _saving: true });
    buzz(15);
    render();
    const mine = ++pickSeq;
    try {
      await store.upsertPick({ room: S.code, player: S.me, kind: 'play', round, play_type: next.play_type, dir: next.dir, dist: next.dist });
      S.picks[[S.me, 'play', round].join('|')] = { room: S.code, player: S.me, kind: 'play', round, ...next };
      if (mine === pickSeq) delete S.draft[round];
    } catch (e) {
      delete S.draft[round];
      if (e.code === '42501' || /row-level security/i.test(e.message)) toast('🔒 Too late, that play is underway. Call the next one!', 'bad');
      else toast('⚠️ Couldn’t save: ' + esc(e.message), 'bad');
      refresh();
    }
    render();
  }
  async function submitRz() {
    if (!S.me) { S.view = 'profile'; render(); return; }
    const round = S.room.rz_round;
    const val = S.rzSel[round];
    if (!val) return;
    S.rzSaving = true;
    render();
    try {
      await store.upsertPick({ room: S.code, player: S.me, kind: 'drive', round, drive: val });
      S.picks[[S.me, 'drive', round].join('|')] = { room: S.code, player: S.me, kind: 'drive', round, drive: val };
      S.rzEdit = null;
      delete S.rzSel[round];
      buzz(30);
    } catch (e) {
      toast(e.code === '42501' || /row-level security/i.test(e.message) ? '🔒 Too late, the red zone call is locked.' : '⚠️ ' + esc(e.message), 'bad');
      refresh();
    }
    S.rzSaving = false;
    render();
  }

  document.addEventListener('click', async (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el) { if (ev.target === $modal) closeModal(); return; }
    const act = el.dataset.act;
    if (el.tagName === 'INPUT') { if (act === 'auto') hostDo(() => patchRoom({ auto: el.checked, last_seq: el.checked ? null : S.room.last_seq })); return; }
    ev.preventDefault();
    switch (act) {
      case 'home': if (S.unsub) { S.unsub(); S.unsub = null; } S.view = 'home'; S.code = null; S.room = null; history.replaceState(null, '', location.pathname + (params.get('as') ? '?as=' + encodeURIComponent(params.get('as')) : '')); render(); break;
      case 'host': hostNew(); break;
      case 'rejoin': join(session.lastCode); break;
      case 'setup': showSetup(); break;
      case 'unsetup': lsSet('pc_cfg', {}); location.href = location.pathname; break;
      case 'avatar': S.pendingAvatar = el.dataset.v; document.querySelectorAll('.av').forEach((b) => b.classList.toggle('on', b === el)); break;
      case 'profile': S.view = 'profile'; S.pendingAvatar = null; render(); break;
      case 'pick': setPick(el.dataset.f, el.dataset.v); break;
      case 'rzsel': S.rzSel[S.room.rz_round] = el.dataset.v; buzz(15); render(); break;
      case 'rzsubmit': submitRz(); break;
      case 'rzedit': S.rzEdit = S.room.rz_round; render(); break;
      case 'lock': lockNow(); break;
      case 'share': share(); break;
      case 'rules': showRules(); break;
      case 'earlynext': S.earlyNext = S.room.round; render(); break;
      case 'tvsync': showTvSync(); break;
      case 'tvsyncnow': {
        const st = liveStatus();
        const lp = st ? (st.recent && st.recent[0] ? st.recent[0].text : st.lastPlay) : '';
        const seen = lp && S.firstSeen[lp];
        if (seen) {
          session.tvDelay = Math.min(300, Math.max(0, Math.round((Date.now() - seen) / 1000) + 2));
          saveSession();
          toast('📺 Synced: holding the app back ' + session.tvDelay + 's to match your TV.', 'good', 4000);
        }
        closeModal(); render();
        break;
      }
      case 'tvadj': {
        const v = parseInt(el.dataset.v, 10);
        session.tvDelay = v === 0 ? 0 : Math.min(300, Math.max(0, (session.tvDelay || 0) + v));
        saveSession(); showTvSync(); render();
        break;
      }
      case 'tab': session.tab = el.dataset.v; saveSession(); render(); window.scrollTo(0, 0); break;
      case 'sq': tapSquare(parseInt(el.dataset.i, 10)); break;
      case 'sqdraw':
        if (!confirm('Lock the board and draw the numbers? Nobody can change squares after this.')) break;
        hostDo(() => patchRoom({ sq_phase: 'locked', sq_cols: Squares.shuffledDigits(), sq_rows: Squares.shuffledDigits(), sq_wins: [] }))
          .then(() => { if (S.room && !S.room.sq_cols) toast('⚠️ Squares needs the updated database setup (playcall/setup.html).', 'bad', 7000); });
        break;
      case 'sqmax': {
        let v = el.dataset.v;
        if (v === 'even') v = Math.max(1, Math.floor(100 / Math.max(1, playersList().length)));
        else if (v === 'ask') { const ans = prompt('Max squares per player (1–100):', S.room.sq_max || 10); if (ans == null) break; v = parseInt(ans, 10); if (!(v >= 1 && v <= 100)) { toast('Enter a number from 1 to 100.', 'bad'); break; } }
        else v = null;
        hostDo(() => patchRoom({ sq_max: v })).then(() => {
          if (v && S.room.sq_max !== v) toast('⚠️ The square limit needs the updated database setup (playcall/setup.html).', 'bad', 7000);
          else {
            const over = v ? playersList().filter((p) => Object.values(S.squares).filter((q) => q.player === p.id).length > v) : [];
            toast(v ? `Max ${v} squares per player.` + (over.length ? ` ${over.map((p) => p.name).join(', ')} already ${over.length === 1 ? 'has' : 'have'} more; they can keep them but can’t add more.` : '') : 'No square limit.', '', 5000);
          }
        });
        break;
      }
      case 'sqreopen':
        if (!confirm('Re-open the board? The drawn numbers are cleared and people can change squares again.')) break;
        hostDo(() => patchRoom({ sq_phase: 'open', sq_cols: null, sq_rows: null, sq_wins: [] }));
        break;
      case 'recent': session.recentOpen = !session.recentOpen; saveSession(); render(); break;
      case 'close': closeModal(); break;
      case 'games': S.gamesDay = 0; S.gamesLeague = (S.room && S.room.league) || 'nfl'; showGames(); break;
      case 'glg': S.gamesLeague = el.dataset.v; showGames(); break;
      case 'gday': S.gamesDay += parseInt(el.dataset.v, 10); showGames(); break;
      case 'pickgame':
        closeModal();
        hostDo(() => patchRoom({ league: el.dataset.lg, event_id: el.dataset.id, game_label: el.dataset.label, auto: true, last_seq: null, lock_log: [], delay: null, status: null, rz_phase: 'none', rz_drive: null, rz_done: null }))
          .then(() => hostTick(true));
        break;
      case 'nogame': closeModal(); hostDo(() => patchRoom({ event_id: null, game_label: null, status: null, auto: false })); break;
      case 'enter': showResultEntry('play', parseInt(el.dataset.round, 10)); break;
      case 'fix': showResultEntry(el.dataset.kind, parseInt(el.dataset.round, 10)); break;
      case 'entry': S.entry[el.dataset.f] = el.dataset.v; if (el.dataset.f === 'play_type' && el.dataset.v === 'void') { S.entry.dir = null; S.entry.dist = null; } renderEntry(); break;
      case 'entrysave': saveEntry(); break;
      case 'rzopen':
        if (!confirm('Start the red zone mini-game? Everyone gets a TD / FG / Nothing call for this drive.')) break;
        hostDo(() => patchRoom({ rz_phase: 'open', rz_round: (S.room.rz_round || 0) + 1, rz_drive: null, rz_label: (liveStatus() && liveStatus().poss ? liveStatus().poss + ' in the red zone' : 'Red zone') })); break;
      case 'rzlock': hostDo(() => patchRoom({ rz_phase: 'locked' })); break;
      case 'rzend':
        hostDo(async () => {
          const r = S.room;
          await store.upsertResults([{ room: S.code, kind: 'drive', round: r.rz_round, void: false, drive: el.dataset.v, source: 'host', text: 'Drive result entered by the host.' }]);
          await patchRoom({ rz_phase: 'none', rz_done: r.rz_drive || r.rz_done, rz_drive: null });
        });
        break;
      case 'rzcancel':
        if (!confirm('Cancel this red zone call? Nobody gets points for it.')) break;
        hostDo(async () => {
          const r = S.room;
          await store.upsertResults([{ room: S.code, kind: 'drive', round: r.rz_round, void: true, source: 'host', text: 'Red zone call cancelled by the host.' }]);
          await patchRoom({ rz_phase: 'none', rz_done: r.rz_drive || r.rz_done, rz_drive: null });
        });
        break;
      case 'kick': {
        const p = S.players[el.dataset.id];
        if (p && confirm('Remove ' + p.name + ' from this game?')) store.removePlayer(p.id).catch((e) => toast('⚠️ ' + esc(e.message), 'bad'));
        break;
      }
      case 'takehost':
        if (confirm('Make this device the host? It will get the LOCK button and pull results from ESPN. Keep it awake and on this page during the game.')) {
          await patchRoom({ host_key: session.deviceKey }).catch((e) => toast('⚠️ ' + esc(e.message), 'bad'));
          render();
          hostTick(true);
        }
        break;
      default: break;
    }
  });

  document.addEventListener('submit', async (ev) => {
    const f = ev.target.closest('[data-form]');
    if (!f) return;
    ev.preventDefault();
    if (f.dataset.form === 'join') join(document.getElementById('joinCode').value);
    if (f.dataset.form === 'setup') {
      const u = document.getElementById('sbu').value.trim().replace(/\/+$/, '');
      const k = document.getElementById('sbk').value.trim();
      if (!/^https:\/\/.+/.test(u) || k.length < 20) { toast('That doesn’t look right. Check the URL and key.', 'bad'); return; }
      lsSet('pc_cfg', { supabaseUrl: u, supabaseKey: k });
      location.reload();
    }
    if (f.dataset.form === 'profile') {
      const name = document.getElementById('pname').value.trim().slice(0, 20);
      if (!name) return;
      const avatar = S.pendingAvatar || '🏈';
      session.name = name;
      session.avatar = avatar;
      try {
        if (S.me && S.players[S.me]) {
          await store.updatePlayer(S.me, { name, avatar });
          S.players[S.me] = Object.assign({}, S.players[S.me], { name, avatar });
        } else {
          const p = await store.addPlayer({ room: S.code, name, avatar });
          S.players[p.id] = p;
          S.me = p.id;
          session.players = session.players || {};
          session.players[S.code] = p.id;
        }
        saveSession();
        S.view = 'game';
        render();
        if (isHost() && !S.room.event_id && S.room.auto) showGames();
      } catch (e) { toast('⚠️ ' + esc(e.message), 'bad'); }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isHost() && S.view === 'game' && $modal.hidden && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); lockNow(); }
    if (e.key === 'Escape' && !$modal.hidden) closeModal();
  });

  // Keep "checked Xs ago" fresh for the host without hammering the DOM.
  setInterval(() => { if (isHost() && S.view === 'game' && $modal.hidden) scheduleRender(); }, 5000);

  // ---------- start ----------
  (async function start() {
    const code = (params.get('join') || '').toUpperCase();
    if (code && session.players && session.players[code]) {
      try { await openRoom(code); S.view = S.me ? 'game' : 'profile'; } catch (e) { S.view = 'home'; }
    }
    render();
  })();
})();
