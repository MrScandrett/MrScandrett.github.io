/* fake-book-tab.js — works out guitar tablature for a song that came without any.

   Each moment where notes start (an "onset") gets every way its notes can be fingered:
   one note per string, frets inside one hand span (open strings are free), higher notes on
   higher strings. A Viterbi pass then picks the fingering for the whole song that moves the
   hand least, optionally pulled toward a chosen position ("calibrate to a fingering").
   Notes that can't be fingered at all (too low, too high, a stretch no hand makes, more notes
   than strings) are left out and counted, so the page can say the song isn't playable on
   guitar as written.

   Pitches are guitar-written MIDI numbers (guitar music sounds an octave lower than written:
   the open low E is written E3 = 52). Pure functions, exported for tests. */
(function (root) {
  'use strict';

  var STANDARD = [76, 71, 67, 62, 57, 52];   // written pitch of each open string, string 1 (high e) first
  var MAX_STATES = 48;

  /* onsets: [{ start, ms: [midi…] }]  (the first listed note is the melody: kept above all others)
     opts: { tuning, maxFret (default 15), span (default 4), position: 'auto' | fret number } */
  function plan(onsets, opts) {
    opts = opts || {};
    var tuning = opts.tuning || STANDARD, maxFret = opts.maxFret || 15, span = opts.span || 4;
    var pos = opts.position === undefined || opts.position === 'auto' ? null : Number(opts.position);
    var dropped = 0, total = 0, impossible = 0;

    var layers = onsets.map(function (o) {
      var ms = uniq(o.ms);
      total += ms.length;
      var states = fingerings(ms, tuning, maxFret, span);
      // Too much for one hand: keep the melody and the bass, then the melody alone.
      if (!states.length && ms.length > 2) states = fingerings([ms[0], Math.min.apply(null, ms)], tuning, maxFret, span);
      if (!states.length && ms.length > 1) states = fingerings([ms[0]], tuning, maxFret, span);
      if (!states.length && ms.length > 1) states = fingerings([Math.min.apply(null, ms)], tuning, maxFret, span);
      var placed = states.length ? states[0].f.length : 0;
      if (placed < ms.length) { dropped += ms.length - placed; impossible++; }
      if (!states.length) states = [{ f: [], lo: null, hi: null, cost: 0 }];
      states.forEach(function (st) { st.cost += preferCost(st, pos); });
      states.sort(function (a, b) { return a.cost - b.cost; });
      return states.slice(0, MAX_STATES);
    });

    // Viterbi over onsets: hand movement between fretted shapes, open strings let the hand travel free.
    var score = [], back = [];
    layers.forEach(function (states, t) {
      score[t] = []; back[t] = [];
      states.forEach(function (st, s) {
        if (t === 0) { score[t][s] = st.cost; back[t][s] = -1; return; }
        var best = Infinity, arg = 0;
        layers[t - 1].forEach(function (pr, p) {
          var v = score[t - 1][p] + move(pr, st);
          if (v < best) { best = v; arg = p; }
        });
        score[t][s] = best + st.cost; back[t][s] = arg;
      });
    });
    var out = new Array(onsets.length);
    if (onsets.length) {
      var T = onsets.length - 1, end = 0;
      score[T].forEach(function (v, s) { if (v < score[T][end]) end = s; });
      for (var t = T, s = end; t >= 0; s = back[t][s], t--) out[t] = { start: onsets[t].start, f: layers[t][s].f.map(function (x) { return [x[0], x[1]]; }) };
    }
    return { events: out, dropped: dropped, total: total, impossibleOnsets: impossible };
  }

  function uniq(ms) {
    var seen = {}, out = [];
    ms.forEach(function (m) { if (!seen[m]) { seen[m] = true; out.push(m); } });
    return out;
  }

  // Every way to finger these notes (first = melody, must be on the highest string used).
  function fingerings(ms, tuning, maxFret, span) {
    var mel = ms[0], rest = ms.slice(1).sort(function (a, b) { return b - a; });
    var notes = [mel].concat(rest), out = [];
    (function place(i, used, f) {
      if (i === notes.length) {
        var fretted = f.filter(function (x) { return x[1] > 0; }).map(function (x) { return x[1]; });
        var lo = fretted.length ? Math.min.apply(null, fretted) : null, hi = fretted.length ? Math.max.apply(null, fretted) : null;
        if (fretted.length && hi - lo > span - 1 + (lo >= 7 ? 1 : 0)) return;           // stretches widen up the neck
        var cost = 0;
        f.forEach(function (x) { cost += x[1] * 0.04 + (x[1] === 0 ? -0.05 : 0); });
        out.push({ f: f.slice(), lo: lo, hi: hi, cost: cost });
        return;
      }
      for (var s = 1; s <= tuning.length; s++) {
        if (used[s]) continue;
        var fr = notes[i] - tuning[s - 1];
        if (fr < 0 || fr > maxFret) continue;
        if (i > 0 && s <= f[0][0]) continue;                                           // melody stays on top
        used[s] = true; f.push([s, fr]);
        place(i + 1, used, f);
        used[s] = false; f.pop();
      }
    })(0, {}, []);
    return out;
  }

  function preferCost(st, pos) {
    if (pos === null || !st.f.length) return 0;
    var c = 0;
    st.f.forEach(function (x) {
      if (x[1] === 0) { if (pos >= 4) c += 1.2; return; }                              // up the neck, avoid open strings
      if (x[1] < Math.max(1, pos - 1) || x[1] > pos + 4) c += 1.5;
    });
    return c;
  }

  function move(a, b) {
    if (a.lo === null || b.lo === null) return 0.02;
    var lo = Math.min(a.lo, b.lo), hi = Math.max(a.hi, b.hi);
    if (hi - lo <= 3 + (lo >= 7 ? 1 : 0)) return 0;                                   // both fit under one hand: no shift
    return 0.35 + 0.18 * Math.abs(a.lo - b.lo);
  }

  var exported = { plan: plan, STANDARD: STANDARD };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.FakeBookTab = exported;
})(typeof window !== 'undefined' ? window : globalThis);
