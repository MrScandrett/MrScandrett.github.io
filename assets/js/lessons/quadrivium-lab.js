(function (global) {
  'use strict';

  var Core = global.QuadriviumCore;
  var SimKit = global.SimKit;
  if (!Core || !SimKit) return;

  var host = document.getElementById('qv-ratio-lab');
  if (!host) return;

  var state = {
    num: 3,
    den: 2,
    baseHz: 220,
    playingMotion: true,
    t: 0,
    pluckAge: 99,
    pluckTarget: 'both',
    audioCtx: null
  };

  var theme = SimKit.theme.colors();
  var isDark = function () {
    return document.documentElement.dataset.lighting === 'night';
  };

  var canvas = host.querySelector('#qv-canvas');
  var numInput = host.querySelector('#qv-num');
  var denInput = host.querySelector('#qv-den');
  var numOut = host.querySelector('#qv-num-out');
  var denOut = host.querySelector('#qv-den-out');
  var baseSelect = host.querySelector('#qv-base-hz');
  var readoutEl = host.querySelector('#qv-lab-readout');
  var presetBar = host.querySelector('#qv-preset-bar');
  var motionBtn = host.querySelector('#qv-toggle-motion');

  if (!canvas) return;

  // Build preset buttons
  Core.PRESETS.forEach(function (preset) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = preset.label;
    btn.dataset.preset = preset.id;
    btn.setAttribute('aria-pressed', String(preset.num === state.num && preset.den === state.den));
    btn.addEventListener('click', function () {
      state.num = preset.num;
      state.den = preset.den;
      numInput.value = String(preset.num);
      denInput.value = String(preset.den);
      syncOutputs();
      triggerPluck('both');
    });
    presetBar.appendChild(btn);
  });

  function findPreset(p, q) {
    for (var i = 0; i < Core.PRESETS.length; i++) {
      var pr = Core.reduceRatio(Core.PRESETS[i].num, Core.PRESETS[i].den);
      if (pr.num === p && pr.den === q) return Core.PRESETS[i];
    }
    return null;
  }

  function syncOutputs() {
    var r = Core.reduceRatio(state.num, state.den);
    var freq = Core.frequencyFromRatio(state.baseHz, r.num, r.den);
    var stop = Core.stringStopFraction(r.num, r.den);
    var cents = Core.centsFromRatio(r.num, r.den);
    var rank = Core.consonanceRank(r.num, r.den);
    var preset = findPreset(r.num, r.den);

    numOut.textContent = String(state.num);
    denOut.textContent = String(state.den);

    presetBar.querySelectorAll('button[data-preset]').forEach(function (b) {
      var pr = Core.PRESETS.find(function (x) { return x.id === b.dataset.preset; });
      var red = pr ? Core.reduceRatio(pr.num, pr.den) : null;
      var active = Boolean(red && red.num === r.num && red.den === r.den);
      b.setAttribute('aria-pressed', String(active));
    });

    var stopText = stop <= 1
      ? 'Stopped string = ' + Math.round(stop * 1000) / 10 + '% of full length'
      : 'Longer string = ' + stop.toFixed(2) + 'x full length (lower pitch)';

    readoutEl.textContent =
      'Reduced ratio ' + r.label + (r.gcd > 1 ? ' (from ' + state.num + ':' + state.den + ')' : '') +
      ' · ' + (preset ? preset.interval : rank.tier) +
      ' · ' + state.baseHz + ' Hz vs ' + freq.toFixed(1) + ' Hz (' + (cents >= 0 ? '+' : '') + Math.round(cents) + ' cents)' +
      ' · ' + stopText +
      ' · ' + Math.abs(r.num - r.den) + ' orbital conjunction(s) per ' + r.den + ' outer orbit(s).';
  }

  function ensureAudio() {
    if (!state.audioCtx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      state.audioCtx = new AC();
    }
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume().catch(function () {});
    }
    return state.audioCtx;
  }

  function playPluckedNote(ctx, freq, delaySec, gainLevel) {
    var start = ctx.currentTime + delaySec;
    var osc1 = ctx.createOscillator();
    var osc2 = ctx.createOscillator();
    var filter = ctx.createBiquadFilter();
    var gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, start);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, start);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(4200, freq * 6), start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 1.8), start + 1.1);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(gainLevel, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.35);

    var harmGain = ctx.createGain();
    harmGain.gain.value = 0.28;

    osc1.connect(filter);
    osc2.connect(harmGain);
    harmGain.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(start);
    osc2.start(start);
    osc1.stop(start + 1.4);
    osc2.stop(start + 1.4);
  }

  function triggerPluck(which) {
    state.pluckAge = 0;
    state.pluckTarget = which;
    var ctx = ensureAudio();
    if (!ctx) return;
    var f0 = state.baseHz;
    var f1 = Core.frequencyFromRatio(f0, state.num, state.den);
    if (which === 'root') {
      playPluckedNote(ctx, f0, 0, 0.14);
    } else if (which === 'ratio') {
      playPluckedNote(ctx, f1, 0, 0.14);
    } else {
      playPluckedNote(ctx, f0, 0, 0.11);
      playPluckedNote(ctx, f1, 0.06, 0.11);
    }
  }

  host.querySelectorAll('[data-pluck]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      triggerPluck(btn.dataset.pluck);
    });
  });

  numInput.addEventListener('input', function () {
    state.num = Number(numInput.value);
    syncOutputs();
  });
  denInput.addEventListener('input', function () {
    state.den = Number(denInput.value);
    syncOutputs();
  });
  baseSelect.addEventListener('change', function () {
    state.baseHz = Number(baseSelect.value);
    syncOutputs();
    triggerPluck('both');
  });

  motionBtn.addEventListener('click', function () {
    state.playingMotion = !state.playingMotion;
    motionBtn.setAttribute('aria-pressed', String(state.playingMotion));
    motionBtn.textContent = state.playingMotion ? 'Pause Motion' : 'Resume Motion';
  });

  var c2d = null;
  c2d = SimKit.canvas2d(canvas, {
    height: 440,
    onResize: function () { if (c2d && c2d.width && c2d.height) render(0); }
  });

  function palette() {
    var dark = isDark();
    return {
      bg: dark ? '#171923' : '#f8f9fc',
      panel: dark ? '#202432' : '#ffffff',
      border: dark ? 'rgba(255,255,255,0.14)' : 'rgba(23,33,43,0.14)',
      ink: theme.text || (dark ? '#f5f5f7' : '#1e1b4b'),
      muted: dark ? '#a1a8bd' : '#526075',
      arith: dark ? '#60a5fa' : '#2563eb',
      geom: dark ? '#a78bfa' : '#7c3aed',
      music: dark ? '#f472b6' : '#db2777',
      astro: dark ? '#22d3ee' : '#0891b2',
      gold: dark ? '#fbbf24' : '#d97706'
    };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawQuadrantFrame(ctx, x, y, w, h, accent, kicker, title, pal) {
    roundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = pal.panel;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = pal.border;
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.fillRect(x, y + 8, 3.5, h - 16);

    ctx.font = '700 10px system-ui, sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText(kicker.toUpperCase(), x + 12, y + 20);

    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillStyle = pal.ink;
    ctx.fillText(title, x + 12, y + 36);
  }

  function drawArithmetic(ctx, x, y, w, h, r, pal) {
    drawQuadrantFrame(ctx, x, y, w, h, pal.arith, 'Pure · At Rest', 'Arithmetic: ' + r.label, pal);
    var padX = x + 14;
    var rowW = w - 28;
    var maxUnits = Math.max(r.num, r.den, 1);
    var unitW = Math.min(20, Math.max(6, (rowW - 40) / maxUnits));
    var gap = Math.min(3, Math.max(1, unitW * 0.16));

    // Numerator blocks
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillStyle = pal.muted;
    ctx.fillText('Count A = ' + r.num, padX, y + 60);
    for (var i = 0; i < r.num; i++) {
      ctx.fillStyle = pal.arith;
      ctx.fillRect(padX + i * (unitW + gap), y + 66, unitW - 1, 16);
    }

    // Denominator blocks
    ctx.fillStyle = pal.muted;
    ctx.fillText('Count B = ' + r.den, padX, y + 104);
    for (var j = 0; j < r.den; j++) {
      ctx.fillStyle = pal.gold;
      ctx.fillRect(padX + j * (unitW + gap), y + 110, unitW - 1, 16);
    }

    // Factor & Tenney height summary
    var rank = Core.consonanceRank(r.num, r.den);
    var cents = Math.round(Core.centsFromRatio(r.num, r.den));
    ctx.font = '700 12px ui-monospace, monospace';
    ctx.fillStyle = pal.ink;
    ctx.fillText('×' + r.factor.toFixed(3) + '  (' + (cents >= 0 ? '+' : '') + cents + '¢)', padX, y + h - 34);
    ctx.font = '500 11px system-ui, sans-serif';
    ctx.fillStyle = pal.muted;
    ctx.fillText(rank.tier + ' · complexity ' + rank.complexity.toFixed(2), padX, y + h - 16);
  }

  function drawGeometry(ctx, x, y, w, h, r, pal) {
    drawQuadrantFrame(ctx, x, y, w, h, pal.geom, 'Applied · At Rest', 'Geometry: ' + r.num + ' × ' + r.den + ' space', pal);
    var availW = w - 34;
    var availH = h - 70;
    var scale = Math.min(availW / r.num, availH / r.den);
    var rw = r.num * scale;
    var rh = r.den * scale;
    var rx = x + (w - rw) / 2;
    var ry = y + 46 + (availH - rh) / 2;

    ctx.fillStyle = isDark() ? 'rgba(167,139,250,0.14)' : 'rgba(124,58,237,0.09)';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = pal.geom;
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, rw, rh);

    // Euclidean square tiling grid (1×1 unit squares of reduced ratio)
    ctx.lineWidth = 0.75;
    ctx.strokeStyle = isDark() ? 'rgba(167,139,250,0.35)' : 'rgba(124,58,237,0.3)';
    for (var col = 1; col < r.num; col++) {
      ctx.beginPath();
      ctx.moveTo(rx + col * scale, ry);
      ctx.lineTo(rx + col * scale, ry + rh);
      ctx.stroke();
    }
    for (var row = 1; row < r.den; row++) {
      ctx.beginPath();
      ctx.moveTo(rx, ry + row * scale);
      ctx.lineTo(rx + rw, ry + row * scale);
      ctx.stroke();
    }

    // Diagonal showing geometric proportion slope
    ctx.beginPath();
    ctx.moveTo(rx, ry + rh);
    ctx.lineTo(rx + rw, ry);
    ctx.strokeStyle = pal.gold;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  function drawMusic(ctx, x, y, w, h, r, pal) {
    var f0 = state.baseHz;
    var f1 = Core.frequencyFromRatio(f0, r.num, r.den);
    drawQuadrantFrame(ctx, x, y, w, h, pal.music, 'Pure · In Time', 'Music: Monochord Strings', pal);

    var sx = x + 16;
    var maxLen = w - 32;
    var stop = Core.stringStopFraction(r.num, r.den);
    var lenA = stop <= 1 ? maxLen : maxLen / stop;
    var lenB = stop <= 1 ? maxLen * stop : maxLen;

    var yA = y + 84;
    var yB = y + 144;
    var decay = Math.exp(-state.pluckAge * 1.6);
    var ampRoot = (state.pluckTarget === 'ratio' ? 0 : 1) * decay * 9 + (state.playingMotion ? 2.5 : 0);
    var ampRatio = (state.pluckTarget === 'root' ? 0 : 1) * decay * 9 + (state.playingMotion ? 2.5 : 0);

    function drawString(sy, len, cycles, amp, color, label) {
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillStyle = pal.muted;
      ctx.fillText(label, sx, sy - 16);

      // Fixed nuts
      ctx.fillStyle = pal.ink;
      ctx.fillRect(sx - 2, sy - 7, 4, 14);
      ctx.fillRect(sx + len - 2, sy - 7, 4, 14);

      // Dead portion after bridge
      if (len < maxLen - 2) {
        ctx.beginPath();
        ctx.moveTo(sx + len, sy);
        ctx.lineTo(sx + maxLen, sy);
        ctx.strokeStyle = pal.border;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Vibrating wave
      ctx.beginPath();
      var steps = 64;
      var phase = Math.sin(state.t * cycles * 10);
      for (var i = 0; i <= steps; i++) {
        var u = i / steps;
        var px = sx + u * len;
        var py = sy + Math.sin(Math.PI * u) * phase * amp;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }

    drawString(yA, lenA, 1, ampRoot, pal.arith, 'Root string (1/1) · ' + f0.toFixed(1) + ' Hz');
    drawString(yB, lenB, r.factor, ampRatio, pal.music, 'Bridge at ' + r.den + '/' + r.num + ' · ' + f1.toFixed(1) + ' Hz');
  }

  function drawAstronomy(ctx, x, y, w, h, r, pal) {
    drawQuadrantFrame(ctx, x, y, w, h, pal.astro, 'Applied · In Motion', 'Astronomy: ' + r.label + ' Orbital Dance', pal);
    var cx = x + w * 0.5;
    var cy = y + 42 + (h - 54) * 0.5;
    var outerR = Math.min(w, h - 58) * 0.41;
    var innerR = outerR * 0.56;

    // Draw harmonic conjunction chord rose (Earth-Venus style pattern)
    var totalTurns = Math.min(r.den, 12);
    var samples = Math.min(180, Math.max(48, totalTurns * 18));
    ctx.strokeStyle = isDark() ? 'rgba(34,211,238,0.22)' : 'rgba(8,145,178,0.2)';
    ctx.lineWidth = 0.9;
    for (var i = 0; i < samples; i++) {
      var frac = (i / samples) * totalTurns;
      var pos = Core.orbitalResonancePositions(frac, r.num, r.den);
      ctx.beginPath();
      ctx.moveTo(cx + pos.inner.x * innerR, cy + pos.inner.y * innerR);
      ctx.lineTo(cx + pos.outer.x * outerR, cy + pos.outer.y * outerR);
      ctx.stroke();
    }

    // Orbits
    ctx.strokeStyle = pal.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.stroke();

    // Central sun
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = pal.gold;
    ctx.fill();

    // Moving bodies + live conjunction chord
    var now = Core.orbitalResonancePositions(state.t * 0.18, r.num, r.den);
    var ix = cx + now.inner.x * innerR;
    var iy = cy + now.inner.y * innerR;
    var ox = cx + now.outer.x * outerR;
    var oy = cy + now.outer.y * outerR;

    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(ox, oy);
    ctx.strokeStyle = pal.astro;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ix, iy, 5, 0, Math.PI * 2);
    ctx.fillStyle = pal.music;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ox, oy, 6, 0, Math.PI * 2);
    ctx.fillStyle = pal.astro;
    ctx.fill();

    ctx.font = '600 10.5px system-ui, sans-serif';
    ctx.fillStyle = pal.muted;
    ctx.fillText(now.conjunctionsPerCycle + ' conjunctions / ' + r.den + ' outer rev', x + 12, y + h - 12);
  }

  function render(dt) {
    var safeDt = Math.min(0.05, Math.max(0, dt || 0));
    if (state.playingMotion) {
      state.t += safeDt;
    }
    state.pluckAge += safeDt;

    var w = c2d.width;
    var h = c2d.height;
    var ctx = c2d.ctx;
    var pal = palette();
    var r = Core.reduceRatio(state.num, state.den);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);

    var gap = w < 460 ? 6 : 10;
    var cw = Math.floor((w - gap * 3) / 2);
    var ch = Math.floor((h - gap * 3) / 2);
    drawArithmetic(ctx, gap, gap, cw, ch, r, pal);
    drawGeometry(ctx, gap * 2 + cw, gap, cw, ch, r, pal);
    drawMusic(ctx, gap, gap * 2 + ch, cw, ch, r, pal);
    drawAstronomy(ctx, gap * 2 + cw, gap * 2 + ch, cw, ch, r, pal);
  }

  SimKit.theme.onChange(function (colors) {
    theme = colors;
    render(0);
  });

  syncOutputs();
  render(0);
  SimKit.loop(render, { el: canvas, maxDt: 0.05 });
}(window));
