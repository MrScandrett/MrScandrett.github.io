(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.RobotRLEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const COLS = 12;
  const ROWS = 8;
  const ACTIONS = [
    [0, -1], // 0: up
    [1, 0],  // 1: right
    [0, 1],  // 2: down
    [-1, 0]  // 3: left
  ];
  const DIR_NAMES = ['Up', 'Right', 'Down', 'Left'];
  const EMPTY = 0;
  const WALL = 1;
  const PIT = 2;
  const GOAL = 3;

  const PRESETS = {
    default: {
      label: 'Classroom Default',
      start: { x: 0, y: ROWS - 1 },
      walls: [
        [3, 2], [3, 3], [3, 4], [3, 5],
        [7, 1], [7, 2], [7, 3], [7, 5], [7, 6], [7, 7],
        [5, 0], [5, 1]
      ],
      pits: [
        [5, 5], [5, 6], [9, 3], [9, 4], [10, 6]
      ],
      goals: [[10, 1]]
    },
    cliff: {
      label: 'Cliff Edge (Q vs SARSA)',
      start: { x: 0, y: ROWS - 1 },
      walls: [],
      pits: [
        [1, 7], [2, 7], [3, 7], [4, 7], [5, 7],
        [6, 7], [7, 7], [8, 7], [9, 7], [10, 7]
      ],
      goals: [[11, 7]]
    },
    bridge: {
      label: 'Narrow Bridge',
      start: { x: 1, y: 4 },
      walls: [
        [5, 0], [5, 1], [5, 2],
        [5, 5], [5, 6], [5, 7]
      ],
      pits: [
        [4, 2], [6, 2], [4, 5], [6, 5],
        [8, 1], [8, 6], [10, 4]
      ],
      goals: [[10, 2]]
    },
    spiral: {
      label: 'Spiral Maze',
      start: { x: 0, y: ROWS - 1 },
      walls: [
        [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6],
        [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1],
        [9, 2], [9, 3], [9, 4], [9, 5], [9, 6],
        [8, 6], [7, 6], [6, 6], [5, 6], [4, 6],
        [4, 5], [4, 4], [4, 3],
        [5, 3], [6, 3], [7, 3], [7, 4]
      ],
      pits: [[1, 1], [10, 0]],
      goals: [[6, 4]]
    }
  };

  /**
   * Build a typed grid world and start coordinate from a named preset.
   * @param {string} presetName
   */
  function createGrid(presetName) {
    const preset = PRESETS[presetName] || PRESETS.default;
    const grid = new Uint8Array(COLS * ROWS);
    preset.walls.forEach(([x, y]) => {
      if (x >= 0 && x < COLS && y >= 0 && y < ROWS) grid[y * COLS + x] = WALL;
    });
    preset.pits.forEach(([x, y]) => {
      if (x >= 0 && x < COLS && y >= 0 && y < ROWS) grid[y * COLS + x] = PIT;
    });
    preset.goals.forEach(([x, y]) => {
      if (x >= 0 && x < COLS && y >= 0 && y < ROWS) grid[y * COLS + x] = GOAL;
    });
    return {
      preset: PRESETS[presetName] ? presetName : 'default',
      grid,
      start: { x: preset.start.x, y: preset.start.y }
    };
  }

  function maxQ(Q, s) {
    const base = s * 4;
    let m = Q[base];
    for (let a = 1; a < 4; a++) {
      if (Q[base + a] > m) m = Q[base + a];
    }
    return m;
  }

  /**
   * Unbiased argmax over the 4 actions for state index s (breaks ties uniformly).
   * @param {ArrayLike<number>} Q
   * @param {number} s
   * @param {() => number} [rng]
   */
  function bestAction(Q, s, rng) {
    const rand = rng || Math.random;
    const base = s * 4;
    const bestVal = maxQ(Q, s);
    const tied = [];
    for (let a = 0; a < 4; a++) {
      if (Math.abs(Q[base + a] - bestVal) <= 1e-9) tied.push(a);
    }
    if (tied.length === 1) return tied[0];
    return tied[Math.floor(rand() * tied.length) % tied.length];
  }

  /**
   * Decay continuous epsilon without rounding stall.
   */
  function decayEpsilon(epsFloat, factor = 0.992, minEps = 0.02) {
    return Math.max(minEps, Number(epsFloat) * factor);
  }

  /**
   * Apply one grid transition including optional sideways wheel slip and reward/done check.
   */
  function stepTransition({ grid, x, y, a, slip = 0, stepCost = -0.01, cols = COLS, rows = ROWS, rng = Math.random }) {
    let act = a;
    if (slip > 0 && rng() < slip) {
      act = (a + (rng() < 0.5 ? 1 : 3)) % 4;
    }
    let nx = x + ACTIONS[act][0];
    let ny = y + ACTIONS[act][1];
    let reward = stepCost;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || grid[ny * cols + nx] === WALL) {
      nx = x;
      ny = y;
      reward = -0.1;
    }
    const kind = grid[ny * cols + nx];
    let done = false;
    if (kind === GOAL) {
      reward = 1;
      done = true;
    } else if (kind === PIT) {
      reward = -1;
      done = true;
    }
    return { nx, ny, act, reward, done, kind };
  }

  /**
   * Inspect learned Q-values for cell (x, y).
   */
  function inspectCellQ(Q, grid, x, y, cols = COLS) {
    const s = y * cols + x;
    const kind = grid[s];
    const base = s * 4;
    const q = [Q[base], Q[base + 1], Q[base + 2], Q[base + 3]];
    let bestIdx = 0;
    for (let i = 1; i < 4; i++) {
      if (q[i] > q[bestIdx]) bestIdx = i;
    }
    return {
      x,
      y,
      kind,
      q,
      bestIdx,
      bestName: DIR_NAMES[bestIdx],
      maxQ: q[bestIdx]
    };
  }

  return {
    COLS,
    ROWS,
    ACTIONS,
    DIR_NAMES,
    EMPTY,
    WALL,
    PIT,
    GOAL,
    PRESETS,
    createGrid,
    maxQ,
    bestAction,
    decayEpsilon,
    stepTransition,
    inspectCellQ
  };
});
