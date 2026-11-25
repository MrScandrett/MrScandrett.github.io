(function () {
  'use strict';

  var canvas = document.getElementById('d2-depth-canvas');
  if (!canvas || !window.SimKit) return;

  var panSlider = document.getElementById('d2-camera-pan');
  var readout = document.getElementById('d2-depth-readout');
  var autoBtn = document.getElementById('d2-autopan-btn');
  var planesBtn = document.getElementById('d2-planes-btn');
  var cues = { overlap: true, scale: true, horizon: true, haze: true, parallax: true };
  var showPlanes = false;
  var autoPan = false;
  var phase = 0;
  var ctx = null;
  var viewW = 760;
  var viewH = 270;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function draw() {
    if (!ctx || viewW < 2 || viewH < 2) return;
    var W = 760, H = 270;
    var pan = panSlider ? parseFloat(panSlider.value) || 0 : 0;

    ctx.save();
    ctx.clearRect(0, 0, viewW, viewH);
    ctx.scale(viewW / W, viewH / H);

    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#f8d6ad');
    sky.addColorStop(0.55, '#eaf1df');
    sky.addColorStop(0.56, '#9ecbd0');
    sky.addColorStop(1, '#397d91');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    function path(fill, points) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(function (point) { ctx.lineTo(point[0], point[1]); });
      ctx.closePath();
      ctx.fill();
    }
    function ellipse(x, y, rx, ry, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    function tree(x, y, size, color) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(size, size);
      ctx.fillStyle = '#544c42';
      ctx.fillRect(-3, -37, 6, 38);
      path(color, [[-22, -25], [0, -64], [22, -25], [13, -26], [25, -12], [-25, -12], [-13, -26]]);
      ctx.restore();
    }
    function boat(x, y, size, color) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(size, size);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -40); ctx.lineTo(0, 0); ctx.stroke();
      path('#f9eed9', [[-3, -37], [-3, -5], [-25, -5]]);
      path('#e3b879', [[3, -32], [3, -5], [20, -5]]);
      path(color, [[-31, 0], [31, 0], [22, 10], [-22, 10]]);
      ctx.restore();
    }
    function planeBadge(x, y, text) {
      if (!showPlanes) return;
      ctx.save();
      ctx.font = 'bold 11px system-ui, sans-serif';
      var tw = ctx.measureText(text).width;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
      ctx.fillRect(x - 6, y - 13, tw + 12, 19);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    var pFar = cues.parallax ? pan * 0.12 : pan * 0.45;
    var pMid = pan * 0.45;
    var pNear = cues.parallax ? pan * 1.1 : pan * 0.45;
    var yFar = cues.horizon ? 142 : 202;
    var yMid = cues.horizon ? 183 : 202;
    var yNear = 235;
    var sFar = cues.scale ? 0.62 : 1;
    var sMid = cues.scale ? 0.78 : 1;

    ellipse(630, 49, 26, 26, '#fbe5b5');
    ctx.strokeStyle = 'rgba(255,255,244,.35)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 7; i++) {
      var waterY = 154 + i * 16;
      ctx.beginPath();
      ctx.moveTo((i * 97) % 180, waterY);
      ctx.lineTo(760 - (i * 57) % 160, waterY);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(390 - pFar, yFar);
    ctx.scale(sFar, sFar);
    path(cues.haze ? '#9aaeb2' : '#425a62', [[-205, 0], [-125, -26], [-85, -22], [0, -120], [75, -27], [120, -36], [205, 0]]);
    path(cues.haze ? '#eef0e6' : '#fff8e8', [[-32, -82], [0, -120], [29, -83], [12, -90], [3, -82], [-9, -91]]);
    path(cues.haze ? '#a9bdb8' : '#476c66', [[-220, 0], [-180, -15], [-120, -8], [-65, -18], [0, -5], [60, -14], [120, -7], [180, -16], [220, 0]]);
    ctx.restore();
    planeBadge(390 - pFar - 45, yFar - 64 * sFar, cues.parallax ? 'Far 0.12×' : 'Far 0.45×');

    var boatX = cues.overlap ? 345 : 155;
    boat(boatX - pMid, yMid, sMid, cues.haze ? '#776e63' : '#3b3935');
    boat(540 - pFar, cues.horizon ? 160 : 202, cues.scale ? 0.43 : 1, cues.haze ? '#94a6a3' : '#3b3935');
    planeBadge(boatX - pMid - 34, yMid - 46 * sMid, 'Mid 0.45×');

    ctx.save();
    ctx.translate((cues.overlap ? 0 : 285) - pNear, yNear);
    path('#294f52', [[-170, 50], [-170, -3], [-100, -10], [-45, -2], [0, -14], [45, -4], [85, -25], [145, -15], [190, 0], [230, 35], [230, 50]]);
    path('#416e65', [[-170, 50], [-170, 11], [-90, 3], [-25, 12], [35, 0], [85, 5], [130, -7], [190, 8], [230, 35], [230, 50]]);
    path('#c9a875', [[-170, 50], [-170, 30], [-90, 23], [-15, 30], [60, 18], [120, 20], [190, 22], [230, 35], [230, 50]]);
    tree(55, 3, 1.05, '#173f3d');
    tree(115, -7, 1.35, '#1b4945');
    tree(160, 5, 0.9, '#244f49');
    ctx.restore();

    ctx.save();
    ctx.translate(-pNear, 0);
    path('#244c4a', [[-120, 270], [-120, 237], [-45, 225], [20, 235], [72, 270]]);
    tree(20, 239, 1.15, '#173e3a');
    ctx.restore();
    planeBadge((cues.overlap ? 95 : 380) - pNear, yNear - 78, cues.parallax ? 'Near 1.10×' : 'Near 0.45×');

    ctx.restore();

    if (readout) {
      var activeCount = Object.keys(cues).filter(function (k) { return cues[k]; }).length;
      readout.textContent = activeCount + ' of 5 depth cues active. Compare 0 cues (flat) against 5 cues (deep) and pan the camera.';
    }
  }

  function syncCueButtons() {
    document.querySelectorAll('[data-cue]').forEach(function (btn) {
      var k = btn.getAttribute('data-cue');
      btn.setAttribute('aria-pressed', String(Boolean(cues[k])));
    });
  }

  document.querySelectorAll('[data-cue]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var k = btn.getAttribute('data-cue');
      cues[k] = !cues[k];
      syncCueButtons();
      draw();
    });
  });

  document.querySelectorAll('[data-cue-preset]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('data-cue-preset') === 'all';
      Object.keys(cues).forEach(function (k) { cues[k] = on; });
      syncCueButtons();
      draw();
    });
  });

  if (planesBtn) {
    planesBtn.addEventListener('click', function () {
      showPlanes = !showPlanes;
      planesBtn.setAttribute('aria-pressed', String(showPlanes));
      draw();
    });
  }

  var panLoop = SimKit.loop(function (dt) {
    if (!autoPan || reducedMotion) return;
    phase += dt * 1.1;
    if (panSlider) panSlider.value = String(Math.round(Math.sin(phase) * 85));
    draw();
  }, { el: canvas, maxDt: 0.05 });
  panLoop.pause();

  if (autoBtn) {
    if (reducedMotion) autoBtn.disabled = true;
    autoBtn.addEventListener('click', function () {
      autoPan = !autoPan;
      autoBtn.setAttribute('aria-pressed', String(autoPan));
      if (autoPan) panLoop.resume();
      else panLoop.pause();
    });
  }

  if (panSlider) {
    panSlider.addEventListener('input', function () {
      if (autoPan) {
        autoPan = false;
        if (autoBtn) autoBtn.setAttribute('aria-pressed', 'false');
        panLoop.pause();
      }
      draw();
    });
  }

  SimKit.canvas2d(canvas, {
    onResize: function (c, w, h) {
      ctx = c;
      viewW = w;
      viewH = h;
      draw();
    }
  });
})();
