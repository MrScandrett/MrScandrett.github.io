import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tool-rosetta.json'), 'utf8'));

function htmlFiles(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((d) => {
    const rel = path.join(dir, d.name);
    if (d.isDirectory()) return htmlFiles(rel);
    return d.name.endsWith('.html') ? [rel] : [];
  });
}

test('families only list known tools, and defaults are a subset', () => {
  for (const [name, fam] of Object.entries(data.families)) {
    for (const id of fam.tools) assert.ok(data.tools[id], `${name}: unknown tool ${id}`);
    for (const id of fam.defaults) assert.ok(fam.tools.includes(id), `${name}: default ${id} not in tools`);
  }
});

test('concept ids are unique and every cell is filled for its family', () => {
  const seen = new Set();
  for (const c of data.concepts) {
    assert.ok(!seen.has(c.id), `duplicate concept ${c.id}`);
    seen.add(c.id);
    const fam = data.families[c.family];
    assert.ok(fam, `${c.id}: unknown family ${c.family}`);
    assert.ok(c.idea && c.topic, `${c.id}: needs idea and topic`);
    for (const id of fam.tools) {
      assert.equal(typeof c.cells[id], 'string', `${c.id}: missing cell for ${id}`);
      assert.ok(c.cells[id].trim(), `${c.id}: empty cell for ${id}`);
    }
    for (const id of Object.keys(c.cells)) assert.ok(fam.tools.includes(id), `${c.id}: cell for ${id} outside its family`);
    for (const [id, text] of Object.entries(c.cells)) {
      assert.equal((text.match(/`/g) || []).length % 2, 0, `${c.id}/${id}: unbalanced backticks`);
    }
  }
});

test('every data-rosetta mount in a lesson names real concepts from one family', () => {
  const byId = new Map(data.concepts.map((c) => [c.id, c]));
  const files = htmlFiles('lessons');
  let mounts = 0;
  for (const file of files) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const found = [...html.matchAll(/data-rosetta="([^"]*)"/g)];
    if (!found.length) continue;
    assert.ok(html.includes('assets/js/tool-rosetta.js'), `${file} uses data-rosetta but never loads tool-rosetta.js`);
    for (const [, spec] of found) {
      const ids = spec.split(/[\s,]+/).filter(Boolean);
      for (const id of ids) assert.ok(byId.has(id), `${file}: unknown concept "${id}"`);
      const families = new Set(ids.map((id) => byId.get(id).family));
      assert.equal(families.size, 1, `${file}: "${spec}" mixes families`);
      mounts++;
    }
  }
  assert.ok(mounts > 0, 'expected at least one lesson to use the Rosetta');
});
