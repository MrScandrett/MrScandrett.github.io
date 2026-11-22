(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.RobotBuildPhysics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SERVO_SAFE_LIMIT_NM = 0.110; // ~62% of SG90 0.176 N·m stall torque
  const SERVO_STALL_LIMIT_NM = 0.176;
  const GEAR_REQUIRED_NET = {
    flat: 0.8,
    ramp: 2.1,
    lift: 3.4
  };
  const PEN_FLEX_FACTOR = {
    butt: 6.2,
    lap: 2.3,
    gusset: 0.7
  };

  /**
   * Check chassis footprint, ground clearance, and battery CoM balance against competition limits.
   * @param {{ length: number, width: number, clearance: number, battPos: number }} opts
   */
  function evaluateChassis({ length, width, clearance, battPos }) {
    const l = Number(length);
    const w = Number(width);
    const clear = Number(clearance);
    const com = Number(battPos);

    const sizeOk = l <= 150 && w <= 150;
    const clearOk = clear >= 8;
    const comOk = com >= 32 && com <= 68;
    const ok = sizeOk && clearOk && comOk;

    const issues = [];
    if (!sizeOk) issues.push('exceeds 150 × 150 mm rule box');
    if (!clearOk) issues.push('ground clearance < 8 mm drags on floor seams');
    if (!comOk) {
      issues.push(com < 32 ? 'rear-heavy CoM risks tipping backward' : 'nose-heavy CoM overloads front wheels');
    }

    return { l, w, clear, battPos: com, sizeOk, clearOk, comOk, ok, issues };
  }

  /**
   * Estimate PLA print time, filament mass, and orientation tradeoffs.
   * @param {{ layer: number, walls: number, infill: number, orient: string, slicePct?: number }} opts
   */
  function evaluatePrint({ layer, walls, infill, orient, slicePct = 85 }) {
    const lh = Math.max(0.08, Number(layer));
    const wallCount = Math.max(1, Number(walls));
    const infillPct = Math.max(0, Number(infill));
    const baseMinutes = (0.24 / lh) * (22 + wallCount * 5 + infillPct * 0.35);
    const orientMult = orient === 'flat' ? 1.0 : orient === 'edge' ? 1.35 : 1.55;
    const minutes = Math.round(baseMinutes * orientMult);
    const grams = Math.round((8 + wallCount * 1.6 + infillPct * 0.14) * (orient === 'tilted' ? 1.28 : 1.0));
    const note =
      orient === 'flat'
        ? 'largest bed contact; strongest against vertical compression; horizontal hole top bridges slightly'
        : orient === 'edge'
          ? 'smaller footprint and rounder vertical hole; longer print and narrower bed adhesion'
          : 'requires support material (~28% extra filament) and leaves support marks on mounting faces';

    return {
      layer: lh,
      walls: wallCount,
      infill: infillPct,
      orient,
      slicePct: Number(slicePct),
      minutes,
      grams,
      note
    };
  }

  /**
   * Estimate angular deflection under lateral load for a 3D-pen structural corner joint.
   * @param {{ joint: 'butt' | 'lap' | 'gusset', force: number }} opts
   */
  function evaluatePenJoint({ joint, force }) {
    const f = Math.max(0, Number(force));
    const factor = PEN_FLEX_FACTOR[joint] || PEN_FLEX_FACTOR.butt;
    const deflectionDeg = +(f * factor).toFixed(1);
    const pass = deflectionDeg <= 6.0;
    return { joint, force: f, deflectionDeg, pass };
  }

  /**
   * Evaluate spur-gear ratio, mesh-efficiency net torque against required net ratio, and 2 m sprint time.
   * @param {{ driver: number, driven: number, task: 'flat' | 'ramp' | 'lift', eff?: number }} opts
   */
  function evaluateGears({ driver, driven, task, eff = 0.85 }) {
    const a = Math.max(1, Number(driver));
    const b = Math.max(1, Number(driven));
    const ratio = b / a;
    const reqNet = GEAR_REQUIRED_NET[task] ?? GEAR_REQUIRED_NET.ramp;
    const netTorque = +(ratio * eff).toFixed(2);
    const climbs = netTorque >= reqNet;
    const outputRpm = 120 / ratio;
    const wheelCircM = Math.PI * 0.06;
    const speedMps = (outputRpm / 60) * wheelCircM;
    const sprintSec = +(2.0 / Math.max(0.05, speedMps)).toFixed(1);
    const pushFactor = +(netTorque * (task === 'flat' ? 1.0 : 0.9)).toFixed(2);

    return {
      driver: a,
      driven: b,
      ratio,
      task,
      eff,
      reqNet,
      netTorque,
      climbs,
      outputRpm,
      speedMps,
      sprintSec,
      pushFactor
    };
  }

  /**
   * Compute static servo torque in N·m (no 10× unit scaling bug) for worst-case horizontal and commanded pose.
   * @param {{ angle: number, arm: number, load: number }} opts
   */
  function evaluateServo({ angle, arm, load }) {
    const ang = Number(angle);
    const armMm = Math.max(0, Number(arm));
    const loadG = Math.max(0, Number(load));
    const armM = armMm / 1000;
    const loadKg = loadG / 1000;
    const forceN = loadKg * 9.81;
    const peakMomentNm = +(armM * forceN).toFixed(4);
    const poseFactor = Math.abs(Math.cos((ang * Math.PI) / 180));
    const poseMomentNm = +(peakMomentNm * poseFactor).toFixed(4);

    const inStopZone = ang <= 20 || ang >= 160;
    const overTorque = peakMomentNm > SERVO_SAFE_LIMIT_NM;
    const overStall = peakMomentNm > SERVO_STALL_LIMIT_NM;
    const safe = !inStopZone && !overTorque;

    return {
      angle: ang,
      arm: armMm,
      load: loadG,
      forceN: +forceN.toFixed(3),
      momentNm: peakMomentNm,
      peakMomentNm,
      poseMomentNm,
      safeLimitNm: SERVO_SAFE_LIMIT_NM,
      stallLimitNm: SERVO_STALL_LIMIT_NM,
      inStopZone,
      overTorque,
      overStall,
      safe
    };
  }

  /**
   * Score end-effector reach/jaw geometry across three jittered approach trials.
   * @param {{ type: 'grip' | 'scoop' | 'push', reach: number, jaw: number, offset: number, jitters?: number[] }} opts
   */
  function evaluateEffector({ type, reach, jaw, offset, jitters = [-4, 0, 4] }) {
    const r = Number(reach);
    const j = Number(jaw);
    const off = Number(offset);

    const results = jitters.map((jitter) => {
      const err = Math.abs(off + jitter);
      if (r < 95) return { jitter, ok: false, why: 'short of 100 mm line' };
      if (type === 'grip') {
        if (j < 42) return { jitter, ok: false, why: 'jaw < 42 mm cannot clear 40 mm ball' };
        if (err > (j - 36) * 0.75) return { jitter, ok: false, why: 'lateral offset hit finger tip' };
        return { jitter, ok: true, why: 'captured & carried across goal' };
      }
      if (type === 'scoop') {
        if (j < 38) return { jitter, ok: false, why: 'scoop narrower than 40 mm ball' };
        if (err > j * 0.45) return { jitter, ok: false, why: 'missed side lip of scoop' };
        return { jitter, ok: true, why: 'cradled & lifted into goal' };
      }
      if (err > j * 0.55) return { jitter, ok: false, why: 'glanced off edge of push bar' };
      return { jitter, ok: true, why: 'pushed cleanly across goal line' };
    });

    const passes = results.filter((res) => res.ok).length;
    const firstFailure = results.find((res) => !res.ok);
    const firstSuccess = results.find((res) => res.ok);
    const summaryReason =
      passes === results.length
        ? firstSuccess?.why || 'consistent across all trials'
        : passes === 0
          ? `all failed: ${firstFailure?.why || 'out of envelope'}`
          : `${passes}/${results.length} clear; failure mode: ${firstFailure?.why || 'edge miss'}`;

    return { type, reach: r, jaw: j, offset: off, passes, results, summaryReason };
  }

  return {
    SERVO_SAFE_LIMIT_NM,
    SERVO_STALL_LIMIT_NM,
    GEAR_REQUIRED_NET,
    evaluateChassis,
    evaluatePrint,
    evaluatePenJoint,
    evaluateGears,
    evaluateServo,
    evaluateEffector
  };
});
