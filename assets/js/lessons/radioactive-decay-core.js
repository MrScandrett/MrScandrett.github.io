(function (global, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    global.RadioactiveDecayCore = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  var SYMBOLS = [
    '',
    'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
    'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
    'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
    'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr',
    'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn',
    'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd',
    'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb',
    'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg',
    'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th',
    'Pa', 'U', 'Np', 'Pu', 'Am'
  ];

  var NAMES = [
    '',
    'hydrogen', 'helium', 'lithium', 'beryllium', 'boron', 'carbon', 'nitrogen', 'oxygen', 'fluorine', 'neon',
    'sodium', 'magnesium', 'aluminum', 'silicon', 'phosphorus', 'sulfur', 'chlorine', 'argon', 'potassium', 'calcium',
    'scandium', 'titanium', 'vanadium', 'chromium', 'manganese', 'iron', 'cobalt', 'nickel', 'copper', 'zinc',
    'gallium', 'germanium', 'arsenic', 'selenium', 'bromine', 'krypton', 'rubidium', 'strontium', 'yttrium', 'zirconium',
    'niobium', 'molybdenum', 'technetium', 'ruthenium', 'rhodium', 'palladium', 'silver', 'cadmium', 'indium', 'tin',
    'antimony', 'tellurium', 'iodine', 'xenon', 'cesium', 'barium', 'lanthanum', 'cerium', 'praseodymium', 'neodymium',
    'promethium', 'samarium', 'europium', 'gadolinium', 'terbium', 'dysprosium', 'holmium', 'erbium', 'thulium', 'ytterbium',
    'lutetium', 'hafnium', 'tantalum', 'tungsten', 'rhenium', 'osmium', 'iridium', 'platinum', 'gold', 'mercury',
    'thallium', 'lead', 'bismuth', 'polonium', 'astatine', 'radon', 'francium', 'radium', 'actinium', 'thorium',
    'protactinium', 'uranium', 'neptunium', 'plutonium', 'americium'
  ];

  var SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  var SUB = '₀₁₂₃₄₅₆₇₈₉';

  function mapDigits(n, glyphSet) {
    var s = String(n);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch === '-') out += glyphSet === SUP ? '⁻' : '₋';
      else if (ch === '+') out += glyphSet === SUP ? '⁺' : '₊';
      else out += glyphSet[+ch] || ch;
    }
    return out;
  }

  function toSup(n) { return mapDigits(n, SUP); }
  function toSub(n) { return mapDigits(n, SUB); }

  function symbolFor(z) { return SYMBOLS[z] || '?'; }
  function nameFor(z) { return NAMES[z] || 'unknown'; }

  function formatNuclide(z, a, tag) {
    return toSup(a) + (tag || '') + toSub(z) + symbolFor(z);
  }

  function formatLabel(z, a, tag) {
    return symbolFor(z) + '-' + a + (tag || '');
  }

  function formatFullName(z, a, tag) {
    var base = nameFor(z);
    return base.charAt(0).toUpperCase() + base.slice(1) + '-' + a + (tag || '');
  }

  var DECAY_MODES = {
    alpha: {
      key: 'alpha',
      symbol: 'α',
      name: 'alpha (α)',
      shortName: 'α alpha',
      color: '#ff7a94',
      emitted: '⁴₂He',
      emittedA: 4,
      emittedZ: 2,
      dZ: -2,
      dA: -4,
      dN: -2
    },
    'beta-': {
      key: 'beta-',
      symbol: 'β⁻',
      name: 'beta-minus (β⁻)',
      shortName: 'β⁻ beta',
      color: '#38bdf8',
      emitted: '⁰₋₁e + ν̄',
      emittedA: 0,
      emittedZ: -1,
      dZ: 1,
      dA: 0,
      dN: -1
    },
    'beta+': {
      key: 'beta+',
      symbol: 'β⁺',
      name: 'beta-plus (β⁺)',
      shortName: 'β⁺ positron',
      color: '#4fdc9a',
      emitted: '⁰₊₁e + ν',
      emittedA: 0,
      emittedZ: 1,
      dZ: -1,
      dA: 0,
      dN: 1
    },
    gamma: {
      key: 'gamma',
      symbol: 'γ',
      name: 'gamma (γ)',
      shortName: 'γ gamma',
      color: '#f6c35b',
      emitted: 'γ',
      emittedA: 0,
      emittedZ: 0,
      dZ: 0,
      dA: 0,
      dN: 0
    }
  };

  function stepDecay(z, a, mode) {
    var spec = DECAY_MODES[mode] || DECAY_MODES.gamma;
    var dz = z + spec.dZ;
    var da = a + spec.dA;
    return {
      z: dz,
      a: da,
      n: da - dz
    };
  }

  function formatEquation(parentZ, parentA, mode, tag) {
    var spec = DECAY_MODES[mode] || DECAY_MODES.gamma;
    var daughter = stepDecay(parentZ, parentA, mode);
    return formatNuclide(parentZ, parentA, tag) + ' → ' + formatNuclide(daughter.z, daughter.a) + ' + ' + spec.emitted;
  }

  function checkConservation(parentZ, parentA, mode) {
    var spec = DECAY_MODES[mode] || DECAY_MODES.gamma;
    var daughter = stepDecay(parentZ, parentA, mode);
    var sumA = daughter.a + spec.emittedA;
    var sumZ = daughter.z + spec.emittedZ;
    return {
      parentZ: parentZ,
      parentA: parentA,
      parentN: parentA - parentZ,
      daughterZ: daughter.z,
      daughterA: daughter.a,
      daughterN: daughter.n,
      emittedA: spec.emittedA,
      emittedZ: spec.emittedZ,
      balanced: sumA === parentA && sumZ === parentZ,
      validElement: daughter.z >= 1 && daughter.z < SYMBOLS.length && daughter.a >= daughter.z
    };
  }

  // Real stable and ultra-long-lived primordial nuclides [Z, N] across Z = 1..83
  var STABLE_NUCLIDES = [
    [1,0],[1,1],[2,1],[2,2],[3,3],[3,4],[4,5],[5,5],[5,6],[6,6],[6,7],[7,7],[7,8],
    [8,8],[8,9],[8,10],[9,10],[10,10],[10,11],[10,12],[11,12],[12,12],[12,13],[12,14],
    [13,14],[14,14],[14,15],[14,16],[15,16],[16,16],[16,17],[16,18],[16,20],
    [17,18],[17,20],[18,18],[18,20],[18,22],[19,20],[19,22],[20,20],[20,22],[20,23],[20,24],[20,26],
    [21,24],[22,24],[22,25],[22,26],[22,27],[22,28],[23,28],[24,26],[24,28],[24,29],[24,30],
    [25,30],[26,28],[26,30],[26,31],[26,32],[27,32],[28,30],[28,32],[28,33],[28,34],[28,36],
    [29,34],[29,36],[30,34],[30,36],[30,37],[30,38],[30,40],[31,38],[31,40],[32,38],[32,40],[32,41],[32,42],
    [33,42],[34,42],[34,43],[34,44],[34,46],[35,44],[35,46],[36,44],[36,46],[36,47],[36,48],[36,50],
    [37,48],[38,48],[38,49],[38,50],[39,50],[40,50],[40,51],[40,52],[40,54],[41,52],
    [42,50],[42,52],[42,53],[42,54],[42,55],[42,56],[44,52],[44,54],[44,55],[44,56],[44,57],[44,58],[44,60],
    [45,58],[46,56],[46,58],[46,59],[46,60],[46,62],[46,64],[47,60],[47,62],
    [48,60],[48,62],[48,63],[48,64],[48,66],[49,64],[50,62],[50,64],[50,66],[50,67],[50,68],[50,69],[50,70],[50,72],[50,74],
    [51,70],[51,72],[52,70],[52,72],[52,73],[52,74],[52,76],[53,74],[54,70],[54,72],[54,74],[54,75],[54,76],[54,77],[54,78],[54,80],[54,82],
    [55,78],[56,78],[56,79],[56,80],[56,81],[56,82],[57,82],[58,82],[58,84],[59,82],[60,82],[60,83],[60,85],[60,86],[60,88],
    [62,88],[62,90],[62,92],[63,88],[63,90],[64,90],[64,91],[64,92],[64,93],[64,94],[64,96],[65,94],
    [66,94],[66,95],[66,96],[66,97],[66,98],[67,98],[68,98],[68,99],[68,100],[68,102],[69,100],
    [70,100],[70,101],[70,102],[70,103],[70,104],[70,106],[71,104],[72,105],[72,106],[72,107],[72,108],[73,108],
    [74,108],[74,109],[74,110],[74,112],[75,110],[76,110],[76,112],[76,113],[76,114],[76,116],
    [77,114],[77,116],[78,116],[78,117],[78,118],[78,120],[79,118],[80,116],[80,118],[80,119],[80,120],[80,121],[80,122],[80,124],
    [81,122],[81,124],[82,122],[82,124],[82,125],[82,126],[83,126]
  ];

  function approxStabilityN(z) {
    return z + 0.006 * z * z;
  }

  var LAB_NUCLIDES = [
    { z: 92, a: 238, real: 'alpha', hl: '4.47 billion years', use: 'Geochronology of ancient rocks; start of the uranium decay series.' },
    { z: 95, a: 241, real: 'alpha', hl: '432 years', use: 'Ionization smoke detectors (a tiny sealed foil ionizes air in the chamber).' },
    { z: 88, a: 226, real: 'alpha', hl: '1,600 years', use: 'Isolated by Marie and Pierre Curie in 1898; decays into radon-222 gas.' },
    { z: 84, a: 210, real: 'alpha', hl: '138 days', use: 'High-activity alpha source used in industrial static eliminators.' },
    { z: 6,  a: 14,  real: 'beta-', hl: '5,730 years', use: 'Radiocarbon dating of once-living organic material up to ~50,000 years old.' },
    { z: 53, a: 131, real: 'beta-', hl: '8.02 days', use: 'Targeted thyroid cancer and hyperthyroidism therapy in nuclear medicine.' },
    { z: 27, a: 60,  real: 'beta-', hl: '5.27 years', use: 'Medical radiotherapy and sterilization of surgical equipment.', note: 'Daughter Ni-60* immediately releases two high-energy gamma rays.' },
    { z: 19, a: 40,  real: 'beta-', hl: '1.25 billion years', use: 'Potassium–argon dating of volcanic rock; occurs naturally in potassium-rich foods.', note: 'Main branch (~89%) is β⁻ to Ca-40; ~11% captures an electron or emits β⁺ to Ar-40.' },
    { z: 9,  a: 18,  real: 'beta+', hl: '110 minutes', use: 'Positron Emission Tomography (PET) scans in hospitals.' },
    { z: 11, a: 22,  real: 'beta+', hl: '2.60 years', use: 'Calibration positron source for physics and PET detectors.' },
    { z: 43, a: 99,  real: 'gamma', hl: '6.01 hours', tag: 'm', use: 'Most widely used medical gamma-imaging tracer worldwide.', note: 'Tc-99m is a metastable excited state; it drops to ground-state Tc-99 without changing element.' }
  ];

  function explainWrongMode(nuclide, chosenMode) {
    var n = nuclide.a - nuclide.z;
    if (nuclide.tag === 'm' && chosenMode !== 'gamma') {
      return 'Look for the "m" tag: this nucleus is in an excited metastable state, so it only needs to release energy as a gamma photon.';
    }
    if (chosenMode === 'alpha') {
      return nuclide.z <= 82
        ? 'Alpha decay mainly relieves repulsion in very heavy nuclei (Z > 82). This nucleus adjusts its neutron-to-proton balance instead.'
        : 'Although this nucleus is heavy, its listed primary path follows a different change in Z.';
    }
    if (chosenMode === 'beta-') {
      return n > nuclide.z
        ? 'Even with many neutrons, turning one into a proton is not this isotope’s main listed route.'
        : 'It sits on the proton-rich side (N ≤ Z), so turning a neutron into a proton would move it farther from stability.';
    }
    if (chosenMode === 'beta+') {
      return 'β⁺ helps proton-rich nuclei convert a proton into a neutron; this nuclide sits on the neutron-rich or heavy side.';
    }
    return 'Gamma emission only releases excess nuclear excitation energy (marked with * or m) without shifting Z or N.';
  }

  /* ---------- Half-life & Radiocarbon math ---------- */
  var C14_HALF_LIFE = 5730;

  function decayConstant(halfLife) {
    if (halfLife <= 0) return Infinity;
    return Math.LN2 / halfLife;
  }

  function expectedRemaining(n0, elapsed, halfLife) {
    if (elapsed <= 0) return n0;
    if (halfLife <= 0) return 0;
    return n0 * Math.pow(0.5, elapsed / halfLife);
  }

  function stepDecayProbability(dt, halfLife) {
    if (dt <= 0) return 0;
    if (halfLife <= 0) return 1;
    return 1 - Math.pow(0.5, dt / halfLife);
  }

  function activityRate(remaining, halfLife) {
    if (remaining <= 0 || halfLife <= 0) return 0;
    return remaining * decayConstant(halfLife);
  }

  function radiocarbonAge(percentRemaining) {
    if (percentRemaining <= 0) {
      return {
        percent: 0,
        halfLives: Infinity,
        ageYears: Infinity,
        reliable: false,
        outOfRange: true,
        warning: 'Less than ~0.1% C-14 remains after ~10 half-lives (~57,000 years). Radiocarbon dating cannot date specimens millions of years old — geologists use uranium-lead or potassium-argon clocks instead.'
      };
    }
    var pct = Math.min(100, Math.max(0.01, percentRemaining));
    var halfLives = Math.log(100 / pct) / Math.LN2;
    var ageYears = halfLives * C14_HALF_LIFE;
    var warning = '';
    if (pct <= 2) {
      warning = 'Near the detection limit (< 2% remaining): small contamination or measurement errors shift the calculated age significantly.';
    }
    return {
      percent: pct,
      halfLives: halfLives,
      ageYears: ageYears,
      reliable: pct > 2,
      outOfRange: false,
      warning: warning
    };
  }

  var C14_SPECIMENS = [
    { id: 'modern', label: 'Modern wood', pct: 100, note: 'Living or freshly cut tree (~0 yr).' },
    { id: 'scrolls', label: 'Dead Sea Scrolls', pct: 77.5, note: 'Ancient parchment (~2,100 yr ago).' },
    { id: 'otzi', label: 'Ötzi the Iceman', pct: 52.7, note: 'Alpine glacier mummy (~5,300 yr ago).' },
    { id: 'lascaux', label: 'Lascaux charcoal', pct: 12.8, note: 'Cave painting pigment (~17,000 yr ago).' },
    { id: 'mammoth', label: 'Woolly mammoth', pct: 1.6, note: 'Ice Age permafrost tusk (~34,200 yr ago).' },
    { id: 'dino', label: 'T. rex bone', pct: 0, note: '~66 million yr old — no measurable C-14 left.' }
  ];

  /* ---------- Multi-Chain Decay Series ---------- */
  var DECAY_CHAINS = {
    u238: {
      key: 'u238',
      title: 'Uranium-238 → Lead-206',
      subtitle: 'The 14-step uranium series (8 α, 6 β⁻), passing through radium-226 and radon-222 gas.',
      steps: [
        { z: 92, a: 238, hl: '4.47 billion years' },
        { z: 90, a: 234, mode: 'alpha', hl: '24.1 days' },
        { z: 91, a: 234, mode: 'beta-', hl: '1.17 minutes' },
        { z: 92, a: 234, mode: 'beta-', hl: '245,500 years' },
        { z: 90, a: 230, mode: 'alpha', hl: '75,380 years' },
        { z: 88, a: 226, mode: 'alpha', hl: '1,600 years' },
        { z: 86, a: 222, mode: 'alpha', hl: '3.82 days', gas: true, note: 'Radon-222 is a radioactive noble gas that can seep from bedrock into basements.' },
        { z: 84, a: 218, mode: 'alpha', hl: '3.10 minutes' },
        { z: 82, a: 214, mode: 'alpha', hl: '26.8 minutes' },
        { z: 83, a: 214, mode: 'beta-', hl: '19.9 minutes' },
        { z: 84, a: 214, mode: 'beta-', hl: '164 microseconds' },
        { z: 82, a: 210, mode: 'alpha', hl: '22.2 years' },
        { z: 83, a: 210, mode: 'beta-', hl: '5.01 days' },
        { z: 84, a: 210, mode: 'beta-', hl: '138 days' },
        { z: 82, a: 206, mode: 'alpha', hl: 'stable', stable: true }
      ]
    },
    th232: {
      key: 'th232',
      title: 'Thorium-232 → Lead-208',
      subtitle: 'The 10-step thorium series (6 α, 4 β⁻), starting with Earth’s most abundant primordial actinide.',
      steps: [
        { z: 90, a: 232, hl: '14.0 billion years' },
        { z: 88, a: 228, mode: 'alpha', hl: '5.75 years' },
        { z: 89, a: 228, mode: 'beta-', hl: '6.15 hours' },
        { z: 90, a: 228, mode: 'beta-', hl: '1.91 years' },
        { z: 88, a: 224, mode: 'alpha', hl: '3.63 days' },
        { z: 86, a: 220, mode: 'alpha', hl: '55.6 seconds', gas: true, note: 'Radon-220 ("thoron") is a short-lived noble gas isotope in the thorium series.' },
        { z: 84, a: 216, mode: 'alpha', hl: '0.145 seconds' },
        { z: 82, a: 212, mode: 'alpha', hl: '10.6 hours' },
        { z: 83, a: 212, mode: 'beta-', hl: '60.6 minutes' },
        { z: 84, a: 212, mode: 'beta-', hl: '0.30 microseconds', note: 'Main branch (~64%) from Bi-212 goes via β⁻ to Po-212, then immediately α to Pb-208.' },
        { z: 82, a: 208, mode: 'alpha', hl: 'stable', stable: true }
      ]
    },
    u235: {
      key: 'u235',
      title: 'Uranium-235 → Lead-207',
      subtitle: 'The 11-step actinium series (7 α, 4 β⁻), ending at stable lead-207.',
      steps: [
        { z: 92, a: 235, hl: '704 million years' },
        { z: 90, a: 231, mode: 'alpha', hl: '25.5 hours' },
        { z: 91, a: 231, mode: 'beta-', hl: '32,760 years' },
        { z: 89, a: 227, mode: 'alpha', hl: '21.8 years' },
        { z: 90, a: 227, mode: 'beta-', hl: '18.7 days' },
        { z: 88, a: 223, mode: 'alpha', hl: '11.4 days' },
        { z: 86, a: 219, mode: 'alpha', hl: '3.96 seconds', gas: true, note: 'Radon-219 ("actinon") is a brief gaseous step along the U-235 chain.' },
        { z: 84, a: 215, mode: 'alpha', hl: '1.78 milliseconds' },
        { z: 82, a: 211, mode: 'alpha', hl: '36.1 minutes' },
        { z: 83, a: 211, mode: 'beta-', hl: '2.14 minutes' },
        { z: 81, a: 207, mode: 'alpha', hl: '4.77 minutes', note: 'Bi-211 decays ~99.7% by alpha to Tl-207 before β⁻ to Pb-207.' },
        { z: 82, a: 207, mode: 'beta-', hl: 'stable', stable: true }
      ]
    }
  };

  function summarizeChainProgress(chainKey, stepIndex) {
    var chain = DECAY_CHAINS[chainKey] || DECAY_CHAINS.u238;
    var steps = chain.steps;
    var idx = Math.max(0, Math.min(steps.length - 1, stepIndex | 0));
    var alphaCount = 0;
    var betaCount = 0;
    for (var i = 1; i <= idx; i++) {
      if (steps[i].mode === 'alpha') alphaCount++;
      else if (steps[i].mode === 'beta-') betaCount++;
    }
    var first = steps[0];
    var current = steps[idx];
    return {
      chain: chain,
      stepIndex: idx,
      totalSteps: steps.length - 1,
      alphaCount: alphaCount,
      betaCount: betaCount,
      deltaA: current.a - first.a,
      deltaZ: current.z - first.z,
      prev: idx > 0 ? steps[idx - 1] : null,
      current: current,
      isStable: idx === steps.length - 1
    };
  }

  /* ---------- Shielding & Inverse-Square Physics ---------- */
  var SHIELD_MATERIALS = {
    air: { key: 'air', name: 'Air only', density: '0.0012 g/cm³', color: '#1b2b3d', alphaStopMm: 40, betaStopMm: 4000, hvlMm: 100000 },
    paper: { key: 'paper', name: 'Paper', density: '0.8 g/cm³', color: '#e8e2c8', alphaStopMm: 0.05, betaStopMm: 3.5, hvlMm: 140 },
    acrylic: { key: 'acrylic', name: 'Acrylic / Skin', density: '1.18 g/cm³', color: '#7dd3fc', alphaStopMm: 0.03, betaStopMm: 4.5, hvlMm: 95 },
    aluminum: { key: 'aluminum', name: 'Aluminum', density: '2.70 g/cm³', color: '#9fb0c4', alphaStopMm: 0.015, betaStopMm: 2.0, hvlMm: 45 },
    concrete: { key: 'concrete', name: 'Concrete', density: '2.35 g/cm³', color: '#7c8591', alphaStopMm: 0.02, betaStopMm: 2.5, hvlMm: 60 },
    lead: { key: 'lead', name: 'Lead', density: '11.34 g/cm³', color: '#556070', alphaStopMm: 0.005, betaStopMm: 0.6, hvlMm: 12 }
  };

  function singleShieldTransmission(mode, mat, thicknessMm) {
    if (mode === 'alpha') {
      if (mat.key === 'air') return 1;
      return thicknessMm >= mat.alphaStopMm ? 0 : Math.max(0, 1 - thicknessMm / mat.alphaStopMm);
    }
    if (mode === 'beta') {
      if (mat.key === 'air') return 1;
      if (thicknessMm >= mat.betaStopMm) return 0;
      var frac = thicknessMm / mat.betaStopMm;
      return Math.max(0, Math.pow(1 - frac, 1.5));
    }
    // gamma exponential attenuation: (1/2)^(x / HVL)
    if (mat.key === 'air') return 1;
    return Math.pow(0.5, thicknessMm / mat.hvlMm);
  }

  function computeTransmission(opts) {
    var radiation = opts.radiation || 'gamma';
    var mat = SHIELD_MATERIALS[opts.material] || SHIELD_MATERIALS.lead;
    var thicknessMm = Math.max(0, Number(opts.thicknessMm) || 0);
    var distanceM = Math.max(1, Number(opts.distanceM) || 1);
    var distanceFactor = 1 / (distanceM * distanceM);

    if (radiation === 'mixed') {
      var aShield = singleShieldTransmission('alpha', mat, thicknessMm);
      var bShield = singleShieldTransmission('beta', mat, thicknessMm);
      var gShield = singleShieldTransmission('gamma', mat, thicknessMm);
      var shieldFraction = (aShield + bShield + gShield) / 3;
      return {
        radiation: 'mixed',
        material: mat,
        thicknessMm: thicknessMm,
        distanceM: distanceM,
        distanceFactor: distanceFactor,
        shieldFraction: shieldFraction,
        combinedFraction: shieldFraction * distanceFactor,
        components: {
          alpha: aShield * distanceFactor,
          beta: bShield * distanceFactor,
          gamma: gShield * distanceFactor,
          alphaShield: aShield,
          betaShield: bShield,
          gammaShield: gShield
        },
        hvlCount: mat.key === 'air' ? 0 : thicknessMm / mat.hvlMm,
        stoppedByShield: shieldFraction === 0,
        explanation: 'A mixed beam separates by penetrating power: paper stops α, a few millimeters of aluminum stop β, and only thick dense shielding weakens γ.'
      };
    }

    var sFrac = singleShieldTransmission(radiation, mat, thicknessMm);
    var combined = sFrac * distanceFactor;
    var hvlCount = radiation === 'gamma' && mat.key !== 'air' ? thicknessMm / mat.hvlMm : 0;
    var explanation = '';
    if (radiation === 'alpha') {
      explanation = mat.key === 'air'
        ? 'No solid barrier: α particles travel unimpeded across the barrier slot, though in real air they only travel a few centimeters before capturing electrons.'
        : (sFrac === 0
          ? 'Stopped completely by ' + thicknessMm.toFixed(1) + ' mm of ' + mat.name.toLowerCase() + '. Heavy +2 α particles shed energy within micrometers.'
          : 'Partially slowed by ultra-thin barrier.');
    } else if (radiation === 'beta') {
      explanation = mat.key === 'air'
        ? 'No solid barrier: β particles pass through the open gap; increasing distance spreads them out by 1/d².'
        : (sFrac === 0
          ? 'Stopped completely by ' + thicknessMm.toFixed(1) + ' mm of ' + mat.name.toLowerCase() + ' (range ~' + mat.betaStopMm + ' mm).'
          : Math.round(sFrac * 100) + '% passes through ' + thicknessMm.toFixed(1) + ' mm of ' + mat.name.toLowerCase() + ' (full stop near ' + mat.betaStopMm + ' mm).');
    } else {
      explanation = mat.key === 'air'
        ? 'With no dense shield, gamma intensity falls only with distance (1/d²).'
        : 'Gamma intensity drops exponentially: ' + hvlCount.toFixed(2) + ' half-value layers of ' + mat.name.toLowerCase() + ' reduce the beam to ' + (sFrac * 100).toFixed(1) + '%.';
    }

    return {
      radiation: radiation,
      material: mat,
      thicknessMm: thicknessMm,
      distanceM: distanceM,
      distanceFactor: distanceFactor,
      shieldFraction: sFrac,
      combinedFraction: combined,
      hvlCount: hvlCount,
      stoppedByShield: sFrac === 0,
      explanation: explanation
    };
  }

  /* ---------- Interactive Practice Drill ---------- */
  var PRACTICE_PROBLEMS = [
    {
      id: 'ra226-alpha',
      kind: 'daughter',
      parentZ: 88,
      parentA: 226,
      mode: 'alpha',
      prompt: 'Radium-226 (Z = 88, A = 226) undergoes α decay. Enter the daughter nucleus A and Z.',
      hint: 'Alpha emission removes a ⁴₂He nucleus: subtract 4 from A and 2 from Z.'
    },
    {
      id: 'c14-betaminus',
      kind: 'daughter',
      parentZ: 6,
      parentA: 14,
      mode: 'beta-',
      prompt: 'Carbon-14 (Z = 6, A = 14) undergoes β⁻ decay. Enter the daughter nucleus A and Z.',
      hint: 'In β⁻ decay, a neutron turns into a proton: A stays the same, Z increases by 1.'
    },
    {
      id: 'f18-betaplus',
      kind: 'daughter',
      parentZ: 9,
      parentA: 18,
      mode: 'beta+',
      prompt: 'Fluorine-18 (Z = 9, A = 18, used in PET scans) undergoes β⁺ decay. Enter the daughter A and Z.',
      hint: 'In β⁺ decay, a proton turns into a neutron and emits a positron: A stays 18, Z drops by 1.'
    },
    {
      id: 'po210-alpha',
      kind: 'daughter',
      parentZ: 84,
      parentA: 210,
      mode: 'alpha',
      prompt: 'Polonium-210 (Z = 84, A = 210) emits an α particle. Enter the daughter A and Z.',
      hint: 'Z − 2 = 82 (lead), A − 4 = 206.'
    },
    {
      id: 'i131-betaminus',
      kind: 'daughter',
      parentZ: 53,
      parentA: 131,
      mode: 'beta-',
      prompt: 'Iodine-131 (Z = 53, A = 131) undergoes β⁻ decay. Enter the daughter A and Z.',
      hint: 'β⁻ turns a neutron into a proton: A stays 131, Z goes 53 + 1 = 54.'
    },
    {
      id: 'tc99m-gamma',
      kind: 'daughter',
      parentZ: 43,
      parentA: 99,
      tag: 'm',
      mode: 'gamma',
      prompt: 'Excited technetium-99m (Z = 43, A = 99) emits a γ photon. Enter the daughter A and Z.',
      hint: 'Gamma emission releases energy only; neither Z nor A changes.'
    },
    {
      id: 'mode-th234',
      kind: 'mode',
      parentZ: 90,
      parentA: 234,
      daughterZ: 91,
      daughterA: 234,
      answerMode: 'beta-',
      prompt: 'Thorium-234 (Z = 90, A = 234) turns into protactinium-234 (Z = 91, A = 234). Which decay mode occurred?',
      hint: 'Mass number A stayed 234 while proton number Z rose from 90 to 91.'
    },
    {
      id: 'mode-am241',
      kind: 'mode',
      parentZ: 95,
      parentA: 241,
      daughterZ: 93,
      daughterA: 237,
      answerMode: 'alpha',
      prompt: 'Americium-241 (Z = 95, A = 241) turns into neptunium-237 (Z = 93, A = 237). Which decay mode occurred?',
      hint: 'Z dropped by 2 and A dropped by 4 — the signature of an emitted ⁴₂He nucleus.'
    },
    {
      id: 'mode-na22',
      kind: 'mode',
      parentZ: 11,
      parentA: 22,
      daughterZ: 10,
      daughterA: 22,
      answerMode: 'beta+',
      prompt: 'Sodium-22 (Z = 11, A = 22) turns into neon-22 (Z = 10, A = 22). Which decay mode occurred?',
      hint: 'A stayed 22 while Z dropped by 1 (a proton turned into a neutron).'
    },
    {
      id: 'pb214-betaminus',
      kind: 'daughter',
      parentZ: 82,
      parentA: 214,
      mode: 'beta-',
      prompt: 'Lead-214 (Z = 82, A = 214) undergoes β⁻ decay along the uranium chain. Enter the daughter A and Z.',
      hint: 'A stays 214 and Z increases by 1 to 83 (bismuth).'
    }
  ];

  function checkPracticeAnswer(problem, input) {
    if (problem.kind === 'mode') {
      var chosen = input && input.mode;
      var okMode = chosen === problem.answerMode;
      var eq = formatEquation(problem.parentZ, problem.parentA, problem.answerMode);
      return {
        correct: okMode,
        equation: eq,
        message: okMode
          ? 'Correct: ' + eq + ' (' + DECAY_MODES[problem.answerMode].name + ').'
          : 'Not quite. Compare Z and A: ' + eq + ' (' + DECAY_MODES[problem.answerMode].name + ').'
      };
    }

    var expected = stepDecay(problem.parentZ, problem.parentA, problem.mode);
    var inA = Number(input && input.a);
    var inZ = Number(input && input.z);
    var ok = Number.isFinite(inA) && Number.isFinite(inZ) && inA === expected.a && inZ === expected.z;
    var eq2 = formatEquation(problem.parentZ, problem.parentA, problem.mode, problem.tag);
    return {
      correct: ok,
      expectedA: expected.a,
      expectedZ: expected.z,
      equation: eq2,
      message: ok
        ? 'Correct: ' + eq2 + ' → ' + formatFullName(expected.z, expected.a) + '.'
        : 'Expected A = ' + expected.a + ', Z = ' + expected.z + ' (' + formatFullName(expected.z, expected.a) + '). ' + eq2
    };
  }

  return {
    SYMBOLS: SYMBOLS,
    NAMES: NAMES,
    DECAY_MODES: DECAY_MODES,
    STABLE_NUCLIDES: STABLE_NUCLIDES,
    LAB_NUCLIDES: LAB_NUCLIDES,
    C14_HALF_LIFE: C14_HALF_LIFE,
    C14_SPECIMENS: C14_SPECIMENS,
    DECAY_CHAINS: DECAY_CHAINS,
    SHIELD_MATERIALS: SHIELD_MATERIALS,
    PRACTICE_PROBLEMS: PRACTICE_PROBLEMS,
    toSup: toSup,
    toSub: toSub,
    symbolFor: symbolFor,
    nameFor: nameFor,
    formatNuclide: formatNuclide,
    formatLabel: formatLabel,
    formatFullName: formatFullName,
    formatEquation: formatEquation,
    stepDecay: stepDecay,
    checkConservation: checkConservation,
    approxStabilityN: approxStabilityN,
    explainWrongMode: explainWrongMode,
    decayConstant: decayConstant,
    expectedRemaining: expectedRemaining,
    stepDecayProbability: stepDecayProbability,
    activityRate: activityRate,
    radiocarbonAge: radiocarbonAge,
    summarizeChainProgress: summarizeChainProgress,
    computeTransmission: computeTransmission,
    checkPracticeAnswer: checkPracticeAnswer
  };
}));
