// Rules for Lights Out, free of page code. A board is an array of n*n 0/1 values.
// Pressing a light toggles it and the lights directly above, below, left, and right.

export function neighborhood(n, i) {
  const r = Math.floor(i / n);
  const c = i % n;
  const cells = [i];
  if (r > 0) cells.push(i - n);
  if (r < n - 1) cells.push(i + n);
  if (c > 0) cells.push(i - 1);
  if (c < n - 1) cells.push(i + 1);
  return cells;
}

export function press(board, n, i) {
  const next = board.slice();
  for (const j of neighborhood(n, i)) next[j] ^= 1;
  return next;
}

export function isSolved(board) {
  return board.every((v) => v === 0);
}

// a puzzle made by pressing random buttons on a dark board, so it is always solvable
export function randomPuzzle(n, presses, random = Math.random) {
  let board = new Array(n * n).fill(0);
  for (let k = 0; k < presses; k += 1) board = press(board, n, Math.floor(random() * n * n));
  return isSolved(board) ? randomPuzzle(n, presses, random) : board;
}

// Solve by linear algebra over on/off arithmetic (1 + 1 = 0): each press is a
// column, the lights are the target, and Gaussian elimination finds which
// presses switch everything off. Order does not matter, and pressing twice
// cancels out, so a solution is just a set of buttons.
// Returns { presses: [indexes] } or null if the board cannot be solved, plus the rank.
export function solve(board, n) {
  const size = n * n;
  const rows = [];
  for (let light = 0; light < size; light += 1) {
    const row = new Array(size + 1).fill(0);
    for (let button = 0; button < size; button += 1) {
      if (neighborhood(n, button).includes(light)) row[button] = 1;
    }
    row[size] = board[light];
    rows.push(row);
  }
  const pivotCols = [];
  let r = 0;
  for (let col = 0; col < size && r < size; col += 1) {
    const pivot = rows.findIndex((row, i) => i >= r && row[col] === 1);
    if (pivot < 0) continue;
    [rows[r], rows[pivot]] = [rows[pivot], rows[r]];
    for (let i = 0; i < size; i += 1) {
      if (i !== r && rows[i][col] === 1) for (let k = col; k <= size; k += 1) rows[i][k] ^= rows[r][k];
    }
    pivotCols.push(col);
    r += 1;
  }
  const rank = r;
  for (let i = rank; i < size; i += 1) if (rows[i][size] === 1) return { presses: null, rank, solution: null, quiet: [] };
  const x = new Array(size).fill(0);
  pivotCols.forEach((col, i) => (x[col] = rows[i][size]));

  // Presses that change nothing at all ("quiet patterns"): one for each free
  // column. Adding any of them to a solution gives another solution.
  const quiet = [];
  for (let free = 0; free < size; free += 1) {
    if (pivotCols.includes(free)) continue;
    const q = new Array(size).fill(0);
    q[free] = 1;
    pivotCols.forEach((col, i) => (q[col] = rows[i][free]));
    quiet.push(q);
  }
  return { presses: x.flatMap((v, i) => (v ? [i] : [])), rank, solution: x, quiet };
}

// the solution with the fewest presses, trying every combination of quiet patterns
export function fewestPresses(board, n) {
  const { solution, quiet } = solve(board, n);
  if (!solution) return null;
  let best = null;
  for (let mask = 0; mask < 1 << quiet.length; mask += 1) {
    const x = solution.slice();
    quiet.forEach((q, k) => {
      if (mask & (1 << k)) q.forEach((v, i) => (x[i] ^= v));
    });
    const presses = x.flatMap((v, i) => (v ? [i] : []));
    if (!best || presses.length < best.length) best = presses;
  }
  return best;
}
