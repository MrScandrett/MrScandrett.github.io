(function () {
  'use strict';

  var canvas = document.getElementById('form-canvas');
  var light = document.getElementById('form-light');
  var lightValue = document.getElementById('form-light-value');
  var elevation = document.getElementById('form-elevation');
  var elevationValue = document.getElementById('form-elevation-value');
  var guide = document.getElementById('form-guide');
  var squint = document.getElementById('form-squint');
  var caption = document.getElementById('form-caption');
  var insight = document.getElementById('form-insight');
  var styles = document.querySelectorAll('input[name="form-style"]');
  var shapeBtns = document.querySelectorAll('[data-form-shape]');
  var tabBtns = document.querySelectorAll('[data-form-tab]');
  var tabPanels = document.querySelectorAll('[data-form-panel]');

  var style = 'impression';
  var shape = 'sphere';
  var width = 0;
  var height = 0;
  var ctx = null;

  var descriptions = {
    impression: ['Short, varied brushstrokes suggest light and form.', 'Squint at the strokes: separate marks merge into larger light and dark shapes.'],
    tonal: ['Five value families make highlight, halftone, core shadow, and reflected light easy to compare.', 'Block in the five big value shapes first before adding fine edge detail.'],
    hatch: ['Parallel pencil lines build the form from light to shadow.', 'Closer lines create deeper values while open paper keeps the highlight bright.'],
    crosshatch: ['Crossing layers of lines build darker values.', 'Use one layer in the halftone and add overlapping strokes in the core shadow.'],
    stipple: ['Dots gather more densely on the shadow side.', 'Look closely: individual dots stay separate even where the core shadow reads dark.'],
    scumble: ['Small, loose loops build an irregular graphite texture.', 'Overlapping loops darken the shadow; open paper holds the light plane.'],
    smudge: ['Soft graphite transitions describe the turning surface.', 'Keep the highlight clean and anchor the base with a dark contact shadow.'],
    realistic: ['Smooth transitions and a crisp specular highlight model a turned surface.', 'Watch how the core shadow sits before the reflected light along the lower edge.']
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function noise(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }

  function surfaceSample(nx, ny) {
    if (shape === 'sphere') {
      var d = nx * nx + ny * ny;
      if (d > 1) return null;
      var nz = Math.sqrt(1 - d);
      return { nx: nx, ny: ny, nz: nz, bounce: Math.max(0, ny) };
    }
    if (shape === 'cylinder') {
      if (Math.abs(nx) > 0.72 || Math.abs(ny) > 0.88) return null;
      var cx = nx / 0.72;
      if (ny < -0.68) {
        var topCap = (ny + 0.68) / 0.2;
        if (cx * cx + topCap * topCap > 1) return null;
        return { nx: cx * 0.08, ny: -0.96, nz: 0.26, bounce: 0.02 };
      }
      var cz = Math.sqrt(Math.max(0, 1 - cx * cx));
      return { nx: cx, ny: 0.05, nz: cz, bounce: Math.max(0, (ny + 0.2) * 0.5) };
    }
    if (shape === 'cone') {
      if (ny < -0.88 || ny > 0.88) return null;
      var t = (ny + 0.88) / 1.76;
      var halfW = 0.06 + t * 0.78;
      if (Math.abs(nx) > halfW) return null;
      var u = nx / halfW;
      var rz = Math.sqrt(Math.max(0, 1 - u * u));
      var len = Math.hypot(u, -0.44, rz);
      return { nx: u / len, ny: -0.44 / len, nz: rz / len, bounce: Math.max(0, t - 0.5) };
    }
    // Cube (isometric-style three-plane readout)
    if (Math.abs(nx) > 0.82 || Math.abs(ny) > 0.82) return null;
    var topLimit = -0.35 + Math.abs(nx) * 0.32;
    if (ny < topLimit) {
      if (ny < -0.78 + Math.abs(nx) * 0.32) return null;
      return { nx: 0, ny: -0.92, nz: 0.39, bounce: 0.03 };
    }
    if (nx < 0) return { nx: -0.72, ny: 0.12, nz: 0.68, bounce: 0.08 };
    return { nx: 0.72, ny: 0.12, nz: 0.68, bounce: 0.08 };
  }

  function render() {
    if (!ctx || width < 2 || height < 2) return;
    var w = width, h = height, cx = w * 0.5, cy = h * 0.47, r = Math.min(w * 0.27, h * 0.34);
    var az = Number(light.value) * Math.PI / 180;
    var el = Number(elevation.value) * Math.PI / 180;
    var lx = Math.sin(az) * Math.cos(el);
    var ly = -Math.sin(el);
    var lz = Math.cos(az) * Math.cos(el);
    var len = Math.hypot(lx, ly, lz);
    lx /= len; ly /= len; lz /= len;

    var halfLen = Math.hypot(lx, ly, lz + 1);
    var hx = lx / halfLen, hy = ly / halfLen, hz = (lz + 1) / halfLen;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#e8e2d4';
    ctx.fillRect(0, 0, w, h);
    var floor = cy + r * 0.88;
    ctx.fillStyle = '#d6cbb8';
    ctx.fillRect(0, floor, w, h - floor);

    var shadowShift = -lx * r * (0.95 - 0.35 * Math.sin(el));
    ctx.save();
    ctx.translate(cx + shadowShift, cy + r * 0.96);
    ctx.scale(1.15, 0.24);
    var shadow = ctx.createRadialGradient(0, 0, r * 0.08, 0, 0, r * 1.15);
    shadow.addColorStop(0, 'rgba(45,38,38,.40)');
    shadow.addColorStop(1, 'rgba(45,38,38,0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy + r * 0.92);
    ctx.scale(1, 0.2);
    var contact = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.46);
    contact.addColorStop(0, 'rgba(35,30,29,.60)');
    contact.addColorStop(1, 'rgba(35,30,29,0)');
    ctx.fillStyle = contact;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    var pencil = ['hatch', 'crosshatch', 'stipple', 'scumble'].indexOf(style) !== -1;
    var size = Math.max(2, Math.ceil(r * 2));
    var off = document.createElement('canvas');
    off.width = off.height = size;
    var oc = off.getContext('2d');
    var image = oc.createImageData(size, size);

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var nx = (x - size / 2) / (size / 2);
        var ny = (y - size / 2) / (size / 2);
        var s = surfaceSample(nx, ny);
        if (!s) continue;
        var i = (y * size + x) * 4;
        var diffuse = Math.max(0, s.nx * lx + s.ny * ly + s.nz * lz);
        var reflected = 0.13 * s.bounce;
        var spec = Math.pow(Math.max(0, s.nx * hx + s.ny * hy + s.nz * hz), 42) * 0.24;
        var v = clamp(0.11 + diffuse * 0.72 + reflected + spec, 0, 1);
        if (style === 'tonal') v = Math.round(v * 4) / 4;
        var gray = Math.round(pencil ? 196 + v * 45 : 36 + v * 200);
        image.data[i] = gray;
        image.data[i + 1] = gray;
        image.data[i + 2] = gray;
        image.data[i + 3] = 255;
      }
    }
    oc.putImageData(image, 0, 0);
    ctx.drawImage(off, cx - r, cy - r, r * 2, r * 2);

    if (pencil || style === 'impression') {
      var count = style === 'impression' ? 1900 : style === 'stipple' ? 18000 : 7500;
      for (var k = 0; k < count; k++) {
        var qx = noise(k, 41) * 2 - 1;
        var qy = noise(k, 47) * 2 - 1;
        var smp = surfaceSample(qx, qy);
        if (!smp) continue;
        var diff = Math.max(0, smp.nx * lx + smp.ny * ly + smp.nz * lz);
        var val = clamp(0.11 + diff * 0.76 + 0.11 * smp.bounce, 0, 1);
        var mx = cx + qx * r, my = cy + qy * r;
        if (style === 'impression') {
          var vary = (noise(k, 12) - 0.5) * 40;
          var bg = Math.round(clamp(38 + val * 198 + vary, 0, 255));
          ctx.strokeStyle = 'rgba(' + bg + ',' + bg + ',' + bg + ',.82)';
          ctx.lineWidth = Math.max(1.5, r * (0.018 + noise(k, 21) * 0.022));
          ctx.lineCap = 'round';
          var dir = -0.5 + qx * 0.5 + (noise(k, 24) - 0.5) * 0.7;
          var lenStroke = r * (0.035 + noise(k, 27) * 0.055);
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(mx + Math.cos(dir) * lenStroke, my + Math.sin(dir) * lenStroke);
          ctx.stroke();
        } else {
          if (noise(k, 53) > Math.pow(1 - val, 1.3)) continue;
          ctx.strokeStyle = 'rgba(34,34,32,.42)';
          ctx.fillStyle = 'rgba(34,34,32,.75)';
          ctx.lineWidth = Math.max(0.6, r * 0.006);
          if (style === 'stipple') {
            ctx.beginPath();
            ctx.arc(mx, my, Math.max(0.7, r * 0.006), 0, Math.PI * 2);
            ctx.fill();
          } else if (style === 'scumble') {
            ctx.beginPath();
            ctx.ellipse(mx, my, r * 0.012, r * 0.007, noise(k, 63) * Math.PI, 0, Math.PI * 1.8);
            ctx.stroke();
          } else {
            var hdir = (style === 'crosshatch' && noise(k, 61) > 0.5) ? -0.75 : 0.75;
            var ml = r * 0.045;
            ctx.beginPath();
            ctx.moveTo(mx - ml * Math.cos(hdir), my - ml * Math.sin(hdir));
            ctx.lineTo(mx + ml * Math.cos(hdir), my + ml * Math.sin(hdir));
            ctx.stroke();
          }
        }
      }
    }

    if (guide.checked) {
      ctx.font = 'bold 11.5px sans-serif';
      function label(text, x, y, tx, ty) {
        ctx.strokeStyle = '#263d35';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x + 22, y - 5);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        var tw = ctx.measureText(text).width;
        var lxPos = clamp(x, 8, w - tw - 12);
        ctx.fillStyle = '#fffdf5';
        ctx.fillRect(lxPos - 4, y - 14, tw + 8, 18);
        ctx.strokeStyle = '#94a3b8';
        ctx.strokeRect(lxPos - 4, y - 14, tw + 8, 18);
        ctx.fillStyle = '#20382d';
        ctx.fillText(text, lxPos, y - 1);
      }
      var awayLen = Math.hypot(lx, ly) || 1;
      var sx = -lx / awayLen, sy = -ly / awayLen;
      label('1. Highlight', 10, 22, cx + hx * r * 0.72, cy + hy * r * 0.72);
      label('2. Halftone', w - 90, 22, cx, cy - r * 0.15);
      label('3. Core shadow', 10, h - 42, cx + sx * r * 0.62, cy + sy * r * 0.45);
      label('4. Reflected light', 10, h - 16, cx + sx * r * 0.5, cy + r * 0.76);
      label('5. Cast shadow', w - 110, h - 16, cx + shadowShift, cy + r * 0.96);
    }

    var deg = Math.abs(Number(light.value));
    lightValue.textContent = deg === 0 ? 'Center' : deg + '° ' + (Number(light.value) < 0 ? 'left' : 'right');
    elevationValue.textContent = elevation.value + '°';
    caption.textContent = descriptions[style][0];
    insight.textContent = descriptions[style][1];
  }

  SimKit.canvas2d(canvas, {
    onResize: function (c, w, h) {
      ctx = c;
      width = w;
      height = h;
      render();
    }
  });

  // Allow direct dragging on the light canvas to aim the lamp.
  var aiming = false;
  function aimFromPointer(e) {
    var rect = canvas.getBoundingClientRect();
    var nx = clamp((e.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
    var ny = clamp(1 - (e.clientY - rect.top) / rect.height, 0, 1);
    light.value = Math.round(nx * 75 / 5) * 5;
    elevation.value = Math.round((15 + ny * 60) / 5) * 5;
    render();
  }
  canvas.addEventListener('pointerdown', function (e) {
    aiming = true;
    canvas.setPointerCapture(e.pointerId);
    aimFromPointer(e);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (aiming) aimFromPointer(e);
  });
  canvas.addEventListener('pointerup', function () { aiming = false; });
  canvas.addEventListener('pointercancel', function () { aiming = false; });

  styles.forEach(function (input) {
    input.addEventListener('change', function () {
      style = this.value;
      render();
    });
  });

  shapeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      shape = btn.dataset.formShape;
      shapeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      render();
    });
  });

  light.addEventListener('input', render);
  elevation.addEventListener('input', render);
  guide.addEventListener('change', render);
  squint.addEventListener('change', function () {
    canvas.classList.toggle('is-squint', squint.checked);
  });

  document.getElementById('form-reset').addEventListener('click', function () {
    style = 'impression';
    shape = 'sphere';
    document.querySelector('input[name="form-style"][value="impression"]').checked = true;
    shapeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.formShape === 'sphere')); });
    light.value = -45;
    elevation.value = 35;
    guide.checked = false;
    squint.checked = false;
    canvas.classList.remove('is-squint');
    render();
  });

  // Tab switching + 5-Value Sketchpad
  var sketchCanvas = document.getElementById('sketch-canvas');
  var sketchCtx = sketchCanvas ? sketchCanvas.getContext('2d') : null;
  var sketchUndoStack = [];
  var activeColor = '#475569';
  var tool = 'pencil';
  var brushSize = document.getElementById('sketch-size');
  var brushVal = document.getElementById('sketch-size-val');
  var refSelect = document.getElementById('sketch-ref');
  var refGuides = document.getElementById('sketch-guides');
  var sketchHistory = [];

  function drawSketchBackground() {
    if (!sketchCtx) return;
    sketchCtx.fillStyle = '#ffffff';
    sketchCtx.fillRect(0, 0, sketchCanvas.width, sketchCanvas.height);
  }

  function redrawSketch() {
    if (!sketchCtx) return;
    drawSketchBackground();
    for (var i = 0; i < sketchHistory.length; i++) {
      var st = sketchHistory[i];
      if (st.pts.length < 2) continue;
      sketchCtx.save();
      sketchCtx.strokeStyle = st.color;
      sketchCtx.lineWidth = st.size;
      sketchCtx.lineCap = 'round';
      sketchCtx.lineJoin = 'round';
      sketchCtx.beginPath();
      sketchCtx.moveTo(st.pts[0][0], st.pts[0][1]);
      for (var j = 1; j < st.pts.length; j++) {
        sketchCtx.lineTo(st.pts[j][0], st.pts[j][1]);
      }
      sketchCtx.stroke();
      sketchCtx.restore();
    }
    var ref = refSelect ? refSelect.value : 'none';
    if (ref !== 'none') {
      sketchCtx.save();
      sketchCtx.strokeStyle = 'rgba(21, 94, 117, 0.35)';
      sketchCtx.lineWidth = 2;
      sketchCtx.setLineDash([6, 5]);
      var w = sketchCanvas.width, h = sketchCanvas.height;
      if (refGuides && refGuides.checked) {
        sketchCtx.strokeRect(w * 0.28, h * 0.14, w * 0.44, h * 0.72);
      }
      sketchCtx.beginPath();
      if (ref === 'sphere') {
        sketchCtx.arc(w * 0.5, h * 0.48, h * 0.28, 0, Math.PI * 2);
      } else if (ref === 'cylinder') {
        sketchCtx.ellipse(w * 0.5, h * 0.24, w * 0.14, h * 0.05, 0, 0, Math.PI * 2);
        sketchCtx.moveTo(w * 0.36, h * 0.24);
        sketchCtx.lineTo(w * 0.36, h * 0.74);
        sketchCtx.moveTo(w * 0.64, h * 0.24);
        sketchCtx.lineTo(w * 0.64, h * 0.74);
        sketchCtx.ellipse(w * 0.5, h * 0.74, w * 0.14, h * 0.05, 0, 0, Math.PI);
      } else if (ref === 'mug') {
        sketchCtx.ellipse(w * 0.46, h * 0.26, w * 0.13, h * 0.045, 0, 0, Math.PI * 2);
        sketchCtx.rect(w * 0.33, h * 0.26, w * 0.26, h * 0.48);
        sketchCtx.moveTo(w * 0.59, h * 0.34);
        sketchCtx.bezierCurveTo(w * 0.72, h * 0.34, w * 0.72, h * 0.64, w * 0.59, h * 0.64);
      }
      sketchCtx.stroke();
      sketchCtx.restore();
    }
  }

  if (sketchCanvas && sketchCtx) {
    drawSketchBackground();
    var activeStroke = null;
    function sketchPoint(e) {
      var r = sketchCanvas.getBoundingClientRect();
      return [
        (e.clientX - r.left) * (sketchCanvas.width / r.width),
        (e.clientY - r.top) * (sketchCanvas.height / r.height)
      ];
    }
    sketchCanvas.addEventListener('pointerdown', function (e) {
      sketchCanvas.setPointerCapture(e.pointerId);
      var pt = sketchPoint(e);
      activeStroke = {
        color: tool === 'eraser' ? '#ffffff' : activeColor,
        size: Number(brushSize ? brushSize.value : 8),
        pts: [pt, [pt[0] + 0.1, pt[1] + 0.1]]
      };
      sketchHistory.push(activeStroke);
      if (sketchHistory.length > 80) sketchHistory.shift();
      redrawSketch();
    });
    sketchCanvas.addEventListener('pointermove', function (e) {
      if (!activeStroke) return;
      activeStroke.pts.push(sketchPoint(e));
      redrawSketch();
    });
    function endStroke() { activeStroke = null; }
    sketchCanvas.addEventListener('pointerup', endStroke);
    sketchCanvas.addEventListener('pointercancel', endStroke);

    document.querySelectorAll('[data-sketch-value]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        tool = 'pencil';
        activeColor = btn.dataset.sketchValue;
        document.querySelectorAll('[data-sketch-value]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        document.getElementById('sketch-eraser')?.setAttribute('aria-pressed', 'false');
      });
    });

    document.getElementById('sketch-eraser')?.addEventListener('click', function () {
      tool = tool === 'eraser' ? 'pencil' : 'eraser';
      this.setAttribute('aria-pressed', String(tool === 'eraser'));
    });

    brushSize?.addEventListener('input', function () {
      if (brushVal) brushVal.textContent = brushSize.value + ' px';
    });
    refSelect?.addEventListener('change', redrawSketch);
    refGuides?.addEventListener('change', redrawSketch);

    document.getElementById('sketch-undo')?.addEventListener('click', function () {
      sketchHistory.pop();
      redrawSketch();
    });
    document.getElementById('sketch-clear')?.addEventListener('click', function () {
      sketchHistory = [];
      redrawSketch();
    });
    document.getElementById('sketch-export')?.addEventListener('click', function () {
      sketchCanvas.toBlob(function (blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'drawing-foundations-study.png';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      }, 'image/png');
    });
  }

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.dataset.formTab;
      tabBtns.forEach(function (b) { b.setAttribute('aria-selected', String(b === btn)); });
      tabPanels.forEach(function (p) { p.hidden = p.dataset.formPanel !== target; });
      if (target === 'lab') {
        requestAnimationFrame(function () { window.dispatchEvent(new Event('resize')); });
      }
    });
  });

  document.addEventListener('creation-app-resize', function () {
    window.dispatchEvent(new Event('resize'));
  });

  render();
}());
