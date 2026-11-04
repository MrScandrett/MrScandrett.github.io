import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';

const require = createRequire(import.meta.url);
const FT = require('../assets/js/family-tree.js');

const leaf = (label, extra = {}) => ({ label, text: label, ...extra });
const sample = () => [{
  id: 'root', label: 'Root', text: 'Root', group: 'A', color: '#111', children: [
    { label: 'Left', text: 'Left', children: [leaf('L1'), leaf('L2'), leaf('L3')] },
    { label: 'Mid', text: 'Mid', partner: 'Spouse', children: [leaf('M1')] },
    { label: 'Right', text: 'Right', group: 'B', also: ['L2'] }
  ]
}];

const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const noOverlaps = (lay) => {
  const rects = lay.nodes.map((n) => lay.rects[n.id]);
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) assert.ok(!overlap(rects[i], rects[j]), `${lay.nodes[i].id} overlaps ${lay.nodes[j].id}`);
};

test('model: ids stay unique, groups and colours inherit down the tree', () => {
  const m = FT.buildModel([{ label: 'A', id: 'x', group: 'G', color: '#abc', children: [{ label: 'B', id: 'x', children: [leaf('C')] }] }]);
  assert.deepEqual(m.nodes.map((n) => n.id), ['x', 'x-2', 'n2']);
  assert.deepEqual(m.nodes.map((n) => n.group), ['G', 'G', 'G']);
  assert.deepEqual(m.nodes.map((n) => n.color), ['#abc', '#abc', '#abc']);
  assert.deepEqual(m.groups, ['G']);
});

test('model: groups without a colour get distinct palette colours; bad also-from ids are dropped', () => {
  const m = FT.buildModel([{ label: 'A', group: 'one', also: ['nope'], children: [{ label: 'B', group: 'two', also: ['n0', 'n1'] }] }]);
  assert.notEqual(m.groupColor.one, m.groupColor.two);
  assert.deepEqual(m.nodes[0].also, []);
  assert.deepEqual(m.nodes[1].also, ['n0']);
});

test('model: label falls back to the text before the first dash, colon or full stop', () => {
  const m = FT.buildModel([{ text: 'Noah — survived the flood' }, { text: 'Shem: eldest son' }]);
  assert.equal(m.nodes[0].label, 'Noah');
  assert.equal(m.nodes[1].label, 'Shem');
});

test('lineage helpers', () => {
  const m = FT.buildModel(sample());
  const l2 = m.nodes.find((n) => n.label === 'L2');
  assert.deepEqual(FT.ancestors(l2).map((n) => n.label), ['Root', 'Left']);
  assert.deepEqual(FT.descendants(m.byId.root).length, m.nodes.length - 1);
});

test('layout (top-down): one row per generation, no overlaps, parents centred over children', () => {
  const m = FT.buildModel(sample());
  const lay = FT.layout(m, { flow: 'down' });
  noOverlaps(lay);
  m.nodes.forEach((n) => {
    const row = m.nodes.filter((x) => x.depth === n.depth);
    row.forEach((x) => assert.equal(lay.rects[x.id].y, lay.rects[n.id].y));
  });
  const mid = (id) => lay.rects[id].x + lay.rects[id].w / 2;
  const left = m.nodes.find((n) => n.label === 'Left');
  assert.ok(Math.abs(mid(left.id) - (mid(left.children[0].id) + mid(left.children[2].id)) / 2) < 0.6);
  const root = m.byId.root;
  assert.ok(Math.abs(mid(root.id) - (mid(root.children[0].id) + mid(root.children[2].id)) / 2) < 0.6);
  assert.equal(lay.gens.length, 3);
  assert.ok(lay.width > 0 && lay.height > 0);
  lay.nodes.forEach((n) => { const r = lay.rects[n.id]; assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= lay.width && r.y + r.h <= lay.height); });
});

test('layout: a couple is one wide card with its children hanging from the middle', () => {
  const m = FT.buildModel(sample());
  const lay = FT.layout(m, { flow: 'down' });
  const mid = m.nodes.find((n) => n.label === 'Mid');
  assert.ok(lay.rects[mid.id].w > lay.rects[m.nodes.find((n) => n.label === 'Left').id].w * 1.9);
  const link = lay.links.find((l) => l.to === mid.children[0].id);
  const cx = lay.rects[mid.id].x + lay.rects[mid.id].w / 2;
  assert.ok(link.d.startsWith('M' + Math.round(cx * 10) / 10 + ' '));
});

test('layout: a wide couple with one child never overlaps its neighbour', () => {
  const m = FT.buildModel([{ label: 'R', children: [{ label: 'A', partner: 'Aa', children: [leaf('a1')] }, { label: 'B', partner: 'Bb', children: [leaf('b1')] }] }]);
  noOverlaps(FT.layout(m, { flow: 'down' }));
  noOverlaps(FT.layout(m, { flow: 'right' }));
});

test('layout (sideways): generations become columns', () => {
  const m = FT.buildModel(sample());
  const lay = FT.layout(m, { flow: 'right' });
  noOverlaps(lay);
  m.nodes.forEach((n) => {
    const col = m.nodes.filter((x) => x.depth === n.depth);
    col.forEach((x) => assert.equal(lay.rects[x.id].x, lay.rects[n.id].x));
  });
  const xs = [0, 1, 2].map((d) => lay.rects[m.nodes.find((n) => n.depth === d).id].x);
  assert.ok(xs[0] < xs[1] && xs[1] < xs[2]);
});

test('layout: folding a branch hides its descendants and tightens the tree', () => {
  const m = FT.buildModel(sample());
  const open = FT.layout(m, { flow: 'down' });
  const left = m.nodes.find((n) => n.label === 'Left');
  left.collapsed = true;
  const folded = FT.layout(m, { flow: 'down' });
  left.children.forEach((c) => assert.equal(folded.rects[c.id], undefined));
  assert.ok(folded.width < open.width);
  assert.ok(!folded.links.some((l) => left.children.some((c) => c.id === l.to)));
  noOverlaps(folded);
});

test('layout: link kinds (child, uncertain, also)', () => {
  const m = FT.buildModel([{ label: 'R', children: [{ label: 'A', link: 'uncertain', children: [leaf('A1', { id: 'a1' })] }, { label: 'B', also: ['a1'] }] }]);
  const kinds = FT.layout(m, { flow: 'down' }).links.map((l) => l.kind).sort();
  assert.deepEqual(kinds, ['also', 'child', 'child', 'uncertain']);
});

test('layout: several roots sit side by side', () => {
  const m = FT.buildModel([leaf('One'), leaf('Two')]);
  const lay = FT.layout(m, { flow: 'down' });
  noOverlaps(lay);
  assert.equal(lay.rects[m.nodes[0].id].y, lay.rects[m.nodes[1].id].y);
});

// ---------------------------------------------------------------- lessons

// A tiny mirror of readItem() over cheerio so lesson markup can be checked without a browser.
function plain($, li) {
  const $li = $(li);
  const sub = $li.children('ul, ol').first();
  const clone = $li.clone();
  clone.children('ul, ol').remove();
  const strong = clone.find('strong, b').first();
  return {
    id: $li.attr('id') || '',
    label: $li.attr('data-label') || strong.text(),
    text: clone.text(),
    when: $li.attr('data-when') || '',
    group: $li.attr('data-group') || '',
    color: $li.attr('data-color') || '',
    partner: $li.attr('data-partner') || '',
    link: $li.attr('data-link') || '',
    also: ($li.attr('data-also-from') || '').split(/[\s,]+/).filter(Boolean),
    children: sub.length ? sub.children('li').toArray().map((c) => plain($, c)) : []
  };
}

test('lesson family trees are well-formed: unique ids, resolvable data-also-from, real labels', () => {
  const found = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.html')) {
        const html = readFileSync(p, 'utf8');
        if (!html.includes('data-family-tree')) continue;
        const $ = cheerio.load(html);
        $('[data-family-tree]').each((i, node) => {
          const list = $(node).is('ul, ol') ? $(node) : $(node).find('ul, ol').first();
          const roots = list.children('li').toArray().map((li) => plain($, li));
          const raw = [];
          (function collect(items) { items.forEach((it) => { raw.push(it); collect(it.children); }); })(roots);
          const ids = raw.map((n) => n.id).filter(Boolean);
          assert.equal(new Set(ids).size, ids.length, `${p}: duplicate ids`);
          raw.forEach((n) => {
            n.also.forEach((id) => assert.ok(ids.includes(id), `${p}: data-also-from="${id}" points at nothing`));
            if (n.link) assert.equal(n.link, 'uncertain', `${p}: unknown data-link "${n.link}"`);
          });
          const m = FT.buildModel(roots);
          m.nodes.forEach((n) => assert.ok(n.label && n.label.length <= 60, `${p}: card needs a short label (data-label): "${n.label}"`));
          const lay = FT.layout(m, { flow: 'down' });
          noOverlaps(lay);
          noOverlaps(FT.layout(m, { flow: 'right' }));
          found.push({ p, nodes: m.nodes.length, depth: lay.gens.length });
        });
      }
    }
  };
  walk(new URL('../lessons', import.meta.url).pathname);
  assert.ok(found.length >= 2, 'expected the Genesis 10 and Pleistocene trees');
  assert.ok(found.every((f) => f.nodes >= 5));
});
