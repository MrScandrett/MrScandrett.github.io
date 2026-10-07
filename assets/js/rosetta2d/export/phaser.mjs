// phaser.mjs — export a running Rosetta 2D game as a Phaser 3 project (Arcade physics).
//
// Converts the scene (shapes, text, sprites, tilemaps from Tiled JSON, static and moving
// bodies, areas with enter/exit, timers, parallax, the HUD), collision layers and masks,
// gravity, bounce, the camera and the input actions. Each of your classes becomes a
// Phaser class that builds its own visuals and physics and registers itself, so it also
// works when you spawn one later. Your Rosetta 2D code sits inside each method as comments.
import { Body, Area, Shape, Sprite, TileMap, Text, Timer } from '../rosetta2d.mjs';
import {
  snapshot, settingsOf, baseOf, customFields, changedDefaults, methodsOf, hintsFor, probe, gameClasses, typeName,
  snake, pascal, ident, hex6, rgba, colourTilesetSVG, commentBlock
} from './common.mjs';
import { makeReport, readme } from './godot.mjs';

export const PHASER_VERSION = '3.80.1';

const num = (v) => (Number.isInteger(v) ? String(v) : String(+v.toFixed(5)));
const js = (v) => JSON.stringify(v);
const colour = (c) => `0x${hex6(c)}`;

/* ── runtime helpers shipped with every export ────────────────────────── */

const ROSETTA_JS = `// rosetta.js: small helpers that give Phaser the Rosetta 2D behaviours your game used.
// Read it: it is short, and every function says which Rosetta 2D idea it stands in for.

const KEY_NAMES = { Space: 'SPACE', Enter: 'ENTER', Escape: 'ESC', Tab: 'TAB', Backspace: 'BACKSPACE', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', ControlLeft: 'CTRL', ControlRight: 'CTRL', AltLeft: 'ALT', AltRight: 'ALT' };
const PAD_NAMES = { PadA: 'A', PadB: 'B', PadX: 'X', PadY: 'Y', PadL: 'L1', PadR: 'R1', PadL2: 'L2', PadR2: 'R2', PadLeft: 'left', PadRight: 'right', PadUp: 'up', PadDown: 'down' };
const DIGITS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];

/** Named input actions, like Rosetta 2D's input.bind / down / pressed / axis / vector. */
export class Actions {
  constructor(scene, bindings) {
    this.scene = scene;
    this.sources = {};
    this.was = {};
    for (const [name, codes] of Object.entries(bindings)) {
      this.sources[name] = codes.map((code) => this.source(code)).filter(Boolean);
      this.was[name] = false;
    }
    // remember last frame's state so pressed() is true for exactly one frame
    scene.events.on('postupdate', () => { for (const name in this.sources) this.was[name] = this.down(name); });
  }
  source(code) {
    const kb = this.scene.input.keyboard;
    const key = KEY_NAMES[code] || (/^Key([A-Z])$/.exec(code) || [])[1] || DIGITS[(/^Digit(\\d)$/.exec(code) || [])[1]];
    if (key && kb) { const k = kb.addKey(Phaser.Input.Keyboard.KeyCodes[key]); return () => k.isDown; }
    if (code === 'Pointer') return () => this.scene.input.activePointer.isDown;
    const pad = () => this.scene.input.gamepad && this.scene.input.gamepad.pad1;
    if (code === 'PadStart' || code === 'PadSelect') return () => !!(pad() && pad().buttons[code === 'PadStart' ? 9 : 8].pressed);
    if (PAD_NAMES[code]) return () => !!(pad() && pad()[PAD_NAMES[code]]);
    console.warn('rosetta.js: no Phaser key for', code);
    return null;
  }
  down(name) { return (this.sources[name] || []).some((isDown) => isDown()); }
  pressed(name) { return this.down(name) && !this.was[name]; }
  released(name) { return !this.down(name) && this.was[name]; }
  axis(negative, positive) { return (this.down(positive) ? 1 : 0) - (this.down(negative) ? 1 : 0); }
  vector(left, right, up, down) {
    const x = this.axis(left, right);
    const y = this.axis(up, down);
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
  }
}

/** Rosetta 2D's approach(): move v toward target by at most step. */
export const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));

/** Everything that collides, overlaps or updates, per scene. Objects add themselves. */
export function world(scene) {
  return scene.rosetta || (scene.rosetta = { movers: [], solids: [], areas: [], updaters: [] });
}

/** Collision layers and masks (bit flags), used as every collider's process callback. */
export function canCollide(mover, other) {
  const layer = other.tilemapLayer ? (other.tilemapLayer.getData('layer') ?? 1) : (other.getData ? other.getData('layer') ?? 1 : 1);
  return ((mover.getData('mask') ?? 1) & layer) !== 0;
}

function collide(scene, mover, solid) {
  const c = scene.physics.add.collider(mover, solid, null, canCollide);
  const drop = () => c.destroy();
  mover.once('destroy', drop);
  solid.once('destroy', drop);
}
/** A moving body: it stops at every solid, now and any added later (Rosetta 2D does this for you). */
export function addMover(obj) {
  const w = world(obj.scene);
  w.movers.push(obj);
  for (const s of w.solids) collide(obj.scene, obj, s);
  return obj;
}
/** A wall: static bodies and tile layers. */
export function addSolid(obj) {
  const w = world(obj.scene);
  w.solids.push(obj);
  for (const m of w.movers) collide(obj.scene, m, obj);
  return obj;
}
export function addArea(obj) { world(obj.scene).areas.push(obj); return obj; }
/** Objects whose fixedUpdate(dt) / update(dt) the scene calls every frame. */
export function addUpdater(obj) { world(obj.scene).updaters.push(obj); return obj; }

/** Give a container an Arcade body the size of a Rosetta 2D hitbox (centred, plus any offset). */
export function giveBody(obj, o) {
  obj.setSize(o.w, o.h);
  obj.scene.physics.add.existing(obj, !!o.static);
  if (o.offsetX || o.offsetY) obj.body.setOffset(o.offsetX || 0, o.offsetY || 0);
  obj.setData({ layer: o.layer ?? 1, mask: o.mask ?? 1, tags: o.tags || [] });
  if (o.area) {
    obj.body.setAllowGravity(false);
    obj.body.moves = false;
    addArea(obj);
  } else if (o.static) {
    addSolid(obj);
  } else {
    obj.body.setVelocity(o.vx || 0, o.vy || 0);
    if (o.gravityScale === 0) obj.body.setAllowGravity(false);
    else if (o.gravityScale && o.gravityScale !== 1) obj.body.setGravityY(obj.scene.physics.world.gravity.y * (o.gravityScale - 1));
    if (o.bounce) obj.body.setBounce(o.bounce);
    addMover(obj);
  }
  return obj;
}

/** A Rosetta 2D Body or Area that is not one of your classes. */
export function makeBody(scene, x, y, o) { return giveBody(scene.add.container(x, y), o); }
export function makeArea(scene, x, y, o) {
  const a = giveBody(scene.add.container(x, y), { ...o, area: true });
  if (o.follow) { a.follow = o.follow; a.followX = o.followX || 0; a.followY = o.followY || 0; }
  return a;
}

const rect = (o) => (o.body ? { x: o.body.x, y: o.body.y, w: o.body.width, h: o.body.height } : null);
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Rosetta 2D's Area "enter" / "exit": fire once when something starts or stops overlapping. */
export function trackAreas(scene) {
  const inside = new Map();
  scene.events.on('update', () => {
    for (const a of world(scene).areas) if (a.follow && a.follow.active) a.setPosition(a.follow.x + a.followX, a.follow.y + a.followY);
  });
  scene.events.on('postupdate', () => {
    const w = world(scene);
    for (const key of ['movers', 'solids', 'areas', 'updaters']) w[key] = w[key].filter((o) => o.active);
    const others = w.movers.concat(w.solids.filter((s) => !s.tilemap), w.areas);
    for (const a of w.areas) {
      const before = inside.get(a) || new Set();
      const now = new Set();
      const ra = rect(a);
      for (const o of others) {
        if (o === a || o === a.follow || !((o.getData('layer') ?? 1) & (a.getData('mask') ?? 1))) continue;
        const ro = rect(o);
        if (ro && overlaps(ra, ro)) now.add(o);
      }
      for (const o of now) if (!before.has(o)) a.emit('enter', o);
      for (const o of before) if (!now.has(o)) a.emit('exit', o);
      inside.set(a, now);
    }
  });
}
`;

/* ── code for objects ─────────────────────────────────────────────────── */

function bodyOptions(n, extra = {}) {
  const o = { w: n.w, h: n.h, layer: n.layer, mask: n.mask, tags: n.tags };
  if (n.offsetX) o.offsetX = n.offsetX;
  if (n.offsetY) o.offsetY = n.offsetY;
  if (n instanceof Body) {
    if (n.static) o.static = true;
    else {
      if (n.vx) o.vx = n.vx;
      if (n.vy) o.vy = n.vy;
      if (n.gravityScale !== 1) o.gravityScale = n.gravityScale;
      if (n.bounce) o.bounce = n.bounce;
    }
  }
  return { ...o, ...extra };
}

/**
 * Lines that create one visual node (and its visual children).
 * scene: JS expression for the Phaser scene; into: container expression, or null for the scene.
 */
function visualCode(snap, scene, into, at, ctx, extras = []) {
  const n = snap.node;
  const out = [];
  const mods = [...extras];
  if (n.z) mods.push(`.setDepth(${num(n.z)})`);
  if (n.alpha !== 1) mods.push(`.setAlpha(${num(n.alpha)})`);
  if (n.visible === false) mods.push('.setVisible(false)');
  if (n.rotation) mods.push(`.setRotation(${num(n.rotation)})`);
  if (n.scaleX !== 1 || n.scaleY !== 1) mods.push(`.setScale(${num(n.scaleX)}, ${num(n.scaleY)})`);
  const x = num(at.x);
  const y = num(at.y);
  let expr;
  if (n instanceof Shape) {
    const fn = n.kind === 'circle' ? 'ellipse' : 'rectangle';
    expr = `${scene}.add.${fn}(${x}, ${y}, ${num(n.w)}, ${num(n.h)}, ${colour(n.color || '#ffffff')}, ${num(rgba(n.color).a)})${n.outline ? `.setStrokeStyle(1, ${colour(n.outline)})` : ''}`;
  } else if (n instanceof Text) {
    const ox = { left: 0, center: 0.5, right: 1 }[n.align] ?? 0;
    expr = `${scene}.add.text(${x}, ${y}, ${js(String(n.text))}, { fontFamily: ${js(n.font)}, fontSize: '${num(n.size)}px', color: '#${hex6(n.color)}', align: ${js(n.align)} }).setOrigin(${ox}, 0)`;
  } else if (n instanceof Sprite) {
    const img = typeof n.texture === 'string' ? ctx.images[n.texture] : null;
    if (img) {
      const file = `assets/${snake(n.texture)}.${img.ext || 'png'}`;
      ctx.files[file] = img.bytes;
      const fw = n.frameWidth || img.width;
      const fh = n.frameHeight || img.height;
      ctx.preload.add(`    this.load.spritesheet(${js(n.texture)}, ${js(file)}, { frameWidth: ${fw}, frameHeight: ${fh} });`);
      for (const [an, a] of Object.entries(n.anims)) out.push(`if (!${scene}.anims.exists(${js(an)})) ${scene}.anims.create({ key: ${js(an)}, frames: ${scene}.anims.generateFrameNumbers(${js(n.texture)}, { frames: ${js(a.frames)} }), frameRate: ${num(a.fps || 10)}, repeat: ${a.loop === false ? 0 : -1} });`);
      expr = `${scene}.add.sprite(${x}, ${y}, ${js(n.texture)}, ${n.frame}).setOrigin(${num(n.originX)}, ${num(n.originY)}).setFlip(${n.flipX}, ${n.flipY})`;
      if (n.animation) mods.push(`.play(${js(n.animation)})`);
    } else {
      ctx.report.warn(`Sprite "${n.name}": its image was not provided, so it is exported as a placeholder.`);
      expr = `${scene}.add.rectangle(${x}, ${y}, 16, 16, 0xff00ff) /* placeholder: add the image */`;
    }
  } else {
    expr = `${scene}.add.container(${x}, ${y})`;
  }
  const kids = snap.children.filter((c) => !(c.node instanceof Body || c.node instanceof Area || c.node instanceof TileMap || c.node instanceof Timer || c.custom));
  if (kids.length) {
    const v = `${ident(n.name)}${++ctx.counter}`;
    out.push(`const ${v} = ${expr}${mods.join('')};`);
    for (const k of kids) out.push(...visualCode(k, scene, v, { x: k.node.x, y: k.node.y }, ctx));
    if (into) out.push(`${into}.add(${v});`);
    return out;
  }
  out.push(into ? `${into}.add(${expr}${mods.join('')});` : `${expr}${mods.join('')};`);
  return out;
}

/* ── classes ──────────────────────────────────────────────────────────── */

function classFile(C, ctx) {
  const base = baseOf(C);
  const type = typeName(C);
  const name = pascal(type);
  const methods = methodsOf(C);
  const fields = customFields(C);
  const changed = changedDefaults(C);
  const inst = probe(C);
  if (!inst) ctx.report.warn(`${type}: its ready() needs the real scene, so ${name}.js builds no visuals for it. Add them in the constructor.`);
  const proto = inst || new C();
  const lines = [
    `// Exported from the Rosetta 2D class ${type} (extends ${base.type}).`,
    '// Your original code is kept inside each method as comments. Translate it line by line,',
    '// using the hints, then delete the comments. See README.md for the checklist.',
    "import { approach, giveBody, makeBody, makeArea, addUpdater } from '" + '../rosetta.js' + "';",
    '',
    `export class ${name} extends Phaser.GameObjects.Container {`,
    '  constructor(scene, x, y) {',
    '    super(scene, x, y);',
    '    scene.add.existing(this);'
  ];
  if (base === Body || base === Area) {
    const o = bodyOptions(proto, base === Area ? { area: true } : {});
    delete o.vx; delete o.vy;
    if (base === Body && !proto.static) {
      if (changed.gravityScale !== undefined) o.gravityScale = changed.gravityScale;
      if (changed.bounce) o.bounce = changed.bounce;
    }
    lines.push(`    giveBody(this, ${js(o)}); // ${base === Area ? 'an area: reports "enter" and "exit"' : 'hitbox, layers, gravity, bounce'}`);
  } else if (proto.tags.length) {
    lines.push(`    this.setData({ tags: ${js(proto.tags)} });`);
  }
  for (const f of fields) lines.push(`    this.${f.name} = ${js(f.value)};`);

  // children the class makes for itself (Rosetta 2D builds them in ready())
  let k = 0;
  for (const c of inst ? inst.children : []) {
    if (c instanceof Timer) continue;
    if (c instanceof Area || c instanceof Body) {
      const prop = c.name === typeName(c.constructor) ? `${ident(c.name)}${++k}` : ident(c.name);
      const opts = js(bodyOptions(c, c instanceof Area ? { follow: '__THIS__', followX: c.x, followY: c.y } : {})).replace('"__THIS__"', 'this');
      lines.push(`    this.${prop} = ${c instanceof Area ? 'makeArea' : 'makeBody'}(scene, x + ${num(c.x)}, y + ${num(c.y)}, ${opts});`);
    } else {
      for (const l of visualCode(snapshot(c), 'scene', 'this', { x: c.x, y: c.y }, ctx)) lines.push(`    ${l}`);
    }
  }
  const setup = methods.find((m) => m.name === 'setup');
  if (setup) lines.push('    // Rosetta 2D setup(), now the lines above:', commentBlock(setup.body, '    //'));
  if (methods.some((m) => m.name === 'fixedUpdate' || m.name === 'update')) lines.push('    addUpdater(this); // the scene calls fixedUpdate(dt) and update(dt) every frame');
  if (methods.some((m) => m.name === 'ready')) lines.push('    this.ready();');
  lines.push('  }', '');

  const labels = { ready: 'ready()', fixedUpdate: 'fixedUpdate(dt)', update: 'update(dt)' };
  const what = { ready: "runs once, at the end of the constructor (the visuals above came from Rosetta 2D's ready())", fixedUpdate: 'runs every frame, dt in seconds; Arcade moves the body for you', update: 'runs every frame, dt in seconds' };
  const order = ['ready', 'fixedUpdate', 'update'];
  const list = order.map((n) => methods.find((m) => m.name === n)).filter(Boolean)
    .concat(methods.filter((m) => !order.includes(m.name) && !['setup', 'constructor', 'draw', 'onDestroy'].includes(m.name)));
  for (const m of list) {
    lines.push(`  // ${what[m.name] || 'your own method'}`, `  ${labels[m.name] || `${m.name}(${m.params})`} {`);
    lines.push(`    // Rosetta 2D ${m.name}(${m.params}):`, commentBlock(m.body, '    //  '));
    const hints = hintsFor(m.body, 'phaser');
    if (hints.length) lines.push('    // Hints:', ...hints.map((h) => `    //   ${h.from}  →  ${h.to}`));
    lines.push('  }', '');
  }
  const onDestroy = methods.find((m) => m.name === 'onDestroy');
  if (onDestroy) lines.push('  preDestroy() {', '    // Rosetta 2D onDestroy():', commentBlock(onDestroy.body, '    //  '), '  }', '');
  lines.push('}', '');
  return { name, file: `objects/${name}.js`, text: lines.join('\n').replace(/\n\n\n+/g, '\n\n') };
}

/* ── the export ───────────────────────────────────────────────────────── */

/**
 * exportPhaser(game, { sources, images }) → { files, report }
 *   sources: { 'platformer.mjs': text } your original files, copied into original/
 *   images:  { textureKey: { bytes: Uint8Array, ext: 'png', width, height } }
 */
export function exportPhaser(game, { sources = {}, images = {} } = {}) {
  const report = makeReport();
  const settings = settingsOf(game);
  const root = snapshot(game.scene);
  const files = {};
  const ctx = { images, files, report, preload: new Set(), counter: 0 };
  const classes = new Map();
  const create = [];
  const vars = new Map();
  const v = (prefix) => `${prefix}${++ctx.counter}`;

  const nameCount = new Map();
  (function count(sn) { nameCount.set(sn.node.name, (nameCount.get(sn.node.name) || 0) + 1); sn.children.forEach(count); })(root);
  const register = (n, name) => { if (nameCount.get(n.name) === 1) create.push(`    this.named[${js(n.name)}] = ${name};`); };

  const useClass = (C) => {
    if (!classes.has(C)) {
      const info = classFile(C, ctx);
      files[info.file] = info.text;
      classes.set(C, info);
      report.todo(`Translate ${info.file} (from your ${typeName(C)} class).`);
    }
    return classes.get(C).name;
  };
  const isPhysical = (c) => c.node instanceof Body || c.node instanceof Area || c.node instanceof TileMap || c.node instanceof Timer || c.custom;

  function emit(snap, offset, scroll) {
    const n = snap.node;
    const p = n.parallax ?? 1;
    const sf = p !== 1 ? p : scroll;
    const wx = offset.x + n.x;
    const wy = offset.y + n.y;
    const sfMod = sf !== 1 ? [`.setScrollFactor(${num(sf)})`] : [];
    const mods = () => {
      const m = [...sfMod];
      if (n.z) m.push(`.setDepth(${num(n.z)})`);
      if (n.alpha !== 1) m.push(`.setAlpha(${num(n.alpha)})`);
      if (n.visible === false) m.push('.setVisible(false)');
      return m.join('');
    };

    if (snap.custom) {
      // your class builds its own visuals and physics: see objects/
      const name = v(ident(typeName(n.constructor)));
      create.push(`    const ${name} = new ${useClass(n.constructor)}(this, ${num(wx)}, ${num(wy)})${mods()};`);
      if (n instanceof Body && (n.vx || n.vy)) create.push(`    ${name}.body.setVelocity(${num(n.vx)}, ${num(n.vy)});`);
      for (const f of customFields(n.constructor)) if (n[f.name] !== f.value && ['number', 'string', 'boolean'].includes(typeof n[f.name])) create.push(`    ${name}.${f.name} = ${js(n[f.name])};`);
      vars.set(n, name);
      register(n, name);
      return;
    }
    if (n instanceof Body || n instanceof Area) {
      const name = v(n instanceof Body ? 'body' : 'area');
      create.push(`    const ${name} = ${n instanceof Body ? 'makeBody' : 'makeArea'}(this, ${num(wx)}, ${num(wy)}, ${js(bodyOptions(n))})${mods()};`);
      vars.set(n, name);
      register(n, name);
      for (const c of snap.children) {
        if (isPhysical(c)) emit(c, { x: wx, y: wy }, sf);
        else create.push(...visualCode(c, 'this', name, { x: c.node.x, y: c.node.y }, ctx).map((l) => `    ${l}`));
      }
      return;
    }
    if (n instanceof TileMap) {
      const name = v('layer');
      const key = snake(n.name);
      const ts = n.tileset;
      const img = ts && images[ts.texture];
      let imageFile;
      let textureKey;
      if (img) {
        imageFile = `assets/${snake(ts.texture)}.${img.ext || 'png'}`;
        files[imageFile] = img.bytes;
        textureKey = snake(ts.texture);
        ctx.preload.add(`    this.load.image(${js(textureKey)}, ${js(imageFile)});`);
      } else {
        if (ts && ts.texture) report.warn(`TileMap "${n.name}": the tileset image "${ts.texture}" was not provided, so its tiles are exported as coloured squares.`);
        const atlas = colourTilesetSVG(n);
        imageFile = `assets/${key}_tiles.svg`;
        files[imageFile] = atlas.svg;
        textureKey = `${key}_tiles`;
        ctx.preload.add(`    this.load.svg(${js(textureKey)}, ${js(imageFile)}, { width: ${atlas.count * n.tileWidth}, height: ${n.tileHeight} });`);
      }
      const tiled = TileMap.toTiled(n);
      const tilesetName = img ? ts.texture : 'tiles';
      Object.assign(tiled.tilesets[0], { name: tilesetName, image: imageFile.replace('assets/', '') });
      files[`assets/${key}.json`] = JSON.stringify(tiled, null, 2);
      ctx.preload.add(`    this.load.tilemapTiledJSON(${js(key)}, ${js(`assets/${key}.json`)});`);
      create.push(`    // ${n.name}: a tilemap from Tiled JSON`);
      create.push(`    const ${name}Map = this.make.tilemap({ key: ${js(key)} });`);
      create.push(`    const ${name} = ${name}Map.createLayer(${js(n.name)}, ${name}Map.addTilesetImage(${js(tilesetName)}, ${js(textureKey)}), ${num(wx)}, ${num(wy)})${mods()};`);
      create.push(`    ${name}.setData('layer', ${n.layer});`);
      if (n.collides) {
        create.push(`    ${name}.setCollisionByProperty({ solid: true });`);
        if (Object.values(n.tiles).some((t) => t.oneWay && !t.solid)) create.push(`    ${name}.forEachTile((tile) => { if (tile.properties.oneWay) tile.setCollision(false, false, true, false); }); // one-way: solid from above only`);
        create.push(`    addSolid(${name});`);
      }
      vars.set(n, name);
      register(n, name);
      return;
    }
    if (n instanceof Timer) {
      const name = v('timer');
      create.push(`    const ${name} = new Phaser.Events.EventEmitter(); // listen with ${name}.on('timeout', fn)`);
      if (n.autostart || n.running) create.push(`    this.time.addEvent({ delay: ${num(n.wait * 1000)}, loop: ${!n.oneShot}, callback: () => ${name}.emit('timeout') });`);
      vars.set(n, name);
      register(n, name);
      return;
    }
    // shapes, text, sprites and plain nodes, with their visual children
    create.push(...visualCode(snap, 'this', null, { x: wx, y: wy }, ctx, sfMod).map((l) => `    ${l}`));
    for (const c of snap.children) if (isPhysical(c)) emit(c, { x: wx, y: wy }, sf);
  }

  for (const c of root.children) emit(c, { x: 0, y: 0 }, 1);

  // classes the game spawns later still get a file
  for (const C of gameClasses(root, sources)) {
    const had = classes.has(C);
    useClass(C);
    if (!had) report.todo(`${typeName(C)} appears while the game runs: spawn it with new ${pascal(typeName(C))}(this, x, y).`);
  }

  // camera
  const cam = settings.camera;
  const camLines = [];
  const target = cam.target && vars.get(cam.target);
  const lerp = cam.smoothing > 0 ? +(1 - Math.exp(-(1 / 60) / cam.smoothing)).toFixed(4) : 1;
  if (cam.zoom !== 1) camLines.push(`    this.cameras.main.setZoom(${num(cam.zoom)});`);
  if (cam.bounds) camLines.push(`    this.cameras.main.setBounds(${num(cam.bounds.x)}, ${num(cam.bounds.y)}, ${num(cam.bounds.w)}, ${num(cam.bounds.h)});`);
  if (target) {
    camLines.push(`    this.cameras.main.startFollow(${target}, true, ${lerp}, ${lerp});`);
    if (cam.deadzone[0] || cam.deadzone[1]) camLines.push(`    this.cameras.main.setDeadzone(${num(cam.deadzone[0])}, ${num(cam.deadzone[1])});`);
  } else {
    camLines.push(`    this.cameras.main.centerOn(${num(cam.x)}, ${num(cam.y)});`);
  }

  const sceneClass = pascal(settings.title);
  const imports = [...classes.values()].map((c) => `import { ${c.name} } from './${c.file}';`);
  files['main.js'] = [
    `// ${settings.title}: exported from Rosetta 2D to Phaser ${PHASER_VERSION}.`,
    "import { Actions, world, addSolid, makeBody, makeArea, trackAreas } from '" + './rosetta.js' + "';",
    ...imports,
    '',
    `class ${sceneClass} extends Phaser.Scene {`,
    `  constructor() { super(${js(settings.title)}); }`,
    '',
    '  preload() {',
    ...ctx.preload,
    '  }',
    '',
    '  create() {',
    '    this.named = {}; // find objects by their Rosetta 2D name: this.named.Player',
    `    this.actions = new Actions(this, ${js(settings.actions)});`,
    '    trackAreas(this); // Area "enter" / "exit" events',
    '',
    ...create,
    '',
    ...camLines,
    '  }',
    '',
    '  update(time, delta) {',
    '    const dt = delta / 1000; // Phaser gives milliseconds; Rosetta 2D used seconds',
    '    for (const o of world(this).updaters) {',
    '      if (!o.active) continue;',
    '      if (o.fixedUpdate) o.fixedUpdate(dt);',
    '      if (o.update) o.update(dt);',
    '    }',
    '  }',
    '}',
    '',
    'window.game = new Phaser.Game({ // window.game is handy in the browser console',
    '  type: Phaser.AUTO,',
    "  parent: 'game',",
    `  width: ${settings.width},`,
    `  height: ${settings.height},`,
    `  pixelArt: ${settings.pixelArt},`,
    `  backgroundColor: '#${hex6(settings.background)}',`,
    '  input: { gamepad: true },',
    `  physics: { default: 'arcade', arcade: { gravity: { x: ${num(settings.gravity.x)}, y: ${num(settings.gravity.y)} }, debug: false } },`,
    '  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },',
    `  scene: [${sceneClass}]`,
    '});',
    ''
  ].join('\n');
  files['rosetta.js'] = ROSETTA_JS;
  files['index.html'] = [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${settings.title.replace(/</g, '&lt;')}</title>`,
    '  <style>html, body { margin: 0; height: 100%; background: #111; } #game { width: 100%; height: 100%; }</style>',
    '</head>',
    '<body>',
    '  <div id="game"></div>',
    `  <script src="https://cdn.jsdelivr.net/npm/phaser@${PHASER_VERSION}/dist/phaser.min.js"></script>`,
    '  <script type="module" src="main.js"></script>',
    '</body>',
    '</html>',
    ''
  ].join('\n');
  report.todo('Rebuild the scene-level logic (score, win/lose, scene changes) in main.js create().');
  for (const [name, text] of Object.entries(sources)) files[`original/${name}`] = text;
  files['README.md'] = readme(settings, report, 'phaser');
  return { files, report };
}
