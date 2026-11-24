(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.QuadriviumCore = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PRESETS = [
    { id: 'unison', label: '1:1 Unison', num: 1, den: 1, interval: 'Unison (1:1)', astroNote: 'Identical period (1:1 co-orbital motion)' },
    { id: 'octave', label: '2:1 Octave', num: 2, den: 1, interval: 'Octave · Diapason (2:1)', astroNote: 'Jupiter moons Io & Europa (2:1 resonance)' },
    { id: 'fifth', label: '3:2 Fifth', num: 3, den: 2, interval: 'Perfect Fifth · Diapente (3:2)', astroNote: 'Neptune & Pluto orbital resonance (3:2)' },
    { id: 'fourth', label: '4:3 Fourth', num: 4, den: 3, interval: 'Perfect Fourth · Diatessaron (4:3)', astroNote: '4:3 conjunction cycle (1 beat per cycle)' },
    { id: 'major3', label: '5:4 Major Third', num: 5, den: 4, interval: 'Just Major Third (5:4)', astroNote: '5:4 resonance (1 conjunction per 4 outer orbits)' },
    { id: 'whole', label: '9:8 Whole Tone', num: 9, den: 8, interval: 'Pythagorean Whole Tone (9:8)', astroNote: '9:8 close near-unison orbital drift' },
    { id: 'venus', label: '13:8 Earth–Venus', num: 13, den: 8, interval: '13:8 Compound Ratio', astroNote: '13 Venus orbits ≈ 8 Earth years (5-petal pentagram)' }
  ];

  function assertPosInt(n, name) {
    var v = Number(n);
    if (!Number.isFinite(v) || v < 1 || Math.floor(v) !== v) {
      throw new RangeError(name + ' must be a positive integer');
    }
    return v;
  }

  function gcd(a, b) {
    var x = Math.abs(Math.floor(a));
    var y = Math.abs(Math.floor(b));
    while (y !== 0) {
      var t = y;
      y = x % y;
      x = t;
    }
    return x || 1;
  }

  function reduceRatio(num, den) {
    var a = assertPosInt(num, 'num');
    var b = assertPosInt(den, 'den');
    var g = gcd(a, b);
    var p = a / g;
    var q = b / g;
    return {
      num: p,
      den: q,
      gcd: g,
      factor: p / q,
      label: p + ':' + q
    };
  }

  function frequencyFromRatio(baseHz, num, den) {
    var f0 = Number(baseHz);
    if (!Number.isFinite(f0) || f0 <= 0) throw new RangeError('baseHz must be > 0');
    var r = reduceRatio(num, den);
    return f0 * r.factor;
  }

  function stringStopFraction(num, den) {
    var r = reduceRatio(num, den);
    return r.den / r.num;
  }

  function centsFromRatio(num, den) {
    var r = reduceRatio(num, den);
    return 1200 * Math.log2(r.factor);
  }

  function consonanceRank(num, den) {
    var r = reduceRatio(num, den);
    var complexity = Math.log2(r.num * r.den);
    var tier = complexity <= 2.6 ? 'Pure consonance'
      : complexity <= 4.5 ? 'Classical harmony'
        : 'Complex / dissonant ratio';
    return {
      reduced: r.label,
      complexity: complexity,
      tier: tier
    };
  }

  function orbitalResonancePositions(cyclesOuter, num, den) {
    var r = reduceRatio(num, den);
    var t = Number(cyclesOuter) || 0;
    var angleOuter = t * Math.PI * 2;
    var angleInner = t * (r.num / r.den) * Math.PI * 2;
    return {
      ratio: r.label,
      angleInner: angleInner,
      angleOuter: angleOuter,
      inner: { x: Math.cos(angleInner), y: Math.sin(angleInner) },
      outer: { x: Math.cos(angleOuter), y: Math.sin(angleOuter) },
      conjunctionsPerCycle: Math.abs(r.num - r.den)
    };
  }

  return {
    PRESETS: PRESETS,
    gcd: gcd,
    reduceRatio: reduceRatio,
    frequencyFromRatio: frequencyFromRatio,
    stringStopFraction: stringStopFraction,
    centsFromRatio: centsFromRatio,
    consonanceRank: consonanceRank,
    orbitalResonancePositions: orbitalResonancePositions
  };
}));
