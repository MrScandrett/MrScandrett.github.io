/* Optional piano-fingering overlay for Mozart's complete Rondo alla turca score. */
(function () {
  'use strict';

  var figure = document.querySelector('figure[data-score="mozart-turkish-march"]');
  if (!figure) return;

  var STORAGE_KEY = 'mozart-rondo-fingering';
  var enabled = false;
  var printPortal = null;
  var restorePitchNames = null;
  var restoreFingering = null;
  try { enabled = localStorage.getItem(STORAGE_KEY) === 'on'; } catch (err) { /* storage is optional */ }

  function fingerChord(pitches, hand) {
    var count = pitches.length;
    if (count === 1) return null;
    var spread = count === 2 ? [1, 5] : count === 3 ? [1, 3, 5] : count === 4 ? [1, 2, 3, 5] : [1, 2, 3, 4, 5];
    return hand === 'right' ? spread.slice(0, count) : spread.slice(0, count).reverse();
  }

  // Find a comfortable five-finger path for each run. This is intentionally
  // deterministic: repeated passages receive the same choice when their notes match.
  function fingerRun(events, hand) {
    var dir = hand === 'right' ? 1 : -1;
    var states = events.map(function () { return []; });
    for (var f = 1; f <= 5; f++) states[0][f] = { cost: f === 3 ? 0.5 : Math.abs(f - 3) * 0.22, prev: 0 };
    for (var i = 1; i < events.length; i++) {
      var pitch = events[i].pitches[0].midi, before = events[i - 1].pitches[0].midi;
      var semitones = pitch - before;
      for (var next = 1; next <= 5; next++) {
        var best = null;
        for (var prior = 1; prior <= 5; prior++) {
          var fingerMove = (next - prior) * dir;
          var cost = states[i - 1][prior].cost;
          if (semitones === 0) cost += next === prior ? 0 : 1.8;
          else {
            if (next === prior) cost += 4;
            cost += Math.abs(Math.abs(semitones) - Math.abs(fingerMove) * 1.7) * 0.26;
            if (Math.sign(semitones) !== Math.sign(fingerMove)) {
              var crossing = (prior === 1 || next === 1) && Math.abs(semitones) <= 5;
              cost += crossing ? 0.7 : 4.5;
            }
            if (Math.abs(fingerMove) > 3 && Math.abs(semitones) < 5) cost += 1.2;
          }
          if ((pitch % 12 + 12) % 12 === 1 || (pitch % 12 + 12) % 12 === 3 || (pitch % 12 + 12) % 12 === 6 || (pitch % 12 + 12) % 12 === 8 || (pitch % 12 + 12) % 12 === 10) {
            if (next === 1) cost += 0.9;
          }
          if (!best || cost < best.cost) best = { cost: cost, prev: prior };
        }
        states[i][next] = best;
      }
    }
    var last = 1;
    for (var k = 2; k <= 5; k++) if (states[events.length - 1][k].cost < states[events.length - 1][last].cost) last = k;
    var result = new Array(events.length);
    for (var at = events.length - 1; at >= 0; at--) { result[at] = last; last = states[at][last].prev || last; }
    return result;
  }

  function plan(layout) {
    var result = {};
    [0, 1].forEach(function (staff) {
      var events = layout.events.filter(function (ev) { return ev.staff === staff && ev.kind === 'note' && !ev.hidden && !ev.tieFrom; })
        .sort(function (a, b) { return a.bar - b.bar || a.start - b.start || a.i - b.i; });
      var singles = [], hand = staff === 0 ? 'right' : 'left';
      function flush() {
        if (!singles.length) return;
        var fingers = fingerRun(singles, hand);
        singles.forEach(function (ev, i) { result[ev.i] = [fingers[i]]; });
        singles = [];
      }
      events.forEach(function (ev) {
        if (ev.pitches.length === 1) singles.push(ev);
        else { flush(); result[ev.i] = fingerChord(ev.pitches, hand); }
      });
      flush();
    });
    return result;
  }

  function addFingerMarks(svg, layout) {
    svg.querySelectorAll('.se-finger-number').forEach(function (node) { node.remove(); });
    if (!enabled) return;
    var fingers = plan(layout), ns = 'http://www.w3.org/2000/svg';
    layout.events.forEach(function (ev) {
      if (!fingers[ev.i] || !ev.steps || ev.tieFrom) return;
      var group = svg.querySelector('.se-ev[data-i="' + ev.i + '"]');
      if (!group) return;
      fingers[ev.i].forEach(function (finger, index) {
        var text = document.createElementNS(ns, 'text');
        var step = ev.steps[index] == null ? ev.steps[0] : ev.steps[index];
        var above = ev.staff === 0;
        text.setAttribute('class', 'se-finger-number');
        text.setAttribute('x', ev.x + (ev.headW || layout.S) * 0.5);
        text.setAttribute('y', ev.bottom - step * (layout.S / 2) + (above ? -1.45 : 2.15) * layout.S);
        text.setAttribute('font-size', 1.08 * layout.S);
        text.setAttribute('text-anchor', 'middle');
        text.textContent = finger;
        group.appendChild(text);
      });
    });
  }

  function mark() {
    var layout = figure.scoreLayout;
    var svg = figure.querySelector('.se-score');
    if (!layout || !svg) return;
    addFingerMarks(svg, layout);
  }

  function buildPrintPages() {
    if (!figure.scoreData || !window.ScoreEngine) return null;
    var model = window.ScoreEngine.prepare(figure.scoreData);
    window.ScoreEngine.analyse(model);
    // A fixed engraving width makes the paper score identical whether Print
    // score was chosen on a phone, tablet, or desktop display.
    var layout = window.ScoreEngine.engrave(model, 1085);
    if (!layout.systems.length) return null;
    if (printPortal) printPortal.remove();
    printPortal = document.createElement('main');
    printPortal.className = 'mz-print-score';
    printPortal.setAttribute('aria-hidden', 'true');
    var ns = 'http://www.w3.org/2000/svg';
    var definitions = document.createElementNS(ns, 'svg');
    definitions.setAttribute('class', 'mz-print-defs');
    var defs = document.createElementNS(ns, 'defs');
    var scoreGroup = document.createElementNS(ns, 'g');
    scoreGroup.id = 'mzPrintRondoScore';
    scoreGroup.innerHTML = layout.svg;
    defs.appendChild(scoreGroup); definitions.appendChild(defs); printPortal.appendChild(definitions);
    addFingerMarks(definitions, layout);
    var groups = [];
    for (var i = 0; i < layout.systems.length; i += 2) groups.push(layout.systems.slice(i, i + 2));
    groups.forEach(function (systems, pageIndex) {
      var first = systems[0], last = systems[systems.length - 1];
      var pad = layout.S * 1.8;
      var top = Math.max(0, first.top - pad), bottom = Math.min(layout.height, last.bottom + pad);
      var page = document.createElement('section');
      page.className = 'mz-print-page';
      var header = document.createElement('header');
      header.className = 'mz-print-page-header';
      var title = document.createElement('strong');
      title.textContent = 'Mozart · Rondo alla turca, K. 331';
      var count = document.createElement('span');
      count.textContent = 'Score page ' + (pageIndex + 1) + ' of ' + groups.length;
      header.append(title, count);
      var copy = document.createElementNS(ns, 'svg');
      copy.setAttribute('class', 'se-score');
      copy.setAttribute('viewBox', '0 ' + top + ' ' + layout.width + ' ' + (bottom - top));
      copy.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      var use = document.createElementNS(ns, 'use');
      use.setAttribute('href', '#mzPrintRondoScore');
      copy.appendChild(use);
      page.append(header, copy);
      if (pageIndex === 0) {
        var legend = document.createElement('p');
        legend.className = 'mz-print-legend';
        legend.textContent = 'Finger numbers: 1 thumb · 2 index · 3 middle · 4 ring · 5 little finger. Letter names are printed inside the noteheads.';
        page.appendChild(legend);
      }
      printPortal.appendChild(page);
    });
    document.body.appendChild(printPortal);
    return printPortal;
  }

  function finishPrint() {
    document.body.classList.remove('mz-print-rondo');
    if (printPortal) { printPortal.remove(); printPortal = null; }
    if (restorePitchNames === false) window.MusicNotation.setPreferences({ pitchNames: false });
    if (restoreFingering === false) { enabled = false; mark(); }
    restorePitchNames = null;
    restoreFingering = null;
  }

  function printScore() {
    restorePitchNames = !!window.MusicNotation.preferences.pitchNames;
    restoreFingering = enabled;
    enabled = true;
    if (!restorePitchNames) window.MusicNotation.setPreferences({ pitchNames: true });
    document.body.classList.add('mz-print-rondo');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        mark(); buildPrintPages(); window.print();
      });
    });
  }

  function install() {
    var controls = figure.querySelector('.se-controls');
    if (!controls || controls.querySelector('.mz-fingering-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'se-toggle mz-fingering-toggle';
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = enabled ? '✓ Finger numbers' : 'Finger numbers';
    button.classList.toggle('is-on', enabled);
    var key = document.createElement('p');
    key.className = 'mz-fingering-key';
    key.id = 'mzFingeringKey';
    key.textContent = 'Suggested piano fingering: 1 thumb · 2 index · 3 middle · 4 ring · 5 little finger. Adjust with your teacher for your hand.';
    key.hidden = !enabled;
    button.setAttribute('aria-describedby', key.id);
    button.addEventListener('click', function () {
      enabled = !enabled;
      button.setAttribute('aria-pressed', String(enabled));
      button.textContent = enabled ? '✓ Finger numbers' : 'Finger numbers';
      button.classList.toggle('is-on', enabled);
      key.hidden = !enabled;
      try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch (err) { /* storage is optional */ }
      mark();
    });
    controls.appendChild(button);
    var printButton = document.createElement('button');
    printButton.type = 'button';
    printButton.className = 'se-toggle mz-print-score-button';
    printButton.textContent = 'Print score';
    printButton.setAttribute('aria-label', 'Print a fit-to-page version of Rondo alla turca');
    printButton.addEventListener('click', printScore);
    controls.appendChild(printButton);
    controls.insertAdjacentElement('afterend', key);
    mark();
  }

  figure.addEventListener('score:draw', function () { install(); mark(); });
  window.addEventListener('afterprint', finishPrint);
  new MutationObserver(install).observe(figure, { childList: true, subtree: true });
  install();
})();
