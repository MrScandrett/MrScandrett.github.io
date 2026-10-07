/* rosetta2d.mjs — Rosetta 2D, the in-house 2D game engine.
 *
 * Small on purpose, and neutral on purpose. Every idea here uses the shape that
 * Godot, Unity, Unreal, GameMaker, Phaser and Pygame share, so what students learn
 * transfers. Each API has a row in the Tool Rosetta (data/tool-rosetta.json,
 * column "r2d") showing the same idea in the other engines.
 *
 * Shared conventions
 *   - Pixels, y grows downward, angles in radians.
 *   - x, y is an object's CENTRE (sprites, shapes, hitboxes). TileMap and Text are the
 *     exceptions: their x, y is the top-left corner, as in Tiled and most engines.
 *   - Delta time is always in seconds.
 *   - fixedUpdate(dt) runs at a fixed 60 Hz for movement and physics; update(dt) runs
 *     once per screen refresh for animation, UI and the camera.
 *   - Scenes are trees of Nodes and serialise to plain JSON (toJSON / fromJSON);
 *     tilemaps read and write Tiled JSON. That data is what exporters to other
 *     engines translate.
 *
 * No dependencies. Runs headless (no canvas) for tests: new Game() then game.step(dt).
 */

export const VERSION = '0.1.0';

/* ── Small maths helpers ─────────────────────────────────────────────────── */

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
/** Axis-aligned rectangles {x, y, w, h} (top-left corner). Touching edges do not count. */
export const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const EPS = 1e-6;

/* ── Signals ─────────────────────────────────────────────────────────────── */

export class Emitter {
  /** Listen for a signal. Returns a function that stops listening. */
  on(name, fn) {
    ((this._ev ||= {})[name] ||= []).push(fn);
    return () => this.off(name, fn);
  }
  once(name, fn) {
    const off = this.on(name, (...args) => { off(); fn.apply(this, args); });
    return off;
  }
  off(name, fn) {
    const list = this._ev && this._ev[name];
    if (!list) return;
    const i = list.indexOf(fn);
    if (i !== -1) list.splice(i, 1);
  }
  emit(name, ...args) {
    const list = this._ev && this._ev[name];
    if (list) for (const fn of list.slice()) fn.apply(this, args);
    return this;
  }
}

/* ── Type registry (for fromJSON and exporters) ──────────────────────────── */

const registry = {};
const typeOf = (C) => (Object.prototype.hasOwnProperty.call(C, 'type') ? C.type : C.name);
/** Make your own Node classes loadable by fromJSON. Give them `static type = 'Coin'`. */
export function register(...classes) {
  for (const C of classes) registry[typeOf(C)] = C;
}
export const types = registry;

function propsOf(C) {
  const out = [];
  for (let c = C; c && c !== Emitter; c = Object.getPrototypeOf(c)) {
    if (Object.prototype.hasOwnProperty.call(c, 'props')) for (const p of c.props) if (!out.includes(p)) out.push(p);
  }
  return out;
}
const defaultsCache = new Map();
function defaultsFor(C) {
  if (!defaultsCache.has(C)) {
    let d = null;
    try { d = new C(); } catch (e) { /* constructor needs arguments: keep every value */ }
    defaultsCache.set(C, d);
  }
  return defaultsCache.get(C);
}
const isPlain = (v) => v === null || typeof v !== 'object' || Array.isArray(v) || Object.getPrototypeOf(v) === Object.prototype;
const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);

/** Rebuild a node tree from JSON made by node.toJSON(). */
export function fromJSON(data, extraTypes) {
  const C = (extraTypes && extraTypes[data.type]) || registry[data.type];
  if (!C) throw new Error(`Rosetta 2D: unknown node type "${data.type}". Register it with register(${data.type}).`);
  const { type, children, ...props } = data;
  const node = new C(props);
  if (children) for (const c of children) node.add(fromJSON(c, extraTypes));
  return node;
}

/* ── Node: everything in a scene ─────────────────────────────────────────── */

let nextId = 1;

export class Node extends Emitter {
  static type = 'Node';
  static props = ['name', 'x', 'y', 'rotation', 'scaleX', 'scaleY', 'alpha', 'visible', 'z', 'parallax', 'tags'];

  constructor(options) {
    super();
    this.id = nextId++;
    this.children = [];
    this.parent = null;
    this.game = null;
    this.alive = true;
    this._readied = false;
    this.setup();
    if (options) this.set(options);
  }

  /** Default values. Subclasses override and call super.setup(). */
  setup() {
    this.name = typeOf(this.constructor);
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.alpha = 1;
    this.visible = true;
    this.z = 0;
    this.parallax = 1;
    this.tags = [];
    this.processWhenPaused = false;
    this.serializable = true;
  }

  /** Assign several properties at once. `children: [...]` adds nodes; `on: {signal: fn}` connects signals. */
  set(options) {
    for (const key in options) {
      const v = options[key];
      if (key === 'children') v.forEach((c) => this.add(c));
      else if (key === 'on') for (const name in v) this.on(name, v[name]);
      else this[key] = v;
    }
    return this;
  }

  /* lifecycle hooks: override these */
  ready() {}
  update(dt) {}
  fixedUpdate(dt) {}
  draw(ctx) {}
  onDestroy() {}

  /* tree */
  add(child) {
    if (child.parent) child.parent._detach(child);
    child.parent = this;
    this.children.push(child);
    if (this.game) child._enter(this.game);
    return child;
  }
  _detach(child) {
    const i = this.children.indexOf(child);
    if (i !== -1) this.children.splice(i, 1);
    child.parent = null;
  }
  /** Remove at the end of this step (safe to call while the game is looping over nodes). */
  destroy() {
    if (!this.alive) return;
    this.alive = false;
    if (this.game) this.game._doomed.push(this);
    else if (this.parent) this.parent._detach(this);
  }
  _enter(game) {
    this.game = game;
    for (const c of this.children.slice()) c._enter(game);
    if (!this._readied) {
      this._readied = true;
      this.ready();
    }
  }
  _exit() {
    for (const c of this.children.slice()) c._exit();
    this.alive = false;
    this.onDestroy();
    this.emit('destroyed', this);
    this.game = null;
  }

  /** Visit this node and every descendant. Return false from fn to skip a branch. */
  each(fn) {
    if (fn(this) === false) return;
    for (const c of this.children.slice()) c.each(fn);
  }
  find(name) {
    let hit = null;
    this.each((n) => { if (hit) return false; if (n !== this && n.name === name) { hit = n; return false; } });
    return hit;
  }
  /** Every descendant with this tag (a tag is a group name). */
  findAll(tag) {
    const out = [];
    this.each((n) => { if (n !== this && n.alive && n.tags.includes(tag)) out.push(n); });
    return out;
  }
  is(tag) { return this.tags.includes(tag); }

  /* world position (adds parent positions; parent rotation and scale are ignored) */
  get worldX() { let v = this.x; for (let p = this.parent; p; p = p.parent) v += p.x; return v; }
  get worldY() { let v = this.y; for (let p = this.parent; p; p = p.parent) v += p.y; return v; }
  setWorld(x, y) {
    this.x += x - this.worldX;
    this.y += y - this.worldY;
    return this;
  }

  /** Run fn after `seconds` (game time). Returns the Timer so you can stop it. */
  after(seconds, fn) {
    const t = this.add(new Timer({ wait: seconds, serializable: false }));
    t.on('timeout', () => { t.destroy(); fn.call(this); });
    return t.start();
  }

  /* per-step plumbing (internal) */
  _fixed(dt, paused) {
    if (!this.alive) return;
    const p = paused && !this.processWhenPaused;
    if (!p) this.fixedUpdate(dt);
    for (const c of this.children.slice()) c._fixed(dt, p);
  }
  _update(dt, paused) {
    if (!this.alive) return;
    const p = paused && !this.processWhenPaused;
    if (!p) {
      if (this._process) this._process(dt);
      this.update(dt);
    }
    for (const c of this.children.slice()) c._update(dt, p);
  }
  _draw(ctx, game) {
    if (!this.visible) return;
    ctx.save();
    if (this.parallax !== 1) {
      const cam = game.camera;
      ctx.translate(cam.left * (1 - this.parallax), cam.top * (1 - this.parallax));
    }
    const r = game.pixelArt ? Math.round : (v) => v;
    ctx.translate(r(this.x), r(this.y));
    if (this.rotation) ctx.rotate(this.rotation);
    if (this.scaleX !== 1 || this.scaleY !== 1) ctx.scale(this.scaleX, this.scaleY);
    if (this.alpha !== 1) ctx.globalAlpha *= this.alpha;
    this.draw(ctx);
    const kids = this.children;
    const ordered = kids.some((k) => k.z) ? kids.slice().sort((a, b) => a.z - b.z) : kids;
    for (const k of ordered) k._draw(ctx, game);
    ctx.restore();
  }

  /** Plain-JSON description of this node and its children (only values that differ from defaults). */
  toJSON() {
    const C = this.constructor;
    const out = { type: typeOf(C) };
    const defaults = defaultsFor(C);
    for (const key of propsOf(C)) {
      const v = this[key];
      if (v === undefined || typeof v === 'function' || !isPlain(v)) continue;
      if (defaults && same(v, defaults[key])) continue;
      out[key] = JSON.parse(JSON.stringify(v));
    }
    const kids = this.children.filter((c) => c.serializable && c.alive);
    if (kids.length) out.children = kids.map((c) => c.toJSON());
    return out;
  }
}

/** The root of a level or screen. Any Node works as a scene; this one just names the idea. */
export class Scene extends Node {
  static type = 'Scene';
}

/* ── Shape: a placeholder rectangle or circle, no art needed ─────────────── */

export class Shape extends Node {
  static type = 'Shape';
  static props = ['kind', 'w', 'h', 'color', 'outline'];
  setup() {
    super.setup();
    this.kind = 'rect';
    this.w = 16;
    this.h = 16;
    this.color = '#ffffff';
    this.outline = null;
  }
  draw(ctx) {
    ctx.beginPath();
    if (this.kind === 'circle') ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    else ctx.rect(-this.w / 2, -this.h / 2, this.w, this.h);
    if (this.color) { ctx.fillStyle = this.color; ctx.fill(); }
    if (this.outline) { ctx.strokeStyle = this.outline; ctx.lineWidth = 1; ctx.stroke(); }
  }
}

/* ── Sprite: a picture, or one frame of a sprite sheet, with animations ──── */

export class Sprite extends Node {
  static type = 'Sprite';
  static props = ['texture', 'frame', 'frameWidth', 'frameHeight', 'originX', 'originY', 'flipX', 'flipY', 'anims', 'animation'];
  setup() {
    super.setup();
    this.texture = null; // asset key (string), or an Image/canvas
    this.frame = 0;
    this.frameWidth = 0; // 0 = the whole image
    this.frameHeight = 0;
    this.originX = 0.5;
    this.originY = 0.5;
    this.flipX = false;
    this.flipY = false;
    this.anims = {}; // { run: { frames: [0, 1, 2, 3], fps: 10, loop: true } }
    this.animation = '';
    this.playing = false;
    this.speed = 1;
    this._t = 0;
    this._fi = 0;
  }
  ready() {
    if (this.animation && !this.playing) this.play(this.animation, true);
  }
  image() {
    const t = this.texture;
    return typeof t === 'string' ? (this.game ? this.game.assets.get(t) : null) : t;
  }
  /** Start an animation. Calling play() with the one already playing does nothing unless restart is true. */
  play(name, restart = false) {
    if (!restart && this.playing && this.animation === name) return this;
    const anim = this.anims[name];
    if (!anim) throw new Error(`Rosetta 2D: sprite "${this.name}" has no animation "${name}".`);
    this.animation = name;
    this._t = 0;
    this._fi = 0;
    this.frame = anim.frames[0];
    this.playing = true;
    return this;
  }
  stop() { this.playing = false; return this; }
  _process(dt) {
    if (!this.playing) return;
    const anim = this.anims[this.animation];
    if (!anim) return;
    const step = 1 / (anim.fps || 10);
    this._t += dt * this.speed;
    while (this._t >= step) {
      this._t -= step;
      this._fi++;
      if (this._fi >= anim.frames.length) {
        if (anim.loop === false) {
          this._fi = anim.frames.length - 1;
          this.playing = false;
          this.frame = anim.frames[this._fi];
          this.emit('animationend', this.animation);
          return;
        }
        this._fi = 0;
      }
    }
    this.frame = anim.frames[this._fi];
  }
  draw(ctx) {
    const img = this.image();
    if (!img || !img.width) return;
    const fw = this.frameWidth || img.width;
    const fh = this.frameHeight || img.height;
    const cols = Math.max(1, Math.floor(img.width / fw));
    const sx = (this.frame % cols) * fw;
    const sy = Math.floor(this.frame / cols) * fh;
    if (this.flipX || this.flipY) ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
    ctx.drawImage(img, sx, sy, fw, fh, -fw * this.originX, -fh * this.originY, fw, fh);
  }
}

/* ── Body: a hitbox that moves and stops at walls ────────────────────────── */

export class Body extends Node {
  static type = 'Body';
  static props = ['w', 'h', 'offsetX', 'offsetY', 'vx', 'vy', 'gravityScale', 'bounce', 'static', 'layer', 'mask'];
  setup() {
    super.setup();
    this.w = 16;
    this.h = 16;
    this.offsetX = 0;
    this.offsetY = 0;
    this.vx = 0;
    this.vy = 0;
    this.gravityScale = 1;
    this.bounce = 0; // 0 = stop dead at walls, 1 = bounce back at full speed
    this.static = false; // static bodies are walls: they block, and never move on their own
    this.layer = 1; // which collision layers this body is on (bit flags)
    this.mask = 1; // which layers it bumps into
    this.onFloor = false;
    this.onCeiling = false;
    this.onWall = 0; // -1 wall on the left, 1 on the right
    this.contacts = [];
  }
  /** World-space hitbox {x, y, w, h} (top-left corner). */
  bounds() {
    return { x: this.worldX + this.offsetX - this.w / 2, y: this.worldY + this.offsetY - this.h / 2, w: this.w, h: this.h };
  }
  overlaps(other) { return overlap(this.bounds(), other.bounds()); }
  /** Move by (dx, dy) pixels, stopping at anything solid. The engine calls this every fixed step with vx·dt, vy·dt. */
  moveBy(dx, dy) {
    if (dx) this._moveAxis(dx, 'x');
    if (dy) this._moveAxis(dy, 'y');
    return this;
  }
  _moveAxis(total, axis) {
    const sign = Math.sign(total);
    const maxStep = Math.max(1, Math.min(this.w, this.h) / 2);
    let left = total;
    while (Math.abs(left) > EPS) {
      const step = Math.abs(left) > maxStep ? maxStep * sign : left;
      left -= step;
      const before = this.bounds();
      this[axis] += step;
      if (this._resolve(axis, sign, before)) break;
    }
  }
  _resolve(axis, sign, before) {
    const game = this.game;
    if (!game) return false;
    let hit = false;
    let b = this.bounds();
    for (const s of game._solidsNear(b, this)) {
      if (!overlap(b, s)) continue;
      if (s.oneWay && !(axis === 'y' && sign > 0 && before.y + before.h <= s.y + EPS)) continue;
      if (axis === 'x') {
        this.x -= sign > 0 ? b.x + b.w - s.x : b.x - (s.x + s.w);
        this.onWall = sign;
        if (this.vx * sign > 0) this.vx = -this.vx * this.bounce;
      } else {
        this.y -= sign > 0 ? b.y + b.h - s.y : b.y - (s.y + s.h);
        if (sign > 0) this.onFloor = true; else this.onCeiling = true;
        if (this.vy * sign > 0) this.vy = -this.vy * this.bounce;
      }
      const contact = { axis, side: axis === 'x' ? (sign > 0 ? 'right' : 'left') : (sign > 0 ? 'bottom' : 'top'), node: s.node, tile: s.tile, props: s.props };
      this.contacts.push(contact);
      this.emit('collide', contact);
      hit = true;
      b = this.bounds();
    }
    return hit;
  }
}

/* ── Area: detects overlaps without blocking (pick-ups, hazards, triggers) ─ */

export class Area extends Node {
  static type = 'Area';
  static props = ['w', 'h', 'offsetX', 'offsetY', 'layer', 'mask', 'monitoring'];
  setup() {
    super.setup();
    this.w = 16;
    this.h = 16;
    this.offsetX = 0;
    this.offsetY = 0;
    this.layer = 1;
    this.mask = 1;
    this.monitoring = true;
    this._inside = new Set();
  }
  bounds() { return Body.prototype.bounds.call(this); }
  overlaps(other) { return overlap(this.bounds(), other.bounds()); }
  /** Bodies and Areas inside this area right now. */
  overlapping() { return [...this._inside]; }
}

/* ── TileMap: one grid layer of tiles (Tiled-compatible) ─────────────────── */

export class TileMap extends Node {
  static type = 'TileMap';
  static props = ['tileWidth', 'tileHeight', 'columns', 'rows', 'data', 'tileset', 'tiles', 'layer', 'collides'];
  setup() {
    super.setup();
    this.tileWidth = 16;
    this.tileHeight = 16;
    this.columns = 0;
    this.rows = 0;
    this.data = []; // tile ids row by row; 0 = empty
    this.tileset = null; // { texture, columns, margin, spacing, firstId }
    this.tiles = {}; // id -> { solid, oneWay, color, ...your own properties }
    this.layer = 1;
    this.collides = true;
  }

  /**
   * Build a map from strings, one character per tile.
   *   TileMap.fromRows(['....', 'GGGG'], { G: { solid: true, color: '#38b764' } })
   * '.' and ' ' are empty. Ids are given in legend order unless an entry has `id`.
   */
  static fromRows(rows, legend, options = {}) {
    const ids = {};
    const tiles = {};
    let next = 1;
    for (const ch in legend) {
      const { id, ...props } = legend[ch];
      ids[ch] = id || next;
      next = Math.max(next, ids[ch]) + 1;
      tiles[ids[ch]] = props;
    }
    const columns = Math.max(...rows.map((r) => r.length));
    const data = [];
    for (const row of rows) for (let x = 0; x < columns; x++) data.push(ids[row[x]] || 0);
    return new TileMap({ columns, rows: rows.length, data, tiles, ...options });
  }

  /**
   * Load a map saved by the Tiled editor (File → Export As → JSON). Returns a Node holding
   * one TileMap per tile layer, plus `objects`: the object layers as plain data to spawn from.
   * options.texture: asset key of the tileset image (defaults to the tileset's name).
   */
  static fromTiled(json, options = {}) {
    if (json.infinite) throw new Error('Rosetta 2D: infinite Tiled maps are not supported; untick "Infinite" in Map Properties.');
    const ts = (json.tilesets || [])[0];
    if (ts && ts.source) throw new Error('Rosetta 2D: this map uses an external tileset (.tsx). In Tiled, use "Embed Tileset" before exporting.');
    const tiles = {};
    let tileset = null;
    if (ts) {
      for (const t of ts.tiles || []) tiles[ts.firstgid + t.id] = fromTiledProps(t.properties);
      tileset = { texture: options.texture || ts.name, columns: ts.columns, margin: ts.margin || 0, spacing: ts.spacing || 0, firstId: ts.firstgid };
    }
    const root = new Node({ name: options.name || 'Map' });
    root.objects = [];
    for (const layer of json.layers || []) {
      if (layer.type === 'tilelayer') {
        root.add(new TileMap({
          name: layer.name,
          tileWidth: json.tilewidth,
          tileHeight: json.tileheight,
          columns: layer.width,
          rows: layer.height,
          data: layer.data.map((gid) => gid & 0x1fffffff), // drop Tiled's flip flags
          tileset,
          tiles,
          visible: layer.visible !== false,
          alpha: layer.opacity == null ? 1 : layer.opacity,
          collides: fromTiledProps(layer.properties).collides !== false
        }));
      } else if (layer.type === 'objectgroup') {
        for (const o of layer.objects) {
          root.objects.push({
            layer: layer.name,
            name: o.name,
            type: o.type || o.class || '',
            x: o.x + (o.width || 0) / 2, // centre, to match the engine
            y: o.y + (o.height || 0) / 2,
            w: o.width || 0,
            h: o.height || 0,
            props: fromTiledProps(o.properties)
          });
        }
      }
    }
    return root;
  }

  /** Save one or more TileMaps (or a Node holding them) as a Tiled JSON map. */
  static toTiled(mapsOrRoot) {
    const maps = Array.isArray(mapsOrRoot) ? mapsOrRoot : mapsOrRoot instanceof TileMap ? [mapsOrRoot] : mapsOrRoot.children.filter((c) => c instanceof TileMap);
    if (!maps.length) throw new Error('Rosetta 2D: toTiled needs at least one TileMap.');
    const first = maps[0];
    const ts = first.tileset || {};
    const firstId = ts.firstId || 1;
    const tileIds = Object.keys(first.tiles).map(Number);
    const maxId = Math.max(firstId, ...tileIds, ...maps.flatMap((m) => m.data));
    const tilecount = maxId - firstId + 1;
    // without a tileset image, assume one row of tiles (what exporters draw for colour-only maps)
    const columns = ts.columns || tilecount;
    const margin = ts.margin || 0;
    const spacing = ts.spacing || 0;
    const tileRows = Math.ceil(tilecount / columns);
    return {
      type: 'map', version: '1.10', orientation: 'orthogonal', renderorder: 'right-down', infinite: false,
      width: first.columns, height: first.rows, tilewidth: first.tileWidth, tileheight: first.tileHeight,
      nextlayerid: maps.length + 1, nextobjectid: 1,
      layers: maps.map((m, i) => ({
        id: i + 1, name: m.name, type: 'tilelayer', x: 0, y: 0, width: m.columns, height: m.rows,
        opacity: m.alpha, visible: m.visible, data: m.data.slice(),
        properties: m.collides ? undefined : [{ name: 'collides', type: 'bool', value: false }]
      })),
      tilesets: [{
        firstgid: firstId, name: ts.texture || 'tiles', tilewidth: first.tileWidth, tileheight: first.tileHeight,
        tilecount, columns, margin, spacing,
        image: (ts.texture || 'tiles') + '.png',
        imagewidth: margin * 2 + columns * first.tileWidth + (columns - 1) * spacing,
        imageheight: margin * 2 + tileRows * first.tileHeight + (tileRows - 1) * spacing,
        tiles: tileIds.filter((id) => Object.keys(first.tiles[id]).length).map((id) => ({ id: id - firstId, properties: toTiledProps(first.tiles[id]) }))
      }]
    };
  }

  /** Tile id at a grid cell (0 = empty or outside the map). */
  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.columns || ty >= this.rows) return 0;
    return this.data[ty * this.columns + tx] || 0;
  }
  setTile(tx, ty, id) {
    if (tx < 0 || ty < 0 || tx >= this.columns || ty >= this.rows) return this;
    this.data[ty * this.columns + tx] = id;
    return this;
  }
  /** Properties of the tile at a grid cell ({} for a tile with none, null for empty). */
  propsAt(tx, ty) {
    const id = this.tileAt(tx, ty);
    return id ? this.tiles[id] || {} : null;
  }
  /** Every non-empty tile touching a world rectangle {x, y, w, h}, e.g. tilesIn(player.bounds()). */
  tilesIn(rect) {
    const out = [];
    const { tx: x0, ty: y0 } = this.cellAt(rect.x, rect.y);
    const { tx: x1, ty: y1 } = this.cellAt(rect.x + rect.w - EPS, rect.y + rect.h - EPS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const id = this.tileAt(tx, ty);
      if (id) out.push({ tx, ty, id, props: this.tiles[id] || {} });
    }
    return out;
  }
  /** Which grid cell holds this world point. */
  cellAt(x, y) {
    return { tx: Math.floor((x - this.worldX) / this.tileWidth), ty: Math.floor((y - this.worldY) / this.tileHeight) };
  }
  get width() { return this.columns * this.tileWidth; }
  get height() { return this.rows * this.tileHeight; }

  _solidsIn(b, out) {
    const ox = this.worldX;
    const oy = this.worldY;
    const tw = this.tileWidth;
    const th = this.tileHeight;
    const x0 = Math.floor((b.x - ox) / tw);
    const x1 = Math.floor((b.x + b.w - EPS - ox) / tw);
    const y0 = Math.floor((b.y - oy) / th);
    const y1 = Math.floor((b.y + b.h - EPS - oy) / th);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const props = this.propsAt(tx, ty);
        if (props && (props.solid || props.oneWay)) {
          out.push({ x: ox + tx * tw, y: oy + ty * th, w: tw, h: th, oneWay: !props.solid && !!props.oneWay, node: this, tile: { tx, ty, id: this.tileAt(tx, ty) }, props });
        }
      }
    }
  }

  draw(ctx) {
    const game = this.game;
    const cam = game.camera;
    const tw = this.tileWidth;
    const th = this.tileHeight;
    // visible cells only
    const left = cam.left * this.parallax - this.worldX;
    const top = cam.top * this.parallax - this.worldY;
    const x0 = Math.max(0, Math.floor(left / tw));
    const y0 = Math.max(0, Math.floor(top / th));
    const x1 = Math.min(this.columns - 1, Math.floor((left + cam.viewW) / tw));
    const y1 = Math.min(this.rows - 1, Math.floor((top + cam.viewH) / th));
    const ts = this.tileset;
    const img = ts && game.assets.get(ts.texture);
    const margin = (ts && ts.margin) || 0;
    const spacing = (ts && ts.spacing) || 0;
    const cols = img ? ts.columns || Math.max(1, Math.floor((img.width - margin * 2 + spacing) / (tw + spacing))) : 0;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const id = this.data[ty * this.columns + tx];
        if (!id) continue;
        const props = this.tiles[id];
        if (img) {
          const i = id - (ts.firstId || 1);
          ctx.drawImage(img, margin + (i % cols) * (tw + spacing), margin + Math.floor(i / cols) * (th + spacing), tw, th, tx * tw, ty * th, tw, th);
        } else if (props && props.color) {
          ctx.fillStyle = props.color;
          ctx.fillRect(tx * tw, ty * th, tw, th);
        }
      }
    }
  }
}

function fromTiledProps(list) {
  const out = {};
  for (const p of list || []) out[p.name] = p.value;
  return out;
}
function toTiledProps(obj) {
  return Object.keys(obj).map((name) => {
    const v = obj[name];
    const type = typeof v === 'boolean' ? 'bool' : typeof v === 'number' ? (Number.isInteger(v) ? 'int' : 'float') : /^#[0-9a-f]{6,8}$/i.test(v) ? 'color' : 'string';
    return { name, type, value: v };
  });
}

/* ── Text ────────────────────────────────────────────────────────────────── */

export class Text extends Node {
  static type = 'Text';
  static props = ['text', 'size', 'font', 'color', 'align'];
  setup() {
    super.setup();
    this.text = '';
    this.size = 8;
    this.font = 'monospace';
    this.color = '#ffffff';
    this.align = 'left'; // x is the left edge, centre, or right edge
  }
  draw(ctx) {
    ctx.font = `${this.size}px ${this.font}`;
    ctx.fillStyle = this.color;
    ctx.textAlign = this.align;
    ctx.textBaseline = 'top';
    String(this.text).split('\n').forEach((line, i) => ctx.fillText(line, 0, i * this.size * 1.2));
  }
}

/* ── Timer ───────────────────────────────────────────────────────────────── */

export class Timer extends Node {
  static type = 'Timer';
  static props = ['wait', 'oneShot', 'autostart'];
  setup() {
    super.setup();
    this.wait = 1;
    this.oneShot = true;
    this.autostart = false;
    this.timeLeft = 0;
    this.running = false;
  }
  ready() { if (this.autostart) this.start(); }
  start(wait) {
    if (wait != null) this.wait = wait;
    this.timeLeft = this.wait;
    this.running = true;
    return this;
  }
  stop() { this.running = false; return this; }
  _process(dt) {
    if (!this.running) return;
    this.timeLeft -= dt;
    if (this.timeLeft > EPS) return;
    if (this.oneShot || this.wait <= 0) {
      // update state first so a 'timeout' handler can call start() again
      this.running = !this.oneShot;
      this.timeLeft = this.oneShot ? 0 : this.wait;
      this.emit('timeout');
      return;
    }
    while (this.running && this.timeLeft <= EPS) {
      this.timeLeft += this.wait;
      this.emit('timeout');
    }
  }
}

register(Node, Scene, Shape, Sprite, Body, Area, TileMap, Text, Timer);

/* ── Camera ──────────────────────────────────────────────────────────────── */

export class Camera {
  constructor(game) {
    this.game = game;
    this.reset();
  }
  reset() {
    this.x = this.game.width / 2; // centre of the view, in world pixels
    this.y = this.game.height / 2;
    this.zoom = 1;
    this.target = null;
    this.deadzoneW = 0;
    this.deadzoneH = 0;
    this.smoothing = 0; // seconds; 0 = snap to the target
    this.bounds = null; // { x, y, w, h } the view never leaves
    this.shakeX = 0;
    this.shakeY = 0;
    this._shake = 0;
    this._shakeTime = 0;
  }
  get viewW() { return this.game.width / this.zoom; }
  get viewH() { return this.game.height / this.zoom; }
  get left() { return this.x - this.viewW / 2; }
  get top() { return this.y - this.viewH / 2; }
  /** Follow a node. deadzone: [w, h] box it can move in before the camera moves; smoothing in seconds. */
  follow(node, { deadzone = [0, 0], smoothing = 0 } = {}) {
    this.target = node;
    this.deadzoneW = deadzone[0];
    this.deadzoneH = deadzone[1];
    this.smoothing = smoothing;
    if (node) { this.x = node.worldX; this.y = node.worldY; this._clamp(); }
    return this;
  }
  setBounds(x, y, w, h) { this.bounds = { x, y, w, h }; this._clamp(); return this; }
  shake(intensity = 3, duration = 0.25) { this._shake = intensity; this._shakeTime = duration; this._shakeTotal = duration; return this; }
  screenToWorld(sx, sy) { return { x: this.left + sx / this.zoom, y: this.top + sy / this.zoom }; }
  worldToScreen(wx, wy) { return { x: (wx - this.left) * this.zoom, y: (wy - this.top) * this.zoom }; }
  update(dt) {
    const t = this.target;
    if (t && t.alive) {
      const tx = t.worldX;
      const ty = t.worldY;
      const gx = Math.abs(tx - this.x) > this.deadzoneW / 2 ? tx - Math.sign(tx - this.x) * (this.deadzoneW / 2) : this.x;
      const gy = Math.abs(ty - this.y) > this.deadzoneH / 2 ? ty - Math.sign(ty - this.y) * (this.deadzoneH / 2) : this.y;
      const k = this.smoothing > 0 ? 1 - Math.exp(-dt / this.smoothing) : 1;
      this.x += (gx - this.x) * k;
      this.y += (gy - this.y) * k;
    }
    this._clamp();
    if (this._shakeTime > 0) {
      this._shakeTime -= dt;
      const s = this._shake * Math.max(0, this._shakeTime / this._shakeTotal);
      this.shakeX = (Math.random() * 2 - 1) * s;
      this.shakeY = (Math.random() * 2 - 1) * s;
    } else {
      this.shakeX = this.shakeY = 0;
    }
  }
  _clamp() {
    const b = this.bounds;
    if (!b) return;
    const hw = this.viewW / 2;
    const hh = this.viewH / 2;
    this.x = b.w <= this.viewW ? b.x + b.w / 2 : clamp(this.x, b.x + hw, b.x + b.w - hw);
    this.y = b.h <= this.viewH ? b.y + b.h / 2 : clamp(this.y, b.y + hh, b.y + b.h - hh);
  }
}

/* ── Input: named actions, keyboard, gamepad, pointer ────────────────────── */

const PAD_BUTTONS = ['PadA', 'PadB', 'PadX', 'PadY', 'PadL', 'PadR', 'PadL2', 'PadR2', 'PadSelect', 'PadStart', 'PadL3', 'PadR3', 'PadUp', 'PadDown', 'PadLeft', 'PadRight'];
const isTyping = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export class Input {
  constructor(game) {
    this.game = game;
    this.actions = {};
    this.pointer = { x: 0, y: 0, down: false, get worldX() { return game.camera.screenToWorld(this.x, this.y).x; }, get worldY() { return game.camera.screenToWorld(this.x, this.y).y; } };
    this._down = new Set();
    this._pressedFixed = new Set();
    this._pressedFrame = new Set();
    this._releasedFixed = new Set();
    this._releasedFrame = new Set();
    this._padDown = new Set();
  }
  /** Name an action and list its keys (KeyboardEvent.code: 'ArrowLeft', 'KeyA', 'Space'), pad buttons ('PadA') or 'Pointer'. */
  bind(action, codes) {
    this.actions[action] = (this.actions[action] || []).concat(codes);
    return this;
  }
  _codes(action) { return this.actions[action] || [action]; }
  /** Held right now. */
  down(action) { return this._codes(action).some((c) => this._down.has(c)); }
  /** Went down since the last step (fixedUpdate) or frame (update), so it is seen exactly once in each. */
  pressed(action) {
    const set = this.game._phase === 'fixed' ? this._pressedFixed : this._pressedFrame;
    return this._codes(action).some((c) => set.has(c));
  }
  released(action) {
    const set = this.game._phase === 'fixed' ? this._releasedFixed : this._releasedFrame;
    return this._codes(action).some((c) => set.has(c));
  }
  /** -1, 0 or 1 from two actions, e.g. axis('left', 'right'). */
  axis(negative, positive) { return (this.down(positive) ? 1 : 0) - (this.down(negative) ? 1 : 0); }
  /** A direction of length 0 or 1 from four actions (diagonals are not faster). */
  vector(left, right, up, down) {
    const x = this.axis(left, right);
    const y = this.axis(up, down);
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
  }
  press(code) {
    if (this._down.has(code)) return;
    this._down.add(code);
    this._pressedFixed.add(code);
    this._pressedFrame.add(code);
  }
  release(code) {
    if (!this._down.has(code)) return;
    this._down.delete(code);
    this._releasedFixed.add(code);
    this._releasedFrame.add(code);
  }
  releaseAll() { for (const c of [...this._down]) this.release(c); }
  _endFixed() { this._pressedFixed.clear(); this._releasedFixed.clear(); }
  _endFrame() { this._pressedFrame.clear(); this._releasedFrame.clear(); }
  _bound(code) { for (const a in this.actions) if (this.actions[a].includes(code)) return true; return false; }

  poll() {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const now = new Set();
    for (const pad of pads) {
      if (!pad || pad.mapping !== 'standard') continue;
      pad.buttons.forEach((b, i) => { if (b.pressed && PAD_BUTTONS[i]) now.add(PAD_BUTTONS[i]); });
      const [ax, ay] = pad.axes;
      if (ax < -0.5) now.add('PadLeft');
      if (ax > 0.5) now.add('PadRight');
      if (ay < -0.5) now.add('PadUp');
      if (ay > 0.5) now.add('PadDown');
    }
    for (const c of now) if (!this._padDown.has(c)) this.press(c);
    for (const c of this._padDown) if (!now.has(c)) this.release(c);
    this._padDown = now;
  }

  attach(canvas) {
    const game = this.game;
    const keyDown = (e) => {
      // several games can share a page: keys go to the one clicked, focused or started last
      if (isTyping(e.target) || Game.active !== game) return;
      if (this._bound(e.code) && (document.activeElement === canvas || game.captureKeys)) e.preventDefault();
      if (!e.repeat) this.press(e.code);
      game.audio._unlock();
    };
    const keyUp = (e) => this.release(e.code);
    const blur = () => this.releaseAll();
    const move = (e) => {
      const r = canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - r.left) / r.width) * game.width;
      this.pointer.y = ((e.clientY - r.top) / r.height) * game.height;
    };
    const focus = () => { Game.active = game; };
    const down = (e) => {
      move(e);
      Game.active = game;
      canvas.focus({ preventScroll: true });
      this.pointer.down = true;
      this.press('Pointer');
      game.audio._unlock();
    };
    const up = (e) => { move(e); this.pointer.down = false; this.release('Pointer'); };
    if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', blur);
    canvas.addEventListener('focus', focus);
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    canvas.addEventListener('pointermove', move);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur);
      canvas.removeEventListener('focus', focus);
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointermove', move);
    };
  }
}

/* ── Assets ──────────────────────────────────────────────────────────────── */

export class Assets {
  constructor(game) {
    this.game = game;
    this.items = {};
    this.queue = [];
  }
  image(key, url) { this.queue.push({ key, url, kind: 'image' }); return this; }
  sound(key, url) { this.queue.push({ key, url, kind: 'sound' }); return this; }
  json(key, url) { this.queue.push({ key, url, kind: 'json' }); return this; }
  /** Use something you already have: an Image, a canvas (e.g. a sprite drawn in a lesson), JSON… */
  add(key, value) { this.items[key] = value; return this; }
  get(key) { return this.items[key]; }
  /** Load everything queued. onProgress(0…1) after each file. */
  async load(onProgress) {
    const list = this.queue.splice(0);
    let done = 0;
    await Promise.all(list.map(async (item) => {
      this.items[item.key] = await LOADERS[item.kind](item.url, this.game);
      done++;
      if (onProgress) onProgress(done / list.length);
    }));
    return this;
  }
}
const LOADERS = {
  image: (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Rosetta 2D: could not load image ${url}`));
    img.src = url;
  }),
  json: async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Rosetta 2D: could not load ${url} (${r.status})`);
    return r.json();
  },
  sound: async (url, game) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Rosetta 2D: could not load ${url} (${r.status})`);
    const ac = game.audio._context();
    return ac ? ac.decodeAudioData(await r.arrayBuffer()) : null;
  }
};

/* ── Audio ───────────────────────────────────────────────────────────────── */

export class Audio {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.volume = 1;
    this.muted = false;
  }
  _context() {
    if (!this.ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    this.master.gain.value = this.muted ? 0 : this.volume;
    return this.ctx;
  }
  /** Browsers only allow sound after a click or key press, so the input handlers call this. */
  _unlock() {
    const ac = this._context();
    if (ac && ac.state === 'suspended') ac.resume();
  }
  /** Play a loaded sound. Returns { stop() }, or null if sound is unavailable. */
  play(key, { volume = 1, rate = 1, loop = false } = {}) {
    const buffer = this.game.assets.get(key);
    const ac = this._context();
    if (!ac || !buffer || typeof buffer.getChannelData !== 'function') return null;
    const src = ac.createBufferSource();
    const gain = ac.createGain();
    src.buffer = buffer;
    src.loop = loop;
    src.playbackRate.value = rate;
    gain.gain.value = volume;
    src.connect(gain).connect(this.master);
    src.start();
    return { stop: () => src.stop() };
  }
  /** A synthesised blip: no sound files needed. */
  beep({ freq = 440, duration = 0.1, type = 'square', slide = 0, volume = 0.15 } = {}) {
    const ac = this._context();
    if (!ac) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration);
  }
}

/* ── Game: the loop that runs a scene ────────────────────────────────────── */

export class Game extends Emitter {
  /**
   * new Game({ canvas, width: 320, height: 180, pixelArt: true, background: '#1a1c2c', gravity: 900 })
   * Leave out canvas to run headless (tests, servers): call game.step(dt) yourself.
   */
  constructor(options = {}) {
    super();
    const o = { width: 320, height: 180, pixelArt: true, background: '#000000', fixedStep: 1 / 60, gravity: 0, maxDelta: 0.25, ...options };
    this.width = o.width;
    this.height = o.height;
    this.pixelArt = o.pixelArt;
    this.background = o.background;
    this.fixedStep = o.fixedStep;
    this.maxDelta = o.maxDelta;
    this.gravity = typeof o.gravity === 'number' ? { x: 0, y: o.gravity } : { x: 0, y: 0, ...o.gravity };
    this.timeScale = 1;
    this.paused = false;
    this.debug = false;
    this.captureKeys = false; // true: arrow keys and space never scroll the page, even before the canvas is clicked
    this.time = 0;
    this.frame = 0;
    this.scene = null;
    this.running = false;
    this._next = null;
    this._doomed = [];
    this._phase = 'idle';
    this._acc = 0;
    this._lists = { bodies: [], statics: [], areas: [], tilemaps: [] };
    this.camera = new Camera(this);
    this.input = new Input(this);
    this.assets = new Assets(this);
    this.audio = new Audio(this);
    this.canvas = o.canvas || null;
    this.ctx = null;
    if (this.canvas) {
      const c = this.canvas;
      c.width = this.width;
      c.height = this.height;
      if (!c.style.width) c.style.width = '100%';
      c.style.aspectRatio = `${this.width} / ${this.height}`;
      if (this.pixelArt) c.style.imageRendering = 'pixelated';
      this.ctx = c.getContext('2d');
      this._detachInput = this.input.attach(c);
    }
    this._loop = this._loop.bind(this);
  }

  /** Run a scene: a Node, a Node class, or a function (game) => Node. Starts the loop. */
  start(scene) {
    Game.active = this;
    this._setScene(scene);
    if (this.canvas && !this.running && typeof requestAnimationFrame !== 'undefined') {
      this.running = true;
      this._last = null;
      this._raf = requestAnimationFrame(this._loop);
    }
    return this;
  }
  /** Switch scenes at the end of this frame. */
  change(scene) { this._next = scene; return this; }
  stop() {
    this.running = false;
    if (this._raf && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this._raf);
    return this;
  }
  /** Stop and remove every listener (call when a lesson page swaps games). */
  destroy() {
    this.stop();
    if (Game.active === this) Game.active = null;
    if (this.scene) this.scene._exit();
    if (this._detachInput) this._detachInput();
    if (this.audio.ctx) this.audio.ctx.close();
  }

  _setScene(s) {
    // reset first: a scene factory may set up the camera (follow, bounds) while it builds
    this.camera.reset();
    const node = typeof s === 'function' ? (s === Node || s.prototype instanceof Node ? new s() : s(this)) : s;
    if (this.scene) this.scene._exit();
    this._doomed.length = 0;
    this._acc = 0;
    this.scene = node;
    node._enter(this);
    this.emit('scene', node);
  }

  _loop(now) {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this._loop);
    const dt = this._last == null ? 0 : (now - this._last) / 1000;
    this._last = now;
    this.step(Math.min(dt, this.maxDelta));
  }

  /** Advance by dt seconds: fixed steps, then one update, then draw. */
  step(dt) {
    this.input.poll();
    const sdt = dt * this.timeScale;
    if (this.scene) {
      if (!this.paused) {
        this._acc += sdt;
        let n = 0;
        while (this._acc >= this.fixedStep - EPS && n < 8) {
          this._fixedStep();
          this._acc -= this.fixedStep;
          n++;
        }
        if (n === 8) this._acc = 0; // far behind (slow machine): drop time instead of spiralling
      }
      this._phase = 'frame';
      this.scene._update(sdt, this.paused);
      if (!this.paused) this.camera.update(sdt);
      this._phase = 'idle';
      this._flush();
    }
    if (this.paused) this.input._endFixed();
    this.input._endFrame();
    if (this._next) {
      const next = this._next;
      this._next = null;
      this._setScene(next);
    }
    this.time += sdt;
    this.frame++;
    this.draw();
    return this;
  }

  _fixedStep() {
    const dt = this.fixedStep;
    this._phase = 'fixed';
    this.scene._fixed(dt, false);
    this._collect();
    for (const b of this._lists.bodies) {
      if (!b.alive) continue;
      b.vx += this.gravity.x * b.gravityScale * dt;
      b.vy += this.gravity.y * b.gravityScale * dt;
      b.onFloor = b.onCeiling = false;
      b.onWall = 0;
      b.contacts = [];
      b.moveBy(b.vx * dt, b.vy * dt);
    }
    this._detectAreas();
    this._phase = 'idle';
    this.input._endFixed();
    this._flush();
  }

  _collect() {
    const L = { bodies: [], statics: [], areas: [], tilemaps: [] };
    if (this.scene) {
      this.scene.each((n) => {
        if (!n.alive) return false;
        if (n instanceof Body) (n.static ? L.statics : L.bodies).push(n);
        else if (n instanceof Area) L.areas.push(n);
        else if (n instanceof TileMap && n.collides) L.tilemaps.push(n);
      });
    }
    this._lists = L;
  }

  _solidsNear(b, self) {
    const out = [];
    for (const s of this._lists.statics) {
      if (s === self || !s.alive || !(s.layer & self.mask)) continue;
      const sb = s.bounds();
      if (overlap(b, sb)) out.push({ ...sb, oneWay: false, node: s, tile: null, props: null });
    }
    for (const m of this._lists.tilemaps) if (m.layer & self.mask) m._solidsIn(b, out);
    return out;
  }

  _detectAreas() {
    const { areas, bodies, statics } = this._lists;
    const others = bodies.concat(statics, areas);
    for (const a of areas) {
      if (!a.alive) continue;
      const now = new Set();
      if (a.monitoring) {
        const ab = a.bounds();
        for (const o of others) {
          if (o === a || !o.alive || !(o.layer & a.mask) || isAncestor(o, a)) continue;
          if (overlap(ab, o.bounds())) now.add(o);
        }
      }
      for (const o of now) if (!a._inside.has(o)) a.emit('enter', o);
      for (const o of a._inside) if (!now.has(o)) a.emit('exit', o);
      a._inside = now;
    }
  }

  _flush() {
    while (this._doomed.length) {
      const n = this._doomed.shift();
      if (n.parent) n.parent._detach(n);
      if (n.game) n._exit();
    }
  }

  draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = !this.pixelArt;
    if (this.background) {
      ctx.fillStyle = this.background;
      ctx.fillRect(0, 0, this.width, this.height);
    } else {
      ctx.clearRect(0, 0, this.width, this.height);
    }
    if (!this.scene) return;
    const cam = this.camera;
    let lx = cam.left + cam.shakeX;
    let ly = cam.top + cam.shakeY;
    if (this.pixelArt) { lx = Math.round(lx); ly = Math.round(ly); }
    ctx.save();
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-lx, -ly);
    this.scene._draw(ctx, this);
    if (this.debug) this._drawDebug(ctx);
    ctx.restore();
    this.emit('draw', ctx);
  }

  _drawDebug(ctx) {
    this._collect();
    const box = (n, color) => {
      const b = n.bounds();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5, b.w - 1, b.h - 1);
    };
    for (const m of this._lists.tilemaps) {
      for (let ty = 0; ty < m.rows; ty++) for (let tx = 0; tx < m.columns; tx++) {
        const p = m.propsAt(tx, ty);
        if (!p || !(p.solid || p.oneWay)) continue;
        ctx.strokeStyle = p.solid ? 'rgba(80,160,255,.8)' : 'rgba(255,220,60,.9)';
        ctx.strokeRect(m.worldX + tx * m.tileWidth + 0.5, m.worldY + ty * m.tileHeight + 0.5, m.tileWidth - 1, m.tileHeight - 1);
      }
    }
    for (const s of this._lists.statics) box(s, 'rgba(80,160,255,.9)');
    for (const b of this._lists.bodies) box(b, 'rgba(80,255,140,.95)');
    for (const a of this._lists.areas) box(a, 'rgba(255,100,200,.95)');
  }

  /* conveniences */
  find(name) { return this.scene ? this.scene.find(name) : null; }
  /** Every live node with this tag. */
  group(tag) { return this.scene ? this.scene.findAll(tag) : []; }
  /** Save JSON-friendly data in this browser. Returns false if storage is blocked. */
  save(key, data) {
    try { globalThis.localStorage.setItem('rosetta2d:' + key, JSON.stringify(data)); return true; } catch (e) { return false; }
  }
  load(key, fallback = null) {
    try {
      const v = globalThis.localStorage.getItem('rosetta2d:' + key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
}

/** The game that receives keyboard input. */
Game.active = null;

function isAncestor(maybeParent, node) {
  for (let p = node.parent; p; p = p.parent) if (p === maybeParent) return true;
  return false;
}

if (typeof window !== 'undefined') {
  window.Rosetta2D = { VERSION, Game, Node, Scene, Shape, Sprite, Body, Area, TileMap, Text, Timer, Camera, Input, Emitter, register, fromJSON, types, overlap, clamp, lerp, approach };
}
