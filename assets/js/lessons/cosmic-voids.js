/* Cosmic Voids lesson — lessons/cosmology/cosmic-voids.html
 *
 * 1. Grow a void: 2-D Zel'dovich-approximation cosmic web (x = q + D·Ψ(q)).
 * 2. Void ladder: logarithmic bar chart of void diameters (SVG, re-laid-out on resize).
 * 3. Earth's voids: zoom-out stepper from Earth to the observable universe.
 * 4. Check yourself: ranking game + multiple-choice quiz.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs, parent) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ════════════════════════════════════════════════════════════
     1. Cosmic web simulation
     ════════════════════════════════════════════════════════════ */
  (function initWeb() {
    var canvas = document.getElementById('cvWeb');
    if (!canvas || !window.SimKit) return;
    var stage = canvas.parentElement;
    var timeInput = document.getElementById('cvTime');
    var playBtn = document.getElementById('cvPlay');
    var reseedBtn = document.getElementById('cvReseed');
    var showVoids = document.getElementById('cvShowVoids');
    var birthMode = document.getElementById('cvBirth');
    var ageEl = document.getElementById('cvAge');
    var voidPctEl = document.getElementById('cvVoidPct');
    var thinPctEl = document.getElementById('cvThinPct');
    var minDenEl = document.getElementById('cvMinDen');
    var maxDenEl = document.getElementById('cvMaxDen');
    var probeEl = document.getElementById('cvProbe');

    var SIDE = 100;               // particles per side
    var N = SIDE * SIDE;
    var GRID = 25;                // void-finder cells per side
    var VOID_LEVEL = 0.2;         // fraction of mean density that counts as void
    var qx = new Float32Array(N), qy = new Float32Array(N);
    var px = new Float32Array(N), py = new Float32Array(N);
    var sx = new Float32Array(N), sy = new Float32Array(N);
    var born = new Uint8Array(N);
    var counts = new Float32Array(GRID * GRID);
    var smooth = new Float32Array(GRID * GRID);
    var probe = null;
    var seed = 7;
    var playing = false;

    var voidCanvas = document.createElement('canvas');
    voidCanvas.width = GRID; voidCanvas.height = GRID;
    var vctx = voidCanvas.getContext('2d');
    var vimg = vctx.createImageData(GRID, GRID);

    var view = SimKit.canvas2d(canvas, { box: stage, onResize: function () { draw(); } });

    function buildField() {
      var rand = mulberry32(seed * 9973 + 11);
      var modes = [];
      for (var kx = -9; kx <= 9; kx++) {
        for (var ky = 0; ky <= 9; ky++) {
          if (ky === 0 && kx <= 0) continue;            // one of each ±k pair
          var k = Math.sqrt(kx * kx + ky * ky);
          if (k < 1 || k > 9) continue;
          // Gaussian-ish amplitude with a red spectrum (big modes dominate the potential)
          var g = Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());
          modes.push({ kx: kx, ky: ky, a: g * Math.pow(k, -2.6), ph: rand() * Math.PI * 2 });
        }
      }
      var div = new Float32Array(N);
      var sum = 0, sum2 = 0;
      for (var j = 0; j < SIDE; j++) {
        for (var i = 0; i < SIDE; i++) {
          var n = j * SIDE + i;
          // jittered lattice: smooth start without a visible grid
          var x = (i + 0.5 + (rand() - 0.5) * 0.8) / SIDE, y = (j + 0.5 + (rand() - 0.5) * 0.8) / SIDE;
          qx[n] = x; qy[n] = y;
          var dx = 0, dy = 0, d = 0;
          for (var m = 0; m < modes.length; m++) {
            var md = modes[m];
            var arg = 2 * Math.PI * (md.kx * x + md.ky * y) + md.ph;
            var s = Math.sin(arg), c = Math.cos(arg);
            // Ψ = -∇φ with φ = Σ a cos(arg)
            dx += md.a * 2 * Math.PI * md.kx * s;
            dy += md.a * 2 * Math.PI * md.ky * s;
            d += md.a * 4 * Math.PI * Math.PI * (md.kx * md.kx + md.ky * md.ky) * c; // ∇·Ψ
          }
          sx[n] = dx; sy[n] = dy; div[n] = d;
          sum += d; sum2 += d * d;
        }
      }
      // Normalise so the linear density contrast δ = -∇·Ψ has σ = 1.8 "today"
      var sigma = Math.sqrt(sum2 / N - (sum / N) * (sum / N)) || 1;
      var scale = 1.8 / sigma;
      for (var p = 0; p < N; p++) {
        sx[p] *= scale; sy[p] *= scale;
        born[p] = (-div[p] / sigma) < -0.8 ? 1 : 0;   // began in a slightly thin spot
      }
    }

    function growth() { return timeInput.value / 1000; }

    function step() {
      var D = growth();
      for (var n = 0; n < N; n++) {
        var x = qx[n] + D * sx[n], y = qy[n] + D * sy[n];
        px[n] = x - Math.floor(x);
        py[n] = y - Math.floor(y);
      }
      counts.fill(0);
      for (var p = 0; p < N; p++) {
        var cx = Math.min(GRID - 1, (px[p] * GRID) | 0);
        var cy = Math.min(GRID - 1, (py[p] * GRID) | 0);
        counts[cy * GRID + cx] += 1;
      }
      var mean = N / (GRID * GRID);
      var voidCells = 0, thinCells = 0, minD = Infinity, maxD = 0;
      for (var j = 0; j < GRID; j++) {
        for (var i = 0; i < GRID; i++) {
          var acc = 0;
          for (var b = -1; b <= 1; b++) {
            for (var a = -1; a <= 1; a++) {
              var w = (a === 0 && b === 0) ? 4 : (a === 0 || b === 0) ? 2 : 1;
              acc += w * counts[((j + b + GRID) % GRID) * GRID + ((i + a + GRID) % GRID)];
            }
          }
          var rho = acc / 16 / mean;
          smooth[j * GRID + i] = rho;
          if (rho < VOID_LEVEL) voidCells++;
          if (rho < 1) thinCells++;
          if (rho < minD) minD = rho;
          if (rho > maxD) maxD = rho;
        }
      }
      thinPctEl.textContent = Math.round(100 * thinCells / (GRID * GRID)) + '%';
      voidPctEl.textContent = Math.round(100 * voidCells / (GRID * GRID)) + '%';
      minDenEl.textContent = Math.round(minD * 100) + '%';
      maxDenEl.textContent = maxD.toFixed(1) + '×';

      ageEl.textContent = 'Model growth: ' + Math.round(D * 100) + '%' + (D === 0 ? ' · smooth start' : D === 1 ? ' · late stage' : '');
      timeInput.setAttribute('aria-valuetext', Math.round(D * 100) + ' percent model growth');
    }

    function geometry() {
      var w = view.width, h = view.height;
      var s = Math.min(w, h);
      return { s: s, ox: (w - s) / 2, oy: (h - s) / 2, w: w, h: h };
    }

    function draw() {
      if (!view) return;
      var ctx = view.ctx, g = geometry();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#02040b';
      ctx.fillRect(0, 0, g.w, g.h);

      if (showVoids.checked) {
        var data = vimg.data;
        for (var c = 0; c < GRID * GRID; c++) {
          var rho = smooth[c];
          var alpha = rho < VOID_LEVEL ? 150 : 0;
          data[c * 4] = 120; data[c * 4 + 1] = 90; data[c * 4 + 2] = 255; data[c * 4 + 3] = alpha;
        }
        vctx.putImageData(vimg, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.globalAlpha = 0.55;
        ctx.drawImage(voidCanvas, g.ox, g.oy, g.s, g.s);
        ctx.globalAlpha = 1;
      }

      ctx.globalCompositeOperation = 'lighter';
      var dot = Math.max(1.1, g.s / 420);
      var birth = birthMode.checked;
      ctx.fillStyle = 'rgba(255, 196, 130, 0.5)';
      for (var n = 0; n < N; n++) {
        if (birth && born[n]) continue;
        ctx.fillRect(g.ox + px[n] * g.s, g.oy + py[n] * g.s, dot, dot);
      }
      if (birth) {
        ctx.fillStyle = 'rgba(95, 212, 255, 0.85)';
        for (var b = 0; b < N; b++) {
          if (born[b]) ctx.fillRect(g.ox + px[b] * g.s, g.oy + py[b] * g.s, dot * 1.2, dot * 1.2);
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      if (probe) drawProbe(ctx, g);
    }

    var PROBE_R = 0.045;
    function measureProbe() {
      if (!probe) return 0;
      var r2 = PROBE_R * PROBE_R, inside = 0;
      for (var n = 0; n < N; n++) {
        var dx = Math.abs(px[n] - probe.x); if (dx > 0.5) dx = 1 - dx;
        var dy = Math.abs(py[n] - probe.y); if (dy > 0.5) dy = 1 - dy;
        if (dx * dx + dy * dy < r2) inside++;
      }
      return inside / (N * Math.PI * r2);
    }

    function drawProbe(ctx, g) {
      var rho = measureProbe();
      var cx = g.ox + probe.x * g.s, cy = g.oy + probe.y * g.s, r = PROBE_R * g.s;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      var kind = rho < VOID_LEVEL ? 'deep void by this model threshold' : rho < 0.8 ? 'a below-average region'
        : rho < 2 ? 'a region near average density' : rho < 5 ? 'a dense region' : 'a very dense region';
      probeEl.innerHTML = 'Probe: <strong>' + (rho < 1 ? Math.round(rho * 100) + '% of average' : rho.toFixed(1) + '× average') +
        '</strong>: ' + kind + '.';
    }

    function refresh() { step(); draw(); }

    canvas.addEventListener('click', function (e) {
      var rect = canvas.getBoundingClientRect(), g = geometry();
      var x = (e.clientX - rect.left - g.ox) / g.s, y = (e.clientY - rect.top - g.oy) / g.s;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      probe = { x: x, y: y };
      draw();
    });
    canvas.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); probe = probe || { x: 0.5, y: 0.5 }; draw(); return;
      }
      var directions = { ArrowRight: [0.025, 0], ArrowLeft: [-0.025, 0], ArrowUp: [0, -0.025], ArrowDown: [0, 0.025] };
      var dir = directions[e.key];
      if (!dir) return;
      e.preventDefault();
      probe = probe || { x: 0.5, y: 0.5 };
      probe.x = (probe.x + dir[0] + 1) % 1;
      probe.y = (probe.y + dir[1] + 1) % 1;
      draw();
    });

    timeInput.addEventListener('input', function () { stop(); refresh(); });
    showVoids.addEventListener('change', draw);
    birthMode.addEventListener('change', draw);
    reseedBtn.addEventListener('click', function () {
      stop(); seed = (seed * 31 + 17) % 100003;
      timeInput.value = 0; probe = null;
      probeEl.textContent = 'New pattern. Click the map or press Enter on the focused map to place a probe.';
      buildField(); refresh();
    });

    var loop = null;
    function stop() {
      playing = false;
      playBtn.textContent = '▶ Play';
      if (loop) { loop.stop(); loop = null; }
    }
    playBtn.addEventListener('click', function () {
      if (playing) { stop(); return; }
      if (+timeInput.value >= 1000) timeInput.value = 0;
      playing = true;
      playBtn.textContent = '⏸ Pause';
      loop = SimKit.loop(function (dt) {
        var v = Math.min(1000, +timeInput.value + Math.min(dt, 0.1) * 1000 / 7);
        timeInput.value = v;
        refresh();
        if (v >= 1000) stop();
      });
    });

    document.getElementById('cvReset').addEventListener('click', function () {
      stop(); timeInput.value = 0; refresh();
    });
    var records = [];
    var rows = document.getElementById('cvRecords');
    var recordStatus = document.getElementById('cvRecordStatus');
    document.getElementById('cvRecord').addEventListener('click', function () {
      stop();
      if (records.length >= 12) { recordStatus.textContent = 'Twelve stages recorded. Download your investigation or clear measurements to start again.'; return; }
      var entry = [seed + ' / ' + Math.round(growth() * 100) + '%', thinPctEl.textContent, voidPctEl.textContent,
        probe ? measureProbe().toFixed(2) + '× average at (' + probe.x.toFixed(2) + ', ' + probe.y.toFixed(2) + ')' : 'No probe placed'];
      if (!records.length) rows.textContent = '';
      records.push(entry);
      var row = document.createElement('tr');
      entry.forEach(function (value) { var cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell); });
      rows.appendChild(row);
      recordStatus.textContent = records.length + ' stage(s) recorded. Compare measurements from the same pattern.';
    });
    document.getElementById('cvClearRecords').addEventListener('click', function () {
      records = []; rows.innerHTML = '<tr><td colspan="4">Record a start and a later stage to compare.</td></tr>';
      recordStatus.textContent = 'Measurements cleared.';
    });
    document.getElementById('cvExport').addEventListener('click', function () {
      var report = 'Cosmic voids investigation\n\nPrediction: ' + document.getElementById('cvPrediction').value +
        '\n\nPattern / model stage | area below average | deep void area | probe density\n' + records.map(function (r) { return r.join(' | '); }).join('\n') +
        '\n\nExplanation: ' + document.getElementById('cvExplanation').value +
        '\n\nModel limits: 2-D Zel\'dovich approximation; fixed particle count; periodic edges; 20% density threshold. Growth is not calibrated cosmic time.\n';
      var url = URL.createObjectURL(new Blob([report], { type: 'text/plain' }));
      var link = document.createElement('a'); link.href = url; link.download = 'cosmic-voids-investigation.txt'; link.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      recordStatus.textContent = 'Investigation downloaded.';
    });

    buildField();
    refresh();
  })();

  /* ════════════════════════════════════════════════════════════
     2. Void ladder (log-scale bar chart)
     ════════════════════════════════════════════════════════════ */
  var VOIDS = [
    { id: 'kbc', name: 'KBC Void', lo: 2e9, hi: 2e9, label: '~2 billion ly', debated: true },
    { id: 'eridanus', name: 'Eridanus Supervoid', lo: 5e8, hi: 1.8e9, label: '0.5–1.8 billion ly', debated: true },
    { id: 'giant', name: 'Giant Void', lo: 1e9, hi: 1.3e9, label: '1–1.3 billion ly' },
    { id: 'bootes', name: 'Boötes Void', lo: 3.3e8, hi: 3.3e8, label: '~330 million ly' },
    { id: 'local', name: 'Local Void', lo: 1.5e8, hi: 1.5e8, label: '150+ million ly', more: true },
    { id: 'typical', name: 'Typical voids', lo: 3e7, hi: 3e8, label: '30–300 million ly' },
    { id: 'mini', name: 'Minivoids', lo: 2e6, hi: 1.5e7, label: '2–15 million ly' },
    { id: 'bubble', name: 'Local Bubble', lo: 1e3, hi: 1e3, label: '~1,000 ly · gas cavity', target: 'address' }
  ];
  var REFS = [
    { v: 1e5, label: 'Milky Way' },
    { v: 2.5e6, label: 'to Andromeda' },
    { v: 9.3e10, label: 'Observable universe' }
  ];

  (function initLadder() {
    var svg = document.getElementById('cvLadder');
    if (!svg) return;
    var wrap = svg.parentElement;
    var MIN = 2, MAX = 11;   // log10 light-years
    var active = null;

    function fmtTick(e) {
      return ['100 ly', '1,000 ly', '10k ly', '100k ly', '1 million', '10 million', '100 million', '1 billion', '10 billion', '100 billion'][e - 2];
    }

    function render() {
      var W = Math.max(300, Math.round(wrap.clientWidth - 12));
      var narrow = W < 640;
      var left = narrow ? 8 : 178, right = narrow ? 14 : 26;
      var rowH = narrow ? 50 : 40, top = 30;
      var plotW = W - left - right;
      var H = top + VOIDS.length * rowH + 30;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('width', W);
      svg.setAttribute('height', H);
      function X(v) { return left + (Math.log10(v) - MIN) / (MAX - MIN) * plotW; }

      var defs = svgEl('defs', {}, svg);
      var pat = svgEl('pattern', { id: 'cvHatch', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      svgEl('rect', { width: 8, height: 8, fill: '#a58bff' }, pat);
      svgEl('rect', { width: 3.5, height: 8, fill: '#ffd166' }, pat);
      var grad = svgEl('linearGradient', { id: 'cvBarGrad', x1: 0, x2: 1 }, defs);
      svgEl('stop', { offset: '0%', 'stop-color': '#3f8cff' }, grad);
      svgEl('stop', { offset: '100%', 'stop-color': '#a58bff' }, grad);

      // decade grid
      for (var e = MIN; e <= MAX; e++) {
        var x = X(Math.pow(10, e));
        svgEl('line', { x1: x, x2: x, y1: top - 6, y2: H - 24, stroke: '#26345a', 'stroke-width': 1 }, svg);
        if (!narrow || e % 3 === 2) {
          var t = svgEl('text', { x: x, y: H - 8, fill: '#aab6cf', 'font-size': 11, 'text-anchor': 'middle' }, svg);
          t.textContent = fmtTick(e);
        }
      }
      REFS.forEach(function (r) {
        var x = X(r.v);
        svgEl('line', { x1: x, x2: x, y1: top - 10, y2: H - 24, stroke: '#ffd29a', 'stroke-width': 1.2, 'stroke-dasharray': '3 4', opacity: 0.8 }, svg);
        var t = svgEl('text', { x: x, y: top - 14, fill: '#ffd29a', 'font-size': 10.5, 'text-anchor': r.v > 1e10 ? 'end' : 'middle' }, svg);
        t.textContent = r.label;
      });

      VOIDS.forEach(function (v, i) {
        var y = top + i * rowH;
        var g = svgEl('g', { class: 'cv-bar-row' + (active === v.id ? ' is-active' : ''), tabindex: 0, role: 'button',
          'aria-label': v.name + ', ' + v.label + (v.debated ? ', debated' : '') + '. Show details.' }, svg);
        svgEl('rect', { class: 'cv-bar-hit', x: 0, y: y, width: W, height: rowH - 4, rx: 8, fill: 'transparent' }, g);
        var barY = narrow ? y + 22 : y + 9, barH = narrow ? 16 : 18;
        var x0 = X(Math.pow(10, MIN)), xLo = X(v.lo), xHi = X(v.hi);
        var fill = v.debated ? 'url(#cvHatch)' : v.id === 'bubble' ? '#5fd4ff' : 'url(#cvBarGrad)';
        svgEl('rect', { x: x0, y: barY, width: Math.max(2, xLo - x0), height: barH, rx: 4, fill: fill }, g);
        if (xHi > xLo + 1) svgEl('rect', { x: xLo, y: barY, width: xHi - xLo, height: barH, rx: 4, fill: fill, opacity: 0.45 }, g);
        if (v.more) svgEl('path', { d: 'M' + (xLo + 4) + ' ' + (barY + 3) + ' l10 ' + (barH / 2 - 3) + ' l-10 ' + (barH / 2 - 3), fill: 'none', stroke: '#a58bff', 'stroke-width': 2 }, g);
        var name = svgEl('text', { x: narrow ? left : left - 10, y: narrow ? y + 15 : y + 23, fill: '#ffffff', 'font-size': 13, 'font-weight': 700, 'text-anchor': narrow ? 'start' : 'end' }, g);
        name.textContent = v.name;
        var lblX = xHi + (v.more ? 20 : 8);
        var anchorEnd = lblX > W - 150;
        var lbl = svgEl('text', { x: anchorEnd ? (narrow ? W - right : xLo - 8) : lblX, y: narrow ? y + 15 : y + 23, fill: '#aab6cf', 'font-size': 12, 'text-anchor': anchorEnd ? 'end' : 'start' }, g);
        lbl.textContent = v.label;
        if (anchorEnd && !narrow) lbl.setAttribute('fill', '#0b0820');
        if (anchorEnd && !narrow) lbl.setAttribute('font-weight', '700');
        function go() { activate(v); }
        g.addEventListener('click', go);
        g.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); }
        });
      });
    }

    function activate(v) {
      active = v.id;
      render();
      var target = document.getElementById(v.target || ('void-' + v.id));
      if (!target) return;
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      target.classList.remove('is-flash');
      void target.offsetWidth;
      target.classList.add('is-flash');
      setTimeout(function () { target.classList.remove('is-flash'); }, 1800);
    }

    if (window.ResizeObserver) new ResizeObserver(render).observe(wrap);
    else window.addEventListener('resize', render);
    render();
  })();

  /* ════════════════════════════════════════════════════════════
     3. Earth's voids — zoom-out stepper
     ════════════════════════════════════════════════════════════ */
  var LEVELS = [
    { name: 'Earth', km: 12742, size: '12,742 km across', art: 'earth',
      text: 'Home. A planet inside a galaxy; cosmic voids describe the distribution of galaxies on much larger scales.' },
    { name: 'The Solar System', km: 9e9, size: '~9 billion km across Neptune\'s orbit', art: 'solar',
      text: 'Eight planets, and all of them together fill almost none of it. Light needs about 8 hours to cross from one side of Neptune\'s orbit to the other.' },
    { name: 'Local Interstellar Cloud', km: 2.8e14, size: '~30 light-years across', art: 'cloud',
      text: 'A wispy cloud of warm gas that the Sun has been passing through for tens of thousands of years. We may be right at its edge.' },
    { name: 'The Local Bubble', km: 9.5e15, size: '~1,000 light-years across', art: 'bubble', isVoid: true,
      text: 'A cavity in the Milky Way\'s gas carved by roughly 14–20 supernovae over the last 10–20 million years. Its gas is about a tenth as dense as average.',
      voidText: 'Home is inside a gas cavity, not a cosmic void between galaxies. In 2022, astronomers showed that nearly every young star-forming cloud near the Sun sits on the surface of this bubble. Its expansion is still building new stars.' },
    { name: 'The Milky Way', km: 9.5e17, size: '~100,000 light-years across', art: 'galaxy', off: [0.52, 0.18],
      text: 'Our Sun is one of a few hundred billion stars, about 26,000 light-years from the center, in a small spiral arm called the Orion Spur.' },
    { name: 'The Local Group', km: 9.5e19, size: '~10 million light-years across', art: 'group', off: [-0.32, 0.12],
      text: 'The Milky Way, Andromeda, Triangulum, and dozens of dwarf galaxies, bound by gravity. Minivoids sit in the gaps around groups like this one.' },
    { name: 'The Local Sheet', km: 3.2e20, size: '~34 million ly wide, only ~1.5 million ly thick', art: 'sheet', isVoid: true, off: [0.08, 0.02],
      text: 'Nearly every bright galaxy near us lies in this thin, flat wall.',
      voidText: 'Home is in a wall. The Local Sheet is one side of the Local Void, like the film on a soap bubble.' },
    { name: 'The Local Void', km: 1.4e21, size: '150+ million light-years across', art: 'void', isVoid: true, off: [0, 0.86],
      text: 'Right next door, a region with almost no galaxies. It is hard to study because it lies behind the dusty center of our own galaxy.',
      voidText: 'Home is on the edge of a void. As the void grows, the Local Group moves away from it at about 259 km/s.' },
    { name: 'Laniakea Supercluster', km: 4.9e21, size: '~520 million light-years across', art: 'laniakea', off: [-0.3, -0.2],
      text: 'About 100,000 galaxies whose motions all drain toward the Great Attractor, like rivers in one watershed. Laniakea is Hawaiian for "immeasurable heaven".' },
    { name: 'The KBC Void (if real)', km: 1.9e22, size: '~2 billion light-years across · debated', art: 'kbc', isVoid: true, off: [0.06, 0.04],
      text: 'Galaxy counts suggest our whole region is about 20–30% below average density. Other studies disagree.',
      voidText: 'Home may be inside a large underdense region. If it is real, Laniakea and everything around it lie inside, and it could help explain the Hubble tension.' },
    { name: 'The Observable Universe', km: 8.8e23, size: '~93 billion light-years across', art: 'universe', off: [0.04, -0.03],
      text: 'As far as light has had time to reach us. Voids fill most of this volume, and the galaxies trace the foam between them.' }
  ];

  function drawArt(kind, g, rand) {
    var R = 170;
    function dots(n, fn, color, rMin, rMax, op) {
      for (var i = 0; i < n; i++) {
        var p = fn(i);
        if (!p) continue;
        svgEl('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: (rMin + rand() * (rMax - rMin)).toFixed(2), fill: color, opacity: op == null ? 1 : op }, g);
      }
    }
    function inDisk(scale) { return function () { var a = rand() * 6.283, r = Math.sqrt(rand()) * R * (scale || 1); return [Math.cos(a) * r, Math.sin(a) * r]; }; }
    switch (kind) {
      case 'earth':
        svgEl('circle', { r: R, fill: '#1f5fb4' }, g);
        svgEl('path', { d: 'M-90 -110 q40 -30 80 0 q30 40 -10 70 q-40 10 -60 -10 q-30 -30 -10 -60z M30 20 q50 -20 90 20 q10 50 -30 80 q-50 20 -70 -20 q-10 -40 10 -80z M-140 30 q20 -10 40 10 q0 30 -20 40 q-30 -10 -20 -50z', fill: '#3fa86b' }, g);
        svgEl('circle', { r: R, fill: 'none', stroke: '#9fd3ff', 'stroke-width': 6, opacity: 0.5 }, g);
        break;
      case 'solar':
        [26, 40, 54, 70, 104, 128, 150, 166].forEach(function (r) { svgEl('circle', { r: r, fill: 'none', stroke: '#3a4a72', 'stroke-width': 1 }, g); });
        svgEl('circle', { r: 11, fill: '#ffd166' }, g);
        [[26, 2, '#bbb'], [40, 3, '#f3c27a'], [54, 3.4, '#4da3ff'], [70, 2.6, '#e0704a'], [104, 8, '#e8c087'], [128, 7, '#f0d9a0'], [150, 5, '#9fe7f5'], [166, 5, '#5b7bff']].forEach(function (p) {
          var a = rand() * 6.283; svgEl('circle', { cx: Math.cos(a) * p[0], cy: Math.sin(a) * p[0], r: p[1], fill: p[2] }, g);
        });
        break;
      case 'cloud':
        for (var c = 0; c < 9; c++) {
          svgEl('circle', { cx: (rand() - 0.5) * 160, cy: (rand() - 0.5) * 140, r: 70 + rand() * 60, fill: '#6fa8ff', opacity: 0.09 }, g);
        }
        dots(14, inDisk(0.95), '#fff3d6', 1.2, 2.6);
        break;
      case 'bubble':
        svgEl('circle', { r: R, fill: '#2a1d5c', opacity: 0.45 }, g);
        svgEl('circle', { r: R - 6, fill: 'none', stroke: '#a58bff', 'stroke-width': 12, opacity: 0.35 }, g);
        dots(60, function () { var a = rand() * 6.283, r = R - 10 + rand() * 14; return [Math.cos(a) * r, Math.sin(a) * r]; }, '#ffd29a', 1, 2.4);
        dots(20, inDisk(0.85), '#fff3d6', 0.8, 1.6, 0.8);
        break;
      case 'galaxy':
        svgEl('ellipse', { rx: 40, ry: 40, fill: '#ffe2b0', opacity: 0.5 }, g);
        for (var arm = 0; arm < 2; arm++) {
          dots(260, function (i) {
            var t = i / 260, a = arm * Math.PI + t * 5.2, r = 18 + t * 150;
            return [Math.cos(a) * r + (rand() - 0.5) * 22, Math.sin(a) * r + (rand() - 0.5) * 22];
          }, '#cfe0ff', 0.6, 1.6, 0.8);
        }
        dots(140, inDisk(0.5), '#ffe2b0', 0.6, 1.4, 0.7);
        break;
      case 'group':
        function spiral(cx, cy, s, tilt) {
          svgEl('ellipse', { cx: cx, cy: cy, rx: 34 * s, ry: 14 * s, fill: '#cfe0ff', opacity: 0.85, transform: 'rotate(' + tilt + ' ' + cx + ' ' + cy + ')' }, g);
          svgEl('ellipse', { cx: cx, cy: cy, rx: 10 * s, ry: 6 * s, fill: '#fff3d6', transform: 'rotate(' + tilt + ' ' + cx + ' ' + cy + ')' }, g);
        }
        spiral(70, -30, 1.2, -30);
        spiral(10, 60, 0.6, 20);
        dots(46, inDisk(0.9), '#cfe0ff', 1, 2.6, 0.75);
        break;
      case 'sheet':
        svgEl('ellipse', { rx: R, ry: 34, fill: '#3f8cff', opacity: 0.12 }, g);
        dots(140, function () { return [(rand() - 0.5) * 2 * R * 0.95, (rand() - 0.5) * 50]; }, '#cfe0ff', 0.8, 2.4, 0.85);
        svgEl('text', { y: -60, fill: '#a58bff', 'font-size': 14, 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif' }, g).textContent = 'Local Void ↑';
        break;
      case 'void':
        svgEl('circle', { r: R, fill: '#1a1240', opacity: 0.6 }, g);
        dots(220, function () { var a = rand() * 6.283, r = R - 4 + rand() * 10; return [Math.cos(a) * r, Math.sin(a) * r]; }, '#cfe0ff', 0.8, 2, 0.85);
        dots(6, inDisk(0.7), '#cfe0ff', 1, 2);
        svgEl('text', { y: -20, fill: '#a58bff', 'font-size': 18, 'font-weight': 700, 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif' }, g).textContent = 'almost nothing';
        break;
      case 'laniakea':
        for (var s = 0; s < 14; s++) {
          var a0 = rand() * 6.283;
          dots(26, function (i) {
            var t = i / 26, r = R * (1 - t * 0.9), a = a0 + t * 0.9 * (s % 2 ? 1 : -1);
            return [Math.cos(a) * r + 30, Math.sin(a) * r + 20];
          }, '#cfe0ff', 0.6, 1.8, 0.8);
        }
        svgEl('circle', { cx: 30, cy: 20, r: 9, fill: '#ffd29a' }, g);
        svgEl('text', { x: 30, y: 46, fill: '#ffd29a', 'font-size': 12, 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif' }, g).textContent = 'Great Attractor';
        break;
      case 'kbc':
        svgEl('circle', { r: R, fill: '#2a1d5c', opacity: 0.35 }, g);
        svgEl('circle', { r: R, fill: 'none', stroke: '#ffd166', 'stroke-width': 2, 'stroke-dasharray': '8 6' }, g);
        dots(160, inDisk(0.98), '#cfe0ff', 0.6, 1.6, 0.55);
        break;
      case 'universe':
        // foam: void bubbles with galaxies crowded onto their rims
        var bubbles = [];
        for (var tries = 0; tries < 400 && bubbles.length < 18; tries++) {
          var br = 22 + rand() * 34, ba = rand() * 6.283, bd = Math.sqrt(rand()) * (R - br);
          var bx = Math.cos(ba) * bd, by = Math.sin(ba) * bd;
          if (bubbles.every(function (o) { return Math.hypot(o[0] - bx, o[1] - by) > o[2] + br - 6; })) bubbles.push([bx, by, br]);
        }
        bubbles.forEach(function (o) {
          svgEl('circle', { cx: o[0], cy: o[1], r: o[2], fill: '#1a1240', opacity: 0.55, stroke: '#7cc4ff', 'stroke-width': 0.8, 'stroke-opacity': 0.35 }, g);
          dots(Math.round(o[2] * 0.9), function () { var a = rand() * 6.283, r = o[2] + (rand() - 0.5) * 4; return [o[0] + Math.cos(a) * r, o[1] + Math.sin(a) * r]; }, '#ffd29a', 0.5, 1.4, 0.85);
        });
        svgEl('circle', { r: R, fill: 'none', stroke: '#7cc4ff', 'stroke-width': 1.5, opacity: 0.6 }, g);
        break;
    }
  }

  (function initZoom() {
    var svg = document.getElementById('cvZoomSvg');
    if (!svg) return;
    var stepEl = document.getElementById('cvZoomStep');
    var nameEl = document.getElementById('cvZoomName');
    var sizeEl = document.getElementById('cvZoomSize');
    var textEl = document.getElementById('cvZoomText');
    var voidEl = document.getElementById('cvZoomVoid');
    var inBtn = document.getElementById('cvZoomIn');
    var outBtn = document.getElementById('cvZoomOut');
    var chips = document.getElementById('cvZoomChips');
    var idx = 0;

    LEVELS.forEach(function (lv, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = lv.name.replace(/^The /, '').replace(' (if real)', '');
      if (lv.isVoid) b.className = 'is-void';
      b.addEventListener('click', function () { go(i, false); });
      chips.appendChild(b);
    });

    function factor(a, b) {
      var f = a / b;
      if (f >= 1e6) return Math.round(f / 1e6).toLocaleString() + ' million';
      if (f >= 1e3) return Math.round(f).toLocaleString();
      return Math.round(f).toString();
    }

    function go(i, animate) {
      idx = i;
      var lv = LEVELS[i];
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svgEl('rect', { width: 400, height: 400, fill: '#02040b' }, svg);
      var stars = mulberry32(i * 101 + 5);
      for (var s = 0; s < 70; s++) svgEl('circle', { cx: stars() * 400, cy: stars() * 400, r: stars() * 0.9 + 0.2, fill: '#ffffff', opacity: 0.35 }, svg);

      var outer = svgEl('g', { transform: 'translate(200 200)' }, svg);
      drawArt(lv.art, outer, mulberry32(i * 977 + 3));

      if (i > 0) {
        var off = lv.off || [0, 0];
        var tx = 200 + off[0] * 170, ty = 200 + off[1] * 170;
        var small = 0.045;
        var inner = svgEl('g', { class: 'cv-zoom-inner' }, svg);
        inner.style.transformOrigin = '0 0';
        var innerArt = svgEl('g', {}, inner);
        drawArt(LEVELS[i - 1].art, innerArt, mulberry32((i - 1) * 977 + 3));
        var finalT = 'translate(' + tx + 'px,' + ty + 'px) scale(' + small + ')';
        if (animate && !reduceMotion) {
          inner.style.transition = 'none';
          inner.style.transform = 'translate(200px,200px) scale(1)';
          inner.getBoundingClientRect();
          inner.style.transition = '';
          requestAnimationFrame(function () { inner.style.transform = finalT; });
        } else {
          inner.style.transform = finalT;
        }
        // "you are here" marker
        var mark = svgEl('g', {}, svg);
        svgEl('circle', { cx: tx, cy: ty, r: 13, fill: 'none', stroke: '#ffffff', 'stroke-width': 2 }, mark);
        var lx = tx > 260 ? tx - 18 : tx + 18;
        var ly = ty > 340 ? ty - 20 : ty - 16;
        var label = svgEl('text', { x: lx, y: ly, fill: '#ffffff', 'font-size': 13, 'font-weight': 700, 'text-anchor': tx > 260 ? 'end' : 'start', 'font-family': 'Inter, sans-serif', 'paint-order': 'stroke', stroke: '#02040b', 'stroke-width': 4 }, mark);
        label.textContent = LEVELS[i - 1].name.replace(/^The /, '').replace(' (if real)', '') + ' is here';
      }

      stepEl.textContent = 'Step ' + (i + 1) + ' of ' + LEVELS.length;
      nameEl.textContent = lv.name;
      sizeEl.textContent = lv.size + (i > 0 ? ' · about ' + factor(lv.km, LEVELS[i - 1].km) + '× wider than the last step' : '');
      textEl.textContent = lv.text;
      if (lv.voidText) { voidEl.hidden = false; voidEl.textContent = '◌ ' + lv.voidText; }
      else voidEl.hidden = true;
      inBtn.disabled = i === 0;
      outBtn.disabled = i === LEVELS.length - 1;
      Array.prototype.forEach.call(chips.children, function (b, j) {
        if (j === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
    }

    outBtn.addEventListener('click', function () { if (idx < LEVELS.length - 1) go(idx + 1, true); });
    inBtn.addEventListener('click', function () { if (idx > 0) go(idx - 1, false); });
    go(0, false);
  })();

  /* ════════════════════════════════════════════════════════════
     4. Check yourself
     ════════════════════════════════════════════════════════════ */
  (function initRank() {
    var list = document.getElementById('cvRankList');
    if (!list) return;
    var feedback = document.getElementById('cvRankFeedback');
    var ITEMS = [
      { name: 'KBC Void', size: '~2 billion ly', v: 2e9 },
      { name: 'Giant Void', size: '1–1.3 billion ly', v: 1.15e9 },
      { name: 'Boötes Void', size: '~330 million ly', v: 3.3e8 },
      { name: 'A typical void', size: '30–300 million ly', v: 1e8 },
      { name: 'A minivoid', size: '2–15 million ly', v: 6e6 },
      { name: 'The Local Bubble', size: '~1,000 ly', v: 1e3 }
    ];
    var order = [];
    var revealed = false;

    function shuffle() {
      order = ITEMS.slice();
      do {
        for (var i = order.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t;
        }
      } while (order.every(function (it, k) { return it === ITEMS[k]; }));
      revealed = false;
      feedback.textContent = '';
      render();
    }

    function move(i, d) {
      var j = i + d;
      if (j < 0 || j >= order.length) return;
      var t = order[i]; order[i] = order[j]; order[j] = t;
      revealed = false;
      feedback.textContent = '';
      render(j, d);
    }

    function render(focusIndex, dir) {
      list.innerHTML = '';
      order.forEach(function (it, i) {
        var li = document.createElement('li');
        if (revealed) li.className = it === ITEMS[i] ? 'is-right' : 'is-wrong';
        var name = document.createElement('span');
        name.className = 'cv-rank-name';
        name.textContent = it.name;
        li.appendChild(name);
        if (revealed) {
          var sz = document.createElement('span');
          sz.className = 'cv-rank-size';
          sz.textContent = it.size;
          li.appendChild(sz);
        }
        var mv = document.createElement('span');
        mv.className = 'cv-rank-move';
        [['↑', -1, 'Move ' + it.name + ' up'], ['↓', 1, 'Move ' + it.name + ' down']].forEach(function (b) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = b[0];
          btn.setAttribute('aria-label', b[2]);
          btn.disabled = (b[1] < 0 && i === 0) || (b[1] > 0 && i === order.length - 1);
          btn.addEventListener('click', function () { move(i, b[1]); });
          mv.appendChild(btn);
        });
        li.appendChild(mv);
        list.appendChild(li);
      });
      if (focusIndex != null) {
        var btns = list.children[focusIndex].querySelectorAll('button');
        var target = dir < 0 ? btns[0] : btns[1];
        if (target.disabled) target = dir < 0 ? btns[1] : btns[0];
        target.focus();
      }
    }

    document.getElementById('cvRankCheck').addEventListener('click', function () {
      revealed = true;
      render();
      var right = order.filter(function (it, i) { return it === ITEMS[i]; }).length;
      feedback.textContent = right === ITEMS.length
        ? 'All 6 in order. From a possible 2-billion-light-year void down to a 1,000-light-year bubble is a factor of two million.'
        : right + ' of 6 are in the right place. The sizes are now shown, so adjust the order and check again.';
      feedback.style.color = right === ITEMS.length ? '#6fe3a5' : '#ffd166';
    });
    document.getElementById('cvRankShuffle').addEventListener('click', shuffle);
    shuffle();
  })();

  (function initQuiz() {
    var host = document.getElementById('cvQuiz');
    if (!host) return;
    var feedback = document.getElementById('cvQuizFeedback');
    var QS = [
      { q: 'Voids fill most of the universe\'s volume. Where do most galaxies live?',
        a: ['Inside voids, because there is so much room', 'In walls, filaments, and clusters around the voids', 'Spread evenly through all of space'], c: 1,
        why: 'Like soap film in foam, galaxies crowd into thin walls and threads. The bubbles take up the space, and the film holds the material.' },
      { q: 'Why does a void get emptier over time?',
        a: ['Dark energy destroys the galaxies inside it', 'Black holes in the middle swallow matter', 'Its denser surroundings pull matter outward, toward the walls'], c: 2,
        why: 'Gravity pulls toward more mass. The walls have more mass than the void, so matter drains out of the void and piles onto its edges.' },
      { q: 'The Milky Way sits on the edge of the Local Void. Which way is it moving relative to the void?',
        a: ['Away from it, at about 259 km/s', 'Into it, because empty space sucks matter in', 'Not at all'], c: 0,
        why: 'Galaxies on a void\'s edge are pulled harder by the walls than by the thin interior, so they drift away from the void.' },
      { q: 'How could a supervoid make a patch of the cosmic microwave background look colder?',
        a: ['Voids are cold places that absorb heat', 'Light crossing the void can lose a little energy as its gravitational potential changes during accelerating expansion', 'Dust inside the void blocks the light'], c: 1,
        why: 'This is the integrated Sachs–Wolfe effect. A void is a gravitational potential hill relative to average density. If that hill decays during transit, the net shift can lower the photon energy.' },
      { q: 'Which describes a typical galaxy found inside a void?',
        a: ['Small, blue, gas-rich, and still forming stars', 'A giant red elliptical galaxy', 'There are no galaxies in voids'], c: 0,
        why: 'Void galaxies grow slowly and quietly. With few neighbours to collide with or steal their gas, they keep making new stars.' }
    ];

    QS.forEach(function (item, qi) {
      var fs = document.createElement('fieldset');
      fs.className = 'cv-q';
      var lg = document.createElement('legend');
      lg.textContent = (qi + 1) + '. ' + item.q;
      fs.appendChild(lg);
      item.a.forEach(function (text, ai) {
        var lab = document.createElement('label');
        var inp = document.createElement('input');
        inp.type = 'radio';
        inp.name = 'cvq' + qi;
        inp.value = ai;
        lab.appendChild(inp);
        lab.appendChild(document.createTextNode(text));
        fs.appendChild(lab);
      });
      var why = document.createElement('p');
      why.className = 'cv-q-why';
      why.hidden = true;
      why.textContent = item.why;
      fs.appendChild(why);
      host.appendChild(fs);
    });

    document.getElementById('cvQuizCheck').addEventListener('click', function () {
      var score = 0, answered = 0;
      QS.forEach(function (item, qi) {
        var fs = host.children[qi];
        var labels = fs.querySelectorAll('label');
        var picked = fs.querySelector('input:checked');
        labels.forEach(function (l) { l.classList.remove('is-right', 'is-wrong'); });
        if (!picked) return;
        answered++;
        var ai = +picked.value;
        if (ai === item.c) score++;
        labels[item.c].classList.add('is-right');
        if (ai !== item.c) labels[ai].classList.add('is-wrong');
        fs.querySelector('.cv-q-why').hidden = false;
      });
      if (!answered) { feedback.textContent = 'Pick an answer for each question first.'; feedback.style.color = '#ffd166'; return; }
      feedback.textContent = score + ' of ' + QS.length + ' correct' + (answered < QS.length ? ' (' + (QS.length - answered) + ' unanswered)' : '') + '.';
      feedback.style.color = score === QS.length ? '#6fe3a5' : '#ffd166';
    });
  })();
})();
