/* From Transistor to Logic Gate: MOSFET switch, gate workshop, half adder, SR latch. */
(function () {
  'use strict';

  var fmt = EELab.fmt;
  var NS = 'http://www.w3.org/2000/svg';
  var HIGH = 'var(--ee-ok)';
  var LOW = 'var(--ee-wire)';

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
  function wire(svg, d, on) {
    svg.appendChild(el('path', { class: 'ee-wire', d: d, stroke: on ? HIGH : LOW, 'stroke-width': on ? 4 : 3 }));
  }
  function label(svg, x, y, text, cls, anchor) {
    svg.appendChild(el('text', { class: cls || 'ee-label', x: x, y: y, 'text-anchor': anchor || 'middle' }, text));
  }
  function lamp(svg, x, y, on, name) {
    svg.appendChild(el('circle', { class: 'ee-lamp' + (on ? ' is-on' : ''), cx: x, cy: y, r: 16 }));
    label(svg, x, y + 5, on ? '1' : '0', 'ee-value');
    if (name) label(svg, x, y + 36, name, 'ee-value');
  }
  function box(svg, x, y, w, h, text) {
    svg.appendChild(el('rect', { class: 'ee-part', x: x, y: y, width: w, height: h, rx: 10 }));
    label(svg, x + w / 2, y + h / 2 + 5, text, 'ee-value');
  }

  var GATES = {
    NOT: function (a) { return !a; },
    AND: function (a, b) { return a && b; },
    OR: function (a, b) { return a || b; },
    NAND: function (a, b) { return !(a && b); },
    NOR: function (a, b) { return !(a || b); },
    XOR: function (a, b) { return a !== b; }
  };
  var RULES = {
    NOT: 'The output is the opposite of the input. One transistor pulls the output LOW whenever A is HIGH.',
    NAND: 'The output is LOW only when A and B are both HIGH: the two series transistors must both conduct.',
    NOR: 'The output is LOW when A or B (or both) is HIGH: either parallel transistor can pull it down.',
    AND: 'HIGH only when both inputs are HIGH. Built as NAND followed by NOT, so it costs three transistors.',
    OR: 'HIGH when either input is HIGH. Built as NOR followed by NOT.',
    XOR: '“Exclusive or”: HIGH when the inputs are different. Built from simpler gates: (A OR B) AND (A NAND B).'
  };

  // ── Sim 1: MOSFET switch ──────────────────────────────────────────────
  (function () {
    var svg = document.getElementById('fet-svg');
    if (!svg) return;
    var VTH = 2.0, IMAX = 0.2, RPD = 10000;
    var s = { pin: 0, float: false, pd: false, vg: 0 };
    var wander = 2.5, timer = null;

    function load(vg) {
      if (vg <= VTH) return 0;
      var x = Math.min(1, (vg - VTH) / 1.5);
      return IMAX * x * x;
    }

    function draw() {
      var vg = s.vg, I = load(vg);
      var on = I > IMAX * 0.95, partial = I > 0.001 && !on;
      svg.textContent = '';
      // Supply, load, MOSFET, ground.
      label(svg, 360, 22, '+5 V', 'ee-value');
      wire(svg, 'M360 30 V50', true);
      svg.appendChild(el('rect', { x: 320, y: 50, width: 80, height: 50, rx: 8, fill: I > 0.001 ? 'rgba(250,204,21,' + (0.2 + 0.8 * I / IMAX) + ')' : 'var(--ee-sheet)', stroke: 'var(--ee-ink)', 'stroke-width': 2.5 }));
      label(svg, 360, 80, 'LED strip', 'ee-value');
      label(svg, 410, 80, 'load', 'ee-label', 'start');
      wire(svg, 'M360 100 V140', I > 0.001);
      // MOSFET body: channel bar and gate plate.
      svg.appendChild(el('path', { class: 'ee-part-line', d: 'M340 140 V200 M330 145 V195' }));
      svg.appendChild(el('path', { d: 'M340 150 H360 V140 M340 190 H360 V230', fill: 'none', stroke: I > 0.001 ? 'var(--ee-hot)' : 'var(--ee-ink)', 'stroke-width': 3 }));
      svg.appendChild(el('path', { d: 'M340 170 H360', fill: 'none', stroke: 'var(--ee-ink)', 'stroke-width': 2.5 }));
      svg.appendChild(el('path', { d: 'M344 170 l8 -5 v10 z', fill: 'var(--ee-ink)' }));
      label(svg, 372, 150, 'drain', 'ee-label', 'start');
      label(svg, 372, 196, 'source', 'ee-label', 'start');
      label(svg, 312, 128, 'gate', 'ee-label', 'end');
      label(svg, 372, 222, 'N-channel MOSFET', 'ee-label', 'start');
      // Ground
      svg.appendChild(el('path', { class: 'ee-part-line', d: 'M340 230 H380 M347 238 H373 M354 246 H366' }));
      wire(svg, 'M360 200 V230', I > 0.001);
      // Gate drive from the pin.
      var gateHigh = vg > VTH;
      wire(svg, 'M330 170 H220', gateHigh);
      if (s.float) {
        wire(svg, 'M150 170 H175', false);
        label(svg, 198, 160, '?', 'ee-value');
      } else {
        wire(svg, 'M150 170 H220', gateHigh);
      }
      svg.appendChild(el('rect', { x: 40, y: 140, width: 110, height: 60, rx: 8, fill: '#00878f', stroke: '#005c63', 'stroke-width': 2 }));
      svg.appendChild(el('text', { x: 95, y: 166, fill: '#fff', 'text-anchor': 'middle', 'font-weight': 800, 'font-size': 13, 'font-family': 'Inter, system-ui, sans-serif' }, 'Arduino pin 9'));
      svg.appendChild(el('text', { x: 95, y: 186, fill: '#fff', 'text-anchor': 'middle', 'font-size': 12, 'font-family': 'Inter, system-ui, sans-serif' }, s.float ? 'unplugged' : fmt(s.pin, 'V')));
      if (s.pd) {
        wire(svg, 'M260 170 V210', false);
        svg.appendChild(el('rect', { class: 'ee-part', x: 250, y: 210, width: 20, height: 40, rx: 3 }));
        wire(svg, 'M260 250 V262', false);
        svg.appendChild(el('path', { class: 'ee-part-line', d: 'M245 262 H275 M251 269 H269 M256 276 H264' }));
        label(svg, 240, 236, '10 kΩ', 'ee-label', 'end');
        svg.appendChild(el('circle', { class: 'ee-node', cx: 260, cy: 170, r: 4 }));
      }
      label(svg, 260, 158, fmt(vg, 'V'), 'ee-value');

      document.getElementById('fet-g').textContent = fmt(vg, 'V');
      document.getElementById('fet-i').textContent = fmt(I, 'A');
      document.getElementById('fet-ig').textContent = s.float ? '0 A' : s.pd ? fmt(s.pin / RPD, 'A') : '≈ 0 A';
      document.getElementById('fet-state').textContent = on ? 'ON' : partial ? 'Partly on' : 'OFF';
      var coach = document.getElementById('fet-coach');
      if (s.float && !s.pd) {
        coach.dataset.tone = 'bad';
        coach.innerHTML = '<strong>Floating gate</strong>Nothing holds the gate at any voltage, so static charge and your hand nearby push it around. The strip flickers on its own. A pull-down resistor fixes this.';
      } else if (s.float && s.pd) {
        coach.dataset.tone = 'ok';
        coach.innerHTML = '<strong>Pulled down</strong>With the pin unplugged, the 10 kΩ resistor drains the gate to 0 V. The load stays reliably OFF, which is exactly what you want while the Arduino is booting.';
      } else if (partial) {
        coach.dataset.tone = 'warn';
        coach.innerHTML = '<strong>Partly on</strong>Between about ' + VTH + ' V and ' + (VTH + 1.5) + ' V the channel is only partly open. The transistor acts like a resistor and gets hot. Digital logic avoids this zone: drive the gate fully LOW or fully HIGH.';
      } else if (on) {
        coach.dataset.tone = 'ok';
        coach.innerHTML = '<strong>Fully on</strong>The pin supplies a voltage, not current: the gate draws almost nothing' + (s.pd ? ' (only the 0.5 mA that leaks through the pull-down)' : '') + ', yet ' + fmt(I, 'A') + ' flows through the load.';
      } else {
        coach.dataset.tone = 'ok';
        coach.innerHTML = '<strong>Off</strong>The gate is below the ' + VTH + ' V threshold, so the channel is closed. Slide the gate voltage up.';
      }
    }

    function setFloat(f) {
      s.float = f;
      document.getElementById('fet-float').setAttribute('aria-pressed', f ? 'true' : 'false');
      document.getElementById('fet-float').textContent = f ? 'Reconnect the pin' : 'Disconnect the pin';
      if (timer) { clearInterval(timer); timer = null; }
      if (f) {
        timer = setInterval(function () {
          if (s.pd) s.vg = 0;
          else {
            wander += (Math.random() - 0.5) * 1.6;
            wander = Math.max(0, Math.min(5, wander));
            s.vg = wander;
          }
          draw();
        }, 140);
      } else s.vg = s.pin;
      draw();
    }

    EELab.slider(document.getElementById('fet-vg'), function (v) { s.pin = v; if (!s.float) s.vg = v; draw(); }, function (v) { return v.toFixed(2) + ' V'; });
    document.getElementById('fet-float').addEventListener('click', function () { setFloat(!s.float); });
    document.getElementById('fet-pd').addEventListener('click', function () {
      s.pd = !s.pd;
      this.setAttribute('aria-pressed', s.pd ? 'true' : 'false');
      if (s.float && s.pd) s.vg = 0;
      draw();
    });
    window.FetLab = { state: s, load: load };
  })();

  // ── Sim 2: gate workshop ──────────────────────────────────────────────
  (function () {
    var svg = document.getElementById('gate-svg');
    if (!svg) return;
    var s = { gate: 'NOT', a: false, b: false };
    var seen = {};

    // Transistor drawn as a labelled switch between (x, y1) and (x, y2).
    function fet(x, y1, y2, input, on) {
      wire(svg, 'M' + x + ' ' + y1 + ' V' + (y1 + 12), on);
      wire(svg, 'M' + x + ' ' + (y2 - 12) + ' V' + y2, on);
      svg.appendChild(el('rect', { x: x - 22, y: y1 + 12, width: 44, height: y2 - y1 - 24, rx: 6, fill: on ? 'color-mix(in srgb, var(--ee-ok) 20%, var(--ee-sheet))' : 'var(--ee-sheet)', stroke: on ? HIGH : 'var(--ee-ink)', 'stroke-width': 2.5 }));
      label(svg, x, y1 + (y2 - y1) / 2 + 5, input, 'ee-value');
      label(svg, x + 30, y1 + (y2 - y1) / 2 + 5, on ? 'on' : 'off', 'ee-label', 'start');
    }
    function pullUp(x, yTop, yOut) {
      label(svg, x, yTop - 8, '+5 V', 'ee-value');
      wire(svg, 'M' + x + ' ' + yTop + ' V' + (yTop + 10), true);
      svg.appendChild(el('rect', { class: 'ee-part', x: x - 10, y: yTop + 10, width: 20, height: 46, rx: 3 }));
      label(svg, x - 18, yTop + 38, 'pull-up', 'ee-label', 'end');
    }
    function ground(x, y) {
      svg.appendChild(el('path', { class: 'ee-part-line', d: 'M' + (x - 18) + ' ' + y + ' H' + (x + 18) + ' M' + (x - 11) + ' ' + (y + 7) + ' H' + (x + 11) + ' M' + (x - 5) + ' ' + (y + 14) + ' H' + (x + 5) }));
    }

    function drawTransistorLevel(out) {
      var x = 200, yTop = 34, yOut = 110;
      pullUp(x, yTop, yOut);
      wire(svg, 'M' + x + ' 90 V' + yOut, out);
      wire(svg, 'M' + x + ' ' + yOut + ' H420', out);
      svg.appendChild(el('circle', { class: 'ee-node', cx: x, cy: yOut, r: 5 }));
      lamp(svg, 450, yOut, out, 'Y');
      if (s.gate === 'NOT') {
        fet(x, yOut, 210, 'A', s.a);
        wire(svg, 'M' + x + ' 210 V250', s.a); ground(x, 250);
      } else if (s.gate === 'NAND') {
        fet(x, yOut, 190, 'A', s.a);
        fet(x, 190, 270, 'B', s.b);
        ground(x, 280); wire(svg, 'M' + x + ' 270 V280', s.a && s.b);
      } else {
        wire(svg, 'M' + x + ' ' + yOut + ' V130 M130 130 H270', out);
        fet(130, 130, 230, 'A', s.a);
        fet(270, 130, 230, 'B', s.b);
        wire(svg, 'M130 230 V250 H270 V230 M200 250 V262', s.a || s.b);
        ground(200, 262);
      }
    }

    function drawBlocks(out) {
      var A = s.a, B = s.b;
      label(svg, 40, 104, 'A', 'ee-value'); label(svg, 40, 194, 'B', 'ee-value');
      if (s.gate === 'AND' || s.gate === 'OR') {
        var first = s.gate === 'AND' ? 'NAND' : 'NOR';
        var mid = GATES[first](A, B);
        wire(svg, 'M52 100 H150 M52 190 H120 V130 H150', false);
        wire(svg, 'M52 100 H150', A); wire(svg, 'M52 190 H120 V130 H150', B);
        box(svg, 150, 85, 90, 60, first);
        wire(svg, 'M240 115 H290', mid);
        label(svg, 265, 106, mid ? '1' : '0', 'ee-value');
        box(svg, 290, 85, 80, 60, 'NOT');
        wire(svg, 'M370 115 H420', out);
        lamp(svg, 450, 115, out, 'Y');
        label(svg, 260, 210, first + ' gives the opposite answer; NOT flips it back.', 'ee-label');
      } else {
        var or = A || B, nand = !(A && B);
        wire(svg, 'M52 100 H90 V70 H150 M90 100 V160 H150', A);
        wire(svg, 'M52 190 H110 V100 H150 M110 190 V190 H150', B);
        box(svg, 150, 55, 80, 55, 'OR');
        box(svg, 150, 150, 80, 55, 'NAND');
        wire(svg, 'M230 82 H270 V110 H300', or);
        wire(svg, 'M230 177 H270 V140 H300', nand);
        label(svg, 252, 74, or ? '1' : '0', 'ee-value');
        label(svg, 252, 196, nand ? '1' : '0', 'ee-value');
        box(svg, 300, 98, 80, 55, 'AND');
        wire(svg, 'M380 125 H420', out);
        lamp(svg, 450, 125, out, 'Y');
      }
    }

    function draw() {
      var fn = GATES[s.gate];
      var out = s.gate === 'NOT' ? fn(s.a) : fn(s.a, s.b);
      svg.textContent = '';
      if (s.gate === 'NOT' || s.gate === 'NAND' || s.gate === 'NOR') drawTransistorLevel(out);
      else drawBlocks(out);
      document.querySelector('[data-in="B"]').hidden = s.gate === 'NOT';

      var key = s.gate + (s.a ? 1 : 0) + (s.gate === 'NOT' ? '' : (s.b ? 1 : 0));
      seen[key] = true;
      var table = document.getElementById('gate-truth');
      var rows = s.gate === 'NOT' ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
      var html = '<thead><tr><th>A</th>' + (s.gate === 'NOT' ? '' : '<th>B</th>') + '<th>Y</th></tr></thead><tbody>';
      var filled = 0;
      rows.forEach(function (r) {
        var k = s.gate + r.join('');
        var now = r[0] === (s.a ? 1 : 0) && (r.length === 1 || r[1] === (s.b ? 1 : 0));
        var y = r.length === 1 ? fn(!!r[0]) : fn(!!r[0], !!r[1]);
        if (seen[k]) filled++;
        html += '<tr' + (now ? ' class="is-now"' : '') + '>' + r.map(function (v) { return '<td>' + v + '</td>'; }).join('') +
          '<td>' + (seen[k] ? (y ? 1 : 0) : '?') + '</td></tr>';
      });
      table.innerHTML = html + '</tbody>';
      var coach = document.getElementById('gate-coach');
      coach.dataset.tone = filled === rows.length ? 'ok' : '';
      coach.innerHTML = '<strong>' + s.gate + (filled === rows.length ? ': table complete' : ': try every input combination (' + filled + ' of ' + rows.length + ')') + '</strong>' + RULES[s.gate];
    }

    EELab.tabs(document.getElementById('gate-pick'), function (g) { s.gate = g; draw(); });
    document.querySelectorAll('[data-in]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var k = btn.dataset.in.toLowerCase();
        s[k] = !s[k];
        btn.setAttribute('aria-pressed', s[k] ? 'true' : 'false');
        draw();
      });
    });
    window.GateLab = { state: s, draw: draw };
  })();

  // ── Sim 3: half adder ─────────────────────────────────────────────────
  (function () {
    var svg = document.getElementById('add-svg');
    if (!svg) return;
    var s = { a: false, b: false };
    var sumSel = document.getElementById('add-sum');
    var carrySel = document.getElementById('add-carry');

    function draw() {
      var gs = sumSel.value, gc = carrySel.value;
      var S = GATES[gs](s.a, s.b), C = GATES[gc](s.a, s.b);
      svg.textContent = '';
      label(svg, 40, 74, 'A', 'ee-value'); label(svg, 40, 184, 'B', 'ee-value');
      wire(svg, 'M52 70 H120 V60 H220 M120 70 V160 H220', s.a);
      wire(svg, 'M52 180 H150 V90 H220 M150 180 V190 H220', s.b);
      box(svg, 220, 45, 100, 60, gs);
      box(svg, 220, 145, 100, 60, gc);
      wire(svg, 'M320 75 H420', S);
      wire(svg, 'M320 175 H420', C);
      lamp(svg, 450, 75, S, 'sum');
      lamp(svg, 450, 175, C, 'carry');
      label(svg, 520, 130, (C ? 1 : 0) + '' + (S ? 1 : 0), 'ee-value');
      label(svg, 520, 148, 'binary', 'ee-label');

      var rows = [[0, 0], [0, 1], [1, 0], [1, 1]];
      var good = 0;
      var html = '<thead><tr><th>A</th><th>B</th><th>A+B</th><th>carry</th><th>sum</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        var a = !!r[0], b = !!r[1];
        var sum = GATES[gs](a, b) ? 1 : 0, carry = GATES[gc](a, b) ? 1 : 0;
        var want = r[0] + r[1];
        var okC = carry === (want >> 1), okS = sum === (want & 1);
        if (okC && okS) good++;
        var now = a === s.a && b === s.b;
        html += '<tr' + (now ? ' class="is-now"' : '') + '><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + want + ' = ' + (want >> 1) + '' + (want & 1) + '</td>' +
          '<td class="' + (okC ? 'is-good' : 'is-bad') + '">' + carry + '</td><td class="' + (okS ? 'is-good' : 'is-bad') + '">' + sum + '</td></tr>';
      });
      document.getElementById('add-truth').innerHTML = html + '</tbody>';
      var coach = document.getElementById('add-coach');
      if (good === 4) {
        coach.dataset.tone = 'ok';
        coach.innerHTML = '<strong>It adds!</strong>' + gs + ' for the sum and ' + gc + ' for the carry give the right answer on every row. You just built the circuit that does arithmetic inside every processor.';
      } else {
        coach.dataset.tone = 'warn';
        coach.innerHTML = '<strong>' + good + ' of 4 rows correct</strong>Red cells are wrong. The sum should be 1 when exactly one input is 1. The carry should be 1 only for 1 + 1.';
      }
      return good;
    }

    [sumSel, carrySel].forEach(function (sel) { sel.addEventListener('change', draw); });
    document.querySelectorAll('[data-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var k = btn.dataset.add.toLowerCase();
        s[k] = !s[k];
        btn.setAttribute('aria-pressed', s[k] ? 'true' : 'false');
        draw();
      });
    });
    draw();
    window.AdderLab = { state: s, draw: draw };
  })();

  // ── Sim 4: SR latch ───────────────────────────────────────────────────
  (function () {
    var svg = document.getElementById('latch-svg');
    if (!svg) return;
    var s = { S: false, R: false, Q: false, Qn: true };

    function settle() {
      for (var i = 0; i < 6; i++) {
        var q = !(s.R || s.Qn);
        var qn = !(s.S || s.Q);
        s.Q = q; s.Qn = qn;
      }
    }

    function draw() {
      svg.textContent = '';
      label(svg, 30, 64, 'R', 'ee-value'); label(svg, 30, 204, 'S', 'ee-value');
      wire(svg, 'M44 60 H200', s.R);
      wire(svg, 'M44 200 H200', s.S);
      box(svg, 200, 40, 100, 70, 'NOR');
      box(svg, 200, 160, 100, 70, 'NOR');
      // Outputs and the cross-coupled feedback.
      wire(svg, 'M300 75 H420', s.Q);
      wire(svg, 'M360 75 V130 L150 150 V215 H200', s.Q);
      wire(svg, 'M300 195 H420', s.Qn);
      wire(svg, 'M380 195 V150 L170 130 V90 H200', s.Qn);
      svg.appendChild(el('circle', { class: 'ee-node', cx: 360, cy: 75, r: 5 }));
      svg.appendChild(el('circle', { class: 'ee-node', cx: 380, cy: 195, r: 5 }));
      lamp(svg, 450, 75, s.Q, 'Q');
      lamp(svg, 450, 195, s.Qn, 'not Q');
      document.getElementById('latch-sv').textContent = s.S ? '1' : '0';
      document.getElementById('latch-rv').textContent = s.R ? '1' : '0';
      document.getElementById('latch-q').textContent = s.Q ? '1' : '0';
      var coach = document.getElementById('latch-coach');
      if (s.S && s.R) {
        coach.dataset.tone = 'bad';
        coach.innerHTML = '<strong>Forbidden input</strong>Set and Reset at once forces both outputs to 0, so “not Q” is no longer the opposite of Q. When you let go of both, the result depends on which you release first. Designers make sure this never happens.';
      } else if (s.S || s.R) {
        coach.dataset.tone = '';
        coach.innerHTML = '<strong>' + (s.S ? 'Setting' : 'Resetting') + '</strong>Q is forced to ' + (s.S ? '1' : '0') + '. Now let go and watch whether it stays.';
      } else {
        coach.dataset.tone = 'ok';
        coach.innerHTML = '<strong>Holding: Q = ' + (s.Q ? '1' : '0') + '</strong>Both inputs are 0, yet Q keeps its value. Each NOR gate\'s output feeds the other\'s input, so the pair holds itself in place. That\'s memory.';
      }
    }

    function holdButton(btn, key) {
      function on(e) { if (e) e.preventDefault(); s[key] = true; settle(); draw(); btn.setAttribute('aria-pressed', 'true'); }
      function off() { if (!s[key]) return; s[key] = false; settle(); draw(); btn.setAttribute('aria-pressed', 'false'); }
      btn.addEventListener('pointerdown', on);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointerleave', off);
      btn.addEventListener('pointercancel', off);
      btn.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) on(e); });
      btn.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') off(); });
      btn.setAttribute('aria-pressed', 'false');
    }
    holdButton(document.getElementById('latch-s'), 'S');
    holdButton(document.getElementById('latch-r'), 'R');
    settle();
    draw();
    window.LatchLab = { state: s, settle: settle, draw: draw };
  })();
})();
