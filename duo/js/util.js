/* Shared helpers: DOM, randomness, sound, confetti, saved progress, modals. */
const U = (() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const rand = (n) => Math.floor(Math.random() * n);
  const range = (a, b) => a + rand(b - a + 1);
  const pick = (a) => a[rand(a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(a|an|the|your|my|of|it|its|is|are)\b/g, ' ').replace(/\s+/g, ' ').trim();

  /* ---------- saved progress ---------- */
  const KEY = 'duoquest-v1';
  const defaults = () => ({ kid: { name: 'Kid', avatar: '🦊' }, adult: { name: 'Grown-up', avatar: '🐻' }, setup: false, stars: {}, best: {}, sound: true, seen: {} });
  let data;
  try { data = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { data = defaults(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage may be blocked */ } };

  /* Pick items from a bank without repeating until every item has been seen. */
  function fresh(bankName, items, n, keyOf = (x, i) => i) {
    const seen = new Set(data.seen[bankName] || []);
    let pool = items.map((x, i) => [x, keyOf(x, i)]).filter(([, k]) => !seen.has(k));
    if (pool.length < n) { seen.clear(); pool = items.map((x, i) => [x, keyOf(x, i)]); }
    const out = shuffle(pool).slice(0, n);
    out.forEach(([, k]) => seen.add(k));
    data.seen[bankName] = [...seen];
    save();
    return out.map(([x]) => x);
  }

  /* ---------- sound ---------- */
  let ac;
  function tone(freq, dur = 0.12, type = 'sine', vol = 0.12, delay = 0) {
    if (!data.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch { /* audio unavailable */ }
  }
  const sfx = {
    tap: () => tone(620, 0.05, 'triangle', 0.07),
    good: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.12, i * 0.07)),
    bad: () => { tone(220, 0.25, 'sawtooth', 0.06); tone(160, 0.35, 'sawtooth', 0.06, 0.12); },
    unlock: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'sine', 0.12, i * 0.06)),
    tick: () => tone(1000, 0.03, 'square', 0.03),
    step: () => tone(300 + rand(80), 0.04, 'triangle', 0.05),
    fanfare: () => [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.13, i * 0.12)),
  };

  /* ---------- confetti ---------- */
  function confetti(ms = 2600) {
    const c = document.createElement('canvas');
    c.className = 'confetti';
    document.body.appendChild(c);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const cols = ['#ff5d8f', '#ffd23f', '#06d6a0', '#4cc9f0', '#9b5de5', '#ff8c42'];
    const P = Array.from({ length: 140 }, () => ({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.5, vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4, r: 4 + Math.random() * 6, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, c: pick(cols),
    }));
    const t0 = performance.now();
    (function frame(t) {
      g.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of P) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.a += p.va;
        g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore();
      }
      if (t - t0 < ms) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }

  /* ---------- modal ---------- */
  function modal(html, { cls = '', dismiss = true } = {}) {
    return new Promise((resolve) => {
      const wrap = el(`<div class="modal-wrap"><div class="modal ${cls}">${html}</div></div>`);
      const close = (v) => { wrap.remove(); resolve(v); };
      wrap.addEventListener('click', (e) => {
        const b = e.target.closest('[data-close]');
        if (b) { sfx.tap(); close(b.dataset.close); } else if (dismiss && e.target === wrap) close(null);
      });
      document.body.appendChild(wrap);
      wrap.close = close;
      modal.last = wrap;
    });
  }

  function toast(msg, ms = 1600) {
    const t = el(`<div class="toast">${msg}</div>`);
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('out'), ms);
    setTimeout(() => t.remove(), ms + 400);
  }

  const who = (w) => (w === 'kid' ? data.kid : data.adult);
  const tag = (w) => `<span class="tag ${w}">${esc(who(w).avatar)} ${esc(who(w).name)}</span>`;

  return { $, $$, esc, el, rand, range, pick, shuffle, clamp, fmt, norm, data: () => data, save, fresh, sfx, tone, confetti, modal, toast, who, tag };
})();
