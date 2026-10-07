// Rosetta 2D example: a small platformer. No image files: every picture is a Shape.
import { Game, Scene, Body, Area, TileMap, Shape, Text, register, approach } from '../rosetta2d.mjs';

const LEVEL = [
  '................................................',
  '................................................',
  '................................................',
  '..............o.o...............................',
  '.............-----.............o................',
  '.......o......................###......o........',
  '......###...........o.................###.......',
  '...................###.....................o....',
  '...@........o.............................###...',
  '.........................................F......',
  'GGGGGGGGGGGGGG...GGGGGGGGGGGGGGGG^^^GGGGGGGGGGGGG',
  'DDDDDDDDDDDDDD...DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD'
];
const TILES = {
  G: { solid: true, color: '#38b764' },
  D: { solid: true, color: '#8f563b' },
  '#': { solid: true, color: '#a53030' },
  '-': { oneWay: true, color: '#b86f50' },
  '^': { hazard: true, color: '#94b0c2' }
};

class Player extends Body {
  static type = 'Player';
  setup() {
    super.setup();
    this.w = 10;
    this.h = 14;
    this.tags = ['player'];
    this.coyote = 0; // seconds left to jump after walking off a ledge
    this.buffer = 0; // seconds a jump press is remembered before landing
  }
  ready() {
    // visuals are built by code, so they are not saved in the scene JSON
    this.add(new Shape({ w: 10, h: 14, color: '#e4572e', serializable: false }));
    this.eye = this.add(new Shape({ x: 2, y: -3, w: 2, h: 2, color: '#1a1c2c', serializable: false }));
    this.start = { x: this.x, y: this.y };
  }
  fixedUpdate(dt) {
    const input = this.game.input;
    const dir = input.axis('left', 'right');
    this.vx = approach(this.vx, dir * 110, (dir ? 900 : 1400) * dt);
    if (dir) this.eye.x = 2 * dir;

    this.coyote = this.onFloor ? 0.1 : this.coyote - dt;
    this.buffer = input.pressed('jump') ? 0.12 : this.buffer - dt;
    if (this.buffer > 0 && this.coyote > 0) {
      this.vy = -300;
      this.buffer = this.coyote = 0;
      this.game.audio.beep({ freq: 420, slide: 380, duration: 0.12 });
    }
    if (!input.down('jump') && this.vy < -110) this.vy = -110; // let go early for a short hop

    const map = this.parent.find('Ground');
    const onSpikes = map.tilesIn(this.bounds()).some((t) => t.props.hazard);
    if (onSpikes || this.y > map.height + 40) this.die();
  }
  die() {
    this.game.camera.shake(4, 0.3);
    this.game.audio.beep({ freq: 180, slide: -120, duration: 0.3, type: 'sawtooth' });
    this.x = this.start.x;
    this.y = this.start.y;
    this.vx = this.vy = 0;
  }
}

class Coin extends Area {
  static type = 'Coin';
  setup() { super.setup(); this.w = 8; this.h = 8; this.tags = ['coin']; }
  ready() {
    this.add(new Shape({ kind: 'circle', w: 8, h: 8, color: '#ffc93c', outline: '#b8401d', serializable: false }));
    this.on('enter', (other) => {
      if (!other.is('player')) return;
      this.game.audio.beep({ freq: 880, slide: 440, duration: 0.08 });
      this.destroy();
      this.parent.emit('coin');
    });
  }
}

class Flag extends Area {
  static type = 'Flag';
  setup() { super.setup(); this.w = 8; this.h = 32; this.offsetY = -8; } // tall hitbox, standing on the ground
  ready() {
    this.add(new Shape({ x: -3, y: -8, w: 2, h: 32, color: '#1a1c2c', serializable: false }));
    this.add(new Shape({ x: 3, y: -18, w: 10, h: 8, color: '#3b5dc9', serializable: false }));
    this.on('enter', (other) => { if (other.is('player')) this.parent.emit('win'); });
  }
}

register(Player, Coin, Flag);

function level(game) {
  const scene = new Scene({ name: 'Level 1' });

  // far hills scroll slower than the level: parallax
  for (let i = 0; i < 8; i++) {
    scene.add(new Shape({ kind: 'circle', x: i * 90, y: 170, w: 150, h: 110, color: '#a6dbe6', parallax: 0.3, z: -2 }));
  }

  const map = scene.add(TileMap.fromRows(LEVEL, TILES, { name: 'Ground' }));
  LEVEL.forEach((row, ty) => [...row].forEach((ch, tx) => {
    const at = { x: tx * 16 + 8, y: ty * 16 + 8 };
    if (ch === '@') scene.add(new Player({ ...at, name: 'Player' }));
    if (ch === 'o') scene.add(new Coin(at));
    if (ch === 'F') scene.add(new Flag(at));
  }));

  const total = scene.findAll('coin').length;
  let got = 0;
  const best = game.load('platformer-best', 0);
  const hud = scene.add(new Text({ x: 6, y: 6, parallax: 0, z: 10, color: '#1a1c2c' }));
  const showScore = () => { hud.text = `coins ${got}/${total}   best ${Math.max(best, got)}`; };
  showScore();
  scene.on('coin', () => { got++; showScore(); });
  scene.on('win', () => {
    if (got > best) game.save('platformer-best', got);
    scene.add(new Text({ x: 160, y: 70, parallax: 0, z: 10, size: 16, align: 'center', color: '#1a1c2c', text: 'Delivered!' }));
    scene.after(2, () => game.change(level));
  });

  game.camera.follow(scene.find('Player'), { deadzone: [48, 32], smoothing: 0.12 }).setBounds(0, 0, map.width, map.height);
  return scene;
}

export function create(canvas) {
  const game = new Game({ canvas, width: 320, height: 180, background: '#d8f3f9', gravity: 900 });
  game.input
    .bind('left', ['ArrowLeft', 'KeyA', 'PadLeft'])
    .bind('right', ['ArrowRight', 'KeyD', 'PadRight'])
    .bind('jump', ['Space', 'ArrowUp', 'KeyW', 'PadA']);
  return game.start(level);
}
