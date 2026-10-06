/* fake-book.js — Fake Book lesson: public-domain lead sheets you can transpose,
 * vary (melodic inversion, retrograde, passing tones, skeleton, chord tones;
 * dotted, snapped, pushed and driven rhythms), voice (chord inversions, smooth
 * voice leading, shells) and play along with (metronome + generated band).
 *
 * Tunes: data/fake-book.json (its "format" block documents the notation).
 * Engraving: assets/js/music-notation.js (Bravura glyphs).
 * Drums: assets/js/drum-engine.js. Melody, piano and bass are small Web Audio synths.
 */
(function () {
  'use strict';

  var MN = window.MusicNotation;
  var root = document.getElementById('fakebook');
  if (!root || !MN) return;
  var DATA_URL = root.getAttribute('data-src') || '../../data/fake-book.json';
  var STORE = 'fakebook:v1';

  /* ================================================================ pitch */
  var LETTERS = 'CDEFGAB', NAT = [0, 2, 4, 5, 7, 9, 11], FIFTHS = [0, 2, 4, -1, 1, 3, 5];
  var SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6], FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];
  var ACC = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };
  var DUR = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };
  var EPS = 1e-6;
  function mod(n, m) { return ((n % m) + m) % m; }
  function near(a, b) { return Math.abs(a - b) < EPS; }

  function pitch(dia, a) {
    var l = mod(dia, 7), o = Math.floor(dia / 7);
    return { l: l, o: o, a: a, dia: dia, midi: 12 * (o + 1) + NAT[l] + a };
  }
  function natMidi(dia) { return 12 * (Math.floor(dia / 7) + 1) + NAT[mod(dia, 7)]; }
  function spellAt(dia, midi) { return pitch(dia, midi - natMidi(dia)); }
  var SPELL_FLAT = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];
  var SPELL_SHARP = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0]];
  function respell(midi, preferFlat) {
    var s = (preferFlat ? SPELL_FLAT : SPELL_SHARP)[mod(midi, 12)];
    var o = Math.round((midi - NAT[s[0]] - s[1]) / 12) - 1;
    return pitch(o * 7 + s[0], s[1]);
  }
  function shiftPitch(p, letters, semis, preferFlat) {
    var q = spellAt(p.dia + letters, p.midi + semis);
    // Never introduce a double sharp or flat: students read G more easily than F𝄪.
    return Math.abs(q.a) > Math.max(1, Math.abs(p.a)) ? respell(q.midi, preferFlat) : q;
  }
  function noteName(p) { return LETTERS[p.l] + ACC[p.a]; }

  /* ================================================================ keys */
  function parseKey(name, minor) {
    var m = /^([A-G])(#|b)?$/.exec(name);
    return { l: LETTERS.indexOf(m[1]), a: m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0, minor: !!minor };
  }
  function keyPc(k) { return mod(NAT[k.l] + k.a, 12); }
  function keySig(k) { return FIFTHS[k.l] + 7 * k.a - (k.minor ? 3 : 0); }
  function keyAcc(sig, l) {
    if (sig > 0) return SHARP_ORDER.indexOf(l) < sig ? 1 : 0;
    if (sig < 0) return FLAT_ORDER.indexOf(l) < -sig ? -1 : 0;
    return 0;
  }
  function keyLabel(k) { return LETTERS[k.l] + ACC[k.a] + (k.minor ? ' minor' : ' major'); }
  // Simplest spelling of a tonic: never more than six sharps or flats.
  function normalizeKey(k) {
    if ((Math.abs(keySig(k)) < 6 || (Math.abs(keySig(k)) === 6 && !(k.minor && keySig(k) > 0))) && Math.abs(k.a) <= 1) return k;
    var pc = keyPc(k), best = k;
    for (var l = 0; l < 7; l++) for (var a = -1; a <= 1; a++) {
      if (mod(NAT[l] + a, 12) !== pc) continue;
      var c = { l: l, a: a, minor: k.minor };
      var d = Math.abs(keySig(c)) - Math.abs(keySig(best));
      // On a tie (six sharps vs six flats) minor keys take flats: E♭ minor reads easier than D♯ minor's C𝄪.
      if (d < 0 || (d === 0 && k.minor && keySig(c) < 0)) best = c;
    }
    return best;
  }
  // Letter steps + semitones that carry one key to another by the nearest route.
  function shiftBetween(from, to) {
    var s = mod(keyPc(to) - keyPc(from), 12);
    if (s > 5) s -= 12;
    var l = mod(to.l - from.l, 7), alt = l - 7;
    if (Math.abs(alt * 12 / 7 - s) < Math.abs(l * 12 / 7 - s)) l = alt;
    return { letters: l, semis: s };
  }
  function shiftKey(k, letters, semis) {
    var q = spellAt(k.l + letters, NAT[k.l] + k.a + 12 + semis);
    return normalizeKey({ l: q.l, a: q.a, minor: k.minor });
  }
  var MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  var MINOR_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

  var INSTR = {
    concert: { label: 'Concert pitch, treble clef', who: 'piano, flute, oboe, violin, voice, bells', letters: 0, semis: 0, clef: 'treble', center: 71, sound: 71 },
    bb: { label: 'B♭ instruments', who: 'trumpet, clarinet, tenor & soprano sax', letters: 1, semis: 2, clef: 'treble', center: 71, sound: 67 },
    eb: { label: 'E♭ instruments', who: 'alto & baritone sax', letters: 5, semis: 9, clef: 'treble', center: 71, sound: 67 },
    f: { label: 'F instruments', who: 'French horn', letters: 4, semis: 7, clef: 'treble', center: 71, sound: 64 },
    bass: { label: 'Concert pitch, bass clef', who: 'trombone, cello, bass, bassoon, tuba', letters: 0, semis: 0, clef: 'bass', center: 50, sound: 57 }
  };

  /* ================================================================ chords */
  var Q = {
    '': { iv: [0, 4, 7], lo: [0, 2, 4], sym: '', name: 'major triad' },
    'm': { iv: [0, 3, 7], lo: [0, 2, 4], sym: 'm', name: 'minor triad' },
    '7': { iv: [0, 4, 7, 10], lo: [0, 2, 4, 6], sym: '7', name: 'dominant seventh' },
    'maj7': { iv: [0, 4, 7, 11], lo: [0, 2, 4, 6], sym: 'maj7', name: 'major seventh' },
    'm7': { iv: [0, 3, 7, 10], lo: [0, 2, 4, 6], sym: 'm7', name: 'minor seventh' },
    'dim': { iv: [0, 3, 6], lo: [0, 2, 4], sym: '°', name: 'diminished triad' },
    'dim7': { iv: [0, 3, 6, 9], lo: [0, 2, 4, 6], sym: '°7', name: 'diminished seventh' },
    'm7b5': { iv: [0, 3, 6, 10], lo: [0, 2, 4, 6], sym: 'ø7', name: 'half-diminished seventh' },
    '6': { iv: [0, 4, 7, 9], lo: [0, 2, 4, 5], sym: '6', name: 'major sixth' },
    'm6': { iv: [0, 3, 7, 9], lo: [0, 2, 4, 5], sym: 'm6', name: 'minor sixth' },
    'aug': { iv: [0, 4, 8], lo: [0, 2, 4], sym: '+', name: 'augmented triad' },
    'sus4': { iv: [0, 5, 7], lo: [0, 3, 4], sym: 'sus4', name: 'suspended fourth' },
    '9': { iv: [0, 4, 7, 10, 14], lo: [0, 2, 4, 6, 8], sym: '9', name: 'dominant ninth' }
  };
  function chordTones(c) {
    var r = pitch(c.root.l, c.root.a), q = Q[c.q];
    return q.iv.map(function (iv, i) { var p = spellAt(r.dia + q.lo[i], r.midi + iv); return { l: p.l, a: p.a, pc: mod(p.midi, 12) }; });
  }
  function chordName(c) { return LETTERS[c.root.l] + ACC[c.root.a] + Q[c.q].sym; }
  function chordAt(chords, t) {
    for (var i = chords.length - 1; i >= 0; i--) if (chords[i].start <= t + EPS) return chords[i];
    return chords[0] || null;
  }

  /* ================================================================ parsing */
  var NOTE_RE = /^([A-G])(##|bb|#|b)?(\d)([whqes])(\.)?(~)?$/;
  var REST_RE = /^r\d?([whqes])(\.)?$/;
  var CHORD_RE = /^([A-G])(#|b)?(maj7|m7b5|dim7|dim|aug|sus4|m6|m7|m|6|7|9)?(?::([\d.]+))?$/;

  function parseTune(raw) {
    var t = {
      raw: raw, id: raw.id, key: parseKey(raw.key, raw.mode === 'minor'),
      M: raw.meter[0] * 4 / raw.meter[1], meter: raw.meter, pickup: raw.pickup || 0
    };
    var groups = raw.melody.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    var events = [], time = -t.pickup, tieOpen = null;
    groups.forEach(function (g, gi) {
      var barStart = time;
      g.split(/\s+/).forEach(function (tok) {
        var m = NOTE_RE.exec(tok), d, p = null, tie = false;
        if (m) {
          d = DUR[m[4]] * (m[5] ? 1.5 : 1);
          var a = { '': 0, '#': 1, '##': 2, 'b': -1, 'bb': -2 }[m[2] || ''];
          p = pitch(Number(m[3]) * 7 + LETTERS.indexOf(m[1]), a);
          tie = !!m[6];
        } else if ((m = REST_RE.exec(tok))) {
          d = DUR[m[1]] * (m[2] ? 1.5 : 1);
        } else {
          throw new Error(raw.id + ': bad token "' + tok + '"');
        }
        if (tieOpen && p && tieOpen.p.midi === p.midi) {
          tieOpen.dur += d;
        } else {
          tieOpen = null;
          events.push({ start: time, dur: d, p: p, src: events.length });
        }
        if (tie && p) tieOpen = events[events.length - 1];
        else if (!tie) tieOpen = null;
        time += d;
      });
      var want = gi === 0 && t.pickup ? t.pickup : t.M;
      if (!near(time - barStart, want)) console.warn('[fake-book] ' + raw.id + ' bar ' + (t.pickup ? gi : gi + 1) + ' has ' + (time - barStart) + ' beats');
    });
    t.events = events;
    t.bars = Math.round(time / t.M);
    t.len = t.bars * t.M;

    var chords = [];
    raw.chords.split('|').map(function (s) { return s.trim(); }).forEach(function (bar, bi) {
      var toks = bar.split(/\s+/).filter(Boolean), parsed = [], fixed = 0, free = 0;
      toks.forEach(function (tok) {
        var m = CHORD_RE.exec(tok);
        if (!m) throw new Error(raw.id + ': bad chord "' + tok + '"');
        var beats = m[4] ? Number(m[4]) : null;
        if (beats) fixed += beats; else free++;
        parsed.push({ root: { l: LETTERS.indexOf(m[1]), a: m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0 }, q: m[3] || '', beats: beats });
      });
      var pos = bi * t.M, share = free ? (t.M - fixed) / free : 0;
      parsed.forEach(function (c) {
        var d = c.beats || share;
        chords.push({ start: pos, dur: d, root: c.root, q: c.q, bar: bi + 1 });
        pos += d;
      });
    });
    t.chords = chords;
    return t;
  }

  /* ================================================================ melody tools */
  function clone(ev) { return ev.map(function (e) { return { start: e.start, dur: e.dur, p: e.p, src: e.src }; }); }
  function diatonic(dia, sig) { return pitch(dia, keyAcc(sig, mod(dia, 7))); }

  var MELODY = {
    original: {
      label: 'As written',
      tip: 'The tune exactly as it was first written down.',
      fn: function (ev) { return ev; }
    },
    inversion: {
      label: 'Upside down',
      term: 'melodic inversion',
      tip: 'Melodic inversion: every step up becomes a step down, mirrored around the first note and kept in the key.',
      fn: function (ev, t) {
        var sig = keySig(t.key), first = ev.filter(function (e) { return e.p; })[0];
        if (!first) return ev;
        var axis = first.p.dia;
        return ev.map(function (e) {
          if (!e.p) return e;
          var rel = e.p.a - keyAcc(sig, e.p.l), nd = 2 * axis - e.p.dia;
          var na = Math.max(-2, Math.min(2, keyAcc(sig, mod(nd, 7)) - rel));
          return { start: e.start, dur: e.dur, p: pitch(nd, na), src: e.src };
        });
      }
    },
    retrograde: {
      label: 'Backwards',
      term: 'retrograde',
      tip: 'Retrograde: the pitches in reverse order, last note first. The rhythm and chords stay where they were.',
      fn: function (ev) {
        var ps = ev.filter(function (e) { return e.p; }).map(function (e) { return e.p; }).reverse(), i = 0;
        return ev.map(function (e) { return e.p ? { start: e.start, dur: e.dur, p: ps[i++], src: e.src } : e; });
      }
    },
    passing: {
      label: 'Passing tones',
      tip: 'Long notes give up their last half beat to a new note that walks by step into the next note.',
      fn: function (ev, t) {
        var sig = keySig(t.key), out = [];
        ev.forEach(function (e, i) {
          var n = ev[i + 1];
          if (!e.p || !n || !n.p || e.dur < 1 - EPS || !near(n.start, e.start + e.dur) || mod(e.start * 2, 1) > EPS) { out.push(e); return; }
          var dir = Math.sign(n.p.dia - e.p.dia);
          var nd = dir === 0 ? n.p.dia + 1 : n.p.dia - dir;
          if (nd === e.p.dia) nd = n.p.dia + dir;          // already a step: overshoot and fall back
          out.push({ start: e.start, dur: e.dur - 0.5, p: e.p, src: e.src });
          out.push({ start: e.start + e.dur - 0.5, dur: 0.5, p: diatonic(nd, sig), src: e.src });
        });
        return out;
      }
    },
    skeleton: {
      label: 'Skeleton',
      tip: 'Only the notes sounding on the strong beats survive, each held until the next strong beat. The bones of the tune.',
      fn: function (ev, t) {
        var g = t.M === 3 ? 3 : 2, out = ev.filter(function (e) { return e.start < 0; });
        for (var s = 0; s < t.len - EPS; s += g) {
          var e = null;
          for (var i = 0; i < ev.length; i++) if (ev[i].start <= s + EPS && ev[i].start + ev[i].dur > s + EPS) { e = ev[i]; break; }
          var prev = out[out.length - 1];
          if (prev && e && e.p && prev.p && prev.start >= 0 && prev.src === e.src) { prev.dur += g; continue; }
          out.push({ start: s, dur: Math.min(g, t.len - s), p: e ? e.p : null, src: e ? e.src : -1 });
        }
        return out;
      }
    },
    chordtones: {
      label: 'Chord tones',
      tip: 'Every note moves to the nearest note of the chord above it. Jazz players call this “making the changes.”',
      fn: function (ev, t) {
        return ev.map(function (e) {
          if (!e.p || e.start < 0) return e;
          var c = chordAt(t.chords, e.start), best = null;
          if (!c) return e;
          chordTones(c).forEach(function (tn) {
            for (var o = e.p.o - 1; o <= e.p.o + 1; o++) {
              var p = pitch(o * 7 + tn.l, tn.a), d = Math.abs(p.midi - e.p.midi);
              if (!best || d < best.d || (d === best.d && p.midi > best.p.midi)) best = { p: p, d: d };
            }
          });
          return { start: e.start, dur: e.dur, p: best.p, src: e.src };
        });
      }
    }
  };

  /* ================================================================ rhythm tools */
  function barRel(t, s) { return s - Math.floor((s + EPS) / t.M) * t.M; }
  function pairs(ev, t, f) {
    var out = clone(ev);
    for (var i = 0; i < out.length - 1; i++) {
      var a = out[i], b = out[i + 1], d = a.dur;
      if (!a.p || !b.p || !near(b.dur, d) || !(near(d, 1) || near(d, 0.5)) || !near(b.start, a.start + d)) continue;
      var rel = barRel(t, a.start);
      if (mod(rel + EPS, 2 * d) > 2 * EPS || rel + 2 * d > t.M + EPS) continue;
      a.dur = d * f; b.start = a.start + d * f; b.dur = d * (2 - f); i++;
    }
    return out;
  }
  var RHYTHM = {
    written: { label: 'As written', tip: 'The rhythm as written.', fn: function (ev) { return ev; } },
    longshort: {
      label: 'Long–short',
      tip: 'Pairs of even notes become dotted: long-short, long-short. A bouncier, marching feel.',
      fn: function (ev, t) { return pairs(ev, t, 1.5); }
    },
    shortlong: {
      label: 'Short–long',
      tip: 'Pairs flip to short-long. Scottish fiddlers call this the “Scotch snap.”',
      fn: function (ev, t) { return pairs(ev, t, 0.5); }
    },
    push: {
      label: 'Push the beat',
      term: 'syncopation',
      tip: 'Notes that land on beats 1 and 3 arrive half a beat early and tie over. This is syncopation, the push behind jazz, pop and Latin music.',
      fn: function (ev, t) {
        var out = clone(ev);
        for (var i = 1; i < out.length; i++) {
          var e = out[i], pr = out[i - 1];
          if (!e.p || e.start < t.M - EPS) continue;
          var rel = barRel(t, e.start);
          if (!(rel < EPS || (t.M === 4 && near(rel, 2)))) continue;
          if (!near(pr.start + pr.dur, e.start) || pr.dur < 1 - EPS) continue;
          pr.dur -= 0.5; e.start -= 0.5; e.dur += 0.5;
        }
        return out;
      }
    },
    drive: {
      label: 'Eighth-note drive',
      tip: 'Every long note is re-struck as a stream of eighth notes on the same pitch: rock and fiddle energy.',
      fn: function (ev) {
        var out = [];
        ev.forEach(function (e) {
          if (!e.p || e.dur < 1 - EPS || mod(e.start * 2, 1) > EPS || mod(e.dur * 2, 1) > EPS) { out.push(e); return; }
          for (var s = 0; s < e.dur - EPS; s += 0.5) out.push({ start: e.start + s, dur: 0.5, p: e.p, src: e.src });
        });
        return out;
      }
    }
  };

  /* ================================================================ voicings */
  var VOICING = {
    root: { label: 'Root position', tip: 'The root on the bottom, then the 3rd and 5th (and 7th) stacked above.' },
    inv1: { label: '1st inversion', tip: 'The root moves up an octave, so the 3rd is on the bottom.', k: 1 },
    inv2: { label: '2nd inversion', tip: 'The 5th is on the bottom.', k: 2 },
    inv3: { label: '3rd inversion', tip: 'For seventh chords, the 7th is on the bottom. Triads only have two inversions, so they wrap back to root position.', k: 3 },
    smooth: { label: 'Smooth', term: 'voice leading', tip: 'For each chord, picks the inversion closest to the chord before it, so your hand barely moves. This is good voice leading.' },
    shell: { label: 'Shell', term: 'shell voicing', tip: 'Just the root, 3rd and 7th: the three notes that say what kind of chord it is. Bebop pianists comped like this.' }
  };
  function rootPosition(c) {
    var pc = mod(NAT[c.root.l] + c.root.a, 12), base = 48 + pc;
    if (base > 55) base -= 12;
    if (base < 48) base += 12;
    return Q[c.q].iv.map(function (iv) { return base + iv; });
  }
  function rotate(notes, k) {
    var n = notes.slice();
    for (var i = 0; i < k; i++) { var low = n.shift(); n.push(low + 12); }
    return n;
  }
  function recenter(n, target) {
    var mean = n.reduce(function (a, b) { return a + b; }, 0) / n.length;
    var k = Math.round((target - mean) / 12);
    return n.map(function (x) { return x + 12 * k; });
  }
  function distance(a, b) {
    var s = 0, len = Math.min(a.length, b.length);
    for (var i = 0; i < len; i++) s += Math.abs(a[i] - b[i]);
    return s + Math.abs(a.length - b.length) * 3;
  }
  function voiceChords(chords, mode) {
    var prev = null;
    return chords.map(function (c) {
      var rp = rootPosition(c), n;
      if (mode === 'shell') {
        var iv = Q[c.q].iv, top = iv.length >= 4 ? iv[3] : iv[2];
        n = [rp[0], rp[0] + iv[1], rp[0] + top];
      } else if (mode === 'smooth') {
        var best = null;
        for (var k = 0; k < rp.length; k++) for (var o = -12; o <= 12; o += 12) {
          var cand = rotate(rp, k).map(function (x) { return x + o; });
          var mean = cand.reduce(function (a, b) { return a + b; }, 0) / cand.length;
          var score = (prev ? distance(cand, prev) : 0) + Math.abs(mean - 62) * 0.6 + (prev ? 0 : k * 4);
          if (!best || score < best.s) best = { n: cand, s: score };
        }
        n = best.n;
      } else {
        var kk = (VOICING[mode] && VOICING[mode].k) || 0;
        n = recenter(rotate(rp, kk % rp.length), 61);
      }
      prev = n;
      return n;
    });
  }
  var BOTTOM_NAMES = ['root', '3rd', '5th', '7th', '9th'];
  function describeVoicing(c, notes) {
    var tones = chordTones(c), low = mod(notes[0], 12);
    var idx = tones.findIndex(function (t) { return t.pc === low; });
    var name = Q[c.q].iv[idx] === 9 && c.q !== 'dim7' ? '6th' : BOTTOM_NAMES[idx] || '';
    return { bottom: name, spelled: notes.map(function (m) {
      var tn = tones.find(function (t) { return t.pc === mod(m, 12); }) || { l: respell(m).l, a: respell(m).a };
      var p = spellAt(Math.floor((m - NAT[tn.l] - tn.a) / 12 - 1) * 7 + tn.l, m);
      return noteName(p) + p.o;
    }) };
  }

  /* ================================================================ state */
  var DEFAULTS = {
    tune: 'twinkle', key: null, instr: 'concert', octave: 0, names: false,
    melody: 'original', rhythm: 'written', voicing: 'smooth',
    style: null, feel: null, tempo: null, mode: 'all', click: 'all', loop: true,
    lead: 'reed', from: 1, to: 0,
    vol: { melody: 80, piano: 55, bass: 75, drums: 65, click: 60 }
  };
  var opts = load();
  var tunes = [], tune = null, view = null, chordSel = 0;

  function load() {
    var o = JSON.parse(JSON.stringify(DEFAULTS));
    try {
      var s = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (s) { Object.keys(o).forEach(function (k) { if (s[k] !== undefined) o[k] = s[k]; }); o.vol = Object.assign({}, DEFAULTS.vol, s.vol || {}); }
    } catch (e) { /* storage unavailable */ }
    return o;
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(opts)); } catch (e) { /* ignore */ } }

  function computeView() {
    var t = tune;
    var ev = RHYTHM[opts.rhythm].fn(MELODY[opts.melody].fn(clone(t.events), t), t);
    var concertKey = parseKey(opts.key, t.key.minor);
    var ins = INSTR[opts.instr];
    var writtenKey = shiftKey(concertKey, ins.letters, ins.semis);
    var cs = shiftBetween(t.key, concertKey), ws = shiftBetween(t.key, writtenKey);
    var cFlat = keySig(concertKey) < 0, wFlat = keySig(writtenKey) < 0;
    function move(list, sh, flat, center) {
      var out = list.map(function (e) { return { start: e.start, dur: e.dur, src: e.src, p: e.p ? shiftPitch(e.p, sh.letters, sh.semis, flat) : null }; });
      var notes = out.filter(function (e) { return e.p; }), w = 0, sum = 0;
      notes.forEach(function (e) { sum += e.p.midi * e.dur; w += e.dur; });
      var k = w ? Math.round((center - sum / w) / 12) + opts.octave : opts.octave;
      if (k) out.forEach(function (e) { if (e.p) e.p = pitch(e.p.dia + 7 * k, e.p.a); });
      return out;
    }
    function moveChords(sh, flat) {
      return t.chords.map(function (c) {
        var r = shiftPitch(pitch(c.root.l + 28, c.root.a), sh.letters, sh.semis, flat);
        if (Math.abs(r.a) > 1) r = respell(r.midi, flat);
        return { start: c.start, dur: c.dur, bar: c.bar, q: c.q, root: { l: r.l, a: r.a } };
      });
    }
    view = {
      concertKey: concertKey, writtenKey: writtenKey,
      concert: move(ev, cs, cFlat, ins.sound),
      written: move(ev, ws, wFlat, ins.center),
      concertChords: moveChords(cs, cFlat),
      writtenChords: moveChords(ws, wFlat)
    };
    view.voicings = voiceChords(view.concertChords, opts.voicing);
  }

  /* ================================================================ engraving */
  var NOTE_D = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25], REST_D = [4, 2, 1, 0.5, 0.25];
  var BASE = { 4: [4, 0], 3: [2, 1], 2: [2, 0], 1.5: [1, 1], 1: [1, 0], 0.75: [0.5, 1], 0.5: [0.5, 0], 0.25: [0.25, 0] };
  function onBeat(x) { return near(x, Math.round(x)); }
  function fits(p, d, M, rest) {
    if (d === 4) return M === 4 && p < EPS;
    if (d === 3) return !rest && onBeat(p);
    if (d === 2) return onBeat(p) && (!rest || M !== 4 || p < EPS || near(p, 2));
    if (d === 1.5) return onBeat(p);
    if (d === 1) return onBeat(p) || (!rest && near(mod(p, 1), 0.5) && (M !== 4 || p + 1 <= 2 + EPS || p >= 2 - EPS) && M !== 3);
    if (d === 0.75) return onBeat(p);
    if (d === 0.5) return near(mod(p * 2, 1), 0) || near(mod(p * 2, 1), 1);
    return true;
  }
  function decompose(rel, len, rest, M) {
    var out = [], p = rel, left = len, list = rest ? REST_D : NOTE_D;
    while (left > EPS) {
      var d = 0.25;
      for (var i = 0; i < list.length; i++) if (list[i] <= left + EPS && fits(p, list[i], M, rest)) { d = list[i]; break; }
      out.push({ rel: p, d: d }); p += d; left -= d;
    }
    return out;
  }
  function layoutBars(ev, t) {
    var bars = [];
    if (t.pickup) bars.push({ i: 0, start: -t.pickup, len: t.pickup, off: t.M - t.pickup });
    for (var i = 1; i <= t.bars; i++) bars.push({ i: i, start: (i - 1) * t.M, len: t.M, off: 0 });
    bars.forEach(function (b) {
      var items = [];
      ev.forEach(function (e, idx) {
        var s = Math.max(e.start, b.start), en = Math.min(e.start + e.dur, b.start + b.len);
        if (en - s > EPS) items.push({ idx: idx, p: e.p, rel: s - b.start, len: en - s, cont: e.start + e.dur > b.start + b.len + EPS, from: e.start < b.start - EPS });
      });
      items.sort(function (a, c) { return a.rel - c.rel; });
      var filled = [], pos = 0;
      items.forEach(function (it) {
        if (it.rel > pos + EPS) filled.push({ idx: -1, p: null, rel: pos, len: it.rel - pos });
        if (it.rel < pos - EPS) return;                                   // overlapping event: skip
        filled.push(it); pos = it.rel + it.len;
      });
      if (pos < b.len - EPS) filled.push({ idx: -1, p: null, rel: pos, len: b.len - pos });
      b.pieces = [];
      filled.forEach(function (it) {
        if (!it.p && it.rel < EPS && it.len > b.len - EPS && b.i > 0) { b.pieces.push({ rest: true, whole: true, rel: 0, d: b.len, idx: it.idx }); return; }
        var parts = decompose(it.rel + b.off, it.len, !it.p, t.M);
        parts.forEach(function (pt, k) {
          b.pieces.push({ rest: !it.p, rel: pt.rel - b.off, beat: pt.rel, d: pt.d, idx: it.idx, p: it.p,
            tie: !!it.p && (k < parts.length - 1 || it.cont), tieFrom: !!it.p && (k > 0 || it.from) });
        });
      });
    });
    return bars;
  }

  var sheetEl = root.querySelector('[data-fb-sheet]');
  var nowEls = [], barEls = {};
  function txt(x, y, s, cls, extra) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" class="' + cls + '"' + (extra || '') + '>' + MN.escape(s) + '</text>'; }
  function line(x1, y1, x2, y2, w, cls) { return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="currentColor" stroke-width="' + w + '"' + (cls ? ' class="' + cls + '"' : '') + '/>'; }

  function renderSheet() {
    if (!view) return;
    var W = Math.max(300, Math.floor(sheetEl.clientWidth || 900));
    var S = W >= 900 ? 10 : W >= 620 ? 9 : 7;
    var t = tune, M = t.M, ins = INSTR[opts.instr], C = MN.clefs[ins.clef];
    var sig = keySig(view.writtenKey), bars = layoutBars(view.written, t);
    var bpl = W >= 900 ? 4 : W >= 620 ? 3 : 2;
    var systems = [], cur = [];
    bars.forEach(function (b) {
      cur.push(b);
      if (cur.filter(function (x) { return x.i > 0; }).length === bpl) { systems.push(cur); cur = []; }
    });
    if (cur.length) systems.push(cur);
    var half = S / 2, headW = 295 * S / 250, wholeW = 426 * S / 250;
    var out = [], ties = [], placed = {}, y = S * 0.6, padL = 1.9 * S, padR = 1.1 * S;
    var stepOf = function (p) { return p.dia - C.bottom; };
    // Measure: which notes need an accidental, and how much room each piece wants
    // (longer notes get more space, but not proportionally more, as engravers do).
    bars.forEach(function (b) {
      var mem = {}, total = 0;
      b.pieces.forEach(function (pc) {
        pc.acc = false;
        if (pc.p) {
          var mk = pc.p.l + ':' + pc.p.o, cur = mem[mk] !== undefined ? mem[mk] : keyAcc(sig, pc.p.l);
          pc.acc = !pc.tieFrom && cur !== pc.p.a;
          mem[mk] = pc.p.a;
        }
        pc.nw = S * (1.5 + 2.1 * Math.sqrt(pc.whole ? 1 : pc.d)) + (pc.acc ? 1.3 * S : 0);
        pc.cum = total; total += pc.nw;
      });
      b.natural = Math.max(b.i === 0 ? 4 * S : 9 * S, padL + total + padR);
    });
    var chordsByBar = {};
    view.writtenChords.forEach(function (c, ci) { (chordsByBar[c.bar] = chordsByBar[c.bar] || []).push({ c: c, ci: ci }); });

    systems.forEach(function (sys, si) {
      var first = si === 0;
      var hx = 0.4 * S, header = hx + 3.3 * S + Math.abs(sig) * 1.05 * S + (first ? 2.6 * S : 0) + 0.9 * S;
      // Blend equal bar widths (tidy lead-sheet look) with each bar's natural width.
      var full = sys.filter(function (b) { return b.i > 0; }).length, avail = W - header - 2;
      var nat = sys.reduce(function (a, b) { return a + b.natural; }, 0) + Math.max(0, bpl - full) * 14 * S;
      var weights = sys.map(function (b) { return b.i === 0 ? b.natural / nat : 0.5 * b.natural / nat + 0.5 / Math.max(full, bpl) * (1 - (sys[0].i === 0 ? sys[0].natural / nat : 0)); });
      var unit = avail;
      // vertical extents
      var top = 8, bottom = 0;
      sys.forEach(function (b) {
        b.pieces.forEach(function (pc) {
          if (!pc.p) return;
          var st = stepOf(pc.p), up = st < 4;
          top = Math.max(top, up && BASE[pc.d][0] < 4 ? st + 7 : st);
          bottom = Math.min(bottom, !up && BASE[pc.d][0] < 4 ? st - 7 : st);
        });
      });
      var noteTop = (top - 8) * half, noteBot = -bottom * half;
      var staffTop = y + 3.6 * S + noteTop, staffBot = staffTop + 4 * S;
      var chordBase = staffTop - noteTop - 1.4 * S;
      var x = header;
      out.push('<g class="fb-system">');
      // bar backgrounds (click / highlight targets)
      var bx = header;
      sys.forEach(function (b, k) {
        var bw = weights[k] * unit;
        b.x = bx; b.w = bw; bx += bw;
        out.push('<rect class="fb-bar" data-bar="' + b.i + '" x="' + b.x.toFixed(1) + '" y="' + (chordBase - 1.6 * S).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (staffBot + noteBot + 1.4 * S - chordBase + 1.6 * S).toFixed(1) + '" rx="' + (0.6 * S) + '"><title>Bar ' + (b.i || 'pickup') + ': click to loop from here, shift-click to loop to here</title></rect>');
      });
      for (var li = 0; li < 5; li++) out.push(line(hx, staffTop + li * S, bx, staffTop + li * S, Math.max(1, S * 0.11), 'fb-staffline'));
      out.push(line(hx, staffTop, hx, staffBot, Math.max(1, S * 0.13)));
      out.push(MN.clef(ins.clef, hx + 0.7 * S, staffBot, half, 'fb-clef'));
      var kx = hx + 3.5 * S;
      for (var ki = 0; ki < Math.abs(sig); ki++) {
        var st = sig > 0 ? C.sharp[ki] : C.flat[ki];
        out.push(MN.accidental(sig > 0 ? 1 : -1, kx + ki * 1.05 * S, staffBot - st * half, S, 'fb-keysig'));
      }
      if (first) {
        var tx = kx + Math.abs(sig) * 1.05 * S + 1.2 * S;
        out.push(txt(tx, staffTop + 2 * S, String(t.meter[0]), 'fb-timesig', ' font-size="' + (2.75 * S) + '"'));
        out.push(txt(tx, staffBot, String(t.meter[1]), 'fb-timesig', ' font-size="' + (2.75 * S) + '"'));
      }
      var firstBar = sys.filter(function (b) { return b.i > 0; })[0];
      if (firstBar && firstBar.i > 1) out.push(txt(hx, chordBase - 1.5 * S + S, String(firstBar.i), 'fb-barnum', ' font-size="' + (1.1 * S) + '"'));

      sys.forEach(function (b, k) {
        var used = b.pieces.reduce(function (a, pc) { return a + pc.nw; }, 0) || 1;
        var k2 = (b.w - padL - padR) / used;
        b.pieces.forEach(function (pc) { pc.x0 = b.x + padL + pc.cum * k2; pc.head = pc.x0 + (pc.acc ? 1.3 * S : 0); });
        var xAt = function (rel) {                       // x of the musical time rel, for chord symbols
          var ps = b.pieces;
          for (var i = 0; i < ps.length; i++) {
            if (near(ps[i].rel, rel)) return ps[i].head;
            if (ps[i].rel > rel) { var a = ps[i - 1]; return a ? a.head + (ps[i].head - a.head) * (rel - a.rel) / (ps[i].rel - a.rel) : ps[i].head; }
          }
          return b.x + padL;
        };
        // chord symbols
        (chordsByBar[b.i] || []).forEach(function (o) {
          var cx = xAt(o.c.start - b.start) - 0.4 * S;
          out.push('<text class="fb-chord' + (o.ci === chordSel ? ' is-sel' : '') + '" data-ci="' + o.ci + '" x="' + cx.toFixed(1) + '" y="' + chordBase.toFixed(1) + '" font-size="' + (1.75 * S) + '" tabindex="0" role="button" aria-label="Chord ' + MN.escape(chordName(o.c)) + ', bar ' + b.i + '">' + MN.escape(chordName(o.c)) + '</text>');
        });
        // accidental memory per bar
        var placedBar = [];
        b.pieces.forEach(function (pc) {
          var base = BASE[pc.d] || [pc.d, 0], cx;
          if (pc.rest) {
            var mid = staffTop + 2 * S;
            if (pc.whole || base[0] === 4) {
              cx = pc.whole ? b.x + b.w / 2 : pc.head + 0.6 * S;
              out.push('<rect class="fb-rest" x="' + (cx - 0.6 * S).toFixed(1) + '" y="' + (staffTop + S).toFixed(1) + '" width="' + (1.2 * S).toFixed(1) + '" height="' + (0.5 * S).toFixed(1) + '"/>');
            } else if (base[0] === 2) {
              cx = pc.head + 0.6 * S;
              out.push('<rect class="fb-rest" x="' + (cx - 0.6 * S).toFixed(1) + '" y="' + (mid - 0.5 * S).toFixed(1) + '" width="' + (1.2 * S).toFixed(1) + '" height="' + (0.5 * S).toFixed(1) + '"/>');
            } else {
              cx = pc.head + 0.2 * S;
              out.push(MN.glyph(base[0] === 1 ? 'restQuarter' : base[0] === 0.5 ? 'rest8' : 'rest16', cx, mid, S, 'fb-restg'));
            }
            return;
          }
          var stp = stepOf(pc.p), ny = staffBot - stp * half, nx = pc.head + headW / 2;
          var hw = base[0] === 4 ? wholeW : headW;
          var g = ['<g class="fb-n" data-idx="' + pc.idx + '">'];
          MN.ledgerSteps(stp).forEach(function (ls) {
            var ly = staffBot - ls * half;
            g.push(line(nx - hw / 2 - 0.45 * S, ly, nx + hw / 2 + 0.45 * S, ly, Math.max(1, S * 0.12)));
          });
          if (pc.acc) g.push(MN.accidental(pc.p.a, nx - hw / 2 - 1.3 * S, ny, S));
          g.push(MN.glyph(base[0] >= 4 ? 'whole' : base[0] >= 2 ? 'half' : 'quarter', nx - hw / 2, ny, S, 'fb-head'));
          if (base[1]) g.push('<circle cx="' + (nx + hw / 2 + 0.5 * S).toFixed(1) + '" cy="' + (ny - (mod(stp, 2) === 0 ? half : 0)).toFixed(1) + '" r="' + (0.17 * S).toFixed(2) + '" fill="currentColor"/>');
          var info = { pc: pc, x: nx, y: ny, step: stp, hw: hw, base: base[0], sys: si, g: g, bar: b };
          placedBar.push(info);
          (placed[pc.idx] = placed[pc.idx] || []).push(info);
          if (opts.names) g.push(txt(nx, staffBot + noteBot + 2.3 * S, noteName(pc.p), 'fb-name', ' font-size="' + (1.15 * S) + '" text-anchor="middle"'));
          ties.push(info);
        });
        // stems, flags and beams
        var groups = [], grp = [];
        placedBar.forEach(function (n, i) {
          var prevPiece = i ? placedBar[i - 1] : null;
          var adjacent = prevPiece && b.pieces.indexOf(n.pc) === b.pieces.indexOf(prevPiece.pc) + 1;
          if (n.base <= 0.5 && grp.length && adjacent && Math.floor(n.pc.beat + EPS) === Math.floor(grp[0].pc.beat + EPS)) grp.push(n);
          else { if (grp.length) groups.push(grp); grp = n.base <= 0.5 ? [n] : []; if (n.base > 0.5) groups.push([n]); }
        });
        if (grp.length) groups.push(grp);
        groups.forEach(function (gr) {
          if (gr[0].base >= 4) return;
          var avg = gr.reduce(function (s, n) { return s + n.step; }, 0) / gr.length, up = avg < 4;
          var sx = function (n) { return up ? n.x + n.hw / 2 - 0.06 * S : n.x - n.hw / 2 + 0.06 * S; };
          if (gr.length === 1) {
            var n = gr[0], tip = n.y + (up ? -3.5 : 3.5) * S;
            if (!up && n.step < 4) tip = n.y + 3.5 * S;
            n.g.push(line(sx(n), n.y, sx(n), tip, (0.12 * S).toFixed(2), 'fb-stem'));
            if (n.base <= 0.5) n.g.push(MN.glyph('flag' + (n.base === 0.25 ? '16' : '8') + (up ? 'Up' : 'Down'), sx(n), tip, S));
            n.up = up;
            return;
          }
          var beamY = up ? Math.min.apply(null, gr.map(function (n) { return n.y; })) - 3.3 * S : Math.max.apply(null, gr.map(function (n) { return n.y; })) + 3.3 * S;
          var th = 0.48 * S, dir = up ? 1 : -1;
          gr.forEach(function (n) { n.up = up; n.g.push(line(sx(n), n.y, sx(n), beamY, (0.12 * S).toFixed(2), 'fb-stem')); });
          var x1 = sx(gr[0]), x2 = sx(gr[gr.length - 1]);
          out.push('<rect class="fb-beam" x="' + x1.toFixed(1) + '" y="' + (up ? beamY : beamY - th).toFixed(1) + '" width="' + (x2 - x1 + 0.12 * S).toFixed(1) + '" height="' + th.toFixed(1) + '"/>');
          gr.forEach(function (n, i) {
            if (n.base !== 0.25) return;
            var y2 = beamY + dir * 0.8 * S, a, c;
            var nb = gr[i + 1], pb = gr[i - 1];
            if (nb && nb.base === 0.25) { a = sx(n); c = sx(nb); }
            else if (pb && pb.base === 0.25) return;
            else if (pb) { a = sx(n) - 1.1 * S; c = sx(n); }
            else { a = sx(n); c = sx(n) + 1.1 * S; }
            out.push('<rect class="fb-beam" x="' + a.toFixed(1) + '" y="' + (up ? y2 : y2 - th).toFixed(1) + '" width="' + (c - a + 0.12 * S).toFixed(1) + '" height="' + th.toFixed(1) + '"/>');
          });
        });
        placedBar.forEach(function (n) { n.g.push('</g>'); out.push(n.g.join('')); });
        // bar line
        var last = si === systems.length - 1 && k === sys.length - 1;
        var ex = b.x + b.w;
        if (last) { out.push(line(ex - 0.9 * S, staffTop, ex - 0.9 * S, staffBot, Math.max(1, S * 0.12))); out.push('<rect x="' + (ex - 0.5 * S).toFixed(1) + '" y="' + staffTop.toFixed(1) + '" width="' + (0.5 * S).toFixed(1) + '" height="' + (4 * S).toFixed(1) + '" fill="currentColor"/>'); }
        else out.push(line(ex, staffTop, ex, staffBot, Math.max(1, S * 0.12)));
        b.staffTop = staffTop;
      });
      out.push('</g>');
      sys.endX = bx; sys.startX = header;
      y = staffBot + noteBot + (opts.names ? 3.4 : 1.8) * S + 1.4 * S;
    });

    // ties
    Object.keys(placed).forEach(function (idx) {
      var list = placed[idx];
      for (var i = 0; i < list.length - 1; i++) {
        var a = list[i], c = list[i + 1];
        if (!a.pc.tie) continue;
        var below = a.up !== false, dy = below ? 0.55 * S : -0.55 * S, bulge = below ? 1.1 * S : -1.1 * S;
        var arc = function (x1, x2, yy) { return '<path class="fb-tie" d="M' + x1.toFixed(1) + ' ' + (yy + dy).toFixed(1) + ' Q' + ((x1 + x2) / 2).toFixed(1) + ' ' + (yy + dy + bulge).toFixed(1) + ' ' + x2.toFixed(1) + ' ' + (yy + dy).toFixed(1) + '" fill="none" stroke="currentColor" stroke-width="' + (0.16 * S).toFixed(2) + '"/>'; };
        if (a.sys === c.sys) out.push(arc(a.x + a.hw / 2 - 0.1 * S, c.x - c.hw / 2 + 0.1 * S, a.y));
        else { out.push(arc(a.x + a.hw / 2, systems[a.sys].endX - 0.2 * S, a.y)); out.push(arc(systems[c.sys].startX - 1.2 * S, c.x - c.hw / 2, c.y)); }
      }
    });

    var H = Math.ceil(y + 0.4 * S);
    sheetEl.innerHTML = '<svg class="fb-svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' +
      MN.escape(t.raw.title + ' lead sheet, written in ' + keyLabel(view.writtenKey) + ', ' + t.meter.join('/') + ' time') + '">' + out.join('') + '</svg>';
    nowEls = []; barEls = {};
    sheetEl.querySelectorAll('.fb-bar').forEach(function (r) { barEls[r.getAttribute('data-bar')] = r; });
    paintLoop();
  }

  /* ================================================================ audio */
  var ctx = null, master = null, bus = {}, kitBus = null;
  function ensureAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!ctx) {
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 20; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = 0.8;
      var verb = ctx.createConvolver(), len = Math.floor(ctx.sampleRate * 1.2), imp = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var c = 0; c < 2; c++) { var d = imp.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      verb.buffer = imp;
      var wet = ctx.createGain(); wet.gain.value = 0.16;
      master.connect(comp); master.connect(verb); verb.connect(wet); wet.connect(comp);
      comp.connect(ctx.destination);
      ['melody', 'piano', 'bass', 'drums', 'click'].forEach(function (k) { bus[k] = ctx.createGain(); bus[k].connect(master); });
      applyVolumes();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }
  function applyVolumes() {
    if (!ctx) return;
    var scale = { melody: 0.5, piano: 0.32, bass: 0.6, drums: 0.9, click: 0.7 };
    Object.keys(bus).forEach(function (k) { bus[k].gain.setTargetAtTime(scale[k] * Math.pow(opts.vol[k] / 100, 1.5), ctx.currentTime, 0.03); });
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function env(g, t, peak, a, end, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(peak * 0.7, t + a, 0.25);
    g.gain.setTargetAtTime(0.0001, end, rel);
  }
  function voiceLead(out, t, dur, m, vel) {
    var end = t + Math.max(0.06, dur * 0.94), g = ctx.createGain();
    if (opts.lead === 'piano') return voicePiano(out, t, dur, m, vel * 1.4);
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter();
    var lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(hz(m) * 0.006, t + 0.35);
    lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    o1.frequency.value = o2.frequency.value = hz(m);
    if (opts.lead === 'flute') {
      o1.type = 'sine'; o2.type = 'triangle'; o2.detune.value = 4; f.type = 'lowpass'; f.frequency.value = 2600;
    } else {
      o1.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = -6; f.type = 'lowpass'; f.Q.value = 2;
      f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(2400, t + 0.06); f.frequency.setTargetAtTime(1500, t + 0.06, 0.2);
    }
    var mix = ctx.createGain(); mix.gain.value = opts.lead === 'flute' ? 0.7 : 0.35;
    o1.connect(mix); o2.connect(mix); mix.connect(f); f.connect(g); g.connect(out);
    env(g, t, vel, 0.025, end, 0.05);
    [o1, o2, lfo].forEach(function (o) { o.start(t); o.stop(end + 0.4); });
  }
  function voicePiano(out, t, dur, m, vel) {
    var end = t + Math.max(0.1, dur), g = ctx.createGain(), f = ctx.createBiquadFilter();
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o1.type = 'triangle'; o2.type = 'sine'; o1.frequency.value = hz(m); o2.frequency.value = hz(m) * 2; g2.gain.value = 0.25;
    f.type = 'lowpass'; f.frequency.setValueAtTime(4200, t); f.frequency.setTargetAtTime(1600, t, 0.4);
    o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.006);
    g.gain.setTargetAtTime(vel * 0.25, t + 0.006, 0.45);
    g.gain.setTargetAtTime(0.0001, end, 0.09);
    o1.start(t); o2.start(t); o1.stop(end + 0.6); o2.stop(end + 0.6);
  }
  function voiceBass(out, t, dur, m, vel) {
    var end = t + Math.max(0.08, dur * 0.92), g = ctx.createGain(), f = ctx.createBiquadFilter();
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o1.type = 'sine'; o2.type = 'triangle'; o1.frequency.value = hz(m); o2.frequency.value = hz(m); g2.gain.value = 0.5;
    f.type = 'lowpass'; f.frequency.setValueAtTime(1400, t); f.frequency.setTargetAtTime(500, t, 0.08);
    o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.008);
    g.gain.setTargetAtTime(vel * 0.45, t + 0.008, 0.2);
    g.gain.setTargetAtTime(0.0001, end, 0.04);
    o1.start(t); o2.start(t); o1.stop(end + 0.3); o2.stop(end + 0.3);
  }
  function voiceClick(out, t, level) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = level === 2 ? 1900 : 1350;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(level === 2 ? 0.3 : 0.2, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.07);
  }

  /* ================================================================ band */
  var STYLES = {
    swing: { label: 'Swing', meters: [4], feel: 'swing', tip: 'Walking bass on every beat, ride cymbal “spang-a-lang,” piano comping the Charleston rhythm.' },
    twobeat: { label: 'Two-beat (New Orleans)', meters: [4], feel: 'swing', tip: 'Bass on beats 1 and 3, piano and snare on 2 and 4: the march-born feel of early jazz.' },
    rock: { label: 'Rock / pop', meters: [4], feel: 'straight', tip: 'Kick on 1 and 3, snare on 2 and 4, straight eighth notes on the hi-hat and bass.' },
    bossa: { label: 'Bossa nova', meters: [4], feel: 'straight', tip: 'Brazilian groove: a rim-click clave pattern over a two-bar cycle and a root–fifth bass.' },
    ballad: { label: 'Ballad', meters: [3, 4], feel: 'straight', tip: 'Slow and spacious: long bass notes, sustained chords, soft cymbal.' },
    waltz: { label: 'Waltz', meters: [3], feel: 'straight', tip: 'Oom-pah-pah: bass on 1, chords on 2 and 3.' },
    jazzwaltz: { label: 'Jazz waltz', meters: [3], feel: 'swing', tip: 'A swinging 3/4: walking bass in three, ride pattern, comping on 1 and the “and” of 2.' }
  };
  var DRUMS = {
    swing: [['ride', [0, 0.55], [1, 0.5], [1.5, 0.32], [2, 0.55], [3, 0.5], [3.5, 0.32]], ['hat', [1, 0.4], [3, 0.4]], ['kick', [0, 0.16], [1, 0.12], [2, 0.16], [3, 0.12]]],
    twobeat: [['kick', [0, 0.6], [2, 0.55]], ['snare', [1, 0.42], [3, 0.42]], ['hat', [0, 0.3], [0.5, 0.18], [1, 0.3], [1.5, 0.18], [2, 0.3], [2.5, 0.18], [3, 0.3], [3.5, 0.18]]],
    rock: [['kick', [0, 0.8], [2, 0.75], [2.5, 0.5]], ['snare', [1, 0.7], [3, 0.7]], ['hat', [0, 0.38], [0.5, 0.24], [1, 0.38], [1.5, 0.24], [2, 0.38], [2.5, 0.24], [3, 0.38], [3.5, 0.24]]],
    bossa: [['kick', [0, 0.45], [1.5, 0.3], [2, 0.45], [3.5, 0.3]], ['hat', [0, 0.22], [0.5, 0.16], [1, 0.22], [1.5, 0.16], [2, 0.22], [2.5, 0.16], [3, 0.22], [3.5, 0.16]]],
    ballad4: [['ride', [0, 0.28], [1, 0.22], [2, 0.28], [3, 0.22]], ['kick', [0, 0.3]], ['rim', [2, 0.28]]],
    ballad3: [['ride', [0, 0.28], [1, 0.2], [2, 0.2]], ['kick', [0, 0.3]]],
    waltz: [['kick', [0, 0.55]], ['hat', [1, 0.35], [2, 0.35]], ['snare', [1, 0.12], [2, 0.12]]],
    jazzwaltz: [['ride', [0, 0.5], [1, 0.45], [1.5, 0.3], [2, 0.45]], ['hat', [1, 0.35]], ['kick', [0, 0.18]]]
  };
  var BOSSA_RIM = [[0, 1.5, 3], [1, 2.5]];
  var COMP = {
    swing: [[0, 0.9], [1.5, 0.4]], twobeat: [[1, 0.45], [3, 0.45]], rock: [[0, 0.8], [1, 0.8], [2, 0.8], [3, 0.8]],
    waltz: [[1, 0.6], [2, 0.6]], jazzwaltz: [[0, 0.8], [1.5, 0.4]]
  };
  function nearestBass(pc, prev) {
    var best = null;
    for (var m = 36; m <= 55; m++) if (mod(m, 12) === pc && (best === null || Math.abs(m - prev) < Math.abs(best - prev))) best = m;
    return best;
  }
  function bandBars(style, chords, voicings, M, fromBar, toBar) {
    var evs = [], prevBass = 43;
    var cIndex = function (t) { for (var i = chords.length - 1; i >= 0; i--) if (chords[i].start <= t + EPS) return i; return 0; };
    var rootPc = function (c) { return mod(NAT[c.root.l] + c.root.a, 12); };
    var tones = function (c) { return Q[c.q].iv.map(function (iv) { return mod(rootPc(c) + iv, 12); }); };
    var bass = function (t, pc, dur, vel) { var m = nearestBass(pc, prevBass); prevBass = m; evs.push({ t: t, kind: 'bass', m: m, dur: dur, vel: vel }); };
    var comp = function (t, dur, vel) { var ci = cIndex(t); evs.push({ t: t, kind: 'pno', ms: voicings[ci], dur: dur, vel: vel, ci: ci }); };
    var drumSet = style === 'ballad' ? (M === 3 ? 'ballad3' : 'ballad4') : style;
    for (var bar = fromBar; bar <= toBar; bar++) {
      var b0 = (bar - 1) * M;
      (DRUMS[drumSet] || []).forEach(function (row) {
        for (var i = 1; i < row.length; i++) if (row[i][0] < M - EPS) evs.push({ t: b0 + row[i][0], kind: 'drum', name: row[0], vel: row[i][1] });
      });
      if (style === 'bossa') BOSSA_RIM[(bar - 1) % 2].forEach(function (p) { evs.push({ t: b0 + p, kind: 'drum', name: 'rim', vel: 0.5 }); });
      if (bar === fromBar && style !== 'ballad' && style !== 'waltz') evs.push({ t: b0, kind: 'drum', name: 'crash', vel: 0.35 });

      if (style === 'swing' || style === 'jazzwaltz') {
        for (var bt = 0; bt < M; bt++) {
          var t = b0 + bt, ci = cIndex(t), c = chords[ci], endT = toBar * M;
          var inside = chords[ci + 1] && chords[ci + 1].start < endT - EPS;
          var nxt = inside ? chords[ci + 1] : chords[cIndex((fromBar - 1) * M)];   // loop wraps to the first chord
          var nextStart = inside ? nxt.start : endT;
          var vel = bt === 0 ? 0.85 : 0.7;
          if (near(c.start, t)) bass(t, rootPc(c), 0.95, vel);
          else if (t + 1 >= nextStart - EPS) {
            var target = nearestBass(rootPc(nxt), prevBass);
            evs.push({ t: t, kind: 'bass', m: target + (prevBass > target ? 1 : -1), dur: 0.95, vel: vel }); prevBass = target + (prevBass > target ? 1 : -1);
          } else {
            var opts2 = tones(c).slice(1).map(function (pc) { return nearestBass(pc, prevBass); }).filter(function (m) { return m !== prevBass; });
            opts2.sort(function (a, b2) { return Math.abs(a - prevBass) - Math.abs(b2 - prevBass); });
            var m2 = opts2[0] || prevBass + 2; evs.push({ t: t, kind: 'bass', m: m2, dur: 0.95, vel: vel }); prevBass = m2;
          }
        }
      } else if (style === 'twobeat') {
        [0, 2].forEach(function (p) { var c = chords[cIndex(b0 + p)]; bass(b0 + p, p && near(c.start, b0) ? tones(c)[2] : rootPc(c), 1.8, 0.8); });
      } else if (style === 'rock') {
        for (var e8 = 0; e8 < M * 2; e8++) { var c8 = chords[cIndex(b0 + e8 / 2)]; bass(b0 + e8 / 2, rootPc(c8), 0.45, e8 % 2 ? 0.55 : 0.75); }
      } else if (style === 'bossa') {
        [[0, 1.4, 0], [1.5, 0.45, 2], [2, 1.4, 2], [3.5, 0.45, 0]].forEach(function (s) { var c = chords[cIndex(b0 + s[0])]; bass(b0 + s[0], s[2] ? tones(c)[2] : rootPc(c), s[1], 0.75); });
      } else if (style === 'waltz') {
        var cw = chords[cIndex(b0)]; bass(b0, (bar - fromBar) % 2 ? tones(cw)[2] : rootPc(cw), 0.9, 0.8);
      } else if (style === 'ballad') {
        chords.forEach(function (c) { if (c.start >= b0 - EPS && c.start < b0 + M - EPS) { bass(c.start, rootPc(c), Math.min(c.dur, M) - 0.1, 0.7); if (c.dur >= 4 - EPS) bass(c.start + 2, tones(c)[2], 1.9, 0.55); } });
      }

      if (style === 'bossa') BOSSA_RIM[(bar - 1) % 2].forEach(function (p) { comp(b0 + p, 0.45, 0.5); });
      else if (style === 'ballad') chords.forEach(function (c) { if (c.start >= b0 - EPS && c.start < b0 + M - EPS) comp(c.start, c.dur - 0.05, 0.5); });
      else (COMP[style] || []).forEach(function (h) { if (h[0] < M - EPS) comp(b0 + h[0], h[1], 0.55); });
    }
    return evs;
  }

  /* ================================================================ transport */
  var P = null;
  var SWING = 2 / 3;
  function swingOn() { return opts.feel === 'swing'; }
  function sw(b) { if (!swingOn()) return b; var i = Math.floor(b), f = b - i; return i + (f < 0.5 ? f * 2 * SWING : SWING + (f - 0.5) * 2 * (1 - SWING)); }
  function swInv(x) { if (!swingOn()) return x; var i = Math.floor(x), f = x - i; return i + (f < SWING ? f / (2 * SWING) : 0.5 + (f - SWING) / (2 * (1 - SWING))); }
  function timeAt(b) { return P.anchorTime + (sw(b) - sw(P.anchorBeat)) * P.spb; }
  function beatAt(time) { return swInv(sw(P.anchorBeat) + (time - P.anchorTime) / P.spb); }
  function reanchor(fn) {
    if (!P) { fn(); return; }
    var now = ctx.currentTime, b = beatAt(now);
    fn();
    P.anchorBeat = b; P.anchorTime = now; P.spb = 60 / opts.tempo;
  }

  function loopRange() {
    var from = Math.max(1, Math.min(tune.bars, opts.from || 1));
    var to = Math.max(from, Math.min(tune.bars, opts.to || tune.bars));
    return { from: from, to: to };
  }
  function yours(bar, from) {
    if (opts.mode === 'band') return true;
    return opts.mode === 'trade' && Math.floor((bar - from) / 4) % 2 === 1;
  }

  function play() {
    if (!ensureAudio()) return;
    stop();
    var M = tune.M, r = loopRange(), withPickup = r.from === 1 && tune.pickup > 0;
    var lanes = {};
    Object.keys(bus).forEach(function (k) { lanes[k] = ctx.createGain(); lanes[k].connect(bus[k]); });
    P = {
      lanes: lanes, kit: window.DrumEngine ? window.DrumEngine.create(ctx, lanes.drums) : null,
      spb: 60 / opts.tempo, anchorBeat: 0, anchorTime: ctx.currentTime + 0.12,
      queue: [], qi: 0, ui: [], range: r, chorusLen: (r.to - r.from + 1) * M, k: 0,
      bodyStart: (withPickup ? 2 : 1) * M, withPickup: withPickup, timer: 0, raf: 0
    };
    // count-in bar, then (for tunes with a pickup) a bar of clicks that ends with the pickup notes
    for (var b = 0; b < P.bodyStart; b++) {
      P.queue.push({ b: b, kind: 'click', level: b % M === 0 ? 2 : 1 });
      P.queue.push({ b: b, kind: 'ui', ui: 'beat', n: b % M, count: true, label: b < M ? 'Count in: ' + (b % M + 1) : 'Pickup: the tune starts before bar 1' });
    }
    appendChorus(0);
    P.timer = setInterval(tick, 25);
    tick();
    P.raf = requestAnimationFrame(uiLoop);
    setPlaying(true);
  }
  function appendChorus(k) {
    var M = tune.M, r = P.range, off = P.bodyStart + k * P.chorusLen, tuneOff = (r.from - 1) * M;
    var g = function (tt) { return off + tt - tuneOff; };
    var add = [];
    var mel = view.concert;
    mel.forEach(function (e, idx) {
      var inPickup = e.start < 0;
      if (inPickup ? !P.withPickup : (e.start < tuneOff - EPS || e.start >= tuneOff + P.chorusLen - EPS)) return;
      var bar = inPickup ? 0 : Math.floor(e.start / M + EPS) + 1;
      add.push({ b: g(e.start), kind: 'ui', ui: 'note', idx: idx });
      if (e.p) add.push({ b: g(e.start), kind: 'mel', m: e.p.midi, dur: e.dur, bar: bar });
    });
    for (var bar = r.from; bar <= r.to; bar++) {
      var b0 = g((bar - 1) * M);
      add.push({ b: b0, kind: 'ui', ui: 'bar', bar: bar, yours: yours(bar, r.from) });
      for (var bt = 0; bt < M; bt++) {
        add.push({ b: b0 + bt, kind: 'ui', ui: 'beat', n: bt });
        var on = opts.click === 'all' || (opts.click === 'one' && bt === 0) ||
          (opts.click === 'backbeat' && (M === 3 ? bt > 0 : bt % 2 === 1)) ||
          (opts.click === 'gap' && Math.floor((bar - r.from) / 2) % 2 === 0);
        if (on) add.push({ b: b0 + bt, kind: 'click', level: bt === 0 && opts.click !== 'backbeat' ? 2 : 1 });
      }
    }
    if (opts.mode !== 'melody' && opts.mode !== 'click') {
      bandBars(opts.style, view.concertChords, view.voicings, M, r.from, r.to).forEach(function (e) { e.b = g(e.t); add.push(e); });
    }
    if (!opts.loop) add.push({ b: off + P.chorusLen, kind: 'end' });
    var rest = P.queue.slice(P.qi).concat(add);
    rest.sort(function (a, b) { return a.b - b.b; });
    P.queue = rest; P.qi = 0;
  }
  function tick() {
    if (!P) return;
    var now = ctx.currentTime, horizon = beatAt(now + 0.18);
    var chorusEnd = P.bodyStart + (P.k + 1) * P.chorusLen;
    if (opts.loop && horizon > chorusEnd - tune.M - (P.withPickup ? tune.pickup : 0)) appendChorus(++P.k);
    while (P.qi < P.queue.length && P.queue[P.qi].b < horizon) fire(P.queue[P.qi++]);
  }
  function fire(e) {
    var t = Math.max(ctx.currentTime, timeAt(e.b)), L = P.lanes;
    switch (e.kind) {
      case 'mel':
        if (opts.mode === 'band' || opts.mode === 'click' || yours(e.bar, P.range.from)) return;
        voiceLead(L.melody, t, timeAt(e.b + e.dur) - t, e.m, 0.5); break;
      case 'pno': {
        var end = timeAt(e.b + e.dur);
        e.ms.forEach(function (m, i) { voicePiano(L.piano, t + (opts.style === 'ballad' ? i * 0.025 : 0), end - t, m, e.vel * 0.45); });
        P.ui.push({ t: t, ui: 'chord', ci: e.ci }); break;
      }
      case 'bass': voiceBass(L.bass, t, timeAt(e.b + e.dur) - t, e.m, e.vel * 0.7); break;
      case 'drum': if (P.kit) P.kit.hit(e.name, t, e.vel); break;
      case 'click': voiceClick(L.click, t, e.level); break;
      case 'ui': e.t = t; P.ui.push(e); break;
      case 'end': P.ui.push({ t: t, ui: 'end' }); break;
    }
  }
  function uiLoop() {
    if (!P) return;
    var now = ctx.currentTime;
    while (P.ui.length && P.ui[0].t <= now) applyUi(P.ui.shift());
    P.raf = requestAnimationFrame(uiLoop);
  }
  function stop() {
    if (!P) return;
    clearInterval(P.timer); cancelAnimationFrame(P.raf);
    var t = ctx.currentTime;
    Object.keys(P.lanes).forEach(function (k) {
      var g = P.lanes[k];
      g.gain.setTargetAtTime(0, t, 0.03);
      setTimeout(function () { try { g.disconnect(); } catch (e) { /* gone */ } }, 400);
    });
    P = null;
    setPlaying(false);
    clearNow();
    beatDots(-1);
    banner('');
  }

  /* ================================================================ UI */
  var el = function (sel) { return root.querySelector(sel); };
  var playBtn = el('[data-fb-play]'), dotsEl = el('[data-fb-dots]'), bannerEl = el('[data-fb-banner]');
  function setPlaying(on) {
    playBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    playBtn.querySelector('span').textContent = on ? 'Stop' : 'Play';
    root.classList.toggle('is-playing', on);
  }
  function clearNow() {
    nowEls.forEach(function (n) { n.classList.remove('is-now'); });
    nowEls = [];
    Object.keys(barEls).forEach(function (k) { barEls[k].classList.remove('is-now'); });
  }
  function beatDots(n, count) {
    dotsEl.querySelectorAll('i').forEach(function (d, i) { d.classList.toggle('on', i === n); d.classList.toggle('one', i === 0); });
    dotsEl.classList.toggle('counting', !!count);
  }
  function banner(s) { bannerEl.textContent = s; bannerEl.hidden = !s; }
  function applyUi(e) {
    if (e.ui === 'beat') { beatDots(e.n, e.count); if (e.label) banner(e.label); }
    else if (e.ui === 'bar') {
      Object.keys(barEls).forEach(function (k) { barEls[k].classList.remove('is-now'); });
      if (barEls[e.bar]) barEls[e.bar].classList.add('is-now');
      banner(e.yours ? (opts.mode === 'band' ? 'You play the melody' : 'Your four bars: answer or improvise') : '');
      if (barEls[e.bar] && sheetFollow()) {
        var r = barEls[e.bar].getBoundingClientRect(), sc = root.closest('.ll-sim') || document.scrollingElement;
        var vh = (sc.getBoundingClientRect ? sc.getBoundingClientRect() : { top: 0, bottom: innerHeight });
        if (r.bottom > vh.bottom - 20 || r.top < vh.top + 140) barEls[e.bar].scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    } else if (e.ui === 'note') {
      nowEls.forEach(function (n) { n.classList.remove('is-now'); });
      nowEls = Array.prototype.slice.call(sheetEl.querySelectorAll('.fb-n[data-idx="' + e.idx + '"]'));
      nowEls.forEach(function (n) { n.classList.add('is-now'); });
    } else if (e.ui === 'chord') { if (e.ci !== chordSel) { chordSel = e.ci; showChord(false); } }
    else if (e.ui === 'end') stop();
  }
  function sheetFollow() { return el('[data-fb-follow]').checked; }

  // ---- library
  function renderLibrary() {
    var list = el('[data-fb-library]');
    list.innerHTML = tunes.map(function (raw) {
      return '<button type="button" class="fb-tune" data-tune="' + raw.id + '" aria-pressed="false">' +
        '<strong>' + MN.escape(raw.title) + '</strong>' +
        '<small>' + MN.escape(raw.composer) + '</small>' +
        '<span class="fb-tune-tags"><em>' + MN.escape(raw.style) + '</em><em>' + MN.escape(raw.key.replace('b', '♭').replace('#', '♯') + (raw.mode === 'minor' ? ' minor' : '')) + '</em><em>' + raw.meter.join('/') + '</em><em>' + MN.escape(raw.level) + '</em></span></button>';
    }).join('');
    list.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-tune]');
      if (b) selectTune(b.getAttribute('data-tune'), true);
    });
  }
  function selectTune(id, reset) {
    var raw = tunes.filter(function (x) { return x.id === id; })[0] || tunes[0];
    var was = !!P;
    stop();
    tune = parseTune(raw);
    opts.tune = raw.id;
    if (reset || !opts.key) {
      opts.key = raw.key; opts.from = 1; opts.to = tune.bars; opts.tempo = raw.tempo;
      opts.style = raw.band; opts.feel = raw.feel;
    }
    if (STYLES[opts.style].meters.indexOf(tune.M) < 0) opts.style = raw.band;
    if (!opts.tempo) opts.tempo = raw.tempo;
    if (!opts.feel) opts.feel = raw.feel;
    root.querySelectorAll('[data-tune]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tune') === raw.id ? 'true' : 'false'); });
    chordSel = 0;
    syncControls();
    refresh();
    el('[data-fb-title]').textContent = raw.title;
    el('[data-fb-meta]').textContent = raw.composer + ' · ' + raw.year;
    el('[data-fb-about]').textContent = raw.about;
    el('[data-fb-source]').textContent = raw.source;
    el('[data-fb-live]').textContent = raw.title + ' loaded.';
    if (history.replaceState && (!location.hash || /tune=/.test(location.hash))) history.replaceState(null, '', '#tune=' + raw.id);
    if (was) play();
  }

  // ---- controls
  function radios(container, name, defs, current) {
    container.innerHTML = Object.keys(defs).map(function (k) {
      var d = defs[k];
      return '<label class="fb-chip"><input type="radio" name="' + name + '" value="' + k + '"' + (k === current ? ' checked' : '') + ' /><span>' + MN.escape(d.label) + '</span></label>';
    }).join('');
  }
  function keyOptions() {
    var list = tune.key.minor ? MINOR_KEYS : MAJOR_KEYS, sel = el('[data-fb-key]');
    sel.innerHTML = list.map(function (k) {
      var lab = k.replace('b', '♭').replace('#', '♯') + (tune.key.minor ? ' minor' : ' major') + (k === tune.raw.key ? ' (original)' : '');
      return '<option value="' + k + '">' + lab + '</option>';
    }).join('');
    sel.value = opts.key;
  }
  function styleOptions() {
    var sel = el('[data-fb-style]');
    sel.innerHTML = Object.keys(STYLES).filter(function (k) { return STYLES[k].meters.indexOf(tune.M) >= 0; })
      .map(function (k) { return '<option value="' + k + '">' + STYLES[k].label + '</option>'; }).join('');
    sel.value = opts.style;
  }
  function syncControls() {
    keyOptions(); styleOptions();
    el('[data-fb-instr]').value = opts.instr;
    el('[data-fb-octave]').value = String(opts.octave);
    el('[data-fb-names]').checked = !!opts.names;
    el('[data-fb-tempo]').value = opts.tempo; el('[data-fb-tempo-num]').value = opts.tempo;
    el('[data-fb-feel]').value = opts.feel;
    el('[data-fb-mode]').value = opts.mode;
    el('[data-fb-click]').value = opts.click;
    el('[data-fb-lead]').value = opts.lead;
    el('[data-fb-loop]').checked = !!opts.loop;
    var r = loopRange();
    ['from', 'to'].forEach(function (k) { var i = el('[data-fb-' + k + ']'); i.max = tune.bars; i.value = r[k]; });
    root.querySelectorAll('[data-fb-vol]').forEach(function (s) { s.value = opts.vol[s.getAttribute('data-fb-vol')]; });
    root.querySelectorAll('input[name="fb-melody"]').forEach(function (i) { i.checked = i.value === opts.melody; });
    root.querySelectorAll('input[name="fb-rhythm"]').forEach(function (i) { i.checked = i.value === opts.rhythm; });
    root.querySelectorAll('input[name="fb-voicing"]').forEach(function (i) { i.checked = i.value === opts.voicing; });
    dotsEl.innerHTML = new Array(tune.M + 1).join('<i></i>');
    tips();
  }
  function tips() {
    el('[data-fb-melody-tip]').textContent = MELODY[opts.melody].tip;
    el('[data-fb-rhythm-tip]').textContent = RHYTHM[opts.rhythm].tip;
    el('[data-fb-style-tip]').textContent = STYLES[opts.style].tip;
    var ins = INSTR[opts.instr], ks = keyLabel(view ? view.writtenKey : tune.key);
    el('[data-fb-instr-tip]').textContent = ins.who.charAt(0).toUpperCase() + ins.who.slice(1) + '.' +
      (opts.instr === 'concert' || opts.instr === 'bass' ? '' : ' Concert ' + keyLabel(parseKey(opts.key, tune.key.minor)) + ' is written in ' + ks + ' for you.');
  }
  function refresh() {
    computeView();
    renderSheet();
    showChord(false);
    tips();
    el('[data-fb-keyline]').textContent = 'Written in ' + keyLabel(view.writtenKey) + ' · ' + tune.meter.join('/') +
      (tune.pickup ? ' · ' + tune.pickup + '-beat pickup' : '') + ' · ' + tune.bars + ' bars' +
      (opts.melody !== 'original' || opts.rhythm !== 'written' ? ' · variation: ' + [opts.melody !== 'original' ? MELODY[opts.melody].label : '', opts.rhythm !== 'written' ? RHYTHM[opts.rhythm].label : ''].filter(Boolean).join(' + ') : '');
    save();
  }
  function respin() { if (P) { stop(); play(); } }

  // ---- chord panel
  var kbEl = el('[data-fb-keys]');
  function drawKeyboard(notes) {
    var lo = 48, hi = 84, whites = [], blacks = [], wW = 22, x = 0;
    for (var m = lo; m < hi; m++) {
      var isB = [1, 3, 6, 8, 10].indexOf(mod(m, 12)) >= 0, on = notes.indexOf(m) >= 0;
      if (!isB) { whites.push('<rect x="' + x + '" y="0" width="' + wW + '" height="96" rx="3" class="fb-wk' + (on ? ' on' : '') + '"/>' + (mod(m, 12) === 0 ? '<text x="' + (x + wW / 2) + '" y="88" class="fb-kc">C' + (m / 12 - 1) + '</text>' : '')); x += wW; }
      else blacks.push('<rect x="' + (x - 7) + '" y="0" width="14" height="60" rx="2" class="fb-bk' + (on ? ' on' : '') + '"/>');
    }
    kbEl.innerHTML = '<svg viewBox="0 0 ' + x + ' 98" role="img" aria-label="Keyboard showing the notes ' + notes.map(function (n) { return noteName(respell(n)); }).join(', ') + '">' + whites.join('') + blacks.join('') + '</svg>';
  }
  function showChord(sound) {
    if (!view || !view.concertChords.length) return;
    var c = view.concertChords[chordSel], w = view.writtenChords[chordSel], notes = view.voicings[chordSel];
    var d = describeVoicing(c, notes);
    el('[data-fb-chordname]').textContent = chordName(opts.instr === 'concert' || opts.instr === 'bass' ? c : w);
    el('[data-fb-chordinfo]').textContent = (opts.instr === 'concert' || opts.instr === 'bass' ? '' : 'Sounds as ' + chordName(c) + ' (concert). ') +
      Q[c.q].name.charAt(0).toUpperCase() + Q[c.q].name.slice(1) + ' · bar ' + c.bar + ' · ' + d.bottom + ' on the bottom';
    el('[data-fb-chordnotes]').textContent = 'Piano plays: ' + d.spelled.join('  ') + (opts.instr === 'concert' || opts.instr === 'bass' ? '' : ' (concert)');
    el('[data-fb-voicing-tip]').textContent = VOICING[opts.voicing].tip;
    drawKeyboard(notes);
    sheetEl.querySelectorAll('.fb-chord').forEach(function (t) { t.classList.toggle('is-sel', Number(t.getAttribute('data-ci')) === chordSel); });
    if (sound && ensureAudio()) notes.forEach(function (m, i) { voicePiano(bus.piano, ctx.currentTime + 0.02 + i * 0.03, 1.4, m, 0.3); });
  }
  function playProgression() {
    if (!ensureAudio()) return;
    stop();
    var t = ctx.currentTime + 0.05, step = 0.7;
    view.voicings.slice(0, 16).forEach(function (n, i) {
      n.forEach(function (m) { voicePiano(bus.piano, t + i * step, step * 0.95, m, 0.28); });
      setTimeout(function () { chordSel = i; showChord(false); }, (t - ctx.currentTime + i * step) * 1000);
    });
  }

  // ---- loop painting
  function paintLoop() {
    var r = loopRange(), full = r.from === 1 && r.to === tune.bars;
    Object.keys(barEls).forEach(function (k) {
      var b = Number(k);
      barEls[k].classList.toggle('in-loop', !full && b >= r.from && b <= r.to);
      barEls[k].classList.toggle('yours', opts.mode === 'trade' && b >= r.from && b <= r.to && yours(b, r.from));
    });
  }

  function bind() {
    root.addEventListener('change', function (ev) {
      var t = ev.target, n = t.name;
      if (n === 'fb-melody') { opts.melody = t.value; refresh(); respin(); }
      else if (n === 'fb-rhythm') { opts.rhythm = t.value; refresh(); respin(); }
      else if (n === 'fb-voicing') { opts.voicing = t.value; view.voicings = voiceChords(view.concertChords, opts.voicing); showChord(true); save(); respin(); }
      else if (t.matches('[data-fb-key]')) { opts.key = t.value; refresh(); respin(); }
      else if (t.matches('[data-fb-instr]')) { opts.instr = t.value; refresh(); respin(); }
      else if (t.matches('[data-fb-octave]')) { opts.octave = Number(t.value); refresh(); respin(); }
      else if (t.matches('[data-fb-names]')) { opts.names = t.checked; renderSheet(); save(); }
      else if (t.matches('[data-fb-style]')) { opts.style = t.value; opts.feel = STYLES[opts.style].feel; el('[data-fb-feel]').value = opts.feel; tips(); save(); respin(); }
      else if (t.matches('[data-fb-feel]')) { reanchor(function () { opts.feel = t.value; }); save(); }
      else if (t.matches('[data-fb-mode]')) { opts.mode = t.value; paintLoop(); save(); respin(); }
      else if (t.matches('[data-fb-click]')) { opts.click = t.value; save(); respin(); }
      else if (t.matches('[data-fb-lead]')) { opts.lead = t.value; save(); }
      else if (t.matches('[data-fb-loop]')) { opts.loop = t.checked; save(); }
      else if (t.matches('[data-fb-from], [data-fb-to]')) {
        opts.from = Number(el('[data-fb-from]').value) || 1; opts.to = Number(el('[data-fb-to]').value) || tune.bars;
        if (opts.to < opts.from) opts.to = opts.from;
        var r = loopRange(); el('[data-fb-from]').value = r.from; el('[data-fb-to]').value = r.to;
        paintLoop(); save(); respin();
      }
    });
    root.addEventListener('input', function (ev) {
      var t = ev.target;
      if (t.matches('[data-fb-tempo], [data-fb-tempo-num]')) {
        var v = Math.max(40, Math.min(240, Number(t.value) || opts.tempo));
        reanchor(function () { opts.tempo = v; });
        if (P) P.spb = 60 / v;
        el(t.matches('[data-fb-tempo]') ? '[data-fb-tempo-num]' : '[data-fb-tempo]').value = v;
        save();
      } else if (t.matches('[data-fb-vol]')) { opts.vol[t.getAttribute('data-fb-vol')] = Number(t.value); applyVolumes(); save(); }
    });
    root.addEventListener('click', function (ev) {
      var t = ev.target;
      if (t.closest('[data-fb-play]')) { if (P) stop(); else play(); return; }
      if (t.closest('[data-fb-chordplay]')) { showChord(true); return; }
      if (t.closest('[data-fb-progression]')) { playProgression(); return; }
      if (t.closest('[data-fb-tempo-step]')) {
        var v = Math.max(40, Math.min(240, opts.tempo + Number(t.closest('[data-fb-tempo-step]').getAttribute('data-fb-tempo-step'))));
        reanchor(function () { opts.tempo = v; }); if (P) P.spb = 60 / v;
        el('[data-fb-tempo]').value = v; el('[data-fb-tempo-num]').value = v; save(); return;
      }
      if (t.closest('[data-fb-reset]')) { opts.melody = 'original'; opts.rhythm = 'written'; opts.key = tune.raw.key; opts.octave = 0; syncControls(); refresh(); respin(); return; }
      var ch = t.closest('.fb-chord');
      if (ch) { chordSel = Number(ch.getAttribute('data-ci')); showChord(true); return; }
      var bar = t.closest('.fb-bar');
      if (bar) {
        var b = Number(bar.getAttribute('data-bar')) || 1;
        if (ev.shiftKey) opts.to = Math.max(b, loopRange().from);
        else { opts.from = b; if (loopRange().to < b) opts.to = tune.bars; }
        var r = loopRange(); el('[data-fb-from]').value = r.from; el('[data-fb-to]').value = r.to;
        paintLoop(); save(); respin();
      }
    });
    root.addEventListener('keydown', function (ev) {
      var ch = ev.target.closest && ev.target.closest('.fb-chord');
      if (ch && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); chordSel = Number(ch.getAttribute('data-ci')); showChord(true); }
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== ' ' || ev.target.closest('input, select, textarea, button, [contenteditable], .fb-chord')) return;
      var r = root.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      ev.preventDefault(); if (P) stop(); else play();
    });
    var lastW = 0, rt = 0;
    new ResizeObserver(function () {
      var w = sheetEl.clientWidth;
      if (Math.abs(w - lastW) < 8) return;
      lastW = w; clearTimeout(rt); rt = setTimeout(renderSheet, 120);
    }).observe(sheetEl);
    el('[data-fb-reset-loop]').addEventListener('click', function () { opts.from = 1; opts.to = tune.bars; syncControls(); paintLoop(); save(); respin(); });
  }

  /* ================================================================ boot */
  radios(el('[data-fb-melody]'), 'fb-melody', MELODY, opts.melody);
  radios(el('[data-fb-rhythm]'), 'fb-rhythm', RHYTHM, opts.rhythm);
  radios(el('[data-fb-voicing]'), 'fb-voicing', VOICING, opts.voicing);
  el('[data-fb-instr]').innerHTML = Object.keys(INSTR).map(function (k) { return '<option value="' + k + '">' + INSTR[k].label + '</option>'; }).join('');

  fetch(DATA_URL).then(function (r) { return r.json(); }).then(function (data) {
    tunes = data.tunes;
    renderLibrary();
    bind();
    var startId = (location.hash.match(/tune=([\w-]+)/) || [])[1] || opts.tune;
    if (!tunes.some(function (x) { return x.id === startId; })) startId = tunes[0].id;
    selectTune(startId, startId !== opts.tune || !opts.key);
    root.classList.add('is-ready');
    window.addEventListener('hashchange', function () {
      var id = (location.hash.match(/tune=([\w-]+)/) || [])[1];
      if (id && id !== opts.tune && tunes.some(function (x) { return x.id === id; })) selectTune(id, true);
    });
  }).catch(function (err) {
    sheetEl.innerHTML = '<p class="fb-error">The tune library could not load (' + MN.escape(err.message) + '). Open this page from the class site or a local server.</p>';
  });

  // Exposed for tests and for other lessons that want to reuse the tune engine.
  window.FakeBook = {
    parseTune: parseTune, melody: MELODY, rhythm: RHYTHM, voiceChords: voiceChords, chordTones: chordTones,
    shiftBetween: shiftBetween, shiftKey: shiftKey, keySig: keySig, parseKey: parseKey, decompose: decompose, layoutBars: layoutBars,
    state: function () { return { opts: opts, tune: tune, view: view, playing: !!P }; }
  };
})();
