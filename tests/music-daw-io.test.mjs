import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const DawIO = require('../assets/js/music-daw-io.js');

test('MIDI export round-trips notes, tempo, meter, names and instruments', () => {
  const song = {
    bpm: 96, timeSig: [3, 4],
    tracks: [
      { name: 'Melody', instrument: 'synth', notes: [
        { pitch: 60, start: 0, duration: 1, velocity: 0.8 },
        { pitch: 64, start: 1, duration: 0.5, velocity: 0.5 },
        { pitch: 64, start: 1.5, duration: 0.5, velocity: 0.5 },
      ] },
      { name: 'Beat', instrument: 'drums', notes: [{ pitch: 36, start: 0, duration: 0.25, velocity: 1 }] },
      { name: 'Low', instrument: 'bass', notes: [{ pitch: 36, start: 2, duration: 1, velocity: 0.7 }] },
    ],
  };
  const parsed = DawIO.parseMidi(DawIO.writeMidi(song));
  assert.equal(parsed.bpm, 96);
  assert.deepEqual(parsed.timeSig, [3, 4]);
  assert.deepEqual(parsed.tracks.map(t => [t.name, t.instrument, t.drums]), [
    ['Melody', 'synth', false], ['Beat', 'drums', true], ['Low', 'bass', false],
  ]);
  const mel = parsed.tracks[0].notes;
  assert.equal(mel.length, 3, 'repeated same-pitch notes both survive');
  assert.deepEqual(mel.map(n => [n.pitch, n.start, n.duration]), [[60, 0, 1], [64, 1, 0.5], [64, 1.5, 0.5]]);
  assert.ok(Math.abs(mel[1].velocity - 0.5) < 0.01);
  assert.equal(parsed.tracks[1].channel, 9);
});

test('type-0 files split into one track per channel', () => {
  // Hand-built type 0: ch1 note 60, ch10 note 38, using running status.
  const body = [
    0x00, 0xc0, 0x21,            // program 33 (bass) on ch 1
    0x00, 0x90, 60, 100,
    0x00, 0x99, 38, 90,
    0x60, 0x89, 38, 0,
    0x00, 0x90, 60, 0,           // note-on vel 0 = note-off
    0x00, 0xff, 0x2f, 0x00,
  ];
  const bytes = new Uint8Array([
    ...Buffer.from('MThd'), 0, 0, 0, 6, 0, 0, 0, 1, 0, 96,
    ...Buffer.from('MTrk'), 0, 0, 0, body.length, ...body,
  ]);
  const parsed = DawIO.parseMidi(bytes);
  assert.equal(parsed.tracks.length, 2);
  const bass = parsed.tracks.find(t => !t.drums);
  const drums = parsed.tracks.find(t => t.drums);
  assert.equal(bass.instrument, 'bass');
  assert.deepEqual(bass.notes.map(n => [n.pitch, n.start, n.duration]), [[60, 0, 1]]);
  assert.equal(drums.name, 'Drums');
  assert.equal(drums.notes[0].pitch, 38);
});

test('rejects files that are not MIDI', () => {
  assert.throws(() => DawIO.parseMidi(new TextEncoder().encode('hello world')), /Not a MIDI file/);
});

test('WAV encoder writes a valid 16-bit stereo header and clips samples', () => {
  const left = new Float32Array([0, 1, -1, 2]);
  const right = new Float32Array([0.5, -0.5, 0, -2]);
  const buf = DawIO.encodeWav([left, right], 44100, 16);
  const v = new DataView(buf);
  assert.equal(String.fromCharCode(...new Uint8Array(buf, 0, 4)), 'RIFF');
  assert.equal(v.getUint16(22, true), 2);
  assert.equal(v.getUint32(24, true), 44100);
  assert.equal(v.getUint32(40, true), 4 * 2 * 2);
  assert.equal(v.getInt16(44 + 4, true), 32767);   // frame 1 left = 1
  assert.equal(v.getInt16(44 + 14, true), -32768); // frame 3 right = -2, clipped
});
