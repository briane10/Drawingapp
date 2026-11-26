/* Exercise runner: one drawing session made of rounds (or animal steps). */
(function (DA) {
  'use strict';
  const U = DA.util, Gen = DA.gen, S = DA.score, ui = DA.ui;
  const FULL = { x: 40, y: 40, w: 1120, h: 720 };
  const LEFT = { x: 30, y: 70, w: 540, h: 680 };
  const DX = 600;

  const COLORS = ['#141418', '#e4572e', '#f3a712', '#29bf12', '#2e86de', '#8e44ad', '#ff6b81', '#8d5524'];
  // natural palette for realistic animals: earth tones, greys, warm lights and cool shadows
  const NATURE = ['#ffffff', '#f2e6d0', '#e8c39e', '#c68b59', '#8d5524', '#5a3a22', '#3b2a20', '#1d1a18',
    '#d9d4cc', '#a8a29a', '#7d7770', '#4f4a46', '#f6c453', '#e07a2f', '#b5532a', '#7a8c4a',
    '#4a6b3a', '#9fb7c9', '#5b7a99', '#3c4a6b', '#6b5b7a', '#d98c8c', '#f4d9b0', '#2b2b30'];

  // ---------- drawing guides ----------
  function strokePath(ctx, p) {
    ctx.beginPath();
    p.pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    if (p.closed) ctx.closePath();
    ctx.stroke();
  }

  function drawGeom(ctx, g, o) {
    o = o || {};
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    (g.helpers || []).forEach((h) => {
      ctx.save();
      ctx.strokeStyle = h.kind === 'horizon' ? 'rgba(155,89,182,.7)' : h.faint ? 'rgba(120,130,150,.35)' : 'rgba(90,100,120,.75)';
      ctx.lineWidth = h.kind === 'horizon' ? 2 : 2;
      if (h.dash) ctx.setLineDash([10, 8]);
      strokePath(ctx, h);
      if (h.kind === 'horizon') { ctx.fillStyle = 'rgba(155,89,182,.9)'; ctx.font = '600 18px system-ui'; ctx.fillText('horizon', h.pts[0][0] + 8, h.pts[0][1] - 8); }
      ctx.restore();
    });
    (g.vps || []).forEach((v) => {
      ctx.save(); ctx.fillStyle = '#ee5253'; ctx.strokeStyle = '#ee5253'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(v[0], v[1], 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(v[0], v[1], 13, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '700 16px system-ui'; ctx.fillText('VP', v[0] + 14, v[1] - 12);
      ctx.restore();
    });
    if (o.paths) {
      g.paths.forEach((p) => {
        if (o.onlyGiven && !p.given) return;
        ctx.save();
        if (p.given) { ctx.strokeStyle = 'rgba(40,44,52,.85)'; ctx.lineWidth = 3; }
        else { ctx.strokeStyle = o.color || 'rgba(84,160,255,.45)'; ctx.lineWidth = o.width || 4; }
        if (p.hidden || p.construct) ctx.setLineDash([12, 9]);
        strokePath(ctx, p);
        ctx.restore();
      });
    }
    if (o.dots) (g.dots || []).forEach((d) => {
      ctx.save(); ctx.fillStyle = '#ff9f43'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(d[0], d[1], 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    });
  }

  function divider(ctx, label) {
    ctx.save();
    ctx.strokeStyle = 'rgba(120,130,150,.35)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(DX, 20); ctx.lineTo(DX, 780); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(120,130,150,.7)'; ctx.font = '600 20px system-ui';
    ctx.fillText('👀 Look', 30, 40); ctx.fillText(label || '✏️ Draw here', DX + 30, 40);
    ctx.restore();
  }

  function feedbackOverlay(res, o) {
    return (ctx) => {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      (res.paths || []).forEach((p) => {
        ctx.save(); ctx.strokeStyle = 'rgba(16,172,132,.75)'; ctx.lineWidth = 3;
        if (p.hidden || p.construct) ctx.setLineDash([10, 8]);
        strokePath(ctx, p); ctx.restore();
      });
      ctx.fillStyle = 'rgba(238,82,83,.85)';
      (res.misses || []).forEach((m, i) => { if (i % 2) return; ctx.beginPath(); ctx.arc(m[0], m[1], 4, 0, Math.PI * 2); ctx.fill(); });
      if (o && o.after) o.after(ctx);
    };
  }

  function loadImage(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }
  // shrink a photo (phones take huge ones) and return a JPEG data URL
  async function shrinkImage(file, max) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.85);
    } finally { URL.revokeObjectURL(url); }
  }

  // ---------- the runner ----------
  class Runner {
    constructor(host, spec) {
      this.host = host;
      this.spec = spec; // { ex, lesson, title, onDone, onExit }
      this.ex = spec.ex;
      this.lesson = spec.lesson;
      this.t0 = Date.now();
      this.scores = [];
      this.snapshots = [];
      this.round = 0;
      this.timers = [];
      this.build();
      this.plan();
      if (spec.resume) this.bossRestore(spec.resume).then(() => this.startRound()).catch(() => { this.round = 0; this.startRound(); });
      else this.startRound();
    }

    destroy() { this.clearTimers(); if (this.board) this.board.destroy(); this.dead = true; }
    clearTimers() { this.timers.forEach((t) => clearInterval(t)); this.timers = []; }

    plan() {
      const ex = this.ex;
      if (ex.mode === 'animal') {
        this.animal = DA.animals.ANIMALS[this.lesson.animal];
        this.stages = this.animalStages(this.animal);
        this.total = this.stages.length;
      } else if (ex.mode === 'boss') {
        this.stagesBoss = this.bossStages();
        this.total = this.stagesBoss.length;
      } else if (ex.mode === 'gesture') this.total = ex.count || 5;
      else if (ex.mode === 'free' || ex.mode === 'sandbox') this.total = 1;
      else this.total = ex.rounds || 3;
    }

    // ---------- layout ----------
    build() {
      const h = this.host;
      h.innerHTML = '';
      this.root = U.el('div', { class: 'ex' });
      this.top = U.el('div', { class: 'ex-top' });
      this.sayEl = U.el('div', { class: 'ex-say' });
      this.progEl = U.el('div', { class: 'ex-prog' });
      this.timerEl = U.el('div', { class: 'ex-timer hidden' });
      this.top.append(this.sayEl, this.timerEl, this.progEl);

      this.tools = this.buildTools();
      this.stage = U.el('div', { class: 'ex-stage' });
      this.boardWrap = U.el('div', { class: 'ex-boardwrap' });
      this.stage.appendChild(this.boardWrap);
      this.resultEl = U.el('div', { class: 'ex-result hidden' });

      this.actions = U.el('div', { class: 'ex-actions' });
      this.main = U.el('div', { class: 'ex-main' }, [this.tools, this.stage]);
      this.root.append(this.top, this.main, this.resultEl, this.actions);
      h.appendChild(this.root);
      this.board = new DA.Board(this.boardWrap, {});
      this.fit = () => {
        const r = this.stage.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const w = Math.min(r.width, r.height * 1.5);
        this.boardWrap.style.width = w + 'px';
      };
      this.ro = new ResizeObserver(this.fit); this.ro.observe(this.stage);
      this.fit();
    }

    buildTools() {
      const box = U.el('div', { class: 'tools' });
      const mkTool = (id, icon, label) => U.el('button', { class: 'tool', 'data-tool': id, title: label, 'aria-label': label, html: icon + '<small>' + label + '</small>', onclick: () => this.setTool(id) });
      this.toolBtns = [
        mkTool('pencil', '✏️', 'Pencil'), mkTool('pen', '🖊️', 'Pen'), mkTool('marker', '🖍️', 'Marker'),
        mkTool('color', '🎨', 'Color pencil'), mkTool('soft', '☁️', 'Soft pastel'), mkTool('eraser', '🧽', 'Eraser'),
      ];
      const darkBox = U.el('div', { class: 'tool-group dark-group' });
      this.darkBtns = [['Light', 0.3], ['Medium', 0.6], ['Dark', 1]].map(([n, v]) => U.el('button', { class: 'pill', text: n, onclick: () => this.setDark(v) }));
      darkBox.append(...this.darkBtns);
      this.colorBox = U.el('div', { class: 'tool-group colors hidden' });
      (this.ex.palette === 'nature' ? NATURE : COLORS.concat(NATURE.slice(0, 8))).forEach((c, i) => {
        const sw = U.el('button', { class: 'swatch' + (i === 1 ? ' on' : ''), style: 'background:' + c, 'aria-label': 'color ' + c, onclick: () => {
          this.board.color = c;
          this.colorBox.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('on', x === sw));
        } });
        this.colorBox.appendChild(sw);
      });
      const custom = U.el('input', { type: 'color', value: '#e4572e', class: 'custom-color', 'aria-label': 'Pick any color', oninput: (e) => {
        this.board.color = e.target.value;
        this.colorBox.querySelectorAll('.swatch').forEach((x) => x.classList.remove('on'));
      } });
      this.colorBox.appendChild(custom);
      const size = U.el('input', { type: 'range', min: 1, max: 24, value: 4, class: 'size', 'aria-label': 'Brush size', oninput: (e) => { this.board.size = +e.target.value; } });
      this.sizeInput = size;
      const undo = U.el('button', { class: 'tool small', html: '↩︎<small>Undo</small>', onclick: () => this.board.undo() });
      const redo = U.el('button', { class: 'tool small', html: '↪︎<small>Redo</small>', onclick: () => this.board.redo() });
      const clear = U.el('button', { class: 'tool small', html: '🗑️<small>Clear</small>', onclick: () => this.board.clear() });
      this.guideBtn = U.el('button', { class: 'tool small hidden', html: '👁️<small>Guide</small>', onclick: () => this.toggleGuide() });
      const tips = U.el('button', { class: 'tool small', html: '📖<small>Tips</small>', onclick: () => this.showTips() });
      box.append(...this.toolBtns, darkBox, this.colorBox, U.el('label', { class: 'size-label' }, ['Size', size]), undo, redo, clear, this.guideBtn, tips);
      return box;
    }

    setTool(t) {
      this.board.setTool(t);
      this.toolBtns.forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
      this.colorBox.classList.toggle('hidden', !['marker', 'color', 'soft'].includes(t));
      this.root.querySelector('.dark-group').classList.toggle('hidden', !['pencil', 'color', 'soft'].includes(t));
      const sz = { pencil: 4, pen: 3, marker: 14, eraser: 6, color: 5, soft: 12 }[t];
      this.board.size = sz; this.sizeInput.value = sz;
    }
    setDark(v) {
      this.board.darkness = v;
      this.darkBtns.forEach((b, i) => b.classList.toggle('on', [0.3, 0.6, 1][i] === v));
    }

    showTips() {
      const l = this.lesson;
      const html = l ? `<h2>${l.emoji} ${U.esc(l.title)}</h2>${l.theory}` : `<h2>Tips</h2><p>${U.esc(this.ex.say || '')}</p>`;
      const m = ui.modal(U.el('div', { class: 'theory' }, [U.el('div', { html }), U.el('div', { class: 'row end' }, [U.el('button', { class: 'btn primary', text: 'Got it!', onclick: () => m.close() })])]), { wide: true });
    }

    toggleGuide() {
      this.guideHidden = !this.guideHidden;
      this.board.paper.style.opacity = this.guideHidden ? 0 : 1;
    }

    say(text, mood) { this.sayEl.innerHTML = ''; this.sayEl.appendChild(ui.bubble(text, mood)); }

    setProgress() {
      this.progEl.innerHTML = '';
      for (let i = 0; i < this.total; i++) this.progEl.appendChild(U.el('span', { class: 'dot' + (i < this.round ? ' done' : i === this.round ? ' cur' : '') }));
    }

    setActions(btns) {
      this.actions.innerHTML = '';
      btns.forEach((b) => this.actions.appendChild(U.el('button', { class: 'btn ' + (b.cls || ''), html: b.text, onclick: b.on })));
    }

    // ---------- rounds ----------
    startRound() {
      if (this.dead) return;
      this.clearTimers();
      const ex = this.ex, b = this.board;
      b.clear(true); b.setOverlay(null); b.enabled = true;
      this.resultEl.classList.add('hidden');
      this.guideHidden = false; b.paper.style.opacity = 1;
      this.guideBtn.classList.add('hidden');
      this.timerEl.classList.add('hidden');
      if (this.refEl) { this.refEl.remove(); this.refEl = null; }
      this.setProgress();
      const r = U.rng();
      this.r = r;
      const defaultTool = { value: 'pencil', shade: 'pencil', free: 'pencil', gesture: 'pencil', sandbox: 'pencil', boss: 'pencil' }[ex.mode] || 'pen';
      this.setTool(defaultTool);
      this.setDark(ex.mode === 'value' || ex.mode === 'shade' ? 0.3 : 0.75);
      this.tools.querySelector('[data-tool="marker"]').classList.toggle('hidden', !['animal', 'free', 'sandbox'].includes(ex.mode));
      const colorModes = ['boss', 'free', 'sandbox'];
      this.tools.querySelector('[data-tool="color"]').classList.toggle('hidden', !colorModes.includes(ex.mode));
      this.tools.querySelector('[data-tool="soft"]').classList.toggle('hidden', !colorModes.includes(ex.mode));

      const m = this['round_' + ex.mode];
      if (!m) throw new Error('Unknown mode ' + ex.mode);
      m.call(this, r);
    }

    checkButtons(onCheck) {
      this.setActions([
        { text: '🚪 Exit', cls: 'ghost', on: () => this.exit() },
        { text: '✅ Check my drawing', cls: 'primary big', on: () => { if (this.board.isEmpty()) { ui.toast('Draw something first! ✏️'); return; } onCheck(); } },
      ]);
    }

    exit() {
      if (this.scores.length || !this.board.isEmpty()) ui.confirmBox('Leave this lesson? Your progress in it will be lost.', () => this.spec.onExit());
      else this.spec.onExit();
    }

    genFor(frame, margin) {
      const ex = this.ex;
      return Gen.place(Gen.G[ex.gen](this.r, ex.params || {}), frame, margin);
    }

    // --- trace: draw over faint lines
    round_trace() {
      const g = this.genFor(FULL);
      this.g = g;
      this.board.setGuide((ctx) => drawGeom(ctx, g, { paths: true }));
      this.guideBtn.classList.remove('hidden');
      this.say(this.ex.say || 'Trace the lines.');
      this.checkButtons(() => this.checkLines(g.paths, {}));
    }

    // --- ghost: dots only
    round_ghost() {
      const g = this.genFor(FULL);
      this.g = g;
      this.board.setGuide((ctx) => drawGeom(ctx, g, { dots: true }));
      this.say(this.ex.say || 'Connect the dots.');
      this.checkButtons(() => this.checkLines(g.paths, { perPath: true }));
    }

    // --- construct: given guides, draw the rest
    round_construct() {
      const g = this.genFor(FULL);
      this.g = g;
      this.board.setGuide((ctx) => drawGeom(ctx, g, { paths: true, onlyGiven: true }));
      this.say(this.ex.say);
      const todo = g.paths.filter((p) => !p.given), given = g.paths.filter((p) => p.given);
      this.checkButtons(() => this.checkLines(todo, { extra: given.concat(g.helpers.filter((h) => !h.faint)) }));
    }

    // --- flash: memorise, then draw
    round_flash() {
      const g = this.genFor(FULL);
      this.g = g;
      const secs = this.ex.flash || 5;
      this.board.enabled = false;
      this.board.setGuide((ctx) => drawGeom(ctx, g, { paths: true, color: 'rgba(40,44,52,.85)' }));
      this.say('👀 Memorize! Look closely…', 'wow');
      let left = secs;
      this.timerEl.classList.remove('hidden'); this.timerEl.textContent = left + 's';
      this.setActions([{ text: '🚪 Exit', cls: 'ghost', on: () => this.exit() }, { text: "I'm ready!", cls: 'primary', on: () => go() }]);
      const go = () => {
        this.clearTimers();
        this.timerEl.classList.add('hidden');
        this.board.setGuide(null);
        this.board.enabled = true;
        this.say(this.ex.say || 'Now draw it from memory!', 'think');
        ui.sound('tick');
        this.checkButtons(() => this.checkLines(g.paths, {}));
      };
      this.timers.push(setInterval(() => { left--; this.timerEl.textContent = left + 's'; if (left <= 0) go(); }, 1000));
    }

    // --- copy: reference left, draw right
    round_copy() {
      const g = this.genFor(LEFT, 0.1);
      this.g = g;
      this.board.setGuide((ctx) => { divider(ctx); drawGeom(ctx, g, { paths: true, color: 'rgba(40,44,52,.85)', width: 3 }); });
      this.say(this.ex.say || 'Copy it on the right side.');
      const target = Gen.shift(g, DX, 0);
      this.checkButtons(() => this.checkLines(target.paths, { align: true, zone: { x: DX, y: 0, w: 1200 - DX, h: 800 } }));
    }

    // --- circles
    round_circles() {
      const n = this.ex.count || 4;
      this.board.setGuide((ctx) => { ctx.fillStyle = 'rgba(120,130,150,.5)'; ctx.font = '600 22px system-ui'; ctx.fillText('Draw ' + n + ' circles anywhere ⭕', 40, 50); });
      this.say(this.ex.say);
      this.checkButtons(() => {
        const res = S.circleScore(this.board, n);
        this.board.setOverlay((ctx) => {
          res.fits.forEach((f, i) => {
            ctx.save(); ctx.strokeStyle = i < n ? 'rgba(16,172,132,.8)' : 'rgba(150,150,150,.5)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
            ctx.beginPath(); ctx.arc(f.cx, f.cy, f.r, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]); ctx.fillStyle = '#10ac84'; ctx.font = '800 26px system-ui'; ctx.textAlign = 'center';
            ctx.fillText(f.score, f.cx, f.cy + 9); ctx.restore();
          });
        });
        if (res.used.length < n) ui.toast(`Only ${res.used.length} circle${res.used.length === 1 ? '' : 's'} found — draw ${n} to score full points.`);
        this.showRoundResult(res.score, S.circleTips(res));
      });
    }

    // --- value scale
    round_value() {
      const g = Gen.place(Gen.G.valueScale(this.r, { steps: this.ex.steps || 5 }), { x: 60, y: 200, w: 1080, h: 400 }, 0.02);
      const boxes = g.helpers.map((h) => { const xs = h.pts.map((p) => p[0]), ys = h.pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; });
      this.board.setGuide((ctx) => {
        drawGeom(ctx, g, {});
        ctx.fillStyle = 'rgba(90,100,120,.85)'; ctx.font = '600 22px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('white', boxes[0][0] + boxes[0][2] / 2, boxes[0][1] - 18);
        ctx.fillText('black', boxes[boxes.length - 1][0] + boxes[0][2] / 2, boxes[0][1] - 18);
        ctx.fillText('→ darker →', 600, boxes[0][1] + boxes[0][3] + 50);
      });
      this.say(this.ex.say);
      this.checkButtons(() => {
        const res = S.valueScaleScore(this.board, boxes);
        this.board.setOverlay((ctx) => {
          res.vals.forEach((v, i) => {
            const b = boxes[i]; ctx.save(); ctx.fillStyle = '#10ac84'; ctx.font = '700 20px system-ui'; ctx.textAlign = 'center';
            ctx.fillText(Math.round(v * 100) + '%', b[0] + b[2] / 2, b[1] + b[3] + 30);
            const target = (i / (boxes.length - 1)) * 0.85;
            ctx.fillStyle = `rgba(0,0,0,${target})`; ctx.fillRect(b[0] + b[2] / 2 - 15, b[1] - 60, 30, 22);
            ctx.strokeStyle = '#aaa'; ctx.strokeRect(b[0] + b[2] / 2 - 15, b[1] - 60, 30, 22);
            ctx.restore();
          });
        });
        this.showRoundResult(res.score, S.valueTips(res));
      });
    }

    // --- shading match
    round_shade() {
      const g = this.genFor(LEFT, 0.12);
      const right = Gen.shift(g, DX, 0);
      this.board.setGuide((ctx) => {
        divider(ctx, '✏️ Shade here');
        g.shade(ctx);
        ctx.save(); ctx.strokeStyle = 'rgba(40,44,52,.6)'; ctx.lineWidth = 2;
        strokePath(ctx, { pts: right.region, closed: true }); ctx.restore();
      });
      this.say(this.ex.say + ' Tip: build up light layers, then press harder for darks.');
      this.checkButtons(() => {
        const res = S.shadeMatchScore(this.board, g.shade, right.region, DX);
        this.showRoundResult(res.score, S.shadeTips(res));
      });
    }

    // --- step-by-step animal (stages: steps → [shade] → [fur] → [eyes] → final)
    animalStages(a) {
      const st = a.steps.map((s, i) => ({ kind: 'step', i, s }));
      if (a.realism >= 3 && a.silhouette) st.push({ kind: 'shade' });
      if (a.realism >= 4) st.push({ kind: 'fur' }, { kind: 'eyes' });
      st.push({ kind: 'final' });
      return st;
    }

    placeAnimal() {
      const a = this.animal, steps = a.steps;
      const all = []; steps.forEach((s) => s.paths.forEach((p) => all.push(p)));
      const place = (frame, margin) => {
        const g = Gen.place({ paths: all, region: a.silhouette || null }, frame, margin);
        let k = 0;
        return { byStep: steps.map((s) => s.paths.map(() => g.paths[k++])), paths: g.paths, region: g.region };
      };
      this.ag = place(FULL, 0.06);
      this.agLeft = place(LEFT, 0.08);
      if (a.realism >= 3 && a.silhouette) {
        const lines = (g) => g.paths.filter((p) => !p.construct);
        this.refFull = DA.realism.render(lines(this.ag), this.ag.region, { texture: a.realism >= 4 });
        this.refLeft = DA.realism.render(lines(this.agLeft), this.agLeft.region, { texture: a.realism >= 4 });
        this.refImg = DA.realism.preview(this.refFull, this.ag.region);
      }
    }

    refCard(show) {
      if (this.refEl) { this.refEl.remove(); this.refEl = null; }
      if (!show || !this.refImg) return;
      const img = U.el('img', { src: this.refImg, alt: 'Shaded reference' });
      const btn = U.el('button', { class: 'ref-toggle', text: 'Hide', onclick: () => { const h = this.refEl.classList.toggle('mini'); btn.textContent = h ? 'Show reference' : 'Hide'; } });
      this.refEl = U.el('div', { class: 'ref-card' }, [U.el('div', { class: 'ref-label', text: '📷 Reference · light from top-left' }), img, btn]);
      this.stage.appendChild(this.refEl);
    }

    keepInk() { if (this.keptStrokes) { this.board.strokes = this.keptStrokes.slice(); this.board.replay(); } }

    round_animal() {
      const a = this.animal;
      if (!this.ag) this.placeAnimal();
      const stage = this.stages[this.round];
      const nSteps = a.steps.length;
      this.refCard(false);
      this.prevKept = this.keptStrokes ? this.keptStrokes.slice() : [];
      const next = (score, tips) => {
        this.keptStrokes = this.board.strokes.filter((s) => s.tool !== 'clear');
        if (score == null) { this.round++; this.startRound(); return; }
        this.showRoundResult(score, tips);
      };
      const ghostAll = (ctx, alpha) => {
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        this.ag.paths.forEach((p) => { ctx.strokeStyle = p.construct ? `rgba(84,160,255,${alpha * 0.8})` : `rgba(120,130,150,${alpha})`; ctx.lineWidth = 3; ctx.setLineDash(p.construct ? [10, 8] : []); strokePath(ctx, p); });
        ctx.restore();
      };
      const doneBtn = (label) => this.setActions([
        { text: '🚪 Exit', cls: 'ghost', on: () => this.exit() },
        { text: label || 'Done with this step →', cls: 'primary big', on: () => next(null) },
      ]);

      if (stage.kind === 'step') {
        const i = stage.i, st = stage.s;
        const prev = [].concat(...this.ag.byStep.slice(0, i));
        const cur = this.ag.byStep[i];
        this.keepInk();
        this.board.setGuide((ctx) => {
          ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          prev.forEach((p) => { ctx.strokeStyle = p.construct ? 'rgba(84,160,255,.22)' : 'rgba(120,130,150,.25)'; ctx.lineWidth = 3; ctx.setLineDash(p.construct ? [10, 8] : []); strokePath(ctx, p); });
          cur.forEach((p) => { ctx.strokeStyle = p.construct ? 'rgba(84,160,255,.55)' : 'rgba(255,159,67,.75)'; ctx.lineWidth = 5; ctx.setLineDash(p.construct ? [12, 9] : []); strokePath(ctx, p); });
          ctx.restore();
        });
        this.guideBtn.classList.remove('hidden');
        const hasConstruct = cur.some((p) => p.construct);
        if (hasConstruct) { this.setTool('pencil'); this.setDark(0.3); }
        this.say(`<b>Step ${i + 1} of ${nSteps}:</b> ${st.say}${hasConstruct ? ' <i>(light pencil!)</i>' : ''}`);
        if (!cur.length) { doneBtn(); return; }
        this.checkButtons(() => {
          const res = S.lineScore(this.board, cur, { tolGood: 8, tolBad: 30, extra: prev });
          this.board.setOverlay(feedbackOverlay(res));
          next(res.score, S.lineTips(res));
        });
        return;
      }

      if (stage.kind === 'shade') {
        this.keepInk();
        this.board.setGuide((ctx) => ghostAll(ctx, 0.18));
        this.refCard(true);
        this.setTool('pencil'); this.setDark(0.3); this.board.size = 10; this.sizeInput.value = 10;
        this.say('<b>Light & shadow!</b> The light comes from the <b>top-left</b>. Keep the lit side white, shade the side turned away, add the darkest band (core shadow) where the form turns, and a cast shadow on the ground. Build up light layers!');
        this.checkButtons(() => {
          const res = S.shadeMatchScore(this.board, this.refFull.draw, this.ag.region, 0);
          next(res.score, S.shadeTips(res));
        });
        return;
      }

      if (stage.kind === 'fur') {
        this.keepInk();
        this.board.setGuide((ctx) => ghostAll(ctx, 0.12));
        this.refCard(true);
        this.setTool('pencil'); this.setDark(0.6); this.board.size = 2; this.sizeInput.value = 2;
        this.say('<b>Fur texture:</b> draw short flicks that follow the direction the fur grows — away from the nose, down the body, along the tail. Short fur on the face and legs, longer on the chest and tail. Put more flicks in the shadows and fewer in the light.');
        doneBtn('Fur done →');
        return;
      }

      if (stage.kind === 'eyes') {
        this.keepInk();
        this.board.setGuide((ctx) => ghostAll(ctx, 0.12));
        this.refCard(true);
        this.setTool('pen'); this.board.size = 2; this.sizeInput.value = 2;
        this.say('<b>Bring it to life — the eye:</b> make the pupil the darkest dark, leave a tiny white highlight on the side the light comes from, darken the upper eyelid, and add a dark nose tip. Small details, big difference!');
        doneBtn('Looks alive! →');
        return;
      }

      // final: draw it on your own
      this.keptStrokes = null;
      const Lf = this.agLeft;
      this.board.setGuide((ctx) => {
        divider(ctx, '✏️ Your turn!');
        if (this.refLeft) { this.refLeft.draw(ctx); ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0)'; ctx.restore(); }
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        Lf.paths.forEach((p) => {
          if (this.refLeft && !p.construct) return;
          ctx.strokeStyle = p.construct ? 'rgba(84,160,255,.4)' : 'rgba(40,44,52,.85)'; ctx.lineWidth = 3; ctx.setLineDash(p.construct ? [10, 8] : []); strokePath(ctx, p);
        });
        ctx.restore();
        // keep the right side clean even if the reference spilled over
        ctx.save(); ctx.fillStyle = '#fff'; ctx.fillRect(DX + 2, 50, 1200 - DX, 800); ctx.restore();
      });
      this.setTool('pencil'); this.setDark(0.75);
      const extra = a.realism >= 3 ? ' Then add shading' + (a.realism >= 4 ? ', fur and eye details' : '') + ' if you like.' : '';
      this.say(`<b>Final challenge!</b> Draw the ${a.name.toLowerCase()} on your own on the right side. Start with the light construction shapes!${extra}`, 'cheer');
      const right = Gen.shift({ paths: Lf.paths, dots: [], helpers: [], vps: [] }, DX, 0);
      const fin = right.paths.filter((p) => !p.construct), cons = right.paths.filter((p) => p.construct);
      this.checkButtons(() => this.checkLines(fin, { align: true, extra: cons, zone: { x: DX, y: 0, w: 1200 - DX, h: 800 }, tol: [11, 40], final: true }));
    }


    // ======================= BOSS MODE =======================
    // A long, colored realistic drawing done in stages, with a grid and a reference.
    bossStages() {
      return [
        { id: 'ref', title: 'Choose your reference' },
        { id: 'outline', title: 'Outline with the grid', tool: 'pencil', dark: 0.3, size: 3,
          say: '<b>Stage 1 · Outline.</b> Use the grid! Find which square each edge passes through and copy it square by square. Draw <b>lightly</b> — just the big outer shape, ears, eyes and main shapes. No details yet.' },
        { id: 'shadows', title: 'Shadow map', tool: 'soft', color: '#5b5f73', dark: 0.3, size: 14,
          say: '<b>Stage 2 · Shadow map.</b> Squint at the reference until the details blur. Fill only the <b>shadow shapes</b> with one cool grey-blue. This locks in the 3D form before any color.' },
        { id: 'local', title: 'Local color', tool: 'color', dark: 0.3, size: 8,
          say: '<b>Stage 3 · Local color.</b> Lay in the animal\'s real colors in <b>light layers</b> over everything (lit areas too). Use the 🎨 palette or pick any color. Light layers now — you can always add, it\'s hard to take away.' },
        { id: 'values', title: 'Values & form', tool: 'color', dark: 0.6, size: 7,
          say: '<b>Stage 4 · Values & form.</b> Build the darks: deepen the shadow side, add the <b>core shadow</b> where the form turns away from the light, a darker <b>cast shadow</b> on the ground, and keep the lit side light. Use warmer colors in the light, cooler in the shadows.' },
        { id: 'texture', title: 'Texture', tool: 'color', dark: 0.6, size: 2,
          say: '<b>Stage 5 · Texture.</b> Now the realism: wrinkles, fur or scales. Make your strokes <b>follow the form</b> — wrinkles wrap around a trunk, fur flows away from the nose. More texture in the shadows and edges, less in the light.' },
        { id: 'details', title: 'Details & highlights', tool: 'color', dark: 1, size: 3,
          say: '<b>Stage 6 · Details & highlights.</b> The finishing touches: the darkest darks in the eye, nostrils and deep folds; bright <b>highlights</b> with white (or the eraser) on the eye, tusks, wet nose and top edges. Sharpen the edges closest to you.' },
        { id: 'review', title: 'Boss battle results' },
      ];
    }

    bossRefBuiltin(key, color) {
      const a = DA.animals.ANIMALS[key];
      const all = []; a.steps.forEach((st) => st.paths.forEach((q) => all.push(q)));
      const g = Gen.place({ paths: all, region: a.silhouette }, FULL, 0.06);
      const ref = DA.realism.render(g.paths.filter((q) => !q.construct), g.region, { texture: true, color });
      return { kind: 'builtin', animal: key, color, draw: ref.draw, rect: DA.realism.cropRect(g.region), name: a.name };
    }

    bossRefPhoto(img, dataUrl) {
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      const sc = Math.min(FULL.w / iw, FULL.h / ih), w = iw * sc, h = ih * sc;
      const x = FULL.x + (FULL.w - w) / 2, y = FULL.y + (FULL.h - h) / 2;
      return { kind: 'photo', photo: dataUrl, draw: (ctx) => ctx.drawImage(img, x, y, w, h), rect: { x0: x, y0: y, x1: x + w, y1: y + h }, name: 'your photo' };
    }

    bossPreview() {
      const R = this.bossRef, r = R.rect, w = r.x1 - r.x0, h = r.y1 - r.y0;
      const full = document.createElement('canvas'); full.width = 1200; full.height = 800;
      const f = full.getContext('2d'); f.fillStyle = '#fff'; f.fillRect(0, 0, 1200, 800); R.draw(f);
      const out = document.createElement('canvas'); out.width = w; out.height = h;
      const o = out.getContext('2d'); o.drawImage(full, r.x0, r.y0, w, h, 0, 0, w, h);
      if (this.bossGrid) this.drawGrid(o, { x0: 0, y0: 0, x1: w, y1: h }, 'rgba(255,60,90,.65)');
      return out.toDataURL('image/jpeg', 0.9);
    }

    drawGrid(ctx, r, color) {
      const n = this.bossGrid || 4;
      ctx.save(); ctx.strokeStyle = color || 'rgba(255,60,90,.45)'; ctx.lineWidth = 1.5;
      for (let k = 0; k <= n; k++) {
        const x = r.x0 + ((r.x1 - r.x0) * k) / n, y = r.y0 + ((r.y1 - r.y0) * k) / n;
        ctx.beginPath(); ctx.moveTo(x, r.y0); ctx.lineTo(x, r.y1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r.x0, y); ctx.lineTo(r.x1, y); ctx.stroke();
      }
      ctx.restore();
    }

    bossGuide() {
      this.board.setGuide((ctx) => {
        if (this.bossPeek) { ctx.save(); ctx.globalAlpha = 0.3; this.bossRef.draw(ctx); ctx.restore(); }
        if (this.bossGrid) this.drawGrid(ctx, this.bossRef.rect);
      });
      if (this.stage) this.bossCard();
    }

    bossCard() {
      if (this.refEl) this.refEl.remove();
      const img = U.el('img', { src: this.bossPreview(), alt: 'Reference' });
      const btn = U.el('button', { class: 'ref-toggle', text: 'Hide', onclick: () => { const h = this.refEl.classList.toggle('mini'); btn.textContent = h ? 'Show' : 'Hide'; requestAnimationFrame(this.fit); } });
      this.refEl = U.el('div', { class: 'ref-card boss-card' }, [U.el('div', { class: 'ref-label', text: '📷 Reference · ' + this.bossRef.name }), img, btn]);
      this.main.appendChild(this.refEl); // beside the canvas, never covering it
      requestAnimationFrame(this.fit);
    }

    async bossSave(silent) {
      if (!this.bossRef) return;
      const ok = await DA.store.saveProject({
        id: this.lesson.id, t: Date.now(), round: this.round, grid: this.bossGrid,
        strokes: this.board.strokes.map((st) => Object.assign({}, st)),
        ref: { kind: this.bossRef.kind, animal: this.bossRef.animal, color: this.bossRef.color, photo: this.bossRef.photo || null },
      });
      if (!silent) ui.toast(ok ? '💾 Saved! You can come back to this anytime.' : '⚠️ Could not save on this device.');
    }

    async bossRestore(p) {
      this.bossGrid = p.grid;
      if (p.ref.kind === 'photo' && p.ref.photo) {
        const img = await loadImage(p.ref.photo);
        this.bossRef = this.bossRefPhoto(img, p.ref.photo);
      } else this.bossRef = this.bossRefBuiltin(p.ref.animal, p.ref.color);
      this.keptStrokes = p.strokes || [];
      this.round = Math.max(1, p.round);
    }

    round_boss() {
      const st = this.stagesBoss[this.round];
      this.progEl.title = st.title;
      if (st.id === 'ref') return this.bossChoose();
      if (st.id === 'review') return this.bossReview();
      if (this.keptStrokes) { this.board.strokes = this.keptStrokes.slice(); this.board.replay(); this.keptStrokes = null; }
      this.bossGuide();
      this.setTool(st.tool); this.setDark(st.dark);
      this.board.size = st.size; this.sizeInput.value = st.size;
      if (st.color) this.board.color = st.color;
      this.say(st.say + (st.id === 'outline' ? '' : ' <i>(tip: 👻 Peek shows the reference faintly to check proportions)</i>'));
      const goto = (d) => { this.keptStrokes = this.board.strokes.slice(); this.round += d; this.bossSave(true); this.startRound(); };
      this.setActions([
        { text: '💾 Save & exit', cls: 'ghost', on: async () => { await this.bossSave(); this.spec.onExit(); } },
        { text: this.bossGrid ? '# Grid on' : '# Grid off', on: () => { this.bossGrid = this.bossGrid ? 0 : 4; this.bossGuide(); this.round_boss_actions_refresh(); } },
        { text: this.bossPeek ? '👻 Peek on' : '👻 Peek', on: () => { this.bossPeek = !this.bossPeek; this.bossGuide(); this.round_boss_actions_refresh(); } },
        this.round > 1 ? { text: '← Back', on: () => goto(-1) } : null,
        { text: this.round === this.total - 2 ? 'See results 🏁' : 'Next stage →', cls: 'primary big', on: () => goto(1) },
      ].filter(Boolean));
    }

    round_boss_actions_refresh() {
      const keep = { tool: this.board.tool, size: this.board.size, dark: this.board.darkness, color: this.board.color };
      this.keptStrokes = this.board.strokes.slice();
      this.round_boss();
      this.setTool(keep.tool); this.setDark(keep.dark);
      this.board.size = keep.size; this.sizeInput.value = keep.size; this.board.color = keep.color;
    }

    bossChoose() {
      this.board.enabled = false;
      const ex = this.ex;
      const file = U.el('input', { type: 'file', accept: 'image/*', class: 'hidden', onchange: async (e) => {
        const f = e.target.files[0]; if (!f) return;
        const url = await shrinkImage(f, 1400);
        const img = await loadImage(url);
        this.bossRef = this.bossRefPhoto(img, url);
        this.bossGrid = 4; this.board.enabled = true; this.round = 1; this.startRound();
      } });
      this.root.appendChild(file);
      this.board.setGuide((ctx) => {
        ctx.save(); ctx.fillStyle = '#1b1922'; ctx.fillRect(0, 0, 1200, 800);
        ctx.fillStyle = '#feca57'; ctx.font = '900 64px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('👑 BOSS MODE', 600, 300);
        ctx.fillStyle = '#fff'; ctx.font = '600 30px system-ui';
        ctx.fillText('A realistic, full-color animal drawing', 600, 370);
        ctx.fillStyle = '#c9c3d6'; ctx.font = '500 24px system-ui';
        ctx.fillText('6 stages · grid method · about 30–60 minutes · saves as you go', 600, 420);
        ctx.restore();
      });
      const builtin = ex.animal ? DA.animals.ANIMALS[ex.animal] : null;
      this.say(ex.photoOnly
        ? '<b>Final boss:</b> pick a photo of a real animal — your pet, or a photo you\'re allowed to use. You\'ll draw it in full color, stage by stage.'
        : `<b>Choose your reference.</b> Use a real photo of ${builtin ? 'a ' + builtin.name.toLowerCase() : 'an animal'} (best!) or the built-in colored study. Photos should be ones you took or are free to use.`, 'wow');
      this.setActions([
        { text: '🚪 Exit', cls: 'ghost', on: () => this.spec.onExit() },
        builtin && !ex.photoOnly ? { text: `${builtin.emoji} Built-in ${builtin.name.toLowerCase()}`, on: () => {
          this.bossRef = this.bossRefBuiltin(ex.animal, ex.color);
          this.bossGrid = 4; this.board.enabled = true; this.round = 1; this.startRound();
        } } : null,
        { text: '📷 Use my photo', cls: 'primary big', on: () => file.click() },
      ].filter(Boolean));
    }

    bossReview() {
      if (this.keptStrokes) { this.board.strokes = this.keptStrokes.slice(); this.board.replay(); this.keptStrokes = null; }
      this.bossPeek = false;
      this.board.setGuide(null);
      this.bossCard();
      this.board.enabled = false;
      const res = S.likenessScore(this.board, this.bossRef.draw, this.bossRef.rect);
      this.bossAuto = res.score;
      ui.sound(res.score >= 60 ? 'great' : 'ok');
      this.say('<b>Boss battle results!</b> Compare your drawing with the reference. Then tell me how it went.', res.score >= 60 ? 'cheer' : 'think');
      const pct = (v) => Math.round((v || 0) * 100) + '%';
      this.resultEl.innerHTML = '';
      this.resultEl.append(
        U.el('div', { class: 'score-big ' + (res.score >= 60 ? 'pass' : 'low'), html: `<b>${res.score}</b><small>likeness</small>` }),
        U.el('div', { class: 'score-text' }, [
          U.el('div', { class: 'praise', html: `Values ${pct(res.values)} · Colors ${pct(res.colors)} · Coverage ${pct(res.effort)}` }),
          U.el('ul', { class: 'tips' }, S.likenessTips(res).map((t) => U.el('li', { text: t }))),
        ]),
      );
      this.resultEl.classList.remove('hidden');
      this.setActions([
        { text: '💾 Save & exit', cls: 'ghost', on: async () => { this.keptStrokes = this.board.strokes.slice(); await this.bossSave(); this.spec.onExit(); } },
        { text: '← Keep working', on: () => { this.keptStrokes = this.board.strokes.slice(); this.round = this.total - 2; this.startRound(); } },
        { text: '🏁 Finish boss fight', cls: 'primary big', on: () => this.selfAssess([
          'I used the grid to get the proportions right',
          'The shadow shapes match the reference',
          'I built color in layers, light to dark',
          'Texture follows the form (wrinkles / fur)',
          'The eyes have dark darks and a highlight',
          'I spent at least 30 minutes on it',
        ], (self) => Math.round(0.5 * this.bossAuto + 0.5 * self)) },
      ]);
    }

    // --- free / self assessed
    round_free() {
      const ex = this.ex;
      if (ex.gen) { const g = this.genFor(FULL, 0.04); this.board.setGuide((ctx) => drawGeom(ctx, g, {})); }
      else this.board.setGuide(null);
      this.say(ex.say);
      if (ex.timer) this.startTimer(ex.timer, () => { ui.sound('ok'); ui.toast("⏰ Time! Finish up when you're ready."); });
      this.setActions([
        { text: '🚪 Exit', cls: 'ghost', on: () => this.exit() },
        { text: "✅ I'm done", cls: 'primary big', on: () => { if (this.board.isEmpty()) { ui.toast('Draw something first! ✏️'); return; } this.selfAssess(ex.checklist); } },
      ]);
    }

    // --- sandbox: blank page, no scoring
    round_sandbox() {
      this.board.setGuide(null);
      this.progEl.innerHTML = '';
      this.say('A blank page — draw anything you like! 🎨');
      this.setActions([
        { text: '🚪 Exit', cls: 'ghost', on: () => this.exit() },
        { text: '💾 Save to My Zoo', cls: 'primary big', on: () => {
          if (this.board.isEmpty()) { ui.toast('Draw something first! ✏️'); return; }
          this.scores.push(60); this.snapshots.push(this.board.snapshot()); this.finish();
        } },
      ]);
    }

    startTimer(secs, onEnd) {
      let left = secs;
      const fmt = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      this.timerEl.classList.remove('hidden'); this.timerEl.textContent = '⏱ ' + fmt(left);
      this.timers.push(setInterval(() => {
        left--;
        this.timerEl.textContent = '⏱ ' + fmt(Math.max(0, left));
        this.timerEl.classList.toggle('urgent', left <= 5 && left > 0);
        if (left === 0) onEnd();
      }, 1000));
    }

    selfAssess(list, combine) {
      list = list || ['I took my time', 'I tried my best'];
      let rating = 0;
      const checks = list.map((t) => U.el('label', { class: 'check' }, [U.el('input', { type: 'checkbox' }), U.el('span', { text: t })]));
      const faces = ['😕', '🙂', '😊', '😄', '🤩'].map((f, i) => U.el('button', { class: 'face', text: f, onclick: (e) => { rating = i + 1; faces.forEach((x, j) => x.classList.toggle('on', j === i)); } }));
      const m = ui.modal(U.el('div', { class: 'assess' }, [
        U.el('h2', { text: 'How did it go?' }),
        U.el('p', { class: 'muted', text: 'Be honest — checking yourself is a real artist skill!' }),
        ...checks,
        U.el('p', { text: 'How happy are you with your drawing?' }),
        U.el('div', { class: 'faces' }, faces),
        U.el('div', { class: 'row end' }, [
          U.el('button', { class: 'btn', text: 'Keep drawing', onclick: () => m.close() }),
          U.el('button', { class: 'btn primary', text: 'Finish', onclick: () => {
            if (!rating) { ui.toast('Pick a face first! 🙂'); return; }
            const chk = checks.filter((c) => c.querySelector('input').checked).length / checks.length;
            m.close();
            let score = Math.round(100 * (0.6 * chk + 0.4 * (rating / 5)));
            if (combine) score = combine(score);
            this.scores.push(score);
            this.snapshots.push(this.board.snapshot({ guide: this.ex.mode !== 'boss' }));
            this.finish();
          } }),
        ]),
      ]));
    }

    // --- gesture: timed poses
    round_gesture() {
      const ex = this.ex;
      const g = Gen.place(Gen.G[ex.gen || 'mannequin'](this.r, {}), LEFT, 0.12);
      this.board.setGuide((ctx) => { divider(ctx); drawGeom(ctx, g, { paths: true, color: 'rgba(40,44,52,.85)', width: 4 }); });
      this.say(`<b>Pose ${this.round + 1} of ${this.total}.</b> Start with the line of action — one curve from head to feet!`);
      const nextPose = () => {
        this.clearTimers();
        this.snapshots.push(this.board.snapshot({ scale: 0.4 }));
        this.round++;
        if (this.round >= this.total) { this.round = this.total - 1; this.selfAssess(['I drew the line of action first', 'I captured every pose', 'I kept my lines loose and flowing', 'I didn\'t waste time on details']); return; }
        ui.sound('tick');
        this.startRound();
      };
      this.startTimer(ex.seconds || 30, nextPose);
      this.setActions([
        { text: '🚪 Exit', cls: 'ghost', on: () => this.exit() },
        { text: 'Next pose →', cls: 'primary big', on: nextPose },
      ]);
    }

    // ---------- checking ----------
    checkLines(paths, o) {
      const tol = o.tol || this.ex.tol || [7, 26];
      const res = S.lineScore(this.board, paths, { tolGood: tol[0], tolBad: tol[1], align: o.align, zone: o.zone, extra: o.extra });
      const ctx = {};
      if (o.perPath) ctx.strokesPerPath = this.board.inkStrokes().length / Math.max(1, paths.length);
      this.board.setOverlay(feedbackOverlay(res));
      this.showRoundResult(res.score, S.lineTips(res, ctx), { final: o.final });
    }

    showRoundResult(score, tips, o) {
      o = o || {};
      this.clearTimers();
      this.board.enabled = false;
      this.scores.push(score);
      this.snapshots.push(this.board.snapshot());
      ui.sound(score >= 85 ? 'great' : score >= 60 ? 'good' : 'ok');
      const stars = DA.store.starsFor(score);
      this.resultEl.innerHTML = '';
      this.resultEl.append(
        U.el('div', { class: 'score-big ' + (score >= 60 ? 'pass' : 'low'), html: `<b>${score}</b>${ui.stars(stars)}` }),
        U.el('div', { class: 'score-text' }, [
          U.el('div', { class: 'praise', text: ui.praise(score) }),
          U.el('ul', { class: 'tips' }, tips.map((t) => U.el('li', { text: t }))),
        ]),
      );
      this.resultEl.classList.remove('hidden');
      const last = this.round >= this.total - 1;
      const isAnimal = this.ex.mode === 'animal';
      const btns = [
        { text: '↻ Try again', cls: '', on: () => { this.scores.pop(); this.snapshots.pop(); this.retry(o); } },
      ];
      if (last && isAnimal && !this.colored) {
        btns.push({ text: '🎨 Color it in', cls: '', on: () => this.colorMode() });
      }
      btns.push({ text: last ? '🏁 Finish' : 'Next →', cls: 'primary big', on: () => { if (last) this.finish(); else { this.round++; this.startRound(); } } });
      this.setActions(btns);
      if (score >= 90) ui.confetti(60);
    }

    retry(o) {
      if (this.ex.mode === 'animal') this.keptStrokes = this.prevKept || [];
      this.board.setOverlay(null);
      this.board.enabled = true;
      this.resultEl.classList.add('hidden');
      // same target, fresh page (animal steps keep previous steps)
      if (this.ex.mode === 'animal') { this.startRound(); return; }
      this.board.clear(true);
      const again = ['round_trace', 'round_ghost', 'round_construct', 'round_copy'].includes('round_' + this.ex.mode);
      if (again) this.round_retrySame();
      else this.startRound();
    }

    round_retrySame() {
      // keep the same target geometry for the retry
      const g = this.g, ex = this.ex;
      if (ex.mode === 'copy') {
        const target = Gen.shift(g, DX, 0);
        this.checkButtons(() => this.checkLines(target.paths, { align: true, zone: { x: DX, y: 0, w: 1200 - DX, h: 800 } }));
      } else if (ex.mode === 'construct') {
        const todo = g.paths.filter((p) => !p.given), given = g.paths.filter((p) => p.given);
        this.checkButtons(() => this.checkLines(todo, { extra: given.concat(g.helpers.filter((h) => !h.faint)) }));
      } else this.checkButtons(() => this.checkLines(g.paths, { perPath: ex.mode === 'ghost' }));
    }

    colorMode() {
      this.colored = true;
      this.board.setOverlay(null);
      this.board.enabled = true;
      this.resultEl.classList.add('hidden');
      this.setTool('marker');
      this.say('🎨 Color your animal! Use any colors you like.', 'cheer');
      this.setActions([{ text: '🏁 Finish', cls: 'primary big', on: () => { this.snapshots[this.snapshots.length - 1] = this.board.snapshot(); this.finish(); } }]);
    }

    finish() {
      this.clearTimers();
      let score;
      if (this.ex.mode === 'animal') {
        const steps = this.scores.slice(0, -1), fin = this.scores[this.scores.length - 1]; // only scored stages push scores
        const avg = steps.length ? steps.reduce((a, b) => a + b, 0) / steps.length : fin;
        score = Math.round(0.45 * avg + 0.55 * fin);
      } else score = Math.round(this.scores.reduce((a, b) => a + b, 0) / Math.max(1, this.scores.length));
      const best = this.snapshots[this.snapshots.length - 1];
      this.spec.onDone({ score, snapshot: best, snapshots: this.snapshots, secs: (Date.now() - this.t0) / 1000, gesture: this.ex.mode === 'gesture' });
    }
  }

  DA.Runner = Runner;
  DA.drawGeom = drawGeom;
})(window.DA);
