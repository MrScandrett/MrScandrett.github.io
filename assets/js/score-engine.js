/* score-engine.js — engraved, playable sheet-music excerpts for lessons.
 *
 * Drop <figure data-score="slug"> into a lesson (slug = a key in data/score-library.json)
 * and load music-notation.js, music-synth.js and this file. The figure gets an engraved
 * score (Bravura outlines from MusicNotation) and a player that sounds it through
 * MusicSynth, lighting each note as it plays. ScoreEngine.render(el, score) does the
 * same for a score object built in JS.
 *
 * Score text, one string per staff (bars split by "|"):
 *   C#5/8.   pitch / duration (1 2 4 8 16 32) + dots      r/4  rest      R  whole-bar rest
 *   (C4 E4 G4)/2   chord        ~ tie to the next note      ^ fermata     s/4  S  hidden (spacer) rests
 *   !p !mf !f      dynamic for the next note (also sets playback loudness)
 *   For overlapping voices, use staves[].voices = [{ notes, stem: "up"|"down", restStep? }].
 *   Each voice must fill the same bars; ties and beams stay within that voice.
 *   A duration may be left off to repeat the previous one. Write pitches as they sound
 *   (F#4, Bb3); the engine decides which accidentals to print from the key signature.
 *   "n" forces a printed natural (Bn4) where a courtesy natural helps the reader.
 *
 * Whole pieces (staff 1 carries the bar-level marks; every staff must agree on bar count):
 *   |: … :|        repeat barlines (a ":" first or last in a bar)   @1 @2 @1.2   1st/2nd ending
 *   @K:-3          key signature change at the start of this bar     @T:3/4      time change
 *   @C:bass        clef change for this staff before the next note (treble, bass, alto)
 *   @U @D @A       stems (and rests) up, down or automatic from here on in this voice
 *   @L:3/2         this bar is incomplete: 3/2 quarter beats long (repeat endings, mid-piece pickups)
 *   @N:12          printed bar number of this bar (numbering continues from it)
 *   g:C5/16        grace note (sounds just before the next note; takes no time in the bar)
 *   {3 C5/8 D5 E5 }   tuplet: three in the time of two ({6:4 …}, {5:4 …} likewise)
 *   C5/4+tr  +mord  +turn  +.  +>  +-   trill, mordent, turn, staccato, accent, tenuto
 * Score fields for lessons: sections [{ bar, label, name }], guide [{ bars: "1-4", text }],
 *   complete: true (or excerpt: { of, bars }), source.full (link to the complete printed score).
 *
 * npm run check:scores parses every score in the library and every data-score embed.
 */
(function (root) {
  'use strict';

  var BASES = { 1: 4, 2: 2, 4: 1, 8: 0.5, 16: 0.25, 32: 0.125 };
  var DYN_VEL = { pp: 0.32, p: 0.45, mp: 0.58, mf: 0.7, f: 0.85, ff: 1 };
  var EPS = 1e-6;

  // ── Parsing ───────────────────────────────────────────────────────────────
  function fail(where, msg) { throw new Error(where + ': ' + msg); }

  function parsePitchToken(text, where) {
    var M = root.MusicNotation;
    var force = /^[A-G]n-?\d+$/.test(text);
    var p;
    try { p = M.parsePitch(force ? text.replace('n', '') : text); } catch (e) { fail(where, 'bad pitch "' + text + '"'); }
    p.force = force;
    return p;
  }

  var ORNAMENTS = { tr: 1, mord: 1, turn: 1, '.': 1, '>': 1, '-': 1 };
  var TUPLET_SPACE = { 2: 3, 3: 2, 4: 3, 5: 4, 6: 4, 7: 4, 9: 8 };

  function parseStaff(text, where) {
    var bars = String(text).split('|').map(function (s) { return s.trim(); });
    if (bars[bars.length - 1] === '') bars.pop();
    var last = null, dyn = null, tuplet = null, tupletId = 0, stemDir = null;
    return bars.map(function (bar, bi) {
      var events = [], t = 0, meta = {}, clefNext = null, graces = [];
      if (bar.charAt(0) === ':') { meta.repStart = true; bar = bar.slice(1).trim(); }
      if (bar.charAt(bar.length - 1) === ':') { meta.repEnd = true; bar = bar.slice(0, -1).trim(); }
      (bar.match(/\([^)]*\)\S*|g:\([^)]*\)\S*|\S+/g) || []).forEach(function (tok) {
        var w = where + ', bar ' + (bi + 1) + ', "' + tok + '"';
        if (tok.charAt(0) === '!') {
          dyn = tok.slice(1);
          if (!DYN_VEL[dyn]) fail(w, 'unknown dynamic');
          return;
        }
        if (tok === '@U' || tok === '@D' || tok === '@A') { stemDir = { '@U': 'up', '@D': 'down', '@A': null }[tok]; return; }
        if (tok.charAt(0) === '@') {
          var lm = /^@L:(\d+)(?:\/(\d+))?$/.exec(tok), nm = /^@N:(\d+)$/.exec(tok);
          if (lm) { meta.len = +lm[1] / (lm[2] ? +lm[2] : 1); return; }
          if (nm) { meta.number = +nm[1]; return; }
          var mark = /^@(?:(K):(-?\d)|(T):(\d+\/\d+)|(C):(treble|bass|alto)|([1-9](?:\.[1-9])*))$/.exec(tok);
          if (!mark) fail(w, 'unknown mark');
          if (mark[1]) { if (events.length) fail(w, 'key changes go at the start of a bar'); meta.key = +mark[2]; }
          else if (mark[3]) { if (events.length) fail(w, 'time changes go at the start of a bar'); meta.time = mark[4]; }
          else if (mark[5]) clefNext = mark[6];
          else meta.volta = mark[7];
          return;
        }
        if (tok.charAt(0) === '{') {
          var tm = /^\{(\d+)(?::(\d+))?$/.exec(tok);
          if (!tm || tuplet) fail(w, 'tuplets look like {3 … } and cannot nest');
          var n = +tm[1], space = tm[2] ? +tm[2] : TUPLET_SPACE[n];
          if (!space) fail(w, 'say how many notes this tuplet replaces, e.g. {5:4');
          tuplet = { n: n, space: space, ratio: space / n, id: ++tupletId, events: [] };
          return;
        }
        if (tok === '}') {
          if (!tuplet) fail(w, 'a } without a {');
          if (tuplet.events.length) tuplet.events[0].tupletStart = tuplet;
          tuplet = null;
          return;
        }
        var m = /^(g:)?(\([^)]*\)|[A-G](?:##|bb|#|b|n)?-?\d+|r|R|s|S)(?:\/(\d+)(\.{0,2}))?(~?)(\^?)((?:\+(?:tr|mord|turn|\.|>|-))*)$/.exec(tok);
        if (!m) fail(w, 'cannot read this token');
        var grace = !!m[1];
        if (grace && /^[rRsS]$/.test(m[2])) fail(w, 'grace notes must be notes');
        if (m[3]) {
          var base = BASES[m[3]];
          if (!base) fail(w, 'duration must be 1, 2, 4, 8, 16 or 32');
          if (!grace) last = { base: base, dots: m[4].length };
        } else if (!last && m[2] !== 'R' && m[2] !== 'S' && !grace) fail(w, 'first note needs a duration');
        var ev = { start: t, dyn: dyn, fermata: !!m[6], tie: !!m[5], stemDir: stemDir };
        if (m[7]) ev.orn = m[7].split('+').filter(Boolean);
        if (clefNext && !grace) { ev.clefChange = clefNext; clefNext = null; }
        // Spacers and grace notes leave a pending dynamic for the next real note.
        var spacer = m[2] === 's' || m[2] === 'S';
        if (grace || spacer) ev.dyn = null; else dyn = null;
        if (grace) {
          ev.kind = 'note'; ev.grace = true; ev.base = m[3] ? BASES[m[3]] : 0.25; ev.dots = 0; ev.dur = 0;
        } else if (m[2] === 'R' || m[2] === 'S') {
          ev.kind = 'rest'; ev.whole = true; ev.base = 4; ev.dots = 0; ev.dur = null; ev.hidden = spacer;
        } else {
          ev.base = last.base; ev.dots = last.dots;
          ev.dur = last.base * (last.dots === 2 ? 1.75 : last.dots === 1 ? 1.5 : 1);
          if (tuplet) { ev.dur *= tuplet.ratio; ev.tuplet = tuplet; tuplet.events.push(ev); }
          ev.kind = m[2] === 'r' || spacer ? 'rest' : 'note';
          ev.hidden = spacer;
        }
        if (ev.kind === 'note') {
          var list = m[2].charAt(0) === '(' ? m[2].slice(1, -1).trim().split(/\s+/) : [m[2]];
          ev.pitches = list.map(function (s) { return parsePitchToken(s, w); })
            .sort(function (a, b) { return a.diatonic - b.diatonic || a.midi - b.midi; });
        }
        if (ev.tie && ev.kind !== 'note') fail(w, 'only notes can be tied');
        if (grace) { graces.push(ev); return; }
        if (graces.length) { if (ev.kind !== 'note') fail(w, 'grace notes must lead into a note'); ev.graces = graces; graces = []; }
        events.push(ev);
        t += ev.dur || 0;
      });
      if (graces.length) fail(where + ', bar ' + (bi + 1), 'grace notes at the end of a bar need a note after them in the same bar');
      if (tuplet) fail(where + ', bar ' + (bi + 1), 'a tuplet must close inside its bar');
      if (clefNext) meta.clefEnd = clefNext;
      return { events: events, length: t, meta: meta };
    });
  }

  function timeSig(score, text) {
    var m = /^(\d+)\/(\d+)$/.exec(text || score.time || '4/4');
    if (!m) throw new Error((score.id || 'score') + ': time must look like "3/4"');
    return { num: +m[1], den: +m[2], len: +m[1] * 4 / +m[2] };
  }

  // Parses and checks a score; returns the model the renderer and player use.
  function prepare(score) {
    var id = score.id || 'score';
    var M = root.MusicNotation;
    var ts = timeSig(score);
    var pickup = score.pickup || 0;
    if (!score.staves || !score.staves.length) throw new Error(id + ': needs at least one staff');
    // Bar-level marks (repeats, endings, key and time changes) come from the first voice of staff 1.
    var first = score.staves[0].voices ? score.staves[0].voices[0] : score.staves[0];
    var metaBars = parseStaff(first.notes || '', id + ', staff 1');
    var ksig = score.key || 0;
    if (Math.abs(ksig) > 7) throw new Error(id + ': key must be -7…7 (flats negative, sharps positive)');
    var curKey = ksig, curTs = ts;
    var barMeta = metaBars.map(function (bar, bi) {
      var m = bar.meta, out = { repStart: !!m.repStart, repEnd: !!m.repEnd, volta: m.volta || null, len: m.len || null, number: m.number == null ? null : m.number };
      if (m.key != null && m.key !== curKey) { if (Math.abs(m.key) > 7) fail(id + ', bar ' + (bi + 1), 'key must be -7…7'); out.keyChange = true; out.prevKey = curKey; curKey = m.key; }
      if (m.time) { var nt = timeSig(score, m.time); if (nt.num !== curTs.num || nt.den !== curTs.den) { out.timeChange = true; curTs = nt; } }
      out.key = curKey; out.ts = curTs;
      return out;
    });
    var staves = score.staves.map(function (st, si) {
      var where = id + ', staff ' + (si + 1);
      if (!M.clefs[st.clef || 'treble']) fail(where, 'unknown clef "' + st.clef + '"');
      var definitions = st.voices || [{ notes: st.notes || '' }];
      if (!definitions.length) fail(where, 'needs at least one voice');
      var voices = definitions.map(function (voice, vi) {
        var bars = parseStaff(voice.notes || '', where + ', voice ' + (vi + 1));
        bars.forEach(function (bar, bi) {
          var bts = barMeta[bi] ? barMeta[bi].ts : ts;
          var want = barMeta[bi] && barMeta[bi].len ? barMeta[bi].len : bi === 0 && pickup ? pickup : bts.len;
          var t = 0;
          bar.events.forEach(function (ev) {
            if (ev.whole) ev.dur = want;
            ev.start = t; t += ev.dur;
            ev.voice = vi; ev.stem = ev.stemDir || voice.stem || null;
            ev.restStep = ev.stemDir === 'up' ? 7 : ev.stemDir === 'down' ? 1 : voice.restStep == null ? 4 : voice.restStep;
            (ev.graces || []).forEach(function (g) { g.start = ev.start; g.voice = vi; });
          });
          bar.length = t;
          if (Math.abs(t - want) > EPS && !(bi === bars.length - 1 && t < want))
            fail(where + ', voice ' + (vi + 1) + ', bar ' + (bi + 1), 'adds up to ' + Math.round(t * 1000) / 1000 + ' beats, expected ' + want);
        });
        return bars;
      });
      var count = voices[0].length;
      voices.forEach(function (bars, vi) {
        if (bars.length !== count) fail(where, 'voices have different bar counts');
        bars.forEach(function (bar, bi) {
          if (Math.abs(bar.length - voices[0][bi].length) > EPS) fail(where, 'voices have different bar lengths');
        });
      });
      var bars = voices[0].map(function (bar, bi) {
        var events = [];
        voices.forEach(function (voice) { events = events.concat(voice[bi].events); });
        events.sort(function (a, b) { return a.start - b.start || a.voice - b.voice; });
        return { events: events, length: bar.length };
      });
      // Clef in effect for every event; clefAt[bi] is the clef a system starting at bar bi shows.
      var clef = st.clef || 'treble', clefAt = [], pendingEnd = null;
      bars.forEach(function (bar, bi) {
        if (pendingEnd) { clef = pendingEnd; pendingEnd = null; bar.clefStart = clef; }
        var firstEv = bar.events[0];
        if (firstEv && firstEv.clefChange && firstEv.start < EPS) { clef = firstEv.clefChange; bar.clefStart = clef; firstEv.clefChange = null; }
        clefAt.push(clef);
        bar.events.forEach(function (ev) {
          if (ev.clefChange) { clef = ev.clefChange; }
          ev.clef = clef;
          (ev.graces || []).forEach(function (g) { g.clef = clef; });
        });
        voices.forEach(function (voice) { if (voice[bi].meta.clefEnd) pendingEnd = voice[bi].meta.clefEnd; });
      });
      return { clef: st.clef || 'treble', clefAt: clefAt, label: st.label || '', instrument: st.instrument || null, bars: bars, voices: voices };
    });
    var count = staves[0].bars.length;
    staves.forEach(function (st, si) {
      if (st.bars.length !== count) fail(id + ', staff ' + (si + 1), 'has ' + st.bars.length + ' bars but staff 1 has ' + count);
    });
    // Every staff's last bar must be the same length (a final bar may be short to balance a pickup).
    var ends = staves.map(function (st) { return st.bars[count - 1].length; });
    if (ends.some(function (e) { return Math.abs(e - ends[0]) > EPS; })) throw new Error(id + ': staves end at different points in the last bar');
    var barStart = [], t = 0;
    for (var b = 0; b < count; b++) { barStart.push(t); t += staves[0].bars[b].length; }
    var model = { score: score, id: id, ts: ts, pickup: pickup, key: ksig, staves: staves, barStart: barStart, total: t, count: count, barMeta: barMeta };
    model.order = performanceOrder(model);
    var perfStart = [], pt = 0;
    model.order.forEach(function (bi) { perfStart.push(pt); pt += staves[0].bars[bi].length; });
    model.perfStart = perfStart; model.perfTotal = pt;
    // Printed bar numbers: sequential from startMeasure (a pickup is bar 0) unless a bar says otherwise.
    var no = (model.score.startMeasure || 1) - (pickup ? 1 : 0);
    model.barNo = barMeta.map(function (m) { if (m.number != null) no = m.number; return no++; });
    model.firstBar = barNumber(model, 0);
    return model;
  }

  // First bar index printed with number n at or after it (or -1).
  function barIndexOf(model, n, last) {
    var found = -1;
    for (var i = 0; i < model.count; i++) {
      var no = barNumber(model, i);
      if (last ? no <= n : no >= n) { found = i; if (!last) break; }
    }
    return found;
  }

  // Printed bar number of bar index bi (a pickup is bar 0).
  function barNumber(model, bi) {
    if (model.barNo && model.barNo[bi] != null) return model.barNo[bi];
    return bi + (model.score.startMeasure || 1) - (model.pickup ? 1 : 0);
  }

  // Written bars in the order they are played: repeats taken once, first/second endings honoured.
  function performanceOrder(model) {
    var meta = model.barMeta, order = [], i = 0, start = 0, pass = 1, jumped = {}, sectionEnd = -1;
    while (i < model.count && order.length < model.count * 4) {
      var m = meta[i];
      // Past a repeated section (and its endings): an end-repeat without a start-repeat comes back here.
      if (sectionEnd >= 0 && i > sectionEnd && !m.volta) { start = i; pass = 1; sectionEnd = -1; }
      if (m.repStart && i !== start) { start = i; pass = 1; }
      if (m.volta && m.volta.split('.').indexOf(String(pass)) < 0) { i++; continue; }
      order.push(i);
      if (m.repEnd && !jumped[i]) { jumped[i] = true; pass++; sectionEnd = Math.max(sectionEnd, i); i = start; continue; }
      i++;
    }
    return order;
  }

  // Key-signature alteration for each letter (C=0 … B=6).
  function keyAlters(fifths) {
    var alt = [0, 0, 0, 0, 0, 0, 0];
    var sharps = [3, 0, 4, 1, 5, 2, 6], flats = [6, 2, 5, 1, 4, 0, 3];
    for (var i = 0; i < Math.abs(fifths); i++) alt[fifths > 0 ? sharps[i] : flats[i]] = fifths > 0 ? 1 : -1;
    return alt;
  }

  // Which accidentals print, tie links, and playback notes.
  function analyse(model) {
    model.staves.forEach(function (st, si) {
      var previous = {};
      st.bars.forEach(function (bar, bi) {
        var state = {};
        var keyAlt = keyAlters(model.barMeta[bi].key);
        bar.events.forEach(function (ev) {
          var prev = previous[ev.voice];
          ev.bar = bi; ev.staff = si; ev.abs = model.barStart[bi] + ev.start;
          (ev.graces || []).forEach(function (g) {
            g.bar = bi; g.staff = si; g.abs = ev.abs;
            g.pitches.forEach(function (p) {
              var k = p.l + ':' + p.o, cur = k in state ? state[k] : keyAlt[p.l];
              p.showAcc = p.a !== cur || p.force ? p.a : null;
              state[k] = p.a;
            });
          });
          if (ev.kind !== 'note') { previous[ev.voice] = ev; return; }
          ev.pitches.forEach(function (p) {
            var cont = prev && prev.tie && prev.kind === 'note' && prev.pitches.some(function (q) { return q.midi === p.midi; });
            p.tiedFrom = !!cont;
            p.tiedFromBar = cont ? prev.bar : null;
            var k = p.l + ':' + p.o;
            var cur = k in state ? state[k] : keyAlt[p.l];
            p.showAcc = (!cont || prev.bar === bi) && (p.a !== cur || p.force) ? p.a : null;
            if (cont && prev.bar !== bi) p.showAcc = null;
            if (!cont || prev.bar === bi) state[k] = p.a;
          });
          previous[ev.voice] = ev;
        });
      });
      // Tie targets: link each tied pitch to the next event that holds it.
      var flat = [];
      st.bars.forEach(function (bar) { flat = flat.concat(bar.events); });
      flat.forEach(function (ev, i) {
        if (!ev.tie || ev.kind !== 'note') return;
        var next = flat.slice(i + 1).find(function (candidate) { return candidate.voice === ev.voice; });
        var holds = function (c) { return c && c.kind === 'note' && ev.pitches.some(function (p) { return c.pitches.some(function (q) { return q.midi === p.midi; }); }); };
        if (!holds(next)) {
          // A tie may pass into another voice on the same staff (a line moving between upper and lower voice).
          var end = ev.abs + ev.dur;
          var other = flat.find(function (c) { return c !== ev && Math.abs(c.abs - end) < EPS && holds(c); });
          if (other) {
            next = other;
            other.pitches.forEach(function (q) {
              if (ev.pitches.some(function (p) { return p.midi === q.midi; })) { q.tiedFrom = true; q.tiedFromBar = ev.bar; if (other.bar !== ev.bar) q.showAcc = null; }
            });
          }
        }
        ev.tieTo = next && next.kind === 'note' ? next : null;
      });
    });
  }

  // Notes to sound, in performance time (repeats unrolled): tied notes merge into one long note.
  // `start` is the performance beat; `written` is the beat in the printed score.
  function playList(model) {
    var out = [], order = model.order || model.barStart.map(function (_, i) { return i; });
    var perfStart = model.perfStart || model.barStart;
    model.staves.forEach(function (st, si) {
      var vel = DYN_VEL.mf;
      order.forEach(function (bi, pos) {
        var off = perfStart[pos] - model.barStart[bi];
        var nextBar = order[pos + 1];
        st.bars[bi].events.forEach(function (ev) {
          if (ev.dyn) vel = DYN_VEL[ev.dyn];
          if (ev.kind !== 'note') return;
          (ev.graces || []).forEach(function (g, gi, all) {
            var lead = Math.min(0.12, 0.5 / all.length);
            g.pitches.forEach(function (p) {
              out.push({ staff: si, start: Math.max(0, ev.abs + off - lead * (all.length - gi)), dur: lead, midi: p.midi, vel: vel * 0.85, grace: true, written: ev.abs });
            });
          });
          ev.pitches.forEach(function (p) {
            // A tie carried in from the bar written before only counts if that bar was just played.
            if (p.tiedFrom && (p.tiedFromBar === ev.bar || pos === 0 || order[pos - 1] === p.tiedFromBar)) return;
            var dur = ev.dur, cur = ev;
            while (cur.tie && cur.tieTo && cur.tieTo.pitches.some(function (q) { return q.midi === p.midi; })) {
              var target = cur.tieTo;
              if (target.bar !== cur.bar && target.bar !== nextBar && target.bar !== bi) break;
              cur = target; dur += cur.dur;
            }
            out.push({ staff: si, start: ev.abs + off, dur: dur, midi: p.midi, vel: vel, fermata: ev.fermata, written: ev.abs });
          });
        });
      });
    });
    // Two voices on one staff striking the same pitch together sound it once, for the longer time.
    var seen = {};
    out = out.filter(function (n) {
      if (n.grace) return true;
      var k = n.staff + ':' + Math.round(n.start * 960) + ':' + n.midi;
      if (seen[k]) { seen[k].dur = Math.max(seen[k].dur, n.dur); return false; }
      seen[k] = n; return true;
    });
    return out.sort(function (a, b) { return a.start - b.start; });
  }

  // Performance beat → printed beat (and back): repeats play some printed bars twice.
  function writtenBeat(model, perf) {
    var order = model.order, ps = model.perfStart, pos = 0;
    for (var k = 0; k < order.length; k++) if (perf >= ps[k] - EPS) pos = k;
    return model.barStart[order[pos]] + Math.max(0, perf - ps[pos]);
  }
  function perfBeat(model, written, after) {
    var bi = model.barStart.reduce(function (at, s, i) { return written >= s - EPS ? i : at; }, 0);
    var hits = [];
    model.order.forEach(function (b, k) { if (b === bi) hits.push(model.perfStart[k] + written - model.barStart[bi]); });
    if (!hits.length) return 0;
    if (after != null) { var later = hits.filter(function (h) { return h >= after - EPS; }); if (later.length) return later[0]; }
    return hits[0];
  }

  // ── Engraving ─────────────────────────────────────────────────────────────
  function stepOf(p, clef) { return p.diatonic - root.MusicNotation.clefs[clef].bottom; }

  function beamUnit(ts) { return ts.den === 8 && ts.num % 3 === 0 ? 1.5 : ts.den === 8 ? 0.5 * ts.num : 1; }

  // Beam groups within one bar of one staff.
  function beamGroups(bar, ts) {
    var unit = beamUnit(ts), groups = [], cur = null;
    bar.events.forEach(function (ev) {
      var beamable = ev.kind === 'note' && ev.base <= 0.5;
      var slot = Math.floor(ev.start / unit + EPS);
      if (beamable && cur && cur.slot === slot) cur.events.push(ev);
      else {
        if (cur) groups.push(cur);
        cur = beamable ? { slot: slot, events: [ev] } : null;
      }
    });
    if (cur) groups.push(cur);
    // In 4/4, four plain eighths across beats 1–2 or 3–4 share a beam.
    if (ts.num === 4 && ts.den === 4) {
      for (var i = 0; i < groups.length - 1; i++) {
        var a = groups[i], b = groups[i + 1];
        var plain = a.events.concat(b.events).every(function (e) { return e.base === 0.5 && !e.dots; });
        if (plain && a.events.length === 2 && b.events.length === 2 && a.slot % 2 === 0 && b.slot === a.slot + 1) {
          groups.splice(i, 2, { slot: a.slot, events: a.events.concat(b.events) });
        }
      }
    }
    return groups.filter(function (g) { return g.events.length > 1; });
  }

  function decideStems(model) {
    model.staves.forEach(function (st) {
      st.bars.forEach(function (bar, bi) {
        bar.events.forEach(function (ev) {
          if (ev.kind !== 'note') return;
          var lo = stepOf(ev.pitches[0], ev.clef || st.clef), hi = stepOf(ev.pitches[ev.pitches.length - 1], ev.clef || st.clef);
          ev.lo = lo; ev.hi = hi;
          // The note farthest from the middle line decides; a tie points the stem down.
          ev.up = ev.stem ? ev.stem === "up" : (4 - lo) > (hi - 4);
          ev.beam = null;
        });
        bar.beams = [];
        st.voices.forEach(function (_, vi) {
          bar.beams = bar.beams.concat(beamGroups({ events: bar.events.filter(function (ev) { return ev.voice === vi; }) }, model.barMeta[bi].ts));
        });
        bar.beams.forEach(function (g) {
          var far = 0;
          g.events.forEach(function (ev) {
            if (Math.abs(ev.hi - 4) > Math.abs(far)) far = ev.hi - 4;
            if (Math.abs(ev.lo - 4) > Math.abs(far)) far = ev.lo - 4;
          });
          var up = g.events[0].stem ? g.events[0].stem === "up" : far < 0;
          g.events.forEach(function (ev) { ev.up = up; ev.beam = g; });
          g.up = up;
        });
      });
    });
  }

  // Column spacing for a gap of `d` quarter-note beats, in staff spaces.
  function gapFor(d) { return 2.1 + 2.7 * Math.pow(Math.max(d, 0.125), 0.6); }

  // Width, in staff spaces, of a key signature change (cancelling naturals plus the new accidentals).
  function keyChangeUnits(from, to) {
    var cancel = (from > 0 && to <= 0) || (from < 0 && to >= 0) ? Math.abs(from) : Math.max(0, Math.abs(from) - Math.abs(to));
    return (cancel * 0.9 + Math.abs(to) * 1.05) + 0.8;
  }
  function graceUnits(ev) {
    return (ev.graces || []).reduce(function (w, g) { return w + 1.15 + (g.pitches.some(function (p) { return p.showAcc !== null; }) ? 0.85 : 0); }, 0);
  }

  function layoutBars(model, S) {
    return model.barStart.map(function (b0, bi) {
      var times = {}, meta = model.barMeta[bi];
      var len = model.staves[0].bars[bi].length;
      // Things printed at the start of a bar, before its first note.
      var lead = 0;
      if (meta.repStart) lead += 1.6;
      if (meta.keyChange) lead += keyChangeUnits(meta.prevKey, meta.key);
      if (meta.timeChange) lead += 2.8;
      if (bi > 0 && model.staves.some(function (st) { return st.bars[bi].clefStart && st.bars[bi].clefStart !== st.clefAt[bi - 1]; })) lead += 2.6;
      model.staves.forEach(function (st) {
        st.bars[bi].events.forEach(function (ev) {
          var c = times[ev.start.toFixed(4)] = times[ev.start.toFixed(4)] || { t: ev.start, acc: 0, seconds: false, events: [], whole: false, grace: 0, clef: false };
          c.events.push(ev);
          if (ev.whole && !ev.hidden) c.whole = true;
          if (ev.clefChange) c.clef = true;
          if (ev.kind === 'note') {
            var n = ev.pitches.filter(function (p) { return p.showAcc !== null; }).length;
            c.acc = Math.max(c.acc, n ? Math.min(3, n) : 0);
            c.grace = Math.max(c.grace, graceUnits(ev));
            for (var i = 1; i < ev.pitches.length; i++) {
              if (ev.pitches[i].diatonic - ev.pitches[i - 1].diatonic === 1) c.seconds = true;
            }
          }
        });
      });
      var cols = Object.keys(times).map(function (k) { return times[k]; }).sort(function (a, b) { return a.t - b.t; });
      var x = 1.4 + lead, widths = [];
      cols.forEach(function (c, i) {
        if (c.clef) x += 2.2;
        x += c.grace;
        c.accW = c.acc ? 1.15 * c.acc + 0.2 : 0;
        x += c.accW;
        c.x = x;
        var next = i + 1 < cols.length ? cols[i + 1].t : len;
        var w = gapFor(next - c.t) + (c.seconds ? 1.1 : 0);
        widths.push(w);
        x += w;
      });
      if (meta.repEnd) x += 1.2;
      var whole = cols.length === 1 && cols[0].whole;
      if (whole) { cols[0].x = 4 + lead; x = 9 + lead + (meta.repEnd ? 1.2 : 0); }
      return { cols: cols, width: Math.max(x + 0.4, 6) * S, natural: x, whole: whole, lead: lead };
    });
  }

  function engrave(model, width) {
    var M = root.MusicNotation;
    var S = width < 520 ? 7.5 : width < 820 ? 8.5 : 9.5;
    var h = S / 2;
    decideStems(model);
    var bars = layoutBars(model, S);
    function keyW(k) { return Math.abs(k) * (k > 0 ? 1.05 : 0.95) * S; }
    var grand = model.staves.length === 2 && model.score.grand !== false;
    var braceW = grand || model.staves.length > 1 ? 1.4 * S : 0;
    var tsDigits = String(model.ts.num).length > String(model.ts.den).length ? String(model.ts.num) : String(model.ts.den);
    var timeW = (tsDigits.length * 1.8 + 1.2) * S;
    var left = 0.5 * S + braceW;
    function headerW(bi) { return 3.6 * S + keyW(model.barMeta[bi].key) + (bi === 0 ? timeW : 0) + 0.6 * S; }
    // A dense single bar must fit even when the requested viewport is narrow.
    // The figure can scroll horizontally; cropping the notes loses music.
    width = Math.max(width, Math.ceil(left + headerW(0) + Math.max.apply(null, bars.map(function (bar) { return bar.width; })) + 2 * S));

    // Sections by bar index (score.sections use printed bar numbers).
    var sectionAt = {};
    (model.score.sections || []).forEach(function (sec) {
      var bi = barIndexOf(model, sec.bar);
      if (bi >= 0) sectionAt[bi] = sec;
    });

    // Break into systems. A new section prefers a fresh line when the current one is well filled.
    var systems = [], cur = null, avail;
    bars.forEach(function (b, bi) {
      var hw = headerW(bi);
      var full = cur && cur.used + b.width > cur.avail + 0.5;
      var sectionBreak = cur && sectionAt[bi] && cur.used > cur.avail * 0.72;
      if (!cur || full || sectionBreak) {
        avail = width - left - hw - 2 * S;
        cur = { bars: [], used: 0, avail: avail, header: hw, first: bi };
        systems.push(cur);
      }
      cur.bars.push(bi); cur.used += b.width;
    });

    // Vertical extents per staff per system, in steps above the bottom line.
    function extents(sys, si) {
      var st = model.staves[si], hi = 8, lo = 0, dyn = false;
      sys.bars.forEach(function (bi) {
        st.bars[bi].events.forEach(function (ev) {
          if (ev.dyn) dyn = true;
          if (ev.hidden) return;
          if (ev.kind !== 'note') {
            hi = Math.max(hi, ev.restStep + 3);
            lo = Math.min(lo, ev.restStep - 3);
            return;
          }
          var orn = ev.orn && ev.orn.some(function (o) { return o === 'tr' || o === 'mord' || o === 'turn'; }) ? 3 : 0;
          hi = Math.max(hi, ev.hi + (ev.up ? 7 : 1) + (ev.fermata ? 4 : 0) + orn + (ev.tupletStart ? 3 : 0));
          lo = Math.min(lo, ev.lo - (ev.up ? 1 : 7) - (ev.tupletStart && !ev.up ? 3 : 0));
        });
      });
      return { hi: hi + 1, lo: lo - 1 - (dyn ? 5 : 0) };
    }

    var out = [], hl = [], y = 0, evIndex = 0;
    var ink = 'currentColor';
    var lineW = Math.max(1, 0.11 * S);
    var allEvents = [];
    var tupletDraws = [];

    function keySig(k, x, b, clef) {
      var s = '', pos = M.clefs[clef][k > 0 ? 'sharp' : 'flat'];
      for (var i = 0; i < Math.abs(k); i++) { s += M.accidental(k > 0 ? 1 : -1, x, b - pos[i] * h, S); x += (k > 0 ? 1.05 : 0.95) * S; }
      return s;
    }
    function keyChange(from, to, x, b, clef) {
      var s = '', cancel = 0, kind = from > 0 ? 'sharp' : 'flat';
      if ((from > 0 && to <= 0) || (from < 0 && to >= 0)) cancel = Math.abs(from);
      else cancel = Math.max(0, Math.abs(from) - Math.abs(to));
      var pos = M.clefs[clef][kind], startAt = Math.abs(from) - cancel;
      if ((from > 0 && to <= 0) || (from < 0 && to >= 0)) startAt = 0;
      for (var i = startAt; i < startAt + cancel; i++) { s += M.accidental(0, x, b - pos[i] * h, S); x += 0.9 * S; }
      return s + keySig(to, x + 0.2 * S, b, clef);
    }
    function timeSigAt(ts, x, b) {
      var s = '';
      var dw = function (str) { return str.split('').reduce(function (a, d) { return a + [470, 334, 446, 421, 470, 403, 434, 441, 436, 434][+d] / 250 * S; }, 0); };
      var wn = dw(String(ts.num)), wd = dw(String(ts.den)), wmax = Math.max(wn, wd);
      [[String(ts.num), 6, wn], [String(ts.den), 2, wd]].forEach(function (row) {
        var dx = x + (wmax - row[2]) / 2;
        row[0].split('').forEach(function (d) {
          s += M.glyph('timeSig' + d, dx, b - row[1] * h, S);
          dx += [470, 334, 446, 421, 470, 403, 434, 441, 436, 434][+d] / 250 * S;
        });
      });
      return s;
    }
    function smallClef(name, x, b) {
      var c = M.clefs[name];
      return M.glyph(name, x, b - c.anchor * h, 2 * h * 0.72);
    }
    // Repeat barlines: a thick and a thin line with two dots on the inside.
    function repeatSign(x, dir, ranges) {
      var s = '';
      ranges.forEach(function (r) {
        var thick = dir > 0 ? x : x - 0.5 * S, thin = dir > 0 ? x + 0.85 * S : x - 0.85 * S;
        s += '<rect x="' + thick + '" y="' + r[0] + '" width="' + (0.5 * S) + '" height="' + (r[1] - r[0]) + '" fill="currentColor"/>';
        s += '<line x1="' + thin + '" x2="' + thin + '" y1="' + r[0] + '" y2="' + r[1] + '" stroke="currentColor" stroke-width="' + lineW * 1.4 + '"/>';
      });
      return s;
    }
    function repeatDots(x, bottoms) {
      return bottoms.map(function (b) {
        return '<circle cx="' + x + '" cy="' + (b - 3 * h) + '" r="' + 0.24 * S + '" fill="currentColor"/>' +
          '<circle cx="' + x + '" cy="' + (b - 5 * h) + '" r="' + 0.24 * S + '" fill="currentColor"/>';
      }).join('');
    }

    systems.forEach(function (sys, sIndex) {
      var stretch = sys.avail / sys.used;
      var last = sIndex === systems.length - 1;
      if (last && stretch > 1.45) stretch = 1;
      if (stretch < 1) stretch = 1;
      var ext = model.staves.map(function (_, si) { return extents(sys, si); });
      var hasAbove = sys.bars.some(function (bi) { return model.barMeta[bi].volta || sectionAt[bi]; });
      var bottoms = [];
      var top = y + (sIndex === 0 && model.score.tempoText ? 2.4 * S : 0.6 * S) + (hasAbove ? 2.6 * S : 0);
      model.staves.forEach(function (st, si) {
        var above = Math.max(8, ext[si].hi) * h;
        var below = Math.max(0, -ext[si].lo) * h;
        var gapAbove = si === 0 ? above : Math.max(above, 2.5 * S);
        var bottom = top + gapAbove;
        bottoms.push(bottom);
        // Piano staves sit close; ensemble staves need clear air between parts.
        top = bottom + below + (si < model.staves.length - 1 ? (grand ? 1.2 : 3.4) * S : 0);
      });
      var sysTop = bottoms[0] - 8 * h, sysBottom = bottoms[bottoms.length - 1];
      var aboveY = sysTop - Math.max(0, ext[0].hi - 9) * h - 1.4 * S;
      var x0 = left, x1 = left + sys.header + sys.bars.reduce(function (s, bi) { return s + bars[bi].width * stretch; }, 0);
      if (!last || stretch > 1) x1 = Math.min(x1, width - 1.5 * S);
      var sysKey = model.barMeta[sys.first].key;
      var barRanges = grand ? [[sysTop, sysBottom]] : bottoms.map(function (bb) { return [bb - 8 * h, bb]; });

      // Staff lines, clefs, key and time signatures.
      model.staves.forEach(function (st, si) {
        var b = bottoms[si], clef = st.clefAt[sys.first];
        for (var l = 0; l < 5; l++) out.push('<line x1="' + x0 + '" x2="' + x1 + '" y1="' + (b - l * S) + '" y2="' + (b - l * S) + '" stroke="' + ink + '" stroke-width="' + lineW + '" class="se-line"/>');
        out.push(M.clef(clef, x0 + 0.7 * S, b, h));
        out.push(keySig(sysKey, x0 + 3.6 * S, b, clef));
        if (sys.first === 0) out.push(timeSigAt(model.ts, x0 + 3.6 * S + keyW(sysKey) + 0.5 * S, b));
      });
      if (model.staves.length > 1) {
        var bx = x0 - 0.2 * S;
        if (grand) {
          var hgt = sysBottom - sysTop;
          var sxB = Math.min(hgt / 1000, 3.2 * S / 250);
          out.push('<g class="mn-glyph" transform="translate(' + (bx - 70 * sxB - 0.35 * S) + ' ' + sysBottom + ') scale(' + sxB + ' ' + (-hgt / 1000) + ')"><path d="' + braceGlyph() + '" fill="currentColor"/></g>');
        } else {
          out.push('<rect x="' + (bx - 0.9 * S) + '" y="' + (sysTop - 0.5 * S) + '" width="' + (0.5 * S) + '" height="' + (sysBottom - sysTop + S) + '" fill="currentColor"/>');
        }
      }
      out.push('<line x1="' + x0 + '" x2="' + x0 + '" y1="' + sysTop + '" y2="' + sysBottom + '" stroke="' + ink + '" stroke-width="' + lineW + '"/>');
      if (sIndex === 0 && model.score.tempoText) {
        out.push('<text class="se-tempo" x="' + (x0 + 3.6 * S) + '" y="' + (aboveY - (hasAbove ? 2.4 * S : 0)) + '" font-size="' + (1.45 * S) + '">' + M.escape(model.score.tempoText) + '</text>');
      }
      var firstBarNo = barNumber(model, sys.bars[0]);
      if (firstBarNo > 1) out.push('<text class="se-barno" x="' + (x0 + 0.2 * S) + '" y="' + (sysTop - 1.0 * S - Math.max(0, ext[0].hi - 9) * h) + '" font-size="' + (1.1 * S) + '">' + firstBarNo + '</text>');

      var bx0 = x0 + sys.header;
      var sysCols = [];
      var volta = null;
      sys.bars.forEach(function (bi, k) {
        var bar = bars[bi], bw = bar.width * stretch, meta = model.barMeta[bi];
        out.push('<rect class="se-measure" data-measure="' + bi + '" x="' + bx0 + '" y="' + (sysTop - S) + '" width="' + bw + '" height="' + (sysBottom - sysTop + 2 * S) + '"/>');
        // Start-of-bar marks: repeat sign, key and time changes, clef changes.
        var lx = bx0 + 0.3 * S;
        if (meta.repStart) {
          out.push(repeatSign(lx - 0.3 * S + (k === 0 ? 0.4 * S : 0), 1, barRanges));
          out.push(repeatDots(lx + 1.15 * S + (k === 0 ? 0.4 * S : 0), bottoms));
          lx += 1.6 * S;
        }
        if (meta.keyChange) {
          if (k > 0) model.staves.forEach(function (st, si) { out.push(keyChange(meta.prevKey, meta.key, lx, bottoms[si], st.clefAt[bi])); });
          lx += keyChangeUnits(meta.prevKey, meta.key) * S;
        }
        if (meta.timeChange) { model.staves.forEach(function (st, si) { out.push(timeSigAt(meta.ts, lx + 0.3 * S, bottoms[si])); }); lx += 2.8 * S; }
        if (bi > 0 && k > 0) model.staves.forEach(function (st, si) {
          if (st.bars[bi].clefStart && st.bars[bi].clefStart !== st.clefAt[bi - 1]) out.push(smallClef(st.bars[bi].clefStart, lx + 0.2 * S, bottoms[si]));
        });
        // Endings (voltas) and section labels above the top staff.
        if (meta.volta) {
          if (!volta || volta.label !== meta.volta) {
            volta = { label: meta.volta, x: bx0 + 0.2 * S };
            out.push('<line x1="' + volta.x + '" x2="' + volta.x + '" y1="' + aboveY + '" y2="' + (aboveY + 1.6 * S) + '" stroke="currentColor" stroke-width="' + lineW + '"/>');
            out.push('<text class="se-volta" x="' + (volta.x + 0.5 * S) + '" y="' + (aboveY + 1.4 * S) + '" font-size="' + (1.15 * S) + '">' + meta.volta.replace('.', ', ') + '.</text>');
          }
          var endsHere = meta.repEnd || k === sys.bars.length - 1 || !model.barMeta[bi + 1] || model.barMeta[bi + 1].volta !== meta.volta;
          var xa = Math.max(volta.x, bx0), xb = bx0 + bw - 0.3 * S;
          out.push('<line x1="' + xa + '" x2="' + xb + '" y1="' + aboveY + '" y2="' + aboveY + '" stroke="currentColor" stroke-width="' + lineW + '"/>');
          if (endsHere && meta.repEnd) out.push('<line x1="' + xb + '" x2="' + xb + '" y1="' + aboveY + '" y2="' + (aboveY + 1.6 * S) + '" stroke="currentColor" stroke-width="' + lineW + '"/>');
          if (endsHere) volta = null;
        } else volta = null;
        if (sectionAt[bi]) {
          var lab = String(sectionAt[bi].label || '');
          var tw = Math.max(1.6, lab.length * 0.78 + 0.9) * S;
          var sy = aboveY - (meta.volta ? 2.2 * S : 0) - 0.6 * S;
          out.push('<g class="se-section"><rect x="' + (bx0 + 0.1 * S) + '" y="' + (sy - 1.35 * S) + '" width="' + tw + '" height="' + (1.75 * S) + '" rx="' + (0.25 * S) + '" fill="none" stroke="currentColor" stroke-width="' + lineW + '"/>' +
            '<text x="' + (bx0 + 0.1 * S + tw / 2) + '" y="' + (sy - 0.05 * S) + '" font-size="' + (1.2 * S) + '" text-anchor="middle">' + M.escape(lab) + '</text></g>');
        }
        var sx = function (u) { return bx0 + (bar.whole ? bw * 0.5 - 0.9 * S : u * S * stretch); };
        bar.cols.forEach(function (c) { c.px = sx(c.x); sysCols.push({ t: model.barStart[bi] + c.t, x: c.px, sys: sIndex }); });
        model.staves.forEach(function (st, si) {
          var b = bottoms[si];
          var barModel = st.bars[bi];
          barModel.events.forEach(function (ev) {
            var col = bar.cols.find(function (c) { return Math.abs(c.t - ev.start) < EPS; });
            ev.x = ev.whole ? bx0 + bw / 2 - 0.7 * S : col.px;
            ev.accW = col ? col.accW : 0;
            ev.bottom = b; ev.sys = sIndex; ev.sysEnd = x1; ev.sysStart = bx0;
            ev.i = evIndex++;
            allEvents.push(ev);
          });
          // Beams first, so stems know where to stop.
          barModel.beams.forEach(function (g) { placeBeam(g, st.clef, b, S, h); });
          barModel.events.forEach(function (ev) { out.push(drawEvent(ev, ev.clef || st.clef, b, S, h, model)); });
          barModel.beams.forEach(function (g) { out.push(drawBeam(g, S)); });
          barModel.events.forEach(function (ev) { if (ev.tupletStart) tupletDraws.push(ev.tupletStart); });
        });
        var xe = bx0 + bw;
        var final = bi === model.count - 1;
        // An excerpt that stops mid-piece ("ending": "open") ends on a plain barline.
        if (meta.repEnd) {
          out.push(repeatDots(xe - 1.85 * S, bottoms));
          out.push(repeatSign(xe, -1, barRanges));
        } else if (final && model.score.ending !== 'open') {
          out.push('<line x1="' + (xe - 0.75 * S) + '" x2="' + (xe - 0.75 * S) + '" y1="' + sysTop + '" y2="' + sysBottom + '" stroke="' + ink + '" stroke-width="' + lineW * 1.4 + '"/>');
          out.push('<rect x="' + (xe - 0.5 * S) + '" y="' + sysTop + '" width="' + (0.5 * S) + '" height="' + (sysBottom - sysTop) + '" fill="currentColor"/>');
        } else {
          barRanges.forEach(function (r) {
            out.push('<line x1="' + xe + '" x2="' + xe + '" y1="' + r[0] + '" y2="' + r[1] + '" stroke="' + ink + '" stroke-width="' + lineW * 1.4 + '"/>');
          });
          if (!grand && model.staves.length > 1) out.push('<line x1="' + xe + '" x2="' + xe + '" y1="' + sysTop + '" y2="' + sysBottom + '" stroke="' + ink + '" stroke-width="' + lineW * 1.4 + '"/>');
        }
        sysCols.push({ t: model.barStart[bi] + model.staves[0].bars[bi].length, x: xe - 0.6 * S, sys: sIndex, barEnd: true });
        bx0 = xe;
      });
      hl.push({ top: sysTop - 1.5 * S, bottom: sysBottom + 1.5 * S, cols: sysCols });
      y = sysBottom + Math.max(0, -ext[ext.length - 1].lo) * h + 2.2 * S;
    });

    // Ties need every event placed first (they can cross bars and systems).
    allEvents.forEach(function (ev) { if (ev.tie && ev.tieTo) out.push(drawTie(ev, S, h, model)); });
    tupletDraws.forEach(function (tp) { out.push(drawTuplet(tp, S, h)); });

    var height = Math.ceil(y + S);
    return { svg: out.join(''), height: height, width: width, systems: hl, events: allEvents, S: S };
  }

  // Tuplet number centred over (or under) its notes.
  function drawTuplet(tp, S, h) {
    var evs = tp.events.filter(function (e) { return e.x != null; });
    if (!evs.length) return '';
    var notes = evs.filter(function (e) { return e.kind === 'note'; });
    var up = notes.length ? notes[0].up : true;
    var xa = evs[0].x, xb = evs[evs.length - 1].x + (evs[evs.length - 1].headW || 1.2 * S);
    var y;
    if (up) {
      y = Math.min.apply(null, evs.map(function (e) { return e.kind === 'note' ? Math.min(e.tipY != null ? e.tipY : e.bottom - e.hi * h, e.bottom - e.hi * h) : e.bottom - 8 * h; })) - 0.7 * S;
    } else {
      y = Math.max.apply(null, evs.map(function (e) { return e.kind === 'note' ? Math.max(e.tipY != null ? e.tipY : e.bottom - e.lo * h, e.bottom - e.lo * h) : e.bottom; })) + 1.6 * S;
    }
    return '<text class="se-tuplet" x="' + ((xa + xb) / 2) + '" y="' + y + '" font-size="' + (1.15 * S) + '" text-anchor="middle">' + tp.n + '</text>';
  }

  var BRACE = null;
  function braceGlyph() {
    if (!BRACE) {
      var g = root.MusicNotation.glyph('brace', 0, 0, 250);
      BRACE = /d="([^"]+)"/.exec(g)[1];
    }
    return BRACE;
  }

  function headName(ev) { return ev.base >= 4 ? 'whole' : ev.base >= 2 ? 'half' : 'quarter'; }
  function headW(ev, S) { return (ev.base >= 4 ? 426 : 295) / 250 * S; }
  function durationLabel(ev) {
    if (ev.whole || ev.base >= 4) return 'whole note';
    var name = ev.base >= 2 ? 'half' : ev.base >= 1 ? 'quarter' : ev.base >= 0.5 ? 'eighth' : ev.base >= 0.25 ? 'sixteenth' : 'thirty-second';
    return name + (ev.dots ? ' dotted' : '') + ' note';
  }
  function eventLabel(ev, model) {
    var bar = model.pickup && ev.bar === 0 ? 'pickup' : 'bar ' + barNumber(model, ev.bar);
    var at = 'beat ' + Math.round((ev.start + 1) * 100) / 100;
    var name = function (p) { return root.MusicNotation.pitchName(p); };
    var pitches = ev.kind === 'rest' ? 'rest' : ev.pitches.map(name).join(' plus ');
    var extra = (ev.tuplet ? ', in a group of ' + ev.tuplet.n : '') +
      (ev.graces ? ', after grace note ' + ev.graces.map(function (g) { return g.pitches.map(name).join(' plus '); }).join(' and ') : '') +
      (ev.orn ? ', ' + ev.orn.map(function (o) { return { tr: 'trill', mord: 'mordent', turn: 'turn', '.': 'staccato', '>': 'accent', '-': 'tenuto' }[o]; }).join(', ') : '');
    return pitches + ', ' + durationLabel(ev) + ', ' + bar + ', ' + at + extra;
  }

  // Stem tip y for an unbeamed note.
  function stemTip(ev, b, S, h) {
    var y = ev.up ? b - ev.hi * h - 3.5 * S : b - ev.lo * h + 3.5 * S;
    // Notes far outside the staff stretch their stem back to the middle line.
    if (ev.up && y > b - 4 * h) y = b - 4 * h;
    if (!ev.up && y < b - 4 * h) y = b - 4 * h;
    return y;
  }

  function placeBeam(g, clef, b, S, h) {
    var evs = g.events, first = evs[0], last = evs[evs.length - 1];
    var dx = last.x - first.x || 1;
    var levels = evs.some(function (e) { return e.base <= 0.25; }) ? (evs.some(function (e) { return e.base <= 0.125; }) ? 3 : 2) : 1;
    var minStem = levels >= 2 ? 3.0 * S + (levels - 2) * 0.75 * S : 2.75 * S;
    var noteY = function (e) { return g.up ? b - e.hi * h : b - e.lo * h; };
    var ya = noteY(first) + (g.up ? -3.5 : 3.5) * S, yb = noteY(last) + (g.up ? -3.5 : 3.5) * S;
    var slope = Math.max(-0.18, Math.min(0.18, (yb - ya) / dx));
    var mono = true;
    for (var i = 1; i < evs.length; i++) {
      var d = noteY(evs[i]) - noteY(evs[i - 1]);
      if (i > 1 && Math.sign(d) !== Math.sign(noteY(evs[1]) - noteY(evs[0]))) mono = false;
    }
    if (!mono || Math.abs(noteY(last) - noteY(first)) < h * 0.5) slope = 0;
    var x0 = stemX(first, S), x1s = stemX(last, S);
    var offset = 0;
    evs.forEach(function (e) {
      var by = ya + slope * (stemX(e, S) - x0);
      var need = g.up ? (noteY(e) - minStem) - by : by - (noteY(e) + minStem);
      if (need < 0) offset = g.up ? Math.min(offset, need) : Math.max(offset, -need);
    });
    var base = ya + offset;
    g.at = function (x) { return base + slope * (x - x0); };
    g.x0 = x0; g.x1 = x1s; g.levels = levels;
  }

  function stemX(ev, S) {
    var w = headW(ev, S);
    return ev.up ? ev.x + w - 0.06 * S : ev.x + 0.06 * S;
  }

  function drawBeam(g, S) {
    var t = 0.5 * S, gap = 0.75 * S, dir = g.up ? 1 : -1, out = '';
    function bar(xa, xb, lvl) {
      var ya = g.at(xa) + dir * gap * lvl, yb = g.at(xb) + dir * gap * lvl;
      return '<path class="se-beam" d="M' + xa + ' ' + ya + 'L' + xb + ' ' + yb + 'L' + xb + ' ' + (yb + dir * t) + 'L' + xa + ' ' + (ya + dir * t) + 'Z" fill="currentColor"/>';
    }
    out += bar(g.x0, g.x1, 0);
    var evs = g.events;
    [0.25, 0.125].forEach(function (lim, li) {
      for (var i = 0; i < evs.length; i++) {
        if (evs[i].base > lim) continue;
        var j = i;
        while (j + 1 < evs.length && evs[j + 1].base <= lim) j++;
        if (j > i) out += bar(stemX(evs[i], S), stemX(evs[j], S), li + 1);
        else {
          var sx = stemX(evs[i], S), toLeft = i > 0 && (i === evs.length - 1 || evs[i - 1].base > evs[i].base);
          out += toLeft ? bar(sx - 1.1 * S, sx, li + 1) : bar(sx, sx + 1.1 * S, li + 1);
        }
        i = j;
      }
    });
    return out;
  }

  function dynamicGlyphs(text, x, y, S) {
    var M = root.MusicNotation, adv = { p: 365, m: 437, f: 364 }, names = { p: 'dynamicPiano', m: 'dynamicMezzo', f: 'dynamicForte' };
    var out = '', dx = x;
    text.split('').forEach(function (c) { out += M.glyph(names[c], dx, y, S); dx += adv[c] / 250 * S * 0.92; });
    return out;
  }

  // Grace notes: small heads with slashed stems, left of the main note (and its accidentals).
  function drawGraces(ev, clef, b, S, h) {
    var M = root.MusicNotation, out = '', gs = 0.66 * S, gx = ev.x - (ev.accW || 0) * S - graceUnits(ev) * S;
    ev.graces.forEach(function (g) {
      var accs = g.pitches.filter(function (p) { return p.showAcc !== null; });
      if (accs.length) gx += 0.85 * S;
      var steps = g.pitches.map(function (p) { return stepOf(p, clef); });
      accs.forEach(function (p) { out += M.accidental(p.showAcc, gx - 0.8 * S, b - stepOf(p, clef) * h, gs); });
      steps.forEach(function (st) {
        M.ledgerSteps(st).forEach(function (ls) { out += '<line x1="' + (gx - 0.25 * S) + '" x2="' + (gx + 1.0 * S) + '" y1="' + (b - ls * h) + '" y2="' + (b - ls * h) + '" stroke="currentColor" stroke-width="' + 0.12 * S + '"/>'; });
        out += M.glyph('quarter', gx, b - st * h, gs);
      });
      var hiY = b - Math.max.apply(null, steps) * h, loY = b - Math.min.apply(null, steps) * h;
      var sx = gx + 295 / 250 * gs - 0.04 * S, tip = hiY - 2.5 * S;
      out += '<line x1="' + sx + '" x2="' + sx + '" y1="' + loY + '" y2="' + tip + '" stroke="currentColor" stroke-width="' + 0.09 * S + '"/>';
      if (g.base <= 0.5) out += M.glyph('flag8Up', sx - 0.04 * S, tip, gs);
      if (g.base <= 0.25) out += M.glyph('flag8Up', sx - 0.04 * S, tip + 0.75 * S, gs);
      out += '<line x1="' + (sx - 0.55 * S) + '" x2="' + (sx + 0.75 * S) + '" y1="' + (tip + 1.7 * S) + '" y2="' + (tip + 0.6 * S) + '" stroke="currentColor" stroke-width="' + 0.09 * S + '"/>';
      gx += 1.15 * S;
    });
    return '<g class="se-grace">' + out + '</g>';
  }

  // Ornaments above the note; articulations next to the head, away from the stem.
  function drawOrnaments(ev, b, S, h) {
    var out = '', cx = ev.x + (ev.headW || 1.2 * S) / 2;
    var top = Math.min(b - 9 * h, ev.kind === 'note' ? Math.min(b - ev.hi * h - 1.4 * S, ev.up && ev.tipY != null ? ev.tipY - 0.8 * S : Infinity) : Infinity);
    if (ev.fermata) top -= 2 * S;
    ev.orn.forEach(function (o) {
      if (o === 'tr') { out += '<text class="se-orn" x="' + cx + '" y="' + top + '" font-size="' + (1.35 * S) + '" text-anchor="middle">tr</text>'; top -= 1.6 * S; }
      else if (o === 'mord' || o === 'turn') {
        var w = 1.0 * S, yy = top - 0.4 * S;
        out += o === 'mord'
          ? '<path d="M' + (cx - w) + ' ' + yy + 'l' + (w / 2) + ' ' + (-0.6 * S) + 'l' + (w / 2) + ' ' + (0.6 * S) + 'l' + (w / 2) + ' ' + (-0.6 * S) + 'l' + (w / 2) + ' ' + (0.6 * S) + '" fill="none" stroke="currentColor" stroke-width="' + 0.16 * S + '"/><line x1="' + cx + '" x2="' + cx + '" y1="' + (yy - 0.9 * S) + '" y2="' + (yy + 0.3 * S) + '" stroke="currentColor" stroke-width="' + 0.12 * S + '"/>'
          : '<path d="M' + (cx - w) + ' ' + yy + 'c' + (0.2 * S) + ' ' + (-0.9 * S) + ' ' + (0.9 * S) + ' ' + (-0.6 * S) + ' ' + w + ' 0s' + (0.8 * S) + ' ' + (0.6 * S) + ' ' + w + ' 0" fill="none" stroke="currentColor" stroke-width="' + 0.16 * S + '"/>';
        top -= 1.6 * S;
      } else if (ev.kind === 'note') {
        var below = ev.up, hy = below ? b - ev.lo * h + 1.3 * S : b - ev.hi * h - 1.3 * S;
        if (o === '.') out += '<circle cx="' + cx + '" cy="' + hy + '" r="' + 0.2 * S + '" fill="currentColor"/>';
        else if (o === '-') out += '<line x1="' + (cx - 0.6 * S) + '" x2="' + (cx + 0.6 * S) + '" y1="' + hy + '" y2="' + hy + '" stroke="currentColor" stroke-width="' + 0.16 * S + '"/>';
        else if (o === '>') out += '<path d="M' + (cx - 0.7 * S) + ' ' + (hy - 0.4 * S) + 'L' + (cx + 0.7 * S) + ' ' + hy + 'L' + (cx - 0.7 * S) + ' ' + (hy + 0.4 * S) + '" fill="none" stroke="currentColor" stroke-width="' + 0.14 * S + '"/>';
      }
    });
    return out;
  }

  function drawEvent(ev, clef, b, S, h, model) {
    var M = root.MusicNotation;
    var out = '<g class="se-ev" data-i="' + ev.i + '">';
    var lw = 0.12 * S;
    if (ev.clefChange) {
      var cx0 = ev.x - ((ev.accW || 0) + graceUnits(ev) + 2.2) * S + 0.1 * S;
      out += '<g class="se-clef-change">' + M.glyph(ev.clefChange, cx0, b - M.clefs[ev.clefChange].anchor * h, 2 * h * 0.72) + '</g>';
    }
    if (ev.graces) out += drawGraces(ev, clef, b, S, h);
    if (ev.hidden) { ev.headX = ev.x; ev.headY = b - 4 * h; return out + '</g>'; }
    if (ev.kind === 'rest') {
      var mid = b - ev.restStep * h;
      if (ev.whole || ev.base >= 4) out += M.glyph('restWhole', ev.x, b - 6 * h, S);
      else if (ev.base >= 2) out += M.glyph('restHalf', ev.x, mid, S);
      else out += M.glyph(ev.base >= 1 ? 'restQuarter' : ev.base >= 0.5 ? 'rest8' : 'rest16', ev.x, mid, S);
      if (ev.dots) out += '<circle cx="' + (ev.x + 1.6 * S) + '" cy="' + (mid - h) + '" r="' + 0.18 * S + '" fill="currentColor"/>';
      ev.headX = ev.x; ev.headY = mid;
    } else {
      var w = headW(ev, S), name = headName(ev);
      // Heads: seconds in a chord sit on the far side of the stem.
      var ps = ev.pitches.slice(), shifted = {};
      if (ev.up) {
        for (var i = 1; i < ps.length; i++) if (ps[i].diatonic - ps[i - 1].diatonic === 1 && !shifted[i - 1]) shifted[i] = 1;
      } else {
        for (var j = ps.length - 2; j >= 0; j--) if (ps[j + 1].diatonic - ps[j].diatonic === 1 && !shifted[j + 1]) shifted[j] = -1;
      }
      // Ledger lines.
      var steps = ps.map(function (p) { return stepOf(p, clef); });
      var ledg = {};
      steps.forEach(function (s, k) {
        M.ledgerSteps(s).forEach(function (ls) {
          var xx = ev.x + (shifted[k] || 0) * (w - lw);
          ledg[ls] = ledg[ls] ? [Math.min(ledg[ls][0], xx), Math.max(ledg[ls][1], xx)] : [xx, xx];
        });
      });
      Object.keys(ledg).forEach(function (ls) {
        var yy = b - ls * h;
        out += '<line x1="' + (ledg[ls][0] - 0.4 * S) + '" x2="' + (ledg[ls][1] + w + 0.4 * S) + '" y1="' + yy + '" y2="' + yy + '" stroke="currentColor" stroke-width="' + 0.16 * S + '"/>';
      });
      // Accidentals, stacked into columns so they never collide.
      var accCols = [];
      var accLeft = ev.x - 0.3 * S - (Object.keys(shifted).some(function (k) { return shifted[k] < 0; }) ? w : 0);
      for (var a = ps.length - 1; a >= 0; a--) {
        if (ps[a].showAcc === null) continue;
        var col = 0;
        while (accCols[col] && accCols[col].some(function (s) { return Math.abs(s - steps[a]) < 6; })) col++;
        (accCols[col] = accCols[col] || []).push(steps[a]);
        var aw = ps[a].showAcc === 0 ? 0.68 : ps[a].showAcc < 0 ? 0.9 : 1.0;
        out += M.accidental(ps[a].showAcc, accLeft - aw * S - col * 1.15 * S, b - steps[a] * h, S);
      }
      ps.forEach(function (p, k) {
        var px = ev.x + (shifted[k] || 0) * (w - lw), py = b - steps[k] * h;
        // Use the shared written-pitch palette; accidentals retain their letter's color.
        out += '<g class="se-notehead"' + (M.preferences.noteColors ? ' style="color:' + M.solfegeColor(p) + '"' : '') + '>' +
          M.glyph(name, px, py, S, 'se-head') + '</g>';
        if (M.preferences.pitchNames) {
          var label = M.pitchName(p);
          // Glyph origins are at the left edge. Size labels in staff units, including
          // accidentals, so they stay inside heads at every staff/zoom size.
          var labelSize = S * (p.a ? 0.46 : 0.72);
          out += '<text class="se-pitch-label" data-contrast-guard-skip x="' + (px + w / 2) + '" y="' + py +
            '" style="font-size:' + labelSize + 'px;stroke-width:' + (S * 0.07) + 'px" text-anchor="middle" dominant-baseline="central">' + M.escape(label) + '</text>';
        }
      });
      // Dots.
      if (ev.dots) {
        var dotX = ev.x + w + 0.5 * S + (Object.keys(shifted).some(function (k) { return shifted[k] > 0; }) ? w : 0);
        var used = {};
        steps.forEach(function (s) {
          var ds = s % 2 === 0 ? s + 1 : s;
          if (used[ds]) return;
          used[ds] = 1;
          for (var d = 0; d < ev.dots; d++) out += '<circle cx="' + (dotX + d * 0.55 * S) + '" cy="' + (b - ds * h) + '" r="' + 0.18 * S + '" fill="currentColor"/>';
        });
      }
      // Stem and flag.
      if (ev.base < 4) {
        var sx = stemX(ev, S);
        var from = ev.up ? b - ev.lo * h : b - ev.hi * h;
        var tip = ev.beam ? ev.beam.at(sx) : stemTip(ev, b, S, h);
        out += '<line class="se-stem" x1="' + sx + '" x2="' + sx + '" y1="' + from + '" y2="' + tip + '" stroke="currentColor" stroke-width="' + lw + '"/>';
        if (!ev.beam && ev.base <= 0.5) {
          var fl = ev.base <= 0.125 ? '16' : ev.base <= 0.25 ? '16' : '8';
          out += M.glyph('flag' + fl + (ev.up ? 'Up' : 'Down'), sx - (ev.up ? 0.06 * S : 0.06 * S), tip, S);
          if (ev.base <= 0.125) out += M.glyph('flag8' + (ev.up ? 'Up' : 'Down'), sx - 0.06 * S, tip + (ev.up ? 1.5 : -1.5) * S, S);
        }
        ev.tipY = tip;
      }
      ev.headX = ev.x; ev.headW = w; ev.steps = steps; ev.shifted = shifted;
    }
    if (ev.fermata) {
      var fy = Math.min(b - 10 * h, ev.kind === 'note' ? Math.min(b - ev.hi * h - 1.6 * S, ev.up && ev.tipY != null ? ev.tipY - 0.8 * S : Infinity) : Infinity);
      out += M.glyph('fermataAbove', ev.x + (ev.headW || 1.2 * S) / 2 - 1.2 * S, fy, S);
    }
    if (ev.orn) out += drawOrnaments(ev, b, S, h);
    if (ev.dyn) {
      var lowest = ev.kind === 'note' ? Math.max(b + 2.4 * S, b - ev.lo * h + (ev.up ? 2.2 : 4.6) * S) : b + 2.4 * S;
      out += dynamicGlyphs(ev.dyn, ev.x - 0.2 * S, lowest, S);
    }
    return out + '</g>';
  }

  function drawTie(ev, S, h) {
    var next = ev.tieTo, out = '';
    ev.pitches.forEach(function (p, k) {
      var k2 = next.pitches.findIndex(function (q) { return q.midi === p.midi; });
      if (k2 < 0) return;
      var y1 = ev.bottom - ev.steps[k] * h;
      var below = ev.stem ? ev.stem === "down" : ev.pitches.length > 1 ? k < ev.pitches.length / 2 : ev.up;
      var dir = below ? 1 : -1;
      var xa = ev.headX + ev.headW + 0.15 * S;
      var segs = [];
      if (next.sys === ev.sys) segs.push([xa, next.headX - 0.15 * S]);
      else { segs.push([xa, ev.sysEnd - 0.3 * S]); segs.push([next.sysStart - 1.2 * S, next.headX - 0.15 * S, next]); }
      segs.forEach(function (sg) {
        var yy = sg[2] ? next.bottom - next.steps[k2] * h : y1;
        var x0 = sg[0], x1 = sg[1], dy = dir * (0.55 * S + 0.04 * (x1 - x0)), oy = dir * 0.6 * S;
        var th = 0.18 * S;
        out += '<path class="se-tie" d="M' + x0 + ' ' + (yy + oy) + 'C' + (x0 + (x1 - x0) * 0.25) + ' ' + (yy + oy + dy) + ' ' + (x0 + (x1 - x0) * 0.75) + ' ' + (yy + oy + dy) + ' ' + x1 + ' ' + (yy + oy) +
          'C' + (x0 + (x1 - x0) * 0.75) + ' ' + (yy + oy + dy - dir * th) + ' ' + (x0 + (x1 - x0) * 0.25) + ' ' + (yy + oy + dy - dir * th) + ' ' + x0 + ' ' + (yy + oy) + 'Z" fill="currentColor"/>';
      });
    });
    return out;
  }

  // ── Playback ──────────────────────────────────────────────────────────────
  var audio = { ctx: null, out: null };
  function context() {
    var kit = root.AudioKit;
    if (!audio.ctx) {
      // 'playback' = bigger hardware buffers: a score is not latency-critical, and iPad Safari glitches at the default.
      if (kit) audio.ctx = kit.context({ latencyHint: 'playback' });
      else { var AC = root.AudioContext || root.webkitAudioContext; audio.ctx = new AC(); }
      var comp = audio.ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 3;
      audio.out = audio.ctx.createGain();
      audio.out.gain.value = 0.9;
      audio.out.connect(comp); comp.connect(kit ? kit.output() : audio.ctx.destination);
      if (kit) kit.onStop(function () { players.forEach(function (p) { if (p.playing) p.pause(); }); });
    }
    if (kit) kit.resume();
    else if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return audio.ctx;
  }

  var players = [];

  function Player(fig, model) {
    this.fig = fig; this.model = model;
    this.notes = playList(model);
    var sc = model.score;
    var unit = { '2': 2, '4': 1, '4.': 1.5, '8': 0.5, '8.': 0.75, '2.': 3 }[sc.tempoUnit || '4'] || 1;
    this.baseQpm = (sc.tempo || 90) * unit;
    this.rate = 1; this.pos = 0; this.playing = false; this.voices = new Set();
    this.mutes = model.staves.map(function () { return false; });
    this.instrument = sc.instrument || 'piano';
    this.loop = false;
    this.range = null;   // { from, to } in performance beats while a loop range is set
  }
  Player.prototype.span = function () {
    return this.loop && this.range ? this.range : { from: 0, to: this.model.perfTotal };
  };
  Player.prototype.qpm = function () { return this.baseQpm * this.rate; };
  Player.prototype.play = function () {
    var self = this;
    players.forEach(function (p) { if (p !== self && p.playing) p.pause(); });
    var c = context();
    var span = this.span();
    if (this.pos >= span.to - EPS || this.pos < span.from - EPS) this.pos = span.from;
    this.playing = true;
    this.t0 = c.currentTime + 0.08;
    this.b0 = this.pos;
    this.next = this.notes.findIndex(function (n) { return n.start >= self.pos - EPS; });
    if (this.next < 0) this.next = this.notes.length;
    this.timer = setInterval(function () { self.schedule(); }, 25);
    this.schedule();
    this.frame();
    this.ui.update();
  };
  Player.prototype.beatAt = function (time) { return this.b0 + (time - this.t0) * this.qpm() / 60; };
  Player.prototype.timeOf = function (beat) { return this.t0 + (beat - this.b0) * 60 / this.qpm(); };
  Player.prototype.schedule = function () {
    // Safari can stall timers for 100 ms+ while it repaints the score; a late note would bunch with the next, so keep a cushion.
    var c = audio.ctx, horizon = c.currentTime + 0.45, self = this, span = this.span();
    while (this.next < this.notes.length && this.timeOf(this.notes[this.next].start) < horizon && this.notes[this.next].start < span.to - EPS) {
      var n = this.notes[this.next++];
      if (this.mutes[n.staff]) continue;
      var st = this.model.staves[n.staff];
      var inst = this.instOverride ? this.instrument : (st.instrument || this.instrument);
      var t = Math.max(c.currentTime, this.timeOf(n.start));
      var v = root.MusicSynth.startVoice(c, audio.out, inst, n.midi, n.vel, t, function (voice) { self.voices.delete(voice); });
      var hold = n.fermata ? 1.8 : 1;
      v.release(this.timeOf(n.start + n.dur * hold) - 0.01);
      this.voices.add(v);
    }
    if (this.timeOf(span.to) < c.currentTime) {
      if (this.loop) { this.pos = span.from; this.stopVoices(false); clearInterval(this.timer); cancelAnimationFrame(this.raf); this.play(); }
      else this.stop();
    }
  };
  Player.prototype.stopVoices = function (hard) {
    var now = audio.ctx ? audio.ctx.currentTime : 0;
    this.voices.forEach(function (v) { if (hard) v.kill(now); else v.release(now); });
    if (hard) this.voices.clear();
  };
  Player.prototype.pause = function () {
    if (!this.playing) return;
    this.pos = Math.min(this.model.perfTotal, this.beatAt(audio.ctx.currentTime));
    this.halt();
  };
  Player.prototype.halt = function () {
    this.playing = false;
    clearInterval(this.timer);
    cancelAnimationFrame(this.raf);
    this.stopVoices(true);
    this.ui.light(-1);
    this.ui.update();
  };
  Player.prototype.stop = function () { this.pos = this.span().from; this.halt(); this.ui.cursor(writtenBeat(this.model, this.pos)); };
  // Seek to a printed beat. With repeats, the first time that bar is played (or the next time after `after`).
  Player.prototype.seek = function (written, after) {
    var was = this.playing;
    if (was) this.halt();
    this.pos = perfBeat(this.model, written, after);
    this.ui.cursor(written);
    if (was) this.play();
  };
  Player.prototype.frame = function () {
    var self = this;
    if (!this.playing) return;
    var beat = writtenBeat(this.model, this.beatAt(audio.ctx.currentTime));
    this.ui.light(beat);
    this.ui.cursor(beat);
    this.raf = requestAnimationFrame(function () { self.frame(); });
  };

  // "Complete piece · 34 bars · about 1:50" or "Excerpt · bars 1–8 of the whole song".
  function coverageText(model) {
    var sc = model.score, lastNo = barNumber(model, model.count - 1), firstNo = Math.max(1, model.firstBar);
    var unit = { '2': 2, '4': 1, '4.': 1.5, '8': 0.5, '8.': 0.75, '2.': 3 }[sc.tempoUnit || '4'] || 1;
    var secs = Math.round(model.perfTotal * 60 / ((sc.tempo || 90) * unit));
    var time = ' · about ' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0') + ' at the marked tempo';
    var repeats = model.order.length > model.count ? ' with repeats' : '';
    if (sc.complete) return 'Complete piece · ' + lastNo + ' bars' + repeats + time;
    if (sc.excerpt) return 'Excerpt · bars ' + (sc.excerpt.bars || (firstNo + '–' + lastNo)) + (sc.excerpt.of ? ' of ' + sc.excerpt.of : '');
    return '';
  }

  // Guide entries ({ bars: "5-8", text }) mapped to bar indexes. The most specific entry wins.
  function buildGuide(model) {
    return (model.score.guide || []).map(function (g, k) {
      var m = /^(\d+)(?:\s*[-–]\s*(\d+))?$/.exec(String(g.bars).trim());
      if (!m) throw new Error((model.id || 'score') + ': guide bars must look like "5" or "5-8"');
      var a = barIndexOf(model, +m[1]), b = barIndexOf(model, m[2] ? +m[2] : +m[1], true);
      if (a < 0 || b < 0 || b < a) throw new Error((model.id || 'score') + ': guide bars ' + g.bars + ' are outside the score');
      return { from: a, to: b, text: g.text, label: m[2] ? 'Bars ' + m[1] + '–' + m[2] : (+m[1] === 0 ? 'Pickup' : 'Bar ' + m[1]), k: k };
    });
  }
  function guideFor(guide, bi) {
    var best = null;
    guide.forEach(function (g) { if (bi >= g.from && bi <= g.to && (!best || g.to - g.from <= best.to - best.from)) best = g; });
    return best;
  }

  // ── Figure UI ─────────────────────────────────────────────────────────────
  var LABELS = { piano: 'Piano', strings: 'Strings', organ: 'Organ', ePiano: 'Celesta-ish (e-piano)', pluck: 'Harpsichord-ish (pluck)', synth: 'Synth', pad: 'Warm pad', bass: 'Bass' };

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text) e.textContent = text;
    return e;
  }

  function render(fig, score) {
    var model;
    try {
      model = prepare(score);
      analyse(model);
    } catch (err) {
      fig.insertBefore(el('p', { class: 'se-error' }, 'Score could not be drawn: ' + err.message), fig.firstChild);
      return null;
    }
    fig.classList.add('se-figure');
    var head = el('div', { class: 'se-head' });
    var titles = el('div', { class: 'se-titles' });
    titles.appendChild(el('strong', {}, score.title || 'Score'));
    if (score.subtitle) titles.appendChild(el('span', {}, score.subtitle));
    var coverage = coverageText(model);
    if (coverage) titles.appendChild(el('span', { class: 'se-coverage' }, coverage));
    head.appendChild(titles);

    var paper = el('div', { class: 'se-paper' });
    var svgWrap = el('div', { class: 'se-svg' });
    paper.appendChild(svgWrap);

    var bar = el('div', { class: 'se-controls', role: 'group', 'aria-label': 'Score player' });
    var playBtn = el('button', { type: 'button', class: 'se-play' }, '▶ Play');
    var stopBtn = el('button', { type: 'button', class: 'se-stop', 'aria-label': 'Stop and go back to the start' }, '■');
    var tempoLbl = el('label', { class: 'se-tempo-ctl' });
    tempoLbl.appendChild(el('span', {}, 'Speed'));
    var tempo = el('input', { type: 'range', min: '40', max: '130', step: '5', value: '100', 'aria-label': 'Playback speed, percent of the marked tempo' });
    var tempoOut = el('output', {}, '100%');
    tempoLbl.appendChild(tempo); tempoLbl.appendChild(tempoOut);
    var instLbl = el('label', { class: 'se-inst' });
    instLbl.appendChild(el('span', {}, 'Sound'));
    var inst = el('select', { 'aria-label': 'Instrument sound' });
    var auto = el('option', { value: '' }, 'As written');
    inst.appendChild(auto);
    root.MusicSynth.instruments.forEach(function (k) { inst.appendChild(el('option', { value: k }, LABELS[k] || (root.MusicSynth.labels && root.MusicSynth.labels[k]) || k)); });
    instLbl.appendChild(inst);
    var loopLbl = el('label', { class: 'se-check' });
    var loop = el('input', { type: 'checkbox' });
    var loopText = document.createTextNode(' Loop');
    loopLbl.appendChild(loop); loopLbl.appendChild(loopText);
    var clearLoop = el('button', { type: 'button', class: 'se-toggle se-clear-loop', hidden: '' }, 'Clear loop range');
    bar.appendChild(playBtn); bar.appendChild(stopBtn); bar.appendChild(tempoLbl); bar.appendChild(instLbl); bar.appendChild(loopLbl); bar.appendChild(clearLoop);
    var muteBoxes = [];
    if (model.staves.length > 1) {
      model.staves.forEach(function (st, si) {
        var l = el('label', { class: 'se-check' });
        var cb = el('input', { type: 'checkbox', checked: '' });
        cb.checked = true;
        l.appendChild(cb); l.appendChild(document.createTextNode(' ' + (st.label || 'Staff ' + (si + 1))));
        bar.appendChild(l); muteBoxes.push(cb);
      });
    }
    var full = el('button', { type: 'button', class: 'se-full', 'aria-label': 'Show the score full screen' }, '⤢');
    bar.appendChild(full);
    var status = el('p', { class: 'se-status', 'aria-live': 'polite' });
    var help = el('p', { class: 'se-help' }, 'Click a measure to start there, or a note to hear it. Shift-click a second measure to loop the bars between. Keys: [ and ] move a line, − and = zoom, F fits the score.');
    var guideBox = null, guideNow = null, guideList = null;

    var cap = fig.querySelector('figcaption');
    fig.insertBefore(head, cap);
    fig.insertBefore(paper, cap);
    fig.insertBefore(bar, cap);
    fig.insertBefore(status, cap);
    fig.insertBefore(help, cap);
    if (score.source) {
      var src = el('p', { class: 'se-source' });
      src.appendChild(document.createTextNode('Notes: ' + (score.source.label || 'source') + (score.source.license ? ' · ' + score.source.license : '') + ' '));
      if (score.source.url) {
        var a = el('a', { href: score.source.url, target: '_blank', rel: 'noopener' }, 'Source ↗');
        src.appendChild(a);
      }
      if (score.source.full) {
        src.appendChild(document.createTextNode(' · '));
        src.appendChild(el('a', { href: score.source.full, target: '_blank', rel: 'noopener', class: 'se-full-score' }, (score.source.fullLabel || 'Complete printed score') + ' ↗'));
      }
      fig.insertBefore(src, cap);
    }

    var player = new Player(fig, model);
    players.push(player);
    var layout = null, lit = [], cursorEl = null, staffScale = 1, lastDrawWidth = null;
    function measureAt(beat) { return model.barStart.reduce(function (at, start, i) { return beat >= start - EPS ? i : at; }, -1); }
    // The shared ScoreNavigation: song map, measure jump and steps, zoom (re-engraves more or fewer bars
    // per line), follow playback inside the paper. Choosing a measure seeks there; playback carries on.
    var sectionStart = {};
    (score.sections || []).forEach(function (sec) { var bi = barIndexOf(model, sec.bar); if (bi >= 0) sectionStart[bi] = sec; });
    var guide = buildGuide(model);
    var selectedBar = 0, loopBars = null;
    function setLoopBars(a, b) {
      if (a > b) { var t = a; a = b; b = t; }
      loopBars = { from: a, to: b };
      var from = perfBeat(model, model.barStart[a]);
      var to = perfBeat(model, model.barStart[b], from) + model.staves[0].bars[b].length;
      player.range = { from: from, to: Math.max(to, from + model.staves[0].bars[a].length) };
      player.loop = true; loop.checked = true;
      loopText.textContent = ' Loop bars ' + barNumber(model, a) + '–' + barNumber(model, b);
      clearLoop.hidden = false;
      navigation.refresh();
    }
    function clearLoopRange() {
      loopBars = null; player.range = null;
      loopText.textContent = ' Loop'; clearLoop.hidden = true;
      navigation.refresh();
    }
    var navigation = root.ScoreNavigation({ surface: paper, selector: '.se-measure', scroller: paper, keyScope: fig, ignore: '.se-ev',
      ariaLabel: (score.title || 'Score') + ': measures and zoom',
      number: function (i) { return barNumber(model, i); },
      section: function (i) { return sectionStart[i] ? sectionStart[i].label : null; },
      loopRange: function () { return loopBars && player.loop ? [loopBars.from, loopBars.to] : null; },
      onSelect: function (i, m, info) {
        if (info.event && info.event.shiftKey) {
          setLoopBars(selectedBar, i);
          status.textContent = 'Looping bars ' + barNumber(model, loopBars.from) + '–' + barNumber(model, loopBars.to) + '. Press Play.';
          return false;
        }
        selectedBar = i;
        showGuide(i);
        if (!(info.preview && player.playing)) player.seek(model.barStart[i]);
      },
      zoom: { steps: [0.5, 0.6, 0.75, 0.9, 1, 1.25, 1.5, 2], get: function () { return staffScale; },
        set: function (z) { staffScale = z; layout = null; draw(); } },
      fitRoom: function () { return (parseFloat(getComputedStyle(paper).maxHeight) || root.innerHeight * 0.65) - 8; }
    });
    if (guide.length) {
      guideBox = el('section', { class: 'se-guide', 'aria-label': 'Measure-by-measure guide' });
      guideNow = el('div', { class: 'se-guide-now', 'aria-live': 'polite' });
      var all = el('details', { class: 'se-guide-all' });
      all.appendChild(el('summary', {}, 'Read the whole guide (' + guide.length + ' notes)'));
      guideList = el('ol', {});
      guide.slice().sort(function (x, y) { return x.from - y.from || y.to - x.to; }).forEach(function (g) {
        var li = el('li', {});
        var jump = el('button', { type: 'button', class: 'se-guide-jump' }, g.label);
        jump.addEventListener('click', function () { navigation.go(g.from, { source: 'goto' }); });
        li.appendChild(jump); li.appendChild(el('span', {}, ' ' + g.text));
        guideList.appendChild(li);
      });
      all.appendChild(guideList);
      guideBox.appendChild(guideNow); guideBox.appendChild(all);
      fig.insertBefore(guideBox, cap);
    }
    var shownGuide = -2;
    function showGuide(bi) {
      if (!guideNow) return;
      var g = guideFor(guide, bi), sec = null;
      Object.keys(sectionStart).forEach(function (k) { if (+k <= bi) sec = sectionStart[k]; });
      var key = (g ? g.k : -1) + ':' + (sec ? sec.bar : '');
      if (key === shownGuide) return;
      shownGuide = key;
      guideNow.innerHTML = '';
      var headLine = el('strong', {}, (sec ? (sec.name || 'Section ' + sec.label) + ' · ' : '') + (g ? g.label : 'Bar ' + barNumber(model, bi)));
      guideNow.appendChild(headLine);
      guideNow.appendChild(el('span', {}, g ? g.text : 'No note for this bar yet. Listen to it twice, then describe what changes.'));
    }
    showGuide(0);
    var noteList = el('ol', { class: 'se-note-list', hidden: '' });
    var noteListToggle = el('button', { type: 'button', class: 'se-note-list-toggle', 'aria-expanded': 'false', 'aria-controls': 'score-notes-' + (score.id || 'score') }, 'Show note list');
    noteList.id = 'score-notes-' + (score.id || 'score');
    var pitchToggle = el('button', { type: 'button', class: 'se-toggle', 'aria-pressed': root.MusicNotation.preferences.pitchNames ? 'true' : 'false' }, 'Pitch names');
    var colorToggle = el('button', { type: 'button', class: 'se-toggle', 'aria-pressed': root.MusicNotation.preferences.noteColors ? 'true' : 'false' }, 'Note colors');

    function updatePreferenceButtons() {
      var prefs = root.MusicNotation.preferences;
      pitchToggle.setAttribute('aria-pressed', prefs.pitchNames ? 'true' : 'false');
      colorToggle.setAttribute('aria-pressed', prefs.noteColors ? 'true' : 'false');
      pitchToggle.classList.toggle('is-on', prefs.pitchNames);
      colorToggle.classList.toggle('is-on', prefs.noteColors);
      pitchToggle.textContent = prefs.pitchNames ? '✓ Pitch names' : 'Pitch names';
      colorToggle.textContent = prefs.noteColors ? '✓ Note colors' : 'Note colors';
    }
    function noteButtons() { return Array.prototype.slice.call(noteList.querySelectorAll('button[data-note-index]')); }
    function updateNoteList(active) {
      noteButtons().forEach(function (button) {
        var selected = active && button.getAttribute('data-note-index') === String(active.i);
        if (selected) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current');
      });
    }
    function renderNoteList() {
      if (!layout || noteList.hasAttribute('hidden')) return;
      noteList.innerHTML = '';
      layout.events.filter(function (ev) { return !ev.hidden; }).sort(function (a, b) { return a.abs - b.abs || a.staff - b.staff || a.i - b.i; }).forEach(function (ev, index) {
        var li = document.createElement('li');
        var button = el('button', { type: 'button', 'data-note-index': ev.i, 'aria-label': eventLabel(ev, model) });
        button.textContent = (index + 1) + '. ' + eventLabel(ev, model);
        button.addEventListener('click', function () { selectEvent(ev); });
        button.addEventListener('keydown', function (e) {
          var buttons = noteButtons(), at = buttons.indexOf(button), next;
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = buttons[Math.min(buttons.length - 1, at + 1)];
          if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = buttons[Math.max(0, at - 1)];
          if (next) { e.preventDefault(); next.focus(); }
        });
        li.appendChild(button); noteList.appendChild(li);
      });
      updateNoteList(layout.events.find(function (ev) { return lit.indexOf(ev.i) >= 0; }));
    }

    function draw() {
      var w = Math.max(280, Math.round((svgWrap.clientWidth || paper.clientWidth || 640) / staffScale));
      if (layout && lastDrawWidth !== null && Math.abs(lastDrawWidth - w) < 2) return;
      lastDrawWidth = w;
      layout = engrave(model, w);
      var label = (score.title || 'Score') + '. ' + model.count + ' bars in ' + model.ts.num + '/' + model.ts.den + (score.keyName ? ', ' + score.keyName : '') + '.';
      svgWrap.innerHTML = '<svg class="se-score" role="img" aria-label="' + root.MusicNotation.escape(label) + '" viewBox="0 0 ' + layout.width + ' ' + layout.height + '" width="' + (layout.width * staffScale) + '" height="' + (layout.height * staffScale) + '"' + (fig.hasAttribute('data-score-zoom') ? ' style="max-width:none"' : '') + '>' +
        '<rect class="se-cursor" x="0" y="0" width="' + (layout.S * 0.35) + '" height="0" rx="' + layout.S * 0.15 + '" opacity="0"/>' + layout.svg + '</svg>';
      cursorEl = svgWrap.querySelector('.se-cursor');
      lit = [];
      if (!player.playing) player.ui.cursor(player.pos);
      renderNoteList();
      navigation.refresh();
    }

    player.ui = {
      update: function () {
        playBtn.textContent = player.playing ? '❚❚ Pause' : '▶ Play';
        playBtn.setAttribute('aria-pressed', player.playing ? 'true' : 'false');
        fig.classList.toggle('se-playing', player.playing);
      },
      light: function (beat) {
        if (!layout) return;
        var measure = measureAt(beat);
        navigation.setCurrent(beat < 0 ? -1 : measure);
        if (beat >= 0) showGuide(measure);
        var on = beat < 0 ? [] : layout.events.filter(function (ev) {
          return ev.kind === 'note' && !player.mutes[ev.staff] && ev.abs <= beat + EPS && beat < ev.abs + ev.dur - EPS;
        });
        var ids = on.map(function (e) { return e.i; });
        lit.forEach(function (i) { if (ids.indexOf(i) < 0) { var g = svgWrap.querySelector('.se-ev[data-i="' + i + '"]'); if (g) g.classList.remove('is-on'); } });
        ids.forEach(function (i) { if (lit.indexOf(i) < 0) { var g = svgWrap.querySelector('.se-ev[data-i="' + i + '"]'); if (g) g.classList.add('is-on'); } });
        lit = ids;
        updateNoteList(on[0]);
        if (on.length) {
          var msg = eventLabel(on[0], model);
          if (status.textContent !== msg) status.textContent = msg;
        }
      },
      cursor: function (beat) {
        if (!layout || !cursorEl) return;
        var best = null;
        layout.systems.forEach(function (sys) {
          for (var i = 0; i < sys.cols.length - 1; i++) {
            var a = sys.cols[i], b = sys.cols[i + 1];
            if (beat >= a.t - EPS && beat < b.t + EPS && !best) {
              var f = b.t > a.t ? (beat - a.t) / (b.t - a.t) : 0;
              best = { x: a.x + (b.x - a.x) * Math.min(1, f), sys: sys };
            }
          }
        });
        if (!best || (!player.playing && beat <= EPS)) { cursorEl.setAttribute('opacity', '0'); return; }
        cursorEl.setAttribute('x', best.x - layout.S * 0.5);
        cursorEl.setAttribute('y', best.sys.top);
        cursorEl.setAttribute('height', best.sys.bottom - best.sys.top);
        cursorEl.setAttribute('opacity', '1');
      }
    };

    playBtn.addEventListener('click', function () { if (player.playing) player.pause(); else player.play(); });
    stopBtn.addEventListener('click', function () { player.stop(); navigation.reset(); status.textContent = ''; });
    tempo.addEventListener('input', function () {
      var r = +tempo.value / 100;
      tempoOut.textContent = tempo.value + '%';
      if (player.playing) { player.pause(); player.rate = r; player.play(); } else player.rate = r;
    });
    inst.addEventListener('change', function () { player.instOverride = !!inst.value; player.instrument = inst.value || score.instrument || 'piano'; });
    loop.addEventListener('change', function () { player.loop = loop.checked; navigation.refresh(); });
    clearLoop.addEventListener('click', function () { clearLoopRange(); status.textContent = 'Loop range cleared.'; });
    muteBoxes.forEach(function (cb, i) { cb.addEventListener('change', function () { player.mutes[i] = !cb.checked; }); });
    full.addEventListener('click', function () {
      if (document.fullscreenElement === fig) document.exitFullscreen();
      else if (fig.requestFullscreen) fig.requestFullscreen().catch(function () {});
    });
    document.addEventListener('fullscreenchange', function () { layout = null; requestAnimationFrame(draw); });

    // Click a note: hear it, and start playback from there next time.
    svgWrap.addEventListener('click', function (e) {
      var g = e.target.closest && e.target.closest('.se-ev');
      if (!g || !layout) return;
      var ev = layout.events[+g.getAttribute('data-i')];
      if (!ev || ev.kind !== 'note') return;
      var c = context();
      var st = model.staves[ev.staff];
      ev.pitches.forEach(function (p) {
        root.MusicSynth.startVoice(c, audio.out, player.instOverride ? player.instrument : (st.instrument || player.instrument), p.midi, 0.75, c.currentTime).release(c.currentTime + 0.6);
      });
      player.seek(ev.abs);
      navigation.select(measureAt(ev.abs));
      selectedBar = measureAt(ev.abs); showGuide(selectedBar);
      status.textContent = eventLabel(ev, model) + ' — press Play to start here';
      updateNoteList(ev);
    });

    function selectEvent(ev) {
      if (!ev) return;
      var c = context(), st = model.staves[ev.staff];
      if (ev.kind === 'note') ev.pitches.forEach(function (p) {
        root.MusicSynth.startVoice(c, audio.out, player.instOverride ? player.instrument : (st.instrument || player.instrument), p.midi, 0.75, c.currentTime).release(c.currentTime + 0.6);
      });
      player.seek(ev.abs);
      navigation.select(measureAt(ev.abs));
      status.textContent = eventLabel(ev, model) + ' — press Play to start here';
      updateNoteList(ev);
    }

    pitchToggle.addEventListener('click', function () { root.MusicNotation.setPreferences({ pitchNames: !root.MusicNotation.preferences.pitchNames }); });
    colorToggle.addEventListener('click', function () { root.MusicNotation.setPreferences({ noteColors: !root.MusicNotation.preferences.noteColors }); });
    noteListToggle.addEventListener('click', function () {
      var open = noteList.hasAttribute('hidden');
      if (open) { noteList.removeAttribute('hidden'); renderNoteList(); } else noteList.setAttribute('hidden', '');
      noteListToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      noteListToggle.textContent = open ? 'Hide note list' : 'Show note list';
    });
    root.MusicNotation.onPreferencesChange(function () { layout = null; updatePreferenceButtons(); requestAnimationFrame(draw); });
    updatePreferenceButtons();

    draw();
    bar.appendChild(pitchToggle); bar.appendChild(colorToggle); bar.appendChild(noteListToggle);
    fig.insertBefore(noteList, cap);
    var pieceGroup = fig.closest('details.composer-piece-group');
    if (pieceGroup) pieceGroup.addEventListener('toggle', function () {
      if (!pieceGroup.open) { player.stop(); status.textContent = ''; }
      else { layout = null; requestAnimationFrame(draw); }
    });
    if (root.ResizeObserver) new ResizeObserver(function () { requestAnimationFrame(draw); }).observe(svgWrap);
    else root.addEventListener('resize', draw);
    return player;
  }

  // ── Embeds ────────────────────────────────────────────────────────────────
  var scriptUrl = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : null;
  var library = null;
  function loadLibrary() {
    if (!library) {
      var url = new URL('../../data/score-library.json', scriptUrl || location.href);
      library = fetch(url).then(function (r) {
        if (!r.ok) throw new Error('score library ' + r.status);
        return r.json();
      });
    }
    return library;
  }

  function injectCss() {
    if (document.querySelector('link[data-score-css]')) return;
    var link = el('link', { rel: 'stylesheet', href: new URL('../css/score-engine.css', scriptUrl || location.href).href, 'data-score-css': '' });
    document.head.appendChild(link);
  }

  function boot() {
    var figs = document.querySelectorAll('figure[data-score]');
    if (!figs.length) return;
    injectCss();
    loadLibrary().then(function (lib) {
      figs.forEach(function (fig) {
        var id = fig.getAttribute('data-score');
        var score = lib.scores && lib.scores[id];
        if (!score) { fig.insertBefore(el('p', { class: 'se-error' }, 'Unknown score "' + id + '".'), fig.firstChild); return; }
        score.id = id;
        render(fig, score);
      });
    }).catch(function (err) {
      figs.forEach(function (fig) { fig.insertBefore(el('p', { class: 'se-error' }, 'Sheet music could not load (' + err.message + ').'), fig.firstChild); });
    });
  }

  root.ScoreEngine = { prepare: prepare, analyse: analyse, playList: playList, engrave: engrave, render: render, parseStaff: parseStaff,
    barNumber: barNumber, barIndexOf: barIndexOf, buildGuide: buildGuide, coverageText: coverageText, writtenBeat: writtenBeat, perfBeat: perfBeat };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
