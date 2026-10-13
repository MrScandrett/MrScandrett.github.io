import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// score-print.js is a browser module; run it against a minimal DOM stub to pin the page-breaking rule.
const src = fs.readFileSync(new URL('../assets/js/score-print.js', import.meta.url), 'utf8');
const sandbox = {}; new Function('globalThis', src.replace('typeof window !== \'undefined\' ? window : globalThis', 'globalThis'))(sandbox);
const SP = sandbox.ScorePrint;

function svgWithSystems(n, top, height, step) {
  const rects = Array.from({ length: n }, (_, i) => ({ y: top + i * step, h: height }));
  return { querySelectorAll: () => rects.map(r => ({ getAttribute: k => String(k === 'y' ? r.y : r.h) })) };
}

test('short scores stay on one page', () => {
  assert.equal(SP._pageWindows(svgWithSystems(3, 50, 200, 300), 1000, 900).length, 1);
});

test('long scores break between systems, never through one', () => {
  const svg = svgWithSystems(20, 50, 200, 300);
  const pages = SP._pageWindows(svg, 1000, 6000);
  assert.ok(pages.length > 1);
  assert.equal(pages[0].y0, 0);
  assert.equal(pages.at(-1).y1, 6000);
  for (const p of pages.slice(0, -1)) {
    // systems occupy [50+300k, 250+300k]; a cut must sit in the gap below one, not inside it
    assert.ok(((p.y1 - 50) % 300) >= 200, `cut ${p.y1} is below a system's bottom edge`);
  }
});

test('print button is wired into the composer figures and the Fake book', () => {
  assert.match(fs.readFileSync(new URL('../assets/js/score-engine.js', import.meta.url), 'utf8'), /ScorePrint\.button/);
  assert.match(fs.readFileSync(new URL('../assets/js/lessons/fake-book.js', import.meta.url), 'utf8'), /data-fb-print/);
  for (const f of fs.readdirSync(new URL('../lessons/music/', import.meta.url))) {
    const html = fs.readFileSync(new URL('../lessons/music/' + f, import.meta.url), 'utf8');
    if (/score-engine\.js/.test(html)) assert.match(html, /score-print\.js/, f + ' loads score-engine without score-print');
  }
});
