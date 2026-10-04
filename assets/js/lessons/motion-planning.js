/* Motion Planning Lab: RRT / RRT*, artificial potential fields, and the
   Dynamic Window Approach on one shared obstacle course, plus a
   differential-drive kinematics playground. */
(function () {
  'use strict';
  var RA = window.RobotAutonomy;
  var W = 640, H = 400, R = 10;

  /* ── Shared course ─────────────────────────────────────────────── */
  var canvas = document.getElementById('mp-canvas');
  if (canvas) plannerLab();
  kinematicsLab();

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

  function plannerLab() {
    var ctx = canvas.getContext('2d');
    var ui = {
      modes: document.querySelectorAll('[data-mp-mode]'),
      run: document.getElementById('mp-run'), readout: document.getElementById('mp-readout'),
      rep: document.getElementById('mp-rep'), moving: document.getElementById('mp-moving'),
      showField: document.getElementById('mp-field'), global: document.getElementById('mp-global'), explain: document.getElementById('mp-explain')
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
      }
      obstacles.forEach(function (o) { o.vx = (Math.random() - 0.5) * 60; o.vy = (Math.random() - 0.5) * 60; });
      restart();
    }

    function blocked(p, pad) {
      if (p.x < pad || p.y < pad || p.x > W - pad || p.y > H - pad) return true;
      for (var i = 0; i < obstacles.length; i++) if (dist(p, obstacles[i]) < obstacles[i].r + pad) return true;
      return false;
    }
    function segmentFree(a, b) {
      var n = Math.ceil(dist(a, b) / 3);
      for (var i = 0; i <= n; i++) {
        var t = i / Math.max(1, n);
        if (blocked({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, R)) return false;
      }
      return true;
    }
    function clearance(p) {
      var best = Math.min(p.x, p.y, W - p.x, H - p.y);
      obstacles.forEach(function (o) { best = Math.min(best, dist(p, o) - o.r); });
      return best - R;
    }

    function restart() {
      if (mode === 'rrt' || mode === 'rrtstar') state = { nodes: [{ x: start.x, y: start.y, parent: -1, cost: 0 }], goalNode: -1, t: 0 };
      else state = { robot: { x: start.x, y: start.y, a: Math.atan2(goal.y - start.y, goal.x - start.x), v: 0, w: 0 }, trail: [], stuckT: 0, lastP: { x: start.x, y: start.y }, done: false, crashed: false, arcs: [], t: 0 };
      state.running = true;
      ui.run.textContent = 'Pause'; ui.run.setAttribute('aria-pressed', 'false');
    }

    /* RRT / RRT* */
    var STEP = 18, NEIGH = 45, MAX_NODES = 3000;
    function growTree() {
      var nodes = state.nodes;
      if (nodes.length >= MAX_NODES) return;
      if (state.goalNode >= 0 && mode === 'rrt') return;
      var sample = Math.random() < 0.1 ? goal : { x: Math.random() * W, y: Math.random() * H };
      var near = 0, nd = Infinity;
      for (var i = 0; i < nodes.length; i++) { var d = dist(nodes[i], sample); if (d < nd) { nd = d; near = i; } }
      var from = nodes[near], s = Math.min(STEP, nd);
      if (s < 1) return;
      var p = { x: from.x + (sample.x - from.x) / nd * s, y: from.y + (sample.y - from.y) / nd * s };
      if (!segmentFree(from, p)) return;
      var node = { x: p.x, y: p.y, parent: near, cost: from.cost + s };
      var idx = nodes.length;
      if (mode === 'rrtstar') {
        var neighbors = [];
        for (var j = 0; j < nodes.length; j++) if (dist(nodes[j], p) < NEIGH) neighbors.push(j);
        neighbors.forEach(function (j) {
          var c = nodes[j].cost + dist(nodes[j], p);
          if (c < node.cost && segmentFree(nodes[j], p)) { node.cost = c; node.parent = j; }
        });
        nodes.push(node);
        neighbors.forEach(function (j) {
          var c = node.cost + dist(nodes[j], node);
          if (c < nodes[j].cost && segmentFree(node, nodes[j])) { nodes[j].parent = idx; propagate(j, c); }
        });
      } else nodes.push(node);
      if (dist(node, goal) < STEP && segmentFree(node, goal)) {
        var gc = node.cost + dist(node, goal);
        if (state.goalNode < 0 || gc < state.goalCost) { state.goalNode = idx; state.goalCost = gc; }
      }
    }
    function propagate(j, c) {
      var nodes = state.nodes, delta = c - nodes[j].cost;
      nodes[j].cost = c;
      // Children inherit the saving. (Linear scan; the tree is small.)
      var stack = [j];
      while (stack.length) {
        var k = stack.pop();
        for (var m = 0; m < nodes.length; m++) if (nodes[m].parent === k) { nodes[m].cost += delta; stack.push(m); }
      }
      if (state.goalNode >= 0) state.goalCost = nodes[state.goalNode].cost + dist(nodes[state.goalNode], goal);
    }
    function treePath() {
      var out = [goal], k = state.goalNode;
      while (k >= 0) { out.push(state.nodes[k]); k = state.nodes[k].parent; }
      return out;
    }

    /* Potential field */
    function force(p) {
      var k = +ui.rep.value;
      var gx = goal.x - p.x, gy = goal.y - p.y, gd = Math.hypot(gx, gy) || 1;
      var att = Math.min(gd, 120) / 120;
      var fx = gx / gd * att, fy = gy / gd * att;
      var D0 = 70;
      obstacles.forEach(function (o) {
        var dx = p.x - o.x, dy = p.y - o.y, dd = Math.hypot(dx, dy) || 1, d = Math.max(1, dd - o.r - R);
        if (d < D0) { var m = k * (1 / d - 1 / D0) * 18 / d; fx += dx / dd * m; fy += dy / dd * m; }
      });
      [[p.x, 1, 0], [W - p.x, -1, 0], [p.y, 0, 1], [H - p.y, 0, -1]].forEach(function (wall) {
        var d = Math.max(1, wall[0] - R);
        if (d < 40) { var m = k * (1 / d - 1 / 40) * 10 / d; fx += wall[1] * m; fy += wall[2] * m; }
      });
      return { x: fx, y: fy };
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
      ctx.fillStyle = '#0f1d23'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(112,200,229,.07)'; ctx.lineWidth = 1;
      for (var gx = 0; gx < W; gx += 32) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (var gy = 0; gy < H; gy += 32) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

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
        // Branches fade from cyan near the start to violet far away, so the
        // tree's growth outward is visible at a glance.
        var maxCost = 1;
        state.nodes.forEach(function (n) { if (n.cost > maxCost) maxCost = n.cost; });
        ctx.lineWidth = 1.2;
        state.nodes.forEach(function (n) {
          if (n.parent < 0) return;
          var p = state.nodes[n.parent], f = n.cost / maxCost;
          ctx.strokeStyle = 'hsla(' + Math.round(190 + f * 80) + ',75%,' + Math.round(68 - f * 10) + '%,.6)';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(n.x, n.y); ctx.stroke();
        });
        ctx.lineWidth = 1;
        if (state.goalNode >= 0) {
          var path = treePath();
          ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          [['rgba(242,191,63,.25)', 10], ['#f2bf3f', 4]].forEach(function (st) {
            ctx.strokeStyle = st[0]; ctx.lineWidth = st[1]; ctx.beginPath();
            path.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
            ctx.stroke();
          });
          ctx.lineWidth = 1;
          status = 'Path found · length ' + Math.round(state.goalCost) + ' px · tree has ' + state.nodes.length + ' nodes' + (mode === 'rrtstar' ? (state.nodes.length < MAX_NODES ? ' · still improving…' : ' · done') : '');
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
    RA.loop(function (dt) { tick(dt); draw(); });
  }

  /* ── Differential-drive kinematics ─────────────────────────────── */
  function kinematicsLab() {
    var kc = document.getElementById('kin-canvas');
    if (!kc) return;
    var ctx = kc.getContext('2d'), KW = kc.width, KH = kc.height;
    var left = document.getElementById('kin-left'), right = document.getElementById('kin-right');
    var base = document.getElementById('kin-base'), out = document.getElementById('kin-readout');
    var rb, trail, kinRunning = !RA.reducedMotion;
    var kinRun = document.getElementById('kin-run'), showIcc = document.getElementById('kin-icc');
    function syncRun() { if (kinRun) { kinRun.textContent = kinRunning ? 'Pause' : 'Drive'; kinRun.setAttribute('aria-pressed', String(!kinRunning)); } }
    if (kinRun) kinRun.addEventListener('click', function () { kinRunning = !kinRunning; syncRun(); });
    syncRun();
    function reset() { rb = { x: KW / 2, y: KH / 2, a: -Math.PI / 2 }; trail = []; }
    function sync() {
      document.getElementById('kin-left-out').textContent = left.value;
      document.getElementById('kin-right-out').textContent = right.value;
      document.getElementById('kin-base-out').textContent = base.value;
    }
    [left, right, base].forEach(function (el) { el.addEventListener('input', sync); el.addEventListener('change', describeKin); });
    // Plain-language summary of what the wheel settings do, for screen readers and young readers.
    function describeKin() {
      var vl = +left.value, vr = +right.value;
      var msg = vl === vr ? (vl === 0 ? 'Both wheels stopped: the robot stays still.' : 'Same speed on both wheels: the robot drives ' + (vl > 0 ? 'straight forward.' : 'straight backward.'))
        : vl === -vr ? 'Wheels spin opposite ways at the same speed: the robot spins in place.'
        : (vl === 0 || vr === 0) ? 'One wheel stopped: the robot pivots in a circle around that wheel.'
        : 'The ' + (vr > vl ? 'right' : 'left') + ' wheel is faster, so the robot curves to the ' + (vr > vl ? 'left' : 'right') + '.';
      RA.announce(msg, true);
      var plain = document.getElementById('kin-plain');
      if (plain) plain.textContent = msg;
    }
    describeKin();
    document.getElementById('kin-reset').addEventListener('click', reset);
    document.querySelectorAll('[data-kin]').forEach(function (b) {
      b.addEventListener('click', function () { var v = b.dataset.kin.split(','); left.value = v[0]; right.value = v[1]; sync(); kinRunning = true; syncRun(); describeKin(); });
    });
    reset(); sync();
    RA.loop(function (dt) {
      var vl = +left.value, vr = +right.value, L = +base.value;
      var v = (vr + vl) / 2, w = (vr - vl) / L;
      if (!kinRunning) dt = 0;
      // Screen y points down, so a positive (counter-clockwise) ω lowers the angle.
      rb.a -= w * dt; rb.x += Math.cos(rb.a) * v * dt; rb.y += Math.sin(rb.a) * v * dt;
      if (rb.x < 0) rb.x += KW; if (rb.x > KW) rb.x -= KW; if (rb.y < 0) rb.y += KH; if (rb.y > KH) rb.y -= KH;
      var last = trail[trail.length - 1];
      if (!last || Math.hypot(last.x - rb.x, last.y - rb.y) > 2) { if (last && Math.hypot(last.x - rb.x, last.y - rb.y) > 50) trail.push(null); trail.push({ x: rb.x, y: rb.y }); }
      if (trail.length > 900) trail.shift();

      ctx.fillStyle = '#0f1d23'; ctx.fillRect(0, 0, KW, KH);
      ctx.strokeStyle = 'rgba(112,200,229,.07)'; ctx.lineWidth = 1;
      for (var gx = 0; gx < KW; gx += 32) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, KH); ctx.stroke(); }
      for (var gy = 0; gy < KH; gy += 32) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(KW, gy); ctx.stroke(); }
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
      RA.roundRect(ctx, -16, -half + 2, 32, L - 4, 8); ctx.fillStyle = '#146b8c'; ctx.fill();
      ctx.strokeStyle = '#e8f6fb'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#f2bf3f'; RA.roundRect(ctx, 9, -6, 6, 12, 2); ctx.fill();
      // wheels (left wheel is on the robot's -y side when facing +x), labelled
      [[-half - 4, vl, 'L'], [half - 4, vr, 'R']].forEach(function (wv) {
        ctx.fillStyle = '#0b1418'; RA.roundRect(ctx, -11, wv[0], 22, 8, 3); ctx.fill();
        ctx.strokeStyle = '#f2bf3f'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        var ay = wv[0] + 4 + (wv[2] === 'L' ? -9 : 9), len = wv[1] * 0.35;
        if (Math.abs(len) > 1) {
          ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(len, ay);
          ctx.moveTo(len, ay); ctx.lineTo(len - Math.sign(len) * 6, ay - 4); ctx.moveTo(len, ay); ctx.lineTo(len - Math.sign(len) * 6, ay + 4); ctx.stroke();
        }
      });
      ctx.restore();
      var radius = Math.abs(w) < 1e-3 ? '∞ (straight line)' : (Math.abs(v / w)).toFixed(0) + ' px';
      out.textContent = 'v = (vR + vL) / 2 = ' + v.toFixed(0) + ' px/s · ω = (vR − vL) / L = ' + w.toFixed(2) + ' rad/s · turn radius = ' + radius;
    });
  }
})();
