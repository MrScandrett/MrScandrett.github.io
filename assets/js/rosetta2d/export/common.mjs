// common.mjs — what every Rosetta 2D exporter shares: a snapshot of the live scene,
// facts about the student's own classes, their methods as text, translation hints,
// and a tileset picture for maps drawn with plain colours.
import { Node, Scene, Shape, Sprite, Body, Area, TileMap, Text, Timer, Game, types } from '../rosetta2d.mjs';

export const BUILTINS = [Scene, Shape, Sprite, Body, Area, TileMap, Text, Timer, Node];
const BUILTIN_NAMES = ['Scene', 'Shape', 'Sprite', 'Body', 'Area', 'TileMap', 'Text', 'Timer', 'Node'];
const typeName = (C) => (Object.prototype.hasOwnProperty.call(C, 'type') ? C.type : C.name);

/** The nearest built-in class a node's class extends (Body for `class Player extends Body`). */
export function baseOf(C) {
  for (let c = C; c; c = Object.getPrototypeOf(c)) if (BUILTINS.includes(c)) return c;
  return Node;
}
export const isCustom = (C) => !BUILTINS.includes(C);

/**
 * Run a game factory without stealing the keyboard from games already on the page,
 * and without a canvas: exports always start from a freshly built scene.
 */
export function freshGame(create) {
  const prev = Game.active;
  const game = create();
  Game.active = prev;
  return game;
}

/**
 * Plain description of the live scene. Unlike toJSON() it keeps children that classes
 * build in ready() (sprites, shapes, hitboxes): in other engines those belong in the scene.
 * Helper timers made by after() are left out.
 */
export function snapshot(node) {
  const C = node.constructor;
  const snap = { node, C, base: baseOf(C), custom: isCustom(C), name: node.name, children: [] };
  for (const child of node.children) {
    if (!child.alive || (child instanceof Timer && !child.serializable)) continue;
    snap.children.push(snapshot(child));
  }
  return snap;
}

export function walk(snap, fn, parent = null) {
  fn(snap, parent);
  for (const c of snap.children) walk(c, fn, snap);
}

/**
 * Build one instance of a class inside a throwaway headless game so its ready() runs,
 * giving the children the class makes for itself (visuals, hitboxes). Returns null if
 * ready() needs things only the real scene has.
 */
export function probe(C) {
  const prev = Game.active;
  try {
    const inst = new C();
    const g = new Game();
    g.start(new Scene({ children: [inst] }));
    inst.x = 0;
    inst.y = 0;
    return inst;
  } catch (e) {
    return null;
  } finally {
    Game.active = prev;
  }
}

/**
 * The student's classes in this game: those in the live scene, plus registered classes
 * the game's source declares (things spawned later, like bullets or gems).
 */
export function gameClasses(rootSnap, sources = {}) {
  const found = new Map();
  walk(rootSnap, (s) => { if (s.custom) found.set(typeName(s.C), s.C); });
  const text = Object.values(sources).join('\n');
  for (const [name, C] of Object.entries(types)) {
    if (found.has(name) || !isCustom(C)) continue;
    if (new RegExp(`class\\s+${C.name}\\b`).test(text)) found.set(name, C);
  }
  return [...found.values()];
}
export { typeName };

/** Everything a game needs besides the scene: size, gravity, input actions, camera. */
export function settingsOf(game) {
  const cam = game.camera;
  return {
    title: game.scene.name || 'Rosetta 2D game',
    width: game.width,
    height: game.height,
    pixelArt: game.pixelArt,
    background: game.background || '#000000',
    gravity: { ...game.gravity },
    actions: JSON.parse(JSON.stringify(game.input.actions)),
    camera: {
      target: cam.target || null,
      x: cam.x,
      y: cam.y,
      zoom: cam.zoom,
      deadzone: [cam.deadzoneW, cam.deadzoneH],
      smoothing: cam.smoothing,
      bounds: cam.bounds ? { ...cam.bounds } : null
    }
  };
}

/* ── the student's classes ─────────────────────────────────────────────── */

/** Fields a custom class adds in setup(): their names and starting values (numbers, text, true/false). */
export function customFields(C) {
  const base = baseOf(C);
  let mine;
  let theirs;
  try { mine = new C(); theirs = new base(); } catch (e) { return []; }
  const out = [];
  for (const key of Object.keys(mine)) {
    if (key.startsWith('_') || key in theirs) continue;
    const v = mine[key];
    if (['number', 'string', 'boolean'].includes(typeof v)) out.push({ name: key, value: v });
  }
  return out;
}

/** Built-in values a custom class changes in setup() (e.g. bounce = 1, gravityScale = 0). */
export function changedDefaults(C) {
  const base = baseOf(C);
  let mine;
  let theirs;
  try { mine = new C(); theirs = new base(); } catch (e) { return {}; }
  const out = {};
  for (const key of Object.keys(theirs)) {
    if (key.startsWith('_') || typeof theirs[key] === 'object') continue;
    if (mine[key] !== theirs[key]) out[key] = mine[key];
  }
  return out;
}

/**
 * Split a class's source into its methods: [{ name, params, body }].
 * A small scanner: it tracks strings, template literals and comments so braces inside
 * them don't confuse it. Good enough for the classes students write.
 */
export function methodsOf(C) {
  const src = Function.prototype.toString.call(C);
  const open = src.indexOf('{');
  if (open === -1) return [];
  const methods = [];
  let depth = 0;
  let memberStart = open + 1;
  let header = null;
  let bodyStart = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === '/' && next === '/') { i = src.indexOf('\n', i); if (i === -1) break; continue; }
    if (ch === '/' && next === '*') { i = src.indexOf('*/', i + 2) + 1; continue; }
    if (ch === '"' || ch === "'" || ch === '`') {
      for (i++; i < src.length && src[i] !== ch; i++) if (src[i] === '\\') i++;
      continue;
    }
    if (ch === '{') {
      depth++;
      if (depth === 2) { header = src.slice(memberStart, i).trim(); bodyStart = i + 1; }
    } else if (ch === '}') {
      depth--;
      if (depth === 1) {
        const m = /^(?:static\s+|async\s+)*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)$/.exec(header || '');
        if (m && !/^(get|set)$/.test(m[1])) methods.push({ name: m[1], params: m[2].trim(), body: dedent(src.slice(bodyStart, i)) });
        memberStart = i + 1;
      }
      if (depth === 0) break;
    } else if (ch === ';' && depth === 1) {
      memberStart = i + 1;
    }
  }
  return methods;
}

function dedent(text) {
  const lines = text.replace(/^\s*\n/, '').replace(/\s+$/, '').split('\n');
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(cut)).join('\n');
}

/* ── hints: Rosetta 2D calls and their nearest equivalents ─────────────── */

// [pattern, godot, phaser]. $1, $2… are filled from the match.
const HINTS = [
  [/input\.down\(\s*['"]([\w-]+)['"]\s*\)/, 'Input.is_action_pressed("$1")', 'this.scene.actions.down("$1")'],
  [/input\.pressed\(\s*['"]([\w-]+)['"]\s*\)/, 'Input.is_action_just_pressed("$1")', 'this.scene.actions.pressed("$1")'],
  [/input\.released\(\s*['"]([\w-]+)['"]\s*\)/, 'Input.is_action_just_released("$1")', 'this.scene.actions.released("$1")'],
  [/input\.axis\(\s*['"]([\w-]+)['"]\s*,\s*['"]([\w-]+)['"]\s*\)/, 'Input.get_axis("$1", "$2")', 'this.scene.actions.axis("$1", "$2")'],
  [/input\.vector\(([^)]*)\)/, 'Input.get_vector($1)  # note: Godot returns a Vector2', 'this.scene.actions.vector($1)'],
  [/\bthis\.vx\b/, 'velocity.x', 'this.body.velocity.x'],
  [/\bthis\.vy\b/, 'velocity.y', 'this.body.velocity.y'],
  [/\bthis\.onFloor\b/, 'is_on_floor()', 'this.body.blocked.down'],
  [/\bthis\.onCeiling\b/, 'is_on_ceiling()', 'this.body.blocked.up'],
  [/\bthis\.onWall\b/, 'is_on_wall()', '(this.body.blocked.left || this.body.blocked.right)'],
  [/\bthis\.destroy\(\)/, 'queue_free()', 'this.destroy()'],
  [/\.is\(\s*['"]([\w-]+)['"]\s*\)/, '.is_in_group("$1")', '.getData("tags").includes("$1")'],
  [/\.on\(\s*['"]enter['"]/, 'body_entered.connect(...) and area_entered.connect(...)', 'this.on("enter", ...) (rosetta.js tracks overlaps)'],
  [/\.on\(\s*['"]exit['"]/, 'body_exited.connect(...) and area_exited.connect(...)', 'this.on("exit", ...)'],
  [/\.on\(\s*['"]collide['"]/, 'after move_and_slide(): get_slide_collision(i)', 'a collider callback: this.scene.physics.add.collider(a, b, callback)'],
  [/\.emit\(\s*['"]([\w-]+)['"]/, 'declare `signal $1`, then $1.emit()', 'this.scene.events.emit("$1")'],
  [/\.on\(\s*['"](?!enter['"]|exit['"]|collide['"]|timeout['"])([\w-]+)['"]\s*,/, 'some_node.$1.connect(callable)', 'this.scene.events.on("$1", fn)'],
  [/\bapproach\(([^,]+),([^,]+),/, 'move_toward($1,$2, …)', 'approach($1,$2, …) from rosetta.js'],
  [/\bthis\.after\(\s*([\d.]+)\s*,/, 'await get_tree().create_timer($1).timeout', 'this.scene.time.delayedCall($1 * 1000, fn)'],
  [/audio\.beep\(/, 'an AudioStreamPlayer with a sound file: $AudioStreamPlayer.play()', 'this.scene.sound.play("key") with a loaded sound'],
  [/audio\.play\(\s*['"]([\w-]+)['"]/, '$AudioStreamPlayer.play()', 'this.scene.sound.play("$1")'],
  [/camera\.shake\(\s*([\d.]+)\s*,\s*([\d.]+)/, 'tween the Camera2D offset (Godot has no built-in shake)', 'this.scene.cameras.main.shake($2 * 1000, 0.01)'],
  [/\bgame\.change\(/, 'get_tree().change_scene_to_file("res://next.tscn")', 'this.scene.scene.start("Next")'],
  [/\bgame\.save\(/, 'FileAccess.open("user://save.json", FileAccess.WRITE)', 'localStorage.setItem(key, JSON.stringify(value))'],
  [/\bgame\.load\(/, 'FileAccess.open("user://save.json", FileAccess.READ)', 'JSON.parse(localStorage.getItem(key))'],
  [/\.find\(\s*['"]([\w -]+)['"]\s*\)/, 'get_node("../$1") (or a %unique name)', 'this.scene.named["$1"]'],
  [/\.findAll\(\s*['"]([\w-]+)['"]\s*\)/, 'get_tree().get_nodes_in_group("$1")', 'this.scene.children.list.filter(o => o.getData("tags")?.includes("$1"))'],
  [/\.tilesIn\(/, 'tile_map_layer.get_cell_tile_data(cell).get_custom_data("name")', 'layer.getTilesWithinWorldXY(x, y, w, h)'],
  [/\.add\(\s*new\s+(\w+)\(/, (m) => (BUILTIN_NAMES.includes(m[1]) ? 'already placed in main.tscn as a child node: delete this line' : `add_child(preload("res://scenes/${snake(m[1])}.tscn").instantiate())`), (m) => (BUILTIN_NAMES.includes(m[1]) ? 'already built for you in the exported scene: delete this line' : `new ${m[1]}(this.scene, x, y)`)],
  [/\bthis\.parent\b/, 'get_parent()', 'this.scene (Phaser objects live in the scene, not in each other)'],
  [/\bthis\.game\b/, 'get_tree() / the singletons Input, Engine', 'this.scene'],
  [/Math\.random\(\)/, 'randf()', 'Math.random()'],
  [/Math\.(abs|sign|min|max|floor|round|sqrt|sin|cos)\(/, '$1()', 'Math.$1(']
];

/** Distinct hints for a piece of Rosetta 2D code. target: 'godot' | 'phaser'. */
export function hintsFor(code, target) {
  const col = target === 'godot' ? 1 : 2;
  const seen = new Set();
  const out = [];
  for (const row of HINTS) {
    const re = new RegExp(row[0].source, 'g');
    let m;
    while ((m = re.exec(code))) {
      const to = typeof row[col] === 'function' ? row[col](m) : row[col].replace(/\$(\d)/g, (_, n) => (m[+n] || '').trim());
      const key = m[0] + '→' + to;
      if (!seen.has(key)) { seen.add(key); out.push({ from: m[0].trim(), to }); }
    }
  }
  return out;
}

/* ── names, colours, files ─────────────────────────────────────────────── */

export const snake = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'node';
export const pascal = (s) => String(s).replace(/(^|[^A-Za-z0-9]+)([A-Za-z0-9])/g, (_, __, c) => c.toUpperCase()).replace(/^[^A-Za-z]+/, '') || 'Node';
export const ident = (s) => { const p = pascal(s); return p.charAt(0).toLowerCase() + p.slice(1); };

/** '#rrggbb' or '#rgb' (or a few CSS names) → { r, g, b, a } in 0…1. */
export function rgba(color) {
  const named = { white: '#ffffff', black: '#000000', red: '#ff0000', transparent: '#00000000' };
  let c = String(color || '#ffffff').trim().toLowerCase();
  c = named[c] || c;
  const m = /^#([0-9a-f]{3,8})$/.exec(c);
  if (!m) return { r: 1, g: 1, b: 1, a: 1 };
  let h = m[1];
  if (h.length <= 4) h = [...h].map((x) => x + x).join('');
  const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
}
export const hex6 = (color) => { const { r, g, b } = rgba(color); return [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join(''); };

/**
 * A tileset picture for a map whose tiles are plain colours: one row of squares,
 * tile id 1 first. SVG, because both Godot and Phaser import it without any tools.
 */
export function colourTilesetSVG(map) {
  const ids = Object.keys(map.tiles).map(Number);
  const count = Math.max(1, ...ids, ...map.data);
  const tw = map.tileWidth;
  const th = map.tileHeight;
  const rects = [];
  for (let id = 1; id <= count; id++) {
    const props = map.tiles[id] || {};
    rects.push(`<rect x="${(id - 1) * tw}" y="0" width="${tw}" height="${th}" fill="#${hex6(props.color || '#888888')}"/>`);
  }
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${count * tw}" height="${th}" viewBox="0 0 ${count * tw} ${th}" shape-rendering="crispEdges">\n${rects.join('\n')}\n</svg>\n`,
    columns: count,
    count
  };
}

/** Per-tile properties other engines must store as custom data (everything except our built-ins). */
export function customTileProps(map) {
  const names = new Map();
  for (const props of Object.values(map.tiles)) {
    for (const [k, v] of Object.entries(props)) {
      if (['solid', 'oneWay', 'color'].includes(k)) continue;
      if (!names.has(k)) names.set(k, typeof v);
    }
  }
  return [...names].map(([name, kind]) => ({ name, kind }));
}

/** Give siblings unique names (engines refuse duplicates). */
export function uniqueNames(list, nameOf, clean) {
  const used = new Map();
  return list.map((item) => {
    const base = clean(nameOf(item));
    const n = used.get(base) || 0;
    used.set(base, n + 1);
    return n ? `${base}${n + 1}` : base;
  });
}

export const commentBlock = (text, prefix) => text.split('\n').map((l) => (l.trim() ? `${prefix} ${l}` : prefix)).join('\n');
