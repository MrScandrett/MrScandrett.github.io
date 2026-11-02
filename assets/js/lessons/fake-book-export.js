/* fake-book-export.js — take the tune home: the band you hear, as a Standard MIDI File.
 *
 * Fake Book plays from one event queue (melody, chord voicings, bass, drums, written score voices).
 * `fromQueue()` sorts that queue into named tracks, and `buildMidi()` writes a type-1 .mid that opens
 * in GarageBand, MuseScore, Soundtrap, BandLab, Logic, Ableton… What you export is what you heard:
 * the band style, swing feel, tempo and key are all baked in.
 *
 * Beats are quarter notes (the unit Fake Book's scheduler uses). `warp(b)` lets the caller bend time
 * the same way playback does, so swing lands in the file as real shifted off-beats.
 */
(function (root) {
  'use strict';

  var PPQ = 480;
  var DRUM_NOTES = { kick: 36, rim: 37, snare: 38, hat: 42, ohat: 46, tomLo: 45, tomMid: 47, tomHi: 50, crash: 49, ride: 51 };
  var LEAD_PROGRAM = { reed: 65, flute: 73, piano: 0 };          // alto sax, flute, acoustic grand

  function vlq(n) {
    n = Math.max(0, Math.round(n));
    var bytes = [n & 0x7f];
    while ((n >>= 7)) bytes.unshift((n & 0x7f) | 0x80);
    return bytes;
  }
  function u32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
  function u16(n) { return [(n >> 8) & 255, n & 255]; }
  function ascii(s) { var out = []; for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0x7f); return out; }
  function utf8(s) {
    if (typeof TextEncoder !== 'undefined') return Array.prototype.slice.call(new TextEncoder().encode(s));
    return ascii(unescape(encodeURIComponent(s)));
  }
  function meta(type, data) { return [0xff, type].concat(vlq(data.length), data); }
  function chunk(tag, data) { return ascii(tag).concat(u32(data.length), data); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /**
   * One track's bytes from absolute-tick events [{tick, order, bytes}], sorted stably (note-offs before
   * note-ons at the same tick so a repeated pitch re-strikes instead of being swallowed).
   */
  function trackBytes(events) {
    events.sort(function (a, b) { return a.tick - b.tick || a.order - b.order || a.seq - b.seq; });
    var out = [], last = 0;
    events.forEach(function (e) { out = out.concat(vlq(e.tick - last), e.bytes); last = e.tick; });
    out = out.concat(vlq(0), meta(0x2f, []));
    return chunk('MTrk', out);
  }

  /**
   * @param {{title?:string, tempo:number, meter?:number[], warp?:(b:number)=>number,
   *          markers?:{b:number,text:string}[],
   *          tracks:{name:string, channel:number, program?:number, notes:{b:number,dur:number,midi:number,vel?:number}[]}[]}} song
   * @returns {Uint8Array}
   */
  function buildMidi(song) {
    var warp = song.warp || function (b) { return b; };
    var seq = 0, tick = function (b) { return Math.max(0, Math.round(warp(b) * PPQ)); };
    var meter = song.meter || [4, 4];
    var bpm = clamp(song.tempo || 120, 20, 400);
    var dd = Math.round(Math.log(meter[1]) / Math.LN2);

    var conductor = [
      { tick: 0, order: 0, seq: seq++, bytes: meta(0x03, utf8(song.title || 'Fake Book tune')) },
      { tick: 0, order: 1, seq: seq++, bytes: meta(0x51, [(Math.round(60000000 / bpm) >> 16) & 255, (Math.round(60000000 / bpm) >> 8) & 255, Math.round(60000000 / bpm) & 255]) },
      { tick: 0, order: 2, seq: seq++, bytes: meta(0x58, [meter[0], dd, 24, 8]) }
    ];
    (song.markers || []).forEach(function (m) {
      conductor.push({ tick: tick(m.b), order: 3, seq: seq++, bytes: meta(0x06, utf8(m.text)) });
    });

    var chunks = [trackBytes(conductor)];
    song.tracks.forEach(function (t) {
      if (!t.notes.length) return;
      var ch = clamp(t.channel, 0, 15), ev = [];
      ev.push({ tick: 0, order: 0, seq: seq++, bytes: meta(0x03, utf8(t.name)) });
      if (ch !== 9) ev.push({ tick: 0, order: 1, seq: seq++, bytes: [0xc0 | ch, clamp(t.program || 0, 0, 127)] });
      t.notes.forEach(function (n) {
        var on = tick(n.b), off = Math.max(on + 1, tick(n.b + n.dur));
        var key = clamp(Math.round(n.midi), 0, 127), vel = clamp(Math.round(n.vel == null ? 90 : n.vel), 1, 127);
        ev.push({ tick: on, order: 2, seq: seq++, bytes: [0x90 | ch, key, vel] });
        ev.push({ tick: off, order: 1, seq: seq++, bytes: [0x80 | ch, key, 0] });
      });
      chunks.push(trackBytes(ev));
    });

    var header = chunk('MThd', u16(1).concat(u16(chunks.length), u16(PPQ)));
    var all = header.slice();
    chunks.forEach(function (c) { all = all.concat(c); });
    return Uint8Array.from(all);
  }

  /**
   * Sort Fake Book's playback queue into MIDI tracks.
   * @param {object[]} queue  events {b, kind, ...} as scheduled by the player
   * @param {{lead?:string, shift?:number, parts?:{id:string,label:string}[]}} [o]
   *   lead   'reed' | 'flute' | 'piano' (the melody voice)
   *   shift  semitones added to written-score notes (the key the score is played in)
   *   parts  names for written score voices, by id
   */
  function fromQueue(queue, o) {
    o = o || {};
    var tracks = {}, order = [];
    function track(key, name, channel, program) {
      if (!tracks[key]) { tracks[key] = { name: name, channel: channel, program: program, notes: [] }; order.push(key); }
      return tracks[key];
    }
    var partChannels = {}, nextCh = 3;
    function partChannel(id) {
      if (partChannels[id] == null) { if (nextCh === 9) nextCh++; partChannels[id] = Math.min(nextCh++, 15); }
      return partChannels[id];
    }
    var labels = {}; (o.parts || []).forEach(function (p) { labels[p.id] = p.label; });

    queue.forEach(function (e) {
      switch (e.kind) {
        case 'mel': track('mel', 'Melody', 0, LEAD_PROGRAM[o.lead] != null ? LEAD_PROGRAM[o.lead] : 65).notes.push({ b: e.b, dur: e.dur, midi: e.m, vel: 96 }); break;
        case 'pno': (e.ms || []).forEach(function (m) { track('pno', 'Chords', 1, 0).notes.push({ b: e.b, dur: e.dur, midi: m, vel: (e.vel || 0.65) * 110 }); }); break;
        case 'bass': track('bass', 'Bass', 2, 33).notes.push({ b: e.b, dur: e.dur, midi: e.m, vel: (e.vel || 0.75) * 120 }); break;
        case 'drum': if (DRUM_NOTES[e.name]) track('drums', 'Drums', 9, 0).notes.push({ b: e.b, dur: 0.12, midi: DRUM_NOTES[e.name], vel: clamp((e.vel || 0.6) * 127, 1, 127) }); break;
        case 'score': track('part:' + e.part, labels[e.part] || 'Voice ' + (order.length + 1), partChannel(e.part), 0).notes.push({ b: e.b, dur: e.dur, midi: e.m + (o.shift || 0), vel: 90 }); break;
        default: break;                                              // clicks and UI cues are not music
      }
    });
    return order.map(function (k) { return tracks[k]; });
  }

  var api = { buildMidi: buildMidi, fromQueue: fromQueue, PPQ: PPQ, DRUM_NOTES: DRUM_NOTES };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.FakeBookExport = api;
})(typeof window !== 'undefined' ? window : globalThis);
