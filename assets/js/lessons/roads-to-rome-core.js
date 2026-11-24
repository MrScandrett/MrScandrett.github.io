(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.RoadsToRomeCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const NODES = {
    roma:       { name: 'Roma', modern: 'Rome', x: 392, y: 301 },
    massilia:   { name: 'Massilia', modern: 'Marseille', x: 278, y: 272 },
    gades:      { name: 'Gades', modern: 'Cádiz', x: 91, y: 416, km: 1400 },
    londinium:  { name: 'Londinium', modern: 'London', x: 190, y: 96, km: 1900 },
    carthago:   { name: 'Carthago', modern: 'Tunis', x: 357, y: 409, km: 600 },
    alexandria: { name: 'Alexandria', modern: 'Alexandria', x: 671, y: 530, km: 2100 },
    byzantium:  { name: 'Byzantium', modern: 'Istanbul', x: 656, y: 321, km: 1200 },
    antiochia:  { name: 'Antiochia', modern: 'Antakya', x: 770, y: 423, km: 2200 },
    corinthus:  { name: 'Corinthus', modern: 'Corinth', x: 559, y: 386, km: 800 },
    ephesus:    { name: 'Ephesus', modern: 'Selçuk', x: 630, y: 386, km: 1450 }
  };

  const MODE_META = {
    road:    { label: 'Road',        icon: '🐂', color: '#93392a', dash: '3 6' },
    coastal: { label: 'Coastal sea', icon: '⛵', color: '#4c8091', dash: 'none' },
    open:    { label: 'Open sea',    icon: '🌊', color: '#1f3f66', dash: 'none' }
  };

  const EDGES = [
    { a: 'roma', b: 'massilia',   mode: 'coastal', days: 4,  price: 8,  seasonal: false, bow: -20 },
    { a: 'roma', b: 'carthago',   mode: 'open',    days: 3,  price: 5,  seasonal: true,  bow: 35 },
    { a: 'roma', b: 'corinthus',  mode: 'open',    days: 7,  price: 10, seasonal: true,  bow: -40 },
    { a: 'roma', b: 'byzantium',  mode: 'coastal', days: 12, price: 18, seasonal: false, bow: -55, via: [505, 470] },
    { a: 'massilia', b: 'londinium', mode: 'coastal', days: 9,  price: 14, seasonal: false, bow: 25 },
    { a: 'massilia', b: 'gades',     mode: 'road',    days: 12, price: 40, seasonal: false, bow: -30 },
    { a: 'gades', b: 'carthago',     mode: 'coastal', days: 8,  price: 13, seasonal: false, bow: 45 },
    { a: 'carthago', b: 'alexandria', mode: 'coastal', days: 10, price: 16, seasonal: false, bow: 40 },
    { a: 'corinthus', b: 'ephesus',   mode: 'coastal', days: 4,  price: 7,  seasonal: false, bow: -18 },
    { a: 'corinthus', b: 'byzantium', mode: 'coastal', days: 6,  price: 9,  seasonal: false, bow: 22 },
    { a: 'byzantium', b: 'ephesus',   mode: 'coastal', days: 5,  price: 8,  seasonal: false, bow: 18 },
    { a: 'ephesus', b: 'antiochia',   mode: 'coastal', days: 6,  price: 9,  seasonal: false, bow: -22 },
    { a: 'ephesus', b: 'alexandria',  mode: 'open',    days: 6,  price: 9,  seasonal: true,  bow: 45 },
    { a: 'antiochia', b: 'alexandria', mode: 'coastal', days: 9,  price: 14, seasonal: false, bow: 28 },
    { a: 'byzantium', b: 'antiochia',  mode: 'road',    days: 22, price: 65, seasonal: false, bow: -28 }
  ];

  const LONDINIUM_FACT =
    'The real ORBIS tool logs the fastest July route from Londinium to Roma at about <strong>27 days</strong>. See how close our simplified planner comes.';

  function shortestPath(startId, weightKey, excludeSeasonal) {
    const dist = {};
    const prev = {};
    Object.keys(NODES).forEach(function (id) {
      dist[id] = Infinity;
    });
    if (!(startId in NODES)) return { dist: dist, prev: prev };
    dist[startId] = 0;
    const unvisited = new Set(Object.keys(NODES));
    while (unvisited.size) {
      let u = null;
      let best = Infinity;
      unvisited.forEach(function (id) {
        if (dist[id] < best) {
          best = dist[id];
          u = id;
        }
      });
      if (u === null) break;
      unvisited.delete(u);
      EDGES.forEach(function (e) {
        if (excludeSeasonal && e.seasonal) return;
        if (e.a !== u && e.b !== u) return;
        const v = e.a === u ? e.b : e.a;
        if (!unvisited.has(v)) return;
        const alt = dist[u] + e[weightKey];
        if (alt < dist[v]) {
          dist[v] = alt;
          prev[v] = { node: u, edge: e };
        }
      });
    }
    return { dist: dist, prev: prev };
  }

  function buildPath(prev, target) {
    const steps = [];
    let cur = target;
    while (prev[cur]) {
      steps.unshift({ from: prev[cur].node, to: cur, edge: prev[cur].edge });
      cur = prev[cur].node;
    }
    return steps;
  }

  function computeRoute(originId, weightKey, excludeSeasonal) {
    const key = weightKey === 'price' ? 'price' : 'days';
    const steps = buildPath(shortestPath(originId, key, !!excludeSeasonal).prev, 'roma');
    const totalDays = steps.reduce(function (sum, st) { return sum + st.edge.days; }, 0);
    const totalPrice = steps.reduce(function (sum, st) { return sum + st.edge.price; }, 0);
    const summerFastest = buildPath(shortestPath(originId, 'days', false).prev, 'roma');
    const winterFastest = buildPath(shortestPath(originId, 'days', true).prev, 'roma');
    const summerDays = summerFastest.reduce(function (sum, st) { return sum + st.edge.days; }, 0);
    const winterDays = winterFastest.reduce(function (sum, st) { return sum + st.edge.days; }, 0);
    return {
      steps: steps,
      totalDays: totalDays,
      totalPrice: totalPrice,
      summerDays: summerDays,
      winterDays: winterDays
    };
  }

  function computeCostComparison(miles) {
    const d = Math.max(0, Number(miles) || 0);
    const roadCost = d * 1;
    const riverCost = d * 0.4;
    const seaCost = d * 0.2;
    return {
      roadCost: roadCost,
      riverCost: riverCost,
      seaCost: seaCost,
      riverPct: roadCost > 0 ? Math.round((riverCost / roadCost) * 100) : 0,
      seaPct: roadCost > 0 ? Math.round((seaCost / roadCost) * 100) : 0
    };
  }

  return {
    NODES: NODES,
    MODE_META: MODE_META,
    EDGES: EDGES,
    LONDINIUM_FACT: LONDINIUM_FACT,
    shortestPath: shortestPath,
    buildPath: buildPath,
    computeRoute: computeRoute,
    computeCostComparison: computeCostComparison
  };
});
