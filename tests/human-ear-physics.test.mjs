import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FREQ_MIN,
  FREQ_MAX,
  DB_MIN,
  DB_MAX,
  cochlearPlace,
  computeRelayState
} from '../assets/js/lessons/human-ear-physics.mjs';

test('cochlearPlace maps high frequencies near base (0) and low frequencies near apex (1)', () => {
  const high = cochlearPlace(8000);
  const mid = cochlearPlace(1000);
  const low = cochlearPlace(200);

  assert.equal(high, 0);
  assert.equal(low, 1);
  assert.ok(high < mid && mid < low, `expected tonotopic ordering: ${high} < ${mid} < ${low}`);
});

test('cochlearPlace clamps out-of-range frequencies safely', () => {
  assert.equal(cochlearPlace(10), cochlearPlace(FREQ_MIN));
  assert.equal(cochlearPlace(25000), cochlearPlace(FREQ_MAX));
  assert.ok(Number.isFinite(cochlearPlace('not-a-number')));
});

test('air conduction amplifies via ossicles and drops sharply under middle-ear blockage', () => {
  const healthy = computeRelayState({ mode: 'air', freqHz: 1000, loudnessDb: 70, blockage: false });
  const blocked = computeRelayState({ mode: 'air', freqHz: 1000, loudnessDb: 70, blockage: true });

  assert.equal(healthy.ossicleGain, 1);
  assert.equal(healthy.boneAmp, 0);
  assert.ok(healthy.cochleaAmp > 0.7);
  assert.ok(blocked.cochleaAmp < healthy.cochleaAmp * 0.2,
    `expected >80% drop under blockage, got ${blocked.cochleaAmp} vs ${healthy.cochleaAmp}`);
  assert.ok(blocked.nerveRateHz < healthy.nerveRateHz * 0.2);
});

test('bone conduction bypasses outer/middle ear and stays strong even with blockage', () => {
  const clearBone = computeRelayState({ mode: 'bone', freqHz: 440, loudnessDb: 65, blockage: false });
  const blockedBone = computeRelayState({ mode: 'bone', freqHz: 440, loudnessDb: 65, blockage: true });

  assert.equal(clearBone.outerAmp, 0);
  assert.equal(clearBone.eardrumAmp, 0);
  assert.equal(clearBone.ossicleGain, 0);
  assert.ok(clearBone.cochleaAmp > 0.6);
  assert.equal(clearBone.cochleaAmp, blockedBone.cochleaAmp);
  assert.match(blockedBone.hearingStatus, /Beethoven/i);
});

test('loudness clamps cleanly between DB_MIN and DB_MAX', () => {
  const quiet = computeRelayState({ mode: 'air', loudnessDb: 0 });
  const minDb = computeRelayState({ mode: 'air', loudnessDb: DB_MIN });
  const loud = computeRelayState({ mode: 'air', loudnessDb: 140 });
  const maxDb = computeRelayState({ mode: 'air', loudnessDb: DB_MAX });

  assert.equal(quiet.inputAmp, minDb.inputAmp);
  assert.equal(loud.inputAmp, maxDb.inputAmp);
});
