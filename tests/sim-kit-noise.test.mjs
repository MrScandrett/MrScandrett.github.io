import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = {};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('assets/js/sim-kit.js', 'utf8'), context);
const { hash, value, fbm } = context.SimKit.noise;

test('fbm reproduces the values the volcano terrain was built from', () => {
  // Captured from the inline noise volcano-simulator.html used before it moved into SimKit.
  assert.equal(fbm(0, 0, 6), 0.8065099843617531);
  assert.equal(fbm(1.5, 2.25, 6), 0.4941288491245359);
  assert.equal(fbm(1000.3, 500.7, 6), 0.5082769281032689);
});

test('noise is deterministic and stays in [0, 1)', () => {
  for (let i = 0; i < 2000; i++) {
    const x = (i * 0.137) % 40 - 20, y = (i * 0.291) % 30 - 15;
    for (const v of [hash(Math.floor(x), Math.floor(y)), value(x, y), fbm(x, y, 5)]) {
      assert(v >= 0 && v < 1, `out of range at ${x}, ${y}: ${v}`);
    }
    assert.equal(fbm(x, y, 5), fbm(x, y, 5));
  }
});

test('value noise hits the lattice hash at integer points and is continuous between them', () => {
  assert.equal(value(3, -7), hash(3, -7));
  assert(Math.abs(value(3 - 1e-9, 2.5) - value(3 + 1e-9, 2.5)) < 1e-6);
});

test('lessons use the shared noise instead of pasting their own', () => {
  for (const file of ['lessons/earth-science/climate-simulator.html', 'lessons/earth-science/volcano-simulator.html']) {
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /assets\/js\/sim-kit\.js/, `${file} must load sim-kit.js`);
    assert.doesNotMatch(html, /function (hashN|hash2|valueNoise|vn|fbm)\s*\(/, `${file} redefines noise`);
  }
});
