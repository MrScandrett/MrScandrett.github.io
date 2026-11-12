import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance, defaultTable, blankTable, makePart, validateTable, exportTable, W, H, PART_TYPES, FRAME } from '../assets/js/pinball/pinball-core.mjs';

const run = (g, sec, input = {}) => { for (let t = 0; t < sec; t += 1 / 60) advance(g, 1 / 60, input); };
const loose = (table, x, y, vx = 0, vy = 0) => { const g = createGame(table); g.ball = { x, y, vx, vy }; g.status = 'playing'; return g; };

test('gravity pulls the ball down and a wall catches it', () => {
  const t = blankTable(); t.parts = [{ ...makePart('wall', 250, 500), x2: 350, y2: 500 }];
  const g = loose(t, 300, 300);
  run(g, 1);
  assert.ok(g.ball.y > 300 && g.ball.y < 500, 'fell but not through');
  run(g, 3);
  assert.ok(g.ball.y < 500, 'rests above the wall');
});

test('no tunnelling: fast balls never cross any wall or the frame', () => {
  const t = defaultTable();
  for (const [x, y, vx, vy] of [[300, 600, 0, -2200], [100, 300, 2200, 0], [500, 300, -2000, -900], [300, 120, 900, 2200]]) {
    const g = loose(t, x, y, vx, vy);
    for (let i = 0; i < 600; i++) {
      advance(g, 1 / 60, {});
      if (!g.ball) break;
      assert.ok(g.ball.x > 20 && g.ball.x < 580 + 1, `x in bounds (${g.ball.x})`);
      assert.ok(g.ball.y > 20, `did not leave through the arch (${g.ball.y})`);
    }
  }
});

test('plunger launches the ball up the lane and into the playfield', () => {
  const g = createGame(defaultTable());
  assert.equal(g.status, 'ready');
  for (let i = 0; i < 70; i++) advance(g, 1 / 60, { plunge: true });
  advance(g, 1 / 60, {});
  let top = 999;
  for (let i = 0; i < 240; i++) { advance(g, 1 / 60, {}); if (g.ball) top = Math.min(top, g.ball.y); }
  assert.ok(top < 260, `ball rose to the arch, reached y=${top}`);
  assert.ok(g.ball === null || g.ball.x < 538 || g.status !== 'ready', 'left the lane');
});

test('a ball with nothing under it drains, costs a ball, and the game ends at zero', () => {
  const t = blankTable(); t.parts = [];
  const g = createGame(t, { balls: 2 });
  g.ball = { x: 300, y: 850, vx: 0, vy: 0 }; g.status = 'playing';
  run(g, 1.5);
  assert.equal(g.balls, 1);
  assert.equal(g.status, 'ready', 'next ball waits in the lane');
  g.ball = { x: 300, y: 850, vx: 0, vy: 0 }; g.status = 'playing';
  run(g, 1.5);
  assert.equal(g.status, 'over');
  assert.equal(g.ball, null);
});

test('a bumper scores 100 and throws the ball back', () => {
  const t = blankTable(); t.parts = [{ ...makePart('bumper', 300, 500), r: 28 }];
  const g = loose(t, 300, 440, 0, 200);
  run(g, 0.5);
  assert.equal(g.score, 100);
  assert.ok(g.ball.vy < 0 || g.ball.y < 440, 'was kicked upward');
  assert.ok(g.events.some((e) => e.type === 'bumper'));
});

test('hitting all targets pays a bonus and raises the multiplier', () => {
  const t = blankTable();
  t.parts = [{ ...makePart('target', 280, 500), x2: 320, y2: 500 }, { ...makePart('target', 280, 600), x2: 320, y2: 600 }];
  const g = loose(t, 300, 460, 0, 300);
  run(g, 0.4);
  assert.equal(g.score, 500);
  g.ball = { x: 300, y: 560, vx: 0, vy: 300 };
  run(g, 0.4);
  assert.equal(g.multiplier, 2);
  assert.ok(g.score >= 500 + 500 + 5000);
});

test('a rollover scores once per pass and does not bounce the ball', () => {
  const t = blankTable(); t.parts = [{ ...makePart('rollover', 300, 500), r: 14 }];
  const g = loose(t, 300, 470, 0, 200);
  run(g, 0.8);
  assert.equal(g.score, 100);
  assert.ok(g.ball.y > 500, 'passed straight through');
});

test('a raised flipper hits the ball harder than a resting one', () => {
  const t = defaultTable();
  const drop = (hold) => { const g = loose(t, 215, 760, 0, 0); let best = g.ball.y; for (let i = 0; i < 90; i++) { advance(g, 1 / 60, { left: hold && i > 25 }); if (g.ball) best = Math.min(best, g.ball.y); } return best; };
  assert.ok(drop(true) < drop(false) - 30, 'flipping lifts the ball');
});

test('validateTable repairs hostile input and never throws', () => {
  assert.equal(validateTable('{nope').ok, false);
  assert.equal(validateTable({ format: 'other', parts: [] }).ok, false);
  const r = validateTable({ format: 'pinball-construction-set', parts: [
    { type: 'bumper', x: 99999, y: -5, r: 9999 }, { type: 'exploder', x: 1, y: 1 }, { type: 'wall', x: 10, y: 10, x2: 10, y2: 10 }, null,
    { type: 'flipper', x: NaN, y: 5, side: 'sideways', len: -3 } ] });
  assert.ok(r.ok);
  assert.equal(r.table.parts.length, 3);
  const [b, w, f] = r.table.parts;
  assert.ok(b.x <= W && b.y >= 0 && b.r <= 60);
  assert.ok(Math.hypot(w.x2 - w.x, w.y2 - w.y) >= 4);
  assert.equal(f.side, 'left'); assert.ok(f.len >= 40);
  assert.equal(new Set(r.table.parts.map((p) => p.id)).size, 3);
});

test('tables round-trip through JSON, and every part type builds and simulates', () => {
  const t = defaultTable();
  const back = validateTable(exportTable(t));
  assert.ok(back.ok); assert.deepEqual(back.table.parts, t.parts);
  const all = blankTable();
  for (const type of Object.keys(PART_TYPES)) all.parts.push(makePart(type, 300, 400));
  const g = createGame(all);
  run(g, 5);
  assert.ok(Number.isFinite(g.score));
  assert.ok(FRAME.length > 20);
});

test('the starter table survives 60 s of random flipper mashing without NaN or escape', () => {
  const g = createGame(defaultTable(), { balls: 99 });
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let held = { left: false, right: false, plunge: false };
  for (let i = 0; i < 3600; i++) {
    if (i % 20 === 0) held = { left: rnd() < 0.5, right: rnd() < 0.5, plunge: g.status === 'ready' && rnd() < 0.7 };
    advance(g, 1 / 60, held);
    if (g.ball) { assert.ok(Number.isFinite(g.ball.x + g.ball.y)); assert.ok(g.ball.x > 0 && g.ball.x < W + 1 && g.ball.y > -10); }
  }
});
