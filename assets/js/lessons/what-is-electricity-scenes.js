/*
 * Canvas scenes for lessons/physics/electricity-and-magnetism/what-is-electricity.html
 *
 *  - Section 2: Water loop (tower + pump = battery, gate valve = resistor, wheel = load)
 *    with a live circuit twin, pressure gauges, a shut-off switch and draggable parts.
 *  - Section 3: Materials bench (battery, lamp, analog log-scale ammeter, real samples,
 *    an animated atomic zoom per material, and a resistivity ladder).
 *  - Section 6: Power-grid panorama (plant → step-up → towers → substation → pole → home)
 *    with a flying camera, a voltage profile, and the transmission-loss calculator.
 *
 * Every scene draws in fixed "world" units scaled to its box, runs on SimKit.loop (so it
 * pauses off-screen), and draws a single still frame per change under reduced motion.
 * The maths (I = V/R, P = I²R, loss = (P/V)²R) lives in small pure helpers near the top.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
  var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mix(c1, c2, t) {
    return 'rgb(' + Math.round(lerp(c1[0], c2[0], t)) + ',' + Math.round(lerp(c1[1], c2[1], t)) + ',' + Math.round(lerp(c1[2], c2[2], t)) + ')';
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  // Deterministic pseudo-random so scenery doesn't shuffle between frames.
  function seeded(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function text(ctx, str, x, y, size, color, opts) {
    opts = opts || {};
    ctx.font = (opts.weight || 700) + ' ' + size + 'px ' + FONT;
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.baseline || 'alphabetic';
    if (opts.shadow) {
      ctx.save();
      ctx.shadowColor = opts.shadow;
      ctx.shadowBlur = opts.blur || 6;
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
      ctx.restore();
    } else {
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
    }
  }

  function tag(ctx, str, x, y, opts) {
    opts = opts || {};
    var size = opts.size || 12;
    ctx.font = '800 ' + size + 'px ' + FONT;
    var w = ctx.measureText(str).width + size * 1.2;
    var h = size * 1.75;
    var left = opts.align === 'left' ? x : opts.align === 'right' ? x - w : x - w / 2;
    roundRect(ctx, left, y - h / 2, w, h, h / 2);
    ctx.fillStyle = opts.bg || 'rgba(8,15,30,0.82)';
    ctx.fill();
    if (opts.border) {
      ctx.strokeStyle = opts.border;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.fillStyle = opts.color || '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, left + w / 2, y + 0.5);
    return { x: left, y: y - h / 2, w: w, h: h };
  }

  // A polyline you can walk along: at(d) → {x, y, a, seg}
  function makePath(points) {
    var lens = [];
    var total = 0;
    for (var i = 0; i < points.length - 1; i++) {
      var dx = points[i + 1][0] - points[i][0];
      var dy = points[i + 1][1] - points[i][1];
      var l = Math.sqrt(dx * dx + dy * dy);
      lens.push(l);
      total += l;
    }
    return {
      points: points,
      total: total,
      at: function (d) {
        d = ((d % total) + total) % total;
        for (var k = 0; k < lens.length; k++) {
          if (d <= lens[k] || k === lens.length - 1) {
            var t = lens[k] ? d / lens[k] : 0;
            var p = points[k];
            var q = points[k + 1];
            return { x: lerp(p[0], q[0], t), y: lerp(p[1], q[1], t), a: Math.atan2(q[1] - p[1], q[0] - p[0]), seg: k };
          }
          d -= lens[k];
        }
        return { x: points[0][0], y: points[0][1], a: 0, seg: 0 };
      }
    };
  }

  function bezierPoints(p0, p1, p2, p3, n) {
    var out = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      var u = 1 - t;
      out.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
      ]);
    }
    return out;
  }

  function strokePoints(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  /* ── Scene host ──────────────────────────────────────────────────
     Sizes the canvas to its box (which keeps the aspect ratio in CSS),
     maps pointer events to world units, and runs the frame loop. */
  function mountScene(canvas, world, scene) {
    var box = canvas.parentElement;
    var view = { w: 1, h: 1, s: 1 };
    var surface = window.SimKit.canvas2d(canvas, {
      box: box,
      onResize: function (ctx, w, h) {
        view.w = w;
        view.h = h;
        view.s = w / world.w;
        if (scene.resize) scene.resize(view);
        render();
      }
    });
    var clock = 0;

    function render() {
      if (!surface) return;
      var ctx = surface.ctx;
      ctx.save();
      ctx.clearRect(0, 0, view.w, view.h);
      scene.draw(ctx, view, clock);
      ctx.restore();
    }

    function toWorld(ev) {
      var r = canvas.getBoundingClientRect();
      var fx = (ev.clientX - r.left) / Math.max(1, r.width);
      var fy = (ev.clientY - r.top) / Math.max(1, r.height);
      if (scene.screenToWorld) return scene.screenToWorld(fx * view.w, fy * view.h, view);
      return { x: fx * world.w, y: fy * view.h / view.s };
    }

    if (scene.pointer) {
      var drag = null;
      canvas.addEventListener('pointerdown', function (ev) {
        var p = toWorld(ev);
        drag = scene.pointer('down', p, ev) || null;
        if (drag) {
          try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
          drag.start = p;
          drag.moved = false;
          if (reducedMotion) render();
        }
      });
      canvas.addEventListener('pointermove', function (ev) {
        var p = toWorld(ev);
        if (drag) {
          if (Math.abs(p.x - drag.start.x) + Math.abs(p.y - drag.start.y) > 4) drag.moved = true;
          scene.pointer('move', p, ev, drag);
          if (reducedMotion) render();
        } else {
          canvas.style.cursor = scene.pointer('hover', p, ev) || 'default';
        }
      });
      function end(ev) {
        if (!drag) return;
        scene.pointer('up', toWorld(ev), ev, drag);
        drag = null;
        if (reducedMotion) render();
      }
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
      canvas.addEventListener('pointerleave', function () { if (!drag) canvas.style.cursor = 'default'; });
    }

    if (!reducedMotion) {
      window.SimKit.loop(function (dt) {
        dt = Math.min(dt, 0.05);
        clock += dt;
        if (scene.step) scene.step(dt, clock);
        render();
      }, { el: canvas, maxDt: 0.1 });
    } else if (scene.step) {
      // Settle particles into place once so the still frame shows a populated scene.
      scene.step(0, 0);
    }
    render();
    return {
      invalidate: function () {
        if (reducedMotion) {
          if (scene.step) scene.step(0, clock);
          render();
        }
      }
    };
  }

  function formatAmps(a) {
    var abs = Math.abs(a);
    if (abs >= 1) return a.toFixed(abs >= 10 ? 1 : 2) + ' A';
    if (abs >= 1e-3) { var m = a * 1e3; return (m >= 100 ? Math.round(m) : m >= 10 ? m.toFixed(1) : m.toFixed(2)) + ' mA'; }
    if (abs >= 1e-6) { var u = a * 1e6; return (u >= 100 ? Math.round(u) : u >= 10 ? u.toFixed(1) : u.toFixed(2)) + ' µA'; }
    if (abs >= 1e-9) { var n = a * 1e9; return (n >= 10 ? Math.round(n) : n.toFixed(2)) + ' nA'; }
    if (abs >= 1e-12) return (a * 1e12).toFixed(abs * 1e12 >= 10 ? 0 : 2) + ' pA';
    return a === 0 ? '0 A' : (a * 1e15).toFixed(1) + ' fA';
  }

  function formatOhms(r) {
    if (r >= 1e12) {
      var e = Math.floor(Math.log10(r));
      var m = r / Math.pow(10, e);
      return (m >= 1.05 ? m.toFixed(1) + ' × ' : '') + '10' + sup(e) + ' Ω';
    }
    if (r >= 1e9) return (r / 1e9).toPrecision(2) + ' GΩ';
    if (r >= 1e6) return (r / 1e6).toPrecision(2) + ' MΩ';
    if (r >= 1e3) return (r / 1e3).toPrecision(3).replace(/\.0+$/, '') + ' kΩ';
    if (r >= 1) return (r >= 100 ? Math.round(r) : r.toPrecision(3)).toString().replace(/\.0+$/, '') + ' Ω';
    return (r * 1e3).toPrecision(2) + ' mΩ';
  }

  function formatWatts(w) {
    if (w >= 1e6) return (w / 1e6).toFixed(w >= 1e7 ? 0 : 1) + ' MW';
    if (w >= 1e3) return (w / 1e3).toFixed(1) + ' kW';
    if (w >= 1) return w.toFixed(w >= 10 ? 0 : 1) + ' W';
    if (w >= 1e-3) return (w * 1e3).toFixed(w >= 0.01 ? 0 : 1) + ' mW';
    if (w >= 1e-6) return (w * 1e6).toFixed(1) + ' µW';
    return w === 0 ? '0 W' : '< 1 µW';
  }

  function sup(n) {
    var map = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    return String(n).split('').map(function (c) { return map[c] || c; }).join('');
  }

  /* ════════════════════════════════════════════════════════════════
     SECTION 2 — WATER LOOP
     ════════════════════════════════════════════════════════════════ */
  var WATER = {
    voltages: [
      { v: 1.5, name: 'one AA cell' },
      { v: 3, name: 'two AA cells' },
      { v: 4.5, name: 'three AA cells' },
      { v: 6, name: 'lantern battery' },
      { v: 9, name: '9-volt battery' },
      { v: 12, name: 'car battery' }
    ],
    resistances: [
      { r: 50, name: 'Wide open' },
      { r: 100, name: 'Open' },
      { r: 150, name: 'Mostly open' },
      { r: 220, name: 'Partly closed' },
      { r: 300, name: 'Half closed' },
      { r: 470, name: 'Narrowed' },
      { r: 680, name: 'Tight' },
      { r: 1000, name: 'Very tight' },
      { r: 1200, name: 'Tightly pinched' },
      { r: 2000, name: 'Nearly shut' }
    ]
  };

  function initWaterScene() {
    var canvas = document.getElementById('we-water-canvas');
    var vSlider = document.getElementById('we-tower-slider');
    var rSlider = document.getElementById('we-water-slider');
    var switchBtn = document.getElementById('we-water-switch');
    var twinToggle = document.getElementById('we-water-twin');
    var vLabel = document.getElementById('we-tower-label');
    var rLabel = document.getElementById('we-water-level-label');
    var outV = document.getElementById('we-water-v');
    var outR = document.getElementById('we-water-r');
    var outI = document.getElementById('we-water-i');
    var outP = document.getElementById('we-water-p');
    var caption = document.getElementById('we-water-caption');
    if (!canvas || !vSlider || !rSlider || !window.SimKit) return;

    var W = 960;
    var H = 540;
    var G = 432; // ground line
    var PIPE_Y = 286;
    var TANK = { x0: 70, x1: 190, top: 64, bottom: 296 };
    var VALVE_X = 470;
    var WHEEL = { x: 668, y: PIPE_Y, r: 50 };
    var state = {
      vIdx: parseInt(vSlider.value, 10) || 3,
      rIdx: parseInt(rSlider.value, 10) || 1,
      open: true,
      twin: true,
      level: 0, // animated water level (0..1)
      opening: 1, // animated gate opening (0..1)
      handle: 0, // handwheel rotation
      wheelAngle: 0,
      pumpAngle: 0,
      flow: 0, // animated flow speed (px/s)
      offset: 0, // particle offset along loop
      twinOffset: 0,
      hover: null
    };

    // Loop centreline: tank outlet → valve → wheel → down → underground return → pump → riser → spout.
    var loopPts = [
      [TANK.x1, PIPE_Y], [890, PIPE_Y], [890, 486], [30, 486], [30, 16], [130, 16]
    ];
    var loop = makePath(loopPts);
    var particles = [];
    var rnd = seeded(7);
    for (var i = 0; i < 110; i++) particles.push({ d: (i / 110) * loop.total, lane: (rnd() - 0.5) * 0.7, size: 1.6 + rnd() * 1.6 });
    var splash = [];

    function values() {
      var V = WATER.voltages[state.vIdx].v;
      var R = WATER.resistances[state.rIdx].r;
      var mA = state.open ? (V / R) * 1000 : 0;
      return { V: V, R: R, mA: mA, mW: V * mA };
    }

    function fmtmA(mA) { return mA === 0 ? '0 mA' : mA >= 10 ? Math.round(mA) + ' mA' : mA.toFixed(1) + ' mA'; }
    function fmtmW(mW) {
      if (mW >= 1000) return (mW / 1000).toFixed(2) + ' W';
      return mW === 0 ? '0 mW' : mW >= 10 ? Math.round(mW) + ' mW' : mW.toFixed(1) + ' mW';
    }

    function openingFor(rIdx) {
      // Gate opening in the drawing: log-spaced so every click visibly changes the gap.
      var r = WATER.resistances[rIdx].r;
      return clamp(1 - Math.log(r / 50) / Math.log(2000 / 50) * 0.86, 0.12, 1);
    }

    function syncUI() {
      var v = values();
      var vInfo = WATER.voltages[state.vIdx];
      var rInfo = WATER.resistances[state.rIdx];
      vSlider.value = String(state.vIdx);
      rSlider.value = String(state.rIdx);
      vSlider.setAttribute('aria-valuetext', v.V + ' volts, ' + vInfo.name);
      rSlider.setAttribute('aria-valuetext', v.R + ' ohms, ' + rInfo.name);
      if (vLabel) vLabel.textContent = v.V + ' V · ' + vInfo.name;
      if (rLabel) rLabel.textContent = rInfo.name + ' (' + v.R.toLocaleString() + ' Ω) · ' + v.V + ' V → ' + fmtmA(v.mA);
      if (outV) outV.textContent = v.V + ' V';
      if (outR) outR.textContent = v.R.toLocaleString() + ' Ω';
      if (outI) outI.textContent = fmtmA(v.mA);
      if (outP) outP.textContent = fmtmW(v.mW);
      if (switchBtn) {
        switchBtn.setAttribute('aria-pressed', String(!state.open));
        switchBtn.textContent = state.open ? 'Close the shut-off valve (open the switch)' : 'Open the shut-off valve (close the switch)';
      }
      if (twinToggle) twinToggle.checked = state.twin;
      if (caption) {
        caption.textContent = state.open
          ? 'A ' + v.V + ' V ' + vInfo.name + ' pushes against ' + v.R.toLocaleString() + ' Ω, so I = V ÷ R = ' + fmtmA(v.mA) +
            '. The same ' + fmtmA(v.mA) + ' flows through every part of the loop, and ' + fmtmW(v.mW) +
            ' of energy per second is handed to the valve (as heat) and the wheel (as motion).'
          : 'Shut-off valve closed: the tower still holds ' + v.V + ' V of pressure (the left gauge still reads it), but nothing flows. ' +
            'An open switch is exactly this: voltage with no current.';
      }
      if (handle) handle.invalidate();
    }

    function setV(idx) { state.vIdx = clamp(idx, 0, WATER.voltages.length - 1); syncUI(); }
    function setR(idx) { state.rIdx = clamp(idx, 0, WATER.resistances.length - 1); syncUI(); }

    vSlider.addEventListener('input', function () { setV(parseInt(vSlider.value, 10) || 0); });
    rSlider.addEventListener('input', function () { setR(parseInt(rSlider.value, 10) || 0); });
    if (switchBtn) switchBtn.addEventListener('click', function () { state.open = !state.open; syncUI(); });
    if (twinToggle) twinToggle.addEventListener('change', function () { state.twin = twinToggle.checked; syncUI(); });

    function targetLevel() { return WATER.voltages[state.vIdx].v / 12; }
    function surfaceY(level) { return TANK.bottom - 14 - level * (TANK.bottom - TANK.top - 40); }
    function targetFlow() {
      var mA = values().mA;
      return mA <= 0 ? 0 : 30 + 300 * Math.sqrt(mA / 240);
    }

    state.level = targetLevel();
    state.opening = openingFor(state.rIdx);
    state.flow = targetFlow();

    function step(dt) {
      var k = reducedMotion ? 1 : 1 - Math.exp(-dt * 5);
      state.level = lerp(state.level, targetLevel(), k);
      var targetOpen = openingFor(state.rIdx);
      state.handle += (state.opening - targetOpen) * 9 * (reducedMotion ? 0 : 1);
      state.opening = lerp(state.opening, targetOpen, k);
      state.flow = lerp(state.flow, targetFlow(), reducedMotion ? 1 : 1 - Math.exp(-dt * 3));
      state.offset += state.flow * dt;
      state.twinOffset += state.flow * 0.35 * dt;
      state.wheelAngle += (state.flow / WHEEL.r) * dt * 0.55;
      state.pumpAngle += (state.flow / 14) * dt;
      // splash drops at the spout and in the wheel housing
      if (!reducedMotion && state.flow > 1) {
        if (Math.random() < state.flow * dt * 0.08) {
          splash.push({ x: (TANK.x0 + TANK.x1) / 2 + (Math.random() - 0.5) * 8, y: surfaceY(state.level) - 2, vx: (Math.random() - 0.5) * 50, vy: -40 - Math.random() * 60, life: 0.6 });
        }
      }
      for (var s = splash.length - 1; s >= 0; s--) {
        var p = splash[s];
        p.vy += 260 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) splash.splice(s, 1);
      }
    }

    /* drawing helpers */
    function pipeSegment(ctx, a, b, w, water, pressureCol) {
      var horizontal = Math.abs(a[1] - b[1]) < 1;
      // outer wall
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#2b3a4c';
      ctx.lineWidth = w + 5;
      strokePoints(ctx, [a, b]);
      // glass body
      ctx.strokeStyle = 'rgba(214,232,247,0.92)';
      ctx.lineWidth = w;
      strokePoints(ctx, [a, b]);
      // water core
      if (water) {
        ctx.strokeStyle = pressureCol;
        ctx.lineWidth = w - 7;
        strokePoints(ctx, [a, b]);
      }
      // specular highlight (light from top-left)
      var off = w * 0.27;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(1.5, w * 0.14);
      ctx.lineCap = 'butt';
      if (horizontal) strokePoints(ctx, [[a[0], a[1] - off], [b[0], b[1] - off]]);
      else strokePoints(ctx, [[a[0] - off, a[1]], [b[0] - off, b[1]]]);
      ctx.strokeStyle = 'rgba(15,30,50,0.18)';
      ctx.lineWidth = Math.max(1.5, w * 0.12);
      if (horizontal) strokePoints(ctx, [[a[0], a[1] + off], [b[0], b[1] + off]]);
      else strokePoints(ctx, [[a[0] + off, a[1]], [b[0] + off, b[1]]]);
    }

    function pressureColor(frac) {
      // deep blue = high pressure, pale = low pressure
      return mix([174, 214, 241], [16, 92, 196], clamp(frac, 0, 1));
    }

    function drawBackground(ctx) {
      var sky = ctx.createLinearGradient(0, 0, 0, G);
      sky.addColorStop(0, '#bcdcf5');
      sky.addColorStop(1, '#eef6fc');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, G);
      // distant hills
      ctx.fillStyle = '#cfe3d6';
      ctx.beginPath();
      ctx.moveTo(0, G);
      for (var x = 0; x <= W; x += 20) ctx.lineTo(x, G - 30 - 18 * Math.sin(x / 130) - 10 * Math.sin(x / 47 + 1));
      ctx.lineTo(W, G);
      ctx.fill();
      // soil cutaway
      var soil = ctx.createLinearGradient(0, G, 0, H);
      soil.addColorStop(0, '#8a6a4a');
      soil.addColorStop(1, '#5d4632');
      ctx.fillStyle = soil;
      ctx.fillRect(0, G, W, H - G);
      // soil speckles
      var r = seeded(11);
      ctx.fillStyle = 'rgba(40,25,10,0.25)';
      for (var i = 0; i < 160; i++) ctx.fillRect(r() * W, G + 14 + r() * (H - G - 14), 2 + r() * 3, 1.5 + r() * 2);
      // grass edge
      ctx.fillStyle = '#5f9b4c';
      ctx.fillRect(0, G - 4, W, 10);
      ctx.fillStyle = '#7cb562';
      ctx.fillRect(0, G - 4, W, 3);
      text(ctx, 'CUTAWAY: pipe runs underground', W - 14, H - 12, 11, 'rgba(255,240,220,0.75)', { align: 'right', weight: 700 });
    }

    function drawTower(ctx) {
      var x0 = TANK.x0;
      var x1 = TANK.x1;
      var cx = (x0 + x1) / 2;
      var rx = (x1 - x0) / 2;
      var ry = 12;
      // legs + bracing
      ctx.strokeStyle = '#5b6878';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      strokePoints(ctx, [[x0 + 12, TANK.bottom + 6], [x0 - 6, G]]);
      strokePoints(ctx, [[x1 - 12, TANK.bottom + 6], [x1 + 6, G]]);
      strokePoints(ctx, [[cx, TANK.bottom + 10], [cx, G]]);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#7b8898';
      strokePoints(ctx, [[x0 + 8, TANK.bottom + 40], [x1 - 6, TANK.bottom + 100]]);
      strokePoints(ctx, [[x1 - 8, TANK.bottom + 40], [x0 + 6, TANK.bottom + 100]]);
      // tank body (steel), with a glass cutaway window
      var body = ctx.createLinearGradient(x0, 0, x1, 0);
      body.addColorStop(0, '#6f7f91');
      body.addColorStop(0.35, '#d6dee7');
      body.addColorStop(0.6, '#a6b3c1');
      body.addColorStop(1, '#5a6879');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(x0, TANK.top);
      ctx.lineTo(x0, TANK.bottom);
      ctx.ellipse(cx, TANK.bottom, rx, ry, 0, Math.PI, 0, true);
      ctx.lineTo(x1, TANK.top);
      ctx.closePath();
      ctx.fill();
      // window
      var wx0 = x0 + 14;
      var wx1 = x1 - 14;
      var wTop = TANK.top + 18;
      var wBot = TANK.bottom - 4;
      ctx.save();
      roundRect(ctx, wx0, wTop, wx1 - wx0, wBot - wTop, 8);
      ctx.clip();
      ctx.fillStyle = 'rgba(225,240,250,0.95)';
      ctx.fillRect(wx0, wTop, wx1 - wx0, wBot - wTop);
      var sy = surfaceY(state.level);
      var water = ctx.createLinearGradient(0, sy, 0, wBot);
      water.addColorStop(0, '#4aa3ec');
      water.addColorStop(1, '#0f4fae');
      ctx.fillStyle = water;
      ctx.beginPath();
      ctx.moveTo(wx0, wBot);
      for (var x = wx0; x <= wx1; x += 4) {
        var ripple = state.flow > 1 ? Math.sin(x * 0.18 + state.offset * 0.06) * 1.6 : 0;
        ctx.lineTo(x, sy + ripple);
      }
      ctx.lineTo(wx1, wBot);
      ctx.closePath();
      ctx.fill();
      // the pump's return stream pouring in from the roof inlet
      if (state.flow > 1) {
        var thick = clamp(state.flow / 30, 2, 12);
        var fall = ctx.createLinearGradient(0, wTop, 0, sy);
        fall.addColorStop(0, 'rgba(37,99,235,0.95)');
        fall.addColorStop(1, 'rgba(147,197,253,0.6)');
        ctx.fillStyle = fall;
        ctx.fillRect(cx - thick / 2, wTop, thick, sy - wTop + 2);
      }
      // depth bands
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(wx0 + 6, sy + 6, 6, wBot - sy - 12);
      ctx.restore();
      ctx.strokeStyle = 'rgba(30,45,60,0.55)';
      ctx.lineWidth = 2;
      roundRect(ctx, wx0, wTop, wx1 - wx0, wBot - wTop, 8);
      ctx.stroke();
      // tank roof (cone)
      var roof = ctx.createLinearGradient(x0, 0, x1, 0);
      roof.addColorStop(0, '#5b6a7b');
      roof.addColorStop(0.4, '#c3ccd6');
      roof.addColorStop(1, '#4c5a6a');
      ctx.fillStyle = roof;
      ctx.beginPath();
      ctx.moveTo(x0 - 6, TANK.top + 2);
      ctx.lineTo(cx, TANK.top - 34);
      ctx.lineTo(x1 + 6, TANK.top + 2);
      ctx.ellipse(cx, TANK.top + 2, rx + 6, ry * 0.8, 0, 0, Math.PI);
      ctx.fill();
      // inlet pipe through the roof apex
      ctx.fillStyle = '#2b3a4c';
      ctx.fillRect(cx - 9, 16, 18, TANK.top - 16 + 4);
      ctx.fillStyle = 'rgba(214,232,247,0.92)';
      ctx.fillRect(cx - 7, 16, 14, TANK.top - 16 + 4);
      ctx.fillStyle = pressureColor(WATER.voltages[state.vIdx].v / 12);
      ctx.fillRect(cx - 4, 16, 8, TANK.top - 16 + 4);
      // head-height dimension
      var dimX = x1 + 22;
      ctx.strokeStyle = '#0b4ea2';
      ctx.fillStyle = '#0b4ea2';
      ctx.lineWidth = 2;
      strokePoints(ctx, [[dimX, sy], [dimX, PIPE_Y - 16]]);
      arrowHead(ctx, dimX, sy, -Math.PI / 2, 7);
      arrowHead(ctx, dimX, PIPE_Y - 16, Math.PI / 2, 7);
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1.2;
      strokePoints(ctx, [[wx1, sy], [dimX + 6, sy]]);
      ctx.setLineDash([]);
      text(ctx, 'height', dimX + 7, (sy + PIPE_Y) / 2 - 6, 11, '#0b4ea2', { weight: 800 });
      text(ctx, '= push', dimX + 7, (sy + PIPE_Y) / 2 + 8, 11, '#0b4ea2', { weight: 800 });
      // drag affordance
      if (state.hover === 'tank') {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        strokePoints(ctx, [[wx0 + 3, sy], [wx1 - 3, sy]]);
        ctx.setLineDash([]);
      }
    }

    function arrowHead(ctx, x, y, ang, size) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - size * Math.cos(ang - 0.45), y - size * Math.sin(ang - 0.45));
      ctx.lineTo(x - size * Math.cos(ang + 0.45), y - size * Math.sin(ang + 0.45));
      ctx.closePath();
      ctx.fill();
    }

    function drawGauge(ctx, x, y, frac, label, sub) {
      // stem
      ctx.fillStyle = '#7d8a99';
      ctx.fillRect(x - 4, y + 22, 8, PIPE_Y - y - 30);
      // body
      var g = ctx.createRadialGradient(x - 8, y - 8, 4, x, y, 30);
      g.addColorStop(0, '#f4f6f8');
      g.addColorStop(1, '#9aa6b3');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 28, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fbfcfd';
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, TAU);
      ctx.fill();
      // scale
      var a0 = Math.PI * 0.75;
      var a1 = Math.PI * 2.25;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.2;
      for (var t = 0; t <= 6; t++) {
        var a = lerp(a0, a1, t / 6);
        strokePoints(ctx, [[x + Math.cos(a) * 16, y + Math.sin(a) * 16], [x + Math.cos(a) * 20, y + Math.sin(a) * 20]]);
      }
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 18, lerp(a0, a1, 0.8), a1);
      ctx.stroke();
      var na = lerp(a0, a1, clamp(frac, 0, 1));
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2.2;
      strokePoints(ctx, [[x, y], [x + Math.cos(na) * 18, y + Math.sin(na) * 18]]);
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, TAU);
      ctx.fill();
      text(ctx, label, x, y - 36, 12, '#0f172a', { align: 'center', weight: 800 });
      if (sub) text(ctx, sub, x, y + 14, 8.5, '#475569', { align: 'center', weight: 700 });
    }

    function drawSwitchValve(ctx, x) {
      // ball valve body
      var body = ctx.createLinearGradient(0, PIPE_Y - 22, 0, PIPE_Y + 22);
      body.addColorStop(0, '#f2c46b');
      body.addColorStop(0.5, '#c58b25');
      body.addColorStop(1, '#8a5a12');
      ctx.fillStyle = body;
      roundRect(ctx, x - 22, PIPE_Y - 20, 44, 40, 9);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,35,5,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // stem + lever
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(x - 3, PIPE_Y - 34, 6, 16);
      ctx.save();
      ctx.translate(x, PIPE_Y - 34);
      ctx.rotate(state.open ? 0 : -Math.PI / 2);
      ctx.fillStyle = '#dc2626';
      roundRect(ctx, -6, -6, 58, 12, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      roundRect(ctx, -2, -4, 50, 3, 2);
      ctx.fill();
      ctx.restore();
      if (state.hover === 'switch') {
        ctx.strokeStyle = 'rgba(220,38,38,0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(x, PIPE_Y - 20, 46, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      text(ctx, state.open ? 'SWITCH: ON' : 'SWITCH: OFF', x, PIPE_Y + 40, 11, state.open ? '#166534' : '#b91c1c', { align: 'center', weight: 900 });
    }

    function drawGateValve(ctx) {
      var x = VALVE_X;
      // bonnet
      var bonnet = ctx.createLinearGradient(x - 16, 0, x + 16, 0);
      bonnet.addColorStop(0, '#4b5563');
      bonnet.addColorStop(0.45, '#cbd5e1');
      bonnet.addColorStop(1, '#374151');
      ctx.fillStyle = bonnet;
      ctx.beginPath();
      ctx.moveTo(x - 26, PIPE_Y - 18);
      ctx.lineTo(x - 15, PIPE_Y - 66);
      ctx.lineTo(x + 15, PIPE_Y - 66);
      ctx.lineTo(x + 26, PIPE_Y - 18);
      ctx.closePath();
      ctx.fill();
      // threaded stem rises as the gate opens
      var stemTop = PIPE_Y - 96 - state.opening * 18;
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(x - 3.5, stemTop, 7, PIPE_Y - 66 - stemTop);
      ctx.strokeStyle = 'rgba(55,65,81,0.6)';
      ctx.lineWidth = 1;
      for (var yy = stemTop + 3; yy < PIPE_Y - 68; yy += 4) strokePoints(ctx, [[x - 3.5, yy], [x + 3.5, yy + 2]]);
      // handwheel (seen in perspective)
      var hy = PIPE_Y - 96;
      ctx.save();
      ctx.translate(x, hy);
      ctx.scale(1, 0.38);
      ctx.strokeStyle = state.hover === 'valve' ? '#f87171' : '#b91c1c';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 4;
      for (var k = 0; k < 5; k++) {
        var a = state.handle + (k / 5) * TAU;
        strokePoints(ctx, [[0, 0], [Math.cos(a) * 29, Math.sin(a) * 29]]);
      }
      ctx.restore();
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.ellipse(x, hy, 6, 3, 0, 0, TAU);
      ctx.fill();
      // body over the pipe
      var body = ctx.createLinearGradient(0, PIPE_Y - 26, 0, PIPE_Y + 26);
      body.addColorStop(0, '#94a3b8');
      body.addColorStop(0.45, '#e2e8f0');
      body.addColorStop(1, '#475569');
      ctx.fillStyle = body;
      roundRect(ctx, x - 30, PIPE_Y - 26, 60, 52, 12);
      ctx.fill();
      // cutaway window showing the gate
      ctx.save();
      roundRect(ctx, x - 20, PIPE_Y - 17, 40, 34, 6);
      ctx.clip();
      ctx.fillStyle = 'rgba(220,236,248,0.95)';
      ctx.fillRect(x - 20, PIPE_Y - 17, 40, 34);
      var gap = 30 * state.opening;
      var v = values();
      ctx.fillStyle = state.open ? pressureColor(v.V / 12 * 0.6) : pressureColor(0.15);
      ctx.fillRect(x - 20, PIPE_Y + 15 - gap, 40, gap);
      // the gate itself
      var gate = ctx.createLinearGradient(x - 7, 0, x + 7, 0);
      gate.addColorStop(0, '#374151');
      gate.addColorStop(0.5, '#9ca3af');
      gate.addColorStop(1, '#1f2937');
      ctx.fillStyle = gate;
      ctx.fillRect(x - 7, PIPE_Y - 17, 14, 32 - gap);
      ctx.restore();
      ctx.strokeStyle = 'rgba(15,23,42,0.5)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, x - 20, PIPE_Y - 17, 40, 34, 6);
      ctx.stroke();
      // hint arrows
      if (state.hover === 'valve') {
        text(ctx, '◀ open', x - 40, hy + 4, 11, '#0f172a', { align: 'right', weight: 800 });
        text(ctx, 'close ▶', x + 40, hy + 4, 11, '#0f172a', { align: 'left', weight: 800 });
      }
    }

    function drawWheel(ctx) {
      var x = WHEEL.x;
      var y = WHEEL.y;
      var R = WHEEL.r + 12;
      // housing
      var housing = ctx.createRadialGradient(x - 20, y - 20, 10, x, y, R + 8);
      housing.addColorStop(0, '#d7dee6');
      housing.addColorStop(1, '#55657a');
      ctx.fillStyle = housing;
      ctx.beginPath();
      ctx.arc(x, y, R + 8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(222,238,250,0.96)';
      ctx.beginPath();
      ctx.arc(x, y, R, 0, TAU);
      ctx.fill();
      // water pooled in the lower half
      var v = values();
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, R, 0, TAU);
      ctx.clip();
      ctx.fillStyle = pressureColor(state.open ? v.V / 12 * 0.3 : 0.05);
      ctx.fillRect(x - R, y + 4, 2 * R, R);
      // paddles
      var n = 10;
      for (var k = 0; k < n; k++) {
        var a = state.wheelAngle + (k / n) * TAU;
        var cx = Math.cos(a);
        var sy = Math.sin(a);
        ctx.strokeStyle = '#6b4a2a';
        ctx.lineWidth = 3;
        strokePoints(ctx, [[x + cx * 10, y + sy * 10], [x + cx * (WHEEL.r - 2), y + sy * (WHEEL.r - 2)]]);
        ctx.save();
        ctx.translate(x + cx * (WHEEL.r - 6), y + sy * (WHEEL.r - 6));
        ctx.rotate(a);
        var shade = 0.5 + 0.5 * Math.cos(a + 0.8);
        ctx.fillStyle = mix([120, 80, 40], [205, 160, 100], shade);
        ctx.fillRect(-9, -7, 18, 14);
        ctx.restore();
      }
      ctx.restore();
      // rim + hub
      ctx.strokeStyle = '#8b5e34';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, WHEEL.r - 14, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(x - 2, y - 2, 3, 0, TAU);
      ctx.fill();
      // glass glint
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, R - 6, Math.PI * 1.1, Math.PI * 1.45);
      ctx.stroke();
      // rpm readout
      var rpm = state.flow > 0.5 ? Math.round((state.flow / WHEEL.r) * 0.55 * 60 / TAU) : 0;
      tag(ctx, rpm + ' rpm', x, y + R + 24, { size: 11, bg: 'rgba(15,23,42,0.85)' });
    }

    function drawPump(ctx) {
      var x = 300;
      var y = 486;
      ctx.fillStyle = '#334155';
      roundRect(ctx, x - 34, y - 30, 68, 60, 14);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(x, y, 24, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      for (var k = 0; k < 6; k++) {
        var a = -state.pumpAngle + (k / 6) * TAU;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
        ctx.quadraticCurveTo(x + Math.cos(a + 0.6) * 14, y + Math.sin(a + 0.6) * 14, x + Math.cos(a + 0.4) * 21, y + Math.sin(a + 0.4) * 21);
        ctx.stroke();
      }
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, TAU);
      ctx.fill();
      tag(ctx, 'PUMP (battery chemistry)', x, y - 44, { size: 11, bg: 'rgba(15,23,42,0.86)' });
    }

    function drawTwin(ctx) {
      var x0 = 600;
      var y0 = 12;
      var w = 344;
      var h = 150;
      var v = values();
      ctx.save();
      ctx.shadowColor = 'rgba(15,23,42,0.35)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      roundRect(ctx, x0, y0, w, h, 14);
      ctx.fillStyle = 'rgba(10,18,34,0.94)';
      ctx.fill();
      ctx.restore();
      text(ctx, 'ELECTRIC TWIN — same numbers, real circuit', x0 + 14, y0 + 20, 10.5, '#93c5fd', { weight: 900 });
      // circuit loop
      var L = x0 + 40;
      var Rr = x0 + w - 40;
      var T = y0 + 50;
      var B = y0 + h - 22;
      var loopPath = makePath([[L, B], [L, T], [Rr, T], [Rr, B], [L, B]]);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      strokePoints(ctx, loopPath.points);
      // battery on left side
      ctx.fillStyle = 'rgba(10,18,34,1)';
      ctx.fillRect(L - 14, (T + B) / 2 - 10, 28, 20);
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 3;
      strokePoints(ctx, [[L - 13, (T + B) / 2 - 6], [L + 13, (T + B) / 2 - 6]]);
      strokePoints(ctx, [[L - 7, (T + B) / 2 + 5], [L + 7, (T + B) / 2 + 5]]);
      text(ctx, v.V + ' V', L - 18, (T + B) / 2 + 4, 12, '#86efac', { align: 'right', weight: 900 });
      // switch on top-left
      var sx = L + 50;
      ctx.fillStyle = 'rgba(10,18,34,1)';
      ctx.fillRect(sx - 2, T - 6, 36, 12);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2.5;
      strokePoints(ctx, [[sx, T], [sx + 32 * (state.open ? 1 : 0.85), state.open ? T : T - 16]]);
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath(); ctx.arc(sx, T, 3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 32, T, 3, 0, TAU); ctx.fill();
      // resistor (zigzag) in the middle
      var rx = (L + Rr) / 2 + 6;
      ctx.fillStyle = 'rgba(10,18,34,1)';
      ctx.fillRect(rx - 26, T - 8, 52, 16);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(rx - 26, T);
      for (var z = 0; z < 6; z++) ctx.lineTo(rx - 22 + z * 8.8, T + (z % 2 ? 7 : -7));
      ctx.lineTo(rx + 26, T);
      ctx.stroke();
      text(ctx, v.R.toLocaleString() + ' Ω', rx, T - 13, 11, '#fde68a', { align: 'center', weight: 900 });
      // lamp on right side
      var ly = (T + B) / 2;
      var glow = state.open ? Math.sqrt(v.mW / 2880) : 0;
      if (glow > 0.01) {
        var lg = ctx.createRadialGradient(Rr, ly, 2, Rr, ly, 40);
        lg.addColorStop(0, 'rgba(253,224,71,' + (0.75 * glow + 0.15) + ')');
        lg.addColorStop(1, 'rgba(253,224,71,0)');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(Rr, ly, 40, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = glow > 0.01 ? mix([90, 70, 20], [254, 240, 138], clamp(glow * 1.4, 0, 1)) : '#1f2937';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(Rr, ly, 12, 0, TAU); ctx.fill(); ctx.stroke();
      strokePoints(ctx, [[Rr - 8, ly - 8], [Rr + 8, ly + 8]]);
      strokePoints(ctx, [[Rr + 8, ly - 8], [Rr - 8, ly + 8]]);
      // moving current dots (conventional direction: + terminal → around → −)
      if (state.open && v.mA > 0) {
        ctx.fillStyle = '#facc15';
        var spacing = 24;
        for (var d = 0; d < loopPath.total; d += spacing) {
          // run from battery + (top of left side) clockwise
          var p = loopPath.at(loopPath.total * 0.18 + d + state.twinOffset);
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, TAU); ctx.fill();
        }
      }
      text(ctx, 'I = ' + fmtmA(v.mA), Rr - 22, B - 8, 11, '#fef08a', { align: 'right', weight: 900 });
      text(ctx, 'dots = current (electrons drift the other way)', x0 + w / 2, y0 + h - 6, 9, '#94a3b8', { align: 'center', weight: 700 });
    }

    function drawLabels(ctx) {
      var v = values();
      tag(ctx, 'TOWER + PUMP = BATTERY (voltage)', 150, 404, { size: 11.5, bg: '#0b4ea2' });
      tag(ctx, 'VALVE = RESISTOR', VALVE_X, PIPE_Y + 48, { size: 11.5, bg: '#b91c1c' });
      tag(ctx, 'WHEEL = LOAD (lamp, motor)', WHEEL.x, PIPE_Y - WHEEL.r - 40, { size: 11.5, bg: '#7c4a1d' });
      tag(ctx, 'FLOW RATE = CURRENT', 600, 486 - 30, { size: 11.5, bg: '#0e7490' });
      void v;
    }

    var scene = {
      step: step,
      draw: function (ctx, view) {
        ctx.scale(view.s, view.s);
        var v = values();
        drawBackground(ctx);
        // pipes, drawn per segment so pressure can change colour along the loop
        var hi = pressureColor(v.V / 12);
        var lo = pressureColor(state.open ? 0.04 : 0.02);
        var mid = pressureColor(state.open ? v.V / 12 * 0.45 : 0.02);
        var dead = pressureColor(v.V / 12); // switch closed: full pressure trapped upstream
        var upstream = state.open ? hi : dead;
        pipeSegment(ctx, [TANK.x1 - 6, PIPE_Y], [VALVE_X, PIPE_Y], 26, true, upstream);
        pipeSegment(ctx, [VALVE_X, PIPE_Y], [WHEEL.x, PIPE_Y], 26, true, state.open ? mid : lo);
        pipeSegment(ctx, [WHEEL.x, PIPE_Y], [890, PIPE_Y], 26, true, lo);
        pipeSegment(ctx, [890, PIPE_Y], [890, 486], 26, true, lo);
        pipeSegment(ctx, [890, 486], [30, 486], 26, true, lo);
        pipeSegment(ctx, [30, 486], [30, 16], 22, true, hi);
        pipeSegment(ctx, [30, 16], [130, 16], 22, true, hi);
        drawTower(ctx);
        // flow particles inside the pipe
        if (state.flow > 0.5 || reducedMotion) {
          for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var pt = loop.at(p.d + state.offset);
            var horizontal = Math.abs(Math.sin(pt.a)) < 0.5;
            var off = p.lane * 12;
            var px = horizontal ? pt.x : pt.x + off;
            var py = horizontal ? pt.y + off : pt.y;
            // squeeze through the gate
            if (horizontal && pt.y === PIPE_Y && Math.abs(pt.x - VALVE_X) < 22) {
              py = PIPE_Y + 15 - 15 * state.opening + p.lane * 20 * state.opening;
            }
            if (horizontal && pt.y === PIPE_Y && Math.abs(pt.x - WHEEL.x) < WHEEL.r + 12) continue;
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath();
            ctx.ellipse(px, py, horizontal ? p.size * 1.8 : p.size, horizontal ? p.size : p.size * 1.8, 0, 0, TAU);
            ctx.fill();
          }
        }
        for (var s = 0; s < splash.length; s++) {
          ctx.fillStyle = 'rgba(147,197,253,' + clamp(splash[s].life * 1.6, 0, 1) + ')';
          ctx.beginPath(); ctx.arc(splash[s].x, splash[s].y, 2.2, 0, TAU); ctx.fill();
        }
        drawGauge(ctx, 282, 214, v.V / 12, 'Before', v.V + ' V');
        drawSwitchValve(ctx, 344);
        drawGateValve(ctx);
        drawWheel(ctx);
        drawGauge(ctx, 820, 214, state.open ? 0.0 : 0, 'After', '0 V');
        drawPump(ctx);
        // flow direction arrows on the return pipe
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        [760, 560, 160].forEach(function (ax) { arrowHead(ctx, ax - 6, 486, Math.PI, 9); });
        arrowHead(ctx, 30, 150, -Math.PI / 2, 9);
        arrowHead(ctx, 96, 16, 0, 9);
        drawLabels(ctx);
        if (state.twin) drawTwin(ctx);
      },
      pointer: function (type, p, ev, drag) {
        var inTank = p.x > TANK.x0 && p.x < TANK.x1 && p.y > TANK.top && p.y < TANK.bottom;
        var onValve = Math.hypot(p.x - VALVE_X, (p.y - (PIPE_Y - 96)) * 2.2) < 42 || (Math.abs(p.x - VALVE_X) < 32 && Math.abs(p.y - PIPE_Y) < 28);
        var onSwitch = Math.hypot(p.x - 344, p.y - (PIPE_Y - 22)) < 44;
        if (type === 'hover') {
          state.hover = inTank ? 'tank' : onValve ? 'valve' : onSwitch ? 'switch' : null;
          if (reducedMotion && handle) handle.invalidate();
          return inTank ? 'ns-resize' : onValve ? 'ew-resize' : onSwitch ? 'pointer' : null;
        }
        if (type === 'down') {
          if (inTank) { setLevelFrom(p.y); return { kind: 'tank' }; }
          if (onValve) return { kind: 'valve', x0: p.x, idx0: state.rIdx };
          if (onSwitch) { state.open = !state.open; syncUI(); return null; }
          return null;
        }
        if (type === 'move' && drag) {
          if (drag.kind === 'tank') setLevelFrom(p.y);
          if (drag.kind === 'valve') setR(drag.idx0 + Math.round((p.x - drag.x0) / 22));
        }
        if (type === 'up' && drag && drag.kind === 'valve' && !drag.moved) {
          setR(state.rIdx + (p.x < VALVE_X ? -1 : 1));
        }
        return null;
      }
    };

    function setLevelFrom(y) {
      var level = (TANK.bottom - 14 - y) / (TANK.bottom - TANK.top - 40);
      var target = clamp(level, 0, 1) * 12;
      var best = 0;
      WATER.voltages.forEach(function (opt, idx) {
        if (Math.abs(opt.v - target) < Math.abs(WATER.voltages[best].v - target)) best = idx;
      });
      if (best !== state.vIdx) setV(best);
    }

    var handle = null;
    handle = mountScene(canvas, { w: W, h: H }, scene);
    syncUI();
  }

  /* ════════════════════════════════════════════════════════════════
     SECTION 3 — MATERIALS BENCH
     ════════════════════════════════════════════════════════════════ */
  var BULB = { ohms: 2.4, ratedWatts: 15 };
  var MATERIALS = {
    copper: {
      name: 'Copper', kind: 'Conductor (metal)', ohms: 0.002, rho: 1.7e-8, lattice: 'metal',
      note: 'Copper atoms each release one outer electron into a shared "sea" that roams the whole metal. A tiny push sets trillions of them drifting at once, so the sample barely resists at all: almost all the battery’s push goes to lighting the bulb.',
      cond: { label: 'Heat the wire to 200 °C', ohms: 0.0034, rho: 2.9e-8, heat: 1,
        note: 'Hot copper resists MORE: the ions shake harder and the drifting electrons bump into them more often (about +0.4% per °C). The bulb barely notices, because the wire’s resistance is still tiny next to the bulb’s 2.4 Ω.' }
    },
    graphite: {
      name: 'Pencil lead', kind: 'Resistive conductor (carbon)', ohms: 12, rho: 3e-5, lattice: 'graphite',
      note: 'Graphite conducts along its flat carbon sheets, but with far fewer mobile electrons than copper, and pencil lead is mixed with clay. The sample takes most of the battery’s push, so the bulb glows dim while the lead warms up.',
      cond: { label: 'Heat the lead', ohms: 9, rho: 2.3e-5, heat: 1,
        note: 'Unlike copper, hot graphite conducts slightly BETTER: heat frees a few more carriers between its layers, so the current creeps up. It’s a hint of semiconductor behaviour.' }
    },
    saltwater: {
      name: 'Saltwater', kind: 'Ionic conductor (electrolyte)', ohms: 30, rho: 0.2, lattice: 'ions',
      note: 'Pure water barely conducts. Dissolved salt splits into Na⁺ and Cl⁻ ions, and whole charged atoms carry the current, drifting in opposite directions. Watch the electrodes: gas bubbles form where the ions hand over their charge (electrolysis).',
      cond: { label: 'Stir in more salt', ohms: 12, rho: 0.08, salty: true,
        note: 'More dissolved salt means more ions to carry charge, so resistance falls and current rises, and the electrodes fizz harder. Sweat and tap water conduct for the same reason.' }
    },
    silicon: {
      name: 'Silicon wafer', kind: 'Semiconductor', ohms: 30000, rho: 2.3e3, lattice: 'covalent',
      note: 'In pure silicon every outer electron is locked into a bond with a neighbour. At room temperature only about one bond in a trillion breaks, so the bulb stays dark and the meter reads a fraction of a milliamp.',
      cond: { label: 'Shine light / add dopant', ohms: 68, rho: 5e-3, excited: true,
        note: 'Light (or a trace of phosphorus "dopant") breaks bonds and frees electrons, leaving behind "holes" that act like positive carriers. Current jumps over 400×. Controlling this on/off is how every transistor and solar cell works.' }
    },
    wood: {
      name: 'Dry wood', kind: 'Insulator', ohms: 1e10, rho: 1e13, lattice: 'polymer',
      note: 'Dry wood’s cellulose chains hold their electrons in tight covalent bonds. With almost no free carriers, the meter needle doesn’t even twitch at 6 V.',
      cond: { label: 'Soak it in water', ohms: 1.5e5, rho: 5e3, wet: true,
        note: 'Wet wood is a different story: water carries dissolved minerals, and those ions conduct. The bulb stays dark, but the meter now reads tens of microamps. This is why a wet branch on a power line, or a wet ladder, is dangerous.' }
    },
    rubber: {
      name: 'Rubber', kind: 'Strong insulator', ohms: 1e14, rho: 1e15, lattice: 'polymer',
      note: 'Rubber’s long polymer chains grip their electrons hard, which is why it jackets wires and lines electricians’ gloves. At battery voltages essentially nothing gets through.',
      cond: { label: 'Test at 25 kV (breakdown)', breakdown: true, ohms: 1.25e7, rho: 1e15,
        note: 'Every insulator has a limit. A 1 mm rubber sheet breaks down near 20 kV: the field rips electrons loose, they knock out more, and an arc punches a burnt pinhole. Our tester is current-limited to 2 mA, so the bulb stays dark. Never try this: it is why damaged insulation is deadly.' }
    }
  };
  var BENCH_VOLTAGES = [1.5, 3, 6, 9, 12];

  function initBenchScene() {
    var canvas = document.getElementById('we-mat-canvas');
    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-mat]'));
    var voltButtons = Array.prototype.slice.call(document.querySelectorAll('[data-bench-volts]'));
    var condBtn = document.getElementById('we-mat-condition');
    var note = document.getElementById('we-mat-note');
    var outI = document.getElementById('we-mat-current');
    var outClass = document.getElementById('we-mat-class');
    var outR = document.getElementById('we-mat-ohms');
    var outP = document.getElementById('we-mat-bulb');
    var currentLabel = document.getElementById('we-mat-current-label');
    if (!canvas || !buttons.length || !window.SimKit) return;

    var W = 960;
    var H = 548;
    var state = { mat: 'copper', cond: false, volts: 6, glow: 0, needle: 0, flowOffset: 0 };
    var zoom = { items: [], kind: null };
    var bubbles = [];

    function spec() {
      var m = MATERIALS[state.mat];
      var c = state.cond ? m.cond : null;
      return {
        m: m,
        c: c,
        ohms: c && c.ohms != null ? c.ohms : m.ohms,
        rho: c && c.rho != null ? c.rho : m.rho,
        note: c ? c.note : m.note
      };
    }

    function physics() {
      var s = spec();
      if (s.c && s.c.breakdown) {
        return { V: 25000, I: 0.002, bulbW: 0.002 * 0.002 * BULB.ohms, sampleOhms: s.ohms, breakdown: true };
      }
      var V = state.volts;
      var I = V / (BULB.ohms + s.ohms);
      return { V: V, I: I, bulbW: I * I * BULB.ohms, sampleOhms: s.ohms, breakdown: false };
    }

    // Electron drift speed in the drawing: log of current, 0.1 µA → 0, 5 A → 1.
    function flowFrac(I) { return I <= 1e-7 ? 0 : clamp((Math.log10(I) + 7) / 7.7, 0, 1); }

    function syncUI() {
      var s = spec();
      var ph = physics();
      buttons.forEach(function (btn) { btn.setAttribute('aria-pressed', String(btn.dataset.mat === state.mat)); });
      voltButtons.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(parseFloat(btn.dataset.benchVolts) === state.volts));
        btn.disabled = ph.breakdown;
      });
      if (condBtn) {
        condBtn.textContent = state.cond ? 'Undo: back to normal' : s.m.cond.label;
        condBtn.setAttribute('aria-pressed', String(state.cond));
      }
      if (outI) outI.textContent = formatAmps(ph.I);
      if (currentLabel) currentLabel.textContent = 'Current (at ' + (ph.breakdown ? '25 kV' : state.volts + ' V') + ')';
      if (outClass) outClass.textContent = s.m.kind;
      if (outR) outR.textContent = formatOhms(s.ohms);
      if (outP) {
        var frac = ph.bulbW / BULB.ratedWatts;
        outP.textContent = formatWatts(ph.bulbW) + (frac > 1.8 ? ' ⚠ overdriven' : frac < 0.002 ? ' (dark)' : '');
      }
      var extra = '';
      if (!ph.breakdown && ph.bulbW / BULB.ratedWatts > 1.8) {
        extra = ' At ' + state.volts + ' V this 6 V bulb runs at ' + Math.round(ph.bulbW / BULB.ratedWatts * 100) + '% of its rated power and would burn out in moments.';
      }
      if (note) note.textContent = s.note + extra;
      buildZoom();
      if (handle) handle.invalidate();
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.mat = btn.dataset.mat;
        state.cond = false;
        bubbles.length = 0;
        syncUI();
      });
    });
    voltButtons.forEach(function (btn) {
      btn.addEventListener('click', function () { state.volts = parseFloat(btn.dataset.benchVolts); syncUI(); });
    });
    if (condBtn) condBtn.addEventListener('click', function () { state.cond = !state.cond; bubbles.length = 0; syncUI(); });

    /* ── Atomic zoom panel ── */
    var ZX0 = 612;
    var ZY0 = 56;
    var ZX1 = 938;
    var ZY1 = 392;

    function buildZoom() {
      var s = spec();
      var r = seeded(state.mat.length * 31 + (state.cond ? 7 : 0));
      var items = [];
      var kind = s.m.lattice;
      var i;
      var j;
      if (kind === 'metal' || kind === 'graphite') {
        var cols = kind === 'metal' ? 7 : 8;
        var rows = kind === 'metal' ? 5 : 4;
        for (j = 0; j < rows; j++) {
          for (i = 0; i < cols; i++) {
            var gx = ZX0 + 30 + i * ((ZX1 - ZX0 - 60) / (cols - 1)) + (kind === 'graphite' && j % 2 ? 18 : 0);
            var gy = ZY0 + 40 + j * ((ZY1 - ZY0 - 80) / (rows - 1));
            items.push({ t: 'ion', x: gx, y: gy, ph: r() * TAU, q: '+' });
          }
        }
        var ne = kind === 'metal' ? 30 : 9;
        for (i = 0; i < ne; i++) items.push({ t: 'e', x: ZX0 + r() * (ZX1 - ZX0), y: ZY0 + 20 + r() * (ZY1 - ZY0 - 40), vx: 0, vy: 0, k: 0 });
      } else if (kind === 'ions') {
        for (i = 0; i < 22; i++) items.push({ t: 'h2o', x: ZX0 + 20 + r() * (ZX1 - ZX0 - 40), y: ZY0 + 20 + r() * (ZY1 - ZY0 - 40), a: r() * TAU, ph: r() * TAU });
        var nIons = s.c && s.c.salty ? 9 : 5;
        for (i = 0; i < nIons; i++) {
          items.push({ t: 'na', x: ZX0 + r() * (ZX1 - ZX0), y: ZY0 + 30 + r() * (ZY1 - ZY0 - 60), vx: 0, vy: 0, k: 0 });
          items.push({ t: 'cl', x: ZX0 + r() * (ZX1 - ZX0), y: ZY0 + 30 + r() * (ZY1 - ZY0 - 60), vx: 0, vy: 0, k: 0 });
        }
      } else if (kind === 'covalent') {
        var cc = 6;
        var cr = 4;
        var sx = (ZX1 - ZX0 - 70) / (cc - 1);
        var syy = (ZY1 - ZY0 - 90) / (cr - 1);
        for (j = 0; j < cr; j++) {
          for (i = 0; i < cc; i++) items.push({ t: 'si', x: ZX0 + 35 + i * sx, y: ZY0 + 45 + j * syy, ph: r() * TAU });
        }
        var broken = s.c && s.c.excited ? 7 : 0;
        var bondIndex = 0;
        for (j = 0; j < cr; j++) {
          for (i = 0; i < cc; i++) {
            var ax = ZX0 + 35 + i * sx;
            var ay = ZY0 + 45 + j * syy;
            if (i < cc - 1) {
              var isBroken = broken && (bondIndex * 7 + 3) % 5 === 0 && broken-- > 0;
              items.push({ t: 'bond', x1: ax, y1: ay, x2: ax + sx, y2: ay, broken: !!isBroken });
              if (isBroken) {
                items.push({ t: 'e', x: ax + sx / 2, y: ay, vx: 0, vy: 0, k: 0 });
                items.push({ t: 'hole', x: ax + sx / 2, y: ay, row: ay, hop: r() * 2 });
              }
              bondIndex++;
            }
            if (j < cr - 1) items.push({ t: 'bond', x1: ax, y1: ay, x2: ax, y2: ay + syy, broken: false });
          }
        }
        if (s.c && s.c.excited) for (i = 0; i < 5; i++) items.push({ t: 'photon', x: ZX0 + 20 + r() * (ZX1 - ZX0 - 40), y: ZY0 + r() * 80, ph: r() });
      } else {
        // polymer chains (wood / rubber)
        var chains = 5;
        for (j = 0; j < chains; j++) {
          var cy = ZY0 + 45 + j * ((ZY1 - ZY0 - 90) / (chains - 1));
          var pts = [];
          for (i = 0; i <= 12; i++) pts.push([ZX0 + 18 + i * ((ZX1 - ZX0 - 36) / 12), cy + (i % 2 ? 9 : -9)]);
          items.push({ t: 'chain', pts: pts, ph: r() * TAU });
          for (i = 1; i < pts.length; i += 2) items.push({ t: 'bound', x: pts[i][0], y: pts[i][1], ph: r() * TAU });
        }
        if (s.c && s.c.wet) {
          for (i = 0; i < 12; i++) items.push({ t: 'h2o', x: ZX0 + 20 + r() * (ZX1 - ZX0 - 40), y: ZY0 + 25 + r() * (ZY1 - ZY0 - 50), a: r() * TAU, ph: r() * TAU });
          for (i = 0; i < 3; i++) {
            items.push({ t: 'na', x: ZX0 + r() * (ZX1 - ZX0), y: ZY0 + 30 + r() * (ZY1 - ZY0 - 60), vx: 0, vy: 0, k: 0 });
            items.push({ t: 'cl', x: ZX0 + r() * (ZX1 - ZX0), y: ZY0 + 30 + r() * (ZY1 - ZY0 - 60), vx: 0, vy: 0, k: 0 });
          }
        }
        if (s.c && s.c.breakdown) for (i = 0; i < 14; i++) items.push({ t: 'e', x: ZX0 + r() * (ZX1 - ZX0), y: ZY0 + 30 + r() * (ZY1 - ZY0 - 60), vx: 0, vy: 0, k: 0 });
      }
      zoom.items = items;
      zoom.kind = kind;
    }

    function stepZoom(dt, t) {
      var ph = physics();
      var f = flowFrac(ph.I);
      if (ph.breakdown) f = 0.9;
      var heat = state.cond && spec().c && spec().c.heat ? 1 : 0;
      var drift = 150 * f; // electrons drift right, toward the + terminal (bench clip B)
      zoom.items.forEach(function (it) {
        if (it.t === 'e' || it.t === 'na' || it.t === 'cl') {
          var thermal = it.t === 'e' ? 120 + heat * 60 : 35;
          it.k -= dt;
          if (it.k <= 0) {
            // a "collision": pick a fresh random thermal direction
            var a = Math.random() * TAU;
            it.vx = Math.cos(a) * thermal;
            it.vy = Math.sin(a) * thermal;
            it.k = (it.t === 'e' ? 0.18 : 0.4) * (heat ? 0.6 : 1) + Math.random() * 0.15;
          }
          var d = it.t === 'na' ? -drift * 0.35 : it.t === 'cl' ? drift * 0.35 : drift;
          it.x += (it.vx + d) * dt;
          it.y += it.vy * dt;
          if (it.y < ZY0 + 14) { it.y = ZY0 + 14; it.vy = Math.abs(it.vy); }
          if (it.y > ZY1 - 14) { it.y = ZY1 - 14; it.vy = -Math.abs(it.vy); }
          if (it.x < ZX0 + 4) it.x = ZX1 - 6;
          if (it.x > ZX1 - 4) it.x = ZX0 + 6;
        } else if (it.t === 'hole') {
          // holes hop bond to bond toward the − side (left)
          it.hop -= dt * (0.6 + f * 2.2);
          if (it.hop <= 0) {
            it.x -= (ZX1 - ZX0 - 70) / 5;
            if (it.x < ZX0 + 30) it.x = ZX1 - 35 - (ZX1 - ZX0 - 70) / 10;
            it.hop = 0.9 + Math.random();
          }
        } else if (it.t === 'photon') {
          it.ph = (it.ph + dt * 0.9) % 1;
        }
      });
      void t;
    }

    function drawZoom(ctx, t) {
      var s = spec();
      var ph = physics();
      var heat = state.cond && s.c && s.c.heat ? 1 : 0;
      // panel
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 18;
      roundRect(ctx, ZX0 - 12, 14, ZX1 - ZX0 + 24, ZY1 - 14 + 46, 18);
      var bg = ctx.createRadialGradient((ZX0 + ZX1) / 2, (ZY0 + ZY1) / 2, 30, (ZX0 + ZX1) / 2, (ZY0 + ZY1) / 2, 260);
      bg.addColorStop(0, '#13213b');
      bg.addColorStop(1, '#070d1a');
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(148,163,184,0.35)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, ZX0 - 12, 14, ZX1 - ZX0 + 24, ZY1 - 14 + 46, 18);
      ctx.stroke();
      text(ctx, 'ATOMIC ZOOM · ' + s.m.name.toUpperCase(), (ZX0 + ZX1) / 2, 40, 14, '#e2e8f0', { align: 'center', weight: 900 });

      ctx.save();
      roundRect(ctx, ZX0, ZY0, ZX1 - ZX0, ZY1 - ZY0, 10);
      ctx.clip();
      var shake = 1.6 + heat * 3.2;
      zoom.items.forEach(function (it) {
        if (it.t === 'bond') {
          ctx.strokeStyle = it.broken ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.55)';
          ctx.lineWidth = 2;
          ctx.setLineDash(it.broken ? [3, 4] : []);
          strokePoints(ctx, [[it.x1, it.y1], [it.x2, it.y2]]);
          ctx.setLineDash([]);
          if (!it.broken) {
            // the two shared electrons that make the bond
            var mx = (it.x1 + it.x2) / 2;
            var my = (it.y1 + it.y2) / 2;
            var horiz = it.y1 === it.y2;
            var j1 = Math.sin(t * 7 + mx) * 1.5;
            ctx.fillStyle = '#7dd3fc';
            ctx.beginPath(); ctx.arc(mx + (horiz ? -4 : j1), my + (horiz ? j1 : -4), 2.8, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.arc(mx + (horiz ? 4 : -j1), my + (horiz ? -j1 : 4), 2.8, 0, TAU); ctx.fill();
          }
        }
      });
      zoom.items.forEach(function (it) {
        var jx;
        var jy;
        if (it.t === 'ion' || it.t === 'si') {
          jx = Math.sin(t * 9 + it.ph) * shake;
          jy = Math.cos(t * 11 + it.ph * 1.3) * shake;
          var rr = it.t === 'si' ? 13 : 12;
          var g = ctx.createRadialGradient(it.x + jx - 4, it.y + jy - 4, 2, it.x + jx, it.y + jy, rr);
          if (it.t === 'si') { g.addColorStop(0, '#c4b5fd'); g.addColorStop(1, '#4c1d95'); } else if (zoom.kind === 'graphite') { g.addColorStop(0, '#9ca3af'); g.addColorStop(1, '#1f2937'); } else { g.addColorStop(0, heat ? '#fdba74' : '#fcd9a8'); g.addColorStop(1, heat ? '#9a3412' : '#b45309'); }
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(it.x + jx, it.y + jy, rr, 0, TAU); ctx.fill();
          text(ctx, it.t === 'si' ? 'Si' : zoom.kind === 'graphite' ? 'C' : 'Cu⁺', it.x + jx, it.y + jy + 4, it.t === 'si' ? 10 : 9, '#0b1220', { align: 'center', weight: 900 });
        } else if (it.t === 'chain') {
          ctx.strokeStyle = state.mat === 'rubber' ? 'rgba(148,163,184,0.7)' : 'rgba(217,160,102,0.75)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          it.pts.forEach(function (p, k) {
            var yy = p[1] + Math.sin(t * 3 + it.ph + k) * 1.2;
            if (k) ctx.lineTo(p[0], yy); else ctx.moveTo(p[0], yy);
          });
          ctx.stroke();
          it.pts.forEach(function (p, k) {
            if (k % 2) return;
            ctx.fillStyle = state.mat === 'rubber' ? '#475569' : '#a16207';
            ctx.beginPath(); ctx.arc(p[0], p[1] + Math.sin(t * 3 + it.ph + k) * 1.2, 5, 0, TAU); ctx.fill();
          });
        } else if (it.t === 'bound') {
          var a = t * 5 + it.ph;
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath(); ctx.arc(it.x + Math.cos(a) * 6, it.y + Math.sin(a) * 4, 3, 0, TAU); ctx.fill();
        } else if (it.t === 'h2o') {
          jx = Math.sin(t * 2 + it.ph) * 3;
          jy = Math.cos(t * 2.3 + it.ph) * 3;
          var ang = it.a + Math.sin(t + it.ph) * 0.6;
          ctx.fillStyle = 'rgba(239,68,68,0.75)';
          ctx.beginPath(); ctx.arc(it.x + jx, it.y + jy, 6, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(241,245,249,0.85)';
          [-0.95, 0.95].forEach(function (o) {
            ctx.beginPath(); ctx.arc(it.x + jx + Math.cos(ang + o) * 7, it.y + jy + Math.sin(ang + o) * 7, 3.6, 0, TAU); ctx.fill();
          });
        } else if (it.t === 'na' || it.t === 'cl') {
          var na = it.t === 'na';
          var gi = ctx.createRadialGradient(it.x - 3, it.y - 3, 2, it.x, it.y, na ? 10 : 13);
          gi.addColorStop(0, na ? '#e9d5ff' : '#bbf7d0');
          gi.addColorStop(1, na ? '#7e22ce' : '#15803d');
          ctx.fillStyle = gi;
          ctx.beginPath(); ctx.arc(it.x, it.y, na ? 10 : 13, 0, TAU); ctx.fill();
          text(ctx, na ? 'Na⁺' : 'Cl⁻', it.x, it.y + 4, 9, '#0b1220', { align: 'center', weight: 900 });
        } else if (it.t === 'e') {
          ctx.fillStyle = 'rgba(56,189,248,0.25)';
          ctx.beginPath(); ctx.arc(it.x, it.y, 6.5, 0, TAU); ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath(); ctx.arc(it.x, it.y, 3.6, 0, TAU); ctx.fill();
        } else if (it.t === 'hole') {
          ctx.strokeStyle = '#fb923c';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(it.x, it.y, 5.5, 0, TAU); ctx.stroke();
        } else if (it.t === 'photon') {
          var py = ZY0 + it.ph * 120;
          ctx.strokeStyle = 'rgba(250,204,21,' + (1 - it.ph) + ')';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (var w = 0; w <= 30; w += 2) ctx.lineTo(it.x + Math.sin(w * 0.7) * 4, py - 30 + w);
          ctx.stroke();
        }
      });
      if (ph.breakdown) {
        drawBolt(ctx, ZX1 - 10, (ZY0 + ZY1) / 2, ZX0 + 10, (ZY0 + ZY1) / 2 + 10, 40, t);
      }
      ctx.restore();
      // legend + field arrow
      var f = flowFrac(ph.I);
      var ly = ZY1 + 22;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.arc(ZX0 + 6, ly - 4, 4, 0, TAU); ctx.fill();
      var cap = zoom.kind === 'ions' ? 'ions carry the charge: Na⁺ ← to −, Cl⁻ → to +'
        : zoom.kind === 'covalent' ? (state.cond ? 'freed electrons drift →, holes hop ←' : 'electrons locked in bonds')
        : zoom.kind === 'polymer' ? (ph.breakdown ? 'field rips electrons loose: an avalanche' : state.cond ? 'ions in the water carry a trickle of charge' : 'electrons bound to their chains')
        : f > 0 ? 'free electrons: fast random motion + slow drift →' : 'free electrons, no push';
      text(ctx, cap, ZX0 + 16, ly, 11.5, '#cbd5e1', { weight: 700 });
      ctx.fillStyle = '#94a3b8';
      text(ctx, '− side (black clip)', ZX0, ZY0 - 6, 9.5, '#94a3b8', { weight: 800 });
      text(ctx, '+ side (red clip)', ZX1, ZY0 - 6, 9.5, '#94a3b8', { weight: 800, align: 'right' });
    }

    function drawBolt(ctx, x1, y1, x2, y2, jag, t) {
      var r = seeded(Math.floor(t * 18));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? 'rgba(255,255,255,0.95)' : 'rgba(167,139,250,0.55)';
        ctx.lineWidth = pass ? 2 : 8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        var n = 9;
        for (var i = 1; i < n; i++) ctx.lineTo(lerp(x1, x2, i / n) + (r() - 0.5) * 8, lerp(y1, y2, i / n) + (r() - 0.5) * jag);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* ── Bench drawing ── */
    var BAT = { x: 34, y: 300, w: 130, h: 104, dx: 20, dy: -16 };
    var TPLUS = [BAT.x + 40, BAT.y - 6];
    var TMINUS = [BAT.x + 108, BAT.y - 6];
    var LAMP = { x: 300, y: 178, r: 40 };
    var METER = { x: 408, y: 236, w: 168, h: 156 };
    var SAMPLE = { x0: 222, x1: 382, y: 452 };
    var CLIP_A = [SAMPLE.x0 - 8, SAMPLE.y];
    var CLIP_B = [SAMPLE.x1 + 8, SAMPLE.y];

    // Electron route: battery − → clip A → sample → clip B → meter − … meter + → lamp → battery +
    var wireA = bezierPoints(TMINUS, [TMINUS[0] + 30, TMINUS[1] + 120], [CLIP_A[0] - 70, CLIP_A[1] + 20], CLIP_A, 24);
    var wireB = bezierPoints(CLIP_B, [CLIP_B[0] + 70, CLIP_B[1] + 10], [METER.x + 40, METER.y + METER.h + 60], [METER.x + 30, METER.y + METER.h - 4], 24);
    var wireC = bezierPoints([METER.x + METER.w - 30, METER.y + METER.h - 4], [METER.x + METER.w + 10, METER.y + 60], [LAMP.x + 60, LAMP.y + 160], [LAMP.x + 14, LAMP.y + 96], 24);
    var wireD = bezierPoints([LAMP.x - 14, LAMP.y + 96], [LAMP.x - 50, LAMP.y + 170], [TPLUS[0] + 10, TPLUS[1] - 80], TPLUS, 24);
    var samplePts = [CLIP_A, CLIP_B];
    var route = [
      { pts: wireA, show: true },
      { pts: samplePts, show: false },
      { pts: wireB, show: true },
      { pts: wireC, show: true },
      { pts: wireD, show: true }
    ].map(function (r) { r.path = makePath(r.pts); return r; });

    function drawRoom(ctx) {
      var wall = ctx.createLinearGradient(0, 0, 0, 290);
      wall.addColorStop(0, '#1b2537');
      wall.addColorStop(1, '#2b3850');
      ctx.fillStyle = wall;
      ctx.fillRect(0, 0, W, 290);
      // pegboard
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (var y = 22; y < 270; y += 22) for (var x = 14; x < 590; x += 22) { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill(); }
      // bench top (perspective)
      var top = ctx.createLinearGradient(0, 280, 0, 486);
      top.addColorStop(0, '#5b4630');
      top.addColorStop(1, '#8a6a46');
      ctx.fillStyle = top;
      ctx.beginPath();
      ctx.moveTo(0, 290); ctx.lineTo(W, 290); ctx.lineTo(W, 486); ctx.lineTo(0, 486);
      ctx.fill();
      var r = seeded(5);
      ctx.strokeStyle = 'rgba(40,25,10,0.18)';
      ctx.lineWidth = 1;
      for (var k = 0; k < 26; k++) {
        var gy = 296 + r() * 186;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(W * 0.3, gy + (r() - 0.5) * 8, W * 0.6, gy + (r() - 0.5) * 8, W, gy + (r() - 0.5) * 6);
        ctx.stroke();
      }
      ctx.fillStyle = '#3d2d1c';
      ctx.fillRect(0, 486, W, 10);
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0, 496, W, H - 496);
    }

    function drawBattery(ctx, ph) {
      var b = BAT;
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(b.x + b.w / 2 + 10, b.y + b.h + 4, b.w * 0.62, 10, 0, 0, TAU); ctx.fill();
      // top face
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + b.dx, b.y + b.dy); ctx.lineTo(b.x + b.w + b.dx, b.y + b.dy); ctx.lineTo(b.x + b.w, b.y);
      ctx.closePath(); ctx.fill();
      // side face
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.moveTo(b.x + b.w, b.y); ctx.lineTo(b.x + b.w + b.dx, b.y + b.dy); ctx.lineTo(b.x + b.w + b.dx, b.y + b.h + b.dy); ctx.lineTo(b.x + b.w, b.y + b.h);
      ctx.closePath(); ctx.fill();
      // front face with label
      var front = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
      front.addColorStop(0, '#15803d');
      front.addColorStop(0.5, '#22c55e');
      front.addColorStop(1, '#166534');
      ctx.fillStyle = front;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#111827';
      ctx.fillRect(b.x, b.y + b.h * 0.62, b.w, b.h * 0.38);
      text(ctx, ph.breakdown ? '25 kV' : state.volts + ' V', b.x + b.w / 2, b.y + 44, 30, '#f8fafc', { align: 'center', weight: 900 });
      text(ctx, ph.breakdown ? 'HV TESTER · 2 mA LIMIT' : 'BENCH SUPPLY', b.x + b.w / 2, b.y + b.h - 14, 10, '#d1d5db', { align: 'center', weight: 800 });
      // terminals (springs)
      [[TPLUS, '#dc2626', '+'], [TMINUS, '#111827', '−']].forEach(function (tm) {
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(tm[0][0] - 3, tm[0][1] - 16, 6, 16);
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 2;
        for (var c = 0; c < 4; c++) { ctx.beginPath(); ctx.ellipse(tm[0][0], tm[0][1] - 4 - c * 4, 7, 2.5, 0, 0, TAU); ctx.stroke(); }
        tag(ctx, tm[2], tm[0][0], tm[0][1] - 28, { size: 12, bg: tm[1] });
      });
    }

    function drawWire(ctx, pts, color) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 8;
      ctx.save(); ctx.translate(2, 4); strokePoints(ctx, pts); ctx.restore();
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      strokePoints(ctx, pts);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.6;
      ctx.save(); ctx.translate(-1, -1.5); strokePoints(ctx, pts); ctx.restore();
    }

    function filamentColor(frac) {
      if (frac < 0.02) return [70, 40, 30];
      if (frac < 0.25) return [lerp(120, 255, frac / 0.25), lerp(30, 90, frac / 0.25), 20];
      if (frac < 1) return [255, lerp(90, 225, (frac - 0.25) / 0.75), lerp(20, 140, (frac - 0.25) / 0.75)];
      return [255, 248, lerp(160, 240, clamp(frac - 1, 0, 1))];
    }

    function drawLamp(ctx, ph, t) {
      var frac = ph.bulbW / BULB.ratedWatts;
      state.glow = lerp(state.glow, frac, reducedMotion ? 1 : 0.15);
      var g = clamp(state.glow, 0, 2.5);
      var L = LAMP;
      // light pool on the bench + bloom
      if (g > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var pool = ctx.createRadialGradient(L.x, 360, 10, L.x, 360, 260);
        pool.addColorStop(0, 'rgba(255,200,110,' + clamp(0.35 * g, 0, 0.6) + ')');
        pool.addColorStop(1, 'rgba(255,200,110,0)');
        ctx.fillStyle = pool;
        ctx.beginPath(); ctx.ellipse(L.x, 360, 300, 120, 0, 0, TAU); ctx.fill();
        var bloom = ctx.createRadialGradient(L.x, L.y, 6, L.x, L.y, 170);
        bloom.addColorStop(0, 'rgba(255,230,160,' + clamp(0.8 * g, 0, 0.95) + ')');
        bloom.addColorStop(0.3, 'rgba(255,190,90,' + clamp(0.3 * g, 0, 0.5) + ')');
        bloom.addColorStop(1, 'rgba(255,160,60,0)');
        ctx.fillStyle = bloom;
        ctx.beginPath(); ctx.arc(L.x, L.y, 170, 0, TAU); ctx.fill();
        ctx.restore();
      }
      // socket + stand
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(L.x + 6, L.y + 130, 44, 9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2d3748';
      roundRect(ctx, L.x - 40, L.y + 112, 80, 18, 6); ctx.fill();
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(L.x - 6, L.y + 70, 12, 44);
      var sock = ctx.createLinearGradient(L.x - 20, 0, L.x + 20, 0);
      sock.addColorStop(0, '#78350f'); sock.addColorStop(0.5, '#d6a46b'); sock.addColorStop(1, '#78350f');
      ctx.fillStyle = sock;
      roundRect(ctx, L.x - 20, L.y + 34, 40, 40, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      for (var s = 0; s < 4; s++) strokePoints(ctx, [[L.x - 18, L.y + 40 + s * 8], [L.x + 18, L.y + 44 + s * 8]]);
      // terminals on the stand
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath(); ctx.arc(L.x - 14, L.y + 96, 5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(L.x + 14, L.y + 96, 5, 0, TAU); ctx.fill();
      // glass globe
      var col = filamentColor(g);
      var glass = ctx.createRadialGradient(L.x - 12, L.y - 14, 4, L.x, L.y, L.r + 6);
      if (g > 0.02) {
        glass.addColorStop(0, rgba([255, 250, 230], clamp(0.35 + g * 0.5, 0, 0.95)));
        glass.addColorStop(0.6, rgba(col, clamp(0.12 + g * 0.35, 0, 0.7)));
        glass.addColorStop(1, rgba(col, 0.15));
      } else {
        glass.addColorStop(0, 'rgba(255,255,255,0.35)');
        glass.addColorStop(1, 'rgba(180,200,220,0.12)');
      }
      ctx.fillStyle = glass;
      ctx.beginPath();
      ctx.arc(L.x, L.y, L.r, Math.PI * 0.72, Math.PI * 2.28);
      ctx.quadraticCurveTo(L.x + 16, L.y + 30, L.x + 15, L.y + 36);
      ctx.lineTo(L.x - 15, L.y + 36);
      ctx.quadraticCurveTo(L.x - 16, L.y + 30, L.x - L.r * Math.cos(Math.PI * 0.28), L.y + L.r * Math.sin(Math.PI * 0.28));
      ctx.fill();
      ctx.strokeStyle = 'rgba(226,232,240,0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // filament support + coil
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1.4;
      strokePoints(ctx, [[L.x - 8, L.y + 34], [L.x - 12, L.y + 2]]);
      strokePoints(ctx, [[L.x + 8, L.y + 34], [L.x + 12, L.y + 2]]);
      ctx.save();
      if (g > 0.05) { ctx.shadowColor = rgba(col, 1); ctx.shadowBlur = 10 + 14 * clamp(g, 0, 1.5); }
      ctx.strokeStyle = rgba(col, 1);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var k = 0; k <= 24; k++) {
        var fx = lerp(L.x - 12, L.x + 12, k / 24);
        ctx.lineTo(fx, L.y + 2 + Math.sin(k * 1.6) * 3.5);
      }
      ctx.stroke();
      ctx.restore();
      // glass glint
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(L.x, L.y, L.r - 8, Math.PI * 1.15, Math.PI * 1.42); ctx.stroke();
      if (g > 1.8) {
        var flick = 0.6 + 0.4 * Math.sin(t * 40);
        tag(ctx, '⚠ OVERDRIVEN', L.x, L.y - L.r - 18, { size: 11, bg: 'rgba(185,28,28,' + flick + ')' });
      }
      text(ctx, '6 V · 15 W lamp', L.x, L.y + 146, 11, '#e2e8f0', { align: 'center', weight: 800 });
    }

    function meterAngle(I) {
      // log scale: 1 µA (left) … 10 A (right)
      if (I < 1e-6) return -Math.PI * 0.86 + 0.0;
      var f = clamp((Math.log10(I) + 6) / 7, 0, 1);
      return lerp(-Math.PI * 0.86, -Math.PI * 0.14, f);
    }

    function drawMeter(ctx, ph, t) {
      var m = METER;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(m.x + m.w / 2 + 8, m.y + m.h + 4, m.w * 0.55, 9, 0, 0, TAU); ctx.fill();
      // case (3D)
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + 14, m.y - 12); ctx.lineTo(m.x + m.w + 14, m.y - 12); ctx.lineTo(m.x + m.w, m.y);
      ctx.fill();
      ctx.fillStyle = '#0b0f19';
      ctx.beginPath();
      ctx.moveTo(m.x + m.w, m.y); ctx.lineTo(m.x + m.w + 14, m.y - 12); ctx.lineTo(m.x + m.w + 14, m.y + m.h - 12); ctx.lineTo(m.x + m.w, m.y + m.h);
      ctx.fill();
      var cs = ctx.createLinearGradient(0, m.y, 0, m.y + m.h);
      cs.addColorStop(0, '#374151'); cs.addColorStop(1, '#1f2937');
      ctx.fillStyle = cs;
      roundRect(ctx, m.x, m.y, m.w, m.h, 10); ctx.fill();
      // dial face
      var cx = m.x + m.w / 2;
      var cy = m.y + 98;
      ctx.fillStyle = '#f8f5ec';
      roundRect(ctx, m.x + 10, m.y + 10, m.w - 20, 96, 8); ctx.fill();
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(cx, cy, 70, -Math.PI * 0.86, -Math.PI * 0.14); ctx.stroke();
      var labels = ['1µ', '', '100µ', '', '10m', '', '1 A', ''];
      for (var d = 0; d <= 7; d++) {
        var a = lerp(-Math.PI * 0.86, -Math.PI * 0.14, d / 7);
        strokePoints(ctx, [[cx + Math.cos(a) * 64, cy + Math.sin(a) * 64], [cx + Math.cos(a) * 72, cy + Math.sin(a) * 72]]);
        if (d < 7) {
          for (var sub = 2; sub < 10; sub++) {
            var as = lerp(-Math.PI * 0.86, -Math.PI * 0.14, (d + Math.log10(sub)) / 7);
            strokePoints(ctx, [[cx + Math.cos(as) * 68, cy + Math.sin(as) * 68], [cx + Math.cos(as) * 72, cy + Math.sin(as) * 72]]);
          }
        }
        if (labels[d]) text(ctx, labels[d], cx + Math.cos(a) * 54, cy + Math.sin(a) * 54 + 3, 9.5, '#1f2937', { align: 'center', weight: 800 });
      }
      text(ctx, 'AMPS · LOG SCALE', cx, m.y + 84, 7.5, '#6b7280', { align: 'center', weight: 900 });
      var target = meterAngle(ph.I);
      if (ph.breakdown) target += Math.sin(t * 30) * 0.02;
      state.needle = reducedMotion ? target : lerp(state.needle || target, target, 0.12);
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 2;
      strokePoints(ctx, [[cx, cy], [cx + Math.cos(state.needle) * 72, cy + Math.sin(state.needle) * 72]]);
      ctx.fillStyle = '#111827';
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, TAU); ctx.fill();
      // LCD
      ctx.fillStyle = '#0f2a1d';
      roundRect(ctx, m.x + 22, m.y + 112, m.w - 44, 26, 5); ctx.fill();
      text(ctx, formatAmps(ph.I), cx, m.y + 131, 16, '#86efac', { align: 'center', weight: 900, shadow: 'rgba(134,239,172,0.6)', blur: 6 });
      text(ctx, 'AMMETER', m.x + 12, m.y - 18, 11, '#e2e8f0', { weight: 900 });
      // terminals
      ctx.fillStyle = '#111827';
      ctx.beginPath(); ctx.arc(m.x + 30, m.y + m.h - 4, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath(); ctx.arc(m.x + m.w - 30, m.y + m.h - 4, 6, 0, TAU); ctx.fill();
    }

    function drawSample(ctx, ph, t) {
      var s = spec();
      var x0 = SAMPLE.x0;
      var x1 = SAMPLE.x1;
      var y = SAMPLE.y;
      var i;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse((x0 + x1) / 2 + 6, y + 18, (x1 - x0) * 0.55, 8, 0, 0, TAU); ctx.fill();
      var g;
      if (state.mat === 'copper') {
        g = ctx.createLinearGradient(0, y - 8, 0, y + 8);
        g.addColorStop(0, '#fcd3a1'); g.addColorStop(0.35, '#e07b39'); g.addColorStop(0.7, '#a14a16'); g.addColorStop(1, '#6b2e0b');
        ctx.fillStyle = g;
        roundRect(ctx, x0, y - 8, x1 - x0, 16, 8); ctx.fill();
        ctx.strokeStyle = 'rgba(255,240,220,0.7)';
        ctx.lineWidth = 2;
        strokePoints(ctx, [[x0 + 8, y - 4], [x1 - 8, y - 4]]);
      } else if (state.mat === 'graphite') {
        g = ctx.createLinearGradient(0, y - 5, 0, y + 5);
        g.addColorStop(0, '#9ca3af'); g.addColorStop(0.4, '#4b5563'); g.addColorStop(1, '#111827');
        ctx.fillStyle = g;
        roundRect(ctx, x0, y - 5, x1 - x0, 10, 4); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.2;
        strokePoints(ctx, [[x0 + 6, y - 2.5], [x1 - 6, y - 2.5]]);
      } else if (state.mat === 'saltwater') {
        // glass trough with water and two electrodes
        ctx.fillStyle = 'rgba(200,225,245,0.18)';
        roundRect(ctx, x0 - 4, y - 50, x1 - x0 + 8, 66, 8); ctx.fill();
        var wg = ctx.createLinearGradient(0, y - 34, 0, y + 14);
        wg.addColorStop(0, 'rgba(96,165,250,0.55)'); wg.addColorStop(1, 'rgba(29,78,216,0.75)');
        ctx.fillStyle = wg;
        roundRect(ctx, x0, y - 34, x1 - x0, 48, 6); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        var rs = seeded(9);
        var crystals = s.c && s.c.salty ? 22 : 10;
        for (i = 0; i < crystals; i++) ctx.fillRect(x0 + 20 + rs() * (x1 - x0 - 40), y + 6 + rs() * 6, 3, 3);
        ctx.strokeStyle = 'rgba(226,232,240,0.7)';
        ctx.lineWidth = 2;
        roundRect(ctx, x0 - 4, y - 50, x1 - x0 + 8, 66, 8); ctx.stroke();
        // electrodes
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(x0 + 10, y - 58, 8, 64);
        ctx.fillRect(x1 - 18, y - 58, 8, 64);
        bubbles.forEach(function (b) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
        });
        text(ctx, 'H₂', x0 + 14, y - 64, 10, '#e0f2fe', { align: 'center', weight: 900 });
        text(ctx, 'Cl₂', x1 - 14, y - 64, 10, '#dcfce7', { align: 'center', weight: 900 });
      } else if (state.mat === 'silicon') {
        var cx = (x0 + x1) / 2;
        if (s.c && s.c.excited) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          var beam = ctx.createLinearGradient(0, 300, 0, y);
          beam.addColorStop(0, 'rgba(253,224,71,0)');
          beam.addColorStop(1, 'rgba(253,224,71,0.45)');
          ctx.fillStyle = beam;
          ctx.beginPath(); ctx.moveTo(cx - 14, 300); ctx.lineTo(cx + 14, 300); ctx.lineTo(cx + 80, y); ctx.lineTo(cx - 80, y); ctx.fill();
          ctx.restore();
        }
        ctx.save();
        ctx.beginPath(); ctx.ellipse(cx, y, (x1 - x0) / 2, 22, 0, 0, TAU); ctx.clip();
        g = ctx.createLinearGradient(x0, y - 20, x1, y + 20);
        g.addColorStop(0, '#312e81'); g.addColorStop(0.25, '#0e7490'); g.addColorStop(0.5, '#6d28d9'); g.addColorStop(0.75, '#155e75'); g.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = g;
        ctx.fillRect(x0, y - 24, x1 - x0, 48);
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 0.8;
        for (i = x0; i < x1; i += 12) strokePoints(ctx, [[i, y - 24], [i + 6, y + 24]]);
        for (i = -24; i < 24; i += 7) strokePoints(ctx, [[x0, y + i], [x1, y + i]]);
        ctx.restore();
        ctx.strokeStyle = 'rgba(203,213,225,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(cx, y, (x1 - x0) / 2, 22, 0, 0, TAU); ctx.stroke();
      } else if (state.mat === 'wood') {
        var wet = s.c && s.c.wet;
        g = ctx.createLinearGradient(0, y - 11, 0, y + 11);
        g.addColorStop(0, wet ? '#8a5a2b' : '#e3b778'); g.addColorStop(0.5, wet ? '#5c3a19' : '#c08a4a'); g.addColorStop(1, wet ? '#3b240e' : '#8a5a2b');
        ctx.fillStyle = g;
        roundRect(ctx, x0, y - 11, x1 - x0, 22, 6); ctx.fill();
        ctx.strokeStyle = wet ? 'rgba(20,10,0,0.35)' : 'rgba(110,65,20,0.45)';
        ctx.lineWidth = 1;
        for (i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(x0 + 4, y - 7 + i * 3.4);
          ctx.bezierCurveTo(x0 + 60, y - 10 + i * 3.4, x1 - 60, y - 3 + i * 3.4, x1 - 4, y - 7 + i * 3.4);
          ctx.stroke();
        }
        if (wet) {
          ctx.fillStyle = 'rgba(147,197,253,0.8)';
          for (i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(x0 + 20 + i * 22, y - 8 + (i % 2) * 6, 2.5, 3.5, 0, 0, TAU); ctx.fill(); }
          ctx.fillStyle = 'rgba(96,165,250,0.35)';
          ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, y + 17, 70, 5, 0, 0, TAU); ctx.fill();
        }
      } else {
        g = ctx.createLinearGradient(0, y - 9, 0, y + 9);
        g.addColorStop(0, '#4b5563'); g.addColorStop(0.3, '#1f2937'); g.addColorStop(1, '#030712');
        ctx.fillStyle = g;
        roundRect(ctx, x0, y - 9, x1 - x0, 18, 9); ctx.fill();
        if (ph.breakdown) {
          ctx.fillStyle = '#000';
          ctx.beginPath(); ctx.arc((x0 + x1) / 2 + 10, y, 5, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(251,146,60,0.7)';
          ctx.beginPath(); ctx.arc((x0 + x1) / 2 + 10, y, 2.5, 0, TAU); ctx.fill();
          drawBolt(ctx, x0 + 4, y - 12, x1 - 4, y - 12, 14, t);
        }
      }
      if (s.c && s.c.heat) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var hg = ctx.createRadialGradient((x0 + x1) / 2, y, 4, (x0 + x1) / 2, y, 90);
        hg.addColorStop(0, 'rgba(249,115,22,0.55)');
        hg.addColorStop(1, 'rgba(249,115,22,0)');
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, y, 100, 26, 0, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1.5;
        for (i = 0; i < 4; i++) {
          ctx.beginPath();
          for (var hy = 0; hy < 40; hy += 3) ctx.lineTo(x0 + 40 + i * 30 + Math.sin(hy * 0.3 + t * 6 + i) * 3, y - 14 - hy);
          ctx.stroke();
        }
      }
      // alligator clips
      [[CLIP_A, '#111827'], [CLIP_B, '#dc2626']].forEach(function (c, idx) {
        var cx2 = c[0][0];
        var cy2 = c[0][1];
        var dir = idx ? -1 : 1;
        var clipY = state.mat === 'saltwater' ? cy2 - 58 : cy2;
        var tipX = state.mat === 'saltwater' ? (idx ? SAMPLE.x1 - 14 : SAMPLE.x0 + 14) : cx2 + dir * 14;
        ctx.fillStyle = c[1];
        ctx.beginPath();
        ctx.moveTo(cx2 - dir * 16, clipY - 8);
        ctx.lineTo(tipX, clipY - 5);
        ctx.lineTo(tipX, clipY + 5);
        ctx.lineTo(cx2 - dir * 16, clipY + 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d1d5db';
        ctx.fillRect(Math.min(tipX, tipX - dir * 10), clipY - 6, 10, 12);
      });
      text(ctx, s.m.name.toUpperCase() + ' SAMPLE · ' + formatOhms(s.ohms), (x0 + x1) / 2, y + 36, 12, '#fef3c7', { align: 'center', weight: 900 });
    }

    function drawElectronFlow(ctx, ph) {
      var f = flowFrac(ph.I);
      if (f <= 0) return;
      var spacing = 26;
      ctx.fillStyle = '#7dd3fc';
      ctx.save();
      ctx.shadowColor = 'rgba(56,189,248,0.9)';
      ctx.shadowBlur = 6;
      route.forEach(function (r) {
        if (!r.show) return;
        for (var d = 0; d < r.path.total; d += spacing) {
          var dd = (d + state.flowOffset) % r.path.total;
          var p = r.path.at(dd);
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, TAU); ctx.fill();
        }
      });
      ctx.restore();
    }

    function drawLadder(ctx) {
      var s = spec();
      var y = 518;
      var x0 = 56;
      var x1 = W - 40;
      var lo = -8;
      var hi = 16;
      function xs(rho) { return lerp(x0, x1, (Math.log10(rho) - lo) / (hi - lo)); }
      var exp0 = Math.floor(Math.log10(s.rho));
      var mant0 = s.rho / Math.pow(10, exp0);
      text(ctx, 'RESISTIVITY (Ω·m, each tick ×10)', x0, 506, 10.5, '#94a3b8', { weight: 900 });
      text(ctx, s.m.name + ' ≈ ' + mant0.toFixed(1) + ' × 10' + sup(exp0) + ' Ω·m', x1, 506, 11, '#facc15', { weight: 900, align: 'right' });
      var zones = [[lo, -4, '#1d4ed8', 'CONDUCTORS'], [-4, 7, '#b45309', 'SEMICONDUCTORS & ELECTROLYTES'], [7, hi, '#475569', 'INSULATORS']];
      zones.forEach(function (z) {
        var a = lerp(x0, x1, (z[0] - lo) / (hi - lo));
        var b = lerp(x0, x1, (z[1] - lo) / (hi - lo));
        ctx.fillStyle = z[2];
        ctx.fillRect(a, y, b - a, 10);
        text(ctx, z[3], (a + b) / 2, y + 26, 9.5, '#cbd5e1', { align: 'center', weight: 900 });
      });
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (var e = lo; e <= hi; e++) ctx.fillRect(lerp(x0, x1, (e - lo) / (hi - lo)) - 0.5, y - 3, 1, 3);
      text(ctx, '10⁻⁸', x0, y + 26, 9, '#64748b', { align: 'center', weight: 800 });
      text(ctx, '10¹⁶', x1, y + 26, 9, '#64748b', { align: 'center', weight: 800 });
      Object.keys(MATERIALS).forEach(function (key) {
        var m = MATERIALS[key];
        var rho = key === state.mat ? s.rho : m.rho;
        var x = xs(rho);
        var on = key === state.mat;
        ctx.fillStyle = on ? '#facc15' : '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(x, y - 1); ctx.lineTo(x - (on ? 7 : 4), y - (on ? 12 : 8)); ctx.lineTo(x + (on ? 7 : 4), y - (on ? 12 : 8));
        ctx.fill();
      });
    }

    function stepBench(dt, t) {
      var ph = physics();
      var f = flowFrac(ph.I);
      state.flowOffset -= 160 * Math.pow(f, 1.4) * dt; // electrons run − → +
      if (state.flowOffset < -1e6) state.flowOffset = 0;
      // electrolysis bubbles at the electrodes
      if (state.mat === 'saltwater' && !reducedMotion) {
        var rate = ph.I * 40 * dt;
        if (Math.random() < rate) bubbles.push({ x: SAMPLE.x0 + 14 + (Math.random() - 0.5) * 8, y: SAMPLE.y + 4, r: 1.5 + Math.random() * 2, v: 30 + Math.random() * 30 });
        if (Math.random() < rate * 0.5) bubbles.push({ x: SAMPLE.x1 - 14 + (Math.random() - 0.5) * 8, y: SAMPLE.y + 4, r: 1.2 + Math.random() * 1.5, v: 26 + Math.random() * 20 });
      }
      for (var b = bubbles.length - 1; b >= 0; b--) {
        bubbles[b].y -= bubbles[b].v * dt;
        bubbles[b].x += Math.sin(t * 6 + b) * 0.2;
        if (bubbles[b].y < SAMPLE.y - 34) bubbles.splice(b, 1);
      }
      if (bubbles.length > 80) bubbles.splice(0, bubbles.length - 80);
      stepZoom(dt, t);
    }

    var scene = {
      step: stepBench,
      draw: function (ctx, view, t) {
        ctx.scale(view.s, view.s);
        var ph = physics();
        drawRoom(ctx);
        drawWire(ctx, wireD, '#dc2626');
        drawWire(ctx, wireC, '#dc2626');
        drawWire(ctx, wireB, '#111827');
        drawWire(ctx, wireA, '#111827');
        drawBattery(ctx, ph);
        drawMeter(ctx, ph, t);
        drawLamp(ctx, ph, t);
        drawSample(ctx, ph, t);
        drawElectronFlow(ctx, ph);
        // magnifier cone from the sample to the zoom panel
        ctx.fillStyle = 'rgba(148,163,184,0.06)';
        ctx.beginPath();
        ctx.moveTo((SAMPLE.x0 + SAMPLE.x1) / 2 + 20, SAMPLE.y - 6);
        ctx.lineTo(ZX0 - 12, 30);
        ctx.lineTo(ZX0 - 12, ZY1 + 44);
        ctx.closePath();
        ctx.fill();
        drawZoom(ctx, t);
        drawLadder(ctx);
        text(ctx, 'blue dots = electrons, flowing − → +', 14, 480, 11, '#bfdbfe', { weight: 800 });
      }
    };

    var handle = null;
    buildZoom();
    handle = mountScene(canvas, { w: W, h: H }, scene);
    syncUI();
  }

  /* ════════════════════════════════════════════════════════════════
     SECTION 6 — POWER GRID PANORAMA
     ════════════════════════════════════════════════════════════════ */
  var GRID_STAGES = [
    { name: 'Power plant', short: 'Plant', x: 230, span: [0, 430], volts: 20000, label: '20 kV',
      voltage: '13.8–24 kV AC', type: 'Generation (3-phase, 60 Hz)',
      purpose: 'Steam (from gas, coal or nuclear heat), falling water or wind turns a turbine. The turbine spins a huge electromagnet inside coils of copper, and Faraday induction pushes the coil’s electrons back and forth 60 times a second. Three sets of coils give three "phases".' },
    { name: 'Step-up transformer', short: 'Step-up', x: 560, span: [430, 690], volts: 345000, label: '345 kV',
      voltage: '138–765 kV AC', type: 'Step-up transformer',
      purpose: 'Two coils share one iron core. The output coil has about 17× more turns, so voltage goes up 17× and current goes down 17×. Same power, far less current, and heat loss in a wire grows with current squared (I²R).' },
    { name: 'Transmission lines', short: 'Lines', x: 990, span: [690, 1340], volts: 345000, label: '345 kV',
      voltage: '230–765 kV AC', type: 'Long-distance transmission',
      purpose: 'Steel lattice towers hold bare aluminium-steel cables far above the ground; the air around them is the insulation. Glass or porcelain insulator strings keep the cables off the steel. Try the loss calculator below to see why these voltages are so high.' },
    { name: 'Substation', short: 'Substation', x: 1460, span: [1340, 1620], volts: 12470, label: '12.5 kV',
      voltage: '4–35 kV AC', type: 'Distribution substation',
      purpose: 'Near town the voltage is stepped down for local "feeder" lines along streets. Circuit breakers here can cut a faulty line in a fraction of a second, which is why one fallen tree doesn’t black out the whole city.' },
    { name: 'Pole transformer', short: 'Pole can', x: 1800, span: [1620, 1990], volts: 240, label: '240 V',
      voltage: '120 / 240 V AC (split phase)', type: 'Neighborhood transformer',
      purpose: 'The grey can on a pole (or a green box on a lawn) makes the last step down for a handful of houses: about 52× fewer volts, so 12,470 V becomes 240 V, split into two 120 V halves.' },
    { name: 'Your home', short: 'Home', x: 2170, span: [1990, 2400], volts: 120, label: '120 V',
      voltage: '120 V outlets (240 V for big appliances)', type: 'Breaker panel & outlets',
      purpose: 'The breaker panel splits power into parallel circuits, so every outlet gets the full 120 V and one appliance switching off doesn’t affect the others. A phone charger then converts 120 V AC to about 5–20 V DC.' }
  ];

  function initGridScene() {
    var canvas = document.getElementById('we-grid-canvas');
    var profile = document.getElementById('we-grid-profile');
    var stepButtons = Array.prototype.slice.call(document.querySelectorAll('[data-grid-step]'));
    var cards = Array.prototype.slice.call(document.querySelectorAll('.we-grid-stage[data-grid-stage]'));
    var outV = document.getElementById('we-grid-voltage');
    var outT = document.getElementById('we-grid-type');
    var outP = document.getElementById('we-grid-purpose');
    var tourBtn = document.getElementById('we-grid-tour');
    var electronsToggle = document.getElementById('we-grid-electrons');
    var lossSlider = document.getElementById('we-loss-slider');
    if (!canvas || !window.SimKit) return;

    var W = 2400;
    var H = 560;
    var state = { stage: 0, camX: GRID_STAGES[0].x, targetX: GRID_STAGES[0].x, electrons: false, lossFrac: 0.008, lossVolts: 345000, tour: null, hover: -1 };
    var view = { w: 1, h: 1, s: 1, viewW: 1100 };
    var steam = [];

    function groundY(x) {
      return 448 - 22 * Math.sin(x / 260 + 0.6) - 12 * Math.sin(x / 97 + 2) * (x > 700 && x < 1340 ? 1 : 0.35);
    }

    function setStage(idx, fromTour) {
      state.stage = clamp(idx, 0, GRID_STAGES.length - 1);
      state.targetX = GRID_STAGES[state.stage].x;
      if (!fromTour) stopTour();
      var st = GRID_STAGES[state.stage];
      if (outV) outV.textContent = st.voltage;
      if (outT) outT.textContent = st.type;
      if (outP) outP.textContent = st.purpose;
      stepButtons.forEach(function (b) {
        var on = parseInt(b.dataset.gridStep, 10) === state.stage;
        b.setAttribute('aria-pressed', String(on));
      });
      cards.forEach(function (card) {
        var on = parseInt(card.dataset.gridStage, 10) === state.stage;
        card.classList.toggle('is-active', on);
        card.setAttribute('aria-pressed', String(on));
      });
      drawProfile();
      if (reducedMotion) state.camX = state.targetX;
      if (handle) handle.invalidate();
    }

    function stopTour() {
      if (state.tour) { clearInterval(state.tour); state.tour = null; }
      if (tourBtn) { tourBtn.setAttribute('aria-pressed', 'false'); tourBtn.textContent = '▶ Follow the power'; }
    }

    stepButtons.forEach(function (b) { b.addEventListener('click', function () { setStage(parseInt(b.dataset.gridStep, 10)); }); });
    cards.forEach(function (card) { card.addEventListener('click', function () { setStage(parseInt(card.dataset.gridStage, 10)); }); });
    if (tourBtn) {
      tourBtn.addEventListener('click', function () {
        if (state.tour) { stopTour(); return; }
        setStage(0, true);
        tourBtn.setAttribute('aria-pressed', 'true');
        tourBtn.textContent = '■ Stop the tour';
        state.tour = setInterval(function () {
          if (state.stage >= GRID_STAGES.length - 1) { stopTour(); return; }
          setStage(state.stage + 1, true);
        }, 4200);
      });
    }
    if (electronsToggle) electronsToggle.addEventListener('change', function () { state.electrons = electronsToggle.checked; if (handle) handle.invalidate(); });

    /* loss calculator (HTML) */
    var LOSS_VOLTS = [13800, 69000, 138000, 345000, 765000];
    var LINE_OHMS = 10;
    var POWER = 100e6;
    function updateLoss() {
      if (!lossSlider) return;
      var V = LOSS_VOLTS[parseInt(lossSlider.value, 10) || 0];
      var I = POWER / V;
      var loss = I * I * LINE_OHMS;
      var frac = loss / POWER;
      state.lossFrac = Math.min(frac, 1.5);
      state.lossVolts = V;
      var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
      set('we-loss-volts', (V / 1000).toLocaleString() + ' kV');
      set('we-loss-current', Math.round(I).toLocaleString() + ' A');
      set('we-loss-heat', frac >= 1 ? 'more than 100 MW' : formatWatts(loss));
      set('we-loss-pct', frac >= 1 ? '> 100%' : (frac * 100 < 1 ? (frac * 100).toFixed(2) : (frac * 100).toFixed(1)) + '%');
      lossSlider.setAttribute('aria-valuetext', (V / 1000) + ' kilovolts, ' + Math.round(I) + ' amps, ' + (frac >= 1 ? 'over 100 percent lost' : (frac * 100).toFixed(1) + ' percent lost'));
      var bar = document.getElementById('we-loss-bar');
      if (bar) {
        bar.style.setProperty('--loss', String(Math.min(frac, 1)));
        bar.classList.toggle('is-melt', frac >= 1);
      }
      set('we-loss-verdict', frac >= 1
        ? 'Impossible: the 10 Ω line would turn more than all 100 MW into heat. At 7,246 A the cables would sag and melt long before the town got anything.'
        : frac > 0.1 ? 'Wasteful: about one unit of energy in ' + Math.round(1 / frac) + ' heats the sky instead of reaching homes, and the hot wires sag.'
          : frac > 0.01 ? 'Workable for shorter runs. Utilities use 69–138 kV for regional lines.'
            : 'This is why long lines run at 345–765 kV: the loss is under one percent, so nearly every watt arrives.');
      if (handle) handle.invalidate();
    }
    if (lossSlider) lossSlider.addEventListener('input', updateLoss);

    function drawProfile() {
      if (!profile) return;
      var box = profile.parentElement;
      var cw = Math.max(1, box.clientWidth);
      var ch = 150;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      profile.width = Math.floor(cw * dpr);
      profile.height = Math.floor(ch * dpr);
      profile.style.width = cw + 'px';
      profile.style.height = ch + 'px';
      var ctx = profile.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      var padL = 52;
      var padR = 12;
      var top = 22;
      var bot = ch - 30;
      var lo = 2; // 100 V
      var hi = 6; // 1 MV
      function yv(v) { return lerp(bot, top, (Math.log10(v) - lo) / (hi - lo)); }
      var colW = (cw - padL - padR) / GRID_STAGES.length;
      ctx.fillStyle = '#0b1323';
      roundRect(ctx, 0, 0, cw, ch, 12);
      ctx.fill();
      [100, 1000, 10000, 100000, 1000000].forEach(function (v) {
        var y = yv(v);
        ctx.strokeStyle = 'rgba(148,163,184,0.18)';
        ctx.lineWidth = 1;
        strokePoints(ctx, [[padL, y], [cw - padR, y]]);
        text(ctx, v >= 1e6 ? '1 MV' : v >= 1000 ? v / 1000 + ' kV' : v + ' V', padL - 6, y + 3.5, 10, '#94a3b8', { align: 'right', weight: 800 });
      });
      text(ctx, 'VOLTAGE ALONG THE TRIP (log scale)', padL, 14, 10, '#7dd3fc', { weight: 900 });
      // highlight column
      ctx.fillStyle = 'rgba(56,189,248,0.14)';
      ctx.fillRect(padL + state.stage * colW, top - 6, colW, bot - top + 12);
      // step line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      GRID_STAGES.forEach(function (st, i) {
        var y = yv(st.volts);
        var xA = padL + i * colW + 6;
        var xB = padL + (i + 1) * colW - 6;
        if (i === 0) ctx.moveTo(xA, y); else ctx.lineTo(xA, y);
        ctx.lineTo(xB, y);
      });
      ctx.stroke();
      GRID_STAGES.forEach(function (st, i) {
        var y = yv(st.volts);
        var xc = padL + (i + 0.5) * colW;
        var on = i === state.stage;
        var narrow = colW < 90;
        if (!narrow || on) text(ctx, st.label, xc, y - 7, on ? 12 : 10.5, on ? '#f8fafc' : '#cbd5e1', { align: 'center', weight: 900 });
        text(ctx, narrow ? String(i + 1) : (i + 1) + '. ' + st.short, xc, ch - 10, 10.5, on ? '#7dd3fc' : '#94a3b8', { align: 'center', weight: on ? 900 : 700 });
        if (i > 0 && st.volts !== GRID_STAGES[i - 1].volts) {
          var ratio = st.volts / GRID_STAGES[i - 1].volts;
          var lab = ratio > 1 ? '×' + Math.round(ratio) : '÷' + Math.round(1 / ratio);
          var xEdge = padL + i * colW;
          var ym = (y + yv(GRID_STAGES[i - 1].volts)) / 2;
          tag(ctx, lab, xEdge, ym, { size: 10, bg: ratio > 1 ? '#15803d' : '#b45309' });
        }
      });
    }
    if (window.ResizeObserver && profile) new ResizeObserver(function () { drawProfile(); }).observe(profile.parentElement);

    /* ── scenery ── */
    var rnd = seeded(3);
    var stars = [];
    for (var i = 0; i < 120; i++) stars.push([rnd() * W, rnd() * 260, rnd() * 1.4 + 0.3, rnd() * TAU]);
    var TOWERS = [790, 1030, 1270];

    function towerArms(x) {
      var gy = groundY(x);
      var top = gy - 250;
      // three phase attachment points (bottom of insulator strings) + shield wire peak
      return {
        base: gy,
        top: top,
        phases: [[x - 54, top + 92], [x + 54, top + 92], [x, top + 46]],
        shield: [x, top]
      };
    }

    function sagLine(ctx, a, b, sag) {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag * 2, b[0], b[1]);
      ctx.stroke();
    }
    function sagPoint(a, b, sag, t) {
      var cx = (a[0] + b[0]) / 2;
      var cy = (a[1] + b[1]) / 2 + sag * 2;
      var u = 1 - t;
      return [u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]];
    }

    // Each energised conductor: list of [a, b, sag, kind]
    function conductors() {
      var lines = [];
      var loss = clamp(state.lossFrac, 0, 1.2);
      var hvSag = 18 + 34 * loss;
      var yard = [[612, groundY(612) - 150], [668, groundY(668) - 150], [640, groundY(640) - 176]];
      var t0 = towerArms(TOWERS[0]);
      for (var p = 0; p < 3; p++) lines.push([yard[p], t0.phases[p], 10, 'hv']);
      for (var k = 0; k < TOWERS.length - 1; k++) {
        var a = towerArms(TOWERS[k]);
        var b = towerArms(TOWERS[k + 1]);
        for (p = 0; p < 3; p++) lines.push([a.phases[p], b.phases[p], hvSag, 'hv']);
      }
      var last = towerArms(TOWERS[TOWERS.length - 1]);
      var sub = [[1392, groundY(1392) - 150], [1440, groundY(1440) - 150], [1416, groundY(1416) - 172]];
      for (p = 0; p < 3; p++) lines.push([last.phases[p], sub[p], 14, 'hv']);
      // distribution
      var poles = [1650, 1800, 1950];
      var subOut = [1560, groundY(1560) - 110];
      var prev = subOut;
      poles.forEach(function (px) {
        var top = [px, groundY(px) - 140];
        lines.push([prev, top, 8, 'mv']);
        lines.push([[prev[0] - 20, prev[1] + 2], [px - 20, top[1] + 2], 8, 'mv']);
        prev = top;
      });
      // service drop from pole can to the house
      lines.push([[1800 + 10, groundY(1800) - 104], [2070, groundY(2070) - 120], 10, 'lv']);
      lines.push([[1950, groundY(1950) - 104], [2070, groundY(2070) - 116], 8, 'lv']);
      return lines;
    }

    function drawSky(ctx, camL, camR) {
      var sky = ctx.createLinearGradient(0, 0, 0, 470);
      sky.addColorStop(0, '#0a1430');
      sky.addColorStop(0.55, '#24386a');
      sky.addColorStop(0.85, '#a5647a');
      sky.addColorStop(1, '#f0a35e');
      ctx.fillStyle = sky;
      ctx.fillRect(camL - 10, -200, camR - camL + 20, 680);
      stars.forEach(function (s) {
        if (s[0] < camL - 5 || s[0] > camR + 5) return;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.35 * Math.sin(s[3] + clockNow * 1.3)) + ')';
        ctx.fillRect(s[0], s[1], s[2], s[2]);
      });
      // far mountains with parallax
      ctx.fillStyle = '#2a3a63';
      ctx.beginPath();
      var par = camL * 0.35;
      ctx.moveTo(camL - 10, 470);
      for (var x = camL - 10; x <= camR + 20; x += 24) {
        var wx = x - par;
        ctx.lineTo(x, 372 - 40 * Math.abs(Math.sin(wx / 230)) - 26 * Math.sin(wx / 71 + 1));
      }
      ctx.lineTo(camR + 20, 470);
      ctx.fill();
    }

    function drawGround(ctx, camL, camR) {
      var gr = ctx.createLinearGradient(0, 360, 0, H);
      gr.addColorStop(0, '#24452f');
      gr.addColorStop(1, '#0e1d14');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(camL - 10, H);
      for (var x = camL - 10; x <= camR + 20; x += 12) ctx.lineTo(x, groundY(x));
      ctx.lineTo(camR + 20, H);
      ctx.fill();
      // road near the houses
      ctx.fillStyle = '#2b2f36';
      ctx.beginPath();
      ctx.moveTo(1600, H);
      for (var rx = 1600; rx <= 2400; rx += 20) ctx.lineTo(rx, groundY(rx) + 30);
      ctx.lineTo(2400, H);
      ctx.fill();
      ctx.strokeStyle = 'rgba(250,204,21,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([16, 14]);
      ctx.beginPath();
      for (var dx = 1600; dx <= 2400; dx += 20) ctx.lineTo(dx, groundY(dx) + 52);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawPlant(ctx, t) {
      var gy = groundY(150);
      // cooling tower (hyperboloid)
      var cx = 150;
      var baseW = 100;
      var waist = 62;
      var topW = 74;
      var top = gy - 210;
      var body = ctx.createLinearGradient(cx - baseW, 0, cx + baseW, 0);
      body.addColorStop(0, '#6b7280');
      body.addColorStop(0.35, '#d1d5db');
      body.addColorStop(0.65, '#9ca3af');
      body.addColorStop(1, '#4b5563');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(cx - baseW, gy + 4);
      ctx.quadraticCurveTo(cx - waist + 8, gy - 120, cx - topW, top);
      ctx.lineTo(cx + topW, top);
      ctx.quadraticCurveTo(cx + waist - 8, gy - 120, cx + baseW, gy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#374151';
      ctx.beginPath(); ctx.ellipse(cx, top, topW, 9, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      for (var b = 1; b < 6; b++) {
        var yb = top + b * 34;
        ctx.beginPath(); ctx.ellipse(cx, yb, 60 + b * 4, 4, 0, 0, Math.PI); ctx.stroke();
      }
      // steam plume
      steam.forEach(function (p) {
        ctx.fillStyle = 'rgba(226,232,240,' + clamp(p.life * 0.32, 0, 0.32) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      });
      // turbine hall with a cutaway generator
      var hx = 250;
      var hy = groundY(320) - 104;
      ctx.fillStyle = '#334155';
      ctx.fillRect(hx, hy, 160, 104);
      ctx.fillStyle = '#475569';
      ctx.beginPath(); ctx.moveTo(hx - 6, hy); ctx.lineTo(hx + 80, hy - 24); ctx.lineTo(hx + 166, hy); ctx.fill();
      ctx.fillStyle = '#0b1220';
      roundRect(ctx, hx + 16, hy + 18, 128, 70, 8); ctx.fill();
      // shaft + turbine + generator
      var gcx = hx + 108;
      var gcy = hy + 53;
      ctx.fillStyle = '#64748b';
      ctx.fillRect(hx + 22, gcy - 3, 86, 6);
      for (var s = 0; s < 4; s++) {
        var bladeH = 16 + s * 5;
        ctx.fillStyle = 'rgba(148,163,184,' + (0.55 + 0.1 * Math.sin(t * 25 + s)) + ')';
        ctx.fillRect(hx + 30 + s * 12, gcy - bladeH, 5, bladeH * 2);
      }
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(gcx, gcy, 26, 0, TAU); ctx.stroke();
      ctx.save();
      ctx.translate(gcx, gcy);
      ctx.rotate(t * 3);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-6, -20, 12, 20);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-6, 0, 12, 20);
      ctx.fillStyle = '#fff';
      ctx.font = '900 9px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('N', 0, -8);
      ctx.fillText('S', 0, 15);
      ctx.restore();
      text(ctx, 'GENERATOR', gcx, hy + 100, 9, '#cbd5e1', { align: 'center', weight: 900 });
      // lit windows
      for (var w = 0; w < 5; w++) {
        ctx.fillStyle = 'rgba(253,224,71,0.6)';
        ctx.fillRect(hx + 18 + w * 28, hy - 2 - 12, 10, 7);
      }
      // bus from the generator to the step-up yard
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      strokePoints(ctx, [[hx + 160, gcy], [512, groundY(520) - 70]]);
    }

    function insulatorStack(ctx, x, yTop, yBot, color) {
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(x - 2, yTop, 4, yBot - yTop);
      ctx.fillStyle = color || '#8b5e3c';
      for (var y = yTop + 4; y < yBot; y += 7) { ctx.beginPath(); ctx.ellipse(x, y, 7, 2.6, 0, 0, TAU); ctx.fill(); }
    }

    function drawStepUp(ctx) {
      var gy = groundY(560);
      // gravel pad + fence
      ctx.fillStyle = '#4b4f57';
      ctx.fillRect(480, gy - 6, 220, 14);
      ctx.strokeStyle = 'rgba(203,213,225,0.35)';
      ctx.lineWidth = 1;
      for (var fx = 484; fx < 700; fx += 8) strokePoints(ctx, [[fx, gy - 40], [fx + 8, gy - 6]]);
      for (fx = 484; fx < 700; fx += 8) strokePoints(ctx, [[fx + 8, gy - 40], [fx, gy - 6]]);
      // transformer tank with cooling radiators
      var tx = 510;
      var ty = gy - 92;
      var tank = ctx.createLinearGradient(tx, 0, tx + 100, 0);
      tank.addColorStop(0, '#4b5563'); tank.addColorStop(0.4, '#9ca3af'); tank.addColorStop(1, '#374151');
      ctx.fillStyle = tank;
      ctx.fillRect(tx, ty, 100, 86);
      ctx.fillStyle = '#6b7280';
      for (var f = 0; f < 6; f++) ctx.fillRect(tx - 18, ty + 8 + f * 12, 18, 7);
      for (f = 0; f < 6; f++) ctx.fillRect(tx + 100, ty + 8 + f * 12, 18, 7);
      // conservator
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath(); ctx.ellipse(tx + 50, ty - 16, 40, 10, 0, 0, TAU); ctx.fill();
      // bushings to the yard gantry
      [[612, 150], [668, 150], [640, 176]].forEach(function (b, i) {
        insulatorStack(ctx, tx + 20 + i * 30, ty - 60, ty, '#c2410c');
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        strokePoints(ctx, [[tx + 20 + i * 30, ty - 60], [b[0], groundY(b[0]) - b[1]]]);
      });
      // dead-end gantry
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 4;
      strokePoints(ctx, [[600, gy], [600, gy - 184]]);
      strokePoints(ctx, [[680, gy], [680, gy - 184]]);
      strokePoints(ctx, [[596, gy - 176], [684, gy - 176]]);
      strokePoints(ctx, [[596, gy - 150], [684, gy - 150]]);
      text(ctx, '×17 turns', tx + 50, ty + 48, 12, '#f8fafc', { align: 'center', weight: 900 });
    }

    function drawTower(ctx, x) {
      var a = towerArms(x);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.4;
      var legL = [x - 34, a.base];
      var legR = [x + 34, a.base];
      var neckL = [x - 12, a.top + 100];
      var neckR = [x + 12, a.top + 100];
      strokePoints(ctx, [legL, neckL, [x - 8, a.top + 10], [x, a.top]]);
      strokePoints(ctx, [legR, neckR, [x + 8, a.top + 10], [x, a.top]]);
      ctx.lineWidth = 1.2;
      // lattice bracing
      for (var k = 0; k < 6; k++) {
        var y1 = lerp(a.base, a.top + 100, k / 6);
        var y2 = lerp(a.base, a.top + 100, (k + 1) / 6);
        var w1 = lerp(34, 12, k / 6);
        var w2 = lerp(34, 12, (k + 1) / 6);
        strokePoints(ctx, [[x - w1, y1], [x + w2, y2]]);
        strokePoints(ctx, [[x + w1, y1], [x - w2, y2]]);
        strokePoints(ctx, [[x - w2, y2], [x + w2, y2]]);
      }
      // crossarms
      ctx.lineWidth = 2.4;
      strokePoints(ctx, [[x - 62, a.top + 66], [x + 62, a.top + 66]]);
      strokePoints(ctx, [[x - 30, a.top + 22], [x + 30, a.top + 22]]);
      ctx.lineWidth = 1.2;
      strokePoints(ctx, [[x - 62, a.top + 66], [x - 12, a.top + 84]]);
      strokePoints(ctx, [[x + 62, a.top + 66], [x + 12, a.top + 84]]);
      // insulator strings
      insulatorStack(ctx, x - 54, a.top + 66, a.top + 92, '#a5f3fc');
      insulatorStack(ctx, x + 54, a.top + 66, a.top + 92, '#a5f3fc');
      insulatorStack(ctx, x, a.top + 22, a.top + 46, '#a5f3fc');
      // aircraft warning light
      ctx.fillStyle = 'rgba(239,68,68,' + (0.5 + 0.5 * Math.sin(clockNow * 3 + x)) + ')';
      ctx.beginPath(); ctx.arc(x, a.top - 3, 3, 0, TAU); ctx.fill();
    }

    function drawSubstation(ctx) {
      var gy = groundY(1460);
      ctx.fillStyle = '#4b4f57';
      ctx.fillRect(1360, gy - 4, 240, 12);
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 3;
      // gantries
      [1384, 1448, 1540].forEach(function (gx) {
        strokePoints(ctx, [[gx, gy], [gx, gy - 180]]);
        strokePoints(ctx, [[gx + 24, gy], [gx + 24, gy - 180]]);
        strokePoints(ctx, [[gx - 4, gy - 172], [gx + 28, gy - 172]]);
        strokePoints(ctx, [[gx - 4, gy - 148], [gx + 28, gy - 148]]);
      });
      // bus bars
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      strokePoints(ctx, [[1384, gy - 150], [1564, gy - 150]]);
      // breakers
      for (var b = 0; b < 3; b++) {
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(1400 + b * 26, gy - 70, 12, 50);
        insulatorStack(ctx, 1406 + b * 26, gy - 110, gy - 70, '#a5f3fc');
      }
      // step-down transformer
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(1490, gy - 70, 70, 66);
      ctx.fillStyle = '#9ca3af';
      for (var f = 0; f < 5; f++) ctx.fillRect(1560, gy - 64 + f * 12, 12, 7);
      insulatorStack(ctx, 1505, gy - 100, gy - 70, '#c2410c');
      insulatorStack(ctx, 1545, gy - 100, gy - 70, '#c2410c');
      // feeder out
      ctx.strokeStyle = '#94a3b8';
      strokePoints(ctx, [[1545, gy - 100], [1560, gy - 110]]);
      // fence
      ctx.strokeStyle = 'rgba(203,213,225,0.3)';
      ctx.lineWidth = 1;
      for (var fx = 1360; fx < 1600; fx += 8) { strokePoints(ctx, [[fx, gy - 36], [fx + 8, gy - 4]]); strokePoints(ctx, [[fx + 8, gy - 36], [fx, gy - 4]]); }
    }

    function drawPoles(ctx) {
      [1650, 1800, 1950].forEach(function (px) {
        var gy = groundY(px);
        var wood = ctx.createLinearGradient(px - 5, 0, px + 5, 0);
        wood.addColorStop(0, '#3f2a17'); wood.addColorStop(0.5, '#7c5a36'); wood.addColorStop(1, '#3f2a17');
        ctx.fillStyle = wood;
        ctx.fillRect(px - 5, gy - 150, 10, 150);
        ctx.fillStyle = '#5b4026';
        ctx.fillRect(px - 34, gy - 142, 68, 7);
        insulatorStack(ctx, px - 20, gy - 150, gy - 140, '#e2e8f0');
        insulatorStack(ctx, px, gy - 150, gy - 140, '#e2e8f0');
        if (px === 1800) {
          var can = ctx.createLinearGradient(px + 6, 0, px + 36, 0);
          can.addColorStop(0, '#6b7280'); can.addColorStop(0.45, '#d1d5db'); can.addColorStop(1, '#4b5563');
          ctx.fillStyle = can;
          roundRect(ctx, px + 6, gy - 124, 30, 44, 6); ctx.fill();
          ctx.fillStyle = '#9ca3af';
          ctx.beginPath(); ctx.ellipse(px + 21, gy - 124, 15, 4, 0, 0, TAU); ctx.fill();
          insulatorStack(ctx, px + 21, gy - 140, gy - 124, '#e2e8f0');
        }
      });
      // streetlights
      [1720, 1880, 2330].forEach(function (lx) {
        var gy = groundY(lx) + 24;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        strokePoints(ctx, [[lx, gy], [lx, gy - 90], [lx + 18, gy - 96]]);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var lg = ctx.createRadialGradient(lx + 18, gy - 92, 2, lx + 18, gy - 60, 70);
        lg.addColorStop(0, 'rgba(253,230,138,0.55)'); lg.addColorStop(1, 'rgba(253,230,138,0)');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.moveTo(lx + 12, gy - 94); ctx.lineTo(lx + 24, gy - 94); ctx.lineTo(lx + 60, gy); ctx.lineTo(lx - 24, gy); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(lx + 12, gy - 98, 12, 4);
      });
    }

    function drawHouse(ctx, t) {
      var x0 = 2050;
      var x1 = 2290;
      var gy = groundY(2170);
      var wallTop = gy - 150;
      // roof
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath(); ctx.moveTo(x0 - 18, wallTop + 4); ctx.lineTo((x0 + x1) / 2, wallTop - 70); ctx.lineTo(x1 + 18, wallTop + 4); ctx.fill();
      ctx.fillStyle = '#991b1b';
      ctx.beginPath(); ctx.moveTo((x0 + x1) / 2, wallTop - 70); ctx.lineTo(x1 + 18, wallTop + 4); ctx.lineTo(x1 - 10, wallTop + 4); ctx.fill();
      // cutaway interior (warm)
      var inside = ctx.createLinearGradient(0, wallTop, 0, gy);
      inside.addColorStop(0, '#fde7c2'); inside.addColorStop(1, '#f2c98d');
      ctx.fillStyle = inside;
      ctx.fillRect(x0, wallTop, x1 - x0, gy - wallTop);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 6;
      ctx.strokeRect(x0, wallTop, x1 - x0, gy - wallTop);
      // floor between rooms
      ctx.fillStyle = '#92400e';
      ctx.fillRect(x0, wallTop + 72, x1 - x0, 6);
      // breaker panel
      ctx.fillStyle = '#9ca3af';
      roundRect(ctx, x0 + 14, wallTop + 88, 34, 50, 3); ctx.fill();
      ctx.fillStyle = '#374151';
      for (var b = 0; b < 6; b++) ctx.fillRect(x0 + 19 + (b % 2) * 13, wallTop + 94 + Math.floor(b / 2) * 13, 10, 8);
      text(ctx, 'PANEL', x0 + 31, wallTop + 148, 8.5, '#7c2d12', { align: 'center', weight: 900 });
      // wiring in the walls (parallel branches)
      ctx.strokeStyle = 'rgba(234,88,12,0.7)';
      ctx.lineWidth = 2;
      strokePoints(ctx, [[x0 + 48, wallTop + 100], [x1 - 20, wallTop + 100]]);
      strokePoints(ctx, [[x0 + 48, wallTop + 110], [x0 + 70, wallTop + 110], [x0 + 70, wallTop + 20], [x1 - 20, wallTop + 20]]);
      // ceiling lamp upstairs
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var lg = ctx.createRadialGradient(x0 + 130, wallTop + 20, 3, x0 + 130, wallTop + 40, 60);
      lg.addColorStop(0, 'rgba(255,220,140,0.6)'); lg.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(x0 + 130, wallTop + 30, 60, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath(); ctx.arc(x0 + 130, wallTop + 22, 7, 0, TAU); ctx.fill();
      // TV upstairs right
      ctx.fillStyle = '#111827';
      ctx.fillRect(x1 - 74, wallTop + 30, 50, 32);
      ctx.fillStyle = 'hsl(' + ((t * 40) % 360) + ',70%,55%)';
      ctx.fillRect(x1 - 70, wallTop + 34, 42, 24);
      // outlet + phone charger downstairs
      ctx.fillStyle = '#f8fafc';
      roundRect(ctx, x1 - 70, wallTop + 112, 18, 26, 3); ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.fillRect(x1 - 65, wallTop + 117, 2, 6); ctx.fillRect(x1 - 59, wallTop + 117, 2, 6);
      ctx.fillStyle = '#e5e7eb';
      roundRect(ctx, x1 - 72, wallTop + 126, 22, 16, 3); ctx.fill();
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1 - 61, wallTop + 142); ctx.quadraticCurveTo(x1 - 50, gy - 2, x1 - 36, gy - 6); ctx.stroke();
      ctx.fillStyle = '#111827';
      roundRect(ctx, x1 - 40, gy - 10, 20, 5, 2); ctx.fill();
      text(ctx, '120 V AC → 5 V DC', x1 - 62, wallTop + 104 - 10, 9, '#7c2d12', { align: 'center', weight: 900 });
      // meter on the outside wall
      ctx.fillStyle = '#d1d5db';
      ctx.beginPath(); ctx.arc(x0 - 10, wallTop + 40, 10, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.beginPath(); ctx.arc(x0 - 10, wallTop + 40, 6, 0, TAU); ctx.fill();
      ctx.save();
      ctx.translate(x0 - 10, wallTop + 40);
      ctx.rotate(t * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-1, -5, 2, 5);
      ctx.restore();
    }

    function drawFlow(ctx, t) {
      var lines = conductors();
      var loss = clamp(state.lossFrac, 0, 1.2);
      lines.forEach(function (ln) {
        var kind = ln[3];
        var hot = kind === 'hv' ? loss : 0;
        ctx.lineCap = 'round';
        ctx.strokeStyle = hot > 0.05 ? mix([120, 130, 145], [255, 90, 40], clamp(hot * 1.3, 0, 1)) : '#7b8798';
        ctx.lineWidth = kind === 'hv' ? 2.2 : kind === 'mv' ? 1.8 : 1.6;
        sagLine(ctx, ln[0], ln[1], ln[2]);
        if (hot > 0.15) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = 'rgba(255,90,40,' + clamp(hot * 0.5, 0, 0.6) + ')';
          ctx.lineWidth = 7;
          sagLine(ctx, ln[0], ln[1], ln[2]);
          ctx.restore();
        }
        // energy pulses travelling toward the home
        var col = kind === 'hv' ? [165, 243, 252] : kind === 'mv' ? [94, 234, 212] : [253, 224, 71];
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var len = Math.hypot(ln[1][0] - ln[0][0], ln[1][1] - ln[0][1]);
        var n = Math.max(1, Math.round(len / 70));
        for (var k = 0; k < n; k++) {
          var u = ((k / n) + t * (kind === 'hv' ? 0.5 : 0.35) * (90 / Math.max(len, 60))) % 1;
          var p = sagPoint(ln[0], ln[1], ln[2], u);
          var gl = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 9);
          gl.addColorStop(0, rgba(col, 0.95));
          gl.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = gl;
          ctx.beginPath(); ctx.arc(p[0], p[1], 9, 0, TAU); ctx.fill();
        }
        ctx.restore();
        // slow-motion electrons: they only wiggle back and forth (AC)
        if (state.electrons) {
          ctx.fillStyle = '#38bdf8';
          var m = Math.max(2, Math.round(len / 26));
          for (var e = 1; e < m; e++) {
            var uu = e / m + Math.sin(t * TAU * 0.8) * (5 / Math.max(len, 1));
            var q = sagPoint(ln[0], ln[1], ln[2], clamp(uu, 0, 1));
            ctx.beginPath(); ctx.arc(q[0], q[1], 2, 0, TAU); ctx.fill();
          }
        }
      });
      // shield wires (not energised)
      ctx.strokeStyle = 'rgba(148,163,184,0.5)';
      ctx.lineWidth = 1;
      for (var k2 = 0; k2 < TOWERS.length - 1; k2++) sagLine(ctx, towerArms(TOWERS[k2]).shield, towerArms(TOWERS[k2 + 1]).shield, 12);
      if (loss > 0.15) {
        var mid = sagPoint(towerArms(TOWERS[0]).phases[0], towerArms(TOWERS[1]).phases[0], 18 + 34 * loss, 0.5);
        var kv = Math.round(state.lossVolts / 100) / 10 + ' kV';
        tag(ctx, loss >= 1 ? 'At ' + kv + ': I²R melts the line' : 'At ' + kv + ': I²R heat, ' + Math.round(loss * 100) + '% lost', mid[0], mid[1] + 36, { size: 12, bg: 'rgba(185,28,28,0.9)' });
      }
    }

    function drawStageTags(ctx) {
      GRID_STAGES.forEach(function (st, i) {
        var on = i === state.stage;
        var hov = i === state.hover;
        var gy = groundY(st.x);
        var y = i === 2 ? gy - 300 : gy - (i === 0 ? 270 : i === 5 ? 250 : 220);
        tag(ctx, (i + 1) + '. ' + st.short + ' · ' + st.label, st.x, y, {
          size: on ? 15 : 12,
          bg: on ? '#0369a1' : hov ? 'rgba(3,105,161,0.7)' : 'rgba(8,15,30,0.75)',
          border: on ? '#7dd3fc' : null
        });
        if (on) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          var sp = ctx.createRadialGradient(st.x, gy, 4, st.x, gy, 160);
          sp.addColorStop(0, 'rgba(56,189,248,0.16)'); sp.addColorStop(1, 'rgba(56,189,248,0)');
          ctx.fillStyle = sp;
          ctx.beginPath(); ctx.ellipse(st.x, gy, 180, 34, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
      });
    }

    var clockNow = 0;

    function stepGrid(dt, t) {
      clockNow = t;
      var k = reducedMotion ? 1 : 1 - Math.exp(-dt * 3.2);
      state.camX = lerp(state.camX, state.targetX, k);
      if (!reducedMotion) {
        if (Math.random() < dt * 14) steam.push({ x: 150 + (Math.random() - 0.5) * 100, y: groundY(150) - 214, r: 14 + Math.random() * 10, vx: 14 + Math.random() * 10, vy: -26 - Math.random() * 12, life: 1 });
        for (var s = steam.length - 1; s >= 0; s--) {
          var p = steam[s];
          p.x += p.vx * dt; p.y += p.vy * dt; p.r += 9 * dt; p.life -= dt * 0.22;
          if (p.life <= 0) steam.splice(s, 1);
        }
      } else if (!steam.length) {
        for (var q = 0; q < 14; q++) steam.push({ x: 150 + q * 9, y: groundY(150) - 220 - q * 10, r: 16 + q * 2, vx: 0, vy: 0, life: 0.9 - q * 0.05 });
      }
    }

    function camera() {
      var half = view.viewW / 2;
      var cx = clamp(state.camX, half, W - half);
      var visH = view.h / view.s;
      // Crop most of the foreground grass: the bottom of the view sits just below the road.
      return { left: cx - half, right: cx + half, top: Math.max(0, 508 - visH) };
    }

    var scene = {
      step: stepGrid,
      resize: function (v) {
        view.w = v.w;
        view.h = v.h;
        var want = clamp(v.w * 0.95, 560, 1300);
        view.viewW = Math.min(want, 500 * v.w / v.h);
        view.s = v.w / view.viewW;
      },
      draw: function (ctx, v, t) {
        if (!view.s || view.w !== v.w) scene.resize(v);
        var cam = camera();
        ctx.scale(view.s, view.s);
        ctx.translate(-cam.left, -cam.top);
        drawSky(ctx, cam.left, cam.right);
        drawGround(ctx, cam.left, cam.right);
        if (cam.left < 460) drawPlant(ctx, t);
        if (cam.right > 470 && cam.left < 720) drawStepUp(ctx);
        TOWERS.forEach(function (x) { if (x > cam.left - 80 && x < cam.right + 80) drawTower(ctx, x); });
        if (cam.right > 1340 && cam.left < 1620) drawSubstation(ctx);
        if (cam.right > 1600) { drawPoles(ctx); drawHouse(ctx, t); }
        drawFlow(ctx, t);
        drawStageTags(ctx);
      },
      screenToWorld: function (sx, sy) {
        var cam = camera();
        return { x: cam.left + sx / view.s, y: cam.top + sy / view.s };
      },
      pointer: function (type, p, ev, drag) {
        var idx = -1;
        GRID_STAGES.forEach(function (st, i) { if (p.x >= st.span[0] && p.x < st.span[1]) idx = i; });
        if (type === 'hover') { state.hover = idx; return 'pointer'; }
        if (type === 'down') return { kind: 'pan', sx: ev.clientX, cam0: camera().left + view.viewW / 2 };
        if (type === 'move' && drag) {
          var r = canvas.getBoundingClientRect();
          var dxWorld = (ev.clientX - drag.sx) / Math.max(1, r.width) * view.viewW;
          state.camX = state.targetX = clamp(drag.cam0 - dxWorld, view.viewW / 2, W - view.viewW / 2);
          stopTour();
        }
        if (type === 'up' && drag && !drag.moved && idx >= 0) setStage(idx);
        return null;
      }
    };

    var handle = null;
    handle = mountScene(canvas, { w: W, h: H }, scene);
    updateLoss();
    setStage(0);
  }

  /* ════════════════════════════════════════════════════════════════
     SECTION 7 — LEMON BATTERY STACK (activity card widget)
     ════════════════════════════════════════════════════════════════ */
  function initLemonStack() {
    var slider = document.getElementById('we-lemon-count');
    if (!slider) return;
    var out = document.getElementById('we-lemon-readout');
    var led = document.getElementById('we-lemon-led');
    var row = document.getElementById('we-lemon-row');
    function update() {
      var n = parseInt(slider.value, 10) || 1;
      var V = 0.9 * n;
      var Vf = 1.8; // red LED turn-on voltage
      var rInt = 1000 * n; // each lemon cell has roughly 1 kΩ inside it
      var I = V > Vf ? (V - Vf) / rInt : 0;
      var glow = clamp(I / 0.0006, 0, 1);
      if (row) row.textContent = '🍋'.repeat(n);
      if (led) led.style.setProperty('--glow', glow.toFixed(2));
      slider.setAttribute('aria-valuetext', n + ' lemons, ' + V.toFixed(1) + ' volts');
      if (out) {
        out.textContent = n + (n === 1 ? ' lemon' : ' lemons') + ' in series → ' + V.toFixed(1) + ' V. ' + (I > 0
          ? 'The LED lights faintly (about ' + (I * 1000).toFixed(2) + ' mA). Each lemon’s own ~1 kΩ inside limits the current, so view it in a dark room.'
          : 'Below the ~1.8 V a red LED needs to turn on, so it stays dark. Add another lemon.');
      }
    }
    slider.addEventListener('input', update);
    update();
  }

  initWaterScene();
  initBenchScene();
  initGridScene();
  initLemonStack();
})();
