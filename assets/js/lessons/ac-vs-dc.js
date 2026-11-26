/* Interactive labs for lessons/physics/electricity-and-magnetism/ac-vs-dc.html */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
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
    ctx.font = '800 ' + size + 'px ' + FONT;
    var w = ctx.measureText(text).width + size * 1.25;
    var h = size * 1.75;
    var left = opts.align === 'left' ? x : opts.align === 'right' ? x - w : x - w / 2;
    roundRect(ctx, left, y - h / 2, w, h, h / 2);
    ctx.fillStyle = opts.bg || 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    if (opts.border) {
      ctx.strokeStyle = opts.border;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.fillStyle = opts.color || '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, left + w / 2, y + 0.5);
  }

  /* ───────────────────────────────────────────────────────────
     1. Interactive Waveform & Load Lab
     ─────────────────────────────────────────────────────────── */
  function initWaveLab() {
    var scopeCanvas = document.getElementById('acd-scope');
    var loadCanvas = document.getElementById('acd-load-canvas');
    if (!scopeCanvas || !loadCanvas) return;

    var voltageInput = document.getElementById('acd-voltage');
    var freqInput = document.getElementById('acd-frequency');
    var voltageOut = document.getElementById('acd-voltage-out');
    var freqOut = document.getElementById('acd-frequency-out');
    var freqControl = document.getElementById('acd-frequency-control');
    var probeEl = document.getElementById('acd-scope-probe');
    var readoutEl = document.getElementById('acd-readout');

    var mPrimary = document.getElementById('acd-m-primary');
    var mPeak = document.getElementById('acd-m-peak');
    var mPeriod = document.getElementById('acd-m-period');
    var mCross = document.getElementById('acd-m-cross');

    var presetBtns = Array.from(document.querySelectorAll('#acd-wave-presets [data-preset]'));
    var kindBtns = Array.from(document.querySelectorAll('[data-kind]'));
    var loadBtns = Array.from(document.querySelectorAll('[data-load]'));
    var rmsToggle = document.getElementById('acd-rms-toggle');
    var powerToggle = document.getElementById('acd-power-toggle');
    var pauseBtn = document.getElementById('acd-pause');
    var gridBtn = document.getElementById('acd-grid-toggle');

    var state = {
      kind: 'ac',
      load: 'bulb',
      phase: 0,
      simTime: 0,
      paused: false,
      gridOn: true,
      showRms: true,
      showPower: false,
      probeNorm: null,
      bulbHeat: 0.7
    };

    var PRESETS = {
      us: { kind: 'ac', v: 120, f: 60 },
      eu: { kind: 'ac', v: 230, f: 50 },
      battery: { kind: 'dc', v: 9, f: 60 },
      usb: { kind: 'dc', v: 5, f: 60 },
      aircraft: { kind: 'ac', v: 115, f: 400 },
      slow: { kind: 'ac', v: 12, f: 2 }
    };

    function getWindowSec(f) {
      if (f <= 10) return 1.0;
      if (f <= 25) return 0.16;
      if (f <= 120) return 0.05;
      return 0.01;
    }

    function getMaxRangeV(v) {
      if (v <= 15) return 24;
      if (v <= 60) return 100;
      return 360;
    }

    function syncActivePreset() {
      var v = +voltageInput.value;
      var f = +freqInput.value;
      presetBtns.forEach(function (btn) {
        var p = PRESETS[btn.dataset.preset];
        var match = p && p.kind === state.kind && p.v === v && (state.kind === 'dc' || p.f === f);
        btn.setAttribute('aria-pressed', match ? 'true' : 'false');
      });
    }

    function updateMeta() {
      var v = +voltageInput.value;
      var f = +freqInput.value;
      var vPeak = v * Math.SQRT2;
      var periodMs = 1000 / f;

      voltageOut.textContent = v + (state.kind === 'dc' ? ' V DC' : ' V RMS');
      freqOut.textContent = f + ' Hz';
      freqControl.style.opacity = state.kind === 'dc' ? '0.45' : '1';
      freqInput.disabled = state.kind === 'dc';

      if (state.kind === 'dc') {
        mPrimary.textContent = v + ' V';
        mPeak.textContent = v + ' V';
        mPeriod.textContent = '∞ (steady)';
        mCross.textContent = '0 / s';
        readoutEl.innerHTML =
          '<strong>Steady DC (' + v + ' V):</strong> Polarity never flips, frequency is 0 Hz, and charge drifts continuously in one net direction. ' +
          (state.load === 'led'
            ? 'An LED glows steadily whenever wired in forward polarity.'
            : 'An incandescent bulb heats continuously at constant power.');
      } else if (state.kind === 'ac') {
        mPrimary.textContent = v + ' V RMS';
        mPeak.textContent = vPeak.toFixed(1) + ' V';
        mPeriod.textContent = periodMs >= 100 ? periodMs.toFixed(0) + ' ms' : periodMs.toFixed(2) + ' ms';
        mCross.textContent = (f * 2) + ' / s';
        readoutEl.innerHTML =
          '<strong>Sine AC (' + v + ' V RMS, ' + f + ' Hz):</strong> Peaks at ±' + vPeak.toFixed(1) + ' V and reverses polarity ' + (f * 2) + ' times/s. ' +
          (state.load === 'led'
            ? 'Watch the single LED: it conducts only on positive half-cycles above ~1.8 V and blocks negative voltage!'
            : 'Watch the filament: it heats on <em>both</em> positive and negative half-cycles because power depends on V².');
      } else {
        mPrimary.textContent = v + ' V RMS = DC';
        mPeak.textContent = '±' + vPeak.toFixed(1) + ' V';
        mPeriod.textContent = periodMs >= 100 ? periodMs.toFixed(0) + ' ms' : periodMs.toFixed(2) + ' ms';
        mCross.textContent = (f * 2) + ' / s';
        readoutEl.innerHTML =
          '<strong>Compare AC vs. DC (' + v + ' V):</strong> A ' + v + ' V RMS sine wave swings higher (to ±' + vPeak.toFixed(1) +
          ' V) and passes through 0 V twice per cycle so its <em>average heating power</em> matches a steady ' + v + ' V DC supply.';
      }

      syncActivePreset();
    }

    var scope, load;
    scope = SimKit.canvas2d(scopeCanvas, { box: scopeCanvas.parentElement, dpr: 2, onResize: function () { if (scope && load) draw(0); } });
    load = SimKit.canvas2d(loadCanvas, { box: loadCanvas.parentElement, dpr: 2, onResize: function () { if (scope && load) draw(0); } });

    function drawScope() {
      var ctx = scope.ctx;
      var w = scope.width;
      var h = scope.height;
      var padL = 46;
      var padR = 14;
      var padT = 28;
      var padB = 26;
      var pw = Math.max(40, w - padL - padR);
      var ph = Math.max(40, h - padT - padB);
      var cy = padT + ph / 2;

      var v = +voltageInput.value;
      var f = +freqInput.value;
      var vPeak = v * Math.SQRT2;
      var maxV = getMaxRangeV(v);
      var winSec = getWindowSec(f);
      var cyclesVisible = f * winSec;

      ctx.clearRect(0, 0, w, h);

      // Background grid
      if (state.gridOn) {
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.12)';
        ctx.lineWidth = 1;
        for (var gx = 0; gx <= 8; gx++) {
          var xx = padL + (pw * gx) / 8;
          ctx.beginPath();
          ctx.moveTo(xx, padT);
          ctx.lineTo(xx, padT + ph);
          ctx.stroke();
        }
        for (var gy = 0; gy <= 4; gy++) {
          var yy = padT + (ph * gy) / 4;
          ctx.beginPath();
          ctx.moveTo(padL, yy);
          ctx.lineTo(padL + pw, yy);
          ctx.stroke();
        }
      }

      // Zero axis & y-axis labels
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(padL, cy);
      ctx.lineTo(padL + pw, cy);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 10px ' + FONT;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('+' + maxV + 'V', padL - 6, padT + 4);
      ctx.fillText('0V', padL - 6, cy);
      ctx.fillText('−' + maxV + 'V', padL - 6, padT + ph - 4);

      function yForV(volts) {
        return cy - clamp(volts / maxV, -1.04, 1.04) * (ph * 0.46);
      }

      // RMS / Peak reference guides
      if (state.showRms && state.kind !== 'dc') {
        var yRms = yForV(v);
        var yPk = yForV(vPeak);
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(padL, yRms);
        ctx.lineTo(padL + pw, yRms);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
        ctx.beginPath();
        ctx.moveTo(padL, yPk);
        ctx.lineTo(padL + pw, yPk);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#fdba74';
        ctx.textAlign = 'left';
        ctx.fillText('RMS ' + v + 'V', padL + 6, yRms - 8);
        ctx.fillStyle = '#7dd3fc';
        ctx.fillText('Peak ' + vPeak.toFixed(0) + 'V', padL + 78, yPk - 8);
      }

      // Power curve p(t) = (v(t)/vPeak)^2 normalized to positive half
      if (state.showPower) {
        ctx.save();
        ctx.fillStyle = 'rgba(167, 139, 250, 0.16)';
        ctx.strokeStyle = '#c4b5fd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padL, cy);
        for (var px = 0; px <= pw; px += 2) {
          var tNorm = px / pw;
          var instV = state.kind === 'dc'
            ? v
            : vPeak * Math.sin(tNorm * TAU * cyclesVisible - state.phase);
          var pRatio = state.kind === 'dc' ? 0.5 : (instV * instV) / Math.max(1, vPeak * vPeak);
          var py = cy - pRatio * (ph * 0.42);
          ctx.lineTo(padL + px, py);
        }
        ctx.lineTo(padL + pw, cy);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        for (var px2 = 0; px2 <= pw; px2 += 2) {
          var tn2 = px2 / pw;
          var iv2 = state.kind === 'dc'
            ? v
            : vPeak * Math.sin(tn2 * TAU * cyclesVisible - state.phase);
          var pr2 = state.kind === 'dc' ? 0.5 : (iv2 * iv2) / Math.max(1, vPeak * vPeak);
          var py2 = cy - pr2 * (ph * 0.42);
          if (px2 === 0) ctx.moveTo(padL + px2, py2);
          else ctx.lineTo(padL + px2, py2);
        }
        ctx.stroke();
        ctx.restore();
      }

      // DC trace
      if (state.kind === 'dc' || state.kind === 'both') {
        var dcY = yForV(v);
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(padL, dcY);
        ctx.lineTo(padL + pw, dcY);
        ctx.stroke();
      }

      // AC trace
      if (state.kind === 'ac' || state.kind === 'both') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (var i = 0; i <= pw; i++) {
          var norm = i / pw;
          var val = vPeak * Math.sin(norm * TAU * cyclesVisible - state.phase);
          var yVal = yForV(val);
          if (i === 0) ctx.moveTo(padL + i, yVal);
          else ctx.lineTo(padL + i, yVal);
        }
        ctx.stroke();
      }

      // Probe crosshair
      if (state.probeNorm !== null) {
        var pxProbe = padL + state.probeNorm * pw;
        var tMs = state.probeNorm * winSec * 1000;
        var vAcNow = vPeak * Math.sin(state.probeNorm * TAU * cyclesVisible - state.phase);
        var activeV = state.kind === 'dc' ? v : vAcNow;
        var yDot = yForV(activeV);

        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(pxProbe, padT);
        ctx.lineTo(pxProbe, padT + ph);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = state.kind === 'dc' ? '#fb923c' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(pxProbe, yDot, 5, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (probeEl) {
          var pol = Math.abs(activeV) < 0.2 ? '0 V crossing' : (activeV > 0 ? 'Positive (+)' : 'Reversed (−)');
          probeEl.innerHTML =
            '<strong>Probe at t = ' + tMs.toFixed(1) + ' ms:</strong> ' +
            (state.kind === 'both'
              ? 'AC = ' + vAcNow.toFixed(1) + ' V · DC = +' + v.toFixed(1) + ' V'
              : 'v(t) = ' + activeV.toFixed(1) + ' V (' + pol + ')');
        }
      }

      // Header and time-base labels
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 11.5px ' + FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      var titleStr = state.kind === 'dc'
        ? 'DC · ' + v + ' V steady · 0 Hz'
        : (state.kind === 'both' ? 'AC (' + v + ' V RMS, ' + f + ' Hz) vs. DC (' + v + ' V)' : 'AC · ' + v + ' V RMS · ' + f + ' Hz');
      ctx.fillText(titleStr, padL, 14);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 10px ' + FONT;
      ctx.fillText('0 ms', padL, h - 10);
      ctx.textAlign = 'right';
      ctx.fillText('Window: ' + (winSec * 1000).toFixed(0) + ' ms', padL + pw, h - 10);
    }

    function drawSingleLoop(ctx, x, y, w, h, opts) {
      var vNow = opts.vNow;
      var isAc = opts.isAc;
      var loadType = opts.loadType;
      var vNorm = clamp(vNow / Math.max(1, opts.vPeak), -1, 1);

      // Outer wire loop
      var rx = x + 46;
      var rw = w - 92;
      var ry = y + 18;
      var rh = h - 36;

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 6;
      roundRect(ctx, rx, ry, rw, rh, 14);
      ctx.stroke();

      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2.5;
      roundRect(ctx, rx, ry, rw, rh, 14);
      ctx.stroke();

      // Animated electrons along top & bottom rails
      var count = 9;
      for (var i = 0; i < count; i++) {
        var frac = (i + 0.5) / count;
        var posTop, posBot;
        if (isAc) {
          var osc = Math.sin(opts.driftPhase) * 14;
          posTop = rx + 26 + frac * (rw - 52) + osc;
          posBot = rx + 26 + frac * (rw - 52) - osc;
        } else {
          var shift = ((frac + opts.dcOffset) % 1);
          posTop = rx + 20 + shift * (rw - 40);
          posBot = rx + 20 + ((1 - shift) * (rw - 40));
        }
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(posTop, ry, 4.2, 0, TAU);
        ctx.arc(posBot, ry + rh, 4.2, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#07111f';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Left source badge
      var sx = rx;
      var sy = ry + rh / 2;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = isAc ? '#38bdf8' : '#fb923c';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 21, 0, TAU);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isAc ? '#7dd3fc' : '#fdba74';
      ctx.font = '800 16px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isAc ? '∿' : '⎓', sx, sy + 1);

      // Live terminal polarity indicators
      var topPlus = !isAc || vNow >= 0;
      ctx.font = '800 12px ' + FONT;
      ctx.fillStyle = topPlus ? '#f87171' : '#38bdf8';
      ctx.fillText(topPlus ? '+' : '−', sx - 30, sy - 20);
      ctx.fillStyle = topPlus ? '#38bdf8' : '#f87171';
      ctx.fillText(topPlus ? '−' : '+', sx - 30, sy + 22);

      // Right load (Bulb or LED)
      var lx = rx + rw;
      var ly = ry + rh / 2;
      var glow = 0;
      if (loadType === 'bulb') {
        glow = isAc ? clamp(opts.bulbHeat, 0, 1) : clamp(Math.abs(vNorm), 0.15, 1);
        if (glow > 0.05) {
          var rad = ctx.createRadialGradient(lx, ly, 4, lx, ly, 36);
          rad.addColorStop(0, 'rgba(253, 224, 71, ' + (0.75 * glow) + ')');
          rad.addColorStop(1, 'rgba(253, 224, 71, 0)');
          ctx.fillStyle = rad;
          ctx.beginPath();
          ctx.arc(lx, ly, 36, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = glow > 0.2 ? 'rgba(254, 240, 138, ' + (0.28 + 0.65 * glow) + ')' : '#1e293b';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lx, ly, 18, 0, TAU);
        ctx.fill();
        ctx.stroke();
        // Filament
        ctx.strokeStyle = glow > 0.2 ? '#f59e0b' : '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx - 7, ly + 6);
        ctx.lineTo(lx - 3, ly - 5);
        ctx.lineTo(lx, ly + 4);
        ctx.lineTo(lx + 3, ly - 5);
        ctx.lineTo(lx + 7, ly + 6);
        ctx.stroke();
      } else {
        // Polarized LED: only conducts forward when vNow > 1.8 V
        var forwardOn = vNow > 1.8;
        if (forwardOn) {
          var lrad = ctx.createRadialGradient(lx, ly, 3, lx, ly, 34);
          lrad.addColorStop(0, 'rgba(74, 222, 128, 0.85)');
          lrad.addColorStop(1, 'rgba(74, 222, 128, 0)');
          ctx.fillStyle = lrad;
          ctx.beginPath();
          ctx.arc(lx, ly, 34, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = forwardOn ? '#22c55e' : '#334155';
        ctx.strokeStyle = forwardOn ? '#bbf7d0' : '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx - 13, ly - 11);
        ctx.lineTo(lx + 13, ly - 11);
        ctx.lineTo(lx, ly + 11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lx - 13, ly + 12);
        ctx.lineTo(lx + 13, ly + 12);
        ctx.stroke();
      }

      // Direction caption
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '700 10.5px ' + FONT;
      ctx.textAlign = 'center';
      var dirText = isAc
        ? (vNow >= 0 ? 'AC electrons: drifting ← then reversing' : 'AC electrons: drifting → then reversing')
        : 'DC electrons: steady one-way drift ←';
      ctx.fillText(dirText, rx + rw / 2, ry + rh / 2 + 2);
    }

    function drawLoad(dt) {
      var ctx = load.ctx;
      var w = load.width;
      var h = load.height;
      ctx.clearRect(0, 0, w, h);

      var v = +voltageInput.value;
      var f = +freqInput.value;
      var vPeak = v * Math.SQRT2;
      var acOmega = Math.min(f, 15) * 0.55; // slowed visual oscillation so human eye can track direction
      var driftPhase = state.simTime * acOmega;
      var vNow = state.kind === 'dc' ? v : vPeak * Math.sin(driftPhase);

      var targetHeat = f >= 20 ? clamp(v / 120, 0.35, 1) : clamp(Math.abs(Math.sin(driftPhase)), 0.05, 1);
      var tau = f >= 20 ? 0.3 : 0.06;
      state.bulbHeat = lerp(state.bulbHeat, targetHeat, clamp(dt / tau, 0.08, 1));

      if (state.kind === 'both') {
        drawSingleLoop(ctx, 0, 2, w, h * 0.5 - 2, {
          isAc: true,
          vNow: vPeak * Math.sin(driftPhase),
          vPeak: vPeak,
          driftPhase: driftPhase,
          dcOffset: 0,
          loadType: state.load,
          bulbHeat: state.bulbHeat
        });
        drawSingleLoop(ctx, 0, h * 0.5, w, h * 0.5 - 2, {
          isAc: false,
          vNow: v,
          vPeak: vPeak,
          driftPhase: 0,
          dcOffset: state.simTime * 0.25,
          loadType: state.load,
          bulbHeat: 1
        });
      } else {
        drawSingleLoop(ctx, 0, 4, w, h - 8, {
          isAc: state.kind === 'ac',
          vNow: vNow,
          vPeak: vPeak,
          driftPhase: driftPhase,
          dcOffset: state.simTime * 0.25,
          loadType: state.load,
          bulbHeat: state.bulbHeat
        });
      }
    }

    function draw(dt) {
      var f = +freqInput.value;
      if (!state.paused && !reduceMotion) {
        state.simTime += dt;
        if (state.kind !== 'dc') {
          state.phase += (Math.min(f, 120) / 60) * dt * 2.2;
        }
      }
      drawScope();
      drawLoad(dt || 0.016);
    }

    // Scope pointer inspection
    function updateProbeFromEvent(ev) {
      var rect = scopeCanvas.getBoundingClientRect();
      var padL = 46;
      var padR = 14;
      var pw = Math.max(40, rect.width - padL - padR);
      var x = ev.clientX - rect.left - padL;
      state.probeNorm = clamp(x / pw, 0, 1);
      draw(0);
    }

    scopeCanvas.addEventListener('pointermove', updateProbeFromEvent);
    scopeCanvas.addEventListener('pointerdown', updateProbeFromEvent);
    scopeCanvas.addEventListener('pointerleave', function () {
      state.probeNorm = null;
      if (probeEl) probeEl.textContent = 'Move cursor or tap across the waveform to inspect exact time and voltage.';
      draw(0);
    });

    presetBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = PRESETS[btn.dataset.preset];
        if (!p) return;
        state.kind = p.kind;
        voltageInput.value = String(p.v);
        freqInput.value = String(p.f);
        kindBtns.forEach(function (b) {
          var on = b.dataset.kind === p.kind;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        updateMeta();
        draw(0);
      });
    });

    kindBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.kind = btn.dataset.kind;
        kindBtns.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        updateMeta();
        draw(0);
      });
    });

    loadBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.load = btn.dataset.load;
        loadBtns.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        updateMeta();
        draw(0);
      });
    });

    rmsToggle.addEventListener('click', function () {
      state.showRms = !state.showRms;
      rmsToggle.setAttribute('aria-pressed', state.showRms ? 'true' : 'false');
      draw(0);
    });

    powerToggle.addEventListener('click', function () {
      state.showPower = !state.showPower;
      powerToggle.setAttribute('aria-pressed', state.showPower ? 'true' : 'false');
      draw(0);
    });

    pauseBtn.addEventListener('click', function () {
      state.paused = !state.paused;
      pauseBtn.setAttribute('aria-pressed', state.paused ? 'true' : 'false');
      pauseBtn.textContent = state.paused ? 'Resume trace' : 'Pause trace';
    });

    gridBtn.addEventListener('click', function () {
      state.gridOn = !state.gridOn;
      gridBtn.setAttribute('aria-pressed', state.gridOn ? 'true' : 'false');
      gridBtn.textContent = state.gridOn ? 'Grid on' : 'Grid off';
      draw(0);
    });

    voltageInput.addEventListener('input', function () { updateMeta(); draw(0); });
    freqInput.addEventListener('input', function () { updateMeta(); draw(0); });

    updateMeta();
    draw(0);
    SimKit.loop(draw, { el: SimKit.stage('#acd-scope', '#acd-load-canvas'), maxDt: 0.05 });
  }

  /* ───────────────────────────────────────────────────────────
     2. Interactive Generator & AC Cycle Explorer
     ─────────────────────────────────────────────────────────── */
  function initCycleLab() {
    var canvas = document.getElementById('acd-cycle-canvas');
    if (!canvas) return;

    var angleInput = document.getElementById('acd-cycle-angle');
    var angleOut = document.getElementById('acd-cycle-angle-out');
    var playBtn = document.getElementById('acd-cycle-play');
    var stepBtns = Array.from(document.querySelectorAll('[data-cycle-deg]'));
    var readoutEl = document.getElementById('acd-cycle-readout');

    var state = {
      deg: +angleInput.value || 45,
      playing: !reduceMotion
    };

    if (playBtn) {
      playBtn.setAttribute('aria-pressed', state.playing ? 'true' : 'false');
      playBtn.textContent = state.playing ? 'Pause rotation' : 'Spin generator';
    }

    var surface;
    surface = SimKit.canvas2d(canvas, { box: canvas.parentElement, dpr: 2, onResize: function () { if (surface) draw(0); } });

    function describeAngle(deg) {
      var rad = (deg * Math.PI) / 180;
      var s = Math.sin(rad);
      var pct = Math.round(s * 100);
      var sign = pct > 0 ? '+' : '';
      var note;
      if (deg < 15 || deg > 345) {
        note = 'Coil wires move parallel to the magnetic field — magnetic flux change is near zero, so induced voltage is near 0 V.';
      } else if (Math.abs(deg - 90) <= 20) {
        note = 'Coil cuts straight across the magnetic field lines at maximum speed — producing the positive peak (+100% Vpeak).';
      } else if (Math.abs(deg - 180) <= 20) {
        note = 'Half-turn complete: the coil passes parallel to the field again, crossing 0 V right as polarity reverses.';
      } else if (Math.abs(deg - 270) <= 20) {
        note = 'Each side of the coil now cuts the field in the opposite direction — producing the negative peak (−100% Vpeak).';
      } else if (s > 0) {
        note = 'Coil is cutting field lines upward/downward in the positive half-cycle, pushing current in the forward polarity.';
      } else {
        note = 'Coil has rotated past 180°, so induced polarity and current direction are reversed.';
      }
      return '<strong>Angle ' + Math.round(deg) + '°:</strong> Instantaneous voltage = <strong>' + sign + pct + '% of Vpeak</strong>. ' + note;
    }

    function updateReadout() {
      var d = Math.round(state.deg);
      angleInput.value = String(d);
      angleOut.textContent = d + '°';
      readoutEl.innerHTML = describeAngle(d);
      stepBtns.forEach(function (b) {
        b.setAttribute('aria-pressed', Math.abs(+b.dataset.cycleDeg - d) <= 3 ? 'true' : 'false');
      });
    }

    function draw(dt) {
      if (state.playing && !reduceMotion && dt) {
        state.deg = (state.deg + dt * 55) % 360;
        updateReadout();
      }

      var ctx = surface.ctx;
      var w = surface.width;
      var h = surface.height;
      ctx.clearRect(0, 0, w, h);

      var rad = (state.deg * Math.PI) / 180;
      var s = Math.sin(rad);
      var split = Math.min(w * 0.39, 340);

      // Left panel: Rotating Generator
      var gx = split * 0.5;
      var gy = h * 0.52;
      var magW = clamp(split * 0.16, 26, 44);
      var magH = h * 0.52;
      var gap = clamp(split * 0.25, 42, 74);

      // Magnetic field arrows
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = 1.4;
      for (var fy = -2; fy <= 2; fy++) {
        var ay = gy + fy * (magH * 0.18);
        ctx.beginPath();
        ctx.moveTo(gx - gap + 6, ay);
        ctx.lineTo(gx + gap - 6, ay);
        ctx.stroke();
      }

      // N & S Poles
      roundRect(ctx, gx - gap - magW, gy - magH / 2, magW, magH, 8);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      roundRect(ctx, gx + gap, gy - magH / 2, magW, magH, 8);
      ctx.fillStyle = '#2563eb';
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 15px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('N', gx - gap - magW / 2, gy);
      ctx.fillText('S', gx + gap + magW / 2, gy);

      // Rotating coil arms
      var armR = Math.min(gap * 0.68, magH * 0.34);
      var ax = gx + Math.cos(rad) * armR;
      var ay1 = gy - Math.sin(rad) * armR;
      var bx = gx - Math.cos(rad) * armR;
      var by1 = gy + Math.sin(rad) * armR;

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ax, ay1);
      ctx.lineTo(bx, by1);
      ctx.stroke();

      // Coil conductor cross-sections
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(ax, ay1, 8, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(bx, by1, 8, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Center axle
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(gx, gy, 4, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 11px ' + FONT;
      ctx.fillText('Generator Coil', gx, 20);

      // Right panel: 0°-360° Sine Wave
      var wx = split + 34;
      var ww = Math.max(80, w - wx - 22);
      var wyTop = 36;
      var wyBot = h - 34;
      var wMid = (wyTop + wyBot) / 2;
      var wAmp = (wyBot - wyTop) * 0.42;

      // Grid & zero axis
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.14)';
      ctx.lineWidth = 1;
      for (var degTick = 0; degTick <= 360; degTick += 90) {
        var tx = wx + (degTick / 360) * ww;
        ctx.beginPath();
        ctx.moveTo(tx, wyTop);
        ctx.lineTo(tx, wyBot);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 10px ' + FONT;
        ctx.textAlign = 'center';
        ctx.fillText(degTick + '°', tx, wyBot + 14);
      }

      ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
      ctx.beginPath();
      ctx.moveTo(wx, wMid);
      ctx.lineTo(wx + ww, wMid);
      ctx.stroke();

      // Shaded half-cycles
      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.beginPath();
      ctx.moveTo(wx, wMid);
      for (var p1 = 0; p1 <= ww * 0.5; p1 += 2) {
        var r1 = (p1 / ww) * TAU;
        ctx.lineTo(wx + p1, wMid - Math.sin(r1) * wAmp);
      }
      ctx.lineTo(wx + ww * 0.5, wMid);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(251, 146, 60, 0.14)';
      ctx.beginPath();
      ctx.moveTo(wx + ww * 0.5, wMid);
      for (var p2 = ww * 0.5; p2 <= ww; p2 += 2) {
        var r2 = (p2 / ww) * TAU;
        ctx.lineTo(wx + p2, wMid - Math.sin(r2) * wAmp);
      }
      ctx.lineTo(wx + ww, wMid);
      ctx.closePath();
      ctx.fill();

      // Sine curve
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      for (var i = 0; i <= ww; i++) {
        var th = (i / ww) * TAU;
        var py = wMid - Math.sin(th) * wAmp;
        if (i === 0) ctx.moveTo(wx + i, py);
        else ctx.lineTo(wx + i, py);
      }
      ctx.stroke();

      // Active point + projection
      var dotX = wx + (state.deg / 360) * ww;
      var dotY = wMid - s * wAmp;

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(196, 181, 253, 0.65)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(ax, ay1);
      ctx.lineTo(dotX, dotY);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = s >= 0 ? '#38bdf8' : '#fb923c';
      ctx.beginPath();
      ctx.arc(dotX, dotY, 6.5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 11px ' + FONT;
      ctx.textAlign = 'left';
      ctx.fillText('Induced Voltage Over One Period (T)', wx, 20);
      ctx.fillStyle = '#7dd3fc';
      ctx.font = '700 10px ' + FONT;
      ctx.fillText('+Vpeak', wx + 4, wyTop + 8);
      ctx.fillStyle = '#fdba74';
      ctx.fillText('−Vpeak', wx + 4, wyBot - 8);
    }

    angleInput.addEventListener('input', function () {
      state.playing = false;
      playBtn.setAttribute('aria-pressed', 'false');
      playBtn.textContent = 'Spin generator';
      state.deg = +angleInput.value;
      updateReadout();
      draw(0);
    });

    stepBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.playing = false;
        playBtn.setAttribute('aria-pressed', 'false');
        playBtn.textContent = 'Spin generator';
        state.deg = +btn.dataset.cycleDeg;
        updateReadout();
        draw(0);
      });
    });

    playBtn.addEventListener('click', function () {
      state.playing = !state.playing;
      playBtn.setAttribute('aria-pressed', state.playing ? 'true' : 'false');
      playBtn.textContent = state.playing ? 'Pause rotation' : 'Spin generator';
    });

    updateReadout();
    draw(0);
    SimKit.loop(draw, { el: SimKit.stage('#acd-cycle-canvas'), maxDt: 0.05 });
  }

  /* ───────────────────────────────────────────────────────────
     3. Transmission-Loss Visual Lab
     ─────────────────────────────────────────────────────────── */
  function initGridLab() {
    var powerEl = document.getElementById('acd-power');
    var resEl = document.getElementById('acd-resistance');
    var vLowEl = document.getElementById('acd-vlow');
    var vHighEl = document.getElementById('acd-vhigh');
    var canvas = document.getElementById('acd-grid-canvas');
    if (!powerEl || !canvas) return;

    var iLowOut = document.getElementById('acd-ilow');
    var iHighOut = document.getElementById('acd-ihigh');
    var savingOut = document.getElementById('acd-saving');
    var effOut = document.getElementById('acd-eff-summary');
    var lowHeatOut = document.getElementById('acd-low-heat');
    var highHeatOut = document.getElementById('acd-high-heat');
    var presetBtns = Array.from(document.querySelectorAll('#acd-grid-presets [data-grid-preset]'));

    var GRID_PRESETS = {
      edison: { p: 100, r: 2, vl: 0.11, vh: 10 },
      town: { p: 1000, r: 2, vl: 10, vh: 100 },
      regional: { p: 10000, r: 4, vl: 13.8, vh: 230 },
      longhaul: { p: 50000, r: 6, vl: 69, vh: 500 }
    };

    var metrics = {
      pWatts: 1000000,
      vl: 10000,
      vh: 100000,
      il: 100,
      ih: 10,
      ll: 20000,
      lh: 200,
      saving: 99
    };

    function formatPower(w) {
      if (w >= 1e6) return (w / 1e6).toFixed(2) + ' MW';
      if (w >= 1000) return (w / 1000).toFixed(1) + ' kW';
      return w.toFixed(0) + ' W';
    }

    function calculate() {
      var p = Math.max(1, +powerEl.value || 1) * 1000;
      var r = Math.max(0.01, +resEl.value || 0.01);
      var vl = Math.max(0.05, +vLowEl.value || 0.05) * 1000;
      var vh = Math.max(0.05, +vHighEl.value || 0.05) * 1000;

      var il = p / vl;
      var ih = p / vh;
      var ll = il * il * r;
      var lh = ih * ih * r;
      var saving = ll > 0 ? 100 * (1 - lh / ll) : 0;
      var effHigh = clamp(100 * (1 - lh / p), 0, 100);

      metrics = { pWatts: p, vl: vl, vh: vh, il: il, ih: ih, ll: ll, lh: lh, saving: saving };

      iLowOut.textContent = il.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' A';
      iHighOut.textContent = ih.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' A';
      savingOut.textContent = saving.toFixed(1) + '%';
      effOut.textContent = effHigh.toFixed(2) + '%';
      if (lowHeatOut) lowHeatOut.textContent = 'Heat loss: ' + formatPower(ll) + (ll >= p ? ' (exceeds target!)' : '');
      if (highHeatOut) highHeatOut.textContent = 'Heat loss: ' + formatPower(lh);

      presetBtns.forEach(function (btn) {
        var pr = GRID_PRESETS[btn.dataset.gridPreset];
        var match = pr && +powerEl.value === pr.p && +resEl.value === pr.r && +vLowEl.value === pr.vl && +vHighEl.value === pr.vh;
        btn.setAttribute('aria-pressed', match ? 'true' : 'false');
      });
    }

    var surface;
    surface = SimKit.canvas2d(canvas, { box: canvas.parentElement, dpr: 2, onResize: function () { if (surface) draw(0); } });
    var flowPhase = 0;

    function drawLine(ctx, x1, x2, y, lossRatio, currentVal, label, badgeColor, speedFactor) {
      var heat = clamp(lossRatio, 0, 1);

      // Heat glow along wire proportional to I^2R
      if (heat > 0.02) {
        ctx.strokeStyle = 'rgba(239, 68, 68, ' + (0.15 + 0.55 * heat) + ')';
        ctx.lineWidth = 10 + 18 * heat;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
      }

      // Wire core
      ctx.strokeStyle = heat > 0.35 ? '#f87171' : '#94a3b8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();

      // Current pulses
      var dots = clamp(Math.round(4 + Math.log10(Math.max(1, currentVal)) * 4), 4, 16);
      for (var i = 0; i < dots; i++) {
        var frac = ((i / dots) + flowPhase * speedFactor) % 1;
        var dx = lerp(x1 + 10, x2 - 10, frac);
        ctx.fillStyle = badgeColor;
        ctx.beginPath();
        ctx.arc(dx, y, 4, 0, TAU);
        ctx.fill();
      }

      // Heat wave squiggles if significant loss
      if (heat > 0.08) {
        var waves = Math.max(2, Math.round(heat * 7));
        ctx.strokeStyle = 'rgba(252, 165, 165, ' + (0.45 + 0.45 * heat) + ')';
        ctx.lineWidth = 1.6;
        for (var k = 1; k <= waves; k++) {
          var hx = lerp(x1 + 25, x2 - 25, k / (waves + 1));
          ctx.beginPath();
          ctx.moveTo(hx, y - 8);
          ctx.quadraticCurveTo(hx - 4, y - 16, hx, y - 22);
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 11px ' + FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, x1, y - 14);
    }

    function draw(dt) {
      if (!reduceMotion && dt) flowPhase = (flowPhase + dt * 0.35) % 1;

      var ctx = surface.ctx;
      var w = surface.width;
      var h = surface.height;
      ctx.clearRect(0, 0, w, h);

      var x1 = 22;
      var x2 = w - 150;
      var yLow = h * 0.31;
      var yHigh = h * 0.72;

      var lossLowFrac = clamp(metrics.ll / metrics.pWatts, 0, 1);
      var lossHighFrac = clamp(metrics.lh / metrics.pWatts, 0, 1);

      drawLine(
        ctx, x1, x2, yLow, lossLowFrac, metrics.il,
        'Low V (' + (+vLowEl.value).toLocaleString() + ' kV) · ' + metrics.il.toFixed(0) + ' A · Loss: ' + formatPower(metrics.ll),
        '#fb923c', 1.4
      );
      drawLine(
        ctx, x1, x2, yHigh, lossHighFrac, metrics.ih,
        'High V (' + (+vHighEl.value).toLocaleString() + ' kV) · ' + metrics.ih.toFixed(1) + ' A · Loss: ' + formatPower(metrics.lh),
        '#38bdf8', 0.45
      );

      // Right-hand efficiency comparison bars
      var bx = x2 + 24;
      var bw = Math.max(70, w - bx - 16);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '800 10.5px ' + FONT;
      ctx.textAlign = 'left';
      ctx.fillText('Power lost as heat', bx, 24);

      function bar(y, ratio, color, label) {
        roundRect(ctx, bx, y, bw, 16, 6);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        if (ratio > 0.005) {
          roundRect(ctx, bx, y, Math.max(6, bw * clamp(ratio, 0, 1)), 16, 6);
          ctx.fillStyle = color;
          ctx.fill();
        }
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '700 10px ' + FONT;
        ctx.fillText(label, bx, y + 30);
      }

      bar(yLow - 8, lossLowFrac, '#ef4444', (lossLowFrac * 100).toFixed(1) + '% wasted');
      bar(yHigh - 8, lossHighFrac, '#22c55e', (lossHighFrac * 100).toFixed(2) + '% wasted');
    }

    presetBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pr = GRID_PRESETS[btn.dataset.gridPreset];
        if (!pr) return;
        powerEl.value = String(pr.p);
        resEl.value = String(pr.r);
        vLowEl.value = String(pr.vl);
        vHighEl.value = String(pr.vh);
        calculate();
        draw(0);
      });
    });

    [powerEl, resEl, vLowEl, vHighEl].forEach(function (inp) {
      inp.addEventListener('input', function () { calculate(); draw(0); });
    });

    calculate();
    draw(0);
    SimKit.loop(draw, { el: SimKit.stage('#acd-grid-canvas'), maxDt: 0.05 });
  }

  /* ───────────────────────────────────────────────────────────
     4. Animated Transformer & Flux Explorer
     ─────────────────────────────────────────────────────────── */
  function initTransformerLab() {
    var canvas = document.getElementById('acd-xfmr-canvas');
    var turnsEl = document.getElementById('acd-turns');
    var vpEl = document.getElementById('acd-xfmr-vp');
    if (!canvas || !turnsEl || !vpEl) return;

    var turnsOut = document.getElementById('acd-turns-out');
    var vpOut = document.getElementById('acd-xfmr-vp-out');
    var readoutEl = document.getElementById('acd-transformer-readout');
    var modeBtns = Array.from(document.querySelectorAll('[data-xfmr-mode]'));
    var pulseBtn = document.getElementById('acd-xfmr-pulse');

    var state = {
      mode: 'ac',
      vp: +vpEl.value || 120,
      np: 100,
      ns: +turnsEl.value || 500,
      phase: 0,
      dcPulse: 0
    };

    function updateReadout() {
      var ratio = state.ns / state.np;
      var ip = 5;
      var pIn = state.vp * ip;
      var vsIdeal = state.vp * ratio;
      var isIdeal = ip / ratio;

      turnsOut.textContent = state.ns + ' turns';
      vpOut.textContent = state.vp + ' V';

      if (state.mode === 'ac') {
        pulseBtn.disabled = true;
        readoutEl.innerHTML =
          '<strong>Turns ratio:</strong> ' + ratio.toFixed(2) + ':1 &nbsp;·&nbsp; ' +
          '<strong>Secondary:</strong> ' + vsIdeal.toFixed(0) + ' V, ' + isIdeal.toFixed(2) + ' A &nbsp;·&nbsp; ' +
          '<strong>Ideal power:</strong> ' + pIn.toFixed(0) + ' W (alternating flux induces continuous output).';
      } else {
        pulseBtn.disabled = false;
        var pulseV = state.dcPulse > 0.08 ? (vsIdeal * state.dcPulse).toFixed(0) + ' V (brief switch spike!)' : '0 V (steady DC)';
        readoutEl.innerHTML =
          '<strong>Steady DC input (' + state.vp + ' V):</strong> Secondary output = <strong>' + pulseV + '</strong>. ' +
          'Steady magnetic flux does not change (dΦ/dt = 0), so no voltage is induced until you flip the switch.';
      }
    }

    var surface;
    surface = SimKit.canvas2d(canvas, { box: canvas.parentElement, dpr: 2, onResize: function () { if (surface) draw(0); } });

    function drawCoil(ctx, x, yTop, yBot, turnsCount, color) {
      var loops = clamp(Math.round(turnsCount), 3, 14);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.2;
      for (var i = 0; i < loops; i++) {
        var yy = lerp(yTop, yBot, (i + 0.5) / loops);
        ctx.beginPath();
        ctx.ellipse(x, yy, 20, 6.5, 0, 0, TAU);
        ctx.stroke();
      }
    }

    function draw(dt) {
      if (!reduceMotion && dt) {
        if (state.mode === 'ac') {
          state.phase = (state.phase + dt * 3.6) % TAU;
        }
        if (state.dcPulse > 0) {
          state.dcPulse = Math.max(0, state.dcPulse - dt * 1.35);
          if (state.mode === 'dc') updateReadout();
        }
      }

      var ctx = surface.ctx;
      var w = surface.width;
      var h = surface.height;
      ctx.clearRect(0, 0, w, h);

      var cx = w / 2;
      var cy = h / 2 + 4;
      var coreW = Math.min(w * 0.58, 260);
      var coreH = Math.min(h * 0.62, 148);
      var xL = cx - coreW / 2;
      var yT = cy - coreH / 2;

      // Laminated iron core frame
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 22;
      roundRect(ctx, xL, yT, coreW, coreH, 14);
      ctx.stroke();

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      roundRect(ctx, xL, yT, coreW, coreH, 14);
      ctx.stroke();

      // Magnetic flux line
      var fluxStrength = state.mode === 'ac' ? Math.cos(state.phase) : 1;
      var fluxColor = state.mode === 'ac'
        ? (fluxStrength >= 0 ? 'rgba(56, 189, 248, ' + (0.25 + 0.7 * Math.abs(fluxStrength)) + ')' : 'rgba(251, 146, 60, ' + (0.25 + 0.7 * Math.abs(fluxStrength)) + ')')
        : 'rgba(250, 204, 21, 0.55)';

      ctx.save();
      ctx.setLineDash([8, 6]);
      if (state.mode === 'ac' && !reduceMotion) {
        ctx.lineDashOffset = -state.phase * 14;
      }
      ctx.strokeStyle = fluxColor;
      ctx.lineWidth = 3.5;
      roundRect(ctx, xL, yT, coreW, coreH, 14);
      ctx.stroke();
      ctx.restore();

      // Windings
      drawCoil(ctx, xL, yT + 22, yT + coreH - 22, 5, '#fb923c');
      drawCoil(ctx, xL + coreW, yT + 22, yT + coreH - 22, 3 + (state.ns / 1000) * 11, '#38bdf8');

      var ratio = state.ns / state.np;
      var vs = state.mode === 'ac' ? state.vp * ratio : state.vp * ratio * state.dcPulse;
      var isec = state.mode === 'ac' ? 5 / ratio : (5 / ratio) * state.dcPulse;

      // Labels
      ctx.fillStyle = '#fdba74';
      ctx.font = '800 12px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('Primary', Math.max(46, xL - 46), cy - 22);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(state.vp + ' V ' + (state.mode === 'ac' ? 'AC' : 'DC'), Math.max(46, xL - 46), cy - 4);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 10.5px ' + FONT;
      ctx.fillText('100 turns · 5 A', Math.max(46, xL - 46), cy + 14);

      var rx = Math.min(w - 48, xL + coreW + 48);
      ctx.fillStyle = '#7dd3fc';
      ctx.font = '800 12px ' + FONT;
      ctx.fillText('Secondary', rx, cy - 22);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(vs.toFixed(0) + ' V', rx, cy - 4);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 10.5px ' + FONT;
      ctx.fillText(state.ns + ' turns · ' + isec.toFixed(2) + ' A', rx, cy + 14);

      drawPill(
        ctx,
        state.mode === 'ac' ? 'Changing flux Φ(t) induces AC' : (state.dcPulse > 0.08 ? 'Switch transient: dΦ/dt ≠ 0!' : 'Frozen flux (dΦ/dt = 0) → 0 V'),
        cx,
        20,
        {
          bg: state.mode === 'ac' ? 'rgba(2, 132, 199, 0.25)' : (state.dcPulse > 0.08 ? 'rgba(34, 197, 94, 0.28)' : 'rgba(239, 68, 68, 0.28)'),
          border: state.mode === 'ac' ? '#38bdf8' : (state.dcPulse > 0.08 ? '#4ade80' : '#f87171')
        }
      );
    }

    modeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.mode = btn.dataset.xfmrMode;
        state.dcPulse = state.mode === 'dc' ? 1.0 : 0;
        modeBtns.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        updateReadout();
        draw(0);
      });
    });

    pulseBtn.addEventListener('click', function () {
      if (state.mode !== 'dc') return;
      state.dcPulse = 1.0;
      updateReadout();
      draw(0);
    });

    turnsEl.addEventListener('input', function () {
      state.ns = +turnsEl.value;
      updateReadout();
      draw(0);
    });

    vpEl.addEventListener('input', function () {
      state.vp = +vpEl.value;
      updateReadout();
      draw(0);
    });

    updateReadout();
    draw(0);
    SimKit.loop(draw, { el: SimKit.stage('#acd-xfmr-canvas'), maxDt: 0.05 });
  }

  /* ───────────────────────────────────────────────────────────
     5. AC-to-DC Rectifier & Smoothing Lab
     ─────────────────────────────────────────────────────────── */
  function initRectifierLab() {
    var canvas = document.getElementById('acd-rect-canvas');
    if (!canvas) return;

    var stageBtns = Array.from(document.querySelectorAll('[data-rect-stage]'));
    var capInput = document.getElementById('acd-rect-cap');
    var capOut = document.getElementById('acd-rect-cap-out');
    var loadBtns = Array.from(document.querySelectorAll('[data-rect-load]'));
    var avgOut = document.getElementById('acd-rect-avg');
    var rippleOut = document.getElementById('acd-rect-ripple');
    var stageOut = document.getElementById('acd-rect-stage-out');
    var explainEl = document.getElementById('acd-rect-explain');

    var state = {
      stage: 'smooth',
      capUf: +capInput.value || 330,
      loadOhms: 500
    };

    var STAGE_TEXT = {
      ac: {
        name: '1. Raw AC input',
        desc: '12 V RMS AC from a small transformer swings between +17 V and −17 V. Because half the wave is negative, its average DC value is 0 V.'
      },
      half: {
        name: '2. Half-wave (1 diode)',
        desc: 'A single diode blocks the negative half-cycles completely. Output stays one polarity, but leaves empty gaps half the time.'
      },
      full: {
        name: '3. Full-wave bridge',
        desc: 'Four diodes steer both half-cycles in the same direction, flipping negative valleys upward into steady positive humps.'
      },
      smooth: {
        name: '4. Filtered DC',
        desc: 'Adding a capacitor stores charge at each peak and supplies the load between peaks. Larger capacitance (or lighter load) shrinks ripple.'
      }
    };

    function simulateWaveform() {
      var vPeak = 17.0;
      var freq = 60;
      var cycles = 3;
      var steps = 360;
      var totalTime = cycles / freq;
      var dt = totalTime / steps;
      var capF = Math.max(1e-6, state.capUf * 1e-6);
      var rc = state.loadOhms * capF;

      var acPts = [];
      var outPts = [];
      var vCap = 0;

      for (var i = 0; i <= steps; i++) {
        var t = i * dt;
        var vAc = vPeak * Math.sin(TAU * freq * t);
        acPts.push(vAc);

        var vOut = vAc;
        if (state.stage === 'half') {
          vOut = Math.max(0, vAc - 0.7);
        } else if (state.stage === 'full' || state.stage === 'smooth') {
          var vBridge = Math.max(0, Math.abs(vAc) - 1.4);
          if (state.stage === 'full') {
            vOut = vBridge;
          } else {
            if (state.capUf <= 0) {
              vOut = vBridge;
            } else {
              vCap = vCap * Math.exp(-dt / rc);
              if (vBridge > vCap) vCap = vBridge;
              vOut = vCap;
            }
          }
        }
        outPts.push(vOut);
      }

      // Measure steady-state on last cycle
      var start = Math.floor(steps * (2 / 3));
      var sum = 0;
      var minV = Infinity;
      var maxV = -Infinity;
      var count = 0;
      for (var k = start; k <= steps; k++) {
        var val = outPts[k];
        sum += val;
        if (val < minV) minV = val;
        if (val > maxV) maxV = val;
        count++;
      }

      return {
        acPts: acPts,
        outPts: outPts,
        avg: sum / count,
        ripple: maxV - minV,
        minV: minV,
        maxV: maxV
      };
    }

    var surface;
    surface = SimKit.canvas2d(canvas, { box: canvas.parentElement, dpr: 2, onResize: function () { if (surface) draw(0); } });

    function draw() {
      var sim = simulateWaveform();
      var ctx = surface.ctx;
      var w = surface.width;
      var h = surface.height;
      ctx.clearRect(0, 0, w, h);

      var diagW = Math.min(w * 0.34, 240);
      var gx = diagW + 26;
      var gw = Math.max(100, w - gx - 16);
      var gyT = 30;
      var gyB = h - 24;
      var gMid = (gyT + gyB) / 2;
      var gScale = (gyB - gyT) / 40;

      // Left schematic block diagram
      var bx = 18;
      var by = h * 0.5;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx + 18, by - 36);
      ctx.lineTo(diagW - 12, by - 36);
      ctx.moveTo(bx + 18, by + 36);
      ctx.lineTo(diagW - 12, by + 36);
      ctx.stroke();

      // AC Source
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(bx + 20, by, 18, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#7dd3fc';
      ctx.font = '800 15px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('∿', bx + 20, by + 1);

      // Diode / Bridge box
      var midX = bx + (diagW - bx) * 0.5;
      roundRect(ctx, midX - 28, by - 48, 56, 32, 8);
      ctx.fillStyle = state.stage === 'ac' ? '#1e293b' : '#312e81';
      ctx.fill();
      ctx.strokeStyle = state.stage === 'ac' ? '#475569' : '#a78bfa';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 10px ' + FONT;
      ctx.fillText(state.stage === 'ac' ? 'Bypass' : (state.stage === 'half' ? '1 Diode' : '4-Diode'), midX, by - 32);

      // Capacitor branch
      if (state.stage === 'smooth') {
        var cxPos = diagW - 44;
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cxPos, by - 36);
        ctx.lineTo(cxPos, by - 6);
        ctx.moveTo(cxPos - 11, by - 6);
        ctx.lineTo(cxPos + 11, by - 6);
        ctx.moveTo(cxPos - 11, by + 6);
        ctx.lineTo(cxPos + 11, by + 6);
        ctx.moveTo(cxPos, by + 6);
        ctx.lineTo(cxPos, by + 36);
        ctx.stroke();
        ctx.fillStyle = '#86efac';
        ctx.font = '700 10px ' + FONT;
        ctx.fillText(state.capUf + 'µF', cxPos, by + 50);
      }

      // Load resistor on right of mini diagram
      var lx = diagW - 14;
      roundRect(ctx, lx - 8, by - 20, 16, 40, 4);
      ctx.fillStyle = '#fb923c';
      ctx.fill();
      ctx.fillStyle = '#fdba74';
      ctx.font = '700 10px ' + FONT;
      ctx.fillText(state.loadOhms + 'Ω', lx, by + 50);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 11px ' + FONT;
      ctx.fillText('Converter Stage', diagW * 0.52, 18);

      // Right waveform plot
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.12)';
      ctx.lineWidth = 1;
      for (var gxTick = 0; gxTick <= 6; gxTick++) {
        var xLine = gx + (gw * gxTick) / 6;
        ctx.beginPath();
        ctx.moveTo(xLine, gyT);
        ctx.lineTo(xLine, gyB);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
      ctx.beginPath();
      ctx.moveTo(gx, gMid);
      ctx.lineTo(gx + gw, gMid);
      ctx.stroke();

      // Ghost raw AC wave
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      sim.acPts.forEach(function (v, idx) {
        var px = gx + (idx / (sim.acPts.length - 1)) * gw;
        var py = gMid - v * gScale;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();

      // Average DC dashed line
      if (state.stage !== 'ac') {
        var avgY = gMid - sim.avg * gScale;
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(gx, avgY);
        ctx.lineTo(gx + gw, avgY);
        ctx.stroke();
        ctx.restore();
      }

      // Main output waveform
      ctx.strokeStyle = state.stage === 'ac' ? '#38bdf8' : (state.stage === 'smooth' ? '#4ade80' : '#fb923c');
      ctx.lineWidth = 3;
      ctx.beginPath();
      sim.outPts.forEach(function (v, idx) {
        var px = gx + (idx / (sim.outPts.length - 1)) * gw;
        var py = gMid - v * gScale;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 11px ' + FONT;
      ctx.textAlign = 'left';
      ctx.fillText('Output Waveform (over 3 AC cycles)', gx, 18);

      // Update readouts
      capOut.textContent = state.capUf + ' µF';
      capInput.disabled = state.stage !== 'smooth';
      capInput.parentElement.style.opacity = state.stage === 'smooth' ? '1' : '0.45';

      stageOut.textContent = STAGE_TEXT[state.stage].name;
      avgOut.textContent = sim.avg.toFixed(1) + ' V';
      rippleOut.textContent = sim.ripple.toFixed(1) + ' V p-p';
      explainEl.textContent = STAGE_TEXT[state.stage].desc;
    }

    stageBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.stage = btn.dataset.rectStage;
        stageBtns.forEach(function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        draw();
      });
    });

    loadBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.loadOhms = +btn.dataset.rectLoad;
        loadBtns.forEach(function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        draw();
      });
    });

    capInput.addEventListener('input', function () {
      state.capUf = +capInput.value;
      draw();
    });

    draw();
  }

  /* ───────────────────────────────────────────────────────────
     6. Device Current Classifier
     ─────────────────────────────────────────────────────────── */
  function initClassifier() {
    var cards = Array.from(document.querySelectorAll('.acd-sort-card'));
    var scoreEl = document.getElementById('acd-sort-score');
    var resetBtn = document.getElementById('acd-sort-reset');
    if (!cards.length || !scoreEl) return;

    var answered = 0;
    var correct = 0;

    function updateScore() {
      if (answered === 0) {
        scoreEl.textContent = '0 of ' + cards.length + ' classified';
      } else if (answered < cards.length) {
        scoreEl.textContent = correct + ' correct · ' + answered + ' of ' + cards.length + ' classified';
      } else {
        scoreEl.textContent = correct + ' / ' + cards.length + ' correct · ' +
          (correct === cards.length ? 'Excellent classification.' : 'Review the highlighted answers above.');
      }
    }

    cards.forEach(function (card) {
      var explain = card.querySelector('.acd-sort-explain');
      var buttons = Array.from(card.querySelectorAll('.acd-sort-options button'));
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (card.dataset.answered) return;
          card.dataset.answered = 'true';
          answered++;
          var ok = btn.dataset.choice === card.dataset.answer;
          if (ok) correct++;
          btn.classList.add(ok ? 'is-right' : 'is-wrong');
          btn.setAttribute('aria-pressed', 'true');
          if (!ok) {
            var rightBtn = card.querySelector('[data-choice="' + card.dataset.answer + '"]');
            if (rightBtn) rightBtn.classList.add('is-right');
          }
          buttons.forEach(function (b) { b.disabled = true; });
          if (explain && card.dataset.explain) {
            explain.textContent = (ok ? 'Correct: ' : 'Note: ') + card.dataset.explain;
          }
          updateScore();
        });
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        answered = 0;
        correct = 0;
        cards.forEach(function (card) {
          delete card.dataset.answered;
          var explain = card.querySelector('.acd-sort-explain');
          if (explain) explain.textContent = '';
          card.querySelectorAll('.acd-sort-options button').forEach(function (b) {
            b.disabled = false;
            b.classList.remove('is-right', 'is-wrong');
            b.setAttribute('aria-pressed', 'false');
          });
        });
        updateScore();
      });
    }

    updateScore();
  }

  /* ───────────────────────────────────────────────────────────
     7. Check Your Understanding Quiz
     ─────────────────────────────────────────────────────────── */
  function initQuiz() {
    var questions = Array.from(document.querySelectorAll('.acd-question'));
    var scoreEl = document.getElementById('acd-quiz-score');
    var resetBtn = document.getElementById('acd-quiz-reset');
    if (!questions.length || !scoreEl) return;

    function updateScore() {
      var checked = questions.filter(function (q) { return q.dataset.checked === 'true'; });
      var right = checked.filter(function (q) { return q.dataset.correct === 'true'; }).length;
      scoreEl.textContent = 'Score: ' + right + ' / ' + questions.length + ' · ' + checked.length + ' checked';
    }

    questions.forEach(function (q) {
      var opts = Array.from(q.querySelectorAll('.acd-q-opt'));
      var fb = q.querySelector('.acd-feedback');
      opts.forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (q.dataset.checked === 'true') return;
          var ok = btn.dataset.choice === q.dataset.answer;
          q.dataset.checked = 'true';
          q.dataset.correct = ok ? 'true' : 'false';
          btn.classList.add(ok ? 'is-right' : 'is-wrong');
          btn.setAttribute('aria-pressed', 'true');
          if (!ok) {
            var rightBtn = q.querySelector('.acd-q-opt[data-choice="' + q.dataset.answer + '"]');
            if (rightBtn) rightBtn.classList.add('is-right');
          }
          opts.forEach(function (b) { b.disabled = true; });
          if (fb) {
            fb.className = 'acd-feedback ' + (ok ? 'ok' : 'no');
            fb.textContent = (ok ? 'Correct. ' : 'Not yet. ') + q.dataset.explain;
          }
          updateScore();
        });
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        questions.forEach(function (q) {
          delete q.dataset.checked;
          delete q.dataset.correct;
          var fb = q.querySelector('.acd-feedback');
          if (fb) {
            fb.className = 'acd-feedback';
            fb.textContent = '';
          }
          q.querySelectorAll('.acd-q-opt').forEach(function (b) {
            b.disabled = false;
            b.classList.remove('is-right', 'is-wrong');
            b.setAttribute('aria-pressed', 'false');
          });
        });
        updateScore();
        var firstBtn = questions[0].querySelector('.acd-q-opt');
        if (firstBtn) firstBtn.focus();
      });
    }

    updateScore();
  }

  /* ───────────────────────────────────────────────────────────
     8. Sticky Jump Navigation
     ─────────────────────────────────────────────────────────── */
  function initJumpNav() {
    var jump = document.querySelector('.acd-jump');
    if (!jump) return;
    var links = Array.from(jump.querySelectorAll('a'));

    function updateNav() {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      jump.style.setProperty('--acd-progress', Math.min(1, scrollTop / maxScroll).toFixed(3));
      var marker = scrollTop + window.innerHeight * 0.3;
      var active = links[0];
      links.forEach(function (link) {
        var target = document.querySelector(link.getAttribute('href'));
        if (target && target.offsetTop <= marker) active = link;
      });
      links.forEach(function (link) {
        var on = link === active;
        link.classList.toggle('is-active', on);
        if (on) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }

    window.addEventListener('scroll', updateNav, { passive: true });
    window.addEventListener('resize', updateNav);
    updateNav();
  }

  initWaveLab();
  initCycleLab();
  initGridLab();
  initTransformerLab();
  initRectifierLab();
  initClassifier();
  initQuiz();
  initJumpNav();
})();
