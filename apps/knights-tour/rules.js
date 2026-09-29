// Rules for the Knight's Tour, kept free of page code so tests can import them.
// Squares are numbered 0 .. n*n-1, row by row.

const JUMPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

export function knightMoves(n, square) {
  const row = Math.floor(square / n);
  const col = square % n;
  const moves = [];
  for (const [dr, dc] of JUMPS) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < n && c >= 0 && c < n) moves.push(r * n + c);
  }
  return moves;
}

// moves to squares not yet visited
export function openMoves(n, square, visited) {
  return knightMoves(n, square).filter((s) => !visited.has(s));
}

// Warnsdorff's rule (1823): jump to the square that has the fewest onward
// moves. Ties go to the first such square. Returns the tour it builds, which
// may stop short if the rule leads into a dead end.
export function warnsdorffTour(n, start, visitedSoFar = [start]) {
  const path = visitedSoFar.slice();
  const visited = new Set(path);
  let square = path[path.length - 1];
  while (path.length < n * n) {
    const options = openMoves(n, square, visited);
    if (!options.length) break;
    let best = options[0];
    let bestCount = Infinity;
    for (const s of options) {
      const count = openMoves(n, s, visited).length;
      if (count < bestCount) {
        bestCount = count;
        best = s;
      }
    }
    square = best;
    visited.add(square);
    path.push(square);
  }
  return path;
}

// how many complete tours start on `start` (plain backtracking; small boards only)
export function countTours(n, start) {
  const visited = new Set([start]);
  let count = 0;
  (function extend(square) {
    if (visited.size === n * n) {
      count += 1;
      return;
    }
    for (const s of knightMoves(n, square)) {
      if (visited.has(s)) continue;
      visited.add(s);
      extend(s);
      visited.delete(s);
    }
  })(start);
  return count;
}

export function isValidTour(n, path) {
  if (path.length !== n * n || new Set(path).size !== n * n) return false;
  for (let i = 1; i < path.length; i += 1) {
    if (!knightMoves(n, path[i - 1]).includes(path[i])) return false;
  }
  return true;
}
