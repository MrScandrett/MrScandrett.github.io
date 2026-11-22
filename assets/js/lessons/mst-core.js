/* Minimum spanning trees: the maths behind the MST lesson, with no DOM.
 *
 *   const g = MstCore.makeGraph(8, 42);        // seeded, always connected
 *   MstCore.kruskalTrace(g)                     // every decision Kruskal makes, in order
 *   MstCore.primTrace(g, 0)                     // every node Prim pulls in, in order
 *   MstCore.checkTree(g, [0, 3, 5])             // grade a student's own choice of edges
 *
 * Node positions are in 0..1 so the page can scale them to any canvas size.
 * Ties in weight are broken by edge index, so both traces are deterministic and
 * always reach the same total cost.
 * Tests: node --test tests/mst-core.test.mjs
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MstCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const label = (i) => String.fromCharCode(65 + i);

  /* n nodes spread over a 0..1 box (aspect ≈ 2:1 on screen), each joined to its
     nearest neighbours, then a random path so the graph is always connected.
     Weights follow distance plus noise, so short links are usually cheap. */
  function makeGraph(n, seed) {
    const rand = rng(seed);
    const nodes = [];
    const minGap = 0.62 / Math.sqrt(n);
    let attempts = 0;
    while (nodes.length < n) {
      attempts++;
      const x = rand(), y = rand();
      const gap = attempts > 3000 ? 0 : minGap;
      if (nodes.every((p) => Math.hypot((p.x - x) * 2, p.y - y) >= gap * 1.4)) nodes.push({ x, y });
    }
    const edges = [];
    const seen = new Set();
    // An edge that passes right by a third node looks like it ends there; skip it.
    function grazes(a, b) {
      const ax = nodes[a].x * 2, ay = nodes[a].y, dx = nodes[b].x * 2 - ax, dy = nodes[b].y - ay;
      return nodes.some((p, i) => {
        if (i === a || i === b) return false;
        const t = ((p.x * 2 - ax) * dx + (p.y - ay) * dy) / (dx * dx + dy * dy);
        return t > 0 && t < 1 && Math.hypot(ax + t * dx - p.x * 2, ay + t * dy - p.y) < 0.075;
      });
    }
    function add(a, b, force) {
      if (a === b) return;
      const key = a < b ? a + '-' + b : b + '-' + a;
      if (seen.has(key) || (!force && grazes(a, b))) return;
      seen.add(key);
      const d = Math.hypot((nodes[a].x - nodes[b].x) * 2, nodes[a].y - nodes[b].y);
      edges.push({ a: Math.min(a, b), b: Math.max(a, b), w: Math.max(1, Math.round(d * 9 + rand() * 4)) });
    }
    nodes.forEach((p, i) => {
      nodes.map((q, j) => ({ j, d: Math.hypot((p.x - q.x) * 2, p.y - q.y) }))
        .filter((o) => o.j !== i)
        .sort((u, v) => u.d - v.d)
        .slice(0, 3)
        .forEach((o) => add(i, o.j));
    });
    // Join any separate clusters at their closest pair of nodes.
    for (;;) {
      const comp = components(n, edges.map((_, i) => i), edges);
      if (comp.count === 1) break;
      let best = null;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if (comp.of[i] !== 0 || comp.of[j] === 0) continue;
        const d = Math.hypot((nodes[i].x - nodes[j].x) * 2, nodes[i].y - nodes[j].y);
        if (!best || d < best.d) best = { i, j, d };
      }
      add(best.i, best.j, true);
    }
    return { nodes, edges, seed };
  }

  /* Union–find with path compression and union by rank. */
  function unionFind(n) {
    const parent = Array.from({ length: n }, (_, i) => i);
    const rank = new Array(n).fill(0);
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    function union(a, b) {
      let ra = find(a), rb = find(b);
      if (ra === rb) return false;
      if (rank[ra] < rank[rb]) [ra, rb] = [rb, ra];
      parent[rb] = ra;
      if (rank[ra] === rank[rb]) rank[ra]++;
      return true;
    }
    return { find, union };
  }

  /* Which component each node is in, given a set of edge indices. Components are
     numbered in order of their lowest node, so node 0 is always in component 0. */
  function components(n, edgeIdx, edges) {
    const uf = unionFind(n);
    edgeIdx.forEach((i) => uf.union(edges[i].a, edges[i].b));
    const ids = new Map();
    const of = [];
    for (let i = 0; i < n; i++) {
      const r = uf.find(i);
      if (!ids.has(r)) ids.set(r, ids.size);
      of.push(ids.get(r));
    }
    return { of, count: ids.size };
  }

  /* The edge indices on the path from a to b using only the given tree edges, or null. */
  function treePath(edges, treeIdx, a, b) {
    const adj = new Map();
    treeIdx.forEach((i) => {
      const e = edges[i];
      if (!adj.has(e.a)) adj.set(e.a, []);
      if (!adj.has(e.b)) adj.set(e.b, []);
      adj.get(e.a).push([e.b, i]);
      adj.get(e.b).push([e.a, i]);
    });
    const via = new Map([[a, null]]);
    const queue = [a];
    while (queue.length) {
      const u = queue.shift();
      if (u === b) break;
      (adj.get(u) || []).forEach(([v, i]) => { if (!via.has(v)) { via.set(v, [u, i]); queue.push(v); } });
    }
    if (!via.has(b)) return null;
    const path = [];
    for (let u = b; via.get(u); u = via.get(u)[0]) path.unshift(via.get(u)[1]);
    return path;
  }

  const byWeight = (edges) => edges.map((_, i) => i).sort((i, j) => edges[i].w - edges[j].w || i - j);

  /* One entry per edge Kruskal looks at, until the tree is complete.
     add:    { edge, action: 'add', cost }       — joins two separate pieces
     reject: { edge, action: 'reject', cycle }   — its ends are already joined by `cycle` */
  function kruskalTrace(graph) {
    const { nodes, edges } = graph;
    const uf = unionFind(nodes.length);
    const tree = [];
    const steps = [];
    let cost = 0;
    for (const i of byWeight(edges)) {
      if (tree.length === nodes.length - 1) break;
      const e = edges[i];
      if (uf.union(e.a, e.b)) {
        tree.push(i);
        cost += e.w;
        steps.push({ edge: i, action: 'add', cost, tree: tree.slice() });
      } else {
        steps.push({ edge: i, action: 'reject', cost, cycle: treePath(edges, tree, e.a, e.b), tree: tree.slice() });
      }
    }
    return { order: byWeight(edges), steps, tree, cost };
  }

  /* One entry per node Prim pulls in. `frontier` is every edge crossing from the tree
     to the rest at that moment (the cut); `edge` is the cheapest of them. */
  function primTrace(graph, start) {
    const { nodes, edges } = graph;
    const inTree = new Set([start || 0]);
    const tree = [];
    const steps = [];
    let cost = 0;
    while (inTree.size < nodes.length) {
      const frontier = [];
      edges.forEach((e, i) => { if (inTree.has(e.a) !== inTree.has(e.b)) frontier.push(i); });
      if (!frontier.length) break;
      const best = frontier.reduce((m, i) => (edges[i].w < edges[m].w || (edges[i].w === edges[m].w && i < m) ? i : m));
      const e = edges[best];
      const newNode = inTree.has(e.a) ? e.b : e.a;
      inTree.add(newNode);
      tree.push(best);
      cost += e.w;
      steps.push({ edge: best, action: 'add', frontier, newNode, cost, inTree: Array.from(inTree), tree: tree.slice() });
    }
    return { start: start || 0, steps, tree, cost };
  }

  /* Grade a student's chosen edges. */
  function checkTree(graph, chosen) {
    const { nodes, edges } = graph;
    const uf = unionFind(nodes.length);
    let cycleEdge = -1;
    let cost = 0;
    chosen.forEach((i) => {
      cost += edges[i].w;
      if (!uf.union(edges[i].a, edges[i].b) && cycleEdge < 0) cycleEdge = i;
    });
    const comp = components(nodes.length, chosen, edges);
    const best = kruskalTrace(graph).cost;
    const spanning = comp.count === 1 && cycleEdge < 0;
    return {
      cost, best, count: chosen.length, need: nodes.length - 1,
      pieces: comp.count, hasCycle: cycleEdge >= 0, cycleEdge,
      spanning, optimal: spanning && cost === best
    };
  }

  return { rng, makeGraph, unionFind, components, treePath, kruskalTrace, primTrace, checkTree, label };
}));
