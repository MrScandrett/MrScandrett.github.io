import test from 'node:test';
import assert from 'node:assert/strict';
import '../assets/js/pixel-weather.js';

const { icon, moon, digits, kinds } = globalThis.PixelWeather;

// Total lit area of a drawing, from its path runs ("M3 4h5v1h-5z" is five pixels).
function area(svg, fill) {
  return [...svg.matchAll(/<path fill="([^"]+)" d="([^"]*)"/g)]
    .filter(([, color]) => !fill || color === fill)
    .flatMap(([, , d]) => [...d.matchAll(/h(\d+)v1/g)])
    .reduce((sum, [, n]) => sum + Number(n), 0);
}

test('every icon draws inside its 16x16 grid', () => {
  for (const kind of kinds) {
    const svg = icon(kind);
    assert.match(svg, /viewBox="0 0 16 16"/, kind);
    assert.ok(area(svg) > 20, `${kind} has pixels`);
    for (const [, x, y, w] of svg.matchAll(/M(\d+) (\d+)h(\d+)/g)) {
      assert.ok(Number(x) + Number(w) <= 16 && Number(y) < 16, `${kind} stays on the grid`);
    }
  }
});

test('animated icons carry two frames and unknown kinds still draw', () => {
  assert.match(icon('rain'), /px-a[\s\S]*px-b/);
  assert.doesNotMatch(icon('tee'), /px-a/);
  assert.equal(icon('no-such-kind'), icon('cloud'));
});

test('the moon fills and empties with its phase', () => {
  const lit = (phase) => area(moon(phase), '#f4f6ff') + area(moon(phase), '#c9d6ff');
  assert.equal(lit(0), 0);
  assert.ok(lit(0.25) > lit(0.1));
  assert.ok(lit(0.5) > lit(0.4));
  assert.ok(Math.abs(lit(0.25) - lit(0.75)) < 12, 'quarters match');
  assert.ok(lit(0.5) > 150, 'full moon is the whole disc');
});

test('digits handle every temperature the card can show', () => {
  for (const text of ['73°', '-12°', '100°', '--°', '12:05:09']) {
    assert.match(digits(text), /<svg[^>]+viewBox="0 0 \d+ 8"/, text);
  }
  assert.ok(area(digits('8', { shadow: false, bold: true })) > area(digits('8', { shadow: false })));
  assert.match(digits('1', { flat: true, shadow: false }), /fill="currentColor"/);
});
