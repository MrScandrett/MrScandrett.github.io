/* Arduino Studio core: a simulated Arduino UNO wired to the class kit, an
   interpreter for block programs, and a writer that turns the same program
   into a real Arduino sketch (.ino). No DOM: the studio UI is
   assets/js/lessons/arduino-studio.js; tests are tests/arduino-sim.test.mjs.

   A program is plain JSON:
     { version: 1, name, setup: [stmt…], loop: [stmt…], functions: [{ name, body: [stmt…] }] }

   Statements  pinMode {pin, mode}   digitalWrite {pin, value}   analogWrite {pin, value}
               delay {ms}   tone {pin, freq, ms}   noTone {pin}   servo {angle}
               serialBegin {baud}   print {value, newline}   call {name}
               if {cond, then, else}   repeat {count, body}   while|until {cond, body}
               set {name, value}   change {name, by}
   Values      num {value}   text {value} (print only)   level {value: 1|0} (HIGH/LOW)
               digitalRead {pin}   analogRead {pin: "A0".."A5"}   millis   distance
               map {value, fromLow, fromHigh, toLow, toHigh}   random {min, max}
               var {name}   op {op, left, right}   not {value}

   Numbers behave like Arduino `long`s: whole numbers, division drops the
   remainder, comparisons give 1 or 0, random(min, max) never returns max.

   Works as a browser global (window.ArduinoSim) and as a CommonJS module. */
(function (global) {
  'use strict';

  var LIMITS = { maxBlocks: 600, maxDepth: 14, callDepth: 40, maxDelayMs: 60000, serialChars: 6000 };

  // The class kit: what the simulator has wired to each pin.
  var KIT = {
    builtin: 13, red: 10, green: 6, button: 2, buzzer: 8, servo: 9, trig: 12, echo: 11, pot: 'A0', light: 'A1'
  };
  var WIRING = [
    ['13', 'Built-in LED “L” (on the board)'],
    ['10', 'Red LED + 220 Ω resistor to GND (PWM pin)'],
    ['6', 'Green LED + 220 Ω resistor to GND (PWM pin)'],
    ['2', 'Push button to GND (use INPUT_PULLUP: pressed reads LOW)'],
    ['8', 'Piezo buzzer'],
    ['9', 'Servo signal (Servo library)'],
    ['12 / 11', 'Ultrasonic sensor trig / echo'],
    ['A0', 'Potentiometer (knob), 0–1023'],
    ['A1', 'Light sensor (photoresistor divider), brighter = higher']
  ];
  var DIGITAL = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  var ANALOG = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
  var PWM = [3, 5, 6, 9, 10, 11];
  var MODES = ['OUTPUT', 'INPUT', 'INPUT_PULLUP'];
  var BAUDS = [9600, 115200];
  var OPS = ['+', '-', '*', '/', '%', '<', '<=', '>', '>=', '==', '!=', 'and', 'or'];
  var NAME = /^[A-Za-z_][A-Za-z0-9_]{0,23}$/;
  var RESERVED = ('setup loop main int long float double char bool boolean byte word void if else while for do return break continue switch case ' +
    'default true false const static new delete class struct auto HIGH LOW INPUT OUTPUT INPUT_PULLUP pinMode digitalWrite digitalRead ' +
    'analogWrite analogRead delay millis micros tone noTone map random constrain min max abs Serial Servo servo readDistanceCm ' +
    'String and or not xor A0 A1 A2 A3 A4 A5').split(' ');

  function fail(msg) { throw new Error(msg); }

  // ---- Checking ---------------------------------------------------------

  function checkProgram(p) {
    if (!p || typeof p !== 'object') fail('A program must be an object.');
    if (p.version !== 1) fail('This file is not a version 1 Arduino Studio program.');
    var count = { n: 0 }, names = {};
    var fns = (p.functions || []).map(function (f) {
      if (!f || !NAME.test(String(f.name)) || RESERVED.indexOf(f.name) >= 0) fail('“' + (f && f.name) + '” can’t be a function name: use letters, digits and _, start with a letter, and avoid Arduino’s own words.');
      if (names[f.name]) fail('Two functions are both called “' + f.name + '”.');
      names[f.name] = true;
      var o = { name: f.name, body: list(f.body || [], 0, count) };
      if (f.id != null) o.id = String(f.id).slice(0, 40);
      return o;
    });
    var out = {
      version: 1, name: typeof p.name === 'string' ? p.name.slice(0, 60) : 'My sketch',
      setup: list(p.setup || [], 0, count), loop: list(p.loop || [], 0, count), functions: fns
    };
    walk(out, function (s) {
      if (s.type === 'call' && !names[s.name]) fail('There is no function called “' + s.name + '”. Make it with a “define function” block.');
      if ((s.type === 'set' || s.type === 'change') && names[s.name]) fail('“' + s.name + '” is already a function name. Give the variable a different name.');
    });
    return out;
  }

  function walk(p, fn) {
    var visit = function (steps) { steps.forEach(function (s) { fn(s); ['then', 'else', 'body'].forEach(function (k) { if (s[k]) visit(s[k]); }); }); };
    visit(p.setup); visit(p.loop); p.functions.forEach(function (f) { visit(f.body); });
  }

  function list(steps, depth, count) {
    if (!Array.isArray(steps)) fail('Expected a list of blocks.');
    if (depth > LIMITS.maxDepth) fail('Blocks are nested too deeply (more than ' + LIMITS.maxDepth + ').');
    return steps.map(function (s) { return statement(s, depth, count); });
  }

  function varName(n) {
    if (!NAME.test(String(n))) fail('“' + n + '” is not a usable variable name: letters, digits and _, starting with a letter.');
    if (RESERVED.indexOf(n) >= 0) fail('“' + n + '” is one of Arduino’s own words. Pick another variable name.');
    return n;
  }

  function statement(s, depth, count) {
    if (!s || typeof s !== 'object') fail('Every block must be an object.');
    if (++count.n > LIMITS.maxBlocks) fail('The sketch is too big (more than ' + LIMITS.maxBlocks + ' blocks).');
    var o = { type: s.type };
    if (s.id != null) o.id = String(s.id).slice(0, 40);
    var v = function (k) { o[k] = value(s[k], depth, count); };
    var body = function (k) { o[k] = list(s[k] || [], depth + 1, count); };
    var dpin = function () { if (DIGITAL.indexOf(Number(s.pin)) < 0) fail('Pin ' + s.pin + ' is not a digital pin you can use (2–13).'); o.pin = Number(s.pin); };
    switch (s.type) {
      case 'pinMode': dpin(); if (MODES.indexOf(s.mode) < 0) fail('Unknown pin mode “' + s.mode + '”.'); o.mode = s.mode; break;
      case 'digitalWrite': case 'analogWrite': dpin(); v('value'); break;
      case 'delay': v('ms'); break;
      case 'tone': dpin(); v('freq'); v('ms'); break;
      case 'noTone': dpin(); break;
      case 'servo': v('angle'); break;
      case 'serialBegin': if (BAUDS.indexOf(Number(s.baud)) < 0) fail('Use 9600 or 115200 baud.'); o.baud = Number(s.baud); break;
      case 'print':
        o.value = s.value && s.value.kind === 'text' ? text(s.value) : value(s.value, depth, count);
        o.newline = s.newline !== false;
        break;
      case 'call': if (!NAME.test(String(s.name))) fail('“' + s.name + '” is not a function name.'); o.name = s.name; break;
      case 'if': v('cond'); body('then'); body('else'); break;
      case 'repeat': v('count'); body('body'); break;
      case 'while': case 'until': v('cond'); body('body'); break;
      case 'set': o.name = varName(s.name); v('value'); break;
      case 'change': o.name = varName(s.name); v('by'); break;
      default: fail('Unknown block “' + s.type + '”.');
    }
    return o;
  }

  function text(e) {
    var t = String(e.value == null ? '' : e.value);
    if (t.length > 80) fail('Text in a print block can be at most 80 characters.');
    return { kind: 'text', value: t };
  }

  function value(e, depth, count) {
    if (!e || typeof e !== 'object') fail('Empty socket: plug a number, reading or variable into every gap.');
    if (depth > LIMITS.maxDepth * 2) fail('A calculation is nested too deeply.');
    if (++count.n > LIMITS.maxBlocks) fail('The sketch is too big (more than ' + LIMITS.maxBlocks + ' blocks).');
    var sub = function (x) { return value(x, depth + 1, count); };
    switch (e.kind) {
      case 'num':
        if (typeof e.value !== 'number' || !Number.isInteger(e.value) || Math.abs(e.value) > 2147483647) fail('“' + e.value + '” is not a whole number an Arduino long can hold.');
        return { kind: 'num', value: e.value };
      case 'text': fail('Text can only go straight into a print block.'); break;
      case 'level': return { kind: 'level', value: e.value ? 1 : 0 };
      case 'millis': case 'distance': return { kind: e.kind };
      case 'digitalRead': if (DIGITAL.indexOf(Number(e.pin)) < 0) fail('digitalRead needs a pin from 2 to 13.'); return { kind: 'digitalRead', pin: Number(e.pin) };
      case 'analogRead': if (ANALOG.indexOf(e.pin) < 0) fail('analogRead needs A0–A5.'); return { kind: 'analogRead', pin: e.pin };
      case 'map': return { kind: 'map', value: sub(e.value), fromLow: sub(e.fromLow), fromHigh: sub(e.fromHigh), toLow: sub(e.toLow), toHigh: sub(e.toHigh) };
      case 'random': return { kind: 'random', min: sub(e.min), max: sub(e.max) };
      case 'var': return { kind: 'var', name: varName(e.name) };
      case 'op': if (OPS.indexOf(e.op) < 0) fail('Unknown operator “' + e.op + '”.'); return { kind: 'op', op: e.op, left: sub(e.left), right: sub(e.right) };
      case 'not': return { kind: 'not', value: sub(e.value) };
    }
    fail('Unknown value “' + e.kind + '”.');
  }

  // ---- The simulated board ----------------------------------------------
  // Pin model: mode OUTPUT drives level (0/1) or a PWM duty (0–255); INPUT
  // floats unless something drives it; INPUT_PULLUP reads 1 until pulled to GND.

  function Board(opts) {
    opts = opts || {};
    this.rand = opts.random || Math.random;
    this.clock = opts.clock || function () { return Date.now(); };
    this.onWarn = null;
    this.inputs = { button: false, pot: 512, light: 600, distance: 60 };
    this.reset();
  }
  Board.prototype.reset = function () {
    this.pins = {};
    var self = this;
    DIGITAL.concat(ANALOG).forEach(function (p) { self.pins[p] = { mode: 'INPUT', level: 0, pwm: null }; });
    this.servo = { attached: false, angle: 90 };
    this.sound = { pin: null, freq: 0, until: 0 };
    this.serial = { begun: false, baud: 0, text: '' };
    this.warned = {};
    this.t0 = this.clock();
  };
  Board.prototype.warn = function (key, msg) {
    if (this.warned[key]) return;
    this.warned[key] = msg;
    if (this.onWarn) this.onWarn(msg);
  };
  Board.prototype.millis = function () { return Math.floor(this.clock() - this.t0); };
  Board.prototype.pinMode = function (pin, mode) { var p = this.pins[pin]; p.mode = mode; if (mode !== 'OUTPUT') p.pwm = null; };
  Board.prototype.digitalWrite = function (pin, v) {
    var p = this.pins[pin];
    p.pwm = null;
    if (p.mode === 'OUTPUT') { p.level = v ? 1 : 0; return; }
    // On a real UNO, writing HIGH to an input pin turns on its pull-up resistor: an LED glows very faintly.
    p.mode = v ? 'INPUT_PULLUP' : 'INPUT';
    if (pin !== KIT.button) this.warn('mode' + pin, 'Pin ' + pin + ' was written to without pinMode(' + pin + ', OUTPUT). On a real board an LED there only glows faintly. Add a pinMode block in setup.');
  };
  Board.prototype.analogWrite = function (pin, v) {
    var p = this.pins[pin];
    v = Math.max(0, Math.min(255, v | 0));
    p.mode = 'OUTPUT'; // analogWrite sets the pin to OUTPUT by itself
    if (PWM.indexOf(pin) >= 0 && v > 0 && v < 255) { p.pwm = v; p.level = 1; return; }
    p.pwm = null;
    p.level = v >= 128 ? 1 : 0;
    if (PWM.indexOf(pin) < 0 && v > 0 && v < 255) this.warn('pwm' + pin, 'Pin ' + pin + ' can’t dim: only pins 3, 5, 6, 9, 10 and 11 have PWM (the ~ on the board). analogWrite there is just on (128 or more) or off.');
  };
  Board.prototype.digitalRead = function (pin) {
    var p = this.pins[pin];
    if (p.mode === 'OUTPUT') return p.level;
    if (pin === KIT.button) {
      if (this.inputs.button) return 0;           // pressed: pulled to GND
      if (p.mode === 'INPUT_PULLUP') return 1;
    } else if (p.mode === 'INPUT_PULLUP') return 1;
    this.warn('float' + pin, pin === KIT.button
      ? 'Pin 2 is set to INPUT, so it “floats” while the button is up and reads random HIGHs and LOWs. Use INPUT_PULLUP: up reads HIGH, pressed reads LOW.'
      : 'Nothing in the kit is wired to pin ' + pin + ', so digitalRead gives random noise.');
    return this.rand() < 0.5 ? 0 : 1;
  };
  Board.prototype.analogRead = function (pin) {
    var noise = Math.round((this.rand() - 0.5) * 4);
    if (pin === KIT.pot) return clamp(this.inputs.pot + noise, 0, 1023);
    if (pin === KIT.light) return clamp(this.inputs.light + noise, 0, 1023);
    this.warn('afloat' + pin, 'Nothing in the kit is wired to ' + pin + ', so analogRead gives a drifting, meaningless number.');
    return 300 + Math.floor(this.rand() * 400);
  };
  Board.prototype.tone = function (pin, freq, ms) {
    if (pin !== KIT.buzzer) this.warn('tone' + pin, 'The buzzer is on pin 8; nothing is wired to pin ' + pin + ' to make a sound.');
    this.sound = { pin: pin, freq: Math.max(31, Math.min(20000, freq | 0)), until: ms > 0 ? this.clock() + ms : Infinity };
  };
  Board.prototype.noTone = function () { this.sound = { pin: null, freq: 0, until: 0 }; };
  Board.prototype.playing = function () { return this.sound.pin === KIT.buzzer && this.clock() < this.sound.until ? this.sound.freq : 0; };
  Board.prototype.servoWrite = function (angle) { this.servo.attached = true; this.servo.angle = clamp(angle | 0, 0, 180); };
  Board.prototype.print = function (text) {
    if (!this.serial.begun) { this.warn('serial', 'Serial.print ran before Serial.begin, so nothing appears on a real board. Put “Serial.begin(9600)” in setup.'); return; }
    var s = this.serial.text + text;
    this.serial.text = s.length > LIMITS.serialChars ? s.slice(s.length - LIMITS.serialChars) : s;
  };
  // 0–1 brightness of an LED on this pin.
  Board.prototype.led = function (pin) {
    var p = this.pins[pin];
    if (p.mode === 'OUTPUT') return p.pwm != null ? p.pwm / 255 : p.level;
    return p.mode === 'INPUT_PULLUP' ? 0.06 : 0;
  };
  Board.prototype.distanceCm = function () { return clamp(Math.round(this.inputs.distance), 2, 400); };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---- Running ----------------------------------------------------------
  // io = { now() -> ms, sleep(ms) -> Promise, cancelled() -> bool, step(id)?, vars(snapshot)? }

  function Cancelled() { this.message = 'Stopped.'; }

  function run(program, board, io) {
    var p = checkProgram(program);
    var ctx = { board: board, io: io, vars: {}, funcs: {}, depth: 0 };
    p.functions.forEach(function (f) { ctx.funcs[f.name] = f.body; });
    walk(p, function (s) { if (s.type === 'set' || s.type === 'change') ctx.vars[s.name] = 0; });
    board.clock = io.now;
    board.reset();
    watch(ctx);
    var loops = 0;
    function again() {
      check(ctx);
      return block(ctx, p.loop).then(function () { loops++; return io.sleep(0); }).then(again);
    }
    return block(ctx, p.setup).then(again).then(null, function (err) {
      board.noTone();
      if (err instanceof Cancelled) return { ok: true, stopped: true, message: 'Stopped.', loops: loops, vars: copy(ctx.vars) };
      return { ok: false, message: err && err.message ? err.message : String(err), loops: loops, vars: copy(ctx.vars) };
    });
  }

  function copy(o) { var c = {}; for (var k in o) c[k] = o[k]; return c; }
  function watch(ctx) { if (ctx.io.vars) ctx.io.vars(copy(ctx.vars)); }
  function check(ctx) { if (ctx.io.cancelled && ctx.io.cancelled()) throw new Cancelled(); }

  function block(ctx, steps) {
    var i = 0;
    function next() {
      check(ctx);
      if (i >= steps.length) return Promise.resolve();
      var s = steps[i++];
      if (s.id && ctx.io.step) ctx.io.step(s.id);
      return exec(ctx, s).then(next);
    }
    return next();
  }

  function pause(ctx, ms) {
    var end = ctx.io.now() + ms;
    function loop() {
      check(ctx);
      var left = end - ctx.io.now();
      if (left <= 0) return Promise.resolve();
      return ctx.io.sleep(Math.min(left, 100)).then(loop);
    }
    return loop();
  }

  function exec(ctx, s) {
    var b = ctx.board, ev = function (e) { return evaluate(ctx, e); };
    switch (s.type) {
      case 'pinMode': b.pinMode(s.pin, s.mode); return Promise.resolve();
      case 'digitalWrite': return ev(s.value).then(function (v) { b.digitalWrite(s.pin, v); });
      case 'analogWrite': return ev(s.value).then(function (v) { b.analogWrite(s.pin, v); });
      case 'delay': return ev(s.ms).then(function (ms) { return pause(ctx, clamp(ms, 0, LIMITS.maxDelayMs)); });
      case 'tone': return ev(s.freq).then(function (f) { return ev(s.ms).then(function (ms) { b.tone(s.pin, f, ms); }); });
      case 'noTone': b.noTone(s.pin); return Promise.resolve();
      case 'servo': return ev(s.angle).then(function (a) { b.servoWrite(a); });
      case 'serialBegin': b.serial.begun = true; b.serial.baud = s.baud; return Promise.resolve();
      case 'print':
        return (s.value.kind === 'text' ? Promise.resolve(s.value.value) : ev(s.value)).then(function (v) { b.print(String(v) + (s.newline ? '\n' : '')); });
      case 'call':
        if (ctx.depth >= LIMITS.callDepth) return Promise.reject(new Error('Function “' + s.name + '” keeps calling itself: the board ran out of memory.'));
        ctx.depth++;
        return block(ctx, ctx.funcs[s.name]).then(function () { ctx.depth--; }, function (e) { ctx.depth--; throw e; });
      case 'if': return ev(s.cond).then(function (c) { return block(ctx, c ? s.then : s['else']); });
      case 'repeat':
        return ev(s.count).then(function (n) {
          var k = 0;
          function again() { if (k++ >= n) return Promise.resolve(); return block(ctx, s.body).then(function () { return ctx.io.sleep(0); }).then(again); }
          return again();
        });
      case 'while': case 'until': {
        var turn = function () {
          return ev(s.cond).then(function (c) {
            if (s.type === 'while' ? !c : c) return null;
            return block(ctx, s.body).then(function () { return ctx.io.sleep(0); }).then(turn);
          });
        };
        return turn();
      }
      case 'set': return ev(s.value).then(function (v) { ctx.vars[s.name] = v; watch(ctx); });
      case 'change': return ev(s.by).then(function (v) { ctx.vars[s.name] = long(ctx.vars[s.name] + v); watch(ctx); });
    }
    return Promise.reject(new Error('Unknown block ' + s.type));
  }

  function long(v) { return v | 0; }  // wrap like a 32-bit Arduino long

  function evaluate(ctx, e) {
    var b = ctx.board;
    switch (e.kind) {
      case 'num': case 'level': return Promise.resolve(e.value);
      case 'millis': return Promise.resolve(b.millis());
      case 'digitalRead': return Promise.resolve(b.digitalRead(e.pin));
      case 'analogRead': return Promise.resolve(b.analogRead(e.pin));
      case 'distance': return Promise.resolve(b.distanceCm());
      case 'var': return Promise.resolve(Object.prototype.hasOwnProperty.call(ctx.vars, e.name) ? ctx.vars[e.name] : 0);
      case 'not': return evaluate(ctx, e.value).then(function (v) { return v ? 0 : 1; });
      case 'random':
        return evaluate(ctx, e.min).then(function (lo) {
          return evaluate(ctx, e.max).then(function (hi) { return hi <= lo ? lo : lo + Math.floor(b.rand() * (hi - lo)); });
        });
      case 'map': {
        var keys = ['value', 'fromLow', 'fromHigh', 'toLow', 'toHigh'], vals = [];
        var next = function (i) {
          if (i === keys.length) {
            var x = vals[0], inL = vals[1], inH = vals[2], outL = vals[3], outH = vals[4];
            if (inH === inL) throw new Error('map() with the same “from” low and high divides by zero.');
            return long(Math.trunc((x - inL) * (outH - outL) / (inH - inL)) + outL);
          }
          return evaluate(ctx, e[keys[i]]).then(function (v) { vals.push(v); return next(i + 1); });
        };
        return next(0);
      }
      case 'op':
        return evaluate(ctx, e.left).then(function (a) {
          if (e.op === 'and' && !a) return 0;
          if (e.op === 'or' && a) return 1;
          return evaluate(ctx, e.right).then(function (c) { return operate(e.op, a, c); });
        });
    }
    return Promise.reject(new Error('Unknown value ' + e.kind));
  }

  function operate(op, a, b) {
    switch (op) {
      case '+': return long(a + b);
      case '-': return long(a - b);
      case '*': return Math.imul(a, b);
      case '/': if (b === 0) throw new Error('Division by zero. On a real board the answer would be garbage.'); return long(Math.trunc(a / b));
      case '%': if (b === 0) throw new Error('Remainder of division by zero.'); return long(a % b);
      case '<': return a < b ? 1 : 0;
      case '<=': return a <= b ? 1 : 0;
      case '>': return a > b ? 1 : 0;
      case '>=': return a >= b ? 1 : 0;
      case '==': return a === b ? 1 : 0;
      case '!=': return a !== b ? 1 : 0;
      case 'and': case 'or': return b ? 1 : 0;
    }
  }

  // ---- Arduino sketch -----------------------------------------------------

  function toCpp(program) {
    var p = checkProgram(program);
    var used = { servo: false, distance: false, vars: [] };
    var seen = {};
    walk(p, function (s) {
      if (s.type === 'servo') used.servo = true;
      if ((s.type === 'set' || s.type === 'change') && !seen[s.name]) { seen[s.name] = 1; used.vars.push(s.name); }
      eachValue(s, function (e) {
        if (e.kind === 'distance') used.distance = true;
        if (e.kind === 'var' && !seen[e.name]) { seen[e.name] = 1; used.vars.push(e.name); }
      });
    });
    var L = [], w = function (s) { L.push(s); };
    w('// ' + (p.name || 'My sketch') + ': made in the Arduino Studio.');
    w('// Class kit wiring:');
    WIRING.forEach(function (r) { w('//   pin ' + r[0] + ': ' + r[1]); });
    w('');
    if (used.servo) { w('#include <Servo.h>   // the Servo library: tested code for driving a servo'); w(''); w('Servo servo;         // signal on pin 9'); }
    used.vars.forEach(function (n) { w('long ' + n + ' = 0;'); });
    if (used.servo || used.vars.length) w('');
    p.functions.forEach(function (f) { w('void ' + f.name + '();'); });
    if (p.functions.length) w('');
    if (used.distance) {
      w('// Ultrasonic sensor: send a 10 µs ping, time the echo. Sound travels about 1 cm in 29 µs, there and back.');
      w('long readDistanceCm() {');
      w('  digitalWrite(12, LOW); delayMicroseconds(2);');
      w('  digitalWrite(12, HIGH); delayMicroseconds(10); digitalWrite(12, LOW);');
      w('  long us = pulseIn(11, HIGH, 25000UL);');
      w('  return us == 0 ? 400 : us / 58;   // no echo: nothing in range');
      w('}');
      w('');
    }
    w('void setup() {');
    if (used.servo) w('  servo.attach(9);');
    if (used.distance) { w('  pinMode(12, OUTPUT);   // ultrasonic trig'); w('  pinMode(11, INPUT);    // ultrasonic echo'); }
    stmts(p.setup, '  ', w);
    w('}');
    w('');
    w('void loop() {');
    stmts(p.loop, '  ', w);
    w('}');
    p.functions.forEach(function (f) {
      w('');
      w('void ' + f.name + '() {');
      stmts(f.body, '  ', w);
      w('}');
    });
    return L.join('\n') + '\n';
  }

  function eachValue(s, fn) {
    var visit = function (e) {
      if (!e || typeof e !== 'object' || !e.kind) return;
      fn(e);
      ['value', 'left', 'right', 'min', 'max', 'fromLow', 'fromHigh', 'toLow', 'toHigh'].forEach(function (k) { visit(e[k]); });
    };
    ['value', 'ms', 'freq', 'angle', 'cond', 'count', 'by'].forEach(function (k) { visit(s[k]); });
  }

  var counter = 0;
  function stmts(steps, ind, w) {
    steps.forEach(function (s) {
      var x = expr;
      switch (s.type) {
        case 'pinMode': w(ind + 'pinMode(' + s.pin + ', ' + s.mode + ');'); break;
        case 'digitalWrite': w(ind + 'digitalWrite(' + s.pin + ', ' + x(s.value) + ');'); break;
        case 'analogWrite': w(ind + 'analogWrite(' + s.pin + ', ' + x(s.value) + ');'); break;
        case 'delay': w(ind + 'delay(' + x(s.ms) + ');'); break;
        case 'tone': w(ind + 'tone(' + s.pin + ', ' + x(s.freq) + ', ' + x(s.ms) + ');'); break;
        case 'noTone': w(ind + 'noTone(' + s.pin + ');'); break;
        case 'servo': w(ind + 'servo.write(' + x(s.angle) + ');'); break;
        case 'serialBegin': w(ind + 'Serial.begin(' + s.baud + ');'); break;
        case 'print': w(ind + 'Serial.' + (s.newline ? 'println' : 'print') + '(' + x(s.value) + ');'); break;
        case 'call': w(ind + s.name + '();'); break;
        case 'set': w(ind + s.name + ' = ' + x(s.value) + ';'); break;
        case 'change': w(ind + s.name + ' = ' + s.name + ' + ' + x(s.by) + ';'); break;
        case 'if':
          w(ind + 'if (' + bare(x(s.cond)) + ') {');
          stmts(s.then, ind + '  ', w);
          if (s['else'].length) { w(ind + '} else {'); stmts(s['else'], ind + '  ', w); }
          w(ind + '}');
          break;
        case 'repeat': {
          var i = 'i' + (++counter % 1000);
          w(ind + 'for (long ' + i + ' = 0; ' + i + ' < ' + x(s.count) + '; ' + i + '++) {');
          stmts(s.body, ind + '  ', w);
          w(ind + '}');
          break;
        }
        case 'while': case 'until':
          w(ind + 'while (' + (s.type === 'while' ? bare(x(s.cond)) : '!' + paren(x(s.cond))) + ') {');
          stmts(s.body, ind + '  ', w);
          w(ind + '}');
          break;
      }
    });
  }
  function paren(c) { return /^\(.*\)$/.test(c) ? c : '(' + c + ')'; }
  function bare(c) { return /^\((.*)\)$/.test(c) && balanced(c.slice(1, -1)) ? c.slice(1, -1) : c; }
  function balanced(c) { var d = 0; for (var i = 0; i < c.length; i++) { if (c[i] === '(') d++; else if (c[i] === ')' && --d < 0) return false; } return d === 0; }

  function expr(e) {
    switch (e.kind) {
      case 'num': return String(e.value);
      case 'text': return JSON.stringify(e.value).replace(/\\u([0-9a-f]{4})/gi, function (m, h) { return '\\x' + h.slice(2); });
      case 'level': return e.value ? 'HIGH' : 'LOW';
      case 'millis': return 'millis()';
      case 'distance': return 'readDistanceCm()';
      case 'digitalRead': return 'digitalRead(' + e.pin + ')';
      case 'analogRead': return 'analogRead(' + e.pin + ')';
      case 'var': return e.name;
      case 'not': return '!' + paren(expr(e.value));
      case 'random': return 'random(' + expr(e.min) + ', ' + expr(e.max) + ')';
      case 'map': return 'map(' + [e.value, e.fromLow, e.fromHigh, e.toLow, e.toHigh].map(expr).join(', ') + ')';
      case 'op': return '(' + expr(e.left) + ' ' + ({ and: '&&', or: '||' }[e.op] || e.op) + ' ' + expr(e.right) + ')';
    }
    return '0';
  }

  // ---- Starter sketches ---------------------------------------------------

  var n = function (v) { return { kind: 'num', value: v }; };
  var HIGH = { kind: 'level', value: 1 }, LOW = { kind: 'level', value: 0 };
  var STARTERS = {
    blink: {
      label: 'Blink (setup and loop)', about: 'The “hello world” of Arduino: setup runs once, loop runs forever. Change the delays and watch the L light.',
      program: { version: 1, name: 'Blink', setup: [{ type: 'pinMode', pin: 13, mode: 'OUTPUT' }], loop: [
        { type: 'digitalWrite', pin: 13, value: HIGH }, { type: 'delay', ms: n(500) },
        { type: 'digitalWrite', pin: 13, value: LOW }, { type: 'delay', ms: n(500) }
      ], functions: [] }
    },
    button: {
      label: 'Button lamp (digitalRead + if)', about: 'Hold the button: the red LED lights. INPUT_PULLUP makes an unpressed button read HIGH and a pressed one LOW. Try INPUT instead and watch the LED flicker.',
      program: { version: 1, name: 'Button lamp', setup: [
        { type: 'pinMode', pin: 2, mode: 'INPUT_PULLUP' }, { type: 'pinMode', pin: 10, mode: 'OUTPUT' }
      ], loop: [
        { type: 'if', cond: { kind: 'op', op: '==', left: { kind: 'digitalRead', pin: 2 }, right: LOW },
          then: [{ type: 'digitalWrite', pin: 10, value: HIGH }], 'else': [{ type: 'digitalWrite', pin: 10, value: LOW }] }
      ], functions: [] }
    },
    dimmer: {
      label: 'Knob dimmer (analogRead + map)', about: 'Turn the knob. analogRead gives 0–1023, map() squeezes it into 0–255 for analogWrite, and the Serial Monitor shows the variable.',
      program: { version: 1, name: 'Knob dimmer', setup: [{ type: 'serialBegin', baud: 9600 }], loop: [
        { type: 'set', name: 'knob', value: { kind: 'analogRead', pin: 'A0' } },
        { type: 'set', name: 'brightness', value: { kind: 'map', value: { kind: 'var', name: 'knob' }, fromLow: n(0), fromHigh: n(1023), toLow: n(0), toHigh: n(255) } },
        { type: 'analogWrite', pin: 10, value: { kind: 'var', name: 'brightness' } },
        { type: 'print', value: { kind: 'var', name: 'brightness' }, newline: true },
        { type: 'delay', ms: n(100) }
      ], functions: [] }
    },
    night: {
      label: 'Night light (light sensor)', about: 'Slide the light level down: below the threshold the green LED comes on. Find a threshold that works for your room.',
      program: { version: 1, name: 'Night light', setup: [{ type: 'pinMode', pin: 6, mode: 'OUTPUT' }], loop: [
        { type: 'if', cond: { kind: 'op', op: '<', left: { kind: 'analogRead', pin: 'A1' }, right: n(400) },
          then: [{ type: 'digitalWrite', pin: 6, value: HIGH }], 'else': [{ type: 'digitalWrite', pin: 6, value: LOW }] },
        { type: 'delay', ms: n(50) }
      ], functions: [] }
    },
    parking: {
      label: 'Parking sensor (ultrasonic + buzzer)', about: 'Like a car’s parking sensor: the closer the object, the faster the beeps. Drag the distance slider.',
      program: { version: 1, name: 'Parking sensor', setup: [{ type: 'serialBegin', baud: 9600 }], loop: [
        { type: 'set', name: 'cm', value: { kind: 'distance' } },
        { type: 'print', value: { kind: 'var', name: 'cm' }, newline: true },
        { type: 'if', cond: { kind: 'op', op: '<', left: { kind: 'var', name: 'cm' }, right: n(60) }, then: [
          { type: 'tone', pin: 8, freq: n(880), ms: n(60) },
          { type: 'delay', ms: { kind: 'map', value: { kind: 'var', name: 'cm' }, fromLow: n(0), fromHigh: n(60), toLow: n(80), toHigh: n(700) } }
        ], 'else': [{ type: 'delay', ms: n(200) }] }
      ], functions: [] }
    },
    sweep: {
      label: 'Servo sweep (a library)', about: 'The Servo library hides the timing pulses a servo needs. Sweep from 0° to 180° and back in 10° steps.',
      program: { version: 1, name: 'Servo sweep', setup: [], loop: [
        { type: 'set', name: 'angle', value: n(0) },
        { type: 'repeat', count: n(18), body: [{ type: 'change', name: 'angle', by: n(10) }, { type: 'servo', angle: { kind: 'var', name: 'angle' } }, { type: 'delay', ms: n(40) }] },
        { type: 'repeat', count: n(18), body: [{ type: 'change', name: 'angle', by: n(-10) }, { type: 'servo', angle: { kind: 'var', name: 'angle' } }, { type: 'delay', ms: n(40) }] }
      ], functions: [] }
    },
    sos: {
      label: 'SOS in Morse (your own functions)', about: 'dot() and dash() are functions you define once and call by name. Loop calls them to flash · · · – – – · · ·',
      program: { version: 1, name: 'SOS', setup: [{ type: 'pinMode', pin: 13, mode: 'OUTPUT' }], loop: [
        { type: 'repeat', count: n(3), body: [{ type: 'call', name: 'dot' }] },
        { type: 'repeat', count: n(3), body: [{ type: 'call', name: 'dash' }] },
        { type: 'repeat', count: n(3), body: [{ type: 'call', name: 'dot' }] },
        { type: 'delay', ms: n(1000) }
      ], functions: [
        { name: 'dot', body: [{ type: 'digitalWrite', pin: 13, value: HIGH }, { type: 'delay', ms: n(150) }, { type: 'digitalWrite', pin: 13, value: LOW }, { type: 'delay', ms: n(150) }] },
        { name: 'dash', body: [{ type: 'digitalWrite', pin: 13, value: HIGH }, { type: 'delay', ms: n(450) }, { type: 'digitalWrite', pin: 13, value: LOW }, { type: 'delay', ms: n(150) }] }
      ] }
    },
    dice: {
      label: 'Button dice (random + variables)', about: 'Press the button to roll. random(1, 7) gives 1 to 6: the top number is never included. Count your rolls too.',
      program: { version: 1, name: 'Button dice', setup: [
        { type: 'serialBegin', baud: 9600 }, { type: 'pinMode', pin: 2, mode: 'INPUT_PULLUP' }, { type: 'print', value: { kind: 'text', value: 'Press the button to roll!' }, newline: true }
      ], loop: [
        { type: 'if', cond: { kind: 'op', op: '==', left: { kind: 'digitalRead', pin: 2 }, right: LOW }, then: [
          { type: 'set', name: 'roll', value: { kind: 'random', min: n(1), max: n(7) } },
          { type: 'change', name: 'rolls', by: n(1) },
          { type: 'print', value: { kind: 'text', value: 'You rolled ' }, newline: false },
          { type: 'print', value: { kind: 'var', name: 'roll' }, newline: true },
          { type: 'tone', pin: 8, freq: n(660), ms: n(80) },
          { type: 'until', cond: { kind: 'op', op: '==', left: { kind: 'digitalRead', pin: 2 }, right: HIGH }, body: [] },
          { type: 'delay', ms: n(50) }
        ], 'else': [] }
      ], functions: [] }
    }
  };

  var api = {
    LIMITS: LIMITS, KIT: KIT, WIRING: WIRING, DIGITAL: DIGITAL, ANALOG: ANALOG, PWM: PWM, MODES: MODES, BAUDS: BAUDS, OPS: OPS,
    STARTERS: STARTERS, Board: Board, checkProgram: checkProgram, run: run, toCpp: toCpp
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else global.ArduinoSim = api;
})(typeof window !== 'undefined' ? window : globalThis);
