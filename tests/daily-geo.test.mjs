import test from 'node:test';
import assert from 'node:assert/strict';
import { locations } from '../assets/js/daily-geo-locations.mjs';
import { OFFICIAL_PANO, streetViewEmbed, locationForDay } from '../assets/js/daily-geo.mjs';

const R = 6371008.8;
const metres = ([lat1, lng1], [lat2, lng2]) => {
  const rad = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lng2 - lng1) * rad / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

test('every view is official Google Street View, never a user photo sphere', () => {
  for (const l of locations) {
    assert.ok(l.view, `${l.name}: needs a view`);
    assert.match(l.view.pano, OFFICIAL_PANO, `${l.name}: ${l.view.pano} is not an official pano id`);
    assert.doesNotMatch(l.view.pano, /^(CAoS|CIHM|AF1Qip)/, `${l.name}: user photo sphere`);
    assert.equal(l.src, undefined, `${l.name}: pasted embed links can carry photo spheres; use view`);
  }
});

test('views are complete, unique and near their landmark', () => {
  assert.equal(new Set(locations.map((l) => l.name)).size, locations.length, 'duplicate name');
  assert.equal(new Set(locations.map((l) => l.view.pano)).size, locations.length, 'duplicate pano');
  for (const l of locations) {
    const { at, heading, pitch, imagery } = l.view;
    assert.ok(at.every(Number.isFinite), l.name);
    assert.ok(heading >= 0 && heading < 360, `${l.name}: heading`);
    assert.ok(pitch >= -90 && pitch <= 90, `${l.name}: pitch`);
    assert.match(imagery, /^\d{4}-\d{2}$/, `${l.name}: imagery date`);
    assert.ok(l.clue && l.clue.length > 20, `${l.name}: clue`);
    // The guess is scored against `point`; the camera may stand back for a view (the Golden Gate is
    // seen from the Marin headlands) but must be the same place.
    const d = metres(at, [l.point[1], l.point[0]]);
    assert.ok(d < 3000, `${l.name}: view is ${Math.round(d)} m from the landmark`);
  }
});

test('embed URL is built from the view and refuses anything else', () => {
  const url = streetViewEmbed(locations[0].view);
  assert.ok(url.startsWith('https://www.google.com/maps/embed?pb='));
  assert.ok(url.includes(`!1s${locations[0].view.pano}!`));
  assert.throws(() => streetViewEmbed({ pano: 'CAoSF0NJSE0wb2dLRUlDQWdJRDRxdGpYM1FF', at: [0, 0] }));
});

test('rotation is deterministic and covers every location', () => {
  assert.equal(locationForDay('2026-11-17'), locations[0]);
  assert.equal(locationForDay('2026-11-18'), locations[1]);
  const seen = new Set();
  const day = new Date(Date.UTC(2026, 10, 17));
  for (let i = 0; i < locations.length; i++) {
    seen.add(locationForDay(new Date(day.getTime() + i * 86400000).toISOString().slice(0, 10)).name);
  }
  assert.equal(seen.size, locations.length);
});
