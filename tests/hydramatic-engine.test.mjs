import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const H = require('../assets/js/lessons/hydramatic-engine.js');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('two planetary sets give the published 3.97 / 2.55 / 1.55 / 1.00 ratios', () => {
  close(H.FRONT_REDUCTION, 1.55);
  close(H.REAR_REDUCTION, 2.5625);
  const [r1, r2, r3, r4] = H.RATIOS;
  assert.ok(Math.abs(r1 - 3.97) < 0.01, `first ${r1}`);
  assert.ok(Math.abs(r2 - 2.55) < 0.02, `second ${r2}`);
  close(r3, 1.55);
  close(r4, 1);
  // ratios strictly fall as the gear number rises
  for (let i = 1; i < 4; i++) assert.ok(H.RATIOS[i] < H.RATIOS[i - 1]);
  // first is exactly the product of the two reductions (compound gearing multiplies)
  close(r1, H.FRONT_REDUCTION * H.REAR_REDUCTION);
});

test('planet gears have whole teeth and sun + 2 planets = ring', () => {
  for (const set of [H.FRONT, H.REAR]) {
    const P = H.planetTeeth(set);
    assert.ok(Number.isInteger(P) && P > 0, `${set.name} planet teeth ${P}`);
    assert.equal(set.S + 2 * P, set.R);
  }
});

test('Willis equation solves any one member from the other two', () => {
  const set = H.FRONT;
  for (const [s, r] of [[0, 100], [50, 0], [-30, 80], [123, 45]]) {
    const c = H.willis(set, { sun: s, ring: r, carrier: null }).carrier;
    close(H.willis(set, { sun: null, ring: r, carrier: c }).sun, s, 1e-9);
    close(H.willis(set, { sun: s, ring: null, carrier: c }).ring, r, 1e-9);
  }
  assert.throws(() => H.willis(set, { sun: 1, ring: 2, carrier: 3 }));
  assert.throws(() => H.willis(set, { sun: null, ring: null, carrier: 3 }));
});

test('planet spin makes the teeth mesh at both the sun and the ring', () => {
  const set = H.REAR;
  const P = H.planetTeeth(set);
  for (const [s, r] of [[100, 0], [0, 100], [60, -40]]) {
    const c = H.willis(set, { sun: s, ring: r, carrier: null }).carrier;
    const wp = H.planetSpin(set, s, c);
    // surface speed at the sun contact and at the ring contact
    close(c * (set.S + P) - wp * P, s * set.S, 1e-9);
    close(c * (set.S + P) + wp * P, r * set.R, 1e-9);
  }
});

test('planetaryRatio: six arrangements = two reductions, two overdrives, two reverses', () => {
  const { S, R } = H.FRONT;
  const r = (i, h, o) => H.planetaryRatio(H.FRONT, i, h, o);
  close(r('ring', 'sun', 'carrier'), (S + R) / R);      // the front set's reduction, 1.55
  close(r('sun', 'ring', 'carrier'), (S + R) / S);      // the rear set's reduction
  close(r('carrier', 'sun', 'ring'), R / (S + R));      // overdrive
  close(r('carrier', 'ring', 'sun'), S / (S + R));      // bigger overdrive
  close(r('sun', 'carrier', 'ring'), -R / S);           // reverse, big reduction
  close(r('ring', 'carrier', 'sun'), -S / R);           // reverse, speed-up
  close(H.planetaryRatio(H.REAR, 'sun', 'ring', 'carrier'), H.REAR_REDUCTION);
  assert.throws(() => H.planetaryRatio(H.FRONT, 'sun', 'sun', 'ring'));
  assert.throws(() => H.planetaryRatio(H.FRONT, 'sun', 'ring', 'wheel'));
});

test('every gear: the output shaft turns at input / ratio, whichever parts are held', () => {
  for (const n of [1, 2, 3, 4]) {
    const wIn = 300;
    const m = H.gearMembers(n, wIn);
    close(m.out, wIn / H.gearRatio(n), 1e-9);
    // the held member really is held
    if (m.holds.frontBand) close(m.front.sun, 0);
    if (m.holds.rearBand) close(m.rear.ring, 0);
    // locked sets turn as one lump
    if (m.holds.frontClutch) { close(m.front.sun, m.front.ring); close(m.front.ring, m.front.carrier); }
    if (m.holds.rearClutch) { close(m.rear.sun, m.rear.ring); close(m.rear.ring, m.rear.carrier); }
    // front carrier drives the rear sun
    close(m.rear.sun, m.front.carrier);
  }
  // each set is in exactly one of band / clutch
  for (const n of [1, 2, 3, 4]) {
    const h = H.gearMembers(n, 1).holds;
    assert.notEqual(h.frontBand, h.frontClutch);
    assert.notEqual(h.rearBand, h.rearClutch);
  }
});

test('fluid coupling: zero at equal speed, grows with speed squared, never multiplies torque', () => {
  close(H.couplingTorque(200, 200), 0);
  assert.ok(H.couplingTorque(200, 150) > 0);
  assert.ok(H.couplingTorque(150, 200) < 0, 'overrun drives the engine backwards');
  // stalled turbine: capacity scales with pump speed squared
  const t1 = H.couplingTorque(100, 0), t2 = H.couplingTorque(200, 0);
  close(t2 / t1, 4, 1e-9);
  // about 250 N·m at 1700 rpm stalled
  const stall = H.couplingTorque(1700 / H.RPM, 0);
  assert.ok(Math.abs(stall - 250) < 15, `stall torque ${stall}`);
  close(H.couplingSlip(100, 97), 0.03);
});

test('shift map: upshift speeds rise with throttle, valves are staggered, down is below up', () => {
  const full = [1, 2, 3].map((n) => H.upshiftMph(n, 1));
  const light = [1, 2, 3].map((n) => H.upshiftMph(n, 0));
  assert.deepEqual(full.map(Math.round), [18, 30, 48]);
  assert.deepEqual(light.map(Math.round), [6, 12, 22]);
  for (let thr = 0; thr <= 1; thr += 0.1) {
    for (const n of [1, 2, 3]) {
      assert.ok(H.downshiftMph(n, thr) < H.upshiftMph(n, thr), 'hysteresis keeps the box from hunting');
      if (n < 3) assert.ok(H.upshiftMph(n, thr) < H.upshiftMph(n + 1, thr));
    }
  }
  for (const n of [1, 2, 3]) {
    let prev = 0;
    for (let thr = 0; thr <= 1.0001; thr += 0.05) {
      const v = H.upshiftMph(n, thr);
      assert.ok(v >= prev); prev = v;
    }
  }
  // a wide-open upshift never asks for more rpm than the engine can make
  for (const n of [1, 2, 3]) {
    const rpm = (H.upshiftMph(n, 1) / H.MPS_TO_MPH) / H.CAR.wheelRadius * H.CAR.finalDrive * H.gearRatio(n) * H.RPM;
    assert.ok(rpm < H.ENGINE.redlineRad * H.RPM, `gear ${n} shift at ${rpm} rpm`);
  }
  assert.equal(H.shiftCurves(11).length, 3);
});

test('chooseGear: governor beats spring + throttle to upshift, kickdown past the detent', () => {
  assert.equal(H.chooseGear(1, 5, 0.2), 1);
  assert.equal(H.chooseGear(1, 40, 0.2), 2);
  assert.equal(H.chooseGear(4, 40, 0.2), 4);
  assert.equal(H.chooseGear(4, 20, 0.2), 3);
  // 4th at 45 mph holds on a light foot but drops when the pedal goes through the detent
  assert.equal(H.chooseGear(4, 45, 0.5), 4);
  assert.equal(H.chooseGear(4, 45, 1), 3);
  // never leaves 1..4
  assert.equal(H.chooseGear(1, 0, 0), 1);
  assert.equal(H.chooseGear(4, 200, 1), 4);
});

test('car: wide-open start climbs through all four gears in order and does 0-60 in a 1940 time', () => {
  const car = H.createCar();
  const seen = [1];
  let s;
  for (let i = 0; i < 60 * 25; i++) {
    s = H.stepCar(car, { thr: 1 }, 1 / 60);
    if (s.gear !== seen[seen.length - 1]) seen.push(s.gear);
    assert.ok(s.engineRpm < 4700, 'engine stays under the fuel cut');
  }
  assert.deepEqual(seen, [1, 2, 3, 4]);
  const z = H.timeToSpeed(60, 1);
  assert.ok(z.seconds > 12 && z.seconds < 24, `0-60 took ${z.seconds}`);
});

test('car: in Drive at idle the coupling lets it creep, brake holds it, Neutral never moves it', () => {
  const creep = H.createCar();
  let s;
  for (let i = 0; i < 600; i++) s = H.stepCar(creep, { thr: 0 }, 1 / 60);
  assert.ok(s.mph > 0.5 && s.mph < 5, `creep ${s.mph}`);
  assert.ok(s.engineRpm > 450 && s.engineRpm < 900, `idle ${s.engineRpm}`);

  const held = H.createCar();
  for (let i = 0; i < 600; i++) s = H.stepCar(held, { thr: 0, brake: 1 }, 1 / 60);
  assert.equal(s.mph, 0);

  const neutral = H.createCar();
  for (let i = 0; i < 300; i++) s = H.stepCar(neutral, { thr: 1, drive: 'N' }, 1 / 60);
  assert.equal(s.mph, 0);
  assert.ok(s.engineRpm > 3000, 'engine free-revs in neutral');
  assert.equal(s.ratio, 0);
});

test('car: floor it at 40 mph in 4th and it kicks down; hold-gear overrides the valves', () => {
  const car = H.createCar({ mph: 40, gear: 4 });
  let s;
  for (let i = 0; i < 300; i++) s = H.stepCar(car, { thr: 0.25 }, 1 / 60);
  assert.equal(s.gear, 4, 'light foot stays in 4th');
  const k = H.createCar({ mph: 40, gear: 4 });
  for (let i = 0; i < 90; i++) s = H.stepCar(k, { thr: 1 }, 1 / 60);
  assert.ok(s.gear < 4, `kickdown went to ${s.gear}`);

  const lo = H.createCar({ mph: 30, gear: 4 });
  for (let i = 0; i < 120; i++) s = H.stepCar(lo, { thr: 0.1, hold: 2 }, 1 / 60);
  assert.equal(s.gear, 2);
});

test('car: engine braking and coupling heat are physical', () => {
  const coast = H.createCar({ mph: 50, gear: 4 });
  let s;
  const v0 = coast.v;
  for (let i = 0; i < 300; i++) s = H.stepCar(coast, { thr: 0 }, 1 / 60);
  assert.ok(coast.v < v0, 'closed throttle slows the car');
  assert.ok(s.coupTorque < 0 || s.slip <= 0.01, 'overrun: turbine drives the pump');

  // coupling slip heats the fluid; none of it is negative
  const launch = H.createCar();
  for (let i = 0; i < 180; i++) s = H.stepCar(launch, { thr: 1 }, 1 / 60);
  assert.ok(launch.lossJoules > 0);
  assert.ok(s.lossKw >= 0);
});

test('car: a steep hill drags the box down a gear and a steeper one still moves forward', () => {
  const car = H.createCar({ mph: 45, gear: 4 });
  let s;
  for (let i = 0; i < 900; i++) s = H.stepCar(car, { thr: 0.7, grade: 12 }, 1 / 60);
  assert.ok(s.gear <= 3);
  assert.ok(s.mph > 5);
  // no grade => faster than on the hill at the same pedal
  const flat = H.createCar({ mph: 45, gear: 4 });
  let f;
  for (let i = 0; i < 900; i++) f = H.stepCar(flat, { thr: 0.7, grade: 0 }, 1 / 60);
  assert.ok(f.mph > s.mph);
});

test('mphAt matches the wheels: 3000 rpm in 4th is about 62 mph', () => {
  const mph = H.mphAt(3000, 4);
  assert.ok(mph > 55 && mph < 70, `${mph}`);
  assert.ok(H.mphAt(3000, 1) < H.mphAt(3000, 2));
  assert.equal(H.mphAt(3000, 9), 0);
});

test('planetOffsets and planetMeshAngle keep all three planets meshed with sun and ring', () => {
  for (const set of [H.FRONT, H.REAR, { S: 24, R: 42 }, { S: 18, R: 34 }]) {
    const offs = H.planetOffsets(set);
    assert.equal(offs.length, 3);
    assert.equal(offs[0], 0);
    // Each offset is an integer multiple of 2*pi/(S+R), guaranteeing simultaneous sun & ring tooth phase match
    for (const d of offs) {
      const m = (d * (set.S + set.R)) / (2 * Math.PI);
      close(m, Math.round(m), 1e-9);
    }
    // Check sun-planet phase at sun contact (carrier=0, spin=0 => planet valley sits at angle d+pi)
    const P = H.planetTeeth(set);
    for (const d of offs) {
      const pAng = H.planetMeshAngle(set, d, 0);
      const sunPhase = (set.S * d) / (2 * Math.PI);
      const planetAtSun = (P * (d + Math.PI - pAng)) / (2 * Math.PI);
      const sum = sunPhase + planetAtSun;
      close(sum - Math.round(sum - 0.5), 0.5, 1e-9);
    }
  }
});

test('torque converter multiplies torque at stall and freewheels at coupling point and overrun', () => {
  close(H.torqueConverterMultiplier(1700 / H.RPM, 0), 2.1, 1e-9);
  const wp = 200;
  close(H.torqueConverterMultiplier(wp, 0.85 * wp), 1, 1e-9);
  close(H.torqueConverterMultiplier(wp, 0.95 * wp), 1, 1e-9);
  close(H.torqueConverterMultiplier(100, 150), 1, 1e-9);
  const stallCoup = H.couplingTorque(1700 / H.RPM, 0);
  const stallConv = H.converterOutputTorque(1700 / H.RPM, 0);
  close(stallConv / stallCoup, 2.1, 1e-9);
});

test('valveState models hysteresis latching, kickdown detent, and custom spring tuning', () => {
  // 2->3 valve at 50% throttle: upshift is ~23.3 mph, downshift is ~18.4 mph; at 20 mph it is in the band
  const rising = H.valveState(2, 20, 0.5, false);
  assert.equal(rising.inHysteresisBand, true);
  assert.equal(rising.nextHigh, false, 'stays in 2nd while accelerating through the band');

  const falling = H.valveState(2, 20, 0.5, true);
  assert.equal(falling.inHysteresisBand, true);
  assert.equal(falling.nextHigh, true, 'holds 3rd while decelerating through the band');

  // Kickdown at >= 90% throttle raises downshift threshold near upshift threshold
  const normal = H.valveState(3, 45, 0.5, true);
  assert.equal(normal.nextHigh, true);
  const kick = H.valveState(3, 45, 0.95, true);
  assert.equal(kick.kickdown, true);
  assert.equal(kick.nextHigh, false, 'kickdown drops 4->3 at 45 mph');

  // Design challenge Q&A #6: spring = 1.35 psi puts 1->2 upshift at ~25 mph at wide-open throttle
  const tuned = H.valveState(1, 25, 1, false, 1.35);
  assert.ok(Math.abs(tuned.upMph - 25) < 0.25, `tuned upMph ${tuned.upMph}`);
});
