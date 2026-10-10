/* music-family.js — one shared "music" navigation strip for every music page.
 * Instruments & theory live together on the left; the science of sound stays
 * with the science lessons and is linked on the right.
 * Add or rename a page here and every music page updates.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var base = script ? script.src.replace(/assets\/js\/music-family\.js.*$/, '') : '';

  var THEORY = [
    { file: 'lessons/music/sheet-music-trainer.html', label: 'Sheet Music' },
    { file: 'lessons/music/piano.html', label: 'Piano' },
    { file: 'lessons/music/music-modes-evolution.html', label: 'Modes' },
    { file: 'lessons/music/guitar.html', label: 'Guitar' },
    { file: 'lessons/music/violin-fingerboard.html', label: 'Violin' },
    { file: 'lessons/music/drums.html', label: 'Drums' },
    { file: 'lessons/music/fake-book.html', label: 'Fake Book' },
    { file: 'music-lab.html', label: 'Music Lab' }
  ];
  var COMPOSERS = [
    { file: 'lessons/music/vivaldi.html', label: 'Vivaldi' },
    { file: 'lessons/music/bach.html', label: 'Bach' },
    { file: 'lessons/music/mozart.html', label: 'Mozart' },
    { file: 'lessons/music/beethoven.html', label: 'Beethoven' },
    { file: 'lessons/music/chopin.html', label: 'Chopin' },
    { file: 'lessons/music/tchaikovsky.html', label: 'Tchaikovsky' },
    { file: 'lessons/music/joplin.html', label: 'Joplin' }
  ];
  var SCIENCE = [
    { file: 'lessons/physics/waves-and-sound/physics-of-music.html', label: 'Physics of Music' },
    { file: 'lessons/physics/waves-and-sound/do-atoms-make-music.html', label: 'Do Atoms Make Music?' },
    { file: 'lessons/technical-elements/cymatics.html', label: 'Cymatics' }
  ];

  function here(file) {
    var path = location.pathname.replace(/\/index\.html$/, '/');
    return path.slice(-file.length) === file;
  }

  function group(title, items) {
    var g = document.createElement('div');
    g.className = 'mf-group';
    var t = document.createElement('span');
    t.className = 'mf-title';
    t.textContent = title;
    g.appendChild(t);
    items.forEach(function (it) {
      var a = document.createElement('a');
      a.href = base + it.file;
      a.textContent = it.label;
      if (here(it.file)) { a.setAttribute('aria-current', 'page'); }
      g.appendChild(a);
    });
    return g;
  }

  // Composers fold into one dropdown chip so the strip stays short on phones.
  function menu(title, items) {
    var d = document.createElement('details');
    d.className = 'mf-menu';
    var sum = document.createElement('summary');
    var current = items.filter(function (it) { return here(it.file); })[0];
    sum.textContent = (current ? current.label : title) + ' ▾';
    if (current) sum.setAttribute('aria-current', 'page');
    sum.setAttribute('aria-label', title + (current ? ', now on ' + current.label : ''));
    d.appendChild(sum);
    var list = document.createElement('div');
    list.className = 'mf-menu-list';
    items.forEach(function (it) {
      var a = document.createElement('a');
      a.href = base + it.file;
      a.textContent = it.label;
      if (here(it.file)) { a.setAttribute('aria-current', 'page'); }
      list.appendChild(a);
    });
    d.appendChild(list);
    document.addEventListener('click', function (e) { if (d.open && !d.contains(e.target)) d.open = false; });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.open) { d.open = false; sum.focus(); } });
    var g = document.createElement('div');
    g.className = 'mf-group';
    var t = document.createElement('span');
    t.className = 'mf-title';
    t.textContent = title;
    g.appendChild(t);
    g.appendChild(d);
    return g;
  }

  function build() {
    if (document.querySelector('.music-family')) return;
    var nav = document.createElement('nav');
    nav.className = 'music-family';
    nav.setAttribute('aria-label', 'Music lessons');
    // On phones the whole strip folds into one "♪ Music · <this page> ▾" row;
    // on wider screens it stays open and the summary is hidden.
    var fold = document.createElement('details');
    fold.className = 'mf-fold';
    var foldSum = document.createElement('summary');
    var all = THEORY.concat(COMPOSERS, SCIENCE);
    var now = all.filter(function (it) { return here(it.file); })[0];
    foldSum.textContent = '♪ Music' + (now ? ' · ' + now.label : '') + ' ▾';
    fold.appendChild(foldSum);
    var body = document.createElement('div');
    body.className = 'mf-body';
    body.appendChild(group('Music theory & instruments', THEORY));
    body.appendChild(menu('Composers', COMPOSERS));
    body.appendChild(group('Science of sound', SCIENCE));
    fold.appendChild(body);
    nav.appendChild(fold);
    var phone = window.matchMedia('(max-width: 720px)');
    function syncFold() { fold.open = !phone.matches; }
    syncFold();
    if (phone.addEventListener) phone.addEventListener('change', syncFold);
    else if (phone.addListener) phone.addListener(syncFold);

    var css = document.createElement('style');
    css.textContent =
      '.music-family{display:block;padding:.45rem clamp(1rem,4vw,2.5rem);background:#241a14;border-bottom:1px solid rgba(255,255,255,.12);font:600 .76rem "DM Sans",system-ui,sans-serif;position:relative;z-index:29;flex-shrink:0}' +
      '.music-family .mf-body{display:flex;flex-wrap:wrap;gap:.3rem 1.6rem;align-items:center;justify-content:center}' +
      '.music-family .mf-fold>summary{display:none;list-style:none;cursor:pointer;color:#ffe9d6;font-weight:700;padding:.1rem 0}' +
      '.music-family .mf-fold>summary::-webkit-details-marker{display:none}' +
      '.music-family .mf-fold>summary:focus-visible{outline:none;box-shadow:0 0 0 2px #ffd166;border-radius:6px}' +
      '@media (max-width:720px){' +
        '.music-family{padding:.3rem .85rem}' +
        '.music-family .mf-fold>summary{display:block}' +
        '.music-family .mf-body{justify-content:flex-start;padding:.4rem 0 .2rem;gap:.35rem .9rem}' +
      '}' +
      '.music-family .mf-group{display:flex;flex-wrap:wrap;gap:.15rem .2rem;align-items:center}' +
      '.music-family .mf-title{margin-right:.4rem;color:#ffb98a;font-size:.66rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}' +
      '.music-family a,body.theme-liquid-woodland .music-family a{padding:.3rem .6rem;border-radius:999px;color:#ffe9d6;text-decoration:none}' +
      '.music-family a:hover,.music-family a:focus-visible{background:rgba(255,255,255,.16);color:#fff;outline:none}' +
      '.music-family a:focus-visible{box-shadow:0 0 0 2px #ffd166}' +
      '.music-family a[aria-current="page"],body.theme-liquid-woodland .music-family a[aria-current="page"]{background:#ffd9bd;color:#241a14}' +
      '.music-family .mf-menu{position:relative}' +
      '.music-family .mf-menu summary{list-style:none;cursor:pointer;padding:.3rem .6rem;border-radius:999px;color:#ffe9d6;border:1px solid rgba(255,233,214,.35)}' +
      '.music-family .mf-menu summary::-webkit-details-marker{display:none}' +
      '.music-family .mf-menu summary:hover,.music-family .mf-menu summary:focus-visible{background:rgba(255,255,255,.16);color:#fff;outline:none;box-shadow:0 0 0 2px #ffd166}' +
      '.music-family .mf-menu summary[aria-current="page"]{background:#ffd9bd;color:#241a14;border-color:#ffd9bd}' +
      '.music-family .mf-menu-list{position:absolute;left:0;top:calc(100% + .3rem);z-index:40;display:grid;min-width:11rem;padding:.35rem;border-radius:12px;background:#241a14;border:1px solid rgba(255,255,255,.2);box-shadow:0 12px 30px rgba(0,0,0,.35)}' +
      '.music-family .mf-menu-list a{display:block;border-radius:8px}';
    document.head.appendChild(css);

    var anchor = document.querySelector('.ll-topbar, .pno-topbar, .gtr-topbar, .vln-topbar, header.site-header, header');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(nav, anchor.nextSibling);
    else document.body.insertBefore(nav, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
