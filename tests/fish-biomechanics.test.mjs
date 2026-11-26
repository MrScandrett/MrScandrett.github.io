import test from 'node:test';
import assert from 'node:assert/strict';
import {
  osmosisProfile,
  gillProfile,
  tailKinematics
} from '../assets/js/lessons/fish-biomechanics.mjs';

test('osmosisProfile matches marine, equal, and freshwater concentration gradients', () => {
  const sea = osmosisProfile('sea');
  const eq = osmosisProfile('equal');
  const fresh = osmosisProfile('fresh');

  assert.equal(sea.direction, '→');
  assert.ok(sea.outsideSaltDots > sea.insideSaltDots);
  assert.ok(sea.outwardDots > sea.inwardDots);

  assert.equal(eq.direction, '⇄');
  assert.equal(eq.outwardDots, eq.inwardDots);
  assert.equal(eq.insideSaltDots, eq.outsideSaltDots);

  assert.equal(fresh.direction, '←');
  assert.ok(fresh.insideSaltDots > fresh.outsideSaltDots);
  assert.ok(fresh.inwardDots > fresh.outwardDots);
});

test('gillProfile countercurrent maintains a diffusion gradient and beats concurrent exchange', () => {
  const counter = gillProfile('countercurrent');
  const conc = gillProfile('concurrent');

  assert.ok(counter.finalBloodO2 > conc.finalBloodO2);
  for (let i = 0; i < counter.water.length; i += 1) {
    assert.ok(counter.water[i] > counter.blood[i], `expected water > blood at station ${i}`);
  }
  assert.equal(conc.water[2], conc.blood[2]);
});

test('tailKinematics peaks in thrust at intermediate stiffness over floppy or rigid tails', () => {
  const floppy = tailKinematics(0.25, 0.15);
  const tuned = tailKinematics(0.25, 0.55);
  const rigid = tailKinematics(0.25, 1.0);

  assert.ok(tuned.thrustScore > floppy.thrustScore, `${tuned.thrustScore} > ${floppy.thrustScore}`);
  assert.ok(tuned.thrustScore > rigid.thrustScore, `${tuned.thrustScore} > ${rigid.thrustScore}`);
  assert.ok(floppy.phaseLagRad > rigid.phaseLagRad);
  assert.equal(tuned.stiffnessLabel, 'Tuned flex');
  assert.equal(floppy.stiffnessLabel, 'Too floppy');
  assert.equal(rigid.stiffnessLabel, 'Too rigid');
});
