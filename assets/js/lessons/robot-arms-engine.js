(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.RobotArmsEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEG = 180 / Math.PI;

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function wrapDeg(d) {
    return ((((d % 360) + 540) % 360) - 180);
  }

  function forwardKinematics({ baseX, baseY, l1, l2, l3 = 0, t1Deg, t2Deg, t3Deg = 0 }) {
    const a1 = t1Deg / DEG;
    const a2 = (t1Deg + t2Deg) / DEG;
    const a3 = (t1Deg + t2Deg + t3Deg) / DEG;
    const s = { x: baseX, y: baseY };
    const e = { x: baseX + l1 * Math.cos(a1), y: baseY - l1 * Math.sin(a1) };
    const w = { x: e.x + l2 * Math.cos(a2), y: e.y - l2 * Math.sin(a2) };
    const t = { x: w.x + l3 * Math.cos(a3), y: w.y - l3 * Math.sin(a3) };
    return { s, e, w, t, a3 };
  }

  function inverseKinematics({ baseX, baseY, l1, l2, l3 = 0, tx, ty, elbowUp = true }) {
    const wx = tx - baseX;
    const wy = (baseY - ty) + l3;
    const d2 = wx * wx + wy * wy;
    const d = Math.sqrt(d2);
    const rawC2 = (d2 - l1 * l1 - l2 * l2) / (2 * l1 * l2);
    const ok = rawC2 >= -1 && rawC2 <= 1 && d > 1;
    const c2 = clamp(rawC2, -1, 1);
    const t2 = Math.acos(c2) * (elbowUp ? -1 : 1);
    const t1 = Math.atan2(wy, wx) - Math.atan2(l2 * Math.sin(t2), l1 + l2 * Math.cos(t2));
    const t1d = t1 * DEG;
    const t2d = t2 * DEG;
    return {
      ok,
      q: {
        t1: t1d,
        t2: t2d,
        t3: -90 - t1d - t2d
      }
    };
  }

  function gravityTorque({
    baseX, eX, wX, tX,
    pxPerCm = 4, m1 = 0.65, m2 = 0.48, mw = 0.25, mLoad = 0,
    springOn = false, stallNm = 3.2
  }) {
    const g = 9.81;
    const pxToM = 1 / (pxPerCm * 100);
    const x1 = (eX - baseX) * 0.5 * pxToM;
    const x2 = ((eX + wX) * 0.5 - baseX) * pxToM;
    const x3 = ((wX + tX) * 0.5 - baseX) * pxToM;
    const tau1Raw = Math.abs(m1 * g * x1 + m2 * g * x2 + (mw + mLoad) * g * x3);
    const tau1 = springOn ? tau1Raw * 0.32 : tau1Raw;
    const x2e = ((eX + wX) * 0.5 - eX) * pxToM;
    const x3e = ((wX + tX) * 0.5 - eX) * pxToM;
    const tau2 = Math.abs(m2 * g * x2e + (mw + mLoad) * g * x3e);
    return {
      tau1,
      tau1Raw,
      tau2,
      pct: Math.round((tau1 / stallNm) * 100),
      springOn
    };
  }

  /**
   * 2-link planar Jacobian manipulability measure: |det J| = L1 * L2 * |sin θ2|.
   */
  function manipulability({ l1, l2, t2Deg }) {
    const normalized = Math.abs(Math.sin((t2Deg * Math.PI) / 180));
    const score = l1 * l2 * normalized;
    return {
      score,
      normalized,
      singular: normalized < 0.14
    };
  }

  function segHitsCircle(p, r, o, clearance = 6) {
    const dx = r.x - p.x;
    const dy = r.y - p.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 > 0 ? clamp(((o.x - p.x) * dx + (o.y - p.y) * dy) / l2, 0, 1) : 0;
    return Math.hypot(p.x + t * dx - o.x, p.y + t * dy - o.y) < o.r + clearance;
  }

  function collides2Link({ baseX, baseY, l1, l2, a1Deg, a2Deg, obstacles, clearance = 6 }) {
    const { s, e, w } = forwardKinematics({
      baseX, baseY, l1, l2, l3: 0, t1Deg: a1Deg, t2Deg: a2Deg, t3Deg: 0
    });
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (segHitsCircle(s, e, o, clearance) || segHitsCircle(e, w, o, clearance)) {
        return true;
      }
    }
    return false;
  }

  return {
    DEG,
    clamp,
    wrapDeg,
    forwardKinematics,
    inverseKinematics,
    gravityTorque,
    manipulability,
    collides2Link
  };
});
