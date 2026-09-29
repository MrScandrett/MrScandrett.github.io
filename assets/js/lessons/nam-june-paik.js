/* Magnet TV: a picture is drawn into a low-res buffer, then each pixel is
   resampled from a position twisted around the magnet — the sideways
   (Lorentz) push on the electron beam turns into a swirl that is strongest
   near the magnet and fades with distance. */
(function () {
  var canvas = document.getElementById('njp-canvas');
  if (!canvas || !window.SimKit) return;

  var W = 240, H = 180;
  var src = document.createElement('canvas');
  src.width = W; src.height = H;
  var sctx = src.getContext('2d', { willReadFrequently: true });
  var out = document.createElement('canvas');
  out.width = W; out.height = H;
  var octx = out.getContext('2d');
  var outImg = octx.createImageData(W, H);

  var view = SimKit.canvas2d(canvas, { box: document.getElementById('njp-screen') });
  var strengthEl = document.getElementById('njp-strength');
  var sourceEl = document.getElementById('njp-source');
  var flipBtn = document.getElementById('njp-flip');

  var magnet = { x: W * 0.62, y: H * 0.42 };
  var polarity = 1;
  var t = 0;

  var BARS = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];

  function drawSource() {
    var mode = sourceEl.value;
    sctx.fillStyle = '#000';
    sctx.fillRect(0, 0, W, H);
    if (mode === 'lines') {
      sctx.fillStyle = '#d6f5ff';
      for (var y = 2; y < H; y += 6) sctx.fillRect(0, y, W, 2);
      sctx.fillStyle = '#7dd3fc';
      for (var x = 4; x < W; x += 24) sctx.fillRect(x, 0, 1, H);
      return;
    }
    if (mode === 'bars') {
      var bw = W / BARS.length;
      for (var i = 0; i < BARS.length; i++) {
        sctx.fillStyle = BARS[i];
        sctx.fillRect(Math.floor(i * bw), 0, Math.ceil(bw), H * 0.68);
      }
      var steps = 8;
      for (var j = 0; j < steps; j++) {
        var v = Math.round(255 * j / (steps - 1));
        sctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
        sctx.fillRect(Math.floor(j * W / steps), H * 0.68, Math.ceil(W / steps), H * 0.14);
      }
      sctx.fillStyle = '#fff';
      sctx.font = 'bold 20px monospace';
      sctx.textAlign = 'center';
      sctx.fillText('PAIK TV', W / 2, H * 0.95);
      return;
    }
    // face
    sctx.fillStyle = '#1e3a8a';
    sctx.fillRect(0, 0, W, H);
    sctx.fillStyle = '#fbbf24';
    sctx.beginPath(); sctx.arc(W / 2, H / 2, 70, 0, Math.PI * 2); sctx.fill();
    var blink = (t % 3) < 0.12 ? 1 : 10;
    sctx.fillStyle = '#111';
    sctx.beginPath(); sctx.ellipse(W / 2 - 25, H / 2 - 18, 9, blink, 0, 0, Math.PI * 2); sctx.fill();
    sctx.beginPath(); sctx.ellipse(W / 2 + 25, H / 2 - 18, 9, blink, 0, 0, Math.PI * 2); sctx.fill();
    sctx.lineWidth = 6; sctx.strokeStyle = '#111';
    sctx.beginPath(); sctx.arc(W / 2, H / 2 + 4, 36, 0.15 * Math.PI, 0.85 * Math.PI); sctx.stroke();
  }

  function warp() {
    var data = sctx.getImageData(0, 0, W, H).data;
    var o = outImg.data;
    var strength = (+strengthEl.value / 100) * 5.5 * polarity;
    var R = 55, R2 = R * R;
    var mx = magnet.x, my = magnet.y;
    for (var y = 0; y < H; y++) {
      // Scan-line darkening plus a faint rolling hum bar, like a real CRT.
      var line = (y & 1 ? 0.72 : 1) * (0.92 + 0.08 * Math.sin((y / H - t * 0.35) * Math.PI * 2));
      for (var x = 0; x < W; x++) {
        var dx = x - mx, dy = y - my;
        var d2 = dx * dx + dy * dy;
        var a = strength * Math.exp(-d2 / R2);
        var ca = Math.cos(a), sa = Math.sin(a);
        var sx = Math.round(mx + dx * ca - dy * sa);
        var sy = Math.round(my + dx * sa + dy * ca);
        var k = (y * W + x) * 4;
        if (sx < 0 || sy < 0 || sx >= W || sy >= H) {
          o[k] = o[k + 1] = o[k + 2] = 0;
        } else {
          var s = (sy * W + sx) * 4;
          o[k] = data[s] * line;
          o[k + 1] = data[s + 1] * line;
          o[k + 2] = data[s + 2] * line;
        }
        o[k + 3] = 255;
      }
    }
    octx.putImageData(outImg, 0, 0);
  }

  function drawMagnet(ctx, cw, ch) {
    var px = magnet.x / W * cw, py = magnet.y / H * ch;
    var r = Math.max(14, cw * 0.035);
    ctx.save();
    ctx.translate(px, py);
    ctx.lineWidth = r * 0.7;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(2, 3, r, Math.PI, 0); ctx.stroke();
    var top = polarity > 0 ? '#ef4444' : '#3b82f6';
    var bot = polarity > 0 ? '#3b82f6' : '#ef4444';
    ctx.strokeStyle = '#d4d4d8';
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = top; ctx.fillRect(-r - r * 0.35, 0, r * 0.7, r * 0.8);
    ctx.fillStyle = bot; ctx.fillRect(r - r * 0.35, 0, r * 0.7, r * 0.8);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.round(r * 0.55) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(polarity > 0 ? 'N' : 'S', -r, r * 0.45);
    ctx.fillText(polarity > 0 ? 'S' : 'N', r, r * 0.45);
    ctx.restore();
  }

  function frame(dt) {
    t += Math.min(dt, 0.1);
    drawSource();
    warp();
    var ctx = view.ctx, cw = view.width, ch = view.height;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(out, 0, 0, cw, ch);
    // Glass glare
    var g = ctx.createRadialGradient(cw * 0.3, ch * 0.2, 0, cw * 0.3, ch * 0.2, cw * 0.7);
    g.addColorStop(0, 'rgba(255,255,255,0.10)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
    drawMagnet(ctx, cw, ch);
  }

  function setFromPointer(e) {
    var rect = canvas.getBoundingClientRect();
    magnet.x = Math.max(0, Math.min(W, (e.clientX - rect.left) / rect.width * W));
    magnet.y = Math.max(0, Math.min(H, (e.clientY - rect.top) / rect.height * H));
  }
  var dragging = false;
  canvas.addEventListener('pointerdown', function (e) {
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    setFromPointer(e);
  });
  canvas.addEventListener('pointermove', function (e) { if (dragging) setFromPointer(e); });
  canvas.addEventListener('pointerup', function () { dragging = false; });
  canvas.addEventListener('pointercancel', function () { dragging = false; });

  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', function (e) {
    var step = 8;
    var moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    var m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    magnet.x = Math.max(0, Math.min(W, magnet.x + m[0]));
    magnet.y = Math.max(0, Math.min(H, magnet.y + m[1]));
  });

  flipBtn.addEventListener('click', function () { polarity = -polarity; });

  SimKit.loop(frame);
})();
