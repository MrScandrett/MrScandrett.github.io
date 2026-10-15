/**
 * canvas-bg.js — Animated site canvas backgrounds
 * Settings panel (nav-mobile.js) writes the preference; this file reads it
 * and renders the selected background behind shared ClassroomOS pages.
 *
 * Modes: 'none' | 'mesh' | 'particles' | 'aurora' | 'petals' | 'hive' | 'goldfish' | 'mandelbrot' | 'lavalamp'
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
  var lavaRenderer = null, lavaLoading = false, lavaLast = null, lavaAccumulator = 0;
  function loadLavaRenderer() {
    if (lavaLoading) return;
    lavaLoading = true;
    function loadScript(path, next) {
      var script = document.createElement("script");
      script.src = scriptBase + path;
      script.onload = next;
      script.onerror = next;
      document.head.appendChild(script);
    }
    function loadSurface() {
      loadScript("assets/js/canvas-bg-lava.js", function () { if (window.ClassroomOSLava) lavaRenderer = window.ClassroomOSLava.create(); });
    }
    // The lamp's wax physics come from the shared LiquidEngine.
    function loadEngine() {
      if (window.LiquidEngine && window.LiquidEngine.ThermalBlobs) loadSurface();
      else loadScript("assets/js/liquid-engine.js", loadSurface);
    }
    // Some lesson templates inject the background without the shared registry.
    if (window.ClassroomOSThemeRegistry) loadEngine();
    else loadScript("assets/js/theme-registry.js", loadEngine);
  }
  // The live fractal is a WebGL renderer, loaded on first use; the small
  // CPU version below stands in until it arrives or if WebGL is missing.
  var mandelRenderer = null, mandelLoading = false;
  function loadMandelRenderer() {
    if (mandelLoading) return;
    mandelLoading = true;
    var script = document.createElement('script');
    script.src = scriptBase + 'assets/js/canvas-bg-mandelbrot.js';
    script.onload = function () { if (window.ClassroomOSMandelbrot) mandelRenderer = window.ClassroomOSMandelbrot.create(); };
    document.head.appendChild(script);
  }
  var w = 0, h = 0, t = 0;
  var currentBg = 'none';
  var blobs = null, pts = null, petals = null, bees = null, goldfishSchool = null, goldfishRipples = null, goldfishBubbles = null, mandel = null, lavaBlobs = null, lavaBubbles = null;
  var lavaMouse = { x: -1000, y: -1000, vx: 0, vy: 0, lastX: -1000, lastY: -1000, active: false };
  var beeImg = null, beeImgReady = false;

  /* Theme → the falling/crawling background it debuts with, until a
   * visitor picks their own from the settings panel (for that theme). */
  var THEME_DEFAULT_BG = { sakura: 'petals', topaz: 'hive', goldfish: 'goldfish', mandelbrot: 'mandelbrot', lavalamp: 'lavalamp' };

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
    if (document.documentElement.hasAttribute('data-classroom-presentation')) return true;
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
  var MANDELBROT_PALETTE_HEX = ['#05010f', '#5b0e9b', '#ff8c00', '#ffd23f'];

  var MANDELBROT_THEME_PALETTES = {
    day:         ['#020b17', '#004b99', '#0071e3', '#7cd0ff'],
    sakura:      ['#13020b', '#731346', '#ff6b9d', '#ffd4e5'],
    diamond:     ['#020d18', '#004c66', '#00c6ff', '#d0f8ff'],
    emerald:     ['#021308', '#0a4d29', '#22c55e', '#a7f3d0'],
    topaz:       ['#140b01', '#663d00', '#ff9f00', '#ffe875'],
    goldfish:    ['#140601', '#8c2c04', '#ff6a1a', '#ffc233'],
    cobblestone: ['#0a0b0d', '#33373d', '#8a8d91', '#e2e6eb'],
    bark:        ['#120a05', '#4a2c14', '#c48238', '#fcd385'],
    night:       ['#03050d', '#142247', '#3b82f6', '#a5c9ff'],
    vaporwave:   ['#07000d', '#590059', '#ff007f', '#00ffff'],
    mandelbrot:  ['#05010f', '#5b0e9b', '#ff8c00', '#ffd23f'],
    lavalamp:    ['#0a0103', '#7a081a', '#ff1a40', '#ff8ca3']
  };

  function themePalette() {
    var theme = document.documentElement.dataset.theme || 'day';
    var registry = window.ClassroomOSThemeRegistry;
    var swatch = (registry && typeof registry.getMandelSwatch === 'function')
      ? registry.getMandelSwatch(theme)
      : (MANDELBROT_THEME_PALETTES[theme] || MANDELBROT_PALETTE_HEX);
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

  /* ── Petals (falling sakura & rose blossoms, 3D aerodynamics) ─
   * Realistic cherry blossom & rose petals falling with true 3D
   * physics: pendulum glide & aerodynamic lift, edge-on tumbling
   * (coupled pitch, roll, and yaw), variable terminal velocity
   * based on projected surface area, subtle air turbulence, interactive
   * mouse wake, depth-of-field z-layers, botanical cleft notch &
   * cupped geometries, and multi-stop translucent blush shading. */
  var petalMouse = { x: -1000, y: -1000, vx: 0, vy: 0, lastX: -1000, lastY: -1000, active: false };
  var petalMouseBound = false;

  function onPetalMouseMove(e) {
    if (currentBg !== 'petals') return;
    var x = e.clientX, y = e.clientY;
    if (petalMouse.active) {
      petalMouse.vx = (x - petalMouse.lastX) * 0.35;
      petalMouse.vy = (y - petalMouse.lastY) * 0.35;
    }
    petalMouse.x = x;
    petalMouse.y = y;
    petalMouse.lastX = x;
    petalMouse.lastY = y;
    petalMouse.active = true;
  }

  function spawnPetal(customY) {
    // Continuous depth layer: 0.36 (distant, soft, slow) to 1.15 (foreground, large, crisp)
    var z = 0.36 + Math.random() * 0.79;
    // 0: classic sakura (cleft notch), 1: velvety cupped rose petal, 2: slender curled petal
    var typeRand = Math.random();
    var type = typeRand < 0.58 ? 0 : (typeRand < 0.86 ? 1 : 2);
    var baseLength = (type === 1 ? 11 : (type === 0 ? 12.5 : 10)) + Math.random() * 7;
    var length = baseLength * z;
    var aspectRatio = (type === 1 ? 0.88 : (type === 0 ? 0.76 : 0.58)) + (Math.random() - 0.5) * 0.14;
    var baseRotZ = (Math.random() - 0.5) * Math.PI * 0.85;

    return {
      x:            Math.random() * (w || 960),
      y:            (customY !== undefined) ? customY : -20 - Math.random() * (h || 720),
      z:            z,
      type:         type,
      length:       length,
      width:        length * aspectRatio,
      notch:        0.18 + Math.random() * 0.16,
      asym:         (Math.random() - 0.5) * 0.14,
      curl:         (Math.random() - 0.5) * 0.28,
      baseSpeed:    0.42 + Math.random() * 0.38,
      swayAmp:      14 + Math.random() * 22,
      swayFreq:     0.012 + Math.random() * 0.012,
      swayPhase:    Math.random() * Math.PI * 2,
      baseRotZ:     baseRotZ,
      rotZ:         baseRotZ,
      pitch:        Math.random() * Math.PI * 2,
      pitchSpeed:   (0.012 + Math.random() * 0.02) * (Math.random() < 0.5 ? 1 : -1),
      roll:         Math.random() * Math.PI * 2,
      rollSpeed:    (0.016 + Math.random() * 0.022) * (Math.random() < 0.5 ? 1 : -1),
      flutterFreq:  0.035 + Math.random() * 0.05,
      flutterAmp:   0.25 + Math.random() * 0.45,
      flutterPhase: Math.random() * Math.PI * 2,
      shade:        Math.random(),
      alpha:        0.55 + z * 0.38,
      vx:           0,
      vy:           0
    };
  }

  function makePetals() {
    if (!petalMouseBound && typeof window !== 'undefined') {
      window.addEventListener('mousemove', onPetalMouseMove, { passive: true });
      window.addEventListener('touchmove', function (e) {
        if (e.touches && e.touches[0]) onPetalMouseMove(e.touches[0]);
      }, { passive: true });
      petalMouseBound = true;
    }
    petals = [];
    var count = Math.max(16, Math.min(32, Math.floor((w || 960) / 40)));
    for (var i = 0; i < count; i++) {
      petals.push(spawnPetal(Math.random() * (h || 720)));
    }
  }

  function getPetalPalette(theme, rgb, p) {
    if (theme === 'sakura') {
      if (p.type === 1) {
        // Velvety rose petal
        return {
          base:     [206 - Math.round(p.shade * 18), 30 + Math.round(p.shade * 10), 84],
          mid:      [244, 92 + Math.round(p.shade * 25), 142 + Math.round(p.shade * 15)],
          tip:      [255, 218 + Math.round(p.shade * 20), 232],
          rim:      [255, 175, 205],
          crease:   [172, 22, 68],
          backBase: [216, 60, 108],
          backMid:  [248, 138, 174],
          backTip:  [255, 225, 238]
        };
      }
      // Classic sakura cherry blossom petal
      return {
        base:     [218 - Math.round(p.shade * 22), 42 + Math.round(p.shade * 14), 104],
        mid:      [255, 178 + Math.round(p.shade * 25), 202 + Math.round(p.shade * 18)],
        tip:      [255, 245, 249],
        rim:      [255, 210, 228],
        crease:   [192, 32, 88],
        backBase: [228, 74, 122],
        backMid:  [252, 186, 210],
        backTip:  [255, 240, 246]
      };
    }

    // Theme-coordinated petal palette
    var r = rgb[0], g = rgb[1], b = rgb[2];
    var baseR = Math.round(r * 0.8), baseG = Math.round(g * 0.72), baseB = Math.round(b * 0.8);
    var tipR = Math.min(255, Math.round(r * 0.35 + 165));
    var tipG = Math.min(255, Math.round(g * 0.35 + 165));
    var tipB = Math.min(255, Math.round(b * 0.35 + 165));
    return {
      base:     [baseR, baseG, baseB],
      mid:      rgb,
      tip:      [tipR, tipG, tipB],
      rim:      [Math.min(255, tipR + 25), Math.min(255, tipG + 25), Math.min(255, tipB + 25)],
      crease:   [Math.round(baseR * 0.85), Math.round(baseG * 0.85), Math.round(baseB * 0.85)],
      backBase: [Math.round(r * 0.9), Math.round(g * 0.85), Math.round(b * 0.9)],
      backMid:  [Math.min(255, Math.round(r * 0.6 + 100)), Math.min(255, Math.round(g * 0.6 + 100)), Math.min(255, Math.round(b * 0.6 + 100))],
      backTip:  [tipR, tipG, tipB]
    };
  }

  function tracePetalPath(ctx, p, L, W) {
    ctx.beginPath();
    if (p.type === 0) {
      // Classic Sakura petal with apical cleft notch
      var baseY = L * 0.82;
      var tipY = -L * 0.88;
      var notchY = tipY + L * (0.26 + p.notch * 0.16);
      var rightW = W * (1 + p.asym);
      var leftW = W * (1 - p.asym);

      ctx.moveTo(0, baseY);
      // Right flank
      ctx.bezierCurveTo(
        rightW * 0.52, baseY - L * 0.28,
        rightW * 1.08, baseY - L * 0.92,
        rightW * 0.92, tipY + L * 0.54
      );
      // Right lobe crown
      ctx.bezierCurveTo(
        rightW * 0.82, tipY + L * 0.18,
        rightW * 0.52, tipY - L * 0.04,
        rightW * 0.28, tipY
      );
      // Notch dip
      ctx.bezierCurveTo(
        rightW * 0.12, tipY + L * 0.06,
        0, notchY - L * 0.05,
        0, notchY
      );
      // Left lobe rise
      ctx.bezierCurveTo(
        0, notchY - L * 0.05,
        -leftW * 0.12, tipY + L * 0.06,
        -leftW * 0.28, tipY
      );
      // Left lobe crown
      ctx.bezierCurveTo(
        -leftW * 0.52, tipY - L * 0.04,
        -leftW * 0.82, tipY + L * 0.18,
        -leftW * 0.92, tipY + L * 0.54
      );
      // Left flank back to base
      ctx.bezierCurveTo(
        -leftW * 1.08, baseY - L * 0.92,
        -leftW * 0.52, baseY - L * 0.28,
        0, baseY
      );
    } else if (p.type === 1) {
      // Velvety cupped rose petal with broad scalloped crown
      var baseY = L * 0.85;
      var tipY = -L * 0.86;
      var rightW = W * 1.15 * (1 + p.asym);
      var leftW = W * 1.15 * (1 - p.asym);

      ctx.moveTo(0, baseY);
      ctx.bezierCurveTo(
        rightW * 0.5, baseY - L * 0.22,
        rightW * 1.14, baseY - L * 0.88,
        rightW * 0.96, tipY + L * 0.55
      );
      ctx.bezierCurveTo(
        rightW * 0.86, tipY + L * 0.14,
        rightW * 0.44, tipY - L * 0.06,
        0, tipY
      );
      ctx.bezierCurveTo(
        -leftW * 0.44, tipY - L * 0.06,
        -leftW * 0.86, tipY + L * 0.14,
        -leftW * 0.96, tipY + L * 0.55
      );
      ctx.bezierCurveTo(
        -leftW * 1.14, baseY - L * 0.88,
        -leftW * 0.5, baseY - L * 0.22,
        0, baseY
      );
    } else {
      // Slender curled petal
      var baseY = L * 0.88;
      var tipY = -L * 0.88;
      var midW = W * 0.72;

      ctx.moveTo(0, baseY);
      ctx.bezierCurveTo(midW * 0.4, baseY - L * 0.32, midW * 1.05, 0, midW * 0.72, tipY + L * 0.42);
      ctx.bezierCurveTo(midW * 0.5, tipY + L * 0.12, midW * 0.22, tipY, 0, tipY);
      ctx.bezierCurveTo(-midW * 0.12, tipY, -midW * 0.42, tipY + L * 0.2, -midW * 0.65, tipY + L * 0.52);
      ctx.bezierCurveTo(-midW * 0.82, 0, -midW * 0.42, baseY - L * 0.32, 0, baseY);
    }
    ctx.closePath();
  }

  function drawPetals() {
    ctx.clearRect(0, 0, w, h);
    var theme = currentTheme();
    var rgb = accentRGB();

    // Ambient wind with natural waves and occasional gusts
    var windBase = 0.32 + Math.sin(t * 0.0009) * 0.24;
    var windGust = Math.sin(t * 0.0031) * Math.sin(t * 0.0011) * 0.32;
    var wind = windBase + windGust;

    // Damp mouse wake velocity
    if (petalMouse.active) {
      petalMouse.vx *= 0.92;
      petalMouse.vy *= 0.92;
      if (Math.abs(petalMouse.vx) < 0.01) petalMouse.vx = 0;
      if (Math.abs(petalMouse.vy) < 0.01) petalMouse.vy = 0;
    }

    // Sort back-to-front by depth
    petals.sort(function (a, b) { return a.z - b.z; });

    for (var i = 0; i < petals.length; i++) {
      var p = petals[i];

      // Interactive mouse wake push
      if (petalMouse.active && (Math.abs(petalMouse.vx) + Math.abs(petalMouse.vy) > 0.1)) {
        var mdx = p.x - petalMouse.x;
        var mdy = p.y - petalMouse.y;
        var mDistSq = mdx * mdx + mdy * mdy;
        var maxDist = 135;
        if (mDistSq < maxDist * maxDist) {
          var mDist = Math.sqrt(mDistSq);
          var push = (1 - mDist / maxDist);
          p.vx += (petalMouse.vx * 0.25 + (mdx / (mDist || 1)) * 0.8) * push;
          p.vy += (petalMouse.vy * 0.15 - 0.75) * push; // gentle updraft
          p.pitchSpeed += (Math.random() - 0.5) * push * 0.06;
          p.rollSpeed += (Math.random() - 0.5) * push * 0.06;
        }
      }

      // Air resistance damping on impulse
      p.vx *= 0.94;
      p.vy *= 0.94;

      // 3D rotation update
      p.pitch += p.pitchSpeed;
      p.roll  += p.rollSpeed;

      // Aerodynamic pendulum sway
      var swayAngle = t * p.swayFreq + p.swayPhase;
      var swayVel = Math.cos(swayAngle);

      // Petal turns its 2D heading into the glide direction
      var targetRotZ = p.baseRotZ + (swayVel * 0.52);
      p.rotZ += (targetRotZ - p.rotZ) * 0.055;

      // Micro flutter
      var flutter = Math.sin(t * p.flutterFreq + p.flutterPhase) * p.flutterAmp;

      // Projected area: aerodynamic drag slows descent when broadside, speeds up when edge-on
      var cosRoll = Math.cos(p.roll);
      var cosPitch = Math.cos(p.pitch);
      var isBackface = (cosRoll * cosPitch) < 0;
      var projectedArea = Math.abs(cosRoll * cosPitch);
      var drag = 0.42 + projectedArea * 0.58;
      var vy = (p.baseSpeed / drag) * p.z;

      p.y += vy + p.vy;
      p.x += (wind + swayVel * 0.88 + flutter + p.vx) * p.z;

      // Recycle when falling past screen bottom
      if (p.y - p.length * 2 > h) {
        petals[i] = spawnPetal(-20 - Math.random() * 35);
        continue;
      }
      if (p.x < -35) p.x = w + 30;
      if (p.x > w + 35) p.x = -30;

      // Render 3D petal
      var scaleX = Math.max(0.08, Math.abs(cosRoll));
      var scaleY = Math.max(0.12, Math.abs(cosPitch));
      var pal = getPetalPalette(theme, rgb, p);
      var alpha = p.alpha;
      var L = p.length;
      var W = p.width;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotZ);

      // Affine 3D transform: pitch, roll, and gentle perspective curl
      ctx.transform(scaleX, (isBackface ? -1 : 1) * p.curl * scaleY * 0.35, 0, scaleY, 0, 0);

      // 1. Trace petal path
      tracePetalPath(ctx, p, L, W);

      // 2. Base-to-tip blush gradient
      var grad = ctx.createLinearGradient(0, L * 0.85, 0, -L * 0.88);
      if (!isBackface) {
        grad.addColorStop(0, rgba(pal.base, alpha * 0.95));
        grad.addColorStop(0.35, rgba(pal.mid, alpha * 0.86));
        grad.addColorStop(0.82, rgba(pal.tip, alpha * 0.80));
        grad.addColorStop(1, rgba(pal.rim, alpha * 0.70));
      } else {
        grad.addColorStop(0, rgba(pal.backBase, alpha * 0.84));
        grad.addColorStop(0.42, rgba(pal.backMid, alpha * 0.76));
        grad.addColorStop(1, rgba(pal.backTip, alpha * 0.62));
      }
      ctx.fillStyle = grad;
      ctx.fill();

      // 3. 3D cupping / dimensional half-tone shading (clipped strictly to petal interior)
      ctx.save();
      ctx.clip();

      var shadeGrad = ctx.createLinearGradient(-W, 0, W, 0);
      shadeGrad.addColorStop(0, 'rgba(255, 255, 255, ' + (alpha * 0.22) + ')');
      shadeGrad.addColorStop(0.46, 'rgba(255, 255, 255, 0.02)');
      shadeGrad.addColorStop(0.54, rgba(pal.crease, alpha * 0.14));
      shadeGrad.addColorStop(1, rgba(pal.crease, alpha * 0.05));
      ctx.fillStyle = shadeGrad;
      ctx.fillRect(-W * 1.5, -L * 1.5, W * 3, L * 3);

      // 4. Center crease / fold line
      ctx.beginPath();
      ctx.moveTo(0, L * 0.75);
      ctx.quadraticCurveTo(W * p.curl * 0.4, 0, 0, -L * 0.45);
      ctx.strokeStyle = rgba(pal.crease, alpha * (isBackface ? 0.12 : 0.20));
      ctx.lineWidth = Math.max(0.6, 0.85 * p.z);
      ctx.stroke();

      ctx.restore(); // unclip

      // 5. Delicate translucent rim highlight
      ctx.strokeStyle = rgba(pal.rim, alpha * (isBackface ? 0.26 : 0.42));
      ctx.lineWidth = Math.max(0.55, 0.75 * p.z);
      ctx.stroke();

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

  /* ── Goldfish (tranquil swimming koi pond, flowing veil fins) ────
   * Renders a school of graceful goldfish seen from an overhead pond
   * perspective, with smooth undulating spine physics, burst-and-glide
   * swimming locomotion, gossamer veil tails that ripple like silk,
   * gentle water ripples, rising micro-bubbles, and reactive mouse steering. */
  var pondMouse = { x: -1000, y: -1000, vx: 0, vy: 0, lastX: -1000, lastY: -1000, active: false };
  var pondMouseBound = false;

  function onPondMouseMove(e) {
    if (currentBg !== 'goldfish') return;
    var x = e.clientX, y = e.clientY;
    if (pondMouse.active) {
      pondMouse.vx = (x - pondMouse.lastX) * 0.25;
      pondMouse.vy = (y - pondMouse.lastY) * 0.25;
    }
    pondMouse.x = x;
    pondMouse.y = y;
    pondMouse.lastX = x;
    pondMouse.lastY = y;
    pondMouse.active = true;

    // Moving mouse across pond creates occasional gentle surface ripple
    if (goldfishRipples && Math.random() < 0.16 && (Math.abs(pondMouse.vx) + Math.abs(pondMouse.vy) > 1.2)) {
      if (goldfishRipples.length < 18) {
        goldfishRipples.push({
          x: x + (Math.random() - 0.5) * 16,
          y: y + (Math.random() - 0.5) * 16,
          r: 4,
          maxR: 35 + Math.random() * 25,
          speed: 1.2 + Math.random() * 0.6,
          alpha: 0.38
        });
      }
    }
  }

  function spawnGoldfish() {
    var length = 32 + Math.random() * 22; // 32 to 54px body length
    var angle = Math.random() * Math.PI * 2;
    var baseSpeed = 0.45 + Math.random() * 0.4;
    return {
      x: Math.random() * (w || 800),
      y: Math.random() * (h || 600),
      heading: angle,
      targetHeading: angle,
      turnTimer: 45 + Math.floor(Math.random() * 90),
      speed: baseSpeed,
      baseSpeed: baseSpeed,
      burstTimer: Math.floor(Math.random() * 120),
      length: length,
      width: length * 0.36,
      swimPhase: Math.random() * Math.PI * 2,
      finPhase: Math.random() * Math.PI * 2,
      variant: Math.floor(Math.random() * 4), // 0: Kohaku orange/cream, 1: Yamabuki gold, 2: Sarasa carnelian, 3: Sunrise pearl
      wakeCooldown: Math.floor(Math.random() * 60)
    };
  }

  function spawnPondBubble(customY) {
    return {
      x: Math.random() * (w || 800),
      y: (customY !== undefined) ? customY : Math.random() * (h || 600),
      r: 1.2 + Math.random() * 2.2,
      speed: 0.35 + Math.random() * 0.55,
      drift: (Math.random() - 0.5) * 0.25,
      seed: Math.random() * 100,
      alpha: 0.25 + Math.random() * 0.35
    };
  }

  function makeGoldfish() {
    if (!pondMouseBound && typeof window !== 'undefined') {
      window.addEventListener('mousemove', onPondMouseMove, { passive: true });
      pondMouseBound = true;
    }
    goldfishSchool = [];
    var count = Math.max(5, Math.min(10, Math.floor((w || 800) / 130)));
    for (var i = 0; i < count; i++) {
      goldfishSchool.push(spawnGoldfish());
    }

    goldfishRipples = [];

    goldfishBubbles = [];
    var bubbleCount = Math.max(8, Math.min(16, Math.floor((w || 800) / 90)));
    for (var b = 0; b < bubbleCount; b++) {
      goldfishBubbles.push(spawnPondBubble());
    }
  }

  function drawGoldfish() {
    ctx.clearRect(0, 0, w, h);
    var rgb = accentRGB();

    // 1. Soft sunlight caustics drifting across pond bottom
    var c1x = (0.32 + Math.sin(t * 0.00035) * 0.18) * w;
    var c1y = (0.38 + Math.cos(t * 0.00028) * 0.16) * h;
    var c1r = Math.max(w, h) * 0.38;
    var g1 = ctx.createRadialGradient(c1x, c1y, 0, c1x, c1y, c1r);
    g1.addColorStop(0, rgba(rgb, 0.08));
    g1.addColorStop(0.5, rgba(rgb, 0.03));
    g1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    var c2x = (0.72 + Math.cos(t * 0.00032) * 0.16) * w;
    var c2y = (0.68 + Math.sin(t * 0.00038) * 0.18) * h;
    var c2r = Math.max(w, h) * 0.42;
    var g2 = ctx.createRadialGradient(c2x, c2y, 0, c2x, c2y, c2r);
    g2.addColorStop(0, rgba([255, 215, 120], 0.06));
    g2.addColorStop(0.5, rgba([255, 215, 120], 0.02));
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    // 2. Water micro-bubbles gently rising
    if (goldfishBubbles) {
      for (var bi = 0; bi < goldfishBubbles.length; bi++) {
        var bub = goldfishBubbles[bi];
        bub.y -= bub.speed;
        bub.x += bub.drift + Math.sin(t * 0.025 + bub.seed) * 0.35;
        if (bub.y < -12) {
          goldfishBubbles[bi] = spawnPondBubble(h + 12 + Math.random() * 20);
          continue;
        }
        if (bub.x < 0) bub.x = w;
        if (bub.x > w) bub.x = 0;

        ctx.beginPath();
        ctx.arc(bub.x, bub.y, bub.r, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(rgb, bub.alpha * 0.4);
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(bub.x - bub.r * 0.3, bub.y - bub.r * 0.3, bub.r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (bub.alpha * 0.75) + ')';
        ctx.fill();
      }
    }

    // 3. Water surface ripples expanding
    if (goldfishRipples) {
      for (var ri = goldfishRipples.length - 1; ri >= 0; ri--) {
        var rip = goldfishRipples[ri];
        rip.r += rip.speed;
        var progress = rip.r / rip.maxR;
        if (progress >= 1.0) {
          goldfishRipples.splice(ri, 1);
          continue;
        }
        var ripAlpha = rip.alpha * (1.0 - progress);

        // Outer specular ripple ring
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, ' + (ripAlpha * 0.55) + ')';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Inner refraction ring
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.r * 0.82, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(rgb, ripAlpha * 0.28);
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
    }

    // Random calm pond drop ripple every now and then
    if (goldfishRipples && Math.random() < 0.007 && goldfishRipples.length < 12) {
      goldfishRipples.push({
        x: 40 + Math.random() * Math.max(10, w - 80),
        y: 40 + Math.random() * Math.max(10, h - 80),
        r: 3,
        maxR: 45 + Math.random() * 30,
        speed: 1.1 + Math.random() * 0.5,
        alpha: 0.32
      });
    }

    // 4. Update and render Goldfish School
    if (!goldfishSchool) return;

    var margin = 55;
    for (var fi = 0; fi < goldfishSchool.length; fi++) {
      var f = goldfishSchool[fi];

      // Swimming rhythm: burst-and-glide cycle
      f.burstTimer--;
      if (f.burstTimer <= 0) {
        f.burstTimer = 80 + Math.floor(Math.random() * 120);
        f.speed = f.baseSpeed * (1.3 + Math.random() * 0.5);
      } else {
        f.speed += (f.baseSpeed - f.speed) * 0.025; // Ease back to cruising glide
      }

      // Smooth steering & turning
      f.turnTimer--;
      if (f.turnTimer <= 0) {
        f.targetHeading += (Math.random() - 0.5) * 1.2;
        f.turnTimer = 60 + Math.floor(Math.random() * 100);
      }

      // Boundary avoidance (smooth turn back into pond)
      if (f.x < margin)     f.targetHeading = (f.targetHeading + (0 - f.targetHeading) * 0.2);
      if (f.x > w - margin) f.targetHeading = (f.targetHeading + (Math.PI - f.targetHeading) * 0.2);
      if (f.y < margin)     f.targetHeading = (f.targetHeading + (Math.PI * 0.5 - f.targetHeading) * 0.2);
      if (f.y > h - margin) f.targetHeading = (f.targetHeading + (-Math.PI * 0.5 - f.targetHeading) * 0.2);

      // Mouse evasion / interaction
      if (pondMouse.active) {
        var mdx = f.x - pondMouse.x;
        var mdy = f.y - pondMouse.y;
        var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 140 && mdist > 1) {
          var repulseAngle = Math.atan2(mdy, mdx);
          var repulseStr = (1 - mdist / 140) * 0.45;
          f.targetHeading = repulseAngle;
          f.speed = Math.min(f.baseSpeed * 2.4, f.speed + repulseStr * 0.8);
          // Tail flick wake ripple
          if (goldfishRipples && f.wakeCooldown <= 0 && Math.random() < 0.4) {
            goldfishRipples.push({
              x: f.x - Math.cos(f.heading) * f.length * 0.5,
              y: f.y - Math.sin(f.heading) * f.length * 0.5,
              r: 3,
              maxR: 40 + Math.random() * 20,
              speed: 1.4,
              alpha: 0.35
            });
            f.wakeCooldown = 30;
          }
        }
      }

      // Smooth heading interpolation (shortest angular path)
      var dHeading = f.targetHeading - f.heading;
      while (dHeading < -Math.PI) dHeading += Math.PI * 2;
      while (dHeading > Math.PI)  dHeading -= Math.PI * 2;
      f.heading += dHeading * 0.045;

      // Position update
      f.x += Math.cos(f.heading) * f.speed;
      f.y += Math.sin(f.heading) * f.speed;

      // Keep inside bounds wrap cushion
      if (f.x < -f.length) f.x = w + f.length;
      if (f.x > w + f.length) f.x = -f.length;
      if (f.y < -f.length) f.y = h + f.length;
      if (f.y > h + f.length) f.y = -f.length;

      // Phase updates
      f.swimPhase += f.speed * 0.18 + 0.032;
      f.finPhase  += f.speed * 0.14 + 0.045;
      if (f.wakeCooldown > 0) f.wakeCooldown--;

      // ── Render Fish Geometry ──
      var L = f.length;
      var W = f.width;

      // 5 Spine Vertebrae Nodes: 0=snout, 1=gills, 2=mid, 3=rear, 4=peduncle
      var segLens = [0, L * 0.22, L * 0.28, L * 0.28, L * 0.22];
      var nodes = [{ x: f.x, y: f.y, angle: f.heading }];
      for (var si = 1; si <= 4; si++) {
        var prevNode = nodes[si - 1];
        var waveLag = f.swimPhase - si * 0.82;
        var segAng = f.heading + Math.sin(waveLag) * (0.04 + si * 0.075);
        nodes.push({
          x: prevNode.x - Math.cos(segAng) * segLens[si],
          y: prevNode.y - Math.sin(segAng) * segLens[si],
          angle: segAng
        });
      }

      // Colors by variant
      var colPrimary, colSpine, colBelly, colFin;
      if (f.variant === 0) {
        // Classic Kohaku orange & pearl
        colPrimary = 'rgba(255, 106, 26, 0.92)';
        colSpine   = 'rgba(220, 68, 8, 0.95)';
        colBelly   = 'rgba(255, 248, 238, 0.92)';
        colFin     = [255, 120, 40];
      } else if (f.variant === 1) {
        // Yamabuki golden amber
        colPrimary = 'rgba(255, 175, 18, 0.92)';
        colSpine   = 'rgba(230, 130, 0, 0.95)';
        colBelly   = 'rgba(255, 252, 235, 0.92)';
        colFin     = [255, 190, 50];
      } else if (f.variant === 2) {
        // Sarasa deep carnelian red-orange
        colPrimary = 'rgba(235, 60, 15, 0.92)';
        colSpine   = 'rgba(185, 35, 5, 0.96)';
        colBelly   = 'rgba(255, 235, 225, 0.90)';
        colFin     = [240, 75, 25];
      } else {
        // Sunrise pearl with fiery fins
        colPrimary = 'rgba(255, 135, 45, 0.90)';
        colSpine   = 'rgba(255, 85, 15, 0.94)';
        colBelly   = 'rgba(255, 255, 255, 0.95)';
        colFin     = [255, 140, 55];
      }

      // Step A: Pectoral Fins (Left & Right attached at gills / node 1)
      var gillNode = nodes[1];
      var finLen = L * 0.44;
      var finFlutter = Math.sin(f.finPhase) * 0.22;

      for (var side = -1; side <= 1; side += 2) {
        var baseFinAng = gillNode.angle + side * (Math.PI * 0.68) + finFlutter * side;
        var fTipX = gillNode.x + Math.cos(baseFinAng) * finLen;
        var fTipY = gillNode.y + Math.sin(baseFinAng) * finLen;
        var fMidX = gillNode.x + Math.cos(baseFinAng + side * 0.4) * (finLen * 0.65);
        var fMidY = gillNode.y + Math.sin(baseFinAng + side * 0.4) * (finLen * 0.65);

        ctx.beginPath();
        ctx.moveTo(gillNode.x, gillNode.y);
        ctx.quadraticCurveTo(fMidX, fMidY, fTipX, fTipY);
        ctx.quadraticCurveTo(gillNode.x + Math.cos(baseFinAng - side * 0.3) * (finLen * 0.5), gillNode.y + Math.sin(baseFinAng - side * 0.3) * (finLen * 0.5), gillNode.x, gillNode.y);
        ctx.closePath();

        var finGrad = ctx.createLinearGradient(gillNode.x, gillNode.y, fTipX, fTipY);
        finGrad.addColorStop(0, 'rgba(' + colFin[0] + ',' + colFin[1] + ',' + colFin[2] + ', 0.65)');
        finGrad.addColorStop(0.6, 'rgba(' + colFin[0] + ',' + colFin[1] + ',' + colFin[2] + ', 0.28)');
        finGrad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
        ctx.fillStyle = finGrad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // Step B: Flowing Gossamer Caudal (Tail) Fin (Twin veil lobes at node 4)
      var tailBase = nodes[4];
      var tailLen = L * 0.95;
      var tailWave1 = Math.sin(f.swimPhase - 3.4) * 0.42;
      var tailWave2 = Math.sin(f.swimPhase - 4.1) * 0.52;

      // Draw 2 overlapping translucent veil tail lobes (upper & lower)
      var lobes = [
        { angle: tailBase.angle + Math.PI + 0.32 + tailWave1, len: tailLen, width: W * 0.65, alpha: 0.55 },
        { angle: tailBase.angle + Math.PI - 0.32 + tailWave2, len: tailLen * 0.9, width: W * 0.60, alpha: 0.48 }
      ];

      for (var li = 0; li < lobes.length; li++) {
        var lb = lobes[li];
        var tTipX = tailBase.x + Math.cos(lb.angle) * lb.len;
        var tTipY = tailBase.y + Math.sin(lb.angle) * lb.len;

        var ctrl1X = tailBase.x + Math.cos(lb.angle - 0.28) * (lb.len * 0.45);
        var ctrl1Y = tailBase.y + Math.sin(lb.angle - 0.28) * (lb.len * 0.45);
        var ctrl2X = tailBase.x + Math.cos(lb.angle + 0.38) * (lb.len * 0.72);
        var ctrl2Y = tailBase.y + Math.sin(lb.angle + 0.38) * (lb.len * 0.72);

        ctx.beginPath();
        ctx.moveTo(tailBase.x, tailBase.y);
        ctx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, tTipX, tTipY);
        var returnCtrlX = tailBase.x + Math.cos(lb.angle - 0.45) * (lb.len * 0.55);
        var returnCtrlY = tailBase.y + Math.sin(lb.angle - 0.45) * (lb.len * 0.55);
        ctx.quadraticCurveTo(returnCtrlX, returnCtrlY, tailBase.x, tailBase.y);
        ctx.closePath();

        var tGrad = ctx.createLinearGradient(tailBase.x, tailBase.y, tTipX, tTipY);
        tGrad.addColorStop(0, 'rgba(' + colFin[0] + ',' + colFin[1] + ',' + colFin[2] + ', ' + lb.alpha + ')');
        tGrad.addColorStop(0.45, 'rgba(' + colFin[0] + ',' + colFin[1] + ',' + colFin[2] + ', ' + (lb.alpha * 0.5) + ')');
        tGrad.addColorStop(0.85, 'rgba(255, 245, 220, ' + (lb.alpha * 0.25) + ')');
        tGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
        ctx.fillStyle = tGrad;
        ctx.fill();

        // Delicate fin ray striations
        for (var ray = -2; ray <= 2; ray++) {
          var rayAng = lb.angle + ray * 0.11;
          ctx.beginPath();
          ctx.moveTo(tailBase.x, tailBase.y);
          ctx.quadraticCurveTo(
            tailBase.x + Math.cos(rayAng) * (lb.len * 0.5),
            tailBase.y + Math.sin(rayAng) * (lb.len * 0.5),
            tailBase.x + Math.cos(rayAng) * (lb.len * 0.92),
            tailBase.y + Math.sin(rayAng) * (lb.len * 0.92)
          );
          ctx.strokeStyle = 'rgba(255, 255, 255, ' + (lb.alpha * 0.4) + ')';
          ctx.lineWidth = 0.65;
          ctx.stroke();
        }
      }

      // Step C: Fish Body Outline (Smooth continuous Bezier contour)
      // Half-widths along vertebrae: 0=snout, 1=gills, 2=mid, 3=rear, 4=peduncle
      var hw = [W * 0.20, W * 0.48, W * 0.52, W * 0.35, W * 0.15];
      var leftPts = [];
      var rightPts = [];
      for (var ni = 0; ni <= 4; ni++) {
        var n = nodes[ni];
        var perpX = -Math.sin(n.angle) * hw[ni];
        var perpY =  Math.cos(n.angle) * hw[ni];
        leftPts.push({ x: n.x + perpX, y: n.y + perpY });
        rightPts.push({ x: n.x - perpX, y: n.y - perpY });
      }

      ctx.beginPath();
      // Start at snout tip
      ctx.moveTo(nodes[0].x, nodes[0].y);
      // Curve down left flank
      ctx.bezierCurveTo(leftPts[0].x, leftPts[0].y, leftPts[1].x, leftPts[1].y, leftPts[2].x, leftPts[2].y);
      ctx.bezierCurveTo(leftPts[3].x, leftPts[3].y, leftPts[4].x, leftPts[4].y, nodes[4].x, nodes[4].y);
      // Curve back up right flank
      ctx.bezierCurveTo(rightPts[4].x, rightPts[4].y, rightPts[3].x, rightPts[3].y, rightPts[2].x, rightPts[2].y);
      ctx.bezierCurveTo(rightPts[1].x, rightPts[1].y, rightPts[0].x, rightPts[0].y, nodes[0].x, nodes[0].y);
      ctx.closePath();

      // Rounded 3D Body Shading Gradient
      var midN = nodes[2];
      var bGrad = ctx.createRadialGradient(midN.x, midN.y, W * 0.12, midN.x, midN.y, W * 0.68);
      bGrad.addColorStop(0, colSpine);
      bGrad.addColorStop(0.48, colPrimary);
      bGrad.addColorStop(0.85, colBelly);
      bGrad.addColorStop(1, colPrimary);
      ctx.fillStyle = bGrad;
      ctx.fill();

      // Delicate spine line and scale sheen
      ctx.beginPath();
      ctx.moveTo(nodes[1].x, nodes[1].y);
      ctx.quadraticCurveTo(nodes[2].x, nodes[2].y, nodes[3].x, nodes[3].y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Glistening scale crescents along the dorsal line
      for (var sc = 1; sc <= 3; sc++) {
        var scNode = nodes[sc];
        ctx.beginPath();
        ctx.arc(scNode.x, scNode.y, W * 0.22, scNode.angle - 0.9, scNode.angle + 0.9);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }

      // Step D: Eyes & Snout Specular
      for (var eyeSide = -1; eyeSide <= 1; eyeSide += 2) {
        var eyeAng = nodes[0].angle + eyeSide * 0.72;
        var eyeDist = L * 0.13;
        var eyeX = nodes[0].x + Math.cos(eyeAng) * eyeDist;
        var eyeY = nodes[0].y + Math.sin(eyeAng) * eyeDist;

        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = '#1c0802';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(eyeX - 0.4, eyeY - 0.4, 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
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
   * Normally drawn by canvas-bg-mandelbrot.js (WebGL, full resolution,
   * a zoom tour of the set's landmarks). This CPU version is its fallback:
   * rendered into a small offscreen buffer (real per-pixel escape-time
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

  function drawMandelbrot(now) {
    if (mandelRenderer && mandelRenderer.draw(ctx, w, h, now)) return;
    if (!mandel) makeMandelbrot();
    var cw = mandel.cw, ch = mandel.ch, octx = mandel.octx;
    var img = octx.createImageData(cw, ch);
    var data = img.data;
    var pal = themePalette();

    var angle = t * 0.00012;
    var cosA = Math.cos(angle), sinA = Math.sin(angle);
    var zoomPulse = 1 + Math.sin(t * 0.00008) * 0.25;
    var scale = (MANDEL_ZOOM / cw) / zoomPulse;
    var driftX = Math.sin(t * 0.00009) * 0.12;
    var driftY = Math.cos(t * 0.00007) * 0.10;
    var colorPhase = t * 0.00025;

    var themeId = currentTheme();
    var isGoldfish = (themeId === 'goldfish');

    for (var py = 0; py < ch; py++) {
      var scY = Math.floor(py / 6);
      var scRowOffset = (scY % 2 === 1) ? 3 : 0;
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
          col = paletteColor(pal, smooth * 0.85 + colorPhase);
          var r = col[0], g = col[1], b = col[2];
          if (isGoldfish) {
            var scX = (px + scRowOffset) % 6 - 3;
            var scD = Math.sqrt(scX * scX + (py % 6) * (py % 6));
            if (scD >= 2.0 && scD <= 3.2) { r = Math.min(255, r + 45); g = Math.min(255, g + 35); }
          }
          data[idx] = r; data[idx + 1] = g; data[idx + 2] = b;
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
      _width: w, _height: h,
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
    // Keep the classic 2D fallback within the active theme's existing colors too.
    var registry = window.ClassroomOSThemeRegistry;
    var theme = registry && registry.get(currentTheme());
    var waxPalette = theme ? (theme.swatch.length > 2 ? theme.swatch.slice(1) : theme.swatch) : ['#0071e3', '#6eb6ff'];
    var tint = ctx.createLinearGradient(0, h, 0, 0);
    waxPalette.forEach(function (color, index) { tint.addColorStop(index / Math.max(1, waxPalette.length - 1), color); });
    ctx.save(); ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = tint; ctx.fillRect(0, 0, w, h); ctx.restore();
  }

  /* ── Animation loop ──────────────────────────────────────────── */
  function tick(now) {
    if (currentBg !== 'lavalamp') t++;
    if      (currentBg === 'mesh')      drawMesh();
    else if (currentBg === 'particles') drawParticles();
    else if (currentBg === 'aurora')    drawAurora();
    else if (currentBg === 'petals')    drawPetals();
    else if (currentBg === 'hive')      drawHive();
    else if (currentBg === 'goldfish')  drawGoldfish();
    else if (currentBg === 'mandelbrot') drawMandelbrot(now);
    else if (currentBg === 'lavalamp') {
      if (!lavaRenderer || !lavaRenderer.draw(ctx, w, h, now, lavaMouse)) {
        if (lavaLast === null) lavaLast = now;
        lavaAccumulator += Math.min(100, now - lavaLast); lavaLast = now;
        while (lavaAccumulator >= 1000 / 60) { t++; drawLavaLamp(); lavaAccumulator -= 1000 / 60; }
      }
    }
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    lavaLast = null; lavaAccumulator = 0;
    if (lavaRenderer) lavaRenderer.pause();
    if (mandelRenderer) mandelRenderer.pause();
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  function start(bg) {
    stop();
    currentBg = bg;
    if (reducedMotionOverride() || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)) {
      if (canvas) ctx.clearRect(0, 0, w, h);
      return;
    }

    if (bg === 'none') {
      if (canvas) { ctx.clearRect(0, 0, w, h); canvas.style.display = 'none'; }
      return;
    }

    if (!canvas && !mount()) return;
    canvas.style.display = '';
    canvas.dataset.bg = bg;

    // Re-init data if switching modes
    if (bg === 'mesh')      { blobs  = null; makeBlobs();     }
    if (bg === 'particles') { pts    = null; makeParticles(); }
    if (bg === 'petals')    { petals = null; makePetals();    }
    if (bg === 'hive')      { bees   = null; makeHive();      }
    if (bg === 'goldfish')  { goldfishSchool = null; goldfishRipples = null; goldfishBubbles = null; makeGoldfish(); }
    if (bg === 'mandelbrot') { loadMandelRenderer(); mandel = null; makeMandelbrot(); }
    if (bg === 'lavalamp')  { loadLavaRenderer(); lavaBlobs = null; lavaBubbles = null; makeLavaLamp(); }

    raf = requestAnimationFrame(tick);
  }

  /* ── Public API (called by nav-mobile.js settings panel) ─────── */
  window.ClassroomOSCanvasBg = {
    set:  function (bg) { start(bg); },
    get:  function ()   { return currentBg; },
    stop: stop,
    lavaStats: function () { return lavaRenderer ? lavaRenderer.stats() : { fallback: true }; },
    mandelStats: function () { return mandelRenderer ? mandelRenderer.stats() : { fallback: true }; },
    __ready: true
  };

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    bindTextureScrollSync();
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function () { start(bgForTheme(currentTheme())); });

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

    window.addEventListener('classroomos:presentationchange', function () {
      if (reducedMotionOverride()) stop();
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
      if (currentBg === 'goldfish')  { goldfishSchool = null; goldfishRipples = null; goldfishBubbles = null; makeGoldfish(); }
      if (currentBg === 'mandelbrot') { mandel = null; makeMandelbrot(); }
      if (currentBg === 'lavalamp' && lavaBlobs) {
        lavaBlobs.forEach(function (b) { b.x *= w / (b._width || w); b.y *= h / (b._height || h); b._width = w; b._height = h; });
      }
    });

    // Pause when tab is backgrounded (battery / CPU)
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else if (currentBg !== 'none' && !reducedMotionOverride() && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) { stop(); raf = requestAnimationFrame(tick); }
    });

    // Theme changed (live, no reload): switch to that theme's pick/default
    // — e.g. hive debuts with honey, petals with sakura — and re-colour.
    window.addEventListener('classroomos:lightingchange', function (e) {
      if (reducedMotionOverride()) return;
      var theme = (e && e.detail && e.detail.theme) || currentTheme();
      var bg = bgForTheme(theme);
      if (bg !== currentBg) start(bg);
      if (currentBg === 'mesh') makeBlobs();
      if (currentBg === 'petals') { petals = null; makePetals(); }
      if (currentBg === 'goldfish') { goldfishSchool = null; goldfishRipples = null; goldfishBubbles = null; makeGoldfish(); }
      if (currentBg === 'mandelbrot') { mandel = null; makeMandelbrot(); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
