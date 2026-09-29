// Rules for Sudoku on a 4 x 4 grid (2 x 2 boxes) or a 9 x 9 grid (3 x 3 boxes),
// free of page code. A grid is an array of n*n numbers; 0 means empty.

export function boxSize(n) {
  return Math.sqrt(n);
}

// the cells that share a row, column, or box with cell i (not including i)
export function peers(n, i) {
  const b = boxSize(n);
  const r = Math.floor(i / n);
  const c = i % n;
  const br = r - (r % b);
  const bc = c - (c % b);
  const set = new Set();
  for (let k = 0; k < n; k += 1) {
    set.add(r * n + k);
    set.add(k * n + c);
  }
  for (let dr = 0; dr < b; dr += 1) for (let dc = 0; dc < b; dc += 1) set.add((br + dr) * n + bc + dc);
  set.delete(i);
  return [...set];
}

export function candidates(grid, n, i) {
  if (grid[i]) return [];
  const taken = new Set(peers(n, i).map((p) => grid[p]));
  return [...Array(n).keys()].map((v) => v + 1).filter((v) => !taken.has(v));
}

// cells whose number repeats in a row, column, or box
export function conflicts(grid, n) {
  const bad = new Set();
  grid.forEach((v, i) => {
    if (v && peers(n, i).some((p) => grid[p] === v)) bad.add(i);
  });
  return bad;
}

export function isComplete(grid, n) {
  return grid.every(Boolean) && conflicts(grid, n).size === 0;
}

// Backtracking: fill the emptiest-choice cell first. Counts up to `max` solutions.
export function countSolutions(grid, n, max = 2) {
  const g = grid.slice();
  let count = 0;
  let steps = 0;
  let first = null;
  (function search() {
    if (count >= max) return;
    let best = -1;
    let bestOptions = null;
    for (let i = 0; i < g.length; i += 1) {
      if (g[i]) continue;
      const options = candidates(g, n, i);
      if (!bestOptions || options.length < bestOptions.length) {
        best = i;
        bestOptions = options;
        if (options.length <= 1) break;
      }
    }
    if (best < 0) {
      count += 1;
      if (!first) first = g.slice();
      return;
    }
    for (const v of bestOptions) {
      steps += 1;
      g[best] = v;
      search();
      g[best] = 0;
      if (count >= max) return;
    }
  })();
  return { count, solution: first, steps };
}

export function solve(grid, n) {
  return countSolutions(grid, n, 1).solution;
}

// a random full grid, then clues removed while the answer stays unique
export function generate(n, clues, random = Math.random) {
  const empty = new Array(n * n).fill(0);
  const full = (function fill(g) {
    const i = g.indexOf(0);
    if (i < 0) return g;
    const options = candidates(g, n, i).sort(() => random() - 0.5);
    for (const v of options) {
      g[i] = v;
      const done = fill(g);
      if (done) return done;
    }
    g[i] = 0;
    return null;
  })(empty);
  const puzzle = full.slice();
  const order = [...puzzle.keys()].sort(() => random() - 0.5);
  let filled = n * n;
  for (const i of order) {
    if (filled <= clues) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, n, 2).count !== 1) puzzle[i] = keep;
    else filled -= 1;
  }
  return { puzzle, solution: full };
}

// how many different complete grids exist (used by tests; 4 x 4 only)
export function countGrids(n) {
  return countSolutions(new Array(n * n).fill(0), n, Infinity).count;
}
