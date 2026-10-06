/* Voltage Dividers & Kirchhoff's Laws: KVL loop hike, KCL junction, divider bench. */
(function () {
  'use strict';

  var fmt = EELab.fmt;
  var NS = 'http://www.w3.org/2000/svg';
  var E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];

  // Slider index → standard E12 resistor value, 100 Ω … 820 kΩ, then 1 MΩ.
  function e12(idx) {
    if (idx >= 48) return 1e6;
    return Math.round(E12[idx % 12] * Math.pow(10, 2 + Math.floor(idx / 12)));
  }
  function ohms(idx) { return fmt(e12(idx), 'Ω'); }

  function el(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) {
      // Classed parts get their paint from CSS, which outranks SVG attributes,
      // so per-element paint has to go in as inline style to win.
      if (attrs.class && (k === 'fill' || k === 'stroke' || k === 'stroke-width')) {
        n.style.setProperty(k, typeof attrs[k] === 'number' ? attrs[k] + 'px' : attrs[k]);
      } else n.setAttribute(k, attrs[k]);
    }
    if (text != null) n.textContent = text;
    return n;
  }
  function resistorH(svg, x, y, w, label) {
    svg.appendChild(el('rect', { class: 'ee-part', x: x, y: y - 12, width: w, height: 24, rx: 3 }));
    if (label) svg.appendChild(el('text', { class: 'ee-label', x: x + w / 2, y: y - 20, 'text-anchor': 'middle' }, label));
  }
  function resistorV(svg, x, y, h, label, side) {
    svg.appendChild(el('rect', { class: 'ee-part', x: x - 12, y: y, width: 24, height: h, rx: 3 }));
    if (label) svg.appendChild(el('text', { class: 'ee-label', x: side === 'left' ? x - 20 : x + 20, y: y + h / 2 + 4, 'text-anchor': side === 'left' ? 'end' : 'start' }, label));
  }
  function battery(svg, x, y, label) {
    svg.appendChild(el('path', { class: 'ee-part-line', d: 'M' + (x - 22) + ' ' + (y - 6) + ' H' + (x + 22) + ' M' + (x - 12) + ' ' + (y + 6) + ' H' + (x + 12) }));
    svg.appendChild(el('text', { class: 'ee-value', x: x - 30, y: y + 4, 'text-anchor': 'end' }, label));
    svg.appendChild(el('text', { class: 'ee-label', x: x + 28, y: y - 2 }, '+'));
  }
  // Animated dashes along a wire path; faster for more current.
  function flow(svg, d, amps, scale) {
    if (amps <= 1e-6) return;
    var line = el('path', { class: 'ee-flowline', d: d });
    var speed = Math.max(0.25, Math.min(4, 1 / Math.max(0.05, amps * scale)));
    line.style.animationDuration = speed.toFixed(2) + 's';
    svg.appendChild(line);
  }

  // ── Sim 1: KVL voltage hike ────────────────────────────────────────────
  (function () {
    var svg = document.getElementById('kvl-svg');
    if (!svg) return;
    var s = { v: 9, r: [1000, 3300, 1000] };
    var inputs = ['kvl-r1', 'kvl-r2', 'kvl-r3'].map(function (id) { return document.getElementById(id); });

    function draw() {
      var R = s.r[0] + s.r[1] + s.r[2];
      var I = s.v / R;
      var drops = s.r.map(function (r) { return I * r; });
      svg.textContent = '';

      // Loop: battery on the left, R1 top, R2 right, R3 bottom.
      var L = 70, Rt = 470, T = 40, B = 200;
      var loop = 'M' + L + ' 112 V' + T + ' H' + Rt + ' V' + B + ' H' + L + ' V128';
      svg.appendChild(el('path', { class: 'ee-wire', d: loop }));
      flow(svg, loop, I, 80);
      battery(svg, L, 120, fmt(s.v, 'V'));
      resistorH(svg, 220, T, 100, 'R1 ' + fmt(s.r[0], 'Ω'));
      resistorV(svg, Rt, 80, 80, 'R2 ' + fmt(s.r[1], 'Ω'), 'left');
      resistorH(svg, 220, B, 100, '');
      svg.appendChild(el('text', { class: 'ee-label', x: 270, y: B + 32, 'text-anchor': 'middle' }, 'R3 ' + fmt(s.r[2], 'Ω')));
      [['A', L, T], ['B', Rt, T], ['C', Rt, B], ['D', L, B]].forEach(function (p) {
        svg.appendChild(el('circle', { class: 'ee-node', cx: p[1], cy: p[2], r: 5 }));
        svg.appendChild(el('text', { class: 'ee-value', x: p[1] + (p[1] === L ? -18 : 12), y: p[2] + (p[2] === T ? -8 : 18) }, p[0]));
      });

      // Elevation graph: D → (battery) → A → R1 → B → R2 → C → R3 → D.
      var gx0 = 60, gx1 = 530, gy0 = 395, gy1 = 270;
      var vMax = 12;
      function y(v) { return gy0 - (v / vMax) * (gy0 - gy1); }
      svg.appendChild(el('path', { class: 'ee-part-line', d: 'M' + gx0 + ' ' + gy1 + ' V' + gy0 + ' H' + gx1, opacity: 0.5 }));
      svg.appendChild(el('text', { class: 'ee-label', x: gx0 - 6, y: gy1 + 4, 'text-anchor': 'end' }, '12 V'));
      svg.appendChild(el('text', { class: 'ee-label', x: gx0 - 6, y: gy0 + 4, 'text-anchor': 'end' }, '0 V'));
      svg.appendChild(el('text', { class: 'ee-label', x: gx0, y: gy1 - 12 }, 'Voltage above point D as you walk the loop'));
      var vA = s.v, vB = vA - drops[0], vC = vB - drops[1];
      var seg = (gx1 - gx0) / 8;
      var pts = [[0, 0], [1, vA], [2, vA], [3, vB], [4, vB], [5, vC], [6, vC], [7, 0], [8, 0]];
      var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + (gx0 + p[0] * seg) + ' ' + y(p[1]); }).join(' ');
      svg.appendChild(el('path', { d: d, fill: 'none', stroke: 'var(--ee-accent)', 'stroke-width': 3.5, 'stroke-linejoin': 'round' }));
      // Label each slope at its midpoint: rises up-left of the line, drops up-right.
      [['battery', 0, 0, s.v, 'var(--ee-ok)', '+' + fmt(s.v, 'V')],
       ['R1', 2, vA, vB, 'var(--ee-red)', '−' + fmt(drops[0], 'V')],
       ['R2', 4, vB, vC, 'var(--ee-red)', '−' + fmt(drops[1], 'V')],
       ['R3', 6, vC, 0, 'var(--ee-red)', '−' + fmt(drops[2], 'V')]].forEach(function (g) {
        var mx = gx0 + (g[1] + 0.5) * seg, my = (y(g[2]) + y(g[3])) / 2;
        var rise = g[0] === 'battery';
        svg.appendChild(el('text', { class: 'ee-label', x: mx, y: gy0 + 18, 'text-anchor': 'middle' }, g[0]));
        svg.appendChild(el('text', { class: 'ee-value', x: mx + (rise ? -8 : 8), y: my - 8, 'text-anchor': rise ? 'end' : 'start', fill: g[4] }, g[5]));
      });

      document.getElementById('kvl-i').textContent = fmt(I, 'A');
      document.getElementById('kvl-v1').textContent = fmt(drops[0], 'V');
      document.getElementById('kvl-v2').textContent = fmt(drops[1], 'V');
      document.getElementById('kvl-v3').textContent = fmt(drops[2], 'V');
      var sum = document.getElementById('kvl-sum');
      sum.dataset.tone = 'ok';
      sum.innerHTML = '<strong>KVL check</strong>' + fmt(drops[0], 'V') + ' + ' + fmt(drops[1], 'V') + ' + ' + fmt(drops[2], 'V') +
        ' = ' + fmt(drops[0] + drops[1] + drops[2], 'V') + ', the battery voltage. The same ' + fmt(I, 'A') + ' flows through every part.';
    }

    EELab.slider(document.getElementById('kvl-v'), function (v) { s.v = v; draw(); }, function (v) { return v.toFixed(1) + ' V'; });
    inputs.forEach(function (input, i) {
      EELab.slider(input, function (v) { s.r[i] = e12(v); draw(); }, ohms);
    });
  })();

  // ── Sim 2: KCL junction ───────────────────────────────────────────────
  (function () {
    var svg = document.getElementById('kcl-svg');
    if (!svg) return;
    var VS = 5, VF = 2;
    var s = { on: [true, true, false], r: [680, 1500, 330] };
    var names = ['A', 'B', 'C'];

    function draw() {
      var I = s.r.map(function (r, i) { return s.on[i] ? (VS - VF) / r : 0; });
      var total = I[0] + I[1] + I[2];
      svg.textContent = '';
      function w(a) { return 2 + Math.min(12, a * 1000 / 2); }
      var jx = 150, rail = 300, top = 50;
      var ys = [80, 160, 240];
      // Supply on the left.
      battery(svg, 60, 170, '5 V');
      svg.appendChild(el('path', { class: 'ee-wire', d: 'M60 162 V' + top + ' H' + jx, 'stroke-width': w(total) }));
      svg.appendChild(el('path', { class: 'ee-wire', d: 'M60 178 V' + rail + ' H420' }));
      flow(svg, 'M60 162 V' + top + ' H' + jx, total, 40);
      svg.appendChild(el('path', { class: 'ee-wire', d: 'M' + jx + ' ' + top + ' V' + ys[2], 'stroke-width': w(total) }));
      ys.forEach(function (y, i) {
        var on = s.on[i];
        var d = 'M' + jx + ' ' + y + ' H210 M290 ' + y + ' H330 M370 ' + y + ' H420 V' + rail;
        svg.appendChild(el('path', { class: 'ee-wire', d: d, 'stroke-width': w(I[i]), opacity: on ? 1 : 0.35 }));
        if (!on) svg.appendChild(el('path', { class: 'ee-part-line', d: 'M' + (jx + 20) + ' ' + y + ' l26 -14', opacity: 0.8 }));
        flow(svg, 'M' + jx + ' ' + y + ' H420 V' + rail, I[i], 40);
        resistorH(svg, 210, y, 80, '');
        svg.appendChild(el('text', { class: 'ee-label', x: 250, y: y - 18, 'text-anchor': 'middle' }, fmt(s.r[i], 'Ω')));
        // LED triangle; brightness follows current.
        var glow = on ? Math.min(1, I[i] / 0.02) : 0;
        svg.appendChild(el('path', { class: 'ee-part', d: 'M330 ' + (y - 13) + ' L370 ' + y + ' L330 ' + (y + 13) + ' Z', fill: on ? 'rgba(239,68,68,' + (0.25 + glow * 0.75) + ')' : 'var(--ee-sheet)' }));
        svg.appendChild(el('path', { class: 'ee-part-line', d: 'M370 ' + (y - 13) + ' V' + (y + 13) }));
        svg.appendChild(el('text', { class: 'ee-value', x: 432, y: y + 4 }, names[i] + ': ' + fmt(I[i], 'A')));
      });
      svg.appendChild(el('circle', { class: 'ee-node', cx: jx, cy: top, r: 7 }));
      svg.appendChild(el('text', { class: 'ee-value', x: jx - 10, y: top - 14, 'text-anchor': 'middle' }, 'J  ' + fmt(total, 'A') + ' in'));

      var coach = document.getElementById('kcl-sum');
      var parts = I.map(function (a, i) { return s.on[i] ? fmt(a, 'A') : null; }).filter(Boolean);
      var tone = 'ok', extra = '';
      var hot = I.findIndex(function (a) { return a > 0.03; });
      if (hot >= 0) { tone = 'bad'; extra = ' Branch ' + names[hot] + ' pushes more than 30 mA through its LED, which will burn it out. Use a bigger resistor.'; }
      else if (I.some(function (a) { return a > 0.02; })) { tone = 'warn'; extra = ' One LED is above its usual 20 mA rating: very bright, and it will not last as long.'; }
      coach.dataset.tone = tone;
      coach.innerHTML = '<strong>KCL check</strong>Into J: ' + fmt(total, 'A') + '. Out of J: ' +
        (parts.length ? parts.join(' + ') : 'nothing') + '. Each branch gets the full 5 V, minus about 2 V for its LED, so I = 3 V ÷ R.' + extra;
    }

    document.querySelectorAll('#kcl-sim .ee-switch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = Number(btn.dataset.branch);
        s.on[i] = !s.on[i];
        btn.setAttribute('aria-pressed', s.on[i] ? 'true' : 'false');
        draw();
      });
    });
    ['kcl-ra', 'kcl-rb', 'kcl-rc'].forEach(function (id, i) {
      EELab.slider(document.getElementById(id), function (v) { s.r[i] = e12(v); draw(); }, ohms);
    });
  })();

  // ── Sim 3: divider bench ───────────────────────────────────────────────
  (function () {
    var svg = document.getElementById('div-svg');
    if (!svg) return;
    var s = { mode: 'fixed', vin: 5, r1: 10000, r2: 4700, light: 60, knob: 50, swap: false, load: false, rl: 1000, idx: { r1: 24, r2: 24, rl: 12 } };
    var done = {};
    var POT = 10000;

    function ldr(light) { return Math.pow(10, 6 - 4 * light / 100); }

    function solve() {
      var top, bottom, topName, bottomName;
      if (s.mode === 'fixed') { top = s.r1; bottom = s.r2; topName = 'R1'; bottomName = 'R2'; }
      else if (s.mode === 'ldr') {
        var rs = ldr(s.light);
        if (s.swap) { top = rs; bottom = s.r1; topName = 'sensor'; bottomName = 'fixed'; }
        else { top = s.r1; bottom = rs; topName = 'fixed'; bottomName = 'sensor'; }
      } else {
        top = Math.max(1, POT * (1 - s.knob / 100)); bottom = Math.max(1, POT * s.knob / 100); topName = 'pot (upper)'; bottomName = 'pot (lower)';
      }
      var bEff = s.load ? bottom * s.rl / (bottom + s.rl) : bottom;
      var vout = s.vin * bEff / (top + bEff);
      var vout0 = s.vin * bottom / (top + bottom);
      var itot = s.vin / (top + bEff);
      return { top: top, bottom: bottom, topName: topName, bottomName: bottomName, vout: vout, vout0: vout0, i: itot, p: s.vin * itot };
    }

    function drawBoard(r) {
      svg.textContent = '';
      var x = 150;
      // Supply rail and ground
      svg.appendChild(el('path', { class: 'ee-wire', d: 'M' + x + ' 30 V70 M' + x + ' 150 V200 M' + x + ' 280 V320' }));
      svg.appendChild(el('path', { class: 'ee-part-line', d: 'M' + (x - 20) + ' 320 H' + (x + 20) + ' M' + (x - 13) + ' 328 H' + (x + 13) + ' M' + (x - 6) + ' 336 H' + (x + 6) }));
      svg.appendChild(el('text', { class: 'ee-value', x: x, y: 22, 'text-anchor': 'middle' }, 'V in = ' + fmt(s.vin, 'V')));
      svg.appendChild(el('text', { class: 'ee-label', x: x + 30, y: 334 }, '0 V'));
      flow(svg, 'M' + x + ' 30 V320', r.i, 400);
      function part(y, name, value, isSensor) {
        if (isSensor) {
          svg.appendChild(el('rect', { class: 'ee-part', x: x - 16, y: y, width: 32, height: 80, rx: 16 }));
          svg.appendChild(el('path', { class: 'ee-part-line', d: 'M' + (x - 8) + ' ' + (y + 14) + ' l16 10 l-16 10 l16 10 l-16 10 l16 10' }));
          svg.appendChild(el('path', { class: 'ee-part-line', d: 'M' + (x - 54) + ' ' + (y + 10) + ' l24 14 M' + (x - 54) + ' ' + (y + 26) + ' l24 14', stroke: '#f59e0b' }));
        } else {
          svg.appendChild(el('rect', { class: 'ee-part', x: x - 12, y: y, width: 24, height: 80, rx: 3 }));
        }
        svg.appendChild(el('text', { class: 'ee-label', x: x + 24, y: y + 36 }, name));
        svg.appendChild(el('text', { class: 'ee-value', x: x + 24, y: y + 54 }, fmt(value, 'Ω')));
      }
      part(70, r.topName, r.top, s.mode === 'ldr' && s.swap);
      part(200, r.bottomName, r.bottom, s.mode === 'ldr' && !s.swap);
      if (s.mode === 'pot') {
        svg.appendChild(el('path', { class: 'ee-part-line', d: 'M' + (x - 40) + ' 175 h22 l8 -5 m-8 5 l8 5', stroke: 'var(--ee-accent)' }));
      }
      // Tap to Arduino
      var tapY = 175;
      svg.appendChild(el('path', { class: 'ee-wire ee-wire--live', d: 'M' + x + ' ' + tapY + ' H400' }));
      svg.appendChild(el('circle', { class: 'ee-node', cx: x, cy: tapY, r: 6 }));
      svg.appendChild(el('text', { class: 'ee-value', x: 240, y: tapY - 10, 'text-anchor': 'middle' }, 'V out = ' + fmt(r.vout, 'V')));
      if (s.load) {
        svg.appendChild(el('path', { class: 'ee-wire', d: 'M290 ' + tapY + ' V230 M290 290 V320 H' + x }));
        svg.appendChild(el('rect', { class: 'ee-part', x: 278, y: 230, width: 24, height: 60, rx: 3, stroke: 'var(--ee-warn)' }));
        svg.appendChild(el('text', { class: 'ee-label', x: 310, y: 258 }, 'load'));
        svg.appendChild(el('text', { class: 'ee-value', x: 310, y: 276 }, fmt(s.rl, 'Ω')));
        svg.appendChild(el('circle', { class: 'ee-node', cx: 290, cy: tapY, r: 5 }));
      }
      // Arduino block
      svg.appendChild(el('rect', { x: 400, y: 110, width: 140, height: 130, rx: 10, fill: '#00878f', stroke: '#005c63', 'stroke-width': 2 }));
      svg.appendChild(el('text', { x: 470, y: 134, fill: '#fff', 'text-anchor': 'middle', 'font-weight': 800, 'font-size': 13, 'font-family': 'Inter, system-ui, sans-serif' }, 'Arduino A0'));
      var adc = Math.max(0, Math.min(1023, Math.round(r.vout / 5 * 1023)));
      svg.appendChild(el('rect', { x: 415, y: 150, width: 110, height: 44, rx: 6, fill: '#c9d6b4', stroke: '#2b2b2b', 'stroke-width': 3 }));
      svg.appendChild(el('text', { x: 518, y: 181, fill: '#1c2614', 'text-anchor': 'end', 'font-size': 26, 'font-weight': 700, 'font-family': 'Courier New, monospace' }, String(adc)));
      svg.appendChild(el('rect', { x: 415, y: 206, width: 110, height: 12, rx: 6, fill: 'rgba(255,255,255,.25)' }));
      svg.appendChild(el('rect', { x: 415, y: 206, width: 110 * adc / 1023, height: 12, rx: 6, fill: '#facc15' }));
      return adc;
    }

    var coach = document.getElementById('div-coach');
    function update() {
      var r = solve();
      var adc = drawBoard(r);
      document.getElementById('div-vout').textContent = fmt(r.vout, 'V');
      document.getElementById('div-adc').textContent = String(adc);
      document.getElementById('div-i').textContent = fmt(r.i, 'A');
      document.getElementById('div-p').textContent = fmt(r.p, 'W');

      var tone = 'ok', msg;
      if (r.vout > 5.05) {
        tone = 'bad';
        msg = '<strong>Too high for the pin</strong>V out is above 5 V. An Arduino UNO input can be damaged above about 5.5 V, and analogRead() maxes out at 1023 anyway. Make R1 bigger or lower the supply.';
      } else if (s.load && r.vout0 > 0 && (r.vout0 - r.vout) / r.vout0 > 0.1) {
        tone = 'warn';
        msg = '<strong>Loading effect</strong>Without the load, V out would be ' + fmt(r.vout0, 'V') + '. The ' + fmt(s.rl, 'Ω') + ' load sits in parallel with the bottom part and drags it down to ' + fmt(r.vout, 'V') + '.';
      } else if (r.i > 0.01) {
        tone = 'warn';
        msg = '<strong>Hungry divider</strong>This divider draws ' + fmt(r.i, 'A') + ' all the time and turns ' + fmt(r.p, 'W') + ' into heat. Fine for a quick test, wasteful on batteries. Try kilohm resistors.';
      } else {
        msg = '<strong>The math</strong>V out = ' + fmt(s.vin, 'V') + ' × ' + fmt(r.bottom, 'Ω') + ' ÷ (' + fmt(r.top, 'Ω') + ' + ' + fmt(r.bottom, 'Ω') + ') = ' + fmt(r.vout0, 'V') +
          (s.load ? ', and the load only pulls it to ' + fmt(r.vout, 'V') + '.' : '.') + ' analogRead() = ' + fmt(r.vout, 'V') + ' ÷ 5 V × 1023 ≈ ' + adc + '.';
      }
      coach.dataset.tone = tone;
      coach.innerHTML = msg;

      var near = function (a, b, tol) { return Math.abs(a - b) <= tol; };
      var vin5 = near(s.vin, 5, 0.05);
      if (s.mode === 'fixed' && vin5 && !s.load && r.vout >= 2.45 && r.vout <= 2.55) done.half = true;
      if (s.mode === 'fixed' && vin5 && r.vout >= 3.2 && r.vout <= 3.4) done.logic = true;
      if (s.mode === 'ldr' && s.swap && s.light >= 90 && r.vout > 3.5) done.bright = true;
      if (s.mode === 'fixed' && s.load && s.rl === 1000 && s.r1 === 100000 && s.r2 === 100000) done.sag = true;
      if (s.mode === 'fixed' && s.load && s.rl === 1000 && r.vout0 > 0.1 && (r.vout0 - r.vout) / r.vout0 <= 0.1) done.stiff = true;
      var count = 0;
      document.querySelectorAll('#div-missions li').forEach(function (li) {
        var ok = !!done[li.dataset.mission];
        li.classList.toggle('is-done', ok);
        if (ok) count++;
      });
      document.getElementById('div-score').textContent = count + ' of 5';
    }

    function showFor(mode) {
      document.querySelectorAll('#div-sim [data-show]').forEach(function (n) {
        n.hidden = n.dataset.show.split(' ').indexOf(mode) < 0;
      });
      document.getElementById('div-r1-label').textContent = mode === 'ldr' ? 'Fixed resistor' : 'R1 (top)';
    }

    EELab.tabs(document.getElementById('div-mode'), function (mode) { s.mode = mode; showFor(mode); update(); });
    EELab.slider(document.getElementById('div-vin'), function (v) { s.vin = v; update(); }, function (v) { return v.toFixed(1) + ' V'; });
    EELab.slider(document.getElementById('div-r1'), function (v) { s.r1 = e12(v); update(); }, ohms);
    EELab.slider(document.getElementById('div-r2'), function (v) { s.r2 = e12(v); update(); }, ohms);
    EELab.slider(document.getElementById('div-rload'), function (v) { s.rl = e12(v); update(); }, ohms);
    EELab.slider(document.getElementById('div-light'), function (v) { s.light = v; update(); }, function (v) { return v + '% (sensor ' + fmt(ldr(v), 'Ω') + ')'; });
    EELab.slider(document.getElementById('div-knob'), function (v) { s.knob = v; update(); }, function (v) { return v + '%'; });
    var swap = document.getElementById('div-swap');
    swap.addEventListener('click', function () {
      s.swap = !s.swap;
      swap.setAttribute('aria-pressed', s.swap ? 'true' : 'false');
      update();
    });
    var load = document.getElementById('div-load');
    load.addEventListener('click', function () {
      s.load = !s.load;
      load.setAttribute('aria-pressed', s.load ? 'true' : 'false');
      load.textContent = s.load ? 'Disconnect the load' : 'Connect a load';
      document.getElementById('div-rload-wrap').hidden = !s.load;
      update();
    });

    window.DividerLab = { state: s, solve: solve, update: update, done: done, e12: e12 };
  })();
})();
