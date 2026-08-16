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
