/* FourierKit: shared pieces for the Fourier Series lesson's labs (wave catalogue, partial sums,
 * canvas sizing, on-screen-only animation loop, one shared AudioContext).
 * Moved out of the page's first inline <script>; the maths is tested in tests/fourier-kit.test.mjs. */
  var FourierKit = (function () {
    var TAU = Math.PI * 2;
    var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* Wrap an angle into (−π, π]. */
    function wrap(x) {
      var w = ((x + Math.PI) % TAU + TAU) % TAU - Math.PI;
      return w;
    }

    /* Size a canvas to its container at device resolution and hand back a
       cleared, correctly scaled 2D context in CSS pixels. */
    function fit(canvas, cssH) {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var host = canvas.parentElement;
      var w = Math.max(160, Math.round((host && host.clientWidth) || canvas.clientWidth || 320));
      var pxW = Math.round(w * dpr), pxH = Math.round(cssH * dpr);
      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW;
        canvas.height = pxH;
        canvas.style.height = cssH + 'px';
      }
      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, cssH);
      return { ctx: ctx, w: w, h: cssH };
    }

    /* Redraw whenever the canvas's container actually changes width.
       A plain window resize listener is not enough: opening the side
       panel narrows the content column without resizing the window,
       which would leave any off-screen canvas stretched at its old
       width until something else happened to redraw it. */
    function onResize(canvas, fn) {
      var host = canvas.parentElement || canvas;
      var lastW = -1;
      function check() {
        var w = Math.round(host.clientWidth);
        if (w === lastW || w === 0) return;
        lastW = w;
        fn();
      }
      if ('ResizeObserver' in window) {
        new ResizeObserver(check).observe(host);
      }
      window.addEventListener('resize', function () { lastW = -1; check(); });
    }

    /* An animation loop that only burns frames while its element is on
       screen and the tab is visible. Six labs on one page makes this
       the difference between a smooth page and a hot laptop. */
    function loop(el, draw) {
      var running = false, id = null, last = 0, wanted = false, forced = false;
      function frame(now) {
        id = requestAnimationFrame(frame);
        var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
        last = now;
        draw(dt);
      }
      function start() {
        if (running) return;
        running = true; last = 0;
        id = requestAnimationFrame(frame);
      }
      function stop() {
        running = false;
        if (id) cancelAnimationFrame(id);
        id = null;
      }
      function sync() {
        if ((wanted || forced) && !document.hidden) start(); else stop();
      }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { wanted = e.isIntersecting; });
          sync();
        }, { rootMargin: '140px' }).observe(el);
      } else {
        wanted = true;
      }
      document.addEventListener('visibilitychange', sync);
      sync();
      return {
        sync: sync,
        force: function (v) { forced = v; sync(); },
        isVisible: function () { return wanted; }
      };
    }

    /* ── Waveform catalogue ──────────────────────────────
       Every harmonic is expressed the same way — amplitude
       and phase — so one renderer can draw sine-only waves
       (square/triangle/saw) and cosine ones (pulse) alike.
       Term value = amp · sin(n·x + phase).
    ─────────────────────────────────────────────────────── */
    var WAVES = {
      square: {
        label: 'Square',
        dc: function () { return 0; },
        harmonic: function (n) {
          return (n % 2) ? { n: n, amp: 4 / (Math.PI * n), phase: 0 } : null;
        },
        target: function (x) { return wrap(x) >= 0 ? 1 : -1; }
      },
      triangle: {
        label: 'Triangle',
        dc: function () { return 0; },
        harmonic: function (n) {
          if (n % 2 === 0) return null;
          var k = (n - 1) / 2;
          return { n: n, amp: 8 / (Math.PI * Math.PI * n * n), phase: (k % 2 === 0) ? 0 : Math.PI };
        },
        target: function (x) { return (2 / Math.PI) * Math.asin(Math.sin(x)); }
      },
      sawtooth: {
        label: 'Sawtooth',
        dc: function () { return 0; },
        harmonic: function (n) {
          return { n: n, amp: 2 / (Math.PI * n), phase: (n % 2 === 1) ? 0 : Math.PI };
        },
        target: function (x) { return wrap(x) / Math.PI; }
      },
      pulse: {
        label: 'Pulse',
        dc: function (duty) { return 2 * duty - 1; },
        harmonic: function (n, duty) {
          var a = 4 * Math.sin(n * Math.PI * duty) / (n * Math.PI);
          if (Math.abs(a) < 1e-6) return null;      // an even harmonic that cancelled
          return { n: n, amp: Math.abs(a), phase: a > 0 ? Math.PI / 2 : -Math.PI / 2 };
        },
        target: function (x, duty) { return Math.abs(wrap(x)) < Math.PI * duty ? 1 : -1; }
      }
    };

    /* The first `count` harmonics that are actually non-zero. */
    function terms(type, count, duty) {
      var wave = WAVES[type], out = [], n = 1;
      while (out.length < count && n <= 400) {
        var h = wave.harmonic(n, duty);
        if (h) out.push(h);
        n++;
      }
      return out;
    }

    function sumAt(list, x, dc, muted) {
      var s = dc || 0;
      for (var i = 0; i < list.length; i++) {
        if (muted && muted[list[i].n]) continue;
        s += list[i].amp * Math.sin(list[i].n * x + list[i].phase);
      }
      return s;
    }

    var PALETTE = [
      '#38bdf8', '#818cf8', '#34d399', '#fb923c', '#f472b6', '#a78bfa',
      '#facc15', '#4ade80', '#60a5fa', '#f87171', '#2dd4bf', '#c084fc',
      '#fbbf24', '#86efac', '#67e8f9', '#e879f9', '#94a3b8', '#f9a8d4',
      '#6ee7b7', '#c4b5fd', '#7dd3fc', '#fda4af', '#bef264', '#d8b4fe'
    ];

    /* ── Shared audio ────────────────────────────────────
       One AudioContext for the whole page, and one owner at
       a time — pressing play in a second lab politely stops
       the first. Nothing starts without a user gesture.
    ─────────────────────────────────────────────────────── */
    var ctx = null, owner = null, stopFns = {};
    function audio() {
      if (!ctx) {
        var Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return null;
        ctx = new Ctor();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function claim(name, stopFn) {
      if (owner && owner !== name && stopFns[owner]) stopFns[owner]();
      owner = name;
      stopFns[name] = stopFn;
    }
    function release(name) {
      if (owner === name) owner = null;
      delete stopFns[name];
    }

    /* Grid + axis furniture shared by most of the plots. */
    function plotFrame(ctx2, w, h, opts) {
      opts = opts || {};
      ctx2.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx2.lineWidth = 1;
      var rows = opts.rows || 4;
      for (var i = 1; i < rows; i++) {
        var y = (h * i) / rows;
        ctx2.beginPath(); ctx2.moveTo(0, y); ctx2.lineTo(w, y); ctx2.stroke();
      }
      ctx2.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx2.beginPath();
      ctx2.moveTo(0, h / 2); ctx2.lineTo(w, h / 2);
      ctx2.stroke();
    }

    return {
      TAU: TAU, reduced: reduced, wrap: wrap, fit: fit, loop: loop, onResize: onResize,
      WAVES: WAVES, terms: terms, sumAt: sumAt, PALETTE: PALETTE,
      audio: audio, claim: claim, release: release, plotFrame: plotFrame
    };
  })();
