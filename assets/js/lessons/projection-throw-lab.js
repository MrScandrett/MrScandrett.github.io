'use strict';

var PTR_LENSES = {
  short: { label: 'Short-Throw', ratio: 0.8 },
  standard: { label: 'Standard', ratio: 1.5 },
  long: { label: 'Long-Throw', ratio: 2.5 }
};
var ptrCurrentLens = 'standard';
var PTR_SCREEN_WIDTH = 10;
var PTR_MAX_DISTANCE = 24;

function ptrSvgEl(tag, attrs, text) {
  var ns = 'http://www.w3.org/2000/svg';
  var el = document.createElementNS(ns, tag);
  if (attrs) {
    Object.keys(attrs).forEach(function (k) {
      el.setAttribute(k, String(attrs[k]));
    });
  }
  if (text != null) el.textContent = text;
  return el;
}

function ptrRenderLensButtons() {
  var wrap = document.getElementById('ptr-lens-btns');
  if (!wrap) return;
  wrap.innerHTML = '';
  Object.keys(PTR_LENSES).forEach(function (key) {
    var lens = PTR_LENSES[key];
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ptr-lens-btn' + (key === ptrCurrentLens ? ' selected' : '');
    btn.innerHTML = lens.label + '<small>' + lens.ratio + ':1</small>';
    btn.addEventListener('click', function () {
      ptrCurrentLens = key;
      ptrRenderLensButtons();
      ptrUpdate();
    });
    wrap.appendChild(btn);
  });
}

function ptrDrawPlanSvg(lens, distance, width, withinScreenTol, withinDistance) {
  var svg = document.getElementById('ptr-plan-svg');
  if (!svg) return;

  var xScreen = 696;
  var pxPerFt = 20; // 30 ft * 20 = 600 => x = 96..696
  var cy = 132;
  var pxPerFtY = 9.5; // 10 ft screen = 95 px tall
  var halfScreen = (PTR_SCREEN_WIDTH * pxPerFtY) / 2;
  var xWallLimit = xScreen - PTR_MAX_DISTANCE * pxPerFt; // 216
  var xProj = xScreen - distance * pxPerFt;
  var rawHalfImg = (width * pxPerFtY) / 2;
  var halfImg = Math.min(112, Math.max(8, rawHalfImg));

  var items = [];
  items.push(ptrSvgEl('rect', { x: 0, y: 0, width: 760, height: 270, rx: 10, fill: '#0b1424' }));

  // Auditorium usable depth floor zone (0..24 ft)
  items.push(ptrSvgEl('rect', {
    x: xWallLimit, y: 24, width: PTR_MAX_DISTANCE * pxPerFt, height: 214,
    fill: 'rgba(56, 189, 248, 0.05)'
  }));
  // Out-of-bounds rear zone (>24 ft)
  items.push(ptrSvgEl('rect', {
    x: 40, y: 24, width: xWallLimit - 40, height: 214,
    fill: withinDistance ? 'rgba(15, 23, 42, 0.4)' : 'rgba(239, 68, 68, 0.14)'
  }));

  // 4-ft architectural grid lines
  for (var ft = 0; ft <= 30; ft += 4) {
    var gx = xScreen - ft * pxPerFt;
    items.push(ptrSvgEl('line', {
      x1: gx, y1: 24, x2: gx, y2: 238,
      stroke: ft === PTR_MAX_DISTANCE ? (withinDistance ? '#64748b' : '#ef4444') : 'rgba(148,163,184,0.16)',
      'stroke-width': ft === PTR_MAX_DISTANCE ? 2 : 1,
      'stroke-dasharray': ft === PTR_MAX_DISTANCE ? '6 4' : 'none'
    }));
    items.push(ptrSvgEl('text', {
      x: gx, y: 254, 'text-anchor': 'middle',
      'font-family': 'ui-monospace, monospace', 'font-size': 10,
      fill: ft === PTR_MAX_DISTANCE ? '#fca5a5' : '#94a3b8'
    }, ft + 'ft'));
  }

  // Center optical axis
  items.push(ptrSvgEl('line', {
    x1: 50, y1: cy, x2: xScreen, y2: cy,
    stroke: 'rgba(148,163,184,0.22)', 'stroke-dasharray': '3 4', 'stroke-width': 1
  }));

  // 24 ft Venue Wall Limit Label
  items.push(ptrSvgEl('text', {
    x: xWallLimit - 6, y: 40, 'text-anchor': 'end',
    'font-family': 'system-ui, sans-serif', 'font-size': 10, 'font-weight': 700,
    fill: withinDistance ? '#94a3b8' : '#f87171'
  }, '← Back Wall Limit (24 ft)'));

  // Upstage framing wall & 10ft target screen
  items.push(ptrSvgEl('line', { x1: xScreen + 8, y1: 24, x2: xScreen + 8, y2: 238, stroke: '#475569', 'stroke-width': 4 }));
  items.push(ptrSvgEl('rect', {
    x: xScreen, y: cy - halfScreen, width: 10, height: halfScreen * 2, rx: 3,
    fill: '#e2e8f0', stroke: '#94a3b8', 'stroke-width': 1
  }));
  items.push(ptrSvgEl('text', {
    x: xScreen + 16, y: cy + 4,
    'font-family': 'system-ui, sans-serif', 'font-size': 10.5, 'font-weight': 700,
    fill: '#e2e8f0', transform: 'rotate(-90 ' + (xScreen + 24) + ' ' + cy + ')',
    'text-anchor': 'middle'
  }, '10 ft SCREEN'));

  // Beam cone fill & stroke colors
  var beamFill = !withinDistance
    ? 'rgba(239, 68, 68, 0.24)'
    : withinScreenTol
      ? 'rgba(34, 197, 94, 0.28)'
      : width > PTR_SCREEN_WIDTH + 0.5
        ? 'rgba(239, 68, 68, 0.25)'
        : 'rgba(168, 85, 247, 0.28)';
  var beamStroke = !withinDistance
    ? '#ef4444'
    : withinScreenTol
      ? '#4ade80'
      : width > PTR_SCREEN_WIDTH + 0.5
        ? '#f87171'
        : '#c084fc';

  items.push(ptrSvgEl('polygon', {
    points: (xProj + 16) + ',' + cy + ' ' + xScreen + ',' + (cy - halfImg) + ' ' + xScreen + ',' + (cy + halfImg),
    fill: beamFill, stroke: beamStroke, 'stroke-width': 1.6
  }));

  // Lit strip at the screen surface
  items.push(ptrSvgEl('rect', {
    x: xScreen - 4, y: cy - halfImg, width: 6, height: halfImg * 2, rx: 2,
    fill: beamStroke
  }));

  // Projector housing at xProj
  items.push(ptrSvgEl('rect', {
    x: xProj - 22, y: cy - 12, width: 32, height: 24, rx: 5,
    fill: '#1e293b', stroke: withinDistance ? '#c084fc' : '#ef4444', 'stroke-width': 2
  }));
  items.push(ptrSvgEl('rect', {
    x: xProj + 10, y: cy - 7, width: 8, height: 14, rx: 2,
    fill: '#94a3b8'
  }));
  items.push(ptrSvgEl('text', {
    x: xProj - 6, y: cy - 18, 'text-anchor': 'middle',
    'font-family': 'ui-monospace, monospace', 'font-size': 10.5, 'font-weight': 700,
    fill: '#f8fafc'
  }, lens.ratio + ':1 @ ' + distance + 'ft'));

  // Screen fill readout badge near screen
  var badgeY = Math.max(38, cy - halfImg - 8);
  items.push(ptrSvgEl('rect', {
    x: xScreen - 134, y: badgeY - 16, width: 126, height: 22, rx: 6,
    fill: '#0f172a', stroke: beamStroke, 'stroke-width': 1.2
  }));
  items.push(ptrSvgEl('text', {
    x: xScreen - 71, y: badgeY - 2, 'text-anchor': 'middle',
    'font-family': 'ui-monospace, monospace', 'font-size': 10.5, 'font-weight': 700,
    fill: beamStroke
  }, 'Image: ' + width.toFixed(1) + ' ft wide'));

  svg.replaceChildren.apply(svg, items);
}

function ptrUpdate() {
  var lens = PTR_LENSES[ptrCurrentLens];
  var slider = document.getElementById('ptr-distance-slider');
  if (!slider) return;
  var distance = Number(slider.value);
  document.getElementById('ptr-distance-val').textContent = distance + ' ft';

  var width = distance / lens.ratio;
  document.getElementById('ptr-r-ratio').textContent = lens.ratio + ':1';
  document.getElementById('ptr-r-width').textContent = width.toFixed(1) + ' ft';
  document.getElementById('ptr-r-distance').textContent = distance + ' / ' + PTR_MAX_DISTANCE + ' ft';

  var withinScreenTol = Math.abs(width - PTR_SCREEN_WIDTH) <= 0.5;
  var withinDistance = distance <= PTR_MAX_DISTANCE;

  ptrDrawPlanSvg(lens, distance, width, withinScreenTol, withinDistance);

  var constraints = [
    { label: 'Image width fills the 10 ft screen (currently ' + width.toFixed(1) + ' ft)', pass: withinScreenTol },
    { label: 'Fits within 24 ft of stage depth (currently ' + distance + ' ft)', pass: withinDistance }
  ];
  var wrap = document.getElementById('ptr-constraints');
  wrap.innerHTML = '';
  var allPass = true;
  constraints.forEach(function (c) {
    if (!c.pass) allPass = false;
    var row = document.createElement('div');
    row.className = 'ptr-constraint';
    row.innerHTML =
      '<div class="ptr-constraint-label"><span>' + c.label + '</span><span>' + (c.pass ? '✓' : '✗') + '</span></div>' +
      '<div class="ptr-bar-track"><div class="ptr-bar-fill ' + (c.pass ? 'pass' : 'fail') + '" style="width:' + (c.pass ? 100 : 35) + '%;"></div></div>';
    wrap.appendChild(row);
  });

  var verdict = document.getElementById('ptr-verdict');
  if (allPass) {
    verdict.textContent = '✓ This lens and distance fill the screen correctly within the venue.';
    verdict.className = 'ptr-verdict pass';
  } else if (!withinDistance) {
    verdict.textContent = '✗ This distance exceeds the venue’s 24 ft of stage depth.';
    verdict.className = 'ptr-verdict fail';
  } else if (width < PTR_SCREEN_WIDTH - 0.5) {
    verdict.textContent = '✗ Image is too small for the screen — move the projector back or pick a shorter-throw lens.';
    verdict.className = 'ptr-verdict fail';
  } else {
    verdict.textContent = '✗ Image overshoots the screen — move the projector closer or pick a longer-throw lens.';
    verdict.className = 'ptr-verdict fail';
  }
}

function ptrDrawShadowSvg(hProj, dist, hActor, shadowZone, actorX) {
  var svg = document.getElementById('ptr-shadow-svg');
  if (!svg) return;

  var xScreen = 684;
  var yDeck = 236;
  var pxPerFtX = 24;
  var pxPerFtY = 7.4;

  var xProj = xScreen - dist * pxPerFtX;
  var yProj = yDeck - hProj * pxPerFtY;
  var yScreenTop = yDeck - 18 * pxPerFtY;
  var xSpike = xScreen - shadowZone * pxPerFtX;
  var xActor = xScreen - actorX * pxPerFtX;
  var yActorHead = yDeck - hActor * pxPerFtY;

  var inDeadZone = actorX < dist && actorX <= shadowZone;
  var items = [];
  items.push(ptrSvgEl('rect', { x: 0, y: 0, width: 760, height: 275, rx: 10, fill: '#0b1424' }));

  // Deck & acting stage depth (20 ft mark)
  items.push(ptrSvgEl('line', { x1: 60, y1: yDeck, x2: 710, y2: yDeck, stroke: '#64748b', 'stroke-width': 3 }));
  for (var ft = 0; ft <= 22; ft += 2) {
    var gx = xScreen - ft * pxPerFtX;
    items.push(ptrSvgEl('line', { x1: gx, y1: yDeck, x2: gx, y2: yDeck + 6, stroke: '#64748b', 'stroke-width': 1 }));
    if (ft % 4 === 0) {
      items.push(ptrSvgEl('text', {
        x: gx, y: yDeck + 18, 'text-anchor': 'middle',
        'font-family': 'ui-monospace, monospace', 'font-size': 9.5, fill: '#94a3b8'
      }, ft + 'ft'));
    }
  }

  // Upstage backdrop wall / cyc screen
  items.push(ptrSvgEl('rect', {
    x: xScreen, y: yScreenTop, width: 10, height: yDeck - yScreenTop, rx: 3,
    fill: '#e2e8f0'
  }));
  items.push(ptrSvgEl('text', {
    x: xScreen + 24, y: (yScreenTop + yDeck) / 2,
    'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': 10, 'font-weight': 700,
    fill: '#e2e8f0', transform: 'rotate(-90 ' + (xScreen + 24) + ' ' + ((yScreenTop + yDeck) / 2) + ')'
  }, 'CYCLORAMA BACKDROP'));

  // Shadow dead-zone carpet on deck
  var clampedSpike = Math.max(70, xSpike);
  items.push(ptrSvgEl('rect', {
    x: clampedSpike, y: yDeck - 5, width: xScreen - clampedSpike, height: 5,
    fill: 'rgba(245, 158, 11, 0.85)'
  }));
  items.push(ptrSvgEl('line', {
    x1: clampedSpike, y1: yDeck - 26, x2: clampedSpike, y2: yDeck + 6,
    stroke: '#fbbf24', 'stroke-width': 1.8, 'stroke-dasharray': '4 3'
  }));
  items.push(ptrSvgEl('text', {
    x: clampedSpike - 4, y: yDeck - 14, 'text-anchor': 'end',
    'font-family': 'ui-monospace, monospace', 'font-size': 9.5, 'font-weight': 700,
    fill: '#fbbf24'
  }, 'Spike @ ' + shadowZone.toFixed(1) + 'ft'));

  // Overhead pipe + projector cone
  items.push(ptrSvgEl('line', { x1: 60, y1: yProj - 10, x2: xScreen, y2: yProj - 10, stroke: '#475569', 'stroke-width': 2 }));
  items.push(ptrSvgEl('polygon', {
    points: xProj + ',' + yProj + ' ' + xScreen + ',' + yScreenTop + ' ' + xScreen + ',' + yDeck,
    fill: 'rgba(168, 85, 247, 0.20)', stroke: '#c084fc', 'stroke-width': 1.4
  }));
  items.push(ptrSvgEl('rect', {
    x: xProj - 12, y: yProj - 12, width: 22, height: 14, rx: 3,
    fill: '#a855f7', stroke: '#f3e8ff', 'stroke-width': 1.2
  }));
  items.push(ptrSvgEl('text', {
    x: xProj, y: yProj - 18, 'text-anchor': 'middle',
    'font-family': 'ui-monospace, monospace', 'font-size': 9.5, 'font-weight': 700,
    fill: '#e9d5ff'
  }, 'Lens (' + hProj + 'ft high)'));

  // Cast shadow on screen if performer stands in dead-zone
  if (inDeadZone) {
    var denom = Math.max(0.5, xActor - xProj);
    var tScreen = (xScreen - xProj) / denom;
    var yShadowTop = Math.max(yScreenTop, yProj + (yActorHead - yProj) * tScreen);
    items.push(ptrSvgEl('polygon', {
      points: xActor + ',' + yActorHead + ' ' + xActor + ',' + yDeck + ' ' + xScreen + ',' + yDeck + ' ' + xScreen + ',' + yShadowTop,
      fill: 'rgba(15, 23, 42, 0.65)', stroke: '#ef4444', 'stroke-dasharray': '3 3', 'stroke-width': 1.2
    }));
    items.push(ptrSvgEl('rect', {
      x: xScreen - 1, y: yShadowTop, width: 12, height: yDeck - yShadowTop, rx: 2,
      fill: '#ef4444'
    }));
    items.push(ptrSvgEl('text', {
      x: (xActor + xScreen) / 2, y: Math.max(38, yShadowTop - 8),
      'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': 10.5, 'font-weight': 800,
      fill: '#fca5a5'
    }, 'SHADOW HITS SCREEN!'));
  } else {
    items.push(ptrSvgEl('text', {
      x: xActor, y: Math.max(36, yActorHead - 18),
      'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif', 'font-size': 10.5, 'font-weight': 700,
      fill: '#4ade80'
    }, '✓ Beam clears head'));
  }

  // Draggable Performer Silhouette
  var actorColor = inDeadZone ? '#f87171' : '#38bdf8';
  items.push(ptrSvgEl('circle', { cx: xActor, cy: yActorHead + 6, r: 6, fill: actorColor }));
  items.push(ptrSvgEl('rect', {
    x: xActor - 6, y: yActorHead + 13, width: 12, height: Math.max(10, yDeck - (yActorHead + 13)),
    rx: 4, fill: actorColor
  }));
  items.push(ptrSvgEl('text', {
    x: xActor, y: yDeck - 4, 'text-anchor': 'middle',
    'font-family': 'ui-monospace, monospace', 'font-size': 9, 'font-weight': 800,
    fill: '#0f172a'
  }, actorX.toFixed(1) + 'ft'));

  svg.replaceChildren.apply(svg, items);
}

function ptrShadowUpdate() {
  var hProjEl = document.getElementById('ptr-sh-hproj');
  if (!hProjEl) return;
  var hProj = Number(hProjEl.value);
  var dist = Number(document.getElementById('ptr-sh-dist').value);
  var hActor = Number(document.getElementById('ptr-sh-hactor').value);
  var actorXEl = document.getElementById('ptr-sh-actor-x');
  var actorX = actorXEl ? Number(actorXEl.value) : 3.5;

  document.getElementById('ptr-sh-hproj-val').textContent = hProj + ' ft';
  document.getElementById('ptr-sh-dist-val').textContent = dist + ' ft';
  document.getElementById('ptr-sh-hactor-val').textContent = hActor.toFixed(1) + ' ft';
  var actorValEl = document.getElementById('ptr-sh-actor-x-val');
  if (actorValEl) actorValEl.textContent = actorX.toFixed(1) + ' ft DS';

  var shadow = dist * (hActor / hProj);
  var spike = Math.ceil((shadow + 0.5) * 2) / 2;
  var usable = Math.max(0, 20 - shadow);
  document.getElementById('ptr-sh-zone').textContent = shadow.toFixed(1) + ' ft';
  document.getElementById('ptr-sh-spike').textContent = spike.toFixed(1) + ' ft DS';
  document.getElementById('ptr-sh-usable').textContent = usable.toFixed(1) + ' / 20 ft';

  ptrDrawShadowSvg(hProj, dist, hActor, shadow, actorX);

  var v = document.getElementById('ptr-sh-verdict');
  if (actorX < dist && actorX <= shadow) {
    v.className = 'ptr-verdict fail';
    v.textContent = '⚠ Performer at ' + actorX.toFixed(1) + ' ft DS is inside the ' + shadow.toFixed(1) + ' ft shadow dead-zone! Spike a glow-tape line at ' + spike.toFixed(1) + ' ft DS.';
  } else if (shadow <= 5.5) {
    v.className = 'ptr-verdict pass';
    v.textContent = '✓ Compact shadow zone (' + shadow.toFixed(1) + ' ft). Spike a keep-clear buffer ' + spike.toFixed(1) + ' ft downstage of the backdrop.';
  } else {
    v.className = 'ptr-verdict fail';
    v.textContent = '✗ Wide shadow dead-zone (' + shadow.toFixed(1) + ' ft eats into acting space). Hang the projector higher or switch to a shorter-throw lens closer to the screen.';
  }
}

function ptrWireShadowDrag() {
  var svg = document.getElementById('ptr-shadow-svg');
  var slider = document.getElementById('ptr-sh-actor-x');
  if (!svg || !slider) return;
  var dragging = false;
  function updateFromClientX(clientX) {
    var rect = svg.getBoundingClientRect();
    if (!rect.width) return;
    var svgX = ((clientX - rect.left) / rect.width) * 760;
    var ft = (684 - svgX) / 24;
    var clamped = Math.max(1, Math.min(18, Math.round(ft * 2) / 2));
    slider.value = clamped;
    ptrShadowUpdate();
  }
  svg.addEventListener('pointerdown', function (e) {
    dragging = true;
    if (svg.setPointerCapture) svg.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  });
  svg.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    updateFromClientX(e.clientX);
  });
  svg.addEventListener('pointerup', function () { dragging = false; });
  svg.addEventListener('pointercancel', function () { dragging = false; });
}

function ptrCheckText(n, correct) {
  var sel = document.getElementById('ptrans-' + n);
  var fb = document.getElementById('ptrfb-' + n);
  var hint = document.getElementById('ptrhint-' + n);
  if (!sel.value) { fb.textContent = 'Pick an answer first.'; fb.className = 'cl-feedback err'; return; }
  if (sel.value === correct) {
    fb.textContent = '✓ Correct!'; fb.className = 'cl-feedback ok'; hint.style.display = 'none';
  } else {
    fb.textContent = '✗ Not quite — check the hint below.'; fb.className = 'cl-feedback err'; hint.style.display = 'block';
  }
}

function ptrCheck(n, correct, tolerance) {
  var input = document.getElementById('ptrans-' + n);
  var fb = document.getElementById('ptrfb-' + n);
  var hint = document.getElementById('ptrhint-' + n);
  var val = parseFloat(input.value);
  if (isNaN(val)) { fb.textContent = 'Enter a number first.'; fb.className = 'cl-feedback err'; return; }
  if (Math.abs(val - correct) <= tolerance) {
    fb.textContent = '✓ Correct!'; fb.className = 'cl-feedback ok'; hint.style.display = 'none';
  } else {
    fb.textContent = '✗ Not quite — check the hint below.'; fb.className = 'cl-feedback err'; hint.style.display = 'block';
  }
}

window.ptrUpdate = ptrUpdate;
window.ptrShadowUpdate = ptrShadowUpdate;
window.ptrCheck = ptrCheck;
window.ptrCheckText = ptrCheckText;

document.addEventListener('DOMContentLoaded', function () {
  ptrRenderLensButtons();
  ptrUpdate();
  ptrShadowUpdate();
  ptrWireShadowDrag();
});
