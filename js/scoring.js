/* Scoring: compares the student's ink with targets and produces friendly feedback. */
(function (DA) {
  'use strict';
  const U = DA.util;
  const GS = 0.5; // scoring grid: half the logical resolution (600x400)

  // Two-pass chamfer distance transform. src[i]=1 marks source cells. Returns distance in cells.
  function distanceTransform(src, w, h) {
    const INF = 1e9, d = new Float32Array(w * h), D = Math.SQRT2;
    for (let i = 0; i < w * h; i++) d[i] = src[i] ? 0 : INF;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) {
        v = Math.min(v, d[i - w] + 1);
        if (x > 0) v = Math.min(v, d[i - w - 1] + D);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + D);
      }
      d[i] = v;
    }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x; let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + 1);
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + D);
        if (x > 0) v = Math.min(v, d[i + w - 1] + D);
      }
      d[i] = v;
    }
    return d;
  }

  function rasterPaths(paths, w, h, lineW) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.scale(GS, GS); ctx.lineWidth = lineW || 3; ctx.strokeStyle = '#000'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    paths.forEach((p) => {
      ctx.beginPath(); p.pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      if (p.closed) ctx.closePath();
      ctx.stroke();
    });
    const d = ctx.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) m[i] = d[i * 4 + 3] > 60 ? 1 : 0;
    return m;
  }

  function rasterRegion(pts, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.scale(GS, GS); ctx.fillStyle = '#000';
    ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill();
    const d = ctx.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) m[i] = d[i * 4 + 3] > 128 ? 1 : 0;
    return m;
  }

  const fall = (d, good, bad) => U.clamp(1 - (d - good) / (bad - good), 0, 1);

  function bbox(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach((p) => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }

  // ---------- line accuracy (trace / ghost / construct / flash / copy) ----------
  function lineScore(board, paths, opt) {
    opt = opt || {};
    const good = opt.tolGood || 6, bad = opt.tolBad || 24;
    const g = board.inkGrid(GS), w = g.w, h = g.h;
    const ink = new Uint8Array(w * h);
    const zone = opt.zone;
    let inkCount = 0;
    const inkPts = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (g.a[i] < 0.06) continue;
      if (zone) { const X = x / GS, Y = y / GS; if (X < zone.x || X > zone.x + zone.w || Y < zone.y || Y > zone.y + zone.h) continue; }
      ink[i] = 1; inkCount++;
      inkPts.push([x / GS, y / GS]);
    }
    if (!inkCount) return { score: 0, coverage: 0, precision: 0, empty: true, paths, misses: [] };

    // copy mode: forgive position and overall size, keep proportions
    let tpaths = paths, textra = opt.extra || [], sizeRatio = 1;
    if (opt.align) {
      const tb = bbox([].concat(...paths.map((p) => p.pts)));
      // ignore far-off specks: use the 2nd-98th percentile of ink
      const xs = inkPts.map((p) => p[0]).sort((a, b) => a - b), ys = inkPts.map((p) => p[1]).sort((a, b) => a - b);
      const q = (arr, f) => arr[Math.floor((arr.length - 1) * f)];
      const ib = { x0: q(xs, 0.02), x1: q(xs, 0.98), y0: q(ys, 0.02), y1: q(ys, 0.98) };
      ib.w = ib.x1 - ib.x0; ib.h = ib.y1 - ib.y0; ib.cx = (ib.x0 + ib.x1) / 2; ib.cy = (ib.y0 + ib.y1) / 2;
      sizeRatio = Math.sqrt(Math.max(1, ib.w * ib.h) / Math.max(1, tb.w * tb.h));
      const s = U.clamp(sizeRatio, 0.55, 1.8);
      const T = (p) => Object.assign({}, p, { pts: p.pts.map((pt) => [ib.cx + (pt[0] - tb.cx) * s, ib.cy + (pt[1] - tb.cy) * s]) });
      tpaths = paths.map(T); textra = textra.map(T);
    }

    const tmask = rasterPaths(tpaths.concat(textra), w, h, 2);
    const dT = distanceTransform(tmask, w, h);
    const dI = distanceTransform(ink, w, h);

    let cov = 0, n = 0;
    const misses = [];
    tpaths.forEach((p) => {
      const pts = U.resample(p.pts, 4, p.closed);
      pts.forEach((q) => {
        const x = Math.round(q[0] * GS), y = Math.round(q[1] * GS);
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const v = fall(dI[y * w + x] / GS, good, bad);
        cov += v; n++;
        if (v < 0.5) misses.push(q);
      });
    });
    cov = n ? cov / n : 0;
    let prec = 0, stray = 0;
    for (let i = 0; i < w * h; i++) if (ink[i]) { const v = fall(dT[i] / GS, good, bad * 1.2); prec += v; if (v < 0.3) stray++; }
    prec /= inkCount;
    const score = Math.round(100 * Math.pow(cov, 0.55) * Math.pow(prec, 0.45));
    return { score, coverage: cov, precision: prec, misses, paths: tpaths, extra: textra, sizeRatio, stray };
  }

  // ---------- freehand circles ----------
  function fitCircle(pts) {
    // Kåsa algebraic fit
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
    const n = pts.length;
    pts.forEach((p) => {
      const x = p[0], y = p[1], z = x * x + y * y;
      sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z;
    });
    const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], b = [-sxz, -syz, -sz];
    const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(A);
    if (Math.abs(D) < 1e-9) return null;
    const col = (k) => A.map((row, i) => row.map((v, j) => (j === k ? b[i] : v)));
    const Dd = det(col(0)) / D, Ee = det(col(1)) / D, Ff = det(col(2)) / D;
    const cx = -Dd / 2, cy = -Ee / 2, r = Math.sqrt(Math.max(0, cx * cx + cy * cy - Ff));
    let rms = 0;
    pts.forEach((p) => { const e = Math.hypot(p[0] - cx, p[1] - cy) - r; rms += e * e; });
    return { cx, cy, r, rms: Math.sqrt(rms / n) };
  }

  function circleScore(board, need) {
    const strokes = board.inkStrokes().filter((s) => U.pathLength(s.pts) > 120);
    const fits = [];
    strokes.forEach((s) => {
      const f = fitCircle(s.pts);
      if (!f || f.r < 25) return;
      const round = U.clamp(1 - (f.rms / f.r) / 0.11, 0, 1);
      const gap = U.dist(s.pts[0], s.pts[s.pts.length - 1]) / (2 * Math.PI * f.r);
      const around = U.clamp(U.pathLength(s.pts) / (2 * Math.PI * f.r), 0, 1);
      const closure = U.clamp(1 - gap / 0.25, 0, 1) * U.clamp((around - 0.6) / 0.35, 0, 1);
      f.score = Math.round(100 * Math.pow(round, 0.8) * (0.65 + 0.35 * closure));
      f.round = round; f.closure = closure;
      fits.push(f);
    });
    fits.sort((a, b) => b.score - a.score);
    const used = fits.slice(0, need);
    let total = used.reduce((a, f) => a + f.score, 0);
    const score = Math.round(total / need);
    return { score, fits, used, empty: !strokes.length };
  }

  // ---------- value scale ----------
  function valueScaleScore(board, boxes) {
    const g = board.inkGrid(GS);
    const vals = [], spreads = [];
    boxes.forEach((b) => {
      const pad = 8, x0 = Math.round((b[0] + pad) * GS), x1 = Math.round((b[0] + b[2] - pad) * GS), y0 = Math.round((b[1] + pad) * GS), y1 = Math.round((b[1] + b[3] - pad) * GS);
      // average over 8x8-cell blocks so pencil texture doesn't count as unevenness
      const blocks = [];
      let sum = 0, n = 0;
      for (let by = y0; by < y1; by += 8) for (let bx = x0; bx < x1; bx += 8) {
        let s = 0, m = 0;
        for (let y = by; y < Math.min(by + 8, y1); y++) for (let x = bx; x < Math.min(bx + 8, x1); x++) { s += g.a[y * g.w + x]; m++; }
        blocks.push(s / m); sum += s; n += m;
      }
      const mean = sum / n;
      const sd = Math.sqrt(blocks.reduce((a, v) => a + (v - mean) * (v - mean), 0) / blocks.length);
      vals.push(mean); spreads.push(sd);
    });
    const N = vals.length;
    let mono = 0;
    for (let i = 1; i < N; i++) if (vals[i] - vals[i - 1] > 0.03) mono++;
    mono /= N - 1;
    const steps = []; for (let i = 1; i < N; i++) steps.push(vals[i] - vals[i - 1]);
    const ms = steps.reduce((a, v) => a + v, 0) / steps.length;
    const ssd = Math.sqrt(steps.reduce((a, v) => a + (v - ms) * (v - ms), 0) / steps.length);
    const even = ms > 0 ? U.clamp(1 - ssd / (ms * 1.2), 0, 1) : 0;
    const range = U.clamp((vals[N - 1] - vals[0]) / 0.75, 0, 1);
    const smooth = U.clamp(1 - (spreads.slice(1).reduce((a, v) => a + v, 0) / Math.max(1, N - 1)) / 0.18, 0, 1);
    const firstLight = U.clamp(1 - vals[0] / 0.15, 0, 1);
    const score = Math.round(100 * (0.35 * mono + 0.25 * even + 0.2 * range + 0.12 * smooth + 0.08 * firstLight));
    return { score, vals, mono, even, range, smooth };
  }

  // ---------- shading match ----------
  function blur(a, w, h, r, mask) {
    const out = new Float32Array(w * h), tmp = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { let s = 0, c = 0; for (let x = -r; x < w; x++) {
      if (x + r < w) { s += a[y * w + x + r]; c++; }
      if (x - r - 1 >= 0) { s -= a[y * w + x - r - 1]; c--; }
      if (x >= 0) tmp[y * w + x] = s / c; } }
    for (let x = 0; x < w; x++) { let s = 0, c = 0; for (let y = -r; y < h; y++) {
      if (y + r < h) { s += tmp[(y + r) * w + x]; c++; }
      if (y - r - 1 >= 0) { s -= tmp[(y - r - 1) * w + x]; c--; }
      if (y >= 0) out[y * w + x] = s / c; } }
    return out;
  }

  function shadeMatchScore(board, ref, regionRight, dx) {
    const g = board.inkGrid(GS), w = g.w, h = g.h;
    // render the reference to the grid
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.scale(GS, GS); ref(ctx);
    const rd = ctx.getImageData(0, 0, w, h).data;
    const refDark = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) refDark[i] = 1 - (0.3 * rd[i * 4] + 0.59 * rd[i * 4 + 1] + 0.11 * rd[i * 4 + 2]) / 255;
    const mask = rasterRegion(regionRight, w, h);
    const ub = blur(g.a, w, h, 4), rb = blur(refDark, w, h, 4);
    const sh = Math.round(dx * GS);
    let n = 0, su = 0, sr = 0;
    const U_ = [], R_ = [];
    for (let i = 0; i < w * h; i++) {
      if (!mask[i]) continue;
      const x = i % w; if (x - sh < 0) continue;
      const u = ub[i], r = rb[i - sh];
      U_.push(u); R_.push(r); su += u; sr += r; n++;
    }
    if (!n) return { score: 0 };
    const mu = su / n, mr = sr / n;
    let cov = 0, vu = 0, vr = 0;
    for (let k = 0; k < n; k++) { const a = U_[k] - mu, b = R_[k] - mr; cov += a * b; vu += a * a; vr += b * b; }
    const corr = vu > 1e-6 && vr > 1e-6 ? cov / Math.sqrt(vu * vr) : 0;
    const sdu = Math.sqrt(vu / n), sdr = Math.sqrt(vr / n);
    const pattern = U.clamp((corr - 0.05) / 0.7, 0, 1);
    const level = U.clamp(1 - Math.abs(mu - mr) / 0.35, 0, 1);
    const contrast = U.clamp(sdu / Math.max(0.05, sdr), 0, 1);
    const score = Math.round(100 * (0.62 * pattern + 0.2 * level + 0.18 * contrast));
    return { score, corr, meanUser: mu, meanRef: mr, contrast, pattern, level };
  }


  // ---------- boss mode: colour + value likeness ----------
  function likenessScore(board, refDraw, rect) {
    const g = board.inkGrid(GS), w = g.w, h = g.h;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.scale(GS, GS); refDraw(ctx); ctx.restore();
    const rd = ctx.getImageData(0, 0, w, h).data, ud = g.alpha;
    const x0 = Math.max(0, Math.floor(rect.x0 * GS)), x1 = Math.min(w, Math.ceil(rect.x1 * GS));
    const y0 = Math.max(0, Math.floor(rect.y0 * GS)), y1 = Math.min(h, Math.ceil(rect.y1 * GS));
    const ch = (src, k, isUser) => {
      const a = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        if (isUser) { const al = src[i * 4 + 3] / 255; a[i] = (al * src[i * 4 + k] + (1 - al) * 255) / 255; }
        else a[i] = src[i * 4 + k] / 255;
      }
      return blur(a, w, h, 4);
    };
    const U3 = [0, 1, 2].map((k) => ch(ud, k, true)), R3 = [0, 1, 2].map((k) => ch(rd, k, false));
    let n = 0, su = 0, sr = 0, diff = 0, inkCells = 0, refCells = 0;
    const UL = [], RL = [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = y * w + x;
      const ul = 0.3 * U3[0][i] + 0.59 * U3[1][i] + 0.11 * U3[2][i];
      const rl = 0.3 * R3[0][i] + 0.59 * R3[1][i] + 0.11 * R3[2][i];
      UL.push(ul); RL.push(rl); su += ul; sr += rl; n++;
      diff += (Math.abs(U3[0][i] - R3[0][i]) + Math.abs(U3[1][i] - R3[1][i]) + Math.abs(U3[2][i] - R3[2][i])) / 3;
      if (ud[i * 4 + 3] > 25) inkCells++;
      if (rl < 0.93) refCells++;
    }
    if (!n) return { score: 0 };
    const mu = su / n, mr = sr / n;
    let cv = 0, vu = 0, vr = 0;
    for (let k = 0; k < n; k++) { const a = UL[k] - mu, b = RL[k] - mr; cv += a * b; vu += a * a; vr += b * b; }
    const corr = vu > 1e-6 && vr > 1e-6 ? cv / Math.sqrt(vu * vr) : 0;
    diff /= n;
    const values = U.clamp((corr - 0.1) / 0.7, 0, 1);
    const colors = U.clamp(1 - diff / 0.3, 0, 1);
    const effort = U.clamp(inkCells / Math.max(1, refCells * 0.5), 0, 1);
    const score = Math.round(100 * (0.55 * values + 0.45 * colors) * (0.4 + 0.6 * effort));
    return { score, corr, diff, values, colors, effort, meanUser: mu, meanRef: mr };
  }

  function likenessTips(res) {
    const t = [];
    if (res.effort < 0.6) t.push('Cover more of the animal — realistic drawings are built from many layers.');
    if (res.values < 0.5) t.push('Squint at the reference: match the big light and dark shapes first. Values matter more than color!');
    if (res.meanUser > res.meanRef + 0.08) t.push('Go darker in the shadows — build up more layers.');
    if (res.meanUser < res.meanRef - 0.08) t.push('Too dark overall — keep the lit areas lighter.');
    if (res.colors < 0.5) t.push('Compare colors side by side: is your color warmer, cooler, brighter or duller than the reference?');
    if (!t.length) t.push('Incredible likeness — that\'s expert-level work! 👑');
    return t;
  }

  // ---------- friendly feedback ----------
  function lineTips(res, ctx) {
    const tips = [];
    if (res.empty) return ['Draw something first — the page is still empty! ✏️'];
    if (res.coverage < 0.6) tips.push('Some lines are missing or stop short. Finish every line all the way to the end.');
    else if (res.coverage < 0.8) tips.push('Nearly there! A few parts were missed — check the red dots.');
    if (res.precision < 0.55) tips.push('Lots of marks wander away from the target. Slow down a little and aim before you draw.');
    else if (res.precision < 0.75) tips.push('Try fewer, longer strokes instead of lots of short scratchy ones.');
    if (ctx && ctx.strokesPerPath > 2.5) tips.push('Try one smooth stroke per line. Hover over the line first ("ghosting"), then go!');
    if (res.sizeRatio && (res.sizeRatio < 0.75 || res.sizeRatio > 1.35)) tips.push(res.sizeRatio < 1 ? 'Your drawing came out smaller than the reference — try matching its size.' : 'Your drawing came out bigger than the reference — try matching its size.');
    if (!tips.length) tips.push(res.score >= 90 ? 'Wow — super accurate! 🎯' : 'Nice clean lines! Keep it up.');
    return tips;
  }

  function circleTips(res) {
    if (res.empty) return ['Draw some circles first! ⭕'];
    const tips = [];
    const avgRound = res.used.length ? res.used.reduce((a, f) => a + f.round, 0) / res.used.length : 0;
    const avgClose = res.used.length ? res.used.reduce((a, f) => a + f.closure, 0) / res.used.length : 0;
    if (avgRound < 0.7) tips.push('Your circles are a bit lumpy. Move your whole arm from the shoulder, not just your wrist.');
    if (avgClose < 0.7) tips.push('Close each circle so the end meets the start.');
    if (!tips.length) tips.push('Round and smooth — great circles! 🌕');
    return tips;
  }

  function valueTips(res) {
    const tips = [];
    if (res.mono < 0.8) tips.push('Each box should be a little darker than the one before it.');
    if (res.range < 0.7) tips.push('Make the last box really dark — use the Dark pencil and press harder.');
    if (res.even < 0.6) tips.push('Try to make the jumps between boxes the same size.');
    if (res.smooth < 0.6) tips.push('Fill each box evenly with no white gaps.');
    if (!tips.length) tips.push('A smooth, even value scale — excellent! 🌗');
    return tips;
  }

  function shadeTips(res) {
    const tips = [];
    if (res.pattern < 0.5) tips.push('Find the light first: which side is bright? Keep that side light and shade the opposite side.');
    if (res.meanUser < res.meanRef - 0.1) tips.push("Go darker! Your shadows aren't as dark as the reference.");
    if (res.meanUser > res.meanRef + 0.12) tips.push('Too dark overall — leave the lit side lighter.');
    if (res.contrast < 0.6) tips.push('Add more contrast: darker darks next to lighter lights.');
    if (!tips.length) tips.push('Your light and shadow look great! 🌞');
    return tips;
  }

  DA.score = { GS, likenessScore, likenessTips, lineScore, circleScore, valueScaleScore, shadeMatchScore, lineTips, circleTips, valueTips, shadeTips, fitCircle, distanceTransform };
})(window.DA);
