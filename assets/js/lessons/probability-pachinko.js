(function () {
  'use strict';

  var Core = window.PachinkoCore;
  if (!Core || !window.SimKit) return;

  var canvas = document.getElementById('pk-canvas');
  if (!canvas) return;

  var ctx = null;
  var boardWidth = 900;
  var boardHeight = 520;

  var scenarioSelect = document.getElementById('pk-scenario');
  var probInput = document.getElementById('pk-prob');
  var probReadout = document.getElementById('pk-prob-readout');
  var rowsInput = document.getElementById('pk-rows');
  var rowsReadout = document.getElementById('pk-rows-readout');
  var ballsInput = document.getElementById('pk-balls');
  var ballsReadout = document.getElementById('pk-balls-readout');
  var evSelect = document.getElementById('pk-ev-mode');
  var speedSelect = document.getElementById('pk-speed');

  var runBtn = document.getElementById('pk-run');
  var oneBtn = document.getElementById('pk-one');
  var tenBtn = document.getElementById('pk-ten');
  var hundredBtn = document.getElementById('pk-hundred');
  var streamBtn = document.getElementById('pk-stream');
  var resetBtn = document.getElementById('pk-reset');
  var clearPegsBtn = document.getElementById('pk-clear-pegs');

  var bellToggle = document.getElementById('pk-bell');
  var expectedToggle = document.getElementById('pk-expected-toggle');
  var pascalToggle = document.getElementById('pk-pascal');
  var heatmapToggle = document.getElementById('pk-heatmap');
  var soundToggle = document.getElementById('pk-sound');

  var modelNote = document.getElementById('pk-model-note');
  var hoverInfo = document.getElementById('pk-hover-info');
  var traceBanner = document.getElementById('pk-trace-banner');
  var evStrip = document.getElementById('pk-ev-strip');
  var evTheoNode = document.getElementById('pk-ev-theo');
  var evObsNode = document.getElementById('pk-ev-obs');
  var evTotalNode = document.getElementById('pk-ev-total');
  var evNoteNode = document.getElementById('pk-ev-note');

  var barsNode = document.getElementById('pk-bars');
  var insightNode = document.getElementById('pk-insight');

  var statTrials = document.getElementById('pk-stat-trials');
  var statMode = document.getElementById('pk-stat-mode');
  var statMean = document.getElementById('pk-stat-mean');
  var statSd = document.getElementById('pk-stat-sd');
  var statCenter = document.getElementById('pk-stat-center');
  var statSigma1 = document.getElementById('pk-stat-sigma1');

  var pTrials = document.getElementById('pk-p-trials');
  var pMode = document.getElementById('pk-p-mode');
  var pMean = document.getElementById('pk-p-mean');
  var pSd = document.getElementById('pk-p-sd');
  var pCenter = document.getElementById('pk-p-center');
  var pSigma1 = document.getElementById('pk-p-sigma1');

  var pRun = document.getElementById('pk-p-run');
  var pOne = document.getElementById('pk-p-one');
  var pStream = document.getElementById('pk-p-stream');
  var pReset = document.getElementById('pk-p-reset');
  var pHideExpected = document.getElementById('pk-p-hide-expected');

  var state = {
    rows: Number(rowsInput ? rowsInput.value : 10) || 10,
    scenario: scenarioSelect ? scenarioSelect.value : 'fair',
    baseP: Number(probInput ? probInput.value : 0.5) || 0.5,
    evMode: evSelect ? evSelect.value : 'off',
    speed: speedSelect ? speedSelect.value : 'normal',
    pegOverrides: {},
    counts: [],
    expected: null,
    pascal: [],
    binValues: null,
    activeBalls: [],
    dropQueue: [],
    batchQueue: null,
    streaming: false,
    streamAccum: 0,
    pegGlow: {},
    binGlow: [],
    predictedBin: null,
    hoveredPeg: null,
    hoveredBin: null,
    lastTrace: null,
    needsRender: true,
    uiDirty: true
  };

  var MAX_STREAM_BALLS = 25000;
  var audioCtx = null;
  var lastSoundAt = 0;

  var PENTATONIC_FREQS = [
    261.63, 293.66, 329.63, 392.00, 440.00,
    523.25, 587.33, 659.25, 783.99, 880.00,
    1046.50, 1174.66, 1318.51, 1567.98, 1760.00
  ];

  function playPlink(index, isLanding) {
    if (!soundToggle || !soundToggle.checked) return;
    var now = performance.now();
    if (now - lastSoundAt < 55) return;
    lastSoundAt = now;
    try {
      var AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      if (!audioCtx) audioCtx = new AudioCtor();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var t = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      var freqIdx = Math.max(0, Math.min(PENTATONIC_FREQS.length - 1, index));
      osc.type = isLanding ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(PENTATONIC_FREQS[freqIdx] * (isLanding ? 1 : 1.5), t);
      gain.gain.setValueAtTime(isLanding ? 0.065 : 0.025, t);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + (isLanding ? 0.16 : 0.06));
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + (isLanding ? 0.17 : 0.07));
    } catch (err) {
      /* Audio playback is optional and ignored if blocked. */
    }
  }

  function currentConfig() {
    return {
      rows: state.rows,
      scenario: state.scenario,
      baseP: state.baseP,
      pegOverrides: state.pegOverrides
    };
  }

  function recomputeModel() {
    var cfg = currentConfig();
    state.expected = Core.computeExpectedDistribution(cfg);
    state.pascal = Core.computePascalTriangle(state.rows);
    state.binValues = Core.buildBinValues(state.rows, state.evMode);
    if (state.counts.length !== state.rows + 1) {
      state.counts = new Array(state.rows + 1).fill(0);
    }
    if (state.binGlow.length !== state.rows + 1) {
      state.binGlow = new Array(state.rows + 1).fill(0);
    }
    if (state.predictedBin !== null && state.predictedBin > state.rows) {
      state.predictedBin = null;
    }
    state.needsRender = true;
    state.uiDirty = true;
  }

  function getBoardGeometry() {
    var width = boardWidth;
    var height = boardHeight;
    var rows = state.rows;
    var hasEv = Boolean(state.binValues);
    var topY = Math.max(38, Math.min(54, height * 0.09));
    var pegBottomY = Math.max(topY + 120, height * 0.59);
    var rowGap = (pegBottomY - topY) / rows;
    var maxSpread = Math.max(180, width - 68);
    var stepX = Math.min(maxSpread / (rows + 1.15), 54);
    var centerX = width / 2;
    var binTopY = pegBottomY + 24;
    var binBaseY = height - (hasEv ? 48 : 32);
    var barMaxH = Math.max(54, binBaseY - binTopY - 8);
    return {
      width: width,
      height: height,
      rows: rows,
      topY: topY,
      pegBottomY: pegBottomY,
      rowGap: rowGap,
      stepX: stepX,
      centerX: centerX,
      binTopY: binTopY,
      binBaseY: binBaseY,
      barMaxH: barMaxH,
      hasEv: hasEv
    };
  }

  function pegPoint(g, row, col) {
    return {
      x: g.centerX + (col - row / 2) * g.stepX,
      y: g.topY + row * g.rowGap
    };
  }

  function speedFactor() {
    if (state.speed === 'slow') return 0.52;
    if (state.speed === 'turbo') return 2.8;
    return 1.25;
  }

  function spawnBall(opts) {
    opts = opts || {};
    var res = Core.simulateBall(currentConfig());
    var isTrace = Boolean(opts.trace);
    state.activeBalls.push({
      path: res.path,
      choices: res.choices,
      bin: res.bin,
      progress: -0.45,
      lastPegRow: -1,
      speed: isTrace ? 5.2 : 10.5 * speedFactor(),
      trace: isTrace,
      weight: opts.weight || 1,
      counted: false,
      hue: isTrace ? 'gold' : ((state.activeBalls.length + res.bin) % 2 === 0 ? 'sky' : 'teal')
    });
    state.needsRender = true;
    return res;
  }

  function clearMotionQueues() {
    state.activeBalls = [];
    state.dropQueue = [];
    state.batchQueue = null;
    state.streaming = false;
    updateStreamButtons();
  }

  function resetData(keepCustomPegs) {
    clearMotionQueues();
    state.counts = new Array(state.rows + 1).fill(0);
    state.binGlow = new Array(state.rows + 1).fill(0);
    state.pegGlow = {};
    state.lastTrace = null;
    if (!keepCustomPegs) {
      state.pegOverrides = {};
    }
    recomputeModel();
    renderAll();
  }

  function launchBatch(totalBalls, clearExisting) {
    if (clearExisting) {
      clearMotionQueues();
      state.counts = new Array(state.rows + 1).fill(0);
      state.binGlow = new Array(state.rows + 1).fill(0);
      state.lastTrace = null;
    }

    if (totalBalls === 1) {
      var res = spawnBall({ trace: true, weight: 1 });
      state.lastTrace = {
        bin: res.bin,
        choices: res.choices,
        path: res.path
      };
      updateTraceBanner();
      state.needsRender = true;
      state.uiDirty = true;
      return;
    }

    if (state.speed === 'turbo' && totalBalls >= 200) {
      var cfg = currentConfig();
      for (var i = 0; i < totalBalls; i += 1) {
        var r = Core.simulateBall(cfg);
        state.counts[r.bin] += 1;
      }
      for (var w = 0; w < Math.min(28, totalBalls); w += 1) {
        spawnBall({ trace: false, weight: 0 });
      }
      state.uiDirty = true;
      state.needsRender = true;
      renderStatsAndBars();
      return;
    }

    if (totalBalls <= 120) {
      var spacing = totalBalls <= 15 ? 0.11 : 0.035;
      for (var q = 0; q < totalBalls; q += 1) {
        state.dropQueue.push({ delay: q * spacing, weight: 1 });
      }
    } else {
      // Stream visual balls representing proportional batches so bars rise smoothly in ~1.25s.
      var visualCount = 72;
      var perVisual = Math.floor(totalBalls / visualCount);
      var remainder = totalBalls - perVisual * visualCount;
      for (var v = 0; v < visualCount; v += 1) {
        var wCount = perVisual + (v < remainder ? 1 : 0);
        if (wCount > 0) {
          state.dropQueue.push({ delay: v * 0.017, weight: wCount });
        }
      }
    }
    state.needsRender = true;
  }

  function toggleStream() {
    state.streaming = !state.streaming;
    state.streamAccum = 0;
    updateStreamButtons();
    state.needsRender = true;
  }

  function updateStreamButtons() {
    var label = state.streaming ? 'Pause stream' : 'Stream';
    if (streamBtn) {
      streamBtn.textContent = label;
      streamBtn.setAttribute('aria-pressed', String(state.streaming));
      streamBtn.classList.toggle('is-active', state.streaming);
    }
    if (pStream) {
      pStream.textContent = state.streaming ? 'Pause' : 'Stream';
      pStream.setAttribute('aria-pressed', String(state.streaming));
    }
  }

  function stepSimulation(dt) {
    var changedCounts = false;

    if (state.streaming) {
      var totalSoFar = state.counts.reduce(function (a, b) { return a + b; }, 0);
      if (totalSoFar >= MAX_STREAM_BALLS) {
        state.streaming = false;
        updateStreamButtons();
      } else {
        var rate = state.speed === 'slow' ? 6 : (state.speed === 'turbo' ? 45 : 20);
        state.streamAccum += dt * rate;
        var spawns = Math.min(4, Math.floor(state.streamAccum));
        state.streamAccum -= spawns;
        for (var s = 0; s < spawns; s += 1) {
          if (state.activeBalls.length < 140) {
            spawnBall({ trace: false, weight: state.speed === 'turbo' ? 5 : 1 });
          }
        }
      }
    }

    if (state.dropQueue.length) {
      for (var d = state.dropQueue.length - 1; d >= 0; d -= 1) {
        state.dropQueue[d].delay -= dt;
        if (state.dropQueue[d].delay <= 0) {
          var item = state.dropQueue.splice(d, 1)[0];
          if (item.weight > 1) {
            // Add extra simulated balls silently alongside 1 visible traced drop
            var cfg = currentConfig();
            for (var extra = 1; extra < item.weight; extra += 1) {
              var extraRes = Core.simulateBall(cfg);
              state.counts[extraRes.bin] += 1;
            }
            changedCounts = true;
            spawnBall({ trace: false, weight: 1 });
          } else {
            spawnBall({ trace: false, weight: item.weight });
          }
        }
      }
      state.needsRender = true;
    }

    if (state.activeBalls.length) {
      for (var i = state.activeBalls.length - 1; i >= 0; i -= 1) {
        var ball = state.activeBalls[i];
        ball.progress += dt * ball.speed;

        var crossedRow = Math.floor(ball.progress);
        if (crossedRow >= 0 && crossedRow < state.rows && crossedRow > ball.lastPegRow) {
          ball.lastPegRow = crossedRow;
          var pk = Core.pegKey(crossedRow, ball.path[crossedRow]);
          state.pegGlow[pk] = 1.0;
          if (ball.trace) {
            playPlink(ball.path[crossedRow] + Math.max(0, Math.floor((10 - state.rows) / 2)), false);
          }
        }

        if (ball.progress >= state.rows) {
          if (!ball.counted && ball.weight > 0) {
            state.counts[ball.bin] += ball.weight;
            state.binGlow[ball.bin] = 1.0;
            changedCounts = true;
            if (ball.trace || state.activeBalls.length <= 6) {
              playPlink(ball.bin, true);
            }
          }
          ball.counted = true;
          if (ball.progress >= state.rows + 0.35) {
            state.activeBalls.splice(i, 1);
          }
        }
      }
      state.needsRender = true;
    }

    // Decay peg and bin glow
    for (var key in state.pegGlow) {
      if (Object.prototype.hasOwnProperty.call(state.pegGlow, key)) {
        state.pegGlow[key] -= dt * 3.4;
        if (state.pegGlow[key] <= 0.01) delete state.pegGlow[key];
        else state.needsRender = true;
      }
    }
    for (var b = 0; b < state.binGlow.length; b += 1) {
      if (state.binGlow[b] > 0) {
        state.binGlow[b] = Math.max(0, state.binGlow[b] - dt * 2.5);
        state.needsRender = true;
      }
    }

    if (changedCounts) {
      state.uiDirty = true;
    }
  }

  function formatCompact(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  function drawBoard() {
    if (!ctx) return;
    var g = getBoardGeometry();
    var exp = state.expected;
    var probs = exp ? exp.probs : [];
    var visitProbs = exp ? exp.pegVisitProbs : [];
    var total = state.counts.reduce(function (sum, v) { return sum + v; }, 0);
    var showExpected = !expectedToggle || expectedToggle.checked;
    var showBell = bellToggle && bellToggle.checked && showExpected;
    var showPascal = pascalToggle && pascalToggle.checked;
    var showHeat = heatmapToggle && heatmapToggle.checked;

    ctx.clearRect(0, 0, g.width, g.height);

    // Rich dark instrument backdrop
    ctx.fillStyle = '#07111f';
    ctx.fillRect(0, 0, g.width, g.height);
    var bgGrad = ctx.createLinearGradient(0, 0, g.width, g.height);
    bgGrad.addColorStop(0, 'rgba(14,165,233,0.14)');
    bgGrad.addColorStop(0.55, 'rgba(20,184,166,0.06)');
    bgGrad.addColorStop(1, 'rgba(250,204,21,0.10)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, g.width, g.height);

    // Subtle funnel walls at hopper
    ctx.save();
    ctx.strokeStyle = 'rgba(148,163,184,0.34)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.centerX - 38, 10);
    ctx.lineTo(g.centerX - 10, g.topY - 12);
    ctx.moveTo(g.centerX + 38, 10);
    ctx.lineTo(g.centerX + 10, g.topY - 12);
    ctx.stroke();

    // Outer frame rails around pyramid + bin chamber
    var leftEdge = g.centerX - g.stepX * (g.rows / 2 + 0.72);
    var rightEdge = g.centerX + g.stepX * (g.rows / 2 + 0.72);
    ctx.strokeStyle = 'rgba(226,232,240,0.14)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(leftEdge, g.topY - 14);
    ctx.lineTo(leftEdge, g.binBaseY + 2);
    ctx.lineTo(rightEdge, g.binBaseY + 2);
    ctx.lineTo(rightEdge, g.topY - 14);
    ctx.stroke();

    // Divider line between peg zone and histogram chamber
    ctx.strokeStyle = 'rgba(148,163,184,0.12)';
    ctx.beginPath();
    ctx.moveTo(leftEdge, g.binTopY - 4);
    ctx.lineTo(rightEdge, g.binTopY - 4);
    ctx.stroke();
    ctx.restore();

    // Determine vertical scale for bins & normal curve
    var maxCount = 0;
    for (var k = 0; k <= g.rows; k += 1) {
      if (state.counts[k] > maxCount) maxCount = state.counts[k];
    }
    var effectiveTotal = Math.max(total, 1);
    var maxExpectedCount = 0;
    for (var e = 0; e <= g.rows; e += 1) {
      maxExpectedCount = Math.max(maxExpectedCount, effectiveTotal * (probs[e] || 0));
    }
    var scaleMax = Math.max(1, maxCount, showExpected ? maxExpectedCount : 0);
    if (showBell && exp && exp.sd > 0.25) {
      scaleMax = Math.max(scaleMax, effectiveTotal * Core.normalPdf(exp.mean, exp.mean, exp.sd));
    }

    // ±1σ and ±2σ vertical bands inside histogram chamber
    if (showBell && exp && exp.sd > 0.25) {
      var xForK = function (val) { return g.centerX + (val - g.rows / 2) * g.stepX; };
      var x2L = Math.max(leftEdge, xForK(exp.mean - 2 * exp.sd));
      var x2R = Math.min(rightEdge, xForK(exp.mean + 2 * exp.sd));
      var x1L = Math.max(leftEdge, xForK(exp.mean - exp.sd));
      var x1R = Math.min(rightEdge, xForK(exp.mean + exp.sd));

      ctx.fillStyle = 'rgba(74,222,128,0.06)';
      ctx.fillRect(x2L, g.binTopY, Math.max(0, x2R - x2L), g.barMaxH + 8);
      ctx.fillStyle = 'rgba(74,222,128,0.10)';
      ctx.fillRect(x1L, g.binTopY, Math.max(0, x1R - x1L), g.barMaxH + 8);

      // Mean dashed line
      var meanX = xForK(exp.mean);
      if (meanX >= leftEdge && meanX <= rightEdge) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(74,222,128,0.58)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(meanX, g.binTopY - 2);
        ctx.lineTo(meanX, g.binBaseY);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Draw bins & histogram bars
    var barW = Math.max(10, g.stepX * 0.68);
    var modeCount = maxCount;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (var bin = 0; bin <= g.rows; bin += 1) {
      var bx = g.centerX + (bin - g.rows / 2) * g.stepX;
      var count = state.counts[bin] || 0;
      var barH = count > 0 ? Math.max(3, g.barMaxH * (count / scaleMax)) : 0;
      var isPredicted = state.predictedBin === bin;
      var isHovered = state.hoveredBin === bin;
      var glow = state.binGlow[bin] || 0;

      // Subtle bin slot guide
      ctx.fillStyle = isHovered ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.03)';
      ctx.fillRect(bx - barW / 2, g.binTopY, barW, g.barMaxH + 8);

      if (barH > 0) {
        var barGrad = ctx.createLinearGradient(0, g.binBaseY - barH, 0, g.binBaseY);
        if (count === modeCount && total >= 10) {
          barGrad.addColorStop(0, '#38bdf8');
          barGrad.addColorStop(1, '#0284c7');
        } else {
          barGrad.addColorStop(0, 'rgba(56,189,248,0.78)');
          barGrad.addColorStop(1, 'rgba(20,184,166,0.45)');
        }
        ctx.fillStyle = barGrad;
        ctx.fillRect(bx - barW / 2, g.binBaseY - barH, barW, barH);
      }

      if (glow > 0) {
        ctx.fillStyle = 'rgba(250,204,21,' + (glow * 0.28).toFixed(2) + ')';
        ctx.fillRect(bx - barW / 2, g.binBaseY - Math.max(barH, 10), barW, Math.max(barH, 10));
      }

      // Prediction highlight
      if (isPredicted) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx - barW / 2 - 1, g.binTopY, barW + 2, g.barMaxH + 8);
      }

      // Expected discrete marker (yellow diamond/line)
      if (showExpected && probs.length) {
        var expCount = (total > 0 ? total : 1) * probs[bin];
        var expY = g.binBaseY - g.barMaxH * (expCount / scaleMax);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(bx - barW * 0.42, expY);
        ctx.lineTo(bx + barW * 0.42, expY);
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(bx, expY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bin number pill below bar
      ctx.fillStyle = isPredicted ? '#fde047' : 'rgba(240,249,255,0.82)';
      ctx.font = '700 ' + (g.rows >= 13 ? '10' : '11') + 'px "IBM Plex Mono", monospace';
      ctx.fillText(String(bin), bx, g.binBaseY + 14);

      if (isPredicted) {
        ctx.fillStyle = '#facc15';
        ctx.font = '700 10px "IBM Plex Mono", monospace';
        ctx.fillText('★', bx, g.binTopY + 10);
      }

      // EV payout labels if enabled
      if (state.binValues) {
        var val = state.binValues[bin];
        ctx.fillStyle = val > 0 ? '#86efac' : (val < 0 ? '#fda4af' : 'rgba(148,163,184,0.75)');
        ctx.font = '700 ' + (g.rows >= 13 ? '9' : '10') + 'px "IBM Plex Mono", monospace';
        ctx.fillText((val > 0 ? '+' : '') + val, bx, g.binBaseY + 30);
      }
    }

    // Smooth normal curve overlay
    if (showBell && exp && exp.sd > 0.25) {
      ctx.save();
      ctx.beginPath();
      var steps = 140;
      for (var s = 0; s <= steps; s += 1) {
        var kVal = -0.55 + (g.rows + 1.1) * (s / steps);
        var px = g.centerX + (kVal - g.rows / 2) * g.stepX;
        var curveHeight = g.barMaxH * (effectiveTotal * Core.normalPdf(kVal, exp.mean, exp.sd)) / scaleMax;
        var py = Math.max(g.binTopY - 2, g.binBaseY - curveHeight);
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(74,222,128,0.95)';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.restore();
    }

    // Draw pegs (with optional heatmap, hit flash, custom tilt ring, and Pascal numbers)
    var pegRadius = g.rows >= 13 ? 3.8 : 4.6;
    for (var row = 0; row < g.rows; row += 1) {
      for (var col = 0; col <= row; col += 1) {
        var pt = pegPoint(g, row, col);
        var key = Core.pegKey(row, col);
        var override = state.pegOverrides[key];
        var hit = state.pegGlow[key] || 0;
        var visit = (visitProbs[row] && visitProbs[row][col]) || 0;
        var isPegHovered = state.hoveredPeg && state.hoveredPeg.row === row && state.hoveredPeg.col === col;

        if (showHeat && visit > 0.005) {
          ctx.beginPath();
          ctx.fillStyle = 'rgba(45,212,191,' + Math.min(0.42, visit * 0.72).toFixed(2) + ')';
          ctx.arc(pt.x, pt.y, pegRadius + 8 + visit * 5, 0, Math.PI * 2);
          ctx.fill();
        }

        if (hit > 0) {
          ctx.beginPath();
          ctx.fillStyle = 'rgba(250,204,21,' + (hit * 0.55).toFixed(2) + ')';
          ctx.arc(pt.x, pt.y, pegRadius + 5 + hit * 5, 0, Math.PI * 2);
          ctx.fill();
        }

        if (override) {
          ctx.beginPath();
          ctx.strokeStyle = override === 'right' ? '#f59e0b' : '#a855f7';
          ctx.lineWidth = 2.2;
          ctx.arc(pt.x, pt.y, pegRadius + 4.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (isPegHovered) {
          ctx.beginPath();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.arc(pt.x, pt.y, pegRadius + 7, 0, Math.PI * 2);
          ctx.stroke();
        }

        var pegColor = override === 'right' ? '#f59e0b' : (override === 'left' ? '#a855f7' : '#cbd5e1');
        var pegRim = override === 'right' ? '#b45309' : (override === 'left' ? '#6b21a8' : '#475569');

        ctx.beginPath();
        ctx.fillStyle = pegColor;
        ctx.arc(pt.x, pt.y, pegRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = pegRim;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.arc(pt.x - pegRadius * 0.28, pt.y - pegRadius * 0.28, pegRadius * 0.32, 0, Math.PI * 2);
        ctx.fill();

        if (override) {
          ctx.fillStyle = override === 'right' ? '#fde047' : '#d8b4fe';
          ctx.font = '800 9px "IBM Plex Mono", monospace';
          ctx.fillText(override === 'right' ? '→' : '←', pt.x, pt.y - pegRadius - 7);
        } else if (showPascal && state.pascal[row]) {
          var paths = state.pascal[row][col];
          var labelTxt = formatCompact(paths);
          ctx.fillStyle = 'rgba(186,230,253,0.92)';
          ctx.font = '700 ' + (g.rows >= 12 ? '8.5' : '10') + 'px "IBM Plex Mono", monospace';
          ctx.fillText(labelTxt, pt.x, pt.y - pegRadius - 7);
        }
      }
    }

    // Draw animated balls & parabolic bounce arcs
    for (var i = 0; i < state.activeBalls.length; i += 1) {
      var ball = state.activeBalls[i];
      var prog = ball.progress;
      var bxPos, byPos;

      if (prog < 0) {
        var entryT = Core.clamp((prog + 0.45) / 0.45, 0, 1);
        var rootPt = pegPoint(g, 0, 0);
        bxPos = rootPt.x;
        byPos = 12 + (rootPt.y - 12) * (entryT * entryT);
      } else if (prog >= g.rows) {
        var landT = Core.clamp((prog - g.rows) / 0.35, 0, 1);
        var binX = g.centerX + (ball.bin - g.rows / 2) * g.stepX;
        var lastRowPt = pegPoint(g, g.rows, ball.bin);
        bxPos = binX;
        byPos = lastRowPt.y + (g.binBaseY - 12 - lastRowPt.y) * landT;
      } else {
        var rIdx = Math.floor(prog);
        var localT = prog - rIdx;
        var startPt = pegPoint(g, rIdx, ball.path[rIdx]);
        var endPt = pegPoint(g, rIdx + 1, ball.path[rIdx + 1]);
        var easeX = 1 - Math.pow(1 - localT, 1.55);
        var hop = Math.sin(localT * Math.PI) * Math.min(8, g.rowGap * 0.25);
        bxPos = startPt.x + (endPt.x - startPt.x) * easeX;
        byPos = startPt.y + (endPt.y - startPt.y) * (localT * localT) - hop;
      }

      if (ball.trace) {
        ctx.save();
        ctx.beginPath();
        var root = pegPoint(g, 0, 0);
        ctx.moveTo(root.x, 12);
        var drawnRows = Math.min(g.rows - 1, Math.floor(Math.max(0, prog)));
        for (var tr = 0; tr <= drawnRows; tr += 1) {
          var tp = pegPoint(g, tr, ball.path[tr]);
          ctx.lineTo(tp.x, tp.y);
        }
        ctx.lineTo(bxPos, byPos);
        ctx.strokeStyle = 'rgba(250,204,21,0.75)';
        ctx.lineWidth = 2.6;
        ctx.stroke();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.fillStyle = ball.hue === 'gold' ? '#fde047' : (ball.hue === 'sky' ? '#f8fafc' : '#99f6e4');
      ctx.arc(bxPos, byPos, ball.trace ? 6.2 : 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ball.trace ? '#f59e0b' : 'rgba(56,189,248,0.85)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // Subtle canvas corner legend
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '600 10.5px "IBM Plex Mono", monospace';
    ctx.fillStyle = 'rgba(226,232,240,0.68)';
    ctx.fillText('Click any peg to tilt · Click a bin to predict', 12, 18);
    if (showBell && exp) {
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(134,239,172,0.9)';
      ctx.fillText('μ = ' + exp.mean.toFixed(2) + ' · σ = ' + exp.sd.toFixed(2), g.width - 12, 18);
    }
    ctx.restore();
  }

  function formatPercent(value) {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return (value * 100).toFixed(value < 0.1 ? 1 : 0) + '%';
  }

  function updateTraceBanner() {
    if (!traceBanner) return;
    if (state.lastTrace) {
      var seq = state.lastTrace.choices.join(' → ');
      var predNote = '';
      if (state.predictedBin !== null) {
        predNote = state.predictedBin === state.lastTrace.bin
          ? ' · Hit your ★ Bin ' + state.predictedBin + ' prediction!'
          : ' · Predicted ★ Bin ' + state.predictedBin + '.';
      }
      traceBanner.textContent = 'Last traced ball: ' + seq + ' → Landed in Bin ' + state.lastTrace.bin + predNote;
      traceBanner.hidden = false;
    } else if (state.predictedBin !== null) {
      var prob = state.expected && state.expected.probs[state.predictedBin] ? state.expected.probs[state.predictedBin] : 0;
      traceBanner.textContent = 'Prediction locked: ★ Bin ' + state.predictedBin + ' (model probability ' + (prob * 100).toFixed(1) + '%). Launch a sample to test it!';
      traceBanner.hidden = false;
    } else {
      traceBanner.hidden = true;
    }
  }

  function renderStatsAndBars() {
    var exp = state.expected;
    var probs = exp ? exp.probs : [];
    var summary = Core.summarizeCounts(state.counts, probs, state.binValues, exp);
    var showExpected = !expectedToggle || expectedToggle.checked;

    var trialsText = summary.total.toLocaleString();
    var modeText = summary.total ? 'Bin ' + summary.modeBin : '--';
    var meanText = summary.total
      ? summary.mean.toFixed(2) + (showExpected && exp ? ' (μ ' + exp.mean.toFixed(2) + ')' : '')
      : '--';
    var sdText = summary.total
      ? summary.sd.toFixed(2) + (showExpected && exp ? ' (σ ' + exp.sd.toFixed(2) + ')' : '')
      : '--';
    var centerText = summary.total ? formatPercent(summary.centerShare) : '--';
    var sig1Text = summary.within1Sd !== null ? formatPercent(summary.within1Sd) : '--';

    if (statTrials) statTrials.textContent = trialsText;
    if (statMode) statMode.textContent = modeText;
    if (statMean) statMean.textContent = meanText;
    if (statSd) statSd.textContent = sdText;
    if (statCenter) statCenter.textContent = centerText;
    if (statSigma1) statSigma1.textContent = sig1Text;

    if (pTrials) pTrials.textContent = trialsText;
    if (pMode) pMode.textContent = modeText;
    if (pMean) pMean.textContent = summary.total ? summary.mean.toFixed(2) : '--';
    if (pSd) pSd.textContent = summary.total ? summary.sd.toFixed(2) : '--';
    if (pCenter) pCenter.textContent = centerText;
    if (pSigma1) pSigma1.textContent = sig1Text;

    // EV Strip
    if (evStrip) {
      if (state.binValues) {
        evStrip.hidden = false;
        if (evTheoNode) evTheoNode.textContent = (summary.theoreticalEV >= 0 ? '+' : '') + summary.theoreticalEV.toFixed(2) + ' pts/ball';
        if (evObsNode) evObsNode.textContent = summary.observedEV !== null ? (summary.observedEV >= 0 ? '+' : '') + summary.observedEV.toFixed(2) + ' pts/ball' : '--';
        if (evTotalNode) evTotalNode.textContent = summary.totalScore !== null ? summary.totalScore.toLocaleString() + ' pts' : '0 pts';
        if (evNoteNode) evNoteNode.textContent = Core.EV_PRESETS[state.evMode].note;
      } else {
        evStrip.hidden = true;
      }
    }

    // Bars list
    if (barsNode) {
      var maxRate = 0.01;
      for (var i = 0; i < state.counts.length; i += 1) {
        var obsRate = summary.total ? state.counts[i] / summary.total : 0;
        if (obsRate > maxRate) maxRate = obsRate;
        if (showExpected && (probs[i] || 0) > maxRate) maxRate = probs[i];
      }
      barsNode.innerHTML = state.counts.map(function (count, index) {
        var obs = summary.total ? count / summary.total : 0;
        var expRate = probs[index] || 0;
        var evBadge = state.binValues ? ' · ' + (state.binValues[index] > 0 ? '+' : '') + state.binValues[index] + 'pt' : '';
        var star = state.predictedBin === index ? ' ★' : '';
        return '<div class="pk-bar-row' + (state.predictedBin === index ? ' is-predicted' : '') + '">' +
          '<span>Bin ' + index + star + '</span>' +
          '<span class="pk-bar-track">' +
            '<span class="pk-bar-fill" style="width:' + (obs / maxRate * 100).toFixed(1) + '%"></span>' +
            (showExpected ? '<span class="pk-bar-expected" style="left:' + (expRate / maxRate * 100).toFixed(1) + '%"></span>' : '') +
          '</span>' +
          '<span>' + count + ' / ' + formatPercent(obs) + evBadge + '</span>' +
        '</div>';
      }).join('');
    }

    // Insight message
    if (insightNode) {
      if (!summary.total) {
        insightNode.textContent = 'Click any bin to predict the winner, then launch balls to test the model.';
      } else if (!showExpected) {
        insightNode.textContent = 'Predict mode active (' + summary.total + ' balls dropped): observed mean is ' + summary.mean.toFixed(2) + ', mode is Bin ' + summary.modeBin + '. Turn on "Show expected model" when ready to reveal the theoretical curve.';
      } else {
        var center = state.rows / 2;
        var direction = summary.mean < center - 0.25 ? 'left of center' : (summary.mean > center + 0.25 ? 'right of center' : 'near the center');
        var predText = '';
        if (state.predictedBin !== null) {
          predText = summary.modeBin === state.predictedBin
            ? ' Your ★ Bin ' + state.predictedBin + ' prediction is currently winning!'
            : ' You predicted ★ Bin ' + state.predictedBin + '; Bin ' + summary.modeBin + ' currently leads.';
        }
        insightNode.textContent = summary.fitLabel + ' — sample sits ' + direction + ' (mean ' + summary.mean.toFixed(2) + ' vs model μ ' + exp.mean.toFixed(2) + ', max bin gap ' + formatPercent(summary.maxGap) + ').' + predText;
      }
    }

    updateTraceBanner();
  }

  function updateReadouts() {
    if (rowsReadout) rowsReadout.textContent = state.rows + ' rows';
    if (ballsReadout && ballsInput) ballsReadout.textContent = ballsInput.value + ' balls';
    if (probReadout) probReadout.textContent = 'p = ' + state.baseP.toFixed(2);
    if (clearPegsBtn) {
      var customCount = Object.keys(state.pegOverrides).length;
      clearPegsBtn.hidden = customCount === 0;
      clearPegsBtn.textContent = 'Clear ' + customCount + ' tilted peg' + (customCount === 1 ? '' : 's');
    }
    if (modelNote) {
      var sc = Core.SCENARIOS[state.scenario] || Core.SCENARIOS.fair;
      var customCountNote = Object.keys(state.pegOverrides).length;
      var extra = customCountNote ? ' (' + customCountNote + ' custom peg' + (customCountNote === 1 ? '' : 's') + ' tilted on canvas.)' : '';
      modelNote.innerHTML = '<strong>' + sc.title + '</strong>' + sc.note + extra;
    }
  }

  function renderAll() {
    updateReadouts();
    drawBoard();
    renderStatsAndBars();
  }

  function applyScenario(scenarioKey, customP, customRows, customBalls, customEv) {
    if (scenarioSelect && Core.SCENARIOS[scenarioKey]) {
      scenarioSelect.value = scenarioKey;
      state.scenario = scenarioKey;
    }
    if (typeof customP === 'number') {
      state.baseP = customP;
    } else if (Core.SCENARIOS[state.scenario]) {
      state.baseP = Core.SCENARIOS[state.scenario].p;
    }
    if (probInput) probInput.value = state.baseP.toFixed(2);

    if (typeof customRows === 'number') {
      state.rows = customRows;
      if (rowsInput) rowsInput.value = String(customRows);
    }
    if (typeof customBalls === 'number' && ballsInput) {
      ballsInput.value = String(customBalls);
    }
    if (customEv && evSelect && Core.EV_PRESETS[customEv]) {
      state.evMode = customEv;
      evSelect.value = customEv;
    }
    resetData(true);
  }

  // Canvas pointer interactions: click peg to tilt, click bin to predict
  function canvasCoords(event) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (boardWidth / Math.max(1, rect.width)),
      y: (event.clientY - rect.top) * (boardHeight / Math.max(1, rect.height))
    };
  }

  function findHitTarget(x, y) {
    var g = getBoardGeometry();
    var bestPeg = null;
    var bestDist = 17;
    for (var row = 0; row < g.rows; row += 1) {
      for (var col = 0; col <= row; col += 1) {
        var pt = pegPoint(g, row, col);
        var d = Math.hypot(pt.x - x, pt.y - y);
        if (d < bestDist) {
          bestDist = d;
          bestPeg = { row: row, col: col };
        }
      }
    }
    if (bestPeg) return { type: 'peg', peg: bestPeg };

    if (y >= g.binTopY - 4 && y <= g.binBaseY + 34) {
      var barW = Math.max(10, g.stepX * 0.68);
      for (var bin = 0; bin <= g.rows; bin += 1) {
        var bx = g.centerX + (bin - g.rows / 2) * g.stepX;
        if (Math.abs(x - bx) <= Math.max(barW * 0.65, g.stepX * 0.45)) {
          return { type: 'bin', bin: bin };
        }
      }
    }
    return null;
  }

  canvas.addEventListener('pointermove', function (event) {
    var pos = canvasCoords(event);
    var hit = findHitTarget(pos.x, pos.y);
    var prevPeg = state.hoveredPeg;
    var prevBin = state.hoveredBin;

    state.hoveredPeg = hit && hit.type === 'peg' ? hit.peg : null;
    state.hoveredBin = hit && hit.type === 'bin' ? hit.bin : null;
    canvas.style.cursor = hit ? 'pointer' : 'default';

    if (hoverInfo) {
      if (state.hoveredPeg) {
        var r = state.hoveredPeg.row;
        var c = state.hoveredPeg.col;
        var localP = Core.pegProbability(currentConfig(), r, c);
        var ways = state.pascal[r] ? state.pascal[r][c] : Core.combination(r, c);
        var ov = state.pegOverrides[Core.pegKey(r, c)];
        var ovTxt = ov ? ' (tilted ' + ov + ')' : ' (fair/default)';
        hoverInfo.textContent = 'Peg row ' + (r + 1) + ', col ' + (c + 1) + ': ' + ways.toLocaleString() + ' path' + (ways === 1 ? '' : 's') + ' reach here · p(R) = ' + localP.toFixed(2) + ovTxt + ' — click to tilt.';
      } else if (state.hoveredBin !== null) {
        var b = state.hoveredBin;
        var waysBin = state.pascal[state.rows] ? state.pascal[state.rows][b] : 0;
        var expP = state.expected && state.expected.probs[b] ? (state.expected.probs[b] * 100).toFixed(1) : '0.0';
        var showExp = !expectedToggle || expectedToggle.checked;
        hoverInfo.textContent = 'Bin ' + b + ': ' + waysBin.toLocaleString() + ' paths' + (showExp ? ' (' + expP + '% expected)' : '') + ' · ' + (state.counts[b] || 0) + ' landed — click to ★ predict.';
      } else {
        hoverInfo.textContent = 'Tip: Click any peg to tilt it left/right, or click any bin below to lock a ★ prediction.';
      }
    }

    var changed = (Boolean(prevPeg) !== Boolean(state.hoveredPeg)) ||
      (prevPeg && state.hoveredPeg && (prevPeg.row !== state.hoveredPeg.row || prevPeg.col !== state.hoveredPeg.col)) ||
      prevBin !== state.hoveredBin;
    if (changed) state.needsRender = true;
  });

  canvas.addEventListener('pointerleave', function () {
    if (state.hoveredPeg || state.hoveredBin !== null) {
      state.hoveredPeg = null;
      state.hoveredBin = null;
      state.needsRender = true;
    }
  });

  canvas.addEventListener('click', function (event) {
    var pos = canvasCoords(event);
    var hit = findHitTarget(pos.x, pos.y);
    if (!hit) return;

    if (hit.type === 'peg') {
      var key = Core.pegKey(hit.peg.row, hit.peg.col);
      var current = state.pegOverrides[key];
      if (!current) state.pegOverrides[key] = 'right';
      else if (current === 'right') state.pegOverrides[key] = 'left';
      else delete state.pegOverrides[key];

      recomputeModel();
      renderAll();
      return;
    }

    if (hit.type === 'bin') {
      state.predictedBin = state.predictedBin === hit.bin ? null : hit.bin;
      updateTraceBanner();
      renderStatsAndBars();
      state.needsRender = true;
    }
  });

  // Wire UI listeners
  if (scenarioSelect) {
    scenarioSelect.addEventListener('change', function () {
      applyScenario(scenarioSelect.value);
    });
  }
  if (probInput) {
    probInput.addEventListener('input', function () {
      state.baseP = Number(probInput.value);
      if (state.scenario === 'fair' || state.scenario === 'left' || state.scenario === 'right') {
        if (Math.abs(state.baseP - 0.5) < 0.005) state.scenario = 'fair';
        else if (Math.abs(state.baseP - 0.35) < 0.005) state.scenario = 'left';
        else if (Math.abs(state.baseP - 0.65) < 0.005) state.scenario = 'right';
        else state.scenario = 'custom';
        if (scenarioSelect) scenarioSelect.value = state.scenario;
      }
      recomputeModel();
      renderAll();
    });
  }
  if (rowsInput) {
    rowsInput.addEventListener('input', function () {
      state.rows = Number(rowsInput.value);
      resetData(false);
    });
  }
  if (ballsInput) {
    ballsInput.addEventListener('input', updateReadouts);
  }
  if (evSelect) {
    evSelect.addEventListener('change', function () {
      state.evMode = evSelect.value;
      recomputeModel();
      renderAll();
    });
  }
  if (speedSelect) {
    speedSelect.addEventListener('change', function () {
      state.speed = speedSelect.value;
    });
  }

  [bellToggle, pascalToggle, heatmapToggle].forEach(function (el) {
    if (el) el.addEventListener('change', function () { state.needsRender = true; });
  });

  function syncExpectedToggles(checked) {
    if (expectedToggle) expectedToggle.checked = checked;
    if (pHideExpected) pHideExpected.checked = !checked;
    state.needsRender = true;
    renderStatsAndBars();
  }
  if (expectedToggle) {
    expectedToggle.addEventListener('change', function () { syncExpectedToggles(expectedToggle.checked); });
  }
  if (pHideExpected) {
    pHideExpected.addEventListener('change', function () { syncExpectedToggles(!pHideExpected.checked); });
  }

  if (runBtn) runBtn.addEventListener('click', function () { launchBatch(Number(ballsInput ? ballsInput.value : 1000), true); });
  if (oneBtn) oneBtn.addEventListener('click', function () { launchBatch(1, false); });
  if (tenBtn) tenBtn.addEventListener('click', function () { launchBatch(10, false); });
  if (hundredBtn) hundredBtn.addEventListener('click', function () { launchBatch(100, false); });
  if (streamBtn) streamBtn.addEventListener('click', toggleStream);
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      resetData(true);
    });
  }
  if (clearPegsBtn) {
    clearPegsBtn.addEventListener('click', function () {
      state.pegOverrides = {};
      recomputeModel();
      renderAll();
    });
  }

  // Quick investigation chips & scenario cards
  document.querySelectorAll('.pk-btn-chip, .pk-scenario-launch').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var sc = btn.dataset.scenario || 'fair';
      var rows = btn.dataset.rows ? Number(btn.dataset.rows) : state.rows;
      var balls = btn.dataset.balls ? Number(btn.dataset.balls) : 1000;
      var ev = btn.dataset.ev || 'off';
      state.pegOverrides = {};
      applyScenario(sc, undefined, rows, balls, ev);
      if (btn.classList.contains('pk-scenario-launch')) {
        var labEl = document.getElementById('pk-lab');
        if (labEl && labEl.scrollIntoView) labEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      launchBatch(balls, true);
    });
  });

  // Sidebar controls & presets
  if (pRun) pRun.addEventListener('click', function () { launchBatch(100, false); });
  if (pOne) pOne.addEventListener('click', function () { launchBatch(1, false); });
  if (pStream) pStream.addEventListener('click', toggleStream);
  if (pReset) pReset.addEventListener('click', function () { resetData(true); });

  document.querySelectorAll('.pk-panel-preset').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var preset = btn.dataset.preset;
      state.pegOverrides = {};
      if (preset === 'fair') applyScenario('fair', 0.50, 10, 1000, 'off');
      else if (preset === 'left') applyScenario('left', 0.35, 10, 1000, 'off');
      else if (preset === 'right') applyScenario('right', 0.65, 10, 1000, 'off');
      else if (preset === 'center') applyScenario('center', 0.50, 10, 1000, 'off');
      else if (preset === 'edge') applyScenario('edge', 0.50, 10, 1000, 'edge-jackpot');
      else if (preset === 'deep') applyScenario('fair', 0.50, 14, 1500, 'off');
      launchBatch(Number(ballsInput ? ballsInput.value : 1000), true);
    });
  });

  // Practice auto-checker
  document.querySelectorAll('.pk-practice-item').forEach(function (item) {
    var input = item.querySelector('input');
    var btn = item.querySelector('button');
    var fb = item.querySelector('.fb');
    if (!input || !btn || !fb) return;
    function checkAnswer() {
      var val = parseFloat(input.value);
      if (isNaN(val)) {
        fb.textContent = 'Enter a number first.';
        fb.className = 'fb no';
        return;
      }
      var target = parseFloat(item.dataset.answer);
      var tol = parseFloat(item.dataset.tolerance || '0.05');
      if (Math.abs(val - target) <= tol) {
        fb.textContent = '✔ Correct! ' + (item.dataset.explain || '');
        fb.className = 'fb ok';
      } else {
        fb.textContent = 'Not yet — ' + (item.dataset.hint || 'try testing this setup in the board above.');
        fb.className = 'fb no';
      }
    }
    btn.addEventListener('click', checkAnswer);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') checkAnswer();
    });
  });

  SimKit.canvas2d(canvas, {
    onResize: function (rCtx, w, h) {
      ctx = rCtx;
      boardWidth = w;
      boardHeight = h;
      state.needsRender = true;
      drawBoard();
    }
  });

  SimKit.loop(function (dt) {
    stepSimulation(dt);
    if (state.uiDirty) {
      renderStatsAndBars();
      state.uiDirty = false;
    }
    if (state.needsRender) {
      drawBoard();
      state.needsRender = false;
    }
  }, { el: canvas, maxDt: 0.05 });

  recomputeModel();
  (function seedInitialSample() {
    var cfg = currentConfig();
    for (var i = 0; i < 1000; i += 1) {
      var res = Core.simulateBall(cfg);
      state.counts[res.bin] += 1;
    }
    for (var v = 0; v < 24; v += 1) {
      var b = spawnBall({ trace: false, weight: 0 });
      if (b && state.activeBalls.length) {
        state.activeBalls[state.activeBalls.length - 1].progress = (v / 24) * state.rows;
      }
    }
  })();
  renderAll();
})();
