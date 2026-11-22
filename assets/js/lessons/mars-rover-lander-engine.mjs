// Shared Mars Rover Lander physics, terrain, audio, and Canvas2D renderer.
// Used by both lessons/cosmology/mars-rover-lander.html and the Teacher Studio showcase game.

export const WORLD_W = 280; // meters
export const WORLD_H = 165; // meters

export const SAFE_LIMITS = {
  vspd: 4.0, // m/s vertical
  hspd: 2.5, // m/s horizontal
  tilt: 12.0, // degrees from vertical
};

export const PHYSICS = {
  mainThrust: 11.6, // m/s^2 at full throttle
  hoverThrottle: 0.38, // ~4.4 m/s^2 upward on Mars (g = 3.72)
  earthHoverThrottle: 0.86, // ~10.0 m/s^2 upward on Earth (g = 9.81)
  throttleSpoolRate: 9.0, // per second
  fuelBurnFull: 12.5, // % per second at full throttle
  rotAccel: 320, // deg/s^2
  rotMax: 95, // deg/s
  rotDamp: 6.5, // angular damping
  sasP: 5.5, // proportional auto-level gain
  sasD: 2.8, // derivative damping gain
  sasMaxTorque: 150, // deg/s^2
};

export const WORLDS = {
  mars: {
    id: 'mars',
    name: 'Mars',
    gravity: 3.72,
    dragCoeff: 0.085,
    theme: 'mars',
    subtitle: '3.72 m/s² · Thin CO₂ air',
  },
  moon: {
    id: 'moon',
    name: 'Moon',
    gravity: 1.62,
    dragCoeff: 0.0,
    theme: 'moon',
    subtitle: '1.62 m/s² · Vacuum (no wind)',
  },
  earth: {
    id: 'earth',
    name: 'Earth',
    gravity: 9.81,
    dragCoeff: 0.14,
    theme: 'earth',
    subtitle: '9.81 m/s² · Dense atmosphere',
  },
};

export const MARS_SITES = [
  {
    id: 'jezero',
    name: 'Jezero Crater',
    subtitle: 'Perseverance · 2021',
    tier: 'Cadet',
    description: 'Ancient river delta basin. Wide landing pad and a gentle, steady Martian breeze.',
    windRange: [3.0, 7.0],
    gustAmp: 0,
    gustPeriod: 8.0,
    fuelStart: 110,
    roughness: 0.55,
    canyonWalls: false,
    dustStorm: false,
    startVxRange: [-1.0, 1.0],
    skyStops: ['#050203', '#1a0a07', '#42160a', '#7c2b12', '#aa441a'],
    groundStops: ['#793118', '#521e0d', '#2b0d05'],
    rimColor: '#9c4322',
    pads: [
      { label: 'DELTA PAD', w: 36, multiplier: 1, segRange: [18, 34], yFrac: 0.77 },
    ],
  },
  {
    id: 'gale',
    name: 'Gale Crater',
    subtitle: 'Curiosity · 2012',
    tier: 'Pilot',
    description: 'Aeolis Palus plain below Mt. Sharp. Watch the crosswind or risk the high 2× ridge pad.',
    windRange: [7.0, 12.0],
    gustAmp: 1.5,
    gustPeriod: 7.5,
    fuelStart: 100,
    roughness: 0.85,
    canyonWalls: false,
    dustStorm: false,
    startVxRange: [-2.0, 2.0],
    skyStops: ['#050204', '#170808', '#3c150c', '#6e2511', '#9a3916'],
    groundStops: ['#702c15', '#4c1b0b', '#270b04'],
    rimColor: '#913e20',
    pads: [
      { label: 'AEOLIS', w: 29, multiplier: 1, segRange: [10, 22], yFrac: 0.79 },
      { label: 'MT. SHARP', w: 20, multiplier: 2, segRange: [34, 45], yFrac: 0.67 },
    ],
  },
  {
    id: 'elysium',
    name: 'Elysium Planitia',
    subtitle: 'InSight · 2018',
    tier: 'Pilot',
    description: 'Volcanic flats swept by pulsing thermal gusts. Watch the windsock before final flare.',
    windRange: [6.0, 12.0],
    gustAmp: 5.5,
    gustPeriod: 4.8,
    fuelStart: 96,
    roughness: 0.9,
    canyonWalls: false,
    dustStorm: false,
    startVxRange: [-2.5, 2.5],
    skyStops: ['#060306', '#1e0b0b', '#491910', '#7c2b16', '#b1471c'],
    groundStops: ['#733018', '#4f1e0e', '#2a0d05'],
    rimColor: '#9b4424',
    pads: [
      { label: 'PLAINS', w: 27, multiplier: 1, segRange: [11, 23], yFrac: 0.78 },
      { label: 'SEISMO', w: 18, multiplier: 2, segRange: [33, 45], yFrac: 0.69 },
    ],
  },
  {
    id: 'valles',
    name: 'Valles Marineris',
    subtitle: 'Canyon Drop',
    tier: 'Commander',
    description: 'Steep canyon walls frame a gusty chasm. Kill initial entry drift before descending.',
    windRange: [7.0, 13.0],
    gustAmp: 6.0,
    gustPeriod: 5.2,
    fuelStart: 94,
    roughness: 1.05,
    canyonWalls: true,
    dustStorm: false,
    startVxRange: [-4.5, 4.5],
    skyStops: ['#040207', '#15080f', '#351214', '#632016', '#8d331a'],
    groundStops: ['#662413', '#441509', '#230903'],
    rimColor: '#88341c',
    pads: [
      { label: 'FLOOR', w: 24, multiplier: 1, segRange: [21, 31], yFrac: 0.84 },
      { label: 'RIM', w: 17, multiplier: 2, segRange: [9, 15], yFrac: 0.61 },
    ],
  },
  {
    id: 'olympus',
    name: 'Olympus Mons',
    subtitle: 'Caldera Rim',
    tier: 'Commander',
    description: 'Thin twilight air over jagged shield volcano ridges. Precision burns required.',
    windRange: [11.0, 16.0],
    gustAmp: 5.0,
    gustPeriod: 4.5,
    fuelStart: 90,
    roughness: 1.25,
    canyonWalls: false,
    dustStorm: false,
    startVxRange: [-4.0, 4.0],
    skyStops: ['#020208', '#0e0717', '#26101c', '#4c191a', '#75291c'],
    groundStops: ['#5c2214', '#3d140b', '#1e0804'],
    rimColor: '#7d3320',
    pads: [
      { label: 'CALDERA', w: 22, multiplier: 1, segRange: [12, 22], yFrac: 0.76 },
      { label: 'PEAK', w: 16, multiplier: 2, segRange: [34, 44], yFrac: 0.62 },
    ],
  },
  {
    id: 'arcadia',
    name: 'Arcadia Ice Plains',
    subtitle: 'Dust Storm',
    tier: 'Ace',
    description: 'High-velocity polar dust storm with violent surges and tight icy target pads.',
    windRange: [10.0, 16.0],
    gustAmp: 7.5,
    gustPeriod: 3.9,
    fuelStart: 88,
    roughness: 1.1,
    canyonWalls: false,
    dustStorm: true,
    startVxRange: [-4.5, 4.5],
    skyStops: ['#120804', '#2c1308', '#54230e', '#843b18', '#b05a26'],
    groundStops: ['#7a3921', '#542313', '#2e1108'],
    rimColor: '#a65532',
    pads: [
      { label: 'ICE PAD', w: 20, multiplier: 1, segRange: [12, 23], yFrac: 0.80 },
      { label: 'CORE', w: 15, multiplier: 2.5, segRange: [33, 44], yFrac: 0.68 },
    ],
  },
];

export const LANDER_LOCAL_POINTS = {
  leftFoot: { x: -5.0, y: 6.2 },
  centerFoot: { x: 0.0, y: 6.5 },
  rightFoot: { x: 5.0, y: 6.2 },
  leftWing: { x: -8.5, y: 0.4 },
  rightWing: { x: 8.5, y: 0.4 },
  mastTop: { x: 0.0, y: -4.6 },
};

export function createRng(seed) {
  let state = (seed === undefined ? Math.floor(Math.random() * 0xffffffff) : Number(seed)) >>> 0;
  if (state === 0) state = 0x6d2b79f5;
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeTiltDeg(angleDeg) {
  let signed = ((Number(angleDeg) % 360) + 540) % 360 - 180;
  if (Object.is(signed, -0)) signed = 0;
  return { signed, abs: Math.abs(signed) };
}

export function sampleTerrainY(points, x) {
  if (!points || points.length === 0) return WORLD_H;
  if (x <= points[0].x) return points[0].y;
  const last = points[points.length - 1];
  if (x >= last.x) return last.y;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (x >= a.x && x <= b.x) {
      const span = b.x - a.x;
      if (span <= 0) return a.y;
      const t = (x - a.x) / span;
      return a.y + t * (b.y - a.y);
    }
  }
  return last.y;
}

export function generateSiteTerrain(site, seed) {
  const s = site || MARS_SITES[0];
  const rng = createRng(seed);
  const segCount = 56;
  const segW = WORLD_W / segCount;
  const points = [];
  const rough = s.roughness ?? 1.0;

  // Base terrain profile
  let prevY = WORLD_H * (s.canyonWalls ? 0.44 : 0.74);
  for (let i = 0; i <= segCount; i++) {
    const x = i * segW;
    const u = i / segCount;
    let targetY = WORLD_H * 0.77;
    if (s.canyonWalls) {
      if (u < 0.16) targetY = WORLD_H * (0.42 + (u / 0.16) * 0.24);
      else if (u > 0.84) targetY = WORLD_H * (0.66 - ((u - 0.84) / 0.16) * 0.24);
      else targetY = WORLD_H * 0.81;
    } else if (s.id === 'olympus') {
      targetY = WORLD_H * (0.68 + Math.sin(u * Math.PI * 2.2) * 0.08);
    }
    const jitter = (rng() - 0.5) * 14 * rough;
    const y = Math.max(WORLD_H * 0.40, Math.min(WORLD_H * 0.90, prevY * 0.42 + targetY * 0.58 + jitter));
    prevY = y;
    points.push({ x, y });
  }

  // Carve flat landing pads and gentle approach shoulders
  const pads = [];
  for (const padSpec of s.pads) {
    const segSpan = Math.max(2, Math.round(padSpec.w / segW));
    const minSeg = Math.max(2, padSpec.segRange[0]);
    const maxSeg = Math.min(segCount - segSpan - 2, padSpec.segRange[1]);
    const startSeg = minSeg + Math.floor(rng() * Math.max(1, maxSeg - minSeg + 1));
    const endSeg = startSeg + segSpan;
    const padY = Math.max(
      WORLD_H * 0.55,
      Math.min(WORLD_H * 0.88, WORLD_H * (padSpec.yFrac + (rng() - 0.5) * 0.05))
    );

    for (let i = startSeg; i <= endSeg; i++) {
      points[i].y = padY;
    }
    // Smooth 2 segments on each side so approach isn't a vertical spike
    for (let step = 1; step <= 2; step++) {
      const li = startSeg - step;
      if (li >= 0) points[li].y = padY + (points[li].y - padY) * (step / 3);
      const ri = endSeg + step;
      if (ri <= segCount) points[ri].y = padY + (points[ri].y - padY) * (step / 3);
    }

    pads.push({
      x: points[startSeg].x,
      w: points[endSeg].x - points[startSeg].x,
      y: padY,
      label: padSpec.label,
      multiplier: padSpec.multiplier,
    });
  }

  // Rocks away from pads
  const rocks = [];
  for (let i = 0; i < 28; i++) {
    const rx = 4 + rng() * (WORLD_W - 8);
    const nearPad = pads.some((p) => rx > p.x - 5 && rx < p.x + p.w + 5);
    if (nearPad) continue;
    const ry = sampleTerrainY(points, rx);
    rocks.push({
      x: rx,
      y: ry,
      w: 1.8 + rng() * 4.4,
      h: 1.0 + rng() * 2.6,
      shade: rng(),
      rot: (rng() - 0.5) * 0.45,
    });
  }

  // Sub-surface craters for geological texture
  const craters = [];
  for (let i = 0; i < 7; i++) {
    craters.push({
      x: 16 + rng() * (WORLD_W - 32),
      yOffset: 4 + rng() * 14,
      rx: 6 + rng() * 11,
      ry: 1.5 + rng() * 3.0,
    });
  }

  // Two parallax mountain ridge silhouettes
  const makeRidge = (baseY, amp, step) => {
    const pts = [];
    let ry = baseY;
    for (let x = 0; x <= WORLD_W + 1; x += step) {
      ry = Math.max(WORLD_H * 0.28, Math.min(WORLD_H * 0.78, ry * 0.6 + (baseY + (rng() - 0.5) * amp) * 0.4));
      pts.push({ x: Math.min(x, WORLD_W), y: ry });
    }
    return pts;
  };

  return {
    points,
    pads,
    rocks,
    craters,
    mountainsFar: makeRidge(WORLD_H * 0.58, 18 * rough, 14),
    mountainsMid: makeRidge(WORLD_H * 0.65, 22 * rough, 10),
  };
}

export function computeWindAt(env, time) {
  if (!env || env.dragCoeff <= 0) {
    return { speed: 0, gusting: false, gustDelta: 0 };
  }
  const base = Number(env.baseWind || 0);
  const amp = Number(env.gustAmp || 0);
  const period = Math.max(1.5, Number(env.gustPeriod || 5.0));
  if (amp <= 0) {
    return { speed: base, gusting: false, gustDelta: 0 };
  }
  const wave = Math.sin((time * Math.PI * 2) / period) * 0.7 + Math.sin((time * Math.PI * 2) / (period * 0.47) + 1.1) * 0.3;
  const gustDelta = wave * amp;
  const speed = base + gustDelta;
  const gusting = Math.abs(gustDelta) > amp * 0.55;
  return { speed, gusting, gustDelta };
}

export function getLanderContactPoints(lander) {
  const rad = (lander.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const out = {};
  for (const [name, local] of Object.entries(LANDER_LOCAL_POINTS)) {
    out[name] = {
      x: lander.x + local.x * cos - local.y * sin,
      y: lander.y + local.x * sin + local.y * cos,
    };
  }
  return out;
}

export function stepLanderPhysics(lander, controls, env, dt) {
  const ctrl = controls || {};
  const drag = env.dragCoeff ?? 0.085;
  const gravity = env.gravity ?? 3.72;
  const hoverTarget = gravity > 8 ? PHYSICS.earthHoverThrottle : PHYSICS.hoverThrottle;

  let targetThrottle = 0;
  if (lander.fuel > 0) {
    if (ctrl.thrust) targetThrottle = 1.0;
    else if (ctrl.hover) targetThrottle = hoverTarget;
  }

  const spoolDiff = targetThrottle - lander.throttle;
  const maxStep = PHYSICS.throttleSpoolRate * dt;
  if (Math.abs(spoolDiff) <= maxStep) lander.throttle = targetThrottle;
  else lander.throttle += Math.sign(spoolDiff) * maxStep;

  if (lander.fuel <= 0) lander.throttle = 0;
  lander.thrusting = lander.throttle > 0.04 && lander.fuel > 0;

  // Rotation & SAS Auto-Level
  let rotTorque = 0;
  if (ctrl.left) rotTorque -= PHYSICS.rotAccel;
  if (ctrl.right) rotTorque += PHYSICS.rotAccel;

  const manualSteer = Boolean(ctrl.left || ctrl.right);
  if (!manualSteer && ctrl.sas) {
    const { signed } = normalizeTiltDeg(lander.angle);
    const sasTorque = -signed * PHYSICS.sasP - lander.angVel * PHYSICS.sasD;
    rotTorque += Math.max(-PHYSICS.sasMaxTorque, Math.min(PHYSICS.sasMaxTorque, sasTorque));
  } else if (!manualSteer) {
    rotTorque += -lander.angVel * PHYSICS.rotDamp;
  }

  lander.angVel += rotTorque * dt;
  lander.angVel = Math.max(-PHYSICS.rotMax, Math.min(PHYSICS.rotMax, lander.angVel));
  lander.angle += lander.angVel * dt;

  // Linear forces (thrust + aerodynamic wind drag + gravity)
  if (lander.thrusting) {
    const rad = ((lander.angle - 90) * Math.PI) / 180;
    const accel = PHYSICS.mainThrust * lander.throttle;
    lander.vx += Math.cos(rad) * accel * dt;
    lander.vy += Math.sin(rad) * accel * dt;
    lander.fuel = Math.max(0, lander.fuel - PHYSICS.fuelBurnFull * lander.throttle * dt);
  }

  const windSpeed = env.currentWind ?? env.baseWind ?? 0;
  if (drag > 0) {
    lander.vx += drag * (windSpeed - lander.vx) * dt;
  }
  lander.vy += gravity * dt;

  lander.x += lander.vx * dt;
  lander.y += lander.vy * dt;

  // Soft lateral boundaries and atmospheric ceiling
  if (lander.x < 8) {
    lander.x = 8;
    if (lander.vx < 0) lander.vx *= -0.35;
  } else if (lander.x > WORLD_W - 8) {
    lander.x = WORLD_W - 8;
    if (lander.vx > 0) lander.vx *= -0.35;
  }
  if (lander.y < 6) {
    lander.y = 6;
    if (lander.vy < 0) lander.vy = 0;
  }
}

export function evaluateContact(lander, terrain, currentWind = 0) {
  const pts = getLanderContactPoints(lander);
  let deepestPenetration = -Infinity;
  const hitPoints = [];

  for (const [name, p] of Object.entries(pts)) {
    const gy = sampleTerrainY(terrain.points, p.x);
    const pen = p.y - gy;
    if (pen >= 0) {
      hitPoints.push({ name, p, gy, pen });
      if (pen > deepestPenetration) deepestPenetration = pen;
    }
  }

  if (hitPoints.length === 0) {
    return { contacted: false };
  }

  const { abs: absTilt } = normalizeTiltDeg(lander.angle);
  const vspd = Math.abs(lander.vy);
  const hspd = Math.abs(lander.vx);
  const snapshot = {
    vspd,
    hspd,
    tilt: absTilt,
    fuel: lander.fuel,
    wind: currentWind,
    x: lander.x,
  };

  const hullHit = hitPoints.some((h) => h.name === 'leftWing' || h.name === 'rightWing' || h.name === 'mastTop');

  // Check if both outer footpads fall cleanly within a landing pad span
  const leftX = Math.min(pts.leftFoot.x, pts.rightFoot.x);
  const rightX = Math.max(pts.leftFoot.x, pts.rightFoot.x);
  const matchedPad = (terrain.pads || []).find(
    (pad) => leftX >= pad.x - 0.8 && rightX <= pad.x + pad.w + 0.8
  ) || null;
  const nearestPad = (terrain.pads || []).reduce((best, pad) => {
    const dist = Math.abs(lander.x - (pad.x + pad.w * 0.5));
    if (!best || dist < best.dist) return { pad, dist };
    return best;
  }, null)?.pad || null;

  const causes = [];
  if (hullHit) causes.push('Hull or solar wing clipped the surface');
  if (!matchedPad) causes.push('Touched down outside a landing pad');
  if (vspd >= SAFE_LIMITS.vspd) causes.push(`Vertical speed ${vspd.toFixed(1)} m/s (limit < ${SAFE_LIMITS.vspd.toFixed(1)} m/s)`);
  if (hspd >= SAFE_LIMITS.hspd) causes.push(`Horizontal drift ${hspd.toFixed(1)} m/s (limit < ${SAFE_LIMITS.hspd.toFixed(1)} m/s)`);
  if (absTilt > SAFE_LIMITS.tilt) causes.push(`Tilt ${absTilt.toFixed(1)}° (limit ≤ ${SAFE_LIMITS.tilt.toFixed(0)}°)`);

  const safe = !hullHit && Boolean(matchedPad) && vspd < SAFE_LIMITS.vspd && hspd < SAFE_LIMITS.hspd && absTilt <= SAFE_LIMITS.tilt;

  let headline = 'TOUCHDOWN CONFIRMED';
  let tip = 'Clean burn and smooth pad flare!';
  if (!safe) {
    if (lander.fuel <= 0.1 && vspd >= SAFE_LIMITS.vspd) {
      headline = 'OUT OF FUEL';
      tip = 'Save propellant by braking later in a single steady burn rather than hovering high.';
    } else if (hullHit) {
      headline = 'TERRAIN STRIKE';
      tip = 'Keep the lander upright so solar wings stay clear of ridges and canyon walls.';
    } else if (!matchedPad) {
      headline = 'MISSED LANDING PAD';
      tip = 'Cancel wind drift early and line up inside the green glide-slope corridor.';
    } else if (vspd >= SAFE_LIMITS.vspd) {
      headline = 'VERTICAL SPEED TOO HIGH';
      tip = `Hold main thrust longer before touchdown to bring V-SPD below ${SAFE_LIMITS.vspd.toFixed(1)} m/s.`;
    } else if (hspd >= SAFE_LIMITS.hspd) {
      headline = 'HORIZONTAL DRIFT TOO FAST';
      tip = `Tilt briefly into the drift or wind and pulse thrust to bring H-SPD under ${SAFE_LIMITS.hspd.toFixed(1)} m/s.`;
    } else {
      headline = 'TILT ANGLE EXCEEDED';
      tip = `Level upright within ${SAFE_LIMITS.tilt.toFixed(0)}° (or keep SAS on) before touching the pad.`;
    }
  }

  const refPad = matchedPad || nearestPad;
  const offsetM = refPad ? lander.x - (refPad.x + refPad.w * 0.5) : 0;

  return {
    contacted: true,
    safe,
    pad: matchedPad,
    nearestPad,
    offsetM,
    deepestPenetration,
    headline,
    causes,
    tip,
    snapshot,
  };
}

export function computeLandingScore(result, { assistsOff = false } = {}) {
  if (!result || !result.safe) {
    return { total: 0, base: 0, fuelBonus: 0, featherBonus: 0, bullseyeBonus: 0, assistBonus: 0, stars: 0, grade: 'CRASH' };
  }
  const snap = result.snapshot;
  const mult = result.pad?.multiplier || 1;
  const padW = result.pad?.w || 24;
  const base = Math.round(1000 * mult);
  const fuelBonus = Math.round(Math.max(0, snap.fuel) * 12);
  const featherBonus = Math.round(Math.max(0, (SAFE_LIMITS.vspd - snap.vspd) / SAFE_LIMITS.vspd) * 400);
  const bullseyeBonus = Math.round(Math.max(0, 1 - Math.abs(result.offsetM) / (padW * 0.5)) * 350);
  const assistBonus = assistsOff ? 250 : 0;
  const total = base + fuelBonus + featherBonus + bullseyeBonus + assistBonus;

  let stars = 1;
  let grade = 'SAFE';
  if (snap.fuel >= 35 && snap.vspd <= 2.2 && snap.hspd <= 1.4) {
    stars = 3;
    grade = snap.fuel >= 55 ? 'PERFECT' : 'EXCELLENT';
  } else if (snap.fuel >= 18 && snap.vspd <= 3.1) {
    stars = 2;
    grade = 'GOOD';
  }

  return { total, base, fuelBonus, featherBonus, bullseyeBonus, assistBonus, stars, grade };
}

// Stopping-distance rule: how far the lander falls while a full burn brakes it
// from its current descent speed to a gentle touchdown speed.
//   net braking = thrust·cos(tilt) − g,   d = (v² − v_target²) / (2 · net)
// plus half the throttle spool-up time spent still falling at v.
export const BRAKING_TARGET_VSPD = 2.0; // m/s, comfortably under SAFE_LIMITS.vspd

export function computeBrakingPlan(lander, env, alt = Infinity) {
  const g = env?.gravity ?? 3.72;
  const tiltRad = (normalizeTiltDeg(lander.angle).abs * Math.PI) / 180;
  const lift = PHYSICS.mainThrust * Math.max(0, Math.cos(tiltRad));
  const net = lift - g;
  const v = lander.vy;
  const target = BRAKING_TARGET_VSPD;
  const fuel = Math.max(0, lander.fuel ?? 0);

  if (v <= target) {
    return { net, stopDist: 0, canStop: net > 0, enoughFuel: true, fuelNeeded: 0, margin: alt, burnIn: Infinity, braking: false };
  }
  if (net <= 0) {
    return { net, stopDist: Infinity, canStop: false, enoughFuel: false, fuelNeeded: Infinity, margin: -Infinity, burnIn: 0, braking: true };
  }
  // The throttle ramps up linearly; that acts like a free fall for half the
  // ramp time followed by a full burn.
  const spool = 0.5 / PHYSICS.throttleSpoolRate;
  const vBurn = v + g * spool;
  const burnTime = (vBurn - target) / net;
  const stopDist = v * spool + 0.5 * g * spool * spool + (vBurn * vBurn - target * target) / (2 * net);
  const fuelNeeded = burnTime * PHYSICS.fuelBurnFull;
  const margin = alt - stopDist;
  return {
    net,
    stopDist,
    canStop: true,
    enoughFuel: fuel >= fuelNeeded,
    fuelNeeded,
    margin,
    burnIn: Math.max(0, margin / v),
    braking: true,
  };
}

// ── Autopilot ────────────────────────────────────────────────────────────
// A guidance computer like a real lander's: it measures position, velocity and
// wind, decides the thrust vector it wants, then turns the lander toward it and
// sets the throttle. It only presses the same controls a student can.
//   • Sideways: fly toward the 1× pad, slowing as it gets close, while leaning
//     into the wind to cancel drift.
//   • Down: stay above a glide-slope cone over the pad (and clear of ridges),
//     falling on a braking curve (v = √(2·braking·h)) so it burns late, and never
//     sinking faster than its sideways speed can be cancelled.
//   • Flare: the last few metres follow a gentle straight line to ~1 m/s.
export const AUTOPILOT = {
  sideGain: 0.45, // 1/s: desired sideways speed per metre from the pad centre
  sideMax: 14, // m/s
  sideBrake: 0.8, // m/s²: sideways braking curve
  velGain: 1.2, // 1/s: sideways speed error → acceleration
  glide: 1.6, // m of height allowed per m of distance outside the pad
  brakeFraction: 0.6, // fraction of the braking-curve speed it dares to fall at
  sink: 1.0, // sideways speed / sink-rate limit near the pad
  vertGain: 3.0, // 1/s: vertical speed error → acceleration
  clearance: 10, // m above the highest ridge on the way
};

export function pickAutopilotPad(terrain) {
  return (terrain.pads || []).reduce(
    (best, p) => (!best || p.multiplier < best.multiplier || (p.multiplier === best.multiplier && p.w > best.w) ? p : best),
    null
  );
}

export function autopilotControls(lander, env, terrain) {
  const A = AUTOPILOT;
  const L = lander;
  const g = env.gravity ?? 3.72;
  const drag = env.dragCoeff ?? 0;
  const wind = env.currentWind ?? env.baseWind ?? 0;
  const pad = pickAutopilotPad(terrain);
  const controls = { thrust: false, hover: false, left: false, right: false, sas: false };
  if (!pad) return { controls, phase: 'idle', pad: null, target: null };

  const xT = pad.x + pad.w / 2;
  const dx = xT - L.x;
  const footY = L.y + 6.5;
  const hPad = pad.y - footY;
  const tilt = normalizeTiltDeg(L.angle).signed;

  // Sideways: desired speed toward the pad, then the acceleration to get it
  // (plus whatever it takes to cancel the wind's drag).
  const adx = Math.abs(dx);
  const vxWant = Math.sign(dx) * Math.min(A.sideMax, A.sideGain * adx, Math.sqrt(2 * A.sideBrake * adx));
  const axWant = A.velGain * (vxWant - L.vx) - drag * (wind - L.vx);

  // Down: how far it may still fall, inside the glide-slope cone and above ridges.
  const halfIn = Math.max(2, pad.w / 2 - 5);
  const off = Math.max(0, adx - halfIn);
  let targetFoot = pad.y - off * A.glide;
  if (off > 0) {
    let ridge = Infinity;
    const a = Math.max(0, Math.min(L.x, xT) - 12);
    const b = Math.min(WORLD_W, Math.max(L.x, xT) + 12);
    for (let x = a; x <= b; x += 2) ridge = Math.min(ridge, sampleTerrainY(terrain.points, x));
    targetFoot = Math.min(targetFoot, ridge - A.clearance);
  }
  const room = targetFoot - footY;
  const braking = Math.max(0.5, PHYSICS.mainThrust * 0.9 - g);
  let vyWant;
  if (room >= 0) {
    const base = off > 0 ? 0 : 0.9;
    vyWant = Math.min(base + A.brakeFraction * Math.sqrt(2 * braking * room), base + 0.2 + 0.4 * room);
  } else {
    vyWant = Math.max(-3, 0.8 * room); // below the cone: climb back
  }
  const side = Math.abs(L.vx);
  if (side > 1.2) vyWant = Math.min(vyWant, Math.max(0.3, (Math.max(0, hPad - 3) * A.sink) / side));
  const ayWant = A.vertGain * (vyWant - L.vy);
  const phase = off > 0 ? 'approach' : hPad < 8 ? 'flare' : 'descent';

  // Thrust vector: upward part = g − wanted downward acceleration.
  const up = Math.max(0, g - ayWant);
  let maxTilt = hPad < 6 ? 9 : hPad < 18 ? 18 : 32;
  if (up > 0) {
    // Never lean so far that what is left can't hold the lander up.
    maxTilt = Math.min(maxTilt, (Math.acos(Math.min(1, (up * 1.04) / PHYSICS.mainThrust)) * 180) / Math.PI);
  }
  const lean = (Math.atan2(axWant, up > 0 ? up : g) * 180) / Math.PI;
  const tiltWant = Math.max(-maxTilt, Math.min(maxTilt, lean));
  const thrustWant = up > 0 ? up / Math.cos((tiltWant * Math.PI) / 180) : 0;

  // Turn toward the wanted tilt (looking a little ahead to avoid overshoot).
  const turn = tiltWant - (tilt + L.angVel * 0.12);
  if (turn > 1.2) controls.right = true;
  else if (turn < -1.2) controls.left = true;

  // Throttle: only push while roughly pointed the right way.
  const pointing = Math.max(0, Math.cos(((tiltWant - tilt) * Math.PI) / 90));
  const throttleWant = Math.min(1, thrustWant / PHYSICS.mainThrust) * pointing;
  if (L.throttle < throttleWant - 0.02 || (throttleWant > 0.05 && L.throttle <= throttleWant + 0.02 && L.throttle < throttleWant)) {
    controls.thrust = true;
  }

  return { controls, phase, pad, target: { x: xT, y: targetFoot, vx: vxWant, vy: vyWant, tilt: tiltWant } };
}

export function predictTrajectory(lander, env, terrain, { steps = 38, stepDt = 0.08 } = {}) {
  let px = lander.x;
  let py = lander.y + 6.4;
  let pvx = lander.vx;
  let pvy = lander.vy;
  const gravity = env.gravity ?? 3.72;
  const drag = env.dragCoeff ?? 0.085;
  const wind = env.currentWind ?? env.baseWind ?? 0;
  const points = [{ x: px, y: py }];
  let impact = null;

  for (let i = 0; i < steps; i++) {
    if (drag > 0) pvx += drag * (wind - pvx) * stepDt;
    pvy += gravity * stepDt;
    px += pvx * stepDt;
    py += pvy * stepDt;
    const clampedX = Math.max(0, Math.min(WORLD_W, px));
    const gy = sampleTerrainY(terrain.points, clampedX);
    if (py >= gy) {
      impact = { x: clampedX, y: gy };
      points.push(impact);
      break;
    }
    points.push({ x: px, y: py });
  }

  return { points, impact };
}

// ── Procedural Web Audio SFX ───────────────────────────────────────────────
class MarsAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineGain = null;
    this.engineFilter = null;
    this.rcsGain = null;
    this.lastBeep = 0;
    this.lastFuelBeep = 0;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.muted) this.silence();
  }

  _ensure() {
    if (this.muted || typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
        this._buildLoops();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _buildLoops() {
    const ctx = this.ctx;
    const bufLen = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufLen; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.06 * white) / 1.06;
      data[i] = last * 3.0;
    }

    const engSrc = ctx.createBufferSource();
    engSrc.buffer = buffer;
    engSrc.loop = true;
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 180;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    engSrc.connect(this.engineFilter).connect(this.engineGain).connect(ctx.destination);
    engSrc.start();

    const rcsSrc = ctx.createBufferSource();
    rcsSrc.buffer = buffer;
    rcsSrc.loop = true;
    const rcsFilter = ctx.createBiquadFilter();
    rcsFilter.type = 'bandpass';
    rcsFilter.frequency.value = 1450;
    rcsFilter.Q.value = 1.6;
    this.rcsGain = ctx.createGain();
    this.rcsGain.gain.value = 0;
    rcsSrc.connect(rcsFilter).connect(this.rcsGain).connect(ctx.destination);
    rcsSrc.start();
  }

  unlock() {
    this._ensure();
  }

  updateFlight(throttle, rcsActive, alt, vy, fuel) {
    if (this.muted || !this.ctx || !this.engineGain) return;
    const now = this.ctx.currentTime;
    const engTarget = throttle > 0.02 ? 0.04 + throttle * 0.14 : 0;
    this.engineGain.gain.setTargetAtTime(engTarget, now, 0.04);
    this.engineFilter.frequency.setTargetAtTime(140 + throttle * 460, now, 0.05);
    this.rcsGain.gain.setTargetAtTime(rcsActive ? 0.045 : 0, now, 0.025);

    const wallNow = performance.now();
    if (alt < 32 && vy > SAFE_LIMITS.vspd + 0.4 && wallNow - this.lastBeep > 380) {
      this.lastBeep = wallNow;
      this._tone(680, 0.07, 0.055, 'triangle');
    } else if (fuel > 0 && fuel < 18 && wallNow - this.lastFuelBeep > 1200) {
      this.lastFuelBeep = wallNow;
      this._tone(440, 0.08, 0.04, 'sine');
    }
  }

  _tone(freq, dur, gainVal, type = 'sine', endFreq = null) {
    const ctx = this._ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  }

  playLanded() {
    this.silence();
    this._tone(120, 0.14, 0.12, 'sine', 55);
    setTimeout(() => this._tone(523.25, 0.12, 0.08, 'triangle'), 90);
    setTimeout(() => this._tone(659.25, 0.18, 0.09, 'triangle'), 190);
    setTimeout(() => this._tone(783.99, 0.28, 0.09, 'triangle'), 310);
  }

  playCrash() {
    this.silence();
    const ctx = this._ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dur = 0.55;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.14));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, now);
    filter.frequency.exponentialRampToValueAtTime(90, now + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(now);
  }

  silence() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.engineGain) this.engineGain.gain.setTargetAtTime(0, now, 0.02);
    if (this.rcsGain) this.rcsGain.gain.setTargetAtTime(0, now, 0.02);
  }

  destroy() {
    this.silence();
    if (this.ctx && typeof this.ctx.close === 'function') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
  }
}

// ── Canvas2D Simulation & Renderer ─────────────────────────────────────────
export class MarsLanderGame {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = {
      siteId: options.siteId || 'jezero',
      worldId: options.worldId || 'mars',
      customWind: options.customWind ?? null,
      fuelMultiplier: options.fuelMultiplier ?? 1.0,
      showTrajectory: options.showTrajectory ?? true,
      showVector: options.showVector ?? true,
      showBrakingGuide: options.showBrakingGuide ?? false,
      sasEnabled: options.sasEnabled ?? true,
      muted: options.muted ?? false,
      autoLaunch: options.autoLaunch ?? false,
      onStateChange: options.onStateChange || null,
      onOutcome: options.onOutcome || null,
      onTelemetry: options.onTelemetry || null,
    };

    this.audio = new MarsAudio();
    this.audio.setMuted(this.options.muted);

    this.cssW = 920;
    this.cssH = 542;
    this.dpr = 1;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    this.keys = Object.create(null);
    this.touchControls = { thrust: false, hover: false, left: false, right: false };

    this.state = 'ready';
    this.time = 0;
    this.accum = 0;
    this.lastTs = 0;
    this.shakeTime = 0;
    this.shakeAmp = 0;
    this.legCompression = 0;
    this.outcome = null;
    this.scoreBreakdown = null;
    this.rover = null;
    this.particles = [];
    this.dustStreaks = [];
    this.stars = [];

    this._generateStars();
    this._setupResize();
    this._bindEvents();
    this.loadMission({
      siteId: this.options.siteId,
      worldId: this.options.worldId,
      customWind: this.options.customWind,
      fuelMultiplier: this.options.fuelMultiplier,
      autoLaunch: this.options.autoLaunch,
    });

    this._raf = this._createRaf();
    this._loopBound = (ts) => this._loop(ts);
    this._rafId = this._raf(this._loopBound);
  }

  _createRaf() {
    if (typeof window !== 'undefined' && window.SimKit?.raf) {
      return window.SimKit.raf(this.canvas);
    }
    const raf = (cb) => window.requestAnimationFrame(cb);
    raf.cancel = (id) => window.cancelAnimationFrame(id);
    raf.destroy = () => {};
    return raf;
  }

  _generateStars() {
    const rng = createRng(4242);
    this.stars = [];
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: rng(),
        y: rng() * 0.72,
        r: rng() < 0.08 ? 1.7 : rng() < 0.3 ? 1.15 : 0.65,
        base: 0.3 + rng() * 0.65,
        amp: 0.12 + rng() * 0.28,
        freq: 0.7 + rng() * 2.5,
        phase: rng() * Math.PI * 2,
      });
    }
  }

  _setupResize() {
    const box = this.canvas.parentElement || this.canvas;
    const resize = () => {
      const w = Math.max(260, box.clientWidth || 920);
      const h = Math.round((w * WORLD_H) / WORLD_W);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.cssW = w;
      this.cssH = h;
      this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
    };
    resize();
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(resize);
      this._resizeObserver.observe(box);
    } else {
      this._onWindowResize = resize;
      window.addEventListener('resize', resize);
    }
  }

  _bindEvents() {
    this._onKeyDown = (e) => {
      if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      this.audio.unlock();
      if (e.code === 'KeyR') {
        e.preventDefault();
        this.restart();
        return;
      }
      if (e.code === 'KeyP') {
        e.preventDefault();
        this.togglePause();
        return;
      }
      if (e.code === 'KeyM') {
        this.setOption('muted', !this.options.muted);
        return;
      }
      if (e.code === 'KeyT') {
        this.setOption('sasEnabled', !this.options.sasEnabled);
        return;
      }
      if (e.code === 'KeyG') {
        this.setOption('showTrajectory', !this.options.showTrajectory);
        return;
      }
      if (e.code === 'Enter' && this.state === 'ready') {
        e.preventDefault();
        this.launch();
        return;
      }

      const flightCodes = new Set([
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight',
      ]);
      if (flightCodes.has(e.code)) {
        e.preventDefault();
        this.keys[e.code] = true;
        if (this.autopilot && this.state === 'playing') this.takeOver();
        if (this.state === 'ready' && (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space')) {
          this.launch();
        }
      }
    };

    this._onKeyUp = (e) => {
      this.keys[e.code] = false;
    };

    this._onBlur = () => {
      for (const k of Object.keys(this.keys)) this.keys[k] = false;
      this.touchControls = { thrust: false, hover: false, left: false, right: false };
      this.audio.silence();
    };

    this._onVisibility = () => {
      if (document.hidden) this._onBlur();
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  getSite() {
    return MARS_SITES.find((s) => s.id === this.options.siteId) || MARS_SITES[0];
  }

  getWorld() {
    return WORLDS[this.options.worldId] || WORLDS.mars;
  }

  loadMission(opts = {}) {
    if (opts.siteId) this.options.siteId = opts.siteId;
    if (opts.worldId) this.options.worldId = opts.worldId;
    if ('customWind' in opts) this.options.customWind = opts.customWind;
    if (opts.fuelMultiplier != null) this.options.fuelMultiplier = opts.fuelMultiplier;

    const site = this.getSite();
    const world = this.getWorld();
    const seed = opts.seed !== undefined ? opts.seed : Math.floor(Math.random() * 0xffffffff);
    this.currentSeed = seed;
    const rng = createRng(seed ^ 0x9e3779b9);

    this.terrain = generateSiteTerrain(site, seed);

    let baseWind = 0;
    if (world.dragCoeff > 0) {
      if (this.options.customWind !== null && Number.isFinite(this.options.customWind)) {
        baseWind = this.options.customWind;
      } else {
        const [minW, maxW] = site.windRange;
        const mag = minW + rng() * (maxW - minW);
        const dir = rng() < 0.5 ? 1 : -1;
        baseWind = mag * dir;
      }
    }

    this.env = {
      gravity: world.gravity,
      dragCoeff: world.dragCoeff,
      baseWind,
      gustAmp: world.dragCoeff > 0 ? site.gustAmp : 0,
      gustPeriod: site.gustPeriod,
      currentWind: baseWind,
    };

    const startVx =
      opts.startVx !== undefined
        ? opts.startVx
        : site.startVxRange[0] + rng() * (site.startVxRange[1] - site.startVxRange[0]);
    const fuelStart = Math.max(
      25,
      Math.min(150, (opts.fuelStart ?? site.fuelStart) * (this.options.fuelMultiplier ?? 1))
    );

    const startX = WORLD_W * (0.38 + rng() * 0.24);
    this.lander = {
      x: startX,
      y: 28,
      vx: startVx,
      vy: 0,
      angle: 0,
      angVel: 0,
      fuel: fuelStart,
      fuelMax: Math.max(100, fuelStart),
      throttle: 0,
      thrusting: false,
    };

    this.particles = [];
    this.dustStreaks = [];
    this._initDustStreaks(site);
    this.shakeTime = 0;
    this.legCompression = 0;
    this.outcome = null;
    this.scoreBreakdown = null;
    this.rover = null;
    this.flightTime = 0;
    this.flightTrace = [];
    this.autopilot = Boolean(opts.autopilot);
    this.autopilotFlew = this.autopilot;
    this.autopilotPhase = null;
    this.audio.silence();

    this.state = opts.autoLaunch ? 'playing' : 'ready';
    this._notifyState();
    this._notifyTelemetry(true);
  }

  _initDustStreaks(site) {
    const count = site.dustStorm ? 52 : 20;
    for (let i = 0; i < count; i++) {
      this.dustStreaks.push({
        x: Math.random() * WORLD_W,
        y: 18 + Math.random() * (WORLD_H * 0.68),
        len: (site.dustStorm ? 8 : 4) + Math.random() * 10,
        alpha: (site.dustStorm ? 0.22 : 0.09) + Math.random() * 0.14,
      });
    }
  }

  launch() {
    this.audio.unlock();
    if (this.state === 'ready') {
      this.state = 'playing';
      this._notifyState();
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this._notifyState();
    }
  }

  restart(opts = {}) {
    this.audio.unlock();
    this.loadMission({ ...opts, autoLaunch: true });
  }

  // Fly a fresh descent on the guidance computer. Any flight key takes over.
  flyAutopilot(opts = {}) {
    this.audio.unlock();
    this.loadMission({ ...opts, autoLaunch: true, autopilot: true });
  }

  takeOver() {
    if (!this.autopilot) return;
    this.autopilot = false;
    this.autopilotPhase = null;
    this._notifyState();
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.audio.silence();
      this._notifyState();
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this._notifyState();
    }
  }

  setControl(name, active) {
    if (name in this.touchControls) {
      this.touchControls[name] = Boolean(active);
      if (active) {
        this.audio.unlock();
        if (this.autopilot && this.state === 'playing') this.takeOver();
        if (this.state === 'ready' && (name === 'thrust' || name === 'hover')) {
          this.launch();
        }
      }
    }
  }

  setOption(key, value) {
    this.options[key] = value;
    if (key === 'muted') {
      this.audio.setMuted(value);
    }
    this._notifyState();
  }

  getState() {
    return {
      state: this.state,
      site: this.getSite(),
      world: this.getWorld(),
      options: { ...this.options },
      lander: { ...this.lander },
      env: { ...this.env },
      outcome: this.outcome,
      scoreBreakdown: this.scoreBreakdown,
      autopilot: this.autopilot,
      autopilotFlew: this.autopilotFlew,
    };
  }

  _activeControls() {
    return {
      thrust: Boolean(this.keys.ArrowUp || this.keys.KeyW || this.keys.Space || this.touchControls.thrust),
      hover: Boolean(this.keys.ArrowDown || this.keys.KeyS || this.keys.ShiftLeft || this.keys.ShiftRight || this.touchControls.hover),
      left: Boolean(this.keys.ArrowLeft || this.keys.KeyA || this.touchControls.left),
      right: Boolean(this.keys.ArrowRight || this.keys.KeyD || this.touchControls.right),
      sas: Boolean(this.options.sasEnabled),
    };
  }

  _notifyState() {
    if (this.options.onStateChange) this.options.onStateChange(this.getState());
  }

  _notifyTelemetry(force = false) {
    if (!this.options.onTelemetry) return;
    if (!force && Math.floor(this.time * 15) === this._lastTeleTick) return;
    this._lastTeleTick = Math.floor(this.time * 15);
    const alt = Math.max(0, sampleTerrainY(this.terrain.points, this.lander.x) - this.lander.y - 6.5);
    this.options.onTelemetry({
      alt,
      vspd: this.lander.vy,
      hspd: this.lander.vx,
      tilt: normalizeTiltDeg(this.lander.angle).abs,
      fuel: this.lander.fuel,
      wind: this.env.currentWind,
    });
  }

  _loop(ts) {
    if (!this.lastTs) this.lastTs = ts;
    const elapsed = Math.min(0.05, Math.max(0, (ts - this.lastTs) / 1000));
    this.lastTs = ts;

    if (this.state !== 'paused') {
      this.time += elapsed;
    }

    const windInfo = computeWindAt(this.env, this.time);
    this.env.currentWind = windInfo.speed;
    this.env.gusting = windInfo.gusting;

    if (this.state === 'playing') {
      const DT = 1 / 60;
      this.accum += elapsed;
      while (this.accum >= DT && this.state === 'playing') {
        this._step(DT);
        this.accum -= DT;
      }
      this._notifyTelemetry();
    } else if (this.state === 'ready') {
      this._updateDustStreaks(elapsed);
    } else {
      this._updateParticles(elapsed);
      this._updateDustStreaks(elapsed);
      if (this.state === 'landed' && this.rover) {
        this._updateRover(elapsed);
      }
    }

    if (this.shakeTime > 0) this.shakeTime = Math.max(0, this.shakeTime - elapsed);
    this._render();
    this._rafId = this._raf(this._loopBound);
  }

  _step(dt) {
    let ctrl = this._activeControls();
    if (this.autopilot) {
      const ap = autopilotControls(this.lander, this.env, this.terrain);
      ctrl = ap.controls;
      this.autopilotPhase = ap.phase;
    }
    stepLanderPhysics(this.lander, ctrl, this.env, dt);

    const gy = sampleTerrainY(this.terrain.points, this.lander.x);
    const alt = Math.max(0, gy - (this.lander.y + 6.5));

    this.flightTime += dt;
    const lastSample = this.flightTrace[this.flightTrace.length - 1];
    if (!lastSample || this.flightTime - lastSample.t >= 0.1 - 1e-9) {
      this._recordSample(alt);
    }

    // Exhaust & Plume-Surface Interaction dust
    if (this.lander.thrusting) {
      this._spawnExhaust(alt, gy);
    }
    if (ctrl.left || ctrl.right) {
      this._spawnRcsPuff(ctrl.left ? 1 : -1);
    }

    this._updateParticles(dt);
    this._updateDustStreaks(dt);

    this.audio.updateFlight(
      this.lander.throttle,
      ctrl.left || ctrl.right,
      alt,
      this.lander.vy,
      this.lander.fuel
    );

    const contact = evaluateContact(this.lander, this.terrain, this.env.currentWind);
    if (contact.contacted) {
      // Last sample is the touchdown itself (speeds before the legs absorb them).
      this._recordSample(0);
      this.lander.y -= contact.deepestPenetration;
      this.lander.vx = 0;
      this.lander.vy = 0;
      this.lander.angVel = 0;
      this.lander.throttle = 0;
      this.lander.thrusting = false;
      this.outcome = contact;

      if (contact.safe) {
        this.state = 'landed';
        this.legCompression = 1.0;
        const assistsOff = !this.options.sasEnabled && !this.options.showTrajectory;
        this.scoreBreakdown = computeLandingScore(contact, { assistsOff });
        this._spawnDustPlume(this.lander.x, sampleTerrainY(this.terrain.points, this.lander.x), 30);
        this._spawnRoverRollout(contact.pad);
        this.audio.playLanded();
      } else {
        this.state = 'crashed';
        this.scoreBreakdown = computeLandingScore(contact);
        this.shakeTime = 0.55;
        this.shakeAmp = 4.5;
        this._spawnCrashParticles(this.lander.x, sampleTerrainY(this.terrain.points, this.lander.x));
        this.audio.playCrash();
      }
      this._notifyState();
      if (this.options.onOutcome) {
        this.options.onOutcome({
          outcome: this.outcome,
          scoreBreakdown: this.scoreBreakdown,
          state: this.getState(),
          trace: this.flightTrace.slice(),
        });
      }
    }
  }

  _recordSample(alt) {
    const plan = computeBrakingPlan(this.lander, this.env, alt);
    this.flightTrace.push({
      t: Math.round(this.flightTime * 100) / 100,
      alt: Math.round(alt * 10) / 10,
      vspd: Math.round(this.lander.vy * 100) / 100,
      hspd: Math.round(this.lander.vx * 100) / 100,
      fuel: Math.round(this.lander.fuel * 10) / 10,
      throttle: Math.round(this.lander.throttle * 100) / 100,
      stopDist: Number.isFinite(plan.stopDist) ? Math.round(plan.stopDist * 10) / 10 : null,
    });
    if (this.flightTrace.length > 3000) this.flightTrace.shift();
  }

  _spawnExhaust(alt, gy) {
    const rad = ((this.lander.angle + 90) * Math.PI) / 180;
    const bx = this.lander.x + Math.cos(rad) * 4.5;
    const by = this.lander.y + Math.sin(rad) * 4.5;
    const count = this.lander.throttle > 0.6 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const a = rad + (Math.random() - 0.5) * 0.42;
      const spd = 22 + this.lander.throttle * 24 + Math.random() * 14;
      this.particles.push({
        x: bx + (Math.random() - 0.5) * 1.4,
        y: by + (Math.random() - 0.5) * 1.4,
        vx: Math.cos(a) * spd + this.lander.vx * 0.25,
        vy: Math.sin(a) * spd + this.lander.vy * 0.25,
        life: 1,
        maxLife: 0.14 + Math.random() * 0.14,
        size: 0.8 + this.lander.throttle * 0.9,
        type: 'exhaust',
      });
    }
    // Plume-Surface Interaction regolith kick-up below 38m
    if (alt < 38 && Math.random() < 0.75) {
      const intensity = 1 - alt / 38;
      const dir = Math.random() < 0.5 ? -1 : 1;
      this.particles.push({
        x: this.lander.x + (Math.random() - 0.5) * 8,
        y: gy - 0.4,
        vx: dir * (10 + Math.random() * 24 * intensity) + this.env.currentWind * 0.4,
        vy: -(2 + Math.random() * 7 * intensity),
        life: 1,
        maxLife: 0.45 + Math.random() * 0.45,
        size: 1.0 + Math.random() * 1.8 * intensity,
        type: 'dust',
      });
    }
  }

  _spawnRcsPuff(side) {
    if (Math.random() > 0.55) return;
    const rad = (this.lander.angle * Math.PI) / 180;
    const px = this.lander.x + Math.cos(rad) * (side * 3.8);
    const py = this.lander.y + Math.sin(rad) * (side * 3.8);
    this.particles.push({
      x: px,
      y: py,
      vx: Math.cos(rad) * side * 14 + this.lander.vx * 0.3,
      vy: Math.sin(rad) * side * 14 + this.lander.vy * 0.3,
      life: 1,
      maxLife: 0.16,
      size: 0.55,
      type: 'rcs',
    });
  }

  _spawnDustPlume(x, y, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y - 0.3,
        vx: (Math.random() - 0.5) * 28,
        vy: -(3 + Math.random() * 14),
        life: 1,
        maxLife: 0.9 + Math.random() * 0.8,
        size: 1.1 + Math.random() * 2.1,
        type: 'dust',
      });
    }
  }

  _spawnCrashParticles(x, y) {
    for (let i = 0; i < 64; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 8 + Math.random() * 48;
      const isFire = i < 26;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y - Math.random() * 3,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - (isFire ? 24 : 8),
        life: 1,
        maxLife: 0.5 + Math.random() * 1.1,
        size: 0.9 + Math.random() * (isFire ? 2.8 : 2.1),
        type: isFire ? 'fire' : 'debris',
        col: Math.random() < 0.55 ? '#ff7a30' : '#d64518',
      });
    }
    for (let i = 0; i < 16; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y - 1.5,
        vx: (Math.random() - 0.5) * 14,
        vy: -(5 + Math.random() * 16),
        life: 1,
        maxLife: 1.3 + Math.random() * 0.9,
        size: 2.8 + Math.random() * 4.5,
        type: 'smoke',
      });
    }
  }

  _spawnRoverRollout(pad) {
    const dir = this.lander.x < (pad.x + pad.w * 0.5) ? 1 : -1;
    const targetX = Math.max(pad.x + 3, Math.min(pad.x + pad.w - 3, this.lander.x + dir * 11));
    this.rover = {
      x: this.lander.x,
      y: pad.y,
      targetX,
      dir,
      laserTimer: 0,
      targetRockX: targetX + dir * 4.5,
    };
  }

  _updateRover(dt) {
    if (!this.rover) return;
    const dx = this.rover.targetX - this.rover.x;
    if (Math.abs(dx) > 0.2) {
      this.rover.x += Math.sign(dx) * Math.min(Math.abs(dx), 6.5 * dt);
      this.rover.y = sampleTerrainY(this.terrain.points, this.rover.x);
    } else {
      this.rover.laserTimer += dt;
      if (this.rover.laserTimer > 0.45 && Math.random() < 0.35) {
        this.particles.push({
          x: this.rover.targetRockX,
          y: sampleTerrainY(this.terrain.points, this.rover.targetRockX) - 0.8,
          vx: (Math.random() - 0.5) * 10,
          vy: -(3 + Math.random() * 7),
          life: 1,
          maxLife: 0.25,
          size: 0.45,
          type: 'laser',
        });
      }
    }
  }

  _updateParticles(dt) {
    const g = this.env.gravity * 0.55;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type !== 'exhaust' && p.type !== 'rcs') p.vy += g * dt;
      p.vx *= 0.985;
    }
  }

  _updateDustStreaks(dt) {
    if (this.env.dragCoeff <= 0) return;
    const w = this.env.currentWind;
    for (const d of this.dustStreaks) {
      d.x += w * 1.45 * dt;
      if (d.x > WORLD_W + 15) d.x = -15;
      if (d.x < -15) d.x = WORLD_W + 15;
    }
  }

  _render() {
    const ctx = this.ctx;
    const W = this.cssW;
    const H = this.cssH;
    const scale = W / WORLD_W;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // World layer (meters)
    ctx.save();
    ctx.scale(scale, scale);

    if (this.shakeTime > 0 && !this.reducedMotion) {
      const s = this.shakeAmp * (this.shakeTime / 0.55);
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    const site = this.getSite();
    const world = this.getWorld();

    this._drawSky(ctx, site, world);
    this._drawParallaxRidges(ctx, site, world);
    this._drawDustStreaks(ctx, site, world);
    this._drawTerrainAndPads(ctx, site, world);
    if (this.options.showTrajectory && this.state === 'playing') {
      this._drawTrajectoryArc(ctx);
    }
    this._drawParticles(ctx);
    if (this.options.showVector && this.state === 'playing') {
      this._drawVelocityVector(ctx);
    }
    if (this.options.showBrakingGuide && this.state === 'playing') {
      this._drawBrakingGuide(ctx);
    }
    this._drawLander(ctx);
    if (this.state === 'landed' && this.rover) {
      this._drawRover(ctx);
    }

    ctx.restore();

    // Screen-space crisp cockpit HUD (CSS pixels)
    this._drawHUD(ctx, W, H, site, world);

    ctx.restore();
  }

  _drawSky(ctx, site, world) {
    const grad = ctx.createLinearGradient(0, 0, 0, WORLD_H * 0.82);
    if (world.theme === 'moon') {
      grad.addColorStop(0, '#010205');
      grad.addColorStop(0.6, '#050812');
      grad.addColorStop(1, '#101524');
    } else if (world.theme === 'earth') {
      grad.addColorStop(0, '#040a18');
      grad.addColorStop(0.45, '#12315f');
      grad.addColorStop(0.8, '#2d68a8');
      grad.addColorStop(1, '#7bb3df');
    } else {
      const stops = site.skyStops;
      grad.addColorStop(0, stops[0]);
      grad.addColorStop(0.28, stops[1]);
      grad.addColorStop(0.58, stops[2]);
      grad.addColorStop(0.82, stops[3]);
      grad.addColorStop(1, stops[4]);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Stars
    const starFade = world.theme === 'earth' ? 0.45 : site.dustStorm ? 0.35 : 1;
    for (const s of this.stars) {
      const tw = this.reducedMotion ? s.base : s.base + s.amp * Math.sin(this.time * s.freq + s.phase);
      ctx.globalAlpha = Math.max(0, Math.min(1, tw * starFade));
      ctx.beginPath();
      ctx.arc(s.x * WORLD_W, s.y * WORLD_H, s.r * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Celestial companions
    if (world.theme === 'mars') {
      // Phobos with Stickney crater
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(WORLD_W * 0.78, WORLD_H * 0.14, 3.2, 2.0, -0.25, 0, Math.PI * 2);
      ctx.fillStyle = '#d2b48c';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(WORLD_W * 0.776, WORLD_H * 0.138, 0.75, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(70,48,34,0.65)';
      ctx.fill();
      // Deimos
      ctx.beginPath();
      ctx.arc(WORLD_W * 0.65, WORLD_H * 0.21, 0.9, 0, Math.PI * 2);
      ctx.fillStyle = '#dfcbb0';
      ctx.fill();
      ctx.restore();
    } else if (world.theme === 'moon') {
      // Earthrise in lunar sky
      ctx.save();
      ctx.beginPath();
      ctx.arc(WORLD_W * 0.77, WORLD_H * 0.17, 5.2, 0, Math.PI * 2);
      ctx.fillStyle = '#2b7de9';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(WORLD_W * 0.764, WORLD_H * 0.16, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245,250,255,0.55)';
      ctx.fill();
      ctx.restore();
    } else {
      // Sun glow
      ctx.save();
      ctx.beginPath();
      ctx.arc(WORLD_W * 0.79, WORLD_H * 0.16, 4.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,244,195,0.95)';
      ctx.fill();
      ctx.restore();
    }
  }

  _drawParallaxRidges(ctx, site, world) {
    const drawLayer = (pts, fill) => {
      if (!pts?.length) return;
      ctx.beginPath();
      ctx.moveTo(0, WORLD_H);
      for (const p of pts) ctx.lineTo(p.x, p.y);
      ctx.lineTo(WORLD_W, WORLD_H);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };
    const farCol = world.theme === 'moon' ? 'rgba(32,38,54,0.6)' : world.theme === 'earth' ? 'rgba(24,52,88,0.55)' : 'rgba(62,20,10,0.55)';
    const midCol = world.theme === 'moon' ? 'rgba(46,52,70,0.75)' : world.theme === 'earth' ? 'rgba(32,68,94,0.7)' : 'rgba(84,28,14,0.68)';
    drawLayer(this.terrain.mountainsFar, farCol);
    drawLayer(this.terrain.mountainsMid, midCol);
  }

  _drawDustStreaks(ctx, site, world) {
    if (world.dragCoeff <= 0 || Math.abs(this.env.currentWind) < 0.8) return;
    ctx.save();
    ctx.lineWidth = 0.28;
    const col = world.theme === 'earth' ? '220,240,255' : '240,155,95';
    for (const d of this.dustStreaks) {
      ctx.strokeStyle = `rgba(${col},${d.alpha})`;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + (this.env.currentWind >= 0 ? d.len : -d.len), d.y + 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawTerrainAndPads(ctx, site, world) {
    const pts = this.terrain.points;
    for (const c of this.terrain.craters) {
      const base = sampleTerrainY(pts, c.x);
      const cy = Math.min(WORLD_H - 4, base + c.yOffset);
      ctx.beginPath();
      ctx.ellipse(c.x, cy, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15,5,2,0.42)';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.x, cy - c.ry * 0.25, c.rx * 1.05, c.ry * 0.5, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = 'rgba(160,75,40,0.35)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(0, WORLD_H);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(WORLD_W, WORLD_H);
    ctx.closePath();

    const tGrad = ctx.createLinearGradient(0, WORLD_H * 0.58, 0, WORLD_H);
    if (world.theme === 'moon') {
      tGrad.addColorStop(0, '#6a707c');
      tGrad.addColorStop(0.45, '#464b56');
      tGrad.addColorStop(1, '#23262e');
    } else if (world.theme === 'earth') {
      tGrad.addColorStop(0, '#3e6b48');
      tGrad.addColorStop(0.4, '#2a4733');
      tGrad.addColorStop(1, '#18241d');
    } else {
      tGrad.addColorStop(0, site.groundStops[0]);
      tGrad.addColorStop(0.38, site.groundStops[1]);
      tGrad.addColorStop(1, site.groundStops[2]);
    }
    ctx.fillStyle = tGrad;
    ctx.fill();

    // Surface rim stroke
    ctx.beginPath();
    pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = world.theme === 'moon' ? '#9ca3af' : world.theme === 'earth' ? '#68a36f' : site.rimColor;
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // Rocks
    for (const r of this.terrain.rocks) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rot);
      const tone = Math.round(70 + r.shade * 70);
      ctx.beginPath();
      ctx.ellipse(0, -r.h * 0.45, r.w * 0.5, r.h * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle =
        world.theme === 'moon'
          ? `rgb(${tone + 25},${tone + 28},${tone + 34})`
          : world.theme === 'earth'
          ? `rgb(${tone},${tone + 15},${tone})`
          : `rgb(${tone + 22},${Math.round(tone * 0.46)},${Math.round(tone * 0.28)})`;
      ctx.fill();
      ctx.restore();
    }

    // Landing Pads + Glide-slope corridor + Windsock
    for (const pad of this.terrain.pads) {
      const aligned = this.lander.x >= pad.x - 1 && this.lander.x <= pad.x + pad.w + 1;
      if (aligned && (this.state === 'playing' || this.state === 'ready')) {
        const gGrad = ctx.createLinearGradient(0, pad.y - 42, 0, pad.y);
        gGrad.addColorStop(0, 'rgba(52,211,153,0)');
        gGrad.addColorStop(1, 'rgba(52,211,153,0.16)');
        ctx.fillStyle = gGrad;
        ctx.fillRect(pad.x, pad.y - 42, pad.w, 42);
      }

      // Pad deck
      ctx.fillStyle = pad.multiplier > 1 ? '#f59e0b' : '#e08040';
      ctx.fillRect(pad.x, pad.y - 1.8, pad.w, 1.8);
      ctx.fillStyle = '#29150d';
      ctx.fillRect(pad.x + 1.2, pad.y - 0.9, pad.w - 2.4, 0.9);

      // Blinking edge strobes
      const lights = 5;
      for (let i = 0; i < lights; i++) {
        const lx = pad.x + (i / (lights - 1)) * pad.w;
        const on = this.reducedMotion ? true : Math.sin(this.time * 4.0 - i * 0.9) > 0.05;
        ctx.beginPath();
        ctx.arc(lx, pad.y - 1.8, on ? 1.15 : 0.85, 0, Math.PI * 2);
        ctx.fillStyle = on ? (aligned ? '#6ee7b7' : '#fde68a') : '#785028';
        ctx.fill();
      }

      // Windsock mast on right side of primary pad
      const sockX = pad.x + pad.w + 2.5;
      const sockY = sampleTerrainY(pts, sockX);
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(sockX, sockY);
      ctx.lineTo(sockX, sockY - 6.5);
      ctx.stroke();

      if (world.dragCoeff > 0) {
        const w = this.env.currentWind;
        const dir = w >= 0 ? 1 : -1;
        const strength = Math.min(1, Math.abs(w) / 14);
        const flutter = this.reducedMotion ? 0 : Math.sin(this.time * 12) * 0.45 * strength;
        const tipX = sockX + dir * (1.2 + strength * 3.8);
        const tipY = sockY - 6.3 + (1 - strength) * 2.6 + flutter;
        ctx.beginPath();
        ctx.moveTo(sockX, sockY - 6.4);
        ctx.lineTo(tipX, tipY - 0.5);
        ctx.lineTo(tipX, tipY + 0.5);
        ctx.lineTo(sockX, sockY - 5.2);
        ctx.closePath();
        ctx.fillStyle = this.env.gusting ? '#fb7185' : '#fb923c';
        ctx.fill();
      }

      // Pad label
      ctx.font = '700 3.2px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = pad.multiplier > 1 ? '#fde68a' : '#fed7aa';
      const label = pad.multiplier > 1 ? `${pad.label} · ${pad.multiplier}×` : pad.label;
      ctx.fillText(label, pad.x + pad.w * 0.5, pad.y - 3.6);
    }
  }

  _drawTrajectoryArc(ctx) {
    const { points, impact } = predictTrajectory(this.lander, this.env, this.terrain);
    if (points.length < 2) return;
    ctx.save();
    ctx.setLineDash([1.6, 1.8]);
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(125,211,252,0.68)';
    ctx.beginPath();
    points.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.setLineDash([]);
    if (impact) {
      const onPad = this.terrain.pads.some((pad) => impact.x >= pad.x && impact.x <= pad.x + pad.w);
      ctx.strokeStyle = onPad ? '#34d399' : '#fb7185';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(impact.x, impact.y, 1.8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // A bracket hanging from the feet: how far a full burn, started now, needs to
  // brake to touchdown speed. When its bottom reaches the ground, burn.
  _drawBrakingGuide(ctx) {
    const L = this.lander;
    const footY = L.y + 6.5;
    const groundY = sampleTerrainY(this.terrain.points, L.x);
    const alt = Math.max(0, groundY - footY);
    const plan = computeBrakingPlan(L, this.env, alt);
    if (!plan.braking || alt < 0.5) return;

    const reach = Number.isFinite(plan.stopDist) ? plan.stopDist : alt + 40;
    const shown = Math.min(reach, alt);
    const ratio = alt > 0 ? reach / alt : 1;
    let col = '#6ee7b7';
    let label = `stop ${Math.round(reach)} m`;
    if (!plan.canStop) {
      col = '#fb7185';
      label = 'thrust < gravity';
    } else if (ratio >= 1) {
      col = '#fb7185';
      label = `${Math.round(reach)} m · too late`;
    } else if (ratio >= 0.75) {
      col = '#facc15';
      label = 'BURN NOW';
    } else if (!plan.enoughFuel) {
      col = '#fb923c';
      label = `stop ${Math.round(reach)} m · low fuel`;
    }

    const x = L.x + 11;
    const y0 = footY;
    const y1 = footY + shown;
    ctx.save();
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x - 1.4, y0);
    ctx.lineTo(x, y0);
    ctx.stroke();
    ctx.setLineDash([1.2, 0.9]);
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    if (reach <= alt) {
      ctx.moveTo(x - 2.4, y1);
      ctx.lineTo(x + 2.4, y1);
    } else {
      // Runs into the ground: draw a broken end.
      ctx.moveTo(x - 2, y1 - 1.4);
      ctx.lineTo(x + 2, y1 + 0.2);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = '700 3.1px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const ly = Math.max(y0 + 2, Math.min(y1, groundY - 3));
    ctx.fillStyle = 'rgba(10,4,2,0.72)';
    const tw = ctx.measureText(label).width;
    ctx.fillRect(x + 1.6, ly - 2.1, tw + 1.6, 4.2);
    ctx.fillStyle = col;
    ctx.fillText(label, x + 2.4, ly + 0.1);
    ctx.restore();
  }

  _drawVelocityVector(ctx) {
    const spd = Math.hypot(this.lander.vx, this.lander.vy);
    if (spd < 0.8) return;
    const nx = this.lander.vx / spd;
    const ny = this.lander.vy / spd;
    const len = Math.min(spd * 1.4, 15);
    const ex = this.lander.x + nx * (len + 7.5);
    const ey = this.lander.y + ny * (len + 7.5);
    const safe = Math.abs(this.lander.vy) < SAFE_LIMITS.vspd && Math.abs(this.lander.vx) < SAFE_LIMITS.hspd;
    const col = safe ? 'rgba(110,231,183,0.75)' : 'rgba(251,146,60,0.82)';

    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.55;
    ctx.setLineDash([1.4, 1.1]);
    ctx.beginPath();
    ctx.moveTo(this.lander.x, this.lander.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.translate(ex, ey);
    ctx.rotate(Math.atan2(ny, nx));
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-2.4, -1.1);
    ctx.lineTo(-2.4, 1.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      if (p.type === 'exhaust') ctx.fillStyle = p.life > 0.55 ? '#fef08a' : '#fb923c';
      else if (p.type === 'rcs') ctx.fillStyle = '#bae6fd';
      else if (p.type === 'fire' || p.type === 'debris') ctx.fillStyle = p.col;
      else if (p.type === 'smoke') ctx.fillStyle = 'rgba(75,38,20,0.45)';
      else if (p.type === 'laser') ctx.fillStyle = '#34d399';
      else ctx.fillStyle = '#c87c4b';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawLander(ctx) {
    const { x, y, angle, throttle } = this.lander;
    const comp = this.state === 'landed' ? 0.65 * this.legCompression : 0;
    const ctrl = this._activeControls();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);

    // Engine bell
    ctx.beginPath();
    ctx.moveTo(-1.8, 2.2);
    ctx.lineTo(-1.4, 4.8);
    ctx.lineTo(1.4, 4.8);
    ctx.lineTo(1.8, 2.2);
    ctx.closePath();
    ctx.fillStyle = '#9ca3af';
    ctx.fill();
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 0.3;
    ctx.stroke();

    // Main thruster flame
    if (throttle > 0.04 && this.lander.fuel > 0) {
      const fLen = (4.5 + throttle * 6.5) + (this.reducedMotion ? 0 : Math.random() * 2.5);
      const fGrad = ctx.createLinearGradient(0, 4.4, 0, 4.4 + fLen);
      fGrad.addColorStop(0, '#fef9c3');
      fGrad.addColorStop(0.3, 'rgba(251,146,60,0.95)');
      fGrad.addColorStop(0.7, 'rgba(239,68,68,0.7)');
      fGrad.addColorStop(1, 'rgba(200,20,0,0)');
      ctx.beginPath();
      ctx.moveTo(-1.7, 4.5);
      ctx.quadraticCurveTo(-0.8, 4.5 + fLen * 0.6, 0, 4.5 + fLen);
      ctx.quadraticCurveTo(0.8, 4.5 + fLen * 0.6, 1.7, 4.5);
      ctx.closePath();
      ctx.fillStyle = fGrad;
      ctx.fill();

      // Mach diamond inner core
      ctx.beginPath();
      ctx.moveTo(-0.8, 4.5);
      ctx.lineTo(0, 4.5 + fLen * 0.55);
      ctx.lineTo(0.8, 4.5);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    // Landing legs
    const footY = 6.2 - comp;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.65;
    ctx.lineCap = 'round';
    // Left
    ctx.beginPath();
    ctx.moveTo(-2.7, 1.9);
    ctx.lineTo(-5.0, footY);
    ctx.moveTo(-5.8, footY);
    ctx.lineTo(-4.2, footY);
    ctx.stroke();
    // Right
    ctx.beginPath();
    ctx.moveTo(2.7, 1.9);
    ctx.lineTo(5.0, footY);
    ctx.moveTo(4.2, footY);
    ctx.lineTo(5.8, footY);
    ctx.stroke();
    // Center leg
    ctx.beginPath();
    ctx.moveTo(0, 2.2);
    ctx.lineTo(0, 6.5 - comp);
    ctx.moveTo(-0.9, 6.5 - comp);
    ctx.lineTo(0.9, 6.5 - comp);
    ctx.stroke();
    // Struts
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(-1.8, 1.8);
    ctx.lineTo(-5.0, footY);
    ctx.moveTo(1.8, 1.8);
    ctx.lineTo(5.0, footY);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Main spacecraft body + Kapton thermal gold foil
    ctx.fillStyle = '#d6c6ac';
    ctx.strokeStyle = '#78614a';
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.roundRect(-3.3, -2.1, 6.6, 4.4, 0.7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(217,171,38,0.52)';
    ctx.beginPath();
    ctx.roundRect(-2.8, -1.6, 5.6, 3.4, 0.4);
    ctx.fill();

    // Solar wings
    const drawWing = (x0, w) => {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(x0 < 0 ? -3.8 : 3.3, -0.3, 0.5, 1.4);
      ctx.fillStyle = '#0f1f3d';
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.roundRect(x0, -1.0, w, 2.8, 0.4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1d4ed8';
      for (let c = 0; c < 3; c++) {
        ctx.fillRect(x0 + 0.4 + c * 1.45, -0.6, 1.1, 0.9);
        ctx.fillRect(x0 + 0.4 + c * 1.45, 0.5, 1.1, 0.9);
      }
    };
    drawWing(-8.5, 4.8);
    drawWing(3.7, 4.8);

    // UHF dish & camera mast
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(1.7, -2.1);
    ctx.lineTo(2.4, -4.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(2.4, -4.4, 1.1, Math.PI * 1.05, Math.PI * 2.0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-1.5, -2.1);
    ctx.lineTo(-1.9, -4.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-1.9, -4.3, 0.8, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();

    // Status strobe LED
    const ledOn = this.reducedMotion || Math.sin(this.time * 6) > 0.2;
    ctx.beginPath();
    ctx.arc(0, -1.1, 0.4, 0, Math.PI * 2);
    ctx.fillStyle = this.state === 'landed' ? '#34d399' : ledOn ? '#fde047' : '#713f12';
    ctx.fill();

    // Attitude thrusters (RCS)
    if (this.state === 'playing' && ctrl.left) {
      ctx.fillStyle = 'rgba(186,230,253,0.88)';
      ctx.beginPath();
      ctx.moveTo(3.3, -0.4);
      ctx.lineTo(6.8, -0.9);
      ctx.lineTo(3.3, -1.3);
      ctx.closePath();
      ctx.fill();
    }
    if (this.state === 'playing' && ctrl.right) {
      ctx.fillStyle = 'rgba(186,230,253,0.88)';
      ctx.beginPath();
      ctx.moveTo(-3.3, -0.4);
      ctx.lineTo(-6.8, -0.9);
      ctx.lineTo(-3.3, -1.3);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  _drawRover(ctx) {
    const r = this.rover;
    ctx.save();
    ctx.translate(r.x, r.y);
    // 6 wheels
    ctx.fillStyle = '#1f2937';
    for (const wx of [-1.8, 0, 1.8]) {
      ctx.beginPath();
      ctx.arc(wx, -0.55, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    // Chassis
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-2.1, -2.0, 4.2, 1.1);
    // Mast + ChemCam head
    const mastX = r.dir * 1.1;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(mastX, -2.0);
    ctx.lineTo(mastX, -3.6);
    ctx.stroke();
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(mastX - 0.55, -4.0, 1.1, 0.65);

    // ChemCam laser beam pulse
    if (Math.abs(r.targetX - r.x) <= 0.25 && (this.reducedMotion || Math.sin(this.time * 10) > 0)) {
      const rockY = sampleTerrainY(this.terrain.points, r.targetRockX) - r.y - 0.8;
      ctx.strokeStyle = 'rgba(52,211,153,0.9)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(mastX + r.dir * 0.5, -3.7);
      ctx.lineTo(r.targetRockX - r.x, rockY);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawHUD(ctx, W, H, site, world) {
    const minHudW = 536;
    const hudScale = W < minHudW ? Math.max(0.64, W / minHudW) : 1;
    const vw = W / hudScale;
    ctx.save();
    if (hudScale !== 1) ctx.scale(hudScale, hudScale);

    const pad = 12;
    const fuelPct = Math.max(0, Math.min(1, this.lander.fuel / this.lander.fuelMax));

    if (this.autopilot && this.state === 'playing') {
      const vh = H / hudScale;
      const text = `AUTOPILOT · ${(this.autopilotPhase || 'approach').toUpperCase()} · press any flight key to take over`;
      ctx.font = '700 10px -apple-system, BlinkMacSystemFont, sans-serif';
      const tw = ctx.measureText(text).width + 22;
      ctx.fillStyle = 'rgba(8,30,44,0.82)';
      ctx.strokeStyle = 'rgba(125,211,252,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(vw / 2 - tw / 2, vh - 34, tw, 22, 11);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#bae6fd';
      ctx.textAlign = 'center';
      ctx.fillText(text, vw / 2, vh - 19.5);
      ctx.textAlign = 'left';
    }

    // Top-left: Fuel + Throttle + Assists
    const leftW = 182;
    ctx.fillStyle = 'rgba(14,6,3,0.78)';
    ctx.strokeStyle = 'rgba(224,128,64,0.32)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(pad, pad, leftW, 56, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#f3b794';
    ctx.textAlign = 'left';
    ctx.fillText('FUEL', pad + 10, pad + 18);

    const barX = pad + 46;
    const barW = 90;
    ctx.fillStyle = 'rgba(90,32,12,0.65)';
    ctx.fillRect(barX, pad + 9, barW, 11);
    ctx.fillStyle = this.lander.fuel > 30 ? '#fb923c' : this.lander.fuel > 15 ? '#facc15' : '#fb7185';
    ctx.fillRect(barX, pad + 9, barW * fuelPct, 11);
    ctx.strokeStyle = 'rgba(255,180,120,0.3)';
    ctx.strokeRect(barX, pad + 9, barW, 11);

    ctx.font = '700 10px ui-monospace, monospace';
    ctx.fillStyle = this.lander.fuel <= 18 ? '#fda4af' : '#fed7aa';
    ctx.fillText(`${Math.round(this.lander.fuel)}%`, barX + barW + 6, pad + 18);

    // Throttle + chips
    ctx.font = '700 9.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#c89b84';
    ctx.fillText('THROT', pad + 10, pad + 35);
    ctx.fillStyle = 'rgba(90,32,12,0.55)';
    ctx.fillRect(barX, pad + 27, 68, 7);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(barX, pad + 27, 68 * this.lander.throttle, 7);

    const chips = [
      { text: 'SAS', on: this.options.sasEnabled },
      { text: 'ARC', on: this.options.showTrajectory },
    ];
    let cx = pad + 10;
    for (const chip of chips) {
      ctx.fillStyle = chip.on ? 'rgba(52,211,153,0.22)' : 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.roundRect(cx, pad + 40, 32, 12, 4);
      ctx.fill();
      ctx.font = '700 8.5px -apple-system, sans-serif';
      ctx.fillStyle = chip.on ? '#6ee7b7' : '#9ca3af';
      ctx.textAlign = 'center';
      ctx.fillText(chip.text, cx + 16, pad + 49);
      cx += 36;
    }

    ctx.textAlign = 'left';
    ctx.font = '600 9px -apple-system, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`${world.name} · ${world.gravity.toFixed(2)} m/s²`, cx + 4, pad + 49);

    // Top-center: Site + Live Wind + Pad Alignment Strip
    const midW = 178;
    const mx = vw * 0.5 - midW * 0.5;
    ctx.fillStyle = 'rgba(14,6,3,0.78)';
    ctx.strokeStyle = this.env.gusting ? 'rgba(251,113,133,0.65)' : 'rgba(224,128,64,0.32)';
    ctx.beginPath();
    ctx.roundRect(mx, pad, midW, 44, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(site.name.toUpperCase(), vw * 0.5, pad + 15);

    const wMag = Math.abs(this.env.currentWind);
    const wDir = this.env.currentWind >= 0 ? '→' : '←';
    const windStr =
      world.dragCoeff <= 0
        ? 'VACUUM · 0.0 m/s'
        : `${this.env.gusting ? 'GUST! ' : 'WIND '}${wDir} ${wMag.toFixed(1)} m/s`;
    ctx.font = '700 11px ui-monospace, monospace';
    ctx.fillStyle = this.env.gusting ? '#fda4af' : '#fbbf24';
    ctx.fillText(windStr, vw * 0.5, pad + 30);

    // Alignment bar along bottom of center pill
    const stripX = mx + 12;
    const stripW = midW - 24;
    const stripY = pad + 36;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(stripX, stripY, stripW, 3);
    for (const p of this.terrain.pads) {
      const px0 = stripX + (p.x / WORLD_W) * stripW;
      const pw = Math.max(4, (p.w / WORLD_W) * stripW);
      ctx.fillStyle = p.multiplier > 1 ? '#fbbf24' : '#34d399';
      ctx.fillRect(px0, stripY - 0.5, pw, 4);
    }
    const shipTick = stripX + (this.lander.x / WORLD_W) * stripW;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(shipTick - 1.5, stripY - 2, 3, 7);

    // Top-right: Telemetry block
    const tw = 140;
    const tx = vw - pad - tw;
    ctx.fillStyle = 'rgba(14,6,3,0.78)';
    ctx.strokeStyle = 'rgba(224,128,64,0.32)';
    ctx.beginPath();
    ctx.roundRect(tx, pad, tw, 82, 8);
    ctx.fill();
    ctx.stroke();

    const snap = this.outcome?.snapshot;
    const alt = this.state === 'playing' || this.state === 'ready' || this.state === 'paused'
      ? Math.max(0, sampleTerrainY(this.terrain.points, this.lander.x) - this.lander.y - 6.5)
      : 0;
    const vVal = snap ? snap.vspd : Math.abs(this.lander.vy);
    const vyRaw = snap ? snap.vspd : this.lander.vy;
    const hVal = snap ? snap.hspd : Math.abs(this.lander.vx);
    const vxRaw = snap ? 0 : this.lander.vx;
    const tVal = snap ? snap.tilt : normalizeTiltDeg(this.lander.angle).abs;

    const rows = [
      ['ALT', `${alt.toFixed(0)} m`, false],
      ['V-SPD', `${snap ? '' : vyRaw >= 0 ? '↓ ' : '↑ '}${vVal.toFixed(1)} m/s`, vVal >= SAFE_LIMITS.vspd],
      ['H-SPD', `${snap ? '' : vxRaw >= 0 ? '→ ' : '← '}${hVal.toFixed(1)} m/s`, hVal >= SAFE_LIMITS.hspd],
      ['TILT', `${tVal.toFixed(1)}°`, tVal > SAFE_LIMITS.tilt],
    ];
    rows.forEach(([label, val, danger], idx) => {
      const ry = pad + 18 + idx * 18;
      ctx.font = '700 10px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#c89b84';
      ctx.fillText(label, tx + 10, ry);
      ctx.font = '700 11px ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = danger ? '#fb7185' : '#6ee7b7';
      ctx.fillText(val, tx + tw - 10, ry);
    });
    ctx.restore();
  }

  destroy() {
    if (this._rafId != null && this._raf.cancel) this._raf.cancel(this._rafId);
    if (this._raf.destroy) this._raf.destroy();
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this._onWindowResize) window.removeEventListener('resize', this._onWindowResize);
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    document.removeEventListener('visibilitychange', this._onVisibility);
    this.audio.destroy();
  }
}
