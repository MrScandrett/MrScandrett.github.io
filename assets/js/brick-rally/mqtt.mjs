// A tiny MQTT 3.1.1 client over WebSocket (QoS 0 only), so Brick Rally can use free public
// brokers as a meeting point without a server of our own. The packet codec is pure and
// tested; MqttClient takes any WebSocket constructor (the browser's, or `ws` in tests).

const enc = new TextEncoder();
const dec = new TextDecoder();

export function encodeLength(n) {
  const out = [];
  do {
    let b = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) b |= 128;
    out.push(b);
  } while (n > 0);
  return out;
}

function str(s) {
  const b = enc.encode(s);
  return [b.length >> 8, b.length & 255, ...b];
}

function packet(type, body) {
  const out = new Uint8Array(1 + encodeLength(body.length).length + body.length);
  const len = encodeLength(body.length);
  out[0] = type;
  out.set(len, 1);
  out.set(body, 1 + len.length);
  return out;
}

export function connectPacket(clientId, keepAlive = 60) {
  return packet(0x10, [...str('MQTT'), 4, 0x02, keepAlive >> 8, keepAlive & 255, ...str(clientId)]);
}

export function subscribePacket(id, topics) {
  const body = [id >> 8, id & 255];
  for (const t of topics) body.push(...str(t), 0);
  return packet(0x82, body);
}

export function unsubscribePacket(id, topics) {
  const body = [id >> 8, id & 255];
  for (const t of topics) body.push(...str(t));
  return packet(0xa2, body);
}

export function publishPacket(topic, payload, retain = false) {
  const p = typeof payload === 'string' ? enc.encode(payload) : payload;
  const body = new Uint8Array([...str(topic), ...p]);
  return packet(0x30 | (retain ? 1 : 0), body);
}

export const PINGREQ = new Uint8Array([0xc0, 0]);
export const DISCONNECT = new Uint8Array([0xe0, 0]);

/** Split a byte buffer into whole packets; returns { packets: [{ type, flags, body }], rest }. */
export function readPackets(buf) {
  const packets = [];
  let i = 0;
  while (i + 2 <= buf.length) {
    let mult = 1, len = 0, j = i + 1, b;
    do {
      if (j >= buf.length) return { packets, rest: buf.slice(i) };
      b = buf[j++];
      len += (b & 127) * mult;
      mult *= 128;
    } while (b & 128);
    if (j + len > buf.length) break;
    packets.push({ type: buf[i] >> 4, flags: buf[i] & 15, body: buf.slice(j, j + len) });
    i = j + len;
  }
  return { packets, rest: buf.slice(i) };
}

export function parsePublish(p) {
  const tl = (p.body[0] << 8) | p.body[1];
  const topic = dec.decode(p.body.slice(2, 2 + tl));
  const qos = (p.flags >> 1) & 3;
  const start = 2 + tl + (qos ? 2 : 0);
  return { topic, payload: dec.decode(p.body.slice(start)), retain: !!(p.flags & 1) };
}

/** MQTT topic filter match with + and # wildcards. */
export function topicMatches(filter, topic) {
  const f = filter.split('/'), t = topic.split('/');
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return true;
    if (i >= t.length) return false;
    if (f[i] !== '+' && f[i] !== t[i]) return false;
  }
  return f.length === t.length;
}

export class MqttClient {
  constructor(url, { WebSocketImpl = globalThis.WebSocket, clientId, keepAlive = 45, timeout = 7000 } = {}) {
    this.url = url;
    this.WS = WebSocketImpl;
    this.clientId = clientId || 'br' + Math.random().toString(36).slice(2, 12);
    this.keepAlive = keepAlive;
    this.timeout = timeout;
    this.subs = new Set();
    this.onmessage = null;
    this.onclose = null;
    this.connected = false;
    this._buf = new Uint8Array(0);
    this._id = 1;
  }

  connect() {
    return new Promise((resolve, reject) => {
      let ws;
      try { ws = new this.WS(this.url, ['mqtt']); } catch (e) { reject(e); return; }
      ws.binaryType = 'arraybuffer';
      this.ws = ws;
      const timer = setTimeout(() => { reject(new Error('timeout')); try { ws.close(); } catch {} }, this.timeout);
      ws.onopen = () => ws.send(connectPacket(this.clientId, this.keepAlive));
      ws.onerror = () => { clearTimeout(timer); if (!this.connected) reject(new Error('socket error')); };
      ws.onclose = () => {
        clearTimeout(timer);
        const was = this.connected;
        this.connected = false;
        clearInterval(this._ping);
        if (!was) reject(new Error('closed'));
        else this.onclose?.();
      };
      ws.onmessage = (ev) => {
        const chunk = new Uint8Array(ev.data instanceof ArrayBuffer ? ev.data : ev.data.buffer ? ev.data.buffer.slice(ev.data.byteOffset, ev.data.byteOffset + ev.data.byteLength) : ev.data);
        const merged = new Uint8Array(this._buf.length + chunk.length);
        merged.set(this._buf); merged.set(chunk, this._buf.length);
        const { packets, rest } = readPackets(merged);
        this._buf = rest;
        for (const p of packets) {
          if (p.type === 2) { // CONNACK
            clearTimeout(timer);
            if (p.body[1] !== 0) { reject(new Error('refused ' + p.body[1])); ws.close(); return; }
            this.connected = true;
            this._ping = setInterval(() => this._send(PINGREQ), this.keepAlive * 500);
            if (this.subs.size) this._send(subscribePacket(this._nextId(), [...this.subs]));
            resolve(this);
          } else if (p.type === 3) {
            const m = parsePublish(p);
            this.onmessage?.(m.topic, m.payload);
          }
        }
      };
    });
  }

  _nextId() { this._id = (this._id % 65535) + 1; return this._id; }
  _send(bytes) { if (this.ws?.readyState === 1) this.ws.send(bytes); }

  subscribe(topic) {
    if (this.subs.has(topic)) return;
    this.subs.add(topic);
    if (this.connected) this._send(subscribePacket(this._nextId(), [topic]));
  }

  unsubscribe(topic) {
    if (!this.subs.delete(topic)) return;
    if (this.connected) this._send(unsubscribePacket(this._nextId(), [topic]));
  }

  publish(topic, payload, opts = {}) {
    if (!this.connected) return false;
    this._send(publishPacket(topic, typeof payload === 'string' ? payload : JSON.stringify(payload), opts.retain));
    return true;
  }

  close() {
    clearInterval(this._ping);
    if (this.connected) this._send(DISCONNECT);
    this.connected = false;
    try { this.ws?.close(); } catch {}
  }
}
