/* The course: worlds → lessons. Each lesson teaches one idea and has a practice exercise.
 * Exercise modes:
 *   trace     – draw over faint lines
 *   ghost     – connect the dots (lines are hidden)
 *   construct – some guides given, draw the rest
 *   flash     – see it for a few seconds, then draw it from memory
 *   copy      – reference on the left, draw it on the right
 *   circles   – freehand circles, scored for roundness
 *   value     – shade a value scale
 *   shade     – copy the light & shadow of a 3D form
 *   animal    – step-by-step animal, then draw it on your own
 *   free      – open project, you rate yourself with a checklist
 *   gesture   – timed quick poses
 */
(function (DA) {
  'use strict';

  const SKILLS = {
    line: { name: 'Line Control', emoji: '✏️' },
    shape: { name: 'Shapes', emoji: '🔷' },
    seeing: { name: 'Seeing', emoji: '👀' },
    form: { name: '3D Form', emoji: '🧊' },
    perspective: { name: 'Perspective', emoji: '🏙️' },
    light: { name: 'Light & Shadow', emoji: '🌗' },
    figure: { name: 'Figures', emoji: '🏃' },
    animals: { name: 'Animals', emoji: '🐾' },
    create: { name: 'Creativity', emoji: '🎨' },
  };

  const RANKS = [
    { xp: 0, name: 'Doodler', emoji: '🥚' },
    { xp: 300, name: 'Scribbler', emoji: '🐣' },
    { xp: 900, name: 'Sketcher', emoji: '✏️' },
    { xp: 2000, name: 'Illustrator', emoji: '🖍️' },
    { xp: 3800, name: 'Artist', emoji: '🎨' },
    { xp: 6500, name: 'Expert Artist', emoji: '🏅' },
    { xp: 10000, name: 'Master', emoji: '🏆' },
    { xp: 15000, name: 'Legend', emoji: '🐉' },
  ];

  const W = [];

  // ===================== WORLD 1 =====================
  W.push({
    id: 'w1', name: 'Line Land', emoji: '✏️', color: '#ff9f43',
    blurb: 'Every drawing is made of lines. Learn to make them smooth, straight and confident.',
    lessons: [
      {
        id: 'w1-lines', title: 'Super Straight Lines', emoji: '📏', skill: 'line', xp: 60,
        intro: 'Straight lines look easy, but they are a superpower. Let\'s train your arm!',
        theory: `
<p>Most beginners draw by moving only their <b>fingers</b>. That makes short, wobbly lines. Pros move from the <b>elbow</b> or <b>shoulder</b> for long lines.</p>
<ul>
<li><b>Lock your wrist</b> and move your whole arm, like you are sliding it across a table.</li>
<li><b>Look where the line is going</b>, not at the pencil tip.</li>
<li><b>Go a bit faster.</b> Slow lines wobble. Confident lines are smooth.</li>
</ul>
<p class="tip">💡 It's OK if it's not perfect — speed and smoothness come first, accuracy comes with practice.</p>`,
        ex: { mode: 'trace', gen: 'lines', params: { n: 6 }, rounds: 3, tol: [6, 24], say: 'Trace over each line in ONE smooth stroke.' },
      },
      {
        id: 'w1-ghost', title: 'Ghosting: Dot to Dot', emoji: '👻', skill: 'line', xp: 70,
        intro: 'Learn the secret trick artists use to draw lines that land exactly where they want.',
        theory: `
<p><b>Ghosting</b> means practicing the motion <i>before</i> you touch the paper.</p>
<ol>
<li><b>Place</b>: look at your start dot and your end dot.</li>
<li><b>Ghost</b>: hover your pencil over the screen and move along the path 2–3 times without drawing.</li>
<li><b>Go</b>: put the pencil down and draw in one smooth stroke, eyes on the end dot.</li>
</ol>
<p class="tip">💡 With Apple Pencil you can hover right over the glass — perfect for ghosting!</p>`,
        ex: { mode: 'ghost', gen: 'lines', params: { n: 6 }, rounds: 3, tol: [7, 26], say: 'Connect the two dots that have the <b>same color and number</b> (1 to 1, 2 to 2…) with one straight line.' },
      },
      {
        id: 'w1-curves', title: 'Swoopy Curves', emoji: '〰️', skill: 'line', xp: 70,
        intro: 'Curves give drawings life. Animals, hair and water are all made of curves.',
        theory: `
<p>A good curve is <b>smooth</b> — no bumps or corners. There are two kinds:</p>
<ul><li><b>C-curves</b> bend one way, like a smile.</li><li><b>S-curves</b> bend one way then the other, like a snake.</li></ul>
<p>Draw curves in one motion and keep your arm loose. If a curve is hard in one direction, turn the page — it's allowed!</p>`,
        ex: { mode: 'trace', gen: 'curves', params: { n: 4 }, rounds: 3, tol: [7, 26], say: 'Trace each curve in one smooth swoop.' },
      },
      {
        id: 'w1-circles', title: 'Round Circles', emoji: '⭕', skill: 'line', xp: 80,
        intro: 'A perfect freehand circle is the classic artist challenge. How round can you go?',
        theory: `
<p>Circles are the building block of heads, eyes, wheels, balls and animals.</p>
<ul>
<li>Draw from your <b>shoulder</b> in one smooth motion.</li>
<li>Try <b>going around 2–3 times in the air</b> first, then put the pencil down.</li>
<li>Close the circle — the end should meet the start.</li>
</ul>
<p class="tip">💡 Each circle is scored for roundness. Can you get 90+?</p>`,
        ex: { mode: 'circles', count: 4, rounds: 3, say: 'Draw 4 circles anywhere on the page. One stroke each!' },
      },
      {
        id: 'w1-fish', title: 'Animal: Fish', emoji: '🐟', skill: 'animals', xp: 100, animal: 'fish',
        intro: 'Your first animal! A fish is just an oval and a triangle. You can do this!',
        theory: `<p>Almost every animal starts with <b>simple shapes</b>. Look at an animal and ask: "What shapes is it made of?"</p><p>A fish = an <b>oval</b> body + a <b>triangle</b> tail + a <b>circle</b> eye.</p><p>Follow each step, then try drawing the whole fish on your own!</p>`,
        ex: { mode: 'animal' },
      },
      {
        id: 'w1-snail', title: 'Animal: Snail', emoji: '🐌', skill: 'animals', xp: 100, animal: 'snail',
        intro: 'Spirals and squishy curves — let\'s draw a snail.',
        theory: `<p>A spiral is a circle that keeps getting bigger. Start in the middle and keep the gaps between the rings even.</p><p>The snail's body is one long curve — draw it in a single swoop.</p>`,
        ex: { mode: 'animal' },
      },
    ],
  });

  // ===================== WORLD 2 =====================
  W.push({
    id: 'w2', name: 'Shape Town', emoji: '🔷', color: '#54a0ff',
    blurb: 'Everything is made of shapes. Learn to see them and draw them from memory.',
    lessons: [
      {
        id: 'w2-ellipses', title: 'Ellipses (Squashed Circles)', emoji: '🥚', skill: 'shape', xp: 80,
        intro: 'An ellipse is a circle seen at an angle — like the top of a cup.',
        theory: `
<p>Look at the top of a glass from the side and it's not a circle — it's an <b>ellipse</b>.</p>
<ul><li>Ellipses have a <b>long axis</b> and a <b>short axis</b>. They are symmetrical on both.</li>
<li>The ends are <b>round</b>, never pointy like a lemon.</li>
<li>Draw them like circles: from the shoulder, going around a couple of times.</li></ul>`,
        ex: { mode: 'trace', gen: 'ellipses', params: { n: 4 }, rounds: 3, tol: [7, 26], say: 'Trace each ellipse. Keep the ends round!' },
      },
      {
        id: 'w2-memory', title: 'Shape Memory', emoji: '🧠', skill: 'shape', xp: 90,
        intro: 'Look closely, then draw from memory. This trains your visual memory — super important!',
        theory: `<p>Artists constantly look at a subject, then look down to draw. The better your <b>visual memory</b>, the less you need to look back.</p>
<p>When you see the shapes: notice <b>where</b> each one is, <b>how big</b> it is, and its <b>angle</b>. Say it in your head: "big triangle top left, small circle in the middle…"</p>`,
        ex: { mode: 'flash', gen: 'shapes', params: { n: 3 }, rounds: 3, flash: 5, tol: [10, 40], say: 'Memorize the shapes! Then draw them in the same places.' },
      },
      {
        id: 'w2-copy', title: 'Copy the Shape', emoji: '🪞', skill: 'shape', xp: 90,
        intro: 'Copy a shape by looking at it. This is how drawing from real life works!',
        theory: `<p>To copy any shape, compare things:</p>
<ul><li><b>Angles</b>: is this edge more flat or more tilted?</li><li><b>Lengths</b>: is this side longer or shorter than that one?</li><li><b>Positions</b>: which corner is the highest? The lowest?</li></ul>
<p>Draw <b>lightly</b> first, check, then darken the right lines.</p>`,
        ex: { mode: 'copy', gen: 'polygon', params: {}, rounds: 3, tol: [9, 34], say: 'Copy the shape on the right side. Same size!' },
      },
      {
        id: 'w2-cat', title: 'Animal: Cat Face', emoji: '🐱', skill: 'animals', xp: 110, animal: 'cat',
        intro: 'A cute cat face from ovals and triangles.',
        theory: `<p>Faces are about <b>placement</b>. On a cat: the eyes sit about halfway down the head, the nose sits between and below them, and the ears sit on the top corners.</p><p>Small changes in spacing change the whole expression — try it!</p>`,
        ex: { mode: 'animal' },
      },
      {
        id: 'w2-owl', title: 'Animal: Owl', emoji: '🦉', skill: 'animals', xp: 110, animal: 'owl',
        intro: 'Big eyes, egg-shaped body — owls are great for practicing circles.',
        theory: `<p>The owl's body is an egg shape: wider at the bottom. Its huge eyes take up almost the whole top half of the body!</p><p><b>Pattern</b> (like feather marks) makes drawings look finished, but keep it simple: a few marks suggest a lot.</p>`,
        ex: { mode: 'animal' },
      },
    ],
  });

  // ===================== WORLD 3 =====================
  W.push({
    id: 'w3', name: 'Seeing Forest', emoji: '👀', color: '#10ac84',
    blurb: 'Drawing is 50% seeing. Train your eyes to see angles, proportions and edges.',
    lessons: [
      {
        id: 'w3-angles', title: 'Angles & Directions', emoji: '📐', skill: 'seeing', xp: 90,
        intro: 'Can you copy a zig-zag exactly? Your eyes will learn to measure angles.',
        theory: `<p>Your brain likes to "straighten" angles that are really tilted. Fight it by comparing every line to a <b>straight up-and-down</b> or <b>flat</b> line.</p>
<p>Ask: "Is this line closer to flat, or closer to standing up?" Then copy exactly what you see.</p>`,
        ex: { mode: 'copy', gen: 'angles', params: { n: 5 }, rounds: 3, tol: [9, 34], say: 'Copy the zig-zag line on the right side.' },
      },
      {
        id: 'w3-contour', title: 'Contour Copy', emoji: '🍃', skill: 'seeing', xp: 100,
        intro: 'Copy a wiggly organic shape — like a leaf or a puddle.',
        theory: `<p>A <b>contour</b> is the outside edge of something. Follow it slowly with your eyes and your pencil at the same speed, as if you were an ant walking along the edge.</p>
<p>Notice the <b>bumps</b> and <b>dips</b>: which bump is biggest? Where is the deepest dip?</p>`,
        ex: { mode: 'copy', gen: 'blob', params: {}, rounds: 3, tol: [10, 36], say: 'Copy the outline on the right. Follow every bump!' },
      },
      {
        id: 'w3-blind', title: 'Blind Contour Challenge', emoji: '🙈', skill: 'seeing', xp: 80,
        intro: 'Draw your hand WITHOUT looking at the screen. Silly results, serious skill!',
        theory: `<p>In a <b>blind contour</b> you look only at your subject — never at your drawing. It forces your eyes to really study the edges.</p>
<p>The drawing will look funny. That's fine — this exercise is about <b>looking</b>, not about the result. Professional artists do this to warm up!</p>`,
        ex: { mode: 'free', timer: 120, say: 'Put your other hand in front of you. Draw it slowly without looking at the screen!', checklist: ['I kept my eyes on my hand (no peeking!)', 'I drew slowly, following the edges', 'I included the fingernails or wrinkles', 'I drew for the full 2 minutes'] },
      },
      {
        id: 'w3-bird', title: 'Animal: Little Bird', emoji: '🐦', skill: 'animals', xp: 120, animal: 'bird',
        intro: 'Your first animal with construction shapes — draw light, then draw over.',
        theory: `<p>Real artists start with <b>light construction shapes</b> and draw the final lines on top. Use the <b>Light</b> pencil setting for the blue dashed shapes.</p>
<p>Then draw the outline <b>over</b> the shapes, smoothing them together. The construction lines help you get size and position right.</p>`,
        ex: { mode: 'animal' },
      },
      {
        id: 'w3-turtle', title: 'Animal: Turtle', emoji: '🐢', skill: 'animals', xp: 120, animal: 'turtle',
        intro: 'A dome shell, stubby legs and a happy face.',
        theory: `<p>Notice which legs are <b>in front</b> and which are <b>behind</b> — the ones further away are a little smaller and higher. That simple trick makes things look 3D!</p>`,
        ex: { mode: 'animal' },
      },
    ],
  });

  // ===================== WORLD 4 =====================
  W.push({
    id: 'w4', name: 'Form Mountains', emoji: '🧊', color: '#a55eea',
    blurb: 'Flat shapes become 3D forms: boxes, cylinders and spheres — the secret behind every drawing.',
    lessons: [
      {
        id: 'w4-boxes', title: 'Draw a Box', emoji: '📦', skill: 'form', xp: 100,
        intro: 'If you can draw a box from any angle, you can draw almost anything.',
        theory: `<p>A box has <b>3 sets of parallel edges</b> (lines that go the same direction). In a drawing, each set points toward its own direction.</p>
<ul><li>You'll see at most <b>3 sides</b> of a box at once.</li><li>Edges further away look <b>a bit shorter</b>.</li></ul>
<p>Cars, houses, phones, even dog bodies — they are all boxes underneath.</p>`,
        ex: { mode: 'copy', gen: 'box', params: { through: false }, rounds: 3, tol: [9, 34], say: 'Copy the box on the right side.' },
      },
      {
        id: 'w4-through', title: 'Draw Through', emoji: '🔍', skill: 'form', xp: 110,
        intro: 'Pretend the box is made of glass and draw the hidden edges too.',
        theory: `<p><b>Drawing through</b> means drawing the parts you can't see (the dashed lines). It helps you understand the whole 3D form, so your drawings don't look flat.</p><p>Draw the hidden edges lightly.</p>`,
        ex: { mode: 'trace', gen: 'box', params: { through: true }, rounds: 3, tol: [7, 26], say: 'Trace the box, including the hidden (dashed) edges.' },
      },
      {
        id: 'w4-cylinders', title: 'Cylinders', emoji: '🥫', skill: 'form', xp: 110,
        intro: 'Cans, legs, tree trunks and necks are cylinders.',
        theory: `<p>A cylinder is two ellipses joined by two straight lines.</p>
<ul><li>The ellipse <b>further from your eye</b> looks rounder (fatter).</li><li>The side lines touch the <b>outer edges</b> of the ellipses.</li></ul>`,
        ex: { mode: 'copy', gen: 'cylinder', params: {}, rounds: 3, tol: [9, 34], say: 'Copy the cylinder on the right.' },
      },
      {
        id: 'w4-spheres', title: 'Spheres with Contours', emoji: '🌐', skill: 'form', xp: 110,
        intro: 'A ball looks like a flat circle — until you add contour lines.',
        theory: `<p>A sphere's outline is always a circle. <b>Contour lines</b> (like the lines on a globe) wrap around the surface and show which way it's turned.</p><p>These are the same lines you'll use on heads and animal bodies!</p>`,
        ex: { mode: 'trace', gen: 'sphere', params: { more: true }, rounds: 3, tol: [7, 26], say: 'Trace the sphere and its contour lines.' },
      },
      {
        id: 'w4-bunny', title: 'Animal: Bunny', emoji: '🐰', skill: 'animals', xp: 130, animal: 'bunny',
        intro: 'Think of the bunny as two balls — you\'re drawing in 3D now!',
        theory: `<p>Don't think "circle", think "<b>ball</b>". The bunny's body is a ball sitting on the ground, so the bottom flattens a bit where it sits.</p>`,
        ex: { mode: 'animal' },
      },
      {
        id: 'w4-penguin', title: 'Animal: Penguin', emoji: '🐧', skill: 'animals', xp: 130, animal: 'penguin',
        intro: 'Ovals inside ovals — a penguin!',
        theory: `<p>The penguin is an egg shape. The white belly shape <b>follows</b> the body shape, staying the same distance from the edge — that's what makes it look like it wraps around.</p>`,
        ex: { mode: 'animal' },
      },
    ],
  });

  // ===================== WORLD 5 =====================
  W.push({
    id: 'w5', name: 'Perspective City', emoji: '🏙️', color: '#ee5253',
    blurb: 'Make things look near and far. The rules of perspective unlock streets, rooms and cities.',
    lessons: [
      {
        id: 'w5-vp', title: 'Horizon & Vanishing Point', emoji: '🌅', skill: 'perspective', xp: 110,
        intro: 'Why do train tracks seem to meet in the distance? Let\'s find out.',
        theory: `<p>The <b>horizon line</b> is your eye level. Parallel lines going away from you seem to meet at a <b>vanishing point</b> (VP) on the horizon.</p>
<ul><li>Things <b>above</b> the horizon: you see their bottom.</li><li>Things <b>below</b> the horizon: you see their top.</li></ul>`,
        ex: { mode: 'ghost', gen: 'vpLines', params: { n: 6 }, rounds: 3, tol: [8, 28], say: 'Draw a line from each dot all the way to the vanishing point.' },
      },
      {
        id: 'w5-1pt', title: 'One-Point Boxes', emoji: '🧱', skill: 'perspective', xp: 120,
        intro: 'Turn flat rectangles into 3D boxes using one vanishing point.',
        theory: `<p>In <b>one-point perspective</b> the front of the box faces you (a normal rectangle). The sides go back toward the VP.</p>
<ol><li>Draw lines from each corner to the VP.</li><li>Decide how deep the box is.</li><li>Draw the back edges parallel to the front edges.</li></ol>`,
        ex: { mode: 'construct', gen: 'box1pt', params: { n: 3 }, rounds: 3, tol: [8, 30], say: 'The front of each box is given. Draw the edges going back toward the VP, then the back edges.' },
      },
      {
        id: 'w5-2pt', title: 'Two-Point Boxes', emoji: '🏢', skill: 'perspective', xp: 130,
        intro: 'Turn the box so a corner faces you — now there are two vanishing points.',
        theory: `<p>In <b>two-point perspective</b> a corner faces you. Lines going left go to the left VP; lines going right go to the right VP. Up-and-down lines stay straight up and down.</p><p>This is how buildings and cities are drawn!</p>`,
        ex: { mode: 'construct', gen: 'box2pt', params: { guideLines: true }, rounds: 3, tol: [8, 30], say: 'The front edge is given. Finish the box using both vanishing points.' },
      },
      {
        id: 'w5-ellipse', title: 'Circles in Perspective', emoji: '🛞', skill: 'perspective', xp: 130,
        intro: 'Put a circle inside a square in perspective — that\'s how wheels and plates work.',
        theory: `<p>A circle in perspective becomes an ellipse. To place it correctly, draw a square in perspective first; the circle touches the middle of each side.</p><p>The front half of the ellipse looks <b>a little bigger</b> than the back half.</p>`,
        ex: { mode: 'construct', gen: 'circleInSquare', params: {}, rounds: 3, tol: [8, 28], say: 'Draw the circle inside the square. It touches each side where the dashed lines cross the edges.' },
      },
      {
        id: 'w5-puppy', title: 'Animal: Puppy', emoji: '🐶', skill: 'animals', xp: 140, animal: 'puppy',
        intro: 'A sitting puppy with floppy ears.',
        theory: `<p>A sitting animal is like a pear: small at the top, big at the bottom. The front legs come straight down from the chest.</p><p>Draw the <b>head first</b>, then everything else is measured against it.</p>`,
        ex: { mode: 'animal' },
      },
    ],
  });

  // ===================== WORLD 6 =====================
  W.push({
    id: 'w6', name: 'Shadow Valley', emoji: '🌗', color: '#576574',
    blurb: 'Light and shadow make drawings look real. Learn values, shading and cast shadows.',
    lessons: [
      {
        id: 'w6-value5', title: 'Value Scale', emoji: '🎚️', skill: 'light', xp: 110,
        intro: '"Value" means how light or dark something is. Let\'s control it!',
        theory: `<p>A <b>value scale</b> goes from white to black in even steps. Being able to make any value on purpose is the key to shading.</p>
<ul><li>Use the <b>Light</b> pencil and build up layers for gentle values.</li><li>Use the <b>Dark</b> pencil (and press harder) for the darkest box.</li><li>Fill each box <b>evenly</b> — no white gaps.</li></ul>`,
        ex: { mode: 'value', steps: 5, rounds: 2, say: 'Shade the boxes from white (left) to black (right) in even steps.' },
      },
      {
        id: 'w6-hatch', title: 'Hatching & Cross-Hatching', emoji: '#️⃣', skill: 'light', xp: 100,
        intro: 'Make shading with lines! Comic artists and engravers use this.',
        theory: `<p><b>Hatching</b> = rows of parallel lines. Closer lines = darker.</p><p><b>Cross-hatching</b> = add another layer of lines at a different angle for even darker values.</p><p>Keep lines evenly spaced and the same direction within each layer.</p>`,
        ex: { mode: 'free', gen: 'hatchBoxes', params: { n: 4 }, say: 'Fill the 4 boxes: light hatching → dense hatching → cross-hatch → triple cross-hatch.', checklist: ['Each box is darker than the one before', 'My lines are parallel within each layer', 'The spacing is even', 'The lines stay inside the boxes'] },
      },
      {
        id: 'w6-sphere', title: 'Shading a Sphere', emoji: '🔮', skill: 'light', xp: 130,
        intro: 'Make a flat circle look like a real ball.',
        theory: `<p>Every lit form has these parts:</p>
<ul><li><b>Highlight</b> – the brightest spot, facing the light.</li><li><b>Light side</b> – gets lighter toward the light.</li><li><b>Core shadow</b> – the darkest band, where the form turns away from the light.</li><li><b>Reflected light</b> – a little lighter at the very edge of the shadow side.</li><li><b>Cast shadow</b> – the shadow on the ground. Darkest right under the object.</li></ul>`,
        ex: { mode: 'shade', gen: 'shadedSphere', rounds: 2, say: 'Shade the circle on the right to match the sphere on the left.' },
      },
      {
        id: 'w6-forms', title: 'Shading Cubes & Cylinders', emoji: '🧊', skill: 'light', xp: 140,
        intro: 'Flat sides and round sides catch light differently.',
        theory: `<p>A <b>cube</b> has flat sides, so each side gets one value: the side facing the light is lightest, the side facing away is darkest. The edges between sides are <b>sharp</b> changes in value.</p>
<p>A <b>cylinder</b> is round in one direction, so its value changes <b>smoothly</b> from light to dark around it, like a sphere — but in stripes.</p>`,
        ex: { mode: 'shade', gen: 'shadedRandom', rounds: 3, say: 'Shade the shape on the right to match the light and shadow on the left.' },
      },
      {
        id: 'w6-fox', title: 'Animal: Fox (with shading)', emoji: '🦊', skill: 'animals', xp: 150, animal: 'fox',
        intro: 'Draw a fox, then add shading to make it pop.',
        theory: `<p>Shading an animal works just like shading a sphere or cylinder: think of the body as simple forms, decide where the light comes from, and shade the sides facing away from it.</p>`,
        ex: { mode: 'animal' },
      },
    ],
  });

  // ===================== WORLD 7 =====================
  W.push({
    id: 'w7', name: 'Motion Plains', emoji: '🏃', color: '#ff6b81',
    blurb: 'Bodies in motion: proportions, gesture, and building figures and animals from forms.',
    lessons: [
      {
        id: 'w7-proportion', title: 'Body Proportions', emoji: '📏', skill: 'figure', xp: 130,
        intro: 'How tall is a person? Artists measure in heads!',
        theory: `<p>An adult is about <b>7½ to 8 heads</b> tall. Useful landmarks:</p>
<ul><li>Shoulders: about <b>2 heads</b> wide.</li><li>Elbows: at the <b>belly button</b>.</li><li>Wrists: at the <b>hips</b>.</li><li>Halfway point of the body: the <b>hips</b>.</li><li>Kids have bigger heads compared to their bodies (5–6 heads).</li></ul>`,
        ex: { mode: 'trace', gen: 'proportions', params: {}, rounds: 1, tol: [7, 26], say: 'Trace the 8-head figure. Notice where each part lands on the lines.' },
      },
      {
        id: 'w7-gesture', title: 'Gesture Drawing', emoji: '💃', skill: 'figure', xp: 120,
        intro: 'Capture a pose in 30 seconds! Fast, loose and full of energy.',
        theory: `<p><b>Gesture</b> is the movement or "action" of a pose. Start with the <b>line of action</b>: one curve that shows the main flow of the body, from head to feet.</p>
<ul><li>Don't draw details — there's no time!</li><li>Exaggerate the curve a little. Stiff is boring; flowing is alive.</li></ul>`,
        ex: { mode: 'gesture', gen: 'mannequin', count: 5, seconds: 30, say: 'Quick! Capture each pose in 30 seconds.' },
      },
      {
        id: 'w7-mannequin', title: 'Build a Mannequin', emoji: '🤸', skill: 'figure', xp: 140,
        intro: 'Build figures from simple shapes: ovals for the ribcage and hips, lines for limbs.',
        theory: `<p>A <b>mannequin</b> is a simple figure you can pose in any way:</p>
<ul><li>Head = oval. Ribcage = big egg. Pelvis = smaller bowl.</li><li>A curved <b>spine</b> connects them.</li><li>Limbs = lines with joints at elbows and knees.</li></ul>
<p>Get the pose right with the mannequin first, then add details later.</p>`,
        ex: { mode: 'copy', gen: 'mannequin', params: { forms: true, calm: true }, rounds: 3, tol: [11, 40], say: 'Copy the mannequin pose on the right side.' },
      },
      {
        id: 'w7-head', title: 'Heads: The Loomis Ball', emoji: '🙂', skill: 'figure', xp: 140,
        intro: 'Draw heads turned in any direction using a ball and some guidelines.',
        theory: `<p>The <b>Loomis method</b> builds a head from a ball:</p>
<ol><li>Draw a ball for the skull.</li><li>Slice off the side (the side plane).</li><li>The <b>brow line</b> goes around the middle; the <b>center line</b> goes down the front.</li><li>Add the jaw down to the chin.</li></ol>
<p>The brow, nose and chin are evenly spaced. Turn the ball, and the face turns with it!</p>`,
        ex: { mode: 'trace', gen: 'loomis', params: {}, rounds: 3, tol: [7, 26], say: 'Trace the Loomis head construction.' },
      },
      {
        id: 'w7-elephant', title: 'Animal: Elephant', emoji: '🐘', skill: 'animals', xp: 160, animal: 'elephant',
        intro: 'A big animal built from big forms.',
        theory: `<p>Big animals look heavy because of their <b>thick, straight legs</b> and a body that hangs between them. Overlap the head and body so they feel connected.</p>`,
        ex: { mode: 'animal' },
      },
      {
        id: 'w7-horse', title: 'Animal: Horse', emoji: '🐴', skill: 'animals', xp: 180, animal: 'horse',
        intro: 'One of the hardest animals! Circles for the chest and hips make it possible.',
        theory: `<p>Artists draw horses (and dogs, cats, lions…) with <b>two circles</b>: chest and hips. The body is about <b>2½ head-lengths</b> long.</p>
<p>The back legs bend <b>backwards</b> at the hock — this is the animal's ankle, not its knee!</p>`,
        ex: { mode: 'animal' },
      },
    ],
  });

  // ===================== WORLD 8 =====================
  W.push({
    id: 'w8', name: "Master's Studio", emoji: '🏆', color: '#feca57',
    blurb: 'Bring it all together: composition, creativity and real-life drawing. This is the road to expert.',
    lessons: [
      {
        id: 'w8-thumbs', title: 'Thumbnails & Composition', emoji: '🖼️', skill: 'create', xp: 140,
        intro: 'Plan a picture with tiny sketches before drawing the big one.',
        theory: `<p><b>Composition</b> is how you arrange things in a picture. Tips:</p>
<ul><li><b>Rule of thirds</b>: put the main subject on one of the dashed lines, not dead center.</li><li><b>Big, medium, small</b>: shapes of different sizes are more interesting.</li><li><b>Leave breathing room</b> in the direction the subject is looking.</li></ul>
<p>Pros make many tiny "thumbnail" sketches and pick the best one.</p>`,
        ex: { mode: 'free', gen: 'thumbFrames', params: {}, say: 'Draw 4 different thumbnail ideas for "an animal in its home".', checklist: ['All 4 thumbnails are different', 'I used the rule of thirds in at least one', 'I used big, medium and small shapes', 'I added light & dark areas to at least one'] },
      },
      {
        id: 'w8-lion', title: 'Animal: Lion', emoji: '🦁', skill: 'animals', xp: 180, animal: 'lion',
        intro: 'The king of the jungle — face-on, with a big mane.',
        theory: `<p><b>Symmetry</b>: a front-facing face is the same on both sides. Lightly draw a center line and check that the eyes, ears and muzzle mirror each other.</p><p>Texture (like a mane) looks best when it has <b>variety</b>: some big tufts, some small.</p>`,
        ex: { mode: 'animal' },
      },
      {
        id: 'w8-life', title: 'Draw from Real Life', emoji: '🍎', skill: 'seeing', xp: 200,
        intro: 'The best practice there is: draw a real object in front of you.',
        theory: `<p>Pick something at home: a mug, a shoe, a fruit, your pet (if it's asleep!).</p>
<ol><li>Find the <b>big shapes</b> first (box? cylinder? sphere?).</li><li>Check <b>proportions</b> — how many times does the width fit into the height?</li><li>Find the <b>light</b> and shade the shadow side.</li><li>Add details last.</li></ol>`,
        ex: { mode: 'free', timer: 900, say: 'Set a real object in front of you and draw it. Take your time — up to 15 minutes.', checklist: ['I started with big simple shapes', 'The proportions look right', 'I shaded the side away from the light', 'I added a cast shadow', 'I spent at least 10 minutes'] },
      },
      {
        id: 'w8-dragon', title: 'Animal: Dragon', emoji: '🐉', skill: 'animals', xp: 220, animal: 'dragon',
        intro: 'Combine everything you know about real animals to invent a creature!',
        theory: `<p>Imaginary creatures are built from <b>real animal parts</b>: a lizard's body, a bat's wings, a horse's neck, a lion's legs. That's why studying real animals matters so much.</p><p>After this lesson, try changing it: new horns, a different tail, feathers instead of scales!</p>`,
        ex: { mode: 'animal' },
      },
      {
        id: 'w8-creature', title: 'Invent Your Own Creature', emoji: '🦄', skill: 'create', xp: 220,
        intro: 'Your turn to be the designer. Mix animals to make something brand new!',
        theory: `<p>Pick 2–3 animals and combine them. A "cat-owl"? A "turtle-dragon"?</p>
<ul><li>Start with <b>construction shapes</b> for the body.</li><li>Give it a clear <b>silhouette</b> — it should be recognizable even as a solid shadow.</li><li>Add <b>shading</b> with a light direction in mind.</li></ul>`,
        ex: { mode: 'free', say: 'Invent and draw your own creature by combining animals.', checklist: ['I combined at least 2 animals', 'I used construction shapes first', 'The pose shows some movement (gesture)', 'I added light and shadow', 'I gave it a name!'] },
      },
      {
        id: 'w8-study', title: 'Master Study', emoji: '🖌️', skill: 'create', xp: 250,
        intro: 'Copy a drawing by an artist you admire to learn their secrets.',
        theory: `<p>For centuries, artists learned by copying the masters. Find a drawing you love (a book, a museum website, a comic) and copy it carefully.</p>
<p>Ask while you copy: <i>How did they simplify? Where are their darkest darks? Which lines are thick and which are thin?</i></p>
<p class="tip">💡 Copies are for learning — when you share them, always say who the original artist was.</p>`,
        ex: { mode: 'free', timer: 1200, say: 'Copy an artwork you admire. Up to 20 minutes.', checklist: ['I copied the big shapes and proportions first', 'I matched the darkest darks', 'I noticed how the artist simplified things', 'I learned one new trick I can use'] },
      },
    ],
  });

  // ===================== WORLD 9 =====================
  W.push({
    id: 'w9', name: 'Realism Ridge', emoji: '📷', color: '#2d98da',
    blurb: 'Make animals look REAL: true anatomy, light and shadow, fur texture and lifelike eyes.',
    lessons: [
      {
        id: 'w9-eyes', title: 'Lifelike Eyes', emoji: '👁️', skill: 'animals', xp: 200,
        intro: 'Eyes are where a drawing comes alive. Learn the details that make them look real.',
        theory: `<p>A realistic animal eye has:</p>
<ul><li>A <b>pupil</b> — the darkest dark in the whole drawing (round for dogs and wolves, a slit for cats).</li>
<li>An <b>iris</b> — a middle value, darker around its edge.</li>
<li>A <b>highlight</b> — a tiny white spot on the side the light comes from. Leave the paper white there!</li>
<li>An <b>upper lid shadow</b> — the lid casts a soft shadow on the top of the eye.</li>
<li>A <b>rim</b> of dark skin around the eye on most animals.</li></ul>
<p class="tip">💡 Never outline the whole eye with one hard line — use value changes instead.</p>`,
        ex: { mode: 'free', gen: 'hatchBoxes', params: { n: 3 }, timer: 600, say: 'Draw 3 eyes, one per box: a dog eye (round pupil), a cat eye (slit pupil) and a bird eye. Light comes from the top-left.', checklist: ['The pupil is the darkest dark', 'I left a white highlight on the top-left', 'The iris is darker around its edge', 'I shaded under the upper eyelid', 'Each eye looks different'] },
      },
      {
        id: 'w9-fur', title: 'Fur & Feathers', emoji: '🪶', skill: 'light', xp: 200,
        intro: 'Texture is drawn with value and direction — not by drawing every single hair.',
        theory: `<p>Artists don't draw every hair. They draw the <b>value</b> (light and shadow) first, then add <b>texture strokes</b> that follow the direction the fur grows.</p>
<ul><li><b>Short fur</b>: tiny flicks, close together.</li><li><b>Long fur</b>: long curving strokes in clumps, darker between clumps.</li><li><b>Feathers</b>: overlapping scale-like shapes, each with a shadow under it.</li></ul>
<p>Put more texture in the <b>shadows and edges</b>, and less in the light — the eye fills in the rest.</p>`,
        ex: { mode: 'free', gen: 'hatchBoxes', params: { n: 3 }, timer: 600, say: 'Fill the 3 boxes: short fur, long fur, and feathers. Make one side of each box darker, as if light came from the left.', checklist: ['My strokes follow one direction of growth', 'The fur gets darker on the shadow side', 'Long fur is drawn in clumps, not single hairs', 'The feathers overlap with shadows underneath', 'I left some areas lighter for the light side'] },
      },
      {
        id: 'w9-wolf', title: 'Realistic Wolf', emoji: '🐺', skill: 'animals', xp: 260, animal: 'wolf',
        intro: 'Real anatomy, real light, real fur. This is the big leap from cartoon to realistic!',
        theory: `<p>Realistic animals are built in layers:</p>
<ol><li><b>Masses</b>: chest, hips and head as simple forms.</li><li><b>Anatomy</b>: where the legs attach, how the joints bend, the slope of the back.</li><li><b>Light & shadow</b>: decide where the light comes from and shade the form.</li><li><b>Texture</b>: fur strokes that follow the form.</li><li><b>Details</b>: eyes, nose and claws last.</li></ol>
<p>A wolf's chest is deep and narrow, its legs long, and its back leg bends <b>backward</b> at the hock (its ankle).</p>`,
        ex: { mode: 'animal' },
      },
      {
        id: 'w9-cat', title: 'Realistic House Cat', emoji: '🐈', skill: 'animals', xp: 260, animal: 'housecat',
        intro: 'Remember the cartoon cat face from Shape Town? Now draw a real one!',
        theory: `<p>Compare this to your very first cat. A real cat has:</p>
<ul><li>A <b>small head</b> compared to its body.</li><li>A <b>big round haunch</b> when it sits — the back leg folds up underneath.</li><li>Straight front legs with <b>neat round paws</b>.</li><li>A tail that often wraps around the feet.</li></ul>
<p>Look how far you've come since the oval-and-triangle cat! 🎉</p>`,
        ex: { mode: 'animal' },
      },
      {
        id: 'w9-portrait', title: 'Pet Portrait from a Photo', emoji: '🖼️', skill: 'create', xp: 300,
        intro: 'The expert challenge: a realistic portrait of a real animal.',
        theory: `<p>Find a photo of a pet (yours, a friend's, or one you like). Then use everything you've learned:</p>
<ol><li>Light <b>construction</b> shapes for head, muzzle and ears.</li><li>Check <b>proportions</b> — where do the eyes sit? How long is the muzzle?</li><li>Squint to find the <b>big shadow shapes</b> and block them in.</li><li>Add <b>fur texture</b> following the direction of growth.</li><li>Finish with <b>eyes and nose</b> — darkest darks and brightest highlights.</li></ol>`,
        ex: { mode: 'free', timer: 1800, say: 'Draw a realistic portrait of a pet from a photo. Take up to 30 minutes.', checklist: ['I started with construction shapes', 'The proportions match the photo', 'I shaded with one clear light direction', 'The fur follows the direction it grows', 'The eyes have highlights and look alive', 'I spent at least 20 minutes'] },
      },
    ],
  });

  // ===================== WORLD 10: BOSS MODE =====================
  const bossTheory = (extra) => `<p><b>Boss Mode</b> is how professional realist artists work. You'll make one big, full-color drawing in six stages:</p>
<ol><li><b>Outline with a grid</b> — copy the shapes square by square for accurate proportions.</li>
<li><b>Shadow map</b> — block in only the shadow shapes in one cool color.</li>
<li><b>Local color</b> — the animal's real colors, in light layers.</li>
<li><b>Values & form</b> — build the darks, core shadows and cast shadow. Warm light, cool shadows.</li>
<li><b>Texture</b> — wrinkles, fur or feathers that follow the form.</li>
<li><b>Details & highlights</b> — darkest darks in the eyes, brightest highlights last.</li></ol>
${extra}
<p class="tip">💡 Values (light and dark) matter more than color. If the values are right, the drawing looks real — even with odd colors.</p>
<p class="tip">💾 This takes 30–60 minutes. Your work saves at every stage, so you can stop and come back anytime.</p>`;
  W.push({
    id: 'w10', name: 'Boss Mode', emoji: '👑', color: '#f7b731', boss: true,
    blurb: 'The ultimate challenge: realistic, full-color animal drawings — the kind that make people ask "is that a photo?"',
    lessons: [
      {
        id: 'boss-elephant', title: 'BOSS: Mighty Elephant', emoji: '🐘', skill: 'animals', xp: 500,
        intro: 'Huge form, deep wrinkles, ivory tusks. Draw a realistic elephant in full color.',
        theory: bossTheory(`<p><b>Elephant secrets:</b> the skin is grey-brown, not pure grey — add warm browns in the light and blue-violets in the shadows. Wrinkles <b>wrap around</b> the trunk and legs like rings. Tusks are warm ivory with a bright highlight along the top edge.</p>`),
        ex: { mode: 'boss', animal: 'elephant', color: '#8a8078', palette: 'nature' },
      },
      {
        id: 'boss-fox', title: 'BOSS: Fiery Fox', emoji: '🦊', skill: 'animals', xp: 500,
        intro: 'Bright orange fur, white chest, black socks. Make the colors glow!',
        theory: bossTheory(`<p><b>Fox secrets:</b> orange fur turns <b>golden-yellow</b> in the light and <b>red-brown</b> in the shadows. The white chest isn't pure white — shadow it with soft blue-grey. Fur on the tail is long and grouped into clumps.</p>`),
        ex: { mode: 'boss', animal: 'fox', color: '#c8692e', palette: 'nature' },
      },
      {
        id: 'boss-wolf', title: 'BOSS: Lone Wolf', emoji: '🐺', skill: 'animals', xp: 550,
        intro: 'Thick layered fur in greys, browns and creams. A true realism test.',
        theory: bossTheory(`<p><b>Wolf secrets:</b> wolf fur has bands of color — cream underneath, grey-brown on top, darker tips along the back. Layer each color in the direction the fur grows. Keep the eyes amber with a dark rim.</p>`),
        ex: { mode: 'boss', animal: 'wolf', color: '#8c7a66', palette: 'nature' },
      },
      {
        id: 'boss-final', title: 'FINAL BOSS: From a Photo', emoji: '🏆', skill: 'create', xp: 800,
        intro: 'Any animal you love, from a real photo, in full realistic color. This is expert level.',
        theory: bossTheory(`<p><b>Choosing a photo:</b> pick a clear, sharp photo with strong light (a sunny side and a shadow side). Use your own photos, or photos that are free to use. A pet photo is perfect!</p>`),
        ex: { mode: 'boss', photoOnly: true, palette: 'nature' },
      },
    ],
  });

  // ---- index helpers ----
  const byId = {};
  W.forEach((w, wi) => w.lessons.forEach((l, li) => { l.world = w.id; l.wi = wi; l.li = li; byId[l.id] = l; }));

  DA.course = { WORLDS: W, SKILLS, RANKS, byId };
})(window.DA);
