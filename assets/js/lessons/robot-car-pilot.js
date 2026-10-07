/* Robot Car Pilot: the cockpit for lessons/engineering/robotics/robot-car-pilot.html.
   Connects to an ELEGOO Smart Robot Car V4.0 (or the simulator) through
   assets/js/elegoo-car.js, then drives it from a joystick, the keyboard, a
   gamepad, or a list of mission steps, and reads its sensors. */
(function () {
  'use strict';
  var E = window.ElegooCar;
  var $ = function (id) { return document.getElementById(id); };
  if (!E || !$('rc-cockpit')) return;

  var pendingWrites = [];
  var connectionAttempt = 0;
  var inputLocked = false;
  function cancelPending() {
    pendingWrites.splice(0).forEach(function (p) { clearTimeout(p.timer); p.resolve(); });
  }

  var RESEND_MS = 250;     // repeat drive commands; the Wi-Fi bridge stops the car after 1 s of silence
  var state = {
    car: null, kind: null, link: null,
    stick: { x: 0, y: 0, active: false },
    keys: {}, pad: null,
    lastSent: '', lastSentAt: 0, moving: false,
    mission: false, latency: 0, polling: false, mode: 'standby'
  };

  // ---- Simulator room --------------------------------------------------------
  var loopLine = [];
  for (var i = 0; i <= 48; i++) {
    var a = i / 48 * Math.PI * 2;
    loopLine.push({ x: 205 + Math.cos(a) * 70, y: 100 + Math.sin(a) * 55 * (1 + 0.25 * Math.sin(2 * a)) });
  }
  var sim = new E.SimCar({
    room: { w: 300, h: 200 },
    walls: [{ x: 70, y: 0, w: 10, h: 70 }, { x: 70, y: 130, w: 10, h: 70 }],
    line: loopLine
  });
  var canvas = $('rc-sim'), ctx = canvas.getContext('2d');

  function drawSim() {
    var W = canvas.width, H = canvas.height, s = W / sim.room.w;
    var css = getComputedStyle(document.documentElement);
    ctx.save();
    ctx.fillStyle = '#e9e4d8'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(18,32,42,.08)'; ctx.lineWidth = 1;
    for (var gx = 0; gx <= sim.room.w; gx += 20) { ctx.beginPath(); ctx.moveTo(gx * s, 0); ctx.lineTo(gx * s, H); ctx.stroke(); }
    for (var gy = 0; gy <= sim.room.h; gy += 20) { ctx.beginPath(); ctx.moveTo(0, gy * s); ctx.lineTo(W, gy * s); ctx.stroke(); }
    // Tape line
    ctx.strokeStyle = '#1b1f22'; ctx.lineWidth = 2.5 * s; ctx.lineJoin = 'round';
    ctx.beginPath(); loopLine.forEach(function (p, k) { ctx[k ? 'lineTo' : 'moveTo'](p.x * s, p.y * s); }); ctx.stroke();
    // Walls
    ctx.fillStyle = '#7a5a3a';
    sim.walls.forEach(function (w) { ctx.fillRect(w.x * s, w.y * s, w.w * s, w.h * s); });
    ctx.strokeStyle = '#12202a'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W - 4, H - 4);
    // Ultrasonic beam
    var d = sim.distance();
    var ba = sim.heading + (90 - sim.pan) * Math.PI / 180;
    var ox = sim.x + Math.cos(sim.heading) * 9, oy = sim.y + Math.sin(sim.heading) * 9;
    ctx.strokeStyle = d <= E.LIMITS.obstacleCm ? 'rgba(217,75,65,.85)' : 'rgba(20,107,140,.55)';
    ctx.setLineDash([4, 4]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ox * s, oy * s); ctx.lineTo((ox + Math.cos(ba) * d) * s, (oy + Math.sin(ba) * d) * s); ctx.stroke();
    ctx.setLineDash([]);
    // Car body
    ctx.translate(sim.x * s, sim.y * s); ctx.rotate(sim.heading);
    ctx.fillStyle = '#222'; [[-9, -10], [5, -10], [-9, 7], [5, 7]].forEach(function (w) { ctx.fillRect(w[0] * s, w[1] * s, 6 * s, 3 * s); });
    ctx.fillStyle = sim.bumped ? '#d94b41' : '#f2bf3f'; ctx.strokeStyle = '#12202a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(-11 * s, -7 * s, 22 * s, 14 * s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#146b8c'; ctx.fillRect(7 * s, -4 * s, 4 * s, 8 * s);
    var c = sim.color, lit = c[0] + c[1] + c[2] > 0;
    ctx.fillStyle = lit ? 'rgb(' + c.join(',') + ')' : '#555';
    ctx.beginPath(); ctx.arc(-3 * s, 0, 2.6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#12202a'; ctx.font = '600 12px "IBM Plex Mono", monospace';
    ctx.fillText('mode: ' + sim.mode + (sim.bumped ? ' · BUMP!' : ''), 10, H - 10);
    var pose = $('rc-pose');
    if (pose && state.kind === 'sim') pose.textContent = 'x ' + sim.x.toFixed(0) + ' cm · y ' + sim.y.toFixed(0) + ' cm · heading ' + ((sim.heading * 180 / Math.PI % 360 + 360) % 360).toFixed(0) + '° · from start ' + Math.hypot(sim.x - 40, sim.y - 100).toFixed(0) + ' cm';
  }

  var simRunning = false;
  function simLoop(dt) { sim.step(Math.min(0.05, dt)); drawSim(); }
  if (window.SimKit && SimKit.loop) SimKit.loop(function (dt) { if (simRunning || state.kind === 'sim') simLoop(dt); });
  drawSim();

  // ---- Log -----------------------------------------------------------------
  var logEl = $('rc-log'), logLines = [];
  function log(dir, text) {
    logLines.push((dir === 'out' ? '→ ' : dir === 'in' ? '← ' : '· ') + text);
    if (logLines.length > 40) logLines.shift();
    if (logEl && !$('rc-log-pause').checked) { logEl.textContent = logLines.join('\n'); logEl.scrollTop = logEl.scrollHeight; }
  }

  function setStatus(text, kind) {
    var el = $('rc-status');
    el.textContent = text;
    el.dataset.kind = kind || '';
  }

  // ---- Connecting ----------------------------------------------------------
  var LINK_NAMES = { sim: 'Simulator', bluetooth: 'Bluetooth', wifi: 'Wi-Fi', usb: 'USB cable' };
  var why = {
    bluetooth: 'This browser can’t use Bluetooth. Use Chrome or Edge on a laptop, Chromebook, or Android (not iPhone/iPad).',
    usb: 'This browser can’t use USB serial. Use Chrome or Edge on a laptop or Chromebook.',
    wifi: ''
  };
  document.querySelectorAll('[data-rc-link]').forEach(function (btn) {
    var kind = btn.dataset.rcLink;
    if (!E.links[kind].supported()) { btn.disabled = true; btn.title = why[kind]; btn.insertAdjacentHTML('beforeend', '<small>not in this browser</small>'); }
    btn.addEventListener('click', function () { connect(kind); });
  });
  $('rc-disconnect').addEventListener('click', function () { disconnect(true); });

  function bridgeUrl() { return ($('rc-bridge').value || E.DEFAULT_BRIDGE).trim(); }

  function connect(kind) {
    disconnect(false);
    var attempt = ++connectionAttempt;
    var link = kind === 'sim' ? new E.links.sim(sim) : kind === 'wifi' ? new E.links.wifi(bridgeUrl()) : new E.links[kind]();
    var car = new E.Car(link);
    var wrapWrite = link.write.bind(link);
    link.write = function (text) {
      var command = JSON.parse(text);
      if (command.N === 100) { cancelPending(); return wrapWrite(text); }
      if (kind !== 'sim' || !state.latency || ![2, 3, 4, 101].includes(command.N)) return wrapWrite(text);
      return new Promise(function (resolve, reject) {
        var pending = { resolve: resolve };
        pending.timer = setTimeout(function () {
          pendingWrites = pendingWrites.filter(function (p) { return p !== pending; });
          if (state.car !== car) { resolve(); return; }
          wrapWrite(text).then(resolve, reject);
        }, state.latency);
        pendingWrites.push(pending);
      });
    };
    car.on('send', function (t) { log('out', t); });
    car.on('receive', function (t) { log('in', t); });
    car.on('close', function () {
      if (state.car !== car) return;
      stopNow();
      state.car = null; state.kind = null;
      setStatus('Disconnected. ' + (kind === 'sim' ? '' : 'Check the car’s power switch and battery.'), 'off');
      document.body.classList.remove('rc-connected');
      updatePanels();
    });
    if (link.onStatus === undefined) link.onStatus = null;
    link.onStatus = function (info) { if (info.message) log('note', info.message); };
    setStatus('Connecting by ' + LINK_NAMES[kind] + '…', 'busy');
    car.connect().then(function (name) {
      if (attempt !== connectionAttempt) { car.close(); return; }
      state.car = car; state.kind = kind; state.link = link;
      state.lastSent = ''; state.moving = false;
      setStatus('Connected: ' + name, 'on');
      log('note', 'connected by ' + LINK_NAMES[kind]);
      document.body.classList.add('rc-connected');
      updatePanels();
      car.send(E.cmd.stop());
      announce('Connected to ' + name + '. Hold an arrow to drive. Space stops.');
    }, function (err) {
      if (attempt !== connectionAttempt) return;
      var msg = err && err.message ? err.message : String(err);
      if (/cancel|chooser|No port selected|User cancelled/i.test(msg)) msg = 'No car picked.';
      setStatus(msg, 'error');
      log('note', msg);
      try { link.close(); } catch (e) { /* never opened */ }
    });
  }

  function disconnect(say) {
    connectionAttempt++;
    var car = state.car;
    stopNow();
    cancelPending();
    state.car = null; state.kind = null;
    if (car) car.close();
    document.body.classList.remove('rc-connected');
    updatePanels();
    if (say) setStatus('Disconnected.', 'off');
  }

  function updatePanels() {
    var kind = state.kind;
    $('rc-latency').disabled = kind !== 'sim';
    $('rc-pose').hidden = kind !== 'sim';
    document.querySelectorAll('[data-rc-link]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.rcLink === kind)); });
    $('rc-disconnect').hidden = !kind;
    var cam = $('rc-camera'), img = $('rc-camera-img');
    var showCam = kind === 'wifi';
    cam.hidden = !showCam;
    canvas.hidden = kind && kind !== 'sim';
    $('rc-sim-note').hidden = !!kind && kind !== 'sim';
    if (showCam) {
      img.onerror = function () { $('rc-camera-msg').textContent = 'No camera picture. (The simulated bridge has no camera; on a real car, check that the camera board’s light is on.)'; };
      img.onload = function () { $('rc-camera-msg').textContent = ''; };
      img.src = state.link.cameraUrl() + '?t=' + Date.now();
    } else if (img.src) { img.removeAttribute('src'); }
    document.querySelectorAll('.rc-needs-car').forEach(function (el) { el.disabled = !kind; });
  }

  // ---- Sending, with a safety stop -----------------------------------------
  function sendDrive(command) {
    if (!state.car) return;
    var text = JSON.stringify(command), now = Date.now();
    var isStop = command.N === 100;
    if (isStop) {
      if (!state.moving && state.lastSent === text) return;
      state.moving = false; state.mode = 'standby';
    } else {
      if (text === state.lastSent && now - state.lastSentAt < RESEND_MS) return;
      state.moving = true;
      state.mode = 'drive';
      setModeButtons(null);
    }
    state.lastSent = text; state.lastSentAt = now;
    state.car.send(command);
    showCommand(command);
  }

  function stopNow() {
    cancelPending();
    inputLocked = true;
    state.pad = null;
    stopMission();
    state.stick.active = false;
    document.querySelectorAll('.is-held').forEach(function (b) { b.classList.remove('is-held'); });
    state.stick.x = state.stick.y = 0; state.keys = {};
    centerKnob();
    if (state.car) { state.car.send(E.cmd.stop()); state.lastSent = JSON.stringify(E.cmd.stop()); }
    state.moving = false; state.mode = 'standby'; setModeButtons(null);
    showCommand(E.cmd.stop());
  }

  var cmdEl = $('rc-command');
  function showCommand(c) {
    var words = {
      100: 'stop',
      3: { 1: 'spin left', 2: 'spin right', 3: 'forward', 4: 'backward' }[c.D1],
      4: 'curve (right side ' + c.D1 + ', left side ' + c.D2 + ')'
    }[c.N] || '';
    cmdEl.textContent = JSON.stringify(c) + (words ? '  ·  ' + words + (c.N === 3 ? ' at ' + c.D2 : '') : '');
  }

  // Combine every input into one x/y.
  function wanted() {
    if (document.hidden || inputLocked) return null;
    var k = state.keys, x = 0, y = 0;
    if (k.up) y += 1; if (k.down) y -= 1; if (k.left) x -= 1; if (k.right) x += 1;
    if (x || y) return { x: x, y: y };
    if (state.stick.active) return { x: state.stick.x, y: state.stick.y };
    if (state.pad) return state.pad;
    return null;
  }

  function speed() { return Number($('rc-speed').value); }

  setInterval(function () {
    pollGamepad();
    if (!state.car || state.mission) return;
    var w = wanted();
    if (w) sendDrive(E.mixJoystick(w.x, w.y, speed()));
    else if (state.moving) sendDrive(E.cmd.stop());
  }, 60);

  // ---- Joystick ------------------------------------------------------------
  var pad = $('rc-stick'), knob = pad.querySelector('.rc-knob');
  function centerKnob() { knob.style.transform = 'translate(-50%,-50%)'; }
  function stickFrom(e) {
    var r = pad.getBoundingClientRect(), R = r.width / 2;
    var dx = (e.clientX - r.left - R) / R, dy = (e.clientY - r.top - R) / R;
    var m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
    state.stick.x = dx; state.stick.y = -dy;
    knob.style.transform = 'translate(calc(-50% + ' + (dx * R * 0.72) + 'px), calc(-50% + ' + (dy * R * 0.72) + 'px))';
  }
  pad.addEventListener('pointerdown', function (e) { inputLocked = false; pad.setPointerCapture(e.pointerId); state.stick.active = true; stickFrom(e); e.preventDefault(); });
  pad.addEventListener('pointermove', function (e) { if (state.stick.active) stickFrom(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) {
    pad.addEventListener(ev, function () { state.stick.active = false; state.stick.x = state.stick.y = 0; centerKnob(); });
  });

  // Hold-to-drive arrow buttons (bigger targets for young drivers).
  document.querySelectorAll('[data-rc-hold]').forEach(function (b) {
    var dir = b.dataset.rcHold;
    function on(e) { inputLocked = false; e.preventDefault(); state.keys[dir] = true; b.classList.add('is-held'); if (b.setPointerCapture && e.pointerId != null) b.setPointerCapture(e.pointerId); }
    function off() { state.keys[dir] = false; b.classList.remove('is-held'); }
    b.addEventListener('pointerdown', on);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { b.addEventListener(ev, off); });
    b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); inputLocked = false; state.keys[dir] = true; } });
    b.addEventListener('keyup', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); off(); } });
    b.addEventListener('blur', off);
  });

  // ---- Keyboard ------------------------------------------------------------
  var KEYMAP = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
  function typing(t) { return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !/range|checkbox|radio|button/.test(t.type || '')); }
  var cockpit = $('rc-cockpit');
  function cockpitInView() {
    var r = cockpit.getBoundingClientRect();
    return r.bottom > 80 && r.top < window.innerHeight - 80;
  }
  document.addEventListener('keydown', function (e) {
    if (typing(e.target)) return;
    if (e.key === ' ' || e.key === 'Escape') {
      if (!state.car || !cockpitInView()) return;
      if (e.target.closest && e.target.closest('button,a') && e.key === ' ') return;
      e.preventDefault(); stopNow(); return;
    }
    var dir = KEYMAP[e.key];
    if (!dir || !state.car || !cockpitInView()) return;
    if (e.target.type === 'range') return;
    e.preventDefault();
    inputLocked = false;
    state.keys[dir] = true;
  });
  document.addEventListener('keyup', function (e) { var dir = KEYMAP[e.key]; if (dir) state.keys[dir] = false; });
  // Losing focus or hiding the tab must never leave the car driving.
  window.addEventListener('blur', stopNow);
  document.addEventListener('visibilitychange', function () { if (document.hidden && state.car) stopNow(); });
  window.addEventListener('pagehide', function () { if (state.car) state.car.close(); });

  // ---- Gamepad -------------------------------------------------------------
  function pollGamepad() {
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    var gp = null;
    for (var i = 0; i < pads.length; i++) if (pads[i]) { gp = pads[i]; break; }
    if (!gp) { state.pad = null; return; }
    var x = gp.axes[0] || 0, y = -(gp.axes[1] || 0);
    if (gp.buttons[12] && gp.buttons[12].pressed) y = 1;
    if (gp.buttons[13] && gp.buttons[13].pressed) y = -1;
    if (gp.buttons[14] && gp.buttons[14].pressed) x = -1;
    if (gp.buttons[15] && gp.buttons[15].pressed) x = 1;
    if (gp.buttons[1] && gp.buttons[1].pressed) { stopNow(); return; } // B / circle
    if (Math.hypot(x, y) <= 0.2 && !document.hidden) inputLocked = false;
    state.pad = Math.hypot(x, y) > 0.2 ? { x: x, y: y } : null;
    $('rc-pad-note').textContent = 'Gamepad: ' + (gp.id.split('(')[0].trim() || 'connected') + ' · left stick drives, B stops';
  }

  // ---- Stop, speed, modes, head, light -------------------------------------
  $('rc-stop').addEventListener('click', stopNow);
  var speedOut = $('rc-speed-out');
  $('rc-speed').addEventListener('input', function () { speedOut.textContent = this.value; });

  function setModeButtons(name) {
    document.querySelectorAll('[data-rc-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.rcMode === name)); });
  }
  document.querySelectorAll('[data-rc-mode]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!state.car) return;
      stopNow();
      state.moving = false; state.mode = b.dataset.rcMode;
      state.car.send(E.cmd.mode(b.dataset.rcMode));
      state.lastSent = '';
      setModeButtons(b.dataset.rcMode);
      announce(b.textContent.trim() + ' mode. The car is driving itself. Press Stop to take over.');
    });
  });

  var panTimer = 0;
  $('rc-pan').addEventListener('input', function () {
    var v = Number(this.value);
    $('rc-pan-out').textContent = v + '°';
    clearTimeout(panTimer);
    // The firmware pauses about half a second per servo move; don't queue dozens.
    panTimer = setTimeout(function () { if (state.car) state.car.send(E.cmd.servo(1, v)); }, 180);
  });

  $('rc-light').addEventListener('change', function () {
    var hex = this.value.replace('#', '');
    if (state.car) state.car.send(E.cmd.light(parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)));
  });
  $('rc-light-off').addEventListener('click', function () { if (state.car) state.car.send(E.cmd.light(0, 0, 0)); });

  $('rc-latency').addEventListener('change', function () {
    stopNow();
    state.latency = Number(this.value);
    log('note', state.latency ? 'simulator movement commands now wait ' + state.latency + ' ms before it leaves' : 'no added delay');
  });

  // ---- Sensors -------------------------------------------------------------
  // The factory firmware drops out of driving (and out of line-follow mode)
  // whenever it answers a line-sensor question, so those are read only while parked.
  function pollSensors() {
    if (!state.polling) return;
    var car = state.car;
    if (!car) { setTimeout(pollSensors, 500); return; }
    var parked = !state.moving && !state.mission && state.mode !== 'line' && state.mode !== 'avoid' && state.mode !== 'follow';
    car.ask(E.cmd.distance(), 900).then(function (cm) {
      showDistance(cm);
      if (!parked || state.moving || state.mission || state.mode !== 'standby' || state.car !== car) return null;
      return car.ask(E.cmd.line(0)).then(function (l) {
        return car.ask(E.cmd.line(1)).then(function (m) {
          return car.ask(E.cmd.line(2)).then(function (r) { showLine([l, m, r]); });
        });
      });
    }).then(function () {
      $('rc-line-note').textContent = parked ? '' : 'Line sensors pause while the car drives (the factory code stops to answer them).';
      setTimeout(pollSensors, 350);
    });
  }
  $('rc-poll').addEventListener('change', function () {
    state.polling = this.checked;
    if (state.polling) pollSensors();
  });
  function showDistance(cm) {
    var n = Number(cm);
    var out = $('rc-dist'), bar = $('rc-dist-bar');
    if (cm == null || isNaN(n)) { out.textContent = '—'; return; }
    out.textContent = n + ' cm';
    bar.style.setProperty('--rc-fill', Math.min(100, n / 150 * 100) + '%');
    bar.dataset.near = String(n <= E.LIMITS.obstacleCm);
  }
  function showLine(vals) {
    ['L', 'M', 'R'].forEach(function (k, idx) {
      var v = Number(vals[idx]), el = $('rc-line-' + k);
      var on = v >= E.LIMITS.lineLow && v <= E.LIMITS.lineHigh;
      el.querySelector('b').textContent = isNaN(v) ? '—' : v;
      el.dataset.on = String(on);
      el.dataset.air = String(v > E.LIMITS.lineHigh);
    });
  }

  // ---- Missions (a tiny program) -------------------------------------------
  var ACTIONS = {
    forward: { label: 'Forward', run: function (sp) { return E.cmd.move(3, sp); } },
    backward: { label: 'Backward', run: function (sp) { return E.cmd.move(4, sp); } },
    left: { label: 'Spin left', run: function (sp) { return E.cmd.move(1, sp); } },
    right: { label: 'Spin right', run: function (sp) { return E.cmd.move(2, sp); } },
    wait: { label: 'Wait', run: function () { return E.cmd.stop(); } },
    light: { label: 'Light: random colour', once: true, run: function () { return E.cmd.light(Math.random() * 255, Math.random() * 255, Math.random() * 255); } }
  };
  var PRESETS = {
    square: [['forward', 1.2], ['right', 0.55], ['forward', 1.2], ['right', 0.55], ['forward', 1.2], ['right', 0.55], ['forward', 1.2], ['right', 0.55]],
    dance: [['light', 0], ['left', 0.4], ['right', 0.4], ['light', 0], ['forward', 0.4], ['backward', 0.4], ['light', 0], ['left', 1.6]],
    zigzag: [['forward', 0.8], ['left', 0.3], ['forward', 0.8], ['right', 0.6], ['forward', 0.8], ['left', 0.6], ['forward', 0.8]]
  };
  var steps = $('rc-steps');
  function addStep(action, secs) {
    var li = document.createElement('li');
    var opts = Object.keys(ACTIONS).map(function (k) { return '<option value="' + k + '"' + (k === action ? ' selected' : '') + '>' + ACTIONS[k].label + '</option>'; }).join('');
    li.innerHTML = '<select aria-label="Action">' + opts + '</select>' +
      '<label class="rc-secs">for <input type="number" min="0" max="10" step="0.1" value="' + (secs == null ? 1 : secs) + '" aria-label="Seconds"> s</label>' +
      '<button type="button" class="rc-mini" data-up aria-label="Move step up">↑</button>' +
      '<button type="button" class="rc-mini" data-del aria-label="Delete step">✕</button>';
    li.querySelector('[data-del]').addEventListener('click', function () { li.remove(); });
    li.querySelector('[data-up]').addEventListener('click', function () { if (li.previousElementSibling) steps.insertBefore(li, li.previousElementSibling); });
    steps.appendChild(li);
  }
  function loadPreset(name) { steps.innerHTML = ''; PRESETS[name].forEach(function (s) { addStep(s[0], s[1]); }); }
  $('rc-add-step').addEventListener('click', function () { addStep('forward', 1); });
  $('rc-preset').addEventListener('change', function () { if (this.value) loadPreset(this.value); this.value = ''; });
  loadPreset('square');

  var missionTimer = 0;
  function stopMission() {
    if (!state.mission) return;
    state.mission = false;
    clearTimeout(missionTimer);
    steps.querySelectorAll('li').forEach(function (li) { li.classList.remove('is-running'); });
    $('rc-run').textContent = '▶ Run mission';
    if (state.car) state.car.send(E.cmd.stop());
    state.moving = false;
  }
  $('rc-run').addEventListener('click', function () {
    if (state.mission) { stopMission(); return; }
    if (!state.car) return;
    var items = Array.prototype.slice.call(steps.querySelectorAll('li'));
    if (!items.length) return;
    stopNow();
    state.mission = true;
    this.textContent = '■ Stop mission';
    var idx = 0;
    function next() {
      items.forEach(function (li) { li.classList.remove('is-running'); });
      if (!state.mission) return;
      if (idx >= items.length) { stopNow(); announce('Mission complete.'); return; }
      var li = items[idx++], act = ACTIONS[li.querySelector('select').value];
      var secs = Math.min(10, Math.max(0, Number(li.querySelector('input').value) || 0));
      li.classList.add('is-running');
      var c = act.run(speed()), end = Date.now() + secs * 1000;
      if (state.car) { state.car.send(E.cmd.stop()); state.car.send(c); showCommand(c); }
      state.moving = c.N !== 100;
      (function keep() {
        if (!state.mission) return;
        if (Date.now() >= end) { next(); return; }
        // Repeat the command so the Wi-Fi safety stop knows we're still here.
        if (!act.once && c.N !== 100 && state.car) state.car.send(c);
        missionTimer = setTimeout(keep, Math.min(RESEND_MS, Math.max(10, end - Date.now())));
      })();
    }
    next();
  });

  // ---- Misc ----------------------------------------------------------------
  $('rc-sim-reset').addEventListener('click', function () { stopNow(); sim.reset(); drawSim(); announce('Simulator reset to x 40, y 100, facing right.'); });
  $('rc-log-clear').addEventListener('click', function () { logLines = []; logEl.textContent = ''; });

  function announce(msg) {
    if (window.RobotAutonomy && RobotAutonomy.announce) RobotAutonomy.announce(msg);
  }

  // Show where this page is served from, so the Wi-Fi steps match.
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(location.hostname)) {
    if (location.port) $('rc-bridge').value = 'ws://' + location.host;
  }
  var params = new URLSearchParams(location.search);
  updatePanels();
  if (params.get('link') === 'wifi') connect('wifi');
  else connect('sim');
})();
