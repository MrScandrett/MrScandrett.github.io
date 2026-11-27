// Same-WiFi turn-based rooms (assets/js/lan-play/turn-room.mjs), end to end over an in-process
// MQTT broker: seats, the host as referee, dropped players, rejoining, watchers, and the
// per-game channels that keep one game's lobbies out of another's.

import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { fakeBroker, until } from './helpers/fake-mqtt-broker.mjs';
import { Bus, watchLobbies, prefixFor, cleanName } from '../assets/js/lan-play/net.mjs';
import { TurnHost, TurnGuest, cleanSeats, identity, MAX_SEATS } from '../assets/js/lan-play/turn-room.mjs';
import * as BrickNet from '../assets/js/brick-rally/net.mjs';

const busFor = (broker, app) => new Bus({ app, brokers: [broker.url], WebSocketImpl: WebSocket, timeout: 1500 }).start();

test('every game gets its own channels, and Brick Rally keeps its old ones', () => {
  assert.equal(prefixFor('chinese-checkers'), 'classroomos/chinese-checkers/v1/');
  assert.equal(BrickNet.PREFIX, 'classroomos/brickrally/v1/');
  assert.throws(() => prefixFor(''), /app id/);
  assert.throws(() => new Bus({}), /app id/);
  assert.equal(new BrickNet.Bus({ brokers: [] }).prefix, 'classroomos/brickrally/v1/');
  assert.equal(BrickNet.cleanName(''), 'Racer');
  assert.equal(cleanName(''), 'Player');
  assert.equal(cleanName('', 'Host'), 'Host');
});

test('seats from the wire are trimmed to a safe shape', () => {
  const seats = cleanSeats([{ id: 'abc', name: '<b>Sam</b>', kind: 'guest' }, { id: 5, kind: 'admin' }, null, ...Array(20).fill({})]);
  assert.equal(seats.length, MAX_SEATS);
  assert.deepEqual(seats[0], { id: 'abc', name: 'bSamb', kind: 'guest', away: false });
  assert.deepEqual(seats[1], { id: null, name: 'Computer', kind: 'cpu', away: false });
  assert.deepEqual(cleanSeats('nope'), []);
});

test('identity is remembered per game, so a dropped player can rejoin as themselves', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const a = identity('chinese-checkers', storage);
  a.me.name = 'Ada'; a.save();
  const b = identity('chinese-checkers', storage);
  assert.equal(b.me.id, a.me.id);
  assert.equal(b.me.name, 'Ada');
  assert.notEqual(identity('nim', storage).me.id, a.me.id);
  store.set('lan-play:nim:me', '{"id":"<script>","name":"x"}');
  assert.match(identity('nim', storage).me.id, /^[a-z0-9]{10}$/);
});

test('a lobby on one game is invisible to another game on the same WiFi', async () => {
  const broker = await fakeBroker();
  const [hostBus, sameGame, otherGame] = await Promise.all([busFor(broker, 'chinese-checkers'), busFor(broker, 'chinese-checkers'), busFor(broker, 'brickrally')]);
  const host = new TurnHost(hostBus, { neighborhoods: ['nb'], me: { id: 'hostid', name: 'Ms. H' }, seats: 4, game: 'Chinese Checkers', RTC: null }).start();
  try {
    let seen = [], other = [];
    const w1 = watchLobbies(sameGame, ['nb'], (l) => { seen = l; });
    const w2 = watchLobbies(otherGame, ['nb'], (l) => { other = l; });
    await until(() => seen.length === 1);
    assert.deepEqual({ code: seen[0].code, host: seen[0].host, players: seen[0].players, max: seen[0].max, phase: seen[0].phase }, { code: host.code, host: 'Ms. H', players: 1, max: 4, phase: 'lobby' });
    await new Promise(r => setTimeout(r, 150));
    assert.equal(other.length, 0);
    w1.stop(); w2.stop();
  } finally {
    host.close(); hostBus.close(); sameGame.close(); otherGame.close(); broker.close();
  }
});

test('host referees a turn-based game: seats, moves, dropouts, rejoining and watchers', async () => {
  const broker = await fakeBroker();
  const buses = await Promise.all([0, 1, 2, 3].map(() => busFor(broker, 'chinese-checkers')));
  const [hb, ab, bb, cb] = buses;
  const host = new TurnHost(hb, { neighborhoods: ['nb'], me: { id: 'hostid', name: 'Host' }, seats: 3, game: 'Test', RTC: null }).start();
  const rooms = [host];
  const guest = (bus, id, name) => { const g = new TurnGuest(bus, { code: host.code, me: { id, name }, RTC: null }); rooms.push(g); return g; };
  try {
    // two guests take the two computer seats
    const ann = guest(ab, 'annid', 'Ann').start();
    const ben = guest(bb, 'benid', 'Ben').start();
    await until(() => ann.mySeat >= 0 && ben.mySeat >= 0);
    assert.deepEqual(host.seats.map(s => s.kind), ['host', 'guest', 'guest']);
    assert.deepEqual([ann.mySeat, ben.mySeat].sort(), [1, 2]);
    assert.equal(host.setSeatCount(2), false, 'never drops a seated person');

    // a third guest finds it full
    let why = null;
    const cy = guest(cb, 'cyid', 'Cy');
    cy.on('end', (w) => { why = w; });
    cy.start();
    await until(() => why === 'full');

    // start: everyone gets the first state
    const starts = [];
    ann.on('start', (i) => starts.push(['ann', i]));
    ben.on('start', (i) => starts.push(['ben', i]));
    host.begin({ board: 0, turn: 0 });
    await until(() => starts.length === 2);
    assert.deepEqual(starts.map(([, i]) => i.state), [{ board: 0, turn: 0 }, { board: 0, turn: 0 }]);

    // the host checks moves; a move made against an old board is turned away by the room itself
    const moves = [];
    host.on('move', (move, seat, from) => moves.push({ move, seat, from }));
    const annStates = [];
    ann.on('state', (i) => annStates.push(i));
    const rejects = [];
    ben.on('reject', (r) => rejects.push(r));
    ann.move({ go: 'a' });
    await until(() => moves.length === 1);
    assert.equal(moves[0].seat, ann.mySeat);
    host.publish({ board: 1, turn: 1 }, { what: 'a' });
    await until(() => annStates.length === 1);
    assert.deepEqual(annStates[0].last, { what: 'a' });
    ben.n = 0; // pretend Ben missed the new board
    ben.move({ go: 'stale' });
    await until(() => rejects.length === 1);
    assert.match(rejects[0], /board changed/);
    assert.equal(moves.length, 1);
    await until(() => ben.n === 2, 4000); // the reject comes with the current board

    // Ben's laptop drops out: the seat is kept for him and the computer plays it
    const left = [];
    host.on('leave', (i, name) => left.push(name));
    ben.close();
    await until(() => left.length === 1);
    const benSeat = host.seats.findIndex(s => s.id === 'benid');
    assert.ok(host.seats[benSeat].away);
    assert.ok(host.isComputer(benSeat));

    // ...and he comes back as himself and gets the board
    const back = [];
    host.on('back', (i) => back.push(i));
    const ben2 = guest(bb, 'benid', 'Ben');
    const benStarts = [];
    ben2.on('start', (i) => benStarts.push(i));
    ben2.start();
    await until(() => back.length === 1 && benStarts.length === 1);
    assert.equal(back[0], benSeat);
    assert.equal(benStarts[0].mySeat, benSeat);
    assert.deepEqual(benStarts[0].state, { board: 1, turn: 1 });
    assert.ok(!host.isComputer(benSeat));

    // someone new mid-game watches instead of taking a seat
    const watcher = guest(cb, 'watchid', 'Dee');
    const wStarts = [];
    watcher.on('start', (i) => wStarts.push(i));
    watcher.start();
    await until(() => wStarts.length === 1);
    assert.equal(wStarts[0].mySeat, -1);
    watcher.move({ go: 'sneaky' });
    await new Promise(r => setTimeout(r, 200));
    assert.equal(moves.length, 1);

    // back to the lobby, then a new game is a new start
    const lobbyBack = [];
    ann.on('backToLobby', () => lobbyBack.push(1));
    host.toLobby();
    await until(() => lobbyBack.length === 1);
    host.begin({ board: 9 });
    await until(() => starts.filter(([w]) => w === 'ann').length === 2);

    // closing the room tells the guests
    let annEnd = null;
    ann.on('end', (w) => { annEnd = w; });
    host.close();
    await until(() => annEnd === 'closed');
  } finally {
    rooms.forEach(r => { try { r.close(); } catch {} });
    buses.forEach(b => b.close());
    broker.close();
  }
});

test('a guest waiting in the lobby is not timed out', async (t) => {
  // HostSession drops guests silent for 12 s; guests now say "still here" every 3 s.
  t.mock.timers.enable({ apis: ['setInterval', 'Date'] });
  const { GuestSession, HostSession } = await import('../assets/js/lan-play/net.mjs');
  const sent = [];
  const fakeBus = { subscribe: () => () => {}, publish: (topic, m) => { sent.push(m); return true; } };
  const g = new GuestSession(fakeBus, { code: 'BCDF', id: 'gid', RTC: null }).start();
  t.mock.timers.tick(9000);
  assert.ok(sent.filter(m => m.t === 'hb').length >= 3);
  g.close();
  const h = new HostSession(fakeBus, { RTC: null });
  h._fromGuest({ t: 'join', id: 'gid' }, 'relay');
  const heard = [];
  h.on('message', (m) => heard.push(m.t));
  h._fromGuest({ t: 'hb', id: 'gid' }, 'relay');
  assert.deepEqual(heard, [], 'heartbeats are not game messages');
});
