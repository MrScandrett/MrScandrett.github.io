import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject } from '../assets/js/lessons/sprite-studio/model.mjs';
import { createEngine, WORLD } from '../assets/js/lessons/sprite-studio/engine.mjs';
const advance = (engine, seconds, input = {}) => { for (let t = 0; t < seconds; t += 1 / 60) engine.update(1 / 60, input); return engine.snapshot(); };
test('actual collision speed chooses idle; intentional key bug reproduces wall running', () => {
  const engine = createEngine(createProject());
  let s = advance(engine, 8, { right: true, run: true });
  assert.equal(s.x, WORLD.wall.x - 10); assert.equal(s.vx, 0); assert.equal(s.state, 'idle');
  engine.rules.fromKeys = true; s = engine.update(1 / 60, { right: true }); assert.equal(s.state, 'walk'); assert.equal(s.vx, 0);
});
test('jump phases synchronize landing drawings to actual floor contact', () => {
  for (const view of ['side', 'top']) {
    const engine = createEngine(createProject(view)); assert.equal(engine.request('jump'), true);
    let sawAir = false, sawFall = false, sawLanding = false;
    for (let i = 0; i < 110; i++) {
      const s = engine.update(1 / 60);
      if (s.z > 0) { sawAir = true; assert.notEqual(s.pose.index, 4); assert.notEqual(s.pose.index, 5); }
      if (s.state === 'fall') { sawFall = true; assert.equal(s.pose.source, 'jump'); assert.equal(s.pose.index, 3); }
      if (s.state === 'land') { sawLanding = true; assert.equal(s.z, 0); assert.ok([4, 5].includes(s.pose.index)); }
    }
    assert.ok(sawAir && sawFall && sawLanding); assert.equal(engine.snapshot().state, 'idle');
  }
});
test('ledge fall uses its own clip and short custom jumps reuse available frames', () => {
  const project = createProject(); project.clips['jump-right'].frames.length = 1;
  const engine = createEngine(project); engine.request('fall'); assert.equal(engine.snapshot().pose.source, 'fall');
  assert.doesNotThrow(() => advance(engine, 2)); assert.equal(engine.snapshot().state, 'idle');
});
test('variable-duration potion benefit fires once and damage interrupts without repeating it', () => {
  const project = createProject(); project.clips['potion-right'].loop = true;
  project.clips['potion-right'].frames[0].ms = 100; project.clips['potion-right'].frames[1].ms = 400;
  const engine = createEngine(project); engine.request('potion'); advance(engine, .45); assert.equal(engine.snapshot().health, 50);
  advance(engine, .15); assert.equal(engine.snapshot().health, 70); assert.equal(engine.snapshot().benefits, 1);
  engine.request('hurt'); assert.equal(engine.snapshot().state, 'hurt'); assert.equal(engine.snapshot().health, 45);
  advance(engine, 2); assert.equal(engine.snapshot().benefits, 1); assert.equal(engine.snapshot().state, 'idle');
});
test('sword applies only one hit per swing in range; movement lock is configurable', () => {
  const engine = createEngine(createProject()); advance(engine, 2.6, { right: true });
  const before = engine.snapshot().x; engine.request('sword'); advance(engine, .7, { right: true });
  assert.equal(engine.snapshot().hits, 1); assert.equal(engine.snapshot().x, before);
  advance(engine, .5); assert.equal(engine.snapshot().hits, 1);
  engine.rules.lockActions = false; engine.request('sword'); advance(engine, .1, { right: true }); assert.ok(engine.snapshot().x > before);
});
test('defeat and victory hold their final frame even when the art preview loops', () => {
  for (const action of ['gameover', 'victory']) {
    const project = createProject(); project.clips[`${action}-right`].loop = true;
    const engine = createEngine(project); engine.request(action); const s = advance(engine, 6);
    assert.equal(s.state, action); assert.equal(s.pose.index, project.clips[`${action}-right`].frames.length - 1);
    assert.equal(engine.request('sword'), false); engine.request('retry'); assert.equal(engine.snapshot().state, 'idle');
  }
});
test('top-down uses four drawn directions and preserves last facing after stopping', () => {
  const engine = createEngine(createProject('top', 32)); advance(engine, .2, { up: true });
  let s = engine.update(1 / 60); assert.equal(s.facing, 'up'); assert.equal(s.pose.clip, 'idle-up');
  advance(engine, .2, { left: true }); s = engine.update(1 / 60); assert.equal(s.facing, 'left'); assert.equal(s.pose.pixels.length, 1024);
});
test('clock-reset bug freezes one-shot progress and prevents its delayed benefit', () => {
  const engine = createEngine(createProject(), { restartEachTick: true }); engine.request('potion'); const s = advance(engine, 4);
  assert.equal(s.actionMs, 0); assert.equal(s.pose.index, 0); assert.equal(s.benefits, 0); assert.equal(s.state, 'potion');
});
test('damage during anticipation cancels takeoff instead of launching a hurt character', () => {
  const engine = createEngine(createProject()); engine.request('jump'); engine.request('hurt');
  for (let i = 0; i < 80; i++) { const s = engine.update(1 / 60); assert.equal(s.z, 0); assert.notEqual(s.jumpPhase, 'prepare'); }
  assert.equal(engine.snapshot().state, 'idle');
});
