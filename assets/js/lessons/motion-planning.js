/* Motion Planning Lab: RRT / RRT*, artificial potential fields, and the
   Dynamic Window Approach on one shared obstacle course, plus a
   differential-drive kinematics playground. */
(function () {
  'use strict';
  var RA = window.RobotAutonomy;
  var MP = window.MotionPlanningEngine;
  var W = 640, H = 400, R = 10;

  /* ── Shared course ─────────────────────────────────────────────── */
  var canvas = document.getElementById('mp-canvas');
  if (canvas && MP) plannerLab();
  kinematicsLab();

  function dist(a, b) { return MP ? MP.dist(a, b) : Math.hypot(a.x - b.x, a.y - b.y); }
  function wrap(a) { return MP ? MP.wrapAngle(a) : Math.atan2(Math.sin(a), Math.cos(a)); }

  function plannerLab() {
    var ctx = RA.setupHiDpiCanvas(canvas, W, H).ctx;
    var ui = {
      modes: document.querySelectorAll('[data-mp-mode]'),
      run: document.getElementById('mp-run'), readout: document.getElementById('mp-readout'),
      rep: document.getElementById('mp-rep'), moving: document.getElementById('mp-moving'),
      showField: document.getElementById('mp-field'), global: document.getElementById('mp-global'),
      smooth: document.getElementById('mp-smooth'), smoothWrap: document.getElementById('mp-smooth-wrap'),
      explain: document.getElementById('mp-explain')
    };
    var mode = 'rrt';
    var start = { x: 50, y: 200 }, goal = { x: 590, y: 200 };
    var obstacles = [];
    var state = null, drag = null, cursor = null;

    var EXPLAIN = {
      rrt: 'RRT: pick a random point, find the nearest branch, grow one short step toward it. Repeat until a branch reaches the goal. Fast, but the path is wiggly.',
      rrtstar: 'RRT*: same random growth, but each new node picks the cheapest nearby parent and "rewires" neighbors through itself. Keep it running — the path straightens.',
      field: 'Potential field: the goal pulls, obstacles push. The robot slides downhill on the combined force. Simple and fast — until the pushes and pulls cancel out.',
      dwa: 'Dynamic Window: every tenth of a second, try many speed + turn combos the motors can actually reach, imagine each arc, and pick the safest one that heads toward the goal.'
    };

    function preset(name) {
      obstacles = [];
      if (name === 'trap') {
        // A U-shaped cup opening toward the robot: classic potential-field trap.
        for (var y = 120; y <= 280; y += 20) obstacles.push({ x: 380, y: y, r: 14 });
        for (var x = 300; x < 380; x += 20) { obstacles.push({ x: x, y: 120, r: 14 }); obstacles.push({ x: x, y: 280, r: 14 }); }
      } else if (name === 'forest') {
        for (var i = 0; i < 18; i++) {
          var o = { x: 120 + Math.random() * 400, y: 30 + Math.random() * 340, r: 14 + Math.random() * 22 };
          if (dist(o, start) > o.r + 30 && dist(o, goal) > o.r + 30) obstacles.push(o);
        }
      } else if (name === 'slalom') {
        obstacles.push({ x: 200, y: 90, r: 30 }, { x: 200, y: 160, r: 30 }, { x: 200, y: 230, r: 30 });
        obstacles.push({ x: 330, y: 170, r: 30 }, { x: 330, y: 240, r: 30 }, { x: 330, y: 310, r: 30 });
        obstacles.push({ x: 460, y: 90, r: 30 }, { x: 460, y: 160, r: 30 }, { x: 460, y: 230, r: 30 });
      } else if (name === 'narrow') {
        for (var ny = 18; ny <= 158; ny += 28) obstacles.push({ x: 320, y: ny, r: 16 });
        for (var sy = 242; sy <= 382; sy += 28) obstacles.push({ x: 320, y: sy, r: 16 });
        obstacles.push({ x: 215, y: 120, r: 22 }, { x: 425, y: 280, r: 22 });
      }
      obstacles.forEach(function (o) { o.vx = (Math.random() - 0.5) * 60; o.vy = (Math.random() - 0.5) * 60; });
      restart();
    }

    function blocked(p, pad) {
      return MP.isBlocked({ p: p, pad: pad, obstacles: obstacles, width: W, height: H });
    }
    function segmentFree(a, b) {
      return MP.isSegmentFree({ a: a, b: b, pad: R, obstacles: obstacles, width: W, height: H, step: 3 });
    }
    function clearance(p) {
      return MP.minClearance({ p: p, pad: R, obstacles: obstacles, width: W, height: H });
    }

    function restart() {
      if (mode === 'rrt' || mode === 'rrtstar') {
        state = {
          nodes: [{ x: start.x, y: start.y, parent: -1, cost: 0 }],
          goalNode: -1,
          goalCost: Infinity,
          initialGoalCost: null,
          treeVersion: 0,
          cachedSmoothVer: -1,
          cachedSmooth: null,
          cachedRawLen: 0,
          cachedSmoothLen: 0,
          t: 0
        };
      } else {
        state = { robot: { x: start.x, y: start.y, a: Math.atan2(goal.y - start.y, goal.x - start.x), v: 0, w: 0 }, trail: [], stuckT: 0, lastP: { x: start.x, y: start.y }, done: false, crashed: false, arcs: [], t: 0 };
      }
      state.running = true;
      ui.run.textContent = 'Pause'; ui.run.setAttribute('aria-pressed', 'false');
    }

    /* RRT / RRT* */
    var STEP = 18, NEIGH = 45, MAX_NODES = 3000;
    function growTree() {
      MP.rrtStep({
        state: state, goal: goal, mode: mode, obstacles: obstacles,
        width: W, height: H, pad: R, step: STEP, neigh: NEIGH, maxNodes: MAX_NODES
      });
    }
    function treePath() {
      var out = [goal], k = state.goalNode;
      while (k >= 0) { out.push(state.nodes[k]); k = state.nodes[k].parent; }
      return out;
    }
    function pathLength(pts) { return MP.pathLength(pts); }
    function smoothTreePath(raw) {
      return MP.shortcutPath({ rawPath: raw, pad: R, obstacles: obstacles, width: W, height: H });
    }

    /* Potential field */
    function force(p) {
      return MP.potentialFieldForce({
        p: p, goal: goal, obstacles: obstacles, repGain: +ui.rep.value, radius: R, width: W, height: H
      });
    }
    function stepField(dt) {
      var rb = state.robot, f = force(rb), fm = Math.hypot(f.x, f.y);
      var speed = Math.min(90, fm * 90);
      if (fm > 1e-6) { rb.x += f.x / fm * speed * dt; rb.y += f.y / fm * speed * dt; rb.a = Math.atan2(f.y, f.x); }
      return speed;
    }

    /* Coarse A* on a 16 px grid: the "global planner" DWA can follow. */
    var CELL = 16, GW = W / CELL, GH = H / CELL;
    function globalRoute(from) {
      var free = new Uint8Array(GW * GH);
      for (var gy = 0; gy < GH; gy++) for (var gx = 0; gx < GW; gx++) free[gy * GW + gx] = clearance({ x: gx * CELL + 8, y: gy * CELL + 8 }) > 4 ? 1 : 0;
      function id(p) { return Math.min(GH - 1, Math.max(0, Math.floor(p.y / CELL))) * GW + Math.min(GW - 1, Math.max(0, Math.floor(p.x / CELL))); }
      var s = id(from), g = id(goal), open = [s], came = {}, cost = {}; cost[s] = 0;
      free[s] = 1; free[g] = 1;
      function h(i) { return Math.hypot(i % GW - g % GW, Math.floor(i / GW) - Math.floor(g / GW)); }
      while (open.length) {
        var bi = 0;
        for (var k = 1; k < open.length; k++) if (cost[open[k]] + h(open[k]) < cost[open[bi]] + h(open[bi])) bi = k;
        var c = open.splice(bi, 1)[0];
        if (c === g) break;
        var cx = c % GW, cy = Math.floor(c / GW);
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          var nx = cx + dx, ny = cy + dy;
          if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
          var n = ny * GW + nx;
          if (!free[n]) continue;
          var nc = cost[c] + Math.hypot(dx, dy);
          if (cost[n] === undefined || nc < cost[n]) { cost[n] = nc; came[n] = c; if (open.indexOf(n) < 0) open.push(n); }
        }
      }
      if (cost[g] === undefined) return null;
      var route = [{ x: goal.x, y: goal.y }], k2 = came[g];
      while (k2 !== undefined && k2 !== s) { route.unshift({ x: (k2 % GW) * CELL + 8, y: Math.floor(k2 / GW) * CELL + 8 }); k2 = came[k2]; }
      return route;
    }
    function aimPoint(rb) {
      if (!ui.global.checked) return goal;
      state.replan = (state.replan || 0) - DT;
      if (!state.route || state.replan <= 0) { state.route = globalRoute(rb); state.replan = 1; }
      if (!state.route) return goal;
      for (var i = 0; i < state.route.length; i++) if (dist(state.route[i], rb) > 70) return state.route[i];
      return goal;
    }

    /* Dynamic Window Approach */
    var VMAX = 90, WMAX = 2.8, ACC = 120, WACC = 6, HORIZON = 1.6, DT = 0.1;
    function stepDWA(dt) {
      var rb = state.robot;
      state.t += dt;
      if (state.t >= DT || !state.arcs.length) {
        state.t = 0;
        var aim = aimPoint(rb);
        var best = null, arcs = [];
        var vLo = Math.max(0, rb.v - ACC * DT), vHi = Math.min(VMAX, rb.v + ACC * DT);
        var wLo = Math.max(-WMAX, rb.w - WACC * DT), wHi = Math.min(WMAX, rb.w + WACC * DT);
        for (var i = 0; i <= 6; i++) {
          for (var j = 0; j <= 12; j++) {
            var v = vLo + (vHi - vLo) * i / 6, w = wLo + (wHi - wLo) * j / 12;
            var p = { x: rb.x, y: rb.y, a: rb.a }, pts = [{ x: p.x, y: p.y }], minC = Infinity, hit = false;
            for (var t = 0; t < HORIZON; t += DT) {
              p.a += w * DT; p.x += Math.cos(p.a) * v * DT; p.y += Math.sin(p.a) * v * DT;
              pts.push({ x: p.x, y: p.y });
              var c = clearance(p);
              if (c < minC) minC = c;
              if (c < 0) { hit = true; break; }
            }
            // Must be able to stop before hitting the nearest obstacle.
            if (!hit && v * v / (2 * ACC) > Math.max(0, minC)) hit = true;
            var heading = 1 - Math.abs(wrap(Math.atan2(aim.y - p.y, aim.x - p.x) - p.a)) / Math.PI;
            var progress = 1 - Math.min(1, dist(p, aim) / Math.max(1, dist(rb, aim) + 1));
            var score = hit ? -Infinity : 0.8 * heading + 0.5 * Math.min(1, minC / 30) + 0.8 * v / VMAX + 1.0 * progress;
            var arc = { pts: pts, hit: hit, v: v, w: w, score: score };
            arcs.push(arc);
            if (!hit && (!best || score > best.score)) best = arc;
          }
        }
        state.arcs = arcs; state.best = best;
        if (best) { rb.v = best.v; rb.w = best.w; }
        else { rb.v = Math.max(0, rb.v - ACC * DT); rb.w = rb.w > 0 ? WMAX * .6 : -WMAX * .6; }
      }
      rb.a += rb.w * dt; rb.x += Math.cos(rb.a) * rb.v * dt; rb.y += Math.sin(rb.a) * rb.v * dt;
      return rb.v;
    }

    function moveObstacles(dt) {
      if (!ui.moving.checked || mode !== 'dwa') return;
      obstacles.forEach(function (o) {
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.x < o.r || o.x > W - o.r) o.vx *= -1;
        if (o.y < o.r || o.y > H - o.r) o.vy *= -1;
      });
    }

    function tick(dt) {
      if (!state.running) return;
      moveObstacles(dt);
      if (mode === 'rrt' || mode === 'rrtstar') { for (var i = 0; i < 12; i++) growTree(); return; }
      if (state.done || state.crashed) return;
      var rb = state.robot;
      var speed = mode === 'field' ? stepField(dt) : stepDWA(dt);
      if (!state.trail.length || dist(state.trail[state.trail.length - 1], rb) > 3) state.trail.push({ x: rb.x, y: rb.y });
      if (dist(rb, goal) < 14) { state.done = true; return; }
      if (clearance(rb) < -4) { state.crashed = true; return; }
      state.stuckT += dt;
      if (state.stuckT > 1.5) {
        state.stuck = dist(rb, state.lastP) < 8;
        state.stuckT = 0; state.lastP = { x: rb.x, y: rb.y };
      }
      state.speed = speed;
    }

    var lastMilestone = '';
    function arrow(x, y, dx, dy, len) {
      var m = Math.hypot(dx, dy); if (m < 1e-6) return;
      var ux = dx / m, uy = dy / m, ex = x + ux * len, ey = y + uy * len;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey);
      ctx.lineTo(ex - ux * 4 - uy * 3, ey - uy * 4 + ux * 3); ctx.moveTo(ex, ey); ctx.lineTo(ex - ux * 4 + uy * 3, ey - uy * 4 - ux * 3);
      ctx.stroke();
    }

    function draw() {
      RoboticsVisuals.floor(ctx, W, H, { step: 32, frame: true });

      if (mode === 'field' && ui.showField.checked) {
        ctx.strokeStyle = 'rgba(184,216,75,.55)'; ctx.lineWidth = 1.3;
        for (var x = 16; x < W; x += 32) for (var y = 16; y < H; y += 32) {
          if (blocked({ x: x, y: y }, 2)) continue;
          var f = force({ x: x, y: y }); arrow(x, y, f.x, f.y, 11);
        }
        ctx.lineWidth = 1;
      }
      obstacles.forEach(function (o) {
        ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(240,138,85,.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r + R, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        RA.drawRock(ctx, o.x, o.y, o.r);
      });

      var status = '';
      if (mode === 'rrt' || mode === 'rrtstar') {
        // Batch tree edges into 8 cost buckets so up to 3,000 nodes render in 8 canvas strokes.
        var maxCost = 1;
        for (var ni = 0; ni < state.nodes.length; ni++) {
          if (state.nodes[ni].cost > maxCost) maxCost = state.nodes[ni].cost;
        }
        var BUCKETS = 8;
        var buckets = Array.from({ length: BUCKETS }, function () { return []; });
        for (var ei = 1; ei < state.nodes.length; ei++) {
          var ndNode = state.nodes[ei];
          if (ndNode.parent < 0) continue;
          var bin = Math.min(BUCKETS - 1, Math.floor((ndNode.cost / maxCost) * BUCKETS));
          buckets[bin].push(ndNode);
        }
        ctx.lineWidth = 1.2;
        for (var bi = 0; bi < BUCKETS; bi++) {
          var edges = buckets[bi];
          if (!edges.length) continue;
          var frac = (bi + 0.5) / BUCKETS;
          ctx.strokeStyle = 'hsla(' + Math.round(190 + frac * 80) + ',75%,' + Math.round(68 - frac * 10) + '%,.6)';
          ctx.beginPath();
          for (var ej = 0; ej < edges.length; ej++) {
            var child = edges[ej], parent = state.nodes[child.parent];
            ctx.moveTo(parent.x, parent.y);
            ctx.lineTo(child.x, child.y);
          }
          ctx.stroke();
        }
        ctx.lineWidth = 1;
        if (state.goalNode >= 0) {
          var path = treePath();
          var useSmooth = ui.smooth && ui.smooth.checked;
          ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          if (useSmooth) {
            if (state.cachedSmoothVer !== state.treeVersion || !state.cachedSmooth) {
              state.cachedSmooth = smoothTreePath(path);
              state.cachedRawLen = pathLength(path);
              state.cachedSmoothLen = pathLength(state.cachedSmooth);
              state.cachedSmoothVer = state.treeVersion;
            }
            var smoothed = state.cachedSmooth;
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = 'rgba(242,191,63,.55)'; ctx.lineWidth = 2; ctx.beginPath();
            path.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
            ctx.stroke();
            ctx.setLineDash([]);
            [['rgba(184,216,75,.28)', 10], ['#b8d84b', 4]].forEach(function (st) {
              ctx.strokeStyle = st[0]; ctx.lineWidth = st[1]; ctx.beginPath();
              smoothed.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
              ctx.stroke();
            });
            var savedPct = state.cachedRawLen > 0 ? Math.max(0, Math.round((1 - state.cachedSmoothLen / state.cachedRawLen) * 100)) : 0;
            status = 'Path found · raw ' + Math.round(state.cachedRawLen) + ' px → smoothed ' + Math.round(state.cachedSmoothLen) + ' px (saved ' + savedPct + '%) · ' + state.nodes.length + ' nodes';
          } else {
            [['rgba(242,191,63,.25)', 10], ['#f2bf3f', 4]].forEach(function (st) {
              ctx.strokeStyle = st[0]; ctx.lineWidth = st[1]; ctx.beginPath();
              path.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
              ctx.stroke();
            });
            var improvedNote = (mode === 'rrtstar' && state.initialGoalCost != null && state.initialGoalCost - state.goalCost >= 2)
              ? ' (initial ' + Math.round(state.initialGoalCost) + ' → ' + Math.round(state.goalCost) + ' px)'
              : '';
            status = 'Path found · length ' + Math.round(state.goalCost) + ' px' + improvedNote + ' · tree has ' + state.nodes.length + ' nodes' + (mode === 'rrtstar' ? (state.nodes.length < MAX_NODES ? ' · still improving…' : ' · done') : '');
          }
          ctx.lineWidth = 1;
        } else status = 'Growing… ' + state.nodes.length + ' nodes, no path yet';
      } else {
        var rb = state.robot;
        if (mode === 'dwa' && state.route && ui.global.checked) {
          ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(232,246,251,.55)'; ctx.lineWidth = 2; ctx.beginPath();
          ctx.moveTo(rb.x, rb.y); state.route.forEach(function (p) { ctx.lineTo(p.x, p.y); }); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
        }
        if (mode === 'dwa' && state.arcs) {
          state.arcs.forEach(function (a) {
            ctx.strokeStyle = a.hit ? 'rgba(217,75,65,.35)' : 'rgba(112,200,229,.28)';
            ctx.beginPath(); a.pts.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke();
          });
          if (state.best) {
            ctx.strokeStyle = '#f2bf3f'; ctx.lineWidth = 3; ctx.beginPath();
            state.best.pts.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke(); ctx.lineWidth = 1;
          }
        }
        ctx.strokeStyle = '#b8d84b'; ctx.lineWidth = 2; ctx.beginPath();
        state.trail.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke(); ctx.lineWidth = 1;
        RA.drawRobot(ctx, rb.x, rb.y, rb.a, R, { face: state.crashed || state.stuck ? 'oops' : 'happy' });
        if (state.done) status = 'Reached the goal!';
        else if (state.crashed) status = 'Crash! The obstacle moved faster than the robot could react.';
        else if (state.stuck) status = mode === 'field' ? 'Stuck in a local minimum: pull and push cancel out here. The robot has no idea the goal is reachable.' : 'Boxed in — no safe arc toward the goal right now.';
        else status = mode === 'dwa' ? 'v = ' + Math.round(rb.v) + ' px/s · ω = ' + rb.w.toFixed(2) + ' rad/s · ' + state.arcs.filter(function (a) { return !a.hit; }).length + ' of ' + state.arcs.length + ' arcs safe' : 'Following the force downhill…';
      }
      RA.drawPad(ctx, start.x, start.y, 12, '#3fa6cc', 'S');
      RA.drawFlag(ctx, goal.x, goal.y, 18, '#b8d84b');
      ctx.fillStyle = '#e8f6fb'; ctx.font = '700 11px IBM Plex Mono, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('G', goal.x, goal.y + 20);
      RA.drawCursor(ctx, cursor);
      ui.readout.textContent = status;
      // Announce milestones (not every frame) for screen-reader users.
      var milestone = /^Path found/.test(status) ? 'Path found.' : /^(Reached|Crash|Stuck|Boxed)/.test(status) ? status : '';
      if (milestone && milestone !== lastMilestone) RA.announce(milestone);
      lastMilestone = milestone;
    }

    function toggleObstacle(p) {
      var hit = -1;
      obstacles.forEach(function (o, i) { if (dist(p, o) < o.r) hit = i; });
      if (hit >= 0) obstacles.splice(hit, 1);
      else obstacles.push({ x: p.x, y: p.y, r: 22, vx: (Math.random() - .5) * 60, vy: (Math.random() - .5) * 60 });
      restart();
      return hit >= 0 ? 'Rock removed.' : 'Rock added.';
    }
    canvas.addEventListener('pointerdown', function (e) {
      var p = RA.canvasPoint(canvas, e);
      if (dist(p, start) < 16) drag = start;
      else if (dist(p, goal) < 16) drag = goal;
      else { toggleObstacle(p); return; }
      canvas.setPointerCapture(e.pointerId);
    });
    // Keyboard: arrows move a crosshair, Enter/Space toggles a rock, S and G move the markers.
    cursor = RA.keyCursor(canvas, {
      step: 20, x: W / 2, y: H / 2,
      describe: function (c) {
        var near = obstacles.some(function (o) { return dist(c, o) < o.r; });
        return 'Cursor at ' + Math.round(c.x / W * 100) + '% across, ' + Math.round(c.y / H * 100) + '% down' + (near ? ', on a rock' : '') + '.';
      },
      onKey: function (k, c) {
        if (k === 'Enter') { RA.announce(toggleObstacle({ x: c.x, y: c.y }), true); return true; }
        if (k === 's' || k === 'S' || k === 'g' || k === 'G') {
          var m = /s/i.test(k) ? start : goal;
          m.x = c.x; m.y = c.y; restart();
          RA.announce((m === start ? 'Start' : 'Goal') + ' moved to the cursor.', true);
          return true;
        }
        return false;
      }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var p = RA.canvasPoint(canvas, e);
      drag.x = Math.max(12, Math.min(W - 12, p.x)); drag.y = Math.max(12, Math.min(H - 12, p.y));
      restart();
    });
    canvas.addEventListener('pointerup', function () { drag = null; });

    ui.modes.forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.dataset.mpMode;
        ui.modes.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        ui.explain.textContent = EXPLAIN[mode];
        document.getElementById('mp-field-opts').hidden = mode !== 'field';
        document.getElementById('mp-dwa-opts').hidden = mode !== 'dwa';
        if (ui.smoothWrap) ui.smoothWrap.hidden = mode !== 'rrt' && mode !== 'rrtstar';
        restart();
      });
    });
    document.querySelectorAll('[data-mp-preset]').forEach(function (b) { b.addEventListener('click', function () { preset(b.dataset.mpPreset); }); });
    ui.run.addEventListener('click', function () { state.running = !state.running; ui.run.textContent = state.running ? 'Pause' : 'Resume'; ui.run.setAttribute('aria-pressed', String(!state.running)); });
    document.getElementById('mp-restart').addEventListener('click', restart);
    ui.global.addEventListener('change', restart);
    ui.rep.addEventListener('input', function () { document.getElementById('mp-rep-out').textContent = ui.rep.value; restart(); });
    ui.explain.textContent = EXPLAIN[mode];
    preset('forest');
    RA.loop(function (dt) { tick(dt); draw(); }, canvas);
  }

  /* ── Differential-drive kinematics + Pure Pursuit ──────────────── */
  function kinematicsLab() {
    var kc = document.getElementById('kin-canvas');
    if (!kc) return;
    var KW = 640, KH = 300;
    var ctx = RA.setupHiDpiCanvas(kc, KW, KH).ctx;
    var left = document.getElementById('kin-left'), right = document.getElementById('kin-right');
    var base = document.getElementById('kin-base'), out = document.getElementById('kin-readout');
    var lookaheadEl = document.getElementById('kin-lookahead'), profileEl = document.getElementById('kin-profile');
    var modeBtns = document.querySelectorAll('[data-kin-mode]');
    var manualOpts = document.getElementById('kin-manual-opts'), pursuitOpts = document.getElementById('kin-pursuit-opts');
    var rb, trail, kinRunning = !RA.reducedMotion, kinMode = 'manual';
    var kinRun = document.getElementById('kin-run'), showIcc = document.getElementById('kin-icc');

    // Dense competition path polyline
    var WAYPOINTS = [{ x: 65, y: 245 }, { x: 215, y: 245 }, { x: 265, y: 78 }, { x: 425, y: 68 }, { x: 455, y: 222 }, { x: 575, y: 150 }];
    var TRACK_PTS = [];
    for (var wi = 0; wi < WAYPOINTS.length - 1; wi++) {
      var wa = WAYPOINTS[wi], wb = WAYPOINTS[wi + 1], seg = dist(wa, wb), nSeg = Math.max(1, Math.ceil(seg / 8));
      for (var si = 0; si < nSeg; si++) {
        var f = si / nSeg;
        TRACK_PTS.push({ x: wa.x + (wb.x - wa.x) * f, y: wa.y + (wb.y - wa.y) * f });
      }
    }
    TRACK_PTS.push(WAYPOINTS[WAYPOINTS.length - 1]);
    var lapTime = 0, cteSum = 0, cteN = 0, pursuitDone = false, currentCte = 0, lookPt = null;

    function syncRun() { if (kinRun) { kinRun.textContent = kinRunning ? 'Pause' : 'Drive'; kinRun.setAttribute('aria-pressed', String(!kinRunning)); } }
    if (kinRun) kinRun.addEventListener('click', function () { kinRunning = !kinRunning; syncRun(); });
    syncRun();

    function reset() {
      if (kinMode === 'pursuit') {
        rb = { x: WAYPOINTS[0].x, y: WAYPOINTS[0].y, a: 0, v: 0 };
        lapTime = 0; cteSum = 0; cteN = 0; pursuitDone = false; currentCte = 0; lookPt = TRACK_PTS[0];
      } else {
        rb = { x: KW / 2, y: KH / 2, a: -Math.PI / 2, v: 0 };
      }
      trail = [];
    }
    function setKinMode(m) {
      kinMode = m;
      modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.kinMode === m)); });
      if (manualOpts) manualOpts.hidden = m !== 'manual';
      if (pursuitOpts) pursuitOpts.hidden = m !== 'pursuit';
      kinRunning = true; syncRun();
      reset();
      describeKin();
    }
    modeBtns.forEach(function (b) { b.addEventListener('click', function () { setKinMode(b.dataset.kinMode); }); });

    function sync() {
      document.getElementById('kin-left-out').textContent = left.value;
      document.getElementById('kin-right-out').textContent = right.value;
      document.getElementById('kin-base-out').textContent = base.value;
      if (lookaheadEl) document.getElementById('kin-ld-out').textContent = lookaheadEl.value;
    }
    [left, right, base].forEach(function (el) { el.addEventListener('input', sync); el.addEventListener('change', describeKin); });
    if (lookaheadEl) {
      lookaheadEl.addEventListener('input', sync);
      lookaheadEl.addEventListener('change', function () { if (kinMode === 'pursuit') { reset(); kinRunning = true; syncRun(); } });
    }
    if (profileEl) {
      profileEl.addEventListener('change', function () { if (kinMode === 'pursuit') { reset(); kinRunning = true; syncRun(); } });
    }
    // Plain-language summary of what the wheel settings do, for screen readers and young readers.
    function describeKin() {
      var msg;
      if (kinMode === 'pursuit') {
        msg = 'Pure Pursuit mode: steering toward a ' + (lookaheadEl ? lookaheadEl.value : 55) + ' px lookahead point along the competition track.';
      } else {
        var vl = +left.value, vr = +right.value;
        msg = vl === vr ? (vl === 0 ? 'Both wheels stopped: the robot stays still.' : 'Same speed on both wheels: the robot drives ' + (vl > 0 ? 'straight forward.' : 'straight backward.'))
          : vl === -vr ? 'Wheels spin opposite ways at the same speed: the robot spins in place.'
          : (vl === 0 || vr === 0) ? 'One wheel stopped: the robot pivots in a circle around that wheel.'
          : 'The ' + (vr > vl ? 'right' : 'left') + ' wheel is faster, so the robot curves to the ' + (vr > vl ? 'left' : 'right') + '.';
      }
      RA.announce(msg, true);
      var plain = document.getElementById('kin-plain');
      if (plain) plain.textContent = msg;
    }
    describeKin();
    document.getElementById('kin-reset').addEventListener('click', function () { reset(); kinRunning = true; syncRun(); });
    document.querySelectorAll('[data-kin]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (kinMode !== 'manual') setKinMode('manual');
        var v = b.dataset.kin.split(','); left.value = v[0]; right.value = v[1]; sync(); kinRunning = true; syncRun(); describeKin();
      });
    });
    reset(); sync();
    RA.loop(function (dt) {
      var L = +base.value;
      var vl = +left.value, vr = +right.value;
      var kin = MP ? MP.diffDriveKinematics({ vl: vl, vr: vr, base: L }) : { v: (vr + vl) / 2, w: (vr - vl) / L };
      var v = kin.v, w = kin.w;

      if (kinMode === 'pursuit') {
        var Ld = lookaheadEl ? +lookaheadEl.value : 55;
        // Closest point on path & remaining arc distance
        var bestIdx = 0, bestD = Infinity;
        for (var ti = 0; ti < TRACK_PTS.length; ti++) {
          var td = dist(rb, TRACK_PTS[ti]);
          if (td < bestD) { bestD = td; bestIdx = ti; }
        }
        currentCte = bestD;
        var remDist = 0;
        for (var ri = bestIdx + 1; ri < TRACK_PTS.length; ri++) remDist += dist(TRACK_PTS[ri - 1], TRACK_PTS[ri]);
        lookPt = TRACK_PTS[TRACK_PTS.length - 1];
        for (var li = bestIdx; li < TRACK_PTS.length; li++) {
          if (dist(rb, TRACK_PTS[li]) >= Ld) { lookPt = TRACK_PTS[li]; break; }
        }
        var goalPt = WAYPOINTS[WAYPOINTS.length - 1];
        if (!pursuitDone && dist(rb, goalPt) < 12 && bestIdx >= TRACK_PTS.length - 6) {
          pursuitDone = true; rb.v = 0;
          RA.announce('Pure Pursuit lap finished in ' + lapTime.toFixed(1) + ' s with ' + (cteSum / Math.max(1, cteN)).toFixed(1) + ' px average error.', true);
        }
        if (pursuitDone) {
          v = 0; w = 0; vl = 0; vr = 0;
        } else {
          var VMAX_PP = 95, AMAX_PP = 110;
          if (profileEl && profileEl.checked) {
            var vGoal = Math.min(VMAX_PP, Math.sqrt(2 * AMAX_PP * Math.max(0, remDist)));
            if (rb.v < vGoal) rb.v = Math.min(vGoal, rb.v + AMAX_PP * dt);
            else rb.v = Math.max(vGoal, rb.v - AMAX_PP * dt);
            if (remDist > 8 && rb.v < 22) rb.v = Math.min(22, rb.v + AMAX_PP * dt);
          } else {
            rb.v = VMAX_PP;
          }
          var dx = lookPt.x - rb.x, dy = lookPt.y - rb.y;
          var yLeft = dx * Math.sin(rb.a) - dy * Math.cos(rb.a);
          var dLp = Math.max(12, Math.hypot(dx, dy));
          var kappa = (2 * yLeft) / (dLp * dLp);
          v = rb.v;
          w = v * kappa;
          vl = v - w * L / 2; vr = v + w * L / 2;
          if (kinRunning) { lapTime += dt; cteSum += currentCte; cteN++; }
        }
      }

      if (!kinRunning) dt = 0;
      // Screen y points down, so a positive (counter-clockwise) ω lowers the angle.
      rb.a -= w * dt; rb.x += Math.cos(rb.a) * v * dt; rb.y += Math.sin(rb.a) * v * dt;
      if (kinMode === 'manual') {
        if (rb.x < 0) rb.x += KW; if (rb.x > KW) rb.x -= KW; if (rb.y < 0) rb.y += KH; if (rb.y > KH) rb.y -= KH;
      }
      var last = trail[trail.length - 1];
      if (!last || Math.hypot(last.x - rb.x, last.y - rb.y) > 2) { if (last && Math.hypot(last.x - rb.x, last.y - rb.y) > 50) trail.push(null); trail.push({ x: rb.x, y: rb.y }); }
      if (trail.length > 900) trail.shift();

      RoboticsVisuals.floor(ctx, KW, KH, { step: 32, frame: true });

      if (kinMode === 'pursuit') {
        var LdVis = lookaheadEl ? +lookaheadEl.value : 55;
        ctx.strokeStyle = 'rgba(112,200,229,.22)'; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); WAYPOINTS.forEach(function (pt, idx) { if (idx) ctx.lineTo(pt.x, pt.y); else ctx.moveTo(pt.x, pt.y); }); ctx.stroke();
        ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(232,246,251,.65)'; ctx.lineWidth = 2;
        ctx.beginPath(); WAYPOINTS.forEach(function (pt, idx) { if (idx) ctx.lineTo(pt.x, pt.y); else ctx.moveTo(pt.x, pt.y); }); ctx.stroke();
        ctx.setLineDash([]);
        RA.drawPad(ctx, WAYPOINTS[0].x, WAYPOINTS[0].y, 12, '#3fa6cc', 'S');
        RA.drawFlag(ctx, WAYPOINTS[WAYPOINTS.length - 1].x, WAYPOINTS[WAYPOINTS.length - 1].y, 16, '#b8d84b');
        if (lookPt && !pursuitDone) {
          ctx.strokeStyle = 'rgba(184,216,75,.35)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(rb.x, rb.y, LdVis, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = '#f2bf3f'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(rb.x, rb.y); ctx.lineTo(lookPt.x, lookPt.y); ctx.stroke();
          ctx.fillStyle = '#b8d84b'; ctx.beginPath(); ctx.arc(lookPt.x, lookPt.y, 5, 0, Math.PI * 2); ctx.fill();
        }
        // Speed profile mini bar
        ctx.fillStyle = 'rgba(15,29,35,.85)'; ctx.fillRect(14, 12, 178, 28);
        ctx.strokeStyle = 'rgba(112,200,229,.35)'; ctx.strokeRect(14, 12, 178, 28);
        ctx.fillStyle = '#b8d84b'; ctx.fillRect(20, 29, Math.min(166, (v / 95) * 166), 6);
        ctx.fillStyle = '#e8f6fb'; ctx.font = '600 10px IBM Plex Mono, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('speed ' + Math.round(v) + ' px/s' + (profileEl && profileEl.checked ? ' (ramp)' : ' (step)'), 20, 15);
      }

      // Instantaneous centre of curvature: the point the robot is circling right now.
      var R0 = Math.abs(w) < 1e-3 ? Infinity : v / w;
      if ((!showIcc || showIcc.checked) && isFinite(R0) && Math.abs(R0) < 2000) {
        // Positive ω turns left (counter-clockwise on screen with y down = toward -a+90°).
        var ix = rb.x + Math.cos(rb.a - Math.PI / 2) * R0, iy = rb.y + Math.sin(rb.a - Math.PI / 2) * R0;
        ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(242,191,63,.55)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(ix, iy, Math.abs(R0), 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rb.x, rb.y); ctx.lineTo(ix, iy); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#f2bf3f'; ctx.beginPath(); ctx.arc(ix, iy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.font = '600 11px IBM Plex Mono, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText('turning centre', ix + 8, iy - 4);
      }
      ctx.strokeStyle = '#b8d84b'; ctx.lineWidth = 2; ctx.beginPath();
      var pen = false;
      trail.forEach(function (p) { if (!p) { pen = false; return; } if (pen) ctx.lineTo(p.x, p.y); else { ctx.moveTo(p.x, p.y); pen = true; } });
      ctx.stroke();
      ctx.save(); ctx.translate(rb.x, rb.y); ctx.rotate(rb.a);
      var half = L / 2;
      RoboticsVisuals.shadow(ctx, 3, 3, 22, half + 10);
      RoboticsVisuals.plate(ctx, -16, -half + 2, 32, L - 4, 8,
        RoboticsVisuals.gradient(ctx, -16, -half, 16, half, ['#5cc7da', '#246f8a', '#143849']), '#bae8f0', 1.5);
      RoboticsVisuals.plate(ctx, -10, -6, 13, 12, 2, '#142e3b', '#8ab7c5');
      ctx.fillStyle = '#f2bf3f'; RA.roundRect(ctx, 9, -6, 6, 12, 2); ctx.fill();
      // wheels (left wheel is on the robot's -y side when facing +x), labelled
      [[-half - 4, vl, 'L'], [half - 4, vr, 'R']].forEach(function (wv) {
        RoboticsVisuals.plate(ctx, -11, wv[0], 22, 8, 3, '#0b1418', '#6b8791');
        ctx.fillStyle = '#a1bbbf65';
        for (var tx = -8; tx <= 8; tx += 4) ctx.fillRect(tx, wv[0] + 1, 1, 6);
        ctx.strokeStyle = '#f2bf3f'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        var ay = wv[0] + 4 + (wv[2] === 'L' ? -9 : 9), len = wv[1] * 0.35;
        if (Math.abs(len) > 1) {
          ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(len, ay);
          ctx.moveTo(len, ay); ctx.lineTo(len - Math.sign(len) * 6, ay - 4); ctx.moveTo(len, ay); ctx.lineTo(len - Math.sign(len) * 6, ay + 4); ctx.stroke();
        }
      });
      ctx.restore();
      if (kinMode === 'pursuit') {
        var meanCte = cteN ? (cteSum / cteN).toFixed(1) : '0.0';
        out.textContent = (pursuitDone ? 'FINISHED in ' + lapTime.toFixed(1) + ' s' : 't = ' + lapTime.toFixed(1) + ' s') +
          ' · Ld = ' + (lookaheadEl ? lookaheadEl.value : 55) + ' px · cross-track error = ' + currentCte.toFixed(1) + ' px (avg ' + meanCte + ' px)';
      } else {
        var radius = Math.abs(w) < 1e-3 ? '∞ (straight line)' : (Math.abs(v / w)).toFixed(0) + ' px';
        out.textContent = 'v = (vR + vL) / 2 = ' + v.toFixed(0) + ' px/s · ω = (vR − vL) / L = ' + w.toFixed(2) + ' rad/s · turn radius = ' + radius;
      }
    }, kc);
  }
})();
