import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const T = require('../assets/js/timeline.js');

const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}`);
const when = (s) => T.parseWhen(s);

test('plain years, BC/AD and approximate dates', () => {
  assert.equal(when('1906').start, 1906);
  assert.equal(when('-500').start, -500);
  assert.equal(when('500 BC').start, -500);
  assert.equal(when('500 B.C.').start, -500);
  assert.equal(when('586 BCE').start, -586);
  assert.equal(when('AD 70').start, 70);
  assert.equal(when('70 CE').start, 70);
  const c = when('c. 627 BC');
  assert.equal(c.start, -627);
  assert.equal(c.approx, true);
  assert.equal(when('1452?').approx, true);
});

test('Cosmic Calendar: the universe as one year', () => {
  const cal = (s) => T.cosmicCalendar(when(s).start);
  assert.equal(cal('13.8 Ga').text, 'Jan 1, the first instant');
  near(cal('13.8 Ga').fraction, 0, 1e-6);
  assert.equal(cal('4.54 Ga').text, 'Sep 2');
  assert.equal(cal('538 Ma').text, 'Dec 17');
  assert.match(cal('66 Ma').text, /^Dec 30, \d{1,2}:\d\d am$/);
  assert.equal(cal('10,000 BC').text, 'Dec 31, 27 seconds before midnight');
  assert.equal(cal('AD 30').text, 'Dec 31, 4.6 seconds before midnight');
  assert.match(cal('Jan 9, 2007').text, /^Dec 31, 0\.0\d seconds before midnight$/);
  assert.equal(cal('present').text, 'Dec 31, the stroke of midnight: right now');
  assert.equal(T.cosmicCalendar(T.NOW - 20e9), null);
  assert.equal(T.cosmicCalendar(T.NOW + 50), null);
});

test('one year ago is singular on the deep-time axis', () => {
  assert.equal(T.formatTick(T.NOW - 1, { deep: true }), '1 yr ago');
  assert.equal(T.formatTick(T.NOW - 2, { deep: true }), '2 yrs ago');
});

test('ranges, shorthand ranges and a unit written once', () => {
  assert.deepEqual([when('1928–1934').start, when('1928–1934').end], [1928, 1934]);
  assert.deepEqual([when('1928-34').start, when('1928-34').end], [1928, 1934]);
  assert.deepEqual([when('1939 to 1945').start, when('1939 to 1945').end], [1939, 1945]);
  assert.deepEqual([when('1770s–80s').start, when('1770s–80s').end], [1770, 1789]);
  assert.deepEqual([when('1800s–1820s').start, when('1800s–1820s').end], [1800, 1829]);
  assert.deepEqual([when('1869–1876').start, when('1869–1876').end], [1869, 1876]);
  const bc = when('627–586 BC');
  assert.deepEqual([bc.start, bc.end], [-627, -586]);
  const mixed = when('4 BC – AD 30');
  assert.deepEqual([mixed.start, mixed.end], [-4, 30]);
  const deep = when('252–201 Ma');
  near(T.NOW - deep.start, 252e6, 1);
  near(T.NOW - deep.end, 201e6, 1);
  assert.ok(deep.end > deep.start);
});

test('decades, centuries, months and ISO dates', () => {
  assert.deepEqual([when('1590s').start, when('1590s').end], [1590, 1599]);
  assert.deepEqual([when('1900s').start, when('1900s').end], [1900, 1999]);
  assert.deepEqual([when('5th century BC').start, when('5th century BC').end], [-500, -401]);
  assert.deepEqual([when('19th century').start, when('19th century').end], [1801, 1900]);
  near(when('March 1876').start, 1876 + 2 / 12);
  near(when('Mar 14, 1879').start, 1879 + 2 / 12 + 13 / 365);
  near(when('14 March 1879').start, 1879 + 2 / 12 + 13 / 365);
  near(when('1947-09-09').start, 1947 + 8 / 12 + 8 / 365);
});

test('deep time units', () => {
  near(T.NOW - when('66 Ma').start, 66e6, 1);
  near(T.NOW - when('66 million years ago').start, 66e6, 1);
  near(T.NOW - when('4.5 Ga').start, 4.5e9, 1);
  near(T.NOW - when('12 ka').start, 12000, 1);
  near(T.NOW - when('300 years ago').start, 300, 1);
  near(when('present').start, T.NOW);
  near(T.NOW - when('c. 1.5 million BCE').start, 1.5e6, 1);
  assert.deepEqual([when('c. 10th–13th centuries').start, when('c. 10th–13th centuries').end], [901, 1300]);
});

test('words that are not dates stay unparsed (the timeline falls back to even spacing)', () => {
  for (const s of ['Impact day', 'Weeks-months', 'Afterward', '', 'Before 66 Ma']) {
    assert.equal(when(s), null, s);
  }
});

test('tick labels and round tick values', () => {
  assert.equal(T.formatTick(1950, { deep: false, bc: false }), '1950');
  assert.equal(T.formatTick(-500, { deep: false, bc: true }), '500 BC');
  assert.equal(T.formatTick(100, { deep: false, bc: true }), 'AD 100');
  assert.equal(T.formatTick(T.NOW - 66e6, { deep: true }), '66 million yrs ago');
  assert.deepEqual(T.linearTicks(1903, 2017, 6, {}), [1920, 1940, 1960, 1980, 2000]);
  const deep = T.linearTicks(T.NOW - 300e6, T.NOW - 1e6, 3, { deep: true });
  deep.forEach((t) => near((T.NOW - t) % 100e6, 0, 1));
});

test('relative and gap text', () => {
  assert.match(T.relativeText(when('1906')), /^\d+ years ago$/);
  assert.match(T.relativeText(when('c. 627 BC')), /^about [\d,]+ years ago$/);
  assert.match(T.relativeText(when('1939–1945')), /lasted 6 years$/);
  assert.equal(T.relativeText(when('66 Ma')), '66 million yrs ago');
  assert.equal(T.gapText(when('1906'), when('1928')), '22 years later');
  assert.equal(T.gapText(when('1906'), when('1906')), '');
});

// Every timeline in a lesson either parses all its dates or is a deliberate sequence.
test('lesson timelines: every data-when parses', () => {
  const bad = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.html')) {
        const html = readFileSync(p, 'utf8');
        if (!html.includes('data-timeline')) continue;
        for (const m of html.matchAll(/data-when="([^"]*)"/g)) {
          if (!when(m[1].replace(/&ndash;/g, '–'))) bad.push(`${p}: ${m[1]}`);
        }
        // Biography template: <ol class="fl-timeline" data-timeline><li><span class="fl-tl-year">…
        const list = html.match(/<ol class="fl-timeline" data-timeline>([\s\S]*?)<\/ol>/);
        for (const m of list ? list[1].matchAll(/class="fl-tl-year">([^<]*)</g) : []) {
          const p2 = when(m[1].replace(/&ndash;/g, '–'));
          if (!p2 || p2.start < 1000) bad.push(`${p}: ${m[1]}`);
        }
      }
    }
  };
  walk(new URL('../lessons', import.meta.url).pathname);
  assert.deepEqual(bad, []);
});

test('legacy semantic timeline lists are discoverable by the shared engine', () => {
  const bad = [];
  const legacyDate = (value) => {
    const raw = value.trim();
    const candidates = [raw, raw.replace(/→/g, '–').replace(/\s*[·|,].*$/, '')];
    if (/^(?:ancient|prehistoric|early)\b/i.test(raw)) candidates.push(raw.split(/\s+[–-]\s+|\s+→\s+/).pop().trim());
    return candidates.some((candidate) => when(candidate));
  };
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.html')) {
        const html = readFileSync(p, 'utf8');
        for (const m of html.matchAll(/<(?:ol|ul)\b[^>]*class="[^"]*timeline[^"]*"[^>]*>([\s\S]*?)<\/(?:ol|ul)>/gi)) {
          const dates = [...m[1].matchAll(/(?:timeline-year|tl-year|tl-date|pt-era)[^>]*>([^<]+)/gi)]
            .map((x) => x[1].replace(/&ndash;/g, '–').trim())
            .filter(Boolean);
          const parsed = dates.filter(legacyDate);
          if (dates.length >= 2 && parsed.length && parsed.length !== dates.length) bad.push(`${p}: ${dates.join(' | ')}`);
        }
      }
    }
  };
  walk(new URL('../lessons', import.meta.url).pathname);
  assert.deepEqual(bad, []);
});

test("The Ages' Grand Timeline is built from data/ages-timeline.json and every link and date checks out", () => {
  const out = execFileSync(process.execPath, [new URL('../scripts/build-ages-timeline.mjs', import.meta.url).pathname, '--check'], { encoding: 'utf8' });
  assert.match(out, /up to date/);
});
