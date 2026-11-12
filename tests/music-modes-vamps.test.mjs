import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// music-modes.js is a browser IIFE; give it just enough of a DOM to load.
const sandbox = { document: { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } } };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../assets/js/lessons/music-modes.js', import.meta.url), 'utf8'), sandbox);
const { VAMPS, triadOn, MODES } = sandbox.MusicModes;

const QUALITY = (roman) => (roman.includes('°') ? 'dim' : roman.replace(/[♭♯]/g, '')[0] === roman.replace(/[♭♯]/g, '')[0].toLowerCase() ? 'min' : 'maj');

test('every mode has a vamp and every roman numeral matches the chord the mode really builds', () => {
  for (const mode of Object.keys(MODES)) {
    const v = VAMPS[mode];
    assert.ok(v, `${mode} has a vamp`);
    assert.equal(v.deg.length, v.roman.length, `${mode} labels line up`);
    v.deg.forEach((d, i) => {
      assert.equal(triadOn(mode, d).quality, QUALITY(v.roman[i]), `${mode} chord ${i + 1} (${v.roman[i]})`);
    });
  }
});

test('each vamp starts on the tonic chord and the flat/sharp labels sit on the right degree', () => {
  for (const mode of Object.keys(MODES)) assert.equal(VAMPS[mode].deg[0], 0, `${mode} starts home`);
  // ♭VII in Mixolydian is degree 7 (index 6); II in Lydian is index 1; ♭II in Phrygian is index 1.
  assert.equal(VAMPS.Mixolydian.deg[1], 6);
  assert.equal(MODES.Mixolydian.steps[6], 10);
  assert.equal(VAMPS.Lydian.deg[1], 1);
  assert.equal(MODES.Lydian.steps[1], 2);
  assert.equal(VAMPS.Phrygian.deg[1], 1);
  assert.equal(MODES.Phrygian.steps[1], 1);
});

test('triadOn gives semitones above the tonic', () => {
  assert.deepEqual(Array.from(triadOn('Dorian', 0).tones), [0, 3, 7]); // Dm
  assert.deepEqual(Array.from(triadOn('Dorian', 3).tones), [5, 9, 12]); // G
  assert.deepEqual(Array.from(triadOn('Locrian', 0).tones), [0, 3, 6]); // B°
});
