(function () {
  'use strict';

  const core = window.RoadsToRomeCore;
  if (!core) return;

  const { MODE_META, EDGES, LONDINIUM_FACT, computeRoute, computeCostComparison } = core;

  // Shallow clone of nodes so projected map coordinates stay local to this view.
  const NODES = {};
  Object.keys(core.NODES).forEach(function (id) {
    NODES[id] = Object.assign({}, core.NODES[id]);
  });

  const svg = document.getElementById('romaMap');
  if (!svg || typeof EarthEngine === 'undefined') return;

  const mapProjection = EarthEngine.projection('mercator', {
    extent: [[10, 10], [854, 610]],
    geometry: { type: 'MultiPoint', coordinates: [[-13, 27], [44, 58]] }
  }).clipExtent([[0, 0], [864, 620]]);

  const LAND_PATHS = [EarthEngine.path(mapProjection, EarthEngine.data().land)];
  const cityLocations = {
    roma: [12.496, 41.903],
    massilia: [5.3698, 43.2965],
    gades: [-6.2886, 36.5298],
    londinium: [-0.1276, 51.5072],
    carthago: [10.323, 36.853],
    alexandria: [29.9187, 31.2001],
    byzantium: [28.9784, 41.0082],
    antiochia: [36.16, 36.20],
    corinthus: [22.88, 37.91],
    ephesus: [27.34, 37.94]
  };
  Object.entries(cityLocations).forEach(function (entry) {
    const id = entry[0];
    const coords = mapProjection(entry[1]);
    if (NODES[id] && coords) {
      NODES[id].x = coords[0];
      NODES[id].y = coords[1];
    }
  });

  const RIVER_PATHS = [];
  const SEA_LABELS = [
    { x: 64, y: 385, text: 'Oceanvs Atlanticvs' },
    { x: 368, y: 342, text: 'Mare Tyrrhenvm' },
    { x: 480, y: 449, text: 'Mare Internvm' },
    { x: 592, y: 385, text: 'Mare Aegaevm' },
    { x: 700, y: 100, text: 'Pontvs Evxinvs' }
  ];

  function edgeControlPoint(e) {
    if (e.via) return { cx: e.via[0], cy: e.via[1] };
    const p1 = NODES[e.a];
    const p2 = NODES[e.b];
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    return { cx: mx + nx * e.bow, cy: my + ny * e.bow };
  }

  function renderStaticMap() {
    const defs =
      '<defs>' +
        '<radialGradient id="seaGradient" cx="30%" cy="20%" r="90%">' +
          '<stop offset="0%" stop-color="#5f97a4"></stop>' +
          '<stop offset="55%" stop-color="#3e7484"></stop>' +
          '<stop offset="100%" stop-color="#284f5c"></stop>' +
        '</radialGradient>' +
        '<linearGradient id="landGradient" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#e6d5a8"></stop>' +
          '<stop offset="100%" stop-color="#c7ab77"></stop>' +
        '</linearGradient>' +
      '</defs>';

    const seaRect = '<rect x="0" y="0" width="864" height="620" fill="url(#seaGradient)"></rect>';
    const wavePaths = Array.from({ length: 14 }).map(function (_, i) {
      return '<path d="M ' + (-40 + i * 70) + ',620 q 35,-40 70,0" fill="none" stroke="#fff" stroke-width="1"></path>';
    }).join('');
    const seaTexture =
      '<rect x="0" y="0" width="864" height="620" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"></rect>' +
      '<g opacity="0.12">' + wavePaths + '</g>';

    const land = LAND_PATHS.map(function (d) {
      return '<path class="roma-land" d="' + d + '"></path>';
    }).join('');
    const rivers = RIVER_PATHS.map(function (d) {
      return '<path class="roma-river" d="' + d + '" fill="none"></path>';
    }).join('');
    const seaLabels = SEA_LABELS.map(function (l) {
      return '<text class="roma-sea-label" x="' + l.x + '" y="' + l.y + '" text-anchor="middle">' + l.text + '</text>';
    }).join('');

    const compass =
      '<g transform="translate(64,80)" opacity="0.85">' +
        '<circle r="26" fill="rgba(28,20,10,0.35)" stroke="#e8cd97" stroke-width="1"></circle>' +
        '<path d="M 0,-20 L 6,0 L 0,20 L -6,0 Z" fill="#e8cd97"></path>' +
        '<path d="M -20,0 L 0,6 L 20,0 L 0,-6 Z" fill="#e8cd97" opacity="0.7"></path>' +
        '<text x="0" y="-30" text-anchor="middle" class="roma-sea-label" font-size="10">N</text>' +
      '</g>';

    svg.innerHTML =
      defs + seaRect + seaTexture + land + rivers + seaLabels + compass +
      '<g id="romaEdgeLayer"></g>' +
      '<g id="romaNodeLayer"></g>';
  }

  function renderEdges(activeEdgeSet, excludedSeasonal) {
    const layer = svg.querySelector('#romaEdgeLayer');
    layer.innerHTML = EDGES.map(function (e) {
      const p1 = NODES[e.a];
      const p2 = NODES[e.b];
      const cp = edgeControlPoint(e);
      const meta = MODE_META[e.mode];
      const isActive = activeEdgeSet.has(e);
      const isClosed = excludedSeasonal && e.seasonal;
      const cls = ['roma-route-line', isActive ? 'is-active' : (isClosed ? 'is-inactive-season' : 'is-dim')].join(' ');
      return (
        '<path class="' + cls + '" d="M ' + p1.x + ',' + p1.y + ' Q ' + cp.cx + ',' + cp.cy + ' ' + p2.x + ',' + p2.y + '"' +
        ' stroke="' + (isActive ? '#c98b2e' : meta.color) + '" stroke-width="' + (isActive ? 5.5 : 2.4) + '"' +
        ' stroke-dasharray="' + meta.dash + '" stroke-linecap="round"></path>'
      );
    }).join('');
  }

  const originSelect = document.getElementById('romaOrigin');
  if (!originSelect) return;

  Object.keys(NODES).filter(function (id) { return id !== 'roma'; }).forEach(function (id) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = NODES[id].name + ' (' + NODES[id].modern + ')';
    originSelect.appendChild(opt);
  });
  originSelect.value = 'londinium';

  let priority = 'days';
  let season = 'summer';

  const ticketTitle = document.getElementById('romaTicketTitle');
  const totalDaysEl = document.getElementById('romaTotalDays');
  const totalPriceEl = document.getElementById('romaTotalPrice');
  const stepsEl = document.getElementById('romaSteps');
  const seasonCompareEl = document.getElementById('romaSeasonCompare');
  const crowFliesEl = document.getElementById('romaCrowFlies');

  function renderNodes(originId, pathNodeIds) {
    const layer = svg.querySelector('#romaNodeLayer');
    layer.innerHTML = Object.keys(NODES).map(function (id) {
      const n = NODES[id];
      const isOrigin = id === 'roma';
      const isSelected = id === originId;
      const onPath = pathNodeIds.has(id);
      const r = (isOrigin || isSelected) ? 9 : (onPath ? 7.5 : 6);
      const cls = [
        'roma-city-dot',
        isOrigin ? 'is-origin' : '',
        isSelected ? 'is-active' : '',
        onPath ? 'is-on-path' : ''
      ].filter(Boolean).join(' ');
      const a11yAttr = isOrigin
        ? ''
        : ' role="button" tabindex="0" aria-label="Select ' + n.name + ' as starting city"';
      return (
        '<g class="' + cls + '" data-city="' + id + '"' + a11yAttr + '>' +
          '<circle class="ring" cx="' + n.x + '" cy="' + n.y + '" r="' + (r + 3) + '"></circle>' +
          '<circle class="core" cx="' + n.x + '" cy="' + n.y + '" r="' + r + '"></circle>' +
          '<text class="roma-city-label" x="' + n.x + '" y="' + (n.y - 14) + '" text-anchor="middle">' + n.name + '</text>' +
        '</g>'
      );
    }).join('');

    layer.querySelectorAll('[data-city]').forEach(function (el) {
      function chooseCity() {
        const id = el.getAttribute('data-city');
        if (id === 'roma') return;
        originSelect.value = id;
        update();
      }
      el.addEventListener('click', chooseCity);
      el.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          chooseCity();
        }
      });
    });
  }

  function update() {
    const originId = originSelect.value;
    const excludeSeasonal = season === 'winter';
    const result = computeRoute(originId, priority, excludeSeasonal);
    const steps = result.steps;

    ticketTitle.textContent = NODES[originId].name + ' → Roma';
    totalDaysEl.textContent = steps.length ? result.totalDays : '—';
    totalPriceEl.textContent = steps.length ? result.totalPrice : '—';

    stepsEl.innerHTML = steps.length
      ? steps.map(function (st) {
          const meta = MODE_META[st.edge.mode];
          return (
            '<li class="roma-ticket-step">' +
              '<span class="icon">' + meta.icon + '</span>' +
              '<span class="leg">' + NODES[st.from].name + ' → ' + NODES[st.to].name + '</span>' +
              '<span class="stat">' + st.edge.days + 'd · ' + st.edge.price + '₰</span>' +
            '</li>'
          );
        }).join('')
      : '<li class="roma-ticket-step"><span class="icon">⚠️</span><span class="leg">No route available in these conditions</span><span class="stat"></span></li>';

    if (result.summerDays && result.winterDays && result.winterDays !== result.summerDays) {
      seasonCompareEl.innerHTML =
        '☀️ Summer fastest: <strong>' + result.summerDays + ' days</strong> &nbsp;·&nbsp; ' +
        '❄️ Winter fastest: <strong>' + result.winterDays + ' days</strong> ' +
        '(+' + (result.winterDays - result.summerDays) + ' days once the open-sea legs close for winter).';
    } else if (result.summerDays && result.winterDays) {
      seasonCompareEl.innerHTML =
        '☀️ Summer and ❄️ winter fastest routes are both <strong>' + result.summerDays + ' days</strong> — ' +
        "this route doesn't rely on an open-sea leg near Rome, so mare clausum barely touches it.";
    } else {
      seasonCompareEl.innerHTML = '';
    }

    if (originId === 'londinium') {
      seasonCompareEl.innerHTML += '<br><br>' + LONDINIUM_FACT;
    }

    const km = NODES[originId].km;
    crowFliesEl.textContent = km ? ('As the crow flies: ≈ ' + km.toLocaleString() + ' km straight-line from Rome.') : '';

    const activeEdgeSet = new Set(steps.map(function (s) { return s.edge; }));
    const pathNodeIds = new Set(['roma', originId]);
    steps.forEach(function (s) {
      pathNodeIds.add(s.from);
      pathNodeIds.add(s.to);
    });
    renderEdges(activeEdgeSet, excludeSeasonal);
    renderNodes(originId, pathNodeIds);
  }

  document.querySelectorAll('#romaPriorityToggle .roma-toggle-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#romaPriorityToggle .roma-toggle-btn').forEach(function (b) {
        b.classList.remove('is-active');
      });
      btn.classList.add('is-active');
      priority = btn.getAttribute('data-priority');
      update();
    });
  });

  document.querySelectorAll('#romaSeasonToggle .roma-toggle-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#romaSeasonToggle .roma-toggle-btn').forEach(function (b) {
        b.classList.remove('is-active');
      });
      btn.classList.add('is-active');
      season = btn.getAttribute('data-season');
      update();
    });
  });

  originSelect.addEventListener('change', update);

  renderStaticMap();
  update();

  const distSlider = document.getElementById('romaCostDistance');
  const distLabelEl = document.getElementById('romaCostDistanceLabel');
  const roadFill = document.getElementById('romaCostRoad');
  const riverFill = document.getElementById('romaCostRiver');
  const seaFill = document.getElementById('romaCostSea');
  const roadLabel = document.getElementById('romaCostRoadLabel');
  const riverLabel = document.getElementById('romaCostRiverLabel');
  const seaLabel = document.getElementById('romaCostSeaLabel');

  function updateCost() {
    if (!distSlider) return;
    const miles = Number(distSlider.value);
    const costs = computeCostComparison(miles);
    distLabelEl.textContent = miles.toLocaleString();
    roadFill.style.width = '100%';
    riverFill.style.width = costs.riverPct + '%';
    seaFill.style.width = costs.seaPct + '%';
    roadLabel.textContent = Math.round(costs.roadCost).toLocaleString();
    riverLabel.textContent = Math.round(costs.riverCost).toLocaleString();
    seaLabel.textContent = Math.round(costs.seaCost).toLocaleString();
  }

  if (distSlider) {
    distSlider.addEventListener('input', updateCost);
    updateCost();
  }
})();
