/* Squares mini-game logic: draw numbers, find quarter winners. Pure functions (testable in Node). */
(function (root) {
  'use strict';

  const PERIODS = [
    { q: 1, name: 'Q1', points: 25 },
    { q: 2, name: 'Halftime', points: 25 },
    { q: 3, name: 'Q3', points: 25 },
    { q: 4, name: 'Final', points: 50 },
  ];

  function shuffledDigits(rand) {
    const a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const r = rand || Math.random;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Which of Q1 / Half / Q3 / Final are over, from the scoreboard status. */
  function periodsDone(st) {
    if (!st) return [];
    if (st.state === 'post') return [1, 2, 3, 4];
    if (st.state !== 'in' || !st.period) return [];
    let done = st.period - 1;
    if (/half/i.test(st.detail || '')) done = Math.max(done, 2);
    if (/end of/i.test(st.detail || '')) done = Math.max(done, st.period);
    return [1, 2, 3].filter((q) => q <= done);
  }

  /** Score at the end of a period: running total of the quarter scores (Final = the real final score). */
  function scoreAfter(st, q) {
    if (q === 4) return { away: Number(st.away.score) || 0, home: Number(st.home.score) || 0 };
    const sum = (lines) => (lines || []).slice(0, q).reduce((a, b) => a + b, 0);
    return { away: sum(st.away.lines), home: sum(st.home.lines) };
  }

  /** Index of the winning square for a score (columns = away digit, rows = home digit). */
  function winningIdx(room, score) {
    const col = room.sq_cols.indexOf(score.away % 10);
    const row = room.sq_rows.indexOf(score.home % 10);
    return col < 0 || row < 0 ? null : row * 10 + col;
  }

  /** New period winners to record. squares: { idx: playerId }. */
  function newWins(room, st, squares) {
    if (!room.sq_cols || !room.sq_rows || !st || !st.away || !st.home) return [];
    const have = new Set((room.sq_wins || []).map((w) => w.q));
    const out = [];
    periodsDone(st).forEach((q) => {
      if (have.has(q)) return;
      if (q < 4 && (!st.away.lines || st.away.lines.length < q || !st.home.lines || st.home.lines.length < q)) return;
      const score = scoreAfter(st, q);
      const idx = winningIdx(room, score);
      out.push({ q, away: score.away, home: score.home, idx, player: idx == null ? null : squares[idx] || null });
    });
    return out;
  }

  function pointsFor(q) { const p = PERIODS.find((x) => x.q === q); return p ? p.points : 0; }

  const api = { PERIODS, shuffledDigits, periodsDone, scoreAfter, winningIdx, newWins, pointsFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Squares = api;
})(typeof window !== 'undefined' ? window : globalThis);
