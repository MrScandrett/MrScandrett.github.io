// Roguelike Builder lesson + Crawlspace: one seeded generator, two games.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const D = require(path.join(ROOT, 'assets/js/rogue-dungeon.js'));
globalThis.RogueDungeon = D;
const RogueEngine = require(path.join(ROOT, 'assets/js/rogue-lab.js'));

const LESSON = fs.readFileSync(path.join(ROOT, 'lessons/computer-science/graphics-and-games/roguelike-builder.html'), 'utf8');
const CRAWLSPACE_JS = fs.readFileSync(path.join(ROOT, 'student-projects/Mr. Scandrett/crawlspace/script.js'), 'utf8');

const withGenerator = (generator, extra = {}) => ({ ...D.CRAWLSPACE, dungeon: { ...D.CRAWLSPACE.dungeon, generator, ...extra } });

test('the same seed builds the same dungeon, and a different seed does not', () => {
  for (const gen of ['grid', 'bsp', 'caves']) {
    const rules = withGenerator(gen);
    assert.deepEqual(D.generate(rules, 'lantern', 2), D.generate(rules, 'lantern', 2), gen);
    assert.notDeepEqual(D.generate(rules, 'lantern', 2).tiles, D.generate(rules, 'lanterns', 2).tiles, gen);
    assert.notDeepEqual(D.generate(rules, 'lantern', 1).tiles, D.generate(rules, 'lantern', 2).tiles, gen);
  }
  assert.equal(D.toSeed('42'), 42);
  assert.equal(D.toSeed('lantern'), D.toSeed(' lantern '));
});

test('every generator connects its whole dungeon on hundreds of seeds', () => {
  for (const gen of ['grid', 'bsp', 'caves']) {
    for (let s = 0; s < 150; s++) {
      for (let depth = 1; depth <= 3; depth++) {
        const level = D.generate(withGenerator(gen), 'test-' + s, depth);
        const r = D.inspect(level);
        const where = `${gen} seed test-${s} depth ${depth}`;
        assert.ok(r.stairs > 0, `${where}: stairs unreachable or under the start`);
        assert.equal(r.reached, r.open, `${where}: sealed-off floor`);
        assert.equal(r.lostThings, 0, `${where}: unreachable monster or item`);
        const spots = new Set([level.start, ...level.monsters, ...level.items].map((t) => t.x + ',' + t.y));
        assert.equal(spots.size, 1 + level.monsters.length + level.items.length, `${where}: two things share a square`);
        for (const m of level.monsters) assert.ok(m.minDepth <= depth, `${where}: ${m.name} too early`);
      }
    }
  }
});

test('the broken cave generator in the lesson really is broken', () => {
  const broken = withGenerator('caves', { keepLargest: false, stairs: 'random' });
  let stuck = 0;
  for (let s = 0; s < 100; s++) if (D.inspect(D.generate(broken, 'check-' + s, 1)).stairs < 0) stuck++;
  assert.ok(stuck > 0, 'the "broken example" never fails, so it teaches nothing');
});

test('bad rules are explained, not crashed on', () => {
  const problems = (rules) => D.normalize(rules).problems;
  assert.deepEqual(problems(D.CRAWLSPACE), []);
  assert.match(problems({ dungeon: { generator: 'maze' } })[0], /generator/);
  assert.match(problems({ dungeon: { grid: [9, 9] } })[0], /too many rooms/);
  assert.match(problems({ dungeon: { generator: 'bsp', cols: 30, rows: 15, leaf: [16, 8] } })[0], /too big/);
  assert.match(problems({ monsters: { types: [{ ch: 'rat', name: 'rat', hp: 3, atk: 1, minDepth: 1 }] } })[0], /one character/);
  assert.throws(() => RogueEngine(null, { dungeon: { generator: 'caves' } }), /sight "room" needs rooms/);
});

test('Crawlspace builds its dungeons with the shared generator and its rules', () => {
  assert.match(CRAWLSPACE_JS, /import RogueDungeon from "\.\.\/\.\.\/\.\.\/assets\/js\/rogue-dungeon\.js";/);
  assert.match(CRAWLSPACE_JS, /const RULES = RogueDungeon\.CRAWLSPACE;/);
  assert.match(CRAWLSPACE_JS, /RogueDungeon\.generate\(RULES, seed, depth\)/);
  assert.match(CRAWLSPACE_JS, /get\("seed"\)/);
  const built = fs.readFileSync(path.join(ROOT, 'apps/crawlspace/app.min.js'), 'utf8');
  assert.match(built, /keepLargest/, 'apps/crawlspace is stale: run node build-showcase.js --only=crawlspace');
});

test('the lesson quotes Crawlspace lines that are really in its source', () => {
  const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const quotes = [...LESSON.matchAll(/<pre data-crawlspace-quote>([\s\S]*?)<\/pre>/g)].map((m) => unescape(m[1]));
  assert.ok(quotes.length >= 5);
  for (const q of quotes) assert.ok(CRAWLSPACE_JS.includes(q), 'not in Crawlspace any more:\n' + q);
});

function lessonPresets() {
  const m = /var PRESETS = (\{[\s\S]*?\n {2}\});/.exec(LESSON);
  assert.ok(m, 'PRESETS block not found');
  return new Function('CS', 'return ' + m[1])(D.CRAWLSPACE);
}

test('every Lab preset runs and builds winnable dungeons', () => {
  const presets = lessonPresets();
  assert.deepEqual(Object.keys(presets), ['crawlspace', 'library', 'caves', 'bugs']);
  assert.equal(D.rulesKey(presets.crawlspace.config), D.rulesKey(D.CRAWLSPACE), 'the Crawlspace preset no longer matches Crawlspace');
  const moves = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  for (const [id, { config }] of Object.entries(presets)) {
    for (let s = 0; s < 40; s++) {
      const r = D.inspect(D.generate(config, 'p' + s, 1 + (s % 4)));
      assert.ok(r.stairs > 0 && r.reached === r.open, `${id} seed p${s}`);
    }
    const game = RogueEngine(null, config, { seed: 'smoke' });
    let r = 7;
    for (let i = 0; i < 2000 && !game.state().over; i++) {
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const S = game.state();
      if (S.tiles[S.player.y][S.player.x] === '>') game.act('descend');
      else game.act(r % 9 === 0 ? 'drink' : moves[r % 8]);
    }
    const S = game.state();
    assert.ok(S.turn > 0 && S.player.hp >= 0, id);
  }
});

test('the same seed and the same keys replay the same Lab game', () => {
  const cfg = lessonPresets().caves.config;
  const a = RogueEngine(null, cfg, { seed: 'x' }), b = RogueEngine(null, cfg, { seed: 'x' });
  const moves = ['n', 'e', 'e', 's', 'w', 'se', 'ne', 'drink'];
  for (let i = 0; i < 300; i++) { a.act(moves[i % 8]); b.act(moves[i % 8]); }
  assert.deepEqual(a.state().player, b.state().player);
  assert.equal(a.state().turn, b.state().turn);
});

test('the build-along rogue.html plays from start to finish', () => {
  const code = /window\.ROGUE_MINI_JS = String\.raw`([\s\S]*?)`;/.exec(LESSON)[1];
  const steps = [...code.matchAll(/^\/\/ ---- (\w+) ----$/gm)].map((m) => m[1]);
  assert.deepEqual(steps, ['random', 'rooms', 'tunnels', 'things', 'draw', 'turn', 'monsters', 'play']);
  for (const s of steps) assert.ok(LESSON.includes(`data-mini="${s}"`), `step ${s} is never shown`);
  assert.ok(!code.includes('${'), 'a dollar-brace would break String.raw');

  const els = { map: { textContent: '' }, status: { textContent: '' } };
  let onKey = null;
  const sandbox = {
    Math, console,
    document: { getElementById: (id) => els[id], addEventListener: (type, fn) => { onKey = fn; } }
  };
  vm.createContext(sandbox);
  vm.runInContext(code + '\n;this.peek = () => ({ player, depth, over, map });', sandbox);
  const first = els.map.textContent;
  const rows = first.split('\n').filter(Boolean);
  assert.equal(rows.length, 21);
  assert.ok(rows.every((row) => row.length === 60));
  assert.ok(first.includes('@') && first.includes('>'));

  const press = (key) => onKey({ key, preventDefault() {} });
  // A bot that walks the shortest path (BFS over the student's own map) to the
  // nearest monster, or to the stairs once they're all gone. It should go
  // deeper, and sooner or later the monsters should win.
  const keys = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1] };
  const open = (map, x, y) => '.#>'.includes((map[y] || [])[x] || ' ');
  function nextKey({ player, map, monsters }) {
    const prev = new Map([[player.x + ',' + player.y, null]]);
    const queue = [player];
    const isMonster = (x, y) => monsters.some((m) => m.x === x && m.y === y);
    while (queue.length) {
      const c = queue.shift();
      const hit = isMonster(c.x, c.y) || (!monsters.length && map[c.y][c.x] === '>');
      if (hit) {
        let step = c;
        while (prev.get(step.x + ',' + step.y) !== player) step = prev.get(step.x + ',' + step.y);
        return Object.keys(keys).find((k) => keys[k][0] === step.x - player.x && keys[k][1] === step.y - player.y);
      }
      if (c !== player && isMonster(c.x, c.y)) continue;
      for (const [dx, dy] of Object.values(keys)) {
        const n = { x: c.x + dx, y: c.y + dy };
        if (open(map, n.x, n.y) && !prev.has(n.x + ',' + n.y)) { prev.set(n.x + ',' + n.y, c); queue.push(n); }
      }
    }
    return 'ArrowRight';
  }
  let deaths = 0, deepest = 1;
  for (let i = 0; i < 4000 && deaths < 3; i++) {
    const state = sandbox.peek();
    deepest = Math.max(deepest, state.depth);
    if (state.over) { deaths++; press('r'); continue; }
    if (state.map[state.player.y][state.player.x] === '>') { press('>'); continue; }
    press(nextKey({ ...state, monsters: vm.runInContext('monsters', sandbox) }));
  }
  assert.ok(deaths > 0, 'nobody ever died: monsters never fight back');
  assert.ok(deepest > 1, 'nobody ever reached depth 2: the stairs never work');
  assert.ok(els.status.textContent.includes('Seed 2026'));

  // Starting again rebuilds the very same first dungeon: that's what the seed is for.
  sandbox.newGame();
  assert.equal(els.map.textContent, first);
});
