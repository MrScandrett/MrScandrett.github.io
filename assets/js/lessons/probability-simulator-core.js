(function (global, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    global.ProbabilitySimulatorCore = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  var CHECKPOINT_SEEDS = [10, 20, 50, 100, 250, 500, 1000, 2500, 5000];

  function weightedSample(weights, rng) {
    var rand = typeof rng === 'function' ? rng : Math.random;
    var roll = rand();
    var total = 0;
    for (var i = 0; i < weights.length; i += 1) {
      total += weights[i];
      if (roll < total) return i;
    }
    return weights.length - 1;
  }

  function createExperiment(definition) {
    var outcomes = definition.outcomes.map(function (outcome, index) {
      return {
        key: outcome.key,
        label: outcome.label,
        weight: outcome.weight,
        color: outcome.color || '#f59e0b',
        index: index,
        icon: outcome.icon || '',
        short: outcome.short || outcome.label,
        meta: outcome.meta || {}
      };
    });

    var trackedIndex = outcomes.findIndex(function (outcome) {
      return outcome.key === definition.trackedEvent;
    });
    if (trackedIndex < 0) trackedIndex = 0;

    return {
      id: definition.id,
      label: definition.label,
      family: definition.family,
      description: definition.description,
      modelNote: definition.modelNote || definition.description,
      supportsWithoutReplacement: Boolean(definition.poolCounts && definition.poolCounts.length === outcomes.length),
      poolCounts: definition.poolCounts ? definition.poolCounts.slice() : null,
      outcomes: outcomes,
      trackedEvent: definition.trackedEvent || outcomes[trackedIndex].key,
      trackedIndex: trackedIndex,
      expectedProbability: typeof definition.expectedProbability === 'number'
        ? definition.expectedProbability
        : outcomes[trackedIndex].weight,
      runTrial: definition.runTrial || function (rng) {
        return { outcomeIndex: weightedSample(outcomes.map(function (o) { return o.weight; }), rng) };
      }
    };
  }

  function buildPresetExperiments() {
    return {
      coin: createExperiment({
        id: 'coin',
        label: 'Coin flips',
        family: 'binary',
        trackedEvent: 'heads',
        expectedProbability: 0.5,
        description: 'A fair coin has two equally likely outcomes, so heads is expected about half the time in the long run.',
        outcomes: [
          { key: 'heads', label: 'Heads', weight: 0.5, color: '#f59e0b', short: 'H' },
          { key: 'tails', label: 'Tails', weight: 0.5, color: '#cbd5e1', short: 'T' }
        ]
      }),
      die: createExperiment({
        id: 'die',
        label: 'Dice rolls',
        family: 'rolling',
        trackedEvent: '6',
        expectedProbability: 1 / 6,
        description: 'A fair die gives each face the same probability, so one chosen face like 6 appears about one sixth of the time.',
        outcomes: ['1', '2', '3', '4', '5', '6'].map(function (face, index) {
          return { key: face, label: face, weight: 1 / 6, color: index === 5 ? '#f59e0b' : '#94a3b8', meta: { face: face } };
        })
      }),
      'card-suit': createExperiment({
        id: 'card-suit',
        label: 'Card suit draws',
        family: 'draw',
        trackedEvent: 'hearts',
        expectedProbability: 0.25,
        poolCounts: [13, 13, 13, 13],
        description: 'Each suit has 13 cards in a 52-card deck, so hearts settle near one quarter of all draws.',
        modelNote: 'Toggle replacement below: with replacement keeps P(♥) = 13/52 every draw; without replacement depletes the 52-card deck and reshuffles when empty.',
        outcomes: [
          { key: 'hearts', label: 'Hearts', weight: 0.25, color: '#ef4444', short: '♥', meta: { symbol: '♥' } },
          { key: 'diamonds', label: 'Diamonds', weight: 0.25, color: '#fb7185', short: '♦', meta: { symbol: '♦' } },
          { key: 'clubs', label: 'Clubs', weight: 0.25, color: '#cbd5e1', short: '♣', meta: { symbol: '♣' } },
          { key: 'spades', label: 'Spades', weight: 0.25, color: '#94a3b8', short: '♠', meta: { symbol: '♠' } }
        ]
      }),
      'card-red': createExperiment({
        id: 'card-red',
        label: 'Card draw: red card',
        family: 'binary',
        trackedEvent: 'red',
        expectedProbability: 0.5,
        poolCounts: [26, 26],
        description: 'A standard deck has 26 red cards and 26 black cards, so the long-run rate moves toward one half.',
        modelNote: 'With replacement keeps the denominator 52 every draw. Without replacement tracks all 52 cards until the deck empties and reshuffles.',
        outcomes: [
          { key: 'red', label: 'Red', weight: 0.5, color: '#ef4444', short: 'Red' },
          { key: 'black', label: 'Black', weight: 0.5, color: '#94a3b8', short: 'Black' }
        ]
      }),
      'card-face': createExperiment({
        id: 'card-face',
        label: 'Card draw: face card',
        family: 'binary',
        trackedEvent: 'face',
        expectedProbability: 12 / 52,
        poolCounts: [12, 40],
        description: 'There are 12 face cards in a 52-card deck (23.1%), fewer than many students first expect.',
        modelNote: 'Switch between replacement and no-replacement to see how drawing from a finite 52-card deck behaves over short vs. long runs.',
        outcomes: [
          { key: 'face', label: 'Face card', weight: 12 / 52, color: '#8b5cf6', short: 'JQK' },
          { key: 'not-face', label: 'Not face card', weight: 40 / 52, color: '#cbd5e1', short: 'Other' }
        ]
      }),
      'biased-coin': createExperiment({
        id: 'biased-coin',
        label: 'Loaded coin',
        family: 'binary',
        trackedEvent: 'heads',
        expectedProbability: 0.6,
        description: 'This coin is not fair: heads has a 60% chance, showing how more trials reveal bias instead of averaging to 50%.',
        outcomes: [
          { key: 'heads', label: 'Heads', weight: 0.6, color: '#f59e0b', short: 'H' },
          { key: 'tails', label: 'Tails', weight: 0.4, color: '#cbd5e1', short: 'T' }
        ]
      }),
      'spinner-equal': createExperiment({
        id: 'spinner-equal',
        label: 'Equal spinner',
        family: 'rotational',
        trackedEvent: 'red',
        expectedProbability: 0.25,
        description: 'An equal spinner gives each color the same share, making it a clear visual model for one-fourth probabilities.',
        outcomes: [
          { key: 'red', label: 'Red', weight: 0.25, color: '#ef4444' },
          { key: 'blue', label: 'Blue', weight: 0.25, color: '#3b82f6' },
          { key: 'green', label: 'Green', weight: 0.25, color: '#22c55e' },
          { key: 'yellow', label: 'Yellow', weight: 0.25, color: '#eab308' }
        ]
      }),
      'spinner-unequal': createExperiment({
        id: 'spinner-unequal',
        label: 'Unequal spinner',
        family: 'rotational',
        trackedEvent: 'red',
        expectedProbability: 0.5,
        description: 'This spinner is weighted by slice size: red is one half, blue one fourth, and green and yellow one eighth each.',
        outcomes: [
          { key: 'red', label: 'Red', weight: 0.5, color: '#ef4444' },
          { key: 'blue', label: 'Blue', weight: 0.25, color: '#3b82f6' },
          { key: 'green', label: 'Green', weight: 0.125, color: '#22c55e' },
          { key: 'yellow', label: 'Yellow', weight: 0.125, color: '#eab308' }
        ]
      }),
      marbles: createExperiment({
        id: 'marbles',
        label: 'Marble bag',
        family: 'draw-set',
        trackedEvent: 'red',
        expectedProbability: 0.5,
        poolCounts: [3, 2, 1],
        description: 'This bag holds 3 red, 2 blue, and 1 green marble, linking ratios to chance.',
        modelNote: 'Try without replacement: pulling all 6 marbles out of the bag without putting them back gives exact 3/2/1 counts every full bag!',
        outcomes: [
          { key: 'red', label: 'Red', weight: 3 / 6, color: '#ef4444' },
          { key: 'blue', label: 'Blue', weight: 2 / 6, color: '#3b82f6' },
          { key: 'green', label: 'Green', weight: 1 / 6, color: '#22c55e' }
        ]
      }),
      weather: createExperiment({
        id: 'weather',
        label: 'Weather model',
        family: 'binary',
        trackedEvent: 'sunny',
        expectedProbability: 0.5,
        description: 'A simple forecast model shows how probability can describe real-world systems, not just games or cards.',
        outcomes: [
          { key: 'sunny', label: 'Sunny', weight: 0.5, color: '#f59e0b', icon: '☀️' },
          { key: 'cloudy', label: 'Cloudy', weight: 0.3, color: '#94a3b8', icon: '☁️' },
          { key: 'rainy', label: 'Rainy', weight: 0.2, color: '#38bdf8', icon: '🌧️' }
        ]
      }),
      'two-dice-sum': createExperiment({
        id: 'two-dice-sum',
        label: 'Two dice sums',
        family: 'rolling-pair',
        trackedEvent: '7',
        expectedProbability: 6 / 36,
        description: 'Two-dice sums are not equally likely. Seven has 6 combinations out of 36, making it the peak of the distribution.',
        outcomes: ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(function (sum) {
          var counts = { '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 5, '9': 4, '10': 3, '11': 2, '12': 1 };
          return { key: sum, label: sum, weight: counts[sum] / 36, color: sum === '7' ? '#f59e0b' : '#cbd5e1', meta: { sum: sum } };
        }),
        runTrial: function (rng) {
          var rand = typeof rng === 'function' ? rng : Math.random;
          var first = Math.floor(rand() * 6) + 1;
          var second = Math.floor(rand() * 6) + 1;
          return { outcomeIndex: (first + second) - 2, meta: { dice: [first, second], sum: first + second } };
        }
      })
    };
  }

  var PRESET_EXPERIMENTS = buildPresetExperiments();
  var CUSTOM_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#f97316', '#06b6d4', '#f43f5e'];

  function buildCustomExperiment(rows, trackedIndex, visual) {
    if (!Array.isArray(rows) || rows.length < 2) {
      return { ok: false, experiment: null, error: 'Add at least two outcomes before applying a custom model.' };
    }
    if (rows.length > 8) {
      return { ok: false, experiment: null, error: 'Keep the custom model to eight outcomes or fewer so the visualization stays readable.' };
    }

    var parsed = [];
    for (var i = 0; i < rows.length; i += 1) {
      var label = String(rows[i].label || '').trim();
      var weight = Number(rows[i].weight);
      if (!label) {
        return { ok: false, experiment: null, error: 'Every outcome needs a label so students can interpret the event space clearly.' };
      }
      if (!isFinite(weight) || weight <= 0 || Math.floor(weight) !== weight) {
        return { ok: false, experiment: null, error: 'Use whole-number weights like 3 and 7 instead of decimals or zeros.' };
      }
      parsed.push({
        key: 'custom-' + i,
        label: label,
        rawWeight: weight,
        color: CUSTOM_COLORS[i % CUSTOM_COLORS.length],
        short: label.slice(0, 10)
      });
    }

    if (visual === 'coin' && parsed.length !== 2) {
      return { ok: false, experiment: null, error: 'Coin visualization works only with exactly two outcomes. Use spinner or marble bag for three or more.' };
    }

    var totalWeight = parsed.reduce(function (sum, item) { return sum + item.rawWeight; }, 0);
    var safeTracked = Math.max(0, Math.min(Number(trackedIndex) || 0, parsed.length - 1));
    var normalized = parsed.map(function (item) {
      return {
        key: item.key,
        label: item.label,
        weight: item.rawWeight / totalWeight,
        color: item.color,
        short: item.short
      };
    });

    var family = visual === 'coin' ? 'binary' : (visual === 'marbles' ? 'draw-set' : 'rotational');
    var trackedOutcome = normalized[safeTracked];
    var rawTracked = parsed[safeTracked].rawWeight;

    var experiment = createExperiment({
      id: 'custom-model',
      label: 'Custom model',
      family: family,
      trackedEvent: trackedOutcome.key,
      expectedProbability: trackedOutcome.weight,
      poolCounts: visual === 'marbles' ? parsed.map(function (p) { return p.rawWeight; }) : null,
      description: 'Student-defined model built from weighted outcomes.',
      modelNote: 'This custom model converts whole-number weights into probabilities by dividing by the total (' +
        totalWeight + '). Tracked event: ' + trackedOutcome.label + ' = ' + rawTracked + '/' + totalWeight + '.',
      outcomes: normalized
    });

    return { ok: true, experiment: experiment, error: '' };
  }

  function createMysteryCoin(rng) {
    var rand = typeof rng === 'function' ? rng : Math.random;
    var candidates = [
      { p: 0.50, isFair: true, label: 'Fair Mystery Coin (p = 0.50)' },
      { p: 0.35, isFair: false, label: 'Loaded Mystery Coin (p = 0.35 Heads)' },
      { p: 0.68, isFair: false, label: 'Loaded Mystery Coin (p = 0.68 Heads)' }
    ];
    var pick = candidates[Math.floor(rand() * candidates.length) % candidates.length];
    var experiment = createExperiment({
      id: 'mystery-coin',
      label: 'Mystery coin challenge',
      family: 'binary',
      trackedEvent: 'heads',
      expectedProbability: pick.p,
      description: 'Run small or large batches to gather evidence: is this coin fair (50%) or loaded?',
      modelNote: 'Mystery Coin active: the true probability p is hidden until you submit your verdict!',
      outcomes: [
        { key: 'heads', label: 'Heads', weight: pick.p, color: '#f59e0b', short: 'H' },
        { key: 'tails', label: 'Tails', weight: 1 - pick.p, color: '#cbd5e1', short: 'T' }
      ]
    });
    return {
      experiment: experiment,
      trueP: pick.p,
      isFair: pick.isFair,
      revealLabel: pick.label
    };
  }

  function createRunState(config, opts) {
    opts = opts || {};
    var trackedIndex = typeof opts.trackedIndex === 'number'
      ? Math.max(0, Math.min(config.outcomes.length - 1, opts.trackedIndex))
      : config.trackedIndex;
    var useNoReplace = Boolean(opts.withoutReplacement && config.supportsWithoutReplacement && config.poolCounts);
    var pool = useNoReplace ? config.poolCounts.slice() : null;
    var totalRemaining = pool ? pool.reduce(function (a, b) { return a + b; }, 0) : 0;

    return {
      config: config,
      trackedIndex: trackedIndex,
      withoutReplacement: useNoReplace,
      pool: pool,
      totalRemaining: totalRemaining,
      reshuffles: 0,
      counts: new Array(config.outcomes.length).fill(0),
      history: [],
      trials: 0,
      eventHits: 0,
      eventSeries: [],
      checkpoints: [],
      currentHitStreak: 0,
      longestHitStreak: 0,
      currentMissStreak: 0,
      longestMissStreak: 0,
      afterMissStreakTrials: 0,
      afterMissStreakHits: 0,
      lastTrial: null
    };
  }

  function drawFromPool(state, rng) {
    var rand = typeof rng === 'function' ? rng : Math.random;
    if (state.totalRemaining <= 0) {
      state.pool = state.config.poolCounts.slice();
      state.totalRemaining = state.pool.reduce(function (a, b) { return a + b; }, 0);
      state.reshuffles += 1;
    }
    var pick = Math.floor(rand() * state.totalRemaining);
    var acc = 0;
    for (var i = 0; i < state.pool.length; i += 1) {
      acc += state.pool[i];
      if (pick < acc) {
        state.pool[i] -= 1;
        state.totalRemaining -= 1;
        return { outcomeIndex: i, meta: {} };
      }
    }
    var fallback = state.pool.length - 1;
    state.pool[fallback] -= 1;
    state.totalRemaining -= 1;
    return { outcomeIndex: fallback, meta: {} };
  }

  function rebuildTrackedMetrics(state) {
    state.eventHits = 0;
    state.eventSeries = [];
    state.checkpoints = [];
    state.currentHitStreak = 0;
    state.longestHitStreak = 0;
    state.currentMissStreak = 0;
    state.longestMissStreak = 0;
    state.afterMissStreakTrials = 0;
    state.afterMissStreakHits = 0;

    var seedSet = {};
    CHECKPOINT_SEEDS.forEach(function (s) { seedSet[s] = true; });

    for (var i = 0; i < state.history.length; i += 1) {
      var trialNum = i + 1;
      var outcomeIdx = state.history[i];
      var isHit = outcomeIdx === state.trackedIndex;

      if (state.currentMissStreak >= 3) {
        state.afterMissStreakTrials += 1;
        if (isHit) state.afterMissStreakHits += 1;
      }

      if (isHit) {
        state.eventHits += 1;
        state.currentHitStreak += 1;
        if (state.currentHitStreak > state.longestHitStreak) state.longestHitStreak = state.currentHitStreak;
        state.currentMissStreak = 0;
      } else {
        state.currentMissStreak += 1;
        if (state.currentMissStreak > state.longestMissStreak) state.longestMissStreak = state.currentMissStreak;
        state.currentHitStreak = 0;
      }

      var obs = state.eventHits / trialNum;
      state.eventSeries.push({ trial: trialNum, observed: obs });
      if (seedSet[trialNum]) {
        state.checkpoints.push({ trial: trialNum, observed: obs });
      }
    }

    if (state.trials > 0 && !seedSet[state.trials]) {
      state.checkpoints.push({ trial: state.trials, observed: state.eventHits / state.trials });
    }
  }

  function setTrackedIndex(state, newIndex) {
    var clamped = Math.max(0, Math.min(state.config.outcomes.length - 1, Number(newIndex) || 0));
    state.trackedIndex = clamped;
    rebuildTrackedMetrics(state);
    return state;
  }

  function stepTrials(state, count, rng) {
    var steps = Math.max(1, Math.floor(Number(count) || 1));
    var seedSet = {};
    CHECKPOINT_SEEDS.forEach(function (s) { seedSet[s] = true; });

    // Remove trailing non-seed final checkpoint if continuing cumulatively
    if (state.checkpoints.length && !seedSet[state.checkpoints[state.checkpoints.length - 1].trial]) {
      state.checkpoints.pop();
    }

    for (var i = 0; i < steps; i += 1) {
      var trial = state.withoutReplacement && state.pool
        ? drawFromPool(state, rng)
        : state.config.runTrial(rng);
      var idx = trial.outcomeIndex;
      state.trials += 1;
      state.counts[idx] += 1;
      state.history.push(idx);
      state.lastTrial = { outcomeIndex: idx, meta: trial.meta || {} };

      var isHit = idx === state.trackedIndex;
      if (state.currentMissStreak >= 3) {
        state.afterMissStreakTrials += 1;
        if (isHit) state.afterMissStreakHits += 1;
      }
      if (isHit) {
        state.eventHits += 1;
        state.currentHitStreak += 1;
        if (state.currentHitStreak > state.longestHitStreak) state.longestHitStreak = state.currentHitStreak;
        state.currentMissStreak = 0;
      } else {
        state.currentMissStreak += 1;
        if (state.currentMissStreak > state.longestMissStreak) state.longestMissStreak = state.currentMissStreak;
        state.currentHitStreak = 0;
      }

      var observed = state.eventHits / state.trials;
      state.eventSeries.push({ trial: state.trials, observed: observed });
      if (seedSet[state.trials]) {
        state.checkpoints.push({ trial: state.trials, observed: observed });
      }
    }

    if (state.trials > 0 && !seedSet[state.trials]) {
      state.checkpoints.push({ trial: state.trials, observed: state.eventHits / state.trials });
    }
    return state;
  }

  function standardError(p, n) {
    if (!n || n <= 0) return 0;
    return Math.sqrt(Math.max(0, p * (1 - p)) / n);
  }

  function errorBand(p, n) {
    var se = standardError(p, n);
    return {
      se: se,
      lo: Math.max(0, p - 2 * se),
      hi: Math.min(1, p + 2 * se)
    };
  }

  function sampleSeriesByTrial(series, maxPoints) {
    var limit = maxPoints || 140;
    if (!Array.isArray(series) || series.length <= limit) return series ? series.slice() : [];
    var out = [];
    var lastIdx = series.length - 1;
    for (var i = 0; i < limit; i += 1) {
      var idx = Math.round((i / (limit - 1)) * lastIdx);
      if (!out.length || out[out.length - 1].trial !== series[idx].trial) {
        out.push(series[idx]);
      }
    }
    if (out[out.length - 1].trial !== series[lastIdx].trial) {
      out.push(series[lastIdx]);
    }
    return out;
  }

  var PRACTICE_QUESTIONS = [
    {
      id: 'ps-q1',
      prompt: '1. Theoretical Probability: A bag holds 3 red, 2 blue, and 1 green marble. As a percentage rounded to the nearest whole number, what is P(Red)?',
      answer: 50,
      tolerance: 0.5,
      hint: 'Count red marbles (3) divided by total marbles (6), then multiply by 100.',
      explain: '3 / 6 = 0.5 = 50%.'
    },
    {
      id: 'ps-q2',
      prompt: '2. Experimental Probability: If you flip a coin 40 times and get 26 heads, what is the experimental percentage of heads?',
      answer: 65,
      tolerance: 0.5,
      hint: 'Compute (26 ÷ 40) × 100.',
      explain: '26 / 40 = 0.65 = 65%.'
    },
    {
      id: 'ps-q3',
      prompt: '3. Gambler\'s Fallacy: A fair coin just landed Heads 5 times in a row. What is the percent probability of Heads on flip #6?',
      answer: 50,
      tolerance: 0.1,
      hint: 'Coins have no memory — each flip is independent.',
      explain: 'Still 50%! Past flips do not change the next independent flip.'
    },
    {
      id: 'ps-q4',
      prompt: '4. Two Dice Sums: Out of 36 equally likely pairs on two fair dice, 6 pairs sum to 7. What percentage of rolls sum to 7 (to 1 decimal place)?',
      answer: 16.7,
      tolerance: 0.2,
      hint: 'Compute (6 ÷ 36) × 100.',
      explain: '6 / 36 = 1/6 ≈ 16.7%.'
    },
    {
      id: 'ps-q5',
      prompt: '5. Error Scaling (1/√N): To cut your random margin of error in half, you must multiply your number of trials by what factor?',
      answer: 4,
      tolerance: 0.01,
      hint: 'Since SE shrinks with √N, √4 = 2 cuts SE in half.',
      explain: '4× as many trials shrinks standard error by √4 = 2×.'
    }
  ];

  return {
    PRESET_EXPERIMENTS: PRESET_EXPERIMENTS,
    PRACTICE_QUESTIONS: PRACTICE_QUESTIONS,
    weightedSample: weightedSample,
    createExperiment: createExperiment,
    buildCustomExperiment: buildCustomExperiment,
    createMysteryCoin: createMysteryCoin,
    createRunState: createRunState,
    setTrackedIndex: setTrackedIndex,
    stepTrials: stepTrials,
    standardError: standardError,
    errorBand: errorBand,
    sampleSeriesByTrial: sampleSeriesByTrial
  };
}));
