import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// A fake window with a hand-cranked frame clock, an IntersectionObserver we can toggle,
// and a document whose `hidden` flag we flip.
function makeWorld() {
  let now = 0;
  let nextReal = 1;
  const frames = new Map();
  const observers = [];
  const listeners = {};
  const ctx = {
    performance: { now: () => now },
    requestAnimationFrame(cb) { const id = nextReal++; frames.set(id, cb); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    IntersectionObserver: class {
      constructor(cb) { this.cb = cb; observers.push(this); }
      observe(el) { this.el = el; (this.els ||= []).push(el); }
      disconnect() { this.gone = true; }
    },
    document: {
      hidden: false,
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      removeEventListener(type, fn) { listeners[type] = (listeners[type] || []).filter((f) => f !== fn); },
      querySelector: () => ({}),
    },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('assets/js/sim-kit.js', 'utf8'), ctx);
  return {
    SimKit: ctx.SimKit,
    pendingFrames: () => frames.size,
    // Advance the clock by ms and run every frame callback that was waiting.
    frame(ms = 16) {
      now += ms;
      const due = [...frames.values()];
      frames.clear();
      for (const cb of due) cb(now);
    },
    wait(ms) { now += ms; },
    setOnScreen(on) { for (const o of observers) o.cb([{ isIntersecting: on, target: o.el }]); },
    setTarget(el, on) { for (const o of observers) if (o.els.includes(el)) o.cb([{ isIntersecting: on, target: el }]); },
    setHidden(hidden) { ctx.document.hidden = hidden; for (const fn of listeners.visibilitychange || []) fn(); },
  };
}

test('SimKit.raf holds frames while the element is off-screen and resumes with continuous time', () => {
  const w = makeWorld();
  const raf = w.SimKit.raf({});
  const stamps = [];
  function frame(t) { stamps.push(t); raf(frame); }
  raf(frame);
  w.frame(); w.frame();
  assert.deepEqual(stamps, [16, 32]);

  w.setOnScreen(false);
  assert.equal(w.pendingFrames(), 0, 'no real rAF is queued while off-screen');
  w.wait(60000);
  w.frame();
  assert.equal(stamps.length, 2, 'nothing ran while off-screen');

  w.setOnScreen(true);
  w.frame();
  assert.equal(stamps.length, 3);
  const dt = stamps[2] - stamps[1];
  assert.ok(dt > 0 && dt < 100, `resume dt should be one frame, got ${dt}`);
});

test('SimKit.raf pauses for a hidden tab and cancel() drops a held callback', () => {
  const w = makeWorld();
  const raf = w.SimKit.raf({});
  let calls = 0;
  const id = raf(() => calls++);
  w.setHidden(true);
  w.frame();
  raf.cancel(id);
  w.setHidden(false);
  w.frame();
  assert.equal(calls, 0);
  assert.equal(raf.isLive(), true);
});

test('SimKit.loop with el pauses off-screen; pause()/resume() are separate from visibility', () => {
  const w = makeWorld();
  const dts = [];
  const handle = w.SimKit.loop((dt) => dts.push(dt), { el: {}, maxDt: 0.05 });
  w.frame(); w.frame();
  w.setOnScreen(false);
  w.wait(5000); w.frame();
  w.setOnScreen(true);
  w.frame();
  assert.equal(dts.length, 3);
  assert.ok(dts[2] <= 0.05);

  handle.pause();
  w.setOnScreen(false); w.setOnScreen(true);
  w.frame();
  assert.equal(dts.length, 3, 'a user pause survives scrolling away and back');
  handle.resume();
  w.frame(); w.frame();
  assert.equal(dts.length, 5);
  handle.stop();
  w.frame();
  assert.equal(dts.length, 5);
});

test('SimKit.frame reuses one gate per element and falls back without one', () => {
  const w = makeWorld();
  const canvas = { closest: () => null };
  let calls = 0;
  function draw() { calls++; w.SimKit.frame(canvas, draw); }
  w.SimKit.frame(canvas, draw);
  w.frame(); w.frame();
  assert.equal(calls, 2);
  w.setOnScreen(false);
  w.frame();
  assert.equal(calls, 2, 'held while off-screen');
  w.setOnScreen(true);
  w.frame();
  assert.equal(calls, 3);

  let plain = 0;
  w.SimKit.frame(null, () => plain++);
  w.frame();
  assert.equal(plain, 1, 'no element: plain requestAnimationFrame');
});

test('SimKit.raf with several elements runs while any one of them is on screen', () => {
  const w = makeWorld();
  const a = { closest: () => null }, b = { closest: () => null };
  const raf = w.SimKit.raf(w.SimKit.stage(a, b));
  let calls = 0;
  function f() { calls++; raf(f); }
  raf(f);
  // A real IntersectionObserver reports every observed element once at the start.
  w.setTarget(a, true); w.setTarget(b, true);
  w.frame();
  assert.equal(calls, 1);
  w.setTarget(a, false);
  w.frame();
  assert.equal(calls, 2, 'b is still showing');
  w.setTarget(b, false);
  w.frame();
  assert.equal(calls, 2, 'both gone: paused');
  w.setTarget(b, true);
  w.frame();
  assert.equal(calls, 3);
});
