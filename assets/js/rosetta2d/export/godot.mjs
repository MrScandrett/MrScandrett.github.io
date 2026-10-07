// godot.mjs — export a running Rosetta 2D game as a Godot 4 project (4.3 or newer).
//
// What converts automatically: the scene tree (bodies, areas, tilemaps with a real
// TileSet and collision, shapes, sprites, text, timers, parallax layers, the HUD),
// collision layers and masks, tags (as groups), the camera, gravity, window size,
// pixel-art filtering and the input actions.
// What needs a person: the code inside your own classes. Each class becomes a
// GDScript file that already extends the right Godot node and moves the right way;
// your Rosetta 2D code sits inside each function as comments, with hints.
import { Body, Area, Shape, Sprite, TileMap, Text, Timer } from '../rosetta2d.mjs';
import {
  snapshot, settingsOf, baseOf, customFields, changedDefaults, methodsOf, hintsFor, probe, gameClasses, typeName,
  snake, rgba, colourTilesetSVG, customTileProps, uniqueNames, commentBlock
} from './common.mjs';

/* ── Godot text-format values ─────────────────────────────────────────── */

const num = (v) => (Number.isInteger(v) ? String(v) : String(+v.toFixed(5)));
const v2 = (x, y) => `Vector2(${num(x)}, ${num(y)})`;
const v2i = (x, y) => `Vector2i(${Math.round(x)}, ${Math.round(y)})`;
const str = (s) => JSON.stringify(String(s));
const color = (c, alpha = 1) => { const { r, g, b, a } = rgba(c); return `Color(${num(r)}, ${num(g)}, ${num(b)}, ${num(a * alpha)})`; };
const godotName = (s) => String(s || 'Node').replace(/[.:@/"%]/g, '_').trim() || 'Node';
const value = (v) => (typeof v === 'string' ? str(v) : typeof v === 'boolean' ? String(v) : num(v));

/* ── keyboard / gamepad codes → Godot ─────────────────────────────────── */

const GODOT_KEYS = {
  Space: 32, Enter: 4194309, NumpadEnter: 4194310, Escape: 4194305, Tab: 4194306, Backspace: 4194308,
  ArrowLeft: 4194319, ArrowUp: 4194320, ArrowRight: 4194321, ArrowDown: 4194322,
  ShiftLeft: 4194325, ShiftRight: 4194325, ControlLeft: 4194326, ControlRight: 4194326, AltLeft: 4194328, AltRight: 4194328
};
function godotKey(code) {
  if (GODOT_KEYS[code]) return GODOT_KEYS[code];
  let m = /^Key([A-Z])$/.exec(code);
  if (m) return m[1].charCodeAt(0);
  m = /^Digit(\d)$/.exec(code);
  if (m) return 48 + +m[1];
  return null;
}
const GODOT_PAD = { PadA: 0, PadB: 1, PadX: 2, PadY: 3, PadSelect: 4, PadStart: 6, PadL3: 7, PadR3: 8, PadL: 9, PadR: 10, PadUp: 11, PadDown: 12, PadLeft: 13, PadRight: 14 };

function inputSection(actions, report) {
  const lines = ['[input]', ''];
  for (const [name, codes] of Object.entries(actions)) {
    const events = [];
    for (const code of codes) {
      const key = godotKey(code);
      if (key) events.push(`Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":${key},"key_label":0,"unicode":0,"location":0,"echo":false,"script":null)`);
      else if (code in GODOT_PAD) events.push(`Object(InputEventJoypadButton,"resource_local_to_scene":false,"resource_name":"","device":-1,"button_index":${GODOT_PAD[code]},"pressure":0.0,"pressed":true,"script":null)`);
      else if (code === 'Pointer') events.push('Object(InputEventMouseButton,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"button_mask":0,"position":Vector2(0, 0),"global_position":Vector2(0, 0),"factor":1.0,"button_index":1,"canceled":false,"pressed":true,"double_click":false,"script":null)');
      else report.warn(`Input action "${name}": key "${code}" has no Godot equivalent in the exporter; add it in Project Settings → Input Map.`);
    }
    lines.push(`${name}={`, '"deadzone": 0.5,', `"events": [${events.join('\n, ')}]`, '}');
  }
  return lines.join('\n');
}

/* ── a .tscn writer ───────────────────────────────────────────────────── */

class SceneFile {
  constructor() { this.ext = []; this.sub = []; this.nodes = []; }
  extResource(type, path) {
    let r = this.ext.find((e) => e.path === path);
    if (!r) { r = { type, path, id: `${this.ext.length + 1}_${snake(path.split('/').pop().split('.')[0])}` }; this.ext.push(r); }
    return `ExtResource("${r.id}")`;
  }
  subResource(type, props) {
    const id = `${type}_${this.sub.length + 1}`;
    this.sub.push({ type, id, props });
    return `SubResource("${id}")`;
  }
  node(name, type, parent, props = [], groups = [], instance = null) {
    const n = { name, type, parent, props, groups, instance };
    this.nodes.push(n);
    return n;
  }
  toString() {
    const out = [`[gd_scene load_steps=${this.ext.length + this.sub.length + 1} format=3]`, ''];
    for (const e of this.ext) out.push(`[ext_resource type="${e.type}" path="${e.path}" id="${e.id}"]`);
    if (this.ext.length) out.push('');
    for (const s of this.sub) {
      out.push(`[sub_resource type="${s.type}" id="${s.id}"]`);
      for (const [k, v] of s.props) out.push(`${k} = ${v}`);
      out.push('');
    }
    for (const n of this.nodes) {
      let head = `[node name=${str(n.name)}`;
      if (n.type) head += ` type="${n.type}"`;
      if (n.parent != null) head += ` parent=${str(n.parent)}`;
      if (n.instance) head += ` instance=${n.instance}`;
      if (n.groups.length) head += ` groups=[${n.groups.map(str).join(', ')}]`;
      out.push(head + ']');
      for (const [k, v] of n.props) out.push(`${k} = ${v}`);
      out.push('');
    }
    return out.join('\n');
  }
}

/* ── GDScript for the student's classes ───────────────────────────────── */

const GODOT_TYPE = new Map([[Body, 'CharacterBody2D'], [Area, 'Area2D'], [Sprite, 'Sprite2D'], [Shape, 'Polygon2D'], [TileMap, 'TileMapLayer'], [Text, 'Label'], [Timer, 'Timer']]);
const godotTypeFor = (snap) => {
  const B = snap.base;
  if (B === Body) return snap.node.static ? 'StaticBody2D' : 'CharacterBody2D';
  if (B === Sprite && Object.keys(snap.node.anims || {}).length) return 'AnimatedSprite2D';
  return GODOT_TYPE.get(B) || 'Node2D';
};
const LIFECYCLE = {
  ready: { sig: '_ready() -> void' },
  fixedUpdate: { sig: '_physics_process(delta: float) -> void' },
  update: { sig: '_process(delta: float) -> void' },
  draw: { sig: '_draw() -> void' },
  onDestroy: { sig: '_exit_tree() -> void' }
};

function movementTail(C) {
  const changed = changedDefaults(C);
  const g = changed.gravityScale ?? 1;
  const lines = [];
  if (g !== 0) lines.push(`\t# Rosetta 2D adds gravity to every Body for you; in Godot you write it:\n\tvelocity += get_gravity() * ${g === 1 ? '' : `${num(g)} * `}delta`);
  if (changed.bounce) {
    lines.push(`\t# Rosetta 2D's bounce = ${num(changed.bounce)}: reflect off whatever we hit.`);
    lines.push('\tvar collision := move_and_collide(velocity * delta)');
    lines.push(`\tif collision:\n\t\tvelocity = velocity.bounce(collision.get_normal())${changed.bounce === 1 ? '' : ` * ${num(changed.bounce)}`}`);
  } else {
    lines.push('\t# Rosetta 2D moves every Body for you; in Godot, call:\n\tmove_and_slide()');
  }
  return lines.join('\n');
}

function scriptFor(C, godotType) {
  const base = baseOf(C);
  const type = Object.prototype.hasOwnProperty.call(C, 'type') ? C.type : C.name;
  const methods = methodsOf(C);
  const fields = customFields(C);
  const out = [
    `extends ${godotType}`,
    `## Exported from the Rosetta 2D class ${type} (extends ${base.type}).`,
    '## Your original code is kept inside each function as comments. Translate it line by line,',
    '## using the hints, then delete the comments. See README.md for the full checklist.',
    ''
  ];
  if (fields.length) {
    for (const f of fields) {
      const t = typeof f.value === 'number' ? 'float' : typeof f.value === 'boolean' ? 'bool' : 'String';
      const v = typeof f.value === 'number' ? num(f.value) + (Number.isInteger(f.value) ? '.0' : '') : value(f.value);
      out.push(`@export var ${snake(f.name)}: ${t} = ${v}`);
    }
    out.push('');
  }
  const setup = methods.find((m) => m.name === 'setup');
  if (setup) out.push('# Rosetta 2D setup(), now the variables above and the values in main.tscn:', commentBlock(setup.body, '#'), '');

  const listensEnter = methods.some((m) => /\.on\(\s*['"]enter['"]/.test(m.body));
  const listensExit = methods.some((m) => /\.on\(\s*['"]exit['"]/.test(m.body));
  const isMover = base === Body && godotType === 'CharacterBody2D';
  const order = ['ready', 'fixedUpdate', 'update', 'draw', 'onDestroy'];
  const lifecycle = order.map((n) => methods.find((m) => m.name === n)).filter(Boolean);
  if (isMover && !methods.some((m) => m.name === 'fixedUpdate')) lifecycle.push({ name: 'fixedUpdate', params: 'dt', body: '' });
  if ((listensEnter || listensExit) && !methods.some((m) => m.name === 'ready')) lifecycle.unshift({ name: 'ready', params: '', body: '' });

  for (const m of lifecycle.concat(methods.filter((x) => !(x.name in LIFECYCLE) && x.name !== 'setup' && x.name !== 'constructor'))) {
    const life = LIFECYCLE[m.name];
    out.push(`func ${life ? life.sig : `${snake(m.name)}(${m.params.split(',').map((p) => snake(p.split('=')[0])).filter((p) => p !== 'node').join(', ')}) -> void`}:`);
    if (m.body) {
      out.push(`\t# Rosetta 2D ${m.name}(${m.params}):`, commentBlock(m.body, '\t#   '));
      const hints = hintsFor(m.body, 'godot');
      if (hints.length) out.push('\t# Hints:', ...hints.map((h) => `\t#   ${h.from}  →  ${h.to}`));
    }
    if (m.name === 'ready' && listensEnter) out.push('\tbody_entered.connect(_on_entered)', '\tarea_entered.connect(_on_entered)');
    if (m.name === 'ready' && listensExit) out.push('\tbody_exited.connect(_on_exited)', '\tarea_exited.connect(_on_exited)');
    if (m.name === 'fixedUpdate' && isMover) out.push(movementTail(C));
    else out.push('\tpass');
    out.push('');
  }
  if (listensEnter) out.push('# Rosetta 2D fires one "enter" signal for bodies and areas; Godot has one of each.', 'func _on_entered(other: Node2D) -> void:', '\tpass', '');
  if (listensExit) out.push('func _on_exited(other: Node2D) -> void:', '\tpass', '');
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

const GENERIC_BODY = `extends CharacterBody2D
## A plain Rosetta 2D Body: it moves at its velocity, with gravity and bounce.

@export var gravity_scale: float = 1.0
@export var bounce: float = 0.0

func _physics_process(delta: float) -> void:
\tvelocity += get_gravity() * gravity_scale * delta
\tif bounce > 0.0:
\t\tvar collision := move_and_collide(velocity * delta)
\t\tif collision:
\t\t\tvelocity = velocity.bounce(collision.get_normal()) * bounce
\telse:
\t\tmove_and_slide()
`;

/* ── the export ───────────────────────────────────────────────────────── */

/**
 * exportGodot(game, { sources, images }) → { files, report }
 *   sources: { 'platformer.mjs': text } your original files, copied into original/
 *   images:  { textureKey: { bytes: Uint8Array, ext: 'png', width, height } }
 */
export function exportGodot(game, { sources = {}, images = {} } = {}) {
  const report = makeReport();
  const settings = settingsOf(game);
  const root = snapshot(game.scene);
  let scene = new SceneFile(); // the scene file being written (swapped while writing a prefab)
  const prefabs = new Map();
  const building = new Set();
  const files = {};
  const scripts = new Map();
  const emitted = new Set();

  const pathOf = new Map();
  const addScript = (C, godotType) => {
    if (!scripts.has(C)) {
      const type = Object.prototype.hasOwnProperty.call(C, 'type') ? C.type : C.name;
      const path = `res://scripts/${snake(type)}.gd`;
      files[`scripts/${snake(type)}.gd`] = scriptFor(C, godotType);
      scripts.set(C, path);
      for (const m of methodsOf(C)) for (const e of m.body.matchAll(/\.emit\(\s*['"]([\w-]+)['"]/g)) emitted.add(e[1]);
      report.todo(`Translate scripts/${snake(type)}.gd (from your ${type} class).`);
    }
    return scene.extResource('Script', scripts.get(C));
  };

  const common = (n, props) => {
    if (n.rotation) props.push(['rotation', num(n.rotation)]);
    if (n.scaleX !== 1 || n.scaleY !== 1) props.push(['scale', v2(n.scaleX, n.scaleY)]);
    if (n.visible === false) props.push(['visible', 'false']);
    if (n.z) props.push(['z_index', String(Math.round(n.z))]);
    if (n.alpha !== 1) props.push(['modulate', `Color(1, 1, 1, ${num(n.alpha)})`]);
  };
  const shapeChild = (n, parentPath) => {
    const shape = scene.subResource('RectangleShape2D', [['size', v2(n.w, n.h)]]);
    const props = [['shape', shape]];
    if (n.offsetX || n.offsetY) props.unshift(['position', v2(n.offsetX, n.offsetY)]);
    scene.node('CollisionShape2D', 'CollisionShape2D', parentPath, props);
  };
  const layers = (n, props) => {
    if (n.layer !== 1) props.push(['collision_layer', String(n.layer)]);
    if (n.mask !== 1) props.push(['collision_mask', String(n.mask)]);
  };

  // Each of your classes becomes a prefab scene (scenes/coin.tscn) that main.tscn instances,
  // the way Godot projects reuse objects. Spawning one later: preload(...).instantiate().
  function ensurePrefab(C) {
    if (prefabs.has(C)) return prefabs.get(C);
    const file = `scenes/${snake(typeName(C))}.tscn`;
    prefabs.set(C, `res://${file}`);
    let inst = probe(C);
    if (!inst) {
      report.warn(`${typeName(C)}: its ready() needs the real scene, so the prefab has no children made in ready(). Add them in Godot.`);
      inst = new C();
    }
    const saved = scene;
    scene = new SceneFile();
    building.add(C);
    emitNode(snapshot(inst), null, godotName(typeName(C)), true);
    building.delete(C);
    files[file] = scene.toString();
    scene = saved;
    return prefabs.get(C);
  }

  function emitInstance(snap, parentPath, name) {
    const n = snap.node;
    const C = n.constructor;
    const props = [];
    if (n.x || n.y) props.push(['position', v2(n.x, n.y)]);
    common(n, props);
    if (n instanceof Body && (n.vx || n.vy)) props.push(['velocity', v2(n.vx, n.vy)]);
    for (const f of customFields(C)) {
      if (n[f.name] !== f.value && ['number', 'string', 'boolean'].includes(typeof n[f.name])) props.push([snake(f.name), value(n[f.name])]);
    }
    scene.node(name, null, parentPath, props, [], scene.extResource('PackedScene', ensurePrefab(C)));
    pathOf.set(n, parentPath === '.' ? name : `${parentPath}/${name}`);
  }

  function emitNode(snap, parentPath, name, asRoot = false) {
    const n = snap.node;
    if (snap.custom && !asRoot && !building.has(n.constructor)) return emitInstance(snap, parentPath, name);
    const type = godotTypeFor(snap);
    const props = [];
    const posKey = n instanceof Text ? null : 'position';
    if (posKey && (n.x || n.y)) props.push([posKey, v2(n.x, n.y)]);
    common(n, props);

    if (n instanceof Body) {
      layers(n, props);
      if (!n.static && !snap.custom) {
        props.push(['script', scene.extResource('Script', 'res://rosetta/body.gd')]);
        files['rosetta/body.gd'] = GENERIC_BODY;
        if (n.gravityScale !== 1) props.push(['gravity_scale', num(n.gravityScale)]);
        if (n.bounce) props.push(['bounce', num(n.bounce)]);
      }
      if (n.vx || n.vy) props.push(['velocity', v2(n.vx, n.vy)]);
    } else if (n instanceof Area) {
      layers(n, props);
      if (!n.monitoring) props.push(['monitoring', 'false']);
    } else if (n instanceof Shape) {
      props.push(['color', color(n.color || '#ffffff')]);
      props.push(['polygon', polygon(n)]);
      if (n.outline) report.warn(`Shape "${n.name}": outlines are not exported (add a Line2D in Godot if you want one).`);
    } else if (n instanceof Text) {
      const align = { left: 0, center: 1, right: 2 }[n.align] ?? 0;
      const span = 400;
      const left = align === 0 ? n.x : align === 1 ? n.x - span / 2 : n.x - span;
      props.push(['offset_left', num(left)], ['offset_top', num(n.y)], ['offset_right', num(left + span)], ['offset_bottom', num(n.y + n.size * 1.4 * String(n.text).split('\n').length)]);
      props.push(['theme_override_colors/font_color', color(n.color)], ['theme_override_font_sizes/font_size', String(Math.round(n.size))]);
      if (align) props.push(['horizontal_alignment', String(align)]);
      props.push(['text', str(n.text)]);
    } else if (n instanceof Timer) {
      props.push(['wait_time', num(n.wait)]);
      if (!n.oneShot) props.push(['one_shot', 'false']); else props.push(['one_shot', 'true']);
      if (n.autostart || n.running) props.push(['autostart', 'true']);
    } else if (n instanceof TileMap) {
      tileMapProps(n, props);
    } else if (n instanceof Sprite) {
      spriteProps(n, props, type);
    }

    if (snap.custom) {
      props.push(['script', addScript(n.constructor, type)]);
      for (const f of customFields(n.constructor)) {
        if (n[f.name] !== f.value && ['number', 'string', 'boolean'].includes(typeof n[f.name])) props.push([snake(f.name), value(n[f.name])]);
      }
    }
    scene.node(name, type, parentPath, props, (n.tags || []).filter(Boolean));
    const myPath = parentPath == null ? '.' : parentPath === '.' ? name : `${parentPath}/${name}`;
    pathOf.set(n, myPath);
    if ((n instanceof Body || n instanceof Area)) shapeChild(n, myPath);
    emitChildren(snap, myPath);
  }

  function emitChildren(snap, myPath) {
    // children with the same parallax share one wrapper: a CanvasLayer for the HUD (parallax 0),
    // a Parallax2D for background layers
    const groups = new Map();
    for (const c of snap.children) {
      const p = c.node.parallax ?? 1;
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).push(c);
    }
    for (const [p, kids] of groups) {
      let path = myPath;
      if (p === 0) {
        scene.node('HUD', 'CanvasLayer', myPath, []);
        path = myPath === '.' ? 'HUD' : `${myPath}/HUD`;
      } else if (p !== 1) {
        const name = `Parallax${String(p).replace('.', '_')}`;
        scene.node(name, 'Parallax2D', myPath, [['scroll_scale', v2(p, p)]]);
        path = myPath === '.' ? name : `${myPath}/${name}`;
      }
      const names = uniqueNames(kids, (k) => k.node.name, godotName);
      kids.forEach((k, i) => emitNode(k, path, names[i]));
    }
  }

  function polygon(n) {
    const pts = [];
    if (n.kind === 'circle') {
      const steps = Math.max(12, Math.min(32, Math.round(n.w)));
      for (let i = 0; i < steps; i++) { const a = (i / steps) * Math.PI * 2; pts.push(num(Math.cos(a) * n.w / 2), num(Math.sin(a) * n.h / 2)); }
    } else {
      const x = n.w / 2; const y = n.h / 2;
      pts.push(num(-x), num(-y), num(x), num(-y), num(x), num(y), num(-x), num(y));
    }
    return `PackedVector2Array(${pts.join(', ')})`;
  }

  function tileMapProps(map, props) {
    const tw = map.tileWidth; const th = map.tileHeight;
    const ts = map.tileset;
    const img = ts && images[ts.texture];
    let texture; let columns; let firstId = 1; let margin = 0; let spacing = 0;
    if (img) {
      const file = `art/${snake(ts.texture)}.${img.ext || 'png'}`;
      files[file] = img.bytes;
      texture = scene.extResource('Texture2D', `res://${file}`);
      margin = ts.margin || 0; spacing = ts.spacing || 0; firstId = ts.firstId || 1;
      columns = ts.columns || Math.max(1, Math.floor((img.width - margin * 2 + spacing) / (tw + spacing)));
    } else {
      if (ts && ts.texture) report.warn(`TileMap "${map.name}": the tileset image "${ts.texture}" was not provided, so its tiles are exported as coloured squares.`);
      const atlas = colourTilesetSVG(map);
      const file = `art/${snake(map.name)}_tiles.svg`;
      files[file] = atlas.svg;
      texture = scene.extResource('Texture2D', `res://${file}`);
      columns = atlas.columns;
    }
    const atlasOf = (id) => { const i = id - firstId; return [i % columns, Math.floor(i / columns)]; };
    const custom = customTileProps(map);
    const ids = new Set([...map.data.filter(Boolean), ...Object.keys(map.tiles).map(Number)]);
    const sourceProps = [['texture', texture], ['texture_region_size', v2i(tw, th)]];
    if (margin) sourceProps.push(['margins', v2i(margin, margin)]);
    if (spacing) sourceProps.push(['separation', v2i(spacing, spacing)]);
    const hw = tw / 2; const hh = th / 2;
    for (const id of [...ids].sort((a, b) => a - b)) {
      const [ax, ay] = atlasOf(id);
      const key = `${ax}:${ay}/0`;
      const p = map.tiles[id] || {};
      sourceProps.push([key, '0']);
      if (p.solid || p.oneWay) {
        sourceProps.push([`${key}/physics_layer_0/polygon_0/points`, `PackedVector2Array(${[-hw, -hh, hw, -hh, hw, hh, -hw, hh].map(num).join(', ')})`]);
        if (!p.solid && p.oneWay) sourceProps.push([`${key}/physics_layer_0/polygon_0/one_way`, 'true']);
      }
      custom.forEach((c, i) => { if (p[c.name] !== undefined) sourceProps.push([`${key}/custom_data_${i}`, value(p[c.name])]); });
    }
    const source = scene.subResource('TileSetAtlasSource', sourceProps);
    const setProps = [['tile_size', v2i(tw, th)], ['physics_layer_0/collision_layer', String(map.layer)]];
    custom.forEach((c, i) => setProps.push([`custom_data_layer_${i}/name`, str(c.name)], [`custom_data_layer_${i}/type`, c.kind === 'boolean' ? '1' : c.kind === 'number' ? '3' : '4']));
    setProps.push(['sources/0', source]);
    props.push(['tile_set', scene.subResource('TileSet', setProps)]);
    // TileMapLayer cell data: format 0, then 6 little-endian uint16 per cell (x, y, source, atlas x, atlas y, alternative)
    const bytes = [0, 0];
    const u16 = (v) => bytes.push(v & 0xff, (v >> 8) & 0xff);
    for (let ty = 0; ty < map.rows; ty++) for (let tx = 0; tx < map.columns; tx++) {
      const id = map.tileAt(tx, ty);
      if (!id) continue;
      const [ax, ay] = atlasOf(id);
      u16(tx); u16(ty); u16(0); u16(ax); u16(ay); u16(0);
    }
    props.push(['tile_map_data', `PackedByteArray(${bytes.join(', ')})`]);
    if (!map.collides) props.push(['collision_enabled', 'false']);
    files[`maps/${snake(map.name)}.tiled.json`] = JSON.stringify(TileMap.toTiled(map), null, 2);
  }

  function spriteProps(s, props, type) {
    const img = typeof s.texture === 'string' ? images[s.texture] : null;
    if (!img) { report.warn(`Sprite "${s.name}": its image was not provided, so it is exported without a texture.`); return; }
    const file = `art/${snake(s.texture)}.${img.ext || 'png'}`;
    files[file] = img.bytes;
    const tex = scene.extResource('Texture2D', `res://${file}`);
    const fw = s.frameWidth || img.width; const fh = s.frameHeight || img.height;
    if (s.flipX) props.push(['flip_h', 'true']);
    if (s.flipY) props.push(['flip_v', 'true']);
    if (s.originX !== 0.5 || s.originY !== 0.5) props.push(['offset', v2((0.5 - s.originX) * fw, (0.5 - s.originY) * fh)]);
    if (type === 'Sprite2D') {
      props.push(['texture', tex]);
      const cols = Math.max(1, Math.floor(img.width / fw)); const rows = Math.max(1, Math.floor(img.height / fh));
      if (cols > 1) props.push(['hframes', String(cols)]);
      if (rows > 1) props.push(['vframes', String(rows)]);
      if (s.frame) props.push(['frame', String(s.frame)]);
      return;
    }
    const cols = Math.max(1, Math.floor(img.width / fw));
    const anims = Object.entries(s.anims).map(([name, a]) => {
      const frames = a.frames.map((f) => {
        const at = scene.subResource('AtlasTexture', [['atlas', tex], ['region', `Rect2(${(f % cols) * fw}, ${Math.floor(f / cols) * fh}, ${fw}, ${fh})`]]);
        return `{\n"duration": 1.0,\n"texture": ${at}\n}`;
      });
      return `{\n"frames": [${frames.join(', ')}],\n"loop": ${a.loop !== false},\n"name": &${str(name)},\n"speed": ${num(a.fps || 10)}.0\n}`.replace(/(\d)\.0\.0/, '$1.0');
    });
    props.push(['sprite_frames', scene.subResource('SpriteFrames', [['animations', `[${anims.join(', ')}]`]])]);
    if (s.animation) props.push(['animation', `&${str(s.animation)}`], ['autoplay', str(s.animation)]);
  }

  // root
  const rootName = godotName(settings.title);
  const rootProps = [];
  scene.node(rootName, 'Node2D', null, rootProps);
  pathOf.set(game.scene, '.');
  emitChildren(root, '.');

  // classes the game spawns while it runs (not in the scene yet) still get a script and a prefab
  for (const C of gameClasses(root, sources)) {
    const inScene = prefabs.has(C);
    ensurePrefab(C);
    if (!inScene) report.todo(`${typeName(C)} appears while the game runs: spawn it with add_child(preload("res://scenes/${snake(typeName(C))}.tscn").instantiate()).`);
  }

  // camera
  const cam = settings.camera;
  const camProps = [];
  if (cam.zoom !== 1) camProps.push(['zoom', v2(cam.zoom, cam.zoom)]);
  if (cam.smoothing > 0) camProps.push(['position_smoothing_enabled', 'true'], ['position_smoothing_speed', num(1 / cam.smoothing)]);
  if (cam.deadzone[0] || cam.deadzone[1]) {
    const mx = cam.deadzone[0] / (settings.width / cam.zoom); const my = cam.deadzone[1] / (settings.height / cam.zoom);
    camProps.push(['drag_horizontal_enabled', 'true'], ['drag_vertical_enabled', 'true']);
    for (const side of ['left', 'right']) camProps.push([`drag_${side}_margin`, num(mx)]);
    for (const side of ['top', 'bottom']) camProps.push([`drag_${side}_margin`, num(my)]);
  }
  if (cam.bounds) {
    const b = cam.bounds;
    camProps.push(['limit_left', String(Math.round(b.x))], ['limit_top', String(Math.round(b.y))], ['limit_right', String(Math.round(b.x + b.w))], ['limit_bottom', String(Math.round(b.y + b.h))]);
  }
  const targetPath = cam.target && pathOf.get(cam.target);
  if (targetPath) scene.node('Camera2D', 'Camera2D', targetPath, camProps);
  else scene.node('Camera2D', 'Camera2D', '.', [['position', v2(cam.x, cam.y)], ...camProps]);

  // a script on the root for the scene-level logic (signals, score, scene changes)
  const sourceNames = Object.keys(sources);
  for (const text of Object.values(sources)) for (const e of text.matchAll(/\.emit\(\s*['"]([\w-]+)['"]/g)) emitted.add(e[1]);
  files['scripts/main.gd'] = [
    'extends Node2D',
    '## The scene script. In Rosetta 2D, scene-level logic (score, win, game over, scene changes)',
    `## lived in the function that built the scene${sourceNames.length ? ` (see original/${sourceNames[0]})` : ''}. Rebuild it here.`,
    '',
    ...[...emitted].sort().map((s) => `signal ${snake(s)}`),
    emitted.size ? '' : null,
    'func _ready() -> void:',
    '\tpass',
    ''
  ].filter((l) => l !== null).join('\n');
  rootProps.push(['script', scene.extResource('Script', 'res://scripts/main.gd')]);
  report.todo('Rebuild the scene-level logic (score, win/lose, scene changes) in scripts/main.gd.');

  files['main.tscn'] = scene.toString();
  files['project.godot'] = projectFile(settings, report);
  files['.gitignore'] = '.godot/\n';
  for (const [name, text] of Object.entries(sources)) files[`original/${name}`] = text;
  files['README.md'] = readme(settings, report, 'godot');
  return { files, report };
}

function projectFile(s, report) {
  const scale = Math.max(1, Math.floor(Math.min(1280 / s.width, 720 / s.height)));
  return [
    '; Engine configuration file, exported from Rosetta 2D.',
    'config_version=5',
    '',
    '[application]',
    '',
    `config/name=${str(s.title)}`,
    'run/main_scene="res://main.tscn"',
    'config/features=PackedStringArray("4.3")',
    '',
    '[display]',
    '',
    `window/size/viewport_width=${s.width}`,
    `window/size/viewport_height=${s.height}`,
    `window/size/window_width_override=${s.width * scale}`,
    `window/size/window_height_override=${s.height * scale}`,
    'window/stretch/mode="viewport"',
    s.pixelArt ? 'window/stretch/scale_mode="integer"' : null,
    '',
    inputSection(s.actions, report),
    '',
    '[physics]',
    '',
    `2d/default_gravity=${num(Math.hypot(s.gravity.x, s.gravity.y) || 0)}.0`.replace(/(\.\d+)\.0$/, '$1'),
    s.gravity.x || s.gravity.y ? `2d/default_gravity_vector=${v2(s.gravity.x / (Math.hypot(s.gravity.x, s.gravity.y) || 1), s.gravity.y / (Math.hypot(s.gravity.x, s.gravity.y) || 1))}` : null,
    '',
    '[rendering]',
    '',
    s.pixelArt ? 'textures/canvas_textures/default_texture_filter=0' : null,
    `environment/defaults/default_clear_color=${color(s.background)}`,
    ''
  ].filter((l) => l !== null).join('\n');
}

export function makeReport() {
  const warnings = [];
  const todos = [];
  return { warnings, todos, warn: (m) => { if (!warnings.includes(m)) warnings.push(m); }, todo: (m) => { if (!todos.includes(m)) todos.push(m); } };
}

export function readme(settings, report, target) {
  const godot = target === 'godot';
  return [
    `# ${settings.title}`,
    '',
    `Exported from **Rosetta 2D** to **${godot ? 'Godot 4.3+' : 'Phaser 3'}**.`,
    '',
    '## Open it',
    '',
    godot
      ? '1. Unzip this folder.\n2. In Godot, choose **Import**, pick `project.godot`, then **Import & Edit**.\n3. Press **F5** to run. The level, collisions, camera and controls are already set up.'
      : '1. Unzip this folder.\n2. Serve it with any local web server (in VS Code: the Live Server extension), then open `index.html`.\n   Opening the file directly from disk will not work: browsers block modules there.',
    '',
    '## What was converted for you',
    '',
    godot
      ? '- The scene tree: bodies, areas, tilemaps (with a TileSet and collision), shapes, text, timers\n- Parallax layers (`Parallax2D`) and the HUD (`CanvasLayer`)\n- Collision layers and masks; tags became **groups**\n- The camera (follow, dead zone, smoothing, limits)\n- Window size, pixel-art filtering, gravity and every **input action** (Project Settings → Input Map)\n- Each map is also saved for the Tiled editor in `maps/`'
      : '- Every object, at the same position and draw order\n- Tilemaps (loaded from Tiled JSON in `assets/`), with solid and one-way tiles\n- Arcade physics bodies, collision layers and masks, gravity and bounce\n- Areas with enter / exit events (`rosetta.js`)\n- The camera (follow, dead zone, smoothing, bounds) and every input action',
    '',
    '## What you still translate',
    '',
    'Your own classes are where your game lives, and code does not translate itself between languages.',
    `Each class is now a ${godot ? 'GDScript file in `scripts/`' : 'class in `objects/`'} that already ${godot ? 'extends the right Godot node and moves the right way' : 'has its physics body set up'}.`,
    'Your Rosetta 2D code is inside each function as comments, with hints for the calls it uses.',
    '',
    ...report.todos.map((t) => `- [ ] ${t}`),
    '',
    report.warnings.length ? '## Notes' : null,
    report.warnings.length ? '' : null,
    ...report.warnings.map((w) => `- ${w}`),
    report.warnings.length ? '' : null,
    'The Tool Rosetta (https://mrscandrett.github.io/lessons/computer-science/graphics-and-games/tool-rosetta.html) shows every Rosetta 2D idea in other engines.',
    ''
  ].filter((l) => l !== null).join('\n');
}
