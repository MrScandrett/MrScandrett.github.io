import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const M = require('../assets/js/lessons/mechanical-drives-core.js');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const settings = (d) => {
  // every slider end and every choice, one at a time, from the defaults
  const out = [{}];
  for (const p of d.params) {
    const values = p.type === 'choice' ? p.options.map((o) => o[0]) : [p.min, p.max];
    for (const v of values) out.push({ [p.key]: v });
  }
  return out;
};

test('every drive has the data the explorer and picker need', () => {
  assert.equal(M.DRIVES.length, 18);
  const ids = new Set();
  for (const d of M.DRIVES) {
    assert.ok(!ids.has(d.id), 'duplicate ' + d.id); ids.add(d.id);
    assert.ok(M.FAMILIES.some((f) => f.id === d.family), d.id + ' family');
    for (const k of ['name', 'motion', 'summary', 'seen', 'watch', 'backlash']) assert.ok(d[k], `${d.id} ${k}`);
    assert.ok(d.eff[0] < d.eff[1] && d.eff[1] <= 1, d.id + ' eff range');
    for (const k of ['robot', 'cnc', 'vehicle', 'basics', 'torque', 'precision', 'cost', 'locking']) {
      assert.ok([0, 1, 2, 3].includes(d.score[k]), `${d.id} score.${k}`);
    }
    for (const p of d.params) {
      if (p.type === 'choice') assert.ok(p.options.some((o) => o[0] === p.value), `${d.id}.${p.key} default`);
      else assert.ok(p.value >= p.min && p.value <= p.max && (p.value - p.min) % p.step === 0, `${d.id}.${p.key} default`);
    }
  }
});

test('efficiency stays inside each drive\'s stated range at every slider end', () => {
  for (const d of M.DRIVES) {
    for (const p of settings(d)) {
      const g = M.geometry(d.id, p);
      assert.ok(g.eff >= d.eff[0] - 1e-9 && g.eff <= d.eff[1] + 1e-9, `${d.id} ${JSON.stringify(p)} eff ${g.eff}`);
    }
  }
});

test('power is conserved: out = in × efficiency, the rest is heat', () => {
  for (const d of M.DRIVES) {
    for (const p of settings(d)) {
      for (const torque of [0.5, 3, 20]) {
        const r = M.compute(d.id, p, { rpm: 900, torque });
        const shaftPower = r.output === 'rotary' ? r.outTorque * r.outRpm * M.TAU / 60 : r.force * r.speed / 1000;
        close(shaftPower, r.powerOut, 1e-6 * r.powerIn + 1e-9);
        close(r.powerIn - r.powerOut, r.heat, 1e-9);
        assert.ok(r.heat >= 0, d.id + ' heat');
      }
    }
  }
});

test('gear ratios come from tooth counts', () => {
  close(M.geometry('spur', { driven: 36 }).ratio, 3);
  close(M.geometry('worm', { teeth: 40, starts: 1 }).ratio, 40);
  close(M.geometry('worm', { teeth: 40, starts: 4 }).ratio, 10);
  close(M.planetaryRatio('ring', 18, 72), 5);
  close(M.planetaryRatio('sun', 18, 72), 1.25);
  close(M.planetaryRatio('carrier', 18, 72), -4);
  close(M.geometry('harmonic', { flex: 200 }).ratio, 100);
  close(M.geometry('cycloidal', { lobes: 15 }).ratio, 15);
  close(M.geometry('chain', { t2: 33 }).ratio, 3);
  assert.equal(M.geometry('spur').reverse, true);
  assert.equal(M.geometry('chain').reverse, false);
});

test('every planetary sun choice assembles with three equal planets', () => {
  const p = M.get('planetary').params.find((x) => x.key === 'sun');
  for (let sun = p.min; sun <= p.max; sun += p.step) {
    assert.equal((72 - sun) % 2, 0, 'planet teeth must be whole');
    assert.equal((72 + sun) % 3, 0, 'three planets must fit evenly');
  }
});

test('screws: a fine thread self-locks, a coarse one or a ball screw back-drives', () => {
  assert.equal(M.holdTest('leadscrew', { lead: 2 }).holds, true);
  assert.equal(M.holdTest('leadscrew', { lead: 12 }).holds, false);
  assert.equal(M.holdTest('worm', { starts: 1 }).holds, true);
  assert.equal(M.holdTest('worm', { starts: 4 }).holds, false);
  for (const id of ['ballscrew', 'rollerscrew']) {
    const p = M.get(id).params[0];
    for (let lead = p.min; lead <= p.max; lead++) assert.equal(M.holdTest(id, { lead }).holds, false, `${id} lead ${lead}`);
  }
  // a square thread that self-locks is at most 50 % efficient at the same friction (λ ≤ ρ ⇒ η ≤ ½)
  for (let lead = 1; lead <= 12; lead++) {
    const g = M.geometry('leadscrew', { lead });
    if (g.backEff === 0) assert.ok(M.screwEfficiency(lead, 10, 0.20) <= 0.5 + 1e-9, `lead ${lead}`);
    else assert.ok(M.screwEfficiency(lead, 10, 0.20) > 0.5, `lead ${lead}`);
  }
  // rotary-to-linear: force × travel per turn = 2π × torque × efficiency
  const r = M.compute('ballscrew', { lead: 5 }, { rpm: 600, torque: 2 });
  close(r.force * 0.005, M.TAU * 2 * r.eff, 1e-9);
  close(r.speed, 50);
});

test('friction drives slip when overloaded, toothed ones do not', () => {
  const ok = M.compute('vbelt', { tension: 12 }, { rpm: 1000, torque: 5 });
  const over = M.compute('vbelt', { tension: 6 }, { rpm: 1000, torque: 15 });
  assert.equal(ok.slipping, false);
  assert.ok(ok.slip > 0, 'V-belts creep even when not overloaded');
  assert.equal(over.slipping, true);
  assert.ok(over.outRpm < ok.outRpm * 0.8);
  assert.equal(M.compute('chain', {}, { rpm: 1000, torque: 50 }).slipping, false);
  assert.equal(M.compute('timing', {}, { rpm: 1000, torque: 50 }).slip, 0);
});

test('the cone CVT ratio is stepless and symmetric about the middle', () => {
  close(M.geometry('traction', { pos: 50 }).ratio, 1);
  close(M.geometry('traction', { pos: 0 }).ratio, 3);
  close(M.geometry('traction', { pos: 100 }).ratio, 1 / 3);
  close(M.geometry('traction', { pos: 25 }).ratio * M.geometry('traction', { pos: 75 }).ratio, 1);
});

test('hydraulic force is Pascal: pressure × piston area', () => {
  const small = M.compute('hydraulic', { area: 10 }, { rpm: 600, torque: 2 });
  const big = M.compute('hydraulic', { area: 40 }, { rpm: 600, torque: 2 });
  close(big.force / small.force, 4, 1e-9);
  close(small.speed / big.speed, 4, 1e-9);
});

test('the picker answers sensibly for the classic cases', () => {
  for (const [g] of M.GOALS) {
    for (const [t] of M.TRAITS) {
      const recs = M.recommend(g, t);
      assert.ok(recs.length >= 2, `${g}/${t} has picks`);
      for (const r of recs) {
        assert.ok(M.get(r.id).score[t] >= 1, `${g}/${t} suggests ${r.id}`);
        assert.ok(r.reason && r.watch);
      }
    }
  }
  const top = (g, t) => M.recommend(g, t).map((r) => r.id);
  assert.equal(top('cnc', 'precision')[0], 'ballscrew');
  assert.ok(top('robot', 'precision').includes('harmonic'));
  for (const [g] of M.GOALS) {
    // only drives that really hold a load come back for "self-locking"
    for (const id of top(g, 'locking')) assert.ok(['worm', 'leadscrew', 'hydraulic'].includes(id), `${g} locking ${id}`);
  }
  assert.ok(top('vehicle', 'cost').includes('chain'));
});

test('the lesson page offers every drive in the explorer', () => {
  const html = readFileSync(new URL('../lessons/engineering/mechanical-and-civil-design/mechanical-drives.html', import.meta.url), 'utf8');
  assert.match(html, /data-md-explorer/);
  assert.match(html, /mechanical-drives-core\.js/);
  for (const d of M.DRIVES) assert.ok(html.includes(d.name.split(' (')[0]), `the page mentions ${d.name}`);
});
