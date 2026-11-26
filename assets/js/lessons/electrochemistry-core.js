(function (global, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    global.ElectrochemistryCore = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  var F = 96485.33212;
  var R_GAS = 8.314462618;

  var METALS = [
    {
      k: 'Mg', name: 'Magnesium', e: -2.37, n: 2, M: 24.305, rho: 1.74,
      metalColor: '#b8c4d0', metalHighlight: '#e2e8f0', metalDark: '#64748b',
      solColor: 'rgba(186, 230, 253, 0.14)', ionTint: '#93c5fd',
      note: 'Very active alkaline-earth metal; reacts even with warm water.'
    },
    {
      k: 'Al', name: 'Aluminum', e: -1.66, n: 3, M: 26.982, rho: 2.70,
      metalColor: '#cfd8e3', metalHighlight: '#f1f5f9', metalDark: '#94a3b8',
      solColor: 'rgba(186, 230, 253, 0.14)', ionTint: '#bae6fd',
      note: 'Protected in air by a thin oxide skin; smelted electrolytically (Hall–Héroult).'
    },
    {
      k: 'Zn', name: 'Zinc', e: -0.76, n: 2, M: 65.38, rho: 7.14,
      metalColor: '#7c8b9c', metalHighlight: '#b0bec5', metalDark: '#475569',
      solColor: 'rgba(186, 230, 253, 0.18)', ionTint: '#7dd3fc',
      note: 'Classic Daniell-cell anode and sacrificial coating on galvanized steel.'
    },
    {
      k: 'Fe', name: 'Iron', e: -0.44, n: 2, M: 55.845, rho: 7.87,
      metalColor: '#827b75', metalHighlight: '#b3aba4', metalDark: '#57534e',
      solColor: 'rgba(134, 239, 172, 0.28)', ionTint: '#86efac',
      note: 'Pale green Fe²⁺ solution; rusts when exposed to oxygen and moisture.'
    },
    {
      k: 'Ni', name: 'Nickel', e: -0.26, n: 2, M: 58.693, rho: 8.91,
      metalColor: '#a8b0b8', metalHighlight: '#dce2e8', metalDark: '#6b7280',
      solColor: 'rgba(52, 211, 153, 0.34)', ionTint: '#34d399',
      note: 'Emerald-green Ni²⁺ bath; widely plated for wear and corrosion resistance.'
    },
    {
      k: 'Sn', name: 'Tin', e: -0.14, n: 2, M: 118.71, rho: 7.31,
      metalColor: '#cbd5e1', metalHighlight: '#f1f5f9', metalDark: '#94a3b8',
      solColor: 'rgba(186, 230, 253, 0.16)', ionTint: '#cbd5e1',
      note: 'Used to plate steel food cans; just below hydrogen on the reduction ladder.'
    },
    {
      k: 'Pb', name: 'Lead', e: -0.13, n: 2, M: 207.2, rho: 11.34,
      metalColor: '#6b7280', metalHighlight: '#9ca3af', metalDark: '#374151',
      solColor: 'rgba(186, 230, 253, 0.16)', ionTint: '#9ca3af',
      note: 'Dense metal used in rechargeable Pb / PbO₂ lead–acid car batteries.'
    },
    {
      k: 'Cu', name: 'Copper', e: 0.34, n: 2, M: 63.546, rho: 8.96,
      metalColor: '#d97706', metalHighlight: '#fbbf24', metalDark: '#92400e',
      solColor: 'rgba(14, 165, 233, 0.44)', ionTint: '#38bdf8',
      note: 'Distinctive sky-blue Cu²⁺ ions; high conductivity makes it the standard cathode and wiring metal.'
    },
    {
      k: 'Ag', name: 'Silver', e: 0.80, n: 1, M: 107.868, rho: 10.49,
      metalColor: '#e2e8f0', metalHighlight: '#ffffff', metalDark: '#94a3b8',
      solColor: 'rgba(186, 230, 253, 0.16)', ionTint: '#f8fafc',
      note: 'Only 1 electron per ion (Ag⁺), so 1 mol e⁻ plates a full 107.9 g of silver.'
    },
    {
      k: 'Au', name: 'Gold', e: 1.50, n: 3, M: 196.967, rho: 19.30,
      metalColor: '#f59e0b', metalHighlight: '#fde68a', metalDark: '#b45309',
      solColor: 'rgba(253, 224, 71, 0.28)', ionTint: '#fde047',
      note: 'Highest E° here (+1.50 V); Au³⁺ ions pull electrons away from every other metal on the list.'
    }
  ];

  var METAL_MAP = {};
  for (var i = 0; i < METALS.length; i++) {
    METAL_MAP[METALS[i].k] = METALS[i];
  }

  var SHE_REFERENCE = {
    k: 'H₂',
    label: '2H⁺ / H₂ (SHE)',
    e: 0.00
  };

  var SUP_DIGITS = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '-': '⁻', '+': '⁺'
  };

  function toSup(val) {
    var s = String(val);
    var out = '';
    for (var idx = 0; idx < s.length; idx++) {
      out += SUP_DIGITS[s.charAt(idx)] || s.charAt(idx);
    }
    return out;
  }

  function getMetal(key) {
    return METAL_MAP[key] || METALS[2]; // default Zn
  }

  function gcd(a, b) {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b !== 0) {
      var t = b;
      b = a % b;
      a = t;
    }
    return a || 1;
  }

  function lcm(a, b) {
    return Math.abs(a * b) / gcd(a, b);
  }

  function ionFormula(metalOrKey) {
    var m = typeof metalOrKey === 'string' ? getMetal(metalOrKey) : metalOrKey;
    return m.k + (m.n === 1 ? '' : toSup(m.n)) + '⁺';
  }

  function formatSignedV(v, digits) {
    var d = digits == null ? 2 : digits;
    var rounded = Number(v.toFixed(d));
    if (Math.abs(rounded) < Math.pow(10, -d) * 0.5) return '0.' + '0'.repeat(d) + ' V';
    return (rounded > 0 ? '+' : '−') + Math.abs(rounded).toFixed(d) + ' V';
  }

  function formatConc(c) {
    var val = Math.max(1e-5, Number(c) || 1);
    if (val >= 0.995) return val.toFixed(2) + ' M';
    if (val >= 0.095) return val.toFixed(2) + ' M';
    if (val >= 0.0095) return val.toFixed(3) + ' M';
    var exp = Math.floor(Math.log10(val));
    var mant = val / Math.pow(10, exp);
    return mant.toFixed(1) + '×10' + toSup(exp) + ' M';
  }

  function formatScientificFromLog10(log10Val) {
    if (!isFinite(log10Val)) return '∞';
    if (Math.abs(log10Val) < 3) {
      var direct = Math.pow(10, log10Val);
      if (direct >= 100) return direct.toFixed(0);
      if (direct >= 10) return direct.toFixed(1);
      if (direct >= 1) return direct.toFixed(2);
      if (direct >= 0.01) return direct.toFixed(3);
    }
    var exp = Math.floor(log10Val);
    var mant = Math.pow(10, log10Val - exp);
    if (mant >= 9.95) {
      mant /= 10;
      exp += 1;
    }
    return mant.toFixed(2) + ' × 10' + toSup(exp);
  }

  function cellNotation(left, right, cLeft, cRight) {
    var L = typeof left === 'string' ? getMetal(left) : left;
    var R = typeof right === 'string' ? getMetal(right) : right;
    return L.k + '(s) | ' + ionFormula(L) + '(' + formatConc(cLeft) + ') || ' +
      ionFormula(R) + '(' + formatConc(cRight) + ') | ' + R.k + '(s)';
  }

  function halfReactionOx(metal, coeff) {
    var c = coeff === 1 ? '' : coeff + ' ';
    var e = coeff * metal.n;
    return c + metal.k + '(s) → ' + c + ionFormula(metal) + '(aq) + ' + e + 'e⁻';
  }

  function halfReactionRed(metal, coeff) {
    var c = coeff === 1 ? '' : coeff + ' ';
    var e = coeff * metal.n;
    return c + ionFormula(metal) + '(aq) + ' + e + 'e⁻ → ' + c + metal.k + '(s)';
  }

  function analyzeCell(opts) {
    opts = opts || {};
    var L = getMetal(opts.leftKey || 'Zn');
    var R = getMetal(opts.rightKey || 'Cu');
    var cLeft = Math.max(1e-4, Math.min(3.5, Number(opts.cLeft != null ? opts.cLeft : 1)));
    var cRight = Math.max(1e-4, Math.min(3.5, Number(opts.cRight != null ? opts.cRight : 1)));
    var tempC = Math.max(0, Math.min(100, Number(opts.tempC != null ? opts.tempC : 25)));
    var tempK = tempC + 273.15;
    var switchClosed = opts.switchClosed !== false;
    var saltBridge = opts.saltBridge !== false;
    var mode = opts.mode === 'electrolytic' ? 'electrolytic' : 'galvanic';
    var appliedV = Math.max(0, Number(opts.appliedV != null ? opts.appliedV : 0));

    var isConcentrationCell = L.k === R.k;
    var n = isConcentrationCell ? L.n : lcm(L.n, R.n);
    var a = isConcentrationCell ? 1 : n / L.n;
    var b = isConcentrationCell ? 1 : n / R.n;

    var e0 = isConcentrationCell ? 0 : Number((R.e - L.e).toFixed(4));
    var Q = isConcentrationCell ? (cLeft / cRight) : (Math.pow(cLeft, a) / Math.pow(cRight, b));
    var log10Q = Math.log10(Q);
    var nernstSlope = (R_GAS * tempK * Math.LN10) / (n * F);
    var E = e0 - nernstSlope * log10Q;

    var deltaG0_kJ = (-n * F * e0) / 1000;
    var deltaG_kJ = (-n * F * E) / 1000;
    var log10K = e0 / nernstSlope;
    var kFormatted = isConcentrationCell ? '1.00' : formatScientificFromLog10(log10K);

    // Spontaneous galvanic direction: +1 means Left -> Right (Left oxidized, Right reduced),
    // -1 means Right -> Left (Right oxidized, Left reduced), 0 means equilibrium.
    var spontaneousDir = E > 0.0005 ? 1 : (E < -0.0005 ? -1 : 0);

    var flowDir = 0;
    var currentActive = false;
    var measuredV = E;
    var status = 'equilibrium';
    var anodeSide = spontaneousDir === -1 ? 'right' : 'left';
    var cathodeSide = anodeSide === 'left' ? 'right' : 'left';
    var minAppliedV = Math.abs(E);
    var netOverpotential = 0;

    if (!saltBridge) {
      measuredV = 0;
      flowDir = 0;
      currentActive = false;
      status = 'no-bridge';
    } else if (mode === 'galvanic') {
      measuredV = E;
      if (!switchClosed) {
        flowDir = 0;
        currentActive = false;
        status = 'open-switch';
      } else if (spontaneousDir === 0) {
        flowDir = 0;
        currentActive = false;
        status = 'equilibrium';
      } else {
        flowDir = spontaneousDir;
        currentActive = true;
        status = isConcentrationCell
          ? 'concentration'
          : (spontaneousDir === 1 ? 'spontaneous' : 'reversed');
      }
    } else {
      // Electrolytic mode drives electrons AGAINST the spontaneous direction.
      // If E >= 0 (spontaneous was Left -> Right), power supply forces Right -> Left (dir = -1),
      // so Right becomes the anode (+, oxidation) and Left becomes the cathode (-, reduction).
      var targetDir = E >= 0 ? -1 : 1;
      anodeSide = targetDir === 1 ? 'left' : 'right';
      cathodeSide = targetDir === 1 ? 'right' : 'left';
      measuredV = appliedV;
      netOverpotential = Math.max(0, appliedV - minAppliedV);

      if (!switchClosed) {
        flowDir = 0;
        currentActive = false;
        status = 'open-switch';
      } else if (appliedV > minAppliedV + 0.001) {
        flowDir = targetDir;
        currentActive = true;
        status = 'electrolytic-active';
      } else {
        flowDir = 0;
        currentActive = false;
        status = 'electrolytic-insufficient';
      }
    }

    var actualAnode = anodeSide === 'left' ? L : R;
    var actualCathode = cathodeSide === 'left' ? L : R;
    var anodeCoeff = anodeSide === 'left' ? a : b;
    var cathodeCoeff = cathodeSide === 'left' ? a : b;

    var equation;
    if (isConcentrationCell && spontaneousDir === 0 && mode === 'galvanic') {
      equation = L.k + '(s) + ' + ionFormula(L) + '(' + formatConc(cRight) + ') ⇌ ' +
        ionFormula(L) + '(' + formatConc(cLeft) + ') + ' + L.k + '(s)  (equilibrium)';
    } else if (isConcentrationCell) {
      var concLow = anodeSide === 'left' ? cLeft : cRight;
      var concHigh = cathodeSide === 'left' ? cLeft : cRight;
      equation = actualAnode.k + '(s) + ' + ionFormula(actualCathode) + '(' + formatConc(concHigh) + ') → ' +
        ionFormula(actualAnode) + '(' + formatConc(concLow) + ') + ' + actualCathode.k + '(s)  (' + n + ' e⁻)';
    } else {
      var ac = anodeCoeff === 1 ? '' : anodeCoeff + ' ';
      var cc = cathodeCoeff === 1 ? '' : cathodeCoeff + ' ';
      equation = ac + actualAnode.k + '(s) + ' + cc + ionFormula(actualCathode) + '(aq) → ' +
        ac + ionFormula(actualAnode) + '(aq) + ' + cc + actualCathode.k + '(s)  (' + n + ' e⁻)';
    }

    var anodeHalf = halfReactionOx(actualAnode, anodeCoeff);
    var cathodeHalf = halfReactionRed(actualCathode, cathodeCoeff);

    var summary;
    if (status === 'no-bridge') {
      summary = 'Salt bridge removed: without NO₃⁻ and K⁺ counter-ions balancing the solutions, charge builds up at once and electron flow stops (0.00 V).';
    } else if (status === 'open-switch') {
      summary = 'Switch is open: open-circuit potential is ' + formatSignedV(E) +
        (mode === 'electrolytic' ? ' (need > ' + minAppliedV.toFixed(2) + ' V to drive electrolysis)' : '') +
        ', but no electrons can travel through the wire.';
    } else if (status === 'concentration') {
      summary = 'Concentration cell: both electrodes are ' + L.k + ' (E° = 0.00 V), yet the concentration ratio Q = ' +
        Q.toExponential(2) + ' drives ' + actualAnode.k + ' in the dilute beaker (' + formatConc(anodeSide === 'left' ? cLeft : cRight) +
        ') to dissolve while ions in the concentrated beaker plate out until both match.';
    } else if (status === 'spontaneous') {
      summary = 'Spontaneous galvanic cell (E = ' + formatSignedV(E) + '): ' + L.k + ' has the lower reduction potential, so it acts as the (−) anode and sends electrons through the wire to ' + R.k + ' (+ cathode).';
    } else if (status === 'reversed') {
      summary = 'Negative cell readout (' + formatSignedV(E) + '): ' + R.k + ' holds electrons more loosely than ' + L.k +
        ', so electrons spontaneously flow right → left (' + R.k + ' is the anode, ' + L.k + ' is the cathode).';
    } else if (status === 'electrolytic-active') {
      summary = 'Electrolysis active! Supplying ' + appliedV.toFixed(2) + ' V overcomes the opposing cell potential (' +
        minAppliedV.toFixed(2) + ' V) and forces electrons toward ' + actualCathode.k + ' (− cathode), plating ' +
        actualCathode.k + ' while oxidizing ' + actualAnode.k + ' (+ anode).';
    } else if (status === 'electrolytic-insufficient') {
      summary = 'Applied voltage (' + appliedV.toFixed(2) + ' V) is not enough to overcome the opposing spontaneous potential (' +
        minAppliedV.toFixed(2) + ' V). Raise the DC supply above ' + minAppliedV.toFixed(2) + ' V to drive electrolysis.';
    } else {
      summary = 'Cell is at equilibrium (E = 0.00 V, Q = K): forward and reverse rates balance, so the battery is dead.';
    }

    return {
      left: L,
      right: R,
      cLeft: cLeft,
      cRight: cRight,
      tempC: tempC,
      tempK: tempK,
      switchClosed: switchClosed,
      saltBridge: saltBridge,
      mode: mode,
      appliedV: appliedV,
      isConcentrationCell: isConcentrationCell,
      n: n,
      a: a,
      b: b,
      e0: e0,
      E: E,
      Q: Q,
      log10Q: log10Q,
      nernstSlope: nernstSlope,
      deltaG0_kJ: deltaG0_kJ,
      deltaG_kJ: deltaG_kJ,
      log10K: log10K,
      kFormatted: kFormatted,
      spontaneousDir: spontaneousDir,
      flowDir: flowDir,
      currentActive: currentActive,
      measuredV: measuredV,
      minAppliedV: minAppliedV,
      netOverpotential: netOverpotential,
      status: status,
      anodeSide: anodeSide,
      cathodeSide: cathodeSide,
      actualAnode: actualAnode,
      actualCathode: actualCathode,
      equation: equation,
      anodeHalf: anodeHalf,
      cathodeHalf: cathodeHalf,
      cellDiagram: cellNotation(L, R, cLeft, cRight),
      summary: summary
    };
  }

  function stepDischarge(state, dt, rate) {
    var analysis = analyzeCell(state);
    if (!analysis.currentActive || analysis.mode !== 'galvanic') {
      return {
        cLeft: analysis.cLeft,
        cRight: analysis.cRight,
        deltaAnode: 0,
        deltaCathode: 0,
        analysis: analysis
      };
    }

    var r = rate == null ? 0.14 : rate;
    var extent = Math.min(0.18, Math.abs(analysis.E) * r * Math.max(0, dt));
    var dir = analysis.spontaneousDir; // +1: left oxidizes, right reduces; -1: right oxidizes, left reduces

    var nextLeft = analysis.cLeft;
    var nextRight = analysis.cRight;

    if (dir === 1) {
      var maxStep = (nextRight - 1e-4) / analysis.b;
      var step = Math.min(extent, Math.max(0, maxStep));
      nextLeft = Math.min(3.5, nextLeft + analysis.a * step);
      nextRight = Math.max(1e-4, nextRight - analysis.b * step);
      return {
        cLeft: nextLeft,
        cRight: nextRight,
        deltaAnode: step * analysis.a,
        deltaCathode: step * analysis.b,
        analysis: analyzeCell({
          leftKey: state.leftKey,
          rightKey: state.rightKey,
          cLeft: nextLeft,
          cRight: nextRight,
          tempC: state.tempC,
          switchClosed: state.switchClosed,
          saltBridge: state.saltBridge,
          mode: state.mode,
          appliedV: state.appliedV
        })
      };
    }

    var maxStepRev = (nextLeft - 1e-4) / analysis.a;
    var stepRev = Math.min(extent, Math.max(0, maxStepRev));
    nextRight = Math.min(3.5, nextRight + analysis.b * stepRev);
    nextLeft = Math.max(1e-4, nextLeft - analysis.a * stepRev);
    return {
      cLeft: nextLeft,
      cRight: nextRight,
      deltaAnode: stepRev * analysis.b,
      deltaCathode: stepRev * analysis.a,
      analysis: analyzeCell({
        leftKey: state.leftKey,
        rightKey: state.rightKey,
        cLeft: nextLeft,
        cRight: nextRight,
        tempC: state.tempC,
        switchClosed: state.switchClosed,
        saltBridge: state.saltBridge,
        mode: state.mode,
        appliedV: state.appliedV
      })
    };
  }

  function computeFaraday(opts) {
    opts = opts || {};
    var m = getMetal(opts.metalKey || 'Cu');
    var currentA = Number(opts.currentA);
    var timeMinutes = Number(opts.timeMinutes);
    var areaCm2 = Number(opts.areaCm2 != null ? opts.areaCm2 : 25);
    var efficiency = Number(opts.efficiency != null ? opts.efficiency : 1);

    if (!(currentA > 0) || !(timeMinutes > 0) || !(areaCm2 > 0) || !(efficiency > 0 && efficiency <= 1)) {
      return { valid: false, error: 'Enter a positive current, time, and surface area.' };
    }

    var timeSeconds = timeMinutes * 60;
    var chargeC = currentA * timeSeconds;
    var effectiveChargeC = chargeC * efficiency;
    var molesElectrons = effectiveChargeC / F;
    var molesMetal = molesElectrons / m.n;
    var massGrams = molesMetal * m.M;
    var volumeCm3 = massGrams / m.rho;
    var thicknessUm = (volumeCm3 / areaCm2) * 1e4;

    var note = 'Each ' + m.k + ' atom requires ' + m.n + ' electron' + (m.n > 1 ? 's' : '') +
      ' (' + ionFormula(m) + ' + ' + m.n + 'e⁻ → ' + m.k + '). Passing ' +
      chargeC.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' C supplies ' +
      molesElectrons.toFixed(4) + ' mol e⁻, which plates ' + molesMetal.toFixed(4) +
      ' mol (' + massGrams.toFixed(3) + ' g) — a layer ' + thicknessUm.toFixed(1) +
      ' μm thick over ' + areaCm2.toFixed(0) + ' cm².';

    return {
      valid: true,
      metal: m,
      currentA: currentA,
      timeMinutes: timeMinutes,
      timeSeconds: timeSeconds,
      areaCm2: areaCm2,
      efficiency: efficiency,
      chargeC: chargeC,
      effectiveChargeC: effectiveChargeC,
      molesElectrons: molesElectrons,
      molesMetal: molesMetal,
      massGrams: massGrams,
      volumeCm3: volumeCm3,
      thicknessUm: thicknessUm,
      note: note
    };
  }

  var CELL_PRESETS = [
    {
      id: 'daniell',
      label: 'Daniell Cell (Zn | Cu)',
      leftKey: 'Zn', rightKey: 'Cu', cLeft: 1.0, cRight: 1.0, tempC: 25,
      mode: 'galvanic', appliedV: 1.8, switchClosed: true, saltBridge: true,
      blurb: 'Classic 1836 telegraph battery: E° = +1.10 V.'
    },
    {
      id: 'mg-ag',
      label: 'High Voltage (Mg | Ag)',
      leftKey: 'Mg', rightKey: 'Ag', cLeft: 0.01, cRight: 1.0, tempC: 25,
      mode: 'galvanic', appliedV: 3.6, switchClosed: true, saltBridge: true,
      blurb: 'Wide potential gap plus dilute Mg²⁺ pushes cell potential past 3.2 V.'
    },
    {
      id: 'conc-cu',
      label: 'Concentration Cell (Cu | Cu)',
      leftKey: 'Cu', rightKey: 'Cu', cLeft: 0.001, cRight: 1.0, tempC: 25,
      mode: 'galvanic', appliedV: 0.5, switchClosed: true, saltBridge: true,
      blurb: 'Identical electrodes (E° = 0 V), driven solely by a 1000:1 ion gradient.'
    },
    {
      id: 'sacrificial',
      label: 'Galvanized Steel (Zn | Fe)',
      leftKey: 'Zn', rightKey: 'Fe', cLeft: 1.0, cRight: 1.0, tempC: 25,
      mode: 'galvanic', appliedV: 0.8, switchClosed: true, saltBridge: true,
      blurb: 'Zinc sacrifices itself (−0.76 V vs −0.44 V) so iron stays unoxidized.'
    },
    {
      id: 'electrolysis-zn-cu',
      label: 'Recharge / Electrolysis (Zn | Cu)',
      leftKey: 'Zn', rightKey: 'Cu', cLeft: 1.0, cRight: 1.0, tempC: 25,
      mode: 'electrolytic', appliedV: 1.8, switchClosed: true, saltBridge: true,
      blurb: 'External 1.80 V DC supply forces electrons backward onto Zn²⁺.'
    },
    {
      id: 'mg-au',
      label: 'Extreme Gap (Mg | Au)',
      leftKey: 'Mg', rightKey: 'Au', cLeft: 1.0, cRight: 1.0, tempC: 25,
      mode: 'galvanic', appliedV: 4.2, switchClosed: true, saltBridge: true,
      blurb: '3.87 V theoretical gap (6 e⁻ transferred per formula unit).'
    }
  ];

  var PLATING_PRESETS = [
    { id: 'silver-spoon', label: 'Silver Spoon', metalKey: 'Ag', currentA: 1.5, timeMinutes: 25, areaCm2: 40, objectShape: 'spoon' },
    { id: 'copper-refine', label: 'Copper Refining', metalKey: 'Cu', currentA: 5.0, timeMinutes: 45, areaCm2: 50, objectShape: 'medal' },
    { id: 'gold-contacts', label: 'Gold Contacts', metalKey: 'Au', currentA: 0.8, timeMinutes: 15, areaCm2: 12, objectShape: 'key' },
    { id: 'nickel-key', label: 'Nickel Key', metalKey: 'Ni', currentA: 2.0, timeMinutes: 30, areaCm2: 20, objectShape: 'key' },
    { id: 'tin-can', label: 'Tin Food Can', metalKey: 'Sn', currentA: 3.0, timeMinutes: 20, areaCm2: 60, objectShape: 'medal' }
  ];

  var PRACTICE_PROBLEMS = [
    {
      id: 'zn-ag-e0',
      kind: 'numeric',
      prompt: 'A galvanic cell pairs Zn (E° = −0.76 V) with Ag (E° = +0.80 V) at 1.0 M. Calculate E°cell in volts.',
      unit: 'V',
      answer: 1.56,
      tolerance: 0.02,
      hint: 'Remember: doubling a half-reaction does NOT double E°. Use E°cell = E°cathode − E°anode = 0.80 − (−0.76).',
      explain: 'Ag⁺ has the higher reduction potential (+0.80 V), so Ag is the cathode and Zn is the anode: E°cell = 0.80 − (−0.76) = +1.56 V.'
    },
    {
      id: 'al-cu-electrons',
      kind: 'numeric',
      prompt: 'Balance the overall reaction between Al (Al³⁺ + 3e⁻ → Al) and Cu (Cu²⁺ + 2e⁻ → Cu). How many moles of electrons (n) are transferred per balanced equation?',
      unit: 'mol e⁻',
      answer: 6,
      tolerance: 0.05,
      hint: 'Find the least common multiple of 3 electrons (Al) and 2 electrons (Cu).',
      explain: '2 Al + 3 Cu²⁺ → 2 Al³⁺ + 3 Cu transfers lcm(3, 2) = 6 electrons.'
    },
    {
      id: 'nernst-dilute-cu',
      kind: 'choice',
      prompt: 'In a Zn | Cu cell at 25 °C, you dilute [Cu²⁺] from 1.0 M to 0.010 M while keeping [Zn²⁺] = 1.0 M. How does E change?',
      choices: [
        { id: 'up', label: 'Rises above 1.10 V' },
        { id: 'down', label: 'Drops to ~1.04 V' },
        { id: 'same', label: 'Stays at 1.10 V' }
      ],
      answer: 'down',
      hint: 'Q = [Zn²⁺]/[Cu²⁺] = 1.0 / 0.010 = 100. Plug log(100) = 2 into E = E° − (0.0592 / 2) · log Q.',
      explain: 'Fewer reactant Cu²⁺ ions lower the push: E = 1.10 − (0.0592 / 2) · 2 = 1.04 V.'
    },
    {
      id: 'conc-cell-anode',
      kind: 'choice',
      prompt: 'A concentration cell has two copper electrodes: 0.001 M Cu²⁺ on the left and 1.0 M Cu²⁺ on the right. Which beaker is the anode?',
      choices: [
        { id: 'left', label: 'Left (0.001 M Cu²⁺)' },
        { id: 'right', label: 'Right (1.0 M Cu²⁺)' },
        { id: 'neither', label: 'Neither — voltage is zero' }
      ],
      answer: 'left',
      hint: 'Nature tries to equalize the two concentrations: the dilute side needs MORE Cu²⁺ ions, so Cu metal must oxidize there.',
      explain: 'The dilute 0.001 M side oxidizes Cu → Cu²⁺ + 2e⁻ (raising its concentration), making it the anode with E = +(0.0592/2)·log(1000) = +0.089 V.'
    },
    {
      id: 'faraday-cu-mass',
      kind: 'numeric',
      prompt: 'You pass 2.00 A through a Cu²⁺ bath (M = 63.55 g/mol, n = 2) for 30.0 minutes. How many grams of copper plate out?',
      unit: 'g',
      answer: 1.186,
      tolerance: 0.03,
      hint: 'First find Q = I·t = 2.00 × (30 × 60) = 3600 C. Then mol e⁻ = Q / 96485, mol Cu = mol e⁻ ÷ 2, and mass = mol Cu × 63.55.',
      explain: 'Q = 3600 C → 0.03731 mol e⁻ → 0.01866 mol Cu × 63.55 g/mol = 1.19 g Cu.'
    },
    {
      id: 'faraday-ag-mass',
      kind: 'numeric',
      prompt: 'A silver-plating bath (Ag⁺, M = 107.87 g/mol, n = 1) runs at 1.50 A for 20.0 minutes. How many grams of silver deposit?',
      unit: 'g',
      answer: 2.012,
      tolerance: 0.04,
      hint: 'Q = 1.50 × 1200 = 1800 C. Because n = 1 for Ag⁺, moles of Ag equal moles of electrons.',
      explain: 'Q = 1800 C → 1800 / 96485 = 0.01866 mol Ag × 107.87 g/mol = 2.01 g Ag.'
    },
    {
      id: 'electrolytic-sign',
      kind: 'choice',
      prompt: 'During recharging (electrolysis) of a rechargeable cell, what happens at the anode and what is its electrical sign?',
      choices: [
        { id: 'ox-plus', label: 'Oxidation occurs at the anode, and its sign is (+)' },
        { id: 'red-plus', label: 'Reduction occurs at the anode, and its sign is (+)' },
        { id: 'ox-minus', label: 'Oxidation occurs at the anode, and its sign is (−)' }
      ],
      answer: 'ox-plus',
      hint: 'AN OX always holds (anode = oxidation), even in electrolysis — only the terminal signs flip because an external battery pulls electrons out.',
      explain: 'Oxidation ALWAYS happens at the anode (AN OX). In an electrolytic cell, the external power supply pulls electrons out of the anode, making it positive (+).'
    },
    {
      id: 'fe-ni-e0',
      kind: 'numeric',
      prompt: 'Pair Fe (E° = −0.44 V) with Ni (E° = −0.26 V) at 1.0 M. What is the spontaneous standard cell voltage E°cell?',
      unit: 'V',
      answer: 0.18,
      tolerance: 0.015,
      hint: 'The less negative reduction potential (−0.26 V for Ni) is the cathode; subtract (−0.44 V) for Fe.',
      explain: 'E°cell = E°(Ni) − E°(Fe) = −0.26 − (−0.44) = +0.18 V. Even two negative E° values make a positive battery!'
    }
  ];

  function checkPracticeAnswer(problem, input) {
    if (!problem) return { correct: false, message: 'No problem selected.' };
    if (problem.kind === 'choice') {
      var chosen = input && input.choice;
      if (!chosen) return { correct: false, incomplete: true, message: 'Pick one of the options first.' };
      var okChoice = chosen === problem.answer;
      return {
        correct: okChoice,
        message: (okChoice ? '✓ Correct! ' : 'Not quite. ') + problem.explain
      };
    }

    var raw = input && input.value;
    var num = parseFloat(raw);
    if (!isFinite(num)) {
      return { correct: false, incomplete: true, message: 'Enter a numeric answer first.' };
    }
    var okNum = Math.abs(num - problem.answer) <= problem.tolerance;
    return {
      correct: okNum,
      message: (okNum ? '✓ Correct! ' : 'Close, but off target (expected ~' + problem.answer + ' ' + problem.unit + '). ') + problem.explain
    };
  }

  return {
    F: F,
    R: R_GAS,
    METALS: METALS,
    SHE_REFERENCE: SHE_REFERENCE,
    CELL_PRESETS: CELL_PRESETS,
    PLATING_PRESETS: PLATING_PRESETS,
    PRACTICE_PROBLEMS: PRACTICE_PROBLEMS,
    getMetal: getMetal,
    gcd: gcd,
    lcm: lcm,
    ionFormula: ionFormula,
    formatSignedV: formatSignedV,
    formatConc: formatConc,
    formatScientificFromLog10: formatScientificFromLog10,
    cellNotation: cellNotation,
    analyzeCell: analyzeCell,
    stepDischarge: stepDischarge,
    computeFaraday: computeFaraday,
    checkPracticeAnswer: checkPracticeAnswer
  };
}));
