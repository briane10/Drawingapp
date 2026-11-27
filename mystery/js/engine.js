/* Game rules. Pure functions: every device replays the same list of moves and gets the same result,
   so nothing secret has to be stored in the database. */
(function (root) {
  'use strict';

  const CATS = ['suspect', 'method', 'room', 'motive'];
  const CAT_LIST = { suspect: 'suspects', method: 'methods', room: 'rooms', motive: 'motives' };
  const CAT_LABEL = { suspect: 'Who', method: 'How', room: 'Where', motive: 'Why' };
  const LIMITS = { team: { search: 3, question: 2, theory: 1 }, solo: { search: 2, question: 1, theory: 1 } };
  const ROUNDS = { easy: 7, normal: 6, hard: 5 };
  const POINTS = { suspect: 40, method: 20, room: 20, motive: 20, earlyPerRound: 10, objection: 15 };
  const WRONG_OBJECTION = { easy: 0, normal: -5, hard: -10 };
  const TEAMS = [
    { n: 1, name: 'Team Ruby', color: '#e5484d', emoji: '🔴' },
    { n: 2, name: 'Team Sapphire', color: '#3e8ef7', emoji: '🔵' },
    { n: 3, name: 'Team Emerald', color: '#30a46c', emoji: '🟢' },
  ];

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, r) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function pick(text, ending) {
    if (text == null) return null;
    if (typeof text === 'string') return text;
    if (Object.prototype.hasOwnProperty.call(text, ending)) return text[ending];
    return Object.prototype.hasOwnProperty.call(text, '_') ? text._ : null;
  }
  function endingOf(C, room) {
    if (room && C.endings[room.ending]) return room.ending;
    const keys = Object.keys(C.endings).sort();
    return keys[((room && room.seed) >>> 0) % keys.length];
  }
  function totalRounds(room) { return ROUNDS[room.difficulty] || 6; }

  // ---- lookups ----
  function item(C, cat, id) { return (C[CAT_LIST[cat]] || []).find((x) => x.id === id) || null; }
  function cardName(C, key) {
    const [cat, id] = key.split(':');
    const it = item(C, cat, id);
    return it ? (it.emoji ? it.emoji + ' ' : '') + it.name : key;
  }
  function person(C, id) { return C.suspects.find((s) => s.id === id) || C.witnesses.find((s) => s.id === id) || null; }
  function clue(C, id) { return C.clues.find((c) => c.id === id) || null; }
  function statementById(C, id) {
    for (const who of Object.keys(C.statements)) {
      const s = C.statements[who].find((x) => x.id === id);
      if (s) return Object.assign({ who }, s);
    }
    return null;
  }
  const STATEMENT_INDEX = new WeakMap();
  function statementIndex(C, id) {
    if (!STATEMENT_INDEX.has(C)) {
      const m = {};
      let i = 0;
      Object.keys(C.statements).forEach((who) => C.statements[who].forEach((s) => { m[s.id] = i++; }));
      STATEMENT_INDEX.set(C, m);
    }
    return STATEMENT_INDEX.get(C)[id];
  }
  function lieOf(st, ending) {
    if (!st || !st.lie) return null;
    return st.lie[ending] || st.lie['*'] || null;
  }
  function solution(C, ending) {
    const E = C.endings[ending];
    return { suspect: E.culprit, method: E.method, room: E.room, motive: E.motive };
  }

  // ---- the deal: Case Cards are things that are definitely NOT the answer ----
  function deal(C, ending, seed, difficulty, actors) {
    const E = C.endings[ending];
    const sol = solution(C, ending);
    const r = rng((seed ^ 0x9e3779b9) >>> 0);
    const never = new Set(['suspect:' + E.framed, 'method:' + E.staged]);
    const holdBack = difficulty === 'hard' ? { suspect: 1, method: 1, room: 2, motive: 1 }
      : difficulty === 'easy' ? { suspect: 0, method: 0, room: 0, motive: 0 }
        : { suspect: 1, method: 0, room: 1, motive: 1 };
    let cards = [];
    CATS.forEach((cat) => {
      const pool = shuffle(C[CAT_LIST[cat]].map((x) => cat + ':' + x.id).filter((k) => k !== cat + ':' + sol[cat] && !never.has(k)), r);
      cards = cards.concat(pool.slice(holdBack[cat]));
    });
    cards = shuffle(cards, r);
    const hands = {};
    actors.forEach((a) => { hands[a] = []; });
    if (actors.length) cards.forEach((c, i) => hands[actors[i % actors.length]].push(c));
    // keep each hand in a readable order
    const order = (k) => CATS.indexOf(k.split(':')[0]);
    Object.keys(hands).forEach((a) => hands[a].sort((x, y) => order(x) - order(y)));
    return hands;
  }

  // ---- replay every move into each detective's notebook ----
  function sortMoves(moves) {
    return moves.slice().sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : String(a.id) < String(b.id) ? -1 : 1));
  }

  function replay(C, room, moves) {
    const ending = endingOf(C, room);
    const actors = (room.actors || []).slice();
    const hands = deal(C, ending, room.seed || 0, room.difficulty, actors);
    const N = totalRounds(room);
    const state = {};
    actors.forEach((a) => {
      state[a] = {
        actor: a, items: [], clues: new Set(), heard: new Set(), cards: new Set(hands[a]), known: new Set(hands[a]),
        objected: {}, broken: new Set(), objPts: 0, objOk: 0, objBad: 0, accuse: null, used: {},
      };
    });
    const events = [];
    const caught = {}; // suspect id -> number of lies caught (by anyone)
    const game = room.game || 1;

    sortMoves(moves.filter((m) => (m.game || 1) === game)).forEach((m) => {
      const s = state[m.actor];
      if (!s) return;
      const t = m.target || {};
      const ukey = m.round + ':' + m.kind;
      if (['search', 'question', 'theory'].includes(m.kind)) {
        s.used[ukey] = (s.used[ukey] || 0) + 1;
      }
      const base = { at: m.created_at, round: m.round, by: m.player, move: m.id };

      if (m.kind === 'search') {
        const c = C.clues.find((x) => x.room === t.room && (x.unlock || 1) <= m.round && pick(x.text, ending) != null && !s.clues.has(x.id));
        if (c) { s.clues.add(c.id); s.items.push(Object.assign({ t: 'clue', id: c.id, room: t.room }, base)); }
        else s.items.push(Object.assign({ t: 'empty', room: t.room, later: C.clues.some((x) => x.room === t.room && (x.unlock || 1) > m.round && pick(x.text, ending) != null && !s.clues.has(x.id)) }, base));
        events.push({ t: 'search', actor: m.actor, room: t.room, round: m.round, at: m.created_at });
      } else if (m.kind === 'question') {
        const list = C.statements[t.who] || [];
        const st = list.find((x) => (x.unlock || 1) <= m.round && pick(x.text, ending) != null && !s.heard.has(x.id));
        if (st) { s.heard.add(st.id); s.items.push(Object.assign({ t: 'stmt', id: st.id, who: t.who }, base)); }
        else s.items.push(Object.assign({ t: 'silent', who: t.who, later: list.some((x) => (x.unlock || 1) > m.round && pick(x.text, ending) != null && !s.heard.has(x.id)) }, base));
        events.push({ t: 'question', actor: m.actor, who: t.who, round: m.round, at: m.created_at });
      } else if (m.kind === 'theory') {
        const guess = CATS.map((cat) => cat + ':' + t[cat]).filter((k) => !k.endsWith(':undefined'));
        const idx = actors.indexOf(m.actor);
        let shower = null;
        let card = null;
        for (let i = 1; i < actors.length; i++) {
          const other = actors[(idx + i) % actors.length];
          const have = guess.filter((k) => state[other].cards.has(k));
          if (have.length) {
            shower = other;
            // The shower "chooses" a card; keep it fair and repeatable.
            card = have[Math.floor(rng(((room.seed || 0) ^ hash(String(m.id))) >>> 0)() * have.length)];
            break;
          }
        }
        if (card) {
          s.known.add(card);
          state[shower].items.push(Object.assign({ t: 'showed', to: m.actor, card }, base));
        }
        s.items.push(Object.assign({ t: 'theory', guess: t, shower, card }, base));
        events.push({ t: 'theory', actor: m.actor, shower, round: m.round, at: m.created_at });
      } else if (m.kind === 'object') {
        if (s.objected[t.stmt] || !s.heard.has(t.stmt) || !s.clues.has(t.clue)) return;
        const st = statementById(C, t.stmt);
        const lie = lieOf(st, ending);
        const ok = !!(lie && lie.by.includes(t.clue));
        s.objected[t.stmt] = ok ? 'ok' : 'bad';
        if (ok) { s.broken.add(t.stmt); s.objPts += POINTS.objection; s.objOk++; caught[st.who] = (caught[st.who] || 0) + 1; }
        else { s.objPts += WRONG_OBJECTION[room.difficulty] || 0; s.objBad++; }
        s.items.push(Object.assign({ t: 'objection', stmt: t.stmt, clue: t.clue, ok, who: st.who }, base));
        events.push({ t: 'objection', actor: m.actor, who: st.who, ok, at: m.created_at });
      } else if (m.kind === 'share') {
        const to = state[t.to];
        if (!to || t.to === m.actor) return;
        if (t.clue && s.clues.has(t.clue)) {
          if (!to.clues.has(t.clue)) to.clues.add(t.clue);
          to.items.push(Object.assign({ t: 'shared', from: m.actor, clue: t.clue }, base));
          s.items.push(Object.assign({ t: 'gave', to: t.to, clue: t.clue }, base));
        } else if (t.card && s.known.has(t.card)) {
          to.known.add(t.card);
          to.items.push(Object.assign({ t: 'shared', from: m.actor, card: t.card }, base));
          s.items.push(Object.assign({ t: 'gave', to: t.to, card: t.card }, base));
        } else return;
        events.push({ t: 'share', actor: m.actor, to: t.to, at: m.created_at });
      } else if (m.kind === 'accuse') {
        if (s.accuse) return;
        s.accuse = { suspect: t.suspect, method: t.method, room: t.room, motive: t.motive, atRound: Math.min(t.atRound || N, N), by: m.player, at: m.created_at };
        events.push({ t: 'accuse', actor: m.actor, at: m.created_at });
      }
    });

    return { ending, hands, state, events, caught, actors, rounds: N };
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function actionsLeft(room, s, round) {
    const lim = LIMITS[room.mode] || LIMITS.solo;
    const out = {};
    Object.keys(lim).forEach((k) => { out[k] = Math.max(0, lim[k] - ((s && s.used[round + ':' + k]) || 0)); });
    return out;
  }

  function score(C, R, actor) {
    const s = R.state[actor];
    const sol = solution(C, R.ending);
    const out = { parts: {}, early: 0, objections: s ? s.objPts : 0, total: 0, accused: !!(s && s.accuse) };
    if (s && s.accuse) {
      CATS.forEach((cat) => { out.parts[cat] = s.accuse[cat] === sol[cat] ? POINTS[cat] : 0; });
      if (out.parts.suspect) out.early = POINTS.earlyPerRound * Math.max(0, R.rounds - s.accuse.atRound);
    }
    out.total = Object.values(out.parts).reduce((a, b) => a + b, 0) + out.early + out.objections;
    return out;
  }

  function rank(total) {
    if (total >= 150) return { title: 'Legendary Detective', emoji: '🏆' };
    if (total >= 110) return { title: 'Master Sleuth', emoji: '🕵️' };
    if (total >= 80) return { title: 'Sharp Investigator', emoji: '🔎' };
    if (total >= 40) return { title: 'Junior Detective', emoji: '📒' };
    return { title: 'Confused Bystander', emoji: '🤷' };
  }

  function clock(room, round) {
    const N = totalRounds(room);
    const mins = 24 * 60 - (N - round + 1) * 15; // last round starts 11:45 PM
    const h = Math.floor(mins / 60) % 12 || 12;
    const m = String(mins % 60).padStart(2, '0');
    return h + ':' + m + ' PM';
  }
  function development(C, room, round) {
    const order = C.developmentOrder[totalRounds(room)] || C.developmentOrder[6];
    return C.developments[order[round - 1]] || '';
  }

  // Detectives = teams (team mode) or players (individual mode), in a fixed order.
  function actorsFor(room, players) {
    const ps = Object.values(players).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    if (room.mode === 'team') {
      return TEAMS.slice(0, room.teams || 2).filter((t) => ps.some((p) => (p.team || 1) === t.n)).map((t) => 't' + t.n);
    }
    return ps.map((p) => p.id);
  }
  function actorOf(room, player) {
    if (!player) return null;
    return room.mode === 'team' ? 't' + (player.team || 1) : player.id;
  }

  root.Engine = {
    CATS, CAT_LIST, CAT_LABEL, LIMITS, ROUNDS, POINTS, WRONG_OBJECTION, TEAMS,
    pick, endingOf, totalRounds, item, cardName, person, clue, statementById, statementIndex, lieOf, solution,
    deal, replay, actionsLeft, score, rank, clock, development, actorsFor, actorOf, rng,
  };
})(typeof window !== 'undefined' ? window : globalThis);
