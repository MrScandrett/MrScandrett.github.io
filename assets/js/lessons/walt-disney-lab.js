/* Walt Disney lesson: Animation Lab.
   1. Timing: one bouncing ball, drawn at a chosen number of drawings per second,
      with gravity or even spacing, squash & stretch, a spacing chart (every drawing
      in the cycle), and a strip showing how drawings fill a 24 fps projector's frames.
   2. Multiplane camera: four painted layers at different distances. Trucking or
      dollying the camera moves each layer by F/(d - z), so near art slides and grows
      faster than far art. "Flat" puts every layer on one plane for comparison.
   Needs sim-kit.js. */
(function () {
  'use strict';
  if (!window.SimKit) return;

  var colors = SimKit.theme.colors();
  SimKit.theme.onChange(function (c) { colors = c; });

  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function loadImage(src, onload) {
    var img = new Image();
    img.decoding = 'async';
    img.addEventListener('load', onload);
    img.src = src;
    return img;
  }

  /* ── 1. Frame rate & timing ─────────────────────────────────────── */
  var animCanvas = document.getElementById('wd-anim');
  if (animCanvas) initTiming(animCanvas);

  function initTiming(canvas) {
    var RATES = [2, 4, 6, 8, 12, 24, 60];
    var RATE_NOTES = {
      2: 'a slideshow, not motion',
      4: 'jerky: the eye sees separate pictures',
      6: 'still choppy',
      8: 'limited animation; motion starts to read',
      12: '“on twos”: each drawing held for 2 film frames',
      24: '“on ones”: a new drawing every film frame',
      60: 'video-game smooth; film never needed this many'
    };
    var CYCLE = 2;            // seconds: two bounces across the stage
    var BOUNCE = 1;           // seconds per bounce
    var rate = document.getElementById('wd-dps');
    var rateOut = document.getElementById('wd-dps-out');
    var squash = document.getElementById('wd-squash');
    var onion = document.getElementById('wd-onion');
    var playBtn = document.getElementById('wd-play');
    var prevBtn = document.getElementById('wd-prev');
    var nextBtn = document.getElementById('wd-next');
    var readout = document.getElementById('wd-anim-readout');
    var spacingInputs = document.querySelectorAll('input[name="wd-spacing"]');

    var view = null;
    view = SimKit.canvas2d(canvas, { height: 280, onResize: function () { if (view) render(); } });
    var ballArt = loadImage('../../assets/images/lessons/walt-disney/bouncing-ball-character.png', render);
    var t = 0;
    var playing = !prefersReducedMotion();

    function dps() { return RATES[+rate.value] || 12; }
    function spacing() {
      for (var i = 0; i < spacingInputs.length; i++) if (spacingInputs[i].checked) return spacingInputs[i].value;
      return 'gravity';
    }

    // Ball state for a moment in the cycle (time already quantized to a drawing).
    function ballAt(time, W, H) {
      var floorY = H - 70;
      var lift = Math.min(150, H - 120);
      var left = 40, right = W - 40;
      var u = (time % BOUNCE) / BOUNCE;
      var h, speed;
      if (spacing() === 'even') {
        h = 1 - Math.abs(2 * u - 1);
        speed = 2;
      } else {
        h = 4 * u * (1 - u);
        speed = Math.abs(4 - 8 * u);
      }
      return {
        x: left + (right - left) * ((time % CYCLE) / CYCLE),
        y: floorY - h * lift,
        h: h,
        speed: speed,
        rising: u < 0.5,
        floorY: floorY
      };
    }

    function drawBall(ctx, b, r, alpha, fill) {
      var sx = 1, sy = 1;
      if (squash.checked) {
        if (b.h < 0.03) { sx = 1.4; sy = 0.62; }
        else { var s = 1 + 0.32 * Math.min(1, b.speed / 4); sx = 1 / Math.sqrt(s); sy = s; }
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      // Squash sits on the floor; stretch stays centred on the path.
      var cy = b.h < 0.03 && squash.checked ? b.floorY - r * sy : b.y - r;
      ctx.translate(b.x, cy);
      ctx.scale(sx, sy);
      if (ballArt.complete && ballArt.naturalWidth) {
        ctx.drawImage(ballArt, -r * 1.36, -r * 1.15, r * 2.72, r * 2.3);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = 2 / Math.max(sx, sy);
        ctx.strokeStyle = colors.text;
        ctx.stroke();
      }
      ctx.restore();
    }

    function render() {
      var ctx = view.ctx, W = view.width, H = view.height;
      var n = dps();
      var drawing = Math.floor(t * n + 1e-6);
      var perCycle = Math.round(CYCLE * n);
      var tq = drawing / n;
      var r = 18;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = colors.cardBg;
      ctx.fillRect(0, 0, W, H);

      var floorY = H - 70;
      ctx.strokeStyle = colors.textMuted;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(20, floorY); ctx.lineTo(W - 20, floorY); ctx.stroke();

      if (onion.checked) {
        for (var k = 0; k < perCycle; k++) {
          drawBall(ctx, ballAt(k / n, W, H), r, 0.16, colors.accent);
        }
      }
      // Keep the posed height and squash on the selected drawing, but let the
      // character travel smoothly across the stage. This preserves the timing
      // lesson without making the detailed face appear to jitter sideways.
      var currentBall = ballAt(tq, W, H);
      currentBall.x = ballAt(t, W, H).x;
      drawBall(ctx, currentBall, r, 1, '#e0442f');

      // Projector strip: one second of 24 fps film frames, coloured by which drawing fills each.
      var stripY = H - 44, cellW = Math.min(24, (W - 40) / 24), x0 = (W - cellW * 24) / 2;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textBaseline = 'alphabetic';
      if (n <= 24) {
        var sec = t % 1;
        var nowFrame = Math.floor(sec * 24);
        for (var f = 0; f < 24; f++) {
          var d = Math.floor(f / 24 * n + 1e-6);
          ctx.fillStyle = d % 2 ? 'rgba(224,68,47,0.55)' : 'rgba(224,68,47,0.25)';
          ctx.fillRect(x0 + f * cellW + 1, stripY, cellW - 2, 18);
          if (f === nowFrame) {
            ctx.strokeStyle = colors.text;
            ctx.lineWidth = 2;
            ctx.strokeRect(x0 + f * cellW, stripY - 1, cellW, 20);
          }
        }
        ctx.fillStyle = colors.textMuted;
        ctx.textAlign = 'center';
        ctx.fillText('One second of film = 24 frames. Same shade = the same drawing held.', W / 2, H - 10);
      } else {
        ctx.fillStyle = colors.textMuted;
        ctx.textAlign = 'center';
        ctx.fillText('60 new images a second: faster than a 24 fps film projector can show.', W / 2, H - 22);
      }

      ctx.textAlign = 'left';
      ctx.fillStyle = colors.text;
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText('Drawing ' + ((drawing % perCycle) + 1) + ' of ' + perCycle, 16, 22);
    }

    function updateReadout() {
      var n = dps();
      rateOut.textContent = n + ' — ' + RATE_NOTES[n];
      var shortSec = 7 * 60, featureSec = 83 * 60;
      readout.textContent = 'This 2-second bounce needs ' + fmt(CYCLE * n) + ' drawings. At ' + n +
        ' drawings a second, a 7-minute cartoon short needs about ' + fmt(shortSec * n) +
        ' and Snow White’s 83 minutes needs about ' + fmt(featureSec * n) + '.';
    }

    function step(dir) {
      playing = false;
      playBtn.textContent = 'Play';
      var n = dps();
      var d = Math.floor(t * n + 1e-6) + dir;
      t = ((d / n) % CYCLE + CYCLE) % CYCLE;
      render();
    }

    rate.addEventListener('input', function () { updateReadout(); render(); });
    [squash, onion].forEach(function (el) { el.addEventListener('change', render); });
    Array.prototype.forEach.call(spacingInputs, function (el) { el.addEventListener('change', render); });
    playBtn.addEventListener('click', function () {
      playing = !playing;
      playBtn.textContent = playing ? 'Pause' : 'Play';
    });
    prevBtn.addEventListener('click', function () { step(-1); });
    nextBtn.addEventListener('click', function () { step(1); });
    playBtn.textContent = playing ? 'Pause' : 'Play';

    updateReadout();
    render();
    SimKit.loop(function (dt) {
      if (!playing) return;
      t = (t + Math.min(dt, 0.1)) % CYCLE;
      render();
    });
    SimKit.theme.onChange(render);
  }

  /* ── 2. Multiplane camera ───────────────────────────────────────── */
  var mpCanvas = document.getElementById('wd-mp');
  if (mpCanvas) initMultiplane(mpCanvas, document.getElementById('wd-mp-side'));

  function initMultiplane(canvas, sideCanvas) {
    var LAYERS = [
      { key: 'sky', name: 'Sky', d: 60, color: '#6d8fd8' },
      { key: 'hills', name: 'Mountains', d: 36, color: '#8a6cc4' },
      { key: 'castle', name: 'Village hill', d: 20, color: '#2f7d5b' },
      { key: 'branches', name: 'Foreground trees', d: 9, color: '#a0522d' }
    ];
    var FLAT_D = 20;
    var truck = document.getElementById('wd-truck');
    var dolly = document.getElementById('wd-dolly');
    var playBtn = document.getElementById('wd-mp-play');
    var readout = document.getElementById('wd-mp-readout');
    var modeInputs = document.querySelectorAll('input[name="wd-mode"]');

    var view = null, side = null;
    view = SimKit.canvas2d(canvas, { height: 300, onResize: function () { if (view) render(); } });
    side = sideCanvas ? SimKit.canvas2d(sideCanvas, { height: 300, onResize: function () { if (side) renderSide(); } }) : null;
    var tween = null;
    var layerImages = {
      sky: loadImage('../../assets/images/lessons/walt-disney/multiplane-sky.png', render),
      hills: loadImage('../../assets/images/lessons/walt-disney/multiplane-mountains.png', render),
      castle: loadImage('../../assets/images/lessons/walt-disney/multiplane-village.png', render),
      branches: loadImage('../../assets/images/lessons/walt-disney/multiplane-foreground.png', render)
    };

    function flat() {
      for (var i = 0; i < modeInputs.length; i++) if (modeInputs[i].checked) return modeInputs[i].value === 'flat';
      return false;
    }
    function camX() { return +truck.value / 25; }   // -4 … 4 units
    function camZ() { return +dolly.value / 100 * 6; } // 0 … 6 units toward the art
    function focal(W) { return W * 0.9; }
    function layerD(L) { return flat() ? FLAT_D : L.d; }
    function offset(L, W) { return camX() * focal(W) / (layerD(L) - camZ()); }
    function scale(L) { return layerD(L) / (layerD(L) - camZ()); }

    /* Layer art, authored in pixels as the starting camera sees it. */
    function wave(x, a, b, c) { return Math.sin(x * a) * 0.5 + Math.sin(x * b + 1.3) * 0.3 + Math.sin(x * c + 2.1) * 0.2; }

    function drawPanorama(ctx, img, W, H) {
      // Generated paintings are 3:1 panoramas. Size from height so their
      // painted circles, cottages, trees and mountains retain their proportions,
      // then repeat beyond both edges to provide scenery for a camera truck.
      var ratio = img.naturalWidth / img.naturalHeight;
      var drawH = H;
      var drawW = drawH * ratio;
      var origin = (W - drawW) / 2;
      for (var tile = -3; tile <= 3; tile++) {
        var x = origin + tile * drawW;
        if (Math.abs(tile) % 2) {
          // Reflect alternate copies so adjoining pixels meet at the same edge.
          ctx.save();
          ctx.translate(x + drawW, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, drawW, drawH);
          ctx.restore();
        } else {
          ctx.drawImage(img, x, 0, drawW, drawH);
        }
      }
    }

    var ART = {
      sky: function (ctx, W, H) {
        if (layerImages.sky.complete && layerImages.sky.naturalWidth) {
          drawPanorama(ctx, layerImages.sky, W, H);
          return;
        }
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#1b2350'); g.addColorStop(0.6, '#5b4b8a'); g.addColorStop(1, '#e79a6b');
        ctx.fillStyle = g;
        ctx.fillRect(-W, -H, W * 3, H * 3);
        ctx.fillStyle = '#fff6d5';
        ctx.beginPath(); ctx.arc(W * 0.72, H * 0.22, H * 0.07, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (var i = 0; i < 60; i++) {
          var sx = (i * 97.3 % 3) * W - W, sy = (i * 53.7 % 1) * H * 0.45;
          ctx.fillRect(sx, sy, 1.6, 1.6);
        }
      },
      hills: function (ctx, W, H) {
        if (layerImages.hills.complete && layerImages.hills.naturalWidth) {
          drawPanorama(ctx, layerImages.hills, W, H);
          return;
        }
        ctx.fillStyle = '#4a3f78';
        ctx.beginPath();
        ctx.moveTo(-W, H);
        for (var x = -W; x <= 2 * W; x += 8) ctx.lineTo(x, H * 0.52 - wave(x / W, 7, 13, 29) * H * 0.12);
        ctx.lineTo(2 * W, H); ctx.closePath(); ctx.fill();
      },
      castle: function (ctx, W, H) {
        if (layerImages.castle.complete && layerImages.castle.naturalWidth) {
          drawPanorama(ctx, layerImages.castle, W, H);
          return;
        }
        ctx.fillStyle = '#23463a';
        ctx.beginPath();
        ctx.moveTo(-W, H);
        for (var x = -W; x <= 2 * W; x += 8) ctx.lineTo(x, H * 0.7 - Math.exp(-Math.pow((x - W * 0.42) / (W * 0.18), 2)) * H * 0.16 - wave(x / W, 5, 11, 23) * H * 0.03);
        ctx.lineTo(2 * W, H); ctx.closePath(); ctx.fill();
        // castle on the hilltop
        var cx = W * 0.42, base = H * 0.55;
        ctx.fillStyle = '#d9cbe8';
        ctx.fillRect(cx - 36, base - 34, 72, 34);
        [-36, -10, 16].forEach(function (dx, i) {
          var tw = i === 1 ? 20 : 14, th = i === 1 ? 70 : 52;
          ctx.fillRect(cx + dx + (i === 1 ? 0 : 3), base - th, tw, th);
          ctx.beginPath();
          ctx.moveTo(cx + dx + (i === 1 ? -3 : 1), base - th);
          ctx.lineTo(cx + dx + (i === 1 ? 10 : 10), base - th - 22);
          ctx.lineTo(cx + dx + (i === 1 ? 23 : 19), base - th);
          ctx.closePath();
          ctx.fillStyle = '#7b4fa8'; ctx.fill(); ctx.fillStyle = '#d9cbe8';
        });
        // a few round trees
        ctx.fillStyle = '#1c3a30';
        for (var t = 0; t < 9; t++) {
          var tx = -W * 0.4 + t * W * 0.33, ty = H * 0.7 - 6;
          ctx.beginPath(); ctx.arc(tx, ty, 20 + (t % 3) * 6, 0, Math.PI * 2); ctx.fill();
        }
      },
      branches: function (ctx, W, H) {
        if (layerImages.branches.complete && layerImages.branches.naturalWidth) {
          drawPanorama(ctx, layerImages.branches, W, H);
          return;
        }
        ctx.fillStyle = '#120d0a';
        // trunks framing the shot, plus a few beyond each edge for trucking
        [-0.55, -0.12, 0.06, 0.93, 1.12, 1.5].forEach(function (p, i) {
          var x = W * p, w = 28 + (i % 2) * 18;
          ctx.fillRect(x - w / 2, -H, w, H * 2);
          ctx.beginPath();
          ctx.moveTo(x, H * 0.18 + i * 9);
          ctx.quadraticCurveTo(x + (p < 0.5 ? 1 : -1) * W * 0.16, H * 0.1, x + (p < 0.5 ? 1 : -1) * W * 0.26, H * 0.22);
          ctx.lineWidth = 9; ctx.strokeStyle = '#120d0a'; ctx.stroke();
        });
        // grass along the bottom
        ctx.beginPath();
        ctx.moveTo(-W, H * 2);
        for (var x = -W; x <= 2 * W; x += 6) ctx.lineTo(x, H * 0.9 - Math.abs(Math.sin(x * 0.21)) * H * 0.07);
        ctx.lineTo(2 * W, H * 2); ctx.closePath(); ctx.fill();
      }
    };

    function render() {
      var ctx = view.ctx, W = view.width, H = view.height;
      ctx.clearRect(0, 0, W, H);
      LAYERS.forEach(function (L) {
        ctx.save();
        ctx.translate(W / 2 - offset(L, W), H / 2);
        ctx.scale(scale(L), scale(L));
        ctx.translate(-W / 2, -H / 2);
        ART[L.key](ctx, W, H);
        ctx.restore();
      });
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(10, 10, 168, 24);
      ctx.fillStyle = '#fff';
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(flat() ? 'Flat: one sheet of art' : 'Multiplane: 4 layers', 18, 22);
      renderSide();
      updateReadout(W);
    }

    // The real camera looked straight down through stacked glass, so draw it vertically.
    function renderSide() {
      if (!side) return;
      var ctx = side.ctx, W = side.width, H = side.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = colors.cardBg;
      ctx.fillRect(0, 0, W, H);
      var top = 40, bottom = H - 26, span = bottom - top;
      function yFor(d) { return top + d / 64 * span; }
      var camYd = camZ();
      var camPx = W / 2 + camX() * 9;
      var camPy = yFor(camYd) - 8;
      // field of view lines
      ctx.strokeStyle = colors.textMuted;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(camPx, camPy); ctx.lineTo(camPx - (bottom - camPy) * 0.5, bottom);
      ctx.moveTo(camPx, camPy); ctx.lineTo(camPx + (bottom - camPy) * 0.5, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '11px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      LAYERS.slice().reverse().forEach(function (L) {
        var y = yFor(layerD(L));
        ctx.strokeStyle = L.color;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(W - 14, y); ctx.stroke();
        if (!flat()) {
          ctx.fillStyle = colors.text;
          ctx.textAlign = 'left';
          ctx.fillText(L.name, 16, y - 9);
        }
      });
      if (flat()) {
        ctx.fillStyle = colors.text;
        ctx.textAlign = 'left';
        ctx.fillText('All art on one plane', 16, yFor(FLAT_D) - 9);
      }
      // camera body
      ctx.fillStyle = colors.text;
      ctx.fillRect(camPx - 13, camPy - 22, 26, 16);
      ctx.beginPath(); ctx.moveTo(camPx - 6, camPy - 6); ctx.lineTo(camPx + 6, camPy - 6); ctx.lineTo(camPx, camPy); ctx.closePath(); ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = colors.textMuted;
      ctx.fillText('Side view: camera looks down', W / 2, H - 10);
    }

    function updateReadout(W) {
      var x = camX(), z = camZ();
      var moves = LAYERS.map(function (L) { return Math.abs(offset(L, W)); });
      var parts = [];
      if (Math.abs(x) < 0.05 && z < 0.05) {
        readout.textContent = 'Move the camera sideways (truck) or toward the art (dolly) and compare how far each layer travels.';
        return;
      }
      if (flat()) {
        readout.textContent = 'Every part of the picture slid ' + Math.round(moves[0]) + ' px and grew ' +
          scale(LAYERS[0]).toFixed(2) + '×. With no parallax, it reads as one flat painting.';
        return;
      }
      if (Math.abs(x) >= 0.05) {
        LAYERS.slice().reverse().forEach(function (L, i) {
          parts.push(L.name.toLowerCase() + ' ' + Math.round(moves[LAYERS.length - 1 - i]) + ' px');
        });
        readout.textContent = 'Sideways move: ' + parts.join(', ') + '. The nearest layer travels ' +
          (moves[3] / moves[0]).toFixed(1) + '× as far as the sky at this camera depth.';
      } else {
        readout.textContent = 'Dolly in: foreground trees grow ' + scale(LAYERS[3]).toFixed(2) + '×, the village ' +
          scale(LAYERS[2]).toFixed(2) + '×, the sky only ' + scale(LAYERS[0]).toFixed(2) + '×. Near things rush past; far things barely change.';
      }
    }

    function stopTween() { if (tween) { tween.stop(); tween = null; playBtn.textContent = 'Play a camera move'; } }

    truck.addEventListener('input', function () { stopTween(); render(); });
    dolly.addEventListener('input', function () { stopTween(); render(); });
    Array.prototype.forEach.call(modeInputs, function (el) { el.addEventListener('change', render); });
    document.getElementById('wd-mp-reset').addEventListener('click', function () {
      stopTween(); truck.value = 0; dolly.value = 0; render();
    });
    playBtn.addEventListener('click', function () {
      if (tween) { stopTween(); return; }
      if (prefersReducedMotion()) { truck.value = 75; dolly.value = 60; render(); return; }
      var elapsed = 0, DUR = 6;
      playBtn.textContent = 'Stop';
      tween = SimKit.loop(function (dt) {
        elapsed = Math.min(DUR, elapsed + dt);
        var p = elapsed / DUR, e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        truck.value = Math.round(-75 + 150 * e);
        dolly.value = Math.round(70 * e);
        render();
        if (elapsed >= DUR) stopTween();
      });
    });

    render();
    SimKit.theme.onChange(renderSide);
  }
})();
