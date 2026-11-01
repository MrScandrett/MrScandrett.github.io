(function () {
  'use strict';

  var pastureCanvas = document.getElementById('pastureCanvas');
  var graphCanvas = document.getElementById('commonsGraph');
  if (!pastureCanvas || !graphCanvas) return;
  var pctx = pastureCanvas.getContext('2d');
  var gctx = graphCanvas.getContext('2d');

  var f1Slider = document.getElementById('f1Slider');
  var f1Label = document.getElementById('f1Label');
  var herdEls = {
    f1: document.getElementById('f1Herd'),
    f2: document.getElementById('f2Herd'),
    f3: document.getElementById('f3Herd'),
    f4: document.getElementById('f4Herd'),
    f5: document.getElementById('f5Herd')
  };
  var healthFill = document.getElementById('healthFill');
  var healthPct = document.getElementById('healthPct');
  var advanceBtn = document.getElementById('advanceBtn');
  var resetBtn = document.getElementById('resetBtn');

  var FARMERS = ['f1', 'f2', 'f3', 'f4', 'f5'];
  var COLORS = { f1: '#b63e50', f2: '#a25b16', f3: '#157b91', f4: '#7950a3', f5: '#7e6b11' };
  var LINE_STYLES = [[], [9, 4], [3, 3], [10, 3, 2, 3], [2, 5]];

  // ── Model constants ──
  var CAPACITY = 100;
  var GROWTH_RATE = 0.6;
  var CONSUMPTION_PER_ANIMAL = 1;
  var PRICE_PER_ANIMAL = 10;
  var MAX_HERD = 10;
  var SUSTAINABLE_TOTAL = (GROWTH_RATE * CAPACITY / 4) / CONSUMPTION_PER_ANIMAL;
  var COOP_HERD = Math.max(1, Math.round(SUSTAINABLE_TOTAL / FARMERS.length));

  var ruleSelect = document.getElementById('commons-rule');
  var state, history, sheep, collapsed, lastBalance;
  var sceneBack = document.createElement('canvas');
  var sceneFront = document.createElement('canvas');
  var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  var motionPaused = motionPreference.matches;
  var motionBtn = document.getElementById('motionBtn');
  var animation;

  function initState() {
    state = {
      health: CAPACITY,
      herds: { f1: 3, f2: 3, f3: 3, f4: 3, f5: 3 },
      wealth: { f1: 0, f2: 0, f3: 0, f4: 0, f5: 0 }
    };
    history = [{ round: 0, health: 100, wealth: { f1: 0, f2: 0, f3: 0, f4: 0, f5: 0 } }];
    collapsed = false;
    lastBalance = null;
    sheep = {};
    FARMERS.forEach(function (f) { sheep[f] = []; });
    syncSheep();
  }

  function syncSheep() {
    FARMERS.forEach(function (f, farmerIndex) {
      var arr = sheep[f];
      var n = state.herds[f];
      while (arr.length < n) {
        var id = arr.length * 5 + farmerIndex;
        // A repeatable scatter keeps the visual layout independent of AI randomness.
        var slot = (id * 17) % 50;
        arr.push({
          x: ((slot % 10) + 0.5 + Math.sin(id * 4.7) * 0.2) / 10,
          y: (Math.floor(slot / 10) + 0.5 + Math.cos(id * 3.1) * 0.2) / 5,
          vx: Math.sin(id * 2.3 + 1) * 0.009,
          vy: Math.cos(id * 1.7 + 1) * 0.007,
          phase: id * 1.8
        });
      }
      arr.length = n;
    });
  }

  // ── AI strategies, driven off last round's herds ──
  function aiHerd(farmer, prevHerds) {
    if (farmer === 'f2') { // Greedy: always +1, up to the cap
      return Math.min(MAX_HERD, (prevHerds.f2 || 3) + 1);
    }
    if (farmer === 'f3') { // Cooperative: holds the sustainable share
      return COOP_HERD;
    }
    if (farmer === 'f4') { // Tit-for-tat: mirrors overgrazing, de-escalates otherwise
      var others = ['f1', 'f2', 'f3', 'f5'].map(function (k) { return prevHerds[k]; });
      var maxOther = Math.max.apply(null, others);
      var cur = prevHerds.f4 || COOP_HERD;
      if (maxOther > COOP_HERD + 1) return Math.min(MAX_HERD, cur + 1);
      if (cur > COOP_HERD) return cur - 1;
      return COOP_HERD;
    }
    if (farmer === 'f5') { // Random
      return Math.floor(Math.random() * 6) + 1;
    }
    return prevHerds[farmer];
  }

  function advance() {
    if (collapsed) return;

    var prevHerds = state.herds;
    var newHerds = {
      f1: parseInt(f1Slider.value, 10),
      f2: aiHerd('f2', prevHerds),
      f3: aiHerd('f3', prevHerds),
      f4: aiHerd('f4', prevHerds),
      f5: aiHerd('f5', prevHerds)
    };

    if (ruleSelect.value === 'quota') FARMERS.forEach(function (f) { newHerds[f] = Math.min(3, newHerds[f]); });

    var healthMultiplier = state.health / CAPACITY;
    FARMERS.forEach(function (f) {
      state.wealth[f] += newHerds[f] * PRICE_PER_ANIMAL * healthMultiplier;
    });

    var totalHerd = FARMERS.reduce(function (sum, f) { return sum + newHerds[f]; }, 0);
    var regen = GROWTH_RATE * state.health * (1 - state.health / CAPACITY);
    var consumption = totalHerd * CONSUMPTION_PER_ANIMAL;
    lastBalance = { start: state.health, regen: regen, consumption: consumption };
    state.health = Math.max(0, Math.min(CAPACITY, state.health + regen - consumption));
    state.herds = newHerds;

    history.push({
      round: history.length,
      health: state.health,
      wealth: { f1: state.wealth.f1, f2: state.wealth.f2, f3: state.wealth.f3, f4: state.wealth.f4, f5: state.wealth.f5 }
    });

    if (state.health <= 0 && !collapsed) {
      collapsed = true;
      advanceBtn.disabled = true;
      advanceBtn.textContent = 'Pasture Collapsed';
    }
    syncSheep();
    updateHerdDisplays();
    updateHealthMeter();
    updateResults();
    rebuildPasture();
    drawPasture(0);
    drawGraph();
  }

  function updateHerdDisplays() {
    FARMERS.forEach(function (f) {
      if (herdEls[f]) herdEls[f].textContent = state.herds[f];
    });
  }

  function updateHealthMeter() {
    var pct = Math.round(state.health);
    healthFill.style.width = pct + '%';
    healthPct.textContent = pct;
    healthFill.style.background = pct > 50 ? '#467a39' : pct > 25 ? '#9a6b24' : '#aa4436';
    document.getElementById('healthMeter').setAttribute('aria-valuenow', state.health.toFixed(1));
  }

  var pastureDims = { width: 0, height: 0 };
  var graphDims = { width: 0, height: 0 };
  var pastureView, graphView;
  function resizeAll() {
    if (pastureView) pastureView.resize();
    if (graphView) graphView.resize();
    drawGraph();
  }
  function updateResults() {
    var latest = history[history.length - 1];
    document.getElementById('commons-status').textContent = 'Season ' + latest.round + ': health ' + latest.health.toFixed(1) + ' of 100; your cumulative income ' + latest.wealth.f1.toFixed(1) + (latest.health === 0 ? '. Pasture collapsed; reset to try again.' : '.');
    var totalHerd = FARMERS.reduce(function (sum, f) { return sum + state.herds[f]; }, 0);
    document.getElementById('commons-season').textContent = 'Season ' + latest.round;
    document.getElementById('commons-total').textContent = totalHerd;
    var condition = state.health === 0 ? 'Pasture collapsed' : state.health < 25 ? 'Grass critically low' : state.health < 60 ? 'Grass cover thinning' : 'Abundant grass';
    if (state.health === 100) condition = 'Full grass cover';
    document.getElementById('commons-condition').textContent = condition;
    document.querySelector('.commons-scene-bar').dataset.condition = state.health === 0 ? 'collapsed' : state.health < 60 ? 'low' : 'healthy';
    pastureCanvas.setAttribute('aria-label', 'Season ' + latest.round + ': ' + totalHerd + ' numbered sheep in one shared pasture. Health ' + state.health.toFixed(1) + ' of 100. ' + condition + '.');
    var balance = document.getElementById('commons-balance');
    balance.replaceChildren();
    if (lastBalance) {
      var parts = [lastBalance.start.toFixed(1) + ' starting', '+ ' + lastBalance.regen.toFixed(1) + ' regrown', '− ' + lastBalance.consumption + ' grazed', '= ' + state.health.toFixed(1) + ' remaining'];
      parts.forEach(function (part, index) {
        if (index) balance.append(' ');
        var strong = document.createElement('strong');
        strong.textContent = part;
        balance.append(strong);
      });
      if (state.health === 0) balance.append(' (minimum 0)');
    } else balance.textContent = 'Advance a season to compare regrowth with grazing.';
    var tbody = document.getElementById('commons-results');
    tbody.replaceChildren();
    history.slice(-10).forEach(function (entry) {
      var row = tbody.insertRow();
      var total = FARMERS.reduce(function (sum, f) { return sum + entry.wealth[f]; }, 0);
      [entry.round, entry.health.toFixed(1), entry.wealth.f1.toFixed(1), total.toFixed(1)].forEach(function (value) { row.insertCell().textContent = value; });
    });
  }

  function mixColor(a, b, t) {
    return 'rgb(' + a.map(function (value, i) { return Math.round(value + (b[i] - value) * t); }).join(',') + ')';
  }

  function ellipse(ctx, x, y, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function polygon(ctx, points, color) {
    ctx.beginPath();
    points.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.closePath();
    if (color) { ctx.fillStyle = color; ctx.fill(); }
  }

  function fieldPoint(x, y) {
    // The trapezoid is a perspective view of one undivided common pasture.
    var spread = 0.68 + 0.26 * y;
    return { x: pastureDims.width * (0.5 + (x - 0.5) * spread), y: pastureDims.height * (0.32 + y * 0.55) };
  }

  function fence(ctx, from, to, count) {
    ctx.lineCap = 'round';
    [12, 23].forEach(function (height) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y - height);
      ctx.lineTo(to.x, to.y - height);
      ctx.strokeStyle = '#76644a'; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = '#e3d5ad'; ctx.lineWidth = 2; ctx.stroke();
    });
    for (var i = 0; i <= count; i++) {
      var x = from.x + (to.x - from.x) * i / count;
      var y = from.y + (to.y - from.y) * i / count;
      ellipse(ctx, x + 3, y + 2, 5, 2, 'rgba(49,60,36,.2)');
      ctx.fillStyle = '#746047'; ctx.fillRect(x - 2.5, y - 29, 5, 31);
      ctx.fillStyle = '#e5d9b8'; ctx.fillRect(x - 2.5, y - 29, 3, 29);
    }
  }

  function tree(ctx, x, y, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ellipse(ctx, 12, 4, 26, 6, 'rgba(48,69,39,.16)');
    ctx.fillStyle = '#71664d'; ctx.fillRect(-3, -42, 6, 43);
    ellipse(ctx, 0, -48, 22, 26, '#4d7450');
    ellipse(ctx, -12, -41, 15, 18, '#608555');
    ellipse(ctx, 6, -56, 17, 20, '#739657');
    ctx.restore();
  }

  function rebuildPasture() {
    var w = pastureDims.width, h = pastureDims.height;
    if (!w || !h) return;
    var dpr = pastureCanvas.width / w;
    [sceneBack, sceneFront].forEach(function (canvas) { canvas.width = pastureCanvas.width; canvas.height = pastureCanvas.height; });
    var ctx = sceneBack.getContext('2d');
    var front = sceneFront.getContext('2d');
    ctx.scale(dpr, dpr); front.scale(dpr, dpr);
    var frac = state.health / CAPACITY;
    var sky = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    sky.addColorStop(0, '#cde3ed'); sky.addColorStop(1, '#edf1d9');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // Distant landscape is context, outside the modeled grazing area.
    ellipse(ctx, w * 0.78, h * 0.12, 24, 24, '#fff6cf');
    [[0.17, 0.10, 1], [0.60, 0.15, 0.7]].forEach(function (cloud) {
      var x = w * cloud[0], y = h * cloud[1], size = cloud[2];
      ellipse(ctx, x, y, 34 * size, 8 * size, 'rgba(255,255,255,.65)');
      ellipse(ctx, x - 7 * size, y - 5 * size, 18 * size, 10 * size, 'rgba(255,255,255,.65)');
    });
    ctx.beginPath(); ctx.moveTo(0, h * 0.31);
    ctx.bezierCurveTo(w * 0.16, h * 0.06, w * 0.34, h * 0.23, w * 0.53, h * 0.28);
    ctx.bezierCurveTo(w * 0.74, h * 0.06, w * 0.85, h * 0.16, w, h * 0.29);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fillStyle = '#a6bb91'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, h * 0.31);
    ctx.bezierCurveTo(w * 0.19, h * 0.39, w * 0.31, h * 0.22, w * 0.5, h * 0.28);
    ctx.bezierCurveTo(w * 0.73, h * 0.39, w * 0.87, h * 0.23, w, h * 0.30);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fillStyle = '#91a977'; ctx.fill();
    // A path outside the fence helps the common resource read as one place.
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.9); ctx.lineTo(w * 0.5, h);
    ctx.strokeStyle = '#c9bb91'; ctx.lineWidth = Math.max(18, w * 0.035); ctx.stroke();
    var corners = [fieldPoint(0, 0), fieldPoint(1, 0), fieldPoint(1, 1), fieldPoint(0, 1)];
    polygon(ctx, corners.map(function (p) { return [p.x, p.y + 8]; }), '#756e47');
    polygon(ctx, corners.map(function (p) { return [p.x, p.y]; }), mixColor([174, 143, 101], [116, 158, 76], frac));
    ctx.save(); ctx.clip();
    // Fixed, irregular patches disappear into bare soil as grass health falls.
    for (var i = 0; i < 180; i++) {
      var u = noise(i * 2 + 1), v = noise(i * 2 + 2);
      var p = fieldPoint(u, v);
      var threshold = noise(i + 810);
      var alive = threshold < frac;
      var radius = Math.max(7, w * 0.019) * (0.65 + noise(i + 90));
      ellipse(ctx, p.x, p.y, radius, radius * 0.34, alive ? 'rgba(91,133,58,.14)' : 'rgba(137,102,67,.19)');
      if (!alive && frac < 0.4 && i % 3 === 0) {
        ctx.beginPath(); ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x, p.y + 2); ctx.lineTo(p.x + 6, p.y - 1);
        ctx.strokeStyle = 'rgba(104,78,52,.3)'; ctx.lineWidth = 0.9; ctx.stroke();
      }
    }
    for (var j = 0; j < 440; j++) {
      if (noise(j + 1000) > frac) continue;
      var grass = fieldPoint(noise(j * 2 + 2500), noise(j * 2 + 2501));
      var height = (2 + noise(j + 2000) * 5) * (0.4 + 0.6 * frac);
      ctx.beginPath();
      ctx.moveTo(grass.x - 2, grass.y - height * 0.7); ctx.lineTo(grass.x, grass.y);
      ctx.lineTo(grass.x + 1, grass.y - height); ctx.moveTo(grass.x, grass.y); ctx.lineTo(grass.x + 3, grass.y - height * 0.5);
      ctx.strokeStyle = j % 3 ? 'rgba(50,99,43,.38)' : 'rgba(209,223,138,.65)'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
    // Rear boundary and small farm buildings sit behind the sheep.
    fence(ctx, corners[0], corners[1], Math.max(7, Math.round(w / 70)));
    var barnX = w * 0.25, barnY = h * 0.265;
    var barnSize = Math.min(1, w / 640);
    ctx.save(); ctx.translate(barnX, barnY); ctx.scale(barnSize, barnSize);
    ellipse(ctx, 9, 8, 47, 7, 'rgba(55,73,39,.16)');
    ctx.fillStyle = '#a05f4c'; ctx.fillRect(-30, -31, 60, 38);
    polygon(ctx, [[-38, -30], [0, -60], [38, -30]], '#4f6765');
    ctx.fillStyle = '#e4d5b6'; ctx.fillRect(-13, -21, 26, 28);
    ctx.fillStyle = '#6f6654'; ctx.fillRect(-10, -19, 20, 26);
    ctx.strokeStyle = '#e4d5b6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-9, -18); ctx.lineTo(9, 6); ctx.moveTo(9, -18); ctx.lineTo(-9, 6); ctx.stroke();
    ctx.restore();
    tree(ctx, w * 0.82, h * 0.29, Math.min(1.1, w / 600));
    tree(ctx, w * 0.89, h * 0.30, Math.min(0.75, w / 700));
    // Foreground fencing is a separate cached layer, so sheep stay inside it.
    fence(front, corners[0], corners[3], 6);
    fence(front, corners[1], corners[2], 6);
    var leftGate = fieldPoint(0.46, 1), rightGate = fieldPoint(0.54, 1);
    fence(front, corners[3], leftGate, Math.max(4, Math.round(w / 150)));
    fence(front, rightGate, corners[2], Math.max(4, Math.round(w / 150)));
    front.strokeStyle = '#76644a'; front.lineWidth = 3;
    front.strokeRect(leftGate.x, leftGate.y - 24, rightGate.x - leftGate.x, 21);
    front.beginPath(); front.moveTo(leftGate.x, leftGate.y - 3); front.lineTo(rightGate.x, rightGate.y - 24); front.stroke();
  }

  function noise(seed) {
    var value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function drawSheep(animal, farmer, number) {
    var p = fieldPoint(0.045 + animal.x * 0.91, 0.12 + animal.y * 0.77);
    var scale = Math.max(0.84, Math.min(1.18, pastureDims.width / 850)) * (0.86 + animal.y * 0.2);
    var facing = animal.vx < 0 ? -1 : 1;
    pctx.save(); pctx.translate(p.x, p.y); pctx.scale(scale, scale);
    ellipse(pctx, 3, 7, 14, 4, 'rgba(43,60,30,.23)');
    pctx.save(); pctx.scale(facing, 1);
    pctx.fillStyle = '#464c40';
    pctx.fillRect(-7, 2, 2.5, 7); pctx.fillRect(5, 2, 2.5, 7);
    ellipse(pctx, 0, -1, 12, 8, '#d9d8c4');
    ellipse(pctx, -5, -4, 7, 6, '#fbfaec');
    ellipse(pctx, 2, -5, 8, 6, '#fbfaec');
    ellipse(pctx, 7, -1, 6, 6, '#f0efde');
    ellipse(pctx, 12, -1, 5, 6, '#4f5547');
    ellipse(pctx, 9, -6, 4, 2, '#4f5547');
    ellipse(pctx, 15, 1, 2, 3, '#3a4137');
    ellipse(pctx, 13, -3, 0.9, 0.9, '#fffcec');
    pctx.restore();
    // Number badges stay upright even when the animal changes direction.
    ellipse(pctx, -2, -3, 6.5, 6.5, COLORS[farmer]);
    pctx.fillStyle = '#fff'; pctx.textAlign = 'center'; pctx.textBaseline = 'middle';
    pctx.font = '800 10px Inter, sans-serif'; pctx.fillText(number, -2, -2.5);
    pctx.restore();
  }

  function drawPasture(dt) {
    var w = pastureDims.width, h = pastureDims.height;
    if (!w || !h || !sceneBack.width) return;
    var animals = [];
    FARMERS.forEach(function (f, index) {
      sheep[f].forEach(function (animal) {
        if (!motionPaused && !collapsed && dt) {
          animal.x += animal.vx * dt; animal.y += animal.vy * dt;
          if (animal.x < 0 || animal.x > 1) animal.vx *= -1;
          if (animal.y < 0 || animal.y > 1) animal.vy *= -1;
          animal.x = Math.max(0, Math.min(1, animal.x));
          animal.y = Math.max(0, Math.min(1, animal.y));
        }
        animals.push({ animal: animal, farmer: f, number: index + 1 });
      });
    });
    pctx.clearRect(0, 0, w, h);
    pctx.drawImage(sceneBack, 0, 0, w, h);
    animals.sort(function (a, b) { return a.animal.y - b.animal.y; });
    animals.forEach(function (entry) { drawSheep(entry.animal, entry.farmer, entry.number); });
    pctx.drawImage(sceneFront, 0, 0, w, h);
  }

  function drawGraph() {
    var w = graphDims.width, h = graphDims.height;
    if (!w || !h) return;
    var colors = SimKit.theme.colors();
    gctx.clearRect(0, 0, w, h);
    gctx.fillStyle = colors.bg; gctx.fillRect(0, 0, w, h);
    var left = 48, right = w - 18, plotWidth = right - left;
    var seasons = Math.max(10, history.length - 1);
    var maxWealth = 100;
    history.forEach(function (point) {
      FARMERS.forEach(function (f) { maxWealth = Math.max(maxWealth, point.wealth[f]); });
    });
    var magnitude = Math.pow(10, Math.floor(Math.log10(maxWealth)));
    maxWealth = Math.ceil(maxWealth / magnitude) * magnitude;
    function xFor(round) { return left + (round / seasons) * plotWidth; }
    function yFor(value, top, max) { return top + 96 - (value / max) * 96; }

    function axes(title, top, max) {
      gctx.fillStyle = colors.text; gctx.textAlign = 'left';
      gctx.font = '600 12px Inter, sans-serif'; gctx.fillText(title, 8, top - 15);
      [0, 0.5, 1].forEach(function (fraction) {
        var y = top + 96 - fraction * 96;
        gctx.globalAlpha = 0.14; gctx.strokeStyle = colors.text; gctx.lineWidth = 1;
        gctx.beginPath(); gctx.moveTo(left, y); gctx.lineTo(right, y); gctx.stroke();
        gctx.globalAlpha = 1; gctx.fillStyle = colors.text; gctx.textAlign = 'right';
        gctx.font = '11px Inter, sans-serif'; gctx.fillText(formatTick(fraction * max), left - 9, y + 4);
      });
      var ticks = w < 500 ? 2 : 5;
      for (var i = 0; i <= ticks; i++) {
        var round = Math.round(seasons * i / ticks);
        var x = xFor(round);
        gctx.textAlign = 'center'; gctx.fillStyle = colors.text;
        gctx.fillText(round, x, top + 113);
      }
      gctx.textAlign = 'right'; gctx.fillText('Season', right, top + 130);
    }

    axes('Pasture health (%)', 32, 100);
    axes('Cumulative income (model units)', 206, maxWealth);
    // Health has a fixed scale, separate from the income scale below it.
    gctx.beginPath(); gctx.moveTo(xFor(0), 128);
    history.forEach(function (point) { gctx.lineTo(xFor(point.round), yFor(point.health, 32, 100)); });
    gctx.lineTo(xFor(history.length - 1), 128); gctx.closePath();
    gctx.fillStyle = '#609a4a'; gctx.globalAlpha = 0.17; gctx.fill(); gctx.globalAlpha = 1;
    gctx.strokeStyle = '#568e42'; gctx.lineWidth = 2.5; gctx.beginPath();
    history.forEach(function (point, i) { var x = xFor(point.round), y = yFor(point.health, 32, 100); if (i) gctx.lineTo(x, y); else gctx.moveTo(x, y); });
    gctx.stroke();
    var latest = history[history.length - 1];
    ellipse(gctx, xFor(latest.round), yFor(latest.health, 32, 100), 3.5, 3.5, collapsed ? '#b13e37' : '#568e42');
    FARMERS.forEach(function (f, index) {
      gctx.strokeStyle = COLORS[f]; gctx.lineWidth = f === 'f1' ? 2.5 : 1.8;
      gctx.setLineDash(LINE_STYLES[index]); gctx.beginPath();
      history.forEach(function (point, i) { var x = xFor(point.round), y = yFor(point.wealth[f], 206, maxWealth); if (i) gctx.lineTo(x, y); else gctx.moveTo(x, y); });
      gctx.stroke(); gctx.setLineDash([]);
    });
    // The key includes both a farmer number and the line's distinct dash pattern.
    var legendY = 182;
    FARMERS.forEach(function (f, index) {
      var x = left + index * plotWidth / 5;
      gctx.strokeStyle = COLORS[f]; gctx.lineWidth = 2; gctx.setLineDash(LINE_STYLES[index]);
      gctx.beginPath(); gctx.moveTo(x, legendY); gctx.lineTo(x + 18, legendY); gctx.stroke(); gctx.setLineDash([]);
      gctx.fillStyle = colors.text; gctx.textAlign = 'left'; gctx.font = '11px Inter, sans-serif';
      gctx.fillText(index === 0 && w > 500 ? '1 You' : String(index + 1), x + 23, legendY + 4);
    });
    if (history.length === 1) {
      gctx.textAlign = 'center'; gctx.fillStyle = colors.text; gctx.font = '12px Inter, sans-serif';
      gctx.fillText(w < 450 ? 'Advance a season to begin.' : 'Advance a season to trace the outcome.', left + plotWidth / 2, 88);
    }
    if (collapsed) {
      gctx.fillStyle = colors.text; gctx.textAlign = 'right'; gctx.font = '600 11px Inter, sans-serif';
      gctx.fillText('Collapsed in season ' + latest.round, right, 20);
    }
  }

  function formatTick(value) {
    if (value >= 10000) return (value / 1000).toFixed(0) + 'k';
    if (value >= 1000) return (value / 1000).toFixed(1).replace('.0', '') + 'k';
    return String(Math.round(value));
  }

  function reset() {
    initState();
    f1Slider.value = 3;
    f1Label.textContent = '3';
    advanceBtn.disabled = false;
    advanceBtn.textContent = 'Advance One Season';
    updateHerdDisplays();
    updateHealthMeter();
    resizeAll();
    updateResults();
    rebuildPasture();
    drawPasture(0);
  }

  ruleSelect.addEventListener('change', function () {
    var quota = ruleSelect.value === 'quota';
    f1Slider.max = quota ? '3' : '10';
    document.getElementById('commons-rule-note').textContent = quota ? 'All farmers obey the quota automatically. Strategy preferences still apply within the limit; monitoring and enforcement costs are omitted.' : 'Other farmers use the strategies shown below. Your slider changes only your own herd.';
    reset();
  });
  f1Slider.addEventListener('input', function () {
    f1Label.textContent = f1Slider.value;
    herdEls.f1.textContent = f1Slider.value;
  });
  advanceBtn.addEventListener('click', advance);
  resetBtn.addEventListener('click', reset);

  initState();
  pastureView = SimKit.canvas2d(pastureCanvas, { onResize: function (ctx, w, h) { pastureDims = { width: w, height: h }; rebuildPasture(); drawPasture(0); } });
  graphView = SimKit.canvas2d(graphCanvas, { height: 356, onResize: function (ctx, w, h) { graphDims = { width: w, height: h }; drawGraph(); } });
  resizeAll();
  updateHerdDisplays();
  updateHealthMeter();
  updateResults();
  SimKit.theme.onChange(drawGraph);
  function updateMotion() {
    motionBtn.setAttribute('aria-pressed', String(motionPaused));
    motionBtn.textContent = motionPaused ? 'Animate sheep' : 'Pause sheep';
    if (animation) { if (motionPaused) animation.pause(); else animation.resume(); }
    drawPasture(0);
  }
  motionBtn.addEventListener('click', function () { motionPaused = !motionPaused; updateMotion(); });
  motionPreference.addEventListener('change', function (event) { motionPaused = event.matches; updateMotion(); });
  animation = SimKit.loop(drawPasture, { el: pastureCanvas, maxDt: 0.05 });
  updateMotion();
}());
