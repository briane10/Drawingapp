/* Case 1: Murder at Marrowby Manor.
   SPOILERS! Everything about all three endings is in this file.

   Text fields can be a plain string (true in every ending) or an object keyed by ending:
     { A: '...', B: '...', _: '...' }   '_' = every other ending; a missing key = not in that ending.
   A statement's `lie` says in which ending(s) it is a lie ('*' = all endings), which clues
   prove it (`by`), and what the suspect admits when caught (`truth`). */
(function (root) {
  'use strict';

  const CASE = {
    id: 'marrowby',
    title: 'Murder at Marrowby Manor',
    victim: 'Grandpa Ozzie Marrowby',

    suspects: [
      { id: 'victoria', name: 'Victoria Marrowby', short: 'Victoria', emoji: '👩‍💼', role: 'Ozzie’s daughter', blurb: 'Runs Marrowby Games. Sharp, busy, and always on her phone.' },
      { id: 'felix', name: 'Felix Marrowby', short: 'Felix', emoji: '🎩', role: 'Ozzie’s son', blurb: 'A stage magician whose shows keep getting cancelled.' },
      { id: 'ginny', name: 'Aunt Ginny Marrowby', short: 'Aunt Ginny', emoji: '🌻', role: 'Ozzie’s little sister', blurb: 'Grows rare orchids in the Greenhouse. Sweet… mostly.' },
      { id: 'bianca', name: 'Chef Bianca Bell', short: 'Chef Bianca', emoji: '👩‍🍳', role: 'The family cook', blurb: 'Has cooked for the Marrowbys for 20 years. Famous for her cocoa.' },
      { id: 'lola', name: 'Lola Quill', short: 'Lola', emoji: '✏️', role: 'Ozzie’s assistant', blurb: 'Young, brilliant, and Ozzie’s puzzle-designing partner.' },
      { id: 'rex', name: 'Rex Hartley', short: 'Rex', emoji: '🎲', role: 'Ozzie’s rival', blurb: 'A rival game designer. He and Ozzie have feuded for 40 years.' },
    ],
    witnesses: [
      { id: 'pembrook', name: 'Pembrook the Butler', short: 'Pembrook', emoji: '🤵', role: 'The butler (witness)', blurb: 'Has served the Marrowbys for 50 years. Notices everything.' },
    ],
    methods: [
      { id: 'weight', name: 'Falling Clock Weight', emoji: '⚙️' },
      { id: 'cocoa', name: 'Poisoned Cocoa', emoji: '☕' },
      { id: 'box', name: 'Trick Puzzle Box', emoji: '🎁' },
      { id: 'knight', name: 'Bronze Knight Trophy', emoji: '♞' },
      { id: 'cord', name: 'Curtain Cord', emoji: '🪢' },
    ],
    rooms: [
      { id: 'ballroom', name: 'Ballroom', emoji: '🎂' },
      { id: 'library', name: 'Library', emoji: '📚' },
      { id: 'study', name: 'Study', emoji: '🖋️' },
      { id: 'kitchen', name: 'Kitchen', emoji: '🍳' },
      { id: 'greenhouse', name: 'Greenhouse', emoji: '🌿' },
      { id: 'gameroom', name: 'Game Room', emoji: '♟️' },
      { id: 'cellar', name: 'Cellar', emoji: '🕯️' },
      { id: 'tower', name: 'Clock Tower', emoji: '🕰️' },
    ],
    motives: [
      { id: 'inherit', name: 'The inheritance', emoji: '💰' },
      { id: 'secret', name: 'Keep a secret hidden', emoji: '🤐' },
      { id: 'revenge', name: 'Revenge for a stolen idea', emoji: '🧩' },
      { id: 'debts', name: 'Pay off debts', emoji: '💸' },
      { id: 'protect', name: 'Protect someone else', emoji: '🛡️' },
    ],

    // framed = the innocent suspect the culprit tried to blame. staged = the fake method everyone sees first.
    endings: {
      A: { culprit: 'lola', method: 'box', room: 'study', motive: 'secret', framed: 'rex', staged: 'weight' },
      B: { culprit: 'victoria', method: 'cocoa', room: 'library', motive: 'inherit', framed: 'bianca', staged: 'weight' },
      C: { culprit: 'ginny', method: 'knight', room: 'greenhouse', motive: 'revenge', framed: 'felix', staged: 'weight' },
    },

    intro: [
      'Marrowby Manor. Saturday night. A snowstorm has buried every road for miles.',
      'Grandpa Ozzie Marrowby, the most famous puzzle-maker in the world, turned 80 tonight. At dinner he tapped his glass and said: “At midnight, I will change my will. And one of you is in for a very big surprise.”',
      'At 9:10 he left the Ballroom. At 9:40 a terrible CRASH rang out from the Clock Tower. At 10:00, Pembrook the butler broke down the bolted tower door… and found Grandpa Ozzie beside the fallen clock weight. He was gone.',
      'It looks like an accident. But Grandpa Ozzie always said: “Nothing is ever an accident in a Marrowby puzzle.”',
      'You, his grandchildren, have just arrived through the snow. The police can’t get here until the snowplow comes at midnight. Six suspects. One culprit. Ninety minutes.',
      'Let the investigation begin.',
    ],

    // What happens at the start of each round. Picked by how many rounds the game has.
    developments: {
      start: 'The snow is too deep for the police. The snowplow won’t reach Marrowby Manor until midnight. Search the rooms. Question the suspects. Trust no one.',
      watch: 'Pembrook clears his throat. “Forgive me. The master’s gold pocket watch is missing from his chain. He never went anywhere without it.”',
      lights: 'The lights flicker. A cold draft blows through the Library… and up in the Clock Tower. Some secrets in this house are hidden behind the walls.',
      whisper: 'A whisper in the hallway: “The tower crashed at 9:40… but did anyone actually SEE Grandpa Ozzie alive after 9:10?”',
      plow: 'Far down the hill, yellow lights blink through the snow. The snowplow is coming. Start putting the pieces together.',
      hunch: 'Pembrook polishes a spoon very slowly. “In my experience, the person with the best alibi is not always the most innocent.”',
      last: 'Fifteen minutes to midnight. Last chance to search, question, and catch a lie.',
    },
    developmentOrder: {
      5: ['start', 'watch', 'lights', 'plow', 'last'],
      6: ['start', 'watch', 'lights', 'whisper', 'plow', 'last'],
      7: ['start', 'watch', 'lights', 'whisper', 'hunch', 'plow', 'last'],
    },

    clues: [
      // ---- Clock Tower ----
      { id: 'tw_scene', room: 'tower', unlock: 1, title: 'The Scene', text: 'The great tower clock stopped at exactly 9:40. Its huge iron weight lies on the floor beside Grandpa Ozzie, as if it fell on him. The door was bolted from the inside. Pembrook had to break it down.' },
      { id: 'tw_body', room: 'tower', unlock: 1, title: { A: 'Ozzie’s Hand', B: 'Ozzie’s Sweater', C: 'A Closer Look' }, text: {
        A: 'There’s a tiny red pinprick on Ozzie’s right thumb, as if he pricked it on something sharp. Strange: there’s nothing sharp up here.',
        B: 'A few brown drips on Ozzie’s sweater. They smell like cocoa… with something sharp and bitter underneath.',
        C: 'The clock weight is lying next to Ozzie, not on top of him. And there’s a bump on the BACK of his head, as if someone hit him from behind.',
      } },
      { id: 'tw_plant', room: 'tower', unlock: 1, title: { A: 'Something Shiny', B: 'Crumpled Paper', C: 'A Playing Card' }, text: {
        A: 'Under the clock gears: a gold cufflink engraved “R.H.”',
        B: 'A crumpled kitchen order slip in the corner: “Cocoa for Mr. M. — B.B.”',
        C: 'Under Ozzie’s hand: an Ace of Spades with a gold star on the back. It’s from the trick deck Felix uses in his magic act.',
      } },
      { id: 'tw_timer', room: 'tower', unlock: 2, title: 'Burned Candle', text: 'Tied to the clock’s latch: a scorched string and a melted candle stub. Someone built a timer! When the candle burned down, it burned through the string and dropped the weight. The crash at 9:40 could have happened with NOBODY in the room.' },
      { id: 'tw_door', room: 'tower', unlock: 3, title: 'Behind the Tapestry', text: 'Behind a dusty tapestry: a narrow hidden door. Cold air flows through it. A secret passage! That’s how someone could leave a room bolted from the inside.' },

      // ---- Ballroom ----
      { id: 'bl_cake', room: 'ballroom', unlock: 1, title: 'The Birthday Cake', text: 'An untouched cake with 80 candles. Pembrook’s serving list: cake served here at 9:40 to Victoria, Lola, and Aunt Ginny. Rex arrived at 9:48. Felix and Chef Bianca never came.' },
      { id: 'bl_napkin', room: 'ballroom', unlock: 1, title: 'Ozzie’s Napkin', text: 'Ozzie’s chair is pushed back. On his napkin, in his handwriting: “9:10. Must have a word with someone about the midnight surprise.”' },
      { id: 'bl_memo', room: 'ballroom', unlock: 2, title: 'Rex’s Phone', text: 'Rex’s phone is lying on the piano. A voice memo called “Speech practice” runs from 9:10 to 9:45. Rex talks the whole time, and you can hear the guest-wing grandfather clock chime 9:30 right next to him. He was nowhere near the tower.' },
      { id: 'bl_coat', room: 'ballroom', unlock: 3, title: 'The Coat Rack', text: {
        A: 'Rex’s coat hangs on the rack. One sleeve still has its gold “R.H.” cufflink. The other sleeve’s cufflink has been snipped off. The thread was cut with scissors!',
        _: 'Coats, scarves, and Rex’s fancy coat with both gold “R.H.” cufflinks still on the sleeves.',
      } },

      // ---- Library ----
      { id: 'lb_fire', room: 'library', unlock: 1, title: 'By the Fire', text: 'The fire has burned low. Victoria’s book lies open on one armchair. A fat orange cat is asleep in the other one.' },
      { id: 'lb_cup', room: 'library', unlock: 1, title: { B: 'A Teacup', _: 'The Side Table' }, text: {
        B: 'On the side table: a Library teacup (not a kitchen mug) with cocoa dregs in the bottom. It smells strangely bitter.',
        _: 'A tidy side table with a reading lamp and a bowl of peppermints. Nothing on it was touched tonight.',
      } },
      { id: 'lb_passage', room: 'library', unlock: 3, title: 'A Loose Book', text: 'One book sticks out: “Secret Passages of Old England.” Pull it and… CLICK! The whole bookshelf swings open. A narrow passage climbs toward the Clock Tower.' },
      { id: 'lb_watch', room: 'library', unlock: 3, title: 'Under the Armchair', text: { B: 'Ozzie’s gold pocket watch! The glass is cracked and the hands are frozen at 9:21.' } },

      // ---- Study ----
      { id: 'st_puzzle', room: 'study', unlock: 1, title: 'The Midnight Puzzle', text: 'An envelope: “For my grandchildren. Open at midnight.” Inside is one line of code: WKH ZDWFK QHYHU OLHV. Under it Ozzie drew a tiny arrow: ← 3' },
      { id: 'st_box', room: 'study', unlock: 1, title: 'A Puzzle Box', text: {
        A: 'A beautiful wooden puzzle box. Inside the lid: a tiny hidden needle on a spring. Its tip is coated with something dark.',
        _: 'A wooden puzzle box. You solve it and… POP! A paper snake springs out. Ha! Just a harmless joke box.',
      } },
      { id: 'st_will', room: 'study', unlock: 2, title: 'The New Will', text: {
        B: 'Ozzie’s new will: “Marrowby Games goes to Lola Quill.” Victoria gets only the old piano. Stuck to it is a note in Victoria’s handwriting: “You can’t do this to me, Father!”',
        _: 'Ozzie’s new will: “Marrowby Games goes to Lola Quill.” In the margin, in Ozzie’s writing: “Victoria asked me to do this. She wants to be a painter at last. So proud of her!”',
      } },
      { id: 'st_letter', room: 'study', unlock: 2, title: { A: 'An Unsent Letter', _: 'Design Sketches' }, text: {
        A: 'A letter in Ozzie’s handwriting, never sent: “Lola, I know you have been secretly selling our Spiral Maze designs to Rex’s company. At midnight, everyone will know.”',
        _: 'Stacks of puzzle sketches, each signed “O.M. & L.Q.” On one, Ozzie wrote: “Lola is the best partner I ever had.”',
      } },
      { id: 'st_scuff', room: 'study', unlock: 3, title: 'Scuff Marks', text: { A: 'Two long scuff marks on the rug lead from the desk to the door that opens into the Library.' } },
      { id: 'st_watch', room: 'study', unlock: 3, title: 'Behind the Desk', text: { A: 'Ozzie’s gold pocket watch! The glass is cracked and the hands are frozen at 9:21.' } },

      // ---- Kitchen ----
      { id: 'kt_order', room: 'kitchen', unlock: 1, title: 'The Order Book', text: 'Chef Bianca’s order book: “Cocoa for Mr. M. Blue OZ mug. Served 8:45 in the Ballroom.” Only ONE cocoa was made in this kitchen tonight.' },
      { id: 'kt_trash', room: 'kitchen', unlock: 1, title: { B: 'The Trash Can', _: 'Pembrook’s Checklist' }, text: {
        B: 'In the kitchen trash: an empty bottle of weed killer from the Greenhouse!',
        _: 'Pembrook’s cake checklist: “Light 80 candles with Chef, 9:10 to 9:30. ✓”',
      } },
      { id: 'kt_mug', room: 'kitchen', unlock: 2, title: 'The Dishwasher', text: 'The blue OZ mug is in the dishwasher. Pembrook says Ozzie brought it back himself at 9:05, empty, and said: “Delicious as always, Bianca!”' },
      { id: 'kt_soot', room: 'kitchen', unlock: 3, title: { B: 'A Closer Look at the Bottle', _: 'The Spice Rack' }, text: {
        B: 'The weed-killer bottle was wiped clean… except for black smudges of fireplace soot on the cap. There’s no fireplace in the Kitchen. But there is one in the Library.',
        _: 'Neat rows of spices, each labeled in Chef Bianca’s handwriting. No poison here, just a LOT of cinnamon.',
      } },

      // ---- Greenhouse ----
      { id: 'gh_orchids', room: 'greenhouse', unlock: 1, title: 'The Orchids', text: 'Rows and rows of orchids. The soil is still wet. Someone watered them tonight.' },
      { id: 'gh_shelf', room: 'greenhouse', unlock: 1, title: 'The Garden Shelf', text: {
        B: 'A gap on the shelf where the weed killer should be. The shelf label says “POISON! Keep away from food!”',
        _: 'Fertilizer, seed packets, and a bottle of weed killer, still sealed and covered in dust.',
      } },
      { id: 'gh_diary', room: 'greenhouse', unlock: 2, title: 'Ginny’s Diary', text: {
        C: '“Oswald stole my maze game when we were twelve and became famous. He never once said sorry. Tonight, he will pay for it.”',
        _: '“Oswald took the credit for our maze game when we were twelve. I was angry for years. But I forgave him long ago. He’s my big brother.”',
      } },
      { id: 'gh_knight', room: 'greenhouse', unlock: 2, title: { C: 'A Heavy Flowerpot', _: 'The Wheelbarrow' }, text: {
        C: 'Buried in a big flowerpot: the Bronze Knight trophy from the Game Room, smeared with soil.',
        _: 'Ginny’s wheelbarrow is parked in its corner, clean and dry.',
      } },
      { id: 'gh_tracks', room: 'greenhouse', unlock: 3, title: 'Muddy Tracks', text: { C: 'Muddy wheelbarrow tracks lead out of the Greenhouse, down the hall, and into the Library.' } },
      { id: 'gh_watch', room: 'greenhouse', unlock: 3, title: 'Under the Potting Bench', text: { C: 'Ozzie’s gold pocket watch! The glass is cracked and the hands are frozen at 9:21.' } },

      // ---- Game Room ----
      { id: 'gr_chess', room: 'gameroom', unlock: 1, title: 'The Chess Set', text: 'Ozzie’s famous antique gold chess set… wait. The pieces are plastic, painted gold. It’s a FAKE!' },
      { id: 'gr_knight', room: 'gameroom', unlock: 1, title: 'The Trophy Shelf', text: {
        C: 'An empty spot on the trophy shelf, with a clean outline in the dust. The heavy Bronze Knight trophy is missing!',
        _: 'The heavy Bronze Knight trophy sits on its shelf under a thick layer of dust. Nobody has moved it in months.',
      } },
      { id: 'gr_phone', room: 'gameroom', unlock: 2, title: 'Felix’s Phone', text: 'Felix’s phone is wedged in the sofa cushions. It shows a video call with “Chess Buyer” from 9:18 to 9:44, filmed right here in the Game Room.' },

      // ---- Cellar ----
      { id: 'cl_note', room: 'cellar', unlock: 1, title: 'A Sticky Note', text: 'On the wall by the stairs, in Chef Bianca’s handwriting: “Call TV producer, 9:30!! Only place with signal!”' },
      { id: 'cl_cord', room: 'cellar', unlock: 1, title: 'Spare Curtain Cords', text: 'A box of spare curtain cords. Pembrook’s label says every curtain in the house was checked this morning, and all the cords are accounted for.' },
      { id: 'cl_phone', room: 'cellar', unlock: 2, title: 'Bianca’s Apron', text: 'Chef Bianca’s apron hangs on a hook. In the pocket, her phone shows a call to “Cooking Show Producer” from 9:31 to 9:52.' },
      { id: 'cl_wall', room: 'cellar', unlock: 3, title: 'A Dead End', text: 'Behind a wine rack: an old passage door… bricked up a hundred years ago. A dead end.' },
    ],

    statements: {
      pembrook: [
        { id: 'p1', unlock: 1, text: 'I found the master at 10:00. The tower door was bolted from the inside. I had to break it down with my shoulder. At my age!' },
        { id: 'p2', unlock: 1, text: 'From 9:10 until 9:30 I was in the Kitchen with Chef Bianca, lighting all 80 candles. She never left my sight.' },
        { id: 'p3', unlock: 1, text: 'The master left the Ballroom at 9:10. He said he needed “a word with someone about the midnight surprise.” He didn’t say who.' },
        { id: 'p4', unlock: 2, text: 'At 9:40 I served cake in the Ballroom to Miss Victoria, Miss Lola, and Miss Ginny. Mr. Hartley came in at 9:48, quite out of breath.' },
        { id: 'p5', unlock: 2, text: 'One more thing. The master’s gold pocket watch was missing from its chain. He never went anywhere without it.' },
      ],
      victoria: [
        { id: 'v1', unlock: 1, text: 'At 9:20 I was reading alone in the Library. Father never came in.',
          lie: { B: { by: ['lb_cup', 'lb_watch'], truth: '…All right. Father came into the Library at 9:15. I brought him a cup of cocoa. We talked. That’s all, I swear!' } } },
        { id: 'v2', unlock: 1, text: {
          B: 'Father’s new will? I had no idea he was changing it.',
          _: 'The new will? It was my idea. I don’t want to run Marrowby Games anymore. I want to paint.',
        }, lie: { B: { by: ['st_will'], truth: 'Fine. I read the will. He was giving MY company to Lola. I was furious… but being furious isn’t a crime!' } } },
        { id: 'v3', unlock: 2, text: 'At 9:40 I was eating cake in the Ballroom with Lola and Aunt Ginny. Ask Pembrook.' },
      ],
      lola: [
        { id: 'l1', unlock: 1, text: 'At 9:20 I was alone in the Study, wrapping Ozzie’s midnight puzzle. He never came in.',
          lie: { A: { by: ['st_watch', 'st_box'], truth: 'He… came in at 9:15. He’d found out about the designs I sold. He looked so disappointed. I didn’t mean… I…  (Lola stops talking.)' } } },
        { id: 'l2', unlock: 2, text: {
          A: 'I saw Rex sneaking up the tower stairs at 9:35. I’m sure of it!',
          _: 'Rex offered me a job at his company last month. I said no. I’d never leave Ozzie.',
        }, lie: { A: { by: ['bl_memo'], truth: 'Okay… I didn’t see Rex. I made that up.' } } },
        { id: 'l3', unlock: 2, text: 'At 9:40 I was in the Ballroom with Victoria and Aunt Ginny, waiting for cake.' },
      ],
      ginny: [
        { id: 'g1', unlock: 1, text: 'At 9:20 I was alone in the Greenhouse, watering my orchids. Oswald never came in.',
          lie: { C: { by: ['gh_watch', 'gh_knight', 'gh_tracks'], truth: '…He came in at 9:15. I showed him what I’d read in his old journals. And he LAUGHED.' } } },
        { id: 'g2', unlock: 2, text: {
          C: 'I heard Felix creeping around in the secret passage at 9:30. That boy knows every passage in this house!',
          _: 'Felix grew up exploring the secret passages. But he’s a gentle boy. He cries at card tricks.',
        }, lie: { C: { by: ['gr_phone'], truth: 'I… didn’t really hear Felix. I’m sorry, Felix.' } } },
        { id: 'g3', unlock: 2, text: 'That old maze business? Oswald and I made our first game together as children. I forgave him for taking the credit long ago.',
          lie: { C: { by: ['gh_diary'], truth: 'Forgave him? I waited sixty years for a “sorry.” Sixty years!' } } },
      ],
      felix: [
        { id: 'f1', unlock: 1, text: 'At 9:20? I was, um, in the Game Room. Just admiring Dad’s chess set. Nice set. Very… real.' },
        { id: 'f2', unlock: 1, text: 'I didn’t touch the chess set. Why would anybody touch the chess set?',
          lie: { '*': { by: ['gr_chess'], truth: 'OKAY! I sold the real one. I owe a lot of money. I was on a video call with the buyer from 9:18 to 9:44, right there in the Game Room. I’m a terrible son… but I’m not a murderer.' } } },
        { id: 'f3', unlock: 2, text: 'Sure, I know the secret passages. Dad showed me the Library one when I was eight. Every Marrowby kid knows it.' },
      ],
      bianca: [
        { id: 'b1', unlock: 1, text: 'I made the master’s cocoa at 8:45, in his blue OZ mug, like every night for twenty years.' },
        { id: 'b2', unlock: 1, text: 'After lighting the candles, I stayed in the Kitchen for the rest of the night.',
          lie: { '*': { by: ['cl_note', 'cl_phone'], truth: 'Fine! At 9:30 I snuck down to the Cellar, the only place with phone signal, to call a TV producer. I’m trying out for a cooking show! Please don’t tell anyone!' } } },
        { id: 'b3', unlock: 2, text: 'Weed killer? I would NEVER keep poison in my kitchen. That stuff stays on Ginny’s garden shelf.' },
      ],
      rex: [
        { id: 'r1', unlock: 1, text: 'From 9:10 I was in my guest room, practicing my birthday speech. I recorded it on my phone… which I seem to have left somewhere.' },
        { id: 'r2', unlock: 1, text: 'Ozzie and I were rivals for forty years. Tonight I came to make peace, and to ask if he’d merge our companies.' },
        { id: 'r3', unlock: 2, text: {
          A: 'That cufflink is mine, but I hung my coat on the Ballroom rack at 7:00 and never touched it again.',
          _: 'I wouldn’t set foot in that creepy clock tower for a million dollars.',
        } },
        { id: 'r4', unlock: 3, text: {
          A: 'I’ll admit it. For a year, someone at Marrowby Games has been sending my company Ozzie’s designs. The notes were signed with one letter: “L.”',
          _: 'Buy stolen designs? Never. Ozzie would have had my head on a platter.',
        } },
      ],
    },

    reveal: {
      A: [
        'It was LOLA QUILL. In the STUDY. With the TRICK PUZZLE BOX. To KEEP A SECRET HIDDEN.',
        'For a whole year, Lola had been secretly selling Ozzie’s designs to Rex’s company, signing her notes with an “L.” Ozzie found out, and he planned to tell everyone at midnight.',
        'At 9:15 he came to the Study to confront her. Lola handed him his own puzzle box, but she had hidden a needle of sleeping poison in the lid. Ozzie collapsed at 9:21, and his pocket watch cracked when he fell.',
        'Lola moved him through the Library’s secret passage to the Clock Tower, bolted the door from the inside, tied a candle timer to the clock weight, and slipped back out through the passage. At 9:40 the weight crashed down… while Lola sat in the Ballroom with a slice of cake and a perfect alibi.',
        'To be extra safe, she snipped a cufflink off Rex’s coat, dropped it in the tower, and told everyone she saw him on the stairs. But Rex was recording his speech the whole time. And as Grandpa Ozzie’s puzzle said: THE WATCH NEVER LIES. 9:21.',
      ],
      B: [
        'It was VICTORIA MARROWBY. In the LIBRARY. With the POISONED COCOA. For THE INHERITANCE.',
        'Victoria found Ozzie’s new will: Marrowby Games, her whole life’s work, would go to Lola. She took the weed killer from Aunt Ginny’s greenhouse shelf.',
        'At 9:15 she brought her father a “fresh cup of cocoa” in the Library, in a Library teacup. Ozzie collapsed at 9:21, and his pocket watch cracked under the armchair.',
        'Victoria moved him through the bookshelf passage to the Clock Tower, bolted the door, rigged a candle timer to the clock weight, and hurried to the Ballroom. At 9:40, CRASH! There she was, eating cake, with a perfect alibi.',
        'Then she framed Chef Bianca: an empty poison bottle in the kitchen trash, and a cocoa slip in the tower. But Bianca’s cocoa came back empty at 9:05, with Ozzie perfectly fine. And the bottle had soot on it from the Library fireplace. THE WATCH NEVER LIES. 9:21.',
      ],
      C: [
        'It was AUNT GINNY MARROWBY. In the GREENHOUSE. With the BRONZE KNIGHT TROPHY. For REVENGE FOR A STOLEN IDEA.',
        'Sixty years ago, Ginny and her big brother invented a maze game together. Oswald became famous and never gave her credit. When Ginny read his old journals, sixty years of anger boiled over.',
        'She took the Bronze Knight from the Game Room. At 9:15 Ozzie came to the Greenhouse, and she struck him from behind. He fell at 9:21, and his pocket watch rolled under the potting bench.',
        'Ginny wheeled him through the Library passage to the Clock Tower, bolted the door, rigged a candle timer to the clock weight, and hid the Knight in a flowerpot. At 9:40, CRASH! She was in the Ballroom, eating cake.',
        'She left one of Felix’s magic cards in the tower and claimed she heard him in the passage. But Felix was on a video call in the Game Room the whole time, selling the chess set. THE WATCH NEVER LIES. 9:21.',
      ],
    },
  };

  root.MYSTERY_CASES = root.MYSTERY_CASES || {};
  root.MYSTERY_CASES[CASE.id] = CASE;
})(typeof window !== 'undefined' ? window : globalThis);
