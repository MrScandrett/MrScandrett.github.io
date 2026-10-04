/* pixel-pathway-labs.js — the interactive labs for the 2D Game Developer Pathway.
   Each lab mounts on <div data-px-lab="name"> and reads/writes the shared art store
   (PixelCourier.store), so student art flows from lesson to lesson.
   Needs: sim-kit.js, pixel-courier-kit.js, pixel-pathway.js. */
(function (global) {
  'use strict';
  var PC = global.PixelCourier, PP = global.PixelPathway, el = PP.el;
  var store = PC.store;

  /* ══ Pixel editor component ═════════════════════════════════════════ */
  // Edits one 16×16 frame string. opts: { value, onChange(frame, final), onion() -> frame|null, label }
  function PixelEditor(host, opts) {
    var N = 16, CELL = 24;
    var frame = opts.value; var color = 1; var tool = 'pencil'; var mirror = false;
    var undo = []; var drawing = false; var cursor = { x: 8, y: 8 };
    var box = el('div', 'px-canvas-wrap');
    var canvas = el('canvas', 'px-grid'); canvas.width = N * CELL; canvas.height = N * CELL; canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', (opts.label || 'Pixel editor') + '. Click or drag to paint. With the keyboard: arrow keys move the cursor, Space paints, F fills, E erases.');
    box.appendChild(canvas);
    var tools = el('div', 'px-btn-row');
    var toolButtons = {};
    [['pencil', '✏️ Pencil'], ['eraser', '🧽 Eraser'], ['fill', '🪣 Fill'], ['picker', '💧 Pick colour']].forEach(function (t) {
      var b = el('button', null, t[1]); b.type = 'button'; b.setAttribute('aria-pressed', String(t[0] === tool));
      b.addEventListener('click', function () { tool = t[0]; Object.keys(toolButtons).forEach(function (k) { toolButtons[k].setAttribute('aria-pressed', String(k === tool)); }); });
      toolButtons[t[0]] = b; tools.appendChild(b);
    });
    var mirrorBtn = el('button', null, '↔ Mirror'); mirrorBtn.type = 'button'; mirrorBtn.setAttribute('aria-pressed', 'false');
    mirrorBtn.addEventListener('click', function () { mirror = !mirror; mirrorBtn.setAttribute('aria-pressed', String(mirror)); });
    var undoBtn = el('button', null, '↶ Undo'); undoBtn.type = 'button';
    undoBtn.addEventListener('click', function () { if (undo.length) { frame = undo.pop(); render(); opts.onChange(frame, true); } });
    var clearBtn = el('button', null, 'Clear'); clearBtn.type = 'button';
    clearBtn.addEventListener('click', function () { undo.push(frame); frame = new Array(N * N + 1).join('0'); render(); opts.onChange(frame, true); });
    tools.appendChild(mirrorBtn); tools.appendChild(undoBtn); tools.appendChild(clearBtn);
    box.appendChild(tools);
    var sw = el('div', 'px-swatches'); sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', 'Palette');
    var swatchButtons = [];
    var colorName = el('p', 'px-note');
    function paintSwatches() {
      var pal = store.load().palette;
      swatchButtons.forEach(function (b, i) { if (i) b.style.background = pal[i]; b.setAttribute('aria-pressed', String(i === color)); });
      colorName.textContent = 'Colour ' + color.toString(16) + ' · ' + PC.PALETTE_NAMES[color];
    }
    for (var i = 0; i < 16; i++) (function (i) {
      var b = el('button', 'px-swatch' + (i ? '' : ' is-clear')); b.type = 'button';
      b.setAttribute('aria-label', PC.PALETTE_NAMES[i] + ' (index ' + i.toString(16) + ')');
      b.addEventListener('click', function () { color = i; if (tool === 'eraser' || tool === 'picker') toolButtons.pencil.click(); paintSwatches(); });
      swatchButtons.push(b); sw.appendChild(b);
    }(i));
    box.appendChild(sw); box.appendChild(colorName);
    host.appendChild(box);
    var ctx = canvas.getContext('2d');

    function get(x, y) { return parseInt(frame[y * N + x], 16); }
    function setPx(f, x, y, c) { var i = y * N + x; return f.slice(0, i) + c.toString(16) + f.slice(i + 1); }
    function apply(x, y) {
      if (x < 0 || y < 0 || x >= N || y >= N) return;
      if (tool === 'picker') { color = get(x, y); paintSwatches(); toolButtons.pencil.click(); return; }
      var c = tool === 'eraser' ? 0 : color;
      if (tool === 'fill') { frame = flood(frame, x, y, c); if (mirror) frame = flood(frame, N - 1 - x, y, c); return; }
      frame = setPx(frame, x, y, c); if (mirror) frame = setPx(frame, N - 1 - x, y, c);
    }
    function flood(f, x, y, c) {
      var target = parseInt(f[y * N + x], 16); if (target === c) return f;
      var arr = f.split(''); var stack = [[x, y]];
      while (stack.length) {
        var q = stack.pop(), px = q[0], py = q[1];
        if (px < 0 || py < 0 || px >= N || py >= N || parseInt(arr[py * N + px], 16) !== target) continue;
        arr[py * N + px] = c.toString(16);
        stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
      }
      return arr.join('');
    }
    function render() {
      var pal = store.load().palette;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var onion = opts.onion && opts.onion();
      if (onion) { ctx.globalAlpha = 0.28; ctx.imageSmoothingEnabled = false; ctx.drawImage(PC.bake(onion, pal), 0, 0, N * CELL, N * CELL); ctx.globalAlpha = 1; }
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
        var c = get(x, y); if (!c) continue; ctx.fillStyle = pal[c]; ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
      ctx.strokeStyle = 'rgba(26,28,44,.14)'; ctx.lineWidth = 1;
      for (var g = 0; g <= N; g++) {
        ctx.beginPath(); ctx.moveTo(g * CELL + 0.5, 0); ctx.lineTo(g * CELL + 0.5, N * CELL); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, g * CELL + 0.5); ctx.lineTo(N * CELL, g * CELL + 0.5); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(228,87,46,.5)'; ctx.beginPath(); ctx.moveTo(8 * CELL + 0.5, 0); ctx.lineTo(8 * CELL + 0.5, N * CELL); ctx.stroke();
      if (document.activeElement === canvas) { ctx.strokeStyle = '#e4572e'; ctx.lineWidth = 3; ctx.strokeRect(cursor.x * CELL + 1.5, cursor.y * CELL + 1.5, CELL - 3, CELL - 3); }
    }
    function cellFrom(e) {
      var r = canvas.getBoundingClientRect();
      return { x: Math.floor((e.clientX - r.left) / r.width * N), y: Math.floor((e.clientY - r.top) / r.height * N) };
    }
    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault(); canvas.setPointerCapture(e.pointerId); drawing = true; undo.push(frame); if (undo.length > 60) undo.shift();
      var c = cellFrom(e); cursor = c; apply(c.x, c.y); render(); opts.onChange(frame, false);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drawing || tool === 'fill' || tool === 'picker') return;
      var c = cellFrom(e); apply(c.x, c.y); render(); opts.onChange(frame, false);
    });
    function end() { if (drawing) { drawing = false; opts.onChange(frame, true); } }
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('keydown', function (e) {
      var moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (moves[e.key]) { e.preventDefault(); cursor.x = Math.max(0, Math.min(N - 1, cursor.x + moves[e.key][0])); cursor.y = Math.max(0, Math.min(N - 1, cursor.y + moves[e.key][1])); render(); return; }
      var saved = tool;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'f' || e.key === 'e') {
        e.preventDefault(); undo.push(frame);
        if (e.key === 'f') tool = 'fill'; if (e.key === 'e') tool = 'eraser';
        apply(cursor.x, cursor.y); tool = saved; render(); opts.onChange(frame, true);
      }
    });
    canvas.addEventListener('focus', render); canvas.addEventListener('blur', render);
    paintSwatches(); render();
    return {
      setValue: function (f) { frame = f; undo = []; render(); },
      get value() { return frame; },
      render: function () { paintSwatches(); render(); }
    };
  }

  function preview(parent, scale, label, bg) {
    var fig = el('figure'); var c = el('canvas'); c.width = 16 * scale; c.height = 16 * scale;
    if (bg) c.style.background = bg;
    fig.appendChild(c); fig.appendChild(el('figcaption', null, label)); parent.appendChild(fig);
    var ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    return function (frame) { var pal = store.load().palette; ctx.clearRect(0, 0, c.width, c.height); ctx.drawImage(PC.bake(frame, pal), 0, 0, c.width, c.height); };
  }
  function downloadCanvas(canvas, name) { canvas.toBlob(function (b) { PC.download(name, b); }); }
  function scaled(frame, scale) { var c = document.createElement('canvas'); c.width = c.height = 16 * scale; var x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(PC.bake(frame, store.load().palette), 0, 0, c.width, c.height); return c; }

  /* ══ Lesson 01 · Sprite lab ═════════════════════════════════════════ */
  function spriteLab(host) {
    var art = store.load();
    var grid = el('div', 'px-editor'); host.appendChild(grid);
    var left = el('div'); var right = el('div'); grid.appendChild(left); grid.appendChild(right);
    var propagate = true;
    var previews = el('div', 'px-previews');
    right.appendChild(el('h3', null, 'Check it at real size'));
    var p1 = preview(previews, 1, '1× (in game)'), p2 = preview(previews, 2, '2×'), p4 = preview(previews, 4, '4×');
    var sil = preview(previews, 4, 'silhouette'), dark = preview(previews, 4, 'dark level', '#1a1c2c');
    right.appendChild(previews);
    right.appendChild(el('p', 'px-note', 'Readability test: the silhouette alone should still say “courier with a cap, facing right.” The 1× view is what players actually see.'));
    var prop = PP.toggle(right, 'Copy my top 12 rows into every animation frame (legs stay animated)', true, function (v) { propagate = v; });
    prop.checked = propagate;
    var row = el('div', 'px-btn-row'); right.appendChild(row);
    var savedNote = el('p', 'px-note'); savedNote.setAttribute('aria-live', 'polite'); right.appendChild(savedNote);
    function update(frame) { p1(frame); p2(frame); p4(frame); sil(PC.silhouette(frame)); dark(frame); }
    var editor = PixelEditor(left, {
      value: art.sprites.courier.anims.idle.frames[0], label: 'Courier base pose editor',
      onChange: function (frame, final) {
        update(frame);
        if (!final) return;
        store.update(function (a) {
          var anims = a.sprites.courier.anims;
          anims.idle.frames[0] = frame;
          if (propagate) Object.keys(anims).forEach(function (k) {
            anims[k].frames = anims[k].frames.map(function (f, i) {
              var up = k === 'run' && i % 2 === 1;
              var top = up ? frame.slice(16, 192) + '0000000000000000' : frame.slice(0, 192);
              return top + f.slice(192);
            });
          });
        });
        savedNote.textContent = 'Saved. Your courier now uses this drawing in every lesson’s game.';
      }
    });
    [['Download PNG (16×16)', function () { downloadCanvas(scaled(editor.value, 1), 'courier-16.png'); }],
     ['Download PNG (8× preview)', function () { downloadCanvas(scaled(editor.value, 8), 'courier-128.png'); }],
     ['Reset courier', function () { if (global.confirm('Reset the courier to the starter drawing? Your animation frames will reset too.')) { store.reset('courier'); editor.setValue(store.load().sprites.courier.anims.idle.frames[0]); update(editor.value); } }]
    ].forEach(function (b) { var x = el('button', null, b[0]); x.type = 'button'; x.addEventListener('click', b[1]); row.appendChild(x); });
    update(editor.value);
  }

  // Lesson 01 · why nearest-neighbour + integer scaling
  function scalingLab(host) {
    var row = el('div', 'px-previews'); host.appendChild(row);
    var specs = [[3, false, '3× nearest-neighbour'], [3, true, '3× smoothed (blurry)'], [2.5, false, '2.5× uneven pixels']];
    var draws = specs.map(function (s) {
      var fig = el('figure'); var c = el('canvas'); c.width = 60; c.height = 60; c.style.width = '120px'; c.style.height = '120px'; c.style.imageRendering = 'pixelated';
      fig.appendChild(c); fig.appendChild(el('figcaption', null, s[2])); row.appendChild(fig);
      return function () {
        var ctx = c.getContext('2d'); ctx.clearRect(0, 0, 60, 60); ctx.imageSmoothingEnabled = s[1];
        ctx.drawImage(PC.bake(store.load().sprites.courier.anims.idle.frames[0], store.load().palette), 6, 6, 16 * s[0], 16 * s[0]);
      };
    });
    function all() { draws.forEach(function (d) { d(); }); }
    store.subscribe(all); all();
  }

  /* ══ Lesson 02 · Animation lab ══════════════════════════════════════ */
  function animLab(host) {
    var anim = 'run', index = 0, onion = true;
    var top = el('div', 'px-btn-row'); host.appendChild(top);
    var animNames = ['idle', 'run', 'jump', 'fall', 'land'];
    PP.buttons(top, animNames.map(function (n) { return { label: n, id: n }; }), function (item) { anim = item.id; index = 0; sync(); }, 1);
    var strip = el('div', 'px-frames'); strip.setAttribute('role', 'group'); strip.setAttribute('aria-label', 'Frames'); host.appendChild(strip);
    var grid = el('div', 'px-editor'); host.appendChild(grid);
    var left = el('div'), right = el('div'); grid.appendChild(left); grid.appendChild(right);
    var editor = PixelEditor(left, {
      value: store.load().sprites.courier.anims.run.frames[0], label: 'Animation frame editor',
      onion: function () { var fr = cur().frames; return onion && fr.length > 1 ? fr[(index - 1 + fr.length) % fr.length] : null; },
      onChange: function (frame, final) { if (final) store.update(function (a) { a.sprites.courier.anims[anim].frames[index] = frame; }); }
    });
    var ops = el('div', 'px-btn-row'); right.appendChild(ops);
    [['＋ Duplicate frame', function () { store.update(function (a) { var f = a.sprites.courier.anims[anim].frames; if (f.length < 8) f.splice(index + 1, 0, f[index]); }); index = Math.min(index + 1, cur().frames.length - 1); sync(); }],
     ['Delete frame', function () { store.update(function (a) { var f = a.sprites.courier.anims[anim].frames; if (f.length > 1) f.splice(index, 1); }); index = Math.max(0, index - 1); sync(); }],
     ['◀ Move', function () { if (!index) return; store.update(function (a) { var f = a.sprites.courier.anims[anim].frames; var t = f[index]; f[index] = f[index - 1]; f[index - 1] = t; }); index--; sync(); }],
     ['Move ▶', function () { if (index >= cur().frames.length - 1) return; store.update(function (a) { var f = a.sprites.courier.anims[anim].frames; var t = f[index]; f[index] = f[index + 1]; f[index + 1] = t; }); index++; sync(); }]
    ].forEach(function (b) { var x = el('button', null, b[0]); x.type = 'button'; x.addEventListener('click', b[1]); ops.appendChild(x); });
    PP.toggle(right, 'Onion skin (show previous frame faintly)', true, function (v) { onion = v; editor.render(); });
    var fps = PP.slider(right, 'Frames per second', 1, 24, 1, 10, function (v) { store.update(function (a) { a.sprites.courier.anims[anim].fps = v; }); }, function (v) { return v + ' fps · ' + Math.round(1000 / v) + ' ms per frame'; });
    right.appendChild(el('h3', null, 'Playback'));
    var play = el('canvas'); play.width = 160; play.height = 48; play.className = 'px-canvas-plain'; play.style.maxWidth = '320px';
    play.setAttribute('role', 'img'); play.setAttribute('aria-label', 'The selected animation playing in place and moving across the screen');
    right.appendChild(play);
    var sheetHead = el('h3', null, 'Sprite sheet'); right.appendChild(sheetHead);
    var sheetBox = el('div', 'px-sheet'); right.appendChild(sheetBox);
    var code = el('pre', 'px-readout'); right.appendChild(code);
    var dl = el('div', 'px-btn-row'); right.appendChild(dl);
    [['Download sheet PNG', function () { downloadCanvas(PC.sheetCanvas(cur().frames, store.load().palette, 1), 'courier-' + anim + '-sheet.png'); }],
     ['Download sheet JSON', function () {
       var frames = cur().frames.map(function (f, i) { return { frame: i, x: i * 16, y: 0, w: 16, h: 16, durationMs: Math.round(1000 / cur().fps) }; });
       PC.download('courier-' + anim + '-sheet.json', JSON.stringify({ image: 'courier-' + anim + '-sheet.png', animation: anim, fps: cur().fps, frames: frames }, null, 2), 'application/json');
     }]].forEach(function (b) { var x = el('button', null, b[0]); x.type = 'button'; x.addEventListener('click', b[1]); dl.appendChild(x); });

    function cur() { return store.load().sprites.courier.anims[anim]; }
    function sync() {
      var a = cur(); index = Math.min(index, a.frames.length - 1);
      strip.innerHTML = '';
      a.frames.forEach(function (f, i) {
        var b = el('button', 'px-frame'); b.type = 'button'; b.setAttribute('aria-pressed', String(i === index)); b.setAttribute('aria-label', anim + ' frame ' + (i + 1));
        var c = el('canvas'); c.width = 16; c.height = 16; c.getContext('2d').drawImage(PC.bake(f, store.load().palette), 0, 0);
        b.appendChild(c); b.appendChild(el('span', null, String(i + 1)));
        b.addEventListener('click', function () { index = i; sync(); });
        strip.appendChild(b);
      });
      editor.setValue(a.frames[index]);
      fps.quiet(a.fps);
    }
    var t = 0;
    function drawSheet() {
      var a = cur(); var sheet = PC.sheetCanvas(a.frames, store.load().palette, 4);
      var showing = Math.floor(t * a.fps) % a.frames.length;
      var ctx = sheet.getContext('2d'); ctx.strokeStyle = '#e4572e'; ctx.lineWidth = 3; ctx.strokeRect(showing * 64 + 1.5, 1.5, 61, 61);
      sheetBox.innerHTML = ''; sheetBox.appendChild(sheet);
      sheet.setAttribute('role', 'img'); sheet.setAttribute('aria-label', a.frames.length + '-frame sprite sheet; frame ' + (showing + 1) + ' highlighted');
      code.textContent = '// frame ' + showing + ' of the "' + anim + '" sheet\nconst frame = Math.floor(time * ' + a.fps + ') % ' + a.frames.length + ';   // = ' + showing +
        '\nctx.drawImage(sheet,\n  frame * 16, 0, 16, 16,   // source rect (sx, sy, sw, sh)\n  player.x, player.y, 16, 16); // destination';
    }
    var lastShown = -1;
    global.SimKit.loop(function (dt) {
      t += dt; var a = cur(); var pal = store.load().palette;
      var frame = Math.floor(t * a.fps) % a.frames.length;
      var ctx = play.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, 160, 48);
      ctx.fillStyle = '#d8f3f9'; ctx.fillRect(0, 0, 160, 48); ctx.fillStyle = '#38b764'; ctx.fillRect(0, 40, 160, 8);
      ctx.drawImage(PC.bake(a.frames[frame], pal), 8, 8, 32, 32);
      var x = anim === 'run' ? 52 + ((t * 40) % 108) : 100;
      ctx.drawImage(PC.bake(a.frames[frame], pal), Math.round(x - 8), 24, 16, 16);
      if (frame !== lastShown) { lastShown = frame; drawSheet(); }
    });
    store.subscribe(function () { lastShown = -1; });
    sync();
  }

  /* ══ Lesson 03 · Tileset + map editors ══════════════════════════════ */
  function tileLab(host) {
    var key = 'G';
    var pick = el('div', 'px-btn-row'); host.appendChild(pick);
    PP.buttons(pick, PC.TILE_KEYS.map(function (k) { return { label: k + ' · ' + store.load().tiles[k].name, id: k }; }), function (item) { key = item.id; editor.setValue(store.load().tiles[key].px); seam(); }, 0);
    var grid = el('div', 'px-editor'); host.appendChild(grid);
    var left = el('div'), right = el('div'); grid.appendChild(left); grid.appendChild(right);
    var editor = PixelEditor(left, {
      value: store.load().tiles[key].px, label: 'Tile editor',
      onChange: function (frame, final) { seam(frame); if (final) store.update(function (a) { a.tiles[key].px = frame; }); }
    });
    right.appendChild(el('h3', null, 'Seam test: the tile repeated 4 × 3'));
    var c = el('canvas'); c.width = 64; c.height = 48; c.className = 'px-canvas-plain'; c.style.maxWidth = '320px';
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'The selected tile repeated in a grid to reveal seams');
    right.appendChild(c);
    right.appendChild(el('p', 'px-note', 'If you can see a grid of squares, the left/right or top/bottom edges do not match. Copy the left column’s colours onto the right column (and top onto bottom) until the seams vanish.'));
    var rules = el('p', 'px-readout'); right.appendChild(rules);
    function seam(frame) {
      var art = store.load(); var f = frame || art.tiles[key].px; var ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 64, 48); for (var y = 0; y < 3; y++) for (var x = 0; x < 4; x++) ctx.drawImage(PC.bake(f, art.palette), x * 16, y * 16);
      var t = art.tiles[key];
      rules.textContent = 'tiles["' + key + '"] = {\n  name: "' + t.name + '",\n  solid: ' + !!t.solid + ', oneWay: ' + !!t.oneWay + ', hazard: ' + !!t.hazard + '\n}\n// the art can change; these collision rules stay with the tile ID';
    }
    seam();
  }

  // Shared map editor (lessons 03 and 09). opts: { autoGround, pacing }
  function mapEditor(host, opts) {
    opts = opts || {};
    var brush = opts.autoGround ? 'auto' : 'G';
    var brushes = [{ id: 'auto', label: '🌱 Ground (auto)' }].concat(PC.TILE_KEYS.map(function (k) { return { id: k, label: k + ' ' + store.load().tiles[k].name }; }))
      .concat(Object.keys(PC.OBJECT_KEYS).map(function (k) { return { id: k, label: k + ' ' + PC.OBJECT_KEYS[k] }; }))
      .concat([{ id: '.', label: '⌫ Erase' }]);
    var bar = el('div', 'px-btn-row'); host.appendChild(bar);
    PP.buttons(bar, brushes, function (b) { brush = b.id; }, 0);
    var view = { grid: true, collision: false, ids: false };
    var toggles = el('div', 'px-btn-row'); host.appendChild(toggles);
    PP.toggle(toggles, 'Grid', true, function (v) { view.grid = v; draw(); });
    PP.toggle(toggles, 'Collision layer', false, function (v) { view.collision = v; draw(); });
    PP.toggle(toggles, 'Tile IDs', false, function (v) { view.ids = v; draw(); });
    var scroller = el('div'); scroller.style.overflowX = 'auto'; scroller.style.border = '3px solid var(--px-ink)'; host.appendChild(scroller);
    var c = el('canvas'); c.style.display = 'block'; c.style.imageRendering = 'pixelated'; c.style.touchAction = 'none'; c.style.cursor = 'crosshair';
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Level map editor. Click or drag to paint tiles. The text version below updates as you paint.');
    scroller.appendChild(c);
    var info = el('p', 'px-note'); info.setAttribute('aria-live', 'polite'); host.appendChild(info);
    var pacing = null;
    if (opts.pacing) { host.appendChild(el('h3', null, 'Challenge per screen (20 columns)')); pacing = el('canvas'); pacing.className = 'px-canvas-plain'; pacing.width = 320; pacing.height = 90; pacing.style.maxWidth = '640px'; pacing.setAttribute('role', 'img'); host.appendChild(pacing); }
    var text = el('pre', 'px-maptext'); text.setAttribute('aria-label', 'The level as text: one character per tile'); text.tabIndex = 0; host.appendChild(text);
    var row = el('div', 'px-btn-row'); host.appendChild(row);
    [['Add 8 columns', function () { store.update(function (a) { a.level = a.level.map(function (r, y) { return r + (y >= a.level.length - 2 ? (y === a.level.length - 2 ? 'GGGGGGGG' : 'DDDDDDDD') : '........'); }); }); }],
     ['Remove 8 columns', function () { store.update(function (a) { if (a.level[0].length > 28) a.level = a.level.map(function (r) { return r.slice(0, -8); }); }); }],
     ['Reset level', function () { if (global.confirm('Reset the level to the starter map?')) store.reset('level'); }],
     ['Download level.txt', function () { PC.download('level.txt', store.load().level.join('\n')); }]
    ].forEach(function (b) { var x = el('button', null, b[0]); x.type = 'button'; x.addEventListener('click', b[1]); row.appendChild(x); });

    var level = store.load().level.slice(); var SCALE = 2; var painting = false;
    function draw() {
      var art = store.load(); var H = level.length, W = level[0].length;
      c.width = W * 16; c.height = H * 16; c.style.width = (W * 16 * SCALE) + 'px'; c.style.height = (H * 16 * SCALE) + 'px';
      var ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
      var g = ctx.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, '#d8f3f9'); g.addColorStop(1, '#fff4d8'); ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
      var sprites = { P: 'parcel', M: 'mailbox', F: 'flag', S: 'courier' };
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var k = level[y][x]; if (k === '.') continue;
        if (art.tiles[k]) {
          ctx.drawImage(PC.bake(art.tiles[k].px, art.palette), x * 16, y * 16);
          if (view.collision) { ctx.fillStyle = art.tiles[k].hazard ? 'rgba(255,61,127,.45)' : art.tiles[k].oneWay ? 'rgba(255,201,60,.6)' : 'rgba(59,93,201,.4)'; ctx.fillRect(x * 16, y * 16, 16, art.tiles[k].oneWay ? 4 : 16); }
        } else if (sprites[k]) ctx.drawImage(PC.bake(art.sprites[sprites[k]].anims.idle.frames[0], art.palette), x * 16, y * 16);
        if (view.ids) { ctx.fillStyle = '#1a1c2c'; ctx.font = 'bold 9px monospace'; ctx.fillText(k, x * 16 + 5, y * 16 + 11); }
      }
      if (view.grid) {
        ctx.strokeStyle = 'rgba(26,28,44,.15)'; ctx.lineWidth = 1;
        for (var gx = 0; gx <= W; gx++) { ctx.beginPath(); ctx.moveTo(gx * 16 + 0.5, 0); ctx.lineTo(gx * 16 + 0.5, c.height); ctx.stroke(); }
        for (var gy = 0; gy <= H; gy++) { ctx.beginPath(); ctx.moveTo(0, gy * 16 + 0.5); ctx.lineTo(c.width, gy * 16 + 0.5); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(228,87,46,.55)'; for (var sx = 20; sx < W; sx += 20) { ctx.beginPath(); ctx.moveTo(sx * 16 + 0.5, 0); ctx.lineTo(sx * 16 + 0.5, c.height); ctx.stroke(); }
      }
      text.textContent = level.map(function (r, i) { return (i < 10 ? ' ' : '') + i + ' ' + r; }).join('\n');
      var counts = { P: 0, S: 0, M: 0 }; level.join('').split('').forEach(function (ch) { if (ch in counts) counts[ch]++; });
      var problems = [];
      if (counts.S !== 1) problems.push('needs exactly one S (spawn)'); if (counts.M < 1) problems.push('needs an M (mailbox)'); if (counts.P < 1) problems.push('needs at least one P (parcel)');
      info.textContent = W + ' × ' + H + ' tiles (' + (W * 16) + ' × ' + (H * 16) + ' px) · ' + counts.P + ' parcels' + (problems.length ? ' · ⚠ Level ' + problems.join(', ') : ' · Level is playable');
      if (pacing) drawPacing();
    }
    function drawPacing() {
      var H = level.length, W = level[0].length; var screens = Math.ceil(W / 20); var scores = [];
      for (var s = 0; s < screens; s++) {
        var score = 0;
        for (var x = s * 20; x < Math.min(W, s * 20 + 20); x++) {
          var col = ''; for (var y = 0; y < H; y++) col += level[y][x];
          if ((col.match(/\^/g) || []).length) score += 2;
          if (!/[GDBC]/.test(col.slice(H - 3))) score += 1.5;   // a gap in the floor
          if (/[=]/.test(col)) score += 0.5;
          if (/B/.test(col)) score += 0.5;
        }
        scores.push(score);
      }
      var ctx = pacing.getContext('2d'); ctx.clearRect(0, 0, 320, 90); ctx.fillStyle = '#fffdf7'; ctx.fillRect(0, 0, 320, 90);
      var bw = 300 / screens; var max = Math.max(6, Math.max.apply(null, scores));
      scores.forEach(function (sc, i) {
        var h = Math.round(sc / max * 60); ctx.fillStyle = '#e4572e'; ctx.fillRect(10 + i * bw + 4, 72 - h, bw - 8, h);
        ctx.fillStyle = '#1a1c2c'; ctx.font = '8px monospace'; ctx.fillText('screen ' + (i + 1), 10 + i * bw + 4, 84); ctx.fillText(sc.toFixed(1), 10 + i * bw + 4, 70 - h);
      });
      pacing.setAttribute('aria-label', 'Challenge score per screen: ' + scores.map(function (s, i) { return 'screen ' + (i + 1) + ' ' + s.toFixed(1); }).join(', '));
    }
    function setTile(x, y, k) {
      var r = level[y]; level[y] = r.slice(0, x) + k + r.slice(x + 1);
    }
    function paint(e) {
      var r = c.getBoundingClientRect(); var x = Math.floor((e.clientX - r.left) / r.width * level[0].length), y = Math.floor((e.clientY - r.top) / r.height * level.length);
      if (x < 0 || y < 0 || y >= level.length || x >= level[0].length) return;
      var k = brush;
      if (k === 'auto') {
        // Rule tile: grass if nothing solid above, dirt otherwise — and fix the tile below.
        var above = y > 0 ? level[y - 1][x] : '.';
        k = /[GD]/.test(above) ? 'D' : 'G';
        if (y + 1 < level.length && level[y + 1][x] === 'G') setTile(x, y + 1, 'D');
      }
      if (k === 'S') level = level.map(function (row) { return row.replace(/S/g, '.'); });
      setTile(x, y, k);
      if (brush === '.' && y + 1 < level.length && level[y + 1][x] === 'D' && opts.autoGround) setTile(x, y + 1, 'G');
      draw();
    }
    c.addEventListener('pointerdown', function (e) { e.preventDefault(); c.setPointerCapture(e.pointerId); painting = true; paint(e); });
    c.addEventListener('pointermove', function (e) { if (painting && !/[SM]/.test(brush)) paint(e); });
    function end() { if (painting) { painting = false; store.update(function (a) { a.level = level.slice(); }); } }
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    store.subscribe(function (a) { if (!painting) { level = a.level.slice(); draw(); } });
    draw();
  }

  // Lesson 03 · 4-bit autotile bitmask
  function bitmaskLab(host) {
    var W = 10, H = 6; var cells = [];
    for (var y = 0; y < H; y++) { cells.push([]); for (var x = 0; x < W; x++) cells[y].push(y >= 3 && x > 0 && x < 9 && !(y === 3 && (x === 4 || x === 5))); }
    var c = el('canvas'); c.width = W * 32; c.height = H * 32; c.className = 'px-canvas-plain'; c.style.maxWidth = '640px'; c.style.cursor = 'pointer';
    c.setAttribute('role', 'img'); host.appendChild(c);
    var out = el('p', 'px-readout'); out.setAttribute('aria-live', 'polite'); host.appendChild(out);
    var focus = { x: 4, y: 3 };
    function filled(x, y) { return x >= 0 && y >= 0 && x < W && y < H && cells[y][x]; }
    function mask(x, y) { return (filled(x, y - 1) ? 1 : 0) + (filled(x + 1, y) ? 2 : 0) + (filled(x, y + 1) ? 4 : 0) + (filled(x - 1, y) ? 8 : 0); }
    function draw() {
      var ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height); ctx.fillStyle = '#d8f3f9'; ctx.fillRect(0, 0, c.width, c.height);
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        if (!cells[y][x]) continue; var m = mask(x, y); var px = x * 32, py = y * 32;
        ctx.fillStyle = '#b86f50'; ctx.fillRect(px, py, 32, 32);
        ctx.fillStyle = '#38b764'; if (!(m & 1)) ctx.fillRect(px, py, 32, 7);
        ctx.fillStyle = '#5d3a29'; if (!(m & 2)) ctx.fillRect(px + 28, py, 4, 32); if (!(m & 4)) ctx.fillRect(px, py + 28, 32, 4); if (!(m & 8)) ctx.fillRect(px, py, 4, 32);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.fillText(String(m), px + 10, py + 21);
      }
      ctx.strokeStyle = '#e4572e'; ctx.lineWidth = 3; ctx.strokeRect(focus.x * 32 + 1.5, focus.y * 32 + 1.5, 29, 29);
      var m = mask(focus.x, focus.y);
      out.textContent = filled(focus.x, focus.y)
        ? 'Selected tile: up ' + (m & 1 ? 1 : 0) + '×1 + right ' + (m & 2 ? 1 : 0) + '×2 + down ' + (m & 4 ? 1 : 0) + '×4 + left ' + (m & 8 ? 1 : 0) + '×8 = ' + m + '\n→ draw variant #' + m + ' of 16 (grass on top only when “up” is empty)'
        : 'Empty cell. Click to add ground; every neighbour’s number updates.';
      c.setAttribute('aria-label', 'Autotile grid. Each ground tile shows its 4-bit neighbour number. ' + out.textContent);
    }
    c.addEventListener('click', function (e) {
      var r = c.getBoundingClientRect(); var x = Math.floor((e.clientX - r.left) / r.width * W), y = Math.floor((e.clientY - r.top) / r.height * H);
      if (focus.x === x && focus.y === y || !filled(x, y)) cells[y][x] = !cells[y][x];
      focus = { x: x, y: y }; draw();
    });
    draw();
  }

  /* ══ Lesson 04 · Timestep lab ═══════════════════════════════════════ */
  function timestepLab(host) {
    var fps = 60;
    var bar = el('div', 'px-btn-row'); host.appendChild(bar);
    bar.appendChild(el('span', 'px-note', 'Pretend the computer draws at: '));
    PP.buttons(bar, [15, 30, 60, 144].map(function (f) { return { label: f + ' fps', id: f }; }), function (b) { fps = b.id; run(); }, 2);
    var c = el('canvas'); c.width = 480; c.height = 200; c.className = 'px-canvas-plain'; c.setAttribute('role', 'img'); host.appendChild(c);
    var out = el('pre', 'px-readout'); out.setAttribute('aria-live', 'polite'); host.appendChild(out);
    var lanes = [
      { name: 'A · per frame (no dt)', color: '#e4572e' },
      { name: 'B · × dt (variable)', color: '#3b5dc9' },
      { name: 'C · fixed 60 Hz steps', color: '#2f8f57' }
    ];
    var G = 900, V = 280, DURATION = 0.9;
    function simulate(kind) {
      var dt = 1 / fps; var y = 0, vy = -V, t = 0, apex = 0, pts = [], acc = 0;
      while (t < DURATION) {
        if (kind === 0) { vy += G / 3600; y += vy / 60; }           // tuned at 60 fps, ignores real time
        else if (kind === 1) { vy += G * dt; y += vy * dt; }
        else { acc += dt; while (acc >= 1 / 60) { vy += G / 60; y += vy / 60; acc -= 1 / 60; } }
        t += dt; apex = Math.min(apex, y); pts.push({ t: t, y: y });
      }
      return { pts: pts, apex: -apex };
    }
    var results = [], start = 0, raf = null;
    function run() {
      results = lanes.map(function (l, i) { return simulate(i); });
      out.textContent = lanes.map(function (l, i) { return l.name.padEnd(24) + ' highest point ' + results[i].apex.toFixed(1) + ' px'; }).join('\n') +
        '\n\nAt 60 fps all three agree (' + simulate(2).apex.toFixed(1) + ' px). Change the frame rate and compare.';
      start = performance.now(); if (!raf) raf = requestAnimationFrame(frame);
    }
    function frame(now) {
      raf = null; var elapsed = Math.min(DURATION, (now - start) / 1000);
      var ctx = c.getContext('2d'); ctx.clearRect(0, 0, 480, 200); ctx.fillStyle = '#fffdf7'; ctx.fillRect(0, 0, 480, 200);
      ctx.fillStyle = '#38b764'; ctx.fillRect(0, 180, 480, 20);
      lanes.forEach(function (l, i) {
        var x0 = 30 + i * 155; ctx.fillStyle = l.color; ctx.font = 'bold 10px monospace'; ctx.fillText(l.name, x0 - 20, 14);
        var shown = results[i].pts.filter(function (p) { return p.t <= elapsed; });
        shown.forEach(function (p) { ctx.fillRect(x0 + p.t * 120, 176 + p.y * 0.5, 3, 3); });
        var last = shown[shown.length - 1]; if (last) { ctx.fillRect(x0 + last.t * 120 - 4, 170 + last.y * 0.5, 10, 10); }
        ctx.strokeStyle = l.color; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x0 - 20, 176 - results[i].apex * 0.5); ctx.lineTo(x0 + 120, 176 - results[i].apex * 0.5); ctx.stroke(); ctx.setLineDash([]);
      });
      c.setAttribute('aria-label', 'Three jump arcs simulated at ' + fps + ' frames per second. ' + out.textContent.replace(/\n/g, '. '));
      if (elapsed < DURATION) raf = requestAnimationFrame(frame);
    }
    run();
  }

  // Lesson 04 · draw order
  function layerLab(host) {
    var gameHost = el('div'); var controls = el('div', 'px-controls');
    var grid = el('div', 'px-lab-grid'); grid.appendChild(gameHost); grid.appendChild(controls); host.appendChild(grid);
    var order = ['sky', 'far', 'near', 'tiles', 'objects', 'player', 'particles', 'hud'];
    var hidden = {};
    var game = PP.mountGame(gameHost, { debug: { hitbox: false } });
    var list = el('ol'); list.style.paddingLeft = '1.2rem'; controls.appendChild(el('p', 'px-note', 'Drawn top to bottom: later layers paint over earlier ones.')); controls.appendChild(list);
    function apply() { game.set('layerOrder', order.filter(function (l) { return !hidden[l]; })); }
    function render() {
      list.innerHTML = '';
      order.forEach(function (name, i) {
        var li = el('li'); li.style.margin = '.25rem 0';
        var row = el('span', 'px-btn-row'); row.style.display = 'inline-flex'; row.style.alignItems = 'center';
        var lab = el('label', 'px-toggle'); var cb = el('input'); cb.type = 'checkbox'; cb.checked = !hidden[name];
        cb.addEventListener('change', function () { hidden[name] = !cb.checked; apply(); });
        lab.appendChild(cb); lab.appendChild(el('code', null, name)); row.appendChild(lab);
        var up = el('button', null, '↑'); up.type = 'button'; up.setAttribute('aria-label', 'Draw ' + name + ' earlier'); up.disabled = i === 0;
        up.addEventListener('click', function () { order.splice(i, 1); order.splice(i - 1, 0, name); apply(); render(); list.querySelectorAll('button')[Math.max(0, (i - 1) * 2)].focus(); });
        var down = el('button', null, '↓'); down.type = 'button'; down.setAttribute('aria-label', 'Draw ' + name + ' later'); down.disabled = i === order.length - 1;
        down.addEventListener('click', function () { order.splice(i, 1); order.splice(i + 1, 0, name); apply(); render(); });
        row.appendChild(up); row.appendChild(down); li.appendChild(row); list.appendChild(li);
      });
    }
    render();
    PP.buttons(controls, ['Try: tiles after player', 'Try: sky last', 'Reset order'], function (b, i) {
      if (i === 0) order = ['sky', 'far', 'near', 'objects', 'player', 'tiles', 'particles', 'hud'];
      if (i === 1) order = ['far', 'near', 'tiles', 'objects', 'player', 'particles', 'hud', 'sky'];
      if (i === 2) order = ['sky', 'far', 'near', 'tiles', 'objects', 'player', 'particles', 'hud'];
      hidden = {}; apply(); render();
    });
  }

  /* ══ Lesson 05 · Movement tuning ════════════════════════════════════ */
  function moveLab(host) {
    var gameHost = el('div'); var controls = el('div', 'px-controls');
    var grid = el('div', 'px-lab-grid'); grid.appendChild(gameHost); grid.appendChild(controls); host.appendChild(grid);
    var out = el('pre', 'px-readout'); out.setAttribute('aria-live', 'off');
    var coyoteJumps = 0, jumps = 0;
    var game = PP.mountGame(gameHost, { debug: { trail: true }, hooks: { onEvent: function (t, d) { if (t === 'jump') { jumps++; if (d.coyote) coyoteJumps++; } } } });
    gameHost.appendChild(out);
    var P = game.options.physics; var sliders = {};
    var run = PP.fieldset(controls, 'Run');
    sliders.maxRun = PP.slider(run, 'Top speed (px/s)', 30, 200, 5, P.maxRun, function (v) { game.set('physics.maxRun', v); });
    sliders.accel = PP.slider(run, 'Acceleration (px/s²)', 100, 3000, 50, P.accel, function (v) { game.set('physics.accel', v); });
    sliders.decel = PP.slider(run, 'Friction / braking (px/s²)', 50, 3000, 50, P.decel, function (v) { game.set('physics.decel', v); });
    var jump = PP.fieldset(controls, 'Jump');
    sliders.jumpVel = PP.slider(jump, 'Jump speed (px/s)', 120, 420, 10, P.jumpVel, function (v) { game.set('physics.jumpVel', v); stats(); });
    sliders.gravity = PP.slider(jump, 'Gravity (px/s²)', 300, 2000, 25, P.gravity, function (v) { game.set('physics.gravity', v); stats(); });
    sliders.fallMul = PP.slider(jump, 'Fall gravity multiplier', 1, 3, 0.1, P.fallMul, function (v) { game.set('physics.fallMul', v); }, function (v) { return '× ' + v.toFixed(1); });
    sliders.jumpCut = PP.slider(jump, 'Release-early cut', 0.1, 1, 0.05, P.jumpCut, function (v) { game.set('physics.jumpCut', v); }, function (v) { return '× ' + v.toFixed(2); });
    var forgive = PP.fieldset(controls, 'Forgiveness');
    PP.toggle(forgive, 'Coyote time (jump just after leaving a ledge)', true, function (v) { game.set('features.coyote', v); });
    sliders.coyote = PP.slider(forgive, 'Coyote window', 0, 0.25, 0.01, P.coyote, function (v) { game.set('physics.coyote', v); }, function (v) { return Math.round(v * 1000) + ' ms'; });
    PP.toggle(forgive, 'Jump buffer (press slightly before landing)', true, function (v) { game.set('features.buffer', v); });
    sliders.buffer = PP.slider(forgive, 'Buffer window', 0, 0.25, 0.01, P.buffer, function (v) { game.set('physics.buffer', v); }, function (v) { return Math.round(v * 1000) + ' ms'; });
    PP.toggle(forgive, 'Variable jump height (release to cut)', true, function (v) { game.set('features.varJump', v); });
    PP.toggle(forgive, 'Draw jump trail', true, function (v) { game.set('debug.trail', v); });
    var presets = {
      Starter: { maxRun: 90, accel: 900, decel: 1100, jumpVel: 280, gravity: 900, fallMul: 1.4, jumpCut: 0.45 },
      Tight: { maxRun: 110, accel: 2400, decel: 2600, jumpVel: 300, gravity: 1250, fallMul: 1.8, jumpCut: 0.35 },
      Floaty: { maxRun: 80, accel: 500, decel: 500, jumpVel: 220, gravity: 450, fallMul: 1, jumpCut: 0.8 },
      Ice: { maxRun: 120, accel: 250, decel: 80, jumpVel: 280, gravity: 900, fallMul: 1.4, jumpCut: 0.45 }
    };
    var pre = PP.fieldset(controls, 'Presets');
    PP.buttons(pre, Object.keys(presets), function (name) { Object.keys(presets[name]).forEach(function (k) { sliders[k].set(presets[name][k]); }); }, 0);
    function stats() {
      var g = game.options.physics.gravity, v = game.options.physics.jumpVel;
      return 'jump height = v² ÷ 2g = ' + (v * v / (2 * g)).toFixed(0) + ' px (' + (v * v / (2 * g) / 16).toFixed(1) + ' tiles)\n' + 'time to top  = v ÷ g    = ' + (v / g * 1000).toFixed(0) + ' ms';
    }
    setInterval(function () {
      var p = game.player; if (!p) return;
      out.textContent = stats() + '\n\nvelocity  x ' + p.vx.toFixed(0).padStart(5) + '  y ' + p.vy.toFixed(0).padStart(5) + '\non floor  ' + p.grounded + '\ncoyote    ' + Math.max(0, p.coyote * 1000).toFixed(0) + ' ms left\nbuffer    ' + Math.max(0, p.buffer * 1000).toFixed(0) + ' ms left\njumps ' + jumps + ' · coyote saves ' + coyoteJumps;
    }, 100);
  }

  /* ══ Lesson 06 · Collision stepper ══════════════════════════════════ */
  function collisionLab(host) {
    var TILES = ['............', '............', '............', '........#...', '........#...', '........#...', '############'];
    var scenarios = {
      floor: { label: 'Landing on a floor', box: { x: 40, y: 30, vx: 0, vy: 2 }, g: 0.6 },
      wall: { label: 'Running into a wall', box: { x: 70, y: 82, vx: 4, vy: 0 }, g: 0.6 },
      seam: { label: 'Sliding over tile seams', box: { x: 4, y: 82, vx: 3, vy: 0 }, g: 2.5 },
      tunnel: { label: 'Very fast fall (tunnelling)', box: { x: 150, y: 2, vx: 0, vy: 40 }, g: 0 }
    };
    var current = 'floor', method = 'separate', substeps = false, box, history = [], phase = 0, pending = null;
    var bar = el('div', 'px-btn-row'); host.appendChild(bar);
    PP.buttons(bar, Object.keys(scenarios).map(function (k) { return { label: scenarios[k].label, id: k }; }), function (b) { current = b.id; reset(); }, 0);
    var bar2 = el('div', 'px-btn-row'); host.appendChild(bar2);
    PP.buttons(bar2, [{ label: 'Resolve X, then Y', id: 'separate' }, { label: 'Resolve both at once', id: 'both' }], function (b) { method = b.id; reset(); }, 0);
    PP.toggle(bar2, 'Sub-steps (move ≤ 4 px at a time)', false, function (v) { substeps = v; reset(); });
    var c = el('canvas'); c.width = 192; c.height = 112; c.className = 'px-canvas-plain'; c.style.maxWidth = '640px'; c.setAttribute('role', 'img'); host.appendChild(c);
    var ctrl = el('div', 'px-btn-row'); host.appendChild(ctrl);
    var out = el('pre', 'px-readout'); out.setAttribute('aria-live', 'polite'); host.appendChild(out);
    PP.buttons(ctrl, ['▶ Step (half frame)', '⏩ Play 20 frames', '↺ Reset'], function (b, i) { if (i === 0) step(); if (i === 1) { var n = 0; var id = setInterval(function () { step(); step(); if (++n >= 20) clearInterval(id); }, 120); } if (i === 2) reset(); });
    function solid(tx, ty) { return ty >= 0 && ty < TILES.length && tx >= 0 && tx < 12 && TILES[ty][tx] === '#'; }
    function overlapping(b) { var hits = []; for (var ty = Math.floor(b.y / 16); ty <= Math.floor((b.y + 13.99) / 16); ty++) for (var tx = Math.floor(b.x / 16); tx <= Math.floor((b.x + 9.99) / 16); tx++) if (solid(tx, ty)) hits.push([tx, ty]); return hits; }
    function reset() { var s = scenarios[current]; box = { x: s.box.x, y: s.box.y, vx: s.box.vx, vy: s.box.vy }; history = []; phase = 0; pending = null; draw('Press Step. First half: move to where velocity says. Second half: fix any overlap.'); }
    function step() {
      var s = scenarios[current];
      if (phase === 0) {
        box.vy += s.g;
        pending = { from: { x: box.x, y: box.y }, to: { x: box.x + box.vx, y: box.y + box.vy } };
        var ghost = { x: pending.to.x, y: pending.to.y };
        var hits = overlapping(ghost);
        phase = 1;
        draw('MOVE: velocity (' + box.vx.toFixed(1) + ', ' + box.vy.toFixed(1) + ') puts the box at the red outline.\n' + (hits.length ? 'It overlaps ' + hits.length + ' solid tile(s) — that would be inside a wall.' : 'No overlap at the new position.'), ghost, hits);
        return;
      }
      phase = 0; var dx = box.vx, dy = box.vy; var n = substeps ? Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4)) : 1; var notes = [];
      for (var k = 0; k < n; k++) {
        if (method === 'separate') {
          box.x += dx / n; var hx = overlapping(box);
          if (hx.length) { var tx = hx[0][0]; box.x = dx > 0 ? tx * 16 - 10 : (tx + 1) * 16; box.vx = 0; notes.push('X: hit tile (' + hx[0] + ') → pushed to x = ' + box.x.toFixed(1)); }
          box.y += dy / n; var hy = overlapping(box);
          if (hy.length) { var ty = hy[0][1]; box.y = dy > 0 ? ty * 16 - 14 : (ty + 1) * 16; box.vy = 0; notes.push('Y: hit tile (' + hy[0] + ') → pushed to y = ' + box.y.toFixed(1)); }
        } else {
          box.x += dx / n; box.y += dy / n;
          // measure every overlap first, then push each out along its smaller side
          overlapping(box).map(function (t) {
            return { t: t, ox: dx > 0 ? box.x + 10 - t[0] * 16 : (t[0] + 1) * 16 - box.x, oy: dy > 0 ? box.y + 14 - t[1] * 16 : (t[1] + 1) * 16 - box.y };
          }).forEach(function (h) {
            if (h.ox < h.oy && dx !== 0) { if (box.vx !== 0) { box.x += dx > 0 ? -h.ox : h.ox; box.vx = 0; } notes.push('BOTH: tile (' + h.t + ') overlap x ' + h.ox.toFixed(1) + ' < y ' + h.oy.toFixed(1) + ' → pushed sideways: snagged on a flat floor!'); }
            else { if (box.vy !== 0) { box.y += dy > 0 ? -h.oy : h.oy; box.vy = 0; } notes.push('BOTH: tile (' + h.t + ') pushed up/down by ' + h.oy.toFixed(1)); }
          });
        }
      }
      if (box.y > 112) notes.push('The box fell through the floor — it skipped over the tile in a single step.');
      history.push({ x: box.x, y: box.y });
      draw('RESOLVE' + (n > 1 ? ' in ' + n + ' sub-steps' : '') + ':\n' + (notes.length ? notes.join('\n') : 'Nothing to fix.'));
    }
    function draw(msg, ghost, hits) {
      var ctx = c.getContext('2d'); ctx.clearRect(0, 0, 192, 112); ctx.fillStyle = '#d8f3f9'; ctx.fillRect(0, 0, 192, 112);
      var art = store.load();
      for (var y = 0; y < TILES.length; y++) for (var x = 0; x < 12; x++) if (TILES[y][x] === '#') ctx.drawImage(PC.bake(art.tiles[y === 6 ? 'G' : 'B'].px, art.palette), x * 16, y * 16);
      ctx.strokeStyle = 'rgba(26,28,44,.15)'; for (var gx = 0; gx <= 12; gx++) { ctx.beginPath(); ctx.moveTo(gx * 16 + 0.5, 0); ctx.lineTo(gx * 16 + 0.5, 112); ctx.stroke(); }
      for (var gy = 0; gy <= 7; gy++) { ctx.beginPath(); ctx.moveTo(0, gy * 16 + 0.5); ctx.lineTo(192, gy * 16 + 0.5); ctx.stroke(); }
      ctx.fillStyle = 'rgba(59,93,201,.25)'; history.forEach(function (h) { ctx.fillRect(Math.round(h.x), Math.round(h.y), 10, 14); });
      if (hits) { ctx.fillStyle = 'rgba(255,61,127,.35)'; hits.forEach(function (t) { ctx.fillRect(t[0] * 16, t[1] * 16, 16, 16); }); }
      ctx.fillStyle = '#3b5dc9'; ctx.fillRect(Math.round(box.x), Math.round(box.y), 10, 14);
      ctx.strokeStyle = '#1a1c2c'; ctx.strokeRect(Math.round(box.x) + 0.5, Math.round(box.y) + 0.5, 9, 13);
      if (ghost) { ctx.strokeStyle = '#ff3d7f'; ctx.setLineDash([2, 2]); ctx.strokeRect(Math.round(ghost.x) + 0.5, Math.round(ghost.y) + 0.5, 9, 13); ctx.setLineDash([]); }
      out.textContent = msg + '\n\nbox x ' + box.x.toFixed(1) + '  y ' + box.y.toFixed(1) + '   velocity (' + box.vx.toFixed(1) + ', ' + box.vy.toFixed(1) + ')';
      c.setAttribute('aria-label', 'Collision stepper. ' + out.textContent.replace(/\n/g, ' '));
    }
    reset();
  }

  function collisionGame(host) {
    var gameHost = el('div'); var controls = el('div', 'px-controls');
    var grid = el('div', 'px-lab-grid'); grid.appendChild(gameHost); grid.appendChild(controls); host.appendChild(grid);
    var game = PP.mountGame(gameHost, { debug: { hitbox: true } });
    var f = PP.fieldset(controls, 'Collision rules');
    PP.toggle(f, 'Show hitboxes + solid tiles', true, function (v) { game.set('debug.hitbox', v); });
    PP.toggle(f, 'Resolve X then Y (off = both at once)', true, function (v) { game.set('features.axisSeparate', v); });
    PP.toggle(f, 'Sub-steps', true, function (v) { game.set('features.substeps', v); });
    PP.toggle(f, 'One-way planks', true, function (v) { game.set('features.oneWay', v); });
    var f2 = PP.fieldset(controls, 'Stress test');
    PP.slider(f2, 'Max fall speed (px/s)', 200, 1600, 50, 320, function (v) { game.set('physics.maxFall', v); });
    controls.appendChild(el('p', 'px-note', 'Hold ↓ and press Space on a plank to drop through it. Turn sub-steps off and raise max fall speed, then fall into the first gap’s floor from the highest plank.'));
  }

  /* ══ Lesson 07 · Camera lab ═════════════════════════════════════════ */
  function cameraLab(host) {
    var gameHost = el('div'); var controls = el('div', 'px-controls');
    var grid = el('div', 'px-lab-grid'); grid.appendChild(gameHost); grid.appendChild(controls); host.appendChild(grid);
    var game = PP.mountGame(gameHost, { debug: { camera: true } });
    var f = PP.fieldset(controls, 'Follow');
    PP.buttons(f, [{ label: 'Locked to player', id: 'locked' }, { label: 'Dead zone', id: 'deadzone' }], function (b) { game.set('camera.follow', b.id); }, 1);
    PP.slider(f, 'Dead zone width', 0, 200, 4, 56, function (v) { game.set('camera.deadzoneW', v); }, function (v) { return v + ' px'; });
    PP.slider(f, 'Dead zone height', 0, 140, 4, 48, function (v) { game.set('camera.deadzoneH', v); }, function (v) { return v + ' px'; });
    PP.slider(f, 'Smoothing (0 = instant)', 0, 20, 1, 8, function (v) { game.set('camera.smoothing', v); });
    PP.slider(f, 'Look-ahead', 0, 80, 4, 24, function (v) { game.set('camera.lookahead', v); }, function (v) { return v + ' px'; });
    var f2 = PP.fieldset(controls, 'Edges & pixels');
    PP.toggle(f2, 'Clamp to level edges', true, function (v) { game.set('camera.clamp', v); });
    PP.toggle(f2, 'Snap camera to whole pixels', true, function (v) { game.set('camera.snap', v); });
    PP.toggle(f2, 'Show camera debug', true, function (v) { game.set('debug.camera', v); });
    var f3 = PP.fieldset(controls, 'Parallax');
    PP.toggle(f3, 'Background layers on', true, function (v) { game.set('parallax.enabled', v); });
    PP.slider(f3, 'Far hills factor', 0, 1.2, 0.05, 0.2, function (v) { game.set('parallax.far', v); }, function (v) { return '× ' + v.toFixed(2); });
    PP.slider(f3, 'Near town factor', 0, 1.2, 0.05, 0.5, function (v) { game.set('parallax.near', v); }, function (v) { return '× ' + v.toFixed(2); });
  }

  /* ══ Lesson 08 · State machine lab ══════════════════════════════════ */
  function stateLab(host) {
    var gameHost = el('div'); var side = el('div', 'px-controls');
    var grid = el('div', 'px-lab-grid'); grid.appendChild(gameHost); grid.appendChild(side); host.appendChild(grid);
    var svgNS = 'http://www.w3.org/2000/svg';
    var nodes = { idle: [60, 40], run: [200, 40], jump: [60, 130], fall: [200, 130], land: [130, 200] };
    var edges = [['idle', 'run'], ['run', 'idle'], ['idle', 'jump'], ['run', 'jump'], ['jump', 'fall'], ['fall', 'land'], ['fall', 'idle'], ['fall', 'run'], ['land', 'idle'], ['land', 'run'], ['idle', 'fall'], ['run', 'fall'], ['land', 'jump']];
    var svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('viewBox', '0 0 260 240'); svg.setAttribute('class', 'px-state-diagram');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Animation state machine: idle, run, jump, fall, land. The current state is highlighted.');
    var edgeEls = {}, nodeEls = {};
    edges.forEach(function (e) {
      var a = nodes[e[0]], b = nodes[e[1]]; var line = document.createElementNS(svgNS, 'line');
      var off = e[0] < e[1] ? 4 : -4;
      line.setAttribute('x1', a[0] + off); line.setAttribute('y1', a[1] + off); line.setAttribute('x2', b[0] + off); line.setAttribute('y2', b[1] + off);
      line.setAttribute('stroke', 'currentColor'); line.setAttribute('stroke-opacity', '.25'); line.setAttribute('stroke-width', '2');
      svg.appendChild(line); edgeEls[e[0] + '>' + e[1]] = line;
    });
    Object.keys(nodes).forEach(function (k) {
      var g = document.createElementNS(svgNS, 'g'); var r = document.createElementNS(svgNS, 'rect');
      r.setAttribute('x', nodes[k][0] - 30); r.setAttribute('y', nodes[k][1] - 14); r.setAttribute('width', 60); r.setAttribute('height', 28); r.setAttribute('rx', 3);
      r.setAttribute('fill', '#fffdf7'); r.setAttribute('stroke', '#1a1c2c'); r.setAttribute('stroke-width', '2');
      var t = document.createElementNS(svgNS, 'text'); t.setAttribute('x', nodes[k][0]); t.setAttribute('y', nodes[k][1] + 4); t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-family', 'JetBrains Mono, monospace'); t.setAttribute('font-size', '11'); t.setAttribute('font-weight', '700'); t.setAttribute('fill', '#1a1c2c'); t.textContent = k.toUpperCase();
      g.appendChild(r); g.appendChild(t); svg.appendChild(g); nodeEls[k] = r;
    });
    side.appendChild(svg);
    var log = el('div', 'px-log'); log.setAttribute('aria-live', 'polite'); log.setAttribute('aria-label', 'Transition log');
    var strip = el('div', 'px-frames'); strip.setAttribute('aria-label', 'Frames of the current animation');
    function show(state, prev) {
      Object.keys(nodeEls).forEach(function (k) { nodeEls[k].setAttribute('fill', k === state ? '#ffc93c' : '#fffdf7'); });
      Object.keys(edgeEls).forEach(function (k) { edgeEls[k].setAttribute('stroke', k === prev + '>' + state ? '#e4572e' : 'currentColor'); edgeEls[k].setAttribute('stroke-opacity', k === prev + '>' + state ? '1' : '.25'); });
      strip.innerHTML = ''; var art = store.load(); var a = art.sprites.courier.anims[state];
      a.frames.forEach(function (f, i) { var c = el('canvas'); c.width = 16; c.height = 16; c.style.width = '40px'; c.style.height = '40px'; c.style.imageRendering = 'pixelated'; c.getContext('2d').drawImage(PC.bake(f, art.palette), 0, 0); strip.appendChild(c); });
      strip.appendChild(el('span', 'px-note', state + ': ' + a.frames.length + ' frame' + (a.frames.length > 1 ? 's' : '') + ' at ' + a.fps + ' fps'));
    }
    var game = PP.mountGame(gameHost, { debug: { state: true }, hooks: { onState: function (prev, next, reason) {
      show(next, prev);
      var line = el('div', null, (game ? game.stats.time.toFixed(2) : '0.00') + 's  ' + prev + ' → ' + next + '   because ' + reason);
      log.insertBefore(line, log.firstChild); while (log.childNodes.length > 40) log.removeChild(log.lastChild);
    } } });
    gameHost.appendChild(strip); gameHost.appendChild(log);
    var f = PP.fieldset(side, 'Experiments');
    PP.toggle(f, 'Choose animation from keys instead of physics (the bug)', false, function (v) { game.set('features.inputAnim', v); });
    PP.toggle(f, 'Hard-landing state', true, function (v) { game.set('features.landState', v); });
    PP.toggle(f, 'Label state above player', true, function (v) { game.set('debug.state', v); });
    show('idle', null);
  }

  /* ══ Lesson 09 · Level + juice ══════════════════════════════════════ */
  function juiceLab(host) {
    var gameHost = el('div'); var controls = el('div', 'px-controls');
    var grid = el('div', 'px-lab-grid'); grid.appendChild(gameHost); grid.appendChild(controls); host.appendChild(grid);
    var game = PP.mountGame(gameHost, {});
    var f = PP.fieldset(controls, 'Juice');
    var boxes = {};
    [['squash', 'Squash & stretch'], ['particles', 'Dust + sparkle particles'], ['shake', 'Screen shake on a fall'], ['hitstop', 'Hit-stop (tiny freeze) on pickup'], ['sound', 'Sound effects']].forEach(function (j) {
      boxes[j[0]] = PP.toggle(f, j[1], game.options.juice[j[0]], function (v) { game.set('juice.' + j[0], v); });
    });
    PP.buttons(f, ['All off', 'All on'], function (b, i) { Object.keys(boxes).forEach(function (k) { boxes[k].checked = !!i; game.set('juice.' + k, !!i); }); });
    controls.appendChild(el('p', 'px-note', 'Play once with everything off, then once with everything on. Same rules, same level — which feels better, and which single toggle mattered most?'));
  }
  function levelLab(host) { mapEditor(host, { autoGround: true, pacing: true }); }

  /* ══ Lesson 10 · Ship it ════════════════════════════════════════════ */
  var BEST_KEY = 'classroomos-pixel-courier-best';
  function shipLab(host, menusOnly) {
    var gameHost = el('div'); host.appendChild(gameHost);
    var best = null; try { best = Number(localStorage.getItem(BEST_KEY)) || null; } catch (e) { best = null; }
    var status = el('p', 'px-note'); status.setAttribute('aria-live', 'polite');
    var game = PP.mountGame(gameHost, { menus: true, juice: { sound: true }, hooks: { onEvent: function (t, d) {
      if (t === 'win') {
        var msg = 'Delivered in ' + d.time.toFixed(2) + ' s with ' + d.deaths + ' falls.';
        if (!best || d.time < best) { best = d.time; try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* storage blocked */ } msg += ' New best!'; }
        game.setBest(best); status.textContent = msg;
      }
    } } });
    game.setBest(best);
    host.appendChild(status);
    if (menusOnly) return;
    var row = el('div', 'px-actions'); host.appendChild(row);
    var dl = el('button', 'px-button', '⬇ Download my art.js'); dl.type = 'button';
    dl.addEventListener('click', function () { PC.download('art.js', store.exportJS(), 'text/javascript'); });
    row.appendChild(dl);
    var pack = el('a', 'px-button alt', '⬇ Pixel Courier starter pack (.zip)'); pack.href = '../../downloads/pixel-courier-starter-pack.zip'; pack.setAttribute('download', '');
    row.appendChild(pack);
    var label = el('label', 'px-button alt', '⬆ Load art.js or .json'); var file = el('input'); file.type = 'file'; file.accept = '.js,.json,text/javascript,application/json'; file.style.position = 'absolute'; file.style.opacity = '0'; file.style.width = '1px';
    label.appendChild(file); row.appendChild(label);
    file.addEventListener('change', function () {
      var f = file.files[0]; if (!f) return;
      f.text().then(function (t) { try { store.importText(t); status.textContent = 'Loaded ' + f.name + '. Every lesson now uses this art.'; } catch (e) { status.textContent = 'That file is not Pixel Courier art (' + e.message + ').'; } });
    });
    var reset = el('button', 'px-button alt', 'Reset all art'); reset.type = 'button';
    reset.addEventListener('click', function () { if (global.confirm('Reset your sprites, tiles and level to the starter art? Download art.js first if you want to keep them.')) { store.reset(); status.textContent = 'Art reset to the starter pack.'; } });
    row.appendChild(reset);
  }

  var LABS = {
    sprite: spriteLab, scaling: scalingLab, anim: animLab, tiles: tileLab, map: function (h) { mapEditor(h, { autoGround: true }); }, bitmask: bitmaskLab,
    timestep: timestepLab, layers: layerLab, move: moveLab, collision: collisionLab, 'collision-game': collisionGame,
    camera: cameraLab, states: stateLab, juice: juiceLab, level: levelLab, ship: function (h) { shipLab(h, false); },
    play: function (h) { shipLab(h, true); }, game: function (h) { PP.mountGame(h, {}); }
  };
  document.querySelectorAll('[data-px-lab]').forEach(function (host) {
    var fn = LABS[host.getAttribute('data-px-lab')];
    if (fn) { try { fn(host); } catch (e) { console.error(e); host.appendChild(el('p', 'px-note', 'This lab could not start: ' + e.message)); } }
  });
}(window));
