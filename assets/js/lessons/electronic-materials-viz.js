(function () {
  'use strict';

  var MAT_PROFILES = {
    'Copper': {
      key: 'copper',
      family: 'Conductor',
      color: '#ea580c',
      stroke: '#fdba74',
      brightness: 1.0,
      gapEv: '0 eV (bands overlap)',
      gapPx: 0,
      carriers: 9,
      ionic: false
    },
    'Aluminum': {
      key: 'aluminum',
      family: 'Conductor',
      color: '#94a3b8',
      stroke: '#e2e8f0',
      brightness: 0.92,
      gapEv: '0 eV (bands overlap)',
      gapPx: 0,
      carriers: 8,
      ionic: false
    },
    'Steel': {
      key: 'steel',
      family: 'Conductor',
      color: '#64748b',
      stroke: '#cbd5e1',
      brightness: 0.70,
      gapEv: '0 eV (bands overlap)',
      gapPx: 0,
      carriers: 6,
      ionic: false
    },
    'Graphite': {
      key: 'graphite',
      family: 'Conductor',
      color: '#334155',
      stroke: '#94a3b8',
      brightness: 0.40,
      gapEv: '~0.04 eV (semimetal)',
      gapPx: 8,
      carriers: 4,
      ionic: false
    },
    'Silicon': {
      key: 'silicon',
      family: 'Semiconductor',
      color: '#4338ca',
      stroke: '#a5b4fc',
      brightness: 0.18,
      gapEv: '1.1 eV band gap',
      gapPx: 20,
      carriers: 2,
      ionic: false
    },
    'Salt Water': {
      key: 'saltwater',
      family: 'Conductor (ionic)',
      color: '#0284c7',
      stroke: '#7dd3fc',
      brightness: 0.50,
      gapEv: 'Dissolved Na⁺ / Cl⁻ ions',
      gapPx: 14,
      carriers: 5,
      ionic: true
    },
    'Rubber': {
      key: 'rubber',
      family: 'Insulator',
      color: '#1e293b',
      stroke: '#64748b',
      brightness: 0.0,
      gapEv: '> 6 eV wide gap',
      gapPx: 40,
      carriers: 0,
      ionic: false
    },
    'Glass': {
      key: 'glass',
      family: 'Insulator',
      color: '#38bdf8',
      stroke: '#bae6fd',
      brightness: 0.0,
      gapEv: '~9 eV wide gap',
      gapPx: 42,
      carriers: 0,
      ionic: false
    },
    'Dry Wood': {
      key: 'wood',
      family: 'Insulator',
      color: '#a16207',
      stroke: '#fde047',
      brightness: 0.0,
      gapEv: '> 8 eV wide gap',
      gapPx: 42,
      carriers: 0,
      ionic: false
    }
  };

  function renderBench() {
    var svg = document.getElementById('eml-bench-svg');
    var matEl = document.getElementById('eml-r-mat');
    if (!svg || !matEl) return;

    var label = (matEl.textContent || 'Copper').trim();
    var p = MAT_PROFILES[label] || MAT_PROFILES['Copper'];

    // Analog ammeter needle (-60 deg to +60 deg)
    var angleDeg = -60 + p.brightness * 120;
    var rad = (angleDeg - 90) * Math.PI / 180;
    var cx = 345, cy = 122, needleLen = 54;
    var nx = cx + Math.cos(rad) * needleLen;
    var ny = cy + Math.sin(rad) * needleLen;
    var ma = (p.brightness * 18.5).toFixed(1);

    // Physical sample texture lines
    var textureSvg = '';
    if (p.key === 'wood') {
      textureSvg = '<path d="M30,86 Q85,78 140,86 T192,86 M30,98 Q85,104 140,98 T192,98" fill="none" stroke="#fef08a" stroke-opacity="0.45" stroke-width="1.6"/>';
    } else if (p.key === 'saltwater') {
      textureSvg = '<path d="M26,76 Q62,70 98,76 T170,76 T196,76" fill="none" stroke="#bae6fd" stroke-width="2"/><circle cx="65" cy="95" r="5" fill="#facc15"/><text x="65" y="98" text-anchor="middle" font-size="8" font-weight="800" fill="#0f172a">+</text><circle cx="135" cy="95" r="5" fill="#38bdf8"/><text x="135" y="98" text-anchor="middle" font-size="8" font-weight="800" fill="#0f172a">-</text>';
    } else if (p.key === 'glass') {
      textureSvg = '<line x1="42" y1="68" x2="62" y2="112" stroke="#ffffff" stroke-opacity="0.45" stroke-width="4"/><line x1="58" y1="68" x2="78" y2="112" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2"/>';
    } else if (p.key === 'silicon') {
      textureSvg = '<path d="M34,76 L190,76 M34,90 L190,90 M34,104 L190,104 M72,68 L72,114 M112,68 L112,114 M152,68 L152,114" stroke="#818cf8" stroke-opacity="0.45" stroke-width="1.2"/>';
    }

    // Energy band gap coordinates
    var valTop = 148;
    var condBottom = valTop - p.gapPx;
    var condHeight = 28;
    var condTop = condBottom - condHeight;
    var freeDots = '';
    for (var i = 0; i < p.carriers; i++) {
      var dx = 472 + i * 21;
      var dy = p.ionic ? (condTop + 20) : (condTop + 14 + (i % 2) * 7);
      freeDots += '<circle cx="' + Math.min(645, dx) + '" cy="' + dy + '" r="3.8" fill="' + (p.ionic ? '#38bdf8' : '#fde047') + '"/>';
    }

    svg.setAttribute('data-active-mat', p.key);
    svg.innerHTML =
      // Panel headers
      '<text x="20" y="24" font-family="system-ui,sans-serif" font-size="11" font-weight="800" fill="#94a3b8" letter-spacing="0.06em">SPECIMEN CLAMP</text>' +
      '<text x="345" y="24" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="800" fill="#94a3b8" letter-spacing="0.06em">ANALOG AMMETER</text>' +
      '<text x="556" y="24" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="800" fill="#94a3b8" letter-spacing="0.06em">ELECTRON BANDS</text>' +

      // Dividers
      '<line x1="230" y1="16" x2="230" y2="184" stroke="#1e293b" stroke-width="1.5"/>' +
      '<line x1="454" y1="16" x2="454" y2="184" stroke="#1e293b" stroke-width="1.5"/>' +

      // Left: Sample in crocodile clamps
      '<rect x="18" y="79" width="14" height="24" rx="2" fill="#475569"/>' +
      '<rect x="196" y="79" width="14" height="24" rx="2" fill="#475569"/>' +
      '<rect x="26" y="66" width="174" height="50" rx="8" fill="' + p.color + '" fill-opacity="' + (p.key === 'glass' ? '0.32' : '0.92') + '" stroke="' + p.stroke + '" stroke-width="2.5"/>' +
      textureSvg +
      '<text x="113" y="145" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="800" fill="#f8fafc">' + label + '</text>' +
      '<text x="113" y="164" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11.5" font-weight="700" fill="' + p.stroke + '">' + p.family + '</text>' +

      // Center: Ammeter arc
      '<path d="M286,122 A59,59 0 0,1 404,122" fill="none" stroke="#334155" stroke-width="10" stroke-linecap="round"/>' +
      '<path d="M286,122 A59,59 0 0,1 345,63" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="3 5"/>' +
      '<path d="M345,63 A59,59 0 0,1 404,122" fill="none" stroke="#f59e0b" stroke-width="3" stroke-opacity="0.7"/>' +
      '<line x1="' + cx + '" y1="' + cy + '" x2="' + nx.toFixed(1) + '" y2="' + ny.toFixed(1) + '" stroke="#f97316" stroke-width="3.5" stroke-linecap="round"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="#e2e8f0"/>' +
      '<text x="285" y="140" font-family="system-ui,sans-serif" font-size="10" fill="#94a3b8">0 mA</text>' +
      '<text x="405" y="140" text-anchor="end" font-family="system-ui,sans-serif" font-size="10" fill="#fbbf24">20 mA</text>' +
      '<rect x="303" y="148" width="84" height="24" rx="6" fill="#1e293b" stroke="#334155"/>' +
      '<text x="345" y="164" text-anchor="middle" font-family="ui-monospace,monospace" font-size="12" font-weight="800" fill="#fde047">' + ma + ' mA</text>' +

      // Right: Valence & conduction bands
      '<rect x="466" y="148" width="194" height="26" rx="5" fill="#1d4ed8" fill-opacity="0.55" stroke="#60a5fa" stroke-width="1.5"/>' +
      '<text x="563" y="165" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10.5" font-weight="700" fill="#dbeafe">Valence Band (bound e⁻)</text>' +
      '<rect x="466" y="' + condTop + '" width="194" height="' + condHeight + '" rx="5" fill="#f59e0b" fill-opacity="0.22" stroke="#fbbf24" stroke-width="1.5"/>' +
      freeDots +
      '<text x="563" y="' + Math.max(46, condTop - 6) + '" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10.5" font-weight="700" fill="#fde68a">Conduction Band (mobile)</text>' +
      (p.gapPx >= 12
        ? '<text x="563" y="' + (condBottom + Math.round(p.gapPx / 2) + 4) + '" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" font-weight="700" fill="#f87171">' + p.gapEv + '</text>'
        : '<text x="563" y="42" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" font-weight="700" fill="#4ade80">' + p.gapEv + '</text>');
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderBench();
    var matEl = document.getElementById('eml-r-mat');
    if (matEl && window.MutationObserver) {
      var obs = new MutationObserver(renderBench);
      obs.observe(matEl, { childList: true, characterData: true, subtree: true });
    }
    document.querySelectorAll('.eml-mat-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setTimeout(renderBench, 0);
      });
    });
  });
})();
