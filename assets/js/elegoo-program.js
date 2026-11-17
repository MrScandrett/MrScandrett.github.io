/* ELEGOO Smart Robot Car V4.0: block programs.

   A program is plain JSON (what the Code studio's blocks become, what a saved
   project holds):

     { version: 1, name: "Square", steps: [ statement, … ] }

   Statements  drive {dir, speed, secs}   go {dir, speed}   curve {left, right, secs}
               stop   wait {secs}   light {color}   head {angle}   say {value}
               repeat {count, body}   forever {body}   while {cond, body}   until {cond, body}
               if {cond, then, else}   set {name, value}   change {name, by}
   Values      num {value}   bool {value}   distance   line {side}   onLine {side}   timer
               var {name}   op {op, left, right}   not {value}   random {min, max}
   dir is forward | backward | left | right (left/right spin in place); side is L | M | R.

   run(program, io) runs it live through the same commands the cockpit sends
   (assets/js/elegoo-car.js), so it works on the simulator and on a real car.
   toArduino(program) writes the same program as a standalone Arduino sketch.

   Works as a browser global (window.ElegooProgram) and as a CommonJS module for tests. */
(function (global) {
  'use strict';

  var Car = global.ElegooCar || (typeof require === 'function' ? require('./elegoo-car.js') : null);
  var cmd = Car.cmd, CAR_LIMITS = Car.LIMITS;

  var LIMITS = {
    maxBlocks: 400,       // statements + values in one program
    maxDepth: 12,         // nesting of loops/ifs, and of values
    maxSecs: 120,         // a running program stops itself after this long
    stepSecs: 30,         // longest single drive / wait
    keepAliveMs: 250,     // re-send a held drive this often (the Wi-Fi bridge stops the car after 1 s of silence)
    headPauseMs: 450      // the firmware pauses about this long per servo move
  };
  var DIRS = { forward: 3, backward: 4, left: 1, right: 2 };
  var SIDES = { L: 0, M: 1, R: 2 };
  var COLORS = {
    off: [0, 0, 0], red: [255, 0, 0], orange: [255, 100, 0], yellow: [255, 210, 0], green: [0, 220, 60],
    cyan: [0, 200, 220], blue: [0, 60, 255], purple: [160, 0, 255], white: [255, 255, 255], random: null
  };
  var OPS = ['+', '-', '*', '/', '%', '<', '<=', '>', '>=', '==', '!=', 'and', 'or'];
  var NAME = /^[A-Za-z_][A-Za-z0-9_]{0,19}$/;

  // ---- Checking ---------------------------------------------------------

  function fail(msg) { throw new Error(msg); }

  function checkProgram(p) {
    if (!p || typeof p !== 'object') fail('A program must be an object.');
    if (p.version !== 1) fail('This file is not a version 1 car program.');
    if (!Array.isArray(p.steps)) fail('The program has no list of steps.');
    var count = { n: 0 };
    var out = { version: 1, name: typeof p.name === 'string' ? p.name.slice(0, 60) : 'My program', steps: list(p.steps, 0, count) };
    return out;
  }

  function list(steps, depth, count) {
    if (!Array.isArray(steps)) fail('Expected a list of steps.');
    if (depth > LIMITS.maxDepth) fail('Loops and ifs are nested too deeply (more than ' + LIMITS.maxDepth + ').');
    return steps.map(function (s) { return statement(s, depth, count); });
  }

  function statement(s, depth, count) {
    if (!s || typeof s !== 'object') fail('Every step must be an object.');
    if (++count.n > LIMITS.maxBlocks) fail('The program is too big (more than ' + LIMITS.maxBlocks + ' blocks).');
    var o = { type: s.type };
    if (s.id != null) o.id = String(s.id).slice(0, 40);
    var v = function (k) { o[k] = value(s[k], depth, count); };
    var body = function (k) { o[k] = list(s[k] || [], depth + 1, count); };
    var dir = function () { if (!DIRS[s.dir]) fail('Unknown direction “' + s.dir + '”.'); o.dir = s.dir; };
    var name = function () { if (!NAME.test(String(s.name))) fail('“' + s.name + '” is not a usable variable name (letters, digits, _; start with a letter).'); o.name = s.name; };
    switch (s.type) {
      case 'drive': dir(); v('speed'); v('secs'); break;
      case 'go': dir(); v('speed'); break;
      case 'curve': v('left'); v('right'); v('secs'); break;
      case 'stop': break;
      case 'wait': v('secs'); break;
      case 'light': if (!Object.prototype.hasOwnProperty.call(COLORS, s.color)) fail('Unknown light colour “' + s.color + '”.'); o.color = s.color; break;
      case 'head': v('angle'); break;
      case 'say': v('value'); break;
      case 'repeat': v('count'); body('body'); break;
      case 'forever': body('body'); break;
      case 'while': case 'until': v('cond'); body('body'); break;
      case 'if': v('cond'); body('then'); body('else'); break;
      case 'set': name(); v('value'); break;
      case 'change': name(); v('by'); break;
      default: fail('Unknown step “' + s.type + '”.');
    }
    return o;
  }

  function value(e, depth, count) {
    if (!e || typeof e !== 'object') fail('An empty socket: plug a number, sensor or variable into every gap.');
    if (depth > LIMITS.maxDepth * 2) fail('A calculation is nested too deeply.');
    if (++count.n > LIMITS.maxBlocks) fail('The program is too big (more than ' + LIMITS.maxBlocks + ' blocks).');
    var sub = function (x) { return value(x, depth + 1, count); };
    switch (e.kind) {
      case 'num': if (typeof e.value !== 'number' || !isFinite(e.value)) fail('“' + e.value + '” is not a number.'); return { kind: 'num', value: e.value };
      case 'bool': return { kind: 'bool', value: !!e.value };
      case 'distance': case 'timer': return { kind: e.kind };
      case 'line': case 'onLine': if (!(e.side in SIDES)) fail('Line sensor side must be L, M or R.'); return { kind: e.kind, side: e.side };
      case 'var': if (!NAME.test(String(e.name))) fail('“' + e.name + '” is not a usable variable name.'); return { kind: 'var', name: e.name };
      case 'op': if (OPS.indexOf(e.op) < 0) fail('Unknown operator “' + e.op + '”.'); return { kind: 'op', op: e.op, left: sub(e.left), right: sub(e.right) };
      case 'not': return { kind: 'not', value: sub(e.value) };
      case 'random': return { kind: 'random', min: sub(e.min), max: sub(e.max) };
      default: fail('Unknown value “' + e.kind + '”.');
    }
  }

  // ---- Running ----------------------------------------------------------
  // io = { send(command) -> Promise, ask(command, ms) -> Promise<string|null>,
  //        sleep(ms) -> Promise, now() -> ms, cancelled() -> bool,
  //        step(id)?, say(text)?, vars(snapshot)?, random()? }

  function Cancelled() { this.message = 'Stopped.'; }

  function run(program, io, opts) {
    opts = opts || {};
    var p = checkProgram(program);
    var ctx = {
      io: io, vars: {}, drive: null, lastDrive: 0, start: io.now(),
      maxMs: (opts.maxSecs || LIMITS.maxSecs) * 1000,
      maxSpeed: opts.maxSpeed == null ? 255 : speedOf(opts.maxSpeed), rand: io.random || Math.random
    };
    return block(ctx, p.steps).then(function () {
      return finish(ctx, { ok: true, message: 'Program finished.' });
    }, function (err) {
      if (err instanceof Cancelled) return finish(ctx, { ok: true, stopped: true, message: 'Stopped.' });
      return finish(ctx, { ok: false, message: err && err.message ? err.message : String(err) });
    });
  }

  function finish(ctx, result) {
    ctx.drive = null;
    result.vars = copy(ctx.vars);
    result.secs = (ctx.io.now() - ctx.start) / 1000;
    return Promise.resolve(ctx.io.send(cmd.stop())).catch(function () {}).then(function () { return result; });
  }

  function copy(o) { var c = {}; for (var k in o) c[k] = o[k]; return c; }

  function check(ctx) {
    if (ctx.io.cancelled && ctx.io.cancelled()) throw new Cancelled();
    if (ctx.io.now() - ctx.start > ctx.maxMs) throw new Error('Time limit: programs stop after ' + ctx.maxMs / 1000 + ' seconds.');
  }

  function send(ctx, command) { return Promise.resolve(ctx.io.send(command)); }

  function hold(ctx, command) {
    ctx.drive = command; ctx.lastDrive = ctx.io.now();
    return send(ctx, command);
  }

  // Keep a held drive alive (and let the page breathe) between steps.
  function keepAlive(ctx) {
    check(ctx);
    if (ctx.drive && ctx.io.now() - ctx.lastDrive >= LIMITS.keepAliveMs) return hold(ctx, ctx.drive);
    return Promise.resolve();
  }

  function pause(ctx, ms) {
    var end = ctx.io.now() + Math.max(0, ms);
    function loop() {
      check(ctx);
      var now = ctx.io.now();
      if (now >= end) return Promise.resolve();
      return keepAlive(ctx).then(function () {
        var wait = Math.min(end - ctx.io.now(), ctx.drive ? LIMITS.keepAliveMs : 100);
        return ctx.io.sleep(Math.max(0, wait));
      }).then(loop);
    }
    return loop();
  }

  function secs(v) { v = Number(v); return isFinite(v) ? Math.max(0, Math.min(LIMITS.stepSecs, v)) * 1000 : 0; }
  function speedOf(v) { v = Math.round(Number(v)); return isFinite(v) ? Math.max(0, Math.min(255, v)) : 0; }
  // Speeds above the cockpit's Top speed slider are cut to it, on the simulator and the real car alike.
  function cap(ctx, v) { return Math.min(ctx.maxSpeed, speedOf(v)); }

  function block(ctx, steps) {
    var i = 0;
    function next() {
      if (i >= steps.length) return Promise.resolve();
      var s = steps[i++];
      return keepAlive(ctx).then(function () {
        if (s.id && ctx.io.step) ctx.io.step(s.id);
        return exec(ctx, s);
      }).then(next);
    }
    return next();
  }

  function loopBody(ctx, body) {
    // One turn of a loop. sleep(0) hands the browser a moment so a tight loop can't freeze the page.
    return block(ctx, body).then(function () { return ctx.io.sleep(0); }).then(function () { return keepAlive(ctx); });
  }

  function exec(ctx, s) {
    var ev = function (e) { return evaluate(ctx, e); };
    switch (s.type) {
      case 'drive':
        return Promise.all([ev(s.speed), ev(s.secs)]).then(function (a) {
          return hold(ctx, cmd.move(DIRS[s.dir], cap(ctx, a[0]))).then(function () { return pause(ctx, secs(a[1])); })
            .then(function () { ctx.drive = null; return send(ctx, cmd.stop()); });
        });
      case 'go':
        return ev(s.speed).then(function (sp) { return hold(ctx, cmd.move(DIRS[s.dir], cap(ctx, sp))); });
      case 'curve':
        return Promise.all([ev(s.left), ev(s.right), ev(s.secs)]).then(function (a) {
          // N4 takes the RIGHT side first (see elegoo-car.js).
          return hold(ctx, cmd.tank(cap(ctx, a[1]), cap(ctx, a[0]))).then(function () { return pause(ctx, secs(a[2])); })
            .then(function () { ctx.drive = null; return send(ctx, cmd.stop()); });
        });
      case 'stop': ctx.drive = null; return send(ctx, cmd.stop());
      case 'wait': return ev(s.secs).then(function (t) { return pause(ctx, secs(t)); });
      case 'light': {
        var c = COLORS[s.color] || [ctx.rand() * 255, ctx.rand() * 255, ctx.rand() * 255];
        return send(ctx, cmd.light(c[0], c[1], c[2]));
      }
      case 'head':
        return ev(s.angle).then(function (a) {
          a = Math.max(CAR_LIMITS.panMin, Math.min(CAR_LIMITS.panMax, Math.round(Number(a) || 90)));
          return send(ctx, cmd.servo(1, a)).then(function () { return pause(ctx, LIMITS.headPauseMs); });
        });
      case 'say': return ev(s.value).then(function (v) { if (ctx.io.say) ctx.io.say(show(v)); });
      case 'set': return ev(s.value).then(function (v) { ctx.vars[s.name] = v; watch(ctx); });
      case 'change': return ev(s.by).then(function (v) { ctx.vars[s.name] = num(ctx.vars[s.name]) + num(v); watch(ctx); });
      case 'if': return ev(s.cond).then(function (c) { return block(ctx, c ? s.then : s['else']); });
      case 'repeat':
        return ev(s.count).then(function (n) {
          n = Math.max(0, Math.min(100000, Math.floor(num(n))));
          var k = 0;
          function again() { if (k++ >= n) return Promise.resolve(); return loopBody(ctx, s.body).then(again); }
          return again();
        });
      case 'forever': {
        var forever = function () { return loopBody(ctx, s.body).then(forever); };
        return forever();
      }
      case 'while': case 'until': {
        var cond = function () { return ev(s.cond).then(function (c) { return s.type === 'while' ? !!c : !c; }); };
        var turn = function () { return cond().then(function (go) { return go ? loopBody(ctx, s.body).then(turn) : null; }); };
        return turn();
      }
    }
    return Promise.reject(new Error('Unknown step ' + s.type));
  }

  function watch(ctx) { if (ctx.io.vars) ctx.io.vars(copy(ctx.vars)); }
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function show(v) { return typeof v === 'boolean' ? (v ? 'true' : 'false') : String(Math.round(num(v) * 1000) / 1000); }

  function ask(ctx, command, what) {
    return Promise.resolve(ctx.io.ask(command, 900)).then(function (r) {
      return r == null ? ctx.io.ask(command, 900) : r;
    }).then(function (r) {
      check(ctx);
      if (r == null || r === '' || isNaN(Number(r))) throw new Error('The car did not answer “' + what + '”. Check the connection and try again.');
      return Number(r);
    });
  }

  function evaluate(ctx, e) {
    switch (e.kind) {
      case 'num': case 'bool': return Promise.resolve(e.value);
      case 'timer': return Promise.resolve(Math.round((ctx.io.now() - ctx.start) / 100) / 10);
      case 'var': return Promise.resolve(Object.prototype.hasOwnProperty.call(ctx.vars, e.name) ? ctx.vars[e.name] : 0);
      case 'distance': return ask(ctx, cmd.distance(), 'distance');
      case 'line': case 'onLine':
        // The factory firmware stops driving whenever it answers a line-sensor question,
        // so a held drive is sent again straight after the answer.
        return ask(ctx, cmd.line(SIDES[e.side]), 'line sensor ' + e.side).then(function (v) {
          var resume = ctx.drive ? hold(ctx, ctx.drive) : Promise.resolve();
          return resume.then(function () { return e.kind === 'line' ? v : v >= CAR_LIMITS.lineLow && v <= CAR_LIMITS.lineHigh; });
        });
      case 'not': return evaluate(ctx, e.value).then(function (v) { return !v; });
      case 'random':
        return evaluate(ctx, e.min).then(function (a) {
          return evaluate(ctx, e.max).then(function (b) {
            a = num(a); b = num(b); if (b < a) { var t = a; a = b; b = t; }
            if (a === Math.floor(a) && b === Math.floor(b)) return a + Math.floor(ctx.rand() * (b - a + 1));
            return a + ctx.rand() * (b - a);
          });
        });
      case 'op':
        // and / or skip the right side when the left already decides (no extra sensor reads).
        return evaluate(ctx, e.left).then(function (a) {
          if (e.op === 'and' && !a) return false;
          if (e.op === 'or' && a) return true;
          return evaluate(ctx, e.right).then(function (b) { return operate(e.op, a, b); });
        });
    }
    return Promise.reject(new Error('Unknown value ' + e.kind));
  }

  function operate(op, a, b) {
    if (op === 'and' || op === 'or') return !!b;
    var x = num(a), y = num(b);
    switch (op) {
      case '+': return x + y;
      case '-': return x - y;
      case '*': return x * y;
      case '/': if (y === 0) throw new Error('Division by zero.'); return x / y;
      case '%': if (y === 0) throw new Error('Division by zero.'); return x % y;
      case '<': return x < y;
      case '<=': return x <= y;
      case '>': return x > y;
      case '>=': return x >= y;
      case '==': return x === y;
      case '!=': return x !== y;
    }
  }

  // ---- Arduino sketch ---------------------------------------------------
  // Pins from ELEGOO's V4.0 driver code (DeviceDriverSet_xxx0.h): TB6612 motor
  // driver (group A = right side, group B = left), HC-SR04 ultrasonic, three
  // ITR20001 line sensors, the pan servo, one WS2812 RGB LED.

  function toArduino(program) {
    var p = checkProgram(program);
    var used = { head: false, light: false, distance: false, line: false, random: false, say: false, vars: {} };
    scan(p.steps, used);
    var L = [];
    var w = function (s) { L.push(s); };
    w('// ' + (p.name || 'My program') + ': made in the Robot Car Pilot code studio.');
    w('// For the ELEGOO Smart Robot Car V4.0 (Arduino UNO).');
    w('//');
    w('// Uploading this REPLACES the factory program, so the Bluetooth/Wi-Fi app and the');
    w('// Robot Car Pilot cockpit stop working until you upload ELEGOO\'s factory sketch again');
    w('// (SmartRobotCarV4.0 in ELEGOO\'s download for this kit).');
    w('// 1. Slide the shield\'s upload switch to "upload" (the Bluetooth module shares the serial pins).');
    w('// 2. Board: Arduino Uno. Upload. 3. Slide the switch back.');
    w('// The program starts 2 seconds after power-on and stops by itself after ' + LIMITS.maxSecs + ' seconds.');
    w('// Test it with the wheels off the ground first.');
    w('');
    if (used.head) w('#include <Servo.h>');
    if (used.light) w('#include <FastLED.h>   // install "FastLED" from the Library Manager');
    if (used.head || used.light) w('');
    w('const int PWMA = 5, PWMB = 6, AIN1 = 7, BIN1 = 8, STBY = 3;  // motor driver');
    if (used.distance) w('const int TRIG = 13, ECHO = 12;                          // ultrasonic');
    if (used.line) w('const int LINE_PIN[3] = { A2, A1, A0 };                  // line sensors L, M, R');
    if (used.head) w('Servo head;                                                // pin 10');
    if (used.light) w('CRGB led[1];                                               // pin 4');
    w('const unsigned long TIME_LIMIT_MS = ' + LIMITS.maxSecs * 1000 + 'UL;');
    w('unsigned long startMs;');
    Object.keys(used.vars).forEach(function (n) { w('float v_' + n + ' = 0;'); });
    w('');
    w('void stopMotors() {');
    w('  analogWrite(PWMA, 0); analogWrite(PWMB, 0);');
    w('  digitalWrite(STBY, LOW);');
    w('}');
    w('// Each side -255..255 (negative = backward).');
    w('void motors(int left, int right) {');
    w('  left = constrain(left, -255, 255); right = constrain(right, -255, 255);');
    w('  digitalWrite(STBY, HIGH);');
    w('  digitalWrite(AIN1, right >= 0 ? HIGH : LOW); analogWrite(PWMA, abs(right));');
    w('  digitalWrite(BIN1, left >= 0 ? HIGH : LOW);  analogWrite(PWMB, abs(left));');
    w('}');
    w('void halt() { stopMotors(); while (true) {} }');
    w('void check() { if (millis() - startMs > TIME_LIMIT_MS) halt(); }');
    w('void waitMs(float ms) {');
    w('  unsigned long t0 = millis(), len = (unsigned long)constrain(ms, 0, ' + LIMITS.stepSecs * 1000 + ');');
    w('  while (millis() - t0 < len) { check(); delay(2); }');
    w('}');
    w('float timerSecs() { return (millis() - startMs) / 1000.0; }');
    if (used.distance) {
      w('float distanceCm() {');
      w('  digitalWrite(TRIG, LOW); delayMicroseconds(2);');
      w('  digitalWrite(TRIG, HIGH); delayMicroseconds(10); digitalWrite(TRIG, LOW);');
      w('  unsigned long us = pulseIn(ECHO, HIGH, 25000UL);');
      w('  return us == 0 ? 400 : us / 58.0;  // no echo = nothing in range');
      w('}');
    }
    if (used.line) {
      w('int lineRaw(int side) { return analogRead(LINE_PIN[side]); }');
      w('bool onLine(int side) { int v = lineRaw(side); return v >= ' + CAR_LIMITS.lineLow + ' && v <= ' + CAR_LIMITS.lineHigh + '; }');
    }
    if (used.random) w('float randomBetween(float a, float b) { if (b < a) { float t = a; a = b; b = t; } return a == (long)a && b == (long)b ? random((long)a, (long)b + 1) : a + (b - a) * random(10001) / 10000.0; }');
    if (used.light) w('void setLight(int r, int g, int b) { led[0] = CRGB(r, g, b); FastLED.show(); }');
    w('');
    w('void program() {');
    var ctr = { n: 0 };
    stmts(p.steps, '  ', w, ctr);
    w('}');
    w('');
    w('void setup() {');
    w('  Serial.begin(9600);');
    w('  pinMode(PWMA, OUTPUT); pinMode(PWMB, OUTPUT); pinMode(AIN1, OUTPUT); pinMode(BIN1, OUTPUT); pinMode(STBY, OUTPUT);');
    w('  stopMotors();');
    if (used.distance) w('  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT);');
    if (used.head) w('  head.attach(10); head.write(90);');
    if (used.light) w('  FastLED.addLeds<NEOPIXEL, 4>(led, 1); FastLED.setBrightness(40); setLight(0, 0, 0);');
    if (used.random) w('  randomSeed(analogRead(A3));');
    w('  delay(2000);  // time to put the car down');
    w('  startMs = millis();');
    w('  program();');
    w('  stopMotors();');
    w('}');
    w('');
    w('void loop() {}');
    return L.join('\n') + '\n';
  }

  function scan(steps, used) {
    steps.forEach(function (s) {
      if (s.type === 'head') used.head = true;
      if (s.type === 'light') { used.light = true; if (s.color === 'random') used.random = true; }
      if (s.type === 'set' || s.type === 'change') used.vars[s.name] = true;
      ['speed', 'secs', 'left', 'right', 'angle', 'value', 'count', 'cond', 'by'].forEach(function (k) { if (s[k]) scanValue(s[k], used); });
      ['body', 'then', 'else'].forEach(function (k) { if (s[k]) scan(s[k], used); });
    });
  }
  function scanValue(e, used) {
    if (e.kind === 'distance') used.distance = true;
    if (e.kind === 'line' || e.kind === 'onLine') used.line = true;
    if (e.kind === 'random') used.random = true;
    if (e.kind === 'var') used.vars[e.name] = true;
    ['left', 'right', 'value', 'min', 'max'].forEach(function (k) { if (e[k] && typeof e[k] === 'object') scanValue(e[k], used); });
  }

  var WHEELS = { forward: ['s', 's'], backward: ['-s', '-s'], left: ['-s', 's'], right: ['s', '-s'] };

  function stmts(steps, ind, w, ctr) {
    steps.forEach(function (s) {
      var x = function (e) { return expr(e); };
      var sp = function (e) { return 'constrain((int)(' + x(e) + '), 0, 255)'; };
      var wheels = function (dir, speedExpr) {
        var m = WHEELS[dir];
        return 'motors(' + m[0].replace('s', speedExpr) + ', ' + m[1].replace('s', speedExpr) + ');';
      };
      switch (s.type) {
        case 'drive': {
          var v = 'sp' + (++ctr.n);
          w(ind + '{ int ' + v + ' = ' + sp(s.speed) + '; ' + wheels(s.dir, v) + ' waitMs(' + x(s.secs) + ' * 1000.0); stopMotors(); }  // ' + s.dir);
          break;
        }
        case 'go': {
          var g = 'sp' + (++ctr.n);
          w(ind + '{ int ' + g + ' = ' + sp(s.speed) + '; ' + wheels(s.dir, g) + ' }  // keep driving ' + s.dir);
          break;
        }
        case 'curve': w(ind + 'motors(' + sp(s.left) + ', ' + sp(s.right) + '); waitMs(' + x(s.secs) + ' * 1000.0); stopMotors();'); break;
        case 'stop': w(ind + 'stopMotors();'); break;
        case 'wait': w(ind + 'waitMs(' + x(s.secs) + ' * 1000.0);'); break;
        case 'light': {
          var c = COLORS[s.color];
          w(ind + (c ? 'setLight(' + c.join(', ') + ');' : 'setLight(random(256), random(256), random(256));') + '  // ' + s.color);
          break;
        }
        case 'head': w(ind + 'head.write(constrain((int)(' + x(s.angle) + '), ' + CAR_LIMITS.panMin + ', ' + CAR_LIMITS.panMax + ')); waitMs(' + LIMITS.headPauseMs + ');'); break;
        case 'say': w(ind + 'Serial.println(' + x(s.value) + ');'); break;
        case 'set': w(ind + 'v_' + s.name + ' = ' + x(s.value) + ';'); break;
        case 'change': w(ind + 'v_' + s.name + ' += ' + x(s.by) + ';'); break;
        case 'if':
          w(ind + 'if (' + x(s.cond) + ') {');
          stmts(s.then, ind + '  ', w, ctr);
          if (s['else'].length) { w(ind + '} else {'); stmts(s['else'], ind + '  ', w, ctr); }
          w(ind + '}');
          break;
        case 'repeat': {
          var i = 'i' + (++ctr.n);
          w(ind + 'for (long ' + i + ' = 0, n' + i + ' = (long)(' + x(s.count) + '); ' + i + ' < n' + i + '; ' + i + '++) {');
          w(ind + '  check();');
          stmts(s.body, ind + '  ', w, ctr);
          w(ind + '}');
          break;
        }
        case 'forever': case 'while': case 'until':
          w(ind + 'while (' + (s.type === 'forever' ? 'true' : s.type === 'while' ? x(s.cond) : '!(' + x(s.cond) + ')') + ') {');
          w(ind + '  check();');
          stmts(s.body, ind + '  ', w, ctr);
          w(ind + '}');
          break;
      }
    });
  }

  function literal(n) { return n === Math.floor(n) && Math.abs(n) < 2147483647 ? String(n) : String(Number(n.toPrecision(7))); }

  function expr(e) {
    switch (e.kind) {
      case 'num': return literal(e.value);
      case 'bool': return e.value ? 'true' : 'false';
      case 'distance': return 'distanceCm()';
      case 'timer': return 'timerSecs()';
      case 'line': return 'lineRaw(' + SIDES[e.side] + ')';
      case 'onLine': return 'onLine(' + SIDES[e.side] + ')';
      case 'var': return 'v_' + e.name;
      case 'not': return '!(' + expr(e.value) + ')';
      case 'random': return 'randomBetween(' + expr(e.min) + ', ' + expr(e.max) + ')';
      case 'op': {
        var a = expr(e.left), b = expr(e.right);
        if (e.op === '%') return 'fmod(' + a + ', ' + b + ')';
        var op = { and: '&&', or: '||' }[e.op] || e.op;
        return '(' + a + ' ' + op + ' ' + b + ')';
      }
    }
    return '0';
  }

  // ---- Starters and the Mission tab ------------------------------------

  var n = function (v) { return { kind: 'num', value: v }; };
  var STARTERS = {
    square: {
      label: 'Square (repeat)', about: 'Four sides and four turns, written once inside a repeat. Tune the turn time until the car ends where it started.',
      program: { version: 1, name: 'Square', steps: [
        { type: 'repeat', count: n(4), body: [
          { type: 'drive', dir: 'forward', speed: n(150), secs: n(1.2) },
          { type: 'drive', dir: 'right', speed: n(150), secs: n(0.55) }
        ] }
      ] }
    },
    wall: {
      label: 'Stop at the wall (sensor)', about: 'Drive until the ultrasonic sensor sees something closer than 25 cm. Closed loop: the car checks, then decides.',
      program: { version: 1, name: 'Stop at the wall', steps: [
        { type: 'light', color: 'green' },
        { type: 'go', dir: 'forward', speed: n(130) },
        { type: 'until', cond: { kind: 'op', op: '<', left: { kind: 'distance' }, right: n(25) }, body: [] },
        { type: 'stop' },
        { type: 'light', color: 'red' },
        { type: 'say', value: { kind: 'distance' } }
      ] }
    },
    bounce: {
      label: 'Wall bouncer (if / else)', about: 'Forever: if a wall is near, back up and spin a random amount; otherwise keep driving. Count the bounces.',
      program: { version: 1, name: 'Wall bouncer', steps: [
        { type: 'set', name: 'bounces', value: n(0) },
        { type: 'forever', body: [
          { type: 'if', cond: { kind: 'op', op: '<', left: { kind: 'distance' }, right: n(30) }, then: [
            { type: 'light', color: 'red' },
            { type: 'drive', dir: 'backward', speed: n(120), secs: n(0.3) },
            { type: 'drive', dir: 'right', speed: n(140), secs: { kind: 'random', min: n(0.3), max: n(0.9) } },
            { type: 'change', name: 'bounces', by: n(1) },
            { type: 'say', value: { kind: 'var', name: 'bounces' } }
          ], 'else': [
            { type: 'light', color: 'green' },
            { type: 'go', dir: 'forward', speed: n(130) }
          ] }
        ] }
      ] }
    },
    line: {
      label: 'Line follower (three sensors)', about: 'Your own line follower: steer toward whichever sensor sees the tape. Park the car on the black loop first.',
      program: { version: 1, name: 'Line follower', steps: [
        { type: 'forever', body: [
          { type: 'if', cond: { kind: 'onLine', side: 'M' }, then: [
            { type: 'curve', left: n(110), right: n(110), secs: n(0.1) }
          ], 'else': [
            { type: 'if', cond: { kind: 'onLine', side: 'L' }, then: [
              { type: 'curve', left: n(20), right: n(120), secs: n(0.1) }
            ], 'else': [
              { type: 'if', cond: { kind: 'onLine', side: 'R' }, then: [
                { type: 'curve', left: n(120), right: n(20), secs: n(0.1) }
              ], 'else': [
                { type: 'drive', dir: 'right', speed: n(90), secs: n(0.1) }
              ] }
            ] }
          ] }
        ] }
      ] }
    },
    scan: {
      label: 'Look both ways (head + variables)', about: 'Turn the ultrasonic head left and right, remember both distances, then turn toward the side with more room.',
      program: { version: 1, name: 'Look both ways', steps: [
        { type: 'head', angle: n(150) },
        { type: 'set', name: 'leftRoom', value: { kind: 'distance' } },
        { type: 'head', angle: n(30) },
        { type: 'set', name: 'rightRoom', value: { kind: 'distance' } },
        { type: 'head', angle: n(90) },
        { type: 'if', cond: { kind: 'op', op: '>', left: { kind: 'var', name: 'leftRoom' }, right: { kind: 'var', name: 'rightRoom' } }, then: [
          { type: 'drive', dir: 'left', speed: n(140), secs: n(0.55) }
        ], 'else': [
          { type: 'drive', dir: 'right', speed: n(140), secs: n(0.55) }
        ] },
        { type: 'drive', dir: 'forward', speed: n(140), secs: n(1) }
      ] }
    },
    dance: {
      label: 'Light show dance', about: 'Spins and colours on a loop. Change the colours, the order and the number of repeats.',
      program: { version: 1, name: 'Dance', steps: [
        { type: 'repeat', count: n(3), body: [
          { type: 'light', color: 'purple' },
          { type: 'drive', dir: 'left', speed: n(160), secs: n(0.4) },
          { type: 'light', color: 'cyan' },
          { type: 'drive', dir: 'right', speed: n(160), secs: n(0.4) },
          { type: 'light', color: 'random' },
          { type: 'drive', dir: 'forward', speed: n(140), secs: n(0.3) },
          { type: 'drive', dir: 'backward', speed: n(140), secs: n(0.3) }
        ] },
        { type: 'light', color: 'off' }
      ] }
    }
  };

  // Mission tab steps ([action, seconds] with one speed) -> a program.
  function fromSteps(steps, speed) {
    var dirs = { forward: 'forward', backward: 'backward', left: 'left', right: 'right' };
    return checkProgram({ version: 1, name: 'My mission', steps: steps.map(function (s) {
      if (dirs[s[0]]) return { type: 'drive', dir: dirs[s[0]], speed: n(speedOf(speed)), secs: n(Number(s[1]) || 0) };
      if (s[0] === 'light') return { type: 'light', color: 'random' };
      return { type: 'wait', secs: n(Number(s[1]) || 0) };
    }) });
  }

  var api = {
    LIMITS: LIMITS, DIRS: DIRS, SIDES: SIDES, COLORS: COLORS, OPS: OPS, STARTERS: STARTERS,
    checkProgram: checkProgram, run: run, toArduino: toArduino, fromSteps: fromSteps
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else global.ElegooProgram = api;
})(typeof window !== 'undefined' ? window : globalThis);
