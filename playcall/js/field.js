/* The field picture: two helmets facing off over a horizontal field, and a little ball that
   replays each play (direction, distance, pass arc vs run). */
(function (root) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const W = 1000;
  const FAR_Y = 215; // far sideline (screen y)
  const NEAR_Y = 425; // near sideline
  const FAR_S = 0.74; // perspective squeeze at the far sideline

  // ESPN yard line: 0 = home goal line, 100 = away goal line. Home's end zone is drawn on the right.
  function P(yl, lat, z) {
    const t = lat;
    const s = FAR_S + (1 - FAR_S) * t;
    const x0 = 40 + ((100 - yl) + 10) / 120 * 920;
    return { x: 500 + (x0 - 500) * s, y: FAR_Y + (NEAR_Y - FAR_Y) * t - (z || 0) * 7 * s, s };
  }
  const pt = (p) => p.x.toFixed(1) + ',' + p.y.toFixed(1);
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach((k) => e.setAttribute(k, attrs[k]));
    if (parent) parent.appendChild(e);
    return e;
  }
  function quad(a, b, c, d) { return [a, b, c, d].map(pt).join(' '); }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (f) => (f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2);
  const easeOut = (f) => 1 - Math.pow(1 - f, 3);

  // A football helmet in profile, facing right, drawn in a 260x200 box.
  function helmet(g, color, alt, uid) {
    const shell = color || '#5b6770';
    const stripe = alt || '#ffffff';
    el('ellipse', { cx: 135, cy: 214, rx: 95, ry: 9, fill: 'rgba(0,0,0,.35)', class: 'hshadow' }, g);
    const defs = el('defs', {}, g);
    const grad = el('linearGradient', { id: 'hg' + uid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#ffffff', 'stop-opacity': '.35' }, grad);
    el('stop', { offset: '.45', 'stop-color': '#ffffff', 'stop-opacity': '0' }, grad);
    el('stop', { offset: 1, 'stop-color': '#000000', 'stop-opacity': '.35' }, grad);
    const shellPath = 'M40 150 C8 110 18 38 92 18 C152 2 226 30 236 94 L238 110 L204 113 C192 113 188 121 188 129 L188 150 C160 176 92 184 40 150 Z';
    el('path', { d: shellPath, fill: shell, stroke: 'rgba(0,0,0,.55)', 'stroke-width': 4 }, g);
    el('path', { d: 'M52 64 C96 22 176 22 230 84', fill: 'none', stroke: stripe, 'stroke-width': 13, 'stroke-linecap': 'round' }, g);
    el('path', { d: 'M52 64 C96 22 176 22 230 84', fill: 'none', stroke: 'rgba(0,0,0,.25)', 'stroke-width': 3, transform: 'translate(0,8)' }, g);
    el('path', { d: shellPath, fill: 'url(#hg' + uid + ')' }, g);
    el('circle', { cx: 128, cy: 122, r: 11, fill: '#111', stroke: 'rgba(255,255,255,.4)', 'stroke-width': 2 }, g);
    el('path', { d: 'M150 150 C160 164 178 170 196 160', fill: 'none', stroke: '#222', 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
    const mask = el('g', { fill: 'none', stroke: '#d9dde1', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    el('path', { d: 'M202 106 L262 102 C268 120 268 140 258 158 L196 156' }, mask);
    el('path', { d: 'M198 130 L266 130' }, mask);
    el('path', { d: 'M234 104 L234 157' }, mask);
    el('path', { d: 'M190 152 L196 156' }, mask);
    return g;
  }

  function create() {
    const wrap = document.createElement('div');
    wrap.className = 'fieldwrap';
    const svg = el('svg', { viewBox: '0 0 ' + W + ' 440', class: 'fieldsvg', role: 'img', 'aria-label': 'Field view of the last play' });
    wrap.appendChild(svg);

    // --- field ---
    const fieldG = el('g', {}, svg);
    for (let i = 0; i < 12; i++) {
      const a = 110 - i * 10;
      el('polygon', { points: quad(P(a, 0), P(a - 10, 0), P(a - 10, 1), P(a, 1)), fill: i % 2 ? '#2f7a3d' : '#2a6f37' }, fieldG);
    }
    const ezL = el('polygon', { points: quad(P(110, 0), P(100, 0), P(100, 1), P(110, 1)), fill: '#1d4f8a', class: 'ez' }, fieldG);
    const ezR = el('polygon', { points: quad(P(0, 0), P(-10, 0), P(-10, 1), P(0, 1)), fill: '#8a1d1d', class: 'ez' }, fieldG);
    const ezLt = el('text', { class: 'eztext', 'text-anchor': 'middle' }, fieldG);
    const ezRt = el('text', { class: 'eztext', 'text-anchor': 'middle' }, fieldG);
    [[ezLt, 105], [ezRt, -5]].forEach(([t, yl]) => {
      const c = P(yl, 0.5);
      t.setAttribute('transform', `translate(${c.x.toFixed(1)},${c.y.toFixed(1)}) rotate(${yl > 50 ? -90 : 90})`);
      t.setAttribute('dy', '.35em');
    });
    for (let yl = 0; yl <= 100; yl += 5) {
      el('line', { x1: P(yl, 0).x, y1: P(yl, 0).y, x2: P(yl, 1).x, y2: P(yl, 1).y, stroke: 'rgba(255,255,255,' + (yl % 10 ? '.35' : '.7') + ')', 'stroke-width': yl === 0 || yl === 100 ? 4 : 2 }, fieldG);
      if (yl % 10 === 0 && yl > 0 && yl < 100) {
        const n = yl <= 50 ? yl : 100 - yl;
        const q = P(yl, 0.88);
        el('text', { x: q.x, y: q.y, class: 'ydnum', 'text-anchor': 'middle' }, fieldG).textContent = n;
        const q2 = P(yl, 0.1);
        el('text', { x: q2.x, y: q2.y, class: 'ydnum far', 'text-anchor': 'middle' }, fieldG).textContent = n;
      }
    }
    for (let yl = 1; yl < 100; yl++) {
      if (yl % 5 === 0) continue;
      [0.4, 0.6].forEach((lat) => {
        const a = P(yl, lat - 0.012);
        const b = P(yl, lat + 0.012);
        el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: 'rgba(255,255,255,.35)', 'stroke-width': 1.5 }, fieldG);
      });
    }
    el('polygon', { points: quad(P(110, 0), P(-10, 0), P(-10, 1), P(110, 1)), fill: 'none', stroke: 'rgba(255,255,255,.8)', 'stroke-width': 3 }, fieldG);

    const losLine = el('line', { stroke: '#3d8bff', 'stroke-width': 4, opacity: 0 }, svg);
    const fdLine = el('line', { stroke: '#ffd23f', 'stroke-width': 4, opacity: 0 }, svg);
    const trail = el('polyline', { fill: 'none', stroke: '#fff', 'stroke-width': 3, 'stroke-dasharray': '2 8', 'stroke-linecap': 'round', opacity: 0 }, svg);
    const flag = el('g', { opacity: 0 }, svg);
    el('path', { d: 'M0 0 L14 -4 L18 8 L4 12 Z', fill: '#ffd23f', stroke: '#b38f00', 'stroke-width': 1.5 }, flag);
    const target = el('ellipse', { rx: 16, ry: 6, fill: 'none', stroke: '#fff', 'stroke-width': 2, opacity: 0 }, svg);

    // --- helmets (hovering above the field, facing each other) ---
    const hl = el('g', { class: 'helm left' }, svg);
    const hr = el('g', { class: 'helm right' }, svg);
    const hlInner = el('g', { transform: 'translate(205,8)' }, hl);
    const hrInner = el('g', { transform: 'translate(795,8) scale(-1,1)' }, hr);
    const logoL = el('image', { x: 281, y: 59, width: 64, height: 64, class: 'hlogo' }, hl);
    const logoR = el('image', { x: 655, y: 59, width: 64, height: 64, class: 'hlogo' }, hr);
    [logoL, logoR].forEach((im) => im.addEventListener('error', () => im.setAttribute('opacity', 0)));
    const possL = el('text', { x: 205 + 20, y: 40, class: 'poss' }, hl);
    const possR = el('text', { x: 795 - 50, y: 40, class: 'poss' }, hr);
    const spark = el('g', { class: 'spark', transform: 'translate(500,95)', opacity: 0 }, svg);
    el('path', { d: 'M0 -38 L9 -10 L38 -12 L14 6 L24 34 L0 16 L-24 34 L-14 6 L-38 -12 L-9 -10 Z', fill: '#ffd23f', stroke: '#fff', 'stroke-width': 3 }, spark);

    // --- ball ---
    const shadow = el('ellipse', { rx: 11, ry: 4, fill: 'rgba(0,0,0,.45)', opacity: 0 }, svg);
    const ball = el('g', { opacity: 0 }, svg);
    el('ellipse', { rx: 13, ry: 7.5, fill: '#8a4a22', stroke: '#4a230b', 'stroke-width': 1.5 }, ball);
    el('path', { d: 'M-5 0 H5 M-3 -2 V2 M0 -2 V2 M3 -2 V2', stroke: '#fff', 'stroke-width': 1.3 }, ball);

    const label = el('text', { x: 500, y: 300, class: 'playlabel', 'text-anchor': 'middle', opacity: 0 }, svg);
    const sublabel = el('text', { x: 500, y: 334, class: 'playsub', 'text-anchor': 'middle', opacity: 0 }, svg);

    let state = { los: null, possHome: null, togo: null };
    let teamsKey = '';
    let busy = false;
    const queue = [];
    let restYL = null;
    let restLat = 0.5;

    function setLine(line, yl) {
      if (yl == null || yl <= 0 || yl >= 100) { line.setAttribute('opacity', 0); return; }
      const a = P(yl, 0);
      const b = P(yl, 1);
      line.setAttribute('x1', a.x); line.setAttribute('y1', a.y); line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
      line.setAttribute('opacity', 0.9);
    }
    function placeBall(yl, lat, z, rot) {
      const g = P(yl, lat, 0);
      const b = P(yl, lat, z);
      shadow.setAttribute('cx', g.x); shadow.setAttribute('cy', g.y);
      shadow.setAttribute('opacity', clamp(0.5 - z * 0.03, 0.15, 0.5));
      const sc = g.s * (1 + z * 0.04);
      ball.setAttribute('transform', `translate(${b.x.toFixed(1)},${b.y.toFixed(1)}) rotate(${(rot || 0).toFixed(0)}) scale(${sc.toFixed(2)})`);
      ball.setAttribute('opacity', 1);
    }
    function showLabel(main, sub, cls) {
      label.textContent = main;
      sublabel.textContent = sub || '';
      label.setAttribute('class', 'playlabel ' + (cls || ''));
      label.setAttribute('opacity', 1);
      sublabel.setAttribute('opacity', sub ? 1 : 0);
    }
    function idle() {
      const yl = restYL != null ? restYL : state.los;
      if (yl != null) placeBall(yl, restLat, 0, 0);
      setLine(losLine, state.los);
      const sign = state.possHome ? 1 : -1;
      setLine(fdLine, state.los != null && state.togo && state.possHome != null ? state.los + sign * state.togo : null);
      possL.textContent = state.possHome === false ? '🏈' : '';
      possR.textContent = state.possHome === true ? '🏈' : '';
    }

    function setTeams(away, home) {
      const key = JSON.stringify([away, home]);
      if (key === teamsKey) return;
      teamsKey = key;
      while (hlInner.firstChild) hlInner.removeChild(hlInner.firstChild);
      while (hrInner.firstChild) hrInner.removeChild(hrInner.firstChild);
      const fix = (c) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : null);
      helmet(hlInner, fix(away && away.color) || '#4a5560', fix(away && away.alt) || '#ffffff', 'L');
      helmet(hrInner, fix(home && home.color) || '#6a3a3a', fix(home && home.alt) || '#ffffff', 'R');
      [[logoL, away], [logoR, home]].forEach(([im, t]) => {
        if (t && t.logo) { im.setAttribute('href', t.logo); im.setAttribute('opacity', 1); } else im.setAttribute('opacity', 0);
      });
      ezL.setAttribute('fill', fix(away && away.color) || '#1d4f8a');
      ezR.setAttribute('fill', fix(home && home.color) || '#8a1d1d');
      ezLt.textContent = (away && away.abbr) || '';
      ezRt.textContent = (home && home.abbr) || '';
    }

    function update(status) {
      if (status) {
        setTeams(status.away, status.home);
        state = { los: status.los != null ? status.los : state.los, possHome: status.possHome != null ? status.possHome : state.possHome, togo: status.togo };
      } else setTeams(null, null);
      if (!busy) { restYL = state.los; restLat = 0.5; idle(); }
    }

    function frames(dur, fn) {
      return new Promise((resolve) => {
        const t0 = performance.now();
        const reduce = root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) { fn(1); resolve(); return; }
        function step(now) {
          const f = clamp((now - t0) / dur, 0, 1);
          fn(f);
          if (f < 1) requestAnimationFrame(step); else resolve();
        }
        requestAnimationFrame(step);
      });
    }
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    async function clash() {
      wrap.classList.remove('clashing');
      void wrap.getBoundingClientRect();
      wrap.classList.add('clashing');
      spark.setAttribute('opacity', 0);
      await wait(330);
      spark.setAttribute('opacity', 1);
      await wait(260);
      spark.setAttribute('opacity', 0);
      await wait(250);
      wrap.classList.remove('clashing');
    }

    async function run(item) {
      busy = true;
      const r = item.result;
      const a = r.anim || {};
      const home = a.home != null ? a.home : state.possHome != null ? state.possHome : false;
      const sign = home ? 1 : -1; // + = toward screen left
      const from = a.from != null ? a.from : state.los != null ? state.los : 50;
      const facingRight = !home;
      const laneOf = (d) => (d === 'left' ? (facingRight ? 0.2 : 0.8) : d === 'right' ? (facingRight ? 0.8 : 0.2) : 0.5);
      const lane = laneOf(r.dir);
      label.setAttribute('opacity', 0);
      sublabel.setAttribute('opacity', 0);
      flag.setAttribute('opacity', 0);
      target.setAttribute('opacity', 0);
      trail.setAttribute('opacity', 0);
      setLine(fdLine, null);
      setLine(losLine, from);
      placeBall(from, 0.5, 0, 0);
      await clash();

      if (r.kind === 'drive') {
        showLabel(r.drive === 'td' ? '🚨 TOUCHDOWN DRIVE!' : r.drive === 'fg' ? '🥅 FIELD GOAL' : '🚫 NO POINTS', 'Red zone drive result', r.drive === 'none' ? 'bad' : 'big');
        await wait(2600);
      } else if (r.void) {
        const q = P(from, 0.45);
        flag.setAttribute('transform', `translate(${q.x},${q.y - 80})`);
        flag.setAttribute('opacity', 1);
        await frames(600, (f) => flag.setAttribute('transform', `translate(${q.x + f * 10},${q.y - 80 + easeOut(f) * 80}) rotate(${f * 200})`));
        const why = /punt/i.test(r.text || '') ? 'Punt' : /field goal/i.test(r.text || '') ? 'Field goal try' : 'No play';
        showLabel('🚩 ' + why.toUpperCase(), 'Doesn’t count for points', 'muted');
        await wait(2200);
      } else {
        const yards = r.yards != null ? r.yards : r.dist === 'long' ? 12 : r.dist === 'mid' ? 7 : 2;
        let to = a.to != null ? a.to : clamp(from + sign * yards, 0, 100);
        const pts = [P(from, 0.5)];
        if (r.play_type === 'pass' && a.sack) {
          await frames(500, (f) => placeBall(from - sign * 6 * ease(f), 0.5, 0.6, 0));
          await frames(400, (f) => placeBall(from - sign * 6 + (to - from + sign * 6) * ease(f), 0.5 + Math.sin(f * 20) * 0.02, 0.3, f * 90));
          pts.push(P(to, 0.5));
          showLabel('💥 SACK', Math.abs(yards) + ' yd loss', 'bad');
        } else if (r.play_type === 'pass') {
          const qb = from - sign * 5;
          await frames(420, (f) => placeBall(from - sign * 5 * ease(f), 0.5, 0.8, 0));
          pts.push(P(qb, 0.5));
          const air = a.inc ? (a.depth === 'deep' ? 24 : 9) : Math.max(yards, 1);
          const land = a.inc || a.int ? clamp(from + sign * air, 1, 99) : to;
          const flight = Math.abs(land - qb);
          const peak = 2.2 + flight * 0.22;
          const tp = P(land, lane);
          target.setAttribute('cx', tp.x); target.setAttribute('cy', tp.y); target.setAttribute('opacity', 0.6);
          const dur = 750 + flight * 22;
          const sx = P(qb, 0.5);
          const ex = P(land, lane);
          const spin = Math.atan2(ex.y - sx.y, ex.x - sx.x) * 180 / Math.PI;
          await frames(dur, (f) => {
            const yl = qb + (land - qb) * f;
            const lat = 0.5 + (lane - 0.5) * f;
            placeBall(yl, lat, 0.8 + peak * 4 * f * (1 - f), spin + (f < 0.5 ? -20 : 20) * (1 - 2 * f));
            if (f > 0.02) { pts.push(P(yl, lat, 0.8 + peak * 4 * f * (1 - f))); trail.setAttribute('points', pts.map(pt).join(' ')); trail.setAttribute('opacity', 0.8); }
          });
          target.setAttribute('opacity', 0);
          if (a.inc) {
            await frames(500, (f) => placeBall(land + sign * 2 * f, lane + 0.03 * f, Math.abs(Math.sin(f * Math.PI * 2)) * 1.2 * (1 - f), spin + f * 360));
            to = from;
            showLabel('✋ INCOMPLETE', 'Pass ' + (r.dir ? (r.dir === 'center' ? 'middle' : r.dir) : '') + (a.depth ? ' · ' + a.depth : ''), 'muted');
          } else if (a.int) {
            await frames(500, (f) => placeBall(land - sign * 4 * f, lane, 0.6, spin + 180));
            to = land - sign * 4;
            showLabel('🔄 INTERCEPTED!', 'Pass ' + (r.dir ? (r.dir === 'center' ? 'middle' : r.dir) : ''), 'bad');
          } else {
            const after = to - land;
            if (Math.abs(after) > 0.5) await frames(300, (f) => placeBall(land + after * f, lane, 0.6, spin));
            pts.push(P(to, lane));
          }
        } else {
          // Run: handoff, cut toward the lane, then go.
          const cut = from + sign * Math.min(2, Math.max(0, yards));
          await frames(260, (f) => placeBall(from - sign * 0.8 * f, 0.5, 0.6, 0));
          const dur = clamp(700 + Math.abs(yards) * 45, 700, 2600);
          await frames(dur, (f) => {
            const g = ease(f);
            const yl = f < 0.25 ? from + (cut - from) * (f / 0.25) : cut + (to - cut) * ease((f - 0.25) / 0.75);
            const lat = 0.5 + (lane - 0.5) * Math.min(1, f / 0.35);
            placeBall(yl, lat, 0.6 + Math.abs(Math.sin(g * 18)) * 0.25, 0);
            pts.push(P(yl, lat));
            trail.setAttribute('points', pts.map(pt).join(' '));
            trail.setAttribute('opacity', 0.8);
          });
        }
        if (!a.inc && !a.int && !a.sack) {
          const dirTxt = r.dir ? (r.dir === 'center' ? 'up the middle' : r.dir) : '';
          const yTxt = (yards > 0 ? '+' : '') + yards + ' yd' + (Math.abs(yards) === 1 ? '' : 's');
          if (a.td) showLabel('🙌 TOUCHDOWN!', (r.play_type === 'pass' ? 'Pass ' : 'Run ') + dirTxt + ' · ' + yTxt, 'big');
          else showLabel((r.play_type === 'pass' ? '🎯 PASS ' : '🏃 RUN ') + yTxt, dirTxt ? dirTxt.toUpperCase() : '', yards >= 10 ? 'good' : '');
        }
        restYL = to;
        restLat = a.inc ? 0.5 : lane;
        setLine(losLine, to);
        await wait(2600);
      }
      label.setAttribute('opacity', 0);
      sublabel.setAttribute('opacity', 0);
      flag.setAttribute('opacity', 0);
      busy = false;
      if (queue.length) return run(queue.shift());
      // Settle onto the real spot from the feed.
      restYL = state.los != null ? state.los : restYL;
      restLat = 0.5;
      idle();
      trail.setAttribute('opacity', 0.35);
      return null;
    }

    function play(result) {
      if (!result) return;
      if (busy) { queue.push({ result }); if (queue.length > 3) queue.shift(); return; }
      run({ result });
    }

    update(null);
    return { el: wrap, update, play, get busy() { return busy; } };
  }

  root.Field = { create, P };
})(window);
