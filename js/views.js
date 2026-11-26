/* Screens. Each view renders into #view. */
(function (DA) {
  'use strict';
  const U = DA.util, ui = DA.ui, C = DA.course, St = DA.store;
  const el = U.el;
  const V = {};

  function header(title, sub) { return el('div', { class: 'page-head' }, [el('h1', { html: title }), sub ? el('p', { class: 'muted', html: sub }) : null]); }

  function rankCard() {
    const s = St.state, r = St.rankFor(s.xp);
    return el('div', { class: 'card rank-card' }, [
      el('div', { class: 'rank-emoji', text: r.cur.emoji }),
      el('div', { class: 'grow' }, [
        el('div', { class: 'rank-name', html: `<b>${r.cur.name}</b> <span class="muted">· ${s.xp} XP</span>` }),
        el('div', { class: 'bar' }, el('div', { class: 'fill', style: `width:${Math.round(r.pct * 100)}%` })),
        el('div', { class: 'muted small', text: r.next ? `${r.next.xp - s.xp} XP to ${r.next.emoji} ${r.next.name}` : 'Top rank reached — legendary!' }),
      ]),
    ]);
  }

  function lessonStateIcon(l) {
    const st = St.lesson(l.id);
    return st.passed ? ui.stars(st.stars) : '';
  }

  // ===================== HOME =====================
  V.home = function (root) {
    const s = St.state, name = s.settings.name;
    const next = St.nextLesson();
    const daily = St.dailyPlan();
    const streak = St.currentStreak();
    const hour = new Date().getHours();
    const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    root.append(
      el('div', { class: 'hero' }, [
        el('div', { class: 'hero-pip', html: ui.mascot('cheer', 70) }),
        el('div', {}, [
          el('h1', { text: `${hello}${name ? ', ' + name : ''}!` }),
          el('p', { class: 'muted', text: streak ? `🔥 ${streak}-day streak! Draw today to keep it going.` : 'Ready to draw something awesome today?' }),
        ]),
      ]),
      rankCard(),
    );

    const grid = el('div', { class: 'home-grid' });
    if (next) {
      const w = C.WORLDS[next.wi];
      grid.appendChild(el('a', { class: 'card big-card continue', href: '#/lesson/' + next.id, style: `--c:${w.color}` }, [
        el('div', { class: 'tag', text: `${w.emoji} ${w.name}` }),
        el('div', { class: 'big-emoji', text: next.emoji }),
        el('h2', { text: next.title }),
        el('p', { text: next.intro }),
        el('span', { class: 'btn primary', text: St.lesson(next.id).attempts ? 'Continue ▶' : 'Start lesson ▶' }),
      ]));
    } else {
      grid.appendChild(el('div', { class: 'card big-card' }, [el('div', { class: 'big-emoji', text: '🏆' }), el('h2', { text: 'You finished every lesson!' }), el('p', { text: 'Keep getting better: chase 3 stars, do daily warm-ups and draw from real life.' })]));
    }

    const dItems = daily.items.map((id) => {
      const l = C.byId[id], done = daily.done.includes(id);
      return el('li', { class: done ? 'done' : '' }, [el('span', { text: done ? '✅' : l.emoji }), el('span', { text: l.title })]);
    });
    grid.appendChild(el('div', { class: 'card daily-card' }, [
      el('h2', { text: '☀️ Daily Warm-Up' }),
      el('p', { class: 'muted', text: daily.complete ? 'Done for today — awesome! Come back tomorrow.' : '3 quick drills · about 5 minutes' }),
      el('ul', { class: 'daily-list' }, dItems),
      daily.complete ? el('a', { class: 'btn', href: '#/daily', text: 'Do it again' }) : el('a', { class: 'btn primary', href: '#/daily', text: daily.done.length ? 'Keep going ▶' : 'Start warm-up ▶' }),
    ]));
    root.appendChild(grid);

    // quick practice
    root.appendChild(el('h2', { class: 'section', text: '🎯 Quick practice' }));
    const qp = el('div', { class: 'chips' });
    PRACTICE.slice(0, 6).forEach((p) => qp.appendChild(el('a', { class: 'chip-card', href: '#/practice/' + p.id }, [el('span', { class: 'e', text: p.emoji }), el('span', { text: p.name })])));
    root.appendChild(qp);

    // badges
    const got = St.BADGES.filter((b) => s.badges[b.id]);
    if (got.length) {
      root.appendChild(el('h2', { class: 'section', text: '🏅 Your badges' }));
      root.appendChild(el('div', { class: 'badges' }, got.slice(-8).map((b) => el('div', { class: 'badge on', title: b.desc }, [el('span', { class: 'e', text: b.emoji }), el('span', { text: b.name })]))));
    }
  };

  // ===================== MAP =====================
  V.path = function (root) {
    root.appendChild(header('🗺️ Your Drawing Quest', `Travel through ${C.WORLDS.length} worlds — from your first line to realistic, expert-level drawing.`));
    const next = St.nextLesson();
    C.WORLDS.forEach((w, wi) => {
      const open = St.worldUnlocked(wi);
      const passed = w.lessons.filter((l) => St.lesson(l.id).passed).length;
      const sec = el('section', { class: 'world' + (open ? '' : ' locked') + (w.boss ? ' boss-world' : ''), style: `--c:${w.color}` });
      sec.appendChild(el('div', { class: 'world-head' }, [
        el('div', { class: 'world-emoji', text: open ? w.emoji : '🔒' }),
        el('div', { class: 'grow' }, [
          el('h2', { text: `World ${wi + 1}: ${w.name}` }),
          el('p', { class: 'muted', text: open ? w.blurb : `Pass ${Math.ceil(C.WORLDS[wi - 1].lessons.length * 0.75)} lessons in ${C.WORLDS[wi - 1].name} to unlock.` }),
        ]),
        el('div', { class: 'world-count', text: `${passed}/${w.lessons.length}` }),
      ]));
      const trail = el('div', { class: 'trail' });
      w.lessons.forEach((l, li) => {
        const st = St.lesson(l.id);
        const isNext = next && next.id === l.id;
        const node = el(open ? 'a' : 'div', {
          class: 'node' + (st.passed ? ' passed' : '') + (isNext ? ' next' : '') + (l.animal ? ' animal' : ''),
          href: open ? '#/lesson/' + l.id : null,
          style: `--off:${Math.sin(li * 1.3) * 28}px`,
        }, [
          el('div', { class: 'node-circle', text: l.emoji }),
          el('div', { class: 'node-title', text: l.title }),
          l.animal ? el('div', { class: 'node-real', text: DA.animals.REALISM[DA.animals.ANIMALS[l.animal].realism].emoji + ' ' + DA.animals.REALISM[DA.animals.ANIMALS[l.animal].realism].name }) : null,
          el('div', { class: 'node-stars', html: st.passed ? ui.stars(st.stars) : isNext ? '<span class="go">START</span>' : '' }),
        ]);
        trail.appendChild(node);
      });
      sec.appendChild(trail);
      root.appendChild(sec);
    });
  };

  // ===================== LESSON =====================
  V.lesson = function (root, id, opts) {
    opts = opts || {};
    const l = C.byId[id];
    if (!l) { location.hash = '#/path'; return; }
    if (!St.worldUnlocked(l.wi) && !opts.daily) { ui.toast('🔒 This world is still locked!'); location.hash = '#/path'; return; }
    const w = C.WORLDS[l.wi];
    const st = St.lesson(l.id);
    const intro = el('div', { class: 'lesson-intro', style: `--c:${w.color}` }, [
      el('a', { class: 'back', href: opts.daily ? '#/' : '#/path', text: '← Back' }),
      el('div', { class: 'tag', text: `${w.emoji} ${w.name} · ${C.SKILLS[l.skill].emoji} ${C.SKILLS[l.skill].name}` }),
      el('div', { class: 'big-emoji', text: l.emoji }),
      el('h1', { text: l.title }),
      el('p', { class: 'lead', text: l.intro }),
      st.attempts ? el('p', { class: 'muted', html: `Best: <b>${st.best}</b> ${ui.stars(st.stars)}` }) : null,
      el('div', { class: 'card theory', html: l.theory }),
      l.animal ? realismBadge(DA.animals.ANIMALS[l.animal].realism) : null,
      l.ex.mode === 'boss' ? realismBadge(5) : null,
      l.animal ? el('div', { class: 'card steps-preview' }, [
        el('b', { text: `${DA.animals.ANIMALS[l.animal].steps.length} steps${DA.animals.ANIMALS[l.animal].realism >= 3 ? ' + shading' : ''}${DA.animals.ANIMALS[l.animal].realism >= 4 ? ' + fur & eyes' : ''} + a final challenge` }),
        el('ol', {}, DA.animals.ANIMALS[l.animal].steps.map((s) => el('li', { text: s.say }))),
      ]) : null,
      el('button', { class: 'btn primary huge', text: "✏️ Let's draw!", onclick: () => start() }),
    ]);
    root.appendChild(intro);

    async function start() {
      let resume = null;
      if (l.ex.mode === 'boss') {
        const saved = await St.loadProject(l.id);
        if (saved) {
          resume = await new Promise((res) => {
            const m = ui.modal(el('div', { class: 'center' }, [
              el('h2', { text: '👑 Continue your boss fight?' }),
              el('p', { class: 'muted', text: 'Saved ' + new Date(saved.t).toLocaleString() }),
              el('div', { class: 'row center' }, [
                el('button', { class: 'btn danger', text: 'Start over', onclick: () => { m.close(); St.deleteProject(l.id); res(null); } }),
                el('button', { class: 'btn primary big', text: 'Continue ▶', onclick: () => { m.close(); res(saved); } }),
              ]),
            ]), { dismiss: false });
          });
        }
      }
      document.body.classList.add('drawing');
      root.innerHTML = '';
      const host = el('div', { class: 'ex-host' });
      root.appendChild(host);
      const ex = Object.assign({}, l.ex);
      if (opts.daily && ex.rounds) ex.rounds = Math.min(2, ex.rounds);
      const runner = new DA.Runner(host, {
        ex, lesson: l, resume,
        onExit: () => { runner.destroy(); document.body.classList.remove('drawing'); opts.onExit ? opts.onExit() : DA.app.route(); },
        onDone: (r) => {
          runner.destroy();
          document.body.classList.remove('drawing');
          if (l.ex.mode === 'boss') St.deleteProject(l.id);
          const res = St.record({ lessonId: l.id, score: r.score, secs: r.secs, gesture: r.gesture });
          St.addDrawing({ title: l.title, emoji: l.emoji, lessonId: l.id, animal: l.animal || null, score: r.score, img: r.snapshot });
          celebrate(l, r, res, opts);
        },
      });
      DA.app.current = runner;
    }
    if (opts.autostart) start();
  };

  function realismBadge(n) {
    const R = DA.animals.REALISM[n];
    let m = ''; for (let i = 1; i <= 5; i++) m += `<i class="${i <= n ? 'on' : ''}"></i>`;
    return el('div', { class: 'realism', title: R.desc, html: `Realism: <span class="realism-meter">${m}</span> ${R.emoji} ${R.name} <span class="muted">· ${R.desc}</span>` });
  }

  function celebrate(l, r, res, opts) {
    const stars = DA.store.starsFor(r.score);
    if (stars >= 1) ui.confetti(stars * 60);
    ui.sound(res.rankUp ? 'level' : stars >= 2 ? 'great' : stars ? 'good' : 'ok');
    const next = St.nextLesson();
    const box = el('div', { class: 'celebrate' }, [
      el('div', { class: 'pip-big', html: ui.mascot(stars >= 2 ? 'cheer' : stars ? 'happy' : 'think', 80) }),
      el('h2', { text: l.id && l.id.startsWith('boss') && stars ? '👑 BOSS DEFEATED! 👑' : ui.praise(r.score) }),
      el('div', { class: 'score-huge', html: `${r.score}<small>/100</small>` }),
      el('div', { class: 'stars-big', html: ui.stars(stars) }),
      el('div', { class: 'xp-gain', text: `+${res.xp} XP` }),
      res.firstPass ? el('div', { class: 'note good', text: '🎉 Lesson passed! New stuff unlocked on your map.' }) : null,
      !stars ? el('div', { class: 'note', text: 'Score 60 or more to pass. Try again — you\'re learning every time!' }) : null,
      res.rankUp ? el('div', { class: 'note level', html: `⬆️ <b>Level up!</b> You are now ${res.rankUp.emoji} <b>${res.rankUp.name}</b>!` }) : null,
      ...res.badges.map((b) => el('div', { class: 'note badge-note', html: `${b.emoji} New badge: <b>${b.name}</b> — ${b.desc}` })),
      r.snapshot ? el('img', { class: 'celebrate-img', src: r.snapshot, alt: 'Your drawing' }) : null,
    ]);
    const row = el('div', { class: 'row center wrap' });
    const m = ui.modal(el('div', {}, [box, row]), { dismiss: false });
    const go = (h) => { m.close(); if (location.hash === h) DA.app.route(); else location.hash = h; };
    if (opts.daily) row.append(el('button', { class: 'btn primary big', text: 'Continue warm-up ▶', onclick: () => { m.close(); opts.onNext(); } }));
    else {
      row.append(el('button', { class: 'btn', text: '↻ Try again', onclick: () => { m.close(); DA.app.route({ autostart: true }); } }));
      row.append(el('button', { class: 'btn', text: '🗺️ Map', onclick: () => go('#/path') }));
      if (next && next.id !== l.id) row.append(el('button', { class: 'btn primary big', text: `Next: ${next.emoji} ${next.title} ▶`, onclick: () => go('#/lesson/' + next.id) }));
    }
  }

  // ===================== DAILY =====================
  V.daily = function (root) {
    const d = St.dailyPlan();
    const todo = d.items.filter((id) => !d.done.includes(id));
    const queue = todo.length ? todo : d.items.slice();
    let i = 0;
    const runNext = () => {
      if (i >= queue.length) {
        ui.confetti(150); ui.sound('level');
        const m = ui.modal(el('div', { class: 'celebrate' }, [
          el('div', { class: 'pip-big', html: ui.mascot('cheer', 80) }),
          el('h2', { text: 'Warm-up complete! ☀️' }),
          el('p', { text: `Streak: 🔥 ${St.currentStreak()} day${St.currentStreak() === 1 ? '' : 's'}` }),
          el('div', { class: 'row center' }, [el('button', { class: 'btn primary big', text: 'Back home', onclick: () => { m.close(); location.hash = '#/'; } })]),
        ]), { dismiss: false });
        return;
      }
      const id = queue[i++];
      root.innerHTML = '';
      V.lesson(root, id, {
        daily: true, autostart: true,
        onExit: () => { location.hash = '#/'; },
        onNext: () => {
          const fin = St.dailyDone(id);
          if (fin) St.record({ kind: 'daily-bonus', score: 100, baseXp: 50, drawings: 0, noScore: true });
          runNext();
        },
      });
    };
    runNext();
  };

  // ===================== PRACTICE =====================
  const PRACTICE = [
    { id: 'free', emoji: '🎨', name: 'Free Draw', desc: 'A blank page. Draw anything!', ex: { mode: 'sandbox' } },
    { id: 'lines', emoji: '📏', name: 'Line Drills', desc: 'Ghost lines between dots.', ex: { mode: 'ghost', gen: 'lines', params: { n: 8 }, rounds: 3, tol: [7, 26], say: 'Connect the two dots with the <b>same color and number</b> using one straight line.' }, skill: 'line' },
    { id: 'circles', emoji: '⭕', name: 'Circle Drills', desc: 'How round can you go?', ex: { mode: 'circles', count: 5, rounds: 2, startLevel: 1 }, skill: 'line' },
    { id: 'gesture30', emoji: '💃', name: 'Gesture: 30s', desc: '5 quick poses, 30 seconds each.', ex: { mode: 'gesture', gen: 'mannequin', count: 5, seconds: 30 }, skill: 'figure' },
    { id: 'boxes', emoji: '📦', name: 'Box Challenge', desc: 'Copy boxes from any angle.', ex: { mode: 'copy', gen: 'box', params: {}, rounds: 5, tol: [9, 34], say: 'Copy the box on the right side.' }, skill: 'form' },
    { id: 'shading', emoji: '🌗', name: 'Shading Study', desc: 'Match the light and shadow.', ex: { mode: 'shade', gen: 'shadedRandom', rounds: 2, say: 'Shade the shape to match the reference.' }, skill: 'light' },
    { id: 'memory', emoji: '🧠', name: 'Memory Game', desc: 'Look, remember, draw.', ex: { mode: 'flash', gen: 'shapes', params: { n: 4 }, rounds: 3, flash: 5, tol: [10, 40], say: 'Draw the shapes from memory.' }, skill: 'shape' },
    { id: 'forms', emoji: '🧊', name: 'Form Copy', desc: 'Boxes, cylinders and spheres.', ex: { mode: 'copy', gen: 'formRandom', params: {}, rounds: 4, tol: [9, 34], say: 'Copy the 3D form on the right side.' }, skill: 'form' },
    { id: 'perspective', emoji: '🏢', name: 'Perspective Boxes', desc: 'Two-point perspective practice.', ex: { mode: 'construct', gen: 'box2pt', params: {}, rounds: 3, tol: [8, 30], say: 'Finish the box using both vanishing points.' }, skill: 'perspective' },
    { id: 'heads', emoji: '🙂', name: 'Head Angles', desc: 'Loomis heads turned every way.', ex: { mode: 'trace', gen: 'loomis', params: {}, rounds: 3, tol: [7, 26], say: 'Trace the head construction.' }, skill: 'figure' },
    { id: 'gesture60', emoji: '🕺', name: 'Gesture: 1 min', desc: '5 poses, 1 minute each.', ex: { mode: 'gesture', gen: 'mannequin', count: 5, seconds: 60 }, skill: 'figure' },
    { id: 'gesture120', emoji: '🧘', name: 'Gesture: 2 min', desc: '3 poses, 2 minutes each — add forms!', ex: { mode: 'gesture', gen: 'mannequin', count: 3, seconds: 120 }, skill: 'figure' },
  ];
  V.PRACTICE = PRACTICE;

  V.practice = function (root, id) {
    if (id) return runPractice(root, PRACTICE.find((p) => p.id === id));
    root.appendChild(header('🎯 Practice Gym', 'Extra drills to level up any skill. Practice counts toward your streak!'));
    const g = el('div', { class: 'practice-grid' });
    PRACTICE.forEach((p) => g.appendChild(el('a', { class: 'card practice-card', href: '#/practice/' + p.id }, [el('div', { class: 'big-emoji', text: p.emoji }), el('h3', { text: p.name }), el('p', { class: 'muted', text: p.desc })])));
    root.appendChild(g);

    const animals = C.WORLDS.flatMap((w) => w.lessons).filter((l) => l.animal && St.lesson(l.id).passed);
    if (animals.length) {
      root.appendChild(el('h2', { class: 'section', text: '🐾 Redraw an animal' }));
      root.appendChild(el('div', { class: 'chips' }, animals.map((l) => el('a', { class: 'chip-card', href: '#/lesson/' + l.id }, [el('span', { class: 'e', text: l.emoji }), el('span', { text: DA.animals.ANIMALS[l.animal].name })]))));
    }
  };

  function runPractice(root, p) {
    if (!p) { location.hash = '#/practice'; return; }
    document.body.classList.add('drawing');
    const host = el('div', { class: 'ex-host' });
    root.appendChild(host);
    const runner = new DA.Runner(host, {
      ex: p.ex, lesson: null,
      onExit: () => { runner.destroy(); document.body.classList.remove('drawing'); location.hash = '#/practice'; },
      onDone: (r) => {
        runner.destroy();
        document.body.classList.remove('drawing');
        const res = St.record({ kind: 'practice-' + p.id, practice: true, noScore: p.ex.mode === 'sandbox', score: r.score, skill: p.skill, secs: r.secs, gesture: r.gesture, baseXp: 40 });
        St.addDrawing({ title: p.name, emoji: p.emoji, lessonId: 'practice-' + p.id, score: p.ex.mode === 'sandbox' ? null : r.score, img: r.snapshot });
        if (p.ex.mode === 'sandbox') { ui.toast('💾 Saved to My Zoo!'); location.hash = '#/zoo'; return; }
        celebrate({ id: 'practice-' + p.id, title: p.name }, r, res, {});
      },
    });
    DA.app.current = runner;
  }

  // ===================== ZOO / GALLERY =====================
  V.zoo = async function (root) {
    root.appendChild(header('🦁 My Zoo', 'Every animal you draw joins your zoo. All your drawings are saved here too.'));
    const all = await St.listDrawings();
    const zoo = el('div', { class: 'zoo' });
    DA.animals.ANIMALS.order.forEach((k) => {
      const a = DA.animals.ANIMALS[k];
      const mine = all.filter((d) => d.animal === k);
      const latest = mine[0];
      const lessonId = C.WORLDS.flatMap((w) => w.lessons).find((l) => l.animal === k).id;
      zoo.appendChild(el('a', { class: 'zoo-card' + (latest ? ' got' : ''), href: latest ? null : '#/lesson/' + lessonId, onclick: latest ? () => viewDrawing(latest, all) : null }, [
        latest ? el('img', { src: latest.img, alt: a.name }) : el('div', { class: 'zoo-empty', text: a.emoji }),
        el('div', { class: 'zoo-name', text: (latest ? a.emoji + ' ' : '❓ ') + a.name }),
      ]));
    });
    root.appendChild(zoo);

    root.appendChild(el('h2', { class: 'section', text: `🖼️ All drawings (${all.length})` }));
    if (!all.length) root.appendChild(el('p', { class: 'muted', text: 'Nothing yet — finish a lesson and your drawing will appear here!' }));
    const g = el('div', { class: 'gallery' });
    all.forEach((d) => g.appendChild(el('button', { class: 'thumb', onclick: () => viewDrawing(d, all) }, [
      el('img', { src: d.img, alt: d.title, loading: 'lazy' }),
      el('div', { class: 'thumb-meta' }, [el('span', { text: (d.emoji || '') + ' ' + d.title }), d.score != null ? el('b', { text: d.score }) : null]),
    ])));
    root.appendChild(g);
  };

  function viewDrawing(d, all) {
    const same = all.filter((x) => x.lessonId === d.lessonId).sort((a, b) => a.t - b.t);
    const first = same.length > 1 && same[0].id !== d.id ? same[0] : null;
    const date = new Date(d.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const body = el('div', { class: 'viewer' }, [
      el('h2', { text: `${d.emoji || ''} ${d.title}` }),
      el('p', { class: 'muted', text: date + (d.score != null ? ' · score ' + d.score : '') }),
      first ? el('div', { class: 'then-now' }, [
        el('figure', {}, [el('img', { src: first.img }), el('figcaption', { text: 'First try · ' + new Date(first.t).toLocaleDateString() })]),
        el('figure', {}, [el('img', { src: d.img }), el('figcaption', { text: 'This one · ' + date })]),
      ]) : el('img', { class: 'viewer-img', src: d.img }),
      first ? el('p', { class: 'center', text: '👆 Look how far you\'ve come!' }) : null,
      el('div', { class: 'row end' }, [
        el('button', { class: 'btn danger', text: '🗑️ Delete', onclick: () => ui.confirmBox('Delete this drawing?', async () => { await St.deleteDrawing(d.id); m.close(); DA.app.route(); }) }),
        el('a', { class: 'btn', href: d.img, download: (d.title || 'drawing').replace(/\W+/g, '-') + '.jpg', text: '⬇️ Save image' }),
        el('button', { class: 'btn primary', text: 'Close', onclick: () => m.close() }),
      ]),
    ]);
    const m = ui.modal(body, { wide: true });
  }

  // ===================== ME / PROGRESS =====================
  V.me = function (root) {
    const s = St.state;
    root.appendChild(header('📈 My Progress', 'See how far you\'ve come.'));
    root.appendChild(rankCard());
    const totalMin = Math.round(s.history.reduce((a, h) => a + (h.secs || 0), 0) / 60);
    const passed = Object.values(s.lessons).filter((l) => l.passed).length;
    const allL = C.WORLDS.reduce((a, w) => a + w.lessons.length, 0);
    const starsTot = Object.values(s.lessons).reduce((a, l) => a + l.stars, 0);
    root.appendChild(el('div', { class: 'stats' }, [
      stat('🔥', St.currentStreak(), 'day streak'), stat('🏔️', s.streak.best, 'best streak'),
      stat('✅', `${passed}/${allL}`, 'lessons passed'), stat('⭐', starsTot, 'stars'),
      stat('🖼️', s.drawings, 'drawings'), stat('⏱️', totalMin, 'minutes drawing'),
    ]));

    const two = el('div', { class: 'two-col' });
    two.appendChild(el('div', { class: 'card' }, [el('h2', { text: '🧭 Skills' }), radar(St.skillLevels())]));
    two.appendChild(el('div', { class: 'card' }, [el('h2', { text: '📅 Practice calendar' }), calendar(s.days), el('h2', { text: '📊 Recent scores' }), scoreChart(s.history.filter((h) => h.score != null).slice(-30))]));
    root.appendChild(two);

    root.appendChild(el('h2', { class: 'section', text: '🏅 Badges' }));
    root.appendChild(el('div', { class: 'badges' }, St.BADGES.map((b) => el('div', { class: 'badge' + (s.badges[b.id] ? ' on' : ''), title: b.desc }, [el('span', { class: 'e', text: s.badges[b.id] ? b.emoji : '🔒' }), el('span', { text: b.name }), el('small', { text: b.desc })]))));

    root.appendChild(el('h2', { class: 'section', text: '⚙️ Settings' }));
    root.appendChild(settingsCard());
  };

  function stat(e, v, label) { return el('div', { class: 'stat' }, [el('span', { class: 'e', text: e }), el('b', { text: String(v) }), el('small', { text: label })]); }

  function radar(levels) {
    const keys = Object.keys(C.SKILLS), n = keys.length, R = 110, cx = 160, cy = 150;
    const pt = (i, v) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
    let svg = `<svg viewBox="0 0 320 300" class="radar" role="img" aria-label="Skill levels">`;
    [0.25, 0.5, 0.75, 1].forEach((f) => { svg += `<polygon points="${keys.map((_, i) => pt(i, f).join(',')).join(' ')}" class="ring"/>`; });
    keys.forEach((k, i) => { const p = pt(i, 1); svg += `<line x1="${cx}" y1="${cy}" x2="${p[0]}" y2="${p[1]}" class="spoke"/>`; });
    svg += `<polygon points="${keys.map((k, i) => pt(i, Math.max(0.03, levels[k] / 100)).join(',')).join(' ')}" class="area"/>`;
    keys.forEach((k, i) => { const p = pt(i, 1.2); svg += `<text x="${p[0]}" y="${p[1]}" text-anchor="middle" dominant-baseline="middle">${C.SKILLS[k].emoji}</text>`; });
    svg += '</svg>';
    const legend = el('div', { class: 'skill-list' }, keys.map((k) => el('div', { class: 'skill-row' }, [el('span', { text: `${C.SKILLS[k].emoji} ${C.SKILLS[k].name}` }), el('div', { class: 'bar' }, el('div', { class: 'fill', style: `width:${Math.round(levels[k])}%` }))])));
    return el('div', {}, [el('div', { html: svg }), legend]);
  }

  function calendar(days) {
    const g = el('div', { class: 'cal' });
    const now = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const v = days[k] || 0;
      g.appendChild(el('span', { class: 'day l' + Math.min(4, v === 0 ? 0 : Math.ceil(v / 2)), title: `${k}: ${v} drawing${v === 1 ? '' : 's'}` }));
    }
    return g;
  }

  function scoreChart(h) {
    if (h.length < 2) return el('p', { class: 'muted', text: 'Finish a few lessons to see your score chart.' });
    const W = 320, H = 140, n = h.length;
    const x = (i) => 20 + (i / (n - 1)) * (W - 30), y = (v) => H - 15 - (v / 100) * (H - 30);
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Recent scores">`;
    [60, 75, 90].forEach((v) => { svg += `<line x1="20" x2="${W - 10}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="2" y="${y(v) + 4}">${v}</text>`; });
    svg += `<polyline points="${h.map((p, i) => x(i) + ',' + y(p.score)).join(' ')}" class="line"/>`;
    h.forEach((p, i) => { svg += `<circle cx="${x(i)}" cy="${y(p.score)}" r="3" class="pt"/>`; });
    return el('div', { html: svg + '</svg>' });
  }

  function settingsCard() {
    const s = St.settings();
    const toggle = (key, label, hint, after) => el('label', { class: 'setting' }, [
      el('span', {}, [el('b', { text: label }), hint ? el('small', { text: hint }) : null]),
      el('input', { type: 'checkbox', checked: s[key] ? true : null, onchange: (e) => { St.setSetting(key, e.target.checked); if (after) after(); } }),
    ]);
    const name = el('input', { type: 'text', value: s.name || '', placeholder: 'Your name', maxlength: 24, onchange: (e) => St.setSetting('name', e.target.value.trim()) });
    const theme = el('select', { onchange: (e) => { St.setSetting('theme', e.target.value); DA.app.applyTheme(); } }, ['auto', 'light', 'dark'].map((t) => el('option', { value: t, text: t[0].toUpperCase() + t.slice(1), selected: s.theme === t ? true : null })));
    const file = el('input', { type: 'file', accept: 'application/json', class: 'hidden', onchange: async (e) => {
      try { St.importData(await e.target.files[0].text()); ui.toast('✅ Progress restored!'); DA.app.route(); } catch (err) { ui.toast('❌ ' + err.message); }
    } });
    return el('div', { class: 'card settings' }, [
      el('label', { class: 'setting' }, [el('span', {}, [el('b', { text: 'Name' })]), name]),
      el('label', { class: 'setting' }, [el('span', {}, [el('b', { text: 'Theme' })]), theme]),
      toggle('sound', 'Sounds', 'Happy little sound effects'),
      toggle('fingerDraw', 'Draw with finger too', 'Off = only Apple Pencil draws once it\'s detected (palm rejection)'),
      toggle('unlockAll', 'Unlock all worlds', 'For experienced artists who want to skip ahead'),
      el('div', { class: 'row wrap' }, [
        el('button', { class: 'btn', text: '⬇️ Back up progress', onclick: () => {
          const a = el('a', { href: URL.createObjectURL(new Blob([St.exportData()], { type: 'application/json' })), download: 'sketch-quest-progress.json' }); a.click();
        } }),
        el('button', { class: 'btn', text: '⬆️ Restore backup', onclick: () => file.click() }), file,
        el('button', { class: 'btn danger', text: 'Reset everything', onclick: () => ui.confirmBox('Erase ALL progress? This cannot be undone.', () => { St.reset(); DA.app.route(); }) }),
      ]),
      el('p', { class: 'muted small', html: '✏️ <b>Apple Pencil tips:</b> pressure changes line thickness · two-finger tap = undo · three-finger tap = redo · hover to ghost your lines (on iPads that support hover).' }),
    ]);
  }

  DA.views = V;
})(window.DA);
