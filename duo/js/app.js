/* Screens: team setup, adventure map, free play, challenge runner, results, finale, leaderboard. */
(() => {
  const view = U.$('#view');
  const AVATARS = ['🦊', '🐻', '🐼', '🐸', '🦄', '🐯', '🐵', '🐙', '🦖', '🐧', '🦁', '🐨', '🐰', '🦉', '🐳', '🐝', '🐢', '🦕', '👽', '🤖'];
  const CHAPTERS = [
    { id: 'woods', name: 'Starter Woods', emoji: '🌲', d: 1, blurb: 'Warm up your teamwork.', stages: ['trace', 'trivia', 'maze', 'riddles', 'escape:wizard'] },
    { id: 'island', name: 'Puzzle Island', emoji: '🏝️', d: 2, blurb: 'Describe, cross words, and sail the seas.', stages: ['describe', 'crossword', 'maze', 'trivia', 'escape:pirate'] },
    { id: 'stars', name: 'Star Base', emoji: '🚀', d: 3, blurb: 'Harder puzzles and swapping controls.', stages: ['trace', 'riddles', 'crossword', 'describe', 'maze', 'escape:space'] },
    { id: 'tower', name: "Champions' Tower", emoji: '🏰', d: 4, blurb: 'The ultimate test for the best teams.', stages: ['maze', 'trace', 'trivia', 'crossword', 'describe', 'riddles', 'escape'] },
  ];
  const ORDER = ['trace', 'describe', 'trivia', 'riddles', 'crossword', 'maze', 'escape'];
  const D = U.data;
  let cleanups = [];
  const cleanup = () => { cleanups.forEach((f) => { try { f(); } catch { /* ignore */ } }); cleanups = []; };

  const stageList = () => CHAPTERS.flatMap((ch) => ch.stages.map((s, i) => ({ ch, i, id: `${ch.id}-${i}`, type: s.split(':')[0], room: s.split(':')[1] })));
  const MAX_STARS = stageList().length * 3;
  const stageName = (s) => (s.type === 'escape' && s.room ? Rooms[s.room].name : Challenges[s.type].name);

  /* ---------- adventure runs: one team's trip through the map ---------- */
  const newRun = () => ({ id: Date.now(), stars: {}, time: 0, done: false });
  if (!D().run) D().run = { ...newRun(), stars: D().stars || {} };
  if (!Array.isArray(D().leaderboard)) D().leaderboard = [];
  U.save();
  const run = () => D().run;
  const starsOf = (id) => run().stars[id] || 0;
  const totalStars = () => Object.values(run().stars).reduce((a, b) => a + b, 0);
  const unlocked = (id) => { const L = stageList(), k = L.findIndex((s) => s.id === id); return k <= 0 || starsOf(L[k - 1].id) > 0; };
  const longTime = (s) => { s = Math.round(s); const h = Math.floor(s / 3600); return h ? `${h}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : U.fmt(s); };
  const teamName = (t) => `${U.esc(t.kid.avatar)} ${U.esc(t.kid.name)} & ${U.esc(t.adult.avatar)} ${U.esc(t.adult.name)}`;
  const ranked = () => D().leaderboard.slice().sort((a, b) => b.stars - a.stars || a.time - b.time || a.date - b.date);
  function startRun() { D().run = newRun(); U.save(); }

  function chips() {
    U.$('#chips').innerHTML = `<span class="chip">⭐ ${totalStars()}</span><span class="chip">⏱ ${longTime(run().time)}</span>
      <button class="chip btnchip" data-go="leaders" aria-label="Leaderboard">🏆</button><button class="chip btnchip" data-go="settings" aria-label="Settings">⚙️</button>`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (!b) return;
    U.sfx.tap();
    go(b.dataset.go, b.dataset);
  });

  function go(name, args = {}) {
    cleanup();
    U.$$('.modal-wrap').forEach((x) => x.remove());
    document.body.dataset.screen = name;
    chips();
    ({ home, setup, settings, map, play, free, leaders, finale }[name] || home)(args);
    scrollTo(0, 0);
  }

  const againButtons = () => `<div class="hero-btns">
      <button class="btn big" data-again>🔁 Run it back</button>
      <button class="btn big ghost" data-go="setup" data-fresh="1">👥 New team</button>
    </div>`;
  function wireAgain() {
    U.$$('[data-again]').forEach((b) => { b.onclick = () => { U.sfx.tap(); startRun(); go('play', { stage: stageList()[0].id }); }; });
  }

  /* ---------- home ---------- */
  function home() {
    if (!D().setup) return setup({ first: true });
    const k = D().kid, a = D().adult;
    const next = stageList().find((s) => !starsOf(s.id) && unlocked(s.id));
    const started = totalStars() > 0 || run().time > 0;
    const top = ranked().slice(0, 3);
    view.innerHTML = `<section class="hero">
      <div class="duo-avatars"><span>${U.esc(k.avatar)}</span><b>+</b><span>${U.esc(a.avatar)}</span></div>
      <h1>${U.esc(k.name)} & ${U.esc(a.name)}</h1>
      ${run().done
        ? `<p><b>🏆 Adventure complete!</b> ⭐ ${totalStars()}/${MAX_STARS} in ⏱ ${longTime(run().time)}. Ready for another go?</p>${againButtons()}`
        : `<p class="muted">A team adventure for a kid and a grown-up. Draw, think, solve and escape — together!</p>
      <div class="hero-btns">
        ${next ? `<button class="btn big" data-go="play" data-stage="${next.id}">▶ ${started ? 'Continue' : 'Start'} the adventure</button>` : ''}
        <button class="btn big ghost" data-go="map">🗺️ Adventure map</button>
        <button class="btn big ghost" data-go="free">🎲 Free play</button>
      </div>
      ${started ? `<p class="muted small">This adventure so far: ⭐ ${totalStars()}/${MAX_STARS} · ⏱ ${longTime(run().time)}</p>` : ''}
      <div class="row center wrap"><button class="btn ghost small" data-go="setup" data-fresh="1">👥 Switch team</button><button class="btn ghost small" data-go="leaders">🏆 Leaderboard</button></div>`}
    </section>
    ${top.length ? `<section class="panel mini-board"><h2>🏆 Top teams</h2>${boardTable(top, null, true)}</section>` : ''}
    <section class="kinds">${ORDER.map((t) => { const c = Challenges[t]; return `<div class="kind"><span>${c.emoji}</span><b>${c.name}</b><small>${c.blurb}</small></div>`; }).join('')}</section>
    <p class="center muted small">Best on an iPad, sitting side by side. ${U.esc(k.name)} sits on the <b>left</b>, ${U.esc(a.name)} on the <b>right</b>.</p>`;
    wireAgain();
  }

  /* ---------- team setup ---------- */
  function setup({ first, fresh } = {}) {
    const isNew = !!(first || fresh);
    const inProgress = !first && !run().done && (totalStars() > 0 || run().time > 0);
    const t = isNew ? { kid: { name: '', avatar: U.pick(AVATARS) }, adult: { name: '', avatar: U.pick(AVATARS) } } : { kid: { ...D().kid }, adult: { ...D().adult } };
    if (t.adult.avatar === t.kid.avatar) t.adult.avatar = AVATARS[(AVATARS.indexOf(t.kid.avatar) + 1) % AVATARS.length];
    const card = (w, title) => `<div class="pcard ${w}">
      <h2>${title}</h2>
      <label>Name <input data-name="${w}" maxlength="14" value="${U.esc(t[w].name)}" placeholder="${w === 'kid' ? 'e.g. Sam' : 'e.g. Dad'}"></label>
      <div class="avatars" data-who="${w}">${AVATARS.map((x) => `<button class="${x === t[w].avatar ? 'on' : ''}" data-av="${x}">${x}</button>`).join('')}</div>
    </div>`;
    view.innerHTML = `<section class="setup">
      <h1>${first ? '👋 Welcome to Duo Quest!' : fresh ? '👥 New team' : '✏️ Edit team'}</h1>
      <p class="muted">Every challenge needs <b>both</b> of you. The kid sits on the left, the grown-up on the right.</p>
      ${fresh && inProgress ? `<p class="warnbox">⚠️ The current team's adventure isn't finished (⭐ ${totalStars()} · ⏱ ${longTime(run().time)}). Starting a new team ends it, and it won't go on the leaderboard.</p>` : ''}
      ${!isNew ? '<p class="muted small">Name changes keep your current adventure going.</p>' : ''}
      <div class="pcards">${card('kid', '🧒 The Kid')}${card('adult', '🧑 The Grown-up')}</div>
      <div class="row center"><button class="btn ghost" data-go="home">Cancel</button><button class="btn big" data-save>${isNew ? "Let's go! 🚀" : 'Save'}</button></div>
    </section>`;
    if (first) U.$('[data-go="home"]', view).remove();
    view.querySelectorAll('.avatars').forEach((g) => g.addEventListener('click', (e) => {
      const b = e.target.closest('[data-av]'); if (!b) return;
      U.sfx.tap(); t[g.dataset.who].avatar = b.dataset.av;
      g.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    }));
    U.$('[data-save]', view).onclick = () => {
      t.kid.name = U.$('[data-name=kid]').value.trim() || 'Kid';
      t.adult.name = U.$('[data-name=adult]').value.trim() || 'Grown-up';
      Object.assign(D(), { kid: t.kid, adult: t.adult, setup: true });
      if (isNew) startRun(); else U.save();
      U.sfx.good(); go('home');
    };
  }

  /* ---------- settings ---------- */
  function settings() {
    view.innerHTML = `<section class="panel">
      <h1>⚙️ Settings</h1>
      <div class="setrow"><span>✏️ Edit names & avatars (keeps this adventure)</span><button class="btn ghost" data-go="setup">Edit</button></div>
      <div class="setrow"><span>👥 Start over with a new team</span><button class="btn ghost" data-go="setup" data-fresh="1">New team</button></div>
      <div class="setrow"><span>🔊 Sound effects</span><button class="btn ghost" data-sound>${D().sound ? 'On' : 'Off'}</button></div>
      <div class="setrow"><span>🔁 Restart this team's adventure</span><button class="btn ghost danger" data-reset>Restart</button></div>
      <div class="setrow"><span>🧹 Clear the leaderboard</span><button class="btn ghost danger" data-clearboard>Clear</button></div>
      <h2>How to play</h2>
      <ul class="tips">
        <li>Sit side by side: the <b>kid on the left</b>, the <b>grown-up on the right</b>.</li>
        <li>Every challenge is built so you <b>must</b> work together: split controls, secret clues, matching answers, and staying in sync.</li>
        <li>Earn up to ⭐⭐⭐ per stage. One star unlocks the next stage.</li>
        <li>The adventure clock counts all the time you spend playing adventure stages, retries included. It pauses when you leave the app.</li>
        <li>Finish the last stage to put your team on the 🏆 leaderboard: most stars wins, and the fastest time breaks a tie.</li>
      </ul>
      <div class="row"><button class="btn" data-go="home">◀ Back</button></div>
    </section>`;
    U.$('[data-sound]').onclick = (e) => { D().sound = !D().sound; U.save(); e.target.textContent = D().sound ? 'On' : 'Off'; U.sfx.tap(); };
    U.$('[data-reset]').onclick = () => U.modal('<h2>Restart the adventure?</h2><p>Stars and the clock go back to zero for this team. The leaderboard stays.</p><div class="row end"><button class="btn ghost" data-close>Cancel</button><button class="btn danger" data-close="yes">Restart</button></div>')
      .then((r) => { if (r === 'yes') { startRun(); chips(); U.toast('Adventure restarted'); } });
    U.$('[data-clearboard]').onclick = () => U.modal('<h2>Clear the leaderboard?</h2><p>Every team on this device is removed from the leaderboard.</p><div class="row end"><button class="btn ghost" data-close>Cancel</button><button class="btn danger" data-close="yes">Clear</button></div>')
      .then((r) => { if (r === 'yes') { D().leaderboard = []; U.save(); U.toast('Leaderboard cleared'); } });
  }

  /* ---------- leaderboard ---------- */
  function boardTable(rows, highlightId, compact) {
    if (!rows.length) return '<p class="muted center">No teams yet. Finish the adventure to be the first one up here!</p>';
    const all = ranked();
    return `<ol class="board ${compact ? 'compact' : ''}">${rows.map((r) => {
      const rank = all.indexOf(r) + 1;
      return `<li class="${r.id === highlightId ? 'me' : ''}">
        <span class="rank">${rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}</span>
        <span class="team">${teamName(r)}${compact ? '' : `<small>${new Date(r.date).toLocaleDateString()}</small>`}</span>
        <span class="bstars">⭐ ${r.stars}<small>/${MAX_STARS}</small></span>
        <span class="btime">⏱ ${longTime(r.time)}</span></li>`;
    }).join('')}</ol>`;
  }
  function leaders() {
    view.innerHTML = `<section class="panel"><h1>🏆 Leaderboard</h1>
      <p class="muted">Teams that finished the whole adventure on this device. Most stars wins; the fastest time breaks a tie.</p>
      ${boardTable(ranked(), run().done ? run().id : null)}
      ${!run().done ? `<p class="muted small">${U.esc(D().kid.name)} & ${U.esc(D().adult.name)} so far: ⭐ ${totalStars()}/${MAX_STARS} · ⏱ ${longTime(run().time)}. Finish the adventure to get on the board!</p>` : ''}
      <div class="row"><button class="btn" data-go="home">◀ Back</button></div></section>`;
  }

  /* ---------- finale ---------- */
  function finale() {
    const r = run(), all = ranked(), rank = all.findIndex((x) => x.id === r.id) + 1;
    view.innerHTML = `<section class="results finale">
      <div class="big-emoji">🏆</div>
      <h1>Adventure complete!</h1>
      <div class="duo-avatars"><span>${U.esc(D().kid.avatar)}</span><b>🤝</b><span>${U.esc(D().adult.avatar)}</span></div>
      <p class="score">${U.esc(D().kid.name)} & ${U.esc(D().adult.name)} conquered Champions' Tower!</p>
      <div class="statrow big"><div><b>⭐ ${totalStars()}</b><span>of ${MAX_STARS} stars</span></div><div><b>⏱ ${longTime(r.time)}</b><span>total time</span></div><div><b>${rank ? `#${rank}` : '—'}</b><span>of ${all.length} team${all.length === 1 ? '' : 's'}</span></div></div>
      <h2>🏆 Leaderboard</h2>
      ${boardTable(all.slice(0, 10).concat(rank > 10 ? [all[rank - 1]] : []), r.id)}
      <h2>Play again?</h2>
      <p class="muted">Run it back with the same team to beat your score, or start fresh with new players.</p>
      ${againButtons()}
    </section>`;
    wireAgain();
    U.confetti(4000); U.sfx.fanfare();
  }

  /* ---------- adventure map ---------- */
  function map() {
    view.innerHTML = `<section class="map"><h1>🗺️ Adventure map</h1>
      <p class="map-sub">${U.esc(D().kid.name)} & ${U.esc(D().adult.name)} · ⭐ ${totalStars()}/${MAX_STARS} · ⏱ ${longTime(run().time)}${run().done ? ' · 🏆 Complete! Replays now are just for fun.' : ''}</p>
      ${CHAPTERS.map((ch) => {
      const st = stageList().filter((s) => s.ch === ch);
      const got = st.reduce((a, s) => a + starsOf(s.id), 0);
      return `<div class="chapter d${ch.d}"><div class="ch-h"><span class="ch-e">${ch.emoji}</span><div><h2>${ch.name}</h2><small>${ch.blurb}</small></div><span class="chip">⭐ ${got}/${st.length * 3}</span></div>
        <div class="trail">${st.map((s) => {
          const c = Challenges[s.type], open = unlocked(s.id), n = starsOf(s.id);
          return `<button class="node ${open ? '' : 'locked'} ${n ? 'done' : ''} ${s.type === 'escape' ? 'boss' : ''}" ${open ? `data-go="play" data-stage="${s.id}"` : 'disabled'}>
            <span class="ne">${open ? c.emoji : '🔒'}</span><span class="nn">${stageName(s)}</span>
            <span class="ns">${'★'.repeat(n)}${'☆'.repeat(3 - n)}</span></button>`;
        }).join('<span class="link"></span>')}</div></div>`;
    }).join('')}</section>`;
  }

  /* ---------- free play ---------- */
  function free() {
    const last = D().freeD || 2;
    view.innerHTML = `<section class="panel"><h1>🎲 Free play</h1>
      <p class="muted">Pick any challenge and a difficulty. Free play doesn't change your adventure stars or clock.</p>
      <div class="seg" data-d>${[1, 2, 3, 4].map((d) => `<button data-dv="${d}" class="${d === last ? 'on' : ''}">${['', '🌱 Easy', '🌿 Medium', '🌳 Hard', '🔥 Expert'][d]}</button>`).join('')}</div>
      <div class="freegrid">${ORDER.flatMap((t) => (t === 'escape' ? Object.keys(Rooms).map((r) => [t, r]) : [[t]])).map(([t, r]) => {
        const c = Challenges[t];
        return `<button class="fcard" data-t="${t}" ${r ? `data-room="${r}"` : ''}><span class="e">${r ? Rooms[r].emoji : c.emoji}</span><b>${r ? Rooms[r].name : c.name}</b><small>${c.kind}</small></button>`;
      }).join('')}</div></section>`;
    const seg = U.$('[data-d]', view);
    seg.addEventListener('click', (e) => { const b = e.target.closest('[data-dv]'); if (!b) return; U.sfx.tap(); D().freeD = +b.dataset.dv; U.save(); seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); });
    view.querySelectorAll('.fcard').forEach((b) => b.addEventListener('click', () => { U.sfx.tap(); go('play', { type: b.dataset.t, room: b.dataset.room, d: String(D().freeD || 2) }); }));
  }

  /* ---------- challenge runner ---------- */
  /* Counts only time the app is on screen, so a sleeping iPad doesn't run up the clock. */
  function stopwatch() {
    let total = 0, since = document.hidden ? null : performance.now();
    const onVis = () => {
      if (document.hidden && since !== null) { total += performance.now() - since; since = null; }
      else if (!document.hidden && since === null) since = performance.now();
    };
    document.addEventListener('visibilitychange', onVis);
    return { stop() { onVis(); if (since !== null) total += performance.now() - since; since = null; document.removeEventListener('visibilitychange', onVis); return total / 1000; } };
  }

  function play(args) {
    const stage = args.stage ? stageList().find((s) => s.id === args.stage) : null;
    const type = stage ? stage.type : args.type;
    const d = stage ? stage.ch.d : +args.d || 2;
    const room = stage ? stage.room : args.room;
    const c = Challenges[type];
    const title = type === 'escape' && room ? Rooms[room].name : c.name;
    const counts = stage && !run().done;
    view.innerHTML = `<section class="intro">
      <div class="intro-e">${type === 'escape' && room ? Rooms[room].emoji : c.emoji}</div>
      <h1>${title}</h1>
      <p class="kindline">${c.kind} · ${['', '🌱 Easy', '🌿 Medium', '🌳 Hard', '🔥 Expert'][d]}${stage ? ` · ${stage.ch.emoji} ${stage.ch.name}` : ''}</p>
      <div class="coop"><b>🤝 How you work together</b><p>${c.coop}</p></div>
      <div class="sides"><div>${U.tag('kid')}<small>sits on the left</small></div><div>${U.tag('adult')}<small>sits on the right</small></div></div>
      ${counts ? '<p class="muted small">⏱ The adventure clock runs from when you press Start.</p>' : ''}
      <div class="row center"><button class="btn ghost" data-go="${stage ? 'map' : 'free'}">◀ Back</button><button class="btn big" data-start>Start! 🚀</button></div>
    </section>`;
    U.$('[data-start]').onclick = () => {
      U.sfx.tap();
      document.body.dataset.screen = 'game';
      view.innerHTML = `<section class="game"><div class="gbar"><button class="btn ghost small" data-quit>✕</button><b>${c.emoji} ${title}</b><span class="hud"></span></div><div class="stage"></div></section>`;
      const hud = U.$('.hud', view);
      const sw = stopwatch();
      let spent = null;
      /* Add this attempt's time to the adventure clock exactly once, whether it ends by finishing or quitting. */
      const bank = () => { if (spent === null) { spent = sw.stop(); if (counts) { run().time += spent; U.save(); } } return spent; };
      cleanups.push(bank);
      U.$('[data-quit]').onclick = () => U.modal(`<h2>Leave this challenge?</h2><p>Your progress in this challenge will be lost.${counts ? ' The time you spent still counts on the adventure clock.' : ''}</p><div class="row end"><button class="btn ghost" data-close>Keep playing</button><button class="btn danger" data-close="yes">Leave</button></div>`)
        .then((r) => r === 'yes' && go(stage ? 'map' : 'free'));
      let done = false;
      const ctx = {
        d, room,
        hud: (t) => { hud.textContent = t; },
        onCleanup: (f) => cleanups.push(f),
        finish: (res) => { if (done) return; done = true; const secs = bank(); cleanup(); results(res, { stage, type, d, room, title, secs, counts }); },
      };
      c.run(U.$('.stage', view), ctx);
    };
  }

  /* ---------- results ---------- */
  function results(res, { stage, type, d, room, title, secs, counts }) {
    document.body.dataset.screen = 'results';
    let best = false;
    if (counts && res.stars > starsOf(stage.id)) { run().stars[stage.id] = res.stars; best = true; }
    const L = stageList();
    const next = stage && L[L.findIndex((s) => s.id === stage.id) + 1];
    /* Clearing the final stage ends the adventure and puts the team on the leaderboard. */
    if (counts && !next && res.stars > 0) {
      const r = run();
      r.done = true;
      D().leaderboard.push({ id: r.id, kid: { ...D().kid }, adult: { ...D().adult }, stars: totalStars(), time: Math.round(r.time), date: Date.now() });
    }
    U.save(); chips();
    const msg = res.stars === 3 ? 'PERFECT TEAMWORK! 🏆' : res.stars === 2 ? 'Awesome job, team! 🎉' : res.stars === 1 ? 'You did it! 👏' : 'So close — try again! 💪';
    view.innerHTML = `<section class="results">
      <h1>${msg}</h1>
      <div class="stars-big pop">${[0, 1, 2].map((i) => `<span class="${i < res.stars ? 'on' : ''}" style="animation-delay:${i * 0.25}s">★</span>`).join('')}</div>
      <p class="score">Team score: <b>${res.score}</b> · ⏱ ${longTime(secs)}${best ? ' · <span class="chip">New best stars!</span>' : ''}</p>
      ${counts ? `<p class="muted">Adventure so far: ⭐ ${totalStars()}/${MAX_STARS} · ⏱ ${longTime(run().time)}</p>` : ''}
      <div class="duo-avatars small"><span>${U.esc(D().kid.avatar)}</span><b>🤝</b><span>${U.esc(D().adult.avatar)}</span></div>
      <details ${res.lines.length <= 3 ? 'open' : ''}><summary>What happened</summary><ul>${res.lines.map((l) => `<li>${U.esc(l)}</li>`).join('')}</ul></details>
      <div class="row center wrap">
        <button class="btn ghost" data-retry>↻ Try again</button>
        ${stage ? '<button class="btn ghost" data-go="map">🗺️ Map</button>' : '<button class="btn ghost" data-go="free">🎲 Free play</button>'}
        ${next && res.stars > 0 ? `<button class="btn big" data-go="play" data-stage="${next.id}">Next: ${Challenges[next.type].emoji} ${stageName(next)} ▶</button>` : ''}
        ${counts && !next && res.stars > 0 ? '<button class="btn big" data-go="finale">🏆 See the leaderboard ▶</button>' : ''}
      </div></section>`;
    U.$('[data-retry]').onclick = () => { U.sfx.tap(); go('play', stage ? { stage: stage.id } : { type, room, d: String(d) }); };
    if (res.stars >= 2) { U.confetti(); U.sfx.fanfare(); } else if (res.stars) U.sfx.good();
  }

  window.addEventListener('beforeunload', cleanup);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  go('home');
})();
