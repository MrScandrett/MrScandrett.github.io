/**
 * canvas-bg.js — Animated site canvas backgrounds
 * Settings panel (nav-mobile.js) writes the preference; this file reads it
 * and renders the selected background behind shared ClassroomOS pages.
 *
 * Modes: 'none' | 'mesh' | 'particles' | 'aurora' | 'petals' | 'hive'
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
  var blobs = null, pts = null, petals = null, bees = null;
  var beeImg = null, beeImgReady = false;

  /* Theme → the falling/crawling background it debuts with, until a
   * visitor picks their own from the settings panel (for that theme). */
  var THEME_DEFAULT_BG = { sakura: 'petals', topaz: 'hive' };

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

  /* ── Theme-aware accent colour ───────────────────────────────── */
  function accentRGB() {
    var theme = document.documentElement.dataset.theme || 'day';
    var map = {
      day:     [  0, 113, 227],
      night:   [105, 168, 255],
      sakura:  [220,  80, 150],
      diamond: [ 80, 190, 255],
      emerald: [ 50, 180, 100],
      topaz:   [255, 185,   0],
      vaporwave: [255,   0, 255],
      goldfish: [255, 106,  26],
      cobblestone: [138, 141, 145],
      bark: [217, 154, 84]
    };
    return map[theme] || map['day'];
  }

  function rgba(rgb, a) {
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')';
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

  /* ── Animation loop ──────────────────────────────────────────── */
  function tick() {
    t++;
    if      (currentBg === 'mesh')      drawMesh();
    else if (currentBg === 'particles') drawParticles();
    else if (currentBg === 'aurora')    drawAurora();
    else if (currentBg === 'petals')    drawPetals();
    else if (currentBg === 'hive')      drawHive();
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
    if (stored && stored !== 'none') start(stored);

    // Settings panel fired a change on this same page
    window.addEventListener(CHANGE_EVENT, function (e) {
      if (e && e.detail && e.detail.bg) start(e.detail.bg);
    });

    // Preference changed from another tab
    window.addEventListener('storage', function (e) {
      if (e && e.key === STORAGE_KEY) start(bgForTheme(currentTheme()));
    });

    // Repaint on resize
    window.addEventListener('resize', function () {
      resize();
      if (currentBg === 'mesh')      { blobs  = null; makeBlobs();     }
      if (currentBg === 'particles') { pts    = null; makeParticles(); }
      if (currentBg === 'petals')    { petals = null; makePetals();    }
      if (currentBg === 'hive')      { bees   = null; makeHive();      }
    });

    // Pause when tab is backgrounded (battery / CPU)
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else if (currentBg !== 'none') { t = t; raf = requestAnimationFrame(tick); }
    });

    // Theme changed (live, no reload): switch to that theme's pick/default
    // — e.g. hive debuts with honey, petals with sakura — and re-colour.
    window.addEventListener('classroomos:lightingchange', function (e) {
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
