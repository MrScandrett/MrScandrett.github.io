/**
 * canvas-bg.js — Animated site canvas backgrounds
 * Settings panel (nav-mobile.js) writes the preference; this file reads it
 * and renders the selected background behind shared ClassroomOS pages.
 *
 * Modes: 'none' | 'mesh' | 'particles' | 'aurora' | 'petals' | 'hive' | 'mandelbrot' | 'lavalamp'
 * Storage key: classroomos-canvas-bg
 * Change event: classroomos:canvasbgchange  →  { detail: { bg: 'mesh' } }
 */

(function () {
  if (window.ClassroomOSCanvasBg && window.ClassroomOSCanvasBg.__ready) return;

  var STORAGE_KEY  = 'classroomos-canvas-bg';
  var CHANGE_EVENT = 'classroomos:canvasbgchange';
  var scriptSrc = (document.currentScript && document.currentScript.src) || '';
  var scriptBase = scriptSrc ? scriptSrc.replace(/\/assets\/js\/[^/]*$/, '/') : '';
  var BEE_SPRITE = scriptBase ? scriptBase + 'assets/images/sprites/bee.png' : 'assets/images/sprites/bee.png';
  var STYLE_ID = 'classroomos-canvas-bg-style';

  var canvas, ctx, raf;
  var w = 0, h = 0, t = 0;
  var currentBg = 'none';
  var blobs = null, pts = null, petals = null, bees = null, mandel = null, lavaBlobs = null, lavaBubbles = null;
  var lavaMouse = { x: -1000, y: -1000, vx: 0, vy: 0, lastX: -1000, lastY: -1000, active: false };
  var beeImg = null, beeImgReady = false;

  /* Theme → the falling/crawling background it debuts with, until a
   * visitor picks their own from the settings panel (for that theme). */
  var THEME_DEFAULT_BG = { sakura: 'petals', topaz: 'hive', mandelbrot: 'mandelbrot', lavalamp: 'lavalamp' };

  /* ── Storage ─────────────────────────────────────────────────── */
  function currentTheme() {
    return document.documentElement.dataset.theme || 'day';
  }

  /* Per-theme picks, e.g. { topaz: 'mesh' } — a choice made under one
   * theme shouldn't stick around after switching to another. */
  function readPrefs() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) { return {}; }
  }

  function bgForTheme(theme) {
    return readPrefs()[theme] || THEME_DEFAULT_BG[theme] || 'particles';
  }

  /* Site-level "Reduce motion" toggle in the settings panel — independent
   * of (and checked in addition to) the OS prefers-reduced-motion query. */
  function reducedMotionOverride() {
    try {
      return localStorage.getItem('classroomos-reduced-motion') === 'on';
    } catch (e) {
      return false;
    }
  }

  /* ── Theme-aware accent colour ───────────────────────────────── */
  // Falls back to the Day theme's accent when this page never loaded
  // theme-registry.js (canvas-bg.js gets injected onto pages — some lesson
  // templates — that don't otherwise need the theme registry).
  var DAY_ACCENT_RGB = [0, 113, 227];

  function accentRGB() {
    var theme = document.documentElement.dataset.theme || 'day';
    var registry = window.ClassroomOSThemeRegistry;
    return registry ? registry.getAccentRGB(theme) : DAY_ACCENT_RGB;
  }

  function rgba(rgb, a) {
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')';
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var num = parseInt(hex, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  /* Falls back to the Mandelbrot theme's own palette when this page never
   * loaded theme-registry.js — same reasoning as accentRGB() above. */
  var MANDELBROT_PALETTE_HEX = ['#05010f', '#6a0dad', '#ff8c00', '#ffd23f'];

  function themePalette() {
    var theme = document.documentElement.dataset.theme || 'day';
    var registry = window.ClassroomOSThemeRegistry;
    var swatch = (registry && registry.getSwatch(theme)) || MANDELBROT_PALETTE_HEX;
    if (swatch.length < 3) swatch = MANDELBROT_PALETTE_HEX;
    return swatch.map(hexToRgb);
  }

  function paletteColor(pal, tt) {
    var n = pal.length;
    var scaled = ((tt % 1) + 1) % 1 * n;
    var i = Math.floor(scaled) % n;
    var j = (i + 1) % n;
    var f = scaled - Math.floor(scaled);
    var a = pal[i], b = pal[j];
    return [
      a[0] + (b[0] - a[0]) * f,
      a[1] + (b[1] - a[1]) * f,
      a[2] + (b[2] - a[2]) * f
    ];
  }

  /* ── Texture scroll equilibrium ──────────────────────────────── */
  function bindTextureScrollSync() {
    if (window.__classroomosTextureScrollBound) return;
    var queued = false;

    function sync() {
      queued = false;
      var offset = -(window.scrollY || document.documentElement.scrollTop || 0) + 'px';
      document.documentElement.style.setProperty('--theme-texture-scroll-y', offset);
      if (document.body) document.body.style.setProperty('--theme-texture-scroll-y', offset);
    }

    function requestSync() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(sync);
    }

    window.__classroomosTextureScrollBound = true;
    sync();
    window.addEventListener('scroll', requestSync, { passive: true });
    window.addEventListener('resize', requestSync, { passive: true });
  }

  /* ── Canvas mount / resize ───────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '#site-canvas-bg,#hero-canvas{' +
        'position:fixed;inset:0;width:100vw;height:100vh;z-index:0;' +
        'pointer-events:none;opacity:.42;display:block;' +
      '}' +
      'body.theme-liquid-woodland #site-canvas-bg,body.theme-liquid-woodland #hero-canvas{' +
        'position:fixed;z-index:0;' +
      '}' +
      'body.theme-liquid-woodland .site-header,body.theme-liquid-woodland main,body.theme-liquid-woodland .site-footer{' +
        'position:relative;z-index:1;' +
      '}' +
      'body.theme-liquid-woodland .site-header{position:sticky;z-index:10030;}' +
      '@media (prefers-reduced-motion:reduce){#site-canvas-bg,#hero-canvas{display:none!important;}}';
    document.head.appendChild(style);
  }

  function mount() {
    if (!document.body) return false;
    injectStyles();

    canvas = document.getElementById('site-canvas-bg') || document.getElementById('hero-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'site-canvas-bg';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(canvas, document.body.firstChild);
    }

    ctx = canvas.getContext('2d');
    resize();
    return true;
  }

  function resize() {
    if (!canvas) return;
    var ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    var cssW = window.innerWidth || document.documentElement.clientWidth || 960;
    var cssH = window.innerHeight || document.documentElement.clientHeight || 720;
    w = canvas.width = Math.max(1, Math.round(cssW * ratio));
    h = canvas.height = Math.max(1, Math.round(cssH * ratio));
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    w = cssW;
    h = cssH;
  }

  /* ── Mesh (drifting gradient blobs) ──────────────────────────── */
  function makeBlobs() {
    var rgb = accentRGB();
    blobs = [];
    var alphas = [0.18, 0.14, 0.12, 0.10, 0.12];
    var offsets = [
      [0.20, 0.30], [0.70, 0.60], [0.50, 0.20],
      [0.15, 0.75], [0.80, 0.25]
    ];
    for (var i = 0; i < 5; i++) {
      blobs.push({
        x:   offsets[i][0],
        y:   offsets[i][1],
        r:   0.28 + (i * 0.04),
        ox:  i * 1.26,
        oy:  i * 0.94,
        sx:  0.00022 + i * 0.00004,
        sy:  0.00022 + i * 0.00003,
        rgb: rgb,
        a:   alphas[i]
      });
    }
  }

  function drawMesh() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < blobs.length; i++) {
      var b  = blobs[i];
      var bx = (b.x + 0.44 * Math.sin(t * b.sx + b.ox)) * w;
      var by = (b.y + 0.44 * Math.cos(t * b.sy + b.oy)) * h;
      var br = b.r * Math.max(w, h);
      var g  = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0,   rgba(b.rgb, b.a));
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }

  /* ── Particles (connected dot field) ─────────────────────────── */
  function makeParticles() {
    pts = [];
    var count = Math.max(28, Math.min(55, Math.floor(w / 18)));
    for (var i = 0; i < count; i++) {
      pts.push({
        x:  Math.random() * w,
        y:  Math.random() * h,
        vx: (Math.random() - 0.5) * 0.38,
        vy: (Math.random() - 0.5) * 0.38
      });
    }
  }

  function drawParticles() {
    ctx.clearRect(0, 0, w, h);
    var rgb = accentRGB();
    var MAX = Math.min(w, h) * 0.26;

    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      p.x += p.vx;  p.y += p.vy;
      if (p.x < 0) p.x = w;  if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;  if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = rgba(rgb, 0.55);
      ctx.fill();
    }

    for (var i = 0; i < pts.length; i++) {
      for (var j = i + 1; j < pts.length; j++) {
        var dx   = pts[i].x - pts[j].x;
        var dy   = pts[i].y - pts[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = rgba(rgb, 0.16 * (1 - dist / MAX));
          ctx.lineWidth   = 0.9;
          ctx.stroke();
        }
      }
    }
  }

  /* ── Petals (falling blossoms/leaves, wind + gravity) ────────
   * Same idea as jhammann/sakura (rain of gradient petals swayed by
   * wind), reworked onto this file's canvas/rAF loop instead of DOM
   * sprites so it shares the theme-aware colour + perf guards below. */
  function spawnPetal(y) {
    return {
      x:          Math.random() * w,
      y:          (y === undefined) ? -10 - Math.random() * h : y,
      size:       5 + Math.random() * 7,
      speed:      0.35 + Math.random() * 0.55,
      drift:      (Math.random() - 0.5) * 0.5,
      swingAmp:   0.4 + Math.random() * 0.7,
      swingFreq:  0.006 + Math.random() * 0.01,
      swingPhase: Math.random() * Math.PI * 2,
      rot:        Math.random() * Math.PI * 2,
      rotSpeed:   (Math.random() - 0.5) * 0.03,
      shade:      Math.random()
    };
  }

  function makePetals() {
    petals = [];
    var count = Math.max(12, Math.min(26, Math.floor(w / 44)));
    for (var i = 0; i < count; i++) petals.push(spawnPetal(Math.random() * h));
  }

  function drawPetals() {
    ctx.clearRect(0, 0, w, h);
    var rgb = accentRGB();

    for (var i = 0; i < petals.length; i++) {
      var p = petals[i];
      p.y   += p.speed;
      p.x   += p.drift + Math.sin(t * p.swingFreq + p.swingPhase) * p.swingAmp;
      p.rot += p.rotSpeed;

      if (p.y - p.size > h) { petals[i] = spawnPetal(-10 - Math.random() * 30); continue; }
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;

      var alpha = 0.5 + p.shade * 0.3;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      var g = ctx.createLinearGradient(-p.size, -p.size, p.size, p.size);
      g.addColorStop(0, rgba(rgb, alpha));
      g.addColorStop(1, rgba(rgb, alpha * 0.45));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ── Bee Hive (sprites crawling the hive walls) ───────────────
   * Loads assets/images/sprites/bee.png once and animates several
   * copies wandering the canvas like bees walking a hive interior:
   * mostly-straight crawling with a wandering heading, and a turn
   * (not a fall-off) whenever they reach an edge. */
  function loadBeeImg() {
    if (beeImg) return;
    beeImg = new Image();
    beeImg.onload = function () { beeImgReady = true; };
    beeImg.src = BEE_SPRITE;
  }

  function spawnBee() {
    var size = 22 + Math.random() * 14;
    return {
      x:          Math.random() * w,
      y:          Math.random() * h,
      heading:    Math.random() * Math.PI * 2,
      speed:      0.28 + Math.random() * 0.32,
      turnTimer:  60 + Math.random() * 120,
      wigglePhase: Math.random() * Math.PI * 2,
      size:       size,
      alpha:      0.65 + Math.random() * 0.3
    };
  }

  function makeHive() {
    loadBeeImg();
    bees = [];
    var count = Math.max(6, Math.min(14, Math.floor(w / 90)));
    for (var i = 0; i < count; i++) bees.push(spawnBee());
  }

  function drawHive() {
    ctx.clearRect(0, 0, w, h);
    if (!beeImgReady) return;

    var margin = 16;
    for (var i = 0; i < bees.length; i++) {
      var b = bees[i];

      // Wander: small continuous jitter plus an occasional bigger turn.
      b.heading += (Math.random() - 0.5) * 0.06;
      b.turnTimer--;
      if (b.turnTimer <= 0) {
        b.heading   += (Math.random() - 0.5) * 1.4;
        b.turnTimer  = 60 + Math.random() * 120;
      }

      b.x += Math.cos(b.heading) * b.speed;
      b.y += Math.sin(b.heading) * b.speed;

      // Hit a wall of the hive interior: turn along it instead of leaving.
      if (b.x < margin)     { b.x = margin;     b.heading = Math.PI - b.heading; }
      if (b.x > w - margin) { b.x = w - margin; b.heading = Math.PI - b.heading; }
      if (b.y < margin)     { b.y = margin;     b.heading = -b.heading; }
      if (b.y > h - margin) { b.y = h - margin; b.heading = -b.heading; }

      var wiggle = Math.sin(t * 0.2 + b.wigglePhase) * 0.12;
      var hh = b.size * (beeImg.naturalHeight / beeImg.naturalWidth || 1);

      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.translate(b.x, b.y);
      ctx.rotate(b.heading + wiggle);
      ctx.drawImage(beeImg, -b.size / 2, -hh / 2, b.size, hh);
      ctx.restore();
    }
  }

  /* ── Aurora (sine-wave light bands) ─────────────────────────── */
  function drawAurora() {
    ctx.clearRect(0, 0, w, h);
    var rgb = accentRGB();

    var bands = [
      { a: 0.13, phase: 0,    freq: 0.0034, amp: 0.13, yBase: 0.28 },
      { a: 0.09, phase: 2.09, freq: 0.0042, amp: 0.11, yBase: 0.52 },
      { a: 0.07, phase: 4.19, freq: 0.0027, amp: 0.16, yBase: 0.74 }
    ];

    for (var i = 0; i < bands.length; i++) {
      var bd = bands[i];
      ctx.beginPath();
      for (var x = 0; x <= w; x += 4) {
        var y = (bd.yBase + bd.amp * Math.sin(x * bd.freq + t * 0.00042 + bd.phase)) * h;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = rgba(rgb, bd.a);
      ctx.fill();
    }
  }

  /* ── Mandelbrot (live escape-time fractal, lava-lamp drift) ────
   * Rendered into a small offscreen buffer (real per-pixel escape-time
   * math, not a decorative gradient) and scaled up onto the visible
   * canvas with a soft blur — full-resolution per frame would be too
   * slow, and the blur turns the low-res pixelation into smooth liquid
   * blobs instead of a static picture. The view point drifts along a
   * slow Lissajous path near the fractal boundary while breathing
   * in and out and gently turning, so self-similar detail keeps folding
   * into new shapes rather than just spinning a fixed picture. */
  var MANDEL_MAX_ITER = 60;
  var MANDEL_CENTER_X = -0.745;
  var MANDEL_CENTER_Y = 0.115;
  var MANDEL_ZOOM = 2.4;

  function makeMandelbrot() {
    var cw = Math.max(80, Math.min(220, Math.round(w / 5.5)));
    var ch = Math.max(56, Math.min(160, Math.round(h / 5.5)));
    var off = document.createElement('canvas');
    off.width = cw;
    off.height = ch;
    mandel = { cw: cw, ch: ch, octx: off.getContext('2d'), canvas: off };
  }

  function drawMandelbrot() {
    if (!mandel) makeMandelbrot();
    var cw = mandel.cw, ch = mandel.ch, octx = mandel.octx;
    var img = octx.createImageData(cw, ch);
    var data = img.data;
    var pal = themePalette();

    var angle = t * 0.00055;
    var cosA = Math.cos(angle), sinA = Math.sin(angle);
    var zoomPulse = 1 + Math.sin(t * 0.00023) * 0.4 + Math.sin(t * 0.00061) * 0.15;
    var scale = (MANDEL_ZOOM / cw) / zoomPulse;
    var driftX = Math.sin(t * 0.00037) * 0.16 + Math.sin(t * 0.00081) * 0.06;
    var driftY = Math.cos(t * 0.00029) * 0.13 + Math.cos(t * 0.00068) * 0.05;
    var colorPhase = t * 0.0011;

    for (var py = 0; py < ch; py++) {
      for (var px = 0; px < cw; px++) {
        var nx = (px - cw / 2) * scale;
        var ny = (py - ch / 2) * scale;
        var rx = nx * cosA - ny * sinA;
        var ry = nx * sinA + ny * cosA;
        var cx = MANDEL_CENTER_X + driftX + rx;
        var cy = MANDEL_CENTER_Y + driftY + ry;

        var x = 0, y = 0, x2 = 0, y2 = 0, iter = 0;
        while (x2 + y2 <= 4 && iter < MANDEL_MAX_ITER) {
          y = 2 * x * y + cy;
          x = x2 - y2 + cx;
          x2 = x * x;
          y2 = y * y;
          iter++;
        }

        var idx = (py * cw + px) * 4;
        var col;
        if (iter >= MANDEL_MAX_ITER) {
          col = pal[0];
          data[idx] = col[0] * 0.4; data[idx + 1] = col[1] * 0.4; data[idx + 2] = col[2] * 0.4;
        } else {
          var logZn = Math.log(x2 + y2) / 2;
          var nu = Math.log(logZn / Math.LN2) / Math.LN2;
          var smooth = (iter + 1 - nu) / MANDEL_MAX_ITER;
          col = paletteColor(pal, smooth * 2.2 + colorPhase);
          data[idx] = col[0]; data[idx + 1] = col[1]; data[idx + 2] = col[2];
        }
        data[idx + 3] = 255;
      }
    }

    octx.putImageData(img, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    if ('filter' in ctx) ctx.filter = 'blur(3px)';
    ctx.drawImage(mandel.canvas, 0, 0, cw, ch, 0, 0, w, h);
    if ('filter' in ctx) ctx.filter = 'none';
  }

  /* ── Lava Lamp (buoyant procedural lava physics with neon depth) ─ */
  function onLavaMouseMove(e) {
    if (currentBg !== 'lavalamp') return;
    var x = e.clientX, y = e.clientY;
    if (lavaMouse.active) {
      lavaMouse.vx = (x - lavaMouse.lastX) * 0.2;
      lavaMouse.vy = (y - lavaMouse.lastY) * 0.2;
    }
    lavaMouse.x = x;
    lavaMouse.y = y;
    lavaMouse.lastX = x;
    lavaMouse.lastY = y;
    lavaMouse.active = true;
  }

  function spawnLavaBlob(customY, layer) {
    var minR = 24, maxR = 76;
    var baseR = minR + Math.random() * (maxR - minR);
    if (Math.random() < 0.28) baseR = 56 + Math.random() * 30;
    else if (Math.random() < 0.32) baseR = 20 + Math.random() * 16;

    var zLayer = (layer !== undefined) ? layer : Math.floor(Math.random() * 3);
    var yPos = (customY !== undefined) ? customY : (Math.random() * (h || 600));
    var normY = (h > 0) ? yPos / h : 0.5;

    // Hot at bottom (rises), cool at top (sinks)
    var initialTemp = 1.0 - normY + (Math.random() - 0.5) * 0.32;
    initialTemp = Math.max(0.1, Math.min(0.9, initialTemp));

    return {
      x: 30 + Math.random() * Math.max(10, (w || 800) - 60),
      y: yPos,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (initialTemp > 0.48 ? -1 : 1) * (0.3 + Math.random() * 0.4),
      baseR: baseR,
      rx: baseR,
      ry: baseR,
      layer: zLayer, // 0: back, 1: mid, 2: front
      temp: initialTemp,
      phase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.014 + Math.random() * 0.018,
      wobbleAmp: 0.04 + Math.random() * 0.05,
      seed: Math.random() * 100
    };
  }

  function makeLavaLamp() {
    lavaBlobs = [];
    lavaBubbles = [];
    var count = Math.max(10, Math.min(18, Math.floor((w || 800) / 75)));

    for (var i = 0; i < count; i++) {
      lavaBlobs.push(spawnLavaBlob(Math.random() * (h || 600), i % 3));
    }

    var bubbleCount = Math.max(14, Math.min(26, Math.floor((w || 800) / 50)));
    for (var j = 0; j < bubbleCount; j++) {
      lavaBubbles.push({
        x: Math.random() * (w || 800),
        y: Math.random() * (h || 600),
        r: 1.2 + Math.random() * 2.2,
        speed: 0.6 + Math.random() * 1.1,
        drift: (Math.random() - 0.5) * 0.4,
        seed: Math.random() * 100,
        alpha: 0.35 + Math.random() * 0.45
      });
    }

    if (!window.__lavaLampMouseBound) {
      window.addEventListener('mousemove', onLavaMouseMove, { passive: true });
      window.__lavaLampMouseBound = true;
    }
  }

  function drawLavaMetaballBridge(b1, b2, layer) {
    var dx = b2.x - b1.x;
    var dy = b2.y - b1.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    var maxD = (b1.rx + b2.rx) * 1.34;
    if (d < 1 || d >= maxD) return;

    var theta = Math.atan2(dy, dx);
    var phi = theta + Math.PI / 2;
    var cosPhi = Math.cos(phi);
    var sinPhi = Math.sin(phi);

    var p1a_x = b1.x + cosPhi * b1.rx * 0.85;
    var p1a_y = b1.y + sinPhi * b1.ry * 0.85;
    var p1b_x = b1.x - cosPhi * b1.rx * 0.85;
    var p1b_y = b1.y - sinPhi * b1.ry * 0.85;

    var p2a_x = b2.x + cosPhi * b2.rx * 0.85;
    var p2a_y = b2.y + sinPhi * b2.ry * 0.85;
    var p2b_x = b2.x - cosPhi * b2.rx * 0.85;
    var p2b_y = b2.y - sinPhi * b2.ry * 0.85;

    var ratio = d / maxD;
    var wr = ((b1.rx + b2.rx) * 0.5) * (1.0 - ratio) * 0.85;
    var mx = (b1.x + b2.x) * 0.5;
    var my = (b1.y + b2.y) * 0.5;

    var ca_x = mx + cosPhi * wr;
    var ca_y = my + sinPhi * wr;
    var cb_x = mx - cosPhi * wr;
    var cb_y = my - sinPhi * wr;

    ctx.beginPath();
    ctx.moveTo(p1a_x, p1a_y);
    ctx.quadraticCurveTo(ca_x, ca_y, p2a_x, p2a_y);
    ctx.lineTo(p2b_x, p2b_y);
    ctx.quadraticCurveTo(cb_x, cb_y, p1b_x, p1b_y);
    ctx.closePath();

    var bridgeGrad = ctx.createLinearGradient(b1.x, b1.y, b2.x, b2.y);
    if (layer === 0) {
      bridgeGrad.addColorStop(0, 'rgba(150, 0, 24, 0.7)');
      bridgeGrad.addColorStop(0.5, 'rgba(190, 4, 32, 0.75)');
      bridgeGrad.addColorStop(1, 'rgba(150, 0, 24, 0.7)');
    } else if (layer === 1) {
      bridgeGrad.addColorStop(0, 'rgba(215, 6, 36, 0.85)');
      bridgeGrad.addColorStop(0.5, 'rgba(255, 30, 60, 0.88)');
      bridgeGrad.addColorStop(1, 'rgba(215, 6, 36, 0.85)');
    } else {
      bridgeGrad.addColorStop(0, 'rgba(255, 24, 60, 0.95)');
      bridgeGrad.addColorStop(0.5, 'rgba(255, 70, 100, 0.96)');
      bridgeGrad.addColorStop(1, 'rgba(255, 24, 60, 0.95)');
    }
    ctx.fillStyle = bridgeGrad;
    ctx.fill();
  }

  function drawLavaLamp() {
    if (!lavaBlobs) makeLavaLamp();
    ctx.clearRect(0, 0, w, h);

    // 1. Incandescent Bottom Heater Glow (pulsating thermal radiance)
    var pulse = 0.24 + Math.sin(t * 0.022) * 0.05;
    var heater = ctx.createRadialGradient(w * 0.5, h + 30, 20, w * 0.5, h, Math.max(w * 0.65, 420));
    heater.addColorStop(0, 'rgba(255, 60, 90, ' + (pulse * 1.5) + ')');
    heater.addColorStop(0.35, 'rgba(255, 20, 50, ' + pulse + ')');
    heater.addColorStop(0.75, 'rgba(160, 0, 25, ' + (pulse * 0.35) + ')');
    heater.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = heater;
    ctx.fillRect(0, h - 260, w, 260);

    // 2. Micro-bubbles (ascending glowing specks)
    if (lavaBubbles) {
      for (var bi = 0; bi < lavaBubbles.length; bi++) {
        var bub = lavaBubbles[bi];
        bub.y -= bub.speed;
        bub.x += bub.drift + Math.sin(t * 0.03 + bub.seed) * 0.55;
        if (bub.y < -10) {
          bub.y = h + 10 + Math.random() * 20;
          bub.x = 20 + Math.random() * (w - 40);
        }
        if (bub.x < 0) bub.x = w;
        if (bub.x > w) bub.x = 0;

        ctx.beginPath();
        ctx.arc(bub.x, bub.y, bub.r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 30, 60, ' + (bub.alpha * 0.28) + ')';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(bub.x, bub.y, bub.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 225, 235, ' + bub.alpha + ')';
        ctx.fill();
      }
    }

    // 3. Step Blob Physics
    var m = lavaMouse;
    for (var i = 0; i < lavaBlobs.length; i++) {
      var b = lavaBlobs[i];

      // Thermal exchange: heat at bottom, cool at top
      if (b.y > h - 140) {
        b.temp += (1.0 - b.temp) * 0.0075;
      } else if (b.y < 120) {
        b.temp -= b.temp * 0.0065;
      } else {
        b.temp += (0.45 - b.temp) * 0.00025;
      }

      // Buoyancy force
      var buoyancy = (b.temp - 0.48) * 0.055 * (0.8 + b.layer * 0.2);
      b.vy -= buoyancy;

      // Gentle lateral convection current
      b.vx += Math.sin(t * 0.006 + b.y * 0.003 + b.seed) * 0.024;

      // Mouse fluid interaction
      if (m.active) {
        var mdx = b.x - m.x;
        var mdy = b.y - m.y;
        var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 180 && mdist > 1) {
          var push = (1 - mdist / 180) * 0.25;
          b.vx += (mdx / mdist) * push + m.vx * 0.05;
          b.vy += (mdy / mdist) * push + m.vy * 0.05;
        }
      }

      // Viscous liquid drag
      b.vy *= 0.982;
      b.vx *= 0.96;

      // Position update
      b.x += b.vx;
      b.y += b.vy;

      // Boundary cushions
      var margin = b.baseR * 0.75 + 16;
      if (b.x < margin)     { b.x = margin;     b.vx = Math.abs(b.vx) * 0.5; }
      if (b.x > w - margin) { b.x = w - margin; b.vx = -Math.abs(b.vx) * 0.5; }

      var topLimit = 28 + b.baseR * 0.35;
      if (b.y < topLimit) { b.y = topLimit; b.vy = Math.max(0, b.vy * -0.2); }
      var botLimit = h - 28 - b.baseR * 0.35;
      if (b.y > botLimit) { b.y = botLimit; b.vy = Math.min(0, b.vy * -0.2); }

      // Aspect elongation and liquid wobble
      var stretch = Math.max(-0.25, Math.min(0.4, -b.vy * 0.065));
      b.phase += b.wobbleSpeed;
      var wobble = Math.sin(b.phase) * b.wobbleAmp;
      b.ry = b.baseR * (1 + stretch + wobble);
      b.rx = b.baseR * (1 - stretch * 0.45 - wobble);
    }

    // 4. Render Depth Layers (0: back, 1: mid, 2: front)
    var layerProps = [
      {
        scale: 0.74, alpha: 0.52, auraScale: 2.3,
        auraInner: 'rgba(190, 0, 30, 0.24)', auraMid: 'rgba(130, 0, 20, 0.12)',
        core: 'rgba(255, 130, 150, 0.65)', mid: 'rgba(200, 4, 32, 0.78)',
        deep: 'rgba(120, 0, 18, 0.85)', rim: 'rgba(220, 10, 40, 0.88)',
        stroke: 'rgba(255, 30, 60, 0.45)', strokeWidth: 1.4
      },
      {
        scale: 0.96, alpha: 0.78, auraScale: 2.0,
        auraInner: 'rgba(255, 20, 50, 0.32)', auraMid: 'rgba(180, 0, 30, 0.16)',
        core: 'rgba(255, 185, 200, 0.82)', mid: 'rgba(255, 20, 50, 0.88)',
        deep: 'rgba(165, 0, 25, 0.92)', rim: 'rgba(255, 45, 80, 0.94)',
        stroke: 'rgba(255, 55, 90, 0.75)', strokeWidth: 2.0
      },
      {
        scale: 1.20, alpha: 0.95, auraScale: 1.85,
        auraInner: 'rgba(255, 40, 75, 0.42)', auraMid: 'rgba(220, 10, 45, 0.22)',
        core: 'rgba(255, 245, 248, 0.95)', mid: 'rgba(255, 30, 65, 0.96)',
        deep: 'rgba(195, 0, 30, 0.96)', rim: 'rgba(255, 75, 110, 0.98)',
        stroke: 'rgba(255, 120, 145, 0.95)', strokeWidth: 2.6
      }
    ];

    for (var l = 0; l < 3; l++) {
      var lp = layerProps[l];
      var layerBlobs = [];
      for (var k = 0; k < lavaBlobs.length; k++) {
        if (lavaBlobs[k].layer === l) layerBlobs.push(lavaBlobs[k]);
      }

      // Step A: Neon Auras
      for (var a = 0; a < layerBlobs.length; a++) {
        var ab = layerBlobs[a];
        var auraR = Math.max(ab.rx, ab.ry) * lp.auraScale;
        var auraGrad = ctx.createRadialGradient(ab.x, ab.y, Math.min(ab.rx, ab.ry) * 0.35, ab.x, ab.y, auraR);
        auraGrad.addColorStop(0, lp.auraInner);
        auraGrad.addColorStop(0.55, lp.auraMid);
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(ab.x, ab.y, auraR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Step B: Metaball Bridges between close blobs in this layer
      for (var i1 = 0; i1 < layerBlobs.length; i1++) {
        for (var i2 = i1 + 1; i2 < layerBlobs.length; i2++) {
          drawLavaMetaballBridge(layerBlobs[i1], layerBlobs[i2], l);
        }
      }

      // Step C: 3D Spherical Neon Blob Bodies
      for (var bIdx = 0; bIdx < layerBlobs.length; bIdx++) {
        var bb = layerBlobs[bIdx];
        ctx.save();
        ctx.translate(bb.x, bb.y);

        if (Math.abs(bb.vy) > 0.1 || Math.abs(bb.vx) > 0.1) {
          ctx.rotate((bb.vx / (Math.abs(bb.vy) + 0.5)) * 0.32);
        }

        var lx = -bb.rx * 0.28;
        var ly = -bb.ry * 0.30;
        var bGrad = ctx.createRadialGradient(lx, ly, bb.rx * 0.08, 0, 0, Math.max(bb.rx, bb.ry));
        bGrad.addColorStop(0, lp.core);
        bGrad.addColorStop(0.36, lp.mid);
        bGrad.addColorStop(0.82, lp.deep);
        bGrad.addColorStop(1, lp.rim);

        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, bb.rx, bb.ry, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = lp.stroke;
        ctx.lineWidth = lp.strokeWidth;
        ctx.stroke();

        // Glossy Specular Highlight Arc on top
        if (l >= 1) {
          ctx.beginPath();
          ctx.ellipse(-bb.rx * 0.22, -bb.ry * 0.44, bb.rx * 0.36, bb.ry * 0.16, -0.22, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.28 + l * 0.12) + ')';
          ctx.fill();
        }

        ctx.restore();
      }
    }

    // 5. Undulating Bottom & Top Molten Wax Pools
    ctx.save();

    // Bottom Molten Wax Pool
    ctx.beginPath();
    var botBaseY = h - 36;
    ctx.moveTo(0, h);
    ctx.lineTo(0, botBaseY);
    var poolStep = Math.max(16, Math.floor(w / 40));
    for (var px = 0; px <= w; px += poolStep) {
      var botWave = Math.sin(px * 0.006 + t * 0.015) * 11 + Math.cos(px * 0.012 - t * 0.02) * 5;
      ctx.lineTo(px, botBaseY + botWave);
    }
    ctx.lineTo(w, h);
    ctx.closePath();

    var poolGrad = ctx.createLinearGradient(0, h - 55, 0, h);
    poolGrad.addColorStop(0, 'rgba(255, 34, 68, 0.92)');
    poolGrad.addColorStop(0.45, 'rgba(200, 10, 40, 0.96)');
    poolGrad.addColorStop(1, 'rgba(120, 0, 20, 0.98)');
    ctx.fillStyle = poolGrad;
    ctx.fill();

    // Glowing surface rim along bottom pool
    ctx.beginPath();
    ctx.moveTo(0, botBaseY + Math.sin(t * 0.015) * 11);
    for (var px2 = 0; px2 <= w; px2 += poolStep) {
      var botWave2 = Math.sin(px2 * 0.006 + t * 0.015) * 11 + Math.cos(px2 * 0.012 - t * 0.02) * 5;
      ctx.lineTo(px2, botBaseY + botWave2);
    }
    ctx.strokeStyle = 'rgba(255, 140, 165, 0.8)';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Top Cooling Ceiling Layer
    ctx.beginPath();
    var topBaseY = 20;
    ctx.moveTo(0, 0);
    ctx.lineTo(0, topBaseY);
    for (var px3 = 0; px3 <= w; px3 += poolStep) {
      var topWave = Math.sin(px3 * 0.008 + t * 0.01) * 7 + Math.cos(px3 * 0.016 + t * 0.018) * 3;
      ctx.lineTo(px3, topBaseY + topWave);
    }
    ctx.lineTo(w, 0);
    ctx.closePath();

    var topPoolGrad = ctx.createLinearGradient(0, 0, 0, 32);
    topPoolGrad.addColorStop(0, 'rgba(150, 0, 25, 0.94)');
    topPoolGrad.addColorStop(0.7, 'rgba(230, 20, 50, 0.65)');
    topPoolGrad.addColorStop(1, 'rgba(255, 40, 70, 0)');
    ctx.fillStyle = topPoolGrad;
    ctx.fill();

    ctx.restore();
  }

  /* ── Animation loop ──────────────────────────────────────────── */
  function tick() {
    t++;
    if      (currentBg === 'mesh')      drawMesh();
    else if (currentBg === 'particles') drawParticles();
    else if (currentBg === 'aurora')    drawAurora();
    else if (currentBg === 'petals')    drawPetals();
    else if (currentBg === 'hive')      drawHive();
    else if (currentBg === 'mandelbrot') drawMandelbrot();
    else if (currentBg === 'lavalamp')  drawLavaLamp();
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  function start(bg) {
    stop();
    currentBg = bg;

    if (bg === 'none') {
      if (canvas) { ctx.clearRect(0, 0, w, h); canvas.style.display = 'none'; }
      return;
    }

    if (!canvas && !mount()) return;
    canvas.style.display = '';

    // Re-init data if switching modes
    if (bg === 'mesh')      { blobs  = null; makeBlobs();     }
    if (bg === 'particles') { pts    = null; makeParticles(); }
    if (bg === 'petals')    { petals = null; makePetals();    }
    if (bg === 'hive')      { bees   = null; makeHive();      }
    if (bg === 'mandelbrot') { mandel = null; makeMandelbrot(); }
    if (bg === 'lavalamp')  { lavaBlobs = null; lavaBubbles = null; makeLavaLamp(); }

    raf = requestAnimationFrame(tick);
  }

  /* ── Public API (called by nav-mobile.js settings panel) ─────── */
  window.ClassroomOSCanvasBg = {
    set:  function (bg) { start(bg); },
    get:  function ()   { return currentBg; },
    stop: stop,
    __ready: true
  };

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    bindTextureScrollSync();

    // Skip if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Skip on weak hardware (Chromebooks, older tablets)
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return;

    if (!mount()) return;

    var stored = bgForTheme(currentTheme());
    if (stored && stored !== 'none' && !reducedMotionOverride()) start(stored);

    // Settings panel fired a change on this same page
    window.addEventListener(CHANGE_EVENT, function (e) {
      if (e && e.detail && e.detail.bg && !reducedMotionOverride()) start(e.detail.bg);
    });

    // "Reduce motion" toggle flipped in the settings panel this session
    window.addEventListener('classroomos:reducedmotionchange', function (e) {
      var on = e && e.detail ? !!e.detail.reducedMotion : reducedMotionOverride();
      if (on) stop();
      else start(bgForTheme(currentTheme()));
    });

    // Preference changed from another tab
    window.addEventListener('storage', function (e) {
      if (e && e.key === STORAGE_KEY && !reducedMotionOverride()) start(bgForTheme(currentTheme()));
      if (e && e.key === 'classroomos-reduced-motion') {
        if (reducedMotionOverride()) stop();
        else start(bgForTheme(currentTheme()));
      }
    });

    // Repaint on resize
    window.addEventListener('resize', function () {
      resize();
      if (currentBg === 'mesh')      { blobs  = null; makeBlobs();     }
      if (currentBg === 'particles') { pts    = null; makeParticles(); }
      if (currentBg === 'petals')    { petals = null; makePetals();    }
      if (currentBg === 'hive')      { bees   = null; makeHive();      }
      if (currentBg === 'mandelbrot') { mandel = null; makeMandelbrot(); }
      if (currentBg === 'lavalamp')  { lavaBlobs = null; lavaBubbles = null; makeLavaLamp(); }
    });

    // Pause when tab is backgrounded (battery / CPU)
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else if (currentBg !== 'none') { t = t; raf = requestAnimationFrame(tick); }
    });

    // Theme changed (live, no reload): switch to that theme's pick/default
    // — e.g. hive debuts with honey, petals with sakura — and re-colour.
    window.addEventListener('classroomos:lightingchange', function (e) {
      if (reducedMotionOverride()) return;
      var theme = (e && e.detail && e.detail.theme) || currentTheme();
      var bg = bgForTheme(theme);
      if (bg !== currentBg) start(bg);
      if (currentBg === 'mesh') makeBlobs();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
