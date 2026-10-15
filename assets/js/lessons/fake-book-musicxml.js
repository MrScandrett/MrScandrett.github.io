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
  function harmonyEngine() {
    if (typeof module !== 'undefined' && module.exports) { try { return require('./fake-book-harmony.js'); } catch (e) { return null; } }
    return root.FakeBookHarmony || null;
  }
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
      else if (type === 'add' && !acc && (v === 9 || v === 13) && /^7sus/.test(q)) q = v + q.slice(1);   // 9sus4, 13sus4
      else if (type === 'add') q += (acc && /\d/.test(q) ? acc : 'add' + acc) + v;   // C7 add ♭9 = C7b9; C add ♯4 = Cadd#4
      else if (type === 'alter') q += acc + v;
      else if (type === 'subtract') q += 'no' + v;
    });
    if (/^[b#]/.test(q)) q = '(' + q + ')';               // E with ♯5 is E(#5): "E#5" would read as an E♯ chord
    var tok = rootName(txt(r, 'root-step'), num(r, 'root-alter', 0), tr) + q.replace(/[\s\/:|]/g, '');
    var b = kid(h, 'bass');
    if (b && txt(b, 'bass-step')) tok += '/' + rootName(txt(b, 'bass-step'), num(b, 'bass-alter', 0), tr);
    return tok;
  }

  /* ================================================================ bytes → text */
  // Finale and Sibelius can write UTF-16; others write UTF-8, sometimes with a BOM or another declared encoding.
  function decodeText(bytes) {
    if (bytes[0] === 0xFF && bytes[1] === 0xFE) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
    if (bytes[0] === 0xFE && bytes[1] === 0xFF) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
    if (bytes[0] === 0x3C && bytes[1] === 0) return new TextDecoder('utf-16le').decode(bytes);
    if (bytes[0] === 0 && bytes[1] === 0x3C) return new TextDecoder('utf-16be').decode(bytes);
    var head = String.fromCharCode.apply(null, bytes.subarray(0, 200));
    var enc = /^\s*(?:\xEF\xBB\xBF)?<\?xml[^>]*encoding=["']([\w.:-]+)["']/i.exec(head);
    try { return new TextDecoder(enc && !/^utf-?16/i.test(enc[1]) ? enc[1] : 'utf-8').decode(bytes); } catch (e) { return new TextDecoder().decode(bytes); }
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
    var pick = function (name) { return inflate(byName[name]).then(decodeText); };
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
  // Text an iReal Pro link or HTML export always carries.
  function looksLikeIReal(text) { return /irealb(?:ook)?:\/\//i.test(text || ''); }

  // preferId: a part the caller already knows is the tune (the Guitar Pro reader picks the vocal or lead track).
  function chooseMelodyPart(parts, preferId) {
    var preferred = preferId && parts.filter(function (p) { return p.attrs.id === preferId; })[0];
    if (preferred) return preferred;
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
    var divisions = 1, transpose = null, firstKey = null, curKey = null, meter = null, curMeter = null, tempo = null, styleWords = null;
    var measures = [], endingOpen = null;
    var staves = {};                 // staff number → { clef: 'G'|'F'|'TAB'|…, lines, tuning: [{line, midi}], capo }
    var staffInfo = function (n) { return staves[n] || (staves[n] = { clef: null, lines: 5, tuning: [], capo: 0 }); };
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
          if (k && kid(k, 'fifths')) { curKey = { fifths: num(k, 'fifths', 0), mode: txt(k, 'mode') }; if (!firstKey) firstKey = curKey; }
          var t = kid(c, 'time');
          if (t && kid(t, 'beats')) {
            // "3+2" style beats add up; a missing beat-type reads as quarters.
            var beats = txt(t, 'beats').split('+').reduce(function (a, x) { return a + (parseInt(x, 10) || 0); }, 0);
            curMeter = [beats || 4, parseInt(txt(t, 'beat-type'), 10) || 4];
            if (!meter) meter = curMeter;
          }
          kids(c, 'clef').forEach(function (cl) {
            var si = staffInfo(cl.attrs.number || '1');
            if (!si.clef) { si.clef = (txt(cl, 'sign') || 'G').toUpperCase(); si.octave = num(cl, 'clef-octave-change', 0); }
          });
          kids(c, 'staff-details').forEach(function (sd) {
            var si = staffInfo(sd.attrs.number || '1');
            if (kid(sd, 'staff-lines')) si.lines = num(sd, 'staff-lines', 5);
            if (kid(sd, 'capo')) si.capo = num(sd, 'capo', 0);
            var tun = kids(sd, 'staff-tuning');
            if (tun.length) si.tuning = tun.map(function (st) {
              var oct = num(st, 'tuning-octave', 3), stp = txt(st, 'tuning-step') || 'E';
              return { line: parseInt(st.attrs.line, 10) || 1, midi: 12 * (oct + 1) + NAT[LETTERS.indexOf(stp)] + num(st, 'tuning-alter', 0) };
            });
          });
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
            tieStop: ties.some(function (x) { return x.attrs.type === 'stop' || x.attrs.type === 'continue'; }),
            tieStart: ties.some(function (x) { return x.attrs.type === 'start' || x.attrs.type === 'continue'; }),
            pitched: !!p
          };
          if (p) {
            var sp = transposeSpelled(txt(p, 'step'), num(p, 'alter', 0), num(p, 'octave', 4), transpose);
            ev.step = sp.step; ev.alter = Math.round(sp.alter); ev.octave = sp.octave; ev.midi = sp.midi;
          }
          if (kid(c, 'unpitched')) ev.pitched = false;
          var tech = kid(kid(c, 'notations'), 'technical');
          if (tech && kid(tech, 'fret') && kid(tech, 'string')) { ev.string = num(tech, 'string', 0); ev.fret = num(tech, 'fret', 0); }
          notes.push(ev);
        }
      });
      info.len = maxT;
      info.meter = curMeter || [4, 4];
      info.key = curKey;
      measures.push(info);
    });
    return { staves: staves, measures: measures, firstKey: firstKey, meter: meter || [4, 4], tempo: tempo, transpose: transpose, styleWords: styleWords };
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

  // Chord-melody (solo jazz guitar, fingerstyle, a one-voice piano part) puts its bass notes in the same voice as
  // the tune. When chords make up a fifth of the onsets, a lone note is bass if the melody notes on both sides of
  // it are more than an octave higher, skipping other low notes so a walking bass line goes too. A run that
  // climbs from a low note keeps it: its neighbour in the run is close. Bass leaves the melody, and the melody
  // note before it rings on through it.
  function dropLoneBass(events) {
    var pitched = events.filter(function (e) { return !e.rest; });
    if (pitched.filter(function (e) { return e.count > 1; }).length < pitched.length * 0.2) return events;
    var WINDOW = 4 * U;
    // Low: a lone note more than an octave below the highest note within two beats.
    var low = pitched.map(function (e, i) {
      if (e.count > 1) return false;
      var ref = -1, j;
      for (j = i - 1; j >= 0 && e.s - pitched[j].s <= 2 * U; j--) ref = Math.max(ref, pitched[j].midi);
      for (j = i + 1; j < pitched.length && pitched[j].s - e.s <= 2 * U; j++) ref = Math.max(ref, pitched[j].midi);
      return ref - e.midi > 12;
    });
    var neighbour = function (i, step) {
      for (var j = i + step; j >= 0 && j < pitched.length && Math.abs(pitched[j].s - pitched[i].s) <= WINDOW; j += step) if (!low[j]) return pitched[j];
      return null;
    };
    var bass = pitched.filter(function (e, i) {
      if (!low[i]) return false;
      var before = neighbour(i, -1), after = neighbour(i, 1);
      if (!before && !after) return false;
      return (!before || before.midi - e.midi > 12) && (!after || after.midi - e.midi > 12);
    });
    if (!bass.length) return events;
    var kept = [], last = null;
    events.forEach(function (e) {
      if (bass.indexOf(e) < 0) { kept.push(e); if (!e.rest) last = e; return; }
      if (last && last.e >= e.s) last.e = Math.max(last.e, e.e);
    });
    return kept;
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

  function buildChords(harms, pickupU, barU, nBars, carryIn) {
    // harms: [{u, tok}] absolute units. One entry per full bar, carrying the last chord across empty bars.
    var bars = [], carry = carryIn || null, hi = 0;
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
  // The meters the play-along band knows, and how other meters are written in one of them.
  // Re-barring keeps every note where it is in time; only the barlines move.
  function outMeterFor(mt) {
    var key = mt.join('/');
    if (key === '4/4' || key === '3/4' || key === '2/2' || key === '6/8') return { meter: mt, note: '' };
    var REBAR = {
      '2/4': [[4, 4], '2/4 is written as 4/4 (two of the original bars per bar).'],
      '12/8': [[6, 8], '12/8 is written as 6/8 (each original bar is two bars here).'],
      '6/4': [[3, 4], '6/4 is written as 3/4 (each original bar is two bars here).'],
      '3/8': [[6, 8], '3/8 is written as 6/8 (two of the original bars per bar).'],
      '4/2': [[2, 2], '4/2 is written as 2/2 (each original bar is two bars here).'],
      '1/4': [[4, 4], '1/4 is written as 4/4.']
    }[key];
    return REBAR ? { meter: REBAR[0], note: REBAR[1] } : null;
  }
  var PART_BARS = 200;               // a longer stretch becomes several songs, so the page stays quick
  var SHORT_RUN = 4;                 // a change of meter for fewer bars than this stays inside the song around it

  function parse(text) { return parseAll(text)[0]; }

  // Legacy band conversion may split meters. Score mode preserves one timeline.
  function parseAll(text, options) {
    var scoreMode = options && options.score;
    if (/<score-timewise[\s>]/.test(text)) throw new Error('This is “timewise” MusicXML. Export it again as standard (partwise) MusicXML.');
    if (!/<score-partwise[\s>]/.test(text)) {
      if (/<museScore[\s>]/.test(text)) throw new Error('That’s MuseScore’s own file format. In MuseScore choose File → Export…, pick MusicXML, and import that file.');
      var tag = /<([A-Za-z][\w:.-]*)[\s>\/]/.exec(text.replace(/<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<![^>]*>/g, ''));
      throw new Error('That doesn’t look like a MusicXML score' + (tag ? ' (it starts with <' + tag[1] + '>)' : '') + '. Export the song as MusicXML from your notation app.');
    }
    var doc = parseXML(text), score = null;
    walk(doc, function (e) { if (!score && e.name === 'score-partwise') score = e; });
    var parts = kids(score, 'part');
    if (!parts.length) throw new Error('That score has no parts.');
    var part = chooseMelodyPart(parts, options && options.melodyPart);
    var all = parts.map(readMeasures), R = all[parts.indexOf(part)];
    var partNames = {};
    walk(score, function (e) { if (e.name === 'score-part') partNames[e.attrs.id] = txt(e, 'part-name').replace(/\s+/g, ' '); });

    var title = '', composer = '';
    walk(score, function (e) {
      if (!title && (e.name === 'work-title' || e.name === 'movement-title') && e.text.trim()) title = e.text.trim();
      if (!composer && e.name === 'creator' && (e.attrs.type || 'composer') === 'composer' && e.text.trim()) composer = e.text.trim();
    });
    if (!title) walk(score, function (e) { if (!title && e.name === 'credit') { var ct = kid(e, 'credit-type'), w = kid(e, 'credit-words'); if (w && (!ct || txt(ct) === 'title') && w.text.trim()) title = w.text.trim(); } });
    title = title.replace(/\s+/g, ' ').slice(0, 120);
    composer = composer.replace(/\s+/g, ' ').slice(0, 120);

    // Which voice is the tune: the top staff that isn't tablature, its busiest voice.
    var count = {}, minStaff = null;
    var isTab = function (Rp, st) { return Rp.staves[st] && Rp.staves[st].clef === 'TAB'; };
    R.measures.forEach(function (m) { m.notes.forEach(function (n) { if (!isTab(R, n.staff) && (minStaff === null || +n.staff < +minStaff)) minStaff = n.staff; }); });
    if (minStaff === null) R.measures.forEach(function (m) { m.notes.forEach(function (n) { if (minStaff === null || +n.staff < +minStaff) minStaff = n.staff; }); });
    var pitchSum = {};
    R.measures.forEach(function (m) { m.notes.forEach(function (n) { if (n.staff === minStaff && n.pitched) { count[n.voice] = (count[n.voice] || 0) + 1; pitchSum[n.voice] = (pitchSum[n.voice] || 0) + n.midi; } }); });
    var byCount = Object.keys(count).sort(function (a, b) { return count[b] - count[a] || (+a) - (+b); });
    var voice = byCount[0] || '1';
    // The tune is the top line, not just the busiest one. Keyboard music often runs an accompaniment figure (Moonlight
    // Sonata's triplets) as a second voice under the melody, and that figure has the most notes. A voice that carries a
    // real share of the staff and sits clearly higher takes over, so the treble staff shows the right hand's tune.
    var avgOf = function (v) { return pitchSum[v] / count[v]; };
    byCount.slice(1).forEach(function (v) { if (count[v] >= count[byCount[0]] * 0.25 && avgOf(v) > avgOf(voice) + 2) voice = v; });

    // Play the road map, then cut it into runs of one meter.
    var order = unroll(R.measures), runs = [];
    order.forEach(function (mi) {
      var mt = R.measures[mi].meter, last = runs[runs.length - 1];
      if (last && last.mt.join('/') === mt.join('/')) last.order.push(mi);
      else runs.push({ mt: mt, order: [mi] });
    });
    // Runs become songs. A short run (or one in a meter that can't be written) joins the song before it,
    // padded with rests to the end of a bar so what follows still starts on a barline.
    var sections = [], skipped = [], notes = {};
    runs.forEach(function (run) {
      var out = outMeterFor(run.mt), prev = sections[sections.length - 1];
      if (prev && run.order.length < SHORT_RUN) {
        prev.items.push({ order: run.order, pad: true });
        prev.joined.push(R.measures[run.order[0]].number + (run.order.length > 1 ? '–' + R.measures[run.order[run.order.length - 1]].number : '') + ' (' + run.mt.join('/') + ')');
        return;
      }
      if (!out) { skipped.push('bars ' + R.measures[run.order[0]].number + '–' + R.measures[run.order[run.order.length - 1]].number + ' (' + run.mt.join('/') + ')'); return; }
      if (out.note) notes[out.note] = true;
      if (prev && prev.out.meter.join('/') === out.meter.join('/') && prev.size + run.order.length <= PART_BARS) {
        prev.items.push({ order: run.order, pad: true }); prev.size += run.order.length; return;
      }
      var size = Math.ceil(run.order.length / Math.ceil(run.order.length / PART_BARS));   // even parts: 113 + 113, not 200 + 26
      for (var i = 0; i < run.order.length; i += size) {
        var chunk = run.order.slice(i, i + size);
        sections.push({ out: out, origM: run.mt[0] * 4 / run.mt[1], items: [{ order: chunk, pad: false }], size: chunk.length, joined: [] });
      }
    });
    // A short opening in its own meter (a one-bar intro) leads into the song after it instead.
    if (sections.length > 1 && sections[0].size < SHORT_RUN) {
      var intro = sections.shift(), firstM = R.measures[intro.items[0].order[0]];
      sections[0].items[0].pad = true;
      sections[0].items = intro.items.concat(sections[0].items);
      sections[0].joined = [firstM.number + ' (' + firstM.meter.join('/') + ')'].concat(intro.joined, sections[0].joined);
    }
    if (!sections.length && !scoreMode) {
      throw new Error('The fake book can play 4/4, 3/4, 2/2 and 6/8 (and 2/4, 3/8, 6/4, 12/8 re-barred); this score is in ' + runs.map(function (r) { return r.mt.join('/'); }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(', ') + '.');
    }

    if (scoreMode) sections = [{ out: { meter: R.meter }, origM: R.meter[0] * 4 / R.meter[1], items: [{ order: order, pad: false }], joined: [] }];
    var carry = null, songs = [];
    sections.forEach(function (sec, si) {
      var song = buildSection(sec, carry);
      if (!song) return;
      carry = song.lastChord;
      delete song.lastChord;
      songs.push(song);
    });
    if (!songs.length) throw new Error('No melody notes found in that score.');
    songs.forEach(function (song, i) {
      if (songs.length > 1) {
        song.part = i + 1; song.parts = songs.length;
        song.title = title ? title + ' · Part ' + (i + 1) : '';
        song.warnings.unshift('Part ' + (i + 1) + ' of ' + songs.length + ' (bars ' + song.fromBar + '–' + song.toBar + ' of the score).');
      }
      Object.keys(scoreMode ? {} : notes).forEach(function (n) { if (song.warnings.indexOf(n) < 0 && song.meterNote === n) song.warnings.push(n); });
      if (skipped.length && !scoreMode) song.warnings.push('Left out ' + skipped.join(', ') + ': the fake book can’t play that meter.');
      delete song.meterNote;
    });
    return songs;

    function buildSection(sec, carryIn) {
      var warnings = [];
      var outMeter = sec.out.meter, outM = outMeter[0] * 4 / outMeter[1];
      var order = [], starts = [], events = [], harms = [], t0 = 0, moved = false, pickup = null;
      sec.items.forEach(function (item, ii) {
        if (item.pad && pickup !== null) {
          // Pad to the next barline of this song's meter before a stretch in another meter (and after it).
          var into = mod(t0 - pickup, outM);
          if (into > 1e-6) t0 += outM - into;
        }
        item.order.forEach(function (mi, k) {
          var m = R.measures[mi], mM = m.meter[0] * 4 / m.meter[1];
          var len = m.len > 0 ? m.len : mM;
          if (pickup === null) pickup = len < mM - 1e-6 ? mod(len, outM) : 0;
          order.push(mi); starts.push(t0);
          var snapped = function (b) { var u = snap(t0 + b); if (Math.abs(u - (t0 + b) * U) > 0.05) moved = true; return u; };
          var byOnset = {};
          m.notes.forEach(function (n) {
            if (n.staff !== minStaff || n.voice !== voice) return;
            var s = snapped(n.t), e = snapped(n.t + n.dur);
            var key = String(s);
            if (byOnset[key]) {                          // chord or second note at once: keep the top note
              var o = byOnset[key];
              if (n.pitched) o.count = (o.count || 0) + 1;
              if (n.pitched && (!o.midi || n.midi > o.midi)) { o.midi = n.midi; o.step = n.step; o.alter = n.alter; o.octave = n.octave; o.rest = false; o.tie = n.tieStart; }
              o.e = Math.max(o.e, e);
              return;
            }
            var ev = n.pitched ? { s: s, e: e, midi: n.midi, step: n.step, alter: n.alter, octave: n.octave, tie: n.tieStart, count: 1 } : { s: s, e: e, rest: true };
            byOnset[key] = ev; events.push(ev);
          });
          m.harms.forEach(function (h) { harms.push({ u: snapped(h.t), tok: h.tok }); });
          t0 += len;
        });
        if (item.pad && ii > 0) {
          var into2 = mod(t0 - pickup, outM);
          if (into2 > 1e-6) t0 += outM - into2;
        }
      });
      events.sort(function (a, b) { return a.s - b.s; });
      events = dropLoneBass(events);
      if (!events.some(function (e) { return !e.rest; })) return null;
      if (moved) warnings.push((scoreMode ? 'Playback keeps the original timing. Displayed rhythms' : 'Some rhythms') + ' finer than the fake book writes (32nd notes, quintuplets…) were rounded to the nearest sixteenth or triplet.');
      if (sec.joined.length) warnings.push('Bar' + (sec.joined.length > 1 ? 's ' : ' ') + sec.joined.join(', ') + ' in another meter ' + (sec.joined.length > 1 ? 'are' : 'is') + ' kept in this song, with rests added to finish the bar.');

      var pickupU = snap(pickup || 0);
      if (pickupU === 1) pickupU = 0;
      var barU = outM * U;
      var melodyBars = buildMelody(events, pickupU, barU);
      var nBars = melodyBars.length - (pickupU ? 1 : 0);
      if (!scoreMode && nBars > MAX_BARS) throw new Error('That song plays out to ' + nBars + ' bars; the fake book holds up to ' + MAX_BARS + '.');
      var scoreBars = [], scoreParts = [], scoreNotes = [], scoreTime = -(pickup || 0);
      if (scoreMode) {
        melodyBars = []; var scoreChords = [];
        order.forEach(function (mi, k) {
          var m = R.measures[mi], len = (k + 1 < starts.length ? starts[k + 1] : t0) - starts[k];
          var startU = snap(starts[k]), lenU = snap(len);
          var es = events.filter(function (e) { return e.s >= startU && e.s < startU + lenU; }).map(function (e) { return Object.assign({}, e, { s: e.s - startU, e: Math.min(e.e - startU, lenU) }); });
          melodyBars.push(buildMelody(es, 0, lenU)[0] || split(lenU).map(function (d) { return 'r' + d; }).join(' '));
          if (!(k === 0 && pickupU)) scoreChords.push(buildChords(harms.filter(function (h) { return h.u >= startU && h.u < startU + lenU; }).map(function (h) { return { u: h.u - startU, tok: h.tok }; }), 0, lenU, 1, carryIn)[0]);
          scoreBars.push({ number: m.number, start: scoreTime, len: len, meter: m.meter, bar: k + 1 - (pickupU ? 1 : 0) });
          scoreTime += len;
        });
        nBars = order.length - (pickupU ? 1 : 0);
        if (nBars > MAX_BARS) throw new Error('That score exceeds the ' + MAX_BARS + '-bar import limit.');
        all.forEach(function (Rp, pi) {
          var lanes = {}, pending = {};
          order.forEach(function (mi, k) {
            var m = Rp.measures[mi]; if (!m) return;
            m.notes.forEach(function (n) {
              if (!n.pitched || (isTab(Rp, n.staff) && Object.keys(Rp.staves).some(function (st) { return !isTab(Rp, st); }))) return;
              var id = parts[pi].attrs.id + ':' + n.staff + ':' + n.voice;
              if (!lanes[id]) { lanes[id] = true; scoreParts.push({ id: id, label: (partNames[parts[pi].attrs.id] || 'Part ' + (pi + 1)) + ' · staff ' + n.staff + ', voice ' + n.voice }); }
              var start = starts[k] + n.t - (pickup || 0), key = id + ':' + n.midi, prev = pending[key];
              if (n.tieStop && prev && Math.abs(prev.start + prev.dur - start) < 1e-6) { prev.dur += n.dur; if (!n.tieStart) delete pending[key]; return; }
              var ev = { part: id, start: start, dur: n.dur, midi: n.midi };
              scoreNotes.push(ev); if (n.tieStart) pending[key] = ev; else delete pending[key];
            });
          });
        });
      }
      var chordBars = scoreMode ? scoreChords : buildChords(harms, pickupU, barU, nBars, carryIn);
      var hasChords = chordBars.some(Boolean);

      // Extra staves the score carries.
      // Tab: a 6+ string TAB staff. Bass, best source first: a bass part (by name, or 4–5 string tab),
      // then a bass-clef staff (piano left hand, cello…), then the lower voice inside the melody's
      // own staff (fingerstyle guitar, a one-staff piano part), then the bottom notes of its chords.
      var extra = {}, bestTab = 0, bassPick = null;
      var offerBass = function (rank, count, make) { if (!bassPick || rank > bassPick.rank || (rank === bassPick.rank && count > bassPick.count)) bassPick = { rank: rank, count: count, make: make }; };
      all.forEach(function (Rp, pi) {
        var noteCount = {}, fretCount = {}, pitchSum = {};
        Rp.measures.forEach(function (m) { m.notes.forEach(function (n) {
          if (!n.pitched) return;
          noteCount[n.staff] = (noteCount[n.staff] || 0) + 1;
          pitchSum[n.staff] = (pitchSum[n.staff] || 0) + n.midi;
          if (n.string) fretCount[n.staff] = (fretCount[n.staff] || 0) + 1;
        }); });
        var name = partNames[parts[pi].attrs.id] || '';
        var bassName = /\bbass\b|\bbajo\b|\bbasse\b|\bbasso\b|contrabass|kontrabass/i.test(name) && !/clarinet|bassoon|drum/i.test(name);
        Object.keys(noteCount).forEach(function (st) {
          var info = Rp.staves[st] || {}, melodyStaff = Rp === R && st === minStaff;
          var tabby = info.clef === 'TAB' || (fretCount[st] || 0) > noteCount[st] / 2;
          var lines = info.lines && info.lines !== 5 ? info.lines : (tabby ? 6 : 5);
          var avg = pitchSum[st] / noteCount[st];
          if (tabby && lines >= 6 && !bassName && fretCount[st] > bestTab) {
            bestTab = fretCount[st];
            extra.tab = { label: name, lines: lines, tuning: tabTuning(info), capo: info.capo || 0,
              events: staffEvents(Rp, st, order, starts, pickupU, true) };
          } else if (!melodyStaff && (bassName || (tabby && lines <= 5) || (avg < 48 && Rp !== R))) {
            offerBass(3, noteCount[st] - (tabby ? 1 : 0), function () { return { label: name, events: staffEvents(Rp, st, order, starts, pickupU, false) }; });
          } else if (!melodyStaff && info.clef === 'F') {
            offerBass(2, noteCount[st], function () { return { label: name, events: staffEvents(Rp, st, order, starts, pickupU, false) }; });
          }
        });
      });
      if (!bassPick) {
        // The melody's own staff: a lower voice, or the bottom notes of its chords.
        var vStats = {};
        R.measures.forEach(function (m) { m.notes.forEach(function (n) {
          if (n.staff !== minStaff || !n.pitched) return;
          var v = vStats[n.voice] || (vStats[n.voice] = { n: 0, sum: 0 });
          v.n++; v.sum += n.midi;
        }); });
        var melAvg = vStats[voice] ? vStats[voice].sum / vStats[voice].n : 72;
        var lower = Object.keys(vStats).filter(function (v) { return v !== voice && vStats[v].n >= 4 && vStats[v].sum / vStats[v].n <= melAvg - 5; })
          .sort(function (a, b) { return vStats[a].sum / vStats[a].n - vStats[b].sum / vStats[b].n; })[0];
        var pname = partNames[part.attrs.id] || '';
        if (lower) offerBass(1, vStats[lower].n, function () { return { label: (pname ? pname + ', ' : '') + 'lower voice', events: staffEvents(R, minStaff, order, starts, pickupU, false, { voice: lower }) }; });
        else offerBass(0, 0, function () { return { label: (pname ? pname + ', ' : '') + 'bass notes', events: staffEvents(R, minStaff, order, starts, pickupU, false, { lowest: true, voice: voice }) }; });
      }
      if (bassPick) {
        extra.bass = bassPick.make();
        if (extra.bass.events.length < Math.max(2, nBars / 8)) delete extra.bass;   // a few stray low notes aren't a bass line
      }
      // A guitar part without tab: keep all its notes so the fake book can work the tab out.
      var mInfo = R.staves[minStaff] || {};
      var guitarish = /guitar|gtr|gitarr|guitare|chitarra|guitarra|ukulele|banjo/i.test(partNames[part.attrs.id] || '') || (mInfo.clef === 'G' && mInfo.octave === -1);
      if (guitarish && !extra.tab) {
        var octUp = mInfo.octave === -1 || (R.transpose && R.transpose.octave === -1);
        extra.gtr = { written: octUp ? 12 : 0, events: staffEvents(R, minStaff, order, starts, pickupU, false, { allVoices: true }) };
      }
      // A piano staff often carries two voices: the tune above and an accompaniment figure below (Moonlight Sonata's
      // triplets). The tune is the melody line; the other voice is kept so the lead sheet can draw both, stems up and down.
      if (bassPick && bassPick.rank >= 2 && !guitarish) {
        var second = Object.keys(count).filter(function (v) { return v !== voice && count[v] >= Math.max(4, nBars / 4); })
          .sort(function (a, b) { return count[b] - count[a]; })[0];
        if (second) extra.voice2 = { events: staffEvents(R, minStaff, order, starts, pickupU, false, { voice: second }) };
      }
      ['bass', 'tab', 'gtr', 'voice2'].forEach(function (k) { if (extra[k] && !extra[k].events.length) delete extra[k]; });

      // Key: the one in force where this song starts, at concert pitch; the mode if MusicXML says so,
      // else a guess from how the tune ends.
      var k0 = R.measures[order[0]].key || R.firstKey;
      var fifths = k0 ? k0.fifths : 0;
      if (R.transpose) fifths = mod(fifths + 7 * R.transpose.chromatic + 6, 12) - 6;
      fifths = Math.max(-7, Math.min(7, fifths));
      var modeTxt = k0 ? (k0.mode || '').toLowerCase() : '';
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

      // No chord symbols (most classical scores): work the chords and key changes out from every note.
      var H = harmonyEngine(), keyChanges = [];
      if (!hasChords && H && (!scoreMode || scoreBars.every(function (b) { return b.bar === 0 || b.len === outM; }))) {
        var allNotes = [];
        all.forEach(function (Rp) {
          order.forEach(function (mi, k) {
            var m = Rp.measures[mi];
            if (!m) return;
            m.notes.forEach(function (n) {
              if (!n.pitched || (Rp.staves[n.staff] && Rp.staves[n.staff].clef === 'TAB')) return;
              allNotes.push({ s: starts[k] + n.t - pickupU / U, d: n.dur, midi: n.midi, alter: n.alter });
            });
          });
        });
        var sixEight = outMeter[0] === 6 && outMeter[1] === 8;
        var tonicPc = mod(NAT[LETTERS.indexOf(key[0])] + (key[1] === '#' ? 1 : key[1] === 'b' ? -1 : 0), 12);
        var res = H.analyze(allNotes, {
          M: outM, bars: nBars, unit: sixEight ? 1.5 : 1, startKey: { tonic: tonicPc, minor: minor },
          strong: sixEight ? function (pos) { return pos < 1e-6 ? 0 : 1; } : undefined
        });
        chordBars = res.chordBars;
        // The signature can't tell F major from D minor; the notes can.
        var k1 = res.keys[0];
        if (k1 && (modeTxt === '' || modeTxt === 'none') && mod(k1.tonic + (k1.minor ? 3 : 0), 12) === mod(tonicPc + (minor ? 3 : 0), 12)) {
          minor = k1.minor; key = k1.name;
        }
        // Guesses that flip back within a few bars are chord colour, not modulations: keep only keys that last.
        var segs = res.keys.slice(), MIN_KEY_BARS = 4, merged = true;
        while (merged && segs.length > 1) {
          merged = false;
          for (var si = 1; si < segs.length; si++) {
            var segEnd = si + 1 < segs.length ? segs[si + 1].bar : nBars + 1;
            if (segEnd - segs[si].bar < MIN_KEY_BARS || (segs[si].name === segs[si - 1].name && segs[si].minor === segs[si - 1].minor)) { segs.splice(si, 1); merged = true; break; }
          }
        }
        keyChanges = segs.slice(1).map(function (k) { return { bar: k.bar, key: k.name, minor: k.minor }; });
        warnings.push('The file has no chord symbols, so the chords' + (keyChanges.length ? ' and key changes' : '') +
          ' were worked out from the notes (every part, with the bass line counting most). Check them against the score.');
      }

      // Empty bars before the first chord get the tonic, and a chordless score gets it throughout.
      var tonic = key + (minor ? 'm' : '');
      var firstChord = chordBars.filter(Boolean)[0] || tonic;
      var filled = [], seen = false;
      chordBars.forEach(function (c) { if (c) seen = true; filled.push(c || (seen ? filled[filled.length - 1] : firstChord)); });
      if (!hasChords && (!H || (scoreMode && !scoreBars.every(function (b) { return b.bar === 0 || b.len === outM; })))) warnings.push('The file has no chord symbols, so every bar shows the home chord as a placeholder.');
      var lastTok = (chordBars.filter(Boolean).pop() || '').split(' ').pop().split(':')[0] || carryIn;

      if (scoreMode) warnings.push('Written pitched voices play on synthesized piano. Grace notes, unpitched percussion, dynamics, ornaments and tempo changes are not performed.');
      return {
        score: scoreMode ? { parts: scoreParts, notes: scoreNotes, bars: scoreBars, musicxml: text } : undefined,
        title: title, composer: composer,
        key: key, minor: minor, meter: outMeter,
        pickup: scoreMode ? (pickup || 0) : pickupU / U,
        melody: melodyBars.join(' | '),
        chords: filled.join(' | '),
        bars: nBars,
        tempo: R.tempo ? Math.round(R.tempo) : null,
        style: R.styleWords,
        hasChords: hasChords,
        chordsWorkedOut: !hasChords && !!H,
        keyChanges: keyChanges,
        unrolled: order.length !== R.measures.length,
        staves: extra,
        fromBar: R.measures[order[0]].number, toBar: R.measures[order[order.length - 1]].number,
        meterNote: outMeterFor(R.measures[order[0]].meter) && outMeterFor(R.measures[order[0]].meter).note,
        lastChord: lastTok,
        warnings: warnings
      };
    }
  }

  // Standard tunings, highest string first (MusicXML numbers strings from the top).
  var TUNINGS = { 4: [43, 38, 33, 28], 5: [43, 38, 33, 28, 23], 6: [64, 59, 55, 50, 45, 40], 7: [64, 59, 55, 50, 45, 40, 35] };
  function tabTuning(info) {
    var lines = info.lines && info.lines !== 5 ? info.lines : 6;
    if (!info.tuning || !info.tuning.length) return (TUNINGS[lines] || TUNINGS[6]).slice();
    var out = [];                     // staff-tuning line 1 is the bottom line = the lowest string
    info.tuning.forEach(function (t) { out[lines - t.line] = t.midi; });
    for (var i = 0; i < lines; i++) if (out[i] === undefined) out[i] = (TUNINGS[lines] || TUNINGS[6])[i];
    return out;
  }
  function spellTok(n) { return n.step + ACC_TOKEN[n.alter] + n.octave; }
  // One staff's notes in playing order, as [{s, d, n: 'C3 E3', f: [[string, fret]…]}] in beats from bar 1.
  // pick: { voice } one voice, { allVoices } every voice merged by onset, { lowest } only the bottom note
  // of each chord (a bass line inside a guitar or piano staff). Default: the busiest voice.
  function staffEvents(Rp, staff, order, starts, pickupU, frets, pick) {
    pick = pick || {};
    var count = {};
    Rp.measures.forEach(function (m) { m.notes.forEach(function (n) { if (n.staff === staff && n.pitched) count[n.voice] = (count[n.voice] || 0) + 1; }); });
    var voice = pick.voice || Object.keys(count).sort(function (a, b) { return count[b] - count[a] || (+a) - (+b); })[0];
    var out = [];
    order.forEach(function (mi, k) {
      var m = Rp.measures[mi], byOnset = {};
      if (!m) return;
      m.notes.forEach(function (n) {
        if (n.staff !== staff || (!pick.allVoices && n.voice !== voice) || !n.pitched) return;
        var s = snap(starts[k] + n.t), e = snap(starts[k] + n.t + n.dur);
        if (e <= s) return;
        var o = byOnset[s];
        if (!o) { o = byOnset[s] = { s: s, e: e, notes: [], tie: true }; out.push(o); }
        o.e = Math.max(o.e, e);
        if (o.notes.some(function (x) { return x.midi === n.midi; })) return;
        o.notes.push(n);
        if (!n.tieStart) o.tie = false;
      });
    });
    out.sort(function (a, b) { return a.s - b.s; });
    var merged = [];
    out.forEach(function (o, i) {
      var nx = out[i + 1];
      if (nx && o.e > nx.s) o.e = nx.s;
      var prev = merged[merged.length - 1];
      var key = function (x) { return x.notes.map(function (n) { return n.midi; }).sort().join(); };
      if (prev && prev.tie && prev.e === o.s && key(prev) === key(o)) { prev.e = o.e; prev.tie = o.tie; return; }
      merged.push(o);
    });
    if (pick.lowest) {
      // Only chords whose bottom note sits well below the top (a fifth or more) carry a bass note.
      merged = merged.filter(function (o) {
        if (o.notes.length < 2) return false;
        o.notes.sort(function (a, b) { return a.midi - b.midi; });
        if (o.notes[o.notes.length - 1].midi - o.notes[0].midi < 7) return false;
        o.notes = [o.notes[0]];
        return true;
      });
    }
    return merged.filter(function (o) { return o.e > o.s; }).map(function (o) {
      o.notes.sort(function (a, b) { return a.midi - b.midi; });
      var ev = { s: +((o.s - pickupU) / U).toFixed(4), d: +((o.e - o.s) / U).toFixed(4), n: o.notes.map(spellTok).join(' ') };
      if (frets) ev.f = o.notes.filter(function (n) { return n.string; }).map(function (n) { return [n.string, n.fret]; });
      return ev;
    });
  }

  function parseFile(bytes, options) {
    if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
    if (isZip(bytes)) return readMxl(bytes).then(function (text) { return parseAll(text, options); });
    try { return Promise.resolve(parseAll(decodeText(bytes), options)); } catch (e) { return Promise.reject(e); }
  }

  var exported = { parseScore: function (text, melodyPart) { return parseAll(text, { score: true, melodyPart: melodyPart })[0]; }, parse: parse, parseAll: parseAll, parseFile: parseFile, parseXML: parseXML, unroll: unroll, isZip: isZip, looksLikeMusicXML: looksLikeMusicXML, looksLikeIReal: looksLikeIReal, decodeText: decodeText, split: split };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.FakeBookMusicXML = exported;
})(typeof window !== 'undefined' ? window : globalThis);
