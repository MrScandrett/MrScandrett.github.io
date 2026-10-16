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
  // One colour per letter name (the classroom boomwhacker set), light enough for dark text.
  var NAME_COLORS = ['#e0244f', '#f5951c', '#f2b81c', '#7fbf2e', '#14a396', '#4b45a8', '#8e3fa8'];
  // Letter ink per head: whichever of white/near-black reads best on the fill (WCAG >= 4.5 where possible), and a darker
  // shade of the colour for the hollow half/whole heads that sit on cream paper.
  var NAME_INK = ['#ffffff', '#1b140d', '#1b140d', '#1b140d', '#1b140d', '#ffffff', '#ffffff'], NAME_INK_HOLLOW = ['#d2214a', '#9c5f11', '#89680f', '#50781c', '#0f7b72', '#4b45a8', '#8e3fa8'];
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
    // range = written MIDI limits the melody is kept inside whatever the key (sax: B♭3 to F6, as in fake-book-sax.js).
    bb: { label: 'B♭ instruments', who: 'trumpet, clarinet, tenor & soprano sax', letters: 1, semis: 2, clef: 'treble', center: 71, sound: 67, range: [58, 89] },
    eb: { label: 'E♭ instruments', who: 'alto & baritone sax', letters: 5, semis: 9, clef: 'treble', center: 71, sound: 67, range: [58, 89] },
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
    'sus2': { iv: [0, 2, 7], lo: [0, 1, 4], sym: 'sus2', name: 'suspended second' },
    '7sus4': { iv: [0, 5, 7, 10], lo: [0, 3, 4, 6], sym: '7sus4', name: 'dominant seventh suspended fourth' },
    'mmaj7': { iv: [0, 3, 7, 11], lo: [0, 2, 4, 6], sym: 'm(maj7)', name: 'minor-major seventh' },
    '9': { iv: [0, 4, 7, 10, 14], lo: [0, 2, 4, 6, 8], sym: '9', name: 'dominant ninth' }
  };
  // The triad a chord is built on, for the triad practice views. Sus chords have no 3rd: they keep their 2nd or 4th.
  var TRIADS = { major: [0, 4, 7], minor: [0, 3, 7], diminished: [0, 3, 6], augmented: [0, 4, 8], sus2: [0, 2, 7], sus4: [0, 5, 7] };
  function triadQuality(iv) {
    var has = function (x) { return iv.indexOf(x) >= 0; };
    if (has(3)) return has(6) ? 'diminished' : 'minor';
    if (has(4)) return has(8) && !has(7) ? 'augmented' : 'major';
    return has(2) ? 'sus2' : has(5) ? 'sus4' : 'major';
  }
  function triadDegree(iv) { return iv === 0 ? 'R' : iv === 2 ? '2' : iv === 5 ? '4' : (iv === 3 || iv === 4) ? '3' : '5'; }
  function triadSteps(quality) { return quality === 'sus2' ? '1-2-5' : quality === 'sus4' ? '1-4-5' : '1-3-5'; }
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
  // The sheet's Realbook chord font has no lowercase, so "Gm7" would print as "GM7", a major chord.
  // On the sheet, minor is written Real Book style: G-7, A-(maj7). Everywhere else keeps a lowercase m.
  function realbookChord(name) { return name.replace(/^([A-G][#b♯♭]?)(?:min|mi|m)(?!aj)/, '$1-'); }
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
    if (/sus2/i.test(q)) return 'sus2';
    if (/sus/i.test(q)) return /^(?:7|9|11|13)/.test(q) ? '7sus4' : 'sus4';     // 7sus, 9sus, 13sus, 7b9sus keep the ♭7
    if (/^-(?:6|69)|^m6/i.test(q)) return 'm6';
    if (/^(?:-|m(?:in)?)\(?(?:\^|maj|M[79])/.test(q)) return 'mmaj7';           // m(maj7), mM7, iReal -^7
    // Before the minor test: "maj7" also starts with an m. Capital M7 is major, m7 is minor.
    if (/^\^|^maj/i.test(q) || /^M(?:7|9|13)/.test(q)) return 'maj7';
    // Minor: only a 7th or an extension that implies one (9, 11, 13) adds the ♭7; madd9, m♭6, m(♯5) stay triads.
    if (/^(?:-|m)/.test(q)) return /^(?:-|m(?:in)?)\(?(?:7|9|11|13)/.test(q) ? 'm7' : 'm';
    if (/^6/i.test(q)) return '6';
    if (/^9/i.test(q)) return '9';
    if (/^7|^11|^13|^alt/i.test(q)) return '7';
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
      var want = raw.score ? raw.score.bars[gi].len : (gi === 0 && t.pickup ? t.pickup : t.M);
      if (!near(time - barStart, want)) console.warn('[fake-book] ' + raw.id + ' bar ' + (t.pickup ? gi : gi + 1) + ' has ' + (time - barStart) + ' beats');
    });
    t.events = events;
    t.scoreBars = raw.score && raw.score.bars;
    t.bars = t.scoreBars ? raw.bars : Math.round(time / t.M);
    t.len = t.scoreBars ? time : t.bars * t.M;

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
      var sb = t.scoreBars && t.scoreBars.filter(function (b) { return b.bar === bi + 1; })[0];
      var pos = sb ? sb.start : bi * t.M, share = free ? ((sb ? sb.len : t.M) - fixed) / free : 0;
      parsed.forEach(function (c) {
        var d = c.beats || share;
        chords.push({ start: pos, dur: d, root: c.root, q: c.q, display: c.display, bass: c.bass, bar: bi + 1 });
        pos += d;
      });
    });
    t.chords = chords;

    // Extra staves from an imported score: a bass-clef staff and tablature ({s, d, n: 'C3 E3', f: [[string, fret]]}).
    t.staves = {};
    var ACC_OF = { '': 0, '#': 1, '##': 2, 'b': -1, 'bb': -2 };
    var notesOf = function (str) {
      return String(str || '').split(/\s+/).filter(Boolean).map(function (tok) {
        var m = /^([A-G])(##|bb|#|b)?(\d)$/.exec(tok);
        if (!m) throw new Error(raw.id + ': bad staff note "' + tok + '"');
        return pitch(Number(m[3]) * 7 + LETTERS.indexOf(m[1]), ACC_OF[m[2] || '']);
      });
    };
    var st = raw.staves || {};
    // Saved staves keep times to 4 decimals (0.3333), which no longer reads as a triplet: snap to the 1/24-beat grid
    // (sixteenths, thirty-seconds and every triplet value) when the stored time is within rounding error of it.
    var snap = function (x) { var r = Math.round(x * 24) / 24; return Math.abs(r - x) < 0.0006 ? r : x; };
    if (st.bass && st.bass.events && st.bass.events.length) {
      t.staves.bass = { label: st.bass.label || '', events: st.bass.events.map(function (e) { return { start: snap(e.s), dur: snap(e.d), ps: notesOf(e.n) }; }) };
    }
    if (st.voice2 && st.voice2.events && st.voice2.events.length) {
      t.staves.voice2 = { events: st.voice2.events.map(function (e) { return { start: snap(e.s), dur: snap(e.d), ps: notesOf(e.n) }; }) };
    }
    if (st.tab && st.tab.events && st.tab.events.length) {
      t.staves.tab = {
        label: st.tab.label || '', lines: st.tab.lines || 6, tuning: st.tab.tuning, capo: st.tab.capo || 0,
        events: st.tab.events.map(function (e) { return { start: snap(e.s), dur: snap(e.d), f: (e.f || []).filter(function (sf) { return sf[0] >= 1 && sf[0] <= (st.tab.lines || 6); }) }; })
      };
    }
    // Every note of a guitar part that came without tab (the fake book works the tab out).
    if (st.gtr && st.gtr.events && st.gtr.events.length) {
      t.staves.gtr = { written: st.gtr.written || 0, events: st.gtr.events.map(function (e) { return { start: e.s, dur: e.d, ps: notesOf(e.n) }; }) };
    }
    // Key changes worked out from the notes; labelled on the sheet in whatever key it's shown in.
    t.baseSections = raw.sectionsByBar || {};
    t.keyChanges = (raw.keyChanges || []).map(function (k) { return { bar: k.bar, key: parseKey(k.key, k.minor) }; });
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
    smooth: { label: 'Smooth progression', term: 'voice leading', tip: 'Chooses inversions across the whole progression to reduce movement between voices in a middle keyboard register.' },
    common: { label: 'Hold common tones', term: 'voice leading', tip: 'Favors keeping shared notes in the same octave, then minimizes movement. Suggested piano voicings; slash-chord bass is played separately.' },
    shellSmooth: { label: 'Smooth shells', term: 'shell voicing', tip: 'Connects root, 3rd and the upper color tone (usually the 7th) with small steps. Triads keep all three tones.' },
    open: { label: 'Open / drop 2', tip: 'Lowers the second-highest tone an octave, then connects these wider piano voicings with small steps. Check the stretch before playing.' },
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
  // Compare voices from low to high; added/removed voices cost six semitones.
  // Unlike index-only matching, this handles triads becoming seventh chords.
  function voiceMotion(a, b, holdCommon) {
    var costs = Array.from({ length: a.length + 1 }, function () { return []; });
    for (var i = 0; i <= a.length; i++) costs[i][0] = i * 6;
    for (var j = 0; j <= b.length; j++) costs[0][j] = j * 6;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) {
      var step = Math.abs(a[i - 1] - b[j - 1]);
      costs[i][j] = Math.min(costs[i - 1][j] + 6, costs[i][j - 1] + 6,
        costs[i - 1][j - 1] + step + (step > 7 ? (step - 7) * .5 : 0));
    }
    var cost = costs[a.length][b.length];
    if (holdCommon) {
      a.forEach(function (note) {
        if (b.some(function (next) { return mod(next, 12) === mod(note, 12); }) && b.indexOf(note) < 0) cost += 5;
      });
    }
    return cost;
  }
  function voiceCandidates(c, mode) {
    var rp = rootPosition(c), iv = Q[c.q].iv;
    if (mode === 'shellSmooth') rp = [rp[0], rp[0] + iv[1], rp[0] + (iv.length >= 4 ? iv[3] : iv[2])];
    var candidates = [], seen = {};
    for (var k = 0; k < rp.length; k++) for (var o = -24; o <= 24; o += 12) {
      var notes = rotate(rp, k).map(function (x) { return x + o; }).sort(function (a, b) { return a - b; });
      if (mode === 'open' && notes.length >= 3) {
        notes[notes.length - 2] -= 12;
        notes.sort(function (a, b) { return a - b; });
      }
      if (notes[0] < 48 || notes[notes.length - 1] > 84) continue;
      var key = notes.join(',');
      if (seen[key]) continue;
      seen[key] = true;
      var mean = notes.reduce(function (a, b) { return a + b; }, 0) / notes.length;
      candidates.push({ notes: notes, register: Math.abs(mean - 62) * .12 });
    }
    return candidates.length ? candidates : [{ notes: recenter(rp, 62), register: 0 }];
  }
  function voiceChords(chords, mode) {
    if (!chords.length) return [];
    if (['smooth', 'common', 'shellSmooth', 'open'].indexOf(mode) >= 0) {
      // Dynamic programming: choose a connected path through all chord candidates,
      // rather than a locally good inversion that forces a large leap next time.
      var layers = chords.map(function (c) { return voiceCandidates(c, mode); });
      layers.forEach(function (layer, index) {
        layer.forEach(function (candidate) {
          candidate.cost = index ? Infinity : candidate.register;
          candidate.previous = -1;
          if (!index) return;
          layers[index - 1].forEach(function (prev, pi) {
            var cost = prev.cost + voiceMotion(prev.notes, candidate.notes, mode === 'common') + candidate.register;
            if (cost < candidate.cost) { candidate.cost = cost; candidate.previous = pi; }
          });
        });
      });
      var last = layers[layers.length - 1], best = 0;
      last.forEach(function (candidate, i) { if (candidate.cost < last[best].cost) best = i; });
      var result = [];
      for (var i = layers.length - 1; i >= 0; i--) {
        result[i] = layers[i][best].notes;
        best = layers[i][best].previous;
      }
      return result;
    }
    return chords.map(function (c) {
      var rp = rootPosition(c);
      if (mode === 'shell') {
        var iv = Q[c.q].iv, top = iv.length >= 4 ? iv[3] : iv[2];
        return [rp[0], rp[0] + iv[1], rp[0] + top];
      }
      var kk = (VOICING[mode] && VOICING[mode].k) || 0;
      return recenter(rotate(rp, kk % rp.length), 61);
    });
  }
  // Named by interval, not position: a sus chord's second tone is a 2nd or 4th, not a 3rd; dim7's 9 semitones is its 7th.
  var BOTTOM_NAMES = { 0: 'root', 2: '2nd', 3: '3rd', 4: '3rd', 5: '4th', 6: '5th', 7: '5th', 8: '5th', 9: '6th', 10: '7th', 11: '7th', 14: '9th' };
  function describeVoicing(c, notes) {
    var tones = chordTones(c), low = mod(notes[0], 12);
    var idx = tones.findIndex(function (t) { return t.pc === low; }), iv = Q[c.q].iv[idx];
    var name = iv === 9 && c.q === 'dim7' ? '7th' : BOTTOM_NAMES[iv] || '';
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
    tune: 'twinkle', key: null, instr: 'concert', octave: 0, names: false, nameStyle: 'notes', zoom: 1,
    melody: 'original', rhythm: 'written', voicing: 'smooth',
    style: null, feel: null, tempo: null, mode: 'all', click: 'all', loop: true,
    lead: 'reed', from: 1, to: 0,
    vol: { melody: 80, piano: 55, bass: 75, drums: 65, click: 60 },
    sheetView: 'lead', beatCounts: 'off',
    showBass: true, bassFor: 'concert', showTab: null, tabPos: 'auto', bassLine: 'score', showPos: false, measureShapes: false, saxFingers: false, showAnalysis: false, posInst: 'guitar',
    engineInst: 'piano',
    engineMode: 'voicings',
    guitarForm: 'open', guitarVoice: 'manual',
    triadInv: 0,
    triadSet: '123',
    lowBass: true,
    shapeSize: 'medium',
    scaleType: 'ionian',
    showShapes: true,
    follow: true,
    barClick: 'shapes'
  };
  var opts = load();
  if (opts.beatCounts === true) opts.beatCounts = 'all';
  else if (!/^(quarter|eighth|all|written)$/.test(opts.beatCounts)) opts.beatCounts = 'off';
  var defaultTunes = [], importedTunes = [];
  var tunes = [], tune = null, view = null, chordSel = 0;

  // Imports live in IndexedDB: full scores carry their MusicXML, and localStorage's ~5 MB (shared by the
  // whole site) filled after about 20 scores. The old localStorage list moves over on first load.
  // localStorage stays as the fallback where IndexedDB can't open.
  var importsInLocalStorage = false, importSaves = Promise.resolve(true);
  function importStore(json) {             // json given: write it; otherwise read the saved JSON
    return new Promise(function (ok, fail) {
      if (!window.indexedDB) { fail(new Error('IndexedDB is unavailable')); return; }
      var open = indexedDB.open('fakebook-imports', 1);
      open.onupgradeneeded = function () { open.result.createObjectStore('imports'); };
      open.onerror = function () { fail(open.error); };
      open.onsuccess = function () {
        var db = open.result, value;
        try {
          var tx = db.transaction('imports', json ? 'readwrite' : 'readonly');
          var req = json ? tx.objectStore('imports').put(json, 'tunes') : tx.objectStore('imports').get('tunes');
          req.onsuccess = function () { value = req.result; };
          tx.oncomplete = function () { db.close(); ok(value); };
          tx.onerror = tx.onabort = function () { db.close(); fail(tx.error || req.error); };
        } catch (e) { db.close(); fail(e); }   // otherwise this save, and every one queued after it, never settles
      };
    });
  }
  function parseImportList(json) {
    try { var list = JSON.parse(json || '[]'); return Array.isArray(list) ? list : []; } catch (e) { return []; }
  }
  function loadImports() {
    var legacy = [];
    try { legacy = parseImportList(localStorage.getItem(IMPORT_STORE)); } catch (e) { /* storage unavailable */ }
    return importStore().then(function (json) {
      var list = parseImportList(json), have = {};
      list.forEach(function (t) { have[t.id] = true; });
      var moved = legacy.filter(function (t) { return t && !have[t.id]; });
      var forget = function () { try { localStorage.removeItem(IMPORT_STORE); } catch (e) { /* ignore */ } return list; };
      if (!moved.length) return forget();
      list = list.concat(moved);
      return importStore(JSON.stringify(list)).then(forget, function () { return list; });
    }).catch(function () {
      importsInLocalStorage = true;
      return legacy;
    });
  }
  // Resolves true once saved, false if the browser refused (storage full or blocked).
  function saveImports() {
    var json = JSON.stringify(importedTunes);
    importSaves = importSaves.then(function () {
      if (importsInLocalStorage) { localStorage.setItem(IMPORT_STORE, json); return true; }
      return importStore(json).then(function () { return true; });
    }).catch(function (e) {
      console.warn('[fake-book] could not save imports:', e);
      return false;
    });
    return importSaves;
  }

  function load() {
    var o = JSON.parse(JSON.stringify(DEFAULTS));
    try {
      var s = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (s) { Object.keys(o).forEach(function (k) { if (s[k] !== undefined) o[k] = s[k]; }); o.vol = Object.assign({}, DEFAULTS.vol, s.vol || {}); }
    } catch (e) { /* storage unavailable */ }
    o.engineInst = o.posInst;
    return o;
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(opts)); } catch (e) { /* ignore */ } }

  function computeView() {
    var t = tune;
    var ev = opts.mode === 'score' ? clone(t.events) : RHYTHM[opts.rhythm].fn(MELODY[opts.melody].fn(clone(t.events), t), t);
    var concertKey = parseKey(opts.key, t.key.minor);
    var ins = INSTR[opts.instr];
    var writtenKey = shiftKey(concertKey, ins.letters, ins.semis);
    var cs = shiftBetween(t.key, concertKey), ws = shiftBetween(t.key, writtenKey);
    var cFlat = keySig(concertKey) < 0, wFlat = keySig(writtenKey) < 0;
    function shifted(list, sh, flat) {
      return list.map(function (e) { return { start: e.start, dur: e.dur, src: e.src, p: e.p ? shiftPitch(e.p, sh.letters, sh.semis, flat) : null }; });
    }
    // Octaves to move the melody before the octave setting: centered on `center`, or left where it is in the score.
    function baseOctave(out, center) {
      if (opts.mode === 'score') return 0;
      var w = 0, sum = 0;
      out.forEach(function (e) { if (e.p) { sum += e.p.midi * e.dur; w += e.dur; } });
      return w ? Math.round((center - sum / w) / 12) : 0;
    }
    // Keep the lowest and highest note inside the instrument's range: clamp `want` to the octaves that fit.
    function fitOctave(out, want, range) {
      if (!range) return want;
      var lo = Infinity, hi = -Infinity;
      out.forEach(function (e) { if (e.p) { lo = Math.min(lo, e.p.midi); hi = Math.max(hi, e.p.midi); } });
      if (lo > hi) return want;
      var kLo = Math.ceil((range[0] - lo) / 12), kHi = Math.floor((range[1] - hi) / 12);
      if (kLo > kHi) return Math.round(((range[0] + range[1]) / 2 - (lo + hi) / 2) / 12);   // wider than the horn: best effort
      return Math.max(kLo, Math.min(kHi, want));
    }
    function octaves(out, k) {
      if (k) out.forEach(function (e) { if (e.p) e.p = pitch(e.p.dia + 7 * k, e.p.a); });
      return out;
    }
    var cOut = shifted(ev, cs, cFlat), wOut = shifted(ev, ws, wFlat);
    var cBase = baseOctave(cOut, ins.sound), wBase = baseOctave(wOut, ins.center);
    var wWant = wBase + opts.octave, wK = fitOctave(wOut, wWant, ins.range);
    // The sounding line follows the written one, so what you hear is what the sheet shows.
    var cK = ins.range ? cBase + (wK - wBase) : cBase + opts.octave;
    octaves(cOut, cK); octaves(wOut, wK);
    var octaveShift = wK - wBase;                 // octaves from the original, for the second voice
    var octaveLimited = !!ins.range && wK !== wWant, octaveOut = 0;
    if (ins.range) wOut.forEach(function (e) { if (e.p && (e.p.midi < ins.range[0] || e.p.midi > ins.range[1])) octaveOut++; });
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
      concert: cOut,
      written: wOut,
      octaveLimited: octaveLimited, octaveOut: octaveOut,
      concertChords: moveChords(cs, cFlat),
      writtenChords: moveChords(ws, wFlat)
    };
    view.voicings = voiceChords(view.concertChords, opts.voicing);
    view.guitarGrips = window.FakeBookGuitarVoice ? window.FakeBookGuitarVoice.plan(view.concertChords.map(function (c) {
      return { rootPC: mod(NAT[c.root.l] + c.root.a, 12), type: chordTypeOf(c), bassPC: c.bass ? mod(NAT[c.bass.l] + c.bass.a, 12) : null };
    }), opts.guitarVoice || 'manual', GT) : [];
    // Imported bass-clef staff and tab: concert pitch (they're for piano, bass and guitar), moved with the key.
    view.bass = null; view.bassHorn = null; view.tab = null;
    if (t.staves.bass) {
      var bl = t.staves.bass.events.map(function (e) {
        return { start: e.start, dur: e.dur, ps: e.ps.map(function (p) { return shiftPitch(p, cs.letters, cs.semis, cFlat); }) };
      });
      var bsum = 0, bw = 0;
      bl.forEach(function (e) { e.ps.forEach(function (p) { bsum += p.midi * e.dur; bw += e.dur; }); });
      // Keep it as written unless it would sit far off the bass staff (average below C2 or above E4).
      var bmean = bw ? bsum / bw : 50, bk = 0;
      while (bmean + 12 * bk < 36) bk++;
      while (bmean + 12 * bk > 64) bk--;
      bl.forEach(function (e) { if (bk) e.ps = e.ps.map(function (p) { return pitch(p.dia + 7 * bk, p.a); }); e.p = e.ps[0]; });
      view.bass = bl;
      // The same line written for a treble-clef player (sax, trumpet, flute...): the instrument's transposition and key,
      // then the lowest octave that sits inside its range (and the Octave setting on top, kept inside the range).
      // Drawing only: what you hear still comes from view.bass.
      if (ins.clef === 'treble') {
        var hl = t.staves.bass.events.map(function (e) {
          return { start: e.start, dur: e.dur, ps: e.ps.map(function (p) { return shiftPitch(p, ws.letters, ws.semis, wFlat); }) };
        });
        var hlo = Infinity, hhi = -Infinity;
        hl.forEach(function (e) { e.ps.forEach(function (p) { hlo = Math.min(hlo, p.midi); hhi = Math.max(hhi, p.midi); }); });
        if (hlo <= hhi) {
          var floor = ins.range ? ins.range[0] : 60, hk = Math.ceil((floor - hlo) / 12);
          if (ins.range) hk = Math.max(hk, Math.min(hk + opts.octave, Math.floor((ins.range[1] - hhi) / 12)));
          hl.forEach(function (e) { if (hk) e.ps = e.ps.map(function (p) { return pitch(p.dia + 7 * hk, p.a); }); e.p = e.ps[0]; });
          view.bassHorn = hl;
        }
      }
    }
    // A second right-hand voice (the figure under a piano melody): written pitch, same key and instrument as the melody.
    view.voice2 = null;
    if (t.staves.voice2) view.voice2 = t.staves.voice2.events.map(function (e) {
      var ps = e.ps.map(function (p) { var q = shiftPitch(p, ws.letters, ws.semis, wFlat); return octaveShift ? pitch(q.dia + 7 * octaveShift, q.a) : q; });
      return { start: e.start, dur: e.dur, ps: ps, p: ps[0] };
    });
    // Key-change tags, spelled in the key the sheet is written in.
    if (t.keyChanges.length) {
      var secs = Object.assign({}, t.baseSections);
      t.keyChanges.forEach(function (kc) {
        var wk = shiftKey(kc.key, ws.letters, ws.semis);
        secs[kc.bar] = 'Key: ' + LETTERS[wk.l] + ACC[wk.a] + (wk.minor ? ' minor' : ' major');
      });
      t.sectionsByBar = secs;
      t.hasSections = true;
    }
    view.tabInfo = null;
    view.tabLines = 6;
    view.tabGrips = null;
    if (t.staves.tab) {
      view.tab = moveTab(t.staves.tab, cs.semis); view.tabLines = t.staves.tab.lines;
      // The imported tab is the authority on how each chord is fingered: diagrams follow it.
      if (window.FakeBookGuitarVoice) view.tabGrips = window.FakeBookGuitarVoice.fromTab(view.concertChords.map(function (c) {
        return { start: c.start, dur: c.dur, rootPC: mod(NAT[c.root.l] + c.root.a, 12), type: chordTypeOf(c), bassPC: c.bass ? mod(NAT[c.bass.l] + c.bass.a, 12) : null };
      }), view.tab, t.staves.tab.tuning);
    }
    else if (tabOn() && window.FakeBookTab) generateTab(t, cs, cFlat);
    view.pos = null;
    if (posOn() && window.FakeBookPosition) {
      var pm = [];
      view.concert.forEach(function (e) {
        if (!e.p) return;
        var pbar = e.start < 0 ? 0 : Math.floor(e.start / t.M + EPS) + 1;
        if (t.scoreBars) {
          var sbar = t.scoreBars.filter(function (x) { return e.start >= x.start - EPS && e.start < x.start + x.len - EPS; })[0];
          if (sbar) pbar = sbar.bar;
        }
        pm.push({ bar: pbar, midi: e.p.midi, name: noteName(e.p) });
      });
      view.pos = window.FakeBookPosition.plan(opts.posInst, pm, opts.tabPos || 'auto');
    }
  }
  // Finger positions: one small fingerboard per measure under the staff, in place of tab.
  function posOn() { return !!opts.showPos && opts.posInst !== 'piano' && !tune.chordsOnly && opts.sheetView !== 'drums'; }
  // Tab is on by default for imported songs (where it was asked for) and off for the built-in lead sheets.
  function tabOn() { return opts.showTab === null || opts.showTab === undefined ? !!(tune && tune.raw.imported) : !!opts.showTab; }

  // Tab for a song that came without any: the guitar part's own notes, or else the melody over the
  // bass line, fingered by FakeBookTab (fewest hand shifts, or near the chosen position).
  function generateTab(t, cs, cFlat) {
    var onsets = [], byStart = {}, source;
    var at = function (start) {
      var k = start.toFixed(3);
      if (!byStart[k]) { byStart[k] = { start: start, ms: [], mel: null, low: [] }; onsets.push(byStart[k]); }
      return byStart[k];
    };
    if (t.staves.gtr) {
      source = 'guitar';
      t.staves.gtr.events.forEach(function (e) {
        var o = at(e.start);
        e.ps.forEach(function (p) { o.ms.push(shiftPitch(p, cs.letters, cs.semis, cFlat).midi + t.staves.gtr.written); });
      });
      onsets.forEach(function (o) { o.ms.sort(function (a, b) { return b - a; }); });
    } else {
      source = 'arrangement';
      var mel = view.concert.filter(function (e) { return e.p; });
      var bass = (view.bass || []).map(function (e) { return { start: e.start, m: e.ps[0].midi + 12 }; });
      bass.forEach(function (b) { while (b.m < 52) b.m += 12; });             // below the low E: up an octave, as arrangers do
      var bassTop = bass.length ? Math.max.apply(null, bass.map(function (b) { return b.m; })) : 0;
      // The melody's octave: on the neck, above the bass, around the middle of the fretboard.
      var best = null;
      for (var k = -3; k <= 3; k++) {
        var out = 0, sum = 0;
        mel.forEach(function (e) { var m = e.p.midi + 12 * k; if (m < 52 || m > 88) out++; if (m <= bassTop - 3) out += 0.5; sum += m; });
        var score = out * 10 + Math.abs(sum / Math.max(1, mel.length) - 69) * 0.1;
        if (!best || score < best.score) best = { k: k, score: score };
      }
      mel.forEach(function (e) { at(e.start).mel = e.p.midi + 12 * best.k; });
      bass.forEach(function (b) { at(b.start).low.push(b.m); });
      onsets.forEach(function (o) { o.ms = (o.mel !== null ? [o.mel] : []).concat(o.low.filter(function (m) { return o.mel === null || m < o.mel; })); });
      onsets = onsets.filter(function (o) { return o.ms.length; });
    }
    onsets.sort(function (a, b) { return a.start - b.start; });
    var res = window.FakeBookTab.plan(onsets, { position: opts.tabPos || 'auto' });
    view.tab = res.events;
    view.tabInfo = { generated: true, source: source, dropped: res.dropped, total: res.total };
  }
  // Tab in another key: each note keeps its string if the new fret fits, else moves to the nearest string that has it.
  function moveTab(T, semis) {
    var n = T.lines;
    return T.events.map(function (e) {
      if (!semis) return { start: e.start, dur: e.dur, f: e.f };
      var used = {}, f = [];
      e.f.forEach(function (sf) {
        var midi = T.tuning[sf[0] - 1] + sf[1] + semis, best = null;
        for (var s = 1; s <= n; s++) {
          if (used[s]) continue;
          var fr = midi - T.tuning[s - 1];
          if (fr < 0 || fr > 22) continue;
          var cost = Math.abs(fr - sf[1]) + 2 * Math.abs(s - sf[0]);
          if (!best || cost < best.c) best = { s: s, fr: fr, c: cost };
        }
        if (best) { used[best.s] = true; f.push([best.s, best.fr]); }
      });
      return { start: e.start, dur: e.dur, f: f };
    });
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
    for (var i = 1; i <= t.bars; i++) bars.push({ i: i, start: t.scoreBars ? t.scoreBars.filter(function (b) { return b.bar === i; })[0].start : (i - 1) * t.M, len: t.scoreBars ? t.scoreBars.filter(function (b) { return b.bar === i; })[0].len : t.M, off: 0, section: (t.sectionsByBar && t.sectionsByBar[i]) || null });
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
          // A tied triplet length with no single note value (5/3 of a beat: a half triplet tied to an eighth
          // triplet) is written as tied triplet notes, longest first.
          var chunks = [], left = it.len, at = it.rel;
          if (BASE[Math.round(it.len * 6) / 4]) chunks.push(it.len);
          else while (left > EPS) { var c = [4 / 3, 2 / 3, 1 / 3].filter(function (x) { return x <= left + EPS; })[0]; chunks.push(c); left -= c; }
          chunks.forEach(function (len, k) {
            b.pieces.push({ rest: !it.p, rel: at, beat: at + b.off, d: Math.round(len * 6) / 4, real: len, trip: true, idx: it.idx, p: it.p,
              tie: !!it.p && (k < chunks.length - 1 || it.cont), tieFrom: !!it.p && (k > 0 || it.from) });
            at += len;
          });
          return;
        }
        var parts = decompose(it.rel + b.off, it.len, !it.p, b.len);
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
  function beatCountLabels(out, xAt, y, beats, extraClass, positions, pieces, edges) {
    var syllables = ['', 'e', '&', 'a'];
    var qs = positions ? positions.map(function (p) { return Math.round(p * 4); }) : Array.from({ length: beats * 4 }, function (_, i) { return i; });
    // A tied continuation is still counted. Include both ends even when the selected count
    // resolution would normally omit that subdivision, then join their count syllables below.
    (pieces || []).forEach(function (pc) { if (pc.p && (pc.tie || pc.tieFrom)) qs.push(Math.round(pc.rel * 4)); });
    qs = qs.filter(function (q, i) { return q >= 0 && q < beats * 4 && qs.indexOf(q) === i; }).sort(function (a, b) { return a - b; });
    qs.forEach(function (q) {
      var beat = Math.floor(q / 4) + 1;
      out.push(txt(xAt(q / 4), y, q % 4 ? syllables[q % 4] : String(beat), 'fb-beat-count' + (extraClass ? ' ' + extraClass : ''), ' text-anchor="middle"'));
    });
    (pieces || []).forEach(function (pc, i) {
      if (!pc.p || !pc.tie) return;
      var next = pieces.slice(i + 1).filter(function (candidate) { return candidate.p && candidate.idx === pc.idx && candidate.tieFrom; })[0];
      // With no later piece in this bar the note is tied over the barline: run the arc to the bar's right edge
      // so it meets the continuation arc that starts the next bar.
      var x1 = xAt(pc.rel), x2 = next ? xAt(next.rel) : edges ? edges.right : xAt(Math.min(beats, pc.rel + Math.max(0.35, (beats - pc.rel) * 0.75)));
      if (x2 <= x1 + 2) return;
      out.push('<path class="fb-count-tie" d="M' + (x1 + 3).toFixed(1) + ' ' + (y + 3).toFixed(1) + ' Q' + ((x1 + x2) / 2).toFixed(1) + ' ' + (y + 7).toFixed(1) + ' ' + (x2 - 3).toFixed(1) + ' ' + (y + 3).toFixed(1) + '"/>');
    });
    (pieces || []).forEach(function (pc, i) {
      if (!pc.p || !pc.tieFrom) return;
      var previous = pieces.slice(0, i).some(function (candidate) { return candidate.p && candidate.idx === pc.idx && candidate.tie; });
      if (previous) return;
      var x2 = xAt(pc.rel), gap = Math.max(8, Math.abs(xAt(pc.rel + 0.35) - x2));
      var xs = edges ? Math.min(edges.left, x2 - 8) : x2 - gap;
      out.push('<path class="fb-count-tie is-continuation" d="M' + xs.toFixed(1) + ' ' + (y + 3).toFixed(1) + ' Q' + ((xs + x2) / 2).toFixed(1) + ' ' + (y + 7).toFixed(1) + ' ' + (x2 - 3).toFixed(1) + ' ' + (y + 3).toFixed(1) + '"/>');
    });
  }
  function beatGridPositions(mode, beats) {
    if (mode === 'quarter') return Array.from({ length: beats }, function (_, i) { return i; });
    if (mode === 'eighth') return Array.from({ length: beats * 2 }, function (_, i) { return i / 2; });
    return null;
  }

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
    return hands.concat(feet).map(function (n) { return n.bt; });
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
    var rowH = opts.beatCounts !== 'off' ? 168 : 135;
    var headerW = 75;
    var out = [];
    var yTop = 52; // room above the first staff for the tempo line, then bar numbers, then stems

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
        out.push('<text x="' + headerW + '" y="' + (staffTop - 42) + '" font-size="12" font-weight="700" font-family="DM Sans, sans-serif" fill="#7a4508">♩ = ' + opts.tempo + ' · ' + MN.escape(grooveTitle) + '</text>');
      }

      out.push('<line class="fb-drum-barline" x1="' + headerW + '" y1="' + staffTop + '" x2="' + headerW + '" y2="' + staffBot + '" stroke="#1b1410" stroke-width="1.4"/>');

      sys.forEach(function (barNum, bi) {
        var bx = headerW + bi * barW;
        var ex = bx + barW;
        var isLast = barNum === totalBars;

        out.push('<rect class="fb-bar" data-bar="' + barNum + '" x="' + bx + '" y="' + (staffTop - 34) + '" width="' + barW + '" height="' + (staffH + 34 + 26) + '" rx="4"/>');
        out.push('<text class="fb-drum-barnum" x="' + (bx + 4) + '" y="' + (staffTop - 27) + '">' + barNum + '</text>');

        if (tune.sectionsByBar && tune.sectionsByBar[barNum]) {
          var sec = tune.sectionsByBar[barNum];
          out.push('<rect class="fb-sec-bg" x="' + (bx + 22) + '" y="' + (staffTop - 38) + '" width="18" height="15" rx="3"/>');
          out.push('<text class="fb-sec-txt" x="' + (bx + 31) + '" y="' + (staffTop - 26) + '" font-size="10" font-weight="800" text-anchor="middle">' + MN.escape(sec) + '</text>');
        }

        var drumOnsets = renderDrumBarNotes(out, bx, barW, staffTop, SP, drumSet, M, barNum);
        if (opts.beatCounts !== 'off') beatCountLabels(out, function (bt) { return bx + 14 + (bt / M) * (barW - 28); }, staffBot + 34, M, 'fb-drum-count', opts.beatCounts === 'written' ? drumOnsets : beatGridPositions(opts.beatCounts, M));

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
    scoreNav.refresh();
    paintLoop();
  }

  // Under the sheet: whether the worked-out tab could fit everything on a guitar.
  function renderTabNote() {
    var n = el('[data-fb-tab-note]');
    if (!n) return;
    var info = view.tabInfo, on = tabOn() && opts.sheetView !== 'drums';
    if (!on || !info || !info.dropped) { n.hidden = true; n.textContent = ''; return; }
    var share = info.dropped / Math.max(1, info.total);
    n.hidden = false;
    n.classList.toggle('is-warn', share >= 0.05);
    n.textContent = share >= 0.05 ?
      'This ' + (info.source === 'guitar' ? 'guitar part' : 'song') + ' isn’t playable on guitar as written: ' + info.dropped + ' of ' + info.total +
        ' notes don’t fit under one hand or on the fretboard, so the tab leaves them out. Try a simpler version of this song.' :
      'The tab leaves out ' + info.dropped + ' note' + (info.dropped === 1 ? '' : 's') + ' that don’t fit on a guitar (too low, too high, or too far apart).';
  }

  function renderSheet() {
    if (!view) return;
    hideBarPop();
    root.classList.toggle('is-original-score', opts.sheetView === 'arrangement' && !!(tune.raw.score && tune.raw.score.musicxml));
    if (opts.sheetView === 'arrangement' && tune.raw.score && tune.raw.score.musicxml) {
      var arrangementLegend = el('[data-fb-drum-legend]');
      if (arrangementLegend) arrangementLegend.hidden = true;
      nowEls = []; barEls = {};
      window.FakeBookArrangement.render(sheetEl, tune.raw.score.musicxml, opts.zoom || 1);
      scoreNav.refresh();
      return;
    }
    window.FakeBookArrangement.cancel(sheetEl);
    var legendEl = el('[data-fb-drum-legend]');
    if (opts.sheetView === 'drums') {
      if (legendEl) legendEl.hidden = false;
      renderDrumSheet();
      return;
    }
    if (legendEl) legendEl.hidden = true;
    var W = Math.max(300, Math.floor(sheetEl.clientWidth || 900));
    // Zoom: zooming out shrinks the notation and fits more bars on each line (an overview of a long song).
    var zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, opts.zoom || 1));
    var S = Math.max(3.4, (W >= 900 ? 10 : W >= 620 ? 9 : 7) * zoom);
    var t = tune, M = t.M, ins = INSTR[opts.instr], C = MN.clefs[ins.clef];
    var sig = keySig(view.writtenKey), bars = layoutBars(view.written, t);
    var bpl = Math.max(1, Math.round((W >= 900 ? 4 : W >= 620 ? 3 : 2) / zoom));
    var systems = [], cur = [];
    bars.forEach(function (b) {
      cur.push(b);
      if (cur.filter(function (x) { return x.i > 0; }).length === bpl) { systems.push(cur); cur = []; }
    });
    if (cur.length) systems.push(cur);
    var half = S / 2, headW = 295 * S / 250, wholeW = 426 * S / 250;
    // Note names: 'under' prints each letter beneath its staff; 'notes' (default) puts it in a coloured badge on the head, MuseScore-style.
    var namesUnder = !!opts.names && opts.nameStyle === 'under', namesOn = !!opts.names && !namesUnder;
    // A coloured notehead with its letter inside: a tilted oval like an engraved head (hollow for half and whole notes).
    var headWidth = function (base) { return namesOn ? (base >= 4 ? 1.6 : 1.34) * S : base === 4 ? wholeW : headW; };
    // ks = the key signature's accidental for this letter on this staff, so a natural that cancels it still shows a sign.
    var nameHead = function (p, cx, cy, base, ks) {
      var whole = base >= 4, hollow = base >= 2, acc = p.a ? ACC[p.a] : ks ? '♮' : '';
      var wide = acc ? 1.14 : 1, rx = (whole ? 0.9 : 0.78) * S * wide, ry = 0.5 * S, fs = 1.08 * S, col = NAME_COLORS[p.l];
      var rot = whole ? '' : ' transform="rotate(-24 ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')"';
      var oval = '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="' + rx.toFixed(2) + '" ry="' + ry.toFixed(2) + '"' + rot +
        ' fill="' + (hollow ? '#fffdf7' : col) + '" stroke="' + col + '" stroke-width="' + ((hollow ? 0.17 : 0.06) * S).toFixed(2) + '"/>';
      var ax = acc ? fs * 0.33 : 0;                        // the letter shifts left to make room for its sign
      var ink = hollow ? NAME_INK_HOLLOW[p.l] : NAME_INK[p.l], dk = !hollow && ink !== '#ffffff';
      return '<g class="fb-nhead' + (hollow ? ' is-hollow' : '') + (dk ? ' ink-dark' : '') + '" data-contrast-guard-skip>' + oval +
        '<text class="fb-nhead-t" x="' + (cx - ax).toFixed(1) + '" y="' + (cy + fs * 0.36).toFixed(1) + '" font-size="' + fs.toFixed(1) + '" text-anchor="middle"' + ' style="fill:' + ink + '">' + LETTERS[p.l] + '</text>' +
        (acc ? '<g class="fb-nhead-acc" style="color:' + ink + '">' + MN.accidental(p.a || 0, cx + 0.04 * S, cy, 0.44 * S) + '</g>' : '') + '</g>';
    };
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
    chordSymbolX = {};
    view.writtenChords.forEach(function (c, ci) { (chordsByBar[c.bar] = chordsByBar[c.bar] || []).push({ c: c, ci: ci }); });
    // Extra staves from an imported score, drawn under the melody and lined up with it in time.
    var showBass = !!(view.bass && opts.showBass !== false), showTab = !!(view.tab && tabOn()), showPos = !!view.pos;
    // "Bass part on my horn's staff": the same line in the instrument's clef, key and transposition (drawing only).
    var bassHorn = !!(showBass && view.bassHorn && opts.bassFor === 'horn'), bassEvents = bassHorn ? view.bassHorn : view.bass;
    var CB = bassHorn ? C : MN.clefs.bass, sigB = bassHorn ? sig : keySig(view.concertKey), tabGap = 1.3 * S, tabLines = view.tabLines || 6;
    renderTabNote();
    var showV2 = !!view.voice2, v2Placed = {};
    if (showBass) layoutBars(bassEvents, t).forEach(function (bb, i) { bars[i].bassBar = bb; });
    if (showV2) layoutBars(view.voice2, t).forEach(function (vb, i) { bars[i].v2Bar = vb; bars[i].hasV2 = vb.pieces.some(function (pc) { return !pc.rest; }); });
    var ksw = Math.max(Math.abs(sig), showBass ? Math.abs(sigB) : 0);
    var bassPlaced = {};
    bassPlacedAll = bassPlaced; lastS = S;
    // With a bass staff, space each bar by the notes of BOTH staves, so a busy left hand gets the room it needs
    // even where the melody is a single rest (heads of one beat line up in one column).
    if (showBass || showV2) bars.forEach(function (b) {
      var slots = [], bm = {}, vm = {};
      var add = function (rel, nw, acc) {
        for (var i = 0; i < slots.length; i++) if (near(slots[i].rel, rel)) { slots[i].nw = Math.max(slots[i].nw, nw); slots[i].acc = slots[i].acc || acc; return; }
        slots.push({ rel: rel, nw: nw, acc: acc });
      };
      b.pieces.forEach(function (pc) { add(pc.rel, pc.nw, pc.acc); });
      if (b.bassBar) b.bassBar.pieces.forEach(function (pc) {
        if (pc.rest) { if (!pc.whole) add(pc.rel, S * (1.5 + 2.1 * Math.sqrt(pc.d)), false); return; }
        var acc = false;
        bassEvents[pc.idx].ps.forEach(function (p) {
          var mk = p.l + ':' + p.o, cur = bm[mk] !== undefined ? bm[mk] : keyAcc(sigB, p.l);
          if (!pc.tieFrom && cur !== p.a) acc = true;
          bm[mk] = p.a;
        });
        add(pc.rel, S * (1.5 + 2.1 * Math.sqrt(pc.whole ? 1 : pc.d)) + (acc ? 1.3 * S : 0), acc);
      });
      // The second right-hand voice shares the treble staff, so its notes take room in the same columns.
      if (b.v2Bar) b.v2Bar.pieces.forEach(function (pc) {
        if (pc.rest) return;
        var acc = false;
        view.voice2[pc.idx].ps.forEach(function (p) {
          var mk = p.l + ':' + p.o, cur = vm[mk] !== undefined ? vm[mk] : keyAcc(sig, p.l);
          if (!pc.tieFrom && cur !== p.a) acc = true;
          vm[mk] = p.a;
        });
        add(pc.rel, S * (1.5 + 2.1 * Math.sqrt(pc.whole ? 1 : pc.d)) + (acc ? 1.3 * S : 0), acc);
      });
      slots.sort(function (a, c) { return a.rel - c.rel; });
      var total = 0;
      slots.forEach(function (sl, i) { sl.cum = total; total += sl.nw; sl.len = (i + 1 < slots.length ? slots[i + 1].rel : b.len) - sl.rel; });
      b.slots = slots; b.slotTotal = total;
      b.natural = Math.max(b.i === 0 ? 4 * S : 9 * S, padL + total + padR);
    });

    systems.forEach(function (sys, si) {
      var first = si === 0;
      var hx = 0.4 * S, header = hx + 3.3 * S + ksw * 1.05 * S + (first ? 2.6 * S : 0) + 0.9 * S;
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
          var st = stepOf(pc.p), up = b.hasV2 || st < 4;
          top = Math.max(top, (up && BASE[pc.d][0] < 4 ? st + 7 : st) + (pc.trip && up ? 3 : 0));
          bottom = Math.min(bottom, (!up && BASE[pc.d][0] < 4 ? st - 7 : st) - (pc.trip && !up ? 3 : 0));
        });
      });
      sys.forEach(function (b) {
        if (!b.v2Bar) return;
        b.v2Bar.pieces.forEach(function (pc) {
          if (!pc.p) return;
          view.voice2[pc.idx].ps.forEach(function (p) { var st = stepOf(p); top = Math.max(top, st + 1); bottom = Math.min(bottom, (BASE[pc.d][0] < 4 ? st - 7 : st) - 1); });
        });
      });
      var noteTop = (top - 8) * half, noteBot = -bottom * half;
      var secH = t.hasSections ? 1.6 * S : 0;
      var staffTop = y + 3.6 * S + secH + noteTop, staffBot = staffTop + 4 * S;
      var chordBase = staffTop - noteTop - 1.4 * S;
      var rowsBottom = staffBot + noteBot + 1.4 * S, bassTop = 0, bassBot = 0, tabTop = 0;
      if (showBass) {
        var btop = 8, bbot = 0, bchord = 0;
        sys.forEach(function (b) {
          b.bassBar.pieces.forEach(function (pc) {
            if (!pc.p) return;
            bassEvents[pc.idx].ps.forEach(function (p) { var st = p.dia - CB.bottom; btop = Math.max(btop, st + 1); bbot = Math.min(bbot, st - 1); });
            bchord = Math.max(bchord, bassEvents[pc.idx].ps.length);
          });
        });
        bassTop = staffBot + noteBot + (namesUnder ? 3.6 : 2.2) * S + Math.max(0, btop - 8) * half;
        bassBot = bassTop + 4 * S;
        rowsBottom = bassBot - bbot * half + 1.2 * S + (namesUnder ? (bchord + 0.4) * 1.25 * S : 0);
      }
      if (showTab) {
        tabTop = (showBass ? rowsBottom + 0.8 * S : staffBot + noteBot + (namesUnder ? 3.8 : 2.4) * S);
        rowsBottom = tabTop + (tabLines - 1) * tabGap + 1.2 * S;
      }
      var helpTop = 0, helpH = 0;
      var POSH = showPos ? window.FakeBookPosition.height(view.pos.inst, S) : 0, posTop = 0;
      if (showPos) {
        posTop = (showTab || showBass ? rowsBottom : staffBot + noteBot + (namesUnder ? 3.6 : 2.2) * S) + 0.4 * S;
        rowsBottom = posTop + POSH + 0.6 * S;
      }
      if (shapesRowOn() || (showPos && opts.showAnalysis)) {
        helpTop = (showPos || showTab || showBass ? rowsBottom : staffBot + noteBot + (namesUnder ? 3.6 : 2.2) * S) + S;
        helpH = (shapesRowOn() ? shapeSize().rowH * S : 0) + (showPos && opts.showAnalysis ? 13 * S : 0);
        rowsBottom = helpTop + helpH;
      }
      var x = header;
      out.push('<g class="fb-system">');
      // bar backgrounds (click / highlight targets)
      var bx = header;
      sys.forEach(function (b, k) {
        var bw = weights[k] * unit;
        b.x = bx; b.w = bw; bx += bw;
        if (t.scoreBars) {
          // Only where the meter actually changes (the opening meter is already the time signature).
          var sbi = -1, sb = t.scoreBars.filter(function (x, xi) { if (x.bar === b.i) sbi = xi; return x.bar === b.i; })[0];
          var prevSb = sbi > 0 ? t.scoreBars[sbi - 1] : null;
          if (sb && prevSb && prevSb.meter.join('/') !== sb.meter.join('/')) out.push(txt(b.x + S, chordBase - 2 * S, sb.meter.join('/'), 'fb-meter-label', ' font-size="' + S + '"'));
        }
        out.push('<rect class="fb-bar" data-bar="' + b.i + '" x="' + b.x.toFixed(1) + '" y="' + (chordBase - 1.6 * S).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (rowsBottom - chordBase + 1.6 * S).toFixed(1) + '" rx="' + (0.6 * S) + '"><title>Bar ' + (b.i || 'pickup') + '</title></rect>');
      });
      for (var li = 0; li < 5; li++) out.push(line(hx, staffTop + li * S, bx, staffTop + li * S, Math.max(1, S * 0.11), 'fb-staffline'));
      out.push(line(hx, staffTop, hx, staffBot, Math.max(1, S * 0.13)));
      out.push(MN.clef(ins.clef, hx + 0.7 * S, staffBot, half, 'fb-clef'));
      var kx = hx + 3.5 * S;
      for (var ki = 0; ki < Math.abs(sig); ki++) {
        var st = sig > 0 ? C.sharp[ki] : C.flat[ki];
        out.push(MN.accidental(sig > 0 ? 1 : -1, kx + ki * 1.05 * S, staffBot - st * half, S, 'fb-keysig'));
      }
      var tx = kx + ksw * 1.05 * S + 1.2 * S;
      if (first) {
        out.push(txt(tx, staffTop + 2 * S, String(t.meter[0]), 'fb-timesig', ' font-size="' + (2.75 * S) + '"'));
        out.push(txt(tx, staffBot, String(t.meter[1]), 'fb-timesig', ' font-size="' + (2.75 * S) + '"'));
      }
      if (showBass) {
        for (var bl = 0; bl < 5; bl++) out.push(line(hx, bassTop + bl * S, bx, bassTop + bl * S, Math.max(1, S * 0.11), 'fb-staffline'));
        out.push(MN.clef(bassHorn ? ins.clef : 'bass', hx + 0.7 * S, bassBot, half, 'fb-clef'));
        for (var bki = 0; bki < Math.abs(sigB); bki++) {
          out.push(MN.accidental(sigB > 0 ? 1 : -1, kx + bki * 1.05 * S, bassBot - (sigB > 0 ? CB.sharp[bki] : CB.flat[bki]) * half, S, 'fb-keysig'));
        }
        if (first) {
          out.push(txt(tx, bassTop + 2 * S, String(t.meter[0]), 'fb-timesig', ' font-size="' + (2.75 * S) + '"'));
          out.push(txt(tx, bassBot, String(t.meter[1]), 'fb-timesig', ' font-size="' + (2.75 * S) + '"'));
        }
      }
      if (showTab) {
        var tabBot = tabTop + (tabLines - 1) * tabGap;
        for (var tl = 0; tl < tabLines; tl++) out.push(line(hx, tabTop + tl * tabGap, bx, tabTop + tl * tabGap, Math.max(1, S * 0.1), 'fb-staffline fb-tabline'));
        var tabMid = (tabTop + tabBot) / 2, tabStep = Math.min(1.7 * S, (tabBot - tabTop) / 3);
        ['T', 'A', 'B'].forEach(function (ch, ci) {
          out.push(txt(hx + 1.7 * S, tabMid + (ci - 1) * tabStep + 0.75 * S, ch, 'fb-tab-clef', ' font-size="' + (1.45 * S) + '" text-anchor="middle"'));
        });
      }
      if (showPos) {
        out.push(txt(hx + 1.7 * S, posTop + POSH / 2 + 0.7 * S, window.FakeBookPosition.TAG[view.pos.inst], 'fb-tab-clef', ' font-size="' + (1.05 * S) + '" text-anchor="middle"'));
        out.push(line(hx, posTop, bx, posTop, Math.max(1, S * 0.08), 'fb-pos-rule'));
      }
      var sysBot = showTab ? tabTop + (tabLines - 1) * tabGap : showBass ? bassBot : staffBot;
      if (sysBot !== staffBot) out.push(line(hx, staffTop, hx, sysBot, Math.max(1, S * 0.13)));
      var firstBar = sys.filter(function (b) { return b.i > 0; })[0];
      if (firstBar && firstBar.i > 1) out.push(txt(hx, chordBase - 1.5 * S + S, String(firstBar.i), 'fb-barnum', ' font-size="' + (1.1 * S) + '"'));

      sys.forEach(function (b, k) {
        var used = (b.slots ? b.slotTotal : b.pieces.reduce(function (a, pc) { return a + pc.nw; }, 0)) || 1;
        var k2 = (b.w - padL - padR) / used;
        if (b.slots) {
          b.slots.forEach(function (sl) { sl.x0 = b.x + padL + sl.cum * k2; sl.head = sl.x0 + (sl.acc ? 1.3 * S : 0); });
          b.pieces.forEach(function (pc) {
            var sl = b.slots.filter(function (x) { return near(x.rel, pc.rel); })[0];
            pc.x0 = sl.x0; pc.head = sl.head;
          });
        } else b.pieces.forEach(function (pc) { pc.x0 = b.x + padL + pc.cum * k2; pc.head = pc.x0 + (pc.acc ? 1.3 * S : 0); });
        var xAt = function (rel) {                       // x of the musical time rel, for chord symbols
          var ps = b.slots || b.pieces;
          if (!ps || !ps.length) {
            return b.x + padL + (b.w - padL - padR) * (b.len > 0 ? Math.min(1, Math.max(0, rel / b.len)) : 0);
          }
          for (var i = 0; i < ps.length; i++) {
            if (near(ps[i].rel, rel)) return ps[i].head;
          }
          for (var i = 0; i < ps.length; i++) {
            if (ps[i].rel > rel) {
              if (i === 0) {
                var frac0 = ps[0].rel > EPS ? Math.min(1, Math.max(0, rel / ps[0].rel)) : 0;
                return (b.x + padL) + (ps[0].head - (b.x + padL)) * frac0;
              }
              var a = ps[i - 1];
              var dRel = ps[i].rel - a.rel;
              return dRel > EPS ? a.head + (ps[i].head - a.head) * (rel - a.rel) / dRel : a.head;
            }
          }
          var last = ps[ps.length - 1];
          var lastDur = (last.len || last.real || last.d || (b.len - last.rel));
          var barEnd = b.x + b.w - padR;
          var frac = lastDur > EPS ? Math.min(1, Math.max(0, (rel - last.rel) / lastDur)) : 0;
          return last.head + (barEnd - last.head) * frac;
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
        var lastChordRight = -Infinity;
        (chordsByBar[b.i] || []).forEach(function (o, oi) {
          var cx = xAt(o.c.start - b.start) - 0.4 * S;
          if (b.section && oi === 0 && cx < b.x + secBoxW + 0.3 * S) {
            cx = b.x + secBoxW + 0.3 * S;
          }
          if (oi > 0 && cx < lastChordRight + 0.6 * S) {
            cx = lastChordRight + 0.6 * S;
          }
          var textEstWidth = chordName(o.c).length * 1.05 * S;
          lastChordRight = cx + textEstWidth;
          chordSymbolX[o.ci] = cx;
          out.push('<text class="fb-chord' + (o.ci === chordSel ? ' is-sel' : '') + '" data-ci="' + o.ci + '" x="' + cx.toFixed(1) + '" y="' + chordBase.toFixed(1) + '" font-size="' + (1.75 * S) + '" tabindex="0" role="button" aria-label="Chord ' + MN.escape(chordName(o.c)) + ', bar ' + b.i + '">' + MN.escape(realbookChord(chordName(o.c))) + '</text>');
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
          var hw = headWidth(base[0]);
          var g = ['<g class="fb-n" data-idx="' + pc.idx + '">'];
          MN.ledgerSteps(stp).forEach(function (ls) {
            var ly = staffBot - ls * half;
            g.push(line(nx - hw / 2 - 0.45 * S, ly, nx + hw / 2 + 0.45 * S, ly, Math.max(1, S * 0.12)));
          });
          if (pc.acc) g.push(MN.accidental(pc.p.a, nx - hw / 2 - 1.3 * S, ny, S));
          var headSvg = namesOn ? nameHead(pc.p, nx, ny, base[0], keyAcc(sig, pc.p.l)) : null;   // named heads are drawn last, over the stem
          if (!headSvg) g.push(MN.glyph(base[0] >= 4 ? 'whole' : base[0] >= 2 ? 'half' : 'quarter', nx - hw / 2, ny, S, 'fb-head'));
          if (base[1]) g.push('<circle cx="' + (nx + hw / 2 + 0.5 * S).toFixed(1) + '" cy="' + (ny - (mod(stp, 2) === 0 ? half : 0)).toFixed(1) + '" r="' + (0.17 * S).toFixed(2) + '" fill="currentColor"/>');
          var info = { pc: pc, x: nx, y: ny, step: stp, hw: hw, base: base[0], sys: si, g: g, bar: b, headSvg: headSvg };
          placedBar.push(info);
          (placed[pc.idx] = placed[pc.idx] || []).push(info);
          if (namesUnder) g.push(txt(nx, staffBot + noteBot + 2.3 * S, noteName(pc.p), 'fb-name', ' font-size="' + (1.15 * S) + '" text-anchor="middle"'));
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
          var avg = gr.reduce(function (s, n) { return s + n.step; }, 0) / gr.length, up = gr[0].bar.hasV2 || avg < 4;
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
        placedBar.forEach(function (n) { if (n.headSvg) n.g.push(n.headSvg); n.g.push('</g>'); out.push(n.g.join('')); });
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
        if (showBass) drawStaffLine(b, xAt, { pieces: b.bassBar.pieces, events: bassEvents, bot: bassBot, top: bassTop, clef: CB, sig: sigB, cls: 'fb-bn', placed: bassPlaced, names: true, bbot: bbot });
        if (showV2 && b.v2Bar) drawStaffLine(b, xAt, { pieces: b.v2Bar.pieces, events: view.voice2, bot: staffBot, top: staffTop, clef: C, sig: sig, cls: 'fb-v2n', placed: v2Placed, up: false, skipRests: true });
        if (showTab) drawTabBar(b, xAt);
        if (showPos && view.pos.bars[b.i]) out.push(window.FakeBookPosition.draw(view.pos.inst, view.pos.bars[b.i], b.x, posTop, b.w, POSH, S));
        if (shapesRowOn() || (showPos && opts.showAnalysis)) out.push(drawMeasureHelp(b, helpTop, helpH, S, showPos, saxCellsFor(b, placedBar)));
        if (opts.beatCounts !== 'off') beatCountLabels(out, function (rel) { return xAt(rel); }, rowsBottom + 1.25 * S, Math.floor(b.len + EPS), 'fb-lead-count', opts.beatCounts === 'written' ? b.pieces.map(function (pc) { return pc.rel; }) : beatGridPositions(opts.beatCounts, Math.floor(b.len + EPS)), b.pieces, { left: b.x + 2, right: b.x + b.w - 2 });
        // bar line (through each staff of the system)
        var last = si === systems.length - 1 && k === sys.length - 1;
        var ex = b.x + b.w;
        var spans = [[staffTop, staffBot]];
        if (showBass) spans.push([bassTop, bassBot]);
        if (showTab) spans.push([tabTop, tabTop + (tabLines - 1) * tabGap]);
        spans.forEach(function (sp) {
          if (last) { out.push(line(ex - 0.9 * S, sp[0], ex - 0.9 * S, sp[1], Math.max(1, S * 0.12))); out.push('<rect x="' + (ex - 0.5 * S).toFixed(1) + '" y="' + sp[0].toFixed(1) + '" width="' + (0.5 * S).toFixed(1) + '" height="' + (sp[1] - sp[0]).toFixed(1) + '" fill="currentColor"/>'); }
          else out.push(line(ex, sp[0], ex, sp[1], Math.max(1, S * 0.12)));
        });
        b.staffTop = staffTop;
      });
      out.push('</g>');
      sys.endX = bx; sys.startX = header;
      y = opts.beatCounts !== 'off' ? rowsBottom + 3 * S : (showBass || showTab || showPos || shapesRowOn() ? rowsBottom + 1.4 * S : staffBot + noteBot + (namesUnder ? 3.4 : 1.8) * S + 1.4 * S);

      // One bar of a staff line that sits on the melody's time grid: the bass-clef staff, or the second right-hand voice
      // on the treble staff (cfg.up false: stems down). Notes and chords at the melody's x for the same beat.
      function drawStaffLine(b, xAt, cfg) {
        var mem = {}, infos = [], bp = cfg.pieces, bassTop = cfg.top, bassBot = cfg.bot, CB = cfg.clef, sigB = cfg.sig, bbot = cfg.bbot;
        bp.forEach(function (pc) {
          var base = BASE[pc.d] || [pc.d, 0], hx0 = xAt(pc.rel);
          if (pc.rest) {
            if (cfg.skipRests) return;
            var mid = bassTop + 2 * S, rx;
            if (pc.whole || base[0] === 4) { rx = pc.whole ? b.x + b.w / 2 : hx0 + 0.6 * S; out.push('<rect class="fb-rest" x="' + (rx - 0.6 * S).toFixed(1) + '" y="' + (bassTop + S).toFixed(1) + '" width="' + (1.2 * S).toFixed(1) + '" height="' + (0.5 * S).toFixed(1) + '"/>'); }
            else if (base[0] === 2) { rx = hx0 + 0.6 * S; out.push('<rect class="fb-rest" x="' + (rx - 0.6 * S).toFixed(1) + '" y="' + (mid - 0.5 * S).toFixed(1) + '" width="' + (1.2 * S).toFixed(1) + '" height="' + (0.5 * S).toFixed(1) + '"/>'); }
            else out.push(MN.glyph(base[0] === 1 ? 'restQuarter' : base[0] === 0.5 ? 'rest8' : 'rest16', hx0 + 0.2 * S, mid, S, 'fb-restg'));
            return;
          }
          var ps = cfg.events[pc.idx].ps, hw = headWidth(base[0]), nx = hx0 + headW / 2;
          var steps = ps.map(function (p) { return p.dia - CB.bottom; });
          var lo = Math.min.apply(null, steps), hi = Math.max.apply(null, steps), up = cfg.up !== undefined ? cfg.up : (lo + hi) / 2 < 4;
          var g = ['<g class="' + cfg.cls + '" data-idx="' + pc.idx + '">'], heads = [], ys = [], prev = null, shifted = false, accN = 0;
          ps.forEach(function (p, i) {
            var st = steps[i], ny = bassBot - st * half;
            MN.ledgerSteps(st).forEach(function (ls) { var ly = bassBot - ls * half; g.push(line(nx - hw / 2 - 0.45 * S, ly, nx + hw / 2 + 0.45 * S, ly, Math.max(1, S * 0.12))); });
            var mk = p.l + ':' + p.o, cur = mem[mk] !== undefined ? mem[mk] : keyAcc(sigB, p.l);
            if (!pc.tieFrom && cur !== p.a) { g.push(MN.accidental(p.a, nx - hw / 2 - 1.3 * S - (accN % 2) * 1.1 * S, bassBot - st * half, S)); accN++; }
            mem[mk] = p.a;
            var off = prev !== null && st - prev === 1 && !shifted ? (up ? hw - 0.1 * S : -(hw - 0.1 * S)) : 0;   // seconds sit side by side
            shifted = off !== 0; prev = st;
            if (namesOn) heads.push(nameHead(p, nx + off, ny, base[0], keyAcc(sigB, p.l)));
            else g.push(MN.glyph(base[0] >= 4 ? 'whole' : base[0] >= 2 ? 'half' : 'quarter', nx - hw / 2 + off, ny, S, 'fb-head'));
            if (base[1]) g.push('<circle cx="' + (nx + hw / 2 + 0.5 * S + Math.max(0, off)).toFixed(1) + '" cy="' + (ny - (mod(st, 2) === 0 ? half : 0)).toFixed(1) + '" r="' + (0.17 * S).toFixed(2) + '" fill="currentColor"/>');
            ys.push(ny);
          });
          if (namesUnder && cfg.names) {
            var nameY = bassBot - bbot * half + 1.9 * S;
            ps.slice().sort(function (a, c) { return c.midi - a.midi; }).forEach(function (p, i) {
              g.push(txt(nx, nameY + i * 1.25 * S, noteName(p), 'fb-name', ' font-size="' + (1.15 * S) + '" text-anchor="middle"'));
            });
          }
          var info = { pc: pc, g: g, heads: heads, x: nx, ys: ys, hw: hw, base: base[0], up: up, cen: (lo + hi) / 2, sys: si };
          infos.push(info);
          (cfg.placed[pc.idx] = cfg.placed[pc.idx] || []).push(info);
        });
        // stems, flags and beams: eighths and sixteenths inside one beat are beamed together, as on the melody staff
        var groups = [], grp = [];
        infos.forEach(function (n, i) {
          var prevN = i ? infos[i - 1] : null;
          var adjacent = prevN && bp.indexOf(n.pc) === bp.indexOf(prevN.pc) + 1;
          if (n.base <= 0.5 && grp.length && adjacent && Math.floor(n.pc.beat + EPS) === Math.floor(grp[0].pc.beat + EPS)) grp.push(n);
          else { if (grp.length) groups.push(grp); grp = n.base <= 0.5 ? [n] : []; if (n.base > 0.5) groups.push([n]); }
        });
        if (grp.length) groups.push(grp);
        var sw = (0.12 * S).toFixed(2);
        groups.forEach(function (gr) {
          if (gr[0].base >= 4) return;
          if (gr.length === 1) {
            var n = gr[0], up = n.up, sx = up ? n.x + n.hw / 2 - 0.06 * S : n.x - n.hw / 2 + 0.06 * S;
            var y0 = up ? Math.max.apply(null, n.ys) : Math.min.apply(null, n.ys), tip = up ? Math.min.apply(null, n.ys) - 3.5 * S : Math.max.apply(null, n.ys) + 3.5 * S;
            n.g.push(line(sx, y0, sx, tip, sw, 'fb-stem'));
            if (n.base <= 0.5) n.g.push(MN.glyph('flag' + (n.base === 0.25 ? '16' : '8') + (up ? 'Up' : 'Down'), sx, tip, S));
            if (n.pc.trip) n.g.push(txt(n.x, up ? tip - 0.5 * S : tip + 1.4 * S, '3', 'fb-tuplet', ' font-size="' + (1.1 * S) + '" text-anchor="middle"'));
            return;
          }
          var gUp = cfg.up !== undefined ? cfg.up : gr.reduce(function (a, n) { return a + n.cen; }, 0) / gr.length < 4;
          var allY = [].concat.apply([], gr.map(function (n) { return n.ys; }));
          var beamY = gUp ? Math.min.apply(null, allY) - 3.3 * S : Math.max.apply(null, allY) + 3.3 * S, th = 0.48 * S, dir = gUp ? 1 : -1;
          var gsx = function (n) { return gUp ? n.x + n.hw / 2 - 0.06 * S : n.x - n.hw / 2 + 0.06 * S; };
          gr.forEach(function (n) {
            n.up = gUp;
            n.g.push(line(gsx(n), gUp ? Math.max.apply(null, n.ys) : Math.min.apply(null, n.ys), gsx(n), beamY, sw, 'fb-stem'));
          });
          var x1 = gsx(gr[0]), x2 = gsx(gr[gr.length - 1]);
          out.push('<rect class="fb-beam" x="' + x1.toFixed(1) + '" y="' + (gUp ? beamY : beamY - th).toFixed(1) + '" width="' + (x2 - x1 + 0.12 * S).toFixed(1) + '" height="' + th.toFixed(1) + '"/>');
          gr.forEach(function (n, i) {
            if (n.base !== 0.25) return;
            var y2 = beamY + dir * 0.8 * S, a, c, nb = gr[i + 1], pb = gr[i - 1];
            if (nb && nb.base === 0.25) { a = gsx(n); c = gsx(nb); }
            else if (pb && pb.base === 0.25) return;
            else if (pb) { a = gsx(n) - 1.1 * S; c = gsx(n); }
            else { a = gsx(n); c = gsx(n) + 1.1 * S; }
            out.push('<rect class="fb-beam" x="' + a.toFixed(1) + '" y="' + (gUp ? y2 : y2 - th).toFixed(1) + '" width="' + (c - a + 0.12 * S).toFixed(1) + '" height="' + th.toFixed(1) + '"/>');
          });
          if (gr.some(function (n) { return n.pc.trip; })) out.push(txt((x1 + x2) / 2, gUp ? beamY - 0.6 * S : beamY + 1.7 * S, '3', 'fb-tuplet', ' font-size="' + (1.1 * S) + '" text-anchor="middle"'));
        });
        infos.forEach(function (n) { n.g.push(n.heads.join('')); n.g.push('</g>'); out.push(n.g.join('')); });
      }
      // One bar of tablature: the fret on each string at the moment each note starts.
      function drawTabBar(b, xAt) {
        view.tab.forEach(function (e, idx) {
          if (e.start < b.start - EPS || e.start >= b.start + b.len - EPS) return;
          var x = xAt(e.start - b.start) + headW / 2;
          out.push('<g class="fb-tn" data-idx="' + idx + '">');
          e.f.forEach(function (sf) {
            var ty = tabTop + (sf[0] - 1) * tabGap, label = String(sf[1]), w = label.length * 0.72 * S + 0.3 * S;
            out.push('<rect class="fb-tab-bg" x="' + (x - w / 2).toFixed(1) + '" y="' + (ty - 0.62 * S).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (1.24 * S).toFixed(1) + '"/>');
            out.push(txt(x, ty + 0.45 * S, label, 'fb-tab-fret', ' font-size="' + (1.25 * S) + '" text-anchor="middle"'));
          });
          out.push('</g>');
        });
      }
    });

    // bass-staff and second-voice ties
    [bassPlaced, v2Placed].forEach(function (placedMap) { Object.keys(placedMap).forEach(function (idx) {
      var list = placedMap[idx];
      for (var i = 0; i < list.length - 1; i++) {
        var a = list[i], c = list[i + 1];
        if (!a.pc.tie) continue;
        var below = !a.up, bulge = below ? 1.1 * S : -1.1 * S, dy = below ? 0.55 * S : -0.55 * S;
        a.ys.forEach(function (yy, j) {
          var cy = c.ys[j] !== undefined ? c.ys[j] : yy;
          var arc = function (x1, x2, y1) { return '<path class="fb-tie" d="M' + x1.toFixed(1) + ' ' + (y1 + dy).toFixed(1) + ' Q' + ((x1 + x2) / 2).toFixed(1) + ' ' + (y1 + dy + bulge).toFixed(1) + ' ' + x2.toFixed(1) + ' ' + (y1 + dy).toFixed(1) + '" fill="none" stroke="currentColor" stroke-width="' + (0.16 * S).toFixed(2) + '"/>'; };
          if (a.sys === c.sys) out.push(arc(a.x + a.hw / 2 - 0.1 * S, c.x - c.hw / 2 + 0.1 * S, yy));
          else { out.push(arc(a.x + a.hw / 2, systems[a.sys].endX - 0.2 * S, yy)); out.push(arc(systems[c.sys].startX - 1.2 * S, c.x - c.hw / 2, cy)); }
        });
      }
    }); });

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
    sizeMeasureDiagrams(S);
    nowEls = []; barEls = {};
    sheetEl.querySelectorAll('.fb-bar').forEach(function (r) { barEls[r.getAttribute('data-bar')] = r; });
    scoreNav.refresh();
    paintLoop();
  }

  /* ================================================================ print notation */
  // Re-engraves the open score at paper width (zoom 1, four bars a line, whatever the screen is),
  // then cuts it between systems into letter pages with a title block. Built-in tunes and imported
  // scores (iReal, MusicXML, extra bass / tab staves) all print through the same path.
  var PRINT_W = 1000;           // engraving width in SVG units
  var PAPER_W = 694, PAPER_H = 915;   // letter minus lesson-print.css margins, in CSS px (a little slack)
  var PRINT_HEAD = 100, PRINT_RUN = 30, PRINT_FOOT = 40;
  var printRoot = null;

  function systemBands(svg) {
    var groups = svg.querySelectorAll('g.fb-system'), bands = [];
    if (groups.length) {
      Array.prototype.forEach.call(groups, function (g) { var b = g.getBBox(); bands.push({ top: b.y - 4, bottom: b.y + b.height + 4 }); });
      return bands;
    }
    // Drum chart: no groups, so find the rows by their staff lines.
    var ys = Array.prototype.map.call(svg.querySelectorAll('.fb-drum-staffline'), function (l) { return +l.getAttribute('y1'); })
      .filter(function (y, i, a) { return a.indexOf(y) === i; }).sort(function (a, b) { return a - b; });
    var cur = null;
    ys.forEach(function (y) {
      if (cur && y - cur.last < 30) cur.last = y; else { cur = { first: y, last: y }; bands.push(cur); }
    });
    return bands.map(function (b) { return { top: b.first - 30, bottom: b.last + 40 }; });
  }

  function printPages(svg) {
    var vb = svg.viewBox.baseVal, W = vb.width, H = vb.height, scale = PAPER_W / W;
    var bands = systemBands(svg), n = bands.length, cuts = [0], pages = [];
    if (!n) return [[0, H]];
    for (var i = 1; i < n; i++) cuts.push((bands[i - 1].bottom + bands[i].top) / 2);
    cuts.push(H);
    var room = function (k) { return (PAPER_H - (k ? PRINT_RUN : PRINT_HEAD)) / scale; };
    for (var a = 0; a < n;) {
      var cap = room(pages.length), b = a + 1;
      while (b < n && cuts[b + 1] - cuts[a] <= cap) b++;
      pages.push({ a: a, b: b });
      a = b;
    }
    // The source line sits under the last page's music: if it won't fit, the last system moves to a page of its own.
    var last = pages[pages.length - 1];
    if (last.b - last.a > 1 && cuts[last.b] - cuts[last.a] > room(pages.length - 1) - PRINT_FOOT / scale) {
      last.b--; pages.push({ a: last.b, b: n });
    }
    pages = pages.map(function (pg) { return [cuts[pg.a], cuts[pg.b]]; });
    return pages;
  }

  function endPrint() {
    document.body.classList.remove('fb-printing');
    if (printRoot) { printRoot.remove(); printRoot = null; }
  }
  window.addEventListener('afterprint', endPrint);

  // The per-bar diagram rows (sax fingerings, chord shapes) are HTML in a <foreignObject>. Safari lays that
  // out in its own coordinate space, so in a scaled, viewBox-sliced print page the diagrams drift off their
  // notes and onto the next system. In the print clone, redraw each row as native SVG at the same spot.
  function nativizeMeasureRows(c) {
    var NS = 'http://www.w3.org/2000/svg';
    Array.prototype.forEach.call(c.querySelectorAll('foreignObject.fb-measure-help'), function (fo) {
      var div = fo.firstElementChild, row = div && div.querySelector('.fb-measure-row');
      if (!row) return;
      var S = parseFloat(div.style.fontSize) || 10, x0 = Number(fo.getAttribute('x')) || 0, y0 = Number(fo.getAttribute('y')) || 0;
      var rowPx = (parseFloat(row.style.height) || 0) * S, g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'fb-print-shapes');
      Array.prototype.forEach.call(row.querySelectorAll('.fb-measure-shape'), function (sh) {
        var left = parseFloat(sh.style.left) || 0, w = parseFloat(sh.style.width) || 0, sax = sh.classList.contains('fb-sx');
        var lab = sh.querySelector('strong'), sv = sh.querySelector('svg');
        if (lab && lab.textContent) {
          var t = document.createElementNS(NS, 'text');
          t.setAttribute('x', (x0 + left + (sax ? w / 2 : 0)).toFixed(2));
          t.setAttribute('y', (y0 + S).toFixed(2));
          t.setAttribute('text-anchor', sax ? 'middle' : 'start');
          t.setAttribute('font-size', (1.1 * S).toFixed(2));
          t.setAttribute('font-weight', '700');
          t.setAttribute('font-family', 'DM Sans, sans-serif');
          t.setAttribute('fill', '#111');
          t.textContent = lab.textContent;
          g.appendChild(t);
        }
        var vw = sv && parseFloat(sv.style.width), vh = sv && parseFloat(sv.style.height);
        if (!vw || !vh) return;
        var n = sv.cloneNode(true);
        n.removeAttribute('style');
        n.setAttribute('x', (x0 + left + (sax ? (w - vw) / 2 : 0)).toFixed(2));
        n.setAttribute('y', (y0 + 1.7 * S).toFixed(2));
        n.setAttribute('width', vw.toFixed(2));
        n.setAttribute('height', vh.toFixed(2));
        g.appendChild(n);
      });
      fo.parentNode.insertBefore(g, fo);
      row.remove();
      if (div.children.length) { fo.setAttribute('y', (y0 + rowPx).toFixed(2)); fo.setAttribute('height', Math.max(0, Number(fo.getAttribute('height')) - rowPx).toFixed(2)); }
      else fo.remove();
    });
  }

  function printNotation() {
    if (!view || !tune) return;
    if (P) stop();
    endPrint();
    var prevZoom = opts.zoom, prevStyle = sheetEl.getAttribute('style'), svg, pages, W, clones = [];
    // Biggest engraving that doesn't add a page: a short tune is blown up to fill the sheet, a long
    // score keeps the size that needs the fewest pages. [engraving width, zoom] from largest to smallest.
    var tries = opts.sheetView === 'drums' ? [[620, 1], [700, 1], [900, 1], [1000, 1]] : [[1000, 2], [1000, 1.5], [700, 1], [900, 1], [1000, 1]];
    var engrave = function (cfg) {
      opts.zoom = cfg[1];
      sheetEl.style.width = cfg[0] + 'px';
      sheetEl.style.maxWidth = 'none';
      renderSheet();
      svg = sheetEl.querySelector('svg');
      // Bar click targets reach well past the staves and would make every system look taller than it is.
      if (svg) Array.prototype.forEach.call(svg.querySelectorAll('.fb-bar'), function (node) { node.remove(); });
      pages = svg ? printPages(svg) : null;
    };
    try {
      engrave(tries[tries.length - 1]);
      if (!svg) return;
      var fewest = pages.length;
      for (var k = 0; k < tries.length - 1; k++) {
        engrave(tries[k]);
        if (pages && pages.length <= fewest) break;
        if (k === tries.length - 2) engrave(tries[tries.length - 1]);
      }
      W = svg.viewBox.baseVal.width;
      pages.forEach(function (r) {
        var c = svg.cloneNode(true);
        c.removeAttribute('width'); c.removeAttribute('height');
        c.setAttribute('viewBox', '0 ' + r[0].toFixed(1) + ' ' + W + ' ' + (r[1] - r[0]).toFixed(1));
        c.setAttribute('focusable', 'false');
        // Click targets and playback highlights are screen-only.
        Array.prototype.forEach.call(c.querySelectorAll('.fb-bar'), function (node) { node.remove(); });
        Array.prototype.forEach.call(c.querySelectorAll('.is-sel, .is-now'), function (node) { node.classList.remove('is-sel', 'is-now'); });
        nativizeMeasureRows(c);
        clones.push(c.outerHTML);
      });
    } finally {
      opts.zoom = prevZoom;
      if (prevStyle === null) sheetEl.removeAttribute('style'); else sheetEl.setAttribute('style', prevStyle);
      renderSheet();
    }
    var esc = MN.escape;
    var title = el('[data-fb-title]').textContent, by = el('[data-fb-meta]').textContent;
    var keyline = el('[data-fb-keyline]').textContent, source = el('[data-fb-source]').textContent;
    var what = opts.sheetView === 'drums' ? 'Drum notation' : 'Lead sheet · ' + (INSTR[opts.instr] ? INSTR[opts.instr].label : '');
    var feel = STYLES[opts.style] ? STYLES[opts.style].label : '';
    var tempo = opts.tempo ? 'Tempo ' + opts.tempo + ' BPM' + (feel ? ' · ' + feel : '') : '';
    var count = clones.length;
    var pg = function (i) { return count > 1 ? '<span class="fb-print-pg">Page ' + (i + 1) + ' of ' + count + '</span>' : ''; };
    var html = clones.map(function (markup, i) {
      var head = i === 0
        ? '<header class="fb-print-title"><h1>' + esc(title) + '</h1>' + pg(i) +
          '<p class="fb-print-by">' + esc(by) + '</p><p class="fb-print-what">' + esc(what) + '</p>' +
          '<p class="fb-print-key">' + esc(keyline) + '</p><p class="fb-print-tempo">' + esc(tempo) + '</p></header>'
        : '<header class="fb-print-run"><strong>' + esc(title) + '</strong>' + pg(i) + '</header>';
      var foot = i === count - 1
        ? '<footer class="fb-print-foot">' + (source ? 'Source: ' + esc(source) + ' · ' : '') + 'Printed from Mr. Scandrett’s ClassroomOS · Fake Book · ' + esc(new Date().toLocaleDateString()) + '</footer>'
        : '';
      return '<section class="fb-print-page">' + head + '<div class="fb-print-score">' + markup + '</div>' + foot + '</section>';
    }).join('');
    printRoot = document.createElement('div');
    printRoot.className = 'fb-print-root';
    printRoot.setAttribute('aria-hidden', 'true');
    printRoot.innerHTML = html;
    document.body.appendChild(printRoot);
    document.body.classList.add('fb-printing');
    window.print();
  }

  /* ================================================================ audio */
  var ctx = null, master = null, bus = {}, kitBus = null;
  // Older iPad Pro models are now tight on Web Audio headroom in Safari.
  // Keep its audio thread clear of the most expensive niceties; notation and musical content
  // stay identical. iPadOS 13+ identifies itself as a Mac, hence the touch-point check.
  var iPadPlayback = /iPad/.test(navigator.userAgent || '') ||
    ((navigator.platform || '') === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (iPadPlayback) root.classList.add('fb-ipad-playback');
  function ensureAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    var kit = window.AudioKit && window.AudioKit.available() ? window.AudioKit : null;
    if (!AC) return false;
    // iPad Safari: Web Audio runs at the hardware rate and a second AudioContext on the page is resampled
    // against the first (wrong pitch/speed or crackle once the output route changes). Share AudioKit's one
    // context (the violin and tap-a-note previews already use it) instead of owning a private one.
    var next = kit ? kit.context({ latencyHint: 'playback' }) : ctx;
    if (!next) {
      // 'playback' asks iOS for bigger hardware buffers: far fewer underruns/crackles than the low-latency default.
      try { next = new AC({ latencyHint: 'playback' }); } catch (e) { next = new AC(); }
    }
    // 'playback' session: the iPad's silent switch must not mute the band.
    try { var session = navigator.audioSession; if (session && session.type !== 'playback') session.type = 'playback'; } catch (e) { /* read-only in some builds */ }
    if (next !== ctx) {
      ctx = next; master = null; bus = {};
      var wasRunning = ctx.state === 'running';
      ctx.addEventListener('statechange', function () {
        if (ctx.state === 'running') { wasRunning = true; return; }
        if (!wasRunning || ctx.state === 'closed') return;
        wasRunning = false;
        // A call, Siri or an app switch froze the clock; stop cleanly instead of leaving the playhead running over silence.
        if (P) { stop(); banner('Audio was interrupted (call, Siri or another app). Press Play to carry on.'); }
      });
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 20; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = iPadPlayback ? 0.6 : 0.8;
      master.connect(comp);
      // A stereo convolution runs for the whole performance. It is a disproportionate cost on
      // older iPads and competes with Safari's audio renderer, so those devices use the dry mix.
      if (!iPadPlayback) {
        var verb = ctx.createConvolver(), len = Math.floor(ctx.sampleRate * 1.2), imp = ctx.createBuffer(2, len, ctx.sampleRate);
        for (var c = 0; c < 2; c++) { var d = imp.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
        verb.buffer = imp;
        var wet = ctx.createGain(); wet.gain.value = 0.16;
        master.connect(verb); verb.connect(wet); wet.connect(comp);
      }
      // The 4:1 compressor above is a leveller, not a ceiling: stacked voices could still pass 0 dBFS and clip.
      // A fast hard limiter last keeps peaks under it.
      var limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -2; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.1;
      // The compressor-as-limiter has attack time and automatic makeup gain, so a loud chord + drum hit can still
      // overshoot full scale and clip the iPad's DAC. A tanh soft clipper last makes the output mathematically
      // incapable of exceeding +/-1: any overshoot is rounded off instead of hard-clipped.
      var clip = ctx.createWaveShaper(), curve = new Float32Array(2049);
      for (var ci = 0; ci < curve.length; ci++) curve[ci] = Math.tanh((ci / 1024 - 1) * 1.2) / Math.tanh(1.2) * 0.98;
      clip.curve = curve;
      comp.connect(limiter); limiter.connect(clip); clip.connect(ctx.destination);
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
  // Live synth voices. Stacked chord, bass and lead notes on a 2017 iPad Pro overload the mix (and the audio thread),
  // so past the cap a new note is skipped rather than clipping everything already sounding.
  var liveVoices = 0, MAX_LIVE = iPadPlayback ? 18 : 40;
  function claimVoice(osc) {
    if (liveVoices >= MAX_LIVE) return false;
    liveVoices++;
    osc.onended = function () { liveVoices = Math.max(0, liveVoices - 1); };
    return true;
  }
  function voiceLead(out, t, dur, m, vel) {
    if (liveVoices >= MAX_LIVE) return;
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
    claimVoice(o1);
    [o1, o2, lfo].forEach(function (o) { o.start(t); o.stop(end + 0.4); });
  }
  function voicePiano(out, t, dur, m, vel) {
    if (liveVoices >= MAX_LIVE) return;
    var end = t + Math.max(0.1, dur), g = ctx.createGain();
    // One oscillator and no per-note filter cuts the live node count by roughly two thirds on
    // iPad. Chords remain pitched and articulated, but leave enough DSP time for drums and bass.
    if (iPadPlayback) {
      var simple = ctx.createOscillator();
      simple.type = 'triangle'; simple.frequency.value = hz(m);
      simple.connect(g); g.connect(out);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.008);
      g.gain.setTargetAtTime(vel * 0.22, t + 0.008, 0.38);
      g.gain.setTargetAtTime(0.0001, end, 0.07);
      claimVoice(simple); simple.start(t); simple.stop(end + 0.45);
      return;
    }
    var f = ctx.createBiquadFilter(), o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o1.type = 'triangle'; o2.type = 'sine'; o1.frequency.value = hz(m); o2.frequency.value = hz(m) * 2; g2.gain.value = 0.25;
    f.type = 'lowpass'; f.frequency.setValueAtTime(4200, t); f.frequency.setTargetAtTime(1600, t, 0.4);
    o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.006);
    g.gain.setTargetAtTime(vel * 0.25, t + 0.006, 0.45);
    g.gain.setTargetAtTime(0.0001, end, 0.09);
    claimVoice(o1); o1.start(t); o2.start(t); o1.stop(end + 0.6); o2.stop(end + 0.6);
  }
  function voiceBass(out, t, dur, m, vel) {
    if (liveVoices >= MAX_LIVE) return;
    var end = t + Math.max(0.08, dur * 0.92), g = ctx.createGain(), f = ctx.createBiquadFilter();
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o1.type = 'sine'; o2.type = 'triangle'; o1.frequency.value = hz(m); o2.frequency.value = hz(m); g2.gain.value = 0.5;
    f.type = 'lowpass'; f.frequency.setValueAtTime(1400, t); f.frequency.setTargetAtTime(500, t, 0.08);
    o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.008);
    g.gain.setTargetAtTime(vel * 0.45, t + 0.008, 0.2);
    g.gain.setTargetAtTime(0.0001, end, 0.04);
    claimVoice(o1); o1.start(t); o2.start(t); o1.stop(end + 0.3); o2.stop(end + 0.3);
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
      bars: song.bars.length,
      sectionsByBar: sectionsByBar,
      chordsOnly: true,
      imported: true,
      about: (song.sections ? 'Form: ' + song.sections + '. ' : '') + song.bars.length + ' bars unrolled from iReal Pro chart.',
      source: 'Imported iReal Pro chord chart (kept in this browser only).'
    };
  }

  // A MusicXML score (fake-book-musicxml.js has already turned it into fake-book notation).
  function musicxmlToTune(song, fileName) {
    var format = song.format || 'MusicXML';
    var M = song.meter[0] * 4 / song.meter[1], meterFor = M === 3 ? [3, 4] : [4, 4];
    var band = song.style ? mapBandStyle(song.style, meterFor) : (M === 3 ? 'waltz' : 'rock');
    var tempo = song.tempo > 0 ? Math.max(40, Math.min(240, song.tempo)) : defaultTempo(band, meterFor);
    var title = song.title || ((fileName || '').replace(/\.(musicxml|mxl|xml|gtp)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Untitled') + (song.part ? ' · Part ' + song.part : '');
    return {
      id: 'import-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      title: title,
      composer: song.composer || 'Unknown composer',
      year: 'Imported ' + format + ' score',
      style: song.style || STYLES[band].label,
      level: 'Imported',
      key: song.key,
      mode: song.minor ? 'minor' : 'major',
      meter: song.meter,
      tempo: tempo,
      band: band,
      feel: STYLES[band].feel,
      pickup: song.pickup,
      melody: song.melody,
      chords: song.chords,
      bars: song.bars,
      staves: song.staves && (song.staves.bass || song.staves.tab || song.staves.gtr || song.staves.voice2) ? song.staves : undefined,
      keyChanges: song.keyChanges && song.keyChanges.length ? song.keyChanges : undefined,
      score: song.score,
      guitarPro: song.guitarPro,
      imported: true,
      about: song.bars + ' bars from a ' + format + ' score' + (song.unrolled ? ', with its repeats played out in order' : '') + '. ' + song.warnings.join(' '),
      source: 'Imported ' + format + ' score (kept in this browser only).'
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
  function scoreTiming() { return opts.mode === 'score' || opts.mode === 'changes'; }
  function swingOn() { return !scoreTiming() && opts.feel === 'swing'; }
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

  var startPending = false;
  function play(immediate) {
    if (!ensureAudio()) return;
    // iOS resumes a suspended context asynchronously; anchoring to its frozen clock would make the first notes late (and dropped).
    if (ctx.state !== 'running') {
      if (startPending) return;
      startPending = true;
      var go = function () { startPending = false; if (ctx.state === 'running') play(immediate); };
      var rp; try { rp = ctx.resume(); } catch (e) { rp = null; }
      if (rp && rp.then) rp.then(go, function () { startPending = false; }); else startPending = false;
      return;
    }
    stop();
    hideBarPop();
    var M = tune.M, r = loopRange();
    // Playing from a clicked bar: the first pass starts there, later passes wrap back to the loop start.
    var sb = startBar >= r.from && startBar <= r.to ? startBar : r.from, first = { from: sb, to: r.to };
    var withPickup = !immediate && first.from === 1 && tune.pickup > 0, noClick = immediate || opts.click === 'none';
    var lanes = {};
    Object.keys(bus).forEach(function (k) { lanes[k] = ctx.createGain(); lanes[k].connect(bus[k]); });
    P = {
      lanes: lanes, kit: window.DrumEngine ? window.DrumEngine.create(ctx, lanes.drums) : null,
      spb: 60 / opts.tempo, anchorBeat: 0, anchorTime: ctx.currentTime + (immediate ? 0.02 : 0.12),
      queue: [], qi: 0, ui: [], range: r, first: first, chorusLen: passLen(r), firstLen: passLen(first), k: 0,
      bodyStart: noClick ? (withPickup ? tune.pickup : 0) : (withPickup ? 2 : 1) * M, withPickup: withPickup, timer: 0, raf: 0
    };
    P.scoreLanes = {};
    if (opts.mode === 'score') tune.raw.score.parts.forEach(function (part) {
      var gain = ctx.createGain(); gain.connect(lanes.piano); P.scoreLanes[part.id] = gain;
    });
    updateScoreGains();
    // count-in bar, then (for tunes with a pickup) a bar of clicks that ends with the pickup notes
    for (var b = noClick ? P.bodyStart : 0; b < P.bodyStart; b++) {
      P.queue.push({ b: b, kind: 'click', level: b % M === 0 ? 2 : 1 });
      P.queue.push({ b: b, kind: 'ui', ui: 'beat', n: b % M, count: true, label: b < M ? 'Count in: ' + (b % M + 1) : 'Pickup: the tune starts before bar 1' });
    }
    appendChorus(0);
    P.timer = setInterval(tick, 25);
    tick();
    P.raf = requestAnimationFrame(uiLoop);
    setPlaying(true);
  }
  var startBar = 0;
  function passLen(rg) { return scoreTiming() ? scoreRange(rg).len : (rg.to - rg.from + 1) * tune.M; }
  // Where pass k begins on the beat clock, its range and its length (pass 0 may start mid-tune).
  function passInfo(k) {
    var rg = k === 0 ? P.first : P.range;
    return { rg: rg, len: k === 0 ? P.firstLen : P.chorusLen, off: k === 0 ? P.bodyStart : P.bodyStart + P.firstLen + (k - 1) * P.chorusLen, pickup: rg.from === 1 && tune.pickup > 0 };
  }
  var scorePractice = {};
  function scoreRange(r) {
    var bars = tune.raw.score.bars, first = bars.filter(function (b) { return b.bar === r.from; })[0], last = bars.filter(function (b) { return b.bar === r.to; })[0];
    return { start: first.start, len: last.start + last.len - first.start };
  }
  function updateScoreGains() {
    if (!P || !P.scoreLanes) return;
    var solo = Object.keys(scorePractice).some(function (id) { return scorePractice[id].solo; });
    Object.keys(P.scoreLanes).forEach(function (id) {
      var state = scorePractice[id] || {};
      P.scoreLanes[id].gain.setTargetAtTime(state.mute || (solo && !state.solo) ? 0 : 1, ctx.currentTime, 0.01);
    });
  }
  function renderScoreParts() {
    var wrap = el('[data-fb-score-parts]'), score = tune.raw.score;
    if (wrap.querySelector('details')) wrap.dataset.open = wrap.querySelector('details[open]') ? '1' : '0';   // keep it as the reader left it
    wrap.hidden = !score || opts.mode !== 'score';
    wrap.innerHTML = score ? '<details class="fb-voices"' + (wrap.dataset.open === '1' ? ' open' : '') + '><summary>Voices · mute or solo (' + score.parts.length + ')</summary><p>All written voices sound on piano. The sheet shows the melody, a bass reduction and tab. Use the Piano volume in Band settings to adjust score volume. Play the written voices. Tempo changes speed without changing pitch. Mute a voice to play it yourself, or solo voices to listen closely.</p>' + score.parts.map(function (p, i) {
      var state = scorePractice[p.id] || {};
      return '<fieldset><legend>' + MN.escape(p.label) + '</legend><label><input type="checkbox" data-score-mute="' + i + '"' + (state.mute ? ' checked' : '') + '> Mute</label> <label><input type="checkbox" data-score-solo="' + i + '"' + (state.solo ? ' checked' : '') + '> Solo</label></fieldset>';
    }).join('') + '</details>' : '';
  }
  function appendScore(k) {
    var score = tune.raw.score, pi = passInfo(k), r = pi.rg, span = scoreRange(r), off = pi.off;
    var lo = pi.pickup ? -tune.pickup : span.start, hi = span.start + span.len, add = [];
    if (opts.mode === 'score') score.notes.forEach(function (n) {
      if (n.start + n.dur <= lo + EPS || n.start >= hi - EPS) return;
      var start = Math.max(n.start, lo);
      add.push({ b: off + start - span.start, kind: 'score', part: n.part, m: n.midi, dur: Math.min(n.start + n.dur, hi) - start });
    });
    if (opts.mode === 'changes') view.concertChords.forEach(function (chord, ci) {
      if (chord.start + chord.dur <= lo + EPS || chord.start >= hi - EPS) return;
      // A reduction is a practice suggestion. Do not add a chord over silent music.
      if (!score.notes.some(function (n) { return n.start < chord.start + chord.dur && n.start + n.dur > chord.start; })) return;
      var grip = gripFor(ci);
      var notes = opts.posInst === 'guitar' && grip && grip.notes && grip.notes.length ? grip.notes : view.voicings[ci];
      var start = Math.max(chord.start, lo), duration = Math.min(chord.start + chord.dur, hi) - start;
      if (notes && notes.length) add.push({ b: off + start - span.start, kind: 'pno', ms: notes, dur: Math.max(.05, duration * .95), vel: .65, ci: ci });
      add.push({ b: off + start - span.start, kind: 'ui', ui: 'chord', ci: ci });
    });
    score.bars.forEach(function (b) {
      if (b.bar < r.from || b.bar > r.to) return;
      add.push({ b: off + b.start - span.start, kind: 'ui', ui: 'bar', bar: b.bar, meter: b.meter });
      for (var bt = 0; bt < b.len - EPS; bt += 4 / b.meter[1]) {
        add.push({ b: off + b.start + bt - span.start, kind: 'ui', ui: 'beat', n: Math.round(bt * b.meter[1] / 4) });
        var beatIndex = Math.round(bt * b.meter[1] / 4);
        var clickOn = opts.click === 'all' || (opts.click === 'one' && beatIndex === 0) ||
          (opts.click === 'backbeat' && (b.meter[0] === 3 ? beatIndex > 0 : beatIndex % 2 === 1)) ||
          (opts.click === 'gap' && Math.floor((b.bar - r.from) / 2) % 2 === 0);
        if (clickOn) add.push({ b: off + b.start + bt - span.start, kind: 'click', level: bt === 0 && opts.click !== 'backbeat' ? 2 : 1 });
      }
    });
    var times = {};
    if (opts.mode === 'score') [view.concert, view.bass || [], view.tab || []].forEach(function (events) { events.forEach(function (e) { if (e.start >= lo - EPS && e.start < hi - EPS) times[e.start] = true; if (e.dur && e.start + e.dur >= lo && e.start + e.dur < hi) times[e.start + e.dur] = true; }); });
    Object.keys(times).forEach(function (t) { add.push({ b: off + Number(t) - span.start, kind: 'ui', ui: 'score-note', start: Number(t) }); });
    if (!opts.loop) add.push({ b: off + pi.len, kind: 'end' });
    P.queue = P.queue.slice(P.qi).concat(add).sort(function (a, b) { return a.b - b.b; }); P.qi = 0;
  }
  function appendChorus(k) {
    if (scoreTiming() && tune.raw.score) { appendScore(k); return; }
    var M = tune.M, pi = passInfo(k), r = pi.rg, off = pi.off, tuneOff = (r.from - 1) * M;
    var g = function (tt) { return off + tt - tuneOff; };
    var add = [];
    var mel = view.concert;
    mel.forEach(function (e, idx) {
      var inPickup = e.start < 0;
      if (inPickup ? !pi.pickup : (e.start < tuneOff - EPS || e.start >= tuneOff + pi.len - EPS)) return;
      var bar = inPickup ? 0 : Math.floor(e.start / M + EPS) + 1;
      add.push({ b: g(e.start), kind: 'ui', ui: 'note', idx: idx });
      if (e.p) add.push({ b: g(e.start), kind: 'mel', m: e.p.midi, dur: e.dur, bar: bar });
    });
    for (var bar = r.from; bar <= r.to; bar++) {
      var b0 = g((bar - 1) * M);
      add.push({ b: b0, kind: 'ui', ui: 'bar', bar: bar, yours: yours(bar, P.range.from) });
      for (var bt = 0; bt < M; bt++) {
        add.push({ b: b0 + bt, kind: 'ui', ui: 'beat', n: bt });
        var on = opts.click === 'all' || (opts.click === 'one' && bt === 0) ||
          (opts.click === 'backbeat' && (M === 3 ? bt > 0 : bt % 2 === 1)) ||
          (opts.click === 'gap' && Math.floor((bar - r.from) / 2) % 2 === 0);
        if (on) add.push({ b: b0 + bt, kind: 'click', level: bt === 0 && opts.click !== 'backbeat' ? 2 : 1 });
      }
    }
    view.concertChords.forEach(function (c, ci) {
      if (c.start >= tuneOff - EPS && c.start < tuneOff + pi.len - EPS) {
        add.push({ b: g(c.start), kind: 'ui', ui: 'chord', ci: ci });
      }
    });
    if (opts.mode !== 'melody' && opts.mode !== 'click') {
      // With a bass line in the score, the band's bass player can play it instead of making one up.
      var scoreBass = opts.bassLine !== 'band' && view.bass;
      bandBars(opts.style, view.concertChords, view.voicings, M, r.from, r.to).forEach(function (e) {
        if (scoreBass && e.kind === 'bass') return;
        e.b = g(e.t); add.push(e);
      });
      if (scoreBass) {
        var lo = (r.from - 1) * M, hi = r.to * M;
        view.bass.forEach(function (e) {
          if (e.start < lo - EPS || e.start >= hi - EPS) return;
          var m = e.ps[0].midi;
          while (m < 28) m += 12;
          while (m > 55) m -= 12;
          add.push({ b: g(e.start), kind: 'bass', m: m, dur: Math.max(0.1, Math.min(e.dur, hi - e.start) - 0.05), vel: 0.75 });
        });
      }
    }
    if (!opts.loop) add.push({ b: off + pi.len, kind: 'end' });
    var rest = P.queue.slice(P.qi).concat(add);
    rest.sort(function (a, b) { return a.b - b.b; });
    P.queue = rest; P.qi = 0;
  }
  // Seconds of music queued ahead. Safari can stall timers for 100ms+ while it repaints the score, so keep a cushion.
  var LOOKAHEAD = iPadPlayback ? 0.65 : 0.4, LATE_DROP = iPadPlayback ? 0.2 : 0.12;
  function tick() {
    if (!P) return;
    var now = ctx.currentTime, horizon = beatAt(now + LOOKAHEAD);
    var cur = passInfo(P.k), chorusEnd = cur.off + cur.len;
    if (opts.loop && horizon > chorusEnd - tune.M - (tune.pickup > 0 && P.range.from === 1 ? tune.pickup : 0)) appendChorus(++P.k);
    while (P.qi < P.queue.length && P.queue[P.qi].b < horizon) fire(P.queue[P.qi++]);
  }
  function fire(e) {
    var t = Math.max(ctx.currentTime, timeAt(e.b)), L = P.lanes;
    // A note that missed its slot by more than LATE_DROP would land on top of the next ones; skip it instead of bunching.
    if (ctx.currentTime - timeAt(e.b) > LATE_DROP && (e.kind === 'mel' || e.kind === 'pno' || e.kind === 'bass' || e.kind === 'drum' || e.kind === 'click' || e.kind === 'score')) return;
    switch (e.kind) {
      case 'score': {
        var shift = shiftBetween(tune.key, view.concertKey).semis;
        voicePiano(P.scoreLanes[e.part], t, timeAt(e.b + e.dur) - t, e.m + shift, 0.32); break;
      }
      case 'mel':
        if (opts.mode === 'band' || opts.mode === 'click' || yours(e.bar, P.range.from)) return;
        voiceLead(L.melody, t, timeAt(e.b + e.dur) - t, e.m, 0.5); break;
      case 'pno': {
        var end = timeAt(e.b + e.dur);
        e.ms.forEach(function (m, i) { voicePiano(L.piano, t + (opts.style === 'ballad' ? i * 0.025 : 0), end - t, m, e.vel * 0.45); });
        break;
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
    while (P && P.ui.length && P.ui[0].t <= now) applyUi(P.ui.shift());
    if (P) {
      // Updating notation at 30 fps is visually smooth while halving Safari's style/paint work.
      // Audio remains scheduled against the AudioContext clock and is not throttled here.
      if (iPadPlayback) P.uiTimer = setTimeout(function () { P && (P.raf = requestAnimationFrame(uiLoop)); }, 16);
      else P.raf = requestAnimationFrame(uiLoop);
    }
  }
  function stop() {
    if (!P) return;
    clearInterval(P.timer); cancelAnimationFrame(P.raf); clearTimeout(P.uiTimer);
    var t = ctx.currentTime;
    Object.keys(P.lanes).forEach(function (k) {
      var g = P.lanes[k];
      g.gain.setTargetAtTime(0, t, 0.03);
      setTimeout(function () { try { g.disconnect(); } catch (e) { /* gone */ } }, 400);
    });
    P = null;
    setPlaying(false);
    clearNow();
    scoreNav.setCurrent(-1);
    beatDots(-1);
    banner('');
  }

  /* ================================================================ UI */
  var el = function (sel) { return root.querySelector(sel); };
  var playBtn = el('[data-fb-play]'), floatingStop = el('[data-fb-floating-stop]'), dotsEl = el('[data-fb-dots]'), bannerEl = el('[data-fb-banner]');
  var musicScroller = root.closest('.ll-sim') || document.scrollingElement;
  function setPlaying(on) {
    playBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    playBtn.querySelector('span').textContent = on ? 'Stop' : 'Play';
    root.classList.toggle('is-playing', on);
    floatingStop.hidden = !on;
  }
  function clearNow() {
    paintChangesNow(0);
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
      if (e.meter) { dotsEl.innerHTML = new Array(e.meter[0] + 1).join('<i></i>'); banner('Bar ' + e.bar + ' · ' + e.meter.join('/')); }
      paintChangesNow(e.bar);
      scoreNav.setCurrent(barEls[e.bar] ? scoreNav.indexOf(barEls[e.bar]) : -1);
    } else if (e.ui === 'score-note') {
      nowEls.forEach(function (n) { n.classList.remove('is-now'); }); nowEls = [];
      [['.fb-n', view.concert], ['.fb-sx:not(.fb-sxb)', view.concert], ['.fb-sxb', view.bass || []], ['.fb-bn', view.bass || []], ['.fb-v2n', view.voice2 || []], ['.fb-tn', view.tab || []]].forEach(function (lane) {
        lane[1].forEach(function (n, i) { if (n.start <= e.start + EPS && (n.dur ? n.start + n.dur : (lane[1][i + 1] ? lane[1][i + 1].start : tune.len)) > e.start + EPS) {
          nowEls = nowEls.concat(Array.prototype.slice.call(sheetEl.querySelectorAll(lane[0] + '[data-idx="' + i + '"]')));
          if (lane[0] === '.fb-n' && melodyView) melodyView.setCursor(i);
        } });
      });
      nowEls.forEach(function (n) { n.classList.add('is-now'); });
    } else if (e.ui === 'note') {
      nowEls.forEach(function (n) { n.classList.remove('is-now'); });
      nowEls = Array.prototype.slice.call(sheetEl.querySelectorAll('.fb-n[data-idx="' + e.idx + '"], .fb-sx:not(.fb-sxb)[data-idx="' + e.idx + '"]'));
      nowEls.forEach(function (n) { n.classList.add('is-now'); });
      if (melodyView) melodyView.setCursor(e.idx);
    } else if (e.ui === 'chord') { if (e.ci !== chordSel) { chordSel = e.ci; showChord(false); } }
    else if (e.ui === 'end') stop();
  }
  // ---- liner notes: where the tune comes from and how it is traditionally played
  function renderLiner(liner) {
    var box = el('[data-fb-liner]');
    if (!box) return;
    // Imported charts have no notes: keep the drawer page but say so.
    box.querySelectorAll('.fb-liner-cols, .fb-liner-foot').forEach(function (n) { n.hidden = !liner; });
    el('[data-fb-liner-empty]').hidden = !!liner;
    el('[data-fb-liner-tune]').textContent = tune ? tune.raw.title + (tune.raw.year ? ' · ' + tune.raw.year : '') : '';
    if (!liner) return;
    el('[data-fb-liner-origins]').textContent = liner.origins || '';
    el('[data-fb-liner-tradition]').textContent = liner.tradition || '';
    el('[data-fb-liner-listen]').innerHTML = (liner.listen || []).map(function (r) { return '<li>' + MN.escape(r) + '</li>'; }).join('');
    el('[data-fb-liner-try]').textContent = liner.try || '';
  }

  // ---- chord chart ("the changes"), one cell per bar
  function renderChanges() {
    var list = el('[data-fb-changes]');
    if (!list || !view) return;
    var written = !(opts.instr === 'concert' || opts.instr === 'bass');
    var byBar = {};
    view.concertChords.forEach(function (c, i) {
      (byBar[c.bar] = byBar[c.bar] || []).push(i);
    });
    var first = Math.min(1, Math.min.apply(null, Object.keys(byBar).map(Number).concat([1])));
    var html = [];
    for (var b = first; b <= tune.bars; b++) {
      var cis = byBar[b] || [];
      var cells = cis.length ? cis.map(function (ci) {
        var name = chordName(written ? view.writtenChords[ci] : view.concertChords[ci]);
        return '<button type="button" class="fb-chg-chord" data-chg-ci="' + ci + '">' + MN.escape(name) + '</button>';
      }).join('') : '<span class="fb-chg-same" title="Same chord as before">%</span>';
      html.push('<li class="fb-chg-bar" data-chg-bar="' + b + '"><span class="fb-chg-num">' + (b < 1 ? 'pickup' : b) + '</span>' + cells + '</li>');
    }
    list.innerHTML = html.join('');
    paintChangesLoop();
  }
  function paintChangesNow(bar) {
    var list = el('[data-fb-changes]');
    if (!list) return;
    list.querySelectorAll('.is-now').forEach(function (n) { n.classList.remove('is-now'); });
    var cell = bar && list.querySelector('[data-chg-bar="' + bar + '"]');
    if (!cell) return;
    cell.classList.add('is-now');
    // Keep the playing bar visible inside the drawer without moving the page.
    var box = list.closest('.fb-drawer-body');
    if (!box || !list.offsetParent) return;
    var br = box.getBoundingClientRect(), cr = cell.getBoundingClientRect();
    if (cr.top < br.top || cr.bottom > br.bottom) box.scrollTop += cr.top - br.top - box.clientHeight / 3;
  }
  function paintChangesLoop() {
    var list = el('[data-fb-changes]');
    if (!list || !tune) return;
    var r = loopRange(), full = r.from === 1 && r.to === tune.bars;
    list.querySelectorAll('[data-chg-bar]').forEach(function (li) {
      var b = Number(li.getAttribute('data-chg-bar'));
      li.classList.toggle('in-loop', !full && b >= r.from && b <= r.to);
    });
  }

  // ---- library
  function renderLibrary() {
    var builtInList = el('[data-fb-library]');
    if (builtInList) {
      builtInList.innerHTML = defaultTunes.map(function (raw) {
        return '<div class="fb-tune-item">' +
          '<button type="button" class="fb-tune" data-tune="' + raw.id + '" aria-pressed="' + (raw.id === (tune ? tune.id : opts.tune) ? 'true' : 'false') + '">' +
          '<strong>' + MN.escape(raw.title) + '</strong>' +
          '<small>' + MN.escape(raw.composer) + '</small>' +
          '<span class="fb-tune-tags"><em>' + (raw.chordsOnly ? 'Chords only' : 'Melody + chords') + '</em><em>' + MN.escape(raw.style) + '</em><em>' + MN.escape(raw.key.replace('b', '♭').replace('#', '♯') + (raw.mode === 'minor' ? ' minor' : '')) + '</em><em>' + raw.meter.join('/') + '</em><em>' + MN.escape(raw.level) + '</em></span></button>' +
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
            '<span class="fb-tune-tags"><em class="fb-tag-imported">' + (raw.score ? 'Full score playback' : raw.chordsOnly ? 'Chords only' : 'Melody + chords') + '</em><em>' + MN.escape(raw.key.replace('b', '♭').replace('#', '♯') + (raw.mode === 'minor' ? ' minor' : '')) + '</em><em>' + raw.meter.join('/') + '</em><em>' + raw.bars + ' bars</em></span></button>' +
            '<button type="button" class="fb-tune-print" data-print-tune="' + raw.id + '" aria-label="Print ' + MN.escape(raw.title) + '" title="Print this score">🖨</button>' +
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

  function addImports(newTunes, msg) {
    importedTunes = importedTunes.concat(newTunes);
    var saved = saveImports();
    tunes = defaultTunes.concat(importedTunes);
    renderLibrary();
    selectTune(newTunes[0].id, true);
    importFeedback(msg, false);
    saved.then(function (ok) {
      var fb = el('[data-fb-import-feedback]');
      if (ok || !fb || fb.textContent !== msg) return;     // a newer message has replaced this one
      importFeedback(msg + ' But this browser could not save it (storage is full or blocked), so it will be gone when you reload. Remove imports you no longer need to make room.', true);
    });
    var inputEl = el('[data-fb-import-input]');
    if (inputEl) inputEl.value = '';
  }

  var MX = window.FakeBookMusicXML;
  function importMusicXML(promise, fileName) {
    if (!MX) { importFeedback('The MusicXML reader is not available. Please refresh the page.', true); return; }
    importFeedback('Reading the score…', false);
    promise.then(function (songs) {
      songs = [].concat(songs);
      var raws = songs.map(function (song) {
        var raw = musicxmlToTune(song, fileName);
        parseTune(raw);                     // throws if anything didn't convert cleanly
        return raw;
      });
      var raw = raws[0], song = songs[0];
      var extras = [raw.staves && raw.staves.bass ? 'bass clef' : '', raw.staves && raw.staves.tab ? 'tab' : ''].filter(Boolean);
      var what = (raw.score ? ' with full score playback and its melody' : ' with its melody') + (extras.length ? (extras.length > 1 ? ', ' : ' and ') + extras.join(' and ') : '');
      if (raws.length === 1) {
        addImports(raws, 'Imported "' + raw.title + '"' + what + ' (' + raw.bars + ' bars).' + (song.warnings.length ? ' ' + song.warnings.join(' ') : ''));
        return;
      }
      // Meter changes (or a very long score): one song per part, in order.
      var notes = [];
      songs.forEach(function (sg) { sg.warnings.slice(1).forEach(function (w) { if (notes.indexOf(w) < 0) notes.push(w); }); });
      addImports(raws, 'Imported "' + raw.title.replace(/ · Part 1$/, '') + '"' + what + ' as ' + raws.length + ' songs, one per part: ' +
        songs.map(function (sg, i) { return 'Part ' + (i + 1) + ' = bars ' + sg.fromBar + '–' + sg.toBar + ' (' + sg.meter.join('/') + ')'; }).join(', ') +
        '. The fake book plays one time signature per song.' + (notes.length ? ' ' + notes.join(' ') : ''));
    }).catch(function (err) {
      console.error('[fake-book] MusicXML import error:', err);
      importFeedback('Could not import that score: ' + err.message, true);
    });
  }
  // What a file really is, from its first bytes. iPad and cloud pickers hand over renamed or extension-less files
  // ("song.gp5 (1)", "Document"), so the name alone can't be trusted.
  function sniffKind(bytes) {
    function ascii(from, to) { var s = ''; for (var i = from; i < Math.min(to, bytes.length); i++) s += String.fromCharCode(bytes[i]); return s; }
    if (ascii(0, 5) === '%PDF-') return 'pdf';
    if (/^FICHIER GUITARE? PRO/.test(ascii(1, 31)) || /^BCF[ZS]/.test(ascii(0, 4))) return 'gp';
    return '';
  }
  function openPDF(file) {
    var desk = window.FakeBookPDFDesk;
    if (!desk || !desk.open) { importFeedback('That is a PDF. Open it with “Open PDF” in the PDF fake book section below (it is for indexing and transcribing, not instant playback).', true); return; }
    importFeedback('That is a PDF, so it opened in the PDF fake book section below. Match its page numbers there, then copy a melody and chords into playable notation. PDFs are not played directly.', false);
    desk.open(file);
  }
  function importFile(file) {
    var name = file.name || '';
    // Read the header first: it decides the reader for PDFs, renamed Guitar Pro files and extension-less picks.
    file.slice(0, 64).arrayBuffer().then(function (head) {
      var kind = sniffKind(new Uint8Array(head));
      if (kind === 'pdf' || /\.pdf$/i.test(name)) { openPDF(file); return; }
      if (kind === 'gp' || /\.(gtp|gp3|gp4|gp5|gpx|gp|gp7|gp8)(\b|$)/i.test(name)) { importGuitarPro(file); return; }
      importScoreOrChart(file);
    }).catch(function () { importFeedback('Could not read “' + name + '”. If it is in iCloud Drive, tap it in Files first so it downloads, then choose it again.', true); });
  }
  function importGuitarPro(file) {
    var gpReader = window.FakeBookGuitarPro || (/\.gtp$/i.test(file.name) ? window.FakeBookGTP : null);
    if (!gpReader || !MX) { importFeedback('The Guitar Pro reader is not available. Please refresh the page.', true); return; }
    if (file.size > 8 * 1024 * 1024) { importFeedback('Guitar Pro files must be smaller than 8 MB.', true); return; }
    importMusicXML(file.arrayBuffer().then(function (buf) { return gpReader.parseFile(new Uint8Array(buf), MX); }), file.name);
  }
  function importScoreOrChart(file) {
    file.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      if (!MX) { handleImportText(new TextDecoder().decode(bytes)); return; }
      var text = MX.isZip(bytes) ? '' : MX.decodeText(bytes);
      // Binary data decodes to text full of NULs/replacement characters: that is not a chart, so say so plainly.
      if (text && /[\u0000\ufffd]/.test(text.slice(0, 2000)) && !MX.looksLikeIReal(text)) { importFeedback('“' + file.name + '” is not a MusicXML, Guitar Pro, iReal Pro or PDF file this page can read. Export it as MusicXML (.musicxml or .mxl) and try again.', true); return; }
      // iReal links and exports always contain irealb://; anything else that is XML or zipped goes to the score reader.
      if (text && MX.looksLikeIReal(text)) handleImportText(text);
      else if (!text || /\.(musicxml|mxl|xml|mscx|mscz)$/i.test(file.name) || /^\s*(\ufeff)?<\?xml|<score-|<museScore/i.test(text)) importMusicXML(MX.parseFile(bytes, { score: true }), file.name);
      else handleImportText(text);
    }).catch(function () { importFeedback('Could not read the selected file.', true); });
  }

  function handleImportText(text) {
    text = (text || '').trim();
    if (!text) {
      importFeedback('Paste an iReal Pro link (irealb:// or irealbook://), or choose a MusicXML or iReal HTML file.', true);
      return;
    }
    if (MX && !MX.looksLikeIReal(text) && (MX.looksLikeMusicXML(text) || /^\ufeff?<\?xml/.test(text))) {
      importMusicXML(new Promise(function (ok) { ok(MX.parseScore(text)); }), '');
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
      addImports(newTunes, newTunes.length === 1 ?
        'Imported "' + newTunes[0].title + '" (' + newTunes[0].bars + ' bars, chords only).' :
        'Imported ' + newTunes.length + ' songs' + (res.playlist ? ' from playlist "' + res.playlist + '"' : '') + '.');
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
    tune = parseTune(raw); startBar = 0;
    scorePractice = {};
    if (reset) { opts.mode = raw.score ? 'score' : 'all'; opts.sheetView = raw.score && raw.score.musicxml ? 'arrangement' : 'lead'; }
    if (reset && raw.guitarPro) { opts.guitarVoice = 'smooth'; opts.voicing = 'smooth'; }
    // A score that brings its own tab: chord diagrams default to the frets that tab plays.
    if (reset) {
      if (raw.staves && raw.staves.tab) opts.guitarVoice = 'tab';
      else if (opts.guitarVoice === 'tab') opts.guitarVoice = raw.guitarPro ? 'smooth' : 'manual';
    }
    if (opts.sheetView === 'arrangement' && !(raw.score && raw.score.musicxml)) opts.sheetView = 'lead';
    if (!raw.score && (opts.mode === 'score' || opts.mode === 'changes')) opts.mode = 'all';
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
    renderLiner(raw.liner);
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
    el('[data-fb-beat-counts]').value = /^(quarter|eighth|all|written)$/.test(opts.beatCounts) ? opts.beatCounts : 'off';
    el('[data-fb-analysis]').checked = !!opts.showAnalysis;
    el('[data-fb-analysis-note]').hidden = !opts.showAnalysis;
    var nsel = el('[data-fb-name-style]'); nsel.value = opts.nameStyle === 'under' ? 'under' : 'notes'; nsel.disabled = !opts.names;
    // Bass clef / tab switches: only for a song whose score came with those staves.
    // Bass clef: only when the score had a bass line. Tab: always (worked out when the file had none).
    var stv = el('[data-fb-staff-toggles]'), hasB = !!tune.staves.bass;
    if (stv) {
      stv.hidden = opts.sheetView === 'drums' || opts.sheetView === 'arrangement';
      stv.querySelector('[data-fb-has="bass"]').hidden = !hasB;
      el('[data-fb-show-bass]').checked = opts.showBass !== false;
      var bh = el('[data-fb-bass-horn]');
      if (bh) { bh.closest('label').hidden = !(hasB && INSTR[opts.instr].clef === 'treble'); bh.checked = opts.bassFor === 'horn'; }
      el('[data-fb-show-tab]').checked = tabOn();
      el('[data-fb-show-pos]').checked = posOn();
      el('[data-fb-show-pos]').disabled = opts.posInst === 'piano' || !!opts.saxFingers;
      el('[data-fb-show-pos]').closest('label').title = opts.posInst === 'piano' ? 'Fingerboard positions are available for guitar and violin.' : '';
      root.querySelectorAll('[data-fb-show-shapes]').forEach(function (control) { control.checked = !!opts.measureShapes && !opts.saxFingers; });
      el('[data-fb-show-sax]').checked = !!opts.saxFingers;
      syncSaxKey();
      el('[data-fb-shape-size]').value = SHAPE_SIZES[opts.shapeSize] ? opts.shapeSize : 'medium';
      el('[data-fb-low-bass]').checked = opts.lowBass !== false;
      var pil = el('[data-fb-pos-inst]');
      pil.value = opts.saxFingers ? 'sax' : (opts.posInst || 'guitar');
      pil.closest('label').hidden = false;
      var positionKey = el('[data-fb-position-key]');
      positionKey.hidden = !posOn();
      positionKey.textContent = 'Numbers in dots = fingers; 0 = open string. The outlined dot starts the bar; the dashed ring is the previous bar’s last note. ' + (opts.posInst === 'violin' ? 'Bottom numbers count semitones above the open string. Dotted guides are pitch references, not frets or measured distances. ↓ = low finger; ↑ = high finger.' : 'Bottom numbers = frets. Low E is at the bottom; high e is at the top.');
      var tp = el('[data-fb-tab-pos]');
      tp.value = opts.tabPos || 'auto';
      tp.closest('label').hidden = !tabOn() || !!tune.staves.tab;
    }
    var blw = el('[data-fb-bassline]');
    if (blw) { blw.value = opts.bassLine || 'score'; blw.closest('label').hidden = !hasB; }
    el('[data-fb-tempo]').value = opts.tempo; el('[data-fb-tempo-num]').value = opts.tempo;
    el('[data-fb-feel]').value = opts.feel;
    el('[data-fb-mode]').value = opts.mode;
    el('[data-fb-click]').value = opts.click;
    root.querySelectorAll('[data-fb-click-pattern]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.getAttribute('data-fb-click-pattern') === opts.click)); });
    var ct = el('[data-fb-click-toggle]'); if (ct) { ct.setAttribute('aria-pressed', String(opts.click !== 'none')); ct.classList.toggle('is-off', opts.click === 'none'); }
    var hasChords = !!(tune.raw && typeof tune.raw.chords === 'string' ? tune.raw.chords.trim() : (Array.isArray(tune.chords) ? tune.chords.length : (typeof tune.chords === 'string' && tune.chords.trim())));
    el('[data-fb-mode] option[value="score"]').disabled = !tune.raw.score;
    el('[data-fb-mode] option[value="changes"]').disabled = !tune.raw.score || !hasChords;
    var mixedMeter = tune.scoreBars && (STYLES[opts.style].meters.indexOf(tune.M) < 0 || tune.scoreBars.some(function (b) { return b.meter.join('/') !== tune.meter.join('/') || (b.bar > 0 && !near(b.len, tune.M)); }));
    el('[data-fb-mode]').querySelectorAll('option').forEach(function (o) { if (o.value !== 'score' && o.value !== 'changes') o.disabled = !!mixedMeter; });
    if (mixedMeter && opts.mode !== 'score' && opts.mode !== 'changes') { opts.mode = 'score'; el('[data-fb-mode]').value = 'score'; }
    renderScoreParts();
    el('[data-fb-loop]').checked = !!opts.loop;
    var r = loopRange();
    ['from', 'to'].forEach(function (k) { var i = el('[data-fb-' + k + ']'); i.max = tune.bars; i.value = r[k]; });
    root.querySelectorAll('[data-fb-vol]').forEach(function (s) { s.value = opts.vol[s.getAttribute('data-fb-vol')]; });
    root.querySelectorAll('input[name="fb-melody"]').forEach(function (i) { i.checked = i.value === opts.melody; });
    root.querySelectorAll('input[name="fb-rhythm"]').forEach(function (i) { i.checked = i.value === opts.rhythm; });
    root.querySelectorAll('input[name="fb-voicing"]').forEach(function (i) { i.checked = i.value === opts.voicing; });
    el('[data-fb-guitar-voice]').value = opts.guitarVoice || 'manual';
    el('[data-fb-guitar-voice]').closest('label').hidden = opts.posInst !== 'guitar';
    var guitarNote = el('[data-fb-guitar-voice-note]');
    guitarNote.hidden = opts.posInst !== 'guitar' || !opts.guitarVoice || opts.guitarVoice === 'manual';
    guitarNote.textContent = (opts.guitarVoice === 'tab' ? 'Match the imported tab: each diagram shows the frets the tab plays under that chord; chords the tab never grips fall back to suggested smooth grips. ' : '') + 'Suggested grips in standard tuning, with a maximum three-fret span. Smooth changes minimize movement on each string; Hold common tones favors keeping shared notes on the same string and fret. Shells omit the fifth of seventh and sixth chords; triads keep all three tones. Slash-chord bass is retained. These choices affect chord diagrams and Guitar previews; the band accompaniment stays on piano. Check each grip for comfort.';
    el('[data-fb-notation-voicing]').value = opts.voicing;
    el('[data-fb-notation-voicing]').closest('label').hidden = opts.posInst !== 'piano';
    root.querySelectorAll('input[name="fb-melody"], input[name="fb-rhythm"]').forEach(function (i) {
      i.disabled = !!tune.chordsOnly || scoreTiming();
    });
    dotsEl.innerHTML = new Array(tune.meter[0] + 1).join('<i></i>');

    // View switcher (Lead sheet vs Drum notation)
    root.querySelectorAll('[data-fb-view]').forEach(function (b) {
      if (b.getAttribute('data-fb-view') === 'arrangement') b.hidden = !(tune.raw.score && tune.raw.score.musicxml);
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
    root.querySelectorAll('input[name="fb-barclick"]').forEach(function (r) {
      r.checked = r.value === (opts.barClick === 'loop' || opts.barClick === 'off' ? opts.barClick : 'shapes');
    });
    root.querySelectorAll('input[name="fb-triad-inv"]').forEach(function (r) {
      r.checked = Number(r.value) === (Number(opts.triadInv) || 0);
    });
    var tSetEl = el('[data-fb-guitar-triad-set]');
    if (tSetEl) tSetEl.value = opts.triadSet || '123';
    var gFormEl = el('[data-fb-guitar-form-sel]');
    if (gFormEl && opts.guitarForm) gFormEl.value = opts.guitarForm;

    root.querySelectorAll('[data-fb-follow], [data-fb-follow-sync]').forEach(function (cb) {
      cb.checked = opts.follow !== false;
    });
    updateLiveShapesToggle();
    syncQuickChordControls();

    tips();
  }
  function updateLiveShapesToggle() {
    var vis = opts.showShapes !== false;
    var liveVis = el('[data-fb-live-visualizer]');
    if (liveVis) liveVis.hidden = !vis;
    var liveBtn = el('[data-fb-live-toggle]');
    if (liveBtn) {
      liveBtn.setAttribute('aria-pressed', String(vis));
      liveBtn.textContent = vis ? 'Hide shapes' : 'Show shapes';
    }
  }
  function tips() {
    if (tune.chordsOnly) {
      el('[data-fb-melody-tip]').textContent = 'Chords only: this chart has no melody line to transform. Pick a tune labeled Melody + chords to explore melody variations.';
      el('[data-fb-rhythm-tip]').textContent = 'Chords only: the melody line is rests.';
    } else {
      el('[data-fb-melody-tip]').textContent = MELODY[opts.melody].tip;
      el('[data-fb-rhythm-tip]').textContent = RHYTHM[opts.rhythm].tip;
    }
    el('[data-fb-style-tip]').textContent = STYLES[opts.style].tip;
    var ins = INSTR[opts.instr], ks = keyLabel(view ? view.writtenKey : tune.key);
    el('[data-fb-instr-tip]').textContent = ins.who.charAt(0).toUpperCase() + ins.who.slice(1) + '.' +
      (opts.instr === 'concert' || opts.instr === 'bass' ? '' : ' Concert ' + keyLabel(parseKey(opts.key, tune.key.minor)) + ' is written in ' + ks + ' for you.') +
      (view && view.octaveOut ? ' In this key the tune is a little wider than the instrument’s range, so ' + view.octaveOut + ' note' + (view.octaveOut === 1 ? '' : 's') + ' sit just outside it (the octave is set to keep that to a minimum). Try another key for a perfect fit.'
        : view && view.octaveLimited ? ' The octave is held where every note stays in this instrument’s range.' : '');
  }
  function refresh() {
    computeView();
    feedMelodyView();
    renderSheet();
    renderChanges();
    showChord(false);
    tips();
    el('[data-fb-keyline]').textContent = 'Written in ' + keyLabel(view.writtenKey) + ' · ' + tune.meter.join('/') +
      (tune.pickup ? ' · ' + tune.pickup + '-beat pickup' : '') + ' · ' + tune.bars + ' bars' +
      (tune.chordsOnly ? ' · chords only' : (opts.melody !== 'original' || opts.rhythm !== 'written' ? ' · variation: ' + [opts.melody !== 'original' ? MELODY[opts.melody].label : '', opts.rhythm !== 'written' ? RHYTHM[opts.rhythm].label : ''].filter(Boolean).join(' + ') : ''));
    save();
  }
  function respin() { if (P) { stop(); play(); } }

  // ---- melody viewer (fake-book-melody.js): where to play the tune on piano or guitar
  var melodyView = window.FakeBookMelody ? window.FakeBookMelody.create(el('[data-fb-melody-view]')) : null;
  function feedMelodyView() {
    if (!melodyView) return;
    var M = tune.M;
    melodyView.setMelody(tune.chordsOnly ? [] : view.concert.map(function (e) {
      var bar = e.start < 0 ? 0 : Math.floor(e.start / M + EPS) + 1;
      return e.p ? { start: e.start, dur: e.dur, bar: bar, midi: e.p.midi, dia: e.p.dia, name: noteName(e.p) }
        : { start: e.start, dur: e.dur, bar: bar, rest: true };
    }));
  }

  // ---- chord engine & visualizers (Piano & Guitar)
  var currentVoicingNotes = [];
  var currentGuitarFrets = [];

  var pianoPatternId = 0;
  function pianoPitchPalette() {
    var prefix = 'fb-piano-pitch-' + (++pianoPatternId) + '-';
    var defs = '<defs>' + NAME_COLORS.map(function (color, i) {
      return '<pattern id="' + prefix + i + '" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="' + color + '"/><path d="M-2 2L2-2M0 8L8 0M6 10L10 6" stroke="#ffffff" stroke-opacity=".6" stroke-width="2"/></pattern>';
    }).join('') + '</defs>';
    return { prefix: prefix, defs: defs, style: function (m) {
      var pitch = respell(m);
      return ' style="fill:' + (pitch.a ? 'url(#' + prefix + pitch.l + ')' : NAME_COLORS[pitch.l]) + '"';
    } };
  }

  function drawPianoVisualizer(notes, meta) {
    var kbs = root.querySelectorAll('[data-fb-keys]');
    if (!kbs.length) return;
    meta = meta || {};
    var palette = pianoPitchPalette();
    var lo = 48, hi = 84, whites = [], blacks = [], wW = 20, x = 0;
    for (var m = lo; m < hi; m++) {
      var pc = mod(m, 12);
      var isB = [1, 3, 6, 8, 10].indexOf(pc) >= 0;
      var on = notes.indexOf(m) >= 0;
      var info = meta[m] || (on ? { label: noteName(respell(m)), role: pc === meta.rootPC ? 'root' : 'other' } : null);
      var roleCls = info ? (info.role === 'root' ? ' on-root' : info.role === 'third' ? ' on-third' : info.role === 'fifth' ? ' on-fifth' : info.role === 'seventh' ? ' on-seventh' : ' on') : '';

      if (!isB) {
        var keyHtml = '<rect x="' + x + '" y="0" width="' + wW + '" height="100" rx="3" class="fb-wk' + roleCls + '"' + (info ? palette.style(m) : '') + ' data-midi="' + m + '"/>';
        if (info) {
          keyHtml += '<text x="' + (x + wW / 2) + '" y="76" class="fb-key-lbl" data-contrast-guard-skip>' + MN.escape(info.label) + '</text>';
          if (info.finger) keyHtml += '<text x="' + (x + wW / 2) + '" y="92" class="fb-key-finger">' + info.finger + '</text>';
        } else if (pc === 0) {
          keyHtml += '<text x="' + (x + wW / 2) + '" y="92" class="fb-kc">C' + (m / 12 - 1) + '</text>';
        }
        whites.push(keyHtml);
        x += wW;
      } else {
        var bHtml = '<rect x="' + (x - 6.5) + '" y="0" width="13" height="62" rx="2" class="fb-bk' + roleCls + '"' + (info ? palette.style(m) : '') + ' data-midi="' + m + '"/>';
        if (info) {
          bHtml += '<text x="' + x + '" y="52" class="fb-key-lbl" data-contrast-guard-skip font-size="7.5">' + MN.escape(info.label) + '</text>';
        }
        blacks.push(bHtml);
      }
    }
    var svgContent = '<svg viewBox="0 0 ' + x + ' 102" role="img" aria-label="Piano keyboard display; striped keys are accidentals">' + palette.defs + whites.join('') + blacks.join('') + '</svg>';
    kbs.forEach(function (kb, index) {
      kb.innerHTML = svgContent.split(palette.prefix).join(palette.prefix + index + '-');
      kb.querySelectorAll('[data-midi]').forEach(function (k) {
        k.addEventListener('click', function () {
          var mid = Number(k.getAttribute('data-midi'));
          if (window.PianoAudio) window.PianoAudio.tone(PT ? PT.noteFreq(mid - 48) : 440 * Math.pow(2, (mid - 69) / 12));
        });
      });
    });
  }

  function drawGuitarVisualizer(frets, fingers, degrees, rootPC, scaleMap) {
    var gtrs = root.querySelectorAll('[data-fb-fretboard]');
    if (!gtrs.length) return;
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

    // The fretboard owns an explicit high-contrast palette; keep the global theme guard from
    // replacing its dark labels with theme text colors that clash with the marker fills.
    var svgContent = '<svg viewBox="0 0 ' + totalW + ' ' + totalH + '" role="img" aria-label="Guitar fretboard display" data-contrast-guard-skip>' + out.join('') + '</svg>';
    gtrs.forEach(function (gtr) {
      gtr.innerHTML = svgContent;
      gtr.querySelectorAll('[data-s]').forEach(function (dot) {
        dot.addEventListener('click', function () {
          var s = Number(dot.getAttribute('data-s')), f = Number(dot.getAttribute('data-f'));
          if (window.GuitarAudio && GT) window.GuitarAudio.pluck(GT.noteFreq(s, f));
        });
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

  // ---- bar pop-up: every chord in a clicked measure, as piano or guitar shapes
  var barPopBar = null;
  function chordTypeOf(c) {
    return (GT && GT.CHORD_TYPES.find(function (ct) { return ct.suffix === (c.q || ''); })) || { suffix: c.q || '', name: 'Chord', intervals: Q[c.q] ? Q[c.q].iv : [0, 4, 7] };
  }
  function roleOf(iv) {
    return iv === 0 ? 'root' : (iv === 3 || iv === 4) ? 'third' : (iv === 6 || iv === 7 || iv === 8) ? 'fifth' : (iv === 9 || iv === 10 || iv === 11) ? 'seventh' : 'other';
  }
  // The keys under a chord, cut to the notes it uses (plus a white key either side, and at least eight white keys)
  // so the keyboard is as narrow as it can be and every key can be drawn large enough to read.
  function miniPiano(notes, rootPC) {
    var palette = pianoPitchPalette();
    var isBlack = function (m) { return [1, 3, 6, 8, 10].indexOf(mod(m, 12)) >= 0; };
    var lo = Math.min.apply(null, notes), hi = Math.max.apply(null, notes), nWhite = 0, grow = 0;
    while (isBlack(lo)) lo--;
    while (isBlack(hi)) hi++;
    do { lo--; } while (isBlack(lo));
    do { hi++; } while (isBlack(hi));
    for (var c = lo; c <= hi; c++) if (!isBlack(c)) nWhite++;
    while (nWhite < 8) {
      if (grow++ % 2) { do { lo--; } while (isBlack(lo)); } else { do { hi++; } while (isBlack(hi)); }
      nWhite++;
    }
    hi++;                                    // the loop below runs up to, not including, hi
    var wW = 14, x = 0, whites = [], blacks = [];
    for (var m = lo; m < hi; m++) {
      var pc = mod(m, 12), isB = [1, 3, 6, 8, 10].indexOf(pc) >= 0, on = notes.indexOf(m) >= 0;
      var cls = on ? ' on-' + roleOf(mod(m - rootPC, 12)) : '';
      if (cls === ' on-other') cls = ' on';
      var lbl = on ? '<text x="' + (isB ? x : x + wW / 2) + '" y="' + (isB ? 40 : 60) + '" class="fb-key-lbl" font-size="' + (isB ? 6 : 7) + '" data-contrast-guard-skip>' + MN.escape(noteName(respell(m))) + '</text>' : '';
      if (!isB) { whites.push('<rect x="' + x + '" y="0" width="' + wW + '" height="70" rx="2" class="fb-wk' + cls + '"' + (on ? palette.style(m) : '') + '/>' + lbl); x += wW; }
      else blacks.push('<rect x="' + (x - 4.5) + '" y="0" width="9" height="44" rx="1.5" class="fb-bk' + cls + '"' + (on ? palette.style(m) : '') + '/>' + lbl);
    }
    return '<svg class="fb-mini-keys" viewBox="0 0 ' + x + ' 72" role="img" aria-label="Piano keys: ' +
      notes.map(function (m) { return noteName(respell(m)); }).join(' ') + '; striped keys are accidentals">' + palette.defs + whites.join('') + blacks.join('') + '</svg>';
  }
  function diagramPianoNotes(c, ci) {
    if (opts.engineMode !== 'triads') return view.voicings[ci] || rootPosition(c);
    var pc = mod(NAT[c.root.l] + c.root.a, 12);
    var ivs = violinTones(c, chordTypeOf(c), 'triads').intervals;
    return rotate(ivs.map(function (iv) { return 60 + pc + iv; }), Number(opts.triadInv) || 0);
  }
  // The grip shown for chord ci: what the imported tab plays there when "Match the tab" is on, else the planned grip.
  function gripFor(ci) {
    return (opts.guitarVoice === 'tab' && view.tabGrips && view.tabGrips[ci]) || (view.guitarGrips && view.guitarGrips[ci]) || null;
  }
  var OPEN_MIDI = [40, 45, 50, 55, 59, 64];
  function bassPCOf(c) { return c && c.bass ? mod(NAT[c.bass.l] + c.bass.a, 12) : null; }
  // Grips on the upper strings float with no fundamental. Put the chord's bass (its root, or the slash
  // bass) on the low E or A string when it sits inside the hand's reach. `always` also adds it under
  // a grip whose bass is already right but starts on the D string or higher (triads).
  function withLowBass(frets, rootPC, bassPC, always) {
    if (opts.lowBass === false) return frets;
    var low = -1, target = bassPC != null ? bassPC : rootPC;
    for (var i = 0; i < 6 && low < 0; i++) if (typeof frets[i] === 'number') low = i;
    if (low < 1) return frets;
    if (mod(OPEN_MIDI[low] + frets[low], 12) === target && !(always && low >= 2)) return frets;
    var fretted = frets.filter(function (f) { return typeof f === 'number' && f > 0; }), best = null;
    [0, 1].forEach(function (s) {
      if (s >= low) return;
      var f0 = mod(target - OPEN_MIDI[s], 12);
      [f0, f0 + 12].forEach(function (f) {
        if (f > 17) return;
        var all = f > 0 ? fretted.concat([f]) : fretted;
        var span = all.length ? Math.max.apply(null, all) - Math.min.apply(null, all) : 0;
        if (span <= 4 && (!best || span < best.span)) best = { s: s, f: f, span: span };
      });
    });
    if (!best) return frets;
    var out = frets.slice();
    out[best.s] = best.f;
    return out;
  }
  // A triad match plus its bass note, as {s, f, midi} notes low string first.
  function triadNotes(match, rootPC, c) {
    var frets = [null, null, null, null, null, null];
    match.notes.forEach(function (n) { frets[n.s] = n.f; });
    var withBass = withLowBass(frets, rootPC, bassPCOf(c), true), notes = match.notes.slice();
    withBass.forEach(function (f, s) { if (f !== frets[s]) notes.unshift({ s: s, f: f, midi: OPEN_MIDI[s] + f }); });
    return notes;
  }
  function guitarShapeFor(rootPC, cType, ci) {
    var c = view && view.concertChords ? view.concertChords[ci == null ? chordSel : ci] : null;
    if (opts.engineMode === 'triads') {
      var quality = triadQuality(cType.intervals);
      var match = getGuitarTriad(rootPC, quality, opts.triadSet || '123', Number(opts.triadInv) || 0);
      if (!match) return null;
      var frets = [null, null, null, null, null, null];
      match.notes.forEach(function (note) { frets[note.s] = note.f; });
      return { frets: withLowBass(frets, rootPC, bassPCOf(c), true) };
    }

    if (opts.guitarVoice && opts.guitarVoice !== 'manual' && view && view.guitarGrips) {
      var grip = gripFor(ci == null ? chordSel : ci);
      if (!grip) return null;
      // A grip lifted from the imported tab is what the tab plays; leave it alone.
      return { frets: grip.source === 'tab' ? grip.frets : withLowBass(grip.frets, rootPC, bassPCOf(c), false), formName: opts.guitarVoice };
    }
    if (!GT) return null;
    var forms = GT.availableForms(rootPC, cType);
    var form = forms.indexOf(opts.guitarForm) >= 0 ? opts.guitarForm : forms[0];
    var shape = GT.getChordShape(rootPC, cType, 0, form);
    shape.formName = form;
    shape.frets = withLowBass(shape.frets, rootPC, bassPCOf(c), false);
    return shape;
  }
  function syncQuickChordControls() {
    var select = el('[data-fb-quick-guitar-form]');
    if (!select || !view) return;
    select.closest('label').hidden = opts.posInst !== 'guitar';
    el('[data-fb-tools-guitar-voice]').value = opts.guitarVoice || 'manual';
    var c = view.concertChords[chordSel];
    var automatic = opts.guitarVoice && opts.guitarVoice !== 'manual';
    var forms = c && GT ? GT.availableForms(mod(NAT[c.root.l] + c.root.a, 12), chordTypeOf(c)) : [];
    select.innerHTML = forms.map(function (form) { return '<option value="' + form + '">' + MN.escape(form.toUpperCase() + ' form') + '</option>'; }).join('');
    select.value = forms.indexOf(opts.guitarForm) >= 0 ? opts.guitarForm : forms[0] || '';
    select.disabled = !!automatic || !forms.length;
    select.title = automatic ? 'Choose manual voice leading to select a grip.' : 'Preferred grip; unavailable forms use a supported grip for each chord.';
  }
  function guitarFormLabel(rootPC, c, ci) {
    var shape = guitarShapeFor(rootPC, chordTypeOf(c), ci);
    return shape && shape.formName ? ' · ' + (opts.guitarVoice && opts.guitarVoice !== 'manual' ? el('[data-fb-guitar-voice] option:checked').textContent : String(shape.formName).toUpperCase() + ' form') : ' · no supported compact grip';
  }
  function miniGuitar(rootPC, cType, ci) {
    var shape = guitarShapeFor(rootPC, cType, ci);
    if (!shape) return '<span>No supported compact guitar grip.</span>';
    var frets = shape.frets, degs = GT.computeDegrees(rootPC, cType, frets);
    var played = frets.filter(function (f) { return typeof f === 'number' && f > 0; });
    var maxF = played.length ? Math.max.apply(null, played) : 0, minF = played.length ? Math.min.apply(null, played) : 1;
    var base = maxF <= 5 ? 1 : minF, rows = 5, sp = 16, top = 22, left = 18, w = left + sp * 5 + 30, h = top + rows * 18 + 8;
    var out = [];
    for (var r = 0; r <= rows; r++) out.push('<line x1="' + left + '" x2="' + (left + sp * 5) + '" y1="' + (top + r * 18) + '" y2="' + (top + r * 18) + '" stroke="#8a7c66" stroke-width="' + (r === 0 && base === 1 ? 4 : 1) + '"/>');
    for (var st = 0; st < 6; st++) out.push('<line x1="' + (left + st * sp) + '" x2="' + (left + st * sp) + '" y1="' + top + '" y2="' + (top + rows * 18) + '" stroke="#3d352b" stroke-width="1"/>');
    if (base > 1) out.push('<text x="' + (left + sp * 5 + 4) + '" y="' + (top + 13) + '" class="fb-mini-fr">' + base + 'fr</text>');
    frets.forEach(function (f, i) {
      var sx = left + i * sp;
      if (f === 'x' || f === null || f === undefined) out.push('<text x="' + sx + '" y="' + (top - 7) + '" class="fb-mini-mute">×</text>');
      else if (f === 0) out.push('<circle cx="' + sx + '" cy="' + (top - 10) + '" r="4" fill="none" stroke="#0f5d63" stroke-width="1.5"/>');
      else {
        var cy = top + (f - base + 0.5) * 18, d = degs[i];
        var cls = d ? roleOf(d.iv) : 'other';
        out.push('<circle cx="' + sx + '" cy="' + cy + '" r="7" class="fb-gtr-note-dot' + (cls === 'other' ? '' : ' is-' + cls) + '"/>');
        if (d) out.push('<text x="' + sx + '" y="' + cy + '" class="fb-gtr-lbl" font-size="7">' + MN.escape(d.label) + '</text>');
      }
    });
    return '<svg class="fb-mini-gtr" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Guitar shape, low to high: ' +
      frets.map(function (f) { return f === 'x' || f == null ? 'x' : f; }).join(' ') + '">' + out.join('') + '</svg>';
  }
  function barChords(b) {
    var idx = [];
    view.concertChords.forEach(function (c, i) { if (c.bar === b) idx.push(i); });
    if (idx.length) return { idx: idx, held: false };
    var prev = -1;
    view.concertChords.forEach(function (c, i) { if (c.bar < b) prev = i; });
    return { idx: prev >= 0 ? [prev] : [], held: prev >= 0 };
  }
  // One row of diagrams under each bar, every one the same size, each starting at the x of its chord
  // symbol (so it sits on its beat). rowH/cap are in staff spaces (S); cap limits a diagram's height.
  var SHAPE_SIZES = { small: { rowH: 12, cap: 9 }, medium: { rowH: 15, cap: 12 }, large: { rowH: 18, cap: 15 } };
  var chordSymbolX = {};
  var bassPlacedAll = {}, lastS = 10;       // the bass staff's placed notes and the staff size, for the sax fingering row
  function shapeSize() { return SHAPE_SIZES[opts.shapeSize] || SHAPE_SIZES.medium; }
  function sizeMeasureDiagrams(S) {
    var rows = Array.prototype.slice.call(sheetEl.querySelectorAll('.fb-measure-row'));
    if (!rows.length) return;
    var cap = shapeSize().cap * S, systems = [], info = [];
    // Per system, the cell is the narrowest "bar width / chords in the bar", and one scale fits every
    // diagram on the line into a cell and under the height cap, so they all match.
    rows.forEach(function (row) {
      var g = row.closest('.fb-system') || row.ownerSVGElement, i = systems.indexOf(g);
      if (i < 0) { systems.push(g); info.push({ cell: Infinity, scale: Infinity }); i = systems.length - 1; }
      row._sys = i;
      var shapes = row.querySelectorAll('.fb-measure-shape'), W = Number(row.closest('.fb-measure-help').getAttribute('width'));
      if (row.classList.contains('is-sax')) {
        // Sax fingerings: each bar sizes its own (a bar of sixteenths gets W / 16 each), so busy
        // bars don't shrink the quarter notes beside them. Notes can sit closer than that (phone
        // engraving packs sixteenths tight); the nudge below keeps every one in the bar anyway.
        row._own = { cell: shapes.length ? W / shapes.length : Infinity, scale: Infinity };
        return;
      }
      if (shapes.length) info[i].cell = Math.min(info[i].cell, W / shapes.length);
    });
    rows.forEach(function (row) {
      var o = row._own || info[row._sys];
      row.querySelectorAll('svg').forEach(function (svg) {
        var box = svg.viewBox.baseVal;
        if (box.width > 0 && box.height > 0) o.scale = Math.min(o.scale, o.cell / box.width, cap / box.height);
      });
    });
    // One scale for the whole score, so a chord looks the same size on every line.
    var common = Math.min.apply(null, info.map(function (o) { return o.scale; }));
    info.forEach(function (o) { o.scale = common; });
    rows.forEach(function (row) {
      var o = row._own || info[row._sys], d = o.cell, W = Number(row.closest('.fb-measure-help').getAttribute('width'));
      var shapes = Array.prototype.slice.call(row.querySelectorAll('.fb-measure-shape')), left = [];
      var centre = row.classList.contains('is-sax') ? d / 2 : 0;
      if (!isFinite(d)) return;
      // Left to right, nudge a diagram right of its neighbour only when they would overlap; then pull
      // any overflow back from the right edge. n * d <= W, so it always fits.
      shapes.forEach(function (sh, i) { left[i] = Math.max((Number(sh.getAttribute('data-x')) || 0) - centre, i ? left[i - 1] + d : 0); });
      for (var i = shapes.length - 1, bound = W; i >= 0; i--) { left[i] = Math.min(left[i], bound - d); bound = left[i]; }
      shapes.forEach(function (sh, i) {
        sh.style.left = left[i].toFixed(2) + 'px';
        sh.style.width = d.toFixed(2) + 'px';
        var svg = sh.querySelector('svg');
        if (!svg || !isFinite(o.scale) || o.scale <= 0) return;
        var box = svg.viewBox.baseVal;
        svg.style.setProperty('width', (box.width * o.scale).toFixed(3) + 'px', 'important');
        svg.style.setProperty('height', (box.height * o.scale).toFixed(3) + 'px', 'important');
        svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
      });
    });
  }

  // Sax fingering row: one fingering under each melody note that starts in the bar (not the tied
  // continuations), centred on its notehead. Fingered from the note as written on the page.
  // The notes to finger in a bar: the melody's, plus the bass part when it's written on the horn's staff
  // (kept out of the way of a melody note that falls in the same place).
  function saxCellsFor(b, melodyInfos) {
    if (!(opts.saxFingers && b.bassBar && view.bassHorn && opts.bassFor === 'horn' && opts.showBass !== false)) return melodyInfos;
    var extra = [];
    b.bassBar.pieces.forEach(function (pc) {
      (bassPlacedAll[pc.idx] || []).forEach(function (info) {
        if (info.pc !== pc) return;
        var clash = melodyInfos.some(function (m) { return m.pc.p && Math.abs(m.x - info.x) < 2.2 * lastS; });
        if (!clash) extra.push({ pc: pc, x: info.x, bass: true });
      });
    });
    return melodyInfos.concat(extra).sort(function (a, c) { return a.x - c.x; });
  }
  function saxRow(b, S, notes) {
    var cells = notes.filter(function (n) { return n.pc.p && !n.pc.tieFrom; }).map(function (n) {
      var f = window.FakeBookSax.fingering(n.pc.p.midi), name = noteName(n.pc.p);
      var label = name + (f.shift > 0 ? ' 8va' : f.shift < 0 ? ' 8vb' : '');
      return '<div class="fb-measure-shape ' + (n.bass ? 'fb-sx fb-sxb' : 'fb-sx') + '" data-idx="' + n.pc.idx + '" data-x="' + (n.x - (b.x + S / 2)).toFixed(1) + '"><strong title="' + MN.escape(label) + '">' + MN.escape(label) + '</strong>' + window.FakeBookSax.draw(n.pc.p.midi, name) + '</div>';
    });
    if (!cells.length) return '<p>' + (tune.chordsOnly ? 'This tune has chords only, no melody to finger.' : 'No new melody notes in this measure.') + '</p>';
    return '<div class="fb-measure-row is-sax" style="height:' + shapeSize().rowH + 'em">' + cells.join('') + '</div>';
  }
  function syncSaxKey() {
    var saxKey = el('[data-fb-sax-key]');
    saxKey.hidden = !opts.saxFingers;
    saxKey.textContent = '🎷 One fingering per melody note, for the note as written (every saxophone fingers a written note the same way). Filled = pressed. Top half, left hand: octave key (thumb) at the left, then 1 · bis · 2 · 3, palm keys at the right and the pinky table below. Bottom half, right hand: side keys at the left, then 1 · 2 · 3 and the pinky keys below. 8va / 8vb: the note is out of the sax’s range, so it’s fingered an octave higher / lower. Hover a fingering to enlarge it.' +
      (opts.instr === 'eb' || opts.instr === 'bb' ? '' : ' The sheet isn’t written for a saxophone yet: under Write it for, choose E♭ instruments (alto, bari) or B♭ instruments (tenor, soprano) so the notes and fingerings match your horn.');
  }
  function shapesRowOn() { return !!(opts.measureShapes || (opts.saxFingers && window.FakeBookSax)); }

  function drawMeasureHelp(b, y, h, S, positions, notes) {
    var info = barChords(b.i);
    var html = [], chordPCs = [], preferred;
    info.idx.forEach(function (ci) {
      var c = view.concertChords[ci], pc = mod(NAT[c.root.l] + c.root.a, 12);
      if (preferred === undefined) preferred = pc;
      chordPCs = chordPCs.concat(Q[c.q].iv.map(function (iv) { return mod(pc + iv, 12); }));
      if (c.bass) chordPCs.push(mod(NAT[c.bass.l] + c.bass.a, 12));
      if (!opts.measureShapes || opts.saxFingers) return;
      var diagram = opts.posInst === 'piano' ? miniPiano(diagramPianoNotes(c, ci), pc) : opts.posInst === 'violin' ? (window.FakeBookViolin ? window.FakeBookViolin.mini(pc, window.FakeBookViolin.toneMap(Q[c.q].iv)) : null) : miniGuitar(pc, chordTypeOf(c), ci);
      var notes = opts.posInst === 'piano' ? diagramPianoNotes(c, ci) : [];
      if (opts.posInst === 'guitar') {
        var grip = guitarShapeFor(pc, chordTypeOf(c), ci);
        if (grip) notes = grip.frets.map(function (f, st) { return typeof f === 'number' ? [40,45,50,55,59,64][st] + f : null; }).filter(function (m) { return m !== null; }).sort(function (a,b) { return a-b; });
      }
      var expectedBass = c.bass ? mod(NAT[c.bass.l] + c.bass.a, 12) : pc;
      var label = '';
      if (notes.length && mod(notes[0],12) !== expectedBass) {
        var bassTone = chordTones(c).find(function (tone) { return tone.pc === mod(notes[0],12); });
        var bassLabel = bassTone ? LETTERS[bassTone.l] + ACC[bassTone.a] : noteName(respell(notes[0]));
        label = chordName(c).split('/')[0] + (mod(notes[0],12) === pc ? ' · root bass' : '/' + bassLabel);
      }
      if (opts.engineMode === 'triads' && Q[c.q].iv.length > 3) label = (label || chordName(c)) + ' · triad only';
      if (label && opts.instr !== 'concert' && opts.instr !== 'bass') label += ' (concert)';
      if (info.held && !label) label = 'Held from previous bar';
      var sx = !info.held && chordSymbolX[ci] !== undefined ? chordSymbolX[ci] - (b.x + S / 2) : 0;
      html.push('<div class="fb-measure-shape" data-fb-shape-ci="' + ci + '" data-x="' + sx.toFixed(1) + '">' + (label ? '<strong title="' + MN.escape(label) + '">' + MN.escape(label) + '</strong>' : '') + (diagram || '<p>No supported shape for this chord.</p>') + '</div>');
    });
    if (opts.saxFingers && window.FakeBookSax) html = [saxRow(b, S, notes || [])];
    else if (opts.measureShapes && !info.idx.length) html.push('<p>No chord symbols in this measure.</p>');
    else if (opts.measureShapes) html = ['<div class="fb-measure-row" style="height:' + shapeSize().rowH + 'em">' + html.join('') + '</div>'];

    if (positions && opts.showAnalysis) {
      var midis = view.concert.filter(function (e) { return e.p && e.start >= b.start - EPS && e.start < b.start + b.len - EPS; }).map(function (e) { return e.p.midi; });
      var fits = window.FakeBookPosition.analyze(midis, chordPCs, preferred);
      var names = ['C','C♯/D♭','D','D♯/E♭','E','F','F♯/G♭','G','G♯/A♭','A','A♯/B♭','B'];
      html.push('<p class="fb-measure-analysis">' + (!midis.length ? 'No melody pitches to analyze.' : !fits.length ? 'Chromatic passage: no single tested scale fits all melody and chord tones.' : 'Possible: ' + fits.slice(0,2).map(function (f) { return names[f.tonic] + ' ' + f.mode; }).join(' / ') + (fits.length > 2 ? ' · +' + (fits.length - 2) + ' alternatives' : '') + '. Degrees (' + names[fits[0].tonic] + '): ' + fits[0].degrees.join('–')) + '</p>');
    }
    return '<foreignObject class="fb-measure-help" x="' + (b.x + S/2) + '" y="' + y + '" width="' + (b.w - S) + '" height="' + h + '"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:' + S + 'px">' + html.join('') + '</div></foreignObject>';
  }

  function renderBarPop() {
    var pop = el('[data-fb-barpop]');
    if (!pop || barPopBar === null || !view) return;
    var info = barChords(barPopBar), piano = (opts.engineInst || 'piano') === 'piano', violin = opts.engineInst === 'violin' && !!window.FakeBookViolin;
    var written = !(opts.instr === 'concert' || opts.instr === 'bass');
    el('[data-fb-barpop-title]').textContent = (barPopBar < 1 ? 'Pickup' : 'Bar ' + barPopBar) + ' · ' +
      info.idx.map(function (ci) { return chordName(written ? view.writtenChords[ci] : view.concertChords[ci]); }).join('  ') || 'no chord';
    el('[data-fb-barpop-cards]').innerHTML = info.idx.map(function (ci) {
      var c = view.concertChords[ci], rootPC = mod(NAT[c.root.l] + c.root.a, 12);
      var notes = view.voicings[ci] || rootPosition(c);
      // Shapes are concert pitch (what a piano or guitar plays), so name them that way.
      var name = chordName(c);
      return '<button type="button" class="fb-barpop-card" data-chg-ci="' + ci + '" aria-label="Play ' + MN.escape(name) + '">' +
        '<strong>' + MN.escape(name) + '</strong>' +
        (written ? '<em>your chart: ' + MN.escape(chordName(view.writtenChords[ci])) + '</em>' : '') +
        (piano ? miniPiano(notes, rootPC) : violin ? window.FakeBookViolin.mini(rootPC, window.FakeBookViolin.toneMap(violinTones(c, chordTypeOf(c), 'voicings').intervals)) : miniGuitar(rootPC, chordTypeOf(c), ci)) +
        '<small>' + MN.escape(piano ? notes.map(function (m) { return noteName(respell(m)); }).join(' ') : violin ? Q[c.q].name + ' · first-position tones' : Q[c.q].name + guitarFormLabel(rootPC, c, ci)) + '</small></button>';
    }).join('');
    el('[data-fb-barpop-note]').textContent = info.held ? 'No new chord here: the chord from bar ' + view.concertChords[info.idx[0]].bar + ' keeps ringing.' :
      (written ? 'Shapes are in concert pitch, as a piano or guitar plays them. ' : '') + 'Click a shape to hear it.' +
      (piano ? '' : violin ? ' Dots are every chord tone in first position; play them one at a time.' : (opts.guitarVoice && opts.guitarVoice !== 'manual' ? ' Connected grips follow Guitar voice leading in Quick settings.' : ' Pick a different guitar form in the Chords tab.'));
  }
  function showBarPop(b, barEl) {
    var pop = el('[data-fb-barpop]'), card = root.querySelector('.fb-sheet-card');
    if (!pop || !card) return;
    barPopBar = b;
    renderBarPop();
    pop.hidden = false;
    var cr = card.getBoundingClientRect(), br = barEl.getBoundingClientRect();
    var sc = root.closest('.ll-sim'), vb = sc ? sc.getBoundingClientRect().bottom : innerHeight;
    var pw = pop.offsetWidth, ph = pop.offsetHeight;
    var left = Math.max(8, Math.min(br.left - cr.left, card.clientWidth - pw - 8));
    var below = br.bottom - cr.top + 6;
    var top = (br.bottom + ph + 12 > vb && br.top - cr.top - ph - 6 > 0) ? br.top - cr.top - ph - 6 : below;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    var first = barChords(b).idx[0];
    if (first !== undefined) { chordSel = first; showChord(!P); }
  }
  function hideBarPop() {
    var pop = el('[data-fb-barpop]');
    if (pop) pop.hidden = true;
    barPopBar = null;
  }

  var stripSig = '';
  function populateChordSelect() {
    var sel = el('[data-fb-chord-select]');
    if (!sel || !view) return;
    var chords = view.concertChords || [];
    var names = chords.map(function (c, i) {
      return chordName(opts.instr === 'concert' || opts.instr === 'bass' ? c : view.writtenChords[i]);
    });
    var sig = chords.map(function (c, i) { return c.bar + names[i]; }).join('|');
    if (sig !== stripSig) {
      // Rebuild only when the chord list changes, so a focused chip keeps focus.
      stripSig = sig;
      sel.innerHTML = names.map(function (name, i) {
        return '<option value="' + i + '">Bar ' + chords[i].bar + ': ' + name + '</option>';
      }).join('');
      var strip = el('[data-fb-chord-strip]');
      if (strip) strip.innerHTML = names.map(function (name, i) {
        return '<button type="button" class="fb-strip-chip" data-strip-ci="' + i + '" aria-pressed="false"><small>' +
          (chords[i].bar < 1 ? 'pickup' : 'bar ' + chords[i].bar) + '</small>' + MN.escape(name) + '</button>';
      }).join('');
    }
    sel.value = String(chordSel);
    var stripEl = el('[data-fb-chord-strip]');
    if (!stripEl) return;
    stripEl.querySelectorAll('[data-strip-ci]').forEach(function (b) {
      var on = Number(b.getAttribute('data-strip-ci')) === chordSel;
      b.setAttribute('aria-pressed', String(on));
      b.tabIndex = on ? 0 : -1;
      // Scroll only the strip, never the page.
      if (on && stripEl.offsetParent) {
        var sr = stripEl.getBoundingClientRect(), br = b.getBoundingClientRect();
        if (br.left < sr.left || br.right > sr.right) stripEl.scrollLeft += br.left - sr.left - (sr.width - br.width) / 2;
      }
    });
  }
  function stepChord(delta) {
    if (!view || !view.concertChords.length) return;
    var n = view.concertChords.length;
    chordSel = (chordSel + delta + n) % n;
    showChord(true);
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
    // Stopped: choosing a chord or bar moves the melody viewer there too.
    if (!P && melodyView) melodyView.cursorAtBeat(c.start);

    populateChordSelect();

    var writtenChord = chordName(opts.instr === 'concert' || opts.instr === 'bass' ? c : w);
    var mainNameEl = el('[data-fb-chordname]');
    if (mainNameEl) mainNameEl.textContent = writtenChord;

    var liveChordEl = el('[data-fb-live-chordname]');
    if (liveChordEl) {
      liveChordEl.textContent = writtenChord;
      liveChordEl.classList.remove('is-changing');
      void liveChordEl.offsetWidth;
      liveChordEl.classList.add('is-changing');
    }

    var chordInfoText = (opts.instr === 'concert' || opts.instr === 'bass' ? '' : 'Sounds as ' + chordName(c) + ' (concert). ') +
      Q[c.q].name.charAt(0).toUpperCase() + Q[c.q].name.slice(1) + ' · bar ' + c.bar + ' · ' + d.bottom + ' on the bottom';
    var chordNotesText = (opts.engineInst === 'piano' ? 'Piano plays: ' : opts.engineInst === 'violin' ? 'Violin plays (one tone at a time): ' : 'Guitar plays: ') + d.spelled.join('  ') + (opts.instr === 'concert' || opts.instr === 'bass' ? '' : ' (concert)');

    var mainInfoEl = el('[data-fb-chordinfo]');
    if (mainInfoEl) mainInfoEl.textContent = chordInfoText;
    var mainNotesEl = el('[data-fb-chordnotes]');
    if (mainNotesEl) mainNotesEl.textContent = chordNotesText;

    var liveInfoEl = el('[data-fb-live-chordinfo]');
    if (liveInfoEl) liveInfoEl.textContent = 'Bar ' + c.bar + ' · ' + d.bottom;
    var liveNotesEl = el('[data-fb-live-chordnotes]');
    if (liveNotesEl) liveNotesEl.textContent = d.spelled.join('  ');

    var liveNextEl = el('[data-fb-live-chordnext]');
    if (liveNextEl) {
      var allC = view.concertChords || [];
      var allW = view.writtenChords || [];
      if (chordSel < allC.length - 1) {
        var nc = allC[chordSel + 1];
        var nw = allW[chordSel + 1];
        liveNextEl.textContent = chordName(opts.instr === 'concert' || opts.instr === 'bass' ? nc : nw) + ' (bar ' + nc.bar + ')';
      } else if (opts.loop && allC.length > 0) {
        var nc0 = allC[0];
        var nw0 = allW[0];
        liveNextEl.textContent = chordName(opts.instr === 'concert' || opts.instr === 'bass' ? nc0 : nw0) + ' (loop to bar ' + nc0.bar + ')';
      } else {
        liveNextEl.textContent = 'End of chart';
      }
    }
    el('[data-fb-voicing-tip]').textContent = VOICING[opts.voicing] ? VOICING[opts.voicing].tip : '';

    var isPiano = (opts.engineInst || 'piano') === 'piano';
    root.querySelectorAll('[data-fb-keys]').forEach(function (kw) { kw.hidden = !isPiano; });
    root.querySelectorAll('[data-fb-fretboard]').forEach(function (gw) { gw.hidden = isPiano; });

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

    var cType = (GT && GT.CHORD_TYPES.find(function (ct) { return ct.suffix === (c.q || ''); })) || { suffix: c.q || '', name: 'Chord', intervals: Q[c.q] ? Q[c.q].iv : [0, 4, 7] };

    if (opts.engineInst === 'violin' && window.FakeBookViolin) {
      ['[data-fb-guitar-forms]', '[data-fb-voicing]', '[data-fb-guitar-triad-sets]'].forEach(function (sel) { var w = el(sel); if (w) w.hidden = true; });
      var vTones = violinTones(c, cType, mode);
      var vMap = window.FakeBookViolin.toneMap(vTones.intervals, vTones.labels);
      var vSvg = window.FakeBookViolin.draw(rootPC, vMap, vTones.aria);
      root.querySelectorAll('[data-fb-fretboard]').forEach(function (vw) {
        vw.innerHTML = vSvg;
        vw.querySelectorAll('[data-vm]').forEach(function (dot) {
          dot.addEventListener('click', function () { violinTone(Number(dot.getAttribute('data-vm')), 0, 1); });
        });
      });
      if (mode === 'triads') { var vDesc = el('[data-fb-triad-desc]'); if (vDesc) vDesc.textContent = vTones.title; }
      if (mode === 'scales') { populateScaleChips(rootPC, c.q); var vSum = el('[data-fb-scale-summary]'); if (vSum) vSum.textContent = vTones.title; }
    } else if (mode === 'voicings') {
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
        if (formSelEl) formSelEl.disabled = !!opts.guitarVoice && opts.guitarVoice !== 'manual';
        var vWrap = el('[data-fb-voicing]');
        if (vWrap) vWrap.hidden = true;
        var forms = GT ? GT.availableForms(rootPC, cType) : ['open'];
        if (formSelEl && opts.guitarVoice && opts.guitarVoice !== 'manual') {
          formSelEl.innerHTML = '<option>' + el('[data-fb-guitar-voice] option:checked').textContent + '</option>';
        } else if (formSelEl) {
          formSelEl.innerHTML = forms.map(function (fm) {
            return '<option value="' + fm + '">' + fm.toUpperCase() + ' form</option>';
          }).join('');
          if (forms.indexOf(opts.guitarForm) >= 0) formSelEl.value = opts.guitarForm;
          else { formSelEl.value = forms[0]; opts.guitarForm = forms[0]; }
        }
        var shape = guitarShapeFor(rootPC, cType, chordSel);
        if (!shape) shape = { frets: ['x', 'x', 'x', 'x', 'x', 'x'] };
        var frets = shape.frets;
        currentGuitarFrets = frets;
        var fingers = GT ? GT.computeFingering(frets) : null;
        var degrees = GT ? GT.computeDegrees(rootPC, cType, frets) : null;
        drawGuitarVisualizer(frets, fingers, degrees, rootPC);
      }
    } else if (mode === 'triads') {
      var triadQ = triadQuality(Q[c.q].iv);
      var inv = Number(opts.triadInv) || 0;
      var triadDesc = el('[data-fb-triad-desc]');
      if (triadDesc) {
        var steps = triadSteps(triadQ).split('-'), order = steps.slice(inv).concat(steps.slice(0, inv)).join('-');   // 1-3-5, 3-5-1, 5-1-3
        triadDesc.textContent = LETTERS[c.root.l] + ACC[c.root.a] + ' ' + triadQ + ' triad · ' + ['Root position', '1st inversion', '2nd inversion'][inv] + ' (' + order + ')';
      }
      var tSetsWrap = el('[data-fb-guitar-triad-sets]');
      if (tSetsWrap) tSetsWrap.hidden = isPiano;

      var triadIvs = TRIADS[triadQ];
      if (isPiano) {
        var triadMid = triadIvs.map(function (v) { return 60 + rootPC + v; });
        var rotated = rotate(triadMid, inv);
        currentVoicingNotes = rotated;
        var tMeta = { rootPC: rootPC };
        rotated.forEach(function (m) {
          var iv = mod(m - rootPC, 12);
          tMeta[m] = {
            label: triadDegree(iv),
            role: roleOf(iv),
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
          triadNotes(tMatch, rootPC, c).forEach(function (n) {
            gFrets[n.s] = n.f;
            var iv = mod(n.midi - rootPC, 12);
            gDegs[n.s] = { label: triadDegree(iv), isRoot: iv === 0 };
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

    syncQuickChordControls();
    sheetEl.querySelectorAll('.fb-chord').forEach(function (t) {
      t.classList.toggle('is-sel', Number(t.getAttribute('data-ci')) === chordSel);
    });

    if (sound) playActiveChord();
  }

  // What the violin shows for the selected chord: its tones (or the triad's, or the scale's), by mode.
  function violinTones(c, cType, mode) {
    var rootName = LETTERS[c.root.l] + ACC[c.root.a], ivs, labels = null, title;
    if (mode === 'scales') {
      var stDef = (GT && GT.SCALE_TYPES.find(function (x) { return x.key === (opts.scaleType || 'ionian'); })) || (PT && PT.SCALE_TYPES.find(function (x) { return x.key === (opts.scaleType || 'ionian'); })) || { intervals: [0, 2, 4, 5, 7, 9, 11], degrees: ['1', '2', '3', '4', '5', '6', '7'], desc: 'Major scale' };
      ivs = stDef.intervals; labels = stDef.degrees;
      title = (stDef.name || opts.scaleType || 'Scale') + ' on ' + rootName + ' · first position: ' + (stDef.desc || '');
    } else if (mode === 'triads') {
      var q = triadQuality(Q[c.q].iv);
      ivs = TRIADS[q];
      title = rootName + ' ' + q + ' triad · arpeggiate ' + triadSteps(q).replace('1', 'R') + ' across the strings';
    } else {
      ivs = cType.intervals && cType.intervals.length ? cType.intervals : [0, 4, 7];
      title = rootName + (c.q || '') + ' chord tones in first position';
    }
    return { intervals: ivs, labels: labels, title: title, aria: 'Violin fingerboard, first position: ' + title };
  }
  // A violin note, through the shared audio kit (the same voice as the Violin lesson).
  function violinTone(midi, delay, dur) {
    if (window.AudioKit && window.MusicSynth) window.AudioKit.note({ instrument: 'violin', midi: midi, velocity: 0.7, delay: delay || 0, duration: dur || 0.9 });
  }
  function playViolin(arp) {
    if (!view || !view.concertChords.length || !window.FakeBookViolin) return false;
    var c = view.concertChords[chordSel], rootPC = mod(NAT[c.root.l] + c.root.a, 12);
    var mode = opts.engineMode || 'voicings', vt = violinTones(c, chordTypeOf(c), mode);
    var up = window.FakeBookViolin.climb(rootPC, vt.intervals, mode === 'scales');
    var run = arp || mode === 'scales' ? up.concat(up.slice(0, -1).reverse()) : up;
    run.forEach(function (m, i) { violinTone(m, i * (arp || mode === 'scales' ? 0.2 : 0.09), arp || mode === 'scales' ? 0.35 : 1.4); });
    return true;
  }

  function playActiveChord() {
    if (opts.engineInst === 'violin' && playViolin(false)) return;
    if (!view || !view.concertChords.length) return;
    var c = view.concertChords[chordSel];
    var rootPC = mod(NAT[c.root.l] + c.root.a, 12);
    var cType = (GT && GT.CHORD_TYPES.find(function (ct) { return ct.suffix === (c.q || ''); })) || { suffix: c.q || '', name: 'Chord', intervals: Q[c.q] ? Q[c.q].iv : [0, 4, 7] };
    var notes = currentVoicingNotes.length ? currentVoicingNotes : (view.voicings[chordSel] || rootPosition(c));

    if (opts.engineInst === 'guitar' && GT) {
      if (opts.engineMode === 'triads') {
        var triadQ = triadQuality(Q[c.q].iv);
        var tMatch = getGuitarTriad(rootPC, triadQ, opts.triadSet || '123', Number(opts.triadInv) || 0);
        if (tMatch && window.GuitarAudio) {
          var freqs = triadNotes(tMatch, rootPC, c).map(function (n) { return GT.noteFreq(n.s, n.f); });
          window.GuitarAudio.strum(freqs);
          return;
        }
      }
      var formSel = el('[data-fb-guitar-form-sel]') ? el('[data-fb-guitar-form-sel]').value : 'open';
      var shape = guitarShapeFor(rootPC, cType, chordSel);
      if (!shape) return;
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
    if (opts.engineInst === 'violin' && playViolin(true)) return;
    if (!view || !view.concertChords.length) return;
    var c = view.concertChords[chordSel];
    var rootPC = mod(NAT[c.root.l] + c.root.a, 12);
    var cType = (GT && GT.CHORD_TYPES.find(function (ct) { return ct.suffix === (c.q || ''); })) || { suffix: c.q || '', name: 'Chord', intervals: Q[c.q] ? Q[c.q].iv : [0, 4, 7] };
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
        var triadQ = triadQuality(Q[c.q].iv);
        var tMatch = getGuitarTriad(rootPC, triadQ, opts.triadSet || '123', Number(opts.triadInv) || 0);
        if (tMatch && window.GuitarAudio) {
          var freqs = triadNotes(tMatch, rootPC, c).map(function (n) { return GT.noteFreq(n.s, n.f); });
          window.GuitarAudio.sequence(freqs.concat(freqs.slice(0, -1).reverse()), { interval: 0.22 });
          return;
        }
      }
      var formSel = el('[data-fb-guitar-form-sel]') ? el('[data-fb-guitar-form-sel]').value : 'open';
      var shape = guitarShapeFor(rootPC, cType, chordSel);
      if (!shape) return;
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
      barEls[k].classList.toggle('is-start', startBar > 0 && b === startBar);
      barEls[k].classList.toggle('yours', opts.mode === 'trade' && b >= r.from && b <= r.to && yours(b, r.from));
    });
    var selected = startBar || r.from;
    el('[data-fb-ready]').textContent = 'Ready at measure ' + selected;
    el('[data-fb-loop-status]').textContent = opts.loop ? 'Loop ' + r.from + '–' + r.to : (full ? 'Whole tune' : 'Range ' + r.from + '–' + r.to);
    paintChangesLoop();
    scoreNav.paint();
  }

  /* ================================================================ song map + zoom */
  // The shared ScoreNavigation (score-navigation.js) runs the song map, bar jump, steps, zoom, follow
  // playback and keys; this lesson supplies its bars, sections, loop, start bar and zoom (re-engraving).
  var ZOOM_MIN = 0.25, ZOOM_MAX = 2, ZOOM_STEPS = [0.25, 0.33, 0.4, 0.5, 0.6, 0.75, 0.9, 1, 1.2, 1.5];
  function barOf(m) { return Number(m.getAttribute('data-bar')) || 0; }
  function showLoopInputs() { var r = loopRange(); el('[data-fb-from]').value = r.from; el('[data-fb-to]').value = r.to; }
  var scoreNav = window.ScoreNavigation({
    surface: sheetEl, selector: '.fb-bar', mount: el('[data-fb-nav]'), scroller: musicScroller, keyScope: root,
    unit: 'Bar', ariaLabel: 'Song map, bar jump and zoom', followToggle: false, follow: opts.follow !== false, markMeasures: false,
    ignore: '.fb-chord, [data-strip-ci], [data-chg-ci]',
    visible: function () { return !!tune; },
    number: function (i, m) { return barOf(m); },
    section: function (i, m) { return tune && tune.sectionsByBar ? tune.sectionsByBar[barOf(m)] : null; },
    topInset: function () { var tr = el('.fb-transport'); return tr ? tr.getBoundingClientRect().bottom : 0; },
    selectedIndex: function () { return startBar > 0 && barEls[startBar] ? scoreNav.indexOf(barEls[startBar]) : -1; },
    loopRange: function () {
      var r = loopRange();
      if (!tune || (r.from === 1 && r.to === tune.bars) || !barEls[r.from] || !barEls[r.to]) return null;
      return [scoreNav.indexOf(barEls[r.from]), scoreNav.indexOf(barEls[r.to])];
    },
    zoom: { steps: ZOOM_STEPS, get: function () { return opts.zoom || 1; }, set: function (z) { opts.zoom = z; save(); renderSheet(); } },
    // A bar was chosen (clicked, map, Bar #, steps): it becomes the start bar, and playback jumps there.
    onSelect: function (i, bar, info) {
      var b = barOf(bar) || 1, ev = info.event;
      var wasPlaying = !!P;
      stop();
      hideBarPop();
      if (ev && ev.shiftKey) {
        opts.to = Math.max(b, loopRange().from); opts.loop = true;
        syncControls(); paintLoop(); save(); return false;
      }
      // Clicking the highlighted bar again (not while playing) clears the selection: back to the start of the tune or loop.
      if (info.source === 'click' && !wasPlaying && startBar === b) {
        startBar = 0;
        paintLoop(); save();
        return false;
      }
      startBar = b;
      // Keep the selected start inside the playable range.
      if (b < loopRange().from || b > loopRange().to) {
        opts.from = 1; opts.to = tune.bars; opts.loop = false; syncControls();
      }
      paintLoop(); save();
      if (wasPlaying) play(true);
    }
  });

  function bind() {
    root.addEventListener('change', function (ev) {
      var t = ev.target, n = t.name;
      if (t.matches('[data-score-mute], [data-score-solo]')) {
        var soloControl = t.hasAttribute('data-score-solo'), idx = Number(t.getAttribute(soloControl ? 'data-score-solo' : 'data-score-mute'));
        var id = tune.raw.score.parts[idx].id;
        scorePractice[id] = scorePractice[id] || {}; scorePractice[id][soloControl ? 'solo' : 'mute'] = t.checked; updateScoreGains();
      }
      else if (n === 'fb-melody') { opts.melody = t.value; refresh(); respin(); }
      else if (n === 'fb-rhythm') { opts.rhythm = t.value; refresh(); respin(); }
      else if (n === 'fb-voicing' || t.matches('[data-fb-notation-voicing]')) { opts.voicing = t.value; view.voicings = voiceChords(view.concertChords, opts.voicing); syncControls(); showChord(true); renderSheet(); renderBarPop(); save(); respin(); }
      else if (n === 'fb-barclick') { opts.barClick = t.value; if (t.value !== 'shapes') hideBarPop(); save(); }
      else if (n === 'fb-engine-mode') { opts.engineMode = t.value; showChord(false); renderSheet(); renderBarPop(); save(); }
      else if (n === 'fb-triad-inv') { opts.triadInv = Number(t.value); showChord(false); renderSheet(); renderBarPop(); save(); }
      else if (n === 'fb-scale-type') { opts.scaleType = t.value; showChord(false); save(); }
      else if (t.matches('[data-fb-chord-select]')) { chordSel = Number(t.value); showChord(true); }
      else if (t.matches('[data-fb-guitar-voice], [data-fb-tools-guitar-voice]')) { opts.guitarVoice = t.value; refresh(); syncControls(); renderBarPop(); save(); }
      else if (t.matches('[data-fb-guitar-form-sel], [data-fb-quick-guitar-form]')) { opts.guitarForm = t.value; showChord(false); renderSheet(); renderBarPop(); save(); }
      else if (t.matches('[data-fb-guitar-triad-set]')) { opts.triadSet = t.value; showChord(false); renderSheet(); renderBarPop(); save(); }
      else if (t.matches('[data-fb-key]')) { opts.key = t.value; refresh(); respin(); }
      else if (t.matches('[data-fb-instr]')) { opts.instr = t.value; refresh(); respin(); syncSaxKey(); }
      else if (t.matches('[data-fb-octave]')) { opts.octave = Number(t.value); refresh(); respin(); }
      else if (t.matches('[data-fb-analysis]')) { opts.showAnalysis = t.checked; syncControls(); renderSheet(); save(); }
      else if (t.matches('[data-fb-names]')) { opts.names = t.checked; syncControls(); renderSheet(); save(); }
      else if (t.matches('[data-fb-beat-counts]')) { opts.beatCounts = t.value; renderSheet(); save(); }
      else if (t.matches('[data-fb-name-style]')) { opts.nameStyle = t.value; renderSheet(); save(); }
      else if (t.matches('[data-fb-show-bass]')) { opts.showBass = t.checked; renderSheet(); save(); }
      else if (t.matches('[data-fb-bass-horn]')) { opts.bassFor = t.checked ? 'horn' : 'concert'; renderSheet(); save(); }
      else if (t.matches('[data-fb-show-tab]')) { opts.showTab = t.checked; if (t.checked) opts.showPos = false; syncControls(); refresh(); save(); }
      else if (t.matches('[data-fb-shape-size]')) { opts.shapeSize = t.value; refresh(); save(); }
      else if (t.matches('[data-fb-low-bass]')) { opts.lowBass = t.checked; showChord(false); refresh(); renderBarPop(); save(); }
      else if (t.matches('[data-fb-show-shapes]')) { opts.measureShapes = t.checked; if (t.checked) opts.saxFingers = false; syncControls(); refresh(); save(); }
      else if (t.matches('[data-fb-show-sax]')) { opts.saxFingers = t.checked; if (t.checked) opts.measureShapes = false; syncControls(); refresh(); save(); }
      else if (t.matches('[data-fb-show-pos]')) { opts.showPos = t.checked; if (t.checked) opts.showTab = false; syncControls(); refresh(); save(); }
      else if (t.matches('[data-fb-pos-inst]')) { if (t.value === 'sax') { opts.saxFingers = true; opts.measureShapes = false; } else { opts.saxFingers = false; opts.posInst = opts.engineInst = t.value; } syncControls(); refresh(); renderBarPop(); save(); }
      else if (t.matches('[data-fb-tab-pos]')) { opts.tabPos = t.value; refresh(); save(); }
      else if (t.matches('[data-fb-bassline]')) { opts.bassLine = t.value; save(); respin(); }
      else if (t.matches('[data-fb-style]')) { opts.style = t.value; opts.feel = STYLES[opts.style].feel; el('[data-fb-feel]').value = opts.feel; tips(); save(); respin(); }
      else if (t.matches('[data-fb-feel]')) { reanchor(function () { opts.feel = t.value; }); save(); }
      else if (t.matches('[data-fb-mode]')) { opts.mode = t.value; syncControls(); refresh(); paintLoop(); save(); respin(); }
      else if (t.matches('[data-fb-click]')) { opts.click = t.value; syncControls(); save(); respin(); }
      else if (t.matches('[data-fb-lead]')) { opts.lead = t.value; save(); }
      else if (t.matches('[data-fb-loop]')) { opts.loop = t.checked; save(); if (scoreTiming()) respin(); }
      else if (t.matches('[data-fb-follow], [data-fb-follow-sync]')) {
        opts.follow = t.checked;
        root.querySelectorAll('[data-fb-follow], [data-fb-follow-sync]').forEach(function (cb) { cb.checked = opts.follow; });
        scoreNav.setFollow(opts.follow);
        save();
      }
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
      var mobileMore = t.closest('[data-fb-mobile-more]');
      if (mobileMore) {
        var mobileTransport = mobileMore.closest('.fb-transport');
        var mobileOpen = !mobileTransport.classList.contains('is-mobile-more-open');
        mobileTransport.classList.toggle('is-mobile-more-open', mobileOpen);
        mobileMore.setAttribute('aria-expanded', String(mobileOpen));
        mobileMore.textContent = mobileOpen ? 'Less' : 'More';
        return;
      }
      var rem = t.closest('[data-remove-tune]');
      if (rem) {
        ev.stopPropagation();
        removeImported(rem.getAttribute('data-remove-tune'));
        return;
      }
      var prt = t.closest('[data-print-tune]');
      if (prt) {
        ev.stopPropagation();
        var pid = prt.getAttribute('data-print-tune');
        if (pid !== opts.tune) selectTune(pid, true);
        printNotation();
        return;
      }
      var loopAction = t.closest('[data-fb-loop-action]');
      if (loopAction) {
        stop(); hideBarPop();
        var action = loopAction.getAttribute('data-fb-loop-action'), r = loopRange(), b = startBar || r.from;
        if (action === 'clear') { opts.from = 1; opts.to = tune.bars; opts.loop = false; }
        else if (action === 'end' && b < r.from) {
          el('[data-fb-loop-feedback]').textContent = 'Choose an end at or after measure ' + r.from + '.'; return;
        } else {
          opts.loop = true;
          if (action === 'end') opts.to = b;
          else { opts.from = b; opts.to = action === 'start' ? Math.max(b, r.to) : Math.min(tune.bars, b + Number(action) - 1); }
        }
        syncControls(); paintLoop(); save();
        el('[data-fb-loop-feedback]').textContent = action === 'clear' ? 'Loop cleared. Press Play when ready.' : 'Loop set. Press Play when ready.';
        return;
      }
      if (t.closest('[data-fb-selected-shapes]')) {
        stop(); var selected = startBar || loopRange().from;
        showBarPop(selected, barEls[selected]); return;
      }
      var qsToggle = t.closest('[data-fb-notation-toggle]');
      if (qsToggle) {
        var qsBody = el('[data-fb-notation-body]'), qsOpen = qsBody.hidden;
        qsBody.hidden = !qsOpen;
        qsToggle.setAttribute('aria-expanded', String(qsOpen));
        return;
      }
      if (t.closest('[data-fb-print]')) { printNotation(); return; }
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
        opts.posInst = opts.engineInst = instBtn.getAttribute('data-engine-inst');
        syncControls();
        showChord(false);
        renderBarPop();
        refresh();
        save();
        return;
      }
      var liveTgl = t.closest('[data-fb-live-toggle]');
      if (liveTgl) {
        opts.showShapes = opts.showShapes === false ? true : false;
        updateLiveShapesToggle();
        save();
        return;
      }
      var tn = t.closest('[data-tune]');
      if (tn && !t.closest('[data-remove-tune], [data-print-tune]')) {
        selectTune(tn.getAttribute('data-tune'), true);
        return;
      }
      if (t.closest('[data-fb-import-btn]')) {
        var inp = el('[data-fb-import-input]');
        handleImportText(inp ? inp.value : '');
        return;
      }
      if (t.closest('[data-fb-floating-stop]')) { stop(); return; }
      var clickPattern = t.closest('[data-fb-click-pattern]');
      if (clickPattern) {
        opts.click = clickPattern.getAttribute('data-fb-click-pattern');
        if (opts.click !== 'none') opts.clickPrev = opts.click;
        syncControls(); save(); respin(); return;
      }
      if (t.closest('[data-fb-click-toggle]')) {
        if (opts.click === 'none') opts.click = opts.clickPrev && opts.clickPrev !== 'none' ? opts.clickPrev : 'all';
        else { opts.clickPrev = opts.click; opts.click = 'none'; }
        syncControls(); save(); respin(); return;
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
      var step = t.closest('[data-fb-chord-step]');
      if (step) { stepChord(Number(step.getAttribute('data-fb-chord-step'))); return; }
      var chip = t.closest('[data-strip-ci]');
      if (chip) { chordSel = Number(chip.getAttribute('data-strip-ci')); showChord(true); return; }
      var chg = t.closest('[data-chg-ci]');
      if (chg) { chordSel = Number(chg.getAttribute('data-chg-ci')); showChord(true); return; }
      var ch = t.closest('.fb-chord');
      if (ch) { chordSel = Number(ch.getAttribute('data-ci')); showChord(true); return; }
      if (t.closest('[data-fb-barpop-close]')) { hideBarPop(); return; }
      if (t.closest('[data-fb-barpop-off]')) { opts.barClick = 'off'; hideBarPop(); syncControls(); save(); return; }
      var navTog = t.closest('[data-fb-nav-toggle]');
      if (navTog) {
        var tr = navTog.closest('.fb-transport'), open = !tr.classList.contains('is-nav-open');
        tr.classList.toggle('is-nav-open', open); navTog.setAttribute('aria-expanded', String(open)); if (open) scoreNav.refresh(); return;
      }
      if (ev.scoreNavigation) return;           // a bar: ScoreNavigation's onSelect has it
      if (barPopBar !== null && !t.closest('[data-fb-barpop]')) hideBarPop();
    });
    // Hover a chord diagram on the sheet to see it large. The sheet's help layer ignores pointer events
    // (so bar clicks still work), hence the hit test by rectangle.
    var zoomCard = null, zoomTarget = null, zoomFrame = 0;
    function hideShapeZoom() {
      if (zoomTarget) zoomTarget.classList.remove('is-zoom-target');
      zoomTarget = null;
      if (zoomCard) zoomCard.hidden = true;
    }
    function showShapeZoom(shape, ev) {
      var svg = shape.querySelector('svg');
      if (!svg) return hideShapeZoom();
      if (!zoomCard) { zoomCard = document.createElement('div'); zoomCard.className = 'fb-shape-zoom'; zoomCard.setAttribute('aria-hidden', 'true'); document.body.appendChild(zoomCard); }
      if (zoomTarget !== shape) {
        if (zoomTarget) zoomTarget.classList.remove('is-zoom-target');
        zoomTarget = shape;
        shape.classList.add('is-zoom-target');
        var label = shape.querySelector('strong'), big = svg.cloneNode(true);
        big.removeAttribute('style'); big.removeAttribute('width'); big.removeAttribute('height');
        zoomCard.innerHTML = (label ? '<strong>' + MN.escape(label.textContent) + '</strong>' : '');
        zoomCard.appendChild(big);
        var box = svg.viewBox.baseVal;
        zoomCard.style.width = Math.min(300, Math.max(190, innerWidth * .3), box.width * 3.2) + 'px';
      }
      zoomCard.hidden = false;
      var r = shape.getBoundingClientRect(), w = zoomCard.offsetWidth, h = zoomCard.offsetHeight;
      var left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8));
      var top = r.top - h - 8 >= 8 ? r.top - h - 8 : Math.min(r.bottom + 8, innerHeight - h - 8);
      zoomCard.style.left = left + 'px';
      zoomCard.style.top = Math.max(8, top) + 'px';
    }
    sheetEl.addEventListener('pointermove', function (ev) {
      if (ev.pointerType === 'touch' || zoomFrame) return;
      var x = ev.clientX, y = ev.clientY;
      zoomFrame = requestAnimationFrame(function () {
        zoomFrame = 0;
        var hit = null, shapes = sheetEl.querySelectorAll('.fb-measure-shape');
        for (var i = 0; i < shapes.length && !hit; i++) {
          var r = shapes[i].getBoundingClientRect();
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom && shapes[i].querySelector('svg')) hit = shapes[i];
        }
        if (hit) showShapeZoom(hit); else hideShapeZoom();
      });
    });
    sheetEl.addEventListener('pointerleave', hideShapeZoom);
    addEventListener('scroll', hideShapeZoom, true);
    var importInp = el('[data-fb-import-input]');
    if (importInp) {
      importInp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleImportText(importInp.value);
        }
      });
    }
    var gotoImport = el('[data-fb-goto-import]');
    if (gotoImport) {
      gotoImport.addEventListener('click', function () {
        var card = el('[data-fb-import-card]');
        if (!card) return;
        card.open = true;
        var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        card.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
        // Focusing the paste box pops the on-screen keyboard on iPad/iPhone, and most imports are
        // file picks, not typing. Touch devices land on the card's summary; mice keep the paste box.
        var touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
        var target = touch ? card.querySelector('summary') : card.querySelector('[data-fb-import-input]');
        if (target) target.focus({ preventScroll: true });
      });
    }
    var fileInp = el('[data-fb-import-file]');
    if (fileInp) {
      fileInp.addEventListener('change', function () {
        var file = fileInp.files && fileInp.files[0];
        if (!file) return;
        importFile(file);
        fileInp.value = '';
      });
    }
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && barPopBar !== null) { hideBarPop(); ev.stopImmediatePropagation(); }
    }, true);
    root.addEventListener('keydown', function (ev) {
      // Arrow keys walk through the chords from the strip or the step buttons.
      if (ev.target.closest && ev.target.closest('[data-fb-chord-strip], [data-fb-chord-step]') &&
          (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight' || ev.key === 'Home' || ev.key === 'End')) {
        ev.preventDefault();
        if (ev.key === 'Home') { chordSel = 0; showChord(true); }
        else if (ev.key === 'End') { chordSel = view.concertChords.length - 1; showChord(true); }
        else stepChord(ev.key === 'ArrowLeft' ? -1 : 1);
        if (ev.target.closest('[data-fb-chord-strip]')) {
          var focusChip = el('[data-strip-ci="' + chordSel + '"]');
          if (focusChip) focusChip.focus({ preventScroll: true });
        }
        return;
      }
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
    el('[data-fb-reset-loop]').addEventListener('click', function () { startBar = 0; opts.from = 1; opts.to = tune.bars; syncControls(); paintLoop(); save(); respin(); });
  }

  /* ================================================================ boot */
  radios(el('[data-fb-melody]'), 'fb-melody', MELODY, opts.melody);
  radios(el('[data-fb-rhythm]'), 'fb-rhythm', RHYTHM, opts.rhythm);
  radios(el('[data-fb-voicing]'), 'fb-voicing', VOICING, opts.voicing);
  el('[data-fb-notation-voicing]').innerHTML = Object.keys(VOICING).map(function (key) { return '<option value="' + key + '">' + VOICING[key].label + '</option>'; }).join('');
  el('[data-fb-instr]').innerHTML = Object.keys(INSTR).map(function (k) { return '<option value="' + k + '">' + INSTR[k].label + '</option>'; }).join('');

  Promise.all([fetch(DATA_URL).then(function (r) { return r.json(); }), loadImports()]).then(function (loaded) {
    var data = loaded[0];
    defaultTunes = data.tunes;
    importedTunes = loaded[1];
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
    saveTranscription: function (raw) {
      if (!root.classList.contains('is-ready')) throw new Error('The tune library is still loading. Try again in a moment.');
      parseTune(raw);
      importedTunes = importedTunes.filter(function (x) { return x.id !== raw.id; });
      addImports([raw], 'Saved manual transcription “' + raw.title + '”.');
      return raw.id;
    },
    parseTune: parseTune, melody: MELODY, rhythm: RHYTHM, voiceChords: voiceChords, chordTones: chordTones,
    shiftBetween: shiftBetween, shiftKey: shiftKey, keySig: keySig, parseKey: parseKey, decompose: decompose, layoutBars: layoutBars,
    songToTune: songToTune, musicxmlToTune: musicxmlToTune, importText: handleImportText, importFile: importFile, removeImport: removeImported,
    state: function () { return { opts: opts, tune: tune, view: view, playing: !!P }; },
    // What is actually saved, after any pending writes.
    savedImports: function () {
      return importSaves.then(function () {
        if (!importsInLocalStorage) return importStore().then(parseImportList);
        try { return parseImportList(localStorage.getItem(IMPORT_STORE)); } catch (e) { return []; }
      });
    }
  };
})();
