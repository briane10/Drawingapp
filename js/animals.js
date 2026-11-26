/* Step-by-step animal drawings, simple → complex.
 * Each step adds paths. `construct: true` paths are light "building shapes" you draw softly
 * and draw over; the rest are the final lines.
 */
(function (DA) {
  'use strict';
  const U = DA.util;
  const G = DA.gen;
  const D = Math.PI / 180;

  // --- tiny shape vocabulary ---
  const mk = (pts, o) => Object.assign({ pts, closed: false }, o || {});
  const E = (cx, cy, rx, ry, rot, o) => mk(U.ellipsePts(cx, cy, rx, ry, (rot || 0), 64).slice(0, 64), Object.assign({ closed: true }, o));
  const C = (cx, cy, r, o) => E(cx, cy, r, r, 0, o);
  const L = (...pts) => mk(pts);
  const LC = (...pts) => mk(pts, { closed: true });
  const B = (p0, c1, c2, p1, o) => mk(G.bezier(p0, c1, c2, p1, 24), o);
  const Q = (p0, c, p1, o) => mk(G.bezier(p0, [p0[0] + (2 / 3) * (c[0] - p0[0]), p0[1] + (2 / 3) * (c[1] - p0[1])], [p1[0] + (2 / 3) * (c[0] - p1[0]), p1[1] + (2 / 3) * (c[1] - p1[1])], p1, 18), o);
  const A = (cx, cy, rx, ry, a0, a1, o) => mk(U.ellipsePts(cx, cy, rx, ry, 0, 40, a0 * D, a1 * D), o);
  const K = (p) => Object.assign(p, { construct: true });
  const spiral = (cx, cy, r0, r1, turns, a0) => {
    const pts = [], n = Math.round(turns * 48);
    for (let i = 0; i <= n; i++) { const t = i / n, a = a0 + t * turns * Math.PI * 2, r = U.lerp(r0, r1, t); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return mk(pts);
  };
  const zigCircle = (cx, cy, r, amp, n) => {
    const pts = [];
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r - amp : r + amp; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    return mk(pts, { closed: true });
  };
  // Catmull-Rom spline through points → smooth organic contour
  const smoothPts = (pts, closed, per) => {
    per = per || 8;
    const n = pts.length, out = [];
    const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  };
  const S = (pts, o) => mk(smoothPts(pts, false), o);
  const SC = (pts, o) => mk(smoothPts(pts, true), Object.assign({ closed: true }, o));
  const mirror = (p, cx) => Object.assign({}, p, { pts: p.pts.map((q) => [2 * cx - q[0], q[1]]) });

  const ANIMALS = {};

  ANIMALS.fish = {
    realism: 1, name: 'Fish', emoji: '🐟', level: 1,
    steps: [
      { say: 'Draw a big oval for the body. Keep it wide like a lemon lying down.', paths: [E(300, 250, 150, 90)] },
      { say: 'Add a tail on the left: two lines out, and a little "V" notch in the middle.', paths: [L([155, 250], [60, 170], [88, 250], [60, 330], [155, 250])] },
      { say: 'Draw a round eye with a pupil, and a little smile near the front.', paths: [C(385, 225, 20), C(390, 225, 8), Q([445, 268], [428, 282], [410, 272])] },
      { say: 'Finish with a fin on top, a fin underneath, and a curved gill line.', paths: [Q([235, 168], [285, 95], [345, 172]), Q([270, 335], [295, 375], [330, 333]), Q([345, 185], [318, 250], [345, 315])] },
    ],
  };

  ANIMALS.snail = {
    realism: 1, name: 'Snail', emoji: '🐌', level: 1,
    steps: [
      { say: 'Start with a big circle for the shell.', paths: [C(290, 230, 110)] },
      { say: 'Draw a spiral inside, starting from the middle and winding outward.', paths: [spiral(295, 235, 8, 92, 2.3, 0)] },
      { say: 'Draw the long squishy body underneath, curving up into the head on the right.', paths: [B([160, 330], [220, 350], [420, 352], [475, 330]), B([475, 330], [505, 315], [505, 250], [462, 240]), Q([462, 240], [420, 245], [398, 275]), Q([160, 330], [175, 312], [195, 305])] },
      { say: 'Add two eye stalks with round eyes on top, and a happy smile.', paths: [L([470, 245], [492, 172]), L([452, 243], [440, 178]), C(494, 164, 11), C(438, 170, 11), Q([470, 282], [482, 292], [494, 280])] },
    ],
  };

  ANIMALS.cat = {
    realism: 1, name: 'Cat Face', emoji: '🐱', level: 2,
    steps: [
      { say: 'Draw a wide oval for the head — wider than it is tall.', paths: [E(300, 270, 160, 128)] },
      { say: 'Add two pointy triangle ears. Notice they lean outward a little.', paths: [L([178, 195], [165, 72], [258, 152]), L([422, 195], [435, 72], [342, 152]), L([190, 170], [185, 105], [235, 150]), L([410, 170], [415, 105], [365, 150])] },
      { say: 'Eyes: two ovals spaced about one eye-width apart, with tall skinny pupils.', paths: [E(240, 250, 28, 34), E(360, 250, 28, 34), E(242, 252, 8, 24), E(358, 252, 8, 24)] },
      { say: 'Nose: a small upside-down triangle. Mouth: two little curves like a "w".', paths: [LC([285, 300], [315, 300], [300, 318]), Q([300, 318], [296, 342], [272, 336]), Q([300, 318], [304, 342], [328, 336])] },
      { say: 'Whiskers! Three on each side, fanning out.', paths: [L([255, 312], [140, 296]), L([255, 322], [138, 330]), L([258, 332], [150, 362]), L([345, 312], [460, 296]), L([345, 322], [462, 330]), L([342, 332], [450, 362])] },
    ],
  };

  ANIMALS.owl = {
    realism: 1, name: 'Owl', emoji: '🦉', level: 2,
    steps: [
      { say: 'Draw a tall egg shape for the body.', paths: [E(300, 280, 140, 175)] },
      { say: 'Two big circles for the eyes, touching in the middle. Add pupils.', paths: [C(245, 205, 52), C(355, 205, 52), C(252, 210, 20), C(348, 210, 20)] },
      { say: 'A diamond beak between the eyes, and little ear tufts on top.', paths: [LC([300, 240], [314, 265], [300, 292], [286, 265]), L([205, 140], [185, 95], [245, 125]), L([395, 140], [415, 95], [355, 125])] },
      { say: 'Wings on each side, then some "V" feather marks on the belly.', paths: [B([172, 240], [205, 300], [212, 380], [195, 420]), B([428, 240], [395, 300], [388, 380], [405, 420]), L([265, 320], [275, 335], [285, 320]), L([315, 320], [325, 335], [335, 320]), L([280, 360], [290, 375], [300, 360]), L([300, 360], [310, 375], [320, 360]), L([290, 400], [300, 415], [310, 400])] },
      { say: 'Finish with a branch and little toes holding on.', paths: [L([80, 455], [520, 455]), Q([250, 445], [255, 465], [262, 452]), Q([262, 452], [268, 465], [275, 446]), Q([325, 446], [332, 465], [338, 452]), Q([338, 452], [345, 465], [350, 445])] },
    ],
  };

  ANIMALS.bird = {
    realism: 2, name: 'Little Bird', emoji: '🐦', level: 3,
    steps: [
      { say: 'Building shapes first! Draw a circle for the head, then a light tilted oval for the body.', paths: [C(380, 170, 55), K(E(290, 280, 130, 92, -0.25))] },
      { say: 'Now draw the real outline over your shapes: smooth the neck so head and body join.', paths: [B([340, 132], [300, 160], [210, 190], [168, 250]), B([168, 250], [150, 320], [260, 375], [345, 345]), B([345, 345], [420, 310], [445, 230], [425, 195])] },
      { say: 'Add a pointy beak and an eye.', paths: [LC([430, 158], [482, 172], [432, 186]), C(395, 160, 8)] },
      { say: 'Draw the wing as a long teardrop on the side of the body, and a tail.', paths: [B([235, 235], [300, 215], [360, 265], [330, 305]), Q([330, 305], [255, 330], [195, 290]), L([172, 270], [78, 245], [96, 298], [178, 305])] },
      { say: 'Legs and a branch to finish.', paths: [L([285, 360], [280, 420]), L([320, 352], [322, 420]), L([150, 425], [470, 425])] },
    ],
  };

  ANIMALS.turtle = {
    realism: 2, name: 'Turtle', emoji: '🐢', level: 3,
    steps: [
      { say: 'Draw a half-oval dome for the shell, and a curved line for its bottom edge.', paths: [A(300, 300, 145, 125, 180, 360), Q([155, 300], [300, 332], [445, 300])] },
      { say: 'Head: a circle on the right with a short neck joining the shell.', paths: [C(505, 262, 40), L([440, 290], [470, 290])] },
      { say: 'Four stubby legs, and a tiny triangle tail.', paths: [E(205, 330, 24, 32), E(395, 330, 24, 32), E(255, 322, 18, 24), E(345, 322, 18, 24), LC([155, 300], [118, 318], [160, 316])] },
      { say: 'Shell pattern: a hexagon in the middle with lines out to the edge.', paths: [LC([270, 220], [330, 220], [355, 255], [330, 290], [270, 290], [245, 255]), L([270, 220], [245, 185]), L([330, 220], [355, 185]), L([245, 255], [175, 270]), L([355, 255], [425, 270])] },
      { say: 'A happy face: eye and smile.', paths: [C(515, 252, 7), Q([495, 278], [512, 290], [530, 276])] },
    ],
  };

  ANIMALS.bunny = {
    realism: 2, name: 'Bunny', emoji: '🐰', level: 4,
    steps: [
      { say: 'Think in 3D forms! A big light ball for the body and a smaller ball for the head.', paths: [K(C(285, 320, 120)), C(385, 185, 70)] },
      { say: 'Two long ears like stretched ovals, tilting apart.', paths: [E(352, 75, 22, 72, -0.2), E(415, 80, 22, 72, 0.28), E(354, 85, 9, 48, -0.2), E(413, 90, 9, 48, 0.28)] },
      { say: 'Draw the body outline over your ball, flattening the bottom where it sits.', paths: [B([330, 240], [250, 190], [150, 250], [165, 360]), B([165, 360], [175, 430], [300, 445], [380, 435]), Q([380, 435], [420, 400], [400, 250])] },
      { say: 'A big back foot, a little front paw, and a fluffy round tail.', paths: [E(265, 438, 78, 20), E(392, 430, 34, 16), C(168, 345, 28)] },
      { say: 'Face: an eye, a tiny nose, and whiskers.', paths: [C(410, 175, 9), LC([448, 198], [460, 198], [454, 207]), L([450, 210], [500, 200]), L([450, 214], [500, 222])] },
    ],
  };

  ANIMALS.penguin = {
    realism: 2, name: 'Penguin', emoji: '🐧', level: 4,
    steps: [
      { say: 'A tall oval for the body.', paths: [E(300, 270, 110, 170)] },
      { say: 'A smaller oval inside for the white belly.', paths: [E(300, 305, 75, 130)] },
      { say: 'The face patch is two circles side by side. Add eyes and a triangle beak.', paths: [C(275, 165, 34), C(325, 165, 34), C(280, 165, 7), C(320, 165, 7), LC([288, 185], [300, 205], [312, 185])] },
      { say: 'Flipper wings on each side, and two flat feet.', paths: [B([195, 210], [150, 280], [160, 350], [188, 370]), B([405, 210], [450, 280], [440, 350], [412, 370]), E(265, 443, 32, 12), E(335, 443, 32, 12)] },
    ],
  };

  ANIMALS.puppy = {
    realism: 2, name: 'Puppy', emoji: '🐶', level: 5,
    steps: [
      { say: 'Construction: a circle for the head and a light oval for the sitting body.', paths: [C(300, 160, 80), K(E(300, 340, 100, 112))] },
      { say: 'Floppy ears hang down from the sides of the head.', paths: [B([232, 118], [180, 140], [172, 232], [212, 246]), B([212, 246], [240, 232], [244, 170], [236, 118]), B([368, 118], [420, 140], [428, 232], [388, 246]), B([388, 246], [360, 232], [356, 170], [364, 118])] },
      { say: 'Muzzle oval, a nose on top of it, a mouth, and two eyes.', paths: [E(300, 202, 46, 32), E(300, 187, 14, 10), L([300, 197], [300, 214]), Q([280, 214], [300, 226], [320, 214]), C(270, 148, 9), C(330, 148, 9)] },
      { say: 'Body outline over your oval, then two front legs straight down.', paths: [B([255, 236], [200, 280], [190, 380], [215, 440]), B([345, 236], [400, 280], [410, 380], [385, 440]), L([268, 300], [264, 440]), L([332, 300], [336, 440])] },
      { say: 'Paws, a wagging tail, and a spot on the back!', paths: [E(255, 446, 28, 13), E(345, 446, 28, 13), Q([402, 410], [465, 385], [450, 322]), E(360, 330, 22, 30, 0.3)] },
    ],
  };

  ANIMALS.fox = {
    silhouette: smoothPts([[285,40],[332,96],[372,36],[386,112],[432,180],[340,205],[362,260],[352,330],[346,440],[365,450],[300,452],[205,425],[175,330],[200,250],[262,160],[288,112]], true, 6),
    realism: 3, name: 'Fox', emoji: '🦊', level: 6,
    steps: [
      { say: 'Construction shapes: a circle for the head and a leaning egg for the body.', paths: [K(C(330, 150, 58)), K(E(262, 320, 95, 122, 0.15))] },
      { say: 'Big pointy ears and a long snout. The snout tip pokes out to the right.', paths: [L([292, 112], [285, 40], [332, 96]), L([342, 92], [372, 36], [386, 112]), B([288, 112], [262, 160], [300, 200], [340, 205]), L([340, 205], [432, 180], [386, 145]), C(430, 180, 8), C(356, 140, 7)] },
      { say: 'Outline the body: chest down the front, back curving down behind.', paths: [B([340, 205], [362, 260], [352, 330], [342, 420]), B([292, 195], [200, 232], [172, 330], [202, 422])] },
      { say: 'Front legs and paws.', paths: [L([318, 330], [314, 440]), L([346, 330], [346, 440]), E(305, 444, 20, 9), E(352, 444, 20, 9), L([150, 452], [460, 452])] },
      { say: 'A big bushy tail curling around the front — with a white tip.', paths: [B([202, 410], [70, 430], [50, 300], [120, 262]), B([120, 262], [125, 330], [170, 385], [255, 440]), Q([100, 290], [118, 300], [138, 290])] },
    ],
  };

  ANIMALS.elephant = {
    silhouette: smoothPts([[145,290],[158,208],[200,166],[260,146],[330,142],[400,150],[455,140],[500,150],[535,190],[540,240],[565,320],[548,400],[580,418],[560,428],[512,400],[497,300],[470,300],[402,300],[402,450],[352,450],[350,352],[296,362],[244,352],[232,450],[180,450],[180,320]], true, 6),
    realism: 3, name: 'Elephant', emoji: '🐘', level: 7,
    steps: [
      { say: 'Big forms first: a large oval body and a circle for the head, overlapping.', paths: [K(E(290, 255, 160, 110)), K(C(465, 215, 75))] },
      { say: 'Four thick legs like tree trunks. Ones further away are a little shorter.', paths: [L([180, 320], [180, 450], [230, 450], [232, 340]), L([350, 340], [352, 450], [402, 450], [400, 300]), L([240, 350], [244, 438]), L([296, 350], [298, 438])] },
      { say: 'The outline: the back curves up into the head; the belly hangs low.', paths: [B([145, 290], [120, 190], [230, 130], [400, 150]), Q([400, 150], [430, 138], [455, 140]), Q([232, 352], [290, 375], [350, 352])] },
      { say: 'Outline the forehead, then a huge floppy ear and a long trunk curling at the tip.', paths: [A(465, 215, 75, 75, -100, 38), B([430, 160], [370, 170], [370, 300], [440, 300]), B([520, 240], [565, 320], [545, 400], [580, 418]), B([495, 280], [520, 340], [512, 400], [560, 425])] },
      { say: 'Eye, tusk, tail and toenails. Then add wrinkles on the trunk!', paths: [C(490, 200, 6), Q([500, 280], [520, 318], [548, 316]), L([142, 270], [118, 340]), L([520, 330], [540, 324]), L([524, 360], [544, 356])] },
    ],
  };

  ANIMALS.horse = {
    silhouette: smoothPts([[200,166],[395,166],[430,110],[505,80],[518,52],[540,80],[560,120],[585,175],[582,192],[560,210],[530,180],[480,190],[455,265],[420,295],[415,370],[410,440],[424,464],[372,464],[372,440],[376,372],[372,300],[300,322],[255,302],[255,382],[244,446],[258,468],[206,468],[206,446],[218,382],[190,300],[140,250],[150,190]], true, 6),
    realism: 3, name: 'Horse', emoji: '🐴', level: 7,
    steps: [
      { say: 'Horses are built from circles: one for the chest, one for the hips. Draw them lightly.', paths: [K(C(395, 230, 65)), K(C(200, 235, 70))] },
      { say: 'Connect them: a straight-ish back on top and a curved belly underneath. Round off the rump and chest.', paths: [Q([200, 166], [300, 180], [395, 166]), Q([212, 302], [300, 322], [398, 294]), A(200, 235, 70, 70, 150, 270), A(395, 230, 65, 65, -30, 55)] },
      { say: 'The neck rises up and forward. Then a wedge-shaped head with a round muzzle.', paths: [Q([395, 166], [430, 110], [505, 80]), Q([445, 260], [480, 180], [520, 150]), K(C(525, 105, 32)), K(C(565, 182, 22)), B([505, 80], [545, 72], [585, 160], [582, 192]), Q([582, 192], [560, 210], [530, 180]), L([515, 80], [518, 52], [534, 76]), C(532, 112, 5)] },
      { say: 'Legs with joints: knees on the front legs, and backward-bending hocks on the back legs.', paths: [L([372, 290], [376, 372], [372, 440], [386, 464]), L([410, 290], [415, 370], [410, 440], [424, 464]), L([190, 300], [218, 382], [206, 446], [220, 468]), L([228, 300], [255, 382], [244, 446], [258, 468])] },
      { say: 'Finish with a flowing mane and tail.', paths: [B([140, 190], [96, 232], [108, 330], [92, 385]), B([505, 85], [470, 100], [440, 130], [400, 160]), L([495, 92], [478, 120]), L([470, 108], [452, 140])] },
    ],
  };

  ANIMALS.lion = {
    silhouette: U.ellipsePts(300, 262, 170, 170, 0, 48),
    realism: 3, name: 'Lion', emoji: '🦁', level: 8,
    steps: [
      { say: 'Draw a big spiky mane all the way around.', paths: [zigCircle(300, 262, 172, 14, 18)] },
      { say: 'The face is an oval inside the mane, with two round ears.', paths: [E(300, 272, 106, 116), A(218, 178, 28, 28, 160, 380), A(382, 178, 28, 28, 160, 380)] },
      { say: 'Eyes sit halfway down the head. Add brows that make him look proud.', paths: [E(262, 242, 15, 10), E(338, 242, 15, 10), L([240, 222], [282, 228]), L([360, 222], [318, 228])] },
      { say: 'A wide nose, two round muzzle bumps, and a chin.', paths: [LC([272, 286], [328, 286], [300, 314]), A(281, 330, 28, 24, 90, 270), A(319, 330, 28, 24, -90, 90), Q([282, 356], [300, 376], [318, 356])] },
    ],
  };

  ANIMALS.dragon = {
    silhouette: smoothPts([[150,330],[200,250],[300,230],[390,222],[420,170],[440,100],[458,82],[520,92],[576,114],[570,136],[512,138],[492,138],[462,170],[478,230],[440,292],[420,330],[392,402],[422,442],[380,446],[360,400],[300,385],[268,410],[252,450],[200,448],[170,400]], true, 6),
    realism: 3, name: 'Dragon', emoji: '🐉', level: 8,
    steps: [
      { say: 'Construction: a light oval body and chest circle, and a small oval for the head.', paths: [K(E(280, 300, 130, 85, -0.1)), K(C(385, 280, 60)), E(480, 108, 46, 32, 0.2)] },
      { say: 'An S-curved neck joining chest to head, then the snout and horns.', paths: [B([390, 222], [420, 170], [400, 130], [440, 100]), B([440, 292], [478, 230], [462, 170], [492, 138]), L([518, 96], [576, 114], [570, 136], [512, 138]), L([458, 82], [430, 36], [478, 76]), C(490, 104, 6)] },
      { say: 'A bat-like wing: draw the arm bones first, then scoop the skin between them.', paths: [L([330, 222], [290, 130], [250, 70]), L([290, 130], [170, 100]), L([290, 130], [130, 170]), Q([250, 70], [228, 130], [170, 100]), Q([170, 100], [178, 160], [130, 170]), Q([130, 170], [228, 212], [300, 232])] },
      { say: 'A big back leg, a front leg with claws, and a long tail ending in a spade.', paths: [E(220, 350, 52, 62), L([220, 405], [200, 448], [252, 450]), L([385, 335], [392, 402], [422, 442], [380, 446]), B([155, 322], [60, 362], [60, 450], [160, 440]), LC([160, 440], [202, 418], [192, 462])] },
      { say: 'Spikes along the back, belly plates, and a toothy grin. Make it your own!', paths: [L([200, 222], [212, 196], [226, 220]), L([240, 214], [252, 188], [266, 212]), L([150, 248], [156, 222], [176, 240]), L([340, 330], [300, 352]), L([352, 305], [310, 325]), L([532, 136], [538, 146], [546, 136])] },
    ],
  };


  // ---------- realistic animals ----------
  const WOLF_HEAD = [[482, 168], [486, 140], [494, 106], [512, 136], [532, 146], [552, 152], [572, 160], [588, 172], [575, 186], [548, 192], [522, 204], [505, 228]];
  const WOLF_FRONT = [[505, 228], [485, 262], [468, 300], [462, 340], [460, 400], [458, 440], [474, 452], [470, 462], [440, 462], [436, 440], [434, 400], [430, 350]];
  const WOLF_UNDER = [[430, 350], [400, 338], [340, 342], [285, 336], [262, 350], [258, 395], [262, 440], [278, 454], [274, 462], [244, 462], [238, 440], [232, 405], [210, 375], [196, 335], [188, 300], [182, 268]];
  const WOLF_BACK = [[182, 268], [205, 240], [270, 232], [350, 236], [425, 226], [455, 214], [472, 192], [482, 168]];
  const join = (...parts) => parts.reduce((a, p) => a.concat(p.slice(1)), [parts[0][0]]);
  ANIMALS.wolf = {
    silhouette: smoothPts(join(WOLF_HEAD, WOLF_FRONT, WOLF_UNDER, WOLF_BACK).slice(0, -1), true),
    realism: 4, name: 'Wolf', emoji: '🐺', level: 9,
    steps: [
      { say: 'Real animal anatomy starts with masses: a chest circle, a hip circle, a head circle and a muzzle. The chest is deeper than the hips.', paths: [K(C(445, 285, 58)), K(C(225, 295, 55)), K(C(515, 165, 34)), K(E(565, 170, 25, 16))] },
      { say: 'The back is long and level. The belly tucks up behind the ribcage. Draw both lines, plus the bushy tail hanging from the rump.', paths: [S(WOLF_BACK), S(WOLF_UNDER.slice(0, 5)), SC([[190, 250], [160, 280], [138, 330], [128, 380], [142, 392], [158, 360], [180, 310], [198, 270]])] },
      { say: 'The head: a sloping forehead, a long muzzle, pointed ears that sit high and back. Notice the "stop" where the forehead meets the muzzle.', paths: [S(WOLF_HEAD), E(530, 158, 8, 4, -0.2), E(584, 170, 6, 5), L([586, 178], [560, 186])] },
      { say: 'Legs! The front leg is straight like a column. The back leg bends backward at the hock (its ankle). Paws are compact ovals.', paths: [S(WOLF_FRONT), S(WOLF_UNDER.slice(4))] },
      { say: 'Add the far legs behind — slightly shorter and thinner so they look further away.', paths: [S([[420, 340], [414, 400], [412, 445], [426, 456], [404, 458]]), S([[232, 340], [222, 380], [214, 420], [220, 452], [202, 454]])] },
    ],
  };

  const CAT_FRONT = [[470, 162], [466, 178], [452, 196], [446, 232], [444, 280], [442, 330], [440, 400], [442, 428], [458, 436], [460, 446], [430, 448], [424, 420]];
  const CAT_BACK = [[424, 420], [400, 448], [340, 452], [285, 446], [248, 420], [236, 370], [244, 310], [268, 255], [310, 215], [360, 190], [392, 168]];
  const CAT_HEAD = [[392, 168], [398, 140], [406, 98], [424, 126], [440, 102], [452, 134], [462, 146], [470, 162]];
  ANIMALS.housecat = {
    silhouette: smoothPts(join(CAT_FRONT, CAT_BACK, CAT_HEAD).slice(0, -1), true),
    realism: 4, name: 'House Cat', emoji: '🐈', level: 9,
    steps: [
      { say: 'Masses first: a head circle, a tall oval chest, and a big round haunch where the cat sits.', paths: [K(C(435, 150, 38)), K(E(420, 270, 50, 75)), K(C(320, 385, 70))] },
      { say: 'The head: small rounded skull, big triangular ears, short muzzle. Cats\' ears are wide at the base.', paths: [S(CAT_HEAD), L([410, 112], [420, 132]), L([440, 116], [446, 134])] },
      { say: 'The front: chest curving down into the straight front leg and a neat round paw.', paths: [S(CAT_FRONT)] },
      { say: 'The back: a long curve from the neck over the shoulders and around the big haunch to the ground.', paths: [S(CAT_BACK), S([[300, 330], [350, 360], [380, 410], [392, 448]])] },
      { say: 'The tail wraps around the front paws. Then add the eye, nose and whiskers.', paths: [SC([[262, 440], [222, 452], [210, 468], [262, 474], [352, 470], [430, 462], [428, 454], [352, 460], [282, 458], [264, 448]]), E(450, 148, 9, 5, -0.1), LC([466, 158], [472, 158], [469, 163]), L([462, 172], [512, 164]), L([462, 176], [510, 182])] },
    ],
  };

  ANIMALS.order = ['fish', 'snail', 'cat', 'owl', 'bird', 'turtle', 'bunny', 'penguin', 'puppy', 'fox', 'elephant', 'horse', 'lion', 'dragon', 'wolf', 'housecat'];

  const REALISM = {
    1: { name: 'Cartoon', emoji: '🙂', desc: 'Simple shapes, bold outlines' },
    2: { name: 'Simplified', emoji: '✏️', desc: 'Construction shapes, believable proportions' },
    3: { name: 'Shaded', emoji: '🌗', desc: 'Real light and shadow on 3D form' },
    4: { name: 'Realistic', emoji: '📷', desc: 'Anatomy, shading, fur texture and eye detail' },
    5: { name: 'Boss: Full-color realism', emoji: '👑', desc: 'Photo-real color drawing with the grid method' },
  };

  // flatten all paths for a finished animal
  function finished(a, includeConstruct) {
    const out = [];
    a.steps.forEach((s) => s.paths.forEach((p) => { if (includeConstruct || !p.construct) out.push(p); }));
    return out;
  }

  DA.animals = { ANIMALS, REALISM, finished, mirror, smoothPts };
})(window.DA);
