/* Small UI kit: toasts, modals, confetti, sounds and Pip the pencil mascot. */
(function (DA) {
  'use strict';
  const U = DA.util;

  // ---------- Pip the pencil ----------
  function mascot(mood, size) {
    size = size || 64;
    const mouth = {
      happy: '<path d="M27 47 q5 6 10 0" stroke="#3b2a20" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
      wow: '<ellipse cx="32" cy="48" rx="3.2" ry="4" fill="#3b2a20"/>',
      think: '<path d="M28 48 h8" stroke="#3b2a20" stroke-width="2.2" stroke-linecap="round"/>',
      cheer: '<path d="M26 45 q6 9 12 0 z" fill="#3b2a20"/>',
    }[mood || 'happy'];
    return `<svg class="pip" width="${size}" height="${size * 1.5}" viewBox="0 0 64 96" aria-hidden="true">
      <rect x="18" y="4" width="28" height="12" rx="4" fill="#ff8fa3"/>
      <rect x="18" y="14" width="28" height="6" fill="#c8cdd4"/>
      <rect x="18" y="20" width="28" height="50" rx="2" fill="#ffc93c"/>
      <rect x="18" y="20" width="9" height="50" fill="#ffb703"/>
      <path d="M18 70 L46 70 L32 92 Z" fill="#f4d9b0"/>
      <path d="M28 85 L36 85 L32 92 Z" fill="#3b2a20"/>
      <circle cx="26" cy="38" r="4.2" fill="#fff"/><circle cx="38" cy="38" r="4.2" fill="#fff"/>
      <circle cx="27" cy="39" r="2.2" fill="#3b2a20"/><circle cx="39" cy="39" r="2.2" fill="#3b2a20"/>
      <circle cx="22" cy="45" r="2.6" fill="#ff8fa3" opacity=".6"/><circle cx="42" cy="45" r="2.6" fill="#ff8fa3" opacity=".6"/>
      ${mouth}
    </svg>`;
  }

  function bubble(text, mood) {
    return U.el('div', { class: 'pip-say' }, [U.el('div', { class: 'pip-wrap', html: mascot(mood, 40) }), U.el('div', { class: 'bubble', html: text })]);
  }

  // ---------- toast ----------
  let toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = U.el('div', { class: 'toast' }); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  // ---------- modal ----------
  function modal(content, opts) {
    opts = opts || {};
    const back = U.el('div', { class: 'modal-back' });
    const box = U.el('div', { class: 'modal' + (opts.wide ? ' wide' : '') });
    if (typeof content === 'string') box.innerHTML = content; else box.appendChild(content);
    back.appendChild(box);
    document.body.appendChild(back);
    requestAnimationFrame(() => back.classList.add('show'));
    const close = () => { back.classList.remove('show'); setTimeout(() => back.remove(), 200); if (opts.onClose) opts.onClose(); };
    if (opts.dismiss !== false) back.addEventListener('click', (e) => { if (e.target === back) close(); });
    return { box, close };
  }

  function confirmBox(text, yes) {
    const m = modal(U.el('div', {}, [
      U.el('p', { text }),
      U.el('div', { class: 'row end' }, [
        U.el('button', { class: 'btn', text: 'Cancel', onclick: () => m.close() }),
        U.el('button', { class: 'btn danger', text: 'Yes', onclick: () => { m.close(); yes(); } }),
      ]),
    ]));
  }

  // ---------- confetti ----------
  function confetti(n) {
    n = n || 120;
    const c = U.el('canvas', { class: 'confetti' });
    document.body.appendChild(c);
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
    const colors = ['#ff9f43', '#54a0ff', '#10ac84', '#ee5253', '#feca57', '#a55eea', '#ff6b81'];
    const P = [];
    for (let i = 0; i < n; i++) P.push({ x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6 + 4, c: colors[i % colors.length], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3 });
    let t = 0;
    (function frame() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      P.forEach((p) => { p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
      if (++t < 150) requestAnimationFrame(frame); else c.remove();
    })();
  }

  // ---------- sound ----------
  let ac;
  function tone(freq, start, dur, type, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, ac.currentTime + start);
    g.gain.linearRampToValueAtTime(vol || 0.12, ac.currentTime + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(ac.currentTime + start); o.stop(ac.currentTime + start + dur + 0.05);
  }
  function sound(kind) {
    if (!DA.store.settings().sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      if (kind === 'good') [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.25, 'triangle'));
      else if (kind === 'great') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.35, 'triangle'));
      else if (kind === 'ok') [440, 554].forEach((f, i) => tone(f, i * 0.1, 0.2, 'sine'));
      else if (kind === 'tick') tone(880, 0, 0.06, 'square', 0.04);
      else if (kind === 'level') [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.4, 'triangle', 0.1));
      else tone(660, 0, 0.08, 'sine', 0.06);
    } catch (e) { /* audio unavailable */ }
  }

  function stars(n, total) {
    total = total || 3;
    let s = '';
    for (let i = 0; i < total; i++) s += `<span class="star ${i < n ? 'on' : ''}" style="animation-delay:${i * 0.15}s">★</span>`;
    return `<span class="stars">${s}</span>`;
  }

  function praise(score) {
    if (score >= 95) return U.rng().pick(['WOW! That\'s incredible! 🤩', 'Perfect! Are you a pro already? 🏆', 'Masterpiece! 🌟']);
    if (score >= 85) return U.rng().pick(['Amazing work! ⭐', 'Super job — that\'s really good! 🎉', 'Fantastic lines! 🙌']);
    if (score >= 70) return U.rng().pick(['Great job! 👍', 'Nice! You\'re getting better! 💪', 'Really good! Keep going! 🚀']);
    if (score >= 60) return U.rng().pick(['You passed! Practice makes progress. ✅', 'Nice try — you did it! 😊']);
    return U.rng().pick(['Good try! Every artist starts here. 🌱', 'Almost! Try once more — you\'ve got this. 💪', 'Keep practicing — mistakes help you learn! 🧠']);
  }

  DA.ui = { mascot, bubble, toast, modal, confirmBox, confetti, sound, stars, praise };
  DA.toast = toast;
})(window.DA);
