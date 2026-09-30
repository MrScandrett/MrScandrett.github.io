/* Demo Lab: classic demo effects drawn into a 320×200 8-bit-style buffer, then
   optionally bent by Nam June Paik's video techniques (assets/js/video-fx.js).

   Each effect writes palette indices (0–255) into a layer's `px`; a shared blit maps
   them through the chosen palette into RGBA. The treatments then work on that RGBA:

     effect → peel (reveals a 2nd effect) → magnet warp → scramble/scan lines → zen squeeze

   The on-screen byte count is the length of the running function sources, read at
   runtime via toString(). */
(function () {
  var canvas = document.getElementById('ds-canvas');
  if (!canvas || !window.SimKit || !window.VideoFX) return;

  var W = 320, H = 200, N = W * H;
  canvas.width = W; canvas.height = H;
  var ctx = canvas.getContext('2d');

  function $(id) { return document.getElementById(id); }
  var ui = {
    speed: $('ds-speed'), palette: $('ds-palette'), text: $('ds-text'), bytes: $('ds-bytes'),
    explain: $('ds-explain'), under: $('ds-under'), preset: $('ds-preset'), tool: $('ds-tool'),
    status: $('ds-status'), scan: $('ds-scan'),
    magnet: { on: $('ds-on-magnet'), mod: $('ds-mod-magnet'), fs: $('ds-fs-magnet'), strength: $('ds-strength'), flip: $('ds-flip') },
    zen: { on: $('ds-on-zen'), mod: $('ds-mod-zen'), fs: $('ds-fs-zen'), sweep: $('ds-zen-sweep'), collapse: $('ds-zen-collapse') },
    peel: { on: $('ds-on-peel'), mod: $('ds-mod-peel'), fs: $('ds-fs-peel'), size: $('ds-peel-size'), heal: $('ds-peel-heal'), reset: $('ds-peel-reset') },
    scr: { on: $('ds-on-scr'), mod: $('ds-mod-scr'), fs: $('ds-fs-scr'), amount: $('ds-scr-amount') }
  };
  var scrollLabel = ui.text.closest('label');
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
  var palCache = {};
  function paletteFor(fx) {
    var key = fx.pal ? 'fire' : ui.palette.value;
    if (palCache[key]) return palCache[key];
    var fn = fx.pal || PALETTES[ui.palette.value], pal = new Uint8Array(256 * 3);
    for (var i = 0; i < 256; i++) { var c = fn(i); pal[i * 3] = c[0]; pal[i * 3 + 1] = c[1]; pal[i * 3 + 2] = c[2]; }
    pal[0] = pal[1] = pal[2] = 0; // index 0 is always black: empty space for stars, bars, and fire
    return (palCache[key] = pal);
  }

  /* ── Layers: each effect draws into its own palette-index buffer ── */
  function makeLayer() {
    var L = { px: new Uint8Array(N), rgba: new Uint8ClampedArray(N * 4), heat: new Uint8Array(N + W), stars: [] };
    for (var s = 0; s < 400; s++) L.stars.push([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random()]);
    return L;
  }

  /* ── Effects ── */
  function plasma(L, t) {
    var px = L.px;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var v = Math.sin(x / 16 + t) + Math.sin(y / 8 + t * 0.7)
            + Math.sin((x + y) / 16 + t * 1.3) + Math.sin(Math.hypot(x - 160, y - 100) / 8 - t);
      px[y * W + x] = (v + 4) * 32 & 255;
    }
  }

  function starfield(L, t, dt) {
    var px = L.px, stars = L.stars;
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
  function tunnel(L, t) {
    var px = L.px;
    for (var i = 0; i < N; i++) {
      var u = angleT[i] + t * 20 + Math.sin(t) * 30 & 255, v = distT[i] + t * 60 & 255;
      px[i] = ((u ^ v) & 255) * Math.min(1, 40 / distT[i]);
    }
  }

  function fire(L) {
    var heat = L.heat;
    for (var x = 0; x < W; x += 8) heat.fill(Math.random() < 0.5 ? 255 : 0, (H - 1) * W + x, (H - 1) * W + x + 8);
    for (var i = 0; i < (H - 1) * W; i++) {
      var sum = heat[i + W] + heat[i + W - 1] + heat[i + W + 1] + heat[i + W + W];
      heat[i] = Math.max(0, sum / 4.02 - 0.2);
    }
    L.px.set(heat.subarray(0, N));
  }

  function bars(L, t) { // the scroller's raster bars; the text is drawn over them by drawScrollText
    for (var y = 0; y < H; y++) {
      var c = 0;
      for (var b = 0; b < 5; b++) {
        var d = Math.abs(y - (100 + Math.sin(t * 1.5 + b * 0.8) * 70));
        if (d < 8) c = Math.max(c, (8 - d) * 30 + b * 16 & 255);
      }
      L.px.fill(c, y * W, y * W + W);
    }
  }

  var textCanvas = document.createElement('canvas');
  textCanvas.width = W; textCanvas.height = H;
  var tctx = textCanvas.getContext('2d', { willReadFrequently: true });
  var textImg = tctx.createImageData(W, H);
  function drawScrollText(L, t) {
    textImg.data.set(L.rgba);
    tctx.putImageData(textImg, 0, 0);
    var msg = ui.text.value || ' ';
    tctx.font = 'bold 24px "Courier New", monospace';
    tctx.textBaseline = 'middle';
    var cw = 16, off = t * 90 % (msg.length * cw);
    for (var k = 0; k < msg.length; k++) {
      var x0 = W - off + k * cw;
      if (x0 < -cw) x0 += msg.length * cw;
      if (x0 > W) continue;
      tctx.fillStyle = '#000';
      tctx.fillText(msg[k], x0 + 2, 100 + Math.sin(x0 / 30 + t * 3) * 40 + 2);
      tctx.fillStyle = '#fff';
      tctx.fillText(msg[k], x0, 100 + Math.sin(x0 / 30 + t * 3) * 40);
    }
    L.rgba.set(tctx.getImageData(0, 0, W, H).data);
  }

  var FX = {
    plasma: { fn: plasma, info: '<strong>Plasma:</strong> for every pixel, add four sine waves: one across, one down, one diagonal, and one in rings from the center. The sum (−4 to 4) is turned into a color number. Adding the time <code>t</code> inside each wave makes the whole field ripple. That is 64,000 pixels × 4 sines, every frame.' },
    stars: { fn: starfield, info: '<strong>Starfield:</strong> each star has an x, y, and a depth z. Screen position = center + x ÷ z, so as z shrinks toward the viewer the star rushes outward and brightens. This is perspective projection, the same division every 3D game does.' },
    tunnel: { fn: tunnel, info: '<strong>Tunnel:</strong> before the animation starts, compute each pixel\'s <em>angle</em> around the center and its <em>distance</em> (1 ÷ radius). Those become texture coordinates. The texture itself is just <code>u XOR v</code>, a checkered pattern made from a single operator. Scrolling the distance flies you forward. Nothing is 3D. It is a lookup table.' },
    fire: { fn: fire, pal: FIRE_PAL, info: '<strong>Fire:</strong> fill the bottom row with random hot values. Then each pixel becomes the average of the pixels just below it, minus a little. Heat rises and cools, and flames appear with no drawing at all. The palette maps cold→black, warm→red, hot→yellow-white.' },
    scroller: { fn: bars, text: true, info: '<strong>Sine scroller over raster bars:</strong> the glowing stripes are "copper bars," a color change on each scan line, the Amiga\'s signature trick. Each letter\'s height is <code>sin(x ÷ 30 + time)</code>, so the text rides a wave. Edit the greeting to make it yours.' }
  };

  var top = makeLayer(), under = makeLayer();
  function renderLayer(L, name, t, dt) {
    var fx = FX[name], pal = paletteFor(fx), px = L.px, d = L.rgba;
    fx.fn(L, t, dt);
    for (var i = 0, j = 0; i < N; i++, j += 4) {
      var c = px[i] * 3;
      d[j] = pal[c]; d[j + 1] = pal[c + 1]; d[j + 2] = pal[c + 2]; d[j + 3] = 255;
    }
    if (fx.text) drawScrollText(L, t);
    return d;
  }

  /* ── State ── */
  var current = 'plasma', t = 0, dragging = false, last = null, auto = null;
  var cursor = { x: W / 2, y: H / 2 };
  var mag, zen, peel, scr, scan, tool;
  var mask = new Float32Array(N);
  var bufA = new Uint8ClampedArray(N * 4), bufB = new Uint8ClampedArray(N * 4);
  var mid = document.createElement('canvas'); mid.width = W; mid.height = H;
  var midCtx = mid.getContext('2d');
  var outImg = midCtx.createImageData(W, H);
  var avg = document.createElement('canvas'); avg.width = 1; avg.height = H;

  function reset() {
    mag = { on: false, strength: 60, pol: 1, mod: false, x: W * 0.62, y: H * 0.42 };
    zen = { on: false, sweep: 100, mod: false, target: null };
    peel = { on: false, size: 18, heal: 0, mod: false };
    scr = { on: false, amount: 35, mod: false };
    scan = false; tool = 'magnet'; auto = null;
    mask.fill(0);
  }
  reset();

  function status(msg) { ui.status.textContent = msg; }

  function select(name) {
    current = name;
    tabs.forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.fx === name)); });
    scrollLabel.hidden = name !== 'scroller' && ui.under.value !== 'scroller';
    ui.explain.innerHTML = FX[name].info;
    if (name === 'fire') top.heat.fill(0);
    updateBytes();
  }
  tabs.forEach(function (b) { b.addEventListener('click', function () { select(b.dataset.fx); }); });
  ui.palette.addEventListener('change', function () { palCache = {}; });
  ui.under.addEventListener('change', function () { select(current); });

  function activeTreatments() {
    var VF = window.VideoFX, list = [];
    if (peel.on) list.push(VF.peelStamp, VF.peelLine, VF.healMask, VF.peelComposite);
    if (mag.on) list.push(VF.magnetWarp);
    if (scr.on || scan) list.push(VF.scramble);
    if (zen.on) list.push(VF.zenDraw);
    return list;
  }
  function updateBytes() {
    var fnBytes = FX[current].fn.toString().length;
    var extra = activeTreatments().reduce(function (n, f) { return n + f.toString().length; }, 0);
    ui.bytes.textContent = fnBytes + ' bytes of code' + (extra ? ' + ' + extra + ' for video treatments' : '');
  }

  /* ── Treatment panel ── */
  function techState(key) { return key === 'magnet' ? mag : key === 'zen' ? zen : key === 'peel' ? peel : scr; }
  function syncPanel() {
    ['magnet', 'zen', 'peel', 'scr'].forEach(function (k) {
      var u = ui[k], s = techState(k);
      u.on.setAttribute('aria-pressed', String(s.on));
      u.fs.disabled = !s.on;
      u.mod.checked = s.mod;
    });
    ui.magnet.strength.value = mag.strength;
    ui.zen.sweep.value = zen.sweep;
    ui.peel.size.value = peel.size; ui.peel.heal.value = peel.heal;
    ui.scr.amount.value = scr.amount;
    ui.scan.checked = scan;
    ui.tool.value = tool;
    ui.zen.collapse.textContent = zen.sweep < 50 ? 'Open it back up' : 'Collapse it';
    updateBytes();
  }
  ['magnet', 'zen', 'peel', 'scr'].forEach(function (k) {
    var u = ui[k];
    u.on.addEventListener('click', function () {
      var s = techState(k); s.on = !s.on;
      if (s.on && k === 'peel' && !mag.on) tool = 'peel';
      if (s.on && k === 'magnet' && !peel.on) tool = 'magnet';
      syncPanel();
    });
    u.mod.addEventListener('change', function () { techState(k).mod = u.mod.checked; });
  });
  ui.magnet.strength.addEventListener('input', function () { mag.strength = +ui.magnet.strength.value; });
  ui.magnet.flip.addEventListener('click', function () { mag.pol = -mag.pol; });
  ui.zen.sweep.addEventListener('input', function () { zen.sweep = +ui.zen.sweep.value; zen.target = null; ui.zen.collapse.textContent = zen.sweep < 50 ? 'Open it back up' : 'Collapse it'; });
  ui.zen.collapse.addEventListener('click', function () { zen.target = zen.sweep < 50 ? 100 : 0; ui.zen.collapse.textContent = zen.target === 0 ? 'Open it back up' : 'Collapse it'; });
  ui.peel.size.addEventListener('input', function () { peel.size = +ui.peel.size.value; });
  ui.peel.heal.addEventListener('input', function () { peel.heal = +ui.peel.heal.value; });
  ui.peel.reset.addEventListener('click', function () { mask.fill(0); status('Picture restored.'); });
  ui.scr.amount.addEventListener('input', function () { scr.amount = +ui.scr.amount.value; });
  ui.scan.addEventListener('change', function () { scan = ui.scan.checked; updateBytes(); });
  ui.tool.addEventListener('change', function () { tool = ui.tool.value; });

  var PRESETS = {
    plain: function () {},
    magnet: function () { mag.on = true; tool = 'magnet'; scan = true; },
    zen: function () { zen.on = true; zen.sweep = 100; },
    decollage: function () { peel.on = true; tool = 'peel'; ui.under.value = current === 'tunnel' ? 'fire' : 'tunnel'; },
    cracktro: function () { select('scroller'); scr.on = true; scr.amount = 20; scr.mod = true; scan = true; },
    storm: function () {
      mag.on = zen.on = peel.on = scr.on = true;
      mag.mod = zen.mod = peel.mod = scr.mod = true;
      mag.strength = 70; zen.sweep = 35; peel.heal = 35; scr.amount = 30; tool = 'peel';
    }
  };
  ui.preset.addEventListener('change', function () {
    var name = ui.preset.value;
    if (!name) return;
    reset();
    PRESETS[name]();
    syncPanel();
    status('Set to the ' + ui.preset.options[ui.preset.selectedIndex].text + ' preset.');
    ui.preset.value = '';
  });

  /* ── Pointer + keyboard: drag the magnet or tear the picture ── */
  function effTool() {
    if (tool === 'magnet' && !mag.on && peel.on) return 'peel';
    if (tool === 'peel' && !peel.on && mag.on) return 'magnet';
    return tool;
  }
  function peelR() { return peel.size / 240 * W * 0.5; }
  function toBuf(e) {
    var r = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(W, (e.clientX - r.left) / r.width * W)), y: Math.max(0, Math.min(H, (e.clientY - r.top) / r.height * H)) };
  }
  canvas.addEventListener('pointerdown', function (e) {
    dragging = true; last = null;
    canvas.setPointerCapture(e.pointerId);
    var p = toBuf(e); cursor = p;
    if (effTool() === 'magnet' && mag.on) { mag.x = p.x; mag.y = p.y; }
    else if (peel.on) { VideoFX.peelLine(mask, W, H, null, p, peelR()); last = p; }
  });
  canvas.addEventListener('pointermove', function (e) {
    var p = toBuf(e); cursor = p;
    if (!dragging) return;
    if (effTool() === 'magnet' && mag.on) { mag.x = p.x; mag.y = p.y; }
    else if (peel.on) { VideoFX.peelLine(mask, W, H, last, p, peelR()); last = p; }
  });
  function endDrag() { dragging = false; last = null; }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('keydown', function (e) {
    var moves = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }, m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    var clamp = function (v, max) { return Math.max(0, Math.min(max, v)); };
    if (effTool() === 'magnet' && mag.on && !e.shiftKey) {
      mag.x = clamp(mag.x + m[0], W); mag.y = clamp(mag.y + m[1], H);
      cursor = { x: mag.x, y: mag.y };
    } else {
      cursor = { x: clamp(cursor.x + m[0], W), y: clamp(cursor.y + m[1], H) };
      if (e.shiftKey && peel.on) VideoFX.peelStamp(mask, W, H, cursor.x, cursor.y, peelR());
    }
  });

  /* ── Frame ── */
  function drawMagnet(x, y, pol) {
    var r = 11;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = r * 0.7;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(1, 2, r, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = '#d4d4d8';
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = pol > 0 ? '#ef4444' : '#3b82f6'; ctx.fillRect(-r - r * 0.35, 0, r * 0.7, r * 0.8);
    ctx.fillStyle = pol > 0 ? '#3b82f6' : '#ef4444'; ctx.fillRect(r - r * 0.35, 0, r * 0.7, r * 0.8);
    ctx.restore();
  }

  function frame(dt) {
    dt = Math.min(dt, 0.1) * (+ui.speed.value / 100);
    t += dt;
    var phase = t * 1.6, lfo = 0.5 + 0.5 * Math.sin(phase);

    var cur = renderLayer(top, current, t, dt);

    if (peel.on) {
      if (peel.mod) {
        var to = { x: W / 2 + W * 0.42 * Math.sin(phase * 1.3), y: H / 2 + H * 0.4 * Math.sin(phase * 0.9 + 1) };
        VideoFX.peelLine(mask, W, H, auto, to, peelR());
        auto = to;
      } else auto = null;
      if (peel.heal > 0) VideoFX.healMask(mask, peel.heal / 100 * 0.6 * dt);
      VideoFX.peelComposite(cur, renderLayer(under, ui.under.value, t, dt), mask, bufA);
      cur = bufA;
    } else auto = null;

    var magPos = null;
    if (mag.on) {
      var str = mag.strength / 100 * 5.5 * mag.pol * (mag.mod ? Math.sin(phase) : 1);
      var mx = mag.x, my = mag.y;
      if (mag.mod) { mx = W / 2 + W * 0.3 * Math.cos(phase * 0.7); my = H / 2 + H * 0.28 * Math.sin(phase * 1.1); }
      magPos = { x: mx, y: my, pol: mag.mod ? (Math.sin(phase) * mag.pol >= 0 ? 1 : -1) : mag.pol };
      if (VideoFX.magnetWarp(cur, bufB, W, H, mx, my, str, 55)) cur = bufB;
    }

    var out = outImg.data;
    if (scr.on || scan) VideoFX.scramble(cur, out, W, H, scr.on ? scr.amount / 100 * (scr.mod ? lfo : 1) : 0, t);
    else out.set(cur);
    midCtx.putImageData(outImg, 0, 0);

    if (zen.on) {
      if (zen.target !== null) {
        zen.sweep += Math.sign(zen.target - zen.sweep) * Math.min(Math.abs(zen.target - zen.sweep), 45 * dt / Math.max(0.01, +ui.speed.value / 100));
        ui.zen.sweep.value = zen.sweep;
        if (zen.sweep === zen.target) { zen.target = null; syncPanel(); }
      }
      var min = zen.sweep / 100, s = zen.mod ? min + (1 - min) * lfo : min;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      VideoFX.zenDraw(ctx, W, H, mid, out, W, H, s, t, avg);
    } else ctx.drawImage(mid, 0, 0);

    if (magPos) drawMagnet(magPos.x, magPos.y, magPos.pol);
    if (peel.on && effTool() === 'peel' && (dragging || document.activeElement === canvas)) {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(cursor.x, cursor.y, peelR(), 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  select('plasma');
  syncPanel();
  SimKit.loop(frame);
})();
