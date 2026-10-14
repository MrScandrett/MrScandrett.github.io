/* SPDX-License-Identifier: LGPL-2.1-only
 * Legacy Guitar Pro reader adapted from TuxGuitar GP1InputStream/GP2InputStream.
 * Copyright (C) 2005-2022 Julián Casadesús; 2023-2025 guiv42, helge17.
 * JavaScript adaptation for ClassroomOS, 2026-10-13.
 * Changes: bounded browser reader and MusicXML conversion instead of Java models.
 * License and original source: ../../vendor/tuxguitar-gtp/.
 * This separate, unminified library may be replaced or modified under LGPL 2.1.
 * Distributed WITHOUT ANY WARRANTY; see LICENSE.txt.
 */
(function (root) {
  'use strict';
  function parse(bytes) {
    if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
    if (bytes.length > 8 * 1024 * 1024) throw new Error('Guitar Pro files must be smaller than 8 MB.');
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), pos = 0;
    var decoder = new TextDecoder('windows-1252');
    function need(n) { if (n < 0 || pos + n > bytes.length) throw new Error('This Guitar Pro file is truncated or invalid.'); }
    function skip(n) { need(n); pos += n; }
    function byte() { need(1); return bytes[pos++]; }
    function int() { need(4); var n = view.getInt32(pos, true); pos += 4; return n; }
    function str(size) { var n = byte(), width = size === undefined ? n : size; need(width); if (n > width) throw new Error('Invalid Guitar Pro string length.'); var s = decoder.decode(bytes.subarray(pos, pos + n)); pos += width; return s; }
    function sized() { var n = byte(); return str(n - 1); }
    var version = str(30), gp2 = /^FICHIER GUITAR PRO v2\.2[01]$/.test(version);
    var old = ['FICHIER GUITARE PRO v1', 'FICHIER GUITARE PRO v1.01', 'FICHIER GUITARE PRO v1.02', 'FICHIER GUITARE PRO v1.03', 'FICHIER GUITARE PRO v1.04'].indexOf(version);
    if (!gp2 && old < 0) throw new Error('Unsupported Guitar Pro version. This reader supports original .gtp files (GP1 and GP2). Export newer Guitar Pro files as MusicXML.');
    var modern = gp2 || old > 2, count = modern ? 8 : 1;
    var title = sized(), composer = sized(); sized();
    var tempo = int(), swing = int(), key = modern ? int() : 0, tracks = [];
    for (var t = 0; t < count; t++) {
      var strings = gp2 || old > 1 ? int() : 6;
      if (strings < 0 || strings > 6) throw new Error('Unsupported string count in this legacy Guitar Pro file.');
      var tuning = [];
      for (var s = 0; s < strings; s++) { var pitch = int(); if (pitch < 0 || pitch > 127) throw new Error('Invalid Guitar Pro tuning.'); tuning.push(pitch); }
      tracks.push({ name: 'Track ' + (t + 1), tuning: tuning, capo: 0, measures: [], previous: [] });
    }
    var bars = int();
    if (bars < 1 || bars > 400) throw new Error('Guitar Pro imports must contain 1–400 written bars.');
    tracks.forEach(function (track) {
      track.program = int();
      if (modern) { int(); track.name = sized(); byte(); int(); int(); int(); int(); track.capo = int(); }
      if (track.capo < 0 || track.capo > 36) throw new Error('Invalid Guitar Pro capo.');
    });
    if (modern) skip(10);
    var effects = false, tempoChanges = false, hasChords = false, alternatives = 0;
    function bend() { skip(8); effects = true; }
    function effect(note) { var f = byte(); effects = true; if (note ? f === 5 || f === 6 : f === 3) bend(); }
    function chord() {
      hasChords = true;
      if (!gp2 && old < 4) { sized(); return; }
      str(); skip(1); if (int() < 12) skip(32);
      if (int() !== 0) skip(24);
    }
    for (var m = 0; m < bars; m++) {
      var numerator = byte(), denominator = byte();
      if (!numerator || numerator > 32 || [1, 2, 4, 8, 16, 32, 64].indexOf(denominator) < 0) throw new Error('Invalid Guitar Pro time signature.');
      skip(6);
      var counts = [];
      for (t = 0; t < count; t++) { skip(2); var c = byte(); counts.push(c > 127 ? 0 : c); skip(9); }
      skip(2);
      var flags = byte(), close = flags & 2 ? byte() : 0, ending = flags & 4 ? byte() : 0;
      if (flags & 1) alternatives = 0;
      var mask = 0;
      for (var e = 0; e < 8; e++) if (ending > e && !(alternatives & (1 << e))) mask |= 1 << e;
      alternatives |= mask;
      tracks.forEach(function (track, ti) {
        var measure = { meter: [numerator, denominator], open: !!(flags & 1), close: close, ending: mask, beats: [] }, elapsed = 0;
        for (var b = 0; b < counts[ti]; b++) {
          int(); var power = byte(); if (power > 127) power -= 256;
          if (power < -2 || power > 6) throw new Error('Invalid Guitar Pro duration.');
          var duration = 4 / Math.pow(2, power + 2), f1 = byte(), f2 = gp2 ? byte() : 0;
          if (f2 & 2) {
            var mix = byte();
            if (mix & 32) { int(); byte(); tempoChanges = true; }
            [16, 8, 4, 2].forEach(function (bit) { if (mix & bit) skip(2); });
            if (mix & 1) byte();
          }
          if (f2 & 1) { skip(2); effects = true; }
          if (f1 & 16) duration *= 1.5;
          if (f1 & 32) { duration *= 2 / 3; skip(1); }
          if (f1 & 4) effect(false);
          if (f1 & 2) chord();
          if (f1 & 1) str();
          var notes = [], tied = !!(f1 & 64);
          if (tied) notes = track.previous.map(function (n) { return Object.assign({}, n); });
          else if (!(f1 & 8)) {
            var played = byte(), fx = byte(), grace = gp2 ? byte() : 0;
            for (var bit = 5; bit >= 0; bit--) {
              if (played & (1 << bit)) {
                var fret = byte(); if (gp2) byte();
                if (fx & (1 << bit)) effect(true);
                var string = track.tuning.length - bit;
                if (string < 1) throw new Error('Invalid string number in Guitar Pro score.');
                if (fret < 100) notes.push({ string: string, fret: fret, midi: track.tuning[string - 1] + fret + track.capo });
                else effects = true;
              }
              if (grace & (1 << bit)) { skip(3); effects = true; }
            }
          }
          if (notes.some(function (n) { return n.midi > 127; })) throw new Error('Guitar Pro note is outside the supported pitch range.');
          measure.beats.push({ duration: duration, notes: notes, tied: tied });
          track.previous = notes;
          elapsed += duration;
        }
        if (elapsed > numerator * 4 / denominator + 0.001) throw new Error('Guitar Pro beats exceed their measure.');
        track.measures.push(measure);
      });
    }
    var pitched = tracks.filter(function (tr, i) { return i !== 7 && tr.measures.some(function (bar) { return bar.beats.some(function (beat) { return beat.notes.length; }); }); });
    if (!pitched.length) throw new Error('No pitched notes were found in this Guitar Pro file.');
    return { title: title, composer: composer, tempo: tempo, key: key, tracks: pitched, warnings: [
      'Imported legacy Guitar Pro notation; pitched tracks play on synthesized piano.',
      effects ? 'Guitar techniques, dead notes, grace notes and dynamics are not performed.' : '',
      tempoChanges ? 'Tempo changes are not performed; the opening tempo is used.' : '',
      swing ? 'The original swing feel is not performed.' : '',
      hasChords ? 'Original chord diagrams are omitted; chord suggestions are inferred from the notes.' : '',
      count === 8 ? 'The legacy percussion track is omitted.' : ''
    ].filter(Boolean) };
  }
  function escape(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]; }); }
  function pitch(midi) {
    var steps = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'], pc = midi % 12;
    return '<pitch><step>' + steps[pc] + '</step><alter>' + ([1, 3, 6, 8, 10].indexOf(pc) >= 0 ? 1 : 0) + '</alter><octave>' + (Math.floor(midi / 12) - 1) + '</octave></pitch>';
  }
  function toMusicXML(song) {
    var xml = '<score-partwise version="4.0"><work><work-title>' + escape(song.title) + '</work-title></work><identification><creator type="composer">' + escape(song.composer) + '</creator></identification><part-list>';
    song.tracks.forEach(function (tr, i) { xml += '<score-part id="P' + i + '"><part-name>' + escape(tr.name) + '</part-name></score-part>'; });
    xml += '</part-list>';
    song.tracks.forEach(function (tr, i) {
      xml += '<part id="P' + i + '">';
      tr.measures.forEach(function (bar, mi) {
        xml += '<measure number="' + (mi + 1) + '"><attributes><divisions>48</divisions><key><fifths>' + (Math.abs(song.key) <= 7 ? song.key : 0) + '</fifths></key><time><beats>' + bar.meter[0] + '</beats><beat-type>' + bar.meter[1] + '</beat-type></time>';
        xml += '<clef><sign>TAB</sign><line>5</line></clef><staff-details><staff-lines>' + tr.tuning.length + '</staff-lines>';
        tr.tuning.forEach(function (n, si) { var p = pitch(n).replace(/pitch/g, 'tuning').replace(/<alter>/g, '<tuning-alter>').replace(/<\/alter>/g, '</tuning-alter>').replace(/<step>/g, '<tuning-step>').replace(/<\/step>/g, '</tuning-step>').replace(/<octave>/g, '<tuning-octave>').replace(/<\/octave>/g, '</tuning-octave>'); xml += '<staff-tuning line="' + (tr.tuning.length - si) + '">' + p.replace(/<\/?tuning>/g, '') + '</staff-tuning>'; });
        xml += '<capo>' + tr.capo + '</capo></staff-details></attributes>';
        if (mi === 0) xml += '<direction><sound tempo="' + (song.tempo > 0 ? song.tempo : 120) + '"/></direction>';
        if (bar.open) xml += '<barline location="left"><repeat direction="forward"/></barline>';
        var endings = [];
        for (var e = 0; e < 8; e++) if (bar.ending & (1 << e)) endings.push(e + 1);
        if (endings.length) xml += '<barline location="left"><ending number="' + endings.join(',') + '" type="start"/></barline>';
        var elapsed = 0;
        bar.beats.forEach(function (beat, bi) {
          var notes = beat.notes.length ? beat.notes : [null];
          notes.forEach(function (n, ni) {
            xml += '<note>' + (ni ? '<chord/>' : '') + (n ? pitch(n.midi) : '<rest/>') + '<duration>' + Math.round(beat.duration * 48) + '</duration><voice>1</voice>';
            if (n) {
              var next = bar.beats[bi + 1] || (tr.measures[mi + 1] && tr.measures[mi + 1].beats[0]);
              if (beat.tied) xml += '<tie type="stop"/>';
              if (next && next.tied) xml += '<tie type="start"/>';
              xml += '<notations><technical><string>' + n.string + '</string><fret>' + n.fret + '</fret></technical></notations>';
            }
            xml += '</note>';
          });
          elapsed += beat.duration;
        });
        var rest = bar.meter[0] * 4 / bar.meter[1] - elapsed;
        if (rest > 0.001) xml += '<note><rest/><duration>' + Math.round(rest * 48) + '</duration><voice>1</voice></note>';
        if (endings.length) xml += '<barline location="right"><ending number="' + endings.join(',') + '" type="stop"/></barline>';
        if (bar.close) xml += '<barline location="right"><repeat direction="backward" times="' + (bar.close + 1) + '"/></barline>';
        xml += '</measure>';
      });
      xml += '</part>';
    });
    return xml + '</score-partwise>';
  }
  function parseFile(bytes, mx) {
    return Promise.resolve().then(function () {
      var song = parse(bytes), result = mx.parseScore(toMusicXML(song));
      result.format = 'Guitar Pro'; result.warnings = song.warnings.concat(result.warnings);
      return result;
    });
  }
  var api = { parse: parse, toMusicXML: toMusicXML, parseFile: parseFile };
  root.FakeBookGTP = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
