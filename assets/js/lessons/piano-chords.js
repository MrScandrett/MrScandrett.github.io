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

  /* Real-world pitch in Hz for a key (absIndex 0 = C4, MIDI 60) — used for audio
     playback only; everything else on this page works in abstract key indices. */
  function noteFreq(absIndex) {
    return 440 * Math.pow(2, (absIndex - 9) / 12);
  }

  /* Compute the absolute key indices (0..24) for a closed-position voicing,
     rotated so the interval at `inversionIndex` (0 = root) sits in the bass. */
  function voiceChord(rootPC, chordType, inversionIndex) {
    inversionIndex = inversionIndex || 0;
    var bump = VOICE_BUMP[chordType.suffix] || {};

    /* Which raw interval is the bass for this inversion is decided by
       "display" order (root, 3rd, 5th, then any bumped color tone like a 9th
       last) — so add9's 1st inversion means the 3rd in the bass, not the raw
       2nd/9th, matching how these are actually described and named. */
    var byDisplay = chordType.intervals.slice().sort(function (a, b) {
      var da = bump[a] !== undefined ? bump[a] : a;
      var db = bump[b] !== undefined ? bump[b] : b;
      return da - db;
    });
    var bassRaw = byDisplay[inversionIndex % byDisplay.length];

    /* Build the actual closed-position stack purely from raw (single-octave)
       interval values, rotated so bassRaw is first — the same safe algorithm
       every chord type uses. Feeding an already-bumped value (e.g. 14 for a
       9th) into this stacking step is what used to blow the span out to
       nearly two octaves or push notes below the keyboard entirely, since
       every later note then has to climb past that artificially high value
       too; keeping this pass entirely in raw 0–11 terms avoids that. */
    var sortedRaw = chordType.intervals.slice().sort(function (a, b) { return a - b; });
    var bassPos = sortedRaw.indexOf(bassRaw);
    var rotated = sortedRaw.slice(bassPos).concat(sortedRaw.slice(0, bassPos));

    var abs = [];
    var prev = null;
    rotated.forEach(function (iv, i) {
      var val = mod12(rootPC + iv);
      if (i > 0) { while (val <= prev) val += 12; }
      abs.push(val);
      prev = val;
    });

    /* Now nudge any display-bumped tone up an extra octave so it reads as a
       color tone on top — but only when it isn't the bass note itself (that
       would defeat the inversion just selected), only when it still fits on
       the keyboard, and only when doing so keeps the whole chord within a
       single reasonable hand span. Root position needs the nudge (without it
       the 9th sits a clashing 2 semitones from the root); most inversions
       already land it in a sensible spot on their own, so skipping an
       over-wide nudge there — rather than forcing it and blowing the voicing
       out — is the safer default. */
    var topBefore = Math.max.apply(null, abs);
    var bottomBefore = Math.min.apply(null, abs);
    var MAX_SPAN = 14; /* a major 9th — the same span root position's nudge produces */
    abs = abs.map(function (v, i) {
      var iv = rotated[i];
      if (i > 0 && bump[iv] !== undefined && v < topBefore) {
        var nudged = v + 12;
        if (nudged <= KEY_SPAN && nudged - bottomBefore <= MAX_SPAN) return nudged;
      }
      return v;
    });

    var maxIdx = Math.max.apply(null, abs);
    if (maxIdx > KEY_SPAN) abs = abs.map(function (v) { return v - 12; });
    return abs;
  }

  /* A general beginner-method fingering, applied bass-to-top regardless of
     inversion, which is how most method books teach it. Right hand: thumb (1)
     on the bottom note, pinky (5) on top. Left hand mirrors this — pinky (5)
     on the bottom note, thumb (1) on top — the standard paired convention
     every method book (Alfred's, Faber, Hal Leonard) teaches for block chords,
     since the two hands cross the keyboard in opposite directions. */
  function typicalFingering(noteCount, hand) {
    if (hand === 'left') {
      if (noteCount <= 1) return [5];
      if (noteCount === 2) return [5, 1];
      if (noteCount === 3) return [5, 3, 1];
      return [5, 4, 2, 1];
    }
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

  /* Interval label (R, ♭3, 3, ♭5, 5, ♯5, 6, ♭7, 7, plus 9/11 vs 2/4 depending
     on whether a 3rd is present) — same convention GuitarTheory uses, so
     chords and scales read consistently across both lessons. */
  function intervalLabel(iv, hasThird) {
    var LABELS = { 0: 'R', 3: '♭3', 4: '3', 6: '♭5', 7: '5', 8: '♯5', 9: '6', 10: '♭7', 11: '7' };
    if (iv === 2) return hasThird ? '9' : '2';
    if (iv === 5) return hasThird ? '11' : '4';
    return LABELS[iv] || String(iv);
  }

  /* Bucket a degree label into a coarse interval-quality category for the
     "color by interval quality" display mode. */
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
    noteFreq: noteFreq,
    voiceChord: voiceChord,
    typicalFingering: typicalFingering,
    detectChords: detectChords,
    intervalLabel: intervalLabel,
    degreeQuality: degreeQuality
  };
})();

/* piano-chords.js — additive-synthesis piano tone (Web Audio, no samples).
   A plucked string (guitar) decays the instant it's struck; a piano hammer
   hits a string too, but the struck tone is much brighter and richer in
   harmonics at the attack, so this uses a handful of sine partials — rather
   than guitar's Karplus-Strong noise-ring model — summed under one decay
   envelope. */
(function () {
  'use strict';

  var ctx = null;
  function getContext() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* Fundamental plus a handful of decreasingly-loud harmonics, all under one
     shared envelope — a struck piano string rings continuously from the
     moment of the hammer strike (no separate sustain plateau like an organ),
     so a single fast-attack, slow-decay envelope covers the whole note. */
  var HARMONICS = [
    { mult: 1, amp: 1 }, { mult: 2, amp: 0.5 }, { mult: 3, amp: 0.22 },
    { mult: 4, amp: 0.12 }, { mult: 6, amp: 0.05 }
  ];

  function tone(freq, opts) {
    opts = opts || {};
    var audioCtx = getContext();
    if (!audioCtx || !freq) return;
    var now = audioCtx.currentTime + (opts.delay || 0);
    var duration = opts.duration || 2.4;
    var peak = opts.gain != null ? opts.gain : 0.28;

    var master = audioCtx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(peak, now + 0.008);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    var filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(10000, freq * 6 + 1800);

    master.connect(filter);
    filter.connect(audioCtx.destination);

    HARMONICS.forEach(function (h) {
      var osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * h.mult;
      var g = audioCtx.createGain();
      g.gain.value = h.amp;
      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    });
  }

  /* All notes struck together — a "block" chord. */
  function block(freqs, opts) {
    opts = opts || {};
    freqs.forEach(function (f) { tone(f, { delay: opts.delay || 0, duration: opts.duration, gain: opts.gain }); });
  }

  /* Notes one at a time, evenly spaced — a "broken" chord, or a scale run. */
  function broken(freqs, opts) {
    opts = opts || {};
    var interval = opts.interval != null ? opts.interval : 0.26;
    freqs.forEach(function (f, i) {
      tone(f, { delay: i * interval, duration: opts.duration || interval * 2.6, gain: opts.gain });
    });
  }

  window.PianoAudio = { tone: tone, block: block, broken: broken, getContext: getContext };
})();

document.addEventListener('DOMContentLoaded', function () {
  var PT = window.PianoTheory;
  if (!PT) return;
  var KEYS = PT.buildKeys();

  /* ---------- Shared keyboard rendering ---------- */

  /* Chromatic "rainbow solfège" hue for a semitone-from-root value: red at the
     root through violet at the major 7th (0–270°, not a full wrap back to red,
     so adjacent-ish intervals stay visually distinct like the classroom
     rainbow-boomwhacker convention). */
  function rainbowHue(iv) {
    return Math.round((typeof iv === 'number' ? iv : 0) / 11 * 270);
  }

  /* Build a qualityMap (absIndex -> {label, quality, iv}) for a set of active
     notes given a chord's root pitch class and formula. */
  function buildQualityMap(rootPC, chordType, absIndices) {
    var ivs = chordType.intervals;
    var hasThird = ivs.indexOf(3) !== -1 || ivs.indexOf(4) !== -1;
    var map = {};
    absIndices.forEach(function (idx) {
      var iv = PT.mod12(PT.mod12(idx) - rootPC);
      var label = PT.intervalLabel(iv, hasThird);
      map[idx] = { label: label, quality: PT.degreeQuality(label), iv: iv };
    });
    return map;
  }

  function renderKeyboard(container, opts) {
    opts = opts || {};
    var active = opts.active || {}; /* map absIndex -> true */
    var fingerMap = opts.fingerMap || {}; /* map absIndex -> finger number */
    var qualityMap = opts.qualityMap || {}; /* map absIndex -> {label, quality, iv} */
    var interactive = !!opts.interactive;
    var onToggle = opts.onToggle;
    /* Read-only keyboards still let a student click any active key to hear its
       pitch — independent of edit mode, which is builder-only. */
    var playable = !interactive && opts.playable !== false;

    container.innerHTML = '';
    var kb = document.createElement('div');
    kb.className = 'pc-keyboard' + (interactive ? ' is-interactive' : '') + (playable ? ' is-playable' : '');

    var whiteRow = document.createElement('div');
    whiteRow.className = 'pc-white-row';
    KEYS.white.forEach(function (k) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pc-key pc-white';
      if (active[k.absIndex]) btn.classList.add('is-active');
      if (active[k.absIndex] && qualityMap[k.absIndex]) {
        btn.setAttribute('data-quality', qualityMap[k.absIndex].quality);
        btn.style.setProperty('--pc-hue', rainbowHue(qualityMap[k.absIndex].iv));
      }
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
      if (interactive) {
        btn.addEventListener('click', function () { onToggle(k.absIndex); });
      } else if (playable && active[k.absIndex]) {
        btn.addEventListener('click', function () {
          if (window.PianoAudio) window.PianoAudio.tone(PT.noteFreq(k.absIndex));
        });
      } else {
        btn.disabled = true;
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
      if (active[k.absIndex]) btn.classList.add('is-active');
      if (active[k.absIndex] && qualityMap[k.absIndex]) {
        btn.setAttribute('data-quality', qualityMap[k.absIndex].quality);
        btn.style.setProperty('--pc-hue', rainbowHue(qualityMap[k.absIndex].iv));
      }
      btn.setAttribute('aria-label', PT.noteLabel(k.absIndex) + (fingerMap[k.absIndex] ? ', finger ' + fingerMap[k.absIndex] : ''));
      btn.style.left = ((k.leftWhiteIdx + 1) * whiteWidth - blackWidth / 2) + '%';
      btn.style.width = blackWidth + '%';
      if (fingerMap[k.absIndex]) {
        var fb = document.createElement('span');
        fb.className = 'pc-finger-num pc-finger-black';
        fb.textContent = fingerMap[k.absIndex];
        btn.appendChild(fb);
      }
      if (interactive) {
        btn.addEventListener('click', function (e) { e.stopPropagation(); onToggle(k.absIndex); });
      } else if (playable && active[k.absIndex]) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (window.PianoAudio) window.PianoAudio.tone(PT.noteFreq(k.absIndex));
        });
      } else {
        btn.disabled = true;
      }
      blackLayer.appendChild(btn);
    });
    kb.appendChild(blackLayer);

    container.appendChild(kb);
  }

  function buildFingerMap(sortedAbsIndices, hand) {
    var fingers = PT.typicalFingering(sortedAbsIndices.length, hand);
    var map = {};
    sortedAbsIndices.forEach(function (idx, i) { map[idx] = fingers[i]; });
    return map;
  }

  /* ---------- Key color-coding mode (applies to every keyboard on the page) ---------- */

  var COLOR_MODES = [
    { key: 'default', label: 'Default', legend: 'Root notes are dark ink; every other active note shares one accent color.' },
    { key: 'rainbow', label: 'Rainbow (solfège)', legend: 'Chromatic rainbow order from the root (red) up through the major 7th (violet) — the same note is always the same color, in every chord and scale.' },
    { key: 'quality', label: 'Interval quality', legend: 'Minor = blue, Major = green, Perfect (4th/5th) = teal, Augmented = red, Diminished = purple. The root keeps its own dark marker.' },
    { key: 'bw', label: 'Black & white', legend: 'High-contrast outlines with no color — built for printing on a plain printer.' }
  ];
  var colorModePicker = document.getElementById('pcColorModePicker');
  var colorLegend = document.getElementById('pcColorLegend');
  var pcColorMode = 'default';
  try {
    var savedMode = localStorage.getItem('pcColorMode');
    if (savedMode && COLOR_MODES.some(function (m) { return m.key === savedMode; })) pcColorMode = savedMode;
  } catch (e) { /* localStorage unavailable — fall back to default */ }

  function applyColorMode() {
    document.body.setAttribute('data-pc-color-mode', pcColorMode);
    var mode = COLOR_MODES.filter(function (m) { return m.key === pcColorMode; })[0];
    if (colorLegend && mode) colorLegend.textContent = mode.legend;
    if (colorModePicker) {
      Array.prototype.forEach.call(colorModePicker.children, function (btn) {
        btn.classList.toggle('is-active', btn.getAttribute('data-mode') === pcColorMode);
      });
    }
  }

  if (colorModePicker) {
    COLOR_MODES.forEach(function (mode) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pc-pick-btn pc-type-btn';
      btn.textContent = mode.label;
      btn.setAttribute('data-mode', mode.key);
      btn.addEventListener('click', function () {
        pcColorMode = mode.key;
        try { localStorage.setItem('pcColorMode', pcColorMode); } catch (e) { /* ignore */ }
        applyColorMode();
      });
      colorModePicker.appendChild(btn);
    });
  }
  applyColorMode();

  /* ---------- Chord playback (shared by builder + encyclopedia) ---------- */

  /* mode: 'block' (all notes struck together), 'brokenUp'/'brokenDown' (one at
     a time in that direction), 'brokenUpDown' (up then back down without
     repeating the top note). */
  function playIndices(absIndices, mode) {
    if (!window.PianoAudio) return;
    var sorted = absIndices.slice().sort(function (a, b) { return a - b; });
    var freqs = sorted.map(function (idx) { return PT.noteFreq(idx); });
    if (!freqs.length) return;
    if (mode === 'block') window.PianoAudio.block(freqs);
    else if (mode === 'brokenDown') window.PianoAudio.broken(freqs.slice().reverse());
    else if (mode === 'brokenUpDown') window.PianoAudio.broken(freqs.concat(freqs.slice(0, -1).reverse()));
    else window.PianoAudio.broken(freqs);
  }

  /* ---------- Builder (place-your-own-notes) ---------- */

  var builderActive = {};
  var builderBoard = document.getElementById('pcBuilderBoard');
  var builderResult = document.getElementById('pcBuilderResult');
  var builderNotes = document.getElementById('pcBuilderNotes');

  function renderBuilder() {
    if (!builderBoard) return;
    var sortedIndices = Object.keys(builderActive).map(Number).sort(function (a, b) { return a - b; });
    var detection = PT.detectChords(sortedIndices);
    var qualityMap = (detection.matches && detection.matches.length)
      ? buildQualityMap(detection.matches[0].root, detection.matches[0].chordType, sortedIndices)
      : {};
    renderKeyboard(builderBoard, {
      active: builderActive,
      fingerMap: buildFingerMap(sortedIndices),
      qualityMap: qualityMap,
      interactive: true,
      onToggle: function (absIndex) {
        var turningOn = !builderActive[absIndex];
        if (builderActive[absIndex]) delete builderActive[absIndex];
        else builderActive[absIndex] = true;
        renderBuilder();
        if (turningOn && window.PianoAudio) window.PianoAudio.tone(PT.noteFreq(absIndex));
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

  var builderPlayBlock = document.getElementById('pcPlayBlock');
  var builderPlayBrokenUp = document.getElementById('pcPlayBrokenUp');
  var builderPlayBrokenDown = document.getElementById('pcPlayBrokenDown');
  var builderPlayBrokenUpDown = document.getElementById('pcPlayBrokenUpDown');
  if (builderPlayBlock) builderPlayBlock.addEventListener('click', function () { playIndices(Object.keys(builderActive).map(Number), 'block'); });
  if (builderPlayBrokenUp) builderPlayBrokenUp.addEventListener('click', function () { playIndices(Object.keys(builderActive).map(Number), 'brokenUp'); });
  if (builderPlayBrokenDown) builderPlayBrokenDown.addEventListener('click', function () { playIndices(Object.keys(builderActive).map(Number), 'brokenDown'); });
  if (builderPlayBrokenUpDown) builderPlayBrokenUpDown.addEventListener('click', function () { playIndices(Object.keys(builderActive).map(Number), 'brokenUpDown'); });

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
    var qualityMap = buildQualityMap(encCurrentRoot, encCurrentType, sortedAbs);

    renderKeyboard(encBoard, { active: active, fingerMap: fingerMap, qualityMap: qualityMap, interactive: false });

    if (encMeta) {
      var notesLine = sortedAbs.map(function (idx) { return PT.noteLabel(idx); }).join(' – ');
      var rhLine = sortedAbs.map(function (idx) { return fingerMap[idx]; }).join(' – ');
      var lhFingerMap = buildFingerMap(sortedAbs, 'left');
      var lhLine = sortedAbs.map(function (idx) { return lhFingerMap[idx]; }).join(' – ');
      var invLabel = PT.INVERSION_LABELS[encCurrentInversion] || (encCurrentInversion + 'th inversion');
      var bassNote = PT.PITCHES[PT.mod12(sortedAbs[0])];
      encMeta.innerHTML = '<h3>' + name + (encCurrentInversion === 0 ? '' : ' / ' + bassNote) + '</h3>' +
        '<p class="pc-enc-notes"><strong>' + invLabel + '</strong> — bass note ' + bassNote + '</p>' +
        '<p class="pc-enc-notes">Notes: ' + notesLine + '</p>' +
        '<p class="pc-enc-notes">Right-hand fingering (typical): ' + rhLine + '</p>' +
        '<p class="pc-enc-notes">Left-hand fingering (typical): ' + lhLine + '</p>' +
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

  function currentEncIndices() {
    return PT.voiceChord(encCurrentRoot, encCurrentType, encCurrentInversion);
  }
  var encPlayBlock = document.getElementById('pcEncPlayBlock');
  var encPlayBrokenUp = document.getElementById('pcEncPlayBrokenUp');
  var encPlayBrokenDown = document.getElementById('pcEncPlayBrokenDown');
  var encPlayBrokenUpDown = document.getElementById('pcEncPlayBrokenUpDown');
  if (encPlayBlock) encPlayBlock.addEventListener('click', function () { playIndices(currentEncIndices(), 'block'); });
  if (encPlayBrokenUp) encPlayBrokenUp.addEventListener('click', function () { playIndices(currentEncIndices(), 'brokenUp'); });
  if (encPlayBrokenDown) encPlayBrokenDown.addEventListener('click', function () { playIndices(currentEncIndices(), 'brokenDown'); });
  if (encPlayBrokenUpDown) encPlayBrokenUpDown.addEventListener('click', function () { playIndices(currentEncIndices(), 'brokenUpDown'); });

  /* ---------- Diatonic triad ladder (root / 1st inv / 2nd inv walk-up) ----------
     The seven triads built on each degree of the C major scale, root-to-root —
     the classic piano method-book voice-leading drill: play them root position
     (big hand jumps), then the same seven chords in 1st and 2nd inversion (each
     neighbor barely moves, since only one note changes). The 8th entry repeats
     the tonic to close the ladder back home. */
  var DIATONIC_TRIADS = [
    { root: 0, suffix: '' }, { root: 2, suffix: 'm' }, { root: 4, suffix: 'm' },
    { root: 5, suffix: '' }, { root: 7, suffix: '' }, { root: 9, suffix: 'm' },
    { root: 11, suffix: 'dim' }, { root: 0, suffix: '' }
  ];
  var DIATONIC_ROMANS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'I'];

  function ladderChordType(suffix) {
    return PT.CHORD_TYPES.filter(function (ct) { return ct.suffix === suffix; })[0];
  }

  function ladderIndices(inversionIndex) {
    return DIATONIC_TRIADS.map(function (entry) {
      return PT.voiceChord(entry.root, ladderChordType(entry.suffix), inversionIndex);
    });
  }

  function renderLadderStrip(containerId, inversionIndex) {
    var strip = document.getElementById(containerId);
    if (!strip) return;
    strip.innerHTML = '';
    DIATONIC_TRIADS.forEach(function (entry, i) {
      var ct = ladderChordType(entry.suffix);
      var abs = PT.voiceChord(entry.root, ct, inversionIndex);
      var sortedAbs = abs.slice().sort(function (a, b) { return a - b; });
      var active = {};
      abs.forEach(function (idx) { active[idx] = true; });
      var fingerMap = buildFingerMap(sortedAbs);
      var qualityMap = buildQualityMap(entry.root, ct, sortedAbs);

      var card = document.createElement('div');
      card.className = 'pc-ladder-chord';
      var label = document.createElement('p');
      label.className = 'pc-ladder-chord-label';
      label.innerHTML = '<strong>' + PT.chordDisplayName(entry.root, ct) + '</strong><span>' + DIATONIC_ROMANS[i] + '</span>';
      card.appendChild(label);
      var boardHost = document.createElement('div');
      card.appendChild(boardHost);
      renderKeyboard(boardHost, { active: active, fingerMap: fingerMap, qualityMap: qualityMap, interactive: false });
      strip.appendChild(card);
    });
  }

  renderLadderStrip('pcLadderStrip0', 0);
  renderLadderStrip('pcLadderStrip1', 1);
  renderLadderStrip('pcLadderStrip2', 2);

  var LADDER_CHORD_GAP = 0.9;
  Array.prototype.forEach.call(document.querySelectorAll('.pc-ladder-play'), function (btn) {
    btn.addEventListener('click', function () {
      if (!window.PianoAudio) return;
      var inv = parseInt(btn.getAttribute('data-inversion'), 10);
      ladderIndices(inv).forEach(function (abs, chordIdx) {
        var freqs = abs.map(function (idx) { return PT.noteFreq(idx); });
        freqs.forEach(function (f) { window.PianoAudio.tone(f, { delay: chordIdx * LADDER_CHORD_GAP }); });
      });
    });
  });

  var ladderPlayAll = document.getElementById('pcLadderPlayAll');
  if (ladderPlayAll) ladderPlayAll.addEventListener('click', function () {
    if (!window.PianoAudio) return;
    var all = ladderIndices(0).concat(ladderIndices(1)).concat(ladderIndices(2));
    all.forEach(function (abs, chordIdx) {
      var freqs = abs.map(function (idx) { return PT.noteFreq(idx); });
      freqs.forEach(function (f) { window.PianoAudio.tone(f, { delay: chordIdx * LADDER_CHORD_GAP }); });
    });
  });

  var ladderAddPractice = document.getElementById('pcLadderAddPractice');
  if (ladderAddPractice) ladderAddPractice.addEventListener('click', function () {
    [0, 1, 2].forEach(function (inv) {
      DIATONIC_TRIADS.slice(0, 7).forEach(function (entry) {
        addPracticeItem({ kind: 'chord', rootPC: entry.root, typeSuffix: entry.suffix, inversionIndex: inv });
      });
    });
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
      if (pos !== -1) map[idx] = { label: scaleType.degrees[pos], isRoot: offset === 0, iv: offset };
    }
    return map;
  }

  /* Read-only keyboard that labels every active key with its scale degree
     instead of a fingering number, and marks the root distinctly. */
  function renderScaleKeyboard(container, opts) {
    var toneMap = (opts && opts.toneMap) || {};
    var playable = !opts || opts.playable !== false;

    container.innerHTML = '';
    var kb = document.createElement('div');
    kb.className = 'pc-keyboard' + (playable ? ' is-playable' : '');

    var whiteRow = document.createElement('div');
    whiteRow.className = 'pc-white-row';
    KEYS.white.forEach(function (k) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pc-key pc-white';
      var tone = toneMap[k.absIndex];
      if (tone) {
        btn.classList.add('is-active');
        if (tone.isRoot) btn.classList.add('is-root');
        btn.setAttribute('data-quality', PT.degreeQuality(tone.label));
        btn.style.setProperty('--pc-hue', rainbowHue(tone.iv));
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
      if (playable && tone) {
        btn.addEventListener('click', function () {
          if (window.PianoAudio) window.PianoAudio.tone(PT.noteFreq(k.absIndex));
        });
      } else {
        btn.disabled = true;
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
      var tone = toneMap[k.absIndex];
      if (tone) {
        btn.classList.add('is-active');
        if (tone.isRoot) btn.classList.add('is-root');
        btn.setAttribute('data-quality', PT.degreeQuality(tone.label));
        btn.style.setProperty('--pc-hue', rainbowHue(tone.iv));
      }
      btn.setAttribute('aria-label', PT.noteLabel(k.absIndex) + (tone ? ', scale degree ' + tone.label : ''));
      btn.style.left = ((k.leftWhiteIdx + 1) * whiteWidth - blackWidth / 2) + '%';
      btn.style.width = blackWidth + '%';
      if (playable && tone) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (window.PianoAudio) window.PianoAudio.tone(PT.noteFreq(k.absIndex));
        });
      } else {
        btn.disabled = true;
      }
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

  /* One clean octave run starting on the root, using its actual position on
     the keyboard rather than an arbitrary register — matches exactly what the
     scale keyboard above highlights. */
  function scaleIndices() {
    var abs = scaleCurrentType.intervals.map(function (iv) { return scaleCurrentRoot + iv; });
    abs.push(scaleCurrentRoot + 12);
    return abs;
  }

  var scalePlayUp = document.getElementById('pcScalePlayUp');
  var scalePlayDown = document.getElementById('pcScalePlayDown');
  var scalePlayUpDown = document.getElementById('pcScalePlayUpDown');
  if (scalePlayUp) scalePlayUp.addEventListener('click', function () {
    if (!window.PianoAudio) return;
    window.PianoAudio.broken(scaleIndices().map(function (idx) { return PT.noteFreq(idx); }), { interval: 0.22 });
  });
  if (scalePlayDown) scalePlayDown.addEventListener('click', function () {
    if (!window.PianoAudio) return;
    window.PianoAudio.broken(scaleIndices().slice().reverse().map(function (idx) { return PT.noteFreq(idx); }), { interval: 0.22 });
  });
  if (scalePlayUpDown) scalePlayUpDown.addEventListener('click', function () {
    if (!window.PianoAudio) return;
    var abs = scaleIndices();
    var full = abs.concat(abs.slice(0, -1).reverse());
    window.PianoAudio.broken(full.map(function (idx) { return PT.noteFreq(idx); }), { interval: 0.22 });
  });

  /* ---------- Practice list: pick specific chords/scales, print a worksheet ---------- */

  var practiceList = [];
  try {
    var savedPractice = JSON.parse(localStorage.getItem('pcPracticeList') || '[]');
    if (Array.isArray(savedPractice)) practiceList = savedPractice;
  } catch (e) { practiceList = []; }

  var practiceListUI = document.getElementById('pcPracticeListUI');
  var practiceSheet = document.getElementById('pcPracticeSheetPrint');

  function savePracticeList() {
    try { localStorage.setItem('pcPracticeList', JSON.stringify(practiceList)); } catch (e) { /* ignore */ }
  }

  function practiceItemKey(item) {
    return item.kind === 'chord'
      ? ['chord', item.rootPC, item.typeSuffix, item.inversionIndex].join('|')
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
      var ct = PT.CHORD_TYPES.filter(function (c) { return c.suffix === item.typeSuffix; })[0];
      if (!ct) return { name: 'Unknown chord', sub: '' };
      var sub = PT.INVERSION_LABELS[item.inversionIndex] || (item.inversionIndex + 'th inversion');
      return { name: PT.chordDisplayName(item.rootPC, ct), sub: sub };
    }
    var st = PT.SCALE_TYPES.filter(function (s) { return s.key === item.scaleKey; })[0];
    if (!st) return { name: 'Unknown scale', sub: '' };
    return { name: PT.PITCHES[item.rootPC] + ' ' + st.name, sub: st.degrees.length + '-note scale' };
  }

  function renderPracticeListUI() {
    if (!practiceListUI) return;
    practiceListUI.innerHTML = '';
    practiceList.forEach(function (item, index) {
      var info = practiceItemLabel(item);
      var li = document.createElement('li');
      li.className = 'pc-practice-item';
      var infoWrap = document.createElement('div');
      infoWrap.className = 'pc-practice-item-info';
      infoWrap.innerHTML = '<span class="pc-practice-item-name">' + info.name + '</span><span class="pc-practice-item-sub">' + info.sub + '</span>';
      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'pc-practice-remove';
      removeBtn.setAttribute('aria-label', 'Remove ' + info.name + ' from practice list');
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', function () { removePracticeItem(index); });
      li.appendChild(infoWrap);
      li.appendChild(removeBtn);
      practiceListUI.appendChild(li);
    });
    var clearBtnEl = document.getElementById('pcClearPractice');
    var printBtnEl = document.getElementById('pcPrintPractice');
    if (clearBtnEl) clearBtnEl.disabled = practiceList.length === 0;
    if (printBtnEl) printBtnEl.disabled = practiceList.length === 0;
  }

  var addChordToPracticeBtn = document.getElementById('pcAddChordToPractice');
  if (addChordToPracticeBtn) addChordToPracticeBtn.addEventListener('click', function () {
    addPracticeItem({
      kind: 'chord',
      rootPC: encCurrentRoot,
      typeSuffix: encCurrentType.suffix,
      inversionIndex: encCurrentInversion
    });
  });

  var addScaleToPracticeBtn = document.getElementById('pcAddScaleToPractice');
  if (addScaleToPracticeBtn) addScaleToPracticeBtn.addEventListener('click', function () {
    addPracticeItem({ kind: 'scale', rootPC: scaleCurrentRoot, scaleKey: scaleCurrentType.key });
  });

  var clearPracticeBtn = document.getElementById('pcClearPractice');
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
    head.className = 'pc-sheet-head';
    head.innerHTML = '<h1>Piano practice sheet</h1><p>' + practiceList.length + ' item' + (practiceList.length === 1 ? '' : 's') + ' — from the Piano Chord Encyclopedia</p>';
    practiceSheet.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'pc-sheet-grid';

    practiceList.forEach(function (item) {
      var info = practiceItemLabel(item);
      var cell = document.createElement('div');
      cell.className = 'pc-sheet-item';
      var titleEl = document.createElement('h3');
      titleEl.textContent = info.name;
      var subEl = document.createElement('p');
      subEl.textContent = info.sub;
      cell.appendChild(titleEl);
      cell.appendChild(subEl);
      var boardHost = document.createElement('div');
      cell.appendChild(boardHost);

      if (item.kind === 'chord') {
        var ct = PT.CHORD_TYPES.filter(function (c) { return c.suffix === item.typeSuffix; })[0];
        if (ct) {
          var abs = PT.voiceChord(item.rootPC, ct, item.inversionIndex);
          var sortedAbs = abs.slice().sort(function (a, b) { return a - b; });
          var active = {};
          abs.forEach(function (idx) { active[idx] = true; });
          var fingerMap = buildFingerMap(sortedAbs);
          renderKeyboard(boardHost, { active: active, fingerMap: fingerMap, interactive: false, playable: false });
          var notesLine = document.createElement('p');
          notesLine.textContent = 'Notes: ' + sortedAbs.map(function (idx) { return PT.noteLabel(idx); }).join(' – ');
          cell.appendChild(notesLine);
        }
      } else {
        var st = PT.SCALE_TYPES.filter(function (s) { return s.key === item.scaleKey; })[0];
        if (st) {
          var toneMap = buildScaleToneMap(item.rootPC, st);
          renderScaleKeyboard(boardHost, { toneMap: toneMap, playable: false });
          var scaleNotesLine = document.createElement('p');
          scaleNotesLine.textContent = 'Notes: ' + st.intervals.map(function (iv) { return PT.PITCHES[PT.mod12(item.rootPC + iv)]; }).join(' – ');
          cell.appendChild(scaleNotesLine);
        }
      }
      grid.appendChild(cell);
    });

    practiceSheet.appendChild(grid);
  }

  var printPracticeBtn = document.getElementById('pcPrintPractice');
  if (printPracticeBtn) printPracticeBtn.addEventListener('click', function () {
    if (!practiceList.length) return;
    buildPracticeSheet();
    document.body.classList.add('pc-printing-practice');
    window.print();
  });
  window.addEventListener('afterprint', function () {
    document.body.classList.remove('pc-printing-practice');
  });

  renderPracticeListUI();

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
