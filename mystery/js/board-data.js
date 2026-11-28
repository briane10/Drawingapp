/* Marrowby Manor: The Board Game. Board layout and game pieces.
   The board is an 11 × 11 grid: nine 3 × 3 blocks (8 rooms + the Clock Tower in the middle)
   with hallways in columns/rows 3 and 7 between them. */
(function (root) {
  'use strict';

  const SUSPECTS = [
    { id: 'victoria', name: 'Victoria', full: 'Victoria Marrowby', emoji: '👩‍💼', why: 'Ozzie was giving her company away, and she wanted to keep it' },
    { id: 'felix', name: 'Felix', full: 'Felix Marrowby', emoji: '🎩', why: 'he owed a LOT of money and wanted his inheritance early' },
    { id: 'ginny', name: 'Aunt Ginny', full: 'Aunt Ginny Marrowby', emoji: '🌻', why: 'Ozzie stole her maze game sixty years ago, and she never forgave him' },
    { id: 'bianca', name: 'Chef Bianca', full: 'Chef Bianca Bell', emoji: '👩‍🍳', why: 'Ozzie found out she was leaving for a TV cooking show, and threatened to ruin it' },
    { id: 'lola', name: 'Lola', full: 'Lola Quill', emoji: '✏️', why: 'Ozzie discovered she was secretly selling his designs' },
    { id: 'rex', name: 'Rex', full: 'Rex Hartley', emoji: '🎲', why: 'after forty years, he wanted to win their rivalry once and for all' },
  ];
  const WEAPONS = [
    { id: 'cocoa', name: 'Poisoned Cocoa', short: 'Cocoa', emoji: '☕', how: 'a cup of sleepy-poison cocoa' },
    { id: 'box', name: 'Trick Puzzle Box', short: 'Puzzle Box', emoji: '🎁', how: 'a puzzle box with a hidden sleeping needle' },
    { id: 'knight', name: 'Bronze Knight Trophy', short: 'Knight Trophy', emoji: '♞', how: 'the heavy Bronze Knight trophy' },
    { id: 'cord', name: 'Curtain Cord', short: 'Curtain Cord', emoji: '🪢', how: 'a tasseled curtain cord' },
    { id: 'cookbook', name: 'Heavy Cookbook', short: 'Cookbook', emoji: '📕', how: 'an enormous, very heavy cookbook' },
    { id: 'mallet', name: 'Croquet Mallet', short: 'Mallet', emoji: '🏑', how: 'a croquet mallet from the garden' },
  ];
  // x, y = top-left of the room's 3 × 3 block. doors = hallway cells that lead in.
  const ROOMS = [
    { id: 'kitchen', name: 'Kitchen', emoji: '🍳', x: 0, y: 0, color: '#c9b48a', floor: '#e6d6b0', doors: [[3, 1], [1, 3]], passage: 'music', scene: 'kitchen' },
    { id: 'ballroom', name: 'Ballroom', emoji: '🎂', x: 4, y: 0, color: '#9a3b52', floor: '#c25b74', doors: [[3, 1], [7, 1], [5, 3]], scene: 'dining' },
    { id: 'greenhouse', name: 'Greenhouse', emoji: '🌿', x: 8, y: 0, color: '#2f7a4a', floor: '#5aa572', doors: [[7, 1], [9, 3]], passage: 'study', scene: 'greenhouse' },
    { id: 'library', name: 'Library', emoji: '📚', x: 0, y: 4, color: '#6b3f22', floor: '#a0693f', doors: [[1, 3], [3, 5], [1, 7]], scene: 'library' },
    { id: 'tower', name: 'Clock Tower', emoji: '🕰️', x: 4, y: 4, color: '#3a2352', floor: '#5a3c7a', doors: [[5, 3], [3, 5], [7, 5], [5, 7]], tower: true, scene: 'tower' },
    { id: 'gameroom', name: 'Game Room', emoji: '♟️', x: 8, y: 4, color: '#4b2a6b', floor: '#7a52a0', doors: [[9, 3], [7, 5], [9, 7]], scene: 'gameroom' },
    { id: 'study', name: 'Study', emoji: '🖋️', x: 0, y: 8, color: '#1f5a44', floor: '#3f8a6a', doors: [[1, 7], [3, 9]], passage: 'greenhouse', scene: 'study' },
    { id: 'cellar', name: 'Cellar', emoji: '🕯️', x: 4, y: 8, color: '#3d3d4a', floor: '#62627a', doors: [[5, 7], [3, 9], [7, 9]], scene: 'cellar' },
    { id: 'music', name: 'Music Room', emoji: '🎹', x: 8, y: 8, color: '#22355e', floor: '#4a64a0', doors: [[9, 7], [7, 9]], passage: 'kitchen', scene: 'music' },
  ];
  const CRIME_ROOMS = ROOMS.filter((r) => !r.tower);
  // Special hallway squares (the dead-end stubs around the edge are worth the detour).
  const SPECIALS = {
    '3,0': 'clue', '10,3': 'clue', '7,10': 'clue', '0,7': 'clue',
    '7,0': 'mag', '3,10': 'mag',
    '0,3': 'lights', '10,7': 'lights',
  };
  const SPECIAL_INFO = {
    clue: { emoji: '🔦', name: 'Clue square', text: 'Pembrook slips you a secret clue card!' },
    mag: { emoji: '🔎', name: 'Magnifying glass', text: 'You found a magnifying glass! Use it for a hint any time on your turn.' },
    lights: { emoji: '🌑', name: 'Lights out!', text: 'The lights flicker out! Everyone stumbles into a random room.' },
  };

  const SIZE = 11;
  const isHall = (x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE && (x === 3 || x === 7 || y === 3 || y === 7);

  // ---- graph ----
  const NODES = {};
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (isHall(x, y)) NODES['h:' + x + ',' + y] = { id: 'h:' + x + ',' + y, x, y, hall: true, special: SPECIALS[x + ',' + y] || null, adj: [] };
  ROOMS.forEach((r) => { NODES['r:' + r.id] = { id: 'r:' + r.id, room: r.id, x: r.x + 1, y: r.y + 1, adj: [] }; });
  Object.values(NODES).forEach((n) => {
    if (!n.hall) return;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { if (isHall(n.x + dx, n.y + dy)) n.adj.push('h:' + (n.x + dx) + ',' + (n.y + dy)); });
  });
  ROOMS.forEach((r) => r.doors.forEach(([x, y]) => {
    NODES['r:' + r.id].adj.push('h:' + x + ',' + y);
    NODES['h:' + x + ',' + y].adj.push('r:' + r.id);
  }));

  // Breadth-first search. Rooms end a move (you can't walk through a room).
  function bfs(start, maxSteps) {
    const dist = { [start]: 0 };
    const prev = {};
    const q = [start];
    while (q.length) {
      const cur = q.shift();
      if (maxSteps != null && dist[cur] >= maxSteps) continue;
      if (cur !== start && !NODES[cur].hall) continue;
      NODES[cur].adj.forEach((nx) => {
        if (dist[nx] == null) { dist[nx] = dist[cur] + 1; prev[nx] = cur; q.push(nx); }
      });
    }
    return { dist, prev };
  }
  function path(from, to) {
    const { prev } = bfs(from);
    const out = [to];
    let c = to;
    while (c !== from && prev[c]) { c = prev[c]; out.unshift(c); }
    return out;
  }
  const DIST = {};
  function distBetween(a, b) {
    if (!DIST[a]) DIST[a] = bfs(a).dist;
    return DIST[a][b] == null ? 99 : DIST[a][b];
  }

  // Story for the opening (reuses the animated characters and scenes).
  const INTRO = [
    { bg: 'manor', fx: ['snow'], sfx: 'wind', sfxAt: 100, title: 'Marrowby Manor', sub: 'The Board Game',
      caption: 'A snowy night at Marrowby Manor. Grandpa Ozzie, the world’s most famous puzzle-maker, is turning 80.' },
    { bg: 'dining', cast: [{ id: 'victoria', x: 14, size: 0.75 }, { id: 'felix', x: 30, size: 0.75, mood: 'worried' }, { id: 'ginny', x: 46, size: 0.75, mood: 'happy' }, { id: 'bianca', x: 62, size: 0.75, mood: 'happy' }, { id: 'lola', x: 78, size: 0.75 }, { id: 'rex', x: 92, size: 0.75, mood: 'grin' }],
      caption: 'Six guests came to his birthday party: Victoria, Felix, Aunt Ginny, Chef Bianca, Lola, and Rex.' },
    { bg: 'dining', sfx: 'ding', sfxAt: 200, cast: [{ id: 'ozzie', mood: 'sly', x: 50, size: 1.1, anim: 'pop-in' }],
      say: { who: 'ozzie', text: 'At midnight, I’m changing my will. One of you is in for a BIG surprise!' } },
    { bg: 'tower', fx: ['dark', 'shake-late'], sfx: 'crash', sfxAt: 2000, cast: [{ id: 'pembrook', mood: 'gasp', x: 24 }],
      caption: 'But later that night… CRASH! Pembrook the butler found Grandpa Ozzie in the Clock Tower. He was gone.' },
    { bg: 'dark', fx: ['spot'], props: [{ e: '❓', x: 30, y: 40, s: 16, anim: 'pop' }, { e: '❓', x: 50, y: 34, s: 20, anim: 'pop', delay: 0.6 }, { e: '❓', x: 70, y: 40, s: 16, anim: 'pop', delay: 1.2 }],
      title: 'WHO? WITH WHAT? WHERE?', sub: 'Search the mansion. Make guesses. Cross off suspects. Then race to the Clock Tower to accuse!' },
  ];

  root.BoardData = { SUSPECTS, WEAPONS, ROOMS, CRIME_ROOMS, SPECIALS, SPECIAL_INFO, SIZE, NODES, bfs, path, distBetween, INTRO };
})(typeof window !== 'undefined' ? window : globalThis);
