/* Shared helpers: seeded randomness, geometry, simple 3D projection. */
window.DA = window.DA || {};
(function (DA) {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rng(seed) {
    const r = mulberry32(seed == null ? (Math.random() * 1e9) | 0 : seed);
    return {
      next: r,
      range: (a, b) => a + (b - a) * r(),
      int: (a, b) => Math.floor(a + (b - a + 1) * r()),
      pick: (arr) => arr[Math.floor(r() * arr.length)],
      sign: () => (r() < 0.5 ? -1 : 1),
      chance: (p) => r() < p,
    };
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  // Resample a polyline so points are roughly `step` apart.
  function resample(pts, step, closed) {
    const src = closed ? pts.concat([pts[0]]) : pts;
    const out = [src[0]];
    let carry = 0;
    for (let i = 1; i < src.length; i++) {
      const a = src[i - 1], b = src[i];
      const len = dist(a, b);
      let d = step - carry;
      while (d <= len) {
        const t = d / len;
        out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]);
        d += step;
      }
      carry = len - (d - step);
    }
    return out;
  }

  function pathLength(pts) {
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
    return L;
  }

  function ellipsePts(cx, cy, rx, ry, rot, n, a0, a1) {
    n = n || 64; a0 = a0 || 0; a1 = a1 == null ? Math.PI * 2 : a1;
    const pts = [], c = Math.cos(rot || 0), s = Math.sin(rot || 0);
    for (let i = 0; i <= n; i++) {
      const t = a0 + (a1 - a0) * (i / n);
      const x = rx * Math.cos(t), y = ry * Math.sin(t);
      pts.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return pts;
  }

  // ---- 3D ----
  function rotY(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
  function rotX(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
  function rotZ(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; }
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const scale3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  // Camera: object rotated by yaw/pitch/roll, pushed `dist` away, perspective focal length `f`.
  function camera(o) {
    const yaw = o.yaw || 0, pitch = o.pitch || 0, roll = o.roll || 0;
    const d = o.dist || 6, f = o.f || 700, cx = o.cx, cy = o.cy;
    function toCam(p) { let q = rotY(p, yaw); q = rotX(q, pitch); q = rotZ(q, roll); return [q[0], q[1], q[2] + d]; }
    function proj(q) { return [cx + (f * q[0]) / q[2], cy - (f * q[1]) / q[2]]; }
    return { toCam, proj, project: (p) => proj(toCam(p)), f, d, cx, cy };
  }

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayDiff(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    if (children) (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  DA.util = {
    rng, clamp, lerp, dist, resample, pathLength, ellipsePts,
    rotX, rotY, rotZ, sub3, add3, scale3, dot3, cross3, norm3, camera,
    today, dayDiff, el, esc,
  };
})(window.DA);
