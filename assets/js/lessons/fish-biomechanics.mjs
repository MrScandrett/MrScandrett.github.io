/**
 * Pure osmosis, gill countercurrent exchange, and flexible-tail propulsion
 * models for lessons/life-sciences/how-fish-work.html.
 */

export function clamp(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, num));
}

const OSMOSIS_DATA = {
  sea: {
    direction: '→',
    outwardDots: 9,
    inwardDots: 3,
    insideSaltDots: 3,
    outsideSaltDots: 10,
    summary: 'Fish → surrounding water. A marine bony fish loses water across its gills, drinks seawater, and pumps excess salt out through specialized gill cells.'
  },
  equal: {
    direction: '⇄',
    outwardDots: 6,
    inwardDots: 6,
    insideSaltDots: 6,
    outsideSaltDots: 6,
    summary: 'Fish ⇄ surrounding water. Water crosses both ways at the same average rate, so there is no net water gain or loss in this model.'
  },
  fresh: {
    direction: '←',
    outwardDots: 3,
    inwardDots: 9,
    insideSaltDots: 9,
    outsideSaltDots: 2,
    summary: 'Surrounding water → fish. A freshwater bony fish gains water across its gills, releases dilute urine, and actively takes up salts through its gills.'
  }
};

export function osmosisProfile(env = 'sea') {
  return OSMOSIS_DATA[env] || OSMOSIS_DATA.sea;
}

const GILL_DATA = {
  countercurrent: {
    mode: 'countercurrent',
    water: [90, 65, 40],
    blood: [75, 50, 25],
    finalBloodO2: 75,
    bloodLabel: '← Blood flows left (countercurrent)',
    note: 'Opposite flow maintains an oxygen gradient along the entire fold, letting blood reach 75.'
  },
  concurrent: {
    mode: 'concurrent',
    water: [90, 60, 50],
    blood: [10, 40, 50],
    finalBloodO2: 50,
    bloodLabel: 'Blood flows right → (concurrent)',
    note: 'Same-direction flow hits equilibrium at 50 halfway across the fold — diffusion stops and blood never passes 50.'
  }
};

export function gillProfile(mode = 'countercurrent') {
  return GILL_DATA[mode === 'concurrent' ? 'concurrent' : 'countercurrent'];
}

/**
 * Computes tail bending kinematics and propulsive efficiency for a given stroke
 * phase [0, 1] and normalized tail stiffness [0.15, 1.0].
 */
export function tailKinematics(phase01 = 0, stiffness = 0.55) {
  const s = clamp(stiffness, 0.15, 1.0);
  const phase = clamp(phase01, 0, 1) * Math.PI * 2;

  // Floppy tails lag behind the servo/muscle base; rigid tails move nearly in phase.
  const phaseLagRad = Number((1.35 * (1 - s)).toFixed(4));
  const baseAmp = 9;
  const tipAmp = 14 + (1 - s) * 14;
  const baseOffset = Number((baseAmp * Math.sin(phase)).toFixed(3));
  const tipOffset = Number((tipAmp * Math.sin(phase - phaseLagRad)).toFixed(3));

  // Intermediate stiffness (~0.55) produces optimal traveling-wave thrust;
  // overly floppy tails fold without pushing water, and rigid planks stall early.
  const optimal = 0.55;
  const diff = (s - optimal) / 0.36;
  const thrustScore = Math.round(clamp(94 * Math.exp(-(diff * diff)), 22, 98));
  const estimatedDistanceM = Number((0.75 + (thrustScore / 100) * 2.85).toFixed(2));

  let stiffnessLabel = 'Tuned flex';
  if (s < 0.36) stiffnessLabel = 'Too floppy';
  else if (s > 0.76) stiffnessLabel = 'Too rigid';

  return {
    stiffness: Number(s.toFixed(2)),
    phaseLagRad,
    baseOffset,
    tipOffset,
    thrustScore,
    estimatedDistanceM,
    stiffnessLabel
  };
}
