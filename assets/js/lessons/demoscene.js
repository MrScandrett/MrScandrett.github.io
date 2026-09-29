/* Effects Lab: classic demo effects drawn into a 320×200 8-bit-style buffer.
   Each effect writes palette indices (0–255) into `px`; the shared blit maps
   them through the chosen palette. The on-screen byte count is the length of
   the effect function's own source, read at runtime via toString(). */
(function () {
  var canvas = document.getElementById('ds-canvas');
  if (!canvas || !window.SimKit) return;

  var W = 320, H = 200, N = W * H;
  canvas.width = W; canvas.height = H;
  var ctx = canvas.getContext('2d');
  var img = ctx.createImageData(W, H);
  var px = new Uint8Array(N);

  var speedEl = document.getElementById('ds-speed');
  var paletteEl = document.getElementById('ds-palette');
  var textEl = document.getElementById('ds-text');
  var bytesEl = document.getElementById('ds-bytes');
  var explainEl = document.getElementById('ds-explain');
  var scrollLabel = textEl.closest('label');
  var tabs = document.querySelectorAll('.ds-tabs [data-fx]');

  /* ── Palettes: 256 entries of [r, g, b] ── */
  var C64 = [[0,0,0],[255,255,255],[136,57,50],[103,182,189],[139,63,150],[85,160,73],[64,49,141],[191,206,114],
             [139,84,41],[87,66,0],[184,105,98],[80,80,80],[120,120,120],[148,224,137],[120,105,196],[159,159,159]];
  function hsv(h, s, v) {
    var i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    var m = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i % 6];
    return [m[0] * 255, m[1] * 255, m[2] * 255];
  }
  var PALETTES = {
    rainbow: function (i) { return hsv(i / 256, 0.85, 1); },
    amiga: function (i) {
      var a = i / 255 * Math.PI * 2;
      return [128 + 127 * Math.sin(a), 128 + 127 * Math.sin(a + 2.1), 128 + 127 * Math.sin(a + 4.2)];
    },
    c64: function (i) { return C64[[6, 14, 3, 1, 7, 8, 2, 4, 6, 11, 12, 15, 1, 13, 5, 0][i >> 4]]; },
    mono: function (i) { var v = Math.abs(128 - i) * 2; return [v * 0.2, v, v * 0.35]; }
  };
  var FIRE_PAL = function (i) { return [Math.min(255, i * 3), Math.max(0, Math.min(255, i * 3 - 255)), Math.max(0, i * 3 - 510)]; };
  var pal = new Uint8Array(256 * 3);
  function buildPalette(fn) {
    for (var i = 0; i < 256; i++) { var c = fn(i); pal[i * 3] = c[0]; pal[i * 3 + 1] = c[1]; pal[i * 3 + 2] = c[2]; }
    pal[0] = pal[1] = pal[2] = 0; // index 0 is always black: empty space for stars, bars, and fire
  }

  /* ── Effects ── */
  function plasma(t) {
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var v = Math.sin(x / 16 + t) + Math.sin(y / 8 + t * 0.7)
            + Math.sin((x + y) / 16 + t * 1.3) + Math.sin(Math.hypot(x - 160, y - 100) / 8 - t);
      px[y * W + x] = (v + 4) * 32 & 255;
    }
  }

  var stars = [];
  for (var s = 0; s < 400; s++) stars.push([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random()]);
  function starfield(t, dt) {
    px.fill(0);
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      st[2] -= dt * 0.4;
      if (st[2] <= 0.01) { st[0] = Math.random() * 2 - 1; st[1] = Math.random() * 2 - 1; st[2] = 1; }
      var sx = 160 + st[0] / st[2] * 100 | 0, sy = 100 + st[1] / st[2] * 100 | 0;
      if (sx >= 0 && sx < W - 1 && sy >= 0 && sy < H - 1) {
        var c = 255 - st[2] * 200 | 0, k = sy * W + sx;
        px[k] = c;
        if (st[2] < 0.4) px[k + 1] = px[k + W] = px[k + W + 1] = c; // near stars draw bigger
      }
    }
  }

  var angleT = new Float32Array(N), distT = new Float32Array(N);
  for (var ty = 0; ty < H; ty++) for (var tx = 0; tx < W; tx++) {
    var dx = tx - 160, dy = ty - 100;
    angleT[ty * W + tx] = Math.atan2(dy, dx) / Math.PI * 128;
    distT[ty * W + tx] = 4096 / (Math.hypot(dx, dy) + 1);
  }
  function tunnel(t) {
    for (var i = 0; i < N; i++) {
      var u = angleT[i] + t * 20 + Math.sin(t) * 30 & 255, v = distT[i] + t * 60 & 255;
      px[i] = ((u ^ v) & 255) * Math.min(1, 40 / distT[i]);
    }
  }

  var heat = new Uint8Array(N + W);
  function fire() {
    for (var x = 0; x < W; x += 8) heat.fill(Math.random() < 0.5 ? 255 : 0, (H - 1) * W + x, (H - 1) * W + x + 8);
    for (var i = 0; i < (H - 1) * W; i++) {
      var sum = heat[i + W] + heat[i + W - 1] + heat[i + W + 1] + heat[i + W + W];
      heat[i] = Math.max(0, sum / 4.02 - 0.2);
    }
    px.set(heat.subarray(0, N));
  }

  function scroller(t) {
    for (var y = 0; y < H; y++) {
      var c = 0;
      for (var b = 0; b < 5; b++) {
        var d = Math.abs(y - (100 + Math.sin(t * 1.5 + b * 0.8) * 70));
        if (d < 8) c = Math.max(c, (8 - d) * 30 + b * 16 & 255);
      }
      px.fill(c, y * W, y * W + W);
    }
    blit();
    var msg = textEl.value || ' ';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textBaseline = 'middle';
    var cw = 16, off = t * 90 % (msg.length * cw);
    for (var k = 0; k < msg.length; k++) {
      var x0 = W - off + k * cw;
      if (x0 < -cw) x0 += msg.length * cw;
      if (x0 > W) continue;
      ctx.fillStyle = '#000';
      ctx.fillText(msg[k], x0 + 2, 100 + Math.sin(x0 / 30 + t * 3) * 40 + 2);
      ctx.fillStyle = '#fff';
      ctx.fillText(msg[k], x0, 100 + Math.sin(x0 / 30 + t * 3) * 40);
    }
    return true;
  }

  var FX = {
    plasma: { fn: plasma, info: '<strong>Plasma:</strong> for every pixel, add four sine waves: one across, one down, one diagonal, and one in rings from the center. The sum (−4 to 4) is turned into a color number. Adding the time <code>t</code> inside each wave makes the whole field ripple. That is 64,000 pixels × 4 sines, every frame.' },
    stars: { fn: starfield, info: '<strong>Starfield:</strong> each star has an x, y, and a depth z. Screen position = center + x ÷ z, so as z shrinks toward the viewer the star rushes outward and brightens. This is perspective projection, the same division every 3D game does.' },
    tunnel: { fn: tunnel, info: '<strong>Tunnel:</strong> before the animation starts, compute each pixel\'s <em>angle</em> around the center and its <em>distance</em> (1 ÷ radius). Those become texture coordinates. The texture itself is just <code>u XOR v</code>, a checkered pattern made from a single operator. Scrolling the distance flies you forward. Nothing is 3D. It is a lookup table.' },
    fire: { fn: fire, pal: FIRE_PAL, info: '<strong>Fire:</strong> fill the bottom row with random hot values. Then each pixel becomes the average of the pixels just below it, minus a little. Heat rises and cools, and flames appear with no drawing at all. The palette maps cold→black, warm→red, hot→yellow-white.' },
    scroller: { fn: scroller, info: '<strong>Sine scroller over raster bars:</strong> the glowing stripes are "copper bars," a color change on each scan line, the Amiga\'s signature trick. Each letter\'s height is <code>sin(x ÷ 30 + time)</code>, so the text rides a wave. Edit the greeting to make it yours.' }
  };

  var current = 'plasma', t = 0;
  function select(name) {
    current = name;
    tabs.forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.fx === name)); });
    var fx = FX[name];
    buildPalette(fx.pal || PALETTES[paletteEl.value]);
    paletteEl.disabled = !!fx.pal;
    scrollLabel.hidden = name !== 'scroller';
    bytesEl.textContent = fx.fn.toString().length + ' bytes of code';
    explainEl.innerHTML = fx.info;
    if (name === 'fire') heat.fill(0);
  }
  tabs.forEach(function (b) { b.addEventListener('click', function () { select(b.dataset.fx); }); });
  paletteEl.addEventListener('change', function () { select(current); });

  function blit() {
    var d = img.data;
    for (var i = 0, j = 0; i < N; i++, j += 4) {
      var c = px[i] * 3;
      d[j] = pal[c]; d[j + 1] = pal[c + 1]; d[j + 2] = pal[c + 2]; d[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  select('plasma');
  SimKit.loop(function (dt) {
    dt = Math.min(dt, 0.1) * (+speedEl.value / 100);
    t += dt;
    if (!FX[current].fn(t, dt)) blit();
  });
})();
