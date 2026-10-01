/* Robotics Engineering Intro — lessons/engineering/mechanical-and-civil-design/robotics-engineering-intro.html
 * Hero loop demo, Robot-or-not / Safe-or-not judges, the Robot Lab sim,
 * the clickable breadboard, part cards, reveal, and quiz.
 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Hero loop demo ── */
  (function heroLoop() {
    var steps = ['node-sensor', 'arrow-0', 'node-controller', 'arrow-1', 'node-actuator', 'arrow-2', 'node-feedback', 'arrow-3'];
    var messages = {
      'node-sensor': 'SENSE: the vacuum\'s front sensor reports a chair leg 20 cm ahead.',
      'node-controller': 'THINK: 20 cm is closer than the 30 cm safe limit, so the rule says turn.',
      'node-actuator': 'ACT: the right wheel slows, the left wheel speeds up, and the vacuum swings away.',
      'node-feedback': 'FEEDBACK: the robot moved, so the sensor checks again. Clear path. Drive on.'
    };
    var idle = 'Press run: a robot vacuum notices a chair leg and steers around it.';
    var timer = null, index = 0;
    var status = $('loop-status'), btn = $('loop-start');
    if (!btn) return;
    function clear() { steps.forEach(function (id) { var n = $(id); if (n) n.classList.remove('is-active'); }); }
    function step() {
      clear();
      var id = steps[index], n = $(id);
      if (n) n.classList.add('is-active');
      if (messages[id]) status.textContent = messages[id];
      index = (index + 1) % steps.length;
    }
    btn.addEventListener('click', function () {
      if (timer) { clearInterval(timer); timer = null; btn.textContent = '▶ Run the loop'; clear(); status.textContent = idle; return; }
      index = 0; step();
      timer = setInterval(step, 1600);
      btn.textContent = '■ Stop the loop';
    });
  })();

  /* ── Vocabulary flip cards ── */
  document.querySelectorAll('[data-flip]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('aria-pressed') !== 'true'));
    });
  });

  /* ── Judge cards (Robot or not? / Safe or not?) ── */
  function buildJudge(rootId, scoreId, items, labels) {
    var root = $(rootId);
    if (!root) return;
    var scoreEl = scoreId ? $(scoreId) : null;
    var judged = 0, matched = 0;
    items.forEach(function (item) {
      var card = el('article', 'rei-jcard');
      card.appendChild(el('h3', null, item.name));
      card.appendChild(el('p', null, item.desc));
      var btns = el('div', 'rei-jbtns');
      // The explanation is rendered up front (hidden by CSS) so glossary terms inside it are wired at load.
      var result = el('div', 'rei-jresult');
      var head = el('b');
      head.setAttribute('aria-live', 'polite');
      result.appendChild(head);
      result.appendChild(el('span', null, item.why));
      if (item.loop) {
        var loop = el('div', 'rei-jloop');
        item.loop.forEach(function (part) {
          var chip = el('span', part[1] ? '' : 'is-no', part[0]);
          chip.setAttribute('aria-label', part[0] + (part[1] ? ': yes' : ': no'));
          loop.appendChild(chip);
        });
        result.appendChild(loop);
      }
      [['yes', labels.yes], ['no', labels.no]].forEach(function (pair) {
        var b = el('button', null, pair[1]);
        b.type = 'button';
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          if (card.classList.contains('is-done')) return;
          card.classList.add('is-done');
          b.setAttribute('aria-pressed', 'true');
          btns.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
          var hit = item.verdict === 'debate' || item.verdict === pair[0];
          head.textContent = item.verdict === 'debate' ? 'Debatable, and both answers can be argued.'
            : (hit ? 'Agreed: ' : 'Look again: ') + (item.verdict === 'yes' ? labels.yesWord : labels.noWord) + '.';
          result.classList.toggle('is-miss', !hit);
          result.classList.toggle('is-debate', item.verdict === 'debate');
          judged += 1; if (hit) matched += 1;
          if (scoreEl) scoreEl.textContent = 'Judged ' + judged + ' of ' + items.length + ' · ' + matched + ' matched the reasoning.';
        });
        btns.appendChild(b);
      });
      card.appendChild(btns);
      card.appendChild(result);
      root.appendChild(card);
    });
  }

  buildJudge('robot-sort', 'robot-sort-score', [
    { name: 'Robot vacuum', desc: 'Cleans the floor on a schedule while nobody is home.', verdict: 'yes',
      why: 'Bumper and cliff sensors sense, a chip decides where to go, and wheel motors act. Nobody is steering, so it closes its own loop.',
      loop: [['Sense', 1], ['Think', 1], ['Act', 1]] },
    { name: 'Remote-control car', desc: 'Has motors, a battery, and a radio. You steer with a handheld controller.', verdict: 'no',
      why: 'It has actuators, but a <em>person</em> is doing the sensing (your eyes) and the thinking (your brain). Take the human away and it just sits there. That makes it a remote-controlled machine, not an autonomous robot.',
      loop: [['Sense', 0], ['Think', 0], ['Act', 1]] },
    { name: 'Automatic sliding door', desc: 'The grocery-store door that opens as you walk up.', verdict: 'yes',
      why: 'A motion sensor senses, a small controller decides, and a motor slides the door. It\'s a robot with exactly one trick, and it never needs a person to make the call.',
      loop: [['Sense', 1], ['Think', 1], ['Act', 1]] },
    { name: 'Pop-up toaster', desc: 'You push the lever, it heats for a set time, and the toast pops up.', verdict: 'no',
      why: 'It never looks at the bread. A timer decides, no matter how dark the toast is. That\'s <span data-glossary="open-loop control">open-loop control</span>, and it\'s why toast burns. Add a sensor that checks the color and you\'d have closed the loop.',
      loop: [['Sense', 0], ['Think', 1], ['Act', 1]] },
    { name: 'Thermostat + heater', desc: 'Keeps the room at 70 °F all winter by itself.', verdict: 'debate',
      why: 'It closes the loop perfectly: a thermometer senses, the thermostat decides, the heater acts, then it checks again. But nothing moves. If a robot must move, it\'s a <em>control system</em>. If a robot is any machine that closes its own loop, it counts.',
      loop: [['Sense', 1], ['Think', 1], ['Act', 1]] },
    { name: 'Mars rover', desc: 'Perseverance drives across Mars while scientists on Earth sleep.', verdict: 'yes',
      why: 'Scientists pick the goal, but radio takes minutes to reach Mars, so the rover drives itself between goals. Hazard cameras sense, its computer picks a safe path, and six wheels act.',
      loop: [['Sense', 1], ['Think', 1], ['Act', 1]] },
    { name: 'Calculator', desc: 'Press keys, it works out the answer and shows it.', verdict: 'no',
      why: 'It senses (your key presses) and thinks (the chip computes), but its only action is changing a display. It never acts on the physical world. Hold that thought for the "Is a webpage a robot?" question below.',
      loop: [['Sense', 1], ['Think', 1], ['Act', 0]] },
    { name: 'Camera drone in the wind', desc: 'Hovers perfectly still for a photo while gusts push it around.', verdict: 'yes',
      why: 'Even when a person flies it, a gyro senses every tilt and a flight controller corrects the rotors hundreds of times a second. No human could react that fast. The pilot picks where to go, and the robot inside keeps it in the air.',
      loop: [['Sense', 1], ['Think', 1], ['Act', 1]] }
  ], { yes: 'Robot', no: 'Not a robot', yesWord: 'it\'s a robot', noWord: 'not an autonomous robot' });

  buildJudge('safety-sort', null, [
    { name: 'Moving a wire, still plugged in', desc: 'Maya moves an LED to a new row while the Arduino is still plugged into the laptop.', verdict: 'no',
      why: 'Five volts won\'t hurt Maya, but a wire brushing the wrong pin can make a short circuit that damages the board or the laptop\'s USB port. Unplug, change, then plug back in.' },
    { name: 'Something smells hot', desc: 'Jordan smells hot plastic, unplugs the USB cable right away, then calls the teacher over.', verdict: 'yes',
      why: 'Exactly right. Power off first, then get help. Don\'t touch the part that was hot. It can stay hot for a minute.' },
    { name: 'More power from the wall', desc: 'Sam wants a stronger motor and suggests cutting open an old phone charger to wire it in.', verdict: 'no',
      why: 'Never. The wall side of a charger carries mains voltage that can kill. Ask for a battery pack or motor driver instead. Everything on our benches stays at 5 V or less.' },
    { name: 'Finger trace', desc: 'Before plugging in, Ari traces every wire with a finger and checks that no bare legs are touching.', verdict: 'yes',
      why: 'This is the habit. Most smoke in a classroom comes from a short circuit nobody checked for.' },
    { name: 'Flipping an LED', desc: 'An LED with a resistor won\'t light, so Lee unplugs, turns the LED around, and tries again.', verdict: 'yes',
      why: 'LEDs are polarized, so backwards just means dark. With the resistor in place and the power off while flipping, this is the right fix.' },
    { name: '"Let\'s see what happens"', desc: 'Kai runs a jumper wire straight from the Arduino\'s 5V pin to its GND pin.', verdict: 'no',
      why: 'That\'s a dead short: current rushes through the wire with nothing to limit it. The wire heats up and the USB port may shut down or be damaged.' }
  ], { yes: 'Safe', no: 'Not safe', yesWord: 'safe', noWord: 'not safe' });

  /* ── Robot Lab sim ── */
  (function robotLab() {
    var canvas = $('arena');
    if (!canvas || !window.SimKit) return;

    var W = 800, H = 500;            // room size in cm
    var R = 16;                       // robot radius, cm
    var WHEEL_BASE = 30;              // cm between wheels
    var VMAX = 120;                   // cm/s at 100% power
    var SONAR_MAX = 200;              // cm
    var SONAR_HALF = 28 * Math.PI / 180;  // HC-SR04 beam is roughly a 30° cone each side
    var BACK_TIME = 0.4, TURN_TIME = 0.5;
    var START = { x: 120, y: 250, a: -0.35 };
    var DEFAULT_BOXES = [
      { x: 330, y: 70, w: 70, h: 150 },
      { x: 520, y: 300, w: 140, h: 60 },
      { x: 250, y: 380, w: 60, h: 60 },
      { x: 640, y: 90, w: 60, h: 60 }
    ];

    var cfg = { sensor: 'sonar', rule: 'turn', threshold: 30, rate: 20, speed: 0.6, unplug: false, cut: false };
    var boxes, bot, trail, stats, maneuver, cmd, reading, think, liveLines;
    var running = false, stepLeft = 0, ctrlAcc = 0, physAcc = 0, flash = 0;

    function reset() {
      bot = { x: START.x, y: START.y, a: START.a, contact: false, blocked: 0 };
      trail = [];
      stats = { ticks: 0, dist: 0, crashes: 0 };
      maneuver = null;
      cmd = { l: 0, r: 0 };
      reading = null; think = null; liveLines = [];
      ctrlAcc = 0; flash = 0;
      updateReadout(); renderCode(); updateHud();
    }

    /* geometry */
    function walls() {
      return boxes.concat([
        { x: -50, y: -50, w: W + 100, h: 50 }, { x: -50, y: H, w: W + 100, h: 50 },
        { x: -50, y: 0, w: 50, h: H }, { x: W, y: 0, w: 50, h: H }
      ]);
    }
    function circleHits(x, y, r) {
      var list = walls();
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        var cx = Math.max(b.x, Math.min(x, b.x + b.w)), cy = Math.max(b.y, Math.min(y, b.y + b.h));
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
      }
      return false;
    }
    function ray(x, y, ang, max) {
      var dx = Math.cos(ang), dy = Math.sin(ang), best = max, list = walls();
      for (var i = 0; i < list.length; i++) {
        var b = list[i], t0 = -Infinity, t1 = Infinity;
        if (Math.abs(dx) < 1e-9) { if (x < b.x || x > b.x + b.w) continue; }
        else { var ta = (b.x - x) / dx, tb = (b.x + b.w - x) / dx; t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb)); }
        if (Math.abs(dy) < 1e-9) { if (y < b.y || y > b.y + b.h) continue; }
        else { var tc = (b.y - y) / dy, td = (b.y + b.h - y) / dy; t0 = Math.max(t0, Math.min(tc, td)); t1 = Math.min(t1, Math.max(tc, td)); }
        if (t1 >= Math.max(t0, 0) && t0 < best) best = Math.max(0, t0);
      }
      return best;
    }
    function sonar() {
      var d = SONAR_MAX + R;
      for (var k = -4; k <= 4; k++) d = Math.min(d, ray(bot.x, bot.y, bot.a + k * SONAR_HALF / 4, SONAR_MAX + R));
      return Math.max(0, Math.round(d - R));
    }
    function bumperPressed() {
      for (var k = -3; k <= 3; k++) {
        if (ray(bot.x, bot.y, bot.a + k * 0.38, R + 3) < R + 1.2) return true;  // a switch needs real contact
      }
      return false;
    }

    /* the controller: one pass through loop() */
    function controllerTick() {
      stats.ticks += 1;
      var P = Math.round(cfg.speed * 100), T = cfg.threshold;
      var s = cfg.sensor, rule = cfg.rule;
      reading = { broken: s === 'none' || cfg.unplug };

      if (s === 'none') {
        reading.text = 'No sensor. The robot is blind.';
      } else if (s === 'sonar') {
        reading.value = cfg.unplug ? 0 : sonar();
        reading.text = 'distance = ' + reading.value + ' cm' + (cfg.unplug ? ' (no echo: wire unplugged!)' : '');
      } else {
        reading.value = cfg.unplug ? false : bumperPressed();
        reading.text = 'bumper: ' + (reading.value ? 'PRESSED' : 'not pressed') + (cfg.unplug ? ' (wire unplugged, always reads "not pressed")' : '');
      }

      // A bump maneuver is a blocking sequence (reverse, then spin), like delay() in a real sketch.
      if (maneuver) {
        think = maneuver.phase === 'back' ? 'busy: backing up (' + Math.ceil(maneuver.t * 10) / 10 + ' s left)' : 'busy: turning (' + Math.ceil(maneuver.t * 10) / 10 + ' s left)';
        liveLines = [maneuver.phase === 'back' ? 'back' : 'turn'];
        if (maneuver.phase === 'back') setCmd(-P, -P); else setCmd(P, -P);
        return;
      }

      if (s === 'none' || rule === 'straight') {
        think = s === 'none' ? 'nothing to decide with → drive' : 'rule ignores the sensor → drive';
        liveLines = s === 'none' ? ['act'] : ['sense', 'act'];
        setCmd(P, P);
      } else if (s === 'bump') {
        if (reading.value) {
          think = 'hit is true → back up, then turn';
          maneuver = { phase: 'back', t: BACK_TIME };
          liveLines = ['sense', 'think', 'back'];
          setCmd(-P, -P);
        } else {
          think = 'hit is false → drive forward';
          liveLines = ['sense', 'think', 'fwd'];
          setCmd(P, P);
        }
      } else if (reading.value < T) {
        think = reading.value + ' < ' + T + ' → spin right';
        liveLines = ['sense', 'think', 'turn'];
        setCmd(P, -P);
      } else if (rule === 'turn') {
        think = reading.value + ' ≥ ' + T + ' → drive forward';
        liveLines = ['sense', 'think', 'fwd'];
        setCmd(P, P);
      } else {
        var lo = 15, sp = Math.round(lo + (P - lo) * Math.min(1, (reading.value - T) / 100));
        sp = Math.max(lo, Math.min(P, sp));
        think = 'map ' + reading.value + ' cm → speed ' + sp + '%';
        liveLines = ['sense', 'think', 'map', 'fwd'];
        setCmd(sp, sp);
      }
      liveLines.push('wait');
    }
    function setCmd(l, r) { cmd = { l: l / 100, r: r / 100 }; }

    /* physics */
    function physics(dt) {
      if (maneuver) {
        maneuver.t -= dt;
        if (maneuver.t <= 0) {
          if (maneuver.phase === 'back') { maneuver = { phase: 'turn', t: TURN_TIME }; setCmd(cfg.speed * 100, -cfg.speed * 100); }
          else maneuver = null;
        }
      }
      if (cfg.cut) { bot.blocked = 0; return; }
      var vl = cmd.l * VMAX, vr = cmd.r * VMAX;
      var v = (vl + vr) / 2, w = (vl - vr) / WHEEL_BASE;
      bot.a += w * dt;
      var nx = bot.x + Math.cos(bot.a) * v * dt, ny = bot.y + Math.sin(bot.a) * v * dt;
      if (circleHits(nx, ny, R)) {
        if (!bot.contact && Math.abs(v) > 1) { stats.crashes += 1; flash = 0.5; }
        bot.contact = true;
        if (Math.abs(v) > 1) bot.blocked += dt;
      } else {
        stats.dist += Math.hypot(nx - bot.x, ny - bot.y);
        bot.x = nx; bot.y = ny;
        if (!circleHits(bot.x, bot.y, R + 1.5)) bot.contact = false;
        bot.blocked = 0;
        var last = trail[trail.length - 1];
        if (!last || Math.hypot(last.x - bot.x, last.y - bot.y) > 4) { trail.push({ x: bot.x, y: bot.y }); if (trail.length > 600) trail.shift(); }
      }
    }

    /* drawing */
    var view = SimKit.canvas2d(canvas, { box: $('arena-box'), onResize: function () { draw(); } });
    function draw() {
      if (!bot) return;
      var ctx = view.ctx, cw = view.width, ch = view.height, s = Math.min(cw / W, ch / H);
      var ox = (cw - W * s) / 2, oy = (ch - H * s) / 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      var dpr = canvas.width / cw;
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
      ctx.fillStyle = '#17262d'; ctx.fillRect(-ox / s, -oy / s, cw / s, ch / s);
      ctx.fillStyle = '#1d3039'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(207,228,224,.07)'; ctx.lineWidth = 1 / s;
      for (var gx = 50; gx < W; gx += 50) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (var gy = 50; gy < H; gy += 50) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
      ctx.strokeStyle = '#4c6a72'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, W, H);
      // 1 m scale bar
      ctx.fillStyle = 'rgba(207,228,224,.55)'; ctx.fillRect(W - 120, H - 18, 100, 3);
      ctx.font = '600 13px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText('1 m', W - 70, H - 24);

      boxes.forEach(function (b) {
        ctx.fillStyle = '#b98a4e'; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = '#7a5528'; ctx.lineWidth = 3; ctx.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
        ctx.beginPath(); ctx.moveTo(b.x + 4, b.y + 4); ctx.lineTo(b.x + b.w - 4, b.y + b.h - 4); ctx.moveTo(b.x + b.w - 4, b.y + 4); ctx.lineTo(b.x + 4, b.y + b.h - 4);
        ctx.strokeStyle = 'rgba(122,85,40,.5)'; ctx.lineWidth = 2; ctx.stroke();
      });

      if (trail.length > 1) {
        ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (var i = 1; i < trail.length; i++) {
          ctx.strokeStyle = 'rgba(242,191,63,' + (0.05 + 0.35 * i / trail.length) + ')';
          ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
        }
      }

      // sonar cone, drawn to the last reading the controller actually got
      if (cfg.sensor === 'sonar' && reading && typeof reading.value === 'number') {
        var reach = R + (cfg.unplug ? 0 : reading.value);
        var near = reading.value < cfg.threshold;
        ctx.fillStyle = near ? 'rgba(255,120,100,.22)' : 'rgba(92,182,216,.18)';
        ctx.beginPath(); ctx.moveTo(bot.x, bot.y); ctx.arc(bot.x, bot.y, reach, bot.a - SONAR_HALF, bot.a + SONAR_HALF); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = near ? 'rgba(255,140,120,.8)' : 'rgba(120,200,230,.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(bot.x, bot.y, reach, bot.a - SONAR_HALF, bot.a + SONAR_HALF); ctx.stroke();
        // threshold ring
        ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(242,191,63,.5)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(bot.x, bot.y, R + cfg.threshold, bot.a - SONAR_HALF * 1.6, bot.a + SONAR_HALF * 1.6); ctx.stroke(); ctx.setLineDash([]);
      }

      ctx.save(); ctx.translate(bot.x, bot.y); ctx.rotate(bot.a);
      ctx.fillStyle = '#0d1a20';
      ctx.fillRect(-8, -R - 4, 16, 6); ctx.fillRect(-8, R - 2, 16, 6);
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fillStyle = '#e7f0ee'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#4c6a72'; ctx.stroke();
      ctx.fillStyle = '#146b8c'; ctx.beginPath(); ctx.arc(-3, 0, 6, 0, Math.PI * 2); ctx.fill();
      if (cfg.sensor === 'bump') {
        ctx.beginPath(); ctx.arc(0, 0, R + 2.5, -1.15, 1.15);
        ctx.strokeStyle = reading && reading.value ? '#ff6b5e' : '#f2bf3f'; ctx.lineWidth = 4; ctx.stroke();
      } else if (cfg.sensor === 'sonar') {
        ctx.fillStyle = '#c9cfd1'; ctx.beginPath(); ctx.arc(R - 4, -5, 3.5, 0, 7); ctx.arc(R - 4, 5, 3.5, 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#c23b32'; ctx.beginPath(); ctx.moveTo(R - 1, 0); ctx.lineTo(R - 9, -4); ctx.lineTo(R - 9, 4); ctx.closePath();
      if (cfg.sensor === 'none') ctx.fill();
      ctx.restore();

      if (flash > 0) {
        ctx.strokeStyle = 'rgba(255,107,94,' + Math.min(1, flash * 2) + ')'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(bot.x, bot.y, R + 10 + (0.5 - flash) * 30, 0, Math.PI * 2); ctx.stroke();
      }
    }

    /* readouts */
    function updateReadout() {
      var sense = $('read-sense'), th = $('read-think'), act = $('read-act');
      $('step-sense').classList.toggle('is-broken', cfg.sensor === 'none' || cfg.unplug);
      $('step-act').classList.toggle('is-broken', cfg.cut);
      $('step-think').classList.toggle('is-broken', cfg.sensor !== 'none' && cfg.rule === 'straight');
      if (!reading) { sense.textContent = 'Press Run or Step.'; th.textContent = '—'; act.textContent = '—'; return; }
      sense.textContent = reading.text;
      th.textContent = think;
      var l = Math.round(cmd.l * 100), r = Math.round(cmd.r * 100), word;
      if (l === r) word = l > 0 ? 'forward' : 'reverse';
      else word = l > r ? 'spin right' : 'spin left';
      act.textContent = cfg.cut ? 'L ' + l + '% · R ' + r + '%, but the wires are cut. Nothing moves.' : 'L ' + l + '% · R ' + r + '% (' + word + ')';
    }
    function updateHud() {
      $('hud-ticks').textContent = stats.ticks;
      $('hud-dist').textContent = (stats.dist / 100).toFixed(1) + ' m';
      var crash = $('hud-crash');
      crash.textContent = stats.crashes;
      crash.classList.toggle('is-bad', stats.crashes > 0);
      var state = $('hud-state');
      var text = running ? 'Running' : (stepLeft > 0 ? 'Stepping' : 'Paused');
      if (!running && !stats.ticks) text = 'Ready';
      if (bot.blocked > 0.8) text = 'STUCK: wheels spinning against a wall';
      else if (cfg.cut && (running || stepLeft > 0)) text = 'Motors dead: the brain is shouting into nothing';
      else if (cfg.sensor === 'sonar' && cfg.unplug && cfg.rule !== 'straight' && stats.ticks) text = 'Spinning forever: it "sees" a wall at 0 cm';
      state.textContent = text;
      state.className = /STUCK|dead|forever/.test(text) ? 'is-bad' : '';
    }

    /* generated sketch */
    function codeLines() {
      var P = Math.round(cfg.speed * 100), T = cfg.threshold, wait = Math.round(1000 / cfg.rate);
      var k = function (s) { return '<span class="k">' + s + '</span>'; };
      var f = function (s) { return '<span class="f">' + s + '</span>'; };
      var L = [];
      // line(code, id, comment): comments are padded into one column
      function line(code, id, comment) { L.push({ code: code, id: id || '', comment: comment || '' }); }
      line(k('void') + ' ' + f('loop') + '() {');
      if (cfg.sensor === 'none') {
        line('  ', '', '// SENSE: no sensor connected');
        line('  ', '', '// THINK: nothing to decide with');
        line('  ' + f('forward') + '(' + P + ');', 'act', '// ACT: always drive');
      } else {
        if (cfg.sensor === 'sonar') line('  ' + k('int') + ' d = ' + f('readDistanceCm') + '();', 'sense', '// SENSE');
        else line('  ' + k('bool') + ' hit = ' + f('digitalRead') + '(BUMP) == LOW;', 'sense', '// SENSE');
        if (cfg.rule === 'straight') {
          line('  ', '', '// THINK: this rule ignores the sensor!');
          line('  ' + f('forward') + '(' + P + ');', 'act', '// ACT');
        } else if (cfg.sensor === 'bump') {
          line('  ' + k('if') + ' (hit) {', 'think', '// THINK');
          line('    ' + f('reverse') + '(' + P + ', ' + BACK_TIME * 1000 + ');', 'back', '// ACT: back up');
          line('    ' + f('spin') + '(RIGHT, ' + P + ', ' + TURN_TIME * 1000 + ');', 'turn', '// ACT: turn away');
          line('  } ' + k('else') + ' {');
          line('    ' + f('forward') + '(' + P + ');', 'fwd', '// ACT');
          line('  }');
        } else {
          line('  ' + k('if') + ' (d &lt; ' + T + ') {', 'think', '// THINK');
          line('    ' + f('spin') + '(RIGHT, ' + P + ');', 'turn', '// ACT');
          line('  } ' + k('else') + ' {');
          if (cfg.rule === 'smooth') {
            line('    ' + k('int') + ' s = ' + f('map') + '(d, ' + T + ', ' + (T + 100) + ', 15, ' + P + ');', 'map', '// THINK: closer = slower');
            line('    s = ' + f('constrain') + '(s, 15, ' + P + ');', 'map');
            line('    ' + f('forward') + '(s);', 'fwd', '// ACT');
          } else {
            line('    ' + f('forward') + '(' + P + ');', 'fwd', '// ACT');
          }
          line('  }');
        }
      }
      line('  ' + f('delay') + '(' + wait + ');', 'wait', '// ' + cfg.rate + ' checks per second');
      line('}');
      return L;
    }
    function renderCode() {
      var lines = codeLines();
      var plain = function (html) { return html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<'); };
      var col = lines.reduce(function (m, l) { return l.comment && l.code.trim() ? Math.max(m, plain(l.code).length) : m; }, 0) + 2;
      $('lab-code').innerHTML = lines.map(function (l) {
        var text = l.code;
        if (l.comment) {
          var pad = l.code.trim() ? Math.max(1, col - plain(l.code).length) : 0;
          text += new Array(pad + 1).join(' ') + '<span class="c">' + l.comment + '</span>';
        }
        var live = l.id && liveLines.indexOf(l.id) !== -1;
        return '<span class="rei-code-line' + (live ? ' is-live' : '') + '">' + text + '</span>';
      }).join('');
    }

    var notes = {
      sensor: {
        none: 'With no sensor, the controller has no information. Whatever rule you pick, it can only drive blind.',
        bump: 'A switch on the front bumper: pressed or not pressed. The robot only finds out about a wall by hitting it.',
        sonar: 'An ultrasonic sensor measures how far away the nearest thing in front is, up to 2 m, without touching it.'
      },
      rule: {
        straight: 'The controller never looks at the reading. Sensing without deciding is as useless as no sensor.',
        turn: 'Classic obstacle avoidance: if something is too close, turn away; otherwise go.',
        smooth: 'Drive slower as things get closer, then turn. Smoother and safer, the idea behind PID control.'
      }
    };
    function updateNotes() {
      $('note-sensor').textContent = notes.sensor[cfg.sensor] + (cfg.unplug ? (cfg.sensor === 'sonar' ? ' Unplugged, it reads 0 cm forever.' : cfg.sensor === 'bump' ? ' Unplugged, it reads "not pressed" forever.' : '') : '');
      var n = notes.rule[cfg.rule];
      if (cfg.sensor === 'bump' && cfg.rule === 'smooth') n = 'A bump switch only says yes or no, so there\'s no "how close" to slow down for. The robot falls back to back-up-and-turn.';
      if (cfg.sensor === 'none' && cfg.rule !== 'straight') n += ' But there is no sensor, so the "if" never has anything to check.';
      $('note-rule').textContent = n;
    }

    function syncFromInputs() {
      cfg.sensor = document.querySelector('input[name="lab-sensor"]:checked').value;
      cfg.rule = document.querySelector('input[name="lab-rule"]:checked').value;
      cfg.threshold = +$('lab-threshold').value;
      cfg.rate = +$('lab-rate').value;
      cfg.speed = +$('lab-speed').value / 100;
      cfg.unplug = $('lab-unplug').checked;
      cfg.cut = $('lab-cut').checked;
      $('out-threshold').textContent = cfg.threshold + ' cm';
      $('out-rate').textContent = cfg.rate + ' Hz';
      $('out-speed').textContent = Math.round(cfg.speed * 100) + '%';
      $('lab-threshold').disabled = cfg.sensor !== 'sonar' || cfg.rule === 'straight';
      if (cfg.sensor !== 'bump') maneuver = null;
      updateNotes(); renderCode(); updateReadout(); updateHud(); draw();
    }
    document.querySelectorAll('.rei-controls input').forEach(function (input) {
      input.addEventListener('input', syncFromInputs);
      input.addEventListener('change', syncFromInputs);
    });

    var runBtn = $('lab-run');
    function setRunning(on) {
      running = on;
      runBtn.textContent = on ? '❚❚ Pause' : '▶ Run';
      updateHud();
    }
    runBtn.addEventListener('click', function () { stepLeft = 0; setRunning(!running); });
    $('lab-step').addEventListener('click', function () {
      setRunning(false);
      // one controller pass, then let the robot coast on that command until the next check is due
      controllerTick();
      stepLeft = 1 / cfg.rate;
      ctrlAcc = 0;
      updateReadout(); renderCode(); updateHud();
    });
    $('lab-reset').addEventListener('click', function () { setRunning(false); stepLeft = 0; reset(); draw(); });
    $('lab-clear').addEventListener('click', function () { boxes = []; draw(); });

    canvas.addEventListener('click', function (e) {
      var rect = canvas.getBoundingClientRect(), cw = view.width, ch = view.height, s = Math.min(cw / W, ch / H);
      var x = (e.clientX - rect.left - (cw - W * s) / 2) / s, y = (e.clientY - rect.top - (ch - H * s) / 2) / s;
      if (x < 0 || y < 0 || x > W || y > H) return;
      for (var i = boxes.length - 1; i >= 0; i--) {
        var b = boxes[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { boxes.splice(i, 1); draw(); return; }
      }
      var nb = { x: Math.round(x - 30), y: Math.round(y - 30), w: 60, h: 60 };
      var cx = Math.max(nb.x, Math.min(bot.x, nb.x + nb.w)), cy = Math.max(nb.y, Math.min(bot.y, nb.y + nb.h));
      if (Math.hypot(bot.x - cx, bot.y - cy) < R + 6) return; // don't bury the robot
      boxes.push(nb); draw();
    });

    var PHYS_DT = 1 / 120, hudTimer = 0;
    SimKit.loop(function (dt) {
      dt = Math.min(dt, 0.1);
      if (flash > 0) flash = Math.max(0, flash - dt);
      var active = running || stepLeft > 0;
      if (active) {
        var budget = running ? dt : Math.min(dt, stepLeft);
        if (!running) { stepLeft -= budget; if (stepLeft <= 1e-6) { stepLeft = 0; } }
        physAcc += budget;
        while (physAcc >= PHYS_DT) {
          physAcc -= PHYS_DT;
          if (running) {
            ctrlAcc += PHYS_DT;
            if (ctrlAcc >= 1 / cfg.rate) { ctrlAcc -= 1 / cfg.rate; controllerTick(); updateReadout(); renderCode(); }
          }
          physics(PHYS_DT);
        }
        hudTimer += dt;
        if (hudTimer > 0.1 || stepLeft === 0) { hudTimer = 0; updateHud(); }
      }
      if (active || flash > 0) draw();
    });

    boxes = DEFAULT_BOXES.map(function (b) { return { x: b.x, y: b.y, w: b.w, h: b.h }; });
    reset();
    syncFromInputs();
    if (reduceMotion) draw();
  })();

  /* ── Breadboard ── */
  (function breadboard() {
    var svg = $('board-svg');
    if (!svg) return;
    var NS = 'http://www.w3.org/2000/svg';
    var COLS = 30, X0 = 34, DX = 11.6;
    var ROWS_A = [64, 76, 88, 100, 112], ROWS_B = [156, 168, 180, 192, 204];
    var RAILS = [
      { id: 'rail-tp', y: 20, name: 'Top + rail', sign: '+' },
      { id: 'rail-tm', y: 38, name: 'Top − rail', sign: '−' },
      { id: 'rail-bp', y: 228, name: 'Bottom + rail', sign: '+' },
      { id: 'rail-bm', y: 246, name: 'Bottom − rail', sign: '−' }
    ];
    var holesG = $('board-holes'), barsG = $('board-bars'), lettersG = $('board-letters');
    var nets = {};
    function mk(tag, attrs, parent) {
      var n = document.createElementNS(NS, tag);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      parent.appendChild(n);
      return n;
    }
    function addHole(x, y, net) {
      var h = mk('circle', { cx: x, cy: y, r: 2.7, 'class': 'rei-hole' }, holesG);
      h.dataset.net = net;
      (nets[net] = nets[net] || { holes: [] }).holes.push(h);
    }
    var colX = function (i) { return X0 + i * DX; };
    RAILS.forEach(function (rail) {
      var first = null, last = null;
      for (var i = 0; i < COLS; i++) {
        if (i % 6 === 5) continue; // rails come in groups of five
        addHole(colX(i), rail.y, rail.id);
        if (first === null) first = colX(i); last = colX(i);
      }
      nets[rail.id].bar = mk('rect', { x: first - 5, y: rail.y - 5, width: last - first + 10, height: 10, rx: 4, 'class': 'rei-net-bar' }, barsG);
      nets[rail.id].info = rail;
    });
    for (var i = 0; i < COLS; i++) {
      ['A', 'B'].forEach(function (bank) {
        var rows = bank === 'A' ? ROWS_A : ROWS_B, id = bank + i;
        rows.forEach(function (y) { addHole(colX(i), y, id); });
        nets[id].bar = mk('rect', { x: colX(i) - 5, y: rows[0] - 5, width: 10, height: rows[4] - rows[0] + 10, rx: 4, 'class': 'rei-net-bar' }, barsG);
        nets[id].info = { bank: bank, col: i + 1 };
      });
      if (i === 0 || (i + 1) % 5 === 0) mk('text', { x: colX(i), y: 56 }, lettersG).textContent = String(i + 1);
    }
    'abcde'.split('').forEach(function (ch, k) { mk('text', { x: 24, y: ROWS_A[k] + 2.5 }, lettersG).textContent = ch; });
    'fghij'.split('').forEach(function (ch, k) { mk('text', { x: 24, y: ROWS_B[k] + 2.5 }, lettersG).textContent = ch; });

    var readout = $('board-readout'), gap = $('board-gap');
    function clear() {
      Object.keys(nets).forEach(function (id) {
        nets[id].bar.classList.remove('is-on');
        nets[id].holes.forEach(function (h) { h.classList.remove('is-net', 'is-pick'); });
      });
      gap.classList.remove('is-on');
    }
    function show(id, picked) {
      clear();
      var net = nets[id];
      net.bar.classList.add('is-on');
      net.holes.forEach(function (h) { h.classList.add('is-net'); });
      if (picked) picked.classList.add('is-pick');
      var info = net.info, html;
      if (info.y) {
        html = '<h3>' + info.name + '</h3><p>All ' + net.holes.length + ' holes in this row are one long connection along the board. Plug your ' +
          (info.sign === '+' ? '5 V supply' : 'ground (GND)') + ' in once and every hole in the row has it. That\'s why parts all over the board can share power.</p>';
      } else {
        var rows = info.bank === 'A' ? 'a–e' : 'f–j', other = info.bank === 'A' ? 'f–j' : 'a–e';
        html = '<h3>Column ' + info.col + ', rows ' + rows + '</h3><p>These five holes share one metal clip, so anything plugged into them is connected. Column ' +
          (info.col < COLS ? info.col + 1 : info.col - 1) + ' next door is a separate clip, and so is column ' + info.col + ' rows ' + other + ' across the gap.</p>';
      }
      readout.innerHTML = html;
    }
    function showGap() {
      clear();
      gap.classList.add('is-on');
      readout.innerHTML = '<h3>Center gap</h3><p>Nothing connects across this channel. Column 10 rows a–e and column 10 rows f–j are different clips. Chips straddle the gap so each of their pins lands in its own column instead of being shorted to the pin opposite.</p>';
    }
    holesG.addEventListener('click', function (e) {
      var h = e.target.closest('.rei-hole');
      if (h) show(h.dataset.net, h);
    });
    gap.addEventListener('click', showGap);
    document.querySelectorAll('[data-board-show]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var what = btn.dataset.boardShow;
        if (what === 'rail') show('rail-tp', nets['rail-tp'].holes[3]);
        else if (what === 'column') show('A9', nets.A9.holes[1]);
        else if (what === 'gap') showGap();
        else { clear(); readout.innerHTML = '<h3>Tap a hole</h3><p>Power rails, terminal-strip columns, and the center gap each connect differently. Try a hole near the top edge, then one in the middle.</p>'; }
      });
    });
  })();

  /* ── Part ID cards ── */
  document.querySelectorAll('[data-part]').forEach(function (btn) {
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function () {
      btn.setAttribute('aria-expanded', String(btn.classList.toggle('is-open')));
    });
  });

  /* ── Reveal answer ── */
  var revealBtn = $('reveal-answer'), answerBox = $('answer-box');
  if (revealBtn) revealBtn.addEventListener('click', function () {
    var shown = answerBox.classList.toggle('is-shown');
    revealBtn.setAttribute('aria-expanded', String(shown));
    revealBtn.textContent = shown ? 'Hide the answer' : 'Reveal the answer';
  });

  /* ── Quiz ── */
  document.querySelectorAll('.rei-question').forEach(function (question) {
    question.querySelectorAll('.rei-option').forEach(function (option) {
      option.addEventListener('click', function () {
        if (question.dataset.locked) return;
        question.dataset.locked = 'true';
        question.querySelectorAll('.rei-option').forEach(function (item) {
          item.disabled = true;
          if (item.dataset.choice === question.dataset.answer) item.classList.add('is-correct');
        });
        var correct = option.dataset.choice === question.dataset.answer;
        if (!correct) option.classList.add('is-wrong');
        question.querySelector('.rei-feedback').textContent = (correct ? 'Correct. ' : 'Not quite. ') + question.dataset.explanation;
      });
    });
  });
})();
