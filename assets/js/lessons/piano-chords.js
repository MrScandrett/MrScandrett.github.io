/* piano-chords.js — keyboard note engine, chord detector, and encyclopedia */
(function () {
  'use strict';

  var PITCHES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var WHITE_OFFSETS = [0, 2, 4, 5, 7, 9, 11]; /* C D E F G A B, within one octave */
  var BLACK_AFTER = [[0, 1], [1, 3], [3, 6], [4, 8], [5, 10]]; /* [whiteIdxWithinOctave, blackPc] */
  var OCTAVES = 2;
  var WHITE_COUNT = OCTAVES * 7 + 1; /* 15: two octaves + closing C */
  var KEY_SPAN = OCTAVES * 12; /* 24, plus the closing C at 24 */

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

  /* When voicing a chord for display, some intervals read better stacked an
     octave up (e.g. the 9th in add9) even though detection still works mod 12. */
  var VOICE_BUMP = { 'add9': { 2: 14 } };

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

  var INVERSION_LABELS = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];

  function mod12(n) { return ((n % 12) + 12) % 12; }

  /* Build the 15 white / 10 black key descriptors, abs index 0..24 (C4..C6). */
  function buildKeys() {
    var white = [];
    var black = [];
    for (var oct = 0; oct < OCTAVES; oct++) {
      for (var i = 0; i < 7; i++) {
        var globalWhiteIdx = oct * 7 + i;
        var absIndex = oct * 12 + WHITE_OFFSETS[i];
        white.push({ absIndex: absIndex, pc: WHITE_OFFSETS[i], globalWhiteIdx: globalWhiteIdx, isC: WHITE_OFFSETS[i] === 0, octave: oct });
      }
      BLACK_AFTER.forEach(function (pair) {
        var globalWhiteIdx = oct * 7 + pair[0];
        var absIndex = oct * 12 + pair[1];
        black.push({ absIndex: absIndex, pc: pair[1], leftWhiteIdx: globalWhiteIdx });
      });
    }
    /* closing C6 */
    white.push({ absIndex: KEY_SPAN, pc: 0, globalWhiteIdx: OCTAVES * 7, isC: true, octave: OCTAVES });
    return { white: white, black: black };
  }

  function chordDisplayName(rootPC, chordType) {
    return PITCHES[rootPC] + (chordType.suffix === '' ? '' : chordType.suffix);
  }

  function noteLabel(absIndex) {
    var pc = mod12(absIndex);
    var octave = 4 + Math.floor(absIndex / 12);
    return PITCHES[pc] + octave;
  }

  /* Compute the absolute key indices (0..24) for a closed-position voicing,
     rotated so the interval at `inversionIndex` (0 = root) sits in the bass. */
  function voiceChord(rootPC, chordType, inversionIndex) {
    inversionIndex = inversionIndex || 0;
    var bump = VOICE_BUMP[chordType.suffix] || {};
    var raw = chordType.intervals.map(function (iv) { return bump[iv] !== undefined ? bump[iv] : iv; });
    var sorted = raw.slice().sort(function (a, b) { return a - b; });
    var n = sorted.length;
    inversionIndex = inversionIndex % n;
    var rotated = sorted.slice(inversionIndex).concat(sorted.slice(0, inversionIndex));

    var abs = [];
    var prev = null;
    rotated.forEach(function (iv, i) {
      var val = mod12(rootPC + iv);
      if (i > 0) { while (val <= prev) val += 12; }
      abs.push(val);
      prev = val;
    });

    var maxIdx = Math.max.apply(null, abs);
    if (maxIdx > KEY_SPAN) abs = abs.map(function (v) { return v - 12; });
    return abs;
  }

  /* A general beginner-method fingering: thumb on the bottom note, pinky on the
     top note, fill in with the fingers in between. Applied bass-to-top regardless
     of inversion, which is how most method books teach it. */
  function typicalFingering(noteCount) {
    if (noteCount <= 1) return [1];
    if (noteCount === 2) return [1, 5];
    if (noteCount === 3) return [1, 3, 5];
    return [1, 2, 4, 5];
  }

  /* Detect chords from a set of absolute key indices (0..24), order-independent. */
  function detectChords(absIndices) {
    var notes = absIndices.slice().sort(function (a, b) { return a - b; }).map(function (idx) {
      return { absIndex: idx, pc: mod12(idx) };
    });
    if (notes.length === 0) return { notes: notes, matches: [] };

    var uniquePCs = [];
    notes.forEach(function (n) { if (uniquePCs.indexOf(n.pc) === -1) uniquePCs.push(n.pc); });
    var bassPC = notes[0].pc;

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

  window.PianoTheory = {
    PITCHES: PITCHES,
    CHORD_TYPES: CHORD_TYPES,
    SCALE_TYPES: SCALE_TYPES,
    KEY_SPAN: KEY_SPAN,
    WHITE_COUNT: WHITE_COUNT,
    INVERSION_LABELS: INVERSION_LABELS,
    mod12: mod12,
    buildKeys: buildKeys,
    chordDisplayName: chordDisplayName,
    noteLabel: noteLabel,
    voiceChord: voiceChord,
    typicalFingering: typicalFingering,
    detectChords: detectChords
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  var PT = window.PianoTheory;
  if (!PT) return;
  var KEYS = PT.buildKeys();

  /* ---------- Shared keyboard rendering ---------- */

  function renderKeyboard(container, opts) {
    opts = opts || {};
    var active = opts.active || {}; /* map absIndex -> true */
    var fingerMap = opts.fingerMap || {}; /* map absIndex -> finger number */
    var interactive = !!opts.interactive;
    var onToggle = opts.onToggle;

    container.innerHTML = '';
    var kb = document.createElement('div');
    kb.className = 'pc-keyboard' + (interactive ? ' is-interactive' : '');

    var whiteRow = document.createElement('div');
    whiteRow.className = 'pc-white-row';
    KEYS.white.forEach(function (k) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pc-key pc-white';
      if (active[k.absIndex]) btn.classList.add('is-active');
      btn.setAttribute('aria-label', PT.noteLabel(k.absIndex) + (fingerMap[k.absIndex] ? ', finger ' + fingerMap[k.absIndex] : ''));
      if (k.isC) {
        var tag = document.createElement('span');
        tag.className = 'pc-key-tag';
        tag.textContent = 'C' + (4 + k.octave);
        btn.appendChild(tag);
      }
      if (fingerMap[k.absIndex]) {
        var fw = document.createElement('span');
        fw.className = 'pc-finger-num pc-finger-white';
        fw.textContent = fingerMap[k.absIndex];
        btn.appendChild(fw);
      }
      if (interactive) btn.addEventListener('click', function () { onToggle(k.absIndex); });
      else btn.disabled = true;
      whiteRow.appendChild(btn);
    });
    kb.appendChild(whiteRow);

    var blackLayer = document.createElement('div');
    blackLayer.className = 'pc-black-layer';
    var whiteWidth = 100 / PT.WHITE_COUNT;
    var blackWidth = whiteWidth * 0.62;
    KEYS.black.forEach(function (k) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pc-key pc-black';
      if (active[k.absIndex]) btn.classList.add('is-active');
      btn.setAttribute('aria-label', PT.noteLabel(k.absIndex) + (fingerMap[k.absIndex] ? ', finger ' + fingerMap[k.absIndex] : ''));
      btn.style.left = ((k.leftWhiteIdx + 1) * whiteWidth - blackWidth / 2) + '%';
      btn.style.width = blackWidth + '%';
      if (fingerMap[k.absIndex]) {
        var fb = document.createElement('span');
        fb.className = 'pc-finger-num pc-finger-black';
        fb.textContent = fingerMap[k.absIndex];
        btn.appendChild(fb);
      }
      if (interactive) btn.addEventListener('click', function (e) { e.stopPropagation(); onToggle(k.absIndex); });
      else btn.disabled = true;
      blackLayer.appendChild(btn);
    });
    kb.appendChild(blackLayer);

    container.appendChild(kb);
  }

  function buildFingerMap(sortedAbsIndices) {
    var fingers = PT.typicalFingering(sortedAbsIndices.length);
    var map = {};
    sortedAbsIndices.forEach(function (idx, i) { map[idx] = fingers[i]; });
    return map;
  }

  /* ---------- Builder (place-your-own-notes) ---------- */

  var builderActive = {};
  var builderBoard = document.getElementById('pcBuilderBoard');
  var builderResult = document.getElementById('pcBuilderResult');
  var builderNotes = document.getElementById('pcBuilderNotes');

  function renderBuilder() {
    if (!builderBoard) return;
    var sortedIndices = Object.keys(builderActive).map(Number).sort(function (a, b) { return a - b; });
    renderKeyboard(builderBoard, {
      active: builderActive,
      fingerMap: buildFingerMap(sortedIndices),
      interactive: true,
      onToggle: function (absIndex) {
        if (builderActive[absIndex]) delete builderActive[absIndex];
        else builderActive[absIndex] = true;
        renderBuilder();
      }
    });
    updateBuilderResult();
  }

  function updateBuilderResult() {
    if (!builderResult) return;
    var indices = Object.keys(builderActive).map(Number);
    var detection = PT.detectChords(indices);

    if (detection.notes.length === 0) {
      builderResult.innerHTML = '<p class="pc-result-empty">Click keys on the keyboard above to select notes. Select three or more to see chord names appear.</p>';
      if (builderNotes) builderNotes.textContent = '';
      return;
    }

    var noteNames = detection.notes.map(function (n) { return PT.noteLabel(n.absIndex); });
    if (builderNotes) builderNotes.textContent = 'Notes played (low to high): ' + noteNames.join(' – ');

    if (detection.matches.length === 0) {
      builderResult.innerHTML = '<p class="pc-result-none"><strong>Not a standard chord in our dictionary.</strong> That\'s OK — not every combination of notes has a name. Try matching it against the chord types below.</p>';
      return;
    }

    var best = detection.matches[0];
    var html = '<div class="pc-result-main">';
    html += '<span class="pc-result-badge">' + (best.isRootPosition ? 'Root position' : 'Inversion') + '</span>';
    html += '<h3>' + (best.isRootPosition ? best.name : best.slashName) + '</h3>';
    html += '<p>' + best.chordType.name + ' — built from ' + PT.PITCHES[best.root] + '.</p>';
    html += '</div>';

    if (detection.matches.length > 1) {
      html += '<div class="pc-result-alt"><p class="pc-result-alt-label">These exact notes also spell:</p><ul>';
      detection.matches.slice(1).forEach(function (m) {
        html += '<li><strong>' + (m.isRootPosition ? m.name : m.slashName) + '</strong> <span>(' + m.chordType.name + ')</span></li>';
      });
      html += '</ul></div>';
    }
    builderResult.innerHTML = html;
  }

  var clearBtn = document.getElementById('pcClearBuilder');
  if (clearBtn) clearBtn.addEventListener('click', function () {
    builderActive = {};
    renderBuilder();
  });

  var challengeBtn = document.getElementById('pcChallengeBuilder');
  var challengeReadout = document.getElementById('pcChallengeReadout');
  if (challengeBtn) challengeBtn.addEventListener('click', function () {
    var root = Math.floor(Math.random() * 12);
    var typeList = [PT.CHORD_TYPES[0], PT.CHORD_TYPES[1], PT.CHORD_TYPES[2], PT.CHORD_TYPES[3], PT.CHORD_TYPES[4]];
    var type = typeList[Math.floor(Math.random() * typeList.length)];
    if (challengeReadout) {
      challengeReadout.textContent = 'Build a ' + PT.chordDisplayName(root, type) + ' (' + type.name + '). Select keys so the intervals from your lowest note match: ' + type.intervals.join(', ') + ' semitones.';
    }
  });

  renderBuilder();

  /* ---------- Encyclopedia ---------- */

  var rootPicker = document.getElementById('pcRootPicker');
  var typePicker = document.getElementById('pcTypePicker');
  var inversionPicker = document.getElementById('pcInversionPicker');
  var encBoard = document.getElementById('pcEncBoard');
  var encMeta = document.getElementById('pcEncMeta');
  var encCurrentRoot = 0;
  var encCurrentType = PT.CHORD_TYPES[0];
  var encCurrentInversion = 0;

  function buildPickers() {
    if (rootPicker) {
      PT.PITCHES.forEach(function (name, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pc-pick-btn';
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
      PT.CHORD_TYPES.forEach(function (ct, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pc-pick-btn pc-type-btn';
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
    var toneCount = encCurrentType.intervals.length;
    for (var i = 0; i < toneCount; i++) {
      (function (idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pc-pick-btn pc-inv-btn';
        btn.textContent = PT.INVERSION_LABELS[idx] || (idx + 'th inversion');
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

  function renderEncyclopedia() {
    if (!encBoard) return;
    var abs = PT.voiceChord(encCurrentRoot, encCurrentType, encCurrentInversion);
    var sortedAbs = abs.slice().sort(function (a, b) { return a - b; });
    var name = PT.chordDisplayName(encCurrentRoot, encCurrentType);
    var active = {};
    abs.forEach(function (idx) { active[idx] = true; });
    var fingerMap = buildFingerMap(sortedAbs);

    renderKeyboard(encBoard, { active: active, fingerMap: fingerMap, interactive: false });

    if (encMeta) {
      var notesLine = sortedAbs.map(function (idx) { return PT.noteLabel(idx); }).join(' – ');
      var fingerLine = sortedAbs.map(function (idx) { return fingerMap[idx]; }).join(' – ');
      var invLabel = PT.INVERSION_LABELS[encCurrentInversion] || (encCurrentInversion + 'th inversion');
      var bassNote = PT.PITCHES[PT.mod12(sortedAbs[0])];
      encMeta.innerHTML = '<h3>' + name + (encCurrentInversion === 0 ? '' : ' / ' + bassNote) + '</h3>' +
        '<p class="pc-enc-notes"><strong>' + invLabel + '</strong> — bass note ' + bassNote + '</p>' +
        '<p class="pc-enc-notes">Notes: ' + notesLine + '</p>' +
        '<p class="pc-enc-notes">Right-hand fingering (typical): ' + fingerLine + '</p>' +
        '<p class="pc-enc-formula">Formula: root' + encCurrentType.intervals.slice(1).map(function (i) { return ' + ' + i; }).join('') + ' semitones from ' + PT.PITCHES[encCurrentRoot] + '</p>';
    }
  }

  buildPickers();
  buildInversionPicker();
  renderEncyclopedia();

  var sendToBuilder = document.getElementById('pcSendToBuilder');
  if (sendToBuilder) sendToBuilder.addEventListener('click', function () {
    var abs = PT.voiceChord(encCurrentRoot, encCurrentType, encCurrentInversion);
    builderActive = {};
    abs.forEach(function (idx) { builderActive[idx] = true; });
    renderBuilder();
    var target = document.getElementById('builder');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------- Scales & modes ---------- */

  var scaleRootPicker = document.getElementById('pcScaleRootPicker');
  var scaleTypePicker = document.getElementById('pcScaleTypePicker');
  var scaleBoard = document.getElementById('pcScaleBoard');
  var scaleMeta = document.getElementById('pcScaleMeta');
  var scaleCurrentRoot = 0;
  var scaleCurrentType = PT.SCALE_TYPES[0];

  var MODE_ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];

  /* Every key (0..KEY_SPAN) whose pitch class is in the scale, not just one
     octave — the pattern should visibly repeat across the two-octave keyboard. */
  function buildScaleToneMap(rootPC, scaleType) {
    var map = {};
    for (var idx = 0; idx <= PT.KEY_SPAN; idx++) {
      var offset = PT.mod12(idx - rootPC);
      var pos = scaleType.intervals.indexOf(offset);
      if (pos !== -1) map[idx] = { label: scaleType.degrees[pos], isRoot: offset === 0 };
    }
    return map;
  }

  /* Read-only keyboard that labels every active key with its scale degree
     instead of a fingering number, and marks the root distinctly. */
  function renderScaleKeyboard(container, opts) {
    var toneMap = (opts && opts.toneMap) || {};

    container.innerHTML = '';
    var kb = document.createElement('div');
    kb.className = 'pc-keyboard';

    var whiteRow = document.createElement('div');
    whiteRow.className = 'pc-white-row';
    KEYS.white.forEach(function (k) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pc-key pc-white';
      btn.disabled = true;
      var tone = toneMap[k.absIndex];
      if (tone) {
        btn.classList.add('is-active');
        if (tone.isRoot) btn.classList.add('is-root');
      }
      btn.setAttribute('aria-label', PT.noteLabel(k.absIndex) + (tone ? ', scale degree ' + tone.label : ''));
      if (k.isC) {
        var tag = document.createElement('span');
        tag.className = 'pc-key-tag';
        tag.textContent = 'C' + (4 + k.octave);
        btn.appendChild(tag);
      }
      if (tone) {
        var dw = document.createElement('span');
        dw.className = 'pc-degree-num pc-degree-white';
        dw.textContent = tone.label;
        btn.appendChild(dw);
      }
      whiteRow.appendChild(btn);
    });
    kb.appendChild(whiteRow);

    var blackLayer = document.createElement('div');
    blackLayer.className = 'pc-black-layer';
    var whiteWidth = 100 / PT.WHITE_COUNT;
    var blackWidth = whiteWidth * 0.62;
    KEYS.black.forEach(function (k) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pc-key pc-black';
      btn.disabled = true;
      var tone = toneMap[k.absIndex];
      if (tone) {
        btn.classList.add('is-active');
        if (tone.isRoot) btn.classList.add('is-root');
      }
      btn.setAttribute('aria-label', PT.noteLabel(k.absIndex) + (tone ? ', scale degree ' + tone.label : ''));
      btn.style.left = ((k.leftWhiteIdx + 1) * whiteWidth - blackWidth / 2) + '%';
      btn.style.width = blackWidth + '%';
      if (tone) {
        var db = document.createElement('span');
        db.className = 'pc-degree-num pc-degree-black';
        db.textContent = tone.label;
        btn.appendChild(db);
      }
      blackLayer.appendChild(btn);
    });
    kb.appendChild(blackLayer);

    container.appendChild(kb);
  }

  function buildScalePickers() {
    if (scaleRootPicker) {
      PT.PITCHES.forEach(function (name, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pc-pick-btn';
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
      PT.SCALE_TYPES.forEach(function (st, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pc-pick-btn pc-type-btn';
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
    var toneMap = buildScaleToneMap(scaleCurrentRoot, scaleCurrentType);
    renderScaleKeyboard(scaleBoard, { toneMap: toneMap });

    if (scaleMeta) {
      var name = PT.PITCHES[scaleCurrentRoot] + ' ' + scaleCurrentType.name;
      var noteNames = scaleCurrentType.intervals.map(function (iv) { return PT.PITCHES[PT.mod12(scaleCurrentRoot + iv)]; });
      var html = '<h3>' + name + '</h3>';
      html += '<p class="pc-enc-notes">' + scaleCurrentType.degrees.length + '-note scale</p>';
      html += '<p class="pc-enc-notes">Notes: ' + noteNames.join(' – ') + '</p>';
      html += '<p class="pc-enc-notes">Scale degrees: ' + scaleCurrentType.degrees.join(' – ') + '</p>';
      if (scaleCurrentType.mode) {
        var parentRoot = PT.mod12(scaleCurrentRoot - PT.SCALE_TYPES[0].intervals[scaleCurrentType.mode - 1]);
        html += '<p class="pc-enc-notes">' + MODE_ORDINALS[scaleCurrentType.mode] + ' mode of the major scale — the same seven notes as <strong>' + PT.PITCHES[parentRoot] + ' Major</strong>, just starting from ' + PT.PITCHES[scaleCurrentRoot] + '.</p>';
      }
      html += '<p class="pc-enc-formula">' + scaleCurrentType.desc + '</p>';
      scaleMeta.innerHTML = html;
    }
  }

  buildScalePickers();
  renderScales();

  /* ---------- Quiz ---------- */
  var checkBtn = document.getElementById('pcCheckQuiz');
  if (checkBtn) checkBtn.addEventListener('click', function () {
    var quiz = document.getElementById('pcQuiz');
    var total = quiz.querySelectorAll('fieldset').length;
    var correct = 0;
    quiz.querySelectorAll('fieldset').forEach(function (fs) {
      var picked = fs.querySelector('input:checked');
      if (picked && picked.value === 'correct') correct++;
    });
    var out = document.getElementById('pcQuizResult');
    out.textContent = correct === total ? 'All ' + total + ' correct — you can read a keyboard chord like a pianist now.' : correct + ' of ' + total + ' correct. Review the sections above and try again.';
  });
});
