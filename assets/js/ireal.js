/* ireal.js — reads iReal Pro chord-chart links (irealb:// and the older irealbook://)
 * into plain bars of chords, so a student can paste a chart they already have and
 * play along with it here. Nothing is fetched or uploaded: the link is the chart.
 *
 * The link format is not officially published; this follows the descriptions in
 * the open-source readers that have handled it for years (pianosnake/ireal-reader,
 * infojunkie/ireal-musicxml). Written for this site; no code copied from them.
 *
 *   IReal.parse(text) -> { songs: [song], playlist: name|null }
 *   song = { title, composer, style, key, minor, bpm, meter: [n, d],
 *            bars: [{ chords: [{ root, quality, bass, beats }], section, notes }],
 *            sections: 'A A B A', warnings: [...] }
 * Bars come out in playing order: repeats, endings, D.C./D.S., codas and Fine
 * are unrolled, and bar/2-bar repeat signs are filled in.
 */
(function (global) {
  'use strict';

  var PREFIX = '1r34LbKcu7';

  // The chord text is scrambled in 50-character blocks: the first and last five
  // characters trade places, and so do characters 10–23 with 26–39.
  function unscrambleBlock(s) {
    var c = s.split('');
    for (var i = 0; i < 5; i++) { c[49 - i] = s[i]; c[i] = s[49 - i]; }
    for (i = 10; i < 24; i++) { c[49 - i] = s[i]; c[i] = s[49 - i]; }
    return c.join('');
  }
  function unscramble(s) {
    var out = '';
    while (s.length > 51) {
      var block = s.slice(0, 50);
      s = s.slice(50);
      out += s.length < 2 ? block : unscrambleBlock(block);
    }
    return out + s;
  }

  function decode(s) {
    try { return decodeURIComponent(s.replace(/\+/g, '%2B')); } catch (e) { return s; }
  }

  // "Kern Jerome" -> "Jerome Kern"; "Fine Romance, A" -> "A Fine Romance".
  function tidyComposer(s) {
    s = (s || '').trim();
    var w = s.split(/\s+/);
    return w.length === 2 ? w[1] + ' ' + w[0] : s;
  }
  function tidyTitle(s) {
    var m = /^(.*), (The|A|An)$/.exec((s || '').trim());
    return m ? m[2] + ' ' + m[1] : (s || '').trim();
  }

  /* ---------------------------------------------------------------- links */
  // Pull every chart out of a pasted link, a playlist link, or a whole saved
  // iReal HTML page (which wraps the link in an <a href>).
  function findLinks(text) {
    var out = [], re = /ireal(b|book):\/\/([^"'<>\s]+)/gi, m;
    while ((m = re.exec(text || ''))) out.push({ kind: m[1].toLowerCase(), body: decode(m[2]) });
    return out;
  }

  function parse(text) {
    var songs = [], playlist = null;
    findLinks(text).forEach(function (link) {
      var parts = link.body.split('===');
      // A playlist ends with its name after the last ===.
      if (parts.length > 1 && parts[parts.length - 1].indexOf('=') < 0) playlist = parts.pop() || playlist;
      parts.forEach(function (p) {
        if (!p.trim()) return;
        var song = link.kind === 'b' ? songFromB(p) : songFromBook(p);
        if (song) songs.push(song);
      });
    });
    return { songs: songs, playlist: playlist };
  }

  // irealb://Title=Composer=?=Style=Key=Transpose=Music=CompStyle=BPM=Repeats
  function songFromB(s) {
    var f = s.split('=');
    if (f.length < 7) return null;
    var music = f[6];
    if (music.indexOf(PREFIX) === 0) music = unscramble(music.slice(PREFIX.length));
    return build(f[0], f[1], f[3], f[4], Number(f[8]) || 0, music);
  }
  // irealbook://Title=Composer=Style=Key=n=Music (older, not scrambled)
  function songFromBook(s) {
    var f = s.split('=');
    if (f.length < 6) return null;
    return build(f[0], f[1], f[2], f[3], 0, f[5]);
  }

  function build(title, composer, style, key, bpm, music) {
    var km = /^([A-G][b#]?)(-?)/.exec(key || 'C') || ['C', 'C', ''];
    var song = {
      title: tidyTitle(title) || 'Untitled', composer: tidyComposer(composer), style: (style || '').trim(),
      key: km[1], minor: km[2] === '-', bpm: bpm, warnings: []
    };
    var chart = readChart(music, song.warnings);
    song.meter = chart.meter;
    song.meterChanges = chart.meterChanges;
    writtenChords(chart.bars, chart.meter[0] * 4 / chart.meter[1]);
    song.bars = unroll(chart.bars, song.warnings);
    var seen = [];
    song.bars.forEach(function (b) { if (b.section) seen.push(b.section); });
    song.sections = seen.join(' ');
    return song;
  }

  /* ---------------------------------------------------------------- chart */
  var CHORD = /([A-G][b#]?|W)((?:\^|-|h|o|\+|sus|alt|add|[0-9]|[b#])*)(?:\/([A-G][b#]?))?/y;
  var METERS = { '44': [4, 4], '34': [3, 4], '24': [2, 4], '54': [5, 4], '64': [6, 4], '74': [7, 4], '22': [2, 2], '32': [3, 2], '58': [5, 8], '68': [6, 8], '78': [7, 8], '98': [9, 8], '12': [12, 8] };

  // Turns the chart text into bars (in written order) with their signs attached.
  // A bar is a list of cells: each chord or blank is one cell, so "C7 F7 " puts
  // F7 halfway through the bar.
  function readChart(src, warnings) {
    src = src.replace(/XyQ/g, '   ').replace(/LZ/g, ' |').replace(/Kcl/g, '| x');
    var bars = [], cur = null, meter = null, changes = 0, pending = {}, i = 0, n = src.length;
    function bar() {
      if (!cur) { cur = { cells: [], start: {}, end: {} }; Object.assign(cur.start, pending); pending = {}; }
      return cur;
    }
    function close(sign) {
      if (cur && (cur.cells.some(function (c) { return c !== ' '; }) || cur.repeat1 || cur.repeat2 || cur.start.ending || Object.keys(cur.end).length)) {
        if (sign) cur.end[sign] = true;
        bars.push(cur);
      } else if (sign && bars.length) {
        bars[bars.length - 1].end[sign] = true;   // "][" and similar: a sign with no bar of its own
      }
      cur = null;
    }
    while (i < n) {
      var ch = src[i];
      if (ch === '<') {                                       // comment: D.C., D.S., Fine, 3x, ...
        var j = src.indexOf('>', i);
        var text = src.slice(i + 1, j < 0 ? n : j);
        var b = bar(); b.notes = (b.notes ? b.notes + ' ' : '') + text;
        i = j < 0 ? n : j + 1; continue;
      }
      if (ch === '(') { var k = src.indexOf(')', i); i = k < 0 ? n : k + 1; continue; }   // alternate chords: skipped
      if (ch === '*' && i + 1 < n) { pending.section = src[i + 1] === 'i' ? 'Intro' : src[i + 1] === 'V' ? 'Verse' : src[i + 1]; if (cur) cur.start.section = pending.section, delete pending.section; i += 2; continue; }
      if (ch === 'T' && /\d\d/.test(src.substr(i + 1, 2))) {
        var mt = METERS[src.substr(i + 1, 2)];
        if (mt) { if (meter && (mt[0] !== meter[0] || mt[1] !== meter[1])) changes++; meter = meter || mt; }
        i += 3; continue;
      }
      if (ch === 'N' && /[0-9]/.test(src[i + 1] || '')) { var e = Number(src[i + 1]); if (cur) cur.start.ending = e; else pending.ending = e; i += 2; continue; }
      if (ch === '{') { close(); pending.repeatStart = true; i++; continue; }
      if (ch === '}') { close('repeatEnd'); i++; continue; }
      if (ch === '[') { close(); i++; continue; }
      if (ch === ']') { close('double'); i++; continue; }
      if (ch === '|') { close(); i++; continue; }
      if (ch === 'Z') { close('final'); i++; continue; }
      if (ch === 'S') { bar().start.segno = true; i++; continue; }
      if (ch === 'Q') { var qb = bar(); if (qb.cells.some(function (c) { return c !== ' '; })) qb.end.coda = true; else qb.start.coda = true; i++; continue; }
      if (ch === 'x') { bar().repeat1 = true; i++; continue; }
      if (ch === 'r') { bar().repeat2 = true; i++; continue; }
      if (ch === 'n') { bar().cells.push({ nc: true }); i++; continue; }
      if (ch === 'p') { bar().cells.push({ slash: true }); i++; continue; }
      if (ch === ' ') { if (cur) cur.cells.push(' '); i++; continue; }
      if ('Ylsf,U'.indexOf(ch) >= 0) { i++; continue; }      // spacing, chord size, fermata, separators, end mark
      CHORD.lastIndex = i;
      var m = CHORD.exec(src);
      if (m && m[0]) {
        bar().cells.push({ root: m[1] === 'W' ? null : m[1], quality: m[2], bass: m[3] || null });
        i += m[0].length; continue;
      }
      warnings.push('Skipped an unknown mark "' + ch + '".');
      i++;
    }
    close();
    if (changes) warnings.push('The time signature changes partway through; it is read as ' + (meter || [4, 4]).join('/') + ' throughout.');
    return { bars: bars, meter: meter || [4, 4], meterChanges: changes };
  }

  // Chords in a bar, with beats, from the cells. Blank cells hold the chord before them.
  function barChords(b, M, prev) {
    if (b.cells.length && b.cells.every(function (c) { return c === ' '; })) b.cells = [];
    var cells = b.cells.slice();
    while (cells.length && cells[cells.length - 1] === ' ') cells.pop();
    var slots = [], total = b.cells.length;
    cells.forEach(function (c, k) {
      if (c === ' ') return;
      var chord = c.slash || c.nc ? prev : c.root ? { root: c.root, quality: c.quality, bass: c.bass } : prev && { root: prev.root, quality: prev.quality, bass: c.bass };
      slots.push({ cell: k, chord: chord });
      prev = chord || prev;
    });
    if (!slots.length) return prev ? [{ root: prev.root, quality: prev.quality, bass: prev.bass, beats: M }] : [];
    // Place each chord at its cell; fall back to the usual splits when cells don't land on beats.
    var at = slots.map(function (s) { return s.cell * M / Math.max(total, 1); });
    var onBeats = at.every(function (x, k) { return Math.abs(x - Math.round(x)) < 1e-6 && (k === 0 || x > at[k - 1]); }) && at[0] === 0;
    if (!onBeats) {
      var even = Math.floor(M / slots.length), extra = M - even * slots.length, pos = 0;
      at = slots.map(function (s, k) { var p = pos; pos += even + (k < extra ? 1 : 0); return p; });
    }
    var out = [];
    slots.forEach(function (s, k) {
      var beats = (k + 1 < slots.length ? at[k + 1] : M) - at[k];
      if (!s.chord || beats <= 0) return;
      var last = out[out.length - 1];
      if (last && last.root === s.chord.root && last.quality === s.chord.quality && last.bass === s.chord.bass) last.beats += beats;
      else out.push({ root: s.chord.root, quality: s.chord.quality, bass: s.chord.bass, beats: beats });
    });
    return out;
  }

  /* ---------------------------------------------------------------- form */
  // Chords for every written bar. Bar repeat signs copy the bars written before
  // them: x the one bar, r the two bars (filling this bar and the next).
  function writtenChords(bars, M) {
    var prev = null, copyNext = null;
    bars.forEach(function (b, k) {
      if (copyNext && !b.cells.some(function (c) { return c !== ' '; })) { b.chords = copyNext; copyNext = null; }
      else if (b.repeat2 && k >= 2) { b.chords = bars[k - 2].chords; copyNext = bars[k - 1].chords; }
      else if (b.repeat1 && k >= 1) b.chords = bars[k - 1].chords;
      else b.chords = barChords(b, M, prev);
      if (b.chords.length) prev = b.chords[b.chords.length - 1];
    });
  }

  // Plays the written bars in order the way a musician would read them.
  function unroll(bars, warnings) {
    // Endings run from their N mark to the next repeat sign or double bar.
    var ending = 0;
    bars.forEach(function (b) {
      if (b.start.repeatStart) ending = 0;
      if (b.start.ending) ending = b.start.ending;
      b.ending = ending;
      if (b.end.repeatEnd || b.end.double || b.end.final) ending = 0;
    });
    // Each closing } goes back to the { before it (or the top). The number of
    // passes is the most endings it has, or a "3x" written in the chart.
    var opens = [], times = {}, lastStart = 0;
    bars.forEach(function (b, k) {
      if (b.start.repeatStart) opens.push(k);
      if (b.end.repeatEnd) {
        var s = opens.length ? opens.pop() : lastStart, most = 2;
        lastStart = s;
        for (var q = s; q < bars.length && (q <= k || bars[q].ending); q++) if (bars[q].ending) most = Math.max(most, bars[q].ending);
        var note = /(\d+)\s*x/i.exec(b.notes || '');
        times[k] = { start: s, total: note ? Number(note[1]) : most };
      }
    });
    var closes = Object.keys(times).map(Number).sort(function (a, b) { return a - b; });
    function enclosing(i) { for (var c = 0; c < closes.length; c++) if (times[closes[c]].start <= i && i <= closes[c]) return closes[c]; return null; }
    function laterEnding(i) {
      for (var q = i + 1; q < bars.length; q++) { if (bars[q].ending > bars[i].ending) return true; if (bars[q].start.repeatStart || (!bars[q].ending && q > i + 1)) break; }
      return false;
    }
    var segno = -1, codas = [];
    bars.forEach(function (b, k) { if (b.start.segno && segno < 0) segno = k; if (b.start.coda || b.end.coda) codas.push(k); });

    var out = [], pass = {}, lastPass = null, jumped = false, guard = 0, i = 0;
    while (i < bars.length && guard++ < 4000) {
      var b = bars[i], rk = enclosing(i);
      var p = rk !== null ? (pass[rk] || 1) : lastPass;
      var skip = !!b.ending && (jumped ? laterEnding(i) : p !== null && b.ending !== p);
      var toCoda = jumped && codas.length > 1 && i === codas[0];
      if (toCoda && b.start.coda) { i = codas[1]; continue; }
      if (!skip) out.push({ chords: b.chords, section: b.start.section || null, notes: b.notes || '' });
      if (!skip && jumped && /\bfine\b/i.test(b.notes || '')) break;
      if (toCoda && !skip) { i = codas[1]; continue; }
      if (b.end.repeatEnd && times[i] && !jumped) {
        pass[i] = (pass[i] || 1) + 1;
        if (pass[i] <= times[i].total) { i = times[i].start; continue; }
        lastPass = times[i].total;
      }
      if (!skip && !jumped && /D\.?\s?C\./i.test(b.notes || '')) { jumped = true; i = 0; continue; }
      if (!skip && !jumped && /D\.?\s?S\./i.test(b.notes || '')) { jumped = true; i = segno >= 0 ? segno : 0; continue; }
      i++;
    }
    if (guard >= 4000) warnings.push('The form was too tangled to follow all the way, so it stops early.');
    return out;
  }

  var api = { parse: parse, unscramble: unscramble, findLinks: findLinks };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else global.IReal = api;
})(typeof window !== 'undefined' ? window : this);
