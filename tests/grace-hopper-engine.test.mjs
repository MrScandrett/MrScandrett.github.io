import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CHALLENGES,
  COBOL_PRESETS,
  COBOL_PRESET_ORDER,
  MARK_II_CASE_ORDER,
  MARK_II_CASES,
  checkTraceSubmission,
  compileCobol,
  computeSignalPhysics,
  evaluateChallenges,
  executeCompiledProgram,
  simulateMarkIIRelays,
} from '../assets/js/lessons/grace-hopper-engine.js';

const BIN32_RE = /^[01]{8} [01]{8} [01]{8} [01]{8}$/;

test('all four COBOL presets compile cleanly into valid 32-bit binary and produce expected outputs', () => {
  assert.equal(COBOL_PRESET_ORDER.length, 4);

  const expectedOutputs = {
    payroll: ['NET PAY = 625'],
    reorder: ['REORDER PARTS', 'NEEDED = 3'],
    'supply-budget': ['APPROVAL REQUIRED', 'TOTAL = 480'],
    'navy-range': ['RANGE NM = 660'],
  };

  for (const id of COBOL_PRESET_ORDER) {
    const preset = COBOL_PRESETS[id];
    assert.ok(preset, `Missing preset ${id}`);

    const compiled = compileCobol(preset.source);
    assert.equal(compiled.ok, true, `Preset ${id} failed to compile`);
    assert.ok(compiled.symbolTable.length >= 2);
    assert.ok(compiled.instructions.length >= 4);

    for (const insn of compiled.instructions) {
      assert.match(insn.binary, BIN32_RE, `Invalid 32-bit binary on ${id} insn ${insn.index}`);
    }

    const exec = executeCompiledProgram(compiled);
    assert.equal(exec.ok, true, `Preset ${id} failed to execute: ${exec.runtimeError}`);
    assert.ok(exec.steps.length >= 4);
    assert.deepEqual(exec.output, expectedOutputs[id]);
  }
});

test('custom edited COBOL compiles and runs, while syntax errors and div-by-zero fail gracefully', () => {
  const custom = [
    'SET APPLES TO 12.',
    'SET COST TO 3.',
    'MULTIPLY APPLES BY COST GIVING BILL.',
    'IF BILL GREATER THAN 30 DISPLAY "BULK ORDER".',
    'DISPLAY "BILL" BILL.',
  ].join('\n');

  const compiled = compileCobol(custom);
  assert.equal(compiled.ok, true);
  const exec = executeCompiledProgram(compiled);
  assert.equal(exec.ok, true);
  assert.deepEqual(exec.output, ['BULK ORDER', 'BILL = 36']);

  const badSyntax = compileCobol('SET HOURS TO 40.\nFOOBAR HOURS BY 2.');
  assert.equal(badSyntax.ok, false);
  assert.equal(badSyntax.errors[0].line, 2);
  assert.ok(badSyntax.errors[0].hint.length > 5);

  const undefinedVar = compileCobol('MULTIPLY HOURS BY RATE GIVING PAY.');
  assert.equal(undefinedVar.ok, false);
  assert.match(undefinedVar.errors[0].message, /HOURS/);

  const divZero = compileCobol('SET A TO 50.\nSET B TO 0.\nDIVIDE A BY B GIVING C.\nDISPLAY C.');
  assert.equal(divZero.ok, true);
  const divExec = executeCompiledProgram(divZero);
  assert.equal(divExec.ok, false);
  assert.match(divExec.runtimeError, /Division by zero/i);
});

test('Hand-Coding Bug mode corrupts an instruction address and changes program output', () => {
  for (const id of COBOL_PRESET_ORDER) {
    const clean = executeCompiledProgram(compileCobol(COBOL_PRESETS[id].source, { injectHandCodeBug: false }));
    const buggyCompiled = compileCobol(COBOL_PRESETS[id].source, { injectHandCodeBug: true });
    assert.equal(buggyCompiled.ok, true);
    assert.equal(buggyCompiled.instructions.some((i) => i.bugCorrupted), true);

    const buggyExec = executeCompiledProgram(buggyCompiled);
    assert.equal(buggyExec.ok, true);
    assert.notDeepEqual(buggyExec.output, clean.output);
    assert.equal(buggyExec.steps.some((s) => s.bugActive), true);
  }
});

test('Signal propagation physics matches 1 ns wire (~29.98 cm / 11.8 in) and 3 GHz PCB limits', () => {
  const oneNsVacuum = computeSignalPhysics({ timeNs: 1, mediumId: 'vacuum', wireLengthCm: 30 });
  assert.ok(Math.abs(oneNsVacuum.vacuumCm - 29.98) < 0.05);
  assert.ok(Math.abs(oneNsVacuum.vacuumInches - 11.8) < 0.05);
  assert.equal(oneNsVacuum.arrivesInTick, false); // 30 cm requires 1.0007 ns in vacuum

  const oneNsWire = computeSignalPhysics({ timeNs: 1, mediumId: 'vacuum', wireLengthCm: 29.9 });
  assert.equal(oneNsWire.arrivesInTick, true);

  const oneNsCopper = computeSignalPhysics({ timeNs: 1, mediumId: 'copper', wireLengthCm: 30 });
  assert.ok(Math.abs(oneNsCopper.mediumCm - 20.086) < 0.1);
  assert.equal(oneNsCopper.arrivesInTick, false);

  const cpu3GhzLong = computeSignalPhysics({ timeNs: 1 / 3, mediumId: 'pcb', wireLengthCm: 15 });
  assert.equal(cpu3GhzLong.arrivesInTick, false);

  const cpu3GhzShort = computeSignalPhysics({ timeNs: 1 / 3, mediumId: 'pcb', wireLengthCm: 2 });
  assert.equal(cpu3GhzShort.arrivesInTick, true);
});

test('Harvard Mark II Panel F detects all 4 faults and passes 0..15 once repaired', () => {
  assert.equal(MARK_II_CASE_ORDER.length, 4);

  for (const id of MARK_II_CASE_ORDER) {
    const c = MARK_II_CASES[id];
    const broken = simulateMarkIIRelays(id, c.defaultInput, false);
    assert.equal(broken.allMatch, false, `Case ${id} should fail when unrepaired`);
    const faultyRelay = broken.relays.find((r) => r.isFaulty);
    assert.equal(faultyRelay?.id, c.faultRelay);

    for (let v = 0; v <= 15; v += 1) {
      const fixed = simulateMarkIIRelays(id, v, true);
      assert.equal(fixed.allMatch, true, `Case ${id} should match on input ${v} when repaired`);
      assert.equal(fixed.actualValue, v);
      assert.ok(fixed.logbookEntry);
    }
  }
});

test('Unspoiled trace exercises validate COBOL arithmetic and nanosecond distances', () => {
  const cobolOk = checkTraceSubmission('cobol-trace', ['12', '15', '180', '160']);
  assert.equal(cobolOk.allCorrect, true);

  const cobolPartial = checkTraceSubmission('cobol-trace', ['12', '15', '180', '200']);
  assert.equal(cobolPartial.allCorrect, false);
  assert.equal(cobolPartial.correctCount, 3);

  const nsExact = checkTraceSubmission('nanosecond-trace', ['30', '15', '3', '300']);
  assert.equal(nsExact.allCorrect, true);

  const nsPrecise = checkTraceSubmission('nanosecond-trace', ['29.98 cm', '15 cm', '3 m', '300 m']);
  assert.equal(nsPrecise.allCorrect, true);
});

test('Challenge evaluator tracks all 5 studio mastery challenges', () => {
  assert.equal(CHALLENGES.length, 5);
  assert.equal(evaluateChallenges({}).filter((c) => c.completed).length, 0);
  const done = evaluateChallenges({ 'compile-run': true, 'debug-relay-70': true });
  assert.equal(done.filter((c) => c.completed).length, 2);
});
