/* fake-book-melody.js — "Play the melody" viewer for the fake book.
   The chord strip shows how to comp; this panel shows how to play the tune itself:
   on piano, which key and which finger (smooth fingering or five-finger hand
   positions, either hand); on guitar, which string, fret and finger in a chosen
   position (or an automatic route with the fewest shifts).

   The planners are pure functions, exported for tests. fake-book.js feeds the
   viewer the concert-pitch melody and the index of the note that is sounding. */
(function (root) {
  'use strict';

  var NAT = [0, 2, 4, 5, 7, 9, 11], LETTERS = 'CDEFGAB';
  var BLACK = [1, 3, 6, 8, 10];
  function mod(n, m) { return ((n % m) + m) % m; }
  function isBlack(m) { return BLACK.indexOf(mod(m, 12)) >= 0; }
  function natMidi(dia) { return 12 * (Math.floor(dia / 7) + 1) + NAT[mod(dia, 7)]; }

  /* ================================================================ guitar */
  // Written pitch, low E to high e. Guitar music is written an octave above how it
  // sounds, so a lead sheet's D5 is the B string, fret 3, exactly as a guitarist reads it.
  var OPEN = [52, 57, 62, 67, 71, 76];
  var STRING_NAMES = ['low E', 'A', 'D', 'G', 'B', 'high e'];
  var STRING_TAGS = ['E', 'A', 'D', 'G', 'B', 'e'];
  var MAX_FRET = 15, MAX_POS = 12;
  var ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  // Frets a hand covers in position p (index finger on fret p). Open position
  // covers the open strings and frets 1-4; higher positions allow a one-fret
  // stretch either side (index back, pinky forward).
  function positionFrets(p) { return p === 0 ? [0, 4] : [p, p + 3]; }
  function positionLabel(p) {
    if (p === 0) return 'Open position · frets 0–4';
    return 'Position ' + ROMAN[p] + ' · frets ' + p + '–' + (p + 3);
  }
  // Best place for one note in position p, or null if the hand can't reach it.
  function inPosition(midi, p) {
    var best = null;
    for (var s = 0; s < 6; s++) {
      var f = midi - OPEN[s];
      if (f < 0 || f > MAX_FRET) continue;
      var finger, stretch = false;
      if (p === 0) {
        if (f > 4) continue;
        finger = f;
      } else if (f === 0 && p <= 2) {
        finger = 0;                                   // open string, still in reach low on the neck
      } else {
        if (f < p - 1 || f > p + 4) continue;
        if (f < p) { finger = 1; stretch = true; }
        else if (f > p + 3) { finger = 4; stretch = true; }
        else finger = f - p + 1;
      }
      var cost = stretch ? 1 : 0;
      if (!best || cost < best.cost || (cost === best.cost && f < best.f)) {
        best = { s: s, f: f, finger: finger, stretch: stretch, pos: p, cost: cost };
      }
    }
    return best;
  }
  // Positions that hold the whole melody without moving the hand (a few stretches allowed).
  function guitarPositions(midis) {
    var out = [], maxStretch = Math.max(2, Math.round(midis.length * 0.05));
    for (var p = 0; p <= MAX_POS; p++) {
      var stretches = 0, ok = true;
      for (var i = 0; i < midis.length && ok; i++) {
        var spot = inPosition(midis[i], p);
        if (!spot) ok = false; else if (spot.stretch) stretches++;
      }
      if (ok && stretches <= maxStretch) out.push({ pos: p, stretches: stretches, label: positionLabel(p) });
    }
    return out;
  }
  // A route through the melody. p = a position number keeps the hand there;
  // p = 'auto' picks positions note by note (Viterbi) to keep shifts rare and small.
  function guitarRoute(midis, p) {
    if (!midis.length) return [];
    if (p !== 'auto') {
      var fixed = midis.map(function (m) { return inPosition(m, p); });
      if (fixed.every(Boolean)) return mark(fixed);
    }
    var N = MAX_POS + 1, INF = 1e9;
    var cost = [], back = [];
    midis.forEach(function (m, i) {
      cost[i] = []; back[i] = [];
      for (var q = 0; q < N; q++) {
        var spot = inPosition(m, q);
        var here = spot ? spot.cost * 0.8 + q * 0.03 + (spot.finger === 0 && q > 0 ? 0.2 : 0) : INF;
        if (i === 0) { cost[i][q] = here; back[i][q] = -1; continue; }
        var bestC = INF, bestR = -1;
        for (var r = 0; r < N; r++) {
          if (cost[i - 1][r] >= INF) continue;
          var c = cost[i - 1][r] + (r === q ? 0 : 2.5 + 0.3 * Math.abs(r - q));
          if (c < bestC) { bestC = c; bestR = r; }
        }
        cost[i][q] = here >= INF ? INF : bestC + here; back[i][q] = bestR;
      }
    });
    var last = midis.length - 1, q0 = 0;
    for (var q = 1; q < N; q++) if (cost[last][q] < cost[last][q0]) q0 = q;
    if (cost[last][q0] >= INF) {
      // Out of range somewhere: fall back to the lowest spot for each note.
      return mark(midis.map(function (m) {
        for (var pp = 0; pp <= MAX_POS; pp++) { var s0 = inPosition(m, pp); if (s0) return s0; }
        return null;
      }));
    }
    var path = [];
    for (var j = last, k = q0; j >= 0; j--) { path[j] = k; k = back[j][k]; }
    return mark(midis.map(function (m, i) { return inPosition(m, path[i]); }));
  }
  function mark(route) {
    route.forEach(function (n, i) { if (n) n.shift = i > 0 && route[i - 1] && route[i - 1].pos !== n.pos; });
    return route;
  }

  /* ================================================================ violin */
  // Sounds as written. Fretless: a finger has a *placement* (low / normal / high), not a fret.
  var V_OPEN = [55, 62, 69, 76];                           // G D A E
  var V_NAMES = ['G', 'D', 'A', 'E'];
  var V_MAX_POS = 7, V_MAX_OFF = 19;
  // Semitones above the open string where the 1st finger sits (its "normal" spot) in position p.
  var V_BASE = [0, 2, 4, 5, 7, 9, 11, 12];
  var V_ORD = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh'];
  // d = offset - base: which finger, and whether it's placed low or high.
  var V_D = { '-1': [1, 'low'], 0: [1, ''], 1: [2, 'low'], 2: [2, ''], 3: [3, ''], 4: [3, 'high'], 5: [4, ''] };
  function violinPositionLabel(p) { return V_ORD[p] + ' position'; }
  function violinInPosition(midi, p) {
    var best = null;
    for (var s = 0; s < 4; s++) {
      var off = midi - V_OPEN[s];
      if (off < 0 || off > V_MAX_OFF) continue;
      var finger, place = '', cost = 0;
      if (off === 0) { finger = 0; cost = p === 1 ? -0.1 : 0.4; }          // open string: free in 1st, a tone change higher up
      else {
        var hit = V_D[off - V_BASE[p]];
        if (!hit) continue;
        finger = hit[0]; place = hit[1]; cost = (place ? 0.15 : 0) + (finger === 4 ? 0.05 : 0);
      }
      cost += s * 0.01;                                                 // tie-break: the lower string
      if (!best || cost < best.cost) best = { s: s, off: off, finger: finger, place: place, pos: p, cost: cost };
    }
    return best;
  }
  function violinPositions(midis) {
    var out = [];
    for (var p = 1; p <= V_MAX_POS; p++) {
      if (midis.every(function (m) { return violinInPosition(m, p); })) out.push({ pos: p, label: violinPositionLabel(p) });
    }
    return out;
  }
  function violinRoute(midis, p) {
    if (!midis.length) return [];
    if (p !== 'auto') {
      var fixed = midis.map(function (m) { return violinInPosition(m, p); });
      if (fixed.every(Boolean)) return mark(fixed);
    }
    var N = V_MAX_POS + 1, INF = 1e9, cost = [], back = [];
    midis.forEach(function (m, i) {
      cost[i] = []; back[i] = [];
      for (var q = 1; q < N; q++) {
        var spot = violinInPosition(m, q);
        var here = spot ? spot.cost + q * 0.03 : INF;
        if (i === 0) { cost[i][q] = here; back[i][q] = -1; continue; }
        var bestC = INF, bestR = -1;
        for (var r = 1; r < N; r++) {
          if (cost[i - 1][r] >= INF) continue;
          var c = cost[i - 1][r] + (r === q ? 0 : 2.5 + 0.3 * Math.abs(r - q));
          if (c < bestC) { bestC = c; bestR = r; }
        }
        cost[i][q] = here >= INF ? INF : bestC + here; back[i][q] = bestR;
      }
    });
    var last = midis.length - 1, q0 = 1;
    for (var q = 2; q < N; q++) if (cost[last][q] < cost[last][q0]) q0 = q;
    if (cost[last][q0] >= INF) {
      return mark(midis.map(function (m) {
        for (var pp = 1; pp <= V_MAX_POS; pp++) { var s0 = violinInPosition(m, pp); if (s0) return s0; }
        return null;
      }));
    }
    var path = [];
    for (var j = last, k = q0; j >= 0; j--) { path[j] = k; k = back[j][k]; }
    return mark(midis.map(function (m, i) { return violinInPosition(m, path[i]); }));
  }

  /* ================================================================ piano */
  // Where each finger rests above the thumb, in semitones (index = finger number).
  var OFF = [0, 0, 2, 4, 5, 7];
  function fingerStep(a, b, fa, fb, hand) {
    var d = (b - a) * (hand === 'left' ? -1 : 1);       // mirror the left hand
    if (d === 0) return fa === fb ? 0 : 1.2;
    if (fa === fb) return 6;
    if (d > 0 && fb < fa) {                              // thumb passes under
      if (fb !== 1) return 20;
      return 2.2 + Math.max(0, d - 4) * 1.5 + (fa === 5 ? 3 : 0) + (fa === 2 ? 0.6 : 0);
    }
    if (d < 0 && fb > fa) {                              // finger crosses over the thumb
      if (fa !== 1) return 20;
      return 2.2 + Math.max(0, -d - 4) * 1.5 + (fb === 5 ? 3 : 0) + (fb === 2 ? 0.6 : 0);
    }
    var gap = Math.abs(Math.abs(d) - Math.abs(OFF[fb] - OFF[fa]));
    var c = gap <= 1 ? gap * 0.3 : 0.3 + (gap - 1);
    var span = Math.abs(fb - fa) * 2.5 + (fa === 1 || fb === 1 ? 2.5 : 1);
    if (Math.abs(d) > span) c += 8 + (Math.abs(d) - span) * 2;
    return c;
  }
  function fingerHere(m, f) { return isBlack(m) ? (f === 1 ? 1.6 : f === 5 ? 0.6 : 0) : 0; }

  // Smooth fingering: the cheapest finger sequence (Viterbi) with thumb-unders allowed.
  function pianoSmooth(midis, hand) {
    if (!midis.length) return [];
    var cost = [], back = [];
    midis.forEach(function (m, i) {
      cost[i] = []; back[i] = [];
      for (var f = 1; f <= 5; f++) {
        if (i === 0) {
          // Start where the tune sits comfortably: the thumb near its lowest notes (right hand).
          cost[i][f] = fingerHere(m, f) + startBias(midis, f, hand); back[i][f] = 0; continue;
        }
        var bestC = Infinity, bestG = 1;
        for (var g = 1; g <= 5; g++) {
          var c = cost[i - 1][g] + fingerStep(midis[i - 1], m, g, f, hand);
          if (c < bestC) { bestC = c; bestG = g; }
        }
        cost[i][f] = bestC + fingerHere(m, f); back[i][f] = bestG;
      }
    });
    var last = midis.length - 1, f0 = 1;
    for (var f = 2; f <= 5; f++) if (cost[last][f] < cost[last][f0]) f0 = f;
    var fingers = [];
    for (var j = last, k = f0; j >= 0; j--) { fingers[j] = k; k = back[j][k]; }
    return midis.map(function (m, i) {
      var f = fingers[i];
      var thumb = hand === 'left' ? m + OFF[f] : m - OFF[f];
      var prev = i ? midis[i - 1] : m;
      var crossing = i > 0 && ((m - prev) * (hand === 'left' ? -1 : 1) > 0 ? f < fingers[i - 1] : (m !== prev && f > fingers[i - 1]));
      return { finger: f, thumb: thumb, lo: hand === 'left' ? thumb - 7 : thumb, hi: hand === 'left' ? thumb : thumb + 7,
        cross: crossing, shift: false };
    }).map(function (n, i, all) {
      n.shift = i > 0 && !n.cross && Math.abs(n.thumb - all[i - 1].thumb) > 2;
      return n;
    });
  }
  function startBias(midis, f, hand) {
    var head = midis.slice(0, 6), lo = Math.min.apply(null, head), hi = Math.max.apply(null, head);
    var m = midis[0];
    var want = hand === 'left' ? Math.round((hi - m) / Math.max(1, hi - lo) * 4) + 1 : Math.round((m - lo) / Math.max(1, hi - lo) * 4) + 1;
    return Math.abs(f - Math.max(1, Math.min(5, want))) * 0.5;
  }

  // Five-finger positions: one finger per letter name, the hand moving only between
  // phrases. Greedy runs are as long as possible (fewest positions), and each new
  // position is chosen as close to the last one as the notes allow.
  function pianoFive(notes, hand) {
    var out = [], i = 0, prevAnchor = null;
    while (i < notes.length) {
      var lo = notes[i].dia, hi = notes[i].dia, j = i + 1;
      while (j < notes.length) {
        var nlo = Math.min(lo, notes[j].dia), nhi = Math.max(hi, notes[j].dia);
        if (nhi - nlo > 4) break;
        lo = nlo; hi = nhi; j++;
      }
      var anchor = lo;                                    // dia under the lowest finger
      if (prevAnchor !== null) anchor = Math.max(hi - 4, Math.min(lo, prevAnchor));
      var thumbDia = hand === 'left' ? anchor + 4 : anchor;
      var thumbNote = notes.slice(i, j).filter(function (n) { return n.dia === thumbDia; })[0];
      var thumbName = thumbNote ? thumbNote.name : LETTERS[mod(thumbDia, 7)];
      var spanLo = Math.min(natMidi(anchor), Math.min.apply(null, notes.slice(i, j).map(function (n) { return n.midi; })));
      var spanHi = Math.max(natMidi(anchor + 4), Math.max.apply(null, notes.slice(i, j).map(function (n) { return n.midi; })));
      for (var k = i; k < j; k++) {
        var step = notes[k].dia - anchor;
        out.push({ finger: hand === 'left' ? 5 - step : step + 1, thumbName: thumbName, lo: spanLo, hi: spanHi,
          shift: k === i && i > 0, cross: false });
      }
      prevAnchor = anchor; i = j;
    }
    return out;
  }

  /* ================================================================ octave fitting */
  function bestShift(midis, lo, hi, target) {
    if (!midis.length) return 0;
    var mean = midis.reduce(function (a, b) { return a + b; }, 0) / midis.length;
    var mn = Math.min.apply(null, midis), mx = Math.max.apply(null, midis), best = 0, bestD = Infinity;
    for (var k = -3; k <= 3; k++) {
      var sh = 12 * k, fits = mn + sh >= lo && mx + sh <= hi;
      var d = Math.abs(mean + sh - target) + (fits ? 0 : 100);
      if (d < bestD) { bestD = d; best = sh; }
    }
    return best;
  }

  /* ================================================================ whole-melody routes for other views */
  // Route a melody (concert-pitch midi numbers) on an instrument in one pass, so bar N starts
  // where bar N-1 ended. Returns { shift, plan, positions }; plan[i] is the spot for raw[i].
  function fitRoute(inst, raw, pos) {
    var shift, plan, positions;
    if (inst === 'violin') {
      shift = bestShift(raw, 55, 76 + V_MAX_OFF, 72);
      var vm = raw.map(function (m) { return m + shift; });
      positions = violinPositions(vm);
      plan = violinRoute(vm, pos === undefined || pos === 'auto' ? 'auto' : Number(pos));
    } else {
      shift = bestShift(raw, 52, 76 + MAX_FRET, 69);
      var gm = raw.map(function (m) { return m + shift; });
      positions = guitarPositions(gm);
      plan = guitarRoute(gm, pos === undefined || pos === 'auto' ? 'auto' : Number(pos));
    }
    return { shift: shift, plan: plan, positions: positions };
  }

  /* ================================================================ viewer */
  var STORE = 'fakebook:melody-view:v1';
  var DEFAULTS = { inst: 'guitar', gpos: 'auto', pmode: 'smooth', hand: 'right', octave: 0, hidden: false, vpos: 'auto' };
  function loadPrefs() {
    var o = Object.assign({}, DEFAULTS);
    try { Object.assign(o, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) { /* storage unavailable */ }
    return o;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function create(host) {
    if (!host) return null;
    var prefs = loadPrefs();
    var events = [], noteIdx = [], cursor = -1, plan = null, shift = 0, positions = [];

    host.innerHTML =
      '<div class="fb-mv-bar">' +
        '<div class="fb-mv-now">' +
          '<span class="fb-mv-badge">Melody</span>' +
          '<strong class="fb-mv-note" data-mv-note>--</strong>' +
          '<span class="fb-mv-how" data-mv-how></span>' +
        '</div>' +
        '<div class="fb-mv-controls">' +
          '<div class="fb-instr-tabs" role="group" aria-label="Show the melody on">' +
            '<button type="button" class="fb-instr-tab" data-mv-inst="piano">🎹 Piano</button>' +
            '<button type="button" class="fb-instr-tab" data-mv-inst="guitar">🎸 Guitar</button>' +
            '<button type="button" class="fb-instr-tab" data-mv-inst="violin">🎻 Violin</button>' +
          '</div>' +
          '<label class="fb-field fb-field-inline fb-mv-field"><span>Position</span><select data-mv-pos aria-label="Hand position"></select></label>' +
          '<label class="fb-field fb-field-inline fb-mv-field" data-mv-hand-wrap><span>Hand</span><select data-mv-hand aria-label="Which hand plays the melody">' +
            '<option value="right">Right hand</option><option value="left">Left hand</option></select></label>' +
          '<label class="fb-field fb-field-inline fb-mv-field"><span>Octave</span><select data-mv-octave aria-label="Octave">' +
            '<option value="-12">Down one</option><option value="0">Middle</option><option value="12">Up one</option></select></label>' +
          '<span class="fb-mv-step">' +
            '<button type="button" class="fb-step-btn" data-mv-step="-1" aria-label="Previous melody note">◀</button>' +
            '<button type="button" class="fb-step-btn" data-mv-step="1" aria-label="Next melody note">▶</button>' +
          '</span>' +
          '<button type="button" class="fb-btn fb-btn-small" data-mv-toggle aria-pressed="true">Hide melody</button>' +
        '</div>' +
      '</div>' +
      '<div class="fb-mv-body" data-mv-body>' +
        '<div class="fb-visualizer-container"><div class="fb-mv-surface" data-mv-surface data-contrast-guard-skip></div></div>' +
        '<ol class="fb-mv-strip" data-mv-strip aria-label="Melody notes in this bar"></ol>' +
        '<p class="fb-mv-tip" data-mv-tip></p>' +
      '</div>';
    var q = function (s) { return host.querySelector(s); };

    function save() { try { localStorage.setItem(STORE, JSON.stringify(prefs)); } catch (e) { /* ignore */ } }
    function midisOf() { return noteIdx.map(function (i) { return events[i].midi + shift; }); }

    function replan() {
      var raw = noteIdx.map(function (i) { return events[i].midi; });
      if (prefs.inst === 'guitar') {
        shift = bestShift(raw, 52, 76 + MAX_FRET, 69);
        var extra = Number(prefs.octave) || 0;
        if (raw.length && Math.min.apply(null, raw) + shift + extra >= 52 && Math.max.apply(null, raw) + shift + extra <= 76 + MAX_FRET) shift += extra;
        var midis = midisOf();
        positions = guitarPositions(midis);
        if (prefs.gpos !== 'auto' && !positions.some(function (p) { return p.pos === Number(prefs.gpos); })) prefs.gpos = 'auto';
        plan = guitarRoute(midis, prefs.gpos === 'auto' ? 'auto' : Number(prefs.gpos));
      } else if (prefs.inst === 'violin') {
        shift = bestShift(raw, 55, 76 + V_MAX_OFF, 72);
        var vx = Number(prefs.octave) || 0;
        if (raw.length && Math.min.apply(null, raw) + shift + vx >= 55 && Math.max.apply(null, raw) + shift + vx <= 76 + V_MAX_OFF) shift += vx;
        var vm = midisOf();
        positions = violinPositions(vm);
        if (prefs.vpos !== 'auto' && !positions.some(function (p) { return p.pos === Number(prefs.vpos); })) prefs.vpos = 'auto';
        plan = violinRoute(vm, prefs.vpos === 'auto' ? 'auto' : Number(prefs.vpos));
      } else {
        shift = bestShift(raw, 21, 108, prefs.hand === 'left' ? 55 : 69) + (Number(prefs.octave) || 0);
        var notes = noteIdx.map(function (i) { return { midi: events[i].midi + shift, dia: events[i].dia + 7 * Math.round(shift / 12), name: events[i].name }; });
        plan = prefs.pmode === 'five' ? pianoFive(notes, prefs.hand) : pianoSmooth(notes.map(function (n) { return n.midi; }), prefs.hand);
      }
      syncControls();
    }

    function syncControls() {
      host.querySelectorAll('[data-mv-inst]').forEach(function (b) {
        var on = b.getAttribute('data-mv-inst') === prefs.inst;
        b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
      });
      var sel = q('[data-mv-pos]');
      if (prefs.inst === 'guitar') {
        sel.innerHTML = '<option value="auto">Auto: fewest shifts</option>' + positions.map(function (p) {
          return '<option value="' + p.pos + '">' + esc(p.label) + (p.stretches ? ' (' + p.stretches + ' stretch' + (p.stretches > 1 ? 'es' : '') + ')' : '') + '</option>';
        }).join('');
        sel.value = String(prefs.gpos);
      } else if (prefs.inst === 'violin') {
        sel.innerHTML = '<option value="auto">Auto: fewest shifts</option>' + positions.map(function (p) {
          return '<option value="' + p.pos + '">' + esc(p.label) + '</option>';
        }).join('');
        sel.value = String(prefs.vpos);
      } else {
        sel.innerHTML = '<option value="smooth">Smooth fingering</option><option value="five">Five-finger positions</option>';
        sel.value = prefs.pmode;
      }
      q('[data-mv-hand-wrap]').hidden = prefs.inst !== 'piano';
      q('[data-mv-hand]').value = prefs.hand;
      q('[data-mv-octave]').value = String(prefs.octave || 0);
      q('[data-mv-body]').hidden = !!prefs.hidden;
      var tg = q('[data-mv-toggle]');
      tg.setAttribute('aria-pressed', String(!prefs.hidden));
      tg.textContent = prefs.hidden ? 'Show melody' : 'Hide melody';
    }

    // Plan index (k) for an event index, or the next note after a rest.
    function planAt(idx) { return noteIdx.indexOf(idx); }
    function nextNoteAfter(idx) { for (var i = idx + 1; i < events.length; i++) if (!events[i].rest) return i; return -1; }

    function describe(k) {
      var n = plan[k];
      if (!n) return 'out of range';
      if (prefs.inst === 'guitar') {
        var where = n.f === 0 ? STRING_NAMES[n.s] + ' string, open' : STRING_NAMES[n.s] + ' string, fret ' + n.f;
        return where + ' · ' + (n.f === 0 ? 'no finger' : 'finger ' + n.finger) + (n.stretch ? ' (stretch)' : '') +
          ' · ' + (n.pos === 0 ? 'open position' : 'position ' + ROMAN[n.pos]) + (n.shift ? ' · shift here' : '');
      }
      if (prefs.inst === 'violin') {
        var vstr = V_NAMES[n.s] + ' string';
        var vf = n.off === 0 ? 'open, no finger' : 'finger ' + n.finger + (n.place ? ' (' + n.place + ')' : '');
        return vstr + ' · ' + vf + ' · ' + violinPositionLabel(n.pos).toLowerCase() + (n.shift ? ' · shift here' : '');
      }
      var hand = prefs.hand === 'left' ? 'Left hand' : 'Right hand';
      var how = hand + ' · finger ' + n.finger;
      if (prefs.pmode === 'five') how += ' · thumb on ' + n.thumbName + (n.shift ? ' · move the hand here' : '');
      else if (n.cross) how += prefs.hand === 'left' ? ' · cross' : (n.finger === 1 ? ' · thumb under' : ' · cross over');
      else if (n.shift) how += ' · move the hand';
      return how;
    }

    function render() {
      var msg = q('[data-mv-tip]');
      if (!noteIdx.length) {
        q('[data-mv-note]').textContent = '--';
        q('[data-mv-how]').textContent = 'This chart has chords only, no melody.';
        q('[data-mv-surface]').innerHTML = '';
        q('[data-mv-strip]').innerHTML = '';
        msg.textContent = 'Pick a built-in tune to see its melody on piano, guitar or violin.';
        return;
      }
      var idx = cursor < 0 || cursor >= events.length ? noteIdx[0] : cursor;
      var isRest = events[idx].rest;
      var curK = isRest ? -1 : planAt(idx);
      var nextIdx = nextNoteAfter(idx), nextK = nextIdx >= 0 ? planAt(nextIdx) : -1;
      var bar = events[idx].bar;
      var barKs = [];
      noteIdx.forEach(function (ei, k) { if (events[ei].bar === bar) barKs.push(k); });

      if (isRest) {
        q('[data-mv-note]').textContent = 'Rest';
        q('[data-mv-how]').textContent = nextK >= 0 ? 'Next: ' + noteLabel(nextK) + ' · ' + describe(nextK) : 'End of the tune';
      } else {
        q('[data-mv-note]').textContent = noteLabel(curK);
        q('[data-mv-how]').textContent = describe(curK);
      }
      var focusK = curK >= 0 ? curK : nextK;
      var surf = q('[data-mv-surface]');
      surf.classList.toggle('is-guitar', prefs.inst === 'guitar');
      surf.classList.toggle('is-violin', prefs.inst === 'violin');
      surf.innerHTML = prefs.inst === 'guitar' ? drawGuitar(focusK, curK, nextK, barKs)
        : prefs.inst === 'violin' ? drawViolin(focusK, curK, nextK, barKs) : drawPiano(focusK, curK, nextK, barKs);

      q('[data-mv-strip]').innerHTML = barKs.map(function (k) {
        var n = plan[k], ei = noteIdx[k];
        var sub = !n ? 'out of range' : prefs.inst === 'guitar'
          ? (STRING_TAGS[n.s] + ' string · ' + (n.f === 0 ? 'open' : 'fret ' + n.f))
          : prefs.inst === 'violin' ? (V_NAMES[n.s] + ' string · ' + (n.off === 0 ? 'open' : 'finger ' + n.finger + (n.place ? ' ' + n.place : '')))
          : 'finger ' + n.finger;
        var fin = n && prefs.inst === 'guitar' && n.f > 0 ? '<small>finger ' + n.finger + '</small>' : '';
        return '<li><button type="button" class="fb-mv-chip' + (k === curK ? ' is-now' : '') + (n && n.shift ? ' is-shift' : '') +
          '" data-mv-idx="' + ei + '"' + (k === curK ? ' aria-current="true"' : '') + '>' +
          (n && n.shift ? '<em>' + (prefs.inst === 'piano' ? 'move' : 'shift') + '</em>' : '') +
          '<b>' + esc(noteLabel(k)) + '</b><small>' + esc(sub) + '</small>' + fin + '</button></li>';
      }).join('');

      msg.textContent = tipText(bar);
    }
    // Name with octave number, as played (C4 = middle C; guitar uses written pitch).
    function noteLabel(k) {
      var e = events[noteIdx[k]];
      return e.name + Math.floor((e.dia + 7 * Math.round(shift / 12)) / 7);
    }
    function tipText(bar) {
      var where = bar === 0 ? 'Pickup' : 'Bar ' + bar;
      if (prefs.inst === 'guitar') {
        var p = prefs.gpos === 'auto' ? 'The route stays in one position as long as it can and shifts only when it has to.' :
          'Every note stays inside this position. Try the same bar in another position: same notes, new fingers.';
        return where + '. ' + p + ' Guitar sounds an octave lower than written.';
      }
      if (prefs.inst === 'violin') {
        return where + '. ' + (prefs.vpos === 'auto' ? 'The route stays in one position as long as it can and shifts only when it has to.' :
          'Every note stays inside this position.') + ' The violin has no frets: a “low” or “high” finger sits a semitone off its usual spot, and your ear decides where.';
      }
      return where + '. ' + (prefs.pmode === 'five'
        ? 'One finger per letter name. The hand moves only where a new position starts.'
        : 'Fingers chosen so the hand moves as little as possible; a thumb-under keeps a run legato.');
    }

    /* ---- drawings */
    function drawPiano(focusK, curK, nextK, barKs) {
      var all = midisOf();
      var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
      lo = lo - mod(lo, 12); hi = hi + (11 - mod(hi, 12));
      if (hi - lo < 23) hi = lo + 23;
      var wW = 20, top = 16, x = 0, keys = {};
      for (var m = lo; m <= hi; m++) {
        if (!isBlack(m)) { keys[m] = { x: x, w: wW, black: false }; x += wW; }
        else keys[m] = { x: x - 6.5, w: 13, black: true };
      }
      var role = {};
      barKs.forEach(function (k) { role[all[k]] = role[all[k]] || 'bar'; });
      if (nextK >= 0) role[all[nextK]] = 'next';
      if (curK >= 0) role[all[curK]] = 'cur';
      var fingerAt = {};
      barKs.forEach(function (k) { if (plan[k] && fingerAt[all[k]] === undefined) fingerAt[all[k]] = plan[k].finger; });
      if (nextK >= 0 && plan[nextK]) fingerAt[all[nextK]] = plan[nextK].finger;
      if (curK >= 0 && plan[curK]) fingerAt[all[curK]] = plan[curK].finger;

      var out = [];
      var fp = focusK >= 0 ? plan[focusK] : null;
      if (fp && keys[Math.max(lo, fp.lo)] && keys[Math.min(hi, fp.hi)]) {
        var a = keys[Math.max(lo, fp.lo)], b = keys[Math.min(hi, fp.hi)];
        out.push('<rect class="fb-mv-hand" x="' + a.x + '" y="2" width="' + (b.x + b.w - a.x) + '" height="10" rx="5"/>' +
          '<text class="fb-mv-hand-lbl" x="' + (a.x + (b.x + b.w - a.x) / 2) + '" y="7.5">' + (prefs.hand === 'left' ? 'left hand' : 'right hand') + '</text>');
      }
      function key(m2, k) {
        var r = role[m2] ? ' is-' + role[m2] : '';
        var s = '<rect x="' + k.x + '" y="' + top + '" width="' + k.w + '" height="' + (k.black ? 62 : 100) + '" rx="' + (k.black ? 2 : 3) + '" class="' + (k.black ? 'fb-bk' : 'fb-wk') + ' fb-mv-key' + r + '" data-mv-midi="' + m2 + '"/>';
        var cx = k.x + k.w / 2;
        if (fingerAt[m2] !== undefined) {
          var cy = top + (k.black ? 48 : 84);
          s += '<circle class="fb-mv-fing' + r + '" cx="' + cx + '" cy="' + cy + '" r="' + (role[m2] === 'cur' ? 8 : 6.5) + '"/>' +
            '<text class="fb-mv-fing-t' + r + '" x="' + cx + '" y="' + cy + '">' + fingerAt[m2] + '</text>';
        } else if (!k.black && mod(m2, 12) === 0) {
          s += '<text x="' + cx + '" y="' + (top + 94) + '" class="fb-kc">C' + (m2 / 12 - 1) + '</text>';
        }
        return s;
      }
      var whites = [], blacks = [];
      for (var m3 = lo; m3 <= hi; m3++) (keys[m3].black ? blacks : whites).push(key(m3, keys[m3]));
      return '<svg viewBox="0 0 ' + x + ' ' + (top + 102) + '" role="img" aria-label="Piano keyboard: melody notes with finger numbers">' +
        out.join('') + whites.join('') + blacks.join('') + '</svg>';
    }

    function drawGuitar(focusK, curK, nextK, barKs) {
      var used = plan.filter(Boolean).map(function (n) { return n.f; });
      var frets = Math.min(MAX_FRET, Math.max(12, Math.max.apply(null, used.concat([0])) + 1));
      var nutX = 52, fretW = 46, totalW = nutX + frets * fretW + 14, totalH = 160;
      var strY = [138, 117, 96, 75, 54, 33];               // low E at the bottom, like tab
      var xOf = function (f) { return f === 0 ? nutX - 18 : nutX + (f - 0.5) * fretW; };
      var out = [];
      out.push('<rect class="fb-gtr-bg" x="' + (nutX - 4) + '" y="20" width="' + (frets * fretW + 8) + '" height="132" rx="8" fill="#2c1d11"/>');
      var fp = focusK >= 0 ? plan[focusK] : null;
      if (fp) {
        var pw = positionFrets(fp.pos), x0 = pw[0] === 0 ? nutX - 30 : nutX + (pw[0] - 1) * fretW, x1 = nutX + pw[1] * fretW;
        out.push('<rect class="fb-mv-pos" x="' + x0 + '" y="20" width="' + (x1 - x0) + '" height="132" rx="6"/>');
        out.push('<text class="fb-mv-pos-lbl" x="' + ((x0 + x1) / 2) + '" y="13">' + (fp.pos === 0 ? 'open position' : 'position ' + ROMAN[fp.pos]) + '</text>');
      }
      [3, 5, 7, 9, 15].forEach(function (f) { if (f <= frets) out.push('<circle class="fb-gtr-dot-inlay" cx="' + xOf(f) + '" cy="85.5" r="4.5"/>'); });
      if (frets >= 12) out.push('<circle class="fb-gtr-dot-inlay" cx="' + xOf(12) + '" cy="64.5" r="4"/><circle class="fb-gtr-dot-inlay" cx="' + xOf(12) + '" cy="106.5" r="4"/>');
      for (var f = 1; f <= frets; f++) {
        var fx = nutX + f * fretW;
        out.push('<line class="fb-gtr-fretwire" x1="' + fx + '" y1="22" x2="' + fx + '" y2="150"/>');
        out.push('<text class="fb-mv-fretnum" x="' + (fx - fretW / 2) + '" y="159">' + f + '</text>');
      }
      out.push('<line class="fb-gtr-nut" x1="' + nutX + '" y1="20" x2="' + nutX + '" y2="152"/>');
      strY.forEach(function (sy, s) {
        out.push('<line class="fb-gtr-string" x1="' + nutX + '" y1="' + sy + '" x2="' + (nutX + frets * fretW + 4) + '" y2="' + sy + '" stroke-width="' + (3.2 - s * 0.4).toFixed(1) + '"/>');
        out.push('<text class="fb-gtr-str-tag" x="10" y="' + sy + '">' + STRING_TAGS[s] + '</text>');
      });
      var drawn = {};
      function dot(k, cls) {
        var n = plan[k]; if (!n) return;
        var id = n.s + ':' + n.f;
        if (drawn[id] && cls === 'bar') return;
        drawn[id] = true;
        var cx = xOf(n.f), cy = strY[n.s], e = events[noteIdx[k]];
        out.push('<g class="fb-mv-spot is-' + cls + '" data-mv-s="' + n.s + '" data-mv-f="' + n.f + '">' +
          '<circle cx="' + cx + '" cy="' + cy + '" r="' + (cls === 'cur' ? 11 : 9.5) + '"/>' +
          '<text x="' + cx + '" y="' + cy + '">' + esc(e.name) + '</text>' +
          (n.f > 0 && cls !== 'bar' ? '<text class="fb-mv-spot-fing" x="' + (cx + 11) + '" y="' + (cy - 10) + '">' + n.finger + '</text>' : '') +
          '</g>');
      }
      barKs.forEach(function (k) { if (k !== curK && k !== nextK) dot(k, 'bar'); });
      if (nextK >= 0 && nextK !== curK) dot(nextK, 'next');
      if (curK >= 0) dot(curK, 'cur');
      return '<svg viewBox="0 0 ' + totalW + ' ' + totalH + '" role="img" aria-label="Guitar fretboard: melody notes with string, fret and finger">' + out.join('') + '</svg>';
    }

    function drawViolin(focusK, curK, nextK, barKs) {
      var used = plan.filter(Boolean).map(function (n) { return n.off; });
      var maxOff = Math.max(12, Math.max.apply(null, used.concat([0])) + 2);
      var nutX = 44, L = 700, totalW = nutX + L * (1 - Math.pow(2, -maxOff / 12)) + 22, totalH = 150;
      var strY = [124, 94, 64, 34];                           // G (index 0) at the bottom, E on top, like a player sees it
      var xOf = function (off) { return off === 0 ? nutX - 16 : nutX + L * (1 - Math.pow(2, -(off - 0.5) / 12)); };
      var xLine = function (off) { return nutX + L * (1 - Math.pow(2, -off / 12)); };
      var out = [];
      out.push('<rect class="fb-vln-board" x="' + (nutX - 4) + '" y="18" width="' + (totalW - nutX - 8) + '" height="124" rx="8"/>');
      var fp = focusK >= 0 ? plan[focusK] : null;
      if (fp) {
        var b = V_BASE[fp.pos], x0 = fp.pos === 1 ? nutX - 30 : xLine(b - 1), x1 = xLine(b + 6);
        out.push('<rect class="fb-mv-pos" x="' + x0 + '" y="18" width="' + (x1 - x0) + '" height="124" rx="6"/>');
        out.push('<text class="fb-mv-pos-lbl" x="' + ((x0 + x1) / 2) + '" y="12">' + violinPositionLabel(fp.pos).toLowerCase() + '</text>');
      }
      out.push('<line class="fb-gtr-nut" x1="' + nutX + '" y1="18" x2="' + nutX + '" y2="142"/>');
      strY.forEach(function (sy, i) {
        out.push('<line class="fb-gtr-string" x1="' + nutX + '" y1="' + sy + '" x2="' + (totalW - 12) + '" y2="' + sy + '" stroke-width="' + (1 + (3 - i) * 0.45).toFixed(1) + '"/>');
        out.push('<text class="fb-gtr-str-tag" x="10" y="' + sy + '">' + V_NAMES[i] + '</text>');
      });
      for (var o = 1; o <= maxOff; o += 1) {                  // a faint tick per semitone, closer together toward the bridge
        out.push('<text class="fb-mv-fretnum" x="' + xOf(o) + '" y="141">' + (o % 12 === 0 ? '8va' : '') + '</text>');
      }
      var drawn = {};
      function dot(k, cls) {
        var n = plan[k]; if (!n) return;
        var id = n.s + ':' + n.off;
        if (drawn[id] && cls === 'bar') return;
        drawn[id] = true;
        var cx = xOf(n.off), cy = strY[n.s], e = events[noteIdx[k]];
        out.push('<g class="fb-mv-spot is-' + cls + '" data-mv-s="' + n.s + '" data-mv-off="' + n.off + '">' +
          '<circle cx="' + cx + '" cy="' + cy + '" r="' + (cls === 'cur' ? 11 : 9.5) + '"/>' +
          '<text x="' + cx + '" y="' + cy + '">' + esc(e.name) + '</text>' +
          (n.off > 0 && cls !== 'bar' ? '<text class="fb-mv-spot-fing" x="' + (cx + 14) + '" y="' + (cy - 12) + '">' + n.finger + (n.place === 'low' ? '↓' : n.place === 'high' ? '↑' : '') + '</text>' : '') +
          '</g>');
      }
      barKs.forEach(function (k) { if (k !== curK && k !== nextK) dot(k, 'bar'); });
      if (nextK >= 0 && nextK !== curK) dot(nextK, 'next');
      if (curK >= 0) dot(curK, 'cur');
      return '<svg viewBox="0 0 ' + totalW + ' ' + totalH + '" role="img" aria-label="Violin fingerboard: melody notes with string, finger and position">' + out.join('') + '</svg>';
    }

    /* ---- sound for clicks and steps (never during playback) */
    function violinTone(midi) {
      if (root.AudioKit && root.MusicSynth) root.AudioKit.note({ instrument: 'violin', midi: midi, velocity: 0.7, duration: 0.8 });
    }
    function sound(idx) {
      var k = planAt(idx); if (k < 0 || !plan[k]) return;
      if (prefs.inst === 'violin') violinTone(V_OPEN[plan[k].s] + plan[k].off);
      else if (prefs.inst === 'guitar' && root.GuitarAudio && root.GuitarTheory) {
        root.GuitarAudio.pluck(root.GuitarTheory.noteFreq(plan[k].s, plan[k].f));
      } else if (root.PianoAudio) {
        root.PianoAudio.tone(440 * Math.pow(2, (events[idx].midi + shift - 69) / 12));
      }
    }

    host.addEventListener('click', function (ev) {
      var t = ev.target;
      var inst = t.closest('[data-mv-inst]');
      if (inst) { prefs.inst = inst.getAttribute('data-mv-inst'); save(); replan(); render(); return; }
      var stepB = t.closest('[data-mv-step]');
      if (stepB) { step(Number(stepB.getAttribute('data-mv-step')), true); return; }
      var chip = t.closest('[data-mv-idx]');
      if (chip) { cursor = Number(chip.getAttribute('data-mv-idx')); render(); sound(cursor); return; }
      if (t.closest('[data-mv-toggle]')) { prefs.hidden = !prefs.hidden; save(); syncControls(); return; }
      var key = t.closest('[data-mv-midi]');
      if (key && root.PianoAudio) { root.PianoAudio.tone(440 * Math.pow(2, (Number(key.getAttribute('data-mv-midi')) - 69) / 12)); return; }
      var vspot = t.closest('[data-mv-off]');
      if (vspot) { violinTone(V_OPEN[Number(vspot.getAttribute('data-mv-s'))] + Number(vspot.getAttribute('data-mv-off'))); return; }
      var spot = t.closest('[data-mv-s]');
      if (spot && root.GuitarAudio && root.GuitarTheory) root.GuitarAudio.pluck(root.GuitarTheory.noteFreq(Number(spot.getAttribute('data-mv-s')), Number(spot.getAttribute('data-mv-f'))));
    });
    host.addEventListener('change', function (ev) {
      var t = ev.target;
      if (t.matches('[data-mv-pos]')) { if (prefs.inst === 'guitar') prefs.gpos = t.value === 'auto' ? 'auto' : Number(t.value); else if (prefs.inst === 'violin') prefs.vpos = t.value === 'auto' ? 'auto' : Number(t.value); else prefs.pmode = t.value; }
      else if (t.matches('[data-mv-hand]')) prefs.hand = t.value;
      else if (t.matches('[data-mv-octave]')) prefs.octave = Number(t.value);
      else return;
      save(); replan(); render();
    });
    host.addEventListener('keydown', function (ev) {
      if (!ev.target.closest('[data-mv-strip], [data-mv-step]')) return;
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
      ev.preventDefault();
      step(ev.key === 'ArrowLeft' ? -1 : 1, true);
      var f = host.querySelector('.fb-mv-chip.is-now');
      if (f && ev.target.closest('[data-mv-strip]')) f.focus({ preventScroll: true });
    });

    function step(dir, withSound) {
      if (!noteIdx.length) return;
      var k = planAt(cursor);
      if (k < 0) {                                         // on a rest: go to the next / previous note
        var i = cursor;
        do { i += dir; } while (i >= 0 && i < events.length && events[i].rest);
        k = planAt(i);
        if (k < 0) k = dir > 0 ? noteIdx.length - 1 : 0;
      } else k = Math.max(0, Math.min(noteIdx.length - 1, k + dir));
      cursor = noteIdx[k];
      render();
      if (withSound) sound(cursor);
    }

    var api = {
      // list: [{ start, dur, bar, rest } | { start, dur, bar, midi, dia, name }], concert pitch
      setMelody: function (list) {
        events = list || [];
        noteIdx = [];
        events.forEach(function (e, i) { if (!e.rest) noteIdx.push(i); });
        if (cursor >= events.length || cursor < 0) cursor = noteIdx.length ? noteIdx[0] : -1;
        replan();
        render();
      },
      setCursor: function (idx) {
        if (idx === cursor || idx < 0 || idx >= events.length) return;
        cursor = idx;
        if (!prefs.hidden) render();
      },
      // Jump to the first note at or after a beat (used when a chord or bar is chosen).
      cursorAtBeat: function (beat) {
        for (var i = 0; i < events.length; i++) {
          if (!events[i].rest && events[i].start >= beat - 1e-6) { api.setCursor(i); return; }
        }
      }
    };
    replan();
    render();
    return api;
  }

  var exported = {
    create: create, inPosition: inPosition, guitarPositions: guitarPositions, guitarRoute: guitarRoute,
    fitRoute: fitRoute, positionFrets: positionFrets, ROMAN: ROMAN, violinInPosition: violinInPosition, violinPositions: violinPositions, violinRoute: violinRoute,
    pianoSmooth: pianoSmooth, pianoFive: pianoFive, bestShift: bestShift, OPEN: OPEN, V_OPEN: V_OPEN
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.FakeBookMelody = exported;
})(typeof window !== 'undefined' ? window : globalThis);
