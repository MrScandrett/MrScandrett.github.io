/* ELEGOO Smart Robot Car V4.0: the command protocol, four ways to reach the car,
   and a simulator that obeys the same commands.

   Protocol (from ELEGOO's own firmware, SmartRobotCarV4.0_V0_20210104,
   ApplicationFunctionSet_SerialPortDataAnalysis): the UNO reads JSON frames
   like {"H":"7","N":3,"D1":3,"D2":150} on its serial port at 9600 baud. "N" picks
   the command, "D1".."D4" and "T" are its arguments, and "H" is a tag the car
   echoes back in its reply: {7_ok}, {7_true}, {7_43}.

   Transports, all ending at that same serial port:
     bluetooth  Web Bluetooth -> the BLE module on the shield (service FFE0, char FFE1)
     wifi       browser -> WebSocket -> scripts/robot-car-bridge.mjs -> TCP 192.168.4.1:100
                -> ESP32 camera board -> UNO (browsers can't open raw TCP sockets)
     usb        Web Serial over the USB cable (car on blocks, for testing)
     sim        an in-page car that runs the same commands (lessons with one car, many kids)

   Works as a browser global (window.ElegooCar) and as a CommonJS module for tests. */
(function (global) {
  'use strict';

  var BLE_SERVICE = 0xffe0;
  var BLE_CHAR = 0xffe1;
  var BLE_CHUNK = 20;           // BLE 4.0 default payload per write
  var DEFAULT_BRIDGE = 'ws://localhost:8787';

  // Values from DeviceDriverSet_xxx0.h / ApplicationFunctionSet_xxx0.h.
  var LIMITS = {
    speedMax: 255,
    obstacleCm: 20,             // ObstacleDetection
    lineLow: 250, lineHigh: 850, // TrackingDetection_S / _E: "on the line" band
    panMin: 10, panMax: 170,    // servo 1 (ultrasonic head), firmware clamps 1..17 x10
    tiltMin: 30, tiltMax: 110   // servo 2 (camera), firmware clamps 3..11 x10
  };

  // ---- Protocol ---------------------------------------------------------

  function clampByte(v) { v = Math.round(Number(v) || 0); return v < 0 ? 0 : v > 255 ? 255 : v; }

  var cmd = {
    stop: function () { return { N: 100 }; },                              // clear everything, standby
    // N3: D1 1 spin left, 2 spin right, 3 forward, 4 backward; D2 speed. Runs until replaced.
    move: function (dir, speed) { return { N: 3, D1: dir, D2: clampByte(speed) }; },
    // N2: same as N3 but stops by itself after T milliseconds.
    moveFor: function (dir, speed, ms) { return { N: 2, D1: dir, D2: clampByte(speed), T: Math.max(0, Math.round(ms)) }; },
    // N4: both sides forward at their own speed. The firmware calls D1 "L" but
    // wires it to motor group A, which is the RIGHT side (DeviceDriverSet: "A...Right").
    tank: function (right, left) { return { N: 4, D1: clampByte(right), D2: clampByte(left) }; },
    // N5: servo 1 = ultrasonic pan, 2 = camera tilt. D2 is degrees; firmware divides by 10.
    servo: function (which, deg) { return { N: 5, D1: which, D2: Math.round(Number(deg) || 90) }; },
    // N8: colour on the RGB LED (D1 0 = all LEDs; the V4.0 has one).
    light: function (r, g, b) { return { N: 8, D1: 0, D2: clampByte(r), D3: clampByte(g), D4: clampByte(b) }; },
    // N101: built-in autonomous modes.
    mode: function (name) { return { N: 101, D1: { line: 1, avoid: 2, follow: 3 }[name] || 1 }; },
    distance: function () { return { N: 21, D1: 2 }; },                    // reply {H_cm}
    obstacle: function () { return { N: 21, D1: 1 }; },                    // reply {H_true|false}
    line: function (side) { return { N: 22, D1: side }; },                 // 0 L, 1 M, 2 R -> {H_0..1023}
    lifted: function () { return { N: 23 }; }                              // {H_true} = wheels off the ground
  };

  function encode(obj, tag) {
    var out = {};
    if (tag != null) out.H = String(tag);
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
    return JSON.stringify(out);
  }

  // Joystick (x right, y forward, both -1..1) to a drive command.
  // Forward arcs use N4's two speeds; backward and spinning use N3, which has
  // no "curve" option, so pulling back always reverses straight.
  function mixJoystick(x, y, maxSpeed) {
    x = Math.max(-1, Math.min(1, Number(x) || 0));
    y = Math.max(-1, Math.min(1, Number(y) || 0));
    var max = clampByte(maxSpeed == null ? 180 : maxSpeed);
    var mag = Math.min(1, Math.hypot(x, y));
    if (mag < 0.15) return cmd.stop();
    var speed = Math.round(max * mag);
    if (y < -0.35) return cmd.move(4, speed);
    if (Math.abs(x) > 0.55 && y < 0.45) return cmd.move(x < 0 ? 1 : 2, speed);
    if (Math.abs(x) < 0.2) return cmd.move(3, speed);
    // Slow the inside wheels: a full side push leaves them at 20% of the outside.
    var inner = Math.round(speed * Math.max(0.2, 1 - Math.abs(x)));
    return x < 0 ? cmd.tank(speed, inner) : cmd.tank(inner, speed);
  }

  // Splits a byte stream into {…} frames. Keeps the partial tail between calls.
  function FrameReader() { this.buf = ''; }
  FrameReader.prototype.push = function (text) {
    this.buf += text;
    var frames = [];
    for (;;) {
      var start = this.buf.indexOf('{');
      if (start < 0) { this.buf = ''; break; }
      var end = this.buf.indexOf('}', start);
      if (end < 0) { this.buf = this.buf.slice(start); break; }
      frames.push(this.buf.slice(start, end + 1));
      this.buf = this.buf.slice(end + 1);
    }
    if (this.buf.length > 512) this.buf = '';
    return frames;
  };

  // "{7_43}" -> { tag: "7", value: "43" }; "{ok}" -> { tag: null, value: "ok" }
  function parseReply(frame) {
    var body = String(frame).replace(/^\{|\}$/g, '');
    var i = body.lastIndexOf('_');
    if (i < 0) return { tag: null, value: body };
    return { tag: body.slice(0, i), value: body.slice(i + 1) };
  }

  // ---- Simulated car ----------------------------------------------------
  // Decodes the same JSON the real UNO does and moves a car around a 2-D room.
  // Units: cm, seconds, radians. y grows downward like a screen, so heading 0
  // faces +x and a right turn makes heading grow (clockwise on screen).

  function SimCar(opts) {
    opts = opts || {};
    this.room = opts.room || { w: 300, h: 200 };
    this.walls = opts.walls || [];      // [{x,y,w,h}] in cm
    this.line = opts.line || [];        // polyline [{x,y}] the line sensors can see
    this.reset();
  }
  SimCar.prototype.reset = function () {
    this.x = 40; this.y = 100; this.heading = 0;
    this.left = 0; this.right = 0;      // wheel commands, -255..255
    this.stopAt = 0; this.t = 0;
    this.mode = 'standby';
    this.pan = 90; this.tilt = 90;
    this.color = [0, 0, 0];
    this.bumped = false; this.turning = 0; this.lastTurn = 1;
    this.lastCommand = null;
  };
  SimCar.prototype.setWheels = function (left, right, ms) {
    this.left = left; this.right = right;
    this.stopAt = ms ? this.t + ms / 1000 : 0;
  };
  // Returns the reply frame the real firmware would print, or '' for none.
  SimCar.prototype.handle = function (text) {
    var d;
    try { d = JSON.parse(text); } catch (e) { return ''; }
    var H = d.H == null ? '' : String(d.H), N = Number(d.N), D1 = Number(d.D1), D2 = Number(d.D2);
    this.lastCommand = d;
    var ok = '{' + H + '_ok}';
    switch (N) {
      case 100: this.mode = 'standby'; this.setWheels(0, 0); return '{ok}';
      case 110: this.mode = 'program'; this.setWheels(0, 0); return ok;
      case 2: case 3: {
        this.mode = 'drive';
        var s = clampByte(D2), ms = N === 2 ? Number(d.T) || 0 : 0;
        if (D1 === 1) this.setWheels(-s, s, ms);
        else if (D1 === 2) this.setWheels(s, -s, ms);
        else if (D1 === 3) this.setWheels(s, s, ms);
        else if (D1 === 4) this.setWheels(-s, -s, ms);
        return N === 3 ? ok : '';
      }
      case 4: this.mode = 'drive'; this.setWheels(clampByte(D2), clampByte(D1)); return ok; // D1 = right
      case 5:
        if (D1 === 1 || D1 === 3) this.pan = Math.max(LIMITS.panMin, Math.min(LIMITS.panMax, Math.floor(D2 / 10) * 10));
        if (D1 === 2 || D1 === 3) this.tilt = Math.max(LIMITS.tiltMin, Math.min(LIMITS.tiltMax, Math.floor(D2 / 10) * 10));
        return ok;
      case 7: case 8: this.color = [clampByte(D2), clampByte(d.D3), clampByte(d.D4)]; return N === 8 ? ok : '';
      case 21: {
        var cm = Math.round(this.distance());
        if (D1 === 1) return '{' + H + '_' + (cm <= LIMITS.obstacleCm ? 'true' : 'false') + '}';
        return '{' + H + '_' + cm + '}';
      }
      case 22: return '{' + H + '_' + this.lineReading(D1) + '}';
      case 23: return '{' + H + '_false}';
      case 101: this.mode = ({ 1: 'line', 2: 'avoid', 3: 'follow' })[D1] || 'standby'; return '{ok}';
      default: return '';
    }
  };
  SimCar.prototype.sensorPoint = function (side) {
    // Line sensors sit 7 cm ahead of the axle, 2 cm apart. The car's left is -y when it faces +x.
    var off = side === 0 ? -2 : side === 2 ? 2 : 0, fx = 7;
    var c = Math.cos(this.heading), s = Math.sin(this.heading);
    return { x: this.x + c * fx - s * off, y: this.y + s * fx + c * off };
  };
  SimCar.prototype.lineReading = function (side) {
    var p = this.sensorPoint(side), best = Infinity;
    for (var i = 1; i < this.line.length; i++) best = Math.min(best, segDist(p, this.line[i - 1], this.line[i]));
    // Black tape reflects little IR and reads mid-range (~600); bare floor reads
    // low (~60). The firmware counts 250..850 as "on the line"; above 850 means
    // nothing is under the sensor at all (the car was picked up).
    var v = best < 1 ? 600 : best < 2.5 ? 600 - (best - 1) / 1.5 * 540 : 60;
    return Math.round(v + (Math.random() - 0.5) * 30);
  };
  SimCar.prototype.distance = function () {
    var a = this.heading + (90 - this.pan) * Math.PI / 180; // pan 170 = look left
    var ox = this.x + Math.cos(this.heading) * 9, oy = this.y + Math.sin(this.heading) * 9;
    var rects = this.walls.concat([
      { x: -10, y: -10, w: this.room.w + 20, h: 10 }, { x: -10, y: this.room.h, w: this.room.w + 20, h: 10 },
      { x: -10, y: 0, w: 10, h: this.room.h }, { x: this.room.w, y: 0, w: 10, h: this.room.h }
    ]);
    var d = rayRect(ox, oy, a, rects, 400);
    return d >= 400 ? 400 : Math.max(2, d + (Math.random() - 0.5));
  };
  SimCar.prototype.step = function (dt) {
    this.t += dt;
    if (this.stopAt && this.t >= this.stopAt) this.setWheels(0, 0);
    if (this.mode === 'line') this.autoLine();
    else if (this.mode === 'avoid') this.autoAvoid();
    else if (this.mode === 'follow') this.autoFollow();
    // 255 PWM ~ 50 cm/s on a fresh battery. Track width 13 cm.
    var vl = this.left / 255 * 50, vr = this.right / 255 * 50;
    var v = (vl + vr) / 2, w = (vl - vr) / 13;
    var nh = this.heading + w * dt;
    var nx = this.x + Math.cos(nh) * v * dt, ny = this.y + Math.sin(nh) * v * dt;
    var r = 10;
    var blocked = nx < r || ny < r || nx > this.room.w - r || ny > this.room.h - r || hitRect(nx, ny, r, this.walls);
    this.heading = nh;
    if (!blocked) { this.x = nx; this.y = ny; }
    this.bumped = blocked && Math.abs(v) > 1;
  };
  // Simple versions of the firmware's autonomous modes, enough to watch them work.
  SimCar.prototype.autoLine = function () {
    var on = function (v) { return v >= LIMITS.lineLow && v <= LIMITS.lineHigh; };
    var L = on(this.lineReading(0)), M = on(this.lineReading(1)), R = on(this.lineReading(2));
    if (L && !R) { this.left = 30; this.right = 120; this.lost = 0; }
    else if (R && !L) { this.left = 120; this.right = 30; this.lost = 0; }
    else if (M || (L && R)) { this.left = this.right = 110; this.lost = 0; }
    else {
      // Lost the line: spin toward the side that saw it last.
      this.lost = (this.lost || 0) + 1;
      this.left = this.lastTurn > 0 ? 70 : -70; this.right = -this.left;
    }
    if (L !== R) this.lastTurn = R ? 1 : -1;
  };
  // Looks ahead and a little to each side, like the firmware sweeping its servo.
  SimCar.prototype.scan = function (deg) {
    var saved = this.pan; this.pan = deg;
    var d = this.distance(); this.pan = saved;
    return d;
  };
  SimCar.prototype.autoAvoid = function () {
    var ahead = Math.min(this.scan(90), this.scan(65) * 0.9, this.scan(115) * 0.9);
    if (ahead > LIMITS.obstacleCm + 8 && !this.turning) { this.left = this.right = 120; return; }
    // Turn toward whichever side has more room until the way ahead is clear.
    if (!this.turning) this.turning = this.scan(150) > this.scan(30) ? -1 : 1;
    this.left = 110 * this.turning; this.right = -this.left;
    if (ahead > LIMITS.obstacleCm + 20) this.turning = 0;
  };
  SimCar.prototype.autoFollow = function () {
    var d = this.scan(90);
    if (d < 12) { this.left = this.right = -90; }
    else if (d < LIMITS.obstacleCm + 10) { this.left = this.right = 110; }
    else { this.left = this.right = 0; }
  };

  function segDist(p, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy;
    var t = L ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L)) : 0;
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }
  function rayRect(x, y, a, rects, maxRange) {
    var dx = Math.cos(a), dy = Math.sin(a), best = maxRange;
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      var t1 = (r.x - x) / dx, t2 = (r.x + r.w - x) / dx, t3 = (r.y - y) / dy, t4 = (r.y + r.h - y) / dy;
      var tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4)), tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
      if (tmax >= 0 && tmin <= tmax) { var t = tmin >= 0 ? tmin : tmax; if (t < best) best = t; }
    }
    return best;
  }
  function hitRect(x, y, pad, rects) {
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad) return true;
    }
    return false;
  }

  // ---- Transports -------------------------------------------------------
  // Each has connect(), write(text), close(), and calls onText(text) / onClose().

  function enc(text) { return new TextEncoder().encode(text); }

  function BluetoothLink() { this.char = null; this.device = null; this.queue = Promise.resolve(); }
  BluetoothLink.supported = function () { return !!(global.navigator && global.navigator.bluetooth); };
  BluetoothLink.prototype.connect = function () {
    var self = this;
    return global.navigator.bluetooth.requestDevice({
      filters: [{ services: [BLE_SERVICE] }, { namePrefix: 'ELEGOO' }, { namePrefix: 'BT' }, { namePrefix: 'HM' }],
      optionalServices: [BLE_SERVICE]
    }).then(function (device) {
      self.device = device;
      device.addEventListener('gattserverdisconnected', function () { if (self.onClose) self.onClose(); });
      return device.gatt.connect();
    }).then(function (server) { return server.getPrimaryService(BLE_SERVICE); })
      .then(function (service) { return service.getCharacteristic(BLE_CHAR); })
      .then(function (ch) {
        self.char = ch;
        var dec = new TextDecoder();
        ch.addEventListener('characteristicvaluechanged', function (e) {
          if (self.onText) self.onText(dec.decode(e.target.value));
        });
        return ch.startNotifications().catch(function () {}); // some clones lack notify; driving still works
      }).then(function () { return self.device.name || 'Bluetooth car'; });
  };
  BluetoothLink.prototype.write = function (text) {
    var ch = this.char, bytes = enc(text);
    if (!ch) return Promise.reject(new Error('Not connected'));
    // Writes must not overlap, and BLE modules take 20 bytes at a time.
    this.queue = this.queue.then(function () {
      var p = Promise.resolve();
      for (var i = 0; i < bytes.length; i += BLE_CHUNK) {
        (function (part) {
          p = p.then(function () {
            return ch.writeValueWithoutResponse ? ch.writeValueWithoutResponse(part) : ch.writeValue(part);
          });
        })(bytes.slice(i, i + BLE_CHUNK));
      }
      return p;
    }).catch(function () {});
    return this.queue;
  };
  BluetoothLink.prototype.close = function () {
    if (this.device && this.device.gatt.connected) this.device.gatt.disconnect();
    this.char = null;
  };

  function WifiLink(url) { this.url = url || DEFAULT_BRIDGE; this.ws = null; }
  WifiLink.supported = function () { return typeof global.WebSocket === 'function'; };
  WifiLink.prototype.connect = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
      var ws, settled = false;
      try { ws = new global.WebSocket(self.url); } catch (e) { reject(e); return; }
      self.ws = ws;
      var timer = setTimeout(function () { if (!settled) { settled = true; ws.close(); reject(new Error('The bridge did not answer at ' + self.url)); } }, 4000);
      ws.onmessage = function (e) {
        var text = String(e.data);
        // The bridge reports its own status as {"bridge":…} JSON lines.
        if (text.charAt(0) === '{' && text.indexOf('"bridge"') > 0) {
          var info; try { info = JSON.parse(text); } catch (err) { info = null; }
          if (info) {
            if (!settled && info.bridge === 'car-connected') { settled = true; clearTimeout(timer); resolve(info.car === 'simulator' ? 'Wi-Fi bridge (simulated car)' : 'Wi-Fi car at ' + info.car); }
            else if (!settled && info.bridge === 'car-unreachable') { settled = true; clearTimeout(timer); ws.close(); reject(new Error(info.message)); }
            if (self.onStatus) self.onStatus(info);
            return;
          }
        }
        if (self.onText) self.onText(text);
      };
      ws.onerror = function () { if (!settled) { settled = true; clearTimeout(timer); reject(new Error('Could not reach the bridge at ' + self.url + '. Is it running?')); } };
      ws.onclose = function () { if (settled && self.onClose) self.onClose(); };
    });
  };
  WifiLink.prototype.write = function (text) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(text);
    return Promise.resolve();
  };
  WifiLink.prototype.close = function () { if (this.ws) this.ws.close(); };
  WifiLink.prototype.cameraUrl = function () { return this.url.replace(/^ws/, 'http').replace(/\/$/, '') + '/stream'; };

  function UsbLink() { this.port = null; this.writer = null; this.reading = false; }
  UsbLink.supported = function () { return !!(global.navigator && global.navigator.serial); };
  UsbLink.prototype.connect = function () {
    var self = this;
    return global.navigator.serial.requestPort().then(function (port) {
      self.port = port;
      return port.open({ baudRate: 9600 });
    }).then(function () {
      self.writer = self.port.writable.getWriter();
      self.readLoop();
      // Opening the port resets the UNO; give the bootloader time before sending.
      return new Promise(function (r) { setTimeout(function () { r('USB cable'); }, 1800); });
    });
  };
  UsbLink.prototype.readLoop = function () {
    var self = this, dec = new TextDecoder();
    var reader = this.port.readable.getReader();
    this.reader = reader;
    this.reading = true;
    (function pump() {
      reader.read().then(function (res) {
        if (res.done) { self.reading = false; if (self.onClose) self.onClose(); return; }
        if (self.onText) self.onText(dec.decode(res.value));
        pump();
      }).catch(function () { self.reading = false; if (self.onClose) self.onClose(); });
    })();
  };
  UsbLink.prototype.write = function (text) {
    return this.writer ? this.writer.write(enc(text)).catch(function () {}) : Promise.resolve();
  };
  UsbLink.prototype.close = function () {
    var self = this;
    var r = this.reader, w = this.writer;
    this.reader = this.writer = null;
    Promise.resolve(r && r.cancel()).catch(function () {})
      .then(function () { if (r) r.releaseLock(); if (w) w.releaseLock(); return self.port && self.port.close(); })
      .catch(function () {});
  };

  function SimLink(car) { this.car = car; }
  SimLink.supported = function () { return true; };
  SimLink.prototype.connect = function () { return Promise.resolve('Simulator'); };
  SimLink.prototype.write = function (text) {
    var self = this;
    // A little radio delay, like the real thing.
    setTimeout(function () {
      var reply = self.car.handle(text);
      if (reply && self.onText) self.onText(reply);
    }, 25);
    return Promise.resolve();
  };
  SimLink.prototype.close = function () { this.car.setWheels(0, 0); this.car.mode = 'standby'; };

  // ---- Car: one connection, tags, replies, a safety stop -----------------

  function Car(link) {
    this.link = link;
    this.reader = new FrameReader();
    this.nextTag = 1;
    this.waiting = {};            // tag -> resolve
    this.listeners = { send: [], receive: [], close: [] };
    var self = this;
    link.onText = function (text) {
      self.reader.push(text).forEach(function (frame) {
        if (frame === '{Heartbeat}') return;
        self.emit('receive', frame);
        var r = parseReply(frame);
        if (r.tag && self.waiting[r.tag]) { self.waiting[r.tag](r.value); delete self.waiting[r.tag]; }
      });
    };
    link.onClose = function () {
      for (var t in self.waiting) self.waiting[t](null);
      self.waiting = {};
      self.emit('close');
    };
  }
  Car.prototype.on = function (name, fn) { this.listeners[name].push(fn); return this; };
  Car.prototype.emit = function (name, arg) { this.listeners[name].forEach(function (fn) { fn(arg); }); };
  Car.prototype.connect = function () { return this.link.connect(); };
  Car.prototype.close = function () { var self = this; return this.send(cmd.stop()).then(function () { self.link.close(); }); };
  Car.prototype.send = function (command) {
    var tag = String(this.nextTag++ % 1000);
    var text = encode(command, tag);
    this.emit('send', text);
    return this.link.write(text).then(function () { return tag; });
  };
  // Send a command and wait for its tagged reply (sensor reads). Resolves null on timeout.
  Car.prototype.ask = function (command, timeoutMs) {
    var self = this;
    return new Promise(function (resolve) {
      self.send(command).then(function (tag) {
        var timer = setTimeout(function () { if (self.waiting[tag]) { delete self.waiting[tag]; resolve(null); } }, timeoutMs || 800);
        self.waiting[tag] = function (v) { clearTimeout(timer); resolve(v); };
      });
    });
  };

  var api = {
    BLE_SERVICE: BLE_SERVICE, BLE_CHAR: BLE_CHAR, DEFAULT_BRIDGE: DEFAULT_BRIDGE, LIMITS: LIMITS,
    cmd: cmd, encode: encode, mixJoystick: mixJoystick, FrameReader: FrameReader, parseReply: parseReply,
    SimCar: SimCar, Car: Car,
    links: { bluetooth: BluetoothLink, wifi: WifiLink, usb: UsbLink, sim: SimLink }
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else global.ElegooCar = api;
})(typeof window !== 'undefined' ? window : globalThis);
