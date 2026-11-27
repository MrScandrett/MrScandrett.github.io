(function () {
  'use strict';

  var Core = window.ProbabilitySimulatorCore;
  if (!Core) return;

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var GHOST_COLORS = ['#a855f7', '#22c55e', '#38bdf8', '#fb7185'];

  var experimentSelect = document.getElementById('ps-experiment');
  var trackedSelect = document.getElementById('ps-tracked-select');
  var trialsInput = document.getElementById('ps-trials');
  var trialsReadout = document.getElementById('ps-trials-readout');
  var sourcePresetBtn = document.getElementById('ps-source-preset');
  var sourceCustomBtn = document.getElementById('ps-source-custom');
  var customPanel = document.getElementById('ps-custom-panel');
  var customGrid = document.getElementById('ps-custom-grid');
  var customTrackedSelect = document.getElementById('ps-custom-tracked');
  var customFeedback = document.getElementById('ps-custom-feedback');
  var addOutcomeBtn = document.getElementById('ps-add-outcome');
  var applyCustomBtn = document.getElementById('ps-apply-custom');

  var runBtn = document.getElementById('ps-run');
  var step1Btn = document.getElementById('ps-step-1');
  var step10Btn = document.getElementById('ps-step-10');
  var step100Btn = document.getElementById('ps-step-100');
  var watchBtn = document.getElementById('ps-watch');
  var resetBtn = document.getElementById('ps-reset');
  var pinRunBtn = document.getElementById('ps-pin-run');
  var clearPinsBtn = document.getElementById('ps-clear-pins');

  var seToggle = document.getElementById('ps-se-toggle');
  var replaceRow = document.getElementById('ps-replace-row');
  var replaceToggle = document.getElementById('ps-replace-toggle');

  var mysteryBtn = document.getElementById('ps-mystery-btn');
  var mysteryBox = document.getElementById('ps-mystery-box');
  var mysteryFairBtn = document.getElementById('ps-mystery-fair');
  var mysteryLoadedBtn = document.getElementById('ps-mystery-loaded');
  var mysteryExitBtn = document.getElementById('ps-mystery-exit');
  var mysteryStatus = document.getElementById('ps-mystery-status');

  var eventName = document.getElementById('ps-event-name');
  var expectedNode = document.getElementById('ps-expected');
  var observedNode = document.getElementById('ps-observed');
  var differenceNode = document.getElementById('ps-difference');
  var streakNode = document.getElementById('ps-streak');
  var fallacyNode = document.getElementById('ps-fallacy');

  var barsNode = document.getElementById('ps-bars');
  var checkpointsNode = document.getElementById('ps-checkpoints');
  var trendNode = document.getElementById('ps-trend');
  var modelNoteNode = document.getElementById('ps-model-note');
  var stageDisplayNode = document.getElementById('ps-stage-display');
  var stageStatusNode = document.getElementById('ps-stage-status');
  var stageNoteNode = document.getElementById('ps-stage-note');
  var graphNode = document.getElementById('ps-graph');
  var graphCaptionNode = document.getElementById('ps-graph-caption-text');

  var currentSource = 'preset';
  var currentCustomExperiment = null;
  var customOutcomeId = 0;
  var mysteryState = null;
  var runState = null;
  var ghostRuns = [];

  function formatPercent(value) {
    return (value * 100).toFixed(1) + '%';
  }

  function formatGap(value) {
    var sign = value > 0 ? '+' : '';
    return sign + (value * 100).toFixed(1) + ' pts';
  }

  function createSvgNode(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  function getActiveConfig() {
    if (mysteryState) return mysteryState.experiment;
    if (currentSource === 'custom' && currentCustomExperiment) return currentCustomExperiment;
    return Core.PRESET_EXPERIMENTS[experimentSelect.value];
  }

  function updateReadout() {
    trialsReadout.textContent = Number(trialsInput.value).toLocaleString() + ' trials';
  }

  function syncTrackedDropdown(config, selectedIdx) {
    if (!trackedSelect) return;
    trackedSelect.innerHTML = '';
    config.outcomes.forEach(function (o, idx) {
      var opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = o.label + (mysteryState ? '' : ' (' + formatPercent(o.weight) + ')');
      trackedSelect.appendChild(opt);
    });
    trackedSelect.value = String(selectedIdx);
  }

  function syncReplacementUI(config) {
    if (!replaceRow || !replaceToggle) return;
    var show = !mysteryState && Boolean(config.supportsWithoutReplacement);
    replaceRow.hidden = !show;
    if (!show) replaceToggle.checked = false;
  }

  function setSource(source) {
    currentSource = source;
    if (sourcePresetBtn) sourcePresetBtn.classList.toggle('is-active', source === 'preset');
    if (sourceCustomBtn) sourceCustomBtn.classList.toggle('is-active', source === 'custom');
    if (customPanel) customPanel.classList.toggle('is-active', source === 'custom');
    if (experimentSelect) experimentSelect.disabled = source === 'custom' || Boolean(mysteryState);
  }

  function createCustomRow(label, weight) {
    customOutcomeId += 1;
    var row = document.createElement('div');
    row.className = 'ps-custom-row';
    row.dataset.rowId = String(customOutcomeId);
    row.innerHTML =
      '<input class="ps-custom-input ps-custom-label" type="text" maxlength="18" placeholder="Outcome label" aria-label="Custom outcome label" value="' + label + '" />' +
      '<input class="ps-custom-input ps-custom-weight" type="number" min="1" step="1" aria-label="Custom outcome weight" value="' + weight + '" />' +
      '<button class="ps-remove-row" type="button" aria-label="Remove outcome">-</button>';
    customGrid.appendChild(row);
  }

  function getCustomRows() {
    return Array.prototype.slice.call(customGrid.querySelectorAll('.ps-custom-row'));
  }

  function syncCustomTrackedOptions() {
    var rows = getCustomRows();
    var previous = customTrackedSelect.value;
    customTrackedSelect.innerHTML = '';
    rows.forEach(function (row, index) {
      var labelInput = row.querySelector('.ps-custom-label');
      var option = document.createElement('option');
      option.value = String(index);
      option.textContent = labelInput.value.trim() || ('Outcome ' + (index + 1));
      customTrackedSelect.appendChild(option);
    });
    if (previous && Number(previous) < rows.length) {
      customTrackedSelect.value = previous;
    }
    rows.forEach(function (row) {
      row.querySelector('.ps-remove-row').disabled = rows.length <= 2;
    });
  }

  function setCustomFeedback(message, tone) {
    customFeedback.textContent = message;
    customFeedback.style.background = tone === 'error' ? 'rgba(239,68,68,0.14)' : 'rgba(14,165,233,0.12)';
    customFeedback.style.borderColor = tone === 'error' ? 'rgba(239,68,68,0.32)' : 'rgba(14,165,233,0.24)';
    customFeedback.style.color = tone === 'error' ? '#fee2e2' : '#e0f2fe';
  }

  function getSelectedCustomVisual() {
    var checked = document.querySelector('input[name="ps-custom-visual"]:checked');
    return checked ? checked.value : 'spinner';
  }

  function buildCustomFromDOM() {
    var rows = getCustomRows().map(function (row) {
      return {
        label: row.querySelector('.ps-custom-label').value,
        weight: row.querySelector('.ps-custom-weight').value
      };
    });
    var result = Core.buildCustomExperiment(rows, Number(customTrackedSelect.value || 0), getSelectedCustomVisual());
    if (!result.ok) {
      setCustomFeedback(result.error, 'error');
      return null;
    }
    return result.experiment;
  }

  function resetRunState(clearGhosts) {
    var config = getActiveConfig();
    if (clearGhosts) ghostRuns = [];
    syncReplacementUI(config);
    runState = Core.createRunState(config, {
      withoutReplacement: Boolean(replaceToggle && replaceToggle.checked && config.supportsWithoutReplacement)
    });
    syncTrackedDropdown(config, runState.trackedIndex);
    renderEmptyState();
  }

  function renderGraph(state) {
    graphNode.innerHTML = '';
    var width = 620;
    var height = 230;
    var padding = { top: 18, right: 20, bottom: 32, left: 40 };
    var chartWidth = width - padding.left - padding.right;
    var chartHeight = height - padding.top - padding.bottom;
    var config = state.config;
    var trackedOutcome = config.outcomes[state.trackedIndex];
    var expectedProb = trackedOutcome.weight;
    var hideExpected = Boolean(mysteryState && !mysteryState.revealed);
    var showSeBand = Boolean(seToggle && seToggle.checked && !hideExpected);

    [0, 0.25, 0.5, 0.75, 1].forEach(function (tick) {
      var y = padding.top + chartHeight - (tick * chartHeight);
      graphNode.appendChild(createSvgNode('line', {
        x1: padding.left, y1: y, x2: width - padding.right, y2: y,
        stroke: 'rgba(255,255,255,0.08)', 'stroke-width': 1
      }));
      var label = createSvgNode('text', {
        x: 8, y: y + 4, fill: 'rgba(255,247,237,0.55)', 'font-size': 10, 'font-family': 'IBM Plex Mono, monospace'
      });
      label.textContent = Math.round(tick * 100) + '%';
      graphNode.appendChild(label);
    });

    graphNode.appendChild(createSvgNode('line', {
      x1: padding.left, y1: height - padding.bottom, x2: width - padding.right, y2: height - padding.bottom,
      stroke: 'rgba(255,255,255,0.2)', 'stroke-width': 1.2
    }));
    graphNode.appendChild(createSvgNode('line', {
      x1: padding.left, y1: padding.top, x2: padding.left, y2: height - padding.bottom,
      stroke: 'rgba(255,255,255,0.2)', 'stroke-width': 1.2
    }));

    var maxTrial = Math.max(state.trials, 1);
    ghostRuns.forEach(function (g) {
      if (g.series.length) {
        maxTrial = Math.max(maxTrial, g.series[g.series.length - 1].trial);
      }
    });

    function xForTrial(trialNum) {
      if (maxTrial <= 1) return padding.left + chartWidth;
      return padding.left + ((trialNum - 1) / (maxTrial - 1)) * chartWidth;
    }

    // X-axis trial ticks
    var xTicks = maxTrial <= 1 ? [1] : [1, Math.round(maxTrial / 2), maxTrial];
    xTicks.forEach(function (tVal, idx) {
      var tx = idx === 0 && maxTrial === 1 ? padding.left : xForTrial(tVal);
      var lbl = createSvgNode('text', {
        x: tx, y: height - 10,
        'text-anchor': idx === 0 ? 'start' : (idx === xTicks.length - 1 ? 'end' : 'middle'),
        fill: 'rgba(255,247,237,0.58)',
        'font-size': 10,
        'font-family': 'IBM Plex Mono, monospace'
      });
      lbl.textContent = 'n=' + tVal.toLocaleString();
      graphNode.appendChild(lbl);
    });

    // ±2 SE convergence funnel
    if (showSeBand && maxTrial >= 4) {
      var upperPts = [];
      var lowerPts = [];
      var steps = 60;
      for (var s = 0; s <= steps; s += 1) {
        var nVal = Math.max(1, Math.round(1 + (s / steps) * (maxTrial - 1)));
        var band = Core.errorBand(expectedProb, nVal);
        var bx = xForTrial(nVal);
        upperPts.push(bx + ',' + (padding.top + chartHeight - band.hi * chartHeight));
        lowerPts.unshift(bx + ',' + (padding.top + chartHeight - band.lo * chartHeight));
      }
      graphNode.appendChild(createSvgNode('polygon', {
        points: upperPts.concat(lowerPts).join(' '),
        fill: 'rgba(96,165,250,0.16)',
        stroke: 'rgba(96,165,250,0.32)',
        'stroke-width': 1
      }));
    }

    // Expected probability line
    if (!hideExpected) {
      var expectedY = padding.top + chartHeight - (expectedProb * chartHeight);
      graphNode.appendChild(createSvgNode('line', {
        x1: padding.left, y1: expectedY, x2: width - padding.right, y2: expectedY,
        stroke: '#60a5fa', 'stroke-width': 2, 'stroke-dasharray': '5 5'
      }));
    }

    // Ghost comparison curves
    ghostRuns.forEach(function (ghost, gIdx) {
      var sampledGhost = Core.sampleSeriesByTrial(ghost.series, 110);
      if (!sampledGhost.length) return;
      var gPts = sampledGhost.map(function (pt) {
        return xForTrial(pt.trial) + ',' + (padding.top + chartHeight - pt.observed * chartHeight);
      }).join(' ');
      graphNode.appendChild(createSvgNode('polyline', {
        points: gPts,
        fill: 'none',
        stroke: GHOST_COLORS[gIdx % GHOST_COLORS.length],
        'stroke-width': 1.8,
        'stroke-opacity': 0.72,
        'stroke-dasharray': '4 3'
      }));
    });

    // Current run curve
    var sampled = Core.sampleSeriesByTrial(state.eventSeries, 130);
    if (!sampled.length) return;
    if (sampled.length === 1) {
      var cy = padding.top + chartHeight - sampled[0].observed * chartHeight;
      graphNode.appendChild(createSvgNode('circle', {
        cx: padding.left, cy: cy, r: 5, fill: '#f59e0b'
      }));
      return;
    }

    var points = sampled.map(function (point) {
      return xForTrial(point.trial) + ',' + (padding.top + chartHeight - (point.observed * chartHeight));
    }).join(' ');

    graphNode.appendChild(createSvgNode('polyline', {
      points: points,
      fill: 'none',
      stroke: '#f59e0b',
      'stroke-width': 2.8,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }));
  }

  function renderAnimation(config, trialData, mode, state) {
    var outcome = config.outcomes[trialData.outcomeIndex];
    stageDisplayNode.innerHTML = '';

    if (config.family === 'binary') {
      if (config.id.indexOf('card') === 0) {
        var card = document.createElement('div');
        card.className = 'ps-card-reveal ps-stage-animate';
        card.style.color = outcome.color;
        card.innerHTML = '<div class="minor">Draw result</div><div class="major">' + outcome.short + '</div><div class="minor">' + outcome.label + '</div>';
        stageDisplayNode.appendChild(card);
      } else if (config.id === 'weather') {
        var weather = document.createElement('div');
        weather.className = 'ps-weather-chip ps-stage-animate';
        weather.innerHTML = '<div class="icon">' + outcome.icon + '</div><div class="label">' + outcome.label + '</div>';
        stageDisplayNode.appendChild(weather);
      } else {
        var coin = document.createElement('div');
        coin.className = 'ps-coin ps-spin-animate';
        coin.textContent = outcome.label;
        stageDisplayNode.appendChild(coin);
      }
    } else if (config.family === 'rolling') {
      var dieWrap = document.createElement('div');
      dieWrap.className = 'ps-dice-wrap';
      var die = document.createElement('div');
      die.className = 'ps-die-face ps-roll-animate';
      die.textContent = (outcome.meta && outcome.meta.face) || outcome.label;
      dieWrap.appendChild(die);
      stageDisplayNode.appendChild(dieWrap);
    } else if (config.family === 'rolling-pair') {
      var pairWrap = document.createElement('div');
      pairWrap.className = 'ps-dice-wrap';
      var first = document.createElement('div');
      first.className = 'ps-die-face ps-roll-animate';
      first.textContent = trialData.meta.dice ? trialData.meta.dice[0] : '?';
      var second = document.createElement('div');
      second.className = 'ps-die-face ps-roll-animate';
      second.textContent = trialData.meta.dice ? trialData.meta.dice[1] : '?';
      var sum = document.createElement('div');
      sum.className = 'ps-dice-sum';
      sum.textContent = 'Sum = ' + ((trialData.meta && trialData.meta.sum) || outcome.label);
      pairWrap.appendChild(first);
      pairWrap.appendChild(second);
      pairWrap.appendChild(sum);
      stageDisplayNode.appendChild(pairWrap);
    } else if (config.family === 'rotational') {
      var spinnerWrap = document.createElement('div');
      spinnerWrap.className = 'ps-spinner-wrap';
      var svg = createSvgNode('svg', { viewBox: '0 0 220 220', class: 'ps-spinner-svg ps-spin-animate' });
      var start = -Math.PI / 2;
      config.outcomes.forEach(function (slice) {
        var end = start + (Math.PI * 2 * slice.weight);
        var x1 = 110 + 86 * Math.cos(start);
        var y1 = 110 + 86 * Math.sin(start);
        var x2 = 110 + 86 * Math.cos(end);
        var y2 = 110 + 86 * Math.sin(end);
        var largeArc = (end - start) > Math.PI ? 1 : 0;
        svg.appendChild(createSvgNode('path', {
          d: 'M110,110 L' + x1 + ',' + y1 + ' A86,86 0 ' + largeArc + ' 1 ' + x2 + ',' + y2 + ' Z',
          fill: slice.color,
          stroke: 'rgba(255,255,255,0.3)',
          'stroke-width': 1.5
        }));
        start = end;
      });
      svg.appendChild(createSvgNode('circle', { cx: 110, cy: 110, r: 18, fill: '#fff7ed', stroke: 'rgba(0,0,0,0.18)' }));
      svg.appendChild(createSvgNode('polygon', { points: '110,8 101,28 119,28', fill: '#fff7ed' }));
      spinnerWrap.appendChild(svg);
      var label = document.createElement('div');
      label.className = 'ps-stage-status';
      label.textContent = 'Pointer landed on ' + outcome.label;
      spinnerWrap.appendChild(label);
      stageDisplayNode.appendChild(spinnerWrap);
    } else if (config.family === 'draw-set') {
      var scene = document.createElement('div');
      scene.className = 'ps-marble-scene';
      var bag = document.createElement('div');
      bag.className = 'ps-bag';
      config.outcomes.forEach(function (item, idx) {
        var count = state.withoutReplacement && state.pool
          ? state.pool[idx]
          : Math.max(1, Math.round(item.weight * 6));
        for (var i = 0; i < count; i += 1) {
          var marble = document.createElement('div');
          marble.className = 'ps-marble' + (item.key === outcome.key && i === 0 ? ' selected ps-stage-animate' : '');
          marble.style.background = item.color;
          bag.appendChild(marble);
        }
      });
      scene.appendChild(bag);
      var marbleLabel = document.createElement('div');
      marbleLabel.className = 'ps-stage-status';
      marbleLabel.textContent = 'Selected marble: ' + outcome.label +
        (state.withoutReplacement ? ' (' + state.totalRemaining + ' left in bag)' : '');
      scene.appendChild(marbleLabel);
      stageDisplayNode.appendChild(scene);
    }

    var poolInfo = state.withoutReplacement
      ? ' · Pool left: ' + state.totalRemaining + (state.reshuffles ? ' (reshuffled ' + state.reshuffles + '×)' : '')
      : '';
    stageStatusNode.textContent = (mode === 'watch' ? 'Single trial revealed' : 'Trial #' + state.trials.toLocaleString() + ' revealed') + poolInfo;
    stageNoteNode.textContent = mode === 'watch'
      ? 'This single reveal shows one random draw. Use +1 / +10 / +100 to watch the running average stabilize.'
      : 'Cumulative trials update the distribution, ±2 SE funnel, and streak telemetry in real time.';
  }

  function renderResults(mode) {
    var state = runState;
    var config = state.config;
    var trackedOutcome = config.outcomes[state.trackedIndex];
    var expectedProb = trackedOutcome.weight;
    var hideExpected = Boolean(mysteryState && !mysteryState.revealed);
    var observed = state.trials ? state.eventHits / state.trials : 0;

    eventName.textContent = trackedOutcome.label;
    expectedNode.textContent = hideExpected ? 'Hidden (?)' : formatPercent(expectedProb);
    observedNode.textContent = state.trials ? formatPercent(observed) : '--';
    differenceNode.textContent = !state.trials || hideExpected ? '--' : formatGap(observed - expectedProb);
    if (streakNode) {
      streakNode.textContent = state.trials ? state.longestHitStreak + ' in a row' : '--';
    }
    if (fallacyNode) {
      if (!state.trials) {
        fallacyNode.textContent = '--';
      } else if (state.afterMissStreakTrials === 0) {
        fallacyNode.textContent = 'No 3+ miss streak yet';
      } else {
        fallacyNode.textContent = formatPercent(state.afterMissStreakHits / state.afterMissStreakTrials) +
          ' (' + state.afterMissStreakHits + '/' + state.afterMissStreakTrials + ')';
      }
    }

    modelNoteNode.innerHTML = '<strong>Current model</strong>' + config.modelNote;

    if (state.lastTrial) {
      renderAnimation(config, state.lastTrial, mode, state);
    }

    barsNode.innerHTML = '';
    state.counts.forEach(function (count, index) {
      var outcome = config.outcomes[index];
      var row = document.createElement('div');
      row.className = 'ps-bar-row';

      var labelBtn = document.createElement('button');
      labelBtn.type = 'button';
      labelBtn.className = 'ps-bar-label-btn' + (index === state.trackedIndex ? ' is-tracked' : '');
      labelBtn.textContent = outcome.label;
      labelBtn.title = 'Track ' + outcome.label + ' on the convergence graph';
      labelBtn.addEventListener('click', function () {
        Core.setTrackedIndex(runState, index);
        if (trackedSelect) trackedSelect.value = String(index);
        ghostRuns = [];
        renderResults(mode);
      });

      var track = document.createElement('div');
      track.className = 'ps-bar-track';
      var stack = document.createElement('div');
      stack.className = 'ps-bar-stack';

      if (!hideExpected) {
        var expected = document.createElement('div');
        expected.className = 'ps-bar-fill-expected';
        expected.style.setProperty('--expected-left', (outcome.weight * 100).toFixed(1) + '%');
        stack.appendChild(expected);
      }

      var fill = document.createElement('div');
      fill.className = 'ps-bar-fill';
      fill.style.width = state.trials ? ((count / state.trials) * 100).toFixed(1) + '%' : '0%';
      fill.style.background = 'linear-gradient(90deg, ' + outcome.color + ', #fde68a)';
      stack.appendChild(fill);
      track.appendChild(stack);

      var value = document.createElement('div');
      value.className = 'ps-bar-value';
      value.textContent = state.trials ? count + ' (' + formatPercent(count / state.trials) + ')' : '0 (0.0%)';

      row.appendChild(labelBtn);
      row.appendChild(track);
      row.appendChild(value);
      barsNode.appendChild(row);
    });

    renderGraph(state);
    graphCaptionNode.textContent = ghostRuns.length
      ? 'Comparing live run against ' + ghostRuns.length + ' pinned ghost run' + (ghostRuns.length > 1 ? 's' : '') + '.'
      : 'Short runs wobble inside the ±2 SE funnel. Larger samples settle toward the expected line.';

    checkpointsNode.innerHTML = '';
    if (!state.checkpoints.length) {
      checkpointsNode.innerHTML = '<tr><td colspan="3">Run a simulation to fill in the table.</td></tr>';
    } else {
      state.checkpoints.forEach(function (point) {
        var row = document.createElement('tr');
        var trialCell = document.createElement('td');
        var observedCell = document.createElement('td');
        var gapCell = document.createElement('td');
        trialCell.textContent = point.trial.toLocaleString();
        observedCell.textContent = formatPercent(point.observed);
        gapCell.textContent = hideExpected ? 'Hidden' : formatGap(point.observed - expectedProb);
        row.appendChild(trialCell);
        row.appendChild(observedCell);
        row.appendChild(gapCell);
        checkpointsNode.appendChild(row);
      });
    }

    if (hideExpected) {
      trendNode.textContent = 'Mystery Coin mode: ' + state.trials.toLocaleString() +
        ' flips recorded (' + formatPercent(observed) + ' Heads). Gather enough trials, then submit your verdict!';
    } else if (state.trials <= 1) {
      trendNode.textContent = 'A single trial jumps to 0% or 100%. Use +10, +100, or Run many trials to watch the law of large numbers take shape.';
    } else {
      var firstObs = state.checkpoints.length ? state.checkpoints[0].observed : observed;
      var finalGap = Math.abs(observed - expectedProb);
      var firstGap = Math.abs(firstObs - expectedProb);
      var lead = finalGap <= firstGap
        ? 'This run supports the law of large numbers: the gap from expected probability narrowed as the sample grew.'
        : 'Small-sample scatter is still visible — compare early checkpoints with the final line.';
      trendNode.textContent = lead + ' Final observed rate for ' + trackedOutcome.label.toLowerCase() + ' was ' +
        formatPercent(observed) + ' vs expected ' + formatPercent(expectedProb) + '.';
    }

    // Sync sidebar telemetry
    var pTrials = document.getElementById('ps-p-trials');
    var pEvent = document.getElementById('ps-p-event');
    var pExpected = document.getElementById('ps-p-expected');
    var pObserved = document.getElementById('ps-p-observed');
    var pDiff = document.getElementById('ps-p-diff');
    var pStreak = document.getElementById('ps-p-streak');
    if (pTrials) pTrials.textContent = state.trials.toLocaleString();
    if (pEvent) pEvent.textContent = trackedOutcome.label;
    if (pExpected) pExpected.textContent = hideExpected ? 'Hidden' : formatPercent(expectedProb);
    if (pObserved) pObserved.textContent = state.trials ? formatPercent(observed) : '--';
    if (pDiff) pDiff.textContent = !state.trials || hideExpected ? '--' : formatGap(observed - expectedProb);
    if (pStreak) pStreak.textContent = state.trials ? String(state.longestHitStreak) : '--';

    if (clearPinsBtn) clearPinsBtn.hidden = ghostRuns.length === 0;
  }

  function renderEmptyState() {
    stageDisplayNode.innerHTML = '';
    stageStatusNode.textContent = 'Ready';
    stageNoteNode.textContent = 'The engine decides the result first. The animation reveals that outcome.';
    renderResults('many');
  }

  function runFresh(count) {
    resetRunState(false);
    Core.stepTrials(runState, count);
    renderResults(count === 1 ? 'watch' : 'many');
  }

  function stepMore(count) {
    if (!runState) resetRunState(false);
    Core.stepTrials(runState, count);
    renderResults(count === 1 ? 'watch' : 'many');
  }

  function exitMysteryMode() {
    mysteryState = null;
    if (mysteryBox) mysteryBox.hidden = true;
    if (mysteryBtn) mysteryBtn.setAttribute('aria-pressed', 'false');
    if (experimentSelect) experimentSelect.disabled = currentSource === 'custom';
  }

  // Wire controls
  document.querySelectorAll('.ps-btn-chip').forEach(function (button) {
    button.addEventListener('click', function () {
      exitMysteryMode();
      setSource('preset');
      experimentSelect.value = button.getAttribute('data-exp');
      trialsInput.value = button.getAttribute('data-trials');
      updateReadout();
      runFresh(Number(trialsInput.value));
    });
  });

  experimentSelect.addEventListener('change', function () {
    exitMysteryMode();
    setSource('preset');
    resetRunState(true);
  });

  if (trackedSelect) {
    trackedSelect.addEventListener('change', function () {
      Core.setTrackedIndex(runState, Number(trackedSelect.value));
      ghostRuns = [];
      renderResults('many');
    });
  }

  trialsInput.addEventListener('input', updateReadout);

  if (replaceToggle) {
    replaceToggle.addEventListener('change', function () {
      resetRunState(true);
    });
  }
  if (seToggle) {
    seToggle.addEventListener('change', function () {
      if (runState) renderGraph(runState);
    });
  }

  sourcePresetBtn.addEventListener('click', function () {
    exitMysteryMode();
    setSource('preset');
    resetRunState(true);
  });
  sourceCustomBtn.addEventListener('click', function () {
    exitMysteryMode();
    setSource('custom');
    if (!currentCustomExperiment) currentCustomExperiment = buildCustomFromDOM();
    resetRunState(true);
  });
  addOutcomeBtn.addEventListener('click', function () {
    if (getCustomRows().length >= 8) {
      setCustomFeedback('Keep the custom model to eight outcomes or fewer so the visualization stays readable.', 'error');
      return;
    }
    createCustomRow('', 1);
    syncCustomTrackedOptions();
    setCustomFeedback('Added a new outcome row. Integer weights make the long-run ratios easier to interpret.', 'info');
  });
  customGrid.addEventListener('input', function (event) {
    if (event.target.classList.contains('ps-custom-label')) syncCustomTrackedOptions();
  });
  customGrid.addEventListener('click', function (event) {
    if (!event.target.classList.contains('ps-remove-row')) return;
    var row = event.target.closest('.ps-custom-row');
    if (row && getCustomRows().length > 2) {
      row.remove();
      syncCustomTrackedOptions();
      setCustomFeedback('Outcome removed. Recheck the tracked event before applying the model.', 'info');
    }
  });
  applyCustomBtn.addEventListener('click', function () {
    exitMysteryMode();
    var model = buildCustomFromDOM();
    if (!model) return;
    currentCustomExperiment = model;
    setSource('custom');
    setCustomFeedback('Custom model applied. Running your probability space!', 'info');
    runFresh(Number(trialsInput.value));
  });

  runBtn.addEventListener('click', function () { runFresh(Number(trialsInput.value)); });
  if (step1Btn) step1Btn.addEventListener('click', function () { stepMore(1); });
  if (step10Btn) step10Btn.addEventListener('click', function () { stepMore(10); });
  if (step100Btn) step100Btn.addEventListener('click', function () { stepMore(100); });
  watchBtn.addEventListener('click', function () { runFresh(1); });
  resetBtn.addEventListener('click', function () {
    exitMysteryMode();
    trialsInput.value = 1000;
    experimentSelect.value = 'coin';
    setSource('preset');
    updateReadout();
    resetRunState(true);
  });

  if (pinRunBtn) {
    pinRunBtn.addEventListener('click', function () {
      if (!runState || !runState.trials) return;
      if (ghostRuns.length >= 4) ghostRuns.shift();
      ghostRuns.push({
        series: runState.eventSeries.slice()
      });
      runFresh(Number(trialsInput.value));
    });
  }
  if (clearPinsBtn) {
    clearPinsBtn.addEventListener('click', function () {
      ghostRuns = [];
      renderResults('many');
    });
  }

  // Mystery Coin Detective Challenge
  if (mysteryBtn) {
    mysteryBtn.addEventListener('click', function () {
      mysteryState = Core.createMysteryCoin();
      mysteryState.revealed = false;
      mysteryBtn.setAttribute('aria-pressed', 'true');
      if (experimentSelect) experimentSelect.disabled = true;
      if (mysteryBox) mysteryBox.hidden = false;
      if (mysteryStatus) {
        mysteryStatus.textContent = 'Flip the Mystery Coin (try 10, then 100, then 1,000) before making your verdict.';
      }
      resetRunState(true);
    });
  }
  function handleMysteryGuess(guessFair) {
    if (!mysteryState) return;
    mysteryState.revealed = true;
    var correct = guessFair === mysteryState.isFair;
    var obs = runState && runState.trials ? formatPercent(runState.eventHits / runState.trials) : '0%';
    if (mysteryStatus) {
      mysteryStatus.textContent = (correct ? '✔ Nice detective work! ' : 'Not quite! ') +
        'True coin: ' + mysteryState.revealLabel + '. Your ' + (runState ? runState.trials : 0) +
        ' flips gave ' + obs + ' Heads.';
    }
    renderResults('many');
  }
  if (mysteryFairBtn) mysteryFairBtn.addEventListener('click', function () { handleMysteryGuess(true); });
  if (mysteryLoadedBtn) mysteryLoadedBtn.addEventListener('click', function () { handleMysteryGuess(false); });
  if (mysteryExitBtn) {
    mysteryExitBtn.addEventListener('click', function () {
      exitMysteryMode();
      resetRunState(true);
      runFresh(Number(trialsInput.value));
    });
  }

  // Sidebar controls
  var pRun = document.getElementById('ps-p-run');
  var pWatch = document.getElementById('ps-p-watch');
  var pReset = document.getElementById('ps-p-reset');
  if (pRun) pRun.addEventListener('click', function () { runBtn.click(); });
  if (pWatch) pWatch.addEventListener('click', function () { stepMore(1); });
  if (pReset) pReset.addEventListener('click', function () { resetBtn.click(); });

  document.querySelectorAll('.ps-panel-preset').forEach(function (button) {
    button.addEventListener('click', function () {
      exitMysteryMode();
      setSource('preset');
      experimentSelect.value = button.getAttribute('data-exp');
      trialsInput.value = button.getAttribute('data-trials');
      updateReadout();
      runFresh(Number(trialsInput.value));
    });
  });

  // Check Your Understanding auto-checker
  document.querySelectorAll('.ps-practice-item').forEach(function (item) {
    var input = item.querySelector('input');
    var btn = item.querySelector('button');
    var fb = item.querySelector('.fb');
    if (!input || !btn || !fb) return;
    function check() {
      var val = parseFloat(input.value);
      if (isNaN(val)) {
        fb.textContent = 'Enter a number first.';
        fb.className = 'fb no';
        return;
      }
      var target = parseFloat(item.dataset.answer);
      var tol = parseFloat(item.dataset.tolerance || '0.1');
      if (Math.abs(val - target) <= tol) {
        fb.textContent = '✔ Correct! ' + (item.dataset.explain || '');
        fb.className = 'fb ok';
      } else {
        fb.textContent = 'Not yet — Hint: ' + (item.dataset.hint || 'test it in the simulator above.');
        fb.className = 'fb no';
      }
    }
    btn.addEventListener('click', check);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
  });

  // Initialize
  createCustomRow('Heads', 1);
  createCustomRow('Tails', 1);
  syncCustomTrackedOptions();
  currentCustomExperiment = buildCustomFromDOM();
  updateReadout();
  setSource('preset');
  runFresh(Number(trialsInput.value));
})();
