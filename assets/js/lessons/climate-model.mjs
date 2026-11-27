/**
 * Pure physics, energy-balance, local probe, and inquiry-mission model
 * for the Climate Modeling Simulator.
 */

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export const PRESETS = Object.freeze({
  iceage: Object.freeze({
    label: 'Ice Age (LGM)',
    co2: 190,
    solar: 98.5,
    ice: 100,
    deforest: 0,
    ch4: 380,
    ocean: 70,
  }),
  preindustrial: Object.freeze({
    label: 'Pre-industrial',
    co2: 280,
    solar: 100,
    ice: 100,
    deforest: 0,
    ch4: 722,
    ocean: 70,
  }),
  today: Object.freeze({
    label: 'Today',
    co2: 429,
    solar: 100,
    ice: 60,
    deforest: 30,
    ch4: 1930,
    ocean: 70,
  }),
  paris: Object.freeze({
    label: 'Paris path',
    co2: 450,
    solar: 100,
    ice: 50,
    deforest: 40,
    ch4: 2000,
    ocean: 70,
  }),
  bau: Object.freeze({
    label: 'Business as usual',
    co2: 700,
    solar: 100,
    ice: 20,
    deforest: 70,
    ch4: 3200,
    ocean: 55,
  }),
});

/**
 * Calibrated radiative-forcing and two-layer energy-balance climate response.
 * Accepts either (co2, solar, ice, deforest, ch4, ocean) or a state object.
 */
export function computeClimate(co2OrState, solar, ice, deforest, ch4, ocean) {
  const s = typeof co2OrState === 'object' && co2OrState !== null
    ? co2OrState
    : { co2: co2OrState, solar, ice, deforest, ch4, ocean };

  const C0 = 280;
  const M0 = 722;

  const co2Force = 5.35 * Math.log(Math.max(150, s.co2) / C0);
  const ch4Force = 0.036 * (Math.sqrt(Math.max(250, s.ch4)) - Math.sqrt(M0));
  // 1% TSI change at 340 W/m² TOA with ~0.30 albedo = 0.01 * 340 * 0.70 = 2.38 W/m²
  const solarForce = (s.solar - 100) * 2.38;
  const albedoForce = (100 - s.ice) * 0.012;
  const defoForce = s.deforest * 0.008;

  const rawForcing = co2Force + ch4Force + solarForce + albedoForce + defoForce;

  const oceanDamping = clamp(1 - 0.25 * (s.ocean / 70), 0.55, 1.0);
  const totalForcing = rawForcing * oceanDamping;

  const inertiaFactor = 1.0 - 0.50 * Math.pow(s.ocean / 100, 0.85);
  const feedbackAmp = rawForcing >= 0
    ? 1.0 + 0.068 * Math.max(0, rawForcing - 4.0)
    : 1.0 + 0.045 * Math.max(0, -rawForcing - 3.5);
  const tempAnomaly = clamp(totalForcing * 0.78 * inertiaFactor * feedbackAmp, -15, 15);

  let seaLevel;
  if (tempAnomaly >= 0) {
    const posTemp = tempAnomaly;
    const stericRise = posTemp * 0.14 * (0.65 + 0.35 * (s.ocean / 70));
    const meltRise = posTemp * 0.055 + Math.pow(Math.max(0, posTemp - 1.1), 1.65) * 0.16;
    seaLevel = clamp(stericRise + meltRise, 0, 15);
  } else {
    seaLevel = clamp(tempAnomaly * 1.4, -15, 0);
  }

  const oceanPH = clamp(8.18 - 0.66 * Math.log10(Math.max(150, s.co2) / C0), 7.5, 8.5);
  const iceLeft = clamp(s.ice - Math.max(0, tempAnomaly) * 3.2 - Math.min(0, tempAnomaly) * 2.5, 0, 100);

  return {
    co2Force,
    ch4Force,
    solarForce,
    albedoForce,
    defoForce,
    rawForcing,
    totalForcing,
    tempAnomaly,
    seaLevel,
    oceanPH,
    iceLeft,
  };
}

/**
 * Computes global mean planetary energy fluxes (W/m²) consistent with Figure 1.
 */
export function computeEnergyBudget(state, climate) {
  const incomingSolar = 340 * (state.solar / 100);
  const albedo = clamp(
    0.30 - (100 - state.ice) * 0.000353 + Math.max(0, -climate.tempAnomaly) * 0.012,
    0.18,
    0.58
  );
  const reflectedSolar = incomingSolar * albedo;
  const absorbedSolar = incomingSolar - reflectedSolar;
  const surfaceTempK = 287.15 + climate.tempAnomaly;
  const surfaceIR = 5.670374419e-8 * Math.pow(Math.max(180, surfaceTempK), 4);
  const netImbalance = climate.totalForcing;
  const outgoingIR = Math.max(60, absorbedSolar - netImbalance);
  const greenhouseTrapped = Math.max(0, surfaceIR - outgoingIR);
  const backRadiation = Math.max(80, 333 + (greenhouseTrapped - 147.5) * 1.15);

  return {
    incomingSolar,
    albedo,
    reflectedSolar,
    absorbedSolar,
    surfaceTempK,
    surfaceTempC: surfaceTempK - 273.15,
    surfaceIR,
    outgoingIR,
    greenhouseTrapped,
    backRadiation,
    netImbalance,
  };
}

/**
 * Computes localized surface anomaly and albedo at a clicked (lat, lon) coordinate,
 * matching the GPU Earth shader's Arctic/Antarctic and continental amplification.
 */
export function computeLocalProbe({ lat, lon, isLand, state, climate }) {
  const latNorm = clamp(lat / 90, -1, 1);
  const northPolar = smoothstep(0.35, 0.92, latNorm) * 1.05;
  const southPolar = smoothstep(0.45, 0.92, -latNorm) * 0.55;
  const polarAmp = 0.82 + northPolar + southPolar;
  const landAmp = isLand ? 1.24 : 0.88;
  const multiplier = polarAmp * landAmp;
  const localAnomaly = climate.tempAnomaly * multiplier;

  const iceLatDeg = clamp(75 - (state.ice / 100) * 25 + climate.tempAnomaly * 3.5, 5, 89);
  const isIceCovered = Math.abs(lat) >= iceLatDeg - (isLand ? 4.0 : 0);
  const surfaceType = isIceCovered
    ? (isLand ? 'Continental Ice / Snow' : 'Polar Sea Ice')
    : (isLand ? 'Continental Land' : 'Open Ocean');

  const localAlbedo = isIceCovered
    ? (isLand ? 0.78 : 0.62)
    : (isLand ? 0.22 + (state.deforest / 100) * 0.06 : 0.07);

  let note;
  if (Math.abs(lat) >= 60) {
    note = isIceCovered
      ? 'Bright polar ice reflects most sunlight, but snow/ice feedback amplifies local temperature shifts.'
      : 'Ice-free high latitudes absorb dark-surface solar heat, driving strong Arctic amplification.';
  } else if (isLand) {
    note = 'Continents have low heat capacity compared to oceans, warming and cooling ~35% faster.';
  } else {
    note = 'Open ocean absorbs >90% of incident sunlight and buffers temperature swings via deep mixing.';
  }

  return {
    lat,
    lon,
    isLand,
    isIceCovered,
    surfaceType,
    multiplier,
    localAnomaly,
    localAlbedo,
    note,
  };
}

export const MISSIONS = Object.freeze([
  Object.freeze({
    id: 'paris-rescue',
    title: 'Keep Warming Under +1.5°C',
    goal: 'Adjust greenhouse gases, ice, or forests to bring Temp Anomaly below +1.5°C while keeping Solar near 100% and CO₂ under 450 ppm.',
    hint: 'Try reducing CO₂ below 410 ppm, lowering CH₄, or restoring forest cover (Deforestation < 20%).',
  }),
  Object.freeze({
    id: 'snowball-earth',
    title: 'Trigger Deep Glaciation',
    goal: 'Cool the planet to −2.0°C or lower by combining reduced greenhouse gases or dimmer sunlight with high polar ice albedo.',
    hint: 'Click the Ice Age preset or drop CO₂ below 210 ppm, Solar below 99%, and raise Ice Cover to 100%.',
  }),
  Object.freeze({
    id: 'arctic-amp',
    title: 'Measure Polar Amplification',
    goal: 'Switch to Heat Map mode and click the globe to probe both a high-Arctic site (≥60°N) and a tropical site (within ±25°).',
    hint: 'Open the Heat Map tab, click Greenland or the Arctic Ocean, then click near the Equator.',
  }),
  Object.freeze({
    id: 'tipping-drift',
    title: 'Observe Coupled Feedback Drift',
    goal: 'Enable Coupled Feedback Drift while Temp Anomaly is above +1.8°C to watch permafrost CH₄ and ice retreat compound.',
    hint: 'Raise CO₂ or choose Business as usual, then toggle Coupled Feedback Drift to Active.',
  }),
]);

/**
 * Evaluates which inquiry missions have been completed (sticky once achieved).
 */
export function evaluateMissions({
  state,
  climate,
  mode,
  feedbackDriftEnabled,
  probedArctic,
  probedTropics,
  userInteracted = true,
  completedIds = new Set(),
}) {
  const next = new Set(completedIds);

  if (
    userInteracted &&
    climate.tempAnomaly < 1.5 &&
    state.solar >= 99.8 &&
    state.solar <= 100.2 &&
    state.co2 < 450
  ) {
    next.add('paris-rescue');
  }

  if (climate.tempAnomaly <= -2.0) {
    next.add('snowball-earth');
  }

  if (mode === 'temperature' && probedArctic && probedTropics) {
    next.add('arctic-amp');
  }

  if (feedbackDriftEnabled && climate.tempAnomaly > 1.8) {
    next.add('tipping-drift');
  }

  return next;
}
