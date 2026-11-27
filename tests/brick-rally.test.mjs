import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocketServer, WebSocket } from 'ws';
import * as Car from '../assets/js/brick-rally/car-model.mjs';
import { carveCar, segment, nearestPalette } from '../assets/js/brick-rally/scan.mjs';
import { TRACKS, buildTrack, locate, gridSlot, pointAt } from '../assets/js/brick-rally/track.mjs';
import { newCar, stepCar, botInput, collideCars, DT } from '../assets/js/brick-rally/physics.mjs';
import { encodeLength, readPackets, publishPacket, parsePublish, topicMatches, connectPacket, subscribePacket } from '../assets/js/brick-rally/mqtt.mjs';
import { Bus, HostSession, GuestSession, watchLobbies, networkOf, publicIpsFromCandidates, cleanCode, makeCode, cleanName } from '../assets/js/brick-rally/net.mjs';

// ---------------------------------------------------------------- car model

test('every preset encodes, decodes and has sane stats', () => {
  for (const p of Car.PRESETS) {
    const cells = p.build();
    assert.ok(Car.countBricks(cells) > 40, p.id);
    const back = Car.decodeCar(Car.encodeCar(cells));
    assert.deepEqual([...back], [...cells], p.id);
    const st = Car.carStats(cells);
    for (const k of ['speed', 'accel', 'grip', 'weight']) assert.ok(st.bars[k] >= 1 && st.bars[k] <= 10, `${p.id} ${k}`);
    assert.ok(Car.encodeCar(cells).length < 1500, `${p.id} packs small`);
    const mesh = Car.buildCarMesh(cells);
    assert.equal(mesh.positions.length % 9, 0);
    assert.equal(mesh.positions.length, mesh.colors.length);
  }
});

test('decodeCar rejects junk', () => {
  for (const bad of ['', 'v2:0a.', 'v1:zz.', 'v1:0' + (Car.W * Car.L * Car.H + 1).toString(36) + '.', 'v1:01.', null, 42]) assert.equal(Car.decodeCar(bad), null, String(bad));
});

test('no build dominates: light cars accelerate, heavy cars grip', () => {
  const light = Car.fillBox(Car.emptyCar(), 3, 0, 2, 6, 0, 13, 1);
  const heavy = Car.fillBox(Car.emptyCar(), 0, 0, 0, 9, 3, 15, 1);
  const a = Car.carStats(light), b = Car.carStats(heavy);
  assert.ok(a.accel > b.accel);
  assert.ok(b.grip > a.grip);
});

// ---------------------------------------------------------------- scanner

function photo(w, h, bg, draw) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = draw(x, y) || bg;
    const i = (y * w + x) * 4;
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
  }
  return { width: w, height: h, data };
}

test('palette matching picks the obvious brick colour', () => {
  assert.equal(Car.PALETTE[nearestPalette(200, 30, 20)].name, 'Red');
  assert.equal(Car.PALETTE[nearestPalette(10, 80, 190)].name, 'Blue');
  assert.equal(Car.PALETTE[nearestPalette(240, 200, 60)].name, 'Yellow');
});

test('segment finds a car on a plain background', () => {
  const img = photo(120, 80, [235, 235, 230], (x, y) => (x > 20 && x < 100 && y > 30 && y < 60 ? [200, 20, 20] : null));
  const s = segment(img);
  assert.ok(s);
  assert.ok(Math.abs(s.bbox.x0 - 21) <= 1 && Math.abs(s.bbox.x1 - 99) <= 1);
  assert.ok(Math.abs(s.bbox.y0 - 31) <= 1 && Math.abs(s.bbox.y1 - 59) <= 1);
});

test('space carving: side + front + top make a wedge car with the right colours', () => {
  const bg = [240, 240, 240];
  // side: a wedge, tall at the back (left), low at the nose (right); red body, black bottom row
  const side = photo(200, 100, bg, (x, y) => {
    if (x < 20 || x > 180) return null;
    const top = 30 + (x - 20) * 0.25;
    if (y < top || y > 80) return null;
    return y > 70 ? [20, 30, 40] : [200, 25, 15];
  });
  const front = photo(120, 100, bg, (x, y) => (x > 20 && x < 100 && y > 30 && y < 80 ? [200, 25, 15] : null));
  const top = photo(100, 200, bg, (x, y) => (x > 20 && x < 80 && y > 20 && y < 180 ? [250, 200, 50] : null));
  const { cells, dims } = carveCar({ side, front, top });
  assert.equal(dims.len, Car.L);
  assert.ok(dims.height >= 2 && dims.height <= Car.H);
  const b = Car.bounds(cells);
  // taller at the back than at the nose
  const colHeight = (z) => { let h = 0; for (let y = 0; y < Car.H; y++) if (Car.get(cells, 5, y, z)) h = y + 1; return h; };
  assert.ok(colHeight(b.z0) > colHeight(b.z1), 'wedge');
  // roof cells take the top photo's colour
  let roofYellow = 0, roofs = 0;
  for (let z = 0; z < Car.L; z++) for (let x = 0; x < Car.W; x++) {
    let ytop = -1;
    for (let y = 0; y < Car.H; y++) if (Car.get(cells, x, y, z)) ytop = y;
    if (ytop < 0) continue;
    roofs++;
    if (Car.PALETTE[Car.get(cells, x, ytop, z)].name === 'Yellow') roofYellow++;
  }
  assert.ok(roofYellow / roofs > 0.8);
});

test('carving without a side photo explains itself', () => {
  assert.throws(() => carveCar({}), /side photo/);
});

// ---------------------------------------------------------------- tracks + physics

test('tracks are closed, smooth, and never cross themselves', () => {
  for (const def of TRACKS) {
    const t = buildTrack(def);
    assert.ok(t.length > 300, def.id);
    for (let i = 0; i < t.N; i++) {
      const j = (i + 1) % t.N;
      assert.ok(Math.hypot(t.xs[j] - t.xs[i], t.zs[j] - t.zs[i]) < 2.2, `${def.id} gap at ${i}`);
    }
    // any two samples far apart along the lap must be at least two barrier-widths apart in space
    const clear = t.wall * 2 + 1;
    for (let i = 0; i < t.N; i += 2) for (let j = i + 2; j < t.N; j += 2) {
      const along = Math.min(Math.abs(t.s[i] - t.s[j]), t.length - Math.abs(t.s[i] - t.s[j]));
      if (along < clear * 2.2) continue;
      const d = Math.hypot(t.xs[i] - t.xs[j], t.zs[i] - t.zs[j]);
      assert.ok(d > clear, `${def.id}: samples ${i} and ${j} only ${d.toFixed(1)} apart`);
    }
    // grid slots sit on the road, behind the line
    for (let k = 0; k < 8; k++) {
      const g = gridSlot(t, k);
      const loc = locate(t, g.x, g.z);
      assert.ok(Math.abs(loc.lateral) < t.half, `${def.id} slot ${k} on road`);
      assert.ok(loc.s > t.length * 0.8, `${def.id} slot ${k} behind line`);
    }
  }
});

for (const def of TRACKS) {
  test(`a bot laps ${def.name} without getting stuck`, () => {
    const t = buildTrack(def);
    const stats = Car.carStats(Car.preset('roadster'));
    const car = newCar(gridSlot(t, 0), stats);
    let time = 0;
    while (car.lap < 2 && time < 120) {
      stepCar(car, botInput(car, t, 0.9), t, DT);
      time += DT;
    }
    assert.equal(car.lap, 2, `${def.name}: only ${car.lap} laps after ${time.toFixed(0)}s`);
    const lapTime = time / 2;
    assert.ok(lapTime > 8 && lapTime < 50, `${def.name} lap ${lapTime.toFixed(1)}s`);
  });
}

test('the wall holds: flooring it sideways never leaves the barrier', () => {
  const t = buildTrack(TRACKS[0]);
  const car = newCar(gridSlot(t, 0), Car.carStats(Car.preset('arrow')));
  car.h += Math.PI / 2;
  for (let k = 0; k < 600; k++) {
    stepCar(car, { throttle: 1, steer: 0 }, t, DT);
    assert.ok(Math.abs(locate(t, car.x, car.z).lateral) <= t.wall + 0.01);
  }
});

test('reversing over the line does not count a lap', () => {
  const t = buildTrack(TRACKS[0]);
  const car = newCar(gridSlot(t, 0), Car.carStats(Car.preset('roadster')));
  for (let k = 0; k < 120; k++) stepCar(car, { throttle: 1, steer: 0 }, t, DT); // over the line
  for (let k = 0; k < 400; k++) stepCar(car, { throttle: -1, steer: 0 }, t, DT); // back over it
  for (let k = 0; k < 200; k++) stepCar(car, { throttle: 1, steer: 0 }, t, DT);
  assert.equal(car.lap, 0);
});

test('cars bump apart', () => {
  const a = { x: 0, z: 0, vx: 5, vz: 0 }, b = { x: 1, z: 0, vx: 0, vz: 0 };
  assert.ok(collideCars(a, b));
  assert.ok(b.x - a.x >= 2.59);
  assert.ok(a.vx < 5);
});

// ---------------------------------------------------------------- MQTT codec

test('MQTT remaining length and packets round-trip', () => {
  assert.deepEqual(encodeLength(0), [0]);
  assert.deepEqual(encodeLength(127), [127]);
  assert.deepEqual(encodeLength(128), [0x80, 1]);
  assert.deepEqual(encodeLength(16383), [0xff, 0x7f]);
  const big = 'x'.repeat(20000);
  const p = publishPacket('a/b', big);
  const both = new Uint8Array([...p, ...publishPacket('c', '{}')]);
  // split mid-packet: the reader keeps the tail
  const first = readPackets(both.slice(0, 100));
  assert.equal(first.packets.length, 0);
  const all = readPackets(both);
  assert.equal(all.packets.length, 2);
  assert.deepEqual(parsePublish(all.packets[0]), { topic: 'a/b', payload: big, retain: false });
  assert.equal(parsePublish(all.packets[1]).topic, 'c');
  assert.ok(topicMatches('a/+/c', 'a/b/c'));
  assert.ok(topicMatches('a/#', 'a/b/c'));
  assert.ok(!topicMatches('a/+', 'a/b/c'));
  assert.equal(connectPacket('id')[0], 0x10);
  assert.equal(subscribePacket(1, ['t'])[0], 0x82);
});

// ---------------------------------------------------------------- networking

test('network helpers', () => {
  assert.equal(networkOf('203.0.113.9'), '203.0.113.9');
  assert.equal(networkOf('2001:db8:1:2:aaaa:bbbb:cccc:dddd'), '2001:db8:1:2::/64');
  assert.equal(networkOf('abcd.local'), null);
  const ips = publicIpsFromCandidates([
    'candidate:1 1 udp 2122260223 4a1b-1.local 54321 typ host generation 0',
    'candidate:842163049 1 udp 1677729535 203.0.113.9 54321 typ srflx raddr 0.0.0.0 rport 0 generation 0',
  ]);
  assert.deepEqual(ips, ['203.0.113.9']);
  for (let i = 0; i < 50; i++) assert.ok(cleanCode(makeCode()));
  assert.equal(cleanCode('ab'), null);
  assert.equal(cleanCode('bcdf'), 'BCDF');
  assert.equal(cleanName('<script>Al'), 'scriptAl');
  assert.equal(cleanName(''), 'Racer');
});

/** A minimal MQTT broker (QoS 0) so the sessions can be tested end to end. */
function fakeBroker() {
  const wss = new WebSocketServer({ port: 0, handleProtocols: () => 'mqtt' });
  const clients = new Set();
  wss.on('connection', (ws) => {
    const c = { ws, subs: new Set(), buf: new Uint8Array(0) };
    clients.add(c);
    ws.on('close', () => clients.delete(c));
    ws.on('message', (data) => {
      const merged = new Uint8Array([...c.buf, ...new Uint8Array(data)]);
      const { packets, rest } = readPackets(merged);
      c.buf = rest;
      for (const p of packets) {
        if (p.type === 1) ws.send(new Uint8Array([0x20, 2, 0, 0]));
        else if (p.type === 8) {
          let i = 2;
          while (i < p.body.length) {
            const l = (p.body[i] << 8) | p.body[i + 1];
            c.subs.add(new TextDecoder().decode(p.body.slice(i + 2, i + 2 + l)));
            i += 3 + l;
          }
          ws.send(new Uint8Array([0x90, 3, p.body[0], p.body[1], 0]));
        } else if (p.type === 3) {
          const m = parsePublish(p);
          const out = publishPacket(m.topic, m.payload);
          for (const o of clients) if ([...o.subs].some(f => topicMatches(f, m.topic))) o.ws.send(out);
        } else if (p.type === 12) ws.send(new Uint8Array([0xd0, 0]));
      }
    });
  });
  return new Promise(res => wss.on('listening', () => res({ url: `ws://127.0.0.1:${wss.address().port}`, close: () => { for (const c of clients) c.ws.terminate(); wss.close(); } })));
}

const until = async (fn, ms = 3000) => {
  const t0 = Date.now();
  while (!fn()) {
    if (Date.now() - t0 > ms) throw new Error('timed out');
    await new Promise(r => setTimeout(r, 20));
  }
};

test('host and guest find each other on the same WiFi and trade messages over the relay', async () => {
  const broker = await fakeBroker();
  const dead = 'ws://127.0.0.1:9'; // a relay that's down must not stop the others
  const opts = { brokers: [dead, broker.url], WebSocketImpl: WebSocket, timeout: 1500 };
  const hostBus = await new Bus(opts).start();
  const guestBus = await new Bus(opts).start();
  const strangerBus = await new Bus(opts).start();
  const host = new HostSession(hostBus, { neighborhoods: ['nb1'], RTC: null, info: () => ({ host: 'Ms. Host', players: 1, track: 'Baseplate Loop', phase: 'lobby' }) }).start();
  try {
    // a guest on the same WiFi sees the lobby; a stranger on other WiFi doesn't
    let seen = [], strangerSeen = [];
    const w = watchLobbies(guestBus, ['nb1'], l => { seen = l; });
    const w2 = watchLobbies(strangerBus, ['nb2'], l => { strangerSeen = l; });
    await until(() => seen.length === 1);
    assert.equal(seen[0].code, host.code);
    assert.equal(seen[0].host, 'Ms. Host');
    assert.equal(strangerSeen.length, 0);
    w.stop(); w2.stop();

    // join, then a two-way exchange
    const guest = new GuestSession(guestBus, { code: host.code, RTC: null }).start();
    const atHost = [], atGuest = [];
    host.on('message', (m, from) => atHost.push({ m, from }));
    guest.on('message', (m) => atGuest.push(m));
    guest.send({ t: 'join', name: 'Kid', car: Car.encodeCar(Car.preset('bug')) });
    await until(() => atHost.length === 1);
    assert.equal(atHost[0].from, guest.id);
    assert.ok(Car.decodeCar(atHost[0].m.car));
    host.broadcast({ t: 'lobby', players: [] });
    host.sendTo(guest.id, { t: 'private' });
    await until(() => atGuest.length === 2);
    assert.deepEqual(atGuest.map(m => m.t), ['lobby', 'private']);

    // messages for someone else are not delivered
    host.sendTo('someone-else', { t: 'nope' });
    guest.send({ t: 'st', s: [1, 2, 3] }, true);
    await until(() => atHost.length === 2);
    assert.ok(!atGuest.some(m => m.t === 'nope'));

    // leaving is noticed
    let left = null;
    host.on('leave', (id) => { left = id; });
    guest.close();
    await until(() => left === guest.id);
  } finally {
    host.close();
    hostBus.close(); guestBus.close(); strangerBus.close();
    broker.close();
  }
});

test('the bus says so when no relay is reachable', async () => {
  await assert.rejects(new Bus({ brokers: ['ws://127.0.0.1:9'], WebSocketImpl: WebSocket, timeout: 800 }).start(), /Could not reach/);
});

test('a local relay link only accepts private addresses', async () => {
  const { relayFromUrl } = await import('../assets/js/brick-rally/net.mjs');
  const page = 'https://example.org/brick-rally.html?relay=';
  assert.equal(relayFromUrl(page + 'ws://192.168.1.20:8081'), 'ws://192.168.1.20:8081/');
  assert.equal(relayFromUrl(page + 'ws://localhost:9001/mqtt'), 'ws://localhost:9001/mqtt');
  assert.equal(relayFromUrl(page + 'ws://10.0.0.5:1'), 'ws://10.0.0.5:1/');
  assert.equal(relayFromUrl(page + 'wss://evil.example.com/mqtt'), null);
  assert.equal(relayFromUrl(page + 'ws://172.40.0.1/'), null);
  assert.equal(relayFromUrl(page + 'javascript:alert(1)'), null);
  assert.equal(relayFromUrl('https://example.org/brick-rally.html'), null);
});
