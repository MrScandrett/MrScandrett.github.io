import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { rank, stem, typoClose } = require('../assets/js/search-rank.js');
const INDEX = JSON.parse(fs.readFileSync('assets/data/search-index.json', 'utf8'));
const titles = (q) => [...new Set(rank(INDEX, q).map((r) => r.item.title))];

test('a topic search returns only lessons about that topic', () => {
  const chess = titles('chess');
  assert.ok(chess.length >= 2 && chess.length <= 6, `chess gave ${chess.length}: ${chess.join(' | ')}`);
  assert.ok(chess.every((t) => /chess|minimax|game ai|go/i.test(t)), chess.join(' | '));
  // The old palette matched c…h…e…s…s scattered through these titles.
  for (const stray of ['Tycho Brahe — The Last Naked-Eye Astronomer', 'Leviticus: Holiness, Worship & Neighbor-Love']) {
    assert.ok(!chess.includes(stray), `${stray} is not a chess lesson`);
  }
});

test('titles that start with the query come first', () => {
  assert.match(titles('chess')[0], /^Chess/);
  assert.match(titles('tycho')[0], /^Tycho Brahe/);
  assert.match(titles('bach')[0], /Bach/);
});

test('every word must match, at a word start', () => {
  const both = titles('chess history');
  assert.ok(both.length >= 1);
  assert.ok(both.every((t) => !/Tycho/.test(t)));
  // "art" is the start of "artificial" but never the middle of "start" or "chart".
  const items = [
    { title: 'Start Here', keywords: [], description: 'Chart your course' },
    { title: 'Artificial Intelligence', keywords: [], description: '' }
  ];
  assert.deepEqual(rank(items, 'art').map((r) => r.item.title), ['Artificial Intelligence']);
});

test('plurals meet singulars, and a typo still lands when nothing else does', () => {
  assert.equal(stem('galaxies'), 'galaxy');
  assert.equal(stem('lessons'), 'lesson');
  assert.equal(stem('class'), 'class');
  assert.ok(typoClose('chss', 'chess', 1));
  assert.ok(typoClose('pythagorus', 'pythagoras', 2));
  assert.ok(!typoClose('chess', 'css', 1));
  assert.match(titles('chss')[0], /^Chess/);
  assert.ok(titles('chss').every((t) => !/CSS|Style Sheets/i.test(t)), 'chss is a typo for chess, not css');
  assert.match(titles('pythagorus')[0], /Pythagoras/);
});

test('blank queries match nothing; custom fields are honoured', () => {
  assert.deepEqual(rank(INDEX, '   '), []);
  const items = [{ name: 'Gears', tags: ['torque'] }, { name: 'Levers', tags: ['fulcrum'] }];
  const out = rank(items, 'fulcrum', { fields: { title: (x) => x.name, keywords: (x) => x.tags } });
  assert.deepEqual(out.map((r) => r.item.name), ['Levers']);
});
