(function (global, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    global.MeanMedianModeCore = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  var MIN_VALUE = 0;
  var MAX_VALUE = 20;

  var PRESETS = {
    balanced: [3, 4, 6, 7, 9],
    outlier: [3, 4, 6, 7, 20],
    even: [2, 4, 5, 9, 11, 14],
    bimodal: [4, 4, 4, 8, 13, 13, 13]
  };

  var SCENARIOS = [
    {
      id: 'cafe',
      tab: 'Cafe Incomes',
      sub: 'Outlier skew ($k)',
      title: 'Neighborhood Cafe Incomes (A Billionaire Walks In)',
      desc: 'Six regular patrons at a local coffee shop earn $42k, $48k, $50k, $52k, $55k, and $58k per year. Then a tech billionaire ($1,195k/yr) sits down at table 7.',
      unit: '$k',
      data: [42, 48, 50, 52, 55, 58, 1195],
      whatIfLabel: 'What if the billionaire leaves the cafe?',
      whatIfData: [42, 48, 50, 52, 55, 58],
      whatIfNote: 'Without the single outlier, Mean drops from $214.3k to $50.8k — almost identical to the Median ($51k)!',
      question: 'Which measure best describes what a typical customer in the cafe earns?',
      best: 'Median',
      explanations: {
        Mean: 'Misleading! The single $1,195k outlier pulls the Mean up to $214.3k — more than 3× what 6 of the 7 people in the room actually make.',
        Median: 'Correct! The Median ($52k) sits right in the middle of the sorted patrons and is completely unaffected by the billionaire outlier.',
        Mode: 'Not helpful here — every patron has a slightly different salary, so there is no mode.'
      }
    },
    {
      id: 'shoes',
      tab: 'Shoe Restock',
      sub: 'Inventory peak',
      title: 'Sneaker Shop Restock Order',
      desc: 'A manager records the last 9 sneaker sizes sold today: 7, 8, 9, 9, 9, 9, 10, 11, 12.',
      unit: 'size',
      data: [7, 8, 9, 9, 9, 9, 10, 11, 12],
      whatIfLabel: 'What if 3 customers buy size 10 next?',
      whatIfData: [7, 8, 9, 9, 9, 9, 10, 10, 10, 10, 11, 12],
      whatIfNote: 'Now size 9 and size 10 tie with 4 sales each (bimodal), while Mean ticks up to 9.5 and Median becomes 9.5!',
      question: 'Which measure tells the manager which specific shoe size to order the most boxes of?',
      best: 'Mode',
      explanations: {
        Mean: 'Not ideal for inventory: the Mean is size 9.33, and factories do not manufacture a size 9.33 shoe!',
        Median: 'While the Median happens to be 9 here, retailers care about the peak frequency (which size sells the most units).',
        Mode: 'Correct! Mode (size 9, sold 4 times) directly identifies the highest-demand size for restocking.'
      }
    },
    {
      id: 'gymnast',
      tab: 'Gymnast Scores',
      sub: 'Rogue low judge',
      title: 'Gymnastics Routine Judge Panel',
      desc: 'Six judges score a floor routine: 8.9, 9.0, 9.0, 9.1, 9.2, and one harsh outlier judge scores 6.4.',
      unit: 'pts',
      data: [6.4, 8.9, 9.0, 9.0, 9.1, 9.2],
      whatIfLabel: 'What if the Olympic rule drops the rogue 6.4?',
      whatIfData: [8.9, 9.0, 9.0, 9.1, 9.2],
      whatIfNote: 'Dropping the low outlier lifts the Mean from 8.6 to 9.04 while keeping the Median steady at 9.0.',
      question: 'Which measure prevents a single rogue judge from unfairly tanking the gymnast\'s score?',
      best: 'Median',
      explanations: {
        Mean: 'Unfair to the athlete! The single 6.4 score drags the Mean down to 8.6 — lower than 5 of the 6 judges\' scores.',
        Median: 'Correct! Averaging the two middle sorted scores (9.0 and 9.0) gives a Median of 9.0, resisting the extreme low judge.',
        Mode: 'Mode only looks for exact ties; if judges scored 8.9, 9.0, 9.1, 9.2, 9.3, Mode would fail completely.'
      }
    },
    {
      id: 'fleet',
      tab: 'Fleet Batteries',
      sub: 'Symmetric total',
      title: 'Delivery Drone Battery Runtime',
      desc: 'Seven delivery drones have symmetric battery runtimes (in hours): 10, 11, 12, 12, 12, 13, 14.',
      unit: 'hrs',
      data: [10, 11, 12, 12, 12, 13, 14],
      whatIfLabel: 'What if 1 drone gets a faulty 2-hr battery?',
      whatIfData: [2, 10, 11, 12, 12, 12, 13, 14],
      whatIfNote: 'That single faulty battery pulls Mean down to 10.75 hrs (total 86 hrs across 8 drones), while Median stays 12 hrs!',
      question: 'When data is symmetric with no outliers and you want to compute total fleet flight hours (Average × 7), which measure mathematically incorporates every drone?',
      best: 'Mean',
      explanations: {
        Mean: 'Correct! Because Mean = Sum ÷ n, multiplying Mean (12 hrs) × 7 drones guarantees the exact total fleet runtime (84 hrs) and uses every measurement.',
        Median: 'In symmetric data Median equals 12 too, but Median ignores the exact values of the outer points if you are budgeting total fleet energy.',
        Mode: 'Mode only reflects the most common value and ignores the spread of the rest of the fleet.'
      }
    }
  ];

  var QUIZ_QUESTIONS = [
    { q: 'What is the mean of 2, 4, 6, 8?', answer: 5, choices: [5, 6, 4, 20], feedback: 'Sum = 20, divided by 4 values gives a mean of 5.' },
    { q: 'What is the median of 1, 3, 3, 9, 12?', answer: 3, choices: [3, 9, 5.6, 6], feedback: 'Sorted, the middle (3rd) value out of five is 3.' },
    { q: 'What is the mode of 5, 5, 7, 8, 8, 8?', answer: 8, choices: [5, 7, 8, 6.8], feedback: '8 appears three times, more often than any other value.' },
    { q: 'A dataset is 4, 5, 6, 7, 40. Which measure best describes a "typical" value?', answer: 'Median', choices: ['Mean', 'Median', 'Mode', 'Range'], feedback: 'The outlier 40 pulls the mean way up to 12.4, so the median (6) better represents a typical value.' },
    { q: 'What is the median of 10, 20, 30, 40?', answer: 25, choices: [25, 30, 20, 15], feedback: 'With an even count (n = 4), average the two middle values: (20 + 30) / 2 = 25.' },
    { q: 'What is the median of the UNSORTED list: 12, 2, 9, 4, 6?', answer: 6, choices: [6, 9, 4, 6.6], feedback: 'Always sort first (2, 4, 6, 9, 12)! The middle value of the sorted list is 6, not 9.' },
    { q: 'Four test scores have a mean of 80. What must the sum of all four scores be?', answer: 320, choices: [320, 20, 84, 160], feedback: 'Since Mean = Sum ÷ 4 = 80, the total sum is 80 × 4 = 320.' },
    { q: 'In a strongly right-skewed dataset (a few very large values), how do Mean and Median usually compare?', answer: 'Mean > Median', choices: ['Mean > Median', 'Mean < Median', 'Mean = Median', 'Mode > Mean'], feedback: 'Extreme high values pull the balance point (mean) toward the right tail, making Mean > Median.' }
  ];

  function fmt(n) {
    if (Math.abs(n) < 1e-9) return '0';
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }

  function clampValue(v) {
    var snapped = Math.round(v * 2) / 2;
    return Math.max(MIN_VALUE, Math.min(MAX_VALUE, snapped));
  }

  function computeStats(vals) {
    var list = Array.isArray(vals) && vals.length ? vals.slice() : [0];
    var n = list.length;
    var sum = list.reduce(function (a, b) { return a + b; }, 0);
    var mean = sum / n;
    var indexed = list.map(function (v, idx) { return { v: v, idx: idx }; });
    indexed.sort(function (a, b) { return a.v - b.v || a.idx - b.idx; });
    var sorted = indexed.map(function (o) { return o.v; });
    var mid = Math.floor(n / 2);
    var median = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    var medianOrigIndices = n % 2 === 0
      ? [indexed[mid - 1].idx, indexed[mid].idx]
      : [indexed[mid].idx];
    var medianSortedPositions = n % 2 === 0 ? [mid - 1, mid] : [mid];

    var counts = {};
    list.forEach(function (v) {
      var key = fmt(v);
      counts[key] = (counts[key] || 0) + 1;
    });
    var maxFreq = 0;
    for (var k in counts) {
      if (Object.prototype.hasOwnProperty.call(counts, k) && counts[k] > maxFreq) {
        maxFreq = counts[k];
      }
    }
    var modeKeys = maxFreq > 1
      ? Object.keys(counts).filter(function (key) { return counts[key] === maxFreq; }).sort(function (a, b) { return Number(a) - Number(b); })
      : [];
    var modeValues = modeKeys.map(function (key) { return Number(key); });

    var deviations = list.map(function (v) { return v - mean; });
    var negSum = 0;
    var posSum = 0;
    deviations.forEach(function (d) {
      if (d < -1e-9) negSum += d;
      else if (d > 1e-9) posSum += d;
    });

    var skewGap = mean - median;
    var skewLabel = 'Symmetric (Mean ≈ Median)';
    if (skewGap > 0.25) skewLabel = 'Right-skewed (Mean > Median)';
    else if (skewGap < -0.25) skewLabel = 'Left-skewed (Mean < Median)';

    return {
      n: n,
      sum: sum,
      mean: mean,
      sorted: sorted,
      indexed: indexed,
      min: sorted[0],
      max: sorted[n - 1],
      range: sorted[n - 1] - sorted[0],
      median: median,
      medianOrigIndices: medianOrigIndices,
      medianSortedPositions: medianSortedPositions,
      maxFreq: maxFreq,
      modeKeys: modeKeys,
      modeValues: modeValues,
      deviations: deviations,
      negSum: negSum,
      posSum: posSum,
      skewGap: skewGap,
      skewLabel: skewLabel
    };
  }

  function evaluateMissions(vals, stats) {
    var st = stats || computeStats(vals);
    var list = Array.isArray(vals) ? vals : [];
    var outlierPull = Math.abs(st.mean - st.median) >= 3;
    var tripleMatch = st.modeValues.length === 1 &&
      Math.abs(st.mean - st.median) < 0.01 &&
      Math.abs(st.median - st.modeValues[0]) < 0.01;
    var evenGap = st.n % 2 === 0 && !list.some(function (v) { return Math.abs(v - st.median) < 1e-6; });
    var bimodal = st.modeValues.length >= 2;

    var items = [
      { id: 'outlier-pull', label: 'Outlier pull: |Mean − Median| ≥ 3', done: outlierPull },
      { id: 'triple-match', label: 'Triple match: Mean = Median = Mode', done: tripleMatch },
      { id: 'even-gap', label: 'Even gap: Median sits between dots', done: evenGap },
      { id: 'bimodal', label: 'Bimodal: Create two tied modes', done: bimodal }
    ];
    var doneCount = items.filter(function (m) { return m.done; }).length;
    return { items: items, doneCount: doneCount, total: items.length };
  }

  function checkNumericAnswer(raw, expected, tolerance) {
    var str = String(raw == null ? '' : raw).trim();
    if (!str) return { empty: true, ok: false };
    var actual = Number(str);
    if (!isFinite(actual)) return { empty: false, ok: false };
    var tol = typeof tolerance === 'number' ? tolerance : 0.05;
    return { empty: false, ok: Math.abs(actual - Number(expected)) <= tol };
  }

  return {
    MIN_VALUE: MIN_VALUE,
    MAX_VALUE: MAX_VALUE,
    PRESETS: PRESETS,
    SCENARIOS: SCENARIOS,
    QUIZ_QUESTIONS: QUIZ_QUESTIONS,
    fmt: fmt,
    clampValue: clampValue,
    computeStats: computeStats,
    evaluateMissions: evaluateMissions,
    checkNumericAnswer: checkNumericAnswer
  };
}));
