/* Escape rooms. Each room is built fresh with random codes. Secret cards are for one player's eyes only. */
const COLORS = {
  red: '#ef476f', blue: '#3a86ff', green: '#06d6a0', yellow: '#ffd23f', purple: '#9b5de5', orange: '#ff8c42',
  gold: '#f5c518', silver: '#c0c4cc', bronze: '#cd7f32', white: '#ffffff', black: '#2d2a32', pink: '#ff7eb6',
};
const swatch = (c, label = '') => `<span class="swatch" style="background:${COLORS[c]}">${label}</span>`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);

const Rooms = {
  wizard: {
    name: "The Wizard's Study", emoji: '🧙', theme: 'wizard',
    intro: 'The wizard locked you in the study! Open the chest, brew the potion and read the rune on the door to escape.',
    build() {
      const animals = [['frogs', '🐸'], ['owls', '🦉'], ['fish', '🐟']].map(([n, e]) => ({ n, e, count: U.range(2, 9) }));
      const order = U.shuffle(animals);
      const ball = U.shuffle(animals.flatMap((a) => Array(a.count).fill(a.e)));
      const syms = ['★', '●', '▲', '■'];
      const potColors = U.shuffle(['red', 'blue', 'green', 'yellow', 'purple', 'orange']).slice(0, 4);
      const potOrder = U.shuffle(syms);
      const word = U.pick(['MAGIC', 'WAND', 'OWL', 'SPELL', 'MOON', 'STAR', 'TOAD', 'BROOM', 'CLOAK', 'POTION']);
      const runes = U.shuffle(['✦', '☾', '♁', '⚘', '♆', '☀', '♣', '♠', '♥', '♦', '✿', '❄', '☂', '⚓', '☘', '♞', '⚑', '✈', '☯', '⌘', '✪', '♫', '☁', '⚡', '♜', '✂']);
      const letters = [...new Set(word)];
      const decoys = U.shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((l) => !letters.includes(l))).slice(0, Math.max(0, 12 - letters.length));
      const table = [...letters, ...decoys].sort();
      const runeOf = Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l, i) => [l, runes[i]]));
      return [
        { id: 'ball', emoji: '🔮', x: 18, y: 30, label: 'Crystal ball', who: 'kid',
          html: `<p>Creatures are swirling inside the crystal ball:</p><div class="ball">${ball.join(' ')}</div>` },
        { id: 'scroll', emoji: '📜', x: 80, y: 26, label: 'Old scroll', who: 'adult',
          html: `<p class="scrollish">“The chest obeys the creatures of the crystal ball. Its code is how many <b>${order[0].n}</b> ${order[0].e}, then how many <b>${order[1].n}</b> ${order[1].e}, then how many <b>${order[2].n}</b> ${order[2].e}.”</p>` },
        { id: 'chest', emoji: '🧰', x: 50, y: 62, label: 'Locked chest', lock: { kind: 'digits', len: 3, answer: order.map((a) => a.count).join('') },
          hint: 'The grown-up knows the ORDER of the creatures. The kid can COUNT them. Each digit is one count.',
          opened: 'The chest creaks open… inside are a potion shelf and a spellbook!' },
        { id: 'shelf', emoji: '🧪', x: 24, y: 70, label: 'Potion shelf', who: 'kid', needs: 'chest',
          html: `<p>Each potion has a symbol scratched under it:</p><div class="potions">${potColors.map((c, i) => `<div>${swatch(c)}<b>${syms[i]}</b><small>${cap(c)}</small></div>`).join('')}</div>` },
        { id: 'book', emoji: '📕', x: 76, y: 68, label: 'Spellbook', who: 'adult', needs: 'chest',
          html: `<p class="scrollish">“To brew the Door-Opening Potion, pour the potions in this order of symbols:”</p><div class="bigsym">${potOrder.join('  ')}</div>` },
        { id: 'cauldron', emoji: '🫕', x: 50, y: 34, label: 'Cauldron', needs: 'chest',
          lock: { kind: 'colors', len: 4, palette: ['red', 'blue', 'green', 'yellow', 'purple', 'orange'], answer: potOrder.map((s) => potColors[syms.indexOf(s)]) },
          hint: 'The grown-up reads the symbol order. The kid says which COLOR each symbol is. Pour the colors in that order.',
          opened: 'POOF! 💨 Purple smoke… a glowing rune appears in the magic mirror!' },
        { id: 'mirror', emoji: '🪞', x: 12, y: 52, label: 'Magic mirror', who: 'kid', needs: 'cauldron',
          html: `<p>Glowing runes appear in the mirror:</p><div class="bigsym runes">${[...word].map((l) => runeOf[l]).join(' ')}</div>` },
        { id: 'runekey', emoji: '📘', x: 88, y: 50, label: 'Rune dictionary', who: 'adult', needs: 'cauldron',
          html: `<p>A page of the rune dictionary:</p><div class="runetable">${table.map((l) => `<span><b>${runeOf[l]}</b> = ${l}</span>`).join('')}</div>` },
        { id: 'door', emoji: '🚪', x: 50, y: 86, label: 'Door', door: true, needs: 'cauldron', lock: { kind: 'letters', answer: word },
          hint: 'The kid describes each rune in the mirror, in order. The grown-up finds it in the dictionary and says the letter.' },
        { id: 'candle', emoji: '🕯️', x: 34, y: 14, label: 'Candle', html: '<p>The candle flickers spookily. Nothing hidden here… probably.</p>' },
        { id: 'cat', emoji: '🐈‍⬛', x: 66, y: 12, label: "Wizard's cat", html: '<p>The cat yawns. “Meow.” It doesn\'t know the code either.</p>' },
      ];
    },
  },
  pirate: {
    name: 'The Pirate Ship', emoji: '🏴‍☠️', theme: 'pirate',
    intro: 'Arr! You\'re locked below deck. Follow the map, open the hatch and claim the captain\'s treasure.',
    build() {
      const arrows = { n: '⬆️', s: '⬇️', e: '➡️', w: '⬅️' };
      const path = Array.from({ length: 5 }, () => U.pick(['n', 's', 'e', 'w']));
      const tricks = [
        { text: 'every ⬆️ really means ⬇️, and every ⬇️ really means ⬆️. Left and right are fine.', f: { n: 's', s: 'n', e: 'e', w: 'w' } },
        { text: 'every ⬅️ really means ➡️, and every ➡️ really means ⬅️. Up and down are fine.', f: { n: 'n', s: 's', e: 'w', w: 'e' } },
        { text: 'the whole map is turned! Every arrow should point a quarter-turn CLOCKWISE (⬆️ becomes ➡️, ➡️ becomes ⬇️, and so on).', f: { n: 'e', e: 's', s: 'w', w: 'n' } },
      ];
      const trick = U.pick(tricks);
      const balls = U.range(3, 8), parrots = U.range(2, 6), plus = U.range(3, 19);
      const word = U.pick(['PEARL', 'CORAL', 'CROWN', 'JEWEL', 'SWORD', 'CHEST', 'GOLD', 'MAP', 'SHIP', 'CAPTAIN']);
      const coinCols = U.shuffle(['gold', 'silver', 'bronze', 'red', 'green', 'blue', 'purple', 'pink']).slice(0, word.length);
      const coins = U.shuffle([...word].map((l, i) => ({ l, c: coinCols[i] })));
      return [
        { id: 'map', emoji: '🗺️', x: 20, y: 28, label: 'Treasure map', who: 'kid',
          html: `<p>The map shows the path from the ⛵ to the ❌:</p><div class="map-path">⛵ ${path.map((p) => arrows[p]).join(' ')} ❌</div>` },
        { id: 'note', emoji: '🦜', x: 78, y: 24, label: 'Tricky parrot', who: 'adult',
          html: `<p class="scrollish">“Squawk! I drew that map and I played a trick: <b>${trick.text}</b> Squawk!”</p>` },
        { id: 'compass', emoji: '🧭', x: 50, y: 56, label: 'Compass lock', lock: { kind: 'arrows', len: 5, answer: path.map((p) => trick.f[p]) },
          hint: 'The kid reads the arrows on the map one at a time. The grown-up fixes each one using the parrot\'s trick.',
          opened: 'Click! The compass spins and a barrel rolls out from the shadows.' },
        { id: 'barrel', emoji: '🛢️', x: 22, y: 66, label: 'Barrel', who: 'kid', needs: 'compass',
          html: `<p>Inside the barrel:</p><div class="ball">${U.shuffle([...Array(balls).fill('⚫'), ...Array(parrots).fill('🦜')]).join(' ')}</div>` },
        { id: 'log', emoji: '📓', x: 80, y: 64, label: "Captain's log", who: 'adult', needs: 'compass',
          html: `<p class="scrollish">“The hatch code: count the cannonballs ⚫ in the barrel, multiply by the number of parrots 🦜, then add <b>${plus}</b>.”</p>` },
        { id: 'hatch', emoji: '🚪', x: 50, y: 30, label: 'Hatch', needs: 'compass', lock: { kind: 'digits', len: String(balls * parrots + plus).length, answer: String(balls * parrots + plus) },
          hint: 'The kid counts the cannonballs and the parrots. The grown-up does the math from the log.',
          opened: 'The hatch swings open… a pile of coins and the captain\'s treasure chest!' },
        { id: 'coins', emoji: '🪙', x: 26, y: 46, label: 'Coins', who: 'kid', needs: 'hatch',
          html: `<p>Each coin has a letter stamped on it:</p><div class="coins">${coins.map((c) => `<div>${swatch(c.c, c.l)}<small>${cap(c.c)}</small></div>`).join('')}</div>` },
        { id: 'rhyme', emoji: '🎶', x: 74, y: 46, label: 'Sea shanty', who: 'adult', needs: 'hatch',
          html: `<p class="scrollish">“Line up the coins, me hearties, in this order:”</p><p class="bigsym small">${coinCols.map(cap).join(' → ')}</p>` },
        { id: 'treasure', emoji: '💰', x: 50, y: 84, label: 'Treasure chest', door: true, needs: 'hatch', lock: { kind: 'letters', answer: word },
          hint: 'The grown-up says each color in order. The kid says which letter is on that coin.' },
        { id: 'anchor', emoji: '⚓', x: 90, y: 86, label: 'Anchor', html: '<p>A heavy anchor. Too heavy to lift, and no secrets on it.</p>' },
        { id: 'rat', emoji: '🐀', x: 8, y: 86, label: 'Ship rat', html: '<p>“Squeak!” The rat stole a cracker and ran off.</p>' },
      ];
    },
  },
  space: {
    name: 'The Space Station', emoji: '🚀', theme: 'space',
    intro: 'Alarm! The station is losing power. Fix the wires, unlock the star keypad and decode the airlock to get home.',
    build(d) {
      const n = d >= 3 ? 5 : 4;
      const wireCols = Array.from({ length: n }, () => U.pick(['red', 'blue', 'yellow', 'white', 'black']));
      const reds = wireCols.map((c, i) => [c, i]).filter(([c]) => c === 'red');
      let cut;
      if (wireCols[0] === 'yellow') cut = 2;
      else if (reds.length === 2) cut = reds[1][1] + 1;
      else if (!wireCols.includes('blue')) cut = n;
      else cut = wireCols.indexOf('blue') + 1;
      const stars = U.shuffle([...Array(16).keys()]).slice(0, 4).sort((a, b) => a - b);
      const digits = Array.from({ length: 16 }, () => U.rand(10));
      const word = U.pick(['ORBIT', 'COMET', 'ROVER', 'LUNAR', 'SOLAR', 'ROCKET', 'PLANET', 'METEOR', 'GALAXY', 'NOVA']);
      const shift = U.range(1, Math.min(4, d + 1));
      const enc = [...word].map((l) => String.fromCharCode(((l.charCodeAt(0) - 65 + shift) % 26) + 65)).join('');
      return [
        { id: 'panel', emoji: '🔌', x: 18, y: 30, label: 'Power panel', who: 'kid',
          html: `<p>The power panel has ${n} wires, numbered from the top:</p><div class="wires">${wireCols.map((c, i) => `<div><b>${i + 1}</b><span class="wire" style="background:${COLORS[c]}"></span><small>${cap(c)}</small></div>`).join('')}</div>` },
        { id: 'manual', emoji: '📗', x: 82, y: 28, label: 'Repair manual', who: 'adult',
          html: `<p><b>Power panel repair.</b> Check these rules in order and follow the FIRST one that is true:</p><ol class="rules">
            <li>If the <b>first</b> wire is yellow, cut wire number 2.</li>
            <li>If there are <b>exactly two</b> red wires, cut the second red wire.</li>
            <li>If there are <b>no</b> blue wires, cut the last wire.</li>
            <li>Otherwise, cut the <b>first blue</b> wire.</li></ol>` },
        { id: 'cutter', emoji: '✂️', x: 50, y: 58, label: 'Wire cutter', lock: { kind: 'choice', options: Array.from({ length: n }, (_, i) => `Wire ${i + 1}`), answer: `Wire ${cut}`, prompt: 'Which wire do you cut?' },
          hint: 'The kid reads the wire colors from top to bottom. The grown-up goes through the rules in order and stops at the first one that matches.',
          opened: 'Bzzzt! ⚡ The lights come back on. A star chart and a keypad legend light up.' },
        { id: 'chart', emoji: '🔭', x: 22, y: 64, label: 'Star chart', who: 'kid', needs: 'cutter',
          html: `<p>The star chart shows four bright stars:</p><div class="grid4">${Array.from({ length: 16 }, (_, i) => `<span>${stars.includes(i) ? '⭐' : '·'}</span>`).join('')}</div>` },
        { id: 'legend', emoji: '🧮', x: 78, y: 64, label: 'Keypad legend', who: 'adult', needs: 'cutter',
          html: `<p>The keypad code uses the numbers under the stars, read like a book (left to right, top to bottom):</p><div class="grid4 nums">${digits.map((x) => `<span>${x}</span>`).join('')}</div>` },
        { id: 'keypad', emoji: '🔢', x: 50, y: 30, label: 'Star keypad', needs: 'cutter', lock: { kind: 'digits', len: 4, answer: stars.map((i) => digits[i]).join('') },
          hint: 'The kid describes where each star is ("top row, third box"). The grown-up reads the number in the same box.',
          opened: 'Beep boop! The airlock screen switches on with a coded message.' },
        { id: 'screen', emoji: '🖥️', x: 14, y: 46, label: 'Airlock screen', who: 'kid', needs: 'keypad',
          html: `<p>The airlock screen says:</p><div class="bigsym mono">${enc}</div>` },
        { id: 'radio', emoji: '📡', x: 86, y: 46, label: 'Message from Earth', who: 'adult', needs: 'keypad',
          html: `<p class="scrollish">“To decode the airlock screen, move every letter <b>${shift}</b> step${shift > 1 ? 's' : ''} BACK in the alphabet. (Before A comes Z.)”</p><div class="abc">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').join(' ')}</div>` },
        { id: 'airlock', emoji: '🚪', x: 50, y: 86, label: 'Airlock', door: true, needs: 'keypad', lock: { kind: 'letters', answer: word },
          hint: 'The kid spells the coded word one letter at a time. The grown-up counts back in the alphabet to find each real letter.' },
        { id: 'robot', emoji: '🤖', x: 34, y: 12, label: 'Helper robot', html: '<p>“BEEP. I AM ON A SNACK BREAK. GOOD LUCK, HUMANS.”</p>' },
        { id: 'plant', emoji: '🪴', x: 66, y: 12, label: 'Space plant', html: '<p>A plant growing in zero gravity. Its leaves float around. Cool, but no clue.</p>' },
      ];
    },
  },
};

Challenges.escape = {
  name: 'Escape Room', emoji: '🔐', kind: 'Puzzles · escape room',
  blurb: 'Each of you has secret cards. Share what you see to crack the locks and escape!',
  coop: 'Some objects are marked 🧒 or 🧑. Only that person may look at them! Describe what you see out loud. The locks need clues from both of you.',
  run(root, ctx) {
    const room = Rooms[ctx.room || U.pick(Object.keys(Rooms))];
    const objs = room.build(ctx.d);
    const open = new Set();
    root._test = { objs };
    let hints = 0, wrong = 0, t0 = performance.now(), timer, finished = false;
    const par = 6 * 60;

    root.innerHTML = `<div class="escape">
      <div class="room ${room.theme}"></div>
      <div class="esc-bar"><span>${room.emoji} <b>${U.esc(room.name)}</b></span><span class="muted esc-help">Tap objects to explore. 🧒/🧑 = secret card for that person only.</span></div>
    </div>`;
    const roomEl = U.$('.room', root);
    const render = () => {
      roomEl.innerHTML = objs.filter((o) => !o.needs || open.has(o.needs)).map((o) => {
        const badge = o.who ? `<i class="who ${o.who}">${o.who === 'kid' ? '🧒' : '🧑'}</i>` : o.lock ? `<i class="who lockb">${open.has(o.id) ? '🔓' : '🔒'}</i>` : '';
        return `<button class="obj ${o.lock ? 'locky' : ''} ${open.has(o.id) ? 'opened' : ''} ${o.needs && !o.seen ? 'new' : ''}" data-id="${o.id}" style="left:${o.x}%;top:${o.y}%">
          <span class="e">${o.emoji}</span>${badge}<span class="l">${U.esc(o.label)}</span></button>`;
      }).join('');
      objs.forEach((o) => { if (!o.needs || open.has(o.needs)) o.seen = true; });
    };
    roomEl.addEventListener('click', (e) => {
      const b = e.target.closest('.obj'); if (!b || finished) return;
      U.sfx.tap();
      const o = objs.find((x) => x.id === b.dataset.id);
      if (o.who) secret(o); else if (o.lock) lock(o); else U.modal(`<h2>${o.emoji} ${U.esc(o.label)}</h2>${o.html}<div class="row end"><button class="btn" data-close>OK</button></div>`);
    });

    async function secret(o) {
      const w = U.who(o.who), other = U.who(o.who === 'kid' ? 'adult' : 'kid');
      const r = await U.modal(`<div class="secret-gate ${o.who}"><div class="big-emoji">${o.who === 'kid' ? '🧒' : '🧑'}</div>
        <h2>For ${U.esc(w.name)}'s eyes only!</h2><p>${U.esc(other.name)}, look away 🙈</p>
        <div class="row center"><button class="btn ghost" data-close="no">Cancel</button><button class="btn big" data-close="yes">I'm ${U.esc(w.name)} — show me</button></div></div>`);
      if (r !== 'yes') return;
      await U.modal(`<div class="secret ${o.who}"><div class="secret-h">${U.tag(o.who)} · ${o.emoji} ${U.esc(o.label)}</div>${o.html}
        <p class="muted small">Tell your partner what you see, but don't show the screen!</p>
        <div class="row end"><button class="btn" data-close>Hide card</button></div></div>`);
    }

    function lock(o) {
      if (open.has(o.id)) { U.toast(o.door ? 'Already open!' : '🔓 Already unlocked.'); return; }
      const L = o.lock;
      let entry = [];
      const body = {
        digits: () => `<input class="lock-in mono" inputmode="numeric" maxlength="${L.len}" placeholder="${'•'.repeat(L.len)}" autocomplete="off"><p class="muted small">${L.len} digits</p>`,
        letters: () => `<input class="lock-in mono" maxlength="${L.answer.length}" placeholder="${'_'.repeat(L.answer.length)}" autocomplete="off" autocapitalize="characters" spellcheck="false"><p class="muted small">${L.answer.length} letters</p>`,
        colors: () => `<div class="slots"></div><div class="palette">${L.palette.map((c) => `<button data-c="${c}" style="background:${COLORS[c]}" aria-label="${c}"></button>`).join('')}</div><button class="btn ghost small" data-clear>Clear</button>`,
        arrows: () => `<div class="slots"></div><div class="palette arrows">${[['n', '⬆️'], ['e', '➡️'], ['s', '⬇️'], ['w', '⬅️']].map(([k, a]) => `<button data-a="${k}">${a}</button>`).join('')}</div><button class="btn ghost small" data-clear>Clear</button>`,
        choice: () => `<p>${L.prompt}</p><div class="choices">${L.options.map((x) => `<button class="btn ghost" data-ch="${x}">${x}</button>`).join('')}</div>`,
      }[L.kind]();
      U.modal(`<div class="lockbox"><h2>${o.emoji} ${U.esc(o.label)} <span class="muted">🔒</span></h2>${body}
        <div class="lock-msg"></div>
        <div class="row"><button class="btn ghost" data-hint>💡 Hint</button><span class="grow"></span><button class="btn ghost" data-close>Close</button>${L.kind === 'choice' ? '' : '<button class="btn good" data-try>Try it!</button>'}</div></div>`, { cls: 'lockmodal' });
      const m = U.modal.last, msg = U.$('.lock-msg', m), inp = U.$('.lock-in', m), slots = U.$('.slots', m);
      if (inp) setTimeout(() => inp.focus(), 60);
      const drawSlots = () => {
        if (!slots) return;
        slots.innerHTML = Array.from({ length: L.len }, (_, i) => {
          const v = entry[i];
          if (L.kind === 'colors') return `<span class="slot" style="background:${v ? COLORS[v] : 'transparent'}"></span>`;
          return `<span class="slot">${v ? { n: '⬆️', e: '➡️', s: '⬇️', w: '⬅️' }[v] : ''}</span>`;
        }).join('');
      };
      drawSlots();
      m.querySelectorAll('[data-c],[data-a]').forEach((b) => b.addEventListener('click', () => { U.sfx.tap(); if (entry.length < L.len) entry.push(b.dataset.c || b.dataset.a); drawSlots(); }));
      U.$('[data-clear]', m)?.addEventListener('click', () => { entry = []; drawSlots(); });
      U.$('[data-hint]', m).addEventListener('click', () => { hints++; msg.innerHTML = `💡 ${U.esc(o.hint)}`; U.sfx.tap(); });
      const attempt = (val) => {
        const clean = (v) => (Array.isArray(v) ? v.join(',') : String(v).toUpperCase().replace(/\s/g, ''));
        const ans = clean(L.answer), given = clean(val);
        if (given === ans) {
          U.sfx.unlock(); open.add(o.id); m.close();
          if (o.door) return win();
          render();
          U.modal(`<h2>🔓 Unlocked!</h2><p>${o.opened}</p><div class="row end"><button class="btn" data-close>Explore ▶</button></div>`);
        } else {
          wrong++; U.sfx.bad(); msg.innerHTML = U.pick(['❌ Nope! The lock rattles.', '❌ Not quite. Compare your clues again.', '❌ Wrong code. Talk it through!']);
          const box = U.$('.lockbox', m); box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
          entry = []; drawSlots(); if (inp) { inp.select(); }
        }
      };
      U.$('[data-try]', m)?.addEventListener('click', () => attempt(inp ? inp.value : entry));
      inp?.addEventListener('keydown', (e) => { if (e.key === 'Enter') attempt(inp.value); });
      m.querySelectorAll('[data-ch]').forEach((b) => b.addEventListener('click', () => attempt(b.dataset.ch)));
    }

    function win() {
      finished = true; clearInterval(timer);
      const time = (performance.now() - t0) / 1000;
      const stars = time <= par && hints <= 1 ? 3 : time <= par * 2 && hints <= 3 ? 2 : 1;
      U.confetti();
      setTimeout(() => ctx.finish({
        stars, score: Math.max(100, Math.round(1000 - time - hints * 60 - wrong * 15)),
        lines: [`Escaped ${room.name} in ${U.fmt(time)}`, `${hints} hint${hints === 1 ? '' : 's'} used · ${wrong} wrong tr${wrong === 1 ? 'y' : 'ies'}`],
      }), 700);
    }

    timer = setInterval(() => ctx.hud(`⏱ ${U.fmt((performance.now() - t0) / 1000)} · 🔓 ${objs.filter((o) => o.lock && open.has(o.id)).length}/${objs.filter((o) => o.lock).length}`), 500);
    ctx.onCleanup(() => { clearInterval(timer); U.$$('.modal-wrap').forEach((x) => x.remove()); });
    render();
    U.modal(`<h2>${room.emoji} ${U.esc(room.name)}</h2><p>${room.intro}</p>
      <ul class="tips"><li>Tap objects to look at them.</li><li>Objects marked <b>🧒</b> are only for ${U.esc(U.who('kid').name)}; <b>🧑</b> only for ${U.esc(U.who('adult').name)}. Don't peek!</li><li>Describe your secret cards out loud. Every lock needs clues from both of you.</li></ul>
      <div class="row end"><button class="btn big" data-close>Let's go! 🔍</button></div>`);
  },
};
