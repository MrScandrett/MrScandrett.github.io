// Rules for the Tower of Hanoi, kept free of any page code so tests can import them.
// A state is three pegs; each peg is an array of disk sizes, bottom first.
// Disk 1 is the smallest.

export function newGame(disks) {
  return [Array.from({ length: disks }, (_, i) => disks - i), [], []];
}

export function topDisk(state, peg) {
  const stack = state[peg];
  return stack.length ? stack[stack.length - 1] : null;
}

// a disk may move onto an empty peg or onto a larger disk
export function canMove(state, from, to) {
  if (from === to) return false;
  const disk = topDisk(state, from);
  if (disk === null) return false;
  const target = topDisk(state, to);
  return target === null || target > disk;
}

export function move(state, from, to) {
  if (!canMove(state, from, to)) throw new Error(`Illegal move from peg ${from + 1} to peg ${to + 1}`);
  const next = state.map((peg) => peg.slice());
  next[to].push(next[from].pop());
  return next;
}

// solved when every disk sits on the target peg (the rightmost one)
export function isSolved(state, disks, target = 2) {
  return state[target].length === disks;
}

export function minimumMoves(disks) {
  return 2 ** disks - 1;
}

// The recursive solution: to move n disks, move the top n-1 out of the way,
// move the biggest disk, then move the n-1 back on top of it.
// Yields { from, to, disk, depth } so the page can show the recursion.
export function* solve(disks, from = 0, to = 2, spare = 1, depth = 0) {
  if (disks === 0) return;
  yield* solve(disks - 1, from, spare, to, depth + 1);
  yield { from, to, disk: disks, depth };
  yield* solve(disks - 1, spare, to, from, depth + 1);
}

// every legal move from a state (used by tests and for hints)
export function legalMoves(state) {
  const moves = [];
  for (let from = 0; from < 3; from += 1) {
    for (let to = 0; to < 3; to += 1) if (canMove(state, from, to)) moves.push({ from, to });
  }
  return moves;
}

// Best next move from any position (not just the start), found by the classic
// recursion on the largest disk that is not yet on the target peg.
export function bestMove(state, disks, target = 2) {
  const pegOf = new Array(disks + 1);
  state.forEach((peg, p) => peg.forEach((d) => (pegOf[d] = p)));
  let goal = target;
  let result = null;
  for (let d = disks; d >= 1; d -= 1) {
    if (pegOf[d] !== goal) {
      result = { from: pegOf[d], to: goal, disk: d };
      goal = 3 - pegOf[d] - goal; // smaller disks must clear to the third peg first
    }
  }
  return result;
}
