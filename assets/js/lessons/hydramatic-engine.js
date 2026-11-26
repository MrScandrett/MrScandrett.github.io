/* Hydra-Matic engine: pure, DOM-free physics for lessons/engineering/mechanical-and-civil-design/hydra-matic-transmission.html
 *
 * Four things, in the order the 1940 Oldsmobile's driveline had them:
 *   1. Planetary gearsets   (willis, planetSpin, memberSpeeds)  - the Willis equation for sun / ring / carrier
 *   2. Four speeds from two (GEARS, gearRatio, gearMembers)     - front and rear set, each "reduce" or "direct"
 *   3. Fluid coupling       (couplingTorque, couplingSlip)      - T = K (w_pump^2 - w_turbine^2): no torque gain
 *   4. The hydraulic brain  (governorPsi, throttlePsi, upshiftMph, downshiftMph) + createCar/stepCar
 *
 * Numbers: tooth counts (front 22/40, rear 32/50) are teaching numbers chosen so the two sets reproduce the
 * published early-production ratios 3.97 / 2.55 / 1.55 / 1.00. Engine and car are a teaching model loosely
 * based on a 1940 flat-head six (~90 hp), not a measured Oldsmobile.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HydraMaticEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const RPM = 30 / Math.PI;            // rad/s -> rpm
  const MPS_TO_MPH = 2.2369362920544;
  const G = 9.80665;

  /* ---------- 1. Planetary gearsets ---------- */

  // Front and rear sets. S and R are tooth counts of sun and ring; planets have (R - S) / 2 teeth.
  const FRONT = { name: 'Front set', S: 22, R: 40 };
  const REAR = { name: 'Rear set', S: 32, R: 50 };

  function planetTeeth(set) { return (set.R - set.S) / 2; }

  // Willis equation: S*w_sun + R*w_ring = (S + R)*w_carrier. Pass exactly one member as null; it is solved.
  function willis(set, m) {
    const { S, R } = set;
    const out = { sun: m.sun, ring: m.ring, carrier: m.carrier };
    const unknown = ['sun', 'ring', 'carrier'].filter((k) => m[k] == null);
    if (unknown.length !== 1) throw new Error('willis: leave exactly one member null');
    if (unknown[0] === 'sun') out.sun = ((S + R) * m.carrier - R * m.ring) / S;
    if (unknown[0] === 'ring') out.ring = ((S + R) * m.carrier - S * m.sun) / R;
    if (unknown[0] === 'carrier') out.carrier = (S * m.sun + R * m.ring) / (S + R);
    return out;
  }

  // Spin of each planet about its own axle (rad/s, same sign convention as the members).
  // Contact with the sun: w_c (S + P) - w_p P = w_s S.
  function planetSpin(set, wSun, wCarrier) {
    const P = planetTeeth(set);
    return (wCarrier * (set.S + P) - wSun * set.S) / P;
  }

  // Exact carrier assembly angles (radians) for 3 planets so every planet's teeth mesh
  // simultaneously with both the sun and the internal ring gear, even when (S + R) % 3 !== 0.
  function planetOffsets(set) {
    const total = set.S + set.R;
    return [0, Math.round(total / 3), Math.round((2 * total) / 3)].map((m) => (m * 2 * Math.PI) / total);
  }

  // Exact visual rotation angle of a planet located at carrier offset `offsetRad`.
  function planetMeshAngle(set, offsetRad, spinAngle) {
    const P = planetTeeth(set);
    return spinAngle + ((set.S + P) / P) * offsetRad + Math.PI * (1 - 1 / P);
  }

  // Ratio (input speed / output speed) of any one set when one member is the input, one is held still and the
  // third is the output. Negative = output turns the other way (reverse), under 1 = overdrive.
  function planetaryRatio(set, input, held, output) {
    const names = ['sun', 'ring', 'carrier'];
    if (new Set([input, held, output]).size !== 3 || ![input, held, output].every((k) => names.includes(k))) {
      throw new Error('planetaryRatio: input, held and output must be three different members');
    }
    const m = { sun: null, ring: null, carrier: null };
    m[input] = 1;
    m[held] = 0;
    const solved = willis(set, m);
    return 1 / solved[output];
  }

  /* ---------- 2. Four speeds from two sets ---------- */

  // Each set is either "reduce" (a band holds one member, the carrier turns slower) or "direct" (a clutch locks it solid).
  //   Front: reduce = band holds the SUN, ring is the input, carrier is the output  -> 1 + S/R = 1.55
  //   Rear : reduce = band holds the RING, sun is the input, carrier is the output  -> 1 + R/S = 2.5625
  const GEARS = {
    1: { front: 'reduce', rear: 'reduce', name: 'First' },
    2: { front: 'direct', rear: 'reduce', name: 'Second' },
    3: { front: 'reduce', rear: 'direct', name: 'Third' },
    4: { front: 'direct', rear: 'direct', name: 'Fourth' }
  };

  const FRONT_REDUCTION = (FRONT.S + FRONT.R) / FRONT.R;   // 1.55
  const REAR_REDUCTION = (REAR.S + REAR.R) / REAR.S;       // 2.5625

  function gearRatio(n) {
    const g = GEARS[n];
    if (!g) return 0;
    return (g.front === 'reduce' ? FRONT_REDUCTION : 1) * (g.rear === 'reduce' ? REAR_REDUCTION : 1);
  }

  const RATIOS = [1, 2, 3, 4].map(gearRatio);

  // Every member speed in both sets, for transmission input speed wIn (rad/s) in gear n.
  function gearMembers(n, wIn) {
    const g = GEARS[n];
    if (!g) return null;
    let front;
    if (g.front === 'reduce') front = willis(FRONT, { sun: 0, ring: wIn, carrier: null });
    else front = { sun: wIn, ring: wIn, carrier: wIn };
    const mid = front.carrier;                       // front carrier drives the rear sun
    let rear;
    if (g.rear === 'reduce') rear = willis(REAR, { sun: mid, ring: 0, carrier: null });
    else rear = { sun: mid, ring: mid, carrier: mid };
    return {
      front, rear, out: rear.carrier,
      holds: {
        frontBand: g.front === 'reduce',  frontClutch: g.front === 'direct',
        rearBand: g.rear === 'reduce',    rearClutch: g.rear === 'direct'
      }
    };
  }

  /* ---------- 3. Fluid coupling ---------- */

  // Capacity constant (N·m·s²): about 250 N·m at 1700 rpm of pump speed with the turbine held.
  const COUPLING_K = 0.0079;

  // Pump (engine side) and turbine (transmission side) rad/s -> torque on the turbine (N·m). The same torque
  // acts back on the pump: a coupling cannot multiply torque, it only passes it on. Negative = overrun.
  function couplingTorque(wPump, wTurbine, K) {
    const k = K == null ? COUPLING_K : K;
    return k * (wPump * Math.abs(wPump) - wTurbine * Math.abs(wTurbine));
  }

  function couplingSlip(wPump, wTurbine) {
    if (wPump <= 1) return 0;
    return (wPump - wTurbine) / wPump;
  }

  // 3-element torque converter (adding a one-way stator to the fluid coupling) for Job 1 comparison.
  // At stall it multiplies torque up to 2.10x; above the 0.85 coupling point (or on overrun) the stator freewheels (1.00x).
  function torqueConverterMultiplier(wPump, wTurbine) {
    if (wPump <= 1 || wTurbine >= 0.85 * wPump) return 1;
    const sr = Math.max(0, wTurbine / wPump);
    return 1 + 1.1 * (1 - sr / 0.85);
  }

  function converterOutputTorque(wPump, wTurbine, K) {
    return couplingTorque(wPump, wTurbine, K) * torqueConverterMultiplier(wPump, wTurbine);
  }

  /* ---------- The engine ---------- */

  const ENGINE = {
    peakTorque: 250, peakRad: 157, width: 420, idleRad: 70, inertia: 0.35, redlineRad: 460
  };

  function engineMaxTorque(w) {
    const x = (w - ENGINE.peakRad) / ENGINE.width;
    return ENGINE.peakTorque * Math.max(0.15, 1 - x * x);
  }

  // Net crankshaft torque with the driver's foot at thr (0..1): combustion + idle controller - friction.
  function engineTorque(w, thr) {
    const burn = thr * engineMaxTorque(w);
    const idle = Math.min(70, Math.max(0, 4 * (ENGINE.idleRad - w)));
    const friction = 10 + 0.05 * Math.max(0, w);
    let t = Math.max(burn, idle) - friction;
    if (w > ENGINE.redlineRad) t -= 6 * (w - ENGINE.redlineRad);   // governor cuts fuel above the redline
    return t;
  }

  /* ---------- 4. The hydraulic brain ---------- */

  // The governor on the output shaft makes pressure that rises with road speed squared (flyweights).
  const GOVERNOR_PSI_PER_MPH2 = 0.004;
  function governorPsi(mph) { return GOVERNOR_PSI_PER_MPH2 * mph * mph; }

  // The throttle valve (linked to the accelerator) makes pressure that fights the upshift.
  const THROTTLE_PSI_MAX = 10;
  function throttlePsi(thr) { return THROTTLE_PSI_MAX * thr; }

  // Shift valve n -> n+1 moves when governor pressure beats spring + throttle pressure acting on a land of area k:
  //   P_up(n, thr) = a_n + k_n * throttlePsi(thr)
  // Tuned for road speeds of 6 / 12 / 22 mph (closed throttle) and 18 / 30 / 48 mph (wide open) for 1-2 / 2-3 / 3-4.
  const SHIFT_VALVES = [
    { from: 1, to: 2, a: 0.144, k: 0.1152 },
    { from: 2, to: 3, a: 0.576, k: 0.3024 },
    { from: 3, to: 4, a: 1.936, k: 0.728 }
  ];
  const DOWNSHIFT_FRACTION = 0.62;      // valve lets go at 62% of the pressure that closed it (hysteresis)
  const KICKDOWN_FRACTION = 0.92;       // floor the pedal past the detent and the valve lets go almost at once
  const KICKDOWN_THROTTLE = 0.9;

  function upshiftPsi(from, thr) {
    const v = SHIFT_VALVES[from - 1];
    return v.a + v.k * throttlePsi(thr);
  }
  function downshiftPsi(from, thr) {         // from = the LOWER gear of the pair (3 means 4 -> 3)
    return upshiftPsi(from, thr) * (thr >= KICKDOWN_THROTTLE ? KICKDOWN_FRACTION : DOWNSHIFT_FRACTION);
  }
  function upshiftMph(from, thr) { return Math.sqrt(upshiftPsi(from, thr) / GOVERNOR_PSI_PER_MPH2); }
  function downshiftMph(from, thr) { return Math.sqrt(downshiftPsi(from, thr) / GOVERNOR_PSI_PER_MPH2); }

  // What gear does the valve body want, given where it is now? (pure; used by the car and by the lesson's shift map)
  function chooseGear(current, mph, thr) {
    const p = governorPsi(mph);
    let g = current;
    if (g < 4 && p > upshiftPsi(g, thr)) g += 1;
    else if (g > 1 && p < downshiftPsi(g - 1, thr)) g -= 1;
    return g;
  }

  // Single shift-valve inspection helper (1 = 1->2, 2 = 2->3, 3 = 3->4) with optional custom spring preload (psi).
  function valveState(valveIdx, mph, thr, isHigh, customSpringPsi) {
    const v = SHIFT_VALVES[valveIdx - 1];
    if (!v) throw new Error('valveState: valveIdx must be 1, 2, or 3');
    const t = Math.min(1, Math.max(0, thr || 0));
    const spring = customSpringPsi == null ? v.a : Math.max(0, customSpringPsi);
    const govPsi = governorPsi(Math.abs(mph || 0));
    const thrPsi = throttlePsi(t);
    const upPsi = spring + v.k * thrPsi;
    const kickdown = t >= KICKDOWN_THROTTLE;
    const downPsi = upPsi * (kickdown ? KICKDOWN_FRACTION : DOWNSHIFT_FRACTION);
    const upMph = Math.sqrt(upPsi / GOVERNOR_PSI_PER_MPH2);
    const downMph = Math.sqrt(downPsi / GOVERNOR_PSI_PER_MPH2);
    const nextHigh = isHigh ? !(govPsi < downPsi) : (govPsi > upPsi);
    const inHysteresisBand = govPsi >= downPsi && govPsi <= upPsi;
    return {
      valve: v, spring, govPsi, thrPsi, upPsi, downPsi, upMph, downMph,
      kickdown, nextHigh, inHysteresisBand
    };
  }

  // Curves for plotting the shift map: arrays of {thr, mph} for each valve.
  function shiftCurves(steps) {
    const n = steps || 21;
    return SHIFT_VALVES.map((v) => {
      const up = [], down = [];
      for (let i = 0; i < n; i++) {
        const thr = i / (n - 1);
        up.push({ thr, mph: upshiftMph(v.from, thr) });
        down.push({ thr, mph: downshiftMph(v.from, thr) });
      }
      return { from: v.from, to: v.to, up, down };
    });
  }

  /* ---------- The car ---------- */

  const CAR = {
    mass: 1650,          // kg, car + two people
    inertiaFactor: 1.05, // spinning parts count as extra mass
    wheelRadius: 0.34,   // m
    finalDrive: 3.9,
    cdA: 1.3,            // m^2
    crr: 0.02,
    airDensity: 1.2,
    brakeForce: 7000,    // N at full pedal
    shiftTime: 0.28      // s: clutches and bands swap places
  };

  // Road speed (mph) with the transmission input at rpm in gear n, no slip.
  function mphAt(rpm, n) {
    const r = gearRatio(n);
    if (!r) return 0;
    const wIn = rpm / RPM;
    const wWheel = wIn / (r * CAR.finalDrive);
    return wWheel * CAR.wheelRadius * MPS_TO_MPH;
  }

  function createCar(opts) {
    const o = opts || {};
    return {
      t: 0,
      wEng: ENGINE.idleRad,        // rad/s
      v: o.mph ? o.mph / MPS_TO_MPH : 0,
      gear: o.gear || 1,
      shiftClock: 99,              // seconds since the last shift began
      lastTurbineJump: 0,
      shifts: 0,
      lossJoules: 0,
      distance: 0,
      // readouts filled by stepCar:
      wTurb: 0, coupT: 0, slip: 0, accel: 0
    };
  }

  function roadForce(car, input) {
    const v = car.v;
    const grade = (input.grade || 0) / 100;
    const slope = Math.atan(grade);
    const drag = 0.5 * CAR.airDensity * CAR.cdA * v * Math.abs(v);
    const roll = CAR.crr * CAR.mass * G * Math.cos(slope) * Math.sign(v || 0);
    const hill = CAR.mass * G * Math.sin(slope);
    return { drag, roll, hill };
  }

  // Advance the car by dt seconds (substepped). input: { thr 0..1, brake 0..1, grade %, drive 'D'|'N', hold 0|1..4 }.
  function stepCar(car, input, dt) {
    const inp = input || {};
    const thr = Math.min(1, Math.max(0, inp.thr || 0));
    const brake = Math.min(1, Math.max(0, inp.brake || 0));
    const inDrive = (inp.drive || 'D') !== 'N';
    const hold = inp.hold || 0;
    const steps = Math.max(1, Math.ceil(dt / (1 / 480)));
    const h = dt / steps;
    const mEff = CAR.mass * CAR.inertiaFactor;

    for (let i = 0; i < steps; i++) {
      const mph = Math.abs(car.v) * MPS_TO_MPH;

      // --- the valve body decides, no sooner than 0.5 s after the last shift ---
      if (inDrive) {
        const want = hold ? hold : chooseGear(car.gear, mph, thr);
        if (want !== car.gear && car.shiftClock > 0.5) {
          const before = ratioNow(car);
          car.gear = want;
          car.shiftClock = 0;
          car.shifts += 1;
          car.lastTurbineJump = Math.abs(car.v) / CAR.wheelRadius * CAR.finalDrive * (gearRatio(want) - before) * RPM;
        }
      }
      car.shiftClock += h;

      // --- driveline ---
      const ratio = inDrive ? gearRatio(car.gear) : 0;
      const wWheel = car.v / CAR.wheelRadius;
      const wTurb = ratio ? wWheel * CAR.finalDrive * ratio : 0;

      // clutches overlap during a shift, so the box passes only part of the torque
      let grip = 1;
      if (car.shiftClock < CAR.shiftTime) grip = 1 - 0.65 * Math.sin(Math.PI * car.shiftClock / CAR.shiftTime);

      let tCoup = ratio ? couplingTorque(car.wEng, wTurb) : 0;
      const tPass = tCoup * grip;
      // slipping a clutch can't pass more than it has: torque the box can't pass backs up as more coupling slip

      // engine
      const tEng = engineTorque(car.wEng, thr);
      car.wEng += h * (tEng - tCoup) / ENGINE.inertia;
      if (car.wEng < 8) car.wEng = 8;

      // wheels
      const wheelForce = ratio ? tPass * ratio * CAR.finalDrive / CAR.wheelRadius : 0;
      const rf = roadForce(car, inp);
      const brakeF = brake * CAR.brakeForce;
      let drive = wheelForce - rf.drag - rf.hill;
      const resist = Math.abs(rf.roll) || CAR.crr * CAR.mass * G * Math.cos(Math.atan((inp.grade || 0) / 100));
      let a;
      if (Math.abs(car.v) < 0.03 && Math.abs(drive) <= resist + brakeF) {
        car.v = 0; a = 0;
      } else {
        const dir = car.v === 0 ? Math.sign(drive) : Math.sign(car.v);
        a = (drive - dir * (resist + brakeF)) / mEff;
        const vNew = car.v + a * h;
        // brakes and rolling resistance stop the car, they never push it backwards
        car.v = (Math.sign(vNew) !== Math.sign(car.v) && car.v !== 0 && Math.abs(a) > 0) ? 0 : vNew;
      }
      car.distance += Math.abs(car.v) * h;
      car.t += h;

      car.wTurb = wTurb; car.coupT = tCoup; car.slip = ratio ? couplingSlip(car.wEng, wTurb) : 0;
      car.accel = a;
      if (ratio && car.wEng > wTurb) car.lossJoules += tCoup * (car.wEng - wTurb) * h;
    }
    return snapshot(car, thr, inDrive);
  }

  function ratioNow(car) {
    return gearRatio(car.gear);
  }

  function snapshot(car, thr, inDrive) {
    const mph = car.v * MPS_TO_MPH;
    const ratio = inDrive ? gearRatio(car.gear) : 0;
    const wOut = (car.v / CAR.wheelRadius) * CAR.finalDrive;     // transmission output shaft
    return {
      mph,
      engineRpm: car.wEng * RPM,
      turbineRpm: car.wTurb * RPM,
      outputRpm: wOut * RPM,
      gear: car.gear,
      ratio,
      shifting: car.shiftClock < CAR.shiftTime,
      shiftProgress: Math.min(1, car.shiftClock / CAR.shiftTime),
      slip: car.slip,
      coupTorque: car.coupT,
      governor: governorPsi(Math.abs(mph)),
      throttle: throttlePsi(thr),
      lossKw: car.coupT * Math.max(0, car.wEng - car.wTurb) / 1000,
      engineKw: Math.max(0, engineTorque(car.wEng, thr) + 0) * car.wEng / 1000,
      accel: car.accel,
      turbineJump: car.lastTurbineJump,
      shifts: car.shifts,
      distance: car.distance,
      t: car.t,
      members: inDrive ? gearMembers(car.gear, car.wTurb) : null
    };
  }

  // Convenience for tests and the lesson's "stopwatch": 0 -> target mph at a steady throttle.
  function timeToSpeed(targetMph, thr, grade) {
    const car = createCar();
    let s = null;
    for (let i = 0; i < 60 * 120; i++) {
      s = stepCar(car, { thr, grade: grade || 0, drive: 'D' }, 1 / 60);
      if (s.mph >= targetMph) return { seconds: car.t, state: s, car };
    }
    return { seconds: Infinity, state: s, car };
  }

  return {
    RPM, MPS_TO_MPH,
    FRONT, REAR, planetTeeth, willis, planetSpin, planetOffsets, planetMeshAngle, planetaryRatio,
    GEARS, FRONT_REDUCTION, REAR_REDUCTION, RATIOS, gearRatio, gearMembers,
    COUPLING_K, couplingTorque, couplingSlip, torqueConverterMultiplier, converterOutputTorque,
    ENGINE, engineMaxTorque, engineTorque,
    SHIFT_VALVES, DOWNSHIFT_FRACTION, KICKDOWN_FRACTION, KICKDOWN_THROTTLE,
    governorPsi, throttlePsi, upshiftPsi, downshiftPsi, upshiftMph, downshiftMph, chooseGear, valveState, shiftCurves,
    CAR, mphAt, createCar, stepCar, timeToSpeed
  };
});
