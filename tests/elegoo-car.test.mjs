import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { createRequire } from 'node:module';
import { startBridge, originAllowed, parseArgs } from '../scripts/robot-car-bridge.mjs';

const require = createRequire(import.meta.url);
const E = require('../assets/js/elegoo-car.js');

test('commands encode to the JSON the UNO firmware parses', () => {
  assert.equal(E.encode(E.cmd.move(3, 150), 7), '{"H":"7","N":3,"D1":3,"D2":150}');
  assert.equal(E.encode(E.cmd.stop()), '{"N":100}');
  assert.equal(E.encode(E.cmd.light(300, -4, 12.6), 'a'), '{"H":"a","N":8,"D1":0,"D2":255,"D3":0,"D4":13}');
  assert.deepEqual(E.cmd.tank(200, 80), { N: 4, D1: 200, D2: 80 }, 'D1 drives the right side');
  assert.deepEqual(E.cmd.servo(1, 45), { N: 5, D1: 1, D2: 45 });
});

test('joystick mixing: dead zone, straight, arcs, spins, reverse', () => {
  assert.equal(E.mixJoystick(0.05, 0.1, 200).N, 100);
  assert.deepEqual(E.mixJoystick(0, 1, 200), { N: 3, D1: 3, D2: 200 });
  assert.deepEqual(E.mixJoystick(0, -1, 200), { N: 3, D1: 4, D2: 200 });
  assert.deepEqual(E.mixJoystick(-1, 0, 200), { N: 3, D1: 1, D2: 200 });
  assert.deepEqual(E.mixJoystick(1, 0, 200), { N: 3, D1: 2, D2: 200 });
  const arcLeft = E.mixJoystick(-0.5, 0.8, 200);
  assert.equal(arcLeft.N, 4);
  assert.ok(arcLeft.D1 > arcLeft.D2, 'turning left: right side (D1) faster');
});

test('frame reader splits a byte stream and keeps partial frames', () => {
  const r = new E.FrameReader();
  assert.deepEqual(r.push('junk{1_ok}{Heart'), ['{1_ok}']);
  assert.deepEqual(r.push('beat}{2_4'), ['{Heartbeat}']);
  assert.deepEqual(r.push('3}'), ['{2_43}']);
  assert.deepEqual(E.parseReply('{2_43}'), { tag: '2', value: '43' });
  assert.deepEqual(E.parseReply('{ok}'), { tag: null, value: 'ok' });
});

test('simulated car answers like the firmware and moves', () => {
  const car = new E.SimCar({ walls: [] });
  assert.equal(car.handle('{"H":"5","N":3,"D1":3,"D2":255}'), '{5_ok}');
  const x0 = car.x;
  for (let i = 0; i < 20; i++) car.step(0.05);
  assert.ok(car.x > x0 + 40, 'drove forward about 50 cm in a second');
  const dist = Number(E.parseReply(car.handle('{"H":"6","N":21,"D1":2}')).value);
  assert.ok(dist > 100 && dist < 300, `distance to far wall ${dist}`);
  assert.equal(car.handle('{"N":100}'), '{ok}');
  assert.equal(car.left, 0);
  // Timed move (N2) stops by itself.
  car.handle('{"N":2,"D1":1,"D2":120,"T":300}');
  for (let i = 0; i < 10; i++) car.step(0.05);
  assert.equal(car.left, 0);
});

test('a Car matches replies to the question that asked', async () => {
  const sim = new E.SimCar({ walls: [] });
  const link = new E.links.sim(sim);
  const car = new E.Car(link);
  await car.connect();
  const [a, b] = await Promise.all([car.ask(E.cmd.lifted()), car.ask(E.cmd.distance())]);
  assert.equal(a, 'false');
  assert.match(b, /^\d+$/);
});

test('bridge origin rules', () => {
  const o = parseArgs(['--allow-origin', 'https://x.test']);
  assert.ok(originAllowed('http://localhost:8080', 'localhost:8787', o));
  assert.ok(originAllowed('https://mrscandrett.github.io', '', o));
  assert.ok(originAllowed('https://x.test', '', o));
  assert.ok(!originAllowed('https://evil.example', '', o));
  assert.ok(!originAllowed('http://192.168.4.2:8787', '192.168.4.2:8787', o));
  assert.ok(originAllowed('http://192.168.4.2:8787', '192.168.4.2:8787', { ...o, lan: true }));
});

// Fake ESP32: records what arrives on TCP, answers {Heartbeat} like the real one.
function fakeCar() {
  const got = [];
  const server = net.createServer((sock) => {
    sock.on('data', (d) => {
      const text = d.toString();
      got.push(text);
      for (const m of text.match(/\{[^}]*\}/g) || []) {
        if (m === '{Heartbeat}') continue;
        const tag = (m.match(/"H":"(\w+)"/) || [])[1];
        if (/"N":21/.test(m)) sock.write(`{${tag}_37}`);
      }
    });
    sock.write('{Heartbeat}');
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, got, port: server.address().port })));
}

test('bridge relays WebSocket <-> TCP, and stops the car when the page goes quiet', async (t) => {
  const fake = await fakeCar();
  // Point the bridge's TCP client at the fake car's port instead of :100.
  const realConnect = net.connect;
  net.connect = (o, ...rest) => realConnect.call(net, typeof o === 'object' && o.port === 100 ? { ...o, port: fake.port } : o, ...rest);
  const bridge = await startBridge({ car: '127.0.0.1', port: 0, mock: false, lan: false, origins: [] }, () => {});
  t.after(() => { net.connect = realConnect; bridge.close(); fake.server.close(); });

  const ws = new WebSocket(`ws://127.0.0.1:${bridge.address().port}`);
  const messages = [];
  ws.onmessage = (e) => messages.push(String(e.data));
  await new Promise((r) => { ws.onopen = r; });
  await waitFor(() => messages.some((m) => m.includes('car-connected')));

  ws.send('{"H":"9","N":21,"D1":2}');
  await waitFor(() => messages.includes('{9_37}'));

  ws.send('{"H":"10","N":3,"D1":3,"D2":120}');
  await waitFor(() => fake.got.join('').includes('"N":3'));
  // No more drive commands: the watchdog must send a stop within ~1.2 s.
  await waitFor(() => fake.got.join('').includes('{"N":100}'), 2500);

  // A second page is turned away while the first is driving.
  const second = new WebSocket(`ws://127.0.0.1:${bridge.address().port}`);
  const secondMsgs = [];
  second.onmessage = (e) => secondMsgs.push(String(e.data));
  await waitFor(() => secondMsgs.some((m) => m.includes('busy')));
  second.close();
  ws.close();
});

async function waitFor(fn, ms = 1500) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (fn()) return; await new Promise((r) => setTimeout(r, 20)); }
  assert.fail('timed out waiting');
}

test('simulator turns the way the real car does (screen y points down)', () => {
  const car = new E.SimCar({ walls: [] });
  car.heading = 0;
  car.handle(E.encode(E.cmd.move(2, 150)));          // spin right
  for (let i = 0; i < 4; i++) car.step(0.05);
  assert.ok(car.heading > 0, 'spin right turns clockwise on screen');
  car.reset();
  car.handle(E.encode(E.mixJoystick(-0.6, 0.8, 200))); // curve left (N4, right side faster)
  for (let i = 0; i < 10; i++) car.step(0.05);
  assert.ok(car.heading < 0 && car.y < 100, 'curving left heads up the screen when facing right');
  car.reset();
  assert.ok(car.sensorPoint(0).y < car.sensorPoint(2).y, 'left line sensor is on the car’s left');
});
