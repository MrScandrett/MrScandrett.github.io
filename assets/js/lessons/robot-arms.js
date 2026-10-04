/* Robot Arms: a three-joint pick-and-place arm driven by joint sliders
   (forward kinematics) or by a target point (inverse kinematics), plus a
   two-link arm whose configuration space is drawn live beside it. */
(function () {
  'use strict';
  var RA = window.RobotAutonomy;
  var DEG = 180 / Math.PI;
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function wrapDeg(d) { return ((d + 540) % 360) - 180; }

  armLab();
  cspaceLab();

  /* ── Sim 1: pick-and-place arm ─────────────────────────────────── */
  function armLab() {
    var canvas = document.getElementById('arm-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    var FLOOR = H - 46, BASE = { x: 250, y: FLOOR - 40 };
    var L1 = 170, L2 = 140, L3 = 46, BLOCK = 34, PX_PER_CM = 4;
    var ui = {
      t1: document.getElementById('arm-t1'), t2: document.getElementById('arm-t2'), t3: document.getElementById('arm-t3'),
      modes: document.querySelectorAll('[data-arm-mode]'), grip: document.getElementById('arm-grip'),
      elbow: document.getElementById('arm-elbow'), reach: document.getElementById('arm-reach'),
      reset: document.getElementById('arm-reset'), readout: document.getElementById('arm-readout'),
      math: document.getElementById('arm-math'), score: document.getElementById('arm-score')
    };
    // Angles in degrees. θ1 from the +x axis (up is positive), θ2 and θ3 relative.
    var q = { t1: 70, t2: -60, t3: -100 }, goalQ = null;
    var mode = 'joints', target = { x: 520, y: FLOOR - 10 }, gripClosed = false, held = null, reachable = true;
    var blocks, pads, scored = 0;

    function resetWorld() {
      blocks = [
        { x: 340, y: FLOOR - BLOCK, c: '#d94b41', name: 'red' },
        { x: 400, y: FLOOR - BLOCK, c: '#3fa6cc', name: 'blue' },
        { x: 460, y: FLOOR - BLOCK, c: '#f2bf3f', name: 'yellow' }
      ];
      // Every pad sits inside the arm's reach (shoulder at x = 250, reach ≈ 310 px).
      pads = [
        { x: 70, c: '#d94b41', name: 'red' },
        { x: 135, c: '#3fa6cc', name: 'blue' },
        { x: 540, c: '#f2bf3f', name: 'yellow' }
      ];
      held = null; gripClosed = false; scored = 0;
      q = { t1: 70, t2: -60, t3: -100 }; goalQ = null;
      syncSliders(); syncGrip();
    }

    // Forward kinematics: joint angles → every joint position.
    function fk(a) {
      var a1 = a.t1 / DEG, a2 = (a.t1 + a.t2) / DEG, a3 = (a.t1 + a.t2 + a.t3) / DEG;
      var e = { x: BASE.x + L1 * Math.cos(a1), y: BASE.y - L1 * Math.sin(a1) };
      var w = { x: e.x + L2 * Math.cos(a2), y: e.y - L2 * Math.sin(a2) };
      var t = { x: w.x + L3 * Math.cos(a3), y: w.y - L3 * Math.sin(a3) };
      return { s: BASE, e: e, w: w, t: t, a3: a3 };
    }

    // Inverse kinematics with the gripper pointing straight down (a top-down
    // grasp): find the wrist point, then solve the 2-link shoulder–elbow
    // triangle with the law of cosines. Two answers: elbow up or elbow down.
    function ik(tx, ty) {
      var wx = tx - BASE.x, wy = (BASE.y - ty) + L3; // wrist sits L3 above the tip
      var d2 = wx * wx + wy * wy, d = Math.sqrt(d2);
      var c2 = (d2 - L1 * L1 - L2 * L2) / (2 * L1 * L2);
      var ok = c2 >= -1 && c2 <= 1;
      c2 = clamp(c2, -1, 1);
      var up = !ui.elbow || ui.elbow.value !== 'down';
      var t2 = Math.acos(c2) * (up ? -1 : 1);
      var t1 = Math.atan2(wy, wx) - Math.atan2(L2 * Math.sin(t2), L1 + L2 * Math.cos(t2));
      var t1d = t1 * DEG, t2d = t2 * DEG;
      return { ok: ok && d > 1, q: { t1: t1d, t2: t2d, t3: -90 - t1d - t2d } };
    }

    function syncSliders() {
      [['t1', q.t1], ['t2', q.t2], ['t3', q.t3]].forEach(function (p) {
        var el = ui[p[0]]; if (!el) return;
        el.value = Math.round(wrapDeg(p[1]));
        var out = document.getElementById('arm-' + p[0] + '-out'); if (out) out.textContent = el.value;
      });
    }
    function syncGrip() {
      if (!ui.grip) return;
      ui.grip.textContent = gripClosed ? 'Open gripper' : 'Close gripper';
      ui.grip.setAttribute('aria-pressed', String(gripClosed));
    }
    function setMode(m) {
      mode = m;
      ui.modes.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.armMode === m)); });
      document.querySelectorAll('[data-arm-show]').forEach(function (el) { el.hidden = el.dataset.armShow !== m; });
      if (m === 'reach') { var p = fk(q).t; target = { x: p.x, y: p.y }; }
    }

    function topOf(x, skip) {
      var y = FLOOR;
      blocks.forEach(function (b) { if (b !== skip && b !== held && Math.abs(b.x - x) < BLOCK * 0.9 && b.y < y) y = b.y; });
      return y;
    }
    function toggleGrip() {
      var tip = fk(q).t;
      gripClosed = !gripClosed;
      var msg;
      if (gripClosed) {
        // Fingertips must be near the block's centre to get a grip.
        var best = null, bd = 28;
        blocks.forEach(function (b) {
          var d = Math.hypot(b.x - tip.x, b.y + BLOCK / 2 - tip.y);
          if (d < bd) { bd = d; best = b; }
        });
        // only lift a block with nothing stacked on it
        if (best && blocks.some(function (o) { return o !== best && Math.abs(o.x - best.x) < BLOCK * 0.9 && o.y < best.y; })) best = null;
        held = best;
        msg = held ? 'Grabbed the ' + held.name + ' block.' : 'Gripper closed on nothing. Line the fingers up with the top of a block.';
      } else {
        if (held) {
          var b = held; held = null;
          b.y = topOf(b.x, b) - BLOCK;
          msg = 'Dropped the ' + b.name + ' block' + (padUnder(b) ? ' on the ' + padUnder(b).name + ' pad.' : '.');
          checkScore();
        } else msg = 'Gripper open.';
      }
      syncGrip();
      RA.announce(msg, true);
    }
    function padUnder(b) {
      for (var i = 0; i < pads.length; i++) if (Math.abs(pads[i].x - b.x) < BLOCK * 0.6 && b.y + BLOCK >= FLOOR - 1) return pads[i];
      return null;
    }
    function checkScore() {
      var n = blocks.filter(function (b) { var p = padUnder(b); return p && p.name === b.name; }).length;
      if (n > scored) RA.announce(n === 3 ? 'All three blocks are on their matching pads. Great work, engineer!' : n + ' of 3 blocks on matching pads.', true);
      scored = n;
      if (ui.score) ui.score.textContent = n + ' / 3 blocks home';
    }

    function step(dt) {
      if (mode === 'reach') {
        var sol = ik(target.x, target.y);
        reachable = sol.ok;
        goalQ = sol.q;
      } else { goalQ = null; reachable = true; }
      if (goalQ) {
        // Real arms can't teleport: each joint turns at a limited speed.
        var k = RA.reducedMotion ? 1 : Math.min(1, dt * 6);
        q.t1 += wrapDeg(goalQ.t1 - q.t1) * k;
        q.t2 += wrapDeg(goalQ.t2 - q.t2) * k;
        q.t3 += wrapDeg(goalQ.t3 - q.t3) * k;
        syncSliders();
      }
      var p = fk(q);
      if (held) { held.x = p.t.x; held.y = p.t.y - BLOCK / 2; }
    }

    function drawLink(a, b, w, color) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0b1418'; ctx.lineWidth = w + 6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x, a.y - w * 0.22); ctx.lineTo(b.x, b.y - w * 0.22); ctx.stroke();
    }
    function drawJoint(p, r, label) {
      ctx.fillStyle = '#12202a'; ctx.beginPath(); ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2bf3f'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#12202a'; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.35, 0, Math.PI * 2); ctx.fill();
      if (label) {
        ctx.font = '700 12px IBM Plex Mono, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        var w = ctx.measureText(label).width + 10;
        ctx.fillStyle = 'rgba(15,29,35,.85)'; RA.roundRect(ctx, p.x + r + 6, p.y - 10, w, 20, 5); ctx.fill();
        ctx.fillStyle = '#f6fbf8'; ctx.fillText(label, p.x + r + 11, p.y);
      }
    }
    function angleArc(p, from, to, r, color) {
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, -from / DEG, -to / DEG, to > from); ctx.stroke();
    }

    function draw() {
      // backdrop: workshop wall + bench
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#16303a'); g.addColorStop(1, '#0f1d23');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(112,200,229,.07)'; ctx.lineWidth = 1;
      for (var gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, FLOOR); ctx.stroke(); }
      for (var gy = FLOOR; gy > 0; gy -= 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
      ctx.fillStyle = '#5b4632'; ctx.fillRect(0, FLOOR, W, H - FLOOR);
      ctx.fillStyle = '#6e5740'; ctx.fillRect(0, FLOOR, W, 6);
      ctx.strokeStyle = 'rgba(0,0,0,.18)';
      for (var bx = 30; bx < W; bx += 90) { ctx.beginPath(); ctx.moveTo(bx, FLOOR + 10); ctx.lineTo(bx + 40, H); ctx.stroke(); }

      // reach envelope
      if (!ui.reach || ui.reach.checked) {
        var outer = L1 + L2 + L3, inner = Math.max(0, L1 - L2 - L3);
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, W, FLOOR); ctx.clip();
        ctx.fillStyle = 'rgba(184,216,75,.08)';
        ctx.beginPath(); ctx.arc(BASE.x, BASE.y, outer, 0, Math.PI * 2); ctx.arc(BASE.x, BASE.y, inner, 0, Math.PI * 2, true); ctx.fill('evenodd');
        ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(184,216,75,.55)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(BASE.x, BASE.y, outer, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(184,216,75,.9)'; ctx.font = '600 11px IBM Plex Mono, monospace'; ctx.textAlign = 'center';
        ctx.fillText('the farthest the hand can reach', BASE.x, BASE.y - outer + 16);
        ctx.restore();
      }

      // pads
      pads.forEach(function (p) {
        ctx.fillStyle = p.c; ctx.globalAlpha = 0.35; ctx.fillRect(p.x - BLOCK * 0.7, FLOOR - 3, BLOCK * 1.4, 7); ctx.globalAlpha = 1;
        ctx.strokeStyle = p.c; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.strokeRect(p.x - BLOCK * 0.7, FLOOR - 3, BLOCK * 1.4, 7); ctx.setLineDash([]);
        ctx.fillStyle = '#f6fbf8'; ctx.font = '700 10px IBM Plex Mono, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(p.name.toUpperCase() + ' PAD', p.x, FLOOR + 12);
      });
      // blocks (letter on each so colour isn't the only cue)
      blocks.forEach(function (b) {
        RA.roundRect(ctx, b.x - BLOCK / 2, b.y, BLOCK, BLOCK, 5);
        ctx.fillStyle = b.c; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(b.x - BLOCK / 2 + 4, b.y + 4, BLOCK - 8, 4);
        ctx.fillStyle = '#12202a'; ctx.font = '800 16px IBM Plex Mono, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.name[0].toUpperCase(), b.x, b.y + BLOCK / 2 + 2);
      });

      // target crosshair (reach mode)
      if (mode === 'reach') {
        ctx.strokeStyle = reachable ? '#b8d84b' : '#ff7a6b'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(target.x, target.y, 11, 0, Math.PI * 2);
        ctx.moveTo(target.x - 18, target.y); ctx.lineTo(target.x + 18, target.y); ctx.moveTo(target.x, target.y - 18); ctx.lineTo(target.x, target.y + 18); ctx.stroke();
        if (!reachable) { ctx.fillStyle = '#ff9a8d'; ctx.font = '700 12px IBM Plex Mono, monospace'; ctx.textAlign = 'center'; ctx.fillText('out of reach', target.x, target.y - 24); }
      }

      // base pedestal
      ctx.fillStyle = '#2d4a54'; RA.roundRect(ctx, BASE.x - 46, FLOOR - 14, 92, 18, 5); ctx.fill();
      ctx.fillStyle = '#3c6370'; RA.roundRect(ctx, BASE.x - 26, BASE.y, 52, FLOOR - BASE.y - 10, 6); ctx.fill();

      var p = fk(q);
      var lvl = RA.level();
      // angle arcs: show what each joint angle measures
      angleArc(p.s, 0, q.t1, 34, 'rgba(242,191,63,.85)');
      angleArc(p.e, q.t1, q.t1 + q.t2, 28, 'rgba(112,200,229,.9)');
      angleArc(p.w, q.t1 + q.t2, q.t1 + q.t2 + q.t3, 22, 'rgba(255,154,107,.9)');
      ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(242,191,63,.45)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.s.x, p.s.y); ctx.lineTo(p.s.x + 60, p.s.y); ctx.stroke(); ctx.setLineDash([]);

      drawLink(p.s, p.e, 22, '#e86f3a');
      drawLink(p.e, p.w, 17, '#e86f3a');
      drawLink(p.w, { x: p.w.x + (L3 - 14) * Math.cos(p.a3), y: p.w.y - (L3 - 14) * Math.sin(p.a3) }, 12, '#c7d3d1');
      // gripper fingers
      var ux = Math.cos(p.a3), uy = -Math.sin(p.a3), nx = -uy, ny = ux, open = gripClosed ? (held ? BLOCK / 2 : 5) : BLOCK / 2 + 8;
      var palm = { x: p.w.x + ux * (L3 - 14), y: p.w.y + uy * (L3 - 14) };
      ctx.strokeStyle = '#c7d3d1'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(palm.x + nx * open, palm.y + ny * open); ctx.lineTo(palm.x - nx * open, palm.y - ny * open); ctx.stroke();
      [1, -1].forEach(function (sgn) {
        ctx.beginPath(); ctx.moveTo(palm.x + nx * open * sgn, palm.y + ny * open * sgn);
        ctx.lineTo(palm.x + nx * open * sgn + ux * 18, palm.y + ny * open * sgn + uy * 18); ctx.stroke();
      });
      var simple = lvl === 'explorer';
      drawJoint(p.s, 13, simple ? 'shoulder' : 'θ1 ' + Math.round(wrapDeg(q.t1)) + '°');
      drawJoint(p.e, 11, simple ? 'elbow' : 'θ2 ' + Math.round(wrapDeg(q.t2)) + '°');
      drawJoint(p.w, 8, simple ? 'wrist' : 'θ3 ' + Math.round(wrapDeg(q.t3)) + '°');
      ctx.fillStyle = '#b8d84b'; ctx.beginPath(); ctx.arc(p.t.x, p.t.y, 4, 0, Math.PI * 2); ctx.fill();

      var below = p.e.y > FLOOR || p.w.y > FLOOR || p.t.y > FLOOR + 4;
      if (below) { ctx.fillStyle = '#ff9a8d'; ctx.font = '700 13px IBM Plex Mono, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Crash! The arm is hitting the table.', 14, 14); }

      var xcm = (p.t.x - BASE.x) / PX_PER_CM, ycm = (BASE.y - p.t.y) / PX_PER_CM;
      ui.readout.textContent = simple
        ? 'Hand is ' + Math.abs(xcm).toFixed(0) + ' cm ' + (xcm >= 0 ? 'right' : 'left') + ' of the shoulder and ' + Math.abs(ycm).toFixed(0) + ' cm ' + (ycm >= 0 ? 'up' : 'down') + '.' + (held ? ' Holding the ' + held.name + ' block.' : '')
        : 'Gripper tip at x = ' + xcm.toFixed(1) + ' cm, y = ' + ycm.toFixed(1) + ' cm from the shoulder' + (mode === 'reach' ? (reachable ? ' · IK solution found' : ' · target outside the workspace') : '') + (held ? ' · holding ' + held.name : '');
      if (ui.math) {
        ui.math.textContent = 'x = ' + (L1 / PX_PER_CM).toFixed(1) + '·cos(' + Math.round(q.t1) + '°) + ' + (L2 / PX_PER_CM).toFixed(1) + '·cos(' + Math.round(q.t1 + q.t2) + '°) + ' + (L3 / PX_PER_CM).toFixed(1) + '·cos(' + Math.round(q.t1 + q.t2 + q.t3) + '°) = ' + xcm.toFixed(1) + ' cm';
      }
    }

    // Pointer: drag the target in reach mode; in joint mode, a click near the
    // gripper toggles it.
    var dragging = false;
    canvas.addEventListener('pointerdown', function (e) {
      var pt = RA.canvasPoint(canvas, e);
      if (mode !== 'reach') setMode('reach');
      target = { x: pt.x, y: Math.min(pt.y, FLOOR - 2) };
      dragging = true; canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var pt = RA.canvasPoint(canvas, e);
      target = { x: clamp(pt.x, 0, W), y: clamp(pt.y, 0, FLOOR - 2) };
    });
    canvas.addEventListener('pointerup', function () {
      dragging = false;
      if (!reachable) RA.announce('That spot is out of reach. The arm stretches as far as it can.');
    });

    // Keyboard: arrows move the IK target; Q/A, W/S, E/D turn joints; Space grips.
    var cursor = RA.keyCursor(canvas, {
      step: 12, x: target.x, y: target.y,
      onMove: function (c) {
        if (mode !== 'reach') setMode('reach');
        c.y = Math.min(c.y, FLOOR - 2);
        target = { x: c.x, y: c.y };
      },
      describe: function () {
        var s = ik(target.x, target.y);
        var xcm = (target.x - BASE.x) / PX_PER_CM, ycm = (BASE.y - target.y) / PX_PER_CM;
        return 'Target ' + Math.round(xcm) + ' centimetres across, ' + Math.round(ycm) + ' up.' + (s.ok ? '' : ' Out of reach.');
      },
      onKey: function (k) {
        if (k === 'Enter') { toggleGrip(); return true; }
        var map = { q: ['t1', 4], a: ['t1', -4], w: ['t2', 4], s: ['t2', -4], e: ['t3', 4], d: ['t3', -4] };
        var m = map[k.toLowerCase()];
        if (!m) return false;
        if (mode !== 'joints') setMode('joints');
        q[m[0]] = wrapDeg(q[m[0]] + m[1]);
        syncSliders();
        RA.announce({ t1: 'Shoulder', t2: 'Elbow', t3: 'Wrist' }[m[0]] + ' ' + Math.round(q[m[0]]) + ' degrees.', true);
        return true;
      }
    });
    cursor.x = target.x; cursor.y = target.y;

    ['t1', 't2', 't3'].forEach(function (k) {
      var el = ui[k]; if (!el) return;
      el.addEventListener('input', function () {
        if (mode !== 'joints') setMode('joints');
        q[k] = +el.value;
        document.getElementById('arm-' + k + '-out').textContent = el.value;
      });
    });
    ui.modes.forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.armMode); }); });
    if (ui.grip) ui.grip.addEventListener('click', toggleGrip);
    if (ui.reset) ui.reset.addEventListener('click', function () { resetWorld(); checkScore(); RA.announce('Blocks reset.', true); });
    if (ui.elbow) ui.elbow.addEventListener('change', function () { RA.announce('Elbow ' + ui.elbow.value + '. Same hand position, different arm shape.', true); });
    document.querySelectorAll('[data-arm-pose]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.dataset.armPose.split(',').map(Number);
        setMode('joints'); goalQ = null;
        q = { t1: v[0], t2: v[1], t3: v[2] }; syncSliders();
      });
    });

    resetWorld(); setMode('joints'); checkScore();
    RA.loop(function (dt) { step(dt); draw(); });
  }

  /* ── Sim 2: configuration space ────────────────────────────────── */
  function cspaceLab() {
    var canvas = document.getElementById('cs-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    var PANEL = H, CS0 = { x: PANEL + 20, y: 20, s: H - 40 };   // C-space square
    var BASE = { x: PANEL / 2, y: H / 2 }, L1 = 95, L2 = 75, N = 120; // 3° cells
    var obstacles = [{ x: BASE.x + 110, y: BASE.y - 60, r: 26 }, { x: BASE.x - 70, y: BASE.y + 110, r: 22 }];
    var q = { a: 30, b: 40 }, goal = null, path = null, pathI = 0, grid = null, img = null;
    var readout = document.getElementById('cs-readout');

    function joints(a, b) {
      var a1 = a / DEG, a2 = (a + b) / DEG;
      var e = { x: BASE.x + L1 * Math.cos(a1), y: BASE.y - L1 * Math.sin(a1) };
      return { e: e, t: { x: e.x + L2 * Math.cos(a2), y: e.y - L2 * Math.sin(a2) } };
    }
    function segHits(p, r, o) {
      var dx = r.x - p.x, dy = r.y - p.y, l2 = dx * dx + dy * dy;
      var t = clamp(((o.x - p.x) * dx + (o.y - p.y) * dy) / l2, 0, 1);
      return Math.hypot(p.x + t * dx - o.x, p.y + t * dy - o.y) < o.r + 6;
    }
    function collides(a, b) {
      var j = joints(a, b);
      return obstacles.some(function (o) { return segHits(BASE, j.e, o) || segHits(j.e, j.t, o); });
    }
    // θ1 ∈ [0, 360) across, θ2 ∈ [−180, 180) up the square. Both wrap: C-space is a torus.
    function cell(a, b) { return { i: Math.floor(((a % 360) + 360) % 360 / 360 * N), j: Math.floor((wrapDeg(b) + 180) / 360 * N) % N }; }
    function angles(i, j) { return { a: (i + 0.5) * 360 / N, b: (j + 0.5) * 360 / N - 180 }; }

    function rebuild() {
      grid = new Uint8Array(N * N);
      img = ctx.createImageData(N, N);
      for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
        var an = angles(i, j), hit = collides(an.a, an.b);
        grid[j * N + i] = hit ? 1 : 0;
        // image row 0 is the top = largest θ2
        var o = ((N - 1 - j) * N + i) * 4;
        var c = hit ? [198, 94, 46] : [26, 48, 56];
        img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
      }
      path = null;
    }
    var off = document.createElement('canvas'); off.width = N; off.height = N;
    var offCtx = off.getContext('2d');

    function plan() {
      if (!goal) { RA.announce('Set a goal pose first.', true); return; }
      var s = cell(q.a, q.b), g = cell(goal.a, goal.b);
      if (grid[s.j * N + s.i] || grid[g.j * N + g.i]) { RA.announce('Start or goal pose is inside an obstacle.', true); return; }
      // Breadth-first search on the torus (wrap-around in both angles).
      var prev = new Int32Array(N * N).fill(-1), start = s.j * N + s.i, end = g.j * N + g.i, queue = [start], head = 0;
      prev[start] = start;
      while (head < queue.length) {
        var c = queue[head++];
        if (c === end) break;
        var ci = c % N, cj = (c / N) | 0;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var ni = (ci + d[0] + N) % N, nj = (cj + d[1] + N) % N, n = nj * N + ni;
          if (prev[n] < 0 && !grid[n]) { prev[n] = c; queue.push(n); }
        });
      }
      if (prev[end] < 0) { path = null; RA.announce('No path: the obstacles split C-space into separate regions.', true); return; }
      path = [];
      for (var k = end; k !== start; k = prev[k]) path.unshift(k);
      pathI = 0;
      RA.announce('Path found: ' + path.length + ' steps through configuration space. Watch the arm follow it.', true);
    }

    function step() {
      if (path && pathI < path.length) {
        var an = angles(path[pathI] % N, (path[pathI] / N) | 0);
        q.a = an.a; q.b = an.b; pathI += RA.reducedMotion ? 4 : 1;
        if (pathI >= path.length) { q.a = goal.a; q.b = goal.b; }
      }
    }

    function csX(a) { return CS0.x + (((a % 360) + 360) % 360) / 360 * CS0.s; }
    function csY(b) { return CS0.y + CS0.s - (wrapDeg(b) + 180) / 360 * CS0.s; }

    function draw() {
      ctx.fillStyle = '#0f1d23'; ctx.fillRect(0, 0, W, H);
      // workspace panel
      ctx.strokeStyle = 'rgba(112,200,229,.08)'; ctx.lineWidth = 1;
      for (var g = 0; g < PANEL; g += 30) { ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, H); ctx.moveTo(0, g); ctx.lineTo(PANEL, g); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(184,216,75,.3)'; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(BASE.x, BASE.y, L1 + L2, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      obstacles.forEach(function (o) { RA.drawRock(ctx, o.x, o.y, o.r); });
      if (goal) {
        var gj = joints(goal.a, goal.b);
        ctx.globalAlpha = 0.45; ctx.strokeStyle = '#b8d84b'; ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(BASE.x, BASE.y); ctx.lineTo(gj.e.x, gj.e.y); ctx.lineTo(gj.t.x, gj.t.y); ctx.stroke(); ctx.globalAlpha = 1;
      }
      var j = joints(q.a, q.b), hit = collides(q.a, q.b);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0b1418'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(BASE.x, BASE.y); ctx.lineTo(j.e.x, j.e.y); ctx.lineTo(j.t.x, j.t.y); ctx.stroke();
      ctx.strokeStyle = hit ? '#ff7a6b' : '#e86f3a'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(BASE.x, BASE.y); ctx.lineTo(j.e.x, j.e.y); ctx.lineTo(j.t.x, j.t.y); ctx.stroke();
      [BASE, j.e].forEach(function (p) { ctx.fillStyle = '#f2bf3f'; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#b8d84b'; ctx.beginPath(); ctx.arc(j.t.x, j.t.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d4e0df'; ctx.font = '600 11px IBM Plex Mono, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('WORKSPACE (the room)', 10, 10);

      // C-space panel
      offCtx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, CS0.x, CS0.y, CS0.s, CS0.s);
      ctx.strokeStyle = 'rgba(228,242,237,.35)'; ctx.strokeRect(CS0.x + .5, CS0.y + .5, CS0.s - 1, CS0.s - 1);
      if (path) {
        ctx.fillStyle = 'rgba(242,191,63,.85)';
        path.forEach(function (k) { var an = angles(k % N, (k / N) | 0); ctx.fillRect(csX(an.a) - 1.5, csY(an.b) - 1.5, 3, 3); });
      }
      if (goal) { ctx.strokeStyle = '#b8d84b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(csX(goal.a), csY(goal.b), 8, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = hit ? '#ff7a6b' : '#ffffff'; ctx.strokeStyle = '#0f1d23'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(csX(q.a), csY(q.b), 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d4e0df'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('C-SPACE: θ1 →', CS0.x, CS0.y - 3);
      ctx.save(); ctx.translate(CS0.x - 6, CS0.y + CS0.s); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'bottom'; ctx.fillText('θ2 →', 0, 0); ctx.restore();
      ctx.textBaseline = 'top'; ctx.fillText('0°', CS0.x, CS0.y + CS0.s + 3); ctx.textAlign = 'right'; ctx.fillText('360°', CS0.x + CS0.s, CS0.y + CS0.s + 3);
      if (canvas === document.activeElement && keyUsed) {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(CS0.x - 3, CS0.y - 3, CS0.s + 6, CS0.s + 6);
      }
      if (readout) readout.textContent = 'θ1 = ' + Math.round(((q.a % 360) + 360) % 360) + '°, θ2 = ' + Math.round(wrapDeg(q.b)) + '° · ' + (hit ? 'COLLISION: this pose hits an obstacle (orange region)' : 'free pose (dark region)') + (goal ? ' · goal set' : '');
    }

    function fromCs(pt) {
      if (pt.x < CS0.x || pt.x > CS0.x + CS0.s || pt.y < CS0.y || pt.y > CS0.y + CS0.s) return null;
      return { a: (pt.x - CS0.x) / CS0.s * 360, b: (CS0.y + CS0.s - pt.y) / CS0.s * 360 - 180 };
    }
    var drag = null;
    canvas.addEventListener('pointerdown', function (e) {
      var pt = RA.canvasPoint(canvas, e), c = fromCs(pt);
      if (c) { path = null; if (e.shiftKey) { goal = c; } else { q.a = c.a; q.b = c.b; drag = 'cs'; } }
      else if (pt.x < PANEL) {
        // move the nearest obstacle to the click
        var best = obstacles[0];
        obstacles.forEach(function (o) { if (Math.hypot(o.x - pt.x, o.y - pt.y) < Math.hypot(best.x - pt.x, best.y - pt.y)) best = o; });
        best.x = pt.x; best.y = pt.y; drag = best; rebuild();
      }
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var pt = RA.canvasPoint(canvas, e);
      if (drag === 'cs') { var c = fromCs(pt); if (c) { q.a = c.a; q.b = c.b; } }
      else { drag.x = clamp(pt.x, 10, PANEL - 10); drag.y = clamp(pt.y, 10, H - 10); rebuild(); }
    });
    canvas.addEventListener('pointerup', function () { drag = null; });

    var keyUsed = false;
    canvas.tabIndex = 0;
    canvas.addEventListener('keydown', function (e) {
      var d = e.shiftKey ? 15 : 3, used = true;
      if (e.key === 'ArrowLeft') q.a -= d; else if (e.key === 'ArrowRight') q.a += d;
      else if (e.key === 'ArrowUp') q.b += d; else if (e.key === 'ArrowDown') q.b -= d;
      else if (e.key === 'g' || e.key === 'G') { goal = { a: q.a, b: q.b }; RA.announce('Goal pose set.', true); }
      else if (e.key === 'p' || e.key === 'P' || e.key === 'Enter') plan();
      else used = false;
      if (!used) return;
      e.preventDefault(); keyUsed = true;
      q.a = ((q.a % 360) + 360) % 360; q.b = wrapDeg(q.b);
      if (/Arrow/.test(e.key)) { path = null; RA.announce('θ1 ' + Math.round(q.a) + ', θ2 ' + Math.round(q.b) + (collides(q.a, q.b) ? ', collision' : ', free'), true); }
    });

    var setGoal = document.getElementById('cs-goal'), planBtn = document.getElementById('cs-plan'), shuffle = document.getElementById('cs-shuffle');
    if (setGoal) setGoal.addEventListener('click', function () { goal = { a: q.a, b: q.b }; path = null; RA.announce('Goal pose set. Now move the arm somewhere else and press Plan.', true); });
    if (planBtn) planBtn.addEventListener('click', plan);
    if (shuffle) shuffle.addEventListener('click', function () {
      obstacles.forEach(function (o) {
        var a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 100;
        o.x = clamp(BASE.x + Math.cos(a) * r, 20, PANEL - 20); o.y = clamp(BASE.y + Math.sin(a) * r, 20, H - 20);
      });
      rebuild();
    });

    rebuild();
    q = { a: 200, b: -40 };
    if (collides(q.a, q.b)) for (var k = 0; k < N * N; k++) if (!grid[k]) { var an0 = angles(k % N, (k / N) | 0); q = { a: an0.a, b: an0.b }; break; }
    RA.loop(function () { step(); draw(); });
  }
})();
