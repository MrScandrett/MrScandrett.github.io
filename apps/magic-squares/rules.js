// Rules for magic squares, free of page code. A square is an array of n*n
// numbers (0 = empty), read row by row, using each of 1 .. n*n once.

export function magicSum(n) {
  return (n * (n * n + 1)) / 2;
}

// every line that must add up: rows, columns, and both diagonals
export function lines(n) {
  const out = [];
  for (let r = 0; r < n; r += 1) out.push({ name: `Row ${r + 1}`, cells: [...Array(n).keys()].map((c) => r * n + c) });
  for (let c = 0; c < n; c += 1) out.push({ name: `Column ${c + 1}`, cells: [...Array(n).keys()].map((r) => r * n + c) });
  out.push({ name: "Diagonal ↘", cells: [...Array(n).keys()].map((i) => i * n + i) });
  out.push({ name: "Diagonal ↙", cells: [...Array(n).keys()].map((i) => i * n + (n - 1 - i)) });
  return out;
}

export function lineSums(square, n) {
  return lines(n).map((line) => ({
    ...line,
    sum: line.cells.reduce((a, i) => a + square[i], 0),
    full: line.cells.every((i) => square[i] > 0),
  }));
}

export function isMagic(square, n) {
  const target = magicSum(n);
  const used = new Set(square.filter(Boolean));
  return used.size === n * n && lineSums(square, n).every((l) => l.sum === target);
}

// All magic squares of size n, by backtracking cell by cell and pruning any
// row or column that can no longer reach the magic sum (fast for 3 x 3).
export function allMagicSquares(n) {
  const target = magicSum(n);
  const size = n * n;
  const square = new Array(size).fill(0);
  const used = new Array(size + 1).fill(false);
  const found = [];
  (function fill(i) {
    if (i === size) {
      if (isMagic(square, n)) found.push(square.slice());
      return;
    }
    const r = Math.floor(i / n);
    const c = i % n;
    for (let v = 1; v <= size; v += 1) {
      if (used[v]) continue;
      square[i] = v;
      if (c === n - 1 && rowSum(square, n, r) !== target) continue;
      if (r === n - 1 && colSum(square, n, c) !== target) continue;
      used[v] = true;
      fill(i + 1);
      used[v] = false;
    }
    square[i] = 0;
  })(0);
  return found;
}

function rowSum(s, n, r) {
  let t = 0;
  for (let c = 0; c < n; c += 1) t += s[r * n + c];
  return t;
}

function colSum(s, n, c) {
  let t = 0;
  for (let r = 0; r < n; r += 1) t += s[r * n + c];
  return t;
}

// the Lo Shu square from ancient China
export const LO_SHU = [4, 9, 2, 3, 5, 7, 8, 1, 6];

// Albrecht Durer's square from his 1514 engraving Melencolia I; the bottom
// middle cells read 15 14, the year he made it
export const DURER = [16, 3, 2, 13, 5, 10, 11, 8, 9, 6, 7, 12, 4, 15, 14, 1];
