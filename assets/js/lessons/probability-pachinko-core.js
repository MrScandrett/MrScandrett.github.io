(function (global, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    global.PachinkoCore = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  var SCENARIOS = {
    fair: {
      key: 'fair',
      p: 0.50,
      title: 'Fair Galton board',
      shortLabel: 'Fair (p = 0.50)',
      note: 'A fair board uses the same probability (p = 0.50) for left and right at every peg. Center bins have far more valid paths, so they fill most often.'
    },
    left: {
      key: 'left',
      p: 0.35,
      title: 'Left-tilted board',
      shortLabel: 'Left bias (p = 0.35)',
      note: 'Each peg nudges balls left 65% of the time and right 35% of the time. The mound shifts left; small samples can hide it, while large samples reveal it.'
    },
    right: {
      key: 'right',
      p: 0.65,
      title: 'Right-tilted board',
      shortLabel: 'Right bias (p = 0.65)',
      note: 'Each peg nudges balls right 65% of the time. Notice how the theoretical peak and mean move cleanly from row/2 toward 0.65 × rows.'
    },
    center: {
      key: 'center',
      p: 0.50,
      title: 'Center-friendly board',
      shortLabel: 'Center funnel',
      note: 'Outer pegs gently steer balls back toward the middle. Notice the exact expected curve becomes taller and narrower than a standard binomial board.'
    },
    edge: {
      key: 'edge',
      p: 0.50,
      title: 'Edge challenge board',
      shortLabel: 'Edge push',
      note: 'Once a ball drifts from center, outer pegs push it farther toward the edges—flattening or even splitting the mound compared with a fair board.'
    },
    random: {
      key: 'random',
      p: 0.50,
      title: 'Uneven peg board',
      shortLabel: 'Uneven rows',
      note: 'Alternating rows lean slightly left or right, simulating uneven manufacturing tolerances. Exact Markov probabilities capture the shift row by row.'
    },
    custom: {
      key: 'custom',
      p: 0.50,
      title: 'Custom board',
      shortLabel: 'Custom tilt',
      note: 'Custom right-bounce probability and/or hand-tilted pegs. Click any peg on the board to tilt it left or right and watch the exact distribution adapt.'
    }
  };

  var EV_PRESETS = {
    off: {
      key: 'off',
      label: 'Off (counts only)',
      note: 'Counts only—no point values assigned to bins.'
    },
    'edge-jackpot': {
      key: 'edge-jackpot',
      label: 'Edge Jackpot (+500 edges, 0 mid)',
      note: 'Far edges pay +500 pts, adjacent +100, next +20, and the middle bins pay 0. Flashy edge prizes look tempting, yet most balls land in the 0-point middle.'
    },
    'center-target': {
      key: 'center-target',
      label: 'Center Target (+100 mid, 0 edges)',
      note: 'Highest points sit in the center bins and drop smoothly toward 0 at the edges, aligning high payoffs with the most frequent paths.'
    },
    graded: {
      key: 'graded',
      label: 'Linear Ramp (0 to 10·n)',
      note: 'Each bin pays 10 × bin index. Because expectation is linear, theoretical EV equals 10 × expected mean bin.'
    },
    carnival: {
      key: 'carnival',
      label: 'Carnival House Edge (-10 mid, +250 edge)',
      note: 'Middle bins lose 10 pts while outer bins pay +15, +50, and +250. Compare the theoretical expected value per ball against lucky small-sample runs.'
    }
  };

  function pegKey(row, col) {
    return row + ',' + col;
  }

  function pegProbability(config, row, col) {
    var rows = Math.max(1, Number(config && config.rows) || 10);
    var scenarioKey = (config && config.scenario && SCENARIOS[config.scenario]) ? config.scenario : 'fair';
    var baseP = typeof (config && config.baseP) === 'number' && isFinite(config.baseP)
      ? clamp(config.baseP, 0.05, 0.95)
      : SCENARIOS[scenarioKey].p;

    var overrides = config && config.pegOverrides;
    if (overrides) {
      var override = overrides[pegKey(row, col)];
      if (override === 'right') return 0.85;
      if (override === 'left') return 0.15;
    }

    if (scenarioKey === 'center') {
      var drift = (col - row / 2) / rows;
      return clamp(baseP - drift * 0.45, 0.15, 0.85);
    }
    if (scenarioKey === 'edge') {
      var edgeDrift = (col - row / 2) / rows;
      return clamp(baseP + edgeDrift * 0.42, 0.15, 0.85);
    }
    if (scenarioKey === 'random') {
      return clamp(baseP + Math.sin((row + 1) * 1.7) * 0.14, 0.18, 0.82);
    }
    return baseP;
  }

  function combination(n, k) {
    if (k < 0 || k > n) return 0;
    k = Math.min(k, n - k);
    var result = 1;
    for (var i = 1; i <= k; i += 1) {
      result = result * (n - k + i) / i;
    }
    return Math.round(result);
  }

  function computePascalTriangle(rows) {
    var rMax = Math.max(0, Math.floor(Number(rows) || 0));
    var triangle = [];
    for (var r = 0; r <= rMax; r += 1) {
      var rowArr = new Array(r + 1);
      rowArr[0] = 1;
      rowArr[r] = 1;
      for (var c = 1; c < r; c += 1) {
        rowArr[c] = triangle[r - 1][c - 1] + triangle[r - 1][c];
      }
      triangle.push(rowArr);
    }
    return triangle;
  }

  function computeExpectedDistribution(config) {
    var rows = Math.max(1, Math.floor(Number(config && config.rows) || 10));
    var dp = [[1]];
    for (var row = 0; row < rows; row += 1) {
      var current = dp[row];
      var next = new Array(row + 2).fill(0);
      for (var col = 0; col <= row; col += 1) {
        var visitProb = current[col];
        if (!visitProb) continue;
        var pRight = pegProbability(config, row, col);
        next[col] += visitProb * (1 - pRight);
        next[col + 1] += visitProb * pRight;
      }
      dp.push(next);
    }

    var probs = dp[rows];
    var mean = 0;
    var modeBin = 0;
    for (var k = 0; k < probs.length; k += 1) {
      mean += k * probs[k];
      if (probs[k] > probs[modeBin]) modeBin = k;
    }
    var variance = 0;
    for (var j = 0; j < probs.length; j += 1) {
      var diff = j - mean;
      variance += probs[j] * diff * diff;
    }
    var sd = Math.sqrt(Math.max(0, variance));
    return {
      probs: probs,
      mean: mean,
      variance: variance,
      sd: sd,
      modeBin: modeBin,
      pegVisitProbs: dp
    };
  }

  function normalPdf(x, mean, sd) {
    if (!sd || sd <= 1e-6) return 0;
    var z = (x - mean) / sd;
    return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
  }

  function simulateBall(config, rng) {
    var rand = typeof rng === 'function' ? rng : Math.random;
    var rows = Math.max(1, Math.floor(Number(config && config.rows) || 10));
    var rights = 0;
    var path = [0];
    var choices = [];
    for (var row = 0; row < rows; row += 1) {
      var p = pegProbability(config, row, rights);
      if (rand() < p) {
        rights += 1;
        choices.push('R');
      } else {
        choices.push('L');
      }
      path.push(rights);
    }
    return { bin: rights, path: path, choices: choices };
  }

  function buildBinValues(rows, presetKey) {
    var n = Math.max(1, Math.floor(Number(rows) || 10));
    if (!presetKey || presetKey === 'off' || !EV_PRESETS[presetKey]) return null;
    var values = new Array(n + 1).fill(0);
    var mid = n / 2;
    for (var k = 0; k <= n; k += 1) {
      var distFromEdge = Math.min(k, n - k);
      if (presetKey === 'edge-jackpot') {
        if (distFromEdge === 0) values[k] = 500;
        else if (distFromEdge === 1) values[k] = 100;
        else if (distFromEdge === 2) values[k] = 20;
        else values[k] = 0;
      } else if (presetKey === 'center-target') {
        var normDist = Math.abs(k - mid) / Math.max(1, mid);
        values[k] = Math.round(100 * Math.max(0, 1 - normDist * normDist));
      } else if (presetKey === 'graded') {
        values[k] = k * 10;
      } else if (presetKey === 'carnival') {
        if (distFromEdge === 0) values[k] = 250;
        else if (distFromEdge === 1) values[k] = 50;
        else if (distFromEdge === 2) values[k] = 15;
        else values[k] = -10;
      }
    }
    return values;
  }

  function summarizeCounts(counts, expectedProbs, binValues, expectedStats) {
    var list = Array.isArray(counts) ? counts : [];
    var rows = Math.max(1, list.length - 1);
    var total = 0;
    var modeBin = 0;
    var modeCount = 0;
    var weighted = 0;

    for (var i = 0; i < list.length; i += 1) {
      var c = Number(list[i]) || 0;
      total += c;
      weighted += c * i;
      if (c > modeCount) {
        modeCount = c;
        modeBin = i;
      }
    }

    var mean = total ? weighted / total : null;
    var variance = null;
    var sd = null;
    if (total) {
      var sq = 0;
      for (var v = 0; v < list.length; v += 1) {
        var dv = v - mean;
        sq += (Number(list[v]) || 0) * dv * dv;
      }
      variance = sq / total;
      sd = Math.sqrt(variance);
    }

    var centerLow = Math.floor(rows / 2);
    var centerHigh = Math.ceil(rows / 2);
    var centerCount = (Number(list[centerLow]) || 0) + (centerHigh === centerLow ? 0 : (Number(list[centerHigh]) || 0));
    var centerShare = total ? centerCount / total : null;

    var maxGap = 0;
    var expProbs = Array.isArray(expectedProbs) ? expectedProbs : [];
    for (var b = 0; b < list.length; b += 1) {
      var obs = total ? (Number(list[b]) || 0) / total : 0;
      var exp = Number(expProbs[b]) || 0;
      maxGap = Math.max(maxGap, Math.abs(obs - exp));
    }

    var within1Sd = null;
    var within2Sd = null;
    if (total && expectedStats && expectedStats.sd > 0) {
      var c1 = 0;
      var c2 = 0;
      for (var sIdx = 0; sIdx < list.length; sIdx += 1) {
        var countAt = Number(list[sIdx]) || 0;
        var dist = Math.abs(sIdx - expectedStats.mean);
        if (dist <= expectedStats.sd) c1 += countAt;
        if (dist <= 2 * expectedStats.sd) c2 += countAt;
      }
      within1Sd = c1 / total;
      within2Sd = c2 / total;
    }

    var observedEV = null;
    var theoreticalEV = null;
    var totalScore = null;
    if (Array.isArray(binValues) && binValues.length === list.length) {
      var theoSum = 0;
      for (var e = 0; e < binValues.length; e += 1) {
        theoSum += (Number(expProbs[e]) || 0) * (Number(binValues[e]) || 0);
      }
      theoreticalEV = theoSum;
      if (total) {
        var obsSum = 0;
        for (var o = 0; o < binValues.length; o += 1) {
          obsSum += (Number(list[o]) || 0) * (Number(binValues[o]) || 0);
        }
        totalScore = obsSum;
        observedEV = obsSum / total;
      }
    }

    var fitLabel = 'Waiting for drops';
    if (total > 0 && total < 30) {
      fitLabel = 'Small sample (high scatter)';
    } else if (total >= 30 && expProbs.length === list.length) {
      var chi2 = 0;
      var usedBins = 0;
      for (var q = 0; q < list.length; q += 1) {
        var expCount = total * (Number(expProbs[q]) || 0);
        if (expCount >= 1) {
          var delta = (Number(list[q]) || 0) - expCount;
          chi2 += (delta * delta) / expCount;
          usedBins += 1;
        }
      }
      var df = Math.max(1, usedBins - 1);
      var ratio = chi2 / df;
      if (ratio <= 1.35) fitLabel = 'Close match to model';
      else if (ratio <= 2.2) fitLabel = 'Moderate random scatter';
      else fitLabel = 'Noticeable gap from model';
    }

    return {
      total: total,
      modeBin: total ? modeBin : null,
      modeCount: modeCount,
      mean: mean,
      variance: variance,
      sd: sd,
      centerShare: centerShare,
      maxGap: maxGap,
      within1Sd: within1Sd,
      within2Sd: within2Sd,
      observedEV: observedEV,
      theoreticalEV: theoreticalEV,
      totalScore: totalScore,
      fitLabel: fitLabel
    };
  }

  return {
    clamp: clamp,
    SCENARIOS: SCENARIOS,
    EV_PRESETS: EV_PRESETS,
    pegKey: pegKey,
    pegProbability: pegProbability,
    combination: combination,
    computePascalTriangle: computePascalTriangle,
    computeExpectedDistribution: computeExpectedDistribution,
    normalPdf: normalPdf,
    simulateBall: simulateBall,
    buildBinValues: buildBinValues,
    summarizeCounts: summarizeCounts
  };
}));
