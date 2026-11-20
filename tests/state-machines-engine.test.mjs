import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CHALLENGES,
  PRESET_ORDER,
  PRESETS,
  addState,
  analyzeMachine,
  cloneMachine,
  computeNestingStates,
  createBlankMachine,
  createMooreMealyComparison,
  createRuntime,
  evaluateChallenges,
  generateCode,
  getPreset,
  parseEventSequence,
  removeState,
  removeTransition,
  setStartState,
  toggleAccepting,
  upsertTransition,
  validateMachine,
} from '../assets/js/lessons/state-machines-engine.js';

test('all 6 presets pass validation, have valid start states, and are deterministic', () => {
  assert.equal(PRESET_ORDER.length, 6);
  for (const id of PRESET_ORDER) {
    const preset = PRESETS[id];
    assert.ok(preset, `Preset ${id} exists`);
    const v = validateMachine(preset);
    assert.equal(v.valid, true, `${id} failed validation: ${v.errors.join('; ')}`);
    const analysis = analyzeMachine(preset);
    assert.equal(analysis.isDeterministic, true, `${id} should be deterministic`);
    assert.equal(analysis.unreachable.length, 0, `${id} should have no unreachable states`);
  }
});

test('Robot Vacuum traverses Clean -> Avoid -> Dock -> Charge and leaves Dock + obstacle unhandled', () => {
  const rt = createRuntime(getPreset('vacuum'));
  assert.equal(rt.getState(), 'Clean');

  const s1 = rt.step('obstacle');
  assert.equal(s1.transitioned, true);
  assert.equal(s1.to, 'Avoid');

  const s2 = rt.step('lowBattery');
  assert.equal(s2.transitioned, true);
  assert.equal(s2.to, 'Dock');

  // Unhandled edge case referenced across robotics curriculum
  const gap = rt.step('obstacle');
  assert.equal(gap.transitioned, false);
  assert.equal(rt.getState(), 'Dock');
  assert.match(gap.message, /no rule/i);

  const s3 = rt.step('docked');
  assert.equal(s3.transitioned, true);
  assert.equal(s3.to, 'Charge');
  assert.equal(rt.isAccepting(), true);
  assert.equal(rt.getStepCount(), 3);
});

test('Even-Zeros DFA accepts even zero counts and rejects odd zero counts', () => {
  const dfa = getPreset('binary-dfa');
  const acceptedInputs = ['', '111', '1010', '001100'];
  const rejectedInputs = ['0', '101', '000', '110'];

  for (const bits of acceptedInputs) {
    const rt = createRuntime(dfa);
    const seq = parseEventSequence(dfa, bits);
    const res = rt.runSequence(seq);
    assert.equal(res.finalState, 'Even0', `Expected Even0 for "${bits}"`);
    assert.equal(res.accepting, true, `Expected ACCEPT for "${bits}"`);
  }

  for (const bits of rejectedInputs) {
    const rt = createRuntime(dfa);
    const seq = parseEventSequence(dfa, bits);
    const res = rt.runSequence(seq);
    assert.equal(res.finalState, 'Odd0', `Expected Odd0 for "${bits}"`);
    assert.equal(res.accepting, false, `Expected REJECT for "${bits}"`);
  }
});

test('analyzeMachine identifies unreachable states, dead ends, cycles, and missing pairs', () => {
  const base = createBlankMachine('Test Analyzer');
  const withIsland = addState(base, { id: 'Orphan', output: 'Isolated', accepting: false });
  const a1 = analyzeMachine(withIsland);
  assert.deepEqual(a1.unreachable, ['Orphan']);
  assert.equal(a1.hasCycle, true);

  // Add a dead-end state reachable from Start with no outgoing transitions
  let withDeadEnd = addState(base, { id: 'Trap', output: 'Stuck', accepting: false });
  withDeadEnd = upsertTransition(withDeadEnd, { from: 'Start', event: 'trap', to: 'Trap' });
  const a2 = analyzeMachine(withDeadEnd);
  assert.deepEqual(a2.deadEnds, ['Trap']);
  assert.ok(a2.missingPairs.some((p) => p.state === 'Trap' && p.event === 'go'));

  // Vacuum missing Dock + obstacle
  const vacAnalysis = analyzeMachine(getPreset('vacuum'));
  assert.ok(
    vacAnalysis.missingPairs.some((p) => p.state === 'Dock' && p.event === 'obstacle')
  );
});

test('custom machine mutation helpers preserve invariants cleanly', () => {
  let m = createBlankMachine('Custom');
  m = addState(m, { id: 'Pause', output: 'Waiting', accepting: false });
  m = upsertTransition(m, { from: 'Active', event: 'pause', to: 'Pause', output: 'Halt motor' });
  m = upsertTransition(m, { from: 'Pause', event: 'resume', to: 'Active', output: 'Resume motor' });
  m = toggleAccepting(m, 'Pause');
  m = setStartState(m, 'Start');
  assert.equal(validateMachine(m).valid, true);
  assert.equal(m.states.find((s) => s.id === 'Pause').accepting, true);

  m = removeTransition(m, 'Active', 'pause');
  assert.equal(
    m.transitions.some((t) => t.from === 'Active' && t.event === 'pause'),
    false
  );

  m = removeState(m, 'Pause');
  assert.equal(m.states.some((s) => s.id === 'Pause'), false);
  assert.equal(validateMachine(m).valid, true);
});

test('generateCode produces readable JavaScript, Python, and Arduino C++ implementations', () => {
  const vac = getPreset('vacuum');
  const js = generateCode(vac, 'js');
  const py = generateCode(vac, 'python');
  const ino = generateCode(vac, 'arduino');

  assert.match(js, /let currentState = "Clean"/);
  assert.match(js, /"Avoid"/);
  assert.match(py, /state = "Clean"/);
  assert.match(py, /def handle_event/);
  assert.match(ino, /enum State \{/);
  assert.match(ino, /switch \(currentState\)/);
  assert.match(ino, /OBSTACLE/);
});

test('createMooreMealyComparison matches 3-state Moore vs 2-state Mealy on "010110"', () => {
  const cmp = createMooreMealyComparison();
  const rows = cmp.feedString('010110');
  assert.equal(rows.length, 6);

  // "010110" has "10" ending at tick 3 (0-1-0) and tick 6 (1-0)
  assert.deepEqual(
    rows.map((r) => r.mooreTo),
    ['S0', 'S1', 'S10', 'S1', 'S1', 'S10']
  );
  assert.deepEqual(
    rows.map((r) => r.mooreOut),
    ['0', '0', '1', '0', '0', '1']
  );
  assert.deepEqual(
    rows.map((r) => r.mealyTo),
    ['M0', 'M1', 'M0', 'M1', 'M1', 'M0']
  );
  assert.deepEqual(
    rows.map((r) => r.mealyOut),
    ['0', '0', '1', '0', '0', '1']
  );
});

test('computeNestingStates shows finite state growth for bounded nesting', () => {
  const d3 = computeNestingStates(3);
  assert.equal(d3.minimumStates, 5);
  assert.equal(d3.sampleBalanced, '((()))');
});

test('evaluateChallenges unlocks all 5 challenges when conditions are satisfied', () => {
  let fixedVacuum = cloneMachine(getPreset('vacuum'));
  fixedVacuum = upsertTransition(fixedVacuum, {
    from: 'Dock',
    event: 'obstacle',
    to: 'Avoid',
    output: 'Swerve & re-dock',
  });

  const res = evaluateChallenges(
    {
      predictCorrectCount: 3,
      vacuumRouteDone: true,
      dfaAcceptedSeen: true,
      dfaRejectedSeen: true,
    },
    fixedVacuum
  );
  assert.equal(res.total, CHALLENGES.length);
  assert.equal(res.count, 5);
  for (const ch of CHALLENGES) {
    assert.equal(res.completed[ch.id], true, `Challenge ${ch.id} should pass`);
  }
});
