/* ------------------------------------------------------------------------
 * RogueEngine: the playable roguelike in the Roguelike Builder lesson's Lab.
 *
 * The turn rules are Crawlspace's, line for line: bump into a monster to hit
 * it, a turn only passes when you spend one, monsters within nine steps wake
 * and chase, and the stairs make a new level from the same seed. The level
 * comes from RogueDungeon (rogue-dungeon.js), so a Crawlspace-rules config
 * builds exactly the dungeon Crawlspace builds. Only the picture differs:
 * here it is Rogue's characters, in the colours of Crawlspace's parchment map.
 *
 *   RogueEngine(host, config, { onChange })  draws a game into host
 *   RogueEngine(null, config)                 the same rules, no screen
 *
 * Self-contained apart from RogueDungeon, because the lesson's "Download"
 * writes RogueDungeon.factory and RogueEngine.toString() into one file.
 * ---------------------------------------------------------------------- */
(function (root) {
  function RogueEngine(host, cfg, opts) {
    if (host && host._rogue) host._rogue.destroy();
    opts = opts || {};
    var D = RogueDungeon;
    function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
    function isInt(v) { return typeof v === 'number' && Math.floor(v) === v && isFinite(v); }
    if (!isObj(cfg)) throw new Error('The config must be one { } object.');
    var C = JSON.parse(JSON.stringify(cfg));

    // ---- read the config ----
    var checked = D.normalize(C);
    var problems = checked.problems.slice();
    var rules = checked.rules;
    var P = isObj(C.player) ? C.player : {};
    var G0 = isObj(P.perLevel) ? P.perLevel : {};
    var M = isObj(C.monsters) ? C.monsters : {};
    var I = isObj(C.items) ? C.items : {};
    function num(v, d) { return v == null ? d : v; }
    var start = { hp: num(P.hp, 20), atk: num(P.atk, 3), potions: num(P.potions, 1) };
    var grow = { hp: num(G0.hp, 3), heal: num(G0.heal, 5), atk: num(G0.atk, 1) };
    var wake = num(M.wakeRange, 9);
    var heal = num(I.heal, [6, 12]);
    var sight = num(C.sight, 'room');
    var goal = isObj(C.goal) ? C.goal : {};
    var goalDepth = num(goal.depth, 0);
    var W = { gold: 'gold', elixir: 'elixir', stairs: 'stairs', rock: 'cold stone' };
    var GL = { floor: '.', tunnel: '#', stairs: '>', wall: '▒', player: '@', gold: '$', elixir: '!' };
    if (isObj(C.words)) for (var wk in C.words) if (W[wk] != null && typeof C.words[wk] === 'string' && C.words[wk]) W[wk] = C.words[wk];
    if (isObj(C.glyphs)) {
      for (var gk in C.glyphs) {
        if (GL[gk] == null) continue;
        if (typeof C.glyphs[gk] !== 'string' || C.glyphs[gk].length !== 1) problems.push('glyphs.' + gk + ' must be one character.');
        else GL[gk] = C.glyphs[gk];
      }
    }
    if (!isInt(start.hp) || start.hp < 1 || start.hp > 999) problems.push('player.hp must be a whole number from 1 to 999.');
    if (!isInt(start.atk) || start.atk < 1 || start.atk > 99) problems.push('player.atk must be a whole number from 1 to 99.');
    if (!isInt(start.potions) || start.potions < 0 || start.potions > 20) problems.push('player.potions must be a whole number from 0 to 20.');
    ['hp', 'heal', 'atk'].forEach(function (k) {
      if (!isInt(grow[k]) || grow[k] < 0 || grow[k] > 50) problems.push('player.perLevel.' + k + ' must be a whole number from 0 to 50.');
    });
    if (!isInt(wake) || wake < 1 || wake > 60) problems.push('monsters.wakeRange must be a whole number from 1 to 60.');
    if (!Array.isArray(heal) || heal.length !== 2 || !isInt(heal[0]) || !isInt(heal[1]) || heal[0] < 0 || heal[0] > heal[1]) problems.push('items.heal must be [least, most], like [6, 12].');
    if (sight !== 'room' && (!isInt(sight) || sight < 2 || sight > 20)) problems.push('sight must be "room" or a number of squares from 2 to 20.');
    if (sight === 'room' && rules.dungeon.generator === 'caves') problems.push('sight "room" needs rooms, and caves have none. Use a number of squares, like "sight": 6.');
    if (!isInt(goalDepth) || goalDepth < 0 || goalDepth === 1 || goalDepth > 99) problems.push('goal.depth must be 0 (no goal: go as deep as you can) or a depth from 2 to 99.');
    if (problems.length) throw new Error(problems[0]);
    var title = typeof C.title === 'string' && C.title ? C.title : 'My Roguelike';
    var intro = typeof C.intro === 'string' && C.intro ? C.intro : 'Find the ' + W.stairs + ' (' + GL.stairs + '). Walk into a monster to fight it.';
    var winText = typeof goal.text === 'string' && goal.text ? goal.text : 'You made it to depth ' + goalDepth + '. You win!';

    // ---- state ----
    var S;
    function say(t) { S.msg.push(t); }
    function grid(v) {
      var g = [];
      for (var y = 0; y < S.tiles.length; y++) g.push(new Array(S.tiles[0].length).fill(v));
      return g;
    }
    function roll(min, max) { return Math.floor(S.dice() * (max - min + 1)) + min; }
    var ADJ = ['amber', 'hollow', 'silent', 'crooked', 'sunken', 'gilded', 'frozen', 'echoing', 'mossy', 'restless'];
    var NOUN = ['lantern', 'stair', 'vault', 'crypt', 'cellar', 'mine', 'well', 'tower', 'burrow', 'forge'];
    function freshSeed() {
      return ADJ[Math.floor(Math.random() * ADJ.length)] + '-' + NOUN[Math.floor(Math.random() * NOUN.length)] + '-' + (Math.floor(Math.random() * 90) + 10);
    }

    function newGame(seedText) {
      var seed = seedText != null && String(seedText).trim() !== '' ? String(seedText).trim()
        : C.seed != null && String(C.seed).trim() !== '' ? String(C.seed).trim() : freshSeed();
      S = { seed: seed, depth: 1, turn: 0, kills: 0, over: false, won: false, killedBy: null, msg: [] };
      // The dice are seeded too: the same seed and the same keys replay the same game.
      S.dice = D.mulberry32(D.toSeed(seed) ^ 0x5eed);
      S.player = { hp: start.hp, maxHp: start.hp, atk: start.atk, gold: 0, potions: start.potions, x: 0, y: 0 };
      enterLevel();
      say(intro);
      changed();
    }

    function enterLevel() {
      var L = D.generate(rules, S.seed, S.depth);
      S.level = L;
      S.tiles = L.tiles;
      S.monsters = L.monsters;
      S.items = L.items;
      S.player.x = L.start.x;
      S.player.y = L.start.y;
      S.seen = grid(false);
      S.edge = grid(false);
      // Rock beside a floor is a wall worth drawing; the rest is solid ground.
      for (var y = 0; y < L.rows; y++) {
        for (var x = 0; x < L.cols; x++) {
          if (S.tiles[y][x] !== ' ') continue;
          for (var dy = -1; dy <= 1 && !S.edge[y][x]; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
              var r = S.tiles[y + dy];
              if (r && (r[x + dx] === '.' || r[x + dx] === '>')) { S.edge[y][x] = true; break; }
            }
          }
        }
      }
      updateVisibility();
    }

    function inside(x, y) { return y >= 0 && y < S.tiles.length && x >= 0 && x < S.tiles[0].length; }
    function isWalkable(x, y) { return inside(x, y) && D.walkable(S.tiles[y][x]); }
    function monsterAt(x, y) {
      for (var i = 0; i < S.monsters.length; i++) if (S.monsters[i].x === x && S.monsters[i].y === y && S.monsters[i].hp > 0) return S.monsters[i];
      return null;
    }
    function itemAt(x, y) {
      for (var i = 0; i < S.items.length; i++) if (S.items[i].x === x && S.items[i].y === y) return S.items[i];
      return null;
    }
    function roomAt(x, y) {
      var rooms = S.level.rooms;
      for (var i = 0; i < rooms.length; i++) {
        var r = rooms[i];
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
      }
      return null;
    }

    // Rogue's sight: a room is lit when you stand in it, a tunnel shows only
    // the squares around you. Or, with a number, line of sight that far.
    function updateVisibility() {
      var vis = grid(false), p = S.player;
      function mark(x, y) { if (inside(x, y)) { vis[y][x] = true; S.seen[y][x] = true; } }
      var x, y;
      if (sight === 'room') {
        var room = roomAt(p.x, p.y);
        if (room) {
          for (y = room.y - 1; y <= room.y + room.h; y++) for (x = room.x - 1; x <= room.x + room.w; x++) mark(x, y);
        } else {
          for (y = -1; y <= 1; y++) for (x = -1; x <= 1; x++) mark(p.x + x, p.y + y);
        }
      } else {
        // Cast a straight line to every square on the edge of a box around
        // you, and stop each line at the first rock it hits.
        mark(p.x, p.y);
        for (var i = -sight; i <= sight; i++) {
          ray(p.x + i, p.y - sight); ray(p.x + i, p.y + sight);
          ray(p.x - sight, p.y + i); ray(p.x + sight, p.y + i);
        }
      }
      function ray(tx, ty) {
        var x0 = p.x, y0 = p.y, dx = Math.abs(tx - x0), dy = -Math.abs(ty - y0);
        var sx = x0 < tx ? 1 : -1, sy = y0 < ty ? 1 : -1, err = dx + dy;
        while (!(x0 === tx && y0 === ty)) {
          var e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
          if (!inside(x0, y0) || (x0 - p.x) * (x0 - p.x) + (y0 - p.y) * (y0 - p.y) > sight * sight + sight) return;
          mark(x0, y0);
          if (!D.walkable(S.tiles[y0][x0])) return;
        }
      }
      S.visible = vis;
    }

    // ---- one turn ----
    function step(dx, dy) {
      if (S.over) return false;
      S.msg = [];
      var p = S.player, nx = p.x + dx, ny = p.y + dy;
      var target = monsterAt(nx, ny);
      if (target) {                                   // walking into a monster is an attack
        var dmg = roll(1, p.atk);
        target.hp -= dmg;
        if (target.hp <= 0) {
          var loot = (target.xp || 0) * 3;
          p.gold += loot;
          S.kills++;
          S.monsters = S.monsters.filter(function (m) { return m !== target; });
          say('You defeat the ' + target.name + '!' + (loot ? ' (+' + loot + ' ' + W.gold + ')' : ''));
        } else {
          say('You hit the ' + target.name + ' for ' + dmg + '.');
        }
        endTurn();
        return true;
      }
      if (!isWalkable(nx, ny)) {
        say('You bump into ' + W.rock + '.');        // costs no turn
        changed();
        return false;
      }
      p.x = nx;
      p.y = ny;
      var item = itemAt(nx, ny);
      if (item) {
        if (item.kind === 'gold') { p.gold += item.amount; say('You pick up ' + item.amount + ' ' + W.gold + '.'); }
        else { p.potions++; say('You pocket a flask of ' + W.elixir + '.'); }
        S.items = S.items.filter(function (i) { return i !== item; });
      } else if (S.tiles[ny][nx] === '>') {
        say('The ' + W.stairs + ' lead down. Press > to go deeper.');
      }
      endTurn();
      return true;
    }

    function drink() {
      if (S.over) return false;
      S.msg = [];
      var p = S.player;
      if (p.potions <= 0) { say('You have no ' + W.elixir + ' left.'); changed(); return false; }
      p.potions--;
      var before = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + roll(heal[0], heal[1]));
      say('You drink the ' + W.elixir + ' and heal ' + (p.hp - before) + '.');
      endTurn();
      return true;
    }

    function descend() {
      if (S.over) return false;
      S.msg = [];
      var p = S.player;
      if (S.tiles[p.y][p.x] !== '>') { say('There are no ' + W.stairs + ' here.'); changed(); return false; }
      S.depth++;
      if (goalDepth && S.depth >= goalDepth) {
        S.over = true;
        S.won = true;
        say(winText);
        changed();
        return true;
      }
      p.maxHp += grow.hp;
      p.hp = Math.min(p.maxHp, p.hp + grow.heal);
      p.atk += grow.atk;
      enterLevel();
      say('You go down to depth ' + S.depth + '. The air turns colder.');
      changed();
      return true;
    }

    function monsterTurns() {
      var p = S.player;
      for (var i = 0; i < S.monsters.length && !S.over; i++) {
        var m = S.monsters[i];
        if (m.hp <= 0) continue;
        if (Math.abs(m.x - p.x) + Math.abs(m.y - p.y) > wake) continue;    // asleep, too far away
        if (Math.abs(m.x - p.x) <= 1 && Math.abs(m.y - p.y) <= 1) {
          var dmg = roll(1, m.atk);
          p.hp -= dmg;
          say('The ' + m.name + ' hits you for ' + dmg + '.');
          if (p.hp <= 0) {
            p.hp = 0;
            S.over = true;
            S.killedBy = m.name;
            say('You fall on depth ' + S.depth + '.');
          }
          continue;
        }
        // Step toward the player: diagonally if it can, else sideways, else up or down.
        var dx = Math.sign(p.x - m.x), dy = Math.sign(p.y - m.y);
        var options = [[m.x + dx, m.y + dy], [m.x + dx, m.y], [m.x, m.y + dy]];
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

    function endTurn() {
      S.turn++;
      if (!S.over) monsterTurns();
      updateVisibility();
      changed();
    }

    var MOVES = { nw: [-1, -1], n: [0, -1], ne: [1, -1], w: [-1, 0], e: [1, 0], sw: [-1, 1], s: [0, 1], se: [1, 1] };
    function act(cmd) {
      if (MOVES[cmd]) return step(MOVES[cmd][0], MOVES[cmd][1]);
      if (cmd === 'drink') return drink();
      if (cmd === 'descend') return descend();
      return false;
    }

    var api = {
      rules: rules,
      newGame: newGame,
      act: act,
      state: function () { return S; },
      destroy: function () {}
    };
    var draw = function () {};
    function changed() {
      draw();
      if (opts.onChange) opts.onChange(S);
    }
    if (!host) {
      newGame(opts.seed);
      return api;
    }

    // ---- styles (injected once, scoped with .rg) ----
    if (!document.getElementById('rg-style')) {
      var st = document.createElement('style');
      st.id = 'rg-style';
      st.textContent = [
        '.rg{position:relative;background:#0d0b09;color:#e8dcc4;border:2px solid #5b4a33;border-radius:14px;padding:.75rem;font:14px/1.45 system-ui,sans-serif;box-sizing:border-box}',
        '.rg *{box-sizing:border-box}',
        '.rg h3{margin:0;font-size:1.05rem;color:#ffd98a;font-family:ui-monospace,monospace}.rg-top{display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap;align-items:baseline}',
        '.rg-chips{display:flex;flex-wrap:wrap;gap:.35rem;margin:.5rem 0}.rg-chip{background:#1a1510;border:1px solid #4a3d2c;border-radius:8px;padding:.1rem .5rem;font-weight:600;font-size:.78rem;color:#f2e6cf;font-variant-numeric:tabular-nums}',
        '.rg-chip.low{color:#ffb4a8;border-color:#b45309}',
        '.rg-map{margin:0;background:#070605;border:1px solid #3a3024;border-radius:10px;padding:.5rem;overflow-x:auto;font-family:"JetBrains Mono",ui-monospace,"Cascadia Mono",Menlo,Consolas,monospace;line-height:1.15;white-space:pre;color:#cbb693;cursor:pointer}',
        '.rg-map:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.rg-map:focus{border-color:#a08a66}',
        '.rg-f{color:#cbb693}.rg-fm{color:#5d5344}.rg-t{color:#a08a66}.rg-tm{color:#4a4034}.rg-w{color:#7a6a52}.rg-wm{color:#3a332b}',
        '.rg-s{color:#ffd98a;font-weight:700}.rg-sm{color:#8a7038}.rg-p{color:#fff6e2;font-weight:800}.rg-m{color:#ff6b5e;font-weight:700}.rg-g{color:#ffd166;font-weight:700}.rg-e{color:#7fe6bb;font-weight:700}',
        '.rg-msg{min-height:2.9em;margin:.45rem 0;font-size:.85rem;color:#f2e6cf}.rg-msg.dire{color:#ffb4a8;font-weight:700}',
        '.rg-bar{display:flex;flex-wrap:wrap;gap:.7rem;align-items:center}',
        '.rg-pad{display:grid;grid-template-columns:repeat(3,2.35rem);gap:.2rem}',
        '.rg button{font:inherit;font-size:.8rem;font-weight:700;border:0;border-radius:8px;padding:.38rem .7rem;background:#e0a84a;color:#1c1307;cursor:pointer}',
        '.rg-pad button{padding:0;height:2.1rem;font-size:1rem}.rg button.alt{background:transparent;color:#f2e6cf;border:1.5px solid #5b4a33}',
        '.rg button:disabled{opacity:.45;cursor:not-allowed}.rg button:focus-visible,.rg input:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}',
        '.rg-acts{display:flex;flex-wrap:wrap;gap:.35rem}.rg-view{display:flex;flex-wrap:wrap;gap:.2rem .8rem;font-size:.78rem;color:#cbb693}.rg-view label{display:flex;gap:.3rem;align-items:center;cursor:pointer}',
        '.rg-help{font-size:.74rem;color:#a89878;margin:.4rem 0 0}',
        '.rg-modal{position:absolute;inset:0;background:rgba(7,6,5,.86);border-radius:12px;display:flex;align-items:center;justify-content:center;padding:.8rem;z-index:5}',
        '.rg-box{background:#0d0b09;border:2px solid #e0a84a;border-radius:12px;padding:1rem;max-width:26rem;width:100%}.rg-box h4{margin:0 0 .35rem;font-size:1.15rem;color:#ffd98a}.rg-box p{margin:0 0 .7rem}.rg-box div{display:flex;flex-wrap:wrap;gap:.4rem}',
        '@media print{.rg,.rg-map,.rg-chip{background:#fff!important;color:#111!important;border-color:#999!important}.rg-map span{color:#111!important;background:none!important}.rg h3,.rg-msg{color:#111!important}.rg-bar,.rg-help,.rg-modal{display:none!important}}'
      ].join('');
      document.head.appendChild(st);
    }

    // ---- UI ----
    var el = {}, ro = null, uid = 'rg' + Math.floor(Math.random() * 1e6);
    function h(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
    function button(text, cls, label, fn) {
      var b = h('button', cls, text);
      b.type = 'button';
      if (label) b.setAttribute('aria-label', label);
      b.addEventListener('click', function () { fn(); el.map.focus({ preventScroll: true }); });
      return b;
    }
    host.replaceChildren();
    var box = h('div', 'rg');
    host.appendChild(box);
    var top = h('div', 'rg-top');
    top.appendChild(h('h3', null, title));
    el.seed = h('span', 'rg-chip');
    top.appendChild(el.seed);
    box.appendChild(top);
    el.chips = h('div', 'rg-chips');
    box.appendChild(el.chips);
    el.map = h('pre', 'rg-map');
    el.map.tabIndex = 0;
    el.map.id = uid + '-map';
    el.map.setAttribute('role', 'application');
    el.map.setAttribute('aria-roledescription', 'dungeon map');
    el.map.setAttribute('aria-label', 'Dungeon map. Move with the arrow keys or W A S D; Y U B N move diagonally. Press > on the stairs, Q to drink.');
    el.map.setAttribute('aria-describedby', uid + '-msg');
    box.appendChild(el.map);
    el.msg = h('p', 'rg-msg');
    el.msg.id = uid + '-msg';
    el.msg.setAttribute('aria-live', 'polite');
    box.appendChild(el.msg);
    var bar = h('div', 'rg-bar');
    var pad = h('div', 'rg-pad');
    [['↖', 'nw', 'Move up and left'], ['↑', 'n', 'Move up'], ['↗', 'ne', 'Move up and right'],
      ['←', 'w', 'Move left'], [GL.stairs, 'descend', 'Go down the ' + W.stairs], ['→', 'e', 'Move right'],
      ['↙', 'sw', 'Move down and left'], ['↓', 's', 'Move down'], ['↘', 'se', 'Move down and right']].forEach(function (b) {
      pad.appendChild(button(b[0], b[1] === 'descend' ? null : 'alt', b[2], function () { act(b[1]); }));
    });
    bar.appendChild(pad);
    var acts = h('div', 'rg-acts');
    acts.appendChild(button('Drink ' + GL.elixir + ' (Q)', null, 'Drink an ' + W.elixir, drink));
    acts.appendChild(button('↺ Same seed', 'alt', 'Start again with the same seed', function () { newGame(S.seed); }));
    acts.appendChild(button('🎲 New seed', 'alt', 'Start again with a new seed', function () { newGame(freshSeed()); }));
    bar.appendChild(acts);
    var view = h('div', 'rg-view');
    function toggle(text, on) {
      var lab = h('label'), input = h('input');
      input.type = 'checkbox';
      input.checked = on;
      input.addEventListener('change', function () { draw(); });
      lab.appendChild(input);
      lab.appendChild(document.createTextNode(text));
      view.appendChild(lab);
      return input;
    }
    el.fog = toggle('Fog of war', true);
    el.heat = toggle('Distance map', false);
    bar.appendChild(view);
    box.appendChild(bar);
    box.appendChild(h('p', 'rg-help', 'Click the map, then use the arrow keys, W A S D, or Rogue\'s keys (h j k l, and y u b n for diagonals). > goes down the stairs, Q drinks.'));

    var KEYS = {
      ArrowUp: 'n', ArrowDown: 's', ArrowLeft: 'w', ArrowRight: 'e', w: 'n', s: 's', a: 'w', d: 'e',
      k: 'n', j: 's', h: 'w', l: 'e', y: 'nw', u: 'ne', b: 'sw', n: 'se', '>': 'descend', q: 'drink'
    };
    function onKey(e) {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var cmd = KEYS[e.key] || KEYS[e.key.toLowerCase && e.key.toLowerCase()];
      if (e.key === 'r' && S.over) { e.preventDefault(); newGame(S.seed); return; }
      if (!cmd) return;
      e.preventDefault();
      act(cmd);
    }
    box.addEventListener('keydown', onKey);
    el.map.addEventListener('click', function () { el.map.focus({ preventScroll: true }); });

    // Size the characters so the whole map fits across, using the width one
    // character really has in whichever monospace font the browser picked.
    var charW = 0;
    function fit() {
      var cols = S && S.tiles ? S.tiles[0].length : 68;
      var w = el.map.clientWidth - 20;
      if (w <= 0) return;
      if (!charW) {
        var probe = h('span', null, '0123456789');
        probe.style.cssText = 'position:absolute;visibility:hidden;font-size:100px;white-space:pre';
        el.map.appendChild(probe);
        charW = probe.getBoundingClientRect().width / 1000 || 0.61;
        probe.remove();
      }
      el.map.style.fontSize = Math.max(5, Math.min(19, w / (cols * charW))).toFixed(2) + 'px';
    }
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(fit); ro.observe(box); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { charW = 0; fit(); });

    function esc(c) { return c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c; }
    function chip(text, cls) { el.chips.appendChild(h('span', 'rg-chip' + (cls ? ' ' + cls : ''), text)); }

    draw = function () {
      if (!S) return;
      var p = S.player, T = S.tiles, rows = T.length, cols = T[0].length;
      var fog = el.fog.checked, heat = el.heat.checked ? D.distanceMap(T, p) : null, far = 1;
      if (heat) for (var hy = 0; hy < rows; hy++) for (var hx = 0; hx < cols; hx++) if (heat[hy][hx] > far) far = heat[hy][hx];
      var things = {};
      S.items.forEach(function (it) { things[it.x + ',' + it.y] = it.kind === 'gold' ? [GL.gold, 'g'] : [GL.elixir, 'e']; });
      S.monsters.forEach(function (m) { things[m.x + ',' + m.y] = [m.ch, 'm']; });
      var html = '', run = '', runCls = null;
      function flush() { if (run) html += runCls ? '<span class="rg-' + runCls + '">' + run + '</span>' : run; run = ''; }
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var known = !fog || S.seen[y][x], lit = !fog || S.visible[y][x];
          var t = T[y][x], ch = ' ', cls = null, thing = things[x + ',' + y];
          if (x === p.x && y === p.y) { ch = GL.player; cls = 'p'; }
          else if (thing && lit) { ch = thing[0]; cls = thing[1]; }
          else if (known) {
            if (t === '.') { ch = GL.floor; cls = 'f'; }
            else if (t === '#') { ch = GL.tunnel; cls = 't'; }
            else if (t === '>') { ch = GL.stairs; cls = 's'; }
            else if (S.edge[y][x]) { ch = GL.wall; cls = 'w'; }
            if (cls && !lit) cls += 'm';
          }
          if (heat && known && heat[y][x] >= 0 && cls !== 'p') {
            flush();
            var hue = Math.round(200 - 200 * heat[y][x] / far);
            html += '<span class="rg-' + (cls || 'f') + '" style="background:hsl(' + hue + ' 70% 26%);color:#fff6e2">' + esc(ch === ' ' ? GL.floor : ch) + '</span>';
            continue;
          }
          if (cls !== runCls) { flush(); runCls = cls; }
          run += esc(ch);
        }
        flush();
        runCls = null;
        html += '\n';
      }
      el.map.innerHTML = html;
      el.seed.textContent = '🌱 Seed: ' + S.seed;
      el.chips.replaceChildren();
      chip('Depth ' + S.depth + (goalDepth ? ' of ' + goalDepth : ''));
      chip('♥ ' + p.hp + '/' + p.maxHp, p.hp <= p.maxHp * 0.34 ? 'low' : '');
      chip('⚔ Attack ' + p.atk);
      chip(GL.gold + ' ' + p.gold + ' ' + W.gold);
      chip(GL.elixir + ' ' + p.potions + ' ' + W.elixir);
      chip('⏱ Turn ' + S.turn);
      el.msg.textContent = S.msg.join(' ');
      el.msg.className = 'rg-msg' + (S.over && !S.won ? ' dire' : '');
      fit();
      var old = box.querySelector('.rg-modal');
      if (old) old.remove();
      if (S.over) {
        var modal = h('div', 'rg-modal'), card = h('div', 'rg-box'), row = h('div');
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-label', S.won ? 'You win' : 'You fall');
        card.appendChild(h('h4', null, S.won ? '🏆 You win!' : 'You fall'));
        card.appendChild(h('p', null, (S.won ? winText + ' ' : 'The ' + S.killedBy + ' got you. ') +
          'Depth ' + S.depth + ' · ' + p.gold + ' ' + W.gold + ' · ' + S.kills + ' defeated · ' + S.turn + ' turns · seed ' + S.seed + '.'));
        var again = button('↺ Same seed again', null, null, function () { newGame(S.seed); });
        row.appendChild(again);
        row.appendChild(button('🎲 New seed', 'alt', null, function () { newGame(freshSeed()); }));
        card.appendChild(row);
        modal.appendChild(card);
        box.appendChild(modal);
        setTimeout(function () { if (again.isConnected) again.focus({ preventScroll: true }); }, 0);
      }
    };

    api.destroy = function () {
      if (ro) ro.disconnect();
      box.removeEventListener('keydown', onKey);
      host.replaceChildren();
      host._rogue = null;
    };
    api.focus = function () { el.map.focus({ preventScroll: true }); };
    host._rogue = api;
    newGame(opts.seed);
    return api;
  }

  if (typeof module === 'object' && module.exports) module.exports = RogueEngine;
  else root.RogueEngine = RogueEngine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
