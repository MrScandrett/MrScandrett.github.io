/* Interactive simulations and practice for lessons/physics/electricity-and-magnetism/coulombs-law.html */
(function () {
  'use strict';

  var K = 8.9875517923e9; // N·m²/C²
  var G = 6.6743e-11;     // N·m²/kg²
  var TAU = Math.PI * 2;
  var FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
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

  function drawPill(ctx, text, x, y, opts) {
    opts = opts || {};
    var size = opts.size || 11;
    ctx.font = '700 ' + size + 'px ' + FONT;
    var w = ctx.measureText(text).width + size * 1.25;
    var h = size * 1.72;
    var left = opts.align === 'left' ? x : opts.align === 'right' ? x - w : x - w / 2;
    if (opts.maxW) left = clamp(left, 6, opts.maxW - w - 6);
    var top = y - h / 2;
    if (opts.maxH) top = clamp(top, 6, opts.maxH - h - 6);
    roundRect(ctx, left, top, w, h, h / 2);
    ctx.fillStyle = opts.bg || 'rgba(7, 17, 31, 0.88)';
    ctx.fill();
    if (opts.border) {
      ctx.strokeStyle = opts.border;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.fillStyle = opts.color || '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, left + w / 2, top + h / 2 + 0.5);
    ctx.textBaseline = 'alphabetic';
  }

  function formatForce(f) {
    var abs = Math.abs(f);
    if (abs === 0) return '0.00 N';
    if (abs >= 1000) return abs.toFixed(0) + ' N';
    if (abs >= 100) return abs.toFixed(1) + ' N';
    if (abs >= 1) return abs.toFixed(2) + ' N';
    if (abs >= 0.01) return abs.toFixed(3) + ' N';
    if (abs >= 1e-4) return (abs * 1e3).toFixed(2) + ' mN';
    return abs.toExponential(2) + ' N';
  }

  function formatField(e) {
    if (e >= 1e6) return (e / 1e6).toFixed(2) + ' MN/C';
    if (e >= 1e3) return (e / 1e3).toFixed(1) + ' kN/C';
    return e.toFixed(0) + ' N/C';
  }

  function formatPotential(v) {
    var abs = Math.abs(v);
    var sign = v >= 0 ? '+' : '−';
    if (abs < 0.5) return '0 V';
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + ' MV';
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + ' kV';
    return sign + abs.toFixed(0) + ' V';
  }

  function formatCharge(qMicro) {
    if (qMicro === 0) return '0 μC';
    return (qMicro > 0 ? '+' : '−') + Math.abs(qMicro) + ' μC';
  }

  function drawArrow(ctx, x1, y1, x2, y2, headSize) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.hypot(dx, dy);
    if (len < 3) return;
    var hs = headSize || 9;
    var angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - hs * 0.65 * Math.cos(angle), y2 - hs * 0.65 * Math.sin(angle));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - hs * Math.cos(angle - 0.42), y2 - hs * Math.sin(angle - 0.42));
    ctx.lineTo(x2 - hs * Math.cos(angle + 0.42), y2 - hs * Math.sin(angle + 0.42));
    ctx.closePath();
    ctx.fill();
  }

  /* ───────────────────────────────────────────────────────────
     0. Sticky Jump Bar Progress & Active Highlight
     ─────────────────────────────────────────────────────────── */
  function initJumpNav() {
    var nav = document.querySelector('.cl-jump');
    if (!nav) return;
    var links = Array.from(nav.querySelectorAll('a[href^="#"]'));
    var sections = links
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);

    function sync() {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var prog = docH > 0 ? clamp(window.scrollY / docH, 0, 1) : 0;
      nav.style.setProperty('--cl-progress', prog.toFixed(3));

      var activeIdx = 0;
      var offset = 130;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top <= offset) {
          activeIdx = i;
        }
      }
      links.forEach(function (a, i) {
        a.classList.toggle('is-active', i === activeIdx);
      });
    }

    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  /* ───────────────────────────────────────────────────────────
     1. 2D Coulomb Force & Electric Field Sandbox
     ─────────────────────────────────────────────────────────── */
  function initSandbox() {
    var canvas = document.getElementById('cl-sandbox-canvas');
    if (!canvas) return;

    var presetBtns = Array.from(document.querySelectorAll('[data-cl-preset]'));
    var mediumBtns = Array.from(document.querySelectorAll('[data-cl-medium]'));
    var layerLinesBtn = document.getElementById('cl-layer-lines');
    var layerVecBtn = document.getElementById('cl-layer-vectors');
    var layerEqBtn = document.getElementById('cl-layer-eq');
    var layerProbeBtn = document.getElementById('cl-layer-probe');
    var motionBtn = document.getElementById('cl-motion-btn');
    var resetBtn = document.getElementById('cl-sandbox-reset');

    var chargeTabsEl = document.getElementById('cl-charge-tabs');
    var addChargeBtn = document.getElementById('cl-add-charge');
    var removeChargeBtn = document.getElementById('cl-remove-charge');
    var qSlider = document.getElementById('cl-q-slider');
    var qSliderLabel = document.getElementById('cl-q-slider-label');
    var qSliderOut = document.getElementById('cl-q-slider-out');
    var flipSignBtn = document.getElementById('cl-flip-sign');
    var zeroChargeBtn = document.getElementById('cl-zero-charge');

    var mForce = document.getElementById('cl-m-force');
    var mForceSub = document.getElementById('cl-m-force-sub');
    var mDist = document.getElementById('cl-m-dist');
    var mDistSub = document.getElementById('cl-m-dist-sub');
    var mMode = document.getElementById('cl-m-mode');
    var mModeSub = document.getElementById('cl-m-mode-sub');
    var mField = document.getElementById('cl-m-field');
    var mFieldSub = document.getElementById('cl-m-field-sub');
    var readoutEl = document.getElementById('cl-sandbox-readout');

    var MEDIUMS = {
      air: { er: 1.0, label: 'Air / Vacuum', tint: null },
      paper: { er: 3.5, label: 'Paper (εᵣ = 3.5)', tint: 'rgba(251, 191, 36, 0.05)' },
      glass: { er: 5.0, label: 'Glass (εᵣ = 5.0)', tint: 'rgba(56, 189, 248, 0.06)' },
      water: { er: 80, label: 'Pure Water (εᵣ = 80)', tint: 'rgba(14, 165, 233, 0.10)' }
    };

    var PRESETS = {
      dipole: {
        desc: 'Opposite charges (+2 μC and −2 μC) at r = 0.20 m pull directly toward each other with equal 0.90 N forces.',
        charges: [
          { x: -0.10, y: 0, q: 2 },
          { x: 0.10, y: 0, q: -2 }
        ]
      },
      repel: {
        desc: 'Like charges (+4 μC and +4 μC) at r = 0.20 m push directly apart with equal 3.60 N forces.',
        charges: [
          { x: -0.10, y: 0, q: 4 },
          { x: 0.10, y: 0, q: 4 }
        ]
      },
      thirdlaw: {
        desc: 'Asymmetric charges (+1 μC and +8 μC) feel the exact same force magnitude — Newton’s Third Law in action!',
        charges: [
          { x: -0.10, y: 0, q: 1 },
          { x: 0.10, y: 0, q: 8 }
        ]
      },
      equilibrium: {
        desc: 'Three charges in a line: the central −1 μC charge sits at an unstable equilibrium point where equal left and right pulls cancel to 0 N.',
        charges: [
          { x: -0.14, y: 0, q: 4 },
          { x: 0.0, y: 0, q: -1 },
          { x: 0.14, y: 0, q: 4 }
        ]
      },
      quadrupole: {
        desc: 'Four alternating charges (+3, −3, +3, −3 μC) illustrate vector superposition: every charge sums three individual Coulomb vectors.',
        charges: [
          { x: -0.09, y: -0.07, q: 3 },
          { x: 0.09, y: -0.07, q: -3 },
          { x: 0.09, y: 0.07, q: 3 },
          { x: -0.09, y: 0.07, q: -3 }
        ]
      }
    };

    var state = {
      preset: 'dipole',
      medium: 'air',
      charges: [],
      selected: 0,
      showLines: true,
      showVectors: false,
      showEquipotentials: false,
      showProbe: false,
      motionActive: false,
      probe: { x: 0, y: -0.075 },
      dragTarget: null, // { type: 'charge', index } or { type: 'probe' }
      dragOffset: { x: 0, y: 0 }
    };

    var R_PX = 21;
    var view = null;
    view = SimKit.canvas2d(canvas, {
      onResize: function () {
        if (view) render(performance.now());
      }
    });

    function getPxPerMeter() {
      var w = view.width || 600;
      return clamp(w / 0.60, 520, 1060);
    }

    function toCanvas(xm, ym) {
      var s = getPxPerMeter();
      return {
        cx: view.width / 2 + xm * s,
        cy: view.height / 2 + ym * s
      };
    }

    function toWorld(cx, cy) {
      var s = getPxPerMeter();
      return {
        x: (cx - view.width / 2) / s,
        y: (cy - view.height / 2) / s
      };
    }

    function worldBounds() {
      var s = getPxPerMeter();
      var padPx = R_PX + 10;
      var maxX = Math.max(0.08, (view.width / 2 - padPx) / s);
      var maxY = Math.max(0.06, (view.height / 2 - padPx) / s);
      return { maxX: maxX, maxY: maxY };
    }

    function loadPreset(name) {
      var p = PRESETS[name] || PRESETS.dipole;
      state.preset = name;
      state.charges = p.charges.map(function (c, i) {
        return { id: i + 1, x: c.x, y: c.y, vx: 0, vy: 0, q: c.q };
      });
      state.selected = 0;
      state.motionActive = false;
      syncUI();
      render(performance.now());
    }

    function computeForces() {
      var er = MEDIUMS[state.medium].er;
      var n = state.charges.length;
      var forces = [];
      for (var i = 0; i < n; i++) {
        forces.push({ fx: 0, fy: 0, mag: 0 });
      }
      for (var a = 0; a < n; a++) {
        for (var b = a + 1; b < n; b++) {
          var ca = state.charges[a];
          var cb = state.charges[b];
          var dx = ca.x - cb.x;
          var dy = ca.y - cb.y;
          var r2 = dx * dx + dy * dy;
          var minR = 0.025;
          if (r2 < minR * minR) r2 = minR * minR;
          var r = Math.sqrt(r2);
          // Signed force on a due to b: positive q_a * q_b pushes along (ca - cb)
          var fSigned = (K * (ca.q * 1e-6) * (cb.q * 1e-6)) / (er * r2);
          var fx = fSigned * (dx / r);
          var fy = fSigned * (dy / r);
          forces[a].fx += fx;
          forces[a].fy += fy;
          forces[b].fx -= fx;
          forces[b].fy -= fy;
        }
      }
      for (var k = 0; k < n; k++) {
        forces[k].mag = Math.hypot(forces[k].fx, forces[k].fy);
      }
      return forces;
    }

    function fieldAndPotentialAt(xm, ym) {
      var er = MEDIUMS[state.medium].er;
      var ex = 0;
      var ey = 0;
      var pot = 0;
      for (var i = 0; i < state.charges.length; i++) {
        var c = state.charges[i];
        if (c.q === 0) continue;
        var dx = xm - c.x;
        var dy = ym - c.y;
        var r2 = dx * dx + dy * dy;
        if (r2 < 1e-5) r2 = 1e-5;
        var r = Math.sqrt(r2);
        var qC = c.q * 1e-6;
        var eMag = (K * qC) / (er * r2);
        ex += eMag * (dx / r);
        ey += eMag * (dy / r);
        pot += (K * qC) / (er * r);
      }
      return { ex: ex, ey: ey, eMag: Math.hypot(ex, ey), v: pot };
    }

    function stepPhysics(dt) {
      if (!state.motionActive) return;
      var forces = computeForces();
      var bounds = worldBounds();
      var s = getPxPerMeter();
      var minSep = (R_PX * 2.15) / s;
      // Scale acceleration so 1 N gives gentle, readable motion (~0.08 m/s²)
      var accelScale = 0.045;

      for (var i = 0; i < state.charges.length; i++) {
        var c = state.charges[i];
        c.vx = (c.vx + forces[i].fx * accelScale * dt) * 0.985;
        c.vy = (c.vy + forces[i].fy * accelScale * dt) * 0.985;
        var speed = Math.hypot(c.vx, c.vy);
        if (speed > 0.35) {
          c.vx = (c.vx / speed) * 0.35;
          c.vy = (c.vy / speed) * 0.35;
        }
        c.x += c.vx * dt;
        c.y += c.vy * dt;

        if (c.x < -bounds.maxX) { c.x = -bounds.maxX; c.vx = Math.abs(c.vx) * 0.65; }
        if (c.x > bounds.maxX) { c.x = bounds.maxX; c.vx = -Math.abs(c.vx) * 0.65; }
        if (c.y < -bounds.maxY) { c.y = -bounds.maxY; c.vy = Math.abs(c.vy) * 0.65; }
        if (c.y > bounds.maxY) { c.y = bounds.maxY; c.vy = -Math.abs(c.vy) * 0.65; }
      }

      // Prevent charges from overlapping on collision
      for (var a = 0; a < state.charges.length; a++) {
        for (var b = a + 1; b < state.charges.length; b++) {
          var ca = state.charges[a];
          var cb = state.charges[b];
          var dx = cb.x - ca.x;
          var dy = cb.y - ca.y;
          var d = Math.hypot(dx, dy);
          if (d < minSep && d > 1e-6) {
            var overlap = (minSep - d) * 0.5;
            var nx = dx / d;
            var ny = dy / d;
            ca.x -= nx * overlap;
            ca.y -= ny * overlap;
            cb.x += nx * overlap;
            cb.y += ny * overlap;
            ca.vx *= 0.4;
            ca.vy *= 0.4;
            cb.vx *= 0.4;
            cb.vy *= 0.4;
          }
        }
      }
    }

    function drawEquipotentials(ctx, W, H) {
      var step = 9;
      var cols = Math.ceil(W / step) + 1;
      var rows = Math.ceil(H / step) + 1;
      var grid = new Float32Array(cols * rows);

      for (var r = 0; r < rows; r++) {
        var py = r * step;
        for (var c = 0; c < cols; c++) {
          var px = c * step;
          var w = toWorld(px, py);
          grid[r * cols + c] = fieldAndPotentialAt(w.x, w.y).v;
        }
      }

      var levels = [-450e3, -200e3, -90e3, -35e3, 0, 35e3, 90e3, 200e3, 450e3];
      ctx.save();
      ctx.lineWidth = 1.15;

      for (var li = 0; li < levels.length; li++) {
        var lvl = levels[li];
        ctx.strokeStyle = lvl === 0
          ? 'rgba(226, 232, 240, 0.45)'
          : lvl > 0
            ? 'rgba(248, 113, 113, 0.36)'
            : 'rgba(56, 189, 248, 0.36)';
        if (lvl === 0) ctx.setLineDash([4, 4]);
        else ctx.setLineDash([]);

        ctx.beginPath();
        for (var ry = 0; ry < rows - 1; ry++) {
          for (var cx = 0; cx < cols - 1; cx++) {
            var v0 = grid[ry * cols + cx] - lvl;
            var v1 = grid[ry * cols + cx + 1] - lvl;
            var v2 = grid[(ry + 1) * cols + cx + 1] - lvl;
            var v3 = grid[(ry + 1) * cols + cx] - lvl;

            var pts = [];
            var x0 = cx * step;
            var y0 = ry * step;
            if ((v0 > 0) !== (v1 > 0)) pts.push([x0 + (step * v0) / (v0 - v1), y0]);
            if ((v1 > 0) !== (v2 > 0)) pts.push([x0 + step, y0 + (step * v1) / (v1 - v2)]);
            if ((v2 > 0) !== (v3 > 0)) pts.push([x0 + step - (step * v2) / (v2 - v3), y0 + step]);
            if ((v3 > 0) !== (v0 > 0)) pts.push([x0, y0 + step - (step * v3) / (v3 - v0)]);

            if (pts.length >= 2) {
              ctx.moveTo(pts[0][0], pts[0][1]);
              ctx.lineTo(pts[1][0], pts[1][1]);
              if (pts.length === 4) {
                ctx.moveTo(pts[2][0], pts[2][1]);
                ctx.lineTo(pts[3][0], pts[3][1]);
              }
            }
          }
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawFieldVectors(ctx, W, H) {
      var spacing = 38;
      ctx.save();
      for (var py = 26; py < H - 16; py += spacing) {
        for (var px = 26; px < W - 16; px += spacing) {
          var w = toWorld(px, py);
          var fp = fieldAndPotentialAt(w.x, w.y);
          if (fp.eMag < 10) continue;
          // Skip inside charge bodies
          var nearCharge = false;
          for (var i = 0; i < state.charges.length; i++) {
            var pos = toCanvas(state.charges[i].x, state.charges[i].y);
            if (Math.hypot(px - pos.cx, py - pos.cy) < R_PX + 8) {
              nearCharge = true;
              break;
            }
          }
          if (nearCharge) continue;

          var ux = fp.ex / fp.eMag;
          var uy = fp.ey / fp.eMag;
          var strength = clamp(Math.log10(1 + fp.eMag / 3e4) / 3.2, 0.2, 1);
          var len = 14 + strength * 7;
          var color = 'rgba(147, 197, 253, ' + (0.22 + strength * 0.52).toFixed(2) + ')';
          ctx.strokeStyle = color;
          ctx.fillStyle = color;
          ctx.lineWidth = 1.3;
          drawArrow(ctx, px - ux * len * 0.45, py - uy * len * 0.45, px + ux * len * 0.55, py + uy * len * 0.55, 5.5);
        }
      }
      ctx.restore();
    }

    function drawFieldLines(ctx, W, H) {
      var active = state.charges.filter(function (c) { return c.q !== 0; });
      if (!active.length) return;

      var hasPositive = active.some(function (c) { return c.q > 0; });
      var STEP_PX = 4.5;
      var MAX_STEPS = 240;
      var R_START = R_PX + 5;
      var R_STOP = R_PX + 2;
      var pxPerM = getPxPerMeter();

      function dirAtCanvas(px, py) {
        var w = toWorld(px, py);
        var fp = fieldAndPotentialAt(w.x, w.y);
        if (fp.eMag < 1e-6) return null;
        return [fp.ex / fp.eMag, fp.ey / fp.eMag];
      }

      function trace(sx, sy, fwd) {
        var pts = [[sx, sy]];
        var px = sx;
        var py = sy;
        var sign = fwd ? 1 : -1;
        for (var s = 0; s < MAX_STEPS; s++) {
          var d1 = dirAtCanvas(px, py);
          if (!d1) break;
          var mx = px + sign * d1[0] * (STEP_PX * 0.5);
          var my = py + sign * d1[1] * (STEP_PX * 0.5);
          var d2 = dirAtCanvas(mx, my);
          if (!d2) break;
          px += sign * d2[0] * STEP_PX;
          py += sign * d2[1] * STEP_PX;
          pts.push([px, py]);
          if (px < -16 || px > W + 16 || py < -16 || py > H + 16) break;
          var hit = false;
          for (var j = 0; j < active.length; j++) {
            var pos = toCanvas(active[j].x, active[j].y);
            if (Math.hypot(px - pos.cx, py - pos.cy) < R_STOP) {
              hit = true;
              break;
            }
          }
          if (hit) break;
        }
        return pts;
      }

      function strokeLine(pts, fwd) {
        if (pts.length < 3) return;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (var k = 1; k < pts.length; k++) {
          ctx.lineTo(pts[k][0], pts[k][1]);
        }
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.28)';
        ctx.lineWidth = 1.25;
        ctx.stroke();

        var ai = Math.floor(pts.length * 0.55);
        if (ai > 1 && ai < pts.length) {
          var p0 = pts[ai - 1];
          var p1 = pts[ai];
          var ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) + (fwd ? 0 : Math.PI);
          ctx.fillStyle = 'rgba(186, 230, 253, 0.58)';
          ctx.beginPath();
          ctx.moveTo(p1[0] + 4 * Math.cos(ang), p1[1] + 4 * Math.sin(ang));
          ctx.lineTo(p1[0] - 6 * Math.cos(ang - 0.45), p1[1] - 6 * Math.sin(ang - 0.45));
          ctx.lineTo(p1[0] - 6 * Math.cos(ang + 0.45), p1[1] - 6 * Math.sin(ang + 0.45));
          ctx.closePath();
          ctx.fill();
        }
      }

      for (var i = 0; i < active.length; i++) {
        var c = active[i];
        // If there are positive charges, seed from + charges forward; also seed negative charges backward if their magnitude exceeds + or if all are negative
        var shouldSeedFwd = c.q > 0;
        var shouldSeedBwd = !hasPositive && c.q < 0;
        if (!shouldSeedFwd && !shouldSeedBwd) continue;
        var fwd = shouldSeedFwd;
        var numLines = Math.min(18, 5 + Math.abs(c.q));
        var pos = toCanvas(c.x, c.y);
        for (var l = 0; l < numLines; l++) {
          var ang = (l / numLines) * TAU + (i * 0.23);
          var sx = pos.cx + Math.cos(ang) * R_START;
          var sy = pos.cy + Math.sin(ang) * R_START;
          // Ensure seed isn't trapped right next to another charge
          if (pxPerM > 0) strokeLine(trace(sx, sy, fwd), fwd);
        }
      }
    }

    function render(ts) {
      var W = view.width;
      var H = view.height;
      if (!W || !H) return;
      var ctx = view.ctx;
      var t = (ts || 0) / 1000;
      var med = MEDIUMS[state.medium];

      // Background & subtle grid
      var bgGrad = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.78);
      bgGrad.addColorStop(0, '#0f1c32');
      bgGrad.addColorStop(1, '#050b16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      if (med.tint) {
        ctx.fillStyle = med.tint;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
      ctx.lineWidth = 1;
      var gridStep = 36;
      for (var gx = (W / 2) % gridStep; gx < W; gx += gridStep) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (var gy = (H / 2) % gridStep; gy < H; gy += gridStep) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }

      if (state.showEquipotentials) drawEquipotentials(ctx, W, H);
      if (state.showVectors) drawFieldVectors(ctx, W, H);
      if (state.showLines) drawFieldLines(ctx, W, H);

      var forces = computeForces();

      // Draw distance ruler in 2-charge mode
      if (state.charges.length === 2) {
        var c0 = state.charges[0];
        var c1 = state.charges[1];
        var p0 = toCanvas(c0.x, c0.y);
        var p1 = toCanvas(c1.x, c1.y);
        var rMeters = Math.hypot(c1.x - c0.x, c1.y - c0.y);

        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.48)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(p0.cx, p0.cy);
        ctx.lineTo(p1.cx, p1.cy);
        ctx.stroke();
        ctx.restore();

        var midX = (p0.cx + p1.cx) / 2;
        var midY = (p0.cy + p1.cy) / 2;
        var ang = Math.atan2(p1.cy - p0.cy, p1.cx - p0.cx);
        var perpX = -Math.sin(ang) * 18;
        var perpY = Math.cos(ang) * 18;
        drawPill(ctx, 'r = ' + rMeters.toFixed(2) + ' m', midX + perpX, midY + perpY, {
          size: 11,
          bg: 'rgba(15, 23, 42, 0.88)',
          border: 'rgba(148, 163, 184, 0.35)',
          color: '#e2e8f0',
          maxW: W,
          maxH: H
        });
      }

      // Draw force arrows starting outside each sphere along exact force direction
      for (var i = 0; i < state.charges.length; i++) {
        var ch = state.charges[i];
        var f = forces[i];
        if (f.mag < 1e-5 || ch.q === 0) continue;

        var pos = toCanvas(ch.x, ch.y);
        var ux = f.fx / f.mag;
        var uy = f.fy / f.mag;
        var arrowLen = clamp(18 + 26 * Math.log10(1 + f.mag * 4), 18, 92);
        var sx = pos.cx + ux * (R_PX + 4);
        var sy = pos.cy + uy * (R_PX + 4);
        var ex = sx + ux * arrowLen;
        var ey = sy + uy * arrowLen;

        var arrowColor = '#fbbf24';
        if (state.charges.length === 2) {
          var prod = state.charges[0].q * state.charges[1].q;
          arrowColor = prod < 0 ? '#4ade80' : '#fb7185';
        }

        ctx.save();
        ctx.strokeStyle = arrowColor;
        ctx.fillStyle = arrowColor;
        ctx.lineWidth = 2.6;
        ctx.shadowColor = arrowColor;
        ctx.shadowBlur = 10;
        drawArrow(ctx, sx, sy, ex, ey, 9);
        ctx.restore();

        var lx = clamp(ex + ux * 24, 42, W - 42);
        var ly = clamp(ey + uy * 18, 18, H - 18);
        drawPill(ctx, 'F' + (i + 1) + ' = ' + formatForce(f.mag), lx, ly, {
          size: 10.5,
          bg: 'rgba(7, 17, 31, 0.9)',
          border: arrowColor,
          color: arrowColor,
          maxW: W,
          maxH: H
        });
      }

      // Draw charges
      for (var j = 0; j < state.charges.length; j++) {
        var c = state.charges[j];
        var p = toCanvas(c.x, c.y);
        var isSelected = j === state.selected;
        var rgb = c.q > 0 ? '239, 68, 68' : c.q < 0 ? '14, 165, 233' : '148, 163, 184';
        var core = c.q > 0 ? '#fecaca' : c.q < 0 ? '#bae6fd' : '#e2e8f0';
        var rim = c.q > 0 ? '#7f1d1d' : c.q < 0 ? '#0c4a6e' : '#334155';

        var pulse = reduceMotion ? 1 : 1 + Math.sin(t * 4.5 + j * 1.4) * 0.06;
        var glowR = (R_PX + Math.abs(c.q) * 3.5) * pulse;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        var glow = ctx.createRadialGradient(p.cx, p.cy, R_PX * 0.4, p.cx, p.cy, glowR);
        glow.addColorStop(0, 'rgba(' + rgb + ', 0.55)');
        glow.addColorStop(0.5, 'rgba(' + rgb + ', 0.14)');
        glow.addColorStop(1, 'rgba(' + rgb + ', 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, glowR, 0, TAU);
        ctx.fill();
        ctx.restore();

        if (isSelected) {
          ctx.save();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.arc(p.cx, p.cy, R_PX + 6, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }

        var sphere = ctx.createRadialGradient(p.cx - R_PX * 0.34, p.cy - R_PX * 0.34, 2, p.cx, p.cy, R_PX * 1.05);
        sphere.addColorStop(0, '#ffffff');
        sphere.addColorStop(0.18, core);
        sphere.addColorStop(0.55, 'rgb(' + rgb + ')');
        sphere.addColorStop(1, rim);
        ctx.fillStyle = sphere;
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, R_PX, 0, TAU);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, R_PX - 0.7, 0, TAU);
        ctx.stroke();

        ctx.font = '800 12.5px ' + FONT;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var label = c.q === 0 ? '0' : (c.q > 0 ? '+' : '−') + Math.abs(c.q) + 'μ';
        ctx.fillText(label, p.cx, p.cy + 0.5);
        ctx.textBaseline = 'alphabetic';

        ctx.font = '700 10.5px ' + FONT;
        ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
        ctx.fillText('q' + (j + 1), p.cx, p.cy + R_PX + 13);
      }

      // Optional draggable test probe (+1 μC)
      if (state.showProbe) {
        var pp = toCanvas(state.probe.x, state.probe.y);
        var fpProbe = fieldAndPotentialAt(state.probe.x, state.probe.y);

        if (fpProbe.eMag > 10) {
          var pux = fpProbe.ex / fpProbe.eMag;
          var puy = fpProbe.ey / fpProbe.eMag;
          var pLen = clamp(16 + 18 * Math.log10(1 + fpProbe.eMag / 5e4), 16, 68);
          ctx.save();
          ctx.strokeStyle = '#facc15';
          ctx.fillStyle = '#facc15';
          ctx.lineWidth = 2.2;
          drawArrow(ctx, pp.cx + pux * 11, pp.cy + puy * 11, pp.cx + pux * (11 + pLen), pp.cy + puy * (11 + pLen), 7.5);
          ctx.restore();
        }

        ctx.save();
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pp.cx, pp.cy, 8.5, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.font = '800 10px ' + FONT;
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', pp.cx, pp.cy + 0.5);
        ctx.restore();

        drawPill(ctx, 'E = ' + formatField(fpProbe.eMag) + ' · V = ' + formatPotential(fpProbe.v), pp.cx, pp.cy - 22, {
          size: 10,
          bg: 'rgba(15, 23, 42, 0.92)',
          border: '#facc15',
          color: '#fef08a',
          maxW: W,
          maxH: H
        });
      }

      // Medium badge
      if (med.er > 1) {
        drawPill(ctx, med.label, 12, 16, {
          align: 'left',
          size: 10.5,
          bg: 'rgba(15, 23, 42, 0.86)',
          border: '#38bdf8',
          color: '#bae6fd'
        });
      }

      // Scale bar bottom-left (0.10 m)
      var scalePx = 0.10 * getPxPerMeter();
      var sbX = 14;
      var sbY = H - 14;
      ctx.save();
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sbX, sbY - 4); ctx.lineTo(sbX, sbY);
      ctx.lineTo(sbX + scalePx, sbY); ctx.lineTo(sbX + scalePx, sbY - 4);
      ctx.stroke();
      ctx.font = '600 10px ' + FONT;
      ctx.fillStyle = 'rgba(203, 213, 225, 0.78)';
      ctx.textAlign = 'left';
      ctx.fillText('0.10 m scale', sbX, sbY - 7);
      ctx.restore();

      updateMetrics(forces);
    }

    function updateMetrics(forces) {
      var med = MEDIUMS[state.medium];
      var f1 = forces[0] ? forces[0].mag : 0;
      mForce.textContent = formatForce(f1);

      if (state.charges.length === 2) {
        var r = Math.hypot(state.charges[1].x - state.charges[0].x, state.charges[1].y - state.charges[0].y);
        var q1 = state.charges[0].q;
        var q2 = state.charges[1].q;
        mForceSub.textContent = '|F₁| = |F₂| (Newton’s 3rd Law)';
        mDist.textContent = r.toFixed(2) + ' m';
        mDistSub.textContent = formatCharge(q1) + ' & ' + formatCharge(q2);

        if (q1 === 0 || q2 === 0) {
          mMode.textContent = 'Zero Force';
          mModeSub.textContent = 'One charge is neutral (0 μC)';
        } else if (q1 * q2 < 0) {
          mMode.textContent = 'Attractive';
          mModeSub.textContent = 'Opposite signs pull inward';
        } else {
          mMode.textContent = 'Repulsive';
          mModeSub.textContent = 'Like signs push outward';
        }
      } else {
        var maxF = forces.reduce(function (m, item) { return Math.max(m, item.mag); }, 0);
        var minDist = Infinity;
        for (var a = 0; a < state.charges.length; a++) {
          for (var b = a + 1; b < state.charges.length; b++) {
            var d = Math.hypot(state.charges[a].x - state.charges[b].x, state.charges[a].y - state.charges[b].y);
            if (d < minDist) minDist = d;
          }
        }
        mForceSub.textContent = 'Max net force: ' + formatForce(maxF);
        mDist.textContent = (isFinite(minDist) ? minDist.toFixed(2) : '0.00') + ' m';
        mDistSub.textContent = state.charges.length + ' charges active (min pair r)';
        var selF = forces[state.selected] ? forces[state.selected].mag : f1;
        mMode.textContent = selF < 0.02 ? 'Near Equilibrium' : 'Superposition';
        mModeSub.textContent = 'Vector sum on q' + (state.selected + 1) + ': ' + formatForce(selF);
      }

      if (state.showProbe) {
        var fp = fieldAndPotentialAt(state.probe.x, state.probe.y);
        mField.textContent = formatField(fp.eMag);
        mFieldSub.textContent = 'Probe potential: ' + formatPotential(fp.v);
      } else {
        mField.textContent = 'εᵣ = ' + med.er;
        mFieldSub.textContent = med.er === 1 ? 'Full vacuum/air force' : 'Force reduced ' + med.er + '×';
      }

      var presetObj = PRESETS[state.preset];
      if (state.charges.length === 2) {
        var c0 = state.charges[0];
        var c1 = state.charges[1];
        var dist = Math.hypot(c1.x - c0.x, c1.y - c0.y);
        var relText = c0.q === 0 || c1.q === 0
          ? 'With a 0 μC neutral charge, the electric force drops to zero.'
          : c0.q * c1.q < 0
            ? 'Opposite signs attract: both charges feel an equal ' + formatForce(f1) + ' inward pull.'
            : 'Like signs repel: both charges feel an equal ' + formatForce(f1) + ' outward push.';
        readoutEl.innerHTML =
          '<strong>Live model (' + med.label + '):</strong> ' + relText +
          ' At <em>r</em> = ' + dist.toFixed(2) + ' m, halving distance would multiply force by 4×; doubling distance divides it by 4.' +
          (med.er > 1 ? ' This dielectric medium weakens electric force by a factor of ' + med.er + '.' : '');
      } else {
        var sel = state.charges[state.selected];
        var selForce = forces[state.selected] ? forces[state.selected].mag : 0;
        readoutEl.innerHTML =
          '<strong>Superposition mode (' + state.charges.length + ' charges):</strong> ' +
          (presetObj ? presetObj.desc + ' ' : '') +
          'Selected <strong>q' + (state.selected + 1) + ' (' + formatCharge(sel.q) + ')</strong> currently experiences a net vector force of <strong>' + formatForce(selForce) + '</strong>.';
      }
    }

    function syncUI() {
      presetBtns.forEach(function (btn) {
        btn.setAttribute('aria-pressed', btn.dataset.clPreset === state.preset ? 'true' : 'false');
      });
      mediumBtns.forEach(function (btn) {
        btn.setAttribute('aria-pressed', btn.dataset.clMedium === state.medium ? 'true' : 'false');
      });
      layerLinesBtn.setAttribute('aria-pressed', state.showLines ? 'true' : 'false');
      layerVecBtn.setAttribute('aria-pressed', state.showVectors ? 'true' : 'false');
      layerEqBtn.setAttribute('aria-pressed', state.showEquipotentials ? 'true' : 'false');
      layerProbeBtn.setAttribute('aria-pressed', state.showProbe ? 'true' : 'false');
      motionBtn.setAttribute('aria-pressed', state.motionActive ? 'true' : 'false');
      motionBtn.textContent = state.motionActive ? 'Pause motion' : 'Release motion';

      // Rebuild charge selector tabs
      chargeTabsEl.innerHTML = '';
      state.charges.forEach(function (c, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cl-charge-tab';
        btn.textContent = 'q' + (i + 1) + ' (' + (c.q > 0 ? '+' : c.q < 0 ? '−' : '') + Math.abs(c.q) + ')';
        btn.setAttribute('aria-pressed', i === state.selected ? 'true' : 'false');
        btn.addEventListener('click', function () {
          state.selected = i;
          syncUI();
          render(performance.now());
        });
        chargeTabsEl.appendChild(btn);
      });

      var activeCharge = state.charges[state.selected] || state.charges[0];
      qSliderLabel.textContent = 'Selected q' + (state.selected + 1) + ' charge';
      qSlider.value = activeCharge.q;
      qSliderOut.textContent = formatCharge(activeCharge.q);
      if (qSlider.dispatchEvent) qSlider.dispatchEvent(new Event('change'));

      addChargeBtn.disabled = state.charges.length >= 4;
      removeChargeBtn.disabled = state.charges.length <= 2;
    }

    // Pointer interaction on canvas
    function canvasCoords(e) {
      var rect = canvas.getBoundingClientRect();
      return {
        cx: e.clientX - rect.left,
        cy: e.clientY - rect.top
      };
    }

    canvas.addEventListener('pointerdown', function (e) {
      var pt = canvasCoords(e);
      if (state.showProbe) {
        var pp = toCanvas(state.probe.x, state.probe.y);
        if (Math.hypot(pt.cx - pp.cx, pt.cy - pp.cy) <= 18) {
          state.dragTarget = { type: 'probe' };
          var pw = toWorld(pt.cx, pt.cy);
          state.dragOffset = { x: state.probe.x - pw.x, y: state.probe.y - pw.y };
          canvas.classList.add('is-dragging');
          if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
          return;
        }
      }

      var bestIdx = -1;
      var bestDist = R_PX + 12;
      for (var i = 0; i < state.charges.length; i++) {
        var cp = toCanvas(state.charges[i].x, state.charges[i].y);
        var d = Math.hypot(pt.cx - cp.cx, pt.cy - cp.cy);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        state.selected = bestIdx;
        state.dragTarget = { type: 'charge', index: bestIdx };
        var cw = toWorld(pt.cx, pt.cy);
        state.dragOffset = {
          x: state.charges[bestIdx].x - cw.x,
          y: state.charges[bestIdx].y - cw.y
        };
        state.charges[bestIdx].vx = 0;
        state.charges[bestIdx].vy = 0;
        canvas.classList.add('is-dragging');
        if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
        syncUI();
        render(performance.now());
      }
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!state.dragTarget) return;
      var pt = canvasCoords(e);
      var w = toWorld(pt.cx, pt.cy);
      var bounds = worldBounds();
      var nx = clamp(w.x + state.dragOffset.x, -bounds.maxX, bounds.maxX);
      var ny = clamp(w.y + state.dragOffset.y, -bounds.maxY, bounds.maxY);

      if (state.dragTarget.type === 'probe') {
        state.probe.x = nx;
        state.probe.y = ny;
      } else {
        var ch = state.charges[state.dragTarget.index];
        if (ch) {
          ch.x = nx;
          ch.y = ny;
          ch.vx = 0;
          ch.vy = 0;
        }
      }
      render(performance.now());
    });

    function stopDrag() {
      state.dragTarget = null;
      canvas.classList.remove('is-dragging');
    }
    canvas.addEventListener('pointerup', stopDrag);
    canvas.addEventListener('pointercancel', stopDrag);

    // Keyboard movement for accessibility
    canvas.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 0.03 : 0.01;
      var ch = state.charges[state.selected];
      if (!ch) return;
      var bounds = worldBounds();
      var moved = true;
      if (e.key === 'ArrowLeft') ch.x = clamp(ch.x - step, -bounds.maxX, bounds.maxX);
      else if (e.key === 'ArrowRight') ch.x = clamp(ch.x + step, -bounds.maxX, bounds.maxX);
      else if (e.key === 'ArrowUp') ch.y = clamp(ch.y - step, -bounds.maxY, bounds.maxY);
      else if (e.key === 'ArrowDown') ch.y = clamp(ch.y + step, -bounds.maxY, bounds.maxY);
      else moved = false;

      if (moved) {
        e.preventDefault();
        render(performance.now());
      }
    });

    presetBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        loadPreset(btn.dataset.clPreset);
      });
    });

    mediumBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.medium = btn.dataset.clMedium;
        syncUI();
        render(performance.now());
      });
    });

    layerLinesBtn.addEventListener('click', function () {
      state.showLines = !state.showLines;
      syncUI();
      render(performance.now());
    });

    layerVecBtn.addEventListener('click', function () {
      state.showVectors = !state.showVectors;
      syncUI();
      render(performance.now());
    });

    layerEqBtn.addEventListener('click', function () {
      state.showEquipotentials = !state.showEquipotentials;
      syncUI();
      render(performance.now());
    });

    layerProbeBtn.addEventListener('click', function () {
      state.showProbe = !state.showProbe;
      syncUI();
      render(performance.now());
    });

    motionBtn.addEventListener('click', function () {
      state.motionActive = !state.motionActive;
      syncUI();
    });

    resetBtn.addEventListener('click', function () {
      loadPreset(state.preset);
    });

    qSlider.addEventListener('input', function () {
      var ch = state.charges[state.selected];
      if (!ch) return;
      ch.q = parseInt(qSlider.value, 10);
      syncUI();
      render(performance.now());
    });

    flipSignBtn.addEventListener('click', function () {
      var ch = state.charges[state.selected];
      if (!ch) return;
      ch.q = ch.q === 0 ? 2 : -ch.q;
      syncUI();
      render(performance.now());
    });

    zeroChargeBtn.addEventListener('click', function () {
      var ch = state.charges[state.selected];
      if (!ch) return;
      ch.q = 0;
      syncUI();
      render(performance.now());
    });

    addChargeBtn.addEventListener('click', function () {
      if (state.charges.length >= 4) return;
      var idx = state.charges.length;
      var offsets = [
        { x: 0, y: -0.07, q: 3 },
        { x: 0, y: 0.07, q: -3 }
      ];
      var spec = offsets[(idx - 2) % offsets.length];
      state.charges.push({ id: idx + 1, x: spec.x, y: spec.y, vx: 0, vy: 0, q: spec.q });
      state.selected = idx;
      state.preset = '';
      syncUI();
      render(performance.now());
    });

    removeChargeBtn.addEventListener('click', function () {
      if (state.charges.length <= 2) return;
      state.charges.splice(state.selected, 1);
      state.selected = Math.min(state.selected, state.charges.length - 1);
      state.preset = '';
      syncUI();
      render(performance.now());
    });

    loadPreset('dipole');

    SimKit.loop(function (dt, ts) {
      stepPhysics(dt);
      render(ts);
    }, { el: canvas, maxDt: 0.05 });
  }

  /* ───────────────────────────────────────────────────────────
     2. Inverse-Square Law Explorer
     ─────────────────────────────────────────────────────────── */
  function initInverseSquareLab() {
    var canvas = document.getElementById('cl-inv-canvas');
    if (!canvas) return;

    var multBtns = Array.from(document.querySelectorAll('[data-inv-mult]'));
    var compareBtn = document.getElementById('cl-inv-compare-1r');
    var rSlider = document.getElementById('cl-inv-r');
    var qSlider = document.getElementById('cl-inv-qprod');
    var rOut = document.getElementById('cl-inv-r-out');
    var qOut = document.getElementById('cl-inv-qprod-out');

    var mDist = document.getElementById('cl-inv-m-dist');
    var mRatio = document.getElementById('cl-inv-m-ratio');
    var mForce = document.getElementById('cl-inv-m-force');
    var mFactor = document.getElementById('cl-inv-m-factor');
    var readoutEl = document.getElementById('cl-inv-readout');

    var R0 = 0.12;
    var R_MIN = 0.05;
    var R_MAX = 0.54;

    var state = {
      r: 0.24,
      qProd: 4, // |q1 * q2| in μC²
      compareLinearInv: false,
      dragging: false
    };

    var view = null;
    view = SimKit.canvas2d(canvas, {
      onResize: function () { if (view) render(); }
    });

    function forceAt(r, qProd) {
      return K * (qProd * 1e-12) / (r * r);
    }

    function graphBounds() {
      var W = view.width || 600;
      var H = view.height || 310;
      var stripH = 68;
      return {
        W: W,
        H: H,
        stripH: stripH,
        left: 58,
        right: W - 24,
        top: stripH + 22,
        bottom: H - 36
      };
    }

    function render() {
      var W = view.width;
      var H = view.height;
      if (!W || !H) return;
      var ctx = view.ctx;
      var g = graphBounds();
      var f0 = forceAt(R0, state.qProd);
      var fNow = forceAt(state.r, state.qProd);
      var fMaxPlot = f0 * 4.5; // accommodates ½ r₀ = 4 F₀ cleanly

      ctx.fillStyle = '#07111f';
      ctx.fillRect(0, 0, W, H);

      // Top 1D spatial preview strip
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, W, g.stripH);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.beginPath();
      ctx.moveTo(0, g.stripH);
      ctx.lineTo(W, g.stripH);
      ctx.stroke();

      var trackL = g.left + 12;
      var trackR = g.right - 22;
      var trackY = g.stripH * 0.54;
      var frac = (state.r - R_MIN) / (R_MAX - R_MIN);
      var spanPx = 38 + frac * (trackR - trackL - 56);
      var xLeft = trackL + 16;
      var xRight = xLeft + spanPx;

      // Ruler line
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(xLeft, trackY);
      ctx.lineTo(xRight, trackY);
      ctx.stroke();
      ctx.restore();

      // Force arrows on top strip
      var arrLen = clamp(12 + 24 * (fNow / f0), 8, 48);
      ctx.save();
      ctx.strokeStyle = '#fb7185';
      ctx.fillStyle = '#fb7185';
      ctx.lineWidth = 2.2;
      drawArrow(ctx, xLeft - 14, trackY, xLeft - 14 - arrLen, trackY, 7);
      drawArrow(ctx, xRight + 14, trackY, xRight + 14 + arrLen, trackY, 7);
      ctx.restore();

      // Two charges on top strip
      [[xLeft, 'q₁'], [xRight, 'q₂']].forEach(function (item) {
        var cx = item[0];
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cx, trackY, 12, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.font = '800 10px ' + FONT;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item[1], cx, trackY + 0.5);
        ctx.textBaseline = 'alphabetic';
      });

      drawPill(ctx, 'r = ' + state.r.toFixed(2) + ' m  →  F = ' + formatForce(fNow), (xLeft + xRight) / 2, 16, {
        size: 10.5,
        bg: 'rgba(15, 23, 42, 0.92)',
        border: 'rgba(251, 191, 36, 0.5)',
        color: '#fde68a',
        maxW: W
      });

      // Plot grid
      var plotW = g.right - g.left;
      var plotH = g.bottom - g.top;
      function xOf(r) { return g.left + ((r - R_MIN) / (R_MAX - R_MIN)) * plotW; }
      function yOf(f) { return g.bottom - clamp(f / fMaxPlot, 0, 1.05) * plotH; }

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 1;
      for (var rt = 0.1; rt <= 0.51; rt += 0.1) {
        var gx = xOf(rt);
        ctx.beginPath(); ctx.moveTo(gx, g.top); ctx.lineTo(gx, g.bottom); ctx.stroke();
        ctx.font = '600 10px ' + FONT;
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText(rt.toFixed(1) + ' m', gx, g.bottom + 16);
      }

      var yTicks = [
        { mult: 1, label: '1 F₀' },
        { mult: 2, label: '2 F₀' },
        { mult: 4, label: '4 F₀' }
      ];
      yTicks.forEach(function (tk) {
        var gy = yOf(f0 * tk.mult);
        ctx.beginPath(); ctx.moveTo(g.left, gy); ctx.lineTo(g.right, gy); ctx.stroke();
        ctx.font = '600 10px ' + FONT;
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'right';
        ctx.fillText(tk.label, g.left - 8, gy + 3);
      });

      // Axes
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(g.left, g.top);
      ctx.lineTo(g.left, g.bottom);
      ctx.lineTo(g.right, g.bottom);
      ctx.stroke();

      ctx.font = '700 10.5px ' + FONT;
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'center';
      ctx.fillText('Distance r (meters) — drag across curve', (g.left + g.right) / 2, H - 6);

      // Optional 1/r comparison curve
      if (state.compareLinearInv) {
        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (var s = 0; s <= 120; s++) {
          var rs = R_MIN + (s / 120) * (R_MAX - R_MIN);
          var fLin = f0 * (R0 / rs);
          var px = xOf(rs);
          var py = yOf(fLin);
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Main 1/r² curve + fill
      ctx.save();
      ctx.beginPath();
      var firstX = xOf(R_MIN);
      ctx.moveTo(firstX, g.bottom);
      for (var k = 0; k <= 140; k++) {
        var rk = R_MIN + (k / 140) * (R_MAX - R_MIN);
        ctx.lineTo(xOf(rk), yOf(forceAt(rk, state.qProd)));
      }
      ctx.lineTo(xOf(R_MAX), g.bottom);
      ctx.closePath();
      var areaGrad = ctx.createLinearGradient(0, g.top, 0, g.bottom);
      areaGrad.addColorStop(0, 'rgba(251, 191, 36, 0.25)');
      areaGrad.addColorStop(1, 'rgba(251, 191, 36, 0.02)');
      ctx.fillStyle = areaGrad;
      ctx.fill();

      ctx.beginPath();
      for (var m = 0; m <= 140; m++) {
        var rm = R_MIN + (m / 140) * (R_MAX - R_MIN);
        var mx = xOf(rm);
        var my = yOf(forceAt(rm, state.qProd));
        if (m === 0) ctx.moveTo(mx, my);
        else ctx.lineTo(mx, my);
      }
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.8;
      ctx.stroke();
      ctx.restore();

      // Baseline marker (r0, F0)
      var bx = xOf(R0);
      var by = yOf(f0);
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.beginPath();
      ctx.moveTo(bx, g.bottom);
      ctx.lineTo(bx, by);
      ctx.lineTo(g.left, by);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, TAU);
      ctx.fill();
      drawPill(ctx, 'Baseline r₀ = 0.12 m', bx + 54, by - 14, {
        size: 9.5,
        bg: 'rgba(15, 23, 42, 0.88)',
        border: '#38bdf8',
        color: '#bae6fd',
        maxW: W
      });

      // Current active dot
      var ax = xOf(state.r);
      var ay = yOf(fNow);
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
      ctx.beginPath();
      ctx.moveTo(ax, g.bottom);
      ctx.lineTo(ax, ay);
      ctx.lineTo(g.left, ay);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#07111f';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ax, ay, 7.5, 0, TAU);
      ctx.fill();
      ctx.stroke();

      var factor = fNow / f0;
      var factorStr = factor >= 1 ? factor.toFixed(2) + '× F₀' : (1 / factor).toFixed(1) + '× smaller';
      drawPill(ctx, formatForce(fNow) + ' (' + factorStr + ')', ax, ay - 22, {
        size: 10,
        bg: 'rgba(15, 23, 42, 0.94)',
        border: '#fbbf24',
        color: '#fef08a',
        maxW: W,
        maxH: H
      });

      if (state.compareLinearInv) {
        drawPill(ctx, 'Dashed violet = 1/r · Solid gold = 1/r²', g.right - 10, g.top + 14, {
          align: 'right',
          size: 9.5,
          bg: 'rgba(15, 23, 42, 0.9)',
          border: '#a78bfa',
          color: '#ddd6fe'
        });
      }

      updateReadouts(f0, fNow);
    }

    function updateReadouts(f0, fNow) {
      var ratio = state.r / R0;
      var factor = fNow / f0;

      rOut.textContent = state.r.toFixed(2) + ' m';
      qOut.textContent = state.qProd + ' μC²';
      mDist.textContent = state.r.toFixed(2) + ' m';
      mRatio.textContent = ratio.toFixed(2) + '× r₀';
      mForce.textContent = formatForce(fNow);
      mFactor.textContent = factor >= 0.995 ? factor.toFixed(2) + '× F₀' : '1 / ' + (1 / factor).toFixed(1) + ' F₀';

      multBtns.forEach(function (btn) {
        var mult = parseFloat(btn.dataset.invMult);
        var match = Math.abs(state.r - R0 * mult) < 0.004;
        btn.setAttribute('aria-pressed', match ? 'true' : 'false');
      });
      compareBtn.setAttribute('aria-pressed', state.compareLinearInv ? 'true' : 'false');

      var factorPhrase = Math.abs(ratio - 2) < 0.04
        ? 'Doubling the distance to 0.24 m drops the force to <strong>1/4</strong> (' + formatForce(fNow) + ').'
        : Math.abs(ratio - 3) < 0.04
          ? 'Tripling the distance to 0.36 m drops the force to <strong>1/9</strong> (' + formatForce(fNow) + ').'
          : Math.abs(ratio - 0.5) < 0.04
            ? 'Halving the distance to 0.06 m multiplies the force by <strong>4×</strong> (' + formatForce(fNow) + ').'
            : 'At <strong>' + ratio.toFixed(2) + '×</strong> the baseline distance, the squared denominator gives <strong>' + factor.toFixed(3) + '×</strong> the baseline force.';

      readoutEl.innerHTML = '<strong>Inverse-square check:</strong> ' + factorPhrase +
        ' Changing |q₁·q₂| to ' + state.qProd + ' μC² scales the entire curve proportionally.';
    }

    function scrubFromPointer(e) {
      var rect = canvas.getBoundingClientRect();
      var g = graphBounds();
      var px = e.clientX - rect.left;
      var norm = clamp((px - g.left) / (g.right - g.left), 0, 1);
      state.r = Math.round((R_MIN + norm * (R_MAX - R_MIN)) * 100) / 100;
      rSlider.value = state.r;
      if (rSlider.dispatchEvent) rSlider.dispatchEvent(new Event('change'));
      render();
    }

    canvas.addEventListener('pointerdown', function (e) {
      state.dragging = true;
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      scrubFromPointer(e);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (state.dragging) scrubFromPointer(e);
    });
    canvas.addEventListener('pointerup', function () { state.dragging = false; });
    canvas.addEventListener('pointercancel', function () { state.dragging = false; });

    multBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mult = parseFloat(btn.dataset.invMult);
        state.r = Math.round(R0 * mult * 100) / 100;
        rSlider.value = state.r;
        if (rSlider.dispatchEvent) rSlider.dispatchEvent(new Event('change'));
        render();
      });
    });

    compareBtn.addEventListener('click', function () {
      state.compareLinearInv = !state.compareLinearInv;
      render();
    });

    rSlider.addEventListener('input', function () {
      state.r = parseFloat(rSlider.value);
      render();
    });

    qSlider.addEventListener('input', function () {
      state.qProd = parseInt(qSlider.value, 10);
      render();
    });

    render();
  }

  /* ───────────────────────────────────────────────────────────
     3. Coulomb's 1785 Torsion Balance Lab
     ─────────────────────────────────────────────────────────── */
  function initTorsionLab() {
    var canvas = document.getElementById('cl-torsion-canvas');
    if (!canvas) return;

    var trialBtns = Array.from(document.querySelectorAll('[data-torsion-trial]'));
    var dialSlider = document.getElementById('cl-torsion-dial');
    var dialOut = document.getElementById('cl-torsion-dial-out');
    var splitBtn = document.getElementById('cl-torsion-split');
    var resetBtn = document.getElementById('cl-torsion-reset');

    var mAlpha = document.getElementById('cl-tor-m-alpha');
    var mTwist = document.getElementById('cl-tor-m-twist');
    var mCharge = document.getElementById('cl-tor-m-charge');
    var mConst = document.getElementById('cl-tor-m-const');
    var readoutEl = document.getElementById('cl-torsion-readout');

    // Calibrated so at qFrac=1 and dial=0°, equilibrium α = 36° (total twist = 36°)
    var C_CAL = 36 * Math.pow(2 * Math.sin((36 * Math.PI) / 360), 2);

    var state = {
      dialDeg: 0,
      qFrac: 1,
      alpha: 36,
      targetAlpha: 36,
      vel: 0,
      touchTimer: 0
    };

    var view = null;
    view = SimKit.canvas2d(canvas, {
      onResize: function () { if (view) render(); }
    });

    function solveEquilibrium(dialDeg, qFrac) {
      if (qFrac <= 0) return 0;
      var lo = 2;
      var hi = 160;
      for (var iter = 0; iter < 36; iter++) {
        var mid = (lo + hi) * 0.5;
        var chord = 2 * Math.sin((mid * Math.PI) / 360);
        var elec = (C_CAL * qFrac) / (chord * chord);
        var rest = dialDeg + mid;
        if (elec > rest) lo = mid;
        else hi = mid;
      }
      return (lo + hi) * 0.5;
    }

    function updateTarget() {
      state.targetAlpha = solveEquilibrium(state.dialDeg, state.qFrac);
      if (reduceMotion) state.alpha = state.targetAlpha;
      syncReadouts();
    }

    function syncReadouts() {
      var eqAlpha = state.targetAlpha;
      var totalTwist = state.dialDeg + eqAlpha;
      var chord = 2 * Math.sin((eqAlpha * Math.PI) / 360);
      var kProd = totalTwist * chord * chord;

      dialOut.textContent = state.dialDeg + '°';
      mAlpha.textContent = eqAlpha.toFixed(1) + '°';
      mTwist.textContent = totalTwist.toFixed(1) + '°';
      mCharge.textContent = state.qFrac === 1 ? 'q (100%)' : state.qFrac === 0.5 ? 'q / 2 (50%)' : 'q / 4 (25%)';
      mConst.textContent = kProd.toFixed(2);

      trialBtns.forEach(function (btn) {
        var d = parseInt(btn.dataset.torsionDial, 10);
        btn.setAttribute('aria-pressed', state.qFrac === 1 && state.dialDeg === d ? 'true' : 'false');
      });

      splitBtn.disabled = state.qFrac <= 0.25;
      readoutEl.innerHTML =
        '<strong>1785 Experiment Readout:</strong> With top micrometer twist at <strong>' + state.dialDeg + '°</strong> and charge <strong>' +
        mCharge.textContent + '</strong>, the pith balls settle at separation <strong>α = ' + eqAlpha.toFixed(1) + '°</strong>. Total wire twist = ' +
        state.dialDeg + '° + ' + eqAlpha.toFixed(1) + '° = <strong>' + totalTwist.toFixed(1) + '°</strong> (proportional to electric force).';
    }

    function render() {
      var W = view.width;
      var H = view.height;
      if (!W || !H) return;
      var ctx = view.ctx;

      ctx.fillStyle = '#07111f';
      ctx.fillRect(0, 0, W, H);

      var leftCx = W * 0.34;
      var rightCx = W * 0.78;
      var cy = H * 0.53;
      var chamberR = Math.min(W * 0.27, H * 0.41);

      // Left: Glass Cylinder Top-Down View
      ctx.save();
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.42)';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.beginPath();
      ctx.arc(leftCx, cy, chamberR, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // Degree tick marks around cylinder
      for (var deg = 0; deg < 360; deg += 15) {
        var rad = (deg - 90) * (Math.PI / 180);
        var inner = deg % 45 === 0 ? chamberR - 10 : chamberR - 5;
        ctx.strokeStyle = deg % 45 === 0 ? 'rgba(203, 213, 225, 0.6)' : 'rgba(148, 163, 184, 0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftCx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
        ctx.lineTo(leftCx + Math.cos(rad) * chamberR, cy + Math.sin(rad) * chamberR);
        ctx.stroke();
      }

      var armR = chamberR * 0.68;
      var fixedAng = -Math.PI / 2; // 0° top
      var alphaRad = (state.alpha * Math.PI) / 180;
      var freeAng = fixedAng + alphaRad;

      // Angle arc for α
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(leftCx, cy, armR * 0.5, fixedAng, freeAng);
      ctx.stroke();

      // Insulating rod & counterweight
      var bx = leftCx + Math.cos(freeAng) * armR;
      var by = cy + Math.sin(freeAng) * armR;
      var cwx = leftCx - Math.cos(freeAng) * (armR * 0.62);
      var cwy = cy - Math.sin(freeAng) * (armR * 0.62);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(cwx, cwy);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // Counterweight
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(cwx, cwy, 5.5, 0, TAU);
      ctx.fill();

      // Central silver torsion wire anchor
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(leftCx, cy, 4.5, 0, TAU);
      ctx.fill();

      // Fixed sphere A
      var ax = leftCx + Math.cos(fixedAng) * armR;
      var ay = cy + Math.sin(fixedAng) * armR;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(ax, ay, 9, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#fecaca';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Suspended pith ball B
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(bx, by, 9, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#fed7aa';
      ctx.stroke();

      // Neutral grounding sphere animation when splitting charge
      if (state.touchTimer > 0) {
        var tx = ax - 20 * Math.sin(state.touchTimer * Math.PI);
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(tx, ay - 6, 8, 0, TAU);
        ctx.fill();
        drawPill(ctx, 'q shared (÷ 2)', tx - 38, ay - 16, {
          size: 9.5,
          bg: 'rgba(15, 23, 42, 0.9)',
          border: '#94a3b8',
          color: '#e2e8f0'
        });
      }

      ctx.font = '700 10.5px ' + FONT;
      ctx.fillStyle = '#fecaca';
      ctx.textAlign = 'center';
      ctx.fillText('A (fixed)', ax, ay - 14);
      ctx.fillStyle = '#fed7aa';
      ctx.fillText('B (free)', bx + 20, by + 18);

      drawPill(ctx, 'α = ' + state.alpha.toFixed(1) + '°', leftCx + 24, cy - armR * 0.62, {
        size: 10.5,
        bg: 'rgba(15, 23, 42, 0.9)',
        border: '#fbbf24',
        color: '#fde68a'
      });

      ctx.font = '700 11px ' + FONT;
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('Glass Cylinder (Top View)', leftCx, 22);

      // Right: Micrometer Head Dial
      var dialR = Math.min(W * 0.16, H * 0.28);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rightCx, cy, dialR, 0, TAU);
      ctx.fill();
      ctx.stroke();

      var dialRad = (state.dialDeg - 90) * (Math.PI / 180);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rightCx, cy);
      ctx.lineTo(rightCx + Math.cos(dialRad) * (dialR - 6), cy + Math.sin(dialRad) * (dialR - 6));
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(rightCx, cy, 5, 0, TAU);
      ctx.fill();

      ctx.font = '700 11px ' + FONT;
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'center';
      ctx.fillText('Top Micrometer Dial', rightCx, 22);

      drawPill(ctx, 'Dial: ' + state.dialDeg + '°', rightCx, cy + dialR + 22, {
        size: 10.5,
        bg: 'rgba(15, 23, 42, 0.9)',
        border: '#38bdf8',
        color: '#bae6fd'
      });

      ctx.font = '600 10.5px ' + FONT;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Total twist = ' + (state.dialDeg + state.alpha).toFixed(1) + '°', rightCx, cy + dialR + 42);
      ctx.restore();
    }

    trialBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.qFrac = 1;
        state.dialDeg = parseInt(btn.dataset.torsionDial, 10);
        dialSlider.value = state.dialDeg;
        if (dialSlider.dispatchEvent) dialSlider.dispatchEvent(new Event('change'));
        updateTarget();
      });
    });

    dialSlider.addEventListener('input', function () {
      state.dialDeg = parseInt(dialSlider.value, 10);
      updateTarget();
    });

    splitBtn.addEventListener('click', function () {
      if (state.qFrac <= 0.25) return;
      state.qFrac *= 0.5;
      state.touchTimer = 1;
      updateTarget();
    });

    resetBtn.addEventListener('click', function () {
      state.qFrac = 1;
      state.dialDeg = 0;
      dialSlider.value = 0;
      if (dialSlider.dispatchEvent) dialSlider.dispatchEvent(new Event('change'));
      updateTarget();
    });

    updateTarget();
    state.alpha = state.targetAlpha;
    render();

    SimKit.loop(function (dt) {
      if (state.touchTimer > 0) {
        state.touchTimer = Math.max(0, state.touchTimer - dt * 1.4);
      }
      if (!reduceMotion) {
        var diff = state.targetAlpha - state.alpha;
        state.vel = (state.vel + diff * 36 * dt) * Math.exp(-5.5 * dt);
        state.alpha += state.vel * dt;
      } else {
        state.alpha = state.targetAlpha;
      }
      render();
    }, { el: canvas, maxDt: 0.05 });
  }

  /* ───────────────────────────────────────────────────────────
     4. Coulomb vs. Gravity Scale Lab
     ─────────────────────────────────────────────────────────── */
  function initScaleLab() {
    var canvas = document.getElementById('cl-scale-canvas');
    if (!canvas) return;

    var btns = Array.from(document.querySelectorAll('[data-scale-id]'));
    var mFe = document.getElementById('cl-scale-fe');
    var mFg = document.getElementById('cl-scale-fg');
    var mRatio = document.getElementById('cl-scale-ratio');
    var mRule = document.getElementById('cl-scale-rule');
    var readoutEl = document.getElementById('cl-scale-readout');

    var SCENARIOS = {
      hydrogen: {
        title: 'Hydrogen Atom (1 Proton + 1 Electron)',
        fe: K * Math.pow(1.602e-19, 2) / Math.pow(5.29e-11, 2),
        fg: G * 1.673e-27 * 9.109e-31 / Math.pow(5.29e-11, 2),
        dominant: 'Electric Force',
        note: 'Inside an atom, Coulomb attraction is over 10³⁹ times stronger than gravity — which is why chemistry and atomic structure are purely electrical.'
      },
      balloons: {
        title: 'Two Rubbed Party Balloons (0.5 μC, 3 g at 0.20 m)',
        fe: K * Math.pow(0.5e-6, 2) / (0.20 * 0.20),
        fg: G * 0.003 * 0.003 / (0.20 * 0.20),
        dominant: 'Electric Force',
        note: 'Even a tiny microcoulomb of static charge easily lifts hair or pushes balloons apart against Earth’s gravity, dwarfing their mutual gravitational pull by more than a trillion times.'
      },
      dust: {
        title: 'Charged Dust Specks (10 pC, 1 μg at 1 mm)',
        fe: K * Math.pow(10e-12, 2) / (0.001 * 0.001),
        fg: G * 1e-9 * 1e-9 / (0.001 * 0.001),
        dominant: 'Electric Force',
        note: 'At small scales, static charges dominate dust clumping, air filtration, and toner adhesion inside laser printers.'
      },
      planets: {
        title: 'Earth & Moon (Electrically Neutral at Large Scale)',
        fe: 0,
        fg: G * 5.972e24 * 7.348e22 / Math.pow(3.844e8, 2),
        dominant: 'Gravity',
        note: 'Why doesn’t Coulomb force tear planets apart? Because positive protons and negative electrons cancel out almost perfectly in large objects, leaving net charge q ≈ 0 — so only gravity survives at cosmic scale.'
      }
    };

    var activeId = 'hydrogen';
    var view = null;
    view = SimKit.canvas2d(canvas, {
      onResize: function () { if (view) render(); }
    });

    function fmtSci(val) {
      if (val === 0) return '0 N (neutral)';
      if (val >= 0.01 && val < 1000) return val.toFixed(3) + ' N';
      return val.toExponential(2) + ' N';
    }

    function render() {
      var W = view.width;
      var H = view.height;
      if (!W || !H) return;
      var ctx = view.ctx;
      var s = SCENARIOS[activeId];

      ctx.fillStyle = '#07111f';
      ctx.fillRect(0, 0, W, H);

      ctx.font = '700 12px ' + FONT;
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'left';
      ctx.fillText(s.title + ' (Logarithmic Force Scale)', 18, 26);

      // Log10 scale from -50 to +25
      var minExp = -50;
      var maxExp = 24;
      var barL = 132;
      var barR = W - 26;
      var barW = Math.max(100, barR - barL);

      function xExp(exp) {
        return barL + clamp((exp - minExp) / (maxExp - minExp), 0, 1) * barW;
      }

      // Tick grid
      for (var exp = -50; exp <= 20; exp += 10) {
        var gx = xExp(exp);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.beginPath();
        ctx.moveTo(gx, 46);
        ctx.lineTo(gx, H - 36);
        ctx.stroke();
        ctx.font = '600 10px ' + FONT;
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText('10^' + exp, gx, H - 16);
      }

      var rows = [
        { label: 'Electric (Fₑ)', val: s.fe, color: '#fbbf24', y: 78 },
        { label: 'Gravity (Fg)', val: s.fg, color: '#38bdf8', y: 138 }
      ];

      rows.forEach(function (row) {
        ctx.font = '700 11.5px ' + FONT;
        ctx.fillStyle = row.color;
        ctx.textAlign = 'right';
        ctx.fillText(row.label, barL - 14, row.y + 4);

        // Track
        roundRect(ctx, barL, row.y - 12, barW, 24, 6);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
        ctx.fill();

        if (row.val > 0) {
          var e = Math.log10(row.val);
          var fillW = Math.max(8, xExp(e) - barL);
          roundRect(ctx, barL, row.y - 12, fillW, 24, 6);
          ctx.fillStyle = row.color;
          ctx.fill();
        }

        drawPill(ctx, fmtSci(row.val), barL + 10, row.y, {
          align: 'left',
          size: 10,
          bg: 'rgba(7, 17, 31, 0.92)',
          border: row.color,
          color: '#f8fafc'
        });
      });

      mFe.textContent = fmtSci(s.fe);
      mFg.textContent = fmtSci(s.fg);
      if (s.fe === 0) {
        mRatio.textContent = 'Gravity wins (q ≈ 0)';
      } else {
        var ratio = s.fe / s.fg;
        var pwr = Math.round(Math.log10(ratio));
        mRatio.textContent = ratio.toExponential(1) + '× (~10^' + pwr + ')';
      }
      mRule.textContent = s.dominant;
      readoutEl.innerHTML = '<strong>Scale takeaway:</strong> ' + s.note;

      btns.forEach(function (btn) {
        btn.setAttribute('aria-pressed', btn.dataset.scaleId === activeId ? 'true' : 'false');
      });
    }

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeId = btn.dataset.scaleId;
        render();
      });
    });

    render();
  }

  /* ───────────────────────────────────────────────────────────
     5. Interactive Concept Quiz & Numeric Practice
     ─────────────────────────────────────────────────────────── */
  function initPractice() {
    var questions = Array.from(document.querySelectorAll('.cl-question'));
    var scoreEl = document.getElementById('cl-quiz-score');
    var quizReset = document.getElementById('cl-quiz-reset');

    function updateQuizScore() {
      if (!scoreEl) return;
      var right = 0;
      var checked = 0;
      questions.forEach(function (q) {
        if (q.dataset.answered) {
          checked++;
          if (q.dataset.answered === 'right') right++;
        }
      });
      scoreEl.textContent = 'Score: ' + right + ' / ' + questions.length + ' · ' + checked + ' checked';
    }

    questions.forEach(function (q) {
      var ans = q.dataset.answer;
      var explain = q.dataset.explain || '';
      var fb = q.querySelector('.cl-feedback');
      var opts = Array.from(q.querySelectorAll('.cl-q-opt'));

      opts.forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (q.dataset.answered) return;
          var chosen = btn.dataset.choice;
          var ok = chosen === ans;
          q.dataset.answered = ok ? 'right' : 'wrong';

          opts.forEach(function (o) {
            o.disabled = true;
            o.setAttribute('aria-pressed', o === btn ? 'true' : 'false');
            if (o.dataset.choice === ans) o.classList.add('is-right');
            else if (o === btn) o.classList.add('is-wrong');
          });

          if (fb) {
            fb.className = 'cl-feedback ' + (ok ? 'ok' : 'err');
            fb.textContent = (ok ? '✓ Correct — ' : '✗ Not quite — ') + explain;
          }
          updateQuizScore();
        });
      });
    });

    if (quizReset) {
      quizReset.addEventListener('click', function () {
        questions.forEach(function (q) {
          delete q.dataset.answered;
          var fb = q.querySelector('.cl-feedback');
          if (fb) {
            fb.className = 'cl-feedback';
            fb.textContent = '';
          }
          q.querySelectorAll('.cl-q-opt').forEach(function (o) {
            o.disabled = false;
            o.classList.remove('is-right', 'is-wrong');
            o.setAttribute('aria-pressed', 'false');
          });
        });
        updateQuizScore();
      });
    }

    // Numeric calculation problems
    var calcs = Array.from(document.querySelectorAll('.cl-calc-problem'));
    var calcReset = document.getElementById('cl-calc-reset');

    calcs.forEach(function (card) {
      var input = card.querySelector('.cl-ans-input');
      var checkBtn = card.querySelector('.cl-check-btn');
      var hintBtn = card.querySelector('.cl-hint-btn');
      var fb = card.querySelector('.cl-feedback');
      var hintEl = card.querySelector('.cl-hint');
      var ans = parseFloat(card.dataset.ans);
      var tol = parseFloat(card.dataset.tol);

      function grade() {
        var val = parseFloat(input.value);
        if (isNaN(val)) {
          fb.className = 'cl-feedback err';
          fb.textContent = 'Enter a number first.';
          return;
        }
        if (Math.abs(val - ans) <= tol) {
          fb.className = 'cl-feedback ok';
          fb.textContent = '✓ Correct!';
        } else {
          fb.className = 'cl-feedback err';
          fb.textContent = '✗ Try again — check the hint below.';
          if (hintEl) hintEl.hidden = false;
        }
      }

      if (checkBtn) checkBtn.addEventListener('click', grade);
      if (input) {
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            grade();
          }
        });
      }
      if (hintBtn && hintEl) {
        hintBtn.addEventListener('click', function () {
          var showing = !hintEl.hidden;
          hintEl.hidden = showing;
          hintBtn.textContent = showing ? 'Show hint' : 'Hide hint';
        });
      }
    });

    if (calcReset) {
      calcReset.addEventListener('click', function () {
        calcs.forEach(function (card) {
          var input = card.querySelector('.cl-ans-input');
          var fb = card.querySelector('.cl-feedback');
          var hintEl = card.querySelector('.cl-hint');
          var hintBtn = card.querySelector('.cl-hint-btn');
          if (input) input.value = '';
          if (fb) { fb.className = 'cl-feedback'; fb.textContent = ''; }
          if (hintEl) hintEl.hidden = true;
          if (hintBtn) hintBtn.textContent = 'Show hint';
        });
      });
    }

    updateQuizScore();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initJumpNav();
    initSandbox();
    initInverseSquareLab();
    initTorsionLab();
    initScaleLab();
    initPractice();
  });
})();
