// Daily puzzles: pure generators for the home-page widget (#home-puzzles).
// Everything is seeded from the calendar date, so every student sees the same
// crossword and sudoku on the same day with no server. No DOM in this file;
// tests/daily-puzzles.test.mjs exercises it directly.

const pad = (n) => String(n).padStart(2, '0');

export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shiftDayKey(key, delta) {
  const d = parseDayKey(key);
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta));
}

// UTC day number keeps content rotation independent of a visitor's time zone.
function dayNumber(key) {
  const [year, month, date] = key.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, date) / 86400000);
}

// ── Seeded randomness ────────────────────────────────────────────────────
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A deterministic () => [0,1) generator for a string seed. */
export const rngFor = (seed) => mulberry32(xmur3(seed)());

export function shuffled(list, rnd) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Sudoku ───────────────────────────────────────────────────────────────
const ROW = (i) => Math.floor(i / 9);
const COL = (i) => i % 9;
const BOX = (i) => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);
const popcount = (m) => { let n = 0; while (m) { m &= m - 1; n++; } return n; };

export const PEERS = Array.from({ length: 81 }, (_, i) => {
  const out = [];
  for (let j = 0; j < 81; j++) {
    if (j !== i && (ROW(j) === ROW(i) || COL(j) === COL(i) || BOX(j) === BOX(i))) out.push(j);
  }
  return out;
});

/** Depth-first search with the fewest-candidates cell first. Calls onSolution(grid) for each solution until `limit`. */
function search(start, limit, onSolution, rnd) {
  const g = Array.from(start);
  const rows = new Int32Array(9), cols = new Int32Array(9), boxes = new Int32Array(9);
  for (let i = 0; i < 81; i++) {
    if (g[i]) { const bit = 1 << g[i]; rows[ROW(i)] |= bit; cols[COL(i)] |= bit; boxes[BOX(i)] |= bit; }
  }
  let found = 0;
  const rec = () => {
    let best = -1, bestMask = 0, bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = ~(rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)]) & 0x3FE;
      const n = popcount(m);
      if (n === 0) return;
      if (n < bestN) { best = i; bestMask = m; bestN = n; if (n === 1) break; }
    }
    if (best < 0) { found++; onSolution(g); return; }
    let digits = [];
    for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d);
    if (rnd) digits = shuffled(digits, rnd);
    const r = ROW(best), c = COL(best), b = BOX(best);
    for (const d of digits) {
      const bit = 1 << d;
      g[best] = d; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      rec();
      g[best] = 0; rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      if (found >= limit) return;
    }
  };
  rec();
  return found;
}

export const countSolutions = (grid, limit = 2) => search(grid, limit, () => {});

export function solveSudoku(grid) {
  let out = null;
  search(grid, 1, (g) => { out = g.slice(); });
  return out;
}

/** Givens kept per weekday (0 = Sunday). Fewer givens = harder. Monday is gentle on purpose. */
const SUDOKU_LEVELS = [
  { givens: 38, name: 'Medium' }, // Sun
  { givens: 42, name: 'Easy' },   // Mon
  { givens: 40, name: 'Easy' },   // Tue
  { givens: 36, name: 'Medium' }, // Wed
  { givens: 33, name: 'Medium' }, // Thu
  { givens: 30, name: 'Hard' },   // Fri
  { givens: 28, name: 'Hard' }    // Sat
];

export function makeSudoku(key) {
  const rnd = rngFor(`sudoku:${key}`);
  let solution = null;
  search(new Array(81).fill(0), 1, (g) => { solution = g.slice(); }, rnd);
  const level = SUDOKU_LEVELS[parseDayKey(key).getDay()];
  const puzzle = solution.slice();
  let givens = 81;
  // Dig out cells in 180° symmetric pairs; keep a removal only while the answer stays unique.
  for (const i of shuffled(Array.from({ length: 41 }, (_, k) => k), rnd)) {
    if (givens <= level.givens) break;
    const j = 80 - i;
    const a = puzzle[i], b = puzzle[j];
    puzzle[i] = 0; puzzle[j] = 0;
    if (countSolutions(puzzle, 2) === 1) givens -= i === j ? 1 : 2;
    else { puzzle[i] = a; puzzle[j] = b; }
  }
  return { key, puzzle, solution, givens, level: level.name };
}

/** Indexes of cells whose digit repeats in their row, column or box. */
export function sudokuConflicts(grid) {
  const bad = new Set();
  for (let i = 0; i < 81; i++) {
    if (!grid[i]) continue;
    for (const j of PEERS[i]) if (grid[j] === grid[i]) { bad.add(i); bad.add(j); }
  }
  return bad;
}

// ── Mini crossword ───────────────────────────────────────────────────────
const SIZE = 25;          // working canvas; the result is cropped to its bounding box
const MAX_SPAN = 11;      // widest/tallest the finished grid may be
const MIN_WORDS = 9;
const MAX_WORDS = 12;      // enough to feel like a real puzzle, small enough to stay readable

function layoutOnce(pool, rnd, maxSpan) {
  const letters = new Array(SIZE * SIZE).fill('');
  const own = { across: new Int16Array(SIZE * SIZE).fill(-1), down: new Int16Array(SIZE * SIZE).fill(-1) };
  const placed = [];
  let minR = SIZE, maxR = -1, minC = SIZE, maxC = -1, crossings = 0;
  const at = (r, c) => (r >= 0 && c >= 0 && r < SIZE && c < SIZE ? letters[r * SIZE + c] : '');

  const fits = (word, r, c, dir) => {
    const dr = dir === 'down' ? 1 : 0, dc = dir === 'across' ? 1 : 0;
    const er = r + dr * word.length, ec = c + dc * word.length;
    if (r < 0 || c < 0 || er > SIZE || ec > SIZE) return -1;
    if (r + dr * (word.length - 1) >= SIZE || c + dc * (word.length - 1) >= SIZE) return -1;
    if (at(r - dr, c - dc) || at(er, ec)) return -1;
    const nMinR = Math.min(minR, r), nMaxR = Math.max(maxR, r + dr * (word.length - 1));
    const nMinC = Math.min(minC, c), nMaxC = Math.max(maxC, c + dc * (word.length - 1));
    if (nMaxR - nMinR + 1 > maxSpan || nMaxC - nMinC + 1 > maxSpan) return -1;
    let cross = 0;
    for (let k = 0; k < word.length; k++) {
      const rr = r + dr * k, cc = c + dc * k;
      const have = at(rr, cc);
      if (have) {
        if (have !== word[k] || own[dir][rr * SIZE + cc] >= 0) return -1;
        cross++;
      } else if (at(rr + dc, cc + dr) || at(rr - dc, cc - dr)) return -1; // would touch a parallel neighbour
    }
    return cross;
  };

  const put = (word, r, c, dir, clue) => {
    const dr = dir === 'down' ? 1 : 0, dc = dir === 'across' ? 1 : 0;
    const idx = placed.length;
    for (let k = 0; k < word.length; k++) {
      const rr = r + dr * k, cc = c + dc * k;
      letters[rr * SIZE + cc] = word[k];
      own[dir][rr * SIZE + cc] = idx;
    }
    minR = Math.min(minR, r); maxR = Math.max(maxR, r + dr * (word.length - 1));
    minC = Math.min(minC, c); maxC = Math.max(maxC, c + dc * (word.length - 1));
    placed.push({ word, r, c, dir, clue });
  };

  const order = shuffled(pool, rnd);
  const seed = order.find((e) => e.w.length >= 7) || order[0];
  put(seed.w, Math.floor(SIZE / 2), Math.floor((SIZE - seed.w.length) / 2), 'across', seed.c);
  const used = new Set([seed.w]);

  for (let round = 0; round < 40 && placed.length < MAX_WORDS; round++) {
    const options = [];
    for (const entry of order) {
      if (used.has(entry.w)) continue;
      for (let r = minR - 1; r <= maxR + 1; r++) {
        for (let c = minC - 1; c <= maxC + 1; c++) {
          const ch = at(r, c);
          if (!ch) continue;
          const dir = own.across[r * SIZE + c] >= 0 && own.down[r * SIZE + c] < 0 ? 'down'
            : own.down[r * SIZE + c] >= 0 && own.across[r * SIZE + c] < 0 ? 'across' : null;
          if (!dir) continue;
          for (let k = 0; k < entry.w.length; k++) {
            if (entry.w[k] !== ch) continue;
            const sr = dir === 'down' ? r - k : r, sc = dir === 'across' ? c - k : c;
            const cross = fits(entry.w, sr, sc, dir);
            if (cross > 0) options.push({ entry, r: sr, c: sc, dir, score: cross * 3 + rnd() });
          }
        }
      }
      if (options.length > 60) break;
    }
    if (!options.length) break;
    options.sort((a, b) => b.score - a.score);
    const pick = options[Math.floor(rnd() * Math.min(4, options.length))];
    put(pick.entry.w, pick.r, pick.c, pick.dir, pick.entry.c);
    used.add(pick.entry.w);
    crossings++;
  }
  return { placed, letters, minR, maxR, minC, maxC, crossings };
}

function finishCrossword(layout) {
  const { placed, letters, minR, maxR, minC, maxC } = layout;
  const height = maxR - minR + 1, width = maxC - minC + 1;
  const grid = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => letters[(r + minR) * SIZE + (c + minC)] || '.').join(''));
  const starts = new Map();
  for (const p of placed) starts.set(`${p.r - minR},${p.c - minC},${p.dir}`, p);
  const entries = [];
  const numbers = {};
  let n = 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const a = starts.get(`${r},${c},across`), d = starts.get(`${r},${c},down`);
      if (!a && !d) continue;
      n++;
      numbers[`${r},${c}`] = n;
      if (a) entries.push({ num: n, dir: 'across', row: r, col: c, len: a.word.length, answer: a.word, clue: a.clue });
      if (d) entries.push({ num: n, dir: 'down', row: r, col: c, len: d.word.length, answer: d.word, clue: d.clue });
    }
  }
  return { width, height, grid, entries, numbers };
}

/**
 * Build the day's crossword from the word bank ([{ w, c }]). Many random
 * layouts are tried and the densest, squarest one wins; the seed is the date
 * so the result is the same for everyone.
 */
export function makeCrossword(key, bank, { attempts = 24, maxSpan = MAX_SPAN } = {}) {
  const valid = bank.filter((e) => /^[A-Z]{4,9}$/.test(e.w));
  // Four interleaved answer sets give consecutive days different vocabularies.
  // Keep the partition fixed so revisiting a date produces the same clues.
  const ordered = shuffled(valid, rngFor('crossword-answer-rotation:v2'));
  const cohort = ((dayNumber(key) % 4) + 4) % 4;
  const pool = ordered.filter((_, i) => i % 4 === cohort);
  const rnd = rngFor(`crossword:${key}`);
  let best = null, bestScore = -Infinity;
  for (let i = 0; i < attempts; i++) {
    const layout = layoutOnce(pool, rnd, maxSpan);
    const words = layout.placed.length;
    if (words < MIN_WORDS) continue;
    const w = layout.maxC - layout.minC + 1, h = layout.maxR - layout.minR + 1;
    const score = words * 100 + layout.crossings * 10 - w * h - Math.abs(w - h) * 3;
    if (score > bestScore) { best = layout; bestScore = score; }
    if (words >= MAX_WORDS && w <= 10 && h <= 10) break; // good enough; keep page load quick
  }
  if (!best) best = layoutOnce(pool.length >= MIN_WORDS ? pool : valid, rnd, maxSpan);
  return { key, ...finishCrossword(best) };
}

/** Every across/down run of 2+ letters must be exactly one entry. Returns a list of problems (empty = valid). */
export function crosswordProblems(cw) {
  const problems = [];
  const runs = new Set();
  const cell = (r, c) => (r >= 0 && c >= 0 && r < cw.height && c < cw.width ? cw.grid[r][c] : '.');
  for (let r = 0; r < cw.height; r++) {
    for (let c = 0; c < cw.width; c++) {
      if (cell(r, c) === '.') continue;
      if (cell(r, c - 1) === '.' && cell(r, c + 1) !== '.') {
        let s = ''; for (let k = c; cell(r, k) !== '.'; k++) s += cell(r, k);
        runs.add(`across:${r}:${c}:${s}`);
      }
      if (cell(r - 1, c) === '.' && cell(r + 1, c) !== '.') {
        let s = ''; for (let k = r; cell(k, c) !== '.'; k++) s += cell(k, c);
        runs.add(`down:${r}:${c}:${s}`);
      }
    }
  }
  const declared = new Set(cw.entries.map((e) => `${e.dir}:${e.row}:${e.col}:${e.answer}`));
  for (const run of runs) if (!declared.has(run)) problems.push(`unlisted run ${run}`);
  for (const d of declared) if (!runs.has(d)) problems.push(`entry not in grid ${d}`);
  return problems;
}

/** Cells (as "r,c" keys) of an entry, in reading order. */
export function entryCells(entry) {
  return Array.from({ length: entry.len }, (_, k) =>
    [entry.row + (entry.dir === 'down' ? k : 0), entry.col + (entry.dir === 'across' ? k : 0)]);
}

// ── Daily Double (Jeopardy / Millionaire STEAM board) ────────────────────
export const STEAM_CATEGORIES = ['Science', 'Technology', 'Engineering', 'Art', 'Math'];
export const DOUBLE_JEOPARDY_VALUES = [400, 800, 1200, 1600, 2000];

/**
 * Generate a 5x5 STEAM Jeopardy board for the given date key.
 * Each column is a STEAM category (Science, Technology, Engineering, Art, Math).
 * Each row is a Double Jeopardy dollar value ($400, $800, $1200, $1600, $2000).
 * Exactly 2 panels are secretly designated as "TRIPLE DOUBLE to the power of π" tiles.
 */
export function makeDailyDouble(key, bank, { rnd: customRnd } = {}) {
  const rnd = customRnd || rngFor(`daily-double:${key}`);
  const list = (bank && bank.questions) ? bank.questions : (Array.isArray(bank) ? bank : []);
  const grid = []; // 5 columns x 5 rows: grid[col][row]

  // Pick 2 distinct tile coordinates among the 25 tiles (col 0..4, row 0..4) to be Triple Double tiles
  const allCoords = [];
  for (let c = 0; c < 5; c++) {
    for (let r = 0; r < 5; r++) {
      allCoords.push({ col: c, row: r });
    }
  }
  const tdRnd = rngFor(`daily-double-td:${key}`);
  const shuffledCoords = shuffled(allCoords, tdRnd);
  const tripleDoubleSet = new Set([
    `${shuffledCoords[0].col},${shuffledCoords[0].row}`,
    `${shuffledCoords[1].col},${shuffledCoords[1].row}`
  ]);

  for (let c = 0; c < 5; c++) {
    const category = STEAM_CATEGORIES[c];
    const colTiles = [];
    for (let r = 0; r < 5; r++) {
      const difficulty = r + 1; // 1 to 5
      const value = DOUBLE_JEOPARDY_VALUES[r]; // 400, 800, 1200, 1600, 2000
      const candidates = list.filter((q) => q.category === category && q.difficulty === difficulty);
      const pool = candidates.length ? candidates : list.filter((q) => q.category === category);
      if (!pool.length) {
        throw new Error(`Daily Double bank missing questions for category ${category}, difficulty ${difficulty}`);
      }
      // A stable order per board position uses every question before repeating.
      // With four questions per position, reshuffling at cycle boundaries
      // would allow an immediate repeat; keep the order through each cycle.
      const index = ((dayNumber(key) % pool.length) + pool.length) % pool.length;
      const order = shuffled(pool, rngFor(`daily-double-rotation:${c}:${r}`));
      const rawQuestion = order[index];

      const choiceRnd = rngFor(`daily-double-choices:${key}:${c}:${r}`);
      const choices = shuffled(rawQuestion.choices, choiceRnd);
      const isTripleDouble = tripleDoubleSet.has(`${c},${r}`);

      colTiles.push({
        col: c,
        row: r,
        category,
        difficulty,
        value,
        id: rawQuestion.id,
        clue: rawQuestion.clue,
        answer: rawQuestion.answer,
        choices,
        correctIndex: choices.indexOf(rawQuestion.answer),
        lesson: rawQuestion.lesson,
        lessonTitle: rawQuestion.lessonTitle,
        explanation: rawQuestion.explanation,
        isTripleDouble,
        tripleDoubleFormula: '(3 × 2)^π ≈ 279'
      });
    }
    grid.push(colTiles);
  }

  return {
    key,
    categories: STEAM_CATEGORIES,
    values: DOUBLE_JEOPARDY_VALUES,
    grid, // grid[col][row]
    tripleDoubles: [shuffledCoords[0], shuffledCoords[1]]
  };
}

// ── Daily chess ──────────────────────────────────────────────────────────
/** Rotate through the curated mate-in-one/two positions before repeating. */
export function makeDailyChess(key, bank) {
  if (!bank.length) throw new Error('Daily chess needs at least one position');
  const order = shuffled(bank, rngFor('daily-chess-rotation:v1'));
  return { key, ...order[((dayNumber(key) % order.length) + order.length) % order.length] };
}

