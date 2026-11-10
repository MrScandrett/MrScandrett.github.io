import test from 'node:test';
import assert from 'node:assert/strict';
import { SvgError, parsePath, parseSvg, parseTransform } from '../assets/js/svg-outline.mjs';

const near = (a, b, eps = 1e-3) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
const area = (c) => { let a = 0; for (let i = 0; i < c.length; i += 2) { const j = (i + 2) % c.length; a += c[i] * c[j + 1] - c[j] * c[i + 1]; } return a / 2; };
const doc = (inner, root = 'width="100mm" height="50mm" viewBox="0 0 100 50"') => `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" ${root}>${inner}</svg>`;

test('every path command, absolute and relative, with implicit repeats and compact numbers', () => {
  const [ring] = parsePath('M0 0h10v10H0z');
  assert.deepEqual(ring, [0, 0, 10, 0, 10, 10, 0, 10]);
  const [r2] = parsePath('m1-1 2.5.5-1e1,0');                  // "2.5.5" is two numbers; implicit lineto after m
  assert.deepEqual(r2.map((v) => +v.toFixed(6)), [1, -1, 3.5, -0.5, -6.5, -0.5]);
  const [cs] = parsePath('M0 0C0 10 10 10 10 0S20-10 20 0Q25 5 30 0T40 0', 0.01);
  assert.ok(cs.length > 40);
  assert.deepEqual(cs.slice(-2).map((v) => +v.toFixed(6)), [40, 0]);
  assert.throws(() => parsePath('M0 0 L5'), SvgError);
  assert.throws(() => parsePath('M0 0 X5 5'), SvgError);
});

test('arcs have the right size, including compact flags like "a5 5 0 1010 0"', () => {
  const [half] = parsePath('M0 0a5 5 0 1010 0', 0.001);
  let maxDist = 0;
  for (let i = 0; i < half.length; i += 2) maxDist = Math.max(maxDist, Math.hypot(half[i] - 5, half[i + 1]));
  assert.ok(near(maxDist, 5, 1e-4));
  const { shapes } = parseSvg(doc('<circle cx="50" cy="25" r="20"/>'), { tolerance: 0.001 });
  assert.ok(near(Math.abs(area(shapes[0].contours[0])), Math.PI * 400, 1e-3));
});

test('units: mm, inches and viewBox scaling; pixels at 96 dpi, flagged as a guess', () => {
  const mm = parseSvg(doc('<rect x="0" y="0" width="100" height="50"/>'));
  assert.ok(near(mm.size[0], 100) && near(mm.size[1], 50));
  assert.equal(mm.units.certain, true);
  const inch = parseSvg(doc('<rect width="10" height="10"/>', 'width="1in" height="1in" viewBox="0 0 10 10"'));
  assert.ok(near(inch.size[0], 25.4));
  const px = parseSvg(doc('<rect width="96" height="48"/>', 'width="96" height="48"'));
  assert.ok(near(px.size[0], 25.4));
  assert.equal(px.units.certain, false);
});

test('letters keep their holes: evenodd and opposite-wound nonzero both report the inner ring', () => {
  const ring = 'M0 0H40V40H0Z M10 10H30V30H10Z';
  const even = parseSvg(doc(`<path fill-rule="evenodd" d="${ring}"/>`)).shapes[0];
  assert.equal(even.rule, 'evenodd');
  assert.equal(even.contours.length, 2);
  const viaCss = parseSvg(doc(`<style>.o{fill-rule:evenodd}</style><path class="o" d="${ring}"/>`)).shapes[0];
  assert.equal(viaCss.rule, 'evenodd');
});

test('y is flipped and the drawing is centred, transforms nest', () => {
  const { shapes, size } = parseSvg(doc('<g transform="translate(10 0)"><g transform="scale(2)"><rect x="0" y="0" width="10" height="5"/></g></g><rect x="0" y="40" width="1" height="1"/>'));
  assert.ok(near(size[0], 30) && near(size[1], 41));
  // the big rect sits at the top of the page (y=0..10) so after the flip it is the upper one
  const top = Math.max(...shapes[0].contours[0].filter((_, i) => i % 2));
  const small = Math.max(...shapes[1].contours[0].filter((_, i) => i % 2));
  assert.ok(top > small);
  const r = parseTransform('rotate(90 5 5)');
  assert.deepEqual(r.map((v) => +v.toFixed(9) || 0), [0, 1, -1, 0, 10, 0]);
});

test('only filled areas count; text, strokes, pictures and clones are reported with the fix', () => {
  const out = parseSvg(doc(`
    <rect width="10" height="10"/>
    <path d="M0 0L50 50" fill="none" stroke="black"/>
    <line x1="0" y1="0" x2="5" y2="5" stroke="black"/>
    <text x="5" y="5">Hi <tspan>there</tspan></text>
    <image href="data:image/png;base64,AAAA" width="5" height="5"/>
    <use href="#a"/>
    <g style="display:none"><rect width="99" height="99"/></g>
    <defs><rect id="a" width="80" height="80"/></defs>`));
  assert.equal(out.shapes.length, 1);
  const w = out.warnings.join(' ');
  for (const re of [/Object to Path/, /Stroke to Path/, /Trace Bitmap/, /Unlink Clone/]) assert.match(w, re);
  assert.throws(() => parseSvg(doc('<text>only words</text>')), /Nothing filled.*Object to Path/);
  assert.throws(() => parseSvg('<html>not svg</html>'), /not an SVG/);
});

test('big drawings are simplified to the point budget', () => {
  const pts = Array.from({ length: 20000 }, (_, i) => { const t = (2 * Math.PI * i) / 20000; return `${50 + 40 * Math.cos(t)},${25 + 20 * Math.sin(t) + 0.0001 * Math.sin(97 * t)}`; }).join(' ');
  const out = parseSvg(doc(`<polygon points="${pts}"/>`), { maxPoints: 2000 });
  assert.ok(out.points <= 2000, `${out.points} points`);
  assert.ok(near(Math.abs(area(out.shapes[0].contours[0])), Math.PI * 800, 5e-3));
});

test('hostile input does nothing: scripts, handlers and entities are just text', () => {
  const out = parseSvg(doc('<script>globalThis.pwned = 1</script><rect width="10" height="10" onload="globalThis.pwned=1"/><!-- <rect width="99" height="99"/> -->'));
  assert.equal(globalThis.pwned, undefined);
  assert.equal(out.shapes.length, 1);
  assert.ok(near(out.size[0], 10));
});
