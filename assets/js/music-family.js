/* music-family.js — one shared "music" navigation strip for every music page.
 * Theory, composers, and sound science each get an aligned navigation row.
 * Add or rename a page here and every music page updates.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var base = script ? script.src.replace(/assets\/js\/music-family\.js.*$/, '') : '';

  var THEORY = [
    { file: 'lessons/music/theory/circle-of-fifths.html', label: 'Circle of Fifths' },
    { file: 'lessons/music/theory/sheet-music-trainer.html', label: 'Sheet Music' },
    { file: 'lessons/music/instruments/piano.html', label: 'Piano' },
    { file: 'lessons/music/theory/music-modes-evolution.html', label: 'Modes' },
    { file: 'lessons/music/theory/chord-progressions.html', label: 'Chord Progressions' },
    { file: 'lessons/music/theory/drop-voicings.html', label: 'Drop Voicings' },
    { file: 'lessons/music/instruments/guitar.html', label: 'Guitar' },
    { file: 'lessons/music/instruments/ukulele.html', label: 'Ukulele' },
    { file: 'lessons/music/instruments/kalimba.html', label: 'Kalimba' },
    { file: 'lessons/music/instruments/violin-fingerboard.html', label: 'Violin' },
    { file: 'lessons/music/instruments/drums.html', label: 'Drums' },
    { file: 'lessons/music/instruments/saxophone.html', label: 'Saxophone' },
    { file: 'lessons/music/theory/fake-book.html', label: 'Fake Book' },
    { file: 'music-lab.html', label: 'Music Lab' }
  ];
  // The composer route: eras in date order, composers in birth order within each.
  // composer-route.js builds each lesson's era strip and "What came next" card from this.
  var ERAS = [
    { id: 'baroque', label: 'Baroque', composers: [
      { file: 'lessons/music/pioneers/pachelbel.html', label: 'Pachelbel', name: 'Johann Pachelbel', dates: '1653–1706' },
      { file: 'lessons/music/pioneers/vivaldi.html', label: 'Vivaldi', name: 'Antonio Vivaldi', dates: '1678–1741' },
      { file: 'lessons/music/pioneers/handel.html', label: 'Handel', name: 'George Frideric Handel', dates: '1685–1759' },
      { file: 'lessons/music/pioneers/bach.html', label: 'Bach', name: 'Johann Sebastian Bach', dates: '1685–1750' }
    ] },
    { id: 'classical', label: 'Classical', composers: [
      { file: 'lessons/music/pioneers/mozart.html', label: 'Mozart', name: 'Wolfgang Amadeus Mozart', dates: '1756–1791' },
      { file: 'lessons/music/pioneers/beethoven.html', label: 'Beethoven', name: 'Ludwig van Beethoven', dates: '1770–1827' }
    ] },
    { id: 'romantic', label: 'Romantic', composers: [
      { file: 'lessons/music/pioneers/schubert.html', label: 'Schubert', name: 'Franz Schubert', dates: '1797–1828' },
      { file: 'lessons/music/pioneers/chopin.html', label: 'Chopin', name: 'Frédéric Chopin', dates: '1810–1849' },
      { file: 'lessons/music/pioneers/schumann.html', label: 'Schumann', name: 'Robert Schumann', dates: '1810–1856' },
      { file: 'lessons/music/pioneers/liszt.html', label: 'Liszt', name: 'Franz Liszt', dates: '1811–1886' },
      { file: 'lessons/music/pioneers/brahms.html', label: 'Brahms', name: 'Johannes Brahms', dates: '1833–1897' },
      { file: 'lessons/music/pioneers/saint-saens.html', label: 'Saint-Saëns', name: 'Camille Saint-Saëns', dates: '1835–1921' },
      { file: 'lessons/music/pioneers/tchaikovsky.html', label: 'Tchaikovsky', name: 'Pyotr Ilyich Tchaikovsky', dates: '1840–1893' },
      { file: 'lessons/music/pioneers/massenet.html', label: 'Massenet', name: 'Jules Massenet', dates: '1842–1912' },
      { file: 'lessons/music/pioneers/grieg.html', label: 'Grieg', name: 'Edvard Grieg', dates: '1843–1907' },
      { file: 'lessons/music/pioneers/faure.html', label: 'Fauré', name: 'Gabriel Fauré', dates: '1845–1924' },
      { file: 'lessons/music/pioneers/francisco-tarrega.html', label: 'Tárrega', name: 'Francisco Tárrega', dates: '1852–1909' },
      { file: 'lessons/music/pioneers/elgar.html', label: 'Elgar', name: 'Edward Elgar', dates: '1857–1934' },
      { file: 'lessons/music/pioneers/mascagni.html', label: 'Mascagni', name: 'Pietro Mascagni', dates: '1863–1945' },
      { file: 'lessons/music/pioneers/rachmaninoff.html', label: 'Rachmaninoff', name: 'Sergei Rachmaninoff', dates: '1873–1943' }
    ] },
    { id: 'modern', label: 'Modern', composers: [
      { file: 'lessons/music/pioneers/debussy.html', label: 'Debussy', name: 'Claude Debussy', dates: '1862–1918' },
      { file: 'lessons/music/pioneers/satie.html', label: 'Satie', name: 'Erik Satie', dates: '1866–1925' },
      { file: 'lessons/music/pioneers/scriabin.html', label: 'Scriabin', name: 'Alexander Scriabin', dates: '1872–1915' },
      { file: 'lessons/music/pioneers/ravel.html', label: 'Ravel', name: 'Maurice Ravel', dates: '1875–1937' },
      { file: 'lessons/music/pioneers/barber.html', label: 'Barber', name: 'Samuel Barber', dates: '1910–1981' }
    ] },
    { id: 'jazz', label: 'American roots & jazz', short: 'Roots & jazz', tiny: 'Jazz', composers: [
      { file: 'lessons/music/pioneers/joplin.html', label: 'Joplin', name: 'Scott Joplin', dates: 'c. 1868–1917' },
      { file: 'lessons/music/pioneers/morton.html', label: 'Morton', name: 'Jelly Roll Morton', dates: 'c. 1890–1941' },
      { file: 'lessons/music/pioneers/gershwin.html', label: 'Gershwin', name: 'George Gershwin', dates: '1898–1937' },
      { file: 'lessons/music/pioneers/duke-ellington.html', label: 'Ellington', name: 'Duke Ellington', dates: '1899–1974' },
      { file: 'lessons/music/pioneers/louis-armstrong.html', label: 'Armstrong', name: 'Louis Armstrong', dates: '1901–1971' },
      { file: 'lessons/music/pioneers/django-reinhardt.html', label: 'Reinhardt', name: 'Django Reinhardt', dates: '1910–1953' },
      { file: 'lessons/music/pioneers/charlie-parker.html', label: 'Parker', name: 'Charlie Parker', dates: '1920–1955' }
    ] }
  ];
  var COMPOSERS = [];
  ERAS.forEach(function (era) {
    era.composers.forEach(function (c) { c.era = era; COMPOSERS.push(c); });
  });
  var SCIENCE = [
    { file: 'lessons/physics/waves-and-sound/physics-of-music.html', label: 'Physics of Music' },
    { file: 'lessons/physics/waves-and-sound/binaural-beats.html', label: 'Binaural Beats' },
    { file: 'lessons/physics/waves-and-sound/do-atoms-make-music.html', label: 'Do Atoms Make Music?' },
    { file: 'lessons/technical-elements/audio-engineering/cymatics.html', label: 'Cymatics' }
  ];

  function here(file) {
    var path = location.pathname.replace(/\/index\.html$/, '/');
    return path.slice(-file.length) === file;
  }

  window.MusicFamily = { base: base, eras: ERAS, composers: COMPOSERS, here: here };

  function link(it) {
    var a = document.createElement('a');
    a.href = base + it.file;
    a.textContent = it.label;
    if (here(it.file)) { a.setAttribute('aria-current', 'page'); }
    return a;
  }

  function titled(title, short, child) {
    var g = document.createElement('div');
    g.className = 'mf-group';
    var t = document.createElement('span');
    t.className = 'mf-title';
    t.textContent = short;
    t.title = title;
    g.appendChild(t);
    g.appendChild(child);
    return g;
  }

  var menus = [];
  // A dropdown chip. Its label is the page you're on when that page is inside it.
  function dropdown(label, title, sections) {
    var d = document.createElement('details');
    d.className = 'mf-menu';
    var sum = document.createElement('summary');
    var items = [];
    sections.forEach(function (sec) { items = items.concat(sec.items); });
    var current = items.filter(function (it) { return here(it.file); })[0];
    sum.textContent = current ? current.label : label;
    if (current) sum.setAttribute('aria-current', 'page');
    sum.setAttribute('aria-label', title + (current ? ', now on ' + current.label : ''));
    d.appendChild(sum);
    var list = document.createElement('div');
    list.className = 'mf-menu-list';
    sections.forEach(function (sec) {
      if (sec.label) {
        var head = document.createElement('span');
        head.className = 'mf-menu-era';
        head.textContent = sec.label;
        list.appendChild(head);
      }
      sec.items.forEach(function (it) { list.appendChild(link(it)); });
    });
    d.appendChild(list);
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.open) { d.open = false; sum.focus(); } });
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      menus.forEach(function (m) { if (m !== d) m.open = false; });
      // Keep the list on screen: open leftwards when it would run off the right edge.
      list.style.left = ''; list.style.right = '';
      var r = list.getBoundingClientRect();
      if (r.right > window.innerWidth - 8) { list.style.left = 'auto'; list.style.right = '0'; }
    });
    menus.push(d);
    return d;
  }

  // Theory links sit in one row; whatever doesn't fit moves into a "More" menu
  // (the page you're on always stays visible), so the strip is one line at any width.
  function theoryRow() {
    var row = document.createElement('div');
    row.className = 'mf-theory';
    var wrap = document.createElement('div');
    wrap.className = 'mf-links';
    var links = THEORY.map(link);
    links.forEach(function (a) { wrap.appendChild(a); });
    row.appendChild(wrap);
    // The menu sits outside the clipped link row so its list can drop below the strip.
    var more = dropdown('More', 'More music theory and instruments', [{ items: [] }]);
    more.classList.add('mf-more');
    var moreList = more.querySelector('.mf-menu-list');
    row.appendChild(more);
    var phone = window.matchMedia('(max-width: 720px)');
    function fit() {
      links.forEach(function (a) { a.hidden = false; });
      moreList.textContent = '';
      more.hidden = true;
      if (phone.matches || !wrap.clientWidth) return;
      if (wrap.scrollWidth <= wrap.clientWidth + 1) return;
      more.hidden = false;
      var order = links.slice().reverse().filter(function (a) { return !a.hasAttribute('aria-current'); });
      var moved = [];
      for (var i = 0; i < order.length && wrap.scrollWidth > wrap.clientWidth + 1; i++) {
        order[i].hidden = true;
        moved.unshift(order[i]);
      }
      moved.forEach(function (a) {
        var c = a.cloneNode(true); c.hidden = false; moreList.appendChild(c);
      });
    }
    row._fit = fit;
    return row;
  }

  function build() {
    if (document.querySelector('.music-family')) return;
    var nav = document.createElement('nav');
    nav.className = 'music-family';
    // This compact navigation owns its surfaces; automatic panel detection
    // otherwise turns bordered rows into oversized skin inventory panels.
    nav.setAttribute('data-skin-keep', '');
    nav.setAttribute('aria-label', 'Music lessons');
    // On phones the whole strip folds into one "♪ Music · <this page>" row;
    // on wider screens it stays open and the summary is hidden.
    var fold = document.createElement('details');
    fold.className = 'mf-fold';
    var foldSum = document.createElement('summary');
    var all = THEORY.concat(COMPOSERS, SCIENCE);
    var now = all.filter(function (it) { return here(it.file); })[0];
    foldSum.textContent = '♪ Music' + (now ? ' · ' + now.label : '');
    fold.appendChild(foldSum);
    var body = document.createElement('div');
    body.className = 'mf-body';
    var theory = theoryRow();
    body.appendChild(titled('Music theory & instruments', 'Theory', theory));
    body.appendChild(titled('Composers', 'Composers', dropdown('Composers', 'Composers', ERAS.map(function (era) {
      return { label: era.label, items: era.composers };
    }))));
    body.appendChild(titled('Science of sound', 'Sound', dropdown('Science of sound', 'Science of sound', [{ items: SCIENCE }])));
    fold.appendChild(body);
    nav.appendChild(fold);
    document.addEventListener('click', function (e) {
      menus.forEach(function (m) { if (m.open && !m.contains(e.target)) m.open = false; });
    });
    var phone = window.matchMedia('(max-width: 720px)');
    function syncFold() { fold.open = !phone.matches; theory._fit(); }
    syncFold();
    if (phone.addEventListener) phone.addEventListener('change', syncFold);
    else if (phone.addListener) phone.addListener(syncFold);
    if (window.ResizeObserver) new ResizeObserver(function () { theory._fit(); }).observe(body);
    else window.addEventListener('resize', theory._fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(theory._fit);

    // Colours come from the theme (header tokens, --text, --accent) and corners from
    // the skin (--radius-sm), so the strip reads as part of the site header everywhere.
    var css = document.createElement('style');
    css.textContent =
      '.music-family{--mf-ink:var(--header-text,var(--text,#1d1d1f));--mf-muted:var(--text-muted,#6e6e73);--mf-accent:var(--accent,#0066cc);--mf-bg:var(--header-bg,var(--surface-elevated,#fff));--mf-line:var(--header-border,var(--line,rgba(128,128,128,.3)));--mf-r:var(--radius-sm,8px);' +
        'display:block;padding:.2rem clamp(.75rem,3vw,2rem);background:var(--mf-bg);border-bottom:1px solid var(--mf-line);color:var(--mf-ink);font:600 .8rem/1.3 var(--skin-font-ui,inherit);position:relative;z-index:29;flex-shrink:0;backdrop-filter:saturate(135%) blur(16px)}' +
      '.music-family .mf-body{display:flex;align-items:center;gap:.25rem 1rem;max-width:1440px;margin:0 auto;min-width:0}' +
      '.music-family .mf-group{display:flex;align-items:center;gap:.4rem;min-width:0;flex:0 0 auto}' +
      '.music-family .mf-group:first-child{flex:1 1 auto}' +
      '.music-family .mf-group+.mf-group{padding-left:1rem;border-left:1px solid var(--mf-line)}' +
      '.music-family .mf-title{flex:0 0 auto;color:var(--mf-muted);font-size:.64rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}' +
      '.music-family .mf-theory{display:flex;align-items:center;gap:.25rem;min-width:0;flex:1 1 auto}' +
      '.music-family .mf-links{display:flex;flex-wrap:nowrap;align-items:center;gap:.1rem;min-width:0;flex:1 1 auto;overflow:hidden}' +
      '.music-family .mf-links>a{flex:0 0 auto;white-space:nowrap}' +
      '.music-family a,body.theme-liquid-woodland .music-family a{display:inline-flex;align-items:center;min-height:2rem;box-sizing:border-box;padding:.2rem .55rem;border-radius:var(--mf-r);color:var(--mf-ink);text-decoration:none}' +
      '.music-family a[hidden],.music-family .mf-more[hidden]{display:none}' +
      '.music-family a:hover,.music-family a:focus-visible{background:color-mix(in srgb,var(--mf-ink) 12%,transparent);outline:none}' +
      '.music-family :is(a,summary):focus-visible{box-shadow:0 0 0 2px var(--mf-accent)}' +
      '.music-family a[aria-current="page"],body.theme-liquid-woodland .music-family a[aria-current="page"],.music-family .mf-menu summary[aria-current="page"]{background:var(--mf-accent);color:var(--accent-contrast,#fff);border-color:var(--mf-accent)}' +
      '.music-family .mf-fold>summary{display:none;list-style:none;cursor:pointer;font-weight:700;min-height:2rem;align-items:center;gap:.5rem}' +
      '.music-family .mf-fold>summary::-webkit-details-marker{display:none}' +
      '.music-family :is(.mf-fold>summary,.mf-menu summary)::after{content:"";flex:0 0 auto;width:.38rem;height:.38rem;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg);margin-top:-.2rem}' +
      '.music-family :is(.mf-fold[open]>summary,.mf-menu[open] summary)::after{transform:rotate(225deg);margin-top:.2rem}' +
      '.music-family .mf-menu{position:relative;flex:0 0 auto;min-width:0}' +
      '.music-family .mf-menu summary{box-sizing:border-box;display:flex;align-items:center;gap:.5rem;min-height:2rem;list-style:none;cursor:pointer;padding:.2rem .6rem;border-radius:var(--mf-r);border:1px solid var(--mf-line);white-space:nowrap;font:inherit;outline:none}' +
      '.music-family .mf-menu summary::-webkit-details-marker{display:none}' +
      '.music-family .mf-menu summary:hover{background:color-mix(in srgb,var(--mf-ink) 12%,transparent)}' +
      '.music-family .mf-menu-list{position:absolute;left:0;top:calc(100% + .3rem);z-index:40;display:grid;min-width:min(14rem,calc(100vw - 2rem));max-height:min(32rem,65vh);overflow-y:auto;overscroll-behavior:contain;padding:.4rem;border-radius:calc(var(--mf-r) + 4px);background:var(--surface-elevated,var(--bg,#fff));color:var(--text,inherit);border:1px solid var(--mf-line);box-shadow:var(--skin-shadow,0 12px 30px rgba(0,0,0,.28))}' +
      '.music-family .mf-menu-list a{display:flex;color:var(--text,inherit)}' +
      '.music-family .mf-menu-era{padding:.45rem .55rem .1rem;color:var(--mf-muted);font-size:.62rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}' +
      '.music-family .mf-menu-era:first-child{padding-top:.15rem}' +
      '@media (max-width:720px){' +
        '.music-family{padding:.15rem .75rem}' +
        '.music-family .mf-fold>summary{display:flex}' +
        '.music-family .mf-body{flex-direction:column;align-items:stretch;gap:.5rem;padding:.35rem 0 .5rem}' +
        '.music-family .mf-group{flex-wrap:wrap;align-items:flex-start}' +
        '.music-family .mf-group+.mf-group{padding-left:0;border-left:0;padding-top:.5rem;border-top:1px solid var(--mf-line)}' +
        '.music-family .mf-title{flex-basis:100%}' +
        '.music-family .mf-theory{flex-basis:100%}' +
        '.music-family .mf-links{flex-wrap:wrap;overflow:visible}' +
        '.music-family a{min-height:2.5rem}' +
        '.music-family .mf-menu summary{min-height:2.5rem}' +
      '}' +
      '@media print{.music-family{display:none}}';
    document.head.appendChild(css);

    // Viewport lessons scroll inside .ll-sim. Keep the hub in that same flow
    // so it scrolls away with the lesson instead of reserving a permanent row.
    var placement = document.querySelector('[data-music-family-placement]');
    var lessonScroller = document.querySelector('.ll-viewport .ll-stage .ll-sim');
    var anchor = document.querySelector('.ll-topbar, .pno-topbar, .gtr-topbar, .vln-topbar, header.site-header, header');
    if (placement) placement.replaceWith(nav);
    else if (lessonScroller) lessonScroller.insertBefore(nav, lessonScroller.firstChild);
    else if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(nav, anchor.nextSibling);
    else document.body.insertBefore(nav, document.body.firstChild);
    theory._fit();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
