import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BB = require('../assets/js/lessons/bug-bots-engine.js');

test('all 6 legs swing forward (-y) during swing and push backward (+y) during stance symmetrically', () => {
  for (const gaitId of ['tripod', 'ripple', 'wave']) {
    for (const leg of BB.LEGS) {
      const duty = BB.GAITS[gaitId].dutyFactor;
      const offset = BB.GAITS[gaitId].offsets[leg.index];

      // Sample start and end of stance in leg-local phase
      const pStanceStart = (0.04 - offset + 1) % 1;
      const pStanceEnd = (duty - 0.04 - offset + 1) % 1;
      const s0 = BB.computeLegPose(leg, pStanceStart, gaitId, false, false);
      const s1 = BB.computeLegPose(leg, pStanceEnd, gaitId, false, false);
      assert.equal(s0.isSwing, false, `${gaitId} ${leg.id} start should be stance`);
      assert.equal(s1.isSwing, false, `${gaitId} ${leg.id} end should be stance`);
      assert.ok(s1.fy > s0.fy, `${gaitId} ${leg.id} stance should push foot backward (+y): ${s0.fy.toFixed(2)} -> ${s1.fy.toFixed(2)}`);

      // Sample start and end of swing in leg-local phase
      const pSwingStart = (duty + 0.03 - offset + 1) % 1;
      const pSwingEnd = (0.97 - offset + 1) % 1;
      const w0 = BB.computeLegPose(leg, pSwingStart, gaitId, false, false);
      const w1 = BB.computeLegPose(leg, pSwingEnd, gaitId, false, false);
      assert.equal(w0.isSwing, true, `${gaitId} ${leg.id} swing start`);
      assert.equal(w1.isSwing, true, `${gaitId} ${leg.id} swing end`);
      assert.ok(w1.fy < w0.fy, `${gaitId} ${leg.id} swing should step foot forward (-y): ${w0.fy.toFixed(2)} -> ${w1.fy.toFixed(2)}`);
    }
  }
});

test('tripod, ripple, and wave gaits maintain expected grounded leg counts and static stability', () => {
  const counts = { tripod: [], ripple: [], wave: [] };
  for (const gaitId of ['tripod', 'ripple', 'wave']) {
    for (let k = 0; k < 30; k++) {
      const ph = k / 30;
      const poses = BB.LEGS.map((l) => BB.computeLegPose(l, ph, gaitId, false, false));
      const stab = BB.evaluateSupportStability(poses);
      counts[gaitId].push(stab.groundedCount);
      assert.equal(stab.stable, true, `${gaitId} at phase ${ph.toFixed(2)} should be statically stable`);
      assert.ok(stab.marginPx > 0, `${gaitId} stability margin should be positive`);
    }
  }
  assert.ok(counts.tripod.every((c) => c === 3), 'tripod always keeps 3 grounded legs');
  assert.ok(Math.min(...counts.ripple) >= 4, 'ripple keeps at least 4 grounded legs');
  assert.ok(Math.min(...counts.wave) >= 5, 'wave keeps at least 5 grounded legs');
});

test('disabling Stand Up (layer 0) collapses robot; Whiskers (layer 4) suppresses Steered Prowling near rocks', () => {
  const collapsed = BB.createHexapodState({ layers: { standup: false } });
  BB.stepHexapod(collapsed, 0.04);
  assert.equal(collapsed.winningLayer, -1);
  assert.equal(collapsed.stepsPerSec, 0);
  assert.equal(collapsed.firingLayers.some(Boolean), false);

  // Place a rock directly ahead of the robot while target is behind/past the rock
  const s = BB.createHexapodState({
    x: 100,
    y: 150,
    heading: 0,
    rocks: [{ x: 142, y: 150, r: 18 }],
    target: { x: 350, y: 150 }
  });
  BB.stepHexapod(s, 0.03);
  assert.equal(s.firingLayers[4], true, 'Whiskers layer 4 must fire near rock');
  assert.equal(s.winningLayer, 4, 'Layer 4 Whiskers must suppress Layer 7 Steered Prowling');
  assert.ok(s.avoidCount >= 1);
  assert.notEqual(s.heading, 0, 'Whiskers should actively steer away from rock');
});

test('bristle-bot physics: vertical 0 deg gives zero speed, balanced angled bristles drive straight', () => {
  const flat = BB.computeBristleBotPhysics({ bristleAngleDeg: 0, motorHz: 150, weightBias: 0, surface: 'desk' });
  assert.equal(flat.vCmPerSec, 0);

  const angled = BB.computeBristleBotPhysics({ bristleAngleDeg: 32, motorHz: 150, weightBias: 0, surface: 'desk' });
  assert.ok(angled.vCmPerSec > 8, 'angled bristles produce strong forward velocity');
  assert.equal(angled.yawDegPerSec, 0, 'centered weight drives straight');

  const curved = BB.computeBristleBotPhysics({ bristleAngleDeg: 32, motorHz: 150, weightBias: 0.6, surface: 'desk' });
  assert.ok(curved.yawDegPerSec > 10, 'off-center weight turns the bot');

  const carpet = BB.computeBristleBotPhysics({ bristleAngleDeg: 32, motorHz: 150, weightBias: 0, surface: 'carpet' });
  assert.ok(carpet.vCmPerSec < angled.vCmPerSec * 0.4, 'carpet greatly slows bristle propulsion');

  const sim = BB.createBristleState();
  for (let i = 0; i < 120; i++) BB.stepBristleBot(sim, { bristleAngleDeg: 32, motorHz: 160, weightBias: 0, surface: 'desk' }, 0.04);
  assert.equal(sim.finished, true, 'tuned straight bristle bot crosses finish line');
});
