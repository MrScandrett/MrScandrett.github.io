(function (root) {
  'use strict';

  var W = 720;
  var H = 540;

  var MODES = [
    { cross: false, plus: true, text: 'A · Same-side excitation: the brighter sensor speeds up its own wheel. The robot steers away from the light.' },
    { cross: true, plus: true, text: 'B · Crossed excitation: the brighter sensor speeds up the opposite wheel. The robot steers toward the light and speeds up as it approaches.' },
    { cross: false, plus: false, text: 'C · Same-side inhibition: the brighter sensor slows its own wheel. The robot steers toward the light and slows as it approaches.' },
    { cross: true, plus: false, text: 'D · Crossed inhibition: the brighter sensor slows the opposite wheel. The robot steers away; it moves faster farther from the light.' }
  ];

  var MINI_PRESETS = {
    escape: {
      label: 'Escape Reflex',
      stimLeft: true, stimRight: false,
      syn: { l2l: 1, l2r: 0, r2l: 0, r2r: 1 }
    },
    approach: {
      label: 'Approach',
      stimLeft: true, stimRight: false,
      syn: { l2l: 0, l2r: 1, r2l: 1, r2r: 0 }
    },
    freeze: {
      label: 'Freeze / Inhibit',
      stimLeft: true, stimRight: true,
      syn: { l2l: -1, l2r: -1, r2l: -1, r2r: -1 }
    }
  };

  function clampMotor(v) {
    return Math.max(0, Math.min(2, v));
  }

  function evaluateMiniConnectome(config) {
    var stimL = config && config.stimLeft ? 1 : 0;
    var stimR = config && config.stimRight ? 1 : 0;
    var syn = (config && config.syn) || { l2l: 1, l2r: 0, r2l: 0, r2r: 1 };

    // Interneurons relay sensory activation (1 when stimulated, 0 otherwise)
    var interL = stimL;
    var interR = stimR;

    var baseDrive = (syn.l2l < 0 || syn.l2r < 0 || syn.r2l < 0 || syn.r2r < 0) && (stimL || stimR) ? 1 : 0;
    var motorL = clampMotor(baseDrive + interL * (syn.l2l || 0) + interR * (syn.r2l || 0));
    var motorR = clampMotor(baseDrive + interL * (syn.l2r || 0) + interR * (syn.r2r || 0));

    var behavior = 'Idle (no motor output)';
    if (motorL === 0 && motorR === 0 && (stimL || stimR)) {
      behavior = 'Freeze (inhibitory synapses suppressed motor output)';
    } else if (Math.abs(motorL - motorR) < 0.01 && motorL > 0) {
      behavior = 'Move Forward (both motors equally active)';
    } else if (motorL > motorR) {
      behavior = 'Turn Right (left motor stronger than right)';
    } else if (motorR > motorL) {
      behavior = 'Turn Left (right motor stronger than left)';
    }

    return {
      sensory: [stimL, stimR],
      interneurons: [interL, interR],
      motors: [motorL, motorR],
      behavior: behavior
    };
  }

  function computeBraitenbergSignals(robot, light, modeIdx) {
    var sensors = [-1, 1].map(function (side) {
      return {
        x: robot.x + Math.cos(robot.a) * 23 - Math.sin(robot.a) * side * 17,
        y: robot.y + Math.sin(robot.a) * 23 + Math.cos(robot.a) * side * 17
      };
    });
    var values = sensors.map(function (s) {
      return Math.min(1, 3600 / (Math.pow(Math.hypot(s.x - light.x, s.y - light.y), 2) + 1600));
    });
    var m = MODES[modeIdx] || MODES[0];
    var input = m.cross ? [values[1], values[0]] : values;
    var motors = input.map(function (v) {
      return m.plus ? 160 * v : 160 * (1 - v);
    });
    return { sensors: sensors, values: values, motors: motors };
  }

  function stepBraitenbergVehicle(robot, light, modeIdx, dt) {
    var sig = computeBraitenbergSignals(robot, light, modeIdx);
    var l = sig.motors[0];
    var r = sig.motors[1];
    var next = {
      x: robot.x,
      y: robot.y,
      a: robot.a + ((l - r) / 40) * dt,
      wrapped: false
    };
    next.x += Math.cos(next.a) * ((l + r) / 2) * dt;
    next.y += Math.sin(next.a) * ((l + r) / 2) * dt;
    if (next.x < 0 || next.x > W || next.y < 0 || next.y > H) {
      next.x = (next.x + W) % W;
      next.y = (next.y + H) % H;
      next.wrapped = true;
    }
    return next;
  }

  function mountMiniConnectome() {
    var fireBtn = document.getElementById('mcFireBtn');
    var stimLBtn = document.getElementById('mcStimL');
    var stimRBtn = document.getElementById('mcStimR');
    var resultEl = document.getElementById('mcResult');
    if (!fireBtn || !stimLBtn || !stimRBtn) return;

    var state = {
      stimLeft: true,
      stimRight: false,
      syn: { l2l: 1, l2r: 0, r2l: 0, r2r: 1 }
    };

    var CYCLE = [1, -1, 0];
    function cycleLabel(val) {
      if (val === 1) return '+ Excitatory';
      if (val === -1) return '− Inhibitory';
      return '0 Off';
    }
    function wireClass(val) {
      if (val === 1) return 'mc-wire pos';
      if (val === -1) return 'mc-wire neg';
      return 'mc-wire off';
    }

    function render(fired) {
      stimLBtn.setAttribute('aria-pressed', String(state.stimLeft));
      stimLBtn.classList.toggle('active', state.stimLeft);
      stimRBtn.setAttribute('aria-pressed', String(state.stimRight));
      stimRBtn.classList.toggle('active', state.stimRight);

      document.querySelectorAll('[data-syn]').forEach(function (btn) {
        var key = btn.dataset.syn;
        var val = state.syn[key];
        btn.textContent = btn.dataset.synLabel + ': ' + cycleLabel(val);
        var wire = document.getElementById('mc-wire-' + key);
        if (wire) wire.setAttribute('class', wireClass(val));
      });

      var res = evaluateMiniConnectome(state);
      var map = [
        ['mc-node-sl', res.sensory[0]],
        ['mc-node-sr', res.sensory[1]],
        ['mc-node-il', res.interneurons[0]],
        ['mc-node-ir', res.interneurons[1]],
        ['mc-node-ml', res.motors[0]],
        ['mc-node-mr', res.motors[1]]
      ];
      map.forEach(function (pair) {
        var el = document.getElementById(pair[0]);
        if (!el) return;
        el.classList.toggle('is-active', fired && pair[1] > 0);
        var valEl = el.querySelector('.mc-val');
        if (valEl) valEl.textContent = fired ? 'act: ' + pair[1] : 'ready';
      });

      if (resultEl) {
        resultEl.textContent = fired
          ? 'Result: ' + res.behavior + ' (Left motor: ' + res.motors[0] + ', Right motor: ' + res.motors[1] + ').'
          : 'Predicted output: ' + res.behavior + '. Click Fire Signal to propagate spikes.';
      }
    }

    stimLBtn.addEventListener('click', function () { state.stimLeft = !state.stimLeft; render(true); });
    stimRBtn.addEventListener('click', function () { state.stimRight = !state.stimRight; render(true); });
    fireBtn.addEventListener('click', function () { render(true); });

    document.querySelectorAll('[data-syn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.dataset.syn;
        var idx = CYCLE.indexOf(state.syn[key]);
        state.syn[key] = CYCLE[(idx + 1) % CYCLE.length];
        render(true);
      });
    });

    document.querySelectorAll('[data-mc-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var preset = MINI_PRESETS[btn.dataset.mcPreset];
        if (!preset) return;
        state.stimLeft = preset.stimLeft;
        state.stimRight = preset.stimRight;
        state.syn = Object.assign({}, preset.syn);
        render(true);
      });
    });

    render(true);
  }

  function mountBraitenbergLab() {
    var $ = function (id) { return document.getElementById(id); };
    var canvas = $('simCanvas');
    if (!canvas || typeof window.SimKit === 'undefined') return;
    var sim = window.SimKit.canvas2d(canvas);
    var light = { x: 480, y: 170 };
    var robot = { x: 180, y: 350, a: 0 };
    var trail = [];
    var ghostTrail = [];
    var mode = 0;
    var running = false;
    var elapsed = 0;
    var clock = 0;
    var ghostCheckbox = $('compareTrails');

    function advance(dt) {
      var next = stepBraitenbergVehicle(robot, light, mode, dt);
      robot.x = next.x;
      robot.y = next.y;
      robot.a = next.a;
      if (next.wrapped) trail.length = 0;
      elapsed += dt;
      trail.push({ x: robot.x, y: robot.y });
      if (trail.length > 2000) trail.shift();
    }

    function pause() {
      running = false;
      $('run').textContent = 'Run';
    }

    function reset(resetLight) {
      pause();
      if (ghostCheckbox && ghostCheckbox.checked && trail.length > 1) {
        ghostTrail = trail.slice();
      } else if (!ghostCheckbox || !ghostCheckbox.checked) {
        ghostTrail = [];
      }
      robot = { x: 180, y: 350, a: 0 };
      if (resetLight) {
        light.x = 480;
        light.y = 170;
      }
      elapsed = 0;
      trail.length = 0;
      draw();
    }

    function select(i) {
      mode = i;
      document.querySelectorAll('[data-wiring]').forEach(function (b) {
        var active = Number(b.dataset.wiring) === i;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active);
      });
      $('wiring-desc').textContent = MODES[i].text;
      $('wire-left').setAttribute('d', 'M65 46 L' + (MODES[i].cross ? 215 : 65) + ' 114');
      $('wire-right').setAttribute('d', 'M215 46 L' + (MODES[i].cross ? 65 : 215) + ' 114');
      $('sign').textContent = MODES[i].plus ? '+' : '−';
      $('wiring-map').setAttribute('aria-label', MODES[i].text);
      reset(false);
    }

    function draw() {
      var ctx = sim.ctx;
      var sig = computeBraitenbergSignals(robot, light, mode);
      var values = sig.values;
      var motors = sig.motors;
      var sensors = sig.sensors;

      ctx.save();
      ctx.scale(sim.width / W, sim.height / H);
      ctx.fillStyle = '#0b1725';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#203247';
      ctx.lineWidth = 1;
      for (var x = 0; x < W; x += 45) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (var y = 0; y < H; y += 45) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.strokeStyle = '#614b29';
      [60, 120, 180, 240].forEach(function (radius) {
        ctx.beginPath(); ctx.arc(light.x, light.y, radius, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.fillStyle = '#ffd36c';
      ctx.beginPath(); ctx.arc(light.x, light.y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.font = '15px sans-serif';
      ctx.fillText('LIGHT', Math.min(W - 60, light.x + 19), Math.max(18, light.y - 15));

      if (ghostTrail.length > 1) {
        ctx.strokeStyle = 'rgba(255, 211, 108, 0.35)';
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ghostTrail.forEach(function (p, idx) {
          if (idx) ctx.lineTo(p.x, p.y);
          else ctx.moveTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.strokeStyle = '#8eb7cf';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      trail.forEach(function (p, idx) {
        if (idx) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      sensors.forEach(function (s) {
        ctx.strokeStyle = '#ffffff30';
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(light.x, light.y); ctx.stroke();
      });

      ctx.save();
      ctx.translate(robot.x, robot.y);
      ctx.rotate(robot.a);
      ctx.fillStyle = '#bacbdd';
      ctx.fillRect(-24, -19, 48, 38);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-13, -26, 26, 7);
      ctx.fillRect(-13, 19, 26, 7);
      ctx.strokeStyle = MODES[mode].plus ? '#7ce4ba' : '#ffab9b';
      ctx.lineWidth = 3;
      [-1, 1].forEach(function (side) {
        ctx.beginPath();
        ctx.moveTo(23, side * 17);
        ctx.lineTo(-8, (MODES[mode].cross ? -side : side) * 22);
        ctx.stroke();
        ctx.fillStyle = '#ffd36c';
        ctx.beginPath();
        ctx.arc(23, side * 17, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#0b1725';
      ctx.beginPath();
      ctx.moveTo(16, 0); ctx.lineTo(3, -7); ctx.lineTo(3, 7);
      ctx.fill();
      ctx.restore();
      ctx.restore();

      ['left', 'right'].forEach(function (side, i) {
        $('sensor-' + side).textContent = Math.round(values[i] * 100) + '%';
        $('motor-' + side).textContent = motors[i].toFixed(1);
      });
      $('time').textContent = elapsed.toFixed(1) + ' s';
      var diff = motors[0] - motors[1];
      $('steering').textContent = Math.abs(diff) < 0.15
        ? 'Equal motors → straight'
        : diff > 0 ? 'Left motor faster → turn right' : 'Right motor faster → turn left';
    }

    $('run').addEventListener('click', function () {
      running = !running;
      $('run').textContent = running ? 'Pause' : 'Run';
    });
    $('step').addEventListener('click', function () {
      pause();
      for (var i = 0; i < 10; i++) advance(0.01);
      draw();
    });
    $('reset').addEventListener('click', function () { reset(true); });
    if (ghostCheckbox) {
      ghostCheckbox.addEventListener('change', function () {
        if (!ghostCheckbox.checked) { ghostTrail = []; draw(); }
      });
    }
    document.querySelectorAll('[data-wiring]').forEach(function (b) {
      b.addEventListener('click', function () { select(Number(b.dataset.wiring)); });
    });

    function place(e) {
      var r = canvas.getBoundingClientRect();
      light.x = Math.max(15, Math.min(W - 15, ((e.clientX - r.left) / r.width) * W));
      light.y = Math.max(15, Math.min(H - 15, ((e.clientY - r.top) / r.height) * H));
      draw();
    }
    var dragging = false;
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true;
      canvas.setPointerCapture(e.pointerId);
      place(e);
    });
    canvas.addEventListener('pointermove', function (e) { if (dragging) place(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (type) {
      canvas.addEventListener(type, function () { dragging = false; });
    });
    canvas.addEventListener('keydown', function (e) {
      var keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!keys[e.key]) return;
      e.preventDefault();
      var vec = keys[e.key];
      var n = e.shiftKey ? 40 : 10;
      light.x = Math.max(15, Math.min(W - 15, light.x + vec[0] * n));
      light.y = Math.max(15, Math.min(H - 15, light.y + vec[1] * n));
      draw();
    });

    document.querySelectorAll('[data-predict]').forEach(function (b) {
      b.addEventListener('click', function () {
        $('prediction-feedback').textContent = b.dataset.predict === 'left'
          ? 'Correct: the brighter left sensor drives the right wheel faster, turning left. Choose B, reset, and step to check.'
          : 'Trace the crossed wire: the left sensor drives the right motor. A faster right wheel turns the robot left, toward the light. Reset and test B.';
      });
    });

    document.querySelectorAll('[data-check-q]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var qId = btn.dataset.checkQ;
        var fb = document.getElementById('fb-' + qId);
        var ok = btn.dataset.correct === 'true';
        btn.parentElement.querySelectorAll('button').forEach(function (other) {
          other.classList.toggle('active', other === btn);
          other.setAttribute('aria-pressed', String(other === btn));
        });
        if (fb) fb.textContent = (ok ? '✓ Correct. ' : 'Not quite. ') + btn.dataset.reason;
      });
    });

    select(0);
    window.SimKit.loop(function (dt) {
      if (running) {
        var remaining = Math.min(dt, 0.05);
        while (remaining > 0) {
          var step = Math.min(0.01, remaining);
          advance(step);
          remaining -= step;
        }
      }
      clock += dt;
      if (clock > 0.08) {
        draw();
        clock = 0;
      }
    }, { el: window.SimKit.stage('#simCanvas') });
  }

  function mount() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    mountMiniConnectome();
    mountBraitenbergLab();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount);
    } else {
      mount();
    }
  }

  var api = {
    W: W,
    H: H,
    MODES: MODES,
    MINI_PRESETS: MINI_PRESETS,
    evaluateMiniConnectome: evaluateMiniConnectome,
    computeBraitenbergSignals: computeBraitenbergSignals,
    stepBraitenbergVehicle: stepBraitenbergVehicle
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.ConnectomicsLab = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
