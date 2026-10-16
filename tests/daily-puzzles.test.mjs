import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  dayKey, shiftDayKey, rngFor, countSolutions, solveSudoku, makeSudoku, sudokuConflicts,
  makeCrossword, crosswordProblems, entryCells
} from '../assets/js/daily-puzzles-core.mjs';

const bank = JSON.parse(readFileSync(new URL('../data/crossword-bank.json', import.meta.url), 'utf8')).words;

// A spread of dates covering every weekday and a month/year boundary.
const DATES = ['2026-01-01', '2026-02-28', '2026-03-02', '2026-10-16', '2026-12-31', '2027-07-04', '2028-02-29'];

test('day keys round-trip and shift across month ends', () => {
  assert.equal(dayKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(shiftDayKey('2026-03-01', -1), '2026-02-28');
  assert.equal(shiftDayKey('2028-02-28', 1), '2028-02-29');
  assert.equal(shiftDayKey('2026-12-31', 1), '2027-01-01');
});

test('seeded rng is deterministic and differs by seed', () => {
  const a = rngFor('x'), b = rngFor('x'), c = rngFor('y');
  const seqA = [a(), a(), a()], seqB = [b(), b(), b()], seqC = [c(), c(), c()];
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, seqC);
});

test('word bank is clean: A-Z, 4-9 letters, unique, clued', () => {
  const seen = new Set();
  for (const { w, c } of bank) {
    assert.match(w, /^[A-Z]{4,9}$/, w);
    assert.ok(c && c.length > 3, `clue for ${w}`);
    assert.ok(!seen.has(w), `duplicate ${w}`);
    seen.add(w);
  }
  assert.ok(bank.length >= 150, 'bank should be big enough to avoid repeats');
});

test('sudoku solver counts solutions', () => {
  const empty = new Array(81).fill(0);
  assert.equal(countSolutions(empty, 2), 2);
  const sol = solveSudoku(empty);
  assert.equal(sudokuConflicts(sol).size, 0);
  assert.ok(sol.every((d) => d >= 1 && d <= 9));
});

test('daily sudoku: valid solution, unique answer, deterministic, right difficulty', () => {
  for (const key of DATES) {
    const a = makeSudoku(key), b = makeSudoku(key);
    assert.deepEqual(a.puzzle, b.puzzle, key);
    assert.deepEqual(a.solution, b.solution, key);
    assert.equal(sudokuConflicts(a.solution).size, 0, key);
    assert.equal(countSolutions(a.puzzle, 2), 1, `${key} must have exactly one solution`);
    a.puzzle.forEach((d, i) => { if (d) assert.equal(d, a.solution[i]); });
    assert.equal(a.puzzle.filter(Boolean).length, a.givens);
    assert.ok(a.givens >= 22 && a.givens <= 44, `${key} givens ${a.givens}`);
  }
  assert.notDeepEqual(makeSudoku('2026-10-16').puzzle, makeSudoku('2026-10-17').puzzle);
});

test('sudoku conflicts finds repeats in row, column and box', () => {
  const g = new Array(81).fill(0);
  g[0] = 5; g[8] = 5;   // same row
  g[40] = 7; g[76] = 7; // same column (col 4)
  g[60] = 3; g[70] = 3; // same box (bottom-right)
  assert.deepEqual([...sudokuConflicts(g)].sort((x, y) => x - y), [0, 8, 40, 60, 70, 76]);
});

test('daily crossword: valid, connected, bounded, deterministic', () => {
  for (const key of DATES) {
    const cw = makeCrossword(key, bank);
    assert.deepEqual(crosswordProblems(cw), [], key);
    assert.ok(cw.entries.length >= 9, `${key} has ${cw.entries.length} entries`);
    assert.ok(cw.width <= 11 && cw.height <= 11, `${key} ${cw.width}x${cw.height}`);
    assert.deepEqual(cw.grid, makeCrossword(key, bank).grid, `${key} deterministic`);
    // Entry cells spell the answer, and numbering is sequential in reading order.
    for (const e of cw.entries) {
      const spelled = entryCells(e).map(([r, c]) => cw.grid[r][c]).join('');
      assert.equal(spelled, e.answer, `${key} ${e.num} ${e.dir}`);
    }
    const nums = [...new Set(cw.entries.map((e) => e.num))];
    assert.deepEqual(nums, nums.slice().sort((x, y) => x - y));
    assert.equal(new Set(cw.entries.map((e) => e.answer)).size, cw.entries.length, 'no repeated answers');
    // Connected: flood fill from the first letter reaches every letter.
    const cells = [];
    cw.grid.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') cells.push(`${r},${c}`); }));
    const seen = new Set([cells[0]]), stack = [cells[0]];
    while (stack.length) {
      const [r, c] = stack.pop().split(',').map(Number);
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${r + dr},${c + dc}`;
        if (cells.includes(k) && !seen.has(k)) { seen.add(k); stack.push(k); }
      }
    }
    assert.equal(seen.size, cells.length, `${key} connected`);
  }
});

test('different days give different crosswords', () => {
  const a = makeCrossword('2026-10-16', bank).grid.join('|');
  const b = makeCrossword('2026-10-17', bank).grid.join('|');
  assert.notEqual(a, b);
});

test('generation is fast enough to run on page load', () => {
  const t0 = performance.now();
  makeSudoku('2026-10-17');
  makeCrossword('2026-10-17', bank);
  assert.ok(performance.now() - t0 < 1500, `took ${(performance.now() - t0).toFixed(0)}ms`);
});
