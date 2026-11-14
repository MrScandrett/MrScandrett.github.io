import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const catalog = JSON.parse(await readFile(new URL('../data/composer-workspaces.json', import.meta.url)));
const library = JSON.parse(await readFile(new URL('../data/score-library.json', import.meta.url)));
for (const [composer, entry] of Object.entries(catalog)) {
  test(`${composer}: every selection belongs to exactly one ordered collection`, () => {
    assert.ok(entry.groups.length);
    assert.equal(new Set(entry.groups.map(g => g.key)).size, entry.groups.length);
    assert.ok(entry.groups.every(g => g.label && g.hint && g.scores.length && g.key !== 'all'));
    const grouped = entry.groups.flatMap(g => g.scores);
    assert.equal(new Set(grouped).size, grouped.length);
    assert.deepEqual(grouped, entry.scores);
    for (const id of grouped) assert.ok(library.scores[id], `Missing score: ${id}`);
    for (const group of entry.groups) {
      for (const id of group.scores.filter(id => id.endsWith('-classroom-study'))) {
        assert.match(group.label, /classroom studies/i);
        assert.match(group.hint, /not a composition/i);
      }
    }
  });
}
test('Mozart K. 331 preserves theme, variations and later movements together', () => {
  assert.deepEqual(catalog.mozart.groups.find(g => g.key === 'k331').scores, [
    'mozart-k331-theme', ...Array.from({length: 6}, (_, i) => `mozart-k331-variation-${i + 1}`),
    'mozart-k331-menuetto', 'mozart-turkish-march'
  ]);
});
