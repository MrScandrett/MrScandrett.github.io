(function () {
  'use strict';
  var E = window.EarthEngine, S = document.getElementById('map');
  var descriptions = {
    globe: ['Orthographic globe view', 'One hemisphere at a time', 'A globe preserves surface geography. This orthographic view compresses features near the visible edge; turn it to see the far side.'],
    mercator: ['Mercator', 'Preserves local angles', 'Constant compass bearings are straight. High latitudes expand dramatically, and the poles cannot be shown at finite scale.'],
    peters: ['Gall–Peters', 'Preserves relative area', 'Cylindrical equal-area projection with standard parallels at 45° north and south. Shapes stretch, but relative land areas are preserved.'],
    robinson: ['Robinson', 'A compromise projection', 'The actual Robinson projection balances area and shape distortion without preserving either exactly.'],
    conic: ['Lambert conformal conic', 'Regional view · 30° / 60° parallels', 'Preserves local angles. This rectangular regional view emphasizes Europe, North Africa, and western Asia, using standard parallels at 30° and 60° north. It is not a whole-world map.'],
    azimuthal: ['North-polar azimuthal equidistant', 'Distances true from the North Pole', 'Distances from the North Pole are true. The South Pole is the limiting outer rim; shapes near that rim are severely distorted.']
  };
  var labels = [['North America', [-108, 48]], ['South America', [-59, -18]], ['Europe', [15, 54]], ['Africa', [18, 2]], ['Asia', [92, 43]], ['Australia', [134, -26]], ['Antarctica', [0, -78]]];
  var oceans = [['Pacific', [-145, -8]], ['Atlantic', [-30, 8]], ['Indian', [78, -18]], ['Arctic', [0, 79]], ['Southern', [0, -58]]];
  var current = 'globe', longitude = -20;
  var NS = 'http://www.w3.org/2000/svg';
  function node(tag, attrs, value) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (key) { el.setAttribute(key, attrs[key]); });
    if (value != null) el.textContent = value;
    return el;
  }
  function draw() {
    var info = descriptions[current], geo = E.data();
    var p = E.projection(current, current === 'globe' ? { rotate: [-longitude, -15] } : {});
    document.getElementById('name').textContent = info[0];
    document.getElementById('tag').textContent = info[1];
    document.getElementById('description').textContent = info[2];
    document.getElementById('globe-turn').hidden = current !== 'globe';
    S.replaceChildren(node('title', { id: 'mapTitle' }, info[0]), node('desc', { id: 'mapDesc' }, 'Natural Earth land and islands, correctly clipped and projected; labels identify conventional continents and oceans.'));
    S.appendChild(node('rect', { width: 900, height: 480, fill: '#0c2440' }));
    var outline = E.path(p, { type: 'Sphere' });
    S.appendChild(current === 'conic'
      ? node('rect', { x: 20, y: 20, width: 860, height: 440, fill: '#116e8c', stroke: '#b7e5e9' })
      : node('path', { d: outline, fill: '#116e8c', stroke: '#b7e5e9' }));
    S.appendChild(node('path', { d: E.path(p, d3.geoGraticule().step([30, 30])()), fill: 'none', stroke: '#b7e5e9', 'stroke-opacity': .28, 'stroke-width': .8 }));
    S.appendChild(node('path', { d: E.path(p, geo.land), fill: '#d5bc74', stroke: '#fff0bf', 'stroke-width': .6, class: 'continent' }));
    if (document.getElementById('show-borders').checked) {
      var defs = node('defs'), mask = node('mask', { id: 'border-mask', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 900, height: 480 });
      mask.appendChild(node('rect', { width: 900, height: 480, fill: 'white' }));
      mask.appendChild(node('path', { d: E.path(p, geo.disputed), fill: 'none', stroke: 'black', 'stroke-width': 3 }));
      defs.appendChild(mask); S.appendChild(defs);
      S.appendChild(node('path', { d: E.path(p, geo.countries), fill: 'none', stroke: '#694e30', 'stroke-width': .65, mask: 'url(#border-mask)' }));
      S.appendChild(node('path', { d: E.path(p, geo.disputed), fill: 'none', stroke: '#8e2536', 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }));
    }
    [labels, oceans].forEach(function (group, i) {
      group.forEach(function (item) {
        if (!E.visible(p, item[1])) return;
        var xy = p(item[1]);
        if (!xy || xy[0] < 5 || xy[0] > 895 || xy[1] < 12 || xy[1] > 468) return;
        var color = i ? '#e6fbf9' : '#352a15';
        var background = i ? '#12627c' : '#fcefc9', width = item[0].length * 7 + 8;
        var label = node('g', { 'data-contrast-guard-skip': '', style: 'background-color:' + background });
        label.appendChild(node('rect', { x: xy[0] - width / 2, y: xy[1] - 13, width: width, height: 18, rx: 3, fill: background }));
        label.appendChild(node('text', { x: xy[0], y: xy[1], fill: color, 'font-family': 'sans-serif', 'font-size': i ? 13 : 12, 'text-anchor': 'middle', style: 'text-shadow:none;fill:' + color + ';color:' + color }, item[0]));
        S.appendChild(label);
      });
    });
  }
  document.querySelectorAll('.projection').forEach(function (b) {
    b.addEventListener('click', function () {
      current = b.dataset.p;
      document.querySelectorAll('.projection').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      draw();
    });
  });
  document.getElementById('globe-longitude').addEventListener('input', function (e) { longitude = Number(e.target.value); draw(); });
  document.getElementById('show-borders').addEventListener('change', draw);
  document.getElementById('reveal').addEventListener('click', function (e) {
    e.currentTarget.setAttribute('aria-expanded', 'true');
    document.getElementById('answer').textContent = 'Africa is about 30.4 million km²; Greenland is about 2.2 million km². Africa is roughly fourteen times larger, even when Mercator makes Greenland look similar in size.';
  });
  draw();
}());
