/* Points + leaderboard math. Everyone's device computes scores the same way from picks + results,
   so fixing a result automatically fixes everyone's score. */
(function (root) {
  'use strict';

  const POINTS = {
    type: 10, // run vs pass
    dir: 5, // left / center / right (only if run/pass was right)
    dist: 5, // <5 / 5-9 / 10+ yards (only if run/pass was right)
    drive: 20, // red zone: TD / FG / nothing
  };

  const LABELS = {
    run: 'Run', pass: 'Pass',
    left: 'Left', center: 'Middle', right: 'Right',
    short: '< 5 yds', mid: '5–9 yds', long: '10+ yds',
    td: 'Touchdown', fg: 'Field goal', none: 'No points',
  };

  /** Points for one pick against one result, with a breakdown for display. */
  function scorePick(pick, result) {
    const out = { total: 0, type: null, dir: null, dist: null, drive: null };
    if (!pick || !result || result.void) return out;
    if (result.kind === 'drive') {
      if (pick.drive) {
        out.drive = pick.drive === result.drive;
        if (out.drive) out.total += POINTS.drive;
      }
      return out;
    }
    if (!pick.play_type) return out;
    out.type = pick.play_type === result.play_type;
    if (!out.type) return out;
    out.total += POINTS.type;
    if (pick.dir && result.dir) {
      out.dir = pick.dir === result.dir;
      if (out.dir) out.total += POINTS.dir;
    }
    if (pick.dist && result.dist) {
      out.dist = pick.dist === result.dist;
      if (out.dist) out.total += POINTS.dist;
    }
    return out;
  }

  function key(kind, round) { return kind + ':' + round; }

  /** Leaderboard rows sorted by total, plus per-player history. */
  function leaderboard(players, picks, results, bonus) {
    const resByKey = {};
    results.forEach((r) => { resByKey[key(r.kind, r.round)] = r; });
    const latest = results.filter((r) => r.kind === 'play' && !r.void).sort((a, b) => b.round - a.round)[0];
    const rows = players.map((p) => ({ player: p, total: 0, correct: 0, played: 0, last: null, streak: 0 }));
    const byId = {};
    rows.forEach((r) => { byId[r.player.id] = r; });
    // Squares wins and other bonuses: [{ player, points }]
    (bonus || []).forEach((b) => { const row = byId[b.player]; if (row) { row.total += b.points; row.trophies = (row.trophies || 0) + 1; } });
    const sorted = picks.slice().sort((a, b) => a.round - b.round);
    sorted.forEach((pk) => {
      const row = byId[pk.player];
      const res = resByKey[key(pk.kind, pk.round)];
      if (!row || !res || res.void) return;
      const s = scorePick(pk, res);
      row.total += s.total;
      row.played += 1;
      if (s.total > 0) { row.correct += 1; row.streak += 1; } else row.streak = 0;
      if (latest && pk.kind === 'play' && pk.round === latest.round) row.last = s;
    });
    rows.sort((a, b) => b.total - a.total || b.correct - a.correct || String(a.player.name).localeCompare(b.player.name));
    let rank = 0;
    let prev = null;
    rows.forEach((r, i) => {
      if (prev === null || r.total !== prev) rank = i + 1;
      r.rank = rank;
      prev = r.total;
    });
    return rows;
  }

  const api = { POINTS, LABELS, scorePick, leaderboard };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Scoring = api;
})(typeof window !== 'undefined' ? window : globalThis);
