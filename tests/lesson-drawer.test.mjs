import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// The phone drawer (.ll-panel) only opens and closes through assets/js/lesson-layout.js.
// A lesson that has the markup but not the script shows a drawer that is stuck open (or
// dead to taps), and its own hand-rolled handlers can't fix it: lesson-layout.css only
// listens to data-ll-collapsed.
const root = new URL('..', import.meta.url).pathname;

// Pages that run their own drawer on purpose.
const OWN_DRAWER = new Set([
  'lessons/humanities/the-ages.html',   // page script sets data-ll-collapsed itself
  'lessons/music/theory/fake-book.html' // .ll-panel is hidden; the Fake Book has its own rail + drawer
]);

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith('.html')) yield p;
  }
}

const withDrawer = [...htmlFiles(join(root, 'lessons'))]
  .map((p) => ({ rel: relative(root, p), src: readFileSync(p, 'utf8') }))
  .filter(({ src }) => /class="ll-panel[\s"]/.test(src));

test('there are lessons with a drawer to check', () => {
  assert.ok(withDrawer.length > 100);
});

test('every lesson with a .ll-panel loads lesson-layout.js', () => {
  const missing = withDrawer
    .filter(({ rel, src }) => !OWN_DRAWER.has(rel) && !/<script[^>]+src="[^"]*lesson-layout\.js/.test(src))
    .map(({ rel }) => rel);
  assert.deepEqual(missing, [], 'these lessons have a drawer but never load assets/js/lesson-layout.js');
});

test('no lesson toggles the drawer with classes that have no CSS', () => {
  const dead = withDrawer
    .filter(({ src }) => /ll-panel-hidden|ll-panel--open/.test(src))
    .map(({ rel }) => rel);
  assert.deepEqual(dead, []);
});
