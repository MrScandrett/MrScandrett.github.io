import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CARD_DECK_PRESETS,
  CHALLENGES,
  LOOM_COLS,
  LOOM_NOTES,
  NOTE_G_PRESETS,
  PRESET_ORDER,
  adaIndexToModern,
  buildEngineTrace,
  checkTraceSubmission,
  cloneLoomGrid,
  computeBernoulliModern,
  decodeBinaryCard,
  decodeDecimalCard,
  encodeBinaryCard,
  encodeDecimalCard,
  encodeLoomColumn,
  evaluateChallenges,
  executeCardDeck,
  fAdd,
  fDiv,
  fEq,
  fMul,
  fSub,
  formatFraction,
  frac,
  generateDeckPython,
  parseStudentNumber,
} from '../assets/js/lessons/ada-lovelace-engine.js';

test('exact BigInt rational arithmetic reduces and normalizes signs', () => {
  assert.equal(formatFraction(frac(-4, -6)), '2/3');
  assert.equal(formatFraction(frac(4, -6)), '−2/3');
  assert.equal(formatFraction(frac(0, 9)), '0');
  assert.equal(formatFraction(fAdd(frac(1, 6), frac(1, 3))), '1/2');
  assert.equal(formatFraction(fSub(frac(5, 18), frac(7, 15))), '−17/90');
  assert.equal(formatFraction(fMul(frac(-1, 30), frac(14, 1))), '−7/15');
  assert.equal(formatFraction(fDiv(frac(7, 9), frac(2, 1))), '7/18');
  assert.throws(() => frac(1, 0), RangeError);
  assert.throws(() => fDiv(frac(1, 2), frac(0, 1)), RangeError);
});

test('all five Note G / Warm-Up presets build valid traces', () => {
  assert.equal(PRESET_ORDER.length, 5);
  for (const id of PRESET_ORDER) {
    assert.ok(NOTE_G_PRESETS[id], `Missing preset ${id}`);
    const trace = buildEngineTrace(id);
    assert.ok(trace.steps.length >= 6, `Preset ${id} should have steps`);
  }
});

test('Note G n = 1 computes B1 = 1/6 in 10 steps (Setup + Ops 1-7 + Op 24 + Op 25)', () => {
  const trace = buildEngineTrace('note-g-n1', { injectOp4Bug: false });
  assert.equal(trace.steps.length, 10);
  const op7 = trace.steps.find((s) => s.opNum === 7);
  assert.equal(op7.branchTaken, 'skip-to-24');

  const last = trace.steps[trace.steps.length - 1];
  assert.deepEqual(last.tape.map((t) => [t.label, t.value]), [['B1', '1/6']]);
  assert.equal(last.columns.find((c) => c.id === 'V3').value, '2');
  assert.equal(last.columns.find((c) => c.id === 'V21').value, '1/6');
});

test('Note G n = 2 computes B3 = -1/30 and branches past inner loop at Op 12', () => {
  const trace = buildEngineTrace('note-g-n2', { injectOp4Bug: false });
  const op12 = trace.steps.find((s) => s.opNum === 12);
  assert.equal(op12.branchTaken, 'skip-to-24');
  assert.equal(trace.steps.some((s) => s.opNum === 13), false);

  const last = trace.steps[trace.steps.length - 1];
  assert.deepEqual(
    last.tape.map((t) => [t.label, t.value]),
    [
      ['B1', '1/6'],
      ['B3', '−1/30'],
    ],
  );
});

test('Note G n = 4 executes inner loop Ops 13-23 twice and matches B7 = -1/30', () => {
  const trace = buildEngineTrace('note-g-n4', { injectOp4Bug: false });
  const op13Steps = trace.steps.filter((s) => s.opNum === 13);
  assert.equal(op13Steps.length, 2, 'Inner loop Ops 13-23 must execute twice for n = 4');

  const op23Branches = trace.steps
    .filter((s) => s.opNum === 23)
    .map((s) => s.branchTaken);
  assert.deepEqual(op23Branches, ['loop-to-13', 'exit-loop']);

  const op24 = trace.steps.find((s) => s.opNum === 24);
  assert.equal(op24.columns.find((c) => c.id === 'V24').value, '−1/30');
  assert.deepEqual(
    op24.tape.map((t) => [t.label, t.value]),
    [
      ['B1', '1/6'],
      ['B3', '−1/30'],
      ['B5', '1/42'],
      ['B7', '−1/30'],
    ],
  );
});

test('Outer loop computes all four Bernoulli numbers B1, B3, B5, B7 from scratch', () => {
  const trace = buildEngineTrace('note-g-sequence', { injectOp4Bug: false });
  const last = trace.steps[trace.steps.length - 1];
  assert.deepEqual(
    last.tape.map((t) => [t.label, t.modernLabel, t.value]),
    [
      ['B1', 'B2', '1/6'],
      ['B3', 'B4', '−1/30'],
      ['B5', 'B6', '1/42'],
      ['B7', 'B8', '−1/30'],
    ],
  );
});

test('1843 Op 4 printing bug (V5 / V4) flags bugActive and produces corrupted B1 = 3/2 and B7 = 139/630', () => {
  const traceN1 = buildEngineTrace('note-g-n1', { injectOp4Bug: true });
  const op4N1 = traceN1.steps.find((s) => s.opNum === 4);
  assert.equal(op4N1.bugActive, true);
  assert.equal(op4N1.bugNote.expected, '1/3');
  assert.equal(op4N1.bugNote.actual, '3');
  assert.equal(traceN1.steps.at(-1).tape[0].value, '3/2');
  assert.equal(traceN1.steps.at(-1).tape[0].isBuggy, true);

  const traceN4 = buildEngineTrace('note-g-n4', { injectOp4Bug: true });
  assert.equal(traceN4.steps.at(-1).tape.find((t) => t.label === 'B7').value, '139/630');
});

test('Warm-up preset executes whole numbers with register overwrite in V4', () => {
  const trace = buildEngineTrace('warmup');
  assert.equal(trace.steps.length, 6);
  const overwriteStep = trace.steps.find((s) => s.overwrote);
  assert.deepEqual(overwriteStep.overwrote, { reg: 'V4', oldVal: '40', newVal: '24' });
  assert.equal(trace.steps.at(-1).columns.find((c) => c.id === 'V7').value, '47');
});

test('Modern Bernoulli recurrence produces exact values through B8', () => {
  const B = computeBernoulliModern(8);
  assert.equal(formatFraction(B[0]), '1');
  assert.equal(formatFraction(B[1]), '−1/2');
  assert.equal(formatFraction(B[2]), '1/6');
  assert.equal(formatFraction(B[3]), '0');
  assert.equal(formatFraction(B[4]), '−1/30');
  assert.equal(formatFraction(B[5]), '0');
  assert.equal(formatFraction(B[6]), '1/42');
  assert.equal(formatFraction(B[7]), '0');
  assert.equal(formatFraction(B[8]), '−1/30');
  assert.equal(adaIndexToModern(7), 8);
});

test('Punch-Card Programmer VM runs preset decks, handles divide-by-zero, and emits Python', () => {
  const bill = executeCardDeck(CARD_DECK_PRESETS['ticket-bill']);
  assert.equal(bill.error, null);
  assert.equal(bill.finalRegisters.V5, '46');
  assert.equal(bill.finalRegisters.V6, '23');
  assert.equal(bill.steps[1].overwrote, true);

  const pow2 = executeCardDeck(CARD_DECK_PRESETS['powers-of-2']);
  assert.equal(pow2.error, null);
  assert.equal(pow2.finalRegisters.V1, '32');

  const fib = executeCardDeck(CARD_DECK_PRESETS['fibonacci-loop']);
  assert.equal(fib.error, null);
  assert.equal(fib.finalRegisters.V2, '8');

  const divZero = executeCardDeck({
    initialRegisters: { V1: 10, V2: 0 },
    cards: [{ op: '/', a: 'V1', b: 'V2', dest: 'V4' }],
    repeatCount: 1,
  });
  assert.ok(divZero.error);
  assert.match(divZero.error, /Division by zero/);

  const py = generateDeckPython(CARD_DECK_PRESETS['powers-of-2']);
  assert.match(py, /for pass_num in range\(1, 6\):/);
  assert.match(py, /v1 = v1 \* v2/);
});

test('Decimal and Binary card encoders roundtrip cleanly', () => {
  for (const val of [0, 7, 42, 161, 255]) {
    assert.equal(decodeBinaryCard(encodeBinaryCard(val)), val);
  }
  for (const val of [0, 4, 42, 184, 999]) {
    assert.equal(decodeDecimalCard(encodeDecimalCard(val)), val);
  }
});

test('Poetical Science Loom encodes columns into binary, decimal, chord, and heddles', () => {
  assert.equal(LOOM_NOTES.length, 6);
  const grid = cloneLoomGrid('victorian-chime');
  assert.equal(grid.length, 6);
  assert.equal(grid[0].length, LOOM_COLS);

  const col0 = encodeLoomColumn(grid, 0);
  // Rows 3 (E4, bit 2=4) and 5 (C4, bit 0=1) -> 000101 = 5
  assert.equal(col0.binary, '000101');
  assert.equal(col0.decimal, 5);
  assert.deepEqual(col0.activeNotes, ['E4', 'C4']);
  assert.deepEqual(col0.liftedHeddles, [4, 6]);
});

test('Trace checker accepts integers, exact fractions, Unicode minus, and tolerance decimals', () => {
  assert.equal(fEq(parseStudentNumber('7/9').value, frac(7, 9)), true);
  assert.equal(fEq(parseStudentNumber('−7/18').value, frac(-7, 18)), true);

  const warmup = checkTraceSubmission('warmup-overwrite', ['40', '46', '23', '24', '47']);
  assert.equal(warmup.allCorrect, true);

  const bugHunt = checkTraceSubmission('note-g-bug-hunt', ['8', '7', '9', '7/9', '0.389', '−7/18']);
  assert.equal(bugHunt.allCorrect, true);

  const partial = checkTraceSubmission('note-g-bug-hunt', ['8', '7', '9', '9/7', '', '']);
  assert.equal(partial.allCorrect, false);
  assert.equal(partial.correctCount, 3);
});

test('Challenge evaluator tracks 5 mastery challenges', () => {
  assert.equal(CHALLENGES.length, 5);
  const initial = evaluateChallenges({});
  assert.equal(initial.filter((c) => c.completed).length, 0);

  const updated = evaluateChallenges({ 'run-note-g': true, 'catch-1843-bug': true });
  assert.equal(updated.filter((c) => c.completed).length, 2);
});
