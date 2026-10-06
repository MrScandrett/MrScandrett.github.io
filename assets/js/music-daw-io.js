/* music-daw-io.js — file formats for the Music Lab Track Studio.
 *
 * Pure functions, no DOM, so they run in the browser and under `node --test`:
 *
 *   DawIO.parseMidi(arrayBuffer)  → { ppq, bpm, timeSig, tracks: [{ name, channel, program, drums, notes }] }
 *   DawIO.writeMidi(song)         → Uint8Array (Standard MIDI File, type 1)
 *   DawIO.encodeWav(channels, sampleRate, bits) → ArrayBuffer (PCM16 or float32)
 *
 * Note times are in beats (quarter notes): { pitch, start, duration, velocity (0–1) }.
 * Imports collapse a file's tempo map to its first tempo; the studio has one tempo per song.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DawIO = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── General MIDI ─────────────────────────────────────────────────────────
  // The studio has a handful of built-in instruments; GM programs map onto them
  // on import, and each instrument exports as one representative GM program.
  var INSTRUMENT_PROGRAM = { piano: 0, ePiano: 4, organ: 16, pluck: 24, bass: 33, strings: 48, synth: 80, pad: 89, drums: 0 };

  function instrumentForProgram(program) {
    var p = program | 0;
    if (p === 4 || p === 5) return 'ePiano';
    if (p < 8) return 'piano';
    if (p < 16) return 'ePiano';      // chromatic percussion: bells, mallets
    if (p < 24) return 'organ';
    if (p < 32) return 'pluck';       // guitars
    if (p < 40) return 'bass';
    if (p < 52) return 'strings';
    if (p < 56) return 'pad';         // choir, voice
    if (p < 88) return 'synth';       // brass, reeds, pipes, synth leads
    if (p < 96) return 'pad';
    if (p < 104) return 'pad';        // synth effects
    if (p < 112) return 'pluck';      // ethnic plucked
    return 'synth';
  }

  // GM percussion key → DrumEngine voice.
  var GM_DRUMS = {
    35: 'kick', 36: 'kick', 37: 'rim', 38: 'snare', 39: 'clap', 40: 'snare',
    41: 'tomLo', 42: 'hat', 43: 'tomLo', 44: 'hat', 45: 'tomMid', 46: 'ohat',
    47: 'tomMid', 48: 'tomHi', 49: 'crash', 50: 'tomHi', 51: 'ride', 52: 'crash',
    53: 'ride', 55: 'crash', 57: 'crash', 59: 'ride'
  };
  var DRUM_KEYS = { kick: 36, rim: 37, snare: 38, clap: 39, tomLo: 41, hat: 42, tomMid: 47, ohat: 46, tomHi: 48, crash: 49, ride: 51, perc: 56 };
  var DRUM_LABELS = {
    35: 'Kick 2', 36: 'Kick', 37: 'Rim', 38: 'Snare', 39: 'Clap', 40: 'Snare 2', 41: 'Low Tom',
    42: 'Closed Hat', 43: 'Low Tom 2', 44: 'Pedal Hat', 45: 'Mid Tom', 46: 'Open Hat', 47: 'Mid Tom 2',
    48: 'High Tom', 49: 'Crash', 50: 'High Tom 2', 51: 'Ride', 52: 'China', 53: 'Ride Bell',
    54: 'Tambourine', 55: 'Splash', 56: 'Cowbell', 57: 'Crash 2', 59: 'Ride 2'
  };
  function drumVoiceForKey(key) { return GM_DRUMS[key] || 'perc'; }

  // ── Reading ──────────────────────────────────────────────────────────────
  function Reader(bytes) { this.b = bytes; this.p = 0; }
  Reader.prototype.u8 = function () { if (this.p >= this.b.length) throw new Error('Unexpected end of MIDI data'); return this.b[this.p++]; };
  Reader.prototype.u16 = function () { return (this.u8() << 8) | this.u8(); };
  Reader.prototype.u32 = function () { return ((this.u8() << 24) >>> 0) + (this.u8() << 16) + (this.u8() << 8) + this.u8(); };
  Reader.prototype.str = function (n) { var s = ''; for (var i = 0; i < n; i++) s += String.fromCharCode(this.u8()); return s; };
  Reader.prototype.vlq = function () {
    var v = 0;
    for (var i = 0; i < 4; i++) { var c = this.u8(); v = (v << 7) | (c & 0x7f); if (!(c & 0x80)) return v; }
    throw new Error('Bad variable-length number in MIDI data');
  };

  function latin1(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    try { return decodeURIComponent(escape(s)); } catch (_e) { return s; }
  }

  function readTrack(r, end) {
    var events = [], tick = 0, running = 0;
    while (r.p < end) {
      tick += r.vlq();
      var status = r.b[r.p];
      if (status & 0x80) r.p++; else if (running) status = running; else throw new Error('MIDI running status without a status byte');
      if (status === 0xff) {
        var type = r.u8(), len = r.vlq(), data = r.b.subarray(r.p, r.p + len); r.p += len;
        events.push({ tick: tick, meta: type, data: data });
        if (type === 0x2f) break;
      } else if (status === 0xf0 || status === 0xf7) {
        r.p += r.vlq();
      } else {
        running = status;
        var cmd = status & 0xf0, ch = status & 0x0f;
        var d1 = r.u8(), d2 = (cmd === 0xc0 || cmd === 0xd0) ? 0 : r.u8();
        events.push({ tick: tick, cmd: cmd, ch: ch, d1: d1, d2: d2 });
      }
    }
    r.p = end;
    return events;
  }

  function parseMidi(input) {
    var bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    var r = new Reader(bytes);
    if (r.str(4) !== 'MThd') throw new Error('Not a MIDI file (missing MThd header)');
    var hlen = r.u32(), format = r.u16(), ntracks = r.u16(), division = r.u16();
    r.p = 8 + hlen;
    if (division & 0x8000) throw new Error('SMPTE-timed MIDI files are not supported');
    var ppq = division || 480;

    var bpm = null, timeSig = null, rawTracks = [];
    for (var t = 0; t < ntracks && r.p + 8 <= bytes.length; t++) {
      var id = r.str(4), len = r.u32(), end = Math.min(bytes.length, r.p + len);
      if (id !== 'MTrk') { r.p = end; continue; }
      rawTracks.push(readTrack(r, end));
    }

    var out = [];
    rawTracks.forEach(function (events, index) {
      var name = '', instName = '';
      // Split by channel so type-0 files (everything on one track) become separate tracks.
      var byChannel = {};
      function lane(ch) {
        if (!byChannel[ch]) byChannel[ch] = { channel: ch, program: null, notes: [], open: {} };
        return byChannel[ch];
      }
      events.forEach(function (e) {
        if (e.meta !== undefined) {
          if (e.meta === 0x51 && bpm === null && e.data.length === 3) {
            bpm = 60000000 / ((e.data[0] << 16) | (e.data[1] << 8) | e.data[2]);
          } else if (e.meta === 0x58 && timeSig === null && e.data.length >= 2) {
            timeSig = [e.data[0], Math.pow(2, e.data[1])];
          } else if (e.meta === 0x03 && !name) name = latin1(e.data).trim();
          else if (e.meta === 0x04 && !instName) instName = latin1(e.data).trim();
          return;
        }
        var L;
        if (e.cmd === 0xc0) { L = lane(e.ch); if (L.program === null) L.program = e.d1; return; }
        if (e.cmd === 0x90 && e.d2 > 0) {
          L = lane(e.ch);
          (L.open[e.d1] = L.open[e.d1] || []).push({ tick: e.tick, vel: e.d2 });
        } else if (e.cmd === 0x80 || (e.cmd === 0x90 && e.d2 === 0)) {
          L = byChannel[e.ch];
          var stack = L && L.open[e.d1];
          if (stack && stack.length) {
            var on = stack.shift();
            L.notes.push({ pitch: e.d1, start: on.tick / ppq, duration: Math.max(1, e.tick - on.tick) / ppq, velocity: on.vel / 127 });
          }
        }
      });
      var lastTick = events.length ? events[events.length - 1].tick : 0;
      Object.keys(byChannel).forEach(function (k) {
        var L = byChannel[k];
        // Notes never switched off ring until the track ends.
        Object.keys(L.open).forEach(function (pitch) {
          L.open[pitch].forEach(function (on) {
            L.notes.push({ pitch: +pitch, start: on.tick / ppq, duration: Math.max(ppq / 4, lastTick - on.tick) / ppq, velocity: on.vel / 127 });
          });
        });
        if (!L.notes.length) return;
        L.notes.sort(function (a, b) { return a.start - b.start || a.pitch - b.pitch; });
        var drums = L.channel === 9;
        var channels = Object.keys(byChannel).filter(function (c) { return byChannel[c].notes.length; }).length;
        var label = name || instName || ('Track ' + (index + 1));
        if (channels > 1) label += ' (ch ' + (L.channel + 1) + ')';
        out.push({
          name: drums && !name ? 'Drums' : label,
          channel: L.channel,
          program: L.program || 0,
          drums: drums,
          instrument: drums ? 'drums' : instrumentForProgram(L.program || 0),
          notes: L.notes
        });
      });
    });

    return { format: format, ppq: ppq, bpm: bpm ? Math.round(bpm * 100) / 100 : null, timeSig: timeSig, tracks: out };
  }

  // ── Writing ──────────────────────────────────────────────────────────────
  function vlqBytes(n) {
    n = Math.max(0, Math.round(n));
    var bytes = [n & 0x7f];
    while ((n >>= 7)) bytes.unshift((n & 0x7f) | 0x80);
    return bytes;
  }
  function textBytes(s) {
    var u = unescape(encodeURIComponent(String(s || '')));
    var a = [];
    for (var i = 0; i < u.length; i++) a.push(u.charCodeAt(i) & 0xff);
    return a;
  }
  function chunk(id, body) {
    var len = body.length;
    return [id.charCodeAt(0), id.charCodeAt(1), id.charCodeAt(2), id.charCodeAt(3),
      (len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff].concat(body);
  }
  function encodeEvents(events) {
    // Note-offs sort before note-ons at the same tick so repeated notes retrigger.
    events.sort(function (a, b) { return a.tick - b.tick || a.order - b.order; });
    var body = [], last = 0;
    events.forEach(function (e) {
      body.push.apply(body, vlqBytes(e.tick - last));
      body.push.apply(body, e.bytes);
      last = e.tick;
    });
    body.push.apply(body, vlqBytes(0).concat([0xff, 0x2f, 0x00]));
    return body;
  }

  // song: { bpm, timeSig: [num, den], ppq?, name?, tracks: [{ name, instrument, notes, volume?, pan? }] }
  function writeMidi(song) {
    var ppq = song.ppq || 480;
    var bpm = song.bpm || 120;
    var sig = song.timeSig || [4, 4];
    var us = Math.round(60000000 / bpm);
    var tempoTrack = [
      { tick: 0, order: 0, bytes: [0xff, 0x03].concat(vlqBytes(textBytes(song.name || 'Music Lab song').length), textBytes(song.name || 'Music Lab song')) },
      { tick: 0, order: 0, bytes: [0xff, 0x51, 0x03, (us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff] },
      { tick: 0, order: 0, bytes: [0xff, 0x58, 0x04, sig[0], Math.round(Math.log2(sig[1])), 24, 8] }
    ];
    var chunks = [chunk('MTrk', encodeEvents(tempoTrack))];

    var nextChannel = 0;
    (song.tracks || []).forEach(function (track) {
      var drums = track.instrument === 'drums';
      var ch;
      if (drums) ch = 9;
      else { ch = nextChannel++ % 15; if (ch >= 9) ch += 1; }   // skip channel 10 (drums)
      var name = textBytes(track.name || 'Track');
      var ev = [
        { tick: 0, order: 0, bytes: [0xff, 0x03].concat(vlqBytes(name.length), name) },
        { tick: 0, order: 1, bytes: [0xb0 | ch, 7, Math.max(0, Math.min(127, Math.round((track.volume === undefined ? 1 : track.volume) * 100)))] },
        { tick: 0, order: 1, bytes: [0xb0 | ch, 10, Math.max(0, Math.min(127, Math.round(64 + (track.pan || 0) * 63)))] }
      ];
      if (!drums) ev.push({ tick: 0, order: 2, bytes: [0xc0 | ch, INSTRUMENT_PROGRAM[track.instrument] || 0] });
      (track.notes || []).forEach(function (n) {
        var on = Math.max(0, Math.round(n.start * ppq));
        var off = Math.max(on + 1, Math.round((n.start + n.duration) * ppq));
        var pitch = Math.max(0, Math.min(127, Math.round(n.pitch)));
        var vel = Math.max(1, Math.min(127, Math.round((n.velocity === undefined ? 0.8 : n.velocity) * 127)));
        ev.push({ tick: on, order: 4, bytes: [0x90 | ch, pitch, vel] });
        ev.push({ tick: off, order: 3, bytes: [0x80 | ch, pitch, 0] });
      });
      chunks.push(chunk('MTrk', encodeEvents(ev)));
    });

    var header = chunk('MThd', [0, 1, (chunks.length >> 8) & 0xff, chunks.length & 0xff, (ppq >> 8) & 0xff, ppq & 0xff]);
    var all = header;
    chunks.forEach(function (c) { all = all.concat(c); });
    return new Uint8Array(all);
  }

  // ── WAV ──────────────────────────────────────────────────────────────────
  function encodeWav(channels, sampleRate, bits) {
    bits = bits === 32 ? 32 : 16;
    var n = channels.length, frames = channels[0] ? channels[0].length : 0;
    var bytesPer = bits / 8, dataLen = frames * n * bytesPer;
    var buf = new ArrayBuffer(44 + dataLen), v = new DataView(buf);
    function str(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
    str(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true); str(8, 'WAVE');
    str(12, 'fmt '); v.setUint32(16, 16, true);
    v.setUint16(20, bits === 32 ? 3 : 1, true);   // 3 = IEEE float, 1 = PCM
    v.setUint16(22, n, true); v.setUint32(24, sampleRate, true);
    v.setUint32(28, sampleRate * n * bytesPer, true); v.setUint16(32, n * bytesPer, true); v.setUint16(34, bits, true);
    str(36, 'data'); v.setUint32(40, dataLen, true);
    var o = 44;
    for (var i = 0; i < frames; i++) {
      for (var c = 0; c < n; c++) {
        var s = channels[c][i];
        if (bits === 32) { v.setFloat32(o, s, true); o += 4; }
        else { s = Math.max(-1, Math.min(1, s)); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
      }
    }
    return buf;
  }

  return {
    parseMidi: parseMidi,
    writeMidi: writeMidi,
    encodeWav: encodeWav,
    instrumentForProgram: instrumentForProgram,
    drumVoiceForKey: drumVoiceForKey,
    DRUM_KEYS: DRUM_KEYS,
    DRUM_LABELS: DRUM_LABELS,
    INSTRUMENT_PROGRAM: INSTRUMENT_PROGRAM
  };
});
