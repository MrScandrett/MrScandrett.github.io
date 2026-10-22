/* violin-lesson.js — the lesson around the fingerboard explorer: anatomy, bow tension,
   bridge lean and tuning by ear. Sound goes through AudioKit's violin voice, like violin.js. */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(node);
    return node;
  }
  function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function play(hz, seconds, delay) {
    var K = window.AudioKit;
    if (!K || !window.MusicSynth) return;
    try { K.note({ instrument: 'violin', hz: hz, velocity: 0.7, duration: seconds, delay: delay || 0 }); } catch (e) { /* sound is a bonus */ }
  }

  /* ---------------- Anatomy ---------------- */
  var PARTS = {
    violin: [
      { id: 'scroll', name: 'Scroll', x: 150, y: 32, text: 'The carved spiral at the top. It is mostly decoration and a sign of the maker’s skill, but it also balances the weight of the neck.' },
      { id: 'pegs', name: 'Pegs and pegbox', x: 150, y: 78, text: 'Each string winds around a wooden peg in the pegbox. Turning a peg makes big changes in pitch; push it in as you turn so it holds.' },
      { id: 'nut', name: 'Nut', x: 150, y: 112, text: 'A small ebony ridge where the strings leave the pegbox. It is one end of each string’s vibrating length.' },
      { id: 'fingerboard', name: 'Fingerboard', x: 150, y: 200, text: 'The smooth black ebony board under the strings. It has no frets, so a finger can stop the string at any point and the player’s ear decides exactly where.' },
      { id: 'strings', name: 'Strings', x: 132, y: 300, text: 'Four strings, G D A E from low to high, each a perfect fifth apart. Thicker, heavier strings vibrate more slowly and sound lower.' },
      { id: 'fholes', name: 'F-holes', x: 102, y: 390, text: 'The two f-shaped openings let the top flex more freely and let air move in and out of the body, which adds to the low sound.' },
      { id: 'bridge', name: 'Bridge', x: 150, y: 400, text: 'A thin maple bridge held up only by string pressure. It carries the strings’ vibration into the top. Its feet sit between the notches of the f-holes.' },
      { id: 'tuners', name: 'Fine tuners', x: 172, y: 448, text: 'Small screw levers on the tailpiece for tiny pitch changes. Clockwise raises the pitch.' },
      { id: 'tailpiece', name: 'Tailpiece', x: 150, y: 490, text: 'Anchors the strings at the bottom end. It is tied to an end button with a loop of cord or wire.' },
      { id: 'chinrest', name: 'Chinrest', x: 98, y: 530, text: 'Clamped to the edge of the body. The jaw rests here so the violin is held by the body, not the left hand.' },
      { id: 'body', name: 'Body (top and back)', x: 214, y: 470, text: 'A hollow box: a spruce top, a maple back and thin curved ribs. Inside, the soundpost and bass bar let the top vibrate without collapsing under the strings’ pull.' }
    ],
    bow: [
      { id: 'tip', name: 'Tip', x: 34, y: 48, text: 'The pointed head at the far end. Playing near the tip gives a lighter, softer sound because less of the arm’s weight reaches the string.' },
      { id: 'stick', name: 'Stick', x: 250, y: 30, text: 'Usually pernambuco wood or carbon fibre, bent to curve slightly toward the hair. That curve, called the camber, gives the bow its spring.' },
      { id: 'hair', name: 'Hair', x: 250, y: 84, text: 'Horse tail hair, about 150 to 200 strands, or a synthetic version. With rosin, its rough surface grabs the string and lets it go.' },
      { id: 'grip', name: 'Grip and pad', x: 470, y: 36, text: 'A wrapping of wire or leather where the index finger and thumb sit, protecting the stick.' },
      { id: 'frog', name: 'Frog', x: 540, y: 70, text: 'The block that holds the hair at the hand end. The thumb tip rests in the corner where the frog meets the stick.' },
      { id: 'screw', name: 'Screw', x: 604, y: 50, text: 'Turning the screw moves the frog. Clockwise tightens the hair before playing; counter-clockwise loosens it afterwards.' }
    ]
  };

  function drawViolin(svg) {
    svg.setAttribute('viewBox', '0 0 300 600');
    var g = el('g', {}, svg);
    el('path', { d: 'M150 230 C108 230 80 240 78 275 C76 302 96 318 102 330 C108 342 98 352 98 368 C98 384 108 394 102 406 C92 422 62 432 62 478 C62 530 102 560 150 560 C198 560 238 530 238 478 C238 432 208 422 198 406 C192 394 202 384 202 368 C202 352 192 342 198 330 C204 318 224 302 222 275 C220 240 192 230 150 230 Z', fill: '#b5652a', stroke: '#5c2f12', 'stroke-width': 3, class: 'vln-anat-part', 'data-part': 'body' }, g);
    el('path', { d: 'M112 360 c-8 10 -6 22 2 30 c6 6 4 18 -4 22 M188 360 c8 10 6 22 -2 30 c-6 6 -4 18 4 22', fill: 'none', stroke: '#2a1405', 'stroke-width': 4, 'stroke-linecap': 'round', class: 'vln-anat-part', 'data-part': 'fholes' }, g);
    el('rect', { x: 139, y: 108, width: 22, height: 132, rx: 3, fill: '#b5652a', stroke: '#5c2f12', 'stroke-width': 2 }, g);
    el('path', { d: 'M138 112 L162 112 L170 330 L130 330 Z', fill: '#15110e', class: 'vln-anat-part', 'data-part': 'fingerboard' }, g);
    el('rect', { x: 136, y: 54, width: 28, height: 56, rx: 6, fill: '#8e4a1c', stroke: '#5c2f12', 'stroke-width': 2, class: 'vln-anat-part', 'data-part': 'pegs' }, g);
    [[124, 66], [124, 92], [176, 66], [176, 92]].forEach(function (p) {
      el('ellipse', { cx: p[0], cy: p[1], rx: 12, ry: 6, fill: '#1b130d', class: 'vln-anat-part', 'data-part': 'pegs' }, g);
    });
    el('circle', { cx: 150, cy: 34, r: 17, fill: '#a35a24', stroke: '#5c2f12', 'stroke-width': 2, class: 'vln-anat-part', 'data-part': 'scroll' }, g);
    el('path', { d: 'M150 34 m0 -10 a10 10 0 1 1 -9 6 a6 6 0 1 1 6 4', fill: 'none', stroke: '#5c2f12', 'stroke-width': 2 }, g);
    el('rect', { x: 136, y: 110, width: 28, height: 5, fill: '#e8dfc7', class: 'vln-anat-part', 'data-part': 'nut' }, g);
    el('path', { d: 'M116 400 L184 400 L180 410 L120 410 Z', fill: '#efd9a8', stroke: '#8a6b33', 'stroke-width': 1.5, class: 'vln-anat-part', 'data-part': 'bridge' }, g);
    el('path', { d: 'M134 436 L166 436 L160 526 L140 526 Z', fill: '#15110e', class: 'vln-anat-part', 'data-part': 'tailpiece' }, g);
    [140, 147, 154, 161].forEach(function (x) {
      el('circle', { cx: x, cy: 446, r: 2.6, fill: '#c9c9c9', stroke: '#555', 'stroke-width': 0.8, class: 'vln-anat-part', 'data-part': 'tuners' }, g);
    });
    el('path', { d: 'M70 512 C80 540 120 560 140 556 L138 536 C114 536 92 526 82 506 Z', fill: '#1b130d', class: 'vln-anat-part', 'data-part': 'chinrest' }, g);
    [140, 147, 153, 160].forEach(function (x, i) {
      var top = [146, 149, 151, 154][i];
      el('line', { x1: top, y1: 112, x2: x, y2: 446, stroke: i < 2 ? '#d8cfb8' : '#eceae4', 'stroke-width': i === 0 ? 1.6 : 1.1, class: 'vln-anat-part', 'data-part': 'strings' }, g);
    });
  }

  function drawBow(svg, tension) {
    svg.textContent = '';
    svg.setAttribute('viewBox', '0 0 640 120');
    var t = Math.max(0, Math.min(100, tension)) / 100;
    var hairY = 84;
    var sag = 26 - t * 44; /* stick bends toward the hair when loose, straightens and bows away when overtightened */
    var stickMid = hairY - 34 + sag;
    el('path', { d: 'M28 40 Q300 ' + (stickMid * 2 - 40) + ' 560 40', fill: 'none', stroke: '#6b3412', 'stroke-width': 7, 'stroke-linecap': 'round', class: 'vln-anat-part', 'data-part': 'stick' }, svg);
    el('path', { d: 'M18 36 L40 34 L44 54 L26 56 Z', fill: '#efe4cc', stroke: '#6b3412', 'stroke-width': 2, class: 'vln-anat-part', 'data-part': 'tip' }, svg);
    var hairSag = (1 - Math.min(1, t * 3)) * 12;
    el('path', { d: 'M40 52 Q300 ' + (hairY + hairSag) + ' 520 ' + hairY, fill: 'none', stroke: '#f4f0e6', 'stroke-width': 5, class: 'vln-anat-part', 'data-part': 'hair' }, svg);
    el('path', { d: 'M40 52 Q300 ' + (hairY + hairSag) + ' 520 ' + hairY, fill: 'none', stroke: '#b9ae97', 'stroke-width': 1 }, svg);
    el('rect', { x: 446, y: 34, width: 54, height: 12, rx: 4, fill: '#9a9a9a', class: 'vln-anat-part', 'data-part': 'grip' }, svg);
    var frogX = 508 + t * 8;
    el('path', { d: 'M' + frogX + ' 42 L' + (frogX + 52) + ' 42 L' + (frogX + 52) + ' 64 Q' + (frogX + 30) + ' 98 ' + (frogX + 6) + ' 88 Z', fill: '#121212', class: 'vln-anat-part', 'data-part': 'frog' }, svg);
    el('circle', { cx: frogX + 32, cy: 56, r: 5, fill: '#e8e0c8' }, svg);
    el('rect', { x: 560, y: 34, width: 56, height: 12, rx: 5, fill: '#c7c2b6', stroke: '#6f6a5f', 'stroke-width': 1.5, class: 'vln-anat-part', 'data-part': 'screw' }, svg);
    return { gap: hairY - stickMid };
  }

  var anatSvg = document.getElementById('vlnAnatomySvg');
  var list = document.getElementById('vlnPartList');
  var info = document.getElementById('vlnPartInfo');
  var group = 'violin';
  function selectPart(id) {
    var part = PARTS[group].filter(function (p) { return p.id === id; })[0];
    if (!part) return;
    list.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-part') === id));
    });
    anatSvg.querySelectorAll('.vln-anat-part').forEach(function (n) {
      n.classList.toggle('is-picked', n.getAttribute('data-part') === id);
    });
    info.innerHTML = '';
    var h = document.createElement('h3'); h.textContent = part.name; info.appendChild(h);
    var p = document.createElement('p'); p.textContent = part.text; info.appendChild(p);
  }
  function showGroup(next) {
    group = next;
    anatSvg.textContent = '';
    if (group === 'violin') drawViolin(anatSvg); else drawBow(anatSvg, 40);
    anatSvg.parentNode.classList.toggle('is-bow', group === 'bow');
    list.textContent = '';
    list.setAttribute('aria-label', group === 'violin' ? 'Violin parts' : 'Bow parts');
    PARTS[group].forEach(function (part, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'vln-pick-btn';
      b.setAttribute('data-part', part.id); b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<span>' + (i + 1) + '</span>';
      b.appendChild(document.createTextNode(part.name));
      b.addEventListener('click', function () { selectPart(part.id); });
      list.appendChild(b);
      var badge = el('g', { class: 'vln-anat-badge', 'data-part': part.id }, anatSvg);
      el('circle', { cx: part.x, cy: part.y, r: group === 'bow' ? 13 : 11 }, badge);
      var label = el('text', { x: part.x, y: part.y + 4, 'text-anchor': 'middle' }, badge);
      label.textContent = String(i + 1);
    });
    selectPart(PARTS[group][0].id);
  }
  if (anatSvg && list && info) {
    anatSvg.addEventListener('click', function (e) {
      var hit = e.target.closest && e.target.closest('[data-part]');
      if (hit) selectPart(hit.getAttribute('data-part'));
    });
    document.querySelectorAll('[data-anat-group]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-anat-group]').forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        showGroup(btn.getAttribute('data-anat-group'));
      });
    });
    showGroup('violin');
  }

  /* ---------------- Bow tension ---------------- */
  var bowSvg = document.getElementById('vlnBowSvg');
  var bowRange = document.getElementById('vlnBowTension');
  var bowState = document.getElementById('vlnBowState');
  function updateBow() {
    var v = Number(bowRange.value);
    drawBow(bowSvg, v);
    var msg, cls;
    if (v < 30) { msg = 'Too loose. The hair sags and nearly touches the stick, so it will drag on the string and the stick will scrape it.'; cls = 'is-low'; }
    else if (v <= 62) { msg = 'Just right. About a pencil’s width between hair and stick at the middle, and the stick still curves toward the hair.'; cls = 'is-good'; }
    else { msg = 'Too tight. The stick has gone straight or bent away from the hair. Left like this it loses its spring and can warp.'; cls = 'is-high'; }
    bowState.textContent = msg;
    bowState.className = 'vln-state ' + cls;
  }
  if (bowSvg && bowRange && bowState) { bowRange.addEventListener('input', updateBow); updateBow(); }

  /* ---------------- Bridge lean ---------------- */
  var bridgeSvg = document.getElementById('vlnBridgeSvg');
  var bridgeRange = document.getElementById('vlnBridgeLean');
  var bridgeState = document.getElementById('vlnBridgeState');
  function drawBridge(deg) {
    bridgeSvg.textContent = '';
    el('path', { d: 'M10 168 Q180 150 350 168 L350 196 L10 196 Z', fill: '#c98a4b', stroke: '#6b3a16', 'stroke-width': 2 }, bridgeSvg);
    el('rect', { x: 14, y: 96, width: 92, height: 14, rx: 3, fill: '#15110e' }, bridgeSvg);
    var t1 = el('text', { x: 16, y: 130, class: 'vln-svg-label' }, bridgeSvg); t1.textContent = '← fingerboard';
    var t2 = el('text', { x: 346, y: 134, 'text-anchor': 'end', class: 'vln-svg-label' }, bridgeSvg); t2.textContent = 'tailpiece →';
    el('path', { d: 'M300 140 L346 150 L346 160 L300 152 Z', fill: '#15110e' }, bridgeSvg);
    var g = el('g', { transform: 'rotate(' + (-deg) + ' 180 159)' }, bridgeSvg);
    el('path', { d: 'M172 159 L188 159 L185 64 L175 64 Z', fill: '#efd9a8', stroke: '#8a6b33', 'stroke-width': 1.5 }, g);
    el('line', { x1: 188, y1: 159, x2: 185, y2: 64, stroke: deg === 0 ? '#1f8a4c' : '#b23b3b', 'stroke-width': 3 }, g);
    var rad = deg * Math.PI / 180;
    var topX = 180 - Math.sin(rad) * 95, topY = 159 - Math.cos(rad) * 95;
    el('path', { d: 'M20 103 L' + topX.toFixed(1) + ' ' + topY.toFixed(1) + ' L320 146', fill: 'none', stroke: '#d8d2c2', 'stroke-width': 2 }, bridgeSvg);
    el('line', { x1: 188, y1: 159, x2: 188, y2: 60, stroke: '#1f8a4c', 'stroke-width': 1.2, 'stroke-dasharray': '4 4', opacity: 0.8 }, bridgeSvg);
  }
  function updateBridge() {
    var v = Number(bridgeRange.value);
    drawBridge(v);
    var msg, cls;
    if (v >= 3) { msg = 'Leaning toward the fingerboard by about ' + v + '°. This is what tuning does over time. Ease the top back toward the tailpiece.'; cls = 'is-high'; }
    else if (v <= -3) { msg = 'Leaning toward the tailpiece by about ' + (-v) + '°. Ease the top a little toward the fingerboard.'; cls = 'is-low'; }
    else { msg = 'Standing straight: the back of the bridge (green edge) lines up with the dashed upright. Both feet are flat on the top.'; cls = 'is-good'; }
    bridgeState.textContent = msg;
    bridgeState.className = 'vln-state ' + cls;
  }
  if (bridgeSvg && bridgeRange && bridgeState) { bridgeRange.addEventListener('input', updateBridge); updateBridge(); }

  /* ---------------- Tuning ---------------- */
  var OPEN = [{ name: 'G', midi: 55, octave: 'G3' }, { name: 'D', midi: 62, octave: 'D4' }, { name: 'A', midi: 69, octave: 'A4' }, { name: 'E', midi: 76, octave: 'E5' }];
  var tones = document.getElementById('vlnOpenTones');
  var pairs = document.getElementById('vlnFifthPairs');
  if (tones) OPEN.forEach(function (s) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'vln-btn vln-string-btn vln-hue-' + s.name.toLowerCase();
    b.textContent = s.name + ' (' + s.octave + ', ' + Math.round(midiHz(s.midi)) + ' Hz)';
    b.addEventListener('click', function () { play(midiHz(s.midi), 1.6); });
    tones.appendChild(b);
  });
  if (pairs) [[1, 2], [0, 1], [2, 3]].forEach(function (pair) {
    var a = OPEN[pair[0]], c = OPEN[pair[1]];
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'vln-btn';
    b.textContent = a.name + ' + ' + c.name;
    b.addEventListener('click', function () { play(midiHz(a.midi), 2.2); play(midiHz(c.midi), 2.2); });
    pairs.appendChild(b);
  });

  var tuneState = document.getElementById('vlnTuneState');
  var needle = document.getElementById('vlnTuneNeedle');
  var cents = 0;
  function newString() {
    var mag = 18 + Math.round(Math.random() * 40);
    cents = Math.random() < 0.5 ? -mag : mag;
    showTune();
  }
  function showTune() {
    var c = Math.max(-60, Math.min(60, cents));
    if (needle) needle.style.left = (50 + c / 60 * 50) + '%';
    if (!tuneState) return;
    var off = Math.abs(cents);
    if (off <= 3) { tuneState.textContent = 'In tune. Play them together: the wobble is gone and the fifth rings.'; tuneState.className = 'vln-state is-good'; }
    else if (off <= 12) { tuneState.textContent = 'Close. The wobble is slow now. Use the fine tuner.'; tuneState.className = 'vln-state is-low'; }
    else { tuneState.textContent = 'Out of tune. Listen for a fast wobble, then use the peg to get closer.'; tuneState.className = 'vln-state is-high'; }
  }
  var tunePlay = document.getElementById('vlnTunePlay');
  if (tunePlay) {
    tunePlay.addEventListener('click', function () {
      play(midiHz(62) * Math.pow(2, cents / 1200), 2.4);
      play(midiHz(69), 2.4);
    });
    document.getElementById('vlnTuneNew').addEventListener('click', newString);
    document.querySelectorAll('[data-tune]').forEach(function (b) {
      b.addEventListener('click', function () { cents += Number(b.getAttribute('data-tune')); showTune(); });
    });
    newString();
  }
})();
