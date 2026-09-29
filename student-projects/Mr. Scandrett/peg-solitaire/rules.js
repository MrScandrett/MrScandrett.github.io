// Rules for English peg solitaire (the 33-hole cross board), free of page code.
// Holes are indexes into a 7 x 7 grid; the four 2 x 2 corners are not part of the board.
// A move jumps a peg over a neighbor into an empty hole two steps away; the
// jumped peg is removed. The goal is one peg, in the center.

export const SIZE = 7;
export const CENTER = 24;

export function onBoard(i) {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  return (r >= 2 && r <= 4) || (c >= 2 && c <= 4);
}

export const HOLES = [...Array(SIZE * SIZE).keys()].filter(onBoard);

// every hole filled except the center
export function startBoard() {
  const board = new Array(SIZE * SIZE).fill(0);
  for (const h of HOLES) board[h] = h === CENTER ? 0 : 1;
  return board;
}

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export function jumpsFrom(board, from) {
  if (!board[from]) return [];
  const r = Math.floor(from / SIZE);
  const c = from % SIZE;
  const out = [];
  for (const [dr, dc] of DIRS) {
    const r2 = r + 2 * dr;
    const c2 = c + 2 * dc;
    if (r2 < 0 || r2 >= SIZE || c2 < 0 || c2 >= SIZE) continue;
    const over = (r + dr) * SIZE + (c + dc);
    const to = r2 * SIZE + c2;
    if (onBoard(to) && board[over] && !board[to]) out.push({ from, over, to });
  }
  return out;
}

export function allJumps(board) {
  return HOLES.flatMap((h) => jumpsFrom(board, h));
}

export function jump(board, move) {
  const next = board.slice();
  next[move.from] = 0;
  next[move.over] = 0;
  next[move.to] = 1;
  return next;
}

export function pegCount(board) {
  return HOLES.reduce((n, h) => n + board[h], 0);
}

export function isWon(board) {
  return pegCount(board) === 1 && board[CENTER] === 1;
}

// A known 31-jump solution from the standard start, written as [from, to] hole
// indexes. It was found by depth-first search and is verified by the tests.
export const SOLUTION = [
  [10,24], [15,17], [2,16], [4,2], [17,15], [14,16], [18,4], [20,18], [23,9], [2,16], [21,23], [23,9], [25,11], [4,18], [27,25], [25,11], [37,23], [28,30], [30,16], [9,23], [23,25], [32,18], [11,25], [34,32], [31,33], [46,32], [25,39], [44,46], [46,32], [33,31], [38,24]
];

// turn [from, to] into a full move, or null if it is not a legal jump now
export function moveFromTo(board, from, to) {
  return jumpsFrom(board, from).find((m) => m.to === to) || null;
}
