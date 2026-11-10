import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const C = require('../assets/js/lessons/bridge-lab-core.js');

const N = (id, x, y, fixed) => ({ id, x, y, fixed: Boolean(fixed) });
function build(nodes, pairs) {
  const lookup = C.nodeMapFrom(nodes);
  return {
    nodes,
    members: pairs.map(([a, b, type], id) => ({ id, a, b, type, restLength: C.distance(lookup.get(a), lookup.get(b)) }))
  };
}
const deckNodes = () => [N(0, 170, 172, 1), N(1, 280, 172), N(2, 390, 172), N(3, 500, 172), N(4, 610, 172, 1)];
const ROAD = [[0, 1, 'road'], [1, 2, 'road'], [2, 3, 'road'], [3, 4, 'road']];

// The lesson's "Load Example" (createExampleState in the page): a Warren truss under the deck.
const example = () => build(
  [...deckNodes(), N(5, 225, 244), N(6, 335, 244), N(7, 445, 244), N(8, 555, 244)],
  [...ROAD, [0, 5, 'wood'], [5, 1, 'wood'], [1, 6, 'wood'], [6, 2, 'wood'], [2, 7, 'wood'], [7, 3, 'wood'],
    [3, 8, 'wood'], [8, 4, 'wood'], [5, 6, 'steel'], [6, 7, 'steel'], [7, 8, 'steel']]
);
const starter = () => build(deckNodes(), ROAD);

test('the worked example reaches the clinic within budget, every triangle doing work', () => {
  const state = example();
  const run = C.simulateCrossing(state);
  assert.equal(run.status, 'arrived');
  assert.ok(C.computeCost(state) <= C.LEVEL_BUDGET, 'example is within budget');
  const bracing = C.bracingTriangles(state);
  assert.ok(bracing.length >= C.REQUIRED_TRIANGLES);
  assert.equal(C.loadedTriangles(bracing, run.peakRatios).length, bracing.length, 'every truss triangle carries load');
  assert.equal(C.idleMembers(state, run.peakRatios).length, 0, 'no idle members in the example');
});

test('the flat starter deck fails under its own weight and the ambulance', () => {
  const run = C.simulateCrossing(starter());
  assert.equal(run.status, 'fail');
});

test('one member cannot span the gap from bank to bank', () => {
  // Two fixed anchors never move, so a single bank-to-bank member used to "pass" with no triangles.
  const gap = C.BUILD_ZONE.right - C.BUILD_ZONE.left;
  for (const type of Object.keys(C.MATERIALS)) {
    assert.ok(C.memberTooLong(type, gap), type + ' cannot span ' + C.toMeters(gap) + ' m');
  }
  assert.ok(!C.memberTooLong('road', 110), 'a starter road panel is allowed');
  assert.ok(!C.memberTooLong('wood', Math.hypot(110, 72)), 'a 2x2 grid diagonal brace is allowed in wood');
  // Every member of the shipped designs is within its limit.
  for (const state of [example(), starter()]) {
    for (const m of state.members) assert.ok(!C.memberTooLong(m.type, m.restLength), 'member ' + m.id);
  }
});

test('flat "triangles" and triangles away from the road do not count', () => {
  // Three road joints in a line joined pairwise: a triangle with no area.
  const flat = build(deckNodes(), [...ROAD, [0, 2, 'steel']]);
  const tris = C.analyzeTriangles(flat);
  assert.equal(tris.length, 1);
  assert.equal(tris[0].flat, true);
  assert.equal(C.bracingTriangles(flat).length, 0);
  // A real triangle floating off a wood member, touching no road joint.
  const floating = build([...deckNodes(), N(5, 280, 244), N(6, 335, 244), N(7, 335, 208)],
    [...ROAD, [1, 5, 'wood'], [5, 6, 'wood'], [6, 7, 'wood'], [5, 7, 'wood']]);
  const t = C.analyzeTriangles(floating);
  assert.equal(t.length, 1);
  assert.equal(t[0].flat, false);
  assert.equal(t[0].bracing, false);
});

test('triangles hung where the ambulance does not push carry no load', () => {
  // Four triangles stacked above the left anchor and first joint, plus the flat deck.
  const state = build([...deckNodes(), N(5, 170, 136), N(6, 225, 136), N(7, 225, 100)],
    [...ROAD, [0, 5, 'wood'], [5, 6, 'wood'], [0, 6, 'wood'], [6, 7, 'wood'], [5, 7, 'wood']]);
  const run = C.simulateCrossing(state);
  const bracing = C.bracingTriangles(state);
  assert.ok(bracing.length >= 1);
  assert.equal(C.loadedTriangles(bracing, run.peakRatios).length, 0);
  assert.ok(C.idleMembers(state, run.peakRatios).length >= 3);
});

test('the verdict does not depend on frame rate or test speed', () => {
  // The page calls advanceCrossing a whole number of times per screen frame; only the tick count
  // decides the outcome, so replaying the same ticks in different frame groupings must match.
  for (const make of [example, starter]) {
    const a = C.simulateCrossing(make());
    const state = make();
    const b = C.createCrossing(state);
    let frame = 0;
    while (b.status === 'running') {
      const ticksThisFrame = [1, 2, 4, 0, 3][frame++ % 5]; // 120 Hz, 2×, a slow frame, ...
      for (let i = 0; i < ticksThisFrame && b.status === 'running'; i += 1) C.advanceCrossing(state, b);
    }
    assert.equal(b.status, a.status);
    assert.equal(b.ticks, a.ticks);
    assert.equal(b.maxSag, a.maxSag);
  }
});

test('sag is deflection from where the road was built, not from the bank height', () => {
  // A deck deliberately built one grid row low in the middle has not sagged before any load.
  const nodes = deckNodes();
  nodes[2].y = 172 + 36;
  const state = build(nodes, ROAD);
  const sim = C.createSimulationNodes(state);
  const m = C.measureBridge(state, sim, C.findRoadPath(state));
  assert.equal(m.maxSag, 0);
  assert.ok(m.maxSlope > 0, 'its slope still counts');
});

test('the page loads the core and keeps no second copy of the physics', () => {
  const html = fs.readFileSync(new URL('../lessons/engineering/mechanical-and-civil-design/bridge-over-troubled-water.html', import.meta.url), 'utf8');
  assert.match(html, /assets\/js\/lessons\/bridge-lab-core\.js/);
  assert.doesNotMatch(html, /function (countTriangles|measureBridge|findRoadPath|stressSample)\(/);
  assert.doesNotMatch(html, /const MATERIALS = \{/);
});
