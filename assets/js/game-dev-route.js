/* game-dev-route.js — the one map that ties the Game Development lessons together.
 *
 * History (What Makes a Game?) → nine Tiny-Loop tutorials → coding the loop →
 * the 2D Game Developer Pathway → Game Jam → Godot 3D. Every page in that family
 * renders the same route strip from this data, so a tutorial knows which history
 * era it came from and which pathway lessons explain its theory, and a pathway
 * lesson knows which tutorials practise it.
 *
 * Usage:  <div data-game-route="tutorial:pong"></div>   (or "lesson:tilesets-tilemaps", "page:design")
 *         <script src="…/assets/js/game-dev-route.js"></script>
 * game-tutorial-kit.js loads this file itself, so tutorial pages need no extra tag.
 */
(function (global) {
  'use strict';
  if (global.GameDevRoute) return;

  var script = document.currentScript;
  var ROOT = new URL('../../', script && script.src ? script.src : global.location.href);
  var DESIGN = 'lessons/computer-science/graphics-and-games/game-design-thinking.html';
  var TUT = 'lessons/computer-science/graphics-and-games/game-tutorials/';
  var PATH = 'lessons/2d-game-dev/';

  var STAGES = [
    { id: 'design', n: '1', title: 'History & design', sub: 'What makes a game?', href: DESIGN },
    { id: 'tutorial', n: '2', title: 'Tiny-Loop tutorials', sub: '9 playable 2D games', href: DESIGN + '#archetype-grid' },
    { id: 'code', n: '3', title: 'Code the loop', sub: 'Canvas · Pygame · engines', href: 'lessons/computer-science/graphics-and-games/from-scratch-browser-game.html' },
    { id: 'lesson', n: '4', title: '2D Developer Pathway', sub: 'Art + theory → one game', href: PATH + '2d-pathway.html' },
    { id: 'jam', n: '5', title: 'Game Jam', sub: 'Plan · build · playtest', href: 'lessons/computer-science/graphics-and-games/game-jam-week.html' },
    { id: 'godot', n: '6', title: '3D with Godot', sub: 'Signal Run pathway', href: 'lessons/godot/godot-pathway.html' }
  ];

  // History eras match the cards on the What Makes a Game? timeline (#era-…).
  var ERAS = {
    lab: { label: '1958–1962 · The Lab Era', hook: 'Tennis for Two and Spacewar! drew glowing dots on lab equipment.' },
    home: { label: '1966–1972 · The First Home Console', hook: 'The Magnavox Odyssey put moving blocks on a family TV.' },
    arcade: { label: '1972–1979 · The Arcade Era', hook: 'Pong and Space Invaders had seconds to teach a stranger one action and one goal.' },
    eighties: { label: '1980s · Sprites, Tiles & Scrolling', hook: 'Pac-Man’s tile maze and the NES’s 8×8 tiles and hardware sprites made memory-cheap worlds.' },
    nineties: { label: '1990s · Bigger Worlds', hook: 'Rhythm games, 3D consoles, and CD audio raised the bar for timing and presentation.' },
    noughties: { label: '2000s · Anyone Can Publish', hook: 'Flash portals and early indie tools let students ship games to the whole web.' },
    mobile: { label: '2009–2015 · Phones & Indies', hook: 'One-touch games like Flappy Bird and idle games like Cookie Clicker reached millions.' },
    modern: { label: '2015–2022 · Modern Indies', hook: 'Pixel-art platformers such as Celeste are known for forgiving controls like coyote time and jump buffering.' }
  };

  var LESSONS = [
    { slug: 'pixel-art-sprites', n: '01', title: 'Pixel Art & Sprites', era: 'eighties', tutorials: ['catch', 'shooter'] },
    { slug: 'sprite-animation', n: '02', title: 'Sprite Sheets & Animation', era: 'eighties', tutorials: ['shooter', 'flappy'] },
    { slug: 'tilesets-tilemaps', n: '03', title: 'Tilesets & Tilemaps', era: 'eighties', tutorials: ['maze'] },
    { slug: 'game-loop-rendering', n: '04', title: 'Game Loop & Rendering', era: 'arcade', tutorials: ['pong', 'rhythm', 'clicker'] },
    { slug: 'platformer-movement', n: '05', title: 'Movement & Jump Feel', era: 'modern', tutorials: ['flappy', 'catch'] },
    { slug: 'tile-collision', n: '06', title: 'Collision & Response', era: 'arcade', tutorials: ['pong', 'maze', 'shooter'] },
    { slug: 'cameras-parallax', n: '07', title: 'Cameras, Layers & Parallax', era: 'eighties', tutorials: ['flappy'] },
    { slug: 'animation-states', n: '08', title: 'Animation State Machines', era: 'eighties', tutorials: ['cyoa', 'quiz'] },
    { slug: 'level-design-game-feel', n: '09', title: 'Level Design & Game Feel', era: 'mobile', tutorials: ['clicker', 'rhythm', 'shooter'] },
    { slug: 'ship-your-2d-game', n: '10', title: 'Menus, Saving & Shipping', era: 'noughties', tutorials: ['quiz', 'cyoa'] }
  ];

  var TUTORIALS = {
    catch: { title: 'Catch', icon: '⭐', era: 'arcade', lessons: ['pixel-art-sprites', 'tile-collision', 'level-design-game-feel'], why: 'Swap the falling squares for sprites you drew, then tune spawn rate as a difficulty curve.' },
    clicker: { title: 'Clicker', icon: '🖱️', era: 'mobile', lessons: ['game-loop-rendering', 'level-design-game-feel', 'ship-your-2d-game'], why: 'Idle income is rate × delta time; every upgrade needs feedback; progress needs a save file.' },
    maze: { title: 'Maze', icon: '🧩', era: 'eighties', lessons: ['tilesets-tilemaps', 'tile-collision'], why: 'A maze is a tilemap: a 2D array of tile IDs that both draws the walls and blocks movement.' },
    flappy: { title: 'Flappy', icon: '🐦', era: 'mobile', lessons: ['platformer-movement', 'cameras-parallax', 'sprite-animation'], why: 'One impulse fights constant gravity; layered backgrounds sell the speed.' },
    pong: { title: 'Pong', icon: '🏓', era: 'arcade', lessons: ['game-loop-rendering', 'tile-collision'], why: 'The ancestor of every loop: read input, move, detect overlap, respond, draw.' },
    shooter: { title: 'Shooter', icon: '🫧', era: 'arcade', lessons: ['sprite-animation', 'tile-collision', 'level-design-game-feel'], why: 'Hitboxes smaller than sprites feel fair; shake and flashes make hits readable.' },
    rhythm: { title: 'Rhythm', icon: '🎵', era: 'nineties', lessons: ['game-loop-rendering', 'level-design-game-feel'], why: 'Judging a beat means measuring time precisely, not counting frames.' },
    quiz: { title: 'Quiz Quest', icon: '❓', era: 'noughties', lessons: ['animation-states', 'ship-your-2d-game'], why: 'Title → question → feedback → results is a state machine, the same idea as idle → run → jump.' },
    cyoa: { title: 'Story', icon: '📖', era: 'arcade', lessons: ['animation-states', 'level-design-game-feel'], why: 'Text adventures from the 1970s were scene graphs: each choice is a transition between states.' }
  };

  var CODE_PAGES = {
    'from-scratch': { title: 'From Scratch: Browser Game', lessons: ['game-loop-rendering', 'tile-collision'] },
    pygame: { title: 'Python & Pygame Loop', lessons: ['game-loop-rendering', 'platformer-movement'] },
    engines: { title: '2D Engines: Kaplay & Phaser', lessons: ['sprite-animation', 'tilesets-tilemaps', 'cameras-parallax'] }
  };

  function url(path) { return new URL(path, ROOT).href; }
  function lessonBySlug(slug) { for (var i = 0; i < LESSONS.length; i++) if (LESSONS[i].slug === slug) return LESSONS[i]; return null; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function chip(href, label, small) {
    var a = el('a', 'gdr-chip'); a.href = href;
    a.appendChild(el('b', null, label)); if (small) a.appendChild(el('small', null, small));
    return a;
  }

  function addStyles() {
    if (document.querySelector('link[data-game-route-style]')) return;
    var link = document.createElement('link'); link.rel = 'stylesheet';
    link.href = url('assets/css/components/game-dev-route.css'); link.dataset.gameRouteStyle = 'true';
    document.head.appendChild(link);
  }

  function render(host) {
    var spec = (host.getAttribute('data-game-route') || 'page:design').split(':');
    var kind = spec[0], id = spec[1];
    var stageId = kind === 'tutorial' ? 'tutorial' : kind === 'lesson' ? 'lesson' : kind === 'code' ? 'code' : id;
    host.classList.add('gdr');
    host.setAttribute('role', 'navigation');
    host.setAttribute('aria-label', 'Game development route');

    var head = el('div', 'gdr-head');
    head.appendChild(el('span', 'gdr-kicker', 'Game Dev Route'));
    head.appendChild(el('span', 'gdr-note', 'One path from game history to a shipped game'));
    host.appendChild(head);

    var ol = el('ol', 'gdr-stages');
    STAGES.forEach(function (s) {
      var li = el('li'); var a = el('a', 'gdr-stage'); a.href = url(s.href);
      if (s.id === stageId) { a.setAttribute('aria-current', 'step'); li.className = 'is-here'; }
      a.appendChild(el('span', 'gdr-n', s.n));
      var t = el('span', 'gdr-t'); t.appendChild(el('b', null, s.title)); t.appendChild(el('small', null, s.sub)); a.appendChild(t);
      li.appendChild(a); ol.appendChild(li);
    });
    host.appendChild(ol);

    var links = el('div', 'gdr-links');
    function group(title, nodes, text) {
      if (!nodes.length && !text) return;
      var g = el('div', 'gdr-group'); g.appendChild(el('p', 'gdr-group-title', title));
      if (text) g.appendChild(el('p', 'gdr-why', text));
      if (nodes.length) { var row = el('div', 'gdr-row'); nodes.forEach(function (n) { row.appendChild(n); }); g.appendChild(row); }
      links.appendChild(g);
    }
    function eraChip(eraId) { var e = ERAS[eraId]; return chip(url(DESIGN + '#era-' + eraId), e.label.split(' · ')[0], e.label.split(' · ')[1]); }
    function lessonChips(slugs) { return slugs.map(function (sl) { var l = lessonBySlug(sl); return chip(url(PATH + l.slug + '.html'), l.n + ' · ' + l.title, '2D Pathway'); }); }
    function tutorialChips(slugs) { return slugs.map(function (t) { var d = TUTORIALS[t]; return chip(url(TUT + t + '.html'), d.icon + ' ' + d.title, 'Tiny-Loop tutorial'); }); }

    if (kind === 'tutorial' && TUTORIALS[id]) {
      var t = TUTORIALS[id];
      group('Where it comes from', [eraChip(t.era)], ERAS[t.era].hook);
      group('The theory behind it', lessonChips(t.lessons), t.why);
    } else if (kind === 'lesson') {
      var l = lessonBySlug(id);
      if (l) {
        group('Where it comes from', [eraChip(l.era)], ERAS[l.era].hook);
        group('Practise it in a Tiny-Loop game', tutorialChips(l.tutorials));
        var idx = LESSONS.indexOf(l);
        var nav = [];
        if (LESSONS[idx - 1]) nav.push(chip(url(PATH + LESSONS[idx - 1].slug + '.html'), '← ' + LESSONS[idx - 1].n + ' ' + LESSONS[idx - 1].title));
        if (LESSONS[idx + 1]) nav.push(chip(url(PATH + LESSONS[idx + 1].slug + '.html'), LESSONS[idx + 1].n + ' ' + LESSONS[idx + 1].title + ' →'));
        else nav.push(chip(url('lessons/computer-science/graphics-and-games/game-jam-week.html'), 'Game Jam →', 'Use everything'));
        group('Pathway', nav);
      } else if (id === 'hub') {
        group('Start here if you are new', [chip(url(DESIGN), 'What Makes a Game?', 'History + design'), chip(url(DESIGN + '#archetype-grid'), 'Play a Tiny-Loop game', '9 tutorials')]);
      }
    } else if (kind === 'code' && CODE_PAGES[id]) {
      group('Go deeper in the 2D Pathway', lessonChips(CODE_PAGES[id].lessons));
    } else if (id === 'jam') {
      group('Theory to lean on during the jam', [chip(url(PATH + '2d-pathway.html'), '2D Game Developer Pathway', 'Art, physics, cameras, feel'), chip(url(PATH + 'level-design-game-feel.html'), '09 · Level Design & Game Feel', 'Pacing + playtesting')]);
    } else if (id === 'design') {
      group('Next: build the theory into one game', [chip(url(PATH + '2d-pathway.html'), '2D Game Developer Pathway', '10 lessons · Pixel Courier')]);
    }
    if (links.childNodes.length) host.appendChild(links);
  }

  // Adds "build it" links to the history timeline and archetype cards on What Makes a Game?
  function decorateDesignPage() {
    var byEra = {};
    Object.keys(TUTORIALS).forEach(function (k) { (byEra[TUTORIALS[k].era] = byEra[TUTORIALS[k].era] || { t: [], l: [] }).t.push(k); });
    LESSONS.forEach(function (l) { (byEra[l.era] = byEra[l.era] || { t: [], l: [] }).l.push(l.slug); });
    document.querySelectorAll('[data-era]').forEach(function (card) {
      var hit = byEra[card.getAttribute('data-era')]; if (!hit || card.querySelector('.gdr-era-links')) return;
      var box = el('p', 'gdr-era-links'); box.appendChild(el('span', null, 'Build it today: '));
      hit.t.forEach(function (t) { var a = el('a', null, TUTORIALS[t].icon + ' ' + TUTORIALS[t].title); a.href = url(TUT + t + '.html'); box.appendChild(a); });
      hit.l.forEach(function (sl) {
        var l = lessonBySlug(sl); var a = el('a', null, '2D ' + l.n); a.href = url(PATH + sl + '.html');
        a.title = '2D Pathway ' + l.n + ': ' + l.title; a.setAttribute('aria-label', a.title); box.appendChild(a);
      });
      card.appendChild(box);
    });
    document.querySelectorAll('.arch-card[data-arch]').forEach(function (card) {
      var t = TUTORIALS[card.getAttribute('data-arch')]; if (!t || card.querySelector('.gdr-arch-theory')) return;
      var box = el('p', 'gdr-arch-theory'); box.appendChild(el('span', null, 'Theory: '));
      t.lessons.forEach(function (sl) { var l = lessonBySlug(sl); var a = el('a', null, l.n + ' ' + l.title); a.href = url(PATH + sl + '.html'); box.appendChild(a); });
      var row = card.querySelector('.arch-btn-row'); card.insertBefore(box, row || null);
    });
  }

  function init() {
    addStyles();
    document.querySelectorAll('[data-game-route]').forEach(function (host) { if (!host.childNodes.length) render(host); });
    decorateDesignPage();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  global.GameDevRoute = { STAGES: STAGES, ERAS: ERAS, LESSONS: LESSONS, TUTORIALS: TUTORIALS, render: render, init: init };
}(window));
