import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VIEWS, PUZZLES, LEVELS, trim, size, drawings, parseSeg, segKey, unitSegments,
  shiftKey, gradeUnfold, gradeFold, randomPart, hasHiddenLines,
} from '../assets/js/blueprint-game/core.mjs';

const sorted = (set) => [...set].sort();

// Seeded RNG so generated parts are reproducible.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('a plain box draws as three outlines with no hidden lines', () => {
  const d = drawings([[2, 2, 2], [2, 2, 2]]); // 3 wide, 2 deep, 2 tall
  const outline = (w, h) => sorted(new Set([
    ...unitSegments(0, 0, w, 0), ...unitSegments(0, h, w, h),
    ...unitSegments(0, 0, 0, h), ...unitSegments(w, 0, w, h),
  ]));
  assert.deepEqual(sorted(d.top.visible), outline(3, 2));
  assert.deepEqual(sorted(d.front.visible), outline(3, 2));
  assert.deepEqual(sorted(d.right.visible), outline(2, 2));
  for (const v of VIEWS) assert.equal(d[v].hidden.size, 0);
});

test('L-bracket: the step shows in the right view, front view is a plain rectangle', () => {
  const d = drawings(PUZZLES.easy[0].heights); // [[3,3],[1,1],[1,1]]
  assert.ok(d.front.visible.has(segKey('h', 0, 1)), 'front shows the base top edge across the face');
  assert.ok(d.right.visible.has(segKey('v', 2, 1)), 'right view has the riser of the step');
  assert.ok(d.right.visible.has(segKey('h', 0, 1)), 'right view has the top of the base');
  assert.ok(!d.right.visible.has(segKey('h', 0, 3)), 'nothing over the base at full height');
});

test('a pocket hides behind its walls as dashed lines', () => {
  const d = drawings([[2, 2, 2], [2, 0, 2], [2, 2, 2]]);
  assert.deepEqual(sorted(d.front.hidden), sorted(['v:1,0', 'v:1,1', 'v:2,0', 'v:2,1']));
  assert.deepEqual(sorted(d.right.hidden), sorted(['v:1,0', 'v:1,1', 'v:2,0', 'v:2,1']));
  assert.equal(d.top.hidden.size, 0, 'nothing is hidden from above in a height map');
  assert.ok(d.top.visible.has('h:1,1') && d.top.visible.has('v:1,1'), 'top view outlines the pocket');
});

test('the top view of a height map never has hidden lines', () => {
  const r = rng(7);
  for (let i = 0; i < 60; i++) {
    const p = randomPart(['easy', 'medium', 'hard'][i % 3], r);
    assert.equal(drawings(p.heights).top.hidden.size, 0, JSON.stringify(p.heights));
  }
});

test('every hand-made puzzle is cropped, connected and fits its level', () => {
  for (const [level, list] of Object.entries(PUZZLES)) {
    assert.ok(LEVELS[level]);
    for (const p of list) {
      assert.deepEqual(trim(p.heights), p.heights, p.name + ' has empty border rows/columns');
      const { W, D, H } = size(p.heights);
      assert.ok(W >= 1 && D >= 1 && H >= 1 && Math.max(W, D, H) <= 5, p.name);
      if (LEVELS[level].hidden) assert.ok(hasHiddenLines(p.heights), p.name + ' should teach hidden lines');
    }
  }
});

test('views use third-angle coordinates: top view front edge at v = 0, right view front edge at u = 0', () => {
  // A single tall block at the front-left corner of a 2x2 plate.
  const d = drawings([[1, 1], [3, 1]]);
  assert.ok(d.top.visible.has('v:1,0'), 'tall block sits in the bottom-left square of the top view');
  assert.ok(d.right.visible.has('v:1,1') && d.right.visible.has('v:1,2'), 'tall block is on the left of the right view');
  assert.ok(d.front.visible.has('v:1,1') && d.front.visible.has('v:1,2'), 'and on the left of the front view');
});

test('drawing the true views passes, anywhere on the grid', () => {
  for (const p of [...PUZZLES.easy, ...PUZZLES.hard]) {
    const target = drawings(p.heights);
    const drawn = {};
    for (const v of VIEWS) {
      drawn[v] = {
        visible: new Set([...target[v].visible].map((k) => shiftKey(k, 2, -1))),
        hidden: new Set([...target[v].hidden].map((k) => shiftKey(k, 2, -1))),
      };
    }
    const res = gradeUnfold(target, drawn, { hidden: true });
    assert.ok(res.ok, p.name);
    assert.equal(res.views.front.du, 2);
  }
});

test('grading reports missing, extra and wrong-layer lines', () => {
  const target = drawings([[2, 2, 2], [2, 0, 2], [2, 2, 2]]);
  const drawn = {};
  for (const v of VIEWS) drawn[v] = { visible: new Set(target[v].visible), hidden: new Set() };
  // Easy rules: hidden lines don't count.
  assert.ok(gradeUnfold(target, drawn, { hidden: false }).ok);
  // Hard rules: the pocket's hidden lines are missing.
  const hard = gradeUnfold(target, drawn, { hidden: true });
  assert.ok(!hard.ok);
  assert.equal(hard.views.front.missingHidden.length, 4);
  // Drawn solid where they should be dashed: extra visible + flagged wrong layer.
  drawn.front.visible.add('v:1,0');
  const wrong = gradeUnfold(target, drawn, { hidden: false });
  assert.ok(!wrong.ok);
  assert.deepEqual(wrong.views.front.extraVisible, ['v:1,0']);
  assert.deepEqual(wrong.views.front.wrongLayer, ['v:1,0']);
  // A missing outline edge.
  drawn.front.visible.delete('v:1,0');
  drawn.top.visible.delete('h:0,0');
  const miss = gradeUnfold(target, drawn, { hidden: false });
  assert.deepEqual(miss.views.top.missingVisible, ['h:0,0']);
});

test('fold grading: the same solid passes wherever it sits on the bed', () => {
  const target = PUZZLES.medium[0].heights;
  const bed = Array.from({ length: 5 }, () => Array(5).fill(0));
  target.forEach((row, r) => row.forEach((h, c) => { bed[r + 1][c + 2] = h; }));
  assert.ok(gradeFold(target, bed).ok);
  bed[2][3] = 2; // shorten the tower
  const res = gradeFold(target, bed);
  assert.ok(!res.ok);
  assert.ok(!res.views.front.ok && !res.views.right.ok);
});

test('fold grading accepts a different solid with identical views', () => {
  // Swapping the two tall diagonal columns behind the front wall changes the solid
  // but none of its three views (found by brute force over 3x3 parts).
  const a = [[1, 3, 2], [3, 1, 2], [2, 2, 0]];
  const b = [[3, 1, 2], [1, 3, 2], [2, 2, 0]];
  assert.notDeepEqual(a, b);
  assert.ok(gradeFold(a, b).ok);
  const c = [[1, 2], [2, 2]];   // back-left lowered: top shows it, so it must fail
  assert.ok(!gradeFold([[2, 2], [2, 2]], c).ok);
});

test('generated parts are connected, cropped and differ from the hand-made list', () => {
  const r = rng(42);
  for (const level of Object.keys(LEVELS)) {
    for (let i = 0; i < 30; i++) {
      const p = randomPart(level, r, PUZZLES[level].map((x) => x.heights));
      assert.ok(p.generated, level + ' fell back to a hand-made part');
      assert.deepEqual(trim(p.heights), p.heights);
      assert.ok(size(p.heights).H >= 2);
      if (level === 'hard') assert.ok(hasHiddenLines(p.heights));
    }
  }
});

test('visible lines are always projected edges of the solid', () => {
  // drawings() classifies only real edges; a depth jump without an edge would be a bug.
  const r = rng(99);
  for (let i = 0; i < 80; i++) {
    const h = randomPart('hard', r).heights;
    const d = drawings(h);
    for (const v of VIEWS) for (const k of d[v].visible) {
      const { dir } = parseSeg(k);
      assert.ok(dir === 'h' || dir === 'v');
      assert.ok(!d[v].hidden.has(k));
    }
  }
});

test('unitSegments refuses slanted lines', () => {
  assert.equal(unitSegments(0, 0, 2, 1), null);
  assert.deepEqual(unitSegments(3, 1, 1, 1), ['h:1,1', 'h:2,1']);
  assert.deepEqual(unitSegments(0, 2, 0, 0), ['v:0,0', 'v:0,1']);
});
