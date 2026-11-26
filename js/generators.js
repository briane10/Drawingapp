/* Exercise target generators.
 * Each generator gets (rng, params) and returns raw geometry:
 *   paths:   [{pts, closed, hidden, given}]  lines the student should draw (hidden = behind the form, given = supplied as a starting guide)
 *   dots:    [[x,y]]                         anchor points shown in "ghost" mode
 *   helpers: [{pts, closed, dash, kind}]     guides always shown (horizon, VPs, boxes)
 *   vps:     [[x,y]]                         vanishing points (always shown)
 *   shade(ctx):                              renders a shaded reference (for value studies)
 *   region:  closed silhouette for value matching
 * `place()` then scales/centres the result into a frame on the canvas.
 */
(function (DA) {
  'use strict';
  const U = DA.util;
  const TAU = Math.PI * 2;

  // ---------- placement ----------
  function allPoints(g) {
    const pts = [];
    (g.paths || []).forEach((p) => pts.push(...p.pts));
    (g.dots || []).forEach((d) => pts.push(d));
    (g.helpers || []).forEach((h) => { if (!h.noFit) pts.push(...h.pts); });
    (g.vps || []).forEach((v) => pts.push(v));
    if (g.region) pts.push(...g.region);
    if (g.extraBounds) pts.push(...g.extraBounds);
    return pts;
  }

  function place(g, frame, margin) {
    if (g.noPlace) return g;
    margin = margin == null ? 0.08 : margin;
    const pts = allPoints(g);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach((p) => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
    const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0);
    const fw = frame.w * (1 - 2 * margin), fh = frame.h * (1 - 2 * margin);
    let s = Math.min(fw / bw, fh / bh);
    if (g.maxScale) s = Math.min(s, g.maxScale);
    const tx = frame.x + frame.w / 2 - (x0 + bw / 2) * s;
    const ty = frame.y + frame.h / 2 - (y0 + bh / 2) * s;
    const T = (p) => [p[0] * s + tx, p[1] * s + ty];
    const out = Object.assign({}, g);
    out.paths = (g.paths || []).map((p) => Object.assign({}, p, { pts: p.pts.map(T) }));
    out.dots = (g.dots || []).map(T);
    out.helpers = (g.helpers || []).map((h) => {
      if (h.full) { // horizon lines: stretch across frame
        const y = T(h.pts[0])[1];
        return Object.assign({}, h, { pts: [[frame.x, y], [frame.x + frame.w, y]] });
      }
      return Object.assign({}, h, { pts: h.pts.map(T) });
    });
    out.vps = (g.vps || []).map(T);
    if (g.region) out.region = g.region.map(T);
    if (g.shade) {
      const raw = g.shade;
      out.shade = (ctx) => { ctx.save(); ctx.translate(tx, ty); ctx.scale(s, s); raw(ctx, s); ctx.restore(); };
    }
    out.xf = { s, tx, ty };
    return out;
  }

  // shift a placed generator result (used for side-by-side copying)
  function shift(g, dx, dy) {
    const T = (p) => [p[0] + dx, p[1] + dy];
    const out = Object.assign({}, g);
    out.paths = g.paths.map((p) => Object.assign({}, p, { pts: p.pts.map(T) }));
    out.dots = g.dots.map(T);
    out.helpers = g.helpers.map((h) => Object.assign({}, h, { pts: h.pts.map(T) }));
    out.vps = g.vps.map(T);
    if (g.region) out.region = g.region.map(T);
    return out;
  }

  // ---------- helpers ----------
  function grid(n, cols) {
    cols = cols || Math.ceil(Math.sqrt(n * 1.5));
    const rows = Math.ceil(n / cols), cells = [];
    for (let i = 0; i < n; i++) cells.push({ cx: (i % cols) * 300 + 150, cy: Math.floor(i / cols) * 300 + 150, size: 300 });
    return { cells, w: cols * 300, h: rows * 300 };
  }
  const P = (pts, o) => Object.assign({ pts, closed: false }, o || {});

  function bezier(p0, p1, p2, p3, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ]);
    }
    return out;
  }

  function lineIntersect(a, b, c, d) {
    const den = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]);
    if (Math.abs(den) < 1e-9) return null;
    const t = ((a[0] - c[0]) * (c[1] - d[1]) - (a[1] - c[1]) * (c[0] - d[0])) / den;
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  }

  function hull(points) {
    const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    up.pop(); lo.pop();
    return lo.concat(up);
  }

  // ---------- 2D generators ----------
  const G = {};

  G.lines = function (r, p) {
    const n = p.n || 6, out = { paths: [], dots: [] };
    const area = 900;
    for (let i = 0; i < n; i++) {
      let ang;
      if (p.orient === 'h') ang = r.range(-0.12, 0.12);
      else if (p.orient === 'v') ang = Math.PI / 2 + r.range(-0.12, 0.12);
      else ang = r.range(0, Math.PI);
      const len = r.range(p.minLen || 260, p.maxLen || 520);
      const cx = r.range(len / 2 * Math.abs(Math.cos(ang)), area - len / 2 * Math.abs(Math.cos(ang)));
      const cy = p.orient === 'h' ? (i + 0.5) * (600 / n) : r.range(len / 2 * Math.abs(Math.sin(ang)), 600 - len / 2 * Math.abs(Math.sin(ang)));
      const dx = Math.cos(ang) * len / 2, dy = Math.sin(ang) * len / 2;
      const cx2 = p.orient === 'v' ? (i + 0.5) * (area / n) : cx;
      const a = [cx2 - dx, cy - dy], b = [cx2 + dx, cy + dy];
      out.paths.push(P([a, b]));
      out.dots.push(a, b);
    }
    out.extraBounds = [[0, 0], [area, 600]];
    return out;
  };

  G.curves = function (r, p) {
    const n = p.n || 4, out = { paths: [], dots: [] };
    for (let i = 0; i < n; i++) {
      const y = (i + 0.5) * 160;
      const a = [r.range(0, 120), y + r.range(-30, 30)], d = [r.range(680, 800), y + r.range(-30, 30)];
      const s = r.chance(0.5);
      const amp = r.range(50, 90) * r.sign();
      const b = [U.lerp(a[0], d[0], 0.33), U.lerp(a[1], d[1], 0.33) - amp];
      const c = [U.lerp(a[0], d[0], 0.66), U.lerp(a[1], d[1], 0.66) + (s ? amp : -amp)];
      out.paths.push(P(bezier(a, b, c, d, 40)));
      out.dots.push(a, d);
    }
    return out;
  };

  G.circles = function (r, p) {
    const n = p.n || 4, g = grid(n), out = { paths: [], dots: [] };
    g.cells.forEach((c) => {
      const rad = r.range(70, 120);
      out.paths.push(P(U.ellipsePts(c.cx, c.cy, rad, rad, 0, 72), { closed: true }));
      out.dots.push([c.cx, c.cy]);
    });
    out.extraBounds = [[0, 0], [g.w, g.h]];
    return out;
  };

  G.ellipses = function (r, p) {
    const n = p.n || 4, g = grid(n), out = { paths: [], dots: [] };
    g.cells.forEach((c) => {
      const rx = r.range(80, 125), ry = rx * r.range(0.25, 0.7);
      const rot = p.flat ? r.range(-0.1, 0.1) : r.range(0, Math.PI);
      out.paths.push(P(U.ellipsePts(c.cx, c.cy, rx, ry, rot, 72), { closed: true }));
      const ax = Math.cos(rot) * rx, ay = Math.sin(rot) * rx;
      out.helpers = out.helpers || [];
      if (p.axis) out.helpers.push({ pts: [[c.cx - ax * 1.15, c.cy - ay * 1.15], [c.cx + ax * 1.15, c.cy + ay * 1.15]], dash: true });
    });
    out.extraBounds = [[0, 0], [g.w, g.h]];
    return out;
  };

  function shapeAt(r, kind, cx, cy, s) {
    const h = s / 2;
    switch (kind) {
      case 'square': return P([[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h]], { closed: true });
      case 'rect': return P([[cx - h, cy - h * 0.6], [cx + h, cy - h * 0.6], [cx + h, cy + h * 0.6], [cx - h, cy + h * 0.6]], { closed: true });
      case 'triangle': return P([[cx, cy - h], [cx + h, cy + h * 0.8], [cx - h, cy + h * 0.8]], { closed: true });
      case 'diamond': return P([[cx, cy - h], [cx + h * 0.7, cy], [cx, cy + h], [cx - h * 0.7, cy]], { closed: true });
      case 'circle': return P(U.ellipsePts(cx, cy, h, h, 0, 64), { closed: true });
      case 'star': {
        const pts = [];
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? h * 0.45 : h; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
        return P(pts, { closed: true });
      }
      default: return P(U.ellipsePts(cx, cy, h, h * 0.6, r.range(0, 3), 64), { closed: true });
    }
  }

  G.shapes = function (r, p) {
    const n = p.n || 3, g = grid(n, n <= 3 ? n : 3), out = { paths: [] };
    const kinds = p.kinds || ['square', 'triangle', 'circle', 'diamond', 'rect', 'star', 'oval'];
    g.cells.forEach((c) => out.paths.push(shapeAt(r, r.pick(kinds), c.cx, c.cy, r.range(150, 210))));
    out.extraBounds = [[0, 0], [g.w, g.h]];
    return out;
  };

  G.polygon = function (r, p) {
    const n = r.int(p.min || 5, p.max || 8), pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + r.range(-0.25, 0.25);
      const rad = r.range(p.concave ? 70 : 140, 200);
      pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
    }
    return { paths: [P(pts, { closed: true })] };
  };

  G.blob = function (r) {
    const k = [], pts = [];
    for (let i = 2; i <= 5; i++) k.push({ f: i, a: r.range(0.04, 0.16) / (i * 0.5), ph: r.range(0, TAU) });
    const sx = r.range(0.7, 1.3);
    for (let i = 0; i < 120; i++) {
      const t = (i / 120) * TAU;
      let rad = 200;
      k.forEach((q) => (rad += 200 * q.a * Math.sin(q.f * t + q.ph)));
      pts.push([Math.cos(t) * rad * sx, Math.sin(t) * rad]);
    }
    return { paths: [P(pts, { closed: true })] };
  };

  G.angles = function (r, p) {
    const n = p.n || 5, pts = [[0, 0]];
    let ang = r.range(-0.6, 0.6);
    for (let i = 0; i < n; i++) {
      ang += r.range(0.6, 1.9) * (i % 2 ? -1 : 1);
      const len = r.range(110, 220), q = pts[pts.length - 1];
      pts.push([q[0] + Math.cos(ang) * len, q[1] + Math.sin(ang) * len]);
    }
    return { paths: [P(pts)] };
  };

  G.hatchBoxes = function (r, p) {
    const n = p.n || 4, out = { paths: [], helpers: [] };
    for (let i = 0; i < n; i++) {
      const x = i * 230;
      out.helpers.push({ pts: [[x, 0], [x + 200, 0], [x + 200, 200], [x, 200]], closed: true });
    }
    return out;
  };

  G.thumbFrames = function () {
    const out = { paths: [], helpers: [] };
    for (let i = 0; i < 4; i++) {
      const x = (i % 2) * 520, y = Math.floor(i / 2) * 360, w = 480, h = 320;
      out.helpers.push({ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true });
      for (let k = 1; k < 3; k++) {
        out.helpers.push({ pts: [[x + (w * k) / 3, y], [x + (w * k) / 3, y + h]], dash: true, faint: true });
        out.helpers.push({ pts: [[x, y + (h * k) / 3], [x + w, y + (h * k) / 3]], dash: true, faint: true });
      }
    }
    return out;
  };

  G.blank = function () { return { paths: [], extraBounds: [[0, 0], [1000, 700]] }; };

  // ---------- 3D forms ----------
  const CUBE_V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
  const CUBE_F = [ // faces as vertex indices (CCW from outside) + normal
    { v: [0, 3, 2, 1], n: [0, 0, -1] }, { v: [4, 5, 6, 7], n: [0, 0, 1] },
    { v: [0, 4, 7, 3], n: [-1, 0, 0] }, { v: [1, 2, 6, 5], n: [1, 0, 0] },
    { v: [0, 1, 5, 4], n: [0, -1, 0] }, { v: [3, 7, 6, 2], n: [0, 1, 0] },
  ];

  function boxGeom(r, p) {
    const dims = p.dims || [r.range(0.8, 1.3), r.range(0.7, 1.3), r.range(0.8, 1.3)];
    const cam = U.camera({
      yaw: p.yaw != null ? p.yaw : r.range(0.25, 1.3) * r.sign(),
      pitch: p.pitch != null ? p.pitch : r.range(0.15, 0.6) * (p.below === false ? -1 : 1),
      roll: p.roll || 0,
      dist: p.dist || r.range(4.5, 8), f: 600, cx: 0, cy: 0,
    });
    const V = CUBE_V.map((v) => [v[0] * dims[0], v[1] * dims[1], v[2] * dims[2]]);
    const C = V.map(cam.toCam);
    const S = C.map((q) => cam.proj(q));
    const vis = CUBE_F.map((f) => {
      const n = U.norm3(U.sub3(U.rotX(U.rotY(f.n, 0), 0), [0, 0, 0]));
      // transform normal with the camera rotation (no translation)
      const a = cam.toCam(f.n), o = cam.toCam([0, 0, 0]);
      const nn = U.sub3(a, o);
      const center = f.v.reduce((acc, i) => U.add3(acc, C[i]), [0, 0, 0]).map((x) => x / 4);
      return U.dot3(nn, U.scale3(center, -1)) > 0 && n;
    });
    const edges = new Map();
    CUBE_F.forEach((f, fi) => {
      for (let k = 0; k < 4; k++) {
        const a = f.v[k], b = f.v[(k + 1) % 4], key = Math.min(a, b) + '-' + Math.max(a, b);
        const e = edges.get(key) || { a, b, visible: false };
        if (vis[fi]) e.visible = true;
        edges.set(key, e);
      }
    });
    return { cam, V, C, S, vis, edges: [...edges.values()] };
  }

  G.box = function (r, p) {
    const b = boxGeom(r, p);
    const paths = [];
    b.edges.forEach((e) => {
      if (!e.visible && !p.through) return;
      paths.push(P([b.S[e.a], b.S[e.b]], { hidden: !e.visible }));
    });
    return { paths };
  };

  G.boxes = function (r, p) {
    const n = p.n || 3, out = { paths: [] };
    for (let i = 0; i < n; i++) {
      const g = G.box(r, Object.assign({}, p));
      const dx = i * 520;
      g.paths.forEach((q) => { q.pts = q.pts.map((pt) => [pt[0] * 0.9 + dx, pt[1] * 0.9]); out.paths.push(q); });
    }
    return out;
  };

  G.cylinder = function (r, p) {
    const cam = U.camera({ yaw: r.range(0, TAU), pitch: r.range(0.2, 0.7), roll: p.tilt ? r.range(-0.6, 0.6) : 0, dist: 7, f: 600, cx: 0, cy: 0 });
    const rad = r.range(0.7, 1.1), h = r.range(1.0, 1.8), N = 64;
    const top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * TAU;
      top.push(cam.project([Math.cos(t) * rad, h, Math.sin(t) * rad]));
      bot.push(cam.project([Math.cos(t) * rad, -h, Math.sin(t) * rad]));
    }
    const ct = cam.project([0, h, 0]), cb = cam.project([0, -h, 0]);
    const ax = U.norm3([ct[0] - cb[0], ct[1] - cb[1], 0]);
    const nx = [-ax[1], ax[0]];
    let iMax = 0, iMin = 0, vMax = -Infinity, vMin = Infinity;
    for (let i = 0; i < N; i++) {
      const v = (top[i][0] - ct[0]) * nx[0] + (top[i][1] - ct[1]) * nx[1];
      if (v > vMax) { vMax = v; iMax = i; }
      if (v < vMin) { vMin = v; iMin = i; }
    }
    return {
      paths: [
        P(top, { closed: true }), P(bot, { closed: true }),
        P([top[iMax], bot[iMax]]), P([top[iMin], bot[iMin]]),
      ],
    };
  };

  G.sphere = function (r, p) {
    const cam = U.camera({ yaw: r.range(0, TAU), pitch: r.range(-0.6, 0.6), roll: r.range(-0.4, 0.4), dist: 6, f: 600, cx: 0, cy: 0 });
    const c = cam.toCam([0, 0, 0]);
    const R = (cam.f * 1) / Math.sqrt(c[2] * c[2] - 1);
    const outline = U.ellipsePts(0, 0, R, R, 0, 72);
    const paths = [P(outline, { closed: true })];
    const ring = (fn) => {
      const seg = []; let cur = [];
      for (let i = 0; i <= 96; i++) {
        const t = (i / 96) * TAU, w = fn(t), q = cam.toCam(w);
        if (q[2] < c[2]) cur.push(cam.proj(q));
        else if (cur.length) { seg.push(cur); cur = []; }
      }
      if (cur.length) seg.push(cur);
      // join wrap-around
      if (seg.length > 1) { seg[0] = seg[seg.length - 1].concat(seg[0]); seg.pop(); }
      seg.forEach((s) => { if (s.length > 2) paths.push(P(s)); });
    };
    ring((t) => [Math.cos(t), 0, Math.sin(t)]); // equator
    ring((t) => [0, Math.cos(t), Math.sin(t)]); // meridian
    if (p.more) {
      ring((t) => [Math.cos(t) * 0.7, 0.71, Math.sin(t) * 0.7]);
      ring((t) => [Math.cos(t), Math.sin(t), 0]);
    }
    return { paths };
  };

  // ---------- perspective ----------
  G.vpLines = function (r, p) {
    const vp = [r.range(350, 650), r.range(250, 350)], out = { paths: [], dots: [], vps: [vp], helpers: [{ pts: [[0, vp[1]], [1000, vp[1]]], full: true, kind: 'horizon' }] };
    const n = p.n || 6;
    for (let i = 0; i < n; i++) {
      let a;
      do { a = [r.range(30, 970), r.range(20, 680)]; } while (Math.abs(a[1] - vp[1]) < 120 || U.dist(a, vp) < 220);
      const end = [U.lerp(a[0], vp[0], 0.97), U.lerp(a[1], vp[1], 0.97)];
      out.paths.push(P([a, end]));
      out.dots.push(a);
    }
    out.extraBounds = [[0, 0], [1000, 700]];
    return out;
  };

  G.box1pt = function (r, p) {
    const vp = [500, r.range(250, 400)];
    const out = { paths: [], vps: [vp], helpers: [{ pts: [[0, vp[1]], [1000, vp[1]]], full: true, kind: 'horizon' }] };
    const n = p.n || 3;
    for (let i = 0; i < n; i++) {
      const w = r.range(120, 200), h = r.range(90, 170);
      let x0, y0;
      do { x0 = r.range(20, 980 - w); y0 = r.range(20, 680 - h); } while (y0 < vp[1] + 40 && y0 + h > vp[1] - 40);
      const F = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
      const t = r.range(0.18, 0.35);
      const B = F.map((c) => [U.lerp(c[0], vp[0], t), U.lerp(c[1], vp[1], t)]);
      out.paths.push(P(F, { closed: true, given: true }));
      // receding edges: an edge is hidden if its back corner lies inside the front face
      const inside = (q) => q[0] > x0 && q[0] < x0 + w && q[1] > y0 && q[1] < y0 + h;
      for (let k = 0; k < 4; k++) {
        const hid = inside(B[k]);
        if (hid && !p.through) continue;
        out.paths.push(P([F[k], B[k]], { hidden: hid }));
      }
      for (let k = 0; k < 4; k++) {
        const a = B[k], b = B[(k + 1) % 4];
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const hid = inside(mid);
        if (hid && !p.through) continue;
        out.paths.push(P([a, b], { hidden: hid }));
      }
    }
    out.extraBounds = [[0, 0], [1000, 700]];
    return out;
  };

  G.box2pt = function (r, p) {
    const hy = 300, vl = [r.range(-150, 80), hy], vr = [r.range(920, 1150), hy];
    const out = { paths: [], vps: [vl, vr], helpers: [{ pts: [[vl[0], hy], [vr[0], hy]], full: true, kind: 'horizon' }] };
    const fx = r.range(380, 620), below = p.above ? false : r.chance(0.6);
    const fh = r.range(110, 180);
    const ftop = below ? r.range(hy + 70, hy + 200) : r.range(hy - 280, hy - 130 - fh);
    const T = [fx, ftop], B = [fx, ftop + fh];
    const tl = r.range(0.25, 0.42), tr = r.range(0.2, 0.38);
    const LT = [U.lerp(T[0], vl[0], tl), U.lerp(T[1], vl[1], tl)], LB = [LT[0], U.lerp(B[1], vl[1], (LT[0] - B[0]) / (vl[0] - B[0]))];
    const RT = [U.lerp(T[0], vr[0], tr), U.lerp(T[1], vr[1], tr)], RB = [RT[0], U.lerp(B[1], vr[1], (RT[0] - B[0]) / (vr[0] - B[0]))];
    const BT = lineIntersect(LT, vr, RT, vl), BB = lineIntersect(LB, vr, RB, vl);
    out.paths.push(P([T, B], { given: true }));
    out.paths.push(P([T, LT]), P([B, LB]), P([LT, LB]), P([T, RT]), P([B, RB]), P([RT, RB]));
    // back edges: top face visible when box is below the horizon
    const topVis = below;
    if (topVis || p.through) out.paths.push(P([LT, BT], { hidden: !topVis }), P([RT, BT], { hidden: !topVis }));
    if (!topVis || p.through) out.paths.push(P([LB, BB], { hidden: topVis }), P([RB, BB], { hidden: topVis }));
    if (p.through) out.paths.push(P([BT, BB], { hidden: true }));
    out.extraBounds = [[0, 0], [1000, 700]];
    if (p.guideLines) {
      [T, B].forEach((q) => { out.helpers.push({ pts: [q, vl], dash: true, faint: true }, { pts: [q, vr], dash: true, faint: true }); });
    }
    return out;
  };

  G.wideBox = function (r) { // dramatic 3-point-ish view
    return G.box(r, { yaw: r.range(0.5, 1.0) * r.sign(), pitch: r.range(0.55, 0.9) * r.sign(), dist: r.range(2.8, 3.4), through: false });
  };

  G.circleInSquare = function (r, p) {
    const cam = U.camera({ yaw: r.range(-0.8, 0.8), pitch: r.range(0.35, 0.95), dist: 5, f: 600, cx: 0, cy: 0 });
    const sq = [[-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1]].map(cam.project);
    const circ = [];
    for (let i = 0; i <= 72; i++) { const t = (i / 72) * TAU; circ.push(cam.project([Math.cos(t), 0, Math.sin(t)])); }
    const helpers = [{ pts: sq, closed: true }];
    if (p.diagonals !== false) {
      helpers.push({ pts: [sq[0], sq[2]], dash: true, faint: true }, { pts: [sq[1], sq[3]], dash: true, faint: true });
      helpers.push({ pts: [cam.project([-1, 0, 0]), cam.project([1, 0, 0])], dash: true, faint: true });
      helpers.push({ pts: [cam.project([0, 0, -1]), cam.project([0, 0, 1])], dash: true, faint: true });
    }
    return { paths: [P(circ, { closed: true })], helpers };
  };

  // ---------- figure ----------
  function vec(p, ang, len) { return [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len]; }

  G.mannequin = function (r, p) {
    const u = 60, D = Math.PI / 180;
    const lean = r.range(-25, 25) * D * (p.calm ? 0.5 : 1);
    const pel = [0, 0];
    const spineA = -Math.PI / 2 + lean;
    const chest = vec(pel, spineA + r.range(-12, 12) * D, 1.7 * u);
    const neck = vec(chest, spineA + r.range(-15, 15) * D, 0.6 * u);
    const headA = spineA + r.range(-20, 20) * D;
    const head = vec(neck, headA, 0.65 * u);
    const shTilt = spineA + Math.PI / 2 + r.range(-15, 15) * D;
    const hipTilt = spineA + Math.PI / 2 - (shTilt - spineA - Math.PI / 2) * 0.8;
    const shL = vec(chest, shTilt + Math.PI, 0.95 * u), shR = vec(chest, shTilt, 0.95 * u);
    const hpL = vec(pel, hipTilt + Math.PI, 0.6 * u), hpR = vec(pel, hipTilt, 0.6 * u);
    const limb = (root, a1, l1, bend, l2) => { const m = vec(root, a1, l1); return [root, m, vec(m, a1 + bend, l2)]; };
    const ra = () => (90 + r.range(-100, 100) * (p.calm ? 0.5 : 1)) * D;
    const armL = limb(shL, ra(), 1.45 * u, r.range(0, 110) * D * r.sign(), 1.3 * u);
    const armR = limb(shR, ra(), 1.45 * u, r.range(0, 110) * D * r.sign(), 1.3 * u);
    const thighL = (90 + r.range(-35, 25)) * D, thighR = (90 + r.range(-25, 35)) * D;
    const legL = limb(hpL, thighL, 2 * u, r.range(0, 70) * D, 2 * u);
    const legR = limb(hpR, thighR, 2 * u, -r.range(0, 70) * D, 2 * u);
    const spine = bezier(pel, vec(pel, spineA, 0.8 * u), chest, neck, 20);
    const paths = [
      P(U.ellipsePts(head[0], head[1], 0.42 * u, 0.55 * u, headA + Math.PI / 2, 40), { closed: true }),
      P(spine), P([shL, shR]), P([hpL, hpR]),
      P(armL), P(armR), P(legL), P(legR),
    ];
    if (p.forms) {
      const rib = vec(pel, spineA, 1.45 * u);
      paths.push(P(U.ellipsePts(rib[0], rib[1], 0.75 * u, 0.95 * u, spineA + Math.PI / 2, 40), { closed: true }));
      paths.push(P(U.ellipsePts(pel[0], pel[1] - 0.1 * u, 0.7 * u, 0.5 * u, hipTilt, 40), { closed: true }));
    }
    const out = { paths };
    if (p.headMarks) {
      out.helpers = [];
      let top = Infinity, bot = -Infinity;
      paths.forEach((q) => q.pts.forEach((pt) => { top = Math.min(top, pt[1]); bot = Math.max(bot, pt[1]); }));
    }
    return out;
  };

  G.proportions = function (r, p) {
    // a standing 8-head figure with head-height marks
    const u = 80, out = { paths: [], helpers: [] };
    for (let i = 0; i <= 8; i++) out.helpers.push({ pts: [[-180, i * u], [180, i * u]], dash: true, faint: true, label: String(i) });
    out.paths.push(P(U.ellipsePts(0, 0.5 * u, 0.36 * u, 0.5 * u, 0, 40), { closed: true }));
    out.paths.push(P([[0, u], [0, 1.15 * u]])); // neck
    out.paths.push(P([[-1 * u, 1.35 * u], [1 * u, 1.35 * u]])); // shoulders (2 heads wide)
    out.paths.push(P(U.ellipsePts(0, 2.1 * u, 0.8 * u, 0.95 * u, 0, 40), { closed: true })); // ribcage
    out.paths.push(P(U.ellipsePts(0, 3.6 * u, 0.75 * u, 0.5 * u, 0, 40), { closed: true })); // pelvis
    out.paths.push(P([[0, 1.15 * u], [0, 4 * u]])); // spine
    out.paths.push(P([[-1 * u, 1.35 * u], [-1.15 * u, 2.75 * u], [-1.2 * u, 3.9 * u]])); // arm L (elbow at navel, wrist at crotch)
    out.paths.push(P([[1 * u, 1.35 * u], [1.15 * u, 2.75 * u], [1.2 * u, 3.9 * u]]));
    out.paths.push(P([[-0.45 * u, 4 * u], [-0.4 * u, 6 * u], [-0.35 * u, 7.8 * u], [-0.6 * u, 8 * u]])); // leg L
    out.paths.push(P([[0.45 * u, 4 * u], [0.4 * u, 6 * u], [0.35 * u, 7.8 * u], [0.6 * u, 8 * u]]));
    return out;
  };

  G.loomis = function (r, p) {
    const cam = U.camera({ yaw: r.range(-0.9, 0.9), pitch: r.range(-0.35, 0.35), roll: r.range(-0.15, 0.15), dist: 7, f: 600, cx: 0, cy: 0 });
    const c = cam.toCam([0, 0, 0]);
    const R = cam.f / Math.sqrt(c[2] * c[2] - 1);
    const paths = [P(U.ellipsePts(0, 0, R, R, 0, 72), { closed: true })];
    const ring = (fn, a0, a1, onlyFront) => {
      const pts = [];
      for (let i = 0; i <= 60; i++) {
        const t = a0 + ((a1 - a0) * i) / 60, q = cam.toCam(fn(t));
        if (!onlyFront || q[2] < c[2] + 0.05) pts.push(cam.proj(q)); else if (pts.length > 2) break;
      }
      if (pts.length > 2) paths.push(P(pts));
    };
    // side planes (only the one facing us)
    const sideX = (cam.toCam([1, 0, 0])[2] < c[2]) ? 0.7 : -0.7;
    ring((t) => [sideX, Math.cos(t) * 0.71, Math.sin(t) * 0.71], 0, TAU, false);
    // brow line (equator, front half)
    ring((t) => [Math.sin(t), 0, Math.cos(t)], -Math.PI / 2, Math.PI / 2, true);
    // center line down the front, then to the chin
    const cl = [];
    for (let i = 0; i <= 30; i++) { const t = -Math.PI / 2 + (i / 30) * (Math.PI / 2 + Math.PI / 4); cl.push(cam.project([0, -Math.sin(t), Math.cos(t)])); }
    const chin = [0, -1.45, 0.62];
    cl.push(cam.project(chin));
    paths.push(P(cl));
    // nose line and jaw
    paths.push(P([cam.project([-0.45, -0.71, 0.6]), cam.project([0.45, -0.71, 0.6])]));
    paths.push(P([cam.project([sideX, -0.55, -0.25]), cam.project([sideX * 0.4, -1.35, 0.5]), cam.project(chin)]));
    paths.push(P([cam.project([-0.3, -1.45, 0.55]), cam.project([0.3, -1.45, 0.55])]));
    return { paths };
  };

  // ---------- value studies ----------
  G.valueScale = function (r, p) {
    const n = p.steps || 5, out = { paths: [], helpers: [], boxes: [] };
    const w = 900 / n;
    for (let i = 0; i < n; i++) {
      const x = i * w;
      out.helpers.push({ pts: [[x, 0], [x + w, 0], [x + w, 150], [x, 150]], closed: true });
      out.boxes.push([x, 0, w, 150]);
    }
    return out;
  };

  function grayStr(v) { const g = Math.round(U.clamp(v, 0, 1) * 255); return 'rgb(' + g + ',' + g + ',' + g + ')'; }

  // Render a per-pixel shaded image via a temporary canvas.
  function pixelShade(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = fn(x, y);
      if (v == null) continue;
      const g = Math.round(U.clamp(v, 0, 1) * 255), i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = g; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  function lightDir(r) { return U.norm3([r.range(-1, 1) * 0.9, r.range(0.5, 1.1), r.range(0.3, 0.8)]); }

  G.shadedSphere = function (r) {
    const L = lightDir(r), R = 150;
    const img = pixelShade(2 * R, 2 * R, (x, y) => {
      const nx = (x - R + 0.5) / R, ny = -(y - R + 0.5) / R, d = nx * nx + ny * ny;
      if (d > 1) return null;
      const n = [nx, ny, Math.sqrt(1 - d)];
      const lam = U.dot3(n, L);
      let v = lam > 0 ? 0.32 + 0.66 * lam : 0.2 + 0.1 * Math.max(0, -n[1]) * 0.8 + 0.06 * (1 + lam);
      if (lam > 0 && lam < 0.12) v -= 0.08 * (1 - lam / 0.12); // core shadow
      const spec = Math.pow(Math.max(0, U.dot3(n, U.norm3([L[0], L[1], L[2] + 1]))), 40);
      return v + spec * 0.25;
    });
    const sx = -L[0] / L[1] * 120;
    return {
      shade: (ctx) => {
        ctx.fillStyle = 'rgba(60,60,60,0.55)';
        ctx.beginPath(); ctx.ellipse(sx * 0.6, R * 0.95, R * 1.05, R * 0.28, 0, 0, TAU); ctx.fill();
        ctx.drawImage(img, -R, -R);
      },
      region: U.ellipsePts(0, 0, R, R, 0, 72),
      extraBounds: [[-R + Math.min(0, sx * 0.6) - R * 0.1, -R], [R + Math.max(0, sx * 0.6) + R * 0.1, R * 1.25]],
      paths: [],
    };
  };

  G.shadedCube = function (r) {
    const L = lightDir(r);
    const b = boxGeom(r, { pitch: r.range(0.3, 0.55), dist: 6, through: false });
    const faces = [];
    CUBE_F.forEach((f, i) => {
      if (!b.vis[i]) return;
      const nn = U.sub3(b.cam.toCam(f.n), b.cam.toCam([0, 0, 0]));
      const Lc = U.sub3(b.cam.toCam(L), b.cam.toCam([0, 0, 0]));
      const lam = U.dot3(U.norm3(nn), U.norm3(Lc));
      faces.push({ pts: f.v.map((k) => b.S[k]), v: lam > 0 ? 0.3 + 0.65 * lam : 0.22 + 0.05 * (1 + lam) });
    });
    // cast shadow on the ground plane under the cube
    const gy = -b.V.reduce((m, v) => Math.max(m, -v[1]), 0);
    const Lw = L;
    const shadowPts = b.V.map((v) => { const t = (v[1] - gy) / Lw[1]; return b.cam.project([v[0] - Lw[0] * t, gy, v[2] - Lw[2] * t]); });
    const sh = hull(shadowPts.concat(b.V.filter((v) => Math.abs(v[1] - gy) < 1e-6).map(b.cam.project)));
    const sil = hull(b.S);
    return {
      shade: (ctx) => {
        ctx.fillStyle = 'rgba(60,60,60,0.55)';
        ctx.beginPath(); sh.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill();
        faces.forEach((f) => {
          ctx.fillStyle = grayStr(f.v); ctx.strokeStyle = grayStr(f.v); ctx.lineWidth = 1;
          ctx.beginPath(); f.pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill(); ctx.stroke();
        });
      },
      region: sil,
      extraBounds: sh,
      paths: [],
    };
  };

  G.shadedCylinder = function (r) {
    const L = lightDir(r), R = 110, H = 260, e = 0.32; // ellipse ratio of the caps
    const top = -H / 2, bot = H / 2;
    const W = 2 * R, Ht = H + 2 * R * e;
    const img = pixelShade(W, Math.ceil(Ht), (x, y) => {
      const X = x - R + 0.5, Y = y - R * e + top; // Y in object coordinates (top at -H/2)
      const yy = Y;
      const inBody = Math.abs(X) <= R && yy >= top && yy <= bot + R * e * Math.sqrt(Math.max(0, 1 - (X * X) / (R * R)));
      const inTop = (X * X) / (R * R) + ((yy - top) * (yy - top)) / (R * e * R * e) <= 1;
      if (inTop) return 0.35 + 0.6 * Math.max(0, L[1]);
      if (!inBody) return null;
      const nx = X / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx));
      const lam = nx * L[0] + nz * L[2];
      let v = lam > 0 ? 0.3 + 0.65 * lam : 0.22 + 0.04 * (1 + lam) + 0.06 * Math.max(0, -nx * L[0]);
      if (lam > 0 && lam < 0.1) v -= 0.07;
      return v;
    });
    const region = [];
    for (let i = 0; i <= 32; i++) { const t = Math.PI + (i / 32) * Math.PI; region.push([Math.cos(t) * R, top + Math.sin(t) * R * e]); }
    for (let i = 0; i <= 32; i++) { const t = (i / 32) * Math.PI; region.push([Math.cos(t) * R, bot + Math.sin(t) * R * e]); }
    const sx = -L[0] / Math.max(0.3, L[1]) * 80;
    return {
      shade: (ctx) => {
        ctx.fillStyle = 'rgba(60,60,60,0.55)';
        ctx.beginPath(); ctx.ellipse(sx, bot + 5, R * 1.25, R * e * 1.1, 0, 0, TAU); ctx.fill();
        ctx.drawImage(img, -R, top - R * e);
      },
      region,
      extraBounds: [[-R - Math.abs(sx) - 30, top - R * e], [R + Math.abs(sx) + 30, bot + R * e + 10]],
      paths: [],
    };
  };

  G.shadedRandom = function (r) { return G[r.pick(['shadedSphere', 'shadedCube', 'shadedCylinder'])](r, {}); };

  G.formRandom = function (r) {
    const k = r.pick(['box', 'cylinder', 'sphere']);
    return G[k](r, { through: true });
  };

  DA.gen = { G, place, shift, hull, bezier };
})(window.DA);
