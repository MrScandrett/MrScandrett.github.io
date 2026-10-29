/* performer-guide.js — the one-page take-home sheet every instrument lesson prints.
 * A student leaves the first lesson with one letter page written for them (child, young adult or
 * adult): what to remember from lesson one and how to care for it; drawn scales and chord shapes
 * (keyboard, fretboard, fingerboard, sax fingerings or drum grooves); songs to learn by ear with
 * those notes; players and composers to hear; a Beginner → Intermediate → Advanced road; the
 * page's 15-minute ritual (read from #practice-ritual) and a QR code back here.
 *
 * In a lesson:
 *   <div data-performer-guide="piano"></div>     after the pathway map; load qr.js first
 * Text and diagram specs live in data/performer-guides.json; tests/performer-guides.test.mjs
 * checks every instrument has every reader, level and section. Level and reader are remembered
 * site-wide. Nine pages per instrument: the level decides what to play, the reader how it is said.
 */
(function () {
  'use strict';

  var host = document.querySelector('[data-performer-guide]');
  if (!host) return;
  var id = host.getAttribute('data-performer-guide');
  var KEY = 'classroomos:performer-guide:v1';
  var DEFAULT_SITE = 'https://mrscandrett.github.io/';
  var script = document.currentScript;
  var root = script ? script.src.replace(/assets\/js\/lessons\/performer-guide\.js.*$/, '') : '../../../';

  function el(tag, cls, text, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function stored() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function remember(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* ignore */ } }

  // The QR code always points at the public site, even when printed from a local copy.
  function lessonUrl() {
    var h = location.hostname, local = !h || h === 'localhost' || h === '127.0.0.1' || location.protocol === 'file:';
    var base = local ? DEFAULT_SITE : location.origin + '/';
    return base + location.pathname.replace(/^\/+/, '') + '#performer-guide';
  }

  // The page's own ritual: [{ time, name, text }], plus its advance rule.
  function ritual() {
    var box = document.getElementById('practice-ritual');
    if (!box) return { steps: [], rule: '' };
    var steps = Array.prototype.map.call(box.querySelectorAll('li'), function (li) {
      var t = li.querySelector('time'), s = li.querySelector('strong'), x = li.querySelector('span');
      return { time: t ? t.textContent.trim() : '', name: s ? s.textContent.trim() : '', text: x ? x.textContent.trim() : '' };
    });
    var rule = box.querySelector('.practice-rule');
    return { steps: steps, rule: rule ? rule.textContent.trim() : '' };
  }

  function tick(parent) { el('span', 'pgd-box', null, parent).setAttribute('aria-hidden', 'true'); }

  /* ----------------------------------------------------------- diagrams */
  // Every diagram is inline SVG in its own units, scaled by CSS, so it prints sharp at any size.
  // A child's page colours each note by letter (C red, D orange …) and every dot still carries
  // its letter, so nothing depends on colour alone or on a colour printer.
  var NS = 'http://www.w3.org/2000/svg';
  var NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  var HUES = ['#d32f2f', '#e65100', '#f57c00', '#f9a825', '#fbc02d', '#388e3c', '#00897b', '#0277bd', '#3949ab', '#5e35b1', '#8e24aa', '#c2185b'];
  var DARK_TEXT = { 2: 1, 3: 1, 4: 1 };
  var LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function pcOf(name) { var pc = LETTER_PC[name.charAt(0)]; if (/[♯#]/.test(name)) pc += 1; if (/[♭b]$/.test(name.slice(1))) pc -= 1; return (pc + 12) % 12; }
  function isWhite(m) { return [0, 2, 4, 5, 7, 9, 11].indexOf(m % 12) !== -1; }

  function S(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function canvas(w, h, label, cls) {
    var svg = S('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'img', 'aria-label': label, class: 'pgd-svg' + (cls ? ' ' + cls : '') });
    svg.style.setProperty('--w', w);
    return svg;
  }
  // A note dot with its letter inside. ctx.child colours it by letter; otherwise the root is
  // filled with the accent and the rest are outlined.
  function dot(g, ctx, x, y, r, pc, root, label) {
    var c = S('circle', { cx: x, cy: y, r: r, class: 'pgd-dot' }, g);
    var t = S('text', { x: x, y: y + r * 0.36, 'font-size': r * 1.02, class: 'pgd-dot-t' }, g, label != null ? label : NAMES[pc]);
    if (ctx.child) {
      c.setAttribute('style', 'fill:' + HUES[pc] + ';stroke:' + HUES[pc]);
      t.setAttribute('style', 'fill:' + (DARK_TEXT[pc] ? '#111' : '#fff'));
    } else if (root) {
      c.classList.add('is-root');
      t.classList.add('is-root');
    }
  }

  // Piano keys from spec.from to spec.to (MIDI), dots on spec.notes, finger numbers above.
  function keyboard(spec, ctx, notes, fingers, label) {
    var W = 20, H = 70, BW = 12, BH = 44, top = fingers ? 16 : 2;
    var whites = [];
    for (var m = spec.from; m <= spec.to; m++) if (isWhite(m)) whites.push(m);
    var svg = canvas(whites.length * W + 2, top + H + 2, label, 'pgd-keys');
    var xOf = {};
    whites.forEach(function (w, i) { xOf[w] = 1 + i * W; S('rect', { x: 1 + i * W, y: top, width: W, height: H, rx: 2, class: 'pgd-white' }, svg); });
    for (m = spec.from; m <= spec.to; m++) {
      if (isWhite(m) || xOf[m - 1] == null) continue;
      xOf[m] = xOf[m - 1] + W - BW / 2;
      S('rect', { x: xOf[m], y: top, width: BW, height: BH, rx: 1.5, class: 'pgd-black' }, svg);
    }
    notes.forEach(function (n, i) {
      var white = isWhite(n), cx = white ? xOf[n] + W / 2 : xOf[n] + BW / 2;
      dot(svg, ctx, cx, white ? top + H - 12 : top + BH - 9, white ? 8 : 5.8, n % 12, i === 0 && !!fingers);
      if (fingers) S('text', { x: cx, y: 11, class: 'pgd-finger' }, svg, String(fingers[i]));
    });
    return svg;
  }

  // Guitar chord box: strings low E → high E left to right, x / o above the nut.
  function chordBox(item, ctx) {
    var SP = 12, FH = 14, top = 14, left = 9, fr = item.frets.split(''), fi = item.fingers.split('');
    var svg = canvas(left * 2 + 5 * SP, top + 4 * FH + 4, item.name + ' chord: ' + item.frets.split('').join(' '), 'pgd-chord');
    for (var k = 0; k <= 4; k++) S('line', { x1: left, x2: left + 5 * SP, y1: top + k * FH, y2: top + k * FH, class: k ? 'pgd-fret' : 'pgd-nut' }, svg);
    fr.forEach(function (f, i) {
      var x = left + i * SP;
      S('line', { x1: x, x2: x, y1: top, y2: top + 4 * FH, class: 'pgd-string' }, svg);
      if (f === 'x') S('text', { x: x, y: top - 4, class: 'pgd-mark' }, svg, '×');
      else if (f === '0') S('circle', { cx: x, cy: top - 7, r: 3.2, class: 'pgd-open' }, svg);
      else {
        S('circle', { cx: x, cy: top + (Number(f) - 0.5) * FH, r: 5, class: 'pgd-dot is-root' }, svg);
        S('text', { x: x, y: top + (Number(f) - 0.5) * FH + 2.6, 'font-size': 7.5, class: 'pgd-dot-t is-root' }, svg, fi[i]);
      }
    });
    return svg;
  }

  // Guitar fretboard as tab reads it: high E on top. spec.frets[0] is string 6 (low E).
  var GUITAR = [40, 45, 50, 55, 59, 64];
  function fretboard(spec, ctx) {
    var SS = 15, FW = 30, OPEN_W = 20, left = 14, top = 9, lo = spec.lo, hi = spec.hi;
    var boardW = lo === 0 ? OPEN_W + hi * FW : (hi - lo + 1) * FW;
    function colX(f) { return lo === 0 ? (f === 0 ? left + OPEN_W / 2 - 2 : left + OPEN_W + (f - 1) * FW + FW / 2) : left + (f - lo) * FW + FW / 2; }
    var names = [];
    spec.frets.forEach(function (fs, i) { fs.forEach(function (f) { names.push(NAMES[(GUITAR[i] + f) % 12]); }); });
    var svg = canvas(left + boardW + 4, top + 5 * SS + 18, spec.title + ': ' + names.join(' '), 'pgd-fretboard');
    var x0 = left + (lo === 0 ? OPEN_W : 0);
    for (var r = 0; r < 6; r++) {
      S('line', { x1: x0, x2: left + boardW, y1: top + r * SS, y2: top + r * SS, class: 'pgd-string' }, svg);
      S('text', { x: 5, y: top + r * SS + 3, class: 'pgd-axis' }, svg, 'EBGDAE'.charAt(r));
    }
    var n = lo === 0 ? hi : hi - lo + 1;
    for (var k = lo === 0 ? 0 : 0; k <= n; k++) {
      var x = x0 + k * FW;
      S('line', { x1: x, x2: x, y1: top, y2: top + 5 * SS, class: lo === 0 && k === 0 ? 'pgd-nut' : 'pgd-fret' }, svg);
    }
    for (var f = Math.max(lo, 1); f <= hi; f++) S('text', { x: colX(f), y: top + 5 * SS + 14, class: 'pgd-axis' }, svg, String(f));
    spec.frets.forEach(function (fs, i) {
      fs.forEach(function (f) {
        var pc = (GUITAR[i] + f) % 12;
        dot(svg, ctx, colX(f), top + (5 - i) * SS, 6.3, pc, pc === spec.root);
      });
    });
    return svg;
  }

  // Violin fingerboard: strings G D A E left to right (only the ones given), nut on top, open
  // notes above it, a faint tape at 1st finger, high 2 and 3rd finger.
  var VIOLIN = { G: 55, D: 62, A: 69, E: 76 };
  var FINGER = ['0', '1', '1', '2', '2', '3', '3', '4'];
  function violinBoard(strings, ctx, label) {
    var order = ['G', 'D', 'A', 'E'].filter(function (s) { return strings[s]; });
    var deepest = Math.max.apply(null, order.map(function (s) { return Math.max.apply(null, strings[s]); }));
    var SX = 26, RY = 14, left = 16, top = 18, len = Math.max(deepest + 0.7, 1.2) * RY;
    var svg = canvas(left * 2 + (order.length - 1) * SX, top + len + 13, label, 'pgd-board');
    var x1 = left - 10, x2 = left + (order.length - 1) * SX + 10;
    [2, 4, 5].forEach(function (s) { if (s <= deepest) S('line', { x1: x1, x2: x2, y1: top + s * RY, y2: top + s * RY, class: 'pgd-tape' }, svg); });
    S('line', { x1: x1, x2: x2, y1: top, y2: top, class: 'pgd-nut' }, svg);
    order.forEach(function (name, i) {
      var x = left + i * SX;
      S('line', { x1: x, x2: x, y1: top, y2: top + len, class: 'pgd-string' }, svg);
      S('text', { x: x, y: top + len + 10, class: 'pgd-axis' }, svg, name);
      strings[name].forEach(function (s) {
        var pc = (VIOLIN[name] + s) % 12;
        dot(svg, ctx, x, s ? top + s * RY : top - 9, 6, pc, s === 0);
        if (s) S('text', { x: x + 8.5, y: top + s * RY + 2.5, class: 'pgd-finger-s' }, svg, FINGER[s]);
      });
    });
    return svg;
  }

  // Saxophone fingering columns: octave key, three left-hand keys, then three right-hand keys.
  function saxChart(spec, ctx) {
    var CW = 26;
    var svg = canvas(spec.notes.length * CW, 108, spec.title + ': ' + spec.notes.map(function (n) { return n.split(':')[0]; }).join(' '), 'pgd-sax');
    spec.notes.forEach(function (n, i) {
      var name = n.split(':')[0], keys = n.split(':')[1], oct = keys.charAt(0) === 'o', six = oct ? keys.slice(1) : keys;
      var x = i * CW + CW / 2 + 2, g = S('g', {}, svg), pc = pcOf(name);
      var fill = ctx.child ? HUES[pc] : null;
      S('circle', { cx: x - 9, cy: 9, r: 3.6, class: oct ? 'pgd-key is-on' : 'pgd-key' }, g);
      [20, 32, 44, 61, 73, 85].forEach(function (y, k) {
        var c = S('circle', { cx: x, cy: y, r: 5.2, class: six.charAt(k) === '1' ? 'pgd-key is-on' : 'pgd-key' }, g);
        if (fill && six.charAt(k) === '1') c.setAttribute('style', 'fill:' + fill + ';stroke:' + fill);
      });
      S('line', { x1: x - 7, x2: x + 7, y1: 52.5, y2: 52.5, class: 'pgd-fret' }, g);
      S('text', { x: x, y: 103, class: 'pgd-sax-name' }, g, name);
    });
    return svg;
  }

  // Drum groove grid: one column per count, a mark where the drum is played.
  function grooveGrid(spec, ctx) {
    var counts = spec.counts.split(' '), rows = Object.keys(spec.rows), CW = counts.length > 8 ? 13 : 22, LW = 38, RH = 17, top = 14;
    var svg = canvas(LW + counts.length * CW + 1, top + rows.length * RH + 1, spec.title + ' drum groove', 'pgd-groove');
    counts.forEach(function (c, i) {
      var x = LW + i * CW;
      if (/\d/.test(c)) S('rect', { x: x, y: top, width: CW, height: rows.length * RH, class: 'pgd-beat' }, svg);
      S('text', { x: x + CW / 2, y: 10, class: /\d/.test(c) ? 'pgd-count is-beat' : 'pgd-count' }, svg, c);
    });
    rows.forEach(function (name, r) {
      var y = top + r * RH;
      S('text', { x: 0, y: y + RH / 2 + 3, class: 'pgd-axis pgd-axis-l' }, svg, name);
      spec.rows[name].split('').forEach(function (ch, i) {
        var cx = LW + i * CW + CW / 2, cy = y + RH / 2, s = Math.min(CW, RH) * 0.28;
        S('rect', { x: LW + i * CW, y: y, width: CW, height: RH, class: 'pgd-cell' }, svg);
        if (ch === 'x') S('path', { d: 'M' + (cx - s) + ' ' + (cy - s) + 'L' + (cx + s) + ' ' + (cy + s) + 'M' + (cx + s) + ' ' + (cy - s) + 'L' + (cx - s) + ' ' + (cy + s), class: 'pgd-hit-x' }, svg);
        else if (ch === 'o') S('circle', { cx: cx, cy: cy, r: s * 1.15, class: 'pgd-hit' }, svg);
      });
    });
    return svg;
  }

  function chips(notes, ctx, parent) {
    var row = el('span', 'pgd-chips', null, parent);
    notes.forEach(function (n) {
      var c = el('span', 'pgd-chip', n, row);
      if (ctx.child) { var pc = pcOf(n); c.style.background = HUES[pc]; c.style.borderColor = HUES[pc]; c.style.color = DARK_TEXT[pc] ? '#111' : '#fff'; }
    });
    return row;
  }
  function sticking(pattern, parent) {
    var row = el('span', 'pgd-sticks', null, parent);
    row.setAttribute('aria-label', pattern.split('').join(' '));
    pattern.split('').forEach(function (h, i) {
      var c = el('span', 'pgd-stick pgd-stick-' + h, h, row);
      if (i && i % 4 === 0) c.classList.add('is-group');
    });
    return row;
  }

  function scaleFigure(spec, ctx, parent) {
    var fig = el('figure', 'pgd-fig', null, parent);
    el('figcaption', 'pgd-fig-title', spec.title, fig);
    var art;
    if (spec.kind === 'keys') art = keyboard(spec, ctx, spec.notes, spec.fingers, spec.title + ': ' + spec.notes.map(function (n) { return NAMES[n % 12]; }).join(' ') + ', fingers ' + spec.fingers.join(' '));
    else if (spec.kind === 'fret') art = fretboard(spec, ctx);
    else if (spec.kind === 'board') art = violinBoard(spec.strings, ctx, spec.title + ' on the violin fingerboard');
    else if (spec.kind === 'sax') art = saxChart(spec, ctx);
    else if (spec.kind === 'groove') art = grooveGrid(spec, ctx);
    if (art) fig.appendChild(art);
    if (spec.tip) el('p', 'pgd-tip', spec.tip, fig);
  }
  function shapeItem(shapes, item, ctx, parent) {
    var fig = el('figure', 'pgd-shape pgd-shape-' + shapes.kind, null, parent);
    if (shapes.kind === 'keys') fig.appendChild(keyboard(shapes, ctx, item.notes, null, item.name + ' chord: ' + item.notes.map(function (n) { return NAMES[n % 12]; }).join(' ')));
    else if (shapes.kind === 'chord') fig.appendChild(chordBox(item, ctx));
    else if (shapes.kind === 'board') fig.appendChild(violinBoard(item.strings, ctx, item.name));
    else if (shapes.kind === 'chips') chips(item.notes, ctx, fig);
    else if (shapes.kind === 'sticking') sticking(item.pattern, fig);
    el('figcaption', null, item.name, fig);
  }

  /* ------------------------------------------------------------ the sheet */
  // What to play comes from the level; how it is said (and how much of it) from the reader.
  var CHILD_MAX = { scales: 1, shapes: 3, songs: 3, listen: 3 };
  function some(list, key, ctx) { return ctx.child ? list.slice(0, CHILD_MAX[key]) : list; }

  function sheet(data, inst, levelId, readerId, accent) {
    var reader = data.readers.filter(function (r) { return r.id === readerId; })[0];
    var li = data.levels.map(function (l) { return l.id; }).indexOf(levelId), level = data.levels[li];
    var words = inst[readerId], goals = words[levelId], music = inst[levelId], ctx = { child: readerId === 'child' };
    var page = el('article', 'pgd-sheet pgd-for-' + readerId + ' pgd-level-' + levelId);
    page.setAttribute('data-night-keep', '');
    page.setAttribute('data-no-glossary', '');
    if (accent) page.style.setProperty('--pgd-accent', accent);

    var head = el('header', 'pgd-s-head', null, page);
    var copy = el('div', 'pgd-s-title', null, head);
    el('p', 'pgd-s-kicker', 'Take-home page · keep it by your ' + inst.name.toLowerCase(), copy);
    var h1 = el('h1', null, inst.icon + ' ' + inst.name + ' ', copy);
    el('span', 'pgd-level-tag', '★★★'.slice(0, li + 1) + ' ' + level.name, h1);
    el('p', 'pgd-s-for', 'Written for: ' + reader.name + ' · ' + level.when[readerId], copy);
    var who = el('p', 'pgd-s-who', null, copy);
    el('span', null, 'Name', who);
    el('span', null, 'Date', who);
    el('span', null, 'Teacher', who);
    if (window.QR) {
      try {
        var qr = el('figure', 'pgd-qr', null, head);
        el('div', null, null, qr).innerHTML = window.QR.toSvg(window.QR.encode(lessonUrl(), 'M'), { border: 1, label: 'QR code: open the ' + inst.name.toLowerCase() + ' lesson' });
        el('figcaption', null, 'Scan to open the lesson', qr);
      } catch (e) { /* no code; the address is in the footer */ }
    }

    // Beginners get lesson one's three essentials; later levels start from what they can already do.
    var top = el('div', 'pgd-s-top', null, page);
    var rem = el('section', 'pgd-s-remember', null, top);
    if (li === 0) {
      el('h2', null, 'Remember from lesson one', rem);
      var ol = el('ol', null, null, rem);
      words.remember.forEach(function (line) { var item = el('li', null, null, ol); tick(item); el('span', null, line, item); });
    } else {
      el('h2', null, 'You can already', rem);
      var was = el('p', 'pgd-already', null, rem);
      el('span', 'pgd-already-mark', '✓', was).setAttribute('aria-hidden', 'true');
      el('span', null, words[data.levels[li - 1].id].check.replace(/^You can /, ''), was);
    }
    var goal = el('section', 'pgd-s-goals', null, top);
    el('h2', null, 'This level', goal);
    data.rows.forEach(function (r) {
      if (r.id === 'check' || (ctx.child && r.id === 'play')) return;
      var p = el('p', 'pgd-line', null, goal);
      el('span', 'pgd-line-icon', r.icon, p).setAttribute('aria-hidden', 'true');
      el('b', null, r.name + ': ', p);
      p.appendChild(document.createTextNode(goals[r.id]));
    });
    var care = el('p', 'pgd-line pgd-care', null, goal);
    el('span', 'pgd-line-icon', '🧽', care).setAttribute('aria-hidden', 'true');
    el('b', null, 'Care: ', care);
    care.appendChild(document.createTextNode(words.care));

    var play = el('section', 'pgd-s-play', null, page);
    var scales = el('div', 'pgd-s-scales', null, play);
    el('h2', null, inst.scalesTitle, scales);
    var row = el('div', 'pgd-figs', null, scales);
    some(music.scales, 'scales', ctx).forEach(function (spec) { scaleFigure(spec, ctx, row); });
    var shapes = el('div', 'pgd-s-shapes', null, play);
    el('h2', null, music.shapes.title, shapes);
    var grid = el('div', 'pgd-shapes pgd-shapes-' + music.shapes.kind, null, shapes);
    some(music.shapes.items, 'shapes', ctx).forEach(function (item) { shapeItem(music.shapes, item, ctx, grid); });

    var mid = el('div', 'pgd-s-mid', null, page);
    var ear = el('section', 'pgd-s-ear', null, mid);
    el('h2', null, ctx.child ? 'Learn by ear: hum it, then find it' : 'Learn by ear with these notes', ear);
    var songs = el('ol', null, null, ear);
    some(music.songs, 'songs', ctx).forEach(function (s) {
      var item = el('li', null, null, songs);
      el('b', null, s.title, item);
      if (s.by) el('span', 'pgd-by', ' · ' + s.by, item);
      el('span', 'pgd-uses', s.uses, item);
    });
    var lis = el('section', 'pgd-s-listen', null, mid);
    el('h2', null, ctx.child ? 'Players to listen to' : 'Players and composers to check out', lis);
    var ul = el('ul', null, null, lis);
    some(music.listen, 'listen', ctx).forEach(function (p) {
      var item = el('li', null, null, ul);
      el('b', null, p.name, item);
      el('span', 'pgd-what', ' · ' + p.what, item);
      el('span', 'pgd-try', ' ▶ ' + p['try'], item);
    });

    // The finish line for this level, and where it sits on the road.
    var road = el('section', 'pgd-s-road', null, page);
    var ready = el('div', 'pgd-ready', null, road);
    el('h2', null, li === 2 ? 'You’re a performer when' : 'Ready for ' + data.levels[li + 1].name + ' when', ready);
    var rp = el('p', null, null, ready);
    tick(rp);
    el('span', null, goals.check, rp);
    var date = el('p', 'pgd-ready-date', 'Date I did it:', ready);
    date.setAttribute('aria-hidden', 'true');
    var steps = el('ol', 'pgd-road', null, road);
    steps.setAttribute('aria-label', 'Levels');
    data.levels.forEach(function (lv, n) {
      var s = el('li', n === li ? 'is-here' : (n < li ? 'is-done' : ''), null, steps);
      el('span', 'pgd-stars', '★★★'.slice(0, n + 1), s).setAttribute('aria-hidden', 'true');
      el('b', null, lv.name, s);
      if (n === li) el('small', null, 'you are here', s);
    });

    var rr = ritual();
    if (rr.steps.length) {
      var rit = el('section', 'pgd-s-ritual', null, page);
      el('h2', null, 'Every time you practice: 15 minutes', rit);
      var list = el('ol', null, null, rit);
      rr.steps.forEach(function (s) {
        var item = el('li', null, null, list);
        el('b', null, s.name, item);
        el('small', null, s.time, item);
        if (!ctx.child) el('span', null, s.text, item);
      });
    }
    el('footer', 'pgd-s-foot', lessonUrl().replace(/^https?:\/\//, '').replace(/#.*$/, ''), page);
    return page;
  }

  // One page, always: lay the sheet out at the paper's width (letter minus lesson-print.css
  // margins), and if it runs taller than the page box minus a safety margin, print it zoomed down.
  var PAGE_W = '7.2in', PAGE_H = 9.1 * 96;
  function fitToPage(page) {
    var probe = el('div', 'pgd-probe', null, document.body);
    probe.style.width = PAGE_W;
    probe.appendChild(page);
    var h = page.getBoundingClientRect().height;
    probe.parentNode.removeChild(probe);
    if (h > PAGE_H) page.style.setProperty('--pgd-fit', (PAGE_H / h).toFixed(3));
    return page;
  }

  /* ---------------------------------------------------- on the lesson page */
  // Kept to one strip: the title, the two choices, Print, and the preview folded away.
  var box = el('section', 'pgd');
  box.id = 'performer-guide';
  box.setAttribute('aria-labelledby', 'pgdTitle');
  var head = el('div', 'pgd-head', null, box);
  var copy = el('div', 'pgd-copy', null, head);
  el('h2', null, 'Take-home page', copy).id = 'pgdTitle';
  var lede = el('p', null, 'One printed page to keep and study, for your level and written for the reader.', copy);
  var picks = el('div', 'pgd-picks', null, head);
  function picker(label) {
    var g = el('div', 'pgd-readers', null, picks);
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', label);
    el('span', 'pgd-for-label', label, g).setAttribute('aria-hidden', 'true');
    return g;
  }
  var levelPick = picker('Level'), readerPick = picker('Written for');
  var actions = el('div', 'pgd-actions', null, head);
  var print = el('button', 'pgd-print', '🖨 Print the page', actions);
  print.type = 'button';
  print.disabled = true;
  var printAll = el('button', 'pgd-print-all', 'All 3 levels', actions);
  printAll.type = 'button';
  printAll.disabled = true;
  var more = el('details', 'pgd-preview', null, box);
  var summary = el('summary', null, 'Preview the page', more);
  var scroll = el('div', 'pgd-scroll', null, more);
  host.parentNode.replaceChild(box, host);

  var accent = getComputedStyle(box).getPropertyValue('--practice-accent').trim();

  fetch(root + 'data/performer-guides.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      var inst = data.instruments[id];
      if (!inst) { box.hidden = true; return; }
      lede.textContent = 'One printed page to take home and study: what a ' + inst.name.toLowerCase() + ' player plays, hears and works on at each level.';
      var choice = stored() || {};
      var reader = data.readers.some(function (r) { return r.id === choice.reader; }) ? choice.reader : 'teen';
      var level = data.levels.some(function (l) { return l.id === choice.level; }) ? choice.level : 'beginner';
      function nameOf(list, v) { return list.filter(function (x) { return x.id === v; })[0].name; }

      function buttons(list, parent, pickIt) {
        return list.map(function (x) {
          var b = el('button', 'pgd-reader', x.name, parent);
          b.type = 'button';
          if (x.hint) b.title = x.hint;
          b.addEventListener('click', function () { pickIt(x.id); remember({ reader: reader, level: level }); render(); });
          return { id: x.id, b: b };
        });
      }
      var lv = buttons(data.levels, levelPick, function (v) { level = v; });
      var rd = buttons(data.readers, readerPick, function (v) { reader = v; });
      function render() {
        lv.forEach(function (x) { x.b.setAttribute('aria-pressed', x.id === level ? 'true' : 'false'); });
        rd.forEach(function (x) { x.b.setAttribute('aria-pressed', x.id === reader ? 'true' : 'false'); });
        var what = nameOf(data.levels, level).toLowerCase() + ', ' + nameOf(data.readers, reader).toLowerCase();
        summary.textContent = 'Preview the page (' + what + ')';
        print.setAttribute('aria-label', 'Print the ' + what + ' take-home page');
        printAll.setAttribute('aria-label', 'Print all three levels for a ' + nameOf(data.readers, reader).toLowerCase() + ' reader, one page each');
        scroll.textContent = '';
        scroll.appendChild(sheet(data, inst, level, reader, accent));
      }
      render();
      print.disabled = printAll.disabled = false;

      var printRoot = el('div', 'pgd-print-root', null, document.body);
      printRoot.setAttribute('aria-hidden', 'true');
      function printLevels(levels) {
        printRoot.textContent = '';
        levels.forEach(function (l) { printRoot.appendChild(fitToPage(sheet(data, inst, l, reader, accent))); });
        document.body.classList.add('pgd-printing');
        window.print();
      }
      print.addEventListener('click', function () { printLevels([level]); });
      printAll.addEventListener('click', function () { printLevels(data.levels.map(function (l) { return l.id; })); });
      window.addEventListener('afterprint', function () {
        if (!document.body.classList.contains('pgd-printing')) return;
        document.body.classList.remove('pgd-printing');
        printRoot.textContent = '';
      });
    })
    .catch(function () { box.hidden = true; });
})();
