document.getElementById('slime-particle-lab')?.addEventListener('toggle', function initializeParticles() {
  'use strict';
  if (!this.open) return;
  this.removeEventListener('toggle', initializeParticles);

  var canvas = document.getElementById('slimeCanvas');
  var ctx = canvas.getContext('2d');
  var DISP_W = canvas.width;
  var DISP_H = canvas.height;

  var GRID_SCALE = 4;
  var GRID_W = Math.floor(DISP_W / GRID_SCALE);
  var GRID_H = Math.floor(DISP_H / GRID_SCALE);

  var trailCanvas = document.createElement('canvas');
  trailCanvas.width = GRID_W;
  trailCanvas.height = GRID_H;
  var trailCtx = trailCanvas.getContext('2d');
  var imageData = trailCtx.createImageData(GRID_W, GRID_H);

  var TRAIL_CAP = 6.0;
  var FOOD_VALUE = 6.0;
  var FOOD_RADIUS = 2;
  var SENSOR_DIST = 8;
  var TURN_ANGLE = 0.4;
  var SPEED = 1.0;
  var DEPOSIT = 0.9;

  var sensorAngle = 25 * Math.PI / 180;
  var decayFactor = 0.94;
  var running = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  var playButton = document.getElementById('playPauseBtn');
  playButton.textContent = running ? 'Pause' : 'Play';

  var trail = new Float32Array(GRID_W * GRID_H);
  var trailNext = new Float32Array(GRID_W * GRID_H);
  var agents = [];
  var foods = [];

  function wrap(v, m) {
    v = v % m;
    return v < 0 ? v + m : v;
  }

  function cellIndex(gx, gy) {
    return (wrap(Math.floor(gy), GRID_H) * GRID_W) + wrap(Math.floor(gx), GRID_W);
  }

  function makeAgent() {
    return {
      x: Math.random() * GRID_W,
      y: Math.random() * GRID_H,
      heading: Math.random() * Math.PI * 2
    };
  }

  function setPopulation(n) {
    while (agents.length < n) agents.push(makeAgent());
    while (agents.length > n) agents.pop();
  }

  setPopulation(1500);

  function sense(agent, angleOffset) {
    var a = agent.heading + angleOffset;
    var sx = agent.x + Math.cos(a) * SENSOR_DIST;
    var sy = agent.y + Math.sin(a) * SENSOR_DIST;
    return trail[cellIndex(sx, sy)];
  }

  function stepAgents() {
    for (var i = 0; i < agents.length; i++) {
      var ag = agents[i];
      var f = sense(ag, 0);
      var fl = sense(ag, -sensorAngle);
      var fr = sense(ag, sensorAngle);

      if (f > fl && f > fr) {
        // keep heading, tiny jitter
        ag.heading += (Math.random() - 0.5) * 0.15;
      } else if (f < fl && f < fr) {
        ag.heading += (Math.random() < 0.5 ? -1 : 1) * TURN_ANGLE;
      } else if (fl < fr) {
        ag.heading += TURN_ANGLE;
      } else if (fr < fl) {
        ag.heading -= TURN_ANGLE;
      }

      ag.x = wrap(ag.x + Math.cos(ag.heading) * SPEED, GRID_W);
      ag.y = wrap(ag.y + Math.sin(ag.heading) * SPEED, GRID_H);

      var idx = cellIndex(ag.x, ag.y);
      trail[idx] = Math.min(TRAIL_CAP, trail[idx] + DEPOSIT);
    }
  }

  function diffuseTrail() {
    for (var y = 0; y < GRID_H; y++) {
      var yUp = wrap(y - 1, GRID_H) * GRID_W;
      var yMid = y * GRID_W;
      var yDown = wrap(y + 1, GRID_H) * GRID_W;
      for (var x = 0; x < GRID_W; x++) {
        var xL = wrap(x - 1, GRID_W);
        var xR = wrap(x + 1, GRID_W);
        var sum =
          trail[yUp + xL] + trail[yUp + x] + trail[yUp + xR] +
          trail[yMid + xL] + trail[yMid + x] + trail[yMid + xR] +
          trail[yDown + xL] + trail[yDown + x] + trail[yDown + xR];
        trailNext[yMid + x] = (sum / 9) * decayFactor;
      }
    }
    var tmp = trail;
    trail = trailNext;
    trailNext = tmp;

    for (var fi = 0; fi < foods.length; fi++) {
      var fd = foods[fi];
      for (var dy = -FOOD_RADIUS; dy <= FOOD_RADIUS; dy++) {
        for (var dx = -FOOD_RADIUS; dx <= FOOD_RADIUS; dx++) {
          trail[cellIndex(fd.gx + dx, fd.gy + dy)] = FOOD_VALUE;
        }
      }
    }
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function trailColor(v) {
    var t = Math.max(0, Math.min(1, v / TRAIL_CAP));
    var stops = [
      [21, 15, 8],
      [92, 58, 18],
      [200, 133, 26],
      [255, 226, 140]
    ];
    var seg = t * (stops.length - 1);
    var i0 = Math.min(stops.length - 2, Math.floor(seg));
    var localT = seg - i0;
    var c0 = stops[i0], c1 = stops[i0 + 1];
    return [
      lerp(c0[0], c1[0], localT),
      lerp(c0[1], c1[1], localT),
      lerp(c0[2], c1[2], localT)
    ];
  }

  function renderTrail() {
    var data = imageData.data;
    for (var i = 0; i < GRID_W * GRID_H; i++) {
      var c = trailColor(trail[i]);
      var p = i * 4;
      data[p] = c[0];
      data[p + 1] = c[1];
      data[p + 2] = c[2];
      data[p + 3] = 255;
    }
    trailCtx.putImageData(imageData, 0, 0);

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(trailCanvas, 0, 0, GRID_W, GRID_H, 0, 0, DISP_W, DISP_H);

    for (var fi = 0; fi < foods.length; fi++) {
      var fd = foods[fi];
      var px = fd.gx * GRID_SCALE;
      var py = fd.gy * GRID_SCALE;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe58a';
      ctx.shadowColor = '#ffcf4d';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function addFood(px, py) {
    var gx = Math.floor(px / GRID_SCALE);
    var gy = Math.floor(py / GRID_SCALE);
    foods.push({ gx: gx, gy: gy });
  }

  canvas.addEventListener('click', function (e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = DISP_W / rect.width;
    var scaleY = DISP_H / rect.height;
    var px = (e.clientX - rect.left) * scaleX;
    var py = (e.clientY - rect.top) * scaleY;
    addFood(px, py);
  });

  document.getElementById('popSlider').addEventListener('input', function (e) {
    var n = parseInt(e.target.value, 10);
    document.getElementById('popVal').textContent = n;
    setPopulation(n);
  });

  document.getElementById('sensorSlider').addEventListener('input', function (e) {
    var deg = parseInt(e.target.value, 10);
    document.getElementById('sensorVal').textContent = deg + '°';
    sensorAngle = deg * Math.PI / 180;
  });

  document.getElementById('decaySlider').addEventListener('input', function (e) {
    var raw = parseInt(e.target.value, 10);
    decayFactor = raw / 100;
    document.getElementById('decayVal').textContent = decayFactor.toFixed(2);
  });

  playButton.addEventListener('click', function () {
    running = !running;
    playButton.textContent = running ? 'Pause' : 'Play';
    if (running) loop.resume();
    else loop.pause();
  });

  document.getElementById('scatterFoodBtn').addEventListener('click', function () {
    var count = 3 + Math.floor(Math.random() * 4);
    for (var i = 0; i < count; i++) {
      addFood(
        DISP_W * (0.1 + Math.random() * 0.8),
        DISP_H * (0.1 + Math.random() * 0.8)
      );
    }
  });

  document.getElementById('railPresetBtn').addEventListener('click', function () {
    foods = [];
    var cx = DISP_W * 0.5, cy = DISP_H * 0.52;
    addFood(cx, cy); // Tokyo hub
    var satellites = [
      [0.02, -0.05], [0.05, 0.32], [-0.28, 0.18], [0.30, 0.22],
      [-0.20, -0.30], [0.24, -0.28], [-0.36, -0.05], [0.38, 0.02],
      [-0.08, 0.42], [0.14, -0.42]
    ];
    for (var i = 0; i < satellites.length; i++) {
      addFood(cx + satellites[i][0] * DISP_W, cy + satellites[i][1] * DISP_H);
    }
  });

  document.getElementById('clearFoodBtn').addEventListener('click', function () {
    foods = [];
  });

  document.getElementById('resetSimBtn').addEventListener('click', function () {
    trail.fill(0);
    trailNext.fill(0);
    foods = [];
    var n = agents.length;
    agents = [];
    setPopulation(n);
    renderTrail();
    if (!running && !matchMedia('(prefers-reduced-motion: reduce)').matches) playButton.click();
  });

  renderTrail();
  var loop = SimKit.loop(function () {
    stepAgents();
    diffuseTrail();
    renderTrail();
  }, { el: canvas });
  if (!running) loop.pause();
});
