// Rules for Nim, free of page code. Heaps are an array of counts.
// On your turn, take one or more objects from a single heap. Whoever takes the
// last object wins ("normal play").

export function isOver(heaps) {
  return heaps.every((h) => h === 0);
}

export function take(heaps, heap, count) {
  if (count < 1 || count > heaps[heap]) throw new Error("Illegal take");
  const next = heaps.slice();
  next[heap] -= count;
  return next;
}

// XOR of all heap sizes. Bouton (1901): the player to move is losing exactly
// when this is 0, if the opponent plays perfectly.
export function nimSum(heaps) {
  return heaps.reduce((a, b) => a ^ b, 0);
}

// A move that leaves a nim-sum of 0, or null if none exists (a losing position).
export function winningMove(heaps) {
  const s = nimSum(heaps);
  if (s === 0) return null;
  for (let i = 0; i < heaps.length; i += 1) {
    const target = heaps[i] ^ s;
    if (target < heaps[i]) return { heap: i, count: heaps[i] - target };
  }
  return null;
}

// what the computer plays: a winning move if there is one, otherwise take one
// object from the biggest heap and hope you slip
export function computerMove(heaps) {
  const win = winningMove(heaps);
  if (win) return win;
  let biggest = 0;
  heaps.forEach((h, i) => {
    if (h > heaps[biggest]) biggest = i;
  });
  return { heap: biggest, count: 1 };
}

// brute-force check used by tests: can the player to move force a win?
export function canForceWin(heaps, memo = new Map()) {
  const key = heaps.slice().sort((a, b) => a - b).join(",");
  if (memo.has(key)) return memo.get(key);
  let win = false;
  for (let i = 0; i < heaps.length && !win; i += 1) {
    for (let c = 1; c <= heaps[i] && !win; c += 1) {
      if (!canForceWin(take(heaps, i, c), memo)) win = true;
    }
  }
  memo.set(key, win);
  return win;
}
