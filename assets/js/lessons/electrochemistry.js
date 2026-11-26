(function () {
  'use strict';

  var Core = window.ElectrochemistryCore;
  var SimKit = window.SimKit;
  if (!Core || !SimKit) return;

  var NS = 'http://www.w3.org/2000/svg';
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(id) { return document.getElementById(id); }

  function svgEl(tag, attrs, text) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (text != null) el.textContent = text;
    return el;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function metalGradient(ctx, x, y, w, h, m) {
    var g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, m.metalDark);
    g.addColorStop(0.35, m.metalHighlight);
    g.addColorStop(0.75, m.metalColor);
    g.addColorStop(1, m.metalDark);
    return g;
  }

  /* ======================================================================
     1. Galvanic & Electrolytic Cell Bench
     ====================================================================== */
  var cellState = {
    leftKey: 'Zn',
    rightKey: 'Cu',
    cLeft: 1.0,
    cRight: 1.0,
    tempC: 25,
    switchClosed: true,
    saltBridge: true,
    mode: 'galvanic',
    appliedV: 1.8,
    assignSide: 'left',
    discharging: false,
    anodeWear: 0,
    cathodePlate: 0,
    trail: [],
    ePhase: 0,
    ionPhase: 0,
    lastPresetId: 'daniell'
  };

  var leftSel = $('ec-left');
  var rightSel = $('ec-right');
  var clInput = $('ec-cl');
  var crInput = $('ec-cr');
  var tempInput = $('ec-temp');
  var appliedInput = $('ec-applied');
  var appliedWrap = $('ec-applied-wrap');

  Core.METALS.forEach(function (m) {
    var sign = m.e > 0 ? '+' : (m.e < 0 ? '−' : '');
    var label = m.k + ' · ' + m.name + ' (' + sign + Math.abs(m.e).toFixed(2) + ' V)';
    leftSel.add(new Option(label, m.k));
    rightSel.add(new Option(label, m.k));
  });

  // Build Reduction Potential Ladder buttons
  var ladderHost = $('ec-ladder');
  var ladderBtns = {};
  Core.METALS.forEach(function (m) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ec-ladder-btn';
    btn.setAttribute('data-metal', m.k);
    var sign = m.e > 0 ? '+' : (m.e < 0 ? '−' : '');
    btn.innerHTML =
      '<strong>' + m.k + '</strong>' +
      '<span>' + sign + Math.abs(m.e).toFixed(2) + ' V</span>' +
      '<small class="ec-ladder-badge" aria-hidden="true"></small>';
    btn.addEventListener('click', function () {
      if (cellState.assignSide === 'left') {
        cellState.leftKey = m.k;
      } else {
        cellState.rightKey = m.k;
      }
      resetProgress();
      syncControlsFromState();
      refreshCellUI();
    });
    ladderHost.appendChild(btn);
    ladderBtns[m.k] = btn;
  });

  // Build Cell Preset buttons
  var cellPresetHost = $('ec-cell-presets');
  var cellPresetBtns = {};
  Core.CELL_PRESETS.forEach(function (p) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ec-seg-btn';
    btn.textContent = p.label;
    btn.setAttribute('aria-pressed', p.id === cellState.lastPresetId ? 'true' : 'false');
    btn.addEventListener('click', function () {
      applyCellPreset(p);
    });
    cellPresetHost.appendChild(btn);
    cellPresetBtns[p.id] = btn;
  });

  function resetProgress() {
    cellState.discharging = false;
    cellState.anodeWear = 0;
    cellState.cathodePlate = 0;
    cellState.trail = [];
  }

  function applyCellPreset(p) {
    cellState.leftKey = p.leftKey;
    cellState.rightKey = p.rightKey;
    cellState.cLeft = p.cLeft;
    cellState.cRight = p.cRight;
    cellState.tempC = p.tempC;
    cellState.mode = p.mode;
    cellState.appliedV = p.appliedV;
    cellState.switchClosed = p.switchClosed;
    cellState.saltBridge = p.saltBridge;
    cellState.lastPresetId = p.id;
    resetProgress();
    syncControlsFromState();
    refreshCellUI();
  }

  function syncControlsFromState() {
    leftSel.value = cellState.leftKey;
    rightSel.value = cellState.rightKey;
    clInput.value = Math.log10(cellState.cLeft).toFixed(2);
    crInput.value = Math.log10(cellState.cRight).toFixed(2);
    tempInput.value = String(cellState.tempC);
    appliedInput.value = cellState.appliedV.toFixed(1);

    $('ec-mode-galv').setAttribute('aria-pressed', cellState.mode === 'galvanic' ? 'true' : 'false');
    $('ec-mode-elec').setAttribute('aria-pressed', cellState.mode === 'electrolytic' ? 'true' : 'false');
    appliedWrap.hidden = cellState.mode !== 'electrolytic';

    $('ec-assign-left').setAttribute('aria-pressed', cellState.assignSide === 'left' ? 'true' : 'false');
    $('ec-assign-right').setAttribute('aria-pressed', cellState.assignSide === 'right' ? 'true' : 'false');

    $('ec-switch').textContent = cellState.switchClosed ? 'Switch: Closed' : 'Switch: Open';
    $('ec-switch').setAttribute('aria-pressed', cellState.switchClosed ? 'true' : 'false');

    $('ec-bridge').textContent = cellState.saltBridge ? 'Salt Bridge: In' : 'Salt Bridge: Removed';
    $('ec-bridge').setAttribute('aria-pressed', cellState.saltBridge ? 'true' : 'false');

    var disBtn = $('ec-discharge');
    disBtn.disabled = cellState.mode !== 'galvanic';
    disBtn.textContent = cellState.discharging ? '⏸ Pause Discharge' : '▶ Run Load';
    disBtn.setAttribute('aria-pressed', cellState.discharging ? 'true' : 'false');

    Object.keys(cellPresetBtns).forEach(function (id) {
      cellPresetBtns[id].setAttribute('aria-pressed', id === cellState.lastPresetId ? 'true' : 'false');
    });
  }

  function updateLadderHighlight() {
    Core.METALS.forEach(function (m) {
      var btn = ladderBtns[m.k];
      var isL = m.k === cellState.leftKey;
      var isR = m.k === cellState.rightKey;
      btn.classList.toggle('is-left', isL);
      btn.classList.toggle('is-right', isR);
      var badge = btn.querySelector('.ec-ladder-badge');
      if (isL && isR) badge.textContent = 'L + R';
      else if (isL) badge.textContent = 'LEFT';
      else if (isR) badge.textContent = 'RIGHT';
      else badge.textContent = '—';
    });
  }

  function drawNernstCurve(analysis) {
    var svg = $('ec-nernst-svg');
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var W = 540, H = 206;
    var padL = 56, padR = 20, padT = 22, padB = 34;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;

    var minLog = -4, maxLog = 4;
    var ySpan = Math.max(1.2, Math.abs(analysis.e0) + 0.65);
    var minE = Math.min(-0.6, analysis.e0 - ySpan * 0.75, analysis.E - 0.3);
    var maxE = Math.max(0.8, analysis.e0 + ySpan * 0.75, analysis.E + 0.3);

    function X(lq) { return padL + ((lq - minLog) / (maxLog - minLog)) * plotW; }
    function Y(e) { return padT + ((maxE - e) / (maxE - minE)) * plotH; }

    svg.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: '#08111f' }));

    // Grid lines
    for (var lq = minLog; lq <= maxLog; lq += 2) {
      svg.appendChild(svgEl('line', {
        x1: X(lq), y1: padT, x2: X(lq), y2: H - padB,
        stroke: lq === 0 ? 'rgba(148,197,240,0.34)' : 'rgba(148,197,240,0.12)',
        'stroke-dasharray': lq === 0 ? '3 3' : ''
      }));
      svg.appendChild(svgEl('text', {
        x: X(lq), y: H - padB + 14, 'text-anchor': 'middle', 'font-size': 10, fill: '#9db7d2'
      }, lq === 0 ? '0 (1 M)' : String(lq)));
    }

    // E = 0 equilibrium line
    if (minE <= 0 && maxE >= 0) {
      svg.appendChild(svgEl('line', {
        x1: padL, y1: Y(0), x2: W - padR, y2: Y(0),
        stroke: 'rgba(248,113,113,0.45)', 'stroke-width': 1.2, 'stroke-dasharray': '5 4'
      }));
      svg.appendChild(svgEl('text', {
        x: W - padR - 4, y: Y(0) - 4, 'text-anchor': 'end', 'font-size': 9.5, fill: '#fda4af'
      }, 'E = 0 V (equilibrium)'));
    }

    // Y ticks
    var stepE = (maxE - minE) > 4 ? 1 : 0.5;
    for (var ev = Math.ceil(minE / stepE) * stepE; ev <= maxE; ev += stepE) {
      svg.appendChild(svgEl('line', {
        x1: padL, y1: Y(ev), x2: W - padR, y2: Y(ev),
        stroke: 'rgba(148,197,240,0.1)'
      }));
      svg.appendChild(svgEl('text', {
        x: padL - 7, y: Y(ev) + 3, 'text-anchor': 'end', 'font-size': 10, fill: '#9db7d2'
      }, ev.toFixed(1)));
    }

    // Nernst line across [-4, 4]
    var eStart = analysis.e0 - analysis.nernstSlope * minLog;
    var eEnd = analysis.e0 - analysis.nernstSlope * maxLog;
    svg.appendChild(svgEl('line', {
      x1: X(minLog), y1: Y(eStart), x2: X(maxLog), y2: Y(eEnd),
      stroke: '#38bdf8', 'stroke-width': 2.5
    }));

    // Discharge trail
    if (cellState.trail.length > 1) {
      var pts = cellState.trail.map(function (pt) {
        var cx = Math.max(minLog, Math.min(maxLog, pt.lq));
        return X(cx).toFixed(1) + ',' + Y(pt.e).toFixed(1);
      }).join(' ');
      svg.appendChild(svgEl('polyline', {
        points: pts, fill: 'none', stroke: '#a78bfa', 'stroke-width': 3, opacity: '0.75'
      }));
    }

    // Standard state marker (log Q = 0, E°)
    svg.appendChild(svgEl('circle', {
      cx: X(0), cy: Y(analysis.e0), r: 4.5, fill: '#fbbf24', stroke: '#08111f', 'stroke-width': 1.5
    }));

    // Live operating point
    var clampedLogQ = Math.max(minLog, Math.min(maxLog, analysis.log10Q));
    svg.appendChild(svgEl('circle', {
      cx: X(clampedLogQ), cy: Y(analysis.E), r: 7, fill: 'rgba(79,220,154,0.28)'
    }));
    svg.appendChild(svgEl('circle', {
      cx: X(clampedLogQ), cy: Y(analysis.E), r: 4.5, fill: '#4ade80', stroke: '#ffffff', 'stroke-width': 1.5
    }));

    svg.appendChild(svgEl('text', {
      x: padL + plotW / 2, y: H - 5, 'text-anchor': 'middle', 'font-size': 10.5, fill: '#c7daee', 'font-weight': 700
    }, 'log₁₀ Q  (more cathode ions ←   |   → more anode ions)'));
    svg.appendChild(svgEl('text', {
      x: 14, y: padT + plotH / 2, 'text-anchor': 'middle', 'font-size': 10.5, fill: '#c7daee', 'font-weight': 700,
      transform: 'rotate(-90 14 ' + (padT + plotH / 2) + ')'
    }, 'E (V)'));
    svg.appendChild(svgEl('text', {
      x: padL + 4, y: 14, 'font-size': 10.5, fill: '#7dd3fc', 'font-weight': 700
    }, 'Nernst curve at ' + analysis.tempC + ' °C · E° = ' + Core.formatSignedV(analysis.e0) + ' · Live E = ' + Core.formatSignedV(analysis.E)));
  }

  function refreshCellUI() {
    var analysis = Core.analyzeCell(cellState);

    $('ec-cl-val').textContent = Core.formatConc(analysis.cLeft) + ' ' + Core.ionFormula(analysis.left);
    $('ec-cr-val').textContent = Core.formatConc(analysis.cRight) + ' ' + Core.ionFormula(analysis.right);
    $('ec-temp-val').textContent = analysis.tempC + ' °C (' + analysis.tempK.toFixed(1) + ' K)';
    $('ec-applied-val').textContent = analysis.appliedV.toFixed(2) + ' V';

    if (analysis.mode === 'electrolytic') {
      $('ec-voltage').textContent = 'DC Supply: ' + analysis.appliedV.toFixed(2) + ' V  ·  Opposing |E| = ' + analysis.minAppliedV.toFixed(2) + ' V';
    } else if (!analysis.saltBridge) {
      $('ec-voltage').textContent = '0.00 V (salt bridge removed)';
    } else {
      $('ec-voltage').textContent = 'E°cell = ' + Core.formatSignedV(analysis.e0) + '   →   E = ' + Core.formatSignedV(analysis.E);
    }

    $('ec-equation').textContent = analysis.equation;
    $('ec-notation').textContent = 'Cell notation: ' + analysis.cellDiagram;
    $('ec-half-anode').textContent = analysis.anodeHalf;
    $('ec-half-cathode').textContent = analysis.cathodeHalf;
    $('ec-summary').textContent = analysis.summary;

    $('ec-s-e0').textContent = Core.formatSignedV(analysis.e0);
    $('ec-s-n').textContent = analysis.n + ' e⁻';
    $('ec-s-dg').textContent = analysis.deltaG_kJ.toFixed(0) + ' kJ';
    $('ec-s-k').textContent = analysis.kFormatted;

    updateLadderHighlight();
    drawNernstCurve(analysis);
    return analysis;
  }

  // Canvas2D rendering for Lab 1
  var cellCanvas = $('ec-cell-canvas');
  var cellCtxInfo = SimKit.canvas2d(cellCanvas, { height: 350 });

  function drawCellScene(dt) {
    if (cellState.discharging && cellState.mode === 'galvanic') {
      var step = Core.stepDischarge(cellState, dt, 0.16);
      cellState.cLeft = step.cLeft;
      cellState.cRight = step.cRight;
      cellState.anodeWear = Math.min(0.45, cellState.anodeWear + step.deltaAnode * 0.25);
      cellState.cathodePlate = Math.min(0.45, cellState.cathodePlate + step.deltaCathode * 0.25);
      cellState.trail.push({ lq: step.analysis.log10Q, e: step.analysis.E });
      if (cellState.trail.length > 60) cellState.trail.shift();

      clInput.value = Math.log10(cellState.cLeft).toFixed(2);
      crInput.value = Math.log10(cellState.cRight).toFixed(2);
      if (!step.analysis.currentActive || Math.abs(step.analysis.E) < 0.004) {
        cellState.discharging = false;
        syncControlsFromState();
      }
      refreshCellUI();
    }

    var analysis = Core.analyzeCell(cellState);
    var ctx = cellCtxInfo.ctx;
    var W = cellCtxInfo.width;
    var H = cellCtxInfo.height;
    if (!W || !H) return;

    var speed = analysis.currentActive && !prefersReduced
      ? (analysis.mode === 'electrolytic'
        ? Math.min(1.8, 0.35 + analysis.netOverpotential * 0.5)
        : Math.min(1.8, 0.28 + Math.abs(analysis.E) * 0.48))
      : 0;

    if (speed > 0) {
      cellState.ePhase = (cellState.ePhase + dt * 0.26 * speed * analysis.flowDir + 1) % 1;
      cellState.ionPhase = (cellState.ionPhase + dt * 0.14 * speed * analysis.flowDir + 1) % 1;
    }

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#08111f';
    ctx.fillRect(0, 0, W, H);

    // Responsive coordinate scaling from 620x350 design space
    var sx = W / 620;
    var sy = H / 350;
    ctx.save();
    ctx.scale(sx, sy);

    // Beaker geometry
    var bxL = 44, bxR = 372, bw = 204, by = 158, bh = 154;
    var solH = 114, solY = by + bh - solH;

    // Solution fill opacity scales softly with log10 concentration
    function drawSolution(x, metal, concVal) {
      var factor = Math.max(0.28, Math.min(1.15, (Math.log10(concVal) + 3.4) / 3.4));
      ctx.save();
      roundRect(ctx, x + 2, solY, bw - 4, solH - 2, 8);
      ctx.fillStyle = metal.solColor;
      ctx.globalAlpha = factor;
      ctx.fill();
      ctx.restore();

      // Surface meniscus
      ctx.beginPath();
      ctx.moveTo(x + 4, solY);
      ctx.lineTo(x + bw - 4, solY);
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.38)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    drawSolution(bxL, analysis.left, analysis.cLeft);
    drawSolution(bxR, analysis.right, analysis.cRight);

    // Electrodes
    var rodLX = 114, rodRX = 480, rodY = 82, rodW = 26, rodH = 202;
    var leftIsAnode = analysis.anodeSide === 'left';
    var wearL = leftIsAnode ? cellState.anodeWear * 10 : -cellState.cathodePlate * 9;
    var wearR = !leftIsAnode ? cellState.anodeWear * 10 : -cellState.cathodePlate * 9;

    // Left rod
    roundRect(ctx, rodLX + wearL * 0.5, rodY, Math.max(12, rodW - wearL), rodH, 4);
    ctx.fillStyle = metalGradient(ctx, rodLX, rodY, rodW, rodH, analysis.left);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Right rod
    roundRect(ctx, rodRX + wearR * 0.5, rodY, Math.max(12, rodW - wearR), rodH, 4);
    ctx.fillStyle = metalGradient(ctx, rodRX, rodY, rodW, rodH, analysis.right);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.stroke();

    // Beaker glass walls
    [bxL, bxR].forEach(function (bx) {
      roundRect(ctx, bx, by, bw, bh, 12);
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.55)';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    });

    // Salt bridge U-tube
    ctx.save();
    ctx.globalAlpha = analysis.saltBridge ? 1 : 0.16;
    ctx.beginPath();
    ctx.moveTo(212, 224);
    ctx.lineTo(212, 118);
    ctx.quadraticCurveTo(212, 102, 228, 102);
    ctx.lineTo(392, 102);
    ctx.quadraticCurveTo(408, 102, 408, 118);
    ctx.lineTo(408, 224);
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.25)';
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(196, 181, 253, 0.6)';
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = analysis.saltBridge ? '#ddd6fe' : '#fda4af';
    ctx.font = '700 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(analysis.saltBridge ? 'Salt Bridge (KNO₃)' : 'Salt Bridge REMOVED', 310, 91);

    // Salt bridge ions when flowing
    if (analysis.saltBridge && analysis.currentActive) {
      for (var ii = 0; ii < 4; ii++) {
        var u = (cellState.ionPhase + ii * 0.25 + 1) % 1;
        // Cations (K+) move toward cathode; Anions (NO3-) move toward anode.
        var catX = 212 + u * 196;
        var anX = 408 - u * 196;
        var bridgeY = 102;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(catX, bridgeY - 4, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(anX, bridgeY + 4, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = '600 10px JetBrains Mono, monospace';
      ctx.fillStyle = '#fde68a';
      ctx.fillText('K⁺ → ' + analysis.actualCathode.k, 260, 127);
      ctx.fillStyle = '#6ee7b7';
      ctx.fillText('NO₃⁻ → ' + analysis.actualAnode.k, 360, 127);
    } else if (!analysis.saltBridge) {
      // Charge polarization warning badges
      ctx.font = '700 11px JetBrains Mono, monospace';
      ctx.fillStyle = '#fda4af';
      ctx.fillText('(+ buildup)', bxL + 102, solY + 28);
      ctx.fillText('(− buildup)', bxR + 102, solY + 28);
    }

    // External circuit wire: Left rod top (127, 82) -> up to y=36 -> switch at x=210..248 -> instrument at x=310 -> bulb/supply at x=410 -> Right rod top (493, 82)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(127, 82);
    ctx.lineTo(127, 36);
    ctx.lineTo(208, 36);
    ctx.moveTo(246, 36);
    ctx.lineTo(493, 36);
    ctx.lineTo(493, 82);
    ctx.stroke();

    // Knife switch (208 -> 246 at y=36)
    ctx.beginPath();
    ctx.arc(208, 36, 4, 0, Math.PI * 2);
    ctx.arc(246, 36, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(208, 36);
    if (analysis.switchClosed) {
      ctx.lineTo(246, 36);
      ctx.strokeStyle = '#38bdf8';
    } else {
      ctx.lineTo(240, 16);
      ctx.strokeStyle = '#fb7185';
    }
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Voltmeter badge (center x=310, y=36)
    roundRect(ctx, 266, 16, 88, 38, 9);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = analysis.currentActive ? '#38bdf8' : '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = analysis.currentActive ? '#7dd3fc' : '#94a3b8';
    ctx.font = '800 13px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      analysis.mode === 'electrolytic'
        ? analysis.appliedV.toFixed(2) + ' V'
        : Core.formatSignedV(analysis.measuredV),
      310, 40
    );

    // Load bulb (galvanic) or DC power supply (electrolytic) at x=415, y=36
    if (analysis.mode === 'galvanic') {
      var glow = analysis.currentActive ? Math.min(1, Math.abs(analysis.E) / 2.2) : 0;
      if (glow > 0.05) {
        var rg = ctx.createRadialGradient(415, 36, 2, 415, 36, 28);
        rg.addColorStop(0, 'rgba(253, 224, 71, ' + (0.65 * glow).toFixed(2) + ')');
        rg.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(415, 36, 28, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(415, 36, 12, 0, Math.PI * 2);
      ctx.fillStyle = glow > 0.05 ? 'rgba(254, 240, 138, ' + (0.3 + 0.65 * glow).toFixed(2) + ')' : '#1e293b';
      ctx.fill();
      ctx.strokeStyle = glow > 0.05 ? '#fde047' : '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '700 9.5px Inter, system-ui, sans-serif';
      ctx.fillText('Load', 415, 60);
    } else {
      roundRect(ctx, 384, 18, 66, 36, 6);
      ctx.fillStyle = analysis.currentActive ? '#1e3a5f' : '#1e293b';
      ctx.fill();
      ctx.strokeStyle = analysis.currentActive ? '#fbbf24' : '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fde68a';
      ctx.font = '800 10px JetBrains Mono, monospace';
      ctx.fillText('DC PSU', 417, 40);
    }

    // Animated electrons along wire path (127,82)->(127,36)->(493,36)->(493,82)
    if (analysis.currentActive) {
      var seg1 = 46, seg2 = 366, seg3 = 46;
      var totalLen = seg1 + seg2 + seg3;
      for (var ei = 0; ei < 11; ei++) {
        var frac = (cellState.ePhase + ei / 11 + 1) % 1;
        var d = frac * totalLen;
        var ex, ey;
        if (d < seg1) {
          ex = 127;
          ey = 82 - d;
        } else if (d < seg1 + seg2) {
          ex = 127 + (d - seg1);
          ey = 36;
        } else {
          ex = 493;
          ey = 36 + (d - seg1 - seg2);
        }
        ctx.beginPath();
        ctx.arc(ex, ey, 4.8, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fillStyle = '#7dd3fc';
      ctx.font = '700 11px JetBrains Mono, monospace';
      ctx.fillText(analysis.flowDir === 1 ? 'e⁻ flow →' : '← e⁻ flow', 310, 68);
    }

    // Electrode role & ion labels
    var leftSign = analysis.mode === 'galvanic'
      ? (leftIsAnode ? '(−) Anode' : '(+) Cathode')
      : (leftIsAnode ? '(+) Anode' : '(−) Cathode');
    var rightSign = analysis.mode === 'galvanic'
      ? (!leftIsAnode ? '(−) Anode' : '(+) Cathode')
      : (!leftIsAnode ? '(+) Anode' : '(−) Cathode');

    ctx.textAlign = 'center';
    ctx.font = '800 12px Inter, system-ui, sans-serif';
    ctx.fillStyle = leftIsAnode ? '#fbbf24' : '#7dd3fc';
    ctx.fillText(analysis.left.k + ' · ' + leftSign, 127, 148);
    ctx.fillStyle = !leftIsAnode ? '#fbbf24' : '#7dd3fc';
    ctx.fillText(analysis.right.k + ' · ' + rightSign, 493, 148);

    ctx.font = '700 11px JetBrains Mono, monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(Core.ionFormula(analysis.left) + ' · ' + Core.formatConc(analysis.cLeft), bxL + bw / 2, by + bh + 18);
    ctx.fillText(Core.ionFormula(analysis.right) + ' · ' + Core.formatConc(analysis.cRight), bxR + bw / 2, by + bh + 18);

    // Floating ions in solutions
    for (var p = 0; p < 5; p++) {
      var jitter = Math.sin((cellState.ePhase * 6.28) + p * 1.9) * 5;
      ctx.fillStyle = analysis.left.ionTint;
      ctx.beginPath();
      ctx.arc(bxL + 36 + p * 34, solY + 46 + (p % 2) * 28 + jitter, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = analysis.right.ionTint;
      ctx.beginPath();
      ctx.arc(bxR + 36 + p * 34, solY + 46 + ((p + 1) % 2) * 28 - jitter, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  SimKit.loop(drawCellScene, { el: cellCanvas, maxDt: 0.05 });

  // Lab 1 Event Listeners
  leftSel.addEventListener('change', function () {
    cellState.leftKey = leftSel.value;
    cellState.lastPresetId = '';
    resetProgress();
    syncControlsFromState();
    refreshCellUI();
  });
  rightSel.addEventListener('change', function () {
    cellState.rightKey = rightSel.value;
    cellState.lastPresetId = '';
    resetProgress();
    syncControlsFromState();
    refreshCellUI();
  });
  clInput.addEventListener('input', function () {
    cellState.cLeft = Math.pow(10, parseFloat(clInput.value));
    cellState.lastPresetId = '';
    refreshCellUI();
  });
  crInput.addEventListener('input', function () {
    cellState.cRight = Math.pow(10, parseFloat(crInput.value));
    cellState.lastPresetId = '';
    refreshCellUI();
  });
  tempInput.addEventListener('input', function () {
    cellState.tempC = parseInt(tempInput.value, 10);
    cellState.lastPresetId = '';
    refreshCellUI();
  });
  appliedInput.addEventListener('input', function () {
    cellState.appliedV = parseFloat(appliedInput.value);
    refreshCellUI();
  });

  $('ec-mode-galv').addEventListener('click', function () {
    cellState.mode = 'galvanic';
    syncControlsFromState();
    refreshCellUI();
  });
  $('ec-mode-elec').addEventListener('click', function () {
    cellState.mode = 'electrolytic';
    cellState.discharging = false;
    var cur = Core.analyzeCell(cellState);
    if (cellState.appliedV <= cur.minAppliedV) {
      cellState.appliedV = Math.min(5.0, Number((cur.minAppliedV + 0.6).toFixed(1)));
    }
    syncControlsFromState();
    refreshCellUI();
  });
  $('ec-assign-left').addEventListener('click', function () {
    cellState.assignSide = 'left';
    syncControlsFromState();
  });
  $('ec-assign-right').addEventListener('click', function () {
    cellState.assignSide = 'right';
    syncControlsFromState();
  });
  $('ec-swap').addEventListener('click', function () {
    var tk = cellState.leftKey; cellState.leftKey = cellState.rightKey; cellState.rightKey = tk;
    var tc = cellState.cLeft; cellState.cLeft = cellState.cRight; cellState.cRight = tc;
    cellState.lastPresetId = '';
    resetProgress();
    syncControlsFromState();
    refreshCellUI();
  });
  $('ec-switch').addEventListener('click', function () {
    cellState.switchClosed = !cellState.switchClosed;
    if (!cellState.switchClosed) cellState.discharging = false;
    syncControlsFromState();
    refreshCellUI();
  });
  $('ec-bridge').addEventListener('click', function () {
    cellState.saltBridge = !cellState.saltBridge;
    if (!cellState.saltBridge) cellState.discharging = false;
    syncControlsFromState();
    refreshCellUI();
  });
  $('ec-discharge').addEventListener('click', function () {
    if (cellState.mode !== 'galvanic') return;
    cellState.switchClosed = true;
    cellState.saltBridge = true;
    cellState.discharging = !cellState.discharging;
    syncControlsFromState();
    refreshCellUI();
  });
  $('ec-cell-reset').addEventListener('click', function () {
    applyCellPreset(Core.CELL_PRESETS[0]);
  });

  applyCellPreset(Core.CELL_PRESETS[0]);

  /* ======================================================================
     2. Faraday Electroplating Bench
     ====================================================================== */
  var plateState = {
    metalKey: 'Cu',
    currentA: 2.0,
    timeMinutes: 30,
    areaCm2: 25,
    objectShape: 'key',
    running: false,
    progress: 1.0,
    ionPhase: 0,
    presetId: ''
  };

  var fmSel = $('ec-fm');
  var fiInput = $('ec-fi');
  var ftInput = $('ec-ft');
  var faInput = $('ec-fa');

  Core.METALS.forEach(function (m) {
    fmSel.add(new Option(m.k + ' · ' + m.name + ' (from ' + Core.ionFormula(m) + ', M = ' + m.M + ')', m.k));
  });

  var platePresetHost = $('ec-plate-presets');
  var platePresetBtns = {};
  Core.PLATING_PRESETS.forEach(function (p) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ec-seg-btn';
    btn.textContent = p.label;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', function () {
      plateState.metalKey = p.metalKey;
      plateState.currentA = p.currentA;
      plateState.timeMinutes = p.timeMinutes;
      plateState.areaCm2 = p.areaCm2;
      plateState.objectShape = p.objectShape;
      plateState.presetId = p.id;
      plateState.progress = 0;
      plateState.running = true;
      syncPlatingControls();
      refreshFaradayUI();
    });
    platePresetHost.appendChild(btn);
    platePresetBtns[p.id] = btn;
  });

  function syncPlatingControls() {
    fmSel.value = plateState.metalKey;
    fiInput.value = plateState.currentA.toFixed(1);
    ftInput.value = String(plateState.timeMinutes);
    faInput.value = String(plateState.areaCm2);

    ['key', 'spoon', 'medal'].forEach(function (sh) {
      $('ec-shape-' + sh).setAttribute('aria-pressed', plateState.objectShape === sh ? 'true' : 'false');
    });
    $('ec-plate-run').textContent = plateState.running ? '⏸ Pause Plating' : (plateState.progress >= 0.999 ? '▶ Replay Plating' : '▶ Animate Plating');
    Object.keys(platePresetBtns).forEach(function (id) {
      platePresetBtns[id].setAttribute('aria-pressed', id === plateState.presetId ? 'true' : 'false');
    });
  }

  function refreshFaradayUI() {
    var res = Core.computeFaraday(plateState);
    $('ec-fi-val').textContent = plateState.currentA.toFixed(1) + ' A';
    $('ec-ft-val').textContent = plateState.timeMinutes + ' min';
    $('ec-fa-val').textContent = plateState.areaCm2 + ' cm²';
    if (!res.valid) {
      $('ec-f-note').textContent = res.error;
      return;
    }
    var frac = plateState.progress;
    $('ec-f-q').textContent = (res.chargeC * frac).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' C';
    $('ec-f-mol').textContent = (res.molesElectrons * frac).toFixed(4) + ' mol';
    $('ec-f-metal').textContent = (res.molesMetal * frac).toFixed(4) + ' mol';
    $('ec-f-g').textContent = (res.massGrams * frac).toFixed(3) + ' g';
    $('ec-f-um').textContent = (res.thicknessUm * frac).toFixed(1) + ' μm';
    $('ec-f-note').textContent = res.note;
  }

  var plateCanvas = $('ec-plate-canvas');
  var plateCtxInfo = SimKit.canvas2d(plateCanvas, { height: 290 });

  function drawTargetShape(ctx, cx, cy, shape, coatPx, metal) {
    ctx.save();
    // Base steel object
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;

    function strokeAndCoat(pathFn) {
      if (coatPx > 0.2) {
        ctx.save();
        pathFn();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 2 + coatPx * 2;
        ctx.strokeStyle = metal.metalColor;
        ctx.stroke();
        ctx.restore();
      }
      pathFn();
      ctx.fill();
      if (coatPx > 0.4) {
        ctx.fillStyle = metal.metalColor;
        ctx.globalAlpha = Math.min(0.95, 0.25 + coatPx * 0.08);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    if (shape === 'medal') {
      strokeAndCoat(function () {
        ctx.beginPath();
        ctx.arc(cx, cy + 16, 32, 0, Math.PI * 2);
      });
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(metal.k, cx, cy + 20);
    } else if (shape === 'spoon') {
      strokeAndCoat(function () {
        ctx.beginPath();
        ctx.roundRect(cx - 5, cy - 34, 10, 56, 4);
        ctx.ellipse(cx, cy + 38, 18, 26, 0, 0, Math.PI * 2);
      });
    } else {
      // Key
      strokeAndCoat(function () {
        ctx.beginPath();
        ctx.arc(cx, cy - 16, 17, 0, Math.PI * 2);
        ctx.roundRect(cx - 5, cy - 2, 10, 58, 3);
        ctx.rect(cx + 4, cy + 32, 11, 7);
        ctx.rect(cx + 4, cy + 44, 8, 7);
      });
    }
    ctx.restore();
  }

  function drawPlatingScene(dt) {
    if (plateState.running) {
      plateState.progress = Math.min(1, plateState.progress + dt * 0.16);
      if (plateState.progress >= 1) {
        plateState.running = false;
        syncPlatingControls();
      }
      refreshFaradayUI();
    }

    var res = Core.computeFaraday(plateState);
    var ctx = plateCtxInfo.ctx;
    var W = plateCtxInfo.width;
    var H = plateCtxInfo.height;
    if (!W || !H) return;

    if (plateState.running && !prefersReduced) {
      plateState.ionPhase = (plateState.ionPhase + dt * (0.25 + plateState.currentA * 0.06)) % 1;
    }

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#08111f';
    ctx.fillRect(0, 0, W, H);

    var sx = W / 580;
    var sy = H / 290;
    ctx.save();
    ctx.scale(sx, sy);

    var m = res.metal || Core.getMetal(plateState.metalKey);

    // DC Power supply at top
    roundRect(ctx, 215, 14, 150, 44, 8);
    ctx.fillStyle = '#132138';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#eef6ff';
    ctx.font = '800 12px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DC · ' + plateState.currentA.toFixed(1) + ' A', 290, 34);
    ctx.fillStyle = '#9db7d2';
    ctx.font = '700 10px JetBrains Mono, monospace';
    ctx.fillText('t = ' + (plateState.timeMinutes * plateState.progress).toFixed(1) + ' / ' + plateState.timeMinutes + ' min', 290, 49);

    // Wires to Anode (left, +) and Cathode (right, -)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(215, 36); ctx.lineTo(148, 36); ctx.lineTo(148, 92);
    ctx.moveTo(365, 36); ctx.lineTo(426, 36); ctx.lineTo(426, 128);
    ctx.stroke();

    // Bath tank
    roundRect(ctx, 84, 114, 412, 154, 12);
    ctx.fillStyle = m.solColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.58)';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Sacrificial Anode bar (+, left)
    var erode = res.valid ? Math.min(8, plateState.progress * (res.massGrams * 0.8)) : 0;
    roundRect(ctx, 134 + erode * 0.4, 92, Math.max(14, 28 - erode), 150, 4);
    ctx.fillStyle = metalGradient(ctx, 134, 92, 28, 150, m);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Target object at Cathode (-, right)
    var coatPx = res.valid ? Math.min(11, Math.sqrt(res.thicknessUm * plateState.progress) * 0.75) : 0;
    drawTargetShape(ctx, 426, 174, plateState.objectShape, coatPx, m);

    // Migrating cations from anode -> cathode
    for (var i = 0; i < 6; i++) {
      var u = (plateState.ionPhase + i / 6) % 1;
      var ix = 172 + u * 218;
      var iy = 148 + (i % 3) * 34 + Math.sin(u * 6.28 + i) * 5;
      ctx.beginPath();
      ctx.arc(ix, iy, 5, 0, Math.PI * 2);
      ctx.fillStyle = m.ionTint;
      ctx.fill();
    }

    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 11.5px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('(+) Anode · ' + m.k + ' dissolves', 148, 82);

    ctx.fillStyle = '#7dd3fc';
    ctx.fillText('(−) Cathode · ' + m.k + ' plates', 426, 82);

    if (res.valid) {
      ctx.fillStyle = '#eef6ff';
      ctx.font = '700 11px JetBrains Mono, monospace';
      ctx.fillText(
        'Plated coat: ' + (res.thicknessUm * plateState.progress).toFixed(1) + ' μm  (' +
        (res.massGrams * plateState.progress).toFixed(2) + ' g)',
        290, 282
      );
    }

    ctx.restore();
  }

  SimKit.loop(drawPlatingScene, { el: plateCanvas, maxDt: 0.05 });

  fmSel.addEventListener('change', function () {
    plateState.metalKey = fmSel.value;
    plateState.presetId = '';
    syncPlatingControls();
    refreshFaradayUI();
  });
  fiInput.addEventListener('input', function () {
    plateState.currentA = parseFloat(fiInput.value);
    plateState.presetId = '';
    syncPlatingControls();
    refreshFaradayUI();
  });
  ftInput.addEventListener('input', function () {
    plateState.timeMinutes = parseFloat(ftInput.value);
    plateState.presetId = '';
    syncPlatingControls();
    refreshFaradayUI();
  });
  faInput.addEventListener('input', function () {
    plateState.areaCm2 = parseFloat(faInput.value);
    plateState.presetId = '';
    syncPlatingControls();
    refreshFaradayUI();
  });
  ['key', 'spoon', 'medal'].forEach(function (sh) {
    $('ec-shape-' + sh).addEventListener('click', function () {
      plateState.objectShape = sh;
      syncPlatingControls();
    });
  });
  $('ec-plate-run').addEventListener('click', function () {
    if (plateState.progress >= 0.999) plateState.progress = 0;
    plateState.running = !plateState.running;
    syncPlatingControls();
    refreshFaradayUI();
  });
  $('ec-plate-reset').addEventListener('click', function () {
    plateState.metalKey = 'Cu';
    plateState.currentA = 2.0;
    plateState.timeMinutes = 30;
    plateState.areaCm2 = 25;
    plateState.objectShape = 'key';
    plateState.progress = 1.0;
    plateState.running = false;
    plateState.presetId = '';
    syncPlatingControls();
    refreshFaradayUI();
  });

  syncPlatingControls();
  refreshFaradayUI();

  /* ======================================================================
     3. Interactive Practice Drill & Exit Check
     ====================================================================== */
  var drillIdx = 0;
  var drillCorrect = 0;
  var drillTotal = 0;
  var selectedDrillChoice = '';
  var drillAnswered = false;

  function renderDrillProblem() {
    var p = Core.PRACTICE_PROBLEMS[drillIdx];
    selectedDrillChoice = '';
    drillAnswered = false;
    $('ec-drill-q').textContent = 'Problem ' + (drillIdx + 1) + ' of ' + Core.PRACTICE_PROBLEMS.length + ': ' + p.prompt;
    $('ec-drill-fb').textContent = '';
    $('ec-drill-fb').className = 'ec-drill-fb';
    $('ec-drill-hint').hidden = true;
    $('ec-drill-hint').textContent = p.hint;
    $('ec-drill-hint-btn').textContent = 'Show hint';

    var numWrap = $('ec-drill-num-wrap');
    var choicesWrap = $('ec-drill-choices');
    choicesWrap.innerHTML = '';

    if (p.kind === 'numeric') {
      numWrap.hidden = false;
      choicesWrap.hidden = true;
      $('ec-drill-num').value = '';
      $('ec-drill-unit').textContent = p.unit;
    } else {
      numWrap.hidden = true;
      choicesWrap.hidden = false;
      p.choices.forEach(function (ch) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ec-seg-btn';
        btn.textContent = ch.label;
        btn.setAttribute('aria-pressed', 'false');
        btn.addEventListener('click', function () {
          selectedDrillChoice = ch.id;
          Array.prototype.forEach.call(choicesWrap.children, function (b) {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          });
        });
        choicesWrap.appendChild(btn);
      });
    }
  }

  $('ec-drill-check').addEventListener('click', function () {
    var p = Core.PRACTICE_PROBLEMS[drillIdx];
    var res = Core.checkPracticeAnswer(p, {
      value: $('ec-drill-num').value,
      choice: selectedDrillChoice
    });
    var fb = $('ec-drill-fb');
    fb.textContent = res.message;
    fb.className = 'ec-drill-fb ' + (res.correct ? 'ec-ok' : 'ec-no');
    if (!res.incomplete && !drillAnswered) {
      drillAnswered = true;
      drillTotal++;
      if (res.correct) drillCorrect++;
      $('ec-drill-score').textContent = 'Score: ' + drillCorrect + ' / ' + drillTotal;
    }
  });

  $('ec-drill-hint-btn').addEventListener('click', function () {
    var hintEl = $('ec-drill-hint');
    hintEl.hidden = !hintEl.hidden;
    $('ec-drill-hint-btn').textContent = hintEl.hidden ? 'Show hint' : 'Hide hint';
  });

  $('ec-drill-next').addEventListener('click', function () {
    drillIdx = (drillIdx + 1) % Core.PRACTICE_PROBLEMS.length;
    renderDrillProblem();
  });

  renderDrillProblem();

  // Exit check concept questions
  var QUIZ = [
    {
      q: '1. Which statement about a galvanic cell is always true?',
      a: [
        'Reduction happens at the anode.',
        'Electrons travel through the external wire from the anode toward the cathode.',
        'The salt bridge supplies electrons directly into the wire.'
      ],
      r: 1,
      why: 'Oxidation (electron loss) happens at the anode, and those electrons take the external wire to the cathode. Ions—not electrons—cross the salt bridge.'
    },
    {
      q: '2. Cell A pairs Zn/Cu (E° = 1.10 V). Cell B pairs Mg/Cu. Which produces the higher standard voltage?',
      a: [
        'Cell A, because zinc is denser than magnesium.',
        'Cell B, because Mg has a much lower reduction potential (−2.37 V), making the potential gap wider.',
        'They are identical, since both use copper as the cathode.'
      ],
      r: 1,
      why: 'E° = 0.34 − (−2.37) = +2.71 V for Mg/Cu versus +1.10 V for Zn/Cu.'
    },
    {
      q: '3. In the Zn/Cu cell, you increase [Cu²⁺] and decrease [Zn²⁺]. How does the cell voltage respond?',
      a: [
        'It rises, because Q = [Zn²⁺]/[Cu²⁺] gets smaller.',
        'It falls, because Q gets smaller.',
        'It stays locked at exactly 1.10 V.'
      ],
      r: 0,
      why: 'Smaller Q makes log Q negative, so −(0.0592/n)·log Q adds positive push to E.'
    },
    {
      q: '4. Two identical copper strips dip into 0.001 M Cu²⁺ (left) and 1.0 M Cu²⁺ (right). Why does a current still flow?',
      a: [
        'It cannot flow because E° = 0 V.',
        'The 0.001 M side oxidizes Cu to raise its ion concentration until both beakers equalize.',
        'Copper spontaneously switches from a metal to a nonmetal at low concentration.'
      ],
      r: 1,
      why: 'Even with E° = 0 V, a concentration gradient creates Q ≠ 1 and drives a concentration cell toward equilibrium (Q = 1).'
    },
    {
      q: '5. A scratched galvanized (zinc-coated) steel nail stays rust-free outdoors. Why?',
      a: [
        'Zinc has a lower reduction potential (−0.76 V vs −0.44 V), so it acts as a sacrificial anode and oxidizes instead of iron.',
        'Zinc is reduced into iron whenever oxygen touches the scratch.',
        'Zinc permanently blocks all water molecules even across a bare scratch.'
      ],
      r: 0,
      why: 'Because Zn gives up electrons more easily than Fe, zinc corrodes preferentially and keeps iron reduced.'
    },
    {
      q: '6. You plate silver (Ag⁺ + e⁻ → Ag) and copper (Cu²⁺ + 2e⁻ → Cu) using the same total charge Q. Which deposits more moles of metal?',
      a: [
        'Copper, since Cu²⁺ has twice the charge.',
        'Silver, because each atom needs only 1 electron instead of 2.',
        'Both deposit the exact same number of moles.'
      ],
      r: 1,
      why: 'Silver needs 1 mol e⁻ per mole of metal while copper needs 2, so the same charge Q plates twice as many moles of silver.'
    }
  ];

  var quizHost = $('ec-quiz');
  var quizAnswers = {};

  function updateQuizScore() {
    var answered = Object.keys(quizAnswers).length;
    var correct = 0;
    Object.keys(quizAnswers).forEach(function (idx) {
      if (quizAnswers[idx]) correct++;
    });
    $('ec-quiz-score').textContent = 'Concept check: ' + correct + ' / ' + QUIZ.length + (answered < QUIZ.length ? ' (' + answered + ' answered)' : ' complete');
  }

  QUIZ.forEach(function (item, idx) {
    var box = document.createElement('div');
    box.className = 'ec-quiz-item';

    var prompt = document.createElement('p');
    prompt.className = 'ec-q-prompt';
    prompt.textContent = item.q;
    box.appendChild(prompt);

    var choices = document.createElement('div');
    choices.className = 'ec-q-choices';
    var fb = document.createElement('p');
    fb.className = 'ec-q-fb';
    fb.setAttribute('aria-live', 'polite');

    item.a.forEach(function (label, choiceIdx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ec-seg-btn';
      btn.textContent = label;
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call(choices.children, function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        var ok = choiceIdx === item.r;
        quizAnswers[idx] = ok;
        fb.className = 'ec-q-fb ' + (ok ? 'ec-ok' : 'ec-no');
        fb.textContent = (ok ? '✓ Correct. ' : 'Not quite. ') + item.why;
        updateQuizScore();
      });
      choices.appendChild(btn);
    });

    box.appendChild(choices);
    box.appendChild(fb);
    quizHost.appendChild(box);
  });

  updateQuizScore();
})();
