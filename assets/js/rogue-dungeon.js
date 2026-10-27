/* ------------------------------------------------------------------------
 * RogueDungeon: the dungeon generator shared by Crawlspace (the showcase
 * game) and the Roguelike Builder lesson.
 *
 * Pure on purpose: a seed and a set of rules go in, a level comes out, and
 * nothing here touches the page or Math.random. That is the whole promise of
 * a seed: the same seed with the same rules builds the same dungeon, whether
 * the lesson draws it in characters or Crawlspace builds it out of stone.
 *
 *   RogueDungeon.generate(rules, seed, depth)  -> a level
 *   RogueDungeon.CRAWLSPACE                     -> the rules Crawlspace plays by
 *
 * Tiles are Rogue's: " " rock, "." floor, "#" tunnel, ">" the stairs down.
 * Loads as a plain <script> (window.RogueDungeon), through require(), or
 * through a bundler's import. RogueDungeon.factory.toString() is the whole
 * module, which is how the lesson writes it into a downloaded game file.
 * ---------------------------------------------------------------------- */
(function (root, factory) {
  var api = factory();
  api.factory = factory;
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RogueDungeon = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createRogueDungeon() {
  'use strict';

  // Rogue's layout as Crawlspace builds it: a 68 x 21 map cut into a 3 x 3
  // grid, one room per cell, each cell joined to its neighbours by a tunnel.
  var CRAWLSPACE = {
    dungeon: { generator: 'grid', cols: 68, rows: 21, grid: [3, 3] },
    monsters: {
      count: [4, 7],
      types: [
        { ch: 'r', name: 'rat', hp: 3, atk: 1, xp: 2, minDepth: 1 },
        { ch: 's', name: 'snake', hp: 4, atk: 2, xp: 3, minDepth: 1 },
        { ch: 'g', name: 'goblin', hp: 6, atk: 2, xp: 4, minDepth: 2 },
        { ch: 'o', name: 'orc', hp: 10, atk: 3, xp: 7, minDepth: 3 },
        { ch: 'T', name: 'troll', hp: 16, atk: 5, xp: 15, minDepth: 5 }
      ]
    },
    items: { count: [4, 6], goldChance: 0.6, gold: [5, 20] }
  };

  var GENERATORS = ['grid', 'bsp', 'caves'];
  var STAIRS = ['last', 'farthest', 'random'];
  var STEPS8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

  /* --- Seeds ------------------------------------------------------------ */

  // mulberry32: a tiny pseudorandom generator. Same seed, same numbers.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A seed can be a number or any word. Words are hashed (FNV-1a) to a number,
  // so "lantern" is always the same dungeon.
  function toSeed(value) {
    var s = String(value == null ? '' : value).trim();
    if (/^\d{1,9}$/.test(s)) return Number(s) >>> 0;
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // Every level gets its own seed, mixed from the run's seed and the depth.
  // A fight on depth 1 uses up random numbers, and without this it would
  // change what depth 2 looks like.
  function levelSeed(seed, depth) {
    var h = (toSeed(seed) ^ Math.imul(depth | 0, 0x9e3779b1)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }

  /* --- Rules ------------------------------------------------------------ */

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function isInt(v) { return typeof v === 'number' && Math.floor(v) === v && isFinite(v); }
  function pair(v) { return Array.isArray(v) && v.length === 2 && isInt(v[0]) && isInt(v[1]) && v[0] <= v[1]; }

  // Fill in defaults. Returns { rules, problems }; problems are sentences a
  // student can act on, and a level is only built when there are none.
  function normalize(input) {
    var p = [];
    var src = isObj(input) ? input : {};
    var d = isObj(src.dungeon) ? src.dungeon : {};
    var m = isObj(src.monsters) ? src.monsters : {};
    var it = isObj(src.items) ? src.items : {};
    var gen = d.generator == null ? 'grid' : d.generator;
    if (GENERATORS.indexOf(gen) < 0) p.push('dungeon.generator must be "grid", "bsp" or "caves".');
    var rules = {
      dungeon: {
        generator: gen,
        cols: d.cols == null ? 68 : d.cols,
        rows: d.rows == null ? 21 : d.rows,
        grid: d.grid == null ? [3, 3] : d.grid,
        leaf: d.leaf == null ? [14, 7] : d.leaf,
        fill: d.fill == null ? 0.45 : d.fill,
        smooth: d.smooth == null ? 4 : d.smooth,
        keepLargest: d.keepLargest == null ? true : d.keepLargest,
        stairs: d.stairs == null ? (gen === 'grid' ? 'last' : 'farthest') : d.stairs
      },
      monsters: {
        count: m.count == null ? [4, 7] : m.count,
        types: m.types == null ? CRAWLSPACE.monsters.types : m.types
      },
      items: {
        count: it.count == null ? [4, 6] : it.count,
        goldChance: it.goldChance == null ? 0.6 : it.goldChance,
        gold: it.gold == null ? [5, 20] : it.gold
      }
    };
    var R = rules.dungeon;
    if (!isInt(R.cols) || R.cols < 30 || R.cols > 120) p.push('dungeon.cols must be a whole number from 30 to 120.');
    if (!isInt(R.rows) || R.rows < 15 || R.rows > 50) p.push('dungeon.rows must be a whole number from 15 to 50.');
    if (STAIRS.indexOf(R.stairs) < 0) p.push('dungeon.stairs must be "last", "farthest" or "random".');
    if (gen === 'grid') {
      if (!Array.isArray(R.grid) || R.grid.length !== 2 || !isInt(R.grid[0]) || !isInt(R.grid[1]) || R.grid[0] < 1 || R.grid[1] < 1 || R.grid[0] * R.grid[1] < 2) {
        p.push('dungeon.grid must be [columns, rows] of rooms, like [3, 3], with at least two rooms.');
      } else if (isInt(R.cols) && isInt(R.rows) && (Math.floor(R.cols / R.grid[0]) < 8 || Math.floor(R.rows / R.grid[1]) < 6)) {
        p.push('dungeon.grid has too many rooms for the map: each cell needs at least 8 columns and 6 rows.');
      }
    }
    if (gen === 'bsp' && (!Array.isArray(R.leaf) || R.leaf.length !== 2 || !isInt(R.leaf[0]) || !isInt(R.leaf[1]) || R.leaf[0] < 8 || R.leaf[1] < 6)) {
      p.push('dungeon.leaf must be [width, height] of the smallest piece, at least [8, 6].');
    } else if (gen === 'bsp' && isInt(R.cols) && isInt(R.rows) && R.cols < R.leaf[0] * 2 && R.rows < R.leaf[1] * 2) {
      p.push('dungeon.leaf is too big to cut the map even once. Make it smaller, or the map bigger.');
    }
    if (gen === 'caves') {
      if (typeof R.fill !== 'number' || R.fill < 0.2 || R.fill > 0.7) p.push('dungeon.fill must be a number from 0.2 to 0.7.');
      if (!isInt(R.smooth) || R.smooth < 0 || R.smooth > 10) p.push('dungeon.smooth must be a whole number from 0 to 10.');
    }
    if (typeof R.keepLargest !== 'boolean') p.push('dungeon.keepLargest must be true or false.');
    if (!pair(rules.monsters.count) || rules.monsters.count[0] < 0 || rules.monsters.count[1] > 40) p.push('monsters.count must be [fewest, most], like [4, 7], at most 40.');
    if (!Array.isArray(rules.monsters.types) || !rules.monsters.types.length) {
      p.push('monsters.types must list at least one monster.');
    } else {
      rules.monsters.types.forEach(function (t, i) {
        var where = 'monsters.types[' + i + ']';
        if (!isObj(t)) { p.push(where + ' must be an object.'); return; }
        if (typeof t.ch !== 'string' || t.ch.length !== 1) p.push(where + '.ch must be one character, like "r".');
        if (typeof t.name !== 'string' || !t.name) p.push(where + '.name is missing.');
        if (!isInt(t.hp) || t.hp < 1) p.push(where + '.hp must be a whole number of at least 1.');
        if (!isInt(t.atk) || t.atk < 1) p.push(where + '.atk must be a whole number of at least 1.');
        if (!isInt(t.minDepth) || t.minDepth < 1) p.push(where + '.minDepth must be a whole number of at least 1.');
        if (t.xp != null && (!isInt(t.xp) || t.xp < 0)) p.push(where + '.xp must be a whole number.');
      });
    }
    if (!pair(rules.items.count) || rules.items.count[0] < 0 || rules.items.count[1] > 40) p.push('items.count must be [fewest, most], like [4, 6], at most 40.');
    if (typeof rules.items.goldChance !== 'number' || rules.items.goldChance < 0 || rules.items.goldChance > 1) p.push('items.goldChance must be a number from 0 to 1.');
    if (!pair(rules.items.gold) || rules.items.gold[0] < 0) p.push('items.gold must be [least, most], like [5, 20].');
    return { rules: rules, problems: p };
  }

  // The parts of a rule set that decide what a level looks like. Two rule sets
  // with the same key build the same dungeon from the same seed.
  function rulesKey(input) {
    var r = normalize(input).rules;
    return JSON.stringify([r.dungeon, r.monsters.count, r.monsters.types.map(function (t) {
      return [t.ch, t.name, t.hp, t.atk, t.xp == null ? null : t.xp, t.minDepth];
    }), r.items]);
  }

  /* --- Grids ------------------------------------------------------------ */

  function walkable(ch) { return ch === '.' || ch === '#' || ch === '>'; }

  function blank(cols, rows, fill) {
    var g = [];
    for (var y = 0; y < rows; y++) g.push(new Array(cols).fill(fill));
    return g;
  }

  // Breadth-first search from one cell over every walkable cell, eight ways,
  // the way the player moves. dist[y][x] is the number of steps, or -1.
  function distanceMap(tiles, from) {
    var rows = tiles.length, cols = tiles[0].length;
    var dist = blank(cols, rows, -1);
    if (!from || !walkable(tiles[from.y] && tiles[from.y][from.x])) return dist;
    var qx = [from.x], qy = [from.y], head = 0;
    dist[from.y][from.x] = 0;
    while (head < qx.length) {
      var x = qx[head], y = qy[head++];
      for (var i = 0; i < 8; i++) {
        var nx = x + STEPS8[i][0], ny = y + STEPS8[i][1];
        if (ny < 0 || ny >= rows || nx < 0 || nx >= cols || dist[ny][nx] >= 0 || !walkable(tiles[ny][nx])) continue;
        dist[ny][nx] = dist[y][x] + 1;
        qx.push(nx); qy.push(ny);
      }
    }
    return dist;
  }

  function center(room) {
    return { x: Math.floor(room.x + room.w / 2), y: Math.floor(room.y + room.h / 2) };
  }

  function carveRoom(tiles, room) {
    for (var y = room.y; y < room.y + room.h; y++) {
      for (var x = room.x; x < room.x + room.w; x++) tiles[y][x] = '.';
    }
  }

  // Sideways first, then up or down. Rock becomes tunnel; floor stays floor.
  function carveCorridor(tiles, x1, y1, x2, y2) {
    var x = x1, y = y1;
    while (x !== x2) {
      if (tiles[y][x] === ' ') tiles[y][x] = '#';
      x += x2 > x ? 1 : -1;
    }
    while (y !== y2) {
      if (tiles[y][x] === ' ') tiles[y][x] = '#';
      y += y2 > y ? 1 : -1;
    }
    if (tiles[y][x] === ' ') tiles[y][x] = '#';
  }

  /* --- Generators ------------------------------------------------------- */

  // Rogue (1980): one room per cell of a grid, neighbours joined by tunnels.
  function buildGrid(R, rnd, tiles) {
    var rooms = [];
    var gridCols = R.grid[0], gridRows = R.grid[1];
    var cellW = Math.floor(R.cols / gridCols);
    var cellH = Math.floor(R.rows / gridRows);
    for (var gr = 0; gr < gridRows; gr++) {
      for (var gc = 0; gc < gridCols; gc++) {
        var cellX = gc * cellW + 1;
        var cellY = gr * cellH + 1;
        var w = rnd(4, Math.max(4, cellW - 4));
        var h = rnd(3, Math.max(3, cellH - 4));
        var x = rnd(cellX, Math.max(cellX, cellX + (cellW - w) - 2));
        var y = rnd(cellY, Math.max(cellY, cellY + (cellH - h) - 2));
        var room = { x: x, y: y, w: w, h: h, gr: gr, gc: gc };
        rooms.push(room);
        carveRoom(tiles, room);
      }
    }
    var at = function (r, c) { return rooms[r * gridCols + c]; };
    for (gr = 0; gr < gridRows; gr++) {
      for (gc = 0; gc < gridCols; gc++) {
        var a = center(at(gr, gc)), b;
        if (gc < gridCols - 1) {
          b = center(at(gr, gc + 1));
          carveCorridor(tiles, a.x, a.y, b.x, b.y);
        }
        if (gr < gridRows - 1) {
          b = center(at(gr + 1, gc));
          carveCorridor(tiles, a.x, a.y, b.x, b.y);
        }
      }
    }
    return rooms;
  }

  // Binary space partitioning: cut the map in two, cut each half in two, and
  // keep going until the pieces are small. One room per piece, then join the
  // two halves of every cut, so the tunnels follow the tree back up.
  function buildBsp(R, rnd, tiles) {
    var minW = R.leaf[0], minH = R.leaf[1];
    var rooms = [];
    function split(n) {
      var canV = n.w >= minW * 2, canH = n.h >= minH * 2;
      if (!canV && !canH) {
        var w = rnd(4, Math.max(4, n.w - 3));
        var h = rnd(3, Math.max(3, n.h - 3));
        n.room = {
          x: rnd(n.x + 1, Math.max(n.x + 1, n.x + n.w - 1 - w)),
          y: rnd(n.y + 1, Math.max(n.y + 1, n.y + n.h - 1 - h)),
          w: w, h: h
        };
        rooms.push(n.room);
        carveRoom(tiles, n.room);
        return n;
      }
      // Cut across the longer side (measured in pieces), with a coin flip to break ties.
      var vertical = canV && canH ? n.w / minW + rnd(0, 1) * 0.5 > n.h / minH : canV;
      var cut;
      if (vertical) {
        cut = rnd(minW, n.w - minW);
        n.kids = [split({ x: n.x, y: n.y, w: cut, h: n.h }), split({ x: n.x + cut, y: n.y, w: n.w - cut, h: n.h })];
      } else {
        cut = rnd(minH, n.h - minH);
        n.kids = [split({ x: n.x, y: n.y, w: n.w, h: cut }), split({ x: n.x, y: n.y + cut, w: n.w, h: n.h - cut })];
      }
      return n;
    }
    function anyRoom(n) { return n.room || anyRoom(n.kids[rnd(0, 1)]); }
    function join(n) {
      if (!n.kids) return;
      join(n.kids[0]);
      join(n.kids[1]);
      var a = center(anyRoom(n.kids[0])), b = center(anyRoom(n.kids[1]));
      if (rnd(0, 1)) carveCorridor(tiles, a.x, a.y, b.x, b.y);
      else carveCorridor(tiles, b.x, b.y, a.x, a.y);
    }
    var tree = split({ x: 0, y: 0, w: R.cols, h: R.rows });
    join(tree);
    return rooms;
  }

  // Cellular automata: scatter rock at random, then let every cell copy its
  // neighbours a few times. Lonely rock crumbles, crowded floor fills in, and
  // the noise settles into smooth caves.
  function buildCaves(R, random, tiles) {
    // One flat list of cells, row after row: cell (x, y) is number y * cols + x.
    var cols = R.cols, rows = R.rows, n = cols * rows;
    var rock = new Uint8Array(n).fill(1), next = new Uint8Array(n).fill(1);
    var x, y, i;
    for (y = 1; y < rows - 1; y++) {
      for (x = 1; x < cols - 1; x++) rock[y * cols + x] = random() < R.fill ? 1 : 0;
    }
    for (var step = 0; step < R.smooth; step++) {
      for (y = 1; y < rows - 1; y++) {
        for (x = 1; x < cols - 1; x++) {
          i = y * cols + x;
          var count = rock[i - cols - 1] + rock[i - cols] + rock[i - cols + 1] +
            rock[i - 1] + rock[i] + rock[i + 1] +
            rock[i + cols - 1] + rock[i + cols] + rock[i + cols + 1];
          next[i] = count >= 5 ? 1 : 0;
        }
      }
      var swap = rock; rock = next; next = swap;
    }
    for (y = 0; y < rows; y++) {
      for (x = 0; x < cols; x++) tiles[y][x] = rock[y * cols + x] ? ' ' : '.';
    }
    // Flood fill every cave. Unless told otherwise, keep only the biggest one
    // and turn the rest back into rock, so every floor cell can be reached.
    var done = new Uint8Array(n), caves = [];
    var around = [-cols - 1, -cols, -cols + 1, -1, 1, cols - 1, cols, cols + 1];
    for (var first = 0; first < n; first++) {
      if (rock[first] || done[first]) continue;
      var queue = [first];
      done[first] = 1;
      for (var head = 0; head < queue.length; head++) {
        for (var k = 0; k < 8; k++) {
          var j = queue[head] + around[k];               // the border is rock, so never off the map
          if (rock[j] || done[j]) continue;
          done[j] = 1;
          queue.push(j);
        }
      }
      caves.push(queue.map(function (c) { return { x: c % cols, y: Math.floor(c / cols) }; }));
    }
    caves.sort(function (a, b) { return b.length - a.length || a[0].y - b[0].y || a[0].x - b[0].x; });
    if (!caves.length || caves[0].length < 40) throw new Error('The caves came out almost solid rock. Lower dungeon.fill or dungeon.smooth.');
    if (R.keepLargest) {
      for (var c = 1; c < caves.length; c++) caves[c].forEach(function (cell) { tiles[cell.y][cell.x] = ' '; });
      caves.length = 1;
    }
    return caves;
  }

  /* --- A level ---------------------------------------------------------- */

  function generate(input, seed, depth) {
    var checked = normalize(input);
    if (checked.problems.length) throw new Error(checked.problems[0]);
    var rules = checked.rules, R = rules.dungeon;
    depth = Math.max(1, depth | 0);
    var lseed = levelSeed(seed, depth);
    var random = mulberry32(lseed);
    var rnd = function (min, max) { return Math.floor(random() * (max - min + 1)) + min; };
    var tiles = blank(R.cols, R.rows, ' ');
    var rooms = [], caves = null, start, stairs, dist;

    if (R.generator === 'caves') {
      caves = buildCaves(R, random, tiles);
      var main = caves[0];
      start = main[rnd(0, main.length - 1)];
      if (R.stairs === 'random') {
        var all = [].concat.apply([], caves);
        do { stairs = all[rnd(0, all.length - 1)]; } while (stairs.x === start.x && stairs.y === start.y);
      } else {
        stairs = farthestCell(tiles, start);
      }
    } else {
      rooms = R.generator === 'bsp' ? buildBsp(R, rnd, tiles) : buildGrid(R, rnd, tiles);
      var startIndex = R.generator === 'grid' ? 0 : rnd(0, rooms.length - 1);
      start = center(rooms[startIndex]);
      var stairRoom;
      if (R.stairs === 'last') stairRoom = rooms.length - 1 === startIndex ? 0 : rooms.length - 1;
      else if (R.stairs === 'random') stairRoom = otherRoom(rnd, rooms.length, startIndex);
      else {
        dist = distanceMap(tiles, start);
        stairRoom = -1;
        rooms.forEach(function (room, i) {
          var c = center(room);
          if (i === startIndex) return;
          if (stairRoom < 0 || dist[c.y][c.x] > dist[center(rooms[stairRoom]).y][center(rooms[stairRoom]).x]) stairRoom = i;
        });
      }
      stairs = center(rooms[stairRoom]);
      start.room = startIndex;
    }
    tiles[stairs.y][stairs.x] = '>';

    var taken = {};
    var key = function (x, y) { return x + ',' + y; };
    taken[key(start.x, start.y)] = true;
    function spotInRoom(room) {
      for (var tries = 0; tries < 20; tries++) {
        var x = rnd(room.x, room.x + room.w - 1);
        var y = rnd(room.y, room.y + room.h - 1);
        if (tiles[y][x] === '.' && !taken[key(x, y)]) { taken[key(x, y)] = true; return { x: x, y: y }; }
      }
      return null;
    }
    // In a cave there are no rooms, so monsters wait at least six steps from
    // the start, where the first room would have kept them away.
    if (caves && !dist) dist = distanceMap(tiles, start);
    function spotInCave(minSteps) {
      var pool = caves[rnd(0, caves.length - 1)];
      for (var tries = 0; tries < 40; tries++) {
        var c = pool[rnd(0, pool.length - 1)];
        var far = dist[c.y][c.x] < 0 || dist[c.y][c.x] >= minSteps;
        if (tiles[c.y][c.x] === '.' && far && !taken[key(c.x, c.y)]) { taken[key(c.x, c.y)] = true; return { x: c.x, y: c.y }; }
      }
      return null;
    }

    var monsters = [];
    var monsterCount = rnd(rules.monsters.count[0], rules.monsters.count[1]);
    var available = rules.monsters.types.filter(function (t) { return t.minDepth <= depth; });
    for (var i = 0; i < monsterCount && available.length; i++) {
      var pos = caves ? spotInCave(6) : spotInRoom(rooms[otherRoom(rnd, rooms.length, start.room)]);
      if (!pos) continue;
      var type = available[rnd(0, available.length - 1)];
      var mon = {};
      for (var k in type) mon[k] = type[k];
      mon.x = pos.x; mon.y = pos.y; mon.hp = type.hp; mon.maxHp = type.hp;
      monsters.push(mon);
    }

    var items = [];
    var itemCount = rnd(rules.items.count[0], rules.items.count[1]);
    for (i = 0; i < itemCount; i++) {
      var spot = caves ? spotInCave(0) : spotInRoom(rooms[rnd(0, rooms.length - 1)]);
      if (!spot) continue;
      var isGold = random() < rules.items.goldChance;
      items.push(isGold
        ? { ch: '$', kind: 'gold', amount: rnd(rules.items.gold[0], rules.items.gold[1]) * depth, x: spot.x, y: spot.y }
        : { ch: '!', kind: 'potion', x: spot.x, y: spot.y });
    }

    delete start.room;
    return {
      seed: lseed, depth: depth, cols: R.cols, rows: R.rows, generator: R.generator,
      tiles: tiles, rooms: rooms, start: { x: start.x, y: start.y }, stairs: { x: stairs.x, y: stairs.y },
      monsters: monsters, items: items
    };
  }

  // A random room index that is not `skip`. With skip = 0 this is exactly
  // Rogue's rooms[rnd(1, n - 1)].
  function otherRoom(rnd, n, skip) {
    if (n < 2) return 0;
    var i = rnd(1, n - 1);
    return i <= skip ? i - 1 : i;
  }

  function farthestCell(tiles, from) {
    var dist = distanceMap(tiles, from), best = from, far = 0;
    for (var y = 0; y < dist.length; y++) {
      for (var x = 0; x < dist[y].length; x++) {
        if (dist[y][x] > far) { far = dist[y][x]; best = { x: x, y: y }; }
      }
    }
    return best;
  }

  // What a checker wants to know about one level.
  function inspect(level) {
    var dist = distanceMap(level.tiles, level.start);
    var open = 0, reached = 0;
    for (var y = 0; y < level.rows; y++) {
      for (var x = 0; x < level.cols; x++) {
        if (!walkable(level.tiles[y][x])) continue;
        open++;
        if (dist[y][x] >= 0) reached++;
      }
    }
    var lost = level.monsters.concat(level.items).filter(function (t) { return dist[t.y][t.x] < 0; }).length;
    return {
      open: open,
      reached: reached,
      stairs: dist[level.stairs.y][level.stairs.x],
      lostThings: lost,
      rooms: level.rooms.length
    };
  }

  return {
    CRAWLSPACE: CRAWLSPACE,
    mulberry32: mulberry32,
    toSeed: toSeed,
    levelSeed: levelSeed,
    normalize: normalize,
    rulesKey: rulesKey,
    generate: generate,
    distanceMap: distanceMap,
    inspect: inspect,
    walkable: walkable
  };
});
