import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORLD_W,
  WORLD_H,
  SAFE_LIMITS,
  WORLDS,
  MARS_SITES,
  generateSiteTerrain,
  sampleTerrainY,
  stepLanderPhysics,
  evaluateContact,
  computeLandingScore,
  predictTrajectory,
  computeWindAt,
  computeBrakingPlan,
  BRAKING_TARGET_VSPD,
  autopilotControls,
  createRng,
} from '../assets/js/lessons/mars-rover-lander-engine.mjs';

test('all 6 Martian sites generate valid terrain and flat pads within world bounds', () => {
  assert.equal(MARS_SITES.length, 6);
  for (const site of MARS_SITES) {
    const terrain = generateSiteTerrain(site, 12345);
    assert.ok(terrain.points.length >= 20, `${site.id} has polyline points`);
    for (let i = 1; i < terrain.points.length; i++) {
      assert.ok(terrain.points[i].x > terrain.points[i - 1].x, `${site.id} terrain x is monotonic`);
      assert.ok(terrain.points[i].y >= 0 && terrain.points[i].y <= WORLD_H, `${site.id} terrain y within bounds`);
    }
    assert.equal(terrain.pads.length, site.pads.length, `${site.id} has expected pads`);
    for (const pad of terrain.pads) {
      assert.ok(pad.x > 0 && pad.x + pad.w < WORLD_W, `${site.id} pad ${pad.label} inside world`);
      const yLeft = sampleTerrainY(terrain.points, pad.x + 0.5);
      const yMid = sampleTerrainY(terrain.points, pad.x + pad.w * 0.5);
      const yRight = sampleTerrainY(terrain.points, pad.x + pad.w - 0.5);
      assert.ok(Math.abs(yLeft - pad.y) < 0.05 && Math.abs(yMid - pad.y) < 0.05 && Math.abs(yRight - pad.y) < 0.05, `${site.id} pad is flat`);
    }
  }
});

test('Mars free-fall follows g = 3.72 m/s^2 and Moon vacuum has zero wind drift', () => {
  const dt = 1 / 60;
  const marsLander = { x: 140, y: 20, vx: 0, vy: 0, angle: 0, angVel: 0, fuel: 100, fuelMax: 100, throttle: 0, thrusting: false };
  const marsEnv = { gravity: WORLDS.mars.gravity, dragCoeff: WORLDS.mars.dragCoeff, baseWind: 0, currentWind: 0 };
  for (let i = 0; i < 60; i++) {
    stepLanderPhysics(marsLander, {}, marsEnv, dt);
  }
  assert.ok(Math.abs(marsLander.vy - 3.72) < 0.02, `expected vy ≈ 3.72 after 1s, got ${marsLander.vy}`);

  // Thrust overcomes Mars gravity and burns fuel
  const burningLander = { x: 140, y: 60, vx: 0, vy: 5, angle: 0, angVel: 0, fuel: 100, fuelMax: 100, throttle: 1, thrusting: true };
  for (let i = 0; i < 60; i++) {
    stepLanderPhysics(burningLander, { thrust: true }, marsEnv, dt);
  }
  assert.ok(burningLander.vy < 0, 'full Mars burn reverses downward velocity within 1s');
  assert.ok(burningLander.fuel < 90, 'full burn consumes propellant');

  // Moon vacuum ignores wind completely
  const moonLander = { x: 140, y: 30, vx: 0, vy: 0, angle: 0, angVel: 0, fuel: 100, fuelMax: 100, throttle: 0, thrusting: false };
  const moonEnv = { gravity: WORLDS.moon.gravity, dragCoeff: WORLDS.moon.dragCoeff, baseWind: 15, currentWind: 15 };
  for (let i = 0; i < 60; i++) {
    stepLanderPhysics(moonLander, {}, moonEnv, dt);
  }
  assert.equal(moonLander.vx, 0, 'Moon vacuum exerts zero aerodynamic wind drift');
  assert.ok(Math.abs(moonLander.vy - 1.62) < 0.02, 'Moon free-fall matches 1.62 m/s^2');

  // Mars wind pushes lander horizontally toward wind speed
  const windLander = { x: 140, y: 30, vx: 0, vy: 0, angle: 0, angVel: 0, fuel: 100, fuelMax: 100, throttle: 0, thrusting: false };
  const gustEnv = { gravity: WORLDS.mars.gravity, dragCoeff: WORLDS.mars.dragCoeff, baseWind: 12, currentWind: 12 };
  for (let i = 0; i < 60; i++) {
    stepLanderPhysics(windLander, {}, gustEnv, dt);
  }
  assert.ok(windLander.vx > 0.5, `Mars wind applies positive drag, got vx=${windLander.vx}`);
});

test('multi-point contact evaluation distinguishes safe pad landings and all failure modes', () => {
  const terrain = generateSiteTerrain(MARS_SITES[0], 777);
  const pad = terrain.pads[0];
  const padCenterX = pad.x + pad.w * 0.5;

  // 1. Clean safe touchdown on pad
  const safeLander = { x: padCenterX, y: pad.y - 6.4, vx: 1.1, vy: 2.2, angle: 4.5, fuel: 58 };
  const safeRes = evaluateContact(safeLander, terrain, 4.0);
  assert.equal(safeRes.contacted, true);
  assert.equal(safeRes.safe, true);
  const score = computeLandingScore(safeRes);
  assert.ok(score.total > 1500 && score.stars === 3);

  // 2. Vertical speed too high
  const fastV = evaluateContact({ x: padCenterX, y: pad.y - 6.4, vx: 0.4, vy: SAFE_LIMITS.vspd + 1.2, angle: 0, fuel: 50 }, terrain, 0);
  assert.equal(fastV.safe, false);
  assert.match(fastV.causes.join(' '), /Vertical speed/i);

  // 3. Horizontal drift too high
  const fastH = evaluateContact({ x: padCenterX, y: pad.y - 6.4, vx: SAFE_LIMITS.hspd + 1.1, vy: 1.5, angle: 0, fuel: 50 }, terrain, 0);
  assert.equal(fastH.safe, false);
  assert.match(fastH.causes.join(' '), /Horizontal drift/i);

  // 4. Tilt exceeded
  const tilted = evaluateContact({ x: padCenterX, y: pad.y - 6.4, vx: 0.2, vy: 1.5, angle: 24, fuel: 50 }, terrain, 0);
  assert.equal(tilted.safe, false);
  assert.match(tilted.causes.join(' '), /Tilt/i);

  // 5. Missed pad onto rough terrain
  const offPadX = pad.x > 60 ? 20 : WORLD_W - 20;
  const offPadY = sampleTerrainY(terrain.points, offPadX) - 6.4;
  const missed = evaluateContact({ x: offPadX, y: offPadY, vx: 0.2, vy: 1.5, angle: 0, fuel: 50 }, terrain, 0);
  assert.equal(missed.safe, false);
  assert.match(missed.causes.join(' '), /outside a landing pad/i);

  // 6. Wing/hull strike on terrain
  const wingHit = evaluateContact({ x: padCenterX, y: pad.y - 0.2, vx: 0, vy: 1.5, angle: 65, fuel: 50 }, terrain, 0);
  assert.equal(wingHit.safe, false);
  assert.match(wingHit.causes.join(' '), /solar wing|hull/i);
});

test('trajectory prediction and wind gust calculation produce valid values', () => {
  const terrain = generateSiteTerrain(MARS_SITES[2], 99);
  const env = { gravity: 3.72, dragCoeff: 0.085, baseWind: 8, gustAmp: 5, gustPeriod: 4.8, currentWind: 8 };
  const lander = { x: 140, y: 25, vx: 2, vy: 4 };
  const pred = predictTrajectory(lander, env, terrain, { steps: 100, stepDt: 0.1 });
  assert.ok(pred.points.length > 5);
  assert.ok(pred.impact !== null, 'predicted trajectory reaches Martian terrain');

  const wind = computeWindAt(env, 1.2);
  assert.ok(Number.isFinite(wind.speed));
});

test('stopping-distance rule matches the real physics step on every world', () => {
  const dt = 1 / 60;
  for (const world of Object.values(WORLDS)) {
    const env = { gravity: world.gravity, dragCoeff: 0, baseWind: 0, currentWind: 0 };
    const lander = { x: 140, y: 10, vx: 0, vy: 12, angle: 0, angVel: 0, fuel: 150, fuelMax: 150, throttle: 0, thrusting: false };
    const plan = computeBrakingPlan(lander, env, 200);
    assert.equal(plan.braking, true);
    assert.ok(plan.canStop, `${world.id}: full thrust beats gravity`);
    // Start a full burn now and measure how far the lander falls before it slows to the target speed.
    const y0 = lander.y;
    const fuel0 = lander.fuel;
    let guard = 0;
    while (lander.vy > BRAKING_TARGET_VSPD && guard++ < 6000) {
      stepLanderPhysics(lander, { thrust: true }, env, dt);
    }
    const fell = lander.y - y0;
    assert.ok(Math.abs(fell - plan.stopDist) < Math.max(0.6, plan.stopDist * 0.03),
      `${world.id}: predicted ${plan.stopDist.toFixed(2)} m, fell ${fell.toFixed(2)} m`);
    const burned = fuel0 - lander.fuel;
    assert.ok(Math.abs(burned - plan.fuelNeeded) < Math.max(0.5, plan.fuelNeeded * 0.05),
      `${world.id}: predicted ${plan.fuelNeeded.toFixed(2)}% fuel, burned ${burned.toFixed(2)}%`);
  }
});

test('stopping-distance rule: weaker gravity stops shorter, tilt and slow descents behave', () => {
  const at = (g, extra = {}) => computeBrakingPlan({ vy: 15, angle: 0, fuel: 100, ...extra }, { gravity: g }, 100);
  const moon = at(WORLDS.moon.gravity);
  const mars = at(WORLDS.mars.gravity);
  const earth = at(WORLDS.earth.gravity);
  assert.ok(moon.stopDist < mars.stopDist && mars.stopDist < earth.stopDist);
  assert.ok(at(WORLDS.mars.gravity, { angle: 40 }).stopDist > mars.stopDist, 'tilting wastes vertical thrust');
  assert.equal(at(WORLDS.mars.gravity, { angle: 90 }).canStop, false, 'sideways thrust cannot stop a fall');
  const gentle = computeBrakingPlan({ vy: 1, angle: 0, fuel: 50 }, { gravity: 3.72 }, 30);
  assert.equal(gentle.braking, false);
  assert.equal(gentle.stopDist, 0);
  assert.equal(at(WORLDS.mars.gravity, { fuel: 1 }).enoughFuel, false);
});

// Fly one descent the way MarsLanderGame does (same start, wind and 60 Hz step).
function flyAutopilot(siteId, worldId, seed) {
  const site = MARS_SITES.find((s) => s.id === siteId);
  const world = WORLDS[worldId];
  const rng = createRng(seed ^ 0x9e3779b9);
  const terrain = generateSiteTerrain(site, seed);
  let baseWind = 0;
  if (world.dragCoeff > 0) {
    const [a, b] = site.windRange;
    baseWind = (a + rng() * (b - a)) * (rng() < 0.5 ? 1 : -1);
  }
  const env = { gravity: world.gravity, dragCoeff: world.dragCoeff, baseWind, gustAmp: world.dragCoeff > 0 ? site.gustAmp : 0, gustPeriod: site.gustPeriod, currentWind: baseWind };
  const vx = site.startVxRange[0] + rng() * (site.startVxRange[1] - site.startVxRange[0]);
  const lander = { x: WORLD_W * (0.38 + rng() * 0.24), y: 28, vx, vy: 0, angle: 0, angVel: 0, fuel: site.fuelStart, fuelMax: Math.max(100, site.fuelStart), throttle: 0, thrusting: false };
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 90; i++) {
    env.currentWind = computeWindAt(env, i * dt).speed;
    stepLanderPhysics(lander, autopilotControls(lander, env, terrain).controls, env, dt);
    const contact = evaluateContact(lander, terrain, env.currentWind);
    if (contact.contacted) return contact;
  }
  return { safe: false, causes: ['timeout'] };
}

test('autopilot lands reliably on Mars and the Moon using only student controls', () => {
  const seeds = Array.from({ length: 30 }, (_, i) => (i + 1) * 7919);
  const floor = { jezero: 1, gale: 0.9, elysium: 0.9, valles: 0.9, olympus: 0.75, arcadia: 0.75 };
  for (const world of ['mars', 'moon']) {
    for (const site of MARS_SITES) {
      const results = seeds.map((seed) => flyAutopilot(site.id, world, seed));
      const rate = results.filter((r) => r.safe).length / seeds.length;
      const need = world === 'moon' ? Math.max(0.9, floor[site.id]) : floor[site.id];
      assert.ok(rate >= need, `${world}/${site.id}: autopilot landed ${(rate * 100).toFixed(0)}% (need ${need * 100}%); e.g. ${results.find((r) => !r.safe)?.causes.join('; ')}`);
    }
  }
});

test('autopilot cannot land this lander on Earth (thrust barely beats gravity)', () => {
  const landed = [1, 2, 3, 4, 5].filter((s) => flyAutopilot('jezero', 'earth', s * 7919).safe).length;
  assert.equal(landed, 0, 'the lesson text says Earth is out of reach; update it if this changes');
});
