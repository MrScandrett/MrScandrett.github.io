import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { exportProject, makeZip, freshGame } from '../assets/js/rosetta2d/export/index.mjs';
import { methodsOf, hintsFor } from '../assets/js/rosetta2d/export/common.mjs';
import { Game, Scene, Body, Sprite, TileMap } from '../assets/js/rosetta2d/rosetta2d.mjs';
import * as platformer from '../assets/js/rosetta2d/examples/platformer.mjs';
import * as topdown from '../assets/js/rosetta2d/examples/topdown.mjs';

const EXAMPLES = { platformer, topdown };
const exportOf = (name, target) => {
  const game = freshGame(() => EXAMPLES[name].create());
  const src = fs.readFileSync(new URL(`../assets/js/rosetta2d/examples/${name}.mjs`, import.meta.url), 'utf8');
  return exportProject(game, target, { sources: { [`${name}.mjs`]: src } });
};

/* A strict reader for the parts of Godot's .tscn text format the exporter writes. */
function parseTscn(text) {
  const sections = [];
  let cur = null;
  for (const line of text.split('\n')) {
    const head = /^\[(\w+)(.*)\]$/.exec(line);
    if (head) {
      const attrs = {};
      for (const m of head[2].matchAll(/(\w+)=("(?:[^"\\]|\\.)*"|\[[^\]]*\]|\S+)/g)) attrs[m[1]] = m[2].startsWith('"') ? JSON.parse(m[2]) : m[2];
      cur = { kind: head[1], attrs, props: {} };
      sections.push(cur);
    } else if (line.trim() && cur) {
      const m = /^([\w/:]+) = (.+)$/.exec(line);
      assert.ok(m || cur.multiline, `unparseable line in [${cur.kind}]: ${line.slice(0, 80)}`);
      if (m) cur.props[m[1]] = m[2];
    }
  }
  return sections;
}

for (const name of Object.keys(EXAMPLES)) {
  test(`Godot export of the ${name} example is a well-formed project`, () => {
    const { files } = exportOf(name, 'godot');
    for (const f of ['project.godot', 'main.tscn', 'scripts/main.gd', 'README.md', `original/${name}.mjs`]) assert.ok(files[f], `missing ${f}`);

    const sections = parseTscn(files['main.tscn']);
    const header = sections[0];
    assert.equal(header.kind, 'gd_scene');
    assert.equal(header.attrs.format, '3');
    const ext = sections.filter((s) => s.kind === 'ext_resource');
    const sub = sections.filter((s) => s.kind === 'sub_resource');
    assert.equal(+header.attrs.load_steps, ext.length + sub.length + 1);

    // every resource is defined before it is used, and every file it points to is in the export
    const defined = new Set();
    for (const s of sections) {
      for (const v of Object.values(s.props)) {
        for (const m of v.matchAll(/(?:Ext|Sub)Resource\("([^"]+)"\)/g)) assert.ok(defined.has(m[1]), `${m[1]} used before it is defined`);
      }
      if (s.kind === 'ext_resource') {
        defined.add(s.attrs.id);
        assert.ok(files[s.attrs.path.replace('res://', '')] !== undefined, `missing file ${s.attrs.path}`);
      }
      if (s.kind === 'sub_resource') defined.add(s.attrs.id);
    }

    // node tree: one root, parents exist before children, sibling names unique
    const nodes = sections.filter((s) => s.kind === 'node');
    assert.equal(nodes.filter((n) => n.attrs.parent === undefined).length, 1);
    const paths = new Set(['.']);
    for (const n of nodes.slice(1)) {
      assert.ok(paths.has(n.attrs.parent), `parent "${n.attrs.parent}" of "${n.attrs.name}" not defined yet`);
      const p = n.attrs.parent === '.' ? n.attrs.name : `${n.attrs.parent}/${n.attrs.name}`;
      assert.ok(!paths.has(p), `duplicate node path ${p}`);
      assert.doesNotMatch(n.attrs.name, /[.:@/"%]/, 'invalid characters in a Godot node name');
      paths.add(p);
    }

    // bodies and areas carry a collision shape
    for (const n of nodes) {
      if (!/Body2D|Area2D/.test(n.attrs.type)) continue;
      const me = n.attrs.parent === '.' ? n.attrs.name : `${n.attrs.parent}/${n.attrs.name}`;
      assert.ok(nodes.some((c) => c.attrs.parent === me && c.attrs.type === 'CollisionShape2D'), `${me} has no CollisionShape2D`);
    }

    // scripts: start with extends, every func has an indented body
    for (const [f, text] of Object.entries(files)) {
      if (!f.endsWith('.gd')) continue;
      assert.match(text, /^extends \w+/, `${f} must start with extends`);
      const lines = text.split('\n');
      lines.forEach((l, i) => {
        if (/^func /.test(l)) assert.match(lines[i + 1] || '', /^\t\S/, `${f}: "${l}" needs an indented body`);
        assert.doesNotMatch(l, /^ +\S/, `${f}:${i + 1} indents with spaces; GDScript here uses tabs`);
      });
    }

    // project settings
    const project = files['project.godot'];
    assert.match(project, /run\/main_scene="res:\/\/main.tscn"/);
    const game = freshGame(() => EXAMPLES[name].create());
    for (const action of Object.keys(game.input.actions)) assert.match(project, new RegExp(`^${action}=\\{`, 'm'), `input action ${action} missing`);
  });
}

test('Godot tile data encodes every non-empty cell at the right atlas position', () => {
  const { files } = exportOf('platformer', 'godot');
  const tscn = files['main.tscn'];
  const bytes = /tile_map_data = PackedByteArray\(([^)]*)\)/.exec(tscn)[1].split(', ').map(Number);
  const game = freshGame(() => platformer.create());
  const map = game.find('Ground');
  const cells = map.data.filter(Boolean).length;
  assert.equal(bytes.length, 2 + cells * 12);
  assert.deepEqual(bytes.slice(0, 2), [0, 0], 'format version 0');
  const u16 = (i) => bytes[i] | (bytes[i + 1] << 8);
  for (let c = 0; c < cells; c++) {
    const o = 2 + c * 12;
    const [x, y, source, ax, ay, alt] = [0, 2, 4, 6, 8, 10].map((k) => u16(o + k));
    assert.equal(source, 0);
    assert.equal(alt, 0);
    assert.equal(ay, 0);
    assert.equal(ax, map.tileAt(x, y) - 1, `cell ${x},${y}`);
  }
  assert.match(tscn, /one_way = true/);
  assert.match(tscn, /custom_data_layer_0\/name = "hazard"/);
});

test('Godot scripts extend the right node, keep the original code, and move the right way', () => {
  const { files } = exportOf('topdown', 'godot');
  const enemy = files['scripts/enemy.gd'];
  assert.match(enemy, /^extends CharacterBody2D/);
  assert.match(enemy, /move_and_collide/, 'bounce = 1 becomes a bounce');
  assert.doesNotMatch(enemy, /get_gravity/, 'gravityScale = 0 means no gravity line');
  const player = files['scripts/player.gd'];
  assert.match(player, /#\s+const move = this\.game\.input\.vector/);
  assert.match(player, /Input\.get_vector\('left', 'right', 'up', 'down'\)/);
  const gem = files['scripts/gem.gd'];
  assert.match(gem, /^extends Area2D/);
  const enemyTscn = files['scenes/enemy.tscn'];
  assert.match(enemyTscn, /collision_layer = 4/, 'enemy layer kept');
  const tscn = files['main.tscn'];
  assert.match(tscn, /\[node name="Camera2D" type="Camera2D" parent="\."\]/, 'no follow target: camera at the root');
});

test('Phaser export: files parse as JavaScript modules and imports resolve', () => {
  for (const name of Object.keys(EXAMPLES)) {
    const { files } = exportOf(name, 'phaser');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r2d-phaser-'));
    for (const [f, v] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      fs.writeFileSync(path.join(dir, f), v);
    }
    for (const f of Object.keys(files).filter((f) => f.endsWith('.js'))) {
      const copy = path.join(dir, f.replace(/\.js$/, '.check.mjs'));
      fs.copyFileSync(path.join(dir, f), copy);
      execFileSync(process.execPath, ['--check', copy]);
      for (const m of files[f].matchAll(/from '(\.[^']+)'/g)) assert.ok(fs.existsSync(path.resolve(path.dirname(path.join(dir, f)), m[1])), `${f} imports missing ${m[1]}`);
    }
    for (const m of files['main.js'].matchAll(/this\.load\.\w+\([^,]+, "([^"]+)"/g)) assert.ok(files[m[1]], `main.js loads missing ${m[1]}`);
    assert.match(files['index.html'], /phaser@3\.80\.1/);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('exports carry images when the game used them', () => {
  const game = new Game();
  game.assets.add('hero', { width: 32, height: 16 });
  game.start(new Scene({ children: [new Sprite({ texture: 'hero', frameWidth: 16, frameHeight: 16, anims: { run: { frames: [0, 1], fps: 8 } }, animation: 'run' })] }));
  const images = { hero: { bytes: new Uint8Array([137, 80, 78, 71]), ext: 'png', width: 32, height: 16 } };
  const godot = exportProject(game, 'godot', { images }).files;
  assert.ok(godot['art/hero.png']);
  assert.match(godot['main.tscn'], /type="AnimatedSprite2D"/);
  assert.match(godot['main.tscn'], /region = Rect2\(16, 0, 16, 16\)/);
  const phaser = exportProject(game, 'phaser', { images }).files;
  assert.match(phaser['main.js'], /this\.load\.spritesheet\("hero", "assets\/hero\.png", \{ frameWidth: 16, frameHeight: 16 \}\)/);
  const missing = exportProject(game, 'godot').report.warnings.join(' ');
  assert.match(missing, /image was not provided/);
});

test('methodsOf reads class methods even with braces in strings and comments', () => {
  class Tricky extends Body {
    setup() { super.setup(); this.label = '{ not a block }'; }
    fixedUpdate(dt) {
      // a comment with a } brace
      const s = `template ${'{'} with braces }`;
      if (s) { this.vx = 1; }
    }
    jump(height = 2) { return { height }; }
  }
  const names = methodsOf(Tricky).map((m) => `${m.name}(${m.params})`);
  assert.deepEqual(names, ['setup()', 'fixedUpdate(dt)', 'jump(height = 2)']);
  assert.ok(hintsFor(methodsOf(Tricky)[1].body, 'godot').some((h) => h.to === 'velocity.x'));
});

test('zip output is a valid archive', () => {
  const { files } = exportOf('platformer', 'godot');
  const zip = makeZip(files);
  const file = path.join(os.tmpdir(), `r2d-${process.pid}.zip`);
  fs.writeFileSync(file, zip);
  const listing = execFileSync('unzip', ['-t', file]).toString();
  assert.match(listing, /No errors detected/);
  const names = execFileSync('unzip', ['-Z1', file]).toString().trim().split('\n').sort();
  assert.deepEqual(names, Object.keys(files).sort());
  fs.rmSync(file);
});

test('a map exported for Tiled has real tileset columns and size', () => {
  const tiled = TileMap.toTiled(freshGame(() => platformer.create()).find('Ground'));
  const ts = tiled.tilesets[0];
  assert.equal(ts.imagewidth, ts.columns * ts.tilewidth);
  assert.ok(ts.columns > 0 && ts.tilecount > 0);
});
