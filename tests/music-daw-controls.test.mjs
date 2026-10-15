import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Controls = require('../assets/js/music-daw-controls.js');
const Project = require('../assets/js/music-daw-project.js');

const fader = { min: 0, max: 1.2, scale: 'fader' };

test('fader taper is monotonic, round-trips, and puts unity near the top', () => {
  let last = -1;
  for (const g of [0, 0.01, 0.1, 0.316, 0.8, 1, 1.2]) {
    const pos = Controls.toPos(g, fader);
    assert.ok(pos > last, `position rises with gain at ${g}`);
    last = pos;
    assert.ok(Math.abs(Controls.fromPos(pos, fader) - g) < 1e-3, `round trip ${g}`);
  }
  assert.equal(Controls.fromPos(0, fader), 0);
  assert.equal(Controls.fromPos(1, fader), 1.2);
  assert.ok(Controls.toPos(1, fader) > 0.9, '0 dB sits in the top tenth, like a real fader');
});

test('log knobs (mid frequency) put the geometric centre at half travel', () => {
  const mid = { min: 200, max: 5000, scale: 'log', step: 0 };
  assert.ok(Math.abs(Controls.toPos(1000, mid) - 0.5) < 1e-9);
  assert.equal(Controls.fromPos(0, mid), 200);
  assert.equal(Controls.fromPos(1, mid), 5000);
});

test('linear knobs snap to their step and clamp to range', () => {
  const trim = { min: -20, max: 20, step: 0.5, scale: 'lin' };
  assert.equal(Controls.fromPos(0.5, trim), 0);
  assert.equal(Controls.fromPos(0.7312, trim) % 0.5, 0);
  assert.equal(Controls.fromPos(2, trim), 20);
  assert.equal(Controls.fromPos(-1, trim), -20);
});

test('readouts speak in decibels, hertz and pan positions', () => {
  assert.equal(Controls.format(0, { fmt: 'gain' }).text, '−∞');
  assert.equal(Controls.format(1, { fmt: 'gain' }).text, '0.0');
  assert.equal(Controls.format(3, { fmt: 'db' }).text, '+3');
  assert.equal(Controls.format(-4.5, { fmt: 'db' }).text, '−4.5');
  assert.equal(Controls.format(1000, { fmt: 'hz' }).text, '1 k');
  assert.equal(Controls.format(80, { fmt: 'hz' }).spoken, '80 hertz');
  assert.equal(Controls.format(0, { fmt: 'pan' }).spoken, 'center');
  assert.equal(Controls.format(-0.5, { fmt: 'pan' }).text, 'L50');
});

test('knob and fader markup are accessible sliders with spoken values', () => {
  const html = Controls.knob({ key: 'trim', label: 'Input trim', min: -20, max: 20, step: 0.5, def: 0, value: 6, fmt: 'db', bipolar: true });
  assert.match(html, /role="slider"/);
  assert.match(html, /aria-label="Input trim"/);
  assert.match(html, /aria-valuetext="\+6 decibels"/);
  const f = Controls.fader({ key: 'volume', label: 'Channel fader', min: 0, max: 1.2, def: 1, value: 0.8, scale: 'fader', fmt: 'gain', meter: 'x' });
  assert.match(f, /aria-orientation="vertical"/);
  assert.match(f, /data-ladder="x"/);
});

test('channel strip settings default flat, migrate on old songs, and clamp', () => {
  const fresh = Project.makeTrack('audio', 'Vox');
  assert.deepEqual(fresh.strip, { trim: 0, phase: false, hpf: false, eqOn: true, lo: 0, mid: 0, midF: 1000, hi: 0 });
  const migrated = Project.migrate({ version: 2, tracks: [{ id: 'a', kind: 'audio', name: 'Old' }] });
  assert.deepEqual(migrated.tracks[0].strip, fresh.strip, 'songs saved before the strip existed load flat');
  const wild = Project.normalizeStrip({ trim: 99, lo: -99, midF: 10, hi: 'x', phase: 1, eqOn: false });
  assert.equal(wild.trim, 20); assert.equal(wild.lo, -15); assert.equal(wild.midF, 200); assert.equal(wild.hi, 0);
  assert.equal(wild.phase, true); assert.equal(wild.eqOn, false);
  const round = Project.parse(Project.stringify({ ...Project.create(), tracks: [{ ...fresh, strip: { ...fresh.strip, hpf: true, mid: 4.5 } }] }));
  assert.equal(round.tracks[0].strip.hpf, true); assert.equal(round.tracks[0].strip.mid, 4.5);
});
