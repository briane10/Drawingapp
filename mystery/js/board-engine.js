/* Board game rules. Pure: every device replays the same moves and gets the same game.
   Dice rolls and random events come from the game seed + the move's id, so nobody can fake them. */
(function (root) {
  'use strict';
  const D = root.BoardData;

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function shuffle(arr, r) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  const CAT = { s: 'Who', w: 'What', r: 'Where' };
  const ALL_CARDS = [].concat(D.SUSPECTS.map((x) => 's:' + x.id), D.WEAPONS.map((x) => 'w:' + x.id), D.CRIME_ROOMS.map((x) => 'r:' + x.id));
  function card(key) {
    const [c, id] = key.split(':');
    const list = c === 's' ? D.SUSPECTS : c === 'w' ? D.WEAPONS : D.ROOMS;
    return list.find((x) => x.id === id);
  }
  function cardLabel(key) { const c = card(key); return c ? c.emoji + ' ' + (c.full || c.name) : key; }

  const START_MAGS = { easy: 2, normal: 1, hard: 0 };
  const SHOWERS = { easy: 3, normal: 2, hard: 1 }; // how many players reveal a card for each guess
  const TEAMS = [
    { n: 1, name: 'Team Ruby', color: '#e5484d', emoji: '🔴' },
    { n: 2, name: 'Team Sapphire', color: '#3e8ef7', emoji: '🔵' },
    { n: 3, name: 'Team Emerald', color: '#30a46c', emoji: '🟢' },
  ];
  const COLORS = ['#e5484d', '#3e8ef7', '#30a46c', '#f5a524', '#a371f7', '#14b8a6', '#ec4899'];

  function solutionOf(seed) {
    const r = rng((seed ^ 0xa11ce) >>> 0);
    return {
      s: D.SUSPECTS[Math.floor(r() * D.SUSPECTS.length)].id,
      w: D.WEAPONS[Math.floor(r() * D.WEAPONS.length)].id,
      r: D.CRIME_ROOMS[Math.floor(r() * D.CRIME_ROOMS.length)].id,
    };
  }

  function sortMoves(moves) {
    return moves.slice().sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : String(a.id) < String(b.id) ? -1 : 1));
  }

  // Which squares can the current player reach with this roll, with friendly labels for the phone.
  function moveOptions(from, roll) {
    const { dist } = D.bfs(from, roll);
    const opts = [];
    const reach = Object.keys(dist).filter((k) => k !== from && dist[k] >= 1 && dist[k] <= roll);
    reach.filter((k) => !D.NODES[k].hall).forEach((k) => {
      const room = D.ROOMS.find((r) => 'r:' + r.id === k);
      opts.push({ to: k, kind: room.tower ? 'tower' : 'room', label: room.name, emoji: room.emoji, steps: dist[k] });
    });
    reach.filter((k) => D.NODES[k].special).forEach((k) => {
      const sp = D.SPECIAL_INFO[D.NODES[k].special];
      opts.push({ to: k, kind: 'special', label: sp.name, emoji: sp.emoji, steps: dist[k] });
    });
    // Head toward rooms that are too far to reach this turn.
    const seen = new Set(opts.map((o) => o.to));
    D.ROOMS.forEach((room) => {
      const target = 'r:' + room.id;
      if (target === from || dist[target] != null && dist[target] <= roll) return;
      let best = null;
      reach.filter((k) => D.NODES[k].hall).forEach((k) => {
        const d = D.distBetween(k, target);
        if (!best || d < best.d || (d === best.d && dist[k] > dist[best.k])) best = { k, d };
      });
      if (best && !seen.has(best.k)) {
        seen.add(best.k);
        opts.push({ to: best.k, kind: 'toward', label: 'Toward the ' + room.name, emoji: '➡️', toward: room.id, more: best.d, steps: dist[best.k] });
      } else if (best) {
        const o = opts.find((x) => x.to === best.k);
        if (o && o.kind === 'toward' && !o.also) o.also = room.name;
      }
    });
    const order = { tower: 0, room: 1, special: 2, toward: 3 };
    return opts.sort((a, b) => order[a.kind] - order[b.kind] || a.steps - b.steps);
  }

  function replay(room, moves) {
    const seed = (room.seed || 0) >>> 0;
    const actors = (room.actors || []).slice();
    const n = actors.length;
    const diff = room.difficulty || 'normal';
    const sol = solutionOf(seed);
    const solKeys = ['s:' + sol.s, 'w:' + sol.w, 'r:' + sol.r];
    const r = rng((seed ^ 0x51ed27) >>> 0);
    const deck = shuffle(ALL_CARDS.filter((c) => !solKeys.includes(c)), r);
    const per = n ? Math.floor(deck.length / n) : 0;
    const hands = {};
    actors.forEach((a, i) => { hands[a] = deck.slice(i * per, (i + 1) * per); });
    const evidence = deck.slice(per * n);
    const pawns = {}; // suspects + weapons sitting in rooms on the board
    D.SUSPECTS.concat(D.WEAPONS).forEach((x) => { pawns[x.id] = D.CRIME_ROOMS[Math.floor(r() * D.CRIME_ROOMS.length)].id; });

    const st = {
      seed, sol, hands, evidence: evidence.slice(), evidenceStart: evidence.slice(), actors, pawns,
      pos: {}, out: {}, mags: {}, known: {}, guesses: {}, scene: {}, turn: 0, cur: 0, stage: n ? 'start' : 'over', roll: null,
      winner: null, over: !n, log: [], last: null, lastByActor: {},
    };
    actors.forEach((a) => {
      st.pos[a] = 'r:tower';
      st.mags[a] = START_MAGS[diff] == null ? 1 : START_MAGS[diff];
      st.known[a] = {};
      hands[a].forEach((c) => { st.known[a][c] = { by: 'own' }; });
      st.guesses[a] = 0;
    });
    const curActor = () => actors[st.cur];
    const log = (e) => { e.turn = st.turn; st.log.push(e); st.last = e; if (e.actor) st.lastByActor[e.actor] = e; };

    function endTurn() {
      st.roll = null;
      st.turn++;
      for (let i = 1; i <= n; i++) {
        const nx = (st.cur + i) % n;
        if (!st.out[actors[nx]]) { st.cur = nx; st.stage = 'start'; return; }
      }
      st.over = true;
      st.stage = 'over';
    }
    function learn(a, key, by) { if (!st.known[a][key]) st.known[a][key] = { by, turn: st.turn }; }
    function randomUnknown(a, rr, pool) {
      const opts = (pool || ALL_CARDS.filter((c) => !solKeys.includes(c))).filter((c) => !st.known[a][c]);
      return opts.length ? opts[Math.floor(rr() * opts.length)] : null;
    }
    // Walking into a room: Pembrook says whether it's the crime scene (not on Hard).
    function search(a, roomId) {
      if (diff === 'hard' || roomId === 'tower') return;
      if (roomId === sol.r) { if (!st.scene[a]) { st.scene[a] = roomId; log({ t: 'search', actor: a, room: roomId, crime: true }); } }
      else if (!st.known[a]['r:' + roomId]) { learn(a, 'r:' + roomId, 'search'); log({ t: 'search', actor: a, room: roomId, crime: false }); }
    }
    function land(a, node, rr) {
      const N = D.NODES[node];
      if (!N.hall) { search(a, N.room); st.stage = N.room === 'tower' ? 'tower' : 'guess'; return; }
      if (N.special === 'mag') { st.mags[a]++; log({ t: 'special', kind: 'mag', actor: a }); }
      else if (N.special === 'clue') {
        let got = null;
        let from = 'evidence';
        if (st.evidence.length) {
          const unk = st.evidence.filter((c) => !st.known[a][c]);
          got = unk.length ? unk[0] : null;
        }
        if (!got) {
          const others = [].concat(...actors.filter((x) => x !== a).map((x) => hands[x]));
          got = randomUnknown(a, rr, others);
          from = 'clue';
        }
        if (got) { learn(a, got, 'clue'); log({ t: 'special', kind: 'clue', actor: a, card: got, from }); }
        else { st.mags[a]++; log({ t: 'special', kind: 'clue', actor: a, card: null }); }
      } else if (N.special === 'lights') {
        const moved = {};
        actors.forEach((x) => { const rm = D.CRIME_ROOMS[Math.floor(rr() * D.CRIME_ROOMS.length)].id; st.pos[x] = 'r:' + rm; moved[x] = rm; });
        log({ t: 'special', kind: 'lights', actor: a, moved });
        actors.forEach((x) => search(x, moved[x]));
      }
      endTurn();
    }

    sortMoves(moves.filter((m) => (m.game || 1) === (room.game || 1))).forEach((m) => {
      if (st.over) return;
      const t = m.target || {};
      const a = curActor();
      if (t.a === 'skipturn') { if (m.actor === a && t.turn === st.turn) { log({ t: 'skipturn', actor: a }); endTurn(); } return; }
      if (m.actor !== a || (t.turn != null && t.turn !== st.turn)) return;
      const rr = rng((seed ^ hash(String(m.id))) >>> 0);

      if (t.a === 'hint') {
        if (st.mags[a] < 1 || st.stage === 'over') return;
        const c = randomUnknown(a, rr);
        if (!c) return;
        st.mags[a]--;
        learn(a, c, 'hint');
        log({ t: 'hint', actor: a, card: c });
        return;
      }
      if (st.stage === 'start') {
        if (t.a === 'roll') {
          const d1 = 1 + Math.floor(rr() * 6);
          const d2 = 1 + Math.floor(rr() * 6);
          st.roll = d1 + d2;
          st.dice = [d1, d2];
          st.stage = 'move';
          log({ t: 'roll', actor: a, value: st.roll, dice: [d1, d2], by: m.player });
        } else if (t.a === 'passage') {
          const here = D.NODES[st.pos[a]];
          const rm = here && D.ROOMS.find((x) => x.id === here.room);
          if (!rm || !rm.passage) return;
          const from = st.pos[a];
          st.pos[a] = 'r:' + rm.passage;
          log({ t: 'passage', actor: a, from, to: st.pos[a], by: m.player });
          search(a, rm.passage);
          st.stage = 'guess';
        } else if (t.a === 'stay') {
          const here = D.NODES[st.pos[a]];
          if (!here || here.hall || here.room === 'tower') return;
          log({ t: 'stay', actor: a, room: here.room, by: m.player });
          st.stage = 'guess';
        }
      } else if (st.stage === 'move') {
        if (t.a !== 'move') return;
        const ok = moveOptions(st.pos[a], st.roll).some((o) => o.to === t.to) || (D.bfs(st.pos[a], st.roll).dist[t.to] || 0) >= 1;
        if (!ok || !D.NODES[t.to]) return;
        const from = st.pos[a];
        st.pos[a] = t.to;
        log({ t: 'move', actor: a, from, to: t.to, by: m.player });
        land(a, t.to, rr);
      } else if (st.stage === 'guess') {
        if (t.a === 'skip') { log({ t: 'skip', actor: a }); endTurn(); return; }
        if (t.a !== 'guess' || !card('s:' + t.who) || !card('w:' + t.what)) return;
        const where = D.NODES[st.pos[a]].room;
        const keys = ['s:' + t.who, 'w:' + t.what, 'r:' + where];
        st.pawns[t.who] = where;
        st.pawns[t.what] = where;
        st.guesses[a]++;
        const idx = actors.indexOf(a);
        const limit = SHOWERS[diff] || 2;
        const shows = [];
        const pickFrom = (have) => {
          const notYet = have.filter((k) => !shows.some((x) => x.card === k));
          const fresh = notYet.filter((k) => !st.known[a][k]);
          const pool = fresh.length ? fresh : notYet;
          return pool.length ? pool[Math.floor(rr() * pool.length)] : null;
        };
        for (let i = 1; i < n && shows.length < limit; i++) {
          const other = actors[(idx + i) % n];
          const c = pickFrom(keys.filter((k) => hands[other].includes(k)));
          if (c) shows.push({ by: other, card: c });
        }
        if (shows.length < limit) {
          const c = pickFrom(keys.filter((k) => st.evidenceStart.includes(k)));
          if (c) shows.push({ by: 'evidence', card: c });
        }
        shows.forEach((x) => learn(a, x.card, x.by));
        log({ t: 'guess', actor: a, who: t.who, what: t.what, where, shows, card: shows.length ? shows[0].card : null, own: keys.filter((k) => hands[a].includes(k)), by: m.player });
        endTurn();
      } else if (st.stage === 'tower') {
        if (t.a === 'skip') { log({ t: 'skip', actor: a }); endTurn(); return; }
        if (t.a !== 'accuse' || !card('s:' + t.who) || !card('w:' + t.what) || !card('r:' + t.where)) return;
        const right = { s: t.who === sol.s, w: t.what === sol.w, r: t.where === sol.r };
        const ok = right.s && right.w && right.r;
        const e = { t: 'accuse', actor: a, who: t.who, what: t.what, where: t.where, ok, right, by: m.player };
        if (ok) { st.winner = a; st.over = true; st.stage = 'over'; log(e); return; }
        if (diff === 'easy') {
          const wrong = !right.s ? 's:' + t.who : !right.w ? 'w:' + t.what : 'r:' + t.where;
          learn(a, wrong, 'accuse');
          e.wrong = wrong;
        } else st.out[a] = true;
        log(e);
        endTurn();
      }
    });
    st.current = st.over ? null : curActor();
    return st;
  }

  root.BoardEngine = { SHOWERS, replay, moveOptions, solutionOf, card, cardLabel, ALL_CARDS, CAT, TEAMS, COLORS, START_MAGS, rng, hash };
})(typeof window !== 'undefined' ? window : globalThis);
