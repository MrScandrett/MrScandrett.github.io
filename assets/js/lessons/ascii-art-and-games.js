/* ASCII lesson — lessons/computer-science/graphics-and-games/ascii-art-and-games.html */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var RAMPS = {
    short: ' .:-=+*#%@',
    city: " .'`,:;-~=+*!?%#&$@",   // the exact ramp ASCII City uses
    blocks: ' ░▒▓█',
    reverse: '@%#*+=-:. '
  };

  /* ── Part 1: text → codes ── */
  function renderEncode() {
    var text = $('as-encode-in').value;
    var body = $('as-encode').tBodies[0];
    var rows = '';
    var bits = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var c = text.charCodeAt(i);
      var shown = ch === ' ' ? '(space)' : ch.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      if (c > 127) {
        rows += '<tr><td>' + shown + '</td><td>' + c + '</td><td colspan="2">Not ASCII (Unicode only)</td></tr>';
        continue;
      }
      var b = c.toString(2).padStart(7, '0');
      bits += 7;
      rows += '<tr><td>' + shown + '</td><td>' + c + '</td><td>' + c.toString(16).toUpperCase().padStart(2, '0') +
        '</td><td>' + b[0] + '<span class="bit5">' + b[1] + '</span>' + b.slice(2) + '</td></tr>';
    }
    body.innerHTML = rows || '<tr><td colspan="4">Type something above.</td></tr>';
    $('as-encode-note').textContent = text.length
      ? text.length + ' character' + (text.length === 1 ? '' : 's') + ' → ' + bits + ' bits. The blue digit is bit 5, the "lowercase" bit.'
      : '';
  }
  $('as-encode-in').addEventListener('input', renderEncode);
  renderEncode();

  /* ── Part 2: the table ── */
  var grid = $('as-grid');
  var flipped = false;
  function group(c) {
    if (c >= 48 && c <= 57) return '#ff9f0a';
    if (c >= 65 && c <= 90) return '#0a84ff';
    if (c >= 97 && c <= 122) return '#30d158';
    return '#8e8e93';
  }
  function isLetter(c) { return (c >= 65 && c <= 90) || (c >= 97 && c <= 122); }
  function describe(c) {
    var ch = String.fromCharCode(c);
    return (c === 32 ? 'space' : "'" + ch + "'") + ' = ' + c + ' = ' + c.toString(2).padStart(7, '0') +
      ' in binary = 0x' + c.toString(16).toUpperCase();
  }
  function buildGrid() {
    var html = '';
    for (var c = 32; c <= 126; c++) {
      var code = flipped && isLetter(c) ? c ^ 32 : c;
      html += '<button type="button" data-code="' + code + '" aria-pressed="false" style="--k:' + group(code) + '" aria-label="' +
        describe(code).replace(/'/g, '') + '">' + (code === 32 ? '␠' : String.fromCharCode(code).replace('&', '&amp;').replace('<', '&lt;')) +
        '<small>' + code + '</small></button>';
    }
    grid.innerHTML = html;
  }
  grid.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    grid.querySelectorAll('[aria-pressed="true"]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    btn.setAttribute('aria-pressed', 'true');
    var c = +btn.dataset.code;
    var extra = isLetter(c) ? '. Its partner ' + "'" + String.fromCharCode(c ^ 32) + "' is " + (c ^ 32) + '.' : '.';
    $('as-pick-out').textContent = describe(c) + extra;
  });
  $('as-flip').addEventListener('click', function () {
    flipped = !flipped;
    this.setAttribute('aria-pressed', String(flipped));
    buildGrid();
  });
  buildGrid();

  /* ── Part 3: brightness → characters ── */
  // Returns a rows×cols array of brightness (0..1), or -1 for empty background.
  // aspect = character width / line height; cells are taller than wide, so shapes are squashed vertically to stay round.
  function shade(shape, cols, rows, t, aspect) {
    var buf = new Float32Array(cols * rows).fill(-1);
    if (shape === 'donut') {
      // After Andy Sloane's donut.c: sample points on a torus, keep the nearest per cell.
      var z = new Float32Array(cols * rows);
      var A = t * 0.9, B = t * 0.5;
      var cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);
      var K2 = 5, K1 = Math.min(cols, rows / aspect) / 1.5 * 0.95; // x·ooz and y·ooz never exceed 0.75 at K2 = 5
      for (var th = 0; th < 6.283; th += 0.05) {
        var ct = Math.cos(th), st = Math.sin(th);
        for (var ph = 0; ph < 6.283; ph += 0.015) {
          var cp = Math.cos(ph), sp = Math.sin(ph);
          var cx = 2 + ct, cy = st;
          var x = cx * (cB * cp + sA * sB * sp) - cy * cA * sB;
          var y = cx * (sB * cp - sA * cB * sp) + cy * cA * cB;
          var ooz = 1 / (K2 + cA * cx * sp + cy * sA);
          var xp = Math.floor(cols / 2 + K1 * ooz * x);
          var yp = Math.floor(rows / 2 - K1 * aspect * ooz * y);
          if (xp < 0 || xp >= cols || yp < 0 || yp >= rows) continue;
          var L = cp * ct * sB - cA * ct * sp - sA * st + cB * (cA * st - ct * sA * sp);
          var k = yp * cols + xp;
          if (ooz > z[k]) { z[k] = ooz; buf[k] = Math.max(0, L / 1.4143); }
        }
      }
    } else if (shape === 'sphere') {
      var lx = Math.cos(t), ly = -0.5, lz = Math.sin(t) * 0.8 + 0.4;
      var ll = Math.hypot(lx, ly, lz);
      var r = Math.min(cols * 0.45, rows / aspect * 0.45);
      for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
        var u = (i - cols / 2 + 0.5) / r, v = (j - rows / 2 + 0.5) / (r * aspect);
        var d = u * u + v * v;
        if (d > 1) continue;
        var n = Math.sqrt(1 - d);
        buf[j * cols + i] = Math.max(0, (u * lx + v * ly + n * lz) / ll);
      }
    } else {
      for (var jj = 0; jj < rows; jj++) for (var ii = 0; ii < cols; ii++) {
        var dx = (ii - cols / 2) / cols * 10, dy = (jj - rows / 2) / rows * 6;
        var h = Math.sin(Math.hypot(dx, dy) * 2.2 - t * 2.5) * 0.5 + Math.sin(dx * 0.9 + t) * 0.25;
        buf[jj * cols + ii] = Math.min(1, Math.max(0, h * 0.5 + 0.5));
      }
    }
    return buf;
  }
  function toText(buf, cols, rows, ramp) {
    var last = ramp.length - 1;
    var out = '';
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var b = buf[j * cols + i];
        out += b < 0 ? ' ' : ramp[Math.min(last, Math.floor(b * last + 0.5))];
      }
      out += '\n';
    }
    return out;
  }

  var shadeState = { shape: 'donut', ramp: 'short', cols: 64 };
  function pressGroup(attr, value) {
    document.querySelectorAll('[' + attr + ']').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute(attr) === value));
    });
  }
  document.querySelectorAll('[data-shape]').forEach(function (b) {
    b.addEventListener('click', function () { shadeState.shape = b.dataset.shape; pressGroup('data-shape', b.dataset.shape); });
  });
  document.querySelectorAll('[data-ramp]').forEach(function (b) {
    b.addEventListener('click', function () { shadeState.ramp = b.dataset.ramp; pressGroup('data-ramp', b.dataset.ramp); showRamp(); });
  });
  function showRamp() { $('as-ramp-show').textContent = '"' + RAMPS[shadeState.ramp] + '"'; }
  showRamp();
  $('as-cols').addEventListener('input', function () {
    shadeState.cols = +this.value;
    $('as-cols-val').textContent = this.value;
  });

  // Only animate what's on screen, and nothing while the tab is hidden.
  var visible = new Set();
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) visible.add(e.target.id); else visible.delete(e.target.id); });
  });
  io.observe($('as-hero'));
  io.observe($('as-shade'));
  var aspects = {};
  function aspectOf(id) {
    if (aspects[id]) return aspects[id];
    var el = $(id), probe = document.createElement('span');
    probe.textContent = 'MMMMMMMMMM';
    el.textContent = '';
    el.appendChild(probe);
    var w = probe.getBoundingClientRect().width / 10;
    var lh = parseFloat(getComputedStyle(el).lineHeight);
    el.removeChild(probe);
    if (!w || !lh) return 0.55;
    return (aspects[id] = w / lh);
  }
  var last = 0;
  function frame(now, force) {
    if (!force) requestAnimationFrame(frame);
    if (!force && (document.hidden || now - last < 40)) return;
    last = now;
    var t = now / 1000;
    if (force || visible.has('as-hero')) {
      var hero = $('as-hero'), ha = aspectOf('as-hero');
      var hc = Math.max(20, Math.min(110, Math.floor(hero.clientWidth / (ha * 7))));
      hero.textContent = toText(shade('donut', hc, 26, t, ha), hc, 26, RAMPS.city);
    }
    if (force || visible.has('as-shade')) {
      var sh = $('as-shade');
      var fit = Math.floor((sh.clientWidth - 24) / (aspectOf('as-shade') * 11)); // 11px line height
      var c = Math.max(16, Math.min(shadeState.cols, fit || shadeState.cols)), r = Math.round(c * 0.42);
      $('as-shade').textContent = toText(shade(shadeState.shape, c, r, t, aspectOf('as-shade')), c, r, RAMPS[shadeState.ramp]);
    }
  }
  frame(1200, true); // a still frame first, so the art is there even before animation starts
  requestAnimationFrame(frame);

  /* ── Part 4: a tiny Rogue ── */
  var W = 60, H = 21, CW = 20, CH = 7;
  var ROCK = 0, WALL = 1, FLOOR = 2, TUNNEL = 3, DOOR = 4, STAIRS = 5;
  var MONSTERS = [
    { ch: 'B', name: 'bat', hp: 3, dmg: 2 },
    { ch: 'K', name: 'kobold', hp: 4, dmg: 3 },
    { ch: 'S', name: 'snake', hp: 5, dmg: 3 },
    { ch: 'Z', name: 'zombie', hp: 8, dmg: 4 }
  ];
  var G = null;
  var view = 'ascii';

  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function idx(x, y) { return y * W + x; }

  function newLevel(depth, keep) {
    var map = new Uint8Array(W * H);
    var rooms = [];
    for (var cy = 0; cy < 3; cy++) for (var cx = 0; cx < 3; cx++) {
      var w = rnd(5, CW - 4), h = rnd(2, CH - 3);
      var x0 = cx * CW + rnd(1, CW - w - 2), y0 = cy * CH + rnd(0, CH - h - 3);
      var room = { x0: x0, y0: y0, x1: x0 + w + 1, y1: y0 + h + 1 };
      for (var y = room.y0; y <= room.y1; y++) for (var x = room.x0; x <= room.x1; x++) {
        map[idx(x, y)] = (x === room.x0 || x === room.x1 || y === room.y0 || y === room.y1) ? WALL : FLOOR;
      }
      rooms.push(room);
    }
    function carve(x, y) {
      var t = map[idx(x, y)];
      if (t === ROCK) map[idx(x, y)] = TUNNEL;
      else if (t === WALL) map[idx(x, y)] = DOOR;
    }
    function inner(r, axis) { return axis === 'y' ? rnd(r.y0 + 1, r.y1 - 1) : rnd(r.x0 + 1, r.x1 - 1); }
    // Rogue's tunnels: leave one room, turn once in the gap between rooms, enter the next.
    function joinH(a, b) {
      var ya = inner(a, 'y'), yb = inner(b, 'y'), mid = rnd(a.x1 + 1, b.x0 - 1), x, y;
      for (x = a.x1; x <= mid; x++) carve(x, ya);
      for (y = Math.min(ya, yb); y <= Math.max(ya, yb); y++) carve(mid, y);
      for (x = mid; x <= b.x0; x++) carve(x, yb);
    }
    function joinV(a, b) {
      var xa = inner(a, 'x'), xb = inner(b, 'x'), mid = rnd(a.y1 + 1, b.y0 - 1), x, y;
      for (y = a.y1; y <= mid; y++) carve(xa, y);
      for (x = Math.min(xa, xb); x <= Math.max(xa, xb); x++) carve(x, mid);
      for (y = mid; y <= b.y0; y++) carve(xb, y);
    }
    for (var r = 0; r < 3; r++) {
      joinH(rooms[r * 3], rooms[r * 3 + 1]);
      joinH(rooms[r * 3 + 1], rooms[r * 3 + 2]);
    }
    for (var row = 0; row < 2; row++) {
      var must = rnd(0, 2);
      for (var col = 0; col < 3; col++) {
        if (col === must || Math.random() < 0.35) joinV(rooms[row * 3 + col], rooms[(row + 1) * 3 + col]);
      }
    }
    function spot(room) {
      for (var tries = 0; tries < 50; tries++) {
        var p = { x: rnd(room.x0 + 1, room.x1 - 1), y: rnd(room.y0 + 1, room.y1 - 1) };
        if (map[idx(p.x, p.y)] === FLOOR && !occupied(p.x, p.y)) return p;
      }
      return null;
    }
    var order = rooms.map(function (_, i) { return i; }).sort(function () { return Math.random() - 0.5; });
    G = {
      map: map, rooms: rooms, depth: depth, seen: new Uint8Array(W * H), vis: new Uint8Array(W * H),
      mons: [], gold: [], hp: keep ? keep.hp : 12, maxHp: 12, purse: keep ? keep.purse : 0, dead: false, turn: keep ? keep.turn : 0
    };
    G.player = spot(rooms[order[0]]);
    var st = spot(rooms[order[order.length - 1]]);
    map[idx(st.x, st.y)] = STAIRS;
    var nMon = 2 + depth;
    for (var m = 0; m < nMon; m++) {
      var p = spot(rooms[order[1 + (m % (order.length - 1))]]);
      if (!p) continue;
      var kind = MONSTERS[Math.min(MONSTERS.length - 1, rnd(0, Math.min(3, depth)))];
      G.mons.push({ x: p.x, y: p.y, ch: kind.ch, name: kind.name, hp: kind.hp, dmg: kind.dmg });
    }
    for (var g = 0; g < 4; g++) {
      var q = spot(rooms[order[rnd(0, 8)]]);
      if (q) G.gold.push(q);
    }
    log(depth === 1 ? 'You enter the Dungeons of Doom. Find the > to go deeper.' : 'You climb down to depth ' + depth + '.');
    see();
    draw();
  }
  function occupied(x, y) {
    if (!G) return false;
    if (G.player && G.player.x === x && G.player.y === y) return true;
    return G.mons.some(function (m) { return m.x === x && m.y === y; });
  }
  function walkable(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    var t = G.map[idx(x, y)];
    return t === FLOOR || t === TUNNEL || t === DOOR || t === STAIRS;
  }
  function roomAt(x, y) {
    for (var i = 0; i < G.rooms.length; i++) {
      var r = G.rooms[i];
      if (x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1) return r;
    }
    return null;
  }
  // Rogue's lighting: a lit room is fully visible while you stand in it; in a tunnel you see one step around you.
  function see() {
    G.vis.fill(0);
    var p = G.player, r = roomAt(p.x, p.y), x, y;
    if (r) for (y = r.y0; y <= r.y1; y++) for (x = r.x0; x <= r.x1; x++) G.vis[idx(x, y)] = 1;
    for (y = p.y - 1; y <= p.y + 1; y++) for (x = p.x - 1; x <= p.x + 1; x++) {
      if (x >= 0 && y >= 0 && x < W && y < H) G.vis[idx(x, y)] = 1;
    }
    for (var i = 0; i < G.vis.length; i++) if (G.vis[i]) G.seen[i] = 1;
  }
  function log(msg) { $('as-rogue-log').textContent = msg; }

  function move(dx, dy) {
    if (!G || G.dead) return;
    var nx = G.player.x + dx, ny = G.player.y + dy;
    var foe = G.mons.find(function (m) { return m.x === nx && m.y === ny; });
    var msg = '';
    if (foe) {
      if (Math.random() < 0.8) {
        var hit = rnd(1, 4) + 1;
        foe.hp -= hit;
        msg = foe.hp <= 0 ? 'You defeat the ' + foe.name + '!' : 'You hit the ' + foe.name + '.';
        if (foe.hp <= 0) G.mons.splice(G.mons.indexOf(foe), 1);
      } else msg = 'You miss the ' + foe.name + '.';
    } else if (walkable(nx, ny)) {
      G.player.x = nx; G.player.y = ny;
      var gi = G.gold.findIndex(function (g) { return g.x === nx && g.y === ny; });
      if (gi >= 0) { var amt = rnd(5, 20) * G.depth; G.purse += amt; G.gold.splice(gi, 1); msg = 'You find ' + amt + ' gold.'; }
      if (G.map[idx(nx, ny)] === STAIRS) {
        G.turn++;
        newLevel(G.depth + 1, G);
        return;
      }
    } else return; // bumping a wall costs no turn
    G.turn++;
    see();
    // Monsters take their turn only after you take yours.
    G.mons.forEach(function (m) {
      var ddx = G.player.x - m.x, ddy = G.player.y - m.y;
      if (Math.abs(ddx) <= 1 && Math.abs(ddy) <= 1) {
        if (Math.random() < 0.6) { var d = rnd(1, m.dmg); G.hp -= d; msg += ' The ' + m.name + ' hits you for ' + d + '.'; }
        else msg += ' The ' + m.name + ' misses.';
        return;
      }
      if (!G.vis[idx(m.x, m.y)] && Math.abs(ddx) + Math.abs(ddy) > 6) return; // asleep
      var steps = [[Math.sign(ddx), Math.sign(ddy)], [Math.sign(ddx), 0], [0, Math.sign(ddy)]];
      for (var s = 0; s < steps.length; s++) {
        var tx = m.x + steps[s][0], ty = m.y + steps[s][1];
        if ((steps[s][0] || steps[s][1]) && walkable(tx, ty) && !occupied(tx, ty)) { m.x = tx; m.y = ty; break; }
      }
    });
    if (G.hp <= 0) {
      G.hp = 0; G.dead = true;
      msg += ' You die on depth ' + G.depth + ' with ' + G.purse + ' gold. Permadeath: press New dungeon to start over.';
    }
    log(msg.trim());
    draw();
  }

  var GLYPH = [' ', '#', '.', '#', '+', '>'];
  var TILE_COLORS = ['#07110a', '#6e6a60', '#2c3a30', '#4a3f2e', '#b8793a', '#64d2ff'];
  function wallGlyph(x, y) {
    var r = G.rooms.find(function (q) { return x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1; });
    if (!r) return '#';
    return (y === r.y0 || y === r.y1) ? '-' : '|';
  }
  function thingAt(x, y) {
    if (G.player.x === x && G.player.y === y) return { ch: '@', cls: 'p', num: 9, color: '#ffffff' };
    if (!G.vis[idx(x, y)]) return null;
    var m = G.mons.find(function (q) { return q.x === x && q.y === y; });
    if (m) return { ch: m.ch, cls: 'm', num: 7, color: '#ff6b6b' };
    if (G.gold.some(function (g) { return g.x === x && g.y === y; })) return { ch: '*', cls: 'g', num: 6, color: '#ffd60a' };
    return null;
  }
  function draw() {
    $('as-rogue-status').textContent = 'Depth: ' + G.depth + '   HP: ' + G.hp + '/' + G.maxHp + '   Gold: ' + G.purse + '   Turns: ' + G.turn;
    var pre = $('as-rogue'), cvs = $('as-rogue-tiles');
    pre.hidden = view === 'tiles';
    cvs.hidden = view !== 'tiles';
    if (view === 'tiles') {
      var S = 11;
      cvs.width = W * S; cvs.height = H * S;
      var ctx = cvs.getContext('2d');
      ctx.fillStyle = TILE_COLORS[0];
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var k = idx(x, y);
        if (!G.seen[k]) continue;
        ctx.globalAlpha = G.vis[k] ? 1 : 0.4;
        ctx.fillStyle = TILE_COLORS[G.map[k]];
        ctx.fillRect(x * S, y * S, S - 1, S - 1);
        var th = thingAt(x, y);
        if (th) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = th.color;
          ctx.beginPath();
          ctx.arc(x * S + S / 2 - 0.5, y * S + S / 2 - 0.5, S * 0.38, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      return;
    }
    var html = '';
    for (var yy = 0; yy < H; yy++) {
      for (var xx = 0; xx < W; xx++) {
        var kk = idx(xx, yy), t = G.map[kk], thing = thingAt(xx, yy);
        if (!G.seen[kk] && !thing) { html += view === 'numbers' ? '<span class="s">0</span>' : ' '; continue; }
        var ch, cls = G.vis[kk] ? '' : 's';
        if (view === 'numbers') ch = thing ? String(thing.num) : String(t);
        else ch = thing ? thing.ch : (t === WALL ? wallGlyph(xx, yy) : GLYPH[t]);
        if (thing) cls = thing.cls;
        else if (t === STAIRS && G.vis[kk]) cls = 'x';
        html += cls ? '<span class="' + cls + '">' + ch + '</span>' : ch;
      }
      html += '\n';
    }
    pre.innerHTML = html;
  }

  var KEYS = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
    k: [0, -1], j: [0, 1], h: [-1, 0], l: [1, 0],
    y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1]
  };
  document.querySelector('.as-rogue-wrap').addEventListener('keydown', function (e) {
    var d = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!d) return;
    e.preventDefault();
    move(d[0], d[1]);
  });
  document.querySelectorAll('[data-move]').forEach(function (b) {
    b.addEventListener('click', function () {
      var d = b.dataset.move.split(',');
      move(+d[0], +d[1]);
    });
  });
  document.querySelectorAll('[data-view]').forEach(function (b) {
    b.addEventListener('click', function () {
      view = b.dataset.view;
      pressGroup('data-view', view);
      draw();
      (view === 'tiles' ? $('as-rogue-tiles') : $('as-rogue')).focus({ preventScroll: true });
    });
  });
  $('as-rogue-new').addEventListener('click', function () { newLevel(1); $('as-rogue').focus({ preventScroll: true }); });
  newLevel(1);

  /* ── Practice ── */
  var solved = new Set();
  document.querySelectorAll('.as-problem').forEach(function (prob, i) {
    var input = prob.querySelector('.as-ans');
    var fb = prob.querySelector('.as-feedback');
    function check() {
      var val = input.value.trim().toLowerCase();
      var ok = prob.dataset.answer.split('|').some(function (a) { return a.toLowerCase() === val; });
      fb.textContent = ok ? 'Correct!' : 'Not quite.';
      fb.className = 'as-feedback ' + (ok ? 'ok' : 'err');
      prob.querySelector('.as-hint').classList.toggle('show', !ok);
      if (ok) solved.add(i);
      $('as-score').textContent = solved.size + ' of ' + document.querySelectorAll('.as-problem').length + ' solved';
    }
    prob.querySelector('.as-check').addEventListener('click', check);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
  });
})();
