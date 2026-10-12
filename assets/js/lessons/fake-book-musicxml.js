/* fake-book-musicxml.js — MusicXML import for the fake book.
   Turns a MusicXML lead sheet (.musicxml / .xml, or compressed .mxl, as MuseScore,
   Finale, Sibelius, Dorico and Noteflight export it) into a fake-book tune: the
   melody, the chord symbols, key, meter and pickup, in the notation documented in
   data/fake-book.json's "format" block.

   What it does with a real score:
   - Melody: the first part that has chord symbols (else the first pitched part),
     its top staff, the voice with the most notes there; in a chord, the top note.
     Transposing parts are written back to concert pitch.
   - Repeats, 1st/2nd endings, D.C./D.S., Fine and To Coda are played out
     ("unrolled") into one straight line, like the iReal import does.
   - Rhythms snap to the nearest sixteenth or triplet eighth (the finest values the
     fake book writes). 2/4 is re-barred as 4/4.

   Pure functions, no DOM: parse(text) and parseFile(bytes) (async, for .mxl) are
   exported for tests; fake-book.js turns the result into a library tune. */
(function (root) {
  'use strict';

  var LETTERS = 'CDEFGAB', NAT = [0, 2, 4, 5, 7, 9, 11];
  var MAJOR_KEYS = { '-7': 'Cb', '-6': 'Gb', '-5': 'Db', '-4': 'Ab', '-3': 'Eb', '-2': 'Bb', '-1': 'F', '0': 'C', '1': 'G', '2': 'D', '3': 'A', '4': 'E', '5': 'B', '6': 'F#', '7': 'C#' };
  var MINOR_KEYS = { '-7': 'Ab', '-6': 'Eb', '-5': 'Bb', '-4': 'F', '-3': 'C', '-2': 'G', '-1': 'D', '0': 'A', '1': 'E', '2': 'B', '3': 'F#', '4': 'C#', '5': 'G#', '6': 'D#', '7': 'A#' };
  var MAX_BARS = 400;
  var U = 12;                       // timeline units per quarter note (sixteenths and triplet eighths both land on it)
  function mod(n, m) { return ((n % m) + m) % m; }

  /* ================================================================ XML */
  // A small, forgiving XML reader: elements, attributes, text, CDATA and entities.
  // Comments, the prolog and the DOCTYPE are skipped. Enough for MusicXML.
  function decodeEntities(s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, function (all, e) {
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e.toLowerCase()];
    });
  }
  function parseXML(src) {
    var doc = { name: '#document', attrs: {}, children: [], text: '' }, stack = [doc], i = 0, n = src.length;
    var ATTR_RE = /([^\s=\/>]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    while (i < n) {
      var lt = src.indexOf('<', i);
      if (lt < 0) lt = n;
      if (lt > i) stack[stack.length - 1].text += decodeEntities(src.slice(i, lt));
      if (lt >= n) break;
      if (src.startsWith('<!--', lt)) { var ce = src.indexOf('-->', lt + 4); i = ce < 0 ? n : ce + 3; continue; }
      if (src.startsWith('<![CDATA[', lt)) {
        var cd = src.indexOf(']]>', lt + 9); if (cd < 0) cd = n;
        stack[stack.length - 1].text += src.slice(lt + 9, cd); i = cd + 3; continue;
      }
      if (src.startsWith('<?', lt)) { var pe = src.indexOf('?>', lt + 2); i = pe < 0 ? n : pe + 2; continue; }
      if (src.startsWith('<!', lt)) {
        // <!DOCTYPE …> may carry an internal subset in [ … ].
        var j = lt + 2, depth = 0;
        while (j < n && !(src[j] === '>' && depth === 0)) { if (src[j] === '[') depth++; else if (src[j] === ']') depth--; j++; }
        i = j + 1; continue;
      }
      var gt = lt + 1, q = null;
      while (gt < n && (q || src[gt] !== '>')) { var ch = src[gt]; if (q) { if (ch === q) q = null; } else if (ch === '"' || ch === "'") q = ch; gt++; }
      var body = src.slice(lt + 1, gt);
      i = gt + 1;
      if (body[0] === '/') {
        var closeName = body.slice(1).trim();
        for (var k = stack.length - 1; k > 0; k--) if (stack[k].name === closeName) { stack.length = k; break; }
        continue;
      }
      var selfClose = body[body.length - 1] === '/';
      if (selfClose) body = body.slice(0, -1);
      var nm = /^[^\s\/>]+/.exec(body);
      if (!nm) continue;
      var el = { name: nm[0], attrs: {}, children: [], text: '' }, a;
      ATTR_RE.lastIndex = 0;
      var rest = body.slice(nm[0].length);
      while ((a = ATTR_RE.exec(rest))) el.attrs[a[1]] = decodeEntities(a[3] !== undefined ? a[3] : a[4]);
      stack[stack.length - 1].children.push(el);
      if (!selfClose) stack.push(el);
    }
    return doc;
  }
  function kid(e, name) { if (!e) return null; for (var i = 0; i < e.children.length; i++) if (e.children[i].name === name) return e.children[i]; return null; }
  function kids(e, name) { return e ? e.children.filter(function (c) { return c.name === name; }) : []; }
  function txt(e, name) { var c = name ? kid(e, name) : e; return c ? c.text.trim() : ''; }
  function num(e, name, dflt) { var s = txt(e, name); var v = parseFloat(s); return s && isFinite(v) ? v : dflt; }
  function walk(e, fn) { fn(e); e.children.forEach(function (c) { walk(c, fn); }); }

  /* ================================================================ pitch helpers */
  // Move a spelled pitch by a <transpose> (diatonic steps + semitones), keeping the spelling sensible.
  function transposeSpelled(step, alter, octave, tr) {
    var dia = octave * 7 + LETTERS.indexOf(step), midi = 12 * (octave + 1) + NAT[LETTERS.indexOf(step)] + alter;
    if (tr) { dia += tr.diatonic + 7 * tr.octave; midi += tr.chromatic + 12 * tr.octave; }
    return spell(dia, midi);
  }
  function natMidi(dia) { return 12 * (Math.floor(dia / 7) + 1) + NAT[mod(dia, 7)]; }
  function spell(dia, midi) {
    var a = midi - natMidi(dia);
    // Double sharps/flats stay only if MusicXML wrote them; a transposition that makes one respells it.
    while (a > 2) { dia++; a = midi - natMidi(dia); }
    while (a < -2) { dia--; a = midi - natMidi(dia); }
    return { dia: dia, midi: midi, step: LETTERS[mod(dia, 7)], alter: a, octave: Math.floor(dia / 7) };
  }
  function rootName(step, alter, tr) {
    var p = transposeSpelled(step, alter, 4, tr);
    if (Math.abs(p.alter) > 1) p = spell(p.dia + (p.alter > 0 ? 1 : -1), p.midi);
    return p.step + (p.alter === 1 ? '#' : p.alter === -1 ? 'b' : '');
  }
  var ACC_TOKEN = { '-2': 'bb', '-1': 'b', '0': '', '1': '#', '2': '##' };

  /* ================================================================ chord symbols */
  var KIND = {
    'major': '', 'minor': 'm', 'augmented': 'aug', 'diminished': 'dim', 'dominant': '7',
    'major-seventh': 'maj7', 'minor-seventh': 'm7', 'diminished-seventh': 'dim7', 'augmented-seventh': 'aug7',
    'half-diminished': 'm7b5', 'major-minor': 'm(maj7)', 'major-sixth': '6', 'minor-sixth': 'm6',
    'dominant-ninth': '9', 'major-ninth': 'maj9', 'minor-ninth': 'm9',
    'dominant-11th': '11', 'major-11th': 'maj11', 'minor-11th': 'm11',
    'dominant-13th': '13', 'major-13th': 'maj13', 'minor-13th': 'm13',
    'suspended-second': 'sus2', 'suspended-fourth': 'sus4', 'power': '5', 'pedal': '',
    'Neapolitan': '', 'Italian': '7', 'French': '7', 'German': '7', 'Tristan': '7', 'other': ''
  };
  function harmonyToken(h, tr) {
    var r = kid(h, 'root'), kindEl = kid(h, 'kind');
    if (!r) return null;                                     // function-only harmony (roman numerals): skip
    var kind = txt(kindEl) || 'major';
    if (kind === 'none') return 'NC';
    var q = KIND.hasOwnProperty(kind) ? KIND[kind] : '';
    kids(h, 'degree').forEach(function (d) {
      var v = num(d, 'degree-value', 0), al = num(d, 'degree-alter', 0), type = txt(d, 'degree-type');
      if (!v) return;
      if (kind === 'minor-seventh' && v === 5 && al === -1 && type === 'alter') { q = 'm7b5'; return; }
      var acc = al > 0 ? '#' : al < 0 ? 'b' : '';
      if (type === 'add' && v === 7 && /^sus/.test(q)) q = '7' + q;
      else if (type === 'add') q += (acc ? acc : 'add') + v;
      else if (type === 'alter') q += acc + v;
      else if (type === 'subtract') q += 'no' + v;
    });
    var tok = rootName(txt(r, 'root-step'), num(r, 'root-alter', 0), tr) + q.replace(/[\s\/:|]/g, '');
    var b = kid(h, 'bass');
    if (b && txt(b, 'bass-step')) tok += '/' + rootName(txt(b, 'bass-step'), num(b, 'bass-alter', 0), tr);
    return tok;
  }

  /* ================================================================ zip (.mxl) */
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function isZip(bytes) { return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4; }
  function zipEntries(b) {
    var eocd = -1;
    for (var i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('That .mxl file looks damaged (no zip directory).');
    var count = u16(b, eocd + 10), p = u32(b, eocd + 16), out = [];
    for (var k = 0; k < count; k++) {
      if (u32(b, p) !== 0x02014b50) break;
      var method = u16(b, p + 10), csize = u32(b, p + 20), nlen = u16(b, p + 28), xlen = u16(b, p + 30), clen = u16(b, p + 32), off = u32(b, p + 42);
      var name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nlen));
      var dataAt = off + 30 + u16(b, off + 26) + u16(b, off + 28);
      out.push({ name: name, method: method, data: b.subarray(dataAt, dataAt + csize) });
      p += 46 + nlen + xlen + clen;
    }
    return out;
  }
  function inflate(entry) {
    if (entry.method === 0) return Promise.resolve(entry.data);
    if (entry.method !== 8) return Promise.reject(new Error('That .mxl file uses a compression this page can’t open.'));
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('This browser can’t unzip .mxl files. Export uncompressed MusicXML (.musicxml) instead.'));
    var stream = new Blob([entry.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
  }
  function readMxl(bytes) {
    var entries = zipEntries(bytes), byName = {};
    entries.forEach(function (e) { byName[e.name] = e; });
    var pick = function (name) { return inflate(byName[name]).then(function (b) { return new TextDecoder().decode(b); }); };
    var fallback = entries.filter(function (e) { return /\.(musicxml|xml)$/i.test(e.name) && !/^META-INF\//i.test(e.name); })[0];
    if (byName['META-INF/container.xml']) {
      return pick('META-INF/container.xml').then(function (c) {
        var rf = null;
        walk(parseXML(c), function (e) { if (!rf && e.name === 'rootfile' && e.attrs['full-path']) rf = e.attrs['full-path']; });
        if (rf && byName[rf]) return pick(rf);
        if (fallback) return pick(fallback.name);
        throw new Error('No score found inside that .mxl file.');
      });
    }
    if (fallback) return pick(fallback.name);
    return Promise.reject(new Error('No score found inside that .mxl file.'));
  }

  /* ================================================================ score → measures */
  function looksLikeMusicXML(text) { return /<score-(partwise|timewise)[\s>]/.test(text || ''); }

  function chooseMelodyPart(parts) {
    var stats = parts.map(function (p) {
      var pitched = 0, harm = 0;
      walk(p, function (e) { if (e.name === 'pitch') pitched++; else if (e.name === 'harmony') harm++; });
      return { part: p, pitched: pitched, harm: harm };
    }).filter(function (s) { return s.pitched > 0; });
    if (!stats.length) throw new Error('That file has no notes with pitches in it.');
    return (stats.filter(function (s) { return s.harm > 0; })[0] || stats[0]).part;
  }

  // Read one part into measures: note events per voice, chord symbols, length and road-map signs.
  function readMeasures(part) {
    var divisions = 1, transpose = null, firstKey = null, meter = null, meterChange = null, tempo = null, styleWords = null;
    var measures = [], endingOpen = null;
    kids(part, 'measure').forEach(function (m, mi) {
      var cur = 0, maxT = 0, lastOnset = 0, notes = [], harms = [];
      var info = { number: m.attrs.number || String(mi + 1), implicit: m.attrs.implicit === 'yes', notes: notes, harms: harms,
        repeatStart: false, repeatEnd: false, times: 2, endings: null, segno: false, coda: false, tocoda: false, fine: false, dacapo: false, dalsegno: false };
      if (endingOpen) info.endings = endingOpen;
      var soundAttrs = function (s) {
        if (!s) return;
        if (s.attrs.tempo && tempo === null) tempo = parseFloat(s.attrs.tempo);
        if (s.attrs.segno) info.segno = true;
        if (s.attrs.coda) info.coda = true;
        if (s.attrs.tocoda) info.tocoda = true;
        if (s.attrs.fine !== undefined) info.fine = true;
        if (s.attrs.dacapo === 'yes') info.dacapo = true;
        if (s.attrs.dalsegno) info.dalsegno = true;
      };
      m.children.forEach(function (c) {
        if (c.name === 'attributes') {
          if (kid(c, 'divisions')) divisions = num(c, 'divisions', divisions) || divisions;
          var k = kid(c, 'key');
          if (k && !firstKey && kid(k, 'fifths')) firstKey = { fifths: num(k, 'fifths', 0), mode: txt(k, 'mode') };
          var t = kid(c, 'time');
          if (t && kid(t, 'beats')) {
            var mt = [parseInt(txt(t, 'beats'), 10), parseInt(txt(t, 'beat-type'), 10)];
            if (!meter) meter = mt;
            else if (mt[0] * 4 / mt[1] !== meter[0] * 4 / meter[1] && !meterChange) meterChange = { at: info.number, meter: mt };
          }
          var tr = kid(c, 'transpose');
          if (tr) transpose = { diatonic: num(tr, 'diatonic', 0), chromatic: num(tr, 'chromatic', 0), octave: num(tr, 'octave-change', 0) };
        } else if (c.name === 'backup') {
          cur -= num(c, 'duration', 0) / divisions;
        } else if (c.name === 'forward') {
          cur += num(c, 'duration', 0) / divisions; maxT = Math.max(maxT, cur);
        } else if (c.name === 'harmony') {
          var tok = harmonyToken(c, transpose);
          if (tok) harms.push({ t: cur + num(c, 'offset', 0) / divisions, tok: tok });
        } else if (c.name === 'direction') {
          kids(c, 'direction-type').forEach(function (dt) {
            if (kid(dt, 'segno')) info.segno = true;
            if (kid(dt, 'coda')) info.coda = true;
            var met = kid(dt, 'metronome');
            if (met && tempo === null && kid(met, 'per-minute')) {
              var unit = { whole: 4, half: 2, quarter: 1, eighth: 0.5, '16th': 0.25 }[txt(met, 'beat-unit')] || 1;
              if (kid(met, 'beat-unit-dot')) unit *= 1.5;
              var pm = num(met, 'per-minute', 0);
              if (pm) tempo = pm * unit;
            }
            kids(dt, 'words').forEach(function (w) {
              var s = w.text.trim();
              if (/\bD\.?\s?C\.?(\s|$)|da\s+capo/i.test(s)) info.dacapo = true;
              else if (/\bD\.?\s?S\.?(\s|$)|dal\s+segno/i.test(s)) info.dalsegno = true;
              else if (/^\s*fine\.?\s*$/i.test(s)) info.fine = true;
              else if (/to\s+coda/i.test(s)) info.tocoda = true;
              else if (!styleWords && /swing|bossa|latin|samba|ballad|rock|pop|funk|waltz|straight|even|two[- ]beat|dixie/i.test(s)) styleWords = s;
            });
          });
          soundAttrs(kid(c, 'sound'));
        } else if (c.name === 'sound') {
          soundAttrs(c);
        } else if (c.name === 'barline') {
          var rep = kid(c, 'repeat'), end = kid(c, 'ending');
          if (rep && rep.attrs.direction === 'forward') info.repeatStart = true;
          if (rep && rep.attrs.direction === 'backward') { info.repeatEnd = true; if (rep.attrs.times) info.times = Math.max(2, parseInt(rep.attrs.times, 10) || 2); }
          if (end) {
            var nums = (end.attrs.number || '').split(/[,\s]+/).map(function (x) { return parseInt(x, 10); }).filter(function (x) { return x > 0; });
            if (end.attrs.type === 'start') { endingOpen = nums.length ? nums : [1]; info.endings = endingOpen; }
            else endingOpen = null;
          }
          soundAttrs(kid(c, 'sound'));
        } else if (c.name === 'note') {
          if (kid(c, 'grace')) return;
          var dur = num(c, 'duration', 0) / divisions, isChord = !!kid(c, 'chord');
          var onset = isChord ? lastOnset : cur;
          if (!isChord) { lastOnset = cur; cur += dur; maxT = Math.max(maxT, cur); }
          if (kid(c, 'cue')) return;
          var p = kid(c, 'pitch'), ties = kids(c, 'tie').concat(kids(kid(c, 'notations'), 'tied'));
          var ev = {
            t: onset, dur: dur, voice: txt(c, 'voice') || '1', staff: txt(c, 'staff') || '1', chord: isChord,
            tieStart: ties.some(function (x) { return x.attrs.type === 'start' || x.attrs.type === 'continue'; }),
            pitched: !!p
          };
          if (p) {
            var sp = transposeSpelled(txt(p, 'step'), num(p, 'alter', 0), num(p, 'octave', 4), transpose);
            ev.step = sp.step; ev.alter = Math.round(sp.alter); ev.octave = sp.octave; ev.midi = sp.midi;
          }
          if (kid(c, 'unpitched')) ev.pitched = false;
          notes.push(ev);
        }
      });
      info.len = maxT;
      measures.push(info);
    });
    return { measures: measures, firstKey: firstKey, meter: meter || [4, 4], meterChange: meterChange, tempo: tempo, transpose: transpose, styleWords: styleWords };
  }

  /* ================================================================ road map: repeats, endings, D.C./D.S. */
  function unroll(ms) {
    var n = ms.length, out = [], segnoAt = -1;
    for (var s = 0; s < n; s++) if (ms[s].segno) { segnoAt = s; break; }
    var groupMax = new Array(n).fill(0);
    for (var g = 0; g < n;) {
      if (!ms[g].endings) { g++; continue; }
      var h = g, mx = 0;
      while (h < n && ms[h].endings) { mx = Math.max.apply(null, [mx].concat(ms[h].endings)); h++; }
      for (var k = g; k < h; k++) groupMax[k] = mx;
      g = h;
    }
    var pos = 0, pass = 1, repStart = 0, jumped = false, played = {}, guard = 0, viaJump = false, prevHadEnding = false;
    while (pos < n && guard++ < 4000 && out.length < MAX_BARS * 2) {
      var m = ms[pos];
      if (m.repeatStart && !viaJump) { repStart = pos; }
      if (!m.endings && prevHadEnding && !viaJump) pass = 1;
      viaJump = false;
      if (m.endings) {
        var want = jumped ? groupMax[pos] : Math.min(pass, groupMax[pos]);
        prevHadEnding = true;
        if (m.endings.indexOf(want) < 0) { pos++; continue; }
      } else prevHadEnding = false;
      out.push(pos);
      if (m.fine && jumped) break;
      if (m.tocoda && jumped) {
        var codaAt = -1;
        for (var c = pos + 1; c < n; c++) if (ms[c].coda) { codaAt = c; break; }
        if (codaAt >= 0) { pos = codaAt; viaJump = true; prevHadEnding = false; continue; }
      }
      if (m.repeatEnd && !jumped) {
        var cnt = played[pos] || 1;
        if (cnt < m.times) { played[pos] = cnt + 1; pass = cnt + 1; pos = repStart; viaJump = true; continue; }
        repStart = pos + 1;                                     // a later repeat with no start sign goes back to here
      }
      if ((m.dacapo || m.dalsegno) && !jumped) {
        jumped = true; viaJump = true; prevHadEnding = false;
        pos = m.dalsegno && segnoAt >= 0 ? segnoAt : 0;
        continue;
      }
      pos++;
    }
    return out;
  }

  /* ================================================================ timeline → fake-book tokens */
  // Durations the fake book can write, in units (U per quarter): s3 s e3 e. … w.
  var COINS = [
    [72, 'w.'], [48, 'w'], [36, 'h.'], [24, 'h'], [18, 'q.'], [16, 'h3'], [12, 'q'], [9, 'e.'], [8, 'q3'], [6, 'e'], [4, 'e3'], [3, 's'], [2, 's3']
  ];
  var SPLIT = (function () {   // fewest tokens for every length up to two 12/8 bars (anything ≥ 2 units works)
    var best = [[]];
    for (var L = 1; L <= 160; L++) {
      var b = null;
      COINS.forEach(function (c) { if (c[0] <= L && best[L - c[0]] && (!b || best[L - c[0]].length + 1 < b.length)) b = [c[1]].concat(best[L - c[0]]); });
      best[L] = b;
    }
    return best;
  })();
  function split(L) {
    var out = [];
    while (L > 160) { out.push('w'); L -= 48; }
    return out.concat(SPLIT[L] || []);
  }
  function snap(beats) {   // nearest sixteenth or triplet eighth, in units; sixteenths win ties
    var x = beats * U, a = Math.round(x / 3) * 3, b = Math.round(x / 4) * 4;
    return Math.abs(b - x) < Math.abs(a - x) - 1e-6 ? b : a;
  }

  function buildMelody(events, pickupU, barU) {
    // events: [{s, e, midi, step, alter, octave, tie}] in units, sorted; null pitch = rest
    var ev = [];
    events.forEach(function (x) {
      if (x.e <= x.s) return;
      var last = ev[ev.length - 1];
      if (last && x.s < last.e) { last.e = x.s; if (last.e <= last.s) ev.pop(); last = ev[ev.length - 1]; }
      if (last && x.s > last.e) ev.push({ s: last.e, e: x.s, rest: true });
      else if (!last && x.s > 0) ev.push({ s: 0, e: x.s, rest: true });
      ev.push(x);
    });
    // A single unit can't be written: give it to the neighbour before it.
    for (var i = 0; i < ev.length; i++) {
      if (ev[i].e - ev[i].s !== 1) continue;
      if (i > 0) { ev[i - 1].e = ev[i].e; ev.splice(i, 1); i--; }
      else if (ev[1]) { ev[1].s = ev[0].s; ev.splice(0, 1); i--; }
    }
    var end = ev.length ? ev[ev.length - 1].e : 0;
    var total = pickupU + Math.max(1, Math.ceil((end - pickupU) / barU)) * barU;
    if (end < total) ev.push({ s: end, e: total, rest: true });
    var bars = [], cur = [], barEnd = pickupU || barU;
    ev.forEach(function (x, xi) {
      var s = x.s;
      while (s < x.e) {
        var segEnd = Math.min(x.e, barEnd), toks = split(segEnd - s);
        var lastPiece = segEnd === x.e;
        var next = ev[xi + 1];
        var tieOut = !x.rest && x.tie && next && !next.rest && next.midi === x.midi && next.s === x.e;
        toks.forEach(function (d, di) {
          var tied = !lastPiece || di < toks.length - 1 || tieOut;
          if (x.rest) cur.push('r' + d);
          else cur.push(x.step + ACC_TOKEN[x.alter] + x.octave + d + (tied ? '~' : ''));
        });
        s = segEnd;
        if (s === barEnd) { bars.push(cur.join(' ')); cur = []; barEnd += barU; }
      }
    });
    if (cur.length) bars.push(cur.join(' '));
    return bars;
  }

  function buildChords(harms, pickupU, barU, nBars) {
    // harms: [{u, tok}] absolute units. One entry per full bar, carrying the last chord across empty bars.
    var bars = [], carry = null, hi = 0;
    harms = harms.filter(function (h) { return h.tok; }).sort(function (a, b) { return a.u - b.u; });
    while (hi < harms.length && harms[hi].u < pickupU) { if (harms[hi].tok !== 'NC') carry = harms[hi].tok; hi++; }
    for (var b = 0; b < nBars; b++) {
      var start = pickupU + b * barU, end = start + barU, inBar = [];
      while (hi < harms.length && harms[hi].u < end) {
        var q = Math.round((harms[hi].u - start) / 3) * 3;       // chord changes snap to a sixteenth
        if (q >= barU) break;
        inBar.push({ u: Math.max(0, q), tok: harms[hi].tok }); hi++;
      }
      var list = [];
      if (!inBar.length || inBar[0].u > 0) { if (carry) list.push({ u: 0, tok: carry }); }
      inBar.forEach(function (h) {
        if (h.tok === 'NC') return;                             // N.C.: the fake book keeps the last chord
        if (list.length && list[list.length - 1].u === h.u) list.pop();
        if (!list.length || list[list.length - 1].tok !== h.tok) list.push(h);
        carry = h.tok;
      });
      if (!list.length) { bars.push(null); continue; }
      if (list.length === 1) { bars.push(list[0].tok); continue; }
      bars.push(list.map(function (h, i) {
        var len = (i + 1 < list.length ? list[i + 1].u : barU) - h.u;
        return h.tok + ':' + String(+(len / U).toFixed(3));
      }).join(' '));
    }
    return bars;
  }

  /* ================================================================ main */
  function parse(text) {
    if (/<score-timewise[\s>]/.test(text)) throw new Error('This is “timewise” MusicXML. Export it again as standard (partwise) MusicXML.');
    if (!/<score-partwise[\s>]/.test(text)) throw new Error('That doesn’t look like a MusicXML score.');
    var doc = parseXML(text), score = null;
    walk(doc, function (e) { if (!score && e.name === 'score-partwise') score = e; });
    var parts = kids(score, 'part');
    if (!parts.length) throw new Error('That score has no parts.');
    var part = chooseMelodyPart(parts);
    var R = readMeasures(part);
    var warnings = [];

    var meter = R.meter, M = meter[0] * 4 / meter[1], rebar = false;
    if (meter[0] === 2 && meter[1] === 4) { rebar = true; warnings.push('2/4 is written here as 4/4 (two of the original bars per bar).'); }
    else if (!((meter[0] === 4 && meter[1] === 4) || (meter[0] === 3 && meter[1] === 4) || (meter[0] === 2 && meter[1] === 2) || (meter[0] === 6 && meter[1] === 8))) {
      throw new Error('The fake book can play 4/4, 3/4, 2/2, 2/4 and 6/8; this score is in ' + meter.join('/') + '.');
    }
    if (R.meterChange) throw new Error('The time signature changes to ' + R.meterChange.meter.join('/') + ' in bar ' + R.meterChange.at + '. The fake book needs one meter for the whole song.');
    var outMeter = rebar ? [4, 4] : meter, outM = rebar ? 4 : M;

    // Which voice is the tune: the top staff, its busiest voice.
    var count = {}, minStaff = null;
    R.measures.forEach(function (m) { m.notes.forEach(function (n) { if (minStaff === null || +n.staff < +minStaff) minStaff = n.staff; }); });
    R.measures.forEach(function (m) { m.notes.forEach(function (n) { if (n.staff === minStaff && n.pitched) count[n.voice] = (count[n.voice] || 0) + 1; }); });
    var voice = Object.keys(count).sort(function (a, b) { return count[b] - count[a] || (+a) - (+b); })[0] || '1';

    var order = unroll(R.measures);
    var events = [], harms = [], t0 = 0, moved = false;
    order.forEach(function (mi, k) {
      var m = R.measures[mi];
      var len = m.len > 0 ? m.len : M;
      var snapped = function (b) { var u = snap(t0 + b); if (Math.abs(u - (t0 + b) * U) > 0.05) moved = true; return u; };
      var byOnset = {};
      m.notes.forEach(function (n) {
        if (n.staff !== minStaff || n.voice !== voice) return;
        var s = snapped(n.t), e = snapped(n.t + n.dur);
        var key = String(s);
        if (byOnset[key]) {                          // chord or second note at once: keep the top note
          var o = byOnset[key];
          if (n.pitched && (!o.midi || n.midi > o.midi)) { o.midi = n.midi; o.step = n.step; o.alter = n.alter; o.octave = n.octave; o.rest = false; o.tie = n.tieStart; }
          o.e = Math.max(o.e, e);
          return;
        }
        var ev = n.pitched ? { s: s, e: e, midi: n.midi, step: n.step, alter: n.alter, octave: n.octave, tie: n.tieStart } : { s: s, e: e, rest: true };
        byOnset[key] = ev; events.push(ev);
      });
      m.harms.forEach(function (h) { harms.push({ u: snapped(h.t), tok: h.tok }); });
      t0 += len;
    });
    events.sort(function (a, b) { return a.s - b.s; });
    if (moved) warnings.push('Some rhythms finer than the fake book writes (32nd notes, quintuplets…) were rounded to the nearest sixteenth or triplet.');
    if (!events.some(function (e) { return !e.rest; })) throw new Error('No melody notes found in that score.');

    // Pickup: a first bar shorter than the meter.
    var first = R.measures[order[0]], firstLen = first.len > 0 ? first.len : M;
    var pickupU = firstLen < M - 1e-6 ? snap(firstLen) : 0;
    if (pickupU === 1) pickupU = 0;
    var barU = outM * U;
    var melodyBars = buildMelody(events, pickupU, barU);
    var nBars = melodyBars.length - (pickupU ? 1 : 0);
    if (nBars > MAX_BARS) throw new Error('That song plays out to ' + nBars + ' bars; the fake book holds up to ' + MAX_BARS + '.');
    var chordBars = buildChords(harms, pickupU, barU, nBars);
    var hasChords = chordBars.some(Boolean);

    // Key: concert pitch, and the mode if MusicXML says so (else a guess from how the tune ends).
    var fifths = R.firstKey ? R.firstKey.fifths : 0;
    if (R.transpose) fifths = mod(fifths + 7 * R.transpose.chromatic + 6, 12) - 6;
    fifths = Math.max(-7, Math.min(7, fifths));
    var modeTxt = R.firstKey ? (R.firstKey.mode || '').toLowerCase() : '';
    var minor = modeTxt === 'minor' || modeTxt === 'aeolian';
    if (!modeTxt || modeTxt === 'none') {
      var lastNote = events.filter(function (e) { return !e.rest; }).pop();
      var relMinorPc = mod(NAT[LETTERS.indexOf(MINOR_KEYS[fifths][0])] + (MINOR_KEYS[fifths][1] === '#' ? 1 : MINOR_KEYS[fifths][1] === 'b' ? -1 : 0), 12);
      var lastChord = chordBars.filter(Boolean).pop() || '';
      var endChord = lastChord.split(' ').pop().split(':')[0];
      minor = mod(lastNote.midi, 12) === relMinorPc && (!endChord || /^[A-G][#b]?m(?!aj)/.test(endChord));
    }
    var key = (minor ? MINOR_KEYS : MAJOR_KEYS)[fifths];
    key = { Cb: 'B', 'A#': 'Bb', 'D#': 'Eb' }[key] || key;   // seven sharps/flats: read the simpler enharmonic key

    // Empty bars before the first chord get the tonic, and a chordless score gets it throughout.
    var tonic = key + (minor ? 'm' : '');
    var firstChord = chordBars.filter(Boolean)[0] || tonic;
    var filled = [], seen = false;
    chordBars.forEach(function (c) { if (c) seen = true; filled.push(c || (seen ? filled[filled.length - 1] : firstChord)); });
    if (!hasChords) warnings.push('The file has no chord symbols, so every bar shows the home chord (' + tonic + ') as a placeholder.');

    var title = '', composer = '';
    walk(score, function (e) {
      if (!title && (e.name === 'work-title' || e.name === 'movement-title') && e.text.trim()) title = e.text.trim();
      if (!composer && e.name === 'creator' && (e.attrs.type || 'composer') === 'composer' && e.text.trim()) composer = e.text.trim();
    });
    if (!title) walk(score, function (e) { if (!title && e.name === 'credit') { var ct = kid(e, 'credit-type'), w = kid(e, 'credit-words'); if (w && (!ct || txt(ct) === 'title') && w.text.trim()) title = w.text.trim(); } });

    return {
      title: title.replace(/\s+/g, ' ').slice(0, 120),
      composer: composer.replace(/\s+/g, ' ').slice(0, 120),
      key: key, minor: minor, meter: outMeter,
      pickup: pickupU / U,
      melody: melodyBars.join(' | '),
      chords: filled.join(' | '),
      bars: nBars,
      tempo: R.tempo ? Math.round(R.tempo) : null,
      style: R.styleWords,
      hasChords: hasChords,
      unrolled: order.length !== R.measures.length,
      warnings: warnings
    };
  }

  function parseFile(bytes) {
    if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
    if (isZip(bytes)) return readMxl(bytes).then(parse);
    try { return Promise.resolve(parse(new TextDecoder().decode(bytes))); } catch (e) { return Promise.reject(e); }
  }

  var exported = { parse: parse, parseFile: parseFile, parseXML: parseXML, unroll: unroll, isZip: isZip, looksLikeMusicXML: looksLikeMusicXML, split: split };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.FakeBookMusicXML = exported;
})(typeof window !== 'undefined' ? window : globalThis);
