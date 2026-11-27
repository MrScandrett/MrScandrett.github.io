// A minimal MQTT 3.1.1 broker (QoS 0) for testing the same-WiFi game sessions end to end
// (Brick Rally, lan-play). Not a test file itself: npm test only runs tests/*.test.mjs.

import { WebSocketServer } from 'ws';
import { readPackets, publishPacket, parsePublish, topicMatches } from '../../assets/js/lan-play/mqtt.mjs';

/** Start a broker on a free port: { url, close }. */
export function fakeBroker() {
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

/** Wait for fn() to be true, polling every 20 ms. */
export const until = async (fn, ms = 3000) => {
  const t0 = Date.now();
  while (!fn()) {
    if (Date.now() - t0 > ms) throw new Error('timed out');
    await new Promise(r => setTimeout(r, 20));
  }
};
