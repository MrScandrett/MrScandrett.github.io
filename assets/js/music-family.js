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
    { file: 'lessons/technical-elements/piano-chords.html', label: 'Piano' },
    { file: 'lessons/technical-elements/guitar-chords.html', label: 'Guitar' },
    { file: 'lessons/technical-elements/violin-fingerboard.html', label: 'Violin' },
    { file: 'lessons/technical-elements/drums.html', label: 'Drums' },
    { file: 'lessons/technical-elements/beethoven.html', label: 'Beethoven' },
    { file: 'music-lab.html', label: 'Music Lab' }
  ];
  var SCIENCE = [
    { file: 'lessons/physics/physics-of-music.html', label: 'Physics of Music' },
    { file: 'lessons/physics/do-atoms-make-music.html', label: 'Do Atoms Make Music?' },
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

  function build() {
    if (document.querySelector('.music-family')) return;
    var nav = document.createElement('nav');
    nav.className = 'music-family';
    nav.setAttribute('aria-label', 'Music lessons');
    nav.appendChild(group('Music theory & instruments', THEORY));
    nav.appendChild(group('Science of sound', SCIENCE));

    var css = document.createElement('style');
    css.textContent =
      '.music-family{display:flex;flex-wrap:wrap;gap:.3rem 1.6rem;align-items:center;justify-content:center;padding:.45rem clamp(1rem,4vw,2.5rem);background:#241a14;border-bottom:1px solid rgba(255,255,255,.12);font:600 .76rem "DM Sans",system-ui,sans-serif;position:relative;z-index:29;flex-shrink:0}' +
      '.music-family .mf-group{display:flex;flex-wrap:wrap;gap:.15rem .2rem;align-items:center}' +
      '.music-family .mf-title{margin-right:.4rem;color:#ffb98a;font-size:.66rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}' +
      '.music-family a{padding:.3rem .6rem;border-radius:999px;color:#ffe9d6;text-decoration:none}' +
      '.music-family a:hover,.music-family a:focus-visible{background:rgba(255,255,255,.16);color:#fff;outline:none}' +
      '.music-family a:focus-visible{box-shadow:0 0 0 2px #ffd166}' +
      '.music-family a[aria-current="page"]{background:#ffd9bd;color:#241a14}';
    document.head.appendChild(css);

    var anchor = document.querySelector('.ll-topbar, .pno-topbar, .gtr-topbar, .vln-topbar, header.site-header, header');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(nav, anchor.nextSibling);
    else document.body.insertBefore(nav, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
