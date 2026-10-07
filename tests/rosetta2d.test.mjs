import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, Node, Scene, Body, Area, TileMap, Timer, Sprite, Shape, register, fromJSON, overlap } from '../assets/js/rosetta2d/rosetta2d.mjs';

const STEP = 1 / 60;
const run = (game, seconds) => { for (let t = 0; t < seconds - 1e-9; t += STEP) game.step(STEP); };

test('ready runs children first, once; destroy is deferred to the end of the step', () => {
  const order = [];
  class Probe extends Node { ready() { order.push(this.name); } }
  const root = new Scene({ children: [new Probe({ name: 'a', children: [new Probe({ name: 'a1' })] }), new Probe({ name: 'b' })] });
  const game = new Game();
  game.start(root);
  assert.deepEqual(order, ['a1', 'a', 'b']);

  const a = root.find('a');
  let seenDuringStep = null;
  class Watcher extends Node { fixedUpdate() { a.destroy(); seenDuringStep = root.find('a') !== null; } }
  root.add(new Watcher());
  let destroyed = 0;
  a.on('destroyed', () => destroyed++);
  game.step(STEP);
  assert.equal(seenDuringStep, true, 'still in the tree while the step runs');
  assert.equal(root.find('a'), null, 'gone after the step');
  assert.equal(destroyed, 1);
  assert.equal(order.length, 3, 'ready never runs twice');
});

test('fixedUpdate runs at 60 Hz whatever the frame rate; update runs once per frame', () => {
  let fixed = 0;
  let frames = 0;
  class Counter extends Node { fixedUpdate() { fixed++; } update() { frames++; } }
  const game = new Game();
  game.start(new Scene({ children: [new Counter()] }));
  for (let i = 0; i < 30; i++) game.step(1 / 30); // 1 second at 30 fps
  assert.equal(frames, 30);
  assert.equal(fixed, 60);
  for (let i = 0; i < 144; i++) game.step(1 / 144); // 1 second at 144 fps
  assert.ok(fixed >= 119 && fixed <= 121, `about 120 fixed steps, got ${fixed}`);
});

test('a falling body lands on a solid tile and reports onFloor', () => {
  const game = new Game({ gravity: 900 });
  const map = TileMap.fromRows(['....', '....', '....', 'GGGG'], { G: { solid: true } });
  const hero = new Body({ x: 24, y: 8, w: 12, h: 14 });
  game.start(new Scene({ children: [map, hero] }));
  run(game, 1);
  assert.equal(hero.onFloor, true);
  assert.ok(Math.abs(hero.bounds().y + hero.h - 48) < 1e-6, `feet on the tile top, got ${hero.bounds().y + hero.h}`);
  assert.equal(hero.vy > -1e-9 && hero.vy < 900 / 60 + 1e-9, true);
});

test('fast bodies do not tunnel through a one-tile wall', () => {
  const game = new Game();
  const map = TileMap.fromRows(['..........#.........'], { '#': { solid: true } });
  const bullet = new Body({ x: 8, y: 8, w: 4, h: 4, vx: 3000 });
  const hits = [];
  bullet.on('collide', (c) => hits.push(c.side));
  game.start(new Scene({ children: [map, bullet] }));
  run(game, 0.5);
  assert.ok(Math.abs(bullet.bounds().x + bullet.w - 160) < 1e-6, 'stopped flush against the wall');
  assert.deepEqual(hits, ['right'], 'one collide signal, on the right side');
  assert.equal(bullet.vx, 0);
});

test('one-way tiles hold you from above but let you jump through from below', () => {
  const game = new Game({ gravity: 900 });
  const map = TileMap.fromRows(['....', '....', '----', '....', '....', 'GGGG'], { '-': { oneWay: true }, G: { solid: true } });
  const hero = new Body({ x: 24, y: 70, w: 12, h: 12 });
  game.start(new Scene({ children: [map, hero] }));
  run(game, 0.5);
  assert.equal(hero.onFloor, true);
  hero.vy = -330; // jump up through the plank at y = 32
  run(game, 1.2);
  assert.ok(Math.abs(hero.bounds().y + hero.h - 32) < 1e-6, `landed on top of the plank, feet at ${hero.bounds().y + hero.h}`);
});

test('static bodies block and layers/masks decide what collides', () => {
  const game = new Game();
  const wall = new Body({ x: 100, y: 50, w: 20, h: 100, static: true, layer: 2 });
  const ghost = new Body({ x: 50, y: 50, vx: 300, mask: 1 });
  const solid = new Body({ x: 50, y: 80, vx: 300, mask: 2 });
  game.start(new Scene({ children: [wall, ghost, solid] }));
  run(game, 0.5);
  assert.ok(ghost.x > 120, 'mask 1 passes through a layer-2 wall');
  assert.ok(Math.abs(solid.bounds().x + solid.w - 90) < 1e-6, 'mask 2 stops at it');
});

test('areas emit enter and exit, ignore their own parent, and see destroyed nodes leave', () => {
  const game = new Game();
  const coin = new Area({ x: 100, y: 10, w: 8, h: 8 });
  const player = new Body({ x: 60, y: 10, w: 8, h: 8, vx: 120 });
  const sensor = player.add(new Area({ w: 30, h: 30, layer: 0 })); // a detector only: nothing detects it
  const log = [];
  coin.on('enter', (o) => log.push(['enter', o === player]));
  coin.on('exit', (o) => log.push(['exit', o === player]));
  sensor.on('enter', (o) => log.push(['sensor', o === player]));
  game.start(new Scene({ children: [coin, player] }));
  run(game, 0.5);
  assert.deepEqual(log.filter((e) => e[0] === 'enter'), [['enter', true]]);
  assert.equal(log.some((e) => e[0] === 'sensor' && e[1]), false, 'sensor never reports its parent');
  player.destroy();
  game.step(STEP);
  game.step(STEP);
  assert.deepEqual(log.at(-1), ['exit', true]);
});

test('pressed() is seen exactly once in fixedUpdate and once in update, even at 144 fps', () => {
  const game = new Game();
  game.input.bind('jump', ['Space', 'PadA']);
  let fixedHits = 0;
  let frameHits = 0;
  class Reader extends Node {
    fixedUpdate() { if (this.game.input.pressed('jump')) fixedHits++; }
    update() { if (this.game.input.pressed('jump')) frameHits++; }
  }
  game.start(new Scene({ children: [new Reader()] }));
  game.input.press('Space');
  for (let i = 0; i < 10; i++) game.step(1 / 144);
  assert.equal(fixedHits, 1);
  assert.equal(frameHits, 1);
  assert.equal(game.input.down('jump'), true);
  game.input.release('Space');
  assert.equal(game.input.down('jump'), false);
  assert.equal(game.input.axis('left', 'right'), 0);
});

test('timers, after(), pause and processWhenPaused', () => {
  const game = new Game();
  const root = new Scene();
  const fired = [];
  const t = root.add(new Timer({ wait: 0.5, oneShot: false, autostart: true }));
  t.on('timeout', () => fired.push(game.time));
  let afterRan = 0;
  root.after(0.25, () => afterRan++);
  game.start(root);
  run(game, 1.6);
  assert.equal(fired.length, 3);
  assert.equal(afterRan, 1);
  assert.equal(root.children.includes(t), true);
  assert.equal(root.children.length, 1, 'after() cleans up its timer');

  let ticks = 0;
  let menuTicks = 0;
  root.add(new (class extends Node { update() { ticks++; } })());
  root.add(new (class extends Node { update() { menuTicks++; } })({ processWhenPaused: true }));
  game.paused = true;
  run(game, 0.5);
  assert.equal(ticks, 0);
  assert.ok(menuTicks > 0);
  assert.equal(fired.length, 3, 'timers freeze while paused');
});

test('sprite animations loop, stop, and ignore repeated play()', () => {
  const game = new Game();
  const s = new Sprite({ anims: { run: { frames: [4, 5, 6, 7], fps: 10 }, hit: { frames: [8, 9], fps: 10, loop: false } } });
  game.start(new Scene({ children: [s] }));
  s.play('run');
  run(game, 0.25);
  assert.equal(s.frame, 6);
  s.play('run'); // already playing: no restart
  assert.equal(s.frame, 6);
  let ended = null;
  s.on('animationend', (n) => (ended = n));
  s.play('hit');
  run(game, 0.5);
  assert.equal(s.frame, 9);
  assert.equal(s.playing, false);
  assert.equal(ended, 'hit');
});

test('camera follows with a dead zone and stays inside its bounds', () => {
  const game = new Game({ width: 320, height: 180 });
  const hero = new Node({ x: 160, y: 90 });
  game.start(new Scene({ children: [hero] }));
  game.camera.follow(hero, { deadzone: [40, 40] }).setBounds(0, 0, 1000, 180);
  hero.x = 175; game.step(STEP);
  assert.equal(game.camera.x, 160, 'inside the dead zone: no movement');
  hero.x = 300; game.step(STEP);
  assert.equal(game.camera.x, 280);
  hero.x = -50; game.step(STEP);
  assert.equal(game.camera.left, 0, 'clamped at the left edge');
  hero.x = 5000; game.step(STEP);
  assert.equal(game.camera.left + game.camera.viewW, 1000, 'clamped at the right edge');
});

test('a scene factory can set up the camera while it builds the scene', () => {
  const game = new Game();
  game.start((g) => {
    const scene = new Scene();
    const hero = scene.add(new Node({ name: 'Hero', x: 500, y: 90 }));
    g.camera.follow(hero).setBounds(0, 0, 2000, 180);
    return scene;
  });
  game.step(STEP);
  assert.equal(game.camera.target, game.find('Hero'));
  assert.equal(game.camera.x, 500);
});

test('scenes round-trip through JSON, including your own registered types', () => {
  class Coin extends Area { static type = 'Coin'; static props = ['value']; setup() { super.setup(); this.value = 1; } }
  register(Coin);
  const map = TileMap.fromRows(['..G', 'GGG'], { G: { solid: true, color: '#38b764' } });
  const scene = new Scene({ name: 'Level1', children: [map, new Coin({ x: 40, y: 8, value: 5, tags: ['pickup'] }), new Shape({ kind: 'circle', color: '#f00' })] });
  const json = JSON.parse(JSON.stringify(scene.toJSON()));
  assert.equal(json.children[1].type, 'Coin');
  assert.equal(json.children[1].value, 5);
  assert.equal('rotation' in json.children[1], false, 'defaults are left out');
  const copy = fromJSON(json);
  assert.deepEqual(copy.toJSON(), json);
  assert.ok(copy.children[1] instanceof Coin);
  assert.deepEqual(copy.children[0].data, map.data);
  assert.throws(() => fromJSON({ type: 'Mystery' }), /register/);
});

test('Tiled JSON: import reads layers, properties and objects; export opens in Tiled and re-imports the same', () => {
  const tiled = {
    type: 'map', infinite: false, width: 3, height: 2, tilewidth: 16, tileheight: 16,
    tilesets: [{ firstgid: 1, name: 'ground', columns: 4, margin: 0, spacing: 0, tiles: [{ id: 0, properties: [{ name: 'solid', type: 'bool', value: true }] }, { id: 1, properties: [{ name: 'oneWay', type: 'bool', value: true }] }] }],
    layers: [
      { type: 'tilelayer', name: 'Ground', width: 3, height: 2, data: [0, 0, 2, 1, 1, 1 | 0x80000000] },
      { type: 'objectgroup', name: 'Spawns', objects: [{ name: 'start', type: 'Player', x: 0, y: 0, width: 16, height: 16, properties: [{ name: 'lives', type: 'int', value: 3 }] }] }
    ]
  };
  const root = TileMap.fromTiled(tiled);
  const map = root.children[0];
  assert.deepEqual(map.data, [0, 0, 2, 1, 1, 1], 'flip flags removed');
  assert.deepEqual(map.propsAt(0, 1), { solid: true });
  assert.deepEqual(map.propsAt(2, 0), { oneWay: true });
  assert.deepEqual(root.objects[0], { layer: 'Spawns', name: 'start', type: 'Player', x: 8, y: 8, w: 16, h: 16, props: { lives: 3 } });

  const out = TileMap.toTiled(root);
  assert.equal(out.layers[0].data.length, 6);
  const colourOnly = TileMap.toTiled(TileMap.fromRows(['ab'], { a: { color: '#f00' }, b: { color: '#0f0' } })).tilesets[0];
  assert.deepEqual([colourOnly.columns, colourOnly.tilecount, colourOnly.imagewidth, colourOnly.imageheight], [2, 2, 32, 16], 'Tiled and Phaser need real columns and image size');
  assert.equal(out.tilesets[0].tiles.find((t) => t.id === 0).properties[0].type, 'bool');
  const again = TileMap.fromTiled(out).children[0];
  assert.deepEqual(again.data, map.data);
  assert.deepEqual(again.tiles, map.tiles);
  assert.throws(() => TileMap.fromTiled({ ...tiled, infinite: true }), /infinite/);
});

test('bounce reflects velocity; tilesIn finds non-solid tiles like spikes', () => {
  const game = new Game();
  const wall = new Body({ x: 100, y: 0, w: 10, h: 200, static: true });
  const ball = new Body({ x: 50, y: 0, w: 8, h: 8, vx: 120, bounce: 1 });
  const map = TileMap.fromRows(['..^^'], { '^': { hazard: true } });
  game.start(new Scene({ children: [wall, ball, map] }));
  run(game, 0.5);
  assert.equal(ball.vx, -120);
  assert.deepEqual(map.tilesIn({ x: 20, y: 2, w: 40, h: 4 }).map((t) => [t.tx, t.props.hazard]), [[2, true], [3, true]]);
  assert.deepEqual(map.tilesIn({ x: 0, y: 0, w: 16, h: 16 }), []);
});

test('overlap() treats touching edges as not overlapping', () => {
  assert.equal(overlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }), false);
  assert.equal(overlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 9.5, y: 9.5, w: 10, h: 10 }), true);
});
