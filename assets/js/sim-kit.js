(function (global) {
  'use strict';

  if (global.SimKit) return;

  /* ── Theme-aware colors ──────────────────────────────────────────
     Reads the same CSS custom properties classroom-home.css defines
     (see --bg / --text / --accent etc.), so simulations stay in sync
     with the site's day/night theme instead of hardcoding a palette
     or re-deriving it from document.*.dataset.theme by hand.
  */
  var THEME_VARS = {
    bg: '--bg',
    text: '--text',
    textMuted: '--text-muted',
    accent: '--accent',
    accentStrong: '--accent-strong',
    panelBg: '--panel-bg',
    cardBg: '--card-bg'
  };
  var THEME_FALLBACKS = {
    bg: '#f5f5f7',
    text: '#1d1d1f',
    textMuted: '#6e6e73',
    accent: '#0071e3',
    accentStrong: '#005ec3',
    panelBg: 'rgba(255, 255, 255, 0.92)',
    cardBg: '#ffffff'
  };

  function themeColors() {
    var style = getComputedStyle(document.documentElement);
    var out = {};
    for (var key in THEME_VARS) {
      var value = style.getPropertyValue(THEME_VARS[key]).trim();
      out[key] = value || THEME_FALLBACKS[key];
    }
    return out;
  }

  function onThemeChange(callback) {
    var lastKey = null;
    function fire() {
      var colors = themeColors();
      var key = colors.bg + '|' + colors.text + '|' + colors.accent;
      if (key === lastKey) return;
      lastKey = key;
      callback(colors);
    }
    var observer = new MutationObserver(fire);
    var watchOpts = { attributes: true, attributeFilter: ['data-theme', 'data-theme-mode', 'class'] };
    observer.observe(document.documentElement, watchOpts);
    if (document.body) observer.observe(document.body, watchOpts);
    fire();
    return { stop: function () { observer.disconnect(); } };
  }

  /* ── Canvas2D sizing ──────────────────────────────────────────────
     Factors out the devicePixelRatio-aware resize/observe boilerplate
     that's currently hand-written in ~99 lesson sims. `dpr: false`
     opts out of DPR scaling for sims that just want 1:1 CSS pixels
     (matches the plain `canvas.width = clientWidth` style some
     lessons already use).
  */
  function canvas2d(canvas, opts) {
    opts = opts || {};
    var box = opts.box || canvas.parentElement;
    var maxDpr = opts.dpr === false || opts.dpr === 0 ? 0 : (opts.dpr || 2);
    var fixedHeight = opts.height;
    var ctx = canvas.getContext('2d', opts.contextAttributes || undefined);
    var width = 0;
    var height = 0;

    function resize() {
      // clientWidth/clientHeight (content-box, border excluded) rather than
      // getBoundingClientRect() (border-box): when the canvas itself is a
      // height:100% child of `box`, feeding a border-box measurement back in
      // as the canvas's target CSS size grows the box by the border width
      // every cycle — a slow-motion ResizeObserver feedback loop.
      var cssWidth = Math.max(1, box.clientWidth);
      var cssHeight = Math.max(1, Math.floor(fixedHeight != null ? fixedHeight : box.clientHeight));
      if (maxDpr) {
        var dpr = Math.min(global.devicePixelRatio || 1, maxDpr);
        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);
        canvas.style.width = cssWidth + 'px';
        canvas.style.height = cssHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else {
        canvas.width = cssWidth;
        canvas.height = cssHeight;
      }
      width = cssWidth;
      height = cssHeight;
      if (opts.onResize) opts.onResize(ctx, width, height);
    }

    var observer = null;
    if (global.ResizeObserver) {
      observer = new ResizeObserver(resize);
      observer.observe(box);
    } else {
      global.addEventListener('resize', resize);
    }
    resize();

    return {
      ctx: ctx,
      get width() { return width; },
      get height() { return height; },
      resize: resize,
      destroy: function () {
        if (observer) observer.disconnect();
        else global.removeEventListener('resize', resize);
      }
    };
  }

  /* ── Animation loop ───────────────────────────────────────────────
     rAF wrapper that hands the callback a delta time in seconds and
     pauses itself while the tab is hidden (no lesson does this today
     — it's free battery/CPU savings for background tabs).
  */
  function loop(callback, opts) {
    opts = opts || {};
    var pauseHidden = opts.pauseHidden !== false;
    var rafId = null;
    var lastTime = null;
    var alive = true;

    function tick(timestamp) {
      if (lastTime === null) lastTime = timestamp;
      var dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      callback(dt, timestamp);
      if (alive) rafId = global.requestAnimationFrame(tick);
    }

    function resume() {
      if (rafId !== null || !alive) return;
      lastTime = null;
      rafId = global.requestAnimationFrame(tick);
    }

    function pause() {
      if (rafId !== null) {
        global.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function onVisibility() {
      if (!pauseHidden) return;
      if (document.hidden) pause();
      else resume();
    }

    document.addEventListener('visibilitychange', onVisibility);
    resume();

    return {
      stop: function () {
        alive = false;
        pause();
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }

  /* ── Value noise ──────────────────────────────────────────────────
     Deterministic 2D value noise and fBm (fractional Brownian motion)
     for procedural terrain, cloud cover and turbulence — the sin-hash
     stack the climate and volcano sims used to paste inline. Same
     inputs give the same outputs on every load; results are in [0, 1).
  */
  function noiseHash(x, y) {
    var s = Math.sin((x + y * 57) * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function fade(t) { return t * t * (3 - 2 * t); }

  function valueNoise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y);
    var ux = fade(x - ix), uy = fade(y - iy);
    var a = noiseHash(ix, iy), b = noiseHash(ix + 1, iy);
    var c = noiseHash(ix, iy + 1), d = noiseHash(ix + 1, iy + 1);
    var top = a + (b - a) * ux;
    var bottom = c + (d - c) * ux;
    return top + (bottom - top) * uy;
  }

  // Octaves double in frequency and halve in amplitude (0.5, 0.25, …).
  function fbm(x, y, octaves) {
    var v = 0, a = 0.5, f = 1;
    for (var i = 0; i < octaves; i++) { v += a * valueNoise(x * f, y * f); a *= 0.5; f *= 2; }
    return v;
  }

  global.SimKit = {
    theme: { colors: themeColors, onChange: onThemeChange },
    canvas2d: canvas2d,
    loop: loop,
    noise: { hash: noiseHash, value: valueNoise, fbm: fbm }
  };
}(window));
