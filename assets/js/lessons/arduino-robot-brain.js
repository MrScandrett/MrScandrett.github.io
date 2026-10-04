/* Arduino: The Robot Brain — illustrated Uno + breadboard, execution tracer,
   blink scope and Morse sequencer. Everything runs off one simulated clock per
   sim so the board, the code highlight, the scope trace and the Serial Monitor
   always agree with each other. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var uid = 0;

  function svgEl(tag, attrs, parent) {
    var el = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
  function stamp(ms) {
    var s = Math.floor(ms / 1000);
    return pad(Math.floor(s / 3600), 2) + ':' + pad(Math.floor(s / 60) % 60, 2) + ':' + pad(s % 60, 2) + '.' + pad(Math.floor(ms % 1000), 3);
  }

  /* ── Arduino Uno (drawn by assets/js/arduino-art.js) + breadboard LED circuit ── */
  function buildBench(host, opts) {
    opts = opts || {};
    var id = 'arb' + (++uid);
    var svg = svgEl('svg', { viewBox: '0 0 560 300', class: 'arb-bench', role: 'img', 'aria-label': opts.label || 'Arduino Uno wired to an LED on a breadboard' });
    var defs = svgEl('defs', null, svg);
    defs.innerHTML =
      '<radialGradient id="' + id + 'glow"><stop offset="0" stop-color="#fff3c4" stop-opacity=".95"/><stop offset=".25" stop-color="#ff7a45" stop-opacity=".75"/><stop offset="1" stop-color="#ff3d1f" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id + 'dome" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ffb3a1"/><stop offset=".35" stop-color="#e2412b"/><stop offset="1" stop-color="#7a1508"/></radialGradient>' +
      '<radialGradient id="' + id + 'domeOn" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#fffbe8"/><stop offset=".3" stop-color="#ff8a5c"/><stop offset="1" stop-color="#ff3b1a"/></radialGradient>' +
      '<filter id="' + id + 'shadow" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity=".45"/></filter>';

    // The board itself comes from the shared ArduinoArt engine.
    var bx = 14, by = 52;
    var uno = ArduinoArt.create('uno-r3');
    uno.g.setAttribute('transform', 'translate(' + bx + ' ' + by + ')');
    svg.appendChild(uno.g);

    // ── Breadboard ──
    var bb = svgEl('g', null, svg);
    svgEl('rect', { x: 352, y: 112, width: 196, height: 150, rx: 6, fill: '#f3f1ea', stroke: '#c9c4b5', filter: 'url(#' + id + 'shadow)' }, bb);
    svgEl('rect', { x: 352, y: 183, width: 196, height: 8, fill: '#e2ded2' }, bb);
    svgEl('line', { x1: 360, y1: 120, x2: 540, y2: 120, stroke: '#d0463a', 'stroke-width': 1.2 }, bb);
    svgEl('line', { x1: 360, y1: 254, x2: 540, y2: 254, stroke: '#3a6fd0', 'stroke-width': 1.2 }, bb);
    var hx0 = 362, hy = [133, 143, 153, 163, 173, 201, 211, 221, 231, 241];
    for (var col = 0; col < 18; col++) hy.forEach(function (y) { svgEl('rect', { x: hx0 + col * 10 - 1.8, y: y - 1.8, width: 3.6, height: 3.6, rx: .6, fill: '#57534a', opacity: '.55' }, bb); });
    function hole(colIndex, rowIndex) { return [hx0 + colIndex * 10, hy[rowIndex]]; }

    // Resistor 220 Ω from column 3 → column 8 (row 2)
    var rA = hole(3, 2), rB = hole(8, 2);
    svgEl('path', { d: 'M' + rA[0] + ' ' + rA[1] + 'H' + rB[0], stroke: '#9aa3ab', 'stroke-width': 1.8 }, bb);
    var rb = svgEl('g', { transform: 'translate(' + ((rA[0] + rB[0]) / 2) + ' ' + rA[1] + ')' }, bb);
    svgEl('rect', { x: -15, y: -5.5, width: 30, height: 11, rx: 5.5, fill: '#d8bf8c', stroke: '#a68b57', 'stroke-width': .8 }, rb);
    [['-9', '#d22'], ['-4', '#d22'], ['1', '#6b3b16'], ['9', '#c9a227']].forEach(function (band) { svgEl('rect', { x: band[0], y: -5.5, width: 3, height: 11, fill: band[1] }, rb); });
    svgEl('text', { x: 0, y: 17, 'text-anchor': 'middle', class: 'arb-svg-bbtext' }, rb).textContent = '220 Ω';

    // 5 mm LED: anode (long leg) column 8, cathode column 10, row 4
    var aH = hole(8, 4), kH = hole(10, 4);
    var ledG = svgEl('g', null, bb);
    var glow = svgEl('circle', { cx: (aH[0] + kH[0]) / 2, cy: 128, r: 58, fill: 'url(#' + id + 'glow)', opacity: 0, class: 'arb-glow' }, svg);
    svgEl('path', { d: 'M' + aH[0] + ' ' + aH[1] + 'V150', stroke: '#b5bcc2', 'stroke-width': 1.8 }, ledG);
    svgEl('path', { d: 'M' + kH[0] + ' ' + kH[1] + 'V160L' + (kH[0] - 3) + ' 150', fill: 'none', stroke: '#b5bcc2', 'stroke-width': 1.8 }, ledG);
    var mx = (aH[0] + kH[0]) / 2;
    svgEl('path', { d: 'M' + (mx - 12) + ' 150h24v-4h-24z', fill: '#b5231a' }, ledG);
    var dome = svgEl('path', { d: 'M' + (mx - 10) + ' 146V128a10 10 0 0 1 20 0V146z', fill: 'url(#' + id + 'dome)', stroke: '#7a1508', 'stroke-width': .8 }, ledG);
    svgEl('path', { d: 'M' + (mx - 6) + ' 140V129a5 6 0 0 1 4 -6', fill: 'none', stroke: '#fff', 'stroke-width': 1.6, opacity: '.55', 'stroke-linecap': 'round' }, ledG);
    svgEl('text', { x: aH[0] - 3, y: 186 + 3, 'text-anchor': 'end', class: 'arb-svg-bbtext' }, bb).textContent = '+';
    svgEl('text', { x: kH[0] + 4, y: 186 + 3, class: 'arb-svg-bbtext' }, bb).textContent = '−';

    // Jumper wires (drawn last so they sit on top)
    var pin13 = [bx + uno.pins['13'][0], by + 12], gndTop = [bx + uno.pins.GND[0], by + 12];
    var wIn = hole(3, 0), wGnd = hole(10, 0);
    function wire(d, color, extraClass) {
      var g = svgEl('g', { fill: 'none', 'stroke-linecap': 'round' }, svg);
      svgEl('path', { d: d, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 6.5 }, g);
      var core = svgEl('path', { d: d, stroke: color, 'stroke-width': 4.2 }, g);
      var flow = svgEl('path', { d: d, stroke: '#fff7c2', 'stroke-width': 1.6, 'stroke-dasharray': '2 9', opacity: 0, class: 'arb-current ' + (extraClass || '') }, g);
      svgEl('circle', { cx: d.split(' ')[0].slice(1), cy: d.split(' ')[1].split('C')[0], r: 3.4, fill: '#d9dde0' }, g);
      return { core: core, flow: flow };
    }
    var wSig = wire('M' + pin13[0] + ' ' + pin13[1] + 'C' + pin13[0] + ' -30 ' + wIn[0] + ' 30 ' + wIn[0] + ' ' + wIn[1], '#ff8c2a');
    var wG = wire('M' + gndTop[0] + ' ' + gndTop[1] + 'C' + gndTop[0] + ' -54 ' + wGnd[0] + ' 10 ' + wGnd[0] + ' ' + wGnd[1], '#3a4250', 'is-return');
    svgEl('text', { x: 450, y: 284, 'text-anchor': 'middle', class: 'arb-svg-wire' }, svg).textContent = 'pin 13 → 220 Ω → LED → GND';

    host.insertBefore(svg, host.firstChild);

    return {
      svg: svg,
      board: uno,
      setHigh: function (on) {
        svg.classList.toggle('is-high', !!on);
        uno.setLed('L', !!on);
        uno.setTrace('13', !!on);
        glow.setAttribute('opacity', on ? '1' : '0');
        dome.setAttribute('fill', 'url(#' + id + (on ? 'domeOn' : 'dome') + ')');
        wSig.flow.setAttribute('opacity', on ? '.95' : '0');
        wG.flow.setAttribute('opacity', on ? '.7' : '0');
      },
      pulseTX: function () { uno.pulse('TX', 90); },
      pressReset: function () { uno.pressReset(); }
    };
  }

  /* ── Scope: pin 13 voltage vs time ── */
  function Scope(canvas, opts) {
    var kit = SimKit.canvas2d(canvas, { height: opts.height || 132 });
    this.kit = kit;
    this.opts = opts;
  }
  Scope.prototype.grid = function (ctx, w, h, x0, top, bottom) {
    ctx.fillStyle = '#071417';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(123,216,143,.10)';
    ctx.lineWidth = 1;
    for (var gx = x0; gx < w; gx += 24) { ctx.beginPath(); ctx.moveTo(gx + .5, 6); ctx.lineTo(gx + .5, h - 18); ctx.stroke(); }
    for (var gy = 6; gy < h - 18; gy += 16) { ctx.beginPath(); ctx.moveTo(x0, gy + .5); ctx.lineTo(w, gy + .5); ctx.stroke(); }
    ctx.font = '600 10px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#ffb36b'; ctx.fillText('5 V', 6, top + 4);
    ctx.fillStyle = '#7f9aa0'; ctx.fillText('0 V', 6, bottom + 4);
    ctx.fillStyle = 'rgba(255,179,107,.55)'; ctx.fillText('HIGH', 6, top + 16);
    ctx.fillStyle = 'rgba(127,154,160,.7)'; ctx.fillText('LOW', 6, bottom - 8);
  };
  // segments: [{t0, t1, high}] in ms. Draws the window [from, to].
  Scope.prototype.draw = function (segments, from, to, playhead, labels) {
    var ctx = this.kit.ctx, w = this.kit.width, h = this.kit.height;
    var x0 = 40, top = labels ? 30 : 18, bottom = h - 26;
    this.grid(ctx, w, h, x0, top, bottom);
    var span = Math.max(1, to - from);
    function X(t) { return x0 + (t - from) / span * (w - x0 - 8); }
    // filled HIGH regions
    ctx.fillStyle = 'rgba(255,122,69,.16)';
    segments.forEach(function (s) {
      if (!s.high || s.t1 < from || s.t0 > to) return;
      var a = X(Math.max(s.t0, from)), b = X(Math.min(s.t1, to));
      ctx.fillRect(a, top, b - a, bottom - top);
    });
    // trace
    ctx.save();
    ctx.shadowColor = '#7bd88f'; ctx.shadowBlur = 8;
    ctx.strokeStyle = '#7bd88f'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.beginPath();
    var started = false;
    segments.forEach(function (s) {
      if (s.t1 < from || s.t0 > to) return;
      var a = X(Math.max(s.t0, from)), b = X(Math.min(s.t1, to)), y = s.high ? top : bottom;
      if (!started) { ctx.moveTo(a, y); started = true; } else ctx.lineTo(a, y);
      ctx.lineTo(b, y);
    });
    ctx.stroke();
    ctx.restore();
    // time axis
    ctx.fillStyle = '#7f9aa0'; ctx.font = '500 10px "IBM Plex Mono", monospace'; ctx.textAlign = 'center';
    var tick = span > 8000 ? 2000 : span > 3000 ? 1000 : 500;
    for (var t = Math.ceil(from / tick) * tick; t <= to; t += tick) {
      var tx = X(t);
      ctx.fillRect(tx, bottom + 4, 1, 4);
      ctx.fillText((t / 1000).toFixed(tick < 1000 ? 1 : 0) + ' s', tx, h - 6);
    }
    if (labels) {
      ctx.font = '700 12px "IBM Plex Mono", monospace';
      labels.forEach(function (l) {
        if (l.t1 < from || l.t0 > to) return;
        ctx.fillStyle = l.active ? '#ffd166' : '#cfe4e0';
        ctx.fillText(l.text, X((l.t0 + l.t1) / 2), 18);
      });
    }
    ctx.textAlign = 'start';
    if (playhead != null) {
      var px = X(playhead);
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(px, 4); ctx.lineTo(px, bottom + 2); ctx.stroke(); ctx.setLineDash([]);
    }
  };

  /* ── 1. setup() vs loop() execution tracer ── */
  (function () {
    var root = document.getElementById('arb-trace');
    if (!root) return;
    var flow = document.getElementById('arb-flow');
    var token = document.getElementById('arb-flow-token');
    var statusEl = document.getElementById('anatomy-status');
    var setupCount = document.getElementById('arb-setup-count');
    var loopCount = document.getElementById('arb-loop-count');
    var miniLed = document.getElementById('arb-flow-led');
    var lines = {};
    root.querySelectorAll('[data-line]').forEach(function (el) { lines[el.dataset.line] = el; });
    var paths = {};
    flow.querySelectorAll('[data-path]').forEach(function (p) { paths[p.dataset.path] = p; });
    var nodes = {};
    flow.querySelectorAll('[data-node]').forEach(function (n) { nodes[n.dataset.node] = n; });

    // Each step: highlight one node/line or move the token along a path.
    var bootSteps = [
      { node: 'power', ms: 700, say: 'Power on — the board wakes up and jumps to setup().' },
      { path: 'p1', ms: 500 },
      { node: 'setup', line: 's1', ms: 900, say: 'setup(): pinMode(13, OUTPUT) — pin 13 becomes an output.' },
      { node: 'setup', line: 's2', ms: 900, say: 'setup(): Serial.begin(9600) — open the USB serial link.' },
      { path: 'p2', ms: 500 }
    ];
    var loopSteps = [
      { node: 'loop', line: 'l1', ms: 450, led: true },
      { node: 'loop', line: 'l2', ms: 800, led: true },
      { node: 'loop', line: 'l3', ms: 450, led: false },
      { node: 'loop', line: 'l4', ms: 800, led: false },
      { path: 'p3', ms: 650 }
    ];
    var seq = [], idx = 0, elapsed = 0, running = false, setups = 0, loops = 0;
    function clear() {
      Object.keys(lines).forEach(function (k) { lines[k].classList.remove('is-pc'); });
      Object.keys(nodes).forEach(function (k) { nodes[k].classList.remove('is-active'); });
    }
    function enter(step) {
      clear();
      if (step.node) nodes[step.node].classList.add('is-active');
      if (step.line) lines[step.line].classList.add('is-pc');
      if (step.led != null) miniLed.classList.toggle('is-on', step.led);
      if (step.line === 's1') { setups++; setupCount.textContent = setups; }
      if (step.line === 'l1') { loops++; loopCount.textContent = loops; statusEl.textContent = 'loop() pass #' + loops + ' — setup() has run ' + setups + (setups === 1 ? ' time.' : ' times (once per power-on or reset).'); }
      if (step.say) statusEl.textContent = step.say;
      token.style.opacity = step.path ? '1' : '0';
    }
    function place(step, f) {
      if (!step.path) return;
      var p = paths[step.path], L = p.getTotalLength(), pt = p.getPointAtLength(L * (reduceMotion ? 1 : f));
      token.setAttribute('cx', pt.x); token.setAttribute('cy', pt.y);
    }
    function boot() {
      seq = bootSteps.slice(); idx = 0; elapsed = 0; running = true;
      loops = 0; loopCount.textContent = '0';
      miniLed.classList.remove('is-on');
      enter(seq[0]);
      document.getElementById('anatomy-run').textContent = '■ Stop';
    }
    SimKit.loop(function (dt) {
      if (!running) return;
      elapsed += dt * 1000;
      var step = seq[idx];
      place(step, Math.min(1, elapsed / step.ms));
      if (elapsed >= step.ms) {
        elapsed = 0; idx++;
        if (idx >= seq.length) { seq = loopSteps; idx = 0; }
        enter(seq[idx]);
      }
    });
    document.getElementById('anatomy-run').addEventListener('click', function () {
      if (running) {
        running = false; clear(); token.style.opacity = '0';
        this.textContent = '▶ Power on';
        statusEl.textContent = 'Stopped. In real life only unplugging stops loop() — it never "finishes".';
        return;
      }
      setups = 0; setupCount.textContent = '0';
      boot();
    });
    document.getElementById('anatomy-reset').addEventListener('click', function () {
      if (!running) { setups = 0; setupCount.textContent = '0'; }
      boot();
      statusEl.textContent = 'RESET pressed — the sketch starts over, so setup() runs again.';
    });
  })();

  /* ── 2. Blink lab ── */
  (function () {
    var host = document.getElementById('blink-bench');
    if (!host) return;
    var bench = buildBench(host, { label: 'Arduino Uno: pin 13 wired through a 220 ohm resistor to a red LED on a breadboard' });
    var scope = new Scope(document.getElementById('blink-scope'), { height: 132 });
    var serial = document.getElementById('blink-serial');
    var delayInput = document.getElementById('blink-delay');
    var caption = document.getElementById('blink-caption');
    var readout = document.getElementById('blink-readout');
    var pauseBtn = document.getElementById('blink-pause');
    var codeLines = {};
    document.querySelectorAll('#blink-code [data-line]').forEach(function (el) { codeLines[el.dataset.line] = el; });
    var delayNums = document.querySelectorAll('#blink-code .arb-delay-num');

    var t = 0, high = false, phaseStart = 0, segments = [], paused = false, lineCount = 0;
    function print(text) {
      var line = document.createElement('div');
      line.className = 'arb-serial-line';
      line.innerHTML = '<span class="ts">' + stamp(t) + ' -&gt;</span> ';
      line.appendChild(document.createTextNode(text));
      serial.appendChild(line);
      while (serial.children.length > 40) serial.removeChild(serial.firstChild);
      serial.scrollTop = serial.scrollHeight;
      bench.pulseTX();
      lineCount++;
    }
    function flash(key) {
      var el = codeLines[key];
      el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash');
    }
    function write(level) {
      high = level;
      phaseStart = t;
      if (segments.length) segments[segments.length - 1].t1 = t;
      segments.push({ t0: t, t1: t, high: level });
      while (segments.length > 120) segments.shift();
      bench.setHigh(level);
      caption.textContent = 'pin 13 · ' + (level ? 'HIGH (5 V) · LED on' : 'LOW (0 V) · LED off');
      flash(level ? 'w1' : 'w2');
      flash(level ? 'p1' : 'p2');
      print(level ? 'LED ON' : 'LED OFF');
      codeLines.d1.classList.toggle('is-pc', level);
      codeLines.d2.classList.toggle('is-pc', !level);
    }
    function update() {
      var d = Number(delayInput.value);
      document.getElementById('blink-delay-value').textContent = d;
      delayNums.forEach(function (n) { n.textContent = d; });
      var period = 2 * d;
      readout.innerHTML = '<b>' + period + ' ms</b> per blink · <b>' + (1000 / period).toFixed(2) + ' Hz</b> · <b>' + Math.round(60000 / period) + '</b> blinks/min';
    }
    delayInput.addEventListener('input', update);
    pauseBtn.addEventListener('click', function () {
      paused = !paused;
      pauseBtn.textContent = paused ? '▶ Resume' : '❚❚ Pause';
      pauseBtn.setAttribute('aria-pressed', String(paused));
    });
    update();
    print('Serial.begin(9600) — ready');
    write(true);
    SimKit.loop(function (dt) {
      if (!paused) {
        t += Math.min(dt, .1) * 1000;
        var d = Number(delayInput.value);
        if (t - phaseStart >= d) { t = phaseStart + d; write(!high); }
        segments[segments.length - 1].t1 = t;
        var f = Math.min(1, (t - phaseStart) / d);
        (high ? codeLines.d1 : codeLines.d2).style.setProperty('--p', f);
      }
      var win = 6000;
      scope.draw(segments, Math.max(0, t - win), Math.max(win, t), t);
    });
  })();

  /* ── 3. Morse challenge ── */
  (function () {
    var host = document.getElementById('morse-bench');
    if (!host) return;
    var MORSE = { A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..','0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.' };
    var bench = buildBench(host, { label: 'Arduino Uno wired to a red LED that flashes the Morse message' });
    var scope = new Scope(document.getElementById('morse-scope'), { height: 140 });
    var input = document.getElementById('morse-input');
    var sendBtn = document.getElementById('morse-send');
    var unitInput = document.getElementById('morse-unit');
    var lettersEl = document.getElementById('morse-letters');
    var codeEl = document.getElementById('morse-code');
    var statusEl = document.getElementById('morse-status');
    var chart = document.getElementById('morse-chart');
    var chartCells = {};
    Object.keys(MORSE).sort().forEach(function (ch) {
      var span = document.createElement('span');
      span.innerHTML = '<b>' + ch + '</b> ' + MORSE[ch].replace(/\./g, '•').replace(/-/g, '▬');
      chart.appendChild(span);
      chartCells[ch] = span;
    });

    var plan = null, playing = false, t = 0, lastLetter = -1, lastHigh = null;
    function compile(text) {
      text = text.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim() || 'SOS';
      var unit = Number(unitInput.value);
      var segs = [], labels = [], code = [], tt = 0, letters = [];
      function seg(high, units, li) { segs.push({ t0: tt, t1: tt + units * unit, high: high, letter: li }); tt += units * unit; }
      code.push({ text: 'const int LED = 13;' });
      code.push({ text: 'const int DOT = ' + unit + ';            // 1 unit (ms)' });
      code.push({ text: '' });
      code.push({ text: 'void flash(int units) {' });
      code.push({ text: '  digitalWrite(LED, HIGH); delay(units * DOT);' });
      code.push({ text: '  digitalWrite(LED, LOW);  delay(DOT);   // 1-unit gap' });
      code.push({ text: '}' });
      code.push({ text: '' });
      code.push({ text: 'void loop() {' });
      text.split('').forEach(function (ch, i) {
        if (ch === ' ') {
          letters.push({ ch: ' ', i: i });
          seg(false, 6, i);
          code.push({ text: '  delay(6 * DOT);                // word gap → 7 units', li: i });
          return;
        }
        var pattern = MORSE[ch], li = i;
        letters.push({ ch: ch, i: i, pattern: pattern });
        var t0 = tt;
        pattern.split('').forEach(function (sym) { seg(true, sym === '.' ? 1 : 3, li); seg(false, 1, li); });
        labels.push({ t0: t0, t1: tt, text: ch, li: li });
        var calls = pattern.split('').map(function (s) { return s === '.' ? 'flash(1);' : 'flash(3);'; }).join(' ');
        code.push({ text: '  ' + calls + (calls.length < 31 ? new Array(32 - calls.length).join(' ') : ' ') + '// ' + ch + '  ' + pattern.replace(/\./g, '•').replace(/-/g, '▬'), li: li });
        var next = text[i + 1];
        if (next && next !== ' ') { seg(false, 2, li); code.push({ text: '  delay(2 * DOT);                // letter gap → 3 units', li: li }); }
      });
      seg(false, 6, -1);
      code.push({ text: '  delay(6 * DOT);                // pause, then repeat', li: -1 });
      code.push({ text: '}' });
      return { text: text, segs: segs, labels: labels, code: code, letters: letters, total: tt, unit: unit };
    }
    function render(p) {
      lettersEl.innerHTML = '';
      p.letters.forEach(function (l) {
        var el = document.createElement('span');
        el.className = 'arb-morse-letter' + (l.ch === ' ' ? ' is-space' : '');
        el.dataset.li = l.i;
        el.innerHTML = l.ch === ' ' ? '&nbsp;' : '<b>' + l.ch + '</b><i>' + l.pattern.replace(/\./g, '•').replace(/-/g, '▬') + '</i>';
        lettersEl.appendChild(el);
      });
      codeEl.innerHTML = '';
      p.code.forEach(function (c) {
        var line = document.createElement('span');
        line.className = 'arb-cl';
        if (c.li != null) line.dataset.li = c.li;
        var comment = c.text.indexOf('//');
        if (comment >= 0) {
          line.appendChild(document.createTextNode(c.text.slice(0, comment)));
          var cm = document.createElement('span'); cm.className = 'c'; cm.textContent = c.text.slice(comment); line.appendChild(cm);
        } else line.textContent = c.text || ' ';
        codeEl.appendChild(line);
      });
    }
    function highlight(li) {
      lettersEl.querySelectorAll('.arb-morse-letter').forEach(function (el) { el.classList.toggle('is-active', Number(el.dataset.li) === li); });
      codeEl.querySelectorAll('.arb-cl').forEach(function (el) { el.classList.toggle('is-pc', el.dataset.li != null && Number(el.dataset.li) === li); });
      Object.keys(chartCells).forEach(function (k) { chartCells[k].classList.remove('is-active'); });
      var ch = plan.text[li];
      if (chartCells[ch]) chartCells[ch].classList.add('is-active');
    }
    function play() {
      plan = compile(input.value);
      render(plan);
      t = 0; lastLetter = -2; lastHigh = null; playing = true;
      sendBtn.textContent = '↻ Restart';
      statusEl.textContent = 'Sending "' + plan.text + '" — ' + Math.round(plan.total / plan.unit) + ' units, ' + (plan.total / 1000).toFixed(1) + ' s at ' + plan.unit + ' ms per unit.';
    }
    function preview() {
      plan = compile(input.value);
      render(plan);
      playing = false; t = 0; bench.setHigh(false); highlight(-2);
      sendBtn.textContent = '▶ Blink it out';
    }
    sendBtn.addEventListener('click', play);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') play(); });
    input.addEventListener('input', preview);
    unitInput.addEventListener('input', function () {
      document.getElementById('morse-unit-value').textContent = unitInput.value;
      preview();
    });
    preview();

    SimKit.loop(function (dt) {
      if (!plan) return;
      var labels = plan.labels.map(function (l) { return { t0: l.t0, t1: l.t1, text: l.text, active: playing && l.li === lastLetter }; });
      if (playing) {
        t += Math.min(dt, .1) * 1000;
        if (t >= plan.total) {
          playing = false; t = plan.total; bench.setHigh(false); highlight(-2);
          sendBtn.textContent = '▶ Send again';
          statusEl.textContent = 'Done. On a real board loop() would start the message again immediately.';
        } else {
          var seg = null;
          for (var i = 0; i < plan.segs.length; i++) if (t >= plan.segs[i].t0 && t < plan.segs[i].t1) { seg = plan.segs[i]; break; }
          if (seg) {
            if (seg.high !== lastHigh) { bench.setHigh(seg.high); lastHigh = seg.high; }
            if (seg.letter !== lastLetter) { lastLetter = seg.letter; highlight(seg.letter); }
          }
        }
      }
      scope.draw(plan.segs, 0, plan.total, playing ? t : null, labels);
    });
  })();

  /* ── Quiz ── */
  document.querySelectorAll('.arb-question').forEach(function (question) {
    question.querySelectorAll('.arb-option').forEach(function (option) {
      option.addEventListener('click', function () {
        if (question.dataset.locked) return;
        question.dataset.locked = 'true';
        question.querySelectorAll('.arb-option').forEach(function (item) {
          item.disabled = true;
          if (item.dataset.choice === question.dataset.answer) item.classList.add('is-correct');
        });
        var correct = option.dataset.choice === question.dataset.answer;
        if (!correct) option.classList.add('is-wrong');
        question.querySelector('.arb-feedback').textContent = (correct ? 'Correct. ' : 'Not quite. ') + question.dataset.explanation;
      });
    });
  });
})();
