/* fake-book-tab.js — works out guitar tablature for a song that came without any.

   Each moment where notes start (an "onset") gets every way its notes can be fingered:
   one note per string, frets inside one hand span (open strings are free), higher notes on
   higher strings. A Viterbi pass then picks the fingering for the whole song that moves the
   hand least, optionally pulled toward a chosen position ("calibrate to a fingering").
   Notes that can't be fingered at all (too low, too high, a stretch no hand makes, more notes
   than strings) are left out and counted, so the page can say the song isn't playable on
   guitar as written.

   Fingering picks: the player can pin one onset to a fingering of their choice. A pin is fixed in
   the Viterbi pass, and it pulls its neighbours (just itself, its bar, or everything up to the next
   pin) toward its hand position, so the passage around it re-routes to fit. `keep` makes the rest of
   the tab sticky, so a pin only moves the notes it has to.

   Pitches are guitar-written MIDI numbers (guitar music sounds an octave lower than written:
   the open low E is written E3 = 52). Pure functions, exported for tests. */
(function (root) {
  'use strict';

  var STANDARD = [76, 71, 67, 62, 57, 52];   // written pitch of each open string, string 1 (high e) first
  var MAX_STATES = 48;
  var EXTRA_COST = 0.5;                      // per optional chord tone left out (chord melody)
  var ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII'];

  /* onsets: [{ start, ms: [midi…], extra: [midi…], free }]
       ms: notes that must sound; the first is the melody, kept above all others (unless `free`)
       extra: optional chord tones, left out silently when they don't fit
     opts: { tuning, maxFret (default 15), span (default 4), position: 'auto' | fret number,
             near: [fret | null per onset]   a position for that onset, in place of `position`
             fixed: [fingering | null per onset]   a chosen fingering, used when it is playable
             keep: [fingering | null per onset], stick (default .3)   cost of leaving that fingering }
     A fingering is [[string, fret]…], string 1 = highest. */
  function plan(onsets, opts) {
    opts = opts || {};
    var tuning = opts.tuning || STANDARD, maxFret = opts.maxFret || 15, span = opts.span || 4;
    var pos = posOf(opts.position);
    var near = opts.near || [], fixed = opts.fixed || [], keep = opts.keep || [], stick = opts.stick === undefined ? 0.3 : opts.stick;
    var dropped = 0, total = 0, impossible = 0, ignored = [];

    var layers = onsets.map(function (o, t) {
      var c = candidates(o, tuning, maxFret, span);
      total += c.required;
      var states = c.states;
      if (keep[t] && keep[t].length) {
        // The tab being kept (an imported one) is the authority, even where it stretches further than we would.
        var k = key(keep[t]);
        if (!states.some(function (st) { return key(st.f) === k; })) states.push(shape(keep[t], 0));
      }
      if (fixed[t]) {
        var fk = key(fixed[t]), hit = states.filter(function (st) { return key(st.f) === fk; })[0];
        if (hit) states = [hit]; else ignored.push(t);
      }
      var placed = states.length ? Math.max.apply(null, states.map(function (st) { return st.req; })) : 0;
      if (placed < c.required) { dropped += c.required - placed; impossible++; }
      states = states.filter(function (st) { return st.req === placed; });
      if (!states.length) states = [{ f: [], lo: null, hi: null, cost: 0, req: 0 }];
      var p = near[t] === undefined || near[t] === null ? pos : near[t];
      var kk = keep[t] ? key(keep[t]) : null;
      states.forEach(function (st) { st.total = st.cost + preferCost(st, p) + (kk !== null && key(st.f) !== kk ? stick : 0); });
      states.sort(function (a, b) { return a.total - b.total; });
      return states.slice(0, MAX_STATES);
    });

    // Viterbi over onsets: hand movement between fretted shapes, open strings let the hand travel free.
    var score = [], back = [];
    layers.forEach(function (states, t) {
      score[t] = []; back[t] = [];
      states.forEach(function (st, s) {
        if (t === 0) { score[t][s] = st.total; back[t][s] = -1; return; }
        var best = Infinity, arg = 0;
        layers[t - 1].forEach(function (pr, p) {
          var v = score[t - 1][p] + move(pr, st);
          if (v < best) { best = v; arg = p; }
        });
        score[t][s] = best + st.total; back[t][s] = arg;
      });
    });
    var out = new Array(onsets.length);
    if (onsets.length) {
      var T = onsets.length - 1, end = 0;
      score[T].forEach(function (v, s) { if (v < score[T][end]) end = s; });
      for (var t = T, s = end; t >= 0; s = back[t][s], t--) out[t] = { start: onsets[t].start, f: layers[t][s].f.map(function (x) { return [x[0], x[1]]; }) };
    }
    return { events: out, dropped: dropped, total: total, impossibleOnsets: impossible, ignored: ignored };
  }

  function posOf(p) { return p === undefined || p === null || p === 'auto' || p === 'reroute' ? null : Number(p); }

  function uniq(ms) {
    var seen = {}, out = [];
    ms.forEach(function (m) { if (!seen[m]) { seen[m] = true; out.push(m); } });
    return out;
  }

  /* Every fingering worth considering for one onset: all the required notes with as many optional
     tones as fit (each one left out costs a little), else the fallbacks for a chord no hand can grip
     (melody and bass, then the melody alone, then the bass alone). `req` = required notes placed. */
  function candidates(o, tuning, maxFret, span) {
    var ms = uniq(o.ms || []), ex = uniq(o.extra || []).filter(function (m) { return ms.indexOf(m) < 0; });
    var top = !o.free, states = [], seen = {};
    function add(notes, req, missing) {
      fingerings(notes, tuning, maxFret, span, top).forEach(function (st) {
        var k = key(st.f);
        if (seen[k]) return;
        seen[k] = true;
        st.req = req; st.cost += missing * EXTRA_COST;
        states.push(st);
      });
    }
    if (ms.length) {
      // optional tones: every subset, richest first (two or three tones at most, so this stays small)
      var subsets = [[]];
      ex.forEach(function (m) { subsets = subsets.concat(subsets.map(function (s) { return s.concat([m]); })); });
      subsets.sort(function (a, b) { return b.length - a.length; });
      subsets.forEach(function (sub) { add(ms.concat(sub), ms.length, ex.length - sub.length); });
      if (!states.length && ms.length > 2) add([ms[0], Math.min.apply(null, ms)], 2, 0);
      if (!states.length && ms.length > 1) add([ms[0]], 1, 0);
      if (!states.length && ms.length > 1) add([Math.min.apply(null, ms)], 1, 0);
    }
    return { states: states, required: ms.length };
  }

  // Every way to finger these notes (first = melody, on the highest string used when `top`).
  function fingerings(ms, tuning, maxFret, span, top) {
    var mel = ms[0], rest = ms.slice(1).sort(function (a, b) { return b - a; });
    var notes = [mel].concat(rest), out = [];
    (function place(i, used, f) {
      if (i === notes.length) {
        var st = shape(f, 0);
        if (st.lo !== null && st.hi - st.lo > span - 1 + (st.lo >= 7 ? 1 : 0)) return;   // stretches widen up the neck
        f.forEach(function (x) { st.cost += x[1] * 0.04 + (x[1] === 0 ? -0.05 : 0); });
        out.push(st);
        return;
      }
      for (var s = 1; s <= tuning.length; s++) {
        if (used[s]) continue;
        var fr = notes[i] - tuning[s - 1];
        if (fr < 0 || fr > maxFret) continue;
        if (top !== false && i > 0 && s <= f[0][0]) continue;                           // melody stays on top
        used[s] = true; f.push([s, fr]);
        place(i + 1, used, f);
        used[s] = false; f.pop();
      }
    })(0, {}, []);
    return out;
  }

  function shape(f, cost) {
    var fretted = f.filter(function (x) { return x[1] > 0; }).map(function (x) { return x[1]; });
    return {
      f: f.map(function (x) { return [x[0], x[1]]; }),
      lo: fretted.length ? Math.min.apply(null, fretted) : null,
      hi: fretted.length ? Math.max.apply(null, fretted) : null,
      cost: cost, req: f.length
    };
  }

  // A fingering's identity: its (string, fret) pairs in string order.
  function key(f) { return f.map(function (x) { return x[0] + ':' + x[1]; }).sort().join(' '); }
  // Where the hand sits for a fingering: its lowest fretted fret (0 = open strings only).
  function hand(f) {
    var fr = f.filter(function (x) { return x[1] > 0; }).map(function (x) { return x[1]; });
    return fr.length ? Math.min.apply(null, fr) : 0;
  }
  function pitches(f, tuning) {
    tuning = tuning || STANDARD;
    return f.map(function (x) { return tuning[x[0] - 1] + x[1]; }).sort(function (a, b) { return a - b; });
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

  /* The fingerings a player can choose from for one onset, lowest on the neck first.
     Each: { f, hand, lo, hi, notes, full } (full = as many notes as the richest choice). */
  function choices(onset, opts) {
    opts = opts || {};
    var tuning = opts.tuning || STANDARD;
    var c = candidates(onset, tuning, opts.maxFret || 15, opts.span || 4);
    var best = c.states.reduce(function (m, st) { return Math.max(m, st.req); }, 0);
    var list = c.states.filter(function (st) { return st.req === best; }).map(function (st) {
      return { f: st.f, hand: hand(st.f), lo: st.lo, hi: st.hi, notes: st.f.length };
    });
    if (opts.include && opts.include.length && !list.some(function (x) { return key(x.f) === key(opts.include); })) {
      var inc = shape(opts.include, 0);
      list.push({ f: inc.f, hand: hand(inc.f), lo: inc.lo, hi: inc.hi, notes: inc.f.length });
    }
    var most = list.reduce(function (m, x) { return Math.max(m, x.notes); }, 0);
    list.forEach(function (x) { x.full = x.notes === most; });
    list.sort(function (a, b) {
      return a.hand - b.hand || b.notes - a.notes || (a.hi || 0) - (b.hi || 0) || key(a.f).localeCompare(key(b.f));
    });
    return list;
  }

  /* Pins → per-onset constraints for plan().
     pins: [{ start, f, ms, scope: 'note' | 'bar' | 'on' }] (ms = the pinned fingering's pitches)
     opts: { tuning, maxFret, span, spanOf(start) → [from, to) of that onset's bar, keep (as for plan) }
     A pin finds its onset by time. If the notes there are the same shape moved (a new key, another
     octave), the fingering moves with them: the same strings shifted, else the nearest hand position.
     Pins whose onset now holds other notes are stale: reported, not applied, not forgotten. */
  function resolvePins(onsets, pins, opts) {
    opts = opts || {};
    var tuning = opts.tuning || STANDARD, maxFret = opts.maxFret || 15;
    var fixed = new Array(onsets.length), near = new Array(onsets.length), used = [], stale = [];
    var hits = [];
    (pins || []).slice().sort(function (a, b) { return a.start - b.start; }).forEach(function (pin) {
      var t = -1;
      for (var i = 0; i < onsets.length; i++) if (Math.abs(onsets[i].start - pin.start) < 1e-3) { t = i; break; }
      if (t < 0) { stale.push(pin); return; }
      var want = (pin.ms && pin.ms.length ? pin.ms : pitches(pin.f, tuning)).slice().sort(function (a, b) { return a - b; });
      var best = null;
      choices(onsets[t], { tuning: tuning, maxFret: maxFret, span: opts.span, include: opts.keep && opts.keep[t] }).forEach(function (c) {
        var got = pitches(c.f, tuning);
        if (got.length !== want.length) return;
        var d = got[0] - want[0];
        if (got.some(function (m, j) { return m - want[j] !== d; })) return;            // not the same shape of notes
        var moved = pin.f.every(function (x) { return c.f.some(function (y) { return y[0] === x[0] && y[1] === x[1] + d; }); });
        var sameStrings = key(c.f.map(function (y) { return [y[0], 0]; })) === key(pin.f.map(function (x) { return [x[0], 0]; }));
        var aim = hand(pin.f) + d;
        while (aim > maxFret - 3) aim -= 12;
        while (aim < 0) aim += 12;
        var cost = (moved ? 0 : sameStrings ? 10 : 20) + Math.abs(c.hand - aim);
        if (!best || cost < best.cost) best = { cost: cost, f: c.f };
      });
      if (!best) { stale.push(pin); return; }
      fixed[t] = best.f;
      used.push({ pin: pin, index: t, f: best.f, moved: best.cost > 0 });
      hits.push({ t: t, pin: pin, hand: hand(best.f) });
    });
    // Each pin pulls its scope toward its hand position; a later pin takes over from an earlier one.
    scopes(onsets, hits, opts.spanOf).forEach(function (h) { for (var i = h.from; i <= h.to; i++) near[i] = h.hand; });
    return { fixed: fixed, near: near, used: used, stale: stale };
  }

  // The onset each pin stands on: [{ t, pin }] in time order (pins with no onset at their time are left out).
  function pinOnsets(onsets, pins) {
    var out = [];
    (pins || []).slice().sort(function (a, b) { return a.start - b.start; }).forEach(function (pin) {
      for (var i = 0; i < onsets.length; i++) if (Math.abs(onsets[i].start - pin.start) < 1e-3) { out.push({ t: i, pin: pin }); return; }
    });
    return out;
  }
  /* How far each pin reaches: 'note' = its own onset, 'bar' = its bar (spanOf(start) → [from, to)),
     'on' = up to the next pin. Adds { from, to } (onset indexes) to each hit. */
  function scopes(onsets, hits, spanOf) {
    hits.forEach(function (h, k) {
      var from = h.t, to = h.t;
      if (h.pin.scope === 'bar' && spanOf) {
        var sp = spanOf(onsets[h.t].start);
        from = 0; to = onsets.length - 1;
        while (from < h.t && onsets[from].start < sp[0] - 1e-6) from++;
        while (to > h.t && onsets[to].start >= sp[1] - 1e-6) to--;
      } else if (h.pin.scope === 'on') {
        to = k + 1 < hits.length ? hits[k + 1].t - 1 : onsets.length - 1;
      }
      h.from = from; h.to = to;
    });
    return hits;
  }

  /* Octaves: the whole tab moves by `octave`, and each pin's scope by its own `oct` on top. An
     arranged onset (onset.arranged: a melody over a bass, from the lead sheet) moves its melody and
     chord tones and keeps the bass under them; any other onset (a guitar part, an imported tab) moves
     whole. An onset that would leave the neck (RANGE) moves as far as it fits.
     opts: { octave, pins, spanOf, range }. Returns { onsets, shift: [octaves moved], want: [octaves asked
     by pins, on top of `octave`], short: onsets that moved less than asked }. */
  var RANGE = [52, 94];                      // written: open low E up to the 18th fret of the high e
  function shiftOctaves(onsets, opts) {
    opts = opts || {};
    var g = opts.octave || 0, want = onsets.map(function () { return 0; }), shift = [], short = 0;
    scopes(onsets, pinOnsets(onsets, opts.pins), opts.spanOf).forEach(function (h) {
      for (var i = h.from; i <= h.to; i++) want[i] = h.pin.oct || 0;
    });
    var out = onsets.map(function (o, t) {
      var r = moveOctave(o, g + want[t], opts.range);
      shift[t] = r.k;
      if (r.k !== g + want[t]) short++;
      return r.onset;
    });
    return { onsets: out, shift: shift, want: want, short: short };
  }
  // One onset moved k octaves, or as near to k as fits on the neck: { onset, k }.
  function moveOctave(o, k, range) {
    range = range || RANGE;
    for (var step = k; ; step -= step > 0 ? 1 : -1) {
      var moved = step ? octaveCopy(o, step, range) : Object.assign({}, o);
      if (moved) return { onset: moved, k: step };
    }
  }
  function octaveCopy(o, k, range) {
    var d = 12 * k, fits = function (m) { return m >= range[0] && m <= range[1]; };
    var ms = uniq(o.ms || []), ex = o.extra || [];
    if (o.arranged) {
      var mel = !o.free && ms.length ? ms[0] + d : null;
      if (mel !== null && !fits(mel)) return null;
      var bass = mel !== null ? ms.slice(1) : ms.slice();
      // the bass stays put, stepping down an octave if the melody comes down onto it
      if (mel !== null) bass = bass.map(function (b) { return b < mel ? b : b - 12; }).filter(function (b) { return b < mel && b >= range[0]; });
      var top = bass.length ? Math.max.apply(null, bass) : -Infinity;
      var extra = ex.map(function (x) { return x + d; }).filter(function (x) { return fits(x) && x > top && (mel === null || x < mel); });
      if (mel === null && ex.length && !extra.length) return null;
      return Object.assign({}, o, { ms: (mel !== null ? [mel] : []).concat(bass), extra: extra });
    }
    var all = ms.map(function (m) { return m + d; });
    if (!all.every(fits)) return null;
    return Object.assign({}, o, { ms: all, extra: ex.map(function (x) { return x + d; }).filter(fits) });
  }

  /* Hand positions for a tune in a key: for each fret 0–12, how much of the tune the hand plays
     there without moving, and where the key's tonic sits under it (low E string first, then A).
     onsets as for plan(); tonic = pitch class of the key. Returns [{ fret, fit, root }] where root
     = { string: 6 | 5, fret } or null. */
  function keyPositions(onsets, tonic, opts) {
    opts = opts || {};
    var tuning = opts.tuning || STANDARD, top = opts.maxPosition === undefined ? 12 : opts.maxPosition;
    var notes = [];
    onsets.forEach(function (o) { uniq(o.ms || []).forEach(function (m) { notes.push(m); }); });
    var out = [];
    for (var p = 0; p <= top; p++) {
      var fit = 0;
      notes.forEach(function (m) {
        var w = 0;
        tuning.forEach(function (open) {
          var fr = m - open;
          if (fr === 0) w = Math.max(w, p <= 3 ? 1 : 0);
          else if (fr >= Math.max(1, p) && fr <= p + 3) w = 1;
          else if (fr >= 1 && (fr === p - 1 || fr === p + 4)) w = Math.max(w, 0.6);    // a one-fret stretch
        });
        fit += w;
      });
      var root = null;
      if (tonic !== undefined && tonic !== null) {
        [6, 5].some(function (s) {
          var open = tuning[s - 1];
          if (open === undefined) return false;
          for (var fr = ((tonic - open) % 12 + 12) % 12; fr <= p + 4; fr += 12) {
            if ((fr === 0 && p <= 3) || (fr >= Math.max(1, p) && fr <= p + 3)) { root = { string: s, fret: fr }; return true; }
          }
          return false;
        });
      }
      out.push({ fret: p, fit: notes.length ? fit / notes.length : 0, root: root });
    }
    return out;
  }

  var exported = {
    plan: plan, choices: choices, resolvePins: resolvePins, keyPositions: keyPositions, shiftOctaves: shiftOctaves, moveOctave: moveOctave, RANGE: RANGE,
    key: key, hand: hand, pitches: pitches, STANDARD: STANDARD, ROMAN: ROMAN
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.FakeBookTab = exported;
})(typeof window !== 'undefined' ? window : globalThis);
