import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BUILD_PROFILES,
  CHALLENGES,
  DETECTIVE_CASES,
  QUIZ_QUESTIONS,
  applyCpuStep,
  attemptPowerOn,
  attemptZonePlacement,
  createBuildState,
  createCpuCycleState,
  createDetectiveState,
  createMemoryState,
  createNetworkState,
  evaluateChallenges,
  evaluateNetworkStep,
  getAvailableNextTask,
  getProfileTasks,
  gradeQuiz,
  loadDemoCompletedBuild,
  memoryAction,
  runDiagnosticTool,
  setNetworkCondition,
  stepCpuCycle,
  stepNetwork,
  submitDiagnosis,
  submitInstallMethod,
} from '../assets/js/lessons/anatomy-of-a-computer-engine.mjs';

test('build profiles branch cleanly between integrated graphics and discrete GPU tasks', () => {
  const classroom = getProfileTasks('classroom');
  const gaming = getProfileTasks('gaming');
  const studio = getProfileTasks('studio');

  assert.equal(classroom.length, 13);
  assert.equal(gaming.length, 15);
  assert.equal(studio.length, 15);

  assert.equal(classroom.some((t) => t.id === 'gpu' || t.id === 'pcie'), false);
  assert.equal(gaming.some((t) => t.id === 'gpu' && t.zone === 'gpu'), true);
  assert.equal(gaming.some((t) => t.id === 'pcie'), true);

  assert.deepEqual(classroom.find((t) => t.id === 'display').deps, ['board', 'cpu']);
  assert.deepEqual(gaming.find((t) => t.id === 'display').deps, ['gpu']);
  assert.equal(BUILD_PROFILES.studio.ramSticks, 4);
  assert.equal(BUILD_PROFILES.classroom.ramSticks, 2);
});

test('dependency enforcement, incompatible parts trapping, and method confirmation work cleanly', () => {
  const state = createBuildState('classroom');

  // Cannot install board before safe prep
  const earlyBoard = attemptZonePlacement(state, 'board', 'board');
  assert.equal(earlyBoard.ok, false);
  assert.equal(earlyBoard.reason, 'missing-deps');
  assert.equal(state.mistakes, 1);

  // Incompatible part trapped and sets challenge flag
  const badCpu = attemptZonePlacement(state, 'wrong-cpu', 'cpu');
  assert.equal(badCpu.ok, false);
  assert.equal(badCpu.reason, 'incompatible');
  assert.equal(state.caughtIncompatible, true);
  assert.equal(state.mistakes, 2);

  const badRam = attemptZonePlacement(state, 'wrong-ram', 'ram');
  assert.equal(badRam.ok, false);
  assert.equal(badRam.reason, 'incompatible');

  // Safe prep works cleanly
  const next = getAvailableNextTask(state);
  assert.equal(next.id, 'safe');
  const safeRes = attemptZonePlacement(state, 'safe', 'bench');
  assert.equal(safeRes.ok, true);
  assert.equal(safeRes.mode, 'method');

  // Wrong method increments mistakes; right method completes step
  const wrongSubmit = submitInstallMethod(state, 'safe', false);
  assert.equal(wrongSubmit.ok, false);
  assert.equal(state.completed.has('safe'), false);

  const rightSubmit = submitInstallMethod(state, 'safe', true);
  assert.equal(rightSubmit.ok, true);
  assert.equal(state.completed.has('safe'), true);
});

test('CPU precision seating requires open arm and aligned gold corner triangles', () => {
  const state = createBuildState('classroom');
  // Complete safe + board first
  submitInstallMethod(state, 'safe', true);
  submitInstallMethod(state, 'board', true);

  const zoneCpu = attemptZonePlacement(state, 'cpu', 'cpu');
  assert.equal(zoneCpu.ok, true);
  assert.equal(zoneCpu.mode, 'cpu');

  // Pick up CPU
  assert.equal(applyCpuStep(state, 'pick').ok, true);
  assert.equal(state.cpu.stage, 'held');

  // Attempting to seat while arm closed fails and marks cleanSeat false
  const closedSeat = applyCpuStep(state, 'seat');
  assert.equal(closedSeat.ok, false);
  assert.equal(state.cpu.cleanSeat, false);

  // Reset CPU for a clean seat run
  assert.equal(applyCpuStep(state, 'reset').ok, true);
  assert.equal(state.cpu.cleanSeat, true);

  assert.equal(applyCpuStep(state, 'open').ok, true);
  assert.equal(applyCpuStep(state, 'pick').ok, true);

  // Seating while misaligned (rotation === 1) fails
  assert.equal(applyCpuStep(state, 'seat').ok, false);

  // Reset cleanly, open, pick, rotate 3 times (1 -> 2 -> 3 -> 0), seat, latch
  applyCpuStep(state, 'reset');
  applyCpuStep(state, 'open');
  applyCpuStep(state, 'pick');
  applyCpuStep(state, 'rotate');
  applyCpuStep(state, 'rotate');
  applyCpuStep(state, 'rotate');
  assert.equal(state.cpu.rotation, 0);
  assert.equal(applyCpuStep(state, 'seat').ok, true);
  const latch = applyCpuStep(state, 'latch');
  assert.equal(latch.ok, true);
  assert.equal(latch.completedCpu, true);
  assert.equal(state.completed.has('cpu'), true);
  assert.equal(state.cpu.cleanSeat, true);
});

test('POST power-on catches missing subsystems and passes on complete build or demo load', () => {
  const state = createBuildState('gaming');
  const noPower = attemptPowerOn(state);
  assert.equal(noPower.ok, false);
  assert.equal(noPower.leds.pwr, 'off');

  // Partial power without thermal paste/cooler triggers thermal interlock
  ['safe', 'psu', 'wall', 'board', 'atx', 'cpu', 'eps'].forEach((id) => state.completed.add(id));
  const thermalHalt = attemptPowerOn(state);
  assert.equal(thermalHalt.ok, false);
  assert.match(thermalHalt.title, /THERMAL/i);
  assert.equal(thermalHalt.leds.cpu, 'red');

  // Demo build completes all steps and passes POST
  const postOk = loadDemoCompletedBuild(state);
  assert.equal(postOk.ok, true);
  assert.equal(postOk.title, 'POST OK');
  assert.equal(state.booted, true);
  assert.equal(state.hasBootedAny, true);
  assert.equal(state.hasBootedGpu, true);
  assert.equal(postOk.leds.boot, 'green');
});

test('Memory lab demonstrates volatile RAM vs persistent SSD, autosave, and swap spill', () => {
  const mem = createMemoryState();
  memoryAction(mem, 'setPrediction', 'saved');
  memoryAction(mem, 'writeDraft'); // Draft 1
  memoryAction(mem, 'save');
  assert.equal(mem.savedDoc, 'My computer story, draft 1.');

  memoryAction(mem, 'writeDraft'); // Draft 2 unsaved in RAM
  assert.equal(mem.ramDoc, 'My computer story, draft 2.');
  assert.equal(mem.savedDoc, 'My computer story, draft 1.');

  memoryAction(mem, 'cutPower');
  assert.equal(mem.powerOn, false);
  assert.equal(mem.ramDoc, '');
  assert.equal(mem.savedDoc, 'My computer story, draft 1.');

  memoryAction(mem, 'powerOn');
  memoryAction(mem, 'openSaved');
  assert.equal(mem.ramDoc, 'My computer story, draft 1.');
  assert.equal(mem.ranVolatilityExperiment, true);
  assert.match(mem.predictionOutcome, /confirmed/i);

  // Autosave flushes immediately
  memoryAction(mem, 'toggleAutosave');
  memoryAction(mem, 'writeDraft');
  assert.equal(mem.savedDoc, mem.ramDoc);

  // Launching heavy apps exceeds 16 GB RAM and triggers swap
  memoryAction(mem, 'toggleApp', 'browser');
  memoryAction(mem, 'toggleApp', 'paint');
  memoryAction(mem, 'toggleApp', 'game');
  memoryAction(mem, 'toggleApp', 'video');
  assert.ok(mem.ramUsedGb > 16);
  assert.ok(mem.swapGb > 0);
  assert.equal(mem.ramPressure, 'swapping');
});

test('CPU Fetch-Decode-Execute cycle computes 5 + 3 = 8 on screen output', () => {
  const cpu = createCpuCycleState();
  for (let i = 0; i < 16; i++) {
    stepCpuCycle(cpu);
  }
  assert.equal(cpu.regA, 5);
  assert.equal(cpu.regB, 3);
  assert.equal(cpu.aluOut, 8);
  assert.equal(cpu.screenOut, '8');
  assert.equal(cpu.done, true);
});

test('Internet packet journey isolates Wi-Fi vs ISP outages, DNS cache, and HTTPS encryption', () => {
  const net = createNetworkState();

  // Normal step 3 (request) uses HTTPS
  stepNetwork(net, 3, true);
  const httpsView = evaluateNetworkStep(net);
  assert.equal(httpsView.status, 'ok');
  assert.equal(httpsView.packet.encrypted, true);

  setNetworkCondition(net, 'httpsEnabled', false);
  assert.equal(evaluateNetworkStep(net).packet.encrypted, false);

  // DNS cache hit avoids external resolver hop
  setNetworkCondition(net, 'dnsCached', true);
  stepNetwork(net, 1, true);
  assert.equal(evaluateNetworkStep(net).status, 'cached');

  // ISP down allows local Wi-Fi hop (step 2) and blocks at router on step 3
  setNetworkCondition(net, 'ispOnline', false);
  const wifiHop = stepNetwork(net, 2, true);
  assert.equal(wifiHop.status, 'ok');
  assert.equal(net.testedIspOutage, true);

  const blockedWan = stepNetwork(net, 3, true);
  assert.equal(blockedWan.status, 'blocked');
  assert.equal(blockedWan.stalledAt, 'router');
});

test('Hardware detective diagnostic tools and diagnosis scoring work across cases', () => {
  const det = createDetectiveState();
  const case0 = DETECTIVE_CASES[0];

  const clue = runDiagnosticTool(det, case0.id, case0.keyTool);
  assert.equal(clue.isKeyClue, true);

  const wrong = submitDiagnosis(det, case0.id, 1);
  assert.equal(wrong.ok, false);
  assert.equal(det.solvedIds.size, 0);

  const right = submitDiagnosis(det, case0.id, case0.correctIndex);
  assert.equal(right.ok, true);
  assert.equal(right.inspectedFirst, true);
  assert.equal(det.solvedIds.size, 1);
});

test('evaluateChallenges reaches 6/6 and gradeQuiz scores 7/7', () => {
  const build = createBuildState('classroom');
  attemptZonePlacement(build, 'wrong-cpu', 'cpu');
  loadDemoCompletedBuild(build);

  const memory = createMemoryState();
  memoryAction(memory, 'writeDraft');
  memoryAction(memory, 'save');
  memoryAction(memory, 'writeDraft');
  memoryAction(memory, 'cutPower');
  memoryAction(memory, 'powerOn');
  memoryAction(memory, 'openSaved');

  const network = createNetworkState();
  setNetworkCondition(network, 'ispOnline', false);
  stepNetwork(network, 2, true);

  const detective = createDetectiveState();
  for (let i = 0; i < 3; i++) {
    submitDiagnosis(detective, DETECTIVE_CASES[i].id, DETECTIVE_CASES[i].correctIndex);
  }

  const summary = evaluateChallenges({ build, memory, network, detective });
  assert.equal(summary.total, CHALLENGES.length);
  assert.equal(summary.count, 6);

  const perfectAnswers = QUIZ_QUESTIONS.map((q) => q.correct);
  const graded = gradeQuiz(perfectAnswers);
  assert.equal(graded.score, 7);
  assert.equal(graded.total, 7);
  assert.equal(graded.allCorrect, true);
});
