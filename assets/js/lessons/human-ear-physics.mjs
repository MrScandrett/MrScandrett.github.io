/**
 * Pure acoustic relay & tonotopic cochlea model for the Human Ear lesson.
 * Kept DOM-free so Node tests and the browser lab share identical physics.
 */

export const FREQ_MIN = 200;
export const FREQ_MAX = 8000;
export const DB_MIN = 20;
export const DB_MAX = 90;

export function clamp(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, num));
}

/**
 * Normalized cochlear peak position in [0, 1].
 * 0 = base (stiff, high frequencies near 8000 Hz)
 * 1 = apex (flexible, low frequencies near 200 Hz)
 */
export function cochlearPlace(freqHz) {
  const clamped = clamp(freqHz, FREQ_MIN, FREQ_MAX);
  const ratio = Math.log(clamped / FREQ_MIN) / Math.log(FREQ_MAX / FREQ_MIN);
  return clamp(1 - ratio, 0, 1);
}

/**
 * Computes normalized stage amplitudes and teaching status across the ear relay.
 */
export function computeRelayState(options = {}) {
  const mode = options.mode === 'bone' ? 'bone' : 'air';
  const freqHz = Math.round(clamp(options.freqHz ?? 1000, FREQ_MIN, FREQ_MAX));
  const loudnessDb = Math.round(clamp(options.loudnessDb ?? 60, DB_MIN, DB_MAX));
  const blockage = Boolean(options.blockage);

  const dbNorm = (loudnessDb - DB_MIN) / (DB_MAX - DB_MIN);
  const inputAmp = Number((0.15 + dbNorm * 0.85).toFixed(4));

  let outerAmp = 0;
  let eardrumAmp = 0;
  let ossicleGain = 0;
  let boneAmp = 0;
  let cochleaAmp = 0;

  if (mode === 'air') {
    outerAmp = inputAmp;
    eardrumAmp = blockage ? Number((inputAmp * 0.14).toFixed(4)) : inputAmp;
    ossicleGain = blockage ? 0.18 : 1.0;
    cochleaAmp = Number((eardrumAmp * ossicleGain).toFixed(4));
  } else {
    boneAmp = Number((inputAmp * 0.88).toFixed(4));
    cochleaAmp = boneAmp;
  }

  const place = Number(cochlearPlace(freqHz).toFixed(4));
  const nerveRateHz = Math.round(cochleaAmp * 320);

  let regionLabel = 'Middle turn';
  if (place < 0.33) regionLabel = 'Base (stiff, high pitch)';
  else if (place > 0.67) regionLabel = 'Apex (flexible, low pitch)';

  let hearingStatus;
  if (mode === 'bone') {
    hearingStatus = blockage
      ? `Bone conduction bypasses the blocked outer and middle ear: skull vibrations drive the cochlea at ${Math.round(cochleaAmp * 100)}% strength (${freqHz} Hz peaks near the ${regionLabel.toLowerCase()}). This is how Beethoven felt his piano through a jawbone rod.`
      : `Bone conduction sends ${freqHz} Hz vibrations directly through skull bone to the cochlea (${Math.round(cochleaAmp * 100)}% fluid drive, ${nerveRateHz} impulses/s), skipping the eardrum and ossicles.`;
  } else if (blockage) {
    hearingStatus = `Middle-ear blockage damps the eardrum and ossicles: air conduction drops to ${Math.round(cochleaAmp * 100)}% at the cochlea (${nerveRateHz} impulses/s). Switch to Bone conduction to see how solid skull vibrations bypass this blockage.`;
  } else {
    hearingStatus = `Air conduction funnels ${freqHz} Hz waves down the ear canal, flexes the eardrum, and uses the ossicles (~20x pressure boost) to excite the cochlea's ${regionLabel.toLowerCase()} (${nerveRateHz} impulses/s).`;
  }

  return {
    mode,
    freqHz,
    loudnessDb,
    blockage,
    inputAmp,
    outerAmp,
    eardrumAmp,
    ossicleGain,
    boneAmp,
    cochleaAmp,
    place,
    regionLabel,
    nerveRateHz,
    hearingStatus
  };
}
