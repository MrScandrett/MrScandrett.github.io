import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// BreadboardCore is a classic browser script with no DOM in it.
const sandbox = {};
vm.runInNewContext(fs.readFileSync('assets/js/lessons/breadboard-basics-core.js', 'utf8') + '\nthis.BreadboardCore = BreadboardCore;', sandbox);
const B = sandbox.BreadboardCore;
// Array.from: the script runs in its own vm realm, so its arrays are not this realm's Array
const keys = (holes) => Array.from(holes, (h) => `${h.row}${h.col}`).sort();
const joined = (r1, c1, r2, c2) => B.getConnected(r1, c1).some((h) => h.row === r2 && h.col === c2);

test('a power rail is one long strip: every hole in the row is joined', () => {
  for (const rail of B.RAIL_ROWS) {
    const holes = B.getConnected(rail, 7);
    assert.equal(holes.length, B.COLS);
    assert.ok(holes.every((h) => h.row === rail));
    assert.deepEqual(Array.from(holes, (h) => h.col), Array.from({ length: B.COLS }, (_, i) => i + 1));
  }
  // + and − rails never touch each other
  assert.equal(joined('rail-top-plus', 1, 'rail-top-minus', 1), false);
  assert.equal(joined('rail-top-plus', 1, 'rail-bot-plus', 1), false);
});

test('a terminal strip joins the five holes of one column, on one side of the gap', () => {
  assert.deepEqual(keys(B.getConnected('c', 4)), ['a4', 'b4', 'c4', 'd4', 'e4']);
  assert.deepEqual(keys(B.getConnected('h', 12)), ['f12', 'g12', 'h12', 'i12', 'j12']);
  assert.equal(joined('a', 4, 'e', 4), true);
  assert.equal(joined('a', 4, 'a', 5), false, 'neighbouring columns are separate');
  assert.equal(joined('e', 4, 'f', 4), false, 'the centre gap splits the column (so a chip can straddle it)');
});

test('connection is symmetric, and every hole is joined to itself', () => {
  const rows = [...B.RAIL_ROWS, ...B.TIE_ROWS_TOP, ...B.TIE_ROWS_BOT];
  for (const r1 of rows) for (const c1 of [1, 9, B.COLS]) {
    assert.equal(joined(r1, c1, r1, c1), true);
    for (const h of B.getConnected(r1, c1)) assert.equal(joined(h.row, h.col, r1, c1), true, `${h.row}${h.col} ↔ ${r1}${c1}`);
  }
  assert.deepEqual(Array.from(B.getConnected('gap', 3)), []);
  assert.deepEqual(Array.from(B.getConnected('z', 3)), []);
});

test('every row has metadata and belongs to exactly one group', () => {
  const rows = [...B.RAIL_ROWS, ...B.TIE_ROWS_TOP, ...B.TIE_ROWS_BOT];
  assert.deepEqual(Object.keys(B.ROW_META).sort(), [...rows].sort());
  for (const r of B.TIE_ROWS_TOP) assert.equal(B.ROW_META[r].half, 'top');
  for (const r of B.TIE_ROWS_BOT) assert.equal(B.ROW_META[r].half, 'bot');
  for (const r of B.RAIL_ROWS) assert.equal(B.ROW_META[r].type, 'rail');
});

test('pointMatches: a rail target matches any column; a hole target needs its column', () => {
  assert.equal(B.pointMatches({ row: 'rail-top-plus', col: 14 }, { row: 'rail-top-plus' }), true);
  assert.equal(B.pointMatches({ row: 'a', col: 3 }, { row: 'a', col: 3 }), true);
  assert.equal(B.pointMatches({ row: 'a', col: 4 }, { row: 'a', col: 3 }), false);
  assert.equal(B.pointMatches({ special: 'bat+' }, { special: 'bat+' }), true);
  assert.equal(B.pointMatches({ special: 'bat-' }, { special: 'bat+' }), false);
  assert.equal(B.pointMatches(null, { row: 'a' }), false);
});

const wire = (type, from, to) => ({ type, from, to });
const RED = wire('wire-red', { special: 'bat+' }, { row: 'rail-top-plus', col: 2 });
const BLACK = wire('wire-black', { row: 'rail-top-minus', col: 5 }, { special: 'bat-' }); // drawn backwards on purpose
const RESISTOR = wire('resistor', { row: 'a', col: 6 }, { row: 'a', col: 3 });
const LED = wire('led', { row: 'b', col: 6 }, { row: 'b', col: 9 });
const LOOP_IN = wire('wire-red', { row: 'rail-top-plus', col: 3 }, { row: 'a', col: 3 });
const LOOP_OUT = wire('wire-black', { row: 'a', col: 9 }, { row: 'rail-top-minus', col: 9 });

test('wires and resistors may be placed in either direction', () => {
  assert.equal(B.hasPoweredRails([RED, BLACK]), true);
  assert.equal(B.hasPoweredRails([RED]), false, 'needs both rails');
  assert.equal(B.hasPoweredRails([wire('wire-black', RED.from, RED.to), BLACK]), false, 'red wire must be the + one');
  assert.equal(B.hasResistor([RESISTOR]), true);
  assert.equal(B.hasResistor([wire('resistor', { row: 'a', col: 3 }, { row: 'a', col: 6 })]), true);
  assert.equal(B.hasResistor([wire('resistor', { row: 'a', col: 3 }, { row: 'a', col: 7 })]), false);
  assert.equal(B.hasLoopWires([LOOP_IN, LOOP_OUT]), true);
  assert.equal(B.hasLoopWires([LOOP_IN]), false);
});

test('an LED is a diode: only anode → cathode counts', () => {
  assert.equal(B.hasLed([LED]), true);
  assert.equal(B.hasLed([wire('led', LED.to, LED.from)]), false, 'backwards LED');
});

test('allowedEndpoints offers only the holes each challenge step uses', () => {
  assert.equal(B.allowedEndpoints(1, 'wire-red').length, 2);
  assert.equal(B.allowedEndpoints(3, 'led').length, 1, 'the LED must start at its anode');
  assert.equal(B.allowedEndpoints(2, 'led').length, 0);
  assert.equal(B.allowedEndpoints(9, 'wire-red').length, 0);
  // each finished part starts on a hole its own step allows
  assert.ok(B.allowedEndpoints(2, 'resistor').some((e) => B.pointMatches(RESISTOR.from, e)));
  assert.ok(B.allowedEndpoints(4, 'wire-black').some((e) => B.pointMatches(LOOP_OUT.from, e)));
});

test('the finished challenge is a real closed circuit on the board', () => {
  // Follow the current using the board's own strips: battery + → red rail → a3 → resistor → column 6
  // → LED → column 9 → blue rail → battery −.
  const parts = [RED, BLACK, RESISTOR, LED, LOOP_IN, LOOP_OUT];
  assert.ok(B.hasPoweredRails(parts) && B.hasResistor(parts) && B.hasLed(parts) && B.hasLoopWires(parts));
  const id = (p) => (p.special ? p.special : `${p.row}:${p.col}`);
  const net = new Map(); // union–find over holes
  const find = (k) => { while (net.has(k) && net.get(k) !== k) k = net.get(k); return k; };
  const union = (a, b) => { a = find(a); b = find(b); if (!net.has(a)) net.set(a, a); if (!net.has(b)) net.set(b, b); net.set(a, b); };
  const strips = (p) => { if (!p.special) for (const h of B.getConnected(p.row, p.col)) union(id(p), id(h)); };
  for (const part of parts) { strips(part.from); strips(part.to); }
  for (const part of parts) if (part.type.startsWith('wire')) union(id(part.from), id(part.to));
  const sameNet = (a, b) => find(id(a)) === find(id(b));
  assert.ok(sameNet({ special: 'bat+' }, RESISTOR.to), 'battery + reaches the resistor');
  assert.ok(sameNet(RESISTOR.from, LED.from), 'resistor and LED anode share column 6');
  assert.ok(sameNet(LED.to, { special: 'bat-' }), 'LED cathode returns to battery −');
  assert.ok(!sameNet({ special: 'bat+' }, { special: 'bat-' }), 'no short circuit: current must pass through the parts');
  assert.ok(!sameNet(RESISTOR.to, RESISTOR.from), 'the resistor is not bypassed');
  assert.ok(!sameNet(LED.from, LED.to), 'the LED is not bypassed');
});
