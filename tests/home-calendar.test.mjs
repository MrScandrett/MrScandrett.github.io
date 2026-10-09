import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { easter, seasonMoments, nthWeekday, lastWeekday, computedItems, itemsOn, ordinal, noClassFor } from '../assets/js/home-calendar.mjs';

const data = JSON.parse(readFileSync(new URL('../data/calendar-events.json', import.meta.url), 'utf8'));
const md = (d) => `${d.getMonth() + 1}-${d.getDate()}`;

test('Easter matches published dates', () => {
  const known = { 2024: '3-31', 2025: '4-20', 2026: '4-5', 2027: '3-28', 2028: '4-16' };
  for (const [y, v] of Object.entries(known)) assert.equal(md(easter(+y)), v, y);
});

test('equinoxes and solstices land on the right UTC minute (±5 min)', () => {
  const known = {
    2024: ['2024-03-20T03:06Z', '2024-06-20T20:51Z', '2024-09-22T12:44Z', '2024-12-21T09:21Z'],
    2026: ['2026-03-20T14:46Z', '2026-06-21T08:24Z', '2026-09-23T00:05Z', '2026-12-21T20:50Z']
  };
  for (const [y, list] of Object.entries(known)) {
    seasonMoments(+y).forEach((s, i) => {
      const diff = Math.abs(s.date - new Date(list[i])) / 60000;
      assert.ok(diff <= 5, `${y} ${s.name} off by ${diff.toFixed(1)} min`);
    });
  }
});

test('floating holidays', () => {
  assert.equal(nthWeekday(2026, 10, 4, 4), 26);   // Thanksgiving 2026
  assert.equal(nthWeekday(2026, 0, 1, 3), 19);    // MLK 2026
  assert.equal(lastWeekday(2026, 4, 1), 25);      // Memorial Day 2026
  assert.equal(nthWeekday(2026, 8, 1, 1), 7);     // Labor Day 2026
  assert.equal(nthWeekday(2026, 9, 2, 2), 13);    // Ada Lovelace Day 2026
});

test('Hebrew feasts via Intl', () => {
  const feasts = (y) => Object.fromEntries(computedItems(y).filter((i) => ['Rosh Hashanah', 'Yom Kippur', 'Passover', 'Hanukkah begins'].includes(i.title)).map((i) => [i.title, `${i.m0 + 1}-${i.d}`]));
  assert.deepEqual(feasts(2026), { Passover: '4-2', 'Rosh Hashanah': '9-12', 'Yom Kippur': '9-21', 'Hanukkah begins': '12-5' });
});

test('anniversaries are computed from the viewed year', () => {
  const july4 = itemsOn(new Date(2026, 6, 4), data).find((i) => i.title === 'Independence Day');
  assert.equal(july4.years, 250);
  assert.equal(july4.milestone, true);
  const tesla = itemsOn(new Date(2026, 6, 10), data).find((i) => i.title === 'Nikola Tesla');
  assert.equal(tesla.when, '170th birthday · born 1856');
  assert.equal(ordinal(111), '111th');
  assert.equal(ordinal(22), '22nd');
});

test('data file is well formed and every lesson link exists', () => {
  const seen = new Set();
  for (const ev of data.events) {
    assert.match(ev.md, /^\d\d-\d\d$/);
    assert.ok(['birthday', 'history', 'science'].includes(ev.cat), ev.title);
    assert.ok(existsSync(new URL(`../${ev.lesson}`, import.meta.url)), `${ev.title} → ${ev.lesson}`);
    const key = `${ev.md}|${ev.title}`;
    assert.ok(!seen.has(key), `duplicate ${key}`);
    seen.add(key);
    const [m, d] = ev.md.split('-').map(Number);
    assert.ok(new Date(2024, m - 1, d).getDate() === d, `${ev.md} is not a real date`);
  }
});

test('noClass ranges are inclusive', () => {
  const d = { noClass: [{ from: '2026-11-23', to: '2026-11-27', label: 'Break' }] };
  assert.ok(noClassFor(new Date(2026, 10, 25), d));
  assert.ok(noClassFor(new Date(2026, 10, 27), d));
  assert.equal(noClassFor(new Date(2026, 10, 30), d), null);
});
