/* ESPN feed reader + the "engine" that turns live plays into round results.
   Everything here is plain functions so it can be tested in Node as well as run in the browser. */
(function (root) {
  'use strict';

  const BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/';
  const LEAGUES = { nfl: 'NFL', 'college-football': 'College' };

  // ---------- fetching ----------
  async function getJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('ESPN ' + res.status);
    return res.json();
  }
  function ymd(d) {
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }

  /** Games for one day (local date). College gets the FBS group so the list stays manageable. */
  async function listGames(league, date) {
    let url = BASE + league + '/scoreboard?dates=' + ymd(date || new Date());
    if (league === 'college-football') url += '&groups=80&limit=300';
    const data = await getJSON(url);
    return (data.events || []).map((e) => statusFromEvent(e, league)).sort((a, b) => {
      const rank = { in: 0, pre: 1, post: 2 };
      return (rank[a.state] - rank[b.state]) || (a.date < b.date ? -1 : 1);
    });
  }

  async function getScoreboardEvent(league, eventId, date) {
    // The scoreboard has live down/distance + red zone flags; try today and yesterday (late games).
    const today = date || new Date();
    for (const d of [today, new Date(today.getTime() - 864e5)]) {
      let url = BASE + league + '/scoreboard?dates=' + ymd(d);
      if (league === 'college-football') url += '&groups=80&limit=300';
      const data = await getJSON(url);
      const ev = (data.events || []).find((e) => String(e.id) === String(eventId));
      if (ev) return ev;
    }
    return null;
  }

  async function getSummary(league, eventId) {
    return getJSON(BASE + league + '/summary?event=' + encodeURIComponent(eventId));
  }

  function statusFromEvent(e, league) {
    const c = (e.competitions || [])[0] || {};
    const teams = {};
    const byId = {};
    (c.competitors || []).forEach((t) => {
      const info = {
        id: String(t.team && t.team.id),
        abbr: (t.team && t.team.abbreviation) || '?',
        name: (t.team && (t.team.shortDisplayName || t.team.name)) || '',
        logo: (t.team && t.team.logo) || '',
        score: t.score != null ? String(t.score) : '',
        color: t.team && t.team.color ? '#' + t.team.color : '',
        alt: t.team && t.team.alternateColor ? '#' + t.team.alternateColor : '',
      };
      teams[t.homeAway] = info;
      byId[info.id] = info;
    });
    const stAll = e.status || c.status || {};
    const st = stAll.type || {};
    const sit = c.situation || {};
    const poss = sit.possession ? byId[String(sit.possession)] : null;
    const homeId = teams.home ? teams.home.id : null;
    return {
      period: stAll.period || null,
      clock: stAll.displayClock || '',
      // Field position from the scoreboard (it updates faster than the play-by-play).
      los: typeof sit.yardLine === 'number' && sit.possession ? sit.yardLine : null,
      possHome: sit.possession && homeId ? String(sit.possession) === homeId : null,
      togo: typeof sit.distance === 'number' && sit.down > 0 ? sit.distance : null,
      downShort: sit.down > 0 ? sit.shortDownDistanceText || '' : '',
      ballOn: sit.possession ? sit.possessionText || '' : '',
      id: String(e.id),
      league,
      date: e.date,
      name: e.shortName || e.name,
      state: st.state || 'pre', // pre | in | post
      detail: st.shortDetail || st.detail || '',
      away: teams.away || { abbr: '?', score: '' },
      home: teams.home || { abbr: '?', score: '' },
      down: sit.downDistanceText || sit.shortDownDistanceText || '',
      poss: poss ? poss.abbr : '',
      redZone: !!sit.isRedZone,
      lastPlay: sit.lastPlay && sit.lastPlay.text ? sit.lastPlay.text.replace(/\s+/g, ' ').trim() : '',
      lastPlayId: sit.lastPlay && sit.lastPlay.id ? String(sit.lastPlay.id) : '',
      lastPlayType: sit.lastPlay && sit.lastPlay.type ? sit.lastPlay.type.text || '' : '',
    };
  }

  /** Shorter play text for small screens: drop formation tags, jersey numbers and tackler names. */
  function cleanText(t) {
    return String(t || '')
      .replace(/\s+/g, ' ')
      .replace(/^\s*\(\d{1,2}:\d{2}\)\s*/, '')
      .replace(/^\s*\([^)]*\)\s*/, '')
      .replace(/^(No Huddle-)?Shotgun\s+/i, '')
      .replace(/#\d+\s+/g, '')
      .replace(/\s*\([^)]*\)\.?$/, '')
      .replace(/\s*\[[^\]]*\]/g, '')
      .trim();
  }

  // ---------- play parsing ----------
  const IGNORE_TYPES = /timeout|end period|end of|two-minute|kickoff|coin toss|official|extra point|two point|two-point|conversion/i;
  const VOID_TYPES = /punt|field goal|blocked|safety/i;

  function dirWord(w) {
    w = (w || '').toLowerCase();
    if (w === 'middle') return 'center';
    return w === 'left' || w === 'right' ? w : null;
  }

  function parseYards(text) {
    const t = text;
    if (/\bincomplete\b/i.test(t) || /\bINTERCEPTED\b/i.test(t)) return 0;
    let m = t.match(/sacked[^.]*?(?:for (?:a )?loss of|for) (-?\d+) yards?/i);
    if (m) return -Math.abs(parseInt(m[1], 10));
    m = t.match(/for (-?\d+) yards? (gain|loss)?/i) || t.match(/for (-?\d+) yards?/i);
    if (m) {
      const n = parseInt(m[1], 10);
      return m[2] && m[2].toLowerCase() === 'loss' ? -Math.abs(n) : n;
    }
    if (/for no gain/i.test(t)) return 0;
    return null;
  }

  /**
   * Classify one ESPN play.
   * kind: 'ignore' (no snap: timeouts, kickoffs...), 'void' (a snap that isn't a run/pass we can score),
   *       'play' (run or pass with playType/dir/dist/yards).
   */
  function classifyPlay(p) {
    const typeText = (p.type && p.type.text) || '';
    const raw = String(p.text || '');
    const base = {
      seq: parseInt(p.sequenceNumber, 10) || 0,
      id: String(p.id || ''),
      wall: p.wallclock ? Date.parse(p.wallclock) : null,
      text: raw.replace(/\s+/g, ' ').trim(),
      typeText,
      // Field position: ESPN measures yard lines 0-100 from the HOME team's goal line.
      yl0: p.start && typeof p.start.yardLine === 'number' ? p.start.yardLine : null,
      off: p.start && p.start.team ? String(p.start.team.id) : null,
    };
    if (!raw && !typeText) return Object.assign(base, { kind: 'ignore' });
    if (IGNORE_TYPES.test(typeText) || /two-point conversion attempt|end of (game|half|quarter)/i.test(raw) && !/\b(pass|rush)\b/i.test(typeText)) {
      return Object.assign(base, { kind: 'ignore' });
    }
    // Pre-snap fouls (false start, delay...) have no snap at all. Flags thrown DURING a play still count
    // as the run/pass that was called, so those fall through and get parsed below.
    if (/^\s*(\(\d+:\d+\)\s*)?(\([^)]*\)\s*)?(PENALTY|Penalty on)/.test(raw)) {
      return Object.assign(base, { kind: 'void', why: 'Penalty before the snap' });
    }
    if (VOID_TYPES.test(typeText)) return Object.assign(base, { kind: 'void', why: typeText });
    if (/\bkneels?\b|\bspiked?\b|\(Aborted\)|Aborted/i.test(raw)) return Object.assign(base, { kind: 'void', why: 'Kneel / spike / fumbled snap' });

    // Only look at the part of the text describing the snap itself.
    const main = raw.split(/PENALTY|Penalty on|FUMBLES|INTERCEPTED|TOUCHDOWN|TWO-POINT/)[0];
    let playType = null;
    let dir = null;
    let m;
    if (/\bsacked\b/i.test(main) || /\bsack\b/i.test(typeText)) {
      playType = 'pass';
    } else if (/\bscrambles?\b/i.test(main)) {
      playType = 'pass'; // scrambles count as passes (the play was called as a pass)
    } else if ((m = main.match(/\bpass(?:es)?\b(?: complete| incomplete)?\s+(?:short|deep)\s+(left|middle|right)/i))) {
      playType = 'pass';
      dir = dirWord(m[1]);
    } else if (/\bpass(?:es)?\b/i.test(main) || /pass|interception/i.test(typeText)) {
      playType = 'pass';
    } else if ((m = main.match(/\b(left|right)\s+(end|tackle)\b/i))) {
      playType = 'run';
      dir = dirWord(m[1]);
    } else if (/\b(left|right)\s+guard\b|\bup the middle\b/i.test(main)) {
      playType = 'run';
      dir = 'center';
    } else if ((m = main.match(/\b(?:rush|run)(?:es)?\s+(left|right|middle)\b/i))) {
      playType = 'run';
      dir = dirWord(m[1]);
    } else if (/\brush|rushing\b/i.test(typeText) || /\b(rush|run)\b/i.test(main)) {
      playType = 'run';
    }
    if (!playType) return Object.assign(base, { kind: 'void', why: 'Not a run or pass' });

    let yards = parseYards(main);
    if (yards == null) yards = parseYards(raw);
    if (yards == null && !/penalty|fumble/i.test(typeText)) yards = typeof p.statYardage === 'number' ? p.statYardage : null;
    if (yards == null) yards = 0;
    const depthM = main.match(/\b(short|deep)\b/i);
    const fx = {
      depth: depthM ? depthM[1].toLowerCase() : null,
      inc: /\bincomplete\b/i.test(main),
      int: /INTERCEPTED|intercepted by/i.test(raw),
      sack: /\bsacked\b/i.test(main),
      td: /TOUCHDOWN/i.test(raw) && !/INTERCEPTED|FUMBLES/i.test(raw),
      fum: /FUMBLES/i.test(raw) && !!p.isTurnover,
    };
    return Object.assign(base, { kind: 'play', playType, dir, yards, dist: distBucket(yards), fx });
  }

  function distBucket(y) {
    if (y >= 10) return 'long';
    if (y >= 5) return 'mid';
    return 'short';
  }

  /** Flatten a summary into ordered plays + drive info + current drive. */
  function readFeed(summary, scoreEvent, league) {
    const drives = (summary && summary.drives) || {};
    const list = (drives.previous || []).slice();
    if (drives.current && !list.find((d) => d.id === drives.current.id)) list.push(drives.current);
    const seen = new Set();
    const plays = [];
    let homeId = null;
    try {
      const comp = summary.header.competitions[0].competitors.find((c) => c.homeAway === 'home');
      homeId = String(comp.team ? comp.team.id : comp.id);
    } catch (e) { /* no header */ }
    const driveInfo = {};
    list.forEach((d) => {
      driveInfo[d.id] = {
        id: d.id,
        team: d.team ? d.team.abbreviation : '',
        result: String(d.result || d.displayResult || '').toUpperCase(),
        display: d.displayResult || '',
      };
      (d.plays || []).forEach((p) => {
        const key = String(p.id || p.sequenceNumber);
        if (seen.has(key)) return;
        seen.add(key);
        const c = classifyPlay(p);
        c.driveId = d.id;
        c.endYTE = p.end && typeof p.end.yardsToEndzone === 'number' ? p.end.yardsToEndzone : null;
        c.scoring = !!p.scoringPlay;
        c.turnover = !!p.isTurnover;
        c.endYL = p.end && typeof p.end.yardLine === 'number' ? p.end.yardLine : null;
        c.endTeam = p.end && p.end.team ? String(p.end.team.id) : null;
        c.togo = p.end && typeof p.end.distance === 'number' ? p.end.distance : null;
        c.endDown = p.end && p.end.down > 0 ? p.end.shortDownDistanceText || '' : '';
        c.endBallOn = p.end ? p.end.possessionText || '' : '';
        c.q = p.period ? p.period.number : null;
        c.clock = p.clock ? p.clock.displayValue : '';
        c.startDD = p.start && p.start.down > 0 ? (p.start.shortDownDistanceText || '') + (p.start.possessionText ? ' at ' + p.start.possessionText : '') : '';
        if (c.kind !== 'ignore' && c.yl0 != null && homeId) {
          const home = c.off === homeId;
          const sign = home ? 1 : -1;
          c.anim = Object.assign({ from: c.yl0, home }, c.fx || {});
          if (c.kind === 'play') c.anim.to = Math.max(0, Math.min(100, c.yl0 + sign * c.yards));
          if (c.anim.td) c.anim.to = home ? 100 : 0;
        }
        plays.push(c);
      });
    });
    plays.sort((a, b) => a.seq - b.seq);
    const currentId = drives.current ? drives.current.id : (list.length ? list[list.length - 1].id : null);
    Object.values(driveInfo).forEach((d) => {
      // ESPN keeps a finished drive as "current" (with its result filled in) until the next one starts.
      d.done = !!d.result;
    });
    const status = scoreEvent ? statusFromEvent(scoreEvent, league) : null;
    if (status && homeId) {
      // Where the ball is now, who has it, and the line to gain, for the field picture.
      const lastSnap = plays.filter((p) => p.kind !== 'ignore' && p.endYL != null).pop();
      const curDone = currentId && driveInfo[currentId] && driveInfo[currentId].done;
      if (status.los == null && lastSnap && !curDone) {
        // Scoreboard had no field position: fall back to where the last snap ended.
        status.los = lastSnap.endYL;
        status.possHome = lastSnap.scoring || lastSnap.turnover ? null : lastSnap.endTeam === homeId;
        status.togo = lastSnap.togo;
        status.downShort = lastSnap.endDown || '';
        status.ballOn = lastSnap.endBallOn || '';
      }
      if (!status.downShort && lastSnap && !curDone && lastSnap.endDown) {
        // During timeouts / reviews the scoreboard drops the down: keep showing the last known one.
        status.downShort = lastSnap.endDown;
        if (!status.ballOn) status.ballOn = lastSnap.endBallOn || '';
        if (status.togo == null) status.togo = lastSnap.togo;
      }
      const isBreak = (t) => /timeout|two-minute|end period|end of|coin toss/i.test(t || '');
      if (!status.lastPlay || isBreak(status.lastPlayType) || /^(official )?timeout/i.test(status.lastPlay)) {
        const lastReal = plays.filter((p) => p.text && !isBreak(p.typeText)).pop();
        if (lastReal) status.lastPlay = lastReal.text;
      }
      // The last 5 plays for the play list (newest first). Skip timeouts and quarter breaks.
      const shown = plays.filter((p) => p.text && !/timeout|two-minute|end period|end of|coin toss/i.test(p.typeText));
      const recent = shown.slice(-5).reverse().map((p) => ({ id: p.id, q: p.q, clock: p.clock, dd: p.startDD, text: cleanText(p.text) }));
      // The scoreboard usually knows about the newest play before the play-by-play does.
      if (status.lastPlayId && !/timeout|two-minute|end period|end of|coin toss/i.test(status.lastPlayType || '') && !recent.some((r) => r.id === status.lastPlayId) && (!recent.length || status.lastPlayId > recent[0].id)) {
        recent.unshift({ id: status.lastPlayId, q: status.period, clock: '', dd: '', text: cleanText(status.lastPlay) });
        recent.length = Math.min(recent.length, 5);
      }
      status.recent = recent;
    }
    
    // Red zone: the current drive must have at least one snap, and the ball must really be inside the 20
    // for the team on that drive. (ESPN's isRedZone flag can stay on after a field goal or score.)
    let rz = null;
    const cur = currentId && driveInfo[currentId];
    if (cur && !cur.done) {
      const snaps = plays.filter((p) => p.driveId === currentId && (p.kind === 'play' || p.kind === 'void'));
      const last = snaps[snaps.length - 1];
      if (last && !last.scoring && !last.turnover) {
        const byPlay = last.endYTE != null && last.endYTE > 0 && last.endYTE <= 20;
        // The scoreboard is often a play ahead; use it only if it agrees on who has the ball.
        let bySb = false;
        if (status && status.los != null && status.possHome != null && status.poss && status.poss === cur.team) {
          const yte = status.possHome ? 100 - status.los : status.los;
          bySb = yte > 0 && yte <= 20;
        }
        if (byPlay || bySb) {
          const team = cur.team || (status && status.poss) || '';
          rz = { driveId: currentId, team, label: team ? team + ' in the red zone' : 'Red zone' };
        }
      }
    }
    return { plays, drives: driveInfo, currentId, redZone: rz, status };
  }

  function driveOutcome(d) {
    const r = (d && d.result) || '';
    if (r === 'TD' || r === 'TOUCHDOWN') return 'td';
    if (r === 'FG' || r === 'FIELD GOAL' || r === 'FIELD GOAL GOOD') return 'fg';
    return 'none';
  }

  // ---------- the engine ----------
  // The host taps LOCK when they SEE the snap on TV, which runs behind real time. ESPN stamps every
  // play with the real time ("wallclock"). The gap between the two is the host's TV delay: it is
  // different for cable vs streaming but stays steady during a game. We find the delay that lines up
  // the most lock taps with snaps, then match each lock to the snap that fits it.
  const MIN_DELAY = -20e3;
  const MAX_DELAY = 180e3;
  const FIT = 7e3; // how far a lock may be from a perfect fit while calibrating
  const MATCH = 10e3; // ...and when matching a lock to its snap
  const NEED = 3; // locks that must agree before we trust a delay

  function median(a) {
    const s = a.slice().sort((x, y) => x - y);
    return s.length ? s[Math.floor(s.length / 2)] : null;
  }

  function countFits(locks, snaps, d, tol) {
    let j = 0;
    const diffs = [];
    for (const L of locks) {
      const target = L.t - d;
      while (j < snaps.length && snaps[j].wall < target - tol) j++;
      if (j < snaps.length && Math.abs(snaps[j].wall - target) <= tol) {
        diffs.push(L.t - snaps[j].wall);
        j++;
      }
    }
    return diffs;
  }

  /** Best TV delay for these locks, or null if they don't agree on one yet. */
  function estimateDelay(locks, snaps, opts) {
    if (locks.length < NEED || !snaps.length) return null;
    const lo = locks[0].t - MAX_DELAY - FIT;
    const hi = locks[locks.length - 1].t - MIN_DELAY + FIT;
    const near = snaps.filter((s) => s.wall >= lo && s.wall <= hi);
    let best = null;
    const all = [];
    const tried = new Set();
    for (const L of locks) {
      for (const S of near) {
        const d = L.t - S.wall;
        if (d < MIN_DELAY || d > MAX_DELAY) continue;
        const key = Math.round(d / 1000);
        if (tried.has(key)) continue;
        tried.add(key);
        const diffs = countFits(locks, near, d, FIT);
        const m = median(diffs);
        const err = diffs.reduce((acc, x) => acc + Math.abs(x - m), 0);
        const c = { n: diffs.length, err, d: m };
        all.push(c);
        if (!best || c.n > best.n || (c.n === best.n && err < best.err)) best = c;
      }
    }
    if (!best || best.n < NEED) return null;
    // Plays come at a steady rhythm, so a delay that's off by one play can fit almost as well.
    // Only trust the winner once it clearly beats every different delay.
    const rival = all.filter((c) => Math.abs(c.d - best.d) > 2 * FIT).reduce((m, c) => Math.max(m, c.n), 0);
    if (!opts || !opts.loose) { if (best.n - rival < 2) return null; }
    return best.d;
  }

  /**
   * One engine step. Pure: takes the room row + parsed feed and returns what to write.
   * room fields used: last_seq, pending [{r,t}], lock_log [{r,t}], delay, rz_phase, rz_round, rz_drive, rz_done
   */
  function engineStep(room, feed, now) {
    now = now || Date.now();
    const out = { patch: {}, results: [], notes: [] };
    const plays = feed.plays;
    const maxSeq = plays.length ? plays[plays.length - 1].seq : 0;
    if (room.last_seq == null) {
      // Joining mid-game: everything already in the feed is history.
      out.patch.last_seq = maxSeq;
      out.patch.rz_done = feed.redZone ? null : room.rz_done || null;
      return out;
    }
    let pending = (room.pending || []).slice();
    const snaps = plays.filter((p) => p.kind !== 'ignore' && p.wall != null);
    let delay = estimateDelay(room.lock_log || [], snaps);
    if (delay == null && pending.length && now - pending[0].t > 150e3) {
      // Still unsure after a couple of minutes: go with the best guess so results don't stall.
      delay = estimateDelay(room.lock_log || [], snaps, { loose: true });
    }
    if (delay != null && delay !== room.delay) out.patch.delay = Math.round(delay);
    let lastSeq = room.last_seq;

    // Too few locks to learn the TV delay yet: the host tapped LOCK when they SAW the snap, which is after
    // it really happened, so match each old-enough lock to the latest snap shortly before the tap.
    while (delay == null && pending.length && now - pending[0].t > 150e3) {
      const lock = pending[0];
      let pick = null;
      for (const sn of snaps) {
        if (sn.seq <= lastSeq) continue;
        if (sn.wall <= lock.t + 5e3 && sn.wall >= lock.t - 75e3 && (!pick || sn.wall > pick.wall)) pick = sn;
      }
      pending.shift();
      if (pick) {
        lastSeq = pick.seq;
        if (pick.kind === 'void') out.results.push({ kind: 'play', round: lock.r, void: true, text: pick.text, why: pick.why, anim: pick.anim || null });
        else out.results.push({ kind: 'play', round: lock.r, play_type: pick.playType, dir: pick.dir, dist: pick.dist, yards: pick.yards, text: pick.text, anim: pick.anim || null });
      } else {
        out.results.push({ kind: 'play', round: lock.r, void: true, text: 'No snap found for this lock in the ESPN feed.' });
      }
    }

    while (pending.length && delay != null) {
      const lock = pending[0];
      const target = lock.t - delay;
      let pick = null;
      let later = 0;
      for (const s of snaps) {
        if (s.seq <= lastSeq) continue;
        if (s.wall > target + MATCH) later++;
        if (Math.abs(s.wall - target) <= MATCH && (!pick || Math.abs(s.wall - target) < Math.abs(pick.wall - target))) pick = s;
      }
      if (pick) {
        pending.shift();
        lastSeq = pick.seq;
        if (pick.kind === 'void') out.results.push({ kind: 'play', round: lock.r, void: true, text: pick.text, why: pick.why, anim: pick.anim || null });
        else out.results.push({ kind: 'play', round: lock.r, play_type: pick.playType, dir: pick.dir, dist: pick.dist, yards: pick.yards, text: pick.text, anim: pick.anim || null });
      } else if (later >= 2 || now - lock.t > 600e3) {
        // The feed has moved past this lock's moment without a snap (e.g. a flag before the snap).
        pending.shift();
        out.results.push({ kind: 'play', round: lock.r, void: true, text: 'No snap found for this lock in the ESPN feed.' });
      } else break; // the feed hasn't caught up to this lock yet
    }
    const changed = { pending: pending.length !== (room.pending || []).length };
    if (lastSeq !== room.last_seq) out.patch.last_seq = lastSeq;
    if (changed.pending) out.patch.pending = pending;

    // Red zone drive predictions.
    const rzPhase = room.rz_phase || 'none';
    if (rzPhase !== 'none' && room.rz_drive && feed.drives[room.rz_drive] && feed.drives[room.rz_drive].done) {
      const dv = feed.drives[room.rz_drive];
      out.results.push({ kind: 'drive', round: room.rz_round, drive: driveOutcome(dv), text: (dv.team ? dv.team + ' drive: ' : 'Drive: ') + (dv.display || dv.result) });
      out.patch.rz_phase = 'none';
      out.patch.rz_done = room.rz_drive;
      out.patch.rz_drive = null;
    } else if (rzPhase !== 'none' && !room.rz_drive && feed.currentId && feed.drives[feed.currentId] && !feed.drives[feed.currentId].done
      && feed.currentId !== room.rz_done) {
      // The host opened a red zone call: tie it to the drive in progress so it scores itself when the drive ends.
      out.patch.rz_drive = feed.currentId;
    }
    return out;
  }

  const api = { cleanText, estimateDelay, LEAGUES, listGames, getScoreboardEvent, getSummary, statusFromEvent, classifyPlay, readFeed, engineStep, distBucket, driveOutcome };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ESPN = api;
})(typeof window !== 'undefined' ? window : globalThis);
