(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PolymathsCore = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DOMAIN_FILTERS = [
    { id: 'all', label: 'All (15)' },
    { id: 'science-art', label: 'Science + Art/Music' },
    { id: 'science-faith', label: 'Science + Faith/Philosophy' },
    { id: 'art-tech', label: 'Art/Media + Engineering' },
    { id: 'cross-science', label: 'Cross-Science' }
  ];

  var COLLISION_FIELDS = [
    { id: 'music', label: 'Music / Rhythm' },
    { id: 'math-physics', label: 'Math / Physics' },
    { id: 'biology', label: 'Biology / Ecology' },
    { id: 'writing', label: 'Writing / Storytelling' },
    { id: 'visual-art', label: 'Drawing / Visual Design' },
    { id: 'engineering', label: 'Engineering / Building' },
    { id: 'history', label: 'History / Philosophy' },
    { id: 'code', label: 'Coding / Systems' }
  ];

  var TRANSFER_NOTES = {
    'music|writing': {
      method: 'Treat sentence lengths, pauses, and paragraph tension like rhythmic motifs and dynamic contrast.',
      parallel: 'Gustav Holst translated Sanskrit texts and symbolic character studies into orchestral pacing.'
    },
    'math-physics|music': {
      method: 'Test harmonic ratios, standing waves, and acoustic overtones as audible mathematics.',
      parallel: 'Albert Einstein and Richard Feynman paired mathematical physics with violin and rhythmic percussion.'
    },
    'biology|visual-art': {
      method: 'Use observational drawing to force slow visual precision: proportion, structure, and variation.',
      parallel: 'Leonardo da Vinci’s anatomical drawings revealed mechanical truths before words could describe them.'
    },
    'visual-art|engineering': {
      method: 'Prototype spatial mechanisms on paper with exploded views and visual affordances before cutting material.',
      parallel: 'Leonardo da Vinci and Hedy Lamarr sketched physical concepts visually before testing mechanisms.'
    },
    'code|music': {
      method: 'Apply timing loops, signal filtering, and pattern variation across both sound synthesis and software.',
      parallel: 'Hedy Lamarr’s frequency-hopping concept borrowed piano-roll synchronization for radio guidance.'
    },
    'history|biology': {
      method: 'Track long-term environmental shifts alongside archival human records to spot hidden causal links.',
      parallel: 'Gregor Mendel combined patient seasonal botanical logs with statistical combinatorial thinking.'
    }
  };

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, Number(val)));
  }

  // Conceptual classroom trajectory model illustrating Güllich et al. (2022) & Dane (2010).
  function simulateTrajectories(opts) {
    opts = opts || {};
    var breadth = clamp(opts.samplingBreadth == null ? 3 : opts.samplingBreadth, 1, 5);
    var anchorDepth = clamp(opts.anchorDepth == null ? 75 : opts.anchorDepth, 20, 100) / 100;
    var transfer = clamp(opts.transferPractice == null ? 70 : opts.transferPractice, 0, 100) / 100;
    var fieldShift = opts.fieldShift !== false;
    var years = Math.max(8, Math.min(16, Math.floor(opts.years == null ? 12 : opts.years)));
    var shiftYear = Math.floor(years / 2);

    var labels = [];
    var earlySpecialist = [];
    var unanchoredDabbler = [];
    var anchoredPolymath = [];
    var crossoverYear = null;

    for (var y = 0; y <= years; y++) {
      labels.push(y);

      // Early specialist: fast early climb, plateaus around 72, drops on field shift if entrenched
      var specBase = 74 * (1 - Math.exp(-0.48 * y));
      if (fieldShift && y >= shiftYear) {
        var elapsed = y - shiftYear;
        var entrenchPenalty = 18 * Math.exp(-0.35 * elapsed) + 8;
        specBase = Math.max(12, specBase - entrenchPenalty);
      }
      earlySpecialist.push(Math.round(specBase * 10) / 10);

      // Unanchored dabbler: samples broadly without settling into an anchor field
      var dab = (26 + breadth * 3.2) * (1 - Math.exp(-0.36 * y));
      unanchoredDabbler.push(Math.round(dab * 10) / 10);

      // Anchored polymath: slower start proportional to breadth, then compounds via anchor + transfer
      var samplingLag = 1 + (breadth - 1) * 0.25;
      var effectiveT = Math.max(0, y - 0.45 * (breadth - 1));
      var baseGrowth = (52 + 34 * anchorDepth + 14 * transfer) * (1 - Math.exp(-0.24 * effectiveT / samplingLag * 1.35));
      var transferBonus = y > 3 ? (breadth - 1) * 3.8 * transfer * Math.min(1, (y - 3) / 6) : 0;
      var shiftHit = 0;
      if (fieldShift && y >= shiftYear) {
        var adaptBuffer = 0.2 + 0.8 * transfer * (breadth / 5);
        shiftHit = 9 * (1 - adaptBuffer) * Math.exp(-0.55 * (y - shiftYear));
      }
      var polyVal = clamp(baseGrowth + transferBonus - shiftHit, 0, 100);
      anchoredPolymath.push(Math.round(polyVal * 10) / 10);

      if (crossoverYear === null && y >= 2 && anchoredPolymath[y] > earlySpecialist[y]) {
        crossoverYear = y;
      }
    }

    return {
      years: labels,
      shiftYear: shiftYear,
      crossoverYear: crossoverYear,
      earlySpecialist: earlySpecialist,
      unanchoredDabbler: unanchoredDabbler,
      anchoredPolymath: anchoredPolymath,
      finalScores: {
        specialist: earlySpecialist[years],
        dabbler: unanchoredDabbler[years],
        polymath: anchoredPolymath[years]
      }
    };
  }

  function buildCollisionPrompt(anchorId, orbitId, customAnchor, customOrbit) {
    var findLabel = function (id, custom) {
      if (custom && String(custom).trim()) return String(custom).trim();
      var found = COLLISION_FIELDS.find(function (f) { return f.id === id; });
      return found ? found.label : String(id || 'Anchor');
    };
    var anchorLabel = findLabel(anchorId, customAnchor);
    var orbitLabel = findLabel(orbitId, customOrbit);

    if (anchorId === orbitId && !customAnchor && !customOrbit) {
      return {
        sameField: true,
        pairLabel: anchorLabel + ' + ' + orbitLabel,
        transferMethod: 'Choose an orbiting field outside your anchor to avoid cognitive entrenchment.',
        historicalParallel: 'Root-Bernstein found Nobel laureates kept serious engagement in 2+ distinct fields outside their specialty.',
        projectIdea: 'Pick a contrasting second field so you bring genuinely new tools back into ' + anchorLabel + '.'
      };
    }

    var keyA = anchorId + '|' + orbitId;
    var keyB = orbitId + '|' + anchorId;
    var matched = TRANSFER_NOTES[keyA] || TRANSFER_NOTES[keyB];

    return {
      sameField: false,
      pairLabel: anchorLabel + ' × ' + orbitLabel,
      transferMethod: matched ? matched.method : 'Take one core method from ' + orbitLabel + ' and test whether it solves a bottleneck inside ' + anchorLabel + '.',
      historicalParallel: matched ? matched.parallel : 'Polymaths from Leonardo da Vinci to Brian May used cross-field habits to notice patterns specialists missed.',
      projectIdea: 'Design one finished artifact this month that cannot be completed using ' + anchorLabel + ' alone — it must require real ' + orbitLabel + ' decisions too.'
    };
  }

  return {
    DOMAIN_FILTERS: DOMAIN_FILTERS,
    COLLISION_FIELDS: COLLISION_FIELDS,
    simulateTrajectories: simulateTrajectories,
    buildCollisionPrompt: buildCollisionPrompt
  };
}));
