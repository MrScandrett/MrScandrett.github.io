/* Arduino Studio (#ard-studio): write a sketch in blocks, run it on a simulated
   UNO wired to the class kit, watch the parts and the Serial Monitor, and
   download the same program as a real .ino sketch. The board, interpreter and
   C++ writer are assets/js/arduino-sim.js (window.ArduinoSim); Blockly loads
   only when the studio first comes on screen. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var root = $('ard-studio'), A = window.ArduinoSim;
  if (!root || !A) return;

  var STORE = 'arduino-studio-v1';
  var here = (document.currentScript && document.currentScript.src) || location.href;
  var vendor = new URL('../../vendor/', here).href;
  var B = null, ws = null, loading = false, program = null, running = null, quiet = false, saveTimer = 0;
  var board = new A.Board({ clock: function () { return performance.now(); } });
  var serialText = '', currentId = null, shownId = null, warnings = [];

  function note(text, kind) { var s = $('ast-status'); s.textContent = text; s.dataset.kind = kind || ''; }

  // ---- Blocks --------------------------------------------------------------
  var PART = { 2: 'button', 6: 'green LED', 8: 'buzzer', 9: 'servo', 10: 'red LED', 11: 'echo', 12: 'trig', 13: 'L LED' };
  var PINS = A.DIGITAL.map(function (p) { return [String(p) + (PART[p] ? ' (' + PART[p] + ')' : ''), String(p)]; });
  var APINS = A.ANALOG.map(function (p) { return [p + (p === 'A0' ? ' (knob)' : p === 'A1' ? ' (light)' : ''), p]; });
  var HUE = { pins: 175, time: 35, sound: 300, serial: 200, control: 120, math: 230, vars: 330, fn: 260 };
  var num = function (n) { return { type: 'input_value', name: n, check: 'Number' }; };
  var any = function (n) { return { type: 'input_value', name: n }; };
  var dd = function (n, o) { return { type: 'field_dropdown', name: n, options: o }; };
  var stack = function (n) { return { type: 'input_statement', name: n }; };
  var nl = { type: 'input_dummy' };

  function defineBlocks() {
    var defs = [
      { type: 'ard_setup', message0: 'void setup() — runs once %1 %2', args0: [nl, stack('DO')], colour: HUE.fn, tooltip: 'Runs once, when the board powers on or resets.' },
      { type: 'ard_loop', message0: 'void loop() — runs forever %1 %2', args0: [nl, stack('DO')], colour: HUE.fn, tooltip: 'After setup, loop runs again and again until the power goes off.' },
      { type: 'ard_function', message0: 'void %1 () — my function %2 %3', args0: [{ type: 'field_input', name: 'NAME', text: 'blinkTwice' }, nl, stack('DO')], colour: HUE.fn, tooltip: 'Name some steps once; run them anywhere with a call block.' },
      { type: 'ard_call', message0: 'call %1 ()', args0: [{ type: 'field_input', name: 'NAME', text: 'blinkTwice' }], colour: HUE.fn },
      { type: 'ard_pinmode', message0: 'pinMode pin %1 as %2', args0: [dd('PIN', PINS), dd('MODE', A.MODES.map(function (m) { return [m, m]; }))], colour: HUE.pins, tooltip: 'OUTPUT drives a part; INPUT_PULLUP reads a button wired to GND.' },
      { type: 'ard_dwrite', message0: 'digitalWrite pin %1 to %2', args0: [dd('PIN', PINS), num('VALUE')], colour: HUE.pins },
      { type: 'ard_awrite', message0: 'analogWrite pin %1 to %2', args0: [dd('PIN', PINS), num('VALUE')], colour: HUE.pins, tooltip: '0–255. Only the ~ pins (3, 5, 6, 9, 10, 11) can dim.' },
      { type: 'ard_delay', message0: 'delay %1 ms', args0: [num('MS')], colour: HUE.time, tooltip: '1000 ms = 1 second. The board does nothing else while it waits.' },
      { type: 'ard_tone', message0: 'tone pin %1 at %2 Hz for %3 ms', args0: [dd('PIN', PINS), num('FREQ'), num('MS')], colour: HUE.sound, tooltip: 'Starts a note and carries straight on (it doesn’t wait).' },
      { type: 'ard_notone', message0: 'noTone pin %1', args0: [dd('PIN', PINS)], colour: HUE.sound },
      { type: 'ard_servo', message0: 'servo.write %1 °', args0: [num('ANGLE')], colour: HUE.sound, tooltip: 'Uses the Servo library (servo on pin 9). 0–180°.' },
      { type: 'ard_begin', message0: 'Serial.begin %1', args0: [dd('BAUD', A.BAUDS.map(function (b) { return [String(b), String(b)]; }))], colour: HUE.serial, tooltip: 'Opens the USB serial link. Put it in setup.' },
      { type: 'ard_print', message0: 'Serial.%1 %2', args0: [dd('MODE', [['println', 'println'], ['print (same line)', 'print']]), any('VALUE')], colour: HUE.serial },
      { type: 'ard_if', message0: 'if %1 %2 %3', args0: [any('COND'), nl, stack('THEN')], colour: HUE.control },
      { type: 'ard_ifelse', message0: 'if %1 %2 %3 else %4 %5', args0: [any('COND'), nl, stack('THEN'), nl, stack('ELSE')], colour: HUE.control },
      { type: 'ard_repeat', message0: 'repeat %1 times %2 %3', args0: [num('COUNT'), nl, stack('DO')], colour: HUE.control, tooltip: 'A for loop: for (i = 0; i < n; i++).' },
      { type: 'ard_while', message0: '%1 %2 %3 %4', args0: [dd('MODE', [['while', 'while'], ['wait until', 'until']]), any('COND'), nl, stack('DO')], colour: HUE.control },
      { type: 'ard_set', message0: 'set %1 = %2', args0: [{ type: 'field_input', name: 'NAME', text: 'count' }, num('VALUE')], colour: HUE.vars, tooltip: 'Variables are whole numbers (long).' },
      { type: 'ard_change', message0: 'change %1 by %2', args0: [{ type: 'field_input', name: 'NAME', text: 'count' }, num('BY')], colour: HUE.vars },
      { type: 'ard_var', message0: '%1', args0: [{ type: 'field_input', name: 'NAME', text: 'count' }], output: 'Number', colour: HUE.vars },
      { type: 'ard_number', message0: '%1', args0: [{ type: 'field_number', name: 'VALUE', value: 0, min: -2147483647, max: 2147483647, precision: 1 }], output: 'Number', colour: HUE.math },
      { type: 'ard_text', message0: '“ %1 ”', args0: [{ type: 'field_input', name: 'TEXT', text: 'Hello!' }], output: 'String', colour: HUE.serial, tooltip: 'Text goes straight into Serial.print.' },
      { type: 'ard_level', message0: '%1', args0: [dd('VALUE', [['HIGH', '1'], ['LOW', '0']])], output: 'Number', colour: HUE.pins },
      { type: 'ard_dread', message0: 'digitalRead pin %1', args0: [dd('PIN', PINS)], output: 'Number', colour: HUE.pins },
      { type: 'ard_aread', message0: 'analogRead %1', args0: [dd('PIN', APINS)], output: 'Number', colour: HUE.pins, tooltip: '0 (0 V) to 1023 (5 V).' },
      { type: 'ard_distance', message0: 'ultrasonic distance (cm)', output: 'Number', colour: HUE.pins },
      { type: 'ard_millis', message0: 'millis()', output: 'Number', colour: HUE.time, tooltip: 'Milliseconds since the sketch started.' },
      { type: 'ard_map', message0: 'map %1 from %2 – %3 to %4 – %5', args0: [num('V'), num('FL'), num('FH'), num('TL'), num('TH')], inputsInline: true, output: 'Number', colour: HUE.math },
      { type: 'ard_random', message0: 'random( %1 , %2 )', args0: [num('MIN'), num('MAX')], inputsInline: true, output: 'Number', colour: HUE.math, tooltip: 'From min up to max − 1: random(1, 7) rolls a die.' },
      { type: 'ard_math', message0: '%1 %2 %3', args0: [num('A'), dd('OP', [['+', '+'], ['−', '-'], ['×', '*'], ['÷', '/'], ['%', '%']]), num('B')], inputsInline: true, output: 'Number', colour: HUE.math, tooltip: 'Whole-number maths: 7 ÷ 2 = 3; % is the remainder.' },
      { type: 'ard_compare', message0: '%1 %2 %3', args0: [num('A'), dd('OP', [['==', '=='], ['!=', '!='], ['<', '<'], ['<=', '<='], ['>', '>'], ['>=', '>=']]), num('B')], inputsInline: true, output: 'Number', colour: HUE.math },
      { type: 'ard_logic', message0: '%1 %2 %3', args0: [num('A'), dd('OP', [['&& (and)', 'and'], ['|| (or)', 'or']]), num('B')], inputsInline: true, output: 'Number', colour: HUE.math },
      { type: 'ard_not', message0: '! %1', args0: [num('A')], output: 'Number', colour: HUE.math, tooltip: 'not: true becomes false.' }
    ].map(function (d) {
      if (d.output || /^ard_(setup|loop|function)$/.test(d.type)) return d;
      d.previousStatement = null; d.nextStatement = null;
      return d;
    });
    B.defineBlocksWithJsonArray(defs);
  }

  var shadowNum = function (v) { return { shadow: { type: 'ard_number', fields: { VALUE: v } } }; };
  var DEFAULTS = {
    ard_dwrite: { VALUE: { shadow: { type: 'ard_level', fields: { VALUE: '1' } } } }, ard_awrite: { VALUE: shadowNum(128) },
    ard_delay: { MS: shadowNum(500) }, ard_tone: { FREQ: shadowNum(440), MS: shadowNum(200) }, ard_servo: { ANGLE: shadowNum(90) },
    ard_print: { VALUE: { shadow: { type: 'ard_text' } } }, ard_repeat: { COUNT: shadowNum(3) },
    ard_set: { VALUE: shadowNum(0) }, ard_change: { BY: shadowNum(1) },
    ard_map: { V: shadowNum(512), FL: shadowNum(0), FH: shadowNum(1023), TL: shadowNum(0), TH: shadowNum(255) },
    ard_random: { MIN: shadowNum(1), MAX: shadowNum(7) }, ard_math: { A: shadowNum(1), B: shadowNum(1) },
    ard_compare: { A: shadowNum(0), B: shadowNum(0) }, ard_logic: { A: shadowNum(1), B: shadowNum(1) }, ard_not: { A: shadowNum(0) }
  };
  var PIN_DEFAULT = { ard_dwrite: '13', ard_awrite: '10', ard_pinmode: '13', ard_tone: '8', ard_notone: '8', ard_dread: '2' };
  function entry(type, extra) {
    var e = { kind: 'block', type: type, inputs: DEFAULTS[type] || {} };
    if (PIN_DEFAULT[type]) e.fields = { PIN: PIN_DEFAULT[type] };
    if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; });
    return e;
  }
  function toolbox() {
    var cat = function (name, hue, types) { return { kind: 'category', name: name, colour: hue, contents: types.map(function (t) { return typeof t === 'string' ? entry(t) : t; }) }; };
    var pressed = { kind: 'block', type: 'ard_compare', fields: { OP: '==' }, inputs: { A: { block: { type: 'ard_dread', fields: { PIN: '2' } } }, B: { shadow: { type: 'ard_level', fields: { VALUE: '0' } } } } };
    return { kind: 'categoryToolbox', contents: [
      cat('Pins', HUE.pins, ['ard_pinmode', 'ard_dwrite', 'ard_awrite', 'ard_level', pressed, 'ard_dread', 'ard_aread', 'ard_distance']),
      cat('Time', HUE.time, ['ard_delay', 'ard_millis']),
      cat('Sound & servo', HUE.sound, ['ard_tone', 'ard_notone', 'ard_servo']),
      cat('Serial', HUE.serial, ['ard_begin', 'ard_print', 'ard_text']),
      cat('Control', HUE.control, ['ard_if', 'ard_ifelse', 'ard_repeat', 'ard_while']),
      cat('Math', HUE.math, ['ard_number', 'ard_math', 'ard_compare', 'ard_logic', 'ard_not', 'ard_map', 'ard_random']),
      cat('Variables', HUE.vars, ['ard_set', 'ard_change', 'ard_var']),
      cat('Functions', HUE.fn, ['ard_function', 'ard_call'])
    ] };
  }

  // ---- Blocks -> program -----------------------------------------------------
  function oops(block, msg) { var e = new Error(msg); e.block = block; return e; }
  function valueOf(b, parent, allowText) {
    if (!b) throw oops(parent, 'Empty socket: plug in a number, reading or variable.');
    var f = function (k) { return b.getFieldValue(k); };
    var sub = function (k) { return valueOf(b.getInputTargetBlock(k), b, false); };
    switch (b.type) {
      case 'ard_number': return { kind: 'num', value: Number(f('VALUE')) };
      case 'ard_text': if (!allowText) throw oops(b, 'Text can only go straight into Serial.print.'); return { kind: 'text', value: f('TEXT') };
      case 'ard_level': return { kind: 'level', value: Number(f('VALUE')) };
      case 'ard_dread': return { kind: 'digitalRead', pin: Number(f('PIN')) };
      case 'ard_aread': return { kind: 'analogRead', pin: f('PIN') };
      case 'ard_distance': return { kind: 'distance' };
      case 'ard_millis': return { kind: 'millis' };
      case 'ard_var': return { kind: 'var', name: f('NAME').trim() };
      case 'ard_map': return { kind: 'map', value: sub('V'), fromLow: sub('FL'), fromHigh: sub('FH'), toLow: sub('TL'), toHigh: sub('TH') };
      case 'ard_random': return { kind: 'random', min: sub('MIN'), max: sub('MAX') };
      case 'ard_math': case 'ard_compare': case 'ard_logic': return { kind: 'op', op: f('OP'), left: sub('A'), right: sub('B') };
      case 'ard_not': return { kind: 'not', value: sub('A') };
    }
    throw oops(b, 'This block can’t go in a socket.');
  }
  function chain(b) {
    var out = [];
    for (; b; b = b.getNextBlock()) {
      if (!b.isEnabled()) continue;
      var f = function (k) { return b.getFieldValue(k); };
      var v = function (k) { return valueOf(b.getInputTargetBlock(k), b, false); };
      var body = function (k) { return chain(b.getInputTargetBlock(k)); };
      var s = { id: b.id };
      switch (b.type) {
        case 'ard_pinmode': s.type = 'pinMode'; s.pin = Number(f('PIN')); s.mode = f('MODE'); break;
        case 'ard_dwrite': s.type = 'digitalWrite'; s.pin = Number(f('PIN')); s.value = v('VALUE'); break;
        case 'ard_awrite': s.type = 'analogWrite'; s.pin = Number(f('PIN')); s.value = v('VALUE'); break;
        case 'ard_delay': s.type = 'delay'; s.ms = v('MS'); break;
        case 'ard_tone': s.type = 'tone'; s.pin = Number(f('PIN')); s.freq = v('FREQ'); s.ms = v('MS'); break;
        case 'ard_notone': s.type = 'noTone'; s.pin = Number(f('PIN')); break;
        case 'ard_servo': s.type = 'servo'; s.angle = v('ANGLE'); break;
        case 'ard_begin': s.type = 'serialBegin'; s.baud = Number(f('BAUD')); break;
        case 'ard_print': s.type = 'print'; s.newline = f('MODE') === 'println'; s.value = valueOf(b.getInputTargetBlock('VALUE'), b, true); break;
        case 'ard_call': s.type = 'call'; s.name = f('NAME').trim(); break;
        case 'ard_if': s.type = 'if'; s.cond = v('COND'); s.then = body('THEN'); s['else'] = []; break;
        case 'ard_ifelse': s.type = 'if'; s.cond = v('COND'); s.then = body('THEN'); s['else'] = body('ELSE'); break;
        case 'ard_repeat': s.type = 'repeat'; s.count = v('COUNT'); s.body = body('DO'); break;
        case 'ard_while': s.type = f('MODE'); s.cond = v('COND'); s.body = body('DO'); break;
        case 'ard_set': s.type = 'set'; s.name = f('NAME').trim(); s.value = v('VALUE'); break;
        case 'ard_change': s.type = 'change'; s.name = f('NAME').trim(); s.by = v('BY'); break;
        default: throw oops(b, 'This block can’t go in a stack.');
      }
      // Check this block on its own so a mistake is flagged on the block itself.
      // (Calls are checked against the defined functions once the whole sketch is read.)
      if (s.type !== 'call') {
        try { A.checkProgram({ version: 1, setup: [s], loop: [] }); }
        catch (e) { if (!/no function called/.test(e.message)) throw oops(b, e.message); }
      }
      out.push(s);
    }
    return out;
  }
  function readBlocks() {
    var tops = ws.getTopBlocks(true);
    var setup = tops.filter(function (b) { return b.type === 'ard_setup'; })[0];
    var loop = tops.filter(function (b) { return b.type === 'ard_loop'; })[0];
    if (!setup || !loop) throw new Error('The setup() and loop() blocks must both be on the workspace.');
    var fns = tops.filter(function (b) { return b.type === 'ard_function' && b.isEnabled(); }).map(function (b) {
      return { id: b.id, name: b.getFieldValue('NAME').trim(), body: chain(b.getInputTargetBlock('DO')) };
    });
    var p;
    try {
      p = A.checkProgram({ version: 1, name: $('ast-name').value.trim() || 'My sketch', setup: chain(setup.getInputTargetBlock('DO')), loop: chain(loop.getInputTargetBlock('DO')), functions: fns });
    } catch (e) {
      if (!e.block) {
        var m = /“([^”]+)”/.exec(e.message), hit = null;
        if (m) ws.getAllBlocks(false).some(function (b) { if (/^ard_(call|function|set|change)$/.test(b.type) && b.getFieldValue('NAME').trim() === m[1]) { hit = b; return true; } return false; });
        e.block = hit;
      }
      throw e;
    }
    var loose = tops.filter(function (b) { return !/^ard_(setup|loop|function)$/.test(b.type); }).length;
    return { program: p, loose: loose };
  }

  // ---- Program -> blocks -----------------------------------------------------
  var STMT = { pinMode: 'ard_pinmode', digitalWrite: 'ard_dwrite', analogWrite: 'ard_awrite', delay: 'ard_delay', tone: 'ard_tone', noTone: 'ard_notone', servo: 'ard_servo', serialBegin: 'ard_begin', print: 'ard_print', call: 'ard_call', repeat: 'ard_repeat', set: 'ard_set', change: 'ard_change' };
  function valueState(e) {
    var two = function (t, op, a, b) { return { type: t, fields: { OP: op }, inputs: { A: socket(a), B: socket(b) } }; };
    switch (e.kind) {
      case 'num': return { type: 'ard_number', fields: { VALUE: e.value } };
      case 'text': return { type: 'ard_text', fields: { TEXT: e.value } };
      case 'level': return { type: 'ard_level', fields: { VALUE: String(e.value) } };
      case 'digitalRead': return { type: 'ard_dread', fields: { PIN: String(e.pin) } };
      case 'analogRead': return { type: 'ard_aread', fields: { PIN: e.pin } };
      case 'distance': return { type: 'ard_distance' };
      case 'millis': return { type: 'ard_millis' };
      case 'var': return { type: 'ard_var', fields: { NAME: e.name } };
      case 'not': return { type: 'ard_not', inputs: { A: socket(e.value) } };
      case 'random': return { type: 'ard_random', inputs: { MIN: socket(e.min), MAX: socket(e.max) } };
      case 'map': return { type: 'ard_map', inputs: { V: socket(e.value), FL: socket(e.fromLow), FH: socket(e.fromHigh), TL: socket(e.toLow), TH: socket(e.toHigh) } };
      case 'op':
        if (/^[-+*/%]$/.test(e.op)) return two('ard_math', e.op, e.left, e.right);
        if (e.op === 'and' || e.op === 'or') return two('ard_logic', e.op, e.left, e.right);
        return two('ard_compare', e.op, e.left, e.right);
    }
  }
  function socket(e) {
    if (e.kind === 'num') return shadowNum(e.value);
    if (e.kind === 'level') return { shadow: valueState(e) };
    return { block: valueState(e), shadow: e.kind === 'text' ? { type: 'ard_text' } : { type: 'ard_number', fields: { VALUE: 0 } } };
  }
  function chainState(steps) {
    if (!steps || !steps.length) return null;
    var s = steps[0], st = { type: STMT[s.type], fields: {}, inputs: {} };
    var put = function (k, e) { st.inputs[k] = socket(e); };
    var body = function (k, l) { var c = chainState(l); if (c) st.inputs[k] = { block: c }; };
    if (s.pin != null) st.fields.PIN = String(s.pin);
    switch (s.type) {
      case 'pinMode': st.fields.MODE = s.mode; break;
      case 'digitalWrite': case 'analogWrite': put('VALUE', s.value); break;
      case 'delay': put('MS', s.ms); break;
      case 'tone': put('FREQ', s.freq); put('MS', s.ms); break;
      case 'servo': put('ANGLE', s.angle); break;
      case 'serialBegin': st.fields.BAUD = String(s.baud); break;
      case 'print': st.fields.MODE = s.newline ? 'println' : 'print'; put('VALUE', s.value); break;
      case 'call': st.fields.NAME = s.name; break;
      case 'repeat': put('COUNT', s.count); body('DO', s.body); break;
      case 'while': case 'until': st.type = 'ard_while'; st.fields.MODE = s.type; put('COND', s.cond); body('DO', s.body); break;
      case 'if': st.type = s['else'].length ? 'ard_ifelse' : 'ard_if'; put('COND', s.cond); body('THEN', s.then); if (s['else'].length) body('ELSE', s['else']); break;
      case 'set': st.fields.NAME = s.name; put('VALUE', s.value); break;
      case 'change': st.fields.NAME = s.name; put('BY', s.by); break;
    }
    var rest = chainState(steps.slice(1));
    if (rest) st.next = { block: rest };
    return st;
  }
  function hat(type, steps, x, y, fields) {
    var first = chainState(steps);
    return B.serialization.blocks.append({ type: type, x: x, y: y, fields: fields, deletable: type === 'ard_function', inputs: first ? { DO: { block: first } } : {} }, ws);
  }
  function load(p) {
    p = A.checkProgram(p);
    quiet = true;
    try {
      ws.clear();
      var s = hat('ard_setup', p.setup, 20, 20);
      var gap = 36, y = 20 + s.getHeightWidth().height + gap;
      var l = hat('ard_loop', p.loop, 20, y);
      var x = 20 + Math.max(s.getHeightWidth().width, l.getHeightWidth().width) + 60, fy = 20;
      p.functions.forEach(function (f) { var b = hat('ard_function', f.body, x, fy, { NAME: f.name }); fy += b.getHeightWidth().height + gap; });
      $('ast-name').value = p.name || 'My sketch';
      ws.scroll(10, 10);
    } finally { quiet = false; }
    changed();
  }

  // ---- Editor state ------------------------------------------------------------
  function changed() {
    if (quiet || !ws) return;
    ws.getAllBlocks(false).forEach(function (b) { if (b.setWarningText) b.setWarningText(null); });
    try {
      var r = readBlocks();
      program = r.program;
      $('ast-code').textContent = A.toCpp(program);
      if (!running) note('Ready.' + (r.loose ? ' ' + r.loose + ' loose block group' + (r.loose > 1 ? 's' : '') + ' won’t run: snap them into setup, loop or a function.' : ''), 'ok');
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () { try { localStorage.setItem(STORE, JSON.stringify(strip(program))); } catch (e) { /* Save still works */ } }, 300);
    } catch (e) {
      program = null;
      if (e.block && e.block.setWarningText) { e.block.setWarningText(e.message); e.block.select && e.block.select(); }
      if (!running) note(e.message, 'error');
    }
    refresh();
  }
  function strip(p) { return JSON.parse(JSON.stringify(p, function (k, v) { return k === 'id' ? undefined : v; })); }
  function refresh() {
    var go = $('ast-run');
    go.disabled = !running && !program;
    go.textContent = running ? '■ Stop' : '▶ Upload & run';
    go.setAttribute('aria-pressed', String(!!running));
    $('ast-ino').disabled = !program; $('ast-save').disabled = !program;
    $('ast-power').dataset.on = String(!!running);
    $('ast-power').textContent = running ? 'Running' : 'Stopped';
  }

  // ---- Running -------------------------------------------------------------------
  function showVars(v) {
    var host = $('ast-vars'), keys = Object.keys(v);
    host.textContent = '';
    if (!keys.length) { host.innerHTML = '<div><dt>No variables yet</dt><dd>—</dd></div>'; return; }
    keys.forEach(function (k) {
      var row = document.createElement('div'), dt = document.createElement('dt'), d = document.createElement('dd');
      dt.textContent = 'long ' + k; d.textContent = String(v[k]); row.append(dt, d); host.append(row);
    });
  }
  function warn(msg) {
    warnings.push(msg);
    var li = document.createElement('li'); li.textContent = msg; $('ast-warn').append(li);
    $('ast-warn-box').hidden = false;
  }
  board.onWarn = warn;

  function start() {
    if (running || !program) return;
    var token = { cancelled: false };
    running = token;
    serialText = ''; warnings = [];
    $('ast-warn').textContent = ''; $('ast-warn-box').hidden = true;
    note('Running “' + program.name + '” on the simulated UNO…', 'busy');
    refresh();
    unlockAudio();
    A.run(program, board, {
      now: function () { return performance.now(); },
      cancelled: function () { return token.cancelled; },
      sleep: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); },
      step: function (id) { currentId = id; },
      vars: showVars
    }).then(function (r) {
      running = null;
      serialText = board.serial.text;
      board.reset();
      currentId = null;
      if (ws) ws.highlightBlock(null);
      note(r.message, r.ok ? 'ok' : 'error');
      refresh();
    });
  }
  function stop() { if (running) running.cancelled = true; }

  // ---- The board view --------------------------------------------------------------
  var art = null;
  if (window.ArduinoArt) {
    art = ArduinoArt.svg('uno-r3', { labels: false, title: 'Arduino UNO R3' });
    $('ast-uno').append(art.svg);
  }
  var last = {};
  function set(key, value, fn) { if (last[key] !== value) { last[key] = value; fn(value); } }
  function render() {
    set('L', board.led(13) > 0.5, function (on) { if (art) art.setLed('L', on); $('ast-led-13').style.setProperty('--glow', on ? 1 : 0); });
    [[10, 'red'], [6, 'green']].forEach(function (p) {
      var v = Math.round(board.led(p[0]) * 100) / 100;
      set('led' + p[0], v, function (x) { $('ast-led-' + p[0]).style.setProperty('--glow', x); $('ast-led-' + p[0] + '-v').textContent = x ? Math.round(x * 100) + '%' : 'off'; });
    });
    set('servo', board.servo.angle, function (a) { $('ast-servo-arm').setAttribute('transform', 'rotate(' + (a - 90) + ' 50 50)'); $('ast-servo-v').textContent = a + '°'; });
    var f = board.playing();
    set('tone', f, function (hz) { $('ast-buzz-v').textContent = hz ? '♪ ' + hz + ' Hz' : 'silent'; $('ast-buzz').dataset.on = String(!!hz); sound(hz); });
    set('serial', running ? board.serial.text : serialText, function (t) {
      var out = $('ast-serial'), stick = out.scrollTop + out.clientHeight >= out.scrollHeight - 8;
      out.textContent = t; if (stick) out.scrollTop = out.scrollHeight;
      if (art && running) art.pulse('TX', 60);
    });
    var pins = A.DIGITAL.map(function (p) { var s = board.pins[p]; return p + s.mode[0] + (s.mode === 'OUTPUT' ? (s.pwm != null ? '~' + s.pwm : s.level) : ''); }).join(' ');
    set('pins', pins, function () {
      A.DIGITAL.forEach(function (p) {
        var s = board.pins[p], cell = $('ast-pin-' + p);
        cell.dataset.mode = s.mode;
        cell.querySelector('b').textContent = s.mode === 'OUTPUT' ? (s.pwm != null ? '~' + s.pwm : s.level ? 'HIGH' : 'LOW') : s.mode === 'INPUT_PULLUP' ? 'PULLUP' : 'IN';
      });
    });
    if (ws && running && currentId !== shownId) { shownId = currentId; ws.highlightBlock(currentId); }
  }
  // Pin strip
  A.DIGITAL.forEach(function (p) {
    var cell = document.createElement('div');
    cell.className = 'ast-pin'; cell.id = 'ast-pin-' + p;
    cell.innerHTML = '<span>' + (A.PWM.indexOf(p) >= 0 ? '~' : '') + p + '</span><b>IN</b>';
    cell.title = 'Pin ' + p + (PART[p] ? ': ' + PART[p] : '');
    $('ast-pins').append(cell);
  });
  if (window.SimKit && SimKit.loop) SimKit.loop(render, { el: SimKit.stage($('ast-board')) });
  else (function tick() { render(); requestAnimationFrame(tick); })();

  // Inputs
  var btn = $('ast-button');
  var press = function (on) { board.inputs.button = on; btn.setAttribute('aria-pressed', String(on)); };
  btn.addEventListener('pointerdown', function (e) { e.preventDefault(); if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId); press(true); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { btn.addEventListener(ev, function () { press(false); }); });
  btn.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press(true); } });
  btn.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') press(false); });
  btn.addEventListener('blur', function () { press(false); });
  [['ast-pot', 'pot', function (v) { return v; }], ['ast-light', 'light', function (v) { return v; }], ['ast-dist', 'distance', function (v) { return v + ' cm'; }]].forEach(function (r) {
    var input = $(r[0]), out = $(r[0] + '-v');
    var upd = function () { board.inputs[r[1]] = Number(input.value); out.textContent = r[2](input.value); };
    input.addEventListener('input', upd); upd();
  });

  // Buzzer sound (off until a student turns it on)
  var audio = null, osc = null;
  function unlockAudio() {
    if (!$('ast-sound').checked) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!audio && AC) audio = new AC();
    if (audio && audio.state === 'suspended') audio.resume();
  }
  function sound(hz) {
    if (osc) { try { osc.stop(); } catch (e) { /* already stopped */ } osc = null; }
    if (!hz || !$('ast-sound').checked || !audio) return;
    osc = audio.createOscillator();
    var g = audio.createGain();
    osc.type = 'square'; osc.frequency.value = hz; g.gain.value = 0.04;
    osc.connect(g).connect(audio.destination); osc.start();
  }
  $('ast-sound').addEventListener('change', function () { if (this.checked) unlockAudio(); else sound(0); last.tone = -1; });

  // ---- Editor setup (lazy) -----------------------------------------------------------
  function boot() {
    if (ws || loading) return;
    loading = true;
    var go = function () {
      B = window.Blockly;
      if (!B) { note('The block editor didn’t load. Reload the page to try again.', 'error'); return; }
      defineBlocks();
      var host = $('ast-blocks');
      host.textContent = '';
      ws = B.inject(host, {
        toolbox: toolbox(), renderer: 'zelos', sounds: false, trashcan: true, maxBlocks: A.LIMITS.maxBlocks,
        media: vendor + 'blockly-media/', zoom: { controls: true, wheel: false, startScale: 0.68, minScale: 0.35, maxScale: 1.5 },
        move: { scrollbars: true, drag: true, wheel: true }
      });
      host.querySelectorAll('.blocklyToolboxCategory[id]').forEach(function (row) { if (row.parentElement && row.parentElement.id === row.id) row.removeAttribute('id'); });
      ws.addChangeListener(function (e) { if (!e.isUiEvent) changed(); });
      var saved = null;
      try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
      try { load(saved || A.STARTERS.blink.program); } catch (e) { load(A.STARTERS.blink.program); }
      var resize = function () { B.svgResize(ws); };
      window.addEventListener('resize', resize);
      document.addEventListener('creation-app-resize', resize);
    };
    if (window.Blockly) { go(); return; }
    var s = document.createElement('script');
    s.src = vendor + 'blockly.min.js';
    s.onload = go;
    s.onerror = function () { loading = false; note('The block editor didn’t load. Check the connection and reload.', 'error'); };
    document.head.appendChild(s);
  }
  if ('IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { seen.disconnect(); boot(); } });
    seen.observe(root);
  } else boot();

  // ---- Toolbar ---------------------------------------------------------------------
  Object.keys(A.STARTERS).forEach(function (k) { $('ast-starter').add(new Option(A.STARTERS[k].label, k)); });
  $('ast-starter').addEventListener('change', function () {
    var k = this.value; this.value = '';
    if (!k || !ws) return;
    stop();
    load(A.STARTERS[k].program);
    $('ast-about').textContent = A.STARTERS[k].about;
  });
  document.querySelectorAll('[data-ard-starter]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var k = a.getAttribute('data-ard-starter');
      root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      boot();
      (function wait() {
        if (!ws) { setTimeout(wait, 100); return; }
        stop(); load(A.STARTERS[k].program); $('ast-about').textContent = A.STARTERS[k].about;
      })();
    });
  });
  $('ast-run').addEventListener('click', function () { if (running) stop(); else start(); });
  $('ast-name').addEventListener('input', changed);
  $('ast-clear').addEventListener('click', function () { serialText = ''; board.serial.text = ''; });
  function download(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function slug() { return ($('ast-name').value.trim() || 'my_sketch').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'my_sketch'; }
  $('ast-save').addEventListener('click', function () { if (program) download(slug() + '.sketch.json', JSON.stringify(strip(program), null, 2), 'application/json'); });
  $('ast-ino').addEventListener('click', function () { if (program) download(slug() + '.ino', A.toCpp(program), 'text/plain'); });
  $('ast-open').addEventListener('change', function () {
    var file = this.files && this.files[0]; this.value = '';
    if (!file || !ws) return;
    if (file.size > 300000) { note('That file is too big to be a sketch.', 'error'); return; }
    file.text().then(function (t) { stop(); load(JSON.parse(t)); note('Opened ' + file.name + '.', 'ok'); })
      .catch(function (e) { note('Couldn’t open ' + file.name + ': ' + e.message, 'error'); });
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) sound(0); });
  showVars({});
  refresh();
})();
