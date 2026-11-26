/* Drawing challenges: Tandem Trace (accuracy + speed, in sync) and Describe & Draw (one describes, one draws). */
const Challenges = {};

/* ---------- shared drawing helpers ---------- */
const Draw = (() => {
  function fitCanvas(cv) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, w: r.width, h: r.height };
  }
  function pos(cv, e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function poly(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke(); }
  /* Resample a polyline to evenly spaced points. */
  function resample(pts, step) {
    const out = [pts[0]]; let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      let a = pts[i - 1]; const b = pts[i];
      let seg = Math.hypot(b.x - a.x, b.y - a.y);
      if (!(seg > 0)) continue;
      while (carry + seg >= step && seg > 0) {
        const t = (step - carry) / seg;
        a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        out.push(a); seg = Math.hypot(b.x - a.x, b.y - a.y); carry = 0;
      }
      carry += seg;
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function catmull(ctrl, per = 24) {
    const out = [], P = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
    for (let i = 1; i < P.length - 2; i++) {
      const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
      for (let s = 0; s < per; s++) {
        const t = s / per, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
      }
    }
    out.push(ctrl[ctrl.length - 1]);
    return out;
  }
  return { fitCanvas, pos, poly, resample, catmull };
})();

/* ================= Tandem Trace ================= */
const TracePaths = {
  wave: () => { const k = U.pick([1, 1.5, 2]), A = 0.22; return Array.from({ length: 80 }, (_, i) => { const t = i / 79; return { x: 0.5 + A * Math.sin(t * Math.PI * 2 * k), y: 0.06 + t * 0.88 }; }); },
  zigzag: () => { const n = U.range(3, 5); return Array.from({ length: n + 1 }, (_, i) => ({ x: i % 2 ? 0.8 : 0.2, y: 0.06 + (i / n) * 0.88 })); },
  arc: () => Array.from({ length: 60 }, (_, i) => { const a = Math.PI * (0.15 + 1.7 * i / 59); return { x: 0.5 - 0.4 * Math.cos(a), y: 0.5 - 0.4 * Math.sin(a) * (U.rand(2) ? 1 : 1) }; }),
  heart: () => Array.from({ length: 120 }, (_, i) => { const t = Math.PI * (0.02 + 1.96 * i / 119) - Math.PI * 0.0; const x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); return { x: 0.5 + x / 38, y: 0.47 - y / 38 }; }),
  spiral: (d) => { const turns = 1.6 + d * 0.35; return Array.from({ length: 200 }, (_, i) => { const t = i / 199, a = t * turns * Math.PI * 2; const r = 0.06 + 0.38 * t; return { x: 0.5 + r * Math.cos(a), y: 0.5 + r * Math.sin(a) }; }); },
  star: () => { const pts = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.18 : 0.44; pts.push({ x: 0.5 + r * Math.cos(a), y: 0.52 + r * Math.sin(a) }); } return pts; },
  loops: (d) => { const n = 2 + Math.min(2, d - 1); return Array.from({ length: 220 }, (_, i) => { const t = i / 219, a = t * n * Math.PI * 2; return { x: 0.5 + 0.28 * Math.sin(a) * 1.1, y: 0.08 + t * 0.78 + 0.1 * Math.cos(a) }; }); },
  scribble: (d) => {
    const cells = U.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 4 + Math.min(3, d));
    return Draw.catmull(cells.map((c) => ({ x: 0.15 + (c % 3) * 0.35 + (Math.random() - 0.5) * 0.12, y: 0.15 + Math.floor(c / 3) * 0.35 + (Math.random() - 0.5) * 0.12 })));
  },
};

Challenges.trace = {
  name: 'Tandem Trace', emoji: '✍️', kind: 'Drawing · accuracy & speed',
  blurb: 'Trace two paths at the same time — fast and neat — without getting out of sync.',
  coop: 'The kid traces the left path and the grown-up traces the right one, at the same time. If one of you gets too far ahead, that pen freezes until the other catches up, so call out where you are!',
  run(root, ctx) {
    const d = ctx.d, ROUNDS = 2, results = [];
    let round = 0;
    const kidOpts = d <= 1 ? ['wave', 'zigzag', 'arc'] : d === 2 ? ['wave', 'zigzag', 'heart', 'arc'] : ['heart', 'spiral', 'star', 'wave', 'zigzag'];
    const adultOpts = d <= 1 ? ['heart', 'spiral', 'scribble'] : ['spiral', 'star', 'loops', 'scribble', 'heart'];
    const kidPicks = U.shuffle(kidOpts), adultPicks = U.shuffle(adultOpts);
    root.innerHTML = `<div class="trace">
      <div class="trace-top">
        <span class="tag kid">${U.esc(U.who('kid').avatar)} ${U.esc(U.who('kid').name)}</span>
        <div class="syncbar" title="Stay close together!"><i class="mk kid"></i><i class="mk adult"></i><b></b></div>
        <span class="tag adult">${U.esc(U.who('adult').avatar)} ${U.esc(U.who('adult').name)}</span>
      </div>
      <div class="trace-stage"><canvas class="trace-cv"></canvas><div class="overlay"></div></div>
    </div>`;
    const cv = U.$('.trace-cv', root), overlay = U.$('.overlay', root), syncbar = U.$('.syncbar', root);
    let g, W, H, sides, started, t0, limit, raf, active = false;
    const GAP = 0.22;

    function setupRound() {
      ({ g, w: W, h: H } = Draw.fitCanvas(cv));
      const make = (who, i, kind) => {
        const x0 = i ? W / 2 : 0, pad = 36, bw = W / 2 - pad * 2, bh = H - pad * 2, s = Math.min(bw, bh);
        const ox = x0 + pad + (bw - s) / 2, oy = pad + (bh - s) / 2;
        let pts = TracePaths[kind](d).map((p) => ({ x: ox + p.x * s, y: oy + p.y * s }));
        pts = Draw.resample(pts, 4);
        const tol = who === 'kid' ? Math.max(14, 26 - d * 3) : Math.max(10, 20 - d * 3);
        return { who, i, pts, tol, idx: 0, ink: [], on: 0, total: 0, ptr: null, frozen: false, x0 };
      };
      sides = [make('kid', 0, kidPicks[round % kidPicks.length]), make('adult', 1, adultPicks[round % adultPicks.length])];
      root._test = { sides, cv };
      const len = (s) => s.pts.length * 4;
      limit = Math.round(18 + (len(sides[0]) + len(sides[1])) / 2 / 55 - d * 2);
      started = false; active = true;
      ctx.hud(`Round ${round + 1}/${ROUNDS} · ${limit}s`);
      overlay.innerHTML = `<div class="ready"><h2>Round ${round + 1} of ${ROUNDS}</h2>
        <p>Put your fingers or pencils on your <b class="go-dot">green dots</b>. The clock starts on the first touch.</p>
        <p class="muted">Stay in sync: if one of you is more than a little bit ahead, that pen freezes.</p>
        <button class="btn big" data-ready>Ready! 🚦</button></div>`;
      overlay.hidden = false;
      U.$('[data-ready]', overlay).onclick = () => { U.sfx.tap(); overlay.hidden = true; };
      loop();
    }

    const prog = (s) => s.idx / (s.pts.length - 1);
    const done = (s) => prog(s) >= 0.985;

    function track(s, p) {
      const n = s.pts.length, W8 = 26;
      let best = Infinity, bestJ = -1, nearAll = Infinity;
      for (let j = Math.max(0, s.idx - W8); j < Math.min(n, s.idx + W8); j++) {
        const dd = Math.hypot(s.pts[j].x - p.x, s.pts[j].y - p.y);
        if (dd < nearAll) nearAll = dd;
        if (j >= s.idx && dd < best) { best = dd; bestJ = j; }
      }
      s.total++;
      if (nearAll <= s.tol) s.on++;
      if (bestJ >= 0 && best <= s.tol * 1.25) {
        const o = sides[1 - s.i];
        const cap = done(o) ? n - 1 : Math.floor(Math.min(1, prog(o) + GAP) * (n - 1));
        s.frozen = bestJ > cap;
        s.idx = Math.max(s.idx, Math.min(bestJ, cap));
        if (s.idx >= n - 4) s.idx = n - 1;
      }
    }

    function sideAt(x) { return x < W / 2 ? sides[0] : sides[1]; }
    cv.addEventListener('pointerdown', (e) => {
      if (!active || !overlay.hidden) return;
      const p = Draw.pos(cv, e), s = sideAt(p.x);
      if (s.ptr !== null) return;
      e.preventDefault();
      s.ptr = e.pointerId;
      if (!started) { started = true; t0 = performance.now(); U.sfx.tick(); }
      s.ink.push([p]); track(s, p);
    });
    cv.addEventListener('pointermove', (e) => {
      const s = sides && sides.find((q) => q.ptr === e.pointerId);
      if (!s) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of (evs.length ? evs : [e])) {
        const p = Draw.pos(cv, ev);
        p.x = U.clamp(p.x, s.x0, s.x0 + W / 2);
        s.ink[s.ink.length - 1].push(p); track(s, p);
      }
      if (sides.every(done)) endRound();
    });
    const up = (e) => { const s = sides && sides.find((q) => q.ptr === e.pointerId); if (s) { s.ptr = null; s.frozen = false; } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', up);

    function render() {
      g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,140,66,0.07)'; g.fillRect(0, 0, W / 2, H);
      g.fillStyle = 'rgba(76,150,240,0.07)'; g.fillRect(W / 2, 0, W / 2, H);
      g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2; g.setLineDash([6, 8]); g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke(); g.setLineDash([]);
      for (const s of sides) {
        const col = s.who === 'kid' ? '255,140,66' : '58,134,255';
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = `rgba(${col},0.16)`; g.lineWidth = s.tol * 2; Draw.poly(g, s.pts);
        g.strokeStyle = 'rgba(60,60,80,0.35)'; g.lineWidth = 2; g.setLineDash([5, 7]); Draw.poly(g, s.pts); g.setLineDash([]);
        if (s.idx > 0) { g.strokeStyle = `rgba(${col},0.95)`; g.lineWidth = 7; Draw.poly(g, s.pts.slice(0, s.idx + 1)); }
        g.strokeStyle = '#2d2a32'; g.lineWidth = 3;
        for (const st of s.ink) if (st.length > 1) Draw.poly(g, st);
        const a = s.pts[0], b = s.pts[s.pts.length - 1], c = s.pts[s.idx];
        g.fillStyle = '#06d6a0'; g.beginPath(); g.arc(a.x, a.y, 11, 0, 7); g.fill();
        g.font = '26px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🏁', b.x, b.y - 4);
        const pulse = 8 + 3 * Math.sin(performance.now() / 150);
        g.strokeStyle = `rgba(${col},1)`; g.lineWidth = 3; g.beginPath(); g.arc(c.x, c.y, pulse, 0, 7); g.stroke();
        if (s.frozen) {
          g.fillStyle = 'rgba(238,82,83,0.95)'; g.font = 'bold 20px system-ui';
          g.fillText('⏸ Wait for your partner!', s.x0 + W / 4, 22);
        } else if (done(s) && !sides.every(done)) {
          g.fillStyle = 'rgba(16,172,132,0.95)'; g.font = 'bold 20px system-ui';
          g.fillText('✅ Done! Cheer on your partner!', s.x0 + W / 4, 22);
        }
      }
      const pk = prog(sides[0]), pa = prog(sides[1]);
      U.$('.mk.kid', syncbar).style.left = `${pk * 100}%`;
      U.$('.mk.adult', syncbar).style.left = `${pa * 100}%`;
      syncbar.classList.toggle('warn', Math.abs(pk - pa) > GAP * 0.8);
    }

    function loop() {
      cancelAnimationFrame(raf);
      const tick = () => {
        if (!active) return;
        render();
        if (started) {
          const left = limit - (performance.now() - t0) / 1000;
          ctx.hud(`Round ${round + 1}/${ROUNDS} · ⏱ ${Math.max(0, Math.ceil(left))}s`);
          if (left <= 0) { endRound(); return; }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    function endRound() {
      if (!active) return;
      active = false; cancelAnimationFrame(raf); render();
      const time = started ? (performance.now() - t0) / 1000 : limit;
      const comp = (prog(sides[0]) + prog(sides[1])) / 2;
      const acc = sides.reduce((a, s) => a + (s.total ? s.on / s.total : 0), 0) / 2;
      const finished = sides.every(done);
      let stars = 0;
      if (finished) stars = acc >= 0.85 && time <= limit * 0.8 ? 3 : acc >= 0.7 ? 2 : 1;
      else if (comp >= 0.6) stars = 1;
      const score = Math.round(comp * 100 * (0.4 + 0.6 * acc) + (finished ? Math.max(0, limit - time) * 2 : 0));
      results.push({ stars, score, acc, comp, time, finished });
      (stars >= 2 ? U.sfx.good : stars ? U.sfx.tap : U.sfx.bad)();
      overlay.hidden = false;
      overlay.innerHTML = `<div class="ready"><h2>${finished ? 'Both paths done! 🎉' : '⏰ Time!'}</h2>
        <div class="statrow"><div><b>${Math.round(acc * 100)}%</b><span>on the line</span></div>
        <div><b>${Math.round(comp * 100)}%</b><span>completed</span></div><div><b>${time.toFixed(1)}s</b><span>time</span></div></div>
        <div class="stars-big">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        <button class="btn big" data-next>${round + 1 < ROUNDS ? 'Next round ▶' : 'See results ▶'}</button></div>`;
      U.$('[data-next]', overlay).onclick = () => {
        U.sfx.tap(); round++;
        if (round < ROUNDS) setupRound();
        else {
          const stars = Math.floor(results.reduce((a, r) => a + r.stars, 0) / ROUNDS);
          ctx.finish({
            stars, score: results.reduce((a, r) => a + r.score, 0),
            lines: results.map((r, i) => `Round ${i + 1}: ${Math.round(r.acc * 100)}% accurate, ${Math.round(r.comp * 100)}% complete, ${r.time.toFixed(1)}s`),
          });
        }
      };
    }

    ctx.onCleanup(() => { active = false; cancelAnimationFrame(raf); });
    requestAnimationFrame(setupRound);
  },
};

/* ================= Describe & Draw ================= */
const Shapes = {
  make(n, kinds) {
    const out = [];
    for (let tries = 0; out.length < n && tries < 400; tries++) {
      const k = U.pick(kinds), r = 0.09 + Math.random() * 0.12;
      const s = { k, r, x: r + 0.06 + Math.random() * (0.88 - 2 * r), y: r + 0.06 + Math.random() * (0.88 - 2 * r) };
      if (k === 'line') { s.a = U.pick([0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]); s.r = Math.max(r, 0.14); }
      if (out.every((o) => Math.hypot(o.x - s.x, o.y - s.y) > (o.r + s.r) * 0.95)) out.push(s);
    }
    return out;
  },
  draw(g, shapes, S) {
    for (const s of shapes) {
      const x = s.x * S, y = s.y * S, r = s.r * S;
      g.beginPath();
      if (s.k === 'circle') g.arc(x, y, r, 0, Math.PI * 2);
      else if (s.k === 'square') g.rect(x - r, y - r, r * 2, r * 2);
      else if (s.k === 'triangle') { g.moveTo(x, y - r); g.lineTo(x + r * 1.1, y + r * 0.85); g.lineTo(x - r * 1.1, y + r * 0.85); g.closePath(); }
      else if (s.k === 'line') { g.moveTo(x - Math.cos(s.a) * r, y - Math.sin(s.a) * r); g.lineTo(x + Math.cos(s.a) * r, y + Math.sin(s.a) * r); }
      else if (s.k === 'star') { for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } }
      else if (s.k === 'heart') { for (let i = 0; i <= 40; i++) { const t = (i / 40) * Math.PI * 2; const hx = 16 * Math.sin(t) ** 3, hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); g.lineTo(x + hx / 17 * r, y - hy / 17 * r); } }
      else if (s.k === 'zigzag') { for (let i = 0; i <= 4; i++) g.lineTo(x - r + (i / 4) * 2 * r, y + (i % 2 ? -r * 0.5 : r * 0.5)); }
      g.stroke();
    }
  },
};

Challenges.describe = {
  name: 'Describe & Draw', emoji: '🗣️', kind: 'Drawing · listening & describing',
  blurb: 'One of you sees a secret picture and describes it. The other draws it without looking.',
  coop: 'The Describer peeks at a secret picture and explains it using only words ("a big circle in the top-left corner…"). The Artist draws it without seeing it. Then you swap jobs!',
  run(root, ctx) {
    const d = ctx.d;
    const rounds = [{ desc: 'adult', art: 'kid' }, { desc: 'kid', art: 'adult' }];
    const results = [];
    let ri = 0;
    const kidKinds = ['circle', 'square', 'triangle', 'line'];
    const allKinds = kidKinds.concat(d >= 2 ? ['star', 'heart', 'zigzag'] : ['star']);
    const peeksMax = d <= 1 ? 99 : Math.max(2, 7 - d);
    let cleanupFns = [];
    ctx.onCleanup(() => cleanupFns.forEach((f) => f()));

    function startRound() {
      cleanupFns.forEach((f) => f()); cleanupFns = [];
      const R = rounds[ri];
      const n = R.desc === 'kid' ? Math.min(4, 2 + Math.ceil(d / 2)) : Math.min(6, 2 + d);
      const target = Shapes.make(n, R.desc === 'kid' ? kidKinds : allKinds);
      root._test = { target };
      const limit = 150 - (d - 1) * 20;
      root.innerHTML = `<div class="describe">
        <div class="dd-board"><canvas class="dd-cv"></canvas></div>
        <div class="dd-side">
          <div class="dd-roles"><div>🗣️ Describer: ${U.tag(R.desc)}</div><div>🎨 Artist: ${U.tag(R.art)}</div></div>
          <button class="btn peek" data-peek>👁 Hold to peek<br><small>${peeksMax > 50 ? 'Describer only' : `<span data-left>${peeksMax}</span> peeks left · Describer only`}</small></button>
          <div class="dd-tools">
            <button class="btn ghost" data-undo>↶ Undo</button>
            <button class="btn ghost" data-clear>🗑 Clear</button>
          </div>
          <button class="btn good big" data-done>✅ We're done!</button>
          <p class="muted small">Describer: use words only — no pointing! Try "top", "bottom", "left", "right", "big", "small", "touching".</p>
        </div>
        <div class="overlay"></div>
      </div>`;
      const cv = U.$('.dd-cv', root), overlay = U.$('.overlay', root);
      const board = U.$('.dd-board', root);
      const strokes = [];
      let g, S, active = false, t0, raf, peeks = 0, cur = null;

      const size = () => {
        const r = board.getBoundingClientRect();
        const s = Math.floor(Math.min(r.width, r.height) - 8);
        cv.style.width = cv.style.height = `${s}px`;
        ({ g, w: S } = Draw.fitCanvas(cv));
        paint();
      };
      const paint = (showTarget) => {
        g.clearRect(0, 0, S, S); g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
        g.lineCap = 'round'; g.lineJoin = 'round';
        if (showTarget) { g.strokeStyle = 'rgba(238,82,83,0.75)'; g.lineWidth = 5; g.setLineDash([10, 8]); Shapes.draw(g, target, S); g.setLineDash([]); }
        g.strokeStyle = showTarget ? '#3a86ff' : '#2d2a32'; g.lineWidth = 4;
        for (const st of strokes) Draw.poly(g, st.map((p) => ({ x: p.x * S, y: p.y * S })));
      };

      overlay.innerHTML = `<div class="ready"><h2>Round ${ri + 1} of 2</h2>
        <p>🗣️ <b>${U.esc(U.who(R.desc).name)}</b> describes · 🎨 <b>${U.esc(U.who(R.art).name)}</b> draws</p>
        <p>${U.esc(U.who(R.art).name)}: when ${U.esc(U.who(R.desc).name)} holds the 👁 button, <b>close your eyes</b> 🙈 — no peeking at the secret picture!</p>
        <p class="muted">The secret picture has ${target.length} shapes. You have ${U.fmt(limit)}.</p>
        <button class="btn big" data-ready>Start! 🎨</button></div>`;
      U.$('[data-ready]', overlay).onclick = () => { U.sfx.tap(); overlay.hidden = true; active = true; t0 = performance.now(); tick(); };
      requestAnimationFrame(size);
      addEventListener('resize', size); cleanupFns.push(() => removeEventListener('resize', size));

      const tick = () => {
        if (!active) return;
        const left = limit - (performance.now() - t0) / 1000;
        ctx.hud(`Round ${ri + 1}/2 · ⏱ ${U.fmt(left)}`);
        if (left <= 0) return finishRound();
        raf = setTimeout(tick, 250);
      };
      cleanupFns.push(() => { active = false; clearTimeout(raf); });

      cv.addEventListener('pointerdown', (e) => {
        if (!active || cur) return;
        e.preventDefault(); const p = Draw.pos(cv, e);
        cur = { id: e.pointerId, pts: [{ x: p.x / S, y: p.y / S }] }; strokes.push(cur.pts);
      });
      cv.addEventListener('pointermove', (e) => {
        if (!cur || e.pointerId !== cur.id) return;
        const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        for (const ev of (evs.length ? evs : [e])) { const p = Draw.pos(cv, ev); cur.pts.push({ x: U.clamp(p.x / S, 0, 1), y: U.clamp(p.y / S, 0, 1) }); }
        paint();
      });
      const up = (e) => { if (cur && e.pointerId === cur.id) { if (cur.pts.length === 1) cur.pts.push({ ...cur.pts[0], x: cur.pts[0].x + 0.002 }); cur = null; paint(); } };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      U.$('[data-undo]', root).onclick = () => { strokes.pop(); paint(); };
      U.$('[data-clear]', root).onclick = () => { strokes.length = 0; paint(); };
      U.$('[data-done]', root).onclick = () => active && finishRound();

      const peekBtn = U.$('[data-peek]', root);
      let peekEl = null, peekTimer;
      const hidePeek = () => { if (peekEl) { peekEl.remove(); peekEl = null; clearTimeout(peekTimer); } };
      peekBtn.addEventListener('pointerdown', (e) => {
        if (!active || peekEl) return;
        if (peeks >= peeksMax) { U.toast('No peeks left — describe from memory!'); return; }
        e.preventDefault(); peeks++;
        const left = U.$('[data-left]', root); if (left) left.textContent = peeksMax - peeks;
        peekEl = U.el(`<div class="peek-wrap"><div class="peek-card"><div class="peek-warn">🙈 ${U.esc(U.who(R.art).name)}, eyes closed!</div><canvas></canvas><div class="muted">Let go to hide · max 5 seconds</div></div></div>`);
        document.body.appendChild(peekEl);
        const pc = U.$('canvas', peekEl), s = Math.min(innerWidth, innerHeight) * 0.62;
        pc.style.width = pc.style.height = `${s}px`;
        const { g: pg } = Draw.fitCanvas(pc);
        pg.fillStyle = '#fff'; pg.fillRect(0, 0, s, s); pg.strokeStyle = '#2d2a32'; pg.lineWidth = 5; pg.lineCap = 'round'; pg.lineJoin = 'round';
        Shapes.draw(pg, target, s);
        peekTimer = setTimeout(hidePeek, 5000);
        const off = () => { hidePeek(); removeEventListener('pointerup', off); removeEventListener('pointercancel', off); };
        addEventListener('pointerup', off); addEventListener('pointercancel', off);
      });
      cleanupFns.push(hidePeek);

      function finishRound() {
        active = false; clearTimeout(raf); hidePeek();
        const time = (performance.now() - t0) / 1000;
        const f = similarity(target, strokes);
        const stars = f >= 0.62 ? 3 : f >= 0.42 ? 2 : f >= 0.22 ? 1 : 0;
        results.push({ f, stars, time, peeks });
        paint(true);
        (stars >= 2 ? U.sfx.good : stars ? U.sfx.tap : U.sfx.bad)();
        overlay.hidden = false;
        overlay.classList.add('side');
        overlay.innerHTML = `<div class="ready"><h2>${stars >= 2 ? 'Great teamwork! 🎉' : stars ? 'Nice try! 👍' : 'Hmm… a mystery masterpiece 😄'}</h2>
          <p><span class="legend red">- - -</span> secret picture &nbsp; <span class="legend blue">——</span> your drawing</p>
          <div class="statrow"><div><b>${Math.round(f * 100)}%</b><span>match</span></div><div><b>${U.fmt(time)}</b><span>time</span></div></div>
          <div class="stars-big">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
          <button class="btn big" data-next>${ri === 0 ? 'Swap jobs ▶' : 'See results ▶'}</button></div>`;
        U.$('[data-next]', overlay).onclick = () => {
          U.sfx.tap(); ri++;
          if (ri < rounds.length) startRound();
          else ctx.finish({
            stars: Math.round(results.reduce((a, r) => a + r.stars, 0) / results.length - 0.01),
            score: results.reduce((a, r) => a + Math.round(r.f * 200), 0),
            lines: results.map((r, i) => `Round ${i + 1} (${U.who(rounds[i].art).name} drawing): ${Math.round(r.f * 100)}% match in ${U.fmt(r.time)}`),
          });
        };
      }
    }
    startRound();
  },
};

/* Compare a drawing to the target: how much of the target was covered, and how much ink was on target. */
function similarity(target, strokes) {
  const N = 120, R = 7;
  const mask = (fn, lw) => {
    const c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'); g.strokeStyle = '#000'; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
    fn(g); const d = g.getImageData(0, 0, N, N).data; const m = new Uint8Array(N * N);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 60 ? 1 : 0;
    return m;
  };
  const drawT = (g) => Shapes.draw(g, target, N);
  const drawD = (g) => strokes.forEach((st) => Draw.poly(g, st.map((p) => ({ x: p.x * N, y: p.y * N }))));
  const Tt = mask(drawT, 2), TT = mask(drawT, R * 2), Dt = mask(drawD, 2), DT = mask(drawD, R * 2);
  let tn = 0, th = 0, dn = 0, dh = 0;
  for (let i = 0; i < N * N; i++) { if (Tt[i]) { tn++; if (DT[i]) th++; } if (Dt[i]) { dn++; if (TT[i]) dh++; } }
  if (!tn || !dn) return 0;
  const rec = th / tn, prec = dh / dn;
  return rec + prec ? (2 * rec * prec) / (rec + prec) : 0;
}
