/* Seeing Light Lab (lessons/design/seeing-light-lab.html).
   1. Light path: lamp -> ball -> eye, the dark closet, and the old eye-beam idea.
   2. Makes light / bounces light sorting cards.
   3. Pupil size from scene luminance (Moon & Spencer 1944), drawn at real scale.
   4. Retinal image: rays through the eye's nodal point onto a curved retina.
   5. Lit scene: cone/rod (photopic/scotopic) blend, rod blur and photon grain, Sobel edge view.
   6. Edges -> shapes -> things builder.
   Everything redraws on input only; the CSS ray dashes pause when their stage is off-screen. */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function press(buttons, active) {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === active)));
  }

  // Light levels shared by the pupil and scene sims. L = typical scene luminance, cd/m².
  const LEVELS = [
    { name: 'Starlight', icon: '✨', L: 0.001 },
    { name: 'Full moon', icon: '🌕', L: 0.03 },
    { name: 'Candle-lit room', icon: '🕯️', L: 2 },
    { name: 'Classroom', icon: '🏫', L: 100 },
    { name: 'Cloudy day outside', icon: '☁️', L: 2000 },
    { name: 'Sunshine', icon: '☀️', L: 20000 }
  ];

  /* ---------- 1. Light path ---------- */
  function initPath() {
    const stage = $('#path-stage');
    if (!stage) return;
    const svg = $('svg', stage);
    const rays = $('#path-rays', svg);
    const beams = $('#path-beams', svg);
    const dark = $('#path-dark', svg);
    const glow = $('#path-glow', svg);
    const bulb = $('#path-bulb', svg);
    const caption = $('#path-caption');
    const buttons = $$('[data-path]');
    svg.appendChild(beams); // beams draw above the darkness

    const CAPTIONS = {
      on: 'The lamp makes light. Light bounces off the ball, and some of it goes into your eye. You see the ball!',
      off: 'Lamp off: no light lands on the ball, so none bounces into your eye. You can\'t see it, even with your eyes wide open.',
      beams: 'If eyes sent out beams, they would light up the ball and you could see it in a dark closet. You can\'t, so this old idea is wrong.'
    };

    function set(mode) {
      const lit = mode === 'on';
      rays.hidden = !lit;
      beams.hidden = mode !== 'beams';
      glow.setAttribute('opacity', lit ? '1' : '0');
      bulb.setAttribute('fill', lit ? '#fde047' : '#475569');
      dark.setAttribute('opacity', lit ? '0' : '0.9');
      caption.textContent = CAPTIONS[mode];
      press(buttons, buttons.find((b) => b.dataset.path === mode));
    }
    buttons.forEach((b) => b.addEventListener('click', () => set(b.dataset.path)));

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((e) => stage.classList.toggle('is-paused', !e.isIntersecting));
      }, { rootMargin: '200px' }).observe(stage);
    }
  }

  /* ---------- 2. Makes light or bounces light ---------- */
  const SORT_ITEMS = [
    { icon: '☀️', name: 'The Sun', makes: true, why: 'The Sun makes its own light. It is a star, a giant ball of hot glowing gas.' },
    { icon: '🌕', name: 'The Moon', makes: false, why: 'Tricky one! The Moon is rock. Moonlight is sunlight bouncing off it.' },
    { icon: '💡', name: 'A lamp', makes: true, why: 'Electricity makes the bulb glow.' },
    { icon: '🪞', name: 'A mirror', makes: false, why: 'A mirror bounces light very neatly, but it makes none. In the dark, a mirror is dark.' },
    { icon: '🕯️', name: 'A candle flame', makes: true, why: 'Burning makes the flame hot enough to glow.' },
    { icon: '📕', name: 'A book', makes: false, why: 'You can read a book only when light bounces off its pages.' },
    { icon: '✨', name: 'A firefly', makes: true, why: 'Fireflies make light with a chemical reaction in their bodies.' },
    { icon: '🐈', name: 'A cat\'s shiny eyes', makes: false, why: 'A cat\'s eyes glow in a flashlight beam because a mirror-like layer bounces the light back. In total darkness they don\'t glow.' }
  ];

  function initSort() {
    const host = $('#sort-game');
    if (!host) return;
    SORT_ITEMS.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'sl-sort-card';
      card.innerHTML = `
        <div class="sl-sort-name"><span aria-hidden="true">${item.icon}</span>${item.name}</div>
        <div class="sl-sort-btns">
          <button class="sl-btn" type="button" aria-pressed="false" data-answer="makes">Makes light</button>
          <button class="sl-btn" type="button" aria-pressed="false" data-answer="bounces">Bounces light</button>
        </div>
        <p class="sl-sort-why" aria-live="polite"></p>`;
      const btns = $$('button', card);
      const why = $('.sl-sort-why', card);
      btns.forEach((b) => b.addEventListener('click', () => {
        const right = (b.dataset.answer === 'makes') === item.makes;
        press(btns, b);
        card.classList.toggle('is-right', right);
        card.classList.toggle('is-wrong', !right);
        why.textContent = (right ? '✅ Yes! ' : '❌ Not quite. ') + item.why;
      }));
      host.appendChild(card);
    });
  }

  /* ---------- 3. Pupil ---------- */
  // Moon & Spencer (1944): D = 4.9 − 3·tanh(0.4·log10 B) mm, B in blondels (= π·cd/m²).
  const pupilMm = (L) => 4.9 - 3 * Math.tanh(0.4 * Math.log10(Math.PI * L));
  const PUPIL_CAPTIONS = [
    'Starlight: the pupil opens as wide as it can to catch every bit of light.',
    'Moonlight: still very wide. Your eyes need all the light they can get.',
    'Candlelight: the pupil is about halfway open.',
    'Indoors the pupil is fairly small. There is plenty of light to see by.',
    'Outside on a cloudy day the pupil is small.',
    'Bright sunshine: the pupil is as small as it gets, about as wide as the tip of a pencil lead.'
  ];

  function initPupil() {
    const slider = $('#pupil-slider');
    if (!slider) return;
    const pupil = $('#sl-pupil');
    const PX_PER_MM = 4; // the iris is drawn 48 px in radius = 12 mm across
    const sunD = pupilMm(LEVELS[LEVELS.length - 1].L);
    let lastR = null;

    function update() {
      const i = Number(slider.value);
      const level = LEVELS[i];
      const d = pupilMm(level.L);
      const r = (d / 2) * PX_PER_MM;
      // The reflex shrinks the pupil in about a second; widening takes several.
      const widening = lastR !== null && r > lastR;
      pupil.style.transitionDuration = widening ? '3s' : '0.9s';
      pupil.style.transitionDelay = lastR === null ? '0s' : '0.25s';
      pupil.setAttribute('r', r.toFixed(2));
      pupil.style.r = `${r.toFixed(2)}px`;
      lastR = r;

      const ratio = (d / sunD) ** 2;
      $('#pupil-scene').textContent = `${level.icon} ${level.name}`;
      $('#pupil-mm').textContent = `about ${d.toFixed(1)} mm`;
      $('#pupil-area').innerHTML = ratio < 1.05
        ? 'the least <small>(a sunny-day pupil)</small>'
        : `${ratio < 3 ? ratio.toFixed(1) : Math.round(ratio)}× <small>a sunny-day pupil</small>`;
      $('#pupil-caption').textContent = PUPIL_CAPTIONS[i];
      $('#pupil-slider-label').textContent = level.name;
      slider.setAttribute('aria-valuetext', `${level.name}: pupil about ${d.toFixed(1)} millimetres`);
    }
    slider.addEventListener('input', update);
    update();
  }

  /* ---------- 4. Retinal image ---------- */
  function initCamera() {
    const slider = $('#camera-slider');
    if (!slider) return;
    const C = { x: 480, y: 150 }; // eye centre
    const R = 91; // retina radius (inside the eye wall)
    const N = { x: 414, y: 150 }; // nodal point, just behind the lens
    const TREE_H = 120;
    const BASE_Y = 210; // tree spans y 90..210, centred on the eye's axis
    const tree = $('#cam-tree');
    const image = $('#cam-image');
    const rayTop = $('#cam-ray-top');
    const rayBot = $('#cam-ray-bot');

    // Retina: the back two-thirds of the eye wall.
    const arc = (a) => `${(C.x + R * Math.cos(a)).toFixed(1)} ${(C.y + R * Math.sin(a)).toFixed(1)}`;
    $('#cam-retina').setAttribute('d', `M ${arc(-1.15)} A ${R} ${R} 0 0 1 ${arc(1.15)}`);

    // Follow the ray from P through N until it meets the retina circle.
    function onRetina(P) {
      let dx = N.x - P.x;
      let dy = N.y - P.y;
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      const fx = N.x - C.x;
      const fy = N.y - C.y;
      const b = fx * dx + fy * dy;
      const c = fx * fx + fy * fy - R * R;
      const t = -b + Math.sqrt(b * b - c);
      return { x: N.x + t * dx, y: N.y + t * dy };
    }
    const setLine = (el, a, b) => {
      el.setAttribute('x1', a.x); el.setAttribute('y1', a.y);
      el.setAttribute('x2', b.x.toFixed(1)); el.setAttribute('y2', b.y.toFixed(1));
    };

    function update() {
      const t = Number(slider.value) / 100;
      const x = 250 - t * 215;
      const top = { x, y: BASE_Y - TREE_H };
      const bot = { x, y: BASE_Y };
      const iTop = onRetina(top);
      const iBot = onRetina(bot);
      tree.setAttribute('transform', `translate(${x.toFixed(1)} ${BASE_Y})`);
      setLine(rayTop, top, iTop);
      setLine(rayBot, bot, iBot);

      // Draw the image with its base at iBot and its tip at iTop: flipped and shrunk.
      const k = (iBot.y - iTop.y) / TREE_H; // negative = upside down
      const ix = (iTop.x + iBot.x) / 2 - 3;
      image.setAttribute('transform', `translate(${ix.toFixed(1)} ${iBot.y.toFixed(1)}) scale(${(Math.abs(k) * 0.45).toFixed(3)} ${k.toFixed(3)})`);

      const shrink = Math.round(1 / Math.abs(k));
      $('#camera-caption').textContent = t < 0.35
        ? 'Close up: the tree\'s top lands at the bottom of the retina. The picture is upside down, and big.'
        : t < 0.7
          ? `Upside down again, and about ${shrink} times smaller than the tree in this drawing.`
          : 'Far away: the picture on your retina is tiny. That\'s why faraway things look small!';
      slider.setAttribute('aria-valuetext', t < 0.35 ? 'near' : t < 0.7 ? 'middle distance' : 'far');
    }
    slider.addEventListener('input', update);
    update();
  }

  /* ---------- 5. Lit scene: cones, rods and edges ---------- */
  const SCENE = {
    // Display gain (linear), rod blur (px) and photon grain for each LEVEL.
    gain: [0.05, 0.12, 0.4, 0.8, 1, 1.12],
    blur: [2.4, 1.4, 0.4, 0, 0, 0],
    grain: [0.05, 0.025, 0.006, 0, 0, 0],
    captions: [
      'Starlight: only your rods work. No colors at all, and everything is grainy and blurry.',
      'Moonlight: still mostly rods. The red apple looks almost black, but the blue cup looks light gray.',
      'Candlelight: your cones are waking up. Colors come back, a little dull.',
      'Classroom light: cones see every color, and the edges are sharp.',
      'Cloudy day outside: bright, clear colors and strong edges.',
      'Sunshine: strong edges everywhere… except around the camouflaged owl!'
    ]
  };

  const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

  function drawSceneBase(ctx, w, h) {
    ctx.fillStyle = 'rgb(150, 140, 124)'; // wall
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgb(112, 78, 50)'; // shelf
    ctx.fillRect(0, 250, w, h - 250);
    ctx.fillStyle = 'rgb(84, 58, 38)';
    ctx.fillRect(0, 250, w, 8);

    // red apple
    ctx.fillStyle = 'rgb(196, 28, 30)';
    ctx.beginPath();
    ctx.arc(104, 206, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgb(80, 50, 20)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(104, 166); ctx.lineTo(110, 146);
    ctx.stroke();

    // green leaf
    ctx.save();
    ctx.translate(232, 222);
    ctx.rotate(-0.5);
    ctx.fillStyle = 'rgb(58, 150, 48)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 52, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgb(30, 90, 30)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-50, 0); ctx.lineTo(50, 0);
    ctx.stroke();
    ctx.restore();

    // blue cup
    ctx.fillStyle = 'rgb(38, 88, 204)';
    ctx.fillRect(330, 170, 72, 80);
    ctx.strokeStyle = 'rgb(38, 88, 204)';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.arc(406, 210, 20, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // yellow star on the wall
    ctx.fillStyle = 'rgb(242, 200, 36)';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 18 : 42;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(470 + r * Math.cos(a), 92 + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fill();

    // gray owl, nearly the wall's brightness (camouflage)
    ctx.fillStyle = 'rgb(144, 141, 132)';
    ctx.beginPath();
    ctx.ellipse(560, 200, 38, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(560, 140, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(536, 124); ctx.lineTo(540, 100); ctx.lineTo(552, 116);
    ctx.moveTo(584, 124); ctx.lineTo(580, 100); ctx.lineTo(568, 116);
    ctx.fill();
    ctx.fillStyle = 'rgb(128, 125, 116)';
    ctx.beginPath();
    ctx.arc(549, 140, 7, 0, Math.PI * 2);
    ctx.arc(571, 140, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  function initScene() {
    const canvas = $('#scene-canvas');
    const slider = $('#scene-slider');
    if (!canvas || !slider) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = canvas.width;
    const h = canvas.height;
    const base = document.createElement('canvas');
    base.width = w; base.height = h;
    drawSceneBase(base.getContext('2d'), w, h);
    const work = document.createElement('canvas');
    work.width = w; work.height = h;
    const wctx = work.getContext('2d', { willReadFrequently: true });
    const viewButtons = $$('[data-scene-view]');
    let view = 'eye';

    // Seeded noise so the grain is the same for a given light level.
    let seed = 1;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());

    function render() {
      const i = Number(slider.value);
      const level = LEVELS[i];
      // 0 = rods only (scotopic, below ~0.01 cd/m²), 1 = cones only (photopic, above ~5 cd/m²).
      // Squared so cones fade in slowly through the mesopic range: moonlight is nearly colorless.
      const m = Math.min(1, Math.max(0, (Math.log10(level.L) + 2) / 2.7)) ** 2;
      const gain = SCENE.gain[i];
      const grain = SCENE.grain[i];

      wctx.clearRect(0, 0, w, h);
      wctx.filter = SCENE.blur[i] ? `blur(${SCENE.blur[i]}px)` : 'none';
      wctx.drawImage(base, 0, 0);
      wctx.filter = 'none';
      const img = wctx.getImageData(0, 0, w, h);
      const px = img.data;
      const lum = new Float32Array(w * h);
      seed = 7 + i;

      for (let p = 0, q = 0; p < px.length; p += 4, q++) {
        const r = toLin(px[p] / 255);
        const g = toLin(px[p + 1] / 255);
        const b = toLin(px[p + 2] / 255);
        const X = 0.4124 * r + 0.3576 * g + 0.1805 * b;
        const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const Z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
        // Scotopic luminance (Larson et al. 1997), scaled so white matches.
        const Ys = Math.max(0, 0.36169 * Z + 1.18214 * Y - 0.80498 * X) / 0.8109;
        let n = 0;
        if (grain) n = gauss() * grain;
        const out = [r, g, b].map((c) => {
          const v = (m * c + (1 - m) * Ys) * gain;
          return Math.min(1, Math.max(0, toSrgb(Math.min(1, v)) + n));
        });
        px[p] = out[0] * 255;
        px[p + 1] = out[1] * 255;
        px[p + 2] = out[2] * 255;
        lum[q] = 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2];
      }

      if (view === 'edges') {
        // Sobel gradient magnitude: bright where brightness changes quickly.
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const o = (y * w + x) * 4;
            let mag = 0;
            if (x > 0 && y > 0 && x < w - 1 && y < h - 1) {
              const at = (dx, dy) => lum[(y + dy) * w + x + dx];
              const gx = at(1, -1) + 2 * at(1, 0) + at(1, 1) - at(-1, -1) - 2 * at(-1, 0) - at(-1, 1);
              const gy = at(-1, 1) + 2 * at(0, 1) + at(1, 1) - at(-1, -1) - 2 * at(0, -1) - at(1, -1);
              mag = Math.min(1, Math.hypot(gx, gy) * 2.2);
            }
            px[o] = px[o + 1] = px[o + 2] = mag * 255;
          }
        }
      }
      ctx.putImageData(img, 0, 0);

      $('#scene-slider-label').textContent = `${level.icon} ${level.name}`;
      $('#scene-caption').textContent = view === 'edges'
        ? `Edge view, ${level.name.toLowerCase()}: white lines are where bright meets dark.${i < 2 ? ' In dim light the edges are weak and speckly.' : ''}`
        : SCENE.captions[i];
      slider.setAttribute('aria-valuetext', level.name);
    }

    slider.addEventListener('input', render);
    viewButtons.forEach((b) => b.addEventListener('click', () => {
      view = b.dataset.sceneView;
      press(viewButtons, b);
      render();
    }));
    render();
  }

  /* ---------- 6. Edges -> shapes -> things ---------- */
  const PICTURES = {
    cat: {
      name: 'A cat!',
      recipe: '1 circle (head) + 2 triangles (ears) + 2 small circles (eyes) + 1 triangle (nose)',
      shapes: [
        ['circle', { cx: 100, cy: 115, r: 45 }, '#f59e0b'],
        ['polygon', { points: '66,88 76,46 104,72' }, '#d97706'],
        ['polygon', { points: '96,72 124,46 134,88' }, '#d97706'],
        ['circle', { cx: 84, cy: 108, r: 6 }, '#0f172a'],
        ['circle', { cx: 116, cy: 108, r: 6 }, '#0f172a'],
        ['polygon', { points: '93,122 107,122 100,131' }, '#ef4444']
      ]
    },
    house: {
      name: 'A house!',
      recipe: '1 rectangle (walls) + 1 triangle (roof) + 1 rectangle (door) + 1 square (window)',
      shapes: [
        ['rect', { x: 55, y: 90, width: 90, height: 75 }, '#3b82f6'],
        ['polygon', { points: '45,90 100,45 155,90' }, '#dc2626'],
        ['rect', { x: 88, y: 120, width: 26, height: 45 }, '#fbbf24'],
        ['rect', { x: 62, y: 102, width: 18, height: 18 }, '#e0f2fe']
      ]
    },
    boat: {
      name: 'A sailboat!',
      recipe: '1 trapezoid (hull) + 2 triangles (sails) + 1 line (mast)',
      shapes: [
        ['path', { d: 'M40 130 L160 130 L140 160 L60 160 Z' }, '#b45309'],
        ['line', { x1: 100, y1: 130, x2: 100, y2: 40 }, '#78350f'],
        ['polygon', { points: '104,45 150,120 104,120' }, '#38bdf8'],
        ['polygon', { points: '96,55 58,120 96,120' }, '#bae6fd']
      ]
    },
    tree: {
      name: 'A pine tree!',
      recipe: '3 triangles (branches) + 1 rectangle (trunk)',
      shapes: [
        ['rect', { x: 90, y: 145, width: 20, height: 35 }, '#78350f'],
        ['polygon', { points: '100,100 40,150 160,150' }, '#22c55e'],
        ['polygon', { points: '100,70 52,118 148,118' }, '#16a34a'],
        ['polygon', { points: '100,38 62,86 138,86' }, '#15803d']
      ]
    }
  };

  function initShapes() {
    const svg = $('#shape-svg');
    if (!svg) return;
    const shapeButtons = $$('[data-shape]');
    const stepButtons = $$('[data-step]');
    const breakdown = $('#shape-breakdown');
    let current = 'cat';
    let step = 'thing';

    function render() {
      const pic = PICTURES[current];
      svg.replaceChildren();
      pic.shapes.forEach(([tag, attrs, fill]) => {
        const el = document.createElementNS(SVG_NS, tag);
        Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
        if (step === 'edges') {
          el.setAttribute('fill', 'none');
          el.setAttribute('stroke', '#1e293b');
          el.setAttribute('stroke-width', '2.5');
          el.setAttribute('stroke-linejoin', 'round');
        } else if (tag === 'line') {
          el.setAttribute('stroke', step === 'shapes' ? '#64748b' : fill);
          el.setAttribute('stroke-width', '4');
        } else {
          el.setAttribute('fill', step === 'shapes' ? '#94a3b8' : fill);
          if (step === 'shapes') {
            el.setAttribute('stroke', '#334155');
            el.setAttribute('stroke-width', '1.5');
          }
        }
        svg.appendChild(el);
      });
      breakdown.textContent = step === 'edges'
        ? 'Only edges. What could it be?'
        : step === 'shapes'
          ? `Shapes: ${pic.recipe.replace(/ \([^)]*\)/g, '')}. Getting closer…`
          : `${pic.name} ${pic.recipe}.`;
      svg.setAttribute('aria-label', step === 'thing' ? `${pic.name} Made from ${pic.recipe}.` : breakdown.textContent);
    }

    shapeButtons.forEach((b) => b.addEventListener('click', () => {
      current = b.dataset.shape;
      press(shapeButtons, b);
      step = 'edges';
      press(stepButtons, stepButtons[0]);
      render();
    }));
    stepButtons.forEach((b) => b.addEventListener('click', () => {
      step = b.dataset.step;
      press(stepButtons, b);
      render();
    }));
    render();
  }

  function init() {
    initPath();
    initSort();
    initPupil();
    initCamera();
    initScene();
    initShapes();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
