/* The animated story cards for Case 1. SPOILERS in the reveal cards!
   Each card: bg (scene), time, caption (narrator), say {who, text} (a character speaks),
   cast [{id, mood, x (% across), anim, size, flip, dim}], props [{e (emoji), x, y, s, anim}], sfx, fx. */
(function (root) {
  'use strict';

  const lineup = (moods) => ['victoria', 'felix', 'ginny', 'bianca', 'lola', 'rex'].map((id, i) => ({ id, x: 12 + i * 15.2, size: 0.72, mood: (moods && moods[id]) || 'neutral', anim: 'enter-up' }));

  const INTRO = [
    { bg: 'manor', fx: ['snow'], sfx: 'wind', sfxAt: 100, title: 'Murder at Marrowby Manor', sub: 'A Marrowby Mystery',
      caption: 'Marrowby Manor. Saturday night. A snowstorm has buried every road for miles.' },
    { bg: 'dining', cast: [{ id: 'ozzie', mood: 'happy', x: 50, size: 1.1, anim: 'enter-up' }], props: [{ e: '🎈', x: 18, y: 20, anim: 'float' }, { e: '🎈', x: 78, y: 26, anim: 'float', delay: 1 }],
      caption: 'Grandpa Ozzie Marrowby, the most famous puzzle-maker in the world, turned 80 tonight. The whole family came to celebrate.' },
    { bg: 'dining', cast: [{ id: 'victoria', mood: 'neutral', x: 30, anim: 'enter-left' }, { id: 'felix', mood: 'worried', x: 70, anim: 'enter-right' }],
      props: [{ e: '📱', x: 40, y: 58, s: 6, anim: 'pop' }, { e: '🃏', x: 80, y: 30, s: 6, anim: 'fall', delay: 2.2 }],
      caption: 'His daughter Victoria runs the family game company, and she never puts down her phone. His son Felix is a magician… whose tricks don’t always work.' },
    { bg: 'dining', cast: [{ id: 'ginny', mood: 'happy', x: 30, anim: 'enter-left' }, { id: 'bianca', mood: 'happy', x: 70, anim: 'enter-right' }],
      props: [{ e: '🌸', x: 18, y: 30, s: 6, anim: 'float' }, { e: '☕', x: 82, y: 56, s: 6, anim: 'pop' }],
      caption: 'His little sister, Aunt Ginny, grows rare orchids in the greenhouse. And Chef Bianca has made his famous cocoa every night for twenty years.' },
    { bg: 'dining', cast: [{ id: 'lola', mood: 'neutral', x: 30, anim: 'enter-left' }, { id: 'rex', mood: 'grin', x: 70, anim: 'enter-right' }],
      props: [{ e: '📓', x: 16, y: 56, s: 6, anim: 'pop' }, { e: '✨', x: 84, y: 40, s: 6, anim: 'twinkle' }],
      caption: 'Lola Quill is his brilliant young assistant. And Rex Hartley, a flashy game designer, has been his rival for forty years.' },
    { bg: 'dining', sfx: 'ding', sfxAt: 200, cast: [{ id: 'ozzie', mood: 'sly', x: 50, size: 1.1, anim: 'pop-in' }, { id: 'victoria', mood: 'gasp', x: 14, size: 0.7, delay: 2.6, anim: 'enter-up' }, { id: 'rex', mood: 'gasp', x: 86, size: 0.7, delay: 2.8, anim: 'enter-up' }],
      say: { who: 'ozzie', text: 'At midnight, I will change my will. And one of you is in for a very BIG surprise!' } },
    { bg: 'dining', cast: [{ id: 'rex', mood: 'grin', x: 28, anim: 'enter-left' }, { id: 'ozzie', mood: 'sly', x: 70, size: 1.05 }],
      say: { who: 'ozzie', text: 'Remember, Rex: nothing is ever an accident in a Marrowby puzzle.' },
      caption: 'Rex laughed. “Ozzie, you old fox. Always a showman.”' },
    { bg: 'dining', time: '8:45 PM', cast: [{ id: 'bianca', mood: 'happy', x: 30, anim: 'enter-left' }, { id: 'ozzie', mood: 'happy', x: 68 }],
      props: [{ e: '☕', x: 50, y: 48, s: 9, anim: 'slide' }],
      caption: 'At 8:45, Chef Bianca served Ozzie’s cocoa in his blue “OZ” mug, like every night. At 9:05 he carried it back to the kitchen himself, empty.',
      say: { who: 'ozzie', text: 'Delicious as always, Bianca!' } },
    { bg: 'dining', time: '9:10 PM', cast: [{ id: 'ozzie', mood: 'neutral', x: 50, size: 1.05, anim: 'exit-right-late' }], props: [{ e: '⌚', x: 30, y: 44, s: 8, anim: 'swing' }],
      say: { who: 'ozzie', text: 'Excuse me. I need a word with someone about the midnight surprise.' },
      caption: 'At 9:10, Ozzie checked his gold pocket watch, wrote a note on his napkin, and left the Ballroom.' },
    { bg: 'dining', time: '9:40 PM', sfx: 'crash', sfxAt: 2200, fx: ['shake-late'],
      cast: [{ id: 'victoria', mood: 'gasp', x: 18, size: 0.85 }, { id: 'lola', mood: 'gasp', x: 40, size: 0.85 }, { id: 'ginny', mood: 'gasp', x: 62, size: 0.85 }, { id: 'pembrook', mood: 'gasp', x: 84, size: 0.9 }],
      props: [{ e: '🎂', x: 76, y: 50, s: 10, anim: 'pop' }],
      caption: 'At 9:40, Pembrook the butler served the birthday cake to Victoria, Lola, and Aunt Ginny. Then… a terrible CRASH from the Clock Tower!' },
    { bg: 'dining', time: '9:48 PM', cast: [{ id: 'rex', mood: 'worried', x: 50, size: 1.05, anim: 'enter-right' }],
      say: { who: 'rex', text: 'Phew! Sorry I’m late. Did I miss the cake?' },
      caption: 'Rex rushed in at 9:48, out of breath. Felix and Chef Bianca never came at all.' },
    { bg: 'door', time: '10:00 PM', sfx: 'knock', sfxAt: 600, cast: [{ id: 'pembrook', mood: 'worried', x: 32, size: 1.05 }],
      say: { who: 'pembrook', text: 'Master Ozzie? It’s bolted from the inside! Stand back!' },
      caption: 'At ten o’clock, Pembrook went up to the Clock Tower.' },
    { bg: 'tower', fx: ['dark'], sfx: 'sting', sfxAt: 500, cast: [{ id: 'pembrook', mood: 'sad', x: 22, size: 0.95 }],
      props: [{ e: '⚙️', x: 62, y: 70, s: 10, anim: 'pop' }, { e: '👓', x: 74, y: 80, s: 6, anim: 'pop', delay: 1.2 }],
      caption: 'He broke down the door, and found Grandpa Ozzie beside the fallen clock weight. Grandpa Ozzie was gone. The great clock had stopped at exactly 9:40.' },
    { bg: 'tower', fx: ['dark'], cast: [{ id: 'pembrook', mood: 'neutral', x: 50, size: 1.15, anim: 'zoom' }],
      say: { who: 'pembrook', text: 'It looks like an accident. But the master always said… nothing is ever an accident in a Marrowby puzzle.' } },
    { bg: 'manor', fx: ['snow'], sfx: 'chime', sfxAt: 1200, title: 'The investigation begins', sub: 'Six suspects · One culprit · Ninety minutes',
      caption: 'The police can’t come until the snowplow arrives at midnight. But Grandpa Ozzie’s grandchildren have just arrived. Detectives… it’s up to you.' },
  ];

  // ---------- shared reveal beginnings ----------
  const opening = (crimeRoomName) => [
    { bg: 'dining', time: '12:00 AM', sfx: 'bell', sfxAt: 200, cast: lineup().concat([{ id: 'pembrook', x: 50, size: 1.05, anim: 'enter-up', delay: 1.4 }]).map((c) => (c.id === 'pembrook' ? c : Object.assign(c, { dim: true }))),
      caption: 'Midnight. The snowplow is here. And so is the truth.' },
    { bg: 'tower', fx: ['dark'], cast: [{ id: 'pembrook', mood: 'sly', x: 24 }], props: [{ e: '🕯️', x: 62, y: 56, s: 11, anim: 'pop' }, { e: '🧵', x: 74, y: 64, s: 7, anim: 'pop', delay: 1 }],
      say: { who: 'pembrook', text: 'The tower clock stopped at 9:40, so everyone believed that is when it happened. Everyone was SUPPOSED to believe that. This candle timer dropped the weight all by itself.' } },
    { bg: 'dark', fx: ['spot'], sfx: 'tick', sfxAt: 300, props: [{ e: '⌚', x: 50, y: 42, s: 22, anim: 'swing' }],
      caption: 'But Grandpa Ozzie’s pocket watch cracked when he fell. It stopped at 9:21. And the watch never lies. It was found in the ' + crimeRoomName + '.' },
  ];
  const ending = (who, mood, caption) => ({ bg: 'manor', fx: ['snow', 'police'], sfx: 'siren', sfxAt: 300, cast: [{ id: who, mood, x: 50, size: 1.05 }], caption });
  const solved = { bg: 'manor', fx: ['snow'], sfx: 'chime', sfxAt: 600, title: 'Case closed', sub: 'Grandpa Ozzie’s final puzzle was solved… by his grandchildren.' };

  const REVEAL = {
    A: opening('Study').concat([
      { bg: 'dining', fx: ['spot'], sfx: 'sting', sfxAt: 200, cast: [{ id: 'lola', mood: 'angry', x: 50, size: 1.2, anim: 'zoom' }],
        title: 'LOLA QUILL', sub: 'in the Study · with the Trick Puzzle Box · to keep a secret hidden' },
      { bg: 'study', fx: ['sepia'], cast: [{ id: 'ozzie', mood: 'sad', x: 30 }, { id: 'lola', mood: 'worried', x: 70 }], props: [{ e: '📜', x: 48, y: 40, s: 9, anim: 'pop' }],
        caption: 'For a whole year, Lola had been secretly selling Ozzie’s designs to Rex’s company. Ozzie found out, and he planned to tell everyone at midnight.' },
      { bg: 'study', time: '9:15 PM', fx: ['sepia'], sfx: 'ouch', sfxAt: 3200, cast: [{ id: 'lola', mood: 'sly', x: 68 }, { id: 'ozzie', mood: 'gasp', x: 30 }], props: [{ e: '🎁', x: 48, y: 50, s: 10, anim: 'slide' }, { e: '💫', x: 26, y: 18, s: 7, anim: 'twinkle', delay: 3.2 }],
        say: { who: 'ozzie', text: 'Ouch!' },
        caption: 'At 9:15 she handed him his own puzzle box, but she had hidden a tiny sleeping-poison needle in the lid.' },
      { bg: 'study', time: '9:21 PM', fx: ['sepia', 'dim'], props: [{ e: '⌚', x: 50, y: 30, s: 14, anim: 'fall' }, { e: '💥', x: 50, y: 70, s: 8, anim: 'pop', delay: 1.4 }],
        caption: 'Ozzie fell asleep and never woke up. His pocket watch cracked at 9:21.' },
      { bg: 'library', fx: ['sepia'], cast: [{ id: 'lola', mood: 'worried', x: 20, anim: 'sneak' }], props: [{ e: '📚', x: 70, y: 36, s: 9, anim: 'swing' }, { e: '🕯️', x: 82, y: 62, s: 8, anim: 'pop', delay: 2 }],
        caption: 'She moved him through the Library’s secret passage to the Clock Tower, bolted the door, lit the candle timer, and slipped back out. At 9:40, CRASH! And Lola was eating cake, with a perfect alibi.' },
      { bg: 'dining', cast: [{ id: 'rex', mood: 'grin', x: 34 }, { id: 'lola', mood: 'gasp', x: 74, dim: true }], props: [{ e: '📱', x: 12, y: 40, s: 9, anim: 'pop' }, { e: '✂️', x: 88, y: 22, s: 6, anim: 'pop', delay: 1 }],
        say: { who: 'rex', text: 'Thirty-five minutes of speech practice. Pure genius!' },
        caption: 'She snipped a cufflink off Rex’s coat to frame him, and said she saw him on the stairs. But Rex was recording his speech the whole time.' },
      ending('lola', 'sad', 'Lola’s secret was out. The snowplow brought the police.'),
      solved,
    ]),
    B: opening('Library').concat([
      { bg: 'dining', fx: ['spot'], sfx: 'sting', sfxAt: 200, cast: [{ id: 'victoria', mood: 'angry', x: 50, size: 1.2, anim: 'zoom' }],
        title: 'VICTORIA MARROWBY', sub: 'in the Library · with the Poisoned Cocoa · for the inheritance' },
      { bg: 'study', fx: ['sepia'], cast: [{ id: 'victoria', mood: 'angry', x: 34 }], props: [{ e: '📜', x: 66, y: 40, s: 11, anim: 'pop' }, { e: '😱', x: 78, y: 24, s: 6, anim: 'pop', delay: 1.6 }],
        caption: 'Victoria found her father’s new will. Marrowby Games, the company she had run for twenty years, would go to Lola.' },
      { bg: 'greenhouse', fx: ['sepia'], cast: [{ id: 'victoria', mood: 'sly', x: 40, anim: 'sneak' }], props: [{ e: '🧪', x: 70, y: 50, s: 9, anim: 'pop' }],
        caption: 'So she took the weed killer from Aunt Ginny’s greenhouse shelf…' },
      { bg: 'library', time: '9:15 PM', fx: ['sepia'], cast: [{ id: 'victoria', mood: 'sly', x: 74 }, { id: 'ozzie', mood: 'happy', x: 22 }], props: [{ e: '🍵', x: 48, y: 50, s: 9, anim: 'slide' }],
        say: { who: 'victoria', text: 'A fresh cup of cocoa, Father?' },
        caption: '…and at 9:15 she brought her father a cup of cocoa in a Library teacup.' },
      { bg: 'library', time: '9:21 PM', fx: ['sepia', 'dim'], props: [{ e: '⌚', x: 50, y: 30, s: 14, anim: 'fall' }, { e: '💥', x: 50, y: 70, s: 8, anim: 'pop', delay: 1.4 }],
        caption: 'Ozzie fell asleep by the fire and never woke up. His pocket watch cracked under the armchair at 9:21.' },
      { bg: 'library', fx: ['sepia'], cast: [{ id: 'victoria', mood: 'worried', x: 22, anim: 'sneak' }], props: [{ e: '📚', x: 70, y: 36, s: 9, anim: 'swing' }, { e: '🕯️', x: 82, y: 62, s: 8, anim: 'pop', delay: 2 }],
        caption: 'Through the bookshelf passage to the Clock Tower. Bolt the door. Light the candle timer. At 9:40, CRASH! And Victoria was eating cake, with a perfect alibi.' },
      { bg: 'kitchen', cast: [{ id: 'bianca', mood: 'angry', x: 34 }, { id: 'victoria', mood: 'gasp', x: 74, dim: true }], props: [{ e: '🗑️', x: 54, y: 56, s: 9, anim: 'pop' }, { e: '☕', x: 16, y: 40, s: 7, anim: 'pop', delay: 1 }],
        say: { who: 'bianca', text: 'He brought my cocoa back EMPTY at 9:05, and happy as a clam!' },
        caption: 'Victoria dropped the empty poison bottle in the kitchen trash to frame Chef Bianca. But it had soot on it from the Library fireplace.' },
      ending('victoria', 'sad', 'Victoria lost the company, and much more. The snowplow brought the police.'),
      solved,
    ]),
    C: opening('Greenhouse').concat([
      { bg: 'dining', fx: ['spot'], sfx: 'sting', sfxAt: 200, cast: [{ id: 'ginny', mood: 'angry', x: 50, size: 1.2, anim: 'zoom' }],
        title: 'AUNT GINNY MARROWBY', sub: 'in the Greenhouse · with the Bronze Knight Trophy · revenge for a stolen idea' },
      { bg: 'dark', fx: ['sepia'], props: [{ e: '🧒', x: 36, y: 46, s: 14, anim: 'pop' }, { e: '👧', x: 62, y: 46, s: 14, anim: 'pop', delay: 0.6 }, { e: '🧩', x: 49, y: 70, s: 9, anim: 'pop', delay: 1.2 }],
        caption: 'Sixty years ago, Ginny and her big brother invented a maze game together. Oswald became famous… and never gave her any credit.' },
      { bg: 'gameroom', fx: ['sepia'], cast: [{ id: 'ginny', mood: 'sly', x: 30, anim: 'sneak' }], props: [{ e: '♞', x: 74, y: 22, s: 10, anim: 'swing' }],
        caption: 'So she took the heavy Bronze Knight trophy from the Game Room…' },
      { bg: 'greenhouse', time: '9:15 PM', fx: ['sepia'], cast: [{ id: 'ozzie', mood: 'happy', x: 30 }, { id: 'ginny', mood: 'angry', x: 70 }], props: [{ e: '📔', x: 48, y: 44, s: 9, anim: 'pop' }],
        say: { who: 'ozzie', text: 'Ha! Oh, Ginny. That was SIXTY years ago!' },
        caption: '…and at 9:15 she showed Ozzie what she had read in his old journals. He laughed.' },
      { bg: 'greenhouse', time: '9:21 PM', fx: ['sepia', 'dim'], props: [{ e: '🪴', x: 40, y: 56, s: 12, anim: 'fall' }, { e: '⌚', x: 60, y: 30, s: 12, anim: 'fall', delay: 0.8 }],
        caption: 'When he turned his back, she struck him with the Bronze Knight. His pocket watch rolled under the potting bench, cracked at 9:21.' },
      { bg: 'library', fx: ['sepia'], cast: [{ id: 'ginny', mood: 'worried', x: 22, anim: 'sneak' }], props: [{ e: '🛒', x: 40, y: 64, s: 9, anim: 'slide' }, { e: '🕯️', x: 82, y: 62, s: 8, anim: 'pop', delay: 2 }],
        caption: 'Her wheelbarrow went through the Library passage to the Clock Tower. Bolt the door. Light the candle timer. At 9:40, CRASH! And Ginny was eating cake, with a perfect alibi.' },
      { bg: 'gameroom', cast: [{ id: 'felix', mood: 'worried', x: 34 }, { id: 'ginny', mood: 'gasp', x: 74, dim: true }], props: [{ e: '🃏', x: 54, y: 40, s: 9, anim: 'pop' }, { e: '📱', x: 16, y: 48, s: 7, anim: 'pop', delay: 1 }],
        say: { who: 'felix', text: 'I was on a video call selling Dad’s chess set! Not my finest hour… but I didn’t do THIS.' },
        caption: 'She left one of Felix’s magic cards in the tower to frame him. But Felix was in the Game Room the whole time.' },
      ending('ginny', 'sad', 'Sixty years of anger, and one terrible night. The snowplow brought the police.'),
      solved,
    ]),
  };

  root.STORY_CARDS = root.STORY_CARDS || {};
  root.STORY_CARDS.marrowby = { intro: INTRO, reveal: REVEAL };
})(window);
