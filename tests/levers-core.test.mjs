import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// LeversCore is a classic browser script with no DOM in it.
const sandbox = {};
vm.runInNewContext(fs.readFileSync('assets/js/lessons/levers-core.js', 'utf8') + '\nthis.LeversCore = LeversCore;', sandbox);
const L = sandbox.LeversCore;
const near = (got, want, tol, what) => assert.ok(Math.abs(got - want) <= tol, `${what}: got ${got}, want ${want} ± ${tol}`);

test('torques: torque = force × distance from the fulcrum, on an 8 m beam', () => {
  const t = L.torques({ fp: 2, w: 60, e: 20 });
  assert.equal(t.dl, 2);
  assert.equal(t.de, 6);
  assert.equal(t.tl, 120);   // 60 N × 2 m
  assert.equal(t.te, 120);   // 20 N × 6 m
  assert.equal(t.delta, 0);  // balanced: a 20 N push holds a 60 N load
  assert.equal(t.de / t.dl, 3, 'mechanical advantage = effort arm ÷ load arm');
});

test('law of the lever: with the fulcrum at 8·E/(W+E) the torques match for any forces', () => {
  for (const [w, e] of [[10, 10], [150, 10], [35, 80], [99, 1], [7, 93]]) {
    const fp = 8 * e / (w + e);
    const t = L.torques({ fp, w, e });
    near(t.tl, t.te, 1e-9, `torques for W=${w}, E=${e}`);
    near(t.delta, 0, 1e-12, 'delta');
    near(t.de / t.dl, w / e, 1e-9, 'mechanical advantage equals load ÷ effort at balance');
  }
});

test('delta says which side wins and by what share of the larger torque', () => {
  assert.ok(L.torques({ fp: 4, w: 50, e: 80 }).delta > 0, 'effort wins');
  assert.ok(L.torques({ fp: 4, w: 80, e: 50 }).delta < 0, 'load wins');
  near(L.torques({ fp: 4, w: 50, e: 100 }).delta, 0.5, 1e-12, 'effort torque is double: half of it is spare');
  near(L.torques({ fp: 4, w: 100, e: 50 }).delta, -0.5, 1e-12, 'mirror image');
  // moving the fulcrum toward the load helps the effort
  assert.ok(L.torques({ fp: 2, w: 60, e: 30 }).delta > L.torques({ fp: 5, w: 60, e: 30 }).delta);
});

test('launch at the default sliders: 8.2 m/s off a 0.85 m arm', () => {
  const s = L.launch(40, 45, 60, 5);
  near(s.v, 8.2, 1e-12, 'launch speed');
  near(s.armM, 0.85, 1e-12, 'arm length in metres');
  near(s.vx, 8.2 * Math.SQRT1_2, 1e-12, 'vx'); near(s.vy, 8.2 * Math.SQRT1_2, 1e-12, 'vy');
  near(s.x0, L.PIVOT_XM + 0.85 * Math.SQRT1_2, 1e-12, 'release x'); near(s.h0, L.PIVOT_YM + 0.85 * Math.SQRT1_2, 1e-12, 'release height');
  assert.equal(s.g, 9.81);
});

test('launch: the flight time and range solve the projectile equations', () => {
  for (const [a, A, p, m] of [[40, 45, 60, 5], [20, 20, 20, 20], [60, 70, 100, 2], [33, 52, 77, 11]]) {
    const s = L.launch(a, A, p, m);
    // height is back to zero at t: h0 + vy·t − ½·g·t² = 0
    near(s.h0 + s.vy * s.t - 0.5 * s.g * s.t * s.t, 0, 1e-9, `landing height (${a},${A},${p},${m})`);
    near(s.r, s.x0 + s.vx * s.t, 1e-12, 'range = x0 + vx·t');
    // energy: landing speed² = launch speed² + 2·g·h0
    const vyLand = s.vy - s.g * s.t;
    near(s.vx * s.vx + vyLand * vyLand, s.v * s.v + 2 * s.g * s.h0, 1e-9, 'energy conserved');
    assert.ok(s.t > 0 && s.r >= 0);
  }
});

test('launch speed: longer arm and harder pull throw faster, heavier shot flies slower', () => {
  const base = L.launch(40, 45, 60, 5).v;
  near(L.launch(60, 45, 60, 5).v / base, 1.5, 1e-12, 'speed is proportional to arm length (v = ωr)');
  near(L.launch(40, 45, 100, 5).v / base, Math.sqrt(100 / 60), 1e-12, 'speed ∝ √pull (stored energy)');
  near(L.launch(40, 45, 60, 20).v / base, 0.5, 1e-12, 'four times the mass, half the speed (same energy)');
  // same kinetic energy whatever the mass: ½mv² constant
  const ke = (m) => 0.5 * m * L.launch(40, 45, 60, m).v ** 2;
  near(ke(2), ke(20), 1e-9, 'kinetic energy');
});

test('launch: released above the ground, the best angle is a little under 45°', () => {
  let best = 0, bestR = -1;
  for (let A = 20; A <= 70; A++) { const r = L.launch(40, A, 60, 5).r; if (r > bestR) { bestR = r; best = A; } }
  assert.ok(best >= 38 && best <= 45, `best angle was ${best}°`);
  assert.ok(L.launch(40, 45, 60, 5).r > L.launch(40, 70, 60, 5).r);
});
