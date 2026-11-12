/* ═════════════════════════════════════════════════════════════
   Lesson page wiring
   ═════════════════════════════════════════════════════════════ */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var D = window.RogueDungeon, CS = D.CRAWLSPACE;
  var DATA = window.ROGUE_LESSON_DATA || {};
  var PRESETS = DATA.PRESETS, BROKEN = DATA.BROKEN;
  if (!D || !PRESETS) return;

  function h(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function download(name, text) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/html' }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // JSON that fits on screen: short lists and flat objects stay on one line.
  function pretty(v, ind) {
    ind = ind || '';
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    var prim = function (x) { return x === null || typeof x !== 'object'; };
    var keys = Array.isArray(v) ? null : Object.keys(v);
    var flat = Array.isArray(v)
      ? (v.every(prim) ? '[' + v.map(function (x) { return JSON.stringify(x); }).join(', ') + ']' : null)
      : (keys.every(function (k) { return prim(v[k]) || (Array.isArray(v[k]) && v[k].every(prim)); })
        ? '{ ' + keys.map(function (k) { return JSON.stringify(k) + ': ' + pretty(v[k]); }).join(', ') + ' }' : null);
    if (flat && ind.length + flat.length < 100) return flat;
    var inner = ind + '  ';
    if (Array.isArray(v)) return '[\n' + v.map(function (x) { return inner + pretty(x, inner); }).join(',\n') + '\n' + ind + ']';
    return '{\n' + keys.map(function (k) { return inner + JSON.stringify(k) + ': ' + pretty(v[k], inner); }).join(',\n') + '\n' + ind + '}';
  }

  // ---- build-along: slice the program into its steps ----
  var sections = {};
  window.ROGUE_MINI_JS.split(/^\/\/ ---- (\w+) ----\n/m).forEach(function (part, i, arr) {
    if (i % 2 === 1) sections[part] = arr[i + 1].replace(/\n+$/, '');
  });
  document.querySelectorAll('[data-mini]').forEach(function (pre) { pre.textContent = sections[pre.dataset.mini] || ''; });
  var fullDoc = window.ROGUE_MINI_HEAD + window.ROGUE_MINI_JS + window.ROGUE_MINI_TAIL;
  $('code-skeleton').textContent = window.ROGUE_MINI_HEAD + '  // …steps 1 to 8 go here…\n' + window.ROGUE_MINI_TAIL;
  $('code-full').textContent = fullDoc;
  $('mini-download').addEventListener('click', function () { download('rogue.html', fullDoc); $('mini-status').textContent = 'Saved rogue.html'; });
  $('mini-copy').addEventListener('click', function () {
    var done = function (ok) { $('mini-status').textContent = ok ? 'Copied!' : 'Copy failed. Open "Show the complete program" and select it.'; };
    if (navigator.clipboard) navigator.clipboard.writeText(fullDoc).then(function () { done(true); }, function () { done(false); }); else done(false);
  });

  // ---- tiny maps on a canvas (seeds, checker) ----
  var COLORS = { ' ': '#0d0b09', '.': '#8a7a5e', '#': '#5f5240', '>': '#ffd98a' };
  function drawMini(canvas, level, scale, dist) {
    canvas.width = level.cols * scale; canvas.height = level.rows * scale;
    var g = canvas.getContext('2d'), far = 1, x, y;
    if (dist) for (y = 0; y < level.rows; y++) for (x = 0; x < level.cols; x++) far = Math.max(far, dist[y][x]);
    for (y = 0; y < level.rows; y++) {
      for (x = 0; x < level.cols; x++) {
        var t = level.tiles[y][x], c = COLORS[t];
        if (dist && t !== ' ' && t !== '>') c = dist[y][x] < 0 ? '#d946ef' : 'hsl(' + Math.round(200 - 200 * dist[y][x] / far) + ' 60% 45%)';
        g.fillStyle = c; g.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    g.fillStyle = '#ff6b5e';
    level.monsters.forEach(function (m) { g.fillRect(m.x * scale, m.y * scale, scale, scale); });
    g.fillStyle = '#ffd166';
    level.items.forEach(function (i) { g.fillRect(i.x * scale, i.y * scale, scale, scale); });
    g.fillStyle = '#ffffff';
    g.fillRect(level.start.x * scale - 1, level.start.y * scale - 1, scale + 2, scale + 2);
    if (level.tiles[level.stairs.y][level.stairs.x] === '>') { g.fillStyle = '#ffd98a'; g.fillRect(level.stairs.x * scale - 1, level.stairs.y * scale - 1, scale + 2, scale + 2); }
  }

  // ---- lab ----
  var sel = $('lab-preset'), ta = $('lab-config'), status = $('lab-status'), host = $('lab-game'), game = null, current = null;
  Object.keys(PRESETS).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = PRESETS[k].label; sel.appendChild(o); });
  var CS_KEY = D.rulesKey(PRESETS.crawlspace.config);
  function readConfig(quiet) {
    try { return JSON.parse(ta.value); }
    catch (e) {
      if (quiet) return null;
      var m = /position (\d+)/.exec(e.message), line = m ? ta.value.slice(0, +m[1]).split('\n').length : null;
      status.className = 'lab-status bad'; status.textContent = 'JSON problem' + (line ? ' near line ' + line : '') + ': ' + e.message + '. Look for a missing comma or quote.';
      return null;
    }
  }
  // The config the other tools should use: the Lab's if it runs, else Crawlspace.
  function labRules() { return current || PRESETS.crawlspace.config; }
  function update3d(S) {
    var link = $('to3d-link'), text = $('to3d-text'), same = current && D.rulesKey(current) === CS_KEY;
    if (same && S) {
      link.href = '../../../apps/crawlspace/index.html?seed=' + encodeURIComponent(S.seed);
      link.removeAttribute('aria-disabled'); link.tabIndex = 0;
      text.textContent = 'These are Crawlspace\'s rules, so Crawlspace will build this exact dungeon from seed “' + S.seed + '”, starting at depth 1, with every room, tunnel and monster in the same place.';
    } else {
      link.href = '../../../apps/crawlspace/index.html';
      link.setAttribute('aria-disabled', 'true'); link.tabIndex = -1;
      text.textContent = 'Crawlspace only knows its own rules. A seed is half of a dungeon\'s recipe; the rules are the other half. Pick the Crawlspace preset (you can still change the seed, the player and the words) to walk your dungeon in 3D.';
    }
  }
  function run() {
    var cfg = readConfig(); if (!cfg) return;
    try {
      game = RogueEngine(host, cfg, { onChange: update3d });
      current = cfg;
      status.className = 'lab-status ok'; status.textContent = 'Running “' + (cfg.title || 'My Roguelike') + '”. Click the map, then use the arrow keys.';
      update3d(game.state());
      fightOptions();
      if (window._rogueStudioInstance) {
        window._rogueStudioInstance.applyConfig(cfg);
      }
    } catch (e) { status.className = 'lab-status bad'; status.textContent = e.message; }
  }
  function loadPreset() { ta.value = pretty(PRESETS[sel.value].config); run(); }
  sel.addEventListener('change', loadPreset);
  $('lab-run').addEventListener('click', run);
  $('lab-reset').addEventListener('click', loadPreset);
  $('lab-download').addEventListener('click', function () {
    var cfg = readConfig(); if (!cfg) return;
    try { RogueEngine(null, cfg); } catch (e) { status.className = 'lab-status bad'; status.textContent = 'Fix the config first: ' + e.message; return; }
    var json = JSON.stringify(cfg, null, 2).replace(/</g, '\\u003c');
    var title = String(cfg.title || 'My Roguelike').replace(/[<>&"]/g, '');
    var html = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + title + '</title>\n</head>\n<' + 'body style="margin:0;padding:1rem;background:#070605;">\n<div id="game" style="max-width:980px;margin:0 auto;"></div>\n<' + 'script>\n' +
      'var RogueDungeon = (' + D.factory.toString() + ')();\n' + RogueEngine.toString() + '\nvar CONFIG = ' + json + ';\nRogueEngine(document.getElementById("game"), CONFIG).focus();\n<' + '/script>\n</' + 'body>\n</' + 'html>\n';
    download(title.replace(/\W+/g, '-').toLowerCase() + '.html', html);
    status.className = 'lab-status ok'; status.textContent = 'Saved. Double-click the file to play it, or hand it in.';
  });
  function playSeed(seed) {
    var cfg = readConfig(true) || PRESETS.crawlspace.config;
    cfg.seed = String(seed);
    ta.value = pretty(cfg);
    run();
    $('lab').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (game && game.focus) setTimeout(game.focus, 400);
  }

  // ---- seeds ----
  function seedLevel(seed, depth) {
    try { return D.generate(labRules(), seed, depth || 1); } catch (e) { return D.generate(CS, seed, depth || 1); }
  }
  function showSeed() {
    var s = $('seed-in').value.trim() || 'lantern';
    var r = D.mulberry32(D.levelSeed(s, 1)), rolls = [];
    for (var i = 0; i < 8; i++) rolls.push(Math.floor(r() * 6) + 1);
    $('seed-nums').textContent = '“' + s + '” → seed number ' + D.toSeed(s) + ' → depth 1 rolls a die: ' + rolls.join(', ') + ', …';
    var lvl = seedLevel(s, 1);
    drawMini($('seed-canvas'), lvl, 4);
    $('seed-canvas').setAttribute('aria-label', 'Map of the dungeon seed ' + s + ' makes: ' + (lvl.rooms.length ? lvl.rooms.length + ' rooms, ' : '') + lvl.monsters.length + ' monsters, ' + lvl.items.length + ' items');
    var rows = '<thead><tr><th scope="col">Depth</th><th scope="col">Level seed (from “' + s.replace(/[<>&]/g, '') + '” and the depth)</th><th scope="col">Monsters</th><th scope="col">Items</th></tr></thead><tbody>';
    for (var d = 1; d <= 4; d++) {
      var L = seedLevel(s, d);
      rows += '<tr><td class="num">' + d + '</td><td class="num">' + L.seed + '</td><td class="num">' + L.monsters.length + '</td><td class="num">' + L.items.length + '</td></tr>';
    }
    $('level-seeds').innerHTML = rows + '</tbody>';
  }
  function showSeedGrid() {
    var grid = $('seed-grid'); grid.replaceChildren();
    ['lantern', 'lanterns', 'Lantern', 'lantern!', '1', '2'].forEach(function (s) {
      var b = h('button', 'seed-card'), c = h('canvas');
      b.type = 'button';
      var L = seedLevel(s, 1);
      drawMini(c, L, 3);
      c.setAttribute('aria-hidden', 'true');
      b.appendChild(c); b.appendChild(h('b', null, '“' + s + '”')); b.appendChild(h('small', null, 'seed ' + D.toSeed(s) + ' · ' + L.monsters.length + ' monsters'));
      b.setAttribute('aria-label', 'Play seed ' + s + ' in the Lab');
      b.addEventListener('click', function () { playSeed(s); });
      grid.appendChild(b);
    });
  }
  $('seed-in').addEventListener('input', showSeed);
  $('seed-send').addEventListener('click', function () { playSeed($('seed-in').value.trim() || 'lantern'); });

  // ---- checker ----
  function checkReport(cfg, label) {
    var out = $('check-out');
    out.replaceChildren(h('p', null, 'Building and checking 300 dungeons…'));
    setTimeout(function () {
      var t0 = performance.now(), n = 0, ok = 0, whole = 0, lost = 0, steps = [], errors = 0, firstErr = '', worst = null;
      for (var s = 0; s < 100; s++) {
        for (var d = 1; d <= 3; d++) {
          var L;
          try { L = D.generate(cfg, 'check-' + s, d); } catch (e) { errors++; firstErr = firstErr || e.message; continue; }
          var r = D.inspect(L); n++;
          if (r.stairs >= 0) { ok++; steps.push(r.stairs); } else if (!worst) worst = L;
          if (r.reached === r.open) whole++;
          lost += r.lostThings;
        }
      }
      var ms = Math.round(performance.now() - t0);
      out.replaceChildren(h('h3', null, 'Checking ' + (label || '“' + (cfg.title || 'the Lab') + '”')));
      var ul = h('ul', 'check-list');
      function item(cls, text) { ul.appendChild(h('li', cls, text)); }
      if (errors) item('bad', errors + ' dungeons could not be built: ' + firstErr);
      if (!n) { out.appendChild(ul); return; }
      item(ok === n ? 'good' : 'bad', 'The stairs can be reached in ' + ok + ' of ' + n + ' dungeons.' + (ok < n ? ' In the others the player is stuck forever.' : ''));
      item(whole === n ? 'good' : 'warn', 'Every floor square can be reached in ' + whole + ' of ' + n + ' dungeons.' + (whole < n ? ' The rest have sealed-off pockets the player will never see.' : ''));
      item(lost ? 'warn' : 'good', lost ? lost + ' monsters or items were placed where the player can never reach them.' : 'Every monster and item can be reached.');
      if (steps.length) {
        steps.sort(function (a, b) { return a - b; });
        var avg = steps.reduce(function (a, b) { return a + b; }, 0) / steps.length;
        item('good', 'Steps from the start to the stairs: shortest ' + steps[0] + ', average ' + avg.toFixed(1) + ', longest ' + steps[steps.length - 1] + '.');
      }
      item('good', 'Built and flood-filled ' + n + ' dungeons in ' + ms + ' ms. No player could test that many.');
      out.appendChild(ul);
      var shown = worst || D.generate(cfg, 'check-0', 1);
      var fig = h('figure'); fig.style.margin = '0.4rem 0';
      var c = h('canvas'); c.style.cssText = 'display:block;max-width:100%;height:auto;image-rendering:pixelated;border-radius:8px;';
      drawMini(c, shown, 5, D.distanceMap(shown.tiles, shown.start));
      c.setAttribute('role', 'img');
      c.setAttribute('aria-label', worst ? 'A failing dungeon: magenta floor cannot be reached from the start, including the stairs.' : 'A distance map: floor coloured from blue near the start to red far away.');
      fig.appendChild(c);
      fig.appendChild(h('figcaption', 'credit', worst ? 'One dungeon that failed. White is the start, gold is the stairs, and magenta is floor the flood never reached.' : 'The distance map of one dungeon: blue is near the start (white), red is far, and the stairs (gold) sit at the far end.'));
      out.appendChild(fig);
      var leg = h('div', 'legend');
      leg.innerHTML = '<span><i style="background:#ffffff;box-shadow:inset 0 0 0 1px #64748b"></i>start</span><span><i style="background:#ffd98a"></i>stairs</span><span><i style="background:hsl(200 60% 45%)"></i>near</span><span><i style="background:hsl(0 60% 45%)"></i>far</span><span><i style="background:#d946ef"></i>never reached</span>';
      out.appendChild(leg);
    }, 30);
  }
  $('check-run').addEventListener('click', function () { var cfg = readConfig(true); checkReport(cfg && cfg.dungeon ? cfg : labRules()); });
  $('check-broken').addEventListener('click', function () { checkReport(BROKEN, 'a cave generator with no flood fill and stairs dropped anywhere'); });

  // ---- fight calculator ----
  function fighter(depth) {
    var p = labRules().player || {}, g = p.perLevel || {};
    var hp = (p.hp || 20) + (depth - 1) * (g.hp == null ? 3 : g.hp), atk = (p.atk || 3) + (depth - 1) * (g.atk == null ? 1 : g.atk);
    return { hp: hp, atk: atk };
  }
  function types() { var m = labRules().monsters; return m && Array.isArray(m.types) && m.types.length ? m.types : CS.monsters.types; }
  function fightOptions() {
    var s = $('fight-mon'), old = s.value; s.replaceChildren();
    types().forEach(function (t, i) { var o = document.createElement('option'); o.value = i; o.textContent = t.name + ' (' + t.ch + ')'; s.appendChild(o); });
    if (old && s.options[old]) s.value = old;
    fight();
  }
  function simulate(you, mon, times) {
    var wins = 0, lostSum = 0, losses = [];
    for (var k = 0; k < times; k++) {
      var hp = you.hp, mhp = mon.hp;
      while (hp > 0) {
        mhp -= 1 + Math.floor(Math.random() * you.atk);
        if (mhp <= 0) break;
        hp -= 1 + Math.floor(Math.random() * mon.atk);
      }
      if (hp > 0) wins++;
      var lostHp = you.hp - Math.max(0, hp);
      lostSum += lostHp; losses.push(lostHp);
    }
    losses.sort(function (a, b) { return a - b; });
    return { win: wins / times, avgLost: lostSum / times, bad: losses[Math.floor(times * 0.95)] };
  }
  function fight() {
    var depth = Math.max(1, Math.min(30, parseInt($('fight-depth').value, 10) || 1));
    var mon = types()[+$('fight-mon').value || 0] || types()[0], you = fighter(depth);
    var yourAvg = (1 + you.atk) / 2, itsAvg = (1 + mon.atk) / 2, swings = mon.hp / yourAvg;
    var sim = simulate(you, mon, 10000);
    var out = $('fight-out'); out.replaceChildren();
    function box(label, big, small) { var b = h('div', 'stat-box'); b.appendChild(h('small', null, label)); b.appendChild(h('b', null, big)); b.appendChild(h('span', null, small)); out.appendChild(b); }
    box('You on depth ' + depth, you.hp + ' hp · atk ' + you.atk, 'Average hit (1 + ' + you.atk + ') ÷ 2 = ' + yourAvg);
    box('The ' + mon.name, mon.hp + ' hp · atk ' + mon.atk, 'Average hit (1 + ' + mon.atk + ') ÷ 2 = ' + itsAvg);
    box('Estimate', '≈ ' + swings.toFixed(1) + ' swings', mon.hp + ' ÷ ' + yourAvg + '. You take about ' + Math.max(0, (Math.ceil(swings) - 1) * itsAvg).toFixed(1) + ' damage.');
    box('10,000 fights', Math.round(sim.win * 1000) / 10 + '% won', 'Average hp lost ' + sim.avgLost.toFixed(1) + '. One fight in 20 costs ' + sim.bad + ' or more.');
    var rows = '<thead><tr><th scope="col">Monster</th><th scope="col">First depth</th><th scope="col">Won (of 10,000)</th><th scope="col">Average hp lost</th><th scope="col">Worst 1 in 20</th></tr></thead><tbody>';
    types().forEach(function (t) {
      var r = simulate(you, t, 10000);
      rows += '<tr><td>' + String(t.name).replace(/[<>&]/g, '') + '</td><td class="num">' + t.minDepth + '</td><td class="num">' + (Math.round(r.win * 1000) / 10) + '%</td><td class="num">' + r.avgLost.toFixed(1) + ' of ' + you.hp + '</td><td class="num">' + r.bad + '</td></tr>';
    });
    $('fight-table').innerHTML = rows + '</tbody>';
  }
  $('fight-run').addEventListener('click', fight);
  $('fight-mon').addEventListener('change', fight);
  $('fight-depth').addEventListener('change', fight);

  // ---- Crawlspace, played in the page ----
  $('cs-play').addEventListener('click', function () {
    var hostEl = $('cs-host'), btn = $('cs-play');
    if (hostEl.firstChild) { hostEl.replaceChildren(); btn.textContent = '▶ Play Crawlspace here'; return; }
    var S = game && game.state(), same = current && D.rulesKey(current) === CS_KEY;
    var f = h('iframe', 'cs-frame');
    f.title = 'Crawlspace, a 3D roguelike from our showcase';
    f.src = '../../../apps/crawlspace/index.html' + (same && S ? '?seed=' + encodeURIComponent(S.seed) : '');
    f.setAttribute('allow', 'fullscreen');
    hostEl.appendChild(f);
    btn.textContent = '✕ Close Crawlspace';
    f.addEventListener('load', function () { try { f.contentWindow.focus(); } catch (e) {} });
  });

  // ---- idea dice ----
  var DICE = {
    setting: ['A sunken pirate ship', 'The tunnels under a volcano', 'A haunted greenhouse', 'An abandoned space station', 'The inside of a beehive', 'A clockwork tower', 'A frozen mine', 'A library with no exit', 'The sewers under a city', 'An ant colony'],
    hero: ['A lost robot', 'A mouse with a candle', 'A deep-sea diver', 'A white blood cell', 'A lighthouse keeper', 'An archaeologist', 'A tiny dragon', 'A delivery drone'],
    twist: ['A hunger clock', 'A daily dungeon seed', 'Monsters that steal and run', 'Your light shrinks over time', 'No attacking allowed', 'Caves below depth 3', 'Potions you must identify', 'A shop on every third level']
  };
  function roll() { ['setting', 'hero', 'twist'].forEach(function (k) { var a = DICE[k]; $('d-' + k).textContent = a[Math.floor(Math.random() * a.length)]; }); }
  $('dice-roll').addEventListener('click', roll); roll();

  loadPreset();
  showSeed();
  showSeedGrid();
  if (window.RoguelikeStudio && $('roguelike-engine-app') && !window._rogueStudioInstance) {
    window._rogueStudioInstance = window.RoguelikeStudio.mount($('roguelike-engine-app'), PRESETS.crawlspace.config);
  }
})();
