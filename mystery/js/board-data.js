/* Marrowby Mysteries: The Board Game. Board layout + three themes.
   The board is an 11 × 11 grid: nine 3 × 3 blocks (8 places + the accusation spot in the middle)
   with hallways in columns/rows 3 and 7 between them. Every theme uses the same layout; it only
   changes who, what, where, the story, and the words. BoardData.setTheme(id) switches themes. */
(function (root) {
  'use strict';

  // ---------- board layout (shared by every theme) ----------
  const SLOTS = {
    nw: { x: 0, y: 0, doors: [[3, 1], [1, 3]], passage: 'se' },
    n: { x: 4, y: 0, doors: [[3, 1], [7, 1], [5, 3]] },
    ne: { x: 8, y: 0, doors: [[7, 1], [9, 3]], passage: 'sw' },
    w: { x: 0, y: 4, doors: [[1, 3], [3, 5], [1, 7]] },
    c: { x: 4, y: 4, doors: [[5, 3], [3, 5], [7, 5], [5, 7]] },
    e: { x: 8, y: 4, doors: [[9, 3], [7, 5], [9, 7]] },
    sw: { x: 0, y: 8, doors: [[1, 7], [3, 9]], passage: 'ne' },
    s: { x: 4, y: 8, doors: [[5, 7], [3, 9], [7, 9]] },
    se: { x: 8, y: 8, doors: [[9, 7], [7, 9]], passage: 'nw' },
  };
  // Special hallway squares (the dead-end stubs around the edge are worth the detour).
  const SPECIALS = {
    '3,0': 'clue', '10,3': 'clue', '7,10': 'clue', '0,7': 'clue',
    '7,0': 'mag', '3,10': 'mag',
    '0,3': 'lights', '10,7': 'lights',
  };
  const SIZE = 11;
  const isHall = (x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE && (x === 3 || x === 7 || y === 3 || y === 7);
  const lineup = (ids, moods) => ids.map((id, i) => ({ id, x: 12 + i * 15.2, size: 0.72, mood: (moods && moods[i]) || 'neutral' }));

  // ---------- themes ----------
  const THEMES = {};

  // ===== 1. Marrowby Manor (a murder mystery, Clue-style) =====
  THEMES.manor = {
    id: 'manor', name: 'Marrowby Manor', emoji: '🏚️', title: 'Marrowby Manor', board: '#2a1d14', hall: ['#e8d9b5', '#b8a47a'],
    tagline: 'figure out <b>who</b> did it, <b>with what</b>, and <b>where</b>',
    helper: { name: 'Pembrook', emoji: '🤵' }, whatIcon: '🔪', placeWord: 'room',
    accuseHint: '⚖️ Accuse here',
    sceneYes: (r) => `😱 Pembrook whispers: “Something terrible happened in the ${r}…”`, sceneYesShort: 'This is the crime scene!', sceneTag: '⭐ Crime scene!',
    sceneNo: (r) => `🔍 Pembrook whispers: “Nothing happened in the ${r}.”`,
    specials: {
      clue: { emoji: '🔦', name: 'Clue square', text: 'Pembrook slips you a secret clue card!' },
      mag: { emoji: '🔎', name: 'Magnifying glass', text: 'You found a magnifying glass! Use it for a hint any time on your turn.' },
      lights: { emoji: '🌑', name: 'Lights out!', text: 'The lights flicker out! Everyone stumbles into a random room.' },
    },
    suspects: [
      { id: 'victoria', name: 'Victoria', full: 'Victoria Marrowby', emoji: '👩‍💼', why: 'Ozzie was giving her company away, and she wanted to keep it' },
      { id: 'felix', name: 'Felix', full: 'Felix Marrowby', emoji: '🎩', why: 'he owed a LOT of money and wanted his inheritance early' },
      { id: 'ginny', name: 'Aunt Ginny', full: 'Aunt Ginny Marrowby', emoji: '🌻', why: 'Ozzie stole her maze game sixty years ago, and she never forgave him' },
      { id: 'bianca', name: 'Chef Bianca', full: 'Chef Bianca Bell', emoji: '👩‍🍳', why: 'Ozzie found out she was leaving for a TV cooking show, and threatened to ruin it' },
      { id: 'lola', name: 'Lola', full: 'Lola Quill', emoji: '✏️', why: 'Ozzie discovered she was secretly selling his designs' },
      { id: 'rex', name: 'Rex', full: 'Rex Hartley', emoji: '🎲', why: 'after forty years, he wanted to win their rivalry once and for all' },
    ],
    weapons: [
      { id: 'cocoa', name: 'Poisoned Cocoa', short: 'Cocoa', emoji: '☕', how: 'a cup of sleepy-poison cocoa' },
      { id: 'box', name: 'Trick Puzzle Box', short: 'Puzzle Box', emoji: '🎁', how: 'a puzzle box with a hidden sleeping needle' },
      { id: 'knight', name: 'Bronze Knight Trophy', short: 'Knight Trophy', emoji: '♞', how: 'the heavy Bronze Knight trophy' },
      { id: 'cord', name: 'Curtain Cord', short: 'Curtain Cord', emoji: '🪢', how: 'a tasseled curtain cord' },
      { id: 'cookbook', name: 'Heavy Cookbook', short: 'Cookbook', emoji: '📕', how: 'an enormous, very heavy cookbook' },
      { id: 'mallet', name: 'Croquet Mallet', short: 'Mallet', emoji: '🏑', how: 'a croquet mallet from the garden' },
    ],
    rooms: {
      nw: { id: 'kitchen', name: 'Kitchen', emoji: '🍳', color: '#c9b48a', floor: '#e6d6b0', scene: 'kitchen' },
      n: { id: 'ballroom', name: 'Ballroom', emoji: '🎂', color: '#9a3b52', floor: '#c25b74', scene: 'dining' },
      ne: { id: 'greenhouse', name: 'Greenhouse', emoji: '🌿', color: '#2f7a4a', floor: '#5aa572', scene: 'greenhouse' },
      w: { id: 'library', name: 'Library', emoji: '📚', color: '#6b3f22', floor: '#a0693f', scene: 'library' },
      c: { id: 'tower', name: 'Clock Tower', emoji: '🕰️', color: '#3a2352', floor: '#5a3c7a', scene: 'tower' },
      e: { id: 'gameroom', name: 'Game Room', emoji: '♟️', color: '#4b2a6b', floor: '#7a52a0', scene: 'gameroom' },
      sw: { id: 'study', name: 'Study', emoji: '🖋️', color: '#1f5a44', floor: '#3f8a6a', scene: 'study' },
      s: { id: 'cellar', name: 'Cellar', emoji: '🕯️', color: '#3d3d4a', floor: '#62627a', scene: 'cellar' },
      se: { id: 'music', name: 'Music Room', emoji: '🎹', color: '#22355e', floor: '#4a64a0', scene: 'music' },
    },
    intro: [
      { bg: 'manor', fx: ['snow'], sfx: 'wind', sfxAt: 100, title: 'Marrowby Manor', sub: 'The Board Game',
        caption: 'A snowy night at Marrowby Manor. Grandpa Ozzie, the world’s most famous puzzle-maker, is turning 80.' },
      { bg: 'dining', cast: lineup(['victoria', 'felix', 'ginny', 'bianca', 'lola', 'rex'], ['neutral', 'worried', 'happy', 'happy', 'neutral', 'grin']),
        caption: 'Six guests came to his birthday party: Victoria, Felix, Aunt Ginny, Chef Bianca, Lola, and Rex.' },
      { bg: 'dining', sfx: 'ding', sfxAt: 200, cast: [{ id: 'ozzie', mood: 'sly', x: 50, size: 1.1, anim: 'pop-in' }],
        say: { who: 'ozzie', text: 'At midnight, I’m changing my will. One of you is in for a BIG surprise!' } },
      { bg: 'tower', fx: ['dark', 'shake-late'], sfx: 'crash', sfxAt: 2000, cast: [{ id: 'pembrook', mood: 'gasp', x: 24 }],
        caption: 'But later that night… CRASH! Pembrook the butler found Grandpa Ozzie in the Clock Tower. He was gone.' },
      { bg: 'dark', fx: ['spot'], props: [{ e: '❓', x: 30, y: 40, s: 16, anim: 'pop' }, { e: '❓', x: 50, y: 34, s: 20, anim: 'pop', delay: 0.6 }, { e: '❓', x: 70, y: 40, s: 16, anim: 'pop', delay: 1.2 }],
        title: 'WHO? WITH WHAT? WHERE?', sub: 'Search the mansion. Make guesses. Cross off suspects. Then race to the Clock Tower to accuse!' },
    ],
    reveal: (s, w, r, winner) => [
      winner ? { bg: 'tower', sfx: 'chime', sfxAt: 300, props: [{ e: '🏆', x: 50, y: 34, s: 22, anim: 'pop' }], title: 'Case solved!', sub: winner + ' cracked the case!' }
        : { bg: 'tower', fx: ['dark'], sfx: 'sting', sfxAt: 300, title: 'Nobody solved it…', sub: 'Let’s see who really did it.' },
      { bg: 'dining', fx: ['spot'], sfx: 'sting', sfxAt: 200, cast: [{ id: s.id, mood: 'angry', x: 50, size: 1.2, anim: 'zoom' }], title: s.full.toUpperCase(), sub: 'in the ' + r.name + ' · with the ' + w.name },
      { bg: r.scene, fx: ['sepia'], cast: [{ id: 'ozzie', mood: 'happy', x: 26 }, { id: s.id, mood: 'sly', x: 74 }], props: [{ e: w.emoji, x: 52, y: 44, s: 11, anim: 'pop', delay: 1.4 }],
        caption: s.full + ' asked Grandpa Ozzie to come to the ' + r.name + ' for a little chat… and then used ' + w.how + '.' },
      { bg: r.scene, fx: ['sepia', 'dim'], props: [{ e: '⌚', x: 50, y: 30, s: 14, anim: 'fall' }], caption: 'Then ' + s.name + ' slipped back to the party as if nothing had happened.' },
      { bg: 'dining', cast: [{ id: s.id, mood: 'sad', x: 50, size: 1.05 }], caption: 'Why? Because ' + s.why + '.' },
      { bg: 'manor', fx: ['snow', 'police'], sfx: 'siren', sfxAt: 300, title: 'Case closed', sub: winner ? 'Solved by ' + winner + '!' : 'Better luck next time, detectives!' },
    ],
  };

  // ===== 2. Treasure Island (who stole the treasure?) =====
  THEMES.island = {
    id: 'island', name: 'Treasure Island', emoji: '🏝️', title: 'Treasure Island', board: '#0f4c6b', hall: ['#f2d98f', '#c9a557'],
    tagline: 'figure out <b>who</b> stole the treasure, <b>with what</b>, and <b>where</b>',
    helper: { name: 'Polly the Parrot', emoji: '🦜' }, whatIcon: '🧰', placeWord: 'spot',
    accuseHint: '⚖️ Accuse here',
    sceneYes: (r) => `🦜 Polly squawks: “SQUAWK! The treasure was taken from the ${r}!”`, sceneYesShort: 'This is where the treasure was taken!', sceneTag: '⭐ Treasure spot!',
    sceneNo: (r) => `🦜 Polly squawks: “Nothing happened at the ${r}!”`,
    specials: {
      clue: { emoji: '🍾', name: 'Message in a bottle', text: 'A bottle washes up with a secret clue card inside!' },
      mag: { emoji: '🔭', name: 'Spyglass', text: 'You found a spyglass! Use it for a hint any time on your turn.' },
      lights: { emoji: '🌊', name: 'Big wave!', text: 'A giant wave washes everyone to a random spot on the island!' },
    },
    suspects: [
      { id: 'marlo', name: 'Marlo', full: 'First Mate Marlo', emoji: '🏴‍☠️', why: 'Marlo was tired of being second-in-command and wanted to be captain' },
      { id: 'sal', name: 'Salty Sal', full: 'Salty Sal the Cook', emoji: '🍲', why: 'Sal wanted to open the best seafood restaurant in the world' },
      { id: 'nina', name: 'Nina', full: 'Navigator Nina', emoji: '🧭', why: 'Nina drew the map that found the treasure and thought it should be hers' },
      { id: 'kai', name: 'Kai', full: 'Kai the Surfer', emoji: '🏄', why: 'Kai wanted to buy a golden surfboard' },
      { id: 'coral', name: 'Dr. Coral', full: 'Dr. Coral Reef', emoji: '🔬', why: 'Dr. Coral wanted the treasure for her ocean museum, not someone else’s' },
      { id: 'bernie', name: 'Bernie', full: 'Bernie the Tourist', emoji: '📸', why: 'Bernie wanted the best vacation souvenir EVER' },
    ],
    weapons: [
      { id: 'hook', name: 'Grappling Hook', short: 'Hook', emoji: '🪝', how: 'a grappling hook to climb up' },
      { id: 'map', name: 'Fake Treasure Map', short: 'Fake Map', emoji: '🗺️', how: 'a fake treasure map to send everyone the wrong way' },
      { id: 'rowboat', name: 'Rowboat', short: 'Rowboat', emoji: '🛶', how: 'a little rowboat to sneak away' },
      { id: 'parrot', name: 'Trained Parrot', short: 'Parrot', emoji: '🦜', how: 'a trained parrot to carry the gold coins' },
      { id: 'pickaxe', name: 'Pickaxe', short: 'Pickaxe', emoji: '⛏️', how: 'a pickaxe to break open the chest' },
      { id: 'rod', name: 'Fishing Rod', short: 'Fishing Rod', emoji: '🎣', how: 'a fishing rod to hook the treasure bag' },
    ],
    rooms: {
      nw: { id: 'cove', name: 'Shipwreck Cove', emoji: '🚢', color: '#1d5f86', floor: '#3f93bf', scene: 'island:🚢' },
      n: { id: 'volcano', name: 'Volcano', emoji: '🌋', color: '#7a2414', floor: '#c4502a', scene: 'island:🌋' },
      ne: { id: 'jungle', name: 'Jungle', emoji: '🌴', color: '#1f6a32', floor: '#3f9a52', scene: 'island:🌴' },
      w: { id: 'lagoon', name: 'Lagoon', emoji: '🐠', color: '#137272', floor: '#38a8a8', scene: 'island:🐠' },
      c: { id: 'tower', name: 'Skull Rock', emoji: '💀', color: '#33333f', floor: '#5a5a6e', scene: 'islandnight:💀' },
      e: { id: 'caves', name: 'Crystal Caves', emoji: '💎', color: '#4b2a6b', floor: '#7a52a0', scene: 'islandnight:💎' },
      sw: { id: 'camp', name: 'Base Camp', emoji: '⛺', color: '#6b4a1a', floor: '#a8823e', scene: 'island:⛺' },
      s: { id: 'beach', name: 'Sandy Beach', emoji: '🏖️', color: '#b08a3e', floor: '#e0c06e', scene: 'island:🏖️' },
      se: { id: 'dock', name: 'Dock', emoji: '⚓', color: '#5a3418', floor: '#8a5a30', scene: 'island:⚓' },
    },
    intro: [
      { bg: 'island:🏝️', sfx: 'wind', sfxAt: 100, title: 'Treasure Island', sub: 'A Marrowby Mystery',
        caption: 'Far out at sea lies a tiny island, where Captain Goldbeard has just found the greatest treasure of all time.' },
      { bg: 'islandnight:🔥', cast: [{ id: 'goldbeard', mood: 'happy', x: 30, size: 1.05, anim: 'pop-in' }], props: [{ e: '💰', x: 84, y: 56, s: 12, anim: 'pop' }, { e: '🪙', x: 90, y: 34, s: 8, anim: 'twinkle' }],
        say: { who: 'goldbeard', text: 'Arr! Tonight we feast! Tomorrow, this treasure goes to the Museum of the Sea!' } },
      { bg: 'islandnight:🔥', cast: lineup(['marlo', 'sal', 'nina', 'kai', 'coral', 'bernie'], ['sly', 'happy', 'neutral', 'grin', 'neutral', 'happy']),
        caption: 'Six people camped on the island that night: First Mate Marlo, Salty Sal the cook, Navigator Nina, Kai the surfer, Dr. Coral, and Bernie the tourist.' },
      { bg: 'island:⛺', sfx: 'sting', sfxAt: 600, cast: [{ id: 'goldbeard', mood: 'gasp', x: 30, size: 1.05 }], props: [{ e: '🧰', x: 68, y: 56, s: 12, anim: 'pop' }, { e: '❌', x: 68, y: 52, s: 8, anim: 'pop', delay: 1 }],
        say: { who: 'goldbeard', text: 'Shiver me timbers! Who stole my treasure?!' }, caption: 'But in the morning… the treasure chest was EMPTY!' },
      { bg: 'dark', fx: ['spot'], props: [{ e: '❓', x: 30, y: 40, s: 16, anim: 'pop' }, { e: '❓', x: 50, y: 34, s: 20, anim: 'pop', delay: 0.6 }, { e: '❓', x: 70, y: 40, s: 16, anim: 'pop', delay: 1.2 }],
        title: 'WHO? WITH WHAT? WHERE?', sub: 'Explore the island. Make guesses. Then race to Skull Rock to accuse!' },
    ],
    reveal: (s, w, r, winner) => [
      winner ? { bg: 'island:💰', sfx: 'chime', sfxAt: 300, title: 'Mystery solved!', sub: winner + ' found the thief!' }
        : { bg: 'islandnight:💀', sfx: 'sting', sfxAt: 300, title: 'Nobody solved it…', sub: 'Let’s see who really took it.' },
      { bg: 'islandnight:💀', fx: ['spot'], sfx: 'sting', sfxAt: 200, cast: [{ id: s.id, mood: 'gasp', x: 50, size: 1.2, anim: 'zoom' }], title: s.full.toUpperCase(), sub: 'at the ' + r.name + ' · with the ' + w.name },
      { bg: r.scene.replace('island:', 'islandnight:'), fx: ['sepia'], cast: [{ id: s.id, mood: 'sly', x: 30, anim: 'sneak' }], props: [{ e: w.emoji, x: 62, y: 44, s: 11, anim: 'pop', delay: 1 }, { e: '💰', x: 78, y: 56, s: 10, anim: 'pop', delay: 2 }],
        caption: 'In the middle of the night, ' + s.full + ' crept to the ' + r.name + ' and used ' + w.how + '…' },
      { bg: r.scene, fx: ['sepia'], cast: [{ id: s.id, mood: 'grin', x: 50 }], props: [{ e: '💰', x: 70, y: 50, s: 11, anim: 'pop' }], caption: '…and hid Captain Goldbeard’s treasure! Why? Because ' + s.why + '.' },
      { bg: 'island:🏝️', sfx: 'chime', sfxAt: 600, cast: [{ id: 'goldbeard', mood: 'happy', x: 34, size: 1.05 }, { id: s.id, mood: 'sad', x: 74, size: 0.85 }], props: [{ e: '💰', x: 54, y: 50, s: 11, anim: 'pop' }],
        say: { who: 'goldbeard', text: winner ? 'Arr! Three cheers for ' + winner + '!' : 'Arr! At least I got me treasure back!' }, caption: 'The treasure is safe, and it’s off to the Museum of the Sea!' },
    ],
  };

  // ===== 3. Championship Day (who stole the trophy?) =====
  THEMES.sports = {
    id: 'sports', name: 'Championship Day', emoji: '🏆', title: 'Championship Day', board: '#14361f', hall: ['#e6efe2', '#9fbf98'],
    tagline: 'figure out <b>who</b> stole the trophy, <b>with what</b>, and <b>where</b>',
    helper: { name: 'Coach Bigsby', emoji: '🧢' }, whatIcon: '🎒', placeWord: 'spot',
    accuseHint: '⚖️ Accuse here',
    sceneYes: (r) => `📋 Coach Bigsby says: “Look! The trophy was taken from the ${r}!”`, sceneYesShort: 'This is where the trophy was taken!', sceneTag: '⭐ Trophy spot!',
    sceneNo: (r) => `📋 Coach Bigsby says: “Nothing happened in the ${r}.”`,
    specials: {
      clue: { emoji: '📺', name: 'Instant replay', text: 'The replay screen shows you a secret clue card!' },
      mag: { emoji: '📸', name: 'Camera', text: 'You grabbed a camera! Snap a photo for a hint any time on your turn.' },
      lights: { emoji: '🌧️', name: 'Rain delay!', text: 'A sudden storm! Everyone runs for cover to a random spot.' },
    },
    suspects: [
      { id: 'jordan', name: 'Jordan', full: 'Team Captain Jordan', emoji: '🏀', why: 'Jordan was scared the team would lose and wanted to hold the trophy just once' },
      { id: 'vance', name: 'Coach Vance', full: 'Rival Coach Vance', emoji: '😎', why: 'Coach Vance wanted the other team to have nothing to play for' },
      { id: 'rita', name: 'Ref Rita', full: 'Referee Rita', emoji: '🦓', why: 'Rita has refereed for 30 years and has never once held a trophy' },
      { id: 'buzz', name: 'Buzz', full: 'Buzz the Mascot', emoji: '🐝', why: 'Buzz wanted to start a trophy collection in the mascot’s hive' },
      { id: 'ace', name: 'Ace', full: 'Announcer Ace', emoji: '🎙️', why: 'Ace wanted a BIG story to announce on live TV' },
      { id: 'stan', name: 'Snack Stan', full: 'Snack Stan', emoji: '🌭', why: 'Stan thought it would make the world’s fanciest nacho bowl' },
    ],
    weapons: [
      { id: 'bag', name: 'Sports Bag', short: 'Sports Bag', emoji: '🎒', how: 'a big sports bag to stuff it in' },
      { id: 'costume', name: 'Mascot Costume', short: 'Costume', emoji: '🐝', how: 'a fuzzy mascot costume as a disguise' },
      { id: 'popcorn', name: 'Giant Popcorn Bucket', short: 'Popcorn', emoji: '🍿', how: 'a giant popcorn bucket to hide it under' },
      { id: 'skateboard', name: 'Skateboard', short: 'Skateboard', emoji: '🛹', how: 'a skateboard to zoom away' },
      { id: 'cooler', name: 'Ice Cooler', short: 'Cooler', emoji: '🧊', how: 'an ice cooler to hide it in' },
      { id: 'balloons', name: 'Balloon Bunch', short: 'Balloons', emoji: '🎈', how: 'a huge bunch of balloons to float it out the window' },
    ],
    rooms: {
      nw: { id: 'locker', name: 'Locker Room', emoji: '🚿', color: '#22355e', floor: '#4a64a0', scene: 'stadium:🚿' },
      n: { id: 'field', name: 'Field', emoji: '🏟️', color: '#1f6a32', floor: '#3f9a52', scene: 'stadium:🏟️' },
      ne: { id: 'snack', name: 'Snack Stand', emoji: '🌭', color: '#b33a2a', floor: '#e0664a', scene: 'stadium:🌭' },
      w: { id: 'press', name: 'Press Box', emoji: '🎙️', color: '#4b2a6b', floor: '#7a52a0', scene: 'stadium:🎙️' },
      c: { id: 'tower', name: 'Trophy Case', emoji: '🏆', color: '#8a6610', floor: '#c9a227', scene: 'stadium:🏆' },
      e: { id: 'gym', name: 'Gym', emoji: '🏀', color: '#a8501a', floor: '#d9803a', scene: 'stadium:🏀' },
      sw: { id: 'parking', name: 'Parking Lot', emoji: '🚗', color: '#3d3d4a', floor: '#62627a', scene: 'stadium:🚗' },
      s: { id: 'tickets', name: 'Ticket Booth', emoji: '🎟️', color: '#8a2a52', floor: '#c04a7a', scene: 'stadium:🎟️' },
      se: { id: 'weights', name: 'Weight Room', emoji: '🏋️', color: '#2a4a5a', floor: '#4a7a8a', scene: 'stadium:🏋️' },
    },
    intro: [
      { bg: 'stadium:🏆', title: 'Championship Day', sub: 'A Marrowby Mystery',
        caption: 'It’s the night before the big championship game. The shiny gold trophy sits in its glass case for everyone to see.' },
      { bg: 'stadium:🏆', sfx: 'ding', sfxAt: 200, cast: [{ id: 'coach', mood: 'happy', x: 30, size: 1.1, anim: 'pop-in' }],
        say: { who: 'coach', text: 'Tomorrow, the winning team lifts this trophy! Isn’t she a beauty?' } },
      { bg: 'stadium:🏟️', cast: lineup(['jordan', 'vance', 'rita', 'buzz', 'ace', 'stan'], ['grin', 'sly', 'neutral', 'grin', 'happy', 'happy']),
        caption: 'Six people were at the stadium that night: Captain Jordan, Rival Coach Vance, Referee Rita, Buzz the mascot, Announcer Ace, and Snack Stan.' },
      { bg: 'stadium:❓', sfx: 'sting', sfxAt: 600, cast: [{ id: 'coach', mood: 'gasp', x: 30, size: 1.05 }],
        say: { who: 'coach', text: 'WHAT?! Who took the championship trophy?!' }, caption: 'But the next morning… the trophy case was EMPTY!' },
      { bg: 'dark', fx: ['spot'], props: [{ e: '❓', x: 30, y: 40, s: 16, anim: 'pop' }, { e: '❓', x: 50, y: 34, s: 20, anim: 'pop', delay: 0.6 }, { e: '❓', x: 70, y: 40, s: 16, anim: 'pop', delay: 1.2 }],
        title: 'WHO? WITH WHAT? WHERE?', sub: 'Search the stadium. Make guesses. Then race to the Trophy Case to accuse!' },
    ],
    reveal: (s, w, r, winner) => [
      winner ? { bg: 'stadium:🎉', sfx: 'chime', sfxAt: 300, title: 'Mystery solved!', sub: winner + ' caught the thief!' }
        : { bg: 'stadium:❓', sfx: 'sting', sfxAt: 300, title: 'Nobody solved it…', sub: 'Let’s see who really took it.' },
      { bg: 'stadium:🔦', fx: ['spot'], sfx: 'sting', sfxAt: 200, cast: [{ id: s.id, mood: 'gasp', x: 50, size: 1.2, anim: 'zoom' }], title: s.full.toUpperCase(), sub: 'in the ' + r.name + ' · with the ' + w.name },
      { bg: r.scene, fx: ['sepia'], cast: [{ id: s.id, mood: 'sly', x: 30, anim: 'sneak' }], props: [{ e: w.emoji, x: 62, y: 44, s: 11, anim: 'pop', delay: 1 }, { e: '🏆', x: 78, y: 50, s: 10, anim: 'pop', delay: 2 }],
        caption: 'Late at night, ' + s.full + ' snuck into the ' + r.name + ' with ' + w.how + '…' },
      { bg: r.scene, fx: ['sepia'], cast: [{ id: s.id, mood: 'grin', x: 50 }], props: [{ e: '🏆', x: 70, y: 50, s: 11, anim: 'pop' }], caption: '…and made off with the trophy! Why? Because ' + s.why + '.' },
      { bg: 'stadium:🎉', sfx: 'chime', sfxAt: 600, cast: [{ id: 'coach', mood: 'happy', x: 34, size: 1.05 }, { id: s.id, mood: 'sad', x: 74, size: 0.85 }], props: [{ e: '🏆', x: 54, y: 46, s: 11, anim: 'pop' }],
        say: { who: 'coach', text: winner ? 'Let’s hear it for ' + winner + '!' : 'Well, at least the trophy is back!' }, caption: 'The trophy is back in its case, just in time for the big game!' },
    ],
  };

  // ---------- current theme + graph ----------
  const D = {
    THEMES, THEME_IDS: ['manor', 'island', 'sports'], SLOTS, SPECIALS, SIZE,
    NODES: {}, SUSPECTS: [], WEAPONS: [], ROOMS: [], CRIME_ROOMS: [], SPECIAL_INFO: {}, INTRO: [], T: null,
  };
  let DIST = {};

  function setTheme(id) {
    const T = THEMES[id] || THEMES.manor;
    if (D.T === T) return T;
    D.T = T;
    D.SUSPECTS = T.suspects;
    D.WEAPONS = T.weapons;
    D.SPECIAL_INFO = T.specials;
    D.INTRO = T.intro;
    D.ROOMS = Object.keys(SLOTS).map((slot) => {
      const r = T.rooms[slot];
      const sl = SLOTS[slot];
      return Object.assign({}, r, { slot, x: sl.x, y: sl.y, doors: sl.doors, passage: sl.passage ? T.rooms[sl.passage].id : undefined, tower: slot === 'c' });
    });
    D.CRIME_ROOMS = D.ROOMS.filter((r) => !r.tower);
    // rebuild the graph in place (other code keeps a reference to D.NODES)
    Object.keys(D.NODES).forEach((k) => delete D.NODES[k]);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (isHall(x, y)) D.NODES['h:' + x + ',' + y] = { id: 'h:' + x + ',' + y, x, y, hall: true, special: SPECIALS[x + ',' + y] || null, adj: [] };
    D.ROOMS.forEach((r) => { D.NODES['r:' + r.id] = { id: 'r:' + r.id, room: r.id, x: r.x + 1, y: r.y + 1, adj: [] }; });
    Object.values(D.NODES).forEach((n) => {
      if (!n.hall) return;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { if (isHall(n.x + dx, n.y + dy)) n.adj.push('h:' + (n.x + dx) + ',' + (n.y + dy)); });
    });
    D.ROOMS.forEach((r) => r.doors.forEach(([x, y]) => {
      D.NODES['r:' + r.id].adj.push('h:' + x + ',' + y);
      D.NODES['h:' + x + ',' + y].adj.push('r:' + r.id);
    }));
    DIST = {};
    return T;
  }
  // case_id is "board" (old games = manor) or "board:<theme>"
  D.themeOf = (room) => { const m = String((room && room.case_id) || '').match(/^board:(\w+)$/); return m && THEMES[m[1]] ? m[1] : 'manor'; };
  D.setTheme = setTheme;

  // Breadth-first search. Rooms end a move (you can't walk through a room).
  D.bfs = function bfs(start, maxSteps) {
    const dist = { [start]: 0 };
    const prev = {};
    const q = [start];
    while (q.length) {
      const cur = q.shift();
      if (maxSteps != null && dist[cur] >= maxSteps) continue;
      if (cur !== start && !D.NODES[cur].hall) continue;
      D.NODES[cur].adj.forEach((nx) => {
        if (dist[nx] == null) { dist[nx] = dist[cur] + 1; prev[nx] = cur; q.push(nx); }
      });
    }
    return { dist, prev };
  };
  D.path = function path(from, to) {
    const { prev } = D.bfs(from);
    const out = [to];
    let c = to;
    while (c !== from && prev[c]) { c = prev[c]; out.unshift(c); }
    return out;
  };
  D.distBetween = function distBetween(a, b) {
    if (!DIST[a]) DIST[a] = D.bfs(a).dist;
    return DIST[a][b] == null ? 99 : DIST[a][b];
  };

  setTheme('manor');
  root.BoardData = D;
})(typeof window !== 'undefined' ? window : globalThis);
