/* Saxophone fingering diagram generator: produces an accessible, high-contrast
 * SVG visualization of an alto saxophone based on Yamaha YAS-280 reference proportions.
 * Renders rich 3D brass lacquer lighting, deep bell acoustic interior, domed pad cups,
 * mother-of-pearl bezels, and articulated spatula tables.
 */
(function(){
  'use strict';
  let serial = 0;
  const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

  window.SaxDiagram = function(keys, label) {
    const id = 'sax' + (++serial);
    const fingerLabels = {octave:'T',L1:'1',L2:'2',L3:'3',R1:'1',R2:'2',R3:'3'};

    // Touch helper: produces accessible, high-contrast touch targets
    const touch = (key, x, y, r, ellipse = false, rx = r * 1.35, ry = r) => {
      const pressed = keys.includes(key);
      const fill = pressed ? '#151c24' : '#ffffff';
      const stroke = pressed ? '#080c10' : '#151c24';
      const sw = r > 16 ? 4.5 : 2.5;

      const number = fingerLabels[key];
      const numberMark = number ? `<text x="${x}" y="${y + r * 0.28}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${Math.max(8,r * 0.78)}" font-weight="800" fill="${pressed?'#fff':'#151c24'}" pointer-events="none">${number}</text>` : '';
      if (ellipse) {
        return `<g data-touch="${key}"><title>${escape(key)}: ${pressed ? 'press' : 'release'}</title>` +
          `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
          `${pressed ? `<ellipse cx="${x}" cy="${y}" rx="${rx * 0.45}" ry="${ry * 0.45}" fill="#3b4856" opacity="0.45"/>` : ''}` +
          numberMark + `</g>`;
      }

      return `<g data-touch="${key}"><title>${escape(key)}: ${pressed ? 'press' : 'release'}</title>` +
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` +
        `${pressed ? `<circle cx="${x}" cy="${y}" r="${r * 0.38}" fill="#3b4856" opacity="0.45"/>` : `<circle cx="${x - r * 0.28}" cy="${y - r * 0.28}" r="${r * 0.35}" fill="#ffffff" opacity="0.95"/>`}` + numberMark +
        `</g>`;
    };

    // Every main-stack touch is anchored on the centre of the tone-hole cup it opens
    // (cups are drawn below at the same coordinates): id, cup cx, cup cy, pearl radius.
    // Art, press markers and the Left/Right-hand leaders are all generated from this table.
    const PEARLS = {
      L1: [489, 948, 24], bis: [552, 1000, 12], L2: [489, 1049, 24], L3: [481, 1169, 24],
      R1: [463, 1394, 24], R2: [455, 1520, 24], R3: [441, 1660, 24]
    };
    const pearlArt = Object.entries(PEARLS).map(([k, [x, y, r]]) => {
      const bz = r + 6.5, hl = r * 0.4;
      return `<path d="M408 ${y + 9} L${x - bz + 2} ${y + 9}" stroke="url(#${id}rod)" stroke-width="9"/>` +
        `<circle cx="${x}" cy="${y}" r="${bz}" fill="url(#${id}bezel)" stroke="#4a2c07" stroke-width="2.5"/>` +
        `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id}pearl)" stroke="#523208" stroke-width="1.5"/>` +
        `<circle cx="${x - r * 0.2}" cy="${y - r * 0.2}" r="${hl}" fill="#ffffff" opacity="0.6"/>`;
    }).join('');
    const mainTouches = Object.entries(PEARLS).map(([k, [x, y, r]]) => touch(k, x, y, r)).join('');
    // group art is drawn at translate(8,20) scale(.38)
    const sx = x => +(8 + 0.38 * x).toFixed(1), sy = y => +(20 + 0.38 * y).toFixed(1);
    const handLead = k => { const [x, y, r] = PEARLS[k]; return `M84 ${sy(y)} H${sx(x - r - 6.5) - 2}`; };

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 850" role="img" aria-label="${escape(label)}">
  <defs>
    <!-- Realistic 3D Brass Lacquer Gradients -->
    <linearGradient id="${id}brass" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#5a390d"/>
      <stop offset="12%" stop-color="#b8832a"/>
      <stop offset="28%" stop-color="#f5cf6d"/>
      <stop offset="42%" stop-color="#fff6cf"/>
      <stop offset="60%" stop-color="#e2b047"/>
      <stop offset="82%" stop-color="#8c5818"/>
      <stop offset="94%" stop-color="#b68128"/>
      <stop offset="100%" stop-color="#4d2f09"/>
    </linearGradient>

    <linearGradient id="${id}neckBrass" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#55340a"/>
      <stop offset="20%" stop-color="#b47f27"/>
      <stop offset="42%" stop-color="#fff3c6"/>
      <stop offset="65%" stop-color="#d49d37"/>
      <stop offset="88%" stop-color="#7a4b13"/>
      <stop offset="100%" stop-color="#4e2c07"/>
    </linearGradient>

    <linearGradient id="${id}bellExt" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#4d2c08"/>
      <stop offset="22%" stop-color="#be8a2e"/>
      <stop offset="40%" stop-color="#fff5cc"/>
      <stop offset="62%" stop-color="#d69f3a"/>
      <stop offset="85%" stop-color="#7e4c14"/>
      <stop offset="100%" stop-color="#cf9c36"/>
    </linearGradient>

    <radialGradient id="${id}bellInt" cx="54%" cy="48%" r="62%">
      <stop offset="0%" stop-color="#100702"/>
      <stop offset="35%" stop-color="#2a1405"/>
      <stop offset="65%" stop-color="#6e3d0e"/>
      <stop offset="88%" stop-color="#b87f28"/>
      <stop offset="100%" stop-color="#f0c660"/>
    </radialGradient>

    <linearGradient id="${id}rimHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffce8"/>
      <stop offset="30%" stop-color="#e5b854"/>
      <stop offset="65%" stop-color="#69410f"/>
      <stop offset="100%" stop-color="#fff4c8"/>
    </linearGradient>

    <linearGradient id="${id}rod" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3d2407"/>
      <stop offset="30%" stop-color="#cca043"/>
      <stop offset="50%" stop-color="#fffcee"/>
      <stop offset="75%" stop-color="#a4721f"/>
      <stop offset="100%" stop-color="#2e1903"/>
    </linearGradient>

    <radialGradient id="${id}cup" cx="38%" cy="32%" r="65%">
      <stop offset="0%" stop-color="#fff6cc"/>
      <stop offset="35%" stop-color="#d9a741"/>
      <stop offset="75%" stop-color="#804f12"/>
      <stop offset="100%" stop-color="#422505"/>
    </radialGradient>

    <radialGradient id="${id}pad" cx="45%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#bf8547"/>
      <stop offset="70%" stop-color="#824e20"/>
      <stop offset="100%" stop-color="#4a290a"/>
    </radialGradient>

    <radialGradient id="${id}pearl" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="45%" stop-color="#f8f6f0"/>
      <stop offset="80%" stop-color="#e2ded4"/>
      <stop offset="100%" stop-color="#b8b19e"/>
    </radialGradient>

    <linearGradient id="${id}bezel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffe699"/>
      <stop offset="45%" stop-color="#b8832a"/>
      <stop offset="85%" stop-color="#5e390b"/>
      <stop offset="100%" stop-color="#e8bd59"/>
    </linearGradient>

    <linearGradient id="${id}cork" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a87f58"/>
      <stop offset="35%" stop-color="#c9a277"/>
      <stop offset="70%" stop-color="#8f653e"/>
      <stop offset="100%" stop-color="#694625"/>
    </linearGradient>

    <linearGradient id="${id}mouthpiece" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#14171a"/>
      <stop offset="35%" stop-color="#2c3238"/>
      <stop offset="55%" stop-color="#48535d"/>
      <stop offset="75%" stop-color="#22272c"/>
      <stop offset="100%" stop-color="#0a0c0e"/>
    </linearGradient>

    <linearGradient id="${id}reed" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f7e8b5"/>
      <stop offset="40%" stop-color="#edd08a"/>
      <stop offset="80%" stop-color="#c99c47"/>
      <stop offset="100%" stop-color="#8a611c"/>
    </linearGradient>
  </defs>

  <rect width="560" height="850" rx="14" fill="#ffffff" stroke="#e0ded6" stroke-width="1.5"/>

  <!-- Authentic Saxophone Graphic (Yamaha YAS-280 Proportions) -->
  <g transform="translate(8, 20) scale(0.38)" stroke-linejoin="round" stroke-linecap="round">
    <!-- Ambient Shadow Under Body / Bow -->
    <path d="M422 309 L504 1743 Q520 1855 579 1851 Q626 1850 650 1748 L657 1240 L848 1260 L746 1788 Q739 2010 592 2042 Q388 2091 353 1780 Z" fill="#0b1114" opacity="0.3" transform="translate(6, 10)"/>

    <!-- Tapered Conical Body Tube & Bow Bottom -->
    <path d="M422 309 L499 309 L504 1743 Q520 1855 579 1851 Q626 1850 650 1748 L657 1240 L848 1260 L746 1788 Q739 2010 592 2042 Q388 2091 353 1780 Z" fill="url(#${id}brass)" stroke="#422909" stroke-width="4"/>

    <!-- Cylindrical Light Sheen on Body Tube -->
    <path d="M452 309 L472 1743" stroke="#fff4cf" stroke-width="12" opacity="0.45" stroke-linecap="butt"/>
    <path d="M455 309 L465 1743" stroke="#ffffff" stroke-width="4" opacity="0.75" stroke-linecap="butt"/>

    <!-- U-Bow Reinforcement & Curvature Highlights -->
    <path d="M391 1770 Q400 1975 555 1987 Q674 1994 705 1781" fill="none" stroke="#fff1bd" stroke-width="16" opacity="0.6"/>
    <path d="M392 1770 Q401 1975 555 1987 Q674 1994 704 1781" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.8"/>
    <path d="M516 1774 Q527 1915 578 1931 Q633 1947 666 1802" fill="none" stroke="#3d2105" stroke-width="8" opacity="0.85"/>
    <path d="M430 2000 Q560 2060 670 1960" fill="none" stroke="#e0b54e" stroke-width="9"/>
    <path d="M430 2000 Q560 2060 670 1960" fill="none" stroke="#503108" stroke-width="2"/>

    <!-- Joint Collars -->
    <path d="M650 1752 Q689 1769 747 1759 M651 1770 Q690 1788 744 1777 M355 1745 Q423 1767 505 1754 M356 1763 Q426 1785 508 1770" fill="none" stroke="url(#${id}rod)" stroke-width="8"/>
    <path d="M650 1752 Q689 1769 747 1759 M355 1745 Q423 1767 505 1754" fill="none" stroke="#fff4cf" stroke-width="2" opacity="0.9"/>

    <!-- Flaring Acoustic Bell Exterior -->
    <path d="M657 1768 L649 1342 Q639 1190 587 1109 Q562 1062 601 1049 Q736 1047 871 1150 Q929 1196 915 1236 Q898 1271 847 1264 L747 1778 Z" fill="url(#${id}bellExt)" stroke="#422909" stroke-width="4"/>
    <path d="M685 1750 Q695 1380 730 1190" fill="none" stroke="#fff7d6" stroke-width="14" opacity="0.5"/>
    <path d="M688 1750 Q697 1380 732 1190" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.8"/>

    <!-- Bell-to-Body Reinforcement Brace -->
    <g id="${id}bellBrace">
      <path d="M504 1350 L646 1380" stroke="#3a2205" stroke-width="12"/>
      <path d="M504 1350 L646 1380" stroke="url(#${id}rod)" stroke-width="8"/>
      <circle cx="504" cy="1350" r="10" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="2"/>
      <circle cx="646" cy="1380" r="10" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="2"/>
    </g>

    <!-- Bell Rim Opening & Cavernous Interior Depth -->
    <ellipse cx="753" cy="1166" rx="190" ry="79" transform="rotate(29 753 1166)" fill="url(#${id}brass)" stroke="#3d2406" stroke-width="4"/>
    <ellipse cx="753" cy="1166" rx="166" ry="60" transform="rotate(29 753 1166)" fill="url(#${id}bellInt)"/>
    <path d="M619 1101 Q741 1111 869 1217" fill="none" stroke="url(#${id}rimHighlight)" stroke-width="8"/>
    <path d="M624 1104 Q741 1113 864 1215" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.95"/>
    <path d="M620 1109 Q741 1119 865 1224" fill="none" stroke="#1d0d02" stroke-width="3" opacity="0.6"/>

    <!-- Curved Neck (Crook) -->
    <path d="M428 313 Q431 206 381 171 Q356 146 208 104 L215 67 Q383 106 438 157 Q504 213 499 313 Z" fill="url(#${id}neckBrass)" stroke="#3d2406" stroke-width="4"/>
    <path d="M216 87 Q359 129 408 164 Q469 206 462 302" fill="none" stroke="#fffcee" stroke-width="7" opacity="0.75"/>
    <path d="M218 86 Q359 128 408 163 Q468 205 463 300" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.95"/>
    <path d="M370 195 Q420 220 435 305" fill="none" stroke="#b07d24" stroke-width="6"/>

    <!-- Tenon Receiver Collar & Clamp -->
    <path d="M420 299 H502 M418 316 H502" stroke="url(#${id}rod)" stroke-width="8"/>
    <path d="M420 299 H502" stroke="#fff8d4" stroke-width="2"/>
    <path d="M495 327 H522" stroke="url(#${id}rod)" stroke-width="12"/>
    <circle cx="522" cy="327" r="10" fill="url(#${id}cup)" stroke="#3d2406" stroke-width="2"/>
    <circle cx="522" cy="327" r="4" fill="#1f1103"/>

    <!-- Natural Cork Sleeve -->
    <path d="M199 62 L225 72 L214 110 L188 98 Z" fill="url(#${id}cork)" stroke="#4a2f15" stroke-width="2.5"/>
    <line x1="204" y1="67" x2="194" y2="103" stroke="#87582c" stroke-width="1.5" stroke-dasharray="2,3"/>

    <!-- Single Cane Reed -->
    <path d="M12 25 L126 90 L131 99 L17 34 Z" fill="url(#${id}reed)" stroke="#664411" stroke-width="1.5"/>
    <line x1="14" y1="28" x2="128" y2="93" stroke="#fffded" stroke-width="1" opacity="0.8"/>

    <!-- Ebonite Mouthpiece -->
    <path d="M7 18 Q85 11 142 15 L203 63 L191 105 L126 90 Z" fill="url(#${id}mouthpiece)" stroke="#060708" stroke-width="3.5"/>
    <path d="M14 20 Q85 15 135 22" fill="none" stroke="#718291" stroke-width="3" opacity="0.75"/>
    <path d="M16 20 Q85 16 130 22" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.85"/>

    <!-- Dual-Screw Gold Ligature -->
    <g id="${id}ligature">
      <path d="M84 14 L71 61 L93 73 L110 20 M134 24 L117 82 L138 89 L155 36" fill="none" stroke="url(#${id}rod)" stroke-width="11"/>
      <path d="M84 14 L71 61 L93 73 L110 20 M134 24 L117 82 L138 89 L155 36" fill="none" stroke="#fff4cf" stroke-width="2" opacity="0.85"/>
      <path d="M116 85 L110 105 M86 73 L80 94" stroke="url(#${id}rod)" stroke-width="8"/>
      <circle cx="110" cy="105" r="5.5" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.5"/>
      <circle cx="80" cy="94" r="5.5" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.5"/>
    </g>

    <!-- Octave Mechanism on Neck -->
    <path d="M300 78 L379 95 Q500 133 513 250 Q516 290 496 319 M387 320 Q461 282 479 216" fill="none" stroke="url(#${id}rod)" stroke-width="10"/>
    <path d="M302 78 L379 94 Q498 132 511 250" fill="none" stroke="#fff9e0" stroke-width="2" opacity="0.9"/>
    <ellipse cx="308" cy="77" rx="16" ry="8" fill="url(#${id}cup)" stroke="#3d2406" stroke-width="2"/>
    <ellipse cx="308" cy="77" rx="12" ry="5.5" fill="url(#${id}pad)"/>
    <circle cx="308" cy="77" r="3" fill="url(#${id}cup)"/>
    <path d="M308 83 V99 M375 95 V122" stroke="url(#${id}rod)" stroke-width="8"/>
    <circle cx="375" cy="108" r="4" fill="url(#${id}cup)" stroke="#3d2406" stroke-width="1"/>

    <!-- Mounting Ribs & Hinge Rods -->
    <path d="M346 415 L333 1812" stroke="#2a1703" stroke-width="16" opacity="0.65"/>
    <path d="M350 420 L337 1808" fill="none" stroke="url(#${id}rod)" stroke-width="11"/>
    <path d="M348 420 L335 1808" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.85"/>
    <path d="M369 420 L356 1808" fill="none" stroke="url(#${id}rod)" stroke-width="11"/>
    <path d="M367 420 L354 1808" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.85"/>
    <path d="M390 420 L377 1808" fill="none" stroke="url(#${id}rod)" stroke-width="11"/>
    <path d="M388 420 L375 1808" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.85"/>
    <path d="M412 420 L399 1808" fill="none" stroke="url(#${id}rod)" stroke-width="11"/>
    <path d="M410 420 L397 1808" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.85"/>
    <path d="M533 1025 L520 1808" fill="none" stroke="url(#${id}rod)" stroke-width="11"/>
    <path d="M531 1025 L518 1808" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.85"/>

    <!-- Pivot Posts with Screws -->
    <path d="M347 420 H416" stroke="url(#${id}rod)" stroke-width="8"/><circle cx="354" cy="420" r="9" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/><circle cx="354" cy="420" r="3" fill="#1f1103"/><circle cx="393" cy="420" r="8" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/>
    <path d="M347 503 H416" stroke="url(#${id}rod)" stroke-width="8"/><circle cx="354" cy="503" r="9" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/><circle cx="354" cy="503" r="3" fill="#1f1103"/><circle cx="393" cy="503" r="8" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/>
    <path d="M347 584 H416" stroke="url(#${id}rod)" stroke-width="8"/><circle cx="354" cy="584" r="9" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/><circle cx="354" cy="584" r="3" fill="#1f1103"/><circle cx="393" cy="584" r="8" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/>
    <path d="M347 695 H416" stroke="url(#${id}rod)" stroke-width="8"/><circle cx="354" cy="695" r="9" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/><circle cx="354" cy="695" r="3" fill="#1f1103"/><circle cx="393" cy="695" r="8" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/>
    <path d="M347 811 H416" stroke="url(#${id}rod)" stroke-width="8"/><circle cx="354" cy="811" r="9" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/><circle cx="354" cy="811" r="3" fill="#1f1103"/><circle cx="393" cy="811" r="8" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/>
    <path d="M347 899 H416" stroke="url(#${id}rod)" stroke-width="8"/><circle cx="354" cy="899" r="9" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/><circle cx="354" cy="899" r="3" fill="#1f1103"/><circle cx="393" cy="899" r="8" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/>
    <path d="M347 1050 H416" stroke="url(#${id}rod)" stroke-width="8"/><circle cx="354" cy="1050" r="9" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/><circle cx="354" cy="1050" r="3" fill="#1f1103"/><circle cx="393" cy="1050" r="8" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/>
    <path d="M347 1188 H416" stroke="url(#${id}rod)" stroke-width="8"/><circle cx="354" cy="1188" r="9" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/><circle cx="354" cy="1188" r="3" fill="#1f1103"/><circle cx="393" cy="1188" r="8" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/>
    <path d="M347 1260 H416" stroke="url(#${id}rod)" stroke-width="8"/><circle cx="354" cy="1260" r="9" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/><circle cx="354" cy="1260" r="3" fill="#1f1103"/><circle cx="393" cy="1260" r="8" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/>
    <path d="M347 1402 H416" stroke="url(#${id}rod)" stroke-width="8"/><circle cx="354" cy="1402" r="9" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/><circle cx="354" cy="1402" r="3" fill="#1f1103"/><circle cx="393" cy="1402" r="8" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/>
    <path d="M347 1557 H416" stroke="url(#${id}rod)" stroke-width="8"/><circle cx="354" cy="1557" r="9" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/><circle cx="354" cy="1557" r="3" fill="#1f1103"/><circle cx="393" cy="1557" r="8" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/>
    <path d="M347 1650 H416" stroke="url(#${id}rod)" stroke-width="8"/><circle cx="354" cy="1650" r="9" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/><circle cx="354" cy="1650" r="3" fill="#1f1103"/><circle cx="393" cy="1650" r="8" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/>
    <path d="M347 1780 H416" stroke="url(#${id}rod)" stroke-width="8"/><circle cx="354" cy="1780" r="9" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/><circle cx="354" cy="1780" r="3" fill="#1f1103"/><circle cx="393" cy="1780" r="8" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.8"/>

    <!-- Tone-Hole Cups with Leather Pads and Resonators -->
    <circle cx="482" cy="414" r="30.5" fill="url(#${id}pad)" stroke="#3a1e05" stroke-width="1.5"/><circle cx="482" cy="414" r="28" fill="url(#${id}cup)" stroke="#452705" stroke-width="2.5"/><ellipse cx="479" cy="411" rx="20" ry="18" fill="none" stroke="#fff4cf" stroke-width="2" opacity="0.7"/><circle cx="482" cy="414" r="10" fill="url(#${id}rod)" stroke="#452705" stroke-width="1.2"/><path d="M378 411 Q411 418 495 410" fill="none" stroke="url(#${id}rod)" stroke-width="8"/><path d="M378 408 L493 407" stroke="#fff9e0" stroke-width="2.5" opacity="0.9"/>
    <circle cx="456" cy="507" r="31.5" fill="url(#${id}pad)" stroke="#3a1e05" stroke-width="1.5"/><circle cx="456" cy="507" r="29" fill="url(#${id}cup)" stroke="#452705" stroke-width="2.5"/><ellipse cx="453" cy="504" rx="21" ry="19" fill="none" stroke="#fff4cf" stroke-width="2" opacity="0.7"/><circle cx="456" cy="507" r="10" fill="url(#${id}rod)" stroke="#452705" stroke-width="1.2"/><path d="M378 504 Q411 511 469 503" fill="none" stroke="url(#${id}rod)" stroke-width="8"/><path d="M378 501 L467 500" stroke="#fff9e0" stroke-width="2.5" opacity="0.9"/>
    <circle cx="492" cy="653" r="31.5" fill="url(#${id}pad)" stroke="#3a1e05" stroke-width="1.5"/><circle cx="492" cy="653" r="29" fill="url(#${id}cup)" stroke="#452705" stroke-width="2.5"/><ellipse cx="489" cy="650" rx="21" ry="19" fill="none" stroke="#fff4cf" stroke-width="2" opacity="0.7"/><circle cx="492" cy="653" r="10" fill="url(#${id}rod)" stroke="#452705" stroke-width="1.2"/><path d="M378 650 Q411 657 505 649" fill="none" stroke="url(#${id}rod)" stroke-width="8"/><path d="M378 647 L503 646" stroke="#fff9e0" stroke-width="2.5" opacity="0.9"/>
    <circle cx="485" cy="826" r="39.5" fill="url(#${id}pad)" stroke="#3a1e05" stroke-width="1.5"/><circle cx="485" cy="826" r="37" fill="url(#${id}cup)" stroke="#452705" stroke-width="2.5"/><ellipse cx="482" cy="823" rx="29" ry="27" fill="none" stroke="#fff4cf" stroke-width="2" opacity="0.7"/><circle cx="485" cy="826" r="13" fill="url(#${id}rod)" stroke="#452705" stroke-width="1.2"/><path d="M378 823 Q411 830 498 822" fill="none" stroke="url(#${id}rod)" stroke-width="8"/><path d="M378 820 L496 819" stroke="#fff9e0" stroke-width="2.5" opacity="0.9"/>
    <circle cx="489" cy="948" r="39.5" fill="url(#${id}pad)" stroke="#3a1e05" stroke-width="1.5"/><circle cx="489" cy="948" r="37" fill="url(#${id}cup)" stroke="#452705" stroke-width="2.5"/><ellipse cx="486" cy="945" rx="29" ry="27" fill="none" stroke="#fff4cf" stroke-width="2" opacity="0.7"/><circle cx="489" cy="948" r="13" fill="url(#${id}rod)" stroke="#452705" stroke-width="1.2"/><path d="M378 945 Q411 952 502 944" fill="none" stroke="url(#${id}rod)" stroke-width="8"/><path d="M378 942 L500 941" stroke="#fff9e0" stroke-width="2.5" opacity="0.9"/>
    <circle cx="489" cy="1049" r="42.5" fill="url(#${id}pad)" stroke="#3a1e05" stroke-width="1.5"/><circle cx="489" cy="1049" r="40" fill="url(#${id}cup)" stroke="#452705" stroke-width="2.5"/><ellipse cx="486" cy="1046" rx="32" ry="30" fill="none" stroke="#fff4cf" stroke-width="2" opacity="0.7"/><circle cx="489" cy="1049" r="14" fill="url(#${id}rod)" stroke="#452705" stroke-width="1.2"/><path d="M378 1046 Q411 1053 502 1045" fill="none" stroke="url(#${id}rod)" stroke-width="8"/><path d="M378 1043 L500 1042" stroke="#fff9e0" stroke-width="2.5" opacity="0.9"/>
    <circle cx="481" cy="1169" r="45.5" fill="url(#${id}pad)" stroke="#3a1e05" stroke-width="1.5"/><circle cx="481" cy="1169" r="43" fill="url(#${id}cup)" stroke="#452705" stroke-width="2.5"/><ellipse cx="478" cy="1166" rx="35" ry="33" fill="none" stroke="#fff4cf" stroke-width="2" opacity="0.7"/><circle cx="481" cy="1169" r="15" fill="url(#${id}rod)" stroke="#452705" stroke-width="1.2"/><path d="M378 1166 Q411 1173 494 1165" fill="none" stroke="url(#${id}rod)" stroke-width="8"/><path d="M378 1163 L492 1162" stroke="#fff9e0" stroke-width="2.5" opacity="0.9"/>
    <circle cx="464" cy="1295" r="49.5" fill="url(#${id}pad)" stroke="#3a1e05" stroke-width="1.5"/><circle cx="464" cy="1295" r="47" fill="url(#${id}cup)" stroke="#452705" stroke-width="2.5"/><ellipse cx="461" cy="1292" rx="39" ry="37" fill="none" stroke="#fff4cf" stroke-width="2" opacity="0.7"/><circle cx="464" cy="1295" r="16" fill="url(#${id}rod)" stroke="#452705" stroke-width="1.2"/><path d="M378 1292 Q411 1299 477 1291" fill="none" stroke="url(#${id}rod)" stroke-width="8"/><path d="M378 1289 L475 1288" stroke="#fff9e0" stroke-width="2.5" opacity="0.9"/>
    <circle cx="463" cy="1394" r="50.5" fill="url(#${id}pad)" stroke="#3a1e05" stroke-width="1.5"/><circle cx="463" cy="1394" r="48" fill="url(#${id}cup)" stroke="#452705" stroke-width="2.5"/><ellipse cx="460" cy="1391" rx="40" ry="38" fill="none" stroke="#fff4cf" stroke-width="2" opacity="0.7"/><circle cx="463" cy="1394" r="17" fill="url(#${id}rod)" stroke="#452705" stroke-width="1.2"/><path d="M378 1391 Q411 1398 476 1390" fill="none" stroke="url(#${id}rod)" stroke-width="8"/><path d="M378 1388 L474 1387" stroke="#fff9e0" stroke-width="2.5" opacity="0.9"/>
    <circle cx="455" cy="1520" r="53.5" fill="url(#${id}pad)" stroke="#3a1e05" stroke-width="1.5"/><circle cx="455" cy="1520" r="51" fill="url(#${id}cup)" stroke="#452705" stroke-width="2.5"/><ellipse cx="452" cy="1517" rx="43" ry="41" fill="none" stroke="#fff4cf" stroke-width="2" opacity="0.7"/><circle cx="455" cy="1520" r="18" fill="url(#${id}rod)" stroke="#452705" stroke-width="1.2"/><path d="M378 1517 Q411 1524 468 1516" fill="none" stroke="url(#${id}rod)" stroke-width="8"/><path d="M378 1514 L466 1513" stroke="#fff9e0" stroke-width="2.5" opacity="0.9"/>
    <circle cx="441" cy="1660" r="56.5" fill="url(#${id}pad)" stroke="#3a1e05" stroke-width="1.5"/><circle cx="441" cy="1660" r="54" fill="url(#${id}cup)" stroke="#452705" stroke-width="2.5"/><ellipse cx="438" cy="1657" rx="46" ry="44" fill="none" stroke="#fff4cf" stroke-width="2" opacity="0.7"/><circle cx="441" cy="1660" r="19" fill="url(#${id}rod)" stroke="#452705" stroke-width="1.2"/><path d="M378 1657 Q411 1664 454 1656" fill="none" stroke="url(#${id}rod)" stroke-width="8"/><path d="M378 1654 L452 1653" stroke="#fff9e0" stroke-width="2.5" opacity="0.9"/>
    <circle cx="451" cy="1924" r="59.5" fill="url(#${id}pad)" stroke="#3a1e05" stroke-width="1.5"/><circle cx="451" cy="1924" r="57" fill="url(#${id}cup)" stroke="#452705" stroke-width="2.5"/><ellipse cx="448" cy="1921" rx="49" ry="47" fill="none" stroke="#fff4cf" stroke-width="2" opacity="0.7"/><circle cx="451" cy="1924" r="20" fill="url(#${id}rod)" stroke="#452705" stroke-width="1.2"/><path d="M378 1921 Q411 1928 464 1920" fill="none" stroke="url(#${id}rod)" stroke-width="8"/><path d="M378 1918 L462 1917" stroke="#fff9e0" stroke-width="2.5" opacity="0.9"/>

    <!-- Mother-of-Pearl Touches in Raised Brass Bezels (from PEARLS) -->
    ${pearlArt}

    <!-- Palm Keys, Side Levers, Spatulas -->
    <path d="M511 457 Q533 496 529 562 L543 627 M515 536 Q548 577 548 624 L565 665 M530 591 Q569 630 578 698 L585 747" fill="none" stroke="url(#${id}rod)" stroke-width="10"/>
    <path d="M552 669 Q575 689 574 713 L561 722 L546 685 Z M573 722 L598 741 L605 791 L591 798 L580 748 Z M584 772 L616 801 L619 844 L606 851 Z" fill="url(#${id}brass)" stroke="#452705" stroke-width="2.5"/>
    <path d="M552 669 L574 713 M573 722 L605 791 M584 772 L619 844" stroke="#fff4cf" stroke-width="2" opacity="0.8"/>

    <ellipse cx="597" cy="944" rx="17" ry="26" transform="rotate(29 597 944)" fill="url(#${id}cup)" stroke="#452705" stroke-width="2"/>
    <path d="M545 974 L614 966 L629 1006 L561 1026 Z M556 1030 L629 1013 L641 1045 L572 1062 Z" fill="url(#${id}brass)" stroke="#452705" stroke-width="2"/>
    <path d="M574 985 L609 979 M581 1040 L623 1028" stroke="#1c2126" stroke-width="10" stroke-linecap="round"/>
    <path d="M574 985 L609 979 M581 1040 L623 1028" stroke="#546370" stroke-width="2" stroke-linecap="round"/>

    <path d="M351 1220 Q318 1239 333 1277 L334 1335 M345 1340 L330 1398 M336 1434 L327 1498" fill="none" stroke="url(#${id}rod)" stroke-width="12"/>
    <path d="M340 1670 Q310 1687 325 1725 L364 1750 L384 1717 Z" fill="url(#${id}brass)" stroke="#452705" stroke-width="2.5"/>
    <path d="M321 1690 L374 1716" stroke="#1c2126" stroke-width="11" stroke-linecap="round"/>
    <path d="M321 1690 L374 1716" stroke="#546370" stroke-width="2.5" stroke-linecap="round"/>

    <!-- Bell Tone Holes with Leather Pads -->
    <ellipse cx="583" cy="1518" rx="26" ry="36" transform="rotate(20 583 1518)" fill="url(#${id}pad)" stroke="#3a1d04" stroke-width="2"/>
    <ellipse cx="583" cy="1518" rx="22" ry="32" transform="rotate(20 583 1518)" fill="url(#${id}cup)" stroke="#452705" stroke-width="2"/>
    <ellipse cx="583" cy="1518" rx="10" ry="14" transform="rotate(20 583 1518)" fill="url(#${id}rod)" stroke="#452705" stroke-width="1"/>

    <ellipse cx="591" cy="1745" rx="25" ry="37" transform="rotate(20 591 1745)" fill="url(#${id}pad)" stroke="#3a1d04" stroke-width="2"/>
    <ellipse cx="591" cy="1745" rx="21" ry="33" transform="rotate(20 591 1745)" fill="url(#${id}cup)" stroke="#452705" stroke-width="2"/>
    <ellipse cx="591" cy="1745" rx="10" ry="15" transform="rotate(20 591 1745)" fill="url(#${id}rod)" stroke="#452705" stroke-width="1"/>

    <!-- Low B / Bb Key Guard: open wire frame (two rails + cross-bars) so the cups show through -->
    <g id="${id}keyGuard" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M551 1472 Q546 1620 556 1790 Q566 1812 596 1808 Q630 1800 636 1770 Q640 1620 632 1472 M551 1626 H634" stroke="#2a1703" stroke-width="12" opacity="0.7" transform="translate(3 4)"/>
      <path d="M551 1472 Q546 1620 556 1790 Q566 1812 596 1808 Q630 1800 636 1770 Q640 1620 632 1472 M551 1626 H634" stroke="#3a2205" stroke-width="11"/>
      <path d="M551 1472 Q546 1620 556 1790 Q566 1812 596 1808 Q630 1800 636 1770 Q640 1620 632 1472 M551 1626 H634" stroke="url(#${id}rod)" stroke-width="7"/>
      <path d="M553 1480 Q549 1620 558 1786" stroke="#fff4cf" stroke-width="1.8" opacity="0.8"/>
      <path d="M646 1380 L640 1472" stroke="#3a2205" stroke-width="11"/>
      <path d="M646 1380 L640 1472" stroke="url(#${id}rod)" stroke-width="7"/>
    </g>
    <circle cx="641" cy="1472" r="7" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.5"/>
    <circle cx="552" cy="1626" r="6" fill="url(#${id}cup)" stroke="#3a2205" stroke-width="1.5"/>

    <!-- Bottom Bow Guard -->
    <path d="M370 1945 Q405 1984 448 1997 L489 1961 L481 2020 L420 2039 Z" fill="url(#${id}brass)" stroke="#452705" stroke-width="2.5"/>

    <!-- Main Stack Touch Buttons -->
    ${mainTouches}
  </g>

  <!-- Detail panels show surfaces hidden behind the tube or bell -->
  <g font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill="#202930" font-size="12.5">
    <text x="18" y="19" font-weight="700" font-size="12" fill="#505a63" letter-spacing="0.04em">ALTO · YAS-280 REFERENCE PROPORTIONS</text>
    
    <!-- Hand alignment guides: labels sit in the empty left margin, leaders end at the first key of each hand -->
    <path d="${handLead('L1')} M84 ${sy(PEARLS.R1[1])} H${sx(PEARLS.R1[0] - PEARLS.R1[2] - 6.5) - 2}" fill="none" stroke="#7a8b98" stroke-width="1.2" stroke-dasharray="3,3"/>
    <text x="18" y="${sy(PEARLS.L1[1]) - 6}" font-weight="700" fill="#4d5d6a" font-size="11.5">Left hand</text>
    <text x="18" y="${sy(PEARLS.R1[1]) - 6}" font-weight="700" fill="#4d5d6a" font-size="11.5">Right hand</text>
    <text x="18" y="${sy(PEARLS.L1[1]) + 12}" fill="#6a7885" font-size="10.5">B · A · G</text>
    <text x="18" y="${sy(PEARLS.R1[1]) + 12}" fill="#6a7885" font-size="10.5">F · E · D</text>

    <!-- Panel 1: Rear Thumb Rest & Octave Key -->
    <rect x="365" y="40" width="177" height="117" rx="9" fill="#f8f7f2" stroke="#d5cebe" stroke-width="1.2"/>
    <text x="376" y="62" font-weight="700" font-size="12" fill="#2e3840">Rear · left thumb</text>
    <circle cx="404" cy="108" r="16" fill="#181c20" stroke="#0e1114" stroke-width="2"/>
    <circle cx="402" cy="106" r="13" fill="#2d353c"/>
    <text x="404" y="140" text-anchor="middle" font-weight="600" font-size="11.5">Thumb rest</text>
    <path d="M430 127 V94 Q430 76 441 76 Q452 76 452 94 V127 Z" fill="url(#${id}brass)" stroke="#452705" stroke-width="1.5"/>
    <path d="M433 94 V124" stroke="#fff4cf" stroke-width="1.5"/>
    ${touch('octave', 441, 92, 8)}
    <text x="464" y="95" font-weight="600" font-size="11.5">Octave</text>

    <!-- Panel 2: Left Little Finger Articulated Spatula Table -->
    <rect x="365" y="180" width="177" height="160" rx="9" fill="#f8f7f2" stroke="#d5cebe" stroke-width="1.2"/>
    <text x="376" y="203" font-weight="700" font-size="12" fill="#2e3840">Left little finger · table</text>
    
    <path d="M400 222 H498 Q513 222 513 237 V252 H390 V237 Q390 222 400 222 Z M390 261 H450 V296 H390 Z M458 261 H513 V296 H458 Z M395 304 H513 V324 H395 Z" fill="url(#${id}brass)" stroke="#452705" stroke-width="1.5"/>
    <line x1="400" y1="224" x2="495" y2="224" stroke="#fff4cf" stroke-width="1.2"/>
    <line x1="392" y1="263" x2="448" y2="263" stroke="#fff4cf" stroke-width="1.2"/>
    <line x1="460" y1="263" x2="511" y2="263" stroke="#fff4cf" stroke-width="1.2"/>
    
    <rect x="450" y="261" width="8" height="35" rx="3" fill="#1b2024" stroke="#0a0c0e" stroke-width="1"/>
    <line x1="454" y1="263" x2="454" y2="294" stroke="#5a6875" stroke-width="1"/>
    <rect x="395" y="296" width="118" height="8" rx="2.5" fill="#1b2024" stroke="#0a0c0e" stroke-width="1"/>
    <line x1="397" y1="300" x2="511" y2="300" stroke="#5a6875" stroke-width="1"/>

    ${touch('Gsharp', 452, 238, 9, true, 26, 8.5)}
    ${touch('lowCsharp', 418, 278, 9, true, 16, 9.5)}
    ${touch('lowB', 485, 278, 9, true, 16, 9.5)}
    ${touch('lowBflat', 452, 314, 7, true, 26, 6.5)}

    <text x="422" y="255" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d3740">C♯</text>
    <text x="488" y="255" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2d3740">B</text>
    <text x="524" y="241" font-size="11.5" font-weight="700" fill="#2d3740">G♯</text>
    <text x="524" y="318" font-size="11.5" font-weight="700" fill="#2d3740">B♭</text>

    <!-- Panel 3: Right Side Index Chromatic Levers -->
    <rect x="365" y="373" width="177" height="135" rx="9" fill="#f8f7f2" stroke="#d5cebe" stroke-width="1.2"/>
    <text x="376" y="395" font-weight="700" font-size="12" fill="#2e3840">Side keys · top → bottom</text>
    
    <path d="M390 481 V425 H414 V481 Z M430 481 V425 H454 V481 Z M470 481 V425 H494 V481 Z" fill="url(#${id}brass)" stroke="#452705" stroke-width="1.5"/>
    <line x1="393" y1="427" x2="393" y2="479" stroke="#fff4cf" stroke-width="1.2"/>
    <line x1="433" y1="427" x2="433" y2="479" stroke="#fff4cf" stroke-width="1.2"/>
    <line x1="473" y1="427" x2="473" y2="479" stroke="#fff4cf" stroke-width="1.2"/>

    ${touch('highE', 402, 455, 8.5)}
    ${touch('sideC', 442, 455, 8.5)}
    ${touch('sideBflat', 482, 455, 8.5)}
    <text x="402" y="498" text-anchor="middle" font-weight="700" font-size="11.5">E</text>
    <text x="444" y="498" text-anchor="middle" font-weight="700" font-size="11.5">C</text>
    <text x="482" y="498" text-anchor="middle" font-weight="700" font-size="11.5">B♭</text>

    <!-- Panel 4: Right Little Finger Spatulas -->
    <rect x="365" y="600" width="177" height="142" rx="9" fill="#f8f7f2" stroke="#d5cebe" stroke-width="1.2"/>
    <text x="376" y="623" font-weight="700" font-size="12" fill="#2e3840">Right little finger</text>

    <path d="M392 646 Q407 635 426 646 L426 683 H392 Z M448 667 Q464 655 483 667 L483 704 H448 Z" fill="url(#${id}brass)" stroke="#452705" stroke-width="1.5"/>
    <rect x="428" y="658" width="18" height="8" rx="2.5" fill="#1b2024" stroke="#0a0c0e" stroke-width="1"/>
    <line x1="430" y1="662" x2="444" y2="662" stroke="#5a6875" stroke-width="1"/>

    ${touch('Eflat', 409, 660, 9, true, 13, 8.5)}
    ${touch('lowC', 466, 681, 9, true, 13, 8.5)}
    <text x="408" y="720" text-anchor="middle" font-weight="700" font-size="11.5">E♭</text>
    <text x="466" y="720" text-anchor="middle" font-weight="700" font-size="11.5">C</text>

    <!-- Legend & Credits Footer -->
    <g transform="translate(18, 816)" font-size="11.5">
      <circle cx="6" cy="0" r="5" fill="#151c24"/>
      <text x="16" y="4" font-weight="600" fill="#2d3740">Press touch</text>

      <circle cx="95" cy="0" r="5" fill="#ffffff" stroke="#151c24" stroke-width="1.8"/>
      <text x="106" y="4" font-weight="600" fill="#2d3740">Release touch</text>
      <text x="195" y="4" fill="#6a7885">· Brass cups show the acoustic mechanism.</text>
    </g>
    <text x="18" y="836" font-size="10.5" fill="#8d9aa5">Original ClassroomOS illustration · Yamaha YAS-280 reference proportions; detail views enlarged.</text>
  </g>
</svg>`;
    return svg;
  };
})();
