/* Pure curriculum, scale, zero-pair, and diagnostic engine for Math Foundations #integers.
 * Zero DOM dependencies so it can be unit-tested in Node and shared by the browser UI.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MathIntegersEngine = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CLEAN_STEPS = [0.25, 0.5, 1, 2, 5, 10, 20, 25, 50, 100];

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]);
    });
  }

  function cleanZero(n) {
    if (!Number.isFinite(n)) return 0;
    var rounded = Number(n.toFixed(6));
    return Object.is(rounded, -0) || rounded === 0 ? 0 : rounded;
  }

  function fmt(n) {
    return String(cleanZero(n));
  }

  function fmtSigned(n) {
    var v = cleanZero(n);
    if (v < 0) return '\u2212' + String(Math.abs(v));
    return String(v);
  }

  function fmtParen(n) {
    var v = cleanZero(n);
    return v < 0 ? '(' + fmtSigned(v) + ')' : String(v);
  }

  function parseNumber(value) {
    var s = String(value == null ? '' : value).trim().replace(/\u2212/g, '-');
    if (!s) return NaN;
    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) {
      return cleanZero(Number(s));
    }
    var m = s.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*\/\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);
    if (m && Number(m[2]) !== 0) {
      return cleanZero(Number(m[1]) / Number(m[2]));
    }
    return NaN;
  }

  function isMultiple(val, step) {
    var q = val / step;
    return Math.abs(q - Math.round(q)) < 1e-6;
  }

  function computeNumberLineScale(values, opts) {
    var options = opts || {};
    var maxTicks = typeof options.maxTicks === 'number' && options.maxTicks >= 4 ? options.maxTicks : 15;
    var stepHint = typeof options.stepHint === 'number' && options.stepHint > 0 ? options.stepHint : null;

    var nums = (Array.isArray(values) ? values : []).filter(function (v) {
      return typeof v === 'number' && Number.isFinite(v);
    });
    nums.push(0);

    var rawMin = Math.min.apply(null, nums);
    var rawMax = Math.max.apply(null, nums);
    var span = rawMax - rawMin;

    var chosen = null;

    if (stepHint && CLEAN_STEPS.indexOf(stepHint) !== -1) {
      var allHintMultiples = nums.every(function (v) { return isMultiple(v, stepHint); });
      if (allHintMultiples) {
        var hLo = Math.floor((rawMin - 1e-9) / stepHint) * stepHint - stepHint;
        var hHi = Math.ceil((rawMax + 1e-9) / stepHint) * stepHint + stepHint;
        if (Math.round((hHi - hLo) / stepHint) + 1 <= 16) {
          chosen = { step: stepHint, min: cleanZero(hLo), max: cleanZero(hHi) };
        }
      }
    }

    if (!chosen) {
      var startIdx = stepHint && stepHint < 1 ? 0 : 2;
      for (var i = startIdx; i < CLEAN_STEPS.length; i++) {
        var s = CLEAN_STEPS[i];
        var pad = span <= 3 * s ? 2 * s : s;
        var lo = Math.floor((rawMin - pad + 1e-9) / s) * s;
        var hi = Math.ceil((rawMax + pad - 1e-9) / s) * s;
        if (lo > -s && rawMin >= 0) {
          // Keep 0 anchored; allow slight padding below 0 when negatives exist, or start at 0 for K-5 positive scales.
          lo = rawMin < 0 ? -s : 0;
        }
        var count = Math.round((hi - lo) / s) + 1;
        if (count >= 6 && count <= maxTicks) {
          chosen = { step: s, min: cleanZero(lo), max: cleanZero(hi) };
          break;
        }
        if (count <= maxTicks && !chosen) {
          chosen = { step: s, min: cleanZero(lo), max: cleanZero(hi) };
        }
      }
    }

    if (!chosen) {
      var fallbackStep = Math.max(1, Math.ceil(span / 10));
      var fLo = Math.floor(rawMin / fallbackStep) * fallbackStep - fallbackStep;
      var fHi = Math.ceil(rawMax / fallbackStep) * fallbackStep + fallbackStep;
      chosen = { step: fallbackStep, min: cleanZero(fLo), max: cleanZero(fHi) };
    }

    // Ensure at least 1 step breathing room beyond extreme data values on non-zero sides (and 0 included).
    if (chosen.min > 0) chosen.min = 0;
    if (chosen.max < 0) chosen.max = 0;
    if (rawMin < 0 && chosen.min >= rawMin) chosen.min = cleanZero(chosen.min - chosen.step);
    if (rawMax > 0 && chosen.max <= rawMax) chosen.max = cleanZero(chosen.max + chosen.step);
    if (chosen.min === chosen.max) {
      chosen.min = cleanZero(chosen.min - 2 * chosen.step);
      chosen.max = cleanZero(chosen.max + 2 * chosen.step);
    }

    var ticks = [];
    var totalTicks = Math.round((chosen.max - chosen.min) / chosen.step) + 1;
    var labelEvery = totalTicks > 13 ? 2 : 1;
    for (var k = 0; k < totalTicks; k++) {
      var val = cleanZero(chosen.min + k * chosen.step);
      var isZero = val === 0;
      var major = isZero || k % labelEvery === 0;
      ticks.push({
        value: val,
        isZero: isZero,
        major: major,
        label: fmtSigned(val)
      });
    }

    return {
      min: chosen.min,
      max: chosen.max,
      step: chosen.step,
      ticks: ticks
    };
  }

  function computeChipsState(pos, neg) {
    var p = Math.max(0, Math.floor(Number(pos) || 0));
    var n = Math.max(0, Math.floor(Number(neg) || 0));
    var zeroPairs = Math.min(p, n);
    var netValue = p - n;
    var remainingSign = netValue > 0 ? 1 : (netValue < 0 ? -1 : 0);
    var remainingCount = Math.abs(netValue);
    var summary;
    if (p === 0 && n === 0) {
      summary = 'No chips on mat yet · Net: 0';
    } else if (zeroPairs > 0) {
      summary = p + ' (+1), ' + n + ' (\u22121) \u00b7 ' + zeroPairs + ' zero ' + (zeroPairs === 1 ? 'pair cancels' : 'pairs cancel') + ' \u2192 Net: ' + fmtSigned(netValue);
    } else {
      summary = p + ' (+1), ' + n + ' (\u22121) \u2192 Net: ' + fmtSigned(netValue);
    }
    return {
      pos: p,
      neg: n,
      zeroPairs: zeroPairs,
      netValue: netValue,
      remainingSign: remainingSign,
      remainingCount: remainingCount,
      summary: summary
    };
  }

  function addZeroPair(pos, neg) {
    var p = Math.max(0, Math.floor(Number(pos) || 0)) + 1;
    var n = Math.max(0, Math.floor(Number(neg) || 0)) + 1;
    return computeChipsState(p, n);
  }

  function cancelZeroPairs(pos, neg) {
    var p = Math.max(0, Math.floor(Number(pos) || 0));
    var n = Math.max(0, Math.floor(Number(neg) || 0));
    var cancelled = Math.min(p, n);
    var next = computeChipsState(p - cancelled, n - cancelled);
    next.cancelled = cancelled;
    return next;
  }

  function renderStaticNumberLineSVG(meta, opts) {
    var m = meta || {};
    var options = opts || {};
    var points = [0];
    if (typeof m.start === 'number' && Number.isFinite(m.start)) points.push(m.start);
    if (typeof m.target === 'number' && Number.isFinite(m.target)) points.push(m.target);
    if (Array.isArray(m.operands)) {
      m.operands.forEach(function (v) {
        if (typeof v === 'number' && Number.isFinite(v)) points.push(v);
      });
    }
    if (Array.isArray(m.steps)) {
      m.steps.forEach(function (st) {
        if (st && typeof st.from === 'number') points.push(st.from);
        if (st && typeof st.to === 'number') points.push(st.to);
      });
    }

    var scale = computeNumberLineScale(points, { stepHint: m.stepHint });
    var min = scale.min;
    var max = scale.max;
    var padX = 28;
    var width = 420;
    var x = function (v) {
      return Number((padX + ((v - min) / (max - min)) * (width - 2 * padX)).toFixed(2));
    };

    var axisY = 92;
    var zeroX = x(0);
    var parts = [];

    // Negative and positive subtle axis zone bands
    if (min < 0) {
      parts.push('<rect x="' + x(min) + '" y="' + (axisY - 6) + '" width="' + Math.max(0, zeroX - x(min)).toFixed(2) + '" height="12" rx="4" fill="var(--int-neg-bg, rgba(194,65,12,0.1))"/>');
    }
    if (max > 0) {
      parts.push('<rect x="' + zeroX + '" y="' + (axisY - 6) + '" width="' + Math.max(0, x(max) - zeroX).toFixed(2) + '" height="12" rx="4" fill="var(--int-pos-bg, rgba(15,118,110,0.1))"/>');
    }

    parts.push('<line x1="' + x(min) + '" y1="' + axisY + '" x2="' + x(max) + '" y2="' + axisY + '" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>');

    scale.ticks.forEach(function (t) {
      var tx = x(t.value);
      if (t.isZero) {
        parts.push('<line x1="' + tx + '" y1="' + (axisY - 14) + '" x2="' + tx + '" y2="' + (axisY + 14) + '" stroke="var(--int-zero, var(--station, #4f46e5))" stroke-width="2.5"/>');
        parts.push('<text x="' + tx + '" y="' + (axisY + 30) + '" text-anchor="middle" font-size="12" font-weight="900" fill="var(--int-zero, var(--station, #4f46e5))">0</text>');
      } else {
        var h = t.major ? 9 : 5;
        parts.push('<line x1="' + tx + '" y1="' + (axisY - h) + '" x2="' + tx + '" y2="' + (axisY + h) + '" stroke="currentColor" stroke-width="' + (t.major ? 1.6 : 1) + '" opacity="' + (t.major ? '0.85' : '0.45') + '"/>');
        if (t.major) {
          parts.push('<text x="' + tx + '" y="' + (axisY + 27) + '" text-anchor="middle" font-size="11" font-weight="700">' + esc(t.label) + '</text>');
        }
      }
    });

    if ((m.kind === 'abs_dist' || m.kind === 'abs_dist_neg') && Array.isArray(m.operands) && m.operands.length >= 2) {
      var a = m.operands[0];
      var b = m.operands[1];
      parts.push('<circle cx="' + x(a) + '" cy="' + axisY + '" r="6.5" fill="var(--station, #4f46e5)" stroke="var(--studio-card, #fff)" stroke-width="2"/>');
      parts.push('<text x="' + x(a) + '" y="' + (axisY - 15) + '" text-anchor="middle" font-size="11" font-weight="800">' + esc(fmtSigned(a)) + '</text>');
      parts.push('<circle cx="' + x(b) + '" cy="' + axisY + '" r="6.5" fill="var(--int-pos, #0f766e)" stroke="var(--studio-card, #fff)" stroke-width="2"/>');
      parts.push('<text x="' + x(b) + '" y="' + (axisY - 15) + '" text-anchor="middle" font-size="11" font-weight="800">' + esc(fmtSigned(b)) + '</text>');
      parts.push('<text x="210" y="26" text-anchor="middle" font-size="12" font-weight="800">Measure the distance between ' + esc(fmtSigned(a)) + ' and ' + esc(fmtSigned(b)) + '</text>');
    } else if (typeof m.start === 'number' && Number.isFinite(m.start)) {
      var sx = x(m.start);
      parts.push('<circle cx="' + sx + '" cy="' + axisY + '" r="7" fill="var(--station, #4f46e5)" stroke="var(--studio-card, #fff)" stroke-width="2"/>');
      parts.push('<text x="' + sx + '" y="' + (axisY - 16) + '" text-anchor="middle" font-size="11" font-weight="800">Start ' + esc(fmtSigned(m.start)) + '</text>');
      parts.push('<text x="210" y="24" text-anchor="middle" font-size="12" font-weight="800">Start at ' + esc(fmtSigned(m.start)) + ' \u00b7 track direction and distance</text>');
    }

    if (options.reveal && Array.isArray(m.steps) && m.steps.length) {
      m.steps.forEach(function (st, idx) {
        var x1 = x(st.from);
        var x2 = x(st.to);
        var mx = ((x1 + x2) / 2).toFixed(2);
        var arcH = 28 + (idx % 2) * 14;
        var cy = (axisY - arcH).toFixed(2);
        var dirColor = st.to >= st.from ? 'var(--int-pos, #0f766e)' : 'var(--int-neg, #c2410c)';
        parts.push('<path d="M' + x1 + ' ' + (axisY - 8) + ' Q' + mx + ' ' + cy + ' ' + x2 + ' ' + (axisY - 8) + '" fill="none" stroke="' + dirColor + '" stroke-width="2.5"/>');
        parts.push('<circle cx="' + x2 + '" cy="' + axisY + '" r="5.5" fill="' + dirColor + '"/>');
      });
    }

    var label = 'Number line from ' + fmtSigned(min) + ' to ' + fmtSigned(max) + ' with zero anchored';
    return '<svg class="foundation-svg int-static-svg" viewBox="0 0 420 150" role="img" aria-label="' + esc(label) + '"><title>' + esc(label) + '</title>' + parts.join('') + '</svg>';
  }

  function makeTask(spec) {
    var visual = renderStaticNumberLineSVG(spec.integerMeta);
    return {
      goal: spec.goal,
      prompt: spec.prompt,
      answer: String(spec.answer),
      visual: visual,
      hint: spec.hint,
      solution: spec.solution,
      reason: spec.reason,
      apply: spec.apply || spec.prompt,
      unit: spec.unit || '',
      integerMeta: spec.integerMeta
    };
  }

  function buildSubskill(subskill, randInt, pick) {
    var a, b, c, ans, context;

    if (subskill === 'forward') {
      a = randInt(1, 6);
      b = randInt(1, 4);
      ans = a + b;
      return makeTask({
        goal: 'Count on along a number line',
        prompt: 'Start at ' + a + '. Take ' + b + ' steps right. Where do you land?',
        answer: ans,
        hint: 'Each step right adds 1.',
        solution: a + ' + ' + b + ' = ' + ans + '.',
        reason: 'Why do you count steps rather than counting the starting mark?',
        apply: 'A game piece starts on ' + a + ' and moves forward ' + b + ' spaces. Where does it finish?',
        integerMeta: {
          kind: 'add', subskill: 'Count on', context: 'number', unitLabel: '',
          start: a, delta: b, target: ans, operands: [a, b], stepHint: 1, supportsChips: true,
          steps: [{ from: a, to: ans, label: '+' + b }]
        }
      });
    }

    if (subskill === 'backtrack') {
      a = randInt(7, 16);
      b = randInt(2, Math.min(6, a - 1));
      ans = a - b;
      return makeTask({
        goal: 'Count back along a number line',
        prompt: 'Start at ' + a + '. Move ' + b + ' steps left. Where do you land?',
        answer: ans,
        hint: 'Moving left subtracts 1 per step.',
        solution: a + ' \u2212 ' + b + ' = ' + ans + '.',
        reason: 'How does moving left on the number line relate to addition?',
        apply: 'A marker starts at ' + a + ' on a track and steps back ' + b + ' spaces. Where does it land?',
        integerMeta: {
          kind: 'sub_pos', subskill: 'Count back', context: 'number', unitLabel: '',
          start: a, delta: -b, target: ans, operands: [a, b], stepHint: 1, supportsChips: true,
          steps: [{ from: a, to: ans, label: '\u2212' + b }]
        }
      });
    }

    if (subskill === 'missing_jump') {
      a = randInt(2, 9);
      b = randInt(3, 8);
      ans = b;
      return makeTask({
        goal: 'Find the jump between numbers',
        prompt: 'Start at ' + a + '. How many steps right reach ' + (a + b) + '?',
        answer: ans,
        hint: 'Count the spaces from ' + a + ' up to ' + (a + b) + '.',
        solution: (a + b) + ' \u2212 ' + a + ' = ' + b + ' steps right.',
        reason: 'Why is the number of steps equal to the difference between the two marks?',
        apply: 'You are on step ' + a + ' and want to reach step ' + (a + b) + '. How many steps forward must you take?',
        integerMeta: {
          kind: 'add', subskill: 'Missing jump', context: 'number', unitLabel: '',
          start: a, delta: b, target: ans, operands: [a, a + b], stepHint: 1, supportsChips: true,
          steps: [{ from: a, to: a + b, label: '+' + b }]
        }
      });
    }

    if (subskill === 'distance_pos') {
      a = randInt(12, 24);
      b = a + randInt(6, 14);
      ans = b - a;
      return makeTask({
        goal: 'Measure distance on a scaled line',
        prompt: 'Find the distance between ' + a + ' and ' + b + ' on the number line.',
        answer: ans,
        hint: 'Subtract the smaller position from the larger position.',
        solution: b + ' \u2212 ' + a + ' = ' + ans + ' units apart.',
        reason: 'How can benchmark tens (like 20) help you find the distance mentally?',
        apply: 'Mile markers sit at ' + a + ' km and ' + b + ' km. How many km apart are they?',
        unit: 'units',
        integerMeta: {
          kind: 'abs_dist', subskill: 'Scaled distance', context: 'number', unitLabel: 'units',
          start: a, delta: ans, target: ans, operands: [a, b], stepHint: 2, supportsChips: false,
          steps: [{ from: a, to: b, label: String(ans) }]
        }
      });
    }

    if (subskill === 'rational_pos_add') {
      a = randInt(1, 5) + 0.5;
      b = randInt(1, 4) + 0.5;
      ans = cleanZero(a + b);
      return makeTask({
        goal: 'Add positive decimals on a line',
        prompt: 'Find ' + fmt(a) + ' + ' + fmt(b) + '.',
        answer: fmt(ans),
        hint: 'Move ' + fmt(b) + ' units right from ' + fmt(a) + '.',
        solution: fmt(a) + ' + ' + fmt(b) + ' = ' + fmt(ans) + '.',
        reason: 'Why do two halves combine to make a whole unit?',
        apply: 'A plant is ' + fmt(a) + ' cm tall and grows ' + fmt(b) + ' cm. What is its new height?',
        integerMeta: {
          kind: 'add', subskill: 'Positive halves', context: 'number', unitLabel: '',
          start: a, delta: b, target: ans, operands: [a, b], stepHint: 0.5, supportsChips: false,
          steps: [{ from: a, to: ans, label: '+' + fmt(b) }]
        }
      });
    }

    if (subskill === 'rational_pos_sub') {
      a = randInt(3, 6) + 0.5;
      b = randInt(1, Math.floor(a) - 1) + 0.5;
      ans = cleanZero(a - b);
      return makeTask({
        goal: 'Subtract positive decimals on a line',
        prompt: 'Find ' + fmt(a) + ' \u2212 ' + fmt(b) + '.',
        answer: fmt(ans),
        hint: 'Start at ' + fmt(a) + ' and move ' + fmt(b) + ' units left.',
        solution: fmt(a) + ' \u2212 ' + fmt(b) + ' = ' + fmt(ans) + '.',
        reason: 'How can stepping to the nearest whole number make subtraction easier?',
        apply: 'A ribbon is ' + fmt(a) + ' m long and ' + fmt(b) + ' m is cut off. How much remains?',
        integerMeta: {
          kind: 'sub_pos', subskill: 'Decimal step back', context: 'number', unitLabel: '',
          start: a, delta: -b, target: ans, operands: [a, b], stepHint: 0.5, supportsChips: false,
          steps: [{ from: a, to: ans, label: '\u2212' + fmt(b) }]
        }
      });
    }

    if (subskill === 'add_cross_zero') {
      a = randInt(-9, -3);
      var cross = randInt(0, 1) === 1;
      b = cross ? randInt(Math.abs(a) + 1, Math.abs(a) + 6) : randInt(2, Math.abs(a) - 1);
      ans = a + b;
      return makeTask({
        goal: 'Add across zero on the line',
        prompt: 'Find ' + fmtSigned(a) + ' + ' + b + '.',
        answer: ans,
        hint: 'Start at ' + fmtSigned(a) + '. Move ' + b + ' units right' + (cross ? ', crossing 0.' : ' toward 0.'),
        solution: cross
          ? 'From ' + fmtSigned(a) + ', it takes ' + Math.abs(a) + ' right to reach 0, then ' + (b - Math.abs(a)) + ' more right to ' + fmtSigned(ans) + '.'
          : 'From ' + fmtSigned(a) + ', moving ' + b + ' right cancels ' + b + ' negatives, leaving ' + fmtSigned(ans) + '.',
        reason: 'Explain the sign of the result before calculating.',
        apply: 'The temperature is ' + fmtSigned(a) + '\u00b0C and rises ' + b + '\u00b0C. What is the new temperature?',
        integerMeta: {
          kind: 'add_cross_zero', subskill: 'Adding across zero', context: 'temperature', unitLabel: '\u00b0C',
          start: a, delta: b, target: ans, operands: [a, b], stepHint: 1, supportsChips: true,
          steps: [{ from: a, to: ans, label: '+' + b }]
        }
      });
    }

    if (subskill === 'sub_past_zero') {
      a = randInt(1, 7);
      b = randInt(a + 2, a + 8);
      ans = a - b;
      return makeTask({
        goal: 'Subtract past zero',
        prompt: 'Find ' + a + ' \u2212 ' + b + '.',
        answer: ans,
        hint: 'Start at ' + a + ' and move ' + b + ' units left, past 0.',
        solution: 'Moving ' + a + ' left reaches 0; ' + (b - a) + ' more left reaches ' + fmtSigned(ans) + '.',
        reason: 'Why is the result negative even though both numbers in ' + a + ' \u2212 ' + b + ' look positive?',
        apply: 'A diver is ' + a + ' m above sea level and descends ' + b + ' m. What is the new elevation?',
        integerMeta: {
          kind: 'sub_past_zero', subskill: 'Subtracting past zero', context: 'elevation', unitLabel: 'm',
          start: a, delta: -b, target: ans, operands: [a, b], stepHint: 1, supportsChips: true,
          steps: [{ from: a, to: ans, label: '\u2212' + b }]
        }
      });
    }

    if (subskill === 'add_two_neg') {
      a = randInt(-7, -2);
      b = randInt(-6, -2);
      ans = a + b;
      return makeTask({
        goal: 'Combine negative values',
        prompt: 'Find ' + fmtSigned(a) + ' + ' + fmtParen(b) + '.',
        answer: ans,
        hint: 'Both quantities are negative, so move further left from ' + fmtSigned(a) + '.',
        solution: 'Start at ' + fmtSigned(a) + ' and move ' + Math.abs(b) + ' units left to ' + fmtSigned(ans) + '.',
        reason: 'Use zero-pair chips or a depth story to explain why two negatives add to a more negative value.',
        apply: 'A submarine is at ' + fmtSigned(a) + ' m and descends another ' + Math.abs(b) + ' m. What is its elevation?',
        integerMeta: {
          kind: 'add_two_neg', subskill: 'Adding negatives', context: 'elevation', unitLabel: 'm',
          start: a, delta: b, target: ans, operands: [a, b], stepHint: 1, supportsChips: true,
          steps: [{ from: a, to: ans, label: fmtSigned(b) }]
        }
      });
    }

    if (subskill === 'sub_negative') {
      a = randInt(-6, 5);
      b = randInt(-8, -2);
      ans = a - b;
      return makeTask({
        goal: 'Subtract a negative number',
        prompt: 'Find ' + fmtSigned(a) + ' \u2212 ' + fmtParen(b) + '.',
        answer: ans,
        hint: 'Subtracting ' + fmtParen(b) + ' removes a negative change, moving ' + Math.abs(b) + ' units right.',
        solution: fmtSigned(a) + ' \u2212 ' + fmtParen(b) + ' = ' + fmtSigned(a) + ' + ' + Math.abs(b) + ' = ' + fmtSigned(ans) + '.',
        reason: 'Explain why subtracting a negative moves right. How can zero-pair chips show this?',
        apply: 'An account balance is ' + fmtSigned(a) + ' dollars and a ' + Math.abs(b) + '-dollar fee (' + fmtSigned(b) + ') is removed. What is the new balance?',
        integerMeta: {
          kind: 'sub_neg', subskill: 'Subtracting a negative', context: 'balance', unitLabel: '$',
          start: a, delta: -b, target: ans, operands: [a, b], stepHint: 1, supportsChips: true,
          steps: [{ from: a, to: ans, label: '+' + Math.abs(b) }]
        }
      });
    }

    if (subskill === 'rational_signed') {
      var mode = randInt(0, 2);
      if (mode === 0) {
        a = -(randInt(1, 4) + 0.5);
        b = randInt(3, 6);
        ans = cleanZero(a + b);
        context = 'temperature';
        return makeTask({
          goal: 'Add signed rational numbers',
          prompt: 'Find ' + fmtSigned(a) + ' + ' + b + '.',
          answer: fmt(ans),
          hint: 'Start at ' + fmtSigned(a) + ' and move ' + b + ' whole units right.',
          solution: fmtSigned(a) + ' + ' + b + ' = ' + fmtSigned(ans) + '.',
          reason: 'How does the half-unit fractional part stay consistent when you jump by whole units?',
          apply: 'The temperature is ' + fmtSigned(a) + '\u00b0C and warms up ' + b + '\u00b0C. What is the temperature now?',
          integerMeta: {
            kind: 'rational_signed', subskill: 'Signed rationals', context: context, unitLabel: '\u00b0C',
            start: a, delta: b, target: ans, operands: [a, b], stepHint: 0.5, supportsChips: false,
            steps: [{ from: a, to: ans, label: '+' + b }]
          }
        });
      }
      if (mode === 1) {
        a = randInt(1, 3) + 0.5;
        b = randInt(3, 6);
        ans = cleanZero(a - b);
        return makeTask({
          goal: 'Subtract signed rational numbers',
          prompt: 'Find ' + fmt(a) + ' \u2212 ' + b + '.',
          answer: fmt(ans),
          hint: 'Move ' + b + ' units left from ' + fmt(a) + ', crossing 0.',
          solution: fmt(a) + ' \u2212 ' + b + ' = ' + fmtSigned(ans) + '.',
          reason: 'Why is the distance from 0 equal to ' + fmt(Math.abs(ans)) + ' after crossing zero?',
          apply: 'A trail marker sits at ' + fmt(a) + ' m and drops ' + b + ' m. What is the new elevation?',
          integerMeta: {
            kind: 'rational_signed', subskill: 'Signed rationals', context: 'elevation', unitLabel: 'm',
            start: a, delta: -b, target: ans, operands: [a, b], stepHint: 0.5, supportsChips: false,
            steps: [{ from: a, to: ans, label: '\u2212' + b }]
          }
        });
      }
      a = -(randInt(1, 3) + 0.5);
      b = -(randInt(2, 4) + 0.5);
      ans = cleanZero(a - b);
      return makeTask({
        goal: 'Subtract negative rational numbers',
        prompt: 'Find ' + fmtSigned(a) + ' \u2212 ' + fmtParen(b) + '.',
        answer: fmt(ans),
        hint: 'Subtracting ' + fmtParen(b) + ' is equivalent to adding ' + fmt(Math.abs(b)) + '.',
        solution: fmtSigned(a) + ' + ' + fmt(Math.abs(b)) + ' = ' + fmtSigned(ans) + '.',
        reason: 'Explain how rewriting subtraction as adding the opposite helps with decimals and fractions.',
        apply: 'A freezer was at ' + fmtSigned(b) + '\u00b0C and a sensor reads ' + fmtSigned(a) + '\u00b0C. Find ' + fmtSigned(a) + ' \u2212 ' + fmtParen(b) + '.',
        integerMeta: {
          kind: 'sub_neg', subskill: 'Signed rationals', context: 'temperature', unitLabel: '\u00b0C',
          start: a, delta: -b, target: ans, operands: [a, b], stepHint: 0.5, supportsChips: false,
          steps: [{ from: a, to: ans, label: '+' + fmt(Math.abs(b)) }]
        }
      });
    }

    if (subskill === 'signed_mult') {
      var pattern = pick(['neg_neg', 'neg_pos', 'pos_neg']);
      var x = randInt(2, 5);
      var y = randInt(2, 5);
      a = pattern === 'pos_neg' ? x : -x;
      b = pattern === 'neg_pos' ? y : -y;
      ans = a * b;
      var steps = [];
      var cur = 0;
      var stepDelta = b;
      var count = Math.abs(a);
      var jumpDir = a < 0 ? -b : b;
      for (var i = 0; i < count; i++) {
        steps.push({ from: cur, to: cur + jumpDir, label: fmtSigned(jumpDir) });
        cur += jumpDir;
      }
      return makeTask({
        goal: 'Multiply signed integers',
        prompt: 'Find ' + fmtParen(a) + ' \u00d7 ' + fmtParen(b) + '.',
        answer: ans,
        hint: 'Same signs produce a positive product; opposite signs produce a negative product.',
        solution: fmtParen(a) + ' \u00d7 ' + fmtParen(b) + ' = ' + fmtSigned(ans) + '. Repeated jumps of size ' + Math.abs(stepDelta) + ' with sign rules land on ' + fmtSigned(ans) + '.',
        reason: 'Explain why ' + fmtParen(a) + ' \u00d7 ' + fmtParen(b) + ' is ' + (ans >= 0 ? 'positive' : 'negative') + ' using patterns or opposites.',
        apply: a < 0
          ? 'Temperature changes by ' + fmtSigned(b) + '\u00b0C per hour. Compared to now, what was it ' + Math.abs(a) + ' hours ago (' + fmtSigned(a) + ')?'
          : 'A diver descends ' + Math.abs(b) + ' m per minute for ' + a + ' minutes. What is the net elevation change?',
        integerMeta: {
          kind: 'signed_mult', subskill: 'Signed multiplication', context: a < 0 ? 'temperature' : 'elevation', unitLabel: a < 0 ? '\u00b0C' : 'm',
          start: 0, delta: ans, target: ans, operands: [a, b], stepHint: Math.abs(b) <= 3 ? 1 : 2, supportsChips: false,
          steps: steps
        }
      });
    }

    if (subskill === 'signed_div') {
      var dPattern = pick(['neg_neg', 'neg_pos', 'pos_neg']);
      var divisorMag = randInt(2, 6);
      var quotMag = randInt(2, 6);
      var divisor = dPattern === 'pos_neg' ? -divisorMag : divisorMag;
      if (dPattern === 'neg_neg') divisor = -divisorMag;
      var dividend = dPattern === 'pos_neg' ? divisorMag * quotMag : -(divisorMag * quotMag);
      if (dPattern === 'neg_pos') { dividend = -(divisorMag * quotMag); divisor = divisorMag; }
      ans = dividend / divisor;
      return makeTask({
        goal: 'Divide signed integers',
        prompt: 'Find ' + fmtParen(dividend) + ' \u00f7 ' + fmtParen(divisor) + '.',
        answer: ans,
        hint: 'Ask what number times ' + fmtParen(divisor) + ' equals ' + fmtParen(dividend) + '.',
        solution: 'Since ' + fmtParen(ans) + ' \u00d7 ' + fmtParen(divisor) + ' = ' + fmtSigned(dividend) + ', the quotient is ' + fmtSigned(ans) + '.',
        reason: 'How does the multiplication sign rule guarantee the sign of this quotient?',
        apply: 'A submarine changes elevation by ' + fmtSigned(dividend) + ' m over ' + Math.abs(divisor) + ' equal stages (' + fmtSigned(divisor) + ' divisor). Find the change matching ' + fmtParen(dividend) + ' \u00f7 ' + fmtParen(divisor) + '.',
        integerMeta: {
          kind: 'signed_div', subskill: 'Signed division', context: 'elevation', unitLabel: 'm',
          start: 0, delta: ans, target: ans, operands: [dividend, divisor], stepHint: 1, supportsChips: false,
          steps: [{ from: 0, to: ans, label: fmtSigned(ans) }]
        }
      });
    }

    if (subskill === 'net_change') {
      a = randInt(-6, 3);
      b = randInt(4, 9);
      c = randInt(3, 8);
      var useSubNeg = randInt(0, 1) === 1;
      if (useSubNeg) {
        var negB = -randInt(2, 6);
        ans = a - negB - c;
        return makeTask({
          goal: 'Track multi-step signed change',
          prompt: 'Evaluate ' + fmtSigned(a) + ' \u2212 ' + fmtParen(negB) + ' \u2212 ' + c + '.',
          answer: ans,
          hint: 'Rewrite \u2212 ' + fmtParen(negB) + ' as + ' + Math.abs(negB) + ', then move left ' + c + '.',
          solution: fmtSigned(a) + ' + ' + Math.abs(negB) + ' = ' + fmtSigned(a - negB) + '; then ' + fmtSigned(a - negB) + ' \u2212 ' + c + ' = ' + fmtSigned(ans) + '.',
          reason: 'Why can you combine the two changes before starting from ' + fmtSigned(a) + '?',
          apply: 'An elevator starts on floor ' + fmtSigned(a) + ', cancels a ' + Math.abs(negB) + '-floor drop, then goes down ' + c + ' floors. Where does it stop?',
          integerMeta: {
            kind: 'net_change', subskill: 'Multi-step net change', context: 'elevation', unitLabel: 'm',
            start: a, delta: ans - a, target: ans, operands: [a, -negB, -c], stepHint: 1, supportsChips: true,
            steps: [
              { from: a, to: a - negB, label: '+' + Math.abs(negB) },
              { from: a - negB, to: ans, label: '\u2212' + c }
            ]
          }
        });
      }
      ans = a + b - c;
      return makeTask({
        goal: 'Track multi-step signed change',
        prompt: 'Evaluate ' + fmtSigned(a) + ' + ' + b + ' \u2212 ' + c + '.',
        answer: ans,
        hint: 'Follow each move left or right in order from ' + fmtSigned(a) + '.',
        solution: fmtSigned(a) + ' + ' + b + ' = ' + fmtSigned(a + b) + '; then ' + fmtSigned(a + b) + ' \u2212 ' + c + ' = ' + fmtSigned(ans) + '.',
        reason: 'Does changing the order to ' + fmtSigned(a) + ' \u2212 ' + c + ' + ' + b + ' change the final position? Explain.',
        apply: 'Morning temperature is ' + fmtSigned(a) + '\u00b0C. It rises ' + b + '\u00b0C by noon, then drops ' + c + '\u00b0C at night. What is the night temperature?',
        integerMeta: {
          kind: 'net_change', subskill: 'Multi-step net change', context: 'temperature', unitLabel: '\u00b0C',
          start: a, delta: b - c, target: ans, operands: [a, b, -c], stepHint: 1, supportsChips: true,
          steps: [
            { from: a, to: a + b, label: '+' + b },
            { from: a + b, to: ans, label: '\u2212' + c }
          ]
        }
      });
    }

    if (subskill === 'signed_order') {
      a = randInt(-4, 4);
      b = -randInt(2, 4);
      c = randInt(2, 3);
      ans = a + b * c;
      return makeTask({
        goal: 'Combine multiplication and signed sums',
        prompt: 'Evaluate ' + fmtSigned(a) + ' + ' + fmtParen(b) + ' \u00d7 ' + c + '.',
        answer: ans,
        hint: 'Multiply ' + fmtParen(b) + ' \u00d7 ' + c + ' first, then add to ' + fmtSigned(a) + '.',
        solution: fmtParen(b) + ' \u00d7 ' + c + ' = ' + fmtSigned(b * c) + '; ' + fmtSigned(a) + ' + ' + fmtParen(b * c) + ' = ' + fmtSigned(ans) + '.',
        reason: 'Why must you compute ' + fmtParen(b) + ' \u00d7 ' + c + ' before adding ' + fmtSigned(a) + '?',
        apply: 'An account starts at ' + fmtSigned(a) + ' dollars and has ' + c + ' automatic charges of ' + fmtSigned(b) + ' dollars. What is the new balance?',
        integerMeta: {
          kind: 'signed_order', subskill: 'Signed order of operations', context: 'balance', unitLabel: '$',
          start: a, delta: b * c, target: ans, operands: [a, b * c], stepHint: 1, supportsChips: false,
          steps: [{ from: a, to: ans, label: fmtSigned(b * c) }]
        }
      });
    }

    if (subskill === 'rational_frac') {
      var den = pick([2, 4]);
      var numA = -randInt(1, den + 2);
      var numB = randInt(2, den + 3);
      a = numA / den;
      b = numB / den;
      ans = cleanZero((numA + numB) / den);
      var ansStr = (numA + numB) % den === 0 ? String((numA + numB) / den) : (numA + numB) + '/' + den;
      return makeTask({
        goal: 'Add signed fractions on the line',
        prompt: 'Find ' + fmtSigned(numA) + '/' + den + ' + ' + numB + '/' + den + '.',
        answer: ansStr,
        hint: 'Both fractions share denominator ' + den + '. Move ' + numB + '/' + den + ' right from ' + fmtSigned(numA) + '/' + den + '.',
        solution: '(' + fmtSigned(numA) + ' + ' + numB + ')/' + den + ' = ' + (numA + numB) + '/' + den + ' (' + fmtSigned(ans) + ').',
        reason: 'How does finding a common denominator resemble choosing equal tick steps on the number line?',
        apply: 'A probe sits at ' + fmtSigned(numA) + '/' + den + ' m relative to sea level and rises ' + numB + '/' + den + ' m. Where is it?',
        integerMeta: {
          kind: 'rational_signed', subskill: 'Signed fractions', context: 'elevation', unitLabel: 'm',
          start: a, delta: b, target: ans, operands: [a, b], stepHint: den === 4 ? 0.25 : 0.5, supportsChips: false,
          steps: [{ from: a, to: ans, label: '+' + numB + '/' + den }]
        }
      });
    }

    if (subskill === 'abs_dist' || subskill === 'abs_dist_neg') {
      if (subskill === 'abs_dist') {
        a = randInt(-8, -2);
        b = randInt(2, 8);
      } else {
        a = randInt(-10, -5);
        b = randInt(-4, -1);
      }
      ans = Math.abs(a - b);
      return makeTask({
        goal: 'Interpret absolute value as distance',
        prompt: 'Find |' + fmtSigned(a) + ' \u2212 ' + fmtParen(b) + '|.',
        answer: ans,
        hint: 'Distance between two points on a number line is always nonnegative.',
        solution: fmtSigned(a) + ' \u2212 ' + fmtParen(b) + ' = ' + fmtSigned(a - b) + '; its distance from 0 is |' + fmtSigned(a - b) + '| = ' + ans + '.',
        reason: 'Explain why |a \u2212 b| and |b \u2212 a| always agree.',
        apply: 'One sensor is at ' + fmtSigned(a) + ' m and another is at ' + fmtSigned(b) + ' m. How many metres apart are they vertically?',
        unit: 'units',
        integerMeta: {
          kind: subskill, subskill: 'Absolute distance', context: 'elevation', unitLabel: 'm',
          start: a, delta: b - a, target: ans, operands: [a, b], stepHint: 1, supportsChips: false,
          steps: [{ from: a, to: b, label: 'dist ' + ans }]
        }
      });
    }

    if (subskill === 'abs_diff') {
      a = randInt(-6, -2);
      b = randInt(-9, -4);
      if (Math.abs(a) === Math.abs(b)) b -= 1;
      ans = Math.abs(a) - Math.abs(b);
      return makeTask({
        goal: 'Evaluate separate absolute values',
        prompt: 'Find |' + fmtSigned(a) + '| \u2212 |' + fmtSigned(b) + '|.',
        answer: ans,
        hint: 'Evaluate each absolute value separately before subtracting.',
        solution: '|' + fmtSigned(a) + '| = ' + Math.abs(a) + ' and |' + fmtSigned(b) + '| = ' + Math.abs(b) + '; ' + Math.abs(a) + ' \u2212 ' + Math.abs(b) + ' = ' + fmtSigned(ans) + '.',
        reason: 'Why can |a| \u2212 |b| be negative, whereas |a \u2212 b| can never be negative?',
        apply: 'Compare the magnitudes of two changes: |' + fmtSigned(a) + '| \u2212 |' + fmtSigned(b) + '|.',
        integerMeta: {
          kind: 'abs_diff', subskill: 'Absolute value difference', context: 'number', unitLabel: '',
          start: Math.abs(a), delta: -Math.abs(b), target: ans, operands: [a, b], stepHint: 1, supportsChips: false,
          steps: [{ from: Math.abs(a), to: ans, label: '\u2212' + Math.abs(b) }]
        }
      });
    }

    // abs_expr
    a = randInt(-8, -3);
    b = randInt(1, 5);
    c = randInt(2, 6);
    ans = Math.abs(a + b) - c;
    return makeTask({
      goal: 'Evaluate absolute value expressions',
      prompt: 'Find |' + fmtSigned(a) + ' + ' + b + '| \u2212 ' + c + '.',
      answer: ans,
      hint: 'Simplify inside the absolute value bars first, take its distance from 0, then subtract ' + c + '.',
      solution: fmtSigned(a) + ' + ' + b + ' = ' + fmtSigned(a + b) + '; |' + fmtSigned(a + b) + '| = ' + Math.abs(a + b) + '; ' + Math.abs(a + b) + ' \u2212 ' + c + ' = ' + fmtSigned(ans) + '.',
      reason: 'Why do absolute value bars act like grouping symbols around ' + fmtSigned(a) + ' + ' + b + '?',
      apply: 'Compute the net shift |' + fmtSigned(a) + ' + ' + b + '| \u2212 ' + c + '.',
      integerMeta: {
        kind: 'abs_expr', subskill: 'Absolute value expression', context: 'number', unitLabel: '',
        start: Math.abs(a + b), delta: -c, target: ans, operands: [a, b, c], stepHint: 1, supportsChips: false,
        steps: [{ from: Math.abs(a + b), to: ans, label: '\u2212' + c }]
      }
    });
  }

  var GRADE_SUBSKILLS = {
    0: ['forward'],
    1: ['forward'],
    2: ['forward', 'backtrack'],
    3: ['forward', 'backtrack', 'missing_jump'],
    4: ['backtrack', 'distance_pos'],
    5: ['rational_pos_add', 'rational_pos_sub'],
    6: ['add_cross_zero', 'sub_past_zero', 'add_two_neg', 'sub_negative', 'rational_signed'],
    7: ['sub_negative', 'rational_signed', 'signed_mult', 'signed_div', 'net_change'],
    8: ['net_change', 'signed_order', 'rational_frac', 'abs_dist', 'signed_mult'],
    9: ['abs_dist', 'abs_dist_neg', 'abs_diff', 'abs_expr'],
    10: ['abs_dist', 'abs_dist_neg', 'abs_diff', 'abs_expr'],
    12: ['abs_dist', 'abs_dist_neg', 'abs_diff', 'abs_expr']
  };

  function createIntegerTask(grade, variantIndex, rng) {
    var g = Number(grade);
    if (g === 11) return null; // Preserve Algebra II radicaleq task in FoundationTasks
    var list = GRADE_SUBSKILLS[g] || GRADE_SUBSKILLS[6];
    var rand = typeof rng === 'function' ? rng : Math.random;
    var randInt = function (lo, hi) {
      return Math.floor(rand() * (hi - lo + 1)) + lo;
    };
    var pick = function (arr) {
      return arr[Math.floor(rand() * arr.length)];
    };
    var idx = typeof variantIndex === 'number' && Number.isFinite(variantIndex)
      ? ((Math.floor(variantIndex) % list.length) + list.length) % list.length
      : Math.floor(rand() * list.length);
    return buildSubskill(list[idx], randInt, pick);
  }

  function diagnoseIntegerError(task, studentRaw) {
    if (!task || !task.integerMeta) return null;
    var student = parseNumber(studentRaw);
    if (!Number.isFinite(student)) return null;

    var meta = task.integerMeta;
    var target = meta.target;
    if (Math.abs(student - target) <= 1e-8) return null;

    var ops = Array.isArray(meta.operands) ? meta.operands : [];
    var a = ops[0];
    var b = ops[1];

    // 1. Subtracting a negative treated as subtracting a positive
    if (meta.kind === 'sub_neg' && typeof a === 'number' && typeof b === 'number') {
      var wrongSubPos = cleanZero(a - Math.abs(b));
      if (Math.abs(student - wrongSubPos) <= 1e-8) {
        return {
          code: 'sub_neg_as_sub_pos',
          message: 'You subtracted +' + fmt(Math.abs(b)) + ' instead of ' + fmtSigned(b) + '. Subtracting a negative removes a negative change and moves right, just like ' + fmtSigned(a) + ' + ' + fmt(Math.abs(b)) + '.'
        };
      }
    }

    // 2. Negative distance for absolute value distance tasks
    if ((meta.kind === 'abs_dist' || meta.kind === 'abs_dist_neg') && student < 0 && Math.abs(Math.abs(student) - target) <= 1e-8) {
      return {
        code: 'negative_distance',
        message: 'Check the absolute value bars: distance between two numbers is always nonnegative (' + fmt(target) + ', not ' + fmtSigned(student) + ').'
      };
    }

    // 3. Multiplication / division sign rule flip
    if ((meta.kind === 'signed_mult' || meta.kind === 'signed_div') && target !== 0 && Math.abs(student + target) <= 1e-8) {
      return {
        code: 'mult_div_sign_rule',
        message: 'Your magnitude (' + fmt(Math.abs(target)) + ') is right, but check the sign rule: same signs give a positive result; opposite signs give a negative result.'
      };
    }

    // 4. General sign flip
    if (target !== 0 && Math.abs(student + target) <= 1e-8) {
      return {
        code: 'sign_flip',
        message: 'Your magnitude (' + fmt(Math.abs(target)) + ') matches, so check which side of 0 you land on.'
      };
    }

    // 5. Added magnitudes on opposite-sign addition/subtraction
    if ((meta.kind === 'add_cross_zero' || meta.kind === 'sub_past_zero' || meta.kind === 'rational_signed') && typeof a === 'number' && typeof b === 'number') {
      var magSum = Math.abs(a) + Math.abs(b);
      if (Math.abs(Math.abs(student) - magSum) <= 1e-8 && Math.abs(target) !== magSum) {
        return {
          code: 'added_magnitudes',
          message: 'Instead of combining the sizes into ' + fmt(Math.abs(student)) + ', opposite directions cancel out in zero pairs toward 0.'
        };
      }
    }

    // 6. Wrong direction from start
    if (typeof meta.start === 'number' && typeof meta.delta === 'number' && meta.delta !== 0) {
      var reversed = cleanZero(meta.start - meta.delta);
      if (Math.abs(student - reversed) <= 1e-8) {
        return {
          code: 'wrong_direction',
          message: 'Check the direction from ' + fmtSigned(meta.start) + ': adding positive or subtracting negative moves right; subtracting positive or adding negative moves left.'
        };
      }
    }

    // 7. Off by 1 (counting start mark instead of steps)
    if (Math.abs(Math.abs(student - target) - 1) <= 1e-8) {
      return {
        code: 'off_by_one',
        message: 'You are off by 1. Count the jumps between tick marks rather than counting the starting mark.'
      };
    }

    return null;
  }

  return {
    fmt: fmt,
    fmtSigned: fmtSigned,
    parseNumber: parseNumber,
    computeNumberLineScale: computeNumberLineScale,
    computeChipsState: computeChipsState,
    addZeroPair: addZeroPair,
    cancelZeroPairs: cancelZeroPairs,
    renderStaticNumberLineSVG: renderStaticNumberLineSVG,
    createIntegerTask: createIntegerTask,
    diagnoseIntegerError: diagnoseIntegerError
  };
}));
