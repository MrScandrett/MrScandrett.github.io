import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STARTERS,
  SHAPE_TYPES,
  SHAPE_FIELDS,
  expression,
  compile,
  parseBlocks,
  serializeBlocks
} from '../assets/js/lessons/codeblocks-play-model.mjs';

test('all starters compile cleanly with finite values and expected shape counts', () => {
  assert.deepEqual(SHAPE_TYPES, ['box', 'sphere', 'cylinder', 'cone', 'torus', 'prism', 'tube']);
  assert.equal(SHAPE_FIELDS.length, 10);
  for (const [key, starter] of Object.entries(STARTERS)) {
    const items = compile(starter.code, starter);
    assert.ok(items.length > 0, `${key} should emit at least one shape`);
    for (const item of items) {
      assert.ok(SHAPE_TYPES.includes(item.shape));
      assert.equal(item.values.length, 10);
      assert.ok(item.values.every(Number.isFinite));
    }
  }
});

test('all seven primitives compile with bounds enforcement', () => {
  const program = SHAPE_TYPES.map((shape, idx) => `${shape} ${idx * 10} 0 5 10 10 10 0 0 0 ${idx * 40}`).join('\n');
  const items = compile(program, { count: 2, twist: 15, rise: 2, radius: 10, size: 4 });
  assert.equal(items.length, SHAPE_TYPES.length * 2);
  assert.deepEqual(items.slice(0, SHAPE_TYPES.length).map((i) => i.shape), SHAPE_TYPES);

  assert.throws(
    () => compile('pyramid 0 0 0 5 5 5 0 0 0 100', { count: 1, twist: 0, rise: 0, radius: 10, size: 4 }),
    /Choose box, sphere, cylinder, cone, torus, prism or tube/
  );
  assert.throws(
    () => compile('cone 0 0 0 0 5 5 0 0 0 100', { count: 1, twist: 0, rise: 0, radius: 10, size: 4 }),
    /above 0 and at most 200/
  );
});

test('expression supports arithmetic, modulo, pi, and degree math functions', () => {
  const vars = { i: 3, twist: 30, radius: 12, size: 4 };
  assert.equal(expression('i*twist+5', vars), 95);
  assert.equal(expression('(radius+size)/2', vars), 8);
  assert.equal(expression('10%3', vars), 1);
  assert.ok(Math.abs(expression('sin(i*twist)', vars) - 1) < 1e-12);
  assert.ok(Math.abs(expression('cos(180)', vars) + 1) < 1e-12);
  assert.equal(expression('abs(-7.5)', vars), 7.5);
  assert.equal(expression('sqrt(16)', vars), 4);
  assert.equal(expression('round(3.6)', vars), 4);
  assert.equal(expression('min(radius,size)', vars), 4);
  assert.equal(expression('max(radius,size)', vars), 12);
  assert.ok(Math.abs(expression('2*pi', vars) - Math.PI * 2) < 1e-12);

  // Variable shadows pi if declared
  assert.equal(expression('pi+1', { ...vars, pi: 10 }), 11);

  // Error cases
  assert.throws(() => expression('unknownVar', vars), /Unknown value/);
  assert.throws(() => expression('1/0', vars), /finite number/);
  assert.throws(() => expression('1%0', vars), /finite number/);
  assert.throws(() => expression('(1+2', vars), /Missing closing parenthesis/);
  assert.throws(() => expression('sin(1,2)', vars), /takes 1 value/);
  assert.throws(() => expression('min(1)', vars), /two comma-separated values/);
  assert.throws(() => expression('tan(45)', vars), /Unknown function/);
});

test('parseBlocks and serializeBlocks round-trip starters, comments, data, modify, and raw lines', () => {
  for (const starter of Object.values(STARTERS)) {
    const blocks = parseBlocks(starter.code);
    const out = serializeBlocks(blocks);
    assert.deepEqual(parseBlocks(out).map((b) => ({ kind: b.kind, op: b.op, args: b.args, comment: b.comment })),
      blocks.map((b) => ({ kind: b.kind, op: b.op, args: b.args, comment: b.comment })));
  }

  const sample = [
    '# Leading comment',
    'let h abs(sin(i*twist))*10',
    'change h 2 # offset',
    'move 0 0 h',
    'color i*20',
    'torus radius 0 h 8 8 4 90 i*twist 0 180 # ring',
    'invalid syntax line here'
  ].join('\n');

  const parsed = parseBlocks(sample);
  assert.deepEqual(parsed.map((b) => b.kind), ['comment', 'data', 'data', 'modify', 'modify', 'shape', 'raw']);
  assert.equal(parsed[2].comment, 'offset');
  assert.equal(parsed[5].comment, 'ring');
  assert.equal(serializeBlocks(parsed), sample);
});
