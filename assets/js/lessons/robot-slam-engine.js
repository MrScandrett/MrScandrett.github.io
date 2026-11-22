(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.RobotSlamEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function hitsRect(x, y, r, rects) {
    for (let i = 0; i < rects.length; i++) {
      const b = rects[i];
      const cx = Math.max(b.x, Math.min(x, b.x + b.w));
      const cy = Math.max(b.y, Math.min(y, b.y + b.h));
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  }

  function rayCast(x, y, ang, rects, maxDist = 400) {
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    let best = maxDist;
    for (let i = 0; i < rects.length; i++) {
      const b = rects[i];
      let tmin = 0;
      let tmax = best;
      if (Math.abs(dx) < 1e-9) {
        if (x < b.x || x > b.x + b.w) continue;
      } else {
        const inv = 1 / dx;
        let t1 = (b.x - x) * inv;
        let t2 = (b.x + b.w - x) * inv;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }
      if (Math.abs(dy) < 1e-9) {
        if (y < b.y || y > b.y + b.h) continue;
      } else {
        const inv = 1 / dy;
        let t1 = (b.y - y) * inv;
        let t2 = (b.y + b.h - y) * inv;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }
      if (tmin >= 0 && tmin < best) best = tmin;
    }
    return best;
  }

  function markCell(grid, gw, gh, cx, cy, delta, lMax) {
    if (cx < 0 || cy < 0 || cx >= gw || cy >= gh) return;
    const i = cy * gw + cx;
    grid[i] = Math.max(-lMax, Math.min(lMax, grid[i] + delta));
  }

  function updateOccupancyRay({ grid, gw, gh, cellSize, pose, rel, z, hit, maxR, lFree = -0.4, lOcc = 0.9, lMax = 5 }) {
    const a = pose.a + rel;
    const cx = Math.cos(a);
    const sy = Math.sin(a);
    let last = -1;
    const limit = Math.min(z, maxR) - cellSize * 0.5;
    for (let d = 0; d < limit; d += cellSize * 0.5) {
      const gx = Math.floor((pose.x + cx * d) / cellSize);
      const gy = Math.floor((pose.y + sy * d) / cellSize);
      const id = gy * gw + gx;
      if (id !== last) {
        markCell(grid, gw, gh, gx, gy, lFree, lMax);
        last = id;
      }
    }
    if (hit) {
      const hx = Math.floor((pose.x + cx * z) / cellSize);
      const hy = Math.floor((pose.y + sy * z) / cellSize);
      markCell(grid, gw, gh, hx, hy, lOcc, lMax);
    }
  }

  /**
   * Score how well LiDAR endpoints from candidate pose match previously mapped walls.
   */
  function scorePoseAgainstGrid({ grid, gw, gh, cellSize, pose, rays }) {
    let score = 0;
    for (let i = 0; i < rays.length; i++) {
      const ray = rays[i];
      if (!ray.hit) continue;
      const a = pose.a + ray.rel;
      const wx = pose.x + Math.cos(a) * ray.z;
      const wy = pose.y + Math.sin(a) * ray.z;
      const gx = Math.floor(wx / cellSize);
      const gy = Math.floor(wy / cellSize);
      if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
      const v = grid[gy * gw + gx];
      if (v > 0) {
        score += Math.min(3, v);
      } else if (v < -0.5) {
        // Endpoint landing deep in already-known free floor contradicts the scan
        score -= 0.4;
      }
    }
    return score;
  }

  /**
   * Local correlative scan matcher: nudges drifting odometry belief to stay locked onto mapped walls.
   */
  function correlativeScanMatch({
    grid, gw, gh, cellSize, belief, rays,
    dxRange = 14, dxStep = 3.5, daRange = 0.08, daStep = 0.02, minOccupiedCells = 12
  }) {
    let occCount = 0;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] > 0.5) occCount++;
    }
    if (occCount < minOccupiedCells) {
      return { pose: { x: belief.x, y: belief.y, a: belief.a }, correctionPx: 0, improved: false };
    }

    const baseScore = scorePoseAgainstGrid({ grid, gw, gh, cellSize, pose: belief, rays });
    let bestScore = baseScore;
    let bestPose = { x: belief.x, y: belief.y, a: belief.a };

    for (let da = -daRange; da <= daRange + 1e-9; da += daStep) {
      const candA = belief.a + da;
      for (let dx = -dxRange; dx <= dxRange + 1e-9; dx += dxStep) {
        for (let dy = -dxRange; dy <= dxRange + 1e-9; dy += dxStep) {
          const penalty = 0.008 * (dx * dx + dy * dy) + 6 * da * da;
          const cand = { x: belief.x + dx, y: belief.y + dy, a: candA };
          const s = scorePoseAgainstGrid({ grid, gw, gh, cellSize, pose: cand, rays }) - penalty;
          if (s > bestScore) {
            bestScore = s;
            bestPose = cand;
          }
        }
      }
    }

    const correctionPx = Math.hypot(bestPose.x - belief.x, bestPose.y - belief.y);
    return {
      pose: bestPose,
      correctionPx,
      improved: bestScore > baseScore + 0.05
    };
  }

  function lowVarianceResample(particles, totalWeight, keepCount, rng = Math.random) {
    const N = particles.length;
    if (!N || keepCount <= 0) return [];
    const next = [];
    const r = rng() / keepCount;
    let c = particles[0].w / totalWeight;
    let i = 0;
    for (let m = 0; m < keepCount; m++) {
      const u = r + m / keepCount;
      while (u > c && i < N - 1) {
        i++;
        c += particles[i].w / totalWeight;
      }
      const src = particles[i];
      next.push({ x: src.x, y: src.y, a: src.a, w: 1 / N });
    }
    return next;
  }

  /**
   * Deterministic O(N) clump estimator (no Math.random inside draw/render).
   */
  function estimateClump(particles, radius = 40) {
    const N = particles.length;
    if (!N) return { x: 0, y: 0, a: 0, agree: 0, r95: 48 };
    const binSize = Math.max(8, radius / 2);
    const buckets = new Map();
    for (let i = 0; i < N; i++) {
      const p = particles[i];
      const bx = Math.floor(p.x / binSize);
      const by = Math.floor(p.y / binSize);
      const key = bx + ',' + by;
      const arr = buckets.get(key);
      if (arr) arr.push(p);
      else buckets.set(key, [p]);
    }

    let bestCenter = particles[0];
    let bestBucketScore = -1;
    for (const [key, pts] of buckets.entries()) {
      const [bx, by] = key.split(',').map(Number);
      let count = 0;
      for (let ox = -2; ox <= 2; ox++) {
        for (let oy = -2; oy <= 2; oy++) {
          const nb = buckets.get((bx + ox) + ',' + (by + oy));
          if (nb) count += nb.length;
        }
      }
      if (count > bestBucketScore) {
        bestBucketScore = count;
        bestCenter = pts[0];
      }
    }

    let sx = 0, sy = 0, sc = 0, ss = 0, n = 0;
    const clump = [];
    for (let i = 0; i < N; i++) {
      const p = particles[i];
      if (Math.abs(p.x - bestCenter.x) < radius && Math.abs(p.y - bestCenter.y) < radius) {
        sx += p.x; sy += p.y;
        sc += Math.cos(p.a); ss += Math.sin(p.a);
        n++;
        clump.push(p);
      }
    }
    if (n === 0) return { x: bestCenter.x, y: bestCenter.y, a: bestCenter.a, agree: 0, r95: 48 };
    const mx = sx / n;
    const my = sy / n;
    let v2 = 0;
    for (let i = 0; i < clump.length; i++) {
      const p = clump[i];
      v2 += (p.x - mx) * (p.x - mx) + (p.y - my) * (p.y - my);
    }
    return {
      x: mx,
      y: my,
      a: Math.atan2(ss, sc),
      agree: n / N,
      r95: Math.min(48, Math.max(12, 2 * Math.sqrt(v2 / Math.max(1, n))))
    };
  }

  return {
    hitsRect,
    rayCast,
    updateOccupancyRay,
    scorePoseAgainstGrid,
    correlativeScanMatch,
    lowVarianceResample,
    estimateClump
  };
});
