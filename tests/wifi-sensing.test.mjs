import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as W from '../assets/js/lessons/wifi-sensing-core.mjs';

test('the 2x path change is an upper bound and gives about half a radian at 2.4 GHz', () => {
  assert.ok(Math.abs(W.phaseSwing(5) - 0.511) < 0.005);
  assert.ok(W.phaseSwing(5, W.BANDS['5'].f0) > 2 * W.phaseSwing(5) * 0.98);
  const room = W.makeRoom();
  const pos = [1.9, 0.55];
  const change = Math.abs(W.bodyPath(room, pos, 0.005).len - W.bodyPath(room, pos, 0).len);
  assert.ok(change > 0 && change < 0.01, `bistatic path change was ${change} m`);
  const nearLine = [1.9, 1.199];
  const nearChange = Math.abs(W.bodyPath(room, nearLine, 0.0005).len - W.bodyPath(room, nearLine, 0).len);
  assert.ok(nearChange < change / 100, `near-line change was ${nearChange} m`);
});

test('52 subcarriers, 312.5 kHz apart, DC skipped', () => {
  assert.equal(W.N_SUB, 52);
  assert.ok(!W.SUB_K.includes(0));
  assert.equal(W.SUB_K[0], -26);
  assert.equal(W.SUB_K[51], 26);
});

test('band-pass keeps a breath-rate tone and removes drift and fast jitter', () => {
  const fs = 10, n = 300;
  const mk = (f) => Float64Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * f * i / fs));
  const rms = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);
  assert.ok(rms(W.bandpass(mk(0.25), fs)) > 0.6);
  assert.ok(rms(W.bandpass(mk(2.0), fs).slice(60, 200)) < 0.02); // ends ring a little, as with any filtfilt
  const drift = Float64Array.from({ length: n }, (_, i) => 40 + 0.05 * i);
  assert.ok(rms(W.bandpass(drift, fs)) < 0.2);
});

test('the chain recovers breathing rate across the room and across rates', () => {
  let ok = 0, total = 0;
  for (const pos of [[1.9, 0.55], [1.2, 0.4], [0.9, 1.9], [3.0, 2.0]]) {
    for (const bpm of [10, 16, 22]) {
      const a = W.analyze(W.makeRecording({ seconds: 45, seed: 2, bpm, pos }), { window: 30 });
      total++;
      if (Math.abs(a.est.bpm - bpm) < 1.2) ok++;
    }
  }
  assert.ok(ok >= total - 1, `recovered ${ok}/${total}`);
});

test('more noise lowers the peak-to-floor ratio; a walker through the beam wrecks it', () => {
  const clean = W.analyze(W.makeRecording({ seconds: 45, seed: 3, bpm: 16, noise: 0.1 })).est.snr;
  const noisy = W.analyze(W.makeRecording({ seconds: 45, seed: 3, bpm: 16, noise: 1 })).est.snr;
  assert.ok(noisy < clean / 5);
  const s = new W.CsiSynth({ seed: 5, bpm: 16 });
  const frames = [];
  for (let i = 0; i < 700; i++) { if (i === 500) s.triggerWalker(6); frames.push(s.step()); }
  const before = W.analyze(frames.slice(0, 500)).est.snr;
  const during = W.analyze(frames.slice(0, 650)).est.snr;
  assert.ok(during < before / 4, `before ${before} during ${during}`);
});

test('sensitivity map has bright and dark stripes (blind spots) and is normalised', () => {
  const m = W.sensitivityMap(W.makeRoom(), { k: 1, nx: 80, ny: 48 });
  let lo = 0, hi = 0;
  for (const v of m.values) { if (v < 0.1) lo++; if (v > 0.7) hi++; }
  assert.ok(lo > 50 && hi > 50);
  assert.ok(Math.max(...m.values) <= 1.0001);
  // using the best of several subcarriers fills in more of the room
  const b = W.sensitivityMap(W.makeRoom(), { k: 'best', nx: 80, ny: 48 });
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  assert.ok(mean(b.values) > mean(m.values));
});

test('stream lines round-trip and bad lines are ignored', () => {
  const fr = W.makeRecording({ seconds: 2, seed: 1 });
  const back = W.parseCsv(W.framesToCsv(fr));
  assert.equal(back.length, fr.length);
  assert.deepEqual(back[3].amps, fr[3].amps);
  assert.equal(W.parseCsiLine('# CSI streaming'), null);
  assert.equal(W.parseCsiLine('C,1,2,3'), null);
  assert.equal(W.parseCsiLine('C,1,2,-40,a,b,c,d,e,f,g,h'), null);
});

test('the firmware prints the same line format the page parses', () => {
  const ino = fs.readFileSync(new URL('../assets/downloads/wifi-sensing/esp32_csi_stream.ino', import.meta.url), 'utf8');
  assert.match(ino, /"C,%lu,%lu,%d"/);
  assert.match(ino, /for \(int i = 0; i < 52; i\+\+\)/);
  assert.match(ino, /Serial\.begin\(921600\)/);
});

test('the lesson shows the recipe code exactly as shipped', () => {
  const page = fs.readFileSync(new URL('../lessons/physics/waves-and-sound/wifi-sensing.html', import.meta.url), 'utf8');
  const ino = fs.readFileSync(new URL('../assets/downloads/wifi-sensing/esp32_csi_stream.ino', import.meta.url), 'utf8');
  const m = page.match(/<pre[^>]*id="ws-firmware"[^>]*><code>([\s\S]*?)<\/code><\/pre>/);
  assert.ok(m, 'firmware <pre id="ws-firmware"> missing');
  const decoded = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  assert.equal(decoded.trim(), ino.trim());
});

test('switching the filter off lets slow drift fool the peak picker', () => {
  const fr = W.makeRecording({ seconds: 45, seed: 9, bpm: 16 });
  // a slow thermal-style drift on every subcarrier, as in a real room
  fr.forEach((f) => { const d = 6 * Math.sin(2 * Math.PI * 0.012 * f.t); f.amps = f.amps.map((a) => a + d); });
  assert.ok(Math.abs(W.analyze(fr, { filter: true }).est.bpm - 16) < 1.2);
  assert.ok(Math.abs(W.analyze(fr, { filter: false }).est.bpm - 16) > 3);
});
