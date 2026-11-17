/* Robot Car Pilot: the Code studio (#rc-studio).
   Blocks (Blockly, loaded when the studio first comes near the screen) become a
   program in assets/js/elegoo-program.js's JSON format, which runs live through
   the cockpit's connection (simulator, Bluetooth, Wi-Fi or USB) and is also
   written out as an Arduino sketch. The cockpit (robot-car-pilot.js) owns the
   connection and the safety stop; it exposes them as window.RobotCarPilot. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var root = $('rc-studio'), P = window.ElegooProgram, pilot = window.RobotCarPilot;
  if (!root || !P || !pilot) return;

  var STORE = 'rc-studio-v1';
  var here = (document.currentScript && document.currentScript.src) || location.href;
  var vendor = new URL('../../vendor/', here).href;
  var ws = null, B = null, loading = false, running = null, program = null, problem = null, saveTimer = 0;
  var status = $('rcs-status'), out = $('rcs-out'), code = $('rcs-code'), vars = $('rcs-vars');

  function note(text, kind) { status.textContent = text; status.dataset.kind = kind || ''; }

  // ---- Blocks ----------------------------------------------------------------
  var DIRS = [['forward', 'forward'], ['backward', 'backward'], ['spin left', 'left'], ['spin right', 'right']];
  var SIDES = [['left', 'L'], ['middle', 'M'], ['right', 'R']];
  var COLORS = Object.keys(P.COLORS).map(function (c) { return [c === 'random' ? 'a random colour' : c, c]; });
  var HUE = { drive: 25, car: 290, control: 120, sensors: 190, math: 230, vars: 330 };
  var num = function (name) { return { type: 'input_value', name: name, check: 'Number' }; };
  var any = function (name) { return { type: 'input_value', name: name }; };
  var dd = function (name, options) { return { type: 'field_dropdown', name: name, options: options }; };
  var text = function (name, value) { return { type: 'field_input', name: name, text: value }; };
  var stack = function (name) { return { type: 'input_statement', name: name }; };

  function defineBlocks() {
    var defs = [
      { type: 'car_start', message0: 'when ▶ Run is pressed %1 %2', args0: [{ type: 'input_dummy' }, stack('DO')], colour: HUE.control, tooltip: 'The program starts here. Blocks not attached under it do not run.' },
      { type: 'car_drive', message0: 'drive %1 at speed %2 for %3 seconds', args0: [dd('DIR', DIRS), num('SPEED'), num('SECS')], colour: HUE.drive, tooltip: 'Drive, then stop. Speed is 0–255 (PWM), not cm/s.' },
      { type: 'car_go', message0: 'start driving %1 at speed %2', args0: [dd('DIR', DIRS), num('SPEED')], colour: HUE.drive, tooltip: 'Keep driving while the next blocks run, until a stop or another drive.' },
      { type: 'car_curve', message0: 'curve: left wheels %1 right wheels %2 for %3 seconds', args0: [num('LEFT'), num('RIGHT'), num('SECS')], colour: HUE.drive, inputsInline: false, tooltip: 'Each side forward at its own speed. The slower side is the inside of the turn.' },
      { type: 'car_stop', message0: 'stop', colour: HUE.drive },
      { type: 'car_light', message0: 'set light to %1', args0: [dd('COLOR', COLORS)], colour: HUE.car },
      { type: 'car_head', message0: 'turn head to %1 °', args0: [num('ANGLE')], colour: HUE.car, tooltip: '90 looks straight ahead, 170 left, 10 right. The car pauses about half a second.' },
      { type: 'car_say', message0: 'show %1', args0: [any('VALUE')], colour: HUE.car, tooltip: 'Write a value in the Output panel.' },
      { type: 'car_wait', message0: 'wait %1 seconds', args0: [num('SECS')], colour: HUE.control, tooltip: 'Pause. A car that is driving keeps driving.' },
      { type: 'car_repeat', message0: 'repeat %1 times %2 %3', args0: [num('COUNT'), { type: 'input_dummy' }, stack('DO')], colour: HUE.control },
      { type: 'car_forever', message0: 'forever %1 %2', args0: [{ type: 'input_dummy' }, stack('DO')], colour: HUE.control, tooltip: 'Runs until Stop (or the 2-minute time limit).' },
      { type: 'car_while', message0: '%1 %2 %3 %4', args0: [dd('MODE', [['repeat while', 'while'], ['repeat until', 'until']]), any('COND'), { type: 'input_dummy' }, stack('DO')], colour: HUE.control },
      { type: 'car_if', message0: 'if %1 then %2 %3', args0: [any('COND'), { type: 'input_dummy' }, stack('THEN')], colour: HUE.control },
      { type: 'car_ifelse', message0: 'if %1 then %2 %3 else %4 %5', args0: [any('COND'), { type: 'input_dummy' }, stack('THEN'), { type: 'input_dummy' }, stack('ELSE')], colour: HUE.control },
      { type: 'car_distance', message0: 'distance ahead (cm)', output: 'Number', colour: HUE.sensors, tooltip: 'Ultrasonic echo, in the direction the head points.' },
      { type: 'car_on_line', message0: '%1 line sensor sees tape', args0: [dd('SIDE', SIDES)], output: 'Boolean', colour: HUE.sensors },
      { type: 'car_line', message0: '%1 line sensor reading', args0: [dd('SIDE', SIDES)], output: 'Number', colour: HUE.sensors, tooltip: '0–1023. The factory code counts 250–850 as tape.' },
      { type: 'car_timer', message0: 'seconds since start', output: 'Number', colour: HUE.sensors },
      { type: 'car_number', message0: '%1', args0: [{ type: 'field_number', name: 'VALUE', value: 0, min: -100000, max: 100000 }], output: 'Number', colour: HUE.math },
      { type: 'car_math', message0: '%1 %2 %3', args0: [num('A'), dd('OP', [['+', '+'], ['−', '-'], ['×', '*'], ['÷', '/'], ['remainder', '%']]), num('B')], inputsInline: true, output: 'Number', colour: HUE.math },
      { type: 'car_compare', message0: '%1 %2 %3', args0: [num('A'), dd('OP', [['<', '<'], ['≤', '<='], ['>', '>'], ['≥', '>='], ['=', '=='], ['≠', '!=']]), num('B')], inputsInline: true, output: 'Boolean', colour: HUE.math },
      { type: 'car_logic', message0: '%1 %2 %3', args0: [any('A'), dd('OP', [['and', 'and'], ['or', 'or']]), any('B')], inputsInline: true, output: 'Boolean', colour: HUE.math },
      { type: 'car_not', message0: 'not %1', args0: [any('A')], output: 'Boolean', colour: HUE.math },
      { type: 'car_random', message0: 'random from %1 to %2', args0: [num('A'), num('B')], inputsInline: true, output: 'Number', colour: HUE.math },
      { type: 'car_set', message0: 'set %1 to %2', args0: [text('NAME', 'score'), any('VALUE')], colour: HUE.vars },
      { type: 'car_change', message0: 'change %1 by %2', args0: [text('NAME', 'score'), num('BY')], colour: HUE.vars },
      { type: 'car_var', message0: '%1', args0: [text('NAME', 'score')], output: 'Number', colour: HUE.vars }
    ].map(function (d) {
      if (d.output || d.type === 'car_start') return d;
      d.previousStatement = null;
      if (d.type !== 'car_forever') d.nextStatement = null;
      return d;
    });
    B.defineBlocksWithJsonArray(defs);
  }

  var DEFAULTS = {
    car_drive: { SPEED: 150, SECS: 1 }, car_go: { SPEED: 130 }, car_curve: { LEFT: 60, RIGHT: 140, SECS: 1 },
    car_head: { ANGLE: 90 }, car_say: { VALUE: 0 }, car_wait: { SECS: 1 }, car_repeat: { COUNT: 4 },
    car_math: { A: 1, B: 1 }, car_compare: { A: 0, B: 25 }, car_random: { A: 1, B: 6 }, car_set: { VALUE: 0 }, car_change: { BY: 1 }
  };
  var shadow = function (v) { return { shadow: { type: 'car_number', fields: { VALUE: v } } }; };
  function entry(type, extra) {
    var inputs = {}, d = DEFAULTS[type] || {};
    Object.keys(d).forEach(function (k) { inputs[k] = shadow(d[k]); });
    var e = { kind: 'block', type: type, inputs: inputs };
    if (extra) for (var k in extra) e[k] = extra[k];
    return e;
  }
  function toolbox() {
    var cat = function (name, hue, contents) { return { kind: 'category', name: name, colour: hue, contents: contents }; };
    var distLess = { kind: 'block', type: 'car_compare', fields: { OP: '<' }, inputs: { A: { block: { type: 'car_distance' } }, B: shadow(25) } };
    return { kind: 'categoryToolbox', contents: [
      cat('Drive', HUE.drive, ['car_drive', 'car_go', 'car_curve', 'car_stop'].map(function (t) { return entry(t); })),
      cat('Light & head', HUE.car, ['car_light', 'car_head', 'car_say'].map(function (t) { return entry(t); })),
      cat('Control', HUE.control, ['car_wait', 'car_repeat', 'car_forever', 'car_while', 'car_if', 'car_ifelse'].map(function (t) { return entry(t); })),
      cat('Sensors', HUE.sensors, [entry('car_distance'), distLess, entry('car_on_line'), entry('car_line'), entry('car_timer')]),
      cat('Math', HUE.math, ['car_number', 'car_math', 'car_compare', 'car_logic', 'car_not', 'car_random'].map(function (t) { return entry(t); })),
      cat('Variables', HUE.vars, ['car_set', 'car_change', 'car_var'].map(function (t) { return entry(t); }))
    ] };
  }

  // ---- Blocks -> program -------------------------------------------------------
  function oops(block, msg) { var e = new Error(msg); e.block = block; return e; }

  function valueOf(b, parent, socket) {
    if (!b) throw oops(parent, 'Empty socket' + (socket ? ' (' + socket + ')' : '') + ': plug in a number, sensor or variable.');
    var f = function (k) { return b.getFieldValue(k); };
    var sub = function (k) { return valueOf(b.getInputTargetBlock(k), b, k); };
    switch (b.type) {
      case 'car_number': return { kind: 'num', value: Number(f('VALUE')) };
      case 'car_distance': return { kind: 'distance' };
      case 'car_timer': return { kind: 'timer' };
      case 'car_line': return { kind: 'line', side: f('SIDE') };
      case 'car_on_line': return { kind: 'onLine', side: f('SIDE') };
      case 'car_var': return { kind: 'var', name: f('NAME').trim() };
      case 'car_math': case 'car_compare': case 'car_logic': return { kind: 'op', op: f('OP'), left: sub('A'), right: sub('B') };
      case 'car_not': return { kind: 'not', value: sub('A') };
      case 'car_random': return { kind: 'random', min: sub('A'), max: sub('B') };
    }
    throw oops(b, 'This block cannot go in a socket.');
  }

  function chain(b) {
    var steps = [];
    for (; b; b = b.getNextBlock()) {
      if (!b.isEnabled()) continue;
      var f = function (k) { return b.getFieldValue(k); };
      var v = function (k) { return valueOf(b.getInputTargetBlock(k), b, k.toLowerCase()); };
      var body = function (k) { return chain(b.getInputTargetBlock(k)); };
      var s = { id: b.id };
      switch (b.type) {
        case 'car_drive': s.type = 'drive'; s.dir = f('DIR'); s.speed = v('SPEED'); s.secs = v('SECS'); break;
        case 'car_go': s.type = 'go'; s.dir = f('DIR'); s.speed = v('SPEED'); break;
        case 'car_curve': s.type = 'curve'; s.left = v('LEFT'); s.right = v('RIGHT'); s.secs = v('SECS'); break;
        case 'car_stop': s.type = 'stop'; break;
        case 'car_light': s.type = 'light'; s.color = f('COLOR'); break;
        case 'car_head': s.type = 'head'; s.angle = v('ANGLE'); break;
        case 'car_say': s.type = 'say'; s.value = v('VALUE'); break;
        case 'car_wait': s.type = 'wait'; s.secs = v('SECS'); break;
        case 'car_repeat': s.type = 'repeat'; s.count = v('COUNT'); s.body = body('DO'); break;
        case 'car_forever': s.type = 'forever'; s.body = body('DO'); break;
        case 'car_while': s.type = f('MODE'); s.cond = v('COND'); s.body = body('DO'); break;
        case 'car_if': s.type = 'if'; s.cond = v('COND'); s.then = body('THEN'); s['else'] = []; break;
        case 'car_ifelse': s.type = 'if'; s.cond = v('COND'); s.then = body('THEN'); s['else'] = body('ELSE'); break;
        case 'car_set': s.type = 'set'; s.name = f('NAME').trim(); s.value = v('VALUE'); break;
        case 'car_change': s.type = 'change'; s.name = f('NAME').trim(); s.by = v('BY'); break;
        default: throw oops(b, 'This block cannot go in a stack.');
      }
      if ((s.type === 'set' || s.type === 'change') && !/^[A-Za-z_][A-Za-z0-9_]{0,19}$/.test(s.name)) throw oops(b, '“' + s.name + '” is not a usable name: letters, digits and _, starting with a letter.');
      steps.push(s);
    }
    return steps;
  }

  function readBlocks() {
    var start = ws.getTopBlocks(false).filter(function (b) { return b.type === 'car_start'; })[0];
    if (!start) throw new Error('The “when ▶ Run is pressed” block is missing.');
    var p = P.checkProgram({ version: 1, name: $('rcs-name').value.trim() || 'My program', steps: chain(start.getInputTargetBlock('DO')) });
    var loose = ws.getTopBlocks(false).length - 1;
    return { program: p, loose: loose };
  }

  // ---- Program -> blocks -------------------------------------------------------
  var STMT = { drive: 'car_drive', go: 'car_go', curve: 'car_curve', stop: 'car_stop', light: 'car_light', head: 'car_head', say: 'car_say', wait: 'car_wait', repeat: 'car_repeat', forever: 'car_forever', set: 'car_set', change: 'car_change' };
  function valueState(e) {
    var two = function (type, op, a, b) { return { type: type, fields: { OP: op }, inputs: { A: socket(a), B: socket(b) } }; };
    switch (e.kind) {
      case 'num': return { type: 'car_number', fields: { VALUE: e.value } };
      case 'bool': return { type: 'car_compare', fields: { OP: '==' }, inputs: { A: shadow(1), B: shadow(e.value ? 1 : 0) } };
      case 'distance': return { type: 'car_distance' };
      case 'timer': return { type: 'car_timer' };
      case 'line': return { type: 'car_line', fields: { SIDE: e.side } };
      case 'onLine': return { type: 'car_on_line', fields: { SIDE: e.side } };
      case 'var': return { type: 'car_var', fields: { NAME: e.name } };
      case 'not': return { type: 'car_not', inputs: { A: socket(e.value) } };
      case 'random': return { type: 'car_random', inputs: { A: socket(e.min), B: socket(e.max) } };
      case 'op':
        if (/^[-+*/%]$/.test(e.op)) return two('car_math', e.op, e.left, e.right);
        if (e.op === 'and' || e.op === 'or') return two('car_logic', e.op, e.left, e.right);
        return two('car_compare', e.op, e.left, e.right);
    }
  }
  function socket(e) { return e.kind === 'num' ? shadow(e.value) : { block: valueState(e), shadow: { type: 'car_number', fields: { VALUE: 0 } } }; }
  function chainState(steps) {
    if (!steps || !steps.length) return null;
    var s = steps[0], st = { type: STMT[s.type], fields: {}, inputs: {} };
    var put = function (k, e) { st.inputs[k] = socket(e); };
    var body = function (k, list) { var c = chainState(list); if (c) st.inputs[k] = { block: c }; };
    switch (s.type) {
      case 'drive': st.fields.DIR = s.dir; put('SPEED', s.speed); put('SECS', s.secs); break;
      case 'go': st.fields.DIR = s.dir; put('SPEED', s.speed); break;
      case 'curve': put('LEFT', s.left); put('RIGHT', s.right); put('SECS', s.secs); break;
      case 'light': st.fields.COLOR = s.color; break;
      case 'head': put('ANGLE', s.angle); break;
      case 'say': put('VALUE', s.value); break;
      case 'wait': put('SECS', s.secs); break;
      case 'repeat': put('COUNT', s.count); body('DO', s.body); break;
      case 'forever': body('DO', s.body); break;
      case 'while': case 'until': st.type = 'car_while'; st.fields.MODE = s.type; put('COND', s.cond); body('DO', s.body); break;
      case 'if':
        st.type = s['else'].length ? 'car_ifelse' : 'car_if';
        put('COND', s.cond); body('THEN', s.then); if (s['else'].length) body('ELSE', s['else']);
        break;
      case 'set': st.fields.NAME = s.name; put('VALUE', s.value); break;
      case 'change': st.fields.NAME = s.name; put('BY', s.by); break;
    }
    var rest = chainState(steps.slice(1));
    if (rest) st.next = { block: rest };
    return st;
  }

  var quiet = false;
  function load(p) {
    p = P.checkProgram(p);
    quiet = true;
    try {
      ws.clear();
      var first = chainState(p.steps);
      B.serialization.blocks.append({ type: 'car_start', x: 24, y: 24, deletable: false, inputs: first ? { DO: { block: first } } : {} }, ws);
      $('rcs-name').value = p.name || 'My program';
      ws.scrollCenter();
    } finally { quiet = false; }
    changed();
  }

  // ---- Editor state ----------------------------------------------------------
  function changed() {
    if (quiet || !ws) return;
    ws.getAllBlocks(false).forEach(function (b) { if (b.setWarningText) b.setWarningText(null); });
    try {
      var r = readBlocks();
      program = r.program; problem = null;
      code.textContent = P.toArduino(program);
      if (!running) note('Ready.' + (r.loose ? ' ' + r.loose + ' block group' + (r.loose > 1 ? 's are' : ' is') + ' not attached under “when ▶ Run is pressed” and will not run.' : ''), 'ok');
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () { try { localStorage.setItem(STORE, JSON.stringify(program)); } catch (e) { /* storage off: Save still works */ } }, 300);
    } catch (e) {
      program = null; problem = e;
      if (e.block && e.block.setWarningText) e.block.setWarningText(e.message);
      if (!running) note(e.message, 'error');
    }
    refresh();
  }

  function refresh() {
    var car = pilot.car(), real = car && pilot.kind() !== 'sim';
    $('rcs-ready-row').hidden = !real;
    $('rcs-run').disabled = !running && (!car || !program || (real && !$('rcs-ready').checked) || !ws);
    $('rcs-run').textContent = running ? '■ Stop' : '▶ Run';
    $('rcs-run').setAttribute('aria-pressed', String(!!running));
    $('rcs-ino').disabled = !program;
    $('rcs-save').disabled = !program;
    $('rcs-cap').textContent = pilot.speed();
    var sim = pilot.kind() === 'sim';
    $('rc-studio-sim').hidden = !sim;
    $('rcs-where').textContent = !car ? 'Not connected. Choose a connection at the top of the cockpit.'
      : sim ? 'Running on the simulator room (same room as the cockpit).'
      : 'Connected to the real car by ' + pilot.kind() + '. Watch the car, not the screen.';
  }

  // ---- Running ---------------------------------------------------------------
  function showVars(v) {
    var keys = Object.keys(v);
    vars.innerHTML = '';
    if (!keys.length) { vars.innerHTML = '<div><dt>No variables yet</dt><dd>—</dd></div>'; return; }
    keys.forEach(function (k) {
      var row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = k; dd.textContent = typeof v[k] === 'number' ? String(Math.round(v[k] * 1000) / 1000) : String(v[k]);
      row.append(dt, dd); vars.append(row);
    });
  }
  function say(line) {
    var lines = (out.textContent ? out.textContent.split('\n') : []).concat(line).slice(-60);
    out.textContent = lines.join('\n');
    out.scrollTop = out.scrollHeight;
  }

  function start() {
    if (running || !program) return;
    var car = pilot.car();
    if (!car) return;
    var token = { cancelled: false };
    running = token;
    out.textContent = ''; showVars({});
    pilot.begin(function () { token.cancelled = true; });
    note('Running “' + program.name + '”…', 'busy');
    refresh();
    var io = {
      now: function () { return performance.now(); },
      cancelled: function () { return token.cancelled || pilot.car() !== car; },
      send: function (c) { pilot.sent(c); return car.send(c); },
      ask: function (c, ms) { return car.ask(c, ms); },
      sleep: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); },
      step: function (id) { if (ws) ws.highlightBlock(id); },
      say: function (s) { say(s); pilot.log('show ' + s); },
      vars: showVars
    };
    P.run(program, io, { maxSpeed: pilot.speed() }).then(function (r) {
      if (running !== token) return;
      running = null;
      pilot.end();
      if (ws) ws.highlightBlock(null);
      showVars(r.vars);
      note(r.message + ' (' + r.secs.toFixed(1) + ' s)', r.ok ? 'ok' : 'error');
      pilot.announce(r.message);
      refresh();
    });
  }
  function stop() { if (running) { running.cancelled = true; pilot.stop(); } }

  // ---- Editor setup (lazy) ---------------------------------------------------
  function boot() {
    if (ws || loading) return;
    loading = true;
    var go = function () {
      B = window.Blockly;
      if (!B) { note('The block editor did not load. Reload the page to try again.', 'error'); return; }
      defineBlocks();
      var host = $('rcs-blocks');
      host.textContent = '';
      ws = B.inject(host, {
        toolbox: toolbox(), renderer: 'zelos', sounds: false, trashcan: true, maxBlocks: P.LIMITS.maxBlocks,
        media: vendor + 'blockly-media/',
        zoom: { controls: true, wheel: false, startScale: 0.72, minScale: 0.35, maxScale: 1.5 },
        move: { scrollbars: true, drag: true, wheel: true }
      });
      // Blockly gives a category row and its label the same id; keep ids unique.
      host.querySelectorAll('.blocklyToolboxCategory[id]').forEach(function (row) { if (row.parentElement && row.parentElement.id === row.id) row.removeAttribute('id'); });
      ws.addChangeListener(function (e) { if (!e.isUiEvent) changed(); });
      var saved = null;
      try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
      try { load(saved || P.STARTERS.square.program); } catch (e) { load(P.STARTERS.square.program); }
      var resize = function () { B.svgResize(ws); };
      window.addEventListener('resize', resize);
      document.addEventListener('creation-app-resize', resize);
    };
    if (window.Blockly) { go(); return; }
    var s = document.createElement('script');
    s.src = vendor + 'blockly.min.js';
    s.onload = go;
    s.onerror = function () { note('The block editor did not load. Check the connection and reload.', 'error'); };
    document.head.appendChild(s);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); boot(); }
    }, { rootMargin: '300px 0px' });
    io.observe(root);
  } else boot();

  // ---- Toolbar ---------------------------------------------------------------
  Object.keys(P.STARTERS).forEach(function (k) { $('rcs-starter').add(new Option(P.STARTERS[k].label, k)); });
  $('rcs-starter').addEventListener('change', function () {
    var k = this.value; this.value = '';
    if (!k || !ws || running) return;
    load(P.STARTERS[k].program);
    $('rcs-about').textContent = P.STARTERS[k].about;
  });
  $('rcs-run').addEventListener('click', function () { if (running) stop(); else start(); });
  $('rcs-ready').addEventListener('change', refresh);
  $('rcs-name').addEventListener('input', changed);
  function download(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function slug() { return ($('rcs-name').value.trim() || 'my_program').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'my_program'; }
  $('rcs-save').addEventListener('click', function () {
    if (!program) return;
    var clean = JSON.parse(JSON.stringify(program, function (k, v) { return k === 'id' ? undefined : v; }));
    download(slug() + '.car.json', JSON.stringify(clean, null, 2), 'application/json');
  });
  $('rcs-open').addEventListener('change', function () {
    var file = this.files && this.files[0]; this.value = '';
    if (!file || !ws) return;
    if (file.size > 200000) { note('That file is too big to be a car program.', 'error'); return; }
    file.text().then(function (t) { load(JSON.parse(t)); note('Opened ' + file.name + '.', 'ok'); })
      .catch(function (e) { note('Could not open ' + file.name + ': ' + e.message, 'error'); });
  });
  $('rcs-ino').addEventListener('click', function () { if (program) download(slug() + '.ino', P.toArduino(program), 'text/plain'); });
  var fromMission = $('rc-to-studio');
  if (fromMission) fromMission.addEventListener('click', function () {
    boot();
    var steps = pilot.missionSteps();
    (function wait() {
      if (!ws) { setTimeout(wait, 100); return; }
      load(P.fromSteps(steps, pilot.speed()));
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      note('Your mission is now blocks. Wrap the moves in a repeat, or add a sensor check.', 'ok');
    })();
  });

  // ---- Simulator preview -----------------------------------------------------
  var cv = $('rc-studio-sim');
  if (window.SimKit && SimKit.loop) SimKit.loop(function () { if (pilot.kind() === 'sim') pilot.drawInto(cv); }, { el: SimKit.stage(cv) });
  $('rcs-reset').addEventListener('click', function () { stop(); pilot.resetSim(); });
  pilot.onChange(function () {
    if (running && !pilot.car()) stop();
    $('rcs-ready').checked = false;
    refresh();
  });
  $('rc-speed').addEventListener('input', refresh);
  showVars({});
  refresh();
})();
