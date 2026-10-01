/* music-modes.js — Greek genera & octave species, church modes, modern modes.
   One Web Audio engine plays arbitrary frequencies (so ancient tunings sound
   at their real pitch), and one keyboard component draws 12-TET keys with a
   "pin rail" above them that marks where a non-piano pitch actually falls. */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var cents = function (ratio) { return 1200 * Math.log2(ratio); };
  var etFreq = function (midi) { return 440 * Math.pow(2, (midi - 69) / 12); };
  var A3 = 57; // anchor of the Greater Perfect System (proslambanomenos) in the reconstruction

  /* ---------------------------------------------------------------- audio */
  var Sound = (function () {
    var ctx = null, out = null, volume = 0.7, drone = null;
    var live = new Set(), timers = new Set();
    function get() {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ctx) {
        ctx = new AC();
        out = ctx.createGain();
        out.gain.value = volume;
        var comp = ctx.createDynamicsCompressor();
        out.connect(comp);
        comp.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function track(o) { live.add(o); o.onended = function () { live.delete(o); }; }
    /* Struck-string tone: a few sine partials under one fast-attack decay. */
    var PARTIALS = [[1, 1], [2, 0.42], [3, 0.2], [4, 0.1], [5, 0.05], [6, 0.03]];
    function tone(freq, opt) {
      opt = opt || {};
      var c = get(); if (!c || !freq) return;
      var t = c.currentTime + 0.03 + (opt.at || 0);
      var dur = opt.dur || 1.3, peak = opt.gain != null ? opt.gain : 0.24;
      var env = c.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(peak, t + 0.01);
      env.gain.exponentialRampToValueAtTime(peak * 0.35, t + 0.3);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      var lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = Math.min(9000, freq * 7 + 1200);
      env.connect(lp); lp.connect(out);
      PARTIALS.forEach(function (p) {
        var o = c.createOscillator(), g = c.createGain();
        o.frequency.value = freq * p[0];
        g.gain.value = p[1];
        o.connect(g); g.connect(env);
        o.start(t); o.stop(t + dur + 0.05); track(o);
      });
    }
    /* Steady organ-like tone: no decay, so beating between two notes is audible. */
    function hold(freq, opt) {
      opt = opt || {};
      var c = get(); if (!c) return;
      var t = c.currentTime + 0.03 + (opt.at || 0), dur = opt.dur || 3;
      var env = c.createGain(), peak = opt.gain || 0.12;
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(peak, t + 0.08);
      env.gain.setValueAtTime(peak, t + dur - 0.25);
      env.gain.linearRampToValueAtTime(0.0001, t + dur);
      var lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 3200;
      env.connect(lp); lp.connect(out);
      var o = c.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = freq;
      o.connect(env); o.start(t); o.stop(t + dur + 0.05); track(o);
    }
    function droneStart(freq) {
      droneStop();
      var c = get(); if (!c) return;
      var t = c.currentTime, env = c.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.07, t + 0.4);
      var lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 900;
      env.connect(lp); lp.connect(out);
      var oscs = [[freq / 2, 'sawtooth'], [freq, 'triangle'], [freq * 1.5 / 2, 'triangle']].map(function (d, i) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = d[1]; o.frequency.value = d[0];
        g.gain.value = i === 2 ? 0.35 : 1;
        o.connect(g); g.connect(env); o.start(t);
        return o;
      });
      drone = { env: env, oscs: oscs };
    }
    function droneStop() {
      if (!drone || !ctx) { drone = null; return; }
      var t = ctx.currentTime, d = drone;
      d.env.gain.cancelScheduledValues(t);
      d.env.gain.setValueAtTime(d.env.gain.value, t);
      d.env.gain.linearRampToValueAtTime(0.0001, t + 0.25);
      d.oscs.forEach(function (o) { try { o.stop(t + 0.3); } catch (e) { /* stopped */ } });
      drone = null;
    }
    function later(fn, ms) {
      var id = setTimeout(function () { timers.delete(id); fn(); }, ms);
      timers.add(id);
      return id;
    }
    function stopAll() {
      live.forEach(function (o) { try { o.stop(); } catch (e) { /* stopped */ } });
      live.clear();
      timers.forEach(clearTimeout); timers.clear();
      droneStop();
      document.dispatchEvent(new CustomEvent('mm:stop'));
    }
    function setVolume(v) { volume = v; if (out) out.gain.value = v; }
    return { tone: tone, hold: hold, droneStart: droneStart, droneStop: droneStop, later: later, stopAll: stopAll, setVolume: setVolume, available: function () { return !!(window.AudioContext || window.webkitAudioContext); } };
  })();

  /* Play a list of {freq, midi?, x?} at a fixed step; onNote(i, note) fires in sync. */
  function playSeq(notes, opt) {
    opt = opt || {};
    var step = opt.step || 0.45;
    notes.forEach(function (n, i) {
      if (n.freq) Sound.tone(n.freq, { at: i * step, dur: n.dur || opt.dur || 1.1, gain: opt.gain });
      if (opt.onNote) Sound.later(function () { opt.onNote(i, n); }, i * step * 1000 + 30);
    });
    if (opt.onDone) Sound.later(opt.onDone, notes.length * step * 1000 + 500);
    return notes.length * step;
  }

  /* ---------------------------------------------------------------- names */
  var SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  var FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  var LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  var LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
  var pc = function (m) { return ((m % 12) + 12) % 12; };
  var isWhite = function (m) { return LETTER_PC.indexOf(pc(m)) >= 0; };
  function keyName(m, flats) { return (flats ? FLAT : SHARP)[pc(m)]; }
  function keyNameOct(m, flats) { return keyName(m, flats) + (Math.floor(m / 12) - 1); }
  function fmtCents(c) {
    var r = Math.round(c);
    if (r === 0) return '±0¢';
    return (r > 0 ? '+' : '−') + Math.abs(r) + '¢';
  }
  /* Spell a scale on a white-key tonic with one letter per degree. */
  function spell(tonicMidi, steps) {
    var li = LETTER_PC.indexOf(pc(tonicMidi));
    return steps.map(function (s, i) {
      var letter = LETTERS[(li + i) % 7];
      var natural = LETTER_PC[(li + i) % 7];
      var diff = pc(tonicMidi + s) - natural;
      if (diff > 6) diff -= 12;
      if (diff < -6) diff += 12;
      return letter + (diff === 1 ? '♯' : diff === -1 ? '♭' : diff === 2 ? '𝄪' : diff === -2 ? '𝄫' : '');
    });
  }

  /* ---------------------------------------------------------------- keyboard */
  function Keyboard(host, opt) {
    this.host = host;
    this.low = opt.low; this.high = opt.high;
    this.onPress = opt.onPress || null;
    this.flats = !!opt.flats;
    this.keys = {};
    this.build(opt);
  }
  Keyboard.prototype.build = function (opt) {
    var self = this;
    var whites = [];
    for (var m = this.low; m <= this.high; m++) if (isWhite(m)) whites.push(m);
    this.whites = whites;
    var n = whites.length;
    var scroll = document.createElement('div');
    scroll.className = 'mm-kb-scroll';
    var inner = document.createElement('div');
    inner.className = 'mm-kb-inner';
    inner.style.minWidth = Math.max(360, n * 34) + 'px';
    var rail = document.createElement('div');
    rail.className = 'mm-rail';
    rail.setAttribute('aria-hidden', 'true');
    var kb = document.createElement('div');
    kb.className = 'mm-kb';
    kb.setAttribute('role', 'group');
    kb.setAttribute('aria-label', opt.label || 'Piano keyboard');
    for (var k = this.low; k <= this.high; k++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.midi = k;
      b.setAttribute('aria-label', keyNameOct(k, this.flats));
      if (isWhite(k)) {
        var wi = whites.indexOf(k);
        b.className = 'mm-key mm-white';
        b.style.left = (wi / n * 100) + '%';
        b.style.width = (100 / n) + '%';
      } else {
        var left = whites.indexOf(k - 1) + 1;
        var w = 0.62 / n * 100;
        b.className = 'mm-key mm-black';
        b.style.left = (left / n * 100 - w / 2) + '%';
        b.style.width = w + '%';
      }
      b.innerHTML = '<span class="mm-key-name">' + keyName(k, this.flats) + (pc(k) === 0 ? '<small>' + (Math.floor(k / 12) - 1) + '</small>' : '') + '</span><span class="mm-key-badge"></span>';
      b.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        self.press(+this.dataset.midi);
      });
      // Assistive tech can fire a click with no pointer or key event first.
      b.addEventListener('click', function (e) { if (e.detail === 0) self.press(+this.dataset.midi); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self.press(+this.dataset.midi); }
      });
      this.keys[k] = b;
      kb.appendChild(b);
    }
    inner.appendChild(rail);
    inner.appendChild(kb);
    scroll.appendChild(inner);
    this.host.innerHTML = '';
    this.host.appendChild(scroll);
    this.rail = rail; this.kb = kb; this.scroll = scroll;
  };
  Keyboard.prototype.press = function (m) {
    Sound.tone(etFreq(m));
    this.flash(m);
    if (this.onPress) this.onPress(m);
  };
  /* Horizontal centre (0–100%) of a possibly fractional MIDI number. */
  Keyboard.prototype.xOf = function (x) {
    var self = this, n = this.whites.length;
    function center(m) {
      if (isWhite(m)) return (self.whites.indexOf(m) + 0.5) / n * 100;
      return (self.whites.indexOf(m - 1) + 1) / n * 100;
    }
    var lo = Math.floor(x), f = x - lo;
    lo = Math.max(this.low, Math.min(this.high, lo));
    var hi = Math.min(this.high, lo + 1);
    return center(lo) + (center(hi) - center(lo)) * f;
  };
  Keyboard.prototype.clear = function () {
    Object.keys(this.keys).forEach(function (k) {
      var b = this.keys[k];
      b.className = b.className.split(' ').filter(function (c) { return c === 'mm-key' || c === 'mm-white' || c === 'mm-black'; }).join(' ');
      b.querySelector('.mm-key-badge').textContent = '';
    }, this);
    this.rail.innerHTML = '';
  };
  Keyboard.prototype.mark = function (m, cls, badge) {
    var b = this.keys[m]; if (!b) return;
    b.classList.add(cls);
    if (badge != null) {
      var el = b.querySelector('.mm-key-badge');
      el.textContent = el.textContent ? el.textContent + '·' + badge : badge;
    }
  };
  Keyboard.prototype.flash = function (m, cls) {
    var b = this.keys[Math.round(m)]; if (!b) return;
    cls = cls || 'is-sounding';
    b.classList.remove(cls); void b.offsetWidth; b.classList.add(cls);
    setTimeout(function () { b.classList.remove(cls); }, 420);
  };
  /* Pins mark exact pitches; `x` is a fractional MIDI number. */
  Keyboard.prototype.pins = function (list) {
    var self = this, up = {}, prev = null;
    this.rail.innerHTML = '';
    // Stagger labels of pins that sit close together so the cents values stay readable.
    list.map(function (p, i) { return { i: i, x: self.xOf(p.x) }; }).sort(function (a, b) { return a.x - b.x; }).forEach(function (q) {
      up[q.i] = !!(prev && q.x - prev.x < 6 && !up[prev.i]);
      prev = q;
    });
    list.forEach(function (p, i) {
      var el = document.createElement('span');
      el.className = 'mm-pin' + (p.cls ? ' ' + p.cls : '') + (up[i] ? ' is-up' : '');
      el.style.left = self.xOf(p.x) + '%';
      el.dataset.i = i;
      el.innerHTML = '<i></i>' + (p.label ? '<b>' + p.label + '</b>' : '');
      if (p.title) el.title = p.title;
      self.rail.appendChild(el);
    });
  };
  Keyboard.prototype.pulsePin = function (i) {
    var el = this.rail.querySelector('.mm-pin[data-i="' + i + '"]');
    if (!el) return;
    el.classList.remove('is-sounding'); void el.offsetWidth; el.classList.add('is-sounding');
    setTimeout(function () { el.classList.remove('is-sounding'); }, 420);
  };
  Keyboard.prototype.scrollTo = function (m) {
    var x = this.xOf(m) / 100 * this.kb.scrollWidth;
    var sc = this.scroll;
    if (sc.scrollWidth > sc.clientWidth) sc.scrollLeft = Math.max(0, x - sc.clientWidth / 2);
  };

  /* ---------------------------------------------------------------- Greek theory data */
  var RATIO_TETRA = {
    // Archytas, as reported by Ptolemy (Harmonics I.13); diatonic for the "ratio" species uses Pythagorean (ditonic) 256/243·9/8·9/8
    archytas: { dia: ['28/27', '8/7', '9/8'], chr: ['28/27', '243/224', '32/27'], enh: ['28/27', '36/35', '5/4'] },
    pythagorean: { dia: ['256/243', '9/8', '9/8'] }
  };
  var PARTS = { dia: [6, 12, 12], chr: [6, 6, 18], enh: [3, 3, 24] }; // Aristoxenus: tone = 12 parts, fourth = 30
  function ratioVal(s) { var p = s.split('/'); return +p[0] / +p[1]; }
  /* Tetrachord as cumulative cents [0, a, b, fourth] plus step labels. */
  function tetrachord(genus, tuning) {
    if (tuning === 'aristoxenus') {
      var p = PARTS[genus], u = 500 / 30;
      return { pts: [0, p[0] * u, (p[0] + p[1]) * u, 500], labels: p.map(function (x) { return x + ' parts'; }), tone: 200 };
    }
    var set = tuning === 'ratio' && genus === 'dia' ? RATIO_TETRA.pythagorean.dia : RATIO_TETRA.archytas[genus];
    var r = set.map(ratioVal);
    return { pts: [0, cents(r[0]), cents(r[0] * r[1]), cents(r[0] * r[1] * r[2])], labels: set, tone: cents(9 / 8) };
  }
  var GPS_NAMES = ['proslambanomenos', 'hypate hypaton', 'parhypate hypaton', 'lichanos hypaton', 'hypate meson', 'parhypate meson', 'lichanos meson', 'mese', 'paramese', 'trite diezeugmenon', 'paranete diezeugmenon', 'nete diezeugmenon', 'trite hyperbolaion', 'paranete hyperbolaion', 'nete hyperbolaion'];
  /* Greater Perfect System, 15 notes, as cents above proslambanomenos (A). */
  function gps(genus, tuning) {
    var t = tetrachord(genus, tuning), F = t.pts[3], T = t.tone, out = [0], base = T;
    function tet() { out.push(base, base + t.pts[1], base + t.pts[2]); base += F; }
    tet(); tet(); out.push(base); base += T; tet(); tet(); out.push(base);
    return out;
  }
  var SPECIES = {
    1: { name: 'Mixolydian', letter: 'B', sameKeys: 'Locrian', namesake: { mode: 'Mixolydian', tonic: 67 } },
    2: { name: 'Lydian', letter: 'C', sameKeys: 'Ionian', namesake: { mode: 'Lydian', tonic: 65 } },
    3: { name: 'Phrygian', letter: 'D', sameKeys: 'Dorian', namesake: { mode: 'Phrygian', tonic: 64 } },
    4: { name: 'Dorian', letter: 'E', sameKeys: 'Phrygian', namesake: { mode: 'Dorian', tonic: 62 } },
    5: { name: 'Hypolydian', letter: 'F', sameKeys: 'Lydian', plagal: { church: 6, text: 'In chant, Hypolydian became Mode 6: final F, range C–c.' } },
    6: { name: 'Hypophrygian', letter: 'G', sameKeys: 'Mixolydian', plagal: { church: 4, text: 'In chant, Hypophrygian became Mode 4: final E, range B–b.' } },
    7: { name: 'Hypodorian', letter: 'A', sameKeys: 'Aeolian', plagal: { church: 2, text: 'In chant, Hypodorian became Mode 2: final D, range A–a. Heraclides reportedly called the old A–A harmonia “Aeolian,” the name Glarean later gave A–A.' } }
  };
  /* Octave species s (1–7) as 8 notes ascending: {c: cents above A3, x: fractional midi, name}. */
  function species(s, genus, tuning) {
    var g = gps(genus, tuning);
    var notes = [];
    for (var i = s; i <= s + 7; i++) notes.push({ c: g[i], x: A3 + g[i] / 100, greek: GPS_NAMES[i] });
    notes.forEach(function (n) {
      n.freq = etFreq(A3) * Math.pow(2, n.c / 1200);
      n.key = Math.round(n.x);
      n.dev = (n.x - n.key) * 100;
    });
    return notes;
  }

  var MODES = {
    Lydian: { steps: [0, 2, 4, 6, 7, 9, 11], char: 3, charLabel: '♯4', formula: '1 2 3 ♯4 5 6 7', sound: 'Major with a raised 4th. Floating and bright; film composers use it for flight and wonder.', greek: 'Greek Lydian was C–C, today’s Ionian (major).' },
    Ionian: { steps: [0, 2, 4, 5, 7, 9, 11], char: 6, charLabel: '7', formula: '1 2 3 4 5 6 7', sound: 'The major scale. The leading tone (7) pulls strongly toward home.', greek: 'Named by Glarean in 1547. Plato’s “Ionian” harmonia was something else, which he called soft and suited to drinking.' },
    Mixolydian: { steps: [0, 2, 4, 5, 7, 9, 10], char: 6, charLabel: '♭7', formula: '1 2 3 4 5 6 ♭7', sound: 'Major with a lowered 7th. You hear it in rock riffs, Celtic fiddle tunes, and bagpipe music.', greek: 'Greek Mixolydian was B–B, today’s Locrian. Aristoxenus credited Sappho with inventing it.' },
    Dorian: { steps: [0, 2, 3, 5, 7, 9, 10], char: 5, charLabel: '♮6', formula: '1 2 ♭3 4 5 6 ♭7', sound: 'Minor with a raised 6th. Examples: “Drunken Sailor,” “Scarborough Fair,” Miles Davis’s “So What.”', greek: 'Greek Dorian was E–E, today’s Phrygian. Plato kept it for its courage.' },
    Aeolian: { steps: [0, 2, 3, 5, 7, 8, 10], char: 5, charLabel: '♭6', formula: '1 2 ♭3 4 5 ♭6 ♭7', sound: 'Natural minor. The ♭6 gives it a heavier sound than Dorian.', greek: 'Named by Glarean in 1547. The Greek A–A octave (Hypodorian) was reportedly once called Aeolian, so this name lands close to where it started.' },
    Phrygian: { steps: [0, 1, 3, 5, 7, 8, 10], char: 1, charLabel: '♭2', formula: '1 ♭2 ♭3 4 5 ♭6 ♭7', sound: 'Minor with a lowered 2nd, a half step above the tonic. Common in flamenco and metal.', greek: 'Greek Phrygian was D–D, today’s Dorian. Aristotle called it ecstatic.' },
    Locrian: { steps: [0, 1, 3, 5, 6, 8, 10], char: 4, charLabel: '♭5', formula: '1 ♭2 ♭3 4 ♭5 ♭6 ♭7', sound: 'Its 5th is diminished, so the tonic chord is unstable. It rarely works as a home key.', greek: 'Cleonides used “Locrian” for A–A, today’s Aeolian. Glarean rejected the B mode as unusable.' }
  };
  var LADDER = ['Lydian', 'Ionian', 'Mixolydian', 'Dorian', 'Aeolian', 'Phrygian', 'Locrian'];
  function modeMidis(mode, tonic) { return MODES[mode].steps.concat([12]).map(function (s) { return tonic + s; }); }

  var CHURCH = [
    { n: 1, name: 'Dorian', kind: 'authentic', final: 62, lo: 62, hi: 74, tenor: 69, family: 'protus' },
    { n: 2, name: 'Hypodorian', kind: 'plagal', final: 62, lo: 57, hi: 69, tenor: 65, family: 'protus' },
    { n: 3, name: 'Phrygian', kind: 'authentic', final: 64, lo: 64, hi: 76, tenor: 72, family: 'deuterus' },
    { n: 4, name: 'Hypophrygian', kind: 'plagal', final: 64, lo: 59, hi: 71, tenor: 69, family: 'deuterus' },
    { n: 5, name: 'Lydian', kind: 'authentic', final: 65, lo: 65, hi: 77, tenor: 72, family: 'tritus' },
    { n: 6, name: 'Hypolydian', kind: 'plagal', final: 65, lo: 60, hi: 72, tenor: 69, family: 'tritus' },
    { n: 7, name: 'Mixolydian', kind: 'authentic', final: 67, lo: 67, hi: 79, tenor: 74, family: 'tetrardus' },
    { n: 8, name: 'Hypomixolydian', kind: 'plagal', final: 67, lo: 62, hi: 74, tenor: 72, family: 'tetrardus' }
  ];
  function whiteRange(lo, hi, bflat) {
    var out = [];
    for (var m = lo; m <= hi; m++) if (isWhite(m)) out.push(bflat && pc(m) === 11 ? m - 1 : m);
    return out;
  }

  var ETHOS = [
    { name: 'Dorian', place: 'Dorians of the Peloponnese (Sparta, Argos) and Crete', plato: 'Kept. It imitates the voice of a brave person facing danger.', aristotle: 'The most settled and dignified harmonia, good for educating the young.' },
    { name: 'Phrygian', place: 'Phrygia, inland Anatolia (Gordion, King Midas)', plato: 'Kept, for peaceful and voluntary actions such as prayer and persuasion.', aristotle: 'Ecstatic and emotional, like the aulos. Aristotle says Plato was wrong to keep it.' },
    { name: 'Lydian', place: 'Lydia, western Anatolia (Sardis, King Croesus)', plato: 'Rejected, along with “slack” Ionian, as soft music for drinking parties.', aristotle: 'Possibly suitable for children, because it combines order with education.' },
    { name: 'Mixolydian', place: '“Mixed Lydian.” Aristoxenus credited Sappho of Lesbos with it, and tragic poets used it.', plato: 'Rejected, along with tense Lydian, as music for mourning.', aristotle: 'Makes listeners sorrowful and grave.' },
    { name: 'Ionian (Iastian)', place: 'Ionia, the Aegean coast of Anatolia (Miletus, Ephesus)', plato: 'Rejected as soft and slack.', l2: 'Later theory', aristotle: 'Iastian became the name of a transposition key (tonos). It never meant our major scale in antiquity.' },
    { name: 'Aeolian · Locrian', place: 'Aeolians of Lesbos and Aeolis. Locris in central Greece and Locri in Italy.', plato: 'Not discussed by Plato.', l2: 'Later sources', aristotle: 'Heraclides reportedly counted Aeolian among three original Greek harmoniai. Cleonides used “Locrian” for the A–A species.' }
  ];

  /* ---------------------------------------------------------------- shared UI bits */
  function setPressed(group, attr, val) {
    $$('[' + attr + ']', group).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute(attr) === String(val))); });
  }
  function status(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
  function noAudioNote(id) { if (!Sound.available()) status(id, 'This browser does not support Web Audio, so the labs are silent. The keyboards and tables still work.'); }

  /* ---------------------------------------------------------------- 02 genus lab */
  function initGenus() {
    var host = $('#genusLab'); if (!host) return;
    var state = { genus: 'dia', tuning: 'archytas' };
    var E4 = 64;
    var kb = new Keyboard($('#genusKb'), { low: 60, high: 72, label: 'Keyboard for the tetrachord E to A' });
    var GNAMES = ['hypate', 'parhypate', 'lichanos', 'mese'];
    function notes() {
      var t = tetrachord(state.genus, state.tuning);
      return t.pts.map(function (c, i) {
        var x = E4 + c / 100, key = Math.round(x);
        return { c: c, x: x, key: key, dev: (x - key) * 100, freq: etFreq(E4) * Math.pow(2, c / 1200), greek: GNAMES[i], step: i ? t.labels[i - 1] : '' };
      });
    }
    function drawRuler(ns) {
      var svg = $('#genusRuler'), x0 = 40, k = 1.28, y = 80;
      var X = function (c) { return x0 + c * k; };
      var h = '';
      ['E', 'F', 'F♯', 'G', 'G♯', 'A'].forEach(function (nm, i) {
        h += '<line x1="' + X(i * 100) + '" y1="28" x2="' + X(i * 100) + '" y2="122" class="mm-ruler-grid"/>' +
          '<text x="' + X(i * 100) + '" y="142" text-anchor="middle" class="mm-ruler-key">' + nm + ' (' + i * 100 + '¢)</text>';
      });
      h += '<line x1="' + X(0) + '" y1="' + y + '" x2="' + X(ns[3].c) + '" y2="' + y + '" class="mm-ruler-line"/>';
      for (var i = 1; i < 4; i++) {
        var mx = (X(ns[i - 1].c) + X(ns[i].c)) / 2;
        h += '<text x="' + mx + '" y="' + (y - 22) + '" text-anchor="middle" class="mm-ruler-step">' + ns[i].step + '</text>' +
          '<text x="' + mx + '" y="' + (y + 32) + '" text-anchor="middle" class="mm-ruler-cents">' + Math.round(ns[i].c - ns[i - 1].c) + '¢</text>';
      }
      ns.forEach(function (n, i) { h += '<circle cx="' + X(n.c) + '" cy="' + y + '" r="8" class="mm-ruler-dot" data-i="' + i + '"/>'; });
      svg.innerHTML = h;
    }
    function render() {
      var ns = notes();
      kb.clear();
      ns.forEach(function (n, i) { kb.mark(n.key, 'is-greek', String(i + 1)); });
      kb.pins(ns.map(function (n) { return { x: n.x, label: fmtCents(n.dev), cls: Math.abs(n.dev) > 25 ? 'is-far' : '' }; }));
      drawRuler(ns);
      var dupes = {};
      ns.forEach(function (n) { dupes[n.key] = (dupes[n.key] || 0) + 1; });
      $('#genusTable').innerHTML = '<caption>Tetrachord on E (low) to A (high)</caption><thead><tr><th scope="col">Greek note</th><th scope="col">Cents above E</th><th scope="col">Step from previous</th><th scope="col">Nearest key</th><th scope="col">Piano error</th></tr></thead><tbody>' +
        ns.map(function (n) {
          return '<tr><th scope="row">' + n.greek + '</th><td>' + n.c.toFixed(1) + '</td><td>' + (n.step || '·') + '</td><td>' + keyName(n.key) + (dupes[n.key] > 1 ? ' <em>(shared)</em>' : '') + '</td><td class="' + (Math.abs(n.dev) > 25 ? 'is-bad' : '') + '">' + fmtCents(n.dev) + '</td></tr>';
        }).join('') + '</tbody>';
      var shared = Object.keys(dupes).filter(function (k) { return dupes[k] > 1; });
      status('genusStatus', shared.length
        ? 'Two Greek notes round to the same piano key (' + shared.map(function (k) { return keyName(+k); }).join(', ') + '). The piano cannot tell them apart.'
        : 'Every note has its own key. The worst rounding error here is ' + fmtCents(Math.max.apply(null, ns.map(function (n) { return Math.abs(n.dev); }))).replace(/^[+−±]/, '') + '.');
    }
    function pulse(i, n) { kb.flash(n.key); kb.pulsePin(n.idx != null ? n.idx : i); var d = $('#genusRuler .mm-ruler-dot[data-i="' + (n.idx != null ? n.idx : i) + '"]'); if (d) { d.classList.add('is-on'); setTimeout(function () { d.classList.remove('is-on'); }, 400); } }
    $$('[data-genus-pick]', host).forEach(function (b) {
      b.addEventListener('click', function () { state.genus = b.dataset.genusPick; setPressed(host, 'data-genus-pick', state.genus); render(); });
    });
    $('#genusTuning').addEventListener('change', function () { state.tuning = this.value; render(); });
    $('#genusDown').addEventListener('click', function () {
      Sound.stopAll();
      var ns = notes().map(function (n, i) { n.idx = i; return n; }).reverse();
      playSeq(ns, { onNote: pulse });
    });
    $('#genusUp').addEventListener('click', function () {
      Sound.stopAll();
      playSeq(notes().map(function (n, i) { n.idx = i; return n; }), { onNote: pulse });
    });
    $('#genusPiano').addEventListener('click', function () {
      Sound.stopAll();
      var ns = notes().map(function (n, i) { return { freq: etFreq(n.key), key: n.key, idx: i }; }).reverse();
      playSeq(ns, { onNote: function (i, n) { kb.flash(n.key); } });
    });
    $('#genusAB').addEventListener('click', function () {
      Sound.stopAll();
      var seq = [];
      notes().reverse().forEach(function (n, j) {
        seq.push({ freq: n.freq, key: n.key, idx: 3 - j });
        seq.push({ freq: etFreq(n.key), key: n.key, idx: 3 - j, piano: true });
      });
      playSeq(seq, { step: 0.55, onNote: function (i, n) { pulse(i, n); status('genusStatus', (n.piano ? 'Piano key ' : 'Greek pitch ') + '<b>' + keyName(n.key) + '</b>' + (n.piano ? '' : ' (' + fmtCents(notes()[n.idx].dev) + ' from the key)')); } });
    });
    render();
    noAudioNote('genusStatus');
  }

  /* ---------------------------------------------------------------- 03 octave species */
  function initSpecies() {
    var host = $('#speciesLab'); if (!host) return;
    var kb = new Keyboard($('#speciesKb'), { low: 57, high: 83, label: 'Keyboard comparing Greek and modern scales' });
    function get() { return { s: +$('#speciesPick').value, genus: $('#speciesGenus').value, tuning: $('#speciesTuning').value }; }
    function render() {
      var st = get(), sp = SPECIES[st.s], ns = species(st.s, st.genus, st.tuning);
      var modernKeys = sp.namesake ? modeMidis(sp.namesake.mode, sp.namesake.tonic) : [];
      kb.clear();
      ns.forEach(function (n, i) { kb.mark(n.key, 'is-greek', String(8 - i)); });
      modernKeys.forEach(function (m) { kb.mark(m, modernKeys && ns.some(function (n) { return n.key === m; }) ? 'is-both' : 'is-modern'); });
      kb.pins(ns.map(function (n) { return { x: n.x, label: fmtCents(n.dev), cls: Math.abs(n.dev) > 25 ? 'is-far' : '', title: n.greek }; }));
      var counts = {};
      ns.forEach(function (n) { counts[n.key] = (counts[n.key] || 0) + 1; });
      var greekLetters = ns.map(function (n) { return keyName(n.key); }).reverse().join(' ');
      var modernTxt = sp.namesake
        ? '<b>' + spell(sp.namesake.tonic, MODES[sp.namesake.mode].steps.concat([12])).join(' ') + '</b><span>' + keyName(sp.namesake.tonic) + ' ' + sp.namesake.mode + ', played from the bottom up. ' + MODES[sp.namesake.mode].formula + '</span>'
        : '<b>No modern mode with this name</b><span>' + sp.plagal.text + '</span>';
      $('#speciesCompare').innerHTML =
        '<article class="mm-cmp mm-cmp-greek"><h4>Greek ' + sp.name + ' · ' + sp.letter + '–' + sp.letter + '</h4><b>' + greekLetters + '</b><span>Sung from the top down. ' + (st.genus === 'dia' ? 'Diatonic genus.' : (st.genus === 'chr' ? 'Chromatic' : 'Enharmonic') + ' genus, so some notes have no piano key.') + '</span></article>' +
        '<article class="mm-cmp"><h4>Same keys, modern name</h4><b>' + sp.letter + ' ' + sp.sameKeys + '</b><span>Greek ' + sp.name + ' on white keys is what a modern musician calls <strong>' + sp.sameKeys + '</strong>.</span></article>' +
        '<article class="mm-cmp mm-cmp-modern"><h4>Today’s “' + sp.name + '”</h4>' + modernTxt + '</article>';
      $('#speciesTable').innerHTML = '<caption>Greek ' + sp.name + ', top to bottom (' + (st.tuning === 'ratio' ? 'ratio tuning' : 'Aristoxenus') + ')</caption><thead><tr><th scope="col">Greek note name</th><th scope="col">Cents above A</th><th scope="col">Nearest key</th><th scope="col">Greek minus piano</th></tr></thead><tbody>' +
        ns.slice().reverse().map(function (n) {
          return '<tr><th scope="row">' + n.greek + '</th><td>' + n.c.toFixed(1) + '</td><td>' + keyNameOct(n.key) + (counts[n.key] > 1 ? ' <em>(shared)</em>' : '') + '</td><td class="' + (Math.abs(n.dev) > 25 ? 'is-bad' : '') + '">' + fmtCents(n.dev) + '</td></tr>';
        }).join('') + '</tbody>';
      var shared = Object.keys(counts).filter(function (k) { return counts[k] > 1; });
      status('speciesStatus', shared.length
        ? '<strong>Piano limit:</strong> ' + shared.map(function (k) { return keyName(+k); }).join(' and ') + ' each have to stand for two different Greek notes. Play “Note by note” to hear the difference.'
        : 'All eight notes land within ' + Math.round(Math.max.apply(null, ns.map(function (n) { return Math.abs(n.dev); }))) + ' cents of a key, so the piano is a close match in this genus.');
      kb.scrollTo(ns[4].x);
    }
    ['#speciesPick', '#speciesGenus', '#speciesTuning'].forEach(function (s) { $(s).addEventListener('change', render); });
    function greekSeq() { var st = get(); return species(st.s, st.genus, st.tuning).map(function (n, i) { n.idx = i; return n; }).reverse(); }
    function pulse(i, n) { kb.flash(n.key); if (n.idx != null) kb.pulsePin(n.idx); }
    $('#speciesGreek').addEventListener('click', function () { Sound.stopAll(); playSeq(greekSeq(), { onNote: pulse }); });
    $('#speciesPiano').addEventListener('click', function () {
      Sound.stopAll();
      playSeq(greekSeq().map(function (n) { return { freq: etFreq(n.key), key: n.key }; }), { onNote: pulse });
    });
    $('#speciesAB').addEventListener('click', function () {
      Sound.stopAll();
      var seq = [];
      greekSeq().forEach(function (n) { seq.push(n); seq.push({ freq: etFreq(n.key), key: n.key, piano: true, dev: n.dev }); });
      playSeq(seq, { step: 0.55, onNote: function (i, n) { pulse(i, n); status('speciesStatus', n.piano ? 'Piano key <b>' + keyName(n.key) + '</b>' : 'Greek <b>' + n.greek + '</b>, ' + fmtCents(n.dev) + ' from ' + keyName(n.key)); } });
    });
    $('#speciesModern').addEventListener('click', function () {
      Sound.stopAll();
      var sp = SPECIES[get().s];
      if (!sp.namesake) { status('speciesStatus', sp.plagal.text + ' Open the church-mode explorer in section 05 to hear it.'); return; }
      playSeq(modeMidis(sp.namesake.mode, sp.namesake.tonic).map(function (m) { return { freq: etFreq(m), key: m }; }), { onNote: function (i, n) { kb.flash(n.key, 'is-sounding-modern'); } });
    });
    render();
    noAudioNote('speciesStatus');
  }

  /* ---------------------------------------------------------------- 04 ethos */
  function initEthos() {
    var grid = $('#ethosGrid'); if (!grid) return;
    grid.innerHTML = ETHOS.map(function (e) {
      return '<article><h3>' + e.name + '</h3><p class="mm-place">' + e.place + '</p><dl><dt>Plato, <i>Republic</i> III</dt><dd>' + e.plato + '</dd><dt>' + (e.l2 || 'Aristotle, <i>Politics</i> VIII') + '</dt><dd>' + e.aristotle + '</dd></dl></article>';
    }).join('');
  }

  /* ---------------------------------------------------------------- 05 church modes */
  function initChurch() {
    var host = $('#churchLab'); if (!host) return;
    var kb = new Keyboard($('#churchKb'), { low: 57, high: 79, flats: true, label: 'Keyboard showing the church mode range' });
    var cur = CHURCH[0];
    var pick = $('#churchPick');
    pick.innerHTML = CHURCH.map(function (m) {
      return '<button type="button" class="mm-seg-btn" data-church="' + m.n + '" aria-pressed="' + (m.n === 1) + '">' + m.n + ' · ' + m.name + '</button>';
    }).join('');
    function notes() { return whiteRange(cur.lo, cur.hi, $('#churchBflat').checked); }
    function render() {
      setPressed(pick, 'data-church', cur.n);
      kb.clear();
      notes().forEach(function (m) { kb.mark(m, 'is-modern'); });
      kb.mark(cur.final, 'is-final', '●');
      kb.mark(cur.tenor, 'is-tenor', '◆');
      $('#churchInfo').innerHTML = '<p><strong>Mode ' + cur.n + ' · ' + cur.name + '</strong> (' + cur.kind + ', <em>' + cur.family + '</em>). Final <b>' + keyName(cur.final) + '</b>, reciting tone <b>' + keyName(cur.tenor, true) + '</b>, range <b>' + keyNameOct(cur.lo) + '–' + keyNameOct(cur.hi) + '</b>.</p>' +
        '<p class="mm-church-greek">' + churchVsGreek(cur) + '</p>';
    }
    function churchVsGreek(m) {
      var map = { Dorian: 'E–E', Phrygian: 'D–D', Lydian: 'C–C', Mixolydian: 'B–B', Hypodorian: 'A–A', Hypophrygian: 'G–G', Hypolydian: 'F–F' };
      if (map[m.name]) return 'The Greek octave species called ' + m.name + ' was ' + map[m.name] + '. Same name, different notes.';
      return 'The Greeks had no “Hypomixolydian” species. Medieval theorists added this name to complete the pairs.';
    }
    pick.addEventListener('click', function (e) {
      var b = e.target.closest('[data-church]'); if (!b) return;
      cur = CHURCH[+b.dataset.church - 1]; render();
    });
    $('#churchBflat').addEventListener('change', function () {
      render();
      status('churchStatus', this.checked ? 'Every B is now B♭ (“soft B”). In Mode 5, F Lydian with B♭ is the same as F major.' : 'B is natural again (“hard B”).');
    });
    $('#churchRange').addEventListener('click', function () {
      Sound.stopAll();
      playSeq(notes().map(function (m) { return { freq: etFreq(m), key: m }; }), { onNote: function (i, n) { kb.flash(n.key); } });
    });
    $('#churchChant').addEventListener('click', function () {
      Sound.stopAll();
      // Schematic psalm-tone shape: rise from the final to the tenor, recite on it, then fall back to the final.
      var r = notes(), fi = r.indexOf(cur.final), ti = r.indexOf(cur.tenor);
      if (ti < 0) ti = r.indexOf(cur.tenor - 1);
      var up = [];
      for (var i = fi; i <= ti; i++) up.push(r[i]);
      var recite = [r[ti], r[ti], r[ti], r[ti]];
      var down = [r[ti + 1] || r[ti], r[ti], r[ti - 1]].concat(up.slice(0, -1).reverse());
      var seq = up.concat(recite, down).filter(function (m) { return m != null; });
      playSeq(seq.map(function (m) { return { freq: etFreq(m), key: m }; }), { step: 0.38, onNote: function (i, n) { kb.flash(n.key); } });
      status('churchStatus', 'A made-up recitation shape: rise from the final to the reciting tone, chant on it, then fall back to the final. Real psalm tones are more detailed.');
    });
    render();
  }

  /* ---------------------------------------------------------------- 06 modern ladder */
  function initModern() {
    var host = $('#modernLab'); if (!host) return;
    var kb = new Keyboard($('#modernKb'), { low: 60, high: 84, label: 'Keyboard showing the selected modern mode' });
    var mode = 'Dorian';
    var ladder = $('#modernLadder');
    ladder.innerHTML = LADDER.map(function (m, i) {
      return '<button type="button" class="mm-rung" data-mode="' + m + '" aria-pressed="' + (m === mode) + '" style="--rung:' + i + (i >= 4 ? ';color:#fff' : '') + '"><span>' + m + '</span><small>' + MODES[m].charLabel + '</small></button>';
    }).join('');
    function tonic() { return +$('#modernTonic').value; }
    function render() {
      setPressed(ladder, 'data-mode', mode);
      var t = tonic(), M = MODES[mode], ms = modeMidis(mode, t), names = spell(t, M.steps.concat([12]));
      kb.clear();
      ms.forEach(function (m, i) { kb.mark(m, i === 0 || i === 7 ? 'is-final' : (i === M.char ? 'is-char' : 'is-modern'), String(i + 1)); });
      var li = LADDER.indexOf(mode), prev = li > 0 ? LADDER[li - 1] : null, changed = '';
      if (prev) {
        var a = MODES[prev].steps, b = M.steps;
        for (var d = 0; d < 7; d++) if (a[d] !== b[d]) changed = spell(t, a)[d] + ' → ' + names[d];
      }
      $('#modernCard').innerHTML = '<h4>' + names[0] + ' ' + mode + '</h4><p class="mm-notes">' + names.map(function (n, i) { return i === M.char ? '<mark>' + n + '</mark>' : n; }).join(' ') + '</p>' +
        '<p><b>Formula:</b> <code>' + M.formula + '</code>. <b>Characteristic note:</b> ' + M.charLabel + '.' + (prev ? ' <b>One step darker than ' + prev + ':</b> ' + changed + '.' : ' <b>Brightest mode.</b> Every other mode is reached by lowering notes.') + '</p>' +
        '<p>' + M.sound + '</p><p class="mm-then">' + M.greek + '</p>';
    }
    ladder.addEventListener('click', function (e) { var b = e.target.closest('[data-mode]'); if (!b) return; mode = b.dataset.mode; render(); });
    $('#modernTonic').addEventListener('change', render);
    function withDrone(fn) {
      Sound.stopAll();
      if ($('#modernDrone').checked) Sound.droneStart(etFreq(tonic() - 12));
      return fn();
    }
    function scaleNotes(m) { var ms = modeMidis(m, tonic()); return ms.concat(ms.slice(0, -1).reverse()); }
    $('#modernPlay').addEventListener('click', function () {
      withDrone(function () {
        playSeq(scaleNotes(mode).map(function (m) { return { freq: etFreq(m), key: m }; }), { step: 0.36, onNote: function (i, n) { kb.flash(n.key); }, onDone: Sound.droneStop });
      });
    });
    $('#modernLick').addEventListener('click', function () {
      var t = tonic(), M = MODES[mode], c = t + M.steps[M.char];
      var seq = [t, t + M.steps[2], c, t + M.steps[M.char === 6 ? 5 : M.char + 1] || c, c, t + M.steps[2], t];
      if (M.char === 6) seq = [t, t + M.steps[4], t + M.steps[5], c, t + 12, c, t + M.steps[4], t];
      if (M.char === 1) seq = [t, c, t, t + M.steps[2], c, t];
      withDrone(function () {
        playSeq(seq.map(function (m) { return { freq: etFreq(m), key: m }; }), { step: 0.42, onNote: function (i, n) { kb.flash(n.key); }, onDone: Sound.droneStop });
      });
      status('modernStatus', 'Listen for <b>' + spell(t, M.steps)[M.char] + '</b> (' + M.charLabel + ') against the drone.');
    });
    $('#modernTour').addEventListener('click', function () {
      Sound.stopAll();
      var t = tonic(), at = 0;
      if ($('#modernDrone').checked) Sound.droneStart(etFreq(t - 12));
      LADDER.forEach(function (m) {
        Sound.later(function () { mode = m; render(); status('modernStatus', 'Now playing: <b>' + m + '</b>'); }, at * 1000);
        modeMidis(m, t).forEach(function (k, i) {
          Sound.tone(etFreq(k), { at: at + i * 0.22, dur: 0.8 });
          Sound.later(function () { kb.flash(k); }, (at + i * 0.22) * 1000);
        });
        at += 8 * 0.22 + 0.5;
      });
      Sound.later(Sound.droneStop, at * 1000);
    });
    render();
  }

  /* ---------------------------------------------------------------- 07 tuning */
  function initTuning() {
    var host = $('#tuneLab'); if (!host) return;
    var C4 = etFreq(60);
    var thirds = [
      { id: 'just', label: 'Pure 5:4', note: 'The just third (Ptolemy, Renaissance singers)', ratio: 5 / 4 },
      { id: 'pyth', label: 'Pythagorean 81:64', note: 'Two stacked 9:8 tones (Greek diatonic)', ratio: 81 / 64 },
      { id: 'et', label: 'Piano 12-TET', note: 'Four equal semitones', ratio: Math.pow(2, 4 / 12) }
    ];
    $('#thirds').innerHTML = thirds.map(function (t) {
      var beat = Math.abs(5 * C4 - 4 * C4 * t.ratio);
      return '<button type="button" class="mm-third" data-third="' + t.id + '"><b>' + t.label + '</b><span>' + cents(t.ratio).toFixed(1) + '¢</span><small>' + t.note + '</small><em>' + (beat < 0.05 ? 'No beats' : '≈ ' + beat.toFixed(1) + ' beats per second') + '</em></button>';
    }).join('');
    $('#thirds').addEventListener('click', function (e) {
      var b = e.target.closest('[data-third]'); if (!b) return;
      var t = thirds.filter(function (x) { return x.id === b.dataset.third; })[0];
      Sound.stopAll();
      Sound.hold(C4, { dur: 3.2 }); Sound.hold(C4 * t.ratio, { dur: 3.2 });
      status('tuneStatus', 'Playing the ' + t.label + ' third: C4 = ' + C4.toFixed(2) + ' Hz, E = ' + (C4 * t.ratio).toFixed(2) + ' Hz.');
    });
    var comma = Math.pow(1.5, 12) / Math.pow(2, 7);
    $('#commaPlay').addEventListener('click', function () {
      Sound.stopAll();
      Sound.tone(C4, { dur: 1.4 }); Sound.tone(C4 * comma, { at: 1.1, dur: 1.4 });
      status('tuneStatus', 'Start: ' + C4.toFixed(2) + ' Hz. After 12 pure fifths, down 7 octaves: ' + (C4 * comma).toFixed(2) + ' Hz (+' + cents(comma).toFixed(2) + '¢).');
    });
    $('#commaTogether').addEventListener('click', function () {
      Sound.stopAll();
      Sound.hold(C4, { dur: 4 }); Sound.hold(C4 * comma, { dur: 4 });
      status('tuneStatus', 'The two Cs are ' + (C4 * comma - C4).toFixed(2) + ' Hz apart, so you hear about ' + (C4 * comma - C4).toFixed(1) + ' beats per second.');
    });
  }

  /* ---------------------------------------------------------------- 08 ear training */
  function initEar() {
    var host = $('#earLab'); if (!host) return;
    var game = 'mode', round = null, score = 0, total = 0;
    var POOLS = { starter: ['Ionian', 'Dorian', 'Aeolian', 'Lydian'], seven: LADDER.slice() };
    var TONICS = [60, 62, 64, 65, 67];
    function rand(a) { return a[Math.floor(Math.random() * a.length)]; }
    function answers(list) {
      $('#earAnswers').innerHTML = list.map(function (a) { return '<button type="button" class="mm-btn mm-answer" data-ans="' + a.id + '">' + a.label + '</button>'; }).join('');
    }
    function setGame(g) {
      game = g; round = null;
      setPressed(host, 'data-ear-game', g);
      $('#earPoolWrap').hidden = g !== 'mode';
      $('#earReplay').disabled = true;
      $('#earAnswers').innerHTML = '';
      status('earFeedback', '');
      var prompts = {
        mode: 'You will hear a drone, then a scale up and down. Which mode is it?',
        genus: 'You will hear a Greek tetrachord sung from the top down (Archytas tuning). Which genus is it?',
        third: 'You will hear two sustained thirds, A and then B. Which one is the piano’s equal-tempered third? (Hint: it beats.)'
      };
      $('#earPrompt').textContent = prompts[g];
    }
    function play() {
      if (!round) return;
      Sound.stopAll();
      if (game === 'mode') {
        Sound.droneStart(etFreq(round.tonic - 12));
        var ms = modeMidis(round.answer, round.tonic);
        playSeq(ms.concat(ms.slice(0, -1).reverse()).map(function (m) { return { freq: etFreq(m) }; }), { step: 0.34, onDone: Sound.droneStop });
      } else if (game === 'genus') {
        var t = tetrachord(round.answer, 'archytas');
        var f = etFreq(64);
        var seq = t.pts.slice().reverse().map(function (c) { return { freq: f * Math.pow(2, c / 1200) }; });
        playSeq(seq.concat(seq.slice().reverse()), { step: 0.5 });
      } else {
        var C4 = etFreq(60);
        var a = round.answer === 'A' ? Math.pow(2, 4 / 12) : 5 / 4, b = round.answer === 'A' ? 5 / 4 : Math.pow(2, 4 / 12);
        Sound.hold(C4, { dur: 2.6 }); Sound.hold(C4 * a, { dur: 2.6 });
        Sound.hold(C4, { at: 3, dur: 2.6 }); Sound.hold(C4 * b, { at: 3, dur: 2.6 });
      }
    }
    function newRound() {
      if (game === 'mode') {
        var pool = POOLS[$('#earPool').value];
        round = { answer: rand(pool), tonic: rand(TONICS) };
        answers(pool.map(function (m) { return { id: m, label: m }; }));
      } else if (game === 'genus') {
        round = { answer: rand(['dia', 'chr', 'enh']) };
        answers([{ id: 'dia', label: 'Diatonic' }, { id: 'chr', label: 'Chromatic' }, { id: 'enh', label: 'Enharmonic' }]);
      } else {
        round = { answer: rand(['A', 'B']) };
        answers([{ id: 'A', label: 'A is the piano third' }, { id: 'B', label: 'B is the piano third' }]);
      }
      round.done = false;
      $('#earReplay').disabled = false;
      status('earFeedback', 'Listening…');
      play();
    }
    $('#earAnswers').addEventListener('click', function (e) {
      var b = e.target.closest('[data-ans]'); if (!b || !round || round.done) return;
      round.done = true; total++;
      var ok = b.dataset.ans === round.answer;
      if (ok) score++;
      $$('.mm-answer', host).forEach(function (x) {
        if (x.dataset.ans === round.answer) x.classList.add('is-right');
        else if (x === b) x.classList.add('is-wrong');
      });
      var why = '';
      if (game === 'mode') {
        var M = MODES[round.answer];
        why = keyName(round.tonic) + ' ' + round.answer + ': listen for the ' + M.charLabel + ' (' + spell(round.tonic, M.steps)[M.char] + ').';
      } else if (game === 'genus') {
        why = { dia: 'Diatonic: two whole-tone-sized steps on top.', chr: 'Chromatic: a minor-third leap on top, then two half-steps.', enh: 'Enharmonic: a major-third leap on top, then two tiny quarter-tone steps.' }[round.answer];
      } else {
        why = 'The tempered third is 14 cents wider than pure 5:4, so it beats about 10 times a second.';
      }
      status('earFeedback', (ok ? '✓ Correct. ' : '✗ Not quite. ') + why);
      $('#earScore').textContent = 'Score: ' + score + ' / ' + total;
    });
    $$('[data-ear-game]', host).forEach(function (b) { b.addEventListener('click', function () { setGame(b.dataset.earGame); }); });
    $('#earPool').addEventListener('change', function () { round = null; $('#earAnswers').innerHTML = ''; $('#earReplay').disabled = true; });
    $('#earNew').addEventListener('click', newRound);
    $('#earReplay').addEventListener('click', play);
    setGame('mode');
  }

  /* ---------------------------------------------------------------- 09 playing lab */
  var SAILOR_DORIAN = [69, 69, 69, 69, 69, 69, 69, 62, 65, 69, 67, 67, 67, 67, 67, 67, 67, 60, 64, 67, 69, 69, 69, 69, 69, 69, 69, 71, 72, 74, 72, 69, 67, 64, 62, 62];
  var EXERCISES = [
    { id: 'greek-dorian', title: 'Greek Dorian, the Greek way: E down to E', goal: 'Play the Greek Dorian octave from the top down, the way Greek theorists listed it. These are white keys only.', notes: [76, 74, 72, 71, 69, 67, 65, 64] },
    { id: 'modern-dorian', title: 'Modern Dorian: D up to D', goal: 'Play today’s Dorian upward on white keys. Compare it with the Greek Dorian exercise: same key colors, different starting note.', notes: [62, 64, 65, 67, 69, 71, 72, 74] },
    { id: 'flip', title: 'The flip: Greek Phrygian is modern Dorian', goal: 'Play Greek Phrygian from the top down (D to D). These are the same keys as modern Dorian, under a different name.', notes: [74, 72, 71, 69, 67, 65, 64, 62] },
    { id: 'sailor-dorian', title: '“Drunken Sailor” in D Dorian', goal: 'A traditional sea shanty in Dorian. The B natural in line 3 is Dorian’s raised 6th.', notes: SAILOR_DORIAN, lines: [10, 20, 30] },
    { id: 'sailor-aeolian', title: '“Drunken Sailor” in D Aeolian', goal: 'The same tune with B♭, a black key, in line 3. Only one note changes.', notes: SAILOR_DORIAN.map(function (m) { return m === 71 ? 70 : m; }), lines: [10, 20, 30], flats: true },
    { id: 'lydian', title: 'F Lydian: find the raised 4th', goal: 'Play F to F on white keys. The B natural (♯4 above F) is Lydian’s characteristic note. Then play it again with B♭ to hear F major (Ionian).', notes: [65, 67, 69, 71, 72, 74, 76, 77] },
    { id: 'mixo', title: 'G Mixolydian riff', goal: 'Up the scale, then land on the ♭7 (F) and back to G. This move is common in rock.', notes: [67, 69, 71, 72, 74, 76, 77, 79, 77, 74, 77, 79] },
    { id: 'mode8', title: 'Church Mode 8: range D–d, final G', goal: 'Plagal modes sit around their final. Walk up the D–d range, then come down to end on the final, G.', notes: [62, 64, 65, 67, 69, 71, 72, 74, 72, 71, 69, 67] }
  ];
  function initPlay() {
    var host = $('#playLab'); if (!host) return;
    var ex = EXERCISES[0], pos = 0;
    var kb = new Keyboard($('#playKb'), { low: 60, high: 84, label: 'Playable keyboard', onPress: function (m) { check(m); } });
    $('#playPick').innerHTML = EXERCISES.map(function (e, i) { return '<option value="' + i + '">' + e.title + '</option>'; }).join('');
    function draw() {
      $('#playGoal').textContent = ex.goal;
      $('#playSeq').innerHTML = ex.notes.map(function (m, i) {
        return '<li class="' + (i < pos ? 'is-done' : i === pos ? 'is-next' : '') + (ex.lines && ex.lines.indexOf(i) >= 0 ? ' mm-seq-break' : '') + '">' + keyName(m, ex.flats) + '</li>';
      }).join('');
      kb.clear();
      if ($('#playHints').checked && pos < ex.notes.length) { kb.mark(ex.notes[pos], 'is-target'); kb.scrollTo(ex.notes[pos]); }
    }
    function load(i) { ex = EXERCISES[i]; pos = 0; draw(); status('playStatus', 'Press the first key: <b>' + keyName(ex.notes[0], ex.flats) + '</b>.'); }
    function check(m) {
      if (pos >= ex.notes.length) return;
      if (m === ex.notes[pos]) {
        pos++;
        if (pos === ex.notes.length) status('playStatus', '✓ Finished: “' + ex.title + '.” Try it without the hints, or choose the next exercise.');
        else status('playStatus', '✓ Next: <b>' + keyName(ex.notes[pos], ex.flats) + '</b>');
      } else {
        kb.flash(m, 'is-wrong');
        status('playStatus', 'That was ' + keyName(m, ex.flats) + '. Look for <b>' + keyName(ex.notes[pos], ex.flats) + '</b>' + (m > ex.notes[pos] ? ' (lower)' : ' (higher)') + '.');
      }
      draw();
    }
    $('#playPick').addEventListener('change', function () { load(+this.value); });
    $('#playHints').addEventListener('change', draw);
    $('#playReset').addEventListener('click', function () { load(+$('#playPick').value); });
    $('#playDemo').addEventListener('click', function () {
      Sound.stopAll();
      playSeq(ex.notes.map(function (m) { return { freq: etFreq(m), key: m }; }), { step: 0.34, onNote: function (i, n) { kb.flash(n.key); } });
    });
    var MAP = { a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72, o: 73, l: 74, p: 75, ';': 76, "'": 77 };
    var held = {};
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      var tag = (e.target && e.target.tagName) || '';
      if (/INPUT|SELECT|TEXTAREA/.test(tag) && e.target.type !== 'checkbox') return;
      var m = MAP[e.key.toLowerCase()];
      if (m == null || held[m]) return;
      var r = host.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return; // only when the playing lab is on screen
      held[m] = true;
      e.preventDefault();
      kb.press(m);
    });
    document.addEventListener('keyup', function (e) { var m = MAP[(e.key || '').toLowerCase()]; if (m != null) held[m] = false; });
    load(0);
  }

  /* ---------------------------------------------------------------- 10 composition */
  function initCompose() {
    var host = $('#composeLab'); if (!host) return;
    var STEPS = 16, grid = new Array(STEPS).fill(null), playing = false, col = -1, timer = null;
    var STORE = 'mm-compose-v1';
    try { var saved = JSON.parse(localStorage.getItem(STORE) || 'null'); if (saved && saved.length === STEPS) grid = saved; } catch (e) { /* storage unavailable */ }
    function save() { try { localStorage.setItem(STORE, JSON.stringify(grid)); } catch (e) { /* storage unavailable */ } }
    /* Current scale: 8 notes ascending with freq + label + nearest key. */
    function scale(override) {
      var v = override || $('#compScale').value;
      if (v.indexOf('m:') === 0) {
        var mode = v.slice(2), t = +$('#compTonic').value, st = MODES[mode].steps.concat([12]), names = spell(t, st);
        return { title: keyName(t) + ' ' + mode, notes: st.map(function (s, i) { return { freq: etFreq(t + s), label: names[i] }; }), drone: etFreq(t - 12) };
      }
      var s = +v.slice(2), genus = $('#compGenus').value, ns = species(s, genus, 'ratio');
      return { title: 'Greek ' + SPECIES[s].name + ' (' + { dia: 'diatonic', chr: 'chromatic', enh: 'enharmonic' }[genus] + ')', notes: ns.map(function (n) { return { freq: n.freq, label: keyName(n.key) + (Math.abs(n.dev) >= 10 ? '<small>' + fmtCents(n.dev) + '</small>' : '') }; }), drone: ns[0].freq / 2 };
    }
    var gEl = $('#compGrid');
    function render() {
      var sc = scale(), h = '';
      for (var d = 7; d >= 0; d--) {
        h += '<div class="mm-row"><span class="mm-row-head"><b>' + (d + 1) + '</b> ' + sc.notes[d].label + '</span>';
        for (var c = 0; c < STEPS; c++) {
          h += '<button type="button" class="mm-cell' + (grid[c] === d ? ' is-on' : '') + (c % 4 === 0 ? ' is-beat' : '') + (c === col ? ' is-col' : '') + '" data-c="' + c + '" data-d="' + d + '" aria-pressed="' + (grid[c] === d) + '" aria-label="Beat ' + (c + 1) + ', degree ' + (d + 1) + '"></button>';
        }
        h += '</div>';
      }
      gEl.innerHTML = h;
    }
    function highlightCol(c) {
      $$('.mm-cell.is-col', gEl).forEach(function (x) { x.classList.remove('is-col'); });
      $$('.mm-cell[data-c="' + c + '"]', gEl).forEach(function (x) { x.classList.add('is-col'); });
    }
    gEl.addEventListener('click', function (e) {
      var b = e.target.closest('.mm-cell'); if (!b) return;
      var c = +b.dataset.c, d = +b.dataset.d;
      grid[c] = grid[c] === d ? null : d;
      if (grid[c] != null) Sound.tone(scale().notes[d].freq, { dur: 0.7 });
      save(); render();
    });
    function stop() {
      playing = false; col = -1; clearTimeout(timer); Sound.droneStop();
      $('#compPlay').textContent = '▶ Play loop'; highlightCol(-1);
    }
    function tick() {
      if (!playing) return;
      col = (col + 1) % STEPS;
      highlightCol(col);
      var d = grid[col], sc = scale();
      if (d != null) Sound.tone(sc.notes[d].freq, { dur: 0.6 });
      timer = setTimeout(tick, 60000 / +$('#compTempo').value / 2);
    }
    $('#compPlay').addEventListener('click', function () {
      if (playing) { stop(); return; }
      Sound.stopAll();
      playing = true; col = -1;
      if ($('#compDrone').checked) Sound.droneStart(scale().drone);
      this.textContent = '■ Stop loop';
      tick();
    });
    document.addEventListener('mm:stop', function () { if (playing) stop(); });
    $('#compTour').addEventListener('click', function () {
      stop(); Sound.stopAll();
      if (grid.every(function (d) { return d == null; })) { status('compStatus', 'Add some notes first, or load the starter phrase.'); return; }
      var stepDur = 60 / +$('#compTempo').value / 2, at = 0;
      LADDER.forEach(function (m) {
        var sc = scale('m:' + m);
        Sound.later(function () { status('compStatus', 'Your phrase in <b>' + sc.title + '</b>'); }, at * 1000);
        grid.forEach(function (d, c) { if (d != null) Sound.tone(sc.notes[d].freq, { at: at + c * stepDur, dur: 0.6 }); });
        at += STEPS * stepDur + 0.6;
      });
    });
    $('#compStarter').addEventListener('click', function () {
      grid = [0, null, 2, null, 4, 5, 4, null, 3, 2, 5, null, 4, 1, 0, null];
      save(); render(); status('compStatus', 'Starter phrase loaded. It touches degree 6, so Dorian and Aeolian sound clearly different.');
    });
    $('#compClear').addEventListener('click', function () { grid = new Array(STEPS).fill(null); save(); render(); });
    $('#compCopy').addEventListener('click', function () {
      var sc = scale();
      var txt = sc.title + ': ' + grid.map(function (d) { return d == null ? '–' : sc.notes[d].label.replace(/<[^>]+>/g, ' ').trim(); }).join(' ');
      var done = function () { status('compStatus', 'Copied: <code>' + txt + '</code>'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { status('compStatus', txt); });
      else status('compStatus', txt);
    });
    $('#compScale').addEventListener('change', function () {
      var greek = this.value.indexOf('g:') === 0;
      $('#compGenusWrap').hidden = !greek;
      $('#compTonicWrap').hidden = greek;
      if (playing && $('#compDrone').checked) Sound.droneStart(scale().drone);
      render();
    });
    ['#compTonic', '#compGenus'].forEach(function (s) { $(s).addEventListener('change', function () { if (playing && $('#compDrone').checked) Sound.droneStart(scale().drone); render(); }); });
    $('#compTempo').addEventListener('input', function () { $('#compTempoOut').textContent = this.value; });
    $('#compDrone').addEventListener('change', function () { if (!playing) return; if (this.checked) Sound.droneStart(scale().drone); else Sound.droneStop(); });
    render();
  }

  /* ---------------------------------------------------------------- hero, quiz, globals */
  function initHero() {
    $$('[data-hero-play]').forEach(function (b) {
      b.addEventListener('click', function () {
        Sound.stopAll();
        var which = b.dataset.heroPlay, notes;
        if (which === 'greek') notes = species(4, 'dia', 'ratio').reverse().map(function (n) { return { freq: n.freq }; });
        else if (which === 'medieval') notes = whiteRange(62, 74).concat([72, 71, 69, 67, 65, 64, 62]).map(function (m) { return { freq: etFreq(m) }; });
        else { Sound.droneStart(etFreq(50)); notes = modeMidis('Dorian', 62).map(function (m) { return { freq: etFreq(m) }; }); }
        playSeq(notes, { step: 0.36, onDone: which === 'modern' ? Sound.droneStop : null });
      });
    });
  }
  function initQuiz() {
    var btn = $('#mmQuizCheck'); if (!btn) return;
    btn.addEventListener('click', function () {
      var sets = $$('#mmQuiz fieldset'), right = 0, unanswered = 0;
      sets.forEach(function (fs) {
        var c = $('input:checked', fs);
        fs.classList.remove('is-right', 'is-wrong');
        if (!c) { unanswered++; return; }
        if (c.value === 'correct') { right++; fs.classList.add('is-right'); } else fs.classList.add('is-wrong');
      });
      $('#mmQuizResult').textContent = right + ' of ' + sets.length + ' correct' + (unanswered ? ' (' + unanswered + ' unanswered)' : '') + '. ' + (right === sets.length ? 'You can tell all three meanings apart.' : unanswered === sets.length ? 'Choose an answer for each question first.' : 'Review the sections for the questions marked in red.');
    });
  }
  function initGlobal() {
    $('#mmStop').addEventListener('click', Sound.stopAll);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') Sound.stopAll(); });
    $('#mmVolume').addEventListener('input', function () { Sound.setVolume(this.value / 100); });
    var names = $('#mmNames');
    names.addEventListener('change', function () { document.body.classList.toggle('mm-hide-names', !this.checked); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initGlobal(); initHero(); initGenus(); initSpecies(); initEthos(); initChurch(); initModern(); initTuning(); initEar(); initPlay(); initCompose(); initQuiz();
  });

  window.MusicModes = { species: species, tetrachord: tetrachord, gps: gps, MODES: MODES, spell: spell };
})();
