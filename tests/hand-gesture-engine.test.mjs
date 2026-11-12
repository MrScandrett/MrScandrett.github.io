import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHand, assessFrame, PoseStabilizer, CommandDetector, SwipeDetector } from '../assets/js/lessons/hand-gesture-engine.mjs';

const ASPECT = 4 / 3;
const rad = (d) => d * Math.PI / 180;

/* Synthetic hand in image space (y down). Each finger is a 3-segment chain whose
   joints bend by `pip`/`dip` degrees (0 = straight, up the screen). */
function chain(base, pip, dip, len = 0.07, lean = 0) {
  let ang = -90 + lean, p = { x: base.x, y: base.y };
  const out = [];
  const segs = [0, pip, dip];
  for (let i = 0; i < 3; i++) {
    ang += segs[i];
    p = { x: p.x + Math.cos(rad(ang)) * len / ASPECT, y: p.y + Math.sin(rad(ang)) * len, z: 0 };
    out.push(p);
  }
  return out;
}
function makeHand(spec, rot = 0) {
  const lm = new Array(21);
  lm[0] = { x: 0.5, y: 0.85, z: 0 };
  const mcps = { index: 5, middle: 9, ring: 13, pinky: 17 };
  const xs = { index: 0.44, middle: 0.48, ring: 0.52, pinky: 0.56 };
  for (const k of Object.keys(mcps)) {
    const i = mcps[k];
    const base = { x: xs[k], y: 0.65, z: 0 };
    lm[i] = base;
    const curled = spec[k] === 'c';
    const [a, b, c] = chain(base, curled ? 100 : 0, curled ? 70 : 0, curled ? 0.055 : 0.07);
    lm[i + 1] = a; lm[i + 2] = b; lm[i + 3] = c;
  }
  // thumb: cmc(1) mcp(2) ip(3) tip(4)
  const t = spec.thumb || 'tuck';
  lm[1] = { x: 0.46, y: 0.80, z: 0 };
  lm[2] = { x: 0.43, y: 0.74, z: 0 };
  if (t === 'up') { lm[3] = { x: 0.42, y: 0.63, z: 0 }; lm[4] = { x: 0.41, y: 0.53, z: 0 }; }
  else if (t === 'down') { lm[2] = { x: 0.43, y: 0.74, z: 0 }; lm[3] = { x: 0.42, y: 0.82, z: 0 }; lm[4] = { x: 0.41, y: 0.90, z: 0 }; }
  else if (t === 'out') { lm[3] = { x: 0.35, y: 0.72, z: 0 }; lm[4] = { x: 0.28, y: 0.70, z: 0 }; }
  else { lm[3] = { x: 0.46, y: 0.70, z: 0 }; lm[4] = { x: 0.48, y: 0.66, z: 0 }; } // tucked across palm
  if (rot) { // rotate whole hand about the wrist (image-space)
    return lm.map((p) => {
      const dx = (p.x - 0.5) * ASPECT, dy = p.y - 0.85;
      const c = Math.cos(rad(rot)), s = Math.sin(rad(rot));
      return { x: 0.5 + (dx * c - dy * s) / ASPECT, y: 0.85 + dx * s + dy * c, z: 0 };
    });
  }
  return lm;
}
const E = 'e', C = 'c';

const poses = {
  point:      { spec: { index: E, middle: C, ring: C, pinky: C, thumb: 'tuck' }, label: 'point' },
  peace:      { spec: { index: E, middle: E, ring: C, pinky: C, thumb: 'tuck' }, label: 'peace' },
  three:      { spec: { index: E, middle: E, ring: E, pinky: C, thumb: 'tuck' }, label: 'three' },
  palm:       { spec: { index: E, middle: E, ring: E, pinky: E, thumb: 'out' },  label: 'palm' },
  fist:       { spec: { index: C, middle: C, ring: C, pinky: C, thumb: 'tuck' }, label: 'fist' },
  thumbsUp:   { spec: { index: C, middle: C, ring: C, pinky: C, thumb: 'up' },   label: 'thumbsUp' },
  thumbsDown: { spec: { index: C, middle: C, ring: C, pinky: C, thumb: 'down' }, label: 'thumbsDown' }
};

for (const [name, { spec, label }] of Object.entries(poses)) {
  test(`classifies ${name} (image space)`, () => {
    assert.equal(analyzeHand(makeHand(spec), null, ASPECT).label, label);
  });
  test(`classifies ${name} (world landmarks path)`, () => {
    const lm = makeHand(spec);
    const world = lm.map((p) => ({ x: p.x * ASPECT * 0.2, y: p.y * 0.2, z: 0 }));
    assert.equal(analyzeHand(lm, world, ASPECT).label, label);
  });
}

test('finger-state poses survive in-plane hand rotation up to ±35°', () => {
  for (const rot of [-35, -20, 20, 35]) {
    for (const n of ['point', 'peace', 'three', 'palm', 'fist']) {
      assert.equal(analyzeHand(makeHand(poses[n].spec, rot), null, ASPECT).label, poses[n].label, `${n} @ ${rot}°`);
    }
  }
});

test('assessFrame rejects low confidence and warns about edge / far hands', () => {
  const lm = makeHand(poses.palm.spec);
  assert.equal(assessFrame(lm, 0.4).ok, false);
  assert.equal(assessFrame(lm, 0.9).ok, true);
  const cut = lm.map((p, i) => (i % 2 ? { ...p, y: 1.01 } : p));
  assert.equal(assessFrame(cut, 0.9).reason, 'edge');
  assert.equal(assessFrame(null, 0.9).ok, false);
});

test('PoseStabilizer ignores a single-frame flicker but follows a real change', () => {
  const st = new PoseStabilizer();
  let t = 0, r;
  for (let i = 0; i < 8; i++) r = st.push('point', (t += 33));
  assert.equal(r.label, 'point');
  r = st.push('fist', (t += 33)); // one bad frame
  assert.equal(r.label, 'point');
  for (let i = 0; i < 6; i++) r = st.push('fist', (t += 33));
  assert.equal(r.label, 'fist');
  assert.ok(r.heldMs < 400);
});

test('CommandDetector fires once after the dwell, then needs release', () => {
  const cd = new CommandDetector();
  let fired = [];
  let t = 5000;
  for (let held = 0; held <= 1600; held += 33) {
    const r = cd.update('thumbsUp', held, (t += 33), false);
    if (r.fire) fired.push(r.fire);
  }
  assert.deepEqual(fired, ['thumbsUp']);
  cd.update('palm', 0, (t += 33), false);       // release
  for (let held = 0; held <= 1600; held += 33) {
    const r = cd.update('thumbsUp', held, (t += 33), false);
    if (r.fire) fired.push(r.fire);
  }
  assert.deepEqual(fired, ['thumbsUp', 'thumbsUp']);
});

test('CommandDetector never fires while blocked (pen down) or for non-command poses', () => {
  const cd = new CommandDetector();
  for (let held = 0; held <= 3000; held += 33) {
    assert.equal(cd.update('thumbsDown', held, 10000 + held, true).fire, null);
    assert.equal(cd.update('fist', held, 20000 + held, false).fire, null);
  }
});

test('SwipeDetector: fast open-hand sweep fires, slow drift and non-open hand do not', () => {
  const sw = new SwipeDetector();
  let out = null, t = 0;
  for (let i = 0; i <= 10; i++) out = sw.push(0.3 + i * 0.05, 0.5, (t += 30), true) || out;
  assert.equal(out, 'swipeRight');

  const sw2 = new SwipeDetector(); out = null; t = 0;
  for (let i = 0; i <= 10; i++) out = sw2.push(0.8 - i * 0.05, 0.5, (t += 30), true) || out;
  assert.equal(out, 'swipeLeft');

  const slow = new SwipeDetector(); out = null; t = 0;
  for (let i = 0; i <= 40; i++) out = slow.push(0.3 + i * 0.004, 0.5, (t += 60), true) || out;
  assert.equal(out, null);

  const closed = new SwipeDetector(); out = null; t = 0;
  for (let i = 0; i <= 10; i++) out = closed.push(0.3 + i * 0.05, 0.5, (t += 30), false) || out;
  assert.equal(out, null);

  const diag = new SwipeDetector(); out = null; t = 0;
  for (let i = 0; i <= 10; i++) out = diag.push(0.3 + i * 0.05, 0.2 + i * 0.05, (t += 30), true) || out;
  assert.equal(out, null);
});
