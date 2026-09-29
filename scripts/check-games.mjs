// Checks the rules modules of showcase puzzles and games against known facts.
// Each game keeps its rules in a page-free rules.js so it can be tested here.
import * as queens from "../student-projects/Mr. Scandrett/eight-queens/rules.js";
import * as hanoi from "../student-projects/Mr. Scandrett/tower-of-hanoi/rules.js";

let failures = 0;
function check(label, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${JSON.stringify(got)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
}

// N-Queens: number of solutions for n = 1..10 (OEIS A000170) and distinct
// solutions up to rotation and reflection (OEIS A002562)
const TOTAL = [1, 0, 0, 2, 10, 4, 40, 92, 352, 724];
const DISTINCT = [1, 0, 0, 1, 2, 1, 6, 12, 46, 92];
check("queens total solutions n=1..10", TOTAL.map((_, i) => queens.allSolutions(i + 1).length), TOTAL);
check("queens distinct solutions n=1..10", DISTINCT.map((_, i) => queens.distinctSolutionCount(i + 1)), DISTINCT);
check(
  "every 8-queens solution is valid",
  queens.allSolutions(8).every((cols) => queens.isSolution(cols.map((col, row) => ({ row, col })), 8)),
  true
);

// Tower of Hanoi: the recursive solution is legal, solves the puzzle, and uses
// exactly 2^n - 1 moves; the hint (bestMove) agrees with it from every position
// along the way; and the reachable positions number 3^n (every disk on any peg).
for (let disks = 1; disks <= 10; disks += 1) {
  let state = hanoi.newGame(disks);
  let count = 0;
  let hintsAgree = true;
  for (const m of hanoi.solve(disks)) {
    const hint = hanoi.bestMove(state, disks);
    if (!hint || hint.from !== m.from || hint.to !== m.to) hintsAgree = false;
    state = hanoi.move(state, m.from, m.to);
    count += 1;
  }
  check(`hanoi ${disks} disks: moves, solved, hints`, [count, hanoi.isSolved(state, disks), hintsAgree], [2 ** disks - 1, true, true]);
}

// perft-style count: every position reachable by legal moves (expected 3^n)
function reachable(disks) {
  const key = (s) => s.map((p) => p.join(".")).join("|");
  const seen = new Set();
  const queue = [hanoi.newGame(disks)];
  seen.add(key(queue[0]));
  while (queue.length) {
    const s = queue.pop();
    for (const m of hanoi.legalMoves(s)) {
      const next = hanoi.move(s, m.from, m.to);
      const k = key(next);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push(next);
      }
    }
  }
  return seen.size;
}
check("hanoi reachable positions n=1..7", [1, 2, 3, 4, 5, 6, 7].map(reachable), [3, 9, 27, 81, 243, 729, 2187]);

if (failures) {
  console.error(`check:games failed (${failures} failing check${failures === 1 ? "" : "s"}).`);
  process.exit(1);
}
console.log("check:games passed.");
