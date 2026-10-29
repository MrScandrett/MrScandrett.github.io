import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const data = JSON.parse(readFileSync(new URL('data/performer-guides.json', root), 'utf8'));
const pathway = readFileSync(new URL('assets/js/lessons/instrument-pathway.js', root), 'utf8');

// Every instrument on the shared pathway: [id, file].
const instruments = [...pathway.matchAll(/\{ id: '([a-z]+)', file: '([^']+)'/g)].map(m => [m[1], m[2]]);
const readers = data.readers.map(r => r.id);
const levels = data.levels.map(l => l.id);

test('every pathway instrument has a take-home page and its lesson shows it', () => {
  assert.ok(instruments.length >= 5);
  for (const [id, file] of instruments) {
    assert.ok(data.instruments[id], `${id} has no entry in data/performer-guides.json`);
    const html = readFileSync(new URL(`lessons/music/instruments/${file}`, root), 'utf8');
    assert.match(html, new RegExp(`data-performer-guide="${id}"`), `${file} has no take-home page host`);
    assert.match(html, /lessons\/performer-guide\.js/, `${file} doesn't load performer-guide.js`);
    assert.match(html, /lessons\/qr\.js/, `${file} doesn't load qr.js (the sheet's QR code)`);
    assert.match(html, /id="practice-ritual"/, `${file} has no #practice-ritual for the sheet to copy`);
  }
});

test('nine pages per instrument: every reader has words for every level', () => {
  assert.deepEqual(readers, ['child', 'teen', 'adult']);
  assert.deepEqual(levels, ['beginner', 'intermediate', 'advanced']);
  for (const l of data.levels) for (const r of readers) assert.ok(l.when[r], `${l.id} has no "when" for ${r}`);
  for (const [id, inst] of Object.entries(data.instruments)) {
    assert.ok(inst.name && inst.icon && inst.scalesTitle, `${id} needs a name, icon and scalesTitle`);
    for (const r of readers) {
      const t = inst[r];
      assert.equal(t.remember.length, 3, `${id}/${r}: three things to remember`);
      assert.ok(t.care, `${id}/${r}: care`);
      for (const l of levels) for (const row of data.rows) assert.ok(t[l]?.[row.id]?.trim(), `${id}/${r}/${l}: no ${row.id}`);
    }
  }
});

const NAMED = /^[A-G][♯♭]?$/;
function checkDiagram(where, kind, spec) {
  if (kind === 'keys') {
    assert.ok(spec.from < spec.to, `${where}: key range`);
    for (const n of spec.notes) assert.ok(n >= spec.from && n <= spec.to, `${where}: note ${n} is off the drawn keys`);
  } else if (kind === 'fret') {
    assert.equal(spec.frets.length, 6, `${where}: six strings`);
    for (const fs of spec.frets) for (const f of fs) assert.ok(f >= spec.lo && f <= spec.hi, `${where}: fret ${f} is off the drawn frets`);
  } else if (kind === 'chord') {
    assert.match(spec.frets, /^[x0-4]{6}$/, `${where}: frets`);
    assert.match(spec.fingers, /^[x0-4]{6}$/, `${where}: fingers`);
    [...spec.frets].forEach((f, i) => assert.equal(f === '0' || f === 'x', spec.fingers[i] === '0' || spec.fingers[i] === 'x', `${where}: string ${6 - i} fret/finger mismatch`));
  } else if (kind === 'board') {
    for (const [s, fs] of Object.entries(spec.strings)) {
      assert.ok('GDAE'.includes(s), `${where}: string ${s}`);
      for (const f of fs) assert.ok(f >= 0 && f <= 7, `${where}: semitone ${f}`);
    }
  } else if (kind === 'sax') {
    for (const n of spec.notes) assert.match(n, /^[A-G][♯♭]?:o?[01]{6}$/, `${where}: fingering ${n}`);
  } else if (kind === 'groove') {
    const n = spec.counts.split(' ').length;
    for (const [row, hits] of Object.entries(spec.rows)) assert.equal(hits.length, n, `${where}: ${row} has ${hits.length} cells, counts have ${n}`);
  } else if (kind === 'chips') {
    for (const n of spec.notes) assert.match(n, NAMED, `${where}: note ${n}`);
  } else if (kind === 'sticking') {
    assert.match(spec.pattern, /^[RL]+$/, `${where}: sticking`);
  } else assert.fail(`${where}: unknown diagram kind ${kind}`);
}

test('every level has drawable scales and shapes, songs and players', () => {
  for (const [id, inst] of Object.entries(data.instruments)) {
    for (const l of levels) {
      const m = inst[l], at = `${id}/${l}`;
      assert.ok(m.scales.length >= 1 && m.scales.length <= 2, `${at}: one or two scales`);
      m.scales.forEach((s, i) => { assert.ok(s.title, `${at}: scale ${i} title`); checkDiagram(`${at} scale ${s.title}`, s.kind, s); });
      assert.ok(m.shapes.title && m.shapes.items.length >= 2, `${at}: shapes`);
      m.shapes.items.forEach(item => { assert.ok(item.name, `${at}: shape name`); checkDiagram(`${at} shape ${item.name}`, m.shapes.kind, { ...m.shapes, ...item }); });
      assert.ok(m.songs.length >= 3, `${at}: at least three songs (a child's page shows three)`);
      m.songs.forEach(s => assert.ok(s.title && s.uses, `${at}: song needs title and uses`));
      assert.ok(m.listen.length >= 3, `${at}: at least three players`);
      m.listen.forEach(p => assert.ok(p.name && p.what && p.try, `${at}: player needs name, what and try`));
    }
  }
});
