/* Walt Disney lesson: "The Flywheel" strategy map.
   An original diagram of the idea behind Disney's 1957 business chart: every
   division feeds the others. Nodes and links are data below; the SVG, the
   readout and the full list are all generated from it, so they cannot drift.
   Press a node to light up what it gives and gets. "Walk the loop" steps through
   one trip around the wheel. */
(function () {
  'use strict';
  var host = document.getElementById('wd-flywheel');
  if (!host) return;

  var NS = 'http://www.w3.org/2000/svg';

  var NODES = {
    studio: { label: 'Film studio',      sub: 'the engine',        x: 380, y: 250, color: '#dc2626' },
    tv:     { label: 'Television',       sub: 'shows + ads',       x: 120, y: 85,  color: '#1d4ed8' },
    music:  { label: 'Music',            sub: 'songs + records',   x: 640, y: 85,  color: '#7c3aed' },
    pub:    { label: 'Publishing',       sub: 'books + comics',    x: 665, y: 290, color: '#b45309' },
    merch:  { label: 'Merchandise',      sub: 'licensed products', x: 95,  y: 305, color: '#059669' },
    park:   { label: 'Theme park',       sub: 'Disneyland',        x: 300, y: 455, color: '#0e7490' },
    shops:  { label: 'Park shops',       sub: 'art + souvenirs',   x: 585, y: 455, color: '#be185d' }
  };

  // from, to, what flows. Written for students, in our own words.
  var LINKS = [
    ['studio', 'tv',    'Hands the TV shows its characters, stories and behind-the-scenes footage.'],
    ['tv',     'studio', 'Advertises every new film to a living room full of future ticket buyers.'],
    ['tv',     'park',  'Shows the park on air, so the audience wants to visit before it opens.'],
    ['park',   'tv',    'Gives TV a ready-made set: rides, parades and a castle to film in.'],
    ['studio', 'music', 'Supplies songs and singers that become records.'],
    ['music',  'studio', 'Keeps a film in people’s heads through the radio long after it leaves theaters.'],
    ['studio', 'pub',   'Turns finished stories into picture books and comic strips.'],
    ['pub',    'studio', 'Reminds readers of old characters, so a re-release has an audience.'],
    ['studio', 'merch', 'Lends characters to toy, clothing and school-supply makers for a fee.'],
    ['merch',  'studio', 'Puts the characters in a child’s hands every day between films.'],
    ['studio', 'park',  'Supplies the stories, characters and design ideas for the rides.'],
    ['park',   'studio', 'Brings in crowds who see the studio’s films, and sends them home fans.'],
    ['park',   'shops', 'Needs places for visitors to spend money, so shops line the streets.'],
    ['shops',  'merch', 'Sell licensed goods straight to the people already in the park.'],
    ['merch',  'park',  'Gives visitors something to take home, which advertises the park to everyone they know.'],
    ['pub',    'park',  'Publishes park guides and magazines that keep it in the news.']
  ];

  // One trip around the wheel: indexes into LINKS.
  var LOOP = [0, 2, 10, 11, 13, 9];
  var LOOP_TITLES = [
    'A new film needs viewers. The studio feeds TV.',
    'TV shows the park to the whole country.',
    'The studio builds rides from its own stories.',
    'The park sends crowds back toward the films.',
    'Visitors buy merchandise and carry the brand home.',
    'Merchandise keeps characters in view, and the next film has a built-in audience.'
  ];

  var svg, nodeEls = {}, linkEls = [], readout, listEl, loopBtn, loopStep = -1, selected = 'studio';

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function edgePath(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy);
    var ux = dx / len, uy = dy / len;
    // Trim to just outside each node, then bow the curve sideways so a pair
    // of opposite links reads as two lanes instead of one line.
    var trimA = 58, trimB = 64;
    var x1 = a.x + ux * trimA, y1 = a.y + uy * trimA;
    var x2 = b.x - ux * trimB, y2 = b.y - uy * trimB;
    var bow = 26;
    var cx = (x1 + x2) / 2 - uy * bow, cy = (y1 + y2) / 2 + ux * bow;
    return 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) +
           ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1);
  }

  function build() {
    host.innerHTML =
      '<div class="dfw-stage"></div>' +
      '<div class="dfw-side">' +
        '<div class="dfw-controls">' +
          '<button type="button" class="dfw-btn" data-loop>▶ Walk the loop</button>' +
          '<button type="button" class="dfw-btn dfw-btn--ghost" data-clear>Show everything</button>' +
        '</div>' +
        '<div class="dfw-readout" aria-live="polite"></div>' +
      '</div>';
    var stage = host.querySelector('.dfw-stage');
    readout = host.querySelector('.dfw-readout');
    loopBtn = host.querySelector('[data-loop]');

    svg = el('svg', { viewBox: '0 0 760 540', role: 'group', 'aria-label': 'Map of how Disney’s businesses feed each other', 'class': 'dfw-svg' }, stage);
    var defs = el('defs', {}, svg);
    ['', '-hot'].forEach(function (suffix) {
      var m = el('marker', { id: 'dfw-arrow' + suffix, viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M0 0 L10 5 L0 10 z', 'class': 'dfw-head' + suffix }, m);
    });

    var linkLayer = el('g', { 'class': 'dfw-links' }, svg);
    LINKS.forEach(function (l, i) {
      var p = el('path', { d: edgePath(NODES[l[0]], NODES[l[1]]), 'class': 'dfw-link', 'marker-end': 'url(#dfw-arrow)', 'data-i': i }, linkLayer);
      linkEls.push(p);
    });

    var nodeLayer = el('g', { 'class': 'dfw-nodes' }, svg);
    Object.keys(NODES).forEach(function (id) {
      var n = NODES[id];
      var g = el('g', { 'class': 'dfw-node', tabindex: '0', role: 'button', 'aria-pressed': 'false', 'aria-label': n.label + ', ' + n.sub, 'data-id': id, transform: 'translate(' + n.x + ' ' + n.y + ')' }, nodeLayer);
      var w = id === 'studio' ? 128 : 116, h = id === 'studio' ? 70 : 58;
      el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 16, 'class': 'dfw-box', style: 'stroke:' + n.color }, g);
      var t1 = el('text', { y: -3, 'text-anchor': 'middle', 'class': 'dfw-name' }, g); t1.textContent = n.label;
      var t2 = el('text', { y: 14, 'text-anchor': 'middle', 'class': 'dfw-sub' }, g); t2.textContent = n.sub;
      nodeEls[id] = g;
      g.addEventListener('click', function () { stopLoop(); select(id); });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stopLoop(); select(id); }
      });
    });

    // Full list: always in the page, so print and screen readers get every link.
    var details = document.createElement('details');
    details.className = 'dfw-all';
    details.innerHTML = '<summary>All ' + LINKS.length + ' connections as a list</summary>';
    listEl = document.createElement('ul');
    LINKS.forEach(function (l) {
      var li = document.createElement('li');
      li.innerHTML = '<strong>' + NODES[l[0]].label + ' → ' + NODES[l[1]].label + '.</strong> ' + l[2];
      listEl.appendChild(li);
    });
    details.appendChild(listEl);
    host.appendChild(details);
    window.addEventListener('beforeprint', function () { details.open = true; });

    host.querySelector('[data-loop]').addEventListener('click', toggleLoop);
    host.querySelector('[data-clear]').addEventListener('click', function () { stopLoop(); select(null); });
  }

  function paint(activeLinks, activeNodes) {
    linkEls.forEach(function (p, i) {
      var on = activeLinks.indexOf(i) !== -1;
      p.classList.toggle('is-on', on);
      p.classList.toggle('is-dim', !on && activeLinks.length > 0);
      p.setAttribute('marker-end', on ? 'url(#dfw-arrow-hot)' : 'url(#dfw-arrow)');
    });
    Object.keys(nodeEls).forEach(function (id) {
      var on = activeNodes.indexOf(id) !== -1;
      nodeEls[id].classList.toggle('is-on', on);
      nodeEls[id].classList.toggle('is-dim', !on && activeNodes.length > 0);
      nodeEls[id].setAttribute('aria-pressed', id === selected ? 'true' : 'false');
    });
  }

  function select(id) {
    selected = id;
    if (!id) {
      paint([], []);
      readout.innerHTML = '<p class="dfw-lead"><strong>Every arrow is something one business gives another.</strong> ' +
        'Seven businesses, ' + LINKS.length + ' hand-offs. Press any box to see what it gives and what it gets.</p>';
      return;
    }
    var out = [], inn = [], nodes = [id];
    LINKS.forEach(function (l, i) {
      if (l[0] === id) { out.push(i); if (nodes.indexOf(l[1]) === -1) nodes.push(l[1]); }
      if (l[1] === id) { inn.push(i); if (nodes.indexOf(l[0]) === -1) nodes.push(l[0]); }
    });
    paint(out.concat(inn), nodes);
    function rows(ixs, dir) {
      return ixs.map(function (i) {
        var l = LINKS[i], other = dir === 'out' ? l[1] : l[0];
        return '<li><strong>' + (dir === 'out' ? '→ ' : '← ') + NODES[other].label + ':</strong> ' + l[2] + '</li>';
      }).join('');
    }
    readout.innerHTML =
      '<h3 class="dfw-h" style="color:' + NODES[id].color + '">' + NODES[id].label + '</h3>' +
      '<p class="dfw-tag">Gives ' + out.length + ' · gets ' + inn.length + '</p>' +
      '<h4>What it gives</h4><ul>' + rows(out, 'out') + '</ul>' +
      '<h4>What it gets</h4><ul>' + rows(inn, 'in') + '</ul>';
  }

  function showLoopStep() {
    var i = LOOP[loopStep], l = LINKS[i];
    selected = null;
    var done = LOOP.slice(0, loopStep + 1);
    var nodes = [];
    done.forEach(function (k) { [LINKS[k][0], LINKS[k][1]].forEach(function (n) { if (nodes.indexOf(n) === -1) nodes.push(n); }); });
    paint(done, nodes);
    linkEls[i].classList.add('is-now');
    readout.innerHTML =
      '<p class="dfw-tag">Step ' + (loopStep + 1) + ' of ' + LOOP.length + '</p>' +
      '<p class="dfw-lead"><strong>' + LOOP_TITLES[loopStep] + '</strong></p>' +
      '<p>' + NODES[l[0]].label + ' → ' + NODES[l[1]].label + ': ' + l[2] + '</p>';
    loopBtn.textContent = loopStep === LOOP.length - 1 ? '↺ Walk it again' : '▶ Next step';
  }

  function toggleLoop() {
    loopStep = (loopStep + 1) % LOOP.length;
    showLoopStep();
  }
  function stopLoop() { loopStep = -1; if (loopBtn) loopBtn.textContent = '▶ Walk the loop'; }

  build();
  select('studio');
})();
