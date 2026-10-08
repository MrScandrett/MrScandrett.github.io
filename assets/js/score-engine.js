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
 *   (C4 E4 G4)/2   chord        ~ tie to the next note      ^ fermata
 *   !p !mf !f      dynamic for the next note (also sets playback loudness)
 *   A duration may be left off to repeat the previous one. Write pitches as they sound
 *   (F#4, Bb3); the engine decides which accidentals to print from the key signature.
 *   "n" forces a printed natural (Bn4) where a courtesy natural helps the reader.
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

  function parseStaff(text, where) {
    var bars = String(text).split('|').map(function (s) { return s.trim(); });
    if (bars[bars.length - 1] === '') bars.pop();
    var last = null, dyn = null;
    return bars.map(function (bar, bi) {
      var events = [], t = 0;
      (bar.match(/\([^)]*\)\S*|\S+/g) || []).forEach(function (tok) {
        var w = where + ', bar ' + (bi + 1) + ', "' + tok + '"';
        if (tok.charAt(0) === '!') {
          dyn = tok.slice(1);
          if (!DYN_VEL[dyn]) fail(w, 'unknown dynamic');
          return;
        }
        var m = /^(\([^)]*\)|[A-G](?:##|bb|#|b|n)?-?\d+|r|R)(?:\/(\d+)(\.{0,2}))?(~?)(\^?)$/.exec(tok);
        if (!m) fail(w, 'cannot read this token');
        var dur;
        if (m[2]) {
          var base = BASES[m[2]];
          if (!base) fail(w, 'duration must be 1, 2, 4, 8, 16 or 32');
          last = { base: base, dots: m[3].length };
        } else if (!last && m[1] !== 'R') fail(w, 'first note needs a duration');
        var ev = { start: t, dyn: dyn, fermata: !!m[5], tie: !!m[4] };
        dyn = null;
        if (m[1] === 'R') {
          ev.kind = 'rest'; ev.whole = true; ev.base = 4; ev.dots = 0; ev.dur = null;
        } else {
          ev.base = last.base; ev.dots = last.dots;
          ev.dur = last.base * (last.dots === 2 ? 1.75 : last.dots === 1 ? 1.5 : 1);
          if (m[1] === 'r') ev.kind = 'rest';
          else {
            ev.kind = 'note';
            var list = m[1].charAt(0) === '(' ? m[1].slice(1, -1).trim().split(/\s+/) : [m[1]];
            ev.pitches = list.map(function (s) { return parsePitchToken(s, w); })
              .sort(function (a, b) { return a.diatonic - b.diatonic || a.midi - b.midi; });
          }
        }
        if (ev.tie && ev.kind !== 'note') fail(w, 'only notes can be tied');
        events.push(ev);
        t += ev.dur || 0;
      });
      return { events: events, length: t };
    });
  }

  function timeSig(score) {
    var m = /^(\d+)\/(\d+)$/.exec(score.time || '4/4');
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
    var staves = score.staves.map(function (st, si) {
      var where = id + ', staff ' + (si + 1);
      if (!M.clefs[st.clef || 'treble']) fail(where, 'unknown clef "' + st.clef + '"');
      return { clef: st.clef || 'treble', label: st.label || '', instrument: st.instrument || null, bars: parseStaff(st.notes || '', where) };
    });
    var count = staves[0].bars.length;
    staves.forEach(function (st, si) {
      if (st.bars.length !== count) fail(id + ', staff ' + (si + 1), 'has ' + st.bars.length + ' bars but staff 1 has ' + count);
      st.bars.forEach(function (bar, bi) {
        var want = bi === 0 && pickup ? pickup : ts.len;
        bar.events.forEach(function (ev) { if (ev.whole) ev.dur = want; });
        bar.length = bar.events.reduce(function (s, ev) { return s + ev.dur; }, 0);
        var lastBar = bi === count - 1;
        if (Math.abs(bar.length - want) > EPS && !(lastBar && bar.length < want)) {
          fail(id + ', staff ' + (si + 1) + ', bar ' + (bi + 1), 'adds up to ' + bar.length + ' beats, expected ' + want);
        }
      });
    });
    // Every staff's last bar must be the same length (a final bar may be short to balance a pickup).
    var ends = staves.map(function (st) { return st.bars[count - 1].length; });
    if (ends.some(function (e) { return Math.abs(e - ends[0]) > EPS; })) throw new Error(id + ': staves end at different points in the last bar');
    var barStart = [], t = 0;
    for (var b = 0; b < count; b++) { barStart.push(t); t += staves[0].bars[b].length; }
    var ksig = score.key || 0;
    if (Math.abs(ksig) > 7) throw new Error(id + ': key must be -7…7 (flats negative, sharps positive)');
    return { score: score, id: id, ts: ts, pickup: pickup, key: ksig, staves: staves, barStart: barStart, total: t, count: count };
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
    var keyAlt = keyAlters(model.key);
    model.staves.forEach(function (st, si) {
      var prev = null;
      st.bars.forEach(function (bar, bi) {
        var state = {};
        bar.events.forEach(function (ev) {
          ev.bar = bi; ev.staff = si; ev.abs = model.barStart[bi] + ev.start;
          if (ev.kind !== 'note') { prev = ev; return; }
          ev.pitches.forEach(function (p) {
            var cont = prev && prev.tie && prev.kind === 'note' && prev.pitches.some(function (q) { return q.midi === p.midi; });
            p.tiedFrom = !!cont;
            var k = p.l + ':' + p.o;
            var cur = k in state ? state[k] : keyAlt[p.l];
            p.showAcc = (!cont || prev.bar === bi) && (p.a !== cur || p.force) ? p.a : null;
            if (cont && prev.bar !== bi) p.showAcc = null;
            if (!cont || prev.bar === bi) state[k] = p.a;
          });
          prev = ev;
        });
      });
      // Tie targets: link each tied pitch to the next event that holds it.
      var flat = [];
      st.bars.forEach(function (bar) { flat = flat.concat(bar.events); });
      flat.forEach(function (ev, i) {
        if (!ev.tie || ev.kind !== 'note') return;
        var next = flat[i + 1];
        ev.tieTo = next && next.kind === 'note' ? next : null;
      });
    });
  }

  // Notes to sound: tied notes merge into one long note.
  function playList(model) {
    var out = [];
    model.staves.forEach(function (st, si) {
      var vel = DYN_VEL.mf, flat = [];
      st.bars.forEach(function (bar) { flat = flat.concat(bar.events); });
      flat.forEach(function (ev) {
        if (ev.dyn) vel = DYN_VEL[ev.dyn];
        if (ev.kind !== 'note') return;
        ev.pitches.forEach(function (p) {
          if (p.tiedFrom) return;
          var dur = ev.dur, cur = ev;
          while (cur.tie && cur.tieTo && cur.tieTo.pitches.some(function (q) { return q.midi === p.midi; })) {
            cur = cur.tieTo; dur += cur.dur;
          }
          out.push({ staff: si, start: ev.abs, dur: dur, midi: p.midi, vel: vel, fermata: ev.fermata });
        });
      });
    });
    return out.sort(function (a, b) { return a.start - b.start; });
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
      st.bars.forEach(function (bar) {
        bar.events.forEach(function (ev) {
          if (ev.kind !== 'note') return;
          var lo = stepOf(ev.pitches[0], st.clef), hi = stepOf(ev.pitches[ev.pitches.length - 1], st.clef);
          ev.lo = lo; ev.hi = hi;
          // The note farthest from the middle line decides; a tie points the stem down.
          ev.up = (4 - lo) > (hi - 4);
          ev.beam = null;
        });
        bar.beams = beamGroups(bar, model.ts);
        bar.beams.forEach(function (g) {
          var far = 0;
          g.events.forEach(function (ev) {
            if (Math.abs(ev.hi - 4) > Math.abs(far)) far = ev.hi - 4;
            if (Math.abs(ev.lo - 4) > Math.abs(far)) far = ev.lo - 4;
          });
          var up = far < 0;
          g.events.forEach(function (ev) { ev.up = up; ev.beam = g; });
          g.up = up;
        });
      });
    });
  }

  // Column spacing for a gap of `d` quarter-note beats, in staff spaces.
  function gapFor(d) { return 2.1 + 2.7 * Math.pow(Math.max(d, 0.125), 0.6); }

  function layoutBars(model, S) {
    return model.barStart.map(function (b0, bi) {
      var times = {};
      var len = model.staves[0].bars[bi].length;
      model.staves.forEach(function (st) {
        st.bars[bi].events.forEach(function (ev) {
          var c = times[ev.start.toFixed(4)] = times[ev.start.toFixed(4)] || { t: ev.start, acc: 0, seconds: false, events: [], whole: false };
          c.events.push(ev);
          if (ev.whole) c.whole = true;
          if (ev.kind === 'note') {
            var n = ev.pitches.filter(function (p) { return p.showAcc !== null; }).length;
            c.acc = Math.max(c.acc, n ? Math.min(3, n) : 0);
            for (var i = 1; i < ev.pitches.length; i++) {
              if (ev.pitches[i].diatonic - ev.pitches[i - 1].diatonic === 1) c.seconds = true;
            }
          }
        });
      });
      var cols = Object.keys(times).map(function (k) { return times[k]; }).sort(function (a, b) { return a.t - b.t; });
      var x = 1.4, widths = [];
      cols.forEach(function (c, i) {
        x += c.acc ? 1.15 * c.acc + 0.2 : 0;
        c.x = x;
        var next = i + 1 < cols.length ? cols[i + 1].t : len;
        var w = gapFor(next - c.t) + (c.seconds ? 1.1 : 0);
        widths.push(w);
        x += w;
      });
      var whole = cols.length === 1 && cols[0].whole;
      if (whole) { cols[0].x = 4; x = 9; }
      return { cols: cols, width: Math.max(x + 0.4, 6) * S, natural: x, whole: whole };
    });
  }

  function engrave(model, width) {
    var M = root.MusicNotation;
    var S = width < 520 ? 7.5 : width < 820 ? 8.5 : 9.5;
    var h = S / 2;
    decideStems(model);
    var bars = layoutBars(model, S);
    var keyW = Math.abs(model.key) * (model.key > 0 ? 1.05 : 0.95) * S;
    var grand = model.staves.length === 2 && model.score.grand !== false;
    var braceW = grand || model.staves.length > 1 ? 1.4 * S : 0;
    var tsDigits = String(model.ts.num).length > String(model.ts.den).length ? String(model.ts.num) : String(model.ts.den);
    var timeW = (tsDigits.length * 1.8 + 1.2) * S;
    var left = 0.5 * S + braceW;
    function headerW(first) { return 3.6 * S + keyW + (first ? timeW : 0) + 0.6 * S; }

    // Break into systems.
    var systems = [], cur = null, avail;
    bars.forEach(function (b, bi) {
      var hw = headerW(bi === 0);
      if (!cur || cur.used + b.width > cur.avail + 0.5) {
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
          if (ev.kind !== 'note') return;
          hi = Math.max(hi, ev.hi + (ev.up ? 7 : 1) + (ev.fermata ? 4 : 0));
          lo = Math.min(lo, ev.lo - (ev.up ? 1 : 7));
        });
      });
      return { hi: hi + 1, lo: lo - 1 - (dyn ? 5 : 0) };
    }

    var out = [], hl = [], y = 0, evIndex = 0;
    var ink = 'currentColor';
    var lineW = Math.max(1, 0.11 * S);
    var allEvents = [];

    systems.forEach(function (sys, sIndex) {
      var stretch = sys.avail / sys.used;
      var last = sIndex === systems.length - 1;
      if (last && stretch > 1.45) stretch = 1;
      if (stretch < 1) stretch = 1;
      var ext = model.staves.map(function (_, si) { return extents(sys, si); });
      var bottoms = [];
      var top = y + (sIndex === 0 && model.score.tempoText ? 2.4 * S : 0.6 * S);
      model.staves.forEach(function (st, si) {
        var above = Math.max(8, ext[si].hi) * h;
        var below = Math.max(0, -ext[si].lo) * h;
        var gapAbove = si === 0 ? above : Math.max(above, 2.5 * S);
        var bottom = top + gapAbove;
        bottoms.push(bottom);
        top = bottom + below + (si < model.staves.length - 1 ? 1.2 * S : 0);
      });
      var sysTop = bottoms[0] - 8 * h, sysBottom = bottoms[bottoms.length - 1];
      var x0 = left, x1 = left + sys.header + sys.bars.reduce(function (s, bi) { return s + bars[bi].width * stretch; }, 0);
      if (!last || stretch > 1) x1 = Math.min(x1, width - 1.5 * S);

      // Staff lines, clefs, key and time signatures.
      model.staves.forEach(function (st, si) {
        var b = bottoms[si];
        for (var l = 0; l < 5; l++) out.push('<line x1="' + x0 + '" x2="' + x1 + '" y1="' + (b - l * S) + '" y2="' + (b - l * S) + '" stroke="' + ink + '" stroke-width="' + lineW + '" class="se-line"/>');
        out.push(M.clef(st.clef, x0 + 0.7 * S, b, h));
        var kx = x0 + 3.6 * S;
        var pos = M.clefs[st.clef][model.key > 0 ? 'sharp' : 'flat'];
        for (var k = 0; k < Math.abs(model.key); k++) {
          out.push(M.accidental(model.key > 0 ? 1 : -1, kx, b - pos[k] * h, S));
          kx += (model.key > 0 ? 1.05 : 0.95) * S;
        }
        if (sys.first === 0) {
          var tx = x0 + 3.6 * S + keyW + 0.5 * S;
          var dw = function (str) { return str.split('').reduce(function (s, d) { return s + [470, 334, 446, 421, 470, 403, 434, 441, 436, 434][+d] / 250 * S; }, 0); };
          var wn = dw(String(model.ts.num)), wd = dw(String(model.ts.den)), wmax = Math.max(wn, wd);
          [[String(model.ts.num), 6, wn], [String(model.ts.den), 2, wd]].forEach(function (row) {
            var dx = tx + (wmax - row[2]) / 2;
            row[0].split('').forEach(function (d) {
              out.push(M.glyph('timeSig' + d, dx, b - row[1] * h, S));
              dx += [470, 334, 446, 421, 470, 403, 434, 441, 436, 434][+d] / 250 * S;
            });
          });
        }
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
        out.push('<text class="se-tempo" x="' + (x0 + 3.6 * S) + '" y="' + (sysTop - 1.2 * S - (ext[0].hi > 10 ? (ext[0].hi - 10) * h : 0)) + '" font-size="' + (1.45 * S) + '">' + M.escape(model.score.tempoText) + '</text>');
      }
      var firstBarNo = sys.bars[0] + (model.pickup ? 0 : 1);
      if (firstBarNo > 1) out.push('<text class="se-barno" x="' + (x0 + 0.2 * S) + '" y="' + (sysTop - 1.0 * S - Math.max(0, ext[0].hi - 9) * h) + '" font-size="' + (1.1 * S) + '">' + firstBarNo + '</text>');

      var bx0 = x0 + sys.header;
      var sysCols = [];
      sys.bars.forEach(function (bi, k) {
        var bar = bars[bi], bw = bar.width * stretch;
        var sx = function (u) { return bx0 + (bar.whole ? bw * 0.5 - 0.9 * S : u * S * stretch); };
        bar.cols.forEach(function (c) { c.px = sx(c.x); sysCols.push({ t: model.barStart[bi] + c.t, x: c.px, sys: sIndex }); });
        model.staves.forEach(function (st, si) {
          var b = bottoms[si];
          var barModel = st.bars[bi];
          barModel.events.forEach(function (ev) {
            var col = bar.cols.find(function (c) { return Math.abs(c.t - ev.start) < EPS; });
            ev.x = ev.whole ? bx0 + bw / 2 - 0.7 * S : col.px;
            ev.bottom = b; ev.sys = sIndex; ev.sysEnd = x1; ev.sysStart = bx0;
            ev.i = evIndex++;
            allEvents.push(ev);
          });
          // Beams first, so stems know where to stop.
          barModel.beams.forEach(function (g) { placeBeam(g, st.clef, b, S, h); });
          barModel.events.forEach(function (ev) { out.push(drawEvent(ev, st.clef, b, S, h, model)); });
          barModel.beams.forEach(function (g) { out.push(drawBeam(g, S)); });
        });
        var xe = bx0 + bw;
        var final = bi === model.count - 1;
        // An excerpt that stops mid-piece ("ending": "open") ends on a plain barline.
        if (final && model.score.ending !== 'open') {
          out.push('<line x1="' + (xe - 0.75 * S) + '" x2="' + (xe - 0.75 * S) + '" y1="' + sysTop + '" y2="' + sysBottom + '" stroke="' + ink + '" stroke-width="' + lineW * 1.4 + '"/>');
          out.push('<rect x="' + (xe - 0.5 * S) + '" y="' + sysTop + '" width="' + (0.5 * S) + '" height="' + (sysBottom - sysTop) + '" fill="currentColor"/>');
        } else {
          (grand ? [[sysTop, sysBottom]] : bottoms.map(function (bb) { return [bb - 8 * h, bb]; })).forEach(function (r) {
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

    var height = Math.ceil(y + S);
    return { svg: out.join(''), height: height, width: width, systems: hl, events: allEvents, S: S };
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

  function drawEvent(ev, clef, b, S, h, model) {
    var M = root.MusicNotation;
    var out = '<g class="se-ev" data-i="' + ev.i + '">';
    var lw = 0.12 * S;
    if (ev.kind === 'rest') {
      var mid = b - 4 * h;
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
        out += M.glyph(name, ev.x + (shifted[k] || 0) * (w - lw), b - steps[k] * h, S, 'se-head');
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
      var fy = Math.min(b - 10 * h, ev.kind === 'note' ? Math.min(b - ev.hi * h - 1.6 * S, ev.up ? ev.tipY - 0.8 * S : Infinity) : Infinity);
      out += M.glyph('fermataAbove', ev.x + (ev.headW || 1.2 * S) / 2 - 1.2 * S, fy, S);
    }
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
      var below = ev.pitches.length > 1 ? k < ev.pitches.length / 2 : ev.up;
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
    if (!audio.ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      audio.ctx = new AC();
      var comp = audio.ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 3;
      audio.out = audio.ctx.createGain();
      audio.out.gain.value = 0.9;
      audio.out.connect(comp); comp.connect(audio.ctx.destination);
    }
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
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
  }
  Player.prototype.qpm = function () { return this.baseQpm * this.rate; };
  Player.prototype.play = function () {
    var self = this;
    players.forEach(function (p) { if (p !== self && p.playing) p.pause(); });
    var c = context();
    if (this.pos >= this.model.total - EPS) this.pos = 0;
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
    var c = audio.ctx, horizon = c.currentTime + 0.2, self = this;
    while (this.next < this.notes.length && this.timeOf(this.notes[this.next].start) < horizon) {
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
    if (this.timeOf(this.model.total) < c.currentTime) {
      if (this.loop) { this.pos = 0; this.stopVoices(false); clearInterval(this.timer); this.play(); }
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
    this.pos = Math.min(this.model.total, this.beatAt(audio.ctx.currentTime));
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
  Player.prototype.stop = function () { this.pos = 0; this.halt(); this.ui.cursor(0); };
  Player.prototype.seek = function (beat) {
    var was = this.playing;
    if (was) this.halt();
    this.pos = beat;
    this.ui.cursor(beat);
    if (was) this.play();
  };
  Player.prototype.frame = function () {
    var self = this;
    if (!this.playing) return;
    var beat = this.beatAt(audio.ctx.currentTime);
    this.ui.light(beat);
    this.ui.cursor(beat);
    this.raf = requestAnimationFrame(function () { self.frame(); });
  };

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
    root.MusicSynth.instruments.forEach(function (k) { inst.appendChild(el('option', { value: k }, LABELS[k] || k)); });
    instLbl.appendChild(inst);
    var loopLbl = el('label', { class: 'se-check' });
    var loop = el('input', { type: 'checkbox' });
    loopLbl.appendChild(loop); loopLbl.appendChild(document.createTextNode(' Loop'));
    bar.appendChild(playBtn); bar.appendChild(stopBtn); bar.appendChild(tempoLbl); bar.appendChild(instLbl); bar.appendChild(loopLbl);
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

    var cap = fig.querySelector('figcaption');
    fig.insertBefore(head, cap);
    fig.insertBefore(paper, cap);
    fig.insertBefore(bar, cap);
    fig.insertBefore(status, cap);
    if (score.source) {
      var src = el('p', { class: 'se-source' });
      src.appendChild(document.createTextNode('Notes: ' + (score.source.label || 'source') + (score.source.license ? ' · ' + score.source.license : '') + ' '));
      if (score.source.url) {
        var a = el('a', { href: score.source.url, target: '_blank', rel: 'noopener' }, 'Source ↗');
        src.appendChild(a);
      }
      fig.insertBefore(src, cap);
    }

    var player = new Player(fig, model);
    players.push(player);
    var layout = null, lit = [], cursorEl = null;

    function draw() {
      var w = Math.max(280, Math.round(svgWrap.clientWidth || paper.clientWidth || 640));
      if (layout && Math.abs(layout.width - w) < 2) return;
      layout = engrave(model, w);
      var label = (score.title || 'Score') + '. ' + model.count + ' bars in ' + model.ts.num + '/' + model.ts.den + (score.keyName ? ', ' + score.keyName : '') + '.';
      svgWrap.innerHTML = '<svg class="se-score" role="img" aria-label="' + root.MusicNotation.escape(label) + '" viewBox="0 0 ' + layout.width + ' ' + layout.height + '" width="' + layout.width + '" height="' + layout.height + '">' +
        '<rect class="se-cursor" x="0" y="0" width="' + (layout.S * 0.35) + '" height="0" rx="' + layout.S * 0.15 + '" opacity="0"/>' + layout.svg + '</svg>';
      cursorEl = svgWrap.querySelector('.se-cursor');
      lit = [];
      if (!player.playing) player.ui.cursor(player.pos);
    }

    player.ui = {
      update: function () {
        playBtn.textContent = player.playing ? '❚❚ Pause' : '▶ Play';
        playBtn.setAttribute('aria-pressed', player.playing ? 'true' : 'false');
        fig.classList.toggle('se-playing', player.playing);
      },
      light: function (beat) {
        if (!layout) return;
        var on = beat < 0 ? [] : layout.events.filter(function (ev) {
          return ev.kind === 'note' && !player.mutes[ev.staff] && ev.abs <= beat + EPS && beat < ev.abs + ev.dur - EPS;
        });
        var ids = on.map(function (e) { return e.i; });
        lit.forEach(function (i) { if (ids.indexOf(i) < 0) { var g = svgWrap.querySelector('.se-ev[data-i="' + i + '"]'); if (g) g.classList.remove('is-on'); } });
        ids.forEach(function (i) { if (lit.indexOf(i) < 0) { var g = svgWrap.querySelector('.se-ev[data-i="' + i + '"]'); if (g) g.classList.add('is-on'); } });
        lit = ids;
        if (on.length) {
          var b = on[0].bar + (model.pickup ? 0 : 1);
          var msg = model.pickup && on[0].bar === 0 ? 'Pickup' : 'Bar ' + b;
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
    stopBtn.addEventListener('click', function () { player.stop(); status.textContent = ''; });
    tempo.addEventListener('input', function () {
      var r = +tempo.value / 100;
      tempoOut.textContent = tempo.value + '%';
      if (player.playing) { player.pause(); player.rate = r; player.play(); } else player.rate = r;
    });
    inst.addEventListener('change', function () { player.instOverride = !!inst.value; player.instrument = inst.value || score.instrument || 'piano'; });
    loop.addEventListener('change', function () { player.loop = loop.checked; });
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
      var names = ev.pitches.map(function (p) { return 'CDEFGAB'.charAt(p.l) + ({ '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' })[p.a] + p.o; });
      status.textContent = names.join(' + ') + ' — press Play to start here';
    });

    draw();
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

  root.ScoreEngine = { prepare: prepare, analyse: analyse, playList: playList, engrave: engrave, render: render, parseStaff: parseStaff };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
