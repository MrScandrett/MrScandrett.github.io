/* Every playable guitar shape for one chord, starting with its standard grip and following CAGED teaching order,
   plus the fingerboard diagram it draws (finger numbers, barre bars, root dots).
   options(GT, chord) -> [{ frets, id, tag, where, position, barre }] with frets low E -> high E ('x' = muted).
   chord = { rootPC, type: { suffix, intervals }, bassPC? }. GT is window.GuitarTheory (guitar-chords.js). */
(function (host) {
  'use strict';
  var OPEN = [40, 45, 50, 55, 59, 64];
  var MAX_SHAPES = 24;
  var CAGED = ['C', 'A', 'G', 'E', 'D'];
  var OPEN_ROOTS = { 0: 'C', 9: 'A', 7: 'G', 4: 'E', 2: 'D' };
  function pc(n) { return ((n % 12) + 12) % 12; }
  function pitches(frets) {
    return frets.map(function (f, s) { return typeof f === 'number' ? OPEN[s] + f : null; })
      .filter(function (n) { return n !== null; }).sort(function (a, b) { return a - b; });
  }
  function fretted(frets) { return frets.filter(function (f) { return typeof f === 'number' && f > 0; }); }
  function minFret(frets) { var n = fretted(frets); return n.length ? Math.min.apply(null, n) : 0; }
  function spanOf(frets) { var n = fretted(frets); return n.length ? Math.max.apply(null, n) - Math.min.apply(null, n) : 0; }
  // "x,0,2,2,1,0": the form a pick is saved in.
  function toId(frets) { return frets.map(function (f) { return typeof f === 'number' ? f : 'x'; }).join(','); }
  function fromId(id) {
    if (typeof id !== 'string') return null;
    var parts = id.split(',');
    if (parts.length !== 6) return null;
    var out = parts.map(function (p) { return p === 'x' ? 'x' : /^\d{1,2}$/.test(p) && Number(p) <= 24 ? Number(p) : NaN; });
    return out.some(function (f) { return f !== f; }) ? null : out;
  }

  // The chord with its slash bass folded in: a bass outside the chord becomes one more tone to play.
  function expand(GT, chord) {
    var ivs = chord.type.intervals.slice();
    if (chord.bassPC != null && !ivs.some(function (iv) { return pc(chord.rootPC + iv) === chord.bassPC; })) ivs.push(pc(chord.bassPC - chord.rootPC));
    var type = ivs.length === chord.type.intervals.length ? chord.type : { suffix: chord.type.suffix + ':bass' + chord.bassPC, intervals: ivs };
    var want = chord.bassPC != null ? chord.bassPC : chord.rootPC;
    var sorted = GT.sortedIntervals(type), inversion = 0;
    sorted.forEach(function (iv, i) { if (pc(chord.rootPC + iv) === want) inversion = i; });
    return { type: type, tones: ivs.map(function (iv) { return pc(chord.rootPC + iv); }), bass: want, inversion: inversion, fifth: pc(chord.rootPC + 7) };
  }
  // A shape belongs to the chord when it sounds nothing foreign, the bass is the chord's bass, and every tone is
  // there (a four-note chord may leave out its perfect fifth, as the open C7 does).
  function fits(frets, ex) {
    var notes = pitches(frets);
    if (notes.length < 3 || pc(notes[0]) !== ex.bass) return false;
    if (notes.some(function (n) { return ex.tones.indexOf(pc(n)) < 0; })) return false;
    return ex.tones.every(function (t) {
      return notes.some(function (n) { return pc(n) === t; }) || (ex.tones.length > 3 && t === ex.fifth && ex.fifth !== ex.bass);
    });
  }

  function innerMute(frets) {
    var first = -1, last = -1;
    frets.forEach(function (f, s) { if (typeof f === 'number') { if (first < 0) first = s; last = s; } });
    return frets.slice(first, last + 1).some(function (f) { return typeof f !== 'number'; });
  }

  function standardFamily(GT, chord, standardShape, forms) {
    var match = forms.find(function (entry) { return entry.id === toId(standardShape.frets); });
    if (match) return match.family;
    // The traditional open B7 (x-2-1-2-0-2) expands the C7-derived grip at
    // frets 1–2; the nearby A7-derived barre is a different family.
    if (chord.rootPC === 11 && chord.type.suffix === '7') return 'C';
    if (OPEN_ROOTS[chord.rootPC] && standardShape.frets.some(function (f) { return f === 0; })) return OPEN_ROOTS[chord.rootPC];
    if (standardShape.source && /^barre-[CAGED]$/.test(standardShape.source)) return standardShape.source.slice(-1);
    var best = null, distance = Infinity, first = pitches(standardShape.frets)[0];
    forms.forEach(function (entry) {
      if (pc(pitches(entry.frets)[0]) !== pc(first)) return;
      var d = entry.frets.reduce(function (sum, fret, i) {
        return sum + (typeof fret === 'number' && typeof standardShape.frets[i] === 'number'
          ? Math.abs(fret - standardShape.frets[i]) : fret === standardShape.frets[i] ? 0 : 3);
      }, 0);
      if (d < distance) { distance = d; best = entry.family; }
    });
    return distance <= 8 ? best : null;
  }

  function teachingOrder(shapes, chord) {
    var anchors = {};
    var starter = shapes.find(function (s) { return s.origin === 'standard'; });
    var start = starter && starter.family ? CAGED.indexOf(starter.family) : 0;
    var cycle = CAGED.slice(start).concat(CAGED.slice(0, start));
    CAGED.forEach(function (family) {
      anchors[family] = shapes.find(function (s) { return s.family === family && s.origin === 'standard'; }) ||
        shapes.find(function (s) { return s.family === family && s.origin === 'form'; });
    });
    shapes.forEach(function (s) {
      if (s.family) return;
      var best = null, distance = Infinity;
      CAGED.forEach(function (family) {
        var a = anchors[family];
        if (!a) return;
        var d = Math.min(Math.abs(s.position - a.position), Math.abs(s.position - a.position - 12), Math.abs(s.position - a.position + 12));
        if (d < distance) { distance = d; best = family; }
      });
      if (distance <= 2) s.family = best;
    });
    shapes.forEach(function (s) {
      s.foundation = anchors[s.family] === s || (s === starter && !s.family);
      s.voices = pitches(s.frets).length;
      s.stage = s.foundation ? 0 : s.voices <= chord.type.intervals.length ? 1 : 2;
      s.tag = s.foundation ? (s.family ? s.family + ' family · foundation' : 'Standard grip · foundation') :
        s.family ? 'Near ' + s.family + ' form · ' + (s.stage === 1 ? 'compact' : 'fuller') :
          (s.stage === 1 ? 'Compact voicing' : 'Fuller voicing');
    });
    shapes.sort(function (a, b) {
      if (a === starter) return -1;
      if (b === starter) return 1;
      return a.stage - b.stage || (a.family ? cycle.indexOf(a.family) : 5) - (b.family ? cycle.indexOf(b.family) : 5) ||
        a.rank - b.rank || a.id.localeCompare(b.id);
    });
    return shapes;
  }

  function options(GT, chord) {
    if (!GT || !chord || !chord.type) return [];
    var ex = expand(GT, chord), found = [], seen = {};
    function add(frets, tag, family, origin) {
      if (!frets || frets.length !== 6) return;
      var id = toId(frets);
      if (seen[id]) {
        if (family && !seen[id].family) seen[id].family = family;
        return;
      }
      if (!fits(frets, ex) || spanOf(frets) > 4) return;
      if (!tag && innerMute(frets)) return;   // a skipped string inside the grip is awkward to strum
      var shape = { frets: frets.slice(), id: id, tag: tag || '', family: family || null,
        origin: origin || 'variation', position: minFret(frets) };
      seen[id] = shape;
      found.push(shape);
    }
    var standard = chord.bassPC == null || chord.bassPC === chord.rootPC;
    if (standard) {
      var standardShape = GT.getChordShape(chord.rootPC, chord.type, 0);
      var forms = GT.availableForms(chord.rootPC, chord.type).map(function (family) {
        var shape = GT.getChordShape(chord.rootPC, chord.type, 0, family);
        return { family: family, frets: shape.frets, id: toId(shape.frets) };
      });
      add(standardShape.frets, 'Standard', standardFamily(GT, chord, standardShape, forms), 'standard');
      GT.availableForms(chord.rootPC, chord.type).forEach(function (form) {
        add(GT.getChordShape(chord.rootPC, chord.type, 0, form).frets, form.toUpperCase() + ' form', form, 'form');
      });
    }
    GT.findVoicings(chord.rootPC, ex.type, ex.inversion).forEach(function (frets) { add(frets, ''); });

    found.forEach(function (s) {
      var fingers = GT.computeFingering(s.frets);
      s.barre = barres(s.frets, fingers).length > 0;
      var hasOpen = s.frets.some(function (f) { return f === 0; }), reach = Math.max.apply(null, [0].concat(fretted(s.frets)));
      var low = hasOpen && reach <= 4;
      s.where = s.position === 0 || low ? 'Open position' : s.barre ? 'Barre · fret ' + s.position : 'Fret ' + s.position;
      s.muted = s.frets.filter(function (f) { return typeof f !== 'number'; }).length;
      // Neck order: open shapes first, then up the neck; tighter reach and fewer muted strings win a tie.
      s.rank = (low ? 0 : s.position) * 10 + spanOf(s.frets) * 2 + s.muted;
    });
    // Named shapes always make the list; the rest fill it in neck order.
    var named = found.filter(function (s) { return s.tag; }), rest = found.filter(function (s) { return !s.tag; });
    rest.sort(function (a, b) { return a.rank - b.rank; });
    var list = named.concat(rest.slice(0, Math.max(0, MAX_SHAPES - named.length)));
    return teachingOrder(list, chord);
  }

  // Imported TAB and saved user grips may sit outside the 24 generated options.
  // Keep the five foundations at the front when those grips are included.
  function withExtras(list, chord, extras) {
    var out = list.slice(), known = {};
    out.forEach(function (s) { known[s.id] = true; });
    (extras || []).forEach(function (extra) {
      if (!extra || !extra.frets) return;
      var id = toId(extra.frets);
      if (known[id]) return;
      known[id] = true;
      var position = minFret(extra.frets);
      out.push({ frets: extra.frets.slice(), id: id, position: position,
        rank: position * 10 + spanOf(extra.frets) * 2 + extra.frets.filter(function (f) { return typeof f !== 'number'; }).length,
        family: null, origin: 'variation' });
    });
    return teachingOrder(out, chord);
  }

  // A barre is the same finger holding down two or more strings at one fret.
  function barres(frets, fingers) {
    var by = {};
    frets.forEach(function (f, s) {
      var n = fingers[s];
      if (typeof f !== 'number' || f < 1 || typeof n !== 'number') return;
      (by[n] || (by[n] = { finger: n, fret: f, strings: [] })).strings.push(s);
    });
    return Object.keys(by).map(function (k) { return by[k]; }).filter(function (b) { return b.strings.length > 1; });
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  // The diagram: 6 strings, 5 frets, finger numbers in the dots, a bar for each barre, the root in orange.
  function diagram(GT, frets, chord, label) {
    var fingers = GT.computeFingering(frets), nums = fretted(frets);
    var maxF = nums.length ? Math.max.apply(null, nums) : 0, base = maxF <= 5 ? 1 : Math.min.apply(null, nums);
    var rows = 5, sp = 18, rh = 20, left = 14, top = 26, w = left + sp * 5 + 30, h = top + rows * rh + 6, out = [];
    for (var r = 0; r <= rows; r++) out.push('<line x1="' + left + '" x2="' + (left + sp * 5) + '" y1="' + (top + r * rh) + '" y2="' + (top + r * rh) + '" stroke="#7d705b" stroke-width="' + (r === 0 && base === 1 ? 4 : 1) + '"/>');
    for (var s = 0; s < 6; s++) out.push('<line x1="' + (left + s * sp) + '" x2="' + (left + s * sp) + '" y1="' + top + '" y2="' + (top + rows * rh) + '" stroke="#3d352b" stroke-width="1"/>');
    if (base > 1) out.push('<text x="' + (left + sp * 5 + 14) + '" y="' + (top + rh * .5 + 4) + '" class="fb-sp-fr">' + base + '</text>');
    barres(frets, fingers).forEach(function (b) {
      var y = top + (b.fret - base + .5) * rh, x1 = left + Math.min.apply(null, b.strings) * sp, x2 = left + Math.max.apply(null, b.strings) * sp;
      out.push('<rect x="' + (x1 - 6) + '" y="' + (y - 6.5) + '" width="' + (x2 - x1 + 12) + '" height="13" rx="6.5" class="fb-sp-barre"/>');
    });
    frets.forEach(function (f, st) {
      var x = left + st * sp;
      if (typeof f !== 'number') { out.push('<text x="' + x + '" y="' + (top - 9) + '" class="fb-sp-mute">×</text>'); return; }
      if (f === 0) { out.push('<circle cx="' + x + '" cy="' + (top - 11) + '" r="4" class="fb-sp-open"/>'); return; }
      var y = top + (f - base + .5) * rh, isRoot = pc(OPEN[st] + f) === chord.rootPC;
      out.push('<circle cx="' + x + '" cy="' + y + '" r="7.5" class="fb-sp-dot' + (isRoot ? ' is-root' : '') + '"/>');
      if (typeof fingers[st] === 'number') out.push('<text x="' + x + '" y="' + y + '" class="fb-sp-fing">' + fingers[st] + '</text>');
    });
    return '<svg class="fb-sp-svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label) + '" data-contrast-guard-skip>' + out.join('') + '</svg>';
  }
  function describe(frets) {
    return frets.map(function (f) { return typeof f === 'number' ? f : 'muted'; }).join(' ');
  }

  var api = { options: options, withExtras: withExtras, diagram: diagram, barres: barres, toId: toId, fromId: fromId, describe: describe };
  host.FakeBookShapeOptions = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
