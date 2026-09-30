/* Shared by the Zen for TV and Décollage sims: small test-pattern painter. */
(function () {
  if (!window.SimKit) return;

  var W = 240, H = 180;
  var BARS = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];

  function paint(ctx, mode, t) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (mode === 'lines') {
      ctx.fillStyle = '#d6f5ff';
      for (var y = 2; y < H; y += 6) ctx.fillRect(0, y, W, 2);
      ctx.fillStyle = '#7dd3fc';
      for (var x = 4; x < W; x += 24) ctx.fillRect(x, 0, 1, H);
    } else if (mode === 'bars') {
      var bw = W / BARS.length;
      for (var i = 0; i < BARS.length; i++) {
        ctx.fillStyle = BARS[i];
        ctx.fillRect(Math.floor(i * bw), 0, Math.ceil(bw), H * 0.68);
      }
      for (var j = 0; j < 8; j++) {
        var v = Math.round(255 * j / 7);
        ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
        ctx.fillRect(Math.floor(j * W / 8), H * 0.68, Math.ceil(W / 8), H * 0.14);
      }
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PAIK TV', W / 2, H * 0.95);
    } else {
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 70, 0, Math.PI * 2); ctx.fill();
      var blink = (t % 3) < 0.12 ? 1 : 10;
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(W / 2 - 25, H / 2 - 18, 9, blink, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(W / 2 + 25, H / 2 - 18, 9, blink, 0, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 6; ctx.strokeStyle = '#111';
      ctx.beginPath(); ctx.arc(W / 2, H / 2 + 4, 36, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
  }

  function makeBuf() {
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    return c;
  }

  function glare(ctx, cw, ch) {
    var g = ctx.createRadialGradient(cw * 0.3, ch * 0.2, 0, cw * 0.3, ch * 0.2, cw * 0.7);
    g.addColorStop(0, 'rgba(255,255,255,0.10)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
  }

  /* ── Zen for TV ─────────────────────────────────────────────────
     Sideways sweep s (0..1) squeezes every row toward the center
     column. At s→0 each row collapses to its average color, and the
     same beam energy lands on a thinner strip, so it glows harder.
     Downward sweep off: every row lands on the same row → one dot. */
  (function () {
    var canvas = document.getElementById('njp-zen-canvas');
    if (!canvas) return;
    var view = SimKit.canvas2d(canvas, { box: document.getElementById('njp-zen-screen') });
    var hEl = document.getElementById('njp-zen-h');
    var vEl = document.getElementById('njp-zen-v');
    var srcEl = document.getElementById('njp-zen-source');
    var readout = document.getElementById('njp-zen-readout');
    var src = makeBuf(), sctx = src.getContext('2d', { willReadFrequently: true });
    var avg = makeBuf(), actx = avg.getContext('2d');
    var t = 0, lastText = '';

    function describe(s, vOn) {
      var pct = Math.round(s * 100);
      if (!vOn) return 'Downward sweep off: the beam stops moving down the screen, so you get a dot.';
      if (s === 0) return 'Sideways sweep 0%: every row lands on the same spot, a single vertical line.';
      if (s < 0.25) return 'Sideways sweep ' + pct + '%: the picture is a thin, blurry sliver.';
      if (s === 1) return 'Sideways sweep 100%: a normal picture.';
      return 'Sideways sweep ' + pct + '%: the picture is squeezed toward the middle.';
    }

    function frame(dt) {
      t += Math.min(dt, 0.1);
      var s = +hEl.value / 100, vOn = vEl.checked;
      paint(sctx, srcEl.value, t);
      var cw = view.width, ch = view.height, ctx = view.ctx;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, cw, ch);
      var text = describe(s, vOn);
      if (text !== lastText) { readout.textContent = text; lastText = text; }

      // Per-row average color (what a fully squeezed row looks like).
      var data = sctx.getImageData(0, 0, W, H).data;
      actx.clearRect(0, 0, W, H);
      for (var y = 0; y < H; y++) {
        var r = 0, g = 0, b = 0;
        for (var x = 0; x < W; x++) { var k = (y * W + x) * 4; r += data[k]; g += data[k + 1]; b += data[k + 2]; }
        actx.fillStyle = 'rgb(' + Math.round(r / W) + ',' + Math.round(g / W) + ',' + Math.round(b / W) + ')';
        actx.fillRect(0, y, W, 1);
      }

      var bandW = Math.max(3, s * cw);
      var x0 = (cw - bandW) / 2;
      var wobble = Math.sin(t * 40) * 0.6 * (1 - s);
      ctx.imageSmoothingEnabled = true;

      if (vOn) {
        // Squeezed picture: blend from true picture (s=1) toward row averages (s→0).
        ctx.globalAlpha = Math.min(1, s * 2.2);
        ctx.drawImage(src, 0, 0, W, H, x0, 0, bandW, ch);
        ctx.globalAlpha = Math.max(0, 1 - s * 1.6);
        ctx.drawImage(avg, 0, 0, 1, H, x0 + wobble, 0, bandW, ch);
        ctx.globalAlpha = 1;
        // Energy piles into a thinner strip: add glow as the band narrows.
        var boost = Math.min(1, (1 - s) * 1.2);
        if (boost > 0.02) {
          var cx = cw / 2 + wobble;
          var gl = ctx.createLinearGradient(cx - 18, 0, cx + 18, 0);
          gl.addColorStop(0, 'rgba(255,255,255,0)');
          gl.addColorStop(0.5, 'rgba(255,255,255,' + (0.55 * boost) + ')');
          gl.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gl;
          ctx.fillRect(cx - 18, 0, 36, ch);
          ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * boost) + ')';
          ctx.fillRect(cx - 1.5, 0, 3, ch);
        }
      } else {
        // One dot: the whole beam parked at the center.
        var dx = cw / 2, dy = ch / 2;
        var rg = ctx.createRadialGradient(dx, dy, 0, dx, dy, 26);
        rg.addColorStop(0, 'rgba(255,255,255,1)');
        rg.addColorStop(0.15, 'rgba(255,255,255,0.85)');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(dx - 26, dy - 26, 52, 52);
      }
      glare(ctx, cw, ch);
    }
    SimKit.loop(frame);
  })();

  /* ── Décollage ──────────────────────────────────────────────────
     Top picture sits over a hidden picture. Dragging erases a mask
     (peeling). The composite is then torn by signal faults: per-row
     sideways shifts, vertical roll, and RGB channel drift. */
  (function () {
    var canvas = document.getElementById('njp-dec-canvas');
    if (!canvas) return;
    var view = SimKit.canvas2d(canvas, { box: document.getElementById('njp-dec-screen') });
    var brushEl = document.getElementById('njp-dec-brush');
    var scrEl = document.getElementById('njp-dec-scramble');
    var resetBtn = document.getElementById('njp-dec-reset');

    var top = makeBuf(), tctx = top.getContext('2d', { willReadFrequently: true });
    var under = makeBuf(), uctx = under.getContext('2d', { willReadFrequently: true });
    var out = makeBuf(), octx = out.getContext('2d');
    var outImg = octx.createImageData(W, H);
    var mask = new Uint8Array(W * H); // 1 = peeled
    var cursor = { x: W * 0.5, y: H * 0.5 };
    var t = 0;

    function prep() {
      paint(tctx, 'bars', 0);
      paint(uctx, 'face', 0);
    }
    prep();

    function peelAt(px, py) {
      var r = +brushEl.value / 240 * W * 0.5;
      var r2 = r * r;
      var x0 = Math.max(0, Math.floor(px - r - 3)), x1 = Math.min(W - 1, Math.ceil(px + r + 3));
      var y0 = Math.max(0, Math.floor(py - r - 3)), y1 = Math.min(H - 1, Math.ceil(py + r + 3));
      for (var y = y0; y <= y1; y++) {
        for (var x = x0; x <= x1; x++) {
          var dx = x - px, dy = y - py;
          // Ragged edge: the radius is jittered by position so the tear is torn, not cut.
          var jitter = 1 + 0.35 * Math.sin(x * 0.9 + y * 1.3) * Math.cos(y * 0.7 - x * 0.4);
          if (dx * dx + dy * dy <= r2 * jitter * jitter) mask[y * W + x] = 1;
        }
      }
    }

    function render() {
      var a = tctx.getImageData(0, 0, W, H).data;
      var b = uctx.getImageData(0, 0, W, H).data;
      var sc = +scrEl.value / 100;
      var o = outImg.data;
      var roll = sc > 0.3 ? Math.floor(((t * 30 * sc) % H)) * (sc > 0.6 ? 1 : 0) : 0;
      var split = Math.round(sc * 8);
      var tearBase = sc * 40;
      var rowShift = new Int16Array(H);
      var bandShift = 0;
      for (var y = 0; y < H; y++) {
        if (y % 12 === 0) bandShift = (Math.random() < sc * 0.55) ? (Math.random() - 0.5) * tearBase * 2 : 0;
        rowShift[y] = Math.round(bandShift + (Math.random() - 0.5) * sc * 6);
      }
      for (var y2 = 0; y2 < H; y2++) {
        var sy = (y2 + roll) % H;
        var shift = rowShift[y2];
        var line = y2 & 1 ? 0.75 : 1;
        for (var x = 0; x < W; x++) {
          var k = (y2 * W + x) * 4;
          for (var ch = 0; ch < 3; ch++) {
            var sx = x - shift + (ch === 0 ? -split : ch === 2 ? split : 0);
            sx = ((sx % W) + W) % W;
            var mi = sy * W + sx;
            var s = mi * 4 + ch;
            o[k + ch] = (mask[mi] ? b[s] : a[s]) * line;
          }
          // Static flecks grow with scramble.
          if (sc > 0 && Math.random() < sc * 0.02) {
            var n = 120 + Math.random() * 135;
            o[k] = o[k + 1] = o[k + 2] = n;
          }
          o[k + 3] = 255;
        }
      }
      octx.putImageData(outImg, 0, 0);
    }

    function frame(dt) {
      t += Math.min(dt, 0.1);
      render();
      var cw = view.width, ch = view.height, ctx = view.ctx;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(out, 0, 0, cw, ch);
      glare(ctx, cw, ch);
      // Peel cursor ring
      var r = +brushEl.value / 240 * cw * 0.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(cursor.x / W * cw, cursor.y / H * ch, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function toBuf(e) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(W, (e.clientX - rect.left) / rect.width * W)),
        y: Math.max(0, Math.min(H, (e.clientY - rect.top) / rect.height * H))
      };
    }
    var dragging = false, last = null;
    function peelTo(p) {
      if (last) {
        var steps = Math.max(1, Math.ceil(Math.hypot(p.x - last.x, p.y - last.y) / 3));
        for (var i = 1; i <= steps; i++) peelAt(last.x + (p.x - last.x) * i / steps, last.y + (p.y - last.y) * i / steps);
      } else peelAt(p.x, p.y);
      last = p;
    }
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; last = null;
      canvas.setPointerCapture(e.pointerId);
      var p = toBuf(e); cursor = p; peelTo(p);
    });
    canvas.addEventListener('pointermove', function (e) {
      var p = toBuf(e); cursor = p;
      if (dragging) peelTo(p);
    });
    function end() { dragging = false; last = null; }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    canvas.tabIndex = 0;
    canvas.addEventListener('keydown', function (e) {
      var step = 8;
      var moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      var m = moves[e.key];
      if (!m) return;
      e.preventDefault();
      cursor = {
        x: Math.max(0, Math.min(W, cursor.x + m[0])),
        y: Math.max(0, Math.min(H, cursor.y + m[1]))
      };
      if (e.shiftKey) peelAt(cursor.x, cursor.y);
    });
    resetBtn.addEventListener('click', function () { mask.fill(0); });

    SimKit.loop(frame);
  })();
})();
