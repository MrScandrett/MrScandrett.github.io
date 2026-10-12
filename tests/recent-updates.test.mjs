import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { collectEntries, renderHomepageEntries, renderFilters, replaceRegion, archivePage, validDate } from '../scripts/build-recent-updates.mjs';

test('generated homepage and archive match current sources and cached first-added dates', async () => {
  const entries = await collectEntries({ check: true }); // also validates every date, target, and thumbnail
  const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(replaceRegion(index, 'list', renderHomepageEntries(entries)), index, 'Homepage list is stale; run npm run build:updates');
  assert.equal(replaceRegion(index, 'filters', renderFilters()), index, 'Filter markup is stale');
  assert.equal(fs.readFileSync(new URL('../updates.html', import.meta.url), 'utf8'), archivePage(entries), 'Archive is stale');
  assert.equal((renderHomepageEntries(entries).match(/<li[^>]+(?<!hidden)>/g) || []).length, 6);
});
test('dates must be real calendar dates', () => {
  for (const date of ['2026-10-12', '2024-02-29']) assert.ok(validDate(date));
  for (const date of ['2026-02-30', '2026-13-01', '', undefined, 'yesterday']) assert.equal(validDate(date), false);
});
test('homepage retains six newest items for each filter and escapes source text', () => {
  const entries = Array.from({length: 30}, (_, i) => ({type: ['lesson','updated','game'][i % 3], date: '2026-10-12', url: 'index.html', title: '<unsafe>', what: 'a & b'}));
  const html = renderHomepageEntries(entries);
  assert.equal((html.match(/<li /g) || []).length, 18);
  assert.ok(html.includes('&lt;unsafe&gt;'));
  assert.ok(!html.includes('<unsafe>'));
});
