/* Connected standard-tuning chord grips. Uses GuitarTheory's screened candidates. */
(function (host) {
  'use strict';
  var OPEN = [40, 45, 50, 55, 59, 64];
  function pc(n) { return ((n % 12) + 12) % 12; }
  function pitches(frets) { return frets.map(function (f, s) { return typeof f === 'number' ? OPEN[s] + f : null; }).filter(function (n) { return n !== null; }).sort(function (a, b) { return a - b; }); }
  function position(frets) {
    var f = frets.filter(function (n) { return typeof n === 'number' && n > 0; });
    return f.length ? Math.min.apply(null, f) : 0;
  }
  function motion(a, b, mode) {
    var cost = Math.abs(position(a) - position(b)) * (mode === 'low' ? 1 : 2);
    a.forEach(function (f, s) {
      var next = b[s], on = typeof f === 'number', nextOn = typeof next === 'number';
      if (on && nextOn) cost += Math.abs(f - next) + (mode === 'common' && f !== next && pc(OPEN[s] + f) === pc(OPEN[s] + next) ? 6 : 0);
      else if (on !== nextOn) cost += 3;
      if (mode === 'common' && on && f !== next && pitches(b).some(function (n) { return pc(n) === pc(OPEN[s] + f); })) cost += 4;
    });
    return cost;
  }
  function candidates(chord, mode, GT) {
    var ivs = chord.type.intervals.slice();
    if (mode === 'shell' && ivs.length >= 4) ivs = [ivs[0], ivs[1], ivs[3]];
    if (chord.bassPC != null && !ivs.some(function (iv) { return pc(chord.rootPC + iv) === chord.bassPC; })) ivs.push(pc(chord.bassPC - chord.rootPC));
    var type = { suffix: chord.type.suffix + ':connected:' + ivs.join(','), intervals: ivs };
    var found = [], seen = {};
    ivs.forEach(function (iv, inversion) {
      if (chord.bassPC != null && pc(chord.rootPC + iv) !== chord.bassPC) return;
      GT.findVoicings(chord.rootPC, type, inversion).forEach(function (frets) {
        var key = frets.join(',');
        if (seen[key]) return;
        seen[key] = true;
        var nums = frets.filter(function (f) { return typeof f === 'number' && f > 0; });
        var notes = pitches(frets), expected = ivs.map(function (iv) { return pc(chord.rootPC + iv); });
        if (!notes.length || !expected.every(function (p) { return notes.some(function (n) { return pc(n) === p; }); })) return;
        if (notes.some(function (n) { return expected.indexOf(pc(n)) < 0; })) return;
        if (nums.length && Math.max.apply(null, nums) - Math.min.apply(null, nums) > 3) return;
        if (GT.computeFingering(frets).indexOf('?') >= 0) return;
        if (chord.bassPC != null && pc(notes[0]) !== chord.bassPC) return;
        found.push({ frets: frets, notes: notes, position: position(frets), local: (nums.length ? Math.max.apply(null, nums) - Math.min.apply(null, nums) : 0) * .2 + notes.length * .08 });
      });
    });
    // Bound the path search while retaining grips from every neck position.
    var buckets = {};
    found.sort(function (a, b) { return a.local - b.local; });
    return found.filter(function (c) { var key = c.position; buckets[key] = (buckets[key] || 0) + 1; return buckets[key] <= 4; });
  }
  function plan(chords, mode, GT) {
    if (!GT || mode === 'manual') return [];
    var cache = {}, layers = chords.map(function (c) {
      var key = [c.rootPC, c.type.suffix, c.type.intervals.join(','), c.bassPC].join('|');
      return (cache[key] || (cache[key] = candidates(c, mode, GT))).map(function (candidate) { return Object.assign({}, candidate); });
    });
    var result = Array(chords.length).fill(null), start = 0;
    // Missing grips break the path, rather than inventing a playable shape.
    while (start < layers.length) {
      if (!layers[start].length) { start++; continue; }
      var end = start;
      while (end < layers.length && layers[end].length) {
        layers[end].forEach(function (c) {
          var local = c.local + c.position * (mode === 'low' ? 1.2 : .08);
          c.cost = end === start ? local : Infinity; c.previous = -1;
          if (end === start) return;
          layers[end - 1].forEach(function (prev, i) {
            var score = prev.cost + motion(prev.frets, c.frets, mode) + local;
            if (score < c.cost) { c.cost = score; c.previous = i; }
          });
        });
        end++;
      }
      var last = layers[end - 1], best = 0;
      last.forEach(function (c, i) { if (c.cost < last[best].cost) best = i; });
      for (var i = end - 1; i >= start; i--) { result[i] = layers[i][best]; best = result[i].previous; }
      start = end;
    }
    return result;
  }
  var api = { plan: plan, candidates: candidates, motion: motion, pitches: pitches };
  host.FakeBookGuitarVoice = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
