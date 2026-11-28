/* Original illustrated characters for Marrowby Manor, drawn as SVG so they stay sharp on a big TV.
   Portraits.svg(id, mood) → an SVG string. Moods change the eyebrows and mouth:
   neutral, happy, sad, angry, worried, gasp, sly, grin. */
(function (root) {
  'use strict';

  const LOOKS = {
    ozzie: { skin: '#f1c7a5', cheek: '#e8918a', hair: 'sides', hairColor: '#f4f4f0', clothes: '#8c2f39', collar: 'cardigan', bow: '#e9c46a',
      glasses: 'round', stache: 'bushy', stacheColor: '#f4f4f0', brows: '#e9e6dd', mood: 'happy', watch: true },
    pembrook: { skin: '#e7b98f', cheek: '#d98a7a', hair: 'slick', hairColor: '#8d8d93', clothes: '#1b1b22', collar: 'tux', bow: '#111',
      stache: 'thin', stacheColor: '#6e6e74', brows: '#5d5d63', mood: 'neutral', longFace: true },
    victoria: { skin: '#c98d63', cheek: '#c86b5c', hair: 'bob', hairColor: '#2b1a14', clothes: '#22355e', collar: 'blazer', lips: '#b3263a',
      earrings: '#e9c46a', brows: '#2b1a14', mood: 'neutral' },
    felix: { skin: '#f0c9a8', cheek: '#e39a8c', hair: 'messy', hairColor: '#3a2a20', clothes: '#4b2a6b', collar: 'cape', hat: 'top', hatColor: '#26173a',
      hatBand: '#c22f34', goatee: '#3a2a20', brows: '#3a2a20', mood: 'worried' },
    ginny: { skin: '#f3d0b4', cheek: '#f0908a', hair: 'curlybun', hairColor: '#cfcfd6', clothes: '#3f7d4e', collar: 'cardigan', glasses: 'half',
      flower: '#f5a524', brows: '#a9a9b0', mood: 'happy' },
    bianca: { skin: '#8d5a3b', cheek: '#b65e4c', hair: 'curly', hairColor: '#7a2e1d', clothes: '#c22f34', collar: 'apron', hat: 'chef',
      freckles: true, brows: '#4a1c12', mood: 'happy' },
    lola: { skin: '#ffd9bd', cheek: '#f39a90', hair: 'ponytail', hairColor: '#d9792b', clothes: '#167a7a', collar: 'sweater', glasses: 'big',
      pencil: true, freckles: true, brows: '#a85419', mood: 'neutral' },
    rex: { skin: '#d9a77f', cheek: '#c87766', hair: 'pompadour', hairColor: '#c9ccd3', clothes: '#c8961e', collar: 'coat', goatee: '#a6a9b0',
      brows: '#8f939b', mood: 'grin', ring: true },
    // ---- Treasure Island ----
    goldbeard: { skin: '#e0ac7e', cheek: '#d9826a', hair: 'none', hairColor: '#e9b23a', clothes: '#7a1f2b', collar: 'coat', hat: 'tricorn', beard: '#e9b23a', stache: 'bushy', stacheColor: '#e9b23a', eyepatch: true, brows: '#c9921a', mood: 'happy', parrot: true },
    marlo: { skin: '#8d5a3b', cheek: '#b65e4c', hair: 'messy', hairColor: '#1e1410', clothes: '#f3f3f3', collar: 'sailor', hat: 'bandana', hatColor: '#d62f3a', goatee: '#1e1410', brows: '#1e1410', mood: 'sly' },
    sal: { skin: '#f0c9a8', cheek: '#ea8f84', hair: 'curlybun', hairColor: '#b9b9c2', clothes: '#c84a2a', collar: 'apron', brows: '#9a9aa3', mood: 'happy', earrings: '#e9c46a' },
    nina: { skin: '#c98d63', cheek: '#c86b5c', hair: 'ponytail', hairColor: '#1b1210', clothes: '#1d3a6b', collar: 'blazer', hat: 'captain', brows: '#1b1210', mood: 'neutral' },
    kai: { skin: '#d9a77f', cheek: '#c87766', hair: 'messy', hairColor: '#f2cf6b', clothes: '#1aa5a5', collar: 'hawaiian', glasses: 'sun', brows: '#c9a040', mood: 'grin' },
    coral: { skin: '#ffd9bd', cheek: '#f39a90', hair: 'bob', hairColor: '#c0432a', clothes: '#f6f6f6', collar: 'labcoat', glasses: 'round', freckles: true, brows: '#a0351f', mood: 'neutral' },
    bernie: { skin: '#f1c7a5', cheek: '#e8918a', hair: 'sides', hairColor: '#7a5230', clothes: '#e8528a', collar: 'hawaiian', hat: 'straw', glasses: 'sun', stache: 'thin', stacheColor: '#7a5230', brows: '#7a5230', mood: 'happy', camera: true },
    // ---- Championship Day ----
    coach: { skin: '#c98d63', cheek: '#c86b5c', hair: 'none', hairColor: '#2b1a14', clothes: '#c22f34', collar: 'tracksuit', hat: 'cap', hatColor: '#c22f34', stache: 'bushy', stacheColor: '#3a2a20', brows: '#2b1a14', whistle: true, mood: 'happy' },
    jordan: { skin: '#8d5a3b', cheek: '#b65e4c', hair: 'messy', hairColor: '#1b1210', clothes: '#2563eb', collar: 'jersey', number: '10', hat: 'headband', hatColor: '#f5f5f5', brows: '#1b1210', mood: 'grin' },
    vance: { skin: '#f0c9a8', cheek: '#e39a8c', hair: 'slick', hairColor: '#1b1b22', clothes: '#5b2a86', collar: 'tracksuit', glasses: 'sun', goatee: '#1b1b22', brows: '#1b1b22', mood: 'sly' },
    rita: { skin: '#e0b48e', cheek: '#d98a7a', hair: 'ponytail', hairColor: '#5a3a22', clothes: '#111', collar: 'stripes', whistle: true, brows: '#5a3a22', mood: 'neutral' },
    buzz: { skin: '#f5c518', cheek: '#f08a24', hair: 'none', hairColor: '#111', clothes: '#f5c518', collar: 'mascot', hat: 'antenna', brows: '#3a2a00', mood: 'grin' },
    ace: { skin: '#d9a77f', cheek: '#c87766', hair: 'pompadour', hairColor: '#6b4226', clothes: '#22355e', collar: 'tux', bow: '#c22f34', hat: 'headset', brows: '#5a3418', mood: 'happy' },
    stan: { skin: '#f3d0b4', cheek: '#f0908a', hair: 'curly', hairColor: '#d9792b', clothes: '#e5484d', collar: 'apron', hat: 'paper', goatee: '#d9792b', freckles: true, brows: '#b05a1a', mood: 'happy' },
    narrator: { skin: '#e0b48e', cheek: '#d98a7a', hair: 'slick', hairColor: '#3b2b22', clothes: '#333', collar: 'tux', bow: '#c22f34', brows: '#3b2b22', mood: 'neutral' },
  };

  const BROWS = {
    neutral: [[70, 74, 92, 73], [108, 73, 130, 74]],
    happy: [[70, 72, 92, 70], [108, 70, 130, 72]],
    sad: [[70, 70, 92, 76], [108, 76, 130, 70]],
    worried: [[70, 72, 92, 66], [108, 66, 130, 72]],
    angry: [[70, 68, 93, 77], [107, 77, 130, 68]],
    gasp: [[70, 64, 92, 62], [108, 62, 130, 64]],
    sly: [[70, 75, 92, 75], [108, 66, 130, 70]],
    grin: [[70, 70, 92, 69], [108, 69, 130, 70]],
  };
  const MOUTHS = {
    neutral: '<path d="M90 122 Q100 125 110 122" stroke="#5a2a20" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    happy: '<path d="M86 118 Q100 132 114 118" stroke="#5a2a20" stroke-width="4" fill="none" stroke-linecap="round"/>',
    sad: '<path d="M88 127 Q100 117 112 127" stroke="#5a2a20" stroke-width="4" fill="none" stroke-linecap="round"/>',
    worried: '<path d="M88 124 Q94 120 100 124 Q106 128 112 123" stroke="#5a2a20" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    angry: '<path d="M88 125 L112 123" stroke="#5a2a20" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
    gasp: '<ellipse cx="100" cy="124" rx="7" ry="9" fill="#4a1d18"/><ellipse cx="100" cy="128" rx="4" ry="3" fill="#d96a6a"/>',
    sly: '<path d="M88 122 Q102 128 114 115" stroke="#5a2a20" stroke-width="4" fill="none" stroke-linecap="round"/>',
    grin: '<path d="M84 116 Q100 136 116 116 Z" fill="#4a1d18"/><path d="M87 117 L113 117 L110 122 L90 122 Z" fill="#fff"/>',
  };

  function hairBack(L) {
    const c = L.hairColor;
    switch (L.hair) {
      case 'bob': return `<path d="M44 92 Q40 34 100 30 Q160 34 156 92 L160 140 Q150 150 138 140 L62 140 Q50 150 40 140 Z" fill="${c}"/>`;
      case 'ponytail': return `<path d="M140 60 Q186 60 180 120 Q176 150 160 160 Q170 120 146 92 Z" fill="${c}"/>`;
      case 'curly': return [30, 52, 74].map((y, i) => `<circle cx="${52 - i * 2}" cy="${80 + y * 0.5}" r="16" fill="${c}"/><circle cx="${148 + i * 2}" cy="${80 + y * 0.5}" r="16" fill="${c}"/>`).join('');
      case 'curlybun': return `<circle cx="100" cy="28" r="20" fill="${c}"/>`;
      default: return '';
    }
  }
  function hairFront(L) {
    const c = L.hairColor;
    switch (L.hair) {
      case 'sides': return `<ellipse cx="56" cy="80" rx="13" ry="20" fill="${c}"/><ellipse cx="144" cy="80" rx="13" ry="20" fill="${c}"/><path d="M84 42 Q100 36 116 42" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="88" cy="52" rx="10" ry="5" fill="#fff" opacity=".35"/>`;
      case 'slick': return `<path d="M53 90 Q50 34 100 32 Q150 34 147 90 Q142 58 112 54 L104 46 Q96 56 70 60 Q56 70 53 90 Z" fill="${c}"/><path d="M104 46 L108 56" stroke="#fff" stroke-opacity=".3" stroke-width="2"/>`;
      case 'bob': return `<path d="M52 92 Q50 40 100 38 Q150 40 148 92 Q130 62 100 58 Q78 56 62 76 Z" fill="${c}"/><path d="M100 38 Q92 60 64 70" stroke="#000" stroke-opacity=".15" stroke-width="3" fill="none"/>`;
      case 'messy': return `<path d="M52 86 L48 58 L62 64 L60 40 L78 52 L84 30 L98 48 L110 28 L118 50 L136 36 L134 58 L152 54 L146 86 Q130 64 100 62 Q72 62 52 86 Z" fill="${c}"/>`;
      case 'curlybun': return [[60, 66], [74, 50], [92, 44], [110, 44], [128, 50], [142, 66], [54, 84], [146, 84]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="${c}"/>`).join('') + '<path d="M70 52 Q100 40 130 52" stroke="#fff" stroke-opacity=".25" stroke-width="3" fill="none"/>';
      case 'curly': return [[60, 70], [76, 62], [124, 62], [140, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="${c}"/>`).join('');
      case 'ponytail': return `<path d="M52 92 Q48 36 100 34 Q152 36 148 92 Q140 60 112 56 Q100 66 74 62 Q58 70 52 92 Z" fill="${c}"/><circle cx="146" cy="70" r="7" fill="#167a7a"/>`;
      case 'pompadour': return `<path d="M52 90 Q46 52 66 40 Q80 14 120 20 Q156 26 150 58 Q148 70 148 90 Q140 62 116 58 Q90 52 64 66 Q56 74 52 90 Z" fill="${c}"/><path d="M76 34 Q104 20 138 34" stroke="#fff" stroke-opacity=".45" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      default: return '';
    }
  }
  function hat(L) {
    if (L.hat === 'top') return `<g><rect x="62" y="-2" width="76" height="52" rx="6" fill="${L.hatColor}"/><rect x="62" y="34" width="76" height="10" fill="${L.hatBand}"/><ellipse cx="100" cy="50" rx="58" ry="10" fill="${L.hatColor}"/><path d="M70 6 L70 40" stroke="#fff" stroke-opacity=".15" stroke-width="5"/></g>`;
    if (L.hat === 'tricorn') return '<g><path d="M30 62 Q100 -12 170 62 Q150 44 100 50 Q50 44 30 62 Z" fill="#1b1b22"/><path d="M30 62 Q100 34 170 62" stroke="#e9c46a" stroke-width="5" fill="none"/><circle cx="100" cy="30" r="9" fill="#f3f3f3"/><path d="M95 40 L105 40 M96 28 L104 28" stroke="#1b1b22" stroke-width="2"/></g>';
    if (L.hat === 'bandana') return `<g><path d="M50 72 Q50 30 100 28 Q150 30 150 72 Q100 56 50 72 Z" fill="${L.hatColor}"/><path d="M146 64 L172 58 L160 80 Z M146 66 L168 86 L150 84 Z" fill="${L.hatColor}"/>${[70, 95, 120].map((x) => `<circle cx="${x}" cy="48" r="4" fill="#fff" opacity=".8"/>`).join('')}</g>`;
    if (L.hat === 'captain') return '<g><path d="M52 62 Q54 20 100 18 Q146 20 148 62 Z" fill="#fafafa"/><rect x="50" y="56" width="100" height="10" fill="#1b1b22"/><path d="M58 66 Q100 84 142 66 Z" fill="#1b1b22"/><text x="100" y="50" text-anchor="middle" font-size="20">⚓</text></g>';
    if (L.hat === 'straw') return '<g><ellipse cx="100" cy="58" rx="80" ry="16" fill="#e3c27a"/><path d="M62 58 Q64 18 100 18 Q136 18 138 58 Z" fill="#edd08c"/><rect x="62" y="44" width="76" height="10" fill="#e8528a"/><path d="M30 58 Q100 72 170 58" stroke="#c9a557" stroke-width="3" fill="none"/></g>';
    if (L.hat === 'cap') return `<g><path d="M52 66 Q52 22 100 22 Q148 22 148 66 Z" fill="${L.hatColor}"/><path d="M54 64 Q20 66 24 78 Q60 74 100 70 Z" fill="${L.hatColor}"/><path d="M54 64 Q20 66 24 78" stroke="#000" stroke-opacity=".25" stroke-width="3" fill="none"/><circle cx="100" cy="24" r="5" fill="#fff"/><text x="110" y="54" text-anchor="middle" font-size="22" font-weight="900" fill="#fff" font-family="Arial">C</text></g>`;
    if (L.hat === 'headband') return `<g><rect x="48" y="58" width="104" height="14" rx="6" fill="${L.hatColor}"/><path d="M48 62 H152" stroke="#2563eb" stroke-width="3"/></g>`;
    if (L.hat === 'headset') return '<g><path d="M50 92 Q48 30 100 28 Q152 30 150 92" stroke="#222" stroke-width="7" fill="none"/><rect x="40" y="82" width="18" height="30" rx="8" fill="#222"/><rect x="142" y="82" width="18" height="30" rx="8" fill="#222"/><path d="M50 108 Q60 132 84 128" stroke="#222" stroke-width="4" fill="none"/><circle cx="86" cy="128" r="5" fill="#444"/></g>';
    if (L.hat === 'paper') return '<g><path d="M56 62 L64 34 L136 34 L144 62 Z" fill="#fafafa" stroke="#ddd" stroke-width="2"/><rect x="56" y="50" width="88" height="10" fill="#e5484d"/><text x="100" y="47" text-anchor="middle" font-size="14" font-weight="900" fill="#e5484d" font-family="Arial">SNACKS</text></g>';
    if (L.hat === 'antenna') return '<g stroke="#111" stroke-width="5" fill="none"><path d="M78 46 Q66 20 56 10"/><path d="M122 46 Q134 20 144 10"/></g><circle cx="56" cy="10" r="9" fill="#111"/><circle cx="144" cy="10" r="9" fill="#111"/><path d="M52 66 Q100 30 148 66" stroke="#111" stroke-width="10" fill="none"/>';
    if (L.hat === 'chef') return `<g><rect x="64" y="34" width="72" height="24" rx="4" fill="#fbfbfb" stroke="#ddd"/><circle cx="72" cy="24" r="18" fill="#fff"/><circle cx="100" cy="14" r="22" fill="#fff"/><circle cx="128" cy="24" r="18" fill="#fff"/><path d="M84 40 V56 M100 40 V56 M116 40 V56" stroke="#e3e3e3" stroke-width="2"/></g>`;
    return '';
  }
  function body(L) {
    const c = L.clothes;
    const shoulders = `<path d="M14 230 Q18 172 70 158 L130 158 Q182 172 186 230 Z" fill="${c}"/>`;
    switch (L.collar) {
      case 'tux': return shoulders + `<path d="M80 158 L100 200 L120 158 Z" fill="#fff"/><path d="M80 158 L100 200 L86 230 L62 166 Z" fill="#000" opacity=".35"/><path d="M120 158 L100 200 L114 230 L138 166 Z" fill="#000" opacity=".35"/><circle cx="100" cy="212" r="2.5" fill="#fff"/>`;
      case 'blazer': return shoulders + `<path d="M82 158 L100 192 L118 158 Z" fill="#f3ead8"/><path d="M80 158 L100 194 L92 230 L66 168 Z" fill="#000" opacity=".25"/><path d="M120 158 L100 194 L108 230 L134 168 Z" fill="#000" opacity=".25"/><circle cx="100" cy="174" r="4" fill="#e9c46a"/>`;
      case 'cardigan': return shoulders + `<path d="M84 158 L100 182 L116 158 Z" fill="#f3ead8"/><path d="M100 182 L100 230" stroke="#000" stroke-opacity=".3" stroke-width="3"/>${[194, 210, 224].map((y) => `<circle cx="106" cy="${y}" r="3" fill="#e9c46a"/>`).join('')}`;
      case 'cape': return `<path d="M10 230 Q14 168 62 154 L100 176 L138 154 Q186 168 190 230 Z" fill="${c}"/><path d="M62 154 L48 132 L84 160 Z M138 154 L152 132 L116 160 Z" fill="#c22f34"/><path d="M86 160 L100 186 L114 160 Z" fill="#fff"/>`;
      case 'apron': return shoulders + `<path d="M70 168 L130 168 L136 230 L64 230 Z" fill="#fafafa"/><path d="M70 168 L84 158 M130 168 L116 158" stroke="#fafafa" stroke-width="6"/><circle cx="100" cy="200" r="7" fill="#c22f34" opacity=".25"/>`;
      case 'sweater': return shoulders + `<path d="M78 158 Q100 176 122 158" stroke="#0f5a5a" stroke-width="8" fill="none"/><path d="M40 200 L160 200" stroke="#fff" stroke-opacity=".18" stroke-width="6" stroke-dasharray="10 8"/>`;
      case 'sailor': return shoulders + `${[178, 196, 214].map((y) => `<path d="M24 ${y} H176" stroke="#1d3a6b" stroke-width="9"/>`).join('')}<path d="M78 158 L100 186 L122 158 Z" fill="${L.skin}"/>`;
      case 'hawaiian': return shoulders + `<path d="M80 158 L100 190 L120 158 Z" fill="${L.skin}"/>${[[44, 196], [70, 216], [128, 200], [156, 218], [100, 222], [60, 178], [140, 178]].map(([x, y]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="4" ry="7" fill="#fff6a8" transform="rotate(${a}) translate(0 -6)"/>`).join('')}<circle r="3" fill="#f08a24"/></g>`).join('')}`;
      case 'labcoat': return shoulders + `<path d="M82 158 L100 194 L118 158 Z" fill="#8fd3e8"/><path d="M80 158 L100 196 L94 230 L64 168 Z" fill="#000" opacity=".08"/><path d="M120 158 L100 196 L106 230 L136 168 Z" fill="#000" opacity=".08"/><rect x="130" y="196" width="22" height="18" rx="3" fill="#e5e5e5"/><path d="M136 196 V188" stroke="#2563eb" stroke-width="3"/>`;
      case 'tracksuit': return shoulders + `<path d="M100 162 V230" stroke="#fff" stroke-opacity=".7" stroke-width="3"/><path d="M84 158 Q100 170 116 158" stroke="#fff" stroke-width="5" fill="none"/><path d="M30 196 L44 230 M170 196 L156 230" stroke="#fff" stroke-width="6"/>`;
      case 'jersey': return shoulders + `<path d="M80 158 Q100 178 120 158" stroke="#fff" stroke-width="7" fill="none"/><text x="100" y="222" text-anchor="middle" font-size="40" font-weight="900" fill="#fff" font-family="Arial">${L.number || '7'}</text>`;
      case 'stripes': return `<path d="M14 230 Q18 172 70 158 L130 158 Q182 172 186 230 Z" fill="#fafafa"/>${[30, 58, 86, 114, 142, 170].map((x) => `<path d="M${x} 162 V230" stroke="#111" stroke-width="12"/>`).join('')}<path d="M84 158 L100 176 L116 158" stroke="#111" stroke-width="6" fill="none"/>`;
      case 'mascot': return shoulders + `${[176, 204].map((y) => `<path d="M20 ${y} H180" stroke="#111" stroke-width="14"/>`).join('')}<path d="M24 200 Q8 180 22 168 Q40 176 34 200 Z M176 200 Q192 180 178 168 Q160 176 166 200 Z" fill="#cfe8ff" opacity=".9"/>`;
      case 'coat': return shoulders + `<path d="M84 158 L100 186 L116 158 Z" fill="#2b2b33"/><path d="M80 158 L100 188 L90 230 L60 170 Z" fill="#8a6610"/><path d="M120 158 L100 188 L110 230 L140 170 Z" fill="#8a6610"/><path d="M60 196 L70 192" stroke="#fff" stroke-width="3"/><circle cx="50" cy="214" r="4" fill="#ffe27a"/>`;
      default: return shoulders;
    }
  }

  function svg(id, mood, opts) {
    const L = LOOKS[id] || LOOKS.narrator;
    const m = mood || L.mood || 'neutral';
    const o = opts || {};
    const face = L.longFace ? { rx: 42, ry: 58 } : { rx: 46, ry: 54 };
    const brow = BROWS[m] || BROWS.neutral;
    const eyeY = 92;
    const eyes = m === 'happy' || m === 'grin'
      ? `<path d="M76 ${eyeY} Q82 ${eyeY - 7} 88 ${eyeY}" stroke="#2a1a14" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M112 ${eyeY} Q118 ${eyeY - 7} 124 ${eyeY}" stroke="#2a1a14" stroke-width="4" fill="none" stroke-linecap="round"/>`
      : `<g class="pp-blink"><ellipse cx="82" cy="${eyeY}" rx="${m === 'gasp' ? 6.5 : 5}" ry="${m === 'gasp' ? 7.5 : 6}" fill="#2a1a14"/><ellipse cx="118" cy="${eyeY}" rx="${m === 'gasp' ? 6.5 : 5}" ry="${m === 'gasp' ? 7.5 : 6}" fill="#2a1a14"/><circle cx="84" cy="${eyeY - 2}" r="1.8" fill="#fff"/><circle cx="120" cy="${eyeY - 2}" r="1.8" fill="#fff"/>${m === 'sly' ? `<path d="M75 ${eyeY - 4} L89 ${eyeY - 3}" stroke="${L.skin}" stroke-width="5"/>` : ''}</g>`;
    const glasses = L.glasses === 'round' ? '<g stroke="#5b4636" stroke-width="3" fill="#fff" fill-opacity=".12"><circle cx="82" cy="92" r="13"/><circle cx="118" cy="92" r="13"/><path d="M95 91 Q100 87 105 91" fill="none"/></g>'
      : L.glasses === 'big' ? '<g stroke="#2b2b33" stroke-width="4" fill="#fff" fill-opacity=".12"><rect x="66" y="78" width="30" height="27" rx="9"/><rect x="104" y="78" width="30" height="27" rx="9"/><path d="M96 90 L104 90" fill="none"/></g>'
        : L.glasses === 'sun' ? '<g><path d="M64 84 H96 Q96 104 80 104 Q64 104 64 84 Z" fill="#111"/><path d="M104 84 H136 Q136 104 120 104 Q104 104 104 84 Z" fill="#111"/><path d="M96 88 H104 M60 86 H64 M136 86 H140" stroke="#111" stroke-width="4"/><path d="M70 88 L76 88" stroke="#fff" stroke-opacity=".6" stroke-width="3"/></g>'
        : L.glasses === 'half' ? '<g stroke="#b08d57" stroke-width="3" fill="#fff" fill-opacity=".15"><path d="M70 96 Q82 108 94 96 Z"/><path d="M106 96 Q118 108 130 96 Z"/><path d="M94 97 L106 97" fill="none"/><path d="M70 96 Q60 130 66 150" fill="none" stroke-width="1.5"/></g>' : '';
    const stache = L.stache === 'bushy' ? `<path d="M76 114 Q88 104 100 112 Q112 104 124 114 Q118 122 100 117 Q82 122 76 114 Z" fill="${L.stacheColor}"/>`
      : L.stache === 'thin' ? `<path d="M84 113 Q100 106 116 113" stroke="${L.stacheColor}" stroke-width="3.5" fill="none" stroke-linecap="round"/>` : '';
    const beard = L.beard ? `<path d="M56 104 Q60 160 100 168 Q140 160 144 104 Q130 132 100 134 Q70 132 56 104 Z" fill="${L.beard}"/>` : '';
    const eyepatch = L.eyepatch ? '<g><path d="M56 70 L146 104" stroke="#111" stroke-width="4"/><ellipse cx="118" cy="92" rx="13" ry="11" fill="#111"/></g>' : '';
    const whistle = L.whistle ? '<g><path d="M84 160 Q100 196 116 160" stroke="#e5484d" stroke-width="3" fill="none"/><rect x="92" y="190" width="18" height="11" rx="4" fill="#c0c0c8"/><circle cx="93" cy="196" r="6" fill="#c0c0c8"/></g>' : '';
    const camera = L.camera ? '<g><path d="M70 160 L120 200" stroke="#222" stroke-width="3"/><rect x="108" y="196" width="34" height="24" rx="4" fill="#222"/><circle cx="125" cy="208" r="8" fill="#555" stroke="#999" stroke-width="2"/></g>' : '';
    const parrot = L.parrot ? '<g transform="translate(160 150)"><ellipse cx="0" cy="10" rx="14" ry="22" fill="#2fa84f"/><circle cx="0" cy="-14" r="11" fill="#e5484d"/><path d="M8 -16 Q18 -12 9 -8 Z" fill="#f5c518"/><circle cx="3" cy="-17" r="2.5" fill="#111"/><path d="M-4 30 L-8 46 L4 32 Z" fill="#3e8ef7"/></g>' : '';
    const goatee = L.goatee ? `<path d="M92 134 Q100 152 108 134 Q100 140 92 134 Z" fill="${L.goatee}"/>` : '';
    const freckles = L.freckles ? '<g fill="#a0522d" opacity=".5"><circle cx="74" cy="108" r="1.6"/><circle cx="80" cy="112" r="1.6"/><circle cx="70" cy="113" r="1.6"/><circle cx="126" cy="108" r="1.6"/><circle cx="120" cy="112" r="1.6"/><circle cx="130" cy="113" r="1.6"/></g>' : '';
    const lips = L.lips && !['gasp', 'grin'].includes(m) ? MOUTHS[m].replace('#5a2a20', L.lips) : MOUTHS[m];
    const tears = m === 'sad' ? '<path d="M124 100 Q127 108 124 112 Q121 108 124 100 Z" fill="#7cc4ff"/>' : '';
    const sweat = m === 'worried' ? '<path d="M140 62 Q145 72 140 76 Q135 72 140 62 Z" fill="#9ed8ff"/>' : '';
    const flower = L.flower ? `<g transform="translate(140 52)">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="6" ry="10" fill="${L.flower}" transform="rotate(${a}) translate(0 -8)"/>`).join('')}<circle r="5" fill="#7a3d0a"/></g>` : '';
    const pencil = L.pencil ? '<g transform="translate(150 64) rotate(30)"><rect x="-4" y="-26" width="8" height="40" fill="#f5c518"/><path d="M-4 14 L0 24 L4 14 Z" fill="#f0d2a8"/><rect x="-4" y="-30" width="8" height="6" fill="#e5484d"/></g>' : '';
    const ear = (x) => `<ellipse cx="${x}" cy="96" rx="9" ry="13" fill="${L.skin}"/>`;
    const earrings = L.earrings ? `<circle cx="54" cy="112" r="4.5" fill="${L.earrings}"/><circle cx="146" cy="112" r="4.5" fill="${L.earrings}"/>` : '';
    const bow = L.bow ? `<path d="M100 162 L84 154 L84 170 Z M100 162 L116 154 L116 170 Z" fill="${L.bow}"/><circle cx="100" cy="162" r="4" fill="${L.bow}"/>` : '';
    const watch = L.watch ? '<path d="M118 196 Q132 206 146 196" stroke="#e9c46a" stroke-width="2.5" fill="none"/><circle cx="146" cy="200" r="6" fill="#e9c46a"/>' : '';
    const title = o.title ? `<title>${o.title}</title>` : '';
    return `<svg class="portrait mood-${m}" viewBox="0 -20 200 250" xmlns="http://www.w3.org/2000/svg" aria-hidden="${o.title ? 'false' : 'true'}">${title}
      ${hairBack(L)}
      ${body(L)}
      <rect x="86" y="128" width="28" height="34" rx="10" fill="${L.skin}"/>
      <rect x="86" y="140" width="28" height="12" fill="#000" opacity=".12"/>
      ${ear(55)}${ear(145)}
      <ellipse cx="100" cy="94" rx="${face.rx}" ry="${face.ry}" fill="${L.skin}"/>
      <ellipse cx="74" cy="110" rx="9" ry="6" fill="${L.cheek}" opacity=".35"/><ellipse cx="126" cy="110" rx="9" ry="6" fill="${L.cheek}" opacity=".35"/>
      ${freckles}
      <g stroke="${L.brows}" stroke-width="4.5" stroke-linecap="round"><path d="M${brow[0][0]} ${brow[0][1]} L${brow[0][2]} ${brow[0][3]}"/><path d="M${brow[1][0]} ${brow[1][1]} L${brow[1][2]} ${brow[1][3]}"/></g>
      ${eyes}
      <path d="M100 96 Q106 108 98 110" stroke="#000" stroke-opacity=".25" stroke-width="3" fill="none" stroke-linecap="round"/>
      ${beard}${stache}${lips}${goatee}${tears}${sweat}
      ${hairFront(L)}${hat(L)}${glasses}${eyepatch}${flower}${pencil}${earrings}${bow}${watch}${whistle}${camera}${parrot}
    </svg>`;
  }

  root.Portraits = { svg, has: (id) => !!LOOKS[id] };
})(typeof window !== 'undefined' ? window : globalThis);
