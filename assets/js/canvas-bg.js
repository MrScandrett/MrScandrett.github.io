/**
 * canvas-bg.js — Animated hero canvas backgrounds
 * Loaded only on index.html. Settings panel (nav-mobile.js) writes the
 * preference; this file reads it and renders it.
 *
 * Modes: 'none' | 'mesh' | 'particles' | 'aurora'
 * Storage key: classroomos-canvas-bg
 * Change event: classroomos:canvasbgchange  →  { detail: { bg: 'mesh' } }
 */

(function () {
  var STORAGE_KEY  = 'classroomos-canvas-bg';
  var CHANGE_EVENT = 'classroomos:canvasbgchange';

  var canvas, ctx, raf;
  var w = 0, h = 0, t = 0;
  var currentBg = 'none';
  var blobs = null, pts = null;

  /* ── Storage ─────────────────────────────────────────────────── */
  function read() {
    try { return localStorage.getItem(STORAGE_KEY) || 'particles'; } catch (e) { return 'particles'; }
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
      topaz:   [255, 185,   0]
    };
    return map[theme] || map['day'];
  }

  function rgba(rgb, a) {
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')';
  }

  /* ── Canvas mount / resize ───────────────────────────────────── */
  function mount() {
    var hero = document.querySelector('.hero');
    if (!hero) return false;

    canvas = document.getElementById('hero-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'hero-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      hero.insertBefore(canvas, hero.firstChild);
    }

    ctx = canvas.getContext('2d');
    resize();
    return true;
  }

  function resize() {
    if (!canvas) return;
    var hero = canvas.parentElement;
    w = canvas.width  = hero.offsetWidth  || 960;
    h = canvas.height = hero.offsetHeight || 220;
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
    if (bg === 'mesh')      { blobs = null; makeBlobs();     }
    if (bg === 'particles') { pts   = null; makeParticles(); }

    raf = requestAnimationFrame(tick);
  }

  /* ── Public API (called by nav-mobile.js settings panel) ─────── */
  window.ClassroomOSCanvasBg = {
    set:  function (bg) { start(bg); },
    get:  function ()   { return currentBg; },
    stop: stop
  };

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    // Skip if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Skip on weak hardware (Chromebooks, older tablets)
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return;

    if (!mount()) return;

    var stored = read();
    if (stored && stored !== 'none') start(stored);

    // Settings panel fired a change on this same page
    window.addEventListener(CHANGE_EVENT, function (e) {
      if (e && e.detail && e.detail.bg) start(e.detail.bg);
    });

    // Preference changed from another tab
    window.addEventListener('storage', function (e) {
      if (e && e.key === STORAGE_KEY) start(e.newValue || 'none');
    });

    // Repaint on resize
    window.addEventListener('resize', function () {
      resize();
      if (currentBg === 'mesh')      { blobs = null; makeBlobs();     }
      if (currentBg === 'particles') { pts   = null; makeParticles(); }
    });

    // Pause when tab is backgrounded (battery / CPU)
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else if (currentBg !== 'none') { t = t; raf = requestAnimationFrame(tick); }
    });

    // Re-colour when theme changes
    window.addEventListener('classroomos:lightingchange', function () {
      if (currentBg === 'mesh')      makeBlobs();
      if (currentBg === 'particles') { /* colours read live */ }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
