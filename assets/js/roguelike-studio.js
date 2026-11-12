/* ═════════════════════════════════════════════════════════════════════════════
   Roguelike Dungeon Studio · Procedural Engine & Workstation
   ClassroomOS · Computer Science: Graphics & Game Development
   ═════════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* ── Presets Catalog ─────────────────────────────────────────────────── */
  var D = root.RogueDungeon;
  var CS = D ? D.CRAWLSPACE : {
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

  var PRESETS = {
    crawlspace: {
      label: '🕯️ Crawlspace (Classic 3×3 Grid)',
      config: {
        title: 'Crawlspace',
        seed: 'lantern',
        intro: 'You climb down into the crawlspace. The lantern is all you brought.',
        dungeon: { generator: 'grid', cols: 68, rows: 21, grid: [3, 3] },
        sight: 'room',
        player: { hp: 20, atk: 3, potions: 1, perLevel: { hp: 3, heal: 5, atk: 1 } },
        monsters: { count: [4, 7], wakeRange: 9, types: CS.monsters.types },
        items: { count: [4, 6], goldChance: 0.6, gold: [5, 20], heal: [6, 12] },
        goal: { depth: 0 },
        words: { gold: 'gold', elixir: 'elixir', stairs: 'steps', rock: 'cold stone' }
      }
    },
    library: {
      label: '📚 Sunken Library (BSP Rooms)',
      config: {
        title: 'The Sunken Library',
        seed: 'index',
        intro: 'The library is sinking into the lake, and the lost index is somewhere on floor 5. Mind the bookworms.',
        dungeon: { generator: 'bsp', cols: 64, rows: 24, leaf: [14, 7] },
        sight: 'room',
        player: { hp: 18, atk: 3, potions: 2, perLevel: { hp: 3, heal: 6, atk: 1 } },
        monsters: { count: [4, 6], wakeRange: 8, types: [
          { ch: 'w', name: 'bookworm', hp: 3, atk: 1, xp: 2, minDepth: 1 },
          { ch: 'b', name: 'paper bat', hp: 4, atk: 2, xp: 3, minDepth: 1 },
          { ch: 'i', name: 'ink blot', hp: 7, atk: 2, xp: 5, minDepth: 2 },
          { ch: 'G', name: 'dust golem', hp: 14, atk: 4, xp: 12, minDepth: 3 }
        ] },
        items: { count: [4, 6], goldChance: 0.6, gold: [3, 12], heal: [6, 12] },
        goal: { depth: 5, text: 'You reach the drowned archive and lift out the lost index. The library is saved!' },
        words: { gold: 'pages', elixir: 'tea', stairs: 'spiral stairs', rock: 'a wet bookshelf' },
        glyphs: { gold: '?', elixir: '!', stairs: '>' }
      }
    },
    caves: {
      label: '💎 Crystal Caves (Cellular Automata)',
      config: {
        title: 'Crystal Caves',
        seed: 'geode',
        intro: 'Your lamp lights seven squares. Somewhere below, the caves open into daylight.',
        dungeon: { generator: 'caves', cols: 70, rows: 24, fill: 0.45, smooth: 4 },
        sight: 7,
        player: { hp: 22, atk: 3, potions: 1, perLevel: { hp: 3, heal: 5, atk: 1 } },
        monsters: { count: [5, 8], wakeRange: 7, types: [
          { ch: 'b', name: 'cave bat', hp: 3, atk: 1, xp: 2, minDepth: 1 },
          { ch: 'j', name: 'slime', hp: 6, atk: 1, xp: 3, minDepth: 1 },
          { ch: 'c', name: 'crystal crab', hp: 8, atk: 3, xp: 6, minDepth: 2 },
          { ch: 'T', name: 'cave troll', hp: 18, atk: 5, xp: 15, minDepth: 4 }
        ] },
        items: { count: [5, 8], goldChance: 0.65, gold: [5, 15], heal: [6, 12] },
        goal: { depth: 6, text: 'You climb out into daylight with a sack of crystals.' },
        words: { gold: 'crystals', elixir: 'glow water', stairs: 'crack in the floor', rock: 'damp rock' },
        glyphs: { gold: '*' }
      }
    },
    bugs: {
      label: '👾 Bug Hunt (Inside a Computer)',
      config: {
        title: 'Bug Hunt',
        seed: 'reboot',
        intro: 'You are an antivirus program, dropped into a computer full of bugs. Reach the kernel on level 4.',
        dungeon: { generator: 'grid', cols: 72, rows: 21, grid: [4, 3] },
        sight: 'room',
        player: { hp: 20, atk: 3, potions: 1, perLevel: { hp: 4, heal: 6, atk: 1 } },
        monsters: { count: [5, 8], wakeRange: 9, types: [
          { ch: 'b', name: 'bug', hp: 2, atk: 1, xp: 1, minDepth: 1 },
          { ch: 'g', name: 'glitch', hp: 5, atk: 2, xp: 3, minDepth: 1 },
          { ch: 'v', name: 'virus', hp: 7, atk: 2, xp: 5, minDepth: 2 },
          { ch: 'W', name: 'worm', hp: 12, atk: 4, xp: 10, minDepth: 3 }
        ] },
        items: { count: [4, 6], goldChance: 0.6, gold: [5, 20], heal: [6, 12] },
        goal: { depth: 4, text: 'You reach the kernel, the computer reboots, and every bug is gone. Mission complete!' },
        words: { gold: 'data', elixir: 'patch', stairs: 'down port', rock: 'a firewall' },
        glyphs: { stairs: '%', tunnel: ':' }
      }
    }
  };

  /* ── Procedural Web Audio Engine ─────────────────────────────────────── */
  var Sound = (function () {
    var ctx = null;
    var muted = false;

    function getCtx() {
      if (typeof window === 'undefined') return null;
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!ctx) ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        var resume = function () {
          if (ctx) ctx.resume();
          window.removeEventListener('click', resume);
          window.removeEventListener('keydown', resume);
        };
        window.addEventListener('click', resume);
        window.addEventListener('keydown', resume);
      }
      return ctx;
    }

    function playTone(freq, dur, type, gainVol, delay) {
      if (muted) return;
      var c = getCtx();
      if (!c) return;
      var startTime = c.currentTime + (delay || 0);
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(gainVol || 0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(startTime);
      osc.stop(startTime + dur);
    }

    return {
      get muted() { return muted; },
      set muted(val) { muted = !!val; },
      toggle: function () { muted = !muted; return muted; },
      step: function () {
        playTone(180 + Math.random() * 40, 0.05, 'triangle', 0.04);
      },
      hit: function () {
        playTone(220, 0.08, 'sawtooth', 0.12, 0);
        playTone(110, 0.12, 'square', 0.08, 0.04);
      },
      kill: function () {
        playTone(330, 0.08, 'triangle', 0.14, 0);
        playTone(440, 0.15, 'sine', 0.16, 0.06);
      },
      gold: function () {
        playTone(1318, 0.08, 'sine', 0.12, 0);
        playTone(1760, 0.18, 'triangle', 0.15, 0.06);
      },
      potion: function () {
        [440, 554, 659, 880].forEach(function (f, i) {
          playTone(f, 0.12, 'sine', 0.1, i * 0.05);
        });
      },
      stairs: function () {
        playTone(440, 0.25, 'triangle', 0.12, 0);
        playTone(330, 0.35, 'sine', 0.15, 0.12);
        playTone(220, 0.45, 'sine', 0.15, 0.24);
      },
      hurt: function () {
        playTone(130, 0.16, 'sawtooth', 0.15, 0);
        playTone(90, 0.2, 'sawtooth', 0.15, 0.06);
      },
      die: function () {
        [220, 207, 196, 185, 174].forEach(function (f, i) {
          playTone(f, 0.3, 'sawtooth', 0.12, i * 0.1);
        });
      },
      win: function () {
        [523, 659, 784, 1046, 1318].forEach(function (f, i) {
          playTone(f, 0.28, 'triangle', 0.16, i * 0.08);
        });
      }
    };
  })();

  /* ── Roguelike Studio Application Constructor ────────────────────────── */
  function RoguelikeStudioEngine(rootEl, initialConfig) {
    if (rootEl._rogueStudio) rootEl._rogueStudio.destroy();

    var D = root.RogueDungeon;
    var C = JSON.parse(JSON.stringify(initialConfig || PRESETS.crawlspace.config));
    var S = null;              // Runtime Game State
    var destroyed = false;
    var curMode = 'stage';     // 'stage' | 'radar' | 'config' | 'bestiary'
    var viewStyle = 'canvas';  // 'canvas' | 'ascii'
    var showHeatmap = false;
    var lastRafTime = 0;
    var rafId = null;
    var canvasHelper = null;

    // Visual effect particles & animations
    var floatingTexts = [];
    var attackFlashes = [];
    var torchFlicker = 0;
    var hoverCell = null;

    // DOM references
    var el = {};

    /* ── Initialize Gameplay Session ─────────────────────────────────── */
    function initGame(seedOverride) {
      var seed = (seedOverride != null && String(seedOverride).trim())
        ? String(seedOverride).trim()
        : (C.seed != null && String(C.seed).trim() ? String(C.seed).trim() : 'lantern');

      var checked = D.normalize(C);
      var rules = checked.rules;
      var P = C.player || {};
      var G = P.perLevel || {};
      var I = C.items || {};

      S = {
        title: C.title || 'My Roguelike',
        seed: seed,
        depth: 1,
        turn: 0,
        kills: 0,
        over: false,
        won: false,
        killedBy: null,
        log: [],
        rules: rules,
        words: Object.assign({ gold: 'gold', elixir: 'elixir', stairs: 'stairs', rock: 'cold stone' }, C.words || {}),
        glyphs: Object.assign({ floor: '.', tunnel: '#', stairs: '>', wall: '▒', player: '@', gold: '$', elixir: '!' }, C.glyphs || {}),
        startStats: {
          hp: P.hp || 20,
          atk: P.atk || 3,
          potions: P.potions != null ? P.potions : 1
        },
        grow: {
          hp: G.hp || 3,
          heal: G.heal || 5,
          atk: G.atk || 1
        },
        healRange: I.heal || [6, 12],
        goalDepth: (C.goal && C.goal.depth) || 0,
        winText: (C.goal && C.goal.text) || 'You win!'
      };

      S.dice = D.mulberry32(D.toSeed(seed) ^ 0x5eed);
      S.player = {
        hp: S.startStats.hp,
        maxHp: S.startStats.hp,
        atk: S.startStats.atk,
        gold: 0,
        potions: S.startStats.potions,
        x: 0,
        y: 0
      };

      enterLevel();
      logMessage(C.intro || ('Find the ' + S.words.stairs + '. Walk into a monster to fight it.'), 'info');
      floatingTexts = [];
      attackFlashes = [];
    }

    function roll(min, max) {
      return Math.floor(S.dice() * (max - min + 1)) + min;
    }

    function grid(val) {
      var g = [];
      for (var y = 0; y < S.tiles.length; y++) g.push(new Array(S.tiles[0].length).fill(val));
      return g;
    }

    function logMessage(text, cls) {
      S.log.unshift({ turn: S.turn, depth: S.depth, text: text, cls: cls || 'info' });
      if (S.log.length > 50) S.log.pop();
    }

    function enterLevel() {
      var L = D.generate(S.rules, S.seed, S.depth);
      S.level = L;
      S.tiles = L.tiles;
      S.monsters = L.monsters;
      S.items = L.items;
      S.player.x = L.start.x;
      S.player.y = L.start.y;
      S.seen = grid(false);
      S.edge = grid(false);

      // Edge detection for walls
      for (var y = 0; y < L.rows; y++) {
        for (var x = 0; x < L.cols; x++) {
          if (S.tiles[y][x] !== ' ') continue;
          for (var dy = -1; dy <= 1 && !S.edge[y][x]; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
              var r = S.tiles[y + dy];
              if (r && (r[x + dx] === '.' || r[x + dx] === '>')) {
                S.edge[y][x] = true;
                break;
              }
            }
          }
        }
      }

      // Compute distance map from player start
      S.distMap = D.inspect(L).dist;
      updateVisibility();
    }

    function inside(x, y) {
      return y >= 0 && y < S.tiles.length && x >= 0 && x < S.tiles[0].length;
    }

    function isWalkable(x, y) {
      return inside(x, y) && D.walkable(S.tiles[y][x]);
    }

    function monsterAt(x, y) {
      for (var i = 0; i < S.monsters.length; i++) {
        if (S.monsters[i].x === x && S.monsters[i].y === y && S.monsters[i].hp > 0) return S.monsters[i];
      }
      return null;
    }

    function itemAt(x, y) {
      for (var i = 0; i < S.items.length; i++) {
        if (S.items[i].x === x && S.items[i].y === y) return S.items[i];
      }
      return null;
    }

    function roomAt(x, y) {
      var rooms = S.level.rooms || [];
      for (var i = 0; i < rooms.length; i++) {
        var r = rooms[i];
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
      }
      return null;
    }

    function updateVisibility() {
      var vis = grid(false);
      var p = S.player;
      var sight = C.sight == null ? 'room' : C.sight;

      function mark(x, y) {
        if (inside(x, y)) {
          vis[y][x] = true;
          S.seen[y][x] = true;
        }
      }

      var x, y;
      if (sight === 'room') {
        var rm = roomAt(p.x, p.y);
        if (rm) {
          for (y = rm.y - 1; y <= rm.y + rm.h; y++) {
            for (x = rm.x - 1; x <= rm.x + rm.w; x++) mark(x, y);
          }
        } else {
          for (y = p.y - 1; y <= p.y + 1; y++) {
            for (x = p.x - 1; x <= p.x + 1; x++) mark(x, y);
          }
        }
      } else {
        var r = Math.max(2, Number(sight) || 7);
        for (y = p.y - r; y <= p.y + r; y++) {
          for (x = p.x - r; x <= p.x + r; x++) {
            if ((x - p.x) * (x - p.x) + (y - p.y) * (y - p.y) <= r * r) mark(x, y);
          }
        }
      }
      S.visible = vis;
    }

    /* ── Turn Execution & Combat ──────────────────────────────────────── */
    function step(dx, dy) {
      if (S.over) return false;
      var p = S.player;
      var nx = p.x + dx;
      var ny = p.y + dy;

      var m = monsterAt(nx, ny);
      if (m) {
        // Bump to attack
        var hit = roll(1, p.atk);
        m.hp -= hit;
        Sound.hit();
        spawnAttackFlash(nx, ny);
        spawnFloatingText(nx, ny, '-' + hit, '#f87171');
        logMessage('You strike the ' + m.name + ' for ' + hit + ' dmg.', 'hit');

        if (m.hp <= 0) {
          Sound.kill();
          S.kills++;
          S.monsters = S.monsters.filter(function (it) { return it !== m; });
          var xpGold = (m.xp || 1) * 3;
          p.gold += xpGold;
          spawnFloatingText(nx, ny, '+' + xpGold + ' ' + S.words.gold, '#ffd98a');
          logMessage('You defeat the ' + m.name + '! (+' + xpGold + ' ' + S.words.gold + ')', 'kill');
        }
        endTurn();
        return true;
      }

      if (!isWalkable(nx, ny)) {
        logMessage('You bump into ' + S.words.rock + '.', 'info');
        syncUI();
        return false;
      }

      // Move player
      p.x = nx;
      p.y = ny;
      Sound.step();

      var itm = itemAt(nx, ny);
      if (itm) {
        if (itm.kind === 'gold') {
          p.gold += itm.amount;
          Sound.gold();
          spawnFloatingText(nx, ny, '+' + itm.amount + ' ' + S.words.gold, '#ffd98a');
          logMessage('Found ' + itm.amount + ' ' + S.words.gold + '.', 'item');
        } else {
          p.potions++;
          Sound.potion();
          spawnFloatingText(nx, ny, '+1 ' + S.words.elixir, '#6ee7b7');
          logMessage('Pocketed a vial of ' + S.words.elixir + '.', 'item');
        }
        S.items = S.items.filter(function (i) { return i !== itm; });
      } else if (S.tiles[ny][nx] === '>') {
        logMessage('The ' + S.words.stairs + ' lead down. Press > or click Descend.', 'stairs');
      }

      endTurn();
      return true;
    }

    function drinkPotion() {
      if (S.over) return false;
      var p = S.player;
      if (p.potions <= 0) {
        logMessage('You have no ' + S.words.elixir + ' remaining.', 'info');
        syncUI();
        return false;
      }
      p.potions--;
      var healAmt = roll(S.healRange[0], S.healRange[1]);
      var before = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + healAmt);
      var gained = p.hp - before;
      Sound.potion();
      spawnFloatingText(p.x, p.y, '+' + gained + ' HP', '#4ade80');
      logMessage('Drank ' + S.words.elixir + ' and recovered ' + gained + ' HP.', 'item');
      endTurn();
      return true;
    }

    function descendStairs() {
      if (S.over) return false;
      var p = S.player;
      if (S.tiles[p.y][p.x] !== '>') {
        logMessage('There are no ' + S.words.stairs + ' here.', 'info');
        syncUI();
        return false;
      }

      S.depth++;
      Sound.stairs();

      if (S.goalDepth && S.depth >= S.goalDepth) {
        S.over = true;
        S.won = true;
        Sound.win();
        logMessage(S.winText, 'kill');
        syncUI();
        renderDeck();
        return true;
      }

      p.maxHp += S.grow.hp;
      p.hp = Math.min(p.maxHp, p.hp + S.grow.heal);
      p.atk += S.grow.atk;

      enterLevel();
      logMessage('Descended to depth ' + S.depth + '. The air turns colder.', 'stairs');
      syncUI();
      renderDeck();
      return true;
    }

    function waitTurn() {
      if (S.over) return false;
      logMessage('You wait a turn…', 'info');
      endTurn();
      return true;
    }

    function endTurn() {
      S.turn++;
      if (!S.over) monsterTurns();
      updateVisibility();
      syncUI();
      renderDeck();
    }

    function monsterTurns() {
      var p = S.player;
      var wake = (C.monsters && C.monsters.wakeRange) || 9;

      for (var i = 0; i < S.monsters.length && !S.over; i++) {
        var m = S.monsters[i];
        if (m.hp <= 0) continue;
        var dist = Math.abs(m.x - p.x) + Math.abs(m.y - p.y);
        if (dist > wake) continue; // Still sleeping

        if (Math.abs(m.x - p.x) <= 1 && Math.abs(m.y - p.y) <= 1) {
          // Monster attacks player
          var dmg = roll(1, m.atk);
          p.hp -= dmg;
          Sound.hurt();
          spawnFloatingText(p.x, p.y, '-' + dmg, '#ef4444');
          logMessage('The ' + m.name + ' strikes you for ' + dmg + '!', 'hit');

          if (p.hp <= 0) {
            p.hp = 0;
            S.over = true;
            S.killedBy = m.name;
            Sound.die();
            logMessage('You fell on depth ' + S.depth + ' to a ' + m.name + '. Press R to restart.', 'hit');
          }
          continue;
        }

        // Monster moves toward player
        var dx = Math.sign(p.x - m.x);
        var dy = Math.sign(p.y - m.y);
        var options = [
          [m.x + dx, m.y + dy],
          [m.x + dx, m.y],
          [m.x, m.y + dy]
        ];

        for (var k = 0; k < options.length; k++) {
          var o = options[k];
          if (isWalkable(o[0], o[1]) && !monsterAt(o[0], o[1]) && !(o[0] === p.x && o[1] === p.y)) {
            m.x = o[0];
            m.y = o[1];
            break;
          }
        }
      }
    }

    /* ── Floating Text & Combat VFX ───────────────────────────────────── */
    function spawnFloatingText(gridX, gridY, text, color) {
      floatingTexts.push({
        gx: gridX,
        gy: gridY,
        text: text,
        color: color || '#ffd98a',
        life: 1.0,
        offsetY: 0
      });
    }

    function spawnAttackFlash(gridX, gridY) {
      attackFlashes.push({
        gx: gridX,
        gy: gridY,
        life: 0.25
      });
    }

    /* ── DOM Workspace Scaffold ───────────────────────────────────────── */
    function buildDom() {
      rootEl.innerHTML = '';
      var wrap = document.createElement('div');
      wrap.className = 'rg-studio';
      wrap.setAttribute('role', 'region');
      wrap.setAttribute('aria-label', (C.title || 'Roguelike') + ' Engine');
      rootEl.appendChild(wrap);
      el.wrap = wrap;

      // 1. Top Ribbon Toolbar
      var bar = document.createElement('div');
      bar.className = 'rg-bar';
      bar.innerHTML = [
        '<div class="rg-brand">',
        '  <span class="rg-badge">🗡️</span>',
        '  <div class="rg-title-wrap">',
        '    <h3 class="rg-title">' + (C.title || 'Roguelike Builder') + '</h3>',
        '    <span class="rg-subtitle">Procedural Dungeon Engine</span>',
        '  </div>',
        '</div>',
        '<div class="rg-modes" role="tablist" aria-label="Studio Views">',
        '  <button type="button" class="rg-mode-btn" data-mode="stage" aria-pressed="true" role="tab">🎮 Dungeon Stage</button>',
        '  <button type="button" class="rg-mode-btn" data-mode="radar" aria-pressed="false" role="tab">🗺️ Radar &amp; Telemetry</button>',
        '  <button type="button" class="rg-mode-btn" data-mode="config" aria-pressed="false" role="tab">⚙️ Config IDE</button>',
        '  <button type="button" class="rg-mode-btn" data-mode="bestiary" aria-pressed="false" role="tab">📊 Bestiary &amp; Math</button>',
        '</div>',
        '<div class="rg-actions">',
        '  <select class="rg-select" id="rg-preset-select" aria-label="Load preset game"></select>',
        '  <button type="button" class="rg-btn" id="rg-btn-view" title="Toggle visual tile rendering or ASCII monospace">🎨 Tiles</button>',
        '  <button type="button" class="rg-btn" id="rg-btn-heat" title="Toggle BFS flood fill distance map">🗺️ Heatmap</button>',
        '  <button type="button" class="rg-btn" id="rg-btn-seed" title="Scramble a new dungeon seed">🎲 Seed</button>',
        '  <button type="button" class="rg-btn" id="rg-btn-sound" title="Toggle sound effects">' + (Sound.muted ? '🔇 Muted' : '🔊 Sound') + '</button>',
        '  <button type="button" class="rg-btn gold" id="rg-btn-3d" title="Walk this exact seed in 3D Crawlspace">🕯 3D</button>',
        '  <button type="button" class="rg-btn primary" id="rg-btn-export" title="Save standalone playable HTML game">⬇ Save</button>',
        '  <button type="button" class="rg-btn" id="rg-btn-restart" title="Restart run">↺</button>',
        '</div>'
      ].join('');
      wrap.appendChild(bar);
      el.bar = bar;

      // 2. Main Body Grid
      var body = document.createElement('div');
      body.className = 'rg-body';
      wrap.appendChild(body);
      el.body = body;

      // Left: Stage Playfield
      var stage = document.createElement('div');
      stage.className = 'rg-stage';
      stage.innerHTML = [
        '<div class="rg-hud" aria-live="off">',
        '  <div class="rg-hud-metrics">',
        '    <span class="rg-hud-pill hp" id="hud-hp-pill">❤️ HP <strong id="hud-hp">20/20</strong><span class="rg-hp-track"><span class="rg-hp-fill" id="hud-hp-bar"></span></span></span>',
        '    <span class="rg-hud-pill">⚔️ ATK <strong id="hud-atk">3</strong></span>',
        '    <span class="rg-hud-pill">💰 <strong id="hud-gold">0</strong></span>',
        '    <span class="rg-hud-pill">🧪 <strong id="hud-potion">1</strong></span>',
        '    <span class="rg-hud-pill">🪜 Depth <strong id="hud-depth">1</strong></span>',
        '    <span class="rg-hud-pill">⏳ Turn <strong id="hud-turn">0</strong></span>',
        '  </div>',
        '  <span class="rg-hud-seed" id="hud-seed">seed: ' + S.seed + '</span>',
        '</div>',
        '<div class="rg-canvas-wrap">',
        '  <canvas class="rg-canvas" id="rg-viewport" tabindex="0" aria-label="Interactive dungeon canvas. Use arrow keys, Vi keys, or the control dock below."></canvas>',
        '  <pre class="rg-terminal-view" id="rg-terminal"></pre>',
        '  <div class="rg-canvas-overlay">',
        '    <span class="rg-msg-pill" id="hud-msg">' + (C.intro || 'Welcome to the dungeon') + '</span>',
        '    <span class="rg-coord-pill" id="hud-coords">(0, 0)</span>',
        '  </div>',
        '</div>',
        '<div class="rg-dock">',
        '  <div class="rg-dpad" aria-label="Directional controls">',
        '    <button type="button" class="rg-dpad-btn" data-act="nw" title="North-West (Y / Home)">↖</button>',
        '    <button type="button" class="rg-dpad-btn" data-act="n" title="North (Up / K / W)">↑</button>',
        '    <button type="button" class="rg-dpad-btn" data-act="ne" title="North-East (U / PgUp)">↗</button>',
        '    <button type="button" class="rg-dpad-btn" data-act="w" title="West (Left / H / A)">←</button>',
        '    <button type="button" class="rg-dpad-btn" data-act="wait" title="Wait Turn (Space / .)">·</button>',
        '    <button type="button" class="rg-dpad-btn" data-act="e" title="East (Right / L / D)">→</button>',
        '    <button type="button" class="rg-dpad-btn" data-act="sw" title="South-West (B / End)">↙</button>',
        '    <button type="button" class="rg-dpad-btn" data-act="s" title="South (Down / J / S)">↓</button>',
        '    <button type="button" class="rg-dpad-btn" data-act="se" title="South-East (N / PgDn)">↘</button>',
        '  </div>',
        '  <div class="rg-dock-actions">',
        '    <button type="button" class="rg-dock-btn potion" id="btn-dock-potion" title="Drink healing elixir">🧪 Drink (Q)</button>',
        '    <button type="button" class="rg-dock-btn stairs" id="btn-dock-stairs" title="Descend stairs">🪜 Descend (&gt;)</button>',
        '    <button type="button" class="rg-dock-btn" id="btn-dock-wait" title="Pass one turn">⏳ Wait (Space)</button>',
        '  </div>',
        '  <span class="rg-dock-hint">Arrows · Vi · Numpad</span>',
        '</div>'
      ].join('');
      body.appendChild(stage);
      el.stage = stage;

      // Right: Tabbed Engine Deck
      var deck = document.createElement('div');
      deck.className = 'rg-deck';
      deck.innerHTML = '<div class="rg-deck-scroll" id="rg-deck-scroll"></div>';
      body.appendChild(deck);
      el.deck = deck;
      el.deckScroll = deck.querySelector('#rg-deck-scroll');

      // Populate preset dropdown
      var pSel = bar.querySelector('#rg-preset-select');
      Object.keys(PRESETS).forEach(function (k) {
        var opt = document.createElement('option');
        opt.value = k;
        opt.textContent = PRESETS[k].label;
        if (PRESETS[k].config.title === C.title) opt.selected = true;
        pSel.appendChild(opt);
      });

      // Wire Canvas with SimKit
      var canvas = stage.querySelector('#rg-viewport');
      el.canvas = canvas;
      el.terminal = stage.querySelector('#rg-terminal');

      if (root.SimKit && root.SimKit.canvas2d) {
        canvasHelper = root.SimKit.canvas2d(canvas, { dpr: 2 });
      } else {
        canvasHelper = {
          ctx: canvas.getContext('2d'),
          get width() { return canvas.width; },
          get height() { return canvas.height; }
        };
      }

      bindEvents();
      syncUI();
      renderDeck();
      startAnimationLoop();
    }

    /* ── UI Sync & Status ──────────────────────────────────────────────── */
    function syncUI() {
      var p = S.player;
      el.stage.querySelector('#hud-hp').textContent = p.hp + '/' + p.maxHp;
      var hpPct = Math.max(0, Math.min(100, Math.round((p.hp / p.maxHp) * 100)));
      var hpBar = el.stage.querySelector('#hud-hp-bar');
      hpBar.style.width = hpPct + '%';
      hpBar.className = 'rg-hp-fill' + (hpPct < 30 ? ' danger' : hpPct < 60 ? ' warn' : '');

      var hpPill = el.stage.querySelector('#hud-hp-pill');
      hpPill.className = 'rg-hud-pill hp' + (hpPct < 30 ? ' low' : '');

      el.stage.querySelector('#hud-atk').textContent = p.atk;
      el.stage.querySelector('#hud-gold').textContent = p.gold;
      el.stage.querySelector('#hud-potion').textContent = p.potions;
      el.stage.querySelector('#hud-depth').textContent = S.depth;
      el.stage.querySelector('#hud-turn').textContent = S.turn;
      el.stage.querySelector('#hud-seed').textContent = 'seed: ' + S.seed;

      var latestMsg = S.log[0] ? S.log[0].text : (C.intro || '');
      var msgPill = el.stage.querySelector('#hud-msg');
      msgPill.textContent = latestMsg;
      msgPill.className = 'rg-msg-pill' + (S.over ? (S.won ? ' win' : ' danger') : '');

      var pRoom = roomAt(p.x, p.y);
      var rmText = pRoom ? ('Room ' + (S.level.rooms.indexOf(pRoom) + 1)) : 'Corridor';
      el.stage.querySelector('#hud-coords').textContent = '(' + p.x + ', ' + p.y + ') · ' + rmText;

      // Update 3D Walk link state
      var isCrawlspaceRules = (C.dungeon && C.dungeon.generator === 'grid' && C.dungeon.grid && C.dungeon.grid[0] === 3 && C.dungeon.grid[1] === 3);
      var btn3d = el.bar.querySelector('#rg-btn-3d');
      if (btn3d) {
        btn3d.style.display = isCrawlspaceRules ? 'inline-flex' : 'none';
      }

      // ASCII terminal view update if active
      if (viewStyle === 'ascii') {
        renderTerminalView();
      }
    }

    function renderTerminalView() {
      if (!el.terminal) return;
      var text = '';
      var p = S.player;
      for (var y = 0; y < S.tiles.length; y++) {
        for (var x = 0; x < S.tiles[0].length; x++) {
          var isVis = S.visible && S.visible[y][x];
          var isSeen = S.seen && S.seen[y][x];
          if (!isSeen && !isVis) {
            text += ' ';
            continue;
          }
          if (x === p.x && y === p.y) {
            text += '@';
          } else {
            var m = monsterAt(x, y);
            if (m && isVis) {
              text += m.ch;
            } else {
              var itm = itemAt(x, y);
              if (itm && isVis) {
                text += itm.kind === 'gold' ? (S.glyphs.gold || '$') : (S.glyphs.elixir || '!');
              } else {
                text += S.tiles[y][x];
              }
            }
          }
        }
        text += '\n';
      }
      el.terminal.textContent = text;
    }

    /* ── High-Detail Canvas Rendering ─────────────────────────────────── */
    function startAnimationLoop() {
      function frame(timestamp) {
        if (destroyed) return;
        if (!lastRafTime) lastRafTime = timestamp;
        var dt = Math.min(0.1, (timestamp - lastRafTime) / 1000);
        lastRafTime = timestamp;

        try {
          updateVfx(dt);
          if (viewStyle === 'canvas') {
            renderCanvas();
          }
        } catch (e) {
          console.error('ROGUE STUDIO RAF ERROR:', e);
        }

        rafId = requestAnimationFrame(frame);
      }
      rafId = requestAnimationFrame(frame);
    }

    function updateVfx(dt) {
      torchFlicker += dt * 7;

      // Update floating texts
      for (var f = floatingTexts.length - 1; f >= 0; f--) {
        floatingTexts[f].offsetY -= 28 * dt;
        floatingTexts[f].life -= dt * 1.2;
        if (floatingTexts[f].life <= 0) floatingTexts.splice(f, 1);
      }

      // Update attack flashes
      for (var a = attackFlashes.length - 1; a >= 0; a--) {
        attackFlashes[a].life -= dt * 2.5;
        if (attackFlashes[a].life <= 0) attackFlashes.splice(a, 1);
      }
    }

    function renderCanvas() {
      if (!canvasHelper) return;
      var ctx = canvasHelper.ctx;
      var W = canvasHelper.width || 800;
      var H = canvasHelper.height || 450;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#060504';
      ctx.fillRect(0, 0, W, H);

      if (!S || !S.tiles) return;

      var cols = S.tiles[0].length;
      var rows = S.tiles.length;
      var p = S.player;

      // Dynamic cell sizing to center the dungeon
      var cellW = Math.floor(W / cols);
      var cellH = Math.floor(H / rows);
      var cellSize = Math.max(12, Math.min(cellW, cellH, 32));
      var originX = Math.floor((W - cols * cellSize) / 2);
      var originY = Math.floor((H - rows * cellSize) / 2);

      var isLibrary = /library/i.test(C.title);
      var isCaves = /cave/i.test(C.title) || (C.dungeon && C.dungeon.generator === 'caves');
      var isBugs = /bug/i.test(C.title);

      var maxDist = 1;
      if (showHeatmap && S.distMap) {
        for (var dy = 0; dy < rows; dy++) {
          for (var dx = 0; dx < cols; dx++) {
            maxDist = Math.max(maxDist, S.distMap[dy][dx]);
          }
        }
      }

      // 1. Draw Tiles (Floors, Walls, Tunnels, Stairs)
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var t = S.tiles[y][x];
          var rx = originX + x * cellSize;
          var ry = originY + y * cellSize;
          var isVis = S.visible && S.visible[y][x];
          var isSeen = S.seen && S.seen[y][x];

          if (!isSeen && !isVis && !showHeatmap) {
            // Unrevealed darkness
            continue;
          }

          if (showHeatmap && S.distMap) {
            // BFS Heatmap visualization
            var distVal = S.distMap[y][x];
            if (t !== ' ') {
              if (distVal < 0) {
                ctx.fillStyle = '#d946ef'; // Unreachable / isolated
              } else {
                var hue = Math.round(210 - (210 * distVal / maxDist));
                ctx.fillStyle = 'hsl(' + hue + ', 75%, 45%)';
              }
              ctx.fillRect(rx, ry, cellSize, cellSize);
            }
            continue;
          }

          var alpha = isVis ? 1.0 : 0.35;
          ctx.save();
          ctx.globalAlpha = alpha;

          if (t === '.') {
            // Room Floor Tile
            drawFloorTile(ctx, rx, ry, cellSize, x, y, isLibrary, isCaves, isBugs, isVis);
          } else if (t === '#') {
            // Corridor Tunnel
            drawTunnelTile(ctx, rx, ry, cellSize, x, y, isLibrary, isCaves, isBugs, isVis);
          } else if (t === '>') {
            // Stairs Down
            drawStairsTile(ctx, rx, ry, cellSize, isVis);
          } else if (t === ' ' && S.edge && S.edge[y][x]) {
            // Perimeter Wall
            drawWallTile(ctx, rx, ry, cellSize, x, y, isLibrary, isCaves, isBugs, isVis);
          }

          ctx.restore();
        }
      }

      // 2. Draw Items (Gold, Elixirs)
      S.items.forEach(function (itm) {
        var isVis = S.visible && S.visible[itm.y][itm.x];
        if (!isVis && !showHeatmap) return;
        var ix = originX + itm.x * cellSize;
        var iy = originY + itm.y * cellSize;
        drawItem(ctx, ix, iy, cellSize, itm.kind);
      });

      // 3. Draw Monsters
      S.monsters.forEach(function (m) {
        if (m.hp <= 0) return;
        var isVis = S.visible && S.visible[m.y][m.x];
        if (!isVis && !showHeatmap) return;
        var mx = originX + m.x * cellSize;
        var my = originY + m.y * cellSize;
        drawMonster(ctx, mx, my, cellSize, m);
      });

      // 4. Draw Player Character
      var px = originX + p.x * cellSize;
      var py = originY + p.y * cellSize;
      drawPlayer(ctx, px, py, cellSize);

      // 5. Dynamic Torchlight Halo
      if (!showHeatmap) {
        drawTorchlightHalo(ctx, px + cellSize * 0.5, py + cellSize * 0.5, cellSize * 5.5);
      }

      // 6. Attack Slash Flashes
      attackFlashes.forEach(function (af) {
        var fx = originX + af.gx * cellSize;
        var fy = originY + af.gy * cellSize;
        ctx.save();
        ctx.globalAlpha = af.life * 4;
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fx + 2, fy + 2);
        ctx.lineTo(fx + cellSize - 2, fy + cellSize - 2);
        ctx.stroke();
        ctx.restore();
      });

      // 7. Floating Combat Popups
      floatingTexts.forEach(function (ft) {
        var fx = originX + ft.gx * cellSize;
        var fy = originY + ft.gy * cellSize + ft.offsetY;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, ft.life));
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillStyle = ft.color;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(ft.text, fx, fy);
        ctx.restore();
      });

      // 8. Hover Tile Cursor
      if (hoverCell) {
        var hx = originX + hoverCell.x * cellSize;
        var hy = originY + hoverCell.y * cellSize;
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hx, hy, cellSize, cellSize);
      }
    }

    /* ── Tile & Sprite Drawing Primitives ─────────────────────────────── */
    function drawFloorTile(ctx, rx, ry, s, x, y, isLib, isCave, isBug, isVis) {
      if (isBug) {
        // Cyber Grid
        ctx.fillStyle = isVis ? '#09181e' : '#050c10';
        ctx.fillRect(rx, ry, s, s);
        ctx.strokeStyle = isVis ? 'rgba(6, 182, 212, 0.25)' : 'rgba(6, 182, 212, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, ry, s, s);
        if ((x + y) % 5 === 0) {
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(rx + s * 0.45, ry + s * 0.45, 2, 2);
        }
      } else if (isCave) {
        // Jagged Cave Stone
        ctx.fillStyle = isVis ? '#1c1528' : '#0f0a17';
        ctx.fillRect(rx, ry, s, s);
        if ((x * 7 + y * 13) % 4 === 0) {
          ctx.fillStyle = '#a855f7';
          ctx.fillRect(rx + s * 0.3, ry + s * 0.3, 3, 3);
        }
      } else if (isLib) {
        // Parquet Wood Floor
        ctx.fillStyle = isVis ? '#271e16' : '#140f0b';
        ctx.fillRect(rx, ry, s, s);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, ry, s, s);
      } else {
        // Classic Dungeon Stone Flagstone
        ctx.fillStyle = isVis ? '#231e18' : '#120f0c';
        ctx.fillRect(rx, ry, s, s);
        ctx.strokeStyle = '#181410';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, ry, s, s);
        if ((x * 11 + y * 7) % 6 === 0) {
          ctx.fillStyle = '#15803d'; // Moss specks
          ctx.fillRect(rx + s * 0.2, ry + s * 0.7, 2, 2);
        }
      }
    }

    function drawTunnelTile(ctx, rx, ry, s, x, y, isLib, isCave, isBug, isVis) {
      ctx.fillStyle = isVis ? '#191512' : '#0d0a08';
      ctx.fillRect(rx, ry, s, s);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, ry, s, s);
    }

    function drawWallTile(ctx, rx, ry, s, x, y, isLib, isCave, isBug, isVis) {
      if (isBug) {
        // Server Tower Firewall
        ctx.fillStyle = isVis ? '#0f172a' : '#070b14';
        ctx.fillRect(rx, ry, s, s);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + 1, ry + 1, s - 2, s - 2);
        ctx.fillStyle = (x + y + Math.floor(torchFlicker)) % 3 === 0 ? '#22c55e' : '#ef4444';
        ctx.fillRect(rx + 3, ry + 3, 2, 2);
      } else if (isLib) {
        // Antique Bookshelf Wall
        ctx.fillStyle = isVis ? '#3e2723' : '#1d1210';
        ctx.fillRect(rx, ry, s, s);
        // Colored book spines
        var bColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
        for (var b = 0; b < 3; b++) {
          ctx.fillStyle = bColors[(x * 3 + b) % bColors.length];
          ctx.fillRect(rx + 2 + b * (s / 3.5), ry + 3, (s / 4.5), s - 6);
        }
      } else if (isCave) {
        // Jagged Amethyst Cavern Wall
        ctx.fillStyle = isVis ? '#3b1c54' : '#1e0c2b';
        ctx.fillRect(rx, ry, s, s);
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.moveTo(rx + s * 0.5, ry + 2);
        ctx.lineTo(rx + s - 2, ry + s - 2);
        ctx.lineTo(rx + 2, ry + s - 2);
        ctx.closePath();
        ctx.fill();
      } else {
        // Stone Masonry Block Wall with Torches
        ctx.fillStyle = isVis ? '#453a2d' : '#221c15';
        ctx.fillRect(rx, ry, s, s);
        ctx.fillStyle = '#5a4d3d';
        ctx.fillRect(rx + 1, ry + 1, s - 2, 2); // Highlight
        ctx.fillStyle = '#1c1712';
        ctx.fillRect(rx + 1, ry + s - 2, s - 2, 2); // Shadow

        // Torch on periodic wall faces
        if ((x + y * 3) % 11 === 0 && isVis) {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(rx + s * 0.45, ry + s * 0.4, 2, s * 0.4);
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          var flick = Math.sin(torchFlicker + x) * 1.5;
          ctx.arc(rx + s * 0.5 + flick, ry + s * 0.35, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawStairsTile(ctx, rx, ry, s, isVis) {
      // Golden Stone Staircase descending
      ctx.fillStyle = isVis ? '#292116' : '#14100a';
      ctx.fillRect(rx, ry, s, s);
      ctx.strokeStyle = '#ffd98a';
      ctx.lineWidth = 1.5;
      for (var st = 1; st <= 3; st++) {
        var sy = ry + st * (s / 4);
        ctx.beginPath();
        ctx.moveTo(rx + 3, sy);
        ctx.lineTo(rx + s - 3, sy);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffd98a';
      ctx.font = 'bold ' + Math.max(10, Math.floor(s * 0.7)) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('>', rx + s * 0.5, ry + s * 0.85);
      ctx.textAlign = 'left';
    }

    function drawItem(ctx, ix, iy, s, kind) {
      if (kind === 'gold') {
        // Shimmering Gold Coins
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(ix + s * 0.45, iy + s * 0.55, s * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(ix + s * 0.55, iy + s * 0.45, s * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Elixir Flask
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(ix + s * 0.5, iy + s * 0.6, s * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(ix + s * 0.42, iy + s * 0.22, s * 0.16, s * 0.2); // Neck
        ctx.fillStyle = '#6ee7b7';
        ctx.fillRect(ix + s * 0.45, iy + s * 0.45, 2, 2); // Bubble
      }
    }

    function drawMonster(ctx, mx, my, s, m) {
      var ch = m.ch;
      var cx = mx + s * 0.5;
      var cy = my + s * 0.5;

      ctx.save();
      if (ch === 'r') {
        // Rat: Gray furry body, twitchy pink tail
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.ellipse(cx, cy, s * 0.32, s * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(cx - s * 0.18, cy - s * 0.08, 1.5, 0, Math.PI * 2); // Eye
        ctx.fill();
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.25, cy);
        ctx.quadraticCurveTo(cx + s * 0.45, cy - s * 0.2, cx + s * 0.4, cy + s * 0.15);
        ctx.stroke();
      } else if (ch === 'g') {
        // Goblin: Green skin, pointed ears
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Spiked wooden club
        ctx.fillStyle = '#78350f';
        ctx.fillRect(cx + s * 0.2, cy - s * 0.35, 3, s * 0.5);
      } else if (ch === 'o') {
        // Orc: Menacing horned brute
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.roundRect(cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.6, 4);
        ctx.fill();
        ctx.fillStyle = '#475569';
        ctx.fillRect(cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.25); // Helmet
      } else if (ch === 'T') {
        // Troll: Giant stony hulk
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.roundRect(cx - s * 0.4, cy - s * 0.4, s * 0.8, s * 0.8, 6);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.fillRect(cx - s * 0.2, cy - s * 0.15, 3, 3); // Glowing eyes
        ctx.fillRect(cx + s * 0.1, cy - s * 0.15, 3, 3);
      } else if (ch === 'b') {
        // Bat: Flapping wings
        ctx.fillStyle = '#8b5cf6';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1.5;
        var wingFlap = Math.sin(torchFlicker * 2) * s * 0.15;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.4, cy - wingFlap);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + s * 0.4, cy - wingFlap);
        ctx.stroke();
      } else if (ch === 'j') {
        // Slime: Translucent wobbling jelly
        var wobble = Math.sin(torchFlicker * 1.5) * s * 0.08;
        ctx.fillStyle = 'rgba(34, 197, 94, 0.85)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + s * 0.05, s * 0.35 + wobble, s * 0.25 - wobble, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Fallback procedural monster token with letter
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.max(9, Math.floor(s * 0.55)) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ch, cx, cy);
      }
      ctx.restore();
    }

    function drawPlayer(ctx, px, py, s) {
      var cx = px + s * 0.5;
      var cy = py + s * 0.5;

      ctx.save();
      // Blue adventurer tunic
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(cx - s * 0.25, cy - s * 0.1, s * 0.5, s * 0.45, 3);
      ctx.fill();

      // Head & face
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.22, s * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Steel Helmet
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.26, s * 0.22, Math.PI, Math.PI * 2);
      ctx.fill();

      // Torch in hand
      var flick = Math.sin(torchFlicker) * 2;
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx + s * 0.22, cy - s * 0.15, 2.5, s * 0.35);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(cx + s * 0.24 + flick, cy - s * 0.2, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawTorchlightHalo(ctx, cx, cy, radius) {
      var haloR = radius + Math.sin(torchFlicker) * 6;
      var grad = ctx.createRadialGradient(cx, cy, haloR * 0.15, cx, cy, haloR);
      grad.addColorStop(0, 'rgba(254, 240, 138, 0.18)');
      grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.08)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();
    }

    /* ── Tab 1: Dungeon Console & Inspector ────────────────────────────── */
    function renderAdventureTab(pane) {
      // 1. Target & Room Status Card
      var statusCard = document.createElement('div');
      statusCard.className = 'rg-card';
      var p = S.player;
      var pRoom = roomAt(p.x, p.y);
      var nearbyMonsters = S.monsters.filter(function (m) {
        return m.hp > 0 && Math.abs(m.x - p.x) <= 3 && Math.abs(m.y - p.y) <= 3;
      });

      statusCard.innerHTML = [
        '<div class="rg-card-head"><span>Level Status</span><b>Depth ' + S.depth + '</b></div>',
        '<div style="font-size:0.78rem;line-height:1.5;">',
        '  <div>📍 <b>Location:</b> ' + (pRoom ? ('Room ' + (S.level.rooms.indexOf(pRoom) + 1) + ' (' + pRoom.w + '×' + pRoom.h + ')') : 'Stone Corridor') + '</div>',
        '  <div>🎯 <b>Goal:</b> ' + (S.goalDepth ? ('Reach Depth ' + S.goalDepth + ' to conquer the dungeon.') : 'Descend as deep as you dare!') + '</div>',
        nearbyMonsters.length
          ? ('  <div style="margin-top:0.25rem;color:#fca5a5;">⚠️ <b>Nearby Foes:</b> ' + nearbyMonsters.map(function (m) { return m.name + ' (' + m.hp + ' HP)'; }).join(', ') + '</div>')
          : '  <div style="margin-top:0.25rem;color:#86efac;">🛡️ Immediate area is quiet.</div>',
        '</div>'
      ].join('');
      pane.appendChild(statusCard);

      // 2. Event Log Card
      var logCard = document.createElement('div');
      logCard.className = 'rg-card';
      logCard.innerHTML = [
        '<div class="rg-card-head"><span>Chronicle Log</span><b>Turn ' + S.turn + '</b></div>',
        '<div class="rg-log-box" id="rg-log-box"></div>'
      ].join('');
      pane.appendChild(logCard);

      var logBox = logCard.querySelector('#rg-log-box');
      S.log.forEach(function (entry) {
        var div = document.createElement('div');
        div.className = 'rg-log-entry ' + entry.cls;
        div.textContent = 'D' + entry.depth + ' · T' + entry.turn + ': ' + entry.text;
        logBox.appendChild(div);
      });
    }

    /* ── Tab 2: Minimap Radar & Telemetry ──────────────────────────────── */
    function renderRadarTab(pane) {
      var card = document.createElement('div');
      card.className = 'rg-card';
      card.innerHTML = [
        '<div class="rg-card-head"><span>Dungeon Radar</span><b>' + S.rules.dungeon.cols + '×' + S.rules.dungeon.rows + ' Grid</b></div>',
        '<div class="rg-radar-wrap">',
        '  <canvas class="rg-radar-canvas" id="rg-radar-canvas"></canvas>',
        '</div>',
        '<div class="rg-radar-meta">',
        '  <div><span>Generator</span><b>' + S.rules.dungeon.generator.toUpperCase() + '</b></div>',
        '  <div><span>Rooms</span><b>' + (S.level.rooms ? S.level.rooms.length : 1) + '</b></div>',
        '  <div><span>Foes</span><b>' + S.monsters.filter(function (m) { return m.hp > 0; }).length + '</b></div>',
        '</div>',
        '<div style="font-size:0.75rem;color:var(--rg-muted);line-height:1.45;margin-top:0.2rem;">',
        '  White: You · Yellow: Stairs · Red: Foes · Gold: Items · Green: Reachable Path',
        '</div>'
      ].join('');
      pane.appendChild(card);

      var radarCanvas = card.querySelector('#rg-radar-canvas');
      drawRadarCanvas(radarCanvas);
    }

    function drawRadarCanvas(canvas) {
      var scale = 4;
      var L = S.level;
      canvas.width = L.cols * scale;
      canvas.height = L.rows * scale;
      var g = canvas.getContext('2d');

      for (var y = 0; y < L.rows; y++) {
        for (var x = 0; x < L.cols; x++) {
          var t = L.tiles[y][x];
          var isSeen = S.seen && S.seen[y][x];
          var c = '#0d0b09';
          if (t === '.') c = isSeen ? '#8a7a5e' : '#3d3428';
          else if (t === '#') c = isSeen ? '#5f5240' : '#272018';
          else if (t === '>') c = '#ffd98a';
          g.fillStyle = c;
          g.fillRect(x * scale, y * scale, scale, scale);
        }
      }

      // Foes
      g.fillStyle = '#ef4444';
      S.monsters.forEach(function (m) {
        if (m.hp > 0 && S.seen && S.seen[m.y][m.x]) {
          g.fillRect(m.x * scale, m.y * scale, scale, scale);
        }
      });

      // Items
      g.fillStyle = '#ffd166';
      S.items.forEach(function (it) {
        if (S.seen && S.seen[it.y][it.x]) {
          g.fillRect(it.x * scale, it.y * scale, scale, scale);
        }
      });

      // Player
      g.fillStyle = '#38bdf8';
      g.fillRect(S.player.x * scale - 1, S.player.y * scale - 1, scale + 2, scale + 2);
    }

    /* ── Tab 3: Config IDE & Game Data ─────────────────────────────────── */
    function renderConfigTab(pane) {
      var card = document.createElement('div');
      card.className = 'rg-card';
      card.style.flex = '1';
      card.innerHTML = [
        '<div class="rg-card-head"><span>Game Data Architecture</span><b>JSON Config</b></div>',
        '<p style="font-size:0.75rem;color:var(--rg-muted);margin:0;line-height:1.4;">',
        '  Edit rules, layout generators, sight radius, monster stats, and equipment progression below.',
        '</p>',
        '<textarea class="rg-config-area" id="rg-json-text" spellcheck="false">' + JSON.stringify(C, null, 2) + '</textarea>',
        '<div class="rg-config-status" id="rg-json-status"></div>',
        '<div style="display:flex;gap:0.4rem;flex-wrap:wrap;">',
        '  <button type="button" class="rg-btn primary" id="btn-apply-json">▶ Apply &amp; Run Dungeon</button>',
        '  <button type="button" class="rg-btn" id="btn-format-json">Format JSON</button>',
        '  <button type="button" class="rg-btn" id="btn-export-json">Save File</button>',
        '</div>'
      ].join('');
      pane.appendChild(card);

      var txt = card.querySelector('#rg-json-text');
      var st = card.querySelector('#rg-json-status');

      card.querySelector('#btn-apply-json').addEventListener('click', function () {
        try {
          var parsed = JSON.parse(txt.value);
          applyConfig(parsed);
          st.className = 'rg-config-status ok';
          st.textContent = 'Running “' + (parsed.title || 'My Roguelike') + '” successfully!';
        } catch (e) {
          st.className = 'rg-config-status bad';
          st.textContent = 'Config Error: ' + e.message;
        }
      });

      card.querySelector('#btn-format-json').addEventListener('click', function () {
        try {
          var parsed = JSON.parse(txt.value);
          txt.value = JSON.stringify(parsed, null, 2);
          st.className = 'rg-config-status ok';
          st.textContent = 'Formatted clean JSON.';
        } catch (e) {
          st.className = 'rg-config-status bad';
          st.textContent = 'JSON Syntax Error: ' + e.message;
        }
      });

      card.querySelector('#btn-export-json').addEventListener('click', exportGameFile);
    }

    /* ── Tab 4: Bestiary & Combat Math ─────────────────────────────────── */
    function renderBestiaryTab(pane) {
      var card = document.createElement('div');
      card.className = 'rg-card';
      var mTypes = (C.monsters && C.monsters.types) || [];

      var cardsHtml = mTypes.map(function (m) {
        var expHit = ((1 + m.atk) / 2).toFixed(1);
        var playerExpHit = ((1 + S.player.atk) / 2).toFixed(1);
        var swingsToWin = Math.ceil(m.hp / Number(playerExpHit));
        var damageTaken = Math.max(0, (swingsToWin - 1) * Number(expHit)).toFixed(0);

        return [
          '<div class="rg-monster-card">',
          '  <b><span style="font-family:monospace;background:#2a1c15;padding:1px 5px;border-radius:3px;">' + m.ch + '</span> ' + m.name + '</b>',
          '  <div class="rg-monster-stats">',
          '    <div>HP: ' + m.hp + ' · ATK: 1..' + m.atk + ' (avg ' + expHit + ')</div>',
          '    <div>Min Depth: ' + (m.minDepth || 1) + ' · XP: ' + (m.xp || 1) + '</div>',
          '    <div style="color:#fde047;margin-top:2px;">Est. damage taken: ~' + damageTaken + ' HP</div>',
          '  </div>',
          '</div>'
        ].join('');
      }).join('');

      card.innerHTML = [
        '<div class="rg-card-head"><span>Bestiary &amp; Combat Math</span><b>Expected Value</b></div>',
        '<p style="font-size:0.75rem;color:var(--rg-muted);margin:0;line-height:1.4;">',
        '  Calculated with formula <code>(1 + atk) / 2</code>. Player attack is currently <b>' + S.player.atk + '</b> (avg ' + ((1 + S.player.atk) / 2).toFixed(1) + ').',
        '</p>',
        '<div class="rg-bestiary-grid">' + cardsHtml + '</div>'
      ].join('');
      pane.appendChild(card);
    }

    /* ── Render Deck Router ────────────────────────────────────────────── */
    function renderDeck() {
      if (!el.deckScroll) return;
      var pane = el.deckScroll;
      pane.innerHTML = '';

      if (curMode === 'stage') {
        renderAdventureTab(pane);
      } else if (curMode === 'radar') {
        renderRadarTab(pane);
      } else if (curMode === 'config') {
        renderConfigTab(pane);
      } else if (curMode === 'bestiary') {
        renderBestiaryTab(pane);
      }
    }

    /* ── Event Wiring ──────────────────────────────────────────────────── */
    function bindEvents() {
      // Tab switcher
      el.bar.querySelectorAll('.rg-mode-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          el.bar.querySelectorAll('.rg-mode-btn').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
          btn.setAttribute('aria-pressed', 'true');
          curMode = btn.dataset.mode;
          renderDeck();
        });
      });

      // Preset selector
      var pSel = el.bar.querySelector('#rg-preset-select');
      pSel.addEventListener('change', function () {
        var p = PRESETS[pSel.value];
        if (p) applyConfig(p.config);
      });

      // View style switcher (Tiles vs ASCII)
      var viewBtn = el.bar.querySelector('#rg-btn-view');
      viewBtn.addEventListener('click', function () {
        if (viewStyle === 'canvas') {
          viewStyle = 'ascii';
          viewBtn.textContent = '📜 ASCII';
          el.canvas.style.display = 'none';
          el.terminal.classList.add('active');
          renderTerminalView();
        } else {
          viewStyle = 'canvas';
          viewBtn.textContent = '🎨 Tiles';
          el.canvas.style.display = 'block';
          el.terminal.classList.remove('active');
        }
      });

      // Heatmap toggle
      var heatBtn = el.bar.querySelector('#rg-btn-heat');
      heatBtn.addEventListener('click', function () {
        showHeatmap = !showHeatmap;
        heatBtn.style.color = showHeatmap ? '#ffd98a' : '';
      });

      // Seed scrambler
      el.bar.querySelector('#rg-btn-seed').addEventListener('click', function () {
        var nouns = ['lantern', 'crypt', 'vault', 'cavern', 'tower', 'depths', 'archive', 'forge'];
        var adj = ['amber', 'crooked', 'shadow', 'silent', 'gilded', 'sunken', 'mystic'];
        var newSeed = adj[Math.floor(Math.random() * adj.length)] + '-' + nouns[Math.floor(Math.random() * nouns.length)] + '-' + (Math.floor(Math.random() * 90) + 10);
        C.seed = newSeed;
        initGame(newSeed);
        syncUI();
        renderDeck();
        Sound.potion();
      });

      // Sound toggle
      var sndBtn = el.bar.querySelector('#rg-btn-sound');
      sndBtn.addEventListener('click', function () {
        var isMuted = Sound.toggle();
        sndBtn.textContent = isMuted ? '🔇 Muted' : '🔊 Sound';
      });

      // 3D Walk shortcut
      var btn3d = el.bar.querySelector('#rg-btn-3d');
      btn3d.addEventListener('click', function () {
        window.open('../../../apps/crawlspace/index.html?seed=' + encodeURIComponent(S.seed), '_blank');
      });

      // Restart run
      el.bar.querySelector('#rg-btn-restart').addEventListener('click', function () {
        initGame(S.seed);
        syncUI();
        renderDeck();
        Sound.potion();
      });

      // Export game
      el.bar.querySelector('#rg-btn-export').addEventListener('click', exportGameFile);

      // Dock buttons
      el.stage.querySelector('#btn-dock-potion').addEventListener('click', drinkPotion);
      el.stage.querySelector('#btn-dock-stairs').addEventListener('click', descendStairs);
      el.stage.querySelector('#btn-dock-wait').addEventListener('click', waitTurn);

      // D-Pad buttons
      var dpadMoves = {
        nw: [-1, -1], n: [0, -1], ne: [1, -1],
        w: [-1, 0], wait: [0, 0], e: [1, 0],
        sw: [-1, 1], s: [0, 1], se: [1, 1]
      };
      el.stage.querySelectorAll('.rg-dpad-btn').forEach(function (b) {
        b.addEventListener('click', function () {
          var act = b.dataset.act;
          if (act === 'wait') waitTurn();
          else if (dpadMoves[act]) step(dpadMoves[act][0], dpadMoves[act][1]);
        });
      });

      // Keyboard Controls
      var keyMap = {
        ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
        k: [0, -1], j: [0, 1], h: [-1, 0], l: [1, 0],
        y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1],
        '7': [-1, -1], '8': [0, -1], '9': [1, -1],
        '4': [-1, 0], '5': [0, 0], '6': [1, 0],
        '1': [-1, 1], '2': [0, 1], '3': [1, 1]
      };

      function onKey(e) {
        // Prevent window scroll on arrow keys when interacting
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) >= 0) {
          var target = e.target;
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
          e.preventDefault();
        }

        var targetTag = e.target && e.target.tagName;
        if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return;

        var k = e.key;
        if (keyMap[k]) {
          if (k === '5') waitTurn();
          else step(keyMap[k][0], keyMap[k][1]);
        } else if (k === 'q' || k === 'Q') {
          drinkPotion();
        } else if (k === '>' || k === '.' && e.shiftKey) {
          descendStairs();
        } else if (k === ' ' || k === '.') {
          waitTurn();
        } else if ((k === 'r' || k === 'R') && S.over) {
          initGame(S.seed);
          syncUI();
          renderDeck();
        }
      }
      window.addEventListener('keydown', onKey);

      // Canvas click to move
      el.canvas.addEventListener('click', function (e) {
        el.canvas.focus();
        if (!S || !S.tiles) return;
        var rect = el.canvas.getBoundingClientRect();
        var clickX = e.clientX - rect.left;
        var clickY = e.clientY - rect.top;

        var W = el.canvas.clientWidth;
        var H = el.canvas.clientHeight;
        var cols = S.tiles[0].length;
        var rows = S.tiles.length;
        var cellSize = Math.max(12, Math.min(Math.floor(W / cols), Math.floor(H / rows), 32));
        var originX = Math.floor((W - cols * cellSize) / 2);
        var originY = Math.floor((H - rows * cellSize) / 2);

        var gx = Math.floor((clickX - originX) / cellSize);
        var gy = Math.floor((clickY - originY) / cellSize);

        if (inside(gx, gy)) {
          var dx = Math.sign(gx - S.player.x);
          var dy = Math.sign(gy - S.player.y);
          step(dx, dy);
        }
      });

      el.canvas.addEventListener('mousemove', function (e) {
        var rect = el.canvas.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;
        var W = el.canvas.clientWidth;
        var H = el.canvas.clientHeight;
        var cols = S.tiles[0].length;
        var rows = S.tiles.length;
        var cellSize = Math.max(12, Math.min(Math.floor(W / cols), Math.floor(H / rows), 32));
        var originX = Math.floor((W - cols * cellSize) / 2);
        var originY = Math.floor((H - rows * cellSize) / 2);

        var gx = Math.floor((mx - originX) / cellSize);
        var gy = Math.floor((my - originY) / cellSize);
        if (inside(gx, gy)) {
          hoverCell = { x: gx, y: gy };
        } else {
          hoverCell = null;
        }
      });

      el.canvas.addEventListener('mouseleave', function () {
        hoverCell = null;
      });
    }

    function applyConfig(newCfg) {
      C = JSON.parse(JSON.stringify(newCfg));
      initGame();
      var titleEl = el.bar.querySelector('.rg-title');
      if (titleEl) titleEl.textContent = C.title || 'My Roguelike';
      var pSel = el.bar.querySelector('#rg-preset-select');
      if (pSel) {
        Object.keys(PRESETS).forEach(function (k) {
          if (PRESETS[k].config.title === C.title) pSel.value = k;
        });
      }
      syncUI();
      renderDeck();
      Sound.potion();
    }

    /* ── Single-File Playable Game Exporter ─────────────────────────────── */
    function exportGameFile() {
      var json = JSON.stringify(C, null, 2).replace(/</g, '\\u003c');
      var title = String(C.title || 'My Roguelike').replace(/[<>&"]/g, '');
      var html = [
        '<!doctype html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '<title>' + title + '</title>',
        '</head>',
        '<' + 'body style="margin:0;padding:1rem;background:#0d0b09;color:#f2e6cf;font-family:system-ui,sans-serif;">',
        '<div id="game" style="max-width:980px;margin:0 auto;"></div>',
        '<' + 'script>',
        'var RogueDungeon = (' + D.factory.toString() + ')();',
        root.RogueEngine ? root.RogueEngine.toString() : '',
        'var CONFIG = ' + json + ';',
        'if (window.RogueEngine) RogueEngine(document.getElementById("game"), CONFIG).focus();',
        '<' + '/script>',
        '</' + 'body>',
        '</' + 'html>'
      ].join('\n');

      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      a.download = title.replace(/\W+/g, '-').toLowerCase() + '.html';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 500);
    }

    // Initialize Game
    initGame();
    buildDom();

    return {
      applyConfig: applyConfig,
      getState: function () { return S; },
      focus: function () { if (el.canvas) el.canvas.focus(); },
      destroy: function () {
        destroyed = true;
        if (rafId) cancelAnimationFrame(rafId);
      }
    };
  }

  /* ── Export Public Mount Function ────────────────────────────────────── */
  root.RoguelikeStudio = {
    mount: function (rootEl, config) {
      return new RoguelikeStudioEngine(rootEl, config);
    },
    PRESETS: PRESETS
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);
