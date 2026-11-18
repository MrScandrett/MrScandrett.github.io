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
    if (amps <= 0) return;
    var line = el('path', { class: 'ee-flowline', d: d });
    var speed = Math.max(0.25, Math.min(4, 1 / (amps * scale)));
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
      var loop = 'M' + L + ' 114 V' + T + ' H' + Rt + ' V' + B + ' H' + L + ' V126';
      svg.appendChild(el('path', { class: 'ee-wire', d: loop }));
      flow(svg, loop, I, 80);
      svg.appendChild(el('path', { class: 'ee-part-line', d: 'M166 33 l10 7 -10 7 M369 193 l-10 7 10 7' }));
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
      [3, 6, 9, 12].forEach(function (v) {
        svg.appendChild(el('path', { class: 'ee-wire', d: 'M' + gx0 + ' ' + y(v) + ' H' + gx1, 'stroke-width': 1, opacity: 0.25 }));
        if (v < 12) svg.appendChild(el('text', { class: 'ee-label', x: gx0 - 6, y: y(v) + 4, 'text-anchor': 'end' }, v + ' V'));
      });
      svg.appendChild(el('text', { class: 'ee-label', x: gx0 - 6, y: gy1 + 4, 'text-anchor': 'end' }, '12 V'));
      svg.appendChild(el('text', { class: 'ee-label', x: gx0 - 6, y: gy0 + 4, 'text-anchor': 'end' }, '0 V'));
      svg.appendChild(el('text', { class: 'ee-label', x: gx0, y: gy1 - 23 }, 'Voltage above point D as you walk the loop'));
      var vA = s.v, vB = vA - drops[0], vC = vB - drops[1];
      var seg = (gx1 - gx0) / 8;
      var pts = [[0, 0], [1, vA], [2, vA], [3, vB], [4, vB], [5, vC], [6, vC], [7, 0], [8, 0]];
      var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + (gx0 + p[0] * seg) + ' ' + y(p[1]); }).join(' ');
      svg.appendChild(el('path', { d: d, fill: 'none', stroke: 'var(--ee-accent)', 'stroke-width': 3.5, 'stroke-linejoin': 'round' }));
      // Mark each node on the plateau at the same potential as its circuit label.
      [[0, 0, 'D'], [1.5, vA, 'A'], [3.5, vB, 'B'], [5.5, vC, 'C'], [8, 0, 'D']].forEach(function (p) {
        var px = gx0 + p[0] * seg;
        svg.appendChild(el('circle', { class: 'ee-node', cx: px, cy: y(p[1]), r: 4 }));
        svg.appendChild(el('text', { class: 'ee-value', x: px, y: y(p[1]) - 9, 'text-anchor': 'middle' }, p[2]));
      });
      [['Battery', 0, '+' + fmt(s.v, 'V')], ['R1', 2, '−' + fmt(drops[0], 'V')],
       ['R2', 4, '−' + fmt(drops[1], 'V')], ['R3', 6, '−' + fmt(drops[2], 'V')]].forEach(function (step) {
        var mx = gx0 + (step[1] + 0.5) * seg;
        svg.appendChild(el('text', { class: 'ee-label', x: mx, y: gy0 + 18, 'text-anchor': 'middle' }, step[0] + '  ' + step[2]));
      });

      document.getElementById('kvl-i').textContent = fmt(I, 'A');
      document.getElementById('kvl-v1').textContent = fmt(drops[0], 'V');
      document.getElementById('kvl-v2').textContent = fmt(drops[1], 'V');
      document.getElementById('kvl-v3').textContent = fmt(drops[2], 'V');
      var sum = document.getElementById('kvl-sum');
      sum.dataset.tone = 'ok';
      sum.innerHTML = '<strong>KVL check</strong>' + fmt(drops[0], 'V') + ' + ' + fmt(drops[1], 'V') + ' + ' + fmt(drops[2], 'V') +
        ' ≈ ' + fmt(s.v, 'V') + ', the battery voltage. The same ' + fmt(I, 'A') + ' flows through every part.';
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
      function wire(d, current) {
        var width = 2 + Math.min(11, current * 500);
        svg.appendChild(el('path', { class: 'ee-wire', d: d, 'stroke-width': width }));
        flow(svg, d, current, 40);
      }
      var ys = [88, 167, 246];
      // Each vertical rail carries the sum of only the branches beyond that segment.
      battery(svg, 62, 167, '5 V');
      wire('M62 161 V49 H130 V88', total);
      wire('M130 88 V167', I[1] + I[2]);
      wire('M130 167 V246', I[2]);
      wire('M405 88 V167', I[0]);
      wire('M405 167 V246', I[0] + I[1]);
      wire('M405 246 V305 H62 V173', total);
      ys.forEach(function (y, i) {
        var on = s.on[i];
        wire('M130 ' + y + ' H159', I[i]);
        wire('M191 ' + y + ' H223', I[i]);
        wire('M293 ' + y + ' H323', I[i]);
        wire('M351 ' + y + ' H405', I[i]);
        svg.appendChild(el('path', { class: 'ee-part-line', d: 'M159 ' + y + ' L191 ' + (y - (on ? 0 : 16)) }));
        [159, 191].forEach(function (x) {
          svg.appendChild(el('circle', { class: 'ee-node', cx: x, cy: y, r: 3 }));
        });
        resistorH(svg, 223, y, 70, fmt(s.r[i], 'Ω'));
        var glow = Math.min(1, I[i] / 0.02);
        svg.appendChild(el('path', { class: 'ee-part', d: 'M323 ' + (y - 11) + ' L351 ' + y + ' L323 ' + (y + 11) + ' Z',
          fill: on ? 'rgba(239,68,68,' + (0.22 + glow * 0.78) + ')' : 'var(--ee-sheet)' }));
        svg.appendChild(el('path', { class: 'ee-part-line', d: 'M351 ' + (y - 11) + ' v22' }));
        svg.appendChild(el('path', { class: 'ee-part-line', d: 'M332 ' + (y - 15) + ' l12 -12 m-7 1 l7 -1 -1 7 m1 1 l12 -12 m-7 1 l7 -1 -1 7',
          stroke: on ? 'var(--ee-red)' : 'var(--ee-muted)', opacity: on ? 0.6 + glow * 0.4 : 0.45 }));
        [130, 405].forEach(function (x) {
          svg.appendChild(el('circle', { class: 'ee-node', cx: x, cy: y, r: 4 }));
        });
        svg.appendChild(el('text', { class: 'ee-value', x: 421, y: y + 4 }, names[i] + '  ·  ' + fmt(I[i], 'A')));
      });
      svg.appendChild(el('text', { class: 'ee-value', x: 98, y: 34, 'text-anchor': 'middle' }, 'Into J  ·  ' + fmt(total, 'A')));
      svg.appendChild(el('text', { class: 'ee-label', x: 236, y: 293, 'text-anchor': 'middle' }, fmt(total, 'A') + ' returns to the supply'));

      svg.appendChild(el('text', { class: 'ee-value', x: 115, y: 92, 'text-anchor': 'end' }, 'J'));

      var coach = document.getElementById('kcl-sum');
      var parts = I.map(function (a, i) { return s.on[i] ? fmt(a, 'A') : null; }).filter(Boolean);
      var highCurrent = I.some(function (a) { return a > 0.02; });
      coach.dataset.tone = highCurrent ? 'warn' : 'ok';
      coach.innerHTML = '<strong>KCL check</strong>Into J: ' + fmt(total, 'A') + '. Out of J: ' +
        (parts.length ? parts.join(' + ') : 'nothing') + '. In each closed branch, the LED drops about 2 V and the resistor gets the remaining 3 V, so I = 3 V ÷ R.' + (highCurrent ? ' Check the LED’s current rating before wiring a branch above 20 mA.' : '');
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
    var response = document.getElementById('div-response');
    var responseNote = document.getElementById('div-response-note');
    var budget = document.getElementById('div-budget');
    var narrow = window.matchMedia('(max-width: 520px)');
    var s = { mode: 'fixed', vin: 5, r1: 10000, r2: 4700, light: 60, knob: 50, swap: false, load: false, rl: 1000 };
    var done = {};
    var POT = 10000;
    var ADC_REF = 5;
    var ADC_MAX = 1023;
    var bandColors = ['#241d1a', '#653616', '#ac252c', '#d56810', '#ffdb4f', '#327f47', '#2548a4', '#7950ac', '#737985', '#fff7e6'];

    function ldr(light) { return Math.pow(10, 6 - 4 * light / 100); }

    function solve(setting) {
      var top = s.r1;
      var bottom = setting ?? s.r2;
      if (s.mode === 'ldr') {
        var sensor = ldr(setting ?? s.light);
        top = s.swap ? sensor : s.r1;
        bottom = s.swap ? s.r1 : sensor;
      } else if (s.mode === 'pot') {
        bottom = POT * (setting ?? s.knob) / 100;
        top = POT - bottom;
      }
      var bEff = s.load ? bottom * s.rl / (bottom + s.rl) : bottom;
      var i = s.vin / (top + bEff);
      var vout = i * bEff;
      var vout0 = s.vin * bottom / (top + bottom);
      var iLoad = s.load ? vout / s.rl : 0;
      return { top: top, bottom: bottom, bEff: bEff, vout: vout, vout0: vout0, i: i,
        iBottom: i - iLoad, iLoad: iLoad, p: s.vin * i };
    }

    function path(parent, d, css, attrs) {
      parent.appendChild(el('path', { class: css, d: d, ...attrs }));
    }

    function label(parent, x, y, value, css, attrs) {
      parent.appendChild(el('text', { class: css || 'ee-label', x: x, y: y, ...attrs }, value));
    }

    function dot(parent, x, y, r, css) {
      parent.appendChild(el('circle', { class: css || 'ee-node', cx: x, cy: y, r: r }));
    }

    function rect(parent, x, y, w, h, radius, fill, attrs) {
      parent.appendChild(el('rect', { x: x, y: y, width: w, height: h, rx: radius, fill: fill, ...attrs }));
    }

    function resistorBody(x, y, value) {
      path(svg, 'M' + (x - 11) + ' ' + (y - 30) + ' q11 -6 22 0 v11 q-4 19 0 38 v11 q-11 6 -22 0 v-11 q4 -19 0 -38 z', 'div-resistor');
      var multiplier = Math.floor(Math.log10(value)) - 1;
      var digits = Math.round(value / Math.pow(10, multiplier));
      [bandColors[Math.floor(digits / 10)], bandColors[digits % 10], bandColors[multiplier], '#a47b2e'].forEach(function (color, index) {
        rect(svg, x - 9, y - 20 + index * 12, 18, 4, 1, color);
      });
    }

    function photoresistor(x, y) {
      svg.appendChild(el('circle', { class: 'div-ldr', cx: x, cy: y, r: 22, fill: 'hsl(38 85% ' + (35 + s.light / 2) + '%)' }));
      path(svg, 'M' + x + ' ' + (y - 14) + ' h-11 v6 h22 v6 h-22 v6 h22 v6 h-11 v4', 'div-ldr-track');
      path(svg, 'M' + (x + 38) + ' ' + (y - 39) + ' l-18 17 m0 -8 v8 h8 m23 -17 l-18 17 m0 -8 v8 h8', 'div-light-rays', { opacity: 0.3 + s.light * 0.007 });
    }

    function board(adc, clipped) {
      var pcb = el('g', narrow.matches ? { transform: 'translate(-253 269)' } : {});
      svg.appendChild(pcb);
      rect(pcb, 432, 69, 184, 194, 15, '#096568', { stroke: '#06484a', 'stroke-width': 3 });
      path(pcb, 'M435 155 H477 L497 135 H515 M480 262 V241 H577 V119 M469 102 H550 L575 128 M461 229 H514 L531 215', 'div-pcb-traces');
      [449, 599].forEach(function (x) {
        [85, 247].forEach(function (y) { dot(pcb, x, y, 4, 'div-mount'); });
      });
      rect(pcb, 555, 62, 41, 35, 4, '#cbd5d8', { stroke: '#54676b', 'stroke-width': 2 });
      rect(pcb, 563, 64, 25, 7, 2, '#405958');
      label(pcb, 445, 118, 'Arduino Uno', 'div-board-name');
      label(pcb, 447, 161, 'A0', 'div-board-pin');
      label(pcb, 462, 247, 'GND', 'div-board-pin');
      rect(pcb, 497, 137, 102, 80, 6, '#142820', { stroke: '#a2c0ac', 'stroke-width': 1.5 });
      label(pcb, 548, 157, '10-bit ADC', 'div-adc-label', { 'text-anchor': 'middle' });
      label(pcb, 548, 188, String(adc), 'div-adc-count', { 'text-anchor': 'middle' });
      rect(pcb, 508, 200, 80, 6, 3, '#526b5c');
      rect(pcb, 508, 200, 80 * adc / ADC_MAX, 6, 3, clipped ? '#ffb4a9' : '#b8efa4');
      dot(pcb, 432, 155, 6, 'div-pad');
      dot(pcb, 480, 263, 6, 'div-pad');
    }

    function drawBoard(r, adc, clipped) {
      svg.textContent = '';
      svg.setAttribute('viewBox', narrow.matches ? '0 0 435 567' : '0 0 640 330');
      svg.appendChild(el('title', { id: 'div-svg-title' }, 'Live voltage divider wired to Arduino A0'));
      svg.appendChild(el('desc', { id: 'div-svg-desc' },
        'A ' + fmt(s.vin, 'V') + ' supply drives an upper ' + fmt(r.top, 'Ω') + ' and lower ' + fmt(r.bottom, 'Ω') +
        ' section. The tap is at ' + fmt(r.vout, 'V') + ' relative to shared ground. ' +
        (s.load ? 'Current splits between the lower section and the parallel load. ' : '') +
        'The ADC reads ' + adc + (clipped ? ' with the input above its 5 V range.' : '.')));

      var x = 113;
      var tapY = 155;
      var tapX = x;
      var topPart = 'M113 39 V51 M113 117 V155';
      var bottomPart = 'M113 155 V185 M113 251 V291';
      if (s.mode === 'pot') {
        tapX = 215;
        var wiper = 243 - 179 * s.knob / 100;
        topPart = 'M113 39 V64';
        bottomPart = 'M113 243 V291';
        path(svg, 'M122 ' + wiper + ' H215 V155', 'ee-wire div-signal');
        path(svg, 'M130 ' + (wiper - 6) + ' l-10 6 10 6', 'div-arrow');
        rect(svg, 104, 64, 18, 179, 3, 'var(--ee-sheet)', { stroke: 'var(--ee-ink)', 'stroke-width': 2 });
        rect(svg, 109, 64, 8, wiper - 64, 2, 'var(--ee-warn)');
        rect(svg, 109, wiper, 8, 243 - wiper, 2, 'var(--ee-accent)');
        label(svg, 96, 103, 'Upper', 'ee-label', { 'text-anchor': 'end' });
        label(svg, 96, 123, fmt(r.top, 'Ω'), 'ee-value', { 'text-anchor': 'end' });
        label(svg, 96, 205, 'Lower', 'ee-label', { 'text-anchor': 'end' });
        label(svg, 96, 225, fmt(r.bottom, 'Ω'), 'ee-value', { 'text-anchor': 'end' });
        label(svg, 149, wiper - 8, 'Wiper');
      } else {
        var ldrOnTop = s.mode === 'ldr' && s.swap;
        var ldrOnBottom = s.mode === 'ldr' && !s.swap;
        if (ldrOnTop) {
          topPart = 'M113 39 V62 M113 106 V155';
          photoresistor(x, 84);
        } else resistorBody(x, 84, r.top);
        if (ldrOnBottom) {
          bottomPart = 'M113 155 V196 M113 240 V291';
          photoresistor(x, 218);
        } else resistorBody(x, 218, r.bottom);
        label(svg, 152, 87, ldrOnTop ? 'Light sensor' : 'R1 · Upper');
        label(svg, 152, 108, fmt(r.top, 'Ω'), 'ee-value');
        label(svg, 152, 221, ldrOnBottom ? 'Light sensor' : 'R2 · Lower');
        label(svg, 152, 242, fmt(r.bottom, 'Ω'), 'ee-value');
      }
      path(svg, topPart, 'ee-wire div-supply');
      path(svg, bottomPart, 'ee-wire div-signal');
      var signalWire = narrow.matches ? 'H407 V326 H147 V424 H179' : 'H432';
      path(svg, 'M' + tapX + ' 155 ' + signalWire, clipped ? 'ee-wire div-signal div-clipped' : 'ee-wire div-signal');
      var returnWire = narrow.matches ? (s.load ? 'M113 291 H306 ' : '') + 'M113 291 V547 H227 V532' : 'M113 291 H480 V263 M113 291 V307';
      var groundSymbol = narrow.matches ? 'M95 547 H131 M101 554 H125 M107 561 H119' : 'M95 307 H131 M101 314 H125 M107 321 H119';
      path(svg, returnWire + ' ' + groundSymbol, 'ee-wire');
      flow(svg, topPart, r.i, 400);
      flow(svg, bottomPart, r.iBottom, 400);
      var currentKeyY = s.mode === 'pot' ? 140 : 65;
      path(svg, 'M48 ' + currentKeyY + ' v14 l-5 -5 m5 5 l5 -5', 'div-current-key');
      label(svg, 47, currentKeyY + 33, fmt(r.i, 'A'), 'ee-label', { 'text-anchor': 'middle' });
      dot(svg, x, 39, 5, 'div-source-dot');
      label(svg, x, 25, 'Supply  ' + fmt(s.vin, 'V'), 'ee-value', { 'text-anchor': 'middle' });
      dot(svg, tapX, tapY, 6, clipped ? 'div-tap div-clipped' : 'div-tap');
      label(svg, 306, 139, 'Tap  ' + fmt(r.vout, 'V'), clipped ? 'ee-value div-clipped-text' : 'ee-value', { 'text-anchor': 'middle' });
      label(svg, narrow.matches ? 208 : 306, 316, 'Shared ground  ·  0 V', 'ee-label', { 'text-anchor': 'middle' });
      if (s.load) {
        var loadPath = 'M306 155 V185 M306 251 V291';
        path(svg, loadPath, 'ee-wire div-load-wire');
        flow(svg, loadPath, r.iLoad, 400);
        resistorBody(306, 218, s.rl);
        label(svg, 330, 221, 'Load');
        label(svg, 330, 242, fmt(s.rl, 'Ω'), 'ee-value');
        dot(svg, 306, 155, 5, 'div-tap');
        dot(svg, 306, 291, 5);
      }

      board(adc, clipped);
    }

    function drawResponse(r) {
      response.textContent = '';
      var fixed = s.mode === 'fixed';
      var light = s.mode === 'ldr';
      var setting = fixed ? s.r2 : light ? s.light : s.knob;
      var start = 52, end = 458, base = 146, ceiling = 24;
      var max = Math.max(ADC_REF, s.vin);
      function x(t) { return start + (end - start) * t; }
      function y(v) { return base - (base - ceiling) * v / max; }
      var fromX = fixed ? function (t) { return Math.pow(10, 2 + 4 * t); } : function (t) { return 100 * t; };
      var position = fixed ? (Math.log10(setting) - 2) / 4 : setting / 100;
      var name = fixed ? 'R2 (log scale)' : light ? 'Light level' : 'Knob position';
      response.appendChild(el('title', { id: 'div-response-label' }, 'Output voltage versus ' + name +
        '. At the current setting, the output is ' + fmt(r.vout, 'V') +
        (s.load ? ', compared with ' + fmt(r.vout0, 'V') + ' without the load.' : '.')));
      path(response, 'M52 24 V146 H458', 'div-chart-axis');
      path(response, 'M52 ' + y(ADC_REF) + ' H458', 'div-chart-limit');
      label(response, 45, y(ADC_REF) + 4, '5 V', 'ee-label', { 'text-anchor': 'end' });
      label(response, 45, 150, '0 V', 'ee-label', { 'text-anchor': 'end' });
      if (max >= 7) label(response, 45, 28, fmt(max, 'V'), 'ee-label', { 'text-anchor': 'end' });
      [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
        path(response, 'M' + x(t) + ' 146 v5', 'div-chart-axis');
        label(response, x(t), 169, fixed ? fmt(fromX(t), 'Ω') : fromX(t) + '%', 'ee-label', { 'text-anchor': 'middle' });
      });
      label(response, 255, 196, name, 'ee-value', { 'text-anchor': 'middle' });
      var points = Array.from({ length: 81 }, function (_, index) {
        var t = index / 80;
        return { x: x(t), result: solve(fromX(t)) };
      });
      function trace(key, css) {
        path(response, points.map(function (point, index) {
          return (index ? 'L' : 'M') + point.x + ' ' + y(point.result[key]);
        }).join(' '), css);
      }
      if (s.load) trace('vout0', 'div-chart-unloaded');
      trace('vout', 'div-chart-live');
      path(response, 'M' + x(position) + ' ' + y(r.vout) + ' V146', 'div-chart-guide');
      if (s.load) dot(response, x(position), y(r.vout0), 4, 'div-chart-open-dot');
      dot(response, x(position), y(r.vout), 5, 'div-tap');
      var note = fixed ? 'Increasing R2 raises the output. The axis gives equal space to each tenfold increase.'
        : light ? 'More light lowers the sensor’s resistance. With the sensor ' + (s.swap ? 'above the tap, the output rises.' : 'below the tap, the output falls.')
        : 'Each step of the knob moves the wiper along one continuous 10 kΩ track.';
      responseNote.textContent = note + (s.load ? ' Dashed curve shows the output with the load disconnected.' : '') +
        ' The horizontal dotted line marks the ADC’s 5 V limit.';
    }

    function drawBudget(r) {
      budget.textContent = '';
      function split(heading, total, first, second) {
        var title = document.createElement('dt');
        title.textContent = heading;
        var data = document.createElement('dd');
        var bar = document.createElement('div');
        bar.className = 'div-split';
        bar.setAttribute('aria-hidden', 'true');
        var key = document.createElement('div');
        key.className = 'div-split-key';
        [first, second].forEach(function (entry, index) {
          var segment = document.createElement('span');
          segment.className = index ? 'div-second' : 'div-first';
          segment.style.width = (total ? 100 * entry.amount / total : 0) + '%';
          bar.appendChild(segment);
          var text = document.createElement('span');
          text.className = segment.className;
          text.textContent = entry.label + ' ' + fmt(entry.amount, entry.unit);
          key.appendChild(text);
        });
        data.append(bar, key);
        budget.append(title, data);
      }
      split('Supply voltage · ' + fmt(s.vin, 'V'), s.vin,
        { label: 'Upper drop', amount: s.vin - r.vout, unit: 'V' },
        { label: 'Lower drop', amount: r.vout, unit: 'V' });
      split('Current into the tap · ' + fmt(r.i, 'A'), r.i,
        { label: 'Lower part', amount: r.iBottom, unit: 'A' },
        { label: 'Load', amount: r.iLoad, unit: 'A' });
    }

    var coach = document.getElementById('div-coach');
    function update() {
      var r = solve();
      var clipped = r.vout - ADC_REF > 1e-9;
      var adc = Math.min(ADC_MAX, Math.round(r.vout / ADC_REF * ADC_MAX));
      drawBoard(r, adc, clipped);
      drawResponse(r);
      drawBudget(r);
      document.getElementById('div-vout').textContent = fmt(r.vout, 'V');
      document.getElementById('div-adc').textContent = String(adc);
      document.getElementById('div-i').textContent = fmt(r.i, 'A');
      document.getElementById('div-p').textContent = fmt(r.p, 'W');

      var tone = 'ok', msg;
      if (clipped) {
        tone = 'bad';
        msg = '<strong>Too high for the pin</strong>V out is above the modeled 5 V input range. The display clips at 1023. Lower the supply or change the divider ratio before wiring this to A0.';
      } else if (s.load && r.vout0 > 0 && (r.vout0 - r.vout) / r.vout0 > 0.1) {
        tone = 'warn';
        msg = '<strong>Loading effect</strong>Without the load, V out would be ' + fmt(r.vout0, 'V') + '. The ' + fmt(s.rl, 'Ω') + ' load gives the current another path to ground. The lower part and the load act like a single ' + fmt(r.bEff, 'Ω') + ' resistor, bringing the output down to ' + fmt(r.vout, 'V') + '.';
      } else if (r.i > 0.01) {
        tone = 'warn';
        msg = '<strong>Hungry divider</strong>This divider draws ' + fmt(r.i, 'A') + ' all the time and turns ' + fmt(r.p, 'W') + ' into heat. Fine for a quick test, wasteful on batteries. Try kilohm resistors.';
      } else {
        msg = '<strong>The math</strong>V out = ' + fmt(s.vin, 'V') + ' × ' + fmt(r.bottom, 'Ω') + ' ÷ (' + fmt(r.top, 'Ω') + ' + ' + fmt(r.bottom, 'Ω') + ') = ' + fmt(r.vout0, 'V') +
          (s.load ? '. With the load attached, the output is ' + fmt(r.vout, 'V') + '.' : '.') + ' analogRead() = ' + fmt(r.vout, 'V') + ' ÷ 5 V × 1023 ≈ ' + adc + '.';
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

    narrow.addEventListener('change', update);

    window.DividerLab = { state: s, solve: solve, update: update, done: done, e12: e12 };
  })();
})();
