// Arduino Studio: the simulated UNO, the block-program interpreter (run on a
// virtual clock) and the sketch writer. If g++ is installed, every generated
// sketch (Arduino Studio and the Robot Car Code studio) is also compiled
// against a stub of the Arduino API to catch C++ mistakes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const A = require('../assets/js/arduino-sim.js');

const n = (value) => ({ kind: 'num', value });
const HIGH = { kind: 'level', value: 1 }, LOW = { kind: 'level', value: 0 };
const sketch = (setup, loop, functions = []) => ({ version: 1, name: 't', setup, loop, functions });

// Virtual clock: sleep(ms) moves time; a loop() pass costs at least 1 ms.
function rig({ stopAt = 2000, onTick } = {}) {
  let t = 0, seed = 1;
  const board = new A.Board({ random: () => ((seed = (seed * 16807) % 2147483647) / 2147483647) });
  const warnings = [];
  board.onWarn = (m) => warnings.push(m);
  const io = {
    now: () => t,
    cancelled: () => t >= stopAt,
    sleep: (ms) => { t += Math.max(1, ms); if (onTick) onTick(t, board); return Promise.resolve(); }
  };
  return { board, io, warnings, time: () => t };
}

test('every starter is valid and writes a complete sketch', () => {
  for (const [key, s] of Object.entries(A.STARTERS)) {
    const cpp = A.toCpp(s.program);
    assert.match(cpp, /void setup\(\) \{[\s\S]*\}\n\nvoid loop\(\) \{/, key);
    assert.equal((cpp.match(/\{/g) || []).length, (cpp.match(/\}/g) || []).length, key + ': braces balance');
  }
  assert.match(A.toCpp(A.STARTERS.sweep.program), /#include <Servo\.h>[\s\S]*servo\.attach\(9\);/);
  assert.match(A.toCpp(A.STARTERS.sos.program), /void dot\(\);[\s\S]*void dot\(\) \{/);
  assert.match(A.toCpp(A.STARTERS.dimmer.program), /brightness = map\(knob, 0, 1023, 0, 255\);/);
  assert.match(A.toCpp(A.STARTERS.parking.program), /long readDistanceCm\(\)/);
});

test('checking catches mistakes with a readable reason', () => {
  assert.throws(() => A.checkProgram(sketch([{ type: 'pinMode', pin: 1, mode: 'OUTPUT' }], [])), /2–13/);
  assert.throws(() => A.checkProgram(sketch([], [{ type: 'call', name: 'beep' }])), /no function called “beep”/);
  assert.throws(() => A.checkProgram(sketch([], [{ type: 'set', name: 'delay', value: n(1) }])), /Arduino’s own words/);
  assert.throws(() => A.checkProgram(sketch([], [{ type: 'delay', ms: n(1.5) }])), /whole number/);
  assert.throws(() => A.checkProgram(sketch([], [{ type: 'set', name: 'x', value: { kind: 'text', value: 'hi' } }])), /print block/);
  assert.throws(() => A.checkProgram(sketch([], [{ type: 'set', name: 'dot', value: n(1) }], [{ name: 'dot', body: [] }])), /already a function/);
});

test('Blink toggles pin 13 every 500 ms', async () => {
  const samples = [];
  const r = rig({ stopAt: 2100, onTick: (t, b) => samples.push([t, b.led(13)]) });
  const res = await A.run(A.STARTERS.blink.program, r.board, r.io);
  assert.equal(res.stopped, true);
  const at = (ms) => samples.filter(([t]) => t <= ms).at(-1)?.[1];
  assert.equal(at(250), 1); assert.equal(at(750), 0); assert.equal(at(1250), 1); assert.equal(at(1750), 0);
  assert.equal(r.warnings.length, 0);
});

test('INPUT_PULLUP button: pressed reads LOW and lights the LED', async () => {
  const r = rig({ stopAt: 400, onTick: (t, b) => { b.inputs.button = t > 200; } });
  const lit = [];
  r.io.sleep = ((sleep) => (ms) => { lit.push(r.board.led(10)); return sleep(ms); })(r.io.sleep);
  await A.run(A.STARTERS.button.program, r.board, r.io);
  assert.equal(lit.slice(5, 50).every((v) => v === 0), true, 'off while up');
  assert.equal(lit.at(-1), 1, 'on while pressed');
  assert.equal(r.warnings.length, 0);
});

test('real-board gotchas become warnings: floating input, missing pinMode, Serial.begin, PWM pins', async () => {
  const r = rig({ stopAt: 50 });
  await A.run(sketch([{ type: 'pinMode', pin: 2, mode: 'INPUT' }], [
    { type: 'set', name: 'b', value: { kind: 'digitalRead', pin: 2 } },
    { type: 'digitalWrite', pin: 10, value: HIGH },
    { type: 'print', value: n(1), newline: true },
    { type: 'analogWrite', pin: 7, value: n(100) }
  ]), r.board, r.io);
  const all = r.warnings.join('\n');
  assert.match(all, /floats/);
  assert.match(all, /pinMode\(10, OUTPUT\)/);
  assert.match(all, /Serial\.begin/);
  assert.match(all, /only pins 3, 5, 6, 9, 10 and 11/);
  assert.equal(r.warnings.length, 4, 'each warning once');
  assert.ok(r.board.led(10) > 0 && r.board.led(10) < 0.1, 'pull-up glow');
  assert.equal(r.board.serial.text, '');
});

test('knob dimmer: map() and PWM brightness follow the potentiometer', async () => {
  const r = rig({ stopAt: 1000, onTick: (t, b) => { b.inputs.pot = 1023; } });
  r.board.inputs.pot = 0;
  const res = await A.run(A.STARTERS.dimmer.program, r.board, r.io);
  assert.equal(res.vars.brightness, 255);
  assert.equal(r.board.led(10), 1);
  assert.match(r.board.serial.text, /^0\n/);
  assert.match(r.board.serial.text, /255\n$/);
});

test('long arithmetic: division truncates, random never returns max, map matches Arduino', async () => {
  const r = rig({ stopAt: 5 });
  const res = await A.run(sketch([
    { type: 'set', name: 'q', value: { kind: 'op', op: '/', left: n(7), right: n(2) } },
    { type: 'set', name: 'neg', value: { kind: 'op', op: '/', left: n(-7), right: n(2) } },
    { type: 'set', name: 'm', value: { kind: 'map', value: n(512), fromLow: n(0), fromHigh: n(1023), toLow: n(0), toHigh: n(255) } },
    { type: 'set', name: 'big', value: { kind: 'op', op: '*', left: n(2147483647), right: n(2) } },
    { type: 'set', name: 'lt', value: { kind: 'op', op: '<', left: n(1), right: n(2) } }
  ], []), r.board, r.io);
  assert.deepEqual([res.vars.q, res.vars.neg, res.vars.m, res.vars.big, res.vars.lt], [3, -3, 127, -2, 1]);
  const rolls = new Set();
  const d = rig({ stopAt: 400 });
  await A.run(sketch([], [{ type: 'set', name: 'r', value: { kind: 'random', min: n(1), max: n(7) } }]), d.board,
    { ...d.io, vars: (v) => rolls.add(v.r) });
  rolls.delete(0);
  assert.deepEqual([...rolls].sort(), [1, 2, 3, 4, 5, 6]);
});

test('functions run by name; runaway recursion and division by zero are reported', async () => {
  const r = rig({ stopAt: 4000 });
  let flashes = 0, last = 0;
  r.io.sleep = ((sleep) => (ms) => { const v = r.board.led(13); if (v && !last) flashes++; last = v; return sleep(ms); })(r.io.sleep);
  await A.run(A.STARTERS.sos.program, r.board, r.io);
  assert.ok(flashes >= 9, 'one SOS is nine flashes, got ' + flashes);
  const rec = await A.run(sketch([], [{ type: 'call', name: 'again' }], [{ name: 'again', body: [{ type: 'call', name: 'again' }] }]), rig().board, rig().io);
  assert.equal(rec.ok, false); assert.match(rec.message, /calling itself/);
  const z = await A.run(sketch([{ type: 'set', name: 'x', value: { kind: 'op', op: '/', left: n(1), right: n(0) } }], []), rig().board, rig().io);
  assert.equal(z.ok, false); assert.match(z.message, /Division by zero/);
});

test('servo, buzzer and ultrasonic parts', async () => {
  const r = rig({ stopAt: 800 });
  r.board.inputs.distance = 20;
  let beeped = 0, maxAngle = 0;
  r.io.sleep = ((sleep) => (ms) => { if (r.board.playing()) beeped++; maxAngle = Math.max(maxAngle, r.board.servo.angle); return sleep(ms); })(r.io.sleep);
  await A.run(A.STARTERS.parking.program, r.board, r.io);
  assert.ok(beeped > 0);
  assert.match(r.board.serial.text, /^20\n/);
  const s = rig({ stopAt: 900 });
  await A.run(A.STARTERS.sweep.program, s.board, s.io);
  assert.equal(s.board.servo.attached, true);
});

const STUB = `
#include <math.h>
#define HIGH 1
#define LOW 0
#define OUTPUT 1
#define INPUT 0
#define INPUT_PULLUP 2
#define A0 14
#define A1 15
#define A2 16
#define A3 17
#define A4 18
#define A5 19
#define NEOPIXEL 0
template<class T, class U, class V> T constrain(T v, U a, V b){ return v<a?a:v>b?b:v; }
void pinMode(int,int); void digitalWrite(int,int); int digitalRead(int); void analogWrite(int,int); int analogRead(int);
void delay(unsigned long); void delayMicroseconds(unsigned int); unsigned long millis();
unsigned long pulseIn(int,int,unsigned long); long random(long); long random(long,long); void randomSeed(unsigned long);
long map(long,long,long,long,long); void tone(int,unsigned int,unsigned long); void noTone(int);
struct SerialT { void begin(long); void print(const char*); void print(long); void print(float); void println(const char*); void println(long); void println(float); void println(bool); } Serial;
struct Servo { void attach(int); void write(int); };
struct CRGB { CRGB(){} CRGB(int,int,int){} };
struct FastLEDT { template<int A,int B> void addLeds(CRGB*,int){} void setBrightness(int); void show(); } FastLED;
`;

function hasGpp() { try { execFileSync('g++', ['--version'], { stdio: 'ignore' }); return true; } catch { return false; } }

test('generated sketches compile (g++ against an Arduino API stub)', { skip: !hasGpp() && 'g++ not installed' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ino-'));
  const stub = path.join(dir, 'arduino-stub.h');
  fs.writeFileSync(stub, STUB);
  const Car = require('../assets/js/elegoo-program.js');
  const sketches = [
    ...Object.entries(A.STARTERS).map(([k, s]) => ['studio-' + k, A.toCpp(s.program)]),
    ...Object.entries(Car.STARTERS).map(([k, s]) => ['car-' + k, Car.toArduino(s.program)])
  ];
  try {
    for (const [name, cpp] of sketches) {
      const file = path.join(dir, name + '.cpp');
      fs.writeFileSync(file, cpp.replace(/#include <(Servo|FastLED)\.h>.*\n/g, '').replace(/FastLED\.addLeds</g, 'FastLED.template addLeds<'));
      try { execFileSync('g++', ['-std=c++11', '-fsyntax-only', '-include', stub, file], { stdio: 'pipe' }); }
      catch (e) { assert.fail(name + ' does not compile:\n' + e.stderr); }
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
