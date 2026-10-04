/* ArduinoArt — one illustration engine for every Arduino drawn on the site.

   ArduinoArt.create(model, opts) → handle with an SVG <g> drawn in board-local
   units (its own <defs> included, so it can be dropped into any SVG), plus the
   coordinates of every header pin and labelled part so callers can attach
   wires, hotspots or highlights to the real positions.
   ArduinoArt.svg(model, opts)    → same handle with a standalone <svg>.
   <span data-arduino-art="uno-r3"> placeholders are filled automatically.

   Models: uno-r3, uno-r4-wifi, uno-q, nano-every.
   Options: labels (pin labels, default true), title (accessible name),
            padding (svg only, default 4).
   Handle:  g, svg, model, name, box {x,y,w,h}, pins {label: [x,y]} (repeated
            labels get "#2", "#3"…), pinList, anchors {part: [x,y]},
            boxes {part: [x,y,w,h]}, setLed(name, on), pulse(name, ms),
            setTrace(name, on), setMatrix(bits) (R4/Q), percent([x,y]). */
(function (global) {
  'use strict';
  if (global.ArduinoArt) return;
  var NS = 'http://www.w3.org/2000/svg';
  var MONO = '"IBM Plex Mono", ui-monospace, monospace';
  var uid = 0;

  function el(tag, attrs, parent) {
    var node = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function text(parent, x, y, str, o) {
    o = o || {};
    var t = el('text', {
      x: x, y: y, fill: o.fill || '#fff', 'font-family': o.family || MONO,
      'font-size': o.size || 6, 'font-weight': o.weight || 700, 'text-anchor': o.anchor || 'start'
    }, parent);
    if (o.rotate) { t.setAttribute('transform', 'rotate(' + o.rotate + ' ' + x + ' ' + y + ')'); }
    if (o.italic) t.setAttribute('font-style', 'italic');
    if (o.spacing) t.setAttribute('letter-spacing', o.spacing);
    if (o.opacity) t.setAttribute('opacity', o.opacity);
    t.textContent = str;
    return t;
  }

  var PCB = {
    teal: ['#0aa2a8', '#00757b', '#005357', '#2bc0c4'],
    blue: ['#2b6fbf', '#163f78', '#0e2c55', '#5ea0e8'],
    navy: ['#21508f', '#11305e', '#0a1f40', '#5a8fd6']
  };

  function Kit(model, opts) {
    this.id = 'aa' + (++uid);
    this.opts = opts;
    this.labels = opts.labels !== false;
    this.g = el('g', { class: 'arduino-art arduino-art-' + model });
    this.pins = {}; this.pinList = []; this.anchors = {}; this.boxes = {};
    this.leds = {}; this.traces = {}; this.matrix = null;
  }
  Kit.prototype.ref = function (name) { return 'url(#' + this.id + name + ')'; };
  Kit.prototype.defs = function (palette) {
    var p = PCB[palette], id = this.id;
    el('defs', null, this.g).innerHTML =
      '<linearGradient id="' + id + 'pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p[0] + '"/><stop offset="1" stop-color="' + p[1] + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".45" stop-color="#b9c1c8"/><stop offset="1" stop-color="#7d868e"/></linearGradient>' +
      '<linearGradient id="' + id + 'chip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3d42"/><stop offset="1" stop-color="#16181b"/></linearGradient>' +
      '<radialGradient id="' + id + 'amber"><stop offset="0" stop-color="#fffbe0"/><stop offset=".3" stop-color="#ffb02e" stop-opacity=".9"/><stop offset="1" stop-color="#ff8a00" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id + 'green"><stop offset="0" stop-color="#eaffea"/><stop offset=".3" stop-color="#5dff7a" stop-opacity=".8"/><stop offset="1" stop-color="#2bd94a" stop-opacity="0"/></radialGradient>' +
      '<filter id="' + id + 'shadow" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity=".4"/></filter>';
    this.palette = p;
  };
  Kit.prototype.anchor = function (name, x, y, w, h) {
    if (w != null) { this.boxes[name] = [x, y, w, h]; this.anchors[name] = [x + w / 2, y + h / 2]; }
    else this.anchors[name] = [x, y];
  };
  Kit.prototype.addPin = function (label, x, y, header) {
    var key = label, n = 2;
    while (this.pins[key]) key = label + '#' + (n++);
    this.pins[key] = [x, y];
    this.pinList.push({ key: key, label: label, x: x, y: y, header: header });
  };

  /* ── shared parts ── */
  // Female header strip; labels printed on the PCB beside it.
  Kit.prototype.header = function (name, x0, y0, labels, side, pitch) {
    var P = pitch || 9.6, g = this.g;
    el('rect', { x: x0, y: y0, width: labels.length * P, height: 12, fill: '#141516', rx: 1 }, g);
    for (var k = 0; k < labels.length; k++) {
      var cx = x0 + P / 2 + k * P;
      el('rect', { x: cx - 2.2, y: y0 + 3.8, width: 4.4, height: 4.4, fill: '#3b3d40' }, g);
      if (this.labels && labels[k]) {
        if (side === 'below') text(g, cx + 1.8, y0 + 16, labels[k], { size: 5.2, weight: 600, rotate: 90 });
        else text(g, cx + 1.8, y0 - 4, labels[k], { size: 5.2, weight: 600, rotate: -90 });
      }
      if (labels[k]) this.addPin(labels[k], cx, y0 + 6, name);
    }
  };
  // Castellated through-hole pads (Nano family)
  Kit.prototype.padRow = function (name, x0, y, labels, side, pitch) {
    var g = this.g;
    for (var k = 0; k < labels.length; k++) {
      var cx = x0 + k * pitch;
      el('circle', { cx: cx, cy: y, r: 3.6, fill: '#e2c46a', stroke: '#9c7d2a', 'stroke-width': .6 }, g);
      el('circle', { cx: cx, cy: y, r: 1.6, fill: '#101314' }, g);
      if (this.labels) text(g, cx + 1.7, side === 'below' ? y + 6.5 : y - 6.5, labels[k], { size: 4.3, weight: 600, rotate: side === 'below' ? 90 : -90 });
      this.addPin(labels[k], cx, y, name);
    }
  };
  Kit.prototype.mountHole = function (x, y) {
    el('circle', { cx: x, cy: y, r: 6.5, fill: '#d9c27a' }, this.g);
    el('circle', { cx: x, cy: y, r: 3.6, fill: '#0b1416' }, this.g);
  };
  Kit.prototype.qfp = function (name, x, y, s, label, sub, rotate) {
    var g = el('g', { transform: 'translate(' + (x + s / 2) + ' ' + (y + s / 2) + ')' + (rotate ? ' rotate(' + rotate + ')' : '') }, this.g);
    var n = Math.max(4, Math.round(s / 3.4)), step = (s - 4) / n;
    for (var i = 0; i < n; i++) {
      var o = -s / 2 + 2 + step * (i + .5) - .6;
      el('rect', { x: o, y: -s / 2 - 3, width: 1.2, height: s + 6, fill: '#cfd5da' }, g);
      el('rect', { x: -s / 2 - 3, y: o, width: s + 6, height: 1.2, fill: '#cfd5da' }, g);
    }
    var body = el('rect', { x: -s / 2, y: -s / 2, width: s, height: s, rx: 1.5, fill: this.ref('chip') }, g);
    el('circle', { cx: -s / 2 + 3.5, cy: -s / 2 + 3.5, r: 1.3, fill: '#0b0c0e' }, g);
    if (label) text(g, 0, sub ? -1 : 2, label, { size: Math.min(7, s / 5.2), anchor: 'middle', fill: '#c9ced3', spacing: '.04em' });
    if (sub) text(g, 0, 7, sub, { size: Math.min(5.5, s / 7), anchor: 'middle', fill: '#8fd9dc', weight: 600 });
    this.anchor(name, x, y, s, s);
    return body;
  };
  Kit.prototype.dip = function (name, x, y, w, h, legs, label, sub) {
    var g = el('g', { transform: 'translate(' + x + ' ' + y + ')' }, this.g);
    var step = (w - 6) / legs;
    for (var j = 0; j < legs; j++) {
      el('rect', { x: 4 + j * step, y: -5, width: 3, height: 6, fill: '#d7dce0' }, g);
      el('rect', { x: 4 + j * step, y: h - 1, width: 3, height: 6, fill: '#d7dce0' }, g);
    }
    var body = el('rect', { x: 0, y: 0, width: w, height: h, rx: 2, fill: this.ref('chip') }, g);
    el('circle', { cx: 0, cy: h / 2, r: 5, fill: '#0e1012' }, g);
    text(g, w / 2, h / 2 - 1.5, label, { size: 9, anchor: 'middle', fill: '#c9ced3', spacing: '.08em' });
    if (sub) text(g, w / 2, h / 2 + 9.5, sub, { size: 6.5, anchor: 'middle', fill: '#7fd6da', weight: 600 });
    this.anchor(name, x, y, w, h);
    return body;
  };
  Kit.prototype.smdLed = function (name, x, y, label, glow, lit) {
    var g = this.g;
    el('rect', { x: x - 4, y: y - 2.5, width: 8, height: 5, fill: '#f2efe4', stroke: '#b9b39b', 'stroke-width': .6 }, g);
    var core = el('rect', { x: x - 2, y: y - 2.5, width: 4, height: 5, fill: '#cfc9b3' }, g);
    var halo = el('circle', { cx: x, cy: y, r: 13, fill: this.ref(glow || 'amber'), opacity: 0, style: 'mix-blend-mode:screen;transition:opacity .06s' }, g);
    if (label) text(g, x + 7, y + 2.2, label, { size: 5.5, weight: 700 });
    var on = glow === 'green' ? '#7dff8f' : '#ffd166';
    var led = this.leds[name] = { core: core, halo: halo, on: on, timer: null };
    if (lit) this.setLed(name, true);
    this.anchor(name === 'L' ? 'led' : 'led-' + name.toLowerCase(), x, y);
    return led;
  };
  Kit.prototype.setLed = function (name, on) {
    var led = this.leds[name];
    if (!led) return;
    led.core.setAttribute('fill', on ? led.on : '#cfc9b3');
    led.halo.setAttribute('opacity', on ? '1' : '0');
  };
  Kit.prototype.pulse = function (name, ms) {
    var self = this, led = this.leds[name];
    if (!led) return;
    this.setLed(name, true);
    clearTimeout(led.timer);
    led.timer = setTimeout(function () { self.setLed(name, false); }, ms || 90);
  };
  Kit.prototype.setTrace = function (name, on) {
    var t = this.traces[name];
    if (t) t.path.setAttribute('stroke', on ? '#ffd166' : t.off);
  };
  Kit.prototype.button = function (name, x, y) {
    el('rect', { x: x - 9, y: y - 9, width: 18, height: 18, rx: 2, fill: this.ref('steel') }, this.g);
    var cap = el('circle', { cx: x, cy: y, r: 5.5, fill: '#c9302c', stroke: '#7d1714' }, this.g);
    this.anchor(name, x, y);
    return cap;
  };
  Kit.prototype.usbB = function (x, y) {
    el('rect', { x: x, y: y, width: 62, height: 52, rx: 2, fill: this.ref('steel'), stroke: '#5c656d' }, this.g);
    el('rect', { x: x, y: y + 10, width: 10, height: 32, fill: '#4b5359' }, this.g);
    this.anchor('usb', x, y, 62, 52);
  };
  Kit.prototype.usbC = function (x, y) {
    el('rect', { x: x, y: y, width: 34, height: 38, rx: 4, fill: this.ref('steel'), stroke: '#5c656d' }, this.g);
    el('rect', { x: x - 2, y: y + 10, width: 10, height: 18, rx: 4, fill: '#30363b' }, this.g);
    el('rect', { x: x + 1, y: y + 15, width: 4, height: 8, rx: 1, fill: '#9aa3ab' }, this.g);
    this.anchor('usb', x, y, 34, 38);
  };
  Kit.prototype.jack = function (x, y) {
    el('rect', { x: x, y: y, width: 58, height: 46, rx: 3, fill: '#1d1f22', stroke: '#000' }, this.g);
    el('circle', { cx: x + 16, cy: y + 23, r: 9, fill: '#0a0a0a', stroke: '#444' }, this.g);
    this.anchor('jack', x, y, 58, 46);
  };
  Kit.prototype.qwiic = function (x, y) {
    el('rect', { x: x, y: y, width: 14, height: 20, rx: 1.5, fill: '#f1efe6', stroke: '#a59f8a', 'stroke-width': .8 }, this.g);
    el('rect', { x: x + 3, y: y + 3, width: 8, height: 14, fill: '#d7d2c1' }, this.g);
    if (this.labels) text(this.g, x + 7, y - 3, 'QWIIC', { size: 4.5, anchor: 'middle' });
    this.anchor('qwiic', x, y, 14, 20);
  };
  Kit.prototype.ledMatrix = function (name, x, y, cols, rows, pitch, color) {
    var g = el('g', null, this.g), cells = [];
    el('rect', { x: x - 3, y: y - 3, width: cols * pitch + 2, height: rows * pitch + 2, rx: 2, fill: 'rgba(0,0,0,.18)' }, g);
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      cells.push(el('rect', { x: x + c * pitch, y: y + r * pitch, width: pitch * .55, height: pitch * .55, rx: .6, fill: '#f2efe4', stroke: '#b9b39b', 'stroke-width': .3 }, g));
    }
    this.matrix = { cells: cells, cols: cols, rows: rows, color: color };
    this.anchor(name, x - 3, y - 3, cols * pitch + 2, rows * pitch + 2);
  };
  // bits: array of row strings ('0'/'1') or a function (col,row)→bool
  Kit.prototype.setMatrix = function (bits) {
    var m = this.matrix;
    if (!m) return;
    for (var r = 0; r < m.rows; r++) for (var c = 0; c < m.cols; c++) {
      var on = typeof bits === 'function' ? bits(c, r) : bits && bits[r] && bits[r].charAt(c) === '1';
      var cell = m.cells[r * m.cols + c];
      cell.setAttribute('fill', on ? m.color : '#f2efe4');
      cell.setAttribute('style', on ? 'filter:drop-shadow(0 0 1.6px ' + m.color + ')' : '');
    }
  };
  Kit.prototype.logo = function (x, y, word, sub, size) {
    var s = size || 1, g = el('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + s + ')' }, this.g);
    var inf = el('g', { fill: 'none', stroke: '#fff', 'stroke-width': 3.2 }, g);
    el('ellipse', { cx: -9, cy: 0, rx: 9, ry: 7 }, inf);
    el('ellipse', { cx: 9, cy: 0, rx: 9, ry: 7 }, inf);
    el('path', { d: 'M-13 0h7M5 0h8M9-4v8', stroke: '#fff', 'stroke-width': 1.6 }, inf);
    text(g, 21, 8, word, { size: 26, weight: 800, italic: true, family: '"Barlow Condensed", "Arial Narrow", sans-serif' });
    if (sub) text(g, 22, 20, sub, { size: 8, spacing: '.12em' });
  };
  Kit.prototype.copper = function (paths) {
    var g = el('g', { fill: 'none', stroke: this.palette[3], 'stroke-width': 1.1, opacity: '.35', 'stroke-linecap': 'round' }, this.g);
    paths.forEach(function (d) { el('path', { d: d }, g); });
  };
  Kit.prototype.unoOutline = function () {
    el('path', { d: 'M6 0H262L272 10V22L300 44V190L286 206V222H6Q0 222 0 216V6Q0 0 6 0Z', fill: this.ref('pcb'), stroke: this.palette[2], 'stroke-width': 1.5, filter: this.ref('shadow') }, this.g);
    this.anchor('pcb', 150, 111);
  };
  Kit.prototype.unoHeaders = function (opts) {
    opts = opts || {};
    this.header('digital', 100, 6, ['SCL', 'SDA', 'AREF', 'GND', '13', '12', '~11', '~10', '~9', '8'], 'below');
    this.header('digital', 204, 6, ['7', '~6', '~5', '4', '~3', '2', 'TX→1', 'RX←0'], 'below');
    if (this.labels) text(this.g, 200, 58, 'DIGITAL (PWM ~)', { size: 5.5, anchor: 'middle', spacing: '.12em', opacity: '.85' });
    this.header('power', 112, 206, ['IOREF', 'RESET', '3.3V', '5V', 'GND', 'GND', 'VIN'], 'above');
    this.header('analog', 196, 206, opts.analog || ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'], 'above');
    this.anchor('digital', 100, 6, 182, 12);
    this.anchor('power', 112, 206, 67, 12);
    this.anchor('analog', 196, 206, 58, 12);
    this.anchor('dac', this.pins.A0[0], this.pins.A0[1]);
  };
  Kit.prototype.icsp = function (x, y) {
    for (var r = 0; r < 3; r++) for (var c = 0; c < 2; c++) el('rect', { x: x + c * 8, y: y + r * 8, width: 6, height: 6, fill: '#141516' }, this.g);
    this.anchor('icsp', x, y, 14, 22);
  };

  /* ── models ── */
  var MODELS = {
    'uno-r3': {
      name: 'Arduino UNO R3', palette: 'teal', box: [-16, -2, 320, 228],
      draw: function (k) {
        k.unoOutline();
        k.copper(['M90 90H140V128', 'M100 104H130L150 124', 'M70 120V150H118', 'M200 24V50H240L260 70', 'M180 24V40H160', 'M230 186V170H200', 'M246 186V176H270V150', 'M112 186V172H140', 'M88 70H120V52']);
        [[14, 12], [14, 210], [282, 60], [270, 210]].forEach(function (p) { k.mountHole(p[0], p[1]); });
        k.usbB(-14, 24);
        k.jack(-10, 154);
        k.resetCap = k.button('reset', 65, 15);
        k.qfp('bridge', 66, 80, 16, '', '', 0);
        el('rect', { x: 92, y: 114, width: 22, height: 9, rx: 4.5, fill: k.ref('steel') }, k.g);
        k.anchor('crystal', 92, 114, 22, 9);
        el('rect', { x: 52, y: 126, width: 20, height: 14, fill: '#222' }, k.g);
        el('rect', { x: 50, y: 120, width: 24, height: 6, fill: k.ref('steel') }, k.g);
        k.anchor('reg', 50, 120, 24, 20);
        [[66, 162], [84, 162]].forEach(function (p) {
          el('circle', { cx: p[0], cy: p[1], r: 8, fill: k.ref('steel'), stroke: '#6b737a' }, k.g);
          el('path', { d: 'M' + (p[0] - 4) + ' ' + p[1] + 'h8M' + p[0] + ' ' + (p[1] - 4) + 'v8', stroke: '#7d868e', 'stroke-width': 1 }, k.g);
        });
        k.mcuBody = k.dip('mcu', 130, 128, 138, 39, 14, 'ATMEGA328P', 'your sketch runs here');
        k.logo(176, 84, 'UNO', null);
        text(k.g, 196, 104, 'ARDUINO', { size: 8, spacing: '.12em' });
        k.unoHeaders();
        k.icsp(278, 104);
        var t = el('path', { d: 'M' + k.pins['13'][0] + ' 18V36H112V64', fill: 'none', stroke: k.palette[3], 'stroke-width': 1.6 }, k.g);
        k.traces['13'] = { path: t, off: k.palette[3] };
        k.smdLed('L', 112, 68, 'L');
        k.smdLed('TX', 112, 80, 'TX');
        k.smdLed('RX', 112, 92, 'RX');
        k.smdLed('ON', 258, 112, 'ON', 'green', true);
      }
    },
    'uno-r4-wifi': {
      name: 'Arduino UNO R4 WiFi', palette: 'navy', box: [-16, -2, 320, 228],
      draw: function (k) {
        k.unoOutline();
        k.copper(['M110 46H150V70', 'M96 100H130V116', 'M200 40V52H214', 'M246 92H270V120', 'M120 170H146V186', 'M220 170V186']);
        [[14, 12], [14, 210], [282, 60], [270, 210]].forEach(function (p) { k.mountHole(p[0], p[1]); });
        k.usbC(-8, 28);
        k.jack(-10, 154);
        k.resetCap = k.button('reset', 50, 15);
        // ESP32-S3 module: shielded can + PCB antenna
        el('rect', { x: 54, y: 82, width: 52, height: 50, rx: 2, fill: '#1b1d20' }, k.g);
        el('rect', { x: 57, y: 85, width: 46, height: 36, rx: 1.5, fill: k.ref('steel'), stroke: '#6b737a', 'stroke-width': .6 }, k.g);
        text(k.g, 80, 101, 'ESP32-S3', { size: 6.5, anchor: 'middle', fill: '#3c4248' });
        text(k.g, 80, 110, 'Wi-Fi · BLE', { size: 5, anchor: 'middle', fill: '#59616a', weight: 600 });
        el('path', { d: 'M60 128h6v-4h6v4h6v-4h6v4h6v-4h6v4h4', fill: 'none', stroke: '#e2c46a', 'stroke-width': 1.2 }, k.g);
        k.anchor('wifi', 54, 82, 52, 50);
        k.mcuBody = k.qfp('mcu', 220, 70, 32, 'RA4M1', 'sketch', 0);
        k.ledMatrix('matrix', 150, 118, 12, 8, 8, '#ff4b3a');
        // R4 badge: ∞ mark, ARDUINO wordmark, boxed model name
        var lg = el('g', { transform: 'translate(140 66) scale(.9)', fill: 'none', stroke: '#fff', 'stroke-width': 3.2 }, k.g);
        el('ellipse', { cx: -9, cy: 0, rx: 9, ry: 7 }, lg); el('ellipse', { cx: 9, cy: 0, rx: 9, ry: 7 }, lg);
        el('path', { d: 'M-13 0h7M5 0h8M9-4v8', 'stroke-width': 1.6 }, lg);
        text(k.g, 140, 86, 'ARDUINO', { size: 7.5, anchor: 'middle', spacing: '.08em' });
        el('rect', { x: 116, y: 91, width: 48, height: 22, fill: 'none', stroke: '#fff', 'stroke-width': 1 }, k.g);
        el('path', { d: 'M116 102H164M140 91V102', stroke: '#fff', 'stroke-width': 1 }, k.g);
        text(k.g, 128, 99.5, 'UNO', { size: 6.5, anchor: 'middle' });
        text(k.g, 152, 99.5, 'R4', { size: 6.5, anchor: 'middle' });
        text(k.g, 140, 110.5, 'WIFI', { size: 6.5, anchor: 'middle', spacing: '.1em' });
        k.unoHeaders({ analog: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'] });
        k.qwiic(280, 126);
        k.icsp(278, 160);
        k.smdLed('L', 112, 40, 'L');
        k.smdLed('TX', 130, 40, 'TX');
        k.smdLed('RX', 152, 40, 'RX');
        k.smdLed('ON', 262, 106, 'ON', 'green', true);
        el('rect', { x: 60, y: 150, width: 14, height: 9, rx: 1, fill: '#222' }, k.g);
        el('rect', { x: 80, y: 150, width: 14, height: 9, rx: 1, fill: '#222' }, k.g);
        k.anchor('reg', 60, 150, 34, 9);
      }
    },
    'uno-q': {
      name: 'Arduino UNO Q', palette: 'blue', box: [-16, -2, 320, 228],
      draw: function (k) {
        k.unoOutline();
        k.copper(['M108 66H140V110H150', 'M184 116H196', 'M248 74V100', 'M120 140V150', 'M230 150V186']);
        [[14, 12], [14, 210], [282, 60], [270, 210]].forEach(function (p) { k.mountHole(p[0], p[1]); });
        k.usbC(-8, 30);
        k.resetCap = k.button('reset', 50, 15);
        k.qfp('mpu', 58, 40, 50, 'QRB2210', 'Linux MPU', 0);
        el('rect', { x: 58, y: 106, width: 22, height: 16, rx: 1, fill: k.ref('chip') }, k.g);
        el('rect', { x: 86, y: 106, width: 22, height: 16, rx: 1, fill: k.ref('chip') }, k.g);
        if (k.labels) text(k.g, 83, 132, 'RAM · eMMC', { size: 5, anchor: 'middle', weight: 600 });
        k.anchor('memory', 58, 106, 50, 16);
        k.mcuBody = k.qfp('mcu', 150, 98, 34, 'STM32', 'U585 MCU', 0);
        // RPC link between the two brains
        el('path', { d: 'M108 70C134 70 128 115 150 115', fill: 'none', stroke: '#ffd166', 'stroke-width': 1.4, 'stroke-dasharray': '3 3', opacity: '.8' }, k.g);
        k.anchor('rpc', 130, 92);
        // wireless module + antenna
        el('rect', { x: 226, y: 66, width: 40, height: 26, rx: 2, fill: k.ref('steel'), stroke: '#6b737a', 'stroke-width': .6 }, k.g);
        text(k.g, 246, 82, 'Wi-Fi/BT', { size: 5.5, anchor: 'middle', fill: '#3c4248' });
        el('path', { d: 'M228 96h6v4h6v-4h6v4h6v-4h6v4h4', fill: 'none', stroke: '#e2c46a', 'stroke-width': 1.2 }, k.g);
        k.anchor('wireless', 226, 66, 40, 34);
        k.ledMatrix('matrix', 196, 112, 13, 8, 5.2, '#5ab0ff');
        // bottom-side high-speed connectors, shown dashed
        el('rect', { x: 54, y: 146, width: 84, height: 30, rx: 3, fill: 'none', stroke: '#fff', 'stroke-opacity': .55, 'stroke-dasharray': '4 3' }, k.g);
        if (k.labels) text(k.g, 96, 164, 'high-speed (underside)', { size: 5, anchor: 'middle', weight: 600, opacity: '.8' });
        k.anchor('carrier', 54, 146, 84, 30);
        k.logo(178, 168, 'UNO', 'Q', .72);
        k.unoHeaders();
        k.qwiic(280, 126);
        k.smdLed('L', 120, 40, 'L');
        k.smdLed('ON', 272, 108, 'ON', 'green', true);
      }
    },
    'nano-every': {
      name: 'Arduino Nano Every', palette: 'navy', box: [-14, -16, 236, 112],
      draw: function (k) {
        el('rect', { x: 0, y: 0, width: 216, height: 80, rx: 4, fill: k.ref('pcb'), stroke: k.palette[2], 'stroke-width': 1.5, filter: k.ref('shadow') }, k.g);
        k.anchor('pcb', 108, 40);
        k.copper(['M40 46H70', 'M96 40H130', 'M170 30V20', 'M150 58V66']);
        // micro-USB overhangs the left edge
        el('rect', { x: -10, y: 28, width: 24, height: 24, rx: 2, fill: k.ref('steel'), stroke: '#5c656d' }, k.g);
        el('rect', { x: -10, y: 34, width: 5, height: 12, rx: 1.5, fill: '#30363b' }, k.g);
        k.anchor('usb', -10, 28, 24, 24);
        var top = ['D13', '3V3', 'AREF', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', '5V', 'RST', 'GND', 'VIN'];
        var bottom = ['D12', 'D11', 'D10', '~D9', 'D8', 'D7', '~D6', '~D5', 'D4', '~D3', 'D2', 'GND', 'RST', 'RX0', 'TX1'];
        k.padRow('top', 24, 6, top, 'above', 12.2);
        k.padRow('bottom', 24, 74, bottom, 'below', 12.2);
        k.qfp('bridge', 30, 33, 14, '', '', 0);
        if (k.labels) text(k.g, 37, 28, 'SAMD11', { size: 4.5, anchor: 'middle', weight: 600 });
        k.resetCap = k.button('reset', 72, 40);
        k.mcuBody = k.qfp('mcu', 136, 24, 30, 'ATMEGA', '4809', 45);
        k.smdLed('L', 20, 18, 'L');
        k.smdLed('RX', 100, 32, 'RX');
        k.smdLed('TX', 100, 48, 'TX');
        k.smdLed('ON', 20, 62, 'ON', 'green', true);
        k.anchor('serialled', 100, 40);
        text(k.g, 58, 20, 'NANO EVERY', { size: 6.5, spacing: '.06em' });
        text(k.g, 108, 66, 'ARDUINO.CC', { size: 5.5, spacing: '.06em' });
        [[184, 30], [196, 30], [184, 50], [196, 50]].forEach(function (q) { el('rect', { x: q[0], y: q[1], width: 7, height: 4, fill: '#cfc9b3' }, k.g); });
      }
    }
  };
  // friendly aliases used by older pages
  var ALIAS = { uno: 'uno-r3', r3: 'uno-r3', r4: 'uno-r4-wifi', 'uno-r4': 'uno-r4-wifi', q: 'uno-q', nano: 'nano-every' };

  function create(model, opts) {
    model = ALIAS[model] || model;
    var spec = MODELS[model];
    if (!spec) throw new Error('ArduinoArt: unknown model ' + model);
    opts = opts || {};
    var k = new Kit(model, opts);
    k.defs(spec.palette);
    spec.draw(k);
    var b = spec.box;
    return {
      g: k.g, model: model, name: spec.name,
      box: { x: b[0], y: b[1], w: b[2], h: b[3] },
      pins: k.pins, pinList: k.pinList, anchors: k.anchors, boxes: k.boxes,
      mcu: k.mcuBody,
      setLed: function (n, on) { k.setLed(n, on); },
      pulse: function (n, ms) { k.pulse(n, ms); },
      setTrace: function (n, on) { k.setTrace(n, on); },
      setMatrix: function (bits) { k.setMatrix(bits); },
      pressReset: function () {
        if (!k.resetCap) return;
        k.resetCap.setAttribute('r', '4.2');
        setTimeout(function () { k.resetCap.setAttribute('r', '5.5'); }, 180);
      },
      percent: function (pt) { return [(pt[0] - b[0]) / b[2] * 100, (pt[1] - b[1]) / b[3] * 100]; }
    };
  }

  function svg(model, opts) {
    opts = opts || {};
    var h = create(model, opts), pad = opts.padding == null ? 4 : opts.padding;
    var vb = [h.box.x - pad, h.box.y - pad, h.box.w + pad * 2, h.box.h + pad * 2];
    var s = el('svg', { viewBox: vb.join(' '), class: 'arduino-art-svg', role: 'img', 'aria-label': opts.title || ('Illustration of an ' + h.name) });
    if (opts.decorative) { s.removeAttribute('role'); s.removeAttribute('aria-label'); s.setAttribute('aria-hidden', 'true'); }
    s.appendChild(h.g);
    h.svg = s;
    // percentages relative to the padded viewBox, for HTML overlays
    h.percent = function (pt) { return [(pt[0] - vb[0]) / vb[2] * 100, (pt[1] - vb[1]) / vb[3] * 100]; };
    h.viewBox = vb;
    return h;
  }

  function mountAll(root) {
    (root || document).querySelectorAll('[data-arduino-art]:not([data-arduino-art-ready])').forEach(function (host) {
      var h = svg(host.getAttribute('data-arduino-art'), {
        labels: host.getAttribute('data-arduino-labels') !== 'off',
        title: host.getAttribute('data-arduino-title') || undefined,
        decorative: host.hasAttribute('aria-hidden') || host.getAttribute('data-arduino-decorative') === 'true'
      });
      host.appendChild(h.svg);
      host.setAttribute('data-arduino-art-ready', '');
      host.arduinoArt = h;
    });
  }

  global.ArduinoArt = { create: create, svg: svg, mountAll: mountAll, models: Object.keys(MODELS) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mountAll(); });
  else mountAll();
})(window);
