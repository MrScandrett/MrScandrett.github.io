/* Guitar Pro 3–8 → MusicXML → Fake Book. Decoder: alphaTab (MPL-2.0).
 * The decoder is loaded locally on demand; score files stay in the browser.
 * Original GP1/GP2 .gtp files continue to use the separate legacy reader.
 */
(function (root) {
  'use strict';
  var reader;
  // Resolve relative to this script, including when the page is under a subpath.
  var readerURL = typeof document !== 'undefined' && document.currentScript
    ? new URL('../../vendor/alphatab/guitar-pro-reader.min.mjs', document.currentScript.src).href
    : '../../vendor/alphatab/guitar-pro-reader.min.mjs';
  function escape(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]; }); }
  function pitch(midi, prefix) {
    if (!Number.isInteger(midi) || midi < 0 || midi > 127) throw new Error('A Guitar Pro note is outside the supported pitch range.');
    var steps = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'], pc = midi % 12;
    prefix = prefix || '';
    return '<' + prefix + 'step>' + steps[pc] + '</' + prefix + 'step><' + prefix + 'alter>' + ([1,3,6,8,10].indexOf(pc) >= 0 ? 1 : 0) + '</' + prefix + 'alter><' + prefix + 'octave>' + (Math.floor(midi / 12) - 1) + '</' + prefix + 'octave>';
  }
  // Convert only chord spellings supported by our playback chord vocabulary.
  // Unknown labels remain visible as text instead of silently becoming major.
  function chordXML(name) {
    name = String(name || '').trim().replace(/♭/g, 'b').replace(/♯/g, '#').replace(/Δ/g, 'maj').replace(/ø/g, 'm7b5').replace(/°/g, 'dim');
    var match = /^([A-G])([#b]?)([^/]*)(?:\/([A-G])([#b]?))?$/.exec(name);
    if (!match) return null;
    var q = match[3].replace(/^min/, 'm').replace(/^M(?=\d)/, 'maj').replace(/^-/, 'm');
    var kinds = { '': 'major', m: 'minor', '7': 'dominant', maj7: 'major-seventh', m7: 'minor-seventh', '6': 'major-sixth', m6: 'minor-sixth', dim: 'diminished', dim7: 'diminished-seventh', m7b5: 'half-diminished', aug: 'augmented', '+': 'augmented', '9': 'dominant-ninth', maj9: 'major-ninth', m9: 'minor-ninth', '11': 'dominant-11th', m11: 'minor-11th', '13': 'dominant-13th', m13: 'minor-13th', sus2: 'suspended-second', sus4: 'suspended-fourth', '5': 'power', 'm(maj7)': 'major-minor' };
    var degrees = '', base = q;
    var alteration = /^(7|maj7|m7|9|maj9|m9|13)(b5|#5|b9|#9|#11|b13)$/.exec(q);
    if (alteration) { base = alteration[1]; degrees = '<degree><degree-value>' + alteration[2].slice(1) + '</degree-value><degree-alter>' + (alteration[2][0] === 'b' ? -1 : 1) + '</degree-alter><degree-type>alter</degree-type></degree>'; }
    if (!Object.prototype.hasOwnProperty.call(kinds, base)) return null;
    function rootXML(step, acc, tag) { return '<' + tag + '><' + tag + '-step>' + step + '</' + tag + '-step><' + tag + '-alter>' + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + '</' + tag + '-alter></' + tag + '>'; }
    return '<harmony>' + rootXML(match[1], match[2], 'root') + '<kind text="' + escape(name) + '">' + kinds[base] + '</kind>' + degrees + (match[4] ? rootXML(match[4], match[5], 'bass') : '') + '</harmony>';
  }
  function toMusicXML(score) {
    if (!score.masterBars.length || score.masterBars.length > 400) throw new Error('Guitar Pro imports must contain 1–400 written bars.');
    var parts = [], noteCount = 0;
    score.tracks.forEach(function (track) {
      track.staves.forEach(function (staff) {
        if (!staff.isPercussion) parts.push({ track: track, staff: staff });
      });
    });
    if (!parts.length) throw new Error('No pitched tracks were found in this Guitar Pro file.');
    if (parts.length > 64) throw new Error('Guitar Pro imports support up to 64 pitched staves.');
    var lengths = score.masterBars.map(function (master, mi) {
      var length = master.calculateDuration();
      parts.forEach(function (p) {
        var bar = p.staff.bars[mi];
        if (bar) bar.voices.forEach(function (v) { v.beats.forEach(function (b) {
          if (!b.isEmpty && b.graceType === 0) length = Math.max(length, b.displayStart + b.displayDuration);
        }); });
      });
      return length;
    });
    var xml = '<score-partwise version="4.0"><work><work-title>' + escape(score.title || 'Guitar Pro score') + '</work-title></work><identification><creator type="composer">' + escape(score.music || score.artist) + '</creator></identification><part-list>';
    parts.forEach(function (p, i) {
      xml += '<score-part id="P' + i + '"><part-name>' + escape(p.track.name || 'Track ' + (i + 1)) + (p.track.staves.length > 1 ? ' · staff ' + (p.staff.index + 1) : '') + '</part-name></score-part>';
    });
    xml += '</part-list>';
    parts.forEach(function (p, i) {
      var staff = p.staff;
      xml += '<part id="P' + i + '">';
      score.masterBars.forEach(function (master, mi) {
        var bar = staff.bars[mi], meter = [master.timeSignatureNumerator, master.timeSignatureDenominator];
        if (!bar || !meter[0] || meter[0] > 32 || [1,2,4,8,16,32,64].indexOf(meter[1]) < 0) throw new Error('Invalid Guitar Pro measure or time signature.');
        var length = lengths[mi];
        if (!(length > 0)) throw new Error('Invalid Guitar Pro measure duration.');
        xml += '<measure number="' + (mi + 1) + '"' + (master.isAnacrusis ? ' implicit="yes"' : '') + '><attributes><divisions>960</divisions><key><fifths>' + (bar.keySignature || 0) + '</fifths><mode>' + (bar.keySignatureType === 1 ? 'minor' : 'major') + '</mode></key><time><beats>' + meter[0] + '</beats><beat-type>' + meter[1] + '</beat-type></time>';
        xml += '<clef><sign>' + (staff.isStringed ? 'TAB' : bar.clef === 3 ? 'F' : bar.clef === 1 || bar.clef === 2 ? 'C' : 'G') + '</sign><line>' + (staff.isStringed ? 5 : bar.clef === 3 || bar.clef === 2 ? 4 : bar.clef === 1 ? 3 : 2) + '</line></clef>';
        if (staff.isStringed) {
          xml += '<staff-details><staff-lines>' + staff.tuning.length + '</staff-lines>';
          staff.tuning.forEach(function (n, si) { xml += '<staff-tuning line="' + (staff.tuning.length - si) + '">' + pitch(n - staff.transpositionPitch, 'tuning-') + '</staff-tuning>'; });
          xml += '<capo>' + staff.capo + '</capo></staff-details>';
        }
        xml += '</attributes>';
        if (mi === 0) xml += '<direction><sound tempo="' + (score.tempo > 0 ? score.tempo : 120) + '"/></direction>';
        if (master.isRepeatStart) xml += '<barline location="left"><repeat direction="forward"/></barline>';
        var endings = [];
        for (var e = 0; e < 8; e++) if (master.alternateEndings & (1 << e)) endings.push(e + 1);
        if (endings.length) xml += '<barline location="left"><ending number="' + endings.join(',') + '" type="start"/></barline>';
        // Map the directions supported by the shared MusicXML road-map reader.
        if (master.directions) master.directions.forEach(function (d) {
          var attrs = { 0: 'fine="yes"', 1: 'segno="segno"', 3: 'coda="coda"', 5: 'dacapo="yes"', 6: 'dacapo="yes"', 8: 'dacapo="yes"', 9: 'dalsegno="segno"', 10: 'dalsegno="segno"', 12: 'dalsegno="segno"', 17: 'tocoda="coda"' }[d];
          if (!attrs) throw new Error('This score uses double-coda or double-segno navigation. Export an expanded MusicXML score first.');
          xml += '<direction><sound ' + attrs + '/></direction>';
        });
        var voices = bar.voices.filter(function (v) { return !v.isEmpty; });
        var chordOnsets = {};
        if (!voices.length) voices = [null];
        voices.forEach(function (voice, vi) {
          if (vi) xml += '<backup><duration>' + length + '</duration></backup>';
          var cursor = 0, voiceID = voice ? voice.index + 1 : 1;
          function rest(duration) { if (duration > 0) xml += '<note><rest/><duration>' + duration + '</duration><voice>' + voiceID + '</voice></note>'; }
          (voice ? voice.beats : []).forEach(function (beat) {
            if (beat.isEmpty || beat.graceType !== 0) return;
            var start = beat.displayStart, duration = beat.displayDuration;
            if (!Number.isInteger(start) || !Number.isInteger(duration) || duration <= 0 || start < cursor || start + duration > length) throw new Error('Invalid Guitar Pro beat timing.');
            rest(start - cursor);
            var chord = beat.chord;
            if (chord && chord.name && !chordOnsets[start]) {
              var harmony = chordXML(chord.name);
              xml += harmony || '<direction><direction-type><words>' + escape(chord.name) + '</words></direction-type></direction>';
              chordOnsets[start] = true;
            }
            var notes = beat.notes.filter(function (n) { return !n.isDead && !n.isPercussion; });
            if (!notes.length) rest(duration);
            notes.forEach(function (n, ni) {
              if (++noteCount > 100000) throw new Error('That Guitar Pro score contains too many notes.');
              xml += '<note>' + (ni ? '<chord/>' : '') + '<pitch>' + pitch(n.realValue) + '</pitch><duration>' + duration + '</duration><voice>' + voiceID + '</voice>';
              if (n.isTieDestination) xml += '<tie type="stop"/>';
              if (n.isTieOrigin) xml += '<tie type="start"/>';
              var type = { '-4': 'long', '-2': 'breve', 1: 'whole', 2: 'half', 4: 'quarter', 8: 'eighth', 16: '16th', 32: '32nd', 64: '64th', 128: '128th', 256: '256th' }[beat.duration];
              if (type) xml += '<type>' + type + '</type>';
              for (var dot = 0; dot < beat.dots; dot++) xml += '<dot/>';
              if (beat.tupletNumerator && beat.tupletDenominator && beat.tupletNumerator !== beat.tupletDenominator) xml += '<time-modification><actual-notes>' + beat.tupletNumerator + '</actual-notes><normal-notes>' + beat.tupletDenominator + '</normal-notes></time-modification>';
              var technical = '';
              if (staff.isStringed && n.isStringed) technical = '<technical><string>' + (staff.tuning.length + 1 - n.string) + '</string><fret>' + n.fret + '</fret></technical>';
              xml += '<notations>' + (n.isTieDestination ? '<tied type="stop"/>' : '') + (n.isTieOrigin ? '<tied type="start"/>' : '') + technical + '</notations></note>';
            });
            cursor = start + duration;
          });
          rest(length - cursor);
        });
        if (endings.length) xml += '<barline location="right"><ending number="' + endings.join(',') + '" type="stop"/></barline>';
        if (master.isRepeatEnd) xml += '<barline location="right"><repeat direction="backward" times="' + Math.max(2, master.repeatCount) + '"/></barline>';
        xml += '</measure>';
      });
      xml += '</part>';
    });
    if (!noteCount) throw new Error('No pitched notes were found in this Guitar Pro file.');
    return xml + '</score-partwise>';
  }
  async function parseFile(bytes, mx) {
    if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
    if (bytes.length > 8 * 1024 * 1024) throw new Error('Guitar Pro files must be smaller than 8 MB.');
    if (!bytes.length) throw new Error('This Guitar Pro file is empty.');
    var header = new TextDecoder().decode(bytes.subarray(1, 31)).replace(/\0.*$/, '');
    if (/^FICHIER GUITARE PRO v1|^FICHIER GUITAR PRO v2\.2/.test(header)) {
      if (!root.FakeBookGTP) throw new Error('The legacy Guitar Pro reader is not available. Refresh the page.');
      return root.FakeBookGTP.parseFile(bytes, mx);
    }
    if (!reader) reader = import(readerURL).catch(function () { reader = null; throw new Error('The Guitar Pro decoder could not load. Refresh the page and try again.'); });
    var decoder = await reader, score;
    try { score = decoder.readScore(bytes); }
    catch (err) { throw new Error('This Guitar Pro file is invalid, truncated, or unsupported. Export it as MusicXML if it opens in Guitar Pro.'); }
    var result = mx.parseScore(toMusicXML(score));
    result.format = 'Guitar Pro';
    var H = root.FakeBookHarmony;
    if (!H && typeof module !== 'undefined' && module.exports) H = require('./fake-book-harmony.js');
    if (!result.hasChords && H) {
      var names = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
      var key = names.indexOf(result.key), natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
      if (key < 0) key = (natural[result.key[0]] + (result.key[1] === 'b' ? -1 : result.key[1] === '#' ? 1 : 0) + 12) % 12;
      result.chords = result.score.bars.map(function (bar) {
        var notes = result.score.notes.filter(function (n) { return n.start < bar.start + bar.len && n.start + n.dur > bar.start; }).map(function (n) {
          var start = Math.max(n.start, bar.start), end = Math.min(n.start + n.dur, bar.start + bar.len);
          return { s: start - bar.start, d: end - start, midi: n.midi };
        });
        // Eighth-note resolution preserves off-beat changes, including mixed meter.
        var unit = bar.len % .5 < 1e-6 ? .5 : .25;
        return H.analyze(notes, { M: bar.len, bars: 1, unit: unit, startKey: { tonic: key, minor: result.minor } }).chordBars[0];
      }).join(' | ');
      result.chordsWorkedOut = true;
    }
    var sourceChords = 0, unsupported = 0;
    score.tracks.forEach(function (track) { track.staves.forEach(function (staff) { staff.bars.forEach(function (bar) { bar.voices.forEach(function (voice) { voice.beats.forEach(function (beat) {
      if (beat.chord && beat.chord.name) { if (chordXML(beat.chord.name)) sourceChords++; else unsupported++; }
    }); }); }); }); });
    result.guitarPro = { harmony: result.hasChords ? 'source' : 'inferred', sourceChords: sourceChords, unsupportedChords: unsupported };
    result.warnings = ['Imported Guitar Pro notation; pitched tracks play on synthesized piano. Bends, slides, grace notes, dead notes, dynamics, swing, percussion, backing audio and tempo changes are not performed.',
      result.hasChords ? 'Supported chord changes are preserved from the source; verify capo-relative chord names against sounding pitches.' : 'Chord changes are inferred from all sounding pitched voices at eighth-note resolution; they are practice suggestions, not an authoritative transcription.',
      'Practice voicings use screened, connected standard-tuning grips; the original frets, tuning and written voices remain in the source score.'
    ].concat(result.warnings.filter(function (w) { return !/^Written pitched voices play on synthesized piano\.|^The file has no chord symbols/.test(w); }));
    if (unsupported) result.warnings.push(unsupported + ' unsupported chord labels remain as source text and are not treated as playable chord symbols.');
    if (score.masterBars.some(function (m, mi) { return score.tracks.some(function (tr) { return tr.staves.some(function (st) {
      var bar = st.bars[mi];
      return bar && bar.voices.some(function (v) { return v.beats.some(function (b) { return !b.isEmpty && b.graceType === 0 && b.displayStart + b.displayDuration > m.calculateDuration(); }); });
    }); }); })) result.warnings.push('Some written bars exceed their time signature; their full written duration is preserved.');
    return result;
  }
  var api = { toMusicXML: toMusicXML, parseFile: parseFile, chordXML: chordXML };
  root.FakeBookGuitarPro = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
