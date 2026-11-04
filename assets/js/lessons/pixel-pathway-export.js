/* Portable, engine-neutral assets plus a local, editable browser game. */
(function () {
  'use strict';
  var PC = window.PixelCourier;
  var root = new URL('../../../', document.currentScript.src);
  var section = document.createElement('section');
  section.className = 'px-callout';
  section.innerHTML = '<h2>Take your work anywhere</h2><p>Download all your sprites, animations, tiles and level as PNG, JSON and text, together with an editable browser game. Import the assets into Godot, Unity, GameMaker, Scratch or a web project. Each engine needs its own collision, animation and gameplay setup; the ZIP includes a format guide.</p><div class="px-btn-row"><button type="button" data-export>Download portable project (.zip)</button><button type="button" data-json>Download project JSON</button><label>Restore art JSON or art.js <input type="file" accept=".json,.js"></label></div><p role="status"></p><p>Saved art travels across all lessons. The ZIP also captures current game settings on this page; experimental sliders on other pages, imported reference images, lesson checkmarks and scores are not shared art. Export each experiment before leaving its page.</p>';
  var main = document.querySelector('main');
  if (!main) return;
  var first = main.querySelector('[data-px-lab]');
  if (first) { var top = first; while (top.parentElement !== main) top = top.parentElement; top.after(section); }
  else main.appendChild(section);
  var status = section.querySelector('[role="status"]');
  section.querySelector('[data-json]').onclick = function () { PC.download('pixel-courier-art.json', JSON.stringify(PC.store.load(), null, 2), 'application/json'); };
  section.querySelector('input').onchange = async function (e) {
    var file = e.target.files[0]; if (!file) return;
    try {
      var text = await file.text();
      var raw = JSON.parse(text.trim().startsWith('{') ? text : text.replace(/^[\s\S]*?=\s*/, '').replace(/;\s*$/, ''));
      if (!raw || !raw.sprites || !raw.tiles || !Array.isArray(raw.level) || !Array.isArray(raw.palette)) throw new Error('Choose a Pixel Courier art export.');
      PC.store.importText(text); status.textContent = 'Art restored. All lessons now use this art.';
    } catch (err) { status.textContent = 'Could not restore: ' + err.message; }
    e.target.value = '';
  };
  function png(canvas) { return new Promise(function (resolve, reject) { canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error('PNG encoding failed')); }); }); }
  async function fetchText(path) { var response = await fetch(new URL(path, root)); if (!response.ok) throw new Error('Could not load ' + path); return response.text(); }
  var zipReady;
  function loadZip() {
    if (window.JSZip) return Promise.resolve();
    if (!zipReady) zipReady = new Promise(function (resolve, reject) {
      var script = document.createElement('script'); script.src = new URL('assets/vendor/jszip.min.js', root);
      script.onload = resolve; script.onerror = function () { zipReady = null; script.remove(); reject(new Error('ZIP library could not load. Try again.')); }; document.head.appendChild(script);
    });
    return zipReady;
  }
  section.querySelector('[data-export]').onclick = async function () {
    var button = this; button.disabled = true; status.textContent = 'Packing your project…';
    try {
      // Snapshot before any network requests, so the whole archive describes one moment.
      var art = JSON.parse(JSON.stringify(PC.store.load()));
      var settings = PC.instances.map(function (game) { return JSON.parse(JSON.stringify(game.options)); });
      await loadZip();
      var zip = new window.JSZip();
      var runtime = await fetchText('assets/js/lessons/pixel-courier-kit.js');
      zip.file('pixel-courier-kit.js', runtime);
      zip.file('art.json', JSON.stringify(art, null, 2));
      zip.file('art.js', 'window.PIXEL_COURIER_ART = ' + JSON.stringify(art) + ';\n');
      zip.file('settings.json', JSON.stringify(settings, null, 2));
      zip.file('project.js', 'PixelCourier.store.save(window.PIXEL_COURIER_ART);\nvar experiments = ' + JSON.stringify(settings) + ';\nwindow.game = PixelCourier.createGame(document.querySelector("canvas"), experiments[0] || {});\n');
      zip.file('index.html', '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>My Pixel Courier</title><style>body{background:#181c28;color:white;font:18px system-ui;text-align:center}canvas{width:min(960px,95vw);image-rendering:pixelated}</style><h1>My Pixel Courier</h1><p>Click the game. Arrow keys move; Space jumps; P pauses.</p><canvas tabindex="0" aria-label="Pixel Courier game"></canvas><script src="pixel-courier-kit.js"></script><script src="art.js"></script><script src="project.js"></script></html>');
      var animations = {};
      for (var name of Object.keys(art.sprites)) {
        for (var anim of Object.keys(art.sprites[name].anims)) {
          var a = art.sprites[name].anims[anim], path = 'sprites/' + name + '-' + anim + '.png';
          zip.file(path, await png(PC.sheetCanvas(a.frames, art.palette, 1)));
          animations[name + '/' + anim] = { image: path, fps: a.fps, frames: a.frames.map(function (_, i) { return { x: i * 16, y: 0, width: 16, height: 16 }; }) };
        }
      }
      zip.file('animations.json', JSON.stringify(animations, null, 2));
      zip.file('tiles/tileset.png', await png(PC.sheetCanvas(PC.TILE_KEYS.map(function (k) { return art.tiles[k].px; }), art.palette, 1)));
      zip.file('tiles/tileset.json', JSON.stringify(PC.TILE_KEYS.map(function (key, i) { return { symbol: key, id: i, x: i * 16, y: 0, width: 16, height: 16, name: art.tiles[key].name, solid: !!art.tiles[key].solid, oneWay: !!art.tiles[key].oneWay }; }), null, 2));
      zip.file('level.txt', art.level.join('\n'));
      zip.file('README.txt', 'PIXEL COURIER PORTABLE PROJECT\n\nUnzip everything, then open index.html in a browser. No account, installation or network is required. Edit project.js and the included runtime to change the game. Host these files on any static web server.\n\nOTHER ENGINES\nImport sprites/*.png and tiles/tileset.png as textures. Use nearest-neighbour filtering, no compression, and 16 x 16 frame slicing. PNG alpha is transparency. animations.json supplies frame rectangles and FPS for every character and state. tiles/tileset.json maps level symbols to tiles and collision flags. level.txt is a row-major grid of characters; see tileAt(), reset() and loadArt() in the included runtime for object markers and spawning. Recreate collision shapes and game logic in your engine; this is not a native Godot, Unity or Scratch project.\n\nART FORMAT\nart.json is engine-neutral editable data. palette[0] is transparent. Each frame is 256 hexadecimal palette indices, row-major, 16 x 16. sprites contains all animations; tiles contains pixels and collision flags; level contains map rows. art.js contains the same data as a browser variable. Restore either art file using the lesson export panel.\n\nSETTINGS\nsettings.json records each running game on the exporting lesson in display order (functions omitted). project.js starts the first one. Art is shared between lessons, but experiment settings are page-local: export before leaving a lesson. Standalone theory demos, reference sheets, progress and scores are not included.\n\nKeep attribution for any outside artwork you imported. ClassroomOS Pixel Courier runtime and starter art are included from the pathway.\n');
      PC.download('pixel-courier-portable.zip', await zip.generateAsync({ type: 'blob' }));
      status.textContent = 'Project exported. Unzip and open index.html, or import the PNG and JSON assets into your chosen tool.';
    } catch (err) { status.textContent = 'Export failed: ' + err.message + ' You can still download project JSON.'; }
    finally { button.disabled = false; }
  };
}());
