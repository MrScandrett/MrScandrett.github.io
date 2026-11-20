import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const board = require('../assets/js/lessons/math-thinking-board.js');

const W = 400;
const H = 220;

test('empty board has no work and prompts the student', () => {
  const res = board.analyzeBoard({ strokes: [], counters: [], width: W, height: H });
  assert.equal(res.hasWork, false);
  assert.equal(res.counterCount, 0);
  assert.equal(res.strokeCount, 0);
  assert.equal(res.kind, 'empty');
  assert.equal(res.summary, 'Draw or place counters to show your strategy.');
  assert.equal(res.noteText, '');
});

test('pen strokes alone are reported as a sketch, never as counters', () => {
  const arrowStroke = {
    points: [
      { x: 0.35, y: 0.45 },
      { x: 0.2, y: 0.5 },
      { x: 0.35, y: 0.58 }
    ]
  };
  const one = board.analyzeBoard({ strokes: [arrowStroke], counters: [], width: W, height: H });
  assert.equal(one.hasWork, true);
  assert.equal(one.counterCount, 0);
  assert.equal(one.strokeCount, 1);
  assert.equal(one.kind, 'sketch');
  assert.equal(one.summary, 'Sketch on board (1 stroke)');
  assert.equal(one.noteText, 'My sketch shows my strategy: ');

  const three = board.analyzeBoard({ strokes: [arrowStroke, arrowStroke, arrowStroke], counters: [], width: W, height: H });
  assert.equal(three.counterCount, 0);
  assert.equal(three.strokeCount, 3);
  assert.equal(three.summary, 'Sketch on board (3 strokes)');
});

test('single vs multiple counters use singular and plural grammar', () => {
  const one = board.analyzeBoard({
    strokes: [],
    counters: [{ x: 0.5, y: 0.5, group: 0 }],
    width: W,
    height: H
  });
  assert.equal(one.kind, 'count');
  assert.equal(one.summary, '1 counter');
  assert.equal(one.noteText, 'My model shows 1 counter.');

  const three = board.analyzeBoard({
    strokes: [],
    counters: [
      { x: 0.45, y: 0.5, group: 0 },
      { x: 0.5, y: 0.5, group: 0 },
      { x: 0.55, y: 0.5, group: 0 }
    ],
    width: W,
    height: H
  });
  assert.equal(three.kind, 'count');
  assert.equal(three.summary, '3 counters');
  assert.equal(three.noteText, 'My model shows 3 counters.');
});

test('toggled solid and outlined counters report explicit two-group split', () => {
  const res = board.analyzeBoard({
    strokes: [],
    counters: [
      { x: 0.3, y: 0.5, group: 0 },
      { x: 0.4, y: 0.5, group: 0 },
      { x: 0.5, y: 0.5, group: 1 }
    ],
    width: W,
    height: H
  });
  assert.equal(res.kind, 'two-groups');
  assert.equal(res.summary, '2 groups: 2 + 1 = 3 counters');
  assert.equal(res.noteText, 'My model shows 2 groups: 2 + 1 = 3 counters.');
});

test('aligned 3x4 grid of counters is recognized as a rectangular array', () => {
  const counters = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      counters.push({
        x: 0.2 + c * 0.15,
        y: 0.22 + r * 0.24,
        group: 0
      });
    }
  }
  const res = board.analyzeBoard({ strokes: [], counters, width: W, height: H });
  assert.equal(res.kind, 'array');
  assert.equal(res.summary, 'Array: 3 × 4 = 12 counters');
  assert.equal(res.noteText, 'My model shows an array of 3 rows × 4 columns = 12 counters.');
});

test('diagonal non-grid counters are NOT falsely reported as an array', () => {
  const counters = [
    { x: 0.15, y: 0.2, group: 0 },
    { x: 0.35, y: 0.22, group: 0 },
    { x: 0.45, y: 0.55, group: 0 },
    { x: 0.65, y: 0.57, group: 0 }
  ];
  const res = board.analyzeBoard({ strokes: [], counters, width: W, height: H });
  assert.notEqual(res.kind, 'array');
});

test('well-separated clusters report spatial 2-group split', () => {
  const counters = [
    { x: 0.16, y: 0.48, group: 0 },
    { x: 0.22, y: 0.5, group: 0 },
    { x: 0.19, y: 0.56, group: 0 },
    { x: 0.78, y: 0.48, group: 0 },
    { x: 0.84, y: 0.52, group: 0 }
  ];
  const res = board.analyzeBoard({ strokes: [], counters, width: W, height: H });
  assert.equal(res.kind, 'spatial-groups');
  assert.equal(res.summary, '2 groups: 3 + 2 = 5 counters');
  assert.equal(res.noteText, 'My model shows 2 groups: 3 + 2 = 5 counters.');

  // Evenly spaced counters in a single row should stay a single count, not split into 2 + 1
  const evenlySpaced = board.analyzeBoard({
    strokes: [],
    counters: [
      { x: 0.2, y: 0.4, group: 0 },
      { x: 0.3, y: 0.4, group: 0 },
      { x: 0.4, y: 0.4, group: 0 }
    ],
    width: W,
    height: H
  });
  assert.equal(evenlySpaced.kind, 'count');
  assert.equal(evenlySpaced.summary, '3 counters');
});

test('counters alongside strokes append sketch suffix to summary', () => {
  const res = board.analyzeBoard({
    strokes: [{ points: [{ x: 0.1, y: 0.2 }, { x: 0.9, y: 0.2 }] }],
    counters: [
      { x: 0.45, y: 0.5, group: 0 },
      { x: 0.55, y: 0.5, group: 0 }
    ],
    width: W,
    height: H
  });
  assert.equal(res.kind, 'count');
  assert.equal(res.summary, '2 counters · with sketch');
});

test('hitTestCounter finds topmost counter within radius and ignores misses', () => {
  const counters = [
    { x: 0.5, y: 0.5, group: 0 },
    { x: 0.51, y: 0.5, group: 1 }
  ];
  assert.equal(board.hitTestCounter(counters, 200, 110, W, H, 16), 1);
  assert.equal(board.hitTestCounter(counters, 20, 20, W, H, 16), -1);
});

test('hitTestStroke handles multi-point segments and single-point dots', () => {
  const strokes = [
    { points: [{ x: 0.1, y: 0.2 }, { x: 0.4, y: 0.2 }] },
    { points: [{ x: 0.8, y: 0.8 }] }
  ];
  // Point along first horizontal segment at y = 44 (0.2 * 220), x = 100 (between 40 and 160)
  assert.equal(board.hitTestStroke(strokes, 100, 50, W, H, 12), 0);
  // Single-point dot at (320, 176)
  assert.equal(board.hitTestStroke(strokes, 323, 179, W, H, 12), 1);
  // Far away miss
  assert.equal(board.hitTestStroke(strokes, 250, 100, W, H, 12), -1);
});

test('appendNote inserts cleanly, preserves existing notes, and avoids duplicates', () => {
  assert.equal(board.appendNote('', 'My model shows 3 counters.'), 'My model shows 3 counters.');
  assert.equal(
    board.appendNote('I counted by ones.  \n', 'My model shows 3 counters.'),
    'I counted by ones.\nMy model shows 3 counters.'
  );
  const existing = 'I counted by ones.\nMy model shows 3 counters.';
  assert.equal(board.appendNote(existing, 'My model shows 3 counters.'), existing);
  assert.equal(board.appendNote('Existing work', ''), 'Existing work');
});

test('cloneState creates deep copies independent of source arrays', () => {
  const strokes = [{ points: [{ x: 0.1, y: 0.2 }] }];
  const counters = [{ x: 0.5, y: 0.5, group: 0 }];
  const copy = board.cloneState(strokes, counters);
  copy.strokes[0].points[0].x = 0.9;
  copy.counters[0].group = 1;
  assert.equal(strokes[0].points[0].x, 0.1);
  assert.equal(counters[0].group, 0);
});
