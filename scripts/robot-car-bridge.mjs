#!/usr/bin/env node
// Wi-Fi bridge for the ELEGOO Smart Robot Car V4.0.
//
// The car's ESP32 camera board makes its own Wi-Fi network (ELEGOO-xxxx) and
// listens for commands on raw TCP port 100 at 192.168.4.1. Web pages can't open
// raw TCP sockets, so this script sits in between:
//
//   lesson page --WebSocket--> this bridge --TCP :100--> ESP32 --serial--> UNO
//
// It also proxies the camera (http://192.168.4.1:81/stream) to /stream, sends
// the {Heartbeat} the ESP32 needs every second (it hangs up after ~3 s without
// one), stops the car if the page goes quiet mid-drive, and serves this repo so
// the lesson still loads after the laptop joins the car's network (no internet).
//
// Usage (no npm install needed; Node 18+):
//   node scripts/robot-car-bridge.mjs                 car at 192.168.4.1
//   node scripts/robot-car-bridge.mjs --car 10.0.0.57 car reflashed onto school Wi-Fi
//   node scripts/robot-car-bridge.mjs --mock          no car: a simulated one answers
//   node scripts/robot-car-bridge.mjs --lan           let other devices on this network use it
//   --port 8787   --allow-origin https://example.org
//
// Then open http://localhost:8787/ (or the lesson page on the class site).

import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const LESSON = '/lessons/engineering/robotics/robot-car-pilot.html';

export function parseArgs(argv) {
  const opts = { car: '192.168.4.1', port: 8787, mock: false, lan: false, origins: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--car') opts.car = argv[++i];
    else if (a === '--port') opts.port = Number(argv[++i]);
    else if (a === '--mock') opts.mock = true;
    else if (a === '--lan') opts.lan = true;
    else if (a === '--allow-origin') opts.origins.push(argv[++i]);
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  return opts;
}

// Only pages we trust may drive the car: anything served from this machine,
// the class site, and origins named with --allow-origin. In --lan mode, pages
// served by this bridge to other devices are trusted too.
export function originAllowed(origin, host, opts) {
  if (!origin) return true; // non-browser clients (tests, curl)
  let u;
  try { u = new URL(origin); } catch { return false; }
  if (['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) return true;
  if (origin === 'https://mrscandrett.github.io') return true;
  if (opts.origins.includes(origin)) return true;
  if (opts.lan && host && u.host === host) return true;
  return false;
}

// ---- Minimal WebSocket (RFC 6455), text frames only ------------------------

function acceptKey(key) {
  return crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
}

function frame(text, opcode = 1) {
  const payload = Buffer.from(text);
  const len = payload.length;
  const head = len < 126 ? Buffer.from([0x80 | opcode, len])
    : len < 65536 ? Buffer.from([0x80 | opcode, 126, len >> 8, len & 255])
    : (() => { const b = Buffer.alloc(10); b[0] = 0x80 | opcode; b[1] = 127; b.writeBigUInt64BE(BigInt(len), 2); return b; })();
  return Buffer.concat([head, payload]);
}

class WsConnection {
  constructor(socket) {
    this.socket = socket;
    this.buf = Buffer.alloc(0);
    this.onmessage = null;
    this.onclose = null;
    this.closed = false;
    socket.on('data', (d) => this.#read(d));
    socket.on('close', () => this.#closed());
    socket.on('error', () => this.#closed());
  }
  #closed() {
    if (this.closed) return;
    this.closed = true;
    if (this.onclose) this.onclose();
  }
  #read(data) {
    this.buf = Buffer.concat([this.buf, data]);
    while (this.buf.length >= 2) {
      const op = this.buf[0] & 0x0f;
      const masked = this.buf[1] & 0x80;
      let len = this.buf[1] & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      if (len > 65536) { this.socket.destroy(); return; }
      const maskOff = off; if (masked) off += 4;
      if (this.buf.length < off + len) return;
      const payload = Buffer.from(this.buf.subarray(off, off + len));
      if (masked) for (let i = 0; i < len; i++) payload[i] ^= this.buf[maskOff + (i & 3)];
      this.buf = this.buf.subarray(off + len);
      if (op === 8) { this.close(); return; }
      if (op === 9) { this.socket.write(frame(payload.toString(), 10)); continue; }
      if (op === 1 && this.onmessage) this.onmessage(payload.toString());
    }
  }
  send(text) { if (!this.closed) this.socket.write(frame(text)); }
  close() {
    if (!this.closed) { try { this.socket.end(frame('', 8)); } catch { /* already gone */ } }
    this.#closed();
  }
}

// ---- Car connections ------------------------------------------------------

// Real car: TCP to the ESP32. Calls onText for every chunk, onClose when it drops.
function tcpCar(host, port = 100) {
  const link = { onText: null, onClose: null, write: null, close: null, ready: null };
  const sock = net.connect({ host, port });
  sock.setNoDelay(true);
  let beat = null;
  link.ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { sock.destroy(); reject(new Error(`No answer from the car at ${host}:${port}. Is this computer on the car's ELEGOO-xxxx Wi-Fi?`)); }, 4000);
    sock.once('connect', () => {
      clearTimeout(timer);
      beat = setInterval(() => sock.write('{Heartbeat}'), 1000);
      resolve();
    });
    sock.once('error', (err) => { clearTimeout(timer); reject(new Error(`Can't reach the car at ${host}:${port} (${err.code || err.message}). Join the car's ELEGOO-xxxx Wi-Fi first.`)); });
  });
  sock.on('data', (d) => link.onText && link.onText(d.toString('latin1')));
  sock.on('close', () => { clearInterval(beat); link.onClose && link.onClose(); });
  sock.on('error', () => {});
  link.write = (text) => { if (!sock.destroyed) sock.write(text); };
  link.close = () => { clearInterval(beat); sock.end(); };
  return link;
}

// No car: the same simulator the lesson page uses answers the commands.
function mockCar() {
  const require = createRequire(import.meta.url);
  const { SimCar } = require('../assets/js/elegoo-car.js');
  const car = new SimCar({ walls: [{ x: 150, y: 60, w: 30, h: 80 }] });
  const link = { onText: null, onClose: null, ready: Promise.resolve(), car };
  const tick = setInterval(() => car.step(0.05), 50);
  link.write = (text) => {
    const m = String(text).match(/\{[^}]*\}/g) || [];
    for (const one of m) {
      if (one === '{Heartbeat}') continue;
      const reply = car.handle(one);
      if (reply) setTimeout(() => link.onText && link.onText(reply), 20);
    }
  };
  link.close = () => { clearInterval(tick); };
  return link;
}

// ---- Server ---------------------------------------------------------------

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.vtt': 'text/vtt'
};

const MOTION = new Set([1, 2, 3, 4, 102]);

export function startBridge(opts, log = console.log) {
  let driver = null;          // the one page allowed to drive
  let car = null;
  let watchdog = null;
  let lastMotion = 0, moving = false;

  function stopCar(reason) {
    if (car && moving) { car.write('{"N":100}'); log(`  stop: ${reason}`); }
    moving = false;
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://bridge');
    const cors = {
      'Access-Control-Allow-Origin': originAllowed(req.headers.origin, req.headers.host, opts) && req.headers.origin ? req.headers.origin : 'null',
      'Access-Control-Allow-Private-Network': 'true',
      'Cache-Control': 'no-store'
    };
    if (req.method === 'OPTIONS') { res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': '*' }); res.end(); return; }

    if (url.pathname === '/status') {
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ bridge: 'robot-car', car: opts.mock ? 'simulated' : opts.car, driving: !!driver }));
      return;
    }
    if (url.pathname === '/stream' || url.pathname === '/capture') {
      if (opts.mock) { res.writeHead(404, cors); res.end('The simulated car has no camera.'); return; }
      const port = url.pathname === '/stream' ? 81 : 80;
      const up = http.get({ host: opts.car, port, path: url.pathname, timeout: 4000 }, (camRes) => {
        res.writeHead(camRes.statusCode || 502, { ...cors, 'Content-Type': camRes.headers['content-type'] || 'application/octet-stream' });
        camRes.pipe(res);
      });
      up.on('timeout', () => up.destroy(new Error('timeout')));
      up.on('error', () => { if (!res.headersSent) { res.writeHead(502, cors); res.end('Camera not reachable'); } else res.end(); });
      req.on('close', () => up.destroy());
      return;
    }

    // Static files from this repo, so the lesson works with no internet.
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') { res.writeHead(302, { Location: LESSON + '?link=wifi' }); res.end(); return; }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, path.normalize(rel));
    if (!file.startsWith(ROOT + path.sep) || /(^|[\\/])\.(?!well-known)/.test(path.relative(ROOT, file)) || file.includes(`${path.sep}node_modules${path.sep}`)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      fs.createReadStream(file).pipe(res);
    });
  });

  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (!key || (req.headers.upgrade || '').toLowerCase() !== 'websocket') { socket.destroy(); return; }
    if (!originAllowed(req.headers.origin, req.headers.host, opts)) {
      log(`  refused page from ${req.headers.origin}`);
      socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
      return;
    }
    socket.write(['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${acceptKey(key)}`, '', ''].join('\r\n'));
    const ws = new WsConnection(socket);

    if (driver) {
      ws.send(JSON.stringify({ bridge: 'busy', message: 'Someone else is driving this car. Wait for them to disconnect.' }));
      setTimeout(() => ws.close(), 50);
      return;
    }
    driver = ws;
    log(`→ page connected (${req.headers.origin || 'no origin'})`);
    car = opts.mock ? mockCar() : tcpCar(opts.car);
    const thisCar = car;
    thisCar.onText = (text) => ws.send(text);
    thisCar.onClose = () => {
      if (driver === ws) { ws.send(JSON.stringify({ bridge: 'car-lost', message: 'The car hung up. Check its battery and Wi-Fi.' })); ws.close(); }
    };
    thisCar.ready.then(() => {
      if (ws.closed) { thisCar.close(); return; }
      log(`  car connected (${opts.mock ? 'simulated' : opts.car})`);
      ws.send(JSON.stringify({ bridge: 'car-connected', car: opts.mock ? 'simulator' : opts.car, camera: !opts.mock }));
    }, (err) => {
      log(`  ${err.message}`);
      ws.send(JSON.stringify({ bridge: 'car-unreachable', message: err.message }));
      ws.close();
    });

    ws.onmessage = (text) => {
      for (const one of String(text).match(/\{[^}]*\}/g) || []) {
        let n = null;
        try { n = Number(JSON.parse(one).N); } catch { /* not JSON: pass it through */ }
        // N2 stops itself after T ms, so it doesn't need repeating.
        if (MOTION.has(n)) { lastMotion = Date.now(); moving = n !== 2 && !/"D2":0[,}]/.test(one); }
        if (n === 100) moving = false;
        thisCar.write(one);
      }
    };
    // Dead-man switch: the page repeats drive commands while a control is held.
    // If they stop arriving (tab frozen, Wi-Fi dropped) the car stops.
    watchdog = setInterval(() => { if (moving && Date.now() - lastMotion > 1000) stopCar('no drive command for 1 s'); }, 200);
    ws.onclose = () => {
      log('← page disconnected');
      stopCar('page closed');
      if (thisCar !== car) return;
      thisCar.write('{"N":100}');
      setTimeout(() => thisCar.close(), 100);
      clearInterval(watchdog);
      driver = null; car = null; moving = false;
    };
  });

  return new Promise((resolve) => {
    server.listen(opts.port, opts.lan ? '0.0.0.0' : '127.0.0.1', () => resolve(server));
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 22).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    process.exit(0);
  }
  startBridge(opts).then((server) => {
    const { port } = server.address();
    console.log(`ELEGOO robot car bridge`);
    console.log(`  car:    ${opts.mock ? 'simulated (--mock)' : `${opts.car}:100`}`);
    console.log(`  page:   http://localhost:${port}/`);
    console.log(`  socket: ws://localhost:${port}`);
    if (opts.lan) console.log('  --lan: other devices on this network can open http://<this-computer-ip>:' + port + '/');
    console.log('Ctrl+C to stop.');
  });
}
