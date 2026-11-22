/**
 * Bug Bots — Pure Hexapod Subsumption, Support-Polygon & Bristle-Bot Physics Engine
 * UMD module: works in browser (window.BugBotsEngine) and Node tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BugBotsEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const GAITS = {
    tripod: {
      id: 'tripod',
      label: 'Tripod (3+3)',
      dutyFactor: 0.5,
      offsets: [0, 0.5, 0.5, 0, 0, 0.5],
      stepsPerCycle: 2
    },
    ripple: {
      id: 'ripple',
      label: 'Ripple (4+2)',
      dutyFactor: 2 / 3 + 0.002,
      offsets: [0, 3 / 6, 2 / 6, 5 / 6, 4 / 6, 1 / 6],
      stepsPerCycle: 3
    },
    wave: {
      id: 'wave',
      label: 'Wave (5+1)',
      dutyFactor: 5 / 6 + 0.002,
      offsets: [0, 3 / 6, 1 / 6, 4 / 6, 2 / 6, 5 / 6],
      stepsPerCycle: 6
    }
  };

  // Leg definitions in body frame where nose points toward -y.
  // side: +1 = right, -1 = left.
  const LEGS = [
    { id: 'FR', index: 0, hipX: 25, hipY: -14, baseAngleDeg: -55, side: 1 },
    { id: 'FL', index: 1, hipX: -25, hipY: -14, baseAngleDeg: -125, side: -1 },
    { id: 'MR', index: 2, hipX: 32, hipY: 0, baseAngleDeg: 0, side: 1 },
    { id: 'ML', index: 3, hipX: -32, hipY: 0, baseAngleDeg: 180, side: -1 },
    { id: 'BR', index: 4, hipX: 23, hipY: 14, baseAngleDeg: 55, side: 1 },
    { id: 'BL', index: 5, hipX: -23, hipY: 14, baseAngleDeg: 125, side: -1 }
  ];

  const LEG_LEN = 46;
  const SWEEP_DEG = 22;

  const LAYERS = [
    { id: 0, key: 'standup', name: 'Stand Up', desc: 'Extends legs to body height' },
    { id: 1, key: 'walk', name: 'Simple Walk', desc: 'Basic gait rhythm oscillator' },
    { id: 2, key: 'forceBalance', name: 'Force Balancing', desc: 'Levels roll across uneven ground' },
    { id: 3, key: 'legLift', name: 'Leg Lifting', desc: 'Steps higher over pebbles & bumps' },
    { id: 4, key: 'whiskers', name: 'Whiskers', desc: 'Suppresses steering to dodge rocks' },
    { id: 5, key: 'pitchStab', name: 'Pitch Stabilization', desc: 'Keeps body level on slopes' },
    { id: 6, key: 'prowl', name: 'Prowling', desc: 'Wakes & speeds up near heat signal' },
    { id: 7, key: 'steeredProwl', name: 'Steered Prowling', desc: 'Steers toward the IR heat target' }
  ];

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function wrapAngle(a) {
    return Math.atan2(Math.sin(a), Math.cos(a));
  }

  function computeLegPose(leg, phase, gaitId, disabled, liftBoost) {
    const gait = GAITS[gaitId] || GAITS.tripod;
    const lp = ((phase + gait.offsets[leg.index]) % 1 + 1) % 1;
    const duty = gait.dutyFactor;

    if (disabled) {
      const baseRad = (leg.baseAngleDeg * Math.PI) / 180;
      return {
        id: leg.id,
        index: leg.index,
        side: leg.side,
        hx: leg.hipX,
        hy: leg.hipY,
        fx: leg.hipX + Math.cos(baseRad) * (LEG_LEN * 0.65),
        fy: leg.hipY + Math.sin(baseRad) * (LEG_LEN * 0.65),
        isSwing: true,
        disabled: true,
        liftHeight: 1.0
      };
    }

    const isSwing = lp >= duty;
    // sign ensures that across BOTH left and right sides, swing advances foot toward -y (forward)
    // and stance pushes foot toward +y (backward).
    const sign = leg.side === 1 ? -1 : 1;
    let sweepDeg;
    let liftHeight = 0;

    if (isSwing) {
      const t = (lp - duty) / Math.max(1e-6, 1 - duty);
      sweepDeg = sign * (-SWEEP_DEG + SWEEP_DEG * 2 * t);
      liftHeight = Math.sin(Math.PI * t) * (liftBoost ? 1.35 : 0.9);
    } else {
      const t = lp / Math.max(1e-6, duty);
      sweepDeg = sign * (SWEEP_DEG * (1 - 2 * t));
    }

    const totalRad = ((leg.baseAngleDeg + sweepDeg) * Math.PI) / 180;
    const reach = LEG_LEN * (isSwing ? 0.92 : 1.0);
    return {
      id: leg.id,
      index: leg.index,
      side: leg.side,
      hx: leg.hipX,
      hy: leg.hipY,
      fx: leg.hipX + Math.cos(totalRad) * reach,
      fy: leg.hipY + Math.sin(totalRad) * reach,
      isSwing,
      disabled: false,
      liftHeight
    };
  }

  function cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  function convexHull(points) {
    if (points.length <= 2) return points.slice();
    const pts = points
      .map((p) => ({ x: p.x, y: p.y }))
      .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
    const lower = [];
    for (let i = 0; i < pts.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) {
        lower.pop();
      }
      lower.push(pts[i]);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) {
        upper.pop();
      }
      upper.push(pts[i]);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  function pointInConvexPolygon(pt, poly) {
    if (poly.length < 3) return false;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      if (cross(a, b, pt) < -1e-6) return false;
    }
    return true;
  }

  function distToSegment(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    if (l2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1);
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  function evaluateSupportStability(legPoses, com = { x: 0, y: 0 }) {
    const grounded = legPoses
      .filter((lp) => !lp.isSwing && !lp.disabled)
      .map((lp) => ({ x: lp.fx, y: lp.fy }));
    const hull = convexHull(grounded);
    const inside = hull.length >= 3 && pointInConvexPolygon(com, hull);

    let minEdgeDist = Infinity;
    if (hull.length >= 2) {
      for (let i = 0; i < hull.length; i++) {
        const d = distToSegment(com, hull[i], hull[(i + 1) % hull.length]);
        if (d < minEdgeDist) minEdgeDist = d;
      }
    } else if (hull.length === 1) {
      minEdgeDist = Math.hypot(com.x - hull[0].x, com.y - hull[0].y);
    } else {
      minEdgeDist = 0;
    }

    const marginPx = inside ? minEdgeDist : -minEdgeDist;
    return {
      groundedCount: grounded.length,
      hull,
      stable: inside && grounded.length >= 3,
      marginPx: +marginPx.toFixed(1)
    };
  }

  function createHexapodState(opts = {}) {
    const arenaW = opts.arenaW || 420;
    const arenaH = opts.arenaH || 310;
    return {
      arenaW,
      arenaH,
      x: opts.x != null ? opts.x : 80,
      y: opts.y != null ? opts.y : arenaH * 0.55,
      heading: opts.heading != null ? opts.heading : -0.15,
      phase: 0,
      speed: opts.speed || 1.0,
      gait: opts.gait || 'tripod',
      layers: Object.assign(
        {
          standup: true,
          walk: true,
          forceBalance: true,
          legLift: true,
          whiskers: true,
          pitchStab: true,
          prowl: true,
          steeredProwl: true
        },
        opts.layers || {}
      ),
      disabledLegs: (opts.disabledLegs || [false, false, false, false, false, false]).slice(0, 6),
      rocks: (opts.rocks || [
        { x: 185, y: 120, r: 22 },
        { x: 255, y: 215, r: 24 },
        { x: 310, y: 95, r: 19 }
      ]).map((r) => ({ x: r.x, y: r.y, r: r.r })),
      pebbles: (opts.pebbles || [
        { x: 150, y: 210, r: 30 },
        { x: 280, y: 155, r: 28 }
      ]).map((p) => ({ x: p.x, y: p.y, r: p.r })),
      target: Object.assign({ x: arenaW - 60, y: 80 }, opts.target || {}),
      trail: [],
      stepCount: 0,
      lastPhaseBucket: 0,
      avoidCount: 0,
      avoidCooldown: 0,
      heatReachedCount: 0,
      heatCooldown: 0,
      roughSteps: 0,
      colliding: false,
      onRoughPatch: false,
      leftWhiskerHit: false,
      rightWhiskerHit: false,
      rollDeg: 0,
      pitchDeg: 0,
      stepsPerSec: 0,
      firingLayers: Array(8).fill(false),
      winningLayer: 0,
      stability: { groundedCount: 3, hull: [], stable: true, marginPx: 10 },
      legPoses: []
    };
  }

  function whiskerCheck(x, y, ang, len, rocks, arenaW, arenaH) {
    const steps = 6;
    for (let s = 1; s <= steps; s++) {
      const d = (len * s) / steps;
      const px = x + Math.cos(ang) * d;
      const py = y + Math.sin(ang) * d;
      if (px < 12 || py < 12 || px > arenaW - 12 || py > arenaH - 12) return d;
      for (let i = 0; i < rocks.length; i++) {
        if (Math.hypot(px - rocks[i].x, py - rocks[i].y) < rocks[i].r + 12) return d;
      }
    }
    return Infinity;
  }

  function stepHexapod(state, rawDt) {
    const dt = clamp(rawDt || 0, 0, 0.05);
    const L = state.layers;
    const firing = Array(8).fill(false);
    const gait = GAITS[state.gait] || GAITS.tripod;
    const disabledCount = state.disabledLegs.filter(Boolean).length;

    if (state.avoidCooldown > 0) state.avoidCooldown = Math.max(0, state.avoidCooldown - dt);
    if (state.heatCooldown > 0) state.heatCooldown = Math.max(0, state.heatCooldown - dt);

    // Layer 0: Stand Up (foundational survival layer)
    if (!L.standup) {
      state.firingLayers = firing;
      state.winningLayer = -1;
      state.stepsPerSec = 0;
      state.rollDeg = 0;
      state.pitchDeg = 0;
      state.legPoses = LEGS.map((leg) => computeLegPose(leg, state.phase, state.gait, true, false));
      state.stability = evaluateSupportStability(state.legPoses);
      return state;
    }
    firing[0] = true;
    let winner = 0;

    // Terrain sensing
    state.onRoughPatch = state.pebbles.some((p) => Math.hypot(state.x - p.x, state.y - p.y) < p.r + 14);
    const distToTarget = Math.hypot(state.target.x - state.x, state.target.y - state.y);
    const heatSensed = distToTarget < 290;

    // Layer 1: Simple Walk (can be gated/boosted by Prowling)
    let baseForward = L.walk ? 48 * state.speed : 0;
    if (L.walk) {
      firing[1] = true;
      winner = 1;
    }

    // Layer 6: Prowling modulates locomotion energy when a heat source is detected
    if (L.prowl && L.walk && heatSensed) {
      firing[6] = true;
      baseForward *= 1.15;
      winner = 6;
    }

    // Layer 2: Force Balancing (compensates for disabled legs / rough surface roll)
    const rawRoll = (disabledCount > 0 ? 7.5 : 0) + (state.onRoughPatch ? 6.0 : 0);
    if (L.forceBalance && rawRoll > 0) {
      firing[2] = true;
      state.rollDeg = rawRoll * 0.25;
      if (winner < 2) winner = 2;
    } else {
      state.rollDeg = rawRoll;
    }

    // Layer 3: Leg Lifting over pebbles / rough terrain
    if (L.legLift && state.onRoughPatch) {
      firing[3] = true;
      if (winner < 3) winner = 3;
    } else if (state.onRoughPatch && L.walk) {
      baseForward *= 0.55; // trips on rough pebbles without Leg Lifting
      state.roughSteps++;
    }

    // Layer 5: Pitch Stabilization
    const rawPitch = state.onRoughPatch ? 8.5 : 1.5;
    if (L.pitchStab && state.onRoughPatch) {
      firing[5] = true;
      state.pitchDeg = rawPitch * 0.25;
      if (winner < 5) winner = 5;
    } else {
      state.pitchDeg = rawPitch;
    }

    // Steering arbitration: Layer 7 Steered Prowling vs Layer 4 Whiskers suppression
    let turnRate = 0;
    if (L.steeredProwl && L.walk) {
      const desired = Math.atan2(state.target.y - state.y, state.target.x - state.x);
      const err = wrapAngle(desired - state.heading);
      turnRate = clamp(err * 2.2, -1.9, 1.9);
      firing[7] = true;
      winner = 7;
    }

    // Layer 4: Whiskers (reactive obstacle avoidance — suppresses higher steering!)
    const whiskerLen = 54;
    const dLeft = whiskerCheck(state.x, state.y, state.heading - 0.52, whiskerLen, state.rocks, state.arenaW, state.arenaH);
    const dRight = whiskerCheck(state.x, state.y, state.heading + 0.52, whiskerLen, state.rocks, state.arenaW, state.arenaH);
    state.leftWhiskerHit = Number.isFinite(dLeft);
    state.rightWhiskerHit = Number.isFinite(dRight);

    if (L.whiskers && (state.leftWhiskerHit || state.rightWhiskerHit)) {
      firing[4] = true;
      // Whiskers suppresses Steered Prowling when danger is near
      turnRate = dLeft < dRight ? 2.8 * state.speed : -2.8 * state.speed;
      baseForward *= 0.72;
      winner = 4;
      if (state.avoidCooldown <= 0) {
        state.avoidCount++;
        state.avoidCooldown = 0.85;
      }
    }

    // Leg fault degradation: missing legs slow the walker and pull slightly toward missing side
    if (disabledCount > 0) {
      baseForward *= Math.max(0.35, 1 - disabledCount * 0.18);
      const sideBias = state.legPoses.length
        ? state.disabledLegs.reduce((acc, dis, idx) => acc + (dis ? LEGS[idx].side : 0), 0)
        : 0;
      turnRate += sideBias * 0.35;
    }

    // Advance gait phase & step count
    const phaseRate = L.walk ? state.speed * 1.4 : 0;
    const prevPhase = state.phase;
    state.phase = (state.phase + dt * phaseRate) % 1;
    if (phaseRate > 0) {
      const curBucket = Math.floor(state.phase * gait.stepsPerCycle);
      const prevBucket = Math.floor(prevPhase * gait.stepsPerCycle);
      if (curBucket !== prevBucket) state.stepCount++;
    }
    state.stepsPerSec = L.walk ? +(state.speed * 1.4 * gait.stepsPerCycle).toFixed(1) : 0;

    // Compute leg kinematics and support polygon
    state.legPoses = LEGS.map((leg) =>
      computeLegPose(leg, state.phase, state.gait, !!state.disabledLegs[leg.index], L.legLift && state.onRoughPatch)
    );
    state.stability = evaluateSupportStability(state.legPoses);
    if (!state.stability.stable && L.walk) {
      baseForward *= 0.75; // dynamic wobble slows progression
    }

    // Integrate motion in arena
    state.heading = wrapAngle(state.heading + turnRate * dt);
    const nx = state.x + Math.cos(state.heading) * baseForward * dt;
    const ny = state.y + Math.sin(state.heading) * baseForward * dt;

    let hitRock = false;
    for (let i = 0; i < state.rocks.length; i++) {
      if (Math.hypot(nx - state.rocks[i].x, ny - state.rocks[i].y) < state.rocks[i].r + 14) {
        hitRock = true;
        break;
      }
    }
    const hitWall = nx < 16 || ny < 16 || nx > state.arenaW - 16 || ny > state.arenaH - 16;
    state.colliding = hitRock || hitWall;

    if (!state.colliding) {
      state.x = nx;
      state.y = ny;
      const last = state.trail[state.trail.length - 1];
      if (!last || Math.hypot(last.x - nx, last.y - ny) > 4) {
        state.trail.push({ x: nx, y: ny });
        if (state.trail.length > 140) state.trail.shift();
      }
    } else if (hitWall) {
      state.x = clamp(nx, 18, state.arenaW - 18);
      state.y = clamp(ny, 18, state.arenaH - 18);
      state.heading = wrapAngle(state.heading + Math.PI * 0.65);
    }

    // Check if robot reached IR Heat Target
    if (Math.hypot(state.target.x - state.x, state.target.y - state.y) < 24 && state.heatCooldown <= 0) {
      state.heatReachedCount++;
      state.heatCooldown = 2.0;
    }

    state.firingLayers = firing;
    state.winningLayer = winner;
    return state;
  }

  /* ── Bristle-Bot Physics Model ─────────────────────────────────────── */
  const SURFACES = {
    desk: { id: 'desk', label: 'Smooth Desk', grip: 1.0, drag: 0.08 },
    tile: { id: 'tile', label: 'Classroom Tile', grip: 0.92, drag: 0.12 },
    cardboard: { id: 'cardboard', label: 'Cardboard Track', grip: 0.78, drag: 0.22 },
    carpet: { id: 'carpet', label: 'Low-Pile Carpet', grip: 0.28, drag: 0.72 }
  };

  function computeBristleBotPhysics({ bristleAngleDeg = 30, motorHz = 140, weightBias = 0, surface = 'desk' }) {
    const surf = SURFACES[surface] || SURFACES.desk;
    const rad = (clamp(bristleAngleDeg, 0, 60) * Math.PI) / 180;
    // Ratchet efficiency peaks near 45 deg (sin(2*theta)) and is strictly 0 at 0 deg (vertical bristles)
    const ratchetFactor = Math.sin(2 * rad);
    const freqNorm = clamp(motorHz, 0, 260) / 140;
    const rawSpeed = 16.5 * ratchetFactor * freqNorm * surf.grip * (1 - surf.drag * 0.45);
    const vCmPerSec = +(Math.max(0, rawSpeed)).toFixed(2);
    // Lateral weight imbalance curves the heading
    const yawDegPerSec = +(clamp(weightBias, -1, 1) * 58 * freqNorm * (0.35 + 0.65 * surf.grip)).toFixed(2);
    const downstrokeGrip = +(surf.grip * (0.4 + 0.6 * Math.cos(rad))).toFixed(2);
    const upstrokePush = +(ratchetFactor * freqNorm * surf.grip).toFixed(2);

    let verdict = 'Cruising forward via one-way bristle ratchet.';
    if (bristleAngleDeg <= 2) {
      verdict = 'Flat vertical bristles (0°): shakes in place with zero net forward ratchet!';
    } else if (surface === 'carpet') {
      verdict = 'Carpet fibers tangle the bristles: high drag kills ratchet propulsion.';
    } else if (Math.abs(weightBias) >= 0.25) {
      verdict = `Off-center battery (${weightBias < 0 ? 'left' : 'right'}-heavy): bot arcs in a circle instead of running straight.`;
    } else if (vCmPerSec >= 10) {
      verdict = 'Tuned racer: angled bristles + centered battery drive straight and fast!';
    }

    return {
      vCmPerSec,
      yawDegPerSec,
      downstrokeGrip,
      upstrokePush,
      verdict
    };
  }

  function createBristleState() {
    return {
      x: 42,
      y: 110,
      heading: 0,
      vibPhase: 0,
      elapsed: 0,
      finished: false,
      finishX: 540,
      trail: [{ x: 42, y: 110 }]
    };
  }

  function stepBristleBot(simState, params, rawDt) {
    const dt = clamp(rawDt || 0, 0, 0.05);
    const phys = computeBristleBotPhysics(params);
    simState.vibPhase = (simState.vibPhase + dt * (params.motorHz / 18)) % (Math.PI * 2);
    if (simState.finished) return phys;

    simState.elapsed += dt;
    const pxPerCm = 11.5;
    simState.heading = wrapAngle(simState.heading + (phys.yawDegPerSec * Math.PI) / 180 * dt);
    const vx = Math.cos(simState.heading) * phys.vCmPerSec * pxPerCm;
    const vy = Math.sin(simState.heading) * phys.vCmPerSec * pxPerCm;
    simState.x = clamp(simState.x + vx * dt, 16, 580);
    simState.y = clamp(simState.y + vy * dt, 22, 198);

    const last = simState.trail[simState.trail.length - 1];
    if (!last || Math.hypot(last.x - simState.x, last.y - simState.y) > 3) {
      simState.trail.push({ x: simState.x, y: simState.y });
      if (simState.trail.length > 260) simState.trail.shift();
    }

    if (simState.x >= simState.finishX && Math.abs(simState.y - 110) <= 65) {
      simState.finished = true;
    }
    return phys;
  }

  const CHALLENGES = [
    { id: 'avoid-rock', title: '1 · Whiskers Suppresses Steering', desc: 'Watch Layer 4 (Whiskers) detect and steer around a rock without crashing.' },
    { id: 'find-heat', title: '2 · Heat-Seeking Prowler', desc: 'Enable Layer 7 (Steered Prowling) and guide Genghis to the IR heat target.' },
    { id: 'leg-fault', title: '3 · Survive a Jammed Leg', desc: 'Disable a leg in the inspector and switch to Wave gait to stay statically stable.' },
    { id: 'bristle-straight', title: '4 · Tune a Straight Bristle-Bot', desc: 'Tune bristle angle (> 15°) and balance the battery so your bot crosses the finish line.' }
  ];

  function evaluateChallenges(progress = {}) {
    const completed = {
      'avoid-rock': Boolean(progress.avoidRock),
      'find-heat': Boolean(progress.findHeat),
      'leg-fault': Boolean(progress.legFault),
      'bristle-straight': Boolean(progress.bristleStraight)
    };
    const count = Object.values(completed).filter(Boolean).length;
    return { completed, count, total: CHALLENGES.length };
  }

  return {
    GAITS,
    LEGS,
    LAYERS,
    SURFACES,
    CHALLENGES,
    LEG_LEN,
    SWEEP_DEG,
    computeLegPose,
    convexHull,
    pointInConvexPolygon,
    evaluateSupportStability,
    createHexapodState,
    stepHexapod,
    computeBristleBotPhysics,
    createBristleState,
    stepBristleBot,
    evaluateChallenges
  };
});
