/* Robot Mapping & Localization: occupancy-grid mapping (with optional odometry
   drift, to show why SLAM is needed) and Monte Carlo (particle filter)
   localization on a known map. */
(function () {
  'use strict';
  var RA = window.RobotAutonomy;
  var W = 640, H = 400, ROBOT_R = 9;

  // The hidden "real world" the robot explores. Border walls + furniture.
  var WORLD = [
    { x: 0, y: 0, w: W, h: 8 }, { x: 0, y: H - 8, w: W, h: 8 },
    { x: 0, y: 0, w: 8, h: H }, { x: W - 8, y: 0, w: 8, h: H },
    { x: 150, y: 8, w: 12, h: 150 }, { x: 150, y: 240, w: 12, h: 152 },
    { x: 300, y: 120, w: 160, h: 14 }, { x: 380, y: 134, w: 14, h: 110 },
    { x: 480, y: 280, w: 100, h: 40 }, { x: 60, y: 300, w: 50, h: 50 },
    { x: 250, y: 300, w: 30, h: 30 }, { x: 520, y: 60, w: 40, h: 70 }
  ];

  function freeSpot() {
    for (var i = 0; i < 500; i++) {
      var x = 20 + Math.random() * (W - 40), y = 20 + Math.random() * (H - 40);
      if (!RA.hitsRect(x, y, ROBOT_R + 4, WORLD)) return { x: x, y: y };
    }
    return { x: 80, y: 80 };
  }

  // Shared wander behaviour: drive forward, turn toward open space when blocked,
  // or steer toward a clicked waypoint.
  function steer(pose, target, dt) {
    var v = 70, w = 0;
    var front = Math.min(RA.rayCast(pose.x, pose.y, pose.a, WORLD, 200), RA.rayCast(pose.x, pose.y, pose.a - 0.35, WORLD, 200), RA.rayCast(pose.x, pose.y, pose.a + 0.35, WORLD, 200));
    if (target) {
      var desired = Math.atan2(target.y - pose.y, target.x - pose.x);
      var err = Math.atan2(Math.sin(desired - pose.a), Math.cos(desired - pose.a));
      w = Math.max(-2.5, Math.min(2.5, 3 * err));
      if (Math.hypot(target.x - pose.x, target.y - pose.y) < 12) return { v: 0, w: 0, arrived: true };
    } else {
      pose.wander = (pose.wander || 0) + RA.gauss() * 1.2 * dt;
      pose.wander *= 0.98;
      w = pose.wander;
    }
    if (front < 45) {
      var left = RA.rayCast(pose.x, pose.y, pose.a - 1.2, WORLD, 200);
      var right = RA.rayCast(pose.x, pose.y, pose.a + 1.2, WORLD, 200);
      w = (left > right ? -1 : 1) * 2.6;
      v = front < 22 ? 0 : 25;
    }
    return { v: v, w: w };
  }

  function move(pose, v, w, dt) {
    var nx = pose.x + Math.cos(pose.a) * v * dt, ny = pose.y + Math.sin(pose.a) * v * dt;
    if (!RA.hitsRect(nx, ny, ROBOT_R, WORLD)) { pose.x = nx; pose.y = ny; }
    pose.a += w * dt;
  }

  function drawRobot(ctx, p, fill, stroke) {
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.a);
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, ROBOT_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ROBOT_R + 4, 0); ctx.stroke();
    ctx.restore();
  }

  function drawWorld(ctx, style) {
    ctx.fillStyle = style;
    WORLD.forEach(function (r) { ctx.fillRect(r.x, r.y, r.w, r.h); });
  }

  /* ── Sim 1: occupancy grid mapping ─────────────────────────────── */
  function mappingSim() {
    var canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var CELL = 8, GW = W / CELL, GH = H / CELL;
    var L_FREE = -0.4, L_OCC = 0.9, L_MAX = 5;
    var grid = new Float32Array(GW * GH);
    var img = document.createElement('canvas'); img.width = GW; img.height = GH;
    var ictx = img.getContext('2d'), idata = ictx.createImageData(GW, GH);
    var ui = {
      rays: document.getElementById('map-rays'), noise: document.getElementById('map-noise'),
      drift: document.getElementById('map-drift'), truth: document.getElementById('map-truth'),
      run: document.getElementById('map-run'), reset: document.getElementById('map-reset'),
      readout: document.getElementById('map-readout')
    };
    var pose, belief, target, running = true, t = 0, scanTimer = 0;

    function reset() {
      grid.fill(0);
      var s = { x: 70, y: 70 };
      pose = { x: s.x, y: s.y, a: 0.3 };
      belief = { x: s.x, y: s.y, a: 0.3 };
      target = null; t = 0;
    }

    function mark(cx, cy, delta) {
      if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return;
      var i = cy * GW + cx;
      grid[i] = Math.max(-L_MAX, Math.min(L_MAX, grid[i] + delta));
    }

    function scan() {
      var n = +ui.rays.value, sigma = +ui.noise.value, maxR = 180;
      var rays = [];
      for (var k = 0; k < n; k++) {
        var rel = -Math.PI + (k + 0.5) * (2 * Math.PI / n);
        var trueR = RA.rayCast(pose.x, pose.y, pose.a + rel, WORLD, maxR);
        var z = Math.max(0, trueR + RA.gauss() * sigma);
        rays.push({ rel: rel, z: z, hit: trueR < maxR });
        // Update the map from where the robot BELIEVES it is.
        var a = belief.a + rel, cx = Math.cos(a), sy = Math.sin(a);
        var last = -1;
        for (var d = 0; d < Math.min(z, maxR) - CELL * 0.5; d += CELL * 0.5) {
          var gx = Math.floor((belief.x + cx * d) / CELL), gy = Math.floor((belief.y + sy * d) / CELL);
          var id = gy * GW + gx;
          if (id !== last) { mark(gx, gy, L_FREE); last = id; }
        }
        if (trueR < maxR) mark(Math.floor((belief.x + cx * z) / CELL), Math.floor((belief.y + sy * z) / CELL), L_OCC);
      }
      return rays;
    }

    var lastRays = [];
    function step(dt) {
      if (!running) return;
      t += dt;
      var cmd = steer(pose, target, dt);
      if (cmd.arrived) target = null;
      move(pose, cmd.v, cmd.w, dt);
      // Odometry: what the wheel encoders + gyro report. With drift on, the
      // heading estimate picks up a slow bias and the distance a small error.
      var drift = ui.drift.checked;
      var vOdo = cmd.v * (drift ? 1.04 : 1), wOdo = cmd.w + (drift ? 0.05 + RA.gauss() * 0.05 : 0);
      if (!drift) { belief.x = pose.x; belief.y = pose.y; belief.a = pose.a; }
      else { belief.x += Math.cos(belief.a) * vOdo * dt; belief.y += Math.sin(belief.a) * vOdo * dt; belief.a += wOdo * dt; }
      scanTimer += dt;
      if (scanTimer > 0.1) { scanTimer = 0; lastRays = scan(); }
    }

    function draw() {
      var known = 0, occ = 0;
      for (var i = 0; i < grid.length; i++) {
        var l = grid[i], p = 1 - 1 / (1 + Math.exp(l)), o = i * 4;
        var shade;
        if (Math.abs(l) < 0.05) { shade = [52, 72, 80]; }
        else { known++; if (p > 0.6) occ++; var c = Math.round(235 - p * 225); shade = [c, c + 6 > 255 ? 255 : c + 6, c + 4 > 255 ? 255 : c + 4]; }
        idata.data[o] = shade[0]; idata.data[o + 1] = shade[1]; idata.data[o + 2] = shade[2]; idata.data[o + 3] = 255;
      }
      ictx.putImageData(idata, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, W, H);
      if (ui.truth.checked) {
        ctx.strokeStyle = 'rgba(242,191,63,.9)'; ctx.lineWidth = 1.5;
        WORLD.forEach(function (r) { ctx.strokeRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1); });
      }
      ctx.strokeStyle = 'rgba(184,216,75,.35)'; ctx.lineWidth = 1;
      lastRays.forEach(function (r) {
        ctx.beginPath(); ctx.moveTo(pose.x, pose.y);
        ctx.lineTo(pose.x + Math.cos(pose.a + r.rel) * r.z, pose.y + Math.sin(pose.a + r.rel) * r.z); ctx.stroke();
      });
      if (target) { ctx.strokeStyle = '#f2bf3f'; ctx.beginPath(); ctx.arc(target.x, target.y, 7, 0, Math.PI * 2); ctx.stroke(); }
      if (ui.drift.checked) drawRobot(ctx, belief, 'rgba(198,94,46,.55)', '#ffb38a');
      drawRobot(ctx, pose, '#146b8c', '#e8f6fb');
      var err = Math.hypot(pose.x - belief.x, pose.y - belief.y);
      ui.readout.textContent = 'Map explored: ' + Math.round(100 * known / grid.length) + '% of cells · ' + occ + ' cells marked occupied' +
        (ui.drift.checked ? ' · odometry error: ' + (err / 20).toFixed(2) + ' m' : '');
    }

    canvas.addEventListener('pointerdown', function (e) {
      var p = RA.canvasPoint(canvas, e);
      target = RA.hitsRect(p.x, p.y, ROBOT_R, WORLD) ? null : p;
    });
    ui.run.addEventListener('click', function () {
      running = !running;
      ui.run.textContent = running ? 'Pause' : 'Resume';
      ui.run.setAttribute('aria-pressed', String(!running));
    });
    ui.reset.addEventListener('click', reset);
    ui.drift.addEventListener('change', reset);
    [ui.rays, ui.noise].forEach(function (el) {
      el.addEventListener('input', function () { document.getElementById(el.id + '-out').textContent = el.value; });
    });
    reset();
    RA.loop(function (dt) { step(dt); draw(); });
  }

  /* ── Sim 2: particle filter (Monte Carlo localization) ─────────── */
  function particleSim() {
    var canvas = document.getElementById('pf-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var N = 500, BEAMS = 12, MAXR = 220;
    var ui = {
      sigma: document.getElementById('pf-sigma'), run: document.getElementById('pf-run'),
      kidnap: document.getElementById('pf-kidnap'), reset: document.getElementById('pf-reset'),
      inject: document.getElementById('pf-inject'), readout: document.getElementById('pf-readout')
    };
    var pose, particles, running = true, timer = 0, updates = 0, target = null;

    function scatter() {
      particles = [];
      for (var i = 0; i < N; i++) { var s = freeSpot(); particles.push({ x: s.x, y: s.y, a: Math.random() * Math.PI * 2, w: 1 / N }); }
      updates = 0;
    }
    function reset() { var s = freeSpot(); pose = { x: s.x, y: s.y, a: Math.random() * 6.28 }; scatter(); target = null; }

    function sense(p) {
      var out = [];
      for (var k = 0; k < BEAMS; k++) out.push(RA.rayCast(p.x, p.y, p.a + k * 2 * Math.PI / BEAMS, WORLD, MAXR));
      return out;
    }

    function update() {
      var sigma = +ui.sigma.value;
      var z = sense(pose).map(function (r) { return Math.max(0, r + RA.gauss() * 6); });
      var total = 0;
      particles.forEach(function (p) {
        if (RA.hitsRect(p.x, p.y, 2, WORLD) || p.x < 0 || p.y < 0 || p.x > W || p.y > H) { p.w = 1e-300; return; }
        var zh = sense(p), e = 0;
        for (var k = 0; k < BEAMS; k++) e += (z[k] - zh[k]) * (z[k] - zh[k]);
        p.w = Math.exp(-e / (2 * sigma * sigma * 3)) + 1e-300;
        total += p.w;
      });
      // Low-variance resampling, plus a few random particles so a kidnapped
      // robot can recover.
      var injectFrac = ui.inject.checked ? 0.04 : 0;
      var keep = Math.round(N * (1 - injectFrac)), next = [];
      var r = Math.random() / keep, c = particles[0].w / total, i = 0;
      for (var m = 0; m < keep; m++) {
        var u = r + m / keep;
        while (u > c && i < N - 1) { i++; c += particles[i].w / total; }
        var src = particles[i];
        next.push({ x: src.x, y: src.y, a: src.a, w: 1 / N });
      }
      while (next.length < N) { var s = freeSpot(); next.push({ x: s.x, y: s.y, a: Math.random() * 6.28, w: 1 / N }); }
      particles = next;
      updates++;
    }

    // Best guess = average of the densest clump of particles (random
    // re-injected guesses would drag a plain average toward the middle).
    function estimate() {
      var best = null, bestCount = -1;
      for (var s = 0; s < 40; s++) {
        var c = particles[(Math.random() * particles.length) | 0], count = 0;
        particles.forEach(function (p) { if (Math.abs(p.x - c.x) < 40 && Math.abs(p.y - c.y) < 40) count++; });
        if (count > bestCount) { bestCount = count; best = c; }
      }
      var sx = 0, sy = 0, sc = 0, ss = 0, n = 0;
      particles.forEach(function (p) {
        if (Math.abs(p.x - best.x) < 40 && Math.abs(p.y - best.y) < 40) { sx += p.x; sy += p.y; sc += Math.cos(p.a); ss += Math.sin(p.a); n++; }
      });
      return { x: sx / n, y: sy / n, a: Math.atan2(ss, sc), agree: n / particles.length };
    }

    function step(dt) {
      if (!running) return;
      var cmd = steer(pose, target, dt);
      if (cmd.arrived) target = null;
      var before = { x: pose.x, y: pose.y, a: pose.a };
      move(pose, cmd.v, cmd.w, dt);
      var dist = Math.hypot(pose.x - before.x, pose.y - before.y), dA = pose.a - before.a;
      // Motion update: every particle moves the way the odometry says, plus noise.
      particles.forEach(function (p) {
        var d = dist * (1 + RA.gauss() * 0.1);
        p.a += dA + RA.gauss() * 0.02;
        p.x += Math.cos(p.a) * d + RA.gauss() * 0.4; p.y += Math.sin(p.a) * d + RA.gauss() * 0.4;
      });
      timer += dt;
      if (timer > 0.25) { timer = 0; update(); }
    }

    function draw() {
      ctx.fillStyle = '#e8efec'; ctx.fillRect(0, 0, W, H);
      drawWorld(ctx, '#29424b');
      ctx.fillStyle = 'rgba(217,75,65,.75)';
      particles.forEach(function (p) {
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      });
      ctx.strokeStyle = 'rgba(20,107,140,.35)';
      sense(pose).forEach(function (r, k) {
        var a = pose.a + k * 2 * Math.PI / BEAMS;
        ctx.beginPath(); ctx.moveTo(pose.x, pose.y); ctx.lineTo(pose.x + Math.cos(a) * r, pose.y + Math.sin(a) * r); ctx.stroke();
      });
      var est = estimate();
      drawRobot(ctx, pose, '#146b8c', '#0b2a36');
      var sure = est.agree > 0.6;
      if (sure) drawRobot(ctx, est, 'rgba(242,191,63,.6)', '#8a6400');
      var err = Math.hypot(est.x - pose.x, est.y - pose.y);
      ui.readout.textContent = 'Sensor updates: ' + updates + ' · ' + Math.round(est.agree * 100) + '% of guesses agree · ' +
        (sure ? 'best guess is ' + (err / 20).toFixed(2) + ' m from the true robot' : 'still unsure: several places look alike');
    }

    canvas.addEventListener('pointerdown', function (e) {
      var p = RA.canvasPoint(canvas, e);
      target = RA.hitsRect(p.x, p.y, ROBOT_R, WORLD) ? null : p;
    });
    ui.run.addEventListener('click', function () {
      running = !running;
      ui.run.textContent = running ? 'Pause' : 'Resume';
      ui.run.setAttribute('aria-pressed', String(!running));
    });
    ui.kidnap.addEventListener('click', function () { var s = freeSpot(); pose.x = s.x; pose.y = s.y; pose.a = Math.random() * 6.28; target = null; });
    ui.reset.addEventListener('click', reset);
    ui.sigma.addEventListener('input', function () { document.getElementById('pf-sigma-out').textContent = ui.sigma.value; });
    reset();
    RA.loop(function (dt) { step(dt); draw(); });
  }

  mappingSim();
  particleSim();
})();
