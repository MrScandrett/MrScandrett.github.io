import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import Module from '../assets/vendor/manifold/manifold.js';
import { createEngine, resolveParams } from '../assets/js/forge/engine.mjs';
import { PARTS } from '../assets/js/forge/parts.mjs';
import { CURA_TARGETS, bedContact, curaSettings, writeCuraProfile } from '../assets/js/forge/cura-profile.mjs';

const font = JSON.parse(await readFile(new URL('../assets/vendor/fonts/droid-sans-bold.typeface.json', import.meta.url), 'utf8'));
const engine = await createEngine(Module, { font });
globalThis.FidgetRings = createRequire(import.meta.url)('../assets/js/lessons/fidget-rings.js');

/* Every key written must be a real Cura 5.10 setting (checked against
   fdmprinter.def.json) with a value of the right kind. */
const KNOWN = {
  layer_height: 'float', layer_height_0: 'float', wall_line_count: 'int', top_bottom_thickness: 'float',
  infill_sparse_density: 'float', support_enable: 'bool', support_type: ['buildplate', 'everywhere'],
  support_angle: 'float', adhesion_type: ['skirt', 'brim', 'raft', 'none'], brim_width: 'float',
  brim_location: ['outside', 'inside', 'everywhere'], skirt_line_count: 'int', print_sequence: ['all_at_once', 'one_at_a_time'],
  magic_spiralize: 'bool', xy_offset: 'float', xy_offset_layer_0: 'float', retraction_enable: 'bool', cool_fan_enabled: 'bool',
};

/* Reads the stored (uncompressed) ZIP writeZip makes. */
function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = [];
  let o = 0;
  while (view.getUint32(o, true) === 0x04034b50) {
    assert.equal(view.getUint16(o + 8, true), 0, 'stored, not deflated');
    const size = view.getUint32(o + 18, true), nameLen = view.getUint16(o + 26, true), extra = view.getUint16(o + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(o + 30, o + 30 + nameLen));
    const data = new TextDecoder().decode(bytes.subarray(o + 30 + nameLen + extra, o + 30 + nameLen + extra + size));
    files.push({ name, data });
    o += 30 + nameLen + extra + size;
  }
  return files;
}

function parseIni(text) {
  const out = {};
  let section = null;
  for (const line of text.split('\n')) {
    const head = line.match(/^\[(\w+)\]$/);
    if (head) { section = out[head[1]] = {}; continue; }
    const kv = line.match(/^(\w+) = (.*)$/);
    if (kv) { assert.ok(section, `"${line}" before any section`); section[kv[1]] = kv[2]; }
    else assert.equal(line.trim(), '', `unexpected line "${line}"`);
  }
  return out;
}

function checkValue(key, raw) {
  const kind = KNOWN[key];
  assert.ok(kind, `${key} is not a known Cura setting`);
  if (Array.isArray(kind)) assert.ok(kind.includes(raw), `${key} = ${raw}`);
  else if (kind === 'bool') assert.match(raw, /^(True|False)$/, key);
  else if (kind === 'int') assert.match(raw, /^-?\d+$/, key);
  else assert.ok(Number.isFinite(Number(raw)), `${key} = ${raw}`);
}

for (const part of PARTS) {
  test(`${part.name}: Cura profile Cura 5.10 will import`, () => {
    const r = engine.run(part, resolveParams(part, {}));
    assert.equal(r.error, undefined, r.error);
    for (const target of CURA_TARGETS) {
      const { bytes, values, reasons } = writeCuraProfile({ name: part.name, result: r, settings: { layer: 0.2, nozzle: 0.4 }, group: part.group, target: target.id });
      const files = unzip(bytes);
      assert.equal(files.length, 1, 'one global quality_changes container');
      const ini = parseIni(files[0].data);
      assert.equal(ini.general.version, '4');
      assert.equal(ini.general.definition, 'fdmprinter');
      assert.ok(ini.general.name.length > 0);
      assert.equal(ini.metadata.type, 'quality_changes');
      assert.equal(ini.metadata.quality_type, target.quality);
      assert.equal(ini.metadata.position, undefined, 'the global container has no extruder position');
      for (const [k, v] of Object.entries(ini.values)) checkValue(k, v);
      assert.equal(ini.values.layer_height, '0.2');
      assert.equal(ini.values.support_enable, r.verdicts.some((v) => v.tag === 'NEEDS SUPPORTS') ? 'True' : 'False');
      assert.equal(ini.values.print_sequence, 'all_at_once');
      assert.ok(Object.keys(values).length === Object.keys(ini.values).length && reasons.length >= 5);
    }
  });
}

const box = (w, d, h) => {
  // closed box on the bed, centred, as triangle soup
  const x = [-w / 2, w / 2], y = [-d / 2, d / 2], z = [0, h];
  const v = (i, j, k) => [x[i], y[j], z[k]];
  const quads = [
    [v(0, 0, 0), v(0, 1, 0), v(1, 1, 0), v(1, 0, 0)], [v(0, 0, 1), v(1, 0, 1), v(1, 1, 1), v(0, 1, 1)],
    [v(0, 0, 0), v(1, 0, 0), v(1, 0, 1), v(0, 0, 1)], [v(0, 1, 0), v(0, 1, 1), v(1, 1, 1), v(1, 1, 0)],
    [v(0, 0, 0), v(0, 0, 1), v(0, 1, 1), v(0, 1, 0)], [v(1, 0, 0), v(1, 1, 0), v(1, 1, 1), v(1, 0, 1)],
  ];
  return new Float32Array(quads.flatMap(([a, b, c, e]) => [...a, ...b, ...c, ...a, ...c, ...e]));
};

test('bed contact counts only the faces on the bed', () => {
  assert.ok(Math.abs(bedContact(box(20, 10, 5)) - 200) < 1e-6);
});

test('tall, narrow parts get a brim; flat ones a skirt; layers follow Forge', () => {
  const flat = curaSettings({ result: { bodies: [{ name: 'Plate', positions: box(60, 40, 4) }], verdicts: [], demo: null }, settings: { layer: 0.3 }, group: 'Everyday' });
  assert.equal(flat.values.adhesion_type, 'skirt');
  assert.equal(flat.values.layer_height, 0.3);
  assert.equal(flat.values.layer_height_0, 0.3);
  assert.equal(flat.values.top_bottom_thickness, 0.9);
  assert.equal(flat.values.xy_offset_layer_0, 0);
  const tower = curaSettings({ result: { bodies: [{ name: 'Pin', positions: box(8, 8, 40) }], verdicts: [{ tag: 'NEEDS SUPPORTS' }], demo: {} }, settings: { layer: 0.1 }, group: 'Mechanisms' });
  assert.equal(tower.values.adhesion_type, 'brim');
  assert.equal(tower.values.layer_height_0, 0.2);
  assert.equal(tower.values.support_enable, true);
  assert.equal(tower.values.wall_line_count, 4);
  assert.equal(tower.values.xy_offset_layer_0, -0.1);
});
