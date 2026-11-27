(function () {
  'use strict';

  var Core = window.HowSpreadOutCore;
  if (!Core || !window.SimKit) return;

  var TAU = Math.PI * 2;
  var BLUE = '#2563eb';
  var ORANGE = '#ea580c';
  var GREEN = '#16a34a';
  var RED = '#dc2626';

  function $(id) { return document.getElementById(id); }
  function col() { return SimKit.theme.colors(); }
  var f2 = Core.f2;

  function line(ctx, x1, y1, x2, y2, color, w, dash) {
    ctx.beginPath();
    ctx.setLineDash(dash || []);
    ctx.strokeStyle = color;
    ctx.lineWidth = w || 1;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function dot(ctx, x, y, r, color, stroke) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }

  function label(ctx, t, x, y, color, align, size) {
    ctx.fillStyle = color;
    ctx.font = '600 ' + (size || 11) + "px 'IBM Plex Mono', monospace";
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, x, y);
  }

  function mk(id, boxId, draw) {
    return SimKit.canvas2d($(id), { box: $(boxId), onResize: function () { draw(); } });
  }

  /* ── Lab 1: Draggable Dot Plot + Box Plot + Deviations ─────────────── */
  var vals = Core.PRESETS.even.slice();
  var dpKit = null;
  var pos = [];
  var dragging = -1;
  var hovered = -1;
  var showDeviations = false;

  function layout(w, h) {
    var L = 24;
    var R = 24;
    var base = h - 104;
    var r = 8.5;
    var counts = {};
    var out = [];
    function X(v) { return L + (v / 20) * (w - L - R); }
    vals.forEach(function (v, i) {
      var key = Math.round(v * 2);
      var k = counts[key] || 0;
      counts[key] = k + 1;
      out.push({ x: X(v), y: base - r - k * (2 * r + 1), r: r, i: i });
    });
    return { X: X, pts: out, base: base, L: L, R: R };
  }

  function drawDots() {
    if (!dpKit) return;
    var c = col();
    var ctx = dpKit.ctx;
    var w = dpKit.width;
    var h = dpKit.height;
    var st = Core.computeSpreadStats(vals);
    var g = layout(w, h);
    pos = g.pts;
    ctx.clearRect(0, 0, w, h);

    // ±1σ shaded band
    var bandL = g.X(Math.max(0, st.mean - st.sd));
    var bandR = g.X(Math.min(20, st.mean + st.sd));
    ctx.fillStyle = 'rgba(37,99,235,0.13)';
    ctx.fillRect(bandL, 6, Math.max(0, bandR - bandL), g.base - 2);

    // Optional per-dot deviation segments to mean line
    if (showDeviations) {
      var mx = g.X(st.mean);
      g.pts.forEach(function (p) {
        var dev = vals[p.i] - st.mean;
        if (Math.abs(dev) > 0.05) {
          line(ctx, mx, p.y, p.x, p.y, dev > 0 ? 'rgba(22,163,74,0.55)' : 'rgba(220,38,38,0.55)', 2);
        }
      });
    }

    // Number line
    line(ctx, g.L, g.base + 2, w - g.R, g.base + 2, c.text, 1.5);
    for (var t = 0; t <= 20; t += 2) {
      line(ctx, g.X(t), g.base + 2, g.X(t), g.base + 7, c.textMuted, 1);
      label(ctx, String(t), g.X(t), g.base + 17, c.textMuted, 'center', 10);
    }

    // Mean line + label (flip side near right edge so it never clips)
    var meanX = g.X(st.mean);
    line(ctx, meanX, 6, meanX, g.base + 2, ORANGE, 2, [5, 4]);
    var nearRight = st.mean > 15;
    label(ctx, 'mean ' + f2(st.mean), meanX + (nearRight ? -6 : 6), 15, ORANGE, nearRight ? 'right' : 'left', 11);

    // Dots
    g.pts.forEach(function (p) {
      var isOut = vals[p.i] < st.lo || vals[p.i] > st.hi;
      var isFocus = p.i === dragging || p.i === hovered;
      dot(ctx, p.x, p.y, isFocus ? p.r + 1.5 : p.r, isOut ? RED : BLUE, isFocus ? c.text : null);
    });

    // Box plot + 1.5×IQR outlier fence ticks
    var by = h - 42;
    if (st.lo >= 0 && st.lo <= 20) {
      line(ctx, g.X(st.lo), by - 16, g.X(st.lo), by + 16, RED, 1.2, [3, 3]);
    }
    if (st.hi >= 0 && st.hi <= 20) {
      line(ctx, g.X(st.hi), by - 16, g.X(st.hi), by + 16, RED, 1.2, [3, 3]);
    }

    line(ctx, g.X(st.whiskerLow), by, g.X(st.whiskerHigh), by, c.text, 1.5);
    line(ctx, g.X(st.whiskerLow), by - 7, g.X(st.whiskerLow), by + 7, c.text, 1.5);
    line(ctx, g.X(st.whiskerHigh), by - 7, g.X(st.whiskerHigh), by + 7, c.text, 1.5);

    ctx.fillStyle = 'rgba(22,163,74,0.28)';
    ctx.fillRect(g.X(st.q1), by - 12, Math.max(2, g.X(st.q3) - g.X(st.q1)), 24);
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2;
    ctx.strokeRect(g.X(st.q1), by - 12, Math.max(2, g.X(st.q3) - g.X(st.q1)), 24);
    line(ctx, g.X(st.med), by - 12, g.X(st.med), by + 12, c.text, 3);

    st.outliers.forEach(function (v) {
      dot(ctx, g.X(v), by, 4.5, RED);
    });
    label(ctx, 'box plot & 1.5×IQR fences', 8, h - 10, c.textMuted, 'left', 10);
  }

  function updateMissions(st) {
    var res = Core.evaluateMissions(vals, st);
    var pill = $('hs-mission-pill');
    var list = $('hs-missions');
    if (pill) pill.textContent = 'Missions: ' + res.doneCount + '/' + res.total;
    if (list) {
      list.innerHTML = '';
      res.items.forEach(function (m) {
        var chip = document.createElement('div');
        chip.className = 'hs-mission-chip' + (m.done ? ' is-done' : '');
        chip.innerHTML = '<span class="hs-mission-mark">' + (m.done ? '✓' : '') + '</span><span>' + m.label + '</span>';
        list.appendChild(chip);
      });
    }
  }

  function updateDots() {
    var st = Core.computeSpreadStats(vals);
    $('dp-mean').textContent = f2(st.mean);
    $('dp-med').textContent = f2(st.med);
    $('dp-range').textContent = f2(st.range);
    $('dp-q').textContent = f2(st.q1) + ' · ' + f2(st.q3);
    $('dp-iqr').textContent = f2(st.iqr);
    $('dp-sd').textContent = f2(st.sd);
    if ($('dp-mad')) $('dp-mad').textContent = f2(st.mad);
    if ($('dp-var')) $('dp-var').textContent = f2(st.variance);

    // Sync sidebar live readouts
    if ($('hs-p-mean')) $('hs-p-mean').textContent = f2(st.mean);
    if ($('hs-p-iqr')) $('hs-p-iqr').textContent = f2(st.iqr);
    if ($('hs-p-sd')) $('hs-p-sd').textContent = f2(st.sd);
    if ($('hs-p-out')) $('hs-p-out').textContent = String(st.outliers.length);

    var focusIdx = dragging >= 0 ? dragging : hovered;
    var focusNote = '';
    if (focusIdx >= 0 && focusIdx < vals.length) {
      var d = vals[focusIdx] - st.mean;
      focusNote = 'Selected dot = ' + f2(vals[focusIdx]) + ' (distance from mean: ' + (d >= 0 ? '+' : '') + f2(d) + '). ';
    }

    $('dp-note').textContent = focusNote + (st.outliers.length
      ? 'Outlier' + (st.outliers.length > 1 ? 's' : '') + ' (beyond ' + f2(st.lo) + ' and ' + f2(st.hi) + '): ' +
        st.outliers.map(function (v) { return f2(v); }).join(', ') + '. Notice how far σ moved compared with the IQR.'
      : 'No outliers by the 1.5 × IQR rule (fences at ' + f2(st.lo) + ' and ' + f2(st.hi) + ').');

    if ($('dp-add')) $('dp-add').disabled = vals.length >= 14;
    if ($('dp-rem')) $('dp-rem').disabled = vals.length <= 4;

    var idxInput = $('dp-idx');
    if (idxInput) {
      idxInput.max = String(vals.length);
      if (Number(idxInput.value) > vals.length) idxInput.value = String(vals.length);
    }

    updateMissions(st);
    drawDots();
  }

  dpKit = mk('dp-canvas', 'dp-box', drawDots);
  var cvd = $('dp-canvas');

  function valueAt(e) {
    var rect = cvd.getBoundingClientRect();
    var w = rect.width;
    var L = 24;
    var R = 24;
    return Math.max(0, Math.min(20, Math.round(((e.clientX - rect.left - L) / Math.max(1, w - L - R)) * 20 * 2) / 2));
  }

  cvd.addEventListener('pointerdown', function (e) {
    var rect = cvd.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    var best = -1;
    var bd = 22;
    pos.forEach(function (p) {
      var d = Math.hypot(p.x - mx, p.y - my);
      if (d < bd) { bd = d; best = p.i; }
    });
    if (best >= 0) {
      dragging = best;
      hovered = best;
      try { cvd.setPointerCapture(e.pointerId); } catch (_) {}
      updateDots();
    } else if (my >= rect.height - 130 && my <= rect.height - 80 && vals.length < 14) {
      vals.push(valueAt(e));
      hovered = vals.length - 1;
      syncKb();
      updateDots();
    }
  });

  cvd.addEventListener('pointermove', function (e) {
    if (dragging >= 0) {
      vals[dragging] = valueAt(e);
      syncKb();
      updateDots();
      return;
    }
    var rect = cvd.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    var best = -1;
    var bd = 20;
    pos.forEach(function (p) {
      var d = Math.hypot(p.x - mx, p.y - my);
      if (d < bd) { bd = d; best = p.i; }
    });
    if (best !== hovered) {
      hovered = best;
      cvd.style.cursor = best >= 0 ? 'grab' : 'default';
      updateDots();
    }
  });

  function endDrag() {
    if (dragging >= 0) {
      dragging = -1;
      updateDots();
    }
  }
  cvd.addEventListener('pointerup', endDrag);
  cvd.addEventListener('pointercancel', endDrag);
  cvd.addEventListener('pointerleave', function () {
    if (dragging < 0 && hovered >= 0) {
      hovered = -1;
      updateDots();
    }
  });

  $('dp-presets').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-set]');
    if (!b) return;
    vals = Core.PRESETS[b.dataset.set].slice();
    hovered = -1;
    this.querySelectorAll('button[data-set]').forEach(function (x) {
      x.classList.toggle('primary', x === b);
    });
    syncKb();
    updateDots();
  });

  if ($('dp-add')) {
    $('dp-add').addEventListener('click', function () {
      if (vals.length >= 14) return;
      var nextVal = [10, 7, 13, 8.5, 11.5][vals.length % 5];
      vals.push(nextVal);
      syncKb();
      updateDots();
    });
  }
  if ($('dp-rem')) {
    $('dp-rem').addEventListener('click', function () {
      if (vals.length <= 4) return;
      vals.pop();
      hovered = -1;
      syncKb();
      updateDots();
    });
  }
  if ($('dp-devs')) {
    $('dp-devs').addEventListener('change', function () {
      showDeviations = this.checked;
      drawDots();
    });
  }

  function syncKb() {
    var idxEl = $('dp-idx');
    var valEl = $('dp-val');
    if (!idxEl || !valEl) return;
    var i = Math.max(0, Math.min(vals.length - 1, Number(idxEl.value) - 1));
    idxEl.value = String(i + 1);
    $('dp-idxv').textContent = String(i + 1);
    valEl.value = String(vals[i]);
    $('dp-valv').textContent = String(vals[i]);
  }

  $('dp-keyboard').addEventListener('change', function () {
    $('dp-kb').hidden = !this.checked;
    syncKb();
  });
  $('dp-idx').addEventListener('input', syncKb);
  $('dp-val').addEventListener('input', function () {
    var i = Number($('dp-idx').value) - 1;
    vals[i] = Number(this.value);
    $('dp-valv').textContent = this.value;
    updateDots();
  });

  /* ── Lab 2: Same Mean, Different Story + Target Threshold ──────────── */
  var cpKit = null;

  function drawCompare() {
    if (!cpKit) return;
    var c = col();
    var ctx = cpKit.ctx;
    var w = cpKit.width;
    var h = cpKit.height;
    var L = 24;
    var R = 24;
    var sB = Number($('cp-sd').value);
    var target = $('cp-target') ? Number($('cp-target').value) : 8;

    function X(v) { return L + ((v + 2) / 24) * (w - L - R); }
    ctx.clearRect(0, 0, w, h);

    var teamA = Core.teamValues(1.5, 10);
    var teamB = Core.teamValues(sB, 10);

    [['Team A', teamA, 1.5, h * 0.28, BLUE], ['Team B', teamB, sB, h * 0.68, ORANGE]].forEach(function (t) {
      var y = t[3];
      var st = Core.computeSpreadStats(t[1]);
      line(ctx, X(-2), y + 14, X(22), y + 14, c.textMuted, 1);

      // ±1σ band
      ctx.fillStyle = t[4] === BLUE ? 'rgba(37,99,235,0.12)' : 'rgba(234,88,12,0.12)';
      ctx.fillRect(X(10 - t[2]), y - 34, X(10 + t[2]) - X(10 - t[2]), 46);

      // Compact IQR box underneath axis
      var by = y + 26;
      line(ctx, X(st.min), by, X(st.max), by, c.textMuted, 1.2);
      ctx.fillStyle = t[4] === BLUE ? 'rgba(37,99,235,0.22)' : 'rgba(234,88,12,0.22)';
      ctx.fillRect(X(st.q1), by - 5, Math.max(2, X(st.q3) - X(st.q1)), 10);
      ctx.strokeStyle = t[4];
      ctx.lineWidth = 1.4;
      ctx.strokeRect(X(st.q1), by - 5, Math.max(2, X(st.q3) - X(st.q1)), 10);

      var counts = {};
      t[1].forEach(function (v) {
        var key = Math.round(v * 2);
        var k = counts[key] || 0;
        counts[key] = k + 1;
        dot(ctx, X(v), y + 6 - k * 12, 5.5, t[4]);
      });
      label(ctx, t[0], 6, y - 30, c.text, 'left', 11);
    });

    // Shared mean line
    line(ctx, X(10), 10, X(10), h - 18, c.text, 1.5, [5, 4]);
    label(ctx, 'mean 10', X(10), 10, c.text, 'center', 10);

    // Target threshold line
    var tx = X(target);
    line(ctx, tx, 20, tx, h - 18, GREEN, 2, [4, 3]);
    label(ctx, '≥ ' + target, tx + (target > 16 ? -6 : 6), 24, GREEN, target > 16 ? 'right' : 'left', 10);

    for (var v = 0; v <= 20; v += 5) {
      label(ctx, String(v), X(v), h - 6, c.textMuted, 'center', 10);
    }
  }

  function updateCompare() {
    var s = Number($('cp-sd').value);
    var target = $('cp-target') ? Number($('cp-target').value) : 8;
    $('cp-sdv').textContent = s.toFixed(1);
    if ($('cp-targetv')) $('cp-targetv').textContent = String(target);

    var teamA = Core.teamValues(1.5, 10);
    var teamB = Core.teamValues(s, 10);
    var thA = Core.thresholdSummary(teamA, target);
    var thB = Core.thresholdSummary(teamB, target);

    $('cp-a').textContent = '10 · ' + f2(Core.sd(teamA), 1);
    $('cp-b').textContent = '10 · ' + f2(Core.sd(teamB), 1);
    if ($('cp-a-hit')) $('cp-a-hit').textContent = thA.count + '/10 (' + Math.round(thA.pct) + '%)';
    if ($('cp-b-hit')) $('cp-b-hit').textContent = thB.count + '/10 (' + Math.round(thB.pct) + '%)';
    drawCompare();
  }

  cpKit = mk('cp-canvas', 'cp-box', drawCompare);
  $('cp-sd').addEventListener('input', updateCompare);
  if ($('cp-target')) $('cp-target').addEventListener('input', updateCompare);

  if ($('cp-presets')) {
    $('cp-presets').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-target]');
      if (!btn) return;
      if ($('cp-target')) $('cp-target').value = btn.dataset.target;
      if (btn.dataset.sd) $('cp-sd').value = btn.dataset.sd;
      updateCompare();
    });
  }

  if ($('cp-sim-btn')) {
    $('cp-sim-btn').addEventListener('click', function () {
      var sB = Number($('cp-sd').value);
      var target = $('cp-target') ? Number($('cp-target').value) : 8;
      var simA = Core.simulateSeason(10, 1.5, 20);
      var simB = Core.simulateSeason(10, sB, 20);
      var resA = Core.thresholdSummary(simA, target);
      var resB = Core.thresholdSummary(simB, target);
      var box = $('cp-season-out');
      if (box) {
        box.hidden = false;
        box.textContent = '20-game simulated season (target ≥ ' + target + '): Team A cleared it ' +
          resA.count + '/20 games (' + Math.round(resA.pct) + '%), while Team B cleared it ' +
          resB.count + '/20 games (' + Math.round(resB.pct) + '%).';
      }
    });
  }

  if ($('cp-reset-btn')) {
    $('cp-reset-btn').addEventListener('click', function () {
      $('cp-sd').value = '4';
      if ($('cp-target')) $('cp-target').value = '8';
      if ($('cp-season-out')) $('cp-season-out').hidden = true;
      updateCompare();
    });
  }

  /* ── Lab 3: Bell Curve + Axis Scale Toggle + z-Score Duel ─────────── */
  var bcKit = null;
  var bellAxisMode = 'fixed';
  var draggingBellX = false;

  function drawBell() {
    if (!bcKit) return;
    var c = col();
    var ctx = bcKit.ctx;
    var w = bcKit.width;
    var h = bcKit.height;
    var mu = Number($('bc-mu').value);
    var sg = Number($('bc-sg').value);
    var xv = parseFloat($('bc-x').value);
    var L = 20;
    var R = 20;
    var T = 26;
    var B = 32;

    ctx.clearRect(0, 0, w, h);

    var xMin = bellAxisMode === 'fixed' ? 0 : mu - 4 * sg;
    var xMax = bellAxisMode === 'fixed' ? 140 : mu + 4 * sg;
    var maxPeak = bellAxisMode === 'fixed'
      ? Core.normalPdf(mu, mu, 4)
      : Core.normalPdf(mu, mu, sg);

    function X(val) { return L + ((val - xMin) / (xMax - xMin)) * (w - L - R); }
    function Y(val) {
      var density = Core.normalPdf(val, mu, sg);
      var normH = Math.min(1, density / maxPeak);
      return h - B - normH * (h - T - B);
    }

    // 3σ, 2σ, 1σ shaded bands
    [[3, 'rgba(22,163,74,0.12)'], [2, 'rgba(22,163,74,0.22)'], [1, 'rgba(22,163,74,0.34)']].forEach(function (b) {
      var a = Math.max(xMin, mu - b[0] * sg);
      var bVal = Math.min(xMax, mu + b[0] * sg);
      if (bVal <= a) return;
      ctx.beginPath();
      ctx.moveTo(X(a), h - B);
      for (var i = 0; i <= 80; i += 1) {
        var xx = a + ((bVal - a) * i) / 80;
        ctx.lineTo(X(xx), Y(xx));
      }
      ctx.lineTo(X(bVal), h - B);
      ctx.closePath();
      ctx.fillStyle = b[1];
      ctx.fill();
    });

    // Shaded area below x (percentile)
    if (isFinite(xv)) {
      var xClamped = Math.max(xMin, Math.min(xMax, xv));
      if (xClamped > xMin) {
        ctx.beginPath();
        ctx.moveTo(X(xMin), h - B);
        for (var p = 0; p <= 80; p += 1) {
          var xp = xMin + ((xClamped - xMin) * p) / 80;
          ctx.lineTo(X(xp), Y(xp));
        }
        ctx.lineTo(X(xClamped), h - B);
        ctx.closePath();
        ctx.fillStyle = 'rgba(234,88,12,0.18)';
        ctx.fill();
      }
    }

    // Main normal density curve
    ctx.beginPath();
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 3;
    for (var j = 0; j <= 200; j += 1) {
      var cxVal = xMin + ((xMax - xMin) * j) / 200;
      if (j === 0) ctx.moveTo(X(cxVal), Y(cxVal));
      else ctx.lineTo(X(cxVal), Y(cxVal));
    }
    ctx.stroke();

    // Axis & ticks
    line(ctx, L, h - B, w - R, h - B, c.text, 1.5);
    if (bellAxisMode === 'fixed') {
      for (var tick = 0; tick <= 140; tick += 20) {
        line(ctx, X(tick), h - B, X(tick), h - B + 5, c.text, 1);
        label(ctx, String(tick), X(tick), h - B + 17, c.textMuted, 'center', 10);
      }
      label(ctx, 'Fixed scale (0–140)', L + 2, 13, c.textMuted, 'left', 10);
    } else {
      for (var k = -3; k <= 3; k += 1) {
        var tkVal = mu + k * sg;
        line(ctx, X(tkVal), h - B, X(tkVal), h - B + 5, c.text, 1);
        label(ctx, f2(tkVal, 0), X(tkVal), h - B + 17, c.textMuted, 'center', 10);
      }
      label(ctx, 'Standardized z-scale (μ ± 4σ)', L + 2, 13, c.textMuted, 'left', 10);
    }

    // Band annotation labels
    label(ctx, '68%', X(mu), Math.min(h - B - 16, Y(mu) + 18), c.text, 'center', 11);

    // Draggable x marker
    if (isFinite(xv)) {
      var xPos = X(Math.max(xMin, Math.min(xMax, xv)));
      line(ctx, xPos, T - 6, xPos, h - B, ORANGE, 2, [4, 3]);
      dot(ctx, xPos, Y(Math.max(xMin, Math.min(xMax, xv))), 6.5, ORANGE, c.text);
      label(ctx, 'x=' + f2(xv, 1), xPos + (xv > (xMin + xMax) / 2 ? -8 : 8), T, ORANGE, xv > (xMin + xMax) / 2 ? 'right' : 'left', 10);
    }
  }

  function updateBell() {
    var mu = Number($('bc-mu').value);
    var sg = Number($('bc-sg').value);
    var xv = parseFloat($('bc-x').value);
    $('bc-muv').textContent = String(mu);
    $('bc-sgv').textContent = String(sg);
    $('bc-1').textContent = (mu - sg) + ' – ' + (mu + sg);
    $('bc-2').textContent = (mu - 2 * sg) + ' – ' + (mu + 2 * sg);
    $('bc-3').textContent = (mu - 3 * sg) + ' – ' + (mu + 3 * sg);
    if (isFinite(xv)) {
      var z = Core.zScore(xv, mu, sg);
      $('bc-z').textContent = 'z = ' + z.toFixed(2) + ' (' + Math.abs(z).toFixed(2) + ' σ ' +
        (z >= 0 ? 'above' : 'below') + ' the mean), about ' + (Core.normalCdf(z) * 100).toFixed(1) + '% of values are below.';
    } else {
      $('bc-z').textContent = 'Enter a number.';
    }
    drawBell();
  }

  bcKit = mk('bc-canvas', 'bc-box', drawBell);
  var bcc = $('bc-canvas');

  function bellValueFromPointer(e) {
    var rect = bcc.getBoundingClientRect();
    var mu = Number($('bc-mu').value);
    var sg = Number($('bc-sg').value);
    var xMin = bellAxisMode === 'fixed' ? 0 : mu - 4 * sg;
    var xMax = bellAxisMode === 'fixed' ? 140 : mu + 4 * sg;
    var L = 20;
    var R = 20;
    var frac = Math.max(0, Math.min(1, (e.clientX - rect.left - L) / Math.max(1, rect.width - L - R)));
    return Math.round((xMin + frac * (xMax - xMin)) * 2) / 2;
  }

  bcc.addEventListener('pointerdown', function (e) {
    draggingBellX = true;
    try { bcc.setPointerCapture(e.pointerId); } catch (_) {}
    $('bc-x').value = String(bellValueFromPointer(e));
    updateBell();
  });
  bcc.addEventListener('pointermove', function (e) {
    if (!draggingBellX) return;
    $('bc-x').value = String(bellValueFromPointer(e));
    updateBell();
  });
  function stopBellDrag() { draggingBellX = false; }
  bcc.addEventListener('pointerup', stopBellDrag);
  bcc.addEventListener('pointercancel', stopBellDrag);

  ['bc-mu', 'bc-sg', 'bc-x'].forEach(function (id) {
    $(id).addEventListener('input', updateBell);
  });

  if ($('bc-mode-fixed') && $('bc-mode-z')) {
    $('bc-mode-fixed').addEventListener('click', function () {
      bellAxisMode = 'fixed';
      this.classList.add('primary');
      this.setAttribute('aria-pressed', 'true');
      $('bc-mode-z').classList.remove('primary');
      $('bc-mode-z').setAttribute('aria-pressed', 'false');
      drawBell();
    });
    $('bc-mode-z').addEventListener('click', function () {
      bellAxisMode = 'z';
      this.classList.add('primary');
      this.setAttribute('aria-pressed', 'true');
      $('bc-mode-fixed').classList.remove('primary');
      $('bc-mode-fixed').setAttribute('aria-pressed', 'false');
      drawBell();
    });
  }

  if ($('bc-reset-btn')) {
    $('bc-reset-btn').addEventListener('click', function () {
      $('bc-mu').value = '70';
      $('bc-sg').value = '10';
      $('bc-x').value = '85';
      updateBell();
    });
  }

  // z-Score Duel
  function updateDuel() {
    var ax = parseFloat($('duel-a-x') && $('duel-a-x').value);
    var amu = parseFloat($('duel-a-mu') && $('duel-a-mu').value);
    var asg = parseFloat($('duel-a-sg') && $('duel-a-sg').value);
    var bx = parseFloat($('duel-b-x') && $('duel-b-x').value);
    var bmu = parseFloat($('duel-b-mu') && $('duel-b-mu').value);
    var bsg = parseFloat($('duel-b-sg') && $('duel-b-sg').value);
    if (![ax, amu, asg, bx, bmu, bsg].every(isFinite) || asg <= 0 || bsg <= 0) return;

    var za = Core.zScore(ax, amu, asg);
    var zb = Core.zScore(bx, bmu, bsg);
    var pa = Core.normalCdf(za) * 100;
    var pb = Core.normalCdf(zb) * 100;

    if ($('duel-a-out')) $('duel-a-out').textContent = 'z = ' + za.toFixed(2) + ' · Top ' + Math.max(0.1, 100 - pa).toFixed(1) + '%';
    if ($('duel-b-out')) $('duel-b-out').textContent = 'z = ' + zb.toFixed(2) + ' · Top ' + Math.max(0.1, 100 - pb).toFixed(1) + '%';
    if ($('duel-verdict')) {
      if (Math.abs(za - zb) < 0.01) {
        $('duel-verdict').textContent = 'Tie! Both scores sit equally far from their class mean (z = ' + za.toFixed(2) + ').';
      } else {
        $('duel-verdict').textContent = (za > zb ? 'Test A' : 'Test B') + ' is relatively stronger (z = ' +
          Math.max(za, zb).toFixed(2) + ' vs ' + Math.min(za, zb).toFixed(2) + ').';
      }
    }
  }
  ['duel-a-x', 'duel-a-mu', 'duel-a-sg', 'duel-b-x', 'duel-b-mu', 'duel-b-sg'].forEach(function (id) {
    if ($(id)) $(id).addEventListener('input', updateDuel);
  });

  SimKit.theme.onChange(function () {
    drawDots();
    drawCompare();
    drawBell();
  });

  /* ── Practice ──────────────────────────────────────────────────────── */
  document.querySelectorAll('.hs-practice-item').forEach(function (item) {
    var input = item.querySelector('input');
    var fb = item.querySelector('.fb');
    function check() {
      var v = parseFloat(input.value);
      if (isNaN(v)) {
        fb.textContent = 'Enter a number.';
        fb.className = 'fb no';
        return;
      }
      var ok = Math.abs(v - parseFloat(item.dataset.answer)) <= 0.05;
      fb.textContent = ok ? '✔ Correct.' : 'Not yet. Hint: ' + item.dataset.hint;
      fb.className = 'fb ' + (ok ? 'ok' : 'no');
    }
    item.querySelector('button').addEventListener('click', check);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
  });

  syncKb();
  updateDots();
  updateCompare();
  updateBell();
  updateDuel();
})();
