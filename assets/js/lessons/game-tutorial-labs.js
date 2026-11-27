/* ─────────────────────────────────────────────────────────────────────
   Tiny-Loop Game Tutorials — Interactive CS & Physics Engineering Labs
   assets/js/lessons/game-tutorial-labs.js

   Hosts 8 bespoke interactive labs + pure math helpers (GameTutorialLabMath)
   so each tutorial keeps its inline script concise and testable.
   Uses SimKit.loop({ el: SimKit.stage(canvas) }) so off-screen labs pause.
   ───────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var STEP = 1 / 60;
  var reducedMotion = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ── Pure Math & Simulation Helpers (exported for unit tests) ─────── */
  function checkAABB(a, b) {
    var xOverlap = a.x < b.x + b.w && a.x + a.w > b.x;
    var yOverlap = a.y < b.y + b.h && a.y + a.h > b.y;
    var ix = Math.max(a.x, b.x);
    var iy = Math.max(a.y, b.y);
    var iw = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - ix);
    var ih = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - iy);
    return {
      overlap: xOverlap && yOverlap,
      xOverlap: xOverlap,
      yOverlap: yOverlap,
      ix: ix, iy: iy, iw: iw, ih: ih
    };
  }

  function clickerUpgradeCost(startCost, mult, owned) {
    var c = startCost;
    for (var i = 0; i < owned; i++) c = Math.round(c * mult);
    return c;
  }

  function simulateClickerStrategies(startCost, mult, goal) {
    function runCap(maxUpgrades) {
      var score = 0, power = 1, cost = startCost, clicks = 0, bought = 0;
      while (score < goal && clicks < 10000) {
        if (bought < maxUpgrades && score >= cost) {
          score -= cost;
          power += 1;
          bought++;
          cost = Math.round(cost * mult);
        } else {
          score += power;
          clicks++;
        }
      }
      return { clicks: clicks, bought: bought };
    }
    var never = runCap(0);
    var asap = runCap(99);
    var best = never;
    for (var cap = 1; cap <= 25; cap++) {
      var res = runCap(cap);
      if (res.clicks < best.clicks) best = res;
    }
    return {
      neverClicks: never.clicks,
      asapClicks: asap.clicks,
      asapUpgrades: asap.bought,
      optClicks: best.clicks,
      optUpgrades: best.bought,
      fifthCost: clickerUpgradeCost(startCost, mult, 4)
    };
  }

  function bfsShortestPath(grid, from, to) {
    var dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    var key = function (c, r) { return c + ',' + r; };
    var startK = key(from.col, from.row);
    var goalK = key(to.col, to.row);
    var parent = {};
    var distMap = {};
    var order = [];
    distMap[startK] = 0;
    var queue = [from];
    var found = false;
    while (queue.length) {
      var cur = queue.shift();
      var ck = key(cur.col, cur.row);
      order.push({ col: cur.col, row: cur.row, dist: distMap[ck] });
      if (ck === goalK) { found = true; break; }
      for (var i = 0; i < dirs.length; i++) {
        var nc = cur.col + dirs[i][0];
        var nr = cur.row + dirs[i][1];
        var nk = key(nc, nr);
        if (grid[nr] && grid[nr][nc] && grid[nr][nc] !== '#' && !(nk in distMap)) {
          distMap[nk] = distMap[ck] + 1;
          parent[nk] = ck;
          queue.push({ col: nc, row: nr });
        }
      }
    }
    var path = [];
    if (found) {
      var trace = goalK;
      while (trace) {
        var parts = trace.split(',').map(Number);
        path.unshift({ col: parts[0], row: parts[1] });
        trace = parent[trace];
      }
    }
    return {
      found: found,
      dist: found ? distMap[goalK] : null,
      path: path,
      order: order,
      distMap: distMap
    };
  }

  function dfsPath(grid, from, to) {
    var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    var key = function (c, r) { return c + ',' + r; };
    var startK = key(from.col, from.row);
    var goalK = key(to.col, to.row);
    var seen = {};
    var parent = {};
    var order = [];
    var stack = [from];
    var found = false;
    while (stack.length) {
      var cur = stack.pop();
      var ck = key(cur.col, cur.row);
      if (seen[ck]) continue;
      seen[ck] = true;
      order.push({ col: cur.col, row: cur.row, dist: order.length });
      if (ck === goalK) { found = true; break; }
      for (var i = dirs.length - 1; i >= 0; i--) {
        var nc = cur.col + dirs[i][0];
        var nr = cur.row + dirs[i][1];
        var nk = key(nc, nr);
        if (grid[nr] && grid[nr][nc] && grid[nr][nc] !== '#' && !seen[nk]) {
          if (!(nk in parent)) parent[nk] = ck;
          stack.push({ col: nc, row: nr });
        }
      }
    }
    var path = [];
    if (found) {
      var trace = goalK;
      while (trace) {
        var parts = trace.split(',').map(Number);
        path.unshift({ col: parts[0], row: parts[1] });
        trace = parent[trace];
      }
    }
    return {
      found: found,
      dist: found ? path.length - 1 : null,
      path: path,
      order: order
    };
  }

  function generateBacktrackerMaze(cols, rows, rng) {
    cols = cols || 11;
    rows = rows || 7;
    var rand = rng || Math.random;
    var grid = [];
    for (var r = 0; r < rows; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) row.push('#');
      grid.push(row);
    }
    function carve(c, r) {
      grid[r][c] = '.';
      var dirs = [[0, -2], [2, 0], [0, 2], [-2, 0]];
      for (var i = dirs.length - 1; i > 0; i--) {
        var j = Math.floor(rand() * (i + 1));
        var tmp = dirs[i]; dirs[i] = dirs[j]; dirs[j] = tmp;
      }
      for (var k = 0; k < dirs.length; k++) {
        var nc = c + dirs[k][0], nr = r + dirs[k][1];
        if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && grid[nr][nc] === '#') {
          grid[r + dirs[k][1] / 2][c + dirs[k][0] / 2] = '.';
          carve(nc, nr);
        }
      }
    }
    carve(1, 1);
    grid[rows - 2][cols - 2] = '.';
    return grid.map(function (r) { return r.join(''); });
  }

  function computeFlappyArc(gravity, flapMult, scroll) {
    var gPull = gravity * 0.15;
    var vy = -gravity * flapMult;
    var y = 0, x = 0, minY = 0, apexTick = 0;
    var points = [{ x: 0, y: 0, vy: vy }];
    for (var t = 1; t <= 75; t++) {
      vy += gPull;
      y += vy;
      x += scroll;
      points.push({ x: x, y: y, vy: vy });
      if (y < minY) {
        minY = y;
        apexTick = t;
      }
    }
    var peakRisePx = Math.round(-minY);
    var apexMs = Math.round((apexTick / 60) * 1000);
    var arcWidthPx = Math.round(apexTick * scroll * 2);
    return {
      peakRisePx: peakRisePx,
      apexTicks: apexTick,
      apexMs: apexMs,
      arcWidthPx: arcWidthPx,
      hitsCeiling: peakRisePx > 125,
      points: points
    };
  }

  function computeLeadShot(targetX, targetY, targetVx, launcherX, launcherY, projSpeed) {
    var dy = Math.abs(launcherY - targetY);
    var flightTicks = dy / projSpeed;
    var leadDx = targetVx * flightTicks;
    var interceptX = targetX + leadDx;
    var directXAtArrival = targetX + leadDx;
    return {
      flightTicks: flightTicks,
      leadDx: leadDx,
      interceptX: interceptX,
      directMissPx: Math.abs(directXAtArrival - targetX),
      hitDirect: Math.abs(directXAtArrival - targetX) < 20,
      hitLead: true
    };
  }

  function fisherYates(arr, rng) {
    var rand = rng || Math.random;
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function naiveSortShuffle(arr, rng) {
    var rand = rng || Math.random;
    var a = arr.slice();
    a.sort(function () { return rand() - 0.5; });
    return a;
  }

  function countStoryNodes(branches, depth, foldback) {
    var perLayer = [];
    var total = 0;
    for (var d = 0; d <= depth; d++) {
      var count = foldback ? (d === 0 ? 1 : Math.min(branches + d - 1, branches * 2)) : Math.pow(branches, d);
      perLayer.push(count);
      total += count;
    }
    return { perLayer: perLayer, total: total, endings: perLayer[perLayer.length - 1] };
  }

  global.GameTutorialLabMath = {
    checkAABB: checkAABB,
    clickerUpgradeCost: clickerUpgradeCost,
    simulateClickerStrategies: simulateClickerStrategies,
    bfsShortestPath: bfsShortestPath,
    dfsPath: dfsPath,
    generateBacktrackerMaze: generateBacktrackerMaze,
    computeFlappyArc: computeFlappyArc,
    computeLeadShot: computeLeadShot,
    fisherYates: fisherYates,
    naiveSortShuffle: naiveSortShuffle,
    countStoryNodes: countStoryNodes
  };

  /* ── Shared Canvas & Loop Helpers ─────────────────────────────────── */
  function setupCanvas(canvas, W, H, onResize) {
    var ctx = canvas.getContext('2d');
    var scale = 1;
    canvas.style.aspectRatio = W + ' / ' + H;
    function resize() {
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      var cssW = canvas.clientWidth || W;
      scale = (cssW / W) * dpr;
      var bw = Math.round(W * scale);
      var bh = Math.round(H * scale);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
        if (onResize) onResize();
      }
    }
    if (global.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    else global.addEventListener('resize', resize);
    resize();
    return {
      ctx: ctx,
      setOnResize: function (fn) { onResize = fn; },
      prepare: function () { ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.clearRect(0, 0, W, H); }
    };
  }

  function startLabLoop(canvas, stepFn, renderFn) {
    var acc = 0;
    function frame(dt) {
      acc += Math.min(dt, 0.25);
      var steps = 0;
      while (acc >= STEP && steps < 5) {
        stepFn();
        acc -= STEP;
        steps++;
      }
      renderFn();
    }
    if (global.SimKit && global.SimKit.loop) {
      global.SimKit.loop(frame, { el: global.SimKit.stage ? global.SimKit.stage(canvas) : canvas });
    } else {
      var last = null;
      (function tick(t) {
        frame(last == null ? 0 : (t - last) / 1000);
        last = t;
        global.requestAnimationFrame(tick);
      }(performance.now()));
    }
  }

  function wireModeButtons(host, onChange) {
    var btns = Array.prototype.slice.call(host.querySelectorAll('[data-lab-mode]'));
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        onChange(btn.getAttribute('data-lab-mode'));
      });
    });
  }

  /* ── 1. CATCH: AABB Hitbox & Forgiveness Lab ──────────────────────── */
  function initCatchLab(host) {
    var canvas = host.querySelector('#catch-lab-canvas');
    if (!canvas) return;
    var W = 540, H = 240;
    var c = setupCanvas(canvas, W, H);
    var xSlider = host.querySelector('#catch-lab-x');
    var ySlider = host.querySelector('#catch-lab-y');
    var xOut = host.querySelector('#catch-lab-x-out');
    var yOut = host.querySelector('#catch-lab-y-out');
    var tOverlap = host.querySelector('#catch-telem-overlap');
    var tX = host.querySelector('#catch-telem-x');
    var tY = host.querySelector('#catch-telem-y');
    var tRange = host.querySelector('#catch-telem-range');
    var insight = host.querySelector('#catch-lab-insight');

    var mode = 'forgiving'; // 'full' | 'forgiving'
    var playerSprite = { x: W / 2 - 24, y: H - 64, w: 48, h: 48 };
    var item = { x: 256, y: 152, w: 38, h: 38 };
    var dragging = false;

    function shrinkBox(box, ratio) {
      var nw = Math.round(box.w * ratio);
      var nh = Math.round(box.h * ratio);
      return { x: Math.round(box.x + (box.w - nw) / 2), y: Math.round(box.y + (box.h - nh) / 2), w: nw, h: nh };
    }

    function render() {
      c.prepare();
      var ctx = c.ctx;
      var ratio = mode === 'forgiving' ? 0.7 : 1.0;
      var pBox = shrinkBox(playerSprite, ratio);
      var iBox = shrinkBox(item, ratio);
      var res = checkAABB(pBox, iBox);

      ctx.fillStyle = '#080e1c';
      ctx.fillRect(0, 0, W, H);

      // Reachability cone (how far player can move before item hits floor at speed 3 vs player 5)
      var fallFrames = Math.max(0, Math.round((playerSprite.y - (item.y + item.h)) / 3));
      var reach = Math.min(W / 2, fallFrames * 5);
      if (fallFrames > 0) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.beginPath();
        ctx.moveTo(playerSprite.x + playerSprite.w / 2, playerSprite.y);
        ctx.lineTo(Math.max(12, playerSprite.x + playerSprite.w / 2 - reach), item.y + item.h / 2);
        ctx.lineTo(Math.min(W - 12, playerSprite.x + playerSprite.w / 2 + reach), item.y + item.h / 2);
        ctx.closePath();
        ctx.fill();
      }

      // Dashed sprite bounds
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(playerSprite.x, playerSprite.y, playerSprite.w, playerSprite.h);
      ctx.strokeRect(item.x, item.y, item.w, item.h);
      ctx.setLineDash([]);

      // Emojis
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText('🤖', playerSprite.x + playerSprite.w / 2, playerSprite.y + playerSprite.h / 2);
      ctx.font = '26px sans-serif';
      ctx.fillText('💣', item.x + item.w / 2, item.y + item.h / 2);

      // Active hitboxes
      ctx.lineWidth = 2;
      ctx.strokeStyle = res.overlap ? '#ef4444' : '#22c55e';
      ctx.strokeRect(pBox.x, pBox.y, pBox.w, pBox.h);
      ctx.strokeStyle = res.overlap ? '#ef4444' : '#38bdf8';
      ctx.strokeRect(iBox.x, iBox.y, iBox.w, iBox.h);

      if (res.overlap && res.iw > 0 && res.ih > 0) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fillRect(res.ix, res.iy, res.iw, res.ih);
      }

      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Dashed = Sprite edge · Solid = Active hitbox (' + Math.round(ratio * 100) + '%) · Drag bomb!', 12, 18);

      if (xOut) xOut.textContent = item.x + ' px';
      if (yOut) yOut.textContent = item.y + ' px';
      if (tOverlap) tOverlap.textContent = res.overlap ? 'HIT (Overlap!)' : 'SAFE (Clear)';
      if (tX) tX.textContent = res.xOverlap ? 'TRUE' : 'FALSE';
      if (tY) tY.textContent = res.yOverlap ? 'TRUE' : 'FALSE';
      if (tRange) tRange.textContent = fallFrames > 0 ? '±' + reach + ' px' : 'At floor';
      if (insight) {
        var spriteRes = checkAABB(playerSprite, item);
        if (mode === 'forgiving' && spriteRes.overlap && !res.overlap) {
          insight.className = 'gt-lab-insight';
          insight.innerHTML = '<strong>✓ ARCADE FORGIVENESS IN ACTION:</strong> The sprite corners touch, so a 100% box would kill the player—but the 70% hitbox says <strong>SAFE</strong>! Players call games with forgiving hazard hitboxes "tight and fair."';
        } else if (res.overlap) {
          insight.className = 'gt-lab-insight is-warn';
          insight.innerHTML = '<strong>✕ COLLISION TRIGGERED:</strong> Both X-axis and Y-axis overlap checks are <code>TRUE</code>, creating a ' + res.iw + '×' + res.ih + ' px intersection.';
        } else {
          insight.className = 'gt-lab-insight';
          insight.innerHTML = '<strong>AABB SEPARATION:</strong> At least one axis does not overlap (' + (!res.xOverlap ? 'X clear' : 'Y clear') + '), so <code>collides()</code> returns <code>false</code> immediately.';
        }
      }
    }

    wireModeButtons(host, function (next) { mode = next; render(); });
    if (xSlider) xSlider.addEventListener('input', function () { item.x = Number(xSlider.value); render(); });
    if (ySlider) ySlider.addEventListener('input', function () { item.y = Number(ySlider.value); render(); });

    function moveFromPointer(e) {
      var r = canvas.getBoundingClientRect();
      item.x = Math.max(8, Math.min(W - item.w - 8, Math.round((e.clientX - r.left) / r.width * W - item.w / 2)));
      item.y = Math.max(24, Math.min(H - item.h - 8, Math.round((e.clientY - r.top) / r.height * H - item.h / 2)));
      if (xSlider) xSlider.value = String(item.x);
      if (ySlider) ySlider.value = String(item.y);
      render();
    }
    canvas.addEventListener('pointerdown', function (e) { dragging = true; canvas.setPointerCapture(e.pointerId); moveFromPointer(e); });
    canvas.addEventListener('pointermove', function (e) { if (dragging) moveFromPointer(e); });
    canvas.addEventListener('pointerup', function () { dragging = false; });
    canvas.addEventListener('pointercancel', function () { dragging = false; });

    c.setOnResize(render);
    render();
  }

  /* ── 2. CLICKER: Exponential Cost Curve & Strategy Lab ────────────── */
  function initClickerLab(host) {
    var canvas = host.querySelector('#clicker-lab-canvas');
    if (!canvas) return;
    var W = 540, H = 240;
    var c = setupCanvas(canvas, W, H);
    var sMult = host.querySelector('#clicker-lab-mult');
    var sCost = host.querySelector('#clicker-lab-cost');
    var sGoal = host.querySelector('#clicker-lab-goal');
    var outMult = host.querySelector('#clicker-lab-mult-out');
    var outCost = host.querySelector('#clicker-lab-cost-out');
    var outGoal = host.querySelector('#clicker-lab-goal-out');
    var tNever = host.querySelector('#clicker-telem-never');
    var tAsap = host.querySelector('#clicker-telem-asap');
    var tOpt = host.querySelector('#clicker-telem-opt');
    var tFifth = host.querySelector('#clicker-telem-fifth');
    var insight = host.querySelector('#clicker-lab-insight');

    function render() {
      var mult = Number(sMult.value);
      var startCost = Number(sCost.value);
      var goal = Number(sGoal.value);
      var sim = simulateClickerStrategies(startCost, mult, goal);

      if (outMult) outMult.textContent = mult.toFixed(1) + '×';
      if (outCost) outCost.textContent = startCost + ' pts';
      if (outGoal) outGoal.textContent = goal + ' pts';
      if (tNever) tNever.textContent = sim.neverClicks + ' clicks';
      if (tAsap) tAsap.textContent = sim.asapClicks + ' clicks';
      if (tOpt) tOpt.textContent = sim.optClicks + ' clicks (' + sim.optUpgrades + ' upg)';
      if (tFifth) tFifth.textContent = sim.fifthCost + ' pts';

      c.prepare();
      var ctx = c.ctx;
      ctx.fillStyle = '#080e1c';
      ctx.fillRect(0, 0, W, H);

      var padL = 52, padR = 24, padT = 28, padB = 34;
      var gw = W - padL - padR, gh = H - padT - padB;
      var maxN = 8;
      var expPts = [], linPts = [];
      var maxY = goal;
      for (var n = 0; n <= maxN; n++) {
        var ec = clickerUpgradeCost(startCost, mult, n);
        var lc = startCost * (n + 1);
        expPts.push(ec);
        linPts.push(lc);
        if (ec > maxY) maxY = ec;
      }
      maxY = Math.max(maxY, 120);

      // Grid lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 1;
      for (var g = 0; g <= 4; g++) {
        var gy = padT + (gh * g) / 4;
        ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(W - padR, gy); ctx.stroke();
        ctx.fillStyle = '#64748b';
        ctx.font = '600 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(String(Math.round(maxY * (1 - g / 4))), padL - 6, gy + 3);
      }

      // Goal reference line
      var goalY = padT + gh * (1 - goal / maxY);
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
      ctx.beginPath(); ctx.moveTo(padL, goalY); ctx.lineTo(W - padR, goalY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'left';
      ctx.fillText('Win Goal (' + goal + ' pts)', padL + 6, Math.max(padT + 10, goalY - 5));

      function plotLine(pts, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (var i = 0; i < pts.length; i++) {
          var px = padL + (gw * i) / maxN;
          var py = padT + gh * (1 - pts[i] / maxY);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      plotLine(linPts, '#38bdf8');
      plotLine(expPts, '#f43f5e');

      // Nodes & optimal marker
      for (var i = 0; i <= maxN; i++) {
        var px = padL + (gw * i) / maxN;
        var py = padT + gh * (1 - expPts[i] / maxY);
        ctx.fillStyle = i === sim.optUpgrades ? '#22c55e' : '#f43f5e';
        ctx.beginPath(); ctx.arc(px, py, i === sim.optUpgrades ? 6 : 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText('#' + (i + 1), px, H - 12);
      }

      // Legend
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f43f5e'; ctx.fillText('● Exponential (' + mult.toFixed(1) + '×)', padL, 16);
      ctx.fillStyle = '#38bdf8'; ctx.fillText('● Linear (+' + startCost + ')', padL + 150, 16);
      ctx.fillStyle = '#22c55e'; ctx.fillText('● Optimal Stop (' + sim.optUpgrades + ' upg)', padL + 280, 16);

      if (insight) {
        var saved = sim.neverClicks - sim.optClicks;
        insight.innerHTML = '<strong>ECONOMY MATH:</strong> Buying <strong>' + sim.optUpgrades + ' upgrade' + (sim.optUpgrades === 1 ? '' : 's') + '</strong> then saving beats never upgrading by <strong>' + saved + ' clicks</strong>' +
          (sim.asapClicks > sim.optClicks ? '—and beats buying blindly ASAP by ' + (sim.asapClicks - sim.optClicks) + ' clicks because late upgrades cost more than they pay back!' : '.');
      }
    }

    [sMult, sCost, sGoal].forEach(function (el) { if (el) el.addEventListener('input', render); });
    c.setOnResize(render);
    render();
  }

  /* ── 3. MAZE: Interactive BFS Shortest-Path & Flood-Fill Lab ──────── */
  function initMazeLab(host) {
    var canvas = host.querySelector('#maze-lab-canvas');
    if (!canvas) return;
    var W = 540, H = 250;
    var c = setupCanvas(canvas, W, H);
    var COLS = 11, ROWS = 7, TILE = 32;
    var offX = (W - COLS * TILE) / 2, offY = (H - ROWS * TILE) / 2;

    var btnRun = host.querySelector('#maze-lab-run');
    var btnStep = host.querySelector('#maze-lab-step');
    var btnRandom = host.querySelector('#maze-lab-random');
    var btnReset = host.querySelector('#maze-lab-reset');
    var tExplored = host.querySelector('#maze-telem-explored');
    var tPath = host.querySelector('#maze-telem-path');
    var tOptimal = host.querySelector('#maze-telem-optimal');
    var tStatus = host.querySelector('#maze-telem-status');
    var insight = host.querySelector('#maze-lab-insight');

    var baseGrid = [
      '###########',
      '#...#.....#',
      '###.#.###.#',
      '#.#.#...#.#',
      '#.#.#####.#',
      '#.........#',
      '###########'
    ];
    var grid = baseGrid.map(function (r) { return r.split(''); });
    var start = { col: 1, row: 1 }, goal = { col: 9, row: 5 };
    var mode = 'bfs';
    var search = null;
    var revealIdx = 0;
    var running = false;
    var tickCount = 0;

    function recompute(showAll) {
      var strGrid = grid.map(function (r) { return r.join(''); });
      search = mode === 'bfs' ? bfsShortestPath(strGrid, start, goal) : dfsPath(strGrid, start, goal);
      revealIdx = showAll ? search.order.length : 1;
      running = false;
      updateUI();
    }

    function updateUI() {
      var done = revealIdx >= search.order.length;
      if (tExplored) tExplored.textContent = Math.min(revealIdx, search.order.length) + ' / ' + search.order.length;
      if (tPath) tPath.textContent = done ? (search.found ? search.dist + ' steps' : 'No path') : '—';
      if (tOptimal) tOptimal.textContent = mode === 'bfs' ? 'YES (Par)' : 'NO (First found)';
      if (tStatus) tStatus.textContent = done ? (search.found ? 'Found!' : 'Blocked!') : (running ? 'Searching…' : 'Paused');
      if (insight) {
        if (done && !search.found) {
          insight.className = 'gt-lab-insight is-warn';
          insight.innerHTML = '<strong>✕ UNSOLVABLE MAZE:</strong> Every reachable floor cell was flooded and the goal was never touched. Click a wall tile to open a corridor!';
        } else if (mode === 'bfs') {
          insight.className = 'gt-lab-insight';
          insight.innerHTML = '<strong>✓ BREADTH-FIRST SEARCH (BFS):</strong> Expands in concentric distance rings using a FIFO queue. The first time the wavefront touches the goal, the path length (' + (search.found ? search.dist : '—') + ') is mathematically guaranteed to equal <strong>Par</strong>.';
        } else {
          insight.className = 'gt-lab-insight';
          insight.innerHTML = '<strong>DEPTH-FIRST SEARCH (DFS):</strong> Dives straight down one corridor using a LIFO stack until hitting a wall, then backtracks. Fast in memory, but often finds a longer detour instead of Par.';
        }
      }
      render();
    }

    function render() {
      c.prepare();
      var ctx = c.ctx;
      ctx.fillStyle = '#080e1c';
      ctx.fillRect(0, 0, W, H);

      var shown = {};
      var frontierCell = null;
      var limit = Math.min(revealIdx, search.order.length);
      for (var i = 0; i < limit; i++) {
        var o = search.order[i];
        shown[o.col + ',' + o.row] = o.dist;
        frontierCell = o;
      }

      for (var r = 0; r < ROWS; r++) {
        for (var cl = 0; cl < COLS; cl++) {
          var x = offX + cl * TILE, y = offY + r * TILE;
          var k = cl + ',' + r;
          if (grid[r][cl] === '#') {
            ctx.fillStyle = '#334155';
            ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
          } else {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
            if (k in shown) {
              var d = shown[k];
              ctx.fillStyle = mode === 'bfs'
                ? 'hsla(' + Math.max(175, 225 - d * 3.5) + ', 85%, 55%, 0.28)'
                : 'rgba(245, 158, 11, 0.22)';
              ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
              ctx.fillStyle = '#cbd5e1';
              ctx.font = '600 9px "JetBrains Mono", monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(d), x + TILE / 2, y + TILE / 2);
            }
          }
        }
      }

      if (frontierCell && limit < search.order.length) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.strokeRect(offX + frontierCell.col * TILE + 2, offY + frontierCell.row * TILE + 2, TILE - 4, TILE - 4);
      }

      // Draw found path once complete
      if (limit >= search.order.length && search.found && search.path.length > 1) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        search.path.forEach(function (pt, idx) {
          var px = offX + pt.col * TILE + TILE / 2;
          var py = offY + pt.row * TILE + TILE / 2;
          if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }

      ctx.font = '700 13px "IBM Plex Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#4ade80';
      ctx.fillText('S', offX + start.col * TILE + TILE / 2, offY + start.row * TILE + TILE / 2);
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('G', offX + goal.col * TILE + TILE / 2, offY + goal.row * TILE + TILE / 2);

      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Click any interior tile to toggle wall/floor', offX, 11);
    }

    canvas.addEventListener('click', function (e) {
      var r = canvas.getBoundingClientRect();
      var cx = (e.clientX - r.left) / r.width * W;
      var cy = (e.clientY - r.top) / r.height * H;
      var col = Math.floor((cx - offX) / TILE);
      var row = Math.floor((cy - offY) / TILE);
      if (col > 0 && col < COLS - 1 && row > 0 && row < ROWS - 1) {
        if ((col === start.col && row === start.row) || (col === goal.col && row === goal.row)) return;
        grid[row][col] = grid[row][col] === '#' ? '.' : '#';
        recompute(true);
      }
    });

    wireModeButtons(host, function (next) { mode = next; recompute(true); });
    if (btnRun) btnRun.addEventListener('click', function () { revealIdx = 1; running = true; updateUI(); });
    if (btnStep) btnStep.addEventListener('click', function () { running = false; if (revealIdx < search.order.length) revealIdx++; updateUI(); });
    if (btnRandom) btnRandom.addEventListener('click', function () {
      grid = generateBacktrackerMaze(COLS, ROWS).map(function (r) { return r.split(''); });
      recompute(false);
      running = true;
      updateUI();
    });
    if (btnReset) btnReset.addEventListener('click', function () {
      grid = baseGrid.map(function (r) { return r.split(''); });
      recompute(true);
    });

    c.setOnResize(render);
    recompute(true);
    startLabLoop(canvas, function () {
      if (!running) return;
      if (++tickCount % 3 === 0) {
        if (revealIdx < search.order.length) { revealIdx++; updateUI(); }
        else { running = false; updateUI(); }
      }
    }, function () {});
  }

  /* ── 4. FLAPPY: Euler Gravity & Jump Arc Lab ──────────────────────── */
  function initFlappyLab(host) {
    var canvas = host.querySelector('#flappy-lab-canvas');
    if (!canvas) return;
    var W = 540, H = 240;
    var c = setupCanvas(canvas, W, H);
    var sGrav = host.querySelector('#flappy-lab-grav');
    var sFlap = host.querySelector('#flappy-lab-flap');
    var sScroll = host.querySelector('#flappy-lab-scroll');
    var oGrav = host.querySelector('#flappy-lab-grav-out');
    var oFlap = host.querySelector('#flappy-lab-flap-out');
    var oScroll = host.querySelector('#flappy-lab-scroll-out');
    var tRise = host.querySelector('#flappy-telem-rise');
    var tTime = host.querySelector('#flappy-telem-time');
    var tWidth = host.querySelector('#flappy-telem-width');
    var tVerdict = host.querySelector('#flappy-telem-verdict');
    var insight = host.querySelector('#flappy-lab-insight');
    var btnFire = host.querySelector('#flappy-lab-fire');
    var presets = Array.prototype.slice.call(host.querySelectorAll('[data-flappy-preset]'));

    var bird = { x: 80, y: 155, vy: 0, active: false };
    var startY = 155;

    function launchBird() {
      var grav = Number(sGrav.value), flap = Number(sFlap.value);
      bird = { x: 80, y: startY, vy: -grav * flap, active: true };
    }

    function updateTelemetry() {
      var grav = Number(sGrav.value), flap = Number(sFlap.value), scroll = Number(sScroll.value);
      var arc = computeFlappyArc(grav, flap, scroll);
      if (oGrav) oGrav.textContent = String(grav);
      if (oFlap) oFlap.textContent = flap.toFixed(1) + '×';
      if (oScroll) oScroll.textContent = scroll + ' px/f';
      if (tRise) tRise.textContent = arc.peakRisePx + ' px';
      if (tTime) tTime.textContent = arc.apexTicks + ' ticks (' + arc.apexMs + ' ms)';
      if (tWidth) tWidth.textContent = arc.arcWidthPx + ' px';
      if (tVerdict) tVerdict.textContent = arc.hitsCeiling ? 'Ceiling Risk!' : (arc.peakRisePx < 25 ? 'Too Weak' : 'Clean Clearance');
      if (insight) {
        if (arc.hitsCeiling) {
          insight.className = 'gt-lab-insight is-warn';
          insight.innerHTML = '<strong>⚠️ CEILING CRASH RISK:</strong> A single flap rises <strong>' + arc.peakRisePx + ' px</strong>, launching past the top pipe lip. Lower Flap Multiplier to keep jumps controllable.';
        } else {
          insight.className = 'gt-lab-insight';
          insight.innerHTML = '<strong>EULER PARABOLA:</strong> Each frame runs <code>vy += ' + (grav * 0.15).toFixed(2) + '</code> then <code>y += vy</code>, tracing a symmetric parabola that peaks in <strong>' + arc.apexMs + ' ms</strong>.';
        }
      }
      return arc;
    }

    function render() {
      var grav = Number(sGrav.value), flap = Number(sFlap.value), scroll = Number(sScroll.value);
      var arc = computeFlappyArc(grav, flap, scroll);
      c.prepare();
      var ctx = c.ctx;
      ctx.fillStyle = '#080e1c';
      ctx.fillRect(0, 0, W, H);

      // Reference pipe gap
      var pipeX = 280, gapTop = 58, gapH = 120;
      ctx.fillStyle = '#15803d';
      ctx.fillRect(pipeX, 0, 44, gapTop);
      ctx.fillRect(pipeX, gapTop + gapH, 44, H - (gapTop + gapH));
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(pipeX - 3, gapTop - 9, 50, 9);
      ctx.fillRect(pipeX - 3, gapTop + gapH, 50, 9);

      // Predicted dotted trajectory
      ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
      var apexPt = null;
      arc.points.forEach(function (pt, idx) {
        var px = 80 + pt.x, py = startY + pt.y;
        if (py > H - 10 || py < 6 || px > W - 12) return;
        if (idx === arc.apexTicks) apexPt = { x: px, y: py };
        if (idx % 2 === 0) {
          ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fill();
        }
      });

      if (apexPt) {
        ctx.strokeStyle = '#fde047';
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(80, startY); ctx.lineTo(apexPt.x, startY); ctx.moveTo(apexPt.x, startY); ctx.lineTo(apexPt.x, apexPt.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fde047';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Apex +' + arc.peakRisePx + 'px', apexPt.x, Math.max(14, apexPt.y - 10));
      }

      // Live animated bird
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🐦', bird.x, bird.y);
    }

    presets.forEach(function (p) {
      p.addEventListener('click', function () {
        presets.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        p.setAttribute('aria-pressed', 'true');
        var kind = p.getAttribute('data-flappy-preset');
        if (kind === 'classic') { sGrav.value = '3'; sFlap.value = '1.6'; sScroll.value = '3'; }
        if (kind === 'floaty')  { sGrav.value = '2'; sFlap.value = '1.9'; sScroll.value = '2'; }
        if (kind === 'heavy')   { sGrav.value = '5'; sFlap.value = '1.4'; sScroll.value = '4'; }
        updateTelemetry();
        launchBird();
      });
    });

    [sGrav, sFlap, sScroll].forEach(function (el) {
      if (el) el.addEventListener('input', function () { updateTelemetry(); launchBird(); });
    });
    if (btnFire) btnFire.addEventListener('click', launchBird);

    c.setOnResize(render);
    updateTelemetry();
    launchBird();
    startLabLoop(canvas, function () {
      if (!bird.active) return;
      var grav = Number(sGrav.value), scroll = Number(sScroll.value);
      bird.vy += grav * 0.15;
      bird.x += scroll;
      bird.y += bird.vy;
      if (bird.y > H - 10 || bird.y < 8 || bird.x > W - 16) launchBird();
    }, render);
  }

  /* ── 5. SHOOTER: Predictive Lead Geometry Lab ─────────────────────── */
  function initShooterLab(host) {
    var canvas = host.querySelector('#shooter-lab-canvas');
    if (!canvas) return;
    var W = 540, H = 240;
    var c = setupCanvas(canvas, W, H);
    var sTarget = host.querySelector('#shooter-lab-tvx');
    var sProj = host.querySelector('#shooter-lab-pvy');
    var oTarget = host.querySelector('#shooter-lab-tvx-out');
    var oProj = host.querySelector('#shooter-lab-pvy-out');
    var tFlight = host.querySelector('#shooter-telem-flight');
    var tLead = host.querySelector('#shooter-telem-lead');
    var tInter = host.querySelector('#shooter-telem-inter');
    var tResult = host.querySelector('#shooter-telem-result');
    var insight = host.querySelector('#shooter-lab-insight');
    var btnFire = host.querySelector('#shooter-lab-fire');

    var mode = 'lead';
    var targetY = 52, launcherX = W / 2, launcherY = H - 30;
    var target = { x: 140, vx: 1.8 };
    var shot = null;
    var lastOutcome = 'Ready';

    function fireShot() {
      var tvx = Number(sTarget.value) * (target.vx >= 0 ? 1 : -1);
      var pvy = Number(sProj.value);
      var geo = computeLeadShot(target.x, targetY, tvx, launcherX, launcherY, pvy);
      var aimX = mode === 'lead' ? Math.max(24, Math.min(W - 24, geo.interceptX)) : target.x;
      var dx = aimX - launcherX, dy = targetY - launcherY;
      var dist = Math.hypot(dx, dy);
      shot = { x: launcherX, y: launcherY, vx: (dx / dist) * pvy, vy: (dy / dist) * pvy, aimX: aimX };
      lastOutcome = mode === 'lead' ? 'Tracking intercept…' : 'Aiming behind…';
      updateTelemetry();
    }

    function updateTelemetry() {
      var tvx = Number(sTarget.value);
      var pvy = Number(sProj.value);
      var geo = computeLeadShot(target.x, targetY, tvx, launcherX, launcherY, pvy);
      if (oTarget) oTarget.textContent = tvx.toFixed(1) + ' px/f';
      if (oProj) oProj.textContent = pvy + ' px/f';
      if (tFlight) tFlight.textContent = geo.flightTicks.toFixed(1) + ' ticks';
      if (tLead) tLead.textContent = (target.vx >= 0 ? '+' : '−') + Math.abs(geo.leadDx).toFixed(0) + ' px';
      if (tInter) tInter.textContent = Math.round(Math.max(24, Math.min(W - 24, target.x + (target.vx >= 0 ? 1 : -1) * geo.leadDx))) + ' px';
      if (tResult) tResult.textContent = lastOutcome;
      if (insight) {
        if (mode === 'direct') {
          insight.className = 'gt-lab-insight is-warn';
          insight.innerHTML = '<strong>✕ DIRECT AIM MISSES:</strong> During the <strong>' + geo.flightTicks.toFixed(0) + ' frames</strong> the shot takes to cross Δy = ' + (launcherY - targetY) + ' px, the target drifts <strong>' + Math.abs(geo.leadDx).toFixed(0) + ' px</strong> sideways!';
        } else {
          insight.className = 'gt-lab-insight';
          insight.innerHTML = '<strong>✓ LEAD GEOMETRY:</strong> Predict future position with <code>x_hit = x + vx × (Δy / v_shot)</code>. Firing ahead meets the moving target at the exact same tick!';
        }
      }
    }

    function render() {
      c.prepare();
      var ctx = c.ctx;
      ctx.fillStyle = '#080e1c';
      ctx.fillRect(0, 0, W, H);

      var pvy = Number(sProj.value);
      var tvx = Number(sTarget.value) * (target.vx >= 0 ? 1 : -1);
      var geo = computeLeadShot(target.x, targetY, tvx, launcherX, launcherY, pvy);
      var predX = Math.max(24, Math.min(W - 24, geo.interceptX));

      // Sightline
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = mode === 'lead' ? 'rgba(56, 189, 248, 0.55)' : 'rgba(239, 68, 68, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(launcherX, launcherY);
      ctx.lineTo(mode === 'lead' ? predX : target.x, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Intercept crosshair
      ctx.strokeStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(predX, targetY, 12, 0, Math.PI * 2);
      ctx.moveTo(predX - 16, targetY); ctx.lineTo(predX + 16, targetY);
      ctx.stroke();

      // Target & velocity arrow
      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎈', target.x, targetY);

      if (shot) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath(); ctx.arc(shot.x, shot.y, 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.font = '26px sans-serif';
      ctx.fillText('🤖', launcherX, launcherY);
    }

    wireModeButtons(host, function (next) { mode = next; fireShot(); });
    [sTarget, sProj].forEach(function (el) { if (el) el.addEventListener('input', updateTelemetry); });
    if (btnFire) btnFire.addEventListener('click', fireShot);

    c.setOnResize(render);
    updateTelemetry();
    startLabLoop(canvas, function () {
      var speed = Number(sTarget.value);
      target.vx = (target.vx >= 0 ? 1 : -1) * speed;
      target.x += target.vx;
      if (target.x < 40 || target.x > W - 40) target.vx *= -1;
      if (shot) {
        shot.x += shot.vx;
        shot.y += shot.vy;
        if (Math.abs(shot.x - target.x) < 22 && Math.abs(shot.y - targetY) < 22) {
          lastOutcome = 'HIT!';
          shot = null;
          updateTelemetry();
        } else if (shot.y < 10) {
          lastOutcome = 'MISSED!';
          shot = null;
          updateTelemetry();
        }
      }
    }, render);
  }

  /* ── 6. RHYTHM: Audio Clock vs. Frame Drift Lab ───────────────────── */
  function initRhythmLab(host) {
    var canvas = host.querySelector('#rhythm-lab-canvas');
    if (!canvas) return;
    var W = 540, H = 230;
    var c = setupCanvas(canvas, W, H);
    var sBpm = host.querySelector('#rhythm-lab-bpm');
    var sWin = host.querySelector('#rhythm-lab-win');
    var oBpm = host.querySelector('#rhythm-lab-bpm-out');
    var oWin = host.querySelector('#rhythm-lab-win-out');
    var btnTap = host.querySelector('#rhythm-lab-tap');
    var btnLag = host.querySelector('#rhythm-lab-lag');
    var tInt = host.querySelector('#rhythm-telem-int');
    var tLast = host.querySelector('#rhythm-telem-last');
    var tAvg = host.querySelector('#rhythm-telem-avg');
    var tDrift = host.querySelector('#rhythm-telem-drift');
    var insight = host.querySelector('#rhythm-lab-insight');

    var mode = 'clock'; // 'clock' | 'frame'
    var startMs = performance.now();
    var frameDriftMs = 0;
    var taps = [];
    var flash = 0;

    function beatMs() { return 60000 / Number(sBpm.value); }

    function updateTelemetry() {
      var interval = beatMs();
      var avg = taps.length
        ? Math.round(taps.reduce(function (a, b) { return a + Math.abs(b); }, 0) / taps.length)
        : 0;
      if (oBpm) oBpm.textContent = sBpm.value + ' BPM';
      if (oWin) oWin.textContent = '±' + sWin.value + ' ms';
      if (tInt) tInt.textContent = Math.round(interval) + ' ms';
      if (tLast) tLast.textContent = taps.length ? (taps[taps.length - 1] >= 0 ? '+' : '') + taps[taps.length - 1] + ' ms' : '—';
      if (tAvg) tAvg.textContent = taps.length ? avg + ' ms' : '—';
      if (tDrift) tDrift.textContent = mode === 'clock' ? '0 ms (Locked)' : '+' + frameDriftMs + ' ms';
      if (insight) {
        if (mode === 'frame' && frameDriftMs > 0) {
          insight.className = 'gt-lab-insight is-warn';
          insight.innerHTML = '<strong>⚠️ FRAME DRIFT (+' + frameDriftMs + ' ms):</strong> Every lag spike permanently shifts frame-counted notes out of phase with the real audio beat. Click <strong>Clock-Synced</strong> to anchor notes to wall-clock time!';
        } else {
          insight.className = 'gt-lab-insight';
          insight.innerHTML = '<strong>CLOCK-SYNCED TIMING:</strong> Computing note position from <code>(now - songStart) / beatMs</code> means dropped frames never shift the beat.';
        }
      }
    }

    function recordTap() {
      var interval = beatMs();
      var visualNow = performance.now() - startMs - (mode === 'frame' ? frameDriftMs : 0);
      var phase = ((visualNow % interval) + interval) % interval;
      var offset = phase > interval / 2 ? phase - interval : phase;
      taps.push(Math.round(offset));
      if (taps.length > 10) taps.shift();
      flash = 12;
      if (global.GameTutorial && global.GameTutorial.sound && global.GameTutorial.sound.enabled()) {
        global.GameTutorial.sound.play(Math.abs(offset) <= Number(sWin.value) ? 'good' : 'click');
      }
      updateTelemetry();
    }

    function render() {
      c.prepare();
      var ctx = c.ctx;
      ctx.fillStyle = '#080e1c';
      ctx.fillRect(0, 0, W, H);

      var interval = beatMs();
      var winMs = Number(sWin.value);
      var targetX = 110;
      var pxPerMs = 0.22;
      var visualNow = performance.now() - startMs - (mode === 'frame' ? frameDriftMs : 0);

      // Top lane: scrolling beats
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(16, 20, W - 32, 90);
      var goodW = winMs * 2 * pxPerMs, perfW = winMs * pxPerMs;
      ctx.fillStyle = 'rgba(134, 239, 172, 0.14)';
      ctx.fillRect(targetX - goodW, 20, goodW * 2, 90);
      ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
      ctx.fillRect(targetX - perfW, 20, perfW * 2, 90);

      ctx.strokeStyle = flash > 0 ? '#fde047' : '#a78bfa';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(targetX, 20); ctx.lineTo(targetX, 110); ctx.stroke();

      var firstBeat = Math.floor((visualNow - 400) / interval);
      for (var b = firstBeat; b < firstBeat + 6; b++) {
        var beatTime = b * interval;
        var nx = targetX + (beatTime - visualNow) * pxPerMs;
        if (nx >= 20 && nx <= W - 20) {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath(); ctx.arc(nx, 65, 11, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Bottom: Early <-> Late accuracy bar
      var barY = 168, midX = W / 2;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(40, barY); ctx.lineTo(W - 40, barY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(midX, barY - 18); ctx.lineTo(midX, barY + 18); ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left'; ctx.fillText('← EARLY (-ms)', 40, barY - 22);
      ctx.textAlign = 'center'; ctx.fillText('0 ms (PERFECT)', midX, barY - 22);
      ctx.textAlign = 'right'; ctx.fillText('LATE (+ms) →', W - 40, barY - 22);

      taps.forEach(function (ms, idx) {
        var tx = Math.max(46, Math.min(W - 46, midX + ms * 1.1));
        var isLast = idx === taps.length - 1;
        ctx.fillStyle = Math.abs(ms) <= winMs ? '#fde047' : Math.abs(ms) <= winMs * 2 ? '#86efac' : '#f87171';
        ctx.beginPath(); ctx.arc(tx, barY, isLast ? 7 : 4, 0, Math.PI * 2); ctx.fill();
      });
    }

    wireModeButtons(host, function (next) {
      mode = next;
      if (mode === 'clock') frameDriftMs = 0;
      updateTelemetry();
    });
    if (btnTap) btnTap.addEventListener('click', recordTap);
    if (btnLag) btnLag.addEventListener('click', function () {
      if (mode === 'frame') frameDriftMs += 120;
      updateTelemetry();
    });
    [sBpm, sWin].forEach(function (el) { if (el) el.addEventListener('input', updateTelemetry); });
    host.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && document.activeElement !== btnTap) {
        e.preventDefault(); recordTap();
      }
    });

    c.setOnResize(render);
    c.setOnResize(render);
    updateTelemetry();
    startLabLoop(canvas, function () { if (flash > 0) flash--; }, render);
  }

  /* ── 7. QUIZ: Fisher-Yates & State Machine Lab ────────────────────── */
  function initQuizLab(host) {
    var canvas = host.querySelector('#quiz-lab-canvas');
    if (!canvas) return;
    var W = 540, H = 230;
    var c = setupCanvas(canvas, W, H);
    var tA = host.querySelector('#quiz-telem-a');
    var tB = host.querySelector('#quiz-telem-b');
    var tC = host.querySelector('#quiz-telem-c');
    var tD = host.querySelector('#quiz-telem-d');
    var insight = host.querySelector('#quiz-lab-insight');
    var ctrlShuffle = host.querySelector('#quiz-lab-ctrl-shuffle');
    var ctrlFsm = host.querySelector('#quiz-lab-ctrl-fsm');
    var btnTrials = host.querySelector('#quiz-lab-trials');
    var btnOk = host.querySelector('#quiz-lab-ok');
    var btnWrong = host.querySelector('#quiz-lab-wrong');
    var btnSpam = host.querySelector('#quiz-lab-spam');
    var btnResetFsm = host.querySelector('#quiz-lab-reset-fsm');

    var mode = 'shuffle'; // 'shuffle' | 'fsm'
    var fyCounts = [0, 0, 0], naiveCounts = [0, 0, 0];
    var fsmState = 'ASKING';
    var retries = 2;
    var blockedClicks = 0;

    function runTrials() {
      fyCounts = [0, 0, 0];
      naiveCounts = [0, 0, 0];
      for (var i = 0; i < 1000; i++) {
        var fy = fisherYates(['A', 'B', 'C']);
        fyCounts[fy.indexOf('A')]++;
        var nv = naiveSortShuffle(['A', 'B', 'C']);
        naiveCounts[nv.indexOf('A')]++;
      }
      render();
    }

    function render() {
      if (ctrlShuffle) ctrlShuffle.hidden = mode !== 'shuffle';
      if (ctrlFsm) ctrlFsm.hidden = mode !== 'fsm';
      c.prepare();
      var ctx = c.ctx;
      ctx.fillStyle = '#080e1c';
      ctx.fillRect(0, 0, W, H);

      if (mode === 'shuffle') {
        var slots = ['Slot 1', 'Slot 2', 'Slot 3'];
        var maxV = 550;
        var baseY = H - 36, chartH = 140;
        ctx.strokeStyle = 'rgba(148,163,184,0.25)';
        ctx.setLineDash([4, 4]);
        var idealY = baseY - (333 / maxV) * chartH;
        ctx.beginPath(); ctx.moveTo(40, idealY); ctx.lineTo(W - 30, idealY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Fair ideal: 333 / 1000 (33.3%)', 42, idealY - 6);

        slots.forEach(function (lbl, idx) {
          var gx = 100 + idx * 145;
          var h1 = (fyCounts[idx] / maxV) * chartH;
          var h2 = (naiveCounts[idx] / maxV) * chartH;
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(gx - 28, baseY - h1, 26, h1);
          ctx.fillStyle = '#f43f5e';
          ctx.fillRect(gx + 2, baseY - h2, 26, h2);
          ctx.fillStyle = '#e2e8f0';
          ctx.textAlign = 'center';
          ctx.fillText(String(fyCounts[idx]), gx - 15, baseY - h1 - 8);
          ctx.fillText(String(naiveCounts[idx]), gx + 15, baseY - h2 - 8);
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(lbl, gx, baseY + 18);
        });
        ctx.textAlign = 'left';
        ctx.fillStyle = '#22c55e'; ctx.fillText('■ Fisher-Yates', 42, 20);
        ctx.fillStyle = '#f43f5e'; ctx.fillText('■ Naive sort(random - 0.5)', 170, 20);

        var spreadFy = Math.max.apply(null, fyCounts) - Math.min.apply(null, fyCounts);
        var spreadNv = Math.max.apply(null, naiveCounts) - Math.min.apply(null, naiveCounts);
        if (tA) tA.textContent = fyCounts.join(' / ');
        if (tB) tB.textContent = naiveCounts.join(' / ');
        if (tC) tC.textContent = spreadFy + ' spread';
        if (tD) tD.textContent = spreadNv + ' spread';
        if (insight) {
          insight.className = 'gt-lab-insight';
          insight.innerHTML = '<strong>UNBIASED SHUFFLE:</strong> Over 1,000 trials, Fisher-Yates places Choice A evenly across all 3 slots (~333 each). <code>Array.sort(() =&gt; Math.random() - 0.5)</code> breaks transitivity and skews positions!';
        }
      } else {
        var nodes = [
          { id: 'ASKING', x: 78, y: 115 },
          { id: 'HINT_RETRY', x: 205, y: 55 },
          { id: 'REVEAL', x: 205, y: 175 },
          { id: 'LOCKED', x: 345, y: 115 },
          { id: 'COMPLETE', x: 465, y: 115 }
        ];
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        [[0, 1], [0, 3], [1, 0], [1, 2], [2, 3], [3, 4]].forEach(function (e) {
          ctx.beginPath();
          ctx.moveTo(nodes[e[0]].x, nodes[e[0]].y);
          ctx.lineTo(nodes[e[1]].x, nodes[e[1]].y);
          ctx.stroke();
        });
        nodes.forEach(function (n) {
          var active = n.id === fsmState;
          ctx.fillStyle = active ? '#7c3aed' : '#111a2e';
          ctx.strokeStyle = active ? '#ddd6fe' : '#334155';
          ctx.lineWidth = active ? 2.5 : 1.5;
          ctx.beginPath();
          ctx.roundRect(n.x - 46, n.y - 20, 92, 40, 8);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = active ? '#fff' : '#cbd5e1';
          ctx.font = '700 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(n.id, n.x, n.y);
        });

        if (tA) tA.textContent = fsmState;
        if (tB) tB.textContent = String(retries);
        if (tC) tC.textContent = (fsmState === 'LOCKED' || fsmState === 'REVEAL' || fsmState === 'COMPLETE') ? 'TRUE' : 'FALSE';
        if (tD) tD.textContent = blockedClicks + ' blocked';
        if (insight) {
          insight.className = 'gt-lab-insight';
          insight.innerHTML = '<strong>STATE MACHINE GUARD:</strong> While in <code>LOCKED</code> or <code>REVEAL</code>, extra clicks are ignored (' + blockedClicks + ' blocked so far), preventing double-clicks from skipping questions!';
        }
      }
    }

    wireModeButtons(host, function (next) { mode = next; render(); });
    if (btnTrials) btnTrials.addEventListener('click', runTrials);
    if (btnOk) btnOk.addEventListener('click', function () {
      if (fsmState === 'ASKING' || fsmState === 'HINT_RETRY') fsmState = 'LOCKED';
      else if (fsmState === 'LOCKED') fsmState = 'COMPLETE';
      else blockedClicks++;
      render();
    });
    if (btnWrong) btnWrong.addEventListener('click', function () {
      if (fsmState === 'ASKING' || fsmState === 'HINT_RETRY') {
        retries--;
        fsmState = retries <= 0 ? 'REVEAL' : 'HINT_RETRY';
      } else blockedClicks++;
      render();
    });
    if (btnSpam) btnSpam.addEventListener('click', function () {
      if (fsmState === 'ASKING' || fsmState === 'HINT_RETRY') fsmState = 'LOCKED';
      blockedClicks += 2;
      render();
    });
    if (btnResetFsm) btnResetFsm.addEventListener('click', function () {
      fsmState = 'ASKING'; retries = 2; blockedClicks = 0; render();
    });

    c.setOnResize(render);
    runTrials();
  }

  /* ── 8. CYOA: Live Story Graph & Branching Explosion Lab ──────────── */
  function initCyoaLab(host) {
    var canvas = host.querySelector('#cyoa-lab-canvas');
    if (!canvas) return;
    var W = 540, H = 250;
    var c = setupCanvas(canvas, W, H);
    var ctrlLive = host.querySelector('#cyoa-lab-ctrl-live');
    var ctrlTree = host.querySelector('#cyoa-lab-ctrl-tree');
    var sBranch = host.querySelector('#cyoa-lab-branch');
    var sDepth = host.querySelector('#cyoa-lab-depth');
    var oBranch = host.querySelector('#cyoa-lab-branch-out');
    var oDepth = host.querySelector('#cyoa-lab-depth-out');
    var chkFold = host.querySelector('#cyoa-lab-fold');
    var tA = host.querySelector('#cyoa-telem-a');
    var tB = host.querySelector('#cyoa-telem-b');
    var tC = host.querySelector('#cyoa-telem-c');
    var tD = host.querySelector('#cyoa-telem-d');
    var insight = host.querySelector('#cyoa-lab-insight');

    var mode = 'live'; // 'live' | 'tree'
    var liveState = null;
    var selectedNodeId = null;

    function layoutStory(story) {
      var scenes = story.scenes;
      var layers = [];
      var seen = {};
      var q = [{ id: story.start, depth: 0 }];
      seen[story.start] = true;
      while (q.length) {
        var cur = q.shift();
        if (!layers[cur.depth]) layers[cur.depth] = [];
        layers[cur.depth].push(cur.id);
        var sc = scenes[cur.id];
        if (sc && sc.choices) {
          sc.choices.forEach(function (ch) {
            if (!seen[ch.next]) {
              seen[ch.next] = true;
              q.push({ id: ch.next, depth: cur.depth + 1 });
            }
          });
        }
      }
      var pos = {};
      layers.forEach(function (ids, d) {
        var x = 75 + (d * (W - 150)) / Math.max(1, layers.length - 1);
        ids.forEach(function (id, idx) {
          var y = ((idx + 1) * H) / (ids.length + 1);
          pos[id] = { id: id, x: x, y: y, scene: scenes[id] };
        });
      });
      return pos;
    }

    function render() {
      if (ctrlLive) ctrlLive.hidden = mode !== 'live';
      if (ctrlTree) ctrlTree.hidden = mode !== 'tree';
      c.prepare();
      var ctx = c.ctx;
      ctx.fillStyle = '#080e1c';
      ctx.fillRect(0, 0, W, H);

      if (mode === 'live' && liveState && liveState.story) {
        var story = liveState.story;
        var pos = layoutStory(story);
        var scenes = story.scenes;

        // Edges
        Object.keys(pos).forEach(function (id) {
          var p = pos[id];
          if (!p.scene || !p.scene.choices) return;
          p.scene.choices.forEach(function (ch) {
            var np = pos[ch.next];
            if (!np) return;
            var onPath = liveState.path.indexOf(ch.label) !== -1;
            ctx.strokeStyle = onPath ? '#38bdf8' : 'rgba(148,163,184,0.32)';
            ctx.lineWidth = onPath ? 3 : 1.5;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(np.x, np.y); ctx.stroke();
          });
        });

        // Nodes
        Object.keys(pos).forEach(function (id) {
          var p = pos[id];
          var isCur = id === liveState.sceneId;
          var isSel = id === selectedNodeId;
          var sc = p.scene;
          var fill = sc.ending ? (sc.good ? '#14532d' : '#7f1d1d') : '#1e293b';
          var stroke = isCur ? '#fde047' : isSel ? '#38bdf8' : (sc.ending ? (sc.good ? '#22c55e' : '#ef4444') : '#475569');
          ctx.fillStyle = fill;
          ctx.strokeStyle = stroke;
          ctx.lineWidth = (isCur || isSel) ? 2.5 : 1.5;
          ctx.beginPath();
          ctx.roundRect(p.x - 42, p.y - 16, 84, 32, 8);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#f8fafc';
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(id.slice(0, 11), p.x, p.y);
        });

        var totalScenes = Object.keys(scenes).length;
        var totalEnds = Object.keys(scenes).filter(function (k) { return scenes[k].ending; }).length;
        if (tA) tA.textContent = story.title;
        if (tB) tB.textContent = liveState.sceneId;
        if (tC) tC.textContent = totalScenes + ' scenes';
        if (tD) tD.textContent = (liveState.found ? liveState.found.length : 0) + ' / ' + totalEnds;

        var inspectId = selectedNodeId && scenes[selectedNodeId] ? selectedNodeId : liveState.sceneId;
        var scInfo = scenes[inspectId];
        if (insight && scInfo) {
          insight.className = 'gt-lab-insight';
          insight.innerHTML = '<strong>NODE <code>' + inspectId + '</code>:</strong> "' + scInfo.text + '" — ' +
            (scInfo.ending ? (scInfo.good ? 'Good Ending node.' : 'Bad Ending node.') : 'Branches to <code>' + scInfo.choices.map(function (ch) { return ch.next; }).join('</code>, <code>') + '</code>.');
        }
      } else {
        var b = Number(sBranch ? sBranch.value : 2);
        var d = Number(sDepth ? sDepth.value : 4);
        var fold = !!(chkFold && chkFold.checked);
        var pureStats = countStoryNodes(b, d, false);
        var activeStats = countStoryNodes(b, d, fold);
        if (oBranch) oBranch.textContent = b + ' choices';
        if (oDepth) oDepth.textContent = d + ' layers';

        var padL = 54, padR = 24, padT = 26, padB = 34;
        var gw = W - padL - padR, gh = H - padT - padB;
        var maxV = Math.max(10, pureStats.perLayer[pureStats.perLayer.length - 1]);

        for (var i = 0; i <= d; i++) {
          var bx = padL + (gw * i) / d;
          var bhPure = (pureStats.perLayer[i] / maxV) * gh;
          var bhAct = (activeStats.perLayer[i] / maxV) * gh;
          ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
          ctx.fillRect(bx - 12, padT + gh - bhPure, 24, bhPure);
          ctx.fillStyle = fold ? '#22c55e' : '#38bdf8';
          ctx.fillRect(bx - 12, padT + gh - bhAct, 24, bhAct);
          ctx.fillStyle = '#e2e8f0';
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(String(activeStats.perLayer[i]), bx, Math.max(14, padT + gh - bhAct - 8));
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('L' + i, bx, H - 12);
        }

        if (tA) tA.textContent = b + '^' + d;
        if (tB) tB.textContent = activeStats.total + ' scenes';
        if (tC) tC.textContent = pureStats.total + ' pure';
        if (tD) tD.textContent = activeStats.endings + ' endings';
        if (insight) {
          insight.className = (!fold && pureStats.total > 40) ? 'gt-lab-insight is-warn' : 'gt-lab-insight';
          insight.innerHTML = fold
            ? '<strong>✓ FOLDBACK GRAPH:</strong> Merging branches back into shared hub scenes keeps writing manageable (<strong>' + activeStats.total + '</strong> scenes instead of ' + pureStats.total + ')!'
            : '<strong>COMBINATORIAL EXPLOSION:</strong> A pure tree with ' + b + ' choices over ' + d + ' chapters requires writing <strong>' + pureStats.total + '</strong> separate scenes.';
        }
      }
    }

    canvas.addEventListener('click', function (e) {
      if (mode !== 'live' || !liveState || !liveState.story) return;
      var pos = layoutStory(liveState.story);
      var r = canvas.getBoundingClientRect();
      var cx = (e.clientX - r.left) / r.width * W;
      var cy = (e.clientY - r.top) / r.height * H;
      Object.keys(pos).forEach(function (id) {
        var p = pos[id];
        if (Math.abs(cx - p.x) <= 44 && Math.abs(cy - p.y) <= 18) {
          selectedNodeId = id;
          render();
        }
      });
    });

    global.addEventListener('gt:cyoa-state', function (e) {
      liveState = e.detail;
      selectedNodeId = null;
      render();
    });
    if (global.__gtCyoaState) liveState = global.__gtCyoaState;

    wireModeButtons(host, function (next) { mode = next; render(); });
    [sBranch, sDepth, chkFold].forEach(function (el) { if (el) el.addEventListener('input', render); });
    c.setOnResize(render);
    render();
  }

  /* ── Boot whichever lab is on the current page ────────────────────── */
  function boot() {
    var pairs = [
      ['#catch-aabb-lab', initCatchLab],
      ['#clicker-economy-lab', initClickerLab],
      ['#maze-bfs-lab', initMazeLab],
      ['#flappy-arc-lab', initFlappyLab],
      ['#shooter-lead-lab', initShooterLab],
      ['#rhythm-timing-lab', initRhythmLab],
      ['#quiz-shuffle-lab', initQuizLab],
      ['#cyoa-graph-lab', initCyoaLab]
    ];
    pairs.forEach(function (p) {
      var el = global.document && global.document.querySelector(p[0]);
      if (el) p[1](el);
    });
  }

  if (global.document) {
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
}(typeof window !== 'undefined' ? window : globalThis));
