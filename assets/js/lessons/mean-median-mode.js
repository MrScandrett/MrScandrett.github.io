(function () {
  'use strict';

  var Core = window.MeanMedianModeCore;
  if (!Core) return;

  var svgns = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, text) {
    var node = document.createElementNS(svgns, tag);
    for (var key in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) {
        node.setAttribute(key, attrs[key]);
      }
    }
    if (text !== undefined) node.textContent = text;
    return node;
  }

  var fmt = Core.fmt;

  var svg = document.getElementById('mmm-plot');
  var W = 600;
  var H = 245;
  var MIN = Core.MIN_VALUE;
  var MAX = Core.MAX_VALUE;
  var padX = 36;
  var axisY = 152;

  function toScreenX(v) {
    return padX + ((v - MIN) / (MAX - MIN)) * (W - padX * 2);
  }
  function toValue(sx) {
    return MIN + ((sx - padX) / (W - padX * 2)) * (MAX - MIN);
  }

  var values = Core.PRESETS.balanced.slice();
  var draggingIdx = -1;
  var activeIdx = -1;
  var activePointerId = null;

  var meanEl = document.getElementById('mmm-mean');
  var meanWorkEl = document.getElementById('mmm-mean-work');
  var medianEl = document.getElementById('mmm-median');
  var medianWorkEl = document.getElementById('mmm-median-work');
  var modeEl = document.getElementById('mmm-mode');
  var modeWorkEl = document.getElementById('mmm-mode-work');
  var balanceEl = document.getElementById('mmm-balance');
  var balanceWorkEl = document.getElementById('mmm-balance-work');
  var skewEl = document.getElementById('mmm-skew');
  var skewWorkEl = document.getElementById('mmm-skew-work');
  var countBadgeEl = document.getElementById('mmm-count-badge');
  var sortedStripEl = document.getElementById('mmm-sorted-strip');
  var inspectEl = document.getElementById('mmm-dot-inspect');
  var missionsEl = document.getElementById('mmm-missions');
  var missionPillEl = document.getElementById('mmm-mission-pill');
  var addBtn = document.getElementById('mmm-add-pt');
  var remBtn = document.getElementById('mmm-rem-pt');

  var pCountEl = document.getElementById('mmm-p-count');
  var pMeanEl = document.getElementById('mmm-p-mean');
  var pMedianEl = document.getElementById('mmm-p-median');
  var pModeEl = document.getElementById('mmm-p-mode');
  var pSkewEl = document.getElementById('mmm-p-skew');

  function drawFlag(group, x, y, text, color, svgWidth) {
    var w = Math.max(66, text.length * 6.5 + 14);
    var rx = Math.max(8, Math.min(svgWidth - w - 8, x - w / 2));
    group.appendChild(el('rect', {
      x: rx, y: y, width: w, height: 18, rx: 5, fill: color
    }));
    group.appendChild(el('text', {
      class: 'mmm-flag-text',
      x: rx + w / 2, y: y + 12.5,
      'text-anchor': 'middle'
    }, text));
  }

  function updateInspect(st) {
    if (!inspectEl) return;
    if (activeIdx >= 0 && activeIdx < values.length) {
      var val = values[activeIdx];
      var dev = val - st.mean;
      var sign = dev >= 0 ? '+' : '';
      inspectEl.textContent = 'Dot #' + (activeIdx + 1) + ' = ' + fmt(val) +
        ' · deviation (x − x̄) = ' + sign + fmt(dev) +
        ' (Use ←/→ keys to nudge, Shift for 0.5, Delete to remove)';
    } else {
      inspectEl.textContent = 'Drag any dot, tab + ←/→ to nudge a dot, or click on the number line to add a dot (up to 12).';
    }
  }

  function updateMissions(st) {
    var res = Core.evaluateMissions(values, st);
    if (missionPillEl) {
      missionPillEl.textContent = 'Missions: ' + res.doneCount + '/' + res.total;
    }
    if (missionsEl) {
      missionsEl.innerHTML = '';
      res.items.forEach(function (m) {
        var chip = document.createElement('div');
        chip.className = 'mmm-mission-chip' + (m.done ? ' is-done' : '');
        chip.innerHTML = '<span class="mmm-mission-mark">' + (m.done ? '✓' : '') + '</span><span>' + m.label + '</span>';
        missionsEl.appendChild(chip);
      });
    }
  }

  function render() {
    var st = Core.computeStats(values);
    svg.innerHTML = '';

    // 1. Clickable number line zone & ticks
    var axisHit = el('rect', {
      class: 'axis-hit',
      x: padX - 8, y: axisY - 12,
      width: W - padX * 2 + 16, height: 32
    });
    axisHit.addEventListener('pointerdown', function (evt) {
      if (values.length >= 12) return;
      var v = Core.clampValue(toValue(screenXFromEvent(evt)));
      values.push(v);
      activeIdx = values.length - 1;
      render();
    });
    svg.appendChild(axisHit);

    svg.appendChild(el('line', { class: 'axis-line', x1: padX, y1: axisY, x2: W - padX, y2: axisY }));
    for (var t = MIN; t <= MAX; t += 1) {
      var sx = toScreenX(t);
      var isMajor = (t % 2 === 0);
      svg.appendChild(el('line', {
        class: 'tick-line',
        x1: sx, y1: axisY - (isMajor ? 6 : 3.5),
        x2: sx, y2: axisY + (isMajor ? 6 : 3.5)
      }));
      if (isMajor) {
        svg.appendChild(el('text', {
          class: 'tick-label',
          x: sx, y: axisY + 19,
          'text-anchor': 'middle'
        }, String(t)));
      }
    }

    // 2. Vertical indicator lines & staggered top flags for Mode, Median, Mean
    var markers = [];
    if (st.modeKeys.length > 0) {
      st.modeKeys.forEach(function (mk, mIdx) {
        var mx = toScreenX(Number(mk));
        svg.appendChild(el('line', { class: 'mmm-mode-line', x1: mx, y1: 44, x2: mx, y2: axisY - 6 }));
        if (mIdx === 0) {
          markers.push({ x: mx, label: 'Mode ' + st.modeKeys.join(','), color: '#d97706', row: 2 });
        }
      });
    }

    var medianX = toScreenX(st.median);
    svg.appendChild(el('line', { class: 'mmm-median-line', x1: medianX, y1: 24, x2: medianX, y2: axisY - 6 }));
    markers.push({ x: medianX, label: 'Med ' + fmt(st.median), color: '#0284c7', row: 1 });

    var meanX = toScreenX(st.mean);
    svg.appendChild(el('line', { class: 'mmm-mean-line', x1: meanX, y1: 12, x2: meanX, y2: axisY - 6 }));
    markers.push({ x: meanX, label: 'Mean ' + fmt(st.mean), color: '#16a34a', row: 0 });

    var flagGroup = el('g', {});
    markers.forEach(function (m) {
      drawFlag(flagGroup, m.x, 4 + m.row * 19, m.label, m.color, W);
    });
    svg.appendChild(flagGroup);

    // 3. Deviation balance zone below tick labels
    var beamY = 200;
    svg.appendChild(el('line', { class: 'mmm-beam-line', x1: padX, y1: beamY, x2: W - padX, y2: beamY }));

    values.forEach(function (v, idx) {
      var dev = v - st.mean;
      if (Math.abs(dev) > 0.05) {
        var x1 = Math.min(meanX, toScreenX(v));
        var x2 = Math.max(meanX, toScreenX(v));
        var isHi = idx === activeIdx;
        svg.appendChild(el('rect', {
          class: 'mmm-dev-bar' + (isHi ? ' is-highlighted' : ''),
          x: x1, y: beamY - (isHi ? 12 : 9),
          width: Math.max(2, x2 - x1), height: isHi ? 8 : 5,
          rx: 2.5,
          fill: dev < 0
            ? (isHi ? 'rgba(244,63,94,0.82)' : 'rgba(244,63,94,0.42)')
            : (isHi ? 'rgba(16,185,129,0.82)' : 'rgba(16,185,129,0.42)')
        }));
      }
    });

    var triPoints = meanX + ',' + beamY + ' ' + (meanX - 11) + ',' + (beamY + 18) + ' ' + (meanX + 11) + ',' + (beamY + 18);
    svg.appendChild(el('polygon', { points: triPoints, fill: '#16a34a' }));
    svg.appendChild(el('text', {
      class: 'mmm-torque-label',
      x: meanX, y: beamY + 32,
      'text-anchor': 'middle'
    }, 'x̄ fulcrum = ' + fmt(st.mean)));

    svg.appendChild(el('text', {
      class: 'mmm-torque-label',
      x: padX + 4, y: beamY + 16,
      'text-anchor': 'start'
    }, 'Left Σ(x−x̄): ' + (st.negSum < -1e-9 ? fmt(st.negSum) : '0')));

    svg.appendChild(el('text', {
      class: 'mmm-torque-label',
      x: W - padX - 4, y: beamY + 16,
      'text-anchor': 'end'
    }, 'Right Σ(x−x̄): +' + fmt(st.posSum)));

    // 4. Draggable + keyboard-accessible dots stacked cleanly above axis
    var colCounts = {};
    values.forEach(function (v) {
      var key = fmt(v);
      colCounts[key] = (colCounts[key] || 0) + 1;
    });

    var seen = {};
    values.forEach(function (v, idx) {
      var key = fmt(v);
      var row = seen[key] || 0;
      seen[key] = row + 1;
      var totalInCol = colCounts[key];
      var spacing = totalInCol > 3 ? Math.max(12, Math.floor(68 / (totalInCol - 1))) : 21;
      var cx = toScreenX(v);
      var cy = axisY - 18 - row * spacing;
      var isMed = st.medianOrigIndices.indexOf(idx) !== -1;
      var isAct = idx === activeIdx;

      var circle = el('circle', {
        class: 'mmm-dot' + (isMed ? ' is-median' : '') + (isAct ? ' is-active' : ''),
        r: 9.5,
        cx: cx,
        cy: cy,
        tabindex: '0',
        role: 'slider',
        'aria-label': 'Data point ' + (idx + 1),
        'aria-valuemin': String(MIN),
        'aria-valuemax': String(MAX),
        'aria-valuenow': key,
        'data-index': String(idx)
      });

      circle.addEventListener('pointerdown', function (evt) {
        draggingIdx = idx;
        activeIdx = idx;
        activePointerId = evt.pointerId;
        if (circle.setPointerCapture) {
          try { circle.setPointerCapture(evt.pointerId); } catch (_) {}
        }
        updateInspect(st);
        evt.preventDefault();
        evt.stopPropagation();
      });

      circle.addEventListener('focus', function () {
        activeIdx = idx;
        updateInspect(st);
      });

      circle.addEventListener('mouseenter', function () {
        if (draggingIdx < 0) {
          activeIdx = idx;
          updateInspect(st);
        }
      });

      circle.addEventListener('keydown', function (evt) {
        var step = evt.shiftKey ? 0.5 : 1;
        if (evt.key === 'ArrowRight' || evt.key === 'ArrowUp') {
          evt.preventDefault();
          values[idx] = Core.clampValue(values[idx] + step);
          activeIdx = idx;
          render();
          refocusDot(idx);
        } else if (evt.key === 'ArrowLeft' || evt.key === 'ArrowDown') {
          evt.preventDefault();
          values[idx] = Core.clampValue(values[idx] - step);
          activeIdx = idx;
          render();
          refocusDot(idx);
        } else if ((evt.key === 'Backspace' || evt.key === 'Delete') && values.length > 3) {
          evt.preventDefault();
          values.splice(idx, 1);
          activeIdx = Math.min(idx, values.length - 1);
          render();
          refocusDot(activeIdx);
        }
      });

      svg.appendChild(circle);
      svg.appendChild(el('text', {
        class: 'mmm-dot-label',
        x: cx,
        y: cy + 3.5,
        'text-anchor': 'middle'
      }, key));
    });

    // 5. Update readout cards, sidebar, missions, & sorted strip
    meanEl.textContent = fmt(st.mean);
    meanWorkEl.textContent = 'Sum ' + fmt(st.sum) + ' ÷ ' + st.n;
    medianEl.textContent = fmt(st.median);
    medianWorkEl.textContent = st.n % 2 === 0
      ? 'Avg of #' + (st.n / 2) + ' & #' + (st.n / 2 + 1)
      : '#' + ((st.n + 1) / 2) + ' of ' + st.n + ' sorted';
    modeEl.textContent = st.modeKeys.length ? st.modeKeys.join(', ') : '—';
    modeWorkEl.textContent = st.modeKeys.length
      ? 'Appears ' + st.maxFreq + '× each'
      : 'All unique (freq 1)';
    balanceEl.textContent = '0';
    balanceWorkEl.textContent = fmt(st.negSum) + ' + ' + fmt(st.posSum) + ' = 0';
    if (skewEl) {
      skewEl.textContent = (st.skewGap > 0 ? '+' : '') + fmt(st.skewGap);
    }
    if (skewWorkEl) {
      skewWorkEl.textContent = st.skewLabel;
    }
    countBadgeEl.textContent = 'n = ' + st.n + ' points (' + (st.n % 2 === 0 ? 'even' : 'odd') + ')';

    if (pCountEl) pCountEl.textContent = st.n + ' (' + (st.n % 2 === 0 ? 'even' : 'odd') + ')';
    if (pMeanEl) pMeanEl.textContent = fmt(st.mean);
    if (pMedianEl) pMedianEl.textContent = fmt(st.median);
    if (pModeEl) pModeEl.textContent = st.modeKeys.length ? st.modeKeys.join(', ') : 'None';
    if (pSkewEl) pSkewEl.textContent = (st.skewGap > 0 ? '+' : '') + fmt(st.skewGap);

    sortedStripEl.innerHTML = '<span class="mmm-sorted-label">Sorted order:</span>';
    st.sorted.forEach(function (v, sIdx) {
      var key = fmt(v);
      var classes = ['mmm-chip'];
      if (st.medianSortedPositions.indexOf(sIdx) !== -1) classes.push('is-median');
      if (st.modeKeys.indexOf(key) !== -1) classes.push('is-mode');
      var chip = document.createElement('span');
      chip.className = classes.join(' ');
      chip.textContent = key;
      sortedStripEl.appendChild(chip);
    });

    addBtn.disabled = values.length >= 12;
    remBtn.disabled = values.length <= 3;

    updateInspect(st);
    updateMissions(st);
  }

  function refocusDot(idx) {
    var nextDot = svg.querySelector('.mmm-dot[data-index="' + idx + '"]');
    if (nextDot && nextDot.focus) nextDot.focus();
  }

  function screenXFromEvent(evt) {
    var rect = svg.getBoundingClientRect();
    var clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    return ((clientX - rect.left) / Math.max(1, rect.width)) * W;
  }

  function handlePointerMove(evt) {
    if (draggingIdx < 0) return;
    if (activePointerId !== null && evt.pointerId !== undefined && evt.pointerId !== activePointerId) return;
    var sx = screenXFromEvent(evt);
    var v = Core.clampValue(toValue(sx));
    if (values[draggingIdx] !== v) {
      values[draggingIdx] = v;
      render();
    }
  }

  function handlePointerUp(evt) {
    if (draggingIdx < 0) return;
    if (activePointerId !== null && evt.pointerId !== undefined && evt.pointerId !== activePointerId) return;
    draggingIdx = -1;
    activePointerId = null;
  }

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerUp);

  render();

  document.getElementById('mmm-reset').addEventListener('click', function () {
    values = Core.PRESETS.balanced.slice();
    activeIdx = -1;
    render();
  });
  document.getElementById('mmm-outlier').addEventListener('click', function () {
    values = Core.PRESETS.outlier.slice();
    activeIdx = 4;
    render();
  });
  document.getElementById('mmm-even').addEventListener('click', function () {
    values = Core.PRESETS.even.slice();
    activeIdx = -1;
    render();
  });
  document.getElementById('mmm-bimodal').addEventListener('click', function () {
    values = Core.PRESETS.bimodal.slice();
    activeIdx = -1;
    render();
  });
  addBtn.addEventListener('click', function () {
    if (values.length < 12) {
      var nextVal = [10, 6, 12, 8, 15][values.length % 5];
      values.push(nextVal);
      activeIdx = values.length - 1;
      render();
    }
  });
  remBtn.addEventListener('click', function () {
    if (values.length > 3) {
      values.pop();
      if (activeIdx >= values.length) activeIdx = values.length - 1;
      render();
    }
  });

  // ---- Lab 2: Real-World Scenario Explorer ----
  var scTabsEl = document.getElementById('mmm-scenario-tabs');
  var scTitleEl = document.getElementById('mmm-sc-title');
  var scDescEl = document.getElementById('mmm-sc-desc');
  var scPlotEl = document.getElementById('mmm-sc-plot');
  var scMeanEl = document.getElementById('mmm-sc-mean');
  var scMedianEl = document.getElementById('mmm-sc-median');
  var scModeEl = document.getElementById('mmm-sc-mode');
  var scQuestionEl = document.getElementById('mmm-sc-question');
  var scChoicesEl = document.getElementById('mmm-sc-choices');
  var scFeedbackEl = document.getElementById('mmm-sc-feedback');
  var scWhatIfBtn = document.getElementById('mmm-sc-whatif');
  var scWhatIfNote = document.getElementById('mmm-sc-whatif-note');
  var activeScenarioIdx = 0;
  var whatIfActive = false;

  function renderScenario(idx, keepWhatIf) {
    activeScenarioIdx = idx;
    if (!keepWhatIf) whatIfActive = false;
    var sc = Core.SCENARIOS[idx];
    var activeData = whatIfActive ? sc.whatIfData : sc.data;
    var st = Core.computeStats(activeData);

    Array.prototype.forEach.call(scTabsEl.children, function (btn, bIdx) {
      var isSel = bIdx === idx;
      btn.classList.toggle('active', isSel);
      btn.setAttribute('aria-selected', isSel ? 'true' : 'false');
    });

    scTitleEl.textContent = sc.title;
    scDescEl.textContent = sc.desc;
    scMeanEl.textContent = fmt(st.mean) + ' ' + sc.unit;
    scMedianEl.textContent = fmt(st.median) + ' ' + sc.unit;
    scModeEl.textContent = st.modeKeys.length ? st.modeKeys.join(', ') + ' ' + sc.unit : 'None';
    scQuestionEl.textContent = sc.question;

    if (scWhatIfBtn) {
      scWhatIfBtn.textContent = whatIfActive ? 'Reset to original scenario' : sc.whatIfLabel;
      scWhatIfBtn.setAttribute('aria-pressed', whatIfActive ? 'true' : 'false');
    }
    if (scWhatIfNote) {
      scWhatIfNote.textContent = whatIfActive ? sc.whatIfNote : '';
    }

    if (!keepWhatIf) {
      scFeedbackEl.textContent = 'Select Mean, Median, or Mode above to test your choice.';
    }

    // Draw mini SVG dot plot for scenario (using 520 width for flag clamping!)
    scPlotEl.innerHTML = '';
    var sW = 520;
    var sPad = 36;
    var sAxisY = 104;
    var minV = Math.min.apply(null, activeData);
    var maxV = Math.max.apply(null, activeData);
    var span = Math.max(1, maxV - minV);
    function sxOf(v) { return sPad + ((v - minV) / span) * (sW - sPad * 2); }

    scPlotEl.appendChild(el('line', { class: 'axis-line', x1: sPad, y1: sAxisY, x2: sW - sPad, y2: sAxisY }));
    scPlotEl.appendChild(el('text', { class: 'tick-label', x: sPad, y: sAxisY + 20, 'text-anchor': 'middle' }, fmt(minV)));
    scPlotEl.appendChild(el('text', { class: 'tick-label', x: sW - sPad, y: sAxisY + 20, 'text-anchor': 'middle' }, fmt(maxV)));

    var mX = sxOf(st.mean);
    var medX = sxOf(st.median);
    scPlotEl.appendChild(el('line', { class: 'mmm-mean-line', x1: mX, y1: 16, x2: mX, y2: sAxisY + 4 }));
    scPlotEl.appendChild(el('line', { class: 'mmm-median-line', x1: medX, y1: 30, x2: medX, y2: sAxisY + 4 }));
    drawFlag(scPlotEl, mX, 4, 'Mean ' + fmt(st.mean), '#16a34a', sW);
    drawFlag(scPlotEl, medX, 24, 'Med ' + fmt(st.median), '#0284c7', sW);

    var seen = {};
    activeData.forEach(function (v) {
      var key = fmt(v);
      var row = seen[key] || 0;
      seen[key] = row + 1;
      scPlotEl.appendChild(el('circle', {
        cx: sxOf(v),
        cy: sAxisY - 14 - row * 16,
        r: 7,
        fill: '#db2777',
        stroke: '#fff',
        'stroke-width': 1.5
      }));
    });

    if (!keepWhatIf) {
      scChoicesEl.innerHTML = '';
      ['Mean', 'Median', 'Mode'].forEach(function (choice) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mmm-choice';
        btn.style.textAlign = 'center';
        btn.textContent = choice;
        btn.addEventListener('click', function () {
          Array.prototype.forEach.call(scChoicesEl.children, function (c) {
            c.classList.remove('correct', 'wrong');
          });
          btn.classList.add(choice === sc.best ? 'correct' : 'wrong');
          scFeedbackEl.textContent = sc.explanations[choice];
        });
        scChoicesEl.appendChild(btn);
      });
    }
  }

  Core.SCENARIOS.forEach(function (sc, idx) {
    var tab = document.createElement('button');
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
    tab.className = 'mmm-scenario-tab' + (idx === 0 ? ' active' : '');
    tab.innerHTML = sc.tab + '<small>' + sc.sub + '</small>';
    tab.addEventListener('click', function () { renderScenario(idx, false); });
    scTabsEl.appendChild(tab);
  });
  if (scWhatIfBtn) {
    scWhatIfBtn.addEventListener('click', function () {
      whatIfActive = !whatIfActive;
      renderScenario(activeScenarioIdx, true);
    });
  }
  renderScenario(0, false);

  // ---- Interactive Check ----
  var questionEl = document.getElementById('mmm-question');
  var options = document.getElementById('mmm-options');
  var feedback = document.getElementById('mmm-feedback');
  var score = document.getElementById('mmm-score');
  var next = document.getElementById('mmm-next');
  var qIndex = 0;
  var correct = 0;
  var attempted = 0;
  var locked = false;

  function renderQuestion() {
    var qs = Core.QUIZ_QUESTIONS;
    var item = qs[qIndex % qs.length];
    locked = false;
    questionEl.textContent = 'Q' + ((qIndex % qs.length) + 1) + ' of ' + qs.length + ' · ' + item.q;
    options.innerHTML = '';
    feedback.textContent = 'Think about how each measure is calculated.';
    item.choices.forEach(function (choice) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'mmm-choice';
      button.textContent = choice;
      button.addEventListener('click', function () {
        if (locked) return;
        locked = true;
        attempted += 1;
        if (choice === item.answer) {
          correct += 1;
          button.classList.add('correct');
          feedback.textContent = 'Correct! ' + item.feedback;
        } else {
          button.classList.add('wrong');
          Array.prototype.forEach.call(options.children, function (option) {
            if (String(option.textContent) === String(item.answer)) option.classList.add('correct');
          });
          feedback.textContent = 'Not quite. ' + item.feedback;
        }
        score.textContent = correct + '/' + attempted;
      });
      options.appendChild(button);
    });
    score.textContent = correct + '/' + attempted;
  }

  next.addEventListener('click', function () {
    qIndex += 1;
    renderQuestion();
  });
  renderQuestion();

  // ---- Guided Practice ----
  document.querySelectorAll('.mmm-practice-item').forEach(function (item) {
    var input = item.querySelector('input');
    var button = item.querySelector('.mmm-check');
    var feedbackNode = item.querySelector('.mmm-mini-feedback');
    button.addEventListener('click', function () {
      var expected = Number(item.getAttribute('data-answer'));
      var res = Core.checkNumericAnswer(input.value, expected, 0.01);
      feedbackNode.className = 'mmm-mini-feedback';
      if (res.empty) {
        feedbackNode.textContent = 'Enter a number first.';
        feedbackNode.classList.add('no');
      } else if (res.ok) {
        var explain = item.getAttribute('data-explain');
        feedbackNode.textContent = '✔ Correct!' + (explain ? ' ' + explain : '');
        feedbackNode.classList.add('ok');
      } else {
        var hint = item.getAttribute('data-hint');
        feedbackNode.textContent = 'Not yet' + (hint ? ' — Hint: ' + hint : '. Try again.');
        feedbackNode.classList.add('no');
      }
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') button.click();
    });
  });
})();
