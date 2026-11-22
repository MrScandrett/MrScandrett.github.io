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

  // Symmetric competition-style arena (180° rotational symmetry around center).
  var SYMMETRIC_WORLD = [
    { x: 0, y: 0, w: W, h: 8 }, { x: 0, y: H - 8, w: W, h: 8 },
    { x: 0, y: 0, w: 8, h: H }, { x: W - 8, y: 0, w: 8, h: H },
    { x: W / 2 - 6, y: 8, w: 12, h: 112 }, { x: W / 2 - 6, y: H - 120, w: 12, h: 112 },
    { x: 115, y: 78, w: 50, h: 50 }, { x: W - 165, y: H - 128, w: 50, h: 50 },
    { x: 175, y: 255, w: 60, h: 24 }, { x: W - 235, y: H - 279, w: 60, h: 24 }
  ];

  var TAGS = [
    { id: 1, x: 16, y: 80, label: '#1' },
    { id: 2, x: 16, y: H - 80, label: '#2' },
    { id: 3, x: W - 16, y: 80, label: '#3' },
    { id: 4, x: W - 16, y: H - 80, label: '#4' }
  ];

  function freeSpot(world) {
    var rects = world || WORLD;
    for (var i = 0; i < 500; i++) {
      var x = 20 + Math.random() * (W - 40), y = 20 + Math.random() * (H - 40);
      if (!RA.hitsRect(x, y, ROBOT_R + 4, rects)) return { x: x, y: y };
    }
    return { x: 80, y: 80 };
  }

  // Shared wander behaviour: drive forward, turn toward open space when blocked,
  // or steer toward a clicked waypoint.
  function steer(pose, target, dt, world) {
    var rects = world || WORLD;
    var v = 70, w = 0;
    var front = Math.min(RA.rayCast(pose.x, pose.y, pose.a, rects, 200), RA.rayCast(pose.x, pose.y, pose.a - 0.35, rects, 200), RA.rayCast(pose.x, pose.y, pose.a + 0.35, rects, 200));
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
      var left = RA.rayCast(pose.x, pose.y, pose.a - 1.2, rects, 200);
      var right = RA.rayCast(pose.x, pose.y, pose.a + 1.2, rects, 200);
      w = (left > right ? -1 : 1) * 2.6;
      v = front < 22 ? 0 : 25;
    }
    return { v: v, w: w };
  }

  function move(pose, v, w, dt, world) {
    var rects = world || WORLD;
    var nx = pose.x + Math.cos(pose.a) * v * dt, ny = pose.y + Math.sin(pose.a) * v * dt;
    if (!RA.hitsRect(nx, ny, ROBOT_R, rects)) { pose.x = nx; pose.y = ny; }
    pose.a += w * dt;
  }

  function drawRobot(ctx, p, fill, stroke, ghost) {
    RA.drawRobot(ctx, p.x, p.y, p.a, ROBOT_R + 1, { body: fill, outline: stroke, ghost: ghost });
  }

  // Keyboard: arrows move a crosshair; Enter sends the robot there.
  function keyTarget(canvas, setTarget, getWorld) {
    var cur = RA.keyCursor(canvas, {
      step: 20, x: W / 2, y: H / 2,
      describe: function (c) {
        var rects = getWorld ? getWorld() : WORLD;
        return 'Crosshair at ' + Math.round(c.x / W * 100) + '% across, ' + Math.round(c.y / H * 100) + '% down' + (RA.hitsRect(c.x, c.y, ROBOT_R, rects) ? ', inside a wall.' : '. Press Enter to send the robot here.');
      },
      onKey: function (k, c) {
        if (k !== 'Enter') return false;
        var rects = getWorld ? getWorld() : WORLD;
        var ok = !RA.hitsRect(c.x, c.y, ROBOT_R, rects);
        setTarget(ok ? { x: c.x, y: c.y } : null);
        RA.announce(ok ? 'Robot sent to the crosshair.' : 'That spot is inside a wall. The robot will wander instead.', true);
        return true;
      }
    });
    return cur;
  }

  function drawWorld(ctx, world) {
    world.forEach(function (r) { RoboticsVisuals.barrier(ctx, r.x, r.y, r.w, r.h); });
  }

  /* ── Sim 1: occupancy grid mapping ─────────────────────────────── */
  function mappingSim() {
    var canvas = document.getElementById('map-canvas');
    if (!canvas || !window.RobotSlamEngine) return;
    var SLAM = window.RobotSlamEngine;
    var ctx = RA.setupHiDpiCanvas(canvas, W, H).ctx;
    var CELL = 8, GW = W / CELL, GH = H / CELL;
    var L_FREE = -0.4, L_OCC = 0.9, L_MAX = 5;
    var grid = new Float32Array(GW * GH);
    var img = document.createElement('canvas'); img.width = GW; img.height = GH;
    var ictx = img.getContext('2d'), idata = ictx.createImageData(GW, GH);
    var ui = {
      rays: document.getElementById('map-rays'), noise: document.getElementById('map-noise'),
      showScan: document.getElementById('map-show-scan'),
      drift: document.getElementById('map-drift'), truth: document.getElementById('map-truth'),
      slam: document.getElementById('map-slam'),
      run: document.getElementById('map-run'), reset: document.getElementById('map-reset'),
      readout: document.getElementById('map-readout')
    };
    var pose, belief, target, running = true, t = 0, scanTimer = 0;
    var lastRays = [], scanPose;

    function reset() {
      grid.fill(0);
      lastRays = [];
      var s = { x: 70, y: 70 };
      pose = { x: s.x, y: s.y, a: 0.3 };
      belief = { x: s.x, y: s.y, a: 0.3 };
      target = null; t = 0; scanTimer = 0;
    }

    function scan() {
      var n = +ui.rays.value, sigma = +ui.noise.value, maxR = 180;
      var rays = [];
      for (var k = 0; k < n; k++) {
        var rel = -Math.PI + (k + 0.5) * (2 * Math.PI / n);
        var trueR = SLAM.rayCast(pose.x, pose.y, pose.a + rel, WORLD, maxR);
        var z = Math.max(0, trueR + RA.gauss() * sigma);
        rays.push({ rel: rel, z: z, hit: trueR < maxR });
      }
      if (ui.drift.checked && ui.slam && ui.slam.checked) {
        var match = SLAM.correlativeScanMatch({
          grid: grid, gw: GW, gh: GH, cellSize: CELL, belief: belief, rays: rays
        });
        if (match.improved) {
          belief.x = match.pose.x;
          belief.y = match.pose.y;
          belief.a = match.pose.a;
        }
      }
      for (var i = 0; i < rays.length; i++) {
        var r = rays[i];
        SLAM.updateOccupancyRay({
          grid: grid, gw: GW, gh: GH, cellSize: CELL,
          pose: belief, rel: r.rel, z: r.z, hit: r.hit, maxR: maxR,
          lFree: L_FREE, lOcc: L_OCC, lMax: L_MAX
        });
      }
      return rays;
    }

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
      if (scanTimer > 0.1) {
        scanTimer = 0;
        scanPose = { x: pose.x, y: pose.y, a: pose.a };
        lastRays = scan();
      }
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
      // Keep each scan anchored at its measurement pose, even as the rover moves.
      if (ui.showScan.checked) {
        ctx.beginPath();
        lastRays.forEach(function (r) {
          ctx.moveTo(scanPose.x, scanPose.y);
          ctx.lineTo(scanPose.x + Math.cos(scanPose.a + r.rel) * r.z,
            scanPose.y + Math.sin(scanPose.a + r.rel) * r.z);
        });
        ctx.strokeStyle = '#a8f0ff80'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.strokeStyle = '#145062c0'; ctx.lineWidth = 1; ctx.stroke();
        lastRays.forEach(function (r) {
          if (!r.hit) return;
          var x = scanPose.x + Math.cos(scanPose.a + r.rel) * r.z;
          var y = scanPose.y + Math.sin(scanPose.a + r.rel) * r.z;
          RoboticsVisuals.disc(ctx, x, y, 2.5, '#163742');
          RoboticsVisuals.disc(ctx, x, y, 1.4, '#a8f0ff');
        });
      }
      if (target) { ctx.strokeStyle = '#f2bf3f'; ctx.beginPath(); ctx.arc(target.x, target.y, 7, 0, Math.PI * 2); ctx.stroke(); }
      if (ui.drift.checked) drawRobot(ctx, belief, '#c65e2e', '#ffb38a', .75);
      drawRobot(ctx, pose, '#146b8c', '#e8f6fb');
      RA.drawCursor(ctx, mapCursor);
      var err = Math.hypot(pose.x - belief.x, pose.y - belief.y);
      ui.readout.textContent = 'Map explored: ' + Math.round(100 * known / grid.length) + '% of cells · ' + occ + ' cells marked occupied' +
        (ui.drift.checked ? ' · odometry error: ' + (err / 20).toFixed(2) + ' m' + (ui.slam && ui.slam.checked ? ' (SLAM active)' : '') : '');
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
    var mapCursor = keyTarget(canvas, function (t) { target = t; });
    ui.reset.addEventListener('click', reset);
    ui.drift.addEventListener('change', reset);
    if (ui.slam) {
      ui.slam.addEventListener('change', function () {
        if (ui.slam.checked && !ui.drift.checked) ui.drift.checked = true;
        RA.announce(ui.slam.checked ? 'Correlative scan-matching SLAM enabled.' : 'Scan-matching SLAM disabled.', true);
      });
    }
    [ui.rays, ui.noise].forEach(function (el) {
      el.addEventListener('input', function () { document.getElementById(el.id + '-out').textContent = el.value; });
    });
    reset();
    RA.loop(function (dt) { step(dt); draw(); }, canvas);
  }

  /* ── Sim 2: particle filter (Monte Carlo localization) ─────────── */
  function particleSim() {
    var canvas = document.getElementById('pf-canvas');
    if (!canvas || !window.RobotSlamEngine) return;
    var SLAM = window.RobotSlamEngine;
    var ctx = RA.setupHiDpiCanvas(canvas, W, H).ctx;
    var N = 500, BEAMS = 12, MAXR = 220;
    var ui = {
      sigma: document.getElementById('pf-sigma'), run: document.getElementById('pf-run'),
      kidnap: document.getElementById('pf-kidnap'), reset: document.getElementById('pf-reset'),
      inject: document.getElementById('pf-inject'), tags: document.getElementById('pf-tags'),
      symmetric: document.getElementById('pf-symmetric'), readout: document.getElementById('pf-readout')
    };
    var pose, particles, cachedEst, running = true, timer = 0, updates = 0, target = null, symmetric = false, visibleTags = [];

    function activeWorld() { return symmetric ? SYMMETRIC_WORLD : WORLD; }
    function wrapA(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

    function refreshEstimate() {
      cachedEst = SLAM.estimateClump(particles, 40);
    }

    function scatter() {
      particles = [];
      var rects = activeWorld();
      for (var i = 0; i < N; i++) { var s = freeSpot(rects); particles.push({ x: s.x, y: s.y, a: Math.random() * Math.PI * 2, w: 1 / N }); }
      updates = 0;
      refreshEstimate();
    }
    function reset() {
      var rects = activeWorld();
      var s = freeSpot(rects);
      pose = { x: s.x, y: s.y, a: Math.random() * 6.28 };
      visibleTags = [];
      scatter();
      target = null;
    }

    function sense(p) {
      var out = [], rects = activeWorld();
      for (var k = 0; k < BEAMS; k++) out.push(RA.rayCast(p.x, p.y, p.a + k * 2 * Math.PI / BEAMS, rects, MAXR));
      return out;
    }

    function seeTags(p) {
      if (!ui.tags || !ui.tags.checked) return [];
      var rects = activeWorld(), seen = [];
      for (var i = 0; i < TAGS.length; i++) {
        var tg = TAGS[i], dx = tg.x - p.x, dy = tg.y - p.y, dist = Math.hypot(dx, dy);
        if (dist > 320) continue;
        var absAng = Math.atan2(dy, dx), rel = wrapA(absAng - p.a);
        if (Math.abs(rel) > 0.85) continue; // ~±49° forward camera FOV
        var wallD = RA.rayCast(p.x, p.y, absAng, rects, dist + 10);
        if (wallD >= dist - 14) seen.push({ tag: tg, range: dist, bearing: rel });
      }
      return seen;
    }

    function update() {
      var sigma = +ui.sigma.value, rects = activeWorld();
      var z = sense(pose).map(function (r) { return Math.max(0, r + RA.gauss() * 6); });
      visibleTags = seeTags(pose).map(function (obs) {
        return { tag: obs.tag, range: Math.max(4, obs.range + RA.gauss() * 4), bearing: obs.bearing + RA.gauss() * 0.04 };
      });
      var total = 0;
      particles.forEach(function (p) {
        if (RA.hitsRect(p.x, p.y, 2, rects) || p.x < 0 || p.y < 0 || p.x > W || p.y > H) { p.w = 1e-300; return; }
        var zh = sense(p), e = 0;
        for (var k = 0; k < BEAMS; k++) e += (z[k] - zh[k]) * (z[k] - zh[k]);
        var w = Math.exp(-e / (2 * sigma * sigma * 3));
        if (visibleTags.length) {
          for (var t = 0; t < visibleTags.length; t++) {
            var obs = visibleTags[t], tg = obs.tag;
            var pr = Math.hypot(tg.x - p.x, tg.y - p.y);
            var pb = wrapA(Math.atan2(tg.y - p.y, tg.x - p.x) - p.a);
            var dr = obs.range - pr, db = wrapA(obs.bearing - pb);
            var clear = RA.rayCast(p.x, p.y, Math.atan2(tg.y - p.y, tg.x - p.x), rects, pr + 10) >= pr - 14;
            if (!clear || Math.abs(pb) > 1.15) w *= 0.02;
            else w *= Math.exp(-(dr * dr) / (2 * Math.max(12, sigma) * Math.max(12, sigma)) - (db * db) / (2 * 0.25 * 0.25));
          }
        }
        p.w = w + 1e-300;
        total += p.w;
      });
      // Low-variance resampling, plus a few random particles so a kidnapped
      // robot can recover.
      var injectFrac = ui.inject.checked ? 0.04 : 0;
      var keep = Math.round(N * (1 - injectFrac));
      var next = SLAM.lowVarianceResample(particles, total, keep);
      while (next.length < N) { var s = freeSpot(rects); next.push({ x: s.x, y: s.y, a: Math.random() * 6.28, w: 1 / N }); }
      particles = next;
      updates++;
      refreshEstimate();
    }

    function step(dt) {
      if (!running) return;
      var rects = activeWorld();
      var cmd = steer(pose, target, dt, rects);
      if (cmd.arrived) target = null;
      var before = { x: pose.x, y: pose.y, a: pose.a };
      move(pose, cmd.v, cmd.w, dt, rects);
      var dist = Math.hypot(pose.x - before.x, pose.y - before.y), dA = pose.a - before.a;
      // Motion update: every particle moves the way the odometry says, plus noise.
      particles.forEach(function (p) {
        var d = dist * (1 + RA.gauss() * 0.1);
        p.a += dA + RA.gauss() * 0.02;
        p.x += Math.cos(p.a) * d + RA.gauss() * 0.4; p.y += Math.sin(p.a) * d + RA.gauss() * 0.4;
      });
      refreshEstimate();
      timer += dt;
      if (timer > 0.25) { timer = 0; update(); }
    }

    function draw() {
      var rects = activeWorld();
      RoboticsVisuals.floor(ctx, W, H, { step: 20, light: true });
      drawWorld(ctx, rects);
      if (ui.tags && ui.tags.checked) {
        // Draw AprilTag landmarks and active camera sight lines
        visibleTags.forEach(function (obs) {
          ctx.save();
          ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(20, 107, 140, 0.7)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(pose.x, pose.y); ctx.lineTo(obs.tag.x, obs.tag.y); ctx.stroke();
          ctx.restore();
        });
        TAGS.forEach(function (tg) {
          var active = visibleTags.some(function (obs) { return obs.tag.id === tg.id; });
          ctx.fillStyle = active ? '#70c8e5' : '#233b45';
          ctx.strokeStyle = active ? '#0f1d23' : '#70c8e5';
          ctx.lineWidth = 2;
          ctx.fillRect(tg.x - 13, tg.y - 10, 26, 20);
          ctx.strokeRect(tg.x - 13, tg.y - 10, 26, 20);
          ctx.fillStyle = active ? '#0f1d23' : '#e8f6fb';
          ctx.font = '700 10px "IBM Plex Mono", monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(tg.label, tg.x, tg.y + 0.5);
        });
      }
      ctx.fillStyle = 'rgba(217,75,65,.75)';
      particles.forEach(function (p) {
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      });
      ctx.strokeStyle = 'rgba(20,107,140,.35)';
      sense(pose).forEach(function (r, k) {
        var a = pose.a + k * 2 * Math.PI / BEAMS;
        ctx.beginPath(); ctx.moveTo(pose.x, pose.y); ctx.lineTo(pose.x + Math.cos(a) * r, pose.y + Math.sin(a) * r); ctx.stroke();
      });
      var est = cachedEst || SLAM.estimateClump(particles, 40);
      drawRobot(ctx, pose, '#146b8c', '#0b2a36');
      var sure = est.agree > 0.6;
      if (sure) {
        ctx.save();
        ctx.strokeStyle = 'rgba(242,191,63,.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(est.x, est.y, est.r95, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        drawRobot(ctx, est, '#f2bf3f', '#8a6400', .75);
      }
      RA.drawCursor(ctx, pfCursor, '#12202a');
      var err = Math.hypot(est.x - pose.x, est.y - pose.y);
      var news = sure ? 'The guesses agree: the robot is localized.' : '';
      if (news && !wasSure) RA.announce(news);
      wasSure = sure;
      var tagStatus = ui.tags && ui.tags.checked ? (' · AprilTags seen: ' + (visibleTags.length ? visibleTags.map(function (o) { return o.tag.label; }).join(', ') : 'none')) : '';
      ui.readout.textContent = 'Sensor updates: ' + updates + ' · ' + Math.round(est.agree * 100) + '% of guesses agree · ' +
        (sure ? 'best guess is ' + (err / 20).toFixed(2) + ' m from the true robot' : (symmetric && !(ui.tags && ui.tags.checked) ? 'symmetric arena: LiDAR sees twin halves' : 'still unsure: several places look alike')) + tagStatus;
    }

    canvas.addEventListener('pointerdown', function (e) {
      var p = RA.canvasPoint(canvas, e);
      target = RA.hitsRect(p.x, p.y, ROBOT_R, activeWorld()) ? null : p;
    });
    ui.run.addEventListener('click', function () {
      running = !running;
      ui.run.textContent = running ? 'Pause' : 'Resume';
      ui.run.setAttribute('aria-pressed', String(!running));
    });
    var pfCursor = keyTarget(canvas, function (t) { target = t; }, activeWorld), wasSure = false;
    ui.kidnap.addEventListener('click', function () { var s = freeSpot(activeWorld()); pose.x = s.x; pose.y = s.y; pose.a = Math.random() * 6.28; target = null; RA.announce('Robot kidnapped to a random spot.', true); });
    if (ui.symmetric) {
      ui.symmetric.addEventListener('click', function () {
        symmetric = !symmetric;
        ui.symmetric.setAttribute('aria-pressed', String(symmetric));
        reset();
        RA.announce(symmetric ? 'Symmetric competition arena loaded.' : 'Asymmetric office map loaded.', true);
      });
    }
    if (ui.tags) {
      ui.tags.addEventListener('change', function () {
        visibleTags = [];
        RA.announce(ui.tags.checked ? 'AprilTag landmarks enabled.' : 'AprilTag landmarks disabled.', true);
      });
    }
    ui.reset.addEventListener('click', reset);
    ui.sigma.addEventListener('input', function () { document.getElementById('pf-sigma-out').textContent = ui.sigma.value; });
    reset();
    RA.loop(function (dt) { step(dt); draw(); }, canvas);
  }

  mappingSim();
  particleSim();
})();
