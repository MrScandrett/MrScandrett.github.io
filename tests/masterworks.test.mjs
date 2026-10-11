// Structural checks for the graded masterworks library (assets/js/masterworks-data.js).
// Run: node --test tests/masterworks.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../assets/js/masterworks-data.js', import.meta.url), 'utf8');
const ctx = { globalThis: {} };
ctx.window = undefined;
vm.createContext(ctx);
vm.runInContext(src.replace(/typeof window !== 'undefined' \? window : globalThis/, 'globalThis'), ctx);
const D = ctx.globalThis.MASTERWORKS;

const TIERS = D.tiers.map(t => t.id);

test('every language has all four grade bands', () => {
  for (const code of D.order) {
    const have = new Set(D.passages[code].map(p => p.tier));
    for (const t of TIERS) assert.ok(have.has(t), `${code} is missing grade band ${t}`);
  }
});

test('passages are well formed', () => {
  const ids = new Set();
  for (const code of D.order) {
    assert.ok(D.langs[code], `lang info for ${code}`);
    for (const p of D.passages[code]) {
      assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
      ids.add(p.id);
      assert.ok(p.id.startsWith(code + '-'), `${p.id} should start with ${code}-`);
      for (const k of ['title', 'author', 'work', 'year', 'form', 'why', 'before', 'deeper']) {
        assert.ok(p[k] && p[k].length >= 2, `${p.id}.${k}`);
      }
      assert.ok(p.lines.length >= 2, `${p.id} lines`);
      for (const l of p.lines) {
        assert.equal(l.length, 3, `${p.id} line triple`);
        assert.ok(l[0] && l[2], `${p.id} empty original or meaning`);
      }
      assert.ok(p.gloss.length >= 3, `${p.id} gloss`);
      assert.equal(p.qs.length, 3, `${p.id} should have 3 questions`);
      for (const q of p.qs) {
        assert.ok(q.o.length >= 3 && q.a >= 0 && q.a < q.o.length, `${p.id} answer index`);
        assert.equal(new Set(q.o).size, q.o.length, `${p.id} duplicate options`);
        assert.ok(q.w.length > 5, `${p.id} explanation`);
      }
    }
  }
});

test('non-Latin-script languages carry a pronunciation line for every line', () => {
  for (const code of ['ru', 'ja', 'zh']) {
    for (const p of D.passages[code]) {
      for (const l of p.lines) assert.ok(l[1], `${p.id}: missing pronunciation for "${l[0].slice(0, 12)}…"`);
    }
  }
});

test('answer positions are not all the same', () => {
  const pos = new Set();
  for (const code of D.order) for (const p of D.passages[code]) for (const q of p.qs) pos.add(q.a);
  assert.ok(pos.size >= 2, 'correct answers should not always sit in the same slot');
});

test('every language page that exists mounts the reader', () => {
  for (const code of D.order) {
    const page = D.langs[code].page;
    if (!page) continue;
    const path = new URL(`../lessons/language-literature/${page}`, import.meta.url);
    assert.ok(existsSync(path), `${page} exists`);
    const html = readFileSync(path, 'utf8');
    assert.ok(html.includes(`data-masterworks="${code}"`), `${page} mounts data-masterworks="${code}"`);
    assert.ok(html.includes('masterworks.js') && html.includes('masterworks-data.js') && html.includes('masterworks.css'), `${page} loads assets`);
  }
});

test('the hub mounts the picker and links every language page', () => {
  const html = readFileSync(new URL('../lessons/language-literature/language-foundations-lab.html', import.meta.url), 'utf8');
  assert.ok(html.includes('data-masterworks="all"'));
  for (const code of D.order) { const p = D.langs[code].page; if (p) assert.ok(html.includes(`href="${p}"`), `hub links ${p}`); }
});
