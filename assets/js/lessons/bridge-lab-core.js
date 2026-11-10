/* Bridge Build Lab core: the physics and grading behind "Bridge Over Troubled Water", with no DOM.
 *
 *   const run = BridgeLabCore.createCrossing(state);      // state = { nodes, members }
 *   while (BridgeLabCore.advanceCrossing(state, run).status === 'running') {}
 *   run.status → 'arrived' | 'fail'      run.reason → 'strain' | 'sag' | 'slope'
 *
 * Units: SVG pixels (y down). The 440 px gap between the banks is 16 m.
 *
 * Rules that keep the sim honest (each has a test in tests/bridge-lab-core.test.mjs):
 *  - The crossing advances in fixed ticks (6 physics sub-steps + a fixed slice of travel), so a
 *    120 Hz phone, a 60 Hz laptop, and the ½× / 2× speed buttons all give the same result.
 *    Speed only changes how many ticks are shown per screen frame.
 *  - Members have a maximum length per material. Without it, one road member from bank to bank
 *    joins two fixed anchors, never moves, and "passes" with zero triangles.
 *  - Sag is how far the road moved under load (deflection), not where it was built.
 *  - A triangle counts as bracing only when it has real area (three joints in a line are not a
 *    triangle) and touches the road, where the ambulance's load enters. After a test, a triangle
 *    "carried load" when every one of its members worked at LOADED_RATIO of its limit or more.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BridgeLabCore = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TARGET_LOAD = 105;
  const AMBULANCE_WEIGHT = 64;
  const LEVEL_BUDGET = 4800;
  const LEFT_ANCHOR_ID = 0;
  const RIGHT_ANCHOR_ID = 4;
  const DECK_Y = 172;
  const BUILD_ZONE = { left: 170, right: 610, top: 100, bottom: 280 };
  const GRID = { x: 55, y: 36 };
  const METERS_PER_PIXEL = 16 / (BUILD_ZONE.right - BUILD_ZONE.left);
  const ROAD_FAILURE_SAG = 20;
  const ROAD_FAILURE_SLOPE = 0.18;
  const VERLET_DAMPING = 0.92;
  const SUBSTEPS = 6;
  const ITERATIONS = 8;
  const TICK_PROGRESS = 0.0035;
  const REQUIRED_TRIANGLES = 4;
  const LOADED_RATIO = 0.025;
  const IDLE_RATIO = 0.01;
  const MIN_TRIANGLE_SHAPE = 0.08;

  // maxLength in px: road 4.4 m (one deck panel), wood 4.9 m, steel 6.7 m (steel spans further).
  const MATERIALS = {
    road: { label: 'Road', cost: 120, stiffness: 0.24, breakStrain: 0.035, maxLength: 121, width: 12, color: '#1b2734' },
    wood: { label: 'Wood', cost: 55, stiffness: 0.18, breakStrain: 0.08, maxLength: 135, width: 8, color: 'url(#bridgeWoodStroke)' },
    steel: { label: 'Steel', cost: 90, stiffness: 0.26, breakStrain: 0.11, maxLength: 185, width: 8, color: 'url(#bridgeSteelStroke)' }
  };

  function distance(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
  function clamp(min, value, max) { return Math.max(min, Math.min(value, max)); }
  function nodeMapFrom(nodes) { return new Map(nodes.map((node) => [node.id, node])); }
  function toMeters(px) { return px * METERS_PER_PIXEL; }

  function memberTooLong(type, length) {
    return length > MATERIALS[type].maxLength + 0.5;
  }

  function computeCost(state) {
    const nodes = nodeMapFrom(state.nodes);
    return state.members.reduce((total, member) => {
      return total + (toMeters(distance(nodes.get(member.a), nodes.get(member.b))) * MATERIALS[member.type].cost);
    }, 0);
  }

  function findRoadPath(state, workingNodes) {
    const lookup = nodeMapFrom(workingNodes || state.nodes);
    const adjacency = new Map(state.nodes.map((node) => [node.id, []]));
    state.members.forEach((member) => {
      if (member.type !== 'road') return;
      const a = lookup.get(member.a);
      const b = lookup.get(member.b);
      if (!a || !b) return;
      const weight = distance(a, b);
      adjacency.get(member.a).push({ to: member.b, weight });
      adjacency.get(member.b).push({ to: member.a, weight });
    });
    const distances = new Map(state.nodes.map((node) => [node.id, Infinity]));
    const previous = new Map();
    const queue = state.nodes.map((node) => node.id);
    distances.set(LEFT_ANCHOR_ID, 0);
    while (queue.length) {
      queue.sort((a, b) => distances.get(a) - distances.get(b));
      const current = queue.shift();
      if (current === RIGHT_ANCHOR_ID || distances.get(current) === Infinity) break;
      adjacency.get(current).forEach((edge) => {
        const next = distances.get(current) + edge.weight;
        if (next < distances.get(edge.to)) {
          distances.set(edge.to, next);
          previous.set(edge.to, current);
        }
      });
    }
    if (!previous.has(RIGHT_ANCHOR_ID)) return null;
    const path = [RIGHT_ANCHOR_ID];
    let cursor = RIGHT_ANCHOR_ID;
    while (cursor !== LEFT_ANCHOR_ID) {
      cursor = previous.get(cursor);
      if (cursor == null) return null;
      path.unshift(cursor);
    }
    return path;
  }

  function locateVehicle(path, nodes, progress) {
    if (!path || path.length < 2) return null;
    const lookup = nodeMapFrom(nodes);
    const segments = [];
    let total = 0;
    for (let i = 0; i < path.length - 1; i += 1) {
      const a = lookup.get(path[i]);
      const b = lookup.get(path[i + 1]);
      const length = distance(a, b);
      segments.push({ a, b, length });
      total += length;
    }
    if (total === 0) return null;
    let travel = clamp(0, progress, 1) * total;
    for (let i = 0; i < segments.length; i += 1) {
      const s = segments[i];
      if (travel <= s.length || i === segments.length - 1) {
        const t = s.length === 0 ? 0 : travel / s.length;
        return {
          x: s.a.x + ((s.b.x - s.a.x) * t),
          y: s.a.y + ((s.b.y - s.a.y) * t),
          angle: Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x),
          a: s.a.id,
          b: s.b.id,
          t
        };
      }
      travel -= s.length;
    }
    return null;
  }

  function createSimulationNodes(state) {
    return state.nodes.map((node) => ({
      id: node.id, x: node.x, y: node.y, homeX: node.x, homeY: node.y, prevX: node.x, prevY: node.y, fixed: node.fixed
    }));
  }

  function roadNodeSet(state) {
    const nodes = new Set();
    state.members.forEach((member) => {
      if (member.type === 'road') { nodes.add(member.a); nodes.add(member.b); }
    });
    return nodes;
  }

  function stressSample(member, lookup) {
    const currentLength = distance(lookup.get(member.a), lookup.get(member.b));
    const delta = currentLength - member.restLength;
    const strain = Math.abs(delta) / Math.max(member.restLength, 1);
    return {
      currentLength,
      delta,
      strain,
      ratio: strain / MATERIALS[member.type].breakStrain,
      mode: delta >= 0 ? 'tension' : 'compression'
    };
  }

  function computeMemberStress(state, simNodes) {
    const lookup = nodeMapFrom(simNodes);
    const stress = new Map();
    state.members.forEach((member) => stress.set(member.id, stressSample(member, lookup)));
    return stress;
  }

  // Sag is deflection: how far a road joint moved down from where it was built.
  function measureBridge(state, simNodes, path) {
    const lookup = nodeMapFrom(simNodes);
    let maxStrain = 0;
    let maxSag = 0;
    let maxSlope = 0;
    state.members.forEach((member) => {
      maxStrain = Math.max(maxStrain, stressSample(member, lookup).ratio);
    });
    if (path) {
      for (let i = 1; i < path.length - 1; i += 1) {
        const node = lookup.get(path[i]);
        maxSag = Math.max(maxSag, node.y - node.homeY);
      }
      for (let i = 0; i < path.length - 1; i += 1) {
        const a = lookup.get(path[i]);
        const b = lookup.get(path[i + 1]);
        const dx = b.x - a.x;
        maxSlope = Math.max(maxSlope, dx === 0 ? 1 : Math.abs((b.y - a.y) / dx));
      }
    }
    return { maxStrain, maxSag, maxSlope };
  }

  function failureReason(metrics) {
    const reasons = [
      ['strain', metrics.maxStrain],
      ['sag', metrics.maxSag / ROAD_FAILURE_SAG],
      ['slope', metrics.maxSlope / ROAD_FAILURE_SLOPE]
    ];
    reasons.sort((a, b) => b[1] - a[1]);
    return reasons[0][0];
  }

  function isFailing(metrics) {
    return metrics.maxStrain > 1 || metrics.maxSag > ROAD_FAILURE_SAG || metrics.maxSlope > ROAD_FAILURE_SLOPE;
  }

  // One fixed tick: SUBSTEPS of Verlet integration + ITERATIONS of member constraints.
  function physicsTick(state, simNodes, path, progress) {
    const roadNodes = roadNodeSet(state);
    const vehicle = locateVehicle(path, simNodes, progress);
    const lookup = nodeMapFrom(simNodes);
    for (let step = 0; step < SUBSTEPS; step += 1) {
      const loads = new Map(simNodes.map((node) => [node.id, roadNodes.has(node.id) ? 0.5 : 0.08]));
      if (vehicle) {
        const scale = TARGET_LOAD / 105;
        loads.set(vehicle.a, loads.get(vehicle.a) + (10 * scale * (1 - vehicle.t)));
        loads.set(vehicle.b, loads.get(vehicle.b) + (10 * scale * vehicle.t));
      }
      simNodes.forEach((node) => {
        if (node.fixed) {
          node.x = node.homeX; node.y = node.homeY; node.prevX = node.homeX; node.prevY = node.homeY;
          return;
        }
        const vx = (node.x - node.prevX) * VERLET_DAMPING;
        const vy = (node.y - node.prevY) * VERLET_DAMPING;
        node.prevX = node.x;
        node.prevY = node.y;
        node.x = clamp(BUILD_ZONE.left, node.x + vx, BUILD_ZONE.right);
        node.y = clamp(BUILD_ZONE.top, node.y + vy + (loads.get(node.id) * 0.055), BUILD_ZONE.bottom + 28);
      });
      for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
        state.members.forEach((member) => {
          const a = lookup.get(member.a);
          const b = lookup.get(member.b);
          if (a.fixed && b.fixed) return;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const length = Math.hypot(dx, dy) || 1;
          const factor = ((length - member.restLength) / length) * MATERIALS[member.type].stiffness;
          if (a.fixed) { b.x -= dx * factor; b.y -= dy * factor; return; }
          if (b.fixed) { a.x += dx * factor; a.y += dy * factor; return; }
          a.x += dx * factor * 0.5; a.y += dy * factor * 0.5;
          b.x -= dx * factor * 0.5; b.y -= dy * factor * 0.5;
        });
      }
    }
  }

  function createCrossing(state) {
    const path = findRoadPath(state, state.nodes);
    return {
      path,
      simNodes: createSimulationNodes(state),
      progress: 0,
      ticks: 0,
      status: path ? 'running' : 'fail',
      reason: path ? null : 'road',
      maxStrain: 0,
      maxSag: 0,
      maxSlope: 0,
      peakRatios: new Map(state.members.map((member) => [member.id, 0]))
    };
  }

  function advanceCrossing(state, run) {
    if (run.status !== 'running') return run;
    physicsTick(state, run.simNodes, run.path, run.progress);
    run.ticks += 1;
    run.progress = Math.min(1, run.progress + TICK_PROGRESS);
    computeMemberStress(state, run.simNodes).forEach((sample, id) => {
      run.peakRatios.set(id, Math.max(run.peakRatios.get(id) || 0, sample.ratio));
    });
    const metrics = measureBridge(state, run.simNodes, run.path);
    run.metrics = metrics;
    run.maxStrain = Math.max(run.maxStrain, metrics.maxStrain);
    run.maxSag = Math.max(run.maxSag, metrics.maxSag);
    run.maxSlope = Math.max(run.maxSlope, metrics.maxSlope);
    if (isFailing(metrics)) {
      run.status = 'fail';
      run.reason = failureReason(metrics);
    } else if (run.progress >= 1) {
      run.status = 'arrived';
    }
    return run;
  }

  function simulateCrossing(state, maxTicks) {
    const run = createCrossing(state);
    const limit = maxTicks || 2000;
    while (run.status === 'running' && run.ticks < limit) advanceCrossing(state, run);
    return run;
  }

  // Every set of three joints joined pairwise, with its shape and whether it braces the road.
  function analyzeTriangles(state) {
    const lookup = nodeMapFrom(state.nodes);
    const edges = new Map();
    state.members.forEach((member) => {
      edges.set(Math.min(member.a, member.b) + ':' + Math.max(member.a, member.b), member.id);
    });
    const key = (a, b) => Math.min(a, b) + ':' + Math.max(a, b);
    const roadNodes = roadNodeSet(state);
    const ids = state.nodes.map((node) => node.id);
    const triangles = [];
    for (let i = 0; i < ids.length - 2; i += 1) {
      for (let j = i + 1; j < ids.length - 1; j += 1) {
        if (!edges.has(key(ids[i], ids[j]))) continue;
        for (let k = j + 1; k < ids.length; k += 1) {
          if (!edges.has(key(ids[i], ids[k])) || !edges.has(key(ids[j], ids[k]))) continue;
          const a = lookup.get(ids[i]);
          const b = lookup.get(ids[j]);
          const c = lookup.get(ids[k]);
          const longest = Math.max(distance(a, b), distance(a, c), distance(b, c)) || 1;
          const twiceArea = Math.abs(((b.x - a.x) * (c.y - a.y)) - ((b.y - a.y) * (c.x - a.x)));
          const shape = twiceArea / (longest * longest);
          const flat = shape < MIN_TRIANGLE_SHAPE;
          const onRoad = roadNodes.has(a.id) || roadNodes.has(b.id) || roadNodes.has(c.id);
          triangles.push({
            nodes: [a.id, b.id, c.id],
            members: [edges.get(key(a.id, b.id)), edges.get(key(a.id, c.id)), edges.get(key(b.id, c.id))],
            flat,
            bracing: !flat && onRoad
          });
        }
      }
    }
    return triangles;
  }

  function bracingTriangles(state) {
    return analyzeTriangles(state).filter((t) => t.bracing);
  }

  function loadedTriangles(triangles, peakRatios) {
    return triangles.filter((t) => t.members.every((id) => (peakRatios.get(id) || 0) >= LOADED_RATIO));
  }

  // Members that barely worked during the test: candidates to trim.
  function idleMembers(state, peakRatios) {
    return state.members.filter((member) => member.type !== 'road' && (peakRatios.get(member.id) || 0) < IDLE_RATIO);
  }

  function memberCost(state, member) {
    const lookup = nodeMapFrom(state.nodes);
    return toMeters(distance(lookup.get(member.a), lookup.get(member.b))) * MATERIALS[member.type].cost;
  }

  function calculateScore(state, run) {
    const costRatio = computeCost(state) / LEVEL_BUDGET;
    const risk = Math.max(run.maxStrain, run.maxSag / ROAD_FAILURE_SAG, run.maxSlope / ROAD_FAILURE_SLOPE);
    return Math.max(100, Math.round(1000 - (costRatio * 360) - (Math.min(1, risk) * 360)));
  }

  return {
    TARGET_LOAD, AMBULANCE_WEIGHT, LEVEL_BUDGET, LEFT_ANCHOR_ID, RIGHT_ANCHOR_ID, DECK_Y, BUILD_ZONE, GRID,
    METERS_PER_PIXEL, ROAD_FAILURE_SAG, ROAD_FAILURE_SLOPE, VERLET_DAMPING, TICK_PROGRESS, REQUIRED_TRIANGLES,
    LOADED_RATIO, IDLE_RATIO, MATERIALS,
    distance, clamp, nodeMapFrom, toMeters, memberTooLong, computeCost, memberCost, findRoadPath, locateVehicle,
    createSimulationNodes, roadNodeSet, stressSample, computeMemberStress, measureBridge, failureReason, isFailing,
    physicsTick, createCrossing, advanceCrossing, simulateCrossing, analyzeTriangles, bracingTriangles,
    loadedTriangles, idleMembers, calculateScore
  };
}));
