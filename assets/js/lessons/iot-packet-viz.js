(function () {
  'use strict';

  var STAGES = ['sensor', 'mcu', 'network', 'cloud', 'app'];
  var activeIndex = -1;
  var packetPos = -1;
  var packetRaf = 0;

  function renderTelemetrySvg() {
    var svg = document.getElementById('iot-live-svg');
    if (!svg) return;

    var nodes = [
      { id: 'sensor', x: 76, label: 'DHT/Temp', sub: '22.4 °C' },
      { id: 'mcu',    x: 228, label: 'UNO R4',  sub: 'JSON Pack' },
      { id: 'network',x: 380, label: 'Wi-Fi',   sub: 'TLS Frame' },
      { id: 'cloud',  x: 532, label: 'Broker',  sub: 'Rule Check' },
      { id: 'app',    x: 684, label: 'Phone/Relay', sub: 'Alert' }
    ];

    var edges = '';
    for (var i = 0; i < nodes.length - 1; i++) {
      edges += '<line x1="' + (nodes[i].x + 48) + '" y1="74" x2="' + (nodes[i + 1].x - 48) + '" y2="74" stroke="#334155" stroke-width="3" stroke-dasharray="5 4"/>';
    }

    var nodeSvg = nodes.map(function (n, idx) {
      var isCur = idx === activeIndex;
      var fill = isCur ? '#0e7490' : '#1e293b';
      var stroke = isCur ? '#38bdf8' : '#475569';
      return '<rect x="' + (n.x - 48) + '" y="46" width="96" height="56" rx="10" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>' +
        '<text x="' + n.x + '" y="70" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11.5" font-weight="800" fill="#f8fafc">' + n.label + '</text>' +
        '<text x="' + n.x + '" y="88" text-anchor="middle" font-family="ui-monospace,monospace" font-size="9.5" fill="#7dd3fc">' + n.sub + '</text>';
    }).join('');

    var packetSvg = '';
    if (packetPos >= 0) {
      var px = 76 + packetPos * (684 - 76);
      packetSvg = '<circle cx="' + px.toFixed(1) + '" cy="74" r="9" fill="#fde047" stroke="#f97316" stroke-width="2.5"/>' +
        '<text x="' + px.toFixed(1) + '" y="122" text-anchor="middle" font-family="ui-monospace,monospace" font-size="9.5" font-weight="700" fill="#fde047">{"temp":22.4}</text>';
    }

    svg.setAttribute('data-stage-index', String(activeIndex));
    svg.innerHTML =
      '<text x="20" y="24" font-family="system-ui,sans-serif" font-size="10.5" font-weight="800" fill="#94a3b8" letter-spacing="0.06em">LIVE HARDWARE TELEMETRY TRACE</text>' +
      edges + nodeSvg + packetSvg;
  }

  function animatePacket() {
    if (packetRaf) cancelAnimationFrame(packetRaf);
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      activeIndex = 4;
      packetPos = 1;
      renderTelemetrySvg();
      return;
    }
    var start = performance.now();
    var duration = 1200;
    function step(now) {
      var t = Math.min(1, (now - start) / duration);
      packetPos = t;
      activeIndex = Math.min(4, Math.floor(t * 5));
      renderTelemetrySvg();
      if (t < 1) {
        packetRaf = requestAnimationFrame(step);
      }
    }
    packetRaf = requestAnimationFrame(step);
  }

  function readDeviceStates() {
    var states = { thermostat: false, lock: false, camera: false, light: false };
    Object.keys(states).forEach(function (k) {
      var cb = document.querySelector('[data-device-toggle="' + k + '"]');
      if (cb) states[k] = !!cb.checked;
    });
    var autoEl = document.getElementById('automation-toggle');
    return {
      thermostat: states.thermostat,
      lock: states.lock,
      camera: states.camera,
      light: states.light,
      auto: autoEl ? !!autoEl.checked : false
    };
  }

  function renderHomeSvg(motionFlash) {
    var svg = document.getElementById('iot-home-svg');
    if (!svg) return;
    var st = readDeviceStates();

    svg.setAttribute('data-light', st.light ? 'on' : 'off');
    svg.setAttribute('data-lock', st.lock ? 'locked' : 'unlocked');

    svg.innerHTML =
      '<text x="20" y="22" font-family="system-ui,sans-serif" font-size="10.5" font-weight="800" fill="#94a3b8" letter-spacing="0.06em">SMART HOME FLOOR STATUS</text>' +
      // House outline
      '<polygon points="380,26 110,58 650,58" fill="#1e293b" stroke="#475569" stroke-width="2"/>' +
      '<rect x="130" y="58" width="500" height="82" fill="#0b1120" stroke="#475569" stroke-width="2"/>' +
      '<line x1="300" y1="58" x2="300" y2="140" stroke="#334155" stroke-width="1.5"/>' +
      '<line x1="470" y1="58" x2="470" y2="140" stroke="#334155" stroke-width="1.5"/>' +

      // Thermostat zone
      '<circle cx="215" cy="96" r="18" fill="' + (st.thermostat ? '#f97316' : '#1e293b') + '" fill-opacity="0.35" stroke="' + (st.thermostat ? '#fb923c' : '#64748b') + '" stroke-width="2"/>' +
      '<text x="215" y="100" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="800" fill="#f8fafc">' + (st.thermostat ? '70°F' : 'IDLE') + '</text>' +
      '<text x="215" y="130" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9.5" fill="#94a3b8">Thermostat</text>' +

      // Camera & Smart Lock center
      '<rect x="330" y="76" width="52" height="24" rx="5" fill="' + (st.camera ? '#0284c7' : '#1e293b') + '" stroke="' + (st.camera ? '#38bdf8' : '#64748b') + '" stroke-width="2"/>' +
      '<text x="356" y="92" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9.5" font-weight="800" fill="#f8fafc">' + (st.camera ? 'REC' : 'CAM') + '</text>' +
      '<rect x="400" y="76" width="54" height="24" rx="5" fill="' + (st.lock ? '#16a34a' : '#7f1d1d') + '" stroke="' + (st.lock ? '#4ade80' : '#f87171') + '" stroke-width="2"/>' +
      '<text x="427" y="92" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" font-weight="800" fill="#ffffff">' + (st.lock ? 'LOCKED' : 'OPEN') + '</text>' +
      '<text x="385" y="130" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9.5" fill="#94a3b8">Entry + Rule ' + (st.auto ? 'ON' : 'OFF') + '</text>' +

      // Porch Light glow
      (st.light ? '<polygon points="560,78 510,138 610,138" fill="#fde047" fill-opacity="0.24"/>' : '') +
      '<circle cx="560" cy="82" r="14" fill="' + (st.light ? '#fde047' : '#1e293b') + '" stroke="' + (st.light ? '#f59e0b' : '#64748b') + '" stroke-width="2"/>' +
      '<text x="560" y="130" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9.5" fill="' + (motionFlash ? '#fde047' : '#94a3b8') + '">' + (motionFlash ? 'MOTION TRIGGERED' : (st.light ? 'Porch Light ON' : 'Porch Light OFF')) + '</text>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderTelemetrySvg();
    renderHomeSvg(false);

    document.querySelectorAll('.pipeline-stage').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = STAGES.indexOf(btn.dataset.stage);
        if (idx !== -1) activeIndex = idx;
        renderTelemetrySvg();
      });
    });

    var runBtn = document.getElementById('run-loop');
    if (runBtn) {
      runBtn.addEventListener('click', animatePacket);
    }

    document.querySelectorAll('[data-device-toggle], #automation-toggle').forEach(function (el) {
      el.addEventListener('change', function () {
        setTimeout(function () { renderHomeSvg(false); }, 0);
      });
    });

    var motionBtn = document.getElementById('motion-trigger');
    if (motionBtn) {
      motionBtn.addEventListener('click', function () {
        setTimeout(function () { renderHomeSvg(true); }, 0);
      });
    }
  });
})();
