/* pixel-courier-kit.js — shared art store + game engine for the 2D Game Developer Pathway.
 *
 * Every lesson in lessons/2d-game-dev/ reads and writes the SAME art object, so the
 * sprite a student draws in lesson 01 is the player they tune in lesson 05 and the
 * hero of the game they ship in lesson 10.
 *
 *   PixelCourier.store   load / save / reset / export the student's art (localStorage)
 *   PixelCourier.art     palette, frame strings, sprite + tile canvases
 *   PixelCourier.createGame(canvas, options)   the playable engine every lab configures
 *
 * Art format (also what "Download art.js" exports for the starter pack):
 *   palette  16 hex colours; index 0 is transparent
 *   frames   strings of width*height hex digits ("0"–"f"), one digit per pixel, row by row
 *   level    array of strings, one character per tile (see TILE_KEYS)
 */
(function (global) {
  'use strict';

  var STORE_KEY = 'classroomos-pixel-courier-art';
  var TILE = 16;
  var VIEW_W = 320;
  var VIEW_H = 180;

  var DEFAULT_PALETTE = [
    'transparent', '#1a1c2c', '#f4f4f4', '#ffcd75', '#c28569', '#e4572e', '#a53030', '#ffc93c',
    '#b86f50', '#5d3a29', '#38b764', '#257179', '#73eff7', '#3b5dc9', '#94b0c2', '#566c86'
  ];
  var PALETTE_NAMES = [
    'Transparent', 'Ink outline', 'Paper white', 'Skin light', 'Skin shadow', 'Courier red', 'Deep red', 'Tape yellow',
    'Parcel brown', 'Dark brown', 'Grass green', 'Deep teal', 'Sky cyan', 'Denim blue', 'Stone light', 'Stone dark'
  ];

  /* ── Default art ─────────────────────────────────────────────────────────
     Drawn as 16-character rows: "." is transparent, any hex digit is a palette index. */
  function rows(list) { return list.join('').replace(/\./g, '0'); }

  var TORSO = [
    '................',
    '.....111111.....',
    '....15555551....',
    '....155555561...',
    '....1111111111..',
    '....13333331....',
    '....13331331....',
    '....13333341....',
    '.....111111.....',
    '....15775551....',
    '...1557755551...',
    '...13557755531..'
  ];
  var BLINK = TORSO.slice(); BLINK[6] = '....13333331....';
  var LEGS = {
    stand: ['....1dddddd1....', '....1dd11dd1....', '....1dd11dd1....', '....19911991....'],
    stride: ['....1dddddd1....', '...1dd1..1dd1...', '..1dd1....1dd1..', '..1991.....1991.'],
    pass: ['....1dddddd1....', '....1dd1dd1.....', '.....1dddd1.....', '.....199991.....'],
    tuck: ['....1dddddd1....', '...1dd1111dd1...', '...1991..1991...', '................'],
    dangle: ['....1dddddd1....', '....1dd11dd1....', '....1dd11dd1....', '...199..199.....'],
    crouch: ['...1dddddddd1...', '..1dd1....1dd1..', '..1991....1991..', '................']
  };
  function bob(torso) { return torso.slice(1).concat(['................']).slice(0, 12); }
  function courierFrame(torso, legs) { return rows(torso.concat(legs)); }

  var PARCEL = [
    '................', '................', '................', '................',
    '...1111111111...', '..188887788881..', '..188887788881..', '..199997799991..',
    '..177777777771..', '..199997799991..', '..188887788881..', '..188887788881..',
    '..188887788881..', '...1111111111...', '................', '................'
  ];
  var PARCEL_UP = PARCEL.slice(1).concat(['................']);
  var MAILBOX = [
    '................', '....11111111....', '...1dddddddd1...', '..1dddddddddd1..',
    '..1d2222222dd1..', '..1dddddddddd1..', '..1dddddddddd15.', '..1dddddddddd15.',
    '..111111111111..', '.......99.......', '.......99.......', '.......99.......',
    '.......99.......', '.......99.......', '......9999......', '.....999999.....'
  ];
  var FLAG = [
    '................', '...1............', '...1555.........', '...155555.......',
    '...1555555......', '...155555.......', '...1555.........', '...1............',
    '...1............', '...1............', '...1............', '...1............',
    '...1............', '...1............', '..111...........', '.11111..........'
  ];
  var FLAG_ON = FLAG.map(function (r) { return r.replace(/5/g, 'a'); });

  // Seeded RNG so default tiles look hand-made but are identical on every machine.
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function tileFrom(fn, seed) {
    var r = rng(seed); var out = '';
    for (var y = 0; y < TILE; y++) for (var x = 0; x < TILE; x++) out += fn(x, y, r);
    return out;
  }
  var DEFAULT_TILES = {
    G: { name: 'Grass ground', solid: true, px: tileFrom(function (x, y, r) {
      if (y < 2) return 'a';
      if (y < 4) return (y === 3 && r() < 0.45) ? '8' : (r() < 0.25 ? 'b' : 'a');
      return r() < 0.12 ? '9' : (r() < 0.06 ? '4' : '8');
    }, 7) },
    D: { name: 'Dirt', solid: true, px: tileFrom(function (x, y, r) { return r() < 0.12 ? '9' : (r() < 0.06 ? '4' : '8'); }, 11) },
    B: { name: 'Brick', solid: true, px: tileFrom(function (x, y) {
      var row = Math.floor(y / 4); var off = row % 2 ? 4 : 0;
      if (y % 4 === 3) return 'f';
      if ((x + off) % 8 === 7) return 'f';
      return (y % 4 === 0) ? '2' : 'e';
    }, 3) },
    C: { name: 'Crate', solid: true, px: tileFrom(function (x, y) {
      if (x === 0 || y === 0 || x === 15 || y === 15) return '1';
      if (x === 1 || y === 1 || x === 14 || y === 14) return '9';
      if (x === y || x === 15 - y || x === y + 1 || x + 1 === 15 - y) return '9';
      return '8';
    }, 5) },
    '=': { name: 'One-way plank', oneWay: true, px: tileFrom(function (x, y) {
      if (y === 0) return '1';
      if (y < 4) return (x % 5 === 4) ? '9' : '8';
      if (y === 4) return '1';
      if (y < 9 && (x === 2 || x === 13)) return '9';
      return '0';
    }, 9) },
    '^': { name: 'Spikes', hazard: true, px: tileFrom(function (x, y) {
      if (y < 8) return '0';
      var local = x % 4; var h = y - 8;
      var half = Math.floor(h / 2);
      if (local >= 2 - half - 1 && local <= 1 + half) return (local === 2 - half - 1 || local === 1 + half) ? '1' : (h < 3 ? '2' : 'e');
      return y === 15 ? '1' : '0';
    }, 13) }
  };
  var TILE_KEYS = ['G', 'D', 'B', 'C', '=', '^'];
  var OBJECT_KEYS = { S: 'Spawn', P: 'Parcel', M: 'Mailbox', F: 'Checkpoint' };

  function defaultLevel() {
    var W = 64, H = 14;
    var g = [];
    for (var y = 0; y < H; y++) { g.push([]); for (var x = 0; x < W; x++) g[y].push('.'); }
    function fill(x0, x1, y0, y1, c) { for (var yy = y0; yy <= y1; yy++) for (var xx = x0; xx <= x1; xx++) g[yy][xx] = c; }
    function ground(x0, x1) { fill(x0, x1, 12, 12, 'G'); fill(x0, x1, 13, 13, 'D'); }
    ground(0, 14); ground(17, 30); ground(33, 50); ground(53, 63);
    g[11][2] = 'S'; g[11][9] = 'P';
    g[11][21] = 'C'; g[11][22] = 'C'; g[10][22] = 'C';
    fill(25, 28, 8, 8, '='); g[7][26] = 'P';
    g[11][29] = '^';
    g[11][35] = 'F'; g[11][36] = 'C';
    fill(38, 39, 9, 11, 'B');
    fill(42, 44, 9, 9, '='); fill(46, 48, 7, 7, '='); g[6][47] = 'P';
    g[11][54] = 'F'; g[11][57] = '^'; g[11][61] = 'M';
    return g.map(function (r) { return r.join(''); });
  }

  function defaultArt() {
    return {
      version: 1,
      palette: DEFAULT_PALETTE.slice(),
      sprites: {
        courier: { w: 16, h: 16, anims: {
          idle: { fps: 2, frames: [courierFrame(TORSO, LEGS.stand), courierFrame(BLINK, LEGS.stand)] },
          run: { fps: 10, frames: [courierFrame(TORSO, LEGS.stride), courierFrame(bob(TORSO), LEGS.pass), courierFrame(TORSO, LEGS.stride), courierFrame(bob(TORSO), LEGS.pass)] },
          jump: { fps: 1, frames: [courierFrame(TORSO, LEGS.tuck)] },
          fall: { fps: 1, frames: [courierFrame(TORSO, LEGS.dangle)] },
          land: { fps: 1, frames: [courierFrame(TORSO, LEGS.crouch)] }
        } },
        parcel: { w: 16, h: 16, anims: { idle: { fps: 3, frames: [rows(PARCEL), rows(PARCEL_UP)] } } },
        mailbox: { w: 16, h: 16, anims: { idle: { fps: 1, frames: [rows(MAILBOX)] } } },
        flag: { w: 16, h: 16, anims: { idle: { fps: 1, frames: [rows(FLAG)] }, on: { fps: 1, frames: [rows(FLAG_ON)] } } }
      },
      tiles: JSON.parse(JSON.stringify(DEFAULT_TILES)),
      level: defaultLevel()
    };
  }

  /* ── Store ───────────────────────────────────────────────────────────── */
  var listeners = [];
  var cache = null;

  function validFrame(s, n) { return typeof s === 'string' && s.length === n && /^[0-9a-f]+$/.test(s); }
  function normalizeArt(raw) {
    var base = defaultArt();
    if (!raw || typeof raw !== 'object') return base;
    if (Array.isArray(raw.palette) && raw.palette.length === 16) base.palette = raw.palette.map(String);
    base.palette[0] = 'transparent';
    if (raw.sprites && typeof raw.sprites === 'object') {
      Object.keys(base.sprites).forEach(function (name) {
        var src = raw.sprites[name]; if (!src || !src.anims) return;
        Object.keys(base.sprites[name].anims).forEach(function (anim) {
          var a = src.anims[anim]; if (!a || !Array.isArray(a.frames)) return;
          var frames = a.frames.filter(function (f) { return validFrame(f, 256); }).slice(0, 8);
          if (frames.length) base.sprites[name].anims[anim] = { fps: Math.max(1, Math.min(24, Number(a.fps) || 1)), frames: frames };
        });
      });
    }
    if (raw.tiles && typeof raw.tiles === 'object') {
      TILE_KEYS.forEach(function (k) { if (raw.tiles[k] && validFrame(raw.tiles[k].px, 256)) base.tiles[k].px = raw.tiles[k].px; });
    }
    if (Array.isArray(raw.level) && raw.level.length >= 6 && raw.level.length <= 40) {
      var width = raw.level[0] && raw.level[0].length;
      if (width >= 16 && width <= 200 && raw.level.every(function (r) { return typeof r === 'string' && r.length === width; })) base.level = raw.level.slice();
    }
    return base;
  }

  var store = {
    load: function () {
      if (cache) return cache;
      var raw = null;
      try { raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { raw = null; }
      cache = normalizeArt(raw);
      return cache;
    },
    save: function (art) {
      cache = normalizeArt(art);
      try { localStorage.setItem(STORE_KEY, JSON.stringify(cache)); } catch (e) { /* storage blocked: keep working in memory */ }
      bakeCache = {};
      listeners.forEach(function (fn) { try { fn(cache); } catch (e) { console.error(e); } });
      return cache;
    },
    update: function (mutator) { var art = JSON.parse(JSON.stringify(store.load())); mutator(art); return store.save(art); },
    reset: function (part) {
      var fresh = defaultArt();
      if (!part) return store.save(fresh);
      return store.update(function (art) {
        if (part === 'courier') art.sprites.courier = fresh.sprites.courier;
        else if (part === 'tiles') art.tiles = fresh.tiles;
        else if (part === 'level') art.level = fresh.level;
        else if (part === 'objects') ['parcel', 'mailbox', 'flag'].forEach(function (k) { art.sprites[k] = fresh.sprites[k]; });
      });
    },
    subscribe: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    defaults: defaultArt,
    importText: function (text) {
      var json = String(text).replace(/^[\s\S]*?=\s*/, '').replace(/;\s*$/, '');
      return store.save(JSON.parse(/^\s*\{/.test(text) ? text : json));
    },
    exportJS: function () {
      return '// Pixel Courier art — made in the ClassroomOS 2D Game Developer Pathway.\n' +
        '// Drop this file next to index.html in the Pixel Courier starter pack.\n' +
        'window.PIXEL_COURIER_ART = ' + JSON.stringify(store.load(), null, 1) + ';\n';
    }
  };
  global.addEventListener('storage', function (e) { if (e.key === STORE_KEY) { cache = null; bakeCache = {}; var art = store.load(); listeners.forEach(function (fn) { fn(art); }); } });

  /* ── Rendering helpers ───────────────────────────────────────────────── */
  var bakeCache = {};
  function bake(frame, palette, w, h) {
    w = w || 16; h = h || 16;
    var key = frame + palette.join('');
    if (bakeCache[key]) return bakeCache[key];
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d'); var img = ctx.createImageData(w, h);
    for (var i = 0; i < w * h; i++) {
      var idx = parseInt(frame[i], 16) || 0; if (!idx) continue;
      var hex = palette[idx] || '#000000';
      img.data[i * 4] = parseInt(hex.slice(1, 3), 16);
      img.data[i * 4 + 1] = parseInt(hex.slice(3, 5), 16);
      img.data[i * 4 + 2] = parseInt(hex.slice(5, 7), 16);
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    bakeCache[key] = c;
    return c;
  }
  function silhouette(frame) { return frame.replace(/[1-9a-f]/g, '1'); }
  function download(name, content, type) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: type || 'text/plain' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  // Packs frames left-to-right into one PNG: the sprite sheet an engine slices with frame rectangles.
  function sheetCanvas(frames, palette, scale) {
    scale = scale || 1;
    var c = document.createElement('canvas'); c.width = frames.length * 16 * scale; c.height = 16 * scale;
    var ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    frames.forEach(function (f, i) { ctx.drawImage(bake(f, palette), i * 16 * scale, 0, 16 * scale, 16 * scale); });
    return c;
  }

  /* ── Parallax backgrounds (procedural so they theme with the palette) ── */
  function makeLayer(kind, palette) {
    var c = document.createElement('canvas'); c.width = 640; c.height = VIEW_H;
    var ctx = c.getContext('2d'); var r = rng(kind === 'far' ? 21 : 42);
    if (kind === 'far') {
      ctx.fillStyle = '#9fd8e6';
      ctx.beginPath(); ctx.moveTo(0, VIEW_H);
      for (var x = 0; x <= 640; x += 32) ctx.lineTo(x, 70 + Math.round(Math.sin(x / 70) * 18 + r() * 14));
      ctx.lineTo(640, VIEW_H); ctx.fill();
    } else {
      ctx.fillStyle = '#4fae8e';
      for (var i = 0; i < 9; i++) {
        var bx = i * 72 + Math.round(r() * 20); var bw = 34 + Math.round(r() * 22); var bh = 40 + Math.round(r() * 50);
        ctx.fillRect(bx, VIEW_H - bh, bw, bh);
        ctx.fillStyle = '#3d8f75';
        for (var wy = VIEW_H - bh + 6; wy < VIEW_H - 8; wy += 10) for (var wx = bx + 5; wx < bx + bw - 6; wx += 9) ctx.fillRect(wx, wy, 3, 4);
        ctx.fillStyle = '#4fae8e';
      }
    }
    return c;
  }

  /* ── Sound: tiny square-wave blips, created on first player input ──── */
  var audio = null;
  function blip(freq, dur, slide, type) {
    try {
      audio = audio || new (global.AudioContext || global.webkitAudioContext)();
      var t = audio.currentTime; var o = audio.createOscillator(); var g = audio.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
      g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + dur);
    } catch (e) { /* audio unavailable */ }
  }

  /* ── Engine ──────────────────────────────────────────────────────────── */
  var DEFAULT_PHYSICS = {
    maxRun: 90, accel: 900, decel: 1100, airAccel: 600, gravity: 900, fallMul: 1.4,
    jumpVel: 280, jumpCut: 0.45, maxFall: 320, coyote: 0.1, buffer: 0.12
  };
  var DEFAULT_OPTIONS = {
    physics: DEFAULT_PHYSICS,
    features: { coyote: true, buffer: true, varJump: true, substeps: true, oneWay: true, axisSeparate: true, landState: true, inputAnim: false },
    camera: { follow: 'deadzone', deadzoneW: 56, deadzoneH: 48, smoothing: 8, lookahead: 24, clamp: true, snap: true },
    parallax: { far: 0.2, near: 0.5, enabled: true },
    juice: { squash: true, particles: true, shake: true, hitstop: true, sound: false },
    debug: { hitbox: false, grid: false, camera: false, state: false, trail: false },
    menus: false,
    fixedStep: true,
    layerOrder: ['sky', 'far', 'near', 'tiles', 'objects', 'player', 'particles', 'hud'],
    hud: true
  };
  function merge(base, extra) {
    var out = {};
    Object.keys(base).forEach(function (k) {
      var v = base[k];
      out[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? merge(v, (extra && extra[k]) || {}) : (extra && k in extra ? extra[k] : (Array.isArray(v) ? v.slice() : v));
    });
    if (extra) Object.keys(extra).forEach(function (k) { if (!(k in out)) out[k] = extra[k]; });
    return out;
  }
  function approach(v, target, step) { return v < target ? Math.min(v + step, target) : Math.max(v - step, target); }

  function createGame(canvas, userOptions) {
    var opts = merge(DEFAULT_OPTIONS, userOptions || {});
    var hooks = (userOptions && userOptions.hooks) || {};
    var ctx = canvas.getContext('2d');
    canvas.width = VIEW_W; canvas.height = VIEW_H;
    ctx.imageSmoothingEnabled = false;

    var art, palette, map, W, H, objects, layers;
    var keys = {}; var pressed = {};
    var p, cam, particles, shake, hitstop, time, mode, best, trail, collected, totalParcels, checkpoint, deaths;

    function loadArt(a) {
      art = a; palette = art.palette;
      layers = { far: makeLayer('far', palette), near: makeLayer('near', palette) };
    }
    function parseLevel() {
      var src = (opts.level || art.level);
      H = src.length; W = src[0].length;
      map = []; objects = []; var spawn = { x: 2, y: H - 3 };
      for (var y = 0; y < H; y++) {
        map.push([]);
        for (var x = 0; x < W; x++) {
          var c = src[y][x];
          if (art.tiles[c]) map[y].push(c);
          else {
            map[y].push('.');
            if (c === 'S') spawn = { x: x, y: y };
            else if (c === 'P') objects.push({ type: 'parcel', x: x * TILE, y: y * TILE, taken: false });
            else if (c === 'M') objects.push({ type: 'mailbox', x: x * TILE, y: y * TILE });
            else if (c === 'F') objects.push({ type: 'flag', x: x * TILE, y: y * TILE, on: false });
          }
        }
      }
      totalParcels = objects.filter(function (o) { return o.type === 'parcel'; }).length;
      return spawn;
    }
    function reset() {
      var spawn = parseLevel();
      checkpoint = { x: spawn.x * TILE + 3, y: spawn.y * TILE + 2 };
      p = { x: checkpoint.x, y: checkpoint.y, w: 10, h: 14, vx: 0, vy: 0, grounded: false, coyote: 0, buffer: 0, facing: 1,
        state: 'idle', stateTime: 0, animTime: 0, sx: 1, sy: 1, cut: false, landTimer: 0, prevVy: 0 };
      cam = { x: Math.max(0, p.x - VIEW_W / 2), y: Math.max(0, H * TILE - VIEW_H), look: 0 };
      particles = []; shake = 0; hitstop = 0; time = 0; collected = 0; deaths = 0; trail = [];
      mode = opts.menus ? 'title' : 'play';
      emit('reset', {});
    }
    function emit(type, data) { if (hooks.onEvent) hooks.onEvent(type, data || {}); }

    function tileAt(tx, ty) {
      if (tx < 0 || tx >= W) return 'B';          // level edges behave like walls
      if (ty < 0 || ty >= H) return '.';
      return map[ty][tx];
    }
    function isSolid(c) { return c !== '.' && art.tiles[c] && art.tiles[c].solid; }

    function setState(next, reason) {
      if (p.state === next) return;
      var prev = p.state; p.state = next; p.stateTime = 0; p.animTime = 0;
      if (hooks.onState) hooks.onState(prev, next, reason);
    }
    function puff(x, y, n, color, spread) {
      if (!opts.juice.particles) return;
      for (var i = 0; i < n; i++) particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * (spread || 60), vy: -Math.random() * 40, life: 0.3 + Math.random() * 0.25, color: color || '#e9dcc3', size: Math.random() < 0.5 ? 1 : 2 });
    }
    function die() {
      deaths++;
      if (opts.juice.shake) shake = 0.45;
      if (opts.juice.sound) blip(220, 0.25, -160, 'sawtooth');
      puff(p.x + p.w / 2, p.y + p.h / 2, 14, palette[5], 140);
      p.x = checkpoint.x; p.y = checkpoint.y; p.vx = 0; p.vy = 0;
      emit('die', { deaths: deaths });
    }

    function moveX(dx) {
      p.x += dx;
      var top = Math.floor(p.y / TILE), bottom = Math.floor((p.y + p.h - 0.01) / TILE);
      var tx = dx > 0 ? Math.floor((p.x + p.w - 0.01) / TILE) : Math.floor(p.x / TILE);
      for (var ty = top; ty <= bottom; ty++) {
        if (isSolid(tileAt(tx, ty))) {
          p.x = dx > 0 ? tx * TILE - p.w : (tx + 1) * TILE;
          emit('collide', { axis: 'x', tx: tx, ty: ty });
          p.vx = 0; return true;
        }
      }
      return false;
    }
    function moveY(dy) {
      var prevBottom = p.y + p.h;
      p.y += dy;
      var left = Math.floor(p.x / TILE), right = Math.floor((p.x + p.w - 0.01) / TILE);
      var ty = dy > 0 ? Math.floor((p.y + p.h - 0.01) / TILE) : Math.floor(p.y / TILE);
      for (var tx = left; tx <= right; tx++) {
        var c = tileAt(tx, ty);
        var oneWay = opts.features.oneWay && c !== '.' && art.tiles[c] && art.tiles[c].oneWay;
        if (isSolid(c) || (oneWay && dy > 0 && prevBottom <= ty * TILE + 0.01 && !(keys.down && keys.jumpHeld))) {
          if (dy > 0) { p.y = ty * TILE - p.h; p.grounded = true; } else p.y = (ty + 1) * TILE;
          emit('collide', { axis: 'y', tx: tx, ty: ty });
          p.vy = 0; return true;
        }
      }
      return false;
    }
    // Resolving both axes at once (the classic beginner bug) — kept so the collision lab can show it snagging.
    function moveBoth(dx, dy) {
      p.x += dx; p.y += dy;
      var left = Math.floor(p.x / TILE), right = Math.floor((p.x + p.w - 0.01) / TILE);
      var top = Math.floor(p.y / TILE), bottom = Math.floor((p.y + p.h - 0.01) / TILE);
      // measure every overlap first, then push out along each one's smaller side —
      // wrong at tile seams and corners, which is the point
      var hits = [];
      for (var ty = top; ty <= bottom; ty++) for (var tx = left; tx <= right; tx++) {
        if (!isSolid(tileAt(tx, ty))) continue;
        hits.push({ tx: tx, ty: ty, ox: dx > 0 ? p.x + p.w - tx * TILE : (tx + 1) * TILE - p.x, oy: dy > 0 ? p.y + p.h - ty * TILE : (ty + 1) * TILE - p.y });
      }
      var pushedX = false, pushedY = false;
      hits.forEach(function (h) {
        if (h.ox < h.oy && dx !== 0) { if (!pushedX) { p.x += dx > 0 ? -h.ox : h.ox; p.vx = 0; pushedX = true; } }
        else if (!pushedY) { p.y += dy > 0 ? -h.oy : h.oy; if (dy > 0) p.grounded = true; p.vy = 0; pushedY = true; }
        emit('collide', { axis: 'both', tx: h.tx, ty: h.ty });
      });
    }

    function overlaps(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }

    function step(dt) {
      if (mode !== 'play') {
        if (pressed.jump || pressed.start) { if (mode === 'win') reset(); mode = 'play'; emit('mode', { mode: 'play' }); }
        pressed = {}; return;
      }
      if (pressed.pause && opts.menus) { mode = 'paused'; emit('mode', { mode: 'paused' }); pressed = {}; return; }
      if (hitstop > 0) { hitstop -= dt; pressed = {}; return; }
      time += dt;
      var P = opts.physics, F = opts.features;
      var dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      if (dir) p.facing = dir;
      var a = dir ? (p.grounded ? P.accel : P.airAccel) : (p.grounded ? P.decel : P.airAccel * 0.5);
      if (dir && p.grounded && Math.sign(p.vx) === -dir && Math.abs(p.vx) > 40) puff(p.x + p.w / 2, p.y + p.h, 1);
      p.vx = approach(p.vx, dir * P.maxRun, a * dt);

      if (p.grounded) p.coyote = F.coyote ? P.coyote : 0; else p.coyote -= dt;
      if (pressed.jump) p.buffer = F.buffer ? P.buffer : 0.0001; else p.buffer -= dt;
      var canJump = p.grounded || (F.coyote && p.coyote > 0);
      if (p.buffer > 0 && canJump) {
        var coyoteJump = !p.grounded;
        p.vy = -P.jumpVel; p.buffer = 0; p.coyote = 0; p.grounded = false; p.cut = false;
        if (opts.juice.squash) { p.sx = 0.75; p.sy = 1.3; }
        if (opts.juice.sound) blip(520, 0.12, 300);
        puff(p.x + p.w / 2, p.y + p.h, 5);
        emit('jump', { coyote: coyoteJump });
      }
      if (F.varJump && !keys.jumpHeld && p.vy < 0 && !p.cut) { p.vy *= P.jumpCut; p.cut = true; }
      p.vy = Math.min(p.vy + P.gravity * (p.vy > 0 ? P.fallMul : 1) * dt, P.maxFall);

      var wasGrounded = p.grounded; p.wasGrounded = wasGrounded; p.prevVy = p.vy;
      p.grounded = false;
      var dx = p.vx * dt, dy = p.vy * dt;
      var steps = F.substeps ? Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4)) : 1;
      for (var s = 0; s < steps; s++) {
        if (F.axisSeparate) { moveX(dx / steps); moveY(dy / steps); }
        else moveBoth(dx / steps, dy / steps);
      }
      if (!p.grounded && wasGrounded && p.vy >= 0) {
        // still standing? probe one pixel down so walking off a ledge is detected
        var left = Math.floor(p.x / TILE), right = Math.floor((p.x + p.w - 0.01) / TILE), below = Math.floor((p.y + p.h + 1) / TILE);
        for (var tx = left; tx <= right; tx++) { var c = tileAt(tx, below); if (isSolid(c) || (art.tiles[c] && art.tiles[c].oneWay && Math.abs(p.y + p.h - below * TILE) < 0.5)) p.grounded = true; }
      }
      if (p.grounded && !wasGrounded) {
        var impact = p.prevVy;
        if (opts.juice.squash) { p.sx = 1.3; p.sy = 0.72; }
        puff(p.x + p.w / 2, p.y + p.h, impact > 200 ? 8 : 4);
        if (opts.juice.sound) blip(140, 0.06, -40);
        emit('land', { impact: impact });
        if (impact > 220) p.landTimer = 0.12;
      }
      p.sx += (1 - p.sx) * Math.min(1, dt * 14); p.sy += (1 - p.sy) * Math.min(1, dt * 14);

      // Animation state machine: physics decides, animation only reports.
      p.landTimer -= dt;
      if (!F.landState) p.landTimer = 0;
      if (F.inputAnim) {
        // The beginner bug: animation follows the keys instead of what the body is actually doing.
        if (keys.jumpHeld) setState('jump', 'jump key held');
        else if (keys.left || keys.right) setState('run', 'arrow key held');
        else setState('idle', 'no keys held');
      } else if (!p.grounded) setState(p.vy < 0 ? 'jump' : 'fall', p.vy < 0 ? 'velocity.y < 0 (rising)' : 'velocity.y ≥ 0 (falling)');
      else if (p.landTimer > 0) setState('land', 'hard landing timer');
      else if (Math.abs(p.vx) > 8) setState('run', '|velocity.x| > 8 on floor');
      else setState('idle', 'on floor, not moving');
      p.stateTime += dt; p.animTime += dt;

      // Hazards, pickups, goals
      var hx = p.x + 2, hy = p.y + 2, hw = p.w - 4, hh = p.h - 2;
      var ty0 = Math.floor(hy / TILE), ty1 = Math.floor((hy + hh) / TILE), tx0 = Math.floor(hx / TILE), tx1 = Math.floor((hx + hw) / TILE);
      for (var yy = ty0; yy <= ty1; yy++) for (var xx = tx0; xx <= tx1; xx++) {
        var t = tileAt(xx, yy);
        if (t !== '.' && art.tiles[t] && art.tiles[t].hazard && overlaps(hx, hy, hw, hh, xx * TILE + 2, yy * TILE + 9, 12, 7)) { die(); return finishStep(); }
      }
      if (p.y > H * TILE + 32) { die(); return finishStep(); }
      objects.forEach(function (o) {
        if (o.type === 'parcel' && !o.taken && overlaps(p.x, p.y, p.w, p.h, o.x + 2, o.y + 4, 12, 10)) {
          o.taken = true; collected++;
          if (opts.juice.hitstop) hitstop = 0.07;
          if (opts.juice.sound) { blip(660, 0.08, 0); setTimeout(function () { blip(990, 0.12, 0); }, 70); }
          puff(o.x + 8, o.y + 8, 12, palette[7], 120);
          emit('parcel', { collected: collected, total: totalParcels });
        }
        if (o.type === 'flag' && !o.on && overlaps(p.x, p.y, p.w, p.h, o.x, o.y, 16, 16)) {
          o.on = true; checkpoint = { x: o.x + 3, y: o.y + 2 };
          if (opts.juice.sound) blip(440, 0.15, 220, 'triangle');
          emit('checkpoint', {});
        }
        if (o.type === 'mailbox' && overlaps(p.x, p.y, p.w, p.h, o.x, o.y, 16, 16) && collected === totalParcels && mode === 'play') {
          mode = 'win';
          if (opts.juice.sound) [523, 659, 784].forEach(function (f, i) { setTimeout(function () { blip(f, 0.16, 0, 'triangle'); }, i * 110); });
          emit('win', { time: time, deaths: deaths });
        }
      });
      return finishStep();
    }
    function finishStep() {
      if (opts.debug.trail) { trail.push({ x: p.x + p.w / 2, y: p.y + p.h }); if (trail.length > 240) trail.shift(); }
      pressed = {};
      updateCamera(1 / 60);
    }

    function updateCamera(dt) {
      var C = opts.camera;
      var targetLook = C.lookahead * p.facing;
      cam.look += (targetLook - cam.look) * Math.min(1, dt * 3);
      var px = p.x + p.w / 2 + (C.follow === 'locked' ? 0 : cam.look), py = p.y + p.h / 2;
      var tx = cam.x, ty = cam.y;
      if (C.follow === 'locked') { tx = px - VIEW_W / 2; ty = py - VIEW_H / 2; }
      else {
        var dzx = (VIEW_W - C.deadzoneW) / 2, dzy = (VIEW_H - C.deadzoneH) / 2;
        if (px < cam.x + dzx) tx = px - dzx; else if (px > cam.x + dzx + C.deadzoneW) tx = px - dzx - C.deadzoneW;
        if (py < cam.y + dzy) ty = py - dzy; else if (py > cam.y + dzy + C.deadzoneH) ty = py - dzy - C.deadzoneH;
      }
      if (C.clamp) { tx = Math.max(0, Math.min(tx, W * TILE - VIEW_W)); ty = Math.max(0, Math.min(ty, H * TILE - VIEW_H)); }
      var k = C.smoothing > 0 ? 1 - Math.exp(-C.smoothing * dt) : 1;
      cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
      particles.forEach(function (q) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 200 * dt; q.life -= dt; });
      particles = particles.filter(function (q) { return q.life > 0; });
      if (shake > 0) shake = Math.max(0, shake - dt);
    }

    /* ── Drawing ── */
    function frameFor(sprite, anim, t) {
      var s = art.sprites[sprite]; var a = s.anims[anim] || s.anims.idle;
      return a.frames[Math.floor(t * a.fps) % a.frames.length];
    }
    function draw() {
      var C = opts.camera;
      var sx = shake > 0 && opts.juice.shake ? (Math.random() - 0.5) * shake * 16 : 0;
      var sy = shake > 0 && opts.juice.shake ? (Math.random() - 0.5) * shake * 16 : 0;
      var cx = cam.x + sx, cy = cam.y + sy;
      if (C.snap) { cx = Math.round(cx); cy = Math.round(cy); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      opts.layerOrder.forEach(function (layer) { drawLayer(layer, cx, cy); });
      if (opts.debug.camera) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.strokeStyle = '#ff3d7f'; ctx.lineWidth = 1; ctx.setLineDash([3, 2]);
        if (C.follow !== 'locked') ctx.strokeRect((VIEW_W - C.deadzoneW) / 2 + 0.5, (VIEW_H - C.deadzoneH) / 2 + 0.5, C.deadzoneW, C.deadzoneH);
        ctx.setLineDash([]);
        ctx.fillStyle = '#ff3d7f'; ctx.font = '8px monospace';
        ctx.fillText('camera x ' + cam.x.toFixed(2), 4, VIEW_H - 14); ctx.fillText('drawn  x ' + cx.toFixed(2), 4, VIEW_H - 5);
      }
      if (mode !== 'play') drawOverlay();
    }
    function drawLayer(layer, cx, cy) {
      var level = W * TILE;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (layer === 'sky') {
        var g = ctx.createLinearGradient(0, 0, 0, VIEW_H); g.addColorStop(0, '#d8f3f9'); g.addColorStop(1, '#fff4d8');
        ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H); return;
      }
      if (layer === 'far' || layer === 'near') {
        if (!opts.parallax.enabled) return;
        var f = opts.parallax[layer]; var img = layers[layer];
        var off = -((cx * f) % img.width); if (off > 0) off -= img.width;
        var oy = Math.round(-(cy - (H * TILE - VIEW_H)) * f);
        if (opts.camera.snap) off = Math.round(off);
        ctx.drawImage(img, off, oy); ctx.drawImage(img, off + img.width, oy);
        return;
      }
      ctx.setTransform(1, 0, 0, 1, -cx, -cy);
      if (layer === 'tiles') {
        var x0 = Math.max(0, Math.floor(cx / TILE)), x1 = Math.min(W - 1, Math.floor((cx + VIEW_W) / TILE));
        var y0 = Math.max(0, Math.floor(cy / TILE)), y1 = Math.min(H - 1, Math.floor((cy + VIEW_H) / TILE));
        for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
          var c = map[y][x]; if (c === '.') continue;
          ctx.drawImage(bake(art.tiles[c].px, palette), x * TILE, y * TILE);
          if (opts.debug.hitbox && (art.tiles[c].solid || art.tiles[c].oneWay)) {
            ctx.fillStyle = art.tiles[c].oneWay ? 'rgba(255,201,60,.35)' : 'rgba(59,93,201,.25)';
            ctx.fillRect(x * TILE, y * TILE, TILE, art.tiles[c].oneWay ? 3 : TILE);
          }
          if (opts.debug.hitbox && art.tiles[c].hazard) { ctx.strokeStyle = '#ff3d7f'; ctx.strokeRect(x * TILE + 2.5, y * TILE + 9.5, 11, 6); }
        }
        if (opts.debug.grid) {
          ctx.strokeStyle = 'rgba(26,28,44,.18)'; ctx.lineWidth = 1;
          for (var gx = x0; gx <= x1 + 1; gx++) { ctx.beginPath(); ctx.moveTo(gx * TILE + 0.5, y0 * TILE); ctx.lineTo(gx * TILE + 0.5, (y1 + 1) * TILE); ctx.stroke(); }
          for (var gy = y0; gy <= y1 + 1; gy++) { ctx.beginPath(); ctx.moveTo(x0 * TILE, gy * TILE + 0.5); ctx.lineTo((x1 + 1) * TILE, gy * TILE + 0.5); ctx.stroke(); }
        }
        if (opts.debug.trail && trail.length > 1) {
          ctx.strokeStyle = '#ff3d7f'; ctx.beginPath(); ctx.moveTo(trail[0].x, trail[0].y);
          trail.forEach(function (q) { ctx.lineTo(q.x, q.y); }); ctx.stroke();
        }
      } else if (layer === 'objects') {
        objects.forEach(function (o) {
          if (o.type === 'parcel' && o.taken) return;
          var anim = o.type === 'flag' && o.on ? 'on' : 'idle';
          ctx.drawImage(bake(frameFor(o.type, anim, time), palette), o.x, o.y);
          if (o.type === 'mailbox' && collected < totalParcels) {
            ctx.fillStyle = '#1a1c2c'; ctx.font = '7px monospace'; ctx.fillText(collected + '/' + totalParcels, o.x + 1, o.y - 2);
          }
        });
      } else if (layer === 'player') {
        var img = bake(frameFor('courier', p.state, p.animTime), palette);
        var px = p.x + p.w / 2, py = p.y + p.h;
        if (opts.camera.snap) { px = Math.round(px); py = Math.round(py); }
        ctx.save(); ctx.translate(px, py); ctx.scale(p.facing * p.sx, p.sy);
        ctx.drawImage(img, -8, -16);
        ctx.restore();
        if (opts.debug.hitbox) {
          ctx.strokeStyle = '#ff3d7f'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(p.x) + 0.5, Math.round(p.y) + 0.5, p.w - 1, p.h - 1);
          ctx.strokeStyle = 'rgba(26,28,44,.5)'; ctx.setLineDash([2, 2]); ctx.strokeRect(Math.round(px) - 7.5, Math.round(py) - 15.5, 15, 15); ctx.setLineDash([]);
        }
        if (opts.debug.state) {
          ctx.fillStyle = '#1a1c2c'; ctx.font = '7px monospace'; ctx.fillText(p.state.toUpperCase(), Math.round(p.x) - 4, Math.round(p.y) - 6);
        }
      } else if (layer === 'particles') {
        particles.forEach(function (q) { ctx.fillStyle = q.color; ctx.globalAlpha = Math.min(1, q.life * 4); ctx.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.size); });
        ctx.globalAlpha = 1;
      } else if (layer === 'hud' && opts.hud) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(26,28,44,.78)'; ctx.fillRect(4, 4, 92, 14);
        ctx.drawImage(bake(art.sprites.parcel.anims.idle.frames[0], palette), 3, 1, 16, 16);
        ctx.fillStyle = '#ffc93c'; ctx.font = '8px monospace';
        ctx.fillText(collected + '/' + totalParcels + '  ' + time.toFixed(1) + 's', 22, 14);
      }
    }
    function drawOverlay() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(26,28,44,.72)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffc93c'; ctx.font = 'bold 16px monospace';
      var title = mode === 'title' ? 'PIXEL COURIER' : mode === 'paused' ? 'PAUSED' : 'DELIVERED!';
      ctx.fillText(title, VIEW_W / 2, 70);
      ctx.fillStyle = '#f4f4f4'; ctx.font = '8px monospace';
      if (mode === 'title') { ctx.fillText('Collect every parcel, then reach the mailbox.', VIEW_W / 2, 92); ctx.fillText('Arrows/WASD move · Space jumps · P pauses', VIEW_W / 2, 106); }
      if (mode === 'win') {
        ctx.fillText('Time ' + time.toFixed(2) + 's · Falls ' + deaths, VIEW_W / 2, 92);
        if (best) ctx.fillText('Best ' + best.toFixed(2) + 's', VIEW_W / 2, 104);
      }
      ctx.fillStyle = '#73eff7'; ctx.fillText(mode === 'win' ? 'Press Space to play again' : 'Press Space to ' + (mode === 'paused' ? 'resume' : 'start'), VIEW_W / 2, 130);
      ctx.textAlign = 'left';
    }

    /* ── Input ── */
    var KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', KeyP: 'pause', Escape: 'pause', Enter: 'start' };
    function onKey(e, down) {
      var k = KEYMAP[e.code]; if (!k) return;
      e.preventDefault();
      if (k === 'jump') { if (down && !keys.jumpHeld) pressed.jump = true; keys.jumpHeld = down; }
      else if (k === 'pause' || k === 'start') { if (down) pressed[k] = true; }
      else keys[k] = down;
    }
    var kd = function (e) { onKey(e, true); }, ku = function (e) { onKey(e, false); };
    var blur = function () { keys = {}; };
    canvas.addEventListener('keydown', kd); canvas.addEventListener('keyup', ku); canvas.addEventListener('blur', blur);
    function press(k, down) {
      if (k === 'jump') { if (down && !keys.jumpHeld) pressed.jump = true; keys.jumpHeld = down; }
      else keys[k] = down;
    }

    /* ── Loop: fixed 60 Hz simulation, render every display frame ── */
    var acc = 0; var STEP = 1 / 60;
    function tick(dt) {
      dt = Math.min(dt, 0.25);
      if (opts.fixedStep) {
        acc += dt;
        while (acc >= STEP) { step(STEP); acc -= STEP; }
      } else { step(dt); }
      draw();
      if (hooks.onFrame) hooks.onFrame(api);
    }
    var loop = global.SimKit ? global.SimKit.loop(tick) : (function () {
      var last = null, id, alive = true;
      function f(t) { if (last !== null) tick((t - last) / 1000); last = t; if (alive) id = requestAnimationFrame(f); }
      id = requestAnimationFrame(f); return { stop: function () { alive = false; cancelAnimationFrame(id); } };
    }());

    loadArt(store.load());
    reset();
    var unsub = store.subscribe(function (a) { loadArt(a); if (!opts.level) reset(); });

    var api = {
      get player() { return p; },
      get camera() { return cam; },
      get options() { return opts; },
      get mode() { return mode; },
      get stats() { return { collected: collected, total: totalParcels, time: time, deaths: deaths }; },
      set: function (path, value) {
        var parts = path.split('.'); var o = opts;
        for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
        o[parts[parts.length - 1]] = value;
      },
      setLevel: function (level) { opts.level = level; reset(); },
      setBest: function (b) { best = b; },
      reset: reset,
      press: press,
      step: step,
      draw: draw,
      destroy: function () { loop.stop(); unsub(); canvas.removeEventListener('keydown', kd); canvas.removeEventListener('keyup', ku); canvas.removeEventListener('blur', blur); }
    };
    instances.push(api);   // lets tests and the console inspect a running game
    return api;
  }
  var instances = [];

  global.PixelCourier = {
    instances: instances,
    TILE: TILE, VIEW_W: VIEW_W, VIEW_H: VIEW_H,
    PALETTE_NAMES: PALETTE_NAMES, TILE_KEYS: TILE_KEYS, OBJECT_KEYS: OBJECT_KEYS,
    DEFAULT_PHYSICS: DEFAULT_PHYSICS,
    store: store,
    bake: bake, silhouette: silhouette, sheetCanvas: sheetCanvas, download: download, blip: blip,
    createGame: createGame
  };
}(window));
