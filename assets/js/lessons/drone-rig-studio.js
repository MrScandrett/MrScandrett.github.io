(function () {
  'use strict';

  var FRAMES = {
    carbon:   { label: 'Carbon Fiber', color: '#334155', stroke: '#94a3b8', weight: 220, drop: 5 },
    aluminum: { label: 'Aluminum',     color: '#cbd5e1', stroke: '#f8fafc', weight: 340, drop: 4 },
    pla:      { label: '3D-Printed PLA', color: '#f97316', stroke: '#fed7aa', weight: 260, drop: 2 }
  };

  var MECHS = {
    servo:  { label: 'Servo Latch',        color: '#38bdf8', weight: 45, remote: true },
    magnet: { label: 'Electromagnet',      color: '#f59e0b', weight: 90, remote: true },
    spring: { label: 'Spring + Manual Pin', color: '#f87171', weight: 20, remote: false }
  };

  function getSelectedKey(containerId, dict) {
    var container = document.getElementById(containerId);
    if (container) {
      var sel = container.querySelector('.eds-choice-card.selected');
      if (sel && sel.textContent) {
        var keys = Object.keys(dict);
        for (var i = 0; i < keys.length; i++) {
          if (sel.textContent.indexOf(dict[keys[i]].label) !== -1) return keys[i];
        }
      }
    }
    return null;
  }

  function resolveState() {
    var fKey = getSelectedKey('eds-frame-choices', FRAMES);
    var mKey = getSelectedKey('eds-mech-choices', MECHS);
    if (!fKey && window.edsState && window.edsState.frame) fKey = window.edsState.frame;
    if (!mKey && window.edsState && window.edsState.mech) mKey = window.edsState.mech;

    var rF = document.getElementById('eds-r-frame');
    var rM = document.getElementById('eds-r-mech');
    if (!fKey && rF && rF.textContent) {
      Object.keys(FRAMES).forEach(function (k) {
        if (rF.textContent.indexOf(FRAMES[k].label) !== -1) fKey = k;
      });
    }
    if (!mKey && rM && rM.textContent) {
      Object.keys(MECHS).forEach(function (k) {
        if (rM.textContent.indexOf(MECHS[k].label) !== -1) mKey = k;
      });
    }
    return { fKey: fKey, mKey: mKey };
  }

  var dropAnimOffset = 0;
  var dropAnimReleased = false;
  var dropTimer = null;

  function renderBlueprint() {
    var svg = document.getElementById('eds-rig-svg');
    if (!svg) return;
    var st = resolveState();
    var f = st.fKey ? FRAMES[st.fKey] : null;
    var m = st.mKey ? MECHS[st.mKey] : null;
    var emptyWeight = (f ? f.weight : 0) + (m ? m.weight : 0);

    var frameColor = f ? f.color : '#1e293b';
    var frameStroke = f ? f.stroke : '#475569';
    var mechColor = m ? m.color : '#64748b';
    var crateY = 82 + dropAnimOffset;

    var fillEl = document.getElementById('eds-budget-fill');
    var textEl = document.getElementById('eds-budget-text');
    if (fillEl && textEl) {
      var pct = Math.min(100, Math.round((emptyWeight / 700) * 100));
      fillEl.style.width = pct + '%';
      fillEl.className = 'eds-budget-fill' + (emptyWeight > 700 ? ' over' : '');
      textEl.textContent = emptyWeight > 0
        ? ('Empty rig: ' + emptyWeight + ' / 700 g (+ 500 g crate)')
        : 'Select a frame & latch below';
    }

    svg.setAttribute('data-frame', st.fKey || 'none');
    svg.setAttribute('data-mech', st.mKey || 'none');

    svg.innerHTML =
      '<line x1="20" y1="136" x2="660" y2="136" stroke="#1e293b" stroke-width="2" stroke-dasharray="6 4"/>' +
      '<text x="24" y="20" font-family="system-ui,sans-serif" font-size="10.5" font-weight="800" fill="#94a3b8" letter-spacing="0.06em">LIVE RIG BLUEPRINT · 2 m DROP ZONE</text>' +

      // Quadcopter airframe
      '<line x1="210" y1="32" x2="470" y2="32" stroke="#64748b" stroke-width="5" stroke-linecap="round"/>' +
      '<ellipse cx="215" cy="24" rx="46" ry="4" fill="#38bdf8" fill-opacity="0.45"/>' +
      '<ellipse cx="465" cy="24" rx="46" ry="4" fill="#38bdf8" fill-opacity="0.45"/>' +
      '<rect x="300" y="22" width="80" height="20" rx="6" fill="#1e293b" stroke="#475569" stroke-width="2"/>' +
      '<text x="340" y="36" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9.5" font-weight="800" fill="#e2e8f0">DRONE</text>' +

      // Frame Truss
      '<polygon points="312,42 368,42 384,70 296,70" fill="' + frameColor + '" fill-opacity="0.85" stroke="' + frameStroke + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<line x1="312" y1="42" x2="384" y2="70" stroke="' + frameStroke + '" stroke-width="1.5" opacity="0.6"/>' +
      '<line x1="368" y1="42" x2="296" y2="70" stroke="' + frameStroke + '" stroke-width="1.5" opacity="0.6"/>' +

      // Latch Mechanism
      '<rect x="322" y="68" width="36" height="14" rx="4" fill="' + mechColor + '" stroke="#0f172a" stroke-width="1.5"/>' +
      (dropAnimReleased ? '<line x1="340" y1="82" x2="340" y2="' + crateY + '" stroke="#f59e0b" stroke-width="2" stroke-dasharray="3 3"/>' : '') +

      // Supply crate
      '<rect x="310" y="' + crateY + '" width="60" height="44" rx="6" fill="#ea580c" stroke="#fed7aa" stroke-width="2"/>' +
      '<line x1="340" y1="' + (crateY + 12) + '" x2="340" y2="' + (crateY + 32) + '" stroke="#ffffff" stroke-width="4"/>' +
      '<line x1="330" y1="' + (crateY + 22) + '" x2="350" y2="' + (crateY + 22) + '" stroke="#ffffff" stroke-width="4"/>' +

      // Specs annotations right & left
      '<text x="24" y="68" font-family="system-ui,sans-serif" font-size="11.5" font-weight="800" fill="#f8fafc">Frame: ' + (f ? f.label : 'Not picked') + '</text>' +
      '<text x="24" y="86" font-family="system-ui,sans-serif" font-size="10.5" fill="#94a3b8">' + (f ? (f.weight + ' g · rated ' + f.drop + ' m drop') : 'Select in Model stage') + '</text>' +
      '<text x="656" y="68" text-anchor="end" font-family="system-ui,sans-serif" font-size="11.5" font-weight="800" fill="#f8fafc">Latch: ' + (m ? m.label : 'Not picked') + '</text>' +
      '<text x="656" y="86" text-anchor="end" font-family="system-ui,sans-serif" font-size="10.5" fill="' + (m ? (m.remote ? '#4ade80' : '#f87171') : '#94a3b8') + '">' + (m ? (m.weight + ' g · ' + (m.remote ? 'Remote RC' : 'Manual pin only')) : 'Select in Prototype stage') + '</text>';
  }

  function runDropAnimation() {
    var status = document.getElementById('eds-drop-status');
    var st = resolveState();
    var f = st.fKey ? FRAMES[st.fKey] : null;
    var m = st.mKey ? MECHS[st.mKey] : null;
    if (!f || !m) {
      if (status) status.textContent = 'Select both a frame and a latch first.';
      return;
    }

    if (dropTimer) clearInterval(dropTimer);
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!m.remote) {
      dropAnimOffset = 0;
      dropAnimReleased = false;
      renderBlueprint();
      if (status) status.textContent = 'Manual pin failed to release remotely from hover!';
      return;
    }

    if (reduced) {
      dropAnimOffset = 18;
      dropAnimReleased = true;
      renderBlueprint();
      if (status) {
        status.textContent = f.drop >= 2 ? 'Released remotely & survived 2 m impact.' : 'Released, but frame failed 2 m impact rating.';
      }
      return;
    }

    if (status) status.textContent = 'Running 2 m drop test…';
    dropAnimOffset = 0;
    dropAnimReleased = true;
    var step = 0;
    dropTimer = setInterval(function () {
      step += 1;
      dropAnimOffset = Math.min(18, step * 3);
      renderBlueprint();
      if (dropAnimOffset >= 18) {
        clearInterval(dropTimer);
        dropTimer = null;
        if (status) {
          status.textContent = f.drop >= 2
            ? ('Dropped safely (' + f.drop + ' m rated) with ' + (f.weight + m.weight) + ' g rig.')
            : 'Frame cracked on 2 m test!';
        }
      }
    }, 35);
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderBlueprint();
    document.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('.eds-choice-card, .eds-stage-btn')) {
        dropAnimOffset = 0;
        dropAnimReleased = false;
        setTimeout(renderBlueprint, 0);
      }
    });
    var dropBtn = document.getElementById('eds-run-drop-btn');
    if (dropBtn) dropBtn.addEventListener('click', runDropAnimation);
  });
})();
