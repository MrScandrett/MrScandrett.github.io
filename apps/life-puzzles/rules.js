// Rules for Conway's Game of Life (1970), free of page code.
// A grid is an array of rows of 0/1. Cells beyond the edge count as dead.
//   - a live cell with 2 or 3 live neighbors survives
//   - a dead cell with exactly 3 live neighbors comes alive
//   - every other cell is dead in the next generation

export function emptyGrid(rows, cols) {
  return Array.from({ length: rows }, () => new Array(cols).fill(0));
}

export function neighbors(grid, r, c) {
  let count = 0;
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if ((dr || dc) && grid[r + dr]?.[c + dc]) count += 1;
    }
  }
  return count;
}

export function step(grid) {
  return grid.map((row, r) =>
    row.map((alive, c) => {
      const n = neighbors(grid, r, c);
      return n === 3 || (alive && n === 2) ? 1 : 0;
    })
  );
}

export function population(grid) {
  return grid.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0);
}

// live cells as a shape: coordinates relative to its top-left corner
export function shape(grid) {
  const cells = [];
  grid.forEach((row, r) => row.forEach((v, c) => v && cells.push([r, c])));
  if (!cells.length) return { cells: [], top: 0, left: 0, key: "" };
  const top = Math.min(...cells.map(([r]) => r));
  const left = Math.min(...cells.map(([, c]) => c));
  const rel = cells.map(([r, c]) => [r - top, c - left]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { cells: rel, top, left, key: rel.map((p) => p.join(":")).join(" ") };
}

// Period and drift of a pattern: returns { period, dr, dc } for the smallest
// period up to `maxPeriod` after which the pattern repeats (possibly moved), or null.
export function classify(grid, maxPeriod = 8) {
  const start = shape(grid);
  if (!start.cells.length) return null;
  let g = grid;
  for (let p = 1; p <= maxPeriod; p += 1) {
    g = step(g);
    const s = shape(g);
    if (s.key === start.key) return { period: p, dr: s.top - start.top, dc: s.left - start.left };
  }
  return null;
}

// the puzzles; each check gets the starting grid the player drew
export const PUZZLES = [
  {
    id: "still",
    title: "Still life",
    goal: "Draw a shape that never changes: it looks the same every generation.",
    hint: "Try a 2 × 2 square (the \"block\").",
    check: (grid) => {
      const k = classify(grid, 1);
      return Boolean(k && k.period === 1);
    },
  },
  {
    id: "blinker",
    title: "Oscillator",
    goal: "Draw a shape that changes, then returns to exactly how it started.",
    hint: "Three cells in a row flip between flat and upright: the \"blinker\".",
    check: (grid) => {
      const k = classify(grid, 8);
      return Boolean(k && k.period > 1 && k.dr === 0 && k.dc === 0);
    },
  },
  {
    id: "glider",
    title: "Spaceship",
    goal: "Draw a shape that repeats itself somewhere else: it travels across the grid.",
    hint: "The \"glider\" has 5 cells: a row of three, one cell above the right end, and one above that in the middle.",
    check: (grid) => {
      const k = classify(grid, 8);
      return Boolean(k && (k.dr !== 0 || k.dc !== 0));
    },
  },
  {
    id: "vanish",
    title: "Disappearing act",
    goal: "Draw at least 4 cells that all die out within 3 generations.",
    hint: "Cells with fewer than 2 neighbors die of loneliness. Spread them out, but not too far.",
    check: (grid) => {
      if (population(grid) < 4) return false;
      let g = grid;
      for (let i = 0; i < 3; i += 1) {
        g = step(g);
        if (!population(g)) return true;
      }
      return false;
    },
  },
];
