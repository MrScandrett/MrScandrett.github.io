/* Interactive Bible-lands map: click a realm to outline it and read a short "Bible wiki" entry.
   Data comes from bible-world-map-data.js (built by scripts/build-bible-world-map.mjs). */
(function () {
  'use strict';
  var data = window.BIBLE_WORLD_MAP;
  var main = document.querySelector('[data-bible-lesson="world-of-the-bible"]');
  var grid = main && main.querySelector('.bpl-map-grid');
  if (!data || !grid) return;
  var NS = 'http://www.w3.org/2000/svg';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var small = { canaan: 1, phoenicia: 1, transjordan: 1 }; // too small to label; use the chips below
  var svg = '<svg viewBox="0 0 ' + data.w + ' ' + data.h + '" role="group" aria-label="Map of the biblical world. Select a region to read about it.">' +
    '<rect class="bwm-sea" width="' + data.w + '" height="' + data.h + '"/><path class="bwm-land" d="' + data.base + '"/>' +
    data.realms.map(function (r) {
      return '<path class="bwm-realm" data-id="' + r.id + '" d="' + r.d + '" tabindex="0" role="button" aria-pressed="false" aria-label="' + esc(r.name) + '"><title>' + esc(r.name) + '</title></path>';
    }).join('') +
    data.realms.map(function (r) { return small[r.id] ? '' : '<text class="bwm-label" x="' + r.label[0] + '" y="' + r.label[1] + '">' + esc(r.name.split(' (')[0]) + '</text>'; }).join('') +
    '</svg>';
  var chips = '<div class="bwm-chips">' + data.realms.map(function (r) { return '<button type="button" class="bwm-chip" data-id="' + r.id + '">' + esc(r.name) + '</button>'; }).join('') + '</div>';

  grid.classList.add('bwm-grid');
  grid.innerHTML = '<div class="bwm-map">' + svg + chips + '</div><div class="bwm-panel" aria-live="polite"></div>';
  var panel = grid.querySelector('.bwm-panel');
  var realms = Array.prototype.slice.call(grid.querySelectorAll('.bwm-realm'));
  var svgEl = grid.querySelector('svg');

  function intro() {
    panel.innerHTML = '<h3>Choose a land</h3><p>Click any shaded region to outline its border and read about its people, religion, leaders, and place in the Bible. Outlines are approximate, drawn over today’s coastlines.</p>';
  }
  function list(items) { return '<ul>' + items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>'; }
  function select(id) {
    var r = data.realms.filter(function (x) { return x.id === id; })[0];
    realms.forEach(function (el) {
      var on = el.getAttribute('data-id') === id;
      el.classList.toggle('is-selected', on);
      el.setAttribute('aria-pressed', on);
      chipEls.forEach(function (c) { c.classList.toggle('is-selected', c.getAttribute('data-id') === id); });
      if (on) svgEl.appendChild(el); // raise so the full border shows
    });
    svgEl.querySelectorAll('.bwm-label').forEach(function (t) { svgEl.appendChild(t); });
    panel.innerHTML = '<h3>' + esc(r.name) + '</h3>' +
      '<dl><dt>Modern-day country</dt><dd>' + esc(r.modern) + '</dd>' +
      (r.era ? '<dt>In Bible times</dt><dd>' + esc(r.era) + '</dd>' : '') +
      '<dt>Religion</dt><dd>' + esc(r.religion) + '</dd>' +
      '<dt>Leaders</dt><dd>' + list(r.leaders) + '</dd>' +
      '<dt>Role in the story</dt><dd>' + esc(r.story) + '</dd></dl>' +
      '<button type="button" class="bwm-clear">Clear selection</button>';
    panel.querySelector('.bwm-clear').addEventListener('click', clear);
  }
  function clear() {
    chipEls.forEach(function (c) { c.classList.remove('is-selected'); });
    realms.forEach(function (el) { el.classList.remove('is-selected'); el.setAttribute('aria-pressed', 'false'); });
    intro();
  }
  var chipEls = Array.prototype.slice.call(grid.querySelectorAll('.bwm-chip'));
  chipEls.forEach(function (c) { c.addEventListener('click', function () { select(c.getAttribute('data-id')); }); });
  realms.forEach(function (el) {
    el.addEventListener('click', function () { select(el.getAttribute('data-id')); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(el.getAttribute('data-id')); } });
  });
  intro();
}());
