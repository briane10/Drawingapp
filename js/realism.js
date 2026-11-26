/* Realistic shaded references for animals.
 * Takes an animal's silhouette and "inflates" it into a rounded 3D form, then lights it from
 * the top-left, like a clay sculpture. This gives a believable light/shadow reference to copy.
 */
(function (DA) {
  'use strict';
  const U = DA.util;
  const GS = 0.5, GW = 600, GH = 400;
  const LIGHT = U.norm3([-0.62, -0.6, 0.5]); // from top-left, toward the viewer (y points down)

  function mask(region) {
    const c = document.createElement('canvas'); c.width = GW; c.height = GH;
    const ctx = c.getContext('2d'); ctx.scale(GS, GS); ctx.fillStyle = '#000';
    ctx.beginPath(); region.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill();
    const d = ctx.getImageData(0, 0, GW, GH).data, m = new Uint8Array(GW * GH);
    for (let i = 0; i < GW * GH; i++) m[i] = d[i * 4 + 3] > 128 ? 1 : 0;
    return m;
  }

  function boxBlur(a, r) {
    const out = new Float32Array(a.length), tmp = new Float32Array(a.length);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      let s = 0, n = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < GW) { s += a[y * GW + xx]; n++; } } tmp[y * GW + x] = s / n;
    }
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      let s = 0, n = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < GH) { s += tmp[yy * GW + x]; n++; } } out[y * GW + x] = s / n;
    }
    return out;
  }

  /* paths: final line paths (logical coords). region: silhouette polygon (logical coords). */
  function render(paths, region, opts) {
    opts = opts || {};
    const m = mask(region);
    const outside = new Uint8Array(GW * GH);
    for (let i = 0; i < m.length; i++) outside[i] = m[i] ? 0 : 1;
    const d = DA.score.distanceTransform(outside, GW, GH);
    let maxD = 0; for (let i = 0; i < d.length; i++) if (m[i]) maxD = Math.max(maxD, d[i]);
    const R = Math.max(8, Math.min(26, maxD * 0.8));
    let h = new Float32Array(GW * GH);
    for (let i = 0; i < h.length; i++) {
      if (!m[i]) continue;
      const t = Math.min(d[i], R);
      h[i] = Math.sqrt(R * R - (R - t) * (R - t)) + Math.max(0, d[i] - R) * 0.25;
    }
    h = boxBlur(boxBlur(boxBlur(h, 3), 3), 2);

    // silhouette bbox for the cast shadow
    let x0 = GW, x1 = 0, y1 = 0;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (m[y * GW + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const sc = { cx: (x0 + x1) / 2 + (x1 - x0) * 0.08, cy: y1 - 2, rx: (x1 - x0) * 0.55, ry: Math.max(6, (x1 - x0) * 0.07) };

    const rnd = U.rng(opts.seed || 3);
    const c = document.createElement('canvas'); c.width = GW; c.height = GH;
    const ctx = c.getContext('2d'), img = ctx.createImageData(GW, GH);
    const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16) / 255);
    const local = opts.color ? hex(opts.color) : null;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const i = y * GW + x;
      let v, lam = 0, rgb;
      if (m[i]) {
        const hx = (h[i + 1] || 0) - (h[i - 1] || 0), hy = (h[i + GW] || 0) - (h[i - GW] || 0);
        const n = U.norm3([-hx, -hy, 2]);
        lam = U.dot3(n, LIGHT);
        if (lam > 0.08) v = 0.42 + 0.55 * lam;
        else if (lam > -0.05) v = 0.3; // core shadow band
        else v = 0.33 + 0.07 * Math.max(0, -n[1]); // shadow with a bit of reflected light from the ground
        const noise = opts.texture ? (rnd.next() - 0.5) * (local ? 0.07 : 0.05) : 0;
        if (local) {
          const f = v / 0.62;
          rgb = local.map((c) => c * f);
          if (lam > 0.08) rgb = [rgb[0] + 0.07 * lam, rgb[1] + 0.04 * lam, rgb[2] - 0.02 * lam]; // warm light
          else rgb = [rgb[0] * 0.85, rgb[1] * 0.9, rgb[2] * 0.95 + 0.06]; // cool shadow
          rgb = rgb.map((c) => U.clamp(c + noise, 0, 1));
        } else v = U.clamp(v + noise, 0, 0.97);
      } else {
        const ex = (x - sc.cx) / sc.rx, ey = (y - sc.cy) / sc.ry, e = ex * ex + ey * ey;
        v = e < 1 ? 0.62 + 0.38 * e : 1;
        if (local && e < 1) rgb = [v * 0.95, v * 0.94, v * 1.0].map((c) => Math.min(1, c)); // cool cast shadow
      }
      if (!rgb) rgb = [v, v, v];
      img.data[i * 4] = Math.round(rgb[0] * 255); img.data[i * 4 + 1] = Math.round(rgb[1] * 255); img.data[i * 4 + 2] = Math.round(rgb[2] * 255); img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);

    function draw(dctx) {
      dctx.save();
      dctx.imageSmoothingEnabled = true;
      dctx.drawImage(c, 0, 0, 1200, 800);
      dctx.strokeStyle = opts.color ? 'rgba(40,30,25,.45)' : 'rgba(40,36,44,.75)'; dctx.lineWidth = opts.color ? 1.6 : 2.2; dctx.lineCap = 'round'; dctx.lineJoin = 'round';
      paths.forEach((p) => { dctx.beginPath(); p.pts.forEach((q, k) => (k ? dctx.lineTo(q[0], q[1]) : dctx.moveTo(q[0], q[1]))); if (p.closed) dctx.closePath(); dctx.stroke(); });
      dctx.restore();
    }
    return { draw, canvas: c };
  }

  // A cropped preview image (data URL) of the reference around the silhouette.
  function cropRect(region) {
    const xs = region.map((p) => p[0]), ys = region.map((p) => p[1]);
    const pad = 40, x0 = Math.max(0, Math.min(...xs) - pad), y0 = Math.max(0, Math.min(...ys) - pad);
    const x1 = Math.min(1200, Math.max(...xs) + pad), y1 = Math.min(800, Math.max(...ys) + pad * 1.6);
    return { x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1) };
  }

  function preview(ref, region) {
    const { x0, y0, x1, y1 } = cropRect(region);
    const full = document.createElement('canvas'); full.width = 1200; full.height = 800;
    const fctx = full.getContext('2d'); fctx.fillStyle = '#fff'; fctx.fillRect(0, 0, 1200, 800); ref.draw(fctx);
    const out = document.createElement('canvas'); out.width = x1 - x0; out.height = y1 - y0;
    out.getContext('2d').drawImage(full, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
    return out.toDataURL('image/png');
  }

  DA.realism = { render, preview, cropRect, LIGHT };
})(window.DA);
