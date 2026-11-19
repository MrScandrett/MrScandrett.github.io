/* score-engine.js — engraved, playable sheet-music excerpts for lessons.
 *
 * Drop <figure data-score="slug"> into a lesson (slug = a key in data/score-library.json)
 * and load music-notation.js, music-synth.js and this file. The figure gets an engraved
 * score (Bravura outlines from MusicNotation) and a player that sounds it through
 * MusicSynth, lighting each note as it plays. ScoreEngine.render(el, score) does the
 * same for a score object built in JS.
 *
 * Score text, one string per staff (bars split by "|"):
 *   C#5/8.   pitch / duration (1 2 4 8 16 32 64 128) + dots      r/4  rest      R  whole-bar rest
 *   (C4 E4 G4)/2   chord        ~ tie to the next note      ^ fermata     s/4  S  hidden (spacer) rests
 *   (B3 D#4 G#4~)/8  tie only the marked notes of a chord (the others are struck again)
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
 *   @B             start a new beam group at the next note
 *   @tieWait       ties may wait through intervening notes for a matching chord
 *   @tieUp @tieDown ties above or below the notes, independently of stems
 * Staff field soundingTranspose: semitones between written and sounding pitch, for staves notated
 *   at written pitch (double bass -12: it sounds an octave below its part). Playback only.
 *   @L:3/2         this bar is incomplete: 3/2 quarter beats long (repeat endings, mid-piece pickups)
 *   @N:12          printed bar number of this bar (numbering continues from it)
 *   @Fine  @DC     Fine at the end of this bar; D.C. al Fine at the end of this bar (back to the top,
 *                  repeats not taken, last endings only, stopping at Fine or, without one, at this bar)
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

  var BASES = { 1: 4, 2: 2, 4: 1, 8: 0.5, 16: 0.25, 32: 0.125, 64: 0.0625, 128: 0.03125 };
  var DYN_VEL = { pp: 0.32, p: 0.45, mp: 0.58, mf: 0.7, f: 0.85, ff: 1 };
  var EPS = 1e-6;

  function quarterNotesPerMinute(score) {
    var unit = /^(1|2|4|8|16|32|64|128)(\.{0,3})$/.exec(String(score.tempoUnit || '4'));
    var tempo = score.tempo == null ? 90 : Number(score.tempo);
    if (!unit || !Number.isFinite(tempo) || tempo <= 0) fail(score.id || 'score', 'invalid tempo or beat unit');
    return tempo * BASES[unit[1]] * (2 - Math.pow(0.5, unit[2].length));
  }

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
  // Does pitch p of event ev tie on? A chord-level ~ ties every note; (C4~ E4) ties only C4.
  function tiesFrom(ev, p) { return !!ev.tie && (!ev.partialTie || !!p.tie); }
  function tiedPitch(ev, midi) { return ev.pitches.some(function (p) { return p.midi === midi && tiesFrom(ev, p); }); }
  var TUPLET_SPACE = { 2: 3, 3: 2, 4: 3, 5: 4, 6: 4, 7: 4, 9: 8 };

  function parseStaff(text, where) {
    var bars = String(text).split('|').map(function (s) { return s.trim(); });
    if (bars[bars.length - 1] === '') bars.pop();
    var last = null, dyn = null, tuplet = null, tupletId = 0, stemDir = null, tieWait = false, beamBreak = false, tieSide = null;
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
        // Arpeggiated chords can hold a pitch through intervening notes until
        // it reappears in the final chord (LilyPond's tieWaitForNote).
        if (tok === '@tieWait') { tieWait = true; return; }
        if (tok === '@tieUp' || tok === '@tieDown') { tieSide = tok === '@tieDown' ? 'below' : 'above'; return; }
        if (tok === '@B') { beamBreak = true; return; }
        if (tok.charAt(0) === '@') {
          var lm = /^@L:(\d+)(?:\/(\d+))?$/.exec(tok), nm = /^@N:(\d+)$/.exec(tok);
          if (lm) { meta.len = +lm[1] / (lm[2] ? +lm[2] : 1); return; }
          if (nm) { meta.number = +nm[1]; return; }
          if (tok === '@Fine') { meta.fine = true; return; }
          if (tok === '@DC') { meta.dc = true; return; }
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
        var m = /^(g:)?(\([^)]*\)|[A-G](?:##|bb|#|b|n)?-?\d+|r|R|s|S)(?:\/(\d+)(\.{0,3}))?(~?)(\^?)((?:\+(?:tr|mord|turn|\.|>|-))*)$/.exec(tok);
        if (!m) fail(w, 'cannot read this token');
        var grace = !!m[1];
        if (grace && /^[rRsS]$/.test(m[2])) fail(w, 'grace notes must be notes');
        if (m[3]) {
          var base = BASES[m[3]];
          if (!base) fail(w, 'duration must be 1, 2, 4, 8, 16, 32, 64 or 128');
          if (!grace) last = { base: base, dots: m[4].length };
        } else if (!last && m[2] !== 'R' && m[2] !== 'S' && !grace) fail(w, 'first note needs a duration');
        var ev = { start: t, dyn: dyn, fermata: !!m[6], tie: !!m[5], stemDir: stemDir, tieWait: tieWait, tieSide: tieSide };
        ev.beamBreak = beamBreak; beamBreak = false;
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
          ev.dur = last.base * (2 - Math.pow(0.5, last.dots));
          if (tuplet) { ev.dur *= tuplet.ratio; ev.tuplet = tuplet; tuplet.events.push(ev); }
          ev.kind = m[2] === 'r' || spacer ? 'rest' : 'note';
          ev.hidden = spacer;
        }
        if (ev.kind === 'note') {
          var list = m[2].charAt(0) === '(' ? m[2].slice(1, -1).trim().split(/\s+/) : [m[2]];
          ev.pitches = list.map(function (s) {
            var own = /~$/.test(s), p = parsePitchToken(own ? s.slice(0, -1) : s, w);
            if (own) { p.tie = true; ev.partialTie = true; }
            return p;
          })
            .sort(function (a, b) { return a.diatonic - b.diatonic || a.midi - b.midi; });
        }
        if (ev.partialTie) { if (ev.tie) fail(w, 'tie the whole chord (…)/4~ or single notes (C4~ E4)/4, not both'); ev.tie = true; }
        if (ev.tie && ev.kind !== 'note') fail(w, 'only notes can be tied');
        if (grace) { graces.push(ev); return; }
        if (graces.length) { ev.graces = graces; graces = []; }
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
      var m = bar.meta, out = { repStart: !!m.repStart, repEnd: !!m.repEnd, volta: m.volta || null, len: m.len || null, number: m.number == null ? null : m.number, fine: !!m.fine, dc: !!m.dc };
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
      return { clef: st.clef || 'treble', clefAt: clefAt, label: st.label || '', instrument: st.instrument || null, sounding: Number(st.soundingTranspose) || 0, bars: bars, voices: voices };
    });
    // Optional practice annotations, in written note-event order per staff.
    staves.forEach(function (st, si) {
      var fingers = (score.fingerings || [])[si] || [], index = 0;
      st.bars.forEach(function (bar) { bar.events.forEach(function (ev) {
        if (ev.kind === 'note' && !ev.hidden) {
          var value = String(fingers[index++] || '');
          if (/^[1-5](?:\/[1-5]){0,4}$/.test(value)) ev.fingering = value;
        }
      }); });
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
    var model = { score: score, id: id, ts: ts, pickup: pickup, key: ksig, staves: staves, barStart: barStart, total: t, count: count, barMeta: barMeta, baseQpm: quarterNotesPerMinute(score) };
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

  // Written bars in the order they are played: repeats taken once, first/second endings honoured,
  // then a D.C. al Fine from the top without repeats.
  function performanceOrder(model) {
    var meta = model.barMeta, order = [], i = 0, start = 0, pass = 1, jumped = {}, sectionEnd = -1, dcAt = -1;
    while (i < model.count && order.length < model.count * 4) {
      var m = meta[i];
      // Past a repeated section (and its endings): an end-repeat without a start-repeat comes back here.
      if (sectionEnd >= 0 && i > sectionEnd && !m.volta) { start = i; pass = 1; sectionEnd = -1; }
      if (m.repStart && i !== start) { start = i; pass = 1; }
      if (m.volta && m.volta.split('.').indexOf(String(pass)) < 0) { i++; continue; }
      order.push(i);
      if (m.repEnd && !jumped[i]) { jumped[i] = true; pass++; sectionEnd = Math.max(sectionEnd, i); i = start; continue; }
      if (m.dc) { dcAt = i; break; }
      i++;
    }
    if (dcAt >= 0) {
      var fine = -1;
      for (var f = 0; f < dcAt && fine < 0; f++) if (meta[f].fine) fine = f;
      if (fine < 0) fine = dcAt;
      for (var j = 0; j <= fine; j++) if (!meta[j].volta || isLastEnding(meta, j)) order.push(j);
    }
    return order;
  }

  // Does bar bi belong to the last ending of its group (the one a da capo takes)?
  function isLastEnding(meta, bi) {
    var a = bi, b = bi, most = 0;
    while (a > 0 && meta[a - 1].volta) a--;
    while (b < meta.length - 1 && meta[b + 1].volta) b++;
    for (var k = a; k <= b; k++) meta[k].volta.split('.').forEach(function (n) { most = Math.max(most, +n); });
    return meta[bi].volta.split('.').indexOf(String(most)) >= 0;
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
            var cont = prev && prev.tie && prev.kind === 'note' && tiedPitch(prev, p.midi);
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
        var holds = function (c) { return c && c.kind === 'note' && ev.pitches.some(function (p) { return tiesFrom(ev, p) && c.pitches.some(function (q) { return q.midi === p.midi; }); }); };
        if (ev.tieWait) {
          next = flat.slice(i + 1).find(function (c) { return c.voice === ev.voice && holds(c); });
          if (!next) fail(model.id, 'a waiting tie needs a later matching note');
          next.pitches.forEach(function (q) {
            if (tiedPitch(ev, q.midi)) {
              q.tiedFrom = true; q.tiedFromBar = ev.bar;
              if (next.bar !== ev.bar) q.showAcc = null;
            }
          });
        }
        if (!holds(next)) {
          // A tie may pass into another voice on the same staff (a line moving between upper and lower voice).
          var end = ev.abs + ev.dur;
          var other = flat.find(function (c) { return c !== ev && Math.abs(c.abs - end) < EPS && holds(c); });
          if (other) {
            next = other;
            other.pitches.forEach(function (q) {
              if (tiedPitch(ev, q.midi)) { q.tiedFrom = true; q.tiedFromBar = ev.bar; if (other.bar !== ev.bar) q.showAcc = null; }
            });
          }
        }
        ev.tieTo = next && next.kind === 'note' ? next : null;
      });
    });
  }

  function staffDynamics(model, staff, si) {
    var marks = [], starts = [], segments = [], current = { at: -1, vel: DYN_VEL.mf };
    var expressions = model.score.expressions || {};
    function position(mark) { return model.barStart[mark.bar - 1] + (mark.beat || 0); }
    staff.bars.forEach(function (bar, bi) {
      bar.events.forEach(function (ev) {
        if (ev.dyn) marks.push({ at: model.barStart[bi] + ev.start, vel: DYN_VEL[ev.dyn] });
      });
    });
    (expressions.directions || []).forEach(function (mark) {
      if ((mark.staff || 0) === si && DYN_VEL[mark.dynamic] && Number.isFinite(position(mark))) {
        marks.push({ at: position(mark), vel: DYN_VEL[mark.dynamic] });
      }
    });
    var ramps = (expressions.hairpins || []).filter(function (span) { return (span.staff || 0) === si; })
      .map(function (span) { return { at: position(span.from), end: position(span.to), cresc: span.type === 'crescendo' }; })
      .filter(function (ramp) { return ramp.end > ramp.at + EPS; });
    function level(segment, at) {
      if (segment.end == null) return segment.vel;
      var fraction = Math.min(1, Math.max(0, (at - segment.at) / (segment.end - segment.at)));
      return segment.vel + (segment.target - segment.vel) * fraction;
    }
    marks.concat(ramps).sort(function (a, b) { return a.at - b.at; }).forEach(function (mark) {
      if (mark.end == null) current = mark;
      else {
        var vel = level(current, mark.at);
        var explicit = marks.find(function (entry) { return Math.abs(entry.at - mark.end) < EPS; });
        var target = explicit ? explicit.vel : Math.min(1, Math.max(0.22, vel + (mark.cresc ? 0.13 : -0.13)));
        current = { at: mark.at, end: mark.end, vel: vel, target: target };
      }
      starts.push(mark.at); segments.push(current);
    });
    return function (at) {
      var index = floorIndex(starts, at + EPS);
      return index < 0 ? DYN_VEL.mf : level(segments[index], at);
    };
  }

  // Notes to sound, in performance time (repeats unrolled): tied notes merge into one long note.
  // `start` is the performance beat; `written` is the beat in the printed score.
  function playList(model, separateVoices) {
    var out = [], order = model.order || model.barStart.map(function (_, i) { return i; });
    var perfStart = model.perfStart || model.barStart;
    model.staves.forEach(function (st, si) {
      var dynamicAt = staffDynamics(model, st, si);
      order.forEach(function (bi, pos) {
        var off = perfStart[pos] - model.barStart[bi];
        var meter = model.barMeta[bi].ts;
        var pulse = 4 / meter.den * (meter.num > 3 && meter.num % 3 === 0 && meter.den >= 8 ? 3 : 1);
        st.bars[bi].events.forEach(function (ev) {
          if (ev.kind !== 'note' && !ev.graces) return;
          var phase = (ev.start + (bi === 0 && model.pickup ? meter.len - model.pickup : 0)) / pulse;
          var weight = phase < EPS ? 1.035 : Math.abs(phase - Math.round(phase)) < EPS ? 1 : 0.94;
          var vel = dynamicAt(ev.abs) * weight;
          if (ev.orn && ev.orn.indexOf('>') >= 0) vel = Math.min(1, vel * 1.10);
          (ev.graces || []).forEach(function (g, gi, all) {
            var lead = Math.min(0.12, 0.5 / all.length);
            g.pitches.forEach(function (p) {
              out.push({ staff: si, voice: ev.voice, start: Math.max(0, ev.abs + off - lead * (all.length - gi)), dur: lead, midi: p.midi + st.sounding, vel: vel * 0.85, grace: true, written: ev.abs });
            });
          });
          if (ev.kind !== 'note') return;
          ev.pitches.forEach(function (p, pitchIndex) {
            // A tie carried in from the bar written before only counts if that bar was just played.
            if (p.tiedFrom && (p.tiedFromBar === ev.bar || pos === 0 || order[pos - 1] === p.tiedFromBar)) return;
            var dur = ev.dur, cur = ev, tiePos = pos;
            while (cur.tie && cur.tieTo && tiedPitch(cur, p.midi) && cur.tieTo.pitches.some(function (q) { return q.midi === p.midi; })) {
              var target = cur.tieTo;
              if (target.bar !== cur.bar) {
                if (order[tiePos + 1] !== target.bar) break;
                tiePos++;
              }
              dur += (cur.tieWait ? target.abs - (cur.abs + cur.dur) : 0) + target.dur;
              cur = target;
            }
            // Staccato changes the release, not the written rhythm. If a tied
            // chain ends staccato, detach only its final segment.
            if (cur.orn && cur.orn.indexOf('.') >= 0) dur -= cur.dur * 0.5;
            var voiced = pitchIndex === ev.pitches.length - 1 ? vel : vel * 0.92;
            out.push({ staff: si, voice: ev.voice, start: ev.abs + off, dur: dur, midi: p.midi + st.sounding, vel: Math.min(1, voiced), fermata: ev.fermata || cur.fermata, written: ev.abs });
          });
        });
      });
    });
    // Two voices on one staff striking the same pitch together sound it once, for the longer time.
    var seen = {};
    out = out.filter(function (n) {
      if (n.grace) return true;
      var k = n.staff + ':' + (separateVoices ? n.voice + ':' : '') + Math.round(n.start * 960) + ':' + n.midi;
      if (seen[k]) {
        seen[k].dur = Math.max(seen[k].dur, n.dur);
        seen[k].vel = Math.max(seen[k].vel, n.vel);
        seen[k].fermata = seen[k].fermata || n.fermata;
        return false;
      }
      seen[k] = n; return true;
    });
    return out.sort(function (a, b) { return a.start - b.start; });
  }

  // Performance beat → printed beat (and back): repeats play some printed bars twice.
  // Index of the last value <= target. Used on sorted beat/column indexes instead
  // of walking a whole movement on every animation frame.
  function floorIndex(values, target) {
    var lo = 0, hi = values.length;
    while (lo < hi) { var mid = (lo + hi) >>> 1; if (values[mid] <= target) lo = mid + 1; else hi = mid; }
    return lo - 1;
  }
  function writtenBeat(model, perf) {
    var order = model.order, ps = model.perfStart, pos = Math.max(0, floorIndex(ps, perf + EPS));
    return model.barStart[order[pos]] + Math.max(0, perf - ps[pos]);
  }
  function perfBeat(model, written, after) {
    var bi = Math.max(0, floorIndex(model.barStart, written + EPS));
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
      if (beamable && cur && !ev.beamBreak && cur.slot === slot &&
          cur.events[cur.events.length - 1].stem === ev.stem &&
          cur.events[cur.events.length - 1].clef === ev.clef) cur.events.push(ev);
      else {
        if (cur) groups.push(cur);
        cur = beamable ? { slot: slot, events: [ev], unit: unit } : null;
      }
    });
    if (cur) groups.push(cur);
    // In 4/4, four plain eighths across beats 1–2 or 3–4 share a beam.
    if (ts.num === 4 && ts.den === 4) {
      for (var i = 0; i < groups.length - 1; i++) {
        var a = groups[i], b = groups[i + 1];
        var plain = a.events.concat(b.events).every(function (e) { return e.base === 0.5 && !e.dots; });
        if (plain && !b.events[0].beamBreak && a.events.length === 2 && b.events.length === 2 && a.slot % 2 === 0 && b.slot === a.slot + 1 &&
            a.events[0].stem === b.events[0].stem && a.events[0].clef === b.events[0].clef) {
          groups.splice(i, 2, { slot: a.slot, unit: unit, events: a.events.concat(b.events) });
        }
      }
    }
    return groups.filter(function (g) { return g.events.length > 1; });
  }

  // A rest in one voice must not sit on what another voice draws at the same moment: a held
  // head (a quarter rest over a dotted-half bass note), the stem of a note that starts with it,
  // or a beam running across it. Pick the nearest clear height, trying the rest's own side
  // first, so a crowded passage tucks it into a gap instead of sending it far off the staff.
  // Stem ends sit 7 steps past the head, as in extents(). Obstacles are kept on rest.clearOf
  // so tests can check the result.
  function placeRests(bar) {
    bar.events.forEach(function (rest) {
      if (rest.kind !== 'rest' || rest.hidden || rest.whole) return;
      var home = rest.restStep, up = home >= 4;
      // Half-height of the glyph in steps: half rest 1.5, quarter 3, eighth 2, shorter 3.
      var hh = rest.base >= 2 ? 1.5 : rest.base >= 1 ? 3 : rest.base >= 0.5 ? 2 : 3;
      var end = rest.start + rest.dur, obstacles = [], heads = [];
      bar.events.forEach(function (n) {
        if (n.kind !== 'note' || n.grace || n.voice === rest.voice) return;
        if (n.start < end - EPS && n.start + n.dur > rest.start + EPS) { obstacles.push([n.lo - 1, n.hi + 1]); heads.push([n.lo - 1, n.hi + 1]); }
        if (n.base < 4 && Math.abs(n.start - rest.start) < EPS && !n.beam) obstacles.push(n.up ? [n.hi, n.hi + 7] : [n.lo - 7, n.lo]);
      });
      bar.beams.forEach(function (g) {
        if (g.events[0].voice === rest.voice) {
          // The run this rest leads into: keep clear of where its beam starts.
          var f = g.events[0];
          if (Math.abs(f.start - end) < EPS) { var e0 = g.up ? f.hi + 7 : f.lo - 7; obstacles.push([Math.min(e0, f.lo) - 1, Math.max(e0, f.hi) + 1]); }
          return;
        }
        var first = g.events[0].start, last = g.events[g.events.length - 1].start;
        if (rest.start < first - EPS || rest.start > last + EPS) return;
        var ends = g.events.map(function (n) { return g.up ? n.hi + 7 : n.lo - 7; });
        var heads = g.events.map(function (n) { return g.up ? n.hi : n.lo; });
        var a = Math.min.apply(null, ends.concat(heads)), z = Math.max.apply(null, ends.concat(heads));
        obstacles.push([a - 1, z + 1]);
      });
      rest.clearOf = obstacles;
      if (!obstacles.length) return;
      function search(list, reach) {
        for (var d = 0; d <= reach; d++) {
          var tries = up ? [home + d, home - d] : [home - d, home + d];
          for (var k = 0; k < 2; k++) {
            if (list.every(function (o) { return o[0] > tries[k] + hh || o[1] < tries[k] - hh; })) return tries[k];
          }
        }
        return undefined;
      }
      // Stems and beams are avoided only when a clear gap is close by; a noteheads-only
      // clearance is the fallback, so a rest never strays far from its voice for a stem.
      var spot = search(obstacles, 8);
      if (spot === undefined) { spot = search(heads, 30); rest.clearOf = heads; }
      if (spot !== undefined) rest.restStep = spot;
      rest.restHalf = hh;
    });
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
        placeRests(bar);
      });
    });
  }

  // Column spacing for a gap of `d` quarter-note beats, in staff spaces.
  function gapFor(d) { return 2.6 + 2.9 * Math.pow(Math.max(d, 0.125), 0.6); }

  // Named heads are wider than engraving glyphs. Separate simultaneous
  // voices as well as seconds within a chord, and share accidental columns.
  function spaceNamedHeads(column) {
    var occupied = [], left = 0, right = 1.84, accidentals = {}, maxAcc = 0;
    column.events.forEach(function (ev) {
      ev.namedOffset = 0;
      if (ev.kind !== 'note' || ev.hidden) return;
      var w = ev.base >= 4 ? 2.1 : 1.84, shift = {}, ps = ev.pitches;
      if (ev.up) {
        for (var i = 1; i < ps.length; i++) if (ps[i].diatonic - ps[i - 1].diatonic === 1 && !shift[i - 1]) shift[i] = w - .12;
      } else {
        for (var j = ps.length - 2; j >= 0; j--) if (ps[j + 1].diatonic - ps[j].diatonic === 1 && !shift[j + 1]) shift[j] = -(w - .12);
      }
      var offset = 0;
      function clashes() {
        return ps.some(function (p, k) { return occupied.some(function (q) {
          return q.staff === ev.staff && p.midi !== q.midi && Math.abs(p.diatonic - q.step) <= 1 &&
            Math.abs(offset + (shift[k] || 0) + w / 2 - q.center) < (w + q.width) / 2 + .15;
        }); });
      }
      while (clashes()) offset += 2.05;
      ev.namedOffset = offset;
      ps.forEach(function (p, k) {
        var x = offset + (shift[k] || 0);
        left = Math.min(left, x); right = Math.max(right, x + w);
        occupied.push({ staff: ev.staff, step: p.diatonic, midi: p.midi, center: x + w / 2, width: w });
        if (p.showAcc !== null) (accidentals[ev.staff] = accidentals[ev.staff] || []).push(p);
      });
    });
    Object.keys(accidentals).forEach(function (staff) {
      var cols = [];
      accidentals[staff].sort(function (a, b) { return b.diatonic - a.diatonic; }).forEach(function (p) {
        var col = 0;
        while (cols[col] && cols[col].some(function (s) { return Math.abs(s - p.diatonic) < 6; })) col++;
        (cols[col] = cols[col] || []).push(p.diatonic); p.namedAccColumn = col;
      });
      maxAcc = Math.max(maxAcc, cols.length);
    });
    column.acc = maxAcc;
    column.namedLeft = -left; column.namedExtra = right - 1.84;
  }

  // Width, in staff spaces, of a key signature change (cancelling naturals plus the new accidentals).
  function keyChangeUnits(from, to, readableSize) {
    var cancel = (from > 0 && to <= 0) || (from < 0 && to >= 0) ? Math.abs(from) : Math.max(0, Math.abs(from) - Math.abs(to));
    return (cancel * (readableSize ? 1.25 : 0.9) + Math.abs(to) * (readableSize ? 1.3 : 1.05)) + 0.8;
  }
  function graceUnits(ev) {
    return (ev.graces || []).reduce(function (w, g) { return w + 1.15 + (g.pitches.some(function (p) { return p.showAcc !== null; }) ? 0.85 : 0); }, 0);
  }

  // Reader layout preferences, shared by every score on the page (and by print): notation size, note
  // spacing, line spacing, and which staves are drawn. Hidden staves are still heard; only the
  // engraving leaves them out, so a student can print just the melody or just the bass.
  var LAYOUT_KEY = 'classroomos:score-layout';
  var layoutPrefs = { scale: 1, hgap: 1, vgap: 1, spread: false, hidden: {} };
  function clampPref(v, lo, hi) { v = Number(v); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : 1; }
  try {
    var savedLayout = JSON.parse(root.localStorage.getItem(LAYOUT_KEY));
    if (savedLayout && typeof savedLayout === 'object') {
      layoutPrefs.scale = clampPref(savedLayout.scale, 0.6, 1.8);
      layoutPrefs.hgap = clampPref(savedLayout.hgap, 0.6, 1.8);
      layoutPrefs.vgap = clampPref(savedLayout.vgap, 0.4, 1.8);
      layoutPrefs.spread = savedLayout.spread === true;
      if (savedLayout.hidden && typeof savedLayout.hidden === 'object') layoutPrefs.hidden = savedLayout.hidden;
    }
  } catch (err) { /* private mode, or Node */ }
  function saveLayoutPrefs() {
    try { root.localStorage.setItem(LAYOUT_KEY, JSON.stringify(layoutPrefs)); } catch (err) { /* private mode */ }
    if (root.dispatchEvent && root.CustomEvent) root.dispatchEvent(new root.CustomEvent('score-layout:change'));
  }
  // {staffIndex: true} for the staves this score should not draw. One staff always stays.
  function hiddenStaves(model) {
    var list = layoutPrefs.hidden[model.id], out = {}, left = model.staves.length;
    if (!Array.isArray(list) || model.staves.length < 2) return out;
    list.forEach(function (i) { if (model.staves[i] && !out[i] && left > 1) { out[i] = true; left--; } });
    return out;
  }

  function layoutBars(model, S, readableSize) {
    return model.barStart.map(function (b0, bi) {
      var times = {}, meta = model.barMeta[bi];
      var len = model.staves[0].bars[bi].length;
      // Things printed at the start of a bar, before its first note.
      var lead = 0;
      if (meta.repStart) lead += 1.6;
      if (meta.keyChange) lead += keyChangeUnits(meta.prevKey, meta.key, readableSize);
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
        if (root.MusicNotation.preferences.pitchNames) spaceNamedHeads(c);
        else c.events.forEach(function (ev) { ev.namedOffset = 0; });
        if (c.clef) x += 2.2;
        x += c.grace;
        c.accW = c.acc ? (readableSize ? 1.5 : 1.15) * c.acc + 0.2 : 0;
        x += c.accW;
        x += c.namedLeft || 0;
        c.x = x;
        var next = i + 1 < cols.length ? cols[i + 1].t : len;
        var w = gapFor(next - c.t) * layoutPrefs.hgap + (c.seconds ? 1.1 : 0) + (c.namedExtra || 0);
        widths.push(w);
        x += w;
      });
      if (meta.repEnd) x += 1.2;
      var whole = cols.length === 1 && cols[0].whole;
      if (whole) { cols[0].x = 4 + lead; x = 9 + lead + (meta.repEnd ? 1.2 : 0); }
      return { cols: cols, width: Math.max(x + 0.4, 6) * S, natural: x, whole: whole, lead: lead };
    });
  }

  function engrave(model, width, readableSize, windowed, readingLayout, pagePlan) {
    var M = root.MusicNotation;
    var S = (width < 520 ? 7.5 : width < 820 ? 8.5 : 9.5) * (readableSize ? 1.45 : 1) * layoutPrefs.scale;
    var vg = layoutPrefs.vgap;
    var h = S / 2;
    decideStems(model);
    var bars = layoutBars(model, S, readableSize);
    var tabConfig = model.score.tablature;
    var tabBars = tabConfig && root.GuitarTablature ? (model.guitarTabBars || (model.guitarTabBars = root.GuitarTablature.finger(model, tabConfig.tuning, tabConfig.pitchShift || 0, tabConfig))) : null;
    function keyW(k) { return Math.abs(k) * (readableSize ? 1.3 : k > 0 ? 1.05 : 0.95) * S; }
    var hidden = hiddenStaves(model);
    function hid(si) { return !!hidden[si]; }
    var shownIdx = model.staves.map(function (_, i) { return i; }).filter(function (i) { return !hidden[i]; });
    var firstShown = shownIdx[0], lastShown = shownIdx[shownIdx.length - 1];
    var grand = model.staves.length === 2 && shownIdx.length === 2 && model.score.grand !== false;
    var expressions = model.score.expressions || {};
    var suggestedFingers = false;
    try { suggestedFingers = !!root.document && root.localStorage.getItem('classroomos-score-fingering') === 'on'; } catch (e) { /* optional */ }
    function endpoint(point) {
      var st = model.staves[point.staff || 0], bar = st && st.bars[point.bar - 1];
      var notes = bar && bar.events.filter(function (ev) { return ev.kind === 'note' && ev.voice === (point.voice || 0); });
      return notes && notes[point.note < 0 ? notes.length + point.note : point.note || 0];
    }
    function covers(span, sys, si) {
      return !hid(si) && (span.staff || 0) === si && span.from.bar <= sys.bars[sys.bars.length - 1] + 1 && span.to.bar >= sys.first + 1;
    }
    var braceW = grand || shownIdx.length > 1 ? 1.4 * S : 0;
    var tsDigits = String(model.ts.num).length > String(model.ts.den).length ? String(model.ts.num) : String(model.ts.den);
    var timeW = (tsDigits.length * 1.8 + 1.2) * S;
    var left = 0.5 * S + braceW;
    function headerW(bi) { return 3.6 * S + keyW(model.barMeta[bi].key) + (bi === 0 ? timeW : 0) + 0.6 * S; }
    // In reading view only the system containing a dense bar needs to be wider.
    // Print and Fit use one width for the whole score.
    if (!readingLayout) width = Math.max(width, Math.ceil(left + headerW(0) + Math.max.apply(null, bars.map(function (bar) { return bar.width; })) + 2 * S));
    var lineWidth = width;

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
        avail = lineWidth - left - hw - 2 * S;
        if (readingLayout) {
          avail = Math.max(avail, b.width);
          width = Math.max(width, Math.ceil(left + hw + avail + 2 * S));
        }
        cur = { bars: [], used: 0, avail: avail, header: hw, first: bi };
        systems.push(cur);
      }
      cur.bars.push(bi); cur.used += b.width;
    });

    // Vertical extents per staff per system, in steps above the bottom line.
    function extents(sys, si) {
      var st = model.staves[si], hi = 8, lo = 0, dyn = false, violin = false;
      sys.bars.forEach(function (bi) {
        st.bars[bi].events.forEach(function (ev) {
          if (ev.dyn) dyn = true;
          if (model.violinFingerings?.has(ev)) violin = true;
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
      // Leave room for optional fingering outside beams and tuplet labels.
      var fingers = (suggestedFingers && (/hand/i.test(st.label || '') || st.instrument === 'piano')) ||
        sys.bars.some(function (bi) { return st.bars[bi].events.some(function (ev) { return !!ev.fingering; }); });
      // Teaching fingerings sit above the right hand and below the left hand.
      // Reserving both sides of both staves needlessly separates the grand staff.
      var rightHand = rightHandStaff(st);
      var slurs = (expressions.slurs || []).filter(function (span) { return covers(span, sys, si); });
      if (slurs.some(function (span) { return span.side === 'below'; })) lo -= 6;
      if (slurs.some(function (span) { return span.side !== 'below'; })) hi += 6;
      var directionLo = lo;
      var hasDirections = (expressions.directions || []).some(function (d) { return (d.staff || 0) === si && sys.bars.indexOf(d.bar - 1) >= 0; }) ||
        (expressions.hairpins || []).some(function (span) { return covers(span, sys, si); });
      var hasText = (expressions.directions || []).some(function (d) { return d.text && (d.staff || 0) === si && sys.bars.indexOf(d.bar - 1) >= 0; });
      return { hi: hi + 1 + (violin ? 3 : 0) + (fingers && rightHand ? 6 : 0), violinHi: hi, lo: lo - 1 - (hasText ? 9 : dyn || hasDirections ? 6 : 0) - (fingers && !rightHand ? 6 : 0), directionLo: directionLo };
    }

    var out = [], hl = [], y = 0, evIndex = 0;
    var measureRects = [], crossSystemTies = [];
    var separator = '<!--score-system-->';
    var ink = 'currentColor';
    var lineW = Math.max(1, 0.11 * S);
    var allEvents = [];
    var tupletDraws = [];
    function signatureAccidental(acc, x, y) {
      if (!readableSize) return M.accidental(acc, x, y, S);
      return '<rect class="se-accidental-back" x="' + (x - 0.08 * S) + '" y="' + (y - 1.7 * S) +
        '" width="' + (1.28 * S) + '" height="' + (3.4 * S) + '" rx="' + (0.08 * S) + '"/>' +
        M.accidental(acc, x, y, 1.18 * S);
    }

    function keySig(k, x, b, clef) {
      var s = '', pos = M.clefs[clef][k > 0 ? 'sharp' : 'flat'];
      for (var i = 0; i < Math.abs(k); i++) { s += signatureAccidental(k > 0 ? 1 : -1, x, b - pos[i] * h); x += (readableSize ? 1.3 : k > 0 ? 1.05 : 0.95) * S; }
      return s;
    }
    function keyChange(from, to, x, b, clef) {
      var s = '', cancel = 0, kind = from > 0 ? 'sharp' : 'flat';
      if ((from > 0 && to <= 0) || (from < 0 && to >= 0)) cancel = Math.abs(from);
      else cancel = Math.max(0, Math.abs(from) - Math.abs(to));
      var pos = M.clefs[clef][kind], startAt = Math.abs(from) - cancel;
      if ((from > 0 && to <= 0) || (from < 0 && to >= 0)) startAt = 0;
      for (var i = startAt; i < startAt + cancel; i++) { s += signatureAccidental(0, x, b - pos[i] * h); x += (readableSize ? 1.25 : 0.9) * S; }
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
      // Page view: paginate() moved this system to its place on a page.
      if (pagePlan && pagePlan.startY[sIndex] != null) y = pagePlan.startY[sIndex];
      var stretch = sys.avail / sys.used;
      var last = sIndex === systems.length - 1;
      // A ragged last line, unless it is a cut that filled a full line (score.justifyLast).
      if (last && stretch > 1.45 && !model.score.justifyLast) stretch = 1;
      if (stretch < 1) stretch = 1;
      var ext = model.staves.map(function (_, si) { return extents(sys, si); });
      var hasAbove = sys.bars.some(function (bi) { var mt = model.barMeta[bi]; return mt.volta || mt.fine || mt.dc || sectionAt[bi]; });
      var bottoms = [];
      var top = y + (sIndex === 0 && model.score.tempoText ? 2.4 * S : 0.6 * S) + (hasAbove ? 2.6 * S : 0);
      model.staves.forEach(function (st, si) {
        if (hid(si)) { bottoms.push(null); return; }
        var above = Math.max(8, ext[si].hi) * h;
        var below = Math.max(0, -ext[si].lo) * h;
        var gapAbove = si === 0 ? above : Math.max(above, 2.5 * S);
        var bottom = top + gapAbove;
        if (grand && si > 0) {
          // Compare the two hands measure by measure. Combining the lowest
          // RH note in one measure with the highest LH stem in another adds
          // empty space that no actual pair of notes needs.
          var separation = Math.max.apply(null, sys.bars.map(function (bi) {
            var one = { bars: [bi], first: bi }, upper = extents(one, si - 1), lower = extents(one, si);
            return (Math.max(0, -upper.lo) + Math.max(8, lower.hi)) * h + 1.2 * S * vg;
          }));
          bottom = bottoms[si - 1] + separation;
        }
        bottoms.push(bottom);
        // Piano staves sit close; ensemble staves need clear air between parts.
        top = bottom + below + (si < model.staves.length - 1 ? (grand ? 1.2 : 2.6) * S * vg : 0);
      });
      bottoms = bottoms.map(function (b) { return b == null ? bottoms[firstShown] : b; });
      var shownBottoms = shownIdx.map(function (i) { return bottoms[i]; });
      var sysTop = bottoms[firstShown] - 8 * h, sysBottom = bottoms[lastShown];
      var staffInkBottom = sysBottom + Math.max(0, -ext[lastShown].lo) * h;
      var tabTop = staffInkBottom + 4.2 * S, tabGap = 1.65 * S;
      if (tabBars) sysBottom = tabTop + (tabConfig.tuning.length - 1) * tabGap;
      var aboveY = sysTop - Math.max(0, ext[firstShown].hi - 9) * h - 1.4 * S;
      var x0 = left, x1 = left + sys.header + sys.bars.reduce(function (s, bi) { return s + bars[bi].width * stretch; }, 0);
      if (!last || stretch > 1) x1 = Math.min(x1, width - 1.5 * S);
      var sysKey = model.barMeta[sys.first].key;
      var barRanges = grand ? [[sysTop, sysBottom]] : shownBottoms.map(function (bb) { return [bb - 8 * h, bb]; });

      if (windowed) out.push(separator);
      out.push('<g data-se-system="' + sIndex + '">');
      // Staff lines, clefs, key and time signatures.
      model.staves.forEach(function (st, si) {
        if (hid(si)) return;
        var b = bottoms[si], clef = st.clefAt[sys.first];
        for (var l = 0; l < 5; l++) out.push('<line x1="' + x0 + '" x2="' + x1 + '" y1="' + (b - l * S) + '" y2="' + (b - l * S) + '" stroke="' + ink + '" stroke-width="' + lineW + '" class="se-line"/>');
        out.push(M.clef(clef, x0 + 0.7 * S, b, h));
        out.push(keySig(sysKey, x0 + 3.6 * S, b, clef));
        if (sys.first === 0) out.push(timeSigAt(model.ts, x0 + 3.6 * S + keyW(sysKey) + 0.5 * S, b));
      });
      if (shownIdx.length > 1) {
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
      if (tabBars) {
        out.push('<g class="se-tablature" aria-label="' + (tabConfig.tuning.length === 4 ? 'Bass tablature' : 'Guitar tablature') + '">');
        out.push('<text x="' + x0 + '" y="' + (tabTop - 1.3 * S) + '" font-size="' + S + '">' + M.escape(tabConfig.label || 'TAB') + '</text>');
        tabConfig.tuning.forEach(function (_, string) {
          var ty = tabTop + string * tabGap;
          out.push('<line class="se-line" x1="' + x0 + '" x2="' + x1 + '" y1="' + ty + '" y2="' + ty + '" stroke="currentColor" stroke-width="' + lineW + '"/>');
        });
        out.push('<text x="' + (x0 + S) + '" y="' + (tabTop + 3 * tabGap) + '" font-size="' + (1.3 * S) + '">TAB</text></g>');
      }
      var firstBarNo = barNumber(model, sys.bars[0]);
      if (firstBarNo > 1) out.push('<text class="se-barno" x="' + (x0 + 0.2 * S) + '" y="' + (sysTop - 1.0 * S - Math.max(0, ext[firstShown].hi - 9) * h) + '" font-size="' + (1.1 * S) + '">' + firstBarNo + '</text>');

      var bx0 = x0 + sys.header;
      var sysCols = [], systemEvents = [];
      var volta = null;
      sys.bars.forEach(function (bi, k) {
        var bar = bars[bi], bw = bar.width * stretch, meta = model.barMeta[bi];
        var barEvents = [];
        (windowed ? measureRects : out).push('<rect class="se-measure" data-measure="' + bi + '" x="' + bx0 + '" y="' + (sysTop - S) + '" width="' + bw + '" height="' + (sysBottom - sysTop + 2 * S) + '"/>');
        // Start-of-bar marks: repeat sign, key and time changes, clef changes.
        var lx = bx0 + 0.3 * S;
        if (meta.repStart) {
          out.push(repeatSign(lx - 0.3 * S + (k === 0 ? 0.4 * S : 0), 1, barRanges));
          out.push(repeatDots(lx + 1.15 * S + (k === 0 ? 0.4 * S : 0), shownBottoms));
          lx += 1.6 * S;
        }
        if (meta.keyChange) {
          if (k > 0) model.staves.forEach(function (st, si) { if (!hid(si)) out.push(keyChange(meta.prevKey, meta.key, lx, bottoms[si], st.clefAt[bi])); });
          lx += keyChangeUnits(meta.prevKey, meta.key, readableSize) * S;
        }
        if (meta.timeChange) { model.staves.forEach(function (st, si) { if (!hid(si)) out.push(timeSigAt(meta.ts, lx + 0.3 * S, bottoms[si])); }); lx += 2.8 * S; }
        if (bi > 0 && k > 0) model.staves.forEach(function (st, si) {
          if (!hid(si) && st.bars[bi].clefStart && st.bars[bi].clefStart !== st.clefAt[bi - 1]) out.push(smallClef(st.bars[bi].clefStart, lx + 0.2 * S, bottoms[si]));
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
        if (meta.fine || meta.dc) {
          out.push('<text class="se-volta se-jump" x="' + (bx0 + bw - 0.4 * S) + '" y="' + (aboveY + 1.4 * S) + '" font-size="' + (1.15 * S) + '" text-anchor="end">' + (meta.dc ? 'D.C. al Fine' : 'Fine') + '</text>');
        }
        var sx = function (u) { return bx0 + (bar.whole ? bw * 0.5 - 0.9 * S : u * S * stretch); };
        bar.cols.forEach(function (c) { c.px = sx(c.x); sysCols.push({ t: model.barStart[bi] + c.t, x: c.px, sys: sIndex }); });
        model.staves.forEach(function (st, si) {
          var b = bottoms[si];
          var barModel = st.bars[bi];
          barModel.events.forEach(function (ev) {
            var col = bar.cols.find(function (c) { return Math.abs(c.t - ev.start) < EPS; });
            ev.x = ev.whole ? bx0 + bw / 2 - 0.7 * S : col.px + (ev.namedOffset || 0) * S;
            ev.namedAccAnchor = col ? col.px - (col.namedLeft || 0) * S : ev.x;
            ev.accW = col ? col.accW : 0;
            ev.bottom = b; ev.hiddenStaff = hid(si); ev.sys = sIndex; ev.sysEnd = x1; ev.sysStart = bx0;
            ev.i = evIndex++;
            if (model.violinFingerings?.has(ev)) ev.violinY = b - ext[si].violinHi * h - 0.8 * S;
            allEvents.push(ev);
            systemEvents.push(ev);
            barEvents.push(ev);
          });
          // Beams first, so stems know where to stop.
          if (!hid(si)) barModel.beams.forEach(function (g) { placeBeam(g, st.clef, b, S, h); });
        });
        var crossBeams = [];
        (expressions.crossBeams || []).forEach(function (spec) {
          if (spec.bar !== bi + 1 || !grand) return;
          var events = spec.notes.map(endpoint);
          if (events.some(function (e) { return !e; })) return;
          var upper = Math.min.apply(null, events.map(function (e) { return e.staff; }));
          var lower = Math.max.apply(null, events.map(function (e) { return e.staff; }));
          // A beam between the hands gives upper notes downward stems and
          // lower notes upward stems, preserving the one rhythmic group.
          var yy = (bottoms[upper] + bottoms[lower] - 4 * S) / 2;
          var g = { events: events, up: true, levels: 2, crossStaff: true };
          events.forEach(function (e) { e.up = e.staff !== upper; e.beam = g; });
          g.x0 = stemX(events[0], S); g.x1 = stemX(events[events.length - 1], S);
          g.at = function (x) { return yy - Math.min(S, (g.x1 - g.x0) * .12) * (x - g.x0) / (g.x1 - g.x0); };
          model.staves.forEach(function (st) {
            st.bars[bi].beams = st.bars[bi].beams.filter(function (b) { return !b.events.some(function (e) { return events.indexOf(e) >= 0; }); });
          });
          crossBeams.push(g);
        });
        model.staves.forEach(function (st, si) {
          if (hid(si)) return;
          var b = bottoms[si], barModel = st.bars[bi];
          barModel.events.forEach(function (ev) { out.push(drawEvent(ev, ev.clef || st.clef, b, S, h, model, readableSize)); });
          barModel.beams.forEach(function (g) { out.push(drawBeam(g, S)); });
          barModel.events.forEach(function (ev) { if (ev.tupletStart && !(ev.beam && ev.beam.crossStaff)) tupletDraws.push(ev.tupletStart); });
        });
        crossBeams.forEach(function (g) {
          out.push('<g class="se-cross-staff-beam">' + drawBeam(g, S) +
            '<text class="se-tuplet" x="' + ((g.x0 + g.x1) / 2) + '" y="' + (g.at((g.x0 + g.x1) / 2) - S) + '" font-size="' + (1.15 * S) + '" text-anchor="middle">3</text></g>');
        });
        if (tabBars) {
          tabBars[bi].forEach(function (group) {
            var col = bar.cols.find(function (c) { return Math.abs(c.t - group.start) < EPS; });
            group.notes.forEach(function (note) {
              var event = barEvents.find(function (ev) { return Math.abs(ev.start - group.start) < EPS && ev.kind === 'note' && ev.pitches.some(function (p) { return p.midi + (tabConfig.pitchShift || 0) === note.midi; }); });
              if (!event || !col) return;
              var tx = col.px + 0.65 * S, ty = tabTop + Math.max(0, note.string) * tabGap;
              var label = note.string < 0 ? '×' : String(note.fret), tw = Math.max(1.25, label.length * 0.85) * S;
              out.push('<g class="se-tab-note" data-i="' + event.i + '"><title>' + M.escape(note.string < 0 ? 'No available string' : 'String ' + (note.string + 1) + ', fret ' + note.fret + (note.tied ? ', held' : '')) + '</title>');
              out.push('<rect class="se-tab-bg" x="' + (tx - tw / 2) + '" y="' + (ty - 0.8 * S) + '" width="' + tw + '" height="' + (1.6 * S) + '" rx="' + (0.2 * S) + '"/>');
              out.push('<text x="' + tx + '" y="' + (ty + 0.48 * S) + '" font-size="' + (1.35 * S) + '" text-anchor="middle">' + label + '</text>');
              if (note.tied) out.push('<path d="M ' + (tx - 0.65 * S) + ' ' + (ty + 0.8 * S) + ' q ' + (0.65 * S) + ' ' + S + ' ' + (1.3 * S) + ' 0" fill="none" stroke="currentColor"/>');
              out.push('</g>');
            });
          });
          out.push('<line x1="' + (bx0 + bw) + '" x2="' + (bx0 + bw) + '" y1="' + tabTop + '" y2="' + sysBottom + '" stroke="currentColor" stroke-width="' + lineW + '"/>');
        }
        var xe = bx0 + bw;
        var final = bi === model.count - 1;
        // An excerpt that stops mid-piece ("ending": "open") ends on a plain barline.
        if (meta.repEnd) {
          out.push(repeatDots(xe - 1.85 * S, shownBottoms));
          out.push(repeatSign(xe, -1, barRanges));
        } else if (final && model.score.ending !== 'open') {
          out.push('<line x1="' + (xe - 0.75 * S) + '" x2="' + (xe - 0.75 * S) + '" y1="' + sysTop + '" y2="' + sysBottom + '" stroke="' + ink + '" stroke-width="' + lineW * 1.4 + '"/>');
          out.push('<rect x="' + (xe - 0.5 * S) + '" y="' + sysTop + '" width="' + (0.5 * S) + '" height="' + (sysBottom - sysTop) + '" fill="currentColor"/>');
        } else {
          barRanges.forEach(function (r) {
            out.push('<line x1="' + xe + '" x2="' + xe + '" y1="' + r[0] + '" y2="' + r[1] + '" stroke="' + ink + '" stroke-width="' + lineW * 1.4 + '"/>');
          });
          if (!grand && shownIdx.length > 1) out.push('<line x1="' + xe + '" x2="' + xe + '" y1="' + sysTop + '" y2="' + sysBottom + '" stroke="' + ink + '" stroke-width="' + lineW * 1.4 + '"/>');
        }
        sysCols.push({ t: model.barStart[bi] + model.staves[0].bars[bi].length, x: xe - 0.6 * S, sys: sIndex, barEnd: true });
        bx0 = xe;
      });
      // Expression marks belong to each system so screen and paginated print
      // share the same notation. Continue spans at system boundaries.
      function timeX(point) {
        var t = model.barStart[point.bar - 1] + (point.beat || 0);
        var cols = sysCols.filter(function (c) { return !c.barEnd; });
        if (t <= cols[0].t) return cols[0].x;
        for (var ci = 1; ci < sysCols.length; ci++) {
          var a = sysCols[ci - 1], z = sysCols[ci];
          if (t <= z.t + EPS && z.t > a.t) return a.x + (z.x - a.x) * (t - a.t) / (z.t - a.t);
        }
        return x1 - S;
      }
      (expressions.slurs || []).forEach(function (span) {
        var si = span.staff || 0;
        if (!covers(span, sys, si)) return;
        var a = endpoint(Object.assign({ staff: si }, span.from)), z = endpoint(Object.assign({ staff: si }, span.to));
        if (!a || !z) return;
        var segment = systemEvents.filter(function (ev) { return ev.staff === si && ev.kind === 'note' && ev.abs >= a.abs - EPS && ev.abs <= z.abs + EPS; });
        if (!segment.length) return;
        var below = span.side === 'below', dir = below ? 1 : -1;
        var yy = below ? Math.max.apply(null, segment.map(function (e) { return Math.max(e.bottom - e.lo * h, e.tipY || -Infinity); })) :
          Math.min.apply(null, segment.map(function (e) { return Math.min(e.bottom - e.hi * h, e.tipY || Infinity); }));
        yy += dir * 2 * S;
        var xa = a.sys === sIndex ? a.x + 0.6 * S : left + sys.header;
        var xz = z.sys === sIndex ? z.x + 0.6 * S : x1 - 0.4 * S;
        var arch = dir * 1.05 * S;
        out.push('<path class="se-slur" d="M' + xa + ' ' + yy + ' C' + (xa + (xz - xa) / 4) + ' ' + (yy + arch) + ' ' + (xz - (xz - xa) / 4) + ' ' + (yy + arch) + ' ' + xz + ' ' + yy + '" fill="none" stroke="currentColor" stroke-width="' + (0.13 * S) + '"/>');
      });
      function directionY(si) { return bottoms[si] - Math.min(0, ext[si].directionLo) * h + 2 * S; }
      (expressions.directions || []).forEach(function (d) {
        if (sys.bars.indexOf(d.bar - 1) < 0 || hid(d.staff || 0)) return;
        var xx = timeX(d), yy = directionY(d.staff || 0);
        out.push('<g class="se-direction">' + (d.dynamic ? dynamicGlyphs(d.dynamic, xx, yy, S) :
          '<text x="' + xx + '" y="' + (yy + 1.6 * S) + '" font-size="' + (1.2 * S) + '" font-style="italic">' + M.escape(d.text) + '</text>') + '</g>');
      });
      (expressions.hairpins || []).forEach(function (span) {
        var si = span.staff || 0;
        if (!covers(span, sys, si)) return;
        var xa = timeX(span.from), xz = timeX(span.to), yy = directionY(si) - 0.4 * S;
        var open = 0.5 * S, cresc = span.type === 'crescendo';
        // A continuation retains its open end when a hairpin crosses a line.
        var ha = cresc ? (span.from.bar < sys.first + 1 ? open * 0.4 : 0) : open;
        var hz = cresc ? open : (span.to.bar > sys.bars[sys.bars.length - 1] + 1 ? open * 0.4 : 0);
        out.push('<path class="se-hairpin" d="M' + xa + ' ' + (yy - ha) + ' L' + xz + ' ' + (yy - hz) + ' M' + xa + ' ' + (yy + ha) + ' L' + xz + ' ' + (yy + hz) + '" fill="none" stroke="currentColor" stroke-width="' + (0.12 * S) + '"/>');
      });
      out.push('</g>');
      var inkBottom = tabBars ? sysBottom + 2 * S : sysBottom + Math.max(0, -ext[lastShown].lo) * h + S;
      hl.push({ index: sIndex, first: sys.first, top: y, bottom: inkBottom, right: x1, cols: sysCols });
      y = inkBottom + 1.2 * S * vg;
    });

    // Ties need every event placed first (they can cross bars and systems).
    allEvents.forEach(function (ev) {
      if (!ev.tie || !ev.tieTo || ev.hiddenStaff) return;
      var tie = '<g data-se-from="' + ev.sys + '" data-se-to="' + ev.tieTo.sys + '">' + drawTie(ev, S, h, model) + '</g>';
      if (windowed) crossSystemTies.push({ from: ev.sys, to: ev.tieTo.sys, svg: tie });
      else out.push(tie);
    });
    if (windowed) {
      // Decorations that belong to a single system are mounted alongside its notes.
      var decorations = systems.map(function () { return []; });
      tupletDraws.forEach(function (tp) {
        decorations[tp.events[0].sys].push(drawTuplet(tp, S, h));
      });
      var chunks = shareGlyphs(out.join(''), model.id).split(separator);
      return {
        svg: chunks[0] + measureRects.join(''), height: pagePlan ? pagePlan.height : Math.ceil(y + S), width: width, systems: hl, events: allEvents, S: S,
        notation: hl.map(function (_, i) { return chunks[i + 1] + decorations[i].join(''); }),
        ties: crossSystemTies
      };
    }
    tupletDraws.forEach(function (tp) { out.push('<g data-se-system="' + tp.events[0].sys + '">' + drawTuplet(tp, S, h) + '</g>'); });

    var height = pagePlan ? pagePlan.height : Math.ceil(y + S);
    return { svg: shareGlyphs(out.join(''), model.id), height: height, width: width, systems: hl, events: allEvents, S: S };
  }

  // Page view: lay engraved systems out on portrait US Letter sheets, the way a printed edition
  // (or MuseScore's page view) does. The layout's width is the 7.5in between the side margins.
  // Systems never straddle a sheet; full sheets spread their systems down the page (capped, so a
  // sheet with two systems doesn't look exploded). Pure: returns where each system starts, and the
  // sheets, in layout units. Page k's sheet starts at gap/2 + k * (height + gap), so the stack of
  // sheets begins at y = 0 with half a gap above the first.
  function paginate(layout, options) {
    options = options || {};
    var inch = layout.width / 7.5, S = layout.S;
    var page = {
      width: 8.5 * inch, height: 11 * inch, gap: 0.35 * inch,
      marginTop: 0.55 * inch, marginBottom: 0.6 * inch, title: options.title ? 1.23 * inch : 0, inch: inch
    };
    page.x = -(page.width - layout.width) / 2;   // centres the staves on the sheet
    var systems = layout.systems, between = 1.2 * S * layoutPrefs.vgap, sheets = [], startY = [];
    var sheet = null, cursor = 0;
    function open() {
      var top = sheet ? sheet.top + sheet.height + page.gap : page.gap / 2;
      sheet = { top: top, height: page.height, systems: [] };
      sheets.push(sheet);
      cursor = top + page.marginTop + (sheets.length === 1 ? page.title : 0);
    }
    open();
    systems.forEach(function (system, i) {
      var tall = system.bottom - system.top;
      if (sheet.systems.length && cursor + tall > sheet.top + page.height - page.marginBottom) open();
      startY[i] = cursor;
      sheet.systems.push(i);
      cursor += tall + between;
      // A system taller than a sheet (a big orchestral page) gets a taller sheet rather than clipping.
      sheet.height = Math.max(sheet.height, cursor - between - sheet.top + page.marginBottom);
    });
    sheets.forEach(function (s, k) {
      if (k === sheets.length - 1 || s.systems.length < 2) return;
      var last = s.systems[s.systems.length - 1];
      var spare = s.top + s.height - page.marginBottom - (startY[last] + systems[last].bottom - systems[last].top);
      var each = Math.max(0, Math.min(spare / (s.systems.length - 1), layoutPrefs.spread ? 6 * S : 0));
      s.systems.forEach(function (i, n) { startY[i] += n * each; });
    });
    var end = sheets[sheets.length - 1];
    sheets.forEach(function (s) { s.first = s.systems[0]; s.last = s.systems[s.systems.length - 1]; });
    return { startY: startY, sheets: sheets, page: page, height: Math.ceil(end.top + end.height + page.gap / 2) };
  }

  // Each glyph outline is defined once and reused (<use>): a whole symphony movement would otherwise
  // repeat the same notehead path thousands of times.
  function shareGlyphs(svg, id) {
    var ids = {}, defs = [], n = 0, prefix = 'sg-' + String(id || 'score').replace(/[^a-z0-9-]/gi, '') + '-';
    var body = svg.replace(/<path d="([^"]{40,})" fill="currentColor" stroke="none"\/>/g, function (all, d) {
      if (!ids[d]) { ids[d] = prefix + (n++); defs.push('<path id="' + ids[d] + '" d="' + d + '" fill="currentColor" stroke="none"/>'); }
      return '<use href="#' + ids[d] + '"/>';
    });
    // Coordinates to a tenth of a unit (glyph scale factors keep three significant figures).
    body = body.replace(/-?\d+\.\d{3,}/g, function (num) {
      var v = parseFloat(num), a = Math.abs(v);
      return a >= 10 ? String(Math.round(v * 10) / 10) : a >= 1 ? String(Math.round(v * 100) / 100) : String(+v.toPrecision(3));
    });
    return (defs.length ? '<defs>' + defs.join('') + '</defs>' : '') + body;
  }

  // Tuplet number centred over (or under) its notes.
  function drawTuplet(tp, S, h) {
    var evs = tp.events.filter(function (e) { return e.x != null && !e.hidden; });
    // Importers also use ratios for an isolated note's exact playback duration.
    // These are not visible tuplet groups (e.g. a lone 9:4 or 15:8 note).
    if (evs.filter(function (e) { return e.kind === 'note'; }).length < 2) return '';
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
  function headW(ev, S) {
    if (root.MusicNotation.preferences.pitchNames) return (ev.base >= 4 ? 2.1 : 1.84) * S;
    return (ev.base >= 4 ? 426 : 295) / 250 * S;
  }
  function durationLabel(ev) {
    if (ev.whole || ev.base >= 4) return 'whole note';
    var name = ev.base >= 2 ? 'half' : ev.base >= 1 ? 'quarter' : ev.base >= 0.5 ? 'eighth' : ev.base >= 0.25 ? 'sixteenth' : ev.base >= 0.125 ? 'thirty-second' : 'sixty-fourth';
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
    var levels = Math.max.apply(null, evs.map(function (e) { return Math.round(Math.log2(1 / e.base)); }));
    var minStem = levels >= 2 ? 3.0 * S + (levels - 2) * 0.75 * S : 2.75 * S;
    var noteY = function (e) { return g.up ? b - e.hi * h : b - e.lo * h; };
    var ya = noteY(first) + (g.up ? -3.5 : 3.5) * S, yb = noteY(last) + (g.up ? -3.5 : 3.5) * S;
    // A long ascending run must not turn into a diagonal ladder of stems.
    // Limit the total beam rise as well as its angle; stem clearance follows below.
    var maxSlope = Math.min(0.18, S / Math.abs(dx));
    var slope = Math.max(-maxSlope, Math.min(maxSlope, (yb - ya) / dx));
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
    [0.25, 0.125, 0.0625, 0.03125].forEach(function (lim, li) {
      for (var i = 0; i < evs.length; i++) {
        if (evs[i].base > lim) continue;
        var j = i;
        // Keep the primary compound beat intact, but expose its eighth-note
        // subdivisions in secondary beams (and quarter beats in simple time).
        var subdivision = g.unit >= 1.5 ? 0.5 : (g.unit || 1);
        while (j + 1 < evs.length && evs[j + 1].base <= lim &&
            Math.floor((evs[j + 1].start + EPS) / subdivision) === Math.floor((evs[i].start + EPS) / subdivision)) j++;
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

  function rightHandStaff(staff) {
    var label = staff.label || '';
    if (/left/i.test(label)) return false;
    if (/right/i.test(label)) return true;
    if (/accompaniment/i.test(label)) return false;
    if (/lead|melody/i.test(label)) return true;
    return staff.clef !== 'bass';
  }

  function drawEvent(ev, clef, b, S, h, model, readableSize) {
    var M = root.MusicNotation;
    var out = '<g class="se-ev" data-i="' + ev.i + '">';
    var lw = 0.12 * S;
    if (ev.clefChange) {
      var cx0 = ev.x - ((ev.accW || 0) + graceUnits(ev) + 2.2) * S + 0.1 * S;
      out += '<g class="se-clef-change">' + M.glyph(ev.clefChange, cx0, b - M.clefs[ev.clefChange].anchor * h, 2 * h * 0.72) + '</g>';
    }
    if (ev.fingering) {
      var above = rightHandStaff(model.staves[ev.staff]);
      var step = above ? Math.max(8, ev.hi + (ev.up ? 7 : 1)) : Math.min(0, ev.lo - (ev.up ? 1 : 7));
      var fingerY = b - step * h + (above ? -2 : 3) * S;
      out += '<text class="se-fingering" x="' + (ev.x + headW(ev, S) / 2) + '" y="' + fingerY + '" font-size="' + S + '" text-anchor="middle">' + ev.fingering + '</text>';
    }
    var violin = model.violinFingerings?.get(ev);
    if (violin) {
      out += '<text class="se-violin-finger" x="' + (ev.x + headW(ev, S) / 2) + '" y="' +
        ev.violinY + '" font-size="' + (1.08 * S) + '" text-anchor="middle" aria-label="' + M.escape(violin.description) +
        '">' + (violin.review ? '†' : violin.finger) + '<title>' + M.escape(violin.description) + '</title></text>';
    }
    if (ev.graces) out += drawGraces(ev, clef, b, S, h);
    if (ev.hidden) { ev.headX = ev.x; ev.headY = b - 4 * h; return out + '</g>'; }
    if (ev.kind === 'rest') {
      var mid = b - ev.restStep * h;
      if (ev.whole || ev.base >= 4) out += M.glyph('restWhole', ev.x, b - 6 * h, S);
      else if (ev.base >= 2) out += M.glyph('restHalf', ev.x, mid, S);
      else out += M.glyph(ev.base >= 1 ? 'restQuarter' : ev.base >= 0.5 ? 'rest8' : ev.base >= 0.25 ? 'rest16' : ev.base >= 0.125 ? 'rest32' : ev.base >= 0.0625 ? 'rest64' : 'rest128', ev.x, mid, S);
      for (var rd = 0; rd < ev.dots; rd++) out += '<circle cx="' + (ev.x + (1.6 + rd * 0.55) * S) + '" cy="' + (mid - h) + '" r="' + 0.18 * S + '" fill="currentColor"/>';
      ev.headX = ev.x; ev.headY = mid;
    } else {
      var w = headW(ev, S), name = headName(ev), namedHeads = '';
      var keyAlt = M.preferences.pitchNames ? keyAlters(model.barMeta[ev.bar].key) : null;
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
      var accCols = [], accBacks = [], accGlyphs = [];
      var accLeft = ev.x - 0.3 * S - (Object.keys(shifted).some(function (k) { return shifted[k] < 0; }) ? w : 0);
      if (M.preferences.pitchNames) accLeft = ev.namedAccAnchor - .3 * S;
      for (var a = ps.length - 1; a >= 0; a--) {
        if (ps[a].showAcc === null) continue;
        var col = 0;
        while (accCols[col] && accCols[col].some(function (s) { return Math.abs(s - steps[a]) < 6; })) col++;
        if (M.preferences.pitchNames) col = ps[a].namedAccColumn || 0;
        (accCols[col] = accCols[col] || []).push(steps[a]);
        var aw = ps[a].showAcc === 0 ? 0.68 : ps[a].showAcc < 0 ? 0.9 : 1.0;
        var accScale = readableSize ? 1.3 : 1;
        var ax = accLeft - aw * accScale * S - col * (readableSize ? 1.5 : 1.15) * S;
        var ay = b - steps[a] * h;
        if (readableSize) accBacks.push('<rect class="se-accidental-back" x="' + (ax - 0.1 * S) + '" y="' + (ay - 1.8 * S) +
          '" width="' + ((aw * accScale + 0.2) * S) + '" height="' + (3.6 * S) + '" rx="' + (0.1 * S) + '"/>');
        accGlyphs.push(M.accidental(ps[a].showAcc, ax, ay, accScale * S));
      }
      out += accBacks.join('') + accGlyphs.join('');
      ps.forEach(function (p, k) {
        var px = ev.x + (shifted[k] || 0) * (w - lw), py = b - steps[k] * h;
        if (M.preferences.pitchNames) {
          // Draw heads after stems and beams, as in the Fake Book, so the
          // colored oval and its letter remain unobscured.
          namedHeads += M.namedHead(p, px + w / 2, py, ev.base, keyAlt[p.l], S, 'se-nhead', M.preferences.noteColors);
        } else out += '<g class="se-notehead"' + (M.preferences.noteColors ? ' style="color:' + M.solfegeColor(p) + '"' : '') + '>' +
          M.glyph(name, px, py, S, 'se-head') + '</g>';
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
        var tip = ev.beam ? ev.beam.at(sx) + (ev.beam.crossStaff && !ev.up ? 1.25 * S : 0) : stemTip(ev, b, S, h);
        out += '<line class="se-stem" x1="' + sx + '" x2="' + sx + '" y1="' + from + '" y2="' + tip + '" stroke="currentColor" stroke-width="' + lw + '"/>';
        if (!ev.beam && ev.base <= 0.5) {
          var fl = ev.base <= 0.03125 ? '128' : ev.base <= 0.0625 ? '64' : ev.base <= 0.125 ? '32' : ev.base <= 0.25 ? '16' : '8';
          out += M.glyph('flag' + fl + (ev.up ? 'Up' : 'Down'), sx - (ev.up ? 0.06 * S : 0.06 * S), tip, S);
        }
        ev.tipY = tip;
      }
      out += namedHeads;
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
      if (!tiesFrom(ev, p)) return;
      var k2 = next.pitches.findIndex(function (q) { return q.midi === p.midi; });
      if (k2 < 0) return;
      var y1 = ev.bottom - ev.steps[k] * h;
      var below = ev.tieSide ? ev.tieSide === 'below' : ev.stem ? ev.stem === "down" : ev.pitches.length > 1 ? k < ev.pitches.length / 2 : ev.up;
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
      // Gentle bus compression: a 20 ms attack shapes loudness without riding inside the
      // waveform of low notes (a 3 ms attack distorts sustained tutti chords into sourness).
      var comp = audio.ctx.createDynamicsCompressor();
      [['threshold', -18], ['knee', 12], ['ratio', 4], ['attack', 0.02], ['release', 0.25]].forEach(function (s) {
        if (comp[s[0]]) comp[s[0]].value = s[1];
      });
      audio.out = audio.ctx.createGain();
      audio.out.gain.value = 0.9;
      audio.out.connect(comp);
      if (audio.ctx.createDelay) [.023, .047, .079].forEach(function (delayTime, i) {
        var delay = audio.ctx.createDelay(.1), tone = audio.ctx.createBiquadFilter(), level = audio.ctx.createGain();
        delay.delayTime.value = delayTime; tone.type = 'lowpass'; tone.frequency.value = 4300 - i * 800;
        level.gain.value = [.07, .045, .025][i];
        audio.out.connect(delay); delay.connect(tone); tone.connect(level); level.connect(comp);
      });
      comp.connect(kit ? kit.output() : audio.ctx.destination);
      if (kit) kit.onStop(function () { players.forEach(function (p) { if (p.playing || p.loading) p.halt(); }); });
    }
    if (kit) kit.resume();
    else if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return audio.ctx;
  }

  var players = [];
  var AUDIO_LOOKAHEAD = 0.25;
  // Engraving and fullscreen layout can block main-thread scheduling.
  var REDRAW_LOOKAHEAD = 0.65;

  function noteEnds(notes) {
    var end = 0;
    return notes.map(function (n) {
      end = Math.max(end, n.start + n.dur * (n.fermata ? 1.8 : 1));
      return end;
    });
  }

  // Mix headroom for ensembles: correlated doublings add almost linearly, so a 13-staff tutti
  // summed at full level hits the bus about 17 dB above a quiet passage. Scale every staff by the
  // score's peak polyphony (8 simultaneous notes play at full level) before compression.
  function mixHeadroom(notes) {
    var edges = [];
    notes.forEach(function (n) { if (!n.grace) { edges.push([n.start, 1]); edges.push([n.start + n.dur, -1]); } });
    edges.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var now = 0, peak = 0;
    edges.forEach(function (e) { now += e[1]; peak = Math.max(peak, now); });
    return peak > 8 ? Math.sqrt(8 / peak) : 1;
  }

  function Player(fig, model) {
    this.fig = fig; this.model = model;
    this.notes = playList(model);
    this.headroom = mixHeadroom(this.notes);
    this.ends = noteEnds(this.notes);
    this.maxVoices = 128;
    var sc = model.score;
    this.baseQpm = model.baseQpm;
    this.rate = 1; this.activeRate = 1; this.pos = 0; this.playing = false; this.voices = new Set();
    this.mutes = model.staves.map(function () { return false; });
    this.instrument = sc.instrument || 'piano';
    this.loadToken = 0; this.soundToken = 0; this.loading = false; this.samples = true; this.destroyed = false;
    this.loop = false;
    this.range = null;   // { from, to } in performance beats while a loop range is set
  }
  Player.prototype.span = function () {
    return this.loop && this.range ? this.range : { from: 0, to: this.model.perfTotal };
  };
  Player.prototype.qpm = function () { return this.baseQpm * this.rate; };
  Player.prototype.play = function (restartTime) {
    if (this.playing || this.destroyed) return;
    var self = this;
    players.forEach(function (p) { if (p !== self && (p.playing || p.loading)) p.halt(); });
    if (root.AudioKit && root.AudioKit.notifyPlay) root.AudioKit.notifyPlay({ source: 'score-engine' });
    var c = context();
    var span = this.span();
    if (this.pos >= span.to - EPS || this.pos < span.from - EPS) this.pos = span.from;
    this.playing = true;
    this.t0 = restartTime === undefined ? c.currentTime + 0.08 : restartTime;
    this.b0 = this.pos;
    this.activeRate = this.rate;
    this.previousTempo = null;
    this.scheduledUntil = c.currentTime;
    if (!this.staffOutputs) {
      this.staffOutputs = this.mutes.map(function (muted) {
        var gain = c.createGain();
        gain.gain.value = muted ? 0 : self.headroom;
        gain.connect(audio.out);
        return gain;
      });
    }
    // Include notes already sustaining at a seek/pause position. Prefix maximum
    // note ends let a late seek skip all earlier, fully completed polyphony.
    this.next = floorIndex(this.ends, this.pos + EPS) + 1;
    this.lastUiTime = null;
    this.timer = setInterval(function () { self.schedule(); }, 25);
    this.schedule();
    this.frame();
    this.ui.update();
  };
  Player.prototype.requestPlay = async function () {
    if (this.destroyed || this.loading || this.playing) return;
    var self = this, token = ++this.loadToken, c = context();
    this.soundToken++;
    if (this.soundSelection) Object.assign(this, this.soundSelection);
    players.forEach(function (p) { if (p !== self && (p.playing || p.loading)) p.halt(); });
    if (root.AudioKit && root.AudioKit.notifyPlay) root.AudioKit.notifyPlay({ source: 'score-engine' });
    // Resume synchronously with the gesture, then load only the roots used by this score.
    this.loading = true; this.ui.update();
    var report = await this.prepareSound(c, this.instrument, this.instOverride, this.samples);
    if (this.destroyed || token !== this.loadToken) return;
    this.loading = false;
    if (this.ui.soundStatus) this.ui.soundStatus(report);
    this.play();
  };
  Player.prototype.sampleInstrument = function (staffIndex) {
    var staff = this.model.staves[staffIndex], instrument = staff.instrument || this.instrument;
    if (this.model.staves.length < 3 || /solo/i.test(staff.label)) return instrument;
    var label = staff.label || '';
    if (instrument === 'viola' || /viola/i.test(label)) return 'viola-section';
    if (instrument === 'cello' || /cello|continuo bass/i.test(label)) return 'cello-section';
    if (instrument === 'violin' || instrument === 'strings') return 'violin-section';
    return instrument;
  };

  Player.prototype.prepareSound = async function (c, instrument, override, samples) {
    if (!samples || !root.MusicSynth.prepare) return { loaded: 0, failed: 0 };
    var grouped = new Map(), model = this.model;
    var transpose = Number(model.score.playbackTranspose) || 0;
    this.notes.forEach(function (n) {
      var sound = override ? instrument : (model.staves[n.staff].instrument ? this.sampleInstrument(n.staff) : instrument);
      if (!grouped.has(sound)) grouped.set(sound, new Set());
      grouped.get(sound).add(n.midi + transpose);
    }, this);
    return root.MusicSynth.prepare(c, Array.from(grouped, function (pair) {
      return { instrument: pair[0], pitches: Array.from(pair[1]) };
    }));
  };
  Player.prototype.setSound = async function (instrument, override, samples) {
    var token = ++this.soundToken;
    var selection = { instrument: instrument, instOverride: override, samples: samples };
    this.soundSelection = selection;
    var loading = this.loading;
    if (loading) this.halt();
    // Keep the current sound until the replacement is ready. Already queued
    // attacks and sounding notes keep their instruments and finish normally.
    var report = this.playing && samples ? await this.prepareSound(audio.ctx, instrument, override, samples) : null;
    if (this.destroyed || token !== this.soundToken) return;
    Object.assign(this, selection);
    if (loading) this.requestPlay();
    else if (report && this.playing && this.ui.soundStatus) this.ui.soundStatus(report);
  };
  Player.prototype.setMuted = function (staff, muted) {
    this.mutes[staff] = muted;
    if (!this.staffOutputs) return;
    var now = audio.ctx.currentTime, gain = this.staffOutputs[staff].gain;
    gain.setTargetAtTime(muted ? 0 : this.headroom, now, 0.008);
  };
  Player.prototype.beatAt = function (time) {
    var previous = this.previousTempo;
    if (previous && time < this.t0) return previous.beat + (time - previous.time) * previous.qpm / 60;
    return Math.max(this.pos, this.b0 + (time - this.t0) * this.baseQpm * this.activeRate / 60);
  };
  Player.prototype.timeOf = function (beat) { return this.t0 + (beat - this.b0) * 60 / (this.baseQpm * this.activeRate); };
  Player.prototype.schedule = function (lookahead) {
    var c = audio.ctx, now = c.currentTime, horizon = now + (lookahead || AUDIO_LOOKAHEAD), self = this, span = this.span();
    // Change tempo at the first unqueued instant. Already sounding attacks
    // keep their envelopes, and sustaining notes take their new release time.
    if (this.rate !== this.activeRate) {
      if (now < this.t0 && (!this.previousTempo || this.t0 >= this.scheduledUntil - EPS)) {
        this.activeRate = this.rate;
      } else if (now >= this.t0) {
        var boundary = Math.max(now, this.scheduledUntil);
        if (boundary < this.timeOf(span.to)) {
          var beat = this.beatAt(boundary);
          this.previousTempo = { time: this.t0, beat: this.b0, qpm: this.baseQpm * this.activeRate };
          this.t0 = boundary; this.b0 = beat; this.activeRate = this.rate;
        } else {
          var beatNow = this.beatAt(now);
          this.previousTempo = { time: this.t0, beat: this.b0, qpm: this.baseQpm * this.activeRate };
          this.t0 = now; this.b0 = beatNow; this.activeRate = this.rate;
        }
      }
    }
    while (this.next < this.notes.length && this.timeOf(this.notes[this.next].start) < horizon && this.notes[this.next].start < span.to - EPS) {
      var n = this.notes[this.next++];
      var end = n.start + n.dur * (n.fermata ? 1.8 : 1);
      if (n.fermata) {
        for (var j = this.next; j < this.notes.length; j++) {
          var nx = this.notes[j];
          if (nx.start >= end - EPS) break;
          if (!nx.grace && nx.staff === n.staff && nx.start >= n.start + n.dur - EPS) {
            end = Math.max(n.start + n.dur, nx.start - 0.02);
            break;
          }
        }
      }
      var attack = this.timeOf(Math.max(this.pos, n.start));
      // If a redraw outlasts even the extended buffer, resume the rhythm
      // without bunching the missed attacks together.
      if (attack < now - 0.04 || this.timeOf(Math.min(end, span.to)) <= now || end <= this.pos + EPS) continue;
      var st = this.model.staves[n.staff];
      var inst = this.instOverride ? this.instrument : (st.instrument || this.instrument);
      var t = Math.max(c.currentTime, attack);
      // Bound the Web Audio graph, including release tails. Steal the earliest
      // ending voice only at extreme density; ordinary scores keep every part.
      if (this.voices.size >= this.maxVoices) {
        var oldest = null;
        this.voices.forEach(function (voice) { if (!oldest || voice.endBeat < oldest.endBeat) oldest = voice; });
        oldest.kill(c.currentTime); this.voices.delete(oldest);
      }
      var v = root.MusicSynth.startVoice(c, this.staffOutputs[n.staff], inst, n.midi + (Number(this.model.score.playbackTranspose) || 0), n.vel, t, function (voice) { self.voices.delete(voice); }, { samples: this.samples, scoreExpression: true, sampleInstrument: this.instOverride ? this.instrument : this.sampleInstrument(n.staff) });
      v.startBeat = n.start;
      v.endBeat = end;
      this.voices.add(v);
    }
    this.voices.forEach(function (voice) {
      if (voice.releaseQueued) return;
      var end = Math.min(span.to, voice.endBeat);
      var release = Math.max(voice.t + 0.01, self.timeOf(end), c.currentTime);
      if (release >= horizon) return;
      voice.releaseQueued = true;
      voice.release(release);
    });
    this.scheduledUntil = Math.max(this.scheduledUntil, horizon);
    if (this.timeOf(span.to) < c.currentTime) {
      if (this.loop) {
        this.pos = span.from;
        this.playing = false;
        clearInterval(this.timer);
        cancelAnimationFrame(this.raf);
        this.stopVoices(true);
        this.play(c.currentTime);
      } else this.stop();
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
    this.loadToken++; this.loading = false;
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
    var now = audio.ctx.currentTime;
    // Visual updates at 30 fps remain fluid while leaving slower tablets enough
    // main-thread time for controls, scrolling and the audio scheduler.
    if (!this.lastUiTime || now - this.lastUiTime >= 1 / 30) {
      var beat = writtenBeat(this.model, this.beatAt(now));
      this.ui.light(beat);
      this.ui.cursor(beat);
      this.lastUiTime = now;
    }
    this.raf = requestAnimationFrame(function () { self.frame(); });
  };

  // "Complete piece · 34 bars · about 1:50" or "Excerpt · bars 1–8 of the whole song".
  function coverageText(model) {
    var sc = model.score, lastNo = barNumber(model, model.count - 1), firstNo = Math.max(1, model.firstBar);
    var secs = Math.round(model.perfTotal * 60 / model.baseQpm);
    var tempoLabel = /practice/i.test(sc.tempoText || '') ? 'practice tempo' : 'marked tempo';
    var time = ' · about ' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0') + ' at the ' + tempoLabel;
    var repeats = model.order.length > model.count ? ' with repeats' : '';
    if (sc.complete) return 'Complete piece · ' + lastNo + (lastNo === 1 ? ' bar' : ' bars') + repeats + time;
    if (sc.excerpt) return 'Excerpt · ' + (sc.excerpt.label || ('bars ' + (sc.excerpt.bars || (firstNo + '–' + lastNo)))) + (sc.excerpt.of ? ' of ' + sc.excerpt.of : '') + (repeats ? ' (with repeats)' : '');
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
  var LABELS = { piano: 'Piano', strings: 'Strings', organ: 'Organ', ePiano: 'Electric piano', pluck: 'Classical guitar', synth: 'Synth', pad: 'Warm pad', bass: 'Electric bass' };

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text) e.textContent = text;
    return e;
  }

  // The score edition stays in place until the reader is back on the page. iOS (Safari, and every
  // iOS browser, which are all WebKit) returns from print() and fires afterprint before it draws the
  // pages, so tearing the edition down on afterprint printed the lesson into the score's page count:
  // the lesson, then a run of blank sheets. Cleaning up on the next tap, click or key is safe
  // everywhere, since the portal only shows in print.
  var printScoreCleanup = null;
  function endPrintScore() { if (printScoreCleanup) printScoreCleanup(); }

  function preparePrintScorePages(score, options) {
    options = options || {};
    // A second Print score (another piece, or the same one again) starts from a fresh edition.
    endPrintScore();
    var model = prepare(score);
    analyse(model);
    if (options.violinPlan) model.violinFingerings = options.violinPlan(model);
    // Engrave at a fixed width so the paper edition does not depend on the
    // learner's screen size or score zoom setting.
    // Same large-print engraving the fake book uses: bigger staff, noteheads and
    // letters, fewer bars per line, so a handout reads from a desk or a music stand.
    var layout = engrave(model, 1085, true);
    if (!layout.systems.length) return false;
    var ns = 'http://www.w3.org/2000/svg';
    var portal = el('main', { class: 'se-print-score-pages', 'aria-hidden': 'true', 'data-contrast-guard-skip': '' });
    var source = document.createElementNS(ns, 'svg');
    source.innerHTML = layout.svg;
    source.querySelectorAll('.se-accidental-back').forEach(function (mask) { mask.style.setProperty('fill', '#fff', 'important'); });
    if (options.decorate) options.decorate(source, layout);
    // Each sheet carries only its systems, rather than a <use> of the whole
    // movement. Large scores otherwise render the full SVG once per page.
    var fragments = Array.from(source.children);
    var groups = [];
    // Portrait US Letter, 7.5in x 9.2in of staves per sheet (0.6in less on the first,
    // which carries the notation note). Pack by height, not by a fixed system count.
    // iOS ignores named @page sizes, so portrait is the one layout every device prints.
    var unitsPerInch = layout.width / 7.5;
    layout.systems.forEach(function (system) {
      var group = groups[groups.length - 1];
      var maxHeight = unitsPerInch * (groups.length === 1 ? 8.6 : 9.2);
      var cropTop = group && groups.length > 1 ? Math.max(0, group[0].top - layout.S * 1.8) : 0;
      if (!group || system.bottom - cropTop > maxHeight) {
        group = [];
        groups.push(group);
      }
      group.push(system);
    });
    groups.forEach(function (systems, index) {
      var first = systems[0], last = systems[systems.length - 1];
      var pad = layout.S * 1.8;
      var top = index === 0 ? 0 : Math.max(0, first.top - pad);
      // The system bound already includes space below the staff. Extending it
      // reaches the next system's bar number, which belongs on the next sheet.
      var bottom = Math.min(layout.height, last.bottom);
      var page = el('section', { class: 'se-print-score-page' });
      var header = el('header', { class: 'se-print-score-header' });
      header.appendChild(el('strong', {}, score.title || 'Score'));
      header.appendChild(el('span', {}, 'Score page ' + (index + 1) + ' of ' + groups.length));
      var svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('class', 'se-score');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', (score.title || 'Score') + ', page ' + (index + 1));
      svg.setAttribute('viewBox', '0 ' + top + ' ' + layout.width + ' ' + (bottom - top));
      // Explicit aspect ratio/height avoids the SVG default 300×150 viewport in
      // print engines, and scales an unusually tall orchestral system as a unit.
      var inches = Math.min(bottom - top, unitsPerInch * (index === 0 ? 8.6 : 9.2)) / unitsPerInch;
      svg.style.setProperty('height', inches + 'in', 'important');
      svg.setAttribute('preserveAspectRatio', 'xMidYMin meet');
      var firstIndex = first.index, lastIndex = last.index;
      fragments.forEach(function (fragment) {
        var system = fragment.getAttribute('data-se-system');
        var from = fragment.getAttribute('data-se-from'), to = fragment.getAttribute('data-se-to');
        var belongs = system !== null ? +system >= firstIndex && +system <= lastIndex :
          from !== null ? (+from >= firstIndex && +from <= lastIndex) || (+to >= firstIndex && +to <= lastIndex) : fragment.tagName.toLowerCase() === 'defs';
        if (belongs) svg.appendChild(fragment.cloneNode(true));
      });
      // Keep glyph references local to the sheet, including while the screen
      // edition remains in the DOM. Every page can render independently.
      var idMap = {};
      svg.querySelectorAll('[id]').forEach(function (node) { var id = node.id; node.id = idMap[id] = id + '-print-' + index; });
      svg.querySelectorAll('use[href]').forEach(function (use) {
        var id = use.getAttribute('href').slice(1);
        if (idMap[id]) use.setAttribute('href', '#' + idMap[id]);
      });
      page.append(header, svg);
      if (index === 0) {
        var aids = [];
        if (root.MusicNotation.preferences.pitchNames) aids.push('pitch letters (accidentals in notation)');
        if (root.MusicNotation.preferences.noteColors) aids.push('note colors');
        page.appendChild(el('p', { class: 'se-print-score-note' },
          (options.note ? options.note + ' ' : '') + 'Notation aids: ' + (aids.length ? aids.join(' and ') : 'off') + '. ' +
          (score.source && score.source.label ? 'Source: ' + score.source.label + '.' : '')));
      }
      portal.appendChild(page);
    });
    document.body.appendChild(portal);
    document.body.classList.add('se-print-score-active');
    var armed = false;
    function cleanup() {
      document.body.classList.remove('se-print-score-active');
      portal.remove();
      root.removeEventListener('afterprint', arm);
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (type) { root.removeEventListener(type, cleanup, true); });
      if (printScoreCleanup === cleanup) printScoreCleanup = null;
    }
    function arm() {
      if (armed) return;
      armed = true;
      // Deferred a tick so the click that opened the print dialog can't end it.
      setTimeout(function () {
        ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (type) { root.addEventListener(type, cleanup, true); });
      }, 0);
    }
    root.addEventListener('afterprint', arm);
    printScoreCleanup = cleanup;
    return true;
  }

  function printScorePages(score, options) {
    if (!preparePrintScorePages(score, options)) return;
    root.print();
  }

  // Piano scores get a "Finger numbers" toggle from score-fingering.js, fetched on first use.
  var fingeringLoad = null;
  function withFingering(use) {
    if (typeof document === 'undefined') return;
    if (root.ScoreFingering) { use(root.ScoreFingering); return; }
    if (!fingeringLoad) fingeringLoad = new Promise(function (resolve) {
      var tag = document.createElement('script');
      tag.src = new URL('score-fingering.js', scriptUrl || location.href).href;
      tag.onload = function () { resolve(root.ScoreFingering); };
      tag.onerror = function () { resolve(null); };
      document.head.appendChild(tag);
    });
    fingeringLoad.then(function (F) { if (F) use(F); });
  }

  function samplerAssetBase() { return scriptUrl || location.href; }

  var practiceMemory = new Map();
  var practiceThemeKey = 'classroomos:score-paper';
  var practiceThemes = { light: 'Light', dark: 'Dark', sepia: 'Sepia', contrast: 'High contrast' };

  // Pioneer score view settings: page view or line view, how a page fits the pane, staff size.
  var VIEW_KEY = 'classroomos:score-view';
  var PAGE_SIZES = {
    small: { width: 1800, readable: false, label: 'Small' },
    medium: { width: 1400, readable: false, label: 'Medium' },
    large: { width: 1085, readable: true, label: 'Large print' }
  };
  function readView() {
    var saved = null;
    try { saved = JSON.parse(root.localStorage.getItem(VIEW_KEY)); } catch (err) { /* private mode */ }
    saved = saved && typeof saved === 'object' ? saved : {};
    return {
      layout: saved.layout === 'lines' ? 'lines' : 'page',
      // A phone shows a whole letter page too small to read, so narrow panes start in line view
      // unless the reader chose a layout themselves.
      chosen: saved.layout === 'lines' || saved.layout === 'page',
      fit: saved.fit === 'width' ? 'width' : 'page',
      size: PAGE_SIZES[saved.size] ? saved.size : 'medium'
    };
  }
  function writeView(value) {
    try { root.localStorage.setItem(VIEW_KEY, JSON.stringify(value.chosen ? value : { fit: value.fit, size: value.size })); } catch (err) { /* private mode */ }
  }

  function readPractice(key) {
    if (practiceMemory.has(key)) return practiceMemory.get(key);
    try { return JSON.parse(root.localStorage.getItem(key)); } catch (err) { return null; }
  }

  function writePractice(key, value) {
    try {
      root.localStorage.setItem(key, JSON.stringify(value));
      practiceMemory.delete(key);
      return true;
    } catch (err) {
      practiceMemory.set(key, value);
      return false;
    }
  }

  function installPractice(fig, paper, model, id, displaySettings, jump, currentBar) {
    var marksKey = 'classroomos:score-marks:' + id;
    var positionKey = 'classroomos:score-position:' + id;
    var marks = readPractice(marksKey) || {};
    var lastBar = readPractice(positionKey);
    var selected = 0;
    var button = el('button', { type: 'button', class: 'se-practice', 'aria-haspopup': 'dialog', 'aria-label': 'Practice', title: 'Notes, highlights and checkpoints' });
    button.append(el('span', { class: 'se-narrow-icon', 'aria-hidden': 'true' }, '✎'), el('span', { class: 'se-label' }, 'Practice'));
    var dialog = el('dialog', { class: 'se-practice-dialog', 'aria-label': 'Score practice' });
    var header = el('header', {});
    var heading = el('h3', {}, 'Practice');
    var close = el('button', { type: 'button', autofocus: '' }, 'Close');
    header.append(heading, close);
    var themeLabel = el('label', { class: 'se-practice-theme' }, 'Score paper');
    var theme = el('select', {});
    Object.keys(practiceThemes).forEach(function (name) {
      theme.appendChild(el('option', { value: name }, practiceThemes[name]));
    });
    themeLabel.appendChild(theme);
    displaySettings.appendChild(themeLabel);
    var form = el('form', { class: 'se-practice-form' });
    var measure = el('h4', {}, 'Measure');
    var noteLabel = el('label', {}, 'Measure note');
    var note = el('textarea', { rows: '3', maxlength: '2000' });
    noteLabel.appendChild(note);
    var highlightLabel = el('label', { class: 'se-practice-check' });
    var highlight = el('input', { type: 'checkbox' });
    highlightLabel.append(highlight, document.createTextNode(' Highlight for practice'));
    var checkpointLabel = el('label', { class: 'se-practice-check' });
    var checkpoint = el('input', { type: 'checkbox' });
    checkpointLabel.append(checkpoint, document.createTextNode(' Mark as a checkpoint'));
    var save = el('button', { type: 'submit' }, 'Save measure');
    var feedback = el('p', { role: 'status' });
    form.append(measure, noteLabel, highlightLabel, checkpointLabel, save, feedback);
    var saved = el('section', {});
    var list = el('ul', {});
    var empty = el('p', {}, 'Your saved measures will appear here.');
    saved.append(el('h4', {}, 'Saved measures'), empty, list);
    dialog.append(header, form, saved);
    fig.appendChild(dialog);

    function valid(index) { return Number.isInteger(index) && index >= 0 && index < model.count; }
    function measureLabel(index) {
      var number = barNumber(model, index);
      return number === 0 ? 'Pickup' : 'Bar ' + number;
    }
    function paintMarks() {
      var svg = paper.querySelector('.se-score');
      if (!svg) return;
      var layer = svg.querySelector('.se-practice-marks');
      layer.replaceChildren();
      var rects = svg.querySelectorAll('.se-measure');
      // Draw practice ink below the staff, leaving the measure hit targets intact.
      Object.keys(marks).forEach(function (index) {
        var rect = rects[index], mark = marks[index];
        if (!rect) return;
        var ink = rect.cloneNode();
        ink.removeAttribute('data-measure');
        ink.setAttribute('class', 'se-practice-ink');
        ink.classList.toggle('se-practice-highlight', !!mark.highlight);
        ink.classList.toggle('se-practice-note', !!mark.note);
        ink.classList.toggle('se-practice-checkpoint', !!mark.checkpoint);
        layer.appendChild(ink);
      });
    }
    function applyTheme() {
      var name = readPractice(practiceThemeKey);
      theme.value = Object.hasOwn(practiceThemes, name) ? name : 'light';
      paper.dataset.scorePaper = theme.value;
    }
    function refresh(key) {
      if (key === practiceThemeKey || key === null) applyTheme();
      if (key === marksKey || key === null) {
        marks = readPractice(marksKey) || {};
        paintMarks();
        if (dialog.open) showSaved();
      }
    }
    function preferenceChanged(event) { refresh(event.detail); }
    function storageChanged(event) { refresh(event.key); }
    function publish(key, value) {
      var saved = writePractice(key, value);
      root.dispatchEvent(new CustomEvent('score:practice-change', { detail: key }));
      return saved;
    }
    function showSaved() {
      list.replaceChildren();
      Object.keys(marks).map(Number).filter(valid).sort(function (a, b) { return a - b; }).forEach(function (index) {
        var mark = marks[index];
        var row = el('li', {});
        var kinds = [];
        if (mark.checkpoint) kinds.push('Checkpoint');
        if (mark.highlight) kinds.push('Highlighted');
        if (mark.note) kinds.push('Note');
        var visit = el('button', { type: 'button' }, measureLabel(index) + ' · ' + kinds.join(', '));
        visit.addEventListener('click', function () { dialog.close(); jump(index); });
        row.appendChild(visit);
        if (mark.note) row.appendChild(el('p', {}, mark.note));
        list.appendChild(row);
      });
      empty.hidden = list.childElementCount > 0;
    }
    function showMeasure() {
      var mark = marks[selected] || {};
      measure.textContent = measureLabel(selected);
      note.value = mark.note || '';
      highlight.checked = !!mark.highlight;
      checkpoint.checked = !!mark.checkpoint;
    }
    button.addEventListener('click', function () {
      selected = currentBar();
      marks = readPractice(marksKey) || {};
      showMeasure();
      showSaved();
      feedback.textContent = '';
      dialog.showModal();
    });
    close.addEventListener('click', function () { dialog.close(); });
    // Let the dialog consume Escape before the score or lesson fullscreen handlers.
    dialog.addEventListener('keydown', function (event) { event.stopPropagation(); });
    theme.addEventListener('change', function () {
      publish(practiceThemeKey, theme.value);
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      marks = { ...readPractice(marksKey) };
      var annotation = { note: note.value.trim(), highlight: highlight.checked, checkpoint: checkpoint.checked };
      if (annotation.note || annotation.highlight || annotation.checkpoint) marks[selected] = annotation;
      else delete marks[selected];
      feedback.textContent = publish(marksKey, marks) ? measureLabel(selected) + ' updated.' : 'Updated for this visit. Browser storage is unavailable.';
    });
    root.addEventListener('score:practice-change', preferenceChanged);
    root.addEventListener('storage', storageChanged);
    applyTheme();
    return {
      button: button,
      start: valid(lastBar) ? lastBar : null,
      paint: paintMarks,
      remember: function (index) {
        if (lastBar === index && readPractice(positionKey) === index) return;
        lastBar = index;
        writePractice(positionKey, index);
      },
      destroy: function () {
        if (dialog.open) dialog.close();
        dialog.remove();
        root.removeEventListener('score:practice-change', preferenceChanged);
        root.removeEventListener('storage', storageChanged);
      }
    };
  }

  function installPianoRoll(workspace, bar, model, player, onSwitch, notation) {
    var panel = el('div', { class: 'se-roll', hidden: '', tabindex: '0', role: 'region',
      'aria-label': 'Piano roll. Notes fall onto the keyboard. Press Space to play or pause.' });
    var rollButton = el('button', { class: 'se-roll-toggle', type: 'button', 'aria-label': 'Piano roll', 'aria-pressed': 'false', title: 'Piano roll' });
    rollButton.append(el('span', { class: 'se-icon', 'aria-hidden': 'true' }, '▥'), el('span', { class: 'se-label' }, 'Roll'));
    var tools = el('div', { class: 'se-roll-tools' });
    var stripButton = el('button', { type: 'button', 'aria-pressed': 'false' }, 'Score strip');
    tools.appendChild(stripButton);
    var stripFollow = el('button', { type: 'button', class: 'se-strip-follow', hidden: '',
      'aria-label': 'Follow score strip', 'aria-pressed': 'true', title: 'Follow playback in the score strip' }, 'Follow strip');
    tools.appendChild(stripFollow);
    var strip = el('div', { class: 'se-roll-strip', hidden: '', role: 'region', tabindex: '0', 'aria-label': 'Sheet music strip. Scroll to read the next system.' });
    var scene = el('div', { class: 'se-roll-scene', 'aria-hidden': 'true' });
    panel.append(tools, strip, scene);
    workspace.appendChild(panel);
    bar.appendChild(rollButton);

    var colors = ['#48d8f6', '#9ae87d', '#f7ad67', '#bda7ff', '#ff9cb2'];
    var accidentals = [1, 3, 6, 8, 10];
    var transpose = Number(model.score.playbackTranspose) || 0;
    var lo = 60, hi = 71;
    player.notes.forEach(function (note) { lo = Math.min(lo, note.midi + transpose); hi = Math.max(hi, note.midi + transpose); });
    lo -= ((lo % 12) + 12) % 12;
    hi = Math.ceil((hi + 1) / 12) * 12 - 1;
    var pianoHands = model.staves.length <= 2 && model.staves.some(function (staff) { return staff.instrument === 'piano' || /hand/i.test(staff.label || ''); });
    function color(index) {
      return colors[pianoHands ? (rightHandStaff(model.staves[index]) ? 0 : 1) : index % colors.length];
    }
    var handLegend = [];
    if (model.staves.length === 2) {
      model.staves.forEach(function (staff, index) {
        var item = el('span', { class: 'se-roll-part' }, staff.label || 'Part ' + (index + 1));
        item.style.setProperty('--se-roll-part', color(index));
        tools.appendChild(item);
        handLegend.push(item);
      });
    }

    var voices = model.staves.map(function (staff) { return staff.voices.length; });
    var horizontal = false, shadeIntervals = true, graphNotes, graphEnds, graphParts, graphLow, graphHigh;
    if (voices.reduce(function (total, count) { return total + count; }, 0) > 1) {
      var viewLabel = el('label', { class: 'se-roll-view' }, 'View');
      var viewSelect = el('select', { 'aria-label': 'Visualization' });
      viewSelect.append(el('option', { value: 'roll' }, 'Piano roll'), el('option', { value: 'horizontal' }, 'Horizontal score'));
      viewLabel.appendChild(viewSelect);
      tools.prepend(viewLabel);
      var legend = el('details', { class: 'se-graph-legend', hidden: '' });
      legend.appendChild(el('summary', {}, 'Parts'));
      var legendPanel = el('div', { class: 'se-graph-legend-panel' });
      var shadeLabel = el('label', { class: 'se-graph-shades' });
      var shadeToggle = el('input', { type: 'checkbox', checked: '' });
      shadeLabel.append(shadeToggle, document.createTextNode(' Interval shading'));
      var explanation = el('p', {}, 'Brighter shades mean larger pitch changes from the previous attack’s highest note in that voice. First notes use the base shade.');
      var shadeKey = el('ul', { class: 'se-graph-shade-key', 'aria-label': 'Interval shades' });
      ['Repeated pitch', '1–2 semitones', '3–5 semitones', '6+ semitones'].forEach(function (label, index) {
        var item = el('li', { class: 'se-roll-part' }, label);
        item.style.setProperty('--se-roll-part', graphColor(195, index));
        shadeKey.appendChild(item);
      });
      var partsList = el('ul', { class: 'se-graph-parts', 'aria-label': 'Voice colors' });
      legendPanel.append(shadeLabel, explanation, shadeKey, partsList);
      legend.appendChild(legendPanel);
      shadeToggle.addEventListener('change', function () {
        shadeIntervals = shadeToggle.checked;
        paint(currentPerformanceBeat(player));
      });
      tools.appendChild(legend);
      viewSelect.addEventListener('change', function () {
        horizontal = viewSelect.value === 'horizontal';
        if (horizontal && !graphNotes) prepareGraph(partsList);
        legend.hidden = !horizontal;
        legend.open = false;
        handLegend.forEach(function (item) { item.hidden = horizontal; });
        panel.classList.toggle('se-roll-horizontal', horizontal);
        panel.setAttribute('aria-label', horizontal
          ? 'Horizontal score. Higher bars are higher pitches. Longer bars are longer notes. Voice colors and interval shades are listed under Parts. Press Space to play or pause.'
          : 'Piano roll. Notes fall onto the keyboard. Press Space to play or pause.');
        viewWidth = null;
        paint(currentPerformanceBeat(player));
      });
    }

    var open = false, stripOn = false, followStrip = true, lastSystem, lastLayout, lastWrittenBar, lastKeys;
    var stripOffsets = new Map(), stripCursor, stripSystem, stripColumns, stripColumnTimes, stripScale;
    var viewWidth, viewHeight, hit, locations, svg, lanes, falling, whites, blacks;
    var ns = 'http://www.w3.org/2000/svg';
    function layer() { return document.createElementNS(ns, 'g'); }
    function rect(x, y, w, h, fill, radius, extra) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill +
        '" rx="' + (radius || 0) + '"' + (extra || '') + '/>';
    }

    function graphColor(hue, shade) {
      // Brighter shades indicate wider changes in pitch within the same voice.
      var lightness = [49, 62, 74, 87][shade];
      return 'hsl(' + hue + ' 80% ' + lightness + '%)';
    }

    function prepareGraph(list) {
      graphNotes = playList(model, true);
      graphEnds = noteEnds(graphNotes);
      graphLow = Infinity; graphHigh = -Infinity;
      graphNotes.forEach(function (note) {
        graphLow = Math.min(graphLow, note.midi + transpose);
        graphHigh = Math.max(graphHigh, note.midi + transpose);
      });
      if (!Number.isFinite(graphLow)) { graphLow = 60; graphHigh = 72; }
      graphLow -= 3; graphHigh += 3;
      var hueOrder = [191, 38, 287, 147, 352, 230, 72, 319, 165, 16, 263, 49, 207, 115, 332, 252, 92, 8];
      var index = 0;
      graphParts = model.staves.map(function (staff, si) {
        return staff.voices.map(function (_, vi) {
          var hue = hueOrder[index++ % hueOrder.length];
          var part = { color: graphColor(hue, 1), shades: [0, 1, 2, 3].map(function (shade) { return graphColor(hue, shade); }) };
          var label = staff.label || 'Staff ' + (si + 1);
          if (staff.voices.length > 1) label += ' · Voice ' + (vi + 1);
          var item = el('li', { class: 'se-roll-part' }, label);
          item.style.setProperty('--se-roll-part', part.color);
          list.appendChild(item);
          return part;
        });
      });

      // Group chords by onset so notes in one chord share the same preceding reference.
      var priorAttacks = new Map();
      graphNotes.forEach(function (note) {
        var key = note.staff + ':' + note.voice;
        var attack = priorAttacks.get(key);
        if (!attack || note.start > attack.time + EPS) {
          attack = { time: note.start, highest: note.midi, reference: attack?.highest };
          priorAttacks.set(key, attack);
        }
        attack.highest = Math.max(attack.highest, note.midi);
        var steps = Math.abs(note.midi - attack.reference);
        note.shade = !Number.isFinite(steps) ? 1 : steps === 0 ? 0 : steps <= 2 ? 1 : steps <= 5 ? 2 : 3;
      });
    }

    function graphBar(start, end, y, half) {
      var radius = Math.min(half, (end - start) / 2);
      var top = y - half, bottom = y + half;
      return 'M' + (start + radius) + ' ' + top + ' H' + (end - radius) +
        ' Q' + end + ' ' + top + ' ' + end + ' ' + y +
        ' Q' + end + ' ' + bottom + ' ' + (end - radius) + ' ' + bottom +
        ' H' + (start + radius) + ' Q' + start + ' ' + bottom + ' ' + start + ' ' + y +
        ' Q' + start + ' ' + top + ' ' + (start + radius) + ' ' + top + ' Z';
    }

    function paintGraph(beat, width, height) {
      if (width !== viewWidth || height !== viewHeight) {
        viewWidth = width; viewHeight = height;
        svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        falling = layer();
        var pitchGrid = layer();
        pitchGrid.classList.add('se-graph-pitch-grid');
        var pitchLines = '';
        for (var midi = Math.ceil(graphLow / 12) * 12; midi <= graphHigh; midi += 12) {
          var y = graphPitchY(midi, height);
          if (midi % 24 === 0) pitchLines += rect(0, graphPitchY(midi + 12, height), width, y - graphPitchY(midi + 12, height), '#1a2935');
          pitchLines += rect(0, y, width, 1, '#334554') +
            '<text x="8" y="' + (y - 4) + '">C' + (midi / 12 - 1) + '</text>';
        }
        pitchGrid.innerHTML = pitchLines;
        svg.append(pitchGrid, falling);
        scene.replaceChildren(svg);
      }
      // Past notes remain to the left of a stationary playhead.
      var scale = width / Math.max(2, 6 * player.qpm() / 60);
      var head = Math.round(width * .32), from = beat - head / scale;
      var span = player.span(), until = Math.min(span.to, from + width / scale);
      var xAt = function (time) { return head + (time - beat) * scale; };
      var grid = '', notes = '', sounding = '';
      for (var barIndex = Math.max(0, floorIndex(model.perfStart, from)); model.perfStart[barIndex] <= until; barIndex++) {
        var x = xAt(model.perfStart[barIndex]);
        if (x < 0) continue;
        grid += rect(Math.round(x), 0, 1, height, '#31343b') +
          '<text x="' + (x + 5) + '" y="16">' + barNumber(model, model.order[barIndex]) + '</text>';
      }
      var spacing = (graphPitchY(graphLow, height) - graphPitchY(graphHigh, height)) / Math.max(1, graphHigh - graphLow);
      var half = Math.min(10, Math.max(3, spacing * .7));
      for (var i = Math.max(0, floorIndex(graphEnds, from - EPS)); i < graphNotes.length && graphNotes[i].start <= until; i++) {
        var note = graphNotes[i];
        if (player.mutes[note.staff] || note.start < span.from || note.start >= span.to) continue;
        var end = Math.min(span.to, note.start + note.dur * (note.fermata ? 1.8 : 1));
        if (end <= from) continue;
        var startX = xAt(note.start), endX = Math.max(startX + 3, xAt(end));
        var part = graphParts[note.staff][note.voice];
        var y = graphPitchY(note.midi + transpose, height);
        var ink = shadeIntervals ? part.shades[note.shade] : part.color;
        var active = note.start <= beat + EPS && end > beat && player.playing;
        var glyph = '<path class="se-graph-note" d="' + graphBar(startX, endX, y, half) + '" fill="' + ink + '"';
        var attack = '<circle cx="' + (startX + half / 2) + '" cy="' + y + '" r="' + Math.max(1, half * .55) + '"/>';
        if (active) {
          sounding += glyph + ' stroke="#d7f2ff" stroke-width=".65"/>' +
            '<g class="se-graph-attack se-graph-attack-active" fill="' + ink + '">' + attack + '</g>';
        } else {
          notes += glyph + ' stroke="' + ink + '" stroke-width=".7" opacity="' + (end <= beat ? '.55' : '.94') + '"/>' +
            '<g class="se-graph-attack" fill="' + ink + '">' + attack + '</g>';
        }
      }
      falling.innerHTML = grid + rect(head - 3, 0, 7, height, '#78cfed', 0, ' opacity=".10"') +
        rect(head, 0, 1, height, '#78cfed') + notes + sounding;
    }

    function graphPitchY(midi, height) {
      return 27 + (graphHigh - midi) * Math.max(1, height - 43) / Math.max(1, graphHigh - graphLow);
    }

    function resize(width, height) {
      viewWidth = width; viewHeight = height; lastKeys = null;
      hit = height - Math.min(86, Math.max(36, Math.round(height * .17)));
      var whiteCount = (hi - lo + 1) / 12 * 7, unit = width / whiteCount, x = 0;
      locations = new Map();
      var grid = '';
      for (var midi = lo; midi <= hi; midi++) {
        var black = accidentals.includes(((midi % 12) + 12) % 12), w = unit * (black ? .61 : 1);
        locations.set(midi, { x: black ? x - w / 2 : x, width: w, black: black });
        if (!black) {
          grid += rect(x, 0, 1, hit, midi % 12 === 0 ? '#3f4b56' : '#293139');
          x += unit;
        }
      }
      svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      lanes = layer(); falling = layer(); whites = layer(); blacks = layer();
      var backdrop = layer();
      backdrop.innerHTML = grid;
      svg.append(backdrop, lanes, falling, whites, blacks);
      scene.replaceChildren(svg);
    }

    function paintStrip(beat) {
      if (!stripOn) return;
      var view = notation();
      if (!view.layout || !view.source) return;
      var systems = view.layout.systems;
      var writtenBar = model.order[Math.max(0, floorIndex(model.perfStart, beat))];
      if (lastLayout !== view.layout || lastWrittenBar !== writtenBar) {
        lastWrittenBar = writtenBar;
        stripSystem = systems.findLastIndex(function (system) { return system.first <= writtenBar; });
      }
      if (lastLayout !== view.layout || (followStrip && lastSystem !== stripSystem)) {
        buildStrip(view, stripSystem);
      }
      var offset = stripOffsets.get(stripSystem);
      if (offset == null) {
        stripCursor.setAttribute('visibility', 'hidden');
        return;
      }
      var system = systems[stripSystem], printed = writtenBeat(model, beat);
      var columns = system.cols;
      if (columns !== stripColumns) {
        stripColumns = columns;
        stripColumnTimes = columns.map(function (col) { return col.t; });
      }
      // Repeated performance bars point back to the same written columns.
      var colIndex = Math.max(0, floorIndex(stripColumnTimes, printed + EPS));
      var from = columns[colIndex], to = columns[colIndex + 1] || from;
      var fraction = to.t > from.t ? Math.max(0, Math.min(1, (printed - from.t) / (to.t - from.t))) : 0;
      var x = offset + from.x + fraction * (to.x - from.x);
      stripCursor.setAttribute('visibility', 'visible');
      stripCursor.setAttribute('transform', 'translate(' + x + ' 0)');
      if (followStrip) strip.scrollLeft = x * stripScale - strip.clientWidth * .32;
    }

    function buildStrip(view, current) {
      lastLayout = view.layout; lastSystem = current;
      stripOffsets.clear();
      var page = document.createElementNS(ns, 'svg');
      page.setAttribute('aria-hidden', 'true');
      page.classList.add('se-roll-strip-score');
      // Measure actual ink after mounting, including ledger lines, ornaments,
      // dynamics and the lowest staff. System spacing alone can omit that ink.
      page.setAttribute('width', view.layout.width);
      page.setAttribute('height', view.layout.height);
      strip.replaceChildren(page);
      var width = 0, height = 0;
      var padding = Math.ceil(view.layout.S);
      var first = Math.max(0, current - 1);
      for (var index = first; index < Math.min(view.layout.systems.length, first + 12); index++) {
        var system = view.layout.systems[index];
        var group = layer();
        if (view.layout.notation) group.innerHTML = view.layout.notation[system.index];
        else view.source.querySelectorAll('[data-se-system="' + system.index + '"]').forEach(function (node) { group.appendChild(node.cloneNode(true)); });
        group.querySelectorAll('.se-finger-number, .se-violin-finger, .se-measure').forEach(function (node) { node.remove(); });
        page.appendChild(group);
        var ink = group.getBBox();
        var offset = width + padding - ink.x;
        stripOffsets.set(system.index, offset);
        group.setAttribute('transform', 'translate(' + offset + ' ' + (padding - ink.y) + ')');
        width += Math.ceil(ink.width + padding * 2);
        height = Math.max(height, Math.ceil(ink.height + padding * 2));
        // Keep enough following systems mounted to fill a wide strip after fitting.
        if (index >= current + 1 && width * fittedStripScale(height) >= strip.clientWidth * 1.6) break;
      }
      stripCursor = layer();
      stripCursor.classList.add('se-strip-playhead');
      stripCursor.innerHTML = '<path d="M0 0 V' + height + '"/><path d="M-5 0 H5 L0 8 Z"/>';
      page.appendChild(stripCursor);
      page.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      fitStrip(page);
    }

    function fittedStripScale(height) {
      var style = getComputedStyle(strip);
      var verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      var available = Math.max(40, panel.clientHeight - tools.offsetHeight);
      // Reserve room for the horizontal scrollbar even when it is always visible.
      var room = Math.max(20, Math.min(320, available * .54) - verticalPadding - 16);
      return Math.min(1, room / Math.max(1, height));
    }

    function fitStrip(page) {
      var bounds = page.viewBox.baseVal;
      stripScale = fittedStripScale(bounds.height);
      page.setAttribute('width', Math.ceil(bounds.width * stripScale));
      page.setAttribute('height', Math.floor(bounds.height * stripScale));
    }

    function paint(beat) {
      if (!open) return;
      paintStrip(beat);
      var width = scene.clientWidth, height = scene.clientHeight;
      if (!width || !height) return;
      if (horizontal) {
        if ((width !== viewWidth || height !== viewHeight) && strip.firstElementChild) fitStrip(strip.firstElementChild);
        if (scene.clientHeight) paintGraph(beat, scene.clientWidth, scene.clientHeight);
        return;
      }
      if (width !== viewWidth || height !== viewHeight) {
        if (strip.firstElementChild) fitStrip(strip.firstElementChild);
        resize(scene.clientWidth, scene.clientHeight);
      }
      var span = player.span(), secondsAhead = 3.5;
      var ahead = Math.max(1, secondsAhead * player.qpm() / 60);
      var scale = hit / ahead, end = Math.min(span.to, beat + ahead);
      var grid = '', notes = '', active = new Map();
      var barIndex = Math.max(0, floorIndex(model.perfStart, beat));
      for (var bi = barIndex; model.perfStart[bi] <= end; bi++) {
        var start = model.perfStart[bi];
        if (start < beat) continue;
        var lineY = hit - (start - beat) * scale;
        grid += rect(0, lineY, width, 1, '#53606b') + '<text x="7" y="' + Math.min(hit - 4, lineY + 15) + '">' +
          barNumber(model, model.order[bi]) + '</text>';
      }
      var index = Math.max(0, floorIndex(player.ends, beat - EPS));
      for (; index < player.notes.length && player.notes[index].start <= end; index++) {
        var note = player.notes[index];
        if (player.mutes[note.staff] || note.start >= span.to || note.start < span.from) continue;
        var stop = Math.min(span.to, note.start + note.dur * (note.fermata ? 1.8 : 1));
        if (stop <= beat) continue;
        var midi = note.midi + transpose, key = locations.get(midi), ink = color(note.staff);
        var y = Math.max(0, hit - (stop - beat) * scale), bottom = Math.min(hit, hit - (note.start - beat) * scale);
        var gutter = Math.min(2, key.width * .12);
        notes += rect(key.x + gutter, y, key.width - gutter * 2, Math.max(1, bottom - y), ink, gutter);
        if (note.start <= beat + EPS && (beat > span.from || player.playing)) active.set(midi, ink);
      }
      var keys = JSON.stringify(Array.from(active));
      if (keys !== lastKeys) {
        lastKeys = keys;
        paintKeyboard(active, height);
      }
      lanes.innerHTML = grid;
      falling.innerHTML = notes;
    }

    function paintKeyboard(active, height) {
      var natural = '', sharp = '', keyHeight = height - hit;
      locations.forEach(function (key, midi) {
        var color = active.get(midi), h = keyHeight * (key.black ? .63 : 1);
        var shape = rect(key.x, hit, key.width, h, color || (key.black ? '#24303b' : '#f3f7fa'), 2, ' stroke="#56616b" stroke-width=".8"');
        if (key.black) sharp += shape;
        else {
          natural += shape;
          if (midi % 12 === 0 && key.width >= 11) natural += '<text class="se-roll-octave" x="' + (key.x + key.width / 2) +
            '" y="' + (height - 7) + '">' + 'C' + (midi / 12 - 1) + '</text>';
        }
      });
      whites.innerHTML = natural;
      blacks.innerHTML = sharp;
    }

    rollButton.addEventListener('click', function () {
      open = !open;
      rollButton.setAttribute('aria-pressed', String(open));
      panel.hidden = !open;
      workspace.classList.toggle('se-roll-open', open);
      onSwitch(open);
    });
    stripButton.addEventListener('click', function () {
      stripOn = !stripOn;
      stripButton.setAttribute('aria-pressed', String(stripOn));
      strip.hidden = !stripOn;
      stripFollow.hidden = !stripOn;
      if (!stripOn) { strip.replaceChildren(); lastLayout = null; }
      paint(currentPerformanceBeat(player));
    });
    function setStripFollow(on) {
      followStrip = on;
      stripFollow.setAttribute('aria-pressed', String(on));
      if (on) paint(currentPerformanceBeat(player));
    }
    stripFollow.addEventListener('click', function () { setStripFollow(!followStrip); });
    strip.addEventListener('wheel', function (event) {
      if (event.deltaX || event.shiftKey) setStripFollow(false);
    }, { passive: true });
    strip.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'touch' || event.target === strip) setStripFollow(false);
    }, { passive: true });
    strip.addEventListener('keydown', function (event) {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) setStripFollow(false);
    });
    return { get open() { return open; }, paint: paint };
  }

  function currentPerformanceBeat(player) {
    return player.playing ? player.beatAt(audio.ctx.currentTime) : player.pos;
  }

  function render(fig, score, options) {
    if (fig.scorePlayer && fig.scorePlayer.destroy) fig.scorePlayer.destroy();
    var model;
    try {
      model = prepare(score);
      analyse(model);
    } catch (err) {
      fig.insertBefore(el('p', { class: 'se-error' }, 'Score could not be drawn: ' + err.message), fig.firstChild);
      return null;
    }
    fig.classList.add('se-figure');
    // Programmatically rendered scores do not always have a data-score attribute.
    // Preserve the light paper and matching controls in night mode and every skin.
    fig.setAttribute('data-night-keep', '');
    fig.setAttribute('data-skin-keep', '');
    fig.scoreData = score;
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

    var practiceId = /\/lessons\/music\/pioneers\//.test(location.pathname) && (options?.practiceId || score.id);
    var workspace = el('div', { class: practiceId ? 'se-workspace se-reading' : 'se-workspace' });
    var toolbar = el('div', { class: 'se-toolbar' });
    var bar = el('div', { class: 'se-controls', role: 'group', 'aria-label': 'Score player' });
    var settings = el(practiceId ? 'dialog' : 'details', { class: 'se-settings' });
    var settingsLabel = practiceId ? 'Score settings' : 'Sound, display & print';
    var settingsSummary = el(practiceId ? 'button' : 'summary', { title: settingsLabel, 'aria-label': settingsLabel });
    if (practiceId) {
      settingsSummary.type = 'button';
      settingsSummary.className = 'se-settings-button';
      settingsSummary.setAttribute('aria-haspopup', 'dialog');
    }
    settingsSummary.appendChild(el('span', { class: 'se-icon', 'aria-hidden': 'true' }, '⚙'));
    settingsSummary.appendChild(el('span', { class: 'se-label' }, practiceId ? 'Settings' : settingsLabel));
    var settingsBar = el('div', { class: 'se-options se-controls', role: 'group', 'aria-label': 'Sound and notation options' });
    var displaySettings = settingsBar, soundSettings = settingsBar, partSettings = settingsBar;
    if (practiceId) {
      settings.classList.add('se-settings-dialog');
      settings.setAttribute('aria-label', 'Score settings');
      var settingsHeader = el('header', {});
      var dismissSettings = el('button', { type: 'button', autofocus: '' }, 'Done');
      settingsHeader.append(el('h3', {}, 'Score settings'), dismissSettings);
      settings.prepend(settingsHeader);
      displaySettings = el('fieldset', { class: 'se-display-settings' });
      displaySettings.appendChild(el('legend', {}, 'Notation'));
      soundSettings = el('fieldset', { class: 'se-sound-settings' });
      soundSettings.appendChild(el('legend', {}, 'Playback'));
      settingsBar.append(displaySettings, soundSettings);
      if (model.staves.length > 1) {
        partSettings = el('fieldset', { class: 'se-part-settings' });
        partSettings.appendChild(el('legend', {}, 'Parts to hear'));
        settingsBar.appendChild(partSettings);
      }
      settingsSummary.addEventListener('click', function () { settings.showModal(); });
      dismissSettings.addEventListener('click', function () { settings.close(); });
      settings.addEventListener('keydown', function (event) { event.stopPropagation(); });
    } else {
      settings.appendChild(settingsSummary);
    }
    settings.appendChild(settingsBar);
    var playBtn = el('button', { type: 'button', class: 'se-play', 'aria-pressed': 'false' }, '▶ Play');
    var playIcon = el('span', { class: 'se-narrow-icon', 'aria-hidden': 'true' }, '▶');
    var playLabel = el('span', { class: 'se-label' }, '▶ Play');
    if (practiceId) {
      playBtn.setAttribute('aria-label', 'Play');
      playBtn.replaceChildren(playIcon, playLabel);
    }
    var stopBtn = el('button', { type: 'button', class: 'se-stop', 'aria-label': 'Stop and go back to the start' }, '■');
    var tempoLbl = el('label', { class: 'se-tempo-ctl' });
    tempoLbl.appendChild(el('span', {}, 'Speed'));
    var tempo = el('input', { type: 'range', min: '40', max: '130', step: '5', value: '100', 'aria-label': 'Playback speed, percent of the marked tempo' });
    var tempoOut = el('output', {}, '100%');
    tempoLbl.appendChild(tempo); tempoLbl.appendChild(tempoOut);
    var instLbl = el('label', { class: 'se-inst' });
    instLbl.appendChild(el('span', {}, practiceId ? 'Instrument' : 'Sound'));
    var inst = el('select', { 'aria-label': 'Instrument sound' });
    var auto = el('option', { value: '' }, 'As written');
    inst.appendChild(auto);
    root.MusicSynth.instruments.forEach(function (k) { inst.appendChild(el('option', { value: k }, LABELS[k] || (root.MusicSynth.labels && root.MusicSynth.labels[k]) || k)); });
    instLbl.appendChild(inst);
    var qualityLabel = el('label', {});
    qualityLabel.appendChild(el('span', {}, practiceId ? 'Quality' : 'Playback'));
    var quality = el('select', { 'aria-label': 'Playback sound quality' });
    quality.appendChild(el('option', { value: 'sampled' }, practiceId ? 'Recorded samples' : 'Recorded instruments'));
    quality.appendChild(el('option', { value: 'synth' }, practiceId ? 'Synthesis' : 'Lightweight synthesis'));
    qualityLabel.appendChild(quality); soundSettings.appendChild(qualityLabel);
    var sampleCredit = el('p', { class: 'se-sample-credit' });
    sampleCredit.appendChild(el('a', { href: new URL('../audio/instruments/README.md', samplerAssetBase()).href, target: '_blank', rel: 'noopener' }, 'Instrument recordings · sources & licenses'));
    soundSettings.appendChild(sampleCredit);
    var loopLbl = el('label', { class: 'se-check' });
    var loop = el('input', { type: 'checkbox' });
    var loopText = document.createTextNode(' Loop');
    loopLbl.appendChild(loop); loopLbl.appendChild(loopText);
    var clearLoop = el('button', { type: 'button', class: 'se-toggle se-clear-loop', hidden: '' }, 'Clear loop range');
    bar.append(playBtn, stopBtn);
    if (practiceId) soundSettings.prepend(tempoLbl, instLbl);
    else { bar.appendChild(tempoLbl); soundSettings.appendChild(instLbl); }
    bar.append(loopLbl, clearLoop);
    var muteBoxes = [], soloBtns = [];
    if (model.staves.length > 1) {
      var partActions = el('div', { class: 'se-part-actions' });
      var allPartsBtn = el('button', { type: 'button', class: 'se-toggle se-parts-all' }, 'All parts');
      allPartsBtn.addEventListener('click', function () {
        muteBoxes.forEach(function (box, idx) {
          box.checked = true;
          player.setMuted(idx, false);
        });
        soloBtns.forEach(function (btn) { btn.setAttribute('aria-pressed', 'false'); btn.classList.remove('is-on'); });
        if (roll?.open) roll.paint(currentPerformanceBeat(player));
      });
      partActions.appendChild(allPartsBtn);
      partSettings.appendChild(partActions);
      model.staves.forEach(function (st, si) {
        var row = el('div', { class: 'se-part-row' });
        var l = el('label', { class: 'se-check' });
        var cb = el('input', { type: 'checkbox', checked: '' });
        cb.checked = true;
        var staffLabel = st.label || 'Staff ' + (si + 1);
        l.appendChild(cb); l.appendChild(document.createTextNode(' ' + staffLabel));
        var soloBtn = el('button', { type: 'button', class: 'se-toggle se-part-solo', 'aria-pressed': 'false', 'aria-label': 'Solo ' + staffLabel }, 'Solo');
        soloBtn.addEventListener('click', function () {
          var alreadySolo = muteBoxes.every(function (box, idx) { return idx === si ? box.checked : !box.checked; });
          muteBoxes.forEach(function (box, idx) {
            var on = alreadySolo ? true : idx === si;
            box.checked = on;
            player.setMuted(idx, !on);
          });
          soloBtns.forEach(function (btn, idx) {
            var active = !alreadySolo && idx === si;
            btn.setAttribute('aria-pressed', String(active));
            btn.classList.toggle('is-on', active);
          });
          if (roll?.open) roll.paint(currentPerformanceBeat(player));
        });
        row.append(l, soloBtn);
        partSettings.appendChild(row); muteBoxes.push(cb); soloBtns.push(soloBtn);
      });
    }
    var full = el('button', { type: 'button', class: 'se-full', 'aria-label': 'Show the score full screen', 'aria-pressed': 'false', title: 'Full screen' });
    var fullIcon = el('span', { class: 'se-icon', 'aria-hidden': 'true' }, '⛶');
    var fullText = el('span', { class: 'se-label' }, 'Full screen');
    full.append(fullIcon, fullText);
    // Fewer controls: keeps Play, the bar readout and the timeline, and gives the rest of the pane to the score.
    var more = el('button', { type: 'button', class: 'se-more', 'aria-expanded': 'true', 'aria-label': 'Hide extra controls', title: 'Fewer controls, more score' }, '▴');
    var position = el('output', { class: 'se-position', 'aria-live': 'off' }, 'Bar ' + barNumber(model, 0));
    bar.appendChild(position);
    if (practiceId) displaySettings.appendChild(more); else bar.appendChild(more);
    bar.appendChild(full);
    var timeline = el('div', { class: 'se-timeline' });
    var elapsed = el('output', { 'aria-live': 'off' }, '0:00');
    var seek = el('input', { type: 'range', min: '0', max: String(model.perfTotal), step: '0.01', value: '0', 'aria-label': 'Playback position' });
    var duration = el('output', { 'aria-live': 'off' });
    timeline.append(elapsed, seek, duration);
    var status = el('p', { class: 'se-status', 'aria-live': 'polite' });
    var help = el('p', { class: 'se-help' }, 'Click a measure to start there, or a note to hear it. Shift-click a second measure to loop the bars between. Keys: Space in the score plays or pauses; [ and ] move a line, − and = zoom, F fits the score.');
    var guideBox = null, guideNow = null, guideList = null;

    var cap = fig.querySelector('figcaption');
    fig.insertBefore(head, cap);
    fig.insertBefore(workspace, cap);
    // Drag the grip (or use the arrow keys on it) to make the score pane taller or shorter.
    var grip = el('div', { class: 'se-resize', role: 'separator', tabindex: '0', 'aria-orientation': 'horizontal',
      'aria-label': 'Resize the score pane. Up and down arrows change its height; double-click or Home resets it.', title: 'Drag to resize · double-click to reset' });
    workspace.append(toolbar, paper, grip);
    toolbar.append(bar, timeline, practiceId ? settingsSummary : settings);
    if (practiceId) fig.appendChild(settings);
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
    fig.scorePlayer = player;
    function hasDenseNotation() {
      var events = 0;
      return model.staves.some(function (staff) {
        events += staff.bars.reduce(function (count, bar) { return count + bar.events.length; }, 0);
        return events >= 2000;
      });
    }
    var windowed = fig.hasAttribute('data-score-windowed') &&
      (model.count >= 150 || model.count * model.staves.length >= 600 || hasDenseNotation());
    var notationLayer, systemTops, windowStart = -1, windowEnd = -1;
    var scrollFrame = 0;
    var layout = null, eventsByBar = [], eventNodes = [], tabEventNodes = [], cursorColumns = [], cursorTimes = [], lit = new Set(), cursorEl = null, staffScale = 1, screenScale = 1, fitMode = practiceId ? 'reading' : 'fit', lastDrawWidth = null, lastDrawHeight = null;
    function paperWidth() {
      return Math.max(120, Math.round(svgWrap.clientWidth || paper.clientWidth || 640));
    }
    // Page view (pioneer readers): the piece engraved at a fixed letter-page width and laid out on
    // sheets, one sheet filling the pane at a time, like a printed part or MuseScore's page view.
    // Line view is the older layout that reflows lines to the pane. Remembered per browser.
    var view = readView(), pageZoom = null, pageSnapEls = [], pageIndex = 0;
    function paged() { return !!practiceId && view.layout === 'page' && (view.chosen || (paper.clientWidth || 1e4) >= 600); }
    function pageScale() {
      var pages = layout.pages, pw = Math.max(120, paper.clientWidth - 24), ph = Math.max(160, paper.clientHeight);
      var widthScale = pw / pages.page.width;
      if (pageZoom) return widthScale * pageZoom;
      if (view.fit === 'width') return widthScale;
      return Math.min(widthScale, ph / (pages.page.height + pages.page.gap));
    }
    function snapping() { return paged() && !pageZoom && view.fit !== 'width'; }
    function applyPageScale() {
      screenScale = pageScale();
      var pages = layout.pages, svg = svgWrap.querySelector('svg');
      if (svg) { svg.setAttribute('width', pages.page.width * screenScale); svg.setAttribute('height', pages.height * screenScale); }
      paper.classList.toggle('se-snap', snapping());
      pageSnapEls.forEach(function (node) { node.remove(); });
      pageSnapEls = pages.sheets.map(function (sheet) {
        var node = el('div', { class: 'se-page-snap', 'aria-hidden': 'true' });
        node.style.top = Math.max(0, (sheet.top - pages.page.gap / 2) * screenScale) + 'px';
        svgWrap.appendChild(node);
        return node;
      });
      updatePager();
    }
    function sheetOfSystem(index) {
      var sheets = layout.pages.sheets;
      for (var k = sheets.length - 1; k >= 0; k--) if (sheets[k].first <= index) return k;
      return 0;
    }
    function currentSheet() {
      if (!layout || !layout.pages) return 0;
      var at = (paper.scrollTop + paper.clientHeight * 0.35) / screenScale, sheets = layout.pages.sheets, k = 0;
      sheets.forEach(function (sheet, i) { if (sheet.top - layout.pages.page.gap / 2 <= at) k = i; });
      return k;
    }
    // A page turn is instant, like turning a printed sheet. turnedByReader pauses Follow.
    function showSheet(k, turnedByReader) {
      var sheets = layout.pages.sheets;
      k = Math.max(0, Math.min(sheets.length - 1, k));
      if (turnedByReader) navigation.pauseFollow();
      paper.scrollTo({ top: Math.max(0, (sheets[k].top - layout.pages.page.gap / 2) * screenScale), behavior: 'instant' });
    }
    var pager = el('div', { class: 'se-pager', role: 'group', 'aria-label': 'Pages', hidden: '' });
    var pagePrev = el('button', { type: 'button', 'aria-label': 'Previous page', title: 'Previous page' }, '‹');
    var pageOut = el('output', { 'aria-live': 'polite' }, '');
    var pageNext = el('button', { type: 'button', 'aria-label': 'Next page', title: 'Next page' }, '›');
    pager.append(pagePrev, pageOut, pageNext);
    pagePrev.addEventListener('click', function () { showSheet(currentSheet() - 1, true); });
    pageNext.addEventListener('click', function () { showSheet(currentSheet() + 1, true); });
    function updatePager() {
      var on = paged() && !roll?.open && layout && layout.pages;
      pager.hidden = !on;
      if (!on) return;
      var count = layout.pages.sheets.length;
      pageIndex = currentSheet();
      pageOut.textContent = 'Page ' + (pageIndex + 1) + ' / ' + count;
      pagePrev.disabled = pageIndex <= 0;
      pageNext.disabled = pageIndex >= count - 1;
    }
    paper.addEventListener('scroll', function () { if (paged() && layout && layout.pages && currentSheet() !== pageIndex) updatePager(); }, { passive: true });
    function pageMarkup() {
      var pages = layout.pages, p = pages.page, inch = p.inch, esc = root.MusicNotation.escape, out = ['<g class="se-pages" aria-hidden="true">'];
      pages.sheets.forEach(function (sheet, k) {
        out.push('<rect class="se-sheet" x="' + p.x + '" y="' + sheet.top + '" width="' + p.width + '" height="' + sheet.height + '"/>');
        if (pages.sheets.length > 1) out.push('<text class="se-page-number" x="' + (layout.width / 2) + '" y="' + (sheet.top + sheet.height - 0.3 * inch) + '" font-size="' + 0.15 * inch + '" text-anchor="middle">' + (k + 1) + '</text>');
      });
      var top = pages.sheets[0].top + p.marginTop;
      // The header uses the same sheet units as the staves, with room for long titles to wrap.
      out.push('<foreignObject x="0" y="' + top + '" width="' + layout.width +
        '" height="' + (p.title - 0.1 * inch) + '"><div xmlns="http://www.w3.org/1999/xhtml" class="se-page-heading" style="font-size:' + inch + 'px">');
      out.push('<div class="se-page-title">' + esc(score.title || 'Score') + '</div>');
      if (score.subtitle) out.push('<div class="se-page-subtitle">' + esc(score.subtitle) + '</div>');
      if (score.composer) out.push('<div class="se-page-composer">' + esc(score.composer) + '</div>');
      out.push('</div></foreignObject>');
      out.push('</g>');
      return out.join('');
    }
    var syncViewControls = function () {};
    function setView(patch) {
      var sheet = layout && layout.pages ? currentSheet() : -1;
      Object.keys(patch).forEach(function (k) { view[k] = patch[k]; });
      if (patch.layout) view.chosen = true;
      writeView(view);
      pageZoom = null; layout = null; lastDrawWidth = null;
      if (view.layout === 'lines') { staffScale = 1; fitMode = 'reading'; }
      syncViewControls();
      draw();
      if (paged() && sheet >= 0 && !patch.size) showSheet(sheet);
      navigation.refresh();
    }
    // Zoom sets the staff size; the lines reflow so they still fill the paper. Zooming out
    // engraves more bars per line instead of shrinking a fixed page into one corner.
    function engraveWidth(z) { return Math.max(practiceId && fitMode !== 'fit' ? 240 : 280, Math.round(paperWidth() / z)); }
    function drawWidth() { return engraveWidth(staffScale); }
    function displayedScale() {
      if (!fitMode) return staffScale;
      var widthScale = Math.min(staffScale, paperWidth() / layout.width);
      if (fitMode === 'reading') return Math.min(staffScale, paperWidth() / drawWidth());
      return Math.min(widthScale, Math.max(120, paper.clientHeight - 12) / layout.systems[0].bottom);
    }
    function fitWidth(preset) {
      // Reflow at normal engraving size, then fit the widest bar and one full
      // system. A dense bar on a phone must never disappear beyond the edge.
      if (!isFull() && !document.fullscreenElement?.contains(fig) && !fig.closest('.creation-app-expanded')) {
        var header = document.querySelector('.site-header');
        workspace.style.scrollMarginTop = (header ? Math.max(0, Math.min(100, header.getBoundingClientRect().bottom)) : 8) + 'px';
        workspace.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
      if (paged() && preset !== 'reading') { pageZoom = null; if (layout && layout.pages) applyPageScale(); else draw(); return; }
      if (paged()) { view.layout = 'lines'; view.chosen = true; writeView(view); syncViewControls(); }
      staffScale = 1; fitMode = preset === 'reading' ? 'reading' : 'fit'; layout = null; draw();
    }
    function applyScale() { draw(); }
    function measureAt(beat) { return floorIndex(model.barStart, beat + EPS); }
    // The shared ScoreNavigation: song map, measure jump and steps, fast visual zoom,
    // and follow playback inside the paper. Choosing a measure seeks there; playback carries on.
    var sectionStart = {};
    (score.sections || []).forEach(function (sec) { var bi = barIndexOf(model, sec.bar); if (bi >= 0) sectionStart[bi] = sec; });
    var guide = buildGuide(model);
    var selectedBar = 0, loopBars = null;
    var practice = practiceId ? installPractice(fig, paper, model, practiceId, displaySettings,
      function (index) { navigation.go(index, { source: 'practice' }); },
      function () {
        if (!player.playing) return measureAt(writtenBeat(model, player.pos));
        player.pause();
        selectedBar = measureAt(writtenBeat(model, player.pos));
        navigation.select(selectedBar);
        practice.remember(selectedBar);
        return selectedBar;
      }) : null;
    var restoreBar = practice && practice.start;
    var playbackBar = -1;
    if (practice) bar.appendChild(practice.button);
    function setLoopBars(a, b) {
      if (a > b) { var t = a; a = b; b = t; }
      loopBars = { from: a, to: b };
      var from = perfBeat(model, model.barStart[a]);
      var to = perfBeat(model, model.barStart[b], from) + model.staves[0].bars[b].length;
      player.range = { from: from, to: Math.max(to, from + model.staves[0].bars[a].length) };
      player.loop = true; loop.checked = true;
      // While playing, notes already queued past the new loop end would ring over the seam.
      if (player.playing) {
        var at = player.beatAt(audio.ctx.currentTime);
        player.halt();
        player.pos = at >= player.range.from - EPS && at < player.range.to - EPS ? at : player.range.from;
        player.play();
      }
      var rangeLabel = 'Loop bars ' + barNumber(model, a) + '–' + barNumber(model, b);
      if (practiceId) { loopLbl.title = rangeLabel; loop.setAttribute('aria-label', rangeLabel); }
      else loopText.textContent = ' ' + rangeLabel;
      clearLoop.hidden = false;
      navigation.refresh();
    }
    function clearLoopRange() {
      loopBars = null; player.range = null;
      loopText.textContent = ' Loop'; clearLoop.hidden = true;
      loopLbl.removeAttribute('title'); loop.removeAttribute('aria-label');
      navigation.refresh();
    }
    var navigation = root.ScoreNavigation({ surface: paper, selector: '.se-measure', scroller: paper, keyScope: fig, ignore: '.se-ev, .se-tab-note',
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
        if (practice && !info.preview) {
          restoreBar = null;
          practice.remember(i);
        }
        showGuide(i);
        if (!info.noSeek && !(info.preview && player.playing)) player.seek(model.barStart[i]);
        position.textContent = 'Bar ' + barNumber(model, i) + ' / ' + barNumber(model, model.count - 1);
        updateTimeline(player.pos);
      },
      fitLabel: practiceId ? 'Fit' : 'Fit view', fitTitle: 'Fit a readable line to the score pane ( F )',
      zoom: { fit: fitWidth, steps: [0.5, 0.6, 0.75, 0.9, 1, 1.25, 1.5, 2],
        // In page view, zoom scales the sheet (100% = page width) and never reflows it.
        get: function () { return paged() && layout && layout.pages ? screenScale / (Math.max(120, paper.clientWidth - 24) / layout.pages.page.width) : screenScale; },
        set: function (z) {
          if (paged() && layout && layout.pages) { pageZoom = z; applyPageScale(); return; }
          staffScale = z; fitMode = false; layout = null; applyScale();
        } },
      fitRoom: function () { return ((!workspace.classList.contains('se-short') && paper.clientHeight) || root.innerHeight * 0.65) - 8; }
    });
    toolbar.insertBefore(navigation.el, practiceId ? settingsSummary : settings);
    if (practiceId) toolbar.insertBefore(pager, settingsSummary);
    var roll = practiceId ? installPianoRoll(workspace, bar, model, player, function (show) {
      paper.inert = show;
      var beat = writtenBeat(model, currentPerformanceBeat(player));
      updatePager();
      if (show) {
        fig.dispatchEvent(new Event('score:hide-notation'));
        roll.paint(currentPerformanceBeat(player));
        return;
      }
      if (windowed) windowStart = -1;
      draw();
      navigation.go(measureAt(beat), { source: 'view', preview: true, noSeek: true });
      if (windowed && showVisibleNotation()) fig.dispatchEvent(new CustomEvent('score:notation-window'));
      player.ui.light(player.playing ? beat : -1);
      player.ui.cursor(beat);
    }, function () { return { layout: fig.scoreLayout, source: svgWrap.querySelector('.se-score') }; }) : null;
    if (guide.length) {
      guideBox = el('section', { class: 'se-guide', 'aria-label': 'Measure-by-measure guide' });
      guideNow = el('div', { class: 'se-guide-now', 'aria-live': 'polite' });
      var all = el('details', { class: 'se-guide-all' });
      all.appendChild(el('summary', {}, 'Read the whole guide (' + guide.length + (guide.length === 1 ? ' note)' : ' notes)')));
      if (guide.length === 1) all.hidden = true; // the one note is already showing above
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
    var printButton = el('button', { type: 'button', class: 'se-toggle se-print-score-button' }, 'Print score');
    printButton.setAttribute('aria-label', 'Print a paginated score of ' + (score.title || 'this piece'));
    printButton.addEventListener('click', function () { printScorePages(score, player.printOptions()); });

    function updatePreferenceButtons() {
      var prefs = root.MusicNotation.preferences;
      pitchToggle.setAttribute('aria-pressed', prefs.pitchNames ? 'true' : 'false');
      colorToggle.setAttribute('aria-pressed', prefs.noteColors ? 'true' : 'false');
      pitchToggle.classList.toggle('is-on', prefs.pitchNames);
      colorToggle.classList.toggle('is-on', prefs.noteColors);
      pitchToggle.textContent = prefs.pitchNames ? '✓ Pitch names' : 'Pitch names';
      colorToggle.textContent = prefs.noteColors ? '✓ Note colors' : 'Note colors';
    }
    var activeNoteButton = null, noteButtonMap = new Map();
    function noteButtons() { return Array.from(noteButtonMap.values()); }
    function updateNoteList(active) {
      if (noteList.hidden) return;
      var next = active ? noteButtonMap.get(active.i) : null;
      if (next === activeNoteButton) return;
      if (activeNoteButton) activeNoteButton.removeAttribute('aria-current');
      if (next) next.setAttribute('aria-current', 'true');
      activeNoteButton = next;
    }
    function renderNoteList() {
      if (!layout || noteList.hasAttribute('hidden')) return;
      noteList.innerHTML = ''; noteButtonMap.clear(); activeNoteButton = null;
      layout.events.filter(function (ev) { return !ev.hidden; }).sort(function (a, b) { return a.abs - b.abs || a.staff - b.staff || a.i - b.i; }).forEach(function (ev, index) {
        var li = document.createElement('li');
        var button = el('button', { type: 'button', 'data-note-index': ev.i, 'aria-label': eventLabel(ev, model) });
        noteButtonMap.set(ev.i, button);
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
      updateNoteList(layout.events.find(function (ev) { return lit.has(ev.i); }));
    }

    function indexRenderedNotes() {
      eventNodes = [];
      (notationLayer || svgWrap).querySelectorAll('.se-ev').forEach(function (node) {
        var i = +node.getAttribute('data-i');
        eventNodes[i] = node;
        if (lit.has(i)) node.classList.add('is-on');
      });
      tabEventNodes = [];
      (notationLayer || svgWrap).querySelectorAll('.se-tab-note').forEach(function (node) {
        var i = +node.getAttribute('data-i');
        (tabEventNodes[i] = tabEventNodes[i] || []).push(node);
        if (lit.has(i)) node.classList.add('is-on');
      });
    }

    function showVisibleNotation() {
      if (!notationLayer) return false;
      var height = paper.clientHeight;
      var top = paper.scrollTop / screenScale;
      var bottom = (paper.scrollTop + height) / screenScale;
      var first = Math.max(0, floorIndex(systemTops, top) - 1);
      var last = Math.min(systemTops.length - 1, floorIndex(systemTops, bottom) + 1);
      if (first === windowStart && last === windowEnd) return false;
      windowStart = first; windowEnd = last;
      var ties = layout.ties.filter(function (tie) {
        return tie.from <= last && tie.to >= first;
      });
      notationLayer.innerHTML = layout.notation.slice(first, last + 1).join('') +
        ties.map(function (tie) { return tie.svg; }).join('');
      indexRenderedNotes();
      return true;
    }

    function onPaperScroll() {
      if (roll?.open) return;
      if (!scrollFrame) scrollFrame = requestAnimationFrame(function () {
        scrollFrame = 0;
        if (!roll?.open && showVisibleNotation()) fig.dispatchEvent(new CustomEvent('score:notation-window'));
      });
    }

    function draw() {
      if (player.destroyed) return;
      if (roll?.open) { roll.paint(currentPerformanceBeat(player)); return; }
      var pageMode = paged(), size = PAGE_SIZES[view.size];
      var w = pageMode ? size.width : drawWidth(), room = paper.clientHeight;
      if (pageMode && layout && layout.pages && lastDrawWidth === w && layout.pageSize === view.size) {
        // The sheet is engraved at a fixed width: a resized pane only rescales it.
        lastDrawHeight = room;
        var sheetBefore = currentSheet();
        applyPageScale();
        if (snapping()) showSheet(sheetBefore);
        if (showVisibleNotation()) fig.dispatchEvent(new CustomEvent('score:notation-window'));
        navigation.refresh(); return;
      }
      if (layout && !layout.pages && !pageMode && lastDrawWidth !== null && Math.abs(lastDrawWidth - w) < 2) {
        if (room === lastDrawHeight) return;
        lastDrawHeight = room;
        if (fitMode) {
          screenScale = displayedScale();
          var svg = svgWrap.querySelector('svg');
          svg.setAttribute('width', layout.width * screenScale); svg.setAttribute('height', layout.height * screenScale);
        }
        if (showVisibleNotation()) fig.dispatchEvent(new CustomEvent('score:notation-window'));
        navigation.refresh(); return;
      }
      var readingLayout = practiceId && fitMode !== 'fit' && !pageMode;
      var previousSystem = (readingLayout || pageMode) && layout && paper.scrollTop > 0
        ? layout.systems.findLast(function (system) { return system.top <= (paper.scrollTop + (layout.pages ? paper.clientHeight * 0.35 : 0)) / screenScale; }) : null;
      lastDrawWidth = w; lastDrawHeight = room;
      if (player.playing) player.schedule(REDRAW_LOOKAHEAD);
      if (pageMode) {
        // Engrave once to measure each system, then again with every system moved onto its sheet.
        var plan = paginate(engrave(model, w, size.readable, windowed, false), { title: true });
        layout = engrave(model, w, size.readable, windowed, false, plan);
        layout.pages = plan;
        layout.pageSize = view.size;
        screenScale = pageScale();
      } else {
        layout = engrave(model, w, practiceId || fig.hasAttribute('data-score-readable'), windowed, readingLayout);
        screenScale = displayedScale();
      }
      workspace.classList.toggle('se-paged', pageMode);
      syncViewControls();
      var box = pageMode ? { x: layout.pages.page.x, w: layout.pages.page.width } : { x: 0, w: layout.width };
      var label = (score.title || 'Score') + '. ' + model.count + ' bars in ' + model.ts.num + '/' + model.ts.den + (score.keyName ? ', ' + score.keyName : '') + '.';
      // The score is always paper with its own ink, so contrast-guard's text pass stays out: it reads the
      // cursor rect's accent fill without its fill-opacity and would repaint labels under it white.
      svgWrap.innerHTML = '<svg class="se-score" data-contrast-guard-skip role="img" aria-label="' + root.MusicNotation.escape(label) + '" viewBox="' + box.x + ' 0 ' + box.w + ' ' + layout.height + '" width="' + (box.w * screenScale) + '" height="' + (layout.height * screenScale) + '"' + (fig.hasAttribute('data-score-zoom') ? ' style="max-width:none"' : '') + '>' +
        (pageMode ? pageMarkup() : '') + (practice ? '<g class="se-practice-marks" aria-hidden="true"/>' : '') + '<rect class="se-cursor" x="0" y="0" width="' + (layout.S * 0.35) + '" height="0" rx="' + layout.S * 0.15 + '" opacity="0"/>' + layout.svg + (windowed ? '<g class="se-notation-window"/>' : '') + '</svg>';
      pageSnapEls = [];
      if (pageMode) applyPageScale();
      else { paper.classList.remove('se-snap'); updatePager(); }
      if (previousSystem) {
        var nextSystem = layout.systems.findLast(function (system) { return system.first <= previousSystem.first; });
        if (pageMode && snapping()) showSheet(sheetOfSystem(nextSystem.index));
        else paper.scrollTo({ top: nextSystem.top * screenScale, left: 0, behavior: 'instant' });
      }
      // A one-line study doesn't need a 740px reading pane: let the pane shrink to the music.
      // Decided by the piece, never by the drawn size: the fit zoom depends on the pane's height.
      // A page is a page, though: page view keeps its full-height pane.
      workspace.classList.toggle('se-short', model.count <= 4 && !pageMode);
      cursorEl = svgWrap.querySelector('.se-cursor');
      lit = new Set();
      if (windowed) {
        notationLayer = svgWrap.querySelector('.se-notation-window');
        systemTops = layout.systems.map(function (system) { return system.top; });
        windowStart = -1; windowEnd = -1;
        showVisibleNotation();
      } else indexRenderedNotes();
      cursorColumns = [];
      layout.systems.forEach(function (system) {
        system.cols.slice(0, -1).forEach(function (col, i) { cursorColumns.push({ a: col, b: system.cols[i + 1], sys: system }); });
      });
      cursorTimes = cursorColumns.map(function (col) { return col.a.t; });
      // Expose the current engraving to page-specific teaching overlays. The layout
      // is replaced after every reflow/zoom, so consumers should listen for the
      // event instead of retaining references to an older SVG.
      fig.scoreLayout = layout;
      eventsByBar = [];
      layout.events.forEach(function (ev) { (eventsByBar[ev.bar] = eventsByBar[ev.bar] || []).push(ev); });
      fig.dispatchEvent(new CustomEvent('score:draw', { detail: { layout: layout } }));
      var beat = writtenBeat(model, player.playing ? player.beatAt(audio.ctx.currentTime) : player.pos);
      renderNoteList();
      navigation.refresh();
      if (practice) practice.paint();
      if (restoreBar != null && paper.clientWidth > 0) {
        var savedBar = restoreBar;
        restoreBar = null;
        navigation.go(savedBar, { source: 'practice', preview: true });
        beat = model.barStart[savedBar];
      }
      if (player.playing) player.ui.light(beat);
      player.ui.cursor(beat);
    }

    player.ui = {
      soundStatus: function (report) {
        status.textContent = !player.samples ? 'Lightweight synthesized playback.' : report.failed ? 'Some recordings are unavailable; synthesis fills the missing notes.' : 'Recorded instrument playback; synthesis covers unsupported sounds and out-of-range notes.';
      },
      update: function () {
        var transportText = player.loading ? 'Cancel loading' : player.playing ? '❚❚ Pause' : '▶ Play';
        if (practiceId) {
          playBtn.setAttribute('aria-label', player.loading ? 'Cancel loading' : player.playing ? 'Pause' : 'Play');
          playIcon.textContent = player.loading ? '…' : player.playing ? '❚❚' : '▶';
          playLabel.textContent = transportText;
        } else playBtn.textContent = transportText;
        playBtn.setAttribute('aria-pressed', player.playing ? 'true' : 'false');
        fig.classList.toggle('se-playing', player.playing);
        status.setAttribute('aria-live', player.playing ? 'off' : 'polite');
        updateTimeline(player.pos);
        if (roll?.open) roll.paint(currentPerformanceBeat(player));
      },
      light: function (beat) {
        var measure = measureAt(beat);
        if (practice && (beat < 0 ? -1 : measure) !== playbackBar) {
          playbackBar = beat < 0 ? -1 : measure;
          if (playbackBar >= 0) practice.remember(playbackBar);
        }
        if (roll?.open) {
          if (beat >= 0) {
            var rollMeasure = Math.max(0, measure);
            showGuide(rollMeasure);
            var rollText = 'Bar ' + barNumber(model, rollMeasure) + ' / ' + barNumber(model, model.count - 1);
            if (position.textContent !== rollText) position.textContent = rollText;
            updateTimeline(currentPerformanceBeat(player));
          }
          return;
        }
        if (!layout) return;
        // Page view: Follow turns to the sheet the music has reached before the measure is marked.
        if (beat >= 0 && layout.pages && snapping() && navigation.following) {
          var playingSystem = layout.systems.findLast(function (system) { return system.first <= measure; });
          var playingSheet = playingSystem ? sheetOfSystem(playingSystem.index) : 0;
          if (playingSheet !== currentSheet()) showSheet(playingSheet);
        }
        navigation.setCurrent(beat < 0 ? -1 : measure);
        if (beat >= 0) showGuide(measure);
        var candidates = beat < 0 ? [] : (eventsByBar[measure] || []);
        var on = candidates.filter(function (ev) {
          return ev.kind === 'note' && !player.mutes[ev.staff] && ev.abs <= beat + EPS && beat < ev.abs + ev.dur - EPS;
        });
        var ids = new Set(on.map(function (e) { return e.i; }));
        lit.forEach(function (i) { if (!ids.has(i)) { if (eventNodes[i]) eventNodes[i].classList.remove('is-on'); (tabEventNodes[i] || []).forEach(function (n) { n.classList.remove('is-on'); }); } });
        ids.forEach(function (i) { if (!lit.has(i)) { if (eventNodes[i]) eventNodes[i].classList.add('is-on'); (tabEventNodes[i] || []).forEach(function (n) { n.classList.add('is-on'); }); } });
        lit = ids;
        if (beat >= 0) {
          var barText = 'Bar ' + barNumber(model, Math.max(0, measure)) + ' / ' + barNumber(model, model.count - 1);
          if (position.textContent !== barText) position.textContent = barText;
          updateTimeline(player.beatAt(audio.ctx.currentTime));
        }
        updateNoteList(on[0]);
        if (on.length) {
          var msg = eventLabel(on[0], model);
          if (status.textContent !== msg) status.textContent = msg;
        }
      },
      cursor: function (beat) {
        if (roll?.open) { roll.paint(currentPerformanceBeat(player)); return; }
        if (!layout || !cursorEl) return;
        var col = cursorColumns[Math.max(0, floorIndex(cursorTimes, beat + EPS))], best = null;
        if (col && beat <= col.b.t + EPS) {
          var f = col.b.t > col.a.t ? Math.max(0, Math.min(1, (beat - col.a.t) / (col.b.t - col.a.t))) : 0;
          best = { x: col.a.x + (col.b.x - col.a.x) * f, sys: col.sys };
        }
        if (!best || (!player.playing && beat <= EPS)) { cursorEl.setAttribute('opacity', '0'); return; }
        cursorEl.setAttribute('x', best.x - layout.S * 0.5);
        cursorEl.setAttribute('y', best.sys.top);
        cursorEl.setAttribute('height', best.sys.bottom - best.sys.top);
        cursorEl.setAttribute('opacity', '1');
      }
    };

    function clockText(beats) {
      var seconds = Math.max(0, Math.round(beats * 60 / player.qpm()));
      return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
    }
    function updateTimeline(beat) {
      beat = Math.max(0, Math.min(model.perfTotal, beat));
      seek.value = beat;
      var nowText = clockText(beat), endText = clockText(model.perfTotal);
      // Avoid waking page-wide mutation observers for the same time every frame.
      if (elapsed.textContent !== nowText) elapsed.textContent = nowText;
      if (duration.textContent !== endText) duration.textContent = endText;
      var valueText = nowText + ' of ' + endText;
      if (seek.getAttribute('aria-valuetext') !== valueText) seek.setAttribute('aria-valuetext', valueText);
    }
    seek.addEventListener('input', function () {
      var target = +seek.value, was = player.playing;
      if (was) player.halt();
      player.pos = target;
      var written = writtenBeat(model, player.pos);
      player.ui.cursor(written); updateTimeline(player.pos);
      navigation.go(Math.max(0, measureAt(written)), { source: 'timeline', noSeek: true });
      if (was) player.play();
    });
    updateTimeline(0);
    function togglePlay() { if (player.loading) player.stop(); else if (player.playing) player.pause(); else player.requestPlay(); }
    playBtn.addEventListener('click', togglePlay);
    function onSpace(event) {
      if (event.code !== 'Space' || event.ctrlKey || event.metaKey || event.altKey ||
        event.target.closest('input, select, textarea, button, summary, a, [contenteditable="true"], [role="slider"]')) return;
      event.preventDefault(); togglePlay();
    }
    fig.addEventListener('keydown', onSpace);
    paper.tabIndex = 0;
    paper.setAttribute('role', 'region');
    paper.setAttribute('aria-label', (score.title || 'Score') + ' notation. Space to play or pause.');
    stopBtn.addEventListener('click', function () { player.stop(); navigation.reset(); status.textContent = ''; });
    tempo.addEventListener('input', function () {
      var r = +tempo.value / 100;
      tempoOut.textContent = tempo.value + '%';
      player.rate = r;
      updateTimeline(player.playing ? player.beatAt(audio.ctx.currentTime) : player.pos);
    });
    function changeSound() { player.setSound(inst.value || score.instrument || 'piano', !!inst.value, quality.value === 'sampled'); }
    inst.addEventListener('change', changeSound);
    quality.addEventListener('change', changeSound);
    loop.addEventListener('change', function () { player.loop = loop.checked; navigation.refresh(); });
    clearLoop.addEventListener('click', function () { clearLoopRange(); status.textContent = 'Loop range cleared.'; });
    muteBoxes.forEach(function (cb, i) { cb.addEventListener('change', function () {
      player.setMuted(i, !cb.checked);
      soloBtns.forEach(function (btn) { btn.setAttribute('aria-pressed', 'false'); btn.classList.remove('is-on'); });
      if (roll?.open) roll.paint(currentPerformanceBeat(player));
    }); });
    // Full screen uses the Fullscreen API where it exists. iPhone Safari has none for elements (and embedded
    // browsers may refuse it), so the figure becomes a fixed overlay that fills the screen instead.
    var expanded = false, wasFull = false;
    function isFull() { return expanded || document.fullscreenElement === fig; }
    function setExpanded(on) {
      expanded = on;
      fig.classList.toggle('se-expanded', on);
      document.documentElement.classList.toggle('se-expanded-lock', on);
      // The top layer escapes lesson wrappers whose transforms or containment would trap position: fixed.
      if (on && fig.showPopover) {
        fig.setAttribute('popover', 'manual');
        try { fig.showPopover(); } catch (err) { fig.removeAttribute('popover'); }
      } else if (!on && fig.hasAttribute('popover')) {
        try { fig.hidePopover(); } catch (err) { /* already closed */ }
        fig.removeAttribute('popover');
      }
      fullscreenChanged();
    }
    full.addEventListener('click', function () {
      if (player.playing) player.schedule(REDRAW_LOOKAHEAD);
      if (expanded) { setExpanded(false); return; }
      if (document.fullscreenElement === fig) { document.exitFullscreen().catch(function () {}); return; }
      if (fig.requestFullscreen && document.fullscreenEnabled) fig.requestFullscreen().catch(function () { setExpanded(true); });
      else setExpanded(true);
    });
    function fullscreenChanged() {
      var on = isFull();
      if (on === wasFull) return;
      wasFull = on;
      fullText.textContent = on ? 'Exit full screen' : 'Full screen';
      fullIcon.textContent = on ? '✕' : '⛶';
      full.title = on ? 'Exit full screen (Esc)' : 'Full screen';
      full.setAttribute('aria-pressed', String(on));
      full.setAttribute('aria-label', on ? 'Exit full screen' : 'Show the score full screen');
      queueDraw();
    }
    document.addEventListener('fullscreenchange', fullscreenChanged);
    function onKey(e) {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (!practiceId && settings.open && settings.contains(e.target)) { e.preventDefault(); settings.open = false; settingsSummary.focus(); return; }
      // preventDefault also tells creation-app.js to leave its own expanded workspace alone.
      if (expanded) { e.preventDefault(); setExpanded(false); full.focus({ preventScroll: true }); }
    }
    document.addEventListener('keydown', onKey);
    // The options open as a panel over the score, so close it when the reader goes back to the music.
    function onOutside(e) { if (settings.open && !settings.contains(e.target)) settings.open = false; }
    if (!practiceId) document.addEventListener('pointerdown', onOutside);

    var COMPACT_KEY = 'classroomos:score-compact';
    function setCompact(on, save) {
      workspace.classList.toggle('se-compact', on);
      if (practiceId) {
        more.textContent = 'Focus view';
        more.setAttribute('aria-pressed', String(on));
        more.removeAttribute('aria-expanded');
        more.removeAttribute('aria-label');
        more.title = 'Show a smaller toolbar with more room for notation';
      } else {
        more.textContent = on ? '▾' : '▴';
        more.setAttribute('aria-expanded', String(!on));
        more.setAttribute('aria-label', on ? 'Show all controls' : 'Hide extra controls');
        more.title = on ? 'Show all controls' : 'Fewer controls, more score';
        if (on) settings.open = false;
      }
      if (save) try { root.localStorage.setItem(COMPACT_KEY, on ? '1' : '0'); } catch (err) { /* private mode */ }
    }
    more.addEventListener('click', function () { setCompact(!workspace.classList.contains('se-compact'), true); });
    var compact = false;
    try { compact = root.localStorage.getItem(COMPACT_KEY) === '1'; } catch (err) { /* private mode */ }
    setCompact(compact);

    var HEIGHT_KEY = 'classroomos:score-pane-height';
    function paneMax() { return Math.max(320, Math.round((root.visualViewport ? root.visualViewport.height : root.innerHeight) - 16)); }
    function setPaneHeight(px, save) {
      if (px == null) {
        workspace.style.removeProperty('height'); workspace.style.removeProperty('min-height');
        grip.removeAttribute('aria-valuenow');
        if (save) try { root.localStorage.removeItem(HEIGHT_KEY); } catch (err) { /* private mode */ }
        return;
      }
      px = Math.round(Math.max(240, Math.min(paneMax(), px)));
      workspace.style.height = px + 'px'; workspace.style.minHeight = '0';
      grip.setAttribute('aria-valuemin', '240'); grip.setAttribute('aria-valuemax', String(paneMax())); grip.setAttribute('aria-valuenow', String(px));
      if (save) try { root.localStorage.setItem(HEIGHT_KEY, String(px)); } catch (err) { /* private mode */ }
    }
    try { var savedHeight = +root.localStorage.getItem(HEIGHT_KEY); if (savedHeight > 0) setPaneHeight(savedHeight); } catch (err) { /* private mode */ }
    var dragFrom = null;
    grip.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      e.preventDefault();
      dragFrom = { y: e.clientY, h: workspace.getBoundingClientRect().height };
      grip.setPointerCapture(e.pointerId);
      workspace.classList.add('se-resizing');
    });
    grip.addEventListener('pointermove', function (e) { if (dragFrom) setPaneHeight(dragFrom.h + e.clientY - dragFrom.y); });
    function endDrag() {
      if (!dragFrom) return;
      dragFrom = null; workspace.classList.remove('se-resizing');
      setPaneHeight(workspace.getBoundingClientRect().height, true);
    }
    grip.addEventListener('pointerup', endDrag);
    grip.addEventListener('pointercancel', endDrag);
    grip.addEventListener('dblclick', function () { setPaneHeight(null, true); });
    grip.addEventListener('keydown', function (e) {
      var h = workspace.getBoundingClientRect().height;
      if (e.key === 'ArrowUp') setPaneHeight(h - 40, true);
      else if (e.key === 'ArrowDown') setPaneHeight(h + 40, true);
      else if (e.key === 'End') setPaneHeight(paneMax(), true);
      else if (e.key === 'Home') setPaneHeight(null, true);
      else return;
      e.preventDefault();
    });

    // Click a note: hear it, and start playback from there next time.
    svgWrap.addEventListener('click', function (e) {
      var g = e.target.closest && e.target.closest('.se-ev, .se-tab-note');
      if (!g || !layout) return;
      var ev = layout.events[+g.getAttribute('data-i')];
      if (!ev || ev.kind !== 'note') return;
      if (e.shiftKey) {
        setLoopBars(selectedBar, measureAt(ev.abs));
        status.textContent = 'Looping bars ' + barNumber(model, loopBars.from) + '–' + barNumber(model, loopBars.to) + '. Press Play.';
        return;
      }
      selectEvent(ev);
    });

    function selectEvent(ev) {
      if (!ev) return;
      var c = context(), st = model.staves[ev.staff];
      if (!player.playing && ev.kind === 'note') ev.pitches.forEach(function (p) {
        root.MusicSynth.startVoice(c, audio.out, player.instOverride ? player.instrument : (st.instrument || player.instrument), p.midi + (Number(score.playbackTranspose) || 0), 0.75, c.currentTime, null, { samples: player.samples, sampleInstrument: player.instOverride ? player.instrument : player.sampleInstrument(ev.staff) }).release(c.currentTime + 0.6);
      });
      player.seek(ev.abs);
      navigation.select(measureAt(ev.abs));
      selectedBar = measureAt(ev.abs); showGuide(selectedBar); updateTimeline(player.pos);
      if (practice) practice.remember(selectedBar);
      position.textContent = 'Bar ' + barNumber(model, selectedBar) + ' / ' + barNumber(model, model.count - 1);
      status.textContent = eventLabel(ev, model) + (player.playing ? ' — playing from here' : ' — press Play to start here');
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
    var offPreferences = root.MusicNotation.onPreferencesChange(function () { layout = null; updatePreferenceButtons(); requestAnimationFrame(draw); });
    function fingeringSpacingChanged(e) { if (!e.detail.reach) { layout = null; requestAnimationFrame(draw); } }
    root.addEventListener('score-fingering:change', fingeringSpacingChanged);
    updatePreferenceButtons();

    draw();
    if (windowed) paper.addEventListener('scroll', onPaperScroll, { passive: true });
    displaySettings.append(pitchToggle, colorToggle, noteListToggle, printButton);
    if (practiceId) {
      var readingSize = el('button', { type: 'button' }, 'Reading size');
      readingSize.addEventListener('click', function () { settings.close(); navigation.fit('reading'); });
      displaySettings.insertBefore(readingSize, more);
      // Page view settings get their own group at the top of the dialog.
      var viewSettings = el('fieldset', { class: 'se-view-settings' });
      viewSettings.appendChild(el('legend', {}, 'View'));
      function choice(label, name, options) {
        var wrap = el('label', { class: 'se-view-choice' });
        var select = el('select', { 'data-view': name });
        options.forEach(function (o) { select.appendChild(el('option', { value: o[0] }, o[1])); });
        select.addEventListener('change', function () { var patch = {}; patch[name] = select.value; setView(patch); });
        wrap.append(el('span', {}, label), select);
        viewSettings.appendChild(wrap);
        return wrap;
      }
      var layoutChoice = choice('Layout', 'layout', [['page', 'Page view'], ['lines', 'Line view']]);
      var fitChoice = choice('Show', 'fit', [['page', 'Whole page'], ['width', 'Page width']]);
      var sizeChoice = choice('Staff size', 'size', Object.keys(PAGE_SIZES).map(function (k) { return [k, PAGE_SIZES[k].label]; }));
      settingsBar.insertBefore(viewSettings, settingsBar.firstChild);
      syncViewControls = function () {
        var showing = paged() ? 'page' : 'lines';
        layoutChoice.querySelector('select').value = showing;
        fitChoice.querySelector('select').value = view.fit;
        sizeChoice.querySelector('select').value = view.size;
        fitChoice.hidden = sizeChoice.hidden = showing !== 'page';
        readingSize.hidden = showing === 'page';
      };
      syncViewControls();
      noteListToggle.addEventListener('click', function () {
        settings.close();
        if (!noteList.hidden) {
          noteList.scrollIntoView({ block: 'nearest' });
          noteList.querySelector('button')?.focus({ preventScroll: true });
        }
      });
      printButton.addEventListener('click', function () { settings.close(); }, { capture: true });
    }
    // Layout: notation size, note spacing, line spacing, and which staves to draw. Shared by every
    // score on the page and by Print score, so a handout can be arranged to fit the paper.
    var layoutSettings = el('fieldset', { class: 'se-view-settings se-layout-settings' });
    layoutSettings.appendChild(el('legend', {}, 'Layout and staves'));
    var layoutControls = [];
    function layoutSlider(label, key, min, max) {
      var wrap = el('label', { class: 'se-view-choice se-layout-slider' });
      var out = el('output', {}, '');
      var input = el('input', { type: 'range', min: String(min), max: String(max), step: '5', 'aria-label': label });
      function show() { input.value = String(Math.round(layoutPrefs[key] * 100)); out.textContent = input.value + '%'; }
      input.addEventListener('input', function () { layoutPrefs[key] = input.value / 100; out.textContent = input.value + '%'; });
      input.addEventListener('change', saveLayoutPrefs);
      wrap.append(el('span', {}, label), input, out);
      layoutSettings.appendChild(wrap);
      layoutControls.push(show); show();
    }
    layoutSlider('Notation size', 'scale', 60, 180);
    layoutSlider('Note spacing (stretch / squeeze)', 'hgap', 60, 180);
    layoutSlider('Space between staves and lines', 'vgap', 40, 180);
    var spreadWrap = el('label', { class: 'se-view-choice' });
    var spreadBox = el('input', { type: 'checkbox' });
    spreadBox.addEventListener('change', function () { layoutPrefs.spread = spreadBox.checked; saveLayoutPrefs(); });
    spreadWrap.append(el('span', {}, 'Spread lines down each page'), spreadBox);
    layoutSettings.appendChild(spreadWrap);
    layoutControls.push(function () { spreadBox.checked = layoutPrefs.spread; });
    if (model.staves.length > 1) {
      var staffBox = el('div', { class: 'se-layout-staves', role: 'group', 'aria-label': 'Staves to show' });
      staffBox.appendChild(el('span', { class: 'se-layout-staves-title' }, 'Show these staves (hidden ones still play)'));
      var staffChecks = model.staves.map(function (st, si) {
        var box = el('input', { type: 'checkbox' });
        var clefName = ({ treble: 'treble', bass: 'bass', alto: 'alto', tenor: 'tenor' })[st.clef] || st.clef;
        var lab = el('label', { class: 'se-layout-staff' });
        lab.append(box, el('span', {}, (st.label || 'Staff ' + (si + 1)) + ' · ' + clefName + ' clef'));
        box.addEventListener('change', function () {
          var hiddenNow = model.staves.map(function (_, i) { return i; }).filter(function (i) { return i === si ? !box.checked : !staffChecks[i].checked; });
          if (hiddenNow.length >= model.staves.length) { box.checked = true; return; }
          if (hiddenNow.length) layoutPrefs.hidden[model.id] = hiddenNow; else delete layoutPrefs.hidden[model.id];
          saveLayoutPrefs();
        });
        staffBox.appendChild(lab);
        return box;
      });
      layoutSettings.appendChild(staffBox);
      layoutControls.push(function () { var hs = hiddenStaves(model); staffChecks.forEach(function (box, i) { box.checked = !hs[i]; }); });
    }
    var layoutReset = el('button', { type: 'button', class: 'se-toggle' }, 'Reset layout');
    layoutReset.addEventListener('click', function () {
      layoutPrefs.scale = layoutPrefs.hgap = layoutPrefs.vgap = 1; layoutPrefs.spread = false; delete layoutPrefs.hidden[model.id];
      saveLayoutPrefs();
    });
    layoutSettings.appendChild(layoutReset);
    layoutControls.forEach(function (f) { f(); });
    function layoutChanged() { layoutControls.forEach(function (f) { f(); }); layout = null; lastDrawWidth = null; requestAnimationFrame(draw); }
    root.addEventListener('score-layout:change', layoutChanged);
    if (practiceId) settingsBar.insertBefore(layoutSettings, settingsBar.children[1] || null);
    else settingsBar.appendChild(layoutSettings);
    var offFingering;
    withFingering(function (F) {
      if (!player.destroyed) offFingering = F.install(fig, score, displaySettings);
    });
    var violinOptions = options?.violinFingering;
    var violinStaves = score.staves.flatMap(function (staff, index) {
      if (violinOptions) return index === 0 ? [index] : [];
      var instrument = staff.instrument || score.instrument;
      return instrument === 'violin' || ((instrument === 'strings' || !instrument) && /\bviolin\b/i.test(staff.label || '')) ? [index] : [];
    });
    var violinPrint;
    player.printOptions = function () {
      var piano = fig.scoreFingeringPrint?.();
      if (!piano || !violinPrint) return violinPrint || piano;
      return Object.assign({}, piano, violinPrint, { note: [piano.note, violinPrint.note].filter(Boolean).join(' ') });
    };
    if (violinStaves.length && (!violinOptions || violinOptions.enabled)) {
      import(new URL('score-violin-fingering.mjs', scriptUrl || location.href).href).then(function (V) {
        if (player.destroyed) return;
        var planned;
        function planViolin(target) {
          return V.plan(target, violinStaves, violinOptions?.position);
        }
        function showViolin(show) {
          if (show && !planned) planned = planViolin(model);
          model.violinFingerings = show ? planned : null;
          violinPrint = show ? { violinPlan: planViolin, note: V.legend } : null;
          layout = null;
          draw();
        }
        if (violinOptions) {
          showViolin(true);
          violinOptions.onPlan?.(model, planned, V.legend);
          return;
        }
        var toggle = el('button', { type: 'button', class: 'se-toggle se-fingering-toggle', 'aria-pressed': 'false' }, 'Violin finger numbers');
        var legend = el('p', { class: 'se-fingering-key', hidden: '' }, V.legend);
        toggle.addEventListener('click', function () {
          var show = toggle.getAttribute('aria-pressed') !== 'true';
          toggle.setAttribute('aria-pressed', String(show));
          toggle.classList.toggle('is-on', show);
          legend.hidden = !show;
          showViolin(show);
        });
        displaySettings.append(toggle, legend);
      }).catch(function (error) { console.error('Could not load violin fingerings:', error); });
    }
    fig.insertBefore(noteList, cap);
    var pieceGroup = fig.closest('details.composer-piece-group');
    function onPieceToggle() {
      if (!pieceGroup.open) {
        if (practice) { if (player.loading) player.halt(); else player.pause(); }
        else player.stop();
        status.textContent = '';
      }
      else { layout = null; requestAnimationFrame(draw); }
    }
    if (pieceGroup) pieceGroup.addEventListener('toggle', onPieceToggle);
    var drawFrame = 0;
    function queueDraw() { if (!drawFrame) drawFrame = requestAnimationFrame(function () { drawFrame = 0; draw(); }); }
    var observer;
    if (root.ResizeObserver) { observer = new ResizeObserver(queueDraw); observer.observe(paper); }
    else root.addEventListener('resize', draw);
    player.destroy = function () {
      player.stop(); player.destroyed = true;
      if (player.staffOutputs) player.staffOutputs.forEach(function (gain) { gain.disconnect(); });
      if (observer) observer.disconnect(); else root.removeEventListener('resize', draw);
      document.removeEventListener('fullscreenchange', fullscreenChanged);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onOutside);
      if (expanded) { expanded = false; fig.classList.remove('se-expanded'); document.documentElement.classList.remove('se-expanded-lock'); if (fig.hasAttribute('popover')) { try { fig.hidePopover(); } catch (err) { /* closed */ } fig.removeAttribute('popover'); } }
      if (offPreferences) offPreferences();
      if (offFingering) offFingering();
      if (practice) {
        practice.destroy();
        if (settings.open) settings.close();
        settings.remove();
      }
      if (pieceGroup) pieceGroup.removeEventListener('toggle', onPieceToggle);
      navigation.destroy();
      fig.removeEventListener('keydown', onSpace);
      root.removeEventListener('score-fingering:change', fingeringSpacingChanged);
      root.removeEventListener('score-layout:change', layoutChanged);
      if (windowed) paper.removeEventListener('scroll', onPaperScroll);
      cancelAnimationFrame(scrollFrame);
      cancelAnimationFrame(drawFrame); players = players.filter(function (p) { return p !== player; });
      if (fig.scorePlayer === player) delete fig.scorePlayer;
    };
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
      }).catch(function (err) { library = null; throw err; });
    }
    return library;
  }

  // Each piece is also published on its own (data/scores/<id>.json, written by build:dist
  // and served by serve-local.js), so a page with one sonata doesn't download the
  // whole 500 KB library. Any other server falls back to the full library.
  var pieces = Object.create(null);
  // A server without data/scores/ (the dev server's static mirrors, GitHub's raw view) answers 404 for
  // every split file; after the first one, go straight to the library instead of asking again.
  var splitUnavailable = false;
  function fetchScoreAsset(filename) {
    if (splitUnavailable) {
      var skipped = new Error('Split score files are not published here.');
      skipped.status = 404;
      return Promise.reject(skipped);
    }
    var url = new URL('../../data/scores/' + filename + '.json', scriptUrl || location.href);
    return fetch(url).then(function (response) {
      if (!response.ok) {
        if (response.status === 404) splitUnavailable = true;
        var error = new Error('Score request failed (' + response.status + ').');
        error.status = response.status;
        throw error;
      }
      return response.json();
    });
  }
  function loadScore(id) {
    if (!pieces[id]) {
      pieces[id] = fetchScoreAsset(encodeURIComponent(id)).catch(function (error) {
        if (error.status !== 404) throw error;
        return loadLibrary().then(function (lib) { return lib.scores && lib.scores[id]; });
      }).then(function (score) {
        if (!score) throw new Error('Unknown score "' + id + '".');
        return Object.assign({}, score, { id: id });
      }).catch(function (error) {
        delete pieces[id];
        throw error;
      });
    }
    return pieces[id];
  }
  var previews = Object.create(null);
  function loadScorePreview(id) {
    if (!previews[id]) {
      previews[id] = fetchScoreAsset(encodeURIComponent(id) + '.preview').catch(function (error) {
        delete previews[id];
        throw error;
      });
    }
    return previews[id];
  }
  function loadScoreTitles() {
    return fetchScoreAsset('index').catch(function (error) {
      if (error.status !== 404) throw error;
      return loadLibrary().then(function (lib) {
        return Object.fromEntries(Object.entries(lib.scores).map(function (pair) { return [pair[0], pair[1].title]; }));
      });
    });
  }

  function injectCss() {
    // Pages that already link the stylesheet (with or without a ?v= cache key) must not get a second copy.
    if (document.querySelector('link[data-score-css], link[rel="stylesheet"][href*="score-engine.css"]')) return;
    var link = el('link', { rel: 'stylesheet', href: new URL('../css/score-engine.css', scriptUrl || location.href).href, 'data-score-css': '' });
    document.head.appendChild(link);
  }

  function showScoreLoading(fig, id, title) {
    injectCss();
    var panel = el('div', { class: 'se-selection-loading', 'data-no-print': '' });
    var status = el('p', { class: 'se-loading', role: 'status' }, title ? 'Loading ' + title + '…' : 'Loading score…');
    status.prepend(el('span', { class: 'se-spinner', 'aria-hidden': 'true' }));
    panel.appendChild(status);
    fig.insertBefore(panel, fig.firstChild);
    loadScorePreview(id).then(function (score) {
      if (!status.isConnected || fig.closest('[hidden]')) return;
      var model = openingModel(previewStaves(score, 12), 12, id + '-loading');
      var layout = engrave(model, Math.max(280, (panel.clientWidth || 640) - 2));
      var excerpt = model.count === 1 ? 'Opening measure' : 'Opening ' + model.count + ' measures';
      if (score.staves.length > model.staves.length) excerpt += ' · selected parts';
      if (!title) status.lastChild.textContent = 'Loading ' + score.title + '…';
      panel.appendChild(el('p', { class: 'se-preview-caption' }, excerpt));
      var preview = el('div', { class: 'se-selection-preview', tabindex: '0', 'aria-label': excerpt });
      preview.innerHTML = '<svg class="se-score" data-contrast-guard-skip aria-hidden="true" viewBox="0 0 ' +
        layout.width + ' ' + layout.height + '">' + layout.svg + '</svg>';
      panel.appendChild(preview);
    }).catch(function () { /* The full score can still load if the preview is unavailable. */ });
    return panel;
  }

  function afterScorePaint() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () { setTimeout(resolve, 0); });
    });
  }

  function openScore(fig, title) {
    if (fig.scorePlayer) return Promise.resolve(fig.scorePlayer);
    if (fig.scoreRequest) return fig.scoreRequest;
    var priorError = fig.querySelector(':scope > .se-selection-error');
    if (priorError) priorError.remove();
    var id = fig.getAttribute('data-score');
    var loading = showScoreLoading(fig, id, title);
    fig.scoreRequest = Promise.all([loadScore(id), afterScorePaint()]).then(function (result) {
      if (fig.closest('[hidden]') || !fig.isConnected) return null;
      var group = fig.closest('details.composer-piece-group');
      if (group && !group.open) return null;
      loading.remove();
      var player = render(fig, result[0]);
      if (player) fig.dispatchEvent(new CustomEvent('score:data', { detail: { score: result[0] } }));
      return player;
    }).catch(function () {
      var retry = el('button', { type: 'button' }, 'Retry');
      var error = el('p', { class: 'se-error se-selection-error', role: 'status' }, 'Sheet music could not load. ');
      error.appendChild(retry);
      fig.insertBefore(error, fig.firstChild);
      retry.addEventListener('click', function () { openScore(fig, title); });
      return null;
    }).finally(function () {
      loading.remove();
      fig.scoreRequest = null;
    });
    return fig.scoreRequest;
  }

  function boot() {
    document.querySelectorAll('figure[data-score]').forEach(function (fig) {
      if (fig.closest('.composer-work-panel')) return;
      var group = fig.closest('details.composer-piece-group');
      if (group) {
        group.addEventListener('toggle', function () { if (group.open) openScore(fig); });
        if (!group.open) return;
      }
      if (!fig.closest('[hidden]')) openScore(fig);
    });
  }

  // The first `bars` bars of a score as a model of their own, ending on a plain barline.
  function openingModel(score, bars, suffix) {
    var cut = function (text) { return String(text || '').split('|').slice(0, bars).join('|').replace(/:\s*$/, ''); };
    var copy = JSON.parse(JSON.stringify(score));
    copy.id = (score.id || 'score') + '-' + suffix;
    copy.ending = 'open'; delete copy.sections;
    copy.staves.forEach(function (st) {
      if (st.voices) st.voices.forEach(function (v) { v.notes = cut(v.notes); }); else st.notes = cut(st.notes);
    });
    var model = prepare(copy); analyse(model);
    return model;
  }

  // A small engraving of a score's first bars (shelf covers, previews): cheap even for a whole symphony.
  // A cover is a fixed box, so the preview is always one system of at most two staves: a dozen
  // orchestral staves scaled into a thumbnail is a grey smear, and a second system gets cropped.
  // Ensembles show their two busiest staves in the opening bars (score order kept), so the cover
  // shows the tune rather than resting winds.
  function previewStaves(score, bars) {
    if (score.staves.length <= 2) return score;
    var busy = score.staves.map(function (st, si) {
      var count = 0;
      (st.voices || [{ notes: st.notes }]).forEach(function (voice) {
        try {
          parseStaff(String(voice.notes || '').split('|').slice(0, bars).join('|'), 'preview').forEach(function (bar) {
            bar.events.forEach(function (ev) { if (ev.kind === 'note') count += 1; });
          });
        } catch (err) { /* an unparsable cut just counts as quiet */ }
      });
      return { si: si, count: count };
    });
    var keep = busy.slice().sort(function (a, b) { return b.count - a.count || a.si - b.si; }).slice(0, 2)
      .map(function (b) { return b.si; }).sort(function (a, b) { return a - b; });
    var copy = JSON.parse(JSON.stringify(score));
    // Bar marks (repeats, key and time changes) are read from the first staff; keep them on whichever leads.
    copy.staves = keep.map(function (si) { return copy.staves[si]; });
    copy.grand = false;
    return copy;
  }
  function previewSvg(score, bars, width) {
    bars = Math.max(1, bars || 2);
    var source = previewStaves(score, bars), out = null;
    for (var n = bars; n >= 1; n -= 1) {
      // Justified, so a short opening (one held chord) spans the plate like a full line does.
      try { var model = openingModel(source, n, 'preview'); model.score.justifyLast = true; out = engrave(model, width || 640); } catch (err) { out = null; continue; }
      if (out.systems.length <= 1) break;
    }
    if (!out && source !== score) out = engrave(openingModel(score, bars, 'preview'), width || 640);
    if (!out) throw new Error((score.id || 'score') + ': no preview');
    var sys = out.systems[0], top = 0, height = out.height;
    if (out.systems.length > 1 && sys) { top = Math.max(0, sys.top - out.S); height = out.systems[1].top - top; }
    return '<svg class="se-score" data-contrast-guard-skip aria-hidden="true" viewBox="0 ' + top + ' ' + out.width + ' ' + height + '">' + out.svg + '</svg>';
  }

  // ── Lesson print: the opening lines ───────────────────────────────────────
  // A whole piece squeezed into a lesson page is unreadable, so a printed lesson shows each
  // figure marked data-score-print="opening" as its first one or two lines, in the same
  // large-print engraving as the Print score pages. The complete score stays one button away.
  // Engraving units across the ~6.5in of a lesson column: large print a little under the Print score
  // pages' size (staff spaces about 2mm, against 1.75mm in most printed music), so a handout keeps
  // more bars to a line.
  var OPENING_WIDTH = 1150;
  // The first line or two of a score engraved `width` units across a 6.5in column: up to 3in of
  // paper, re-engraved to end on its own last line (a crop above the next line would clip low notes
  // or catch that line's bar number and high beams).
  function opening(score, total, width, readable) {
    var unitsPerInch = width / 6.5, model = null, layout = null;
    // 16 bars fills two lines with room to spare (8 for a full score, which keeps one); fewer if a cut
    // leaves an ending half-open.
    [score.staves.length > 4 ? 8 : 16, 12, 8, 4, 2].some(function (bars) {
      try {
        model = openingModel(score, Math.min(bars, total), 'print');
        layout = engrave(model, width, readable);
        return layout.systems.length > 0;
      } catch (err) { layout = null; return false; }
    });
    if (!layout) return null;
    var systems = layout.systems, kept = 1, shownBars = 0;
    while (kept < Math.min(2, systems.length) && systems[kept].bottom - systems[0].top <= unitsPerInch * 3) kept += 1;
    systems.slice(0, kept).forEach(function (sys) { sys.cols.forEach(function (c) { if (c.barEnd) shownBars += 1; }); });
    if (kept < systems.length) {
      try {
        var exact = openingModel(score, shownBars, 'print');
        exact.score.justifyLast = true;
        var exactLayout = engrave(exact, width, readable);
        if (exactLayout.systems.length === kept) { model = exact; layout = exactLayout; }
      } catch (err) { /* keep the cropped engraving */ }
    }
    return { model: model, layout: layout, kept: kept, shownBars: shownBars };
  }
  function openingFigure(score, excerpt) {
    var staff = score.staves[0], text = staff.voices ? staff.voices[0].notes : staff.notes;
    var segments = String(text || '').split('|');
    if (segments[segments.length - 1].trim() === '') segments.pop();
    var total = segments.length;
    // Large print first. A full score would fill a page with one system at that size, and a dense
    // piano piece can fit only a bar or two to a line, so those print at ordinary engraving size
    // (staff spaces about 1.6mm, like a study score) to show at least four bars.
    var big = score.staves.length > 4;
    var plan = big ? null : opening(score, total, OPENING_WIDTH, true);
    if (!plan || (plan.shownBars < 4 && plan.shownBars < total)) plan = opening(score, total, 1000, false) || plan;
    if (!plan) return null;
    var model = plan.model, layout = plan.layout, systems = layout.systems, kept = plan.kept, shownBars = plan.shownBars;
    var unitsPerInch = layout.width / 6.5;
    var top = Math.max(0, systems[0].top - layout.S * 1.8);
    var bottom = kept < systems.length ? systems[kept].top : layout.height;
    var first = barNumber(model, 0), last = barNumber(model, shownBars - 1);
    var whole = !excerpt && shownBars >= total;
    var bars = function (a, b) { return a === b ? 'bar ' + a : 'bars ' + a + '–' + b; };
    var box = el('div', { class: 'se-print-opening', 'aria-hidden': 'true' });
    // A tall system (a big orchestra) is narrowed to share its page with the text: 4.5in, or 5.5in
    // for a full score, whose dozen staves would otherwise shrink below a study score's size.
    var inches = (bottom - top) / unitsPerInch, cap = score.staves.length > 8 ? 5.5 : 4.5;
    var fit = inches > cap ? ' style="width:' + Math.round(cap / inches * 100) + '% !important"' : '';
    box.innerHTML = '<svg class="se-score" data-contrast-guard-skip' + fit + ' viewBox="0 ' + top + ' ' + layout.width + ' ' + (bottom - top) + '">' + layout.svg + '</svg>';
    var note = whole ? (total === 1 ? 'The whole passage.' : 'All ' + total + ' bars.') :
      'Opening ' + (first < 1 ? (last < 1 ? 'pickup' : 'pickup and ' + bars(1, last)) : bars(first, last)) + ' · full score: open the piece on screen and choose Print score.';
    if (score.source && score.source.label) note += ' Notes: ' + score.source.label + (score.source.license ? ' · ' + score.source.license : '') + '.';
    box.appendChild(el('p', { class: 'se-print-opening-note' }, note));
    return box;
  }
  function prepareLessonOpenings() {
    return Promise.allSettled(Array.from(document.querySelectorAll('figure[data-score][data-score-print="opening"]'), function (fig) {
      if (fig.scoreData || fig.scorePreviewData) return;
      return loadScorePreview(fig.dataset.score).then(function (preview) {
        fig.scorePreviewData = Object.assign({}, preview, { id: fig.dataset.score });
      });
    }));
  }
  function addPrintOpenings() {
    removePrintOpenings();
    if (document.body.classList.contains('se-print-score-active') || document.body.classList.contains('mz-print-rondo')) return;
    document.querySelectorAll('figure[data-score-print="opening"]').forEach(function (fig) {
      var score = fig.scoreData || fig.scorePreviewData;
      if (!score) return;
      var box = openingFigure(score, !fig.scoreData);
      if (!box) return;
      // Chrome strands a heading above an unbreakable box despite break-after: avoid, so the
      // heading just before the figure prints inside the box (the original is hidden in print).
      var heading = fig.previousElementSibling;
      if (heading && /^H[2-6]$/.test(heading.tagName)) {
        var copy = heading.cloneNode(true);
        copy.removeAttribute('id'); copy.removeAttribute('tabindex');
        box.insertBefore(copy, box.firstChild);
        heading.setAttribute('data-se-print-moved', '');
      }
      var paper = fig.querySelector(':scope > .se-paper');
      var cap = fig.querySelector(':scope > figcaption');
      if (paper) paper.after(box); else fig.insertBefore(box, cap);
      // The player, its guide and help are screen-only, but lesson-print-button.js plans page
      // breaks from the screen layout: a 700px player made the figure look page-sized, so it was
      // marked to split and its title stranded at the foot of a page. Tell the planner to skip them.
      fig.querySelectorAll(':scope > :is(.se-workspace, .se-guide, .se-help, .se-status, .se-source)').forEach(function (part) {
        if (part.hasAttribute('data-no-print')) return;
        part.setAttribute('data-no-print', '');
        part.setAttribute('data-se-print-skip', '');
      });
    });
  }
  function removePrintOpenings() {
    document.querySelectorAll('[data-se-print-skip]').forEach(function (part) {
      part.removeAttribute('data-no-print');
      part.removeAttribute('data-se-print-skip');
    });
    document.querySelectorAll('.se-print-opening').forEach(function (box) { box.remove(); });
    document.querySelectorAll('[data-se-print-moved]').forEach(function (h) { h.removeAttribute('data-se-print-moved'); });
  }
  if (typeof window !== 'undefined' && root === window) {
    // lesson-print-button.js asks for print-only content before it plans page breaks;
    // pages without it get the openings on beforeprint.
    root.addEventListener('classroomos:print-prepare', addPrintOpenings);
    root.addEventListener('beforeprint', function () { if (!root.ClassroomOSPrint) addPrintOpenings(); });
    root.addEventListener('afterprint', removePrintOpenings);
  }

  root.ScoreEngine = { loadLibrary: loadLibrary, loadScore: loadScore, loadScoreTitles: loadScoreTitles,
    openScore: openScore, prepareLessonOpenings: prepareLessonOpenings, showScoreLoading: showScoreLoading, afterScorePaint: afterScorePaint, previewSvg: previewSvg, openingFigure: openingFigure, prepare: prepare, analyse: analyse, playList: playList, engrave: engrave, paginate: paginate, render: render, printScore: printScorePages, preparePrintScore: preparePrintScorePages, parseStaff: parseStaff,
    barNumber: barNumber, barIndexOf: barIndexOf, buildGuide: buildGuide, coverageText: coverageText, writtenBeat: writtenBeat, perfBeat: perfBeat, Player: Player };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () { if (document.hidden) players.forEach(function (p) { if (p.playing) p.pause(); else if (p.loading) p.halt(); }); });
    root.addEventListener('pagehide', function () { players.forEach(function (p) { p.halt(); }); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
