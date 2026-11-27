// Turn-based rooms for same-WiFi games (board games, card games, quizzes), on top of net.mjs.
//
// The host is the referee. It owns the seats and the one true game state: guests send it the
// move they want, the game checks it, and the host publishes the new state to everyone. Guests
// never change their own board, so two devices can't disagree about where a marble is.
//
// The relay is QoS 0 and may drop a message, so every state carries a number and the host
// repeats the latest one every few seconds; a guest that missed one just takes the next. Each
// state is the whole game (small for a board game), never a diff.
//
// Seats: { id, name, kind: 'host' | 'guest' | 'cpu', away }. Seats nobody has taken are 'cpu';
// a guest who drops out mid-game is marked `away` and the host's computer plays for them until
// they come back (same id, kept in localStorage), so a flaky laptop doesn't end the game.
//
// Game code only does three things: build a state for start(), check moves from the 'move'
// event and publish() the result, and draw whatever state arrives. See the Chinese Checkers
// student project (student-projects/Mr. Scandrett/chinese-checkers/script.js).

import { Emitter, Bus, HostSession, GuestSession, findNeighborhood, relayFromUrl, cleanName, randomId } from './net.mjs';

export const MAX_SEATS = 8;
const KINDS = ['host', 'guest', 'cpu'];
const REPEAT_MS = 3000;

/** One connection per page: the hashed WiFi neighbourhood(s) plus a Bus on the game's channels. */
export async function connect(app, { href = globalThis.location?.href || '', busOptions = {} } = {}) {
  const relay = relayFromUrl(href);
  const [neighborhoods, bus] = await Promise.all([
    // a local relay *is* the WiFi, so everyone on it shares one neighbourhood
    relay ? Promise.resolve(['local']) : findNeighborhood().catch(() => []),
    new Bus({ app, ...(relay ? { brokers: [relay] } : {}), ...busOptions }).start(),
  ]);
  return { bus, neighborhoods, relay };
}

/** This browser's player id and name for a game, remembered so a dropped player can rejoin. */
export function identity(app, storage = globalThis.localStorage) {
  const key = `lan-play:${app}:me`;
  let saved = {};
  try { saved = JSON.parse(storage?.getItem(key) || '{}') || {}; } catch {}
  const me = { id: typeof saved.id === 'string' && /^[a-z0-9]{6,20}$/.test(saved.id) ? saved.id : randomId(10), name: cleanName(saved.name, '') };
  const save = () => { try { storage?.setItem(key, JSON.stringify(me)); } catch {} };
  save();
  return { me, save };
}

/** Seats from the wire: anything a stranger could send is trimmed to the shape above. */
export function cleanSeats(list) {
  return (Array.isArray(list) ? list : []).slice(0, MAX_SEATS).map(s => ({
    id: typeof s?.id === 'string' && s.id.length <= 20 ? s.id : null,
    name: cleanName(s?.name, 'Computer'),
    kind: KINDS.includes(s?.kind) ? s.kind : 'cpu',
    away: !!s?.away,
  }));
}

const cpuSeat = () => ({ id: null, name: 'Computer', kind: 'cpu', away: false });

// ---------------------------------------------------------------------------------------

export class TurnHost extends Emitter {
  /**
   * @param bus a started Bus
   * @param opts.neighborhoods from connect()
   * @param opts.me { id, name }
   * @param opts.seats how many seats to start with
   * @param opts.game a short name for the lobby list ("Chinese Checkers")
   */
  constructor(bus, { neighborhoods = [], me, seats = 2, game = '', RTC = globalThis.RTCPeerConnection } = {}) {
    super();
    this.me = { id: me.id, name: cleanName(me.name, 'Host') };
    this.game = String(game).slice(0, 30);
    this.seats = [{ id: this.me.id, name: this.me.name, kind: 'host', away: false }];
    while (this.seats.length < Math.max(1, Math.min(MAX_SEATS, seats))) this.seats.push(cpuSeat());
    this.phase = 'lobby';
    this.g = 0;          // game number: a new start() is a new game
    this.n = 0;          // state number within the game
    this.state = null;
    this.last = null;
    this.session = new HostSession(bus, {
      neighborhoods, RTC,
      info: () => ({ host: this.me.name, game: this.game, players: this.seats.filter(s => s.kind !== 'cpu').length, max: this.seats.length, phase: this.phase }),
    });
    this.code = this.session.code;
    this.session.on('message', (m, from) => this._onMessage(m, from));
    this.session.on('leave', (id, why) => this._onLeave(id, why));
    this.session.on('links', () => this.emit('lobby', this.lobby()));
  }

  start() {
    this.session.start();
    this._repeat = setInterval(() => this._repeatLatest(), REPEAT_MS);
    this._pushLobby();
    return this;
  }

  lobby() {
    const links = new Map([...this.session.peers.values()].map(p => [p.id, p.via]));
    return {
      code: this.code, phase: this.phase, game: this.game,
      seats: this.seats.map(s => ({ ...s, via: s.kind === 'guest' ? (links.get(s.id) || 'relay') : null })),
    };
  }

  seatOf(id) { return this.seats.findIndex(s => s.id === id && s.kind !== 'cpu'); }

  /** True when this device's computer should move for a seat: nobody took it, or they dropped out. */
  isComputer(i) { const s = this.seats[i]; return !!s && (s.kind === 'cpu' || s.away); }

  /** Change the number of seats in the lobby. Never removes a seated person. */
  setSeatCount(count) {
    if (this.phase !== 'lobby') return false;
    count = Math.max(1, Math.min(MAX_SEATS, count | 0));
    const people = this.seats.filter(s => s.kind !== 'cpu');
    if (people.length > count) return false;
    const next = this.seats.slice(0, count);
    // anyone who'd be cut off moves into a computer seat that stays
    for (const s of this.seats.slice(count)) {
      if (s.kind === 'cpu') continue;
      const free = next.findIndex(x => x.kind === 'cpu');
      next[free] = s;
    }
    while (next.length < count) next.push(cpuSeat());
    this.seats = next;
    this._pushLobby();
    return true;
  }

  /** Start a game with the first state. Seats and their order are fixed until toLobby(). */
  begin(state) {
    this.phase = 'play';
    this.g++;
    this.n = 0;
    this.publish(state, null);
  }

  /** The new state after a move (or anything else). `last` says what just happened, for animation. */
  publish(state, last = null) {
    this.state = state;
    this.last = last;
    this.n++;
    this.session.broadcast(this._stateMsg());
    this.session.beacon();
    this.emit('lobby', this.lobby());
  }

  reject(id, reason) {
    this.session.sendTo(id, { t: 'reject', reason: String(reason || 'Not allowed').slice(0, 80) });
    if (this.state) this.session.sendTo(id, this._stateMsg());
  }

  toLobby() {
    this.phase = 'lobby';
    this.state = null; this.last = null;
    this.seats = this.seats.map(s => (s.away ? cpuSeat() : s));
    this._pushLobby();
  }

  kick(id) {
    const i = this.seatOf(id);
    if (i <= 0) return;
    this.session.kick(id);
  }

  close() {
    clearInterval(this._repeat);
    this.session.close();
  }

  _stateMsg() {
    return { t: 'state', g: this.g, n: this.n, state: this.state, last: this.last, seats: cleanSeats(this.seats), game: this.game };
  }

  _pushLobby() {
    this.session.broadcast({ t: 'lobby', seats: cleanSeats(this.seats), phase: this.phase, game: this.game });
    this.session.beacon();
    this.emit('lobby', this.lobby());
  }

  _repeatLatest() {
    if (this.phase === 'play' && this.state) this.session.broadcast(this._stateMsg());
    else this.session.broadcast({ t: 'lobby', seats: cleanSeats(this.seats), phase: this.phase, game: this.game });
  }

  _onMessage(m, from) {
    if (m.t === 'join') {
      const name = cleanName(m.name, 'Player');
      let i = this.seatOf(from);
      if (i >= 0) {
        const wasAway = this.seats[i].away;
        this.seats[i] = { ...this.seats[i], name, away: false };
        if (wasAway) this.emit('back', i, name);
      } else if (this.phase === 'lobby') {
        i = this.seats.findIndex(s => s.kind === 'cpu');
        if (i < 0) { this.session.sendTo(from, { t: 'full' }); return; }
        this.seats[i] = { id: from, name, kind: 'guest', away: false };
        this.emit('join', i, name);
      }
      // a newcomer mid-game watches (no seat) until the next game
      this._pushLobby();
      if (this.phase === 'play' && this.state) this.session.sendTo(from, this._stateMsg());
    } else if (m.t === 'sync') {
      if (this.phase === 'play' && this.state) this.session.sendTo(from, this._stateMsg());
      else this.session.sendTo(from, { t: 'lobby', seats: cleanSeats(this.seats), phase: this.phase, game: this.game });
    } else if (m.t === 'move') {
      const i = this.seatOf(from);
      if (this.phase !== 'play' || i < 0) { this.reject(from, 'You are watching this game.'); return; }
      if (m.g !== this.g || m.n !== this.n) { this.reject(from, 'The board changed. Try again.'); return; }
      this.emit('move', m.move, i, from);
    }
  }

  _onLeave(id) {
    const i = this.seats.findIndex(s => s.id === id);
    if (i <= 0) return;
    const name = this.seats[i].name;
    if (this.phase === 'play') this.seats[i] = { ...this.seats[i], away: true };
    else this.seats[i] = cpuSeat();
    this.emit('leave', i, name);
    this._pushLobby();
  }
}

// ---------------------------------------------------------------------------------------

export class TurnGuest extends Emitter {
  constructor(bus, { code, me, RTC = globalThis.RTCPeerConnection } = {}) {
    super();
    this.me = { id: me.id, name: cleanName(me.name, 'Player') };
    this.code = code;
    this.session = new GuestSession(bus, { code, id: me.id, RTC });
    this.accepted = false;
    this.phase = 'lobby';
    this.seats = [];
    this.g = 0; this.n = 0;
    this.state = null;
    this.ended = false;
  }

  get mySeat() { return this.seats.findIndex(s => s.id === this.me.id && s.kind === 'guest'); }
  get via() { return this.session.via; }

  start({ knockEvery = 1500, tries = 8 } = {}) {
    const s = this.session.start();
    s.on('message', (m) => this._onMessage(m));
    s.on('link', (via) => this.emit('link', via));
    s.on('closed', () => this._end('closed'));
    s.on('kicked', () => this._end('kicked'));
    s.on('lost', () => this._end('lost'));
    const knock = () => s.send({ t: 'join', name: this.me.name });
    knock();
    let n = 0;
    this._knock = setInterval(() => {
      if (this.accepted || this.ended) { clearInterval(this._knock); return; }
      if (++n > tries) { clearInterval(this._knock); this._end('noanswer'); return; }
      knock();
    }, knockEvery);
    return this;
  }

  lobby() {
    return { code: this.code, phase: this.phase, seats: this.seats.map(s => ({ ...s, via: s.id === this.me.id ? this.via : null })), mySeat: this.mySeat };
  }

  /** Ask the host to make a move. The board only changes when the host's new state arrives. */
  move(move) { this.session.send({ t: 'move', move, g: this.g, n: this.n }); }

  sync() { this.session.send({ t: 'sync' }); }

  close() {
    this.ended = true;
    clearInterval(this._knock);
    this.session.close();
  }

  _accept() {
    if (this.accepted) return;
    this.accepted = true;
    this.session.connectDirect();
    this.emit('joined');
  }

  _onMessage(m) {
    if (this.ended) return;
    if (m.t === 'full') { this._end('full'); return; }
    if (m.t === 'reject') { this.emit('reject', String(m.reason || '').slice(0, 80)); return; }
    if (m.t === 'lobby' || m.t === 'state') {
      this.seats = cleanSeats(m.seats);
      // in the seat list, or watching a game that's already running
      if (this.mySeat >= 0 || m.t === 'state') this._accept();
    }
    if (m.t === 'lobby') {
      const was = this.phase;
      this.phase = m.phase === 'play' ? 'play' : 'lobby';
      if (this.phase === 'lobby') { this.state = null; this.n = 0; }
      this.emit('lobby', this.lobby());
      if (was === 'play' && this.phase === 'lobby') this.emit('backToLobby');
      if (this.phase === 'play' && !this.state) this.sync();
      return;
    }
    if (m.t === 'state') {
      const g = +m.g || 0, n = +m.n || 0;
      const info = () => ({ state: m.state, last: m.last && typeof m.last === 'object' ? m.last : null, seats: this.seats, mySeat: this.mySeat, g, n });
      this.phase = 'play';
      if (g !== this.g) {
        this.g = g; this.n = n; this.state = m.state;
        this.emit('lobby', this.lobby());
        this.emit('start', info());
      } else if (n > this.n) {
        // skipping a number is fine: every state is the whole game
        const skipped = n > this.n + 1;
        this.n = n; this.state = m.state;
        this.emit('state', { ...info(), skipped });
      } else if (n === this.n) {
        this.emit('lobby', this.lobby()); // a repeat: seats may have changed (someone dropped out)
      }
    }
  }

  _end(why) {
    if (this.ended) return;
    this.ended = true;
    clearInterval(this._knock);
    this.session.close({ quiet: why === 'closed' || why === 'kicked' });
    this.emit('end', why);
  }
}

export const END_MESSAGES = {
  closed: 'The host ended the game.',
  kicked: 'The host removed you from the game.',
  lost: 'Lost contact with the host.',
  full: 'That game is full.',
  noanswer: 'No answer from that code. Check it and try again?',
};
