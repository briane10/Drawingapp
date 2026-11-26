/* Screens: team setup, adventure map, free play, challenge runner, results. */
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
  const starsOf = (id) => D().stars[id] || 0;
  const totalStars = () => Object.values(D().stars).reduce((a, b) => a + b, 0);
  const unlocked = (id) => { const L = stageList(), k = L.findIndex((s) => s.id === id); return k <= 0 || starsOf(L[k - 1].id) > 0; };

  function chips() {
    U.$('#chips').innerHTML = `<span class="chip">⭐ ${totalStars()}</span><button class="chip btnchip" data-go="settings" aria-label="Settings">⚙️</button>`;
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
    ({ home, setup, settings, map, play, free } [name] || home)(args);
    scrollTo(0, 0);
  }

  /* ---------- home ---------- */
  function home() {
    if (!D().setup) return setup({ first: true });
    const k = D().kid, a = D().adult;
    const next = stageList().find((s) => !starsOf(s.id) && unlocked(s.id));
    view.innerHTML = `<section class="hero">
      <div class="duo-avatars"><span>${U.esc(k.avatar)}</span><b>+</b><span>${U.esc(a.avatar)}</span></div>
      <h1>${U.esc(k.name)} & ${U.esc(a.name)}</h1>
      <p class="muted">A team adventure for a kid and a grown-up. Draw, think, solve and escape — together!</p>
      <div class="hero-btns">
        ${next ? `<button class="btn big" data-go="play" data-stage="${next.id}">▶ ${starsOf(stageList()[0].id) ? 'Continue' : 'Start'} the adventure</button>` : '<div class="chip">🏆 Every stage cleared!</div>'}
        <button class="btn big ghost" data-go="map">🗺️ Adventure map</button>
        <button class="btn big ghost" data-go="free">🎲 Free play</button>
      </div>
    </section>
    <section class="kinds">${ORDER.map((t) => { const c = Challenges[t]; return `<div class="kind"><span>${c.emoji}</span><b>${c.name}</b><small>${c.blurb}</small></div>`; }).join('')}</section>
    <p class="center muted small">Best on an iPad, sitting side by side. ${U.esc(k.name)} sits on the <b>left</b>, ${U.esc(a.name)} on the <b>right</b>.</p>`;
  }

  /* ---------- team setup ---------- */
  function setup({ first } = {}) {
    const t = { kid: { ...D().kid }, adult: { ...D().adult } };
    const card = (w, title) => `<div class="pcard ${w}">
      <h2>${title}</h2>
      <label>Name <input data-name="${w}" maxlength="14" value="${U.esc(D().setup ? t[w].name : '')}" placeholder="${w === 'kid' ? 'e.g. Sam' : 'e.g. Dad'}"></label>
      <div class="avatars" data-who="${w}">${AVATARS.map((x) => `<button class="${x === t[w].avatar ? 'on' : ''}" data-av="${x}">${x}</button>`).join('')}</div>
    </div>`;
    view.innerHTML = `<section class="setup">
      <h1>${first ? '👋 Welcome to Duo Quest!' : '👥 Your team'}</h1>
      <p class="muted">Every challenge needs <b>both</b> of you. The kid sits on the left, the grown-up on the right.</p>
      <div class="pcards">${card('kid', '🧒 The Kid')}${card('adult', '🧑 The Grown-up')}</div>
      <div class="row center"><button class="btn big" data-save>${first ? "Let's go! 🚀" : 'Save'}</button></div>
    </section>`;
    view.querySelectorAll('.avatars').forEach((g) => g.addEventListener('click', (e) => {
      const b = e.target.closest('[data-av]'); if (!b) return;
      U.sfx.tap(); t[g.dataset.who].avatar = b.dataset.av;
      g.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    }));
    U.$('[data-save]', view).onclick = () => {
      t.kid.name = U.$('[data-name=kid]').value.trim() || 'Kid';
      t.adult.name = U.$('[data-name=adult]').value.trim() || 'Grown-up';
      Object.assign(D(), { kid: t.kid, adult: t.adult, setup: true }); U.save();
      U.sfx.good(); go('home');
    };
  }

  /* ---------- settings ---------- */
  function settings() {
    view.innerHTML = `<section class="panel">
      <h1>⚙️ Settings</h1>
      <div class="setrow"><span>👥 Team names & avatars</span><button class="btn ghost" data-go="setup">Edit</button></div>
      <div class="setrow"><span>🔊 Sound effects</span><button class="btn ghost" data-sound>${D().sound ? 'On' : 'Off'}</button></div>
      <div class="setrow"><span>🗑️ Reset all stars</span><button class="btn ghost danger" data-reset>Reset</button></div>
      <h2>How to play</h2>
      <ul class="tips">
        <li>Sit side by side: the <b>kid on the left</b>, the <b>grown-up on the right</b>.</li>
        <li>Every challenge is built so you <b>must</b> work together: split controls, secret clues, matching answers, and staying in sync.</li>
        <li>Earn up to ⭐⭐⭐ per stage. One star unlocks the next stage.</li>
        <li>Puzzles, mazes, crosswords and escape-room codes are different every time you play.</li>
      </ul>
      <div class="row"><button class="btn" data-go="home">◀ Back</button></div>
    </section>`;
    U.$('[data-sound]').onclick = (e) => { D().sound = !D().sound; U.save(); e.target.textContent = D().sound ? 'On' : 'Off'; U.sfx.tap(); };
    U.$('[data-reset]').onclick = async () => {
      U.modal('<h2>Reset all stars?</h2><p>This locks the adventure map again. Team names stay.</p><div class="row end"><button class="btn ghost" data-close>Cancel</button><button class="btn danger" data-close="yes">Reset</button></div>')
        .then((r) => { if (r === 'yes') { D().stars = {}; D().best = {}; U.save(); chips(); U.toast('Stars reset'); } });
    };
  }

  /* ---------- adventure map ---------- */
  function map() {
    view.innerHTML = `<section class="map"><h1>🗺️ Adventure map</h1>${CHAPTERS.map((ch) => {
      const st = stageList().filter((s) => s.ch === ch);
      const got = st.reduce((a, s) => a + starsOf(s.id), 0);
      return `<div class="chapter d${ch.d}"><div class="ch-h"><span class="ch-e">${ch.emoji}</span><div><h2>${ch.name}</h2><small>${ch.blurb}</small></div><span class="chip">⭐ ${got}/${st.length * 3}</span></div>
        <div class="trail">${st.map((s) => {
          const c = Challenges[s.type], open = unlocked(s.id), n = starsOf(s.id);
          return `<button class="node ${open ? '' : 'locked'} ${n ? 'done' : ''} ${s.type === 'escape' ? 'boss' : ''}" ${open ? `data-go="play" data-stage="${s.id}"` : 'disabled'}>
            <span class="ne">${open ? c.emoji : '🔒'}</span><span class="nn">${s.type === 'escape' && s.room ? Rooms[s.room].name : c.name}</span>
            <span class="ns">${'★'.repeat(n)}${'☆'.repeat(3 - n)}</span></button>`;
        }).join('<span class="link"></span>')}</div></div>`;
    }).join('')}</section>`;
  }

  /* ---------- free play ---------- */
  function free() {
    const last = D().freeD || 2;
    view.innerHTML = `<section class="panel"><h1>🎲 Free play</h1>
      <p class="muted">Pick any challenge and a difficulty. Free play doesn't change your adventure stars.</p>
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
  function play(args) {
    const stage = args.stage ? stageList().find((s) => s.id === args.stage) : null;
    const type = stage ? stage.type : args.type;
    const d = stage ? stage.ch.d : +args.d || 2;
    const room = stage ? stage.room : args.room;
    const c = Challenges[type];
    const title = type === 'escape' && room ? Rooms[room].name : c.name;
    view.innerHTML = `<section class="intro">
      <div class="intro-e">${type === 'escape' && room ? Rooms[room].emoji : c.emoji}</div>
      <h1>${title}</h1>
      <p class="kindline">${c.kind} · ${['', '🌱 Easy', '🌿 Medium', '🌳 Hard', '🔥 Expert'][d]}${stage ? ` · ${stage.ch.emoji} ${stage.ch.name}` : ''}</p>
      <div class="coop"><b>🤝 How you work together</b><p>${c.coop}</p></div>
      <div class="sides"><div>${U.tag('kid')}<small>sits on the left</small></div><div>${U.tag('adult')}<small>sits on the right</small></div></div>
      <div class="row center"><button class="btn ghost" data-go="${stage ? 'map' : 'free'}">◀ Back</button><button class="btn big" data-start>Start! 🚀</button></div>
    </section>`;
    U.$('[data-start]').onclick = () => {
      U.sfx.tap();
      document.body.dataset.screen = 'game';
      view.innerHTML = `<section class="game"><div class="gbar"><button class="btn ghost small" data-quit>✕</button><b>${c.emoji} ${title}</b><span class="hud"></span></div><div class="stage"></div></section>`;
      const hud = U.$('.hud', view);
      U.$('[data-quit]').onclick = () => U.modal('<h2>Leave this challenge?</h2><p>Your progress in this challenge will be lost.</p><div class="row end"><button class="btn ghost" data-close>Keep playing</button><button class="btn danger" data-close="yes">Leave</button></div>')
        .then((r) => r === 'yes' && go(stage ? 'map' : 'free'));
      let done = false;
      const ctx = {
        d, room,
        hud: (t) => { hud.textContent = t; },
        onCleanup: (f) => cleanups.push(f),
        finish: (res) => { if (done) return; done = true; cleanup(); results(res, { stage, type, d, room, title, c }); },
      };
      c.run(U.$('.stage', view), ctx);
    };
  }

  /* ---------- results ---------- */
  function results(res, { stage, type, d, room, title, c }) {
    document.body.dataset.screen = 'results';
    let best = false;
    if (stage && res.stars > starsOf(stage.id)) { D().stars[stage.id] = res.stars; best = true; }
    if (stage) D().best[stage.id] = Math.max(D().best[stage.id] || 0, res.score);
    U.save(); chips();
    const L = stageList();
    const next = stage && L[L.findIndex((s) => s.id === stage.id) + 1];
    const msg = res.stars === 3 ? 'PERFECT TEAMWORK! 🏆' : res.stars === 2 ? 'Awesome job, team! 🎉' : res.stars === 1 ? 'You did it! 👏' : 'So close — try again! 💪';
    view.innerHTML = `<section class="results">
      <h1>${msg}</h1>
      <div class="stars-big pop">${[0, 1, 2].map((i) => `<span class="${i < res.stars ? 'on' : ''}" style="animation-delay:${i * 0.25}s">★</span>`).join('')}</div>
      <p class="score">Team score: <b>${res.score}</b>${best ? ' · <span class="chip">New best stars!</span>' : ''}</p>
      <div class="duo-avatars small"><span>${U.esc(D().kid.avatar)}</span><b>🤝</b><span>${U.esc(D().adult.avatar)}</span></div>
      <details ${res.lines.length <= 3 ? 'open' : ''}><summary>What happened</summary><ul>${res.lines.map((l) => `<li>${U.esc(l)}</li>`).join('')}</ul></details>
      <div class="row center wrap">
        <button class="btn ghost" data-retry>↻ Try again</button>
        ${stage ? '<button class="btn ghost" data-go="map">🗺️ Map</button>' : '<button class="btn ghost" data-go="free">🎲 Free play</button>'}
        ${next && res.stars > 0 ? `<button class="btn big" data-go="play" data-stage="${next.id}">Next: ${Challenges[next.type].emoji} ${next.type === 'escape' && next.room ? Rooms[next.room].name : Challenges[next.type].name} ▶</button>` : ''}
        ${stage && !next && res.stars > 0 ? '<button class="btn big" data-go="home">🏆 Finish</button>' : ''}
      </div></section>`;
    U.$('[data-retry]').onclick = () => { U.sfx.tap(); go('play', stage ? { stage: stage.id } : { type, room, d: String(d) }); };
    if (res.stars >= 2) { U.confetti(); U.sfx.fanfare(); } else if (res.stars) U.sfx.good();
    if (stage && !next && res.stars > 0 && best) setTimeout(() => U.modal(`<div class="center"><div class="big-emoji">🏆</div><h2>You conquered Champions' Tower!</h2><p>${U.esc(D().kid.name)} and ${U.esc(D().adult.name)} are an unstoppable team. Go back and collect every star!</p><div class="row center"><button class="btn big" data-close>Woo-hoo!</button></div></div>`), 1200);
  }

  window.addEventListener('beforeunload', cleanup);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  go('home');
})();
