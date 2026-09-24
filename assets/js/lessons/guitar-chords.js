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

  /* Real-world open-string pitch in Hz (standard tuning, A440), low E to high e —
     used for audio playback only; everything above this line works in pitch
     classes (0-11) with no notion of octave. */
  var OPEN_FREQ = [82.407, 110.000, 146.832, 195.998, 246.942, 329.628];

  function noteFreq(stringIndexLowToHigh, fret) {
    return OPEN_FREQ[stringIndexLowToHigh] * Math.pow(2, fret / 12);
  }

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
    { suffix: 'm7b5', name: 'Half-diminished 7th', intervals: [0,3,6,10] },
    { suffix: 'dim7', name: 'Diminished 7th', intervals: [0,3,6,9] },
    { suffix: '7sus4', name: 'Dominant 7sus4', intervals: [0,5,7,10] },
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
    },
    /* The remaining eight chord types only get the two movable forms every
       guitarist actually reaches for (root on the low E string, or root on the
       A string) — there's no widely-played C/G/D-shape version of an add9 or a
       power chord the way there is for plain major/minor/7th/maj7/m7. Every
       shape below is verified by direct interval arithmetic (each produces
       exactly the chord's own pitch classes, nothing else) rather than
       transcribed from memory. */
    'sus2': { E: [0, 2, 4, 4, 0, 0], A: [null, 0, 2, 2, 0, 0] },
    'sus4': { E: [0, 2, 2, 2, 0, 0], A: [null, 0, 2, 2, 3, 0] },
    'dim': { E: [0, 1, null, 0, null, null], A: [null, 0, 1, null, 1, null] },
    'aug': { E: [0, 3, 2, 1, 1, 0], A: [null, 0, 3, 2, 2, 1] },
    '6': { E: [0, 2, 2, 1, 2, 0], A: [null, 0, 2, 2, 2, 2] },
    'm6': { E: [0, 2, 2, 0, 2, 0], A: [null, 0, 2, 2, 1, 2] },
    'add9': { E: [0, 2, 4, 1, 0, 0], A: [null, 0, 2, 4, 2, 0] },
    '5': { E: [0, 2, 2, null, null, null], A: [null, 0, 2, 2, null, null] }
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
    { key: 'majorPent', name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9], degrees: ['1', '2', '3', '5', '6'], mode: null, desc: 'The major scale with the 4th and 7th removed — no half-steps within the scale; consonance still depends on the chord beneath it.' },
    { key: 'minorPent', name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10], degrees: ['1', '♭3', '4', '5', '♭7'], mode: null, desc: 'The natural minor scale with the 2nd and 6th removed — the rock and blues soloing staple.' },
    { key: 'blues', name: 'Blues', intervals: [0, 3, 5, 6, 7, 10], degrees: ['1', '♭3', '4', '♭5', '5', '♭7'], mode: null, desc: 'Minor pentatonic plus a chromatic ♭5 "blue note" passing between the 4th and 5th.' },
    { key: 'harmonicMinor', name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11], degrees: ['1', '2', '♭3', '4', '5', '♭6', '7'], mode: null, desc: 'Natural minor with a raised 7th, opening a dramatic step-and-a-half gap between the sixth and seventh degrees.' },
    { key: 'melodicMinor', name: 'Melodic Minor', intervals: [0, 2, 3, 5, 7, 9, 11], degrees: ['1', '2', '♭3', '4', '5', '6', '7'], mode: null, desc: 'Natural minor with a raised 6th and 7th — the jazz form uses these notes both ways; classical melodic minor commonly descends as natural minor.' }
  ];

  [
    {base:[0,2,3,5,7,8,11], prefix:'hm', names:['Harmonic minor','Locrian ♮6','Ionian ♯5','Dorian ♯4','Phrygian dominant','Lydian ♯2','Ultralocrian']},
    {base:[0,2,3,5,7,9,11], prefix:'mm', names:['Jazz melodic minor','Dorian ♭2','Lydian augmented','Lydian dominant','Mixolydian ♭6','Locrian ♮2','Altered (super Locrian)']}
  ].forEach(function(family) {
    for(var m=1;m<7;m++) {
      var intervals=family.base.map(function(_,i) { return (family.base[(i+m)%7]-family.base[m]+12)%12; });
      var major=[0,2,4,5,7,9,11];
      var degrees=intervals.map(function(iv,i) { var diff=iv-major[i]; return (diff<0?'♭'.repeat(-diff):'♯'.repeat(diff))+(i+1); });
      SCALE_TYPES.push({key:family.prefix+m,name:family.names[m],intervals:intervals,degrees:degrees,mode:null,desc:'Mode '+(m+1)+' of '+family.names[0]+'. Establish the selected tonic as home; practice its distinctive altered degrees slowly.'});
    }
  });
  SCALE_TYPES.push(
    {key:'wholeTone',name:'Whole tone',intervals:[0,2,4,6,8,10],degrees:['1','2','3','♯4','♯5','♭7'],desc:'Six equally spaced notes, a whole step apart.'},
    {key:'diminishedHW',name:'Diminished (half–whole)',intervals:[0,1,3,4,6,7,9,10],degrees:['1','♭2','♭3','3','♯4','5','6','♭7'],desc:'Alternate half steps and whole steps; often used over altered dominant harmony.'},
    {key:'diminishedWH',name:'Diminished (whole–half)',intervals:[0,2,3,5,6,8,9,11],degrees:['1','2','♭3','4','♭5','♭6','6','7'],desc:'Alternate whole steps and half steps; relates to diminished seventh harmony.'},
    {key:'chromatic',name:'Chromatic',intervals:[0,1,2,3,4,5,6,7,8,9,10,11],degrees:['1','♭2','2','♭3','3','4','♯4','5','♭6','6','♭7','7'],desc:'All twelve pitch classes. Use a shift when a route exceeds one hand position.'}
  );

  function mod12(n) { return ((n % 12) + 12) % 12; }

  function sortedIntervals(chordType) {
    return chordType.intervals.slice(); // harmonic order: an added ninth follows the triad
  }

  var INVERSION_LABELS = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];

  /* The fret nearest `anchorFret` on a given string that plays pitch class `pc`
     (searching both directions, since the same note repeats every 12 frets).
     Anchoring to the bass note's fret — instead of always grabbing whichever
     fret is lowest in absolute terms — is what keeps a computed voicing within
     a single hand's reach instead of scattering notes across the whole neck. */
  function nearestFretForPC(stringOpenPC, pc, anchorFret, maxFret) {
    var base = mod12(pc - stringOpenPC);
    var best = null;
    [base, base + 12, base - 12].forEach(function (fret) {
      if (fret < 0 || fret > maxFret) return;
      if (best === null || Math.abs(fret - anchorFret) < Math.abs(best - anchorFret)) best = fret;
    });
    return best;
  }

  /* Compute a fretting with a specific chord tone forced into the bass on the low
     E string (the only string that can reach any pitch class within an open-position
     octave), then guarantee every remaining chord tone appears somewhere else in the
     voicing — clustered near the bass note's fret, the way a hand actually reaches —
     before any string is allowed to double a tone. A naive "first tone found" search
     per string can both strand a required tone off the fretboard entirely (e.g. a
     1st-inversion Cmaj7 could omit the root C completely) and, if it always grabs the
     globally-lowest fret regardless of where the bass note sits, produce shapes no
     hand can actually play — a bass note at fret 9 with other tones computed at fret
     1. Both are avoided here. */
  function autoVoiceInversion(rootPC, chordType, inversionIndex) {
    return findVoicings(rootPC, chordType, inversionIndex)[0] || TUNING.map(function () { return 'x'; });
  }

  // Enumerate compact grips; validate actual pitch order, coverage and finger use.
  var voicingCache = {};
  function findVoicings(rootPC, chordType, inversionIndex, kind) {
    kind = kind || 'any';
    var key = [rootPC, chordType.suffix, inversionIndex, kind].join('|');
    if (voicingCache[key]) return voicingCache[key];
    var ivs = sortedIntervals(chordType), bass = mod12(rootPC + ivs[inversionIndex]);
    var pcs = ivs.map(function (iv) { return mod12(rootPC + iv); });
    var found = [], seen = {};
    for (var start = 1; start <= 12; start++) {
      var choices = TUNING.map(function (t) {
        var out = ['x'];
        for (var f = 0; f <= 15; f++) {
          if (f && (f < start || f > start + 3)) continue;
          if (pcs.indexOf(mod12(t.openPC + f)) >= 0) out.push(f);
        }
        return out;
      });
      function visit(grip) {
        if (grip.length < 6) { choices[grip.length].forEach(function (f) { visit(grip.concat(f)); }); return; }
        var id = grip.join(','); if (seen[id]) return; seen[id] = true;
        var notes = grip.map(function (f, i) { return typeof f === 'number' ? [40,45,50,55,59,64][i] + f : null; }).filter(function (n) { return n !== null; }).sort(function (a,b) { return a-b; });
        if (!notes.length || mod12(notes[0]) !== bass) return;
        if (!pcs.every(function (pc) { return notes.some(function (n) { return mod12(n) === pc; }); })) return;
        if (computeFingering(grip).indexOf('?') >= 0) return;
        if (kind === 'close' && (notes.length !== pcs.length || notes[notes.length-1]-notes[0] >= 12)) return;
        if (kind === 'drop2' || kind === 'drop3') {
          if (notes.length !== 4 || pcs.length !== 4) return;
          var restored = notes.slice(1).concat(notes[0]+12).sort(function (a,b) { return a-b; });
          var rank = kind === 'drop2' ? 2 : 1;
          if (restored[rank] !== notes[0]+12 || restored[3]-restored[0] >= 12) return;
        }
        var fretted = grip.filter(function (f) { return typeof f === 'number' && f > 0; });
        var span = fretted.length ? Math.max.apply(null,fretted)-Math.min.apply(null,fretted) : 0;
        var score = span*8 + (fretted.length ? Math.max.apply(null,fretted) : 0) + notes.length*2;
        found.push({grip:grip,score:score});
      }
      visit([]);
    }
    found.sort(function(a,b) { return a.score-b.score; });
    return voicingCache[key] = found.map(function(x) { return x.grip; });
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

  /* Whichever movable form lands lowest on the neck for this root — the shape a
     guitarist would actually reach for first — used to pick the "Standard"
     voicing for any root/type that has no traditional open-position shape,
     instead of leaving it to fall back to a generic computed grip. */
  function bestDefaultForm(rootPC, chordType) {
    var best = null, bestMax = Infinity;
    availableForms(rootPC, chordType).forEach(function (formKey) {
      var frets = barreShape(rootPC, chordType, formKey);
      if (!frets) return;
      var nums = frets.filter(function (f) { return typeof f === 'number'; });
      var maxFret = nums.length ? Math.max.apply(null, nums) : Infinity;
      if (maxFret < bestMax) { bestMax = maxFret; best = formKey; }
    });
    return best;
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

  // A barre may cross higher fretted notes, but never an open/lower note.
  // Separate equal-fret groups need separate fingers; never clamp to finger 4.
  function computeFingering(frets) {
    var groups = [];
    frets.forEach(function(f, i) {
      if (typeof f !== 'number' || f === 0) return;
      var group = groups.find(function(g) {
        return g.fret === f && frets.slice(g.last+1,i).every(function(v) { return v === 'x' || v >= f; });
      });
      if (group) { group.strings.push(i); group.last=i; }
      else groups.push({fret:f,last:i,strings:[i]});
    });
    groups.sort(function(a,b) { return a.fret-b.fret || a.last-b.last; });
    var result = frets.map(function(f) { return f === 0 ? 'o' : 'x'; });
    groups.forEach(function(g,i) { g.strings.forEach(function(n) { result[n] = groups.length > 4 ? '?' : i+1; }); });
    return result;
  }

  function rawChordShape(rootPC, chordType, inversionIndex, formKey) {
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
    /* No traditional open-position shape for this exact root/type — reach for
       the best available movable form (lowest resulting fret = easiest reach)
       before falling back to a generic computed voicing, so e.g. F#m or Bb7
       default to a real, commonly-played barre chord. */
    if (inversionIndex === 0 && !formKey) {
      var defaultForm = bestDefaultForm(rootPC, chordType);
      if (defaultForm) {
        var dFrets = barreShape(rootPC, chordType, defaultForm);
        if (dFrets) {
          return { frets: dFrets, fingers: computeFingering(dFrets), source: 'barre-' + defaultForm, key: key, inversionIndex: 0 };
        }
      }
    }
    var frets = autoVoiceInversion(rootPC, chordType, inversionIndex);
    return { frets: frets, fingers: computeFingering(frets), source: 'computed', key: key, inversionIndex: inversionIndex };
  }

  function getChordShape(rootPC, chordType, inversionIndex, formKey) {
    var shape = rawChordShape(rootPC,chordType,inversionIndex,formKey);
    var nums = shape.frets.filter(function(f) { return typeof f === 'number' && f>0; });
    var fingers = computeFingering(shape.frets);
    var detected = detectChords(shape.frets);
    var expected = mod12(rootPC + sortedIntervals(chordType)[inversionIndex || 0]);
    if (fingers.indexOf('?')>=0 || (nums.length && Math.max.apply(null,nums)-Math.min.apply(null,nums)>3) || detected.bassPC !== expected) {
      shape.frets = autoVoiceInversion(rootPC,chordType,inversionIndex || 0);
      shape.fingers = computeFingering(shape.frets); shape.source = 'computed';
    }
    return shape;
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

    var bassPC = notes.reduce(function(a,b) { return noteFreq(a.stringIndex,a.fret) < noteFreq(b.stringIndex,b.fret) ? a : b; }).pc;

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
        /* A voicing missing only the perfect 5th (interval 7) still reads —
           and is still written and named — as the full chord: guitarists
           routinely drop the 5th on 4-tone chords (the open C7 shape, x32310,
           does this), and the 3rd/7th alone already establish the quality. */
        var ref5 = ref.length > 3 && ref.indexOf(7) !== -1
          ? ref.filter(function (v) { return v !== 7; })
          : null;
        var isMatch = ref.length === intervalSet.length && ref.every(function (v, i) { return v === intervalSet[i]; });
        var isNoFifthMatch = !isMatch && ref5 && ref5.length === intervalSet.length && ref5.every(function (v, i) { return v === intervalSet[i]; });
        if (isMatch || isNoFifthMatch) {
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
    findVoicings: findVoicings,
    PITCHES: PITCHES,
    TUNING: TUNING,
    STRINGS_TOPDOWN: STRINGS_TOPDOWN,
    OPEN_FREQ: OPEN_FREQ,
    noteFreq: noteFreq,
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

/* guitar-chords.js — plucked-string synth (Karplus-Strong), no audio assets */
(function () {
  'use strict';

  var ctx = null, sources = new Set(), volume = 0.45;
  function stop() { sources.forEach(function(src) { try { src.stop(); } catch(e) {} }); sources.clear(); }
  function getContext() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* Karplus-Strong: a ring buffer of noise, repeatedly averaged-and-damped one
     period at a time, is the classic minimal model of a plucked, decaying string —
     it's what makes this sound like a plucked string rather than a synth tone. */
  function pluckBuffer(audioCtx, freq, duration) {
    var sampleRate = audioCtx.sampleRate;
    var length = Math.max(2, Math.floor(sampleRate * duration));
    var buffer = audioCtx.createBuffer(1, length, sampleRate);
    var data = buffer.getChannelData(0);
    var period = Math.max(2, Math.round(sampleRate / freq));
    var ring = new Float32Array(period);
    for (var i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
    var idx = 0, prev = 0, damping = 0.994;
    for (var n = 0; n < length; n++) {
      var cur = ring[idx];
      data[n] = cur;
      ring[idx] = damping * 0.5 * (cur + prev);
      prev = cur;
      idx = (idx + 1) % period;
    }
    return buffer;
  }

  /* Pluck one note. `opts.delay` offsets the start time (seconds from now) so
     chords can be strummed or arpeggiated by calling this repeatedly. */
  function pluck(freq, opts) {
    opts = opts || {};
    var audioCtx = getContext();
    if (!audioCtx || !freq) return;
    var now = audioCtx.currentTime + (opts.delay || 0);
    var duration = opts.duration || 1.7;
    var src = audioCtx.createBufferSource();
    src.buffer = pluckBuffer(audioCtx, freq, duration);

    var body = audioCtx.createBiquadFilter();
    body.type = 'lowpass';
    body.frequency.value = Math.min(9000, freq * 9 + 1200);

    var gain = audioCtx.createGain();
    var peak = (opts.gain != null ? opts.gain : 0.32) * volume;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(body);
    body.connect(gain);
    gain.connect(audioCtx.destination);
    sources.add(src);
    src.onended = function() { sources.delete(src); src.disconnect(); body.disconnect(); gain.disconnect(); };
    src.start(now);
    src.stop(now + duration + 0.05);
  }

  /* All notes together with a short low-to-high offset, like a downstroke. */
  function strum(freqs, opts) {
    opts = opts || {};
    var spread = opts.spread != null ? opts.spread : 0.02;
    freqs.forEach(function (f, i) {
      pluck(f, { delay: i * spread, duration: opts.duration, gain: opts.gain });
    });
  }

  /* Notes one at a time, evenly spaced — arpeggios and scale runs. */
  function sequence(freqs, opts) {
    opts = opts || {};
    var interval = opts.interval != null ? opts.interval : 0.26;
    freqs.forEach(function (f, i) {
      pluck(f, { delay: i * interval, duration: opts.duration || interval * 2.6, gain: opts.gain });
    });
  }

  window.GuitarAudio = { stop: stop, setVolume: function(v) { volume = v; }, pluck: pluck, strum: strum, sequence: sequence, getContext: getContext };
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
    /* Read-only boards still let a student click any sounding dot to hear its
       pitch — that's independent of edit mode, which is builder-only. */
    var playable = !interactive && opts.playable !== false;

    container.innerHTML = '';
    var board = document.createElement('div');
    board.className = 'gc-board' + (interactive ? ' is-interactive' : '') + (playable ? ' is-playable' : '');
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
      } else if (playable && val === 0) {
        openCell.addEventListener('click', function () {
          if (window.GuitarAudio) window.GuitarAudio.pluck(GT.noteFreq(stringIndexLowToHigh, 0));
        });
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
        } else if (playable && val === fret) {
          cell.addEventListener('click', function (fretNum) {
            return function () {
              if (window.GuitarAudio) window.GuitarAudio.pluck(GT.noteFreq(stringIndexLowToHigh, fretNum));
            };
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

  /* ---------- Chord/arpeggio playback (shared by builder + encyclopedia) ---------- */

  function fretsToFreqs(frets) {
    var out = [];
    frets.forEach(function (f, i) {
      if (typeof f === 'number') out.push(GT.noteFreq(i, f));
    });
    return out;
  }

  /* mode: 'strum' (all notes, low-to-high sweep), 'up'/'down' (arpeggio in that
     direction), 'updown' (up then back down without repeating the top note). */
  function playFrets(frets, mode) {
    if (!window.GuitarAudio) return;
    window.GuitarAudio.stop();
    var freqs = fretsToFreqs(frets);
    if (!freqs.length) return;
    if (mode === 'strum') window.GuitarAudio.strum(freqs);
    else if (mode === 'down') window.GuitarAudio.sequence(freqs.slice().reverse());
    else if (mode === 'updown') window.GuitarAudio.sequence(freqs.concat(freqs.slice(0, -1).reverse()));
    else window.GuitarAudio.sequence(freqs);
  }

  /* ---------- Builder (place-your-own-notes) ---------- */

  var builderState = [null, null, null, null, null, null]; /* low E..high e, value = fret number, 'x', or null */
  var builderBoard = document.getElementById('gcBuilderBoard');
  var builderResult = document.getElementById('gcBuilderResult');
  var builderNotes = document.getElementById('gcBuilderNotes');
  var challengeBtn = document.getElementById('gcChallengeBuilder');
  var challengeReadout = document.getElementById('gcChallengeReadout');
  var challenge = null; /* {root, type} while a build challenge is open */

  /* Did the student's grip spell the challenge chord (any inversion counts)? */
  function challengeStatus(detection) {
    if (!challenge || !detection.notes.length) return '';
    var hit = detection.matches.some(function (m) { return m.root === challenge.root && m.chordType === challenge.type; });
    if (hit) return '<p class="gc-challenge-status is-solved" role="status"><strong>Challenge solved:</strong> that is ' + GT.chordDisplayName(challenge.root, challenge.type) + '. Strum it, then ask for another.</p>';
    var need = challenge.type.intervals.map(function (iv) { return GT.mod12(challenge.root + iv); });
    var missing = need.filter(function (pc) { return detection.uniquePCs.indexOf(pc) < 0; });
    var extra = detection.uniquePCs.filter(function (pc) { return need.indexOf(pc) < 0; });
    var parts = [];
    if (missing.length) parts.push('still missing ' + missing.map(function (pc) { return GT.PITCHES[pc]; }).join(', '));
    if (extra.length) parts.push('remove or mute ' + extra.map(function (pc) { return GT.PITCHES[pc]; }).join(', '));
    return '<p class="gc-challenge-status" role="status"><strong>Not yet:</strong> ' + parts.join('; ') + '.</p>';
  }

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
        var placing = builderState[stringIdx] !== fret;
        builderState[stringIdx] = placing ? fret : null;
        renderBuilder();
        if (placing && window.GuitarAudio) window.GuitarAudio.pluck(GT.noteFreq(stringIdx, fret));
      },
      onOpenClick: function (stringIdx) {
        var cur = builderState[stringIdx];
        if (cur === 0) builderState[stringIdx] = 'x';
        else if (cur === 'x' || cur === null || cur === undefined) builderState[stringIdx] = 0;
        else builderState[stringIdx] = 0;
        renderBuilder();
        if (builderState[stringIdx] === 0 && window.GuitarAudio) window.GuitarAudio.pluck(GT.noteFreq(stringIdx, 0));
      }
    });
    updateBuilderResult(detection);
  }

  function updateBuilderResult(detection) {
    if (!builderResult) return;
    detection = detection || GT.detectChords(builderState);

    if (detection.notes.length === 0) {
      builderResult.innerHTML = (challenge ? '<p class="gc-challenge-status">Place notes to build ' + GT.chordDisplayName(challenge.root, challenge.type) + '.</p>' : '') + '<p class="gc-result-empty">Click frets on the board above to place notes. Click a string\'s label to toggle it between muted (&times;) and open.</p>';
      if (builderNotes) builderNotes.textContent = '';
      return;
    }

    var status = challengeStatus(detection);
    var noteNames = detection.notes.map(function (n) { return GT.PITCHES[n.pc]; });
    if (builderNotes) builderNotes.textContent = 'Notes played (low to high): ' + noteNames.join(' – ');

    if (detection.matches.length === 0) {
      builderResult.innerHTML = '<p class="gc-result-none"><strong>Not a standard chord in our dictionary.</strong> That\'s OK — not every combination of notes has a name. Compare it with the chord formulas above, or clear and try again.</p>' + status;
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
    builderResult.innerHTML = status + html;
  }

  var clearBtn = document.getElementById('gcClearBuilder');
  if (clearBtn) clearBtn.addEventListener('click', function () {
    builderState = [null, null, null, null, null, null];
    renderBuilder();
  });

  if (challengeBtn) challengeBtn.addEventListener('click', function () {
    var root, type;
    do {
      root = Math.floor(Math.random() * 12);
      type = GT.CHORD_TYPES[Math.floor(Math.random() * 5)];
    } while (challenge && challenge.root === root && challenge.type === type);
    challenge = { root: root, type: type };
    var tones = type.intervals.map(function (iv) { return GT.PITCHES[GT.mod12(root + iv)]; });
    challengeReadout.textContent = 'Build ' + GT.chordDisplayName(root, type) + ' (' + type.name + '): intervals ' +
      type.intervals.join(', ') + ' semitones above the root. Hint: you need ' + tones.join(', ') + '.';
    challengeBtn.textContent = 'Give me a different chord';
    updateBuilderResult();
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-load-grip]'), function (btn) {
    btn.addEventListener('click', function () {
      builderState = btn.getAttribute('data-load-grip').split(',').map(function (f) { return f === 'x' ? 'x' : Number(f); });
      renderBuilder();
      playFrets(builderState, 'strum');
    });
  });

  var builderPlayStrum = document.getElementById('gcPlayStrum');
  var builderPlayArpUp = document.getElementById('gcPlayArpUp');
  var builderPlayArpDown = document.getElementById('gcPlayArpDown');
  var builderPlayArpUpDown = document.getElementById('gcPlayArpUpDown');
  if (builderPlayStrum) builderPlayStrum.addEventListener('click', function () { playFrets(builderState, 'strum'); });
  if (builderPlayArpUp) builderPlayArpUp.addEventListener('click', function () { playFrets(builderState, 'up'); });
  if (builderPlayArpDown) builderPlayArpDown.addEventListener('click', function () { playFrets(builderState, 'down'); });
  if (builderPlayArpUpDown) builderPlayArpUpDown.addEventListener('click', function () { playFrets(builderState, 'updown'); });

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
    return 'Compact computed grip — check comfort slowly; mute every × string';
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
      var bassNote = detection.notes.length ? GT.PITCHES[detection.bassPC] : '';
      var degreeLine = degrees.filter(function (d) { return d; }).map(function (d) { return d.label; }).join(' – ');
      encMeta.innerHTML = '<h3>' + name + (encCurrentInversion === 0 ? '' : ' / ' + bassNote) + '</h3>' +
        '<p class="gc-enc-tag">' + tag + '</p>' +
        '<p class="gc-enc-notes"><strong>' + invLabel + '</strong> — bass note ' + bassNote + '</p>' +
        '<p class="gc-enc-notes">Notes: ' + notesLine + '</p>' +
        '<p class="gc-enc-notes">Intervals from the root (low string → high string): ' + degreeLine + '</p>' +
        '<p class="gc-enc-notes">Suggested fingers (low string → high string): ' + fingerSummary(shape.fingers) + '</p>' +
        '<p class="gc-enc-notes">Frets (low E → high e): ' + shape.frets.join(' – ') + '. Repeated finger numbers indicate a barre. A compact grip is not a guarantee of individual comfort.</p>' +
        '<p class="gc-enc-formula">Formula: root' + encCurrentType.intervals.slice(1).map(function (i) { return ' + ' + i; }).join('') + ' semitones from ' + GT.PITCHES[encCurrentRoot] + '</p>';
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

  function currentEncFrets() {
    return GT.getChordShape(encCurrentRoot, encCurrentType, encCurrentInversion, encCurrentForm).frets;
  }
  var encPlayStrum = document.getElementById('gcEncPlayStrum');
  var encPlayArpUp = document.getElementById('gcEncPlayArpUp');
  var encPlayArpDown = document.getElementById('gcEncPlayArpDown');
  var encPlayArpUpDown = document.getElementById('gcEncPlayArpUpDown');
  if (encPlayStrum) encPlayStrum.addEventListener('click', function () { playFrets(currentEncFrets(), 'strum'); });
  if (encPlayArpUp) encPlayArpUp.addEventListener('click', function () { playFrets(currentEncFrets(), 'up'); });
  if (encPlayArpDown) encPlayArpDown.addEventListener('click', function () { playFrets(currentEncFrets(), 'down'); });
  if (encPlayArpUpDown) encPlayArpUpDown.addEventListener('click', function () { playFrets(currentEncFrets(), 'updown'); });

  /* ---------- Diatonic triad ladder (root / 1st inv / 2nd inv walk-up) ----------
     The seven triads built on each degree of the C major scale, root-to-root —
     the classic voice-leading drill: play them root position (big jumps), then
     the same seven chords in 1st and 2nd inversion (each neighbor barely moves,
     since only one note changes). The 8th entry repeats the tonic to close the
     ladder back home. */
  var DIATONIC_TRIADS = [
    { root: 0, suffix: '' }, { root: 2, suffix: 'm' }, { root: 4, suffix: 'm' },
    { root: 5, suffix: '' }, { root: 7, suffix: '' }, { root: 9, suffix: 'm' },
    { root: 11, suffix: 'dim' }, { root: 0, suffix: '' }
  ];
  var DIATONIC_ROMANS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'I'];
  var LADDER_SPAN = 6;
  var LADDER_CHORD_GAP = 0.85;

  function ladderChordType(suffix) {
    return GT.CHORD_TYPES.filter(function (ct) { return ct.suffix === suffix; })[0];
  }

  function ladderShapes(inversionIndex) {
    return DIATONIC_TRIADS.map(function (entry) {
      return GT.getChordShape(entry.root, ladderChordType(entry.suffix), inversionIndex, null).frets;
    });
  }

  function renderLadderStrip(containerId, inversionIndex) {
    var strip = document.getElementById(containerId);
    if (!strip) return;
    strip.innerHTML = '';
    DIATONIC_TRIADS.forEach(function (entry, i) {
      var ct = ladderChordType(entry.suffix);
      var shape = GT.getChordShape(entry.root, ct, inversionIndex, null);
      var degrees = GT.computeDegrees(entry.root, ct, shape.frets);
      var numericFrets = shape.frets.filter(function (f) { return typeof f === 'number' && f > 0; });
      var maxFret = numericFrets.length ? Math.max.apply(null, numericFrets) : 0;
      var minFret = numericFrets.length ? Math.min.apply(null, numericFrets) : 0;
      var startFret = maxFret > LADDER_SPAN - 1 ? Math.max(0, minFret - 1) : 0;

      var card = document.createElement('div');
      card.className = 'gc-ladder-chord';
      var label = document.createElement('p');
      label.className = 'gc-ladder-chord-label';
      label.innerHTML = '<strong>' + GT.chordDisplayName(entry.root, ct) + '</strong><span>' + DIATONIC_ROMANS[i] + '</span>';
      card.appendChild(label);
      var boardHost = document.createElement('div');
      card.appendChild(boardHost);
      renderBoard(boardHost, { startFret: startFret, span: LADDER_SPAN, frets: shape.frets, fingers: shape.fingers, degrees: degrees, interactive: false, playable: true });
      strip.appendChild(card);
    });
  }

  /* Plays a series of chords, each strummed low-to-high, spaced chordGap seconds apart. */
  function playChordSequence(shapesArray, chordGap) {
    if (!window.GuitarAudio) return;
    var strumSpread = 0.02;
    shapesArray.forEach(function (frets, chordIdx) {
      fretsToFreqs(frets).forEach(function (freq, noteIdx) {
        window.GuitarAudio.pluck(freq, { delay: chordIdx * chordGap + noteIdx * strumSpread });
      });
    });
  }

  var ladderInversion = 0;
  renderLadderStrip('gcLadderStrip', ladderInversion);
  var ladderInvPicker = document.getElementById('gcLadderInvPicker');
  if (ladderInvPicker) Array.prototype.forEach.call(ladderInvPicker.children, function (btn) {
    btn.addEventListener('click', function () {
      ladderInversion = parseInt(btn.getAttribute('data-inversion'), 10);
      Array.prototype.forEach.call(ladderInvPicker.children, function (c) { c.classList.toggle('is-active', c === btn); });
      renderLadderStrip('gcLadderStrip', ladderInversion);
    });
  });
  var ladderPlay = document.getElementById('gcLadderPlay');
  if (ladderPlay) ladderPlay.addEventListener('click', function () {
    playChordSequence(ladderShapes(ladderInversion), LADDER_CHORD_GAP);
  });

  var ladderPlayAll = document.getElementById('gcLadderPlayAll');
  if (ladderPlayAll) ladderPlayAll.addEventListener('click', function () {
    playChordSequence(ladderShapes(0).concat(ladderShapes(1)).concat(ladderShapes(2)), LADDER_CHORD_GAP);
  });

  var ladderAddPractice = document.getElementById('gcLadderAddPractice');
  if (ladderAddPractice) ladderAddPractice.addEventListener('click', function () {
    var count = 0;
    [0, 1, 2].forEach(function (inv) {
      DIATONIC_TRIADS.slice(0, 7).forEach(function (entry) {
        if (addPracticeItem({ kind: 'chord', rootPC: entry.root, typeSuffix: entry.suffix, inversionIndex: inv, formKey: null })) count++;
      });
    });
    flashButton(ladderAddPractice, count ? '✓ Added ' + count + ' chords' : 'Already in your list');
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
    var playable = opts.playable !== false;

    container.innerHTML = '';
    var board = document.createElement('div');
    board.className = 'gc-board' + (playable ? ' is-playable' : '');
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
      var stringIndexLowToHigh = GT.TUNING.indexOf(str);
      var row = document.createElement('div');
      row.className = 'gc-row';
      row.setAttribute('data-string', str.label + str.num);

      /* Open strings only sound at fret 0 — once the window starts higher up the
         neck, that column is just a position marker, not a playable open note. */
      var openTone = startFret === 0 ? toneMap[GT.mod12(str.openPC)] : null;
      var openCell = document.createElement('button');
      openCell.type = 'button';
      openCell.className = 'gc-cell gc-open-cell';
      openCell.setAttribute('aria-label', str.label + ' string, open' + (openTone ? ', scale tone ' + openTone.label : ''));
      openCell.innerHTML = '<span class="gc-string-tag">' + str.label + '</span>' + (openTone ? dotHTML(openTone) : '');
      if (playable && openTone) {
        openCell.addEventListener('click', function () {
          if (window.GuitarAudio) window.GuitarAudio.pluck(GT.noteFreq(stringIndexLowToHigh, 0));
        });
      } else {
        openCell.disabled = true;
      }
      row.appendChild(openCell);

      for (var fret = startFret + 1; fret <= startFret + span; fret++) {
        var tone = toneMap[GT.mod12(str.openPC + fret)];
        var cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'gc-cell';
        cell.setAttribute('aria-label', str.label + ' string, fret ' + fret + (tone ? ', scale tone ' + tone.label : ''));
        if (tone) {
          cell.classList.add('has-note');
          cell.innerHTML = dotHTML(tone);
          if (playable) {
            cell.addEventListener('click', function (fretNum) {
              return function () {
                if (window.GuitarAudio) window.GuitarAudio.pluck(GT.noteFreq(stringIndexLowToHigh, fretNum));
              };
            }(fret));
          } else {
            cell.disabled = true;
          }
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
    if (scaleTypePicker && scaleTypePicker.tagName === 'SELECT') {
      var groups = [
        ['Major-scale modes', function (st) { return !!st.mode; }],
        ['Pentatonic & blues', function (st) { return /Pent|blues/.test(st.key); }],
        ['Minor variations', function (st) { return st.key === 'harmonicMinor' || st.key === 'melodicMinor'; }],
        ['Modes of harmonic minor', function (st) { return /^hm\d/.test(st.key); }],
        ['Modes of melodic minor', function (st) { return /^mm\d/.test(st.key); }],
        ['Symmetric scales', function (st) { return /wholeTone|diminished|chromatic/.test(st.key); }]
      ];
      groups.forEach(function (g) {
        var og = document.createElement('optgroup');
        og.label = g[0];
        GT.SCALE_TYPES.filter(g[1]).forEach(function (st) {
          var o = document.createElement('option');
          o.value = st.key; o.textContent = st.name;
          og.appendChild(o);
        });
        scaleTypePicker.appendChild(og);
      });
      scaleTypePicker.addEventListener('change', function () {
        scaleCurrentType = GT.SCALE_TYPES.filter(function (st) { return st.key === scaleTypePicker.value; })[0];
        renderScales();
      });
    } else if (scaleTypePicker) {
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

  function makeScaleRoute(root,scale) {
    var opens=[40,45,50,55,59,64], tonic=40+GT.mod12(root-4);
    var pitches=scale.intervals.concat(12).map(function(iv) { return tonic+iv; });
    var paths=[{notes:[],cost:0}];
    pitches.forEach(function(midi) {
      var next=[];
      opens.forEach(function(open,string) {
        var fret=midi-open; if(fret<0 || fret>15) return;
        var best=null;
        paths.forEach(function(path) {
          var prev=path.notes[path.notes.length-1];
          if(prev && string<prev.string) return;
          var cost=path.cost+fret*.1+(prev ? Math.abs(fret-prev.fret)+Math.abs(string-prev.string)*2 : fret*.2);
          if(!best || cost<best.cost) best={notes:path.notes.concat({string:string,fret:fret,midi:midi}),cost:cost};
        });
        if(best) next.push(best);
      });
      paths=next;
    });
    paths.sort(function(a,b) { return a.cost-b.cost; });
    return paths[0].notes;
  }
  function renderScaleRoute() {
    var host=document.getElementById('studioScaleRoute');
    if(!host) { host=document.createElement('div'); host.id='studioScaleRoute'; scaleBoard.parentElement.parentElement.appendChild(host); }
    var route=makeScaleRoute(scaleCurrentRoot,scaleCurrentType);
    host.replaceChildren();
    var h=document.createElement('h3'); h.textContent='Play this one-octave route'; host.appendChild(h);
    var p=document.createElement('p'); p.textContent='One note per click or playback step, ending on the tonic. This route is independent of the map window above. Numbers are frets. Shift your hand when needed; use finger 1 for a new position, then fingers 2–4 for the next three frets.'; host.appendChild(p);
    var pre=document.createElement('pre'); pre.className='studio-tab';
    pre.textContent=[5,4,3,2,1,0].map(function(string) { return GT.TUNING[string].label+' |'+route.map(function(n) { return n.string===string ? String(n.fret).padStart(2,'-')+'--' : '----'; }).join('')+'|'; }).join('\n');
    host.appendChild(pre);
    var row=document.createElement('div'); row.className='gc-pick-row';
    route.forEach(function(n,i) { var b=document.createElement('button'); b.type='button'; b.className='gc-btn'; b.textContent=(i+1)+'. String '+(6-n.string)+', fret '+n.fret; b.onclick=function() { window.GuitarAudio.stop(); window.GuitarAudio.pluck(GT.noteFreq(n.string,n.fret)); }; row.appendChild(b); });
    host.appendChild(row);
  }

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
    renderScaleRoute();

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
        html += '<p class="gc-enc-notes">' + MODE_ORDINALS[scaleCurrentType.mode] + ' mode of the major scale — the same seven notes as <strong>' + GT.PITCHES[parentRoot] + ' Major</strong>, with ' + GT.PITCHES[scaleCurrentRoot] + ' as the tonal center.</p>';
      }
      html += '<p class="gc-enc-formula">' + scaleCurrentType.desc + '</p>';
      scaleMeta.innerHTML = html;
    }
  }

  buildScalePickers();
  buildScaleViewPicker();
  renderScales();

  /* Root-position playback, independent of the fretboard view above — walks the
     scale's own intervals up from the root rather than reading dots off a
     particular string/position, so it sounds the same no matter which window
     of the neck is currently shown. */
  function scaleFrequencies(rootPC, scaleType) {
    return makeScaleRoute(rootPC,scaleType).map(function(n) { return GT.noteFreq(n.string,n.fret); });
  }

  var scalePlayUp = document.getElementById('gcScalePlayUp');
  var scalePlayDown = document.getElementById('gcScalePlayDown');
  var scalePlayUpDown = document.getElementById('gcScalePlayUpDown');
  if (scalePlayUp) scalePlayUp.addEventListener('click', function () {
    if (!window.GuitarAudio) return;
    window.GuitarAudio.sequence(scaleFrequencies(scaleCurrentRoot, scaleCurrentType), { interval: 0.22 });
  });
  if (scalePlayDown) scalePlayDown.addEventListener('click', function () {
    if (!window.GuitarAudio) return;
    window.GuitarAudio.sequence(scaleFrequencies(scaleCurrentRoot, scaleCurrentType).slice().reverse(), { interval: 0.22 });
  });
  if (scalePlayUpDown) scalePlayUpDown.addEventListener('click', function () {
    if (!window.GuitarAudio) return;
    window.GuitarAudio.stop();
    var freqs = scaleFrequencies(scaleCurrentRoot, scaleCurrentType);
    window.GuitarAudio.sequence(freqs.concat(freqs.slice(0, -1).reverse()), { interval: 0.22 });
  });

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
    if (practiceList.some(function (p) { return practiceItemKey(p) === key; })) return false;
    practiceList.push(item);
    savePracticeList();
    renderPracticeListUI();
    return true;
  }

  /* Brief confirmation on the button itself — the practice panel is often closed. */
  function flashButton(btn, msg) {
    if (!btn) return;
    if (!btn.dataset.label) btn.dataset.label = btn.textContent;
    btn.textContent = msg;
    clearTimeout(btn._flash);
    btn._flash = setTimeout(function () { btn.textContent = btn.dataset.label; }, 1600);
    var live = document.getElementById('gcLiveStatus');
    if (live) live.textContent = msg;
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
    var emptyEl = document.getElementById('gcPracticeEmpty');
    if (emptyEl) emptyEl.hidden = practiceList.length > 0;
    var tab = document.querySelector('.ll-tab[data-pane="pane-practice"]');
    if (tab) tab.textContent = 'Practice list' + (practiceList.length ? ' (' + practiceList.length + ')' : '');
  }

  var addChordToPracticeBtn = document.getElementById('gcAddChordToPractice');
  if (addChordToPracticeBtn) addChordToPracticeBtn.addEventListener('click', function () {
    var added = addPracticeItem({
      kind: 'chord',
      rootPC: encCurrentRoot,
      typeSuffix: encCurrentType.suffix,
      inversionIndex: encCurrentInversion,
      formKey: encCurrentForm
    });
    flashButton(addChordToPracticeBtn, added ? '✓ Added to practice list' : 'Already in your list');
  });

  var addScaleToPracticeBtn = document.getElementById('gcAddScaleToPractice');
  if (addScaleToPracticeBtn) addScaleToPracticeBtn.addEventListener('click', function () {
    var added = addPracticeItem({ kind: 'scale', rootPC: scaleCurrentRoot, scaleKey: scaleCurrentType.key });
    flashButton(addScaleToPracticeBtn, added ? '✓ Added to practice list' : 'Already in your list');
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
          renderBoard(boardHost, { startFret: startFret, span: GT.BUILD_FRETS, frets: shape.frets, fingers: shape.fingers, degrees: degrees, interactive: false, playable: false });
          var fingerLine = document.createElement('p');
          fingerLine.textContent = 'Fingering: ' + fingerSummary(shape.fingers);
          cell.appendChild(fingerLine);
        }
      } else {
        var st = GT.SCALE_TYPES.filter(function (s) { return s.key === item.scaleKey; })[0];
        if (st) {
          var toneMap = buildToneMap(item.rootPC, st);
          renderScaleBoard(boardHost, { startFret: 0, span: SCALE_SPAN, toneMap: toneMap, playable: false });
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
      var ok = picked && picked.value === 'correct';
      if (ok) correct++;
      fs.classList.toggle('is-correct', !!ok);
      fs.classList.toggle('is-wrong', !!picked && !ok);
      fs.classList.toggle('is-unanswered', !picked);
    });
    var out = document.getElementById('gcQuizResult');
    out.textContent = correct === total ? 'All ' + total + ' correct — you can read a chord like a fretboard now.' : correct + ' of ' + total + ' correct. Questions marked in red need another look; unanswered ones are outlined.';
  });
  /* Practice studio: one transport, exact grips, and playable scale routes. */
  var studioTimers = [], progression = [], voiceGrips = [], voiceIndex = 0, progressionPlaying = false;
  var $ = function(id) { return document.getElementById(id); };
  function studioStop() {
    studioTimers.forEach(clearTimeout); studioTimers = [];
    window.GuitarAudio.stop();
    document.querySelectorAll('.studio-playing').forEach(function(el) { el.classList.remove('studio-playing'); });
    if (progressionPlaying) $('studioTransport').textContent = 'Stopped. Press Play progression to start again from bar 1.';
    progressionPlaying = false;
    $('studioPlay').textContent = 'Play progression';
  }
  function later(fn, ms) { studioTimers.push(setTimeout(fn, ms)); }
  function option(select, value, label) { var o = document.createElement('option'); o.value=value; o.textContent=label; select.appendChild(o); }
  ['studioKey','studioVoiceRoot'].forEach(function(id) { GT.PITCHES.forEach(function(n,i) { option($(id),i,n); }); });
  GT.CHORD_TYPES.filter(function(ct) { return ct.intervals.length === 3 || ct.intervals.length === 4; }).forEach(function(ct) { option($('studioVoiceType'),ct.suffix,ct.name); });
  $('studioStop').onclick = studioStop;
  $('studioVolume').oninput = function() { window.GuitarAudio.setVolume(Number(this.value)/100); };
  $('studioSize').onchange = function() { document.body.classList.toggle('studio-large',this.value === 'large'); };
  document.addEventListener('visibilitychange',function() { if (document.hidden) studioStop(); });
  window.addEventListener('pagehide',studioStop);
  document.addEventListener('keydown',function(e) { if (e.key==='Escape' && !e.target.closest('dialog, [role=dialog]')) studioStop(); });
  // Stop the previous demonstration before starting a new one anywhere on the page.
  document.addEventListener('click',function(e) {
    var button=e.target.closest('button');
    if (button && button.id!=='studioPlay' && (/Play|Strum|Arp|Hear/i.test(button.textContent) || button.classList.contains('gc-cell') || button.hasAttribute('data-load-grip'))) studioStop();
  },true);
  function chordType(suffix) { return GT.CHORD_TYPES.find(function(ct) { return ct.suffix===suffix; }); }
  function addProgression(name,frets) {
    studioStop();
    if (progression.length>=32) { $('studioTransport').textContent='32 bars is the limit. Remove a bar to add another.'; return false; }
    progression.push({name:name,frets:frets.slice()}); renderProgression();
    $('studioTransport').textContent='Added '+name+' as bar '+progression.length+'.';
    return true;
  }
  function showNowPlaying(entry) {
    var host=$('studioNowBoard'); if(!host) return;
    if(!entry) { host.hidden=true; return; }
    host.hidden=false;
    var nums=entry.frets.filter(function(f) { return typeof f==='number' && f>0; });
    var start=nums.length && Math.max.apply(null,nums)>5 ? Math.max(0,Math.min.apply(null,nums)-1) : 0;
    var title=document.createElement('p'); title.className='studio-now-title'; title.textContent='Now: '+entry.name;
    var board=document.createElement('div');
    host.replaceChildren(title,board);
    renderBoard(board,{startFret:start,span:5,frets:entry.frets,fingers:GT.computeFingering(entry.frets),interactive:false,playable:false});
  }
  $('studioAddChord').onclick=function() {
    var shape=GT.getChordShape(encCurrentRoot,encCurrentType,encCurrentInversion,encCurrentForm);
    var bass=GT.detectChords(shape.frets).bassPC;
    if (addProgression(GT.chordDisplayName(encCurrentRoot,encCurrentType)+(bass!==encCurrentRoot ? '/'+GT.PITCHES[bass] : ''),shape.frets)) flashButton(this,'✓ Added as bar '+progression.length);
  };
  function renderProgression() {
    var list=$('studioProgression'); list.replaceChildren();
    progression.forEach(function(entry,i) {
      var li=document.createElement('li');
      var title=document.createElement('strong'); title.textContent='Bar '+(i+1)+' · '+entry.name; li.appendChild(title);
      var tab=document.createElement('p'); tab.textContent='Low E → high e: '+entry.frets.join(' · '); li.appendChild(tab);
      function control(label,action,disabled) { var b=document.createElement('button'); b.type='button'; b.className='gc-btn'; b.textContent=label; b.setAttribute('aria-label',label+' bar '+(i+1)+' '+entry.name); b.disabled=!!disabled; b.onclick=function() { studioStop(); action(); }; li.appendChild(b); }
      control('Hear',function() { playFrets(entry.frets,'strum'); });
      control('Earlier',function() { var item=progression.splice(i,1)[0]; progression.splice(i-1,0,item); renderProgression(); },i===0);
      control('Later',function() { var item=progression.splice(i,1)[0]; progression.splice(i+1,0,item); renderProgression(); },i===progression.length-1);
      control('Remove',function() { progression.splice(i,1); renderProgression(); });
      list.appendChild(li);
    });
    $('studioPlay').disabled=!progression.length;
    $('studioClear').disabled=!progression.length;
    $('studioProgression').setAttribute('data-empty','Your progression is empty. Load a pattern above, or add a grip from the Encyclopedia or Voicings.'); 
    try { localStorage.setItem('guitar-studio-progression-v1',JSON.stringify(progression)); } catch(e) {}
  }
  function loadPreset() {
    studioStop(); progression=[];
    var root=Number($('studioKey').value), pattern=$('studioPreset').value;
    var entries=pattern==='easy' ? [[4,'m','Em'],[9,'m','Am']] : pattern==='pop' ? [[0,'','I'],[7,'','V'],[9,'m','vi'],[5,'','IV']] : pattern==='cadence' ? [[2,'m','ii'],[7,'','V'],[0,'','I']] : [[0,'7','I7'],[0,'7','I7'],[0,'7','I7'],[0,'7','I7'],[5,'7','IV7'],[5,'7','IV7'],[0,'7','I7'],[0,'7','I7'],[7,'7','V7'],[5,'7','IV7'],[0,'7','I7'],[7,'7','V7']];
    entries.forEach(function(e) { var pc=pattern==='easy' ? e[0] : GT.mod12(root+e[0]), ct=chordType(e[1]); progression.push({name:GT.chordDisplayName(pc,ct)+(pattern==='easy'?'':' ('+e[2]+')'),frets:GT.getChordShape(pc,ct,0,null).frets}); });
    renderProgression(); $('studioTransport').textContent='Pattern ready. Four beats per bar; start slowly.';
  }
  $('studioLoad').onclick=loadPreset;
  $('studioClear').onclick=function() { studioStop(); progression=[]; renderProgression(); $('studioTransport').textContent='Empty. Load a pattern or add a grip from an explorer.'; };
  $('studioPlay').onclick=function() {
    var wasPlaying=progressionPlaying;
    studioStop();
    if (wasPlaying) return; /* the same button toggles playback off */
    if (!window.GuitarAudio.getContext()) { $('studioTransport').textContent='Audio is unavailable in this browser. Use the printed fret numbers to play on guitar.'; return; }
    var bpm=Math.max(40,Math.min(180,Number($('studioTempo').value)||72)); $('studioTempo').value=bpm;
    var beat=60/bpm, style=$('studioStyle').value;
    progressionPlaying=true; $('studioPlay').textContent='■ Stop progression';
    function cycle() {
      progression.forEach(function(entry,i) {
        var freqs=fretsToFreqs(entry.frets);
        for (var b=0;b<4;b++) {
          var when=(i*4+b)*beat;
          if (style==='arp') window.GuitarAudio.pluck(freqs[b%freqs.length],{delay:when,duration:beat*.95});
          else if (style==='strum' || b===0) freqs.forEach(function(f,j) { window.GuitarAudio.pluck(f,{delay:when+j*.018,duration:style==='sustain'?beat*3.8:beat*.85}); });
          (function(bar,pulse,delay) { later(function() {
            document.querySelectorAll('#studioProgression li').forEach(function(el,n) { el.classList.toggle('studio-playing',n===bar); });
            if (pulse===0) showNowPlaying(entry);
            $('studioTransport').textContent='Bar '+(bar+1)+' of '+progression.length+' · '+entry.name+' · beat '+(pulse+1)+' of 4';
          },delay*1000); })(i,b,when);
        }
      });
      later(function() { if ($('studioLoop').checked) cycle(); else { studioStop(); $('studioTransport').textContent='Finished. Repeat slowly, then try playing along.'; } },progression.length*4*beat*1000);
      /* cycle() schedules a whole pass of audio up front; later() owns the timing. */
    }
    cycle();
  };
  try {
    var saved=JSON.parse(localStorage.getItem('guitar-studio-progression-v1')||'null');
    if (Array.isArray(saved)) progression=saved.slice(0,32).filter(function(e) { return typeof e.name==='string' && e.name.length<100 && Array.isArray(e.frets) && e.frets.length===6 && e.frets.some(function(f) { return typeof f==='number'; }) && e.frets.every(function(f) { return f==='x' || (Number.isInteger(f)&&f>=0&&f<=24); }); });
  } catch(e) {}
  if (progression.length) renderProgression(); else loadPreset();
  function voiceType() {
    var original=chordType($('studioVoiceType').value);
    if ($('studioVoiceKind').value!=='shell') return original;
    if (original.intervals.indexOf(10)<0 && original.intervals.indexOf(11)<0 && original.suffix!=='dim7') return null;
    return {suffix:original.suffix+'-shell',intervals:original.intervals.filter(function(iv) { return iv!==7 && iv!==6; })};
  }
  function voiceBassOptions() {
    $('studioVoiceBass').replaceChildren();
    var ct=voiceType();
    if(ct) GT.sortedIntervals(ct).forEach(function(iv,i) { option($('studioVoiceBass'),i,(iv===0?'Root':GT.intervalLabel(iv,true))+' in bass'); });
  }
  var VOICE_KIND_LABELS={close:'close',drop2:'drop 2',drop3:'drop 3',shell:'shell'};
  function voiceName(grip) {
    var root=Number($('studioVoiceRoot').value), bass=GT.detectChords(grip).bassPC;
    return GT.PITCHES[root]+$('studioVoiceType').value+(bass!==root ? '/'+GT.PITCHES[bass] : '');
  }
  function updateVoice(refresh) {
    var ct=voiceType(),root=Number($('studioVoiceRoot').value),kind=$('studioVoiceKind').value;
    if(refresh) { voiceIndex=0; voiceGrips=ct ? GT.findVoicings(root,ct,Number($('studioVoiceBass').value),kind==='shell'?'any':kind) : []; }
    var grip=voiceGrips[voiceIndex]; $('studioVoiceBoard').replaceChildren();
    ['studioVoicePlay','studioVoiceAdd','studioVoiceNext'].forEach(function(id) { $(id).disabled=!grip || (id==='studioVoiceNext' && voiceGrips.length<2); });
    if(!grip) { $('studioVoiceInfo').textContent='No compact grip for this choice. Try another bass position or family. Drop voicings require four distinct tones; shells here require a seventh chord.'; return; }
    var nums=grip.filter(function(f) { return typeof f==='number' && f>0; });
    var start=nums.length ? Math.max(0,Math.min.apply(null,nums)-1) : 0;
    renderBoard($('studioVoiceBoard'),{startFret:start,span:4,frets:grip,fingers:GT.computeFingering(grip),degrees:GT.computeDegrees(root,ct,grip),interactive:false});
    $('studioVoiceInfo').textContent=voiceName(grip)+' · '+VOICE_KIND_LABELS[kind]+' voicing · '+$('studioVoiceBass').selectedOptions[0].textContent+' · location '+(voiceIndex+1)+' of '+voiceGrips.length+'. Low E → high e frets: '+grip.join(' · ')+'. Fingers: '+fingerSummary(GT.computeFingering(grip))+'.'+(kind==='shell'?' Fifth omitted.':' All formula tones included.');
  }
  ['studioVoiceRoot','studioVoiceType','studioVoiceKind'].forEach(function(id) { $(id).onchange=function() { studioStop(); voiceBassOptions(); updateVoice(true); }; });
  $('studioVoiceBass').onchange=function() { studioStop(); updateVoice(true); };
  $('studioVoiceNext').onclick=function() { studioStop(); voiceIndex=(voiceIndex+1)%voiceGrips.length; updateVoice(false); };
  $('studioVoicePlay').onclick=function() { playFrets(voiceGrips[voiceIndex],'strum'); };
  $('studioVoiceAdd').onclick=function() { var grip=voiceGrips[voiceIndex]; if (addProgression(voiceName(grip)+' ('+VOICE_KIND_LABELS[$('studioVoiceKind').value]+')',grip)) flashButton(this,'✓ Added as bar '+progression.length); };
  voiceBassOptions(); updateVoice(true);

  function syncPressed() {
    document.querySelectorAll('.gc-pick-row .gc-pick-btn').forEach(function(b) { b.setAttribute('aria-pressed', b.classList.contains('is-active') ? 'true' : 'false'); });
  }
  document.addEventListener('click', function(e) { if (e.target.closest('.gc-pick-btn')) syncPressed(); });

  /* ---------- Shared: correctly spelled notes and formula strips ---------- */
  var LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'], LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
  var ROOT_SPELL = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  function spell(rootPC, iv, degree) {
    var li = (LETTERS.indexOf(ROOT_SPELL[rootPC][0]) + degree - 1) % 7;
    var diff = GT.mod12(rootPC + iv - LETTER_PC[li]);
    if (diff > 6) diff -= 12;
    return LETTERS[li] + (diff > 0 ? '♯'.repeat(diff) : '♭'.repeat(-diff));
  }
  function degreeOf(label, suffix, iv) {
    if (label === 'R') return 1;
    if (suffix === 'dim7' && iv === 9) return 7; /* the diminished 7th is spelled 𝄫7, not 6 */
    var n = parseInt(label.replace(/[♭♯#]/g, ''), 10);
    return n > 7 ? n - 7 : n;
  }
  function toneFreq(rootPC, semis) { return 196 * Math.pow(2, (GT.mod12(rootPC - 7) + semis) / 12); } /* roots G3..F♯4 */
  /* Semitones above the root in playing order: an add9's "2" sounds an octave up. */
  function stackedSemis(intervals) {
    var out = [];
    intervals.forEach(function (iv) { var v = iv; while (out.length && v <= out[out.length - 1]) v += 12; out.push(v); });
    return out;
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function formulaCard(ct, rootPC, blurb) {
    var hasThird = ct.intervals.indexOf(3) >= 0 || ct.intervals.indexOf(4) >= 0;
    var card = el('article', 'gt-formula');
    var head = el('header');
    var h = el('h3'); h.appendChild(el('span', 'gt-formula-sym', ROOT_SPELL[rootPC] + ct.suffix)); h.appendChild(document.createTextNode(' ' + ct.name));
    head.appendChild(h); head.appendChild(el('code', null, ct.intervals.join(' · ')));
    card.appendChild(head);
    var strip = el('div', 'gt-strip'); strip.setAttribute('role', 'group'); strip.setAttribute('aria-label', ct.name + ' formula on a one-octave fret strip');
    var semis = stackedSemis(ct.intervals);
    for (var c = 0; c < 12; c++) {
      var idx = ct.intervals.indexOf(c);
      var cell = el(idx >= 0 ? 'button' : 'span', 'gt-cell');
      if (idx >= 0) {
        var label = GT.intervalLabel(c, hasThird);
        cell.type = 'button';
        cell.classList.add('is-tone');
        cell.setAttribute('data-quality', c === 0 ? 'root' : GT.degreeQuality(label));
        cell.appendChild(el('b', null, label));
        cell.setAttribute('aria-label', label + ', ' + spell(rootPC, c, degreeOf(label, ct.suffix, c)) + ', ' + c + ' semitones up. Play');
        (function (semi) { cell.addEventListener('click', function () { studioStop(); window.GuitarAudio.pluck(toneFreq(rootPC, semi)); }); })(semis[idx]);
      }
      cell.appendChild(el('small', null, c));
      strip.appendChild(cell);
    }
    card.appendChild(strip);
    var notes = ct.intervals.map(function (iv) { return spell(rootPC, iv, degreeOf(GT.intervalLabel(iv, hasThird), ct.suffix, iv)); });
    card.appendChild(el('p', 'gt-notes', notes.join(' – ')));
    if (blurb) card.appendChild(el('p', 'gt-blurb', blurb));
    var actions = el('div', 'gt-formula-actions');
    var freqs = semis.map(function (v) { return toneFreq(rootPC, v); });
    var strum = el('button', 'gc-btn gc-btn-primary', '▶ Strum'); strum.type = 'button';
    strum.setAttribute('aria-label', 'Strum ' + ROOT_SPELL[rootPC] + ct.suffix);
    strum.onclick = function () { window.GuitarAudio.strum(freqs, { spread: .04 }); };
    var arp = el('button', 'gc-btn', 'Arpeggio ↑'); arp.type = 'button';
    arp.setAttribute('aria-label', 'Arpeggio ' + ROOT_SPELL[rootPC] + ct.suffix);
    arp.onclick = function () { window.GuitarAudio.sequence(freqs, { interval: .32 }); };
    actions.appendChild(strum); actions.appendChild(arp);
    card.appendChild(actions);
    return card;
  }

  /* ---------- 01: string figure ---------- */
  var gtStrings = $('gtStrings');
  if (gtStrings) GT.STRINGS_TOPDOWN.forEach(function (str) {
    var i = GT.TUNING.indexOf(str);
    var row = el('button', 'gt-string-row'); row.type = 'button';
    row.style.setProperty('--thick', (1 + (5 - i) * .55) + 'px');
    row.setAttribute('aria-label', 'String ' + str.num + ', ' + str.label + ', play open');
    row.innerHTML = '<span class="gt-string-num">' + str.num + '</span><span class="gt-string-name">' + str.label + '</span><span class="gt-string-line"></span><span class="gt-string-pitch">' +
      ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'][i] + (i === 5 ? ' · thinnest' : i === 0 ? ' · thickest' : '') + '</span>';
    row.dataset.stringIndex = i;
    row.onclick = function () {
      if (strumSuppressClick) return;
      studioStop(); ringString(row, i, 0.32);
    };
    gtStrings.appendChild(row);
  });

  function ringString(row, i, gain) {
    window.GuitarAudio.pluck(GT.noteFreq(i, 0), { gain: gain, duration: 2.4 });
    row.classList.remove('is-ringing'); void row.offsetWidth; row.classList.add('is-ringing');
  }

  /* Hold and drag (mouse, pen or finger) across the figure to strum: a string
     sounds each time the pointer crosses its line, louder for faster swipes.
     A string re-arms once the pointer moves a few px away, so jitter on a line
     doesn't machine-gun it. Plain clicks and keyboard still use row.onclick. */
  var strumSuppressClick = false;
  if (gtStrings) (function () {
    var active = null;
    function lines() {
      return Array.prototype.map.call(gtStrings.querySelectorAll('.gt-string-row'), function (row) {
        var r = row.querySelector('.gt-string-line').getBoundingClientRect();
        return { row: row, i: +row.dataset.stringIndex, y: r.top + r.height / 2, armed: true };
      });
    }
    gtStrings.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      studioStop();
      active = { id: e.pointerId, y: e.clientY, t: e.timeStamp, strings: lines(), moved: false };
      try { gtStrings.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      /* Pressing directly on a string plucks it, like touching it with a pick. */
      var hit = active.strings.reduce(function (best, s) { return Math.abs(s.y - e.clientY) < Math.abs(best.y - e.clientY) ? s : best; });
      if (Math.abs(hit.y - e.clientY) < 10) { ringString(hit.row, hit.i, 0.3); hit.armed = false; }
    });
    gtStrings.addEventListener('pointermove', function (e) {
      if (!active || e.pointerId !== active.id) return;
      var y0 = active.y, y1 = e.clientY, dt = Math.max(1, e.timeStamp - active.t);
      if (Math.abs(y1 - y0) < 0.5) return;
      active.moved = true;
      var speed = Math.abs(y1 - y0) / dt; /* px per ms */
      var gain = Math.min(0.42, 0.14 + speed * 0.12);
      var down = y1 > y0;
      var crossed = active.strings.filter(function (s) {
        return s.armed && (down ? (y0 < s.y && y1 >= s.y) : (y0 > s.y && y1 <= s.y));
      });
      if (!down) crossed.reverse();
      crossed.forEach(function (s, k) {
        /* Space crossings within one fast move so they still sound as a strum, not a block chord. */
        setTimeout(function () { ringString(s.row, s.i, gain); }, k * Math.min(18, dt / crossed.length));
        s.armed = false;
      });
      active.strings.forEach(function (s) { if (!s.armed && Math.abs(y1 - s.y) > 6) s.armed = true; });
      active.y = y1; active.t = e.timeStamp;
    });
    function end(e) {
      if (!active || e.pointerId !== active.id) return;
      active = null;
      /* The browser still fires a click after the pointer lifts; the strum already played. */
      strumSuppressClick = true;
      setTimeout(function () { strumSuppressClick = false; }, 0);
    }
    gtStrings.addEventListener('pointerup', end);
    gtStrings.addEventListener('pointercancel', end);
  })();

  /* ---------- 01: interactive tab reader ---------- */
  /* Notes are [string low→high, fret, finger]; one inner array per beat. */
  var EM = [[0,0,0],[1,2,2],[2,2,3],[3,0,0],[4,0,0],[5,0,0]], AM = [[1,0,0],[2,2,2],[3,2,3],[4,1,1],[5,0,0]];
  var TAB_EXAMPLES = [
    { name: 'Single notes', beats: [[[5,0,0]],[[5,1,1]],[[5,3,3]],[[5,0,0]]] },
    { name: 'Across strings', beats: [[[0,0,0]],[[0,3,3]],[[1,0,0]],[[1,2,2]],[[2,0,0]],[[2,2,2]],[[3,0,0]],[[3,2,2]]] },
    { name: 'Stacked = chord', beats: [EM, EM, AM, AM] },
    { name: 'Picked arpeggio', beats: [[[1,0,0]],[[2,2,2]],[[3,2,3]],[[4,1,1]],[[5,0,0]],[[4,1,1]],[[3,2,3]],[[2,2,2]]] }
  ];
  var tabExample = TAB_EXAMPLES[0], tabBeat = -1;
  var STRING_WORD = ['6 (low E)', '5 (A)', '4 (D)', '3 (G)', '2 (B)', '1 (high e)'];
  function renderTab() {
    var host = $('gtTab'); if (!host) return;
    host.replaceChildren();
    host.style.setProperty('--beats', tabExample.beats.length);
    host.appendChild(el('span', 'gt-tab-label gt-tab-headcell', 'Beat'));
    tabExample.beats.forEach(function (_, b) {
      var hb = el('button', 'gt-tab-headcell gt-tab-beat', b + 1); hb.type = 'button'; hb.setAttribute('data-beat', b);
      hb.setAttribute('aria-label', 'Play beat ' + (b + 1));
      hb.onclick = function () { studioStop(); showTabBeat(b, true); };
      host.appendChild(hb);
    });
    [5, 4, 3, 2, 1, 0].forEach(function (s) {
      host.appendChild(el('span', 'gt-tab-label', GT.TUNING[s].label + ' |'));
      tabExample.beats.forEach(function (notes, b) {
        var n = notes.filter(function (x) { return x[0] === s; })[0];
        var cell = el('span', 'gt-tab-cell'); cell.setAttribute('data-beat', b);
        if (n) {
          var btn = el('button', 'gt-tab-note', n[1]); btn.type = 'button';
          btn.setAttribute('aria-label', 'Beat ' + (b + 1) + ', string ' + STRING_WORD[s] + ', ' + (n[1] ? 'fret ' + n[1] : 'open'));
          btn.onclick = function () { studioStop(); showTabBeat(b, true); };
          cell.appendChild(btn);
        }
        host.appendChild(cell);
      });
    });
    showTabBeat(-1);
  }
  function showTabBeat(b, sound) {
    tabBeat = b;
    document.querySelectorAll('#gtTab [data-beat]').forEach(function (c) { c.classList.toggle('studio-playing', +c.getAttribute('data-beat') === b); });
    var frets = [null, null, null, null, null, null], fingers = ['x', 'x', 'x', 'x', 'x', 'x'];
    var notes = b >= 0 ? tabExample.beats[b] : [];
    notes.forEach(function (n) { frets[n[0]] = n[1]; fingers[n[0]] = n[2] || 'o'; });
    renderBoard($('gtTabBoard'), { startFret: 0, span: 4, frets: frets, fingers: fingers, interactive: false });
    var status = $('studioTabStatus');
    if (b < 0) status.textContent = 'Click any column in the tab, or press play.';
    else if (notes.length === 1) status.textContent = 'Beat ' + (b + 1) + ': string ' + STRING_WORD[notes[0][0]] + ', ' + (notes[0][1] ? 'fret ' + notes[0][1] + ' — press with finger ' + notes[0][2] : 'open — no finger needed') + '.';
    else status.textContent = 'Beat ' + (b + 1) + ': ' + notes.length + ' numbers stacked in one column, so strum them together' + (notes === EM ? ' — that is E minor.' : notes === AM ? ' — that is A minor.' : '.');
    if (sound && notes.length) {
      var fr = notes.map(function (n) { return GT.noteFreq(n[0], n[1]); });
      if (fr.length > 1) window.GuitarAudio.strum(fr); else window.GuitarAudio.pluck(fr[0]);
    }
  }
  if ($('gtTabExamples')) {
    TAB_EXAMPLES.forEach(function (ex, i) {
      var btn = el('button', 'gc-pick-btn gc-type-btn' + (i ? '' : ' is-active'), ex.name); btn.type = 'button';
      btn.onclick = function () {
        studioStop(); tabExample = ex;
        Array.prototype.forEach.call(btn.parentNode.children, function (c) { c.classList.toggle('is-active', c === btn); });
        renderTab();
      };
      $('gtTabExamples').appendChild(btn);
    });
    renderTab();
    $('studioTabPlay').onclick = function () {
      tabExample.beats.forEach(function (_, b) { later(function () { showTabBeat(b, true); }, b * 650); });
      later(function () { showTabBeat(-1); }, tabExample.beats.length * 650 + 600);
    };
    $('gtTabNext').onclick = function () { studioStop(); showTabBeat((tabBeat + 1) % tabExample.beats.length, true); };
    $('gtTabPrev').onclick = function () { studioStop(); showTabBeat(tabBeat <= 0 ? tabExample.beats.length - 1 : tabBeat - 1, true); };
  }

  /* ---------- 02: semitone ruler, interval cards, major/minor compare ---------- */
  var INTERVALS = [
    ['P1', 'Unison', 1], ['m2', 'Minor second', 2], ['M2', 'Major second', 2], ['m3', 'Minor third', 3], ['M3', 'Major third', 3],
    ['P4', 'Perfect fourth', 4], ['TT', 'Tritone (augmented fourth / diminished fifth)', 4], ['P5', 'Perfect fifth', 5],
    ['m6', 'Minor sixth', 6], ['M6', 'Major sixth', 6], ['m7', 'Minor seventh', 7], ['M7', 'Major seventh', 7], ['P8', 'Octave', 1]
  ];
  var INTERVAL_QUALITY = ['root', 'minor', 'major', 'minor', 'major', 'perfect', 'diminished', 'perfect', 'minor', 'major', 'minor', 'major', 'root'];
  var intervalRoot = 0, intervalN = 4;
  function intervalNote(n) { return spell(intervalRoot, n % 12, INTERVALS[n][2]); }
  function renderRuler() {
    var host = $('gtRuler'); if (!host) return;
    host.replaceChildren();
    INTERVALS.forEach(function (iv, n) {
      var b = el('button', 'gt-ruler-cell'); b.type = 'button';
      if (n === 0) b.classList.add('is-root');
      if (n > 0 && n <= intervalN) b.classList.add('in-range');
      if (n === intervalN && n) b.classList.add('is-target');
      b.setAttribute('data-quality', INTERVAL_QUALITY[n]);
      b.setAttribute('aria-pressed', n === intervalN ? 'true' : 'false');
      b.setAttribute('aria-label', n + ' semitones: ' + iv[1] + ', ' + intervalNote(n));
      b.innerHTML = '<span class="gt-ruler-note">' + intervalNote(n) + '</span><b>' + n + '</b><small>' + iv[0] + '</small>';
      b.onclick = function () { studioStop(); intervalN = n || intervalN; if (n) { renderRuler(); } playInterval(n, 'both'); };
      host.appendChild(b);
    });
    $('studioIntervalText').innerHTML = '<strong>' + intervalN + ' semitone' + (intervalN === 1 ? '' : 's') + ' = ' + INTERVALS[intervalN][1] + '</strong> · ' +
      intervalN + ' fret' + (intervalN === 1 ? '' : 's') + ' up the same string · ' + ROOT_SPELL[intervalRoot] + ' → ' + intervalNote(intervalN) +
      (intervalN === 3 || intervalN === 4 ? '. Compare 3 and 4 to hear minor versus major thirds.' : '.');
  }
  function playInterval(n, how) {
    var a = toneFreq(intervalRoot, 0), b = toneFreq(intervalRoot, n);
    if (how !== 'together') { window.GuitarAudio.pluck(a, { duration: 1.2 }); if (n) window.GuitarAudio.pluck(b, { delay: .6, duration: 1.2 }); }
    /* 'both' = melodic pair, then the same two notes together as a harmonic interval. */
    var d = how === 'both' ? 1.3 : 0;
    if (how !== 'apart' && n) { window.GuitarAudio.pluck(a, { delay: d, duration: 1.8 }); window.GuitarAudio.pluck(b, { delay: d, duration: 1.8 }); }
  }
  if ($('gtRuler')) {
    ROOT_SPELL.forEach(function (n, i) { option($('studioIntervalRoot'), i, n); });
    $('studioIntervalRoot').onchange = function () { intervalRoot = +this.value; renderRuler(); renderCompare(); };
    $('studioIntervalApart').onclick = function () { playInterval(intervalN, 'apart'); };
    $('studioIntervalTogether').onclick = function () { playInterval(intervalN, 'together'); };
    renderRuler();
  }
  document.querySelectorAll('[data-hear-interval]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var n = +btn.getAttribute('data-hear-interval');
      if (n) { intervalN = n; renderRuler(); }
      playInterval(n, 'both');
    });
  });
  function renderCompare() {
    var host = $('gtCompare'); if (!host) return;
    host.replaceChildren(
      formulaCard(chordType(''), intervalRoot, 'Root + major 3rd (4) + perfect 5th (7). Bright.'),
      el('p', 'gt-compare-arrow', 'Only the 3rd moves — down one fret'),
      formulaCard(chordType('m'), intervalRoot, 'Root + minor 3rd (3) + perfect 5th (7). Darker.')
    );
  }
  renderCompare();

  /* ---------- 03: formula strips for every chord family ---------- */
  var FAMILY_BLURBS = [
    ['', 'Bright, resolved.'], ['m', 'Darker, moodier.'], ['7', 'Wants to resolve somewhere.'], ['maj7', 'Dreamy, jazzy.'],
    ['m7', 'Smooth, mellow.'], ['sus2', 'No 3rd — a 2nd instead. Neither major nor minor; open and unresolved.'],
    ['sus4', 'No 3rd — a 4th instead. Leans hard toward resolving back to the 3rd.'],
    ['dim', 'Tense, unstable. Two stacked minor thirds.'], ['5', 'Just root and 5th — no 3rd, so it’s neither major nor minor.']
  ];
  var MORE_BLURBS = [
    ['aug', 'Two stacked major thirds — restless and dreamlike.'], ['6', 'Major plus a 6th — sweet and vintage.'],
    ['m6', 'Minor with a bright 6th — bittersweet, film-noir.'], ['add9', 'Major plus the 9th (a 2nd, an octave up) — open and shimmering. No 7th.'],
    ['m7b5', 'Diminished triad plus ♭7 — tense but softer than dim7.'], ['dim7', 'Four stacked minor thirds — symmetric, maximum tension.'],
    ['7sus4', 'Dominant 7th with a 4th instead of the 3rd — open, gospel and funk.']
  ];
  function renderFormulas() {
    var root = +($('gtFormulaRoot') ? $('gtFormulaRoot').value : 0);
    [['gtFormulaGrid', FAMILY_BLURBS], ['gtFormulaGridMore', MORE_BLURBS]].forEach(function (g) {
      var host = $(g[0]); if (!host) return;
      host.replaceChildren.apply(host, g[1].map(function (f) { return formulaCard(chordType(f[0]), root, f[1]); }));
    });
  }
  if ($('gtFormulaRoot')) {
    ROOT_SPELL.forEach(function (n, i) { option($('gtFormulaRoot'), i, n); });
    $('gtFormulaRoot').onchange = renderFormulas;
    renderFormulas();
  }

  syncPressed();

});
