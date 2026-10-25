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

  /* ── Visibility-gated requestAnimationFrame ───────────────────────
     SimKit.raf(el) returns a drop-in requestAnimationFrame that holds
     its callbacks while `el` (an element, selector, or list of them; see
     SimKit.stage) is scrolled out of view, sits in a hidden
     panel (display:none), or the tab is hidden, and releases them when
     it can be seen again. A sim scrolled past costs nothing.

       var raf = SimKit.raf(canvas);
       function frame(t) { ...draw...; raf(frame); }
       raf(frame);              // raf.cancel(id) replaces cancelAnimationFrame

     Timestamps skip the time spent paused, so `dt = t - last` in the
     callback sees one ordinary frame on resume instead of minutes of
     physics at once. `margin` (default '200px') starts drawing a little
     before the element scrolls into view.
  */
  function gatedRaf(el, opts) {
    opts = opts || {};
    var targets = stage(el) || [];
    var pauseHidden = opts.pauseHidden !== false;
    var onScreen = true;
    var live = true;
    var offset = 0;
    var pausedAt = null;
    var pending = {};
    var nextId = 1;
    var observer = null;

    function fire(id) {
      return function (timestamp) {
        var entry = pending[id];
        if (!entry) return;
        delete pending[id];
        entry.cb(timestamp - offset);
      };
    }

    function update() {
      var now = onScreen && !(pauseHidden && document.hidden);
      if (now === live) return;
      live = now;
      var id;
      if (!live) {
        pausedAt = global.performance.now();
        for (id in pending) {
          if (pending[id].real !== null) { global.cancelAnimationFrame(pending[id].real); pending[id].real = null; }
        }
      } else {
        if (pausedAt !== null) offset += global.performance.now() - pausedAt;
        pausedAt = null;
        for (id in pending) {
          if (pending[id].real === null) pending[id].real = global.requestAnimationFrame(fire(id));
        }
      }
    }

    function raf(cb) {
      var id = nextId++;
      pending[id] = { cb: cb, real: live ? global.requestAnimationFrame(fire(id)) : null };
      return id;
    }

    raf.cancel = function (id) {
      var entry = pending[id];
      if (!entry) return;
      if (entry.real !== null) global.cancelAnimationFrame(entry.real);
      delete pending[id];
    };

    raf.isLive = function () { return live; };

    raf.destroy = function () {
      if (observer) observer.disconnect();
      observer = null;
      document.removeEventListener('visibilitychange', update);
    };

    // The observer is the authority, including for sims inside a closed <details>: their layout
    // still has a size (getBoundingClientRect), but nothing in them is painted until it opens.
    if (targets.length && global.IntersectionObserver) {
      var showing = [];
      observer = new IntersectionObserver(function (entries) {
        for (var e = 0; e < entries.length; e++) {
          var at = showing.indexOf(entries[e].target);
          if (entries[e].isIntersecting && at === -1) showing.push(entries[e].target);
          else if (!entries[e].isIntersecting && at !== -1) showing.splice(at, 1);
        }
        onScreen = showing.length > 0;
        update();
      }, { rootMargin: opts.margin || '200px' });
      targets.forEach(function (t) { observer.observe(t); });
    }
    document.addEventListener('visibilitychange', update);
    update();
    return raf;
  }

  /* ── What a sim's loop should watch ──────────────────────────────
     SimKit.stage('#canvas', '#graph') lists the elements a loop draws to,
     each widened to its own <figure> when it has one (so a caption or
     readout under the canvas counts). The loop runs while any of them is
     near the screen. It never climbs to page-wide wrappers: lesson-layout
     wraps whole lessons in .ll-sim, and <main> or a long <section> would
     never leave the screen. Missing elements are dropped; with none left
     it returns null and the loop simply never pauses for scrolling.
  */
  function stage() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) {
      var list = Array.isArray(arguments[i]) ? arguments[i] : [arguments[i]];
      for (var j = 0; j < list.length; j++) {
        var t = typeof list[j] === 'string' ? document.querySelector(list[j]) : list[j];
        if (!t) continue;
        var fig = t.closest ? t.closest('figure') : null;
        var el = fig || t;
        if (out.indexOf(el) === -1) out.push(el);
      }
    }
    return out.length ? out : null;
  }

  /* ── One-line swap for a hand-rolled loop ─────────────────────────
     SimKit.frame('#my-canvas', draw) is requestAnimationFrame(draw)
     that waits while that canvas (or its figure) is off-screen.
     The gate is made once per element and reused, so it is cheap to call
     every frame. SimKit.frame.cancel('#my-canvas', id) cancels. With no
     such element it falls back to plain requestAnimationFrame.
  */
  var frameGates = typeof WeakMap === 'function' ? new WeakMap() : null;
  function gateFor(target) {
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el || !frameGates) return null;
    var gate = frameGates.get(el);
    if (!gate) {
      gate = gatedRaf(el);
      frameGates.set(el, gate);
    }
    return gate;
  }
  function frame(target, cb) {
    var gate = gateFor(target);
    return gate ? gate(cb) : global.requestAnimationFrame(cb);
  }
  frame.cancel = function (target, id) {
    var gate = gateFor(target);
    if (gate) gate.cancel(id);
    else global.cancelAnimationFrame(id);
  };

  /* ── Animation loop ───────────────────────────────────────────────
     rAF wrapper that hands the callback a delta time in seconds and
     pauses itself while the tab is hidden. Pass `el` (the sim's canvas
     or stage) and it also pauses while that element is off-screen.
     `maxDt` caps one step (seconds) after a long main-thread stall.
     The handle's pause()/resume() are for a sim's own Pause button.
  */
  function loop(callback, opts) {
    opts = opts || {};
    var raf = gatedRaf(opts.el || null, opts);
    var rafId = null;
    var lastTime = null;
    var alive = true;
    var userPaused = false;

    function tick(timestamp) {
      rafId = null;
      if (lastTime === null) lastTime = timestamp;
      var dt = (timestamp - lastTime) / 1000;
      if (opts.maxDt && dt > opts.maxDt) dt = opts.maxDt;
      lastTime = timestamp;
      callback(dt, timestamp);
      if (alive && !userPaused && rafId === null) rafId = raf(tick);
    }

    function resume() {
      if (rafId !== null || !alive) return;
      userPaused = false;
      lastTime = null;
      rafId = raf(tick);
    }

    function pause() {
      userPaused = true;
      if (rafId !== null) {
        raf.cancel(rafId);
        rafId = null;
      }
    }

    resume();

    return {
      pause: pause,
      resume: resume,
      stop: function () {
        alive = false;
        pause();
        raf.destroy();
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
    raf: gatedRaf,
    stage: stage,
    frame: frame,
    noise: { hash: noiseHash, value: valueNoise, fbm: fbm }
  };
}(window));
