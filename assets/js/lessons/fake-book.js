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
  var PT = window.PianoTheory;
  var GT = window.GuitarTheory;
  var TA = window.TriadAssistantTheory;
  var root = document.getElementById('fakebook');
  if (!root || !MN) return;
  var DATA_URL = root.getAttribute('data-src') || '../../data/fake-book.json';
  var STORE = 'fakebook:v1';
  var IMPORT_STORE = 'fakebook:imports:v1';

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
  function chordName(c) {
    var sym = c.display !== undefined && c.display !== null ? c.display : (Q[c.q] ? Q[c.q].sym : c.q);
    var name = LETTERS[c.root.l] + ACC[c.root.a] + sym;
    if (c.bass) name += '/' + LETTERS[c.bass.l] + ACC[c.bass.a];
    return name;
  }
  function chordAt(chords, t) {
    for (var i = chords.length - 1; i >= 0; i--) if (chords[i].start <= t + EPS) return chords[i];
    return chords[0] || null;
  }

  function mapQuality(rawQ) {
    var q = (rawQ || '').trim();
    if (!q) return '';
    if (/^h|^-7b5|^m7b5/i.test(q)) return 'm7b5';
    if (/^o7|^dim7/i.test(q)) return 'dim7';
    if (/^o|^dim/i.test(q)) return 'dim';
    if (/^\+|^aug/i.test(q)) return 'aug';
    if (/sus/i.test(q)) return 'sus4';
    if (/^-(?:6|69)|^m6/i.test(q)) return 'm6';
    if (/^-|^m/i.test(q)) return (q === '-' || q === 'm' || q === 'min') ? 'm' : 'm7';
    if (/^\^|^maj7|^M7|^maj9/i.test(q)) return 'maj7';
    if (/^6/i.test(q)) return '6';
    if (/^9/i.test(q)) return '9';
    if (/^7|^13|^alt/i.test(q)) return '7';
    return '';
  }

  function formatDisplayQuality(rawQ) {
    if (!rawQ) return '';
    var s = rawQ;
    if (s === 'dim') return '°';
    if (s === 'dim7' || s === 'o7') return '°7';
    if (s === 'o') return '°';
    if (s === 'm7b5' || s === 'h7' || s === 'h' || s === '-7b5') return 'ø7';
    if (s === 'aug' || s === '+') return '+';
    if (s === '^' || s === '^7') return 'maj7';
    if (s.indexOf('^') === 0) s = 'maj' + s.slice(1);
    if (s.indexOf('-') === 0) s = 'm' + s.slice(1);
    return s.replace(/b/g, '♭').replace(/#/g, '♯');
  }

  /* ================================================================ parsing */
  // A 3 after the duration letter makes it a triplet: three e3 notes fill one beat, three q3 fill two.
  var NOTE_RE = /^([A-G])(##|bb|#|b)?(\d)([whqes])(3)?(\.)?(~)?$/;
  var REST_RE = /^r\d?([whqes])(3)?(\.)?$/;
  var CHORD_RE = /^([A-G])(##|bb|#|b)?([^\/: \t\r\n]*)(?:\/([A-G])(##|bb|#|b)?)?(?::([\d.]+))?$/;

  function parseTune(raw) {
    var t = {
      raw: raw, id: raw.id, key: parseKey(raw.key, raw.mode === 'minor'),
      M: raw.meter[0] * 4 / raw.meter[1], meter: raw.meter, pickup: raw.pickup || 0,
      chordsOnly: !!raw.chordsOnly, sectionsByBar: raw.sectionsByBar || {}
    };
    t.hasSections = Object.keys(t.sectionsByBar).length > 0;
    var groups = raw.melody.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    var events = [], time = -t.pickup, tieOpen = null;
    groups.forEach(function (g, gi) {
      var barStart = time;
      g.split(/\s+/).forEach(function (tok) {
        var m = NOTE_RE.exec(tok), d, p = null, tie = false;
        if (m) {
          d = DUR[m[4]] * (m[5] ? 2 / 3 : 1) * (m[6] ? 1.5 : 1);
          var a = { '': 0, '#': 1, '##': 2, 'b': -1, 'bb': -2 }[m[2] || ''];
          p = pitch(Number(m[3]) * 7 + LETTERS.indexOf(m[1]), a);
          tie = !!m[7];
        } else if ((m = REST_RE.exec(tok))) {
          d = DUR[m[1]] * (m[2] ? 2 / 3 : 1) * (m[3] ? 1.5 : 1);
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
        var beats = m[6] ? Number(m[6]) : null;
        if (beats) fixed += beats; else free++;
        var q = mapQuality(m[3]);
        var display = formatDisplayQuality(m[3]);
        var bass = m[4] ? { l: LETTERS.indexOf(m[4]), a: m[5] === '#' ? 1 : m[5] === 'b' ? -1 : 0 } : null;
        parsed.push({
          root: { l: LETTERS.indexOf(m[1]), a: m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0 },
          q: q,
          display: display,
          bass: bass,
          beats: beats
        });
      });
      var pos = bi * t.M, share = free ? (t.M - fixed) / free : 0;
      parsed.forEach(function (c) {
        var d = c.beats || share;
        chords.push({ start: pos, dur: d, root: c.root, q: c.q, display: c.display, bass: c.bass, bar: bi + 1 });
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
    if (c.bass) {
      var bName = LETTERS[c.bass.l] + ACC[c.bass.a];
      name = bName + ' in bass (' + name + ')';
    }
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
    vol: { melody: 80, piano: 55, bass: 75, drums: 65, click: 60 },
    sheetView: 'lead',
    engineInst: 'piano',
    engineMode: 'voicings',
    guitarForm: 'open',
    triadInv: 0,
    triadSet: '123',
    scaleType: 'ionian'
  };
  var opts = load();
  var defaultTunes = [], importedTunes = [];
  var tunes = [], tune = null, view = null, chordSel = 0;

  function loadImports() {
    try {
      var raw = JSON.parse(localStorage.getItem(IMPORT_STORE) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }
  function saveImports() {
    try {
      localStorage.setItem(IMPORT_STORE, JSON.stringify(importedTunes));
    } catch (e) { /* storage unavailable */ }
  }

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
        var bass = null;
        if (c.bass) {
          var b = shiftPitch(pitch(c.bass.l + 28, c.bass.a), sh.letters, sh.semis, flat);
          if (Math.abs(b.a) > 1) b = respell(b.midi, flat);
          bass = { l: b.l, a: b.a };
        }
        return {
          start: c.start, dur: c.dur, bar: c.bar, q: c.q,
          display: c.display || null,
          bass: bass,
          root: { l: r.l, a: r.a }
        };
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
  // Triplet lengths (1/3, 2/3, 4/3 of a beat) can't be built from plain note values.
  function isTriplet(d) { return near(mod(d * 3 + EPS, 1), EPS) && !near(mod(d * 4 + EPS, 1), EPS); }
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
    if (t.pickup) bars.push({ i: 0, start: -t.pickup, len: t.pickup, off: t.M - t.pickup, section: null });
    for (var i = 1; i <= t.bars; i++) bars.push({ i: i, start: (i - 1) * t.M, len: t.M, off: 0, section: (t.sectionsByBar && t.sectionsByBar[i]) || null });
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
        if (isTriplet(it.len)) {                                         // drawn as the plain value it stands for, marked 3
          b.pieces.push({ rest: !it.p, rel: it.rel, beat: it.rel + b.off, d: Math.round(it.len * 6) / 4, real: it.len, trip: true, idx: it.idx, p: it.p, tie: !!it.p && it.cont, tieFrom: !!it.p && it.from });
          return;
        }
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

  function renderDrumBarNotes(out, bx, bw, staffTop, SP, drumSet, M, barNum) {
    var pad = 14;
    var usableW = bw - pad * 2;
    var xAt = function (bt) { return bx + pad + (bt / M) * usableW; };
    var hands = [];
    var feet = [];

    var dRows = DRUMS[drumSet] || DRUMS.swing || [];
    dRows.forEach(function (row) {
      var inst = row[0];
      for (var i = 1; i < row.length; i++) {
        var bt = row[i][0];
        if (bt >= M - EPS) continue;
        var x = xAt(bt);
        if (inst === 'ride') hands.push({ x: x, y: staffTop - 3, head: 'x', bt: bt, inst: 'ride' });
        else if (inst === 'snare') hands.push({ x: x, y: staffTop + 18, head: 'o', bt: bt, inst: 'snare' });
        else if (inst === 'rim') hands.push({ x: x, y: staffTop + 18, head: 'x', bt: bt, inst: 'rim' });
        else if (inst === 'hat') {
          if (drumSet === 'rock' || drumSet === 'twobeat' || drumSet === 'bossa') {
            hands.push({ x: x, y: staffTop, head: 'x', bt: bt, inst: 'hat' });
          } else {
            feet.push({ x: x, y: staffTop + 50, head: 'x', bt: bt, inst: 'hat' });
          }
        }
        else if (inst === 'kick') feet.push({ x: x, y: staffTop + 38, head: 'o', bt: bt, inst: 'kick' });
      }
    });

    if (opts.style === 'bossa') {
      var rimHits = BOSSA_RIM[(barNum - 1) % 2] || [];
      rimHits.forEach(function (bt) {
        if (bt < M - EPS) hands.push({ x: xAt(bt), y: staffTop + 18, head: 'x', bt: bt, inst: 'rim' });
      });
    }

    hands.sort(function (a, b) { return a.x - b.x || a.y - b.y; });
    feet.sort(function (a, b) { return a.x - b.x || a.y - b.y; });

    var handGroups = {};
    hands.forEach(function (h) {
      var k = Math.round(h.x);
      handGroups[k] = handGroups[k] || [];
      handGroups[k].push(h);
    });

    var handKeys = Object.keys(handGroups).map(Number).sort(function (a, b) { return a - b; });
    var stemTopY = staffTop - 22;

    handKeys.forEach(function (hx) {
      var list = handGroups[hx];
      var maxY = Math.max.apply(null, list.map(function (n) { return n.y; }));
      list.forEach(function (n) {
        if (n.head === 'x') {
          out.push('<path d="M' + (hx - 3.5).toFixed(1) + ' ' + (n.y - 3.5).toFixed(1) + 'L' + (hx + 3.5).toFixed(1) + ' ' + (n.y + 3.5).toFixed(1) + 'M' + (hx - 3.5).toFixed(1) + ' ' + (n.y + 3.5).toFixed(1) + 'L' + (hx + 3.5).toFixed(1) + ' ' + (n.y - 3.5).toFixed(1) + '" stroke="#1b1410" stroke-width="1.8" stroke-linecap="round"/>');
        } else {
          out.push('<ellipse cx="' + hx.toFixed(1) + '" cy="' + n.y.toFixed(1) + '" rx="4.5" ry="3.3" transform="rotate(-20 ' + hx.toFixed(1) + ' ' + n.y.toFixed(1) + ')" fill="#1b1410"/>');
        }
      });
      out.push('<line class="fb-drum-stem" x1="' + (hx + 4).toFixed(1) + '" y1="' + maxY.toFixed(1) + '" x2="' + (hx + 4).toFixed(1) + '" y2="' + stemTopY.toFixed(1) + '" stroke="#1b1410" stroke-width="1.4"/>');
    });

    for (var bi = 0; bi < handKeys.length - 1; bi++) {
      var x1 = handKeys[bi], x2 = handKeys[bi + 1];
      if (x2 - x1 < usableW / M * 0.75) {
        out.push('<rect class="fb-drum-beam" x="' + (x1 + 3.5).toFixed(1) + '" y="' + stemTopY.toFixed(1) + '" width="' + (x2 - x1 + 1).toFixed(1) + '" height="3.2" fill="#1b1410"/>');
        bi++;
      }
    }

    var footGroups = {};
    feet.forEach(function (f) {
      var k = Math.round(f.x);
      footGroups[k] = footGroups[k] || [];
      footGroups[k].push(f);
    });
    var footKeys = Object.keys(footGroups).map(Number).sort(function (a, b) { return a - b; });
    var stemBotY = staffTop + 44 + 20;

    footKeys.forEach(function (fx) {
      var list = footGroups[fx];
      var minY = Math.min.apply(null, list.map(function (n) { return n.y; }));
      list.forEach(function (n) {
        if (n.head === 'x') {
          out.push('<path d="M' + (fx - 3.5).toFixed(1) + ' ' + (n.y - 3.5).toFixed(1) + 'L' + (fx + 3.5).toFixed(1) + ' ' + (n.y + 3.5).toFixed(1) + 'M' + (fx - 3.5).toFixed(1) + ' ' + (n.y + 3.5).toFixed(1) + 'L' + (fx + 3.5).toFixed(1) + ' ' + (n.y - 3.5).toFixed(1) + '" stroke="#1b1410" stroke-width="1.8" stroke-linecap="round"/>');
        } else {
          out.push('<ellipse cx="' + fx.toFixed(1) + '" cy="' + n.y.toFixed(1) + '" rx="4.5" ry="3.3" transform="rotate(-20 ' + fx.toFixed(1) + ' ' + n.y.toFixed(1) + ')" fill="#1b1410"/>');
        }
      });
      out.push('<line class="fb-drum-stem" x1="' + (fx - 4).toFixed(1) + '" y1="' + minY.toFixed(1) + '" x2="' + (fx - 4).toFixed(1) + '" y2="' + stemBotY.toFixed(1) + '" stroke="#1b1410" stroke-width="1.4"/>');
    });
  }

  function renderDrumSheet() {
    if (!view || !tune) return;
    var legendEl = el('[data-fb-drum-legend]');
    if (legendEl) legendEl.hidden = false;
    var W = Math.max(320, Math.floor(sheetEl.clientWidth || 900));
    var M = tune.M;
    var styleKey = opts.style || tune.band || 'swing';
    var drumSet = styleKey === 'ballad' ? (M === 3 ? 'ballad3' : 'ballad4') : styleKey;
    var bpl = W >= 900 ? 4 : W >= 620 ? 3 : 2;
    var totalBars = tune.bars;
    var systems = [], cur = [];
    for (var b = 1; b <= totalBars; b++) {
      cur.push(b);
      if (cur.length === bpl || b === totalBars) {
        systems.push(cur);
        cur = [];
      }
    }

    var SP = 11;
    var staffH = 4 * SP;
    var rowH = 135;
    var headerW = 75;
    var out = [];
    var yTop = 28;

    systems.forEach(function (sys, si) {
      var firstSys = si === 0;
      var staffTop = yTop + si * rowH + 24;
      var staffBot = staffTop + staffH;
      var availW = W - headerW - 16;
      var barW = Math.floor(availW / bpl);

      for (var l = 0; l < 5; l++) {
        var ly = staffTop + l * SP;
        out.push('<line class="fb-drum-staffline" x1="10" y1="' + ly + '" x2="' + (headerW + sys.length * barW) + '" y2="' + ly + '" stroke="#3d352b" stroke-width="1.1"/>');
      }

      out.push(MN.clef('percussion', 16, staffBot, SP / 2));

      if (firstSys) {
        out.push('<text class="fb-drum-timesig" x="50" y="' + (staffTop + 18) + '" font-size="22" font-weight="700" font-family="Fraunces, serif" text-anchor="middle" fill="#1f1a14">' + M + '</text>');
        out.push('<text class="fb-drum-timesig" x="50" y="' + (staffTop + 38) + '" font-size="22" font-weight="700" font-family="Fraunces, serif" text-anchor="middle" fill="#1f1a14">4</text>');
        var grooveTitle = (STYLES[opts.style] ? STYLES[opts.style].label : 'Groove') + (opts.feel === 'swing' ? ' (Swing feel)' : ' (Straight)');
        out.push('<text x="' + headerW + '" y="' + (staffTop - 11) + '" font-size="12" font-weight="700" font-family="DM Sans, sans-serif" fill="#7a4508">♩ = ' + opts.tempo + ' · ' + MN.escape(grooveTitle) + '</text>');
      }

      out.push('<line class="fb-drum-barline" x1="' + headerW + '" y1="' + staffTop + '" x2="' + headerW + '" y2="' + staffBot + '" stroke="#1b1410" stroke-width="1.4"/>');

      sys.forEach(function (barNum, bi) {
        var bx = headerW + bi * barW;
        var ex = bx + barW;
        var isLast = barNum === totalBars;

        out.push('<rect class="fb-bar" data-bar="' + barNum + '" x="' + bx + '" y="' + (staffTop - 14) + '" width="' + barW + '" height="' + (staffH + 28) + '" rx="4"/>');
        out.push('<text class="fb-drum-barnum" x="' + (bx + 6) + '" y="' + (staffTop - 5) + '">' + barNum + '</text>');

        if (tune.sectionsByBar && tune.sectionsByBar[barNum]) {
          var sec = tune.sectionsByBar[barNum];
          out.push('<rect class="fb-sec-bg" x="' + (bx + 24) + '" y="' + (staffTop - 20) + '" width="18" height="15" rx="3"/>');
          out.push('<text class="fb-sec-txt" x="' + (bx + 33) + '" y="' + (staffTop - 8) + '" font-size="10" font-weight="800" text-anchor="middle">' + MN.escape(sec) + '</text>');
        }

        renderDrumBarNotes(out, bx, barW, staffTop, SP, drumSet, M, barNum);

        if (isLast) {
          out.push('<line class="fb-drum-barline" x1="' + (ex - 8) + '" y1="' + staffTop + '" x2="' + (ex - 8) + '" y2="' + staffBot + '" stroke="#1b1410" stroke-width="1.3"/>');
          out.push('<rect x="' + (ex - 4) + '" y="' + staffTop + '" width="4" height="' + staffH + '" fill="#1b1410"/>');
          out.push('<circle cx="' + (ex - 14) + '" cy="' + (staffTop + 14) + '" r="2" fill="#1b1410"/>');
          out.push('<circle cx="' + (ex - 14) + '" cy="' + (staffTop + 26) + '" r="2" fill="#1b1410"/>');
        } else {
          out.push('<line class="fb-drum-barline" x1="' + ex + '" y1="' + staffTop + '" x2="' + ex + '" y2="' + staffBot + '" stroke="#1b1410" stroke-width="1.3"/>');
        }
      });
    });

    var H = yTop + systems.length * rowH + 20;
    sheetEl.innerHTML = '<svg class="fb-drum-svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' +
      MN.escape(tune.raw.title + ' drum notation chart, ' + STYLES[opts.style].label + ' groove, ' + tune.meter.join('/') + ' time') + '">' + out.join('') + '</svg>';

    nowEls = []; barEls = {};
    sheetEl.querySelectorAll('.fb-bar').forEach(function (r) { barEls[r.getAttribute('data-bar')] = r; });
    paintLoop();
  }

  function renderSheet() {
    if (!view) return;
    var legendEl = el('[data-fb-drum-legend]');
    if (opts.sheetView === 'drums') {
      if (legendEl) legendEl.hidden = false;
      renderDrumSheet();
      return;
    }
    if (legendEl) legendEl.hidden = true;
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
          top = Math.max(top, (up && BASE[pc.d][0] < 4 ? st + 7 : st) + (pc.trip && up ? 3 : 0));
          bottom = Math.min(bottom, (!up && BASE[pc.d][0] < 4 ? st - 7 : st) - (pc.trip && !up ? 3 : 0));
        });
      });
      var noteTop = (top - 8) * half, noteBot = -bottom * half;
      var secH = t.hasSections ? 1.6 * S : 0;
      var staffTop = y + 3.6 * S + secH + noteTop, staffBot = staffTop + 4 * S;
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
        var secBoxW = 0;
        if (b.section) {
          var secX = b.x + (k === 0 ? 0.3 * S : 0.1 * S);
          var secY = chordBase - 2.2 * S;
          var secText = b.section;
          secBoxW = Math.max(1.7 * S, secText.length * 0.9 * S + 0.8 * S);
          var secBoxH = 1.6 * S;
          out.push('<g class="fb-section-tag"><rect x="' + secX.toFixed(1) + '" y="' + secY.toFixed(1) + '" width="' + secBoxW.toFixed(1) + '" height="' + secBoxH.toFixed(1) + '" rx="' + (0.35 * S).toFixed(1) + '" class="fb-sec-bg"/><text x="' + (secX + secBoxW / 2).toFixed(1) + '" y="' + (secY + secBoxH * 0.72).toFixed(1) + '" class="fb-sec-txt" font-size="' + (1.1 * S).toFixed(1) + '" text-anchor="middle">' + MN.escape(secText) + '</text></g>');
        }
        // chord symbols
        (chordsByBar[b.i] || []).forEach(function (o, oi) {
          var cx = xAt(o.c.start - b.start) - 0.4 * S;
          if (b.section && oi === 0 && cx < b.x + secBoxW + 0.3 * S) {
            cx = b.x + secBoxW + 0.3 * S;
          }
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
            n.up = up; n.tip = tip;
            return;
          }
          var beamY = up ? Math.min.apply(null, gr.map(function (n) { return n.y; })) - 3.3 * S : Math.max.apply(null, gr.map(function (n) { return n.y; })) + 3.3 * S;
          var th = 0.48 * S, dir = up ? 1 : -1;
          gr.forEach(function (n) { n.up = up; n.tip = beamY; n.g.push(line(sx(n), n.y, sx(n), beamY, (0.12 * S).toFixed(2), 'fb-stem')); });
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
        // triplets: a 3 over each beat's worth (bracketed when the notes aren't beamed together)
        var trip = [], tripLen = 0;
        b.pieces.forEach(function (pc) {
          if (!pc.trip) { trip = []; tripLen = 0; return; }
          trip.push(pc); tripLen += pc.real;
          if (!near(tripLen, Math.round(tripLen))) return;
          var ns = placedBar.filter(function (n) { return trip.indexOf(n.pc) >= 0; });
          var up = ns.filter(function (n) { return n.up; }).length * 2 >= ns.length;
          var ys = ns.map(function (n) { return n.tip !== undefined ? n.tip : n.y; }).concat(up ? [staffTop + S] : [staffBot - S]);
          var ty = up ? Math.min.apply(null, ys) - 0.7 * S : Math.max.apply(null, ys) + 0.7 * S;
          var x1 = trip[0].head, x2 = trip[trip.length - 1].head + headW, xm = (x1 + x2) / 2;
          if (trip.some(function (pc) { return pc.d > 0.5; }) || trip.some(function (pc) { return pc.rest; })) {
            var hook = up ? 0.6 * S : -0.6 * S;
            out.push('<path class="fb-tuplet-br" d="M' + x1.toFixed(1) + ' ' + (ty + hook).toFixed(1) + ' V' + ty.toFixed(1) + ' H' + (xm - 0.8 * S).toFixed(1) + ' M' + (xm + 0.8 * S).toFixed(1) + ' ' + ty.toFixed(1) + ' H' + x2.toFixed(1) + ' V' + (ty + hook).toFixed(1) + '" fill="none" stroke="currentColor" stroke-width="' + (0.1 * S).toFixed(2) + '"/>');
          }
          out.push(txt(xm, ty + 0.45 * S, '3', 'fb-tuplet', ' font-size="' + (1.3 * S) + '" text-anchor="middle"'));
          trip = []; tripLen = 0;
        });
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

  function mapBandStyle(rawStyle, meter) {
    var s = (rawStyle || '').toLowerCase().trim();
    var is3 = meter && meter[0] === 3;
    if (is3) {
      if (s.indexOf('swing') >= 0 || s.indexOf('jazz') >= 0) return 'jazzwaltz';
      if (s.indexOf('ballad') >= 0 || s.indexOf('slow') >= 0) return 'ballad';
      return 'waltz';
    }
    if (s.indexOf('bossa') >= 0 || s.indexOf('latin') >= 0 || s.indexOf('samba') >= 0 || s.indexOf('bolero') >= 0 || s.indexOf('rhumba') >= 0 || s.indexOf('cha') >= 0) return 'bossa';
    if (s.indexOf('ballad') >= 0 || s.indexOf('slow') >= 0) return 'ballad';
    if (s.indexOf('two-beat') >= 0 || s.indexOf('twobeat') >= 0 || s.indexOf('trad') >= 0 || s.indexOf('new orleans') >= 0 || s.indexOf('dixie') >= 0) return 'twobeat';
    if (s.indexOf('rock') >= 0 || s.indexOf('pop') >= 0 || s.indexOf('funk') >= 0 || s.indexOf('even') >= 0 || s.indexOf('straight') >= 0 || s.indexOf('fusion') >= 0 || s.indexOf('disco') >= 0) return 'rock';
    return 'swing';
  }

  function defaultTempo(rawStyle, meter) {
    var b = mapBandStyle(rawStyle, meter);
    if (b === 'ballad') return 72;
    if (b === 'bossa') return 130;
    if (b === 'rock') return 110;
    if (b === 'twobeat') return 180;
    if (b === 'waltz') return 110;
    if (b === 'jazzwaltz') return 130;
    return 120;
  }

  function songToTune(song) {
    var id = 'import-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    var M = song.meter[0] * 4 / song.meter[1];
    var restToken = M === 4 ? 'rw' : M === 3 ? 'rh.' : M === 2 ? 'rh' : 'rw';
    var melody = new Array(song.bars.length).fill(restToken).join(' | ');
    var sectionsByBar = {};
    var chordBars = [];
    song.bars.forEach(function (bar, bi) {
      var barNum = bi + 1;
      if (bar.section) sectionsByBar[barNum] = bar.section;
      var toks = [];
      (bar.chords || []).forEach(function (c) {
        if (!c.root) return;
        var s = c.root + (c.quality || '');
        if (c.bass) s += '/' + c.bass;
        if (c.beats && c.beats !== M) s += ':' + c.beats;
        toks.push(s);
      });
      chordBars.push(toks.join(' ') || (chordBars.length ? chordBars[chordBars.length - 1] : 'C'));
    });
    var chords = chordBars.join(' | ');
    var band = mapBandStyle(song.style, song.meter);
    var tempo = song.bpm > 0 ? Math.max(40, Math.min(240, song.bpm)) : defaultTempo(song.style, song.meter);
    return {
      id: id,
      title: song.title || 'Untitled',
      composer: song.composer || 'Unknown composer',
      year: 'Imported iReal chart',
      style: song.style || 'Swing',
      level: 'Imported',
      key: song.key || 'C',
      mode: song.minor ? 'minor' : 'major',
      meter: song.meter || [4, 4],
      tempo: tempo,
      band: band,
      feel: STYLES[band] ? STYLES[band].feel : 'swing',
      pickup: 0,
      melody: melody,
      chords: chords,
      sectionsByBar: sectionsByBar,
      chordsOnly: true,
      imported: true,
      about: (song.sections ? 'Form: ' + song.sections + '. ' : '') + song.bars.length + ' bars unrolled from iReal Pro chart.',
      source: 'Imported iReal Pro chord chart (kept in this browser only).'
    };
  }

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
    var bassPc = function (c) { var b = c.bass || c.root; return mod(NAT[b.l] + b.a, 12); };
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
          if (near(c.start, t)) bass(t, bassPc(c), 0.95, vel);
          else if (t + 1 >= nextStart - EPS) {
            var target = nearestBass(bassPc(nxt), prevBass);
            evs.push({ t: t, kind: 'bass', m: target + (prevBass > target ? 1 : -1), dur: 0.95, vel: vel }); prevBass = target + (prevBass > target ? 1 : -1);
          } else {
            var opts2 = tones(c).slice(1).map(function (pc) { return nearestBass(pc, prevBass); }).filter(function (m) { return m !== prevBass; });
            opts2.sort(function (a, b2) { return Math.abs(a - prevBass) - Math.abs(b2 - prevBass); });
            var m2 = opts2[0] || prevBass + 2; evs.push({ t: t, kind: 'bass', m: m2, dur: 0.95, vel: vel }); prevBass = m2;
          }
        }
      } else if (style === 'twobeat') {
        [0, 2].forEach(function (p) { var c = chords[cIndex(b0 + p)]; bass(b0 + p, p && near(c.start, b0) && !c.bass ? tones(c)[2] : bassPc(c), 1.8, 0.8); });
      } else if (style === 'rock') {
        for (var e8 = 0; e8 < M * 2; e8++) { var c8 = chords[cIndex(b0 + e8 / 2)]; bass(b0 + e8 / 2, bassPc(c8), 0.45, e8 % 2 ? 0.55 : 0.75); }
      } else if (style === 'bossa') {
        [[0, 1.4, 0], [1.5, 0.45, 2], [2, 1.4, 2], [3.5, 0.45, 0]].forEach(function (s) { var c = chords[cIndex(b0 + s[0])]; bass(b0 + s[0], s[2] && !c.bass ? tones(c)[2] : bassPc(c), s[1], 0.75); });
      } else if (style === 'waltz') {
        var cw = chords[cIndex(b0)]; bass(b0, (bar - fromBar) % 2 && !cw.bass ? tones(cw)[2] : bassPc(cw), 0.9, 0.8);
      } else if (style === 'ballad') {
        chords.forEach(function (c) { if (c.start >= b0 - EPS && c.start < b0 + M - EPS) { bass(c.start, bassPc(c), Math.min(c.dur, M) - 0.1, 0.7); if (c.dur >= 4 - EPS && !c.bass) bass(c.start + 2, tones(c)[2], 1.9, 0.55); } });
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
    var builtInList = el('[data-fb-library]');
    if (builtInList) {
      builtInList.innerHTML = defaultTunes.map(function (raw) {
        return '<div class="fb-tune-item">' +
          '<button type="button" class="fb-tune" data-tune="' + raw.id + '" aria-pressed="' + (raw.id === (tune ? tune.id : opts.tune) ? 'true' : 'false') + '">' +
          '<strong>' + MN.escape(raw.title) + '</strong>' +
          '<small>' + MN.escape(raw.composer) + '</small>' +
          '<span class="fb-tune-tags"><em>' + MN.escape(raw.style) + '</em><em>' + MN.escape(raw.key.replace('b', '♭').replace('#', '♯') + (raw.mode === 'minor' ? ' minor' : '')) + '</em><em>' + raw.meter.join('/') + '</em><em>' + MN.escape(raw.level) + '</em></span></button>' +
          '</div>';
      }).join('');
    }
    var importsWrap = el('[data-fb-imports-wrap]');
    var importsList = el('[data-fb-imports-library]');
    var importsCount = el('[data-fb-imports-count]');
    if (importsWrap && importsList) {
      if (importedTunes.length > 0) {
        importsWrap.hidden = false;
        if (importsCount) importsCount.textContent = String(importedTunes.length);
        importsList.innerHTML = importedTunes.map(function (raw) {
          return '<div class="fb-tune-item">' +
            '<button type="button" class="fb-tune fb-tune-imported" data-tune="' + raw.id + '" aria-pressed="' + (raw.id === (tune ? tune.id : opts.tune) ? 'true' : 'false') + '">' +
            '<strong>' + MN.escape(raw.title) + '</strong>' +
            '<small>' + MN.escape(raw.composer) + '</small>' +
            '<span class="fb-tune-tags"><em class="fb-tag-imported">Imported</em><em>' + MN.escape(raw.key.replace('b', '♭').replace('#', '♯') + (raw.mode === 'minor' ? ' minor' : '')) + '</em><em>' + raw.meter.join('/') + '</em><em>' + raw.bars + ' bars</em></span></button>' +
            '<button type="button" class="fb-tune-remove" data-remove-tune="' + raw.id + '" aria-label="Remove ' + MN.escape(raw.title) + ' from your imports" title="Remove from this browser">✕</button>' +
            '</div>';
        }).join('');
      } else {
        importsWrap.hidden = true;
        importsList.innerHTML = '';
      }
    }
  }

  function removeImported(id) {
    var rem = importedTunes.filter(function (x) { return x.id === id; })[0];
    importedTunes = importedTunes.filter(function (x) { return x.id !== id; });
    saveImports();
    tunes = defaultTunes.concat(importedTunes);
    if (opts.tune === id) {
      var fallbackId = defaultTunes.length ? defaultTunes[0].id : (importedTunes.length ? importedTunes[0].id : null);
      if (fallbackId) selectTune(fallbackId, true);
    }
    renderLibrary();
    importFeedback(rem ? 'Removed "' + rem.title + '" from your imports.' : 'Removed chart.', false);
  }

  function importFeedback(msg, isError) {
    var fb = el('[data-fb-import-feedback]');
    if (!fb) return;
    fb.hidden = !msg;
    fb.textContent = msg || '';
    fb.className = 'fb-import-feedback' + (isError ? ' is-error' : (msg ? ' is-success' : ''));
  }

  function handleImportText(text) {
    text = (text || '').trim();
    if (!text) {
      importFeedback('Please paste an iReal Pro link (irealb:// or irealbook://) or select an HTML file.', true);
      return;
    }
    if (!window.IReal || typeof window.IReal.parse !== 'function') {
      importFeedback('iReal Pro decoder is not available. Please refresh the page.', true);
      return;
    }
    try {
      var res = window.IReal.parse(text);
      if (!res || !res.songs || !res.songs.length) {
        importFeedback('No iReal Pro songs found in that link or file.', true);
        return;
      }
      var newTunes = res.songs.map(songToTune);
      importedTunes = importedTunes.concat(newTunes);
      saveImports();
      tunes = defaultTunes.concat(importedTunes);
      renderLibrary();
      selectTune(newTunes[0].id, true);
      var msg = newTunes.length === 1 ?
        'Imported "' + newTunes[0].title + '" (' + newTunes[0].bars + ' bars).' :
        'Imported ' + newTunes.length + ' songs' + (res.playlist ? ' from playlist "' + res.playlist + '"' : '') + '.';
      importFeedback(msg, false);
      var inputEl = el('[data-fb-import-input]');
      if (inputEl) inputEl.value = '';
    } catch (err) {
      console.error('[fake-book] import error:', err);
      importFeedback('Failed to import: ' + err.message, true);
    }
  }

  function selectTune(id, reset) {
    var raw = tunes.filter(function (x) { return x.id === id; })[0] || tunes[0];
    if (!raw) return;
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
    el('[data-fb-meta]').textContent = raw.composer + (raw.year ? ' · ' + raw.year : '');
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
    root.querySelectorAll('input[name="fb-melody"], input[name="fb-rhythm"]').forEach(function (i) {
      i.disabled = !!tune.chordsOnly;
    });
    dotsEl.innerHTML = new Array(tune.M + 1).join('<i></i>');

    // View switcher (Lead sheet vs Drum notation)
    root.querySelectorAll('[data-fb-view]').forEach(function (b) {
      var act = b.getAttribute('data-fb-view') === (opts.sheetView || 'lead');
      b.classList.toggle('is-active', act);
      b.setAttribute('aria-pressed', act ? 'true' : 'false');
    });
    var dLeg = el('[data-fb-drum-legend]');
    if (dLeg) dLeg.hidden = (opts.sheetView || 'lead') !== 'drums';

    // Theory engine controls
    populateChordSelect();
    root.querySelectorAll('[data-engine-inst]').forEach(function (b) {
      var act = b.getAttribute('data-engine-inst') === (opts.engineInst || 'piano');
      b.classList.toggle('is-active', act);
      b.setAttribute('aria-selected', act ? 'true' : 'false');
    });
    root.querySelectorAll('input[name="fb-engine-mode"]').forEach(function (r) {
      r.checked = r.value === (opts.engineMode || 'voicings');
    });
    root.querySelectorAll('input[name="fb-triad-inv"]').forEach(function (r) {
      r.checked = Number(r.value) === (Number(opts.triadInv) || 0);
    });
    var tSetEl = el('[data-fb-guitar-triad-set]');
    if (tSetEl) tSetEl.value = opts.triadSet || '123';
    var gFormEl = el('[data-fb-guitar-form-sel]');
    if (gFormEl && opts.guitarForm) gFormEl.value = opts.guitarForm;

    tips();
  }
  function tips() {
    if (tune.chordsOnly) {
      el('[data-fb-melody-tip]').textContent = 'Chords only: this chart has no melody line to transform. Pick a built-in tune to explore melody variations.';
      el('[data-fb-rhythm-tip]').textContent = 'Chords only: the melody line is rests.';
    } else {
      el('[data-fb-melody-tip]').textContent = MELODY[opts.melody].tip;
      el('[data-fb-rhythm-tip]').textContent = RHYTHM[opts.rhythm].tip;
    }
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
      (tune.chordsOnly ? ' · chords only' : (opts.melody !== 'original' || opts.rhythm !== 'written' ? ' · variation: ' + [opts.melody !== 'original' ? MELODY[opts.melody].label : '', opts.rhythm !== 'written' ? RHYTHM[opts.rhythm].label : ''].filter(Boolean).join(' + ') : ''));
    save();
  }
  function respin() { if (P) { stop(); play(); } }

  // ---- chord engine & visualizers (Piano & Guitar)
  var currentVoicingNotes = [];
  var currentGuitarFrets = [];

  function drawPianoVisualizer(notes, meta) {
    var kb = el('[data-fb-keys]');
    if (!kb) return;
    meta = meta || {};
    var lo = 48, hi = 84, whites = [], blacks = [], wW = 20, x = 0;
    for (var m = lo; m < hi; m++) {
      var pc = mod(m, 12);
      var isB = [1, 3, 6, 8, 10].indexOf(pc) >= 0;
      var on = notes.indexOf(m) >= 0;
      var info = meta[m] || (on ? { label: noteName(respell(m)), role: pc === meta.rootPC ? 'root' : 'other' } : null);
      var roleCls = info ? (info.role === 'root' ? ' on-root' : info.role === 'third' ? ' on-third' : info.role === 'fifth' ? ' on-fifth' : info.role === 'seventh' ? ' on-seventh' : ' on') : '';

      if (!isB) {
        var keyHtml = '<rect x="' + x + '" y="0" width="' + wW + '" height="100" rx="3" class="fb-wk' + roleCls + '" data-midi="' + m + '"/>';
        if (info) {
          keyHtml += '<text x="' + (x + wW / 2) + '" y="76" class="fb-key-lbl" data-contrast-guard-skip>' + MN.escape(info.label) + '</text>';
          if (info.finger) keyHtml += '<text x="' + (x + wW / 2) + '" y="92" class="fb-key-finger">' + info.finger + '</text>';
        } else if (pc === 0) {
          keyHtml += '<text x="' + (x + wW / 2) + '" y="92" class="fb-kc">C' + (m / 12 - 1) + '</text>';
        }
        whites.push(keyHtml);
        x += wW;
      } else {
        var bHtml = '<rect x="' + (x - 6.5) + '" y="0" width="13" height="62" rx="2" class="fb-bk' + roleCls + '" data-midi="' + m + '"/>';
        if (info) {
          bHtml += '<text x="' + x + '" y="52" class="fb-key-lbl" data-contrast-guard-skip font-size="7.5">' + MN.escape(info.label) + '</text>';
        }
        blacks.push(bHtml);
      }
    }
    kb.innerHTML = '<svg viewBox="0 0 ' + x + ' 102" role="img" aria-label="Piano keyboard display">' + whites.join('') + blacks.join('') + '</svg>';
    kb.querySelectorAll('[data-midi]').forEach(function (k) {
      k.addEventListener('click', function () {
        var mid = Number(k.getAttribute('data-midi'));
        if (window.PianoAudio) window.PianoAudio.tone(PT ? PT.noteFreq(mid - 48) : 440 * Math.pow(2, (mid - 69) / 12));
      });
    });
  }

  function drawGuitarVisualizer(frets, fingers, degrees, rootPC, scaleMap) {
    var gtr = el('[data-fb-fretboard]');
    if (!gtr) return;
    frets = frets || [null, null, null, null, null, null];
    var nutX = 64, fretCount = 12, fretW = 54;
    var totalW = nutX + fretCount * fretW + 20;
    var totalH = 155;
    var strYs = [130, 109, 88, 67, 46, 25]; // Low E (idx 0) to High e (idx 5)
    var strLabels = ['E', 'A', 'D', 'G', 'B', 'e'];
    var strThickness = [3.2, 2.7, 2.2, 1.8, 1.5, 1.2];
    var out = [];

    // Fretboard body
    out.push('<rect class="fb-gtr-bg" x="' + (nutX - 4) + '" y="10" width="' + (fretCount * fretW + 12) + '" height="135" rx="8" fill="#2c1d11"/>');

    // Inlay dots
    [3, 5, 7, 9].forEach(function (f) {
      var dx = nutX + (f - 0.5) * fretW;
      out.push('<circle class="fb-gtr-dot-inlay" cx="' + dx.toFixed(1) + '" cy="77" r="4.5" fill="#f1e0c6" opacity="0.8"/>');
    });
    var d12 = nutX + (12 - 0.5) * fretW;
    out.push('<circle class="fb-gtr-dot-inlay" cx="' + d12.toFixed(1) + '" cy="54" r="4" fill="#f1e0c6" opacity="0.8"/>');
    out.push('<circle class="fb-gtr-dot-inlay" cx="' + d12.toFixed(1) + '" cy="100" r="4" fill="#f1e0c6" opacity="0.8"/>');

    // Fret wires
    for (var f = 1; f <= fretCount; f++) {
      var fx = nutX + f * fretW;
      out.push('<line class="fb-gtr-fretwire" x1="' + fx + '" y1="12" x2="' + fx + '" y2="142" stroke="#c0c6ce" stroke-width="2"/>');
      out.push('<text x="' + (fx - fretW / 2).toFixed(1) + '" y="8" font-size="9" font-family="JetBrains Mono, monospace" fill="#8a7c66" text-anchor="middle">' + f + '</text>');
    }

    // Nut
    out.push('<line class="fb-gtr-nut" x1="' + nutX + '" y1="10" x2="' + nutX + '" y2="144" stroke="#f4ead5" stroke-width="6"/>');

    // Strings
    strYs.forEach(function (sy, sIdx) {
      out.push('<line class="fb-gtr-string" x1="' + nutX + '" y1="' + sy + '" x2="' + (nutX + fretCount * fretW + 4) + '" y2="' + sy + '" stroke="#d4a757" stroke-width="' + strThickness[sIdx] + '"/>');
      out.push('<text class="fb-gtr-str-tag" x="18" y="' + sy + '">' + strLabels[sIdx] + '</text>');
    });

    if (scaleMap) {
      scaleMap.forEach(function (sn) {
        var sy = strYs[sn.string];
        var sx = nutX + (sn.fret - 0.5) * fretW;
        var isR = sn.isRoot;
        var rCls = isR ? ' is-root' : (sn.degree === '3' || sn.degree === '♭3' ? ' is-third' : (sn.degree === '5' ? ' is-fifth' : (sn.degree === '7' || sn.degree === '♭7' ? ' is-seventh' : '')));
        out.push('<circle class="fb-gtr-note-dot' + rCls + '" cx="' + sx.toFixed(1) + '" cy="' + sy + '" r="9.5" data-s="' + sn.string + '" data-f="' + sn.fret + '"/>');
        out.push('<text class="fb-gtr-lbl" x="' + sx.toFixed(1) + '" y="' + sy + '">' + MN.escape(sn.degree) + '</text>');
      });
    } else {
      frets.forEach(function (fVal, sIdx) {
        var sy = strYs[sIdx];
        var openX = 38;
        if (fVal === 0) {
          var deg = degrees && degrees[sIdx];
          out.push('<circle class="fb-gtr-open-marker" cx="' + openX + '" cy="' + sy + '" r="8" data-s="' + sIdx + '" data-f="0"/>');
          out.push('<text class="fb-gtr-lbl" x="' + openX + '" y="' + sy + '" fill="#0284c7" font-size="8.5">' + (deg ? deg.label : strLabels[sIdx]) + '</text>');
        } else if (fVal === 'x' || fVal === null || fVal === undefined) {
          out.push('<line class="fb-gtr-mute-marker" x1="' + (openX - 4.5) + '" y1="' + (sy - 4.5) + '" x2="' + (openX + 4.5) + '" y2="' + (sy + 4.5) + '"/>');
          out.push('<line class="fb-gtr-mute-marker" x1="' + (openX - 4.5) + '" y1="' + (sy + 4.5) + '" x2="' + (openX + 4.5) + '" y2="' + (sy - 4.5) + '"/>');
        } else if (typeof fVal === 'number' && fVal > 0 && fVal <= fretCount) {
          var nx = nutX + (fVal - 0.5) * fretW;
          var deg = degrees && degrees[sIdx];
          var isR = deg && deg.isRoot;
          var roleCls = isR ? ' is-root' : (deg && (deg.label === '3' || deg.label === '♭3') ? ' is-third' : (deg && deg.label === '5' ? ' is-fifth' : (deg && (deg.label === '7' || deg.label === '♭7') ? ' is-seventh' : '')));
          var fNum = fingers && fingers[sIdx];

          out.push('<circle class="fb-gtr-note-dot' + roleCls + '" cx="' + nx.toFixed(1) + '" cy="' + sy + '" r="10" data-s="' + sIdx + '" data-f="' + fVal + '"/>');
          out.push('<text class="fb-gtr-lbl" x="' + nx.toFixed(1) + '" y="' + sy + '">' + (deg ? deg.label : fVal) + '</text>');
          if (fNum && typeof fNum === 'number') {
            out.push('<text class="fb-gtr-finger" x="' + (nx + 7).toFixed(1) + '" y="' + (sy - 7) + '">' + fNum + '</text>');
          }
        }
      });
    }

    gtr.innerHTML = '<svg viewBox="0 0 ' + totalW + ' ' + totalH + '" role="img" aria-label="Guitar fretboard display">' + out.join('') + '</svg>';
    gtr.querySelectorAll('[data-s]').forEach(function (dot) {
      dot.addEventListener('click', function () {
        var s = Number(dot.getAttribute('data-s')), f = Number(dot.getAttribute('data-f'));
        if (window.GuitarAudio && GT) window.GuitarAudio.pluck(GT.noteFreq(s, f));
      });
    });
  }

  function getGuitarTriad(rootPC, quality, targetStrings, targetInv) {
    if (!TA) return null;
    var all = [];
    [0, 2, 4, 6, 8, 10].forEach(function (f) {
      var cands = TA.candidates({ root: rootPC, quality: quality }, 'guitar', { rootOnly: false, fret: f });
      (cands || []).forEach(function (c) {
        var sKey = c.notes.map(function (n) { return 6 - n.s; }).sort().join('');
        all.push({ cand: c, sKey: sKey, inv: c.inversion });
      });
    });
    var match = all.find(function (item) {
      return (targetStrings ? item.sKey === targetStrings : true) && item.inv === targetInv;
    });
    if (!match && targetStrings) match = all.find(function (item) { return item.sKey === targetStrings; });
    if (!match) match = all.find(function (item) { return item.inv === targetInv; });
    if (!match) match = all[0];
    return match ? match.cand : null;
  }

  function populateChordSelect() {
    var sel = el('[data-fb-chord-select]');
    if (!sel || !view) return;
    var chords = view.concertChords || [];
    var html = chords.map(function (c, i) {
      var name = chordName(opts.instr === 'concert' || opts.instr === 'bass' ? c : view.writtenChords[i]);
      return '<option value="' + i + '">Bar ' + c.bar + ': ' + name + '</option>';
    });
    sel.innerHTML = html.join('');
    sel.value = String(chordSel);
  }

  function populateScaleChips(rootPC, chordQ) {
    var cont = el('[data-fb-scales-list]');
    if (!cont) return;
    var scales = [
      { key: 'ionian', label: 'Major (Ionian)' },
      { key: 'dorian', label: 'Dorian' },
      { key: 'mixolydian', label: 'Mixolydian' },
      { key: 'aeolian', label: 'Minor (Aeolian)' },
      { key: 'majorPent', label: 'Major Pentatonic' },
      { key: 'minorPent', label: 'Minor Pentatonic' },
      { key: 'blues', label: 'Blues' }
    ];
    cont.innerHTML = scales.map(function (s) {
      var chk = s.key === (opts.scaleType || 'ionian') ? ' checked' : '';
      return '<label class="fb-chip"><input type="radio" name="fb-scale-type" value="' + s.key + '"' + chk + ' /><span>' + MN.escape(s.label) + '</span></label>';
    }).join('');
  }

  function showChord(sound) {
    if (!view || !view.concertChords.length) return;
    chordSel = Math.max(0, Math.min(view.concertChords.length - 1, chordSel));
    var c = view.concertChords[chordSel], w = view.writtenChords[chordSel];
    var rootPC = mod(NAT[c.root.l] + c.root.a, 12);
    var notes = view.voicings[chordSel] || rootPosition(c);
    var d = describeVoicing(c, notes);

    currentVoicingNotes = notes;

    populateChordSelect();

    el('[data-fb-chordname]').textContent = chordName(opts.instr === 'concert' || opts.instr === 'bass' ? c : w);
    el('[data-fb-chordinfo]').textContent = (opts.instr === 'concert' || opts.instr === 'bass' ? '' : 'Sounds as ' + chordName(c) + ' (concert). ') +
      Q[c.q].name.charAt(0).toUpperCase() + Q[c.q].name.slice(1) + ' · bar ' + c.bar + ' · ' + d.bottom + ' on the bottom';
    el('[data-fb-chordnotes]').textContent = (opts.engineInst === 'piano' ? 'Piano plays: ' : 'Guitar plays: ') + d.spelled.join('  ') + (opts.instr === 'concert' || opts.instr === 'bass' ? '' : ' (concert)');
    el('[data-fb-voicing-tip]').textContent = VOICING[opts.voicing] ? VOICING[opts.voicing].tip : '';

    var isPiano = (opts.engineInst || 'piano') === 'piano';
    var kWrap = el('[data-fb-keys]');
    var gWrap = el('[data-fb-fretboard]');
    if (kWrap) kWrap.hidden = !isPiano;
    if (gWrap) gWrap.hidden = isPiano;

    root.querySelectorAll('[data-engine-inst]').forEach(function (b) {
      var act = b.getAttribute('data-engine-inst') === opts.engineInst;
      b.classList.toggle('is-active', act);
      b.setAttribute('aria-selected', act ? 'true' : 'false');
    });

    var mode = opts.engineMode || 'voicings';
    root.querySelectorAll('[data-engine-sub]').forEach(function (sc) {
      sc.hidden = sc.getAttribute('data-engine-sub') !== mode;
    });
    root.querySelectorAll('input[name="fb-engine-mode"]').forEach(function (r) {
      r.checked = r.value === mode;
    });

    var cType = (GT && GT.CHORD_TYPES.find(function (ct) { return ct.suffix === (c.q || ''); })) || { suffix: c.q || '', name: 'Chord', intervals: [0, 4, 7] };

    if (mode === 'voicings') {
      if (isPiano) {
        var formsWrap = el('[data-fb-guitar-forms]');
        if (formsWrap) formsWrap.hidden = true;
        var vWrap = el('[data-fb-voicing]');
        if (vWrap) vWrap.hidden = false;
        var meta = { rootPC: rootPC };
        notes.forEach(function (m) {
          var iv = mod(m - rootPC, 12);
          var lbl = PT ? PT.intervalLabel(iv, true) : (iv === 0 ? 'R' : String(iv));
          var role = iv === 0 ? 'root' : (iv === 4 || iv === 3) ? 'third' : iv === 7 ? 'fifth' : (iv === 10 || iv === 11) ? 'seventh' : 'other';
          meta[m] = { label: lbl, role: role, finger: (PT && PT.typicalFingering(rootPC, cType, 0, 'rh')[notes.indexOf(m)]) || '' };
        });
        drawPianoVisualizer(notes, meta);
      } else {
        var formsWrap = el('[data-fb-guitar-forms]');
        var formSelEl = el('[data-fb-guitar-form-sel]');
        if (formsWrap) formsWrap.hidden = false;
        var vWrap = el('[data-fb-voicing]');
        if (vWrap) vWrap.hidden = true;
        var forms = GT ? GT.availableForms(rootPC, cType) : ['open'];
        if (formSelEl) {
          formSelEl.innerHTML = forms.map(function (fm) {
            return '<option value="' + fm + '">' + fm.toUpperCase() + ' form</option>';
          }).join('');
          if (forms.indexOf(opts.guitarForm) >= 0) formSelEl.value = opts.guitarForm;
          else { formSelEl.value = forms[0]; opts.guitarForm = forms[0]; }
        }
        var activeForm = formSelEl ? formSelEl.value : 'open';
        var shape = GT ? GT.getChordShape(rootPC, cType, 0, activeForm) : { frets: ['x', 3, 2, 0, 1, 0] };
        var frets = shape.frets;
        currentGuitarFrets = frets;
        var fingers = GT ? GT.computeFingering(frets) : null;
        var degrees = GT ? GT.computeDegrees(rootPC, cType, frets) : null;
        drawGuitarVisualizer(frets, fingers, degrees, rootPC);
      }
    } else if (mode === 'triads') {
      var triadQ = (c.q === 'm' || c.q === 'm7' || c.q === 'm6') ? 'minor' : (c.q === 'dim' || c.q === 'dim7' || c.q === 'm7b5') ? 'diminished' : (c.q === 'aug') ? 'augmented' : 'major';
      var inv = Number(opts.triadInv) || 0;
      var triadDesc = el('[data-fb-triad-desc]');
      if (triadDesc) {
        triadDesc.textContent = LETTERS[c.root.l] + ACC[c.root.a] + ' ' + triadQ + ' triad · ' + (inv === 0 ? 'Root position (1-3-5)' : inv === 1 ? '1st inversion (3-5-1)' : '2nd inversion (5-1-3)');
      }
      var tSetsWrap = el('[data-fb-guitar-triad-sets]');
      if (tSetsWrap) tSetsWrap.hidden = isPiano;

      var triadIvs = triadQ === 'minor' ? [0, 3, 7] : triadQ === 'diminished' ? [0, 3, 6] : triadQ === 'augmented' ? [0, 4, 8] : [0, 4, 7];
      if (isPiano) {
        var triadMid = triadIvs.map(function (v) { return 60 + rootPC + v; });
        var rotated = rotate(triadMid, inv);
        currentVoicingNotes = rotated;
        var tMeta = { rootPC: rootPC };
        rotated.forEach(function (m) {
          var iv = mod(m - rootPC, 12);
          tMeta[m] = {
            label: iv === 0 ? 'R' : (iv === 3 || iv === 4 ? '3' : '5'),
            role: iv === 0 ? 'root' : (iv === 3 || iv === 4 ? 'third' : 'fifth'),
            finger: inv === 0 ? '1' : inv === 1 ? '2' : '3'
          };
        });
        drawPianoVisualizer(rotated, tMeta);
      } else {
        var tSet = opts.triadSet || '123';
        var tMatch = getGuitarTriad(rootPC, triadQ, tSet, inv);
        var gFrets = [null, null, null, null, null, null];
        var gFingers = [null, null, null, null, null, null];
        var gDegs = [null, null, null, null, null, null];
        if (tMatch) {
          tMatch.notes.forEach(function (n) {
            gFrets[n.s] = n.f;
            var iv = mod(n.midi - rootPC, 12);
            gDegs[n.s] = { label: iv === 0 ? 'R' : (iv === 3 || iv === 4 ? '3' : '5'), isRoot: iv === 0 };
          });
        }
        currentGuitarFrets = gFrets;
        drawGuitarVisualizer(gFrets, gFingers, gDegs, rootPC);
      }
    } else if (mode === 'scales') {
      populateScaleChips(rootPC, c.q);
      var scaleKey = opts.scaleType || 'ionian';
      var stDef = (GT && GT.SCALE_TYPES.find(function (x) { return x.key === scaleKey; })) || (PT && PT.SCALE_TYPES.find(function (x) { return x.key === scaleKey; })) || { intervals: [0, 2, 4, 5, 7, 9, 11], degrees: ['1', '2', '3', '4', '5', '6', '7'], desc: 'Major scale' };
      var scaleSumm = el('[data-fb-scale-summary]');
      if (scaleSumm) scaleSumm.textContent = (stDef.name || scaleKey) + ' on ' + LETTERS[c.root.l] + ACC[c.root.a] + ': ' + (stDef.desc || '');

      if (isPiano) {
        var scaleNotes = [];
        var sMeta = { rootPC: rootPC };
        for (var oct = 48; oct < 84; oct += 12) {
          stDef.intervals.forEach(function (iv, idx) {
            var m = oct + rootPC + iv;
            if (m < 84) {
              scaleNotes.push(m);
              sMeta[m] = {
                label: (stDef.degrees && stDef.degrees[idx]) || String(idx + 1),
                role: iv === 0 ? 'root' : (iv === 4 || iv === 3) ? 'third' : iv === 7 ? 'fifth' : (iv === 10 || iv === 11) ? 'seventh' : 'other'
              };
            }
          });
        }
        currentVoicingNotes = scaleNotes;
        drawPianoVisualizer(scaleNotes, sMeta);
      } else {
        var scaleMap = [];
        var gTuning = [40, 45, 50, 55, 59, 64];
        gTuning.forEach(function (openMidi, sIdx) {
          for (var f = 0; f <= 12; f++) {
            var m = openMidi + f;
            var iv = mod(m - rootPC, 12);
            var matchIdx = stDef.intervals.indexOf(iv);
            if (matchIdx >= 0) {
              scaleMap.push({
                string: sIdx,
                fret: f,
                isRoot: iv === 0,
                degree: (stDef.degrees && stDef.degrees[matchIdx]) || String(matchIdx + 1)
              });
            }
          }
        });
        drawGuitarVisualizer(null, null, null, rootPC, scaleMap);
      }
    }

    sheetEl.querySelectorAll('.fb-chord').forEach(function (t) {
      t.classList.toggle('is-sel', Number(t.getAttribute('data-ci')) === chordSel);
    });

    if (sound) playActiveChord();
  }

  function playActiveChord() {
    if (!view || !view.concertChords.length) return;
    var c = view.concertChords[chordSel];
    var rootPC = mod(NAT[c.root.l] + c.root.a, 12);
    var cType = (GT && GT.CHORD_TYPES.find(function (ct) { return ct.suffix === (c.q || ''); })) || { suffix: c.q || '', name: 'Chord', intervals: [0, 4, 7] };
    var notes = currentVoicingNotes.length ? currentVoicingNotes : (view.voicings[chordSel] || rootPosition(c));

    if (opts.engineInst === 'guitar' && GT) {
      if (opts.engineMode === 'triads') {
        var triadQ = (c.q === 'm' || c.q === 'm7' || c.q === 'm6') ? 'minor' : (c.q === 'dim' || c.q === 'dim7' || c.q === 'm7b5') ? 'diminished' : (c.q === 'aug') ? 'augmented' : 'major';
        var tMatch = getGuitarTriad(rootPC, triadQ, opts.triadSet || '123', Number(opts.triadInv) || 0);
        if (tMatch && window.GuitarAudio) {
          var freqs = tMatch.notes.map(function (n) { return GT.noteFreq(n.s, n.f); });
          window.GuitarAudio.strum(freqs);
          return;
        }
      }
      var formSel = el('[data-fb-guitar-form-sel]') ? el('[data-fb-guitar-form-sel]').value : 'open';
      var shape = GT.getChordShape(rootPC, cType, 0, formSel);
      if (shape && window.GuitarAudio) {
        var freqs = shape.frets.map(function (f, s) { return (typeof f === 'number') ? GT.noteFreq(s, f) : null; }).filter(Boolean);
        window.GuitarAudio.strum(freqs);
        return;
      }
    }

    if (window.PianoAudio) {
      var freqs = notes.slice(0, 5).map(function (m) { return 440 * Math.pow(2, (m - 69) / 12); });
      window.PianoAudio.block(freqs);
    } else if (ensureAudio()) {
      notes.forEach(function (m, i) { voicePiano(bus.piano, ctx.currentTime + 0.02 + i * 0.03, 1.4, m, 0.3); });
    }
  }

  function playActiveArpeggio() {
    if (!view || !view.concertChords.length) return;
    var c = view.concertChords[chordSel];
    var rootPC = mod(NAT[c.root.l] + c.root.a, 12);
    var cType = (GT && GT.CHORD_TYPES.find(function (ct) { return ct.suffix === (c.q || ''); })) || { suffix: c.q || '', name: 'Chord', intervals: [0, 4, 7] };
    var notes = currentVoicingNotes.length ? currentVoicingNotes : (view.voicings[chordSel] || rootPosition(c));

    if (opts.engineMode === 'scales') {
      var stKey = opts.scaleType || 'ionian';
      var st = (GT && GT.SCALE_TYPES.find(function (x) { return x.key === stKey; })) || (PT && PT.SCALE_TYPES.find(function (x) { return x.key === stKey; })) || { intervals: [0, 2, 4, 5, 7, 9, 11] };
      var baseMidi = 60 + rootPC;
      var scaleFreqs = st.intervals.map(function (iv) { return 440 * Math.pow(2, (baseMidi + iv - 69) / 12); });
      scaleFreqs.push(440 * Math.pow(2, (baseMidi + 12 - 69) / 12));
      var fullRun = scaleFreqs.concat(scaleFreqs.slice(0, -1).reverse());
      if (opts.engineInst === 'guitar' && window.GuitarAudio) {
        window.GuitarAudio.sequence(fullRun, { interval: 0.18 });
      } else if (window.PianoAudio) {
        window.PianoAudio.broken(fullRun, { interval: 0.18 });
      }
      return;
    }

    if (opts.engineInst === 'guitar' && GT) {
      if (opts.engineMode === 'triads') {
        var triadQ = (c.q === 'm' || c.q === 'm7' || c.q === 'm6') ? 'minor' : (c.q === 'dim' || c.q === 'dim7' || c.q === 'm7b5') ? 'diminished' : (c.q === 'aug') ? 'augmented' : 'major';
        var tMatch = getGuitarTriad(rootPC, triadQ, opts.triadSet || '123', Number(opts.triadInv) || 0);
        if (tMatch && window.GuitarAudio) {
          var freqs = tMatch.notes.map(function (n) { return GT.noteFreq(n.s, n.f); });
          window.GuitarAudio.sequence(freqs.concat(freqs.slice(0, -1).reverse()), { interval: 0.22 });
          return;
        }
      }
      var formSel = el('[data-fb-guitar-form-sel]') ? el('[data-fb-guitar-form-sel]').value : 'open';
      var shape = GT.getChordShape(rootPC, cType, 0, formSel);
      if (shape && window.GuitarAudio) {
        var freqs = shape.frets.map(function (f, s) { return (typeof f === 'number') ? GT.noteFreq(s, f) : null; }).filter(Boolean);
        window.GuitarAudio.sequence(freqs.concat(freqs.slice(0, -1).reverse()), { interval: 0.22 });
        return;
      }
    }

    var freqs = notes.map(function (m) { return 440 * Math.pow(2, (m - 69) / 12); });
    var run = freqs.concat(freqs.slice(0, -1).reverse());
    if (window.PianoAudio) {
      window.PianoAudio.broken(run, { interval: 0.2 });
    } else if (ensureAudio()) {
      run.forEach(function (f, i) {
        var m = Math.round(69 + 12 * Math.log2(f / 440));
        voicePiano(bus.piano, ctx.currentTime + 0.05 + i * 0.2, 0.45, m, 0.3);
      });
    }
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
      else if (n === 'fb-engine-mode') { opts.engineMode = t.value; showChord(false); save(); }
      else if (n === 'fb-triad-inv') { opts.triadInv = Number(t.value); showChord(false); save(); }
      else if (n === 'fb-scale-type') { opts.scaleType = t.value; showChord(false); save(); }
      else if (t.matches('[data-fb-chord-select]')) { chordSel = Number(t.value); showChord(true); }
      else if (t.matches('[data-fb-guitar-form-sel]')) { opts.guitarForm = t.value; showChord(false); save(); }
      else if (t.matches('[data-fb-guitar-triad-set]')) { opts.triadSet = t.value; showChord(false); save(); }
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
      var rem = t.closest('[data-remove-tune]');
      if (rem) {
        ev.stopPropagation();
        removeImported(rem.getAttribute('data-remove-tune'));
        return;
      }
      var vBtn = t.closest('[data-fb-view]');
      if (vBtn) {
        opts.sheetView = vBtn.getAttribute('data-fb-view');
        syncControls();
        renderSheet();
        save();
        return;
      }
      var instBtn = t.closest('[data-engine-inst]');
      if (instBtn) {
        opts.engineInst = instBtn.getAttribute('data-engine-inst');
        syncControls();
        showChord(false);
        save();
        return;
      }
      var tn = t.closest('[data-tune]');
      if (tn && !t.closest('[data-remove-tune]')) {
        selectTune(tn.getAttribute('data-tune'), true);
        return;
      }
      if (t.closest('[data-fb-import-btn]')) {
        var inp = el('[data-fb-import-input]');
        handleImportText(inp ? inp.value : '');
        return;
      }
      if (t.closest('[data-fb-play]')) { if (P) stop(); else play(); return; }
      if (t.closest('[data-fb-chordplay]')) { playActiveChord(); return; }
      if (t.closest('[data-fb-arpplay]')) { playActiveArpeggio(); return; }
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
    var importInp = el('[data-fb-import-input]');
    if (importInp) {
      importInp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleImportText(importInp.value);
        }
      });
    }
    var fileInp = el('[data-fb-import-file]');
    if (fileInp) {
      fileInp.addEventListener('change', function () {
        var file = fileInp.files && fileInp.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          handleImportText(e.target.result);
          fileInp.value = '';
        };
        reader.onerror = function () {
          importFeedback('Could not read the selected file.', true);
          fileInp.value = '';
        };
        reader.readAsText(file);
      });
    }
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
    defaultTunes = data.tunes;
    importedTunes = loadImports();
    tunes = defaultTunes.concat(importedTunes);
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
    songToTune: songToTune, importText: handleImportText, removeImport: removeImported,
    state: function () { return { opts: opts, tune: tune, view: view, playing: !!P }; }
  };
})();
