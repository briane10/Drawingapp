/* Thinking challenges: Tag-Team Trivia, Riddle Relay, Team Crossword, Split-Control Maze. */

/* ================= Tag-Team Trivia ================= */
Challenges.trivia = {
  name: 'Tag-Team Trivia', emoji: '❓', kind: 'Trivia · agree to answer',
  blurb: 'You both have answer buttons. An answer only counts when you pick the same one!',
  coop: 'Each of you has your own set of buttons. An answer only locks in when you both pick the same one, so talk it through. In Combo questions the kid answers one part, the grown-up answers the other, and you put the numbers together.',
  run(root, ctx) {
    const d = ctx.d;
    const mk = (row, who) => {
      if (typeof row[1] === 'boolean') return { who, q: row[0], tf: true, opts: ['True', 'False'], ans: row[1] ? 0 : 1 };
      const opts = U.shuffle(row.slice(1));
      return { who, q: row[0], opts, ans: opts.indexOf(row[1]) };
    };
    const nKid = d <= 2 ? 3 : 2, nAdult = d <= 2 ? 2 : 3, nCombo = d <= 1 ? 1 : 2;
    const qs = U.shuffle([
      ...U.fresh('trivia-kid', DATA.trivia.kid, nKid, (x) => x[0]).map((r) => mk(r, 'kid')),
      ...U.fresh('trivia-adult', DATA.trivia.adult, nAdult, (x) => x[0]).map((r) => mk(r, 'adult')),
    ]);
    for (let i = 0; i < nCombo; i++) {
      const k = U.pick(DATA.kidNumbers), a = U.pick(DATA.adultNumbers);
      let op = d <= 1 ? '+' : U.pick(d >= 3 ? ['+', '−', '×'] : ['+', '−']);
      if (op === '×' && k[1] * a[1] > 3000) op = '+';
      const big = a[1] >= k[1];
      const ans = op === '+' ? k[1] + a[1] : op === '×' ? k[1] * a[1] : Math.abs(a[1] - k[1]);
      const phrase = op === '+' ? "Kid's number <b>+</b> Grown-up's number" : op === '×' ? "Kid's number <b>×</b> Grown-up's number"
        : big ? "Grown-up's number <b>−</b> Kid's number" : "Kid's number <b>−</b> Grown-up's number";
      qs.splice(Math.min(qs.length, 2 + i * 3), 0, { combo: true, k, a, ans, phrase });
    }
    root._test = { qs };
    const total = qs.reduce((s, q) => s + (q.combo ? 150 : 100), 0);
    let qi = 0, score = 0, right = 0;
    const log = [];

    function show() {
      if (qi >= qs.length) return end();
      const q = qs[qi];
      ctx.hud(`Question ${qi + 1}/${qs.length} · ⭐ ${score}`);
      if (q.combo) return showCombo(q);
      let pickK = null, pickA = null, disagreements = 0, locked = false;
      const btns = (who) => q.opts.map((o, i) => `<button class="ans" data-who="${who}" data-i="${i}"><span class="ltr">${'ABCD'[i]}</span>${U.esc(o)}</button>`).join('');
      root.innerHTML = `<div class="trivia">
        <div class="qcard"><div class="qmeta">${q.who === 'kid' ? `💡 ${U.esc(U.who('kid').name)}'s specialty` : `💡 ${U.esc(U.who('adult').name)}'s specialty`}${q.tf ? ' · True or false?' : ''}</div>
          <div class="qtext">${U.esc(q.q)}</div><div class="qstatus">Both of you pick an answer!</div></div>
        <div class="split">
          <div class="pane kid"><div class="pane-h">${U.tag('kid')}</div><div class="answers ${q.tf ? 'tf' : ''}">${btns('kid')}</div></div>
          <div class="pane adult"><div class="pane-h">${U.tag('adult')}</div><div class="answers ${q.tf ? 'tf' : ''}">${btns('adult')}</div></div>
        </div></div>`;
      const status = U.$('.qstatus', root);
      root.querySelectorAll('.ans').forEach((b) => b.addEventListener('click', () => {
        if (locked) return;
        U.sfx.tap();
        const i = +b.dataset.i;
        if (b.dataset.who === 'kid') pickK = i; else pickA = i;
        root.querySelectorAll(`.ans[data-who="${b.dataset.who}"]`).forEach((x) => x.classList.toggle('picked', x === b));
        if (pickK === null || pickA === null) { status.textContent = pickK === null ? `Waiting for ${U.who('kid').name}…` : `Waiting for ${U.who('adult').name}…`; return; }
        if (pickK !== pickA) {
          disagreements++;
          status.innerHTML = '🗣️ You picked <b>different</b> answers! Talk it over and pick again.';
          U.sfx.bad(); locked = true;
          root.querySelector('.split').classList.add('shake');
          setTimeout(() => {
            locked = false; pickK = pickA = null;
            root.querySelector('.split')?.classList.remove('shake');
            root.querySelectorAll('.ans').forEach((x) => x.classList.remove('picked'));
          }, 1100);
          return;
        }
        locked = true;
        const ok = pickK === q.ans;
        const pts = ok ? (disagreements ? 60 : 100) : 0;
        score += pts; if (ok) right++;
        log.push(`${ok ? '✅' : '❌'} ${q.q} — ${q.opts[q.ans]}`);
        root.querySelectorAll('.ans').forEach((x) => { const i2 = +x.dataset.i; if (i2 === q.ans) x.classList.add('right'); else if (i2 === pickK) x.classList.add('wrong'); });
        status.innerHTML = ok ? `✅ Correct! +${pts}${disagreements ? ' (agreeing faster earns 100)' : ''}` : `❌ It was <b>${U.esc(q.opts[q.ans])}</b>`;
        (ok ? U.sfx.good : U.sfx.bad)();
        nextBtn();
      }));
    }

    function showCombo(q) {
      let tries = 0;
      root.innerHTML = `<div class="trivia">
        <div class="qcard"><div class="qmeta">🧮 Combo question · work together!</div>
          <div class="qtext small">Answer your own part out loud, then put the numbers together.</div></div>
        <div class="split">
          <div class="pane kid"><div class="pane-h">${U.tag('kid')}'s part</div><div class="combo-q">How many <b>${U.esc(q.k[0])}</b>?</div></div>
          <div class="pane adult"><div class="pane-h">${U.tag('adult')}'s part</div><div class="combo-q">How many <b>${U.esc(q.a[0])}</b>?</div></div>
        </div>
        <div class="combo-calc"><div class="combo-f">${q.phrase} = ?</div>
          <div class="numrow"><input class="num" inputmode="numeric" pattern="[0-9]*" placeholder="?" maxlength="5" readonly>
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => `<button class="key" data-n="${n}">${n}</button>`).join('')}
          <button class="key" data-n="del">⌫</button><button class="btn good" data-check>Check</button></div>
          <div class="qstatus"></div></div></div>`;
      const inp = U.$('.num', root), status = U.$('.qstatus', root);
      root.querySelectorAll('.key').forEach((k) => k.addEventListener('click', () => {
        U.sfx.tap();
        if (k.dataset.n === 'del') inp.value = inp.value.slice(0, -1); else if (inp.value.length < 5) inp.value += k.dataset.n;
      }));
      const check = () => {
        if (!inp.value) return;
        const ok = +inp.value === q.ans;
        tries++;
        if (!ok && tries < 2) { U.sfx.bad(); status.innerHTML = '❌ Not quite! Double-check each part — one more try.'; inp.value = ''; return; }
        const pts = ok ? (tries === 1 ? 150 : 90) : 0;
        score += pts; if (ok) right++;
        log.push(`${ok ? '✅' : '❌'} Combo: ${q.k[1]} (${q.k[0]}) & ${q.a[1]} (${q.a[0]}) → ${q.ans}`);
        (ok ? U.sfx.good : U.sfx.bad)();
        status.innerHTML = `${ok ? `✅ Yes! +${pts}` : '❌ Out of tries.'} ${U.esc(U.who('kid').name)}: <b>${q.k[1]}</b> ${U.esc(q.k[0])}. ${U.esc(U.who('adult').name)}: <b>${q.a[1]}</b> ${U.esc(q.a[0])}. Answer: <b>${q.ans}</b>`;
        root.querySelectorAll('.key,[data-check]').forEach((b) => { b.disabled = true; });
        nextBtn();
      };
      U.$('[data-check]', root).onclick = check;
    }

    function nextBtn() {
      ctx.hud(`Question ${qi + 1}/${qs.length} · ⭐ ${score}`);
      const b = U.el(`<button class="btn big next">${qi + 1 < qs.length ? 'Next question ▶' : 'See results ▶'}</button>`);
      b.onclick = () => { U.sfx.tap(); qi++; show(); };
      U.$('.trivia', root).appendChild(b);
      b.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function end() {
      const r = score / total;
      ctx.finish({ stars: r >= 0.8 ? 3 : r >= 0.55 ? 2 : r >= 0.3 ? 1 : 0, score, lines: [`${right} of ${qs.length} correct`, ...log] });
    }
    show();
  },
};

/* ================= Riddle Relay ================= */
Challenges.riddles = {
  name: 'Riddle Relay', emoji: '🧩', kind: 'Puzzles · riddles',
  blurb: 'Take turns reading riddles out loud and crack them together.',
  coop: 'For each riddle one of you is the Reader (reads it out loud) and the other is the Typer. Swap every riddle. Use hints if you get stuck, but they cost points.',
  run(root, ctx) {
    const n = ctx.d <= 1 ? 3 : 4;
    const list = U.fresh('riddles', DATA.riddles, n, (x) => x[0]);
    let i = 0, score = 0, solved = 0;
    const log = [];
    function show() {
      if (i >= list.length) {
        const r = score / (n * 100);
        return ctx.finish({ stars: r >= 0.8 ? 3 : r >= 0.5 ? 2 : solved ? 1 : 0, score, lines: [`${solved} of ${n} riddles solved`, ...log] });
      }
      const [q, answers, hint] = list[i];
      root._test = { answers };
      const reader = i % 2 ? 'adult' : 'kid', typer = i % 2 ? 'kid' : 'adult';
      let hints = 0, wrong = 0;
      const main = answers[0];
      ctx.hud(`Riddle ${i + 1}/${n} · ⭐ ${score}`);
      root.innerHTML = `<div class="riddle">
        <div class="roles">📖 Reader: ${U.tag(reader)} &nbsp; ⌨️ Typer: ${U.tag(typer)}</div>
        <div class="riddle-card"><div class="riddle-q">${U.esc(q)}</div><div class="riddle-hints"></div></div>
        <form class="riddle-form"><input class="riddle-in" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer…">
        <button class="btn good" type="submit">Solve!</button></form>
        <div class="row center"><button class="btn ghost" data-hint>💡 Hint</button><button class="btn ghost" data-skip>⏭ Give up</button></div>
        <div class="qstatus"></div></div>`;
      const inp = U.$('.riddle-in', root), status = U.$('.qstatus', root), hintsEl = U.$('.riddle-hints', root);
      setTimeout(() => inp.focus(), 50);
      const finishOne = (ok) => {
        const pts = ok ? Math.max(30, 100 - hints * 30 - wrong * 5) : 0;
        score += pts; if (ok) solved++;
        log.push(`${ok ? '✅' : '❌'} ${q} — ${main}`);
        status.innerHTML = ok ? `✅ <b>${U.esc(main)}</b>! +${pts}` : `The answer was <b>${U.esc(main)}</b>.`;
        (ok ? U.sfx.good : U.sfx.bad)();
        root.querySelectorAll('button,input').forEach((b) => { b.disabled = true; });
        const b = U.el(`<button class="btn big next">${i + 1 < n ? 'Next riddle ▶' : 'See results ▶'}</button>`);
        b.onclick = () => { U.sfx.tap(); i++; show(); };
        U.$('.riddle', root).appendChild(b);
      };
      U.$('.riddle-form', root).onsubmit = (e) => {
        e.preventDefault();
        const g = U.norm(inp.value);
        if (!g) return;
        const ok = answers.some((a) => { const na = U.norm(a); return g === na || g === `${na}s` || `${g}s` === na || g.split(' ').includes(na) || (na.includes(' ') && g.includes(na)); });
        if (ok) finishOne(true);
        else { wrong++; U.sfx.bad(); inp.classList.add('shake'); setTimeout(() => inp.classList.remove('shake'), 400); status.textContent = U.pick(['Nope — try again!', 'Not that one…', 'Hmm, think sideways!', 'Close? Keep going!']); inp.select(); }
      };
      U.$('[data-hint]', root).onclick = () => {
        U.sfx.tap();
        if (hints === 0) hintsEl.innerHTML += `<div>💡 ${U.esc(hint)}</div>`;
        else if (hints === 1) hintsEl.innerHTML += `<div>🔤 ${main.length} letters, starts with “${main[0].toUpperCase()}”: ${main.split('').map((c, k) => (k === 0 || c === ' ' ? c.toUpperCase() : '_')).join(' ')}</div>`;
        else { U.toast('No more hints!'); return; }
        hints++;
      };
      U.$('[data-skip]', root).onclick = () => finishOne(false);
    }
    show();
  },
};

/* ================= Team Crossword ================= */
function buildCrossword(words, target) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const list = U.shuffle(words).sort((a, b) => (attempt % 2 ? 0 : b.w.length - a.w.length));
    const cells = new Map(); const placed = [];
    const key = (r, c) => `${r},${c}`;
    const can = (w, r, c, dir) => {
      const dr = dir === 'D' ? 1 : 0, dc = dir === 'A' ? 1 : 0;
      if (cells.has(key(r - dr, c - dc)) || cells.has(key(r + dr * w.length, c + dc * w.length))) return -1;
      let cross = 0;
      for (let i = 0; i < w.length; i++) {
        const rr = r + dr * i, cc = c + dc * i, cell = cells.get(key(rr, cc));
        if (cell) { if (cell.ch !== w[i] || cell[dir]) return -1; cross++; }
        else if (cells.has(key(rr + dc, cc + dr)) || cells.has(key(rr - dc, cc - dr))) return -1;
      }
      return cross;
    };
    const put = (item, r, c, dir) => {
      const dr = dir === 'D' ? 1 : 0, dc = dir === 'A' ? 1 : 0;
      for (let i = 0; i < item.w.length; i++) {
        const k = key(r + dr * i, c + dc * i);
        const cell = cells.get(k) || { ch: item.w[i] };
        cell[dir] = true; cells.set(k, cell);
      }
      placed.push({ ...item, r, c, dir });
    };
    put(list[0], 0, 0, 'A');
    for (const item of list.slice(1)) {
      if (placed.length >= target) break;
      if (placed.some((p) => p.w === item.w)) continue;
      const opts = [];
      for (const [k, cell] of cells) {
        const [r, c] = k.split(',').map(Number);
        for (let i = 0; i < item.w.length; i++) {
          if (item.w[i] !== cell.ch) continue;
          for (const dir of ['A', 'D']) {
            if (cell[dir]) continue;
            const sr = dir === 'D' ? r - i : r, sc = dir === 'A' ? c - i : c;
            const x = can(item.w, sr, sc, dir);
            if (x > 0) opts.push({ r: sr, c: sc, dir, x });
          }
        }
      }
      if (!opts.length) continue;
      opts.sort((a, b) => b.x - a.x);
      const best = opts.filter((o) => o.x === opts[0].x);
      const o = U.pick(best);
      put(item, o.r, o.c, o.dir);
    }
    const kids = placed.filter((p) => p.who === 'kid').length, adults = placed.length - kids;
    if (placed.length >= target && kids >= 2 && adults >= 2) {
      const rs = [...cells.keys()].map((k) => +k.split(',')[0]), cs = [...cells.keys()].map((k) => +k.split(',')[1]);
      const r0 = Math.min(...rs), c0 = Math.min(...cs);
      const rows = Math.max(...rs) - r0 + 1, cols = Math.max(...cs) - c0 + 1;
      if (rows > 13 || cols > 15) continue;
      placed.forEach((p) => { p.r -= r0; p.c -= c0; });
      const starts = [...new Set(placed.map((p) => `${p.r},${p.c}`))].sort((a, b) => { const [ar, ac] = a.split(',').map(Number), [br, bc] = b.split(',').map(Number); return ar - br || ac - bc; });
      placed.forEach((p) => { p.num = starts.indexOf(`${p.r},${p.c}`) + 1; });
      return { rows, cols, words: placed };
    }
  }
  return null;
}

Challenges.crossword = {
  name: 'Team Crossword', emoji: '🔠', kind: 'Puzzles · crossword',
  blurb: 'The kid has easy clues, the grown-up has tricky ones, and the words cross each other.',
  coop: 'Kid clues are orange and grown-up clues are blue. Their words cross, so every letter one of you solves is a hint for the other. Tap a square or a clue, then type.',
  run(root, ctx) {
    const d = ctx.d;
    const target = Math.min(10, 5 + d);
    const pool = [
      ...U.shuffle(DATA.cross.kid).slice(0, 14).map(([w, clue]) => ({ w, clue, who: 'kid' })),
      ...U.shuffle(DATA.cross.adult).slice(0, 14).map(([w, clue]) => ({ w, clue, who: 'adult' })),
    ];
    const cw = buildCrossword(pool, target) || buildCrossword(pool, target - 1) || buildCrossword(pool, 4);
    const grid = {};
    root._test = { cw };
    cw.words.forEach((w, wi) => { for (let i = 0; i < w.w.length; i++) { const r = w.r + (w.dir === 'D' ? i : 0), c = w.c + (w.dir === 'A' ? i : 0); const k = `${r},${c}`; grid[k] = grid[k] || { ch: w.w[i], val: '', words: [] }; grid[k].words.push(wi); } });
    let sel = { wi: 0, i: 0 }, hints = 0, checks = 0, t0 = performance.now(), timer, finished = false;
    const cellsOf = (wi) => { const w = cw.words[wi]; return Array.from({ length: w.w.length }, (_, i) => `${w.r + (w.dir === 'D' ? i : 0)},${w.c + (w.dir === 'A' ? i : 0)}`); };

    const clueList = (who) => cw.words.map((w, wi) => ({ w, wi })).filter((x) => x.w.who === who).sort((a, b) => a.w.num - b.w.num)
      .map(({ w, wi }) => `<li data-wi="${wi}"><b>${w.num}${w.dir === 'A' ? '→' : '↓'}</b> ${U.esc(w.clue)} <span class="muted">(${w.w.length})</span></li>`).join('');
    root.innerHTML = `<div class="xw">
      <div class="xw-grid-wrap"><div class="xw-grid" style="grid-template-columns:repeat(${cw.cols},1fr);aspect-ratio:${cw.cols}/${cw.rows}"></div></div>
      <div class="xw-side">
        <div class="xw-current"></div>
        <div class="xw-clues"><div class="clues kid"><h3>${U.tag('kid')} clues</h3><ol>${clueList('kid')}</ol></div>
        <div class="clues adult"><h3>${U.tag('adult')} clues</h3><ol>${clueList('adult')}</ol></div></div>
        <div class="row center wrap"><button class="btn ghost" data-check>🔍 Check</button><button class="btn ghost" data-hint>💡 Reveal a letter</button></div>
      </div>
      <div class="kbd">${['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM⌫'].map((row) => `<div>${[...row].map((ch) => `<button data-k="${ch}">${ch}</button>`).join('')}</div>`).join('')}</div>
    </div>`;
    const gridEl = U.$('.xw-grid', root);
    for (let r = 0; r < cw.rows; r++) for (let c = 0; c < cw.cols; c++) {
      const k = `${r},${c}`, cell = grid[k];
      const num = cw.words.find((w) => w.r === r && w.c === c)?.num;
      gridEl.insertAdjacentHTML('beforeend', cell ? `<div class="xc" data-k="${k}">${num ? `<i>${num}</i>` : ''}<span></span></div>` : '<div class="xc blank"></div>');
    }
    const fitGrid = () => {
      const wrap = U.$('.xw-grid-wrap', root); if (!wrap) return;
      const r = wrap.getBoundingClientRect();
      const cell = Math.max(16, Math.min(56, Math.floor(Math.min(r.width / cw.cols, r.height / cw.rows))));
      gridEl.style.width = `${cell * cw.cols}px`;
      gridEl.style.fontSize = `${Math.round(cell * 0.55)}px`;
    };
    addEventListener('resize', fitGrid);
    requestAnimationFrame(fitGrid);
    const render = () => {
      const active = new Set(cellsOf(sel.wi)), curK = cellsOf(sel.wi)[sel.i];
      const w = cw.words[sel.wi];
      gridEl.querySelectorAll('.xc[data-k]').forEach((e) => {
        const cell = grid[e.dataset.k];
        U.$('span', e).textContent = cell.val;
        e.classList.toggle('on', active.has(e.dataset.k));
        e.classList.toggle('cur', e.dataset.k === curK);
        e.classList.toggle('kidw', active.has(e.dataset.k) && w.who === 'kid');
        e.classList.toggle('ok', cell.val === cell.ch && cell.words.every((wi) => cellsOf(wi).every((k) => grid[k].val === grid[k].ch)));
      });
      root.querySelectorAll('.xw-clues li').forEach((li) => {
        const wi = +li.dataset.wi;
        li.classList.toggle('sel', wi === sel.wi);
        li.classList.toggle('done', cellsOf(wi).every((k) => grid[k].val === grid[k].ch));
      });
      U.$('.xw-current', root).innerHTML = `<span class="tag ${w.who}">${w.num}${w.dir === 'A' ? '→' : '↓'}</span> ${U.esc(w.clue)}`;
    };
    const select = (wi, i = null) => {
      sel.wi = wi;
      sel.i = i ?? Math.max(0, cellsOf(wi).findIndex((k) => !grid[k].val));
      render();
    };
    gridEl.addEventListener('click', (e) => {
      const c = e.target.closest('.xc[data-k]'); if (!c) return;
      U.sfx.tap();
      const k = c.dataset.k, ws = grid[k].words;
      let wi = ws.includes(sel.wi) ? sel.wi : ws[0];
      if (ws.includes(sel.wi) && cellsOf(sel.wi)[sel.i] === k && ws.length > 1) wi = ws.find((x) => x !== sel.wi);
      select(wi, cellsOf(wi).indexOf(k));
    });
    root.querySelectorAll('.xw-clues li').forEach((li) => li.addEventListener('click', () => { U.sfx.tap(); select(+li.dataset.wi, 0); }));
    const type = (ch) => {
      if (finished) return;
      const ks = cellsOf(sel.wi);
      if (ch === '⌫') {
        if (!grid[ks[sel.i]].val && sel.i > 0) sel.i--;
        grid[ks[sel.i]].val = '';
      } else {
        grid[ks[sel.i]].val = ch;
        if (sel.i < ks.length - 1) sel.i++;
        else {
          const next = cw.words.findIndex((w, wi) => cellsOf(wi).some((k) => !grid[k].val));
          if (next >= 0 && cellsOf(sel.wi).every((k) => grid[k].val)) { select(next); checkDone(); return; }
        }
      }
      render(); checkDone();
    };
    root.querySelectorAll('.kbd button').forEach((b) => b.addEventListener('click', () => { U.sfx.tap(); type(b.dataset.k); }));
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey) return;
      if (/^[a-z]$/i.test(e.key)) type(e.key.toUpperCase());
      else if (e.key === 'Backspace') type('⌫');
      else return;
      e.preventDefault();
    };
    addEventListener('keydown', onKey);
    U.$('[data-check]', root).onclick = () => {
      checks++; let bad = 0;
      gridEl.querySelectorAll('.xc[data-k]').forEach((e) => {
        const cell = grid[e.dataset.k];
        if (cell.val && cell.val !== cell.ch) { bad++; e.classList.add('bad'); setTimeout(() => e.classList.remove('bad'), 1500); }
      });
      if (bad) U.sfx.bad(); else U.sfx.good();
      U.toast(bad ? `${bad} letter${bad > 1 ? 's' : ''} to fix (shown in red)` : 'Everything so far is right! 👍');
    };
    U.$('[data-hint]', root).onclick = () => {
      const ks = cellsOf(sel.wi).filter((k) => grid[k].val !== grid[k].ch);
      if (!ks.length) return U.toast('This word is already solved!');
      hints++; const k = ks[0]; grid[k].val = grid[k].ch; U.sfx.tap(); render(); checkDone();
    };
    function checkDone() {
      if (finished || !Object.values(grid).every((c) => c.val === c.ch)) return;
      finished = true; clearInterval(timer);
      const time = (performance.now() - t0) / 1000, par = 60 + cw.words.length * 30;
      const stars = hints <= 1 && time <= par ? 3 : hints <= Math.ceil(cw.words.length / 3) ? 2 : 1;
      U.sfx.good();
      setTimeout(() => ctx.finish({
        stars, score: Math.max(50, Math.round(cw.words.length * 100 - hints * 40 - Math.max(0, time - par))),
        lines: [`Solved ${cw.words.length} words in ${U.fmt(time)}`, `${hints} letter${hints === 1 ? '' : 's'} revealed, ${checks} check${checks === 1 ? '' : 's'}`],
      }), 900);
    }
    timer = setInterval(() => ctx.hud(`⏱ ${U.fmt((performance.now() - t0) / 1000)} · ${cw.words.filter((w, wi) => cellsOf(wi).every((k) => grid[k].val === grid[k].ch)).length}/${cw.words.length} words`), 500);
    ctx.onCleanup(() => { clearInterval(timer); removeEventListener('keydown', onKey); removeEventListener('resize', fitGrid); });
    select(cw.words.findIndex((w) => w.who === 'kid'));
  },
};

/* ================= Split-Control Maze ================= */
Challenges.maze = {
  name: 'Split-Control Maze', emoji: '🕹️', kind: 'Teamwork · reflexes',
  blurb: 'The kid can only move up and down. The grown-up can only move left and right.',
  coop: 'One character, two drivers! The kid has the ⬆️⬇️ buttons and the grown-up has the ⬅️➡️ buttons. Grab every key 🗝️ and get to the door 🚪. On harder levels your controls swap without warning!',
  run(root, ctx) {
    const d = ctx.d;
    const portrait = innerHeight > innerWidth;
    let cols = 7 + d * 2, rows = 5 + d;
    if (portrait) [cols, rows] = [rows + 1, cols - 1];
    const keysN = d <= 1 ? 1 : Math.min(3, d);
    const swapEvery = d >= 3 ? 20 : 0, fog = d >= 4;
    /* walls[r][c] = {n,e,s,w} true when blocked */
    const walls = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ n: 1, e: 1, s: 1, w: 1 })));
    const seen = new Set(['0,0']); const stack = [[0, 0]];
    const D = { n: [-1, 0, 's'], s: [1, 0, 'n'], e: [0, 1, 'w'], w: [0, -1, 'e'] };
    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const opts = Object.entries(D).filter(([, [dr, dc]]) => { const rr = r + dr, cc = c + dc; return rr >= 0 && cc >= 0 && rr < rows && cc < cols && !seen.has(`${rr},${cc}`); });
      if (!opts.length) { stack.pop(); continue; }
      const [k, [dr, dc, back]] = U.pick(opts);
      walls[r][c][k] = 0; walls[r + dr][c + dc][back] = 0;
      seen.add(`${r + dr},${c + dc}`); stack.push([r + dr, c + dc]);
    }
    /* open a few extra walls so there is more than one way around */
    for (let i = 0; i < Math.floor(rows * cols * 0.06); i++) {
      const r = U.rand(rows), c = U.rand(cols - 1);
      walls[r][c].e = 0; walls[r][c + 1].w = 0;
    }
    const exit = { r: rows - 1, c: cols - 1 };
    const keys = [];
    while (keys.length < keysN) {
      const k = { r: U.rand(rows), c: U.rand(cols) };
      if ((k.r + k.c > 3) && !(k.r === exit.r && k.c === exit.c) && !keys.some((x) => x.r === k.r && x.c === k.c)) keys.push(k);
    }
    root._test = () => ({ walls, keys, exit, me, rows, cols });
    const me = { r: 0, c: 0 }, visited = new Set(['0,0']);
    let got = 0, moves = 0, t0 = null, swapped = false, lastSwap = 0, finished = false, timer;
    const par = 15 + rows * cols * 0.3;

    root.innerHTML = `<div class="maze ${portrait ? 'portrait' : ''}">
      <div class="pad kid"><div class="pad-h"></div><button data-dir="a1"></button><button data-dir="a2"></button></div>
      <div class="maze-mid"><div class="maze-info"></div><canvas class="maze-cv"></canvas></div>
      <div class="pad adult"><div class="pad-h"></div><button data-dir="b1"></button><button data-dir="b2"></button></div>
    </div>`;
    const cv = U.$('.maze-cv', root), info = U.$('.maze-info', root);
    let g, S;
    const layoutPads = () => {
      const kidV = !swapped;
      const set = (cls, who, vertical) => {
        const p = U.$(`.pad.${cls}`, root);
        p.className = `pad ${cls} ${who}`;
        U.$('.pad-h', p).innerHTML = U.tag(who);
        const [b1, b2] = p.querySelectorAll('button');
        b1.textContent = vertical ? '⬆️' : '⬅️'; b1.dataset.mv = vertical ? 'n' : 'w';
        b2.textContent = vertical ? '⬇️' : '➡️'; b2.dataset.mv = vertical ? 's' : 'e';
      };
      set('kid', 'kid', kidV); set('adult', 'adult', !kidV);
    };
    const size = () => {
      const mid = U.$('.maze-mid', root).getBoundingClientRect();
      S = Math.floor(Math.min((mid.width - 8) / cols, (mid.height - 40) / rows));
      cv.style.width = `${S * cols}px`; cv.style.height = `${S * rows}px`;
      ({ g } = Draw.fitCanvas(cv)); paint();
    };
    const paint = () => {
      g.clearRect(0, 0, S * cols, S * rows);
      g.fillStyle = '#fffdf8'; g.fillRect(0, 0, S * cols, S * rows);
      g.strokeStyle = '#3d3450'; g.lineWidth = Math.max(2, S / 9); g.lineCap = 'round';
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = c * S, y = r * S, w = walls[r][c];
        if (fog && !visible(r, c)) { g.fillStyle = '#4a4160'; g.fillRect(x - 0.5, y - 0.5, S + 1, S + 1); continue; }
        g.beginPath();
        if (w.n) { g.moveTo(x, y); g.lineTo(x + S, y); }
        if (w.w) { g.moveTo(x, y); g.lineTo(x, y + S); }
        if (r === rows - 1 && w.s) { g.moveTo(x, y + S); g.lineTo(x + S, y + S); }
        if (c === cols - 1 && w.e) { g.moveTo(x + S, y); g.lineTo(x + S, y + S); }
        g.stroke();
      }
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${S * 0.66}px system-ui`;
      for (const k of keys) if (!k.got && (!fog || visible(k.r, k.c))) g.fillText('🗝️', k.c * S + S / 2, k.r * S + S / 2);
      g.fillText(got >= keysN ? '🚪' : '🔒', exit.c * S + S / 2, exit.r * S + S / 2);
      g.fillText(U.who('kid').avatar, me.c * S + S / 2, me.r * S + S / 2);
      info.innerHTML = `🗝️ ${got}/${keysN} keys${swapEvery ? ` · 🔀 controls swap every ${swapEvery}s` : ''}${fog ? ' · 🌫️ foggy!' : ''}`;
    };
    const visible = (r, c) => visited.has(`${r},${c}`) || (Math.abs(r - me.r) + Math.abs(c - me.c) <= 2);
    const move = (dir) => {
      if (finished) return;
      if (t0 === null) { t0 = performance.now(); lastSwap = t0; }
      if (walls[me.r][me.c][dir]) { U.tone(140, 0.06, 'square', 0.04); bump(); return; }
      me.r += D[dir][0]; me.c += D[dir][1]; moves++; visited.add(`${me.r},${me.c}`); U.sfx.step();
      for (const k of keys) if (!k.got && k.r === me.r && k.c === me.c) { k.got = true; got++; U.sfx.unlock(); U.toast(`🗝️ Key ${got} of ${keysN}!`, 900); }
      if (me.r === exit.r && me.c === exit.c) {
        if (got >= keysN) return win();
        U.toast(`🔒 Locked! Find ${keysN - got} more key${keysN - got > 1 ? 's' : ''}.`, 1200);
      }
      paint();
    };
    const bump = () => { cv.classList.remove('shake'); void cv.offsetWidth; cv.classList.add('shake'); };
    const reps = new Map();
    root.querySelectorAll('.pad button').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); move(b.dataset.mv);
        clearInterval(reps.get(b)); const start = setTimeout(() => reps.set(b, setInterval(() => move(b.dataset.mv), 140)), 320); reps.set(b, start);
      });
      const stop = () => { clearTimeout(reps.get(b)); clearInterval(reps.get(b)); };
      b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop); b.addEventListener('pointercancel', stop);
    });
    const onKey = (e) => {
      const map = swapped ? { a: 'w', d: 'e', ArrowUp: 'n', ArrowDown: 's' } : { w: 'n', s: 's', ArrowLeft: 'w', ArrowRight: 'e' };
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (map[k]) { e.preventDefault(); move(map[k]); }
    };
    addEventListener('keydown', onKey);
    function win() {
      finished = true; clearInterval(timer); paint();
      const time = (performance.now() - t0) / 1000;
      const stars = time <= par ? 3 : time <= par * 1.7 ? 2 : 1;
      U.sfx.good();
      setTimeout(() => ctx.finish({ stars, score: Math.max(50, Math.round(500 - time * 4)), lines: [`Escaped in ${U.fmt(time)} (${moves} moves)`, `Target time for 3 stars: ${U.fmt(par)}`] }), 600);
    }
    timer = setInterval(() => {
      if (t0 === null) { ctx.hud('Press any arrow to start!'); return; }
      const now = performance.now();
      ctx.hud(`⏱ ${U.fmt((now - t0) / 1000)}`);
      if (swapEvery && now - lastSwap > swapEvery * 1000) {
        lastSwap = now; swapped = !swapped; layoutPads(); U.tone(500, 0.1, 'square', 0.06); U.tone(700, 0.1, 'square', 0.06, 0.1);
        U.toast('🔀 SWAP! Kid now has ' + (swapped ? '⬅️➡️' : '⬆️⬇️'), 1400);
      }
    }, 250);
    ctx.onCleanup(() => { clearInterval(timer); removeEventListener('keydown', onKey); removeEventListener('resize', size); reps.forEach((t) => { clearTimeout(t); clearInterval(t); }); });
    addEventListener('resize', size);
    layoutPads();
    requestAnimationFrame(size);
  },
};
