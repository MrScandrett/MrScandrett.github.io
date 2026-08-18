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

  /* Compute a fretting with a specific chord tone forced into the bass: mute every
     string below the string that carries that tone, then stack the rest normally. */
  function autoVoiceInversion(rootPC, chordType, inversionIndex) {
    var ivs = sortedIntervals(chordType);
    var bassIv = ivs[inversionIndex % ivs.length];
    var bassPC = mod12(rootPC + bassIv);
    var chordTones = {};
    ivs.forEach(function (iv) { chordTones[mod12(rootPC + iv)] = true; });

    var frets = TUNING.map(function () { return 'x'; });
    var bassStringIdx = -1, bassFret = null;
    for (var s = 0; s < TUNING.length && bassStringIdx < 0; s++) {
      for (var f = 0; f <= 11; f++) {
        if (mod12(TUNING[s].openPC + f) === bassPC) { bassStringIdx = s; bassFret = f; break; }
      }
    }
    if (bassStringIdx < 0) return frets;
    frets[bassStringIdx] = bassFret;
    for (var s2 = bassStringIdx + 1; s2 < TUNING.length; s2++) {
      for (var f2 = 0; f2 <= 11; f2++) {
        if (chordTones[mod12(TUNING[s2].openPC + f2)]) { frets[s2] = f2; break; }
      }
    }
    return frets;
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

  function getChordShape(rootPC, chordType, inversionIndex) {
    inversionIndex = inversionIndex || 0;
    var key = PITCHES[rootPC] + chordType.suffix;
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
    chordDisplayName: chordDisplayName,
    detectChords: detectChords
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  var GT = window.GuitarTheory;
  if (!GT) return;

  /* ---------- Shared fretboard rendering ---------- */

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

      var openCell = document.createElement('button');
      openCell.type = 'button';
      openCell.className = 'gc-cell gc-open-cell';
      openCell.setAttribute('aria-label', str.label + ' string, open or muted');
      if (val === 0) openCell.classList.add('is-open');
      if (val === 'x' || val === null || val === undefined) openCell.classList.add('is-muted');
      openCell.innerHTML = '<span class="gc-string-tag">' + str.label + '</span>' +
        (val === 0 ? '<span class="gc-dot gc-open-dot"></span>' : (val === 'x' || val == null ? '<span class="gc-mute-x">&times;</span>' : ''));
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
        cell.setAttribute('aria-label', str.label + ' string, fret ' + fret);
        if (val === fret) {
          cell.classList.add('has-note');
          cell.innerHTML = '<span class="gc-dot">' + (fingerNum ? '<span class="gc-finger-num">' + fingerNum + '</span>' : '') + '</span>';
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

  /* ---------- Builder (place-your-own-notes) ---------- */

  var builderState = [null, null, null, null, null, null]; /* low E..high e, value = fret number, 'x', or null */
  var builderBoard = document.getElementById('gcBuilderBoard');
  var builderResult = document.getElementById('gcBuilderResult');
  var builderNotes = document.getElementById('gcBuilderNotes');

  function renderBuilder() {
    if (!builderBoard) return;
    renderBoard(builderBoard, {
      startFret: 0,
      span: GT.BUILD_FRETS,
      frets: builderState,
      fingers: GT.computeFingering(builderState),
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
    updateBuilderResult();
  }

  function updateBuilderResult() {
    if (!builderResult) return;
    var detection = GT.detectChords(builderState);

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
  var encBoard = document.getElementById('gcEncBoard');
  var encMeta = document.getElementById('gcEncMeta');
  var encCurrentRoot = 0;
  var encCurrentType = GT.CHORD_TYPES[0];
  var encCurrentInversion = 0;

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

  function fingerSummary(fingers) {
    return fingers.map(function (f) { return f === 'x' ? '×' : (f === 'o' ? 'open' : f); }).join(' – ');
  }

  function renderEncyclopedia() {
    if (!encBoard) return;
    var shape = GT.getChordShape(encCurrentRoot, encCurrentType, encCurrentInversion);
    var name = GT.chordDisplayName(encCurrentRoot, encCurrentType);

    var numericFrets = shape.frets.filter(function (f) { return typeof f === 'number' && f > 0; });
    var maxFret = numericFrets.length ? Math.max.apply(null, numericFrets) : 0;
    var minFret = numericFrets.length ? Math.min.apply(null, numericFrets) : 0;
    var startFret = 0;
    if (maxFret > GT.BUILD_FRETS - 1) startFret = Math.max(0, minFret - 1);

    renderBoard(encBoard, { startFret: startFret, span: GT.BUILD_FRETS, frets: shape.frets, fingers: shape.fingers, interactive: false });

    if (encMeta) {
      var tag = shape.source === 'shape' ? 'Traditional open/barre shape' : 'Computed voicing — lowest matching fret per string';
      var detection = GT.detectChords(shape.frets);
      var notesLine = detection.notes.map(function (n) { return GT.PITCHES[n.pc]; }).join(' – ');
      var invLabel = GT.INVERSION_LABELS[encCurrentInversion] || (encCurrentInversion + 'th inversion');
      var bassNote = detection.notes.length ? GT.PITCHES[detection.notes[0].pc] : '';
      encMeta.innerHTML = '<h3>' + name + (encCurrentInversion === 0 ? '' : ' / ' + bassNote) + '</h3>' +
        '<p class="gc-enc-tag">' + tag + '</p>' +
        '<p class="gc-enc-notes"><strong>' + invLabel + '</strong> — bass note ' + bassNote + '</p>' +
        '<p class="gc-enc-notes">Notes: ' + notesLine + '</p>' +
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
    var shape = GT.getChordShape(encCurrentRoot, encCurrentType, encCurrentInversion);
    builderState = shape.frets.slice();
    renderBuilder();
    var target = document.getElementById('builder');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------- Scales & modes ---------- */

  var scaleRootPicker = document.getElementById('gcScaleRootPicker');
  var scaleTypePicker = document.getElementById('gcScaleTypePicker');
  var scaleBoard = document.getElementById('gcScaleBoard');
  var scaleMeta = document.getElementById('gcScaleMeta');
  var scaleCurrentRoot = 0;
  var scaleCurrentType = GT.SCALE_TYPES[0];
  var SCALE_SPAN = 12; /* show a full octave of frets so the pattern repeats visibly */

  var MODE_ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];

  function buildToneMap(rootPC, scaleType) {
    var map = {};
    scaleType.intervals.forEach(function (iv, i) {
      var pc = GT.mod12(rootPC + iv);
      map[pc] = { label: scaleType.degrees[i], isRoot: iv === 0 };
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
    openLabel.textContent = 'Open';
    head.appendChild(openLabel);
    for (var f = startFret + 1; f <= startFret + span; f++) {
      var fl = document.createElement('div');
      fl.className = 'gc-fret-label';
      fl.textContent = f;
      head.appendChild(fl);
    }
    board.appendChild(head);

    function dotHTML(tone) {
      return '<span class="gc-dot' + (tone.isRoot ? ' gc-dot-root' : '') + '"><span class="gc-degree-label">' + tone.label + '</span></span>';
    }

    GT.STRINGS_TOPDOWN.forEach(function (str) {
      var row = document.createElement('div');
      row.className = 'gc-row';
      row.setAttribute('data-string', str.label + str.num);

      var openTone = toneMap[GT.mod12(str.openPC)];
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

  function renderScales() {
    if (!scaleBoard) return;
    var toneMap = buildToneMap(scaleCurrentRoot, scaleCurrentType);
    renderScaleBoard(scaleBoard, { startFret: 0, span: SCALE_SPAN, toneMap: toneMap });

    if (scaleMeta) {
      var name = GT.PITCHES[scaleCurrentRoot] + ' ' + scaleCurrentType.name;
      var noteNames = scaleCurrentType.intervals.map(function (iv) { return GT.PITCHES[GT.mod12(scaleCurrentRoot + iv)]; });
      var html = '<h3>' + name + '</h3>';
      html += '<p class="gc-enc-tag">' + scaleCurrentType.degrees.length + '-note scale</p>';
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
  renderScales();

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
