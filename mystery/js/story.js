/* Animated story cards: illustrated scenery, characters, captions, sound effects, and voices.
   Story.mount(element, cards, { onEnd }) plays a list of cards like a little animated film. */
(function (root) {
  'use strict';

  // ---------------- scenery (1600 × 900 SVG) ----------------
  function books(x0, y0, w, h, seed) {
    let s = seed;
    const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const cols = ['#8c2f39', '#22355e', '#3f7d4e', '#c8961e', '#4b2a6b', '#7a4a2a', '#167a7a', '#b3263a'];
    let out = '';
    for (let x = x0; x < x0 + w - 10;) {
      const bw = 14 + Math.floor(r() * 16);
      const bh = h - 6 - Math.floor(r() * 26);
      out += `<rect x="${x}" y="${y0 + h - bh}" width="${bw - 2}" height="${bh}" fill="${cols[Math.floor(r() * cols.length)]}"/>`;
      if (r() > 0.6) out += `<rect x="${x + 2}" y="${y0 + h - bh + 12}" width="${bw - 6}" height="4" fill="#e9c46a" opacity=".6"/>`;
      x += bw;
    }
    return out;
  }
  const flame = (x, y, s) => `<g class="flame" style="transform-origin:${x}px ${y}px"><ellipse cx="${x}" cy="${y - 10 * s}" rx="${7 * s}" ry="${14 * s}" fill="#ffcc4d"/><ellipse cx="${x}" cy="${y - 7 * s}" rx="${3.5 * s}" ry="${7 * s}" fill="#fff6d0"/></g><circle cx="${x}" cy="${y - 10 * s}" r="${40 * s}" fill="url(#glow)" opacity=".6"/>`;
  const defs = `<defs>
    <radialGradient id="glow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".8"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
    <linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070b22"/><stop offset="1" stop-color="#2a1d4a"/></linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b3f22"/><stop offset="1" stop-color="#3e2312"/></linearGradient>
  </defs>`;

  const SCENES = {
    manor: () => `${defs}<rect width="1600" height="900" fill="url(#night)"/>
      ${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 397) % 1600}" cy="${(i * 211) % 420}" r="${1 + (i % 3)}" fill="#fff" opacity="${0.3 + (i % 5) / 8}"/>`).join('')}
      <circle cx="1300" cy="160" r="80" fill="#fff6d8"/><circle cx="1300" cy="160" r="160" fill="#fff6d8" opacity=".08"/>
      <path d="M0 700 Q400 600 800 680 T1600 650 V900 H0 Z" fill="#dfe6f5"/>
      <g fill="#0c0814">
        <rect x="430" y="380" width="740" height="330"/><path d="M400 390 L800 220 L1200 390 Z"/>
        <rect x="740" y="120" width="120" height="300"/><path d="M720 130 L800 40 L880 130 Z"/>
        <rect x="470" y="300" width="40" height="90"/><rect x="1090" y="300" width="40" height="90"/>
      </g>
      <circle cx="800" cy="200" r="38" fill="#e9c46a"/><path d="M800 200 L800 175 M800 200 L815 210" stroke="#0c0814" stroke-width="6" stroke-linecap="round"/>
      <g fill="#ffcf6b">${[480, 580, 680, 900, 1000, 1100].map((x) => `<rect class="win" x="${x}" y="440" width="44" height="64" rx="4"/><rect class="win" x="${x}" y="560" width="44" height="64" rx="4"/>`).join('')}</g>
      <rect x="770" y="590" width="60" height="120" rx="30" fill="#ffcf6b" opacity=".8"/>
      <path d="M0 760 Q500 700 900 760 T1600 740 V900 H0 Z" fill="#f3f6ff"/>`,
    dining: () => `${defs}<rect width="1600" height="900" fill="#4a1d2a"/>
      ${Array.from({ length: 20 }, (_, i) => `<rect x="${i * 80}" y="0" width="30" height="560" fill="#5a2534"/>`).join('')}
      <rect y="520" width="1600" height="40" fill="#2a1016"/>
      <path d="M800 0 V90" stroke="#c9a227" stroke-width="5"/><path d="M640 130 Q800 210 960 130" stroke="#c9a227" stroke-width="8" fill="none"/>
      ${[640, 720, 800, 880, 960].map((x) => `<rect x="${x - 4}" y="${x === 800 ? 168 : x === 720 || x === 880 ? 158 : 128}" width="8" height="20" fill="#f3ead8"/>${flame(x, x === 800 ? 168 : x === 720 || x === 880 ? 158 : 128, 0.8)}`).join('')}
      <path d="M300 60 Q800 120 1300 60" stroke="#c9a227" stroke-width="3" fill="none"/>
      ${'HAPPY 80TH'.split('').map((ch, i) => `<g transform="translate(${420 + i * 82} ${70 + Math.sin(i / 9 * Math.PI) * 50})"><path d="M-30 0 L30 0 L0 60 Z" fill="${['#e9c46a', '#e5484d', '#3e8ef7'][i % 3]}"/><text y="30" text-anchor="middle" font-size="30" font-weight="900" fill="#fff" font-family="Georgia">${ch.trim()}</text></g>`).join('')}
      <rect x="0" y="700" width="1600" height="200" fill="url(#wood)"/><rect x="0" y="690" width="1600" height="30" fill="#f6edd9"/>
      ${[200, 520, 1080, 1400].map((x) => `<rect x="${x - 6}" y="630" width="12" height="62" fill="#f3ead8"/>${flame(x, 630, 1)}`).join('')}`,
    tower: () => `${defs}<rect width="1600" height="900" fill="#1a1e2e"/>
      ${Array.from({ length: 12 }, (_, r) => Array.from({ length: 9 }, (_, c) => `<rect x="${c * 180 + (r % 2) * 90 - 40}" y="${r * 76}" width="172" height="70" rx="6" fill="#232a3d"/>`).join('')).join('')}
      <circle cx="800" cy="360" r="300" fill="#f3ead8" stroke="#8a6a2a" stroke-width="22"/>
      ${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<rect x="790" y="80" width="20" height="${i % 3 ? 26 : 46}" fill="#2a1d14" transform="rotate(${i * 30} 800 360)"/>`; }).join('')}
      <g class="hands"><path d="M800 360 L${800 + Math.sin(290 * Math.PI / 180) * 160} ${360 - Math.cos(290 * Math.PI / 180) * 160}" stroke="#2a1d14" stroke-width="18" stroke-linecap="round"/>
      <path d="M800 360 L${800 + Math.sin(240 * Math.PI / 180) * 240} ${360 - Math.cos(240 * Math.PI / 180) * 240}" stroke="#2a1d14" stroke-width="10" stroke-linecap="round"/></g>
      <circle cx="800" cy="360" r="16" fill="#8a6a2a"/>
      <path d="M560 160 L640 230" stroke="#2a1d14" stroke-width="4"/><path d="M600 140 L620 250" stroke="#2a1d14" stroke-width="3"/>
      ${[[200, 720, 90], [1400, 700, 110], [1300, 820, 60]].map(([x, y, r]) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="#4a3d2a"/>${Array.from({ length: 12 }, (_, i) => `<rect x="-10" y="${-r - 18}" width="20" height="26" fill="#4a3d2a" transform="rotate(${i * 30})"/>`).join('')}<circle r="${r * 0.35}" fill="#1a1e2e"/></g>`).join('')}
      <rect y="820" width="1600" height="80" fill="#12141f"/>`,
    door: () => `${defs}<rect width="1600" height="900" fill="#2b1b12"/>
      ${Array.from({ length: 16 }, (_, i) => `<rect x="${i * 100}" y="0" width="96" height="900" fill="#33201a"/>`).join('')}
      <path d="M560 840 V300 Q800 120 1040 300 V840 Z" fill="#5a3418" stroke="#2a1608" stroke-width="16"/>
      ${[640, 760, 880].map((x) => `<rect x="${x - 40}" y="330" width="80" height="480" rx="8" fill="#4a2a12"/>`).join('')}
      <rect x="930" y="560" width="40" height="18" rx="4" fill="#c9a227"/><circle cx="950" cy="600" r="12" fill="#c9a227"/>
      ${[280, 1320].map((x) => `<rect x="${x - 10}" y="300" width="20" height="60" fill="#c9a227"/>${flame(x, 300, 1.4)}`).join('')}
      <rect y="840" width="1600" height="60" fill="#1a0f08"/>`,
    library: () => `${defs}<rect width="1600" height="900" fill="#3a2414"/>
      ${[0, 1, 2, 3].map((row) => `${books(60, 70 + row * 170, 560, 150, row + 3)}${books(980, 70 + row * 170, 560, 150, row + 11)}<rect x="40" y="${220 + row * 170}" width="1520" height="16" fill="#5a3418"/>`).join('')}
      <rect x="640" y="380" width="320" height="340" fill="#241008"/><rect x="620" y="360" width="360" height="40" fill="#6b3f22"/>
      <g class="fire">${[700, 760, 820, 880].map((x, i) => `<path d="M${x} 720 Q${x + 30} ${600 - i * 10} ${x + 60} 720 Z" fill="${i % 2 ? '#ff8c2a' : '#ffcc4d'}"/>`).join('')}</g>
      <circle cx="800" cy="680" r="220" fill="url(#glow)" opacity=".5"/>
      <rect y="760" width="1600" height="140" fill="#4a2a12"/>`,
    study: () => `${defs}<rect width="1600" height="900" fill="#1f3a2e"/>
      <rect x="1080" y="120" width="360" height="420" fill="url(#night)" stroke="#4a2a12" stroke-width="20"/><path d="M1260 120 V540 M1080 330 H1440" stroke="#4a2a12" stroke-width="12"/><circle cx="1350" cy="220" r="40" fill="#fff6d8"/>
      ${books(140, 120, 500, 150, 7)}<rect x="120" y="270" width="540" height="14" fill="#4a2a12"/>
      <rect x="0" y="640" width="1600" height="60" fill="#6b3f22"/><rect x="0" y="700" width="1600" height="200" fill="#3e2312"/>
      <path d="M300 640 L340 520 L420 520 L460 640 Z" fill="#c9a227"/><rect x="372" y="520" width="16" height="0" fill="#000"/><circle cx="380" cy="600" r="200" fill="url(#glow)" opacity=".5"/>
      <rect x="900" y="610" width="140" height="34" fill="#f6edd9" transform="rotate(-6 970 627)"/><rect x="940" y="600" width="140" height="34" fill="#efe2c4" transform="rotate(4 1010 617)"/>`,
    greenhouse: () => `${defs}<rect width="1600" height="900" fill="#0f2a2a"/>
      <circle cx="300" cy="140" r="50" fill="#fff6d8" opacity=".8"/>
      ${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 200} 0 V700" stroke="#9fb8b0" stroke-opacity=".35" stroke-width="6"/>`).join('')}
      ${[150, 330, 510].map((y) => `<path d="M0 ${y} H1600" stroke="#9fb8b0" stroke-opacity=".35" stroke-width="6"/>`).join('')}
      ${[[180, 560], [420, 520], [1180, 540], [1420, 560], [700, 600], [940, 590]].map(([x, y], i) => `<g><ellipse cx="${x}" cy="${y}" rx="${90 + (i % 3) * 20}" ry="${120 - (i % 2) * 20}" fill="${i % 2 ? '#2f7a4a' : '#3f9a5a'}"/><ellipse cx="${x - 40}" cy="${y - 50}" rx="40" ry="60" fill="#56b06e"/>${i % 2 ? `<circle cx="${x + 30}" cy="${y - 60}" r="16" fill="#f5a3c7"/><circle cx="${x + 10}" cy="${y - 90}" r="12" fill="#fff"/>` : `<circle cx="${x + 20}" cy="${y - 70}" r="14" fill="#c8a2f5"/>`}</g>`).join('')}
      <rect y="680" width="1600" height="40" fill="#6b3f22"/><rect y="720" width="1600" height="180" fill="#2a1a10"/>
      ${[200, 500, 1100, 1400].map((x) => `<path d="M${x - 60} 600 L${x + 60} 600 L${x + 44} 690 L${x - 44} 690 Z" fill="#c4622d"/><rect x="${x - 66}" y="592" width="132" height="18" fill="#d9763a"/>`).join('')}`,
    kitchen: () => `${defs}<rect width="1600" height="900" fill="#f0e6d0"/>
      ${Array.from({ length: 12 }, (_, r) => Array.from({ length: 22 }, (_, c) => ((r + c) % 2 ? `<rect x="${c * 76}" y="${r * 50}" width="76" height="50" fill="#e2d4b4"/>` : '')).join('')).join('')}
      <rect x="0" y="600" width="1600" height="300" fill="#7a4a2a"/><rect x="0" y="590" width="1600" height="24" fill="#c9b48a"/>
      <rect x="600" y="430" width="400" height="160" fill="#2b2b33"/>${[680, 800, 920].map((x) => `<ellipse cx="${x}" cy="430" rx="50" ry="10" fill="#444"/>`).join('')}
      <path d="M660 430 Q700 330 740 430 Z" fill="#888"/><rect x="640" y="360" width="120" height="70" rx="10" fill="#b8b8c0"/>
      ${[200, 300, 400, 1200, 1300, 1400].map((x, i) => `<rect x="${x - 30}" y="${200}" width="60" height="80" rx="10" fill="${['#e5484d', '#f5a524', '#30a46c'][i % 3]}" opacity=".85"/>`).join('')}
      <rect x="140" y="280" width="320" height="12" fill="#7a4a2a"/><rect x="1140" y="280" width="320" height="12" fill="#7a4a2a"/>`,
    gameroom: () => `${defs}<rect width="1600" height="900" fill="#2a1a3a"/>
      <rect x="1100" y="200" width="360" height="12" fill="#6b3f22"/><rect x="1100" y="360" width="360" height="12" fill="#6b3f22"/>
      <path d="M1180 200 L1180 130 Q1200 100 1220 130 L1220 200 Z" fill="#c9a227"/><circle cx="1330" cy="170" r="30" fill="#c0c0c8"/>
      <rect x="1360" y="300" width="50" height="60" fill="#c9a227"/>
      <rect x="0" y="660" width="1600" height="240" fill="#3e2312"/>
      <g transform="translate(500 560) skewX(-20)"><rect width="480" height="120" fill="#f3ead8"/>${Array.from({ length: 16 }, (_, i) => `<rect x="${(i % 8) * 60}" y="${Math.floor(i / 8) * 60}" width="30" height="60" fill="#2a1d14" transform="translate(${Math.floor(i / 8) % 2 ? 30 : 0} 0)"/>`).join('')}</g>`,
    cellar: () => `${defs}<rect width="1600" height="900" fill="#1c1a22"/>
      ${Array.from({ length: 10 }, (_, r) => Array.from({ length: 9 }, (_, c) => `<rect x="${c * 180 + (r % 2) * 90 - 40}" y="${r * 76}" width="172" height="70" rx="8" fill="#2a2732"/>`).join('')).join('')}
      <path d="M0 0 H1600 V120 Q800 220 0 120 Z" fill="#121018"/>
      ${[[260, 560], [560, 600], [1040, 600], [1340, 560]].map(([x, y]) => `<g><ellipse cx="${x}" cy="${y}" rx="110" ry="150" fill="#5a3418"/><path d="M${x - 110} ${y - 60} H${x + 110} M${x - 110} ${y + 60} H${x + 110}" stroke="#2a1608" stroke-width="12"/></g>`).join('')}
      ${[420, 800, 1180].map((x) => `<rect x="${x - 6}" y="330" width="12" height="40" fill="#f3ead8"/>${flame(x, 330, 1.2)}`).join('')}
      <rect y="760" width="1600" height="140" fill="#100e14"/>`,
    music: () => `${defs}<rect width="1600" height="900" fill="#1d2b4f"/>
      ${Array.from({ length: 16 }, (_, i) => `<rect x="${i * 100}" y="0" width="40" height="620" fill="#22355e"/>`).join('')}
      <rect y="600" width="1600" height="300" fill="#3e2312"/>
      <g transform="translate(980 380)"><path d="M0 220 L0 60 Q0 0 80 0 L420 0 Q520 0 520 120 Q440 140 420 220 Z" fill="#0b0b10"/><rect x="0" y="200" width="420" height="40" fill="#111"/>
        ${Array.from({ length: 14 }, (_, i) => `<rect x="${10 + i * 29}" y="206" width="26" height="30" fill="#f3f3f3"/>`).join('')}${Array.from({ length: 10 }, (_, i) => `<rect x="${30 + i * 39}" y="206" width="16" height="18" fill="#000"/>`).join('')}
        <rect x="30" y="240" width="18" height="120" fill="#0b0b10"/><rect x="380" y="240" width="18" height="120" fill="#0b0b10"/></g>
      ${[[200, 200], [420, 140], [640, 230]].map(([x, y], i) => `<text x="${x}" y="${y}" font-size="90" fill="#e9c46a" opacity=".7">${['♪', '♫', '♬'][i]}</text>`).join('')}
      <rect x="160" y="320" width="300" height="260" fill="#0f1830" stroke="#c9a227" stroke-width="10"/>`,
    // island:<emoji> and stadium:<emoji> draw a themed place with a big landmark in the middle
    island: (feature, night) => `${defs}
      <linearGradient id="isky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${night ? '#0b1440' : '#43b7e8'}"/><stop offset="1" stop-color="${night ? '#3a2a6a' : '#bde9ff'}"/></linearGradient>
      <rect width="1600" height="900" fill="url(#isky)"/>
      ${night ? Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 397) % 1600}" cy="${(i * 211) % 380}" r="${1 + (i % 3)}" fill="#fff" opacity=".7"/>`).join('') + '<circle cx="1320" cy="150" r="70" fill="#fff6d8"/>'
        : '<circle cx="1320" cy="150" r="80" fill="#ffe27a"/><circle cx="1320" cy="150" r="140" fill="#ffe27a" opacity=".2"/>' + [[300, 140], [520, 90], [980, 160]].map(([x, y]) => `<g fill="#fff" opacity=".9"><ellipse cx="${x}" cy="${y}" rx="90" ry="30"/><ellipse cx="${x + 50}" cy="${y - 20}" rx="60" ry="30"/></g>`).join('')}
      <rect y="470" width="1600" height="160" fill="${night ? '#1a3a6a' : '#1e90c8'}"/>
      ${[500, 540, 580].map((y, i) => `<path d="M0 ${y} Q200 ${y - 12} 400 ${y} T800 ${y} T1200 ${y} T1600 ${y}" stroke="#fff" stroke-opacity=".35" stroke-width="5" fill="none"/>`).join('')}
      <text x="800" y="560" text-anchor="middle" font-size="380">${feature || '🏝️'}</text>
      <path d="M0 640 Q400 590 800 630 T1600 610 V900 H0 Z" fill="${night ? '#a8946a' : '#f2d98f'}"/>
      ${[[120, 700, 1], [1480, 690, -1]].map(([x, y, d]) => `<g><path d="M${x} ${y} Q${x + 30 * d} ${y - 200} ${x + 10 * d} ${y - 380}" stroke="#7a4a2a" stroke-width="30" fill="none"/>${[-60, -20, 20, 60, 100].map((a) => `<ellipse cx="${x + 10 * d}" cy="${y - 380}" rx="150" ry="34" fill="#2f9a4a" transform="rotate(${a * d} ${x + 10 * d} ${y - 380}) translate(${90 * d} 0)"/>`).join('')}</g>`).join('')}
      ${[[400, 760], [1150, 790]].map(([x, y]) => `<text x="${x}" y="${y}" font-size="70">🐚</text>`).join('')}`,
    stadium: (feature) => `${defs}
      <linearGradient id="ssky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2a6b"/><stop offset="1" stop-color="#4a6ad0"/></linearGradient>
      <rect width="1600" height="900" fill="url(#ssky)"/>
      ${[200, 1400].map((x) => `<g><rect x="${x - 8}" y="40" width="16" height="260" fill="#ccc"/><rect x="${x - 70}" y="20" width="140" height="60" rx="8" fill="#eee"/>${[0, 1, 2, 3].map((i) => `<circle cx="${x - 48 + i * 32}" cy="50" r="12" fill="#fffbd0"/>`).join('')}<circle cx="${x}" cy="50" r="160" fill="#fffbd0" opacity=".12"/></g>`).join('')}
      <path d="M0 250 L1600 250 L1600 520 L0 520 Z" fill="#2b2b38"/>
      ${Array.from({ length: 5 }, (_, r) => Array.from({ length: 40 }, (_, c) => `<circle cx="${20 + c * 40 + (r % 2) * 20}" cy="${280 + r * 50}" r="14" fill="${['#e5484d', '#3e8ef7', '#f5c518', '#f3f3f3', '#30a46c'][(r * 7 + c * 3) % 5]}"/>`).join('')).join('')}
      <rect y="520" width="1600" height="380" fill="#2f9a4a"/>
      ${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 200}" y="520" width="100" height="380" fill="#2a8a42"/>`).join('')}
      <path d="M0 640 H1600 M800 520 V900" stroke="#fff" stroke-width="8" opacity=".85"/><circle cx="800" cy="760" r="110" stroke="#fff" stroke-width="8" fill="none" opacity=".85"/>
      <text x="800" y="700" text-anchor="middle" font-size="330">${feature || '🏆'}</text>`,
    dark: () => `<rect width="1600" height="900" fill="#08060c"/>`,
    title: () => `${defs}<rect width="1600" height="900" fill="url(#night)"/>`,
  };

  // ---------------- voices ----------------
  const VOICE = {
    narrator: { pitch: 0.95, rate: 0.92, prefer: ['Daniel', 'Arthur', 'Google UK English Male', 'Oliver'], lang: 'en-GB' },
    pembrook: { pitch: 0.75, rate: 0.85, prefer: ['Arthur', 'Daniel', 'Google UK English Male'], lang: 'en-GB' },
    ozzie: { pitch: 0.8, rate: 0.88, prefer: ['Fred', 'Aaron', 'Gordon', 'Rishi', 'Google US English'], lang: 'en' },
    victoria: { pitch: 1.05, rate: 1.0, prefer: ['Samantha', 'Karen', 'Google US English', 'Ava'], lang: 'en' },
    felix: { pitch: 1.05, rate: 1.1, prefer: ['Alex', 'Tom', 'Aaron', 'Evan'], lang: 'en' },
    ginny: { pitch: 1.25, rate: 0.85, prefer: ['Moira', 'Martha', 'Fiona', 'Kate'], lang: 'en' },
    bianca: { pitch: 1.15, rate: 1.05, prefer: ['Tessa', 'Karen', 'Nicky', 'Zoe'], lang: 'en' },
    lola: { pitch: 1.35, rate: 1.08, prefer: ['Kate', 'Serena', 'Nicky', 'Samantha'], lang: 'en' },
    rex: { pitch: 0.7, rate: 1.0, prefer: ['Gordon', 'Ralph', 'Fred', 'Tom'], lang: 'en' },
  };
  function pickVoice(who) {
    if (!('speechSynthesis' in root)) return null;
    const vs = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
    const spec = VOICE[who] || VOICE.narrator;
    for (const name of spec.prefer) { const v = vs.find((x) => x.name.indexOf(name) === 0); if (v) return v; }
    return vs.find((v) => v.lang.toLowerCase().startsWith(spec.lang.toLowerCase())) || vs[0] || null;
  }
  if ('speechSynthesis' in root) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); } catch (e) { /* ignore */ } }

  // ---------------- player ----------------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function words(text, startDelay) {
    let i = 0;
    return esc(text).split(/(\s+)/).map((w) => (/^\s+$/.test(w) ? w : `<span class="w" style="animation-delay:${(startDelay || 0) + (i++) * 0.07}s">${w}</span>`)).join('');
  }

  // "island:🌋" → the island scene with a volcano; "islandnight:💀" → at night
  function sceneSVG(bg) {
    const m = String(bg || '').match(/^(island|islandnight|stadium):(.*)$/);
    if (m) return m[1] === 'stadium' ? SCENES.stadium(m[2]) : SCENES.island(m[2], m[1] === 'islandnight');
    return (SCENES[bg] || SCENES.dark)();
  }
  function cardHTML(card, n, total) {
    const P = root.Portraits;
    const fx = (card.fx || []).map((f) => 'fx-' + f).join(' ');
    const cast = (card.cast || []).map((c, i) => {
      const talking = card.say && card.say.who === c.id;
      return `<div class="st-char ${c.anim || 'enter-up'} ${talking ? 'talking' : ''} ${c.flip ? 'flip' : ''} ${c.dim ? 'dim' : ''}" style="left:${c.x}%;--s:${c.size || 1};animation-delay:${c.delay != null ? c.delay : i * 0.15}s">
        <div class="st-bob">${P.svg(c.id, c.mood)}</div>
        ${talking ? `<div class="st-bubble ${c.x >= 50 ? 'left' : ''}">${words(card.say.text, 0.6)}</div>` : ''}
        ${c.label ? `<div class="st-label">${esc(c.label)}</div>` : ''}
      </div>`;
    }).join('');
    const sayOff = card.say && !(card.cast || []).some((c) => c.id === card.say.who);
    const props = (card.props || []).map((p) => `<div class="st-prop ${p.anim || 'pop'}" style="left:${p.x}%;top:${p.y}%;font-size:${p.s || 8}vmin;animation-delay:${p.delay || 0.4}s">${p.e}</div>`).join('');
    return `<div class="st-card ${fx}">
      <svg class="st-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">${sceneSVG(card.bg)}</svg>
      ${(card.fx || []).includes('snow') ? `<div class="snow">${Array.from({ length: 60 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${-(i * 0.37) % 8}s;animation-duration:${6 + (i % 5)}s"></i>`).join('')}</div>` : ''}
      <div class="st-cast">${cast}</div>
      <div class="st-props">${props}</div>
      ${card.time ? `<div class="st-time">🕰️ ${esc(card.time)}</div>` : ''}
      ${card.title ? `<div class="st-title"><h1>${esc(card.title)}</h1>${card.sub ? `<p>${esc(card.sub)}</p>` : ''}</div>` : ''}
      ${sayOff ? `<div class="st-offbubble">${P.svg(card.say.who, card.say.mood)}<div>${words(card.say.text, 0.4)}</div></div>` : ''}
      ${card.caption ? `<div class="st-caption">${words(card.caption, 0.3)}</div>` : ''}
      <div class="st-progress">${n + 1} / ${total}</div>
    </div>`;
  }

  function mount(el, cards, opts) {
    const o = opts || {};
    let i = 0;
    let playing = false;
    let started = false;
    let voiceOn = o.voice !== false && 'speechSynthesis' in root;
    let timer = null;
    let token = 0;
    el.innerHTML = `<div class="story-stage"><div class="st-holder"></div>
      <div class="st-controls">
        <button data-st="prev" title="Back">⏮</button>
        <button data-st="play" title="Play / pause">⏸</button>
        <button data-st="next" title="Next">⏭</button>
        <button data-st="voice" title="Voice on/off">${voiceOn ? '🔊' : '🔇'}</button>
        <button data-st="skip" title="Skip the story">Skip ⏩</button>
      </div>
      <button class="st-start">▶&nbsp; Play the story</button></div>`;
    const stage = el.querySelector('.story-stage');
    const holder = el.querySelector('.st-holder');
    const playBtn = el.querySelector('[data-st=play]');

    function stopAudio() { try { if ('speechSynthesis' in root) speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
    function speakQueue(parts, done) {
      const my = ++token;
      if (!voiceOn || !parts.length) { done(false); return; }
      stopAudio();
      let k = 0;
      const nextPart = () => {
        if (my !== token) return;
        if (k >= parts.length) { done(true); return; }
        const [who, text] = parts[k++];
        const u = new SpeechSynthesisUtterance(text.replace(/[“”]/g, '"'));
        const spec = VOICE[who] || VOICE.narrator;
        const v = pickVoice(who);
        if (v) u.voice = v;
        u.pitch = spec.pitch;
        u.rate = spec.rate;
        u.onend = () => setTimeout(nextPart, 250);
        u.onerror = () => setTimeout(nextPart, 250);
        speechSynthesis.speak(u);
      };
      nextPart();
    }
    function show(n) {
      clearTimeout(timer);
      token++;
      stopAudio();
      i = Math.max(0, Math.min(cards.length - 1, n));
      const card = cards[i];
      holder.innerHTML = cardHTML(card, i, cards.length);
      if (card.sfx && root.Sfx) [].concat(card.sfx).forEach((s, k) => setTimeout(() => { if (cards[i] === card) root.Sfx.play(s); }, (card.sfxAt || 300) + k * 700));
      if (!playing) return;
      const parts = [];
      if (card.caption) parts.push(['narrator', card.caption]);
      if (card.say) parts.push([card.say.who, card.say.text]);
      if (card.title && !card.caption) parts.push(['narrator', card.title + (card.sub ? '. ' + card.sub : '')]);
      const text = parts.map((p) => p[1]).join(' ');
      const readMs = 2600 + text.length * 55;
      const startDelay = card.sfx && /crash|sting|knock/.test([].concat(card.sfx).join()) ? 1400 : 700;
      const my = token;
      // Advance when the voice finishes, or after a reading-time fallback (some devices never fire "end").
      let finished = false;
      const advance = () => { if (finished || my !== token || !playing) return; finished = true; timer = setTimeout(() => { if (my === token && playing) next(); }, 1300); };
      setTimeout(() => { if (my === token) speakQueue(parts, (spoke) => { if (spoke) advance(); }); }, startDelay);
      timer = setTimeout(advance, startDelay + (voiceOn ? readMs * 2.2 + 4000 : readMs));
    }
    function next() {
      if (i >= cards.length - 1) { playing = false; playBtn.textContent = '▶'; token++; if (o.onEnd) o.onEnd(); return; }
      show(i + 1);
    }
    function start() {
      started = true;
      stage.classList.add('started');
      if (root.Sfx) root.Sfx.unlock();
      if (voiceOn) { try { speechSynthesis.speak(new SpeechSynthesisUtterance(' ')); } catch (e) { /* ignore */ } }
      playing = true;
      playBtn.textContent = '⏸';
      show(0);
    }
    el.addEventListener('click', (e) => {
      if (e.target.closest('.st-start')) { start(); return; }
      const b = e.target.closest('[data-st]');
      if (!b) return;
      if (!started) { start(); if (b.dataset.st !== 'skip') return; }
      const a = b.dataset.st;
      if (a === 'prev') show(i - 1);
      if (a === 'next') next();
      if (a === 'play') { playing = !playing; playBtn.textContent = playing ? '⏸' : '▶'; if (playing) show(i); else { clearTimeout(timer); token++; stopAudio(); } }
      if (a === 'voice') { voiceOn = !voiceOn; b.textContent = voiceOn ? '🔊' : '🔇'; if (!voiceOn) stopAudio(); if (playing) show(i); }
      if (a === 'skip') { playing = false; clearTimeout(timer); token++; stopAudio(); show(cards.length - 1); playBtn.textContent = '▶'; if (o.onEnd) o.onEnd(); }
    });
    holder.innerHTML = cardHTML(cards[0], 0, cards.length);
    return {
      destroy() { clearTimeout(timer); token++; stopAudio(); el.innerHTML = ''; },
      start,
    };
  }

  root.Story = { mount, SCENES, cardHTML };
})(window);
