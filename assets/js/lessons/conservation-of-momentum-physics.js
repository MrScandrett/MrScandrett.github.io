/**
 * Conservation of Momentum — Pure Physics & Collision Engine
 * UMD module: works in browser (window.MomentumPhysics) and Node tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MomentumPhysics = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const C = 299792458; // speed of light in vacuum (m/s)
  const G = 9.81; // standard gravity (m/s^2)
  const PROTON_MASS_KG = 1.67262192369e-27;

  const COLLISION_PRESETS = [
    {
      id: 'equal-swap',
      name: 'Equal-Mass Elastic Swap',
      mode: 'collision',
      m1: 2.0,
      v1: 6.0,
      m2: 2.0,
      v2: 0.0,
      e: 1.0,
      note: 'Identical masses trade velocities completely — Cart 1 stops dead while Cart 2 leaves with all the momentum.'
    },
    {
      id: 'head-on',
      name: 'Head-On Elastic Bounce',
      mode: 'collision',
      m1: 2.0,
      v1: 5.0,
      m2: 3.0,
      v2: -4.0,
      e: 1.0,
      note: 'Opposing momenta sum to -2.0 kg·m/s before and after impact, while the center of mass glides steadily left.'
    },
    {
      id: 'stick',
      name: 'Perfectly Inelastic Coupling',
      mode: 'collision',
      m1: 3.0,
      v1: 6.0,
      m2: 2.0,
      v2: 0.0,
      e: 0.0,
      note: 'The carts lock together at the center-of-mass velocity while 40% of the kinetic energy becomes heat and sound.'
    },
    {
      id: 'heavy-light',
      name: 'Bowling Ball vs. Ping-Pong',
      mode: 'collision',
      m1: 6.0,
      v1: 5.0,
      m2: 0.5,
      v2: 0.0,
      e: 1.0,
      note: 'A massive collider barely slows down and launches the light target at nearly twice its incoming speed.'
    },
    {
      id: 'recoil',
      name: 'Spring-Loaded Recoil',
      mode: 'recoil',
      m1: 1.5,
      m2: 4.5,
      v1: 0.0,
      v2: 0.0,
      e: 1.0,
      springEnergyJ: 48,
      note: 'Starting from rest (p_total = 0), both carts burst apart with equal and opposite momenta; the lighter cart takes 75% of the energy.'
    }
  ];

  const IMPULSE_SURFACES = [
    {
      id: 'steel',
      name: 'Rigid Steel Wall',
      durationS: 0.012,
      restitution: 0.05,
      color: '#64748b',
      note: 'A 12 ms stop concentrates the entire impulse into a massive force spike that overwhelms the safety limit.'
    },
    {
      id: 'wood',
      name: 'Oak Bumper',
      durationS: 0.045,
      restitution: 0.10,
      color: '#b45309',
      note: 'Slightly longer compression cuts peak force nearly fourfold, though sharp shock still threatens fragile cargo.'
    },
    {
      id: 'foam',
      name: 'Gymnastics Mat',
      durationS: 0.140,
      restitution: 0.05,
      color: '#0284c7',
      note: 'Cushioning stretches Δt over 140 ms, keeping the area J = ∫F dt identical while flattening the peak.'
    },
    {
      id: 'airbag',
      name: 'Crumple Zone + Airbag',
      durationS: 0.240,
      restitution: 0.00,
      color: '#16a34a',
      note: 'Gradual deceleration over 240 ms lowers peak force 20× compared to rigid steel, keeping the payload safe.'
    },
    {
      id: 'rubber',
      name: 'Bouncy Rubber Wall',
      durationS: 0.035,
      restitution: 0.90,
      color: '#db2777',
      note: 'Rebounding reverses velocity from +v to -0.9v, nearly doubling total impulse Δp and raising peak force!'
    }
  ];

  const BILLIARDS_PRESETS = [
    {
      id: 'head-on',
      name: 'Head-On',
      m1: 2.0,
      m2: 2.0,
      speed1: 5.0,
      offset: 0.0,
      e: 1.0,
      note: 'Zero aim offset transfers all momentum along the x-axis with no sideways y-component.'
    },
    {
      id: 'glancing-90',
      name: '90° Equal-Mass Split',
      m1: 2.0,
      m2: 2.0,
      speed1: 5.0,
      offset: 0.52,
      e: 1.0,
      note: 'When two identical spheres collide elastically off-center, momentum and kinetic energy force a 90° separation.'
    },
    {
      id: 'heavy-cue',
      name: 'Heavy Cue',
      m1: 4.0,
      m2: 1.0,
      speed1: 5.0,
      offset: 0.45,
      e: 1.0,
      note: 'A heavy cue ball plows forward after impact while the lighter target jets sideways (&lt; 90° total).'
    },
    {
      id: 'sticky',
      name: 'Sticky Glancing',
      m1: 2.0,
      m2: 2.0,
      speed1: 5.0,
      offset: 0.40,
      e: 0.0,
      note: 'With zero normal restitution, kinetic energy drops but both x- and y-momentum remain strictly conserved.'
    }
  ];

  const RELATIVISTIC_LANDMARKS = [
    { id: 'bullet', label: 'Rifle bullet (900 m/s)', beta: 3e-6 },
    { id: 'iss', label: 'ISS orbit (7.66 km/s)', beta: 2.55e-5 },
    { id: 'half-c', label: '0.50 c', beta: 0.50 },
    { id: 'gamma-2', label: '0.866 c (γ = 2.0)', beta: Math.sqrt(3) / 2 },
    { id: 'muon', label: '0.99 c (Cosmic muon)', beta: 0.99 }
  ];

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  /**
   * Compute exact 1D collision result for two bodies with coefficient of restitution e in [0, 1].
   */
  function compute1DCollision({ m1 = 2, v1 = 5, m2 = 2, v2 = -3, e = 1 } = {}) {
    const safeM1 = Math.max(0.05, Number(m1) || 2);
    const safeM2 = Math.max(0.05, Number(m2) || 2);
    const safeV1 = Number(v1) || 0;
    const safeV2 = Number(v2) || 0;
    const safeE = clamp(e == null ? 1 : Number(e), 0, 1);

    const totalMass = safeM1 + safeM2;
    const p1Before = safeM1 * safeV1;
    const p2Before = safeM2 * safeV2;
    const pTotalBefore = p1Before + p2Before;
    const vCom = pTotalBefore / totalMass;

    const v1After = (safeM1 * safeV1 + safeM2 * safeV2 + safeM2 * safeE * (safeV2 - safeV1)) / totalMass;
    const v2After = (safeM1 * safeV1 + safeM2 * safeV2 + safeM1 * safeE * (safeV1 - safeV2)) / totalMass;

    const p1After = safeM1 * v1After;
    const p2After = safeM2 * v2After;
    const pTotalAfter = p1After + p2After;

    const keBefore = 0.5 * safeM1 * safeV1 * safeV1 + 0.5 * safeM2 * safeV2 * safeV2;
    const keAfter = 0.5 * safeM1 * v1After * v1After + 0.5 * safeM2 * v2After * v2After;
    const keLost = Math.max(0, keBefore - keAfter);
    const keLostPct = keBefore > 1e-9 ? (keLost / keBefore) * 100 : 0;

    return {
      v1After,
      v2After,
      p1Before,
      p2Before,
      pTotalBefore,
      p1After,
      p2After,
      pTotalAfter,
      vCom,
      keBefore,
      keAfter,
      keLost,
      keLostPct,
      impulseOn1: p1After - p1Before,
      impulseOn2: p2After - p2Before,
      stuck: safeE <= 0.005
    };
  }

  /**
   * Compute velocities and kinetic energy split for two carts pushed apart from rest by a spring.
   */
  function computeRecoil({ m1 = 1.5, m2 = 4.5, springEnergyJ = 48 } = {}) {
    const safeM1 = Math.max(0.05, Number(m1) || 1.5);
    const safeM2 = Math.max(0.05, Number(m2) || 4.5);
    const energy = Math.max(0, Number(springEnergyJ) || 0);

    // E = (p^2 / 2) * (1/m1 + 1/m2) => p = sqrt(2 * E * m1 * m2 / (m1 + m2))
    const totalMass = safeM1 + safeM2;
    const pMag = Math.sqrt((2 * energy * safeM1 * safeM2) / totalMass);
    const v1 = -pMag / safeM1;
    const v2 = pMag / safeM2;

    const ke1 = 0.5 * safeM1 * v1 * v1;
    const ke2 = 0.5 * safeM2 * v2 * v2;
    const keTotal = ke1 + ke2;

    return {
      v1,
      v2,
      p1: safeM1 * v1,
      p2: safeM2 * v2,
      pTotal: safeM1 * v1 + safeM2 * v2,
      ke1,
      ke2,
      keTotal,
      ke1Share: keTotal > 1e-9 ? (ke1 / keTotal) * 100 : 0,
      ke2Share: keTotal > 1e-9 ? (ke2 / keTotal) * 100 : 0
    };
  }

  /**
   * Compute center of mass position, velocity, and total momentum for 1D or 2D bodies.
   */
  function computeCenterOfMass(bodies) {
    if (!Array.isArray(bodies) || !bodies.length) {
      return { totalMass: 0, x: 0, y: 0, vx: 0, vy: 0, px: 0, py: 0 };
    }
    let totalMass = 0;
    let mx = 0;
    let my = 0;
    let px = 0;
    let py = 0;

    for (let i = 0; i < bodies.length; i += 1) {
      const b = bodies[i];
      const m = Math.max(0, Number(b.m) || 0);
      const x = Number(b.x) || 0;
      const y = Number(b.y) || 0;
      const vx = Number(b.vx != null ? b.vx : b.v) || 0;
      const vy = Number(b.vy) || 0;
      totalMass += m;
      mx += m * x;
      my += m * y;
      px += m * vx;
      py += m * vy;
    }

    if (totalMass <= 0) {
      return { totalMass: 0, x: 0, y: 0, vx: 0, vy: 0, px: 0, py: 0 };
    }

    return {
      totalMass,
      x: mx / totalMass,
      y: my / totalMass,
      vx: px / totalMass,
      vy: py / totalMass,
      px,
      py
    };
  }

  /**
   * Advance a 1D air-track state by dt seconds with sub-step collision detection.
   * Respects boundaryMode: 'open' (isolated system) or 'walls' (external impulses).
   */
  function step1DAirTrack(state, dt) {
    const stepDt = clamp(Number(dt) || 0, 0, 0.05);
    const trackLen = Math.max(4, Number(state.trackLengthM) || 12);
    const r1 = Math.max(0.15, Number(state.r1M) || 0.35);
    const r2 = Math.max(0.15, Number(state.r2M) || 0.35);
    const minDist = r1 + r2;
    const boundaryMode = state.boundaryMode === 'walls' ? 'walls' : 'open';

    let x1 = Number(state.x1) || 0;
    let x2 = Number(state.x2) || 0;
    let v1 = Number(state.v1) || 0;
    let v2 = Number(state.v2) || 0;
    const m1 = Math.max(0.05, Number(state.m1) || 2);
    const m2 = Math.max(0.05, Number(state.m2) || 2);
    const e = clamp(state.e == null ? 1 : Number(state.e), 0, 1);

    let stuck = Boolean(state.stuck);
    let collided = Boolean(state.collided);
    let wallHit = Boolean(state.wallHit);
    let externalImpulse = Number(state.externalImpulse) || 0;
    let lastCollision = state.lastCollision || null;
    let justCollided = false;
    let justHitWall = false;
    let contactX = null;

    if (stuck) {
      x1 += v1 * stepDt;
      x2 = x1 + minDist;
      if (boundaryMode === 'walls') {
        if (x1 - r1 < 0 && v1 < 0) {
          const nextV = -v1;
          externalImpulse += (m1 + m2) * (nextV - v1);
          v1 = nextV;
          v2 = nextV;
          x1 = r1;
          x2 = x1 + minDist;
          wallHit = true;
          justHitWall = true;
        } else if (x2 + r2 > trackLen && v1 > 0) {
          const nextV = -v1;
          externalImpulse += (m1 + m2) * (nextV - v1);
          v1 = nextV;
          v2 = nextV;
          x2 = trackLen - r2;
          x1 = x2 - minDist;
          wallHit = true;
          justHitWall = true;
        }
      }
    } else {
      const prevX1 = x1;
      const prevX2 = x2;
      x1 += v1 * stepDt;
      x2 += v2 * stepDt;

      // Exact sub-step collision check while approaching (v1 > v2)
      const relV = v1 - v2;
      if (x2 - x1 <= minDist && relV > 1e-6 && prevX2 >= prevX1) {
        const prevGap = (prevX2 - prevX1) - minDist;
        const frac = clamp(prevGap / (relV * stepDt), 0, 1);
        const tColl = frac * stepDt;
        const tRem = (1 - frac) * stepDt;

        const cx1 = prevX1 + v1 * tColl;
        const cx2 = cx1 + minDist;
        contactX = cx1 + r1;

        lastCollision = compute1DCollision({ m1, v1, m2, v2, e });
        v1 = lastCollision.v1After;
        v2 = lastCollision.v2After;
        stuck = lastCollision.stuck;
        collided = true;
        justCollided = true;

        x1 = cx1 + v1 * tRem;
        x2 = stuck ? x1 + minDist : cx2 + v2 * tRem;
      }

      if (boundaryMode === 'walls') {
        if (x1 - r1 < 0 && v1 < 0) {
          const nextV1 = -v1;
          externalImpulse += m1 * (nextV1 - v1);
          v1 = nextV1;
          x1 = r1;
          wallHit = true;
          justHitWall = true;
        }
        if (x2 + r2 > trackLen && v2 > 0) {
          const nextV2 = -v2;
          externalImpulse += m2 * (nextV2 - v2);
          v2 = nextV2;
          x2 = trackLen - r2;
          wallHit = true;
          justHitWall = true;
        }
      }

      if (x2 - x1 < minDist) {
        const mid = (x1 + x2) / 2;
        x1 = mid - minDist / 2;
        x2 = mid + minDist / 2;
      }
    }

    return Object.assign({}, state, {
      x1,
      x2,
      v1,
      v2,
      stuck,
      collided,
      wallHit,
      externalImpulse,
      lastCollision,
      justCollided,
      justHitWall,
      contactX
    });
  }

  /**
   * Compute impulse-time curve F(t) = F_peak * sin^2(pi * t / durationS)
   * so integral_0^dt F(t) dt = 0.5 * F_peak * durationS = J = m * v0 * (1 + e).
   */
  function computeImpulseCurve({
    massKg = 4,
    speedMs = 6,
    durationS = 0.14,
    restitution = 0,
    safeForceN = 250
  } = {}) {
    const m = Math.max(0.1, Number(massKg) || 4);
    const v0 = Math.max(0, Number(speedMs) || 0);
    const dt = Math.max(0.002, Number(durationS) || 0.14);
    const e = clamp(restitution == null ? 0 : Number(restitution), 0, 1);
    const limitN = Math.max(10, Number(safeForceN) || 250);

    const reboundSpeedMs = e * v0;
    const deltaV = v0 * (1 + e);
    const impulseNs = m * deltaV;
    const avgForceN = impulseNs / dt;
    const peakForceN = 2 * avgForceN;
    const peakG = (peakForceN / m) / G;
    const survives = peakForceN <= limitN;

    const keBeforeJ = 0.5 * m * v0 * v0;
    const keAfterJ = 0.5 * m * reboundSpeedMs * reboundSpeedMs;
    const keDissipatedJ = Math.max(0, keBeforeJ - keAfterJ);

    function forceAt(t) {
      if (t <= 0 || t >= dt) return 0;
      const s = Math.sin((Math.PI * t) / dt);
      return peakForceN * s * s;
    }

    function velocityAt(t) {
      if (t <= 0) return v0;
      if (t >= dt) return -reboundSpeedMs;
      // Integral of sin^2(pi u / dt) from 0 to t is 0.5 * (t - (dt/(2*pi)) * sin(2*pi*t/dt))
      const frac = (t - (dt / (2 * Math.PI)) * Math.sin((2 * Math.PI * t) / dt)) / dt;
      return v0 - deltaV * frac;
    }

    function samplePoints(count = 80) {
      const n = Math.max(2, Math.floor(count));
      const pts = [];
      for (let i = 0; i <= n; i += 1) {
        const t = (dt * i) / n;
        pts.push({ t, f: forceAt(t), v: velocityAt(t) });
      }
      return pts;
    }

    return {
      massKg: m,
      speedMs: v0,
      durationS: dt,
      restitution: e,
      safeForceN: limitN,
      reboundSpeedMs,
      deltaV,
      impulseNs,
      avgForceN,
      peakForceN,
      peakG,
      survives,
      keBeforeJ,
      keAfterJ,
      keDissipatedJ,
      forceAt,
      velocityAt,
      samplePoints
    };
  }

  /**
   * Compute exact 2D oblique disk-disk collision impulse along line of centers.
   */
  function compute2DCollision({
    m1 = 2,
    x1 = 0,
    y1 = 0,
    vx1 = 5,
    vy1 = 0,
    m2 = 2,
    x2 = 1,
    y2 = 0.5,
    vx2 = 0,
    vy2 = 0,
    e = 1
  } = {}) {
    const safeM1 = Math.max(0.05, Number(m1) || 2);
    const safeM2 = Math.max(0.05, Number(m2) || 2);
    const safeE = clamp(e == null ? 1 : Number(e), 0, 1);

    const dx = (Number(x2) || 0) - (Number(x1) || 0);
    const dy = (Number(y2) || 0) - (Number(y1) || 0);
    const dist = Math.hypot(dx, dy);
    const nx = dist > 1e-9 ? dx / dist : 1;
    const ny = dist > 1e-9 ? dy / dist : 0;

    const pxBefore = safeM1 * vx1 + safeM2 * vx2;
    const pyBefore = safeM1 * vy1 + safeM2 * vy2;
    const pMagBefore = Math.hypot(pxBefore, pyBefore);
    const keBefore = 0.5 * safeM1 * (vx1 * vx1 + vy1 * vy1) + 0.5 * safeM2 * (vx2 * vx2 + vy2 * vy2);

    const rvx = vx2 - vx1;
    const rvy = vy2 - vy1;
    const velAlongNormal = rvx * nx + rvy * ny;

    if (velAlongNormal > 0) {
      return {
        collided: false,
        vx1After: vx1,
        vy1After: vy1,
        vx2After: vx2,
        vy2After: vy2,
        pxBefore,
        pyBefore,
        pxAfter: pxBefore,
        pyAfter: pyBefore,
        pMagBefore,
        pMagAfter: pMagBefore,
        keBefore,
        keAfter: keBefore,
        keLostPct: 0,
        separationDeg: 0,
        normalX: nx,
        normalY: ny
      };
    }

    const invM1 = 1 / safeM1;
    const invM2 = 1 / safeM2;
    const j = (-(1 + safeE) * velAlongNormal) / (invM1 + invM2);

    const impulseX = j * nx;
    const impulseY = j * ny;

    const vx1After = vx1 - impulseX * invM1;
    const vy1After = vy1 - impulseY * invM1;
    const vx2After = vx2 + impulseX * invM2;
    const vy2After = vy2 + impulseY * invM2;

    const pxAfter = safeM1 * vx1After + safeM2 * vx2After;
    const pyAfter = safeM1 * vy1After + safeM2 * vy2After;
    const pMagAfter = Math.hypot(pxAfter, pyAfter);
    const keAfter =
      0.5 * safeM1 * (vx1After * vx1After + vy1After * vy1After) +
      0.5 * safeM2 * (vx2After * vx2After + vy2After * vy2After);
    const keLostPct = keBefore > 1e-9 ? Math.max(0, ((keBefore - keAfter) / keBefore) * 100) : 0;

    const speed1After = Math.hypot(vx1After, vy1After);
    const speed2After = Math.hypot(vx2After, vy2After);
    let separationDeg = 0;
    if (speed1After > 1e-6 && speed2After > 1e-6) {
      const cosTheta = clamp((vx1After * vx2After + vy1After * vy2After) / (speed1After * speed2After), -1, 1);
      separationDeg = (Math.acos(cosTheta) * 180) / Math.PI;
    }

    return {
      collided: true,
      vx1After,
      vy1After,
      vx2After,
      vy2After,
      pxBefore,
      pyBefore,
      pxAfter,
      pyAfter,
      pMagBefore,
      pMagAfter,
      keBefore,
      keAfter,
      keLostPct,
      separationDeg,
      normalX: nx,
      normalY: ny
    };
  }

  /**
   * Tsiolkovsky ideal rocket equation: dv = ve * ln(m0 / mCurrent).
   */
  function computeRocketBurn({ dryMassKg = 1000, fuelMassKg = 3000, exhaustSpeedMs = 3000, burnFraction = 1 } = {}) {
    const dry = Math.max(10, Number(dryMassKg) || 1000);
    const fuel = Math.max(0, Number(fuelMassKg) || 0);
    const ve = Math.max(10, Number(exhaustSpeedMs) || 3000);
    const frac = clamp(burnFraction == null ? 1 : Number(burnFraction), 0, 1);

    const initialMassKg = dry + fuel;
    const burnedFuelKg = fuel * frac;
    const currentMassKg = Math.max(dry, initialMassKg - burnedFuelKg);
    const massRatio = initialMassKg / currentMassKg;
    const deltaVMs = ve * Math.log(massRatio);

    return {
      initialMassKg,
      currentMassKg,
      burnedFuelKg,
      deltaVMs,
      massRatio
    };
  }

  /**
   * Discrete momentum-conserving exhaust pulse step.
   * Ejects pulseMassKg at relative speed exhaustSpeedMs behind the updated rocket velocity
   * so (nextMass * nextVx + pulseMass * pulseVx) === rocketMass * rocketVx identically.
   */
  function stepRocketPulse({ rocketMassKg = 4000, rocketVx = 0, pulseMassKg = 150, exhaustSpeedMs = 3000 } = {}) {
    const totalM = Math.max(10, Number(rocketMassKg) || 4000);
    const dm = clamp(Number(pulseMassKg) || 0, 0.01, totalM * 0.5);
    const ve = Math.max(10, Number(exhaustSpeedMs) || 3000);
    const vx = Number(rocketVx) || 0;

    const nextMassKg = totalM - dm;
    const deltaV = (dm / totalM) * ve;
    const nextVx = vx + deltaV;
    const pulseVx = nextVx - ve;
    const impulseNs = nextMassKg * deltaV;

    return {
      nextMassKg,
      nextVx,
      pulseMassKg: dm,
      pulseVx,
      deltaV,
      impulseNs
    };
  }

  /**
   * Special-relativistic momentum p = gamma * m * v and energy-momentum relation E^2 = (pc)^2 + (mc^2)^2.
   */
  function computeRelativisticMomentum({ massKg = 1, beta = 0 } = {}) {
    const m = Math.max(1e-30, Number(massKg) || 1);
    const b = clamp(Number(beta) || 0, 0, 0.999999999);
    const gamma = 1 / Math.sqrt(1 - b * b);
    const vMs = b * C;

    const pClassical = m * vMs;
    const pRelativistic = gamma * pClassical;
    const restEnergyJ = m * C * C;
    const totalEnergyJ = gamma * restEnergyJ;
    const keClassicalJ = 0.5 * m * vMs * vMs;
    const keRelativisticJ = (gamma - 1) * restEnergyJ;
    const pcJ = pRelativistic * C;
    const energyCheckJ = Math.hypot(pcJ, restEnergyJ);

    return {
      massKg: m,
      beta: b,
      gamma,
      vMs,
      pClassical,
      pRelativistic,
      ratio: gamma,
      restEnergyJ,
      totalEnergyJ,
      keClassicalJ,
      keRelativisticJ,
      pcJ,
      energyCheckJ
    };
  }

  const lhcProton = computeRelativisticMomentum({ massKg: PROTON_MASS_KG, beta: 0.999999991 });

  const MOMENTUM_BENCHMARKS = [
    {
      id: 'hummingbird',
      name: 'Hovering Hummingbird (burst flight)',
      category: 'everyday',
      massKg: 0.004,
      speedMs: 15,
      momentumKgMs: 0.004 * 15,
      keJ: 0.5 * 0.004 * 15 * 15,
      note: 'Tiny mass keeps momentum at 0.06 kg·m/s despite quick flight.'
    },
    {
      id: 'baseball',
      name: 'Major League Fastball',
      category: 'everyday',
      massKg: 0.145,
      speedMs: 42,
      momentumKgMs: 0.145 * 42,
      keJ: 0.5 * 0.145 * 42 * 42,
      note: 'Light ball moving fast: moderate momentum (6.09 kg·m/s) yet 128 J of kinetic energy.'
    },
    {
      id: 'bowling',
      name: 'Bowling Ball',
      category: 'everyday',
      massKg: 7.0,
      speedMs: 8.0,
      momentumKgMs: 56.0,
      keJ: 0.5 * 7.0 * 64,
      note: '9× the momentum of a fastball at less than a fifth of its speed — mass dominates p = mv.'
    },
    {
      id: 'sprinter',
      name: 'Olympic Sprinter',
      category: 'everyday',
      massKg: 75,
      speedMs: 10,
      momentumKgMs: 750,
      keJ: 0.5 * 75 * 100,
      note: 'Carries 750 kg·m/s of forward momentum; cleats must push Earth backward to accelerate.'
    },
    {
      id: 'car',
      name: 'Highway Compact Car (56 mph)',
      category: 'vehicles',
      massKg: 1400,
      speedMs: 25,
      momentumKgMs: 35000,
      keJ: 0.5 * 1400 * 625,
      note: 'Airbags and crumple zones stretch stopping Δt to survive this 35,000 N·s impulse.'
    },
    {
      id: 'train',
      name: 'Loaded Freight Train',
      category: 'vehicles',
      massKg: 4000000,
      speedMs: 12,
      momentumKgMs: 48000000,
      keJ: 0.5 * 4000000 * 144,
      note: 'Moving slower than a sprinter, yet 4,000 metric tons requires over a kilometer to brake.'
    },
    {
      id: 'saturn-v',
      name: 'Saturn V at Stage-1 Cutoff',
      category: 'vehicles',
      massKg: 750000,
      speedMs: 2300,
      momentumKgMs: 750000 * 2300,
      keJ: 0.5 * 750000 * 2300 * 2300,
      note: 'Every newton-second gained upward came from throwing 2,100 tons of hot gas downward.'
    },
    {
      id: 'lhc-proton',
      name: 'LHC Proton (0.999999991 c)',
      category: 'relativistic',
      massKg: PROTON_MASS_KG,
      speedMs: lhcProton.vMs,
      momentumKgMs: lhcProton.pRelativistic,
      keJ: lhcProton.keRelativisticJ,
      note: 'Relativistic γ ≈ 7,454 gives this single proton the momentum of a crawling bacterium — 7,454× classical mv.'
    }
  ];

  function findCollisionPreset(id) {
    return COLLISION_PRESETS.find(p => p.id === id) || COLLISION_PRESETS[0];
  }

  function findImpulseSurface(id) {
    return IMPULSE_SURFACES.find(s => s.id === id) || IMPULSE_SURFACES[0];
  }

  function findBilliardsPreset(id) {
    return BILLIARDS_PRESETS.find(p => p.id === id) || BILLIARDS_PRESETS[0];
  }

  return {
    C,
    G,
    PROTON_MASS_KG,
    COLLISION_PRESETS,
    IMPULSE_SURFACES,
    BILLIARDS_PRESETS,
    MOMENTUM_BENCHMARKS,
    RELATIVISTIC_LANDMARKS,
    clamp,
    findCollisionPreset,
    findImpulseSurface,
    findBilliardsPreset,
    compute1DCollision,
    computeRecoil,
    computeCenterOfMass,
    step1DAirTrack,
    computeImpulseCurve,
    compute2DCollision,
    computeRocketBurn,
    stepRocketPulse,
    computeRelativisticMomentum
  };
});
