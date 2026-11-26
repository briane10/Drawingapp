/* App shell: router, nav, theme, onboarding, install hint. */
(function (DA) {
  'use strict';
  const U = DA.util, ui = DA.ui, St = DA.store;
  const el = U.el;

  const NAV = [
    { hash: '#/', icon: '🏠', label: 'Home' },
    { hash: '#/path', icon: '🗺️', label: 'Quest' },
    { hash: '#/practice', icon: '🎯', label: 'Practice' },
    { hash: '#/zoo', icon: '🦁', label: 'My Zoo' },
    { hash: '#/me', icon: '📈', label: 'Me' },
  ];

  const app = {
    current: null,

    init() {
      this.applyTheme();
      this.view = document.getElementById('view');
      this.buildNav();
      window.addEventListener('hashchange', () => this.route());
      this.route();
      if (!St.state.settings.onboarded) this.onboard();
      else this.installHint();
      if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }
    },

    applyTheme() {
      const t = St.settings().theme;
      if (t === 'auto') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', t);
    },

    buildNav() {
      const nav = document.getElementById('nav');
      nav.innerHTML = '';
      NAV.forEach((n) => nav.appendChild(el('a', { href: n.hash, class: 'nav-item', 'data-hash': n.hash }, [el('span', { class: 'nav-icon', text: n.icon }), el('span', { class: 'nav-label', text: n.label })])));
    },

    updateChips() {
      const s = St.state, r = St.rankFor(s.xp);
      document.getElementById('chips').innerHTML = `<span class="chip" title="Streak">🔥 ${St.currentStreak()}</span><span class="chip" title="XP">${r.cur.emoji} ${s.xp} XP</span>`;
    },

    route(opts) {
      if (this.current) { this.current.destroy(); this.current = null; }
      document.body.classList.remove('drawing');
      const h = location.hash || '#/';
      const parts = h.replace(/^#\/?/, '').split('/');
      const v = this.view;
      v.innerHTML = '';
      v.scrollTop = 0; window.scrollTo(0, 0);
      const base = '#/' + (parts[0] || '');
      document.querySelectorAll('.nav-item').forEach((a) => a.classList.toggle('on', a.dataset.hash === base || (base === '#/lesson' && a.dataset.hash === '#/path')));
      this.updateChips();
      const V = DA.views;
      switch (parts[0]) {
        case '': V.home(v); break;
        case 'path': V.path(v); break;
        case 'lesson': V.lesson(v, parts[1], opts); break;
        case 'daily': V.daily(v); break;
        case 'practice': V.practice(v, parts[1]); break;
        case 'zoo': V.zoo(v); break;
        case 'me': V.me(v); break;
        default: location.hash = '#/';
      }
    },

    onboard() {
      const name = el('input', { type: 'text', placeholder: 'Your name (optional)', maxlength: 24, class: 'big-input' });
      const m = ui.modal(el('div', { class: 'onboard' }, [
        el('div', { class: 'pip-big', html: ui.mascot('cheer', 90) }),
        el('h1', { text: 'Hi! I\'m Pip ✏️' }),
        el('p', { class: 'lead', text: 'I\'ll help you learn to draw — from your very first line all the way to drawing lions and dragons!' }),
        el('ul', { class: 'onboard-list' }, [
          el('li', { html: '🗺️ <b>Quest</b>: 9 worlds of short, fun lessons' }),
          el('li', { html: '🐾 <b>Animals</b>: from cartoon fish to realistic wolves' }),
          el('li', { html: '⭐ <b>Scores & stars</b>: instant feedback on your drawings' }),
          el('li', { html: '✏️ <b>Apple Pencil</b>: pressure, palm rejection, 2-finger-tap undo' }),
        ]),
        el('label', {}, [el('span', { class: 'muted', text: 'What should I call you?' }), name]),
        el('button', { class: 'btn primary huge', text: "Let's go! 🚀", onclick: () => {
          St.setSetting('name', name.value.trim());
          St.setSetting('onboarded', true);
          m.close(); this.route(); this.installHint();
        } }),
      ]), { dismiss: false });
    },

    installHint() {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
      if (!ios || standalone || sessionStorage.getItem('sq-install-hint')) return;
      try { sessionStorage.setItem('sq-install-hint', '1'); } catch (e) { /* ignore */ }
      const bar = el('div', { class: 'install-hint' }, [
        el('span', { html: '📲 <b>Install Sketch Quest:</b> tap <b>Share</b> <span class="share-ico">⬆︎</span> then <b>Add to Home Screen</b> for full-screen drawing.' }),
        el('button', { class: 'btn small', text: '✕', 'aria-label': 'Dismiss', onclick: () => bar.remove() }),
      ]);
      document.body.appendChild(bar);
    },
  };

  DA.app = app;
  document.addEventListener('DOMContentLoaded', () => app.init());
})(window.DA);
