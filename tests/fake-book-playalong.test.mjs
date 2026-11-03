import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../assets/js/lessons/fake-book-pitch.js');
const X = require('../assets/js/lessons/fake-book-export.js');

const SR = 44100;
function tone(hz, { n = 2048, harmonics = [1], noise = 0, vibrato = 0, amp = 0.4 } = {}) {
  const buf = new Float32Array(n);
  let seed = 1;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = hz * (1 + vibrato * Math.sin(2 * Math.PI * 5.5 * t));
    let s = 0;
    harmonics.forEach((a, k) => { s += a * Math.sin(2 * Math.PI * f * (k + 1) * t); });
    seed = (seed * 16807) % 2147483647;
    buf[i] = amp * s / harmonics.reduce((x, y) => x + y, 0) + noise * ((seed / 2147483647) - 0.5);
  }
  return buf;
}
const cents = (a, b) => 1200 * Math.log2(a / b);

test('detects pure tones across a voice-and-band range within 5 cents', () => {
  for (const hz of [98, 130.81, 196, 261.63, 440, 659.25, 880, 1174.66]) {
    const r = P.detect(tone(hz), SR);
    assert.ok(r, hz + ' Hz not detected');
    assert.ok(Math.abs(cents(r.hz, hz)) < 5, hz + ' Hz read as ' + r.hz.toFixed(2));
    assert.ok(r.clarity > 0.95);
  }
});

test('does not jump an octave when the 2nd harmonic is the loudest (reeds, voices)', () => {
  for (const hz of [146.83, 220, 329.63, 493.88]) {
    const r = P.detect(tone(hz, { harmonics: [0.6, 1, 0.5, 0.3, 0.2] }), SR);
    assert.ok(r && Math.abs(cents(r.hz, hz)) < 10, hz + ' read as ' + (r && r.hz.toFixed(1)));
  }
});

test('copes with room noise and vibrato', () => {
  const noisy = P.detect(tone(329.63, { noise: 0.08, harmonics: [1, 0.5, 0.25] }), SR);
  assert.ok(noisy && Math.abs(cents(noisy.hz, 329.63)) < 20);
  const vib = P.detect(tone(440, { vibrato: 0.01, harmonics: [1, 0.4] }), SR);
  assert.ok(vib && Math.abs(cents(vib.hz, 440)) < 40);
});

test('silence and hiss are not a note', () => {
  assert.equal(P.detect(new Float32Array(2048), SR), null);
  let seed = 7; const hiss = new Float32Array(2048).map(() => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647 - 0.5) * 0.004; });
  assert.equal(P.detect(hiss, SR), null);
});

/* ---------------------------------------------------------------- grading */
const frames = (midi, from, to, { step = 0.03, clarity = 0.95 } = {}) => {
  const out = []; for (let t = from; t < to; t += step) out.push({ t, midi, clarity }); return out;
};

test('judgeNote: in tune is a hit; the first moments of a note are forgiven', () => {
  const note = { t0: 1, t1: 2, midi: 67 };
  const late = frames(67, 1.15, 2);                       // lands a little late
  assert.equal(P.judgeNote(note, late).grade, 'hit');
});

test('judgeNote: octave-forgiving, and reports sharp/flat in cents', () => {
  const note = { t0: 0, t1: 1, midi: 67 };
  const octaveDown = P.judgeNote(note, frames(55, 0.2, 1));
  assert.equal(octaveDown.grade, 'hit');
  const flat = P.judgeNote(note, frames(66.8, 0.2, 1));
  assert.equal(flat.grade, 'hit'); assert.ok(flat.cents <= -15 && flat.cents >= -25, 'cents ' + flat.cents);
  assert.equal(P.judgeNote(note, frames(66.4, 0.2, 1)).grade, 'near');   // 60 cents flat: right note, out of tune
});

test('judgeNote: wrong note is a miss and says what was heard; nothing is silent', () => {
  const note = { t0: 0, t1: 1, midi: 67 };
  const wrong = P.judgeNote(note, frames(69, 0.2, 1));
  assert.equal(wrong.grade, 'miss'); assert.equal(Math.round(wrong.heard), 69);
  assert.equal(P.judgeNote(note, []).grade, 'silent');
  assert.equal(P.judgeNote(note, frames(67, 0.2, 1, { clarity: 0.3 })).grade, 'silent');   // unclear = not counted
});

test('scorer: grades each note once it is over, ignores ungraded ones on finish, summarises', () => {
  const s = P.createScorer({ latency: 0 });
  s.expect({ t0: 0, t1: 0.5, midi: 60, idx: 0 });
  s.expect({ t0: 0.5, t1: 1, midi: 62, idx: 1 });
  s.expect({ t0: 1, t1: 1.5, midi: 64, idx: 2 });
  s.expect({ t0: 9, t1: 9.5, midi: 65, idx: 3 });          // never reached
  frames(60, 0, 0.5).forEach(f => s.feed(f));
  assert.equal(s.poll(0.4).length, 0);                      // note 0 not finished yet
  const first = s.poll(0.7);
  assert.deepEqual(first.map(r => [r.note.idx, r.grade]), [[0, 'hit']]);
  frames(65, 0.5, 1).forEach(f => s.feed(f));               // wrong
  frames(64.3, 1, 1.5).forEach(f => s.feed(f));             // 30 cents sharp: still a hit
  const sum = s.finish(1.8);
  assert.equal(sum.total, 3); assert.equal(sum.hits, 2); assert.equal(sum.miss, 1);
  assert.equal(s.results().length, 3);
});

test('scorer: latency shifts the window so a player hearing the click late is not penalised', () => {
  const s = P.createScorer({ latency: 0.12 });
  s.expect({ t0: 0, t1: 0.6, midi: 60, idx: 0 });
  frames(60, 0.2, 0.75).forEach(f => s.feed(f));
  assert.equal(s.poll(1)[0].grade, 'hit');
});

/* ---------------------------------------------------------------- MIDI */
function parseMidi(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o) => String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
  assert.equal(tag(0), 'MThd'); assert.equal(dv.getUint32(4), 6);
  const out = { format: dv.getUint16(8), ntrks: dv.getUint16(10), ppq: dv.getUint16(12), tracks: [] };
  let o = 14;
  for (let k = 0; k < out.ntrks; k++) {
    assert.equal(tag(o), 'MTrk');
    const len = dv.getUint32(o + 4), end = o + 8 + len; let p = o + 8, abs = 0, run = 0; const ev = [];
    const rd = () => { let v = 0, b; do { b = dv.getUint8(p++); v = (v << 7) | (b & 127); } while (b & 128); return v; };
    while (p < end) {
      abs += rd(); let st = dv.getUint8(p);
      if (st === 0xff) { const type = dv.getUint8(p + 1); p += 2; const n = rd(); const data = Array.from(new Uint8Array(bytes.buffer, bytes.byteOffset + p, n)); p += n; ev.push({ abs, meta: type, data }); }
      else { if (st & 128) { run = st; p++; } st = run; const hi = st & 0xf0, ch = st & 15; const d1 = dv.getUint8(p++); const d2 = hi === 0xc0 ? null : dv.getUint8(p++); ev.push({ abs, hi, ch, d1, d2 }); }
    }
    assert.equal(p, end, 'track length matches its events');
    out.tracks.push(ev); o = end;
  }
  return out;
}

test('buildMidi: valid type-1 file with tempo, meter, markers, notes, drums on channel 10', () => {
  const bytes = X.buildMidi({
    title: 'Test', tempo: 100, meter: [3, 4],
    markers: [{ b: 0, text: 'Cmaj7' }, { b: 3, text: 'G7' }],
    tracks: [
      { name: 'Melody', channel: 0, program: 65, notes: [{ b: 0, dur: 1, midi: 60 }, { b: 1, dur: 2, midi: 64, vel: 100 }] },
      { name: 'Drums', channel: 9, notes: [{ b: 0, dur: 0.1, midi: 36 }] },
      { name: 'Empty', channel: 3, notes: [] }
    ]
  });
  const m = parseMidi(bytes);
  assert.equal(m.format, 1); assert.equal(m.ntrks, 3); assert.equal(m.ppq, 480);   // empty track dropped
  const cond = m.tracks[0];
  assert.deepEqual(cond.find(e => e.meta === 0x51).data, [0x09, 0x27, 0xc0]);       // 600000 µs = 100 BPM
  assert.deepEqual(cond.find(e => e.meta === 0x58).data.slice(0, 2), [3, 2]);        // 3/4
  assert.deepEqual(cond.filter(e => e.meta === 0x06).map(e => e.abs), [0, 1440]);
  const mel = m.tracks[1];
  assert.ok(mel.some(e => e.hi === 0xc0 && e.d1 === 65));
  const ons = mel.filter(e => e.hi === 0x90), offs = mel.filter(e => e.hi === 0x80);
  assert.deepEqual(ons.map(e => [e.abs, e.d1]), [[0, 60], [480, 64]]);
  assert.deepEqual(offs.map(e => [e.abs, e.d1]), [[480, 60], [1440, 64]]);
  assert.ok(m.tracks[2].every(e => e.ch === 9 || e.meta != null));
  assert.ok(!m.tracks[2].some(e => e.hi === 0xc0), 'drums send no program change');
});

test('buildMidi: a repeated pitch re-strikes (off before on at the same tick) and warp bakes swing in', () => {
  const swing = (b) => { const i = Math.floor(b), f = b - i; return i + (f < 0.5 ? f * 2 * (2 / 3) : 2 / 3 + (f - 0.5) * 2 * (1 / 3)); };
  const m = parseMidi(X.buildMidi({ tempo: 120, warp: swing, tracks: [{ name: 'M', channel: 0, notes: [{ b: 0, dur: 0.5, midi: 62 }, { b: 0.5, dur: 0.5, midi: 62 }] }] }));
  const ev = m.tracks[1].filter(e => e.hi === 0x90 || e.hi === 0x80);
  assert.deepEqual(ev.map(e => [e.abs, e.hi === 0x90 ? 'on' : 'off']), [[0, 'on'], [320, 'off'], [320, 'on'], [480, 'off']]);
});

test('fromQueue: sorts the scheduler queue into tracks, skips clicks and cues, maps drums', () => {
  const q = [
    { b: 0, kind: 'click', level: 2 }, { b: 0, kind: 'ui', ui: 'bar', bar: 1 },
    { b: 0, kind: 'mel', m: 67, dur: 1, bar: 1 },
    { b: 0, kind: 'pno', ms: [48, 52, 55], dur: 3.8, vel: 0.65 },
    { b: 0, kind: 'bass', m: 36, dur: 0.9, vel: 0.75 },
    { b: 0, kind: 'drum', name: 'ride', vel: 0.5 }, { b: 1, kind: 'drum', name: 'doesNotExist', vel: 1 },
    { b: 0, kind: 'score', part: 'p1', m: 60, dur: 1 }, { b: 0, kind: 'score', part: 'p2', m: 48, dur: 1 }
  ];
  const t = X.fromQueue(q, { lead: 'flute', shift: 2, parts: [{ id: 'p1', label: 'Violin' }] });
  assert.deepEqual(t.map(x => x.name), ['Melody', 'Chords', 'Bass', 'Drums', 'Violin', 'Voice 6']);
  assert.equal(t[0].program, 73); assert.equal(t[1].notes.length, 3);
  assert.equal(t[3].notes.length, 1); assert.equal(t[3].notes[0].midi, 51);
  assert.equal(t[4].notes[0].midi, 62);                                   // key shift applied to written voices
  const channels = t.map(x => x.channel); assert.ok(!channels.slice(0, 3).includes(9)); assert.equal(new Set(channels).size, channels.length);
});
