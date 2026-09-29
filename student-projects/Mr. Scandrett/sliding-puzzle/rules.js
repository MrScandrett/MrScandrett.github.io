// Rules for the sliding tile puzzle (8-puzzle and 15-puzzle), free of page code.
// A board is an array of n*n numbers read row by row; 0 is the empty space.

export function solvedBoard(n) {
  return [...Array(n * n - 1).keys()].map((i) => i + 1).concat(0);
}

export function isSolved(board) {
  return board.every((v, i) => v === (i === board.length - 1 ? 0 : i + 1));
}

// tiles that can slide into the empty space
export function movableTiles(board, n) {
  const e = board.indexOf(0);
  const r = Math.floor(e / n);
  const c = e % n;
  const out = [];
  if (r > 0) out.push(e - n);
  if (r < n - 1) out.push(e + n);
  if (c > 0) out.push(e - 1);
  if (c < n - 1) out.push(e + 1);
  return out;
}

export function slide(board, index, n) {
  if (!movableTiles(board, n).includes(index)) return null;
  const next = board.slice();
  const e = next.indexOf(0);
  next[e] = next[index];
  next[index] = 0;
  return next;
}

// Shuffle by making random legal slides, so the result is always solvable.
export function shuffle(n, slides, random = Math.random) {
  let board = solvedBoard(n);
  let previous = -1;
  for (let i = 0; i < slides; i += 1) {
    const options = movableTiles(board, n).filter((t) => t !== previous);
    const pick = options[Math.floor(random() * options.length)];
    previous = board.indexOf(0);
    board = slide(board, pick, n);
  }
  return board;
}

// The parity test: count pairs of tiles that are out of order ("inversions").
// Odd widths: solvable exactly when inversions are even. Even widths: add the
// empty space's row counted from the bottom (1 = bottom row); solvable when that
// total is odd.
export function inversions(board) {
  const tiles = board.filter((v) => v !== 0);
  let count = 0;
  for (let i = 0; i < tiles.length; i += 1) {
    for (let j = i + 1; j < tiles.length; j += 1) if (tiles[i] > tiles[j]) count += 1;
  }
  return count;
}

export function isSolvable(board, n) {
  const inv = inversions(board);
  if (n % 2 === 1) return inv % 2 === 0;
  const rowFromBottom = n - Math.floor(board.indexOf(0) / n);
  return (inv + rowFromBottom) % 2 === 1;
}

// how far each tile is from home, in grid steps; never overestimates the moves left
export function manhattan(board, n) {
  let total = 0;
  board.forEach((v, i) => {
    if (!v) return;
    const home = v - 1;
    total += Math.abs(Math.floor(i / n) - Math.floor(home / n)) + Math.abs((i % n) - (home % n));
  });
  return total;
}

// A* search with the Manhattan distance estimate. Returns the tile indexes to
// click, in order, and how many positions it examined. Gives up past `limit`.
export function solveAStar(start, n, limit = 200000) {
  const key = (b) => b.join(",");
  const open = [{ board: start, g: 0, f: manhattan(start, n), path: [] }];
  const bestG = new Map([[key(start), 0]]);
  let explored = 0;
  while (open.length) {
    // pop the lowest f (a simple binary heap)
    const node = heapPop(open);
    explored += 1;
    if (isSolved(node.board)) return { moves: node.path, explored };
    if (explored > limit) return { moves: null, explored };
    for (const t of movableTiles(node.board, n)) {
      const next = slide(node.board, t, n);
      const k = key(next);
      const g = node.g + 1;
      if (bestG.has(k) && bestG.get(k) <= g) continue;
      bestG.set(k, g);
      heapPush(open, { board: next, g, f: g + manhattan(next, n), path: [...node.path, t] });
    }
  }
  return { moves: null, explored };
}

function heapPush(heap, item) {
  heap.push(item);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heap[p].f <= item.f) break;
    heap[i] = heap[p];
    i = p;
  }
  heap[i] = item;
}

function heapPop(heap) {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length) {
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      const fm = () => (m === i ? last.f : heap[m].f);
      if (l < heap.length && heap[l].f < fm()) m = l;
      if (r < heap.length && heap[r].f < fm()) m = r;
      if (m === i) break;
      heap[i] = heap[m];
      i = m;
    }
    heap[i] = last;
  }
  return top;
}
