/* fake-book-harmony.js — works out the chords and the key from the notes of a score.
   Used when an imported MusicXML file has no chord symbols (most classical scores), so the
   band follows the music instead of vamping on the home chord.

   How it listens:
   - Every note of every part counts (melody, inner voices, bass), weighted by how long it
     sounds. The lowest sounding note, the fundamental bass, counts extra and decides
     inversions (C/E).
   - Key, bar by bar: each bar's notes (with its neighbours) are matched against the
     Krumhansl–Kessler key profiles, and a Viterbi pass keeps the key unless the music
     really moves (changing key costs something; nearby keys cost less). Key areas shorter
     than two bars are folded back in.
   - Chords, beat by beat: chord templates scored against each beat (chord tones in, other
     notes out, root in the bass, fits the key), then a second Viterbi pass that prefers
     holding a chord and changing on strong beats, with a small pull toward falling fifths.

   Pure functions, no DOM: analyze(notes, opts) is exported for tests. */
(function (root) {
  'use strict';

  function mod(n, m) { return ((n % m) + m) % m; }
  var KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  var KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  var QUALS = [
    { q: '', iv: [0, 4, 7] }, { q: 'm', iv: [0, 3, 7] }, { q: 'dim', iv: [0, 3, 6] },
    { q: '7', iv: [0, 4, 7, 10] }, { q: 'maj7', iv: [0, 4, 7, 11] }, { q: 'm7', iv: [0, 3, 7, 10] },
    { q: 'm7b5', iv: [0, 3, 6, 10] }, { q: 'dim7', iv: [0, 3, 6, 9] }
  ];
  // Chords that belong to a key: [semitones above the tonic, quality].
  var DIATONIC = {
    major: [[0, ''], [2, 'm'], [4, 'm'], [5, ''], [7, ''], [9, 'm'], [11, 'dim'], [0, 'maj7'], [2, 'm7'], [4, 'm7'], [5, 'maj7'], [7, '7'], [9, 'm7'], [11, 'm7b5']],
    minor: [[0, 'm'], [2, 'dim'], [3, ''], [5, 'm'], [7, ''], [7, 'm'], [8, ''], [10, ''], [11, 'dim'], [0, 'm7'], [2, 'm7b5'], [3, 'maj7'], [5, 'm7'], [7, '7'], [8, 'maj7'], [11, 'dim7']]
  };
  var NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  var MAJOR_FIFTHS = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 1: -5, 8: -4, 3: -3, 10: -2, 5: -1 };

  // How a key spells notes: its own scale letters, flats for chromatic notes in flat keys.
  function keyFifths(tonic, minor) { return MAJOR_FIFTHS[mod(tonic + (minor ? 3 : 0), 12)]; }
  function spell(pc, key) {
    var f = keyFifths(key.tonic, key.minor);
    if (f === 6 && pc === 5) return 'E#';
    if (f <= -6 && pc === 11) return 'Cb';
    if (f > 0) return NAMES_SHARP[pc];
    if (f < 0) return NAMES_FLAT[pc];
    return pc === 6 ? 'F#' : NAMES_FLAT[pc];                 // C major / A minor: B♭, E♭, A♭ but F♯
  }
  function keyName(key) {
    var f = keyFifths(key.tonic, key.minor);
    var n = f >= 0 ? NAMES_SHARP[key.tonic] : NAMES_FLAT[key.tonic];
    if (key.minor && n === 'A#') n = 'Bb';
    if (!key.minor && n === 'C#' && f > 6) n = 'Db';
    return n;
  }

  function correlate(v, profile, tonic) {
    var n = 12, mx = 0, my = 0, i;
    for (i = 0; i < n; i++) { mx += v[i]; my += profile[i]; }
    mx /= n; my /= n;
    var sxy = 0, sxx = 0, syy = 0;
    for (i = 0; i < n; i++) {
      var x = v[i] - mx, y = profile[mod(i - tonic, 12)] - my;
      sxy += x * y; sxx += x * x; syy += y * y;
    }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
  }

  /* notes: [{s, d, midi}] in beats from the start of bar 1 (a pickup is negative).
     opts: { M (beats per bar), bars, unit (beats per chord slot, default 1),
             strong: fn(posInBar) → 0 downbeat | 1 mid-bar | 2 weak, startKey: {tonic, minor} } */
  function analyze(notes, opts) {
    var M = opts.M, bars = opts.bars, unit = opts.unit || 1;
    var perBar = Math.max(1, Math.round(M / unit)), nSeg = bars * perBar;
    var strong = opts.strong || function (pos) { return pos < 1e-6 ? 0 : (M === 4 && Math.abs(pos - 2) < 1e-6) ? 1 : 2; };
    var seg = [], i, j, k;
    for (i = 0; i < nSeg; i++) seg.push({ w: new Array(12).fill(0), acc: new Array(12).fill(0), total: 0, low: null, lowAcc: 0 });

    // 1. what sounds in each slot
    notes.forEach(function (n) {
      if (!(n.d > 0) || typeof n.midi !== 'number') return;
      var a = Math.max(0, Math.floor(n.s / unit)), b = Math.min(nSeg - 1, Math.ceil((n.s + n.d) / unit) - 1);
      for (var x = a; x <= b; x++) {
        var s0 = x * unit, ov = Math.min(s0 + unit, n.s + n.d) - Math.max(s0, n.s);
        if (ov <= 1e-6) continue;
        var w = ov * (n.s >= s0 - 1e-6 ? 1 : 0.7);           // a note struck here counts more than one held over
        seg[x].w[mod(n.midi, 12)] += w;
        seg[x].total += w;
        if (n.alter) seg[x].acc[mod(n.midi, 12)] += w * (n.alter > 0 ? 1 : -1);      // how the arranger wrote it: C♯ or D♭
        if (ov >= unit * 0.25 && (seg[x].low === null || n.midi < seg[x].low)) { seg[x].low = n.midi; seg[x].lowAcc = n.alter || 0; }
      }
    });
    seg.forEach(function (sg) {
      sg.bass = sg.low === null ? null : mod(sg.low, 12);
      if (sg.bass !== null) { sg.w[sg.bass] += 0.5 * unit; sg.total += 0.5 * unit; }   // the fundamental bass
    });

    // 2. the key, bar by bar
    var barVec = [];
    for (i = 0; i < bars; i++) {
      var v = new Array(12).fill(0);
      for (j = 0; j < perBar; j++) seg[i * perBar + j].w.forEach(function (x, pc) { v[pc] += x; });
      barVec.push(v);
    }
    var homeFifths = opts.startKey ? keyFifths(opts.startKey.tonic, opts.startKey.minor) : null;
    var KEYS = [];
    for (k = 0; k < 24; k++) KEYS.push({ tonic: k % 12, minor: k >= 12 });
    var emitKey = barVec.map(function (v, bi) {
      var win = new Array(12).fill(0);
      [[-2, 0.3], [-1, 0.6], [0, 1], [1, 0.6], [2, 0.3]].forEach(function (o) {
        var b = barVec[bi + o[0]];
        if (b) b.forEach(function (x, pc) { win[pc] += x * o[1]; });
      });
      var empty = !win.some(function (x) { return x > 0; });
      var tot = win.reduce(function (a, x) { return a + x; }, 0) || 1;
      return KEYS.map(function (key) {
        if (empty) return 0;
        var e = correlate(win, key.minor ? KK_MINOR : KK_MAJOR, key.tonic);
        // Major or minor is decided by the third: A minor's C, not the G♯ its dominant chords bring.
        var own = win[mod(key.tonic + (key.minor ? 3 : 4), 12)] / tot, other = win[mod(key.tonic + (key.minor ? 4 : 3), 12)] / tot;
        if (own < 0.03 && other > 0.05) e -= 0.35;
        // The key signature is the composer's home key: keys it allows pull a little.
        if (homeFifths !== null && keyFifths(key.tonic, key.minor) === homeFifths) e += 0.08;
        return e;
      });
    });
    var related = function (a, b) {
      if (a.tonic === b.tonic) return true;                                       // parallel major/minor
      var fa = keyFifths(a.tonic, a.minor), fb = keyFifths(b.tonic, b.minor);
      return Math.abs(fa - fb) <= 1;                                              // relative, dominant, subdominant
    };
    var keyPath = viterbi(bars, 24, function (t, s) {
      var e = emitKey[t][s];
      if (t === 0 && opts.startKey && KEYS[s].tonic === opts.startKey.tonic && KEYS[s].minor === !!opts.startKey.minor) e += 0.25;
      return e;
    }, function (t, a, b) {
      if (a === b) return 0;
      return related(KEYS[a], KEYS[b]) ? -0.45 : -0.8;
    });
    // Fold key areas shorter than two bars into the one before.
    for (i = 1; i < bars; i++) {
      if (keyPath[i] === keyPath[i - 1]) continue;
      var run = 1;
      while (i + run < bars && keyPath[i + run] === keyPath[i]) run++;
      if (run < 2) for (j = i; j < i + run; j++) keyPath[j] = keyPath[i - 1];
    }
    var keyAt = function (x) { return KEYS[keyPath[Math.floor(x / perBar)]]; };

    // 3. chords, slot by slot
    var CH = [];
    for (var r = 0; r < 12; r++) QUALS.forEach(function (Q) { CH.push({ root: r, q: Q.q, pcs: Q.iv.map(function (iv) { return mod(r + iv, 12); }), iv: Q.iv }); });
    var diaCache = {};
    var inKey = function (key, ch) {
      var id = key.tonic + (key.minor ? 'm' : 'M') + ch.root + ch.q;
      if (diaCache[id] === undefined) {
        var rel = mod(ch.root - key.tonic, 12);
        diaCache[id] = DIATONIC[key.minor ? 'minor' : 'major'].some(function (d) { return d[0] === rel && d[1] === ch.q; });
      }
      return diaCache[id];
    };
    // Spell a chord root or bass the way the score does: a written C♯ stays C♯ even in a flat-leaning key.
    // With no written accidental to go on, a diminished chord on a chromatic root is a leading-tone chord (C♯°7 → Dm).
    var spellAt = function (x, pc, key, q, isBass) {
      var sg = seg[x];
      if (pc === sg.bass && sg.lowAcc) return sg.lowAcc > 0 ? NAMES_SHARP[pc] : NAMES_FLAT[pc];
      var a = 0;
      for (var d = -1; d <= 1; d++) { var o = seg[x + d]; if (o && Math.floor((x + d) / perBar) === Math.floor(x / perBar)) a += o.acc[pc] * (d ? 0.5 : 1); }
      if (a > 0) return NAMES_SHARP[pc];
      if (a < 0) return NAMES_FLAT[pc];
      if (!isBass && (q === 'dim' || q === 'dim7') && (pc === 1 || pc === 6 || pc === 8)) return NAMES_SHARP[pc];
      return spell(pc, key);
    };
    // A chord tone heard on the next or previous beat of the bar still counts (a seventh that arrives late).
    var heard = function (x, pc) {
      var sg = seg[x], r = sg.w[pc] / sg.total, bar = Math.floor(x / perBar);
      [-1, 1].forEach(function (d) {
        var o = seg[x + d];
        if (o && o.total && Math.floor((x + d) / perBar) === bar) r = Math.max(r, 0.7 * o.w[pc] / o.total);
      });
      return r;
    };
    var emitChord = function (x, c) {
      var sg = seg[x], ch = CH[c];
      if (!sg.total) return 0;
      var inS = 0;
      ch.pcs.forEach(function (pc) { inS += sg.w[pc]; });
      inS /= sg.total;
      var e = inS - 0.75 * (1 - inS);
      ch.pcs.forEach(function (pc, ti) {
        if ((ti === 3 ? heard(x, pc) : sg.w[pc] / sg.total) < 0.03) e -= ti === 1 ? 0.22 : ti === 2 ? 0.07 : ti === 3 ? 0.3 : 0.12;   // missing third hurts most; a seventh must be heard
      });
      if (ch.pcs.length > 3) e -= 0.06;
      if (sg.bass !== null) {
        if (sg.bass === ch.root) e += 0.25;
        else if (ch.pcs.indexOf(sg.bass) >= 0) e += 0.06;
        else e -= 0.12;
      }
      e += inKey(keyAt(x), ch) ? 0.14 : -0.06;
      return e;
    };
    var CHANGE = [-0.12, -0.3, -0.6];
    var chordPath = viterbi(nSeg, CH.length, emitChord, function (t, a, b) {
      if (a === b) return 0;
      var pos = (t % perBar) * unit;
      var c = CHANGE[strong(pos)];
      if (mod(CH[a].root - CH[b].root, 12) === 7) c += 0.05;                       // root falls a fifth (V → I)
      if (t % perBar === 0 && keyPath[t / perBar] !== keyPath[t / perBar - 1]) c += 0.05;
      return c;
    });

    // 4. back to bars: runs of one chord, an inversion where the bass sits on another chord tone
    var chordBars = [];
    for (var bi = 0; bi < bars; bi++) {
      var list = [];
      for (j = 0; j < perBar; j++) {
        var x = bi * perBar + j, ch = CH[chordPath[x]], sg = seg[x], key = keyAt(x);
        var hasNotes = sg.total > 0;
        var bassPc = hasNotes && sg.bass !== null && sg.bass !== ch.root && ch.pcs.indexOf(sg.bass) >= 0 ? sg.bass : null;
        var tok = spellAt(x, ch.root, key, ch.q) + ch.q;
        var prev = list[list.length - 1];
        // Same chord: keep going. A new bass on a strong beat starts a new slash chord (I – I/E).
        if (prev && prev.base === tok && (bassPc === prev.bassPc || bassPc === null || strong(j * unit) === 2)) { prev.len += unit; continue; }
        list.push({ base: tok, bassPc: bassPc, tok: tok + (bassPc !== null ? '/' + spellAt(x, bassPc, key, '', true) : ''), len: unit });
      }
      if (list.length === 1) chordBars.push(list[0].tok);
      else chordBars.push(list.map(function (c) { return c.tok + ':' + String(+c.len.toFixed(3)); }).join(' '));
    }
    var keys = [];
    for (bi = 0; bi < bars; bi++) {
      if (bi === 0 || keyPath[bi] !== keyPath[bi - 1]) {
        var K = KEYS[keyPath[bi]];
        keys.push({ bar: bi + 1, tonic: K.tonic, minor: K.minor, name: keyName(K) });
      }
    }
    return { chordBars: chordBars, keys: keys };
  }

  // Best path through a trellis: emit(t, s) and move(t, from, to) are scores (higher is better).
  function viterbi(T, S, emit, move) {
    if (!T) return [];
    var score = new Float64Array(S), back = [], s, t;
    for (s = 0; s < S; s++) score[s] = emit(0, s);
    for (t = 1; t < T; t++) {
      var next = new Float64Array(S), bp = new Int16Array(S);
      for (s = 0; s < S; s++) {
        var best = -Infinity, arg = 0;
        for (var p = 0; p < S; p++) {
          var v = score[p] + move(t, p, s);
          if (v > best) { best = v; arg = p; }
        }
        next[s] = best + emit(t, s); bp[s] = arg;
      }
      back.push(bp); score = next;
    }
    var end = 0;
    for (s = 1; s < S; s++) if (score[s] > score[end]) end = s;
    var path = new Array(T);
    path[T - 1] = end;
    for (t = T - 1; t > 0; t--) path[t - 1] = back[t - 1][path[t]];
    return path;
  }

  var exported = { analyze: analyze, spell: spell, keyName: keyName };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.FakeBookHarmony = exported;
})(typeof window !== 'undefined' ? window : globalThis);
