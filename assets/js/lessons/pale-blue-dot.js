/* Pale Blue Dot lesson (lessons/cosmology/pale-blue-dot.html): the main sim script.
 * Moved out of the page's second inline <script>, unchanged. */
  (function () {
    const { LOG_MIN, LOG_MAX, sliderToMeters, metersToSlider, KM, AU, LY, C_MS, D2R, sig, formatDistance, formatLightTime, SUP, powerOfTen, fade, EARTH_R, MOON_R, SUN_R, PLANETS, helioXY, EPS, skyXY, HELIO_NOSE, helioShape, niceBar } = PbdCore;
    const canvas = document.getElementById('pbd-canvas');
    const slider = document.getElementById('pbd-slider');
    const scaleValueEl = document.getElementById('pbd-scale-value');
    const milestoneEl = document.getElementById('pbd-milestone');
    const quoteEl = null; // replaced by pbd-speech-reveal system
    const quoteOverlayEl = null; // overlay removed — speech reveal handles this
    const wrap = document.getElementById('pbd-wrap');
    const modelLayer = document.getElementById('pbd-planet-layer');
    const journeyBtn = document.getElementById('pbd-journey-btn');
    const viewportEl = document.getElementById('pbd-viewport');



    const NOW = new Date();


    PLANETS.forEach(p => { p.pos = helioXY(p, NOW); });
    const EARTH_POS = PLANETS.find(p => p.name === 'Earth').pos;
    const MOON_POS = (() => {
      const d = (NOW - Date.UTC(2000, 0, 1, 12)) / 864e5;
      const lon = (218.316 + 13.176396 * d) * D2R;
      return [EARTH_POS[0] + 3.844e8 * Math.cos(lon), EARTH_POS[1] + 3.844e8 * Math.sin(lon)];
    })();
    const VOYAGER_POS = window.PbdVoyager.helioXY(NOW);

    // Pluto, by the same method (its 17° orbital tilt is flattened away).
    const PLUTO = { name: 'Pluto', a: 39.482, e: 0.2488, L: 238.929, dL: 145.2078, w: 224.069, r: 1.1883e6, color: '#d8c3a8' };
    PLUTO.pos = helioXY(PLUTO, NOW);
    const JUPITER = PLANETS.find(p => p.name === 'Jupiter');
    const planetOn = (name, y, m, d) => helioXY(PLANETS.find(p => p.name === name), Date.UTC(y, m - 1, d));

    // James Webb Space Telescope: loops around the Sun–Earth L2 point,
    // 1.5 million km straight out from Earth on the side away from the Sun.
    const JWST_POS = (() => {
      const d = Math.hypot(EARTH_POS[0], EARTH_POS[1]), k = 1 + 1.5e9 / d;
      return [EARTH_POS[0] * k, EARTH_POS[1] * k];
    })();


    // Nearby stars: real directions and distances.
    const STARS_NEAR = [
      ['Proxima Centauri', 217.43, -62.68, 4.24, '#ff8a66', true],
      ['Alpha Centauri',   219.90, -60.83, 4.37, '#fff1cf', true],
      ["Barnard's Star",   269.45,   4.69, 5.96, '#ff9a78', true],
      ['Wolf 359',         164.12,   7.01, 7.86, '#ff8a66'],
      ['Lalande 21185',    165.83,  35.97, 8.31, '#ffab80'],
      ['Sirius',           101.29, -16.72, 8.60, '#d4e2ff', true],
      ['Luyten 726-8',      24.76, -17.95, 8.79, '#ff8a66'],
      ['Ross 154',         282.46, -23.84, 9.70, '#ff8a66'],
      ['Epsilon Eridani',   53.23,  -9.46, 10.5, '#ffd9a0'],
      ['61 Cygni',         316.73,  38.75, 11.4, '#ffc68f'],
      ['Procyon',          114.83,   5.22, 11.5, '#fff4e4', true],
      ['Tau Ceti',          26.02, -15.94, 11.9, '#ffe9b8'],
      ['Epsilon Indi',     330.84, -56.79, 11.9, '#ffc68f'],
      ['Altair',           297.70,   8.87, 16.7, '#f2f5ff', true],
      ['Fomalhaut',        344.41, -29.62, 25.1, '#e8eeff'],
      ['Vega',             279.23,  38.78, 25.0, '#dde8ff', true],
      ['Pollux',           116.33,  28.03, 33.8, '#ffd08a'],
      ['Arcturus',         213.92,  19.18, 36.7, '#ffd08a', true],
      ['Capella',           79.17,  45.99, 42.9, '#fff0c0', true],
      ['Aldebaran',         68.98,  16.51, 65.3, '#ffad6b', true],
      ['Regulus',          152.09,  11.97, 79.3, '#d8e4ff'],
      ['Hyades',            66.75,  15.87, 153,  '#ffe0b0'],
      ['Spica',            201.30, -11.16, 250,  '#c8d8ff'],
      ['Canopus',           95.99, -52.70, 310,  '#f6f2ff', true],
      ['Polaris',           37.95,  89.26, 433,  '#fff3d8', true],
      ['Pleiades',          56.75,  24.12, 444,  '#bcd4ff', true],
      ['Betelgeuse',        88.79,   7.41, 550,  '#ff9a5c', true],
      ['Antares',          247.35, -26.43, 550,  '#ff7a50', true],
      ['Rigel',             78.63,  -8.20, 860,  '#cfe0ff', true],
      ['Orion Nebula',      83.82,  -5.39, 1344, '#ff9ec8', true],
      ['Deneb',            310.36,  45.28, 2600, '#e6eeff', true],
      ['Lagoon Nebula',    270.90, -24.38, 4100, '#ff8fb8'],
      ['Eagle Nebula',     274.70, -13.80, 5700, '#ff9ec0'],
      ['Crab Nebula',       83.63,  22.01, 6500, '#a8e0ff', true],
      ['Carina Nebula',    161.26, -59.87, 7500, '#ffa0c8'],
      ['Omega Centauri',   201.70, -47.48, 17090, '#ffe6b0', true],
      ['M13 star cluster', 250.42,  36.46, 22200, '#ffe6b0'],
    ].map(([name, ra, dec, ly, color, major]) => ({ name, color, major: !!major, ly, pos: skyXY(ra, dec, ly * LY) }));

    // Spacecraft leaving the solar system. Voyager 1 comes from the live model
    // above; the others from their sky direction, a recent distance and speed.
    const YEARS_SINCE_2025 = (NOW - Date.UTC(2025, 0, 1)) / 3.156e10;
    const probeAt = (ra, dec, au2025, auPerYr) => skyXY(ra, dec, (au2025 + auPerYr * YEARS_SINCE_2025) * AU);
    const VOYAGER2_POS = probeAt(301.0, -57.5, 138.5, 3.22);
    const PROBES = [
      { name: 'Voyager 2',            pos: VOYAGER2_POS },
      { name: 'New Horizons',         pos: probeAt(292.5, -20.2, 60.6, 2.89) },
      { name: 'Pioneer 10 (silent)',  pos: probeAt(78.3, 26.0, 136.5, 2.54) },
      { name: 'Pioneer 11 (silent)',  pos: probeAt(283.0, -8.5, 116.5, 2.36) },
    ];
    // Flight paths through the planet flybys, straightened between encounters.
    const SATURN_V1 = planetOn('Saturn', 1980, 11, 12);
    const V1_PHOTO_T = (Date.UTC(1990, 1, 14) - Date.UTC(1980, 10, 12)) / (NOW - Date.UTC(1980, 10, 12));
    const V1_PHOTO_POS = [SATURN_V1[0] + (VOYAGER_POS[0] - SATURN_V1[0]) * V1_PHOTO_T,
                          SATURN_V1[1] + (VOYAGER_POS[1] - SATURN_V1[1]) * V1_PHOTO_T];
    const V1_PATH = [planetOn('Earth', 1977, 9, 5), planetOn('Jupiter', 1979, 3, 5), SATURN_V1, V1_PHOTO_POS, VOYAGER_POS];
    const V2_PATH = [planetOn('Earth', 1977, 8, 20), planetOn('Jupiter', 1979, 7, 9), planetOn('Saturn', 1981, 8, 26),
                     planetOn('Uranus', 1986, 1, 24), planetOn('Neptune', 1989, 8, 25), VOYAGER2_POS];

    const HELIOPAUSE = helioShape(121, 1.6);
    const TERMINATION_SHOCK = helioShape(94, 0.8);

    // Galaxies and beyond. Sizes are diameters of the bright disk.
    const GALACTIC_CENTER = skyXY(266.42, -29.01, 26000 * LY);
    const MILKY_WAY_D = 100000 * LY;
    const GALAXIES = [
      { name: 'Large Magellanic Cloud', pos: skyXY(80.89, -69.76, 163000 * LY), d: 32000 * LY, ratio: 0.7, angle: 0.4, color: [200, 210, 255] },
      { name: 'Small Magellanic Cloud', pos: skyXY(13.19, -72.83, 200000 * LY), d: 19000 * LY, ratio: 0.6, angle: 1.1, color: [200, 210, 255] },
      { name: 'Sagittarius Dwarf', pos: skyXY(283.8, -30.5, 70000 * LY),  d: 10000 * LY, ratio: 0.4, angle: 1.2, color: [210, 205, 235], dwarf: true },
      { name: 'Leo I',             pos: skyXY(152.1, 12.3, 820000 * LY),  d: 2000 * LY,  ratio: 0.8, angle: 0,   color: [210, 205, 235], dwarf: true },
      { name: 'NGC 6822',          pos: skyXY(296.2, -14.8, 1.6e6 * LY),  d: 7000 * LY,  ratio: 0.7, angle: 0.3, color: [200, 210, 245], dwarf: true },
      { name: 'IC 1613',           pos: skyXY(16.2, 2.1, 2.4e6 * LY),     d: 12000 * LY, ratio: 0.9, angle: 0,   color: [200, 210, 245], dwarf: true },
      { name: 'WLM',               pos: skyXY(0.49, -15.46, 3.0e6 * LY),  d: 8000 * LY,  ratio: 0.4, angle: 1.4, color: [200, 210, 245], dwarf: true },
      { name: 'M32',               pos: skyXY(10.67, 40.87, 2.49e6 * LY), d: 6500 * LY,  ratio: 0.8, angle: 0,   color: [240, 220, 200], dwarf: true },
      { name: 'M110',              pos: skyXY(10.09, 41.69, 2.69e6 * LY), d: 17000 * LY, ratio: 0.5, angle: 0.9, color: [240, 220, 200], dwarf: true },
      { name: 'Andromeda',  pos: skyXY(10.68, 41.27, 2.5e6 * LY),  d: 150000 * LY, ratio: 0.32, angle: 0.66, color: [225, 210, 255], major: true },
      { name: 'Triangulum', pos: skyXY(23.46, 30.66, 2.73e6 * LY), d: 60000 * LY,  ratio: 0.7,  angle: 0.4,  color: [190, 210, 255] },
    ];
    const ANDROMEDA = GALAXIES.find(g => g.name === 'Andromeda');
    // The Local Group spans about 10 million light-years, centered between
    // the Milky Way and Andromeda (the two giants that hold it together).
    const LOCAL_GROUP = { pos: [(GALACTIC_CENTER[0] + ANDROMEDA.pos[0]) / 2, (GALACTIC_CENTER[1] + ANDROMEDA.pos[1]) / 2], r: 5e6 * LY };

    // Nearby galaxy groups and clusters: real directions and distances.
    // n is how many member dots to draw, roughly following richness.
    const CLUSTERS = [
      ['M81 Group',            148.9,  69.07, 11.7, 2.5, 10],
      ['Centaurus A Group',    201.4, -43.0,  12.0, 3,   12],
      ['Sculptor Group',        11.9, -25.3,  11.4, 3,   10],
      ['Virgo Cluster',        187.7,  12.4,  54,   15,  80, true],
      ['Fornax Cluster',        54.6, -35.5,  62,   6,   40],
      ['Hydra Cluster',        159.2, -27.5,  158,  10,  50],
      ['Centaurus Cluster',    192.2, -41.3,  170,  10,  55],
      ['Norma Cluster (Great Attractor)', 243.6, -60.9, 220, 12, 60, true],
      ['Perseus Cluster',       49.95, 41.5,  240,  15,  70],
      ['Coma Cluster',         194.95, 27.98, 321,  20,  100, true],
      ['Shapley Supercluster', 202.0, -31.0,  650,  90,  160, true],
    ].map(([name, ra, dec, mly, dMly, n, major]) => {
      const members = [];
      for (let i = 0; i < n; i++) {
        // Concentrated toward the middle, like real clusters.
        const rr = Math.pow(Math.random(), 1.6) * 0.5, a = Math.random() * Math.PI * 2;
        members.push([rr * Math.cos(a), rr * Math.sin(a), 0.6 + Math.random() * 0.8]);
      }
      return { name, major: !!major, dist: mly * 1e6 * LY, d: dMly * 1e6 * LY, pos: skyXY(ra, dec, mly * 1e6 * LY), members };
    });
    // Laniakea, our home supercluster: ~520 million light-years across, its
    // galaxies all flowing toward the Great Attractor. Outline simplified.
    const LANIAKEA = { pos: skyXY(243.6, -60.9, 200e6 * LY), r: 260e6 * LY };
    const OBSERVABLE_R = 46.5e9 * LY;     // radius of the observable universe (comoving)
    const WEB_TILE_M = 1.2e9 * LY;        // one tile of the cosmic-web texture

    // Milestones keyed to the real view width in meters. Intro stages first.
    const INTRO_STAGE_FILES = [
      ['Your Desk',         'scene-desk.svg',         1.5],
      ['Your Classroom',    'scene-classroom.svg',    10],
      ['Your School',       'scene-school.svg',       200],
      ['Your Neighborhood', 'scene-neighborhood.svg', 1500],
      ['Your Town',         'scene-town.svg',         8e3],
      ['Your City',         'scene-city.svg',         5e4],
      ['Example: New York State',        'scene-state.svg',        6e5],
      ['Example: United States',      'scene-country.svg',      4.5e6],
      ['Example: North America',    'scene-continent.svg',    9e6],
    ];
    const INTRO_END_M = 2e7;              // Earth from space takes over here
    const INTRO_END = metersToSlider(INTRO_END_M);
    const INTRO_FACTS = [
      'This is the exact spot the whole universe is about to zoom out from.',
      'Thirty desks like yours, in one room.',
      'Hundreds of desks like yours, under one roof.',
      'Your school is one building among thousands of homes.',
      'Everyone you\'ll meet this year lives somewhere inside this view.',
      'Tens of thousands of desks like yours are out there right now.',
      'Reference example: New York State and New York City, using real Natural Earth boundaries.',
      'Reference example: the United States, with New York highlighted. Alaska and Hawaii are shown as insets.',
      'Reference example: North America, with the United States highlighted. Natural Earth v5.1.2, 50m; public domain.',
    ];
    const MILESTONES = INTRO_STAGE_FILES.map(([label], i) => ({
      from: INTRO_STAGE_FILES[i][2],
      to: i + 1 < INTRO_STAGE_FILES.length ? INTRO_STAGE_FILES[i + 1][2] : INTRO_END_M,
      label,
      fact: INTRO_FACTS[i]
    })).concat([
      { from: 2e7, to: 2e9, label: 'Earth and the Moon',
        fact: 'The Moon is about 30 Earths away. Every person who ever lived is on the bigger dot.' },
      { from: 2e9, to: 1.2e12, label: 'The Inner Solar System',
        fact: 'Sunlight takes 8 minutes and 20 seconds to reach Earth.' },
      { from: 1.2e12, to: 9e12, label: 'The Outer Planets',
        fact: 'Neptune orbits 30 times farther from the Sun than Earth does. Every planet is now smaller than a pixel.' },
      { from: 9e12, to: 5e13, label: '📸 Voyager 1 — The Pale Blue Dot',
        fact: 'Voyager 1 took the photo from about 40 AU. Today it is past 170 AU, still flying outward.' },
      { from: 5e13, to: 5e16, label: 'Beyond the Planets',
        fact: 'The Oort Cloud of icy bodies may reach more than a light-year out. Voyager won\'t enter it for about 300 years.' },
      { from: 5e16, to: 3e18, label: 'The Nearest Stars',
        fact: 'Proxima Centauri is 4.2 light-years away. At Voyager\'s speed, the trip would take about 75,000 years.' },
      { from: 3e18, to: 1e22, label: 'The Milky Way',
        fact: 'The Sun is one of 100 to 400 billion stars here, about 26,000 light-years from the center.' },
      { from: 1e22, to: 8e23, label: 'The Local Group',
        fact: 'Andromeda is 2.5 million light-years away. The light we see from it left before modern humans existed.' },
      { from: 8e23, to: 3e24, label: 'Galaxy Clusters',
        fact: 'The Virgo Cluster holds more than a thousand galaxies, 54 million light-years away. Our Local Group sits on its outskirts.' },
      { from: 3e24, to: 3e26, label: 'The Cosmic Web',
        fact: 'Galaxies gather along thin threads around huge, nearly empty voids. The Milky Way is far too small to see.' },
      { from: 3e26, to: 1e28, label: 'The Observable Universe',
        fact: 'The universe is 13.8 billion years old, yet this sphere is 93 billion light-years across: space kept stretching while the oldest light travelled to us.' },
    ]);

    // The Pale Blue Dot moment, in view widths (meters).
    const PBD_ZONE = { flareIn: 3e12, flareFull: 9e12, flareHold: 6e13, flareOut: 2e14 };
    const SPEECH_RANGES = [
      { id: 'pbd-sl-1', from: 6e12,   to: 3e14 },
      { id: 'pbd-sl-2', from: 9e12,   to: 3e14 },
      { id: 'pbd-sl-3', from: 1.2e13, to: 3e14 },
      { id: 'pbd-sl-4', from: 1.6e13, to: 3e14 },
    ];

    // ── Decorative sky (only used while the real stars are far away) ──
    const STARS = [];
    for (let i = 0; i < 320; i++) {
      STARS.push({
        x: Math.random(),
        y: Math.random(),
        z: Math.random() * 4 + 1,
        r: Math.random() * 1.2 + 0.2,
        a: Math.random() * 0.6 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    // Oort Cloud: predicted shell from about 2,000 to 100,000 AU.
    const OORT = [];
    for (let i = 0; i < 1400; i++) {
      const r = Math.pow(10, Math.log10(2000) + Math.random() * (Math.log10(100000) - Math.log10(2000))) * AU;
      const t = Math.random() * Math.PI * 2;
      OORT.push([r * Math.cos(t), r * Math.sin(t), Math.random()]);
    }

    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    // Asteroid belt (2.1–3.3 AU) plus Jupiter's Trojans, which share its orbit
    // 60° ahead and behind. Each dot stands for many thousands of rocks.
    const ASTEROIDS = [];
    for (let i = 0; i < 2600; i++) {
      const a = 2.7 + gauss() * 0.45, r = a * (1 + gauss() * 0.08) * AU, t = Math.random() * Math.PI * 2;
      ASTEROIDS.push([r * Math.cos(t), r * Math.sin(t), Math.random()]);
    }
    const jupLon = Math.atan2(JUPITER.pos[1], JUPITER.pos[0]);
    for (let i = 0; i < 700; i++) {
      const side = i % 2 ? 1 : -1;
      const t = jupLon + side * Math.PI / 3 + gauss() * 0.32, r = (5.2 + gauss() * 0.3) * AU;
      ASTEROIDS.push([r * Math.cos(t), r * Math.sin(t), Math.random()]);
    }
    // Kuiper Belt: the classical belt (42–48 AU), Pluto-like orbits (~39 AU
    // average but stretched), and a thin scattered disk reaching ~100 AU.
    const KUIPER = [];
    for (let i = 0; i < 2200; i++) {
      const kind = Math.random();
      const au = kind < 0.6 ? 44 + gauss() * 3.2
        : kind < 0.82 ? 39.4 * (1 + gauss() * 0.22)
        : 32 + Math.pow(Math.random(), 2) * 70;
      const t = Math.random() * Math.PI * 2;
      KUIPER.push([au * AU * Math.cos(t), au * AU * Math.sin(t), Math.random()]);
    }

    // Hot and cold spots in the cosmic microwave background around the edge.
    const CMB_SPOTS = [];
    for (let i = 0; i < 900; i++) {
      const hot = Math.random() < 0.5;
      CMB_SPOTS.push({ a: Math.random() * Math.PI * 2, r: 0.962 + Math.random() * 0.034, s: 0.004 + Math.random() * 0.01,
        c: hot ? (Math.random() < 0.5 ? '255,120,70' : '255,170,90') : '100,130,255', o: [0.08, 0.13, 0.18][Math.floor(Math.random() * 3)] });
    }
    // One fill per color and brightness.
    const CMB_GROUPS = [];
    CMB_SPOTS.forEach(sp => {
      let g = CMB_GROUPS.find(q => q.c === sp.c && q.o === sp.o);
      if (!g) CMB_GROUPS.push(g = { c: sp.c, o: sp.o, spots: [] });
      g.spots.push(sp);
    });

    // Offscreen art for the galaxy and the cosmic web, built once on demand.
    let galaxyArt = null, webArt = null;
    // Artist's map of the Milky Way as seen from the north galactic pole,
    // which (like this flattened view) shows it turning clockwise, so the
    // arms trail. Built on measured features: a central bar tilted ~40° to the
    // Sun–center line, two major arms (Perseus, Scutum–Centaurus) leaving the
    // bar's ends, two minor ones, and the Sun on the small Orion Spur between
    // the Sagittarius and Perseus arms, 26,000 ly out.
    // Art space: MW_ART_N px = 100,000 ly, the Sun straight below the center.
    const MW_ART_N = 2048;
    const MW_K = 1 / Math.tan(13 * D2R);           // winding of a 13° log spiral
    const MW_BAR = Math.PI / 2 + 0.7;               // bar axis, near end toward the Sun's side
    const MW_ARMS = [
      // rSun: thousand ly where the arm crosses the Sun–center line
      { name: 'Perseus Arm',            rSun: 30,   major: true,  from: 11.5, to: 52, labelAt: 34 },
      { name: 'Scutum–Centaurus Arm',   rSun: 13.5, major: true,  from: 11.5, to: 52, labelAt: 16 },
      { name: 'Sagittarius–Carina Arm', rSun: 20,   major: false, from: 13,   to: 48, labelAt: 18.5 },
      { name: 'Norma–Outer Arm',        rSun: 9.5,  major: false, from: 9,    to: 50, labelAt: 42 },
      { name: 'Orion Spur',             rSun: 26,   spur: true,   from: 22.5, to: 29.5 },
    ];
    function mwArmXY(arm, rK, offK) { // thousand ly along the arm (+ radial offset) → art px
      const theta = Math.PI / 2 - MW_K * Math.log(rK / arm.rSun);
      const px = (rK + (offK || 0)) / 100 * MW_ART_N;
      return [MW_ART_N / 2 + px * Math.cos(theta), MW_ART_N / 2 + px * Math.sin(theta)];
    }
    function getGalaxyArt() {
      if (galaxyArt) return galaxyArt;
      const N = MW_ART_N, c = document.createElement('canvas');
      c.width = c.height = N;
      const g = c.getContext('2d'), m = N / 2, kpx = N / 100; // px per thousand ly
      function glowDot(x, y, r, rgb, a) {
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(${rgb},${a})`);
        gr.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = gr;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // Faint disk light: old stars between the arms.
      const disk = g.createRadialGradient(m, m, 0, m, m, m);
      disk.addColorStop(0,    'rgba(255,226,185,0.55)');
      disk.addColorStop(0.12, 'rgba(245,218,190,0.24)');
      disk.addColorStop(0.4,  'rgba(190,200,240,0.08)');
      disk.addColorStop(1,    'rgba(160,180,240,0)');
      g.fillStyle = disk;
      g.fillRect(0, 0, N, N);
      g.fillStyle = 'rgba(255,235,210,0.2)';
      for (let i = 0; i < 45000; i++) {
        const rr = Math.min(-Math.log(Math.random()) * 11 * kpx, m * 0.98), t = Math.random() * Math.PI * 2;
        g.fillRect(m + rr * Math.cos(t), m + rr * Math.sin(t), 1.5, 1.5);
      }
      // The central bar and the bulge, full of old yellow stars.
      g.save();
      g.translate(m, m);
      g.rotate(MW_BAR);
      g.scale(1, 0.36);
      const bar = g.createRadialGradient(0, 0, 0, 0, 0, 12.5 * kpx);
      bar.addColorStop(0, 'rgba(255,232,170,0.95)');
      bar.addColorStop(0.55, 'rgba(255,205,140,0.4)');
      bar.addColorStop(1, 'rgba(255,190,130,0)');
      g.fillStyle = bar;
      g.fillRect(-13 * kpx, -13 * kpx, 26 * kpx, 26 * kpx);
      g.restore();
      glowDot(m, m, 4.5 * kpx, '255,240,205', 0.9);

      // The arms: stars scattered around each log spiral, widening outward.
      const BUCKETS = [['205,218,255', 0.42, 1.6, 0.6], ['245,238,255', 0.36, 1.6, 0.3], ['165,198,255', 0.85, 2.2, 0.1]];
      MW_ARMS.forEach(arm => {
        const n = arm.spur ? 6000 : arm.major ? 32000 : 20000;
        const width = k => (arm.spur ? 0.55 : arm.major ? 1.1 : 0.85) + 0.03 * k;
        // Radius along the arm, thinned out near both ends so arms taper off.
        const pick = () => {
          for (;;) {
            const k = arm.from + (arm.to - arm.from) * Math.pow(Math.random(), arm.spur ? 1 : 1.25);
            const taper = Math.min(1, (k - arm.from) / (arm.spur ? 2 : 3), (arm.to - k) / (arm.spur ? 2 : 9));
            if (Math.random() < taper) return k;
          }
        };
        BUCKETS.forEach(([rgb, a, size, frac]) => {
          g.fillStyle = `rgba(${rgb},${arm.spur ? a * 0.7 : a})`;
          for (let i = 0; i < n * frac; i++) {
            const k = pick(), [x, y] = mwArmXY(arm, k, gauss() * width(k));
            g.fillRect(x, y, size, size);
          }
        });
        // Dust lanes along the inner edge of each arm.
        g.globalCompositeOperation = 'destination-out';
        g.fillStyle = 'rgba(0,0,0,0.13)';
        for (let i = 0; i < (arm.spur ? 600 : 5500); i++) {
          const k = pick(), [x, y] = mwArmXY(arm, k, -0.75 * width(k) + gauss() * 0.3);
          const s = 2 + Math.random() * 4;
          g.fillRect(x - s / 2, y - s / 2, s, s);
        }
        g.globalCompositeOperation = 'source-over';
        // Pink star-forming nebulae and blue newborn clusters on the arm crest.
        for (let i = 0; i < (arm.spur ? 25 : arm.major ? 170 : 110); i++) {
          const k = pick(), [x, y] = mwArmXY(arm, k, gauss() * 0.4 * width(k));
          if (Math.random() < 0.55) glowDot(x, y, 3 + Math.random() * 5, '255,110,170', 0.5);
          else glowDot(x, y, 2 + Math.random() * 3, '190,215,255', 0.85);
        }
      });
      // Sagittarius A*: the black hole at the very center.
      glowDot(m, m, 6, '255,255,245', 1);
      galaxyArt = c;
      return c;
    }
    // Art-space point → canvas, for a galaxy drawn at (gx, gy), mwPx wide, turned by rot.
    function mwToCanvas(pt, gx, gy, mwPx, rot) {
      const k = mwPx / MW_ART_N, vx = (pt[0] - MW_ART_N / 2) * k, vy = (pt[1] - MW_ART_N / 2) * k;
      return [gx + vx * Math.cos(rot) - vy * Math.sin(rot), gy + vx * Math.sin(rot) + vy * Math.cos(rot)];
    }
    function getWebArt() {
      if (webArt) return webArt;
      // Built in 512-unit space, drawn at 4× resolution so it stays crisp when
      // the tile is magnified at the near end of its zoom range.
      const N = 512, K = 4, c = document.createElement('canvas');
      c.width = c.height = N * K;
      const g = c.getContext('2d');
      const seeds = [];
      for (let i = 0; i < 40; i++) seeds.push([Math.random() * N, Math.random() * N]);
      const wrapD = (a, b) => { const d = Math.abs(a - b); return Math.min(d, N - d); };
      for (let i = 0; i < 260000; i++) {
        const x = Math.random() * N, y = Math.random() * N;
        let d1 = Infinity, d2 = Infinity, d3 = Infinity;
        for (const s of seeds) {
          const d = Math.hypot(wrapD(x, s[0]), wrapD(y, s[1]));
          if (d < d1) { d3 = d2; d2 = d1; d1 = d; } else if (d < d2) { d3 = d2; d2 = d; } else if (d < d3) d3 = d;
        }
        const edge = d2 - d1; // 0 on a wall between two voids
        if (d3 - d1 < 4.5) {
          // Where three voids meet, filaments cross: dense knots, the galaxy clusters.
          g.fillStyle = d3 - d1 < 2 ? 'rgba(255,240,225,0.95)' : 'rgba(235,220,255,0.8)';
          g.fillRect(x * K, y * K, 3, 3);
        } else if (edge < 2.2 || (edge < 6 && Math.random() < 0.08)) {
          g.fillStyle = edge < 1 ? 'rgba(220,210,255,0.9)' : 'rgba(170,170,255,0.5)';
          g.fillRect(x * K, y * K, 2.2, 2.2);
        } else if (Math.random() < 0.004) {
          g.fillStyle = 'rgba(160,160,240,0.45)'; // a few lone galaxies inside the voids
          g.fillRect(x * K, y * K, 2, 2);
        }
      }
      webArt = c;
      return c;
    }

    // ══════════════════════════════════════════════════════════════
    // Intro sequence: desk → classroom → school → neighborhood → town
    // → city → state → country → continent → Earth from space.
    // Each stage is a hand-authored SVG illustration (assets/images/
    // pale-blue-dot/), shown while the view width is in that stage's range.
    // ══════════════════════════════════════════════════════════════
    function withZoom(ctx, W, H, scale, fn) {
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(scale, scale);
      ctx.translate(-W / 2, -H / 2);
      fn();
      ctx.restore();
    }

    const INTRO_STAGES = INTRO_STAGE_FILES.map(([name, file, width]) => {
      const img = new Image();
      img.src = `../../assets/images/pale-blue-dot/${file}`;
      return { name, img, width, bg: '#0a0e18' };
    });

    function drawIntroScene(ctx, W, H, viewM) {
      const n = INTRO_STAGES.length;
      let idx = 0;
      while (idx < n - 1 && viewM >= INTRO_STAGES[idx + 1].width) idx++;
      const lo = INTRO_STAGES[idx].width;
      const hi = idx + 1 < n ? INTRO_STAGES[idx + 1].width : INTRO_END_M;
      const f = fade(viewM, lo, hi);
      const stage = INTRO_STAGES[idx];

      ctx.fillStyle = stage.bg;
      ctx.fillRect(0, 0, W, H);
      const zoomScale = 1.5 - 0.5 * f;
      if (stage.img.complete && stage.img.naturalWidth) {
        withZoom(ctx, W, H, zoomScale, () => ctx.drawImage(stage.img, 0, 0, W, H));
      }

      if (f > 0.7 && idx < n - 1) {
        const next = INTRO_STAGES[idx + 1];
        const t = (f - 0.7) / 0.3;
        if (next.img.complete && next.img.naturalWidth) {
          ctx.save();
          ctx.globalAlpha = t;
          withZoom(ctx, W, H, 1.5, () => ctx.drawImage(next.img, 0, 0, W, H));
          ctx.restore();
        }
      }

      // "You are here" marker — shrinks continuously across the whole intro,
      // the same physical point the entire zoom-out pivots around.
      const sNorm = fade(viewM, 1.5, INTRO_END_M);
      const r = 13 - sNorm * 10;
      const cx = W / 2, cy = H / 2;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.4);
      glow.addColorStop(0, 'rgba(255,214,120,0.5)');
      glow.addColorStop(1, 'rgba(255,214,120,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, r * 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,224,150,0.95)';
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.5, r), 0, Math.PI * 2); ctx.fill();
    }

    // The 3D overlay only draws Earth, Moon and planets when they are really
    // big enough on screen; effects config is looked up by name.
    const OBJECTS = [
      { name: 'Earth',   effects: { atmosphere: true, haloColor: 0x6fa8ff, haloOpacity: 0.28 } },
      { name: 'Moon',    effects: {} },
      { name: 'Venus',   effects: { glow: true, haloColor: 0xffc980, haloOpacity: 0.16 } },
      { name: 'Sun',     effects: { glow: true, corona: true, haloColor: 0xffdd72, haloOpacity: 0.55, particleCount: 96, particleSize: 0.12 } },
      { name: 'Jupiter', effects: { glow: true, haloColor: 0xf6c48c, haloOpacity: 0.12 } },
      { name: 'Saturn',  effects: { atmosphere: true, rings: true, haloColor: 0xf8e7b2, haloOpacity: 0.18 } },
      { name: 'Uranus',  effects: { atmosphere: true, haloColor: 0x8fdfff, haloOpacity: 0.15 } },
      { name: 'Neptune', effects: { atmosphere: true, haloColor: 0x6b8dff, haloOpacity: 0.16 } },
    ];

    const MODEL_CONFIGS = {
      Earth:   { path: '../../assets/models/earth.glb',        spin: 0.0048, minPx: 34, maxPx: 900, showAbovePx: 18, hideAbovePx: 900, fit: 1.8 },
      Moon:    { path: '../../assets/models/the_moon.glb',     spin: 0.0026, minPx: 28, maxPx: 150, showAbovePx: 14, hideAbovePx: 170, fit: 1.75 },
      Venus:   { path: '../../assets/models/venus.glb',        spin: 0.0038, minPx: 32, maxPx: 180, showAbovePx: 14, hideAbovePx: 220, fit: 1.8 },
      Sun:     { path: '../../assets/models/sun.glb',          spin: 0.0022, minPx: 40, maxPx: 230, showAbovePx: 20, hideAbovePx: 260, fit: 1.85 },
      Jupiter: { path: '../../assets/models/jupiter.glb',      spin: 0.0035, minPx: 38, maxPx: 210, showAbovePx: 16, hideAbovePx: 240, fit: 1.8 },
      Saturn:  { path: '../../assets/models/saturno_v1.1.glb', spin: 0.0024, minPx: 60, maxPx: 280, showAbovePx: 20, hideAbovePx: 280, fit: 2.1, displayScale: 1.85, tiltX: 0.35, tiltZ: -0.18 },
      Uranus:  { path: '../../assets/models/uranus.glb',       spin: 0.0031, minPx: 34, maxPx: 180, showAbovePx: 14, hideAbovePx: 220, fit: 1.8 },
      Neptune: { path: '../../assets/models/neptune.glb',      spin: 0.0032, minPx: 34, maxPx: 180, showAbovePx: 14, hideAbovePx: 220, fit: 1.8 }
    };

    let modelSystem = null;

    function createPbdEffectsSystem(THREE) {
      const spriteCache = new Map();

      function getSpriteTexture(key, stops) {
        if (spriteCache.has(key)) return spriteCache.get(key);
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        stops.forEach(stop => grad.addColorStop(stop.offset, stop.color));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        spriteCache.set(key, texture);
        return texture;
      }

      function getRingTexture() {
        return getSpriteTexture('saturn-ring', [
          { offset: 0, color: 'rgba(255,255,255,0)' },
          { offset: 0.18, color: 'rgba(236,226,191,0.12)' },
          { offset: 0.34, color: 'rgba(246,237,210,0.82)' },
          { offset: 0.52, color: 'rgba(214,198,148,0.42)' },
          { offset: 0.74, color: 'rgba(246,237,210,0.78)' },
          { offset: 1, color: 'rgba(255,255,255,0)' }
        ]);
      }

      function createHaloSprite(color, opacity, scale) {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: getSpriteTexture(`halo-${color}-${opacity}`, [
            { offset: 0, color: 'rgba(255,255,255,0.95)' },
            { offset: 0.45, color: 'rgba(255,255,255,0.28)' },
            { offset: 1, color: 'rgba(255,255,255,0)' }
          ]),
          color,
          transparent: true,
          opacity,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        }));
        sprite.scale.setScalar(scale);
        return sprite;
      }

      function createAtmosphereShell(color, opacity) {
        return new THREE.Mesh(
          new THREE.SphereGeometry(1.06, 32, 32),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
          })
        );
      }

      function createRingMesh() {
        return new THREE.Mesh(
          new THREE.RingGeometry(1.32, 2.05, 96),
          new THREE.MeshBasicMaterial({
            map: getRingTexture(),
            color: 0xe8d9a8,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
            depthWrite: false
          })
        );
      }

      function createParticleField(count, size, color, spread, mode) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          const angle = Math.random() * Math.PI * 2;
          const radial = mode === 'trail'
            ? (0.8 + Math.random() * spread * 0.5)
            : (0.95 + Math.random() * spread);
          const ySpread = mode === 'trail'
            ? (Math.random() - 0.5) * 0.26
            : (Math.random() - 0.5) * spread;
          positions[i3] = Math.cos(angle) * radial;
          positions[i3 + 1] = ySpread;
          positions[i3 + 2] = Math.sin(angle) * radial * (mode === 'trail' ? 0.45 : 1);
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
          size,
          color,
          transparent: true,
          opacity: mode === 'trail' ? 0.28 : 0.42,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          sizeAttenuation: true
        });
        return new THREE.Points(geometry, material);
      }

      function buildEffects(name, effects = {}) {
        const group = new THREE.Group();
        const parts = {};
        const haloColor = effects.haloColor || 0xffffff;
        const haloOpacity = effects.haloOpacity == null ? 0.2 : effects.haloOpacity;

        if (effects.glow) {
          parts.glow = createHaloSprite(haloColor, haloOpacity, 3.2);
          group.add(parts.glow);
        }
        if (effects.atmosphere) {
          parts.atmosphere = createAtmosphereShell(haloColor, Math.min(haloOpacity + 0.08, 0.45));
          group.add(parts.atmosphere);
        }
        if (effects.corona) {
          parts.corona = createParticleField(effects.particleCount || 72, effects.particleSize || 0.09, haloColor, 0.9, 'corona');
          group.add(parts.corona);
        }
        if (effects.rings) {
          parts.rings = createRingMesh();
          parts.rings.rotation.x = Math.PI * 0.5;
          group.add(parts.rings);
        }
        if (effects.dustTrail) {
          parts.dustTrail = createParticleField(effects.particleCount || 40, effects.particleSize || 0.045, haloColor, 1.1, 'trail');
          parts.dustTrail.rotation.z = Math.PI * 0.2;
          group.add(parts.dustTrail);
        }

        group.visible = false;
        return { name, group, parts };
      }

      return {
        create(name, effects) {
          return buildEffects(name, effects);
        },
        sync(instance, layout, zoomLevel) {
          if (!instance) return;
          const visible = !!(layout && layout.visible && layout.effectVisible);
          instance.group.visible = visible;
          if (!visible) return;

          const zoomFactor = THREE.MathUtils.clamp((zoomLevel - 10) / 50, 0.2, 1.25);
          if (instance.parts.glow) {
            const glowScale = 2.4 + zoomFactor * 1.2;
            instance.parts.glow.scale.set(glowScale, glowScale, 1);
            instance.parts.glow.material.opacity = layout.haloOpacity;
          }
          if (instance.parts.atmosphere) {
            instance.parts.atmosphere.material.opacity = Math.min(layout.haloOpacity + 0.08, 0.42);
          }
          if (instance.parts.corona) {
            instance.parts.corona.rotation.y += 0.0025;
            instance.parts.corona.material.opacity = Math.min(0.5, 0.18 + zoomFactor * 0.22);
            instance.parts.corona.material.size = layout.particleSize;
          }
          if (instance.parts.dustTrail) {
            instance.parts.dustTrail.position.x = -0.7;
            instance.parts.dustTrail.rotation.y += 0.0015;
            instance.parts.dustTrail.material.opacity = Math.min(0.28, 0.08 + zoomFactor * 0.12);
            instance.parts.dustTrail.material.size = Math.max(0.02, layout.particleSize * 0.55);
          }
          if (instance.parts.rings) {
            instance.parts.rings.material.opacity = Math.min(0.92, 0.5 + zoomFactor * 0.25);
          }
        }
      };
    }

    function createPbdModelSystem(THREE, GLTFLoader, MeshoptDecoder) {
      if (!modelLayer) return null;

      const probeCanvas = document.createElement('canvas');
      const probeOptions = { alpha: true, antialias: true, powerPreference: 'low-power' };
      const probeContext = probeCanvas.getContext('webgl2', probeOptions) || probeCanvas.getContext('webgl', probeOptions);
      if (!probeContext) {
        console.warn('Pale Blue Dot 3D overlay skipped: WebGL unavailable.');
        return null;
      }

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: 'low-power'
        });
      } catch (err) {
        console.warn('Pale Blue Dot 3D overlay unavailable:', err);
        return null;
      }

      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.autoClear = false;
      modelLayer.innerHTML = '';
      modelLayer.appendChild(renderer.domElement);

      const loader = new GLTFLoader();
      if (MeshoptDecoder) loader.setMeshoptDecoder(MeshoptDecoder);
      const effectsSystem = createPbdEffectsSystem(THREE);
      const viewers = new Map();
      const activeLayouts = new Map();
      const objectLookup = new Map(OBJECTS.map(obj => [obj.name, obj]));
      const tempBox = new THREE.Box3();
      const tempSize = new THREE.Vector3();
      const tempCenter = new THREE.Vector3();
      let layerW = 0;
      let layerH = 0;
      let lastZoomLevel = parseFloat(slider.value);
      let interactionBoosted = false;

      const requestIdle = window.requestIdleCallback || function (cb) {
        return window.setTimeout(() => cb({
          didTimeout: false,
          timeRemaining() { return 16; }
        }), 32);
      };

      function configureMaterials(root) {
        root.traverse(node => {
          if (!node.isMesh) return;
          node.castShadow = false;
          node.receiveShadow = false;
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach(material => {
            if (!material) return;
            if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
            material.needsUpdate = true;
          });
        });
      }

      function normalizeModel(holder, cfg) {
        tempBox.setFromObject(holder);
        tempBox.getSize(tempSize);
        tempBox.getCenter(tempCenter);
        const maxDim = Math.max(tempSize.x, tempSize.y, tempSize.z) || 1;
        const fit = cfg.fit || 1.8;
        holder.position.sub(tempCenter);
        holder.scale.setScalar(fit / maxDim);
        tempBox.setFromObject(holder);
        tempBox.getCenter(tempCenter);
        holder.position.sub(tempCenter);
      }

      function normalizeEffects(fxGroup) {
        tempBox.setFromObject(fxGroup);
        if (tempBox.isEmpty()) return;
        tempBox.getCenter(tempCenter);
        fxGroup.position.sub(tempCenter);
      }

      function createViewer(name, cfg) {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
        camera.position.set(0, 0, 4.2);

        const ambient = new THREE.AmbientLight(0xffffff, 1.75);
        const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x0c1327, 1.1);
        const key = new THREE.DirectionalLight(0xffffff, 1.8);
        const rim = new THREE.DirectionalLight(0x7aa8ff, 0.55);
        key.position.set(2.5, 2, 4);
        rim.position.set(-3, 1.5, -2.5);

        scene.add(ambient, hemi, key, rim);

        const pose = new THREE.Group();
        pose.rotation.x = cfg.tiltX || 0.18;
        pose.rotation.z = cfg.tiltZ || -0.08;
        const spinGroup = new THREE.Group();
        const modelRoot = new THREE.Group();
        const fxGroup = new THREE.Group();
        pose.add(spinGroup);
        spinGroup.add(modelRoot);
        spinGroup.add(fxGroup);
        scene.add(pose);

        const objectConfig = objectLookup.get(name) || {};
        const fxConfig = objectConfig.effects || {};

        const viewer = {
          scene,
          camera,
          pose,
          spinGroup,
          modelRoot,
          fxGroup,
          spin: cfg.spin || 0.003,
          effects: null,
          effectsReady: false,
          loading: false,
          ready: false,
          failed: false
        };

        function ensureEffects() {
          if (viewer.effectsReady) return;
          if (!fxConfig || !Object.keys(fxConfig).length) {
            viewer.effectsReady = true;
            return;
          }
          viewer.effects = effectsSystem.create(name, fxConfig);
          fxGroup.add(viewer.effects.group);
          fxGroup.scale.copy(modelRoot.scale);
          normalizeEffects(fxGroup);
          viewer.effectsReady = true;
        }

        function loadModel() {
          if (viewer.loading || viewer.ready || viewer.failed) return;
          viewer.loading = true;
          loader.load(cfg.path, gltf => {
            const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
            if (!root) {
              viewer.loading = false;
              return;
            }
            configureMaterials(root);
            root.updateMatrixWorld(true);
            modelRoot.add(root);
            normalizeModel(modelRoot, cfg);
            ensureEffects();
            viewer.ready = true;
            viewer.loading = false;
        }, undefined, err => {
          viewer.failed = true;
          viewer.loading = false;
          console.warn('Pale Blue Dot model failed to load:', name, err);
        });
        }

        viewer.ensureEffects = ensureEffects;
        viewer.load = loadModel;
        viewers.set(name, viewer);
      }

      Object.keys(MODEL_CONFIGS).forEach(name => createViewer(name, MODEL_CONFIGS[name]));

      const priorityLoads = ['Earth', 'Sun', 'Moon', 'Jupiter', 'Saturn'];
      priorityLoads.forEach(name => {
        const viewer = viewers.get(name);
        if (viewer) viewer.load();
      });

      requestIdle(() => {
        Object.keys(MODEL_CONFIGS).forEach(name => {
          if (priorityLoads.includes(name)) return;
          const viewer = viewers.get(name);
          if (viewer) viewer.load();
        });
      });

      return {
        noteInteraction() {
          if (interactionBoosted) return;
          interactionBoosted = true;
          Object.keys(MODEL_CONFIGS).forEach(name => {
            const viewer = viewers.get(name);
            if (!viewer || priorityLoads.includes(name)) return;
            viewer.load();
          });
        },
        isReady(name) {
          const viewer = viewers.get(name);
          return !!(viewer && viewer.ready && !viewer.failed);
        },
        resize(width, height) {
          layerW = width;
          layerH = height;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          renderer.setSize(layerW, layerH, false);
        },
        sync(layouts, zoomLevel) {
          lastZoomLevel = zoomLevel;
          activeLayouts.clear();
          layouts.forEach(layout => {
            const viewer = viewers.get(layout.name);
            if (!viewer || viewer.failed) return;
            if (layout.visible && (layout.priority || interactionBoosted)) viewer.load();
            if (layout.effectVisible) viewer.ensureEffects();
            if (!viewer.ready || !layout.visible) return;
            activeLayouts.set(layout.name, layout);
          });
        },
        render() {
          if (!layerW || !layerH) return;
          renderer.clear();
          renderer.setScissorTest(true);

          activeLayouts.forEach((layout, name) => {
            const viewer = viewers.get(name);
            if (!viewer || !viewer.ready || viewer.failed) return;
            viewer.spinGroup.rotation.y += viewer.spin;
            effectsSystem.sync(viewer.effects, layout, lastZoomLevel);
            const size = Math.max(1, Math.round(layout.size));
            const left = Math.round(layout.x - size / 2);
            const bottom = Math.round(layerH - (layout.y + size / 2));
            renderer.setViewport(left, bottom, size, size);
            renderer.setScissor(left, bottom, size, size);
            renderer.clearDepth();
            renderer.render(viewer.scene, viewer.camera);
          });

          renderer.setScissorTest(false);
        }
      };
    }

    window.__attachPbdModelSystem = function (THREE, GLTFLoader, MeshoptDecoder) {
      modelSystem = createPbdModelSystem(THREE, GLTFLoader, MeshoptDecoder);
      if (modelSystem) {
        modelSystem.resize(W || wrap.clientWidth, H || Math.max(Math.round(wrap.clientWidth * 0.52), 320));
        draw();
      }
    };

    let W, H;
    let journeyFrame = null;
    let journeyActive = false;
    // Leg 1: desk → the Pale Blue Dot (view ~120 AU wide), slowing to a crawl.
    // Leg 2 (the next press): onward to the edge of the observable universe.
    const LEG1_END = metersToSlider(1.8e13);
    const LEG1_DURATION = 35000;
    const LEG2_DURATION = 30000;

    function journeyLabel() {
      return parseFloat(slider.value) >= LEG1_END - 0.5 && parseFloat(slider.value) < 99.5
        ? 'Continue to the Edge of the Universe'
        : 'Start Journey';
    }

    function setJourneyState(active) {
      journeyActive = active;
      if (!journeyBtn) return;
      journeyBtn.classList.toggle('is-running', active);
      journeyBtn.textContent = active ? 'Journey In Progress…' : journeyLabel();
    }

    function stopJourney() {
      if (journeyFrame) {
        cancelAnimationFrame(journeyFrame);
        journeyFrame = null;
      }
      setJourneyState(false);
    }

    function startJourney() {
      stopJourney();
      const leg2 = journeyLabel() !== 'Start Journey';
      const from = leg2 ? parseFloat(slider.value) : 0;
      const to = leg2 ? 100 : LEG1_END;
      const duration = leg2 ? LEG2_DURATION : LEG1_DURATION;
      setJourneyState(true);
      slider.value = from;
      const start = performance.now();

      // Leg 1: steady through the human scales and planets, then a long slow
      // drift into the Pale Blue Dot so the speech has time to land.
      function ease1(t) {
        if (t < 0.7) {
          const s = t / 0.7;
          return (s < 0.5 ? 2 * s * s : -1 + (4 - 2 * s) * s) * 0.86;
        }
        return 0.86 + ((t - 0.7) / 0.3) * 0.14;
      }
      function ease2(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

      function step(now) {
        const progress = Math.min(1, (now - start) / duration);
        const fraction = leg2 ? ease2(progress) : ease1(progress);
        slider.value = (from + (to - from) * fraction).toFixed(2);
        draw();
        if (progress < 1) {
          journeyFrame = requestAnimationFrame(step);
        } else {
          journeyFrame = null;
          setJourneyState(false);
        }
      }

      journeyFrame = requestAnimationFrame(step);
    }

    function noteManualInteraction() {
      if (modelSystem && modelSystem.noteInteraction) modelSystem.noteInteraction();
      if (journeyActive) stopJourney();
    }

    function resize() {
      W = wrap.clientWidth;
      H = Math.round(W * 0.52);
      H = Math.max(H, 320);
      canvas.width  = W;
      canvas.height = H;
      if (modelSystem) modelSystem.resize(W, H);
      draw();
    }


    // Many tiny dots around the Sun (belts, Oort Cloud), batched into four
    // brightness levels so each level is one fill.
    function dotField(ctx, points, ox, oy, scale, alpha, rgb, size, lo, hi) {
      if (alpha <= 0.01) return;
      const W2 = ctx.canvas.width, H2 = ctx.canvas.height;
      for (let lvl = 0; lvl < 4; lvl++) {
        ctx.beginPath();
        points.forEach(([x, y, b]) => {
          if (Math.min(3, Math.floor(b * 4)) !== lvl) return;
          const px = ox + x * scale, py = oy - y * scale;
          if (px < -2 || px > W2 + 2 || py < -2 || py > H2 + 2) return;
          ctx.rect(px - size / 2, py - size / 2, size, size);
        });
        ctx.fillStyle = `rgba(${rgb},${(lo + (hi - lo) * (lvl + 0.5) / 4) * alpha})`;
        ctx.fill();
      }
    }
    // Soft round glow per star color, drawn once and reused.
    const glowSprites = new Map();
    function glowSprite(color) {
      if (glowSprites.has(color)) return glowSprites.get(color);
      const c = document.createElement('canvas');
      c.width = c.height = 20;
      const g = c.getContext('2d'), gr = g.createRadialGradient(10, 10, 0, 10, 10, 10);
      gr.addColorStop(0, color);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 20, 20);
      glowSprites.set(color, c);
      return c;
    }

    let frame = 0;
    function draw() {
      if (!W || !H) return; // not laid out yet
      const ctx = canvas.getContext('2d');
      const s   = parseFloat(slider.value);
      const viewM = sliderToMeters(s); // meters across canvas width

      frame++;

      const scale = W / viewM; // px per meter
      const cx0 = W / 2, cy0 = H / 2;
      // Heliocentric position (meters, in the plane of Earth's orbit) → canvas.
      // The view is always centered on Earth.
      const toX = p => cx0 + (p[0] - EARTH_POS[0]) * scale;
      const toY = p => cy0 - (p[1] - EARTH_POS[1]) * scale;
      const onCanvas = (x, y, pad) => x > -pad && x < W + pad && y > -pad && y < H + pad;
      const modelLayouts = [];
      const notes = new Set();
      let earthBoost = 0;

      // Label placement that skips anything that would overlap a placed label.
      const placed = [];
      function label(text, x, y, alpha, color) {
        if (alpha <= 0.02) return;
        ctx.font = '12px -apple-system, sans-serif';
        const w = ctx.measureText(text).width;
        const box = [x - w / 2 - 3, y - 12, x + w / 2 + 3, y + 3];
        if (box[0] < 2 || box[2] > W - 2 || box[1] < 2 || box[3] > H - 40) return;
        if (placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) return;
        placed.push(box);
        ctx.fillStyle = color || `rgba(185,210,255,${alpha})`;
        ctx.globalAlpha = color ? alpha : 1;
        ctx.textAlign = 'center';
        ctx.fillText(text, x, y);
        ctx.globalAlpha = 1;
      }
      // Bodies smaller than a pixel are drawn as a minimum-size dot; note it.
      function dot(x, y, trueR, color, minR) {
        const r = trueR * scale;
        const drawR = Math.max(r, minR || 1.5);
        if (drawR > r * 1.5) notes.add('dots');
        ctx.beginPath();
        ctx.arc(x, y, drawR, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        return r;
      }

      if (viewM < INTRO_END_M) {
        drawIntroScene(ctx, W, H, viewM);
        if (modelSystem) modelSystem.sync([], s);
      } else {
      // ── Background ──
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#000008');
      bgGrad.addColorStop(1, '#020512');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // ── Background sky: the distant stars as seen from the solar system.
      // Fades out once the real nearby stars come into the frame.
      const skyAlpha = fade(viewM, 3e16, 3e15);
      if (skyAlpha > 0) {
        const zoomEffect = Math.min(1, fade(viewM, INTRO_END_M, 3e15)) * 0.6;
        STARS.forEach(st => {
          const sx = st.x * W + (st.x - 0.5) * zoomEffect * st.z * W * 0.085;
          const sy = st.y * H + (st.y - 0.5) * zoomEffect * st.z * H * 0.085;
          if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) return;
          const twinkle = 0.55 + 0.45 * Math.sin(st.twinkle + frame * 0.018);
          ctx.beginPath();
          ctx.arc(sx, sy, st.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 215, 255, ${st.a * twinkle * skyAlpha})`;
          ctx.fill();
        });
      }

      // ── Cosmic web, clipped to the observable universe ──
      const webAlpha = fade(viewM, 1.5e24, 8e24);
      const obsPx = OBSERVABLE_R * scale;
      if (webAlpha > 0) {
        const art = getWebArt();
        const pat = ctx.createPattern(art, 'repeat');
        const tilePx = WEB_TILE_M * scale;
        pat.setTransform(new DOMMatrix().translate(cx0, cy0).scale(tilePx / art.width));
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx0, cy0, obsPx, 0, Math.PI * 2);
        ctx.clip();
        // Below a few pixels per tile the pattern would alias; blend to a glow.
        const fine = Math.max(0, Math.min(1, (tilePx - 6) / 30));
        ctx.globalAlpha = webAlpha * (0.25 + 0.75 * fine);
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = webAlpha * (1 - fine) * 0.35;
        ctx.fillStyle = 'rgb(120,120,200)';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        notes.add('web');
      }

      // ── The Milky Way, seen from above ──
      const mwPx = MILKY_WAY_D * scale;
      const mwAlpha = Math.min(fade(viewM, 3e19, 3e20), fade(viewM, 3e24, 3e23));
      if (mwAlpha > 0) {
        const gx = toX(GALACTIC_CENTER), gy = toY(GALACTIC_CENTER);
        // Turn the map so its Sun lands on the real Sun, at the canvas center.
        const rot = Math.atan2(cy0 - gy, cx0 - gx) - Math.PI / 2;
        if (mwPx > 3) {
          ctx.save();
          ctx.globalAlpha = mwAlpha;
          ctx.globalCompositeOperation = 'lighter';
          ctx.translate(gx, gy);
          ctx.rotate(rot);
          ctx.drawImage(getGalaxyArt(), -mwPx / 2, -mwPx / 2, mwPx, mwPx);
          ctx.restore();
        } else {
          dot(gx, gy, 0, `rgba(240,225,200,${mwAlpha})`, 1.5);
        }
        const partsAlpha = mwAlpha * fade(viewM, 2.5e21, 9e20);
        if (partsAlpha > 0) {
          MW_ARMS.forEach(arm => {
            if (!arm.labelAt) return;
            const [ax, ay] = mwToCanvas(mwArmXY(arm, arm.labelAt), gx, gy, mwPx, rot);
            label(arm.name, ax, ay, partsAlpha * 0.85, 'rgb(205,215,255)');
          });
          if (onCanvas(gx, gy, 0)) {
            label('Sagittarius A*: black hole, 4 million Suns', gx, gy + 18, partsAlpha * 0.9, 'rgb(255,226,180)');
          }
        }
        label('Milky Way', gx, gy - Math.max(mwPx * 0.5, 4) - 6, mwAlpha * fade(viewM, 1e24, 1e23));
        notes.add('galaxy');
      }

      // ── The Local Group: our galaxy, Andromeda and their companions ──
      const lgRingAlpha = Math.min(fade(viewM, 3e22, 1.2e23), fade(viewM, 3e24, 8e23));
      if (lgRingAlpha > 0) {
        const lx = toX(LOCAL_GROUP.pos), ly = toY(LOCAL_GROUP.pos), lr = LOCAL_GROUP.r * scale;
        ctx.save();
        ctx.setLineDash([4, 5]);
        ctx.strokeStyle = `rgba(150,175,255,${0.4 * lgRingAlpha})`;
        ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        label('Local Group: 80+ galaxies', lx, ly - lr - 8, lgRingAlpha);
      }
      const lgAlpha = Math.min(fade(viewM, 4e20, 4e21), fade(viewM, 3e25, 3e24));
      if (lgAlpha > 0) {
        GALAXIES.forEach(gal => {
          const x = toX(gal.pos), y = toY(gal.pos);
          if (!onCanvas(x, y, 200)) return;
          const rx = Math.max(gal.d * scale / 2, 1.2), ry = Math.max(rx * gal.ratio, 1);
          if (rx < 1.5) notes.add('dots');
          const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
          g.addColorStop(0, `rgba(${gal.color},${0.9 * lgAlpha})`);
          g.addColorStop(0.35, `rgba(${gal.color},${0.35 * lgAlpha})`);
          g.addColorStop(1, `rgba(${gal.color},0)`);
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(gal.angle);
          ctx.scale(1, ry / rx);
          ctx.translate(-x, -y);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(rx, 2), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          const show = lgAlpha * (gal.major ? fade(viewM, 1e24, 3e23) : fade(viewM, 3e22, 3e21));
          label(gal.name, x, y - Math.max(ry, 3) - 6, show);
        });
      }

      // ── Galaxy groups and clusters at their real places ──
      CLUSTERS.forEach(cl => {
        const a = Math.min(fade(viewM, cl.dist * 0.25, cl.dist), fade(viewM, cl.dist * 60, cl.dist * 15));
        if (a <= 0) return;
        const x = toX(cl.pos), y = toY(cl.pos);
        const cr = cl.d * scale / 2;
        if (!onCanvas(x, y, cr + 10)) return;
        const haze = ctx.createRadialGradient(x, y, 0, x, y, Math.max(cr, 3));
        haze.addColorStop(0, `rgba(200,190,255,${0.22 * a})`);
        haze.addColorStop(1, 'rgba(200,190,255,0)');
        ctx.fillStyle = haze;
        ctx.beginPath(); ctx.arc(x, y, Math.max(cr, 3), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(235,222,255,${0.75 * a})`;
        cl.members.forEach(([mx, my, s]) => ctx.fillRect(x + mx * cl.d * scale - s / 2, y + my * cl.d * scale - s / 2, s, s));
        if (cr < 2) notes.add('dots');
        const showLabel = viewM < cl.dist * (cl.major ? 14 : 5);
        if (showLabel) label(cl.name, x, y - Math.max(cr, 3) - 6, a);
      });

      // ── Laniakea, our home supercluster ──
      const lanAlpha = Math.min(fade(viewM, 1.2e24, 5e24), fade(viewM, 1.2e26, 3e25));
      if (lanAlpha > 0) {
        const lx = toX(LANIAKEA.pos), ly = toY(LANIAKEA.pos), lr = LANIAKEA.r * scale;
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i <= 120; i++) {
          const t = i / 120 * Math.PI * 2;
          const rr = lr * (1 + 0.14 * Math.sin(3 * t + 1) + 0.08 * Math.sin(5 * t + 2.3) + 0.05 * Math.sin(9 * t));
          const px = lx + rr * Math.cos(t), py = ly + rr * Math.sin(t);
          if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.fillStyle = `rgba(120,150,255,${0.06 * lanAlpha})`;
        ctx.fill();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = `rgba(150,180,255,${0.55 * lanAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
        label('Laniakea Supercluster: our home', lx, ly - lr * 1.15 - 8, lanAlpha, 'rgb(190,205,255)');
        notes.add('laniakea');
      }

      // ── Nearby stars at their real positions ──
      // Each one fades in as it comes into frame and out once it is lost in the crowd.
      if (viewM > 3e15 && viewM < 3e22) {
        STARS_NEAR.forEach(st => {
          const d = st.ly * LY;
          const starAlpha = Math.min(fade(viewM, d * 0.12, d * 0.5), fade(viewM, d * 90, d * 25));
          if (starAlpha <= 0) return;
          const x = toX(st.pos), y = toY(st.pos);
          if (!onCanvas(x, y, 4)) return;
          ctx.globalAlpha = starAlpha;
          ctx.drawImage(glowSprite(st.color), x - 5, y - 5, 10, 10);
          ctx.globalAlpha = 1;
          ctx.globalAlpha = starAlpha;
          dot(x, y, 0, st.color, 1.4);
          ctx.globalAlpha = 1;
          const distPx = Math.hypot(x - cx0, y - cy0);
          if (distPx > 16 && viewM < d * (st.major ? 30 : 10)) label(st.name, x, y - 9, starAlpha * 0.9);
        });
      }

      // ── The heliosphere: the bubble of the Sun's wind ──
      const helioAlpha = Math.min(fade(viewM, 5e13, 2.5e14), fade(viewM, 1.5e16, 3e15));
      if (helioAlpha > 0) {
        const sx = toX([0, 0]), sy = toY([0, 0]);
        const trace = pts => {
          ctx.beginPath();
          pts.forEach(([x, y], i) => { const px = sx + x * scale, py = sy - y * scale; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
          ctx.closePath();
        };
        const hpR = 121 * AU * scale;
        const hg = ctx.createRadialGradient(sx, sy, hpR * 0.4, sx, sy, hpR * 2.2);
        hg.addColorStop(0, `rgba(90,150,255,${0.03 * helioAlpha})`);
        hg.addColorStop(1, `rgba(90,150,255,${0.12 * helioAlpha})`);
        trace(HELIOPAUSE);
        ctx.fillStyle = hg;
        ctx.fill();
        ctx.strokeStyle = `rgba(120,185,255,${0.5 * helioAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.save();
        ctx.setLineDash([3, 4]);
        trace(TERMINATION_SHOCK);
        ctx.strokeStyle = `rgba(150,200,255,${0.32 * helioAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        notes.add('helio');
        if (hpR > 55) {
          const nx = sx + Math.cos(HELIO_NOSE) * hpR, ny = sy - Math.sin(HELIO_NOSE) * hpR;
          label('Heliopause: the Sun\'s wind ends here', nx, ny + (ny > sy ? 22 : -10), helioAlpha, 'rgb(170,205,255)');
          const tx = sx - Math.cos(HELIO_NOSE) * hpR * 2.6, ty = sy + Math.sin(HELIO_NOSE) * hpR * 2.6;
          label('Heliotail', tx, ty, helioAlpha * 0.8, 'rgb(150,185,240)');
          const tsR = 94 * AU * scale, tsx = sx + Math.cos(HELIO_NOSE + 0.5) * tsR, tsy = sy - Math.sin(HELIO_NOSE + 0.5) * tsR;
          if (tsR > 110) label('Termination shock', tsx, tsy + (tsy > sy ? 16 : -6), helioAlpha * 0.75, 'rgb(160,195,245)');
        }
      }

      // ── Oort Cloud (predicted; never directly observed) ──
      const oortAlpha = Math.min(fade(viewM, 3e14, 3e15), fade(viewM, 1e18, 1e17));
      if (oortAlpha > 0) {
        const sx = toX([0, 0]), sy = toY([0, 0]);
        dotField(ctx, OORT, sx, sy, scale, oortAlpha, '170,205,255', 1.6, 0.35, 0.85);
        const oy = sy - 30000 * AU * scale;
        label('Oort Cloud (predicted)', sx, oy, oortAlpha * fade(viewM, 3e17, 3e16));
      }

      const sunX = toX([0, 0]), sunY = toY([0, 0]);
      const flareAlpha = Math.min(fade(viewM, PBD_ZONE.flareIn, PBD_ZONE.flareFull), fade(viewM, PBD_ZONE.flareOut, PBD_ZONE.flareHold));
      const calm = 1 - 0.65 * flareAlpha; // keep the Pale Blue Dot moment uncluttered

      // ── Orbits of the planets (and Pluto, dashed) ──
      const orbitAlpha = fade(viewM, 3e14, 3e13);
      if (orbitAlpha > 0) {
        PLANETS.concat([PLUTO]).forEach(p => {
          const aPx = p.a * AU * scale;
          if (aPx < 4 || aPx > W * 4) return;
          const bPx = aPx * Math.sqrt(1 - p.e * p.e);
          const w = p.w * D2R;
          // The ellipse's center sits a·e from the Sun, away from perihelion.
          const ex = sunX - Math.cos(w) * p.e * aPx, ey = sunY + Math.sin(w) * p.e * aPx;
          ctx.save();
          if (p === PLUTO) ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.ellipse(ex, ey, aPx, bPx, -w, 0, Math.PI * 2);
          ctx.strokeStyle = p.name === 'Earth'
            ? `rgba(110,170,255,${0.45 * orbitAlpha})`
            : `rgba(120,140,200,${(p === PLUTO ? 0.3 * calm : 0.22) * orbitAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        });
      }

      // ── Asteroid belt and Kuiper Belt (each dot stands for countless rocks) ──
      const belt = (points, alpha, rgb) => dotField(ctx, points, sunX, sunY, scale, alpha, rgb, 1.3, 0.3, 0.85);
      const beltCalm = 1 - 0.9 * flareAlpha;
      const astAlpha = Math.min(fade(viewM, 1.5e11, 6e11), fade(viewM, 3e13, 7e12)) * beltCalm;
      belt(ASTEROIDS, astAlpha * 0.85, '215,195,165');
      if (astAlpha > 0.3 && viewM > 4e11 && viewM < 5e12 && flareAlpha < 0.3) {
        label('Asteroid Belt', sunX, sunY - 2.7 * AU * scale - 4, astAlpha, 'rgb(220,200,170)');
        const jl = jupLon + Math.PI / 3;
        if (viewM > 1e12) label('Trojans', sunX + Math.cos(jl) * 5.2 * AU * scale, sunY - Math.sin(jl) * 5.2 * AU * scale - 8, astAlpha * 0.8, 'rgb(220,200,170)');
      }
      const kbAlpha = Math.min(fade(viewM, 1.5e12, 6e12), fade(viewM, 3e15, 6e14)) * beltCalm;
      belt(KUIPER, kbAlpha * 0.7, '170,195,235');
      if (kbAlpha > 0.25 && 46 * AU * scale > 45 && flareAlpha < 0.3) {
        label('Kuiper Belt: icy worlds', sunX, sunY + 46 * AU * scale + 14, kbAlpha, 'rgb(175,200,240)');
      }

      // ── Lens flare, like the one in Voyager's camera (simulated) ──
      if (flareAlpha > 0) {
        notes.add('flare');
        ctx.save();
        const bands = [
          { angle: -0.13, spreadFrac: 0.11, bright: 0.26, len: W * 1.5 },
          { angle:  0.07, spreadFrac: 0.07, bright: 0.32, len: W * 1.3 },
          { angle:  0.34, spreadFrac: 0.06, bright: 0.18, len: W * 1.0 },
          { angle: -0.48, spreadFrac: 0.05, bright: 0.15, len: W * 0.85 },
          { angle:  0.62, spreadFrac: 0.04, bright: 0.11, len: W * 0.75 },
        ];
        // Aim the brightest band from the Sun through Earth, as in the photo.
        const toEarth = Math.atan2(cy0 - sunY, cx0 - sunX);
        // Thin ray streaks inside the broad bands, like the scattered light in
        // the real frame.
        for (let i = 0; i < 9; i++) {
          bands.push({ angle: -0.42 + i * 0.1 + Math.sin(i * 12.9) * 0.03, spreadFrac: 0.006, bright: 0.1 + 0.06 * Math.abs(Math.sin(i * 4.1)), len: W * (0.8 + 0.5 * Math.abs(Math.sin(i * 7.3))) });
        }
        // Each band is layered wide-to-narrow so its edges fade softly.
        const LAYERS = [[1.8, 0.28], [1.15, 0.36], [0.6, 0.46]];
        bands.forEach(({ angle, spreadFrac, bright, len }) => {
          const layers = spreadFrac < 0.01 ? [[1, 1]] : LAYERS;
          const a = toEarth + angle - 0.07;
          const dx = Math.cos(a), dy = Math.sin(a);
          const px = -dy, py = dx;
          const ex = sunX + dx * len, ey = sunY + dy * len;
          layers.forEach(([wMul, aMul]) => {
            const halfW = len * spreadFrac * wMul, b = bright * aMul * flareAlpha;
            const grad = ctx.createLinearGradient(sunX, sunY, ex, ey);
            grad.addColorStop(0,    `rgba(255,248,195,${b})`);
            grad.addColorStop(0.18, `rgba(255,235,155,${b * 0.72})`);
            grad.addColorStop(0.55, `rgba(255,215,100,${b * 0.32})`);
            grad.addColorStop(1,    'rgba(255,190,60,0)');
            ctx.beginPath();
            ctx.moveTo(sunX + px, sunY + py);
            ctx.lineTo(sunX - px, sunY - py);
            ctx.lineTo(ex - px * halfW, ey - py * halfW);
            ctx.lineTo(ex + px * halfW, ey + py * halfW);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
          });
        });
        const glowR = Math.min(60, W * 0.06);
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowR);
        sunGlow.addColorStop(0,    `rgba(255,255,230,${0.65 * flareAlpha})`);
        sunGlow.addColorStop(0.28, `rgba(255,245,175,${0.38 * flareAlpha})`);
        sunGlow.addColorStop(1,    'rgba(255,200,60,0)');
        ctx.beginPath();
        ctx.arc(sunX, sunY, glowR, 0, Math.PI * 2);
        ctx.fillStyle = sunGlow;
        ctx.fill();
        ctx.restore();
      }

      // ── The Sun ──
      const solarAlpha = fade(viewM, 3e17, 3e16);
      if (solarAlpha > 0 && onCanvas(sunX, sunY, 80)) {
        const sunR = SUN_R * scale;
        // Wide, faint glare (a camera or an eye sees the Sun bloom far past its edge).
        const glareR = Math.max(10, Math.min(80, sunR * 9));
        const glare = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glareR);
        glare.addColorStop(0, `rgba(255,230,160,${0.22 * solarAlpha * calm})`);
        glare.addColorStop(0.35, `rgba(255,210,130,${0.08 * solarAlpha * calm})`);
        glare.addColorStop(1, 'rgba(255,190,100,0)');
        ctx.fillStyle = glare;
        ctx.beginPath(); ctx.arc(sunX, sunY, glareR, 0, Math.PI * 2); ctx.fill();
        const haloR = Math.max(sunR * 2.2, 6);
        const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, haloR);
        halo.addColorStop(0, `rgba(255,236,150,${0.7 * solarAlpha})`);
        halo.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(sunX, sunY, haloR, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = solarAlpha;
        dot(sunX, sunY, SUN_R, '#ffe566', 2);
        ctx.globalAlpha = 1;
        if (Math.hypot(sunX - cx0, sunY - cy0) > 18 && viewM < 3e14) label('Sun', sunX, sunY - Math.max(sunR, 6) - 8, solarAlpha);
      }

      // ── Spacecraft leaving the solar system, and the Voyagers' flight paths ──
      const vgrAlpha = Math.min(fade(viewM, 2e11, 2e12), fade(viewM, 3e15, 3e14));
      if (vgrAlpha > 0) {
        const pathAlpha = vgrAlpha * fade(viewM, 1.5e12, 6e12);
        const drawPath = (pts, rgb, a) => {
          if (a <= 0.01) return;
          ctx.save();
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = `rgba(${rgb},${a})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          pts.forEach((p, i) => { if (i) ctx.lineTo(toX(p), toY(p)); else ctx.moveTo(toX(p), toY(p)); });
          ctx.stroke();
          ctx.restore();
        };
        drawPath(V2_PATH, '150,170,220', 0.3 * pathAlpha * calm);
        drawPath(V1_PATH, '140,185,255', 0.55 * pathAlpha);
        const cross = (x, y, a, size) => {
          ctx.strokeStyle = `rgba(140,180,255,${a})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x + size, y); ctx.moveTo(x, y - size); ctx.lineTo(x, y + size); ctx.stroke();
        };
        // Where Voyager 1 was when it took the Pale Blue Dot photo.
        const px = toX(V1_PHOTO_POS), py = toY(V1_PHOTO_POS);
        if (pathAlpha > 0 && onCanvas(px, py, 6) && Math.hypot(px - sunX, py - sunY) > 30) {
          ctx.strokeStyle = `rgba(255,214,120,${0.9 * pathAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.stroke();
          label('Photo taken here, Feb 14 1990', px, py - 9, pathAlpha, 'rgb(255,220,150)');
        }
        const vx = toX(VOYAGER_POS), vy = toY(VOYAGER_POS);
        if (onCanvas(vx, vy, 6)) {
          cross(vx, vy, vgrAlpha, 5);
          if (Math.hypot(vx - sunX, vy - sunY) > 25) label('Voyager 1 (today)', vx, vy - 10, vgrAlpha);
        }
        const probeAlpha = vgrAlpha * fade(viewM, 4e12, 1.5e13) * calm;
        if (probeAlpha > 0.01) {
          notes.add('probes');
          PROBES.forEach(pr => {
            const x = toX(pr.pos), y = toY(pr.pos);
            if (!onCanvas(x, y, 6)) return;
            cross(x, y, probeAlpha * 0.8, 3.5);
            if (viewM < 2e14) label(pr.name, x, y - 8, probeAlpha * 0.85);
          });
        }
      }

      // ── Planets, the Moon and Earth at true size (dots when sub-pixel) ──
      const bodies = PLANETS.map(p => ({ name: p.name, pos: p.pos, r: p.r, color: p.color, a: p.a }))
        .concat([{ name: 'Moon', pos: MOON_POS, r: MOON_R, color: '#c0c0c0', a: 0 },
                 { name: 'Pluto', pos: PLUTO.pos, r: PLUTO.r, color: PLUTO.color, a: PLUTO.a }]);
      const bodyAlpha = fade(viewM, 3e14, 3e13);
      bodies.forEach(b => {
        const x = toX(b.pos), y = toY(b.pos);
        const isEarth = b.name === 'Earth';
        if (!onCanvas(x, y, 300)) return;
        if (!isEarth && bodyAlpha <= 0) return;
        const trueD = b.r * 2 * scale;
        const cfg = MODEL_CONFIGS[b.name];
        const modelD = cfg ? trueD * (cfg.displayScale || 1) : 0;
        const modelReady = !!(modelSystem && modelSystem.isReady && modelSystem.isReady(b.name));
        const showModel = !!(cfg && modelReady && trueD >= cfg.showAbovePx && modelD <= cfg.hideAbovePx && onCanvas(x, y, 0));
        if (cfg && onCanvas(x, y, modelD)) {
          const fx = OBJECTS.find(o => o.name === b.name);
          const effects = (fx && fx.effects) || {};
          modelLayouts.push({
            name: b.name, x, y,
            size: Math.round(modelD),
            visible: showModel,
            effectVisible: showModel && Object.keys(effects).length > 0,
            haloOpacity: showModel ? (effects.haloOpacity == null ? 0.18 : effects.haloOpacity) : 0,
            particleSize: Math.max(0.03, (effects.particleSize || 0.08)),
            priority: b.name === 'Earth' || b.name === 'Moon'
          });
        }

        if (isEarth && flareAlpha > 0.25 && trueD < 2) {
          // The Pale Blue Dot: a 2.7-pixel dot, thousands of times Earth's true
          // size at this scale, so it can be seen at all.
          notes.add('earth');
          earthBoost = 2.7 / Math.max(trueD, 1e-9);
          const dotAlpha = Math.min(1, (flareAlpha - 0.25) * 2.2);
          const flicker = 0.82 + 0.18 * Math.sin(frame * 0.11 + 0.7) * Math.sin(frame * 0.074 + 1.3);
          const bloom = ctx.createRadialGradient(x, y, 0, x, y, 5.5);
          bloom.addColorStop(0,    `rgba(100,170,255,${0.30 * dotAlpha * flicker})`);
          bloom.addColorStop(0.45, `rgba( 80,145,255,${0.14 * dotAlpha})`);
          bloom.addColorStop(1,    'rgba( 60,110,255,0)');
          ctx.fillStyle = bloom;
          ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(130,190,255,${0.72 * dotAlpha * flicker})`;
          ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(200,228,255,${0.97 * dotAlpha * flicker})`;
          ctx.beginPath(); ctx.arc(x, y, 1.35, 0, Math.PI * 2); ctx.fill();
        } else if (!showModel) {
          ctx.globalAlpha = isEarth ? Math.max(bodyAlpha, fade(viewM, 3e17, 3e16)) : bodyAlpha;
          const r = dot(x, y, b.r, b.color, 1.5);
          if (isEarth && r > 4) {
            const atm = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 1.1);
            atm.addColorStop(0, 'rgba(80,160,255,0)');
            atm.addColorStop(1, 'rgba(80,160,255,0.18)');
            ctx.fillStyle = atm;
            ctx.beginPath(); ctx.arc(x, y, r * 1.1, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        // Label a body when it is resolved, or when its orbit is big enough on
        // screen to tell it apart from its neighbors.
        const sep = b.name === 'Moon' ? 3.844e8 * scale : b.a * AU * scale;
        const lab = isEarth ? (trueD > 6 || (viewM >= 2e9 && viewM < 3e14)) : (trueD > 6 || sep > 22);
        if (lab && viewM < 3e14) label(b.name, x, y - Math.max(trueD / 2, 4) - 8, isEarth ? 1 : bodyAlpha);
      });

      // ── Near Earth: the Moon's orbit and the James Webb Space Telescope ──
      const moonOrbitPx = 3.844e8 * scale;
      const moonOrbitAlpha = Math.min(fade(viewM, 2.5e8, 9e8), fade(viewM, 1.5e11, 3e10));
      if (moonOrbitAlpha > 0 && moonOrbitPx > 6) {
        ctx.strokeStyle = `rgba(190,200,220,${0.28 * moonOrbitAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx0, cy0, moonOrbitPx, 0, Math.PI * 2); ctx.stroke();
      }
      const jwstAlpha = Math.min(fade(viewM, 1.2e9, 3e9), fade(viewM, 3e11, 8e10));
      if (jwstAlpha > 0) {
        const jx = toX(JWST_POS), jy = toY(JWST_POS);
        if (onCanvas(jx, jy, 4)) {
          ctx.fillStyle = `rgba(255,215,120,${jwstAlpha})`;
          ctx.save();
          ctx.translate(jx, jy); ctx.rotate(Math.PI / 4);
          ctx.fillRect(-2, -2, 4, 4); // a tiny diamond, like its sunshield
          ctx.restore();
          label(viewM < 2e10 ? 'James Webb Space Telescope (at L2)' : 'Webb telescope', jx, jy + 16, jwstAlpha, 'rgb(255,220,150)');
        }
      }

      // ── Which way is the Sun? (while it is still off the edge) ──
      const sunPtrAlpha = Math.min(fade(viewM, 2.5e7, 1e8), fade(viewM, 1e12, 4e11));
      if (sunPtrAlpha > 0 && !onCanvas(sunX, sunY, 0)) {
        const ang = Math.atan2(sunY - cy0, sunX - cx0), ux = Math.cos(ang), uy = Math.sin(ang);
        const m = 22, t = Math.min((W / 2 - m) / Math.abs(ux || 1e-9), (H / 2 - m - 26) / Math.abs(uy || 1e-9));
        const ax = cx0 + ux * t, ay = cy0 + uy * t;
        ctx.fillStyle = `rgba(255,220,120,${0.9 * sunPtrAlpha})`;
        ctx.beginPath();
        ctx.moveTo(ax + ux * 9, ay + uy * 9);
        ctx.lineTo(ax - ux * 4 - uy * 6, ay - uy * 4 + ux * 6);
        ctx.lineTo(ax - ux * 4 + uy * 6, ay - uy * 4 - ux * 6);
        ctx.closePath();
        ctx.fill();
        const dSun = Math.hypot(EARTH_POS[0], EARTH_POS[1]);
        const tx = Math.max(130, Math.min(W - 130, ax - ux * 22)), ty = Math.max(20, Math.min(H - 66, ay - uy * 22));
        label('Sun this way: ' + formatDistance(dSun), tx, ty + 4, sunPtrAlpha, 'rgb(255,224,150)');
        label('its light takes ' + formatLightTime(dSun), tx, ty + 19, sunPtrAlpha * 0.8, 'rgb(255,224,150)');
      }

      // ── You are here (once Earth is lost inside bigger things) ──
      const hereAlpha = fade(viewM, 3e15, 3e16);
      if (hereAlpha > 0) {
        ctx.strokeStyle = `rgba(255,214,120,${0.9 * hereAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx0, cy0, 7, 0, Math.PI * 2); ctx.stroke();
        placed.push([cx0 - 40, cy0 + 9, cx0 + 40, cy0 + 24]);
        ctx.font = '11px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(255,224,160,${0.9 * hereAlpha})`;
        ctx.fillText('You are here', cx0, cy0 + 21);
      }

      // ── Edge of the observable universe ──
      if (obsPx > 25 && obsPx < W * 3) {
        const edgeAlpha = fade(viewM, 1.5e26, 4e26);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.arc(cx0, cy0, obsPx, 0, Math.PI * 2, true);
        ctx.fillStyle = `rgba(0,0,0,${0.92 * edgeAlpha})`;
        ctx.fill('evenodd');
        const ring = ctx.createRadialGradient(cx0, cy0, obsPx * 0.94, cx0, cy0, obsPx * 1.01);
        ring.addColorStop(0, 'rgba(255,140,80,0)');
        ring.addColorStop(0.8, `rgba(255,150,90,${0.45 * edgeAlpha})`);
        ring.addColorStop(1, 'rgba(255,150,90,0)');
        ctx.fillStyle = ring;
        ctx.beginPath(); ctx.arc(cx0, cy0, obsPx * 1.01, 0, Math.PI * 2); ctx.fill();
        // The CMB is not smooth: tiny hot and cold patches, the seeds of all
        // later structure. (Pattern illustrative; the real map is from Planck.)
        ctx.globalCompositeOperation = 'lighter';
        CMB_GROUPS.forEach(({ c, o, spots }) => {
          ctx.beginPath();
          spots.forEach(sp => {
            const r = obsPx * sp.r, x = cx0 + r * Math.cos(sp.a), y = cy0 + r * Math.sin(sp.a);
            if (!onCanvas(x, y, 20)) return;
            const sr = Math.max(1, obsPx * sp.s);
            ctx.moveTo(x + sr, y);
            ctx.arc(x, y, sr, 0, Math.PI * 2);
          });
          ctx.fillStyle = `rgba(${c},${o * edgeAlpha})`;
          ctx.fill();
        });
        ctx.restore();
        if (edgeAlpha > 0.3) {
          const top = cy0 - obsPx - 10 > 20 ? cy0 - obsPx - 10 : Math.max(cy0 - obsPx + 30, 24);
          label('Glowing edge: the oldest light we can see (cosmic microwave background)', cx0, top, edgeAlpha);
          const bx = W - 150, by = 34;
          if (Math.hypot(bx - cx0, by - cy0) > obsPx + 40) {
            label('Out here: more universe,', bx, by, edgeAlpha * 0.85);
            label('but its light hasn\'t reached us yet', bx, by + 16, edgeAlpha * 0.85);
          }
        }
      }

      // One 3D model at a time: the largest visible one wins.
      const visibleModels = modelLayouts.filter(l => l.visible);
      if (visibleModels.length > 1) {
        const dominant = visibleModels.reduce((a, b) => a.size > b.size ? a : b);
        modelLayouts.forEach(l => { if (l.visible && l.name !== dominant.name) l.visible = false; });
      }
      if (modelSystem) modelSystem.sync(modelLayouts, s);
      } // end space scene

      // ── Scale bar ──
      const barM  = niceBar(viewM / 7);
      const barPx = barM * scale;
      const barX  = 24;
      const barY  = H - 28;
      ctx.strokeStyle = 'rgba(90,130,220,0.8)';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(barX, barY);
      ctx.lineTo(barX + barPx, barY);
      ctx.moveTo(barX, barY - 4); ctx.lineTo(barX, barY + 4);
      ctx.moveTo(barX + barPx, barY - 4); ctx.lineTo(barX + barPx, barY + 4);
      ctx.stroke();
      ctx.font = '11px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(110,155,235,0.9)';
      ctx.textAlign = 'left';
      ctx.fillText(formatDistance(barM), barX, barY - 8);

      // ── What is and isn't to scale right now ──
      const NOTE_TEXT = {
        earth: 'Earth drawn ' + Math.round(earthBoost / 100) * 100 + '× too big so you can see it',
        flare: 'Light streaks: a simulated camera lens flare',
        dots: 'Dots mark positions; real sizes are smaller than a pixel',
        galaxy: 'Milky Way: artist\'s map, seen from above',
        web: 'Cosmic web: a typical pattern, not a real map',
        helio: 'Heliosphere: nose distance measured, tail shape modeled',
        probes: 'Spacecraft paths simplified between flybys',
        laniakea: 'Laniakea outline simplified'
      };
      const noteLines = ['earth', 'flare', 'helio', 'probes', 'dots', 'galaxy', 'web', 'laniakea'].filter(k => notes.has(k)).slice(0, 2).map(k => NOTE_TEXT[k]);
      ctx.textAlign = 'right';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(150,175,230,0.72)';
      noteLines.forEach((t, i) => ctx.fillText(t, W - 16, H - 14 - (noteLines.length - 1 - i) * 15));

      // ── Update UI ──
      const widthText = formatDistance(viewM) + ' across';
      scaleValueEl.textContent = widthText + ' · light crosses it in ' + formatLightTime(viewM);
      scaleValueEl.title = 'About ' + powerOfTen(viewM);
      slider.setAttribute('aria-valuetext', widthText);
      const ms = MILESTONES.find(m => viewM >= m.from && viewM < m.to);
      milestoneEl.textContent = ms ? ms.label : '';
      const panelScale = document.getElementById('pbd-scale-value-panel');
      if (panelScale) panelScale.textContent = widthText + ' (' + powerOfTen(viewM) + ')';
      const panelMs = document.getElementById('pbd-milestone-panel');
      if (panelMs) panelMs.textContent = ms ? ms.label : '';
      const contextEl = document.getElementById('pbd-context');
      if (contextEl) contextEl.textContent = ms && ms.fact ? ms.fact : '';
      if (journeyBtn && !journeyActive) journeyBtn.textContent = journeyLabel();

      // Immersive mode: fade the interface chrome during the pale blue dot
      // moment, so nothing competes with it on screen.
      if (viewportEl) viewportEl.classList.toggle('pbd-immersive', viewM >= PBD_ZONE.flareIn && viewM <= 3e14);

      SPEECH_RANGES.forEach(({ id, from, to }) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('visible', viewM >= from && viewM <= to);
      });
      const citeEl = document.getElementById('pbd-speech-cite');
      if (citeEl) citeEl.classList.toggle('visible', viewM >= SPEECH_RANGES[3].from && viewM <= SPEECH_RANGES[3].to);
    }

    // ── Event listeners ──
    slider.addEventListener('input', () => {
      noteManualInteraction();
      draw();
    });

    let animId;
    function animate() {
      draw();
      if (modelSystem) modelSystem.render();
      animId = requestAnimationFrame(animate);
    }

    // Scroll to zoom
    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      noteManualInteraction();
      const delta = e.deltaY > 0 ? 1.5 : -1.5;
      slider.value = Math.max(0, Math.min(100, parseFloat(slider.value) + delta));
      draw();
    }, { passive: false });

    if (journeyBtn) {
      journeyBtn.addEventListener('click', () => {
        if (journeyActive) {
          stopJourney();
          return;
        }
        startJourney();
      });
    }

    // Keyboard and drag zoom on the canvas itself (touch screens have no wheel,
    // and the slider lives in a panel that is closed by default on phones).
    function nudge(delta) {
      noteManualInteraction();
      slider.value = Math.max(0, Math.min(100, parseFloat(slider.value) + delta));
      draw();
    }
    wrap.addEventListener('keydown', e => {
      const steps = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 };
      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        nudge(e.key === 'Home' ? -100 : 100);
      } else if (steps[e.key]) {
        e.preventDefault();
        nudge(steps[e.key]);
      }
    });
    wrap.style.touchAction = 'pan-y';
    let dragX = null;
    wrap.addEventListener('pointerdown', e => { dragX = e.clientX; wrap.setPointerCapture(e.pointerId); });
    wrap.addEventListener('pointermove', e => {
      if (dragX === null) return;
      const dx = e.clientX - dragX;
      if (Math.abs(dx) < 2) return;
      dragX = e.clientX;
      nudge(-dx / Math.max(wrap.clientWidth, 1) * 40);
    });
    ['pointerup', 'pointercancel'].forEach(t => wrap.addEventListener(t, () => { dragX = null; }));

    window.addEventListener('resize', resize);
    // Defer first resize until after layout is computed, then start animation loop
    requestAnimationFrame(() => { resize(); animate(); });
    // Build the galaxy and cosmic-web art while idle, so the journey doesn't
    // stall the first time it reaches them.
    const idle = window.requestIdleCallback || (cb => setTimeout(cb, 1500));
    idle(() => { getGalaxyArt(); idle(() => getWebArt()); });
  })();
