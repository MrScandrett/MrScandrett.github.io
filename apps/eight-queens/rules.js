// Rules for the N-Queens puzzle, kept free of any page code so tests can import them.
// A board is an array of queens, each { row, col }, on an n x n grid.

export function attacks(a, b) {
  return a.row === b.row || a.col === b.col || Math.abs(a.row - b.row) === Math.abs(a.col - b.col);
}

// every square a queen at (row, col) attacks, not counting its own square
export function attackedSquares(queen, n) {
  const squares = [];
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      if ((row !== queen.row || col !== queen.col) && attacks(queen, { row, col })) squares.push({ row, col });
    }
  }
  return squares;
}

// the pairs of queens that attack each other
export function conflicts(queens) {
  const pairs = [];
  for (let i = 0; i < queens.length; i += 1) {
    for (let j = i + 1; j < queens.length; j += 1) {
      if (attacks(queens[i], queens[j])) pairs.push([queens[i], queens[j]]);
    }
  }
  return pairs;
}

export function isSolution(queens, n) {
  return queens.length === n && conflicts(queens).length === 0;
}

// a solution as a string of column numbers, row by row (e.g. "15863724")
export function solutionKey(queens, n) {
  const cols = new Array(n).fill(-1);
  for (const q of queens) cols[q.row] = q.col;
  return cols.map((c) => c + 1).join(",");
}

// Backtracking, one row at a time. Yields a step for every placement and
// removal so the page can animate the search, and a "solution" step each time
// all n queens are placed.
export function* backtrack(n) {
  const cols = [];
  function* placeRow(row) {
    if (row === n) {
      yield { type: "solution", cols: cols.slice() };
      return;
    }
    for (let col = 0; col < n; col += 1) {
      const safe = cols.every((c, r) => c !== col && Math.abs(c - col) !== row - r);
      yield { type: safe ? "place" : "reject", row, col, cols: safe ? [...cols, col] : cols.slice() };
      if (!safe) continue;
      cols.push(col);
      yield* placeRow(row + 1);
      cols.pop();
      yield { type: "remove", row, col, cols: cols.slice() };
    }
  }
  yield* placeRow(0);
}

export function allSolutions(n) {
  const found = [];
  for (const step of backtrack(n)) if (step.type === "solution") found.push(step.cols);
  return found;
}

// solutions that are not rotations or reflections of each other
export function distinctSolutionCount(n) {
  const seen = new Set();
  let distinct = 0;
  for (const cols of allSolutions(n)) {
    const key = cols.join(",");
    if (seen.has(key)) continue;
    distinct += 1;
    for (const variant of symmetries(cols)) seen.add(variant.join(","));
  }
  return distinct;
}

function symmetries(cols) {
  const n = cols.length;
  const toCols = (cells) => {
    const out = new Array(n);
    for (const [r, c] of cells) out[r] = c;
    return out;
  };
  let cells = cols.map((c, r) => [r, c]);
  const variants = [];
  for (let turn = 0; turn < 4; turn += 1) {
    variants.push(toCols(cells));
    variants.push(toCols(cells.map(([r, c]) => [r, n - 1 - c]))); // mirror
    cells = cells.map(([r, c]) => [c, n - 1 - r]); // rotate 90 degrees
  }
  return variants;
}
