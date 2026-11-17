// Robot Car Pilot code studio: program checking, the live interpreter (run on the
// simulated car with a virtual clock) and the Arduino sketch writer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const E = require('../assets/js/elegoo-car.js');
const P = require('../assets/js/elegoo-program.js');

// A SimCar driven by a virtual clock. Every question costs 30 ms of radio time,
// like the real link, so sensor loops move time forward.
function simIO(car, { cancelAt = Infinity } = {}) {
  let t = 0;
  const sent = [], said = [];
  const advance = (ms) => { while (ms > 0) { const h = Math.min(20, ms); car.step(h / 1000); t += h; ms -= h; } };
  return {
    sent, said, car,
    now: () => t,
    cancelled: () => t >= cancelAt,
    send: (c) => { sent.push(c); car.handle(JSON.stringify(c)); return Promise.resolve(); },
    ask: (c) => { sent.push(c); advance(30); return Promise.resolve(E.parseReply(car.handle(JSON.stringify({ H: '1', ...c }))).value); },
    sleep: (ms) => { advance(Math.max(1, ms)); return Promise.resolve(); },
    say: (s) => said.push(s),
    random: () => 0.5
  };
}
const n = (value) => ({ kind: 'num', value });
const prog = (steps) => ({ version: 1, name: 't', steps });
const room = (walls = []) => new E.SimCar({ room: { w: 300, h: 200 }, walls });

test('every starter is a valid program and becomes a complete Arduino sketch', () => {
  for (const [key, s] of Object.entries(P.STARTERS)) {
    const p = P.checkProgram(s.program);
    assert.ok(p.steps.length, key);
    const ino = P.toArduino(p);
    assert.match(ino, /void program\(\) \{/, key);
    assert.match(ino, /void setup\(\) \{[\s\S]*program\(\);[\s\S]*stopMotors\(\);/, key);
    assert.equal((ino.match(/\{/g) || []).length, (ino.match(/\}/g) || []).length, key + ': braces balance');
    assert.equal((ino.match(/\(/g) || []).length, (ino.match(/\)/g) || []).length, key + ': parentheses balance');
  }
});

test('the sketch only includes the libraries a program uses', () => {
  const plain = P.toArduino(P.STARTERS.square.program);
  assert.doesNotMatch(plain, /FastLED|Servo\.h|distanceCm|lineRaw/);
  const scan = P.toArduino(P.STARTERS.scan.program);
  assert.match(scan, /#include <Servo\.h>/);
  assert.match(scan, /float v_leftRoom = 0;/);
  assert.match(scan, /v_leftRoom = distanceCm\(\);/);
  assert.match(P.toArduino(P.STARTERS.dance.program), /#include <FastLED\.h>/);
  assert.match(P.toArduino(P.STARTERS.line.program), /onLine\(1\)/);
});

test('checking rejects broken programs with a readable reason', () => {
  assert.throws(() => P.checkProgram({ version: 2, steps: [] }), /version 1/);
  assert.throws(() => P.checkProgram(prog([{ type: 'fly' }])), /Unknown step/);
  assert.throws(() => P.checkProgram(prog([{ type: 'wait' }])), /empty socket/);
  assert.throws(() => P.checkProgram(prog([{ type: 'set', name: '2x', value: n(1) }])), /variable name/);
  assert.throws(() => P.checkProgram(prog([{ type: 'drive', dir: 'up', speed: n(1), secs: n(1) }])), /direction/);
  let deep = [{ type: 'stop' }];
  for (let i = 0; i < 20; i++) deep = [{ type: 'forever', body: deep }];
  assert.throws(() => P.checkProgram(prog(deep)), /nested too deeply/);
});

test('a timed drive keeps re-sending its command, then stops', async () => {
  const io = simIO(room());
  const r = await P.run(prog([{ type: 'drive', dir: 'forward', speed: n(150), secs: n(2) }]), io);
  assert.equal(r.ok, true);
  const drives = io.sent.filter((c) => c.N === 3);
  assert.ok(drives.length >= 7, 'held drive re-sent about every 250 ms, got ' + drives.length);
  assert.equal(io.sent.at(-1).N, 100);
  assert.equal(io.car.left, 0);
  assert.ok(io.car.x > 40 + 50, 'car moved forward');
});

test('stop at the wall: a sensor loop stops the car short of it', async () => {
  const io = simIO(room([{ x: 200, y: 0, w: 10, h: 200 }]));
  const r = await P.run(P.STARTERS.wall.program, io);
  assert.equal(r.ok, true, r.message);
  const gap = 200 - (io.car.x + 9);
  assert.ok(gap > 10 && gap < 26, 'stopped ' + gap.toFixed(1) + ' cm from the wall');
  assert.equal(io.car.left, 0);
  assert.deepEqual(io.car.color, [255, 0, 0]);
  assert.equal(io.said.length, 1);
});

test('variables, repeat and if/else: the bouncer counts its bounces', async () => {
  const io = simIO(room(), { cancelAt: 15000 });
  const r = await P.run(P.STARTERS.bounce.program, io);
  assert.equal(r.stopped, true);
  assert.ok(r.vars.bounces >= 1, 'bounced ' + r.vars.bounces + ' times');
  assert.equal(io.said.at(-1), String(r.vars.bounces));
  assert.equal(io.sent.at(-1).N, 100, 'stopping always sends stop');
});

test('reading a line sensor re-sends the held drive (the factory firmware drops it)', async () => {
  const io = simIO(room());
  await P.run(prog([
    { type: 'go', dir: 'forward', speed: n(100) },
    { type: 'set', name: 'm', value: { kind: 'line', side: 'M' } },
    { type: 'wait', secs: n(0.1) }
  ]), io);
  const i = io.sent.findIndex((c) => c.N === 22);
  assert.ok(i > 0);
  assert.equal(io.sent[i + 1].N, 3, 'drive sent again straight after the line question');
});

test('forever loops end at the time limit, and arithmetic errors are reported', async () => {
  const r = await P.run(prog([{ type: 'forever', body: [{ type: 'change', name: 'x', by: n(1) }] }]), simIO(room()), { maxSecs: 2 });
  assert.equal(r.ok, false);
  assert.match(r.message, /Time limit/);
  const z = await P.run(prog([{ type: 'set', name: 'x', value: { kind: 'op', op: '/', left: n(1), right: n(0) } }]), simIO(room()));
  assert.equal(z.ok, false);
  assert.match(z.message, /Division by zero/);
});

test('and / or skip the right side, so no extra sensor questions', async () => {
  const io = simIO(room());
  await P.run(prog([{ type: 'set', name: 'x', value: { kind: 'op', op: 'and', left: { kind: 'bool', value: false }, right: { kind: 'distance' } } }]), io);
  assert.equal(io.sent.filter((c) => c.N === 21).length, 0);
});

test('Mission tab steps convert to a program', () => {
  const p = P.fromSteps([['forward', 1.2], ['right', 0.5], ['light', 0], ['wait', 1]], 180);
  assert.deepEqual(p.steps.map((s) => s.type), ['drive', 'drive', 'light', 'wait']);
  assert.equal(p.steps[0].speed.value, 180);
  assert.equal(p.steps[1].dir, 'right');
});
