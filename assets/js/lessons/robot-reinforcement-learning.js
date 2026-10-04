/* Robot Reinforcement Learning: tabular Q-learning on an editable grid.
   The robot must reach its charger while avoiding the stairwell. */
(function () {
  'use strict';
  var canvas = document.getElementById('rl-canvas');
  if (!canvas) return;
  var RA = window.RobotAutonomy;
  var ctx = canvas.getContext('2d');
  var COLS = 12, ROWS = 8, CS = canvas.width / COLS;
  var ACTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up right down left
  var EMPTY = 0, WALL = 1, PIT = 2, GOAL = 3;
  var ui = {
    alpha: document.getElementById('rl-alpha'), gamma: document.getElementById('rl-gamma'),
    eps: document.getElementById('rl-eps'), speed: document.getElementById('rl-speed'),
    slip: document.getElementById('rl-slip'), tool: document.querySelectorAll('[data-rl-tool]'),
    run: document.getElementById('rl-run'), reset: document.getElementById('rl-reset'),
    greedy: document.getElementById('rl-greedy'), readout: document.getElementById('rl-readout'),
    chart: document.getElementById('rl-chart'), showQ: document.getElementById('rl-values')
  };
  var chartCtx = ui.chart.getContext('2d');
  var grid, Q, start = { x: 0, y: ROWS - 1 }, robot, episode, steps, epReward, history, running = false, tool = 'wall', greedyRun = false, acc = 0;

  function layout() {
    grid = new Uint8Array(COLS * ROWS);
    [[3, 2], [3, 3], [3, 4], [3, 5], [7, 1], [7, 2], [7, 3], [7, 5], [7, 6], [7, 7], [5, 0], [5, 1]].forEach(function (p) { grid[p[1] * COLS + p[0]] = WALL; });
    [[5, 5], [5, 6], [9, 3], [9, 4], [10, 6]].forEach(function (p) { grid[p[1] * COLS + p[0]] = PIT; });
    grid[1 * COLS + 10] = GOAL;
  }
  function resetBrain() {
    Q = new Float32Array(COLS * ROWS * 4);
    episode = 0; history = []; firstWin = false; newEpisode();
  }
  function newEpisode() { robot = { x: start.x, y: start.y }; steps = 0; epReward = 0; }

  function cell(x, y) { return grid[y * COLS + x]; }
  function best(s) {
    var b = 0;
    for (var a = 1; a < 4; a++) if (Q[s * 4 + a] > Q[s * 4 + b]) b = a;
    return b;
  }
  function maxQ(s) { return Q[s * 4 + best(s)]; }

  function step() {
    var s = robot.y * COLS + robot.x;
    var eps = greedyRun ? 0 : +ui.eps.value;
    var a = Math.random() < eps ? (Math.random() * 4) | 0 : best(s);
    // Wheel slip: sometimes the robot lurches sideways instead.
    var act = a;
    if (Math.random() < +ui.slip.value) act = (a + (Math.random() < 0.5 ? 1 : 3)) % 4;
    var nx = robot.x + ACTIONS[act][0], ny = robot.y + ACTIONS[act][1], r = -0.01;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || cell(nx, ny) === WALL) { nx = robot.x; ny = robot.y; r = -0.1; }
    var kind = cell(nx, ny), done = false;
    if (kind === GOAL) { r = 1; done = true; }
    if (kind === PIT) { r = -1; done = true; }
    var s2 = ny * COLS + nx;
    if (!greedyRun) {
      var target = r + (done ? 0 : +ui.gamma.value * maxQ(s2));
      Q[s * 4 + a] += +ui.alpha.value * (target - Q[s * 4 + a]);
    }
    robot.x = nx; robot.y = ny; steps++; epReward += r;
    if (done || steps > 200) {
      if (!greedyRun) { episode++; history.push({ reward: epReward, steps: steps, goal: kind === GOAL }); if (history.length > 400) history.shift(); }
      else { greedyRun = false; ui.greedy.textContent = 'Test the policy'; running = false; syncRun(); lastTest = kind === GOAL ? 'Test run: reached the charger in ' + steps + ' steps.' : 'Test run: ' + (kind === PIT ? 'fell down the stairs.' : 'wandered for 200 steps without finding the charger.'); RA.announce(lastTest, true); }
      if (!greedyRun && kind === GOAL && !firstWin) { firstWin = true; RA.announce('Episode ' + episode + ': the robot reached the charger for the first time.'); }
      mood = kind === GOAL ? 'happy' : kind === PIT ? 'oops' : mood; moodT = 0.6;
      newEpisode();
    }
  }
  var lastTest = '', firstWin = false, mood = 'happy', moodT = 0, cursor = null;

  function valueColor(v) {
    if (v >= 0) return 'rgba(184,216,75,' + Math.min(0.85, v * 0.9) + ')';
    return 'rgba(217,75,65,' + Math.min(0.85, -v * 0.9) + ')';
  }

  function draw() {
    ctx.fillStyle = '#0f1d23'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
      var k = cell(x, y), px = x * CS, py = y * CS, s = y * COLS + x;
      if (k === WALL) { drawWall(px, py); continue; }
      if (k === PIT) drawStairs(px, py);
      else if (k === GOAL) drawCharger(px, py);
      else if (ui.showQ.checked) {
        var qv = maxQ(s);
        ctx.fillStyle = valueColor(qv); ctx.fillRect(px, py, CS, CS);
        // Diagonal hatching marks "bad" squares, so value isn't shown by colour alone.
        if (qv < -0.05) {
          ctx.save(); ctx.beginPath(); ctx.rect(px, py, CS, CS); ctx.clip();
          ctx.strokeStyle = 'rgba(255,214,206,' + Math.min(0.6, -qv) + ')'; ctx.lineWidth = 1.5;
          for (var hh = -CS; hh < CS; hh += 10) { ctx.beginPath(); ctx.moveTo(px + hh, py + CS); ctx.lineTo(px + hh + CS, py); ctx.stroke(); }
          ctx.restore();
        }
      }
      ctx.strokeStyle = 'rgba(112,200,229,.12)'; ctx.lineWidth = 1; ctx.strokeRect(px + .5, py + .5, CS - 1, CS - 1);
      if (k === EMPTY && ui.showQ.checked && Math.abs(maxQ(s)) > 0.01) {
        var a = best(s), cx = px + CS / 2, cy = py + CS / 2, L = CS * 0.28;
        ctx.strokeStyle = 'rgba(232,246,251,.8)'; ctx.lineWidth = 2;
        var ex = cx + ACTIONS[a][0] * L, ey = cy + ACTIONS[a][1] * L;
        ctx.beginPath(); ctx.moveTo(cx - ACTIONS[a][0] * L, cy - ACTIONS[a][1] * L); ctx.lineTo(ex, ey);
        ctx.lineTo(ex - ACTIONS[a][0] * 6 - ACTIONS[a][1] * 5, ey - ACTIONS[a][1] * 6 + ACTIONS[a][0] * 5);
        ctx.moveTo(ex, ey); ctx.lineTo(ex - ACTIONS[a][0] * 6 + ACTIONS[a][1] * 5, ey - ACTIONS[a][1] * 6 - ACTIONS[a][0] * 5);
        ctx.stroke(); ctx.lineWidth = 1;
      }
    }
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#70c8e5'; ctx.lineWidth = 2; ctx.strokeRect(start.x * CS + 4, start.y * CS + 4, CS - 8, CS - 8); ctx.setLineDash([]);
    ctx.fillStyle = '#70c8e5'; ctx.font = '700 10px IBM Plex Mono, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('START', start.x * CS + 7, start.y * CS + 7);
    ctx.lineWidth = 1;
    RA.drawRobot(ctx, robot.x * CS + CS / 2, robot.y * CS + CS / 2, -Math.PI / 2 + 0.0001, CS * 0.3, { face: moodT > 0 ? mood : 'happy' });
    if (cursor && cursor.focused && cursor.used) {
      ctx.strokeStyle = '#0f1d23'; ctx.lineWidth = 6; ctx.strokeRect(cursor.cx * CS + 3, cursor.cy * CS + 3, CS - 6, CS - 6);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.strokeRect(cursor.cx * CS + 3, cursor.cy * CS + 3, CS - 6, CS - 6); ctx.lineWidth = 1;
    }

    // Learning curve: steps per episode (lower is better), successes in green.
    var cw = ui.chart.width, ch = ui.chart.height;
    chartCtx.fillStyle = '#0f1d23'; chartCtx.fillRect(0, 0, cw, ch);
    chartCtx.fillStyle = '#8fa7a4'; chartCtx.font = '10px IBM Plex Mono, monospace'; chartCtx.textAlign = 'left';
    chartCtx.fillText('steps per episode (lower = smarter)', 6, 12);
    var n = history.length;
    history.forEach(function (h, i) {
      var x = 6 + i / Math.max(1, n - 1) * (cw - 12), hgt = Math.min(1, h.steps / 200) * (ch - 22);
      chartCtx.fillStyle = h.goal ? '#b8d84b' : '#d94b41';
      chartCtx.fillRect(x, ch - 4 - hgt, Math.max(1, (cw - 12) / Math.max(n, 1) - 0.5), hgt);
    });

    var recent = history.slice(-20), wins = recent.filter(function (h) { return h.goal; }).length;
    var avg = recent.length ? recent.reduce(function (s, h) { return s + h.steps; }, 0) / recent.length : 0;
    ui.readout.textContent = 'Episode ' + episode + ' · last 20: reached charger ' + wins + '/' + recent.length + (recent.length ? ', avg ' + avg.toFixed(0) + ' steps' : '') + (lastTest ? ' · ' + lastTest : '');
  }

  function drawWall(px, py) {
    ctx.fillStyle = '#4c6a72'; ctx.fillRect(px, py, CS, CS);
    ctx.strokeStyle = 'rgba(15,29,35,.55)'; ctx.lineWidth = 2;
    var bh = CS / 4;
    for (var r = 0; r < 4; r++) {
      ctx.beginPath(); ctx.moveTo(px, py + r * bh); ctx.lineTo(px + CS, py + r * bh); ctx.stroke();
      var off = r % 2 ? CS / 4 : 0;
      for (var c = off; c < CS; c += CS / 2) { ctx.beginPath(); ctx.moveTo(px + c, py + r * bh); ctx.lineTo(px + c, py + (r + 1) * bh); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(px, py, CS, 3);
    ctx.lineWidth = 1;
  }
  function drawStairs(px, py) {
    ctx.fillStyle = '#3a1512'; ctx.fillRect(px, py, CS, CS);
    var n = 4, sw = CS / n;
    for (var i = 0; i < n; i++) {
      ctx.fillStyle = 'hsl(6,' + (45 + i * 5) + '%,' + (16 + i * 7) + '%)';
      ctx.fillRect(px, py + i * sw, CS, sw - 2);
    }
    // hazard stripes on the top step
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, CS, 8); ctx.clip();
    ctx.fillStyle = '#f2bf3f'; ctx.fillRect(px, py, CS, 8);
    ctx.fillStyle = '#12202a';
    for (var h = -8; h < CS; h += 12) { ctx.beginPath(); ctx.moveTo(px + h, py + 8); ctx.lineTo(px + h + 6, py + 8); ctx.lineTo(px + h + 14, py); ctx.lineTo(px + h + 8, py); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#ffd6ce'; ctx.font = '700 10px IBM Plex Mono, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('STAIRS', px + CS / 2, py + CS - 3);
  }
  function drawCharger(px, py) {
    ctx.fillStyle = '#2f4a0e'; ctx.fillRect(px, py, CS, CS);
    var cx = px + CS / 2, cy = py + CS / 2;
    var g = ctx.createRadialGradient(cx, cy, 2, cx, cy, CS * 0.5);
    g.addColorStop(0, 'rgba(242,191,63,.55)'); g.addColorStop(1, 'rgba(242,191,63,0)');
    ctx.fillStyle = g; ctx.fillRect(px, py, CS, CS);
    // charging pad + bolt
    RA.roundRect(ctx, px + CS * 0.18, py + CS * 0.2, CS * 0.64, CS * 0.6, 8);
    ctx.fillStyle = '#12202a'; ctx.fill(); ctx.strokeStyle = '#b8d84b'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = '#f2bf3f'; ctx.beginPath();
    ctx.moveTo(cx + 3, cy - CS * 0.24); ctx.lineTo(cx - CS * 0.12, cy + 3); ctx.lineTo(cx - 1, cy + 3);
    ctx.lineTo(cx - 4, cy + CS * 0.24); ctx.lineTo(cx + CS * 0.12, cy - 3); ctx.lineTo(cx + 1, cy - 3); ctx.closePath(); ctx.fill();
  }

  function syncRun() {
    ui.run.textContent = running && !greedyRun ? 'Pause training' : 'Train';
    ui.run.setAttribute('aria-pressed', String(running && !greedyRun));
  }

  canvas.addEventListener('pointerdown', function (e) {
    var p = RA.canvasPoint(canvas, e), x = Math.floor(p.x / CS), y = Math.floor(p.y / CS);
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    applyTool(x, y);
  });
  function applyTool(x, y) {
    var i = y * COLS + x;
    if (tool === 'start') { if (grid[i] === EMPTY) { start = { x: x, y: y }; newEpisode(); } return; }
    if (x === start.x && y === start.y) return;
    var val = { wall: WALL, pit: PIT, goal: GOAL, erase: EMPTY }[tool];
    grid[i] = grid[i] === val ? EMPTY : val;
  }
  var NAMES = ['empty floor', 'wall', 'stairs', 'charger'], DIRS = ['up', 'right', 'down', 'left'];
  function describeCell(x, y) {
    var s = y * COLS + x, k = cell(x, y), out = 'Row ' + (y + 1) + ', column ' + (x + 1) + ': ' + NAMES[k];
    if (x === start.x && y === start.y) out += ', start square';
    if (x === robot.x && y === robot.y) out += ', robot is here';
    if (k === EMPTY && Math.abs(maxQ(s)) > 0.01) out += '. Learned value ' + (maxQ(s) > 0 ? 'plus ' : 'minus ') + Math.abs(maxQ(s)).toFixed(2) + ', best move ' + DIRS[best(s)];
    else if (k === EMPTY) out += '. Nothing learned here yet';
    return out + '.';
  }
  cursor = RA.keyCursor(canvas, {
    step: CS, x: CS / 2, y: canvas.height - CS / 2,
    onMove: function (c) { c.cx = Math.floor(c.x / CS); c.cy = Math.floor(c.y / CS); },
    describe: function (c) { return describeCell(c.cx, c.cy); },
    onKey: function (k, c) {
      if (k !== 'Enter') return false;
      c.cx = Math.floor(c.x / CS); c.cy = Math.floor(c.y / CS);
      applyTool(c.cx, c.cy);
      RA.announce(describeCell(c.cx, c.cy), true);
      return true;
    }
  });
  cursor.cx = 0; cursor.cy = ROWS - 1;
  ui.tool.forEach(function (b) {
    b.addEventListener('click', function () {
      tool = b.dataset.rlTool;
      ui.tool.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
    });
  });
  ui.run.addEventListener('click', function () { greedyRun = false; running = !running; syncRun(); });
  ui.greedy.addEventListener('click', function () {
    greedyRun = true; running = true; lastTest = ''; newEpisode(); syncRun(); ui.greedy.textContent = 'Testing…';
  });
  ui.reset.addEventListener('click', function () { lastTest = ''; resetBrain(); });
  document.getElementById('rl-layout').addEventListener('click', function () { layout(); start = { x: 0, y: ROWS - 1 }; resetBrain(); });
  [['alpha', 2], ['gamma', 2], ['eps', 2], ['slip', 2], ['speed', 0]].forEach(function (pair) {
    var el = ui[pair[0]], out = document.getElementById('rl-' + pair[0] + '-out');
    el.addEventListener('input', function () { out.textContent = (+el.value).toFixed(pair[1]); });
  });

  layout(); resetBrain(); syncRun();
  RA.loop(function (dt) {
    moodT = Math.max(0, moodT - dt);
    if (running) {
      // Steps per second: slow enough to watch at the low end, a blur at the top.
      var rate = greedyRun ? 8 : Math.pow(10, +ui.speed.value / 25);
      acc += dt * rate;
      var n = Math.min(4000, Math.floor(acc));
      acc -= n;
      for (var i = 0; i < n && running; i++) step();
    }
    draw();
  });
})();
