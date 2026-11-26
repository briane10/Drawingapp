/* Drawing board: layered canvases, Apple Pencil pressure, palm rejection, undo/redo. */
(function (DA) {
  'use strict';
  const U = DA.util;
  const W = 1200, H = 800;

  const TOOLS = {
    pencil: { color: '#2e2e33', alphaFromDarkness: true, pressure: true },
    pen: { color: '#141418', alpha: 1, pressure: true },
    marker: { alpha: 0.85, pressure: false, colored: true },
    color: { alphaFromDarkness: true, pressure: true, colored: true },
    soft: { alphaFromDarkness: true, pressure: false, colored: true, soft: true },
    eraser: { erase: true, pressure: false },
  };

  class Board {
    constructor(host, opts) {
      opts = opts || {};
      this.W = W; this.H = H;
      this.host = host;
      this.root = U.el('div', { class: 'board' });
      this.paper = U.el('canvas', { class: 'layer paper' });
      this.ink = U.el('canvas', { class: 'layer ink' });
      this.live = U.el('canvas', { class: 'layer live' });
      this.over = U.el('canvas', { class: 'layer over' });
      this.cursor = U.el('div', { class: 'brush-cursor' });
      [this.paper, this.ink, this.live, this.over, this.cursor].forEach((c) => this.root.appendChild(c));
      host.appendChild(this.root);
      this.tmp = document.createElement('canvas');

      this.strokes = [];
      this.redoStack = [];
      this.tool = 'pencil';
      this.size = 4;
      this.darkness = 0.75;
      this.color = '#e4572e';
      this.enabled = true;
      this.guideFn = null; this.overFn = null;
      this.onChange = opts.onChange || (() => {});
      this.settings = DA.store ? DA.store.settings() : {};
      this.penSeen = !!(this.settings && this.settings.penSeen);

      this.active = null;
      this.touches = new Map();
      this.gesture = null;
      this._bind();
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.root);
      this.resize();
    }

    destroy() { this.ro.disconnect(); this.root.remove(); }

    // ---------- sizing ----------
    resize() {
      const r = this.root.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      this.k = r.width / W;
      const pw = Math.round(r.width * dpr), ph = Math.round(r.height * dpr);
      [this.paper, this.ink, this.live, this.over, this.tmp].forEach((c) => { c.width = pw; c.height = ph; });
      this.px = this.k * dpr;
      [this.paper, this.ink, this.live, this.over, this.tmp].forEach((c) => c.getContext('2d').setTransform(this.px, 0, 0, this.px, 0, 0));
      this.redrawGuide(); this.replay(); this.redrawOverlay();
    }

    ctx(c) { return c.getContext('2d'); }

    // ---------- layers ----------
    setGuide(fn) { this.guideFn = fn; this.redrawGuide(); }
    redrawGuide() {
      const c = this.ctx(this.paper);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.paper.width, this.paper.height); c.restore();
      if (this.guideFn) { c.save(); this.guideFn(c); c.restore(); }
    }
    setOverlay(fn) { this.overFn = fn; this.redrawOverlay(); }
    redrawOverlay() {
      const c = this.ctx(this.over);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.over.width, this.over.height); c.restore();
      if (this.overFn) { c.save(); this.overFn(c); c.restore(); }
    }

    // ---------- tools ----------
    setTool(t) { this.tool = t; this._cursorStyle(); }
    _alpha(stroke) {
      const t = TOOLS[stroke.tool];
      if (t.alphaFromDarkness) return U.clamp(stroke.dark, 0.08, 1);
      return t.alpha == null ? 1 : t.alpha;
    }
    _width(stroke, p) {
      const t = TOOLS[stroke.tool];
      const base = stroke.tool === 'eraser' ? stroke.size * 4 : stroke.tool === 'soft' ? stroke.size * 3 : stroke.size;
      if (t.pressure && stroke.pen) return Math.max(0.4, base * (0.2 + 1.5 * p[2]));
      return base;
    }

    // ---------- input ----------
    _bind() {
      const el = this.over;
      const opt = { passive: false };
      // iOS Safari: stop scrolling, magnifier, callouts and double-tap zoom over the canvas
      ['touchstart', 'touchmove', 'touchend'].forEach((n) => this.root.addEventListener(n, (e) => e.preventDefault(), opt));
      ['gesturestart', 'gesturechange', 'contextmenu', 'selectstart', 'dblclick'].forEach((n) => this.root.addEventListener(n, (e) => e.preventDefault(), opt));

      el.addEventListener('pointerdown', (e) => this._down(e));
      el.addEventListener('pointermove', (e) => this._move(e));
      el.addEventListener('pointerup', (e) => this._up(e));
      el.addEventListener('pointercancel', (e) => this._up(e, true));
      el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') this.cursor.style.display = 'none'; });
    }

    _pos(e) {
      const r = this.over.getBoundingClientRect();
      let p = e.pressure;
      if (e.pointerType === 'mouse' || !p) p = 0.5;
      return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H, p];
    }

    _fingerCanDraw() { return !this.penSeen || (DA.store && DA.store.settings().fingerDraw); }

    _down(e) {
      e.preventDefault();
      if (e.pointerType === 'touch') {
        this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: 0 });
        if (!this.gesture) this.gesture = { t: performance.now(), max: 0, moved: 0 };
        this.gesture.max = Math.max(this.gesture.max, this.touches.size);
        if (this.touches.size > 1 && this.active && this.active.pointerType === 'touch') {
          // second finger arrived: this is a gesture, not a stroke
          this._cancelActive();
          return;
        }
        if (this.touches.size > 1 || !this._fingerCanDraw()) return;
      } else if (e.pointerType === 'pen') {
        if (!this.penSeen) {
          this.penSeen = true;
          if (DA.store) DA.store.setSetting('penSeen', true);
          if (this.active && this.active.pointerType === 'touch') this._cancelActive();
          if (DA.toast) DA.toast('✏️ Apple Pencil detected — palm rejection on. Two-finger tap = undo.');
        }
      } else if (e.button !== 0) return;
      if (!this.enabled || this.active) return;
      try { this.over.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      const s = {
        tool: this.tool, size: this.size, dark: this.darkness,
        color: TOOLS[this.tool].colored ? this.color : (TOOLS[this.tool].color || '#000'),
        pen: e.pointerType === 'pen', pts: [this._pos(e)],
        pointerId: e.pointerId, pointerType: e.pointerType, t0: performance.now(),
      };
      this.active = s;
      const lc = this.ctx(this.live);
      this.live.style.opacity = s.tool === 'eraser' ? 1 : this._alpha(s);
      lc.save(); lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, this.live.width, this.live.height); lc.restore();
      this._drawDot(s.tool === 'eraser' ? this.ctx(this.ink) : lc, s);
    }

    _move(e) {
      if (e.pointerType !== 'touch') this._moveCursor(e);
      if (e.pointerType === 'touch' && this.touches.has(e.pointerId)) {
        const t = this.touches.get(e.pointerId);
        t.moved = Math.max(t.moved, Math.hypot(e.clientX - t.x, e.clientY - t.y));
        if (this.gesture) this.gesture.moved = Math.max(this.gesture.moved, t.moved);
      }
      const s = this.active;
      if (!s || s.pointerId !== e.pointerId) return;
      e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      const ctx = s.tool === 'eraser' ? this.ctx(this.ink) : this.ctx(this.live);
      (evs.length ? evs : [e]).forEach((ev) => {
        const p = this._pos(ev), last = s.pts[s.pts.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.6) return;
        s.pts.push(p);
        this._drawSeg(ctx, s, s.pts.length - 1);
      });
    }

    _up(e, cancelled) {
      if (e.pointerType === 'touch') {
        this.touches.delete(e.pointerId);
        if (this.touches.size === 0 && this.gesture) {
          const g = this.gesture; this.gesture = null;
          const quick = performance.now() - g.t < 350 && g.moved < 20;
          if (quick && g.max === 2) { this.undo(); if (DA.toast) DA.toast('↩︎ Undo'); }
          else if (quick && g.max === 3) { this.redo(); if (DA.toast) DA.toast('↪︎ Redo'); }
        }
      }
      const s = this.active;
      if (!s || s.pointerId !== e.pointerId) return;
      if (cancelled && s.pointerType === 'touch') { this._cancelActive(); return; }
      this._finish(s);
    }

    _cancelActive() {
      const s = this.active; this.active = null;
      if (!s) return;
      const lc = this.ctx(this.live);
      lc.save(); lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, this.live.width, this.live.height); lc.restore();
      if (s.tool === 'eraser') this.replay();
    }

    _finish(s) {
      this.active = null;
      const lc = this.ctx(this.live);
      if (s.tool !== 'eraser') {
        this._drawTail(lc, s);
        const ic = this.ctx(this.ink);
        ic.save(); ic.setTransform(1, 0, 0, 1, 0, 0); ic.globalAlpha = this._alpha(s); ic.drawImage(this.live, 0, 0); ic.restore();
        lc.save(); lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, this.live.width, this.live.height); lc.restore();
      } else this._drawTail(this.ctx(this.ink), s);
      s.dur = performance.now() - s.t0;
      delete s.pointerId;
      this.strokes.push(s);
      this.redoStack = [];
      this.onChange();
    }

    _moveCursor(e) {
      const r = this.root.getBoundingClientRect();
      const sz = (this.tool === 'eraser' ? this.size * 4 : this.size) * this.k;
      this.cursor.style.display = 'block';
      this.cursor.style.width = this.cursor.style.height = Math.max(4, sz) + 'px';
      this.cursor.style.transform = 'translate(' + (e.clientX - r.left - Math.max(4, sz) / 2) + 'px,' + (e.clientY - r.top - Math.max(4, sz) / 2) + 'px)';
    }
    _cursorStyle() { this.cursor.classList.toggle('erase', this.tool === 'eraser'); }

    // ---------- rendering ----------
    _prep(ctx, s) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (s.tool === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = ctx.fillStyle = '#000'; }
      else { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = ctx.fillStyle = s.color; }
    }
    _dabs(ctx, s, a, b) {
      const w = this._width(s, a), step = Math.max(1, w / 6);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(len / step));
      ctx.save();
      for (let k = 0; k <= n; k++) {
        const x = a[0] + ((b[0] - a[0]) * k) / n, y = a[1] + ((b[1] - a[1]) * k) / n, r = w / 2;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, s.color); g.addColorStop(1, s.color + '00');
        ctx.fillStyle = g; ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    _drawDot(ctx, s) {
      if (s.tool === 'soft') { this._dabs(ctx, s, s.pts[0], s.pts[0]); return; }
      ctx.save(); this._prep(ctx, s);
      const p = s.pts[0];
      ctx.beginPath(); ctx.arc(p[0], p[1], this._width(s, p) / 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    _drawSeg(ctx, s, i) {
      if (i < 1) return;
      const P = s.pts, a = P[i - 1], b = P[i];
      if (s.tool === 'soft') { this._dabs(ctx, s, a, b); return; }
      const start = i >= 2 ? [(P[i - 2][0] + a[0]) / 2, (P[i - 2][1] + a[1]) / 2] : a;
      const end = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      ctx.save(); this._prep(ctx, s);
      ctx.lineWidth = this._width(s, a);
      ctx.beginPath(); ctx.moveTo(start[0], start[1]); ctx.quadraticCurveTo(a[0], a[1], end[0], end[1]); ctx.stroke();
      ctx.restore();
    }
    _drawTail(ctx, s) {
      const P = s.pts, n = P.length;
      if (n < 2 || s.tool === 'soft') return;
      const a = P[n - 2], b = P[n - 1];
      ctx.save(); this._prep(ctx, s);
      ctx.lineWidth = this._width(s, b);
      ctx.beginPath(); ctx.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.restore();
    }
    _renderStroke(ctx, s) {
      this._drawDot(ctx, s);
      for (let i = 1; i < s.pts.length; i++) this._drawSeg(ctx, s, i);
      this._drawTail(ctx, s);
    }

    replay() {
      const ic = this.ctx(this.ink), tc = this.ctx(this.tmp);
      ic.save(); ic.setTransform(1, 0, 0, 1, 0, 0); ic.clearRect(0, 0, this.ink.width, this.ink.height); ic.restore();
      for (const s of this.strokes) {
        if (s.tool === 'clear') { ic.save(); ic.setTransform(1, 0, 0, 1, 0, 0); ic.clearRect(0, 0, this.ink.width, this.ink.height); ic.restore(); continue; }
        if (s.tool === 'eraser') { this._renderStroke(ic, s); continue; }
        tc.save(); tc.setTransform(1, 0, 0, 1, 0, 0); tc.clearRect(0, 0, this.tmp.width, this.tmp.height); tc.restore();
        this._renderStroke(tc, s);
        ic.save(); ic.setTransform(1, 0, 0, 1, 0, 0); ic.globalAlpha = this._alpha(s); ic.drawImage(this.tmp, 0, 0); ic.restore();
      }
    }

    undo() { if (!this.strokes.length) return; this.redoStack.push(this.strokes.pop()); this.replay(); this.onChange(); }
    redo() { if (!this.redoStack.length) return; this.strokes.push(this.redoStack.pop()); this.replay(); this.onChange(); }
    clear(hard) {
      if (hard) { this.strokes = []; this.redoStack = []; }
      else if (this.inkStrokes().length) { this.strokes.push({ tool: 'clear', pts: [] }); this.redoStack = []; }
      this.replay(); this.onChange();
    }

    // strokes since the last clear, excluding the eraser
    inkStrokes() {
      let i = this.strokes.length - 1;
      while (i >= 0 && this.strokes[i].tool !== 'clear') i--;
      return this.strokes.slice(i + 1).filter((s) => s.tool !== 'eraser');
    }
    isEmpty() { return this.inkStrokes().length === 0; }

    // ink darkness downsampled to a grid (for scoring)
    inkGrid(scale) {
      const gw = Math.round(W * scale), gh = Math.round(H * scale);
      const c = document.createElement('canvas'); c.width = gw; c.height = gh;
      const ctx = c.getContext('2d');
      ctx.drawImage(this.ink, 0, 0, gw, gh);
      const d = ctx.getImageData(0, 0, gw, gh).data, a = new Float32Array(gw * gh);
      for (let i = 0; i < gw * gh; i++) {
        const al = d[i * 4 + 3] / 255;
        if (!al) continue;
        const lum = (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]) / 255;
        a[i] = al * (1 - lum * 0.85);
      }
      return { w: gw, h: gh, a, alpha: d };
    }

    snapshot(opts) {
      opts = opts || {};
      const sc = opts.scale || 0.6;
      const c = document.createElement('canvas'); c.width = W * sc; c.height = H * sc;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      if (opts.guide !== false) ctx.drawImage(this.paper, 0, 0, c.width, c.height);
      ctx.drawImage(this.ink, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.82);
    }
  }

  Board.W = W; Board.H = H;
  DA.Board = Board;
  DA.TOOLS = TOOLS;
})(window.DA);
