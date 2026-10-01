/* Ocean Zones lesson labs — the sections below the dive sim in
   lessons/earth-science/ocean-zones.html. Talks to the sim via window.OceanDive. */
(function () {
  'use strict';

  const dive = window.OceanDive;
  const $ = id => document.getElementById(id);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function diveTo(depth) {
    if (!dive) return;
    dive.setDepth(depth);
    $('oz-dive').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }
  function diveButton(depth, label) {
    return '<button type="button" class="oz-dive-here" data-dive="' + depth + '">' + (label || 'Dive here') + ' ↑</button>';
  }
  document.addEventListener('click', ev => {
    const btn = ev.target.closest && ev.target.closest('[data-dive]');
    if (btn) diveTo(Number(btn.dataset.dive));
  });

  // Seawater model shared with the sim: 1,025 kg/m³, standard gravity.
  const pressureAtm = dive ? dive.pressureAtm : d => 1 + (1025 * 9.80665 * d) / 101325;

  /* ══════════ 2 · Zone gallery ══════════ */
  const ZONE_CARDS = [
    { id: 'sunlight', name: 'Sunlight Zone', term: 'epipelagic', latin: 'Epipelagic', range: '0–200 m', dive: 40, img: 'sunlight.webp', accent: '#74ddff',
      light: 'Enough for photosynthesis', food: 'Phytoplankton make it here',
      caption: 'Sunbeams still reach this water, so phytoplankton can photosynthesize. Almost every food web in the ocean starts in this thin top layer.' },
    { id: 'twilight', name: 'Twilight Zone', term: 'mesopelagic', latin: 'Mesopelagic', range: '200–1,000 m', dive: 500, img: 'twilight.webp', accent: '#6aa8ff',
      light: 'Dim blue, too faint for plants', food: 'Sinking food and nightly trips up',
      caption: 'Only a faint blue glow is left — enough to see by, too little for plants. Every night, huge numbers of animals swim up to feed and return before dawn.' },
    { id: 'midnight', name: 'Midnight Zone', term: 'bathypelagic', latin: 'Bathypelagic', range: '1,000–4,000 m', dive: 2000, img: 'midnight.webp', accent: '#a88cff',
      light: 'No sunlight at all', food: 'Marine snow and each other',
      caption: 'No sunlight reaches here. The only light is made by animals themselves — bioluminescence used to hunt, hide, and find mates.' },
    { id: 'abyss', name: 'The Abyss', term: 'abyssopelagic', latin: 'Abyssopelagic', range: '4,000–6,000 m', dive: 5000, img: 'abyss.webp', accent: '#73dfc0',
      light: 'Total darkness', food: 'Scraps settling on the seafloor',
      caption: 'Near-freezing water over vast, flat plains of soft mud. Food is so scarce that seafloor animals live slowly and eat the sediment itself.' },
    { id: 'trench', name: 'The Trenches', term: 'hadal zone', latin: 'Hadal', range: '6,000–10,935 m', dive: 10935, img: 'hadal.webp', accent: '#ffcf67',
      light: 'Total darkness', food: 'Food funneled down steep walls',
      caption: 'Deep cracks where one tectonic plate dives under another. Pressure here reaches about 1,100 atmospheres, yet amphipods, worms, and microbes still thrive.' },
  ];
  const gallery = $('oz-zone-gallery');
  if (gallery) {
    gallery.innerHTML = ZONE_CARDS.map(z =>
      '<article class="oz-zone-card" style="--oz-accent:' + z.accent + '">' +
        '<figure data-zoomable data-lightbox-group="ocean-zone-plates">' +
          '<img src="../../assets/images/ocean-zones/' + z.img + '" alt="' + z.name + ' scene" width="1586" height="992" loading="lazy" decoding="async">' +
          '<figcaption><span class="oz-cap-kind">' + z.name + ' · ' + z.latin + ' · ' + z.range + '</span>' + z.caption +
          '<span class="oz-cap-credit">Scene artwork from this lesson’s dive simulation</span></figcaption>' +
        '</figure>' +
        '<div class="oz-zone-body">' +
          '<h3>' + z.name + '</h3>' +
          '<p class="oz-zone-latin"><span data-glossary="' + z.term + '">' + z.latin + '</span> · ' + z.range + '</p>' +
          '<dl><dt>Light</dt><dd>' + z.light + '</dd><dt>Food</dt><dd>' + z.food + '</dd></dl>' +
          diveButton(z.dive) +
        '</div>' +
      '</article>').join('');
  }

  /* ══════════ 3 · To-scale column ══════════ */
  const LANDMARKS = [
    { d: 40, name: 'Recreational scuba limit', text: 'Sport divers usually stay above 40 m. Even there, the pressure is about 5 atmospheres.' },
    { d: 214, name: 'Deepest breath-hold dive', text: 'Herbert Nitsch rode a weighted sled to 214 m on a single breath in 2007 — just past the bottom of the sunlight zone.' },
    { d: 828, name: 'Burj Khalifa, upside down', text: 'The world’s tallest building (828 m) would fit entirely inside the twilight zone.' },
    { d: 2992, name: 'Deepest mammal dive', text: 'A Cuvier’s beaked whale tracked off California dived to 2,992 m — on one breath. Another of its dives lasted over two hours.' },
    { d: 3682, name: 'Average ocean depth', text: 'The average depth of the whole ocean is about 3,700 m. Most of the deep seafloor is flat abyssal plain.' },
    { d: 3800, name: 'Wreck of the Titanic', text: 'The Titanic rests about 3,800 m down in the North Atlantic, near the bottom of the midnight zone.' },
    { d: 8336, name: 'Deepest fish ever filmed', text: 'In 2022 a robotic camera filmed a young snailfish at 8,336 m in the Izu–Ogasawara Trench near Japan.' },
    { d: 8849, name: 'Mount Everest, upside down', text: 'Flip Everest (8,849 m) into Challenger Deep and its peak would still be about 2 km underwater.' },
    { d: 10935, name: 'Challenger Deep', text: 'The deepest known point in the ocean, in the Mariana Trench. Surveys differ by a few tens of metres; about 10,935 m is a widely used figure.' },
  ];
  const scaleSvg = $('oz-scale-svg');
  if (scaleSvg) {
    const TOP = 30, BOT = 545, MAX = 11000, colX = 60, colW = 90;
    const y = d => TOP + (d / MAX) * (BOT - TOP);
    const SVG = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs, text) => { const n = document.createElementNS(SVG, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; return n; };
    const bands = [[0, 200, '#1e82c8'], [200, 1000, '#0b3a78'], [1000, 4000, '#0a1838'], [4000, 6000, '#060d1e'], [6000, 11000, '#03060f']];
    bands.forEach(b => scaleSvg.appendChild(el('rect', { x: colX, y: y(b[0]), width: colW, height: y(b[1]) - y(b[0]), fill: b[2] })));
    scaleSvg.appendChild(el('rect', { x: colX, y: TOP, width: colW, height: BOT - TOP, fill: 'none', stroke: 'rgba(140,210,240,.35)' }));
    [0, 2000, 4000, 6000, 8000, 10000].forEach(d => {
      scaleSvg.appendChild(el('line', { x1: colX - 6, x2: colX, y1: y(d), y2: y(d), stroke: 'rgba(190,225,240,.5)' }));
      scaleSvg.appendChild(el('text', { x: colX - 10, y: y(d) + 4, 'text-anchor': 'end', class: 'oz-svg-axis' }, d === 0 ? '0 m' : fmt(d)));
    });
    // The sunlit layer is too thin to hold a label at this scale — which is the point.
    scaleSvg.appendChild(el('text', { x: colX + colW / 2, y: TOP - 6, 'text-anchor': 'middle', class: 'oz-svg-sun' }, 'Sunlight zone ↓'));
    const zoneLabels = [[600, 'Twilight'], [2500, 'Midnight'], [5000, 'Abyss'], [8500, 'Hadal']];
    zoneLabels.forEach(z => scaleSvg.appendChild(el('text', { x: colX + colW / 2, y: y(z[0]) + 4, 'text-anchor': 'middle', class: 'oz-svg-zone' }, z[1])));
    const markers = LANDMARKS.map(l => {
      const g = el('g', { class: 'oz-scale-mark' });
      g.appendChild(el('line', { x1: colX, x2: colX + colW + 18, y1: y(l.d), y2: y(l.d) }));
      g.appendChild(el('circle', { cx: colX + colW + 18, cy: y(l.d), r: 4 }));
      const label = el('text', { x: colX + colW + 28, y: y(l.d) + 4, class: 'oz-svg-label' }, l.name + ' · ' + fmt(l.d) + ' m');
      g.appendChild(label);
      scaleSvg.appendChild(g);
      return g;
    });
    const list = $('oz-scale-list');
    list.innerHTML = LANDMARKS.map((l, i) => '<button type="button" role="listitem" class="oz-scale-item" data-i="' + i + '"><span>' + l.name + '</span><strong>' + fmt(l.d) + ' m</strong></button>').join('');
    function selectLandmark(i) {
      markers.forEach((m, j) => m.classList.toggle('active', j === i));
      list.querySelectorAll('.oz-scale-item').forEach((b, j) => b.setAttribute('aria-pressed', j === i ? 'true' : 'false'));
      const l = LANDMARKS[i];
      $('oz-scale-detail').innerHTML = '<strong>' + l.name + ' · ' + fmt(l.d) + ' m</strong><p>' + l.text + '</p><p class="oz-scale-p">Pressure there: about ' + fmt(pressureAtm(l.d)) + ' atm.</p>' + diveButton(l.d);
    }
    list.addEventListener('click', ev => { const b = ev.target.closest('.oz-scale-item'); if (b) selectLandmark(Number(b.dataset.i)); });
    selectLandmark(5);
  }

  /* ══════════ 4 · Light & color ══════════ */
  // Diffuse attenuation Kd (per metre), approximating Jerlov clear oceanic (type I) and coastal water.
  const BANDS = [
    { name: 'Red', nm: 650, css: '#ff4a3d', rgb: [1, 0, 0], kd: { ocean: 0.36, coastal: 0.42 } },
    { name: 'Orange', nm: 600, css: '#ff9a2e', rgb: [1, 0.55, 0], kd: { ocean: 0.235, coastal: 0.30 } },
    { name: 'Yellow', nm: 575, css: '#ffe14a', rgb: [1, 0.95, 0], kd: { ocean: 0.089, coastal: 0.15 } },
    { name: 'Green', nm: 525, css: '#4fe07a', rgb: [0.1, 1, 0.15], kd: { ocean: 0.043, coastal: 0.12 } },
    { name: 'Blue', nm: 475, css: '#3d8bff', rgb: [0, 0.45, 1], kd: { ocean: 0.018, coastal: 0.25 } },
    { name: 'Violet', nm: 425, css: '#9a6bff', rgb: [0.35, 0, 1], kd: { ocean: 0.022, coastal: 0.55 } },
  ];
  const REFLECT = { red: [0.9, 0.5, 0.1, 0.04, 0.04, 0.04], yellow: [0.6, 0.7, 0.9, 0.6, 0.08, 0.05] };
  const CH_SUM = [0, 1, 2].map(ch => BANDS.reduce((s, b) => s + b.rgb[ch], 0));
  let water = 'ocean';
  const ltDepth = $('lt-depth');
  if (ltDepth) {
    const bandsEl = $('lt-bands');
    bandsEl.innerHTML = BANDS.map(b => '<div class="oz-band"><span class="oz-band-name">' + b.name + ' <small>' + b.nm + ' nm</small></span><span class="oz-band-track"><span class="oz-band-fill" style="background:' + b.css + '"></span></span><strong class="oz-band-pct">100%</strong></div>').join('');
    const fills = bandsEl.querySelectorAll('.oz-band-fill'), pcts = bandsEl.querySelectorAll('.oz-band-pct');
    const lin = (I, refl) => [0, 1, 2].map(ch => BANDS.reduce((s, b, i) => s + I[i] * (refl ? refl[i] : 1) * b.rgb[ch], 0) / CH_SUM[ch]);
    const toCss = (rgb, k) => 'rgb(' + rgb.map(v => Math.round(255 * Math.pow(clamp(v * k, 0, 1), 1 / 2.2))).join(',') + ')';
    const pctLabel = p => p >= 10 ? p.toFixed(0) + '%' : p >= 0.1 ? p.toFixed(1) + '%' : p >= 0.001 ? p.toFixed(3) + '%' : '<0.001%';
    function renderLight() {
      const z = Number(ltDepth.value);
      $('lt-depth-out').textContent = z + ' m';
      const I = BANDS.map(b => Math.exp(-b.kd[water] * z));
      I.forEach((v, i) => { fills[i].style.width = (100 * v).toFixed(2) + '%'; pcts[i].textContent = pctLabel(100 * v); });
      const white = lin(I), total = I.reduce((a, b) => a + b, 0) / I.length;
      // Eyes adapt to dim light, so show the hue normalized but still dimmer as light fades.
      const k = clamp(1 + Math.log10(Math.max(total, 1e-6)) / 4, 0.12, 1) / Math.max(...white);
      $('lt-white').style.background = toCss(white, k);
      $('lt-red').style.background = toCss(lin(I, REFLECT.red), k);
      $('lt-yellow').style.background = toCss(lin(I, REFLECT.yellow), k);
      const best = BANDS[I.indexOf(Math.max(...I))].name.toLowerCase();
      $('lt-readout').textContent = z === 0
        ? 'At the surface every color is present, so objects show their true colors.'
        : 'At ' + z + ' m, ' + pctLabel(100 * I[0]) + ' of the red light is left, but ' + pctLabel(100 * Math.max(...I)) + ' of the ' + best + ' light. Overall about ' + pctLabel(100 * total) + ' of the sunlight remains' +
          (total < 0.01 ? ' — below the roughly 1% that photosynthesis needs.' : '.');
    }
    ltDepth.addEventListener('input', renderLight);
    document.querySelectorAll('[data-water]').forEach(btn => btn.addEventListener('click', () => {
      water = btn.dataset.water;
      document.querySelectorAll('[data-water]').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
      renderLight();
    }));
    renderLight();
  }

  /* ══════════ 5 · Pressure ══════════ */
  const prDepth = $('pr-depth');
  if (prDepth) {
    const PRESETS = [[10, '10 m'], [40, 'Scuba 40 m'], [200, '200 m'], [1000, '1,000 m'], [3800, 'Titanic'], [10935, 'Challenger Deep']];
    $('pr-presets').innerHTML = PRESETS.map(p => '<button type="button" class="oz-chip" data-pr="' + p[0] + '">' + p[1] + '</button>').join('');
    $('pr-presets').addEventListener('click', ev => { const b = ev.target.closest('[data-pr]'); if (b) { prDepth.value = b.dataset.pr; renderPressure(); } });
    function compare(kg) {
      if (kg >= 900) return 'about the weight of a small car balanced on your thumbnail';
      if (kg >= 300) return 'about the weight of a grand piano on your thumbnail';
      if (kg >= 60) return 'about the weight of an adult person on your thumbnail';
      if (kg >= 15) return 'about the weight of a large dog on your thumbnail';
      return 'a few kilograms on your thumbnail — your ears already feel it';
    }
    function renderPressure() {
      const z = Number(prDepth.value), P = pressureAtm(z), kg = P * 1.0332, vol = 1000 / P;
      $('pr-depth-out').textContent = fmt(z) + ' m';
      $('pr-atm').textContent = (P < 10 ? P.toFixed(1) : fmt(P)) + ' atm';
      $('pr-kg').textContent = (kg < 10 ? kg.toFixed(1) : fmt(kg)) + ' kg';
      $('pr-vol').textContent = vol >= 10 ? fmt(vol) + ' mL' : vol.toFixed(1) + ' mL';
      const r = Math.max(1.5, 80 * Math.cbrt(1 / P));
      $('pr-balloon').setAttribute('r', r.toFixed(2));
      $('pr-string').setAttribute('y1', (100 + r).toFixed(2));
      $('pr-readout').textContent = 'At ' + fmt(z) + ' m the water pushes with ' + (P < 10 ? P.toFixed(1) : fmt(P)) + ' atm — ' + compare(kg) + '. Surface air squeezes to 1/' + (P < 10 ? P.toFixed(1) : fmt(P)) + ' of its volume.';
    }
    prDepth.addEventListener('input', renderPressure);
    renderPressure();
  }

  /* ══════════ 6 · Temperature profiles ══════════ */
  const PROFILES = {
    tropical: { pts: [[0, 28], [50, 27.8], [75, 26], [100, 23], [150, 18], [200, 15], [300, 11.5], [500, 8], [700, 6], [1000, 4.5], [1500, 3.3], [2000, 2.6], [3000, 1.9]],
      mixed: 60, thermo: [60, 700], color: '#ffb060',
      note: 'Tropical seas have a warm, sunlit lid sitting on cold deep water. The sharp thermocline acts like a barrier: warm and cold water barely mix, so nutrients from below rarely reach the surface.' },
    temperate: { pts: [[0, 19], [20, 18.8], [40, 15], [60, 12], [100, 11], [200, 10], [500, 7.5], [1000, 4.5], [2000, 2.8], [3000, 2.2]],
      mixed: 25, thermo: [25, 80], color: '#7ed0f5',
      note: 'In mid-latitudes the summer thermocline is shallow and seasonal. Winter storms cool the surface and stir the water, mixing nutrients up — which feeds a big spring plankton bloom.' },
    polar: { pts: [[0, -1.8], [100, -1.7], [150, -0.5], [300, 0.8], [500, 0.9], [1000, 0.6], [2000, 0.2], [3000, -0.2]],
      mixed: 120, thermo: null, color: '#c8b4ff',
      note: 'Polar water is cold from top to bottom — there is no strong thermocline. Salty, near-freezing surface water is dense enough to sink, which is how the deep ocean gets filled with cold water.' },
  };
  const tpSvg = $('tp-svg');
  if (tpSvg) {
    const L = 64, R = 620, T = 30, B = 330, TMIN = -2, TMAX = 30, DMAX = 3000;
    const x = t => L + (t - TMIN) / (TMAX - TMIN) * (R - L);
    const y = d => T + d / DMAX * (B - T);
    const tempAt = (pts, d) => { for (let i = 1; i < pts.length; i++) if (d <= pts[i][0]) { const a = pts[i - 1], b = pts[i], f = (d - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * f; } return pts[pts.length - 1][1]; };
    let profile = 'tropical', probe = 300;
    tpSvg.setAttribute('tabindex', '0');
    function renderTemp() {
      const p = PROFILES[profile];
      let h = '';
      if (p.thermo) h += '<rect x="' + L + '" y="' + y(p.thermo[0]) + '" width="' + (R - L) + '" height="' + (y(p.thermo[1]) - y(p.thermo[0])) + '" class="oz-tp-thermo"/><text x="' + (R - 8) + '" y="' + (y((p.thermo[0] + p.thermo[1]) / 2) + 4) + '" text-anchor="end" class="oz-tp-band-label">Thermocline</text>';
      h += '<rect x="' + L + '" y="' + T + '" width="' + (R - L) + '" height="' + (y(p.mixed) - T) + '" class="oz-tp-mixed"/>';
      for (let t = 0; t <= 30; t += 5) h += '<line x1="' + x(t) + '" x2="' + x(t) + '" y1="' + T + '" y2="' + B + '" class="oz-tp-grid"/><text x="' + x(t) + '" y="' + (T - 10) + '" text-anchor="middle" class="oz-svg-axis">' + t + ' °C</text>';
      for (let d = 0; d <= DMAX; d += 500) h += '<line x1="' + L + '" x2="' + R + '" y1="' + y(d) + '" y2="' + y(d) + '" class="oz-tp-grid"/><text x="' + (L - 8) + '" y="' + (y(d) + 4) + '" text-anchor="end" class="oz-svg-axis">' + fmt(d) + ' m</text>';
      Object.keys(PROFILES).forEach(k => {
        if (k === profile) return;
        h += '<polyline class="oz-tp-other" points="' + PROFILES[k].pts.map(q => x(q[1]) + ',' + y(q[0])).join(' ') + '"/>';
      });
      const fine = []; for (let d = 0; d <= DMAX; d += 10) fine.push(x(tempAt(p.pts, d)).toFixed(1) + ',' + y(d).toFixed(1));
      h += '<polyline class="oz-tp-line" style="stroke:' + p.color + '" points="' + fine.join(' ') + '"/>';
      const tp = tempAt(p.pts, probe);
      h += '<line class="oz-tp-probe" x1="' + L + '" x2="' + R + '" y1="' + y(probe) + '" y2="' + y(probe) + '"/><circle cx="' + x(tp) + '" cy="' + y(probe) + '" r="6" fill="' + p.color + '" class="oz-tp-dot"/>';
      // Label sits on whichever side of the dot has more room, just below the probe line.
      const right = x(tp) < (L + R) / 2;
      h += '<text x="' + (right ? x(tp) + 12 : x(tp) - 12) + '" y="' + (y(probe) + 20) + '" text-anchor="' + (right ? 'start' : 'end') + '" class="oz-tp-probe-label">' + fmt(probe) + ' m · ' + tp.toFixed(1) + ' °C</text>';
      tpSvg.innerHTML = h;
      $('tp-readout').textContent = p.note;
    }
    function probeFromEvent(ev) {
      const r = tpSvg.getBoundingClientRect();
      const sy = (ev.clientY - r.top) / r.height * 360;
      probe = Math.round(clamp((sy - T) / (B - T) * DMAX, 0, DMAX) / 10) * 10;
      renderTemp();
    }
    tpSvg.addEventListener('pointermove', probeFromEvent);
    tpSvg.addEventListener('pointerdown', probeFromEvent);
    tpSvg.addEventListener('keydown', ev => {
      const step = ev.shiftKey ? 250 : 25;
      if (ev.key === 'ArrowDown') probe = clamp(probe + step, 0, DMAX);
      else if (ev.key === 'ArrowUp') probe = clamp(probe - step, 0, DMAX);
      else return;
      ev.preventDefault(); renderTemp();
    });
    document.querySelectorAll('[data-profile]').forEach(btn => btn.addEventListener('click', () => {
      profile = btn.dataset.profile;
      document.querySelectorAll('[data-profile]').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
      renderTemp();
    }));
    renderTemp();
  }

  /* ══════════ 7 · Marine snow (Martin curve) ══════════ */
  const MARTIN_B = 0.86;
  const flux = z => Math.pow(z / 100, -MARTIN_B);
  const snCanvas = $('sn-canvas');
  if (snCanvas) {
    const snDepth = $('sn-depth'), snSpeed = $('sn-speed');
    const ctx = snCanvas.getContext('2d');
    const DTOP = 100, DBOT = 6000;
    let CW = 320, CH = 380;
    function sizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      CW = snCanvas.clientWidth || 320; CH = snCanvas.clientHeight || 380;
      snCanvas.width = CW * dpr; snCanvas.height = CH * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    const yOf = d => 18 + (d - DTOP) / (DBOT - DTOP) * (CH - 30);
    // Each particle gets a depth where it is eaten, sampled so survival follows the Martin curve.
    const spawn = () => ({ x: 46 + Math.random() * (CW - 60), d: DTOP, eatAt: DTOP * Math.pow(Math.random(), -1 / MARTIN_B), r: 1.2 + Math.random() * 2.2, flash: 0 });
    let parts = Array.from({ length: 90 }, () => { const p = spawn(); p.d = DTOP + Math.random() * Math.min(p.eatAt - DTOP, DBOT - DTOP); return p; });
    function renderSnowStats() {
      const z = Number(snDepth.value), v = Number(snSpeed.value), f = flux(z), days = (z - DTOP) / v;
      $('sn-depth-out').textContent = fmt(z) + ' m';
      $('sn-speed-out').textContent = v + ' m/day';
      $('sn-flux').textContent = (f >= 0.1 ? Math.round(100 * f) : (100 * f).toFixed(1)) + '%';
      $('sn-days').textContent = days < 1 ? 'under a day' : days < 60 ? Math.round(days) + ' days' : Math.round(days / 30.4) + ' months';
      const of100 = 100 * f;
      $('sn-readout').textContent = 'Of every 100 bits of food sinking past 100 m, only about ' + (of100 >= 1 ? Math.round(of100) : of100.toFixed(1)) + ' reach ' + fmt(z) + ' m. Animals on the way eat or break down the rest — which is why food gets scarcer the deeper you go.';
    }
    snDepth.addEventListener('input', renderSnowStats);
    snSpeed.addEventListener('input', renderSnowStats);
    renderSnowStats();
    let visible = true, last = performance.now();
    if ('IntersectionObserver' in window) new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(snCanvas);
    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (!visible || document.hidden) return;
      const g = ctx.createLinearGradient(0, 0, 0, CH);
      g.addColorStop(0, '#0b3a78'); g.addColorStop(0.25, '#0a1838'); g.addColorStop(1, '#02050c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
      ctx.font = '600 10px system-ui, sans-serif'; ctx.fillStyle = 'rgba(190,225,240,.6)'; ctx.textAlign = 'left';
      [100, 1000, 2000, 3000, 4000, 5000, 6000].forEach(d => { ctx.fillText(d === 100 ? '100 m' : fmt(d), 4, yOf(d) + 3); });
      const z = Number(snDepth.value), lineY = yOf(z);
      ctx.strokeStyle = 'rgba(115,223,192,.85)'; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(40, lineY); ctx.lineTo(CW, lineY); ctx.stroke(); ctx.setLineDash([]);
      // Visual speed is exaggerated: 100 m/day ≈ 800 m per second on screen.
      const step = reducedMotion ? 0 : Number(snSpeed.value) * 8 * dt;
      parts.forEach((p, i) => {
        if (p.flash > 0) {
          p.flash -= dt;
          ctx.fillStyle = 'rgba(255,209,102,' + clamp(p.flash * 3, 0, 1) + ')';
          ctx.beginPath(); ctx.arc(p.x, yOf(p.d), 4 * (1 - p.flash), 0, Math.PI * 2); ctx.fill();
          if (p.flash <= 0) parts[i] = spawn();
          return;
        }
        p.d += step * (0.7 + p.r * 0.15);
        if (p.d >= p.eatAt) { p.d = p.eatAt; p.flash = 0.35; }
        if (p.d >= DBOT) { parts[i] = spawn(); return; }
        ctx.fillStyle = p.d > z ? 'rgba(160,255,220,.95)' : 'rgba(225,240,250,.75)';
        ctx.beginPath(); ctx.arc(p.x, yOf(p.d), p.r, 0, Math.PI * 2); ctx.fill();
      });
    }
    requestAnimationFrame(frame);
  }

  /* ══════════ 8 · Adaptation matching ══════════ */
  const ADAPT = [
    { animal: 'Marine hatchetfish', zone: 'Twilight zone', trait: 'Rows of lights on its belly match the faint glow from above, erasing its shadow.',
      why: '<strong>Counterillumination.</strong> Predators below look up for dark silhouettes. By glowing as brightly as the light filtering down, the hatchetfish blends into it.' },
    { animal: 'Deep-sea anglerfish', zone: 'Midnight zone', trait: 'A glowing lure, lit by bacteria, draws prey right up to its mouth.',
      why: '<strong>Bioluminescent bait.</strong> In a place with no sunlight, any light is interesting. The female’s lure holds glowing bacteria; she waits instead of wasting energy hunting.' },
    { animal: 'Stoplight loosejaw', zone: 'Midnight zone', trait: 'Makes and sees red light — a private searchlight most prey can’t detect.',
      why: '<strong>Red bioluminescence.</strong> Most deep animals can’t see red because no red sunlight reaches them. This dragonfish lights up prey without being noticed.' },
    { animal: 'Pelican eel', zone: 'Midnight zone', trait: 'An enormous, stretchy mouth lets it catch whatever rare meal drifts past.',
      why: '<strong>Big mouth, rare meals.</strong> Food is scarce in the dark, so it pays to be able to grab almost anything — including whole mouthfuls of shrimp.' },
    { animal: 'Giant squid', zone: 'Midnight zone', trait: 'Eyes up to about 27 cm across, among the largest of any animal.',
      why: '<strong>Giant eyes.</strong> Huge eyes collect the faint glows that big animals stir up as they move — likely an early warning for approaching sperm whales.' },
    { animal: 'Mariana snailfish', zone: 'Hadal trench', trait: 'Soft body, no swim bladder, and TMAO that keeps its proteins working at 800 atm.',
      why: '<strong>Pressure-proof chemistry.</strong> With no air space to crush and protein-protecting TMAO, it lives near 8,000 m — close to the deepest any fish can go.' },
  ];
  const animalsEl = $('ad-animals'), traitsEl = $('ad-traits');
  if (animalsEl) {
    const order = ADAPT.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    animalsEl.innerHTML = '<p class="oz-match-head">Animal</p>' + ADAPT.map((a, i) => '<button type="button" class="oz-match-btn" data-animal="' + i + '" aria-pressed="false"><strong>' + a.animal + '</strong><small>' + a.zone + '</small></button>').join('');
    traitsEl.innerHTML = '<p class="oz-match-head">Adaptation</p>' + order.map(i => '<button type="button" class="oz-match-btn" data-trait="' + i + '" aria-pressed="false">' + ADAPT[i].trait + '</button>').join('');
    let pickA = null, pickT = null, matched = 0;
    function check() {
      if (pickA == null || pickT == null) return;
      const a = animalsEl.querySelector('[data-animal="' + pickA + '"]'), t = traitsEl.querySelector('[data-trait="' + pickT + '"]');
      if (pickA === pickT) {
        [a, t].forEach(b => { b.classList.add('done'); b.disabled = true; b.setAttribute('aria-pressed', 'false'); });
        matched++;
        const log = document.createElement('p');
        log.innerHTML = '✓ <em>' + ADAPT[pickA].animal + '</em> — ' + ADAPT[pickA].why;
        $('ad-log').prepend(log);
        $('ad-readout').textContent = matched === ADAPT.length ? 'All 6 matched! Every one of these is a solution to darkness, scarce food, or pressure.' : matched + ' of 6 matched.';
      } else {
        [a, t].forEach(b => { b.classList.add('miss'); b.setAttribute('aria-pressed', 'false'); setTimeout(() => b.classList.remove('miss'), 600); });
        $('ad-readout').textContent = 'Not that one — think about which problem (darkness, food, pressure) the trait solves. ' + matched + ' of 6 matched.';
      }
      pickA = pickT = null;
    }
    animalsEl.addEventListener('click', ev => {
      const b = ev.target.closest('[data-animal]'); if (!b || b.disabled) return;
      animalsEl.querySelectorAll('[data-animal]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      pickA = Number(b.dataset.animal); check();
    });
    traitsEl.addEventListener('click', ev => {
      const b = ev.target.closest('[data-trait]'); if (!b || b.disabled) return;
      traitsEl.querySelectorAll('[data-trait]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      pickT = Number(b.dataset.trait); check();
    });
  }

  /* ══════════ 9 · Explorers timeline ══════════ */
  const DIVES = [
    { year: 1934, depth: 923, who: 'William Beebe & Otis Barton', craft: 'Bathysphere',
      text: 'A hollow steel ball lowered on a cable off Bermuda. Through a quartz window, Beebe became the first scientist to watch living bioluminescence in the deep.' },
    { year: 1960, depth: 10916, who: 'Jacques Piccard & Don Walsh', craft: 'Bathyscaphe Trieste',
      text: 'The first humans to reach Challenger Deep. Trieste floated on a huge tank of gasoline, which barely compresses under pressure. They spent about 20 minutes on the bottom.' },
    { year: 1977, depth: 2500, who: 'Scientists aboard Alvin', craft: 'Submersible Alvin',
      text: 'At the Galápagos Rift they found hydrothermal vents crowded with clams and tube worms — life powered by chemosynthesis, not sunlight. It changed ideas about where life can exist.' },
    { year: 2012, depth: 10908, who: 'James Cameron', craft: 'Deepsea Challenger',
      text: 'The first solo dive to Challenger Deep, collecting samples and filming the trench floor.' },
    { year: 2019, depth: 10925, who: 'Victor Vescovo', craft: 'Limiting Factor',
      text: 'The Five Deeps Expedition reached the deepest point of all five oceans. The reusable sub has since carried many more people to Challenger Deep.' },
    { year: 2022, depth: 8336, who: 'Robotic lander camera', craft: 'Izu–Ogasawara Trench',
      text: 'Filmed a young snailfish at 8,336 m — the deepest fish ever recorded, right near the depth limit predicted for fish.' },
  ];
  const tl = $('ex-timeline');
  if (tl) tl.innerHTML = DIVES.map(d => '<li class="oz-tl-item"><span class="oz-tl-year">' + d.year + '</span><div class="oz-tl-body"><h3>' + d.who + ' <small>· ' + d.craft + '</small></h3><p class="oz-tl-depth">' + (d.depth > 10000 ? '≈ ' : '') + fmt(d.depth) + ' m</p><p>' + d.text + '</p>' + diveButton(d.depth, 'Dive to ' + fmt(d.depth) + ' m') + '</div></li>').join('');

  /* ══════════ Quiz ══════════ */
  const QUIZ = [
    { q: 'Which color of sunlight disappears first as you go deeper in clear ocean water?', options: ['Blue', 'Red', 'Green', 'Violet'], a: 1,
      why: 'Water absorbs long red wavelengths fastest. Blue travels farthest, which is why deep water looks blue.' },
    { q: 'About how much pressure would you feel at 30 m deep in seawater?', options: ['1 atm', '3 atm', '4 atm', '30 atm'], a: 2,
      why: '1 atm from the air plus about 1 atm for every 10 m of water: 1 + 3 = 4 atm.' },
    { q: 'Where do most animals in the midnight zone get their food?', options: ['Plants that grow in the dark', 'Marine snow and other food sinking from above', 'Heat from the seafloor', 'Sunlight filtered through the water'], a: 1,
      why: 'No plants can grow without light, so most deep food is surface material that sinks down as marine snow — or animals that ate it.' },
    { q: 'What is the thermocline?', options: ['A layer where temperature drops quickly with depth', 'The warm surface layer mixed by wind', 'The point where water freezes', 'A current along the seafloor'], a: 0,
      why: 'The thermocline sits below the mixed layer; temperature changes fast there, then barely changes in the deep ocean.' },
    { q: 'Why does a bright red shrimp look black at 500 m?', options: ['Red animals absorb blue light and glow', 'There is no red light left for it to reflect', 'Pressure changes its color', 'Its eyes are too small to see red'], a: 1,
      why: 'Color is reflected light. With no red light reaching it, the shrimp reflects almost nothing, so it looks black — great camouflage.' },
    { q: 'Why does a hatchetfish have lights on its belly?', options: ['To lure prey upward', 'To keep warm', 'To match the faint light from above so predators below can’t see its silhouette', 'To signal to fish on the seafloor'], a: 2,
      why: 'This is counterillumination: glowing to match the downwelling light erases its shadow.' },
    { q: 'Why have no fish been found below about 8,400 m?', options: ['The pressure would crush them flat', 'There is no water that deep', 'It is too cold for blood to flow', 'Their proteins would need so much protective TMAO that their bodies couldn’t balance water'], a: 3,
      why: 'Without air spaces, fish aren’t “crushed.” The limit is chemistry: the TMAO needed to protect proteins keeps rising with depth until it becomes unworkable.' },
  ];
  const quizEl = $('oz-quiz-list');
  if (quizEl) {
    let answered = 0, correct = 0;
    quizEl.innerHTML = QUIZ.map((item, qi) => '<div class="oz-q" data-q="' + qi + '"><p>' + (qi + 1) + '. ' + item.q + '</p><div class="oz-q-opts" role="group" aria-label="Question ' + (qi + 1) + ' choices">' +
      item.options.map((o, oi) => '<button type="button" class="oz-q-opt" data-o="' + oi + '">' + o + '</button>').join('') + '</div><p class="oz-q-fb" aria-live="polite"></p></div>').join('');
    quizEl.addEventListener('click', ev => {
      const btn = ev.target.closest('.oz-q-opt'); if (!btn || btn.disabled) return;
      const box = btn.closest('.oz-q'), item = QUIZ[Number(box.dataset.q)], pick = Number(btn.dataset.o);
      box.querySelectorAll('.oz-q-opt').forEach(b => { b.disabled = true; if (Number(b.dataset.o) === item.a) b.classList.add('right'); });
      if (pick !== item.a) btn.classList.add('wrong'); else correct++;
      answered++;
      const fb = box.querySelector('.oz-q-fb');
      fb.textContent = (pick === item.a ? 'Correct. ' : 'Not quite. ') + item.why;
      fb.classList.add(pick === item.a ? 'right' : 'wrong');
      if (answered === QUIZ.length) $('oz-quiz-score').textContent = 'Score: ' + correct + ' of ' + QUIZ.length + '.';
    });
  }
})();
