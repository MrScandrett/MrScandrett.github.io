import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const M = require('../assets/js/lessons/mst-core.js');

// Brute force: the cheapest set of n-1 edges that spans the graph.
function bruteForceCost(g) {
  const n = g.nodes.length, m = g.edges.length;
  let best = Infinity;
  (function pick(start, chosen) {
    if (chosen.length === n - 1) {
      const r = M.checkTree(g, chosen);
      if (r.spanning) best = Math.min(best, r.cost);
      return;
    }
    for (let i = start; i < m; i++) pick(i + 1, chosen.concat(i));
  })(0, []);
  return best;
}

// The lesson's worked example: A–E with seven cable links.
const worked = {
  nodes: Array.from({ length: 5 }, (_, i) => ({ x: i / 4, y: 0.5 })),
  edges: [
    { a: 0, b: 1, w: 2 }, { a: 1, b: 2, w: 3 }, { a: 0, b: 2, w: 4 }, { a: 2, b: 3, w: 5 },
    { a: 1, b: 3, w: 6 }, { a: 3, b: 4, w: 7 }, { a: 2, b: 4, w: 8 }
  ]
};

test('the worked example traces exactly as the lesson describes', () => {
  const k = M.kruskalTrace(worked);
  assert.deepEqual(k.steps.map((s) => [s.edge, s.action]), [
    [0, 'add'], [1, 'add'], [2, 'reject'], [3, 'add'], [4, 'reject'], [5, 'add']
  ], 'C–E (8) is never inspected');
  assert.equal(k.cost, 17);
  assert.deepEqual(k.steps[2].cycle, [0, 1], 'A–C is rejected because A–B–C already joins them');
  assert.equal(M.primTrace(worked, 0).cost, 17);
});

test('generated graphs are connected, seeded and labelled', () => {
  for (let n = 5; n <= 12; n++) {
    for (let seed = 1; seed <= 40; seed++) {
      const g = M.makeGraph(n, seed);
      assert.equal(g.nodes.length, n);
      assert.equal(M.components(n, g.edges.map((_, i) => i), g.edges).count, 1, `n=${n} seed=${seed} connected`);
      g.nodes.forEach((p) => assert.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1));
      g.edges.forEach((e) => assert.ok(Number.isInteger(e.w) && e.w >= 1 && e.a < e.b));
    }
  }
  assert.deepEqual(M.makeGraph(8, 7), M.makeGraph(8, 7), 'same seed, same graph');
});

test('Kruskal and Prim always agree, and both are optimal', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const n = 5 + (seed % 3);            // small enough to brute force
    const g = M.makeGraph(n, seed);
    const k = M.kruskalTrace(g);
    const best = bruteForceCost(g);
    assert.equal(k.cost, best, `seed ${seed}: Kruskal optimal`);
    for (let start = 0; start < n; start++) assert.equal(M.primTrace(g, start).cost, best, `seed ${seed} start ${start}`);
    assert.equal(k.tree.length, n - 1);
    assert.ok(M.checkTree(g, k.tree).optimal);
  }
});

test('every Kruskal rejection names a real cycle through existing tree edges', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const g = M.makeGraph(9, seed);
    M.kruskalTrace(g).steps.filter((s) => s.action === 'reject').forEach((s) => {
      assert.ok(s.cycle && s.cycle.length >= 2);
      s.cycle.forEach((i) => assert.ok(s.tree.includes(i)));
      // The path's edges plus the rejected one form a closed loop: every node has even degree.
      const deg = new Map();
      s.cycle.concat(s.edge).forEach((i) => [g.edges[i].a, g.edges[i].b].forEach((v) => deg.set(v, (deg.get(v) || 0) + 1)));
      deg.forEach((d) => assert.equal(d % 2, 0));
    });
  }
});

test('Prim always picks the cheapest edge across the cut', () => {
  const g = M.makeGraph(10, 3);
  M.primTrace(g, 0).steps.forEach((s) => {
    const min = Math.min(...s.frontier.map((i) => g.edges[i].w));
    assert.equal(g.edges[s.edge].w, min);
    assert.ok(s.frontier.includes(s.edge));
  });
});

test('checkTree explains what is wrong with a student tree', () => {
  const cyc = M.checkTree(worked, [0, 1, 2]);
  assert.equal(cyc.hasCycle, true);
  assert.equal(cyc.cycleEdge, 2);
  assert.equal(cyc.spanning, false);
  const gaps = M.checkTree(worked, [0, 3]);
  assert.equal(gaps.pieces, 3);
  const costly = M.checkTree(worked, [0, 2, 4, 6]);
  assert.equal(costly.spanning, true);
  assert.equal(costly.optimal, false);
  assert.equal(costly.cost - costly.best, 3);
});
