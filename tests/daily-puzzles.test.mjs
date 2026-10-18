import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  dayKey, shiftDayKey, rngFor, countSolutions, solveSudoku, makeSudoku, sudokuConflicts,
  makeCrossword, crosswordProblems, entryCells,
  makeDailyDouble, STEAM_CATEGORIES, DOUBLE_JEOPARDY_VALUES
} from '../assets/js/daily-puzzles-core.mjs';

const bank = JSON.parse(readFileSync(new URL('../data/crossword-bank.json', import.meta.url), 'utf8')).words;
const doubleBank = JSON.parse(readFileSync(new URL('../data/daily-double-bank.json', import.meta.url), 'utf8'));

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
  makeDailyDouble('2026-10-17', doubleBank);
  assert.ok(performance.now() - t0 < 1500, `took ${(performance.now() - t0).toFixed(0)}ms`);
});

test('daily double bank hygiene: valid STEAM questions, existing lessons, 4 choices', () => {
  const seen = new Set();
  assert.ok(Array.isArray(doubleBank.questions), 'bank questions must be an array');
  assert.equal(doubleBank.questions.length, 100, 'bank should have 100 questions');

  for (const q of doubleBank.questions) {
    assert.ok(q.id && !seen.has(q.id), `duplicate or missing id: ${q.id}`);
    seen.add(q.id);
    assert.ok(STEAM_CATEGORIES.includes(q.category), `valid category: ${q.category}`);
    assert.ok(q.difficulty >= 1 && q.difficulty <= 5, `difficulty 1-5: ${q.difficulty}`);
    assert.equal(q.value, DOUBLE_JEOPARDY_VALUES[q.difficulty - 1], 'value matches difficulty');
    assert.ok(q.clue && q.clue.length > 10, `clue text present: ${q.id}`);
    assert.ok(q.answer && q.answer.length > 0, `answer text present: ${q.id}`);
    assert.equal(q.choices.length, 4, `4 choices required for Millionaire format: ${q.id}`);
    assert.ok(q.choices.includes(q.answer), `choices must include correct answer: ${q.id}`);
    assert.ok(q.lesson && existsSync(q.lesson), `lesson file must exist on disk: ${q.lesson}`);
    assert.ok(q.lessonTitle && q.lessonTitle.length > 2, `lesson title required: ${q.id}`);
    assert.ok(q.explanation && q.explanation.length > 10, `explanation required: ${q.id}`);
  }
});

test('daily double: 5x5 STEAM board, deterministic, 2 triple doubles to power of pi', () => {
  for (const key of DATES) {
    const a = makeDailyDouble(key, doubleBank);
    const b = makeDailyDouble(key, doubleBank);
    assert.deepEqual(a, b, `${key} must be deterministic`);

    assert.equal(a.categories.length, 5);
    assert.deepEqual(a.categories, STEAM_CATEGORIES);
    assert.deepEqual(a.values, DOUBLE_JEOPARDY_VALUES);
    assert.equal(a.grid.length, 5, '5 columns');

    let tdCount = 0;
    for (let c = 0; c < 5; c++) {
      assert.equal(a.grid[c].length, 5, `column ${c} must have 5 rows`);
      for (let r = 0; r < 5; r++) {
        const tile = a.grid[c][r];
        assert.equal(tile.col, c);
        assert.equal(tile.row, r);
        assert.equal(tile.category, STEAM_CATEGORIES[c]);
        assert.equal(tile.value, DOUBLE_JEOPARDY_VALUES[r]);
        assert.equal(tile.choices.length, 4);
        assert.ok(tile.choices.includes(tile.answer));
        assert.equal(tile.choices[tile.correctIndex], tile.answer);
        if (tile.isTripleDouble) tdCount++;
      }
    }
    assert.equal(tdCount, 2, `${key} must have exactly 2 TRIPLE DOUBLE to the power of pi tiles`);
    assert.equal(a.tripleDoubles.length, 2);
  }
});

test('different days give different daily double boards', () => {
  const a = makeDailyDouble('2026-10-16', doubleBank);
  const b = makeDailyDouble('2026-10-17', doubleBank);
  const aIds = a.grid.flat().map((t) => t.id).join(',');
  const bIds = b.grid.flat().map((t) => t.id).join(',');
  assert.notEqual(aIds, bIds);
});

