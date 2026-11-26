/* Interactive 3-lens manipulative controller for the Math Foundations #integers station.
 * Provides Number Line, Vertical Scale (Thermometer/Elevation/Balance), and ± Zero-Pair Chips.
 */
(function (root) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        node.setAttribute(k, String(attrs[k]));
      });
    }
    return node;
  }

  function mount(container, item, callbacks) {
    var Engine = root.MathIntegersEngine;
    if (!container || !item || !item.integerMeta || !Engine) {
      return { showResult: function () {}, revealSolution: function () {}, destroy: function () {} };
    }

    var meta = item.integerMeta;
    var cb = callbacks || {};
    var fmt = Engine.fmt;
    var fmtSigned = Engine.fmtSigned;

    var scaleValues = [0];
    if (typeof meta.start === 'number') scaleValues.push(meta.start);
    if (typeof meta.target === 'number') scaleValues.push(meta.target);
    if (Array.isArray(meta.operands)) {
      meta.operands.forEach(function (v) { if (typeof v === 'number') scaleValues.push(v); });
    }
    if (Array.isArray(meta.steps)) {
      meta.steps.forEach(function (st) {
        if (st && typeof st.from === 'number') scaleValues.push(st.from);
        if (st && typeof st.to === 'number') scaleValues.push(st.to);
      });
    }
    var scale = Engine.computeNumberLineScale(scaleValues, { stepHint: meta.stepHint });

    var startVal = typeof meta.start === 'number' ? meta.start : 0;
    var initialView = (cb.mode === 'apply' && (meta.context === 'temperature' || meta.context === 'elevation')) ? 'vertical' : 'line';

    var state = {
      view: initialView,
      probe: startVal,
      guessValue: null,
      solved: false,
      revealed: false,
      chipsPos: 0,
      chipsNeg: 0,
      chipsNote: ''
    };

    var destroyed = false;
    var stepSmall = meta.stepHint && meta.stepHint < 1 ? meta.stepHint : 1;
    var stepBig = meta.stepHint && meta.stepHint < 1 ? 1 : (scale.step >= 5 ? scale.step : 5);

    container.replaceChildren();
    var rootEl = el('div', 'int-lab');

    // Top bar: subskill badge + 3-lens view tabs
    var bar = el('div', 'int-lab-bar');
    bar.appendChild(el('span', 'int-subskill-tag', meta.subskill || 'Integers'));

    var tabs = el('div', 'int-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Integer models');

    var verticalLabel = meta.context === 'temperature' ? '\u00b0C Scale'
      : (meta.context === 'elevation' ? 'Elevation'
        : (meta.context === 'balance' ? 'Balance' : 'Vertical'));

    var tabDefs = [
      { id: 'line', label: 'Number Line' },
      { id: 'vertical', label: verticalLabel },
      { id: 'chips', label: '\u00b1 Chips' }
    ];

    var tabButtons = {};
    tabDefs.forEach(function (td) {
      var btn = el('button', 'int-tab' + (state.view === td.id ? ' is-active' : ''), td.label);
      btn.type = 'button';
      btn.dataset.intView = td.id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(state.view === td.id));
      btn.addEventListener('click', function () {
        setView(td.id);
      });
      tabButtons[td.id] = btn;
      tabs.appendChild(btn);
    });
    bar.appendChild(tabs);
    rootEl.appendChild(bar);

    var stageEl = el('div', 'int-stage');
    rootEl.appendChild(stageEl);
    container.appendChild(rootEl);

    function clampProbe(v) {
      var raw = Number(v.toFixed(6));
      if (raw < scale.min) return scale.min;
      if (raw > scale.max) return scale.max;
      return raw === 0 || Object.is(raw, -0) ? 0 : raw;
    }

    function nudgeProbe(delta) {
      state.probe = clampProbe(state.probe + delta);
      renderStage();
    }

    function resetProbe() {
      state.probe = startVal;
      renderStage();
    }

    function useProbeValue() {
      var valToSend = (meta.kind === 'abs_dist' || meta.kind === 'abs_dist_neg')
        ? Math.abs(state.probe - startVal)
        : state.probe;
      if (typeof cb.onUseValue === 'function') cb.onUseValue(fmt(valToSend));
    }

    function buildReadoutText() {
      if (meta.kind === 'abs_dist' || meta.kind === 'abs_dist_neg') {
        var bPt = Array.isArray(meta.operands) && typeof meta.operands[1] === 'number' ? meta.operands[1] : startVal;
        var spanDist = Number(Math.abs(state.probe - startVal).toFixed(6));
        return 'Anchor ' + fmtSigned(startVal) + ' (target ' + fmtSigned(bPt) + ') \u00b7 Probe ' + fmtSigned(state.probe) + ' \u2192 Span: ' + fmt(spanDist);
      }
      var diff = Number((state.probe - startVal).toFixed(6));
      var diffLabel = diff === 0 ? '0' : (diff > 0 ? '+' + fmt(diff) : fmtSigned(diff));
      var unitSuffix = meta.unitLabel ? (meta.unitLabel === '$' ? '' : ' ' + meta.unitLabel) : '';
      return 'Start ' + fmtSigned(startVal) + unitSuffix + ' \u00b7 Move ' + diffLabel + ' \u2192 Probe ' + fmtSigned(state.probe) + unitSuffix;
    }

    function buildStepButtons(includeVerticalLabels) {
      var row = el('div', 'int-controls');
      var steps = [
        { d: -stepBig, label: includeVerticalLabels ? 'Down ' + fmt(stepBig) : '\u2212' + fmt(stepBig) },
        { d: -stepSmall, label: includeVerticalLabels ? 'Down ' + fmt(stepSmall) : '\u2212' + fmt(stepSmall) },
        { d: stepSmall, label: includeVerticalLabels ? 'Up ' + fmt(stepSmall) : '+' + fmt(stepSmall) },
        { d: stepBig, label: includeVerticalLabels ? 'Up ' + fmt(stepBig) : '+' + fmt(stepBig) }
      ];
      steps.forEach(function (st) {
        var b = el('button', 'int-step-btn', st.label);
        b.type = 'button';
        b.addEventListener('click', function () { nudgeProbe(st.d); });
        row.appendChild(b);
      });
      var resetBtn = el('button', 'int-step-btn is-muted', 'Reset');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', resetProbe);
      row.appendChild(resetBtn);

      var useBtn = el('button', 'int-step-btn is-use', 'Use \u2192');
      useBtn.type = 'button';
      useBtn.addEventListener('click', useProbeValue);
      row.appendChild(useBtn);
      return row;
    }

    function renderLineView() {
      var wrap = el('div', 'int-line-view');
      var w = 420;
      var h = 132;
      var padX = 28;
      var axisY = 78;
      var xOf = function (v) {
        return padX + ((v - scale.min) / (scale.max - scale.min)) * (w - 2 * padX);
      };

      var svg = svgEl('svg', {
        class: 'int-svg',
        viewBox: '0 0 ' + w + ' ' + h,
        role: 'img',
        'aria-label': 'Interactive number line from ' + fmtSigned(scale.min) + ' to ' + fmtSigned(scale.max)
      });

      var zeroX = xOf(0);
      if (scale.min < 0) {
        svg.appendChild(svgEl('rect', {
          x: xOf(scale.min), y: axisY - 6, width: Math.max(0, zeroX - xOf(scale.min)), height: 12, rx: 4,
          fill: 'var(--int-neg-bg, rgba(194,65,12,0.1))'
        }));
      }
      if (scale.max > 0) {
        svg.appendChild(svgEl('rect', {
          x: zeroX, y: axisY - 6, width: Math.max(0, xOf(scale.max) - zeroX), height: 12, rx: 4,
          fill: 'var(--int-pos-bg, rgba(15,118,110,0.1))'
        }));
      }

      svg.appendChild(svgEl('line', {
        x1: xOf(scale.min), y1: axisY, x2: xOf(scale.max), y2: axisY,
        stroke: 'currentColor', 'stroke-width': 2.5, 'stroke-linecap': 'round'
      }));

      // Ticks & clickable hit zones
      scale.ticks.forEach(function (t) {
        var tx = xOf(t.value);
        if (t.isZero) {
          svg.appendChild(svgEl('line', {
            x1: tx, y1: axisY - 13, x2: tx, y2: axisY + 13,
            stroke: 'var(--int-zero, var(--station, #3157a4))', 'stroke-width': 2.5
          }));
          var zt = svgEl('text', {
            x: tx, y: axisY + 29, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 900,
            fill: 'var(--int-zero, var(--station, #3157a4))'
          });
          zt.textContent = '0';
          svg.appendChild(zt);
        } else {
          var tickH = t.major ? 9 : 5;
          svg.appendChild(svgEl('line', {
            x1: tx, y1: axisY - tickH, x2: tx, y2: axisY + tickH,
            stroke: 'currentColor', 'stroke-width': t.major ? 1.6 : 1, opacity: t.major ? 0.85 : 0.45
          }));
          if (t.major) {
            var lt = svgEl('text', {
              x: tx, y: axisY + 26, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'currentColor'
            });
            lt.textContent = t.label;
            svg.appendChild(lt);
          }
        }

        // Clickable target at each tick
        var hit = svgEl('circle', {
          cx: tx, cy: axisY, r: 12, fill: 'transparent', class: 'int-tick-hit', tabindex: 0,
          role: 'button', 'aria-label': 'Move probe to ' + t.label
        });
        hit.addEventListener('click', function () {
          state.probe = t.value;
          renderStage();
        });
        hit.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            state.probe = t.value;
            renderStage();
          }
        });
        svg.appendChild(hit);
      });

      // Live exploration arc from start to probe (if moved)
      if (state.probe !== startVal) {
        var px1 = xOf(startVal);
        var px2 = xOf(state.probe);
        var pmx = (px1 + px2) / 2;
        var pColor = state.probe >= startVal ? 'var(--int-pos, #0f766e)' : 'var(--int-neg, #c2410c)';
        svg.appendChild(svgEl('path', {
          d: 'M' + px1 + ' ' + (axisY - 8) + ' Q' + pmx + ' ' + (axisY - 40) + ' ' + px2 + ' ' + (axisY - 8),
          fill: 'none', stroke: pColor, 'stroke-width': 2.5, 'stroke-dasharray': '5 4'
        }));
        var pDiff = Number((state.probe - startVal).toFixed(6));
        var pLbl = svgEl('text', {
          x: pmx, y: axisY - 30, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 850, fill: pColor
        });
        pLbl.textContent = (meta.kind === 'abs_dist' || meta.kind === 'abs_dist_neg')
          ? 'span ' + fmt(Math.abs(pDiff))
          : (pDiff > 0 ? '+' + fmt(pDiff) : fmtSigned(pDiff));
        svg.appendChild(pLbl);
      }

      // Revealed solution jumps (only after solved or solution opened)
      if ((state.solved || state.revealed) && Array.isArray(meta.steps)) {
        meta.steps.forEach(function (st, idx) {
          var sx1 = xOf(st.from);
          var sx2 = xOf(st.to);
          var smx = (sx1 + sx2) / 2;
          var sColor = st.to >= st.from ? 'var(--int-pos, #0f766e)' : 'var(--int-neg, #c2410c)';
          var arcTop = axisY - (42 + (idx % 2) * 14);
          svg.appendChild(svgEl('path', {
            d: 'M' + sx1 + ' ' + (axisY - 7) + ' Q' + smx + ' ' + arcTop + ' ' + sx2 + ' ' + (axisY - 7),
            fill: 'none', stroke: sColor, 'stroke-width': 3
          }));
          svg.appendChild(svgEl('circle', {
            cx: sx2, cy: axisY, r: 6, fill: sColor, stroke: 'var(--studio-card, #fff)', 'stroke-width': 2
          }));
        });
      }

      // Student's wrong guess marker (without spoiling target)
      if (!state.solved && state.guessValue !== null && Number.isFinite(state.guessValue)) {
        var clampedG = Math.max(scale.min, Math.min(scale.max, state.guessValue));
        var gx = xOf(clampedG);
        svg.appendChild(svgEl('circle', {
          cx: gx, cy: axisY, r: 8, fill: 'none', stroke: 'var(--int-neg, #c2410c)',
          'stroke-width': 2.5, 'stroke-dasharray': '3 2'
        }));
        var gl = svgEl('text', {
          x: gx, y: axisY + 42, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 850,
          fill: 'var(--int-neg, #c2410c)'
        });
        gl.textContent = 'Your try: ' + fmtSigned(state.guessValue);
        svg.appendChild(gl);
      }

      // Start marker (and second endpoint for abs_dist)
      var startX = xOf(startVal);
      svg.appendChild(svgEl('circle', {
        cx: startX, cy: axisY, r: 6.5, fill: 'var(--station, #3157a4)',
        stroke: 'var(--studio-card, #fff)', 'stroke-width': 2
      }));
      var startTxt = svgEl('text', {
        x: startX, y: axisY - 14, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 850, fill: 'currentColor'
      });
      startTxt.textContent = fmtSigned(startVal);
      svg.appendChild(startTxt);

      if ((meta.kind === 'abs_dist' || meta.kind === 'abs_dist_neg') && Array.isArray(meta.operands) && typeof meta.operands[1] === 'number') {
        var endPt = meta.operands[1];
        var ex = xOf(endPt);
        svg.appendChild(svgEl('circle', {
          cx: ex, cy: axisY, r: 6.5, fill: 'var(--int-pos, #0f766e)',
          stroke: 'var(--studio-card, #fff)', 'stroke-width': 2
        }));
        var endTxt = svgEl('text', {
          x: ex, y: axisY - 14, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 850, fill: 'currentColor'
        });
        endTxt.textContent = fmtSigned(endPt);
        svg.appendChild(endTxt);
      }

      // Active probe marker
      var probeX = xOf(state.probe);
      svg.appendChild(svgEl('polygon', {
        points: (probeX - 6) + ',' + (axisY - 26) + ' ' + (probeX + 6) + ',' + (axisY - 26) + ' ' + probeX + ',' + (axisY - 17),
        fill: state.probe >= 0 ? 'var(--int-pos, #0f766e)' : 'var(--int-neg, #c2410c)'
      }));

      wrap.appendChild(svg);
      wrap.appendChild(buildStepButtons(false));
      var readout = el('p', 'int-readout', buildReadoutText());
      readout.setAttribute('aria-live', 'polite');
      wrap.appendChild(readout);
      stageEl.appendChild(wrap);
    }

    function renderVerticalView() {
      var wrap = el('div', 'int-vertical-wrap');
      var vw = 130;
      var vh = 176;
      var topY = 18;
      var botY = 158;
      var axisX = 64;
      var yOf = function (v) {
        return botY - ((v - scale.min) / (scale.max - scale.min)) * (botY - topY);
      };

      var svg = svgEl('svg', {
        class: 'int-vsvg',
        viewBox: '0 0 ' + vw + ' ' + vh,
        role: 'img',
        'aria-label': 'Vertical ' + verticalLabel + ' scale from ' + fmtSigned(scale.min) + ' to ' + fmtSigned(scale.max)
      });

      var zeroY = yOf(0);
      if (scale.min < 0) {
        svg.appendChild(svgEl('rect', {
          x: axisX - 9, y: zeroY, width: 18, height: Math.max(0, botY - zeroY), rx: 4,
          fill: 'var(--int-neg-bg, rgba(194,65,12,0.12))'
        }));
      }
      if (scale.max > 0) {
        svg.appendChild(svgEl('rect', {
          x: axisX - 9, y: topY, width: 18, height: Math.max(0, zeroY - topY), rx: 4,
          fill: 'var(--int-pos-bg, rgba(15,118,110,0.12))'
        }));
      }

      svg.appendChild(svgEl('line', {
        x1: axisX, y1: topY, x2: axisX, y2: botY,
        stroke: 'currentColor', 'stroke-width': 2.5, 'stroke-linecap': 'round'
      }));

      // Highlight zero benchmark line
      svg.appendChild(svgEl('line', {
        x1: axisX - 18, y1: zeroY, x2: axisX + 18, y2: zeroY,
        stroke: 'var(--int-zero, var(--station, #3157a4))', 'stroke-width': 2.2
      }));

      scale.ticks.forEach(function (t) {
        var ty = yOf(t.value);
        if (t.major || t.isZero) {
          svg.appendChild(svgEl('line', {
            x1: axisX - (t.isZero ? 14 : 8), y1: ty, x2: axisX + (t.isZero ? 14 : 8), y2: ty,
            stroke: t.isZero ? 'var(--int-zero, var(--station, #3157a4))' : 'currentColor',
            'stroke-width': t.isZero ? 2.2 : 1.4
          }));
          var txt = svgEl('text', {
            x: axisX - 16, y: ty + 3.5, 'text-anchor': 'end',
            'font-size': t.isZero ? 11 : 9.5, 'font-weight': t.isZero ? 900 : 700,
            fill: t.isZero ? 'var(--int-zero, var(--station, #3157a4))' : 'currentColor'
          });
          txt.textContent = t.label + (t.isZero && meta.unitLabel === '\u00b0C' ? '\u00b0' : '');
          svg.appendChild(txt);
        }
        var hit = svgEl('rect', {
          x: axisX - 18, y: ty - 6, width: 36, height: 12, fill: 'transparent', class: 'int-tick-hit'
        });
        hit.addEventListener('click', function () {
          state.probe = t.value;
          renderStage();
        });
        svg.appendChild(hit);
      });

      // Start marker
      var sy = yOf(startVal);
      svg.appendChild(svgEl('circle', {
        cx: axisX, cy: sy, r: 6, fill: 'var(--station, #3157a4)', stroke: 'var(--studio-card, #fff)', 'stroke-width': 2
      }));

      // Probe marker and dashed arrow
      var py = yOf(state.probe);
      if (state.probe !== startVal) {
        var pCol = state.probe >= startVal ? 'var(--int-pos, #0f766e)' : 'var(--int-neg, #c2410c)';
        svg.appendChild(svgEl('line', {
          x1: axisX + 16, y1: sy, x2: axisX + 16, y2: py,
          stroke: pCol, 'stroke-width': 2.5, 'stroke-dasharray': '4 3'
        }));
      }
      svg.appendChild(svgEl('polygon', {
        points: (axisX + 10) + ',' + py + ' ' + (axisX + 20) + ',' + (py - 5) + ' ' + (axisX + 20) + ',' + (py + 5),
        fill: state.probe >= 0 ? 'var(--int-pos, #0f766e)' : 'var(--int-neg, #c2410c)'
      }));
      var pTxt = svgEl('text', {
        x: axisX + 24, y: py + 3.5, 'text-anchor': 'start', 'font-size': 10.5, 'font-weight': 850,
        fill: state.probe >= 0 ? 'var(--int-pos, #0f766e)' : 'var(--int-neg, #c2410c)'
      });
      pTxt.textContent = fmtSigned(state.probe);
      svg.appendChild(pTxt);

      // Solution landing highlight if solved/revealed
      if ((state.solved || state.revealed) && typeof meta.target === 'number') {
        var ty2 = yOf(meta.target);
        svg.appendChild(svgEl('circle', {
          cx: axisX, cy: ty2, r: 5.5, fill: meta.target >= 0 ? 'var(--int-pos, #0f766e)' : 'var(--int-neg, #c2410c)',
          stroke: 'var(--studio-card, #fff)', 'stroke-width': 2
        }));
      }

      var side = el('div', 'int-vertical-side');
      var caption = meta.context === 'temperature'
        ? 'Above 0\u00b0C is warmer; below 0\u00b0C is colder.'
        : (meta.context === 'elevation'
          ? '0 m is sea level; negative values lie below sea level.'
          : '0 is the benchmark; move up (+) or down (\u2212).');
      side.appendChild(el('p', 'int-vertical-caption', caption));
      side.appendChild(buildStepButtons(true));
      var readout = el('p', 'int-readout', buildReadoutText());
      readout.setAttribute('aria-live', 'polite');
      side.appendChild(readout);

      wrap.appendChild(svg);
      wrap.appendChild(side);
      stageEl.appendChild(wrap);
    }

    function renderChipsView() {
      var wrap = el('div', 'int-chips-view');
      var cs = Engine.computeChipsState(state.chipsPos, state.chipsNeg);

      if (!meta.supportsChips) {
        wrap.appendChild(el('p', 'int-chip-note', 'Zero-pair chips model whole-number addition and subtraction. Use the Number Line or Vertical Scale for this task, or explore integer chips freely here.'));
      } else if (meta.kind === 'sub_neg') {
        wrap.appendChild(el('p', 'int-chip-note', 'Tip: To subtract negatives you don\u2019t have, add zero pairs (+/\u2212) first, then take away the negative chips.'));
      }

      var mat = el('div', 'int-chips-mat');
      if (cs.pos === 0 && cs.neg === 0) {
        mat.appendChild(el('span', 'int-chips-empty', 'Tap +1, \u22121, or + Zero pair to build with chips.'));
      } else {
        // Render paired zero pairs first
        for (var zp = 0; zp < cs.zeroPairs; zp++) {
          var pairBox = el('span', 'int-zero-pair');
          pairBox.title = 'Zero pair: +1 and \u22121 cancel to 0';
          var pChip = el('button', 'int-chip is-pos', '+');
          pChip.type = 'button';
          pChip.setAttribute('aria-label', 'Remove one +1 chip');
          pChip.addEventListener('click', function () {
            if (state.chipsPos > 0) state.chipsPos--;
            renderStage();
          });
          var nChip = el('button', 'int-chip is-neg', '\u2212');
          nChip.type = 'button';
          nChip.setAttribute('aria-label', 'Remove one \u22121 chip');
          nChip.addEventListener('click', function () {
            if (state.chipsNeg > 0) state.chipsNeg--;
            renderStage();
          });
          pairBox.appendChild(pChip);
          pairBox.appendChild(nChip);
          mat.appendChild(pairBox);
        }
        // Render remaining unpaired chips
        var remPos = cs.pos - cs.zeroPairs;
        var remNeg = cs.neg - cs.zeroPairs;
        for (var i = 0; i < remPos; i++) {
          var pc = el('button', 'int-chip is-pos', '+');
          pc.type = 'button';
          pc.setAttribute('aria-label', 'Remove one +1 chip');
          pc.addEventListener('click', function () {
            if (state.chipsPos > 0) state.chipsPos--;
            renderStage();
          });
          mat.appendChild(pc);
        }
        for (var j = 0; j < remNeg; j++) {
          var nc = el('button', 'int-chip is-neg', '\u2212');
          nc.type = 'button';
          nc.setAttribute('aria-label', 'Remove one \u22121 chip');
          nc.addEventListener('click', function () {
            if (state.chipsNeg > 0) state.chipsNeg--;
            renderStage();
          });
          mat.appendChild(nc);
        }
      }
      wrap.appendChild(mat);

      var actions = el('div', 'int-controls int-chip-actions');
      var addPosBtn = el('button', 'int-step-btn is-pos-btn', '+1');
      addPosBtn.type = 'button';
      addPosBtn.addEventListener('click', function () {
        if (state.chipsPos < 24) state.chipsPos++;
        state.chipsNote = '';
        renderStage();
      });
      var addNegBtn = el('button', 'int-step-btn is-neg-btn', '\u22121');
      addNegBtn.type = 'button';
      addNegBtn.addEventListener('click', function () {
        if (state.chipsNeg < 24) state.chipsNeg++;
        state.chipsNote = '';
        renderStage();
      });
      var zpBtn = el('button', 'int-step-btn', '+ Zero pair');
      zpBtn.type = 'button';
      zpBtn.addEventListener('click', function () {
        if (state.chipsPos < 24 && state.chipsNeg < 24) {
          var next = Engine.addZeroPair(state.chipsPos, state.chipsNeg);
          state.chipsPos = next.pos;
          state.chipsNeg = next.neg;
          state.chipsNote = 'Added (+1 and \u22121): net value stays ' + fmtSigned(next.netValue) + '.';
          renderStage();
        }
      });
      var cancelBtn = el('button', 'int-step-btn', 'Cancel pairs');
      cancelBtn.type = 'button';
      cancelBtn.disabled = cs.zeroPairs === 0;
      cancelBtn.addEventListener('click', function () {
        var next = Engine.cancelZeroPairs(state.chipsPos, state.chipsNeg);
        state.chipsPos = next.pos;
        state.chipsNeg = next.neg;
        state.chipsNote = 'Cancelled ' + next.cancelled + ' zero ' + (next.cancelled === 1 ? 'pair' : 'pairs') + '.';
        renderStage();
      });
      actions.appendChild(addPosBtn);
      actions.appendChild(addNegBtn);
      actions.appendChild(zpBtn);
      actions.appendChild(cancelBtn);

      if (Number.isInteger(startVal) && Math.abs(startVal) <= 12) {
        var loadBtn = el('button', 'int-step-btn is-muted', 'Load start');
        loadBtn.type = 'button';
        loadBtn.addEventListener('click', function () {
          state.chipsPos = startVal > 0 ? startVal : 0;
          state.chipsNeg = startVal < 0 ? Math.abs(startVal) : 0;
          state.chipsNote = 'Loaded start value ' + fmtSigned(startVal) + '.';
          renderStage();
        });
        actions.appendChild(loadBtn);
      }

      var clearBtn = el('button', 'int-step-btn is-muted', 'Clear');
      clearBtn.type = 'button';
      clearBtn.disabled = cs.pos === 0 && cs.neg === 0;
      clearBtn.addEventListener('click', function () {
        state.chipsPos = 0;
        state.chipsNeg = 0;
        state.chipsNote = '';
        renderStage();
      });
      actions.appendChild(clearBtn);

      var useNetBtn = el('button', 'int-step-btn is-use', 'Use net \u2192');
      useNetBtn.type = 'button';
      useNetBtn.addEventListener('click', function () {
        if (typeof cb.onUseValue === 'function') cb.onUseValue(fmt(cs.netValue));
      });
      actions.appendChild(useNetBtn);

      wrap.appendChild(actions);

      var readout = el('p', 'int-readout', state.chipsNote ? cs.summary + ' (' + state.chipsNote + ')' : cs.summary);
      readout.setAttribute('aria-live', 'polite');
      wrap.appendChild(readout);

      stageEl.appendChild(wrap);
    }

    function renderStage() {
      if (destroyed) return;
      stageEl.replaceChildren();
      if (state.view === 'vertical') renderVerticalView();
      else if (state.view === 'chips') renderChipsView();
      else renderLineView();
    }

    function setView(nextView) {
      state.view = nextView;
      Object.keys(tabButtons).forEach(function (k) {
        var active = k === nextView;
        tabButtons[k].classList.toggle('is-active', active);
        tabButtons[k].setAttribute('aria-selected', String(active));
      });
      renderStage();
    }

    renderStage();

    return {
      showResult: function (res) {
        if (destroyed || !res) return;
        state.solved = Boolean(res.correct);
        state.guessValue = Number.isFinite(res.studentValue) ? res.studentValue : null;
        renderStage();
      },
      revealSolution: function () {
        if (destroyed) return;
        state.revealed = true;
        renderStage();
      },
      destroy: function () {
        destroyed = true;
      }
    };
  }

  root.MathIntegersLab = { mount: mount };
}(typeof window !== 'undefined' ? window : this));
