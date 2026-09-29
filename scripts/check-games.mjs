// Checks the rules modules of showcase puzzles and games against known facts.
// Each game keeps its rules in a page-free rules.js so it can be tested here.
import * as queens from "../student-projects/Mr. Scandrett/eight-queens/rules.js";
import * as hanoi from "../student-projects/Mr. Scandrett/tower-of-hanoi/rules.js";
import * as knight from "../student-projects/Mr. Scandrett/knights-tour/rules.js";
import * as sliding from "../student-projects/Mr. Scandrett/sliding-puzzle/rules.js";
import * as nim from "../student-projects/Mr. Scandrett/nim/rules.js";
import * as lights from "../student-projects/Mr. Scandrett/lights-out/rules.js";
import * as life from "../student-projects/Mr. Scandrett/life-puzzles/rules.js";
import * as magic from "../student-projects/Mr. Scandrett/magic-squares/rules.js";
import * as sudoku from "../student-projects/Mr. Scandrett/mini-sudoku/rules.js";
import * as river from "../student-projects/Mr. Scandrett/river-crossing/rules.js";
import * as peg from "../student-projects/Mr. Scandrett/peg-solitaire/rules.js";

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

// Tower of Hanoi, four pegs: Frame-Stewart move counts (OEIS A007664), the
// solver's moves are legal and finish, and breadth-first search over every
// position confirms the counts are the true minimum for small towers.
const FS = [1, 3, 5, 9, 13, 17, 25, 33];
check("hanoi 4 pegs Frame-Stewart counts n=1..8", FS.map((_, i) => hanoi.frameStewartMoves(i + 1)), FS);
check(
  "hanoi 4 pegs solver n=1..8: legal, solved, count",
  FS.map((_, i) => {
    const n = i + 1;
    let st = hanoi.newGame(n, 4);
    let count = 0;
    for (const m of hanoi.solveFourPegs(n)) {
      st = hanoi.move(st, m.from, m.to);
      count += 1;
    }
    return hanoi.isSolved(st, n) && count === hanoi.frameStewartMoves(n);
  }),
  FS.map(() => true)
);
function shortestHanoi(n, pegs) {
  const key = (s) => s.map((p) => p.join(".")).join("|");
  let frontier = [hanoi.newGame(n, pegs)];
  const seen = new Set([key(frontier[0])]);
  for (let d = 0; ; d += 1) {
    if (frontier.some((s) => hanoi.isSolved(s, n))) return d;
    const next = [];
    for (const s of frontier) {
      for (const m of hanoi.legalMoves(s)) {
        const t = hanoi.move(s, m.from, m.to);
        const k = key(t);
        if (!seen.has(k)) {
          seen.add(k);
          next.push(t);
        }
      }
    }
    frontier = next;
  }
}
check("hanoi 4 pegs true minimum by search n=1..6", [1, 2, 3, 4, 5, 6].map((n) => shortestHanoi(n, 4)), FS.slice(0, 6));

// Knight's tour: tours from a corner of 5 x 5 (304), none on 4 x 4, and
// Warnsdorff's rule completes a tour from the corner of 5 x 5 through 8 x 8
check("knight tours from a 5x5 corner", knight.countTours(5, 0), 304);
check("knight tours on 4x4 from each corner-adjacent start", [0, 1, 5].map((s) => knight.countTours(4, s)), [0, 0, 0]);
check(
  "warnsdorff completes corner tours n=5..8",
  [5, 6, 7, 8].map((n) => knight.isValidTour(n, knight.warnsdorffTour(n, 0))),
  [true, true, true, true]
);

// Sliding puzzle: the 8-puzzle has 9!/2 = 181,440 reachable positions and the
// hardest needs 31 moves; the parity test agrees with search; A* finds optimal lengths
{
  const goal = sliding.solvedBoard(3);
  const dist = new Map([[goal.join(","), 0]]);
  let frontier = [goal];
  let depth = 0;
  while (frontier.length) {
    const next = [];
    for (const b of frontier) {
      for (const t of sliding.movableTiles(b, 3)) {
        const nb = sliding.slide(b, t, 3);
        const k = nb.join(",");
        if (!dist.has(k)) {
          dist.set(k, depth + 1);
          next.push(nb);
        }
      }
    }
    if (next.length) depth += 1;
    frontier = next;
  }
  check("8-puzzle reachable positions and hardest", [dist.size, depth], [181440, 31]);
  let rng = 7;
  const random = () => ((rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648);
  let parityAgrees = true;
  let astarOptimal = true;
  for (let i = 0; i < 300; i += 1) {
    const b = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => random() - 0.5);
    const reachable = dist.has(b.join(","));
    if (sliding.isSolvable(b, 3) !== reachable) parityAgrees = false;
    if (reachable && i < 40 && sliding.solveAStar(b, 3).moves.length !== dist.get(b.join(","))) astarOptimal = false;
  }
  check("8-puzzle parity test matches search (300 boards)", parityAgrees, true);
  check("8-puzzle A* finds the shortest solution (40 boards)", astarOptimal, true);
  const loyd = [...sliding.solvedBoard(4)];
  [loyd[13], loyd[14]] = [loyd[14], loyd[13]];
  check("Loyd's 14-15 puzzle is unsolvable; shuffles are solvable", [sliding.isSolvable(loyd, 4), sliding.isSolvable(sliding.shuffle(4, 80, random), 4)], [false, true]);
}

// Nim: Bouton's nim-sum rule agrees with brute force on every position up to heaps of 5
{
  let agree = true;
  for (let a = 0; a <= 5; a += 1)
    for (let b = 0; b <= 5; b += 1)
      for (let c = 0; c <= 5; c += 1) {
        const h = [a, b, c];
        const win = nim.canForceWin(h);
        if (win !== (nim.nimSum(h) !== 0)) agree = false;
        const m = nim.winningMove(h);
        if (win && (!m || nim.nimSum(nim.take(h, m.heap, m.count)) !== 0)) agree = false;
      }
  check("nim: nim-sum rule matches brute force (216 positions)", agree, true);
}

// Lights Out: the 5 x 5 press matrix has rank 23, so 1 in 4 boards is solvable,
// each solvable board has 4 solutions, and the solver's presses really work
{
  const n = 5;
  const blank = new Array(25).fill(0);
  check("lights out 5x5 rank", lights.solve(blank, n).rank, 23);
  let rng = 3;
  const random = () => ((rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648);
  let works = true;
  let solvable = 0;
  const trials = 4000;
  for (let i = 0; i < trials; i += 1) {
    const b = blank.map(() => (random() < 0.5 ? 1 : 0));
    const s = lights.solve(b, n).presses;
    if (!s) continue;
    solvable += 1;
    let t = b;
    for (const p of s) t = lights.press(t, n, p);
    if (!lights.isSolved(t)) works = false;
  }
  check("lights out: solver's presses clear the board", works, true);
  check("lights out: about 1 in 4 random boards solvable", Math.abs(solvable / trials - 0.25) < 0.03, true);
  let puzzlesSolvable = true;
  for (let i = 0; i < 50; i += 1) if (!lights.solve(lights.randomPuzzle(5, 8, random), 5).presses) puzzlesSolvable = false;
  check("lights out: generated puzzles are solvable", puzzlesSolvable, true);
  // exactly 4 solutions each: two quiet patterns; the fewest-press answer really works and is minimal
  let fourSolutions = true;
  let fewestOk = true;
  for (let i = 0; i < 30; i += 1) {
    const b = lights.randomPuzzle(5, 8, random);
    const { quiet } = lights.solve(b, 5);
    if (quiet.length !== 2) fourSolutions = false;
    const best = lights.fewestPresses(b, 5);
    let t = b;
    for (const p of best) t = lights.press(t, 5, p);
    if (!lights.isSolved(t) || best.length > lights.solve(b, 5).presses.length) fewestOk = false;
  }
  check("lights out: 4 solutions each, fewest-press answer works", [fourSolutions, fewestOk], [true, true]);
}

// Game of Life: known patterns and the puzzle checks
{
  const place = (cells) => {
    const g = life.emptyGrid(12, 12);
    for (const [r, c] of cells) g[r + 4][c + 4] = 1;
    return g;
  };
  const block = place([[0, 0], [0, 1], [1, 0], [1, 1]]);
  const blinker = place([[1, 0], [1, 1], [1, 2]]);
  const glider = place([[0, 1], [1, 2], [2, 0], [2, 1], [2, 2]]);
  const toad = place([[1, 1], [1, 2], [1, 3], [2, 0], [2, 1], [2, 2]]);
  check("life: block, blinker, toad, glider", [block, blinker, toad, glider].map((g) => life.classify(g)), [
    { period: 1, dr: 0, dc: 0 },
    { period: 2, dr: 0, dc: 0 },
    { period: 2, dr: 0, dc: 0 },
    { period: 4, dr: 1, dc: 1 },
  ]);
  const byId = Object.fromEntries(life.PUZZLES.map((p) => [p.id, p.check]));
  check("life puzzle checks accept the textbook answers", [byId.still(block), byId.blinker(blinker), byId.glider(glider), byId.vanish(place([[0, 0], [0, 3], [3, 0], [3, 3]]))], [true, true, true, true]);
  check("life puzzle checks reject wrong answers", [byId.still(blinker), byId.blinker(block), byId.glider(blinker), byId.vanish(block)], [false, false, false, false]);
}

// Magic squares: 3 x 3 has exactly 8 (one, plus its rotations and reflections)
// and the Lo Shu is one of them; Durer's 1514 square is magic with sum 34
{
  const three = magic.allMagicSquares(3);
  check("magic 3x3 count, Lo Shu included", [three.length, three.some((s) => s.join() === magic.LO_SHU.join())], [8, true]);
  check("magic Durer 4x4 square", [magic.isMagic(magic.DURER, 4), magic.magicSum(4)], [true, 34]);
}

// Sudoku: 288 complete 4 x 4 grids; generated puzzles have exactly one answer
{
  check("sudoku 4x4 complete grids", sudoku.countGrids(4), 288);
  let rng = 11;
  const random = () => ((rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648);
  let unique = true;
  for (let i = 0; i < 20; i += 1) {
    const { puzzle, solution } = sudoku.generate(4, 5, random);
    const r = sudoku.countSolutions(puzzle, 4, 2);
    if (r.count !== 1 || r.solution.join() !== solution.join()) unique = false;
  }
  for (let i = 0; i < 3; i += 1) {
    const { puzzle } = sudoku.generate(9, 36, random);
    if (sudoku.countSolutions(puzzle, 9, 2).count !== 1) unique = false;
  }
  check("sudoku generated puzzles have one solution (20 at 4x4, 3 at 9x9)", unique, true);
}

// River crossing: 7 crossings is the minimum, there are exactly 2 shortest
// solutions, and 10 of the 16 arrangements are safe to reach
{
  const r = river.solveAll();
  check("river crossing shortest, solutions, safe states", [r.shortest, r.solutions.length, r.safeStates], [7, 2, 10]);
}

// Peg solitaire: 4 opening jumps, and the stored solution is 31 legal jumps
// ending with one peg in the center
{
  let b = peg.startBoard();
  check("peg solitaire holes and opening jumps", [peg.HOLES.length, peg.allJumps(b).length], [33, 4]);
  let legal = true;
  for (const [from, to] of peg.SOLUTION) {
    const m = peg.moveFromTo(b, from, to);
    if (!m) {
      legal = false;
      break;
    }
    b = peg.jump(b, m);
  }
  check("peg solitaire stored solution", [peg.SOLUTION.length, legal, peg.isWon(b)], [31, true, true]);
}

if (failures) {
  console.error(`check:games failed (${failures} failing check${failures === 1 ? "" : "s"}).`);
  process.exit(1);
}
console.log("check:games passed.");
