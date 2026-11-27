// Brick Rally's view of the shared same-WiFi networking (assets/js/lan-play/net.mjs): its own
// channels, "Racer" as the fallback name, and lobby beacons that carry the track and whether a
// race is running.

import * as Lan from '../lan-play/net.mjs';

export { BROKERS, relayFromUrl, ICE, CODE_ALPHABET, randomId, makeCode, cleanCode, hashKey, networkOf, publicIpsFromCandidates, findNeighborhood, PeerLink, HostSession, GuestSession } from '../lan-play/net.mjs';

export const APP = 'brickrally';
export const PREFIX = Lan.prefixFor(APP);

export const cleanName = (s) => Lan.cleanName(s, 'Racer');

export class Bus extends Lan.Bus {
  constructor(opts = {}) { super({ app: APP, ...opts }); }
}

export function watchLobbies(bus, neighborhoods, onChange) {
  return Lan.watchLobbies(bus, neighborhoods, onChange, {
    clean: (m) => ({ track: String(m.track || '').slice(0, 30), phase: m.phase === 'race' ? 'race' : 'lobby' }),
  });
}
