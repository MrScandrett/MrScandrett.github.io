// Same-WiFi multiplayer for the site's games: find people on the same WiFi, host or join a
// lobby, then talk peer-to-peer. Brick Rally (racing) and Chinese Checkers (turn-based, through
// turn-room.mjs) both run on it; each game gets its own channels by passing `app` to Bus.
//
// GitHub Pages can't run a server, so three free public pieces do the work:
//   1. STUN (the same server every video call uses) tells each browser its network's public
//      IP address. Everyone on one WiFi shares it, so it names "this room's WiFi".
//   2. Public MQTT brokers are the meeting point. A browser listens on a channel named after
//      a *hash* of that IP (the address itself is never sent), and hosts announce lobbies
//      there. A 4-letter code reaches the same lobby from anywhere.
//   3. Once in a lobby, each guest opens a WebRTC data channel straight to the host: on one
//      WiFi the game traffic never leaves the building. If the network blocks that (some
//      school WiFi isolates devices), the game keeps running through the broker instead.

import { MqttClient, topicMatches } from './mqtt.mjs';

export const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];
/** Every game's topics live under its own prefix, so one game's lobbies never show in another's. */
export const prefixFor = (app) => {
  const id = String(app || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!id) throw new Error('Bus needs an app id, like { app: "chinese-checkers" }');
  return `classroomos/${id}/v1/`;
};

/**
 * `?relay=ws://192.168.1.20:8081` swaps the public brokers for one on the local network (for
 * WiFi that blocks the public ones; any MQTT-over-WebSocket broker works). Only private
 * addresses are accepted, so a shared link can't send a class's traffic somewhere else.
 */
export function relayFromUrl(href) {
  let u;
  try { u = new URL(new URL(href).searchParams.get('relay') || ''); } catch { return null; }
  if (!/^wss?:$/.test(u.protocol)) return null;
  const h = u.hostname;
  const ok = h === 'localhost' || h.endsWith('.local') || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
  return ok ? u.href : null;
}
export const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }];
export const CODE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXZ';

export const randomId = (n = 10) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => (b % 36).toString(36)).join('');

export function makeCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)), b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export function cleanCode(s) {
  const c = String(s || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  return c.length === 4 && [...c].every(ch => CODE_ALPHABET.includes(ch)) ? c : null;
}

export const cleanName = (s, fallback = 'Player') => String(s || '').replace(/[^\p{L}\p{N} _.'-]/gu, '').trim().slice(0, 16) || fallback;

export class Emitter {
  constructor() { this._h = {}; }
  on(type, fn) { (this._h[type] ||= new Set()).add(fn); return () => this._h[type].delete(fn); }
  emit(type, ...a) { this._h[type]?.forEach(fn => { try { fn(...a); } catch (e) { console.error(e); } }); }
}

// ---------------------------------------------------------------------------------------
// Bus: the same messages on every broker we could reach, de-duplicated on arrival, so two
// devices that each reached a different subset still hear each other.

export class Bus extends Emitter {
  constructor({ app, brokers = BROKERS, WebSocketImpl = globalThis.WebSocket, timeout = 7000 } = {}) {
    super();
    this.prefix = prefixFor(app);
    this.self = randomId(8);
    this.brokers = brokers;
    this.WS = WebSocketImpl;
    this.timeout = timeout;
    this.clients = [];
    this.handlers = [];
    this.seen = new Map();
    this.n = 0;
  }

  async start() {
    const tries = this.brokers.map(url => {
      const c = new MqttClient(url, { WebSocketImpl: this.WS, timeout: this.timeout });
      c.onmessage = (t, p) => this._deliver(t, p);
      c.onclose = () => { this.emit('status', this.status()); this._reconnect(c); };
      this.clients.push(c);
      return c.connect().then(() => { this.emit('status', this.status()); return c; });
    });
    try {
      await Promise.any(tries);
    } catch {
      throw new Error('Could not reach any game relay. The network may block them: try a phone hotspot, or play solo.');
    }
    Promise.allSettled(tries).then(() => this.emit('status', this.status()));
    return this;
  }

  _reconnect(c) {
    if (this.closed) return;
    setTimeout(() => { if (!this.closed) c.connect().then(() => this.emit('status', this.status())).catch(() => this._reconnect(c)); }, 3000);
  }

  status() { return { connected: this.clients.filter(c => c.connected).length, total: this.brokers.length }; }

  _deliver(topic, payload) {
    let msg;
    try { msg = JSON.parse(payload); } catch { return; }
    if (!msg || typeof msg !== 'object') return;
    if (msg._m) {
      if (this.seen.has(msg._m)) return;
      this.seen.set(msg._m, 1);
      if (this.seen.size > 2000) this.seen.delete(this.seen.keys().next().value);
    }
    if (msg._f === this.self) return; // our own echo
    for (const h of this.handlers) if (topicMatches(h.filter, topic)) h.fn(msg, topic);
  }

  subscribe(topic, fn) {
    const filter = this.prefix + topic;
    const h = { filter, fn };
    this.handlers.push(h);
    // MqttClient remembers it, so a broker that connects (or reconnects) later subscribes too
    for (const c of this.clients) c.subscribe(filter);
    return () => {
      this.handlers = this.handlers.filter(x => x !== h);
      if (!this.handlers.some(x => x.filter === filter)) this.clients.forEach(c => c.unsubscribe(filter));
    };
  }

  publish(topic, msg) {
    const out = { ...msg, _f: this.self, _m: this.self + (++this.n).toString(36) };
    const text = JSON.stringify(out);
    let ok = false;
    for (const c of this.clients) ok = c.publish(this.prefix + topic, text) || ok;
    return ok;
  }

  close() {
    this.closed = true;
    this.clients.forEach(c => c.close());
    this.clients = [];
  }
}

// ---------------------------------------------------------------------------------------
// Same-WiFi detection.

export async function hashKey(text) {
  // The salt predates the shared module; keeping it keeps old and new Brick Rally pages on one channel.
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('brick-rally-wifi:' + text));
  return Array.from(new Uint8Array(d).slice(0, 8), b => b.toString(16).padStart(2, '0')).join('');
}

/** IPv4 as-is; IPv6 reduced to its /64 network, which every device on one WiFi shares. */
export function networkOf(ip) {
  if (!ip) return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip;
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + '::/64';
  }
  return null;
}

export function publicIpsFromCandidates(lines) {
  const ips = new Set();
  for (const line of lines) {
    const m = /candidate:\S+ \d+ \S+ \d+ (\S+) \d+ typ srflx/.exec(line || '');
    if (m) ips.add(m[1]);
  }
  return [...ips];
}

/** Ask STUN for this network's public address(es). Resolves to hashed channel keys (maybe []). */
export async function findNeighborhood({ RTC = globalThis.RTCPeerConnection, timeout = 3000 } = {}) {
  if (!RTC) return [];
  const pc = new RTC({ iceServers: ICE });
  const lines = [];
  pc.createDataChannel('probe');
  const done = new Promise(res => {
    const t = setTimeout(res, timeout);
    pc.onicecandidate = (e) => {
      if (!e.candidate) { clearTimeout(t); res(); return; }
      lines.push(e.candidate.candidate);
      if (/typ srflx/.test(e.candidate.candidate) && lines.filter(l => /srflx/.test(l)).length >= 2) { clearTimeout(t); res(); }
    };
  });
  try {
    await pc.setLocalDescription(await pc.createOffer());
    await done;
  } finally {
    pc.close();
  }
  const nets = [...new Set(publicIpsFromCandidates(lines).map(networkOf).filter(Boolean))];
  return Promise.all(nets.map(hashKey));
}

// ---------------------------------------------------------------------------------------
// WebRTC link between a guest and the host. Two channels: "r" ordered and reliable for
// lobby/game control, "u" unordered with no retries for fast updates like 20 Hz car positions (a late
// position is worse than a lost one).

export class PeerLink extends Emitter {
  constructor({ initiator, signal, RTC = globalThis.RTCPeerConnection }) {
    super();
    this.signal = signal;
    this.open = false;
    if (!RTC) return;
    const pc = this.pc = new RTC({ iceServers: ICE });
    pc.onicecandidate = (e) => { if (e.candidate) signal({ ice: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) this._down();
    };
    const wire = (ch) => {
      ch.onopen = () => this._check();
      ch.onclose = () => this._down();
      ch.onmessage = (e) => { try { this.emit('message', JSON.parse(e.data)); } catch {} };
    };
    if (initiator) {
      this.r = pc.createDataChannel('r');
      this.u = pc.createDataChannel('u', { ordered: false, maxRetransmits: 0 });
      wire(this.r); wire(this.u);
      pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => signal({ sdp: pc.localDescription.toJSON ? pc.localDescription.toJSON() : pc.localDescription })).catch(() => {});
    } else {
      pc.ondatachannel = (e) => { this[e.channel.label === 'u' ? 'u' : 'r'] = e.channel; wire(e.channel); this._check(); };
    }
    this.pendingIce = [];
  }

  _check() {
    const ok = this.r?.readyState === 'open' && this.u?.readyState === 'open';
    if (ok && !this.open) { this.open = true; this.emit('open'); }
  }

  _down() {
    if (!this.open) return;
    this.open = false;
    this.emit('close');
  }

  async handle(data) {
    const pc = this.pc;
    if (!pc) return;
    try {
      if (data.sdp) {
        await pc.setRemoteDescription(data.sdp);
        for (const c of this.pendingIce.splice(0)) await pc.addIceCandidate(c).catch(() => {});
        if (data.sdp.type === 'offer') {
          await pc.setLocalDescription(await pc.createAnswer());
          this.signal({ sdp: pc.localDescription.toJSON ? pc.localDescription.toJSON() : pc.localDescription });
        }
      } else if (data.ice) {
        if (!pc.remoteDescription) this.pendingIce.push(data.ice);
        else await pc.addIceCandidate(data.ice).catch(() => {});
      }
    } catch { /* a failed link just means we stay on the relay */ }
  }

  send(msg, fast = false) {
    const ch = fast ? this.u : this.r;
    if (!this.open || ch?.readyState !== 'open') return false;
    try { ch.send(JSON.stringify(msg)); return true; } catch { return false; }
  }

  close() { try { this.pc?.close(); } catch {} this.open = false; }
}

// ---------------------------------------------------------------------------------------
// Sessions. The host owns the player list; everything else is app messages.

export class HostSession extends Emitter {
  constructor(bus, { code = makeCode(), neighborhoods = [], RTC = globalThis.RTCPeerConnection, info = () => ({}) } = {}) {
    super();
    this.bus = bus; this.code = code; this.neighborhoods = neighborhoods; this.RTC = RTC; this.info = info;
    this.peers = new Map(); // id → { id, link, last }
    this.offs = [];
  }

  start() {
    const room = `room/${this.code}/`;
    this.offs.push(this.bus.subscribe(room + 'up', (m) => this._fromGuest(m, 'relay')));
    this.offs.push(this.bus.subscribe(room + 'sig/host', (m) => this._signal(m)));
    for (const nb of this.neighborhoods) {
      this.offs.push(this.bus.subscribe(`nb/${nb}`, (m) => { if (m.t === 'who') this.beacon(); }));
    }
    this.beacon();
    this._beat = setInterval(() => this.beacon(), 2000);
    this._sweep = setInterval(() => {
      const now = Date.now();
      for (const p of this.peers.values()) if (now - p.last > 12000) this._drop(p.id, 'timeout');
    }, 2000);
    return this;
  }

  beacon() {
    const msg = { t: 'lobby', code: this.code, ...this.info(), ts: Date.now() };
    for (const nb of this.neighborhoods) this.bus.publish(`nb/${nb}`, msg);
  }

  _fromGuest(m, via) {
    if (!m || typeof m.id !== 'string' || m.id.length > 20) return;
    let p = this.peers.get(m.id);
    if (!p) {
      if (m.t !== 'join') return;
      p = { id: m.id, link: null, last: Date.now(), via };
      this.peers.set(m.id, p);
    }
    p.last = Date.now();
    if (m.t === 'bye') { this._drop(m.id, 'left'); return; }
    if (m.t === 'hb') return; // keep-alive only
    this.emit('message', m, m.id);
  }

  _signal(m) {
    if (!m?.from || !this.peers.has(m.from)) return;
    const p = this.peers.get(m.from);
    if (m.data?.sdp?.type === 'offer') {
      p.link?.close();
      p.link = new PeerLink({ initiator: false, RTC: this.RTC, signal: (data) => this.bus.publish(`room/${this.code}/sig/${m.from}`, { from: 'host', data }) });
      p.link.on('message', (msg) => this._fromGuest(msg, 'p2p'));
      p.link.on('open', () => { p.via = 'p2p'; this.emit('links'); });
      p.link.on('close', () => { p.via = 'relay'; this.emit('links'); });
    }
    p.link?.handle(m.data);
  }

  _drop(id, why) {
    const p = this.peers.get(id);
    if (!p) return;
    p.link?.close();
    this.peers.delete(id);
    this.emit('leave', id, why);
  }

  kick(id) { this.sendTo(id, { t: 'kick' }); this._drop(id, 'kicked'); }

  sendTo(id, msg, fast = false) {
    const p = this.peers.get(id);
    if (p?.link?.send(msg, fast)) return;
    this.bus.publish(`room/${this.code}/down`, { ...msg, to: id });
  }

  broadcast(msg, fast = false) {
    let relay = false;
    for (const p of this.peers.values()) if (!p.link?.send(msg, fast)) relay = true;
    if (relay) this.bus.publish(`room/${this.code}/down`, msg);
  }

  linkSummary() {
    const all = [...this.peers.values()];
    return { p2p: all.filter(p => p.via === 'p2p').length, relay: all.filter(p => p.via !== 'p2p').length };
  }

  close() {
    this.broadcast({ t: 'closed' });
    clearInterval(this._beat); clearInterval(this._sweep);
    this.offs.forEach(f => f());
    this.peers.forEach(p => p.link?.close());
    this.peers.clear();
  }
}

export class GuestSession extends Emitter {
  constructor(bus, { code, id = randomId(8), RTC = globalThis.RTCPeerConnection } = {}) {
    super();
    this.bus = bus; this.code = code; this.id = id; this.RTC = RTC;
    this.via = 'relay';
    this.offs = [];
    this.last = Date.now();
  }

  start() {
    const room = `room/${this.code}/`;
    this.offs.push(this.bus.subscribe(room + 'down', (m) => { if (!m.to || m.to === this.id) this._fromHost(m); }));
    this.offs.push(this.bus.subscribe(room + 'sig/' + this.id, (m) => this.link?.handle(m.data)));
    this._watch = setInterval(() => {
      if (Date.now() - this.last > 10000) this.emit('lost');
    }, 2000);
    // The host drops guests it hasn't heard from in 12 s, and a guest waiting in a lobby (or
    // for its turn) has nothing else to say, so it says "still here" every 3 s.
    this._hb = setInterval(() => this.send({ t: 'hb' }), 3000);
    return this;
  }

  /** Start the direct link once the host has accepted us. */
  connectDirect() {
    if (!this.RTC || this.link) return;
    this.link = new PeerLink({ initiator: true, RTC: this.RTC, signal: (data) => this.bus.publish(`room/${this.code}/sig/host`, { from: this.id, data }) });
    this.link.on('message', (m) => this._fromHost(m));
    this.link.on('open', () => { this.via = 'p2p'; this.emit('link', 'p2p'); });
    this.link.on('close', () => { this.via = 'relay'; this.emit('link', 'relay'); });
  }

  _fromHost(m) {
    this.last = Date.now();
    if (m.t === 'closed') { this.emit('closed'); return; }
    if (m.t === 'kick') { this.emit('kicked'); return; }
    this.emit('message', m);
  }

  send(msg, fast = false) {
    const out = { ...msg, id: this.id };
    if (this.link?.send(out, fast)) return;
    this.bus.publish(`room/${this.code}/up`, out);
  }

  /** Leave. `quiet` skips the goodbye (the host already knows: it closed the room or kicked us). */
  close({ quiet = false } = {}) {
    if (!quiet) this.send({ t: 'bye' });
    clearInterval(this._watch); clearInterval(this._hb);
    this.offs.forEach(f => f());
    this.link?.close();
  }
}

/**
 * Listen for lobbies on this WiFi. Calls onChange(list) whenever the list changes. Each entry has
 * code, host, players, max and seen; `clean(msg)` adds a game's own fields (sanitised: beacons
 * come from anyone on the broker).
 */
export function watchLobbies(bus, neighborhoods, onChange, { clean = (m) => ({ phase: m.phase === 'play' ? 'play' : 'lobby' }) } = {}) {
  const found = new Map();
  const emit = () => onChange([...found.values()].sort((a, b) => a.code.localeCompare(b.code)));
  const offs = neighborhoods.map(nb => bus.subscribe(`nb/${nb}`, (m) => {
    if (m.t !== 'lobby' || !cleanCode(m.code)) return;
    const had = found.has(m.code);
    found.set(m.code, { ...clean(m), code: m.code, host: cleanName(m.host), players: Math.max(1, Math.min(99, +m.players || 1)), max: Math.max(1, Math.min(99, +m.max || 8)), seen: Date.now() });
    emit(had);
  }));
  const ask = () => neighborhoods.forEach(nb => bus.publish(`nb/${nb}`, { t: 'who' }));
  ask();
  const sweep = setInterval(() => {
    let changed = false;
    for (const [k, v] of found) if (Date.now() - v.seen > 7000) { found.delete(k); changed = true; }
    if (changed) emit();
  }, 1500);
  return { refresh: ask, stop() { clearInterval(sweep); offs.forEach(f => f()); } };
}
