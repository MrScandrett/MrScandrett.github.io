/* guitar-chords.js — fretboard note engine, chord detector, and encyclopedia */
(function () {
  'use strict';

  var PITCHES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  /* Standard tuning, low string to high string. */
  var TUNING = [
    { label: 'E', num: 6, openPC: 4 },
    { label: 'A', num: 5, openPC: 9 },
    { label: 'D', num: 4, openPC: 2 },
    { label: 'G', num: 3, openPC: 7 },
    { label: 'B', num: 2, openPC: 11 },
    { label: 'e', num: 1, openPC: 4 }
  ];
  /* Top-to-bottom display order matches tab notation: high e on top. */
  var STRINGS_TOPDOWN = TUNING.slice().reverse();

  var BUILD_FRETS = 9; /* frets 0..9 shown in the builder */

  var CHORD_TYPES = [
    { suffix: '', name: 'Major', intervals: [0, 4, 7] },
    { suffix: 'm', name: 'Minor', intervals: [0, 3, 7] },
    { suffix: '7', name: 'Dominant 7th', intervals: [0, 4, 7, 10] },
    { suffix: 'maj7', name: 'Major 7th', intervals: [0, 4, 7, 11] },
    { suffix: 'm7', name: 'Minor 7th', intervals: [0, 3, 7, 10] },
    { suffix: 'sus2', name: 'Suspended 2nd', intervals: [0, 2, 7] },
    { suffix: 'sus4', name: 'Suspended 4th', intervals: [0, 5, 7] },
    { suffix: 'dim', name: 'Diminished', intervals: [0, 3, 6] },
    { suffix: 'aug', name: 'Augmented', intervals: [0, 4, 8] },
    { suffix: '6', name: 'Major 6th', intervals: [0, 4, 7, 9] },
    { suffix: 'm6', name: 'Minor 6th', intervals: [0, 3, 7, 9] },
    { suffix: 'add9', name: 'Add 9', intervals: [0, 4, 7, 2] },
    { suffix: '5', name: 'Power Chord', intervals: [0, 7] }
  ];

  /* Traditional open/barre shapes, string order low E -> high e. 'x' = muted. */
  var OPEN_SHAPES = {
    'C': ['x', 3, 2, 0, 1, 0],
    'Cmaj7': ['x', 3, 2, 0, 0, 0],
    'C7': ['x', 3, 2, 3, 1, 0],
    'D': ['x', 'x', 0, 2, 3, 2],
    'Dm': ['x', 'x', 0, 2, 3, 1],
    'D7': ['x', 'x', 0, 2, 1, 2],
    'Dmaj7': ['x', 'x', 0, 2, 2, 2],
    'Dsus2': ['x', 'x', 0, 2, 3, 0],
    'Dsus4': ['x', 'x', 0, 2, 3, 3],
    'E': [0, 2, 2, 1, 0, 0],
    'Em': [0, 2, 2, 0, 0, 0],
    'E7': [0, 2, 0, 1, 0, 0],
    'Em7': [0, 2, 0, 0, 0, 0],
    'F': [1, 3, 3, 2, 1, 1],
    'Fmaj7': ['x', 'x', 3, 2, 1, 0],
    'Fm': [1, 3, 3, 1, 1, 1],
    'G': [3, 2, 0, 0, 0, 3],
    'G7': [3, 2, 0, 0, 0, 1],
    'A': ['x', 0, 2, 2, 2, 0],
    'Am': ['x', 0, 2, 2, 1, 0],
    'A7': ['x', 0, 2, 0, 2, 0],
    'Am7': ['x', 0, 2, 0, 1, 0],
    'Amaj7': ['x', 0, 2, 1, 2, 0],
    'Asus2': ['x', 0, 2, 2, 0, 0],
    'Asus4': ['x', 0, 2, 2, 3, 0],
    'B7': ['x', 2, 1, 2, 0, 2],
    'Bm': ['x', 2, 4, 4, 3, 2],
    'B': ['x', 2, 4, 4, 4, 2]
  };

  var FINGERS = {
    'C': ['x', 3, 2, 'x', 1, 'x'],
    'Cmaj7': ['x', 3, 2, 'x', 'x', 'x'],
    'C7': ['x', 3, 2, 4, 1, 'x'],
    'D': ['x', 'x', 'x', 1, 3, 2],
    'Dm': ['x', 'x', 'x', 2, 3, 1],
    'D7': ['x', 'x', 'x', 1, 2, 3],
    'E': ['x', 2, 3, 1, 'x', 'x'],
    'Em': ['x', 2, 3, 'x', 'x', 'x'],
    'E7': ['x', 2, 'x', 1, 'x', 'x'],
    'A': ['x', 'x', 1, 2, 3, 'x'],
    'Am': ['x', 'x', 2, 3, 1, 'x'],
    'A7': ['x', 'x', 1, 'x', 2, 'x'],
    'G': [2, 1, 'x', 'x', 'x', 3],
    'G7': [2, 1, 'x', 'x', 'x', 1],
    'F': [1, 3, 4, 2, 1, 1],
    'Fm': [1, 3, 4, 1, 1, 1],
    'B7': ['x', 2, 1, 3, 'x', 4],
    'Bm': ['x', 1, 4, 3, 2, 1],
    'B': ['x', 1, 4, 3, 2, 1]
  };
  /* The table above was hand-authored before open strings and muted strings both
     collapsed to 'x' — reconcile every entry against the shape it describes so an
     open string (fret 0) always reports 'o', never the muted marker. */
  Object.keys(FINGERS).forEach(function (key) {
    var shape = OPEN_SHAPES[key];
    if (!shape) return;
    FINGERS[key] = FINGERS[key].map(function (finger, i) {
      if (shape[i] === 0) return 'o';
      if (shape[i] === 'x') return 'x';
      return finger;
    });
  });

  /* The 5 CAGED shapes (C-A-G-E-D) as movable templates: each array is the literal
     fret pattern of that letter's OWN open chord (null = muted string), which then
     slides as a block to put its root anywhere on the neck — the "same shape, new
     root" idea the lesson teaches. E/A/G/D majors and E/A/D 7ths & maj7s reduce
     exactly to their OPEN_SHAPES entry at shift 0 (verified below); the handful of
     shapes with no clean open fingering (Cm/Cm7 lowering an open string's 3rd, and
     Gm/Gm7 lowering an open string's 3rd on the B string) mute that one string
     rather than force an unplayable low fret. */
  var BARRE_TEMPLATES = {
    '': {
      E: [0, 2, 2, 1, 0, 0],
      A: [null, 0, 2, 2, 2, 0],
      G: [3, 2, 0, 0, 0, 3],
      C: [null, 3, 2, 0, 1, 0],
      D: [null, null, 0, 2, 3, 2]
    },
    'm': {
      E: [0, 2, 2, 0, 0, 0],
      A: [null, 0, 2, 2, 1, 0],
      G: [3, 1, 0, 0, null, 3],
      C: [null, 3, 1, 0, 1, null],
      D: [null, null, 0, 2, 3, 1]
    },
    '7': {
      E: [0, 2, 0, 1, 0, 0],
      A: [null, 0, 2, 0, 2, 0],
      G: [3, 2, 0, 0, 0, 1],
      C: [null, 3, 2, 3, 1, 0],
      D: [null, null, 0, 2, 1, 2]
    },
    'maj7': {
      E: [0, 2, 1, 1, 0, 0],
      A: [null, 0, 2, 1, 2, 0],
      G: [3, 2, 0, 0, 0, 2],
      C: [null, 3, 2, 0, 0, 0],
      D: [null, null, 0, 2, 2, 2]
    },
    'm7': {
      E: [0, 2, 0, 0, 0, 0],
      A: [null, 0, 2, 0, 1, 0],
      G: [3, 1, 0, 0, null, 1],
      C: [null, 3, 1, 3, 1, null],
      D: [null, null, 0, 2, 1, 1]
    }
  };

  /* Pitch class each shape's own letter represents — the shift amount for a target
     root is just targetRootPC - this, independent of any particular string. */
  var CAGED_REF_PC = { C: 0, A: 9, G: 7, E: 4, D: 2 };
  var CAGED_ORDER = ['C', 'A', 'G', 'E', 'D'];

  var SCALE_TYPES = [
    { key: 'ionian', name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11], degrees: ['1', '2', '3', '4', '5', '6', '7'], mode: 1, desc: 'The reference scale everything else is measured against — bright and fully resolved.' },
    { key: 'dorian', name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], degrees: ['1', '2', '♭3', '4', '5', '6', '♭7'], mode: 2, desc: 'Minor-feeling but with a bright natural 6th — the jazzy, folky minor mode.' },
    { key: 'phrygian', name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10], degrees: ['1', '♭2', '♭3', '4', '5', '♭6', '♭7'], mode: 3, desc: 'Dark and Spanish-tinged, thanks to that lowered 2nd sitting right next to the root.' },
    { key: 'lydian', name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11], degrees: ['1', '2', '3', '#4', '5', '6', '7'], mode: 4, desc: 'Major with a raised 4th — dreamy and floating, a favorite for film scores.' },
    { key: 'mixolydian', name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], degrees: ['1', '2', '3', '4', '5', '6', '♭7'], mode: 5, desc: 'Major with a lowered 7th — bluesy and unresolved, the dominant-7th sound.' },
    { key: 'aeolian', name: 'Minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10], degrees: ['1', '2', '♭3', '4', '5', '♭6', '♭7'], mode: 6, desc: 'The natural minor scale — dark and resolved, the minor-key equivalent of Ionian.' },
    { key: 'locrian', name: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10], degrees: ['1', '♭2', '♭3', '4', '♭5', '♭6', '♭7'], mode: 7, desc: 'Tense and unstable — even the chord built on its root is diminished.' },
    { key: 'majorPent', name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9], degrees: ['1', '2', '3', '5', '6'], mode: null, desc: 'The major scale with the 4th and 7th removed — no half-steps, so it always sounds consonant.' },
    { key: 'minorPent', name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10], degrees: ['1', '♭3', '4', '5', '♭7'], mode: null, desc: 'The natural minor scale with the 2nd and 6th removed — the rock and blues soloing staple.' },
    { key: 'blues', name: 'Blues', intervals: [0, 3, 5, 6, 7, 10], degrees: ['1', '♭3', '4', '♭5', '5', '♭7'], mode: null, desc: 'Minor pentatonic plus a chromatic ♭5 "blue note" passing between the 4th and 5th.' },
    { key: 'harmonicMinor', name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11], degrees: ['1', '2', '♭3', '4', '5', '♭6', '7'], mode: null, desc: 'Natural minor with a raised 7th, opening a dramatic step-and-a-half gap right before the root.' },
    { key: 'melodicMinor', name: 'Melodic Minor', intervals: [0, 2, 3, 5, 7, 9, 11], degrees: ['1', '2', '♭3', '4', '5', '6', '7'], mode: null, desc: 'Natural minor with a raised 6th and 7th — smooths out harmonic minor’s awkward gap.' }
  ];

  function mod12(n) { return ((n % 12) + 12) % 12; }

  function sortedIntervals(chordType) {
    return chordType.intervals.slice().sort(function (a, b) { return a - b; });
  }

  var INVERSION_LABELS = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];

  /* Compute a fretting with a specific chord tone forced into the bass on the low
     E string (the only string that can reach any pitch class within an open-position
     octave), then guarantee every remaining chord tone appears somewhere else in the
     voicing before any string is allowed to double a tone. A naive "first tone found"
     search per string can easily strand a required tone off the fretboard entirely —
     e.g. a 1st-inversion Cmaj7 could omit the root C completely — which means the
     voicing wouldn't actually be the chord it claims to be. */
  function autoVoiceInversion(rootPC, chordType, inversionIndex) {
    var ivs = sortedIntervals(chordType);
    var bassPC = mod12(rootPC + ivs[inversionIndex % ivs.length]);
    var frets = TUNING.map(function () { return 'x'; });

    var bassFret = null;
    for (var f = 0; f <= 11; f++) {
      if (mod12(TUNING[0].openPC + f) === bassPC) { bassFret = f; break; }
    }
    if (bassFret === null) return frets;
    frets[0] = bassFret;

    var chordPCs = ivs.map(function (iv) { return mod12(rootPC + iv); });
    var remainingPCs = ivs.filter(function (iv, i) { return i !== inversionIndex; }).map(function (iv) { return mod12(rootPC + iv); });
    var openStrings = [1, 2, 3, 4, 5];

    /* Every (tone, string) pairing at the fret it takes to reach that tone, closest
       first — greedily claim the cheapest pairing so each tone lands on the string
       that can reach it soonest, before any string is left to double up. */
    var pairs = [];
    remainingPCs.forEach(function (pc) {
      openStrings.forEach(function (s) {
        for (var fr = 0; fr <= 11; fr++) {
          if (mod12(TUNING[s].openPC + fr) === pc) { pairs.push({ pc: pc, s: s, fret: fr }); break; }
        }
      });
    });
    pairs.sort(function (a, b) { return a.fret - b.fret; });
    var assignedPCs = {};
    pairs.forEach(function (p) {
      if (assignedPCs[p.pc] || frets[p.s] !== 'x') return;
      frets[p.s] = p.fret;
      assignedPCs[p.pc] = true;
    });

    /* Any string left over (more strings than distinct chord tones) doubles
       whichever chord tone it can reach at the lowest fret. */
    openStrings.forEach(function (s) {
      if (frets[s] !== 'x') return;
      var bestFret = null;
      chordPCs.forEach(function (pc) {
        for (var fr = 0; fr <= 11; fr++) {
          if (mod12(TUNING[s].openPC + fr) === pc) { if (bestFret === null || fr < bestFret) bestFret = fr; break; }
        }
      });
      frets[s] = bestFret;
    });

    return frets;
  }

  /* Slide a CAGED barre template so its root lands on rootPC — shift every fretted
     note by (rootPC - the shape's own reference pitch class), same idea for every
     shape regardless of which string that shape's root normally falls on. Returns
     null when no template exists for this chord type. A shift of 0 is only
     suppressed when OPEN_SHAPES already has an identical entry for this exact root —
     e.g. the G-shape template at root G IS the primary "Standard" G major voicing,
     so it would be a redundant duplicate button. But plenty of shapes (Gm, Cm7,
     Dm7...) have no OPEN_SHAPES entry at all, so their shift-0 form is the *only*
     place that voicing appears — suppressing it there would hide it everywhere. */
  function barreShape(rootPC, chordType, formKey) {
    var offsets = BARRE_TEMPLATES[chordType.suffix] && BARRE_TEMPLATES[chordType.suffix][formKey];
    if (!offsets) return null;
    var shift = mod12(rootPC - CAGED_REF_PC[formKey]);
    var key = PITCHES[rootPC] + chordType.suffix;
    if (shift === 0 && OPEN_SHAPES[key]) return null;
    return offsets.map(function (off) { return off === null ? 'x' : off + shift; });
  }

  /* Which movable CAGED forms (besides the primary voicing) apply to this root/type,
     in C-A-G-E-D order. */
  function availableForms(rootPC, chordType) {
    return CAGED_ORDER.filter(function (formKey) { return !!barreShape(rootPC, chordType, formKey); });
  }

  /* Scale-degree label for a semitone interval above the root, in chord-tone terms
     (R, 3rd, 5th, 7th, ...) rather than the scale-degree numbers used for scales.
     A whole-tone or perfect-4th interval reads as "9"/"11" only when a 3rd is also
     present (add9/whatever) — with no 3rd at all it's the chord's actual 2nd/4th (sus). */
  function intervalLabel(iv, hasThird) {
    var LABELS = { 0: 'R', 3: '♭3', 4: '3', 6: '♭5', 7: '5', 8: '♯5', 9: '6', 10: '♭7', 11: '7' };
    if (iv === 2) return hasThird ? '9' : '2';
    if (iv === 5) return hasThird ? '11' : '4';
    return LABELS[iv] || String(iv);
  }

  /* Per-string degree labels ({label, isRoot, iv} or null) for a rendered voicing. */
  function computeDegrees(rootPC, chordType, frets) {
    var ivs = sortedIntervals(chordType);
    var hasThird = ivs.indexOf(3) !== -1 || ivs.indexOf(4) !== -1;
    return frets.map(function (f, i) {
      if (f === 'x' || f === null || f === undefined) return null;
      var iv = mod12(mod12(TUNING[i].openPC + f) - rootPC);
      return { label: intervalLabel(iv, hasThird), isRoot: iv === 0, iv: iv };
    });
  }

  /* Bucket a degree label into a coarse interval-quality category for the
     "color by interval quality" display mode. Chords and scales both use the
     same ♭/♯ + numeral labeling convention, so one parser covers both. */
  function degreeQuality(label) {
    if (label === 'R' || label === '1') return 'root';
    var first = label.charAt(0);
    var flat = first === '♭';
    var sharp = first === '♯' || first === '#';
    var num = parseInt(flat || sharp ? label.slice(1) : label, 10);
    if (sharp) return 'augmented';
    if (flat) return num === 5 ? 'diminished' : 'minor';
    if (num === 4 || num === 5 || num === 11) return 'perfect';
    return 'major';
  }

  /* Assign finger numbers 1-4 to fretted notes by rank of distinct fret value
     (lowest fret = finger 1). Repeated frets share a finger, implying a barre. */
  function computeFingering(frets) {
    var fretted = frets.filter(function (f) { return typeof f === 'number' && f > 0; });
    var unique = [];
    fretted.forEach(function (f) { if (unique.indexOf(f) === -1) unique.push(f); });
    unique.sort(function (a, b) { return a - b; });
    return frets.map(function (f) {
      if (f === 'x' || f === null || f === undefined) return 'x';
      if (f === 0) return 'o';
      return Math.min(unique.indexOf(f) + 1, 4);
    });
  }

  function getChordShape(rootPC, chordType, inversionIndex, formKey) {
    inversionIndex = inversionIndex || 0;
    var key = PITCHES[rootPC] + chordType.suffix;
    if (inversionIndex === 0 && formKey && CAGED_REF_PC.hasOwnProperty(formKey)) {
      var bFrets = barreShape(rootPC, chordType, formKey);
      if (bFrets) {
        return { frets: bFrets, fingers: computeFingering(bFrets), source: 'barre-' + formKey, key: key, inversionIndex: 0 };
      }
    }
    if (inversionIndex === 0 && OPEN_SHAPES[key]) {
      var shapeFrets = OPEN_SHAPES[key].slice();
      return { frets: shapeFrets, fingers: (FINGERS[key] || computeFingering(shapeFrets)), source: 'shape', key: key, inversionIndex: 0 };
    }
    var frets = autoVoiceInversion(rootPC, chordType, inversionIndex);
    return { frets: frets, fingers: computeFingering(frets), source: 'computed', key: key, inversionIndex: inversionIndex };
  }

  function chordDisplayName(rootPC, chordType) {
    return PITCHES[rootPC] + (chordType.suffix === '' ? '' : chordType.suffix);
  }

  /* Detect chords from a set of {stringIndexLowToHigh, fret} notes. Returns matches array. */
  function detectChords(playedLowToHigh) {
    var notes = [];
    playedLowToHigh.forEach(function (fret, i) {
      if (fret === null || fret === 'x' || fret === undefined) return;
      var pc = mod12(TUNING[i].openPC + fret);
      notes.push({ stringIndex: i, pc: pc, fret: fret });
    });
    if (notes.length === 0) return { notes: notes, matches: [] };

    var uniquePCs = [];
    notes.forEach(function (n) { if (uniquePCs.indexOf(n.pc) === -1) uniquePCs.push(n.pc); });

    var bassPC = notes[0].pc; /* lowest string with a note = bass note */

    var matches = [];
    uniquePCs.forEach(function (root) {
      var intervalSet = [];
      uniquePCs.forEach(function (pc) {
        var iv = mod12(pc - root);
        if (intervalSet.indexOf(iv) === -1) intervalSet.push(iv);
      });
      intervalSet.sort(function (a, b) { return a - b; });
      CHORD_TYPES.forEach(function (ct) {
        var ref = ct.intervals.slice().sort(function (a, b) { return a - b; });
        if (ref.length === intervalSet.length && ref.every(function (v, i) { return v === intervalSet[i]; })) {
          matches.push({
            root: root,
            chordType: ct,
            name: chordDisplayName(root, ct),
            isRootPosition: root === bassPC,
            slashName: root === bassPC ? null : chordDisplayName(root, ct) + '/' + PITCHES[bassPC]
          });
        }
      });
    });

    matches.sort(function (a, b) {
      if (a.isRootPosition !== b.isRootPosition) return a.isRootPosition ? -1 : 1;
      return a.chordType.intervals.length - b.chordType.intervals.length;
    });

    return { notes: notes, uniquePCs: uniquePCs, bassPC: bassPC, matches: matches };
  }

  window.GuitarTheory = {
    PITCHES: PITCHES,
    TUNING: TUNING,
    STRINGS_TOPDOWN: STRINGS_TOPDOWN,
    BUILD_FRETS: BUILD_FRETS,
    CHORD_TYPES: CHORD_TYPES,
    SCALE_TYPES: SCALE_TYPES,
    OPEN_SHAPES: OPEN_SHAPES,
    INVERSION_LABELS: INVERSION_LABELS,
    mod12: mod12,
    sortedIntervals: sortedIntervals,
    getChordShape: getChordShape,
    computeFingering: computeFingering,
    availableForms: availableForms,
    intervalLabel: intervalLabel,
    degreeQuality: degreeQuality,
    computeDegrees: computeDegrees,
    chordDisplayName: chordDisplayName,
    detectChords: detectChords
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  var GT = window.GuitarTheory;
  if (!GT) return;

  /* ---------- Shared fretboard rendering ---------- */

  /* Chromatic "rainbow solfège" hue for a semitone-from-root value: red at the
     root through violet at the major 7th (0–270°, not a full wrap back to red,
     so adjacent-ish intervals stay visually distinct like the classroom
     rainbow-boomwhacker convention). */
  function rainbowHue(iv) {
    return Math.round((typeof iv === 'number' ? iv : 0) / 11 * 270);
  }

  function fretMarkers(count) {
    var singles = [3, 5, 7, 9, 15, 17, 19, 21];
    var doubles = [12, 24];
    var out = {};
    for (var f = 1; f <= count; f++) {
      if (doubles.indexOf(f) !== -1) out[f] = 2;
      else if (singles.indexOf(f) !== -1) out[f] = 1;
    }
    return out;
  }

  /* Build a fretboard grid. `frets` low-E..high-e array of number|'x'|null.
     `interactive` enables click handlers via onCellClick(stringIdxLowToHigh, fret). */
  function renderBoard(container, opts) {
    opts = opts || {};
    var startFret = opts.startFret || 0;
    var span = opts.span || GT.BUILD_FRETS;
    var frets = opts.frets || [null, null, null, null, null, null]; /* low E..high e */
    var fingers = opts.fingers || null; /* low E..high e, values 1-4/'o'/'x' */
    var degrees = opts.degrees || null; /* low E..high e, values {label, isRoot} or null */
    var interactive = !!opts.interactive;
    var onCellClick = opts.onCellClick;
    var onOpenClick = opts.onOpenClick;

    container.innerHTML = '';
    var board = document.createElement('div');
    board.className = 'gc-board' + (interactive ? ' is-interactive' : '');
    board.style.setProperty('--gc-frets', span);

    var head = document.createElement('div');
    head.className = 'gc-row gc-head-row';
    var openLabel = document.createElement('div');
    openLabel.className = 'gc-open-label';
    openLabel.textContent = startFret === 0 ? 'Open' : (startFret + 'fr');
    head.appendChild(openLabel);
    for (var f = startFret + 1; f <= startFret + span; f++) {
      var fl = document.createElement('div');
      fl.className = 'gc-fret-label';
      fl.textContent = f;
      head.appendChild(fl);
    }
    board.appendChild(head);

    GT.STRINGS_TOPDOWN.forEach(function (str) {
      var stringIndexLowToHigh = GT.TUNING.indexOf(str);
      var row = document.createElement('div');
      row.className = 'gc-row';
      row.setAttribute('data-string', str.label + str.num);

      var val = frets[stringIndexLowToHigh];
      var fingerVal = fingers ? fingers[stringIndexLowToHigh] : null;
      var fingerNum = (typeof fingerVal === 'number') ? fingerVal : null;
      var degreeVal = degrees ? degrees[stringIndexLowToHigh] : null;

      function dotInnerHTML() {
        var dotCls = 'gc-dot' + (degreeVal && degreeVal.isRoot ? ' gc-dot-root' : '');
        var attrs = degreeVal ? ' data-quality="' + GT.degreeQuality(degreeVal.label) + '" style="--gc-hue:' + rainbowHue(degreeVal.iv) + '"' : '';
        var html = '';
        if (degreeVal) {
          html += '<span class="gc-degree-label">' + degreeVal.label + '</span>';
          if (fingerNum) html += '<span class="gc-finger-badge">' + fingerNum + '</span>';
        } else if (fingerNum) {
          html += '<span class="gc-finger-num">' + fingerNum + '</span>';
        }
        return { cls: dotCls, attrs: attrs, html: html };
      }

      var openCell = document.createElement('button');
      openCell.type = 'button';
      openCell.className = 'gc-cell gc-open-cell';
      var openAria = str.label + ' string, ' + (val === 0 ? 'open' : (val === 'x' || val == null ? 'muted' : 'open or muted')) + (degreeVal ? ', ' + (degreeVal.isRoot ? 'root' : degreeVal.label) : '');
      openCell.setAttribute('aria-label', openAria);
      if (val === 0) openCell.classList.add('is-open');
      if (val === 'x' || val === null || val === undefined) openCell.classList.add('is-muted');
      if (val === 0) {
        var openDot = dotInnerHTML();
        openCell.innerHTML = '<span class="gc-string-tag">' + str.label + '</span>' +
          '<span class="' + openDot.cls + ' gc-open-dot"' + openDot.attrs + '>' + openDot.html + '</span>';
      } else {
        openCell.innerHTML = '<span class="gc-string-tag">' + str.label + '</span>' +
          (val === 'x' || val == null ? '<span class="gc-mute-x">&times;</span>' : '');
      }
      if (interactive) {
        openCell.addEventListener('click', function () { onOpenClick(stringIndexLowToHigh); });
      } else {
        openCell.disabled = true;
      }
      row.appendChild(openCell);

      for (var fret = startFret + 1; fret <= startFret + span; fret++) {
        var cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'gc-cell';
        cell.setAttribute('aria-label', str.label + ' string, fret ' + fret + (val === fret && degreeVal ? ', ' + (degreeVal.isRoot ? 'root' : degreeVal.label) : ''));
        if (val === fret) {
          cell.classList.add('has-note');
          var fretDot = dotInnerHTML();
          cell.innerHTML = '<span class="' + fretDot.cls + '"' + fretDot.attrs + '>' + fretDot.html + '</span>';
        }
        if (interactive) {
          cell.addEventListener('click', function (fretNum) {
            return function () { onCellClick(stringIndexLowToHigh, fretNum); };
          }(fret));
        } else {
          cell.disabled = true;
        }
        row.appendChild(cell);
      }
      board.appendChild(row);
    });

    var markerRow = document.createElement('div');
    markerRow.className = 'gc-row gc-marker-row';
    var markerBlank = document.createElement('div');
    markerBlank.className = 'gc-open-label';
    markerRow.appendChild(markerBlank);
    var markers = fretMarkers(startFret + span);
    for (var mf = startFret + 1; mf <= startFret + span; mf++) {
      var mc = document.createElement('div');
      mc.className = 'gc-fret-marker';
      if (markers[mf] === 1) mc.innerHTML = '<span></span>';
      if (markers[mf] === 2) mc.innerHTML = '<span></span><span></span>';
      markerRow.appendChild(mc);
    }
    board.appendChild(markerRow);

    container.appendChild(board);
  }

  /* ---------- Dot color-coding mode (applies to every board on the page) ---------- */

  var COLOR_MODES = [
    { key: 'default', label: 'Default', legend: 'Root notes are dark gold with a ring; every other note shares one accent color.' },
    { key: 'rainbow', label: 'Rainbow (solfège)', legend: 'Chromatic rainbow order from the root (red) up through the major 7th (violet) — the same note is always the same color, in every chord and scale.' },
    { key: 'quality', label: 'Interval quality', legend: 'Minor = blue, Major = green, Perfect (4th/5th) = teal, Augmented = red, Diminished = purple. The root keeps its own gold marker.' },
    { key: 'bw', label: 'Black & white', legend: 'High-contrast outlines with no color — built for printing on a plain printer.' }
  ];
  var colorModePicker = document.getElementById('gcColorModePicker');
  var colorLegend = document.getElementById('gcColorLegend');
  var gcColorMode = 'default';
  try {
    var savedMode = localStorage.getItem('gcColorMode');
    if (savedMode && COLOR_MODES.some(function (m) { return m.key === savedMode; })) gcColorMode = savedMode;
  } catch (e) { /* localStorage unavailable — fall back to default */ }

  function applyColorMode() {
    document.body.setAttribute('data-gc-color-mode', gcColorMode);
    var mode = COLOR_MODES.filter(function (m) { return m.key === gcColorMode; })[0];
    if (colorLegend && mode) colorLegend.textContent = mode.legend;
    if (colorModePicker) {
      Array.prototype.forEach.call(colorModePicker.children, function (btn) {
        btn.classList.toggle('is-active', btn.getAttribute('data-mode') === gcColorMode);
      });
    }
  }

  if (colorModePicker) {
    COLOR_MODES.forEach(function (mode) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gc-pick-btn gc-type-btn';
      btn.textContent = mode.label;
      btn.setAttribute('data-mode', mode.key);
      btn.addEventListener('click', function () {
        gcColorMode = mode.key;
        try { localStorage.setItem('gcColorMode', gcColorMode); } catch (e) { /* ignore */ }
        applyColorMode();
      });
      colorModePicker.appendChild(btn);
    });
  }
  applyColorMode();

  /* ---------- Builder (place-your-own-notes) ---------- */

  var builderState = [null, null, null, null, null, null]; /* low E..high e, value = fret number, 'x', or null */
  var builderBoard = document.getElementById('gcBuilderBoard');
  var builderResult = document.getElementById('gcBuilderResult');
  var builderNotes = document.getElementById('gcBuilderNotes');

  function renderBuilder() {
    if (!builderBoard) return;
    var detection = GT.detectChords(builderState);
    var degrees = detection.matches.length
      ? GT.computeDegrees(detection.matches[0].root, detection.matches[0].chordType, builderState)
      : null;
    renderBoard(builderBoard, {
      startFret: 0,
      span: GT.BUILD_FRETS,
      frets: builderState,
      fingers: GT.computeFingering(builderState),
      degrees: degrees,
      interactive: true,
      onCellClick: function (stringIdx, fret) {
        builderState[stringIdx] = (builderState[stringIdx] === fret) ? null : fret;
        renderBuilder();
      },
      onOpenClick: function (stringIdx) {
        var cur = builderState[stringIdx];
        if (cur === 0) builderState[stringIdx] = 'x';
        else if (cur === 'x' || cur === null || cur === undefined) builderState[stringIdx] = 0;
        else builderState[stringIdx] = 0;
        renderBuilder();
      }
    });
    updateBuilderResult(detection);
  }

  function updateBuilderResult(detection) {
    if (!builderResult) return;
    detection = detection || GT.detectChords(builderState);

    if (detection.notes.length === 0) {
      builderResult.innerHTML = '<p class="gc-result-empty">Click frets on the board above to place notes. Click a string\'s label to toggle it between muted (&times;) and open.</p>';
      if (builderNotes) builderNotes.textContent = '';
      return;
    }

    var noteNames = detection.notes.map(function (n) { return GT.PITCHES[n.pc]; });
    if (builderNotes) builderNotes.textContent = 'Notes played (low to high): ' + noteNames.join(' – ');

    if (detection.matches.length === 0) {
      builderResult.innerHTML = '<p class="gc-result-none"><strong>Not a standard chord in our dictionary.</strong> That\'s OK — not every combination of notes has a name. Try matching it against the chord types below, or clear and try again.</p>';
      return;
    }

    var best = detection.matches[0];
    var html = '<div class="gc-result-main">';
    html += '<span class="gc-result-badge">' + (best.isRootPosition ? 'Root position' : 'Inversion') + '</span>';
    html += '<h3>' + (best.isRootPosition ? best.name : best.slashName) + '</h3>';
    html += '<p>' + best.chordType.name + ' — built from ' + GT.PITCHES[best.root] + '.</p>';
    html += '</div>';

    if (detection.matches.length > 1) {
      html += '<div class="gc-result-alt"><p class="gc-result-alt-label">These exact notes also spell:</p><ul>';
      detection.matches.slice(1).forEach(function (m) {
        html += '<li><strong>' + (m.isRootPosition ? m.name : m.slashName) + '</strong> <span>(' + m.chordType.name + ')</span></li>';
      });
      html += '</ul></div>';
    }
    builderResult.innerHTML = html;
  }

  var clearBtn = document.getElementById('gcClearBuilder');
  if (clearBtn) clearBtn.addEventListener('click', function () {
    builderState = [null, null, null, null, null, null];
    renderBuilder();
  });

  var challengeBtn = document.getElementById('gcChallengeBuilder');
  var challengeReadout = document.getElementById('gcChallengeReadout');
  if (challengeBtn) challengeBtn.addEventListener('click', function () {
    var root = Math.floor(Math.random() * 12);
    var typeList = [GT.CHORD_TYPES[0], GT.CHORD_TYPES[1], GT.CHORD_TYPES[2], GT.CHORD_TYPES[3], GT.CHORD_TYPES[4]];
    var type = typeList[Math.floor(Math.random() * typeList.length)];
    if (challengeReadout) {
      challengeReadout.textContent = 'Build a ' + GT.chordDisplayName(root, type) + ' (' + type.name + '). Place notes so the intervals from your lowest note match: ' + type.intervals.join(', ') + ' semitones.';
    }
  });

  renderBuilder();

  /* ---------- Encyclopedia ---------- */

  var rootPicker = document.getElementById('gcRootPicker');
  var typePicker = document.getElementById('gcTypePicker');
  var inversionPicker = document.getElementById('gcInversionPicker');
  var formGroup = document.getElementById('gcFormGroup');
  var formPicker = document.getElementById('gcFormPicker');
  var encBoard = document.getElementById('gcEncBoard');
  var encMeta = document.getElementById('gcEncMeta');
  var encCurrentRoot = 0;
  var encCurrentType = GT.CHORD_TYPES[0];
  var encCurrentInversion = 0;
  var encCurrentForm = null; /* null = primary voicing; 'E'/'A' = movable barre alternative */

  function buildPickers() {
    if (rootPicker) {
      GT.PITCHES.forEach(function (name, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'gc-pick-btn';
        btn.textContent = name;
        if (idx === encCurrentRoot) btn.classList.add('is-active');
        btn.addEventListener('click', function () {
          encCurrentRoot = idx;
          Array.prototype.forEach.call(rootPicker.children, function (c) { c.classList.remove('is-active'); });
          btn.classList.add('is-active');
          renderEncyclopedia();
        });
        rootPicker.appendChild(btn);
      });
    }
    if (typePicker) {
      GT.CHORD_TYPES.forEach(function (ct, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'gc-pick-btn gc-type-btn';
        btn.textContent = ct.name;
        if (idx === 0) btn.classList.add('is-active');
        btn.addEventListener('click', function () {
          encCurrentType = ct;
          encCurrentInversion = 0;
          Array.prototype.forEach.call(typePicker.children, function (c) { c.classList.remove('is-active'); });
          btn.classList.add('is-active');
          buildInversionPicker();
          renderEncyclopedia();
        });
        typePicker.appendChild(btn);
      });
    }
  }

  function buildInversionPicker() {
    if (!inversionPicker) return;
    inversionPicker.innerHTML = '';
    var toneCount = GT.sortedIntervals(encCurrentType).length;
    for (var i = 0; i < toneCount; i++) {
      (function (idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'gc-pick-btn gc-inv-btn';
        btn.textContent = GT.INVERSION_LABELS[idx] || (idx + 'th inversion');
        if (idx === encCurrentInversion) btn.classList.add('is-active');
        btn.addEventListener('click', function () {
          encCurrentInversion = idx;
          Array.prototype.forEach.call(inversionPicker.children, function (c) { c.classList.remove('is-active'); });
          btn.classList.add('is-active');
          renderEncyclopedia();
        });
        inversionPicker.appendChild(btn);
      })(i);
    }
  }

  var FORM_LABELS = { C: 'C-shape', A: 'A-shape', G: 'G-shape', E: 'E-shape', D: 'D-shape' };

  /* The alternate-fingering row only makes sense at root position (barre templates
     always put the root in the bass) and only for chord types with a CAGED template. */
  function buildFormPicker() {
    if (!formPicker) return;
    var forms = encCurrentInversion === 0 ? GT.availableForms(encCurrentRoot, encCurrentType) : [];
    var options = [null].concat(forms);
    if (options.indexOf(encCurrentForm) === -1) encCurrentForm = null;

    if (formGroup) formGroup.style.display = forms.length ? '' : 'none';
    formPicker.innerHTML = '';
    options.forEach(function (formKey) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gc-pick-btn gc-form-btn';
      btn.textContent = formKey ? FORM_LABELS[formKey] : 'Standard';
      if (formKey === encCurrentForm) btn.classList.add('is-active');
      btn.addEventListener('click', function () {
        encCurrentForm = formKey;
        Array.prototype.forEach.call(formPicker.children, function (c) { c.classList.remove('is-active'); });
        btn.classList.add('is-active');
        renderEncyclopedia();
      });
      formPicker.appendChild(btn);
    });
  }

  function fingerSummary(fingers) {
    return fingers.map(function (f) { return f === 'x' ? '×' : (f === 'o' ? 'open' : f); }).join(' – ');
  }

  function sourceTag(source) {
    if (source === 'shape') return 'Traditional open shape';
    if (source.indexOf('barre-') === 0) {
      var formKey = source.slice(6);
      return 'Movable ' + FORM_LABELS[formKey] + ' barre — slide the whole shape to any fret';
    }
    return 'Computed voicing — lowest matching fret per string';
  }

  function renderEncyclopedia() {
    if (!encBoard) return;
    buildFormPicker();
    var shape = GT.getChordShape(encCurrentRoot, encCurrentType, encCurrentInversion, encCurrentForm);
    var name = GT.chordDisplayName(encCurrentRoot, encCurrentType);
    var degrees = GT.computeDegrees(encCurrentRoot, encCurrentType, shape.frets);

    var numericFrets = shape.frets.filter(function (f) { return typeof f === 'number' && f > 0; });
    var maxFret = numericFrets.length ? Math.max.apply(null, numericFrets) : 0;
    var minFret = numericFrets.length ? Math.min.apply(null, numericFrets) : 0;
    var startFret = 0;
    if (maxFret > GT.BUILD_FRETS - 1) startFret = Math.max(0, minFret - 1);

    renderBoard(encBoard, { startFret: startFret, span: GT.BUILD_FRETS, frets: shape.frets, fingers: shape.fingers, degrees: degrees, interactive: false });

    if (encMeta) {
      var tag = sourceTag(shape.source);
      var detection = GT.detectChords(shape.frets);
      var notesLine = detection.notes.map(function (n) { return GT.PITCHES[n.pc]; }).join(' – ');
      var invLabel = GT.INVERSION_LABELS[encCurrentInversion] || (encCurrentInversion + 'th inversion');
      var bassNote = detection.notes.length ? GT.PITCHES[detection.notes[0].pc] : '';
      var degreeLine = degrees.filter(function (d) { return d; }).map(function (d) { return d.label; }).join(' – ');
      encMeta.innerHTML = '<h3>' + name + (encCurrentInversion === 0 ? '' : ' / ' + bassNote) + '</h3>' +
        '<p class="gc-enc-tag">' + tag + '</p>' +
        '<p class="gc-enc-notes"><strong>' + invLabel + '</strong> — bass note ' + bassNote + '</p>' +
        '<p class="gc-enc-notes">Notes: ' + notesLine + '</p>' +
        '<p class="gc-enc-notes">Intervals from the root (low string → high string): ' + degreeLine + '</p>' +
        '<p class="gc-enc-notes">Fingering (low string → high string): ' + fingerSummary(shape.fingers) + '</p>' +
        '<p class="gc-enc-formula">Formula: root' + encCurrentType.intervals.slice(1).map(function (i) { return ' + ' + i; }).join('') + ' semitones from ' + name.replace(encCurrentType.suffix, '') + '</p>';
    }
  }

  buildPickers();
  buildInversionPicker();
  renderEncyclopedia();

  /* Load an encyclopedia chord into the builder for comparison. */
  var sendToBuilder = document.getElementById('gcSendToBuilder');
  if (sendToBuilder) sendToBuilder.addEventListener('click', function () {
    var shape = GT.getChordShape(encCurrentRoot, encCurrentType, encCurrentInversion, encCurrentForm);
    builderState = shape.frets.slice();
    renderBuilder();
    var target = document.getElementById('builder');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------- Scales & modes ---------- */

  var scaleRootPicker = document.getElementById('gcScaleRootPicker');
  var scaleTypePicker = document.getElementById('gcScaleTypePicker');
  var scaleViewPicker = document.getElementById('gcScaleViewPicker');
  var scalePositionControls = document.getElementById('gcScalePositionControls');
  var scaleFretInput = document.getElementById('gcScaleFretInput');
  var scaleAddLeftBtn = document.getElementById('gcScaleAddLeft');
  var scaleAddRightBtn = document.getElementById('gcScaleAddRight');
  var scaleBoard = document.getElementById('gcScaleBoard');
  var scaleMeta = document.getElementById('gcScaleMeta');
  var scaleCurrentRoot = 0;
  var scaleCurrentType = GT.SCALE_TYPES[0];
  var SCALE_SPAN = 12; /* show a full octave of frets so the pattern repeats visibly */

  var POSITION_SPAN = 4; /* frets per hand position — one fret per fretting finger */
  var MAX_FRET = 15; /* highest fret a position window can reach */
  var scaleViewMode = 'full'; /* 'full' = whole neck, 'position' = a single movable box */
  var posStart = 0;
  var posEnd = POSITION_SPAN - 1;

  var MODE_ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];

  function buildToneMap(rootPC, scaleType) {
    var map = {};
    scaleType.intervals.forEach(function (iv, i) {
      var pc = GT.mod12(rootPC + iv);
      map[pc] = { label: scaleType.degrees[i], isRoot: iv === 0, iv: iv };
    });
    return map;
  }

  /* Read-only fretboard that highlights every occurrence of every scale tone
     across the span, not just one per string — scale patterns repeat. */
  function renderScaleBoard(container, opts) {
    var startFret = opts.startFret || 0;
    var span = opts.span || SCALE_SPAN;
    var toneMap = opts.toneMap;

    container.innerHTML = '';
    var board = document.createElement('div');
    board.className = 'gc-board';
    board.style.setProperty('--gc-frets', span);

    var head = document.createElement('div');
    head.className = 'gc-row gc-head-row';
    var openLabel = document.createElement('div');
    openLabel.className = 'gc-open-label';
    openLabel.textContent = startFret === 0 ? 'Open' : (startFret + 'fr');
    head.appendChild(openLabel);
    for (var f = startFret + 1; f <= startFret + span; f++) {
      var fl = document.createElement('div');
      fl.className = 'gc-fret-label';
      fl.textContent = f;
      head.appendChild(fl);
    }
    board.appendChild(head);

    function dotHTML(tone) {
      var attrs = ' data-quality="' + GT.degreeQuality(tone.label) + '" style="--gc-hue:' + rainbowHue(tone.iv) + '"';
      return '<span class="gc-dot' + (tone.isRoot ? ' gc-dot-root' : '') + '"' + attrs + '><span class="gc-degree-label">' + tone.label + '</span></span>';
    }

    GT.STRINGS_TOPDOWN.forEach(function (str) {
      var row = document.createElement('div');
      row.className = 'gc-row';
      row.setAttribute('data-string', str.label + str.num);

      /* Open strings only sound at fret 0 — once the window starts higher up the
         neck, that column is just a position marker, not a playable open note. */
      var openTone = startFret === 0 ? toneMap[GT.mod12(str.openPC)] : null;
      var openCell = document.createElement('button');
      openCell.type = 'button';
      openCell.className = 'gc-cell gc-open-cell';
      openCell.disabled = true;
      openCell.setAttribute('aria-label', str.label + ' string, open' + (openTone ? ', scale tone ' + openTone.label : ''));
      openCell.innerHTML = '<span class="gc-string-tag">' + str.label + '</span>' + (openTone ? dotHTML(openTone) : '');
      row.appendChild(openCell);

      for (var fret = startFret + 1; fret <= startFret + span; fret++) {
        var tone = toneMap[GT.mod12(str.openPC + fret)];
        var cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'gc-cell';
        cell.disabled = true;
        cell.setAttribute('aria-label', str.label + ' string, fret ' + fret + (tone ? ', scale tone ' + tone.label : ''));
        if (tone) {
          cell.classList.add('has-note');
          cell.innerHTML = dotHTML(tone);
        }
        row.appendChild(cell);
      }
      board.appendChild(row);
    });

    var markerRow = document.createElement('div');
    markerRow.className = 'gc-row gc-marker-row';
    var markerBlank = document.createElement('div');
    markerBlank.className = 'gc-open-label';
    markerRow.appendChild(markerBlank);
    var markers = fretMarkers(startFret + span);
    for (var mf = startFret + 1; mf <= startFret + span; mf++) {
      var mc = document.createElement('div');
      mc.className = 'gc-fret-marker';
      if (markers[mf] === 1) mc.innerHTML = '<span></span>';
      if (markers[mf] === 2) mc.innerHTML = '<span></span><span></span>';
      markerRow.appendChild(mc);
    }
    board.appendChild(markerRow);

    container.appendChild(board);
  }

  function buildScalePickers() {
    if (scaleRootPicker) {
      GT.PITCHES.forEach(function (name, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'gc-pick-btn';
        btn.textContent = name;
        if (idx === scaleCurrentRoot) btn.classList.add('is-active');
        btn.addEventListener('click', function () {
          scaleCurrentRoot = idx;
          Array.prototype.forEach.call(scaleRootPicker.children, function (c) { c.classList.remove('is-active'); });
          btn.classList.add('is-active');
          renderScales();
        });
        scaleRootPicker.appendChild(btn);
      });
    }
    if (scaleTypePicker) {
      GT.SCALE_TYPES.forEach(function (st, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'gc-pick-btn gc-type-btn';
        btn.textContent = st.name;
        if (idx === 0) btn.classList.add('is-active');
        btn.addEventListener('click', function () {
          scaleCurrentType = st;
          Array.prototype.forEach.call(scaleTypePicker.children, function (c) { c.classList.remove('is-active'); });
          btn.classList.add('is-active');
          renderScales();
        });
        scaleTypePicker.appendChild(btn);
      });
    }
  }

  function buildScaleViewPicker() {
    if (!scaleViewPicker) return;
    [{ key: 'full', label: 'Full neck' }, { key: 'position', label: 'Single position' }].forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gc-pick-btn gc-type-btn';
      btn.textContent = opt.label;
      if (opt.key === scaleViewMode) btn.classList.add('is-active');
      btn.addEventListener('click', function () {
        scaleViewMode = opt.key;
        Array.prototype.forEach.call(scaleViewPicker.children, function (c) { c.classList.remove('is-active'); });
        btn.classList.add('is-active');
        if (scaleViewMode === 'position') {
          /* Fresh single-position window centered on whatever fret is in the input. */
          var f = clampFret(parseInt(scaleFretInput.value, 10) || 0);
          posStart = f;
          posEnd = Math.min(MAX_FRET, f + POSITION_SPAN - 1);
        }
        renderScales();
      });
      scaleViewPicker.appendChild(btn);
    });
  }

  function clampFret(f) { return Math.max(0, Math.min(MAX_FRET, f)); }

  function updatePositionControls() {
    if (scalePositionControls) scalePositionControls.classList.toggle('is-visible', scaleViewMode === 'position');
    if (scaleAddLeftBtn) scaleAddLeftBtn.disabled = posStart <= 0;
    if (scaleAddRightBtn) scaleAddRightBtn.disabled = posEnd >= MAX_FRET;
  }

  if (scaleFretInput) scaleFretInput.addEventListener('change', function () {
    var f = clampFret(parseInt(scaleFretInput.value, 10) || 0);
    scaleFretInput.value = f;
    posStart = f;
    posEnd = Math.min(MAX_FRET, f + POSITION_SPAN - 1);
    renderScales();
  });

  /* "Add position" extends the visible window by one hand-position width rather
     than replacing it, so a student can see how adjacent positions connect. */
  if (scaleAddLeftBtn) scaleAddLeftBtn.addEventListener('click', function () {
    posStart = Math.max(0, posStart - POSITION_SPAN);
    renderScales();
  });
  if (scaleAddRightBtn) scaleAddRightBtn.addEventListener('click', function () {
    posEnd = Math.min(MAX_FRET, posEnd + POSITION_SPAN);
    renderScales();
  });

  function renderScales() {
    if (!scaleBoard) return;
    var toneMap = buildToneMap(scaleCurrentRoot, scaleCurrentType);
    /* renderScaleBoard's `startFret` is the fret BEFORE the first shown column (0
       reads as the open position, matching the chord boards elsewhere on this page) —
       so a position window [posStart, posEnd] needs startFret = posStart - 1 to make
       posStart itself the first visible fretted column, unless posStart is 0, where
       the open column already covers it. */
    var startFret = scaleViewMode === 'position' ? (posStart === 0 ? 0 : posStart - 1) : 0;
    var span = scaleViewMode === 'position' ? (posEnd - startFret) : SCALE_SPAN;
    renderScaleBoard(scaleBoard, { startFret: startFret, span: span, toneMap: toneMap });
    updatePositionControls();

    if (scaleMeta) {
      var name = GT.PITCHES[scaleCurrentRoot] + ' ' + scaleCurrentType.name;
      var noteNames = scaleCurrentType.intervals.map(function (iv) { return GT.PITCHES[GT.mod12(scaleCurrentRoot + iv)]; });
      var html = '<h3>' + name + '</h3>';
      html += '<p class="gc-enc-tag">' + scaleCurrentType.degrees.length + '-note scale</p>';
      if (scaleViewMode === 'position') {
        html += '<p class="gc-enc-tag">' + (posStart === 0 ? 'Open position' : 'Frets ' + posStart + '–' + posEnd) + '</p>';
      }
      html += '<p class="gc-enc-notes">Notes: ' + noteNames.join(' – ') + '</p>';
      html += '<p class="gc-enc-notes">Scale degrees: ' + scaleCurrentType.degrees.join(' – ') + '</p>';
      if (scaleCurrentType.mode) {
        var parentRoot = GT.mod12(scaleCurrentRoot - GT.SCALE_TYPES[0].intervals[scaleCurrentType.mode - 1]);
        html += '<p class="gc-enc-notes">' + MODE_ORDINALS[scaleCurrentType.mode] + ' mode of the major scale — the same seven notes as <strong>' + GT.PITCHES[parentRoot] + ' Major</strong>, just starting from ' + GT.PITCHES[scaleCurrentRoot] + '.</p>';
      }
      html += '<p class="gc-enc-formula">' + scaleCurrentType.desc + '</p>';
      scaleMeta.innerHTML = html;
    }
  }

  buildScalePickers();
  buildScaleViewPicker();
  renderScales();

  /* ---------- Practice list: pick specific chords/scales, print a worksheet ---------- */

  var practiceList = [];
  try {
    var savedPractice = JSON.parse(localStorage.getItem('gcPracticeList') || '[]');
    if (Array.isArray(savedPractice)) practiceList = savedPractice;
  } catch (e) { practiceList = []; }

  var practiceListUI = document.getElementById('gcPracticeListUI');
  var practiceSheet = document.getElementById('gcPracticeSheetPrint');

  function savePracticeList() {
    try { localStorage.setItem('gcPracticeList', JSON.stringify(practiceList)); } catch (e) { /* ignore */ }
  }

  function practiceItemKey(item) {
    return item.kind === 'chord'
      ? ['chord', item.rootPC, item.typeSuffix, item.inversionIndex, item.formKey].join('|')
      : ['scale', item.rootPC, item.scaleKey].join('|');
  }

  function addPracticeItem(item) {
    var key = practiceItemKey(item);
    if (practiceList.some(function (p) { return practiceItemKey(p) === key; })) return;
    practiceList.push(item);
    savePracticeList();
    renderPracticeListUI();
  }

  function removePracticeItem(index) {
    practiceList.splice(index, 1);
    savePracticeList();
    renderPracticeListUI();
  }

  function practiceItemLabel(item) {
    if (item.kind === 'chord') {
      var ct = GT.CHORD_TYPES.filter(function (c) { return c.suffix === item.typeSuffix; })[0];
      if (!ct) return { name: 'Unknown chord', sub: '' };
      var sub = (GT.INVERSION_LABELS[item.inversionIndex] || (item.inversionIndex + 'th inversion')) +
        (item.formKey ? ' — ' + item.formKey + '-shape' : '');
      return { name: GT.chordDisplayName(item.rootPC, ct), sub: sub };
    }
    var st = GT.SCALE_TYPES.filter(function (s) { return s.key === item.scaleKey; })[0];
    if (!st) return { name: 'Unknown scale', sub: '' };
    return { name: GT.PITCHES[item.rootPC] + ' ' + st.name, sub: st.degrees.length + '-note scale' };
  }

  function renderPracticeListUI() {
    if (!practiceListUI) return;
    practiceListUI.innerHTML = '';
    practiceList.forEach(function (item, index) {
      var info = practiceItemLabel(item);
      var li = document.createElement('li');
      li.className = 'gc-practice-item';
      var infoWrap = document.createElement('div');
      infoWrap.className = 'gc-practice-item-info';
      infoWrap.innerHTML = '<span class="gc-practice-item-name">' + info.name + '</span><span class="gc-practice-item-sub">' + info.sub + '</span>';
      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'gc-practice-remove';
      removeBtn.setAttribute('aria-label', 'Remove ' + info.name + ' from practice list');
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', function () { removePracticeItem(index); });
      li.appendChild(infoWrap);
      li.appendChild(removeBtn);
      practiceListUI.appendChild(li);
    });
    var clearBtnEl = document.getElementById('gcClearPractice');
    var printBtnEl = document.getElementById('gcPrintPractice');
    if (clearBtnEl) clearBtnEl.disabled = practiceList.length === 0;
    if (printBtnEl) printBtnEl.disabled = practiceList.length === 0;
  }

  var addChordToPracticeBtn = document.getElementById('gcAddChordToPractice');
  if (addChordToPracticeBtn) addChordToPracticeBtn.addEventListener('click', function () {
    addPracticeItem({
      kind: 'chord',
      rootPC: encCurrentRoot,
      typeSuffix: encCurrentType.suffix,
      inversionIndex: encCurrentInversion,
      formKey: encCurrentForm
    });
  });

  var addScaleToPracticeBtn = document.getElementById('gcAddScaleToPractice');
  if (addScaleToPracticeBtn) addScaleToPracticeBtn.addEventListener('click', function () {
    addPracticeItem({ kind: 'scale', rootPC: scaleCurrentRoot, scaleKey: scaleCurrentType.key });
  });

  var clearPracticeBtn = document.getElementById('gcClearPractice');
  if (clearPracticeBtn) clearPracticeBtn.addEventListener('click', function () {
    practiceList = [];
    savePracticeList();
    renderPracticeListUI();
  });

  /* Render every listed chord/scale into the print-only sheet, reusing the
     same board renderers as the live page so diagrams stay in sync with
     whatever chord-shape/scale logic the rest of the lesson uses. */
  function buildPracticeSheet() {
    if (!practiceSheet) return;
    practiceSheet.innerHTML = '';
    var head = document.createElement('div');
    head.className = 'gc-sheet-head';
    head.innerHTML = '<h1>Guitar practice sheet</h1><p>' + practiceList.length + ' item' + (practiceList.length === 1 ? '' : 's') + ' — from the Guitar Chord Encyclopedia</p>';
    practiceSheet.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'gc-sheet-grid';

    practiceList.forEach(function (item) {
      var info = practiceItemLabel(item);
      var cell = document.createElement('div');
      cell.className = 'gc-sheet-item';
      var titleEl = document.createElement('h3');
      titleEl.textContent = info.name;
      var subEl = document.createElement('p');
      subEl.textContent = info.sub;
      cell.appendChild(titleEl);
      cell.appendChild(subEl);
      var boardHost = document.createElement('div');
      cell.appendChild(boardHost);

      if (item.kind === 'chord') {
        var ct = GT.CHORD_TYPES.filter(function (c) { return c.suffix === item.typeSuffix; })[0];
        if (ct) {
          var shape = GT.getChordShape(item.rootPC, ct, item.inversionIndex, item.formKey);
          var degrees = GT.computeDegrees(item.rootPC, ct, shape.frets);
          var numericFrets = shape.frets.filter(function (f) { return typeof f === 'number' && f > 0; });
          var maxFret = numericFrets.length ? Math.max.apply(null, numericFrets) : 0;
          var minFret = numericFrets.length ? Math.min.apply(null, numericFrets) : 0;
          var startFret = maxFret > GT.BUILD_FRETS - 1 ? Math.max(0, minFret - 1) : 0;
          renderBoard(boardHost, { startFret: startFret, span: GT.BUILD_FRETS, frets: shape.frets, fingers: shape.fingers, degrees: degrees, interactive: false });
          var fingerLine = document.createElement('p');
          fingerLine.textContent = 'Fingering: ' + fingerSummary(shape.fingers);
          cell.appendChild(fingerLine);
        }
      } else {
        var st = GT.SCALE_TYPES.filter(function (s) { return s.key === item.scaleKey; })[0];
        if (st) {
          var toneMap = buildToneMap(item.rootPC, st);
          renderScaleBoard(boardHost, { startFret: 0, span: SCALE_SPAN, toneMap: toneMap });
          var notesLine = document.createElement('p');
          notesLine.textContent = 'Notes: ' + st.intervals.map(function (iv) { return GT.PITCHES[GT.mod12(item.rootPC + iv)]; }).join(' – ');
          cell.appendChild(notesLine);
        }
      }
      grid.appendChild(cell);
    });

    practiceSheet.appendChild(grid);
  }

  var printPracticeBtn = document.getElementById('gcPrintPractice');
  if (printPracticeBtn) printPracticeBtn.addEventListener('click', function () {
    if (!practiceList.length) return;
    buildPracticeSheet();
    document.body.classList.add('gc-printing-practice');
    window.print();
  });
  window.addEventListener('afterprint', function () {
    document.body.classList.remove('gc-printing-practice');
  });

  renderPracticeListUI();

  /* ---------- Quiz ---------- */
  var checkBtn = document.getElementById('gcCheckQuiz');
  if (checkBtn) checkBtn.addEventListener('click', function () {
    var quiz = document.getElementById('gcQuiz');
    var total = quiz.querySelectorAll('fieldset').length;
    var correct = 0;
    quiz.querySelectorAll('fieldset').forEach(function (fs) {
      var picked = fs.querySelector('input:checked');
      if (picked && picked.value === 'correct') correct++;
    });
    var out = document.getElementById('gcQuizResult');
    out.textContent = correct === total ? 'All ' + total + ' correct — you can read a chord like a fretboard now.' : correct + ' of ' + total + ' correct. Review the sections above and try again.';
  });
});
