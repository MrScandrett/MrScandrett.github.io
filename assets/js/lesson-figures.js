/**
 * lesson-figures.js — ClassroomOS Shared Figure Library
 *
 * Hand-authored inline SVG artwork for lessons, in one consistent style:
 * flat silhouettes, a soft accent glow, and a restrained highlight pass.
 * Everything is drawn locally — no external images, models, or fonts — so
 * figures work offline, survive `check:integrity`, and carry no licensing.
 *
 * Usage:
 *   LessonFigures.render(el, 'blue-whale', { accent: '#06b6d4' });
 *   el.innerHTML = LessonFigures.markup('earth', { accent: '#38bdf8' });
 *
 * Every figure fills its container (width/height 100%), so the caller sizes
 * it with CSS. Figures meant to be animated expose stable hooks via
 * data-fig attributes — see `thermometer`, `circuit`, and `altitude-column`
 * below; the lesson owns the behaviour, the library owns the art.
 *
 * Adding a figure: add an entry to FIGURES keyed by name, with a viewBox and
 * a draw(accent, id) returning markup. `id` is unique per render — use it to
 * namespace any gradient or filter ids so two figures on one page can't clash.
 */

const LessonFigures = (() => {
  'use strict';

  let seq = 0;

  /* ── helpers ──────────────────────────────────────────────────────── */

  // Deterministic PRNG so procedural figures (star fields, cosmic web)
  // look identical on every render instead of shimmering on each update.
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  const glow = (id, amount = 2.5) =>
    `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
       <feGaussianBlur stdDeviation="${amount}" result="b"/>
       <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
     </filter>`;

  // Lighten/darken a #rrggbb hex toward white or black.
  function shade(hex, amount) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return hex || '#f59e0b';
    const to = amount >= 0 ? 255 : 0;
    const t = Math.abs(amount);
    const ch = i => {
      const v = parseInt(m[i], 16);
      return Math.round(v + (to - v) * t).toString(16).padStart(2, '0');
    };
    return `#${ch(1)}${ch(2)}${ch(3)}`;
  }

  const star = (x, y, r, o) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${o}"/>`;

  function starfield(seed, count, w, h, maxR = 1.1) {
    const rand = rng(seed);
    let out = '';
    for (let i = 0; i < count; i++) {
      out += star(+(rand() * w).toFixed(1), +(rand() * h).toFixed(1),
                  +(0.3 + rand() * maxR).toFixed(2), +(0.25 + rand() * 0.6).toFixed(2));
    }
    return out;
  }

  /* ── figures ──────────────────────────────────────────────────────── */

  const FIGURES = {

    /* ---------- quantum & particle ---------- */

    'quantum-foam': {
      viewBox: '0 0 120 120',
      draw(a, id) {
        const rand = rng(7);
        let loops = '';
        for (let i = 0; i < 14; i++) {
          const cx = 12 + rand() * 96, cy = 12 + rand() * 96;
          const r = 3 + rand() * 11;
          loops += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}"
                      fill="none" stroke="${a}" stroke-width="${(0.5 + rand()).toFixed(2)}"
                      opacity="${(0.25 + rand() * 0.5).toFixed(2)}"/>`;
        }
        return `${glow(id + 'g', 3)}
          <rect width="120" height="120" fill="none"/>
          <g filter="url(#${id}g)">${loops}</g>
          <path d="M8 60 Q30 44 52 60 T96 60 T112 60" fill="none" stroke="${shade(a, 0.4)}"
                stroke-width="1.2" opacity="0.7"/>
          <path d="M60 8 Q44 30 60 52 T60 96 T60 112" fill="none" stroke="${shade(a, 0.4)}"
                stroke-width="1.2" opacity="0.5"/>`;
      },
    },

    quark: {
      viewBox: '0 0 120 120',
      draw(a, id) {
        return `${glow(id + 'g', 4)}
          <g filter="url(#${id}g)">
            <circle cx="60" cy="60" r="13" fill="${a}"/>
            <circle cx="60" cy="60" r="13" fill="none" stroke="#fff" stroke-width="1" opacity="0.5"/>
          </g>
          <!-- confinement strings: a quark is never found alone -->
          <path d="M60 47 C40 26 26 40 30 58" fill="none" stroke="${shade(a, 0.3)}"
                stroke-width="2" opacity="0.55" stroke-dasharray="3 4"/>
          <path d="M73 60 C96 52 98 78 78 84" fill="none" stroke="${shade(a, 0.3)}"
                stroke-width="2" opacity="0.55" stroke-dasharray="3 4"/>
          <path d="M52 70 C42 92 66 100 72 86" fill="none" stroke="${shade(a, 0.3)}"
                stroke-width="2" opacity="0.55" stroke-dasharray="3 4"/>
          <circle cx="60" cy="60" r="26" fill="none" stroke="${a}" stroke-width="0.8" opacity="0.28"/>`;
      },
    },

    proton: {
      viewBox: '0 0 120 120',
      draw(a, id) {
        const q = (cx, cy, c) =>
          `<circle cx="${cx}" cy="${cy}" r="11" fill="${c}"/>
           <circle cx="${cx - 3}" cy="${cy - 3.5}" r="3.4" fill="#fff" opacity="0.45"/>`;
        return `${glow(id + 'g', 3)}
          <circle cx="60" cy="60" r="40" fill="${a}" opacity="0.13"/>
          <circle cx="60" cy="60" r="40" fill="none" stroke="${a}" stroke-width="1.4" opacity="0.5"/>
          <!-- gluon springs binding the three valence quarks -->
          <path d="M47 47 Q60 38 73 47" fill="none" stroke="#fff" stroke-width="1.6" opacity="0.35"/>
          <path d="M73 47 Q78 66 60 76" fill="none" stroke="#fff" stroke-width="1.6" opacity="0.35"/>
          <path d="M60 76 Q42 66 47 47" fill="none" stroke="#fff" stroke-width="1.6" opacity="0.35"/>
          <g filter="url(#${id}g)">
            ${q(47, 45, shade(a, 0.25))}
            ${q(75, 50, shade(a, -0.1))}
            ${q(58, 78, shade(a, 0.45))}
          </g>`;
      },
    },

    /* ---------- molecular & micro ---------- */

    dna: {
      viewBox: '0 0 220 90',
      draw(a, id) {
        let rungs = '';
        for (let i = 0; i <= 10; i++) {
          const x = 14 + i * 19.2;
          const phase = (i / 10) * Math.PI * 4;
          const y1 = 45 + Math.sin(phase) * 26;
          const y2 = 45 - Math.sin(phase) * 26;
          const near = Math.abs(Math.sin(phase)) > 0.35;
          rungs += `<line x1="${x.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y2.toFixed(1)}"
                      stroke="${i % 2 ? '#fbbf24' : '#f472b6'}" stroke-width="${near ? 3 : 2}"
                      opacity="${near ? 0.9 : 0.4}" stroke-linecap="round"/>`;
        }
        let s1 = 'M14 45', s2 = 'M14 45';
        for (let i = 0; i <= 40; i++) {
          const x = 14 + i * 4.8;
          const phase = (i / 40) * Math.PI * 4;
          s1 += ` L${x.toFixed(1)} ${(45 + Math.sin(phase) * 26).toFixed(1)}`;
          s2 += ` L${x.toFixed(1)} ${(45 - Math.sin(phase) * 26).toFixed(1)}`;
        }
        return `${glow(id + 'g', 2)}
          ${rungs}
          <g filter="url(#${id}g)">
            <path d="${s1}" fill="none" stroke="${a}" stroke-width="4" stroke-linecap="round"/>
            <path d="${s2}" fill="none" stroke="${shade(a, 0.35)}" stroke-width="4" stroke-linecap="round"/>
          </g>`;
      },
    },

    bacterium: {
      viewBox: '0 0 220 90',
      draw(a, id) {
        let flagella = '';
        for (let i = 0; i < 3; i++) {
          const y = 36 + i * 9;
          flagella += `<path d="M168 ${y} q14 -7 24 2 t22 -3" fill="none" stroke="${shade(a, 0.3)}"
                         stroke-width="2" opacity="0.65" stroke-linecap="round"/>`;
        }
        return `${glow(id + 'g', 2.5)}
          ${flagella}
          <g filter="url(#${id}g)">
            <rect x="18" y="24" width="152" height="42" rx="21" fill="${a}"/>
            <rect x="18" y="24" width="152" height="42" rx="21" fill="none"
                  stroke="${shade(a, 0.45)}" stroke-width="1.5" opacity="0.8"/>
          </g>
          <!-- nucleoid and ribosomes -->
          <path d="M52 45 q16 -12 32 0 t34 -2" fill="none" stroke="#fff" stroke-width="3"
                opacity="0.4" stroke-linecap="round"/>
          <circle cx="46" cy="34" r="2.4" fill="#fff" opacity="0.35"/>
          <circle cx="96" cy="58" r="2.2" fill="#fff" opacity="0.3"/>
          <circle cx="132" cy="33" r="2.6" fill="#fff" opacity="0.32"/>
          <ellipse cx="60" cy="34" rx="26" ry="6" fill="#fff" opacity="0.16"/>`;
      },
    },

    hair: {
      viewBox: '0 0 220 90',
      draw(a, id) {
        // Overlapping cuticle scales are what a hair actually looks like
        // under magnification — angled, shingled, not segmented.
        let scales = '';
        for (let i = 0; i < 14; i++) {
          const x = 12 + i * 11;
          scales += `<path d="M${x} 36 l6 9 l-6 9" fill="none" stroke="#fff"
                       stroke-width="1" opacity="0.22"/>`;
        }
        return `${glow(id + 'g', 2)}
          <g filter="url(#${id}g)">
            <rect x="8" y="34" width="164" height="22" rx="11" fill="${a}"/>
          </g>
          <rect x="8" y="34" width="164" height="22" rx="11" fill="none"
                stroke="${shade(a, 0.4)}" stroke-width="1.2" opacity="0.7"/>
          ${scales}
          <rect x="12" y="37" width="156" height="4" rx="2" fill="#fff" opacity="0.22"/>
          <!-- cut end, showing cuticle / cortex / medulla -->
          <circle cx="188" cy="45" r="22" fill="${shade(a, -0.35)}"/>
          <circle cx="188" cy="45" r="22" fill="none" stroke="${shade(a, 0.35)}" stroke-width="1.6"/>
          <circle cx="188" cy="45" r="14" fill="${a}" opacity="0.75"/>
          <circle cx="188" cy="45" r="5" fill="${shade(a, 0.6)}" opacity="0.85"/>
          <circle cx="182" cy="38" r="5" fill="#fff" opacity="0.18"/>`;
      },
    },

    ant: {
      viewBox: '0 0 220 110',
      draw(a, id) {
        const leg = d => `<path d="${d}" fill="none" stroke="${shade(a, -0.25)}" stroke-width="3"
                            stroke-linecap="round" stroke-linejoin="round"/>`;
        return `${glow(id + 'g', 2)}
          <g>
            ${leg('M104 62 L92 84 L78 94')}
            ${leg('M112 60 L112 88 L104 100')}
            ${leg('M120 60 L136 84 L150 92')}
            ${leg('M100 52 L84 40 L70 34')}
            ${leg('M118 52 L134 40 L148 34')}
          </g>
          <g filter="url(#${id}g)">
            <ellipse cx="168" cy="52" rx="34" ry="25" fill="${a}"/>
            <ellipse cx="112" cy="54" rx="22" ry="17" fill="${shade(a, -0.12)}"/>
            <ellipse cx="66" cy="52" rx="24" ry="20" fill="${a}"/>
          </g>
          <!-- antennae -->
          <path d="M52 40 L34 24 L18 22" fill="none" stroke="${shade(a, -0.25)}" stroke-width="3"
                stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M56 62 L38 68 L24 78" fill="none" stroke="${shade(a, -0.25)}" stroke-width="3"
                stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="56" cy="45" r="4.5" fill="#0b1220" opacity="0.75"/>
          <ellipse cx="160" cy="42" rx="16" ry="8" fill="#fff" opacity="0.16"/>
          <ellipse cx="60" cy="45" rx="10" ry="5" fill="#fff" opacity="0.14"/>`;
      },
    },

    /* ---------- human scale ---------- */

    hand: {
      viewBox: '0 0 210 150',
      draw(a, id) {
        // Fingers are separated by real gaps and start at the palm edge —
        // without the gaps the whole thing reads as a mitten.
        // Each finger carries its own outline, otherwise the glow fuses them
        // into one blob and the whole hand reads as a mitten.
        const edge = `stroke="${shade(a, -0.4)}" stroke-width="1.6"`;
        const finger = (y, len, w) =>
          `<rect x="104" y="${y}" width="${len}" height="${w}" rx="${w / 2}" fill="${a}" ${edge}/>`;
        return `${glow(id + 'g', 1.5)}
          <g filter="url(#${id}g)">
            <rect x="8" y="56" width="40" height="44" rx="12" fill="${shade(a, -0.2)}" ${edge}/>
            <rect x="38" y="28" width="72" height="92" rx="20" fill="${a}" ${edge}/>
            ${finger(30, 62, 17)}
            ${finger(51, 74, 18)}
            ${finger(73, 66, 18)}
            ${finger(95, 48, 16)}
            <g transform="rotate(38 58 108)">
              <rect x="42" y="98" width="60" height="20" rx="10" fill="${shade(a, -0.12)}" ${edge}/>
            </g>
          </g>
          <!-- knuckle and palm creases -->
          <g stroke="#000" opacity="0.18" fill="none" stroke-width="1.8" stroke-linecap="round">
            <path d="M56 50 q24 8 44 4"/>
            <path d="M52 70 q26 10 48 4"/>
            <path d="M56 90 q22 8 40 4"/>
          </g>
          <!-- the ancient unit this hand stands for -->
          <g stroke="${shade(a, 0.5)}" stroke-width="1.4" opacity="0.75">
            <path d="M14 132 L166 132"/><path d="M14 127 L14 137"/><path d="M166 127 L166 137"/>
          </g>
          <text x="90" y="146" text-anchor="middle" fill="${shade(a, 0.5)}" font-size="10"
                font-family="'IBM Plex Mono',monospace">1 handbreadth ≈ 4 fingers</text>`;
      },
    },

    human: {
      viewBox: '0 0 70 170',
      draw(a, id) {
        return `${glow(id + 'g', 2)}
          <g filter="url(#${id}g)" fill="${a}">
            <circle cx="35" cy="17" r="12.5"/>
            <rect x="31" y="28" width="8" height="7"/>
            <!-- torso: shoulders taper to waist -->
            <path d="M20 38 q15 -6 30 0 l-3 34 q-12 5 -24 0 z"/>
            <!-- arms -->
            <path d="M21 38 q-10 3 -12 14 l-4 28 q-1 5 4 6 q5 1 6 -4 l4 -27 l6 -11 z"/>
            <path d="M49 38 q10 3 12 14 l4 28 q1 5 -4 6 q-5 1 -6 -4 l-4 -27 l-6 -11 z"/>
            <!-- hips and legs -->
            <path d="M23 70 q12 5 24 0 l2 12 l-6 52 q-1 6 -6 6 q-5 0 -5 -6 l-2 -38 l-2 38 q0 6 -5 6 q-5 0 -6 -6 l-6 -52 z"/>
            <!-- feet -->
            <path d="M22 138 q-8 2 -8 5 q0 3 6 3 l9 0 l0 -8 z"/>
            <path d="M48 138 q8 2 8 5 q0 3 -6 3 l-9 0 l0 -8 z"/>
          </g>
          <ellipse cx="30" cy="13" rx="6" ry="4" fill="#fff" opacity="0.2"/>`;
      },
    },

    'blue-whale': {
      viewBox: '0 0 260 110',
      draw(a, id) {
        return `${glow(id + 'g', 3)}
          <g filter="url(#${id}g)">
            <!-- long, slender body: a blue whale is far leaner than a fish -->
            <path d="M14 58 C18 44 40 35 82 32 C130 29 180 38 220 52
                     C180 72 128 78 82 75 C42 72 20 70 14 58 Z" fill="${a}"/>
            <!-- horizontal tail flukes, not a vertical fish tail -->
            <path d="M212 50 q20 -13 38 -15 q-14 12 -16 16 q11 6 17 15
                     q-19 -8 -37 -13 z" fill="${shade(a, -0.08)}"/>
            <!-- tiny dorsal fin, set three-quarters of the way back -->
            <path d="M182 41 q9 -12 19 -10 q-9 6 -10 14 z" fill="${shade(a, -0.18)}"/>
            <!-- pectoral flipper, swept back -->
            <path d="M92 68 q8 20 28 27 q-8 -18 -18 -27 z" fill="${shade(a, -0.18)}"/>
          </g>
          <!-- pale underside and the throat pleats blue whales are named for -->
          <path d="M24 62 C56 74 108 79 150 73 C112 82 56 79 24 62 Z" fill="#fff" opacity="0.2"/>
          <g stroke="#fff" stroke-width="1" opacity="0.25">
            <path d="M28 60 q20 12 42 15"/>
            <path d="M36 64 q20 11 40 14"/>
            <path d="M46 68 q18 9 36 12"/>
          </g>
          <!-- blowhole spray -->
          <g stroke="#e0f2fe" stroke-width="1.6" opacity="0.5" stroke-linecap="round">
            <path d="M40 36 q-4 -12 -2 -18"/><path d="M44 35 q2 -12 8 -16"/>
          </g>
          <circle cx="30" cy="55" r="2.6" fill="#0b1220" opacity="0.75"/>
          <path d="M16 62 q18 6 44 8" fill="none" stroke="#0b1220" stroke-width="1.2" opacity="0.28"/>`;
      },
    },

    'eiffel-tower': {
      viewBox: '0 0 140 210',
      draw(a, id) {
        let lattice = '';
        for (let i = 0; i < 9; i++) {
          const t = i / 8;
          const y = 74 + t * 96;
          const halfW = 12 + t * 34;
          lattice += `<path d="M${70 - halfW} ${y} L${70 + halfW} ${y + 12}
                              M${70 + halfW} ${y} L${70 - halfW} ${y + 12}"
                        stroke="${shade(a, -0.3)}" stroke-width="1.1" opacity="0.55" fill="none"/>`;
        }
        return `${glow(id + 'g', 2.5)}
          <g filter="url(#${id}g)" fill="${a}">
            <!-- antenna and upper tower -->
            <rect x="68" y="8" width="4" height="20"/>
            <path d="M64 28 l12 0 l6 46 l-24 0 z"/>
            <!-- mid section, curving outward -->
            <path d="M58 74 l24 0 l10 46 l-44 0 z"/>
            <!-- legs: the signature outward flare -->
            <path d="M48 120 l44 0 l14 60 l-14 0 q-8 -34 -22 -46 q-14 12 -22 46 l-14 0 z"/>
            <!-- platforms -->
            <rect x="52" y="70" width="36" height="6" rx="1"/>
            <rect x="42" y="116" width="56" height="7" rx="1"/>
            <rect x="26" y="176" width="88" height="8" rx="2"/>
          </g>
          ${lattice}
          <!-- arch under the first platform -->
          <path d="M52 176 q18 -40 36 0" fill="none" stroke="${shade(a, 0.3)}"
                stroke-width="2" opacity="0.5"/>
          <rect x="14" y="184" width="112" height="4" rx="2" fill="${shade(a, -0.45)}" opacity="0.7"/>`;
      },
    },

    /* ---------- terrain & planetary ---------- */

    everest: {
      viewBox: '0 0 260 150',
      draw(a, id) {
        return `<defs>
            <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0b1a2e"/><stop offset="100%" stop-color="#1e3a5f"/>
            </linearGradient>
            <linearGradient id="${id}rock" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${shade(a, 0.15)}"/>
              <stop offset="100%" stop-color="${shade(a, -0.55)}"/>
            </linearGradient>
          </defs>
          <rect width="260" height="150" fill="url(#${id}sky)"/>
          ${starfield(19, 26, 260, 90, 0.8)}
          <!-- distant ridge -->
          <path d="M0 150 L38 96 L74 124 L116 74 L150 110 L188 68 L226 112 L260 84 L260 150 Z"
                fill="${shade(a, -0.7)}" opacity="0.75"/>
          <!-- main summit pyramid -->
          <path d="M18 150 L96 40 L134 82 L166 46 L246 150 Z" fill="url(#${id}rock)"/>
          <!-- snow cap and couloirs -->
          <path d="M96 40 L118 70 L106 66 L96 78 L84 62 L74 70 Z" fill="#f8fafc" opacity="0.92"/>
          <path d="M166 46 L184 72 L172 68 L164 78 L154 62 Z" fill="#f8fafc" opacity="0.85"/>
          <path d="M96 40 L104 52 L92 96 L86 66 Z" fill="#fff" opacity="0.25"/>
          <!-- wind-blown summit plume: thin streaks, not a cloud -->
          <g stroke="#fff" fill="none" stroke-linecap="round" opacity="0.35">
            <path d="M98 40 q30 -6 56 -2" stroke-width="2"/>
            <path d="M100 46 q26 -3 46 2" stroke-width="1.4" opacity="0.7"/>
            <path d="M102 52 q22 -1 38 4" stroke-width="1.1" opacity="0.5"/>
          </g>`;
      },
    },

    earth: {
      viewBox: '0 0 200 200',
      draw(a, id) {
        return `<defs>
            <radialGradient id="${id}oc" cx="35%" cy="30%" r="80%">
              <stop offset="0%" stop-color="#7dd3fc"/>
              <stop offset="55%" stop-color="#2563eb"/>
              <stop offset="100%" stop-color="#0b2559"/>
            </radialGradient>
            <radialGradient id="${id}atm" cx="50%" cy="50%" r="50%">
              <stop offset="82%" stop-color="#7dd3fc" stop-opacity="0"/>
              <stop offset="100%" stop-color="#7dd3fc" stop-opacity="0.55"/>
            </radialGradient>
            <clipPath id="${id}clip"><circle cx="100" cy="100" r="78"/></clipPath>
          </defs>
          <circle cx="100" cy="100" r="88" fill="url(#${id}atm)"/>
          <circle cx="100" cy="100" r="78" fill="url(#${id}oc)"/>
          <g clip-path="url(#${id}clip)" fill="#22c55e" opacity="0.88">
            <!-- africa + europe -->
            <path d="M96 44 q22 -6 30 10 q6 16 -4 26 q4 18 -8 30 q-6 22 -20 30 q-14 -12 -12 -34
                     q-12 -14 -6 -32 q4 -18 20 -30 z"/>
            <!-- americas, on the limb -->
            <path d="M46 62 q16 4 18 20 q-4 14 -14 18 q6 16 0 30 q-8 16 -18 18 q-8 -22 -2 -40
                     q-10 -20 4 -34 z" opacity="0.9"/>
            <!-- asia -->
            <path d="M136 52 q26 2 34 20 q-8 14 -26 16 q-14 2 -20 -12 q-2 -16 12 -24 z"/>
            <!-- australia -->
            <path d="M150 128 q20 -4 26 10 q-6 14 -22 12 q-12 -4 -4 -22 z"/>
          </g>
          <g clip-path="url(#${id}clip)">
            <!-- polar ice and cloud bands -->
            <ellipse cx="100" cy="26" rx="52" ry="16" fill="#fff" opacity="0.7"/>
            <ellipse cx="100" cy="176" rx="58" ry="18" fill="#fff" opacity="0.75"/>
            <path d="M22 84 q40 -12 76 2 q36 14 82 0" fill="none" stroke="#fff"
                  stroke-width="7" opacity="0.2"/>
            <path d="M18 126 q44 14 88 -2 q34 -12 76 4" fill="none" stroke="#fff"
                  stroke-width="6" opacity="0.16"/>
            <!-- night side -->
            <circle cx="150" cy="118" r="88" fill="#020617" opacity="0.42"/>
          </g>
          <circle cx="100" cy="100" r="78" fill="none" stroke="#7dd3fc" stroke-width="1.2" opacity="0.5"/>`;
      },
    },

    'earth-moon': {
      viewBox: '0 0 280 120',
      draw(a, id) {
        return `<defs>
            <radialGradient id="${id}e" cx="35%" cy="32%" r="75%">
              <stop offset="0%" stop-color="#7dd3fc"/><stop offset="60%" stop-color="#2563eb"/>
              <stop offset="100%" stop-color="#0b2559"/>
            </radialGradient>
            <radialGradient id="${id}m" cx="36%" cy="32%" r="75%">
              <stop offset="0%" stop-color="#f1f5f9"/><stop offset="100%" stop-color="#64748b"/>
            </radialGradient>
          </defs>
          ${starfield(31, 30, 280, 120, 0.9)}
          <circle cx="34" cy="60" r="30" fill="url(#${id}e)"/>
          <g opacity="0.85" fill="#22c55e">
            <path d="M24 40 q14 -2 16 10 q-2 12 -12 16 q-10 -4 -10 -14 q0 -10 6 -12 z"/>
            <path d="M44 66 q10 0 12 8 q-4 8 -14 6 q-6 -6 2 -14 z"/>
          </g>
          <circle cx="34" cy="60" r="30" fill="none" stroke="#7dd3fc" stroke-width="1" opacity="0.5"/>
          <circle cx="250" cy="60" r="12" fill="url(#${id}m)"/>
          <g fill="#475569" opacity="0.55">
            <circle cx="246" cy="55" r="3.2"/><circle cx="254" cy="63" r="2.2"/>
            <circle cx="247" cy="65" r="1.6"/>
          </g>
          <!-- laser ranging path: how we actually measure this -->
          <line x1="66" y1="60" x2="236" y2="60" stroke="${a}" stroke-width="1.4"
                stroke-dasharray="6 5" opacity="0.75"/>
          <path d="M66 60 l10 -4 l0 8 z" fill="${a}"/>
          <path d="M236 60 l-10 -4 l0 8 z" fill="${a}"/>
          <text x="151" y="48" text-anchor="middle" fill="${shade(a, 0.4)}"
                font-size="11" font-family="'IBM Plex Mono',monospace">384,400 km</text>`;
      },
    },

    'earth-sun': {
      viewBox: '0 0 280 120',
      draw(a, id) {
        return `<defs>
            <radialGradient id="${id}s" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fff8dc"/><stop offset="45%" stop-color="#fbbf24"/>
              <stop offset="100%" stop-color="#f97316"/>
            </radialGradient>
            <radialGradient id="${id}e" cx="35%" cy="32%" r="75%">
              <stop offset="0%" stop-color="#7dd3fc"/><stop offset="100%" stop-color="#1e40af"/>
            </radialGradient>
            ${glow(id + 'g', 5)}
          </defs>
          ${starfield(53, 26, 280, 120, 0.8)}
          <g filter="url(#${id}g)"><circle cx="30" cy="60" r="34" fill="url(#${id}s)"/></g>
          <circle cx="256" cy="60" r="10" fill="url(#${id}e)"/>
          <line x1="70" y1="60" x2="242" y2="60" stroke="${a}" stroke-width="1.4"
                stroke-dasharray="6 5" opacity="0.8"/>
          <path d="M70 60 l10 -4 l0 8 z" fill="${a}"/>
          <path d="M242 60 l-10 -4 l0 8 z" fill="${a}"/>
          <text x="156" y="48" text-anchor="middle" fill="${shade(a, 0.45)}"
                font-size="11" font-family="'IBM Plex Mono',monospace">1 AU · 8 min 19 s of light</text>`;
      },
    },

    heliosphere: {
      viewBox: '0 0 240 240',
      draw(a, id) {
        let orbits = '';
        [26, 38, 50, 64, 86, 104, 118, 130].forEach((r, i) => {
          orbits += `<circle cx="112" cy="120" r="${r}" fill="none" stroke="#fff"
                       stroke-width="0.8" opacity="${0.3 - i * 0.02}"/>`;
        });
        const planet = (r, ang, rad, c) => {
          const x = 112 + Math.cos(ang) * r, y = 120 + Math.sin(ang) * r;
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad}" fill="${c}"/>`;
        };
        return `${glow(id + 'g', 5)}
          ${starfield(71, 40, 240, 240, 0.9)}
          <!-- heliopause: blunt nose upstream, long tail downstream -->
          <path d="M112 4 C186 4 226 62 224 120 C222 178 182 232 112 236
                   C56 234 22 190 20 138 C18 74 52 6 112 4 Z"
                fill="${a}" opacity="0.09"/>
          <path d="M112 4 C186 4 226 62 224 120 C222 178 182 232 112 236
                   C56 234 22 190 20 138 C18 74 52 6 112 4 Z"
                fill="none" stroke="${a}" stroke-width="1.6" opacity="0.6" stroke-dasharray="5 4"/>
          <!-- bow shock -->
          <path d="M40 40 C86 8 150 12 194 44" fill="none" stroke="${shade(a, 0.4)}"
                stroke-width="1.2" opacity="0.4"/>
          ${orbits}
          <g filter="url(#${id}g)"><circle cx="112" cy="120" r="13" fill="#fbbf24"/></g>
          ${planet(26, 2.1, 2, '#cbd5e1')}
          ${planet(38, 0.6, 2.6, '#fbbf24')}
          ${planet(50, 3.6, 2.8, '#38bdf8')}
          ${planet(64, 5.2, 2.4, '#f87171')}
          ${planet(86, 1.2, 5, '#fbbf24')}
          ${planet(104, 4.1, 4.4, '#fcd34d')}
          ${planet(118, 2.6, 3.4, '#67e8f9')}
          ${planet(130, 5.6, 3.4, '#60a5fa')}
          <!-- Voyager 1, outbound past the boundary -->
          <circle cx="196" cy="52" r="2.4" fill="#fff"/>
          <path d="M196 52 L150 96" stroke="#fff" stroke-width="0.8" opacity="0.45" stroke-dasharray="3 3"/>`;
      },
    },

    /* ---------- stellar & cosmological ---------- */

    'star-gap': {
      viewBox: '0 0 280 120',
      draw(a, id) {
        return `${glow(id + 'g', 5)}
          ${starfield(97, 44, 280, 120, 1)}
          <g filter="url(#${id}g)">
            <circle cx="30" cy="60" r="16" fill="#fde68a"/>
            <circle cx="252" cy="60" r="9" fill="#fca5a5"/>
          </g>
          <line x1="54" y1="60" x2="238" y2="60" stroke="${a}" stroke-width="1.3"
                stroke-dasharray="6 6" opacity="0.7"/>
          <text x="146" y="46" text-anchor="middle" fill="${shade(a, 0.45)}"
                font-size="11" font-family="'IBM Plex Mono',monospace">4.24 light-years</text>
          <text x="30" y="92" text-anchor="middle" fill="#fde68a" font-size="9"
                font-family="'IBM Plex Mono',monospace">Sun</text>
          <text x="252" y="92" text-anchor="middle" fill="#fca5a5" font-size="9"
                font-family="'IBM Plex Mono',monospace">Proxima</text>`;
      },
    },

    'milky-way': {
      viewBox: '0 0 240 240',
      draw(a, id) {
        // Four logarithmic arms, sampled into paths.
        let arms = '';
        for (let k = 0; k < 4; k++) {
          const off = (k * Math.PI) / 2;
          let d = '';
          for (let i = 0; i <= 60; i++) {
            const t = i / 60;
            const ang = off + t * 2.6;
            const r = 16 + t * 96;
            const x = 120 + Math.cos(ang) * r;
            const y = 120 + Math.sin(ang) * r * 0.94;
            d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
          }
          arms += `<path d="${d}" fill="none" stroke="${k % 2 ? shade(a, 0.45) : a}"
                     stroke-width="${k % 2 ? 9 : 13}" opacity="${k % 2 ? 0.35 : 0.5}"
                     stroke-linecap="round"/>`;
        }
        return `<defs>
            <radialGradient id="${id}core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fff7ed"/>
              <stop offset="40%" stop-color="#fcd34d"/>
              <stop offset="100%" stop-color="${a}" stop-opacity="0"/>
            </radialGradient>
            ${glow(id + 'g', 6)}
          </defs>
          <circle cx="120" cy="120" r="118" fill="${a}" opacity="0.05"/>
          ${starfield(113, 90, 240, 240, 0.8)}
          <g filter="url(#${id}g)" opacity="0.9">${arms}</g>
          <!-- central bar and bulge -->
          <ellipse cx="120" cy="120" rx="46" ry="46" fill="url(#${id}core)"/>
          <rect x="88" y="112" width="64" height="16" rx="8" fill="#fcd34d" opacity="0.75"
                transform="rotate(-24 120 120)"/>
          <!-- our Sun, out in the Orion Spur -->
          <circle cx="176" cy="152" r="3.2" fill="#fff"/>
          <circle cx="176" cy="152" r="8" fill="none" stroke="#fff" stroke-width="1" opacity="0.6"/>
          <text x="176" y="174" text-anchor="middle" fill="#fff" font-size="9" opacity="0.75"
                font-family="'IBM Plex Mono',monospace">you are here</text>`;
      },
    },

    'galaxy-pair': {
      viewBox: '0 0 280 130',
      draw(a, id) {
        const spiral = (cx, cy, scale, tilt, c) => {
          let arms = '';
          for (let k = 0; k < 3; k++) {
            let d = '';
            for (let i = 0; i <= 44; i++) {
              const t = i / 44;
              const ang = (k * Math.PI * 2) / 3 + t * 3.6;
              const r = (4 + t * 32) * scale;
              const x = cx + Math.cos(ang) * r;
              const y = cy + Math.sin(ang) * r * tilt;
              d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
            }
            arms += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${5 * scale}"
                       opacity="0.55" stroke-linecap="round"/>`;
          }
          return `${arms}<ellipse cx="${cx}" cy="${cy}" rx="${11 * scale}" ry="${11 * scale * tilt}"
                    fill="#fde68a" opacity="0.85"/>`;
        };
        return `${glow(id + 'g', 4)}
          ${starfield(131, 50, 280, 130, 0.9)}
          <g filter="url(#${id}g)">
            ${spiral(44, 66, 1, 0.9, a)}
            ${spiral(232, 62, 1.25, 0.42, shade(a, 0.3))}
          </g>
          <line x1="86" y1="66" x2="188" y2="64" stroke="#fff" stroke-width="1"
                stroke-dasharray="5 5" opacity="0.5"/>
          <text x="137" y="52" text-anchor="middle" fill="#fff" opacity="0.75" font-size="10"
                font-family="'IBM Plex Mono',monospace">2.5 million ly</text>
          <text x="44" y="112" text-anchor="middle" fill="#fff" opacity="0.55" font-size="9"
                font-family="'IBM Plex Mono',monospace">Milky Way</text>
          <text x="232" y="112" text-anchor="middle" fill="#fff" opacity="0.55" font-size="9"
                font-family="'IBM Plex Mono',monospace">Andromeda</text>`;
      },
    },

    'deep-field': {
      viewBox: '0 0 240 240',
      draw(a, id) {
        const rand = rng(211);
        const palette = ['#fef3c7', '#fca5a5', '#93c5fd', '#fcd34d', '#f9a8d4', '#a5b4fc'];
        let gals = '';
        for (let i = 0; i < 70; i++) {
          const x = rand() * 240, y = rand() * 240;
          const r = 1 + rand() * 5.5;
          const c = palette[Math.floor(rand() * palette.length)];
          const type = rand();
          if (type > 0.72) {
            // edge-on / spiral smudge
            gals += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(r * 2).toFixed(1)}"
                       ry="${(r * 0.5).toFixed(1)}" fill="${c}" opacity="${(0.3 + rand() * 0.5).toFixed(2)}"
                       transform="rotate(${(rand() * 180).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
          } else {
            gals += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"
                       fill="${c}" opacity="${(0.25 + rand() * 0.55).toFixed(2)}"/>`;
          }
        }
        return `${glow(id + 'g', 2)}
          <rect width="240" height="240" fill="#04070f"/>
          ${starfield(233, 60, 240, 240, 0.6)}
          <g filter="url(#${id}g)">${gals}</g>
          <!-- the survey keyhole: a tiny patch of sky -->
          <rect x="8" y="8" width="224" height="224" fill="none" stroke="${a}"
                stroke-width="1.2" opacity="0.5" stroke-dasharray="8 6"/>`;
      },
    },

    'cosmic-web': {
      viewBox: '0 0 240 240',
      draw(a, id) {
        const rand = rng(317);
        const nodes = [];
        for (let i = 0; i < 26; i++) nodes.push([rand() * 240, rand() * 240, 1 + rand() * 4]);
        let links = '';
        nodes.forEach(([x, y], i) => {
          // connect each node to its two nearest neighbours → filaments and voids
          const near = nodes
            .map((n, j) => ({ j, d: Math.hypot(n[0] - x, n[1] - y) }))
            .filter(o => o.j !== i).sort((p, q) => p.d - q.d).slice(0, 2);
          near.forEach(({ j, d }) => {
            if (j > i && d < 90) {
              links += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}"
                          x2="${nodes[j][0].toFixed(1)}" y2="${nodes[j][1].toFixed(1)}"
                          stroke="${a}" stroke-width="${(2.4 - d / 60).toFixed(2)}"
                          opacity="${(0.5 - d / 320).toFixed(2)}"/>`;
            }
          });
        });
        let knots = '';
        nodes.forEach(([x, y, r]) => {
          knots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 2.6).toFixed(1)}"
                      fill="${a}" opacity="0.16"/>
                    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"
                      fill="#fff" opacity="0.8"/>`;
        });
        return `${glow(id + 'g', 3)}
          <rect width="240" height="240" fill="#03060e"/>
          ${starfield(419, 70, 240, 240, 0.5)}
          <g filter="url(#${id}g)">${links}${knots}</g>`;
      },
    },

    /* ---------- instruments (animated by the lesson) ---------- */

    /**
     * Laboratory thermometer. Animation hooks:
     *   [data-fig="mercury"]  — set y/height to raise the column
     *   [data-fig="reading"]  — text content
     *   [data-fig="scene"]    — swap the environment tint
     */
    thermometer: {
      viewBox: '0 0 300 120',
      draw(a, id) {
        let ticks = '';
        for (let i = 0; i <= 24; i++) {
          const x = 42 + i * 9.4;
          const major = i % 4 === 0;
          ticks += `<line x1="${x.toFixed(1)}" y1="${major ? 40 : 44}" x2="${x.toFixed(1)}" y2="50"
                      stroke="#e2e8f0" stroke-width="${major ? 1.4 : 0.8}" opacity="${major ? 0.75 : 0.4}"/>`;
        }
        return `<defs>
            <linearGradient id="${id}merc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#1d4ed8"/><stop offset="30%" stop-color="#22d3ee"/>
              <stop offset="58%" stop-color="#facc15"/><stop offset="100%" stop-color="#ef4444"/>
            </linearGradient>
            <linearGradient id="${id}glass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#fff" stop-opacity="0.28"/>
              <stop offset="45%" stop-color="#fff" stop-opacity="0.04"/>
              <stop offset="100%" stop-color="#fff" stop-opacity="0.16"/>
            </linearGradient>
            ${glow(id + 'g', 3)}
          </defs>
          <rect data-fig="scene" width="300" height="120" fill="${a}" opacity="0.05" rx="8"/>
          ${ticks}
          <!-- bulb -->
          <g filter="url(#${id}g)">
            <circle cx="28" cy="72" r="17" fill="#ef4444" opacity="0.9"/>
          </g>
          <circle cx="28" cy="72" r="17" fill="none" stroke="#e2e8f0" stroke-width="2" opacity="0.55"/>
          <circle cx="23" cy="66" r="5" fill="#fff" opacity="0.35"/>
          <!-- capillary tube -->
          <rect x="42" y="62" width="242" height="20" rx="10" fill="#0b1220" opacity="0.55"/>
          <rect data-fig="mercury" x="45" y="65" width="60" height="14" rx="7" fill="url(#${id}merc)"/>
          <rect x="42" y="62" width="242" height="20" rx="10" fill="url(#${id}glass)"/>
          <rect x="42" y="62" width="242" height="20" rx="10" fill="none"
                stroke="#e2e8f0" stroke-width="1.6" opacity="0.6"/>
          <rect x="46" y="65" width="234" height="4" rx="2" fill="#fff" opacity="0.18"/>
          <text data-fig="reading" x="150" y="30" text-anchor="middle" fill="#fff"
                font-size="13" font-weight="700" font-family="'Inter',sans-serif">Room temperature</text>
          <text x="46" y="103" fill="#94a3b8" font-size="8" font-family="'IBM Plex Mono',monospace">0 K</text>
          <text x="278" y="103" text-anchor="end" fill="#94a3b8" font-size="8"
                font-family="'IBM Plex Mono',monospace">1200 K</text>`;
      },
    },

    /**
     * Ohm's-law circuit: real schematic symbols, drawn to IEC convention.
     * Animation hooks:
     *   [data-fig="lamp-glow"]  — opacity tracks power
     *   [data-fig="electrons"]  — group of charge carriers to move
     *   [data-fig="v-label"] / [data-fig="r-label"] / [data-fig="i-label"]
     */
    circuit: {
      viewBox: '0 0 300 150',
      draw(a, id) {
        const wire = 'stroke="#cbd5e1" stroke-width="2.4" fill="none" stroke-linecap="round"';
        let electrons = '';
        for (let i = 0; i < 8; i++) {
          electrons += `<circle class="fig-electron" r="3.2" fill="${a}" cx="0" cy="0"/>`;
        }
        return `<defs>${glow(id + 'g', 4)}</defs>
          <!-- loop -->
          <path d="M46 44 L254 44 M254 44 L254 112 M254 112 L46 112 M46 112 L46 44" ${wire}/>
          <!-- battery: long plate positive, short plate negative -->
          <g>
            <rect x="38" y="60" width="16" height="8" fill="#0b1220" opacity="0"/>
            <line x1="34" y1="66" x2="58" y2="66" stroke="#f8fafc" stroke-width="3.2"/>
            <line x1="41" y1="76" x2="51" y2="76" stroke="#f8fafc" stroke-width="6"/>
            <line x1="34" y1="86" x2="58" y2="86" stroke="#f8fafc" stroke-width="3.2"/>
            <line x1="41" y1="96" x2="51" y2="96" stroke="#f8fafc" stroke-width="6"/>
            <line x1="46" y1="44" x2="46" y2="66" ${wire}/>
            <line x1="46" y1="96" x2="46" y2="112" ${wire}/>
            <text x="70" y="72" fill="#f8fafc" font-size="10" font-family="'IBM Plex Mono',monospace">+</text>
            <text data-fig="v-label" x="72" y="96" fill="${a}" font-size="11" font-weight="600"
                  font-family="'IBM Plex Mono',monospace">12 V</text>
          </g>
          <!-- resistor: IEC rectangle, in series along the top -->
          <g>
            <line x1="46" y1="44" x2="118" y2="44" ${wire}/>
            <rect x="118" y="34" width="52" height="20" rx="3" fill="#0b1220"
                  stroke="#cbd5e1" stroke-width="2.2"/>
            <line x1="170" y1="44" x2="254" y2="44" ${wire}/>
            <text data-fig="r-label" x="144" y="26" text-anchor="middle" fill="${a}" font-size="11"
                  font-weight="600" font-family="'IBM Plex Mono',monospace">6 Ω</text>
          </g>
          <!-- lamp as the load, bottom right -->
          <g>
            <circle data-fig="lamp-glow" cx="192" cy="112" r="26" fill="#fbbf24" opacity="0.25"
                    filter="url(#${id}g)"/>
            <circle cx="192" cy="112" r="14" fill="#0b1220" stroke="#cbd5e1" stroke-width="2.2"/>
            <path d="M182 102 L202 122 M202 102 L182 122" stroke="#cbd5e1" stroke-width="1.8"/>
          </g>
          <!-- ammeter in series, bottom left -->
          <g>
            <circle cx="104" cy="112" r="13" fill="#0b1220" stroke="#cbd5e1" stroke-width="2.2"/>
            <text x="104" y="116" text-anchor="middle" fill="#cbd5e1" font-size="11"
                  font-weight="700" font-family="'IBM Plex Mono',monospace">A</text>
          </g>
          <text data-fig="i-label" x="150" y="140" text-anchor="middle" fill="${a}" font-size="11"
                font-weight="600" font-family="'IBM Plex Mono',monospace">2 A</text>
          <g data-fig="electrons">${electrons}</g>`;
      },
    },

    /**
     * Atmosphere-to-ocean cross-section for pressure.
     * Animation hooks:
     *   [data-fig="marker"]  — the depth/altitude indicator
     *   [data-fig="place"] / [data-fig="alt"]  — labels
     */
    'altitude-column': {
      viewBox: '0 0 300 150',
      draw(a, id) {
        return `<defs>
            <linearGradient id="${id}col" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#020617"/>
              <stop offset="30%" stop-color="#1e3a8a"/>
              <stop offset="53%" stop-color="#7dd3fc"/>
              <stop offset="54%" stop-color="#0e7490"/>
              <stop offset="100%" stop-color="#022c22"/>
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="288" height="138" rx="8" fill="url(#${id}col)"/>
          ${starfield(577, 16, 288, 40, 0.7)}
          <!-- sea level datum -->
          <line x1="6" y1="81" x2="294" y2="81" stroke="#fff" stroke-width="1"
                stroke-dasharray="5 4" opacity="0.6"/>
          <text x="12" y="77" fill="#e0f2fe" font-size="7" opacity="0.75"
                font-family="'Inter',sans-serif">sea level · 1 atm</text>
          <!-- reference bodies, top to bottom: balloon, jet, mountain, diver, submarine -->
          <g opacity="0.9">
            <circle cx="252" cy="22" r="7" fill="#fef3c7"/>
            <path d="M248 28 l4 6 l4 -6 z" fill="#fbbf24"/>
            <path d="M52 40 l22 0 l10 5 l-10 5 l-22 0 l-8 -5 z" fill="#e2e8f0"/>
            <path d="M62 40 l6 -8 l4 8 z" fill="#cbd5e1"/>
            <path d="M96 81 L128 52 L146 68 L160 56 L192 81 Z" fill="#334155"/>
            <path d="M128 52 L138 62 L132 61 L126 68 L120 59 Z" fill="#f8fafc" opacity="0.9"/>
            <g transform="translate(214 96)">
              <circle cx="0" cy="0" r="4" fill="#fde68a"/>
              <path d="M-1 4 l2 0 l3 12 l-8 0 z" fill="#0ea5e9"/>
              <path d="M-6 18 l12 0 l-2 4 l-8 0 z" fill="#0284c7"/>
            </g>
            <g transform="translate(70 124)">
              <ellipse cx="0" cy="0" rx="20" ry="7" fill="#facc15"/>
              <rect x="-4" y="-11" width="8" height="6" rx="2" fill="#eab308"/>
              <circle cx="8" cy="0" r="2" fill="#0b1220" opacity="0.6"/>
              <circle cx="0" cy="0" r="2" fill="#0b1220" opacity="0.6"/>
            </g>
          </g>
          <!-- rising bubbles sell the water half -->
          <g fill="#e0f2fe" opacity="0.35">
            <circle cx="182" cy="118" r="2"/><circle cx="188" cy="106" r="1.4"/>
            <circle cx="176" cy="98" r="1.8"/><circle cx="120" cy="132" r="1.6"/>
          </g>
          <circle data-fig="marker" cx="150" cy="81" r="7" fill="${a}" stroke="#fff" stroke-width="2"/>
          <text data-fig="place" x="150" y="26" text-anchor="middle" fill="#fff" font-size="11"
                font-weight="700" font-family="'Inter',sans-serif">Sea level</text>
          <text data-fig="alt" x="150" y="40" text-anchor="middle" fill="#e0f2fe" opacity="0.75"
                font-size="9" font-family="'IBM Plex Mono',monospace">0 m</text>`;
      },
    },
  };

  /* ── public API ───────────────────────────────────────────────────── */

  function markup(name, opts) {
    const fig = FIGURES[name];
    if (!fig) return '';
    const o = opts || {};
    const accent = o.accent || '#f59e0b';
    const id = `lf${(++seq).toString(36)}`;
    const label = o.label
      ? `<title>${String(o.label).replace(/[<&>]/g, '')}</title>`
      : '';
    return `<svg viewBox="${fig.viewBox}" width="100%" height="100%"
              preserveAspectRatio="${o.preserveAspectRatio || 'xMidYMid meet'}"
              xmlns="http://www.w3.org/2000/svg"
              role="${o.label ? 'img' : 'presentation'}"
              ${o.label ? '' : 'aria-hidden="true"'}>${label}${fig.draw(accent, id)}</svg>`;
  }

  function render(el, name, opts) {
    if (!el) return false;
    const svg = markup(name, opts);
    if (!svg) return false;
    el.innerHTML = svg;
    return true;
  }

  return {
    markup,
    render,
    has: name => Object.prototype.hasOwnProperty.call(FIGURES, name),
    names: () => Object.keys(FIGURES),
    aspect: name => {
      const f = FIGURES[name];
      if (!f) return 1;
      const [, , w, h] = f.viewBox.split(/\s+/).map(Number);
      return w / h;
    },
  };
})();

if (typeof window !== 'undefined') window.LessonFigures = LessonFigures;
