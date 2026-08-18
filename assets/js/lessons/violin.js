/* violin.js — fretless fingerboard engine: note math, staff range map, interaction, audio */
(function () {
  'use strict';

  var PITCHES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var LETTER_STEP = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

  /* Standard tuning, perfect 5ths apart, low to high. */
  var STRINGS = [
    { label: 'G', openMidi: 55, hue: 'g' },
    { label: 'D', openMidi: 62, hue: 'd' },
    { label: 'A', openMidi: 69, hue: 'a' },
    { label: 'E', openMidi: 76, hue: 'e' }
  ];

  var FULL_SPAN = 24;   /* two octaves shown per string on the full neck */
  var FIRST_SPAN = 7;   /* first-position span: open (0) through the octave-adjacent 4th finger (7) */

  var INTERVAL_LABELS = ['R', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];

  var PATTERNS = [
    { id: 'major', name: 'Major scale', kind: 'Scale', intervals: [0, 2, 4, 5, 7, 9, 11] },
    { id: 'natminor', name: 'Natural minor scale', kind: 'Scale', intervals: [0, 2, 3, 5, 7, 8, 10] },
    { id: 'harmminor', name: 'Harmonic minor scale', kind: 'Scale', intervals: [0, 2, 3, 5, 7, 8, 11] },
    { id: 'melminor', name: 'Melodic minor scale (ascending)', kind: 'Scale', intervals: [0, 2, 3, 5, 7, 9, 11] },
    { id: 'majtriad', name: 'Major triad', kind: 'Arpeggio', intervals: [0, 4, 7] },
    { id: 'mintriad', name: 'Minor triad', kind: 'Arpeggio', intervals: [0, 3, 7] },
    { id: 'dim7', name: 'Diminished 7th', kind: 'Arpeggio', intervals: [0, 3, 6, 9] },
    { id: 'dom7', name: 'Dominant 7th', kind: 'Arpeggio', intervals: [0, 4, 7, 10] }
  ];

  function mod12(n) { return ((n % 12) + 12) % 12; }
  function mod2(n) { return ((n % 2) + 2) % 2; }

  /* A real string's speaking length shrinks geometrically as a finger moves toward the
     bridge (each semitone removes a fixed fraction of what's left) — so frets/positions
     compress higher up the neck instead of spacing out evenly like a ruler. */
  function semitoneFrac(n) { return 1 - Math.pow(2, -n / 12); }
  function fracToSemitone(f) { return -12 * (Math.log(1 - f) / Math.LN2); }

  /* Which finger (0=open .. 4) lands on a given scale/arpeggio degree in first position.
     Major-shaped patterns (whole-whole-half-whole from the open string) use one slot map;
     everything with a lowered 3rd (natural/harmonic/melodic minor, minor triad, dim7) uses
     the "low 2nd/3rd finger" slot map real players learn for minor keys. Degrees that don't
     land on a first-position slot (e.g. a dim7's b5) simply get no finger badge. */
  var MAJOR_FINGER_SLOTS = [0, 2, 4, 5, 7];
  var MINOR_FINGER_SLOTS = [0, 2, 3, 5, 7];
  function fingerForInterval(patternId, iv) {
    var slots = (patternId === 'major' || patternId === 'majtriad' || patternId === 'dom7') ? MAJOR_FINGER_SLOTS : MINOR_FINGER_SLOTS;
    var idx = slots.indexOf(iv);
    return idx === -1 ? null : idx;
  }

  function pcInfo(midi) {
    var pc = mod12(midi);
    var name = PITCHES[pc];
    var letter = name.charAt(0);
    var accidental = name.length > 1 ? '♯' : '';
    return { pc: pc, letter: letter, accidental: accidental };
  }

  function noteName(midi) {
    var info = pcInfo(midi);
    var octave = Math.floor(midi / 12) - 1;
    return info.letter + info.accidental + octave;
  }

  function freqOfMidi(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function diatonicStep(midi) {
    var info = pcInfo(midi);
    var octave = Math.floor(midi / 12) - 1;
    return octave * 7 + LETTER_STEP[info.letter];
  }

  var ViolinTheory = {
    PITCHES: PITCHES,
    STRINGS: STRINGS,
    FULL_SPAN: FULL_SPAN,
    FIRST_SPAN: FIRST_SPAN,
    INTERVAL_LABELS: INTERVAL_LABELS,
    PATTERNS: PATTERNS,
    mod12: mod12,
    pcInfo: pcInfo,
    noteName: noteName,
    freqOfMidi: freqOfMidi,
    diatonicStep: diatonicStep
  };
  window.ViolinTheory = ViolinTheory;

  /* ---------------- Audio: a plain oscillator per string, gain-enveloped ---------------- */

  var Audio = (function () {
    var ctx = null, master = null, muted = false;
    var voices = {}; /* stringLabel -> {osc, gain} */

    function ensureCtx() {
      if (ctx) return ctx;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.16;
      master.connect(ctx.destination);
      return ctx;
    }

    function setMuted(v) {
      muted = v;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.16, ctx.currentTime, 0.02);
    }

    function start(label, freq) {
      try {
        var c = ensureCtx();
        if (!c) return;
        if (c.state === 'suspended') c.resume();
        stop(label, true);
        var osc = c.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        var g = c.createGain();
        g.gain.value = 0;
        osc.connect(g);
        g.connect(master);
        osc.start();
        g.gain.linearRampToValueAtTime(1, c.currentTime + 0.02);
        voices[label] = { osc: osc, gain: g };
      } catch (e) { /* audio is a bonus feature; ignore failures */ }
    }

    function update(label, freq) {
      var v = voices[label];
      if (!v || !ctx) return;
      v.osc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.015);
    }

    function stop(label, immediate) {
      var v = voices[label];
      if (!v || !ctx) return;
      delete voices[label];
      try {
        var now = ctx.currentTime;
        v.gain.gain.cancelScheduledValues(now);
        v.gain.gain.setValueAtTime(v.gain.gain.value, now);
        v.gain.gain.linearRampToValueAtTime(0, now + (immediate ? 0.01 : 0.09));
        v.osc.stop(now + (immediate ? 0.02 : 0.11));
      } catch (e) { /* ignore */ }
    }

    function blip(freq, ms) {
      try {
        var c = ensureCtx();
        if (!c) return;
        if (c.state === 'suspended') c.resume();
        var osc = c.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        var g = c.createGain();
        g.gain.value = 0;
        osc.connect(g);
        g.connect(master);
        var now = c.currentTime;
        osc.start(now);
        g.gain.linearRampToValueAtTime(1, now + 0.015);
        g.gain.setValueAtTime(1, now + (ms / 1000) - 0.08);
        g.gain.linearRampToValueAtTime(0, now + (ms / 1000));
        osc.stop(now + (ms / 1000) + 0.02);
      } catch (e) { /* ignore */ }
    }

    return { start: start, update: update, stop: stop, blip: blip, setMuted: setMuted };
  })();

  /* ---------------- Fingerboard widget (percentage-based: always fills its container) ---------------- */

  function FingerboardWidget(root) {
    this.root = root;
    this.span = FULL_SPAN;
    this.showNames = true;
    this.highlight = null; /* {rootPC, pattern} */
    this.played = {}; /* label -> semitone (integer) or undefined */
    this.dragging = null;
    this.stepLabel = null; /* which string the playback cursor is currently on */
    this.stepOffset = null;
    this.build();
  }

  FingerboardWidget.prototype.build = function () {
    var self = this;
    this.root.innerHTML = '';
    this.root.className = (this.root.className || '') + ' vln-lanes';
    this.laneEls = {};

    STRINGS.forEach(function (str) {
      var lane = document.createElement('div');
      lane.className = 'vln-lane vln-hue-' + str.hue;

      var head = document.createElement('button');
      head.type = 'button';
      head.className = 'vln-open-btn';
      head.innerHTML = '<span class="vln-open-name">' + noteName(str.openMidi) + '</span><span class="vln-open-str">' + str.label + '</span><span class="vln-open-hz">' + freqOfMidi(str.openMidi).toFixed(1) + ' Hz</span>';
      head.addEventListener('click', function () {
        self.setPlayed(str.label, 0);
        Audio.blip(freqOfMidi(str.openMidi), 550);
      });
      lane.appendChild(head);

      var track = document.createElement('div');
      track.className = 'vln-track';
      track.setAttribute('data-string', str.label);
      track.tabIndex = 0;
      track.setAttribute('role', 'slider');
      track.setAttribute('aria-label', str.label + ' string pitch — arrow keys move by semitone, Home for open string');
      track.setAttribute('aria-valuemin', '0');
      lane.appendChild(track);

      self.attachDrag(track, str);
      self.attachKeys(track, str);

      this.root.appendChild(lane);
      this.laneEls[str.label] = { lane: lane, track: track };
    }, this);

    this.render();
  };

  FingerboardWidget.prototype.setSpan = function (span) {
    var self = this;
    Object.keys(this.played).forEach(function (l) { Audio.stop(l, true); });
    this.span = span;
    this.played = {};
    this.render();
    if (this.onChange) this.onChange();
  };

  FingerboardWidget.prototype.setShowNames = function (v) { this.showNames = v; this.render(); };

  FingerboardWidget.prototype.setHighlight = function (h) { this.highlight = h; this.render(); };

  FingerboardWidget.prototype.setPlayed = function (label, semitone) {
    this.played[label] = semitone;
    this.render();
    if (this.onChange) this.onChange();
  };

  FingerboardWidget.prototype.clear = function () {
    var self = this;
    Object.keys(this.played).forEach(function (l) { Audio.stop(l, true); });
    this.played = {};
    this.render();
    if (this.onChange) this.onChange();
  };

  FingerboardWidget.prototype.attachKeys = function (track, str) {
    var self = this;
    track.addEventListener('keydown', function (e) {
      var cur = self.played[str.label];
      var next = null;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = (cur === undefined ? 0 : cur) + (e.shiftKey ? 7 : 1);
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = (cur === undefined ? 0 : cur) - (e.shiftKey ? 7 : 1);
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = self.span;
      else return;
      e.preventDefault();
      if (next < 0) next = 0;
      if (next > self.span) next = self.span;
      self.setPlayed(str.label, next);
      Audio.blip(freqOfMidi(str.openMidi + next), 400);
    });
  };

  FingerboardWidget.prototype.attachDrag = function (track, str) {
    var self = this;
    var dot = document.createElement('div');
    dot.className = 'vln-ghost';
    dot.hidden = true;
    var lbl = document.createElement('div');
    lbl.className = 'vln-ghost-label';
    lbl.hidden = true;
    track.appendChild(dot);
    track.appendChild(lbl);

    function semitoneFromClientY(clientY) {
      var rect = track.getBoundingClientRect();
      var pct = (clientY - rect.top) / rect.height;
      if (pct < 0) pct = 0;
      if (pct > 1) pct = 1;
      var raw = fracToSemitone(pct * semitoneFrac(self.span));
      if (raw < 0) raw = 0;
      if (raw > self.span) raw = self.span;
      return raw;
    }

    function positionGhost(raw) {
      var pct = (semitoneFrac(raw) / semitoneFrac(self.span)) * 100;
      dot.style.top = pct + '%';
      dot.hidden = false;
      lbl.style.top = pct + '%';
      lbl.hidden = false;
      var nearest = Math.round(raw);
      var dist = Math.abs(raw - nearest);
      var midi = str.openMidi + nearest;
      if (dist < 0.14) {
        lbl.textContent = noteName(midi);
        lbl.classList.add('is-locked');
      } else {
        var lower = str.openMidi + Math.floor(raw);
        var upper = str.openMidi + Math.ceil(raw);
        lbl.textContent = noteName(lower) + ' → ' + noteName(upper);
        lbl.classList.remove('is-locked');
      }
      return nearest;
    }

    function onDown(e) {
      e.preventDefault();
      track.focus();
      var clientY = e.touches ? e.touches[0].clientY : e.clientY;
      var raw = semitoneFromClientY(clientY);
      positionGhost(raw);
      Audio.start(str.label, freqOfMidi(str.openMidi + raw));
      self.dragging = { label: str.label, track: track, active: true };
      if (track.setPointerCapture && e.pointerId != null) {
        try { track.setPointerCapture(e.pointerId); } catch (err) {}
      }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    }

    function onMove(e) {
      if (!self.dragging || self.dragging.track !== track) return;
      var clientY = e.touches ? e.touches[0].clientY : e.clientY;
      var raw = semitoneFromClientY(clientY);
      positionGhost(raw);
      Audio.update(str.label, freqOfMidi(str.openMidi + raw));
    }

    function onUp(e) {
      if (!self.dragging || self.dragging.track !== track) return;
      var clientY = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);
      var raw = typeof clientY === 'number' ? semitoneFromClientY(clientY) : 0;
      var nearest = Math.round(raw);
      Audio.stop(str.label);
      dot.hidden = true;
      lbl.hidden = true;
      self.dragging = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      self.setPlayed(str.label, nearest);
    }

    track.addEventListener('pointerdown', onDown);
  };

  var NECK_TAPER = 0.09; /* must match the clip-path inset in violin.css */

  FingerboardWidget.prototype.render = function () {
    var self = this;
    /* The board narrows toward the nut (see NECK_TAPER); the E string sits flush against
       that outer edge, so its note labels need extra clearance near the top or the taper
       clips them. Measured once per render since it depends on the rendered board width. */
    var taperMaxPx = self.root.getBoundingClientRect().width * NECK_TAPER;

    STRINGS.forEach(function (str) {
      var entry = self.laneEls[str.label];
      var track = entry.track;
      track.setAttribute('aria-valuemax', String(self.span));
      if (self.played[str.label] !== undefined) {
        track.setAttribute('aria-valuenow', String(self.played[str.label]));
        track.setAttribute('aria-valuetext', noteName(str.openMidi + self.played[str.label]));
      } else {
        track.setAttribute('aria-valuenow', '0');
        track.setAttribute('aria-valuetext', 'no note selected');
      }
      /* wipe everything except the persistent ghost/label nodes */
      var ghost = track.querySelector('.vln-ghost');
      var ghostLbl = track.querySelector('.vln-ghost-label');
      track.innerHTML = '';
      track.appendChild(ghost);
      track.appendChild(ghostLbl);

      var line = document.createElement('div');
      line.className = 'vln-string-line';
      track.appendChild(line);

      var highlightSet = null;
      if (self.highlight) {
        highlightSet = {};
        self.highlight.pattern.intervals.forEach(function (iv) {
          var pc = mod12(self.highlight.rootPC + iv);
          highlightSet[pc] = iv;
        });
      }

      for (var i = 0; i <= self.span; i++) {
        var midi = str.openMidi + i;
        var posPct = (semitoneFrac(i) / semitoneFrac(self.span)) * 100;
        var tick = document.createElement('div');
        tick.className = 'vln-tick' + (i === 0 ? ' vln-tick-open' : '');
        tick.style.top = posPct + '%';

        var mark = document.createElement('span');
        mark.className = 'vln-tick-mark';
        tick.appendChild(mark);

        var pc = mod12(midi);
        var hlIv = highlightSet && highlightSet.hasOwnProperty(pc) ? highlightSet[pc] : null;
        if (hlIv !== null) {
          tick.classList.add('is-hl');
          var deg = document.createElement('span');
          deg.className = 'vln-degree';
          deg.textContent = INTERVAL_LABELS[hlIv];
          tick.appendChild(deg);

          if (self.span === FIRST_SPAN) {
            var finger = fingerForInterval(self.highlight.pattern.id, hlIv);
            if (finger !== null) {
              var fingerEl = document.createElement('span');
              fingerEl.className = 'vln-finger';
              fingerEl.textContent = String(finger);
              tick.appendChild(fingerEl);
            }
          }
        }

        if (self.showNames) {
          var name = document.createElement('span');
          name.className = 'vln-tick-name';
          name.textContent = noteName(midi);
          if (str.label === 'E') name.style.right = (3 + taperMaxPx * (1 - posPct / 100)) + 'px';
          tick.appendChild(name);
        }

        if (self.played[str.label] === i) {
          tick.classList.add('is-played');
        }

        if (self.stepLabel === str.label && self.stepOffset === i) {
          tick.classList.add('is-step');
        }

        track.appendChild(tick);
      }
    });
  };

  FingerboardWidget.prototype.setStep = function (label, i) {
    this.stepLabel = label;
    this.stepOffset = i;
    this.render();
  };

  FingerboardWidget.prototype.clearStep = function () {
    this.stepLabel = null;
    this.stepOffset = null;
    this.render();
  };

  /* The order a violinist actually plays a highlighted scale/arpeggio: ascend each string
     in turn (low string to high), skipping a note that's the exact same pitch as the one
     that ended the previous string (a first-position 4th finger often lands on the same
     note as the next string's open note), then mirror back down for the descent. */
  FingerboardWidget.prototype.getHighlightSequence = function () {
    if (!this.highlight) return [];
    var self = this;
    var rootPC = this.highlight.rootPC;
    var pattern = this.highlight.pattern;
    var wanted = {};
    pattern.intervals.forEach(function (iv) { wanted[mod12(rootPC + iv)] = true; });

    var seq = [];
    var lastMidi = null;
    STRINGS.forEach(function (str) {
      for (var i = 0; i <= self.span; i++) {
        var midi = str.openMidi + i;
        if (!wanted[mod12(midi)]) continue;
        if (midi === lastMidi) continue;
        seq.push({ label: str.label, offset: i, midi: midi });
        lastMidi = midi;
      }
    });
    var down = seq.slice(0, -1).reverse();
    return seq.concat(down);
  };

  window.ViolinFingerboard = { create: function (el) { return new FingerboardWidget(el); }, Audio: Audio };

  /* ---------------- Treble-clef range staff (compact, sized for a side panel) ---------------- */

  function buildRangeStaff(container) {
    var REF = diatonicStep(64); /* E4 = bottom line */
    var LINE_SPACING = 13;
    var STEP_PX = LINE_SPACING / 2;
    var NOTE_R = 5;

    var allSteps = [REF, REF + 8];
    STRINGS.forEach(function (str) {
      allSteps.push(diatonicStep(str.openMidi));
      allSteps.push(diatonicStep(str.openMidi + FIRST_SPAN));
      allSteps.push(diatonicStep(str.openMidi + FULL_SPAN));
    });
    var minStep = Math.min.apply(null, allSteps) - 2;
    var maxStep = Math.max.apply(null, allSteps) + 2;

    var padTop = 36, padBottom = 22;
    var height = padTop + padBottom + (maxStep - minStep) * STEP_PX;
    var staffBottomY = padTop + (maxStep - REF) * STEP_PX;

    function yFor(step) { return staffBottomY - (step - REF) * STEP_PX; }

    var laneX0 = 82, laneW = 56;
    var width = laneX0 + STRINGS.length * laneW + 26;

    var svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Treble clef staff showing the pitch range of each violin string" xmlns="http://www.w3.org/2000/svg" class="vln-staff-svg">';

    for (var li = 0; li <= 4; li++) {
      var step = REF + li * 2;
      var y = yFor(step);
      svg += '<line x1="46" x2="' + (width - 8) + '" y1="' + y + '" y2="' + y + '" class="vln-staff-line" />';
    }
    svg += '<text x="49" y="' + (yFor(REF + 2) + 19) + '" class="vln-clef">𝄞</text>';

    STRINGS.forEach(function (str, idx) {
      var x = laneX0 + idx * laneW + laneW / 2;
      var openStep = diatonicStep(str.openMidi);
      var firstPosStep = diatonicStep(str.openMidi + FIRST_SPAN);
      var topStep = diatonicStep(str.openMidi + FULL_SPAN);

      svg += '<rect x="' + (x - 12) + '" y="' + yFor(topStep) + '" width="24" height="' + (yFor(openStep) - yFor(topStep)) + '" rx="7" class="vln-range-band vln-hue-' + str.hue + '" />';
      svg += '<rect x="' + (x - 12) + '" y="' + yFor(firstPosStep) + '" width="24" height="' + (yFor(openStep) - yFor(firstPosStep)) + '" rx="7" class="vln-range-band-core vln-hue-' + str.hue + '" />';

      [
        { step: openStep, midi: str.openMidi },
        { step: firstPosStep, midi: str.openMidi + FIRST_SPAN },
        { step: topStep, midi: str.openMidi + FULL_SPAN }
      ].forEach(function (pt) {
        var ny = yFor(pt.step);
        if (pt.step < REF) {
          for (var s = REF - 2; s >= pt.step; s -= 2) {
            var ly = yFor(s);
            svg += '<line x1="' + (x - 9) + '" x2="' + (x + 9) + '" y1="' + ly + '" y2="' + ly + '" class="vln-ledger" />';
          }
        } else if (pt.step > REF + 8) {
          for (var s2 = REF + 10; s2 <= pt.step; s2 += 2) {
            var ly2 = yFor(s2);
            svg += '<line x1="' + (x - 9) + '" x2="' + (x + 9) + '" y1="' + ly2 + '" y2="' + ly2 + '" class="vln-ledger" />';
          }
        }
        var info = pcInfo(pt.midi);
        svg += '<ellipse cx="' + x + '" cy="' + ny + '" rx="' + NOTE_R + '" ry="' + (NOTE_R - 1) + '" class="vln-notehead vln-hue-' + str.hue + '" />';
        if (info.accidental) svg += '<text x="' + (x - 13) + '" y="' + (ny + 3.5) + '" class="vln-accidental">♯</text>';
        svg += '<text x="' + x + '" y="' + (ny - 8) + '" class="vln-note-label">' + noteName(pt.midi) + '</text>';
      });

      svg += '<text x="' + x + '" y="' + (height - 5) + '" class="vln-string-label vln-hue-' + str.hue + '-text">' + str.label + '</text>';
    });

    svg += '</svg>';
    container.innerHTML = svg;
  }

  window.ViolinFingerboard.buildRangeStaff = buildRangeStaff;
})();

document.addEventListener('DOMContentLoaded', function () {
  var VT = window.ViolinTheory;
  var VF = window.ViolinFingerboard;
  if (!VT || !VF) return;

  var boardEl = document.getElementById('vlnBoard');
  if (!boardEl) return;
  var board = VF.create(boardEl);

  var readout = document.getElementById('vlnReadout');
  board.onChange = function () {
    var parts = [];
    VT.STRINGS.forEach(function (str) {
      var s = board.played[str.label];
      if (s === undefined) return;
      parts.push(str.label + ' ' + VT.noteName(str.openMidi + s));
    });
    if (readout) readout.textContent = parts.length ? parts.join('  ·  ') : 'Click, tap, or drag a string to place a note.';
  };
  board.onChange();

  /* Span toggle */
  var spanBtns = document.querySelectorAll('[data-vln-span]');
  spanBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      spanBtns.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      stopPlayback();
      board.setSpan(btn.getAttribute('data-vln-span') === 'first' ? VT.FIRST_SPAN : VT.FULL_SPAN);
    });
  });

  /* Show-names toggle */
  var namesToggle = document.getElementById('vlnShowNames');
  if (namesToggle) namesToggle.addEventListener('change', function () { board.setShowNames(namesToggle.checked); });

  /* Mute toggle */
  var muteToggle = document.getElementById('vlnMute');
  if (muteToggle) muteToggle.addEventListener('change', function () { VF.Audio.setMuted(muteToggle.checked); });

  /* Clear */
  var clearBtn = document.getElementById('vlnClear');
  if (clearBtn) clearBtn.addEventListener('click', function () { stopPlayback(); board.clear(); });

  /* Highlight picker: off / pattern / root */
  var rootPicker = document.getElementById('vlnRootPicker');
  var patternPicker = document.getElementById('vlnPatternPicker');
  var highlightOff = document.getElementById('vlnHighlightOff');
  var formulaOut = document.getElementById('vlnFormula');
  var playBtn = document.getElementById('vlnPlayPattern');
  var currentRoot = 7; /* G, matches the violin's lowest open string */
  var currentPattern = VT.PATTERNS[0];
  var highlightOn = false;
  var playTimer = null;

  function playLabel() { return highlightOn ? '▶ Play ' + currentPattern.kind.toLowerCase() : '▶ Play'; }

  function stopPlayback() {
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
    board.clearStep();
    if (playBtn) playBtn.textContent = playLabel();
  }

  function startPlayback() {
    if (!highlightOn) return;
    var seq = board.getHighlightSequence();
    if (!seq.length) return;
    var idx = 0;
    if (playBtn) playBtn.textContent = '■ Stop';
    function step() {
      if (idx >= seq.length) { stopPlayback(); return; }
      var n = seq[idx];
      board.setStep(n.label, n.offset);
      VF.Audio.blip(VT.freqOfMidi(n.midi), 380);
      idx++;
    }
    step();
    playTimer = setInterval(step, 420);
  }

  if (playBtn) {
    playBtn.addEventListener('click', function () {
      if (playTimer) stopPlayback(); else startPlayback();
    });
  }

  function applyHighlight() {
    stopPlayback();
    board.setHighlight(highlightOn ? { rootPC: currentRoot, pattern: currentPattern } : null);
    if (playBtn) {
      playBtn.disabled = !highlightOn;
      playBtn.textContent = playLabel();
    }
    if (formulaOut) {
      if (!highlightOn) {
        formulaOut.textContent = 'Pick a root and a pattern to highlight it across all four strings.';
      } else {
        var degs = currentPattern.intervals.map(function (iv) { return VT.INTERVAL_LABELS[iv]; }).join(' – ');
        formulaOut.textContent = VT.PITCHES[currentRoot] + ' ' + currentPattern.name + ' — ' + degs + ' (' + currentPattern.intervals.join(', ') + ' semitones)';
      }
    }
  }

  if (rootPicker) {
    VT.PITCHES.forEach(function (name, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vln-pick-btn';
      btn.textContent = name;
      if (idx === currentRoot) btn.classList.add('is-active');
      btn.addEventListener('click', function () {
        currentRoot = idx;
        highlightOn = true;
        Array.prototype.forEach.call(rootPicker.children, function (c) { c.classList.remove('is-active'); });
        btn.classList.add('is-active');
        if (highlightOff) highlightOff.classList.remove('is-active');
        applyHighlight();
      });
      rootPicker.appendChild(btn);
    });
  }
  if (patternPicker) {
    VT.PATTERNS.forEach(function (pt, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vln-pick-btn vln-pattern-btn';
      btn.textContent = pt.name;
      if (idx === 0) btn.classList.add('is-active');
      btn.addEventListener('click', function () {
        currentPattern = pt;
        highlightOn = true;
        Array.prototype.forEach.call(patternPicker.children, function (c) { c.classList.remove('is-active'); });
        btn.classList.add('is-active');
        if (highlightOff) highlightOff.classList.remove('is-active');
        applyHighlight();
      });
      patternPicker.appendChild(btn);
    });
  }
  if (highlightOff) {
    highlightOff.addEventListener('click', function () {
      highlightOn = false;
      highlightOff.classList.add('is-active');
      if (rootPicker) Array.prototype.forEach.call(rootPicker.children, function (c) { c.classList.remove('is-active'); });
      if (patternPicker) Array.prototype.forEach.call(patternPicker.children, function (c) { c.classList.remove('is-active'); });
      applyHighlight();
    });
  }
  applyHighlight();

  /* Range staff */
  var staffEl = document.getElementById('vlnStaff');
  if (staffEl) VF.buildRangeStaff(staffEl);

  /* Tabs */
  var tabBtns = document.querySelectorAll('.vln-tab');
  var panes = document.querySelectorAll('.vln-pane');
  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabBtns.forEach(function (b) { b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      panes.forEach(function (p) { p.classList.remove('is-active'); });
      var target = document.getElementById('pane-' + btn.getAttribute('data-tab'));
      if (target) target.classList.add('is-active');
    });
  });

  /* Quiz */
  var checkBtn = document.getElementById('vlnCheckQuiz');
  if (checkBtn) checkBtn.addEventListener('click', function () {
    var quiz = document.getElementById('vlnQuiz');
    var total = quiz.querySelectorAll('fieldset').length;
    var correct = 0;
    quiz.querySelectorAll('fieldset').forEach(function (fs) {
      var picked = fs.querySelector('input:checked');
      if (picked && picked.value === 'correct') correct++;
    });
    var out = document.getElementById('vlnQuizResult');
    out.textContent = correct === total ? 'All ' + total + ' correct!' : correct + ' of ' + total + ' correct — try again.';
  });
});
