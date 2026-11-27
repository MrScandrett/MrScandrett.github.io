(function (global, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    global.HowSpreadOutCore = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  var PRESETS = {
    even: [2, 4, 6, 8, 10, 12, 14, 16, 18],
    tight: [9, 9.5, 10, 10, 10, 10.5, 10, 11, 9],
    split: [3, 3.5, 4, 4, 3, 16, 16.5, 17, 17],
    outlier: [9, 9.5, 10, 10, 10.5, 11, 10, 9.5, 19]
  };

  var BASE_Z = [-1.6, -1.1, -0.8, -0.5, -0.2, 0.2, 0.5, 0.8, 1.1, 1.6];

  function mean(a) {
    if (!a.length) return 0;
    return a.reduce(function (s, v) { return s + v; }, 0) / a.length;
  }

  function sd(a) {
    if (!a.length) return 0;
    var m = mean(a);
    return Math.sqrt(mean(a.map(function (v) { return (v - m) * (v - m); })));
  }

  function sampleSd(a) {
    if (a.length <= 1) return 0;
    var m = mean(a);
    var sumSq = a.reduce(function (s, v) { return s + (v - m) * (v - m); }, 0);
    return Math.sqrt(sumSq / (a.length - 1));
  }

  function mad(a) {
    if (!a.length) return 0;
    var m = mean(a);
    return mean(a.map(function (v) { return Math.abs(v - m); }));
  }

  function median(sortedArr) {
    var n = sortedArr.length;
    if (!n) return 0;
    var m = Math.floor(n / 2);
    return n % 2 ? sortedArr[m] : (sortedArr[m - 1] + sortedArr[m]) / 2;
  }

  var NORMALIZED_Z = (function () {
    var m = mean(BASE_Z);
    var s = sd(BASE_Z);
    return BASE_Z.map(function (z) { return (z - m) / s; });
  })();

  function teamValues(targetSd, targetMean) {
    var mu = typeof targetMean === 'number' ? targetMean : 10;
    return NORMALIZED_Z.map(function (z) { return mu + targetSd * z; });
  }

  function computeSpreadStats(vals) {
    var list = Array.isArray(vals) && vals.length ? vals.slice() : [10];
    var s = list.slice().sort(function (a, b) { return a - b; });
    var n = s.length;
    var h = Math.floor(n / 2);
    var m = mean(s);
    var med = median(s);
    var q1 = h > 0 ? median(s.slice(0, h)) : s[0];
    var q3 = h > 0 ? median(s.slice(n - h)) : s[n - 1];
    var iqr = q3 - q1;
    var popSd = sd(s);
    var variance = popSd * popSd;
    var lo = q1 - 1.5 * iqr;
    var hi = q3 + 1.5 * iqr;
    var outliers = s.filter(function (v) { return v < lo || v > hi; });
    var inliers = s.filter(function (v) { return v >= lo && v <= hi; });
    var whiskerLow = inliers.length ? inliers[0] : s[0];
    var whiskerHigh = inliers.length ? inliers[inliers.length - 1] : s[n - 1];

    return {
      n: n,
      s: s,
      mean: m,
      med: med,
      min: s[0],
      max: s[n - 1],
      range: s[n - 1] - s[0],
      q1: q1,
      q3: q3,
      iqr: iqr,
      variance: variance,
      sd: popSd,
      sampleSd: sampleSd(s),
      mad: mad(s),
      lo: lo,
      hi: hi,
      outliers: outliers,
      whiskerLow: whiskerLow,
      whiskerHigh: whiskerHigh,
      deviations: list.map(function (v) { return v - m; })
    };
  }

  function thresholdSummary(vals, target) {
    var list = Array.isArray(vals) ? vals : [];
    var total = list.length;
    var count = list.filter(function (v) { return v >= target - 1e-9; }).length;
    return {
      count: count,
      total: total,
      pct: total ? (count / total) * 100 : 0
    };
  }

  function simulateSeason(mu, sigma, games, rng) {
    var rand = typeof rng === 'function' ? rng : Math.random;
    var out = [];
    for (var i = 0; i < games; i += 1) {
      var u1 = Math.max(1e-7, rand());
      var u2 = rand();
      var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      var score = Math.max(0, Math.min(25, Math.round((mu + sigma * z) * 2) / 2));
      out.push(score);
    }
    return out;
  }

  function erf(x) {
    var s = x < 0 ? -1 : 1;
    var ax = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * ax);
    return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax));
  }

  function normalPdf(x, mu, sigma) {
    if (!sigma || sigma <= 0) return 0;
    var z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
  }

  function normalCdf(z) {
    return 0.5 * (1 + erf(z / Math.SQRT2));
  }

  function zScore(x, mu, sigma) {
    if (!sigma || sigma <= 0) return 0;
    return (x - mu) / sigma;
  }

  function evaluateMissions(vals, stats) {
    var st = stats || computeSpreadStats(vals);
    var items = [
      { id: 'tight', label: 'Tight cluster: shrink σ ≤ 0.8', done: st.sd <= 0.8 },
      { id: 'wide', label: 'Max spread: push σ ≥ 7.0', done: st.sd >= 7.0 },
      { id: 'outlier-iqr', label: 'Outlier test: red outlier with IQR ≤ 2.5', done: st.outliers.length >= 1 && st.iqr <= 2.5 },
      { id: 'same-mean-wide', label: 'Mean ≈ 10 (9.5–10.5) with σ ≥ 5.5', done: Math.abs(st.mean - 10) <= 0.5 && st.sd >= 5.5 }
    ];
    var doneCount = items.filter(function (m) { return m.done; }).length;
    return { items: items, doneCount: doneCount, total: items.length };
  }

  function f2(x, d) {
    return (Math.abs(x) < 0.0005 ? 0 : x).toFixed(d == null ? 2 : d).replace(/\.?0+$/, '');
  }

  return {
    PRESETS: PRESETS,
    NORMALIZED_Z: NORMALIZED_Z,
    mean: mean,
    sd: sd,
    sampleSd: sampleSd,
    mad: mad,
    median: median,
    teamValues: teamValues,
    computeSpreadStats: computeSpreadStats,
    thresholdSummary: thresholdSummary,
    simulateSeason: simulateSeason,
    erf: erf,
    normalPdf: normalPdf,
    normalCdf: normalCdf,
    zScore: zScore,
    evaluateMissions: evaluateMissions,
    f2: f2
  };
}));
