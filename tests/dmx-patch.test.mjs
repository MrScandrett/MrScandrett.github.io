import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const D = require('../assets/js/lessons/dmx-patch.js');

test('footprints come from the fixture mode', () => {
  assert.equal(D.footprint('dimmer', '1ch'), 1);
  assert.equal(D.footprint('par', '3ch'), 3);
  assert.equal(D.footprint('par', '8ch'), 8);
  assert.equal(D.footprint('mover', 'extended'), 16);
  assert.equal(D.footprint('mover', 'nope'), 0);
  for (const [type, p] of Object.entries(D.PROFILES)) {
    for (const [mode, m] of Object.entries(p.modes)) {
      assert.ok(m.channels.length > 0, `${type}/${mode} has channels`);
      assert.match(m.name, new RegExp('^' + m.channels.length + ' ch'), `${type}/${mode} name states its footprint`);
    }
  }
});

test('the Pirates rig is a clean patch', () => {
  const r = D.analyze(D.PIRATES_RIG);
  assert.deepEqual(r.issues, []);
  assert.ok(r.ok);
  const used = D.PIRATES_RIG.reduce((n, f) => n + D.footprint(f.type, f.mode), 0);
  assert.equal(r.usage[1], used);
});

test('the broken rig shows exactly its four faults', () => {
  const r = D.analyze(D.BROKEN_RIG);
  const kinds = r.issues.map(i => i.kind).sort();
  assert.deepEqual(kinds, ['overlap', 'overlap', 'range', 'unpatched']);
  const movers = r.issues.find(i => i.kind === 'overlap' && i.fixtures.includes(14));
  assert.deepEqual(movers.channels, [110, 116]);
  const sides = r.issues.find(i => i.kind === 'overlap' && i.fixtures.includes(9));
  assert.deepEqual(sides.channels, [24, 25]);
  const off = r.issues.find(i => i.kind === 'range');
  assert.match(off.message, /509/, 'suggests the last start that fits');
  assert.equal(r.fixtures[15].status, 'warn');
  assert.equal(r.fixtures[0].status, 'ok');
  assert.ok(!r.ok);
});

test('identical fixtures on one address are a double, not a fault', () => {
  const r = D.analyze([
    { label: 'A', type: 'par', mode: '5ch', universe: 1, address: 21 },
    { label: 'B', type: 'par', mode: '5ch', universe: 1, address: 21 },
  ]);
  assert.equal(r.issues.length, 1);
  assert.equal(r.issues[0].kind, 'double');
  assert.ok(r.ok);
  const mixed = D.analyze([
    { label: 'A', type: 'par', mode: '5ch', universe: 1, address: 21 },
    { label: 'B', type: 'par', mode: '3ch', universe: 1, address: 21 },
  ]);
  assert.equal(mixed.issues[0].kind, 'overlap', 'a different mode on the same address is a fault');
});

test('universes are separate address spaces', () => {
  const r = D.analyze([
    { type: 'mover', mode: 'basic', universe: 1, address: 1 },
    { type: 'mover', mode: 'basic', universe: 2, address: 1 },
  ]);
  assert.deepEqual(r.issues, []);
});

test('addresses must be whole numbers from 1 to 512', () => {
  for (const address of [0, 513, 2.5, -4]) {
    const r = D.analyze([{ type: 'dimmer', mode: '1ch', universe: 1, address }]);
    assert.equal(r.issues[0].kind, 'range', `address ${address}`);
  }
  assert.deepEqual(D.analyze([{ type: 'dimmer', mode: '1ch', universe: 1, address: 512 }]).issues, []);
  assert.equal(D.analyze([{ type: 'par', mode: '3ch', universe: 1, address: 511 }]).issues[0].kind, 'range');
  assert.deepEqual(D.analyze([{ type: 'par', mode: '3ch', universe: 1, address: 510 }]).issues, []);
});

test('channel map and whoIs answer "what does channel N do?"', () => {
  assert.deepEqual(D.whoIs(D.PIRATES_RIG, 1, 106).map(o => o.param), ['Dimmer']);
  assert.deepEqual(D.whoIs(D.PIRATES_RIG, 1, 103).map(o => [o.index, o.param, o.offset]), [[13, 'Tilt', 3]]);
  assert.deepEqual(D.whoIs(D.PIRATES_RIG, 1, 300), []);
  const clash = D.whoIs(D.BROKEN_RIG, 1, 112).map(o => o.param);
  assert.deepEqual(clash, ['Prism', 'Tilt'], 'both movers answer 112');
});

test('autoPatch packs in order, aligns, and never splits a fixture', () => {
  const unpatched = D.PIRATES_RIG.map(f => ({ ...f, address: null }));
  const packed = D.autoPatch(unpatched);
  assert.equal(packed[0].address, 1);
  assert.equal(packed[6].address, 7, 'ERS follows the six dimmers');
  assert.ok(D.analyze(packed).ok);

  const tidy = D.autoPatch(unpatched, { align: 10 });
  assert.deepEqual(tidy.slice(0, 3).map(f => f.address), [1, 11, 21]);
  assert.ok(tidy.every(f => f.address % 10 === 1));
  assert.ok(D.analyze(tidy).ok);

  const movers = Array.from({ length: 40 }, () => ({ type: 'mover', mode: 'extended' }));
  const big = D.autoPatch(movers);
  assert.equal(big[31].universe, 1);
  assert.equal(big[31].address, 497);
  assert.equal(big[32].universe, 2, '33rd 16-ch mover starts universe 2');
  assert.equal(big[32].address, 1);
  assert.ok(D.analyze(big).ok);
  assert.equal(unpatched[0].address, null, 'autoPatch does not mutate its input');
});

test('nextFree finds the first gap that fits', () => {
  assert.equal(D.nextFree(D.PIRATES_RIG, 1, 1), 7);
  assert.equal(D.nextFree(D.PIRATES_RIG, 1, 16), 53);
  assert.equal(D.nextFree(D.PIRATES_RIG, 1, 16, 1, 10), 61);
  assert.equal(D.nextFree([{ type: 'dimmer', mode: '1ch', universe: 1, address: 512 }], 1, 2, 511), null);
});

test('DIP switches are binary place value', () => {
  assert.deepEqual(D.toDip(1), [true, false, false, false, false, false, false, false, false]);
  assert.deepEqual(D.toDip(37).map(Number), [1, 0, 1, 0, 0, 1, 0, 0, 0]);
  assert.equal(D.fromDip(D.toDip(37)), 37);
  for (let a = 1; a < 512; a++) assert.equal(D.fromDip(D.toDip(a)), a);
  assert.equal(D.toDip(0), null);
  assert.equal(D.toDip(512), null, 'nine switches top out at 511');
});

test('DMX refresh rate follows the slot count', () => {
  const full = D.frameTiming(512);
  assert.equal(full.us, 176 + 12 + 513 * 44);
  assert.ok(full.hz > 43 && full.hz < 45);
  const short = D.frameTiming(24);
  assert.ok(short.hz > 700, 'a short universe refreshes much faster');
  const min = D.frameTiming(512, { breakUs: 88, mabUs: 8 });
  assert.ok(min.hz > full.hz);
});

test('checkLine knows the data-line rules', () => {
  assert.ok(D.checkLine({ devices: 12, terminated: true, cable: 'dmx' }).ok);
  const kinds = D.checkLine({ devices: 40, terminated: false, cable: 'mic', split: 'y', lengthM: 400 }).issues.map(i => i.kind);
  assert.deepEqual(kinds.sort(), ['cable', 'length', 'loads', 'split', 'terminator']);
});
