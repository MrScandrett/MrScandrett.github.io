/* sheet-music-trainer.js — Sheet Music Trainer
 * Ten staff drills (identify + construct x note, key signature, interval, scale, chord)
 * across six levels, PreK desk bells to college theory. Every question is generated
 * from the theory tables below, so spelling (C# vs Db) is always honest.
 */
(function () {
  'use strict';

  /* ================================================================
     1. Theory core
     A note is {l: letter 0-6 (C..B), o: octave, a: accidental -2..2}.
     ================================================================ */
  var MN = window.MusicNotation;
  var LET = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  var NAT = [0, 2, 4, 5, 7, 9, 11];
  var SOL = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'];
  var BELL = ['#e53935', '#fb8c00', '#f2c200', '#3fb86a', '#2d94f0', '#b07be0', '#ef5fa7'];
  var ACC = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };
  var ACC_NAME = { '-2': 'double flat', '-1': 'flat', '0': 'natural', '1': 'sharp', '2': 'double sharp' };

  function N(l, o, a) { return { l: l, o: o, a: a || 0 }; }
  function dia(n) { return n.o * 7 + n.l; }
  function semi(n) { return n.o * 12 + NAT[n.l] + n.a; }
  function fromDia(d, a) { return N(((d % 7) + 7) % 7, Math.floor(d / 7), a || 0); }
  function nm(n) { return LET[n.l] + ACC[n.a]; }
  function nmOct(n) { return nm(n) + n.o; }
  function above(root, degOff, semOff) {
    var d = dia(root) + degOff;
    var target = semi(root) + semOff;
    var base = Math.floor(d / 7) * 12 + NAT[((d % 7) + 7) % 7];
    return fromDia(d, target - base);
  }
  function midi(n) { return semi(n) + 12; }
  function ordinal(k) { return ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'][k] || k + 'th'; }

  function rnd(n) { return Math.floor(Math.random() * n); }
  function rndInt(a, b) { return a + rnd(b - a + 1); }
  function pick(arr) { return arr[rnd(arr.length)]; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function uniq(arr) { return arr.filter(function (v, i) { return arr.indexOf(v) === i; }); }

  /* ---- Intervals ---- */
  var MAJ_SEMI = [0, 2, 4, 5, 7, 9, 11];
  var Q_NAME = { P: 'Perfect', M: 'Major', m: 'Minor', A: 'Augmented', d: 'Diminished' };
  var NUM_NAME = { 1: 'Unison', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: 'Octave', 9: '9th', 10: '10th', 11: '11th', 12: '12th', 13: '13th', 14: '14th', 15: '15th' };
  function isPerfectNum(num) { var s = (num - 1) % 7; return s === 0 || s === 3 || s === 4; }
  function intervalSemis(num, q) {
    var simple = (num - 1) % 7, oct = Math.floor((num - 1) / 7);
    var off = isPerfectNum(num) ? { P: 0, A: 1, d: -1 }[q] : { M: 0, m: -1, A: 1, d: -2 }[q];
    if (off === undefined) return null;
    return MAJ_SEMI[simple] + off + 12 * oct;
  }
  function classifyInterval(lo, hi) {
    var num = dia(hi) - dia(lo) + 1, s = semi(hi) - semi(lo);
    var qs = ['P', 'M', 'm', 'A', 'd'];
    for (var i = 0; i < qs.length; i++) if (intervalSemis(num, qs[i]) === s) return { num: num, q: qs[i] };
    return { num: num, q: '?' };
  }
  function ivLabel(q, num) { return Q_NAME[q] + ' ' + NUM_NAME[num]; }

  /* ---- Scales: deg = letter offsets, semi = semitones from the tonic ---- */
  var SCALES = {
    ladder: { name: 'Bell stairs (Do to Sol)', deg: [0, 1, 2, 3, 4], semi: [0, 2, 4, 5, 7] },
    major: { name: 'Major', deg: [0, 1, 2, 3, 4, 5, 6, 7], semi: [0, 2, 4, 5, 7, 9, 11, 12] },
    minor: { name: 'Natural minor', deg: [0, 1, 2, 3, 4, 5, 6, 7], semi: [0, 2, 3, 5, 7, 8, 10, 12] },
    harm: { name: 'Harmonic minor', deg: [0, 1, 2, 3, 4, 5, 6, 7], semi: [0, 2, 3, 5, 7, 8, 11, 12] },
    mel: { name: 'Melodic minor (up)', deg: [0, 1, 2, 3, 4, 5, 6, 7], semi: [0, 2, 3, 5, 7, 9, 11, 12] },
    dor: { name: 'Dorian', deg: [0, 1, 2, 3, 4, 5, 6, 7], semi: [0, 2, 3, 5, 7, 9, 10, 12] },
    phr: { name: 'Phrygian', deg: [0, 1, 2, 3, 4, 5, 6, 7], semi: [0, 1, 3, 5, 7, 8, 10, 12] },
    lyd: { name: 'Lydian', deg: [0, 1, 2, 3, 4, 5, 6, 7], semi: [0, 2, 4, 6, 7, 9, 11, 12] },
    mix: { name: 'Mixolydian', deg: [0, 1, 2, 3, 4, 5, 6, 7], semi: [0, 2, 4, 5, 7, 9, 10, 12] },
    loc: { name: 'Locrian', deg: [0, 1, 2, 3, 4, 5, 6, 7], semi: [0, 1, 3, 5, 6, 8, 10, 12] },
    majpent: { name: 'Major pentatonic', deg: [0, 1, 2, 4, 5, 7], semi: [0, 2, 4, 7, 9, 12] },
    minpent: { name: 'Minor pentatonic', deg: [0, 2, 3, 4, 6, 7], semi: [0, 3, 5, 7, 10, 12] },
    blues: { name: 'Blues', deg: [0, 2, 3, 4, 4, 6, 7], semi: [0, 3, 5, 6, 7, 10, 12] },
    whole: { name: 'Whole tone', deg: [0, 1, 2, 3, 4, 5, 7], semi: [0, 2, 4, 6, 8, 10, 12] },
    dharm: { name: 'Double harmonic', deg: [0, 1, 2, 3, 4, 5, 6, 7], semi: [0, 1, 4, 5, 7, 8, 11, 12] },
    chrom: { name: 'Chromatic', deg: [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6, 7], semi: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }
  };
  function scaleNotes(root, key) {
    var s = SCALES[key];
    return s.deg.map(function (d, i) { return above(root, d, s.semi[i]); });
  }
  function stepPattern(key) {
    var s = SCALES[key].semi, out = [];
    for (var i = 1; i < s.length; i++) {
      var d = s[i] - s[i - 1];
      out.push(d === 1 ? 'H' : d === 2 ? 'W' : d === 3 ? 'W+H' : String(d));
    }
    return out.join(' ');
  }

  /* ---- Chords: deg = letter offsets (thirds), semi = semitones from the root ---- */
  var CHORDS = {
    maj: { name: 'major', deg: [0, 2, 4], semi: [0, 4, 7], seventh: false },
    min: { name: 'minor', deg: [0, 2, 4], semi: [0, 3, 7], seventh: false },
    dim: { name: 'diminished', deg: [0, 2, 4], semi: [0, 3, 6], seventh: false },
    aug: { name: 'augmented', deg: [0, 2, 4], semi: [0, 4, 8], seventh: false },
    sus2: { name: 'suspended 2nd', deg: [0, 1, 4], semi: [0, 2, 7], seventh: false },
    sus4: { name: 'suspended 4th', deg: [0, 3, 4], semi: [0, 5, 7], seventh: false },
    maj7: { name: 'major 7th', deg: [0, 2, 4, 6], semi: [0, 4, 7, 11], seventh: true },
    dom7: { name: 'dominant 7th', deg: [0, 2, 4, 6], semi: [0, 4, 7, 10], seventh: true },
    min7: { name: 'minor 7th', deg: [0, 2, 4, 6], semi: [0, 3, 7, 10], seventh: true },
    hdim7: { name: 'half-diminished 7th', deg: [0, 2, 4, 6], semi: [0, 3, 6, 10], seventh: true },
    dim7: { name: 'diminished 7th', deg: [0, 2, 4, 6], semi: [0, 3, 6, 9], seventh: true },
    mmaj7: { name: 'minor-major 7th', deg: [0, 2, 4, 6], semi: [0, 3, 7, 11], seventh: true }
  };
  var INV_NAME = {
    tri: ['root position', 'first inversion (6)', 'second inversion (6/4)'],
    sev: ['root position (7)', 'first inversion (6/5)', 'second inversion (4/3)', 'third inversion (4/2)']
  };
  function buildChord(root, type, inv) {
    var c = CHORDS[type];
    var notes = c.deg.map(function (d, i) { return above(root, d, c.semi[i]); });
    for (var k = 0; k < inv; k++) { var n = notes.shift(); notes.push(N(n.l, n.o + 1, n.a)); }
    return notes;
  }
  function chordName(root, type) { return nm(root) + ' ' + CHORDS[type].name; }
  function invName(type, inv) { return INV_NAME[CHORDS[type].seventh ? 'sev' : 'tri'][inv]; }

  /* ---- Clefs and key signatures ---- */
  var CLEFS = {};
  ['treble','bass','alto'].forEach(function(name){
    CLEFS[name] = {name:name[0].toUpperCase()+name.slice(1),bottom:MN.clefs[name].bottom};
  });
  var SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  var FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
  var MAJOR_BY_SC = { '-7': 'C♭', '-6': 'G♭', '-5': 'D♭', '-4': 'A♭', '-3': 'E♭', '-2': 'B♭', '-1': 'F', '0': 'C', '1': 'G', '2': 'D', '3': 'A', '4': 'E', '5': 'B', '6': 'F♯', '7': 'C♯' };
  var MINOR_BY_SC = { '-7': 'A♭', '-6': 'E♭', '-5': 'B♭', '-4': 'F', '-3': 'C', '-2': 'G', '-1': 'D', '0': 'A', '1': 'E', '2': 'B', '3': 'F♯', '4': 'C♯', '5': 'G♯', '6': 'D♯', '7': 'A♯' };
  function keySigOf(sc) { return sc === 0 ? null : { t: sc > 0 ? 'sharp' : 'flat', n: Math.abs(sc) }; }
  function scOf(sig) { return !sig || !sig.n ? 0 : (sig.t === 'sharp' ? sig.n : -sig.n); }
  function sigText(sc) {
    if (sc === 0) return 'no sharps or flats';
    return Math.abs(sc) + (sc > 0 ? ' sharp' : ' flat') + (Math.abs(sc) > 1 ? 's' : '');
  }
  function keyExplain(sc, minor) {
    var order = sc > 0 ? SHARP_ORDER : FLAT_ORDER;
    var txt;
    if (sc === 0) txt = 'No sharps or flats is C major (or A minor).';
    else if (sc > 0) txt = 'Sharps arrive in the order ' + SHARP_ORDER.join(' ') + '. The last sharp here is ' + order[sc - 1] + '♯; go up a half step from it to find the major key: ' + MAJOR_BY_SC[sc] + ' major.';
    else if (sc === -1) txt = 'One flat (B♭) is F major. For two or more flats, the major key is the second-to-last flat.';
    else txt = 'Flats arrive in the order ' + FLAT_ORDER.join(' ') + '. The second-to-last flat (' + order[-sc - 2] + '♭) names the major key: ' + MAJOR_BY_SC[sc] + ' major.';
    if (minor) txt += ' The relative minor sits a minor 3rd below: ' + MINOR_BY_SC[sc] + ' minor.';
    return txt;
  }

  /* ================================================================
     2. Levels
     ================================================================ */
  var LEVELS = [
    {
      id: 'prek', icon: '🔔', name: 'PreK', grades: 'Ages 3–5', tag: 'Desk bells & solfege',
      clefs: ['treble'], fixedRange: [28, 32], lg: 1, accProb: 0, dbl: false,
      colors: true, solfege: true, lettersPrimary: false,
      locked: { 'key-id': 'Sharps and flats arrive in 3rd grade.', 'key-build': 'Sharps and flats arrive in 3rd grade.' },
      ivMode: 'dir', scaleSet: ['ladder'], chordMode: 'count'
    },
    {
      id: 'k2', icon: '🌈', name: 'K–2', grades: 'Grades K–2', tag: 'Colored notes & letter names',
      clefs: ['treble'], fixedRange: [28, 38], lg: 1, accProb: 0, dbl: false,
      colors: true, solfege: true, lettersPrimary: true,
      locked: { 'key-id': 'Sharps and flats arrive in 3rd grade.', 'key-build': 'Sharps and flats arrive in 3rd grade.' },
      ivMode: 'num', ivNums: [2, 3, 4, 5], ivHarmonic: false, scaleSet: ['major', 'minor'], scaleRoots: ['C', 'A'], chordMode: 'root'
    },
    {
      id: 'g35', icon: '🎵', name: 'Grades 3–5', grades: 'Grades 3–5', tag: 'Treble & bass, sharps & flats',
      clefs: ['treble', 'bass'], lg: 1, accProb: 0.2, dbl: false,
      colors: true, solfege: false, lettersPrimary: true, acc: true,
      keyMode: 'count', keyMax: 4,
      ivMode: 'num', ivNums: [2, 3, 4, 5, 6, 7, 8], ivHarmonic: true,
      scaleSet: ['major', 'minor'], scaleMaxAcc: 2, scaleGiven: true,
      chordMode: 'qual', chordTypes: ['maj', 'min'], chordMaxAcc: 0
    },
    {
      id: 'g68', icon: '🎼', name: 'Grades 6–8', grades: 'Grades 6–8', tag: 'Interval qualities, minor scales, triads',
      clefs: ['treble', 'bass'], lg: 2, accProb: 0.3, dbl: false,
      colors: false, solfege: false, lettersPrimary: true, acc: true,
      keyMode: 'major', keyMax: 4,
      ivMode: 'quality', ivNums: [2, 3, 4, 5, 6, 7, 8], ivQuals: { perfect: ['P'], imperfect: ['M', 'm'] }, ivHarmonic: true,
      scaleSet: ['major', 'minor', 'harm', 'mel', 'majpent', 'minpent'], scaleMaxAcc: 4,
      chordMode: 'qual', chordTypes: ['maj', 'min', 'dim', 'aug'], chordMaxAcc: 1
    },
    {
      id: 'g912', icon: '🎹', name: 'Grades 9–12', grades: 'Grades 9–12', tag: 'Modes, 7th chords, inversions',
      clefs: ['treble', 'bass'], lg: 3, accProb: 0.35, dbl: false,
      colors: false, solfege: false, lettersPrimary: true, acc: true,
      keyMode: 'both', keyMax: 7,
      ivMode: 'quality', ivNums: [2, 3, 4, 5, 6, 7, 8], ivQuals: { perfect: ['P', 'A', 'd'], imperfect: ['M', 'm', 'A', 'd'] }, ivHarmonic: true,
      scaleSet: ['major', 'minor', 'harm', 'mel', 'dor', 'phr', 'lyd', 'mix', 'loc', 'majpent', 'minpent', 'blues', 'whole'], scaleMaxAcc: 6,
      chordMode: 'qual', chordTypes: ['maj', 'min', 'dim', 'aug', 'maj7', 'dom7', 'min7', 'hdim7', 'dim7'], chordInv: true, chordMaxAcc: 2
    },
    {
      id: 'college', icon: '🎓', name: 'College', grades: 'College theory', tag: 'Alto clef, compound intervals, double accidentals',
      clefs: ['treble', 'bass', 'alto'], lg: 4, accProb: 0.45, dbl: true,
      colors: false, solfege: false, lettersPrimary: true, acc: true, dblUi: true,
      keyMode: 'both', keyMax: 7,
      ivMode: 'quality', ivNums: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], ivQuals: { perfect: ['P', 'A', 'd'], imperfect: ['M', 'm', 'A', 'd'] }, ivHarmonic: true,
      scaleSet: ['major', 'minor', 'harm', 'mel', 'dor', 'phr', 'lyd', 'mix', 'loc', 'majpent', 'minpent', 'blues', 'whole', 'dharm', 'chrom'], scaleMaxAcc: 99,
      chordMode: 'qual', chordTypes: ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4', 'maj7', 'dom7', 'min7', 'hdim7', 'dim7', 'mmaj7'], chordInv: true, chordMaxAcc: 3
    }
  ];

  var DRILLS = [
    { id: 'note-id', group: 'id', drill: 'note', title: 'Note Identification', desc: 'Identify the displayed note.' },
    { id: 'key-id', group: 'id', drill: 'key', title: 'Key Signature Identification', desc: 'Identify the displayed key signature.' },
    { id: 'interval-id', group: 'id', drill: 'interval', title: 'Interval Identification', desc: 'Identify the displayed interval.' },
    { id: 'scale-id', group: 'id', drill: 'scale', title: 'Scale Identification', desc: 'Identify the displayed scale.' },
    { id: 'chord-id', group: 'id', drill: 'chord', title: 'Chord Identification', desc: 'Identify the displayed chord.' },
    { id: 'note-build', group: 'build', drill: 'note', title: 'Note Construction', desc: 'Construct the requested note.' },
    { id: 'key-build', group: 'build', drill: 'key', title: 'Key Signature Construction', desc: 'Construct the requested key signature.' },
    { id: 'interval-build', group: 'build', drill: 'interval', title: 'Interval Construction', desc: 'Construct the requested interval.' },
    { id: 'scale-build', group: 'build', drill: 'scale', title: 'Scale Construction', desc: 'Construct the requested scale.' },
    { id: 'chord-build', group: 'build', drill: 'chord', title: 'Chord Construction', desc: 'Construct the requested chord.' }
  ];
  var YOUNG_TITLES = {
    'note-id': ['Name That Bell', 'Which bell is playing this note?'],
    'interval-id': ['Higher or Lower?', 'Does the second bell go up or down?'],
    'scale-id': ['Bell Stairs', 'Are the bells climbing up or stepping down?'],
    'chord-id': ['How Many Bells?', 'Count the bells that ring together.'],
    'note-build': ['Ring the Bell', 'Put the bell on the staff where it belongs.'],
    'interval-build': ['Hop Up or Down', 'Place a bell higher or lower than the first one.'],
    'scale-build': ['Build the Stairs', 'Climb from Do up to Sol, one bell at a time.'],
    'chord-build': ['Stack the Bells', 'Stack bells to build Do–Mi–Sol.']
  };
  var K2_TITLES = {
    'note-id': ['Note Names', 'Name the note on the staff.'],
    'interval-id': ['Steps and Skips', 'Count how far the notes travel.'],
    'scale-id': ['Major or Minor?', 'Is this scale bright or shadowy?'],
    'chord-id': ['Name the Chord', 'Which chord is stacked here: C, F or G?'],
    'note-build': ['Place the Note', 'Put the named note on the staff.'],
    'interval-build': ['Hop to the Note', 'Place a note the right distance away.'],
    'scale-build': ['Climb the Scale', 'Finish the scale, note by note.'],
    'chord-build': ['Stack the Chord', 'Stack the notes to build the chord.']
  };
  function drillTitle(d) {
    var L = LEVELS[state.level];
    if (state.level === 0 && YOUNG_TITLES[d.id]) return YOUNG_TITLES[d.id];
    if (state.level === 1 && K2_TITLES[d.id]) return K2_TITLES[d.id];
    return [d.title, d.desc];
  }

  /* ================================================================
     3. State
     ================================================================ */
  var state = {
    level: 0, drill: 'note-id', ex: null, answered: false,
    placed: [], acc: 0, sel: { q: null, n: null }, keySel: { t: 'sharp', n: 0 },
    clef: 'mix', colors: true, solfege: true, sound: true,
    session: { c: 0, t: 0, streak: 0 }, hint: false, ghostStep: null, cursorStep: null, nudged: {}
  };
  var STORE_KEY = 'stb-stats-v1';
  var stats = {};
  try { stats = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { stats = {}; }
  function saveStats() { try { localStorage.setItem(STORE_KEY, JSON.stringify(stats)); } catch (e) { /* storage blocked */ } }
  function statFor(level, drill) {
    var k = LEVELS[level].id + ':' + drill;
    if (!stats[k]) stats[k] = { c: 0, t: 0, best: 0, recent: [] };
    return stats[k];
  }
  function lv() { return LEVELS[state.level]; }
  function young() { return state.level <= 1; }

  /* ================================================================
     4. Audio
     ================================================================ */
  var AC = null;
  function audio() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
    if (AC && AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(m, when, dur, vol, bell) {
    var c = audio();
    if (!c || !state.sound) return;
    var f = 440 * Math.pow(2, (m - 69) / 12), t0 = c.currentTime + when;
    var master = c.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    master.connect(c.destination);
    var parts = bell ? [[1, 1], [2.76, 0.42], [5.4, 0.2], [8.93, 0.08]] : [[1, 1], [2, 0.38], [3, 0.18], [4, 0.07]];
    parts.forEach(function (p) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = f * p[0]; g.gain.value = p[1] * 0.5;
      o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
    });
  }
  function playNotes(notes, mode) {
    if (!state.sound || !notes || !notes.length) return;
    var bell = state.level === 0;
    var vol = 0.3 / Math.sqrt(mode === 'stack' ? notes.length : 1.6);
    if (mode === 'stack') {
      notes.forEach(function (n) { tone(midi(n), 0, 1.6, vol, bell); });
    } else {
      var gap = notes.length > 9 ? 0.2 : 0.38;
      notes.forEach(function (n, i) { tone(midi(n), i * gap, bell ? 1.3 : 0.9, vol, bell); });
    }
  }
  function playEx() {
    var ex = state.ex; if (!ex) return;
    var items = (ex.playItems || ex.items || []).map(function (it) { return it.n || it; });
    if (!items.length) return;
    if (ex.playMode === 'both') {
      playNotes(items, 'seq');
      setTimeout(function () { playNotes(items, 'stack'); }, items.length * 380 + 250);
    } else playNotes(items, ex.playMode || 'seq');
  }

  /* ================================================================
     5. Staff renderer (SVG)
     ================================================================ */
  var W = 640, HS = 7; /* HS = half a staff space (one line-or-space step) */
  function cropFor(level) {
    var g = Math.max(1, LEVELS[level].lg);
    return [-2 * g - 2, 8 + 2 * g + 2];
  }
  function keySigNotes(sig, clef) {
    if (!sig || !sig.n) return [];
    var steps = MN.clefs[clef][sig.t];
    return steps.slice(0, sig.n);
  }
  function placeDesc(step) {
    if (step >= 0 && step <= 8) return step % 2 === 0 ? ordinal(step / 2 + 1) + ' line' : ordinal((step - 1) / 2 + 1) + ' space';
    if (step === -1) return 'space just below the bottom line';
    if (step === 9) return 'space just above the top line';
    if (step < 0) return step % 2 === 0 ? ordinal(-step / 2) + ' ledger line below the staff' : 'space below the ' + ordinal((-step - 1) / 2) + ' ledger line';
    return step % 2 === 0 ? ordinal((step - 8) / 2) + ' ledger line above the staff' : 'space above the ' + ordinal((step - 9) / 2 || 1) + ' ledger line';
  }
  function stepOf(n, clef) { return dia(n) - CLEFS[clef].bottom; }

  /* o: {clef, key, items[{n,color,cls}], layout:'seq'|'stack', slots, ghost:{step,acc,slot}, crop} */
  function staffSVG(o) {
    var crop = o.crop || cropFor(state.level);
    var Y0 = 10 + crop[1] * HS, H = 20 + (crop[1] - crop[0]) * HS;
    function y(step) { return Y0 - step * HS; }
    var ks = keySigNotes(o.key, o.clef);
    var kx0 = 80, kStep = 16;
    var keyEnd = ks.length ? kx0 + ks.length * kStep : 70;
    var startX = keyEnd + 38, endX = W - 28;
    var items = o.items || [];
    var slots = o.layout === 'stack' ? 1 : Math.max(o.slots || items.length || 1, 1);
    var span = (endX - startX) / slots;
    function colX(i) { return o.layout === 'stack' ? (startX + endX) / 2 : startX + span * (i + 0.5); }
    var s = '<svg class="stb-staff" data-dense="' + (slots > 6) + '" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="false">';
    var i;
    for (i = 0; i < 5; i++) s += '<line class="stb-line" x1="6" x2="' + (W - 6) + '" y1="' + y(i * 2) + '" y2="' + y(i * 2) + '"/>';
    s += '<line class="stb-bar" x1="6" x2="6" y1="' + y(8) + '" y2="' + y(0) + '"/><line class="stb-bar" x1="' + (W - 6) + '" x2="' + (W - 6) + '" y1="' + y(8) + '" y2="' + y(0) + '"/>';
    s += MN.clef(o.clef, 14, Y0, HS);
    var sym = o.key && o.key.t === 'sharp' ? ACC['1'] : ACC['-1'];
    ks.forEach(function (st, k) {
      s += MN.accidental(sym, kx0 + k * kStep - 5, y(st), HS * 2);
    });
    if (o.slotMarks) {
      for (i = 0; i < slots; i++) s += '<line class="stb-slot" x1="' + colX(i) + '" x2="' + colX(i) + '" y1="' + y(9) + '" y2="' + y(-1) + '"/>';
    }
    /* group items by column */
    var cols = {};
    items.forEach(function (it, idx) {
      var c = o.layout === 'stack' ? 0 : (it.slot !== undefined ? it.slot : idx);
      (cols[c] = cols[c] || []).push(it);
    });
    Object.keys(cols).forEach(function (c) {
      var col = cols[c].slice().sort(function (a, b) { return dia(a.n) - dia(b.n) || a.n.a - b.n.a; });
      var cx = colX(+c), prevStep = -99, prevDisp = false, accCols = [];
      col.forEach(function (it) {
        var st = stepOf(it.n, o.clef), disp = false;
        if (st - prevStep === 1 && !prevDisp) disp = true;
        prevStep = st; prevDisp = disp;
        it._disp = disp;
        /* ledger lines */
        MN.ledgerSteps(st).forEach(function(k){
          s += '<line class="stb-ledger" x1="' + (cx - 15) + '" x2="' + (cx + 15 + (disp ? 24 : 0)) + '" y1="' + y(k) + '" y2="' + y(k) + '"/>';
        });
      });
      col.slice().reverse().forEach(function (it) {
        var st = stepOf(it.n, o.clef), nx = cx + (it._disp ? 24 : 0), ny = y(st);
        var fill = it.color || '';
        var cls = 'stb-note ' + (it.cls || '');
        s += '<g class="' + cls + '" style="color:' + (fill || 'var(--stb-note-ink)') + '">' +
          (o.layout === 'stack' ? MN.glyph('whole', nx - 12, ny, HS * 2) : MN.note(nx, ny, HS * 2, 1, false, st < 4)) + '</g>';
        it._x = cx; it._y = ny;
      });
      /* accidentals, staggered into columns so stacked ones never collide */
      col.slice().reverse().forEach(function (it) {
        // Each exercise note is explicitly spelled; naturals cancel earlier altered letters.
        if (!it.n.a && !items.some(function(other){ return other.n.l === it.n.l && other.n.o === it.n.o && other.n.a; })) return;
        var st = stepOf(it.n, o.clef), k = 0;
        while (accCols[k] !== undefined && Math.abs(accCols[k] - st) < 6) k++;
        accCols[k] = st;
        s += MN.accidental(it.n.a, cx - 28 - k * 17, y(st), HS * 2);
      });
    });
    s += '<g class="stb-ghost"></g>';
    s += '</svg>';
    return s;
  }
  function ghostHTML(o, step, acc, slot) {
    var crop = o.crop || cropFor(state.level);
    var Y0 = 10 + crop[1] * HS;
    var ks = keySigNotes(o.key, o.clef), keyEnd = ks.length ? 80 + ks.length * 16 : 70;
    var startX = keyEnd + 38, endX = W - 28;
    var slots = o.layout === 'stack' ? 1 : Math.max(o.slots || 1, 1);
    var span = (endX - startX) / slots;
    var cx = o.layout === 'stack' ? (startX + endX) / 2 : startX + span * (slot + 0.5);
    var cy = Y0 - step * HS, s = '';
    MN.ledgerSteps(step).forEach(function(k){
      s += '<line class="stb-ledger" x1="' + (cx - 15) + '" x2="' + (cx + 15) + '" y1="' + (Y0 - k * HS) + '" y2="' + (Y0 - k * HS) + '"/>';
    });
    s += '<ellipse class="stb-head-ghost" cx="' + cx + '" cy="' + cy + '" rx="8.6" ry="6.4" transform="rotate(-18 ' + cx + ' ' + cy + ')"/>';
    if (acc) s += MN.accidental(acc, cx - 28, cy, HS * 2);
    return s;
  }

  /* ================================================================
     6. Exercise generators
     ================================================================ */
  function levelRange(clef) {
    var L = lv();
    if (L.fixedRange) return L.fixedRange;
    var b = CLEFS[clef].bottom;
    return [b - 2 * L.lg, b + 8 + 2 * L.lg];
  }
  function pickClef() {
    var L = lv();
    if (state.clef !== 'mix' && L.clefs.indexOf(state.clef) >= 0) return state.clef;
    return pick(L.clefs);
  }
  function validAcc(l, allowDbl) {
    var opts = [];
    var strict = state.level < 5;
    if (!strict || (l !== 2 && l !== 6)) opts.push(1);
    if (!strict || (l !== 3 && l !== 0)) opts.push(-1);
    if (allowDbl && Math.random() < 0.3) { opts.push(2); opts.push(-2); }
    return pick(opts);
  }
  function randNote(clef) {
    var L = lv(), r = levelRange(clef), d = rndInt(r[0], r[1]);
    var a = 0;
    if (L.accProb && Math.random() < L.accProb) a = validAcc(d % 7, L.dbl);
    return fromDia(d, a);
  }
  function inRange(n, clef) { var r = levelRange(clef); return dia(n) >= r[0] && dia(n) <= r[1]; }
  function maxAbsAcc(notes) { return notes.reduce(function (m, n) { return Math.max(m, Math.abs(n.a)); }, 0); }
  function colorOf(n) { return state.colors ? BELL[n.l] : ''; }
  function itemsOf(notes) { return notes.map(function (n) { return { n: n, color: colorOf(n) }; }); }
  function fitsCrop(notes, clef) {
    var crop = cropFor(state.level);
    return notes.every(function (n) { var s = stepOf(n, clef); return s >= crop[0] + 1 && s <= crop[1] - 1; });
  }
  function lessThanAcc(notes, cap) { return notes.filter(function (n) { return n.a !== 0; }).length <= cap; }
  function noteLabel(n) {
    if (state.level === 0 || (state.solfege && n.a === 0 && !lv().lettersPrimary)) return SOL[n.l];
    return nm(n) + (state.solfege && n.a === 0 ? ' (' + SOL[n.l] + ')' : '');
  }
  function bellHTML(l) { return '<span class="stb-dot" style="background:' + BELL[l] + '"></span>'; }

  function praise() {
    var p = state.level === 0 ? ['Ding! Great ringing!', 'You did it!', 'Bell-ieve it — correct!', 'Ding ding! Yes!'] :
      state.level === 1 ? ['Nice reading!', 'Right on!', 'You got it!', 'Super!'] :
        ['Correct.', 'Right.', 'Exactly.', 'Yes.'];
    return pick(p);
  }

  /* ---------- Note ---------- */
  function genNote(kind) {
    var L = lv(), clef = pickClef(), n = randNote(clef);
    var ex = { drill: 'note', kind: kind, clef: clef, target: n, playMode: 'seq', playItems: [n] };
    if (kind === 'id') {
      ex.items = itemsOf([n]);
      ex.layout = 'seq'; ex.slots = 1;
      ex.prompt = state.level === 0 ? 'Which bell is this?' : state.level === 1 ? 'What is the name of this note?' : 'Name this note.';
      ex.input = 'note';
      ex.solve = function () { return { l: n.l, a: n.a }; };
      ex.check = function (r) {
        if (r.l === n.l && r.a === n.a) return { ok: true, msg: praise() + ' That is ' + noteLabel(n) + '.' };
        var guess = N(r.l, n.o, r.a);
        var enh = Math.abs(semi(guess) - semi(n)) % 12 === 0;
        var why = 'It sits on the ' + placeDesc(stepOf(n, clef)) + ', so it is ' + nm(n) + '.';
        if (enh && (r.l !== n.l || r.a !== n.a)) why = 'Same sound, different spelling! On this line or space the note is ' + nm(n) + ', not ' + nm(guess) + '.';
        return { ok: false, msg: 'Not quite. ' + why };
      };
      ex.hint = clef === 'treble' ? 'Treble lines, bottom to top: E G B D F ("Every Good Boy Does Fine"). Spaces spell F A C E.' :
        clef === 'bass' ? 'Bass lines, bottom to top: G B D F A ("Good Boys Do Fine Always"). Spaces: A C E G.' :
          'Alto clef: the middle line is middle C. Count up or down from there.';
      if (state.level === 0) ex.hint = 'Do is on the first line below the staff, with a little line through it. Each bell is one step higher: Do Re Mi Fa Sol!';
      if (state.level === 1) ex.hint = 'Notes on lines: E G B D F. Notes in spaces spell F A C E. Middle C has its own little line.';
    } else {
      ex.items = []; ex.layout = 'seq'; ex.slots = 1;
      if (state.level === 0) ex.prompt = 'Ring the ' + SOL[n.l] + ' bell! Tap the staff where it belongs.';
      else if (state.level === 1) ex.prompt = 'Place the note ' + LET[n.l] + ' (' + SOL[n.l] + ') on the staff.';
      else ex.prompt = 'Place ' + (n.o === 4 && n.l === 0 && !n.a ? 'middle C (C4)' : nmOct(n)) + ' on the ' + CLEFS[clef].name.toLowerCase() + ' staff.';
      ex.input = 'staff'; ex.mode = 'replace'; ex.max = 1; ex.auto = young();
      ex.expectNotes = [n];
      ex.solve = function () { return [n]; };
      ex.check = function (placed) {
        var p = placed[0];
        if (!p) return { ok: false, msg: 'Tap the staff to place a note first.', retry: true };
        if (dia(p) === dia(n) && p.a === n.a) return { ok: true, msg: praise() + ' ' + noteLabel(n) + ' is right where you put it.' };
        var why = 'You placed ' + nmOct(p) + '. ' + nmOct(n) + ' belongs on the ' + placeDesc(stepOf(n, clef)) + '.';
        if (semi(p) === semi(n)) why = 'Same sound, different spelling: you placed ' + nmOct(p) + ', but the question wanted ' + nmOct(n) + '.';
        return { ok: false, msg: 'Not quite. ' + why };
      };
      ex.hint = 'The ' + LET[n.l] + ' you want is on the ' + placeDesc(stepOf(n, clef)) + '.' + (n.a ? ' Pick ' + ACC_NAME[n.a] + ' before you tap.' : '');
      ex.hintGhost = true;
    }
    return ex;
  }

  /* ---------- Key signature ---------- */
  function keyChoices(L) {
    var out = [];
    for (var sc = -L.keyMax; sc <= L.keyMax; sc++) out.push(sc);
    return out;
  }
  function genKey(kind) {
    var L = lv(), clef = pickClef();
    var scs = keyChoices(L), sc = pick(scs);
    var minor = L.keyMode === 'both' ? Math.random() < 0.5 : false;
    var ex = { drill: 'key', kind: kind, clef: clef, sc: sc, minor: minor };
    var keyName = minor ? MINOR_BY_SC[sc] + ' minor' : MAJOR_BY_SC[sc] + ' major';
    ex.layout = 'seq'; ex.slots = 1; ex.playMode = 'seq';
    var tonic = minor ? MINOR_BY_SC[sc] : MAJOR_BY_SC[sc];
    var tl = tonic.charAt(0), ta = tonic.length > 1 ? (tonic.charAt(1) === '♯' ? 1 : -1) : 0;
    var tn = N(LET.indexOf(tl), 4, ta);
    var scale = scaleNotes(tn, minor ? 'minor' : 'major');
    ex.playItems = scale; ex.playMode = 'seq';
    if (kind === 'id') {
      ex.key = keySigOf(sc); ex.items = [];
      ex.input = 'choices';
      if (L.keyMode === 'count') {
        ex.prompt = 'How many sharps or flats are in this key signature?';
        ex.choices = scs.map(function (s) { return { id: String(s), label: s === 0 ? 'None' : Math.abs(s) + (s > 0 ? ' ♯' : ' ♭'), aria: sigText(s) }; });
        ex.correct = String(sc);
      } else {
        ex.prompt = L.keyMode === 'major' ? 'Which major key has this key signature?' : (minor ? 'Which MINOR key has this key signature?' : 'Which MAJOR key has this key signature?');
        var names = minor ? MINOR_BY_SC : MAJOR_BY_SC;
        ex.choices = scs.map(function (s) { return { id: String(s), label: names[s] }; });
        ex.correct = String(sc);
      }
      ex.choiceStyle = 'keys';
      ex.solve = function () { return String(sc); };
      ex.check = function (r) {
        if (r === String(sc)) return { ok: true, msg: praise() + ' ' + (L.keyMode === 'count' ? sigText(sc) + ' = ' + keyName + '.' : keyName + '.') };
        return { ok: false, msg: 'Not quite. This signature has ' + sigText(sc) + '. ' + keyExplain(sc, L.keyMode === 'both') };
      };
      ex.hint = 'Count the symbols first. Sharps follow F C G D A E B; flats follow B E A D G C F. Name the major key from the last sharp (up a half step) or the second-to-last flat.';
    } else {
      ex.key = null; ex.items = [];
      ex.input = 'keysig';
      if (L.keyMode === 'count') ex.prompt = 'Build a key signature with ' + sigText(sc) + '.';
      else ex.prompt = 'Build the key signature for ' + keyName + '.';
      ex.solve = function () { return keySigOf(sc) || { t: 'sharp', n: 0 }; };
      ex.check = function (r) {
        if (scOf(r) === sc) return { ok: true, msg: praise() + ' ' + keyName + ' has ' + sigText(sc) + '.' };
        return { ok: false, msg: 'Not quite. You built ' + sigText(scOf(r)) + '; ' + keyName + ' needs ' + sigText(sc) + '. ' + keyExplain(sc, minor) };
      };
      ex.hint = L.keyMode === 'count' ? 'Add the sharps or flats one at a time; they always go in the same order.' : 'Work backwards: ' + keyName + ' has ' + sigText(sc) + '. Remember the order of sharps (F C G D A E B) or flats (B E A D G C F).';
    }
    return ex;
  }

  /* ---------- Interval ---------- */
  function ivCombos(L) {
    var out = [];
    L.ivNums.forEach(function (num) {
      var quals = isPerfectNum(num) ? L.ivQuals.perfect : L.ivQuals.imperfect;
      quals.forEach(function (q) { out.push({ num: num, q: q, w: (q === 'A' || q === 'd') ? 0.35 : 1 }); });
    });
    return out;
  }
  function weightedPick(arr) {
    var tot = arr.reduce(function (s, x) { return s + x.w; }, 0), r = Math.random() * tot;
    for (var i = 0; i < arr.length; i++) { r -= arr[i].w; if (r <= 0) return arr[i]; }
    return arr[arr.length - 1];
  }
  function genInterval(kind) {
    var L = lv(), clef = pickClef(), ex = { drill: 'interval', kind: kind, clef: clef };
    var tries = 0, lo, hi, spec;
    /* --- PreK: higher / lower --- */
    if (L.ivMode === 'dir') {
      var a = rndInt(28, 32), dir = pick(['up', 'down', 'up', 'down', 'same']);
      var b = dir === 'same' ? a : dir === 'up' ? rndInt(a + 1, 32) : rndInt(28, a - 1);
      if (dir === 'up' && a === 32) { dir = 'down'; b = rndInt(28, 31); }
      if (dir === 'down' && a === 28) { dir = 'up'; b = rndInt(29, 32); }
      lo = fromDia(a); hi = fromDia(b);
      ex.layout = 'seq'; ex.playMode = 'seq'; ex.clef = 'treble';
      if (kind === 'id') {
        ex.items = itemsOf([lo, hi]); ex.playItems = [lo, hi]; ex.slots = 2;
        ex.prompt = 'Listen to the two bells. Is the second bell higher, lower, or the same?';
        ex.input = 'choices'; ex.choiceStyle = 'dir';
        ex.choices = [{ id: 'up', label: 'Higher', icon: '⬆️' }, { id: 'down', label: 'Lower', icon: '⬇️' }, { id: 'same', label: 'Same', icon: '🟰' }];
        ex.correct = dir;
        ex.solve = function () { return dir; };
        ex.check = function (r) { return r === dir ? { ok: true, msg: praise() + ' The second bell is ' + (dir === 'up' ? 'higher' : dir === 'down' ? 'lower' : 'the same') + '.' } : { ok: false, msg: 'Look again: the second bell is ' + (dir === 'up' ? 'higher (it sits higher on the staff)' : dir === 'down' ? 'lower (it sits lower on the staff)' : 'the same (it sits at the same spot)') + '.' }; };
        ex.hint = 'Higher notes sit higher on the staff. Lower notes sit lower.';
      } else {
        var want = pick(['up', 'down']);
        if (a === 32) want = 'down'; if (a === 28) want = 'up';
        ex.items = itemsOf([lo]); ex.playItems = [lo]; ex.slots = 2;
        ex.prompt = 'Place a bell that is ' + (want === 'up' ? 'HIGHER' : 'LOWER') + ' than the first bell.';
        ex.input = 'staff'; ex.mode = 'append'; ex.max = 1; ex.auto = true; ex.startSlot = 1; ex.slotMarks = true;
        ex.solve = function () { return [fromDia(want === 'up' ? Math.min(32, a + 1) : Math.max(28, a - 1))]; };
        ex.check = function (placed) {
          var p = placed[0];
          if (!p) return { ok: false, msg: 'Tap the staff to place a bell first.', retry: true };
          var ok = want === 'up' ? dia(p) > a : dia(p) < a;
          return ok ? { ok: true, msg: praise() + ' That bell is ' + (want === 'up' ? 'higher' : 'lower') + '!' } : { ok: false, msg: 'Try again next time: a ' + (want === 'up' ? 'higher' : 'lower') + ' bell sits ' + (want === 'up' ? 'above' : 'below') + ' the first bell on the staff.' };
        };
        ex.hint = want === 'up' ? 'Climb: pick a spot above the first note.' : 'Slide down: pick a spot below the first note.';
      }
      return ex;
    }
    /* --- K–5 number-only; 6+ quality --- */
    var combos = L.ivMode === 'quality' ? ivCombos(L) : L.ivNums.map(function (n) { return { num: n, q: isPerfectNum(n) ? 'P' : 'M', w: 1 }; });
    do {
      spec = weightedPick(combos);
      lo = randNote(clef);
      hi = above(lo, spec.num - 1, intervalSemis(spec.num, spec.q));
      tries++;
    } while (tries < 200 && (!(inRange(hi, clef) || (L.ivMode === 'quality' && fitsCrop([hi], clef))) || maxAbsAcc([hi]) > (L.dbl ? 2 : 1) || (state.level < 5 && hi.a !== 0 && (hi.l === 2 && hi.a === 1 || hi.l === 6 && hi.a === 1 || hi.l === 3 && hi.a === -1 || hi.l === 0 && hi.a === -1)) || (L.ivMode === 'num' && L.ivNums.indexOf(spec.num) < 0)));
    if (L.ivMode === 'num') { hi = N(hi.l, hi.o, lo.a === 0 && state.level < 2 ? 0 : hi.a); }
    var harmonic = L.ivHarmonic;
    ex.layout = harmonic ? 'stack' : 'seq'; ex.slots = 2;
    ex.playMode = harmonic ? 'both' : 'seq';
    var numOnly = L.ivMode === 'num';
    var label = numOnly ? NUM_NAME[spec.num] : ivLabel(spec.q, spec.num);
    if (kind === 'id') {
      ex.items = itemsOf([lo, hi]); ex.playItems = [lo, hi];
      ex.prompt = numOnly ? (state.level === 1 ? 'How far apart are these two notes? Count the lines and spaces, starting with 1.' : 'Name this interval by its number.') : 'Name this interval (quality and number).';
      ex.input = numOnly ? 'choices' : 'interval';
      if (numOnly) {
        ex.choiceStyle = 'num';
        ex.choices = L.ivNums.map(function (n) { return { id: String(n), label: NUM_NAME[n], sub: state.level === 1 ? (n === 2 ? 'a step' : n === 3 ? 'a skip' : '') : '' }; });
        ex.correct = String(spec.num);
        ex.solve = function () { return String(spec.num); };
        ex.check = function (r) {
          if (r === String(spec.num)) return { ok: true, msg: praise() + ' ' + nm(lo) + ' up to ' + nm(hi) + ' is a ' + NUM_NAME[spec.num] + '.' };
          return { ok: false, msg: 'Not quite. Count letters from ' + LET[lo.l] + ' up to ' + LET[hi.l] + ', counting ' + LET[lo.l] + ' as 1: that is a ' + NUM_NAME[spec.num] + '.' };
        };
        ex.hint = 'Count every line and space from the lower note to the higher note. The lower note is 1.';
      } else {
        var quals = uniq(combos.map(function (c) { return c.q; }));
        ex.qualChoices = ['P', 'M', 'm', 'A', 'd'].filter(function (q) { return quals.indexOf(q) >= 0; });
        ex.numChoices = L.ivNums;
        ex.correct = spec.q + spec.num;
        ex.solve = function () { return { q: spec.q, n: spec.num }; };
        ex.check = function (r) {
          if (r.q === spec.q && r.n === spec.num) return { ok: true, msg: praise() + ' ' + nm(lo) + ' to ' + nm(hi) + ' is a ' + label.toLowerCase().replace(/^./, function (c) { return c.toUpperCase(); }) + '.' };
          return { ok: false, msg: 'Not quite. ' + intervalExplain(lo, hi, spec) };
        };
        ex.hint = 'Step 1: count letters for the number (' + LET[lo.l] + ' is 1). Step 2: count half steps and compare with the major scale from the lower note. One half step smaller than major = minor; one bigger than major or perfect = augmented.';
      }
    } else {
      ex.items = itemsOf([lo]); ex.playItems = [lo];
      ex.input = 'staff'; ex.mode = 'stack1'; ex.max = 1; ex.auto = young(); ex.slotMarks = !harmonic;
      ex.startSlot = harmonic ? 0 : 1;
      var targetN = hi;
      ex.prompt = numOnly ? 'Build a ' + NUM_NAME[spec.num] + ' above ' + nm(lo) + '.' : 'Build a ' + label + ' above ' + nm(lo) + '.';
      if (numOnly && state.level >= 2) ex.prompt += ' (Count letters; the sharp or flat does not change the number.)';
      ex.solve = function () { return [targetN]; };
      ex.check = function (placed) {
        var p = placed[0];
        if (!p) return { ok: false, msg: 'Tap the staff to place the second note first.', retry: true };
        var good = numOnly ? (dia(p) === dia(targetN)) : (dia(p) === dia(targetN) && p.a === targetN.a);
        if (good) return { ok: true, msg: praise() + ' ' + nm(lo) + ' up to ' + nm(targetN) + ' is a ' + label + '.' };
        var c = classifyInterval(lo, p);
        var why = 'You built ' + (c.q === '?' ? 'a ' + NUM_NAME[c.num] : ivLabel(c.q, c.num)) + ' (' + nm(lo) + ' to ' + nm(p) + '). ';
        if (!numOnly && semi(p) === semi(targetN)) why += 'It sounds right but is spelled wrong: a ' + NUM_NAME[spec.num] + ' must use the letter ' + LET[targetN.l] + '. ';
        return { ok: false, msg: 'Not quite. ' + why + 'A ' + label + ' above ' + nm(lo) + ' is ' + nm(targetN) + '.' };
      };
      ex.hint = 'Count ' + (spec.num - 1) + ' letters up from ' + LET[lo.l] + ' to land on ' + LET[targetN.l] + (numOnly ? '.' : ', then count half steps (' + intervalSemis(spec.num, spec.q) % 24 + ') to check the sharp or flat.');
      ex.hintGhost = true;
    }
    return ex;
  }
  function intervalExplain(lo, hi, spec) {
    var s = semi(hi) - semi(lo);
    return 'Letters ' + LET[lo.l] + ' to ' + LET[hi.l] + ' make a ' + NUM_NAME[spec.num] + '. ' + s + ' half steps in a ' + NUM_NAME[spec.num] + ' is ' + ivLabel(spec.q, spec.num) + (isPerfectNum(spec.num) ? ' (perfect intervals are 0, 5, 7, 12 half steps).' : ' (major ' + NUM_NAME[spec.num] + ' = ' + intervalSemis(spec.num, 'M') + ' half steps; minor is one fewer).');
  }

  /* ---------- Scale ---------- */
  function rootCandidates(L) {
    var out = [];
    for (var l = 0; l < 7; l++) for (var a = -1; a <= 1; a++) {
      if (L.scaleRoots && L.scaleRoots.indexOf(LET[l]) < 0) continue;
      if (L.scaleRoots && a !== 0) continue;
      out.push({ l: l, a: a });
    }
    return out;
  }
  function genScale(kind) {
    var L = lv(), clef = pickClef(), ex = { drill: 'scale', kind: kind, clef: clef };
    ex.layout = 'seq'; ex.playMode = 'seq';
    if (L.scaleSet[0] === 'ladder') {
      ex.clef = 'treble';
      var up = Math.random() < 0.5, base = [0, 1, 2, 3, 4].map(function (k) { return fromDia(28 + k); });
      var seq = up ? base : base.slice().reverse();
      if (kind === 'id') {
        ex.items = itemsOf(seq); ex.playItems = seq; ex.slots = 5;
        ex.prompt = 'Listen to the bells. Do they climb UP the stairs or step DOWN?';
        ex.input = 'choices'; ex.choiceStyle = 'dir';
        ex.choices = [{ id: 'up', label: 'Up', icon: '⬆️' }, { id: 'down', label: 'Down', icon: '⬇️' }];
        ex.correct = up ? 'up' : 'down';
        ex.solve = function () { return ex.correct; };
        ex.check = function (r) { return r === ex.correct ? { ok: true, msg: praise() + ' The bells go ' + ex.correct + '.' } : { ok: false, msg: 'Look at the first and last bell: they go ' + ex.correct + ' the staff.' }; };
        ex.hint = 'If the notes climb higher and higher on the staff, the stairs go up!';
      } else {
        ex.items = [{ n: base[0], color: colorOf(base[0]) }]; ex.playItems = base; ex.slots = 5;
        ex.prompt = 'Build the stairs! Start on Do and place the next four bells: Re, Mi, Fa, Sol.';
        ex.input = 'staff'; ex.mode = 'append'; ex.max = 4; ex.auto = false; ex.startSlot = 1; ex.slotMarks = true;
        ex.expectNotes = base;
        ex.solve = function () { return base.slice(1); };
        ex.check = function (placed) { return checkSeq(base, [base[0]].concat(placed), 'those bells', null, true); };
        ex.hint = 'Each bell sits one step higher: line, space, line, space.';
        ex.hintGhost = true;
      }
      return ex;
    }
    var cands = rootCandidates(L), key, root, notes, tries = 0;
    do {
      key = pick(L.scaleSet);
      var rc = pick(cands);
      var oct = rndInt(L.fixedRange ? 4 : (clef === 'bass' ? 2 : clef === 'alto' ? 3 : 4), (clef === 'bass' ? 3 : clef === 'alto' ? 4 : 4));
      if (state.level === 1) { key = pick(['major', 'minor']); rc = { l: key === 'major' ? 0 : 5, a: 0 }; oct = 4; }
      root = N(rc.l, oct, rc.a);
      notes = scaleNotes(root, key);
      tries++;
    } while (tries < 300 && (maxAbsAcc(notes) > (L.dbl ? 2 : 1) || !lessThanAcc(notes.slice(0, -1), L.scaleMaxAcc) || !fitsCrop(notes, clef)));
    var nameStr = nm(root) + ' ' + SCALES[key].name.toLowerCase().replace('melodic minor (up)', 'melodic minor (ascending)');
    ex.notes = notes;
    ex.slots = notes.length;
    ex.playItems = notes;
    if (kind === 'id') {
      ex.items = itemsOf(notes);
      ex.prompt = state.level === 1 ? 'Look at the notes. Is this scale major or minor? (Major sounds bright, minor sounds shadowy.)' : 'Identify the type of this scale. The tonic is ' + nm(root) + '.';
      ex.input = 'choices'; ex.choiceStyle = 'scales';
      ex.choices = L.scaleSet.map(function (k) { return { id: k, label: state.level === 1 ? (k === 'major' ? 'Major' : 'Minor') : SCALES[k].name }; });
      ex.correct = key;
      ex.solve = function () { return key; };
      ex.check = function (r) {
        if (r === key) return { ok: true, msg: praise() + ' ' + nameStr + '. Step pattern: ' + stepPattern(key) + '.' };
        return { ok: false, msg: 'Not quite. This is ' + nameStr + ' (step pattern ' + stepPattern(key) + ').' };
      };
      ex.hint = 'Find the half steps (H). Major: W W H W W W H. Natural minor: W H W W H W W. Harmonic minor has a raised 7th (a W+H leap). Melodic minor (up) raises both the 6th and 7th.';
      if (state.level === 1) ex.hint = 'Look at the third note. Major scales sound bright; minor scales sound shadowy. Listen with "Hear it"!';
    } else {
      var given = L.scaleGiven || state.level <= 2;
      ex.items = given ? [{ n: notes[0], color: colorOf(notes[0]) }] : [];
      ex.input = 'staff'; ex.mode = 'append'; ex.max = given ? notes.length - 1 : notes.length; ex.auto = false;
      ex.startSlot = given ? 1 : 0; ex.slotMarks = true;
      ex.prompt = 'Build the ' + nameStr + ' scale, going up one octave' + (given ? '. The first note is given.' : '.') + ' Pattern: ' + stepPattern(key) + '.';
      if (state.level === 1) ex.prompt = 'Finish the ' + nm(root) + ' ' + (key === 'major' ? 'major' : 'minor') + ' scale. Place the next notes, one for each slot.';
      ex.expectNotes = notes;
      ex.solve = function () { return given ? notes.slice(1) : notes.slice(); };
      ex.check = function (placed) { return checkSeq(notes, given ? [notes[0]].concat(placed) : placed, nameStr, key, given); };
      ex.hint = 'Use the step pattern (' + stepPattern(key) + '). Follow these written letters: ' + notes.map(function(n){return LET[n.l];}).join('–') + '. Add the sharps or flats the pattern needs; chromatic and blues scales can repeat a letter.';
      ex.hintGhost = true;
    }
    return ex;
  }
  function checkSeq(expected, all, label, key, givenFirst) {
    if (all.length < expected.length) {
      var more = expected.length - all.length;
      return { ok: false, retry: true, msg: 'Keep going: place ' + more + ' more note' + (more > 1 ? 's' : '') + ' first.' };
    }
    var bad = -1, i;
    for (i = 1; i < expected.length; i++) {
      var ed = dia(expected[i]) - dia(expected[0]), es = semi(expected[i]) - semi(expected[0]);
      var pd = dia(all[i]) - dia(all[0]), ps = semi(all[i]) - semi(all[0]);
      if (ed !== pd || es !== ps) { bad = i; break; }
    }
    if (bad < 0 && !givenFirst && spellKey(all[0]) !== spellKey(expected[0])) bad = 0;
    if (bad < 0) return { ok: true, msg: praise() + ' ' + (key ? label + ' is correct.' : 'You built ' + label + '.') };
    var msg = bad === 0 ? 'The scale should start on ' + nm(expected[0]) + '.' : 'Note ' + (bad + 1) + ' should be ' + nm(expected[bad]) + ', not ' + nm(all[bad]) + '.';
    if (bad > 0 && semi(all[bad]) - semi(all[0]) === semi(expected[bad]) - semi(expected[0])) msg += ' (Same sound, wrong spelling: each letter name is used once in a scale.)';
    return { ok: false, msg: 'Not quite. ' + msg };
  }
  function spellKey(n) { return n.l + ':' + n.a; }

  /* ---------- Chord ---------- */
  function chordLabel(root, type, inv) { return chordName(root, type) + (inv ? ' · ' + invName(type, inv) : ''); }
  function genChord(kind) {
    var L = lv(), clef = pickClef(), ex = { drill: 'chord', kind: kind, clef: clef };
    ex.layout = 'stack'; ex.playMode = 'both';
    var root, type, inv = 0, notes, tries = 0;
    if (L.chordMode === 'count') {
      ex.clef = 'treble';
      var full = [N(0, 4), N(2, 4), N(4, 4)];
      if (kind === 'id') {
        var cnt = rndInt(1, 3), sub = full.slice(0, cnt);
        if (cnt === 2) sub = [full[0], full[2]];
        ex.items = itemsOf(sub); ex.playItems = sub; ex.slots = 1;
        ex.prompt = 'How many bells ring together in this stack?';
        ex.input = 'choices'; ex.choiceStyle = 'count';
        ex.choices = [1, 2, 3].map(function (k) { return { id: String(k), label: String(k), sub: k === 1 ? 'bell' : 'bells' }; });
        ex.correct = String(cnt);
        ex.solve = function () { return String(cnt); };
        ex.check = function (r) { return r === String(cnt) ? { ok: true, msg: praise() + ' ' + cnt + ' bell' + (cnt > 1 ? 's' : '') + ' ring together.' } : { ok: false, msg: 'Count the note heads in the stack: there are ' + cnt + '.' }; };
        ex.hint = 'Touch each note head as you count: 1, 2, 3.';
      } else {
        ex.items = [{ n: full[0], color: colorOf(full[0]) }]; ex.playItems = full; ex.slots = 1;
        ex.prompt = 'Stack Mi and Sol on top of Do to build the Do–Mi–Sol chord.';
        ex.input = 'staff'; ex.mode = 'stack'; ex.max = 2; ex.auto = false;
        ex.expectNotes = full;
        ex.solve = function () { return [full[1], full[2]]; };
        ex.check = function (placed) { return checkChord(full, [full[0]].concat(placed), 0, 'the Do–Mi–Sol chord'); };
        ex.hint = 'Skip a line or space each time: Do is below the staff, Mi is on the 1st line, Sol on the 2nd line.';
        ex.hintGhost = true;
      }
      return ex;
    }
    if (L.chordMode === 'root') {
      var rl = pick([0, 3, 4]); root = N(rl, 4, 0); type = 'maj';
      notes = buildChord(root, type, 0);
      var chName = LET[rl] + ' chord';
      if (kind === 'id') {
        ex.items = itemsOf(notes); ex.playItems = notes; ex.slots = 1;
        ex.prompt = 'These notes are stacked in thirds. Which chord is this? (Name its bottom note.)';
        ex.input = 'choices'; ex.choiceStyle = 'roots';
        ex.choices = [0, 3, 4].map(function (k) { return { id: String(k), label: LET[k] + ' chord', sub: SOL[k] + ' chord', color: BELL[k] }; });
        ex.correct = String(rl);
        ex.solve = function () { return String(rl); };
        ex.check = function (r) { return r === String(rl) ? { ok: true, msg: praise() + ' That is the ' + chName + ': ' + notes.map(nm).join(' – ') + '.' } : { ok: false, msg: 'The bottom note is ' + LET[rl] + ', so it is the ' + chName + ' (' + notes.map(nm).join(' – ') + ').' }; };
        ex.hint = 'A chord is named for its bottom note. Find the lowest note head!';
      } else {
        ex.items = [{ n: notes[0], color: colorOf(notes[0]) }]; ex.playItems = notes; ex.slots = 1;
        ex.prompt = 'Build the ' + chName + ': stack two more notes on top of ' + LET[rl] + ', skipping a line or space each time.';
        ex.input = 'staff'; ex.mode = 'stack'; ex.max = 2; ex.auto = false;
        ex.expectNotes = notes;
        ex.solve = function () { return notes.slice(1); };
        ex.check = function (placed) { return checkChord(notes, [notes[0]].concat(placed), 0, 'the ' + chName); };
        ex.hint = 'From ' + LET[rl] + ', skip one letter and add ' + LET[notes[1].l] + ', skip another and add ' + LET[notes[2].l] + '.';
        ex.hintGhost = true;
      }
      return ex;
    }
    /* standard: qualities */
    var cands = rootCandidates({}), tpool = L.chordTypes;
    do {
      var rc = pick(cands);
      type = pick(tpool);
      inv = L.chordInv ? rnd(CHORDS[type].seventh ? 4 : 3) : 0;
      if (L.chordInv && Math.random() < 0.45) inv = 0;
      var oct = clef === 'bass' ? rndInt(2, 3) : clef === 'alto' ? rndInt(3, 4) : rndInt(4, 4);
      root = N(rc.l, oct, rc.a);
      notes = buildChord(root, type, inv);
      tries++;
    } while (tries < 300 && (maxAbsAcc(notes) > Math.min(2, L.chordMaxAcc + (L.dbl ? 1 : 0)) || (state.level < 5 && notes.some(function (n) { return Math.abs(n.a) > 1; })) || !fitsCrop(notes, clef)));
    if (state.level === 2 && tries >= 300) { root = N(0, 4, 0); notes = buildChord(root, type, 0); }
    ex.slots = 1;
    var label = chordLabel(root, type, inv);
    var shortName = chordName(root, type);
    if (kind === 'id') {
      ex.items = itemsOf(notes); ex.playItems = notes;
      ex.prompt = L.chordInv ? 'Name this chord: root, quality, and inversion.' : 'Name this chord (root and quality).';
      ex.input = 'choices'; ex.choiceStyle = 'chords';
      var cache = {}, id = function (r, t, v) { return r.l + ':' + r.a + ':' + t + ':' + v; };
      cache[id(root, type, inv)] = { id: id(root, type, inv), label: label };
      var rootsPool = [root], guard = 0;
      while (rootsPool.length < 3 && guard++ < 40) { var rr = pick(cands); if (!rootsPool.some(function (q) { return q.l === rr.l && q.a === rr.a; })) rootsPool.push(N(rr.l, root.o, rr.a)); }
      guard = 0;
      while (Object.keys(cache).length < (L.chordInv ? 6 : 5) && guard++ < 200) {
        var r2 = Math.random() < 0.55 ? root : pick(rootsPool), t2 = Math.random() < 0.55 ? type : pick(tpool);
        var v2 = L.chordInv ? (Math.random() < 0.5 ? inv : rnd(CHORDS[t2].seventh ? 4 : 3)) : 0;
        if (Math.abs(buildChord(r2, t2, 0).reduce(function (m, n) { return Math.max(m, Math.abs(n.a)); }, 0)) > (L.dbl ? 2 : 1)) continue;
        var k = id(r2, t2, v2);
        if (!cache[k]) cache[k] = { id: k, label: chordLabel(r2, t2, v2) };
      }
      ex.choices = shuffle(Object.keys(cache).map(function (k) { return cache[k]; }));
      ex.correct = id(root, type, inv);
      ex.solve = function () { return ex.correct; };
      ex.check = function (r) {
        if (r === ex.correct) return { ok: true, msg: praise() + ' ' + label + ': ' + notes.map(nm).join(' – ') + '.' };
        return { ok: false, msg: 'Not quite. Rearrange the notes into stacked thirds: ' + buildChord(root, type, 0).map(nm).join(' – ') + '. That is ' + shortName + (inv ? ', shown in ' + invName(type, inv) + '.' : '.') + ' ' + chordWhy(root, type) };
      };
      ex.hint = 'Rearrange the notes into a stack of thirds (every other letter). The bottom of that stack is the root. Then measure the lower third (major = 4 half steps, minor = 3) and the 5th.' + (L.chordInv ? ' The lowest note tells you the inversion.' : '');
    } else {
      var rootPos = buildChord(root, type, 0);
      var given = state.level <= 2;
      ex.items = given ? [{ n: notes[0] }] : [];
      ex.input = 'staff'; ex.mode = 'stack'; ex.max = given ? notes.length - 1 : 6; ex.auto = false;
      ex.expectNotes = notes;
      ex.prompt = 'Build ' + (inv ? 'a ' + label : 'a ' + shortName + (CHORDS[type].seventh ? ' chord' : ' triad')) + '.' + (given ? ' The root is given.' : '');
      if (inv) ex.prompt = 'Build ' + shortName + ' in ' + invName(type, inv) + '.';
      ex.solve = function () { return given ? notes.slice(1) : notes.slice(); };
      ex.check = function (placed) { return checkChord(notes, given ? [notes[0]].concat(placed) : placed, inv, shortName, type); };
      ex.hint = 'Stack thirds on ' + nm(root) + ': letters ' + rootPos.map(function (n) { return LET[n.l]; }).join('–') + '. ' + chordWhy(root, type) + (inv ? ' For the inversion, move the lowest note(s) up an octave.' : '');
      ex.hintGhost = true;
      ex.playItems = notes;
    }
    return ex;
  }
  function chordWhy(root, type) {
    var c = CHORDS[type], tri = buildChord(root, type, 0).map(nm).join(' – ');
    var f = c.semi.slice(1).join(', ');
    return 'Formula for ' + c.name + ': ' + f + ' half steps above the root (' + tri + ').';
  }
  function checkChord(expected, all, inv, label, type) {
    if (all.length < expected.length) return { ok: false, msg: 'Your chord needs ' + expected.length + ' notes; you have ' + all.length + '.', retry: true };
    var want = expected.map(spellKey).sort().join('|'), got = all.map(spellKey).sort().join('|');
    var sorted = all.slice().sort(function (a, b) { return semi(a) - semi(b); });
    if (want === got && all.length === expected.length) {
      var bassWant = expected[0];
      if (spellKey(sorted[0]) !== spellKey(bassWant)) return { ok: false, msg: 'The right notes, but the wrong lowest note: ' + (inv ? invName(type, inv) : 'root position') + ' needs ' + nm(bassWant) + ' on the bottom.' };
      return { ok: true, msg: praise() + ' ' + label + ' is built: ' + expected.map(nm).join(' – ') + '.' };
    }
    var missing = expected.filter(function (n) { return !all.some(function (m) { return spellKey(m) === spellKey(n); }); }).map(nm);
    var extra = all.filter(function (n) { return !expected.some(function (m) { return spellKey(m) === spellKey(n); }); }).map(nm);
    var msg = 'Not quite. ' + label + ' needs ' + expected.map(nm).join(' – ') + '.';
    if (missing.length) msg += ' Missing: ' + missing.join(', ') + '.';
    if (extra.length) msg += ' Not in the chord: ' + extra.join(', ') + '.';
    return { ok: false, msg: msg };
  }

  function generate() {
    var d = DRILLS.filter(function (x) { return x.id === state.drill; })[0];
    var ex;
    if (d.drill === 'note') ex = genNote(d.group);
    else if (d.drill === 'key') ex = genKey(d.group);
    else if (d.drill === 'interval') ex = genInterval(d.group);
    else if (d.drill === 'scale') ex = genScale(d.group);
    else ex = genChord(d.group);
    ex.id = d.id;
    return ex;
  }

  /* ================================================================
     7. UI
     ================================================================ */
  var $ = function (id) { return document.getElementById(id); };
  var el = {};
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function renderLevels() {
    el.levels.innerHTML = LEVELS.map(function (L, i) {
      return '<button type="button" class="stb-level" data-level="' + i + '" role="radio" aria-checked="' + (i === state.level) + '" aria-label="' + esc(L.name + ': ' + L.tag) + '">' +
        '<span class="stb-level-icon" aria-hidden="true">' + L.icon + '</span><span class="stb-level-name">' + esc(L.name) + '</span><span class="stb-level-tag">' + esc(L.tag) + '</span></button>';
    }).join('');
  }
  function renderDrills() {
    var L = lv();
    function item(d) {
      var lock = L.locked && L.locked[d.id];
      var t = drillTitle(d);
      return '<button type="button" class="stb-drill stb-drill-' + d.group + (d.id === state.drill ? ' is-on' : '') + (lock ? ' is-locked' : '') + '" data-topic="' + d.drill + '" data-drill="' + d.id + '" aria-pressed="' + (d.id === state.drill) + '"' + (lock ? ' aria-disabled="true"' : '') + '>' +
        '<span class="stb-drill-icon" aria-hidden="true">' + drillIcon(d) + '</span>' +
        '<span class="stb-drill-text"><strong>' + esc(t[0]) + '</strong><small>' + esc(lock ? '🔒 ' + lock : t[1]) + '</small></span></button>';
    }
    function group(gid, title) {
      return '<h3 class="stb-drill-group stb-drill-group-' + gid + '">' + title + '</h3>' + DRILLS.filter(function (d) { return d.group === gid; }).map(item).join('');
    }
    var active = state.drill.slice(-5) === 'build' ? 'build' : 'id';
    var topic = state.drill.split('-')[0];
    el.drills.innerHTML = '<div class="stb-drill-modes" role="group" aria-label="Practice mode">' +
      '<button type="button" data-drill="' + topic + '-id" aria-pressed="' + (active === 'id') + '">Look &amp; identify</button>' +
      '<button type="button" data-drill="' + topic + '-build" aria-pressed="' + (active === 'build') + '">Write &amp; build</button></div>' +
      group(active, active === 'id' ? 'What do you see?' : 'Make it on the staff');
  }
  // Topic diagrams share a silhouette across look/build pairs; the badge shows the action.
  function drillIcon(d) {
    var art = {
      note: '<circle cx="22" cy="23" r="13"/><circle cx="22" cy="23" r="5" class="stb-icon-fill"/><path d="M22 6v4M22 36v4M5 23h4M35 23h4"/>',
      key: '<circle cx="17" cy="19" r="9"/><circle cx="17" cy="19" r="3"/><path d="m24 25 13 13h5v-5h-5v-5h-5"/>',
      interval: '<circle cx="12" cy="33" r="4" class="stb-icon-fill"/><circle cx="35" cy="12" r="4" class="stb-icon-fill"/><path d="M12 24V12h14M18 33h17V21M21 17l5-5-5-5"/>',
      scale: '<path d="M6 38h8v-8h8v-8h8v-8h8V6"/><circle cx="10" cy="32" r="2" class="stb-icon-fill"/><circle cx="18" cy="24" r="2" class="stb-icon-fill"/><circle cx="26" cy="16" r="2" class="stb-icon-fill"/><circle cx="34" cy="8" r="2" class="stb-icon-fill"/>',
      chord: '<path d="m6 31 17-9 17 9-17 9zM6 23l17-9 17 9-17 9zM6 15l17-9 17 9-17 9z"/>'
    };
    var badge = d.group === 'build'
      ? '<path d="m3 12 2-5 7-7 4 4-7 7zM10 2l4 4"/>'
      : '<circle cx="7" cy="7" r="5"/><path d="m11 11 4 4"/>';
    return '<svg viewBox="0 0 46 46" focusable="false" aria-hidden="true">' + art[d.drill] + '</svg>' +
      '<span class="stb-icon-action"><svg viewBox="-2 -2 20 20" focusable="false" aria-hidden="true">' + badge + '</svg></span>';
  }

  function renderToolbar() {
    var L = lv(), h = '';
    if (L.clefs.length > 1) {
      h += '<div class="stb-tool" role="group" aria-label="Clef"><span class="stb-tool-label">Clef</span>';
      ['mix'].concat(L.clefs).forEach(function (c) {
        h += '<button type="button" class="stb-chip' + (state.clef === c ? ' is-on' : '') + '" data-clef="' + c + '" aria-pressed="' + (state.clef === c) + '">' + (c === 'mix' ? 'Mix' : CLEFS[c].name) + '</button>';
      });
      h += '</div>';
    }
    h += '<div class="stb-tool" role="group" aria-label="Aids">';
    h += toggle('colors', 'Bell colors', state.colors);
    if (state.level <= 4) h += toggle('solfege', 'Solfege', state.solfege);
    h += toggle('sound', 'Sound', state.sound);
    h += '</div>';
    el.tools.innerHTML = h;
  }
  function toggle(k, label, on) {
    return '<button type="button" class="stb-chip' + (on ? ' is-on' : '') + '" data-toggle="' + k + '" aria-pressed="' + on + '">' + label + '</button>';
  }

  function scoreHTML() {
    var s = state.session;
    var pct = s.t ? Math.round(100 * s.c / s.t) : 0;
    var stars = young() ? '<span class="stb-stars" aria-hidden="true">' + '★'.repeat(Math.min(s.streak, 10)) + '</span>' : '';
    return '<div class="stb-stat"><b>' + s.c + '/' + s.t + '</b><span>correct</span></div><div class="stb-stat"><b>' + s.streak + '</b><span>in a row</span></div><div class="stb-stat"><b>' + pct + '%</b><span>accuracy</span></div>' + stars;
  }

  function currentDisplay() {
    var ex = state.ex;
    var items = ex.items.slice();
    if (ex.input === 'staff') {
      state.placed.forEach(function (n, i) {
        items.push({ n: n, color: colorOf(n), slot: ex.mode === 'append' ? (ex.startSlot || 0) + i : (ex.mode === 'replace' || ex.mode === 'stack1' ? (ex.layout === 'stack' ? 0 : (ex.startSlot || 0)) : undefined), cls: state.answered ? (state.lastOk ? 'is-good' : 'is-bad') : 'is-placed' });
      });
    }
    var key = ex.key || null;
    if (ex.input === 'keysig') key = state.keySel.n ? { t: state.keySel.t, n: state.keySel.n } : null;
    return { clef: ex.clef, key: key, items: items, layout: ex.layout, slots: ex.slots, slotMarks: ex.slotMarks && !state.answered };
  }
  function stageA11y(ex) {
    if (ex.input === 'staff') return 'Staff for building. Use the up and down arrow keys to move the note, Enter to place it, Backspace to remove the last note.';
    return 'Music notation for the current question. Use the Hear it button to listen.';
  }
  function drawStage() {
    var ex = state.ex, d = currentDisplay();
    state.disp = d;
    el.stage.innerHTML = staffSVG(d);
    var svg = el.stage.querySelector('svg');
    svg.querySelector('.stb-ghost').id = 'stbGhost';
    svg.setAttribute('role', ex.input === 'staff' ? 'application' : 'img');
    svg.setAttribute('aria-label', stageA11y(ex));
    if (ex.input === 'staff' && !state.answered) { svg.setAttribute('tabindex', '0'); svg.classList.add('is-input'); }
    el.answerStaff.innerHTML = '';
  }
  function nextSlot() {
    var ex = state.ex;
    if (ex.mode === 'append') return (ex.startSlot || 0) + state.placed.length;
    if (ex.mode === 'replace' || ex.mode === 'stack1') return ex.layout === 'stack' ? 0 : (ex.startSlot || 0);
    return 0;
  }
  function svgStep(evt) {
    var svg = el.stage.querySelector('svg');
    var pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    var p = pt.matrixTransform(svg.getScreenCTM().inverse());
    var crop = state.disp ? cropFor(state.level) : cropFor(state.level);
    var Y0 = 10 + crop[1] * HS;
    var st = Math.round((Y0 - p.y) / HS);
    return Math.max(crop[0] + 1, Math.min(crop[1] - 1, st));
  }
  function setGhost(step) {
    var g = $('stbGhost'); if (!g) return;
    var ex = state.ex;
    if (step === null || state.answered || (ex.mode === 'append' && state.placed.length >= ex.max) || (ex.mode === 'stack' && state.placed.length >= ex.max)) { g.innerHTML = ''; return; }
    g.innerHTML = ghostHTML({ clef: ex.clef, key: ex.key || null, layout: ex.layout, slots: ex.slots }, step, state.acc, nextSlot());
  }
  function placeAt(step) {
    var ex = state.ex;
    if (state.answered) return;
    var n = fromDia(CLEFS[ex.clef].bottom + step, state.acc);
    var grid = ex.mode;
    if (grid === 'replace' || grid === 'stack1') state.placed = [n];
    else if (grid === 'append') { if (state.placed.length >= ex.max) return; state.placed.push(n); }
    else if (grid === 'stack') {
      var dup = -1;
      state.placed.forEach(function (p, i) { if (dia(p) === dia(n)) dup = i; });
      if (dup >= 0) state.placed.splice(dup, 1);
      else if (state.placed.length < ex.max) state.placed.push(n);
    }
    playNotes([n], 'seq');
    state.acc = 0;
    drawStage(); renderControls(); setGhost(state.cursorStep);
    if (ex.auto) submit();
  }

  function renderControls() {
    var ex = state.ex, h = '';
    if (state.answered) { el.controls.innerHTML = ''; return; }
    if (ex.input === 'staff') {
      var L = lv();
      if (L.acc) {
        var accs = L.dblUi ? [-2, -1, 0, 1, 2] : [-1, 0, 1];
        h += '<div class="stb-acc-row" role="group" aria-label="Accidental for the next note"><span class="stb-tool-label">Next note</span>';
        accs.forEach(function (a) {
          h += '<button type="button" class="stb-chip stb-accbtn' + (state.acc === a ? ' is-on' : '') + '" data-acc="' + a + '" aria-pressed="' + (state.acc === a) + '" aria-label="' + ACC_NAME[a] + '">' + (a === 0 ? '♮' : ACC[a]) + '</button>';
        });
        h += '</div>';
      }
      h += '<div class="stb-edit-row"><button type="button" class="stb-btn" data-act="undo"' + (state.placed.length ? '' : ' disabled') + '>Undo</button><button type="button" class="stb-btn" data-act="clear"' + (state.placed.length ? '' : ' disabled') + '>Clear</button>';
      if (!ex.auto) h += '<button type="button" class="stb-btn stb-btn-primary" data-act="check"' + (state.placed.length ? '' : ' disabled') + '>Check</button>';
      h += '</div>';
      if (young()) h += bellRefRow();
    } else if (ex.input === 'keysig') {
      h += '<div class="stb-key-ui"><div class="stb-seg" role="group" aria-label="Sharps or flats"><button type="button" class="stb-chip stb-accbtn' + (state.keySel.t === 'flat' ? ' is-on' : '') + '" data-keytype="flat" aria-pressed="' + (state.keySel.t === 'flat') + '">♭ Flats</button><button type="button" class="stb-chip stb-accbtn' + (state.keySel.t === 'sharp' ? ' is-on' : '') + '" data-keytype="sharp" aria-pressed="' + (state.keySel.t === 'sharp') + '">♯ Sharps</button></div>' +
        '<div class="stb-stepper"><button type="button" class="stb-btn" data-keyn="-1" aria-label="Fewer">−</button><output aria-live="polite">' + (state.keySel.n || 'None') + '</output><button type="button" class="stb-btn" data-keyn="1" aria-label="More">+</button></div>' +
        '<button type="button" class="stb-btn stb-btn-primary" data-act="check">Check</button></div>';
    }
    el.controls.innerHTML = h;
  }
  function bellRefRow() {
    var cols = state.level === 0 ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6];
    return '<div class="stb-bellref" aria-label="Tap a bell to hear it">' + cols.map(function (l) {
      return '<button type="button" class="stb-bell" data-ring="' + l + '" style="--bell:' + BELL[l] + '"><span>' + (state.level === 0 ? SOL[l] : LET[l]) + '</span></button>';
    }).join('') + '</div>';
  }

  function renderAnswers() {
    var ex = state.ex, h = '';
    if (state.answered) { /* keep answers visible but locked */ }
    if (ex.input === 'note') {
      var L = lv(), letters = state.level === 0 ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6];
      if (L.acc) {
        var accs = L.dblUi ? [-2, -1, 0, 1, 2] : [-1, 0, 1];
        h += '<div class="stb-acc-row" role="group" aria-label="Accidental"><span class="stb-tool-label">Accidental</span>' + accs.map(function (a) {
          return '<button type="button" class="stb-chip stb-accbtn' + (state.acc === a ? ' is-on' : '') + '" data-acc="' + a + '" aria-pressed="' + (state.acc === a) + '" aria-label="' + ACC_NAME[a] + '">' + (a === 0 ? '♮' : ACC[a]) + '</button>';
        }).join('') + '</div>';
      }
      h += '<div class="stb-letters stb-letters-' + (state.level <= 1 ? 'bells' : 'plain') + '">' + letters.map(function (l) {
        var col = (state.level <= 2 || state.colors) ? ' style="--bell:' + BELL[l] + '"' : '';
        var label = state.level === 0 ? SOL[l] : LET[l];
        var sub = state.level > 0 && state.solfege ? SOL[l] : '';
        return '<button type="button" class="stb-answer stb-letter" data-letter="' + l + '"' + col + '><b>' + label + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</button>';
      }).join('') + '</div>';
    } else if (ex.input === 'choices') {
      h += '<div class="stb-choices stb-choices-' + ex.choiceStyle + '">' + ex.choices.map(function (c) {
        return '<button type="button" class="stb-answer" data-choice="' + esc(c.id) + '"' + (c.color ? ' style="--bell:' + c.color + '"' : '') + (c.aria ? ' aria-label="' + esc(c.aria) + '"' : '') + '>' +
          (c.icon ? '<span class="stb-choice-icon" aria-hidden="true">' + c.icon + '</span>' : '') + '<b>' + esc(c.label) + '</b>' + (c.sub ? '<small>' + esc(c.sub) + '</small>' : '') + '</button>';
      }).join('') + '</div>';
    } else if (ex.input === 'interval') {
      h += '<div class="stb-iv"><div class="stb-iv-row" role="group" aria-label="Quality">' + ex.qualChoices.map(function (q) {
        return '<button type="button" class="stb-answer stb-iv-q' + (state.sel.q === q ? ' is-sel' : '') + '" data-q="' + q + '" aria-pressed="' + (state.sel.q === q) + '"><b>' + Q_NAME[q] + '</b><small>' + q + '</small></button>';
      }).join('') + '</div><div class="stb-iv-row" role="group" aria-label="Number">' + ex.numChoices.map(function (n) {
        return '<button type="button" class="stb-answer stb-iv-n' + (state.sel.n === n ? ' is-sel' : '') + '" data-n="' + n + '" aria-pressed="' + (state.sel.n === n) + '"><b>' + n + '</b><small>' + NUM_NAME[n] + '</small></button>';
      }).join('') + '</div><button type="button" class="stb-btn stb-btn-primary" data-act="check-iv"' + (state.sel.q && state.sel.n ? '' : ' disabled') + '>Check</button></div>';
    }
    el.answers.innerHTML = h;
  }

  function setPrompt() {
    var ex = state.ex, d = DRILLS.filter(function (x) { return x.id === state.drill; })[0], t = drillTitle(d);
    el.kicker.textContent = (d.group === 'id' ? (state.level === 0 ? 'Listen & Look' : 'Identification') : (state.level === 0 ? 'Build It' : 'Construction')) + ' · ' + lv().name;
    el.title.textContent = t[0];
    el.prompt.textContent = ex.prompt;
    el.score.innerHTML = scoreHTML();
  }

  function newQuestion() {
    state.answered = false; state.placed = []; state.acc = 0; state.sel = { q: null, n: null }; state.hint = false; state.lastOk = null;
    state.keySel = { t: 'sharp', n: 0 }; state.cursorStep = null;
    state.ex = generate();
    var d = DRILLS.filter(function (x) { return x.id === state.drill; })[0];
    el.card.setAttribute('data-kind', d.group);
    el.feedback.innerHTML = ''; el.feedback.className = 'stb-feedback';
    el.next.hidden = true; el.hintBtn.disabled = false;
    el.hintText.textContent = ''; el.hintText.hidden = true;
    setPrompt(); drawStage(); renderControls(); renderAnswers();
    if (audioReady) setTimeout(playEx, 200);
  }
  var audioReady = false;

  function submit(resp) {
    var ex = state.ex;
    if (state.answered) return;
    var r;
    if (ex.input === 'staff') r = ex.check(state.placed);
    else if (ex.input === 'keysig') r = ex.check(state.keySel);
    else r = ex.check(resp);
    if (r.retry) { say(r.msg, 'warn'); return; }
    state.answered = true; state.lastOk = r.ok;
    var st = statFor(state.level, state.drill);
    st.t++; state.session.t++;
    if (r.ok) { st.c++; state.session.c++; state.session.streak++; st.best = Math.max(st.best, state.session.streak); } else state.session.streak = 0;
    st.recent.push(r.ok ? 1 : 0); if (st.recent.length > 10) st.recent.shift();
    saveStats(); renderProgress();
    markAnswers(resp, r);
    el.score.innerHTML = scoreHTML();
    say(r.msg, r.ok ? 'good' : 'bad');
    if (!r.ok && ex.input === 'staff') showSolution();
    drawStage(); renderControls();
    if (ex.input === 'staff' && !r.ok) { /* staff already shows red notes */ }
    el.next.hidden = false; el.next.focus({ preventScroll: true });
    el.hintBtn.disabled = true;
    if (young() && r.ok) burst();
    if (!(ex.input === 'staff' && ex.auto && false)) setTimeout(function () { if (ex.input === 'staff') playNotes(ex.expectNotes || ex.solve(), ex.layout === 'stack' ? 'stack' : 'seq'); else playEx(); }, 350);
    nudge();
  }
  function markAnswers(resp, r) {
    var ex = state.ex;
    var btns = el.answers.querySelectorAll('.stb-answer');
    Array.prototype.forEach.call(btns, function (b) { b.disabled = true; });
    if (ex.input === 'choices') {
      Array.prototype.forEach.call(btns, function (b) {
        if (b.getAttribute('data-choice') === ex.correct) b.classList.add('is-right');
        else if (b.getAttribute('data-choice') === resp) b.classList.add('is-wrong');
      });
    } else if (ex.input === 'note') {
      var sol = ex.solve();
      Array.prototype.forEach.call(btns, function (b) {
        if (+b.getAttribute('data-letter') === sol.l) b.classList.add('is-right');
        else if (resp && +b.getAttribute('data-letter') === resp.l) b.classList.add('is-wrong');
      });
      var chips = el.answers.querySelectorAll('.stb-chip'); Array.prototype.forEach.call(chips, function (b) { b.disabled = true; });
    } else if (ex.input === 'interval') {
      var s = ex.solve();
      Array.prototype.forEach.call(btns, function (b) {
        if (b.getAttribute('data-q') === s.q || +b.getAttribute('data-n') === s.n) b.classList.add('is-right');
        else if (b.classList.contains('is-sel')) b.classList.add('is-wrong');
      });
      var cb = el.answers.querySelector('[data-act="check-iv"]'); if (cb) cb.disabled = true;
    }
  }
  function showSolution() {
    var ex = state.ex, sol = ex.solve();
    var items = ex.items.slice();
    if (ex.input === 'staff') {
      var slotBase = ex.mode === 'append' ? (ex.startSlot || 0) : 0;
      sol.forEach(function (n, i) { items.push({ n: n, color: colorOf(n), cls: 'is-good', slot: ex.mode === 'append' ? slotBase + i : (ex.layout === 'stack' ? 0 : (ex.startSlot || 0)) }); });
    }
    el.answerStaff.innerHTML = '<p class="stb-answer-label">Here is the answer:</p>' + staffSVG({ clef: ex.clef, key: ex.key || null, items: items, layout: ex.layout, slots: ex.slots });
  }
  function say(msg, cls) {
    el.feedback.className = 'stb-feedback is-' + cls;
    el.feedback.textContent = msg;
  }
  function burst() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var box = el.card, n = 14, h = '';
    for (var i = 0; i < n; i++) {
      h += '<i style="--x:' + (rnd(100) - 50) + 'vw;--y:' + (-20 - rnd(40)) + 'vh;--d:' + (rnd(300)) + 'ms;--c:' + BELL[i % 7] + '"></i>';
    }
    var s = document.createElement('div'); s.className = 'stb-burst'; s.innerHTML = h; s.setAttribute('aria-hidden', 'true');
    box.appendChild(s); setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 1400);
  }
  function nudge() {
    var st = statFor(state.level, state.drill);
    var key = state.level + ':' + state.drill;
    if (st.recent.length >= 10 && st.recent.reduce(function (a, b) { return a + b; }, 0) >= 9 && state.level < LEVELS.length - 1 && !state.nudged[key]) {
      state.nudged[key] = true;
      el.nudge.hidden = false;
      el.nudge.querySelector('.stb-nudge-text').textContent = 'You got ' + st.recent.reduce(function (a, b) { return a + b; }, 0) + ' of the last 10 right. Ready for ' + LEVELS[state.level + 1].name + '?';
    }
  }

  function renderProgress() {
    if (!el.progress) return;
    var rows = DRILLS.map(function (d) {
      var st = statFor(state.level, d.id), lock = lv().locked && lv().locked[d.id];
      if (lock) return '';
      var pct = st.t ? Math.round(100 * st.c / st.t) : 0;
      return '<li><span>' + esc(drillTitle(d)[0]) + '</span><span class="stb-bar-wrap" role="img" aria-label="' + pct + ' percent correct"><span class="stb-bar-fill" style="width:' + pct + '%"></span></span><span class="stb-prog-n">' + st.c + '/' + st.t + '</span></li>';
    }).join('');
    el.progress.innerHTML = rows;
  }

  function selectLevel(i, silent) {
    state.level = i;
    var L = lv();
    state.colors = L.colors; state.solfege = L.solfege || state.level === 0;
    state.clef = 'mix';
    state.session = { c: 0, t: 0, streak: 0 };
    el.stbRoot.setAttribute('data-level', String(i));
    document.documentElement.style.setProperty('--stb-level', String(i));
    if (L.locked && L.locked[state.drill]) state.drill = 'note-id';
    renderLevels(); renderDrills(); renderToolbar(); renderProgress();
    el.nudge.hidden = true;
    var lvLabel = $('stbLevelLabel'); if (lvLabel) lvLabel.textContent = L.name + ' · ' + L.tag;
    newQuestion();
    try { localStorage.setItem('stb-level', String(i)); } catch (e) { /* ignore */ }
  }

  /* ---------- Events ---------- */
  function bind() {
    el.levels.addEventListener('click', function (e) {
      var b = e.target.closest('[data-level]'); if (!b) return;
      audioReady = true; audio();
      selectLevel(+b.getAttribute('data-level'));
    });
    el.drills.addEventListener('click', function (e) {
      var b = e.target.closest('[data-drill]'); if (!b) return;
      var id = b.getAttribute('data-drill');
      if (lv().locked && lv().locked[id]) { say(lv().locked[id], 'warn'); return; }
      audioReady = true; audio();
      state.drill = id; renderDrills(); newQuestion();
      if (window.innerWidth < 900) el.card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    el.tools.addEventListener('click', function (e) {
      var c = e.target.closest('[data-clef]'), t = e.target.closest('[data-toggle]');
      if (c) { state.clef = c.getAttribute('data-clef'); renderToolbar(); newQuestion(); }
      if (t) {
        var k = t.getAttribute('data-toggle'); state[k] = !state[k];
        renderToolbar();
        if (k === 'sound') { if (state.sound) { audioReady = true; audio(); } return; }
        if (!state.answered || true) { var keep = state.placed; drawStage(); renderAnswers(); renderControls(); setPrompt(); }
      }
    });
    el.controls.addEventListener('click', function (e) {
      var a = e.target.closest('[data-acc]'), act = e.target.closest('[data-act]'), kt = e.target.closest('[data-keytype]'), kn = e.target.closest('[data-keyn]'), ring = e.target.closest('[data-ring]');
      if (ring) { audioReady = true; var l = +ring.getAttribute('data-ring'); tone(midi(N(l, 4, 0)), 0, 1.4, 0.2, state.level === 0); return; }
      if (a) { state.acc = +a.getAttribute('data-acc'); renderControls(); setGhost(state.cursorStep); }
      if (kt) { state.keySel.t = kt.getAttribute('data-keytype'); drawStage(); renderControls(); }
      if (kn) { state.keySel.n = Math.max(0, Math.min(7, state.keySel.n + +kn.getAttribute('data-keyn'))); drawStage(); renderControls(); }
      if (act) {
        var w = act.getAttribute('data-act');
        if (w === 'undo') { state.placed.pop(); drawStage(); renderControls(); }
        if (w === 'clear') { state.placed = []; drawStage(); renderControls(); }
        if (w === 'check') { audioReady = true; submit(); }
      }
    });
    el.answers.addEventListener('click', function (e) {
      audioReady = true; audio();
      var a = e.target.closest('[data-acc]');
      if (a && !state.answered) { state.acc = +a.getAttribute('data-acc'); renderAnswers(); return; }
      var ch = e.target.closest('[data-choice]'), lt = e.target.closest('[data-letter]'), q = e.target.closest('[data-q]'), n = e.target.closest('[data-n]'), ck = e.target.closest('[data-act="check-iv"]');
      if (state.answered) return;
      if (ch) submit(ch.getAttribute('data-choice'));
      else if (lt) {
        var l = +lt.getAttribute('data-letter');
        tone(midi(N(l, 4, state.acc)), 0, 1.2, 0.18, state.level === 0);
        submit({ l: l, a: state.acc });
      } else if (q) { state.sel.q = q.getAttribute('data-q'); renderAnswers(); }
      else if (n) { state.sel.n = +n.getAttribute('data-n'); renderAnswers(); }
      else if (ck) submit({ q: state.sel.q, n: state.sel.n });
    });
    el.stage.addEventListener('pointermove', function (e) {
      var ex = state.ex; if (!ex || ex.input !== 'staff' || state.answered) return;
      var st = svgStep(e); state.cursorStep = st; setGhost(st);
    });
    el.stage.addEventListener('pointerleave', function () { state.cursorStep = null; setGhost(null); });
    el.stage.addEventListener('pointerdown', function (e) {
      var ex = state.ex; if (!ex || ex.input !== 'staff' || state.answered) return;
      audioReady = true; audio();
      placeAt(svgStep(e));
    });
    el.stage.addEventListener('keydown', function (e) {
      var ex = state.ex; if (!ex || ex.input !== 'staff' || state.answered) return;
      var crop = cropFor(state.level);
      if (state.cursorStep === null) state.cursorStep = 4;
      if (e.key === 'ArrowUp') { state.cursorStep = Math.min(crop[1] - 1, state.cursorStep + 1); setGhost(state.cursorStep); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { state.cursorStep = Math.max(crop[0] + 1, state.cursorStep - 1); setGhost(state.cursorStep); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { audioReady = true; placeAt(state.cursorStep); e.preventDefault(); }
      else if (e.key === 'Backspace') { state.placed.pop(); drawStage(); renderControls(); setGhost(state.cursorStep); e.preventDefault(); }
      else if (e.key === '#' || e.key === '+') { state.acc = Math.min(lv().dblUi ? 2 : 1, state.acc + 1); renderControls(); setGhost(state.cursorStep); }
      else if (e.key === '-') { state.acc = Math.max(lv().dblUi ? -2 : -1, state.acc - 1); renderControls(); setGhost(state.cursorStep); }
    });
    el.next.addEventListener('click', function () { newQuestion(); });
    el.hear.addEventListener('click', function () { audioReady = true; playEx(); });
    el.hintBtn.addEventListener('click', function () {
      var ex = state.ex; if (!ex || state.answered) return;
      el.hintText.hidden = false; el.hintText.textContent = ex.hint || '';
      if (ex.hintGhost && ex.input === 'staff' && state.level < 5) {
        var tgt = ex.expectNotes || [];
        var st = tgt.length ? stepOf(tgt[Math.min(state.placed.length + (ex.items ? ex.items.length : 0), tgt.length - 1)], ex.clef) : 4;
        state.cursorStep = st; setGhost(st);
      }
    });
    el.nudgeGo.addEventListener('click', function () { selectLevel(state.level + 1); });
    el.nudgeNo.addEventListener('click', function () { el.nudge.hidden = true; });
    document.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      var ex = state.ex; if (!ex) return;
      if (state.answered && (e.key === 'Enter') && document.activeElement === document.body) { newQuestion(); return; }
      if (state.answered || ex.input !== 'note' || e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key.toLowerCase(), i = 'cdefgab'.indexOf(k);
      if (i >= 0 && (state.level > 0 || i <= 4)) { audioReady = true; submit({ l: i, a: state.acc }); }
    });
  }

  function init() {
    el = {
      stbRoot: $('stb'), levels: $('stbLevels'), drills: $('stbDrills'), card: $('stbCard'), tools: $('stbTools'),
      kicker: $('stbKicker'), title: $('stbTitle'), score: $('stbScore'), prompt: $('stbPrompt'), stage: $('stbStage'),
      controls: $('stbControls'), answers: $('stbAnswers'), feedback: $('stbFeedback'), answerStaff: $('stbAnswerStaff'),
      next: $('stbNext'), hear: $('stbHear'), hintBtn: $('stbHintBtn'), hintText: $('stbHint'),
      nudge: $('stbNudge'), nudgeGo: $('stbNudgeGo'), nudgeNo: $('stbNudgeNo'), progress: $('stbProgress')
    };
    if (!el.stbRoot) return;
    bind();
    var saved = 0;
    try { saved = parseInt(localStorage.getItem('stb-level') || '0', 10) || 0; } catch (e) { saved = 0; }
    var q = /[?&]level=(\d)/.exec(location.search);
    if (q) saved = +q[1];
    selectLevel(Math.max(0, Math.min(LEVELS.length - 1, saved)));
    renderBellChart();
  }

  /* Desk-bell chart in the cheat sheet */
  function renderBellChart() {
    var box = $('stbBellChart'); if (!box) return;
    var notes = [N(0, 4), N(1, 4), N(2, 4), N(3, 4), N(4, 4), N(5, 4), N(6, 4), N(0, 5)];
    box.innerHTML = notes.map(function (n, i) {
      return '<button type="button" class="stb-bell" style="--bell:' + BELL[n.l] + '" data-chart="' + i + '" aria-label="' + SOL[n.l] + ' (' + LET[n.l] + (n.o === 5 ? ', high' : '') + ')"><span>' + SOL[n.l] + '</span><small>' + LET[n.l] + (n.o === 5 ? '′' : '') + '</small></button>';
    }).join('');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-chart]'); if (!b) return;
      audioReady = true; tone(midi(notes[+b.getAttribute('data-chart')]), 0, 1.4, 0.2, true);
    });
    var fig = $('stbChartStaff');
    if (fig) fig.innerHTML = staffSVG({ clef: 'treble', key: null, items: notes.map(function (n) { return { n: n, color: BELL[n.l] }; }), layout: 'seq', slots: 8, crop: [-4, 12] });
  }

  window.SheetMusicTrainer = {
    _theory: { N: N, dia: dia, semi: semi, above: above, scaleNotes: scaleNotes, buildChord: buildChord, classifyInterval: classifyInterval, intervalSemis: intervalSemis, SCALES: SCALES, CHORDS: CHORDS, LEVELS: LEVELS, DRILLS: DRILLS },
    _gen: function (level, drill) { state.level = level; state.drill = drill; state.colors = LEVELS[level].colors; return generate(); },
    _staff: staffSVG
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
