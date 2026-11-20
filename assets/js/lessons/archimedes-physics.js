/**
 * Archimedes' Principle — Pure Physics & Fluid Mechanics Engine
 * UMD module: works in browser (window.ArchimedesPhysics) and Node tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ArchimedesPhysics = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const G = 9.81; // m/s^2
  const ATM_KPA = 101.325;
  const GOLD_DENSITY = 19.30; // g/cm^3
  const SILVER_DENSITY = 10.49; // g/cm^3

  const FLUIDS = [
    {
      id: 'oil',
      name: 'Olive Oil',
      density: 0.92,
      viscosity: 0.35,
      color: 'rgba(234, 179, 8, 0.56)',
      deepColor: 'rgba(161, 98, 7, 0.80)',
      surfaceColor: 'rgba(254, 240, 138, 0.88)',
      liquidKind: 'oil',
      note: 'Olive oil (0.92 g/cm³) is less dense than water — ice (0.92 g/cm³) stays barely suspended or sinks!'
    },
    {
      id: 'water',
      name: 'Fresh Water',
      density: 1.00,
      viscosity: 0.08,
      color: 'rgba(56, 189, 248, 0.50)',
      deepColor: 'rgba(2, 132, 199, 0.78)',
      surfaceColor: 'rgba(224, 242, 254, 0.90)',
      liquidKind: 'water',
      note: 'Our standard reference fluid: 1.00 g/cm³ = 1.00 kg/L = 1,000 kg/m³.'
    },
    {
      id: 'seawater',
      name: 'Ocean Seawater',
      density: 1.03,
      viscosity: 0.09,
      color: 'rgba(20, 184, 166, 0.52)',
      deepColor: 'rgba(15, 118, 110, 0.80)',
      surfaceColor: 'rgba(204, 251, 241, 0.90)',
      liquidKind: 'water',
      note: 'Dissolved salts lift density to ~1.03 g/cm³, making cargo ships ride slightly higher than in rivers.'
    },
    {
      id: 'deadsea',
      name: 'Dead Sea Brine',
      density: 1.24,
      viscosity: 0.15,
      color: 'rgba(14, 165, 233, 0.56)',
      deepColor: 'rgba(7, 89, 133, 0.84)',
      surfaceColor: 'rgba(186, 230, 253, 0.92)',
      liquidKind: 'water',
      note: 'Extreme salinity (~1.24 g/cm³) buoys up eggs and human swimmers effortlessly.'
    },
    {
      id: 'honey',
      name: 'Honey',
      density: 1.42,
      viscosity: 0.92,
      color: 'rgba(245, 158, 11, 0.62)',
      deepColor: 'rgba(180, 83, 9, 0.88)',
      surfaceColor: 'rgba(254, 243, 199, 0.90)',
      liquidKind: 'honey',
      note: 'Dense (1.42 g/cm³) and viscous: objects experience strong buoyancy and heavy fluid drag.'
    },
    {
      id: 'mercury',
      name: 'Mercury',
      density: 13.55,
      viscosity: 0.14,
      color: 'rgba(169, 184, 196, 0.82)',
      deepColor: 'rgba(71, 85, 105, 0.96)',
      surfaceColor: 'rgba(241, 245, 249, 0.96)',
      liquidKind: 'mercury',
      note: 'Liquid metal at 13.55 g/cm³: solid granite and solid steel float high on top, while gold still sinks.'
    }
  ];

  const OBJECTS = [
    {
      id: 'cork',
      name: 'Cork',
      icon: '🍾',
      massKg: 0.25,
      volumeL: 1.00,
      density: 0.25,
      color: '#d4a96a',
      accent: '#854d0e',
      note: 'Cellular bark packed with trapped air — floats 75% above fresh water.'
    },
    {
      id: 'hollow-steel',
      name: 'Hollow Steel Cube',
      icon: '🚢',
      massKg: 0.45,
      volumeL: 1.00,
      density: 0.45,
      color: '#64748b',
      accent: '#334155',
      note: 'Made of steel (7.85 g/cm³) enclosing air, giving an average density of 0.45 g/cm³.'
    },
    {
      id: 'wood',
      name: 'Pine Wood',
      icon: '🪵',
      massKg: 0.55,
      volumeL: 1.00,
      density: 0.55,
      color: '#b47436',
      accent: '#713f12',
      note: 'Floats roughly halfway submerged (55%) in fresh water.'
    },
    {
      id: 'ice',
      name: 'Ice',
      icon: '🧊',
      massKg: 0.92,
      volumeL: 1.00,
      density: 0.92,
      color: '#bae6fd',
      accent: '#0284c7',
      note: 'Expanded hydrogen-bonded crystal sits 92% below the waterline in fresh water.'
    },
    {
      id: 'egg',
      name: 'Fresh Egg',
      icon: '🥚',
      massKg: 1.03,
      volumeL: 1.00,
      density: 1.03,
      color: '#fef3c7',
      accent: '#b45309',
      note: 'Sinks in tap water (1.00), hovers in seawater (1.03), and floats in Dead Sea brine (1.24).'
    },
    {
      id: 'granite',
      name: 'Granite Rock',
      icon: '🪨',
      massKg: 2.70,
      volumeL: 1.00,
      density: 2.70,
      color: '#9ca3af',
      accent: '#4b5563',
      note: 'Sinks in water and honey, yet floats high on liquid mercury (2.70 < 13.55).'
    },
    {
      id: 'steel',
      name: 'Solid Steel',
      icon: '⚙️',
      massKg: 7.85,
      volumeL: 1.00,
      density: 7.85,
      color: '#6e7c8c',
      accent: '#334155',
      note: 'Solid metal with zero air pockets — sinks in water, floats ~58% submerged in mercury.'
    },
    {
      id: 'gold',
      name: 'Pure Gold',
      icon: '🪙',
      massKg: 19.30,
      volumeL: 1.00,
      density: 19.30,
      color: '#facc15',
      accent: '#a16207',
      note: 'Denser than liquid mercury (19.30 > 13.55): pure gold sinks in every fluid in this lab.'
    }
  ];

  const REFERENCE_MATERIALS = [
    { id: 'cork', icon: '🍾', name: 'Cork', density: 0.25, massKg: 0.25, volumeL: 1.00, kind: 'object' },
    { id: 'hollow-steel', icon: '🚢', name: 'Hollow Steel Hull', density: 0.45, massKg: 0.45, volumeL: 1.00, kind: 'object' },
    { id: 'wood', icon: '🪵', name: 'Pine Wood', density: 0.55, massKg: 0.55, volumeL: 1.00, kind: 'object' },
    { id: 'gasoline', icon: '⛽', name: 'Gasoline', density: 0.70, massKg: 0.70, volumeL: 1.00, kind: 'custom' },
    { id: 'ice', icon: '🧊', name: 'Ice', density: 0.92, massKg: 0.92, volumeL: 1.00, kind: 'object' },
    { id: 'human', icon: '🏊', name: 'Human Body (avg)', density: 1.00, massKg: 1.00, volumeL: 1.00, kind: 'custom' },
    { id: 'egg', icon: '🥚', name: 'Fresh Egg', density: 1.03, massKg: 1.03, volumeL: 1.00, kind: 'object' },
    { id: 'granite', icon: '🪨', name: 'Granite Rock', density: 2.70, massKg: 2.70, volumeL: 1.00, kind: 'object' },
    { id: 'aluminum', icon: '🥫', name: 'Solid Aluminum', density: 2.70, massKg: 2.70, volumeL: 1.00, kind: 'custom' },
    { id: 'steel', icon: '⚙️', name: 'Solid Steel', density: 7.85, massKg: 7.85, volumeL: 1.00, kind: 'object' },
    { id: 'lead', icon: '⚓', name: 'Lead', density: 11.34, massKg: 11.34, volumeL: 1.00, kind: 'custom' },
    { id: 'gold', icon: '🪙', name: 'Pure Gold', density: 19.30, massKg: 19.30, volumeL: 1.00, kind: 'object' }
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Compute instantaneous forces, displacement, and equilibrium status for a submerged/floating object.
   */
  function computeTankState({ massKg, volumeL, fluidDensity, submergedFraction }) {
    const safeMass = Math.max(0.01, Number(massKg) || 0.01);
    const safeVol = Math.max(0.05, Number(volumeL) || 0.05);
    const safeFluid = Math.max(0.05, Number(fluidDensity) || 1.0);
    const sub = clamp(Number(submergedFraction) || 0, 0, 1);

    const density = safeMass / safeVol;
    const weightN = safeMass * G;
    const displacedVolumeL = safeVol * sub;
    const displacedMassKg = safeFluid * displacedVolumeL;
    const buoyantForceN = displacedMassKg * G;
    const apparentWeightN = Math.max(0, weightN - buoyantForceN);
    const normalForceN = Math.max(0, weightN - buoyantForceN);

    const isNeutral = Math.abs(density - safeFluid) < 0.005;
    let status = 'sink';
    if (isNeutral) status = 'neutral';
    else if (density < safeFluid) status = 'float';

    const eqSubmergedFraction = isNeutral
      ? 1
      : density < safeFluid
        ? clamp(density / safeFluid, 0, 1)
        : 1;

    return {
      density,
      weightN,
      displacedVolumeL,
      displacedMassKg,
      buoyantForceN,
      apparentWeightN,
      normalForceN,
      eqSubmergedFraction,
      status
    };
  }

  /**
   * Compute coupled submergence fraction and risen waterline height in one closed-form step.
   */
  function computeImmersionGeometry(y, blockH, waterTop, risePerLiter, volumeL) {
    const denom = Math.max(4, blockH - risePerLiter * volumeL);
    const submergedFraction = clamp((y + blockH / 2 - waterTop) / denom, 0, 1);
    const displacedVolumeL = volumeL * submergedFraction;
    const effectiveWaterTop = waterTop - risePerLiter * displacedVolumeL;
    return { submergedFraction, displacedVolumeL, effectiveWaterTop };
  }

  /**
   * Advance 1D vertical rigid-body motion inside the fluid tank.
   */
  function stepVerticalBody(state, params, dt) {
    const safeDt = clamp(Number(dt) || 0, 0, 0.04);
    const blockH = Math.max(12, Number(params.blockH) || 56);
    const waterTop = Number(params.waterTop) || 110;
    const tankBottom = Number(params.tankBottom) || 340;
    const risePerLiter = Math.max(0, Number(params.risePerLiter) || 0);
    const massKg = Math.max(0.01, Number(params.massKg) || 1.0);
    const volumeL = Math.max(0.05, Number(params.volumeL) || 1.0);
    const fluidDensity = Math.max(0.05, Number(params.fluidDensity) || 1.0);
    const viscosity = clamp(Number(params.viscosity) || 0.08, 0.02, 1.5);
    const pxPerMeter = Math.max(20, Number(params.pxPerMeter) || 55);

    const floorY = tankBottom - blockH / 2 - 4;
    const ceilingY = blockH / 2 + 8;

    let y = clamp(Number(state.y) || ceilingY, ceilingY, floorY);
    let vy = Number(state.vy) || 0;
    const wasInWater = Boolean(state.inWater);
    let justEnteredWater = false;
    let impactSpeed = 0;

    const substeps = 4;
    const subDt = safeDt / substeps;

    for (let i = 0; i < substeps; i += 1) {
      const geom = computeImmersionGeometry(y, blockH, waterTop, risePerLiter, volumeL);
      const tankState = computeTankState({
        massKg,
        volumeL,
        fluidDensity,
        submergedFraction: geom.submergedFraction
      });

      const netForceN = tankState.weightN - tankState.buoyantForceN;
      let accY = (netForceN / massKg) * pxPerMeter;

      if (geom.submergedFraction > 0) {
        // Viscous + wave-making drag scaled by fluid viscosity, submergence, and object inertia.
        const effectiveSub = Math.max(0.35, geom.submergedFraction);
        const linDrag = (2.8 + viscosity * 16.0) * effectiveSub / Math.max(0.35, Math.pow(massKg, 0.45));
        const quadDrag = (0.006 + viscosity * 0.018) * geom.submergedFraction;
        accY -= vy * linDrag + vy * Math.abs(vy) * quadDrag;
      } else {
        accY -= vy * 0.15; // slight air drag
      }

      vy += accY * subDt;
      y += vy * subDt;

      if (y >= floorY) {
        y = floorY;
        if (vy > 0) vy = 0;
      } else if (y < ceilingY) {
        y = ceilingY;
        if (vy < 0) vy = 0;
      }
    }

    const finalGeom = computeImmersionGeometry(y, blockH, waterTop, risePerLiter, volumeL);
    const inWater = finalGeom.submergedFraction > 0.02;
    if (!wasInWater && inWater && vy > 18) {
      justEnteredWater = true;
      impactSpeed = vy;
    }

    const onFloor = y >= floorY - 0.5 && vy >= -0.5;
    const tankState = computeTankState({
      massKg,
      volumeL,
      fluidDensity,
      submergedFraction: finalGeom.submergedFraction
    });

    return {
      y,
      vy,
      inWater,
      submergedFraction: finalGeom.submergedFraction,
      effectiveWaterTop: finalGeom.effectiveWaterTop,
      onFloor,
      justEnteredWater,
      impactSpeed,
      state: tankState
    };
  }

  /**
   * Compute King Hiero's crown alloy properties against a pure-gold reference of equal mass.
   */
  function computeCrownAlloy({ massG = 1000, goldFraction = 0.7, fluidDensity = 1.0 } = {}) {
    const safeMassG = Math.max(10, Number(massG) || 1000);
    const gf = clamp(Number(goldFraction), 0, 1);
    const sf = 1 - gf;
    const safeFluid = Math.max(0.1, Number(fluidDensity) || 1.0);

    const volumeCm3 = safeMassG * (gf / GOLD_DENSITY + sf / SILVER_DENSITY);
    const density = safeMassG / volumeCm3;
    const refVolumeCm3 = safeMassG / GOLD_DENSITY;
    const extraVolumeCm3 = volumeCm3 - refVolumeCm3;

    const airWeightN = (safeMassG / 1000) * G;
    const buoyantForceN = (safeFluid * volumeCm3 / 1000) * G;
    const apparentWeightN = Math.max(0, airWeightN - buoyantForceN);

    const refBuoyantForceN = (safeFluid * refVolumeCm3 / 1000) * G;
    const refApparentWeightN = Math.max(0, airWeightN - refBuoyantForceN);

    // Positive tilt tilts left side (pure gold reference) downward because it has larger apparent weight.
    const diffN = refApparentWeightN - apparentWeightN;
    const torqueBalanceDeg = clamp((diffN / Math.max(0.1, airWeightN)) * 180, -24, 24);
    const isPureGold = gf >= 0.995;

    return {
      massG: safeMassG,
      goldFraction: gf,
      silverFraction: sf,
      density,
      volumeCm3,
      refVolumeCm3,
      extraVolumeCm3,
      airWeightN,
      buoyantForceN,
      apparentWeightN,
      refBuoyantForceN,
      refApparentWeightN,
      torqueBalanceDeg,
      isPureGold
    };
  }

  /**
   * Recover pure-gold mass fraction (0..1) from a measured gold-silver alloy density.
   */
  function solveGoldFractionFromDensity(measuredDensity) {
    const rho = Math.max(0.1, Number(measuredDensity) || GOLD_DENSITY);
    const num = (1 / SILVER_DENSITY) - (1 / rho);
    const den = (1 / SILVER_DENSITY) - (1 / GOLD_DENSITY);
    return clamp(num / den, 0, 1);
  }

  /**
   * Compute steel ship hull displacement, draft, freeboard, and Plimsoll load status.
   */
  function computeShipHull({ hullMassTons = 500, hollowness = 0.75, cargoTons = 300, fluidDensity = 1.025 } = {}) {
    const safeHull = Math.max(10, Number(hullMassTons) || 500);
    const safeHollow = clamp(Number(hollowness), 0, 1);
    const safeCargo = Math.max(0, Number(cargoTons) || 0);
    const safeFluid = Math.max(0.5, Number(fluidDensity) || 1.025);

    const solidSteelVolumeM3 = safeHull / 7.85;
    const outerVolumeM3 = solidSteelVolumeM3 + Math.pow(safeHollow, 1.5) * 2136.31;
    const totalMassTons = safeHull + safeCargo;
    const avgDensity = totalMassTons / outerVolumeM3;
    const draftFraction = avgDensity / safeFluid;
    const freeboardPct = Math.max(0, (1 - draftFraction) * 100);
    const displacedTons = Math.min(totalMassTons, outerVolumeM3 * safeFluid);

    let status = 'safe';
    if (draftFraction >= 1.0) status = 'sunk';
    else if (draftFraction > 0.78) status = 'overloaded';

    return {
      outerVolumeM3,
      totalMassTons,
      avgDensity,
      draftFraction,
      freeboardPct,
      displacedTons,
      status
    };
  }

  /**
   * Compute submarine average density, buoyancy trim, and hydrostatic pressure at depth.
   */
  function computeSubmarine({ ballastPct = 48.8, depthM = 0, fluidDensity = 1.025 } = {}) {
    const dryMassTons = 1600;
    const hullVolumeM3 = 2000;
    const ballastCapacityM3 = 900;
    const safeBallast = clamp(Number(ballastPct) || 0, 0, 100);
    const safeDepth = Math.max(0, Number(depthM) || 0);
    const safeFluid = Math.max(0.5, Number(fluidDensity) || 1.025);

    const ballastMassTons = (safeBallast / 100) * ballastCapacityM3 * safeFluid;
    const totalMassTons = dryMassTons + ballastMassTons;
    const avgDensity = totalMassTons / hullVolumeM3;
    const netBuoyancyRatio = (safeFluid - avgDensity) / safeFluid;

    const pressureKPa = ATM_KPA + (safeFluid * 1000 * G * safeDepth) / 1000;
    const pressureAtm = pressureKPa / ATM_KPA;
    const neutralBallastPct = clamp(((hullVolumeM3 * safeFluid - dryMassTons) / (ballastCapacityM3 * safeFluid)) * 100, 0, 100);

    let state = 'negative';
    if (Math.abs(avgDensity - safeFluid) < 0.008) state = 'neutral';
    else if (avgDensity < safeFluid) state = 'positive';

    return {
      totalMassTons,
      avgDensity,
      netBuoyancyRatio,
      pressureKPa,
      pressureAtm,
      state,
      neutralBallastPct
    };
  }

  function findFluid(id) {
    return FLUIDS.find(f => f.id === id) || FLUIDS[1];
  }

  function findObject(id) {
    return OBJECTS.find(o => o.id === id) || OBJECTS[0];
  }

  return {
    G,
    ATM_KPA,
    GOLD_DENSITY,
    SILVER_DENSITY,
    FLUIDS,
    OBJECTS,
    REFERENCE_MATERIALS,
    clamp,
    findFluid,
    findObject,
    computeTankState,
    computeImmersionGeometry,
    stepVerticalBody,
    computeCrownAlloy,
    solveGoldFractionFromDensity,
    computeShipHull,
    computeSubmarine
  };
});
