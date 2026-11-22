(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.MotionPlanningEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function wrapAngle(a) {
    return Math.atan2(Math.sin(a), Math.cos(a));
  }

  function isBlocked({ p, pad, obstacles, width, height }) {
    if (p.x < pad || p.y < pad || p.x > width - pad || p.y > height - pad) return true;
    for (let i = 0; i < obstacles.length; i++) {
      if (dist(p, obstacles[i]) < obstacles[i].r + pad) return true;
    }
    return false;
  }

  function isSegmentFree({ a, b, pad, obstacles, width, height, step = 3 }) {
    const n = Math.ceil(dist(a, b) / step);
    for (let i = 0; i <= n; i++) {
      const t = i / Math.max(1, n);
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      if (isBlocked({ p, pad, obstacles, width, height })) return false;
    }
    return true;
  }

  function minClearance({ p, pad, obstacles, width, height }) {
    let best = Math.min(p.x, p.y, width - p.x, height - p.y);
    for (let i = 0; i < obstacles.length; i++) {
      best = Math.min(best, dist(p, obstacles[i]) - obstacles[i].r);
    }
    return best - pad;
  }

  function potentialFieldForce({ p, goal, obstacles, repGain, radius, width, height }) {
    const gx = goal.x - p.x;
    const gy = goal.y - p.y;
    const gd = Math.hypot(gx, gy) || 1;
    const att = Math.min(gd, 120) / 120;
    let fx = (gx / gd) * att;
    let fy = (gy / gd) * att;
    const D0 = 70;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      const dx = p.x - o.x;
      const dy = p.y - o.y;
      const dd = Math.hypot(dx, dy) || 1;
      const d = Math.max(1, dd - o.r - radius);
      if (d < D0) {
        const m = repGain * (1 / d - 1 / D0) * 18 / d;
        fx += (dx / dd) * m;
        fy += (dy / dd) * m;
      }
    }
    const walls = [
      [p.x, 1, 0],
      [width - p.x, -1, 0],
      [p.y, 0, 1],
      [height - p.y, 0, -1]
    ];
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      const d = Math.max(1, w[0] - radius);
      if (d < 40) {
        const m = repGain * (1 / d - 1 / 40) * 10 / d;
        fx += w[1] * m;
        fy += w[2] * m;
      }
    }
    return { x: fx, y: fy };
  }

  function propagateCosts(nodes, rootIdx, newCost) {
    const delta = newCost - nodes[rootIdx].cost;
    nodes[rootIdx].cost = newCost;
    const stack = [rootIdx];
    while (stack.length) {
      const k = stack.pop();
      for (let m = 0; m < nodes.length; m++) {
        if (nodes[m].parent === k) {
          nodes[m].cost += delta;
          stack.push(m);
        }
      }
    }
  }

  /**
   * Re-evaluate all near-goal nodes so RRT* picks the cheapest goal connection after rewiring.
   */
  function refreshBestGoalNode({ nodes, goal, stepDist, obstacles, width, height, pad }) {
    let bestIdx = -1;
    let bestCost = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const dg = dist(n, goal);
      if (dg < stepDist) {
        const total = n.cost + dg;
        if (total < bestCost && isSegmentFree({ a: n, b: goal, pad, obstacles, width, height })) {
          bestCost = total;
          bestIdx = i;
        }
      }
    }
    return { goalNode: bestIdx, goalCost: bestCost };
  }

  function rrtStep({
    state, goal, mode, obstacles, width, height, pad,
    step = 18, neigh = 45, maxNodes = 3000, rng = Math.random
  }) {
    const nodes = state.nodes;
    if (nodes.length >= maxNodes) return { added: false, rewired: false, changed: false };
    if (state.goalNode >= 0 && mode === 'rrt') return { added: false, rewired: false, changed: false };

    const sample = rng() < 0.1 ? goal : { x: rng() * width, y: rng() * height };
    let near = 0;
    let nd = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const d = dist(nodes[i], sample);
      if (d < nd) {
        nd = d;
        near = i;
      }
    }
    const from = nodes[near];
    const s = Math.min(step, nd);
    if (s < 1) return { added: false, rewired: false, changed: false };
    const p = {
      x: from.x + ((sample.x - from.x) / nd) * s,
      y: from.y + ((sample.y - from.y) / nd) * s
    };
    if (!isSegmentFree({ a: from, b: p, pad, obstacles, width, height })) {
      return { added: false, rewired: false, changed: false };
    }

    const node = { x: p.x, y: p.y, parent: near, cost: from.cost + s };
    const idx = nodes.length;
    let rewired = false;

    if (mode === 'rrtstar') {
      const neighbors = [];
      for (let j = 0; j < nodes.length; j++) {
        if (dist(nodes[j], p) < neigh) neighbors.push(j);
      }
      for (let k = 0; k < neighbors.length; k++) {
        const j = neighbors[k];
        const c = nodes[j].cost + dist(nodes[j], p);
        if (c < node.cost && isSegmentFree({ a: nodes[j], b: p, pad, obstacles, width, height })) {
          node.cost = c;
          node.parent = j;
        }
      }
      nodes.push(node);
      for (let k = 0; k < neighbors.length; k++) {
        const j = neighbors[k];
        const c = node.cost + dist(nodes[j], node);
        if (c < nodes[j].cost && isSegmentFree({ a: node, b: nodes[j], pad, obstacles, width, height })) {
          nodes[j].parent = idx;
          propagateCosts(nodes, j, c);
          rewired = true;
        }
      }
    } else {
      nodes.push(node);
    }

    if (rewired) {
      const bestGoal = refreshBestGoalNode({
        nodes, goal, stepDist: step, obstacles, width, height, pad
      });
      state.goalNode = bestGoal.goalNode;
      if (bestGoal.goalNode >= 0) {
        state.goalCost = bestGoal.goalCost;
        if (state.initialGoalCost == null) state.initialGoalCost = bestGoal.goalCost;
      }
    } else if (dist(node, goal) < step && isSegmentFree({ a: node, b: goal, pad, obstacles, width, height })) {
      const gc = node.cost + dist(node, goal);
      if (state.goalNode < 0 || gc < state.goalCost) {
        state.goalNode = idx;
        state.goalCost = gc;
        if (state.initialGoalCost == null) state.initialGoalCost = gc;
      }
    }
    state.treeVersion = (state.treeVersion || 0) + 1;
    return { added: true, rewired, changed: true };
  }

  function pathLength(pts) {
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
    return len;
  }

  function shortcutPath({ rawPath, pad, obstacles, width, height }) {
    const pts = rawPath.slice().reverse();
    if (pts.length <= 2) return pts;
    const out = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
      let best = i + 1;
      for (let j = pts.length - 1; j > i + 1; j--) {
        if (isSegmentFree({ a: pts[i], b: pts[j], pad, obstacles, width, height })) {
          best = j;
          break;
        }
      }
      out.push(pts[best]);
      i = best;
    }
    return out;
  }

  function diffDriveKinematics({ vl, vr, base }) {
    const v = (vr + vl) / 2;
    const w = (vr - vl) / base;
    const radius = Math.abs(w) < 1e-3 ? Infinity : Math.abs(v / w);
    return { v, w, radius };
  }

  return {
    dist,
    wrapAngle,
    isBlocked,
    isSegmentFree,
    minClearance,
    potentialFieldForce,
    propagateCosts,
    refreshBestGoalNode,
    rrtStep,
    pathLength,
    shortcutPath,
    diffDriveKinematics
  };
});
