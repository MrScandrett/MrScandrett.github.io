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

    /* ---------- scale-ladder fillers ----------
       These sit between the landmark figures above so a continuous zoom
       through the scale of the universe never has to fall back on an
       anonymous coloured blob. Same rules as everything else: real
       proportions, drawn locally, no external assets. */

    'nucleus-heavy': {
      viewBox: '0 0 120 120',
      draw(a, id) {
        // Nucleons pack like marbles in a bag, not in a lattice.
        const rand = rng(23);
        let pack = '';
        const placed = [];
        for (let i = 0; i < 60 && placed.length < 34; i++) {
          const ang = rand() * Math.PI * 2;
          const rad = Math.sqrt(rand()) * 33;
          const x = 60 + Math.cos(ang) * rad, y = 60 + Math.sin(ang) * rad;
          if (placed.some(p => Math.hypot(p[0] - x, p[1] - y) < 9)) continue;
          placed.push([x, y]);
        }
        placed.sort((p, q) => p[1] - q[1]).forEach(([x, y], i) => {
          const proton = i % 5 < 2;
          const c = proton ? shade(a, 0.3) : shade(a, -0.3);
          pack += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${c}"/>
                   <circle cx="${(x - 1.8).toFixed(1)}" cy="${(y - 2).toFixed(1)}" r="1.9"
                     fill="#fff" opacity="0.4"/>`;
        });
        return `${glow(id + 'g', 2.5)}
          <circle cx="60" cy="60" r="42" fill="${a}" opacity="0.1"/>
          <g filter="url(#${id}g)">${pack}</g>
          <circle cx="60" cy="60" r="40" fill="none" stroke="${shade(a, 0.4)}"
                  stroke-width="1.2" opacity="0.45" stroke-dasharray="4 5"/>`;
      },
    },

    'gamma-wave': {
      viewBox: '0 0 240 90',
      draw(a, id) {
        // Very short wavelength, drawn against a measured bracket.
        let d = 'M12 48';
        for (let i = 0; i < 24; i++) {
          const x = 12 + i * 9;
          d += ` Q${x + 2.25} ${i % 2 ? 70 : 26} ${x + 4.5} 48 T${x + 9} 48`;
        }
        return `${glow(id + 'g', 3)}
          <g filter="url(#${id}g)">
            <path d="${d}" fill="none" stroke="${a}" stroke-width="3" stroke-linecap="round"/>
          </g>
          <path d="M12 78 L21 78 M12 74 L12 82 M21 74 L21 82" stroke="#fff"
                stroke-width="1.2" opacity="0.5"/>
          <path d="M198 48 l22 0 m-7 -6 l7 6 l-7 6" fill="none" stroke="${shade(a, 0.5)}"
                stroke-width="2" opacity="0.65" stroke-linecap="round" stroke-linejoin="round"/>`;
      },
    },

    'hydrogen-atom': {
      viewBox: '0 0 140 140',
      draw(a, id) {
        // An electron is a probability cloud, not a planet — so the cloud is
        // the figure and the "orbit" is only a faint guide.
        const rand = rng(91);
        let cloud = '';
        for (let i = 0; i < 260; i++) {
          const ang = rand() * Math.PI * 2;
          // densest near the Bohr radius, thinning inward and outward
          const rad = 24 + (rand() + rand() + rand() - 1.5) * 24;
          if (rad < 8) continue;
          cloud += `<circle cx="${(70 + Math.cos(ang) * rad).toFixed(1)}"
                      cy="${(70 + Math.sin(ang) * rad).toFixed(1)}"
                      r="${(1.2 + rand() * 2.2).toFixed(2)}" fill="${shade(a, 0.55)}"
                      opacity="${(0.3 + rand() * 0.5).toFixed(2)}"/>`;
        }
        return `${glow(id + 'g', 3)}
          <defs>
            <radialGradient id="${id}s" cx="50%" cy="50%">
              <stop offset="0%" stop-color="${a}" stop-opacity="0.05"/>
              <stop offset="45%" stop-color="${a}" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="${a}" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="70" cy="70" r="58" fill="url(#${id}s)"/>
          <g filter="url(#${id}g)">${cloud}</g>
          <circle cx="70" cy="70" r="34" fill="none" stroke="${a}" stroke-width="0.8"
                  opacity="0.28" stroke-dasharray="3 6"/>
          <circle cx="70" cy="70" r="6" fill="${shade(a, 0.2)}"/>
          <circle cx="68" cy="68" r="2" fill="#fff" opacity="0.55"/>`;
      },
    },

    'water-molecule': {
      viewBox: '0 0 160 140',
      draw(a, id) {
        // Bent, not linear: the H–O–H angle really is about 104.5°.
        const O = [80, 58], r = 34, hr = 20;
        const ang = (104.5 / 2) * Math.PI / 180;
        const H = [
          [O[0] - Math.sin(ang) * 46, O[1] + Math.cos(ang) * 46],
          [O[0] + Math.sin(ang) * 46, O[1] + Math.cos(ang) * 46],
        ];
        const bond = ([x, y]) =>
          `<line x1="${O[0]}" y1="${O[1]}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"
             stroke="${shade(a, -0.25)}" stroke-width="9" stroke-linecap="round" opacity="0.85"/>`;
        const atom = ([x, y], rad, c) =>
          `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad}" fill="${c}"/>
           <circle cx="${(x - rad * 0.3).toFixed(1)}" cy="${(y - rad * 0.35).toFixed(1)}"
             r="${(rad * 0.3).toFixed(1)}" fill="#fff" opacity="0.45"/>`;
        return `${glow(id + 'g', 3)}
          <g filter="url(#${id}g)">
            ${bond(H[0])}${bond(H[1])}
            ${atom(H[0], hr, '#e2e8f0')}${atom(H[1], hr, '#e2e8f0')}
            ${atom(O, r, a)}
          </g>
          <path d="M${(O[0] - 15).toFixed(1)} ${(O[1] + 26).toFixed(1)}
                   A 30 30 0 0 0 ${(O[0] + 15).toFixed(1)} ${(O[1] + 26).toFixed(1)}"
                fill="none" stroke="#fff" stroke-width="1" opacity="0.35"/>`;
      },
    },

    transistor: {
      viewBox: '0 0 220 130',
      draw(a, id) {
        // Cross-section of a fin transistor: substrate, fin, wrapped gate.
        return `${glow(id + 'g', 2)}
          <rect x="8" y="88" width="204" height="34" rx="4" fill="${shade(a, -0.55)}"/>
          <rect x="8" y="88" width="204" height="6" fill="${shade(a, -0.3)}" opacity="0.8"/>
          <g filter="url(#${id}g)">
            <!-- source and drain -->
            <rect x="26" y="46" width="46" height="44" rx="4" fill="${shade(a, 0.25)}"/>
            <rect x="148" y="46" width="46" height="44" rx="4" fill="${shade(a, 0.25)}"/>
            <!-- the fin running between them -->
            <rect x="72" y="62" width="76" height="28" fill="${shade(a, -0.05)}"/>
            <!-- gate stack wrapped over the fin -->
            <rect x="88" y="26" width="44" height="64" rx="3" fill="${a}"/>
          </g>
          <rect x="88" y="26" width="44" height="64" rx="3" fill="none"
                stroke="${shade(a, 0.5)}" stroke-width="1.4" opacity="0.8"/>
          <rect x="92" y="30" width="10" height="56" fill="#fff" opacity="0.18"/>
          <g fill="#fff" opacity="0.45" font-family="monospace" font-size="11">
            <text x="34" y="40">S</text><text x="104" y="20">G</text><text x="156" y="40">D</text>
          </g>
          <!-- a few atoms wide: the scale bar says so -->
          <g stroke="#fff" opacity="0.3" stroke-width="1">
            <path d="M88 104 L132 104 M88 100 L88 108 M132 100 L132 108"/>
          </g>`;
      },
    },

    'cell-membrane': {
      viewBox: '0 0 240 120',
      draw(a, id) {
        // Phospholipid bilayer: two sheets of heads, tails facing inward.
        let lipids = '';
        for (let i = 0; i < 24; i++) {
          const x = 10 + i * 9.6;
          lipids += `<circle cx="${x}" cy="34" r="4.2" fill="${a}"/>
                     <path d="M${x - 1.6} 38 l-1 16 M${x + 1.6} 38 l1 16"
                       stroke="${shade(a, -0.2)}" stroke-width="1.6" opacity="0.8"/>
                     <circle cx="${x}" cy="86" r="4.2" fill="${a}"/>
                     <path d="M${x - 1.6} 82 l-1 -16 M${x + 1.6} 82 l1 -16"
                       stroke="${shade(a, -0.2)}" stroke-width="1.6" opacity="0.8"/>`;
        }
        return `${glow(id + 'g', 2)}
          <g filter="url(#${id}g)">${lipids}</g>
          <!-- an integral protein punching through both leaflets -->
          <path d="M150 24 q22 -4 30 10 q8 14 0 28 q-8 20 2 34 q-20 6 -32 -8
                   q-10 -16 -2 -30 q8 -16 2 -34 z" fill="${shade(a, 0.45)}" opacity="0.9"/>
          <path d="M156 30 q14 -2 18 8" fill="none" stroke="#fff" stroke-width="1.4" opacity="0.3"/>
          <ellipse cx="60" cy="30" rx="34" ry="5" fill="#fff" opacity="0.14"/>`;
      },
    },

    'virus-capsid': {
      viewBox: '0 0 130 130',
      draw(a, id) {
        // Icosahedral capsid: a ring of triangular facets, shaded by angle.
        const p = (t, r) => `${(65 + Math.cos(t) * r).toFixed(1)},${(65 + Math.sin(t) * r).toFixed(1)}`;
        // Outline is the decagon silhouette of an icosahedron seen face-on;
        // the facets are the triangles between the rim and an inner ring.
        let rim = '';
        for (let i = 0; i < 10; i++) rim += p(-Math.PI / 2 + (i / 10) * Math.PI * 2, 56) + ' ';
        let facets = '';
        for (let i = 0; i < 5; i++) {
          const t0 = -Math.PI / 2 + (i / 5) * Math.PI * 2;
          const t1 = -Math.PI / 2 + ((i + 1) / 5) * Math.PI * 2;
          const tm = (t0 + t1) / 2;
          // upper-left facets catch the light, lower-right fall into shadow
          const lit = Math.cos(tm + 2.4) * 0.22;
          facets += `<polygon points="${p(t0, 56)} ${p(t1, 56)} ${p(tm, 22)}"
                       fill="${shade(a, lit)}" stroke="${shade(a, 0.5)}"
                       stroke-width="1" opacity="0.9"/>
                     <polygon points="${p(t0, 56)} ${p(tm, 22)} ${p(tm - Math.PI * 0.4, 22)}"
                       fill="${shade(a, lit - 0.16)}" stroke="${shade(a, 0.5)}"
                       stroke-width="1" opacity="0.9"/>`;
        }
        let studs = '';
        for (let i = 0; i < 10; i++) {
          const t = -Math.PI / 2 + (i / 10) * Math.PI * 2 + Math.PI / 10;
          studs += `<circle cx="${(65 + Math.cos(t) * 38).toFixed(1)}"
                      cy="${(65 + Math.sin(t) * 38).toFixed(1)}" r="3"
                      fill="#fff" opacity="0.28"/>`;
        }
        return `${glow(id + 'g', 3)}
          <circle cx="65" cy="65" r="60" fill="${a}" opacity="0.1"/>
          <g filter="url(#${id}g)">
            <polygon points="${rim.trim()}" fill="${a}"/>
            ${facets}
          </g>
          <polygon points="${rim.trim()}" fill="none" stroke="${shade(a, 0.55)}" stroke-width="1.6"/>
          ${studs}
          <ellipse cx="46" cy="38" rx="15" ry="8" fill="#fff" opacity="0.18"
                   transform="rotate(-30 46 38)"/>`;
      },
    },

    'virus-enveloped': {
      viewBox: '0 0 140 140',
      draw(a, id) {
        // Lipid envelope studded with glycoproteins, conical core inside.
        let spikes = '';
        for (let i = 0; i < 22; i++) {
          const t = (i / 22) * Math.PI * 2;
          const x1 = 70 + Math.cos(t) * 46, y1 = 70 + Math.sin(t) * 46;
          const x2 = 70 + Math.cos(t) * 58, y2 = 70 + Math.sin(t) * 58;
          spikes += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}"
                       x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
                       stroke="${shade(a, 0.3)}" stroke-width="2.4" stroke-linecap="round"/>
                     <circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="4"
                       fill="${shade(a, 0.5)}"/>`;
        }
        return `${glow(id + 'g', 3)}
          <g filter="url(#${id}g)">
            ${spikes}
            <circle cx="70" cy="70" r="46" fill="${a}" opacity="0.85"/>
            <circle cx="70" cy="70" r="46" fill="none" stroke="${shade(a, 0.45)}" stroke-width="2"/>
            <!-- the cone-shaped capsid HIV is recognised by -->
            <path d="M52 44 L88 54 L80 96 L58 96 Z" fill="${shade(a, -0.35)}" opacity="0.95"/>
          </g>
          <path d="M58 54 q12 16 16 36" fill="none" stroke="#fff" stroke-width="2" opacity="0.3"/>
          <ellipse cx="54" cy="50" rx="14" ry="8" fill="#fff" opacity="0.14"
                   transform="rotate(-35 54 50)"/>`;
      },
    },

    'light-wave': {
      viewBox: '0 0 240 100',
      draw(a, id) {
        // One wavelength called out with a bracket — the unit being measured.
        let d = 'M10 50';
        for (let i = 0; i < 5; i++) {
          const x = 10 + i * 44;
          d += ` C${x + 11} 8 ${x + 33} 92 ${x + 44} 50`;
        }
        return `${glow(id + 'g', 3.5)}
          <g filter="url(#${id}g)">
            <path d="${d}" fill="none" stroke="${a}" stroke-width="3.4" stroke-linecap="round"/>
          </g>
          <g stroke="#fff" opacity="0.55" stroke-width="1.2">
            <path d="M54 84 L98 84 M54 79 L54 89 M98 79 L98 89"/>
          </g>
          <text x="62" y="98" fill="#fff" opacity="0.5" font-family="monospace" font-size="10">λ</text>
          <path d="M198 50 l30 0 m-9 -6 l9 6 l-9 6" fill="none" stroke="${shade(a, 0.5)}"
                stroke-width="2" opacity="0.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      },
    },

    mitochondrion: {
      viewBox: '0 0 220 110',
      draw(a, id) {
        // The cristae are folds of the inner membrane — drawn as a continuous
        // ribbon, not as free-floating stripes.
        let cristae = '';
        for (let i = 0; i < 9; i++) {
          const x = 30 + i * 18;
          const dir = i % 2 ? 1 : -1;
          cristae += `<path d="M${x} ${55 - dir * 26} q9 ${dir * 16} 0 ${dir * 32} q-9 ${dir * 16} 0 ${dir * 20}"
                        fill="none" stroke="${shade(a, 0.4)}" stroke-width="3.4"
                        opacity="0.75" stroke-linecap="round"/>`;
        }
        return `${glow(id + 'g', 2.5)}
          <g filter="url(#${id}g)">
            <ellipse cx="110" cy="55" rx="102" ry="44" fill="${a}"/>
          </g>
          <ellipse cx="110" cy="55" rx="102" ry="44" fill="none"
                   stroke="${shade(a, 0.45)}" stroke-width="2" opacity="0.85"/>
          <ellipse cx="110" cy="55" rx="94" ry="36" fill="${shade(a, -0.25)}" opacity="0.75"/>
          <g clip-path="url(#${id}c)">${cristae}</g>
          <clipPath id="${id}c"><ellipse cx="110" cy="55" rx="94" ry="36"/></clipPath>
          <ellipse cx="74" cy="30" rx="30" ry="8" fill="#fff" opacity="0.14"/>`;
      },
    },

    'red-blood-cell': {
      viewBox: '0 0 140 120',
      draw(a, id) {
        // Biconcave disc seen at a tilt: rim thick, centre dimpled and pale.
        return `${glow(id + 'g', 3)}
          <g filter="url(#${id}g)">
            <ellipse cx="70" cy="62" rx="60" ry="44" fill="${a}"/>
          </g>
          <ellipse cx="70" cy="62" rx="60" ry="44" fill="none"
                   stroke="${shade(a, -0.3)}" stroke-width="2" opacity="0.6"/>
          <!-- the biconcave dimple: dark well, bright lip on the lit side -->
          <ellipse cx="70" cy="62" rx="34" ry="24" fill="${shade(a, -0.5)}" opacity="0.9"/>
          <ellipse cx="70" cy="62" rx="34" ry="24" fill="none" stroke="${shade(a, 0.35)}"
                   stroke-width="2.5" opacity="0.55"/>
          <path d="M40 56 A 34 24 0 0 1 92 44" fill="none" stroke="#fff"
                stroke-width="3" opacity="0.3" stroke-linecap="round"/>
          <ellipse cx="70" cy="62" rx="22" ry="15" fill="${shade(a, -0.65)}" opacity="0.55"/>
          <!-- thick rim catching the light -->
          <path d="M14 54 A 60 44 0 0 1 74 18" fill="none" stroke="#fff"
                stroke-width="5" opacity="0.25" stroke-linecap="round"/>
          <ellipse cx="70" cy="62" rx="52" ry="37" fill="none" stroke="${shade(a, 0.4)}"
                   stroke-width="1.2" opacity="0.3"/>`;
      },
    },

    'pollen-grain': {
      viewBox: '0 0 140 140',
      draw(a, id) {
        // Echinate (spiny) grain — the ragweed-type shape everyone recognises.
        const rand = rng(53);
        let spines = '';
        for (let i = 0; i < 30; i++) {
          const t = (i / 30) * Math.PI * 2 + rand() * 0.06;
          const base = 44, tip = 44 + 9 + rand() * 4;
          const x1 = 70 + Math.cos(t) * base, y1 = 70 + Math.sin(t) * base;
          const x2 = 70 + Math.cos(t) * tip, y2 = 70 + Math.sin(t) * tip;
          spines += `<path d="M${(x1 - Math.sin(t) * 4).toFixed(1)} ${(y1 + Math.cos(t) * 4).toFixed(1)}
                       L${x2.toFixed(1)} ${y2.toFixed(1)}
                       L${(x1 + Math.sin(t) * 4).toFixed(1)} ${(y1 - Math.cos(t) * 4).toFixed(1)} Z"
                       fill="${shade(a, -0.2)}"/>`;
        }
        let pores = '';
        for (let i = 0; i < 5; i++) {
          const t = (i / 5) * Math.PI * 2 + 0.4;
          pores += `<circle cx="${(70 + Math.cos(t) * 26).toFixed(1)}"
                      cy="${(70 + Math.sin(t) * 22).toFixed(1)}" r="5"
                      fill="${shade(a, -0.4)}" opacity="0.7"/>`;
        }
        return `${glow(id + 'g', 2.5)}
          <g filter="url(#${id}g)">
            ${spines}
            <circle cx="70" cy="70" r="45" fill="${a}"/>
          </g>
          ${pores}
          <ellipse cx="54" cy="50" rx="18" ry="11" fill="#fff" opacity="0.2"
                   transform="rotate(-30 54 50)"/>`;
      },
    },

    'skin-cell': {
      viewBox: '0 0 160 130',
      draw(a, id) {
        // Squamous cells are flat, irregular polygons that tile against
        // their neighbours — so the neighbours are part of the picture.
        const cell = (pts, fill, op) =>
          `<polygon points="${pts}" fill="${fill}" opacity="${op}"
             stroke="${shade(a, 0.45)}" stroke-width="1.4"/>`;
        return `${glow(id + 'g', 2)}
          ${cell('4,30 42,10 60,24 44,64 8,58', shade(a, -0.35), 0.55)}
          ${cell('110,8 156,20 152,60 116,54 100,26', shade(a, -0.35), 0.55)}
          ${cell('16,86 56,74 78,108 40,126 12,112', shade(a, -0.35), 0.55)}
          ${cell('104,70 148,78 156,116 112,124 92,98', shade(a, -0.35), 0.55)}
          <g filter="url(#${id}g)">
            ${cell('48,20 96,14 122,44 108,88 62,98 34,64', a, 1)}
          </g>
          <ellipse cx="78" cy="54" rx="17" ry="14" fill="${shade(a, -0.45)}" opacity="0.9"/>
          <ellipse cx="74" cy="50" rx="6" ry="5" fill="#fff" opacity="0.25"/>
          <path d="M52 26 q22 -6 40 -2" fill="none" stroke="#fff" stroke-width="1.6" opacity="0.22"/>`;
      },
    },

    'egg-cell': {
      viewBox: '0 0 160 160',
      draw(a, id) {
        // Ovum: corona radiata of follicle cells, zona pellucida, then the
        // cell itself with its nucleus.
        const rand = rng(11);
        let corona = '';
        for (let i = 0; i < 26; i++) {
          const t = (i / 26) * Math.PI * 2;
          const r = 62 + rand() * 6;
          corona += `<ellipse cx="${(80 + Math.cos(t) * r).toFixed(1)}"
                       cy="${(80 + Math.sin(t) * r).toFixed(1)}" rx="9" ry="7"
                       fill="${shade(a, 0.35)}" opacity="0.45"
                       transform="rotate(${(t * 180 / Math.PI).toFixed(0)}
                         ${(80 + Math.cos(t) * r).toFixed(1)} ${(80 + Math.sin(t) * r).toFixed(1)})"/>`;
        }
        return `${glow(id + 'g', 3)}
          ${corona}
          <circle cx="80" cy="80" r="56" fill="${shade(a, 0.5)}" opacity="0.22"/>
          <circle cx="80" cy="80" r="56" fill="none" stroke="${shade(a, 0.4)}"
                  stroke-width="3" opacity="0.5"/>
          <g filter="url(#${id}g)">
            <circle cx="80" cy="80" r="46" fill="${a}"/>
          </g>
          <circle cx="88" cy="74" r="17" fill="${shade(a, -0.4)}" opacity="0.9"/>
          <circle cx="88" cy="74" r="6" fill="${shade(a, 0.5)}" opacity="0.8"/>
          <ellipse cx="58" cy="58" rx="18" ry="11" fill="#fff" opacity="0.22"
                   transform="rotate(-35 58 58)"/>`;
      },
    },

    'dust-mite': {
      viewBox: '0 0 200 150',
      draw(a, id) {
        // Eight legs, no antennae, no waist: an arachnid, not an insect.
        const leg = d => `<path d="${d}" fill="none" stroke="${shade(a, -0.3)}"
                            stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
        let hairs = '';
        for (let i = 0; i < 9; i++) {
          const t = -0.6 + i * 0.35;
          hairs += `<path d="M${(110 + Math.cos(t) * 52).toFixed(1)} ${(78 + Math.sin(t) * 42).toFixed(1)}
                      l${(Math.cos(t) * 16).toFixed(1)} ${(Math.sin(t) * 13).toFixed(1)}"
                      stroke="${shade(a, -0.2)}" stroke-width="2" opacity="0.7" stroke-linecap="round"/>`;
        }
        return `${glow(id + 'g', 2.5)}
          <g>
            ${leg('M74 62 L48 42 L30 40')}${leg('M74 86 L46 92 L28 104')}
            ${leg('M96 58 L86 30 L70 18')}${leg('M96 100 L86 128 L70 140')}
            ${leg('M136 58 L146 30 L164 20')}${leg('M136 102 L148 130 L166 140')}
            ${leg('M152 68 L182 54 L194 44')}${leg('M152 92 L184 100 L196 112')}
          </g>
          ${hairs}
          <g filter="url(#${id}g)">
            <ellipse cx="112" cy="78" rx="54" ry="44" fill="${a}"/>
            <ellipse cx="58" cy="74" rx="24" ry="20" fill="${shade(a, -0.15)}"/>
          </g>
          <!-- chelicerae -->
          <path d="M38 68 l-18 -6 M38 80 l-18 8" stroke="${shade(a, -0.35)}"
                stroke-width="4" stroke-linecap="round"/>
          <ellipse cx="96" cy="52" rx="26" ry="12" fill="#fff" opacity="0.16"
                   transform="rotate(-16 96 52)"/>
          <path d="M78 60 q34 22 66 20" fill="none" stroke="${shade(a, -0.3)}"
                stroke-width="1.4" opacity="0.35"/>`;
      },
    },

    'sand-grain': {
      viewBox: '0 0 140 130',
      draw(a, id) {
        // A weathered quartz grain: sub-angular, with conchoidal facets.
        return `${glow(id + 'g', 2)}
          <g filter="url(#${id}g)">
            <path d="M22 52 L52 16 L100 12 L128 46 L120 92 L82 120 L36 110 L14 78 Z"
                  fill="${a}"/>
          </g>
          <!-- conchoidal facets: each catches the light differently, which is
               what makes a quartz grain read as a hard broken crystal -->
          <g>
            <path d="M22 52 L52 16 L74 58 Z" fill="${shade(a, 0.5)}" opacity="0.75"/>
            <path d="M52 16 L100 12 L74 58 Z" fill="${shade(a, 0.28)}" opacity="0.7"/>
            <path d="M100 12 L128 46 L74 58 Z" fill="${shade(a, -0.2)}" opacity="0.7"/>
            <path d="M128 46 L120 92 L74 58 Z" fill="${shade(a, -0.45)}" opacity="0.8"/>
            <path d="M120 92 L82 120 L74 58 Z" fill="${shade(a, -0.55)}" opacity="0.75"/>
            <path d="M82 120 L36 110 L74 58 Z" fill="${shade(a, -0.35)}" opacity="0.7"/>
            <path d="M36 110 L14 78 L74 58 Z" fill="${shade(a, -0.1)}" opacity="0.6"/>
            <path d="M14 78 L22 52 L74 58 Z" fill="${shade(a, 0.18)}" opacity="0.6"/>
          </g>
          <g stroke="${shade(a, 0.45)}" stroke-width="0.9" opacity="0.4" fill="none">
            <path d="M22 52 L74 58 M52 16 L74 58 M100 12 L74 58 M128 46 L74 58
                     M120 92 L74 58 M82 120 L74 58 M36 110 L74 58 M14 78 L74 58"/>
          </g>
          <path d="M22 52 L52 16 L100 12 L128 46 L120 92 L82 120 L36 110 L14 78 Z"
                fill="none" stroke="${shade(a, 0.5)}" stroke-width="1.6" opacity="0.7"/>
          <path d="M40 40 q18 -14 40 -12" fill="none" stroke="#fff" stroke-width="3"
                opacity="0.28" stroke-linecap="round"/>
          <circle cx="60" cy="34" r="4" fill="#fff" opacity="0.3"/>`;
      },
    },

    'sesame-seed': {
      viewBox: '0 0 180 110',
      draw(a, id) {
        // A sesame seed is a flattened teardrop: pointed at the hilum end,
        // broad and rounded at the other, with a raised rim around the face.
        const body = `M16 55 C26 30 66 14 116 20 C152 24 170 40 170 55
                      C170 70 152 86 116 90 C66 96 26 80 16 55 Z`;
        return `${glow(id + 'g', 2)}
          <g filter="url(#${id}g)"><path d="${body}" fill="${a}"/></g>
          <path d="${body}" fill="none" stroke="${shade(a, -0.45)}" stroke-width="2.4" opacity="0.8"/>
          <!-- rim, then the slightly sunken face inside it -->
          <path d="M34 55 C44 38 74 26 114 30 C142 34 156 44 156 55
                   C156 66 142 78 114 82 C74 86 44 72 34 55 Z"
                fill="${shade(a, -0.18)}" opacity="0.55"/>
          <path d="M48 44 C68 32 98 30 128 36" fill="none" stroke="#fff"
                stroke-width="5" opacity="0.3" stroke-linecap="round"/>
          <path d="M54 72 C78 82 110 80 138 68" fill="none" stroke="${shade(a, -0.5)}"
                stroke-width="1.6" opacity="0.45"/>
          <!-- hilum: the scar where the seed was attached -->
          <ellipse cx="20" cy="55" rx="6" ry="8" fill="${shade(a, -0.55)}" opacity="0.85"/>`;
      },
    },

    honeybee: {
      viewBox: '0 0 220 140',
      draw(a, id) {
        const leg = d => `<path d="${d}" fill="none" stroke="${shade(a, -0.55)}"
                            stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`;
        return `${glow(id + 'g', 2.5)}
          <!-- wings sit above the body and are barely tinted -->
          <g opacity="0.4">
            <ellipse cx="118" cy="40" rx="52" ry="20" fill="#e0f2fe"
                     transform="rotate(-16 118 40)"/>
            <ellipse cx="96" cy="46" rx="36" ry="14" fill="#e0f2fe"
                     transform="rotate(-8 96 46)"/>
            <path d="M70 44 q46 -10 96 -6" fill="none" stroke="#fff" stroke-width="0.9" opacity="0.6"/>
          </g>
          <g>${leg('M84 92 L74 118 L60 126')}${leg('M104 96 L102 122 L88 132')}
             ${leg('M124 94 L134 120 L150 126')}</g>
          <g filter="url(#${id}g)">
            <ellipse cx="150" cy="78" rx="52" ry="34" fill="${a}"/>
            <ellipse cx="98" cy="74" rx="26" ry="26" fill="${shade(a, -0.45)}"/>
            <ellipse cx="60" cy="72" rx="24" ry="21" fill="${shade(a, -0.6)}"/>
          </g>
          <!-- abdominal banding -->
          <g fill="${shade(a, -0.7)}" opacity="0.85">
            <path d="M126 50 q10 28 0 56 q12 4 18 2 q9 -30 0 -60 q-8 -1 -18 2 z"/>
            <path d="M160 50 q10 28 0 56 q11 -3 15 -8 q7 -20 0 -40 q-5 -6 -15 -8 z"/>
          </g>
          <path d="M198 78 l14 6" stroke="${shade(a, -0.7)}" stroke-width="3" stroke-linecap="round"/>
          <path d="M44 58 L26 40 M44 66 L24 56" stroke="${shade(a, -0.6)}"
                stroke-width="3" stroke-linecap="round"/>
          <circle cx="50" cy="66" r="7" fill="#0b1220" opacity="0.8"/>
          <ellipse cx="140" cy="58" rx="22" ry="8" fill="#fff" opacity="0.18"/>`;
      },
    },

    coin: {
      viewBox: '0 0 130 130',
      draw(a, id) {
        // Milled (reeded) edge and a raised relief — read as struck metal.
        let reeds = '';
        for (let i = 0; i < 72; i++) {
          const t = (i / 72) * Math.PI * 2;
          reeds += `<line x1="${(65 + Math.cos(t) * 56).toFixed(1)}" y1="${(65 + Math.sin(t) * 56).toFixed(1)}"
                      x2="${(65 + Math.cos(t) * 61).toFixed(1)}" y2="${(65 + Math.sin(t) * 61).toFixed(1)}"
                      stroke="${shade(a, -0.35)}" stroke-width="1.6" opacity="0.55"/>`;
        }
        return `${glow(id + 'g', 2)}
          <g filter="url(#${id}g)">
            <circle cx="65" cy="65" r="61" fill="${a}"/>
          </g>
          ${reeds}
          <circle cx="65" cy="65" r="56" fill="${shade(a, 0.15)}"/>
          <circle cx="65" cy="65" r="48" fill="none" stroke="${shade(a, -0.35)}"
                  stroke-width="1.6" opacity="0.55"/>
          <!-- struck relief: a profile bust, kept abstract -->
          <path d="M50 92 q2 -22 12 -30 q-6 -14 6 -22 q14 -8 20 6 q4 12 -4 20
                   q10 8 12 26 z" fill="${shade(a, -0.3)}" opacity="0.8"/>
          <path d="M28 44 A 44 44 0 0 1 78 20" fill="none" stroke="#fff"
                stroke-width="3" opacity="0.25" stroke-linecap="round"/>`;
      },
    },

    'soccer-ball': {
      viewBox: '0 0 130 130',
      draw(a, id) {
        // Truncated-icosahedron panelling: one facing pentagon, five around it.
        const pent = (cx, cy, r, rot, fill) => {
          let pts = '';
          for (let i = 0; i < 5; i++) {
            const t = rot + (i / 5) * Math.PI * 2;
            pts += `${(cx + Math.cos(t) * r).toFixed(1)},${(cy + Math.sin(t) * r).toFixed(1)} `;
          }
          return `<polygon points="${pts.trim()}" fill="${fill}"
                    stroke="${shade(a, -0.6)}" stroke-width="1.6"/>`;
        };
        let ring = '';
        for (let i = 0; i < 5; i++) {
          const t = -Math.PI / 2 + (i / 5) * Math.PI * 2;
          ring += pent(65 + Math.cos(t) * 40, 65 + Math.sin(t) * 40, 15,
                       t + Math.PI / 5, shade(a, -0.62));
        }
        return `${glow(id + 'g', 2.5)}
          <g filter="url(#${id}g)">
            <circle cx="65" cy="65" r="61" fill="${a}"/>
          </g>
          <circle cx="65" cy="65" r="61" fill="none" stroke="${shade(a, -0.5)}"
                  stroke-width="1.4" opacity="0.5"/>
          ${ring}
          ${pent(65, 65, 20, -Math.PI / 2, shade(a, -0.7))}
          <path d="M28 40 A 46 46 0 0 1 66 12" fill="none" stroke="#fff"
                stroke-width="5" opacity="0.35" stroke-linecap="round"/>
          <ellipse cx="65" cy="120" rx="34" ry="6" fill="#000" opacity="0.18"/>`;
      },
    },

    giraffe: {
      viewBox: '0 0 180 240',
      draw(a, id) {
        // Proportions matter here: the neck is long, but the legs are
        // longer still — that is what makes a giraffe tall.
        const rand = rng(67);
        let patches = '';
        const spots = [[62, 92], [84, 104], [66, 126], [90, 140], [64, 158],
                       [92, 172], [104, 88], [110, 118], [72, 190], [100, 200],
                       [96, 62], [104, 44], [110, 28]];
        spots.forEach(([x, y]) => {
          const r = 7 + rand() * 5;
          patches += `<path d="M${x - r} ${y} l${r} ${-r * 0.8} l${r} ${r * 0.8}
                        l${-r * 0.5} ${r} l${-r} 0 z" fill="${shade(a, -0.45)}" opacity="0.75"/>`;
        });
        return `${glow(id + 'g', 2.5)}
          <g filter="url(#${id}g)" fill="${a}">
            <!-- legs -->
            <path d="M58 168 l10 0 l4 66 l-11 0 z"/>
            <path d="M78 172 l10 0 l3 62 l-11 0 z"/>
            <path d="M104 168 l10 0 l5 66 l-11 0 z"/>
            <path d="M122 172 l10 0 l4 62 l-11 0 z"/>
            <!-- body, sloping down from shoulder to rump -->
            <path d="M52 120 q22 -22 56 -18 q30 4 32 26 q2 26 -12 44 q-40 8 -74 -2
                     q-10 -22 -2 -50 z"/>
            <!-- neck and head -->
            <path d="M60 128 q-8 -56 26 -96 l18 6 q-26 40 -20 92 z"/>
            <path d="M84 32 q-4 -12 8 -16 q14 -4 22 6 l14 4 q6 3 2 8 l-16 4
                     q-12 6 -22 0 z"/>
            <!-- tail -->
            <path d="M140 132 q10 26 4 44 l-5 0 q2 -20 -6 -40 z"/>
          </g>
          ${patches}
          <!-- ossicones and ear -->
          <g fill="${shade(a, -0.4)}">
            <path d="M92 18 q-2 -12 3 -14 q5 -1 5 12 z"/>
            <path d="M104 16 q0 -12 5 -13 q5 0 3 13 z"/>
            <path d="M112 26 q14 -8 20 -2 q-8 8 -20 6 z"/>
          </g>
          <circle cx="104" cy="26" r="3.2" fill="#0b1220" opacity="0.8"/>
          <path d="M64 126 q-6 -50 24 -88" fill="none" stroke="#fff"
                stroke-width="3" opacity="0.16" stroke-linecap="round"/>
          <ellipse cx="90" cy="182" rx="46" ry="7" fill="#000" opacity="0.14"/>`;
      },
    },

    sequoia: {
      viewBox: '0 0 180 260',
      draw(a, id) {
        // A sequoia is a fluted, buttressed column with a narrow crown —
        // not the round lollipop tree of a child's drawing.
        const rand = rng(29);
        // The signature of a sequoia is the column: a huge fluted trunk that
        // runs most of the height, bare of branches, with a narrow crown.
        let foliage = '';
        for (let i = 0; i < 30; i++) {
          const t = i / 30;
          const y = 16 + t * 120;
          // widest a third of the way down, tapering to a rounded top
          const spread = 12 + Math.sin(Math.pow(t, 0.7) * Math.PI) * 40;
          const x = 90 + (rand() - 0.5) * spread * 1.8;
          foliage += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}"
                        rx="${(11 + rand() * 14).toFixed(1)}" ry="${(7 + rand() * 7).toFixed(1)}"
                        fill="${shade(a, i % 3 ? 0.05 : -0.3)}" opacity="0.9"/>`;
        }
        let branches = '';
        for (let i = 0; i < 7; i++) {
          const y = 60 + i * 12;
          const dir = i % 2 ? 1 : -1;
          branches += `<path d="M90 ${y} q${dir * 18} -3 ${dir * 34} -10"
                         fill="none" stroke="${shade(a, -0.55)}" stroke-width="3"
                         opacity="0.7" stroke-linecap="round"/>`;
        }
        return `${glow(id + 'g', 3)}
          <!-- trunk first: a broad, buttressed column carrying the crown -->
          <path d="M60 252 q-18 0 -22 -5 q14 -9 18 -34 l6 -84 q2 -22 8 -46 l18 0
                   q8 24 10 46 l7 84 q4 25 18 34 q-5 5 -23 5 z" fill="${shade(a, -0.55)}"/>
          ${branches}
          <g filter="url(#${id}g)">${foliage}</g>
          <!-- fluted bark: vertical grooves, converging as the trunk tapers -->
          <g stroke="${shade(a, -0.75)}" stroke-width="2.4" opacity="0.55" fill="none">
            <path d="M68 244 q4 -80 8 -156"/><path d="M82 246 q2 -82 3 -158"/>
            <path d="M96 246 q-1 -82 -1 -158"/><path d="M110 244 q-4 -80 -8 -156"/>
          </g>
          <path d="M62 240 q6 -84 10 -152" fill="none" stroke="#fff"
                stroke-width="3" opacity="0.16" stroke-linecap="round"/>
          <!-- a person at the base, to scale: the trunk is wider than they are tall -->
          <g fill="#e2e8f0" opacity="0.75">
            <circle cx="146" cy="234" r="4.5"/>
            <path d="M141 241 l10 0 l2 13 l-3 0 l-2 -7 l-2 7 l-3 0 z"/>
          </g>
          <ellipse cx="94" cy="254" rx="70" ry="6" fill="#000" opacity="0.2"/>`;
      },
    },

    'burj-khalifa': {
      viewBox: '0 0 140 260',
      draw(a, id) {
        // Three-winged plan spiralling into setbacks, then the spire.
        let setbacks = '';
        for (let i = 0; i < 14; i++) {
          const y = 60 + i * 12;
          const w = 34 - i * 2.1;
          const side = i % 2 ? 1 : -1;
          setbacks += `<rect x="${(70 - w / 2 + side * 3).toFixed(1)}" y="${y}"
                         width="${w.toFixed(1)}" height="13"
                         fill="${shade(a, i % 2 ? 0.12 : -0.08)}"/>`;
        }
        let floors = '';
        for (let i = 0; i < 22; i++) {
          floors += `<line x1="46" y1="${(70 + i * 8).toFixed(0)}" x2="94" y2="${(70 + i * 8).toFixed(0)}"
                       stroke="${shade(a, -0.45)}" stroke-width="0.8" opacity="0.35"/>`;
        }
        return `${glow(id + 'g', 3)}
          <g filter="url(#${id}g)">
            <!-- broad tripod base -->
            <path d="M34 250 L44 96 L96 96 L106 250 Z" fill="${a}"/>
            <path d="M44 96 L52 62 L88 62 L96 96 Z" fill="${shade(a, 0.1)}"/>
            ${setbacks}
            <rect x="66" y="30" width="8" height="36" fill="${shade(a, 0.3)}"/>
            <path d="M70 2 L73 30 L67 30 Z" fill="${shade(a, 0.5)}"/>
          </g>
          <g clip-path="url(#${id}c)">${floors}</g>
          <clipPath id="${id}c"><path d="M34 250 L44 96 L96 96 L106 250 Z"/></clipPath>
          <path d="M46 244 L54 98" fill="none" stroke="#fff" stroke-width="3" opacity="0.2"/>
          <ellipse cx="70" cy="252" rx="52" ry="6" fill="#000" opacity="0.2"/>`;
      },
    },

    'city-island': {
      viewBox: '0 0 260 140',
      draw(a, id) {
        // Manhattan read from across the water: a long, narrow island whose
        // skyline spikes at the two business districts.
        const rand = rng(83);
        let towers = '';
        let lights = '';
        let x = 8;
        while (x < 250) {
          const t = x / 250;
          // two humps of height: the Financial District and Midtown
          const hump = Math.exp(-Math.pow((t - 0.18) / 0.11, 2)) +
                       Math.exp(-Math.pow((t - 0.62) / 0.15, 2));
          const h = 14 + hump * 56 + rand() * 14;
          const w = 7 + rand() * 9;
          const top = 104 - h;
          const lit = rand() > 0.5;
          towers += `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}"
                       width="${w.toFixed(1)}" height="${h.toFixed(1)}"
                       fill="${shade(a, lit ? 0.05 : -0.35)}"/>`;
          // setback crown on the tall ones, then a mast
          if (h > 52) {
            towers += `<rect x="${(x + w * 0.2).toFixed(1)}" y="${(top - 8).toFixed(1)}"
                         width="${(w * 0.6).toFixed(1)}" height="8"
                         fill="${shade(a, lit ? 0.15 : -0.25)}"/>
                       <rect x="${(x + w / 2 - 0.7).toFixed(1)}" y="${(top - 20).toFixed(1)}"
                         width="1.4" height="12" fill="${shade(a, 0.45)}"/>`;
          }
          // lit windows, on the building's own grid
          for (let wy = top + 4; wy < 100; wy += 5) {
            for (let wx = x + 2; wx < x + w - 2; wx += 4) {
              if (rand() > 0.55) continue;
              lights += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="1.8" height="2.4"
                           fill="#fde68a" opacity="${(0.25 + rand() * 0.55).toFixed(2)}"/>`;
            }
          }
          x += w + 1 + rand() * 3;
        }
        return `${glow(id + 'g', 3)}
          <g filter="url(#${id}g)">${towers}</g>
          ${lights}
          <rect x="0" y="104" width="260" height="4" fill="${shade(a, -0.45)}"/>
          <rect x="0" y="108" width="260" height="32" fill="#0b1e3a" opacity="0.85"/>
          <g stroke="#fff" opacity="0.14" stroke-width="1">
            <path d="M20 116 q28 4 56 0"/><path d="M120 124 q30 4 60 0"/>
            <path d="M60 132 q30 4 60 0"/>
          </g>`;
      },
    },

    'island-britain': {
      viewBox: '0 0 160 240',
      draw(a, id) {
        // A recognisable coastline: Scotland's ragged north, the Wash, the
        // south-west peninsula, and Wales' bulge.
        return `${glow(id + 'g', 3)}
          <g filter="url(#${id}g)">
            <path d="M74 10 L86 6 L92 20 L104 16 L100 34 L110 40 L100 52 L108 66
                     L98 76 L106 92 L96 104 L104 118 L120 122 L132 138 L126 152
                     L136 160 L128 172 L106 176 L92 190 L74 200 L52 214 L34 224
                     L26 216 L44 202 L58 186 L46 180 L38 166 L48 156 L40 142
                     L52 132 L44 118 L56 108 L48 92 L58 80 L52 62 L62 50 L56 32
                     L66 24 Z" fill="${a}"/>
          </g>
          <path d="M74 10 L86 6 L92 20 L104 16 L100 34 L110 40 L100 52 L108 66
                   L98 76 L106 92 L96 104 L104 118 L120 122 L132 138 L126 152
                   L136 160 L128 172 L106 176 L92 190 L74 200 L52 214 L34 224
                   L26 216 L44 202 L58 186 L46 180 L38 166 L48 156 L40 142
                   L52 132 L44 118 L56 108 L48 92 L58 80 L52 62 L62 50 L56 32
                   L66 24 Z" fill="none" stroke="${shade(a, 0.5)}" stroke-width="1.6" opacity="0.8"/>
          <!-- Ireland, off to the west -->
          <path d="M14 150 L28 140 L34 152 L30 172 L16 180 L6 168 Z"
                fill="${shade(a, -0.3)}" opacity="0.75"/>
          <!-- highland shading and a couple of city dots -->
          <path d="M62 26 L84 20 L92 42 L70 54 Z" fill="${shade(a, -0.35)}" opacity="0.45"/>
          <circle cx="102" cy="166" r="3.4" fill="#fff" opacity="0.7"/>
          <circle cx="76" cy="132" r="2.6" fill="#fff" opacity="0.5"/>
          <circle cx="70" cy="34" r="2.4" fill="#fff" opacity="0.45"/>`;
      },
    },

    'coral-reef': {
      viewBox: '0 0 240 130',
      draw(a, id) {
        const rand = rng(37);
        let coral = '';
        for (let i = 0; i < 22; i++) {
          const x = 12 + rand() * 216, y = 74 + rand() * 34;
          const s = 8 + rand() * 12;
          if (i % 3 === 0) {
            // branching staghorn
            coral += `<g stroke="${shade(a, rand() > 0.5 ? 0.3 : -0.1)}" stroke-width="${(s / 5).toFixed(1)}"
                        fill="none" stroke-linecap="round" opacity="0.9">
                        <path d="M${x} ${y + s} L${x} ${y} M${x} ${y + s * 0.5} l${-s * 0.6} ${-s * 0.5}
                                 M${x} ${y + s * 0.6} l${s * 0.6} ${-s * 0.6}"/></g>`;
          } else if (i % 3 === 1) {
            // brain coral
            coral += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(s * 0.7).toFixed(1)}"
                        fill="${shade(a, 0.15)}" opacity="0.9"/>
                      <path d="M${(x - s * 0.5).toFixed(1)} ${y} q${(s * 0.25).toFixed(1)} -5
                               ${(s * 0.5).toFixed(1)} 0 t${(s * 0.5).toFixed(1)} 0"
                        fill="none" stroke="${shade(a, -0.4)}" stroke-width="1" opacity="0.6"/>`;
          } else {
            // plate coral
            coral += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${s.toFixed(1)}"
                        ry="${(s * 0.35).toFixed(1)}" fill="${shade(a, -0.2)}" opacity="0.85"/>`;
          }
        }
        let fish = '';
        for (let i = 0; i < 9; i++) {
          const x = 20 + rand() * 200, y = 16 + rand() * 44;
          fish += `<path d="M${x} ${y} q6 -4 12 0 q-6 4 -12 0 z M${x} ${y} l-4 -3 l0 6 z"
                     fill="#fff" opacity="${(0.3 + rand() * 0.4).toFixed(2)}"/>`;
        }
        return `${glow(id + 'g', 3)}
          <rect width="240" height="130" fill="#062a45" opacity="0.65"/>
          <!-- the reef crest and the deep water beyond it -->
          <path d="M0 96 q40 -18 82 -10 q50 10 96 -6 q34 -12 62 -4 l0 44 L0 130 Z"
                fill="${shade(a, -0.55)}" opacity="0.9"/>
          <g filter="url(#${id}g)">${coral}</g>
          ${fish}
          <g stroke="#e0f2fe" opacity="0.16" stroke-width="2">
            <path d="M20 12 q40 8 80 0"/><path d="M120 22 q40 8 80 0"/>
          </g>`;
      },
    },

    moon: {
      viewBox: '0 0 200 200',
      draw(a, id) {
        const rand = rng(613);
        let craters = '';
        for (let i = 0; i < 34; i++) {
          const ang = rand() * Math.PI * 2;
          const rad = Math.sqrt(rand()) * 86;
          const x = 100 + Math.cos(ang) * rad, y = 100 + Math.sin(ang) * rad;
          const r = 3 + rand() * 11;
          craters += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"
                        fill="${shade(a, -0.35)}" opacity="0.75"/>
                      <path d="M${(x - r).toFixed(1)} ${y.toFixed(1)}
                               A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(x + r).toFixed(1)} ${y.toFixed(1)}"
                        fill="none" stroke="#fff" stroke-width="1" opacity="0.22"/>`;
        }
        return `${glow(id + 'g', 3)}
          <defs>
            <radialGradient id="${id}s" cx="34%" cy="30%">
              <stop offset="0%" stop-color="${shade(a, 0.35)}"/>
              <stop offset="72%" stop-color="${a}"/>
              <stop offset="100%" stop-color="${shade(a, -0.55)}"/>
            </radialGradient>
          </defs>
          <g filter="url(#${id}g)"><circle cx="100" cy="100" r="94" fill="url(#${id}s)"/></g>
          <g clip-path="url(#${id}c)">
            <!-- maria: the dark basalt plains -->
            <ellipse cx="76" cy="72" rx="34" ry="26" fill="${shade(a, -0.4)}" opacity="0.6"
                     transform="rotate(-20 76 72)"/>
            <ellipse cx="118" cy="62" rx="22" ry="18" fill="${shade(a, -0.4)}" opacity="0.5"/>
            <ellipse cx="62" cy="122" rx="26" ry="20" fill="${shade(a, -0.4)}" opacity="0.45"/>
            ${craters}
          </g>
          <clipPath id="${id}c"><circle cx="100" cy="100" r="94"/></clipPath>`;
      },
    },

    jupiter: {
      viewBox: '0 0 200 200',
      draw(a, id) {
        const rand = rng(211);
        let bands = '';
        for (let i = 0; i < 13; i++) {
          const y = -94 + i * 15;
          const h = 8 + rand() * 7;
          bands += `<rect x="-100" y="${y.toFixed(1)}" width="200" height="${h.toFixed(1)}"
                      fill="${shade(a, i % 2 ? 0.28 : -0.32)}" opacity="0.8"/>`;
        }
        let swirls = '';
        for (let i = 0; i < 10; i++) {
          const y = -80 + rand() * 160;
          swirls += `<path d="M${(-90 + rand() * 60).toFixed(1)} ${y.toFixed(1)}
                       q20 ${(rand() * 10 - 5).toFixed(1)} 40 0 t40 0"
                       fill="none" stroke="#fff" stroke-width="1.2"
                       opacity="${(0.1 + rand() * 0.2).toFixed(2)}"/>`;
        }
        return `${glow(id + 'g', 3)}
          <defs>
            <radialGradient id="${id}s" cx="36%" cy="32%">
              <stop offset="0%" stop-color="#fff" stop-opacity="0.3"/>
              <stop offset="60%" stop-color="#fff" stop-opacity="0"/>
              <stop offset="100%" stop-color="#000" stop-opacity="0.45"/>
            </radialGradient>
          </defs>
          <g filter="url(#${id}g)"><circle cx="100" cy="100" r="94" fill="${a}"/></g>
          <!-- clip on the outer g, transform on an inner one: a transform on the
               clipped element moves its clip path too. -->
          <g clip-path="url(#${id}c)"><g transform="translate(100 100)">
            ${bands}${swirls}
            <!-- the Great Red Spot: a storm wider than Earth -->
            <ellipse cx="-26" cy="30" rx="30" ry="17" fill="#b91c1c" opacity="0.85"/>
            <ellipse cx="-26" cy="30" rx="20" ry="10" fill="#ef4444" opacity="0.7"/>
            <ellipse cx="-26" cy="30" rx="9" ry="4" fill="#fecaca" opacity="0.5"/>
          </g></g>
          <clipPath id="${id}c"><circle cx="100" cy="100" r="94"/></clipPath>
          <circle cx="100" cy="100" r="94" fill="url(#${id}s)"/>`;
      },
    },

    sun: {
      viewBox: '0 0 220 220',
      draw(a, id) {
        const rand = rng(907);
        let granules = '';
        for (let i = 0; i < 260; i++) {
          const ang = rand() * Math.PI * 2;
          const rad = Math.sqrt(rand()) * 82;
          // Granulation is a boiling mosaic: bright cells, dark lanes between.
          granules += `<circle cx="${(110 + Math.cos(ang) * rad).toFixed(1)}"
                         cy="${(110 + Math.sin(ang) * rad).toFixed(1)}"
                         r="${(3 + rand() * 5).toFixed(1)}"
                         fill="${rand() > 0.42 ? shade(a, 0.6) : shade(a, -0.4)}"
                         opacity="${(0.35 + rand() * 0.45).toFixed(2)}"/>`;
        }
        let prominences = '';
        for (let i = 0; i < 5; i++) {
          const t = rand() * Math.PI * 2;
          const x = 110 + Math.cos(t) * 84, y = 110 + Math.sin(t) * 84;
          prominences += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}
                            q${(Math.cos(t) * 22).toFixed(1)} ${(Math.sin(t) * 22).toFixed(1)}
                            ${(Math.cos(t + 0.5) * 26).toFixed(1)} ${(Math.sin(t + 0.5) * 26).toFixed(1)}"
                            fill="none" stroke="${shade(a, 0.3)}" stroke-width="5"
                            opacity="0.5" stroke-linecap="round"/>`;
        }
        return `${glow(id + 'g', 6)}
          <circle cx="110" cy="110" r="106" fill="${a}" opacity="0.14"/>
          <circle cx="110" cy="110" r="94" fill="${a}" opacity="0.25"/>
          <g filter="url(#${id}g)">
            ${prominences}
            <circle cx="110" cy="110" r="84" fill="${a}"/>
          </g>
          <g clip-path="url(#${id}c)">
            ${granules}
            <!-- sunspots, with dark umbra and lighter penumbra -->
            <ellipse cx="80" cy="126" rx="13" ry="9" fill="${shade(a, -0.5)}" opacity="0.8"/>
            <ellipse cx="80" cy="126" rx="6" ry="4" fill="#3b1d05" opacity="0.85"/>
            <ellipse cx="134" cy="82" rx="9" ry="6" fill="${shade(a, -0.5)}" opacity="0.7"/>
            <!-- limb darkening: the edge of the disk really is dimmer -->
            <circle cx="110" cy="110" r="76" fill="none" stroke="${shade(a, -0.5)}"
                    stroke-width="18" opacity="0.45"/>
            <circle cx="110" cy="110" r="84" fill="none" stroke="${shade(a, -0.6)}"
                    stroke-width="8" opacity="0.45"/>
          </g>
          <clipPath id="${id}c"><circle cx="110" cy="110" r="84"/></clipPath>`;
      },
    },

    'red-supergiant': {
      viewBox: '0 0 240 240',
      draw(a, id) {
        const rand = rng(151);
        let cells = '';
        for (let i = 0; i < 40; i++) {
          const ang = rand() * Math.PI * 2;
          const rad = Math.sqrt(rand()) * 80;
          cells += `<circle cx="${(120 + Math.cos(ang) * rad).toFixed(1)}"
                      cy="${(120 + Math.sin(ang) * rad).toFixed(1)}"
                      r="${(8 + rand() * 18).toFixed(1)}"
                      fill="${shade(a, rand() > 0.55 ? 0.35 : -0.3)}"
                      opacity="${(0.25 + rand() * 0.3).toFixed(2)}"/>`;
        }
        return `${glow(id + 'g', 7)}
          <circle cx="120" cy="120" r="118" fill="${a}" opacity="0.1"/>
          <!-- the bloated, dusty envelope a supergiant sheds -->
          <circle cx="120" cy="120" r="104" fill="${a}" opacity="0.18"/>
          <g filter="url(#${id}g)"><circle cx="120" cy="120" r="88" fill="${a}"/></g>
          <g clip-path="url(#${id}c)">${cells}
            <circle cx="120" cy="120" r="88" fill="none" stroke="${shade(a, -0.5)}"
                    stroke-width="16" opacity="0.3"/>
          </g>
          <clipPath id="${id}c"><circle cx="120" cy="120" r="88"/></clipPath>
          <!-- our Sun at the same scale, for comparison -->
          <circle cx="212" cy="212" r="3" fill="#fde68a"/>
          <text x="184" y="232" fill="#fff" opacity="0.4" font-family="monospace"
                font-size="9">Sun</text>`;
      },
    },

    'outer-orbit': {
      viewBox: '0 0 240 200',
      draw(a, id) {
        // Orbits drawn as ellipses seen at a tilt, with the Sun at a focus.
        const ring = (rx, ry, op, w) =>
          `<ellipse cx="120" cy="100" rx="${rx}" ry="${ry}" fill="none"
             stroke="${shade(a, 0.35)}" stroke-width="${w}" opacity="${op}"/>`;
        return `${glow(id + 'g', 4)}
          ${starfield(77, 40, 240, 200, 0.6)}
          ${ring(24, 9, 0.25, 1)}${ring(40, 15, 0.25, 1)}${ring(56, 21, 0.25, 1)}
          ${ring(74, 28, 0.3, 1.1)}
          ${ring(102, 39, 0.45, 1.4)}${ring(114, 44, 0.5, 1.6)}
          <g filter="url(#${id}g)">
            <circle cx="120" cy="100" r="9" fill="#fde68a"/>
            <circle cx="120" cy="100" r="15" fill="#fde68a" opacity="0.3"/>
          </g>
          <!-- Neptune, out on the last ring -->
          <circle cx="234" cy="100" r="6" fill="${shade(a, 0.2)}"/>
          <circle cx="232" cy="98" r="2" fill="#fff" opacity="0.4"/>
          <circle cx="18" cy="100" r="5" fill="${shade(a, -0.1)}" opacity="0.8"/>
          <circle cx="194" cy="88" r="3.4" fill="${shade(a, 0.1)}" opacity="0.8"/>`;
      },
    },

    'oort-cloud': {
      viewBox: '0 0 240 240',
      draw(a, id) {
        const rand = rng(431);
        let shell = '';
        for (let i = 0; i < 240; i++) {
          // hollow shell: sample a radius band, not a filled ball
          const ang = rand() * Math.PI * 2;
          const rad = 74 + (rand() + rand()) * 22;
          shell += `<circle cx="${(120 + Math.cos(ang) * rad).toFixed(1)}"
                      cy="${(120 + Math.sin(ang) * rad * 0.96).toFixed(1)}"
                      r="${(0.6 + rand() * 1.5).toFixed(2)}" fill="#fff"
                      opacity="${(0.25 + rand() * 0.55).toFixed(2)}"/>`;
        }
        return `${glow(id + 'g', 3)}
          <circle cx="120" cy="120" r="112" fill="${a}" opacity="0.06"/>
          <g filter="url(#${id}g)">${shell}</g>
          <circle cx="120" cy="120" r="74" fill="none" stroke="${a}"
                  stroke-width="1" opacity="0.2" stroke-dasharray="3 7"/>
          <!-- the whole planetary system is the speck in the middle -->
          <circle cx="120" cy="120" r="14" fill="${shade(a, 0.4)}" opacity="0.12"/>
          <circle cx="120" cy="120" r="3" fill="#fde68a"/>
          <circle cx="120" cy="120" r="7" fill="#fde68a" opacity="0.25"/>`;
      },
    },

    nebula: {
      viewBox: '0 0 240 200',
      draw(a, id) {
        const rand = rng(263);
        let clouds = '';
        for (let i = 0; i < 22; i++) {
          const x = 20 + rand() * 200, y = 20 + rand() * 160;
          clouds += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}"
                       rx="${(22 + rand() * 44).toFixed(1)}" ry="${(16 + rand() * 30).toFixed(1)}"
                       fill="${shade(a, rand() > 0.5 ? 0.35 : -0.15)}"
                       opacity="${(0.08 + rand() * 0.16).toFixed(2)}"
                       transform="rotate(${(rand() * 180).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
        }
        let young = '';
        for (let i = 0; i < 6; i++) {
          const x = 60 + rand() * 120, y = 50 + rand() * 100;
          young += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(2 + rand() * 2).toFixed(1)}"
                      fill="#fff"/>
                    <path d="M${(x - 9).toFixed(1)} ${y.toFixed(1)} h18 M${x.toFixed(1)} ${(y - 9).toFixed(1)} v18"
                      stroke="#fff" stroke-width="0.9" opacity="0.55"/>`;
        }
        return `${glow(id + 'g', 6)}
          <rect width="240" height="200" fill="#05070f"/>
          ${starfield(199, 90, 240, 200, 0.7)}
          <g filter="url(#${id}g)">${clouds}</g>
          <!-- dark dust lane cutting across the glow -->
          <path d="M0 128 q56 -30 108 -8 q54 22 132 -14 l0 20 q-78 34 -132 12
                   q-52 -22 -108 8 z" fill="#04060d" opacity="0.75"/>
          ${young}`;
      },
    },

    'galactic-core': {
      viewBox: '0 0 260 120',
      draw(a, id) {
        const rand = rng(347);
        let field = '';
        for (let i = 0; i < 60; i++) {
          const x = rand() * 260;
          // star density rises steeply toward the core on the right
          const conc = Math.pow(x / 260, 2.2);
          if (rand() > 0.25 + conc * 0.7) continue;
          field += `<circle cx="${x.toFixed(1)}" cy="${(20 + rand() * 80).toFixed(1)}"
                      r="${(0.6 + rand() * 1.6).toFixed(2)}" fill="#fff"
                      opacity="${(0.25 + rand() * 0.5).toFixed(2)}"/>`;
        }
        return `${glow(id + 'g', 5)}
          <rect width="260" height="120" fill="#05070f"/>
          <!-- the disk, seen edge-on from inside it -->
          <path d="M0 52 q80 -16 130 -14 q60 -2 130 12 l0 20 q-70 -12 -130 -10
                   q-50 2 -130 16 z" fill="${a}" opacity="0.2"/>
          <g filter="url(#${id}g)">
            <ellipse cx="222" cy="60" rx="40" ry="26" fill="${a}" opacity="0.4"/>
            <ellipse cx="222" cy="60" rx="22" ry="15" fill="${shade(a, 0.45)}" opacity="0.7"/>
            <circle cx="222" cy="60" r="6" fill="#fff"/>
          </g>
          ${field}
          <path d="M0 60 q40 -6 90 -4" fill="none" stroke="#0b0f1c" stroke-width="7" opacity="0.5"/>
          <!-- our Sun, out in the suburbs -->
          <circle cx="34" cy="58" r="3.2" fill="#fde68a"/>
          <circle cx="34" cy="58" r="8" fill="none" stroke="#fde68a" stroke-width="1" opacity="0.5"/>
          <path d="M46 58 L188 58" stroke="#fff" stroke-width="1" opacity="0.35"
                stroke-dasharray="4 5"/>
          <path d="M182 54 l8 4 l-8 4" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.5"/>`;
      },
    },

    'local-group': {
      viewBox: '0 0 240 200',
      draw(a, id) {
        const rand = rng(89);
        // Two big spirals, one mid-sized, and a swarm of dwarfs.
        const spiral = (cx, cy, r, rot, op) => {
          let arms = '';
          for (let k = 0; k < 2; k++) {
            let d = `M${cx} ${cy}`;
            for (let s = 0; s <= 18; s++) {
              const t = rot + k * Math.PI + s * 0.26;
              const rr = (s / 18) * r;
              d += ` L${(cx + Math.cos(t) * rr).toFixed(1)} ${(cy + Math.sin(t) * rr * 0.5).toFixed(1)}`;
            }
            arms += `<path d="${d}" fill="none" stroke="${a}" stroke-width="${(r / 14).toFixed(1)}"
                       opacity="${op}" stroke-linecap="round"/>`;
          }
          return `<g>${arms}
            <ellipse cx="${cx}" cy="${cy}" rx="${(r * 0.28).toFixed(1)}" ry="${(r * 0.15).toFixed(1)}"
              fill="#fff" opacity="${(op * 0.85).toFixed(2)}"/>
            <ellipse cx="${cx}" cy="${cy}" rx="${(r * 0.9).toFixed(1)}" ry="${(r * 0.45).toFixed(1)}"
              fill="${a}" opacity="${(op * 0.2).toFixed(2)}"/></g>`;
        };
        let dwarfs = '';
        for (let i = 0; i < 16; i++) {
          const x = 16 + rand() * 208, y = 16 + rand() * 168;
          dwarfs += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}"
                       rx="${(3 + rand() * 5).toFixed(1)}" ry="${(2 + rand() * 3).toFixed(1)}"
                       fill="${shade(a, 0.4)}" opacity="${(0.2 + rand() * 0.3).toFixed(2)}"/>`;
        }
        return `${glow(id + 'g', 4)}
          <rect width="240" height="200" fill="#05070f"/>
          ${starfield(151, 70, 240, 200, 0.5)}
          ${dwarfs}
          <g filter="url(#${id}g)">
            ${spiral(68, 128, 44, 0.4, 0.85)}
            ${spiral(172, 66, 54, 2.1, 0.9)}
            ${spiral(196, 148, 20, 1.2, 0.6)}
          </g>
          <text x="42" y="182" fill="#fff" opacity="0.35" font-family="monospace"
                font-size="9">Milky Way</text>
          <text x="150" y="30" fill="#fff" opacity="0.35" font-family="monospace"
                font-size="9">Andromeda</text>`;
      },
    },

    supercluster: {
      viewBox: '0 0 240 240',
      draw(a, id) {
        const rand = rng(509);
        // Galaxies strung along filaments that drain into a dense node.
        const nodes = [[120, 118, 12]];
        for (let i = 0; i < 7; i++) {
          const t = (i / 7) * Math.PI * 2 + 0.3;
          nodes.push([120 + Math.cos(t) * (60 + rand() * 40),
                      120 + Math.sin(t) * (60 + rand() * 40), 5 + rand() * 5]);
        }
        let filaments = '';
        let galaxies = '';
        nodes.slice(1).forEach(([x, y]) => {
          filaments += `<path d="M120 118 Q${((x + 120) / 2 + (rand() - 0.5) * 40).toFixed(1)}
                          ${((y + 118) / 2 + (rand() - 0.5) * 40).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}"
                          fill="none" stroke="${a}" stroke-width="2.4" opacity="0.28"/>`;
          for (let k = 0; k < 7; k++) {
            const f = 0.15 + rand() * 0.85;
            galaxies += `<ellipse cx="${(120 + (x - 120) * f + (rand() - 0.5) * 14).toFixed(1)}"
                           cy="${(118 + (y - 118) * f + (rand() - 0.5) * 14).toFixed(1)}"
                           rx="${(1.6 + rand() * 3).toFixed(1)}" ry="${(0.9 + rand() * 1.6).toFixed(1)}"
                           fill="#fff" opacity="${(0.3 + rand() * 0.5).toFixed(2)}"
                           transform="rotate(${(rand() * 180).toFixed(0)}
                             ${(120 + (x - 120) * f).toFixed(1)} ${(118 + (y - 118) * f).toFixed(1)})"/>`;
          }
        });
        let knots = '';
        nodes.forEach(([x, y, r]) => {
          knots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 2.2).toFixed(1)}"
                      fill="${a}" opacity="0.16"/>
                    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 0.55).toFixed(1)}"
                      fill="#fff" opacity="0.75"/>`;
        });
        return `${glow(id + 'g', 4)}
          <rect width="240" height="240" fill="#04060d"/>
          ${starfield(613, 50, 240, 240, 0.4)}
          <g filter="url(#${id}g)">${filaments}${knots}</g>
          ${galaxies}`;
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
