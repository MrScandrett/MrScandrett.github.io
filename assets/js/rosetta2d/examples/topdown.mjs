// Rosetta 2D example: top-down "collect and dodge". Shows vector input, bouncing
// bodies, a spawning Timer, collision layers, scene changes and a saved high score.
import { Game, Scene, Body, Area, Shape, Text, Timer, register } from '../rosetta2d.mjs';

const W = 320;
const H = 180;
// collision layers are bit flags: 1, 2, 4, 8…
const WALLS = 1;
const PLAYER = 2;
const ENEMY = 4;

class Player extends Body {
  static type = 'Player';
  setup() {
    super.setup();
    this.w = this.h = 10;
    this.gravityScale = 0;
    this.layer = PLAYER;
    this.mask = WALLS;
    this.tags = ['player'];
  }
  ready() { this.add(new Shape({ kind: 'circle', w: 10, h: 10, color: '#73eff7', outline: '#1a1c2c', serializable: false })); }
  fixedUpdate() {
    const move = this.game.input.vector('left', 'right', 'up', 'down');
    this.vx = move.x * 95;
    this.vy = move.y * 95;
  }
}

class Enemy extends Body {
  static type = 'Enemy';
  setup() {
    super.setup();
    this.w = this.h = 12;
    this.gravityScale = 0;
    this.bounce = 1; // walls reflect it
    this.layer = ENEMY;
    this.mask = WALLS;
  }
  ready() {
    this.add(new Shape({ w: 12, h: 12, color: '#e4572e', serializable: false }));
    const bite = this.add(new Area({ w: 10, h: 10, layer: 0, mask: PLAYER, serializable: false }));
    bite.on('enter', () => this.parent.emit('caught'));
  }
}

class Gem extends Area {
  static type = 'Gem';
  setup() { super.setup(); this.w = this.h = 8; this.mask = PLAYER; }
  ready() {
    this.add(new Shape({ kind: 'circle', w: 8, h: 8, color: '#ffc93c', serializable: false }));
    this.on('enter', () => {
      this.game.audio.beep({ freq: 760, slide: 500, duration: 0.07 });
      this.destroy();
      this.parent.emit('gem');
    });
  }
}

register(Player, Enemy, Gem);

const rand = (lo, hi) => lo + Math.random() * (hi - lo);

function arena(game) {
  const scene = new Scene({ name: 'Arena' });
  // four static walls
  for (const [x, y, w, h] of [[W / 2, 2, W, 4], [W / 2, H - 2, W, 4], [2, H / 2, 4, H], [W - 2, H / 2, 4, H]]) {
    scene.add(new Body({ x, y, w, h, static: true, layer: WALLS }));
    scene.add(new Shape({ x, y, w, h, color: '#566c86' }));
  }
  scene.add(new Player({ x: W / 2, y: H / 2, name: 'Player' }));
  scene.add(new Enemy({ x: 40, y: 40, vx: 60, vy: 45 }));

  let score = 0;
  const hud = scene.add(new Text({ x: 8, y: 8, z: 10, color: '#f4f4f4' }));
  const show = () => { hud.text = `gems ${score}   best ${game.load('topdown-best', 0)}`; };
  show();

  // a new gem every 1.2 s; every fifth gem brings another enemy
  const spawner = scene.add(new Timer({ wait: 1.2, oneShot: false, autostart: true }));
  spawner.on('timeout', () => scene.add(new Gem({ x: rand(20, W - 20), y: rand(20, H - 20) })));
  scene.on('gem', () => {
    score++;
    show();
    if (score % 5 === 0) scene.add(new Enemy({ x: rand(30, W - 30), y: 30, vx: rand(-80, 80), vy: rand(40, 80) }));
  });
  scene.on('caught', () => {
    if (score > game.load('topdown-best', 0)) game.save('topdown-best', score);
    game.audio.beep({ freq: 200, slide: -150, duration: 0.35, type: 'sawtooth' });
    game.change(() => gameOver(game, score));
  });
  return scene;
}

function gameOver(game, score) {
  const scene = new Scene({ name: 'Game Over' });
  scene.add(new Text({ x: W / 2, y: 60, size: 16, align: 'center', color: '#f4f4f4', text: 'Caught!' }));
  scene.add(new Text({ x: W / 2, y: 90, align: 'center', color: '#94b0c2', text: `${score} gems · best ${game.load('topdown-best', 0)}\n\npress Space or click to play again` }));
  scene.update = () => { if (game.input.pressed('start')) game.change(arena); };
  return scene;
}

export function create(canvas) {
  const game = new Game({ canvas, width: W, height: H, background: '#1a1c2c' });
  game.input
    .bind('left', ['ArrowLeft', 'KeyA', 'PadLeft'])
    .bind('right', ['ArrowRight', 'KeyD', 'PadRight'])
    .bind('up', ['ArrowUp', 'KeyW', 'PadUp'])
    .bind('down', ['ArrowDown', 'KeyS', 'PadDown'])
    .bind('start', ['Space', 'Enter', 'PadA', 'PadStart', 'Pointer']);
  return game.start(arena);
}
