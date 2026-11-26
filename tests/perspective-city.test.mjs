import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../assets/js/lessons/perspective-city-core.mjs';

test('every letter and digit is one connected footprint', () => {
  for (const ch of Object.keys(C.FONT)) {
    if ('!?'.includes(ch)) continue;
    const pieces = C.letterPieces(ch, 0, 0);
    assert.equal(pieces.length, 1, `${ch} splits into ${pieces.length} pieces`);
    assert.ok(C.area(pieces[0]) > 0, ch);
  }
});

test('letters with counters get a courtyard hole', () => {
  for (const ch of 'ABOPR0') assert.ok(C.letterPieces(ch, 0, 0)[0].length >= 2, ch);
  assert.equal(C.letterPieces('L', 0, 0)[0].length, 1);
});

test('traced outlines match the cell count', () => {
  const cells = C.FONT.E.join('').split('').filter(c => c === '#').length;
  assert.equal(C.area(C.letterPieces('E', 0, 0)[0]), cells);
});

test('a roof keeps its shape and scales by D / (D - h) from the VP', () => {
  const v = { ox: 0, oy: 0, s: 10, vx: 0, vy: 0, D: 40 };
  const [x] = C.project([4, 0], 20, v);
  assert.equal(x, 80);
  assert.deepEqual(C.project([4, 0], 0, v), [40, 0]);
});

test('walls only show when the VP is on their outside', () => {
  const [loop] = C.makeBuilding([C.rectLoop(0, 0, 2, 2)]).loops;
  const visible = (vx, vy) => loop.filter((a, i) => C.wallFacesCamera(a, loop[(i + 1) % 4], vx, vy)).length;
  assert.equal(visible(1, 1), 0);
  assert.equal(visible(1, -5), 1);
  assert.equal(visible(-5, -5), 2);
});

test('painter order draws far buildings first and each roof after its walls', () => {
  const near = C.makeBuilding([C.rectLoop(11, 11, 13, 13)], { h: 4 });
  const far = C.makeBuilding([C.rectLoop(1, 1, 3, 3)], { h: 4 });
  const ops = C.sketchOps([near, far], { ox: 0, oy: 0, s: 10, vx: 12, vy: 14, D: 40 });
  assert.equal(ops[0].b, far);
  assert.equal(ops.at(-1).b, near);
  assert.equal(ops.at(-1).kind, 'roof');
});

test('setbacks shrink and stack to the full height', () => {
  const b = C.makeBuilding([C.rectLoop(0, 0, 10, 10)], { h: 10, tiers: 3 });
  const t = C.tiersOf(b);
  assert.equal(t.length, 3);
  assert.equal(t.at(-1).z1, 10);
  assert.ok(C.area(t[2].loops) < C.area(t[0].loops));
});

test('save files round-trip and reject junk', () => {
  const city = { vx: 5, vy: 6, D: 50, buildings: C.sampleCity() };
  const back = C.parseCity(JSON.stringify(C.serializeCity(city)));
  assert.equal(back.buildings.length, city.buildings.length);
  assert.equal(back.D, 50);
  assert.throws(() => C.parseCity('{"format":"other"}'));
  assert.throws(() => C.parseCity({ format: 'classroomos-perspective-city', buildings: [{ loops: [[[0, 'x'], [1, 1], [2, 0]]] }] }));
});

test('self-intersecting shapes are caught', () => {
  assert.ok(C.selfIntersects([[0, 0], [2, 2], [2, 0], [0, 2]]));
  assert.ok(!C.selfIntersects(C.rectLoop(0, 0, 2, 2)));
});

test('random cities are deterministic per seed', () => {
  assert.deepEqual(C.serializeCity({ vx: 0, vy: 0, D: 44, buildings: C.randomCity(7) }), C.serializeCity({ vx: 0, vy: 0, D: 44, buildings: C.randomCity(7) }));
});
