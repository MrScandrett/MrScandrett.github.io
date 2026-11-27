/**
 * Pure geological physics, coalification, kerogen cracking, trap geometry,
 * and deep-time comparison model for the Fossil Fuel Formation lesson.
 * Zero DOM dependencies so it can be unit-tested directly in Node.
 */

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

export const SCENARIOS = Object.freeze({
  'peat-bog': Object.freeze({
    id: 'peat-bog',
    label: 'Carboniferous Peat Bog',
    material: 'coal',
    depthM: 300,
    gradientCPerKm: 25,
    durationMyr: 15,
  }),
  'lignite-basin': Object.freeze({
    id: 'lignite-basin',
    label: 'Coastal Lignite Seam',
    material: 'coal',
    depthM: 1500,
    gradientCPerKm: 28,
    durationMyr: 40,
  }),
  'bituminous-basin': Object.freeze({
    id: 'bituminous-basin',
    label: 'Bituminous Coal Basin',
    material: 'coal',
    depthM: 2900,
    gradientCPerKm: 30,
    durationMyr: 120,
  }),
  'anthracite-fold': Object.freeze({
    id: 'anthracite-fold',
    label: 'Anthracite Fold Belt',
    material: 'coal',
    depthM: 4900,
    gradientCPerKm: 35,
    durationMyr: 220,
  }),
  'peak-oil': Object.freeze({
    id: 'peak-oil',
    label: 'Peak Oil Window',
    material: 'petroleum',
    depthM: 2800,
    gradientCPerKm: 30,
    durationMyr: 80,
  }),
  'deep-gas': Object.freeze({
    id: 'deep-gas',
    label: 'Deep Gas Window',
    material: 'petroleum',
    depthM: 4800,
    gradientCPerKm: 33,
    durationMyr: 100,
  }),
  'hot-rift-oil': Object.freeze({
    id: 'hot-rift-oil',
    label: 'Hot Rift Basin Oil',
    material: 'petroleum',
    depthM: 1900,
    gradientCPerKm: 44,
    durationMyr: 35,
  }),
  'overcooked-graphite': Object.freeze({
    id: 'overcooked-graphite',
    label: 'Overcooked Basement',
    material: 'petroleum',
    depthM: 5800,
    gradientCPerKm: 42,
    durationMyr: 200,
  }),
});

/**
 * Compute burial temperature, lithostatic pressure, thermal maturity (Ro%),
 * and material-specific phase/rank outputs.
 */
export function computeBurialState({
  material = 'coal',
  depthM = 1200,
  gradientCPerKm = 30,
  durationMyr = 60,
  surfaceTempC = 15,
} = {}) {
  const depth = clamp(Number(depthM) || 0, 0, 6000);
  const grad = clamp(Number(gradientCPerKm) || 30, 15, 45);
  const duration = clamp(Number(durationMyr) || 60, 1, 300);

  const depthKm = depth / 1000;
  const tempC = surfaceTempC + depthKm * grad;
  const pressureMPa = depthKm * 25.5;
  const pressureAtm = Math.round(pressureMPa * 9.8692);

  // Longer geologic cook time shifts maturation to slightly lower peak temperatures
  const timeBoostC = clamp(12 * Math.log10(duration / 50), -18, 12);
  const effectiveTempC = tempC + timeBoostC;
  const roPct = clamp(0.2 * Math.exp(0.0145 * Math.max(0, effectiveTempC - 15)), 0.18, 5.5);

  const base = {
    material: material === 'petroleum' ? 'petroleum' : 'coal',
    depthM: Math.round(depth),
    gradientCPerKm: Math.round(grad),
    durationMyr: Math.round(duration),
    tempC: Math.round(tempC),
    effectiveTempC: Math.round(effectiveTempC),
    timeBoostC: Math.round(timeBoostC),
    pressureMPa: Math.round(pressureMPa),
    pressureAtm,
    roPct: Number(roPct.toFixed(2)),
  };

  if (base.material === 'coal') {
    let stageId;
    let stageName;
    let zone;
    let subtitle;
    let statusText;
    let accentColor;
    let expulsionMode;

    if (effectiveTempC < 48) {
      stageId = 'peat';
      stageName = 'Peat';
      zone = 'Diagenesis';
      subtitle = 'Waterlogged woody debris; microbial decay halted by anoxia';
      statusText = 'Diagenesis: Shallow compaction squeezes out pore water';
      accentColor = '#fef08a';
      expulsionMode = 'water';
    } else if (effectiveTempC < 92) {
      stageId = 'lignite';
      stageName = 'Lignite (Brown Coal)';
      zone = 'Early Catagenesis';
      subtitle = 'Crumbly brown coal; moisture and oxygen driven down';
      statusText = 'Early Catagenesis: Dehydration & CO₂ release begin';
      accentColor = '#f59e0b';
      expulsionMode = 'water-co2';
    } else if (effectiveTempC < 165) {
      stageId = 'bituminous';
      stageName = 'Bituminous Coal';
      zone = 'Peak Catagenesis';
      subtitle = 'Dense banded black coal; releases coal-bed methane (CH₄)';
      statusText = 'Peak Catagenesis: Volatiles expelled; high heating value';
      accentColor = '#4ade80';
      expulsionMode = 'methane';
    } else if (effectiveTempC < 238) {
      stageId = 'anthracite';
      stageName = 'Anthracite (Hard Coal)';
      zone = 'Metagenesis';
      subtitle = 'Metamorphic hard coal, glassy luster, burns hot & clean';
      statusText = 'Metagenesis: Carbon rings fuse into dense sheets';
      accentColor = '#38bdf8';
      expulsionMode = 'methane';
    } else {
      stageId = 'graphite';
      stageName = 'Graphite (Overcooked)';
      zone = 'Thermal Metamorphism';
      subtitle = 'Pure mineral carbon lattice; fuel volatiles lost';
      statusText = 'Thermal Metamorphism: Graphitized beyond combustible coal';
      accentColor = '#f87171';
      expulsionMode = 'none';
    }

    const piecewise = (anchors) => {
      if (effectiveTempC <= anchors[0][0]) return anchors[0][1];
      for (let i = 1; i < anchors.length; i++) {
        const [t0, v0] = anchors[i - 1];
        const [t1, v1] = anchors[i];
        if (effectiveTempC <= t1) {
          return lerp(v0, v1, (effectiveTempC - t0) / (t1 - t0));
        }
      }
      return anchors[anchors.length - 1][1];
    };

    const carbonPct = Math.round(
      piecewise([
        [15, 52],
        [48, 60],
        [92, 74],
        [165, 89],
        [238, 96],
        [270, 99],
      ])
    );
    const moisturePct = Math.round(
      piecewise([
        [15, 82],
        [48, 48],
        [92, 20],
        [165, 4],
        [238, 1],
        [270, 0],
      ])
    );
    const volatilesPct = Math.round(
      piecewise([
        [15, 40],
        [48, 35],
        [92, 26],
        [165, 9],
        [238, 2],
        [270, 1],
      ])
    );
    const energyMJkg =
      stageId === 'graphite'
        ? 0
        : Number(
            piecewise([
              [15, 10.5],
              [48, 14.0],
              [92, 22.5],
              [165, 32.5],
              [238, 34.5],
            ]).toFixed(1)
          );
    const compactionThicknessM = Number(
      piecewise([
        [15, 10.0],
        [48, 4.2],
        [92, 1.9],
        [165, 0.85],
        [238, 0.65],
        [270, 0.55],
      ]).toFixed(2)
    );

    return {
      ...base,
      stageId,
      stageName,
      zone,
      subtitle,
      statusText,
      accentColor,
      expulsionMode,
      carbonPct,
      moisturePct,
      volatilesPct,
      energyMJkg,
      compactionThicknessM,
    };
  }

  // Petroleum kerogen cracking series
  let stageId;
  let stageName;
  let zone;
  let subtitle;
  let statusText;
  let accentColor;
  let expulsionMode;

  if (effectiveTempC < 60) {
    stageId = 'immature';
    stageName = 'Immature Kerogen';
    zone = 'Diagenesis';
    subtitle = 'Organic-rich black shale; waxy kerogen not yet cracked';
    statusText = 'Diagenesis: Kerogen polymers form, too cool for oil cracking';
    accentColor = '#94a3b8';
    expulsionMode = 'biogenic';
  } else if (effectiveTempC < 150) {
    stageId = 'oil';
    stageName = 'Oil Generation Window';
    zone = 'Catagenesis (Oil)';
    subtitle = 'Kerogen chains crack into liquid crude oil (~60–150 °C)';
    statusText = 'Oil Window Active: Liquid crude expels & migrates by buoyancy';
    accentColor = '#4ade80';
    expulsionMode = 'oil';
  } else if (effectiveTempC < 225) {
    stageId = 'gas';
    stageName = 'Natural Gas Window';
    zone = 'Late Catagenesis / Metagenesis';
    subtitle = 'Deep thermal cracking breaks oil into methane (CH₄) & wet gas';
    statusText = 'Gas Window Active: Lighter methane molecules rise rapidly';
    accentColor = '#38bdf8';
    expulsionMode = 'gas';
  } else {
    stageId = 'overcooked';
    stageName = 'Overcooked Source Rock';
    zone = 'Metamorphic Degradation';
    subtitle = 'Hydrocarbons destroyed; dead carbon residue remains as graphite';
    statusText = 'Past the Gas Floor: Too hot — hydrocarbons thermally destroyed';
    accentColor = '#f87171';
    expulsionMode = 'none';
  }

  // Smooth phase yield curve across effective temperature (sums to 100%)
  const oilRaw = Math.exp(-Math.pow((effectiveTempC - 108) / 36, 2));
  const gasRaw = Math.exp(-Math.pow((effectiveTempC - 184) / 34, 2));
  const kerogenRaw = clamp(1 - smoothStepModel(42, 115, effectiveTempC), 0.02, 1);
  const graphiteRaw = smoothStepModel(202, 260, effectiveTempC) * 1.15;
  const totalRaw = kerogenRaw + oilRaw + gasRaw + graphiteRaw;

  const kerogenPct = Math.round((kerogenRaw / totalRaw) * 100);
  const oilYieldPct = Math.round((oilRaw / totalRaw) * 100);
  const gasYieldPct = Math.round((gasRaw / totalRaw) * 100);
  const graphitePct = Math.max(0, 100 - kerogenPct - oilYieldPct - gasYieldPct);

  return {
    ...base,
    stageId,
    stageName,
    zone,
    subtitle,
    statusText,
    accentColor,
    expulsionMode,
    kerogenPct,
    oilYieldPct,
    gasYieldPct,
    graphitePct,
  };
}

function smoothStepModel(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Compute depth ranges (in meters, clamped to 0..6000) for each thermal zone
 * under a given geothermal gradient and burial duration.
 */
export function computeWindowDepths(
  material = 'petroleum',
  gradientCPerKm = 30,
  durationMyr = 60,
  surfaceTempC = 15
) {
  const grad = clamp(Number(gradientCPerKm) || 30, 15, 45);
  const duration = clamp(Number(durationMyr) || 60, 1, 300);
  const timeBoostC = clamp(12 * Math.log10(duration / 50), -18, 12);

  const depthForTemp = (targetT) =>
    clamp(Math.round(((targetT - surfaceTempC - timeBoostC) / grad) * 1000), 0, 6000);

  if (material === 'coal') {
    const t1 = depthForTemp(48);
    const t2 = depthForTemp(92);
    const t3 = depthForTemp(165);
    const t4 = depthForTemp(238);
    return [
      { id: 'peat', label: 'Peat', topM: 0, bottomM: t1, color: 'rgba(200, 154, 74, 0.16)' },
      { id: 'lignite', label: 'Lignite', topM: t1, bottomM: t2, color: 'rgba(245, 158, 11, 0.15)' },
      { id: 'bituminous', label: 'Bituminous', topM: t2, bottomM: t3, color: 'rgba(74, 222, 128, 0.14)' },
      { id: 'anthracite', label: 'Anthracite', topM: t3, bottomM: t4, color: 'rgba(56, 189, 248, 0.15)' },
      { id: 'graphite', label: 'Graphite', topM: t4, bottomM: 6000, color: 'rgba(248, 113, 113, 0.14)' },
    ];
  }

  const tOil = depthForTemp(60);
  const tGas = depthForTemp(150);
  const tOver = depthForTemp(225);
  return [
    { id: 'immature', label: 'Immature Kerogen', topM: 0, bottomM: tOil, color: 'rgba(148, 163, 184, 0.11)' },
    { id: 'oil', label: 'Oil Window', topM: tOil, bottomM: tGas, color: 'rgba(74, 222, 128, 0.17)' },
    { id: 'gas', label: 'Gas Window', topM: tGas, bottomM: tOver, color: 'rgba(56, 189, 248, 0.17)' },
    { id: 'overcooked', label: 'Overcooked', topM: tOver, bottomM: 6000, color: 'rgba(248, 113, 113, 0.14)' },
  ];
}

export const COAL_RANKS = Object.freeze([
  Object.freeze({
    id: 'peat',
    name: 'Peat',
    subtitle: 'Pre-Coal Organic Mat',
    thicknessFrom10m: 10.0,
    carbonPct: 55,
    moisturePct: 80,
    volatilesPct: 38,
    energyMJkg: 11,
    tempRange: '< 48 °C',
    depthRange: '0 – 0.9 km',
    uses: 'Soil conditioner, horticultural mulch, dried hearth fuel',
    description:
      'Spongy, waterlogged plant stems, mosses, and roots preserved in oxygen-poor wetlands. Because it is mostly water, peat has low heating value until dried.',
    swatchTop: '#8a7344',
    swatchBottom: '#4d3f23',
  }),
  Object.freeze({
    id: 'lignite',
    name: 'Lignite',
    subtitle: 'Brown Coal (Lowest Rank)',
    thicknessFrom10m: 3.5,
    carbonPct: 66,
    moisturePct: 38,
    volatilesPct: 31,
    energyMJkg: 16,
    tempRange: '48 – 92 °C',
    depthRange: '0.9 – 2.2 km',
    uses: 'Mine-mouth steam power generation',
    description:
      'Compacted and dehydrated brown coal with visible woody fragments. High moisture makes it crumbly and inefficient to ship long distances.',
    swatchTop: '#634828',
    swatchBottom: '#342312',
  }),
  Object.freeze({
    id: 'subbituminous',
    name: 'Sub-bituminous',
    subtitle: 'Dull Black Transitional Coal',
    thicknessFrom10m: 2.0,
    carbonPct: 74,
    moisturePct: 20,
    volatilesPct: 26,
    energyMJkg: 22,
    tempRange: '92 – 120 °C',
    depthRange: '2.2 – 3.0 km',
    uses: 'Baseload thermal electricity (often low-sulfur)',
    description:
      'Darker and harder than lignite with less moisture, commonly formed in thick Cretaceous and Cenozoic basins such as Wyoming’s Powder River Basin.',
    swatchTop: '#413326',
    swatchBottom: '#211a14',
  }),
  Object.freeze({
    id: 'bituminous',
    name: 'Bituminous',
    subtitle: 'Dense Black Coal',
    thicknessFrom10m: 1.1,
    carbonPct: 83,
    moisturePct: 8,
    volatilesPct: 19,
    energyMJkg: 29,
    tempRange: '120 – 165 °C',
    depthRange: '3.0 – 4.3 km',
    uses: 'Metallurgical coke for steelmaking, industrial boilers, power',
    description:
      'Banded, dense black coal with bright vitrain layers. Generates significant coal-bed methane (CH₄) during burial and packs more than twice peat’s energy density.',
    swatchTop: '#26211c',
    swatchBottom: '#100e0c',
  }),
  Object.freeze({
    id: 'anthracite',
    name: 'Anthracite',
    subtitle: 'Metamorphic Hard Coal',
    thicknessFrom10m: 0.7,
    carbonPct: 94,
    moisturePct: 3,
    volatilesPct: 5,
    energyMJkg: 34,
    tempRange: '165 – 238 °C',
    depthRange: '4.3 – 6.0 km',
    uses: 'Clean-burning heating, specialized filtration carbon, metallurgy',
    description:
      'Forged where mountain-building folds push coal seams deep into high heat and pressure. Semi-metallic luster, shell-like fracture, and an almost smokeless blue flame.',
    swatchTop: '#2d3138',
    swatchBottom: '#07080a',
  }),
]);

export const TRAP_TYPES = Object.freeze({
  anticline: Object.freeze({
    id: 'anticline',
    name: 'Anticline Arch',
    summary: 'Tectonic compression folds permeable sandstone into an upward arch beneath an impermeable shale cap.',
  }),
  fault: Object.freeze({
    id: 'fault',
    name: 'Fault Trap',
    summary: 'A geological fault slides a tilted porous reservoir against impermeable shale, sealing the up-dip edge.',
  }),
  'salt-dome': Object.freeze({
    id: 'salt-dome',
    name: 'Salt Dome',
    summary: 'Buoyant, impermeable rock salt pierces upward through strata, pinching and sealing reservoir flanks.',
  }),
  pinchout: Object.freeze({
    id: 'pinchout',
    name: 'Stratigraphic Pinchout',
    summary: 'An ancient river or beach sand lens tapers out laterally between sealing mudstones—no folding required.',
  }),
});

/**
 * Shared normalized trap geometry (x, y in [0, 1], top = 0, bottom = 1)
 * used identically by the Canvas renderer and drilling evaluator.
 */
export function getTrapProfile(trapId = 'anticline') {
  const id = TRAP_TYPES[trapId] ? trapId : 'anticline';

  if (id === 'anticline') {
    const resTop = (x) => 0.44 - 0.16 * Math.exp(-Math.pow((x - 0.5) / 0.24, 2));
    const sealTop = (x) => resTop(x) - 0.09;
    const resBottom = (x) => resTop(x) + 0.15;
    return {
      id,
      sealTop,
      sealBottom: resTop,
      resTop,
      resBottom,
      gocY: 0.345,
      owcY: 0.435,
      sourceY: 0.84,
      isSalt: () => false,
      isFaultSeal: () => false,
      isReservoir: (x, y) => y >= resTop(x) && y <= resBottom(x),
      suggestedOilWell: { x: 0.4, y: 0.39 },
    };
  }

  if (id === 'fault') {
    const faultX = 0.56;
    const resTop = (x) => (x < faultX ? 0.3 + (faultX - x) * 0.46 : 0.49 + (x - faultX) * 0.34);
    const sealTop = (x) => resTop(x) - 0.085;
    const resBottom = (x) => resTop(x) + 0.14;
    return {
      id,
      faultX,
      sealTop,
      sealBottom: resTop,
      resTop,
      resBottom,
      gocY: 0.365,
      owcY: 0.455,
      sourceY: 0.84,
      isSalt: () => false,
      isFaultSeal: (x, y) => x >= faultX && y >= 0.24 && y <= 0.72,
      isReservoir: (x, y) => x < faultX && y >= resTop(x) && y <= resBottom(x),
      suggestedOilWell: { x: 0.44, y: 0.415 },
    };
  }

  if (id === 'salt-dome') {
    const halfSaltWidth = (y) => (y < 0.24 ? 0 : clamp(0.06 + (y - 0.24) * 0.16, 0.05, 0.16));
    const isSalt = (x, y) => y >= 0.24 && Math.abs(x - 0.5) <= halfSaltWidth(y);
    const resTop = (x) => 0.52 - 0.18 * Math.exp(-Math.pow((Math.abs(x - 0.5) - 0.07) / 0.18, 2));
    const sealTop = (x) => resTop(x) - 0.08;
    const resBottom = (x) => resTop(x) + 0.14;
    return {
      id,
      sealTop,
      sealBottom: resTop,
      resTop,
      resBottom,
      gocY: 0.41,
      owcY: 0.495,
      sourceY: 0.85,
      isSalt,
      isFaultSeal: () => false,
      isReservoir: (x, y) => !isSalt(x, y) && y >= resTop(x) && y <= resBottom(x),
      suggestedOilWell: { x: 0.33, y: 0.46 },
    };
  }

  // Stratigraphic pinchout
  const xMin = 0.22;
  const xMax = 0.86;
  const resTop = (x) => 0.31 + (x - xMin) * 0.34;
  const thickness = (x) => {
    if (x <= xMin || x >= xMax) return 0;
    const u = (x - xMin) / (xMax - xMin);
    return 0.15 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.85);
  };
  const resBottom = (x) => resTop(x) + thickness(x);
  const sealTop = (x) => resTop(x) - 0.085;
  return {
    id: 'pinchout',
    xMin,
    xMax,
    sealTop,
    sealBottom: resTop,
    resTop,
    resBottom,
    gocY: 0.385,
    owcY: 0.465,
    sourceY: 0.84,
    isSalt: () => false,
    isFaultSeal: () => false,
    isReservoir: (x, y) => x > xMin && x < xMax && y >= resTop(x) && y <= resBottom(x),
    suggestedOilWell: { x: 0.42, y: 0.43 },
  };
}

/**
 * Evaluate drilling a test borehole at normalized coordinates (wellX, targetY).
 */
export function evaluateWellDrill({
  trapId = 'anticline',
  wellX = 0.42,
  targetY = 0.4,
  caprockIntact = true,
  porosityPct = 20,
} = {}) {
  const x = clamp(Number(wellX) || 0.5, 0.06, 0.94);
  const y = clamp(Number(targetY) || 0.4, 0.12, 0.92);
  const porosity = clamp(Number(porosityPct) || 20, 5, 32);
  const profile = getTrapProfile(trapId);
  const depthM = Math.round(y * 4200);

  if (profile.isSalt(x, y)) {
    return {
      outcome: 'salt',
      title: 'Halite Salt Core (Non-Porous)',
      detail: 'The drill bit hit solid evaporite rock salt. Salt is impermeable—try drilling the upturned sandstone flank beside the dome.',
      depthM,
      flowEstimate: '0 bbl/day',
    };
  }

  if (y >= profile.sourceY) {
    return {
      outcome: 'source',
      title: 'Organic Black Source Shale',
      detail: 'Hot, tight kerogen-rich shale. Hydrocarbons formed here, but permeability is too low for conventional flow without migration.',
      depthM,
      flowEstimate: 'Tight shale',
    };
  }

  if (profile.isReservoir(x, y)) {
    if (!caprockIntact) {
      return {
        outcome: 'seep',
        title: 'Depleted Reservoir (Leaked to Surface Seep)',
        detail: 'Without an intact impermeable caprock seal, buoyant oil and gas escaped upward through fractures, leaving residual brine.',
        depthM,
        flowEstimate: 'Residual trace',
      };
    }

    const flowFactor = porosity >= 22 ? 'High' : porosity >= 14 ? 'Moderate' : 'Low';
    if (y < profile.gocY) {
      return {
        outcome: 'gas',
        title: 'Natural Gas Cap Strike!',
        detail: `Lightest methane (CH₄) accumulated at the highest crest under the seal (${porosity}% pore space, ${flowFactor} permeability).`,
        depthM,
        flowEstimate: `${Math.round(porosity * 1.4)} MMcf/day`,
      };
    }
    if (y <= profile.owcY) {
      return {
        outcome: 'oil',
        title: 'Crude Oil Reservoir Strike!',
        detail: `Buoyant liquid oil pooled between the gas cap and denser brine water (${porosity}% sandstone porosity, ${flowFactor} flow).`,
        depthM,
        flowEstimate: `${Math.round(porosity * 145)} bbl/day`,
      };
    }
    return {
      outcome: 'brine',
      title: 'Saline Brine Aquifer',
      detail: 'Below the oil-water contact. Denser saltwater fills the lower pores of the sandstone—drill shallower or closer to the trap crest.',
      depthM,
      flowEstimate: 'Saltwater only',
    };
  }

  if (y >= profile.sealTop(x) && y < profile.sealBottom(x)) {
    return {
      outcome: 'seal',
      title: 'Impermeable Shale Caprock',
      detail: 'Microscopic clay plates block upward migration. Keep drilling deeper into the porous reservoir just underneath!',
      depthM,
      flowEstimate: 'Impermeable seal',
    };
  }

  return {
    outcome: 'overburden',
    title: 'Sedimentary Overburden / Carrier Rock',
    detail: 'Dry or water-wet strata outside the trapped hydrocarbon column. Aim inside the arched or fault-sealed sandstone layer.',
    depthM,
    flowEstimate: 'No trap',
  };
}

/**
 * Compare geologic formation time against human consumption span,
 * including Jeffrey Dukes (2003) "Burning Buried Sunshine" ancient biomass ratio.
 */
export function computeTimescaleComparison({
  formationMyr = 300,
  consumptionYears = 250,
} = {}) {
  const myr = clamp(Number(formationMyr) || 300, 10, 400);
  const burn = clamp(Number(consumptionYears) || 250, 50, 1000);
  const formationYears = myr * 1_000_000;
  const ratio = Math.round(formationYears / burn);

  // Compress formationYears into a 24-hour (86,400 s) clock
  const clockSeconds = 86400 * (burn / formationYears);
  const clockFormatted =
    clockSeconds >= 1
      ? `${clockSeconds.toFixed(2)} s`
      : `${(clockSeconds * 1000).toFixed(1)} ms`;

  // Jeffrey Dukes (2003): ~98 metric tons of ancient plant biomass per US gallon
  const biomassKgPerLiter = Math.round(98000 / 3.78541);
  const biomassTonsPerBarrel = Math.round(98 * 42);

  return {
    formationMyr: myr,
    consumptionYears: burn,
    ratio,
    clockSeconds,
    clockFormatted,
    biomassKgPerLiter,
    biomassTonsPerBarrel,
  };
}

export const MISSIONS = Object.freeze([
  Object.freeze({
    id: 'crack-oil',
    title: 'Hit Peak Oil',
    hint: 'Cook marine kerogen inside the 60–150 °C oil window.',
  }),
  Object.freeze({
    id: 'shift-window',
    title: 'Shift the Window',
    hint: 'Change geothermal gradient (≤20 or ≥40 °C/km) to move depth bands.',
  }),
  Object.freeze({
    id: 'forge-anthracite',
    title: 'Forge Anthracite',
    hint: 'Press land plants to ≥90% carbon metamorphic hard coal.',
  }),
  Object.freeze({
    id: 'overcook',
    title: 'Overcook to Graphite',
    hint: 'Push burial past the combustible ceiling (>238 °C).',
  }),
  Object.freeze({
    id: 'strike-oil',
    title: 'Strike Trapped Oil',
    hint: 'Drill into a crude oil column beneath an intact seal.',
  }),
]);

export function evaluateMissions(progress = {}) {
  const completedIds = MISSIONS.filter((m) => Boolean(progress[m.id])).map((m) => m.id);
  return {
    completedIds,
    count: completedIds.length,
    total: MISSIONS.length,
    items: MISSIONS.map((m) => ({
      ...m,
      completed: Boolean(progress[m.id]),
    })),
  };
}
