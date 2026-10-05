/* Electronic Schematics — lessons/engineering/arduino-and-electronics/electronic-schematics.html
 * Hero live circuit, linked bench/schematic drawings, symbol tabs + drill,
 * connected-or-not judge, seven-move reader, test-point fault finder, and quiz.
 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function onActivate(node, fn) {
    node.addEventListener('click', fn);
    node.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); }
    });
  }
  function setFeedback(node, ok, text) {
    node.textContent = text;
    node.classList.toggle('is-right', ok === true);
    node.classList.toggle('is-wrong', ok === false);
  }

  /* ── Hero: flip SW1, watch the loop close ── */
  (function hero() {
    var btn = $('es-hero-switch'), sheet = $('es-hero-sheet'), lever = $('es-hero-lever'), out = $('es-hero-readout');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var closed = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', closed ? 'true' : 'false');
      btn.textContent = closed ? 'Open SW1' : 'Close SW1';
      sheet.classList.toggle('is-live', closed);
      lever.style.transform = closed ? 'rotate(0deg)' : 'rotate(-24deg)';
      out.innerHTML = closed
        ? '<b>SW1 closed.</b> One complete loop: I = (3.0 V − 2.0 V) ÷ 100 Ω = 10 mA. D1 lights.'
        : '<b>SW1 open.</b> The loop is broken, so I = 0 mA. D1 is dark.';
    });
  })();

  /* ── Same circuit, two drawings ── */
  (function twin() {
    var info = $('es-twin-info');
    if (!info) return;
    var copy = {
      b1: '<b>B1 · battery, 3 V.</b> Bench: a plastic holder with two AA cells and springs. Schematic: long plate = +, short plate = −. Only the voltage and the polarity survive.',
      sw1: '<b>SW1 · slide switch.</b> Bench: a plastic body with a sliding knob and metal pins. Schematic: two contacts and a lever. A lifted lever means a broken path.',
      r1: '<b>R1 · 100 Ω resistor.</b> Bench: brown-black-brown color bands. Schematic: a zigzag with the value written beside it. Its job is to limit current to about 10 mA.',
      d1: '<b>D1 · red LED.</b> Bench: long leg = anode (+), short leg and flat rim = cathode (−). Schematic: the triangle points the way current flows; the bar is the cathode.',
      wire: '<b>Wires.</b> Bench: four tangled colors that loop over each other. Schematic: straight lines with square corners. On the bench, crossing over doesn\'t matter. Only what each end touches matters.'
    };
    var chips = all('.es-chip[data-part]', $('es-sec-map'));
    var parts = all('#es-sec-map .es-part');
    var current = null;
    function select(key) {
      current = current === key ? null : key;
      parts.forEach(function (p) { p.classList.toggle('is-on', p.dataset.part === current); });
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.part === current ? 'true' : 'false'); });
      info.innerHTML = current ? copy[current] : 'Pick a part. Notice what the schematic keeps and what it throws away.';
    }
    parts.forEach(function (p) { onActivate(p, function () { select(p.dataset.part); }); });
    chips.forEach(function (c) { c.addEventListener('click', function () { select(c.dataset.part); }); });
  })();

  /* ── Symbol family tabs ── */
  (function tabs() {
    var list = all('.es-tab');
    if (!list.length) return;
    function show(tab) {
      list.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        $(t.getAttribute('aria-controls')).hidden = !on;
      });
    }
    list.forEach(function (t, i) {
      t.addEventListener('click', function () { show(t); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % list.length;
        if (e.key === 'ArrowLeft') n = (i - 1 + list.length) % list.length;
        if (e.key === 'Home') n = 0;
        if (e.key === 'End') n = list.length - 1;
        if (n === null) return;
        e.preventDefault(); list[n].focus(); show(list[n]);
      });
    });
  })();

  /* ── Symbol drill: pulls its deck straight from the library cards ── */
  (function drill() {
    var stage = $('es-drill-stage'), opts = $('es-drill-options'), fb = $('es-drill-feedback'), start = $('es-drill-start');
    if (!stage) return;
    var deck = all('.es-sym-panel .sym-card').map(function (card) {
      return {
        name: card.querySelector('.sym-name').textContent.trim(),
        desc: card.querySelector('.sym-desc').textContent.trim(),
        svg: card.querySelector('svg')
      };
    });
    var ROUNDS = 10, queue = [], round = 0, score = 0, streak = 0;
    function stats() {
      $('es-drill-round').textContent = round;
      $('es-drill-score').textContent = score;
      $('es-drill-streak').textContent = streak;
    }
    function ask() {
      var card = queue[round];
      round++;
      stats();
      stage.innerHTML = '';
      var art = card.svg.cloneNode(true);
      art.removeAttribute('width'); art.removeAttribute('height');
      art.setAttribute('role', 'img');
      art.setAttribute('aria-label', 'Mystery schematic symbol, round ' + round);
      stage.appendChild(art);
      var names = shuffle(deck.filter(function (d) { return d.name !== card.name; })).slice(0, 3).map(function (d) { return d.name; });
      names.push(card.name);
      opts.innerHTML = '';
      shuffle(names).forEach(function (name) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'es-option'; b.textContent = name;
        b.addEventListener('click', function () { answer(b, name === card.name, card); });
        opts.appendChild(b);
      });
      setFeedback(fb, null, '');
      start.hidden = true;
      opts.querySelector('button').focus({ preventScroll: true });
    }
    function answer(button, ok, card) {
      all('.es-option', opts).forEach(function (b) {
        b.disabled = true;
        if (b.textContent === card.name) b.classList.add('is-right');
      });
      if (!ok) button.classList.add('is-wrong');
      if (ok) { score++; streak++; } else { streak = 0; }
      stats();
      setFeedback(fb, ok, (ok ? 'Yes: ' : 'That was the ' + card.name + '. ') + card.desc);
      start.hidden = false;
      start.textContent = round >= ROUNDS ? 'Play again' : 'Next symbol →';
      if (round >= ROUNDS) {
        setFeedback(fb, ok, fb.textContent + ' Final score: ' + score + ' of ' + ROUNDS + (score >= 8 ? '. Fluent!' : '. Browse the library tabs and try again.'));
      }
      start.focus({ preventScroll: true });
    }
    start.addEventListener('click', function () {
      if (!queue.length || round >= ROUNDS) { queue = shuffle(deck).slice(0, ROUNDS); round = 0; score = 0; streak = 0; }
      ask();
    });
  })();

  /* ── Connected or not? ── */
  (function judge() {
    var stage = $('es-judge-stage'), fb = $('es-judge-feedback'), next = $('es-judge-next');
    if (!stage) return;
    var B = 'var(--es-blue)', R = 'var(--es-red)';
    function wire(d, c) { return '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'; }
    function dot(x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="7" fill="var(--es-ink)"/>'; }
    function flag(x, y, c, name) {
      return '<path d="M' + x + ' ' + (y - 12) + 'H' + (x + 44) + 'L' + (x + 56) + ' ' + y + 'L' + (x + 44) + ' ' + (y + 12) + 'H' + x + 'Z" fill="var(--es-sheet)" stroke="' + c + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<text x="' + (x + 24) + '" y="' + (y + 4) + '" text-anchor="middle" fill="var(--es-ink)" font-family="JetBrains Mono,monospace" font-size="13" font-weight="700">' + name + '</text>';
    }
    function gnd(x, y, c) { return wire('M' + (x - 16) + ' ' + y + 'H' + (x + 16) + ' M' + (x - 10) + ' ' + (y + 8) + 'H' + (x + 10) + ' M' + (x - 4) + ' ' + (y + 16) + 'H' + (x + 4), c); }
    var cases = [
      { art: wire('M20 75H180', B) + wire('M100 15V135', R) + dot(100, 75), yes: true, why: 'Four-way crossing with a dot: joined. The dot is what makes it a junction.' },
      { art: wire('M20 75H180', B) + wire('M100 15V135', R), yes: false, why: 'Four-way crossing, no dot: not joined. The wires just pass over each other on the page.' },
      { art: wire('M20 75H86A14 14 0 0 1 114 75H180', B) + wire('M100 15V135', R), yes: false, why: 'The little hop is an older way to say "this wire jumps over." Not joined.' },
      { art: wire('M20 75H180', B) + wire('M100 75V135', R) + dot(100, 75), yes: true, why: 'A T with a dot: joined. This is the clearest way to draw a branch.' },
      { art: wire('M20 75H180', B) + wire('M100 75V135', R), yes: true, why: 'A T is always a join, even without the dot. A wire can\'t just end on another wire and not touch it. Good drafters still add the dot.' },
      { art: wire('M20 45H86', B) + flag(86, 45, B, 'SDA') + wire('M20 110H86', R) + flag(86, 110, R, 'SDA'), yes: true, why: 'Two net labels with the same name are the same node, even with no line between them.' },
      { art: wire('M20 45H86', B) + flag(86, 45, B, 'SDA') + wire('M20 110H86', R) + flag(86, 110, R, 'SCL'), yes: false, why: 'Different names, different nets. SDA and SCL are two separate signal wires.' },
      { art: wire('M55 20V95', B) + gnd(55, 95, B) + wire('M145 20V95', R) + gnd(145, 95, R), yes: true, why: 'Every ground symbol joins the same ground node. It works just like a repeated net label.' }
    ];
    var order = [], i = 0, score = 0, answered = false;
    function show() {
      var c = cases[order[i]];
      stage.innerHTML = '<svg viewBox="0 0 200 150" role="img" aria-label="Wiring case ' + (i + 1) + '">' + c.art + '</svg>';
      $('es-judge-case').textContent = i + 1;
      setFeedback(fb, null, '');
      next.hidden = true; answered = false;
      all('[data-judge]').forEach(function (b) { b.disabled = false; });
    }
    function reset() { order = shuffle(cases.map(function (_, k) { return k; })); i = 0; score = 0; $('es-judge-score').textContent = 0; show(); }
    all('[data-judge]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (answered) return;
        answered = true;
        var c = cases[order[i]], ok = (b.dataset.judge === 'yes') === c.yes;
        if (ok) score++;
        $('es-judge-score').textContent = score;
        setFeedback(fb, ok, (ok ? 'Right. ' : 'Not quite. ') + c.why);
        all('[data-judge]').forEach(function (x) { x.disabled = true; });
        next.hidden = false;
        next.textContent = i + 1 >= cases.length ? 'Play again (' + score + '/' + cases.length + ')' : 'Next case →';
        next.focus({ preventScroll: true });
      });
    });
    next.addEventListener('click', function () {
      if (i + 1 >= cases.length) { reset(); return; }
      i++; show();
    });
    reset();
  })();

  /* ── Seven-move reader ── */
  (function reader() {
    var draw = $('es-reader-draw');
    if (!draw) return;
    var steps = [
      { t: 'Find the power', x: 'Look for VCC, V+, +5 V, or a battery, usually near the top or left edge. Here a +5 V rail runs across the top. Everything touching it shares the same 5 volts.', hl: ['power'] },
      { t: 'Find ground', x: 'Look for the ground symbol: three shrinking lines. There are two here, under R3 and under Q1. No wire joins them, but they are the same node. Every current path ends here.', hl: ['gnd'] },
      { t: 'Name every part', x: 'Don\'t explain anything yet. Just sort the parts by designator letter: one switch (SW), three resistors (R), one LED (D), one transistor (Q).', hl: ['sw1', 'r1', 'r2', 'r3', 'd1', 'q1'], badges: true },
      { t: 'Trace the load path', x: 'Follow the current that does the work: +5 V → R1 → D1 → into Q1\'s collector, out its emitter → ground. Q1 is a gate sitting on that path.', hl: ['power', 'r1', 'd1', 'q1', 'gnd', 'wires', 'loadpath'] },
      { t: 'Find the control', x: 'Now find what opens the gate. Pressing SW1 connects +5 V through R2 into Q1\'s base, and a small base current lets a much bigger collector current flow. When SW1 is released, R3 pulls the base down to 0 V so Q1 stays firmly off instead of floating.', hl: ['power', 'sw1', 'r2', 'r3', 'q1', 'gnd', 'wires', 'ctrlpath'] },
      { t: 'Match repeated symbols', x: 'Repeated symbols are hidden wires. Both grounds are one node. On a bigger sheet, every +5 V arrow is one node, and net labels like SDA or DRIVE work the same way. Find every match before you decide a wire is unfinished.', hl: ['power', 'gnd'] },
      { t: 'Check it with Ohm\'s law', x: 'Do the numbers make sense? Subtract the LED\'s drop and the transistor\'s small drop from the supply, then divide by R1. Do the same for the base resistor.', hl: ['r1', 'd1', 'q1', 'r2'], calc: 'LED: I = (5 V − 2.0 V − 0.2 V) ÷ 330 Ω ≈ 8.5 mA ✓ under 20 mA\nBase: I = (5 V − 0.7 V) ÷ 10 kΩ ≈ 0.43 mA ✓ enough to switch it' }
    ];
    var groups = all('[data-hl]', draw), pips = $('es-reader-pips'), prev = $('es-reader-prev'), next = $('es-reader-next');
    var at = 0;
    steps.forEach(function (s, k) {
      var p = document.createElement('button');
      p.type = 'button'; p.className = 'es-pip';
      p.setAttribute('aria-label', 'Move ' + (k + 1) + ': ' + s.t);
      p.addEventListener('click', function () { go(k); });
      pips.appendChild(p);
    });
    function go(k) {
      at = Math.max(0, Math.min(steps.length - 1, k));
      var s = steps[at];
      groups.forEach(function (g) { g.classList.toggle('is-hl', s.hl.indexOf(g.dataset.hl) !== -1); });
      draw.classList.toggle('show-badges', !!s.badges);
      $('es-reader-count').dataset.zone = (at + 1) + '/7';
      $('es-reader-title').textContent = s.t;
      $('es-reader-text').textContent = s.x;
      var calc = $('es-reader-calc');
      calc.innerHTML = '';
      (s.calc || '').split('\n').filter(Boolean).forEach(function (line, n) {
        if (n) calc.appendChild(document.createElement('br'));
        calc.appendChild(document.createTextNode(line));
      });
      all('.es-pip', pips).forEach(function (p, n) { if (n === at) p.setAttribute('aria-current', 'step'); else p.removeAttribute('aria-current'); });
      prev.disabled = at === 0;
      next.textContent = at === steps.length - 1 ? 'Start over ↺' : 'Next →';
    }
    prev.addEventListener('click', function () { go(at - 1); });
    next.addEventListener('click', function () { go(at === steps.length - 1 ? 0 : at + 1); });
    go(0);
  })();

  /* ── Fault finder ── */
  (function faults() {
    var lcd = $('es-meter-lcd');
    if (!lcd) return;
    var predict = { A: 3.0, B: 3.0, C: 2.0, D: 0.0 };
    var cases = [
      { fault: 'sw1', v: { A: 3.0, B: 0.0, C: 0.0, D: 0.0 }, why: 'A reads 3.0 V but B reads 0.0 V. Last good node: A. First bad node: B. The only part between them is SW1, so its contacts aren\'t closing.' },
      { fault: 'r1', v: { A: 3.0, B: 3.0, C: 0.0, D: 0.0 }, why: 'B reads 3.0 V but C reads 0.0 V. The break is between B and C, and that is R1: a cracked resistor, or a leg that never went into the breadboard.' },
      { fault: 'd1', v: { A: 3.0, B: 3.0, C: 3.0, D: 0.0 }, why: 'C reads the full 3.0 V instead of about 2 V. With no voltage drop across R1, no current is flowing, so all 3 V sits across D1. It is in backwards, or burned out.' },
      { fault: 'b1', v: { A: 0.6, B: 0.6, C: 0.6, D: 0.0 }, why: 'Every node matches every other node, so the wiring is fine. But A reads only 0.6 V, nowhere near the 3.0 V predicted. A red LED needs about 2 V, so the battery is dead.' }
    ];
    var order = [], i = 0, solved = false, probes = 0;
    var tps = all('.es-tp'), log = $('es-fault-log'), fb = $('es-fault-feedback'), suspects = all('[data-suspect]');
    function load() {
      var c = cases[order[i]];
      solved = false; probes = 0;
      lcd.innerHTML = '-.-- <small>V</small>';
      $('es-meter-cap').textContent = 'DC volts · red probe not placed';
      $('es-fault-symptom').innerHTML = '<strong>Case ' + (i + 1) + ' of ' + cases.length + '.</strong> SW1 is closed, but D1 stays dark.';
      log.innerHTML = '';
      tps.forEach(function (tp) { tp.classList.remove('is-probed'); $('es-tpv-' + tp.dataset.tp).textContent = ''; });
      suspects.forEach(function (s) { s.disabled = false; s.setAttribute('aria-pressed', 'false'); });
      setFeedback(fb, null, '');
      return c;
    }
    function probe(tp) {
      var c = cases[order[i]], key = tp.dataset.tp, val = c.v[key];
      var shown = val.toFixed(1);
      var match = Math.abs(val - predict[key]) <= 0.25;
      probes++;
      tp.classList.add('is-probed');
      lcd.innerHTML = shown + ' <small>V</small>';
      $('es-meter-cap').textContent = 'DC volts · red probe on ' + key;
      $('es-tpv-' + key).textContent = shown + ' V';
      var li = document.createElement('li');
      li.textContent = key + ' = ' + shown + ' V  (predicted ' + predict[key].toFixed(1) + ' V) ' + (match ? '✓' : '✗ mismatch');
      log.appendChild(li);
    }
    tps.forEach(function (tp) { onActivate(tp, function () { probe(tp); }); });
    suspects.forEach(function (s) {
      s.addEventListener('click', function () {
        if (solved) return;
        var c = cases[order[i]];
        if (!probes) { setFeedback(fb, false, 'Measure first! Tap at least one test point. Engineers don\'t guess.'); return; }
        if (s.dataset.suspect === c.fault) {
          solved = true;
          s.setAttribute('aria-pressed', 'true');
          suspects.forEach(function (x) { x.disabled = true; });
          setFeedback(fb, true, 'Found it in ' + probes + ' probe' + (probes === 1 ? '' : 's') + '. ' + c.why);
        } else {
          s.disabled = true;
          setFeedback(fb, false, 'Not ' + s.textContent + '. Find the last reading that matches the prediction and the first that doesn\'t. The fault sits between them.');
        }
      });
    });
    $('es-fault-next').addEventListener('click', function () {
      i++;
      if (i >= cases.length) { order = shuffle(order); i = 0; }
      load();
    });
    order = shuffle(cases.map(function (_, k) { return k; }));
    load();
  })();

  /* Build chooser: the plan stays on this page; no student data is stored. */
  (function buildChooser() {
    var filter = $('es-build-filter');
    if (!filter) return;
    var projects = all('.es-project[data-build-level]');
    var gradeFilter = $('es-grade-filter');
    function applyFilters() {
      var count = 0;
      projects.forEach(function (project) {
        project.hidden = (filter.value !== 'all' && project.dataset.buildLevel !== filter.value) ||
          (gradeFilter.value !== 'all' && project.dataset.gradeBand !== gradeFilter.value);
        if (!project.hidden) count++;
      });
      $('es-build-count').textContent = count + ' schematic' + (count === 1 ? '' : 's') + ' shown' + (count === 0 ? '. Try another filter.' : '');
    }
    filter.addEventListener('change', applyFilters);
    gradeFilter.addEventListener('change', applyFilters);
    projects.forEach(function (project) {
      var entry = project.querySelector('.es-library-entry');
      entry.addEventListener('toggle', function () {
        if (entry.open) projects.forEach(function (other) {
          if (other !== project) other.querySelector('.es-library-entry').open = false;
        });
      });
    });
    function openLinkedProject() {
      var project = projects.find(function (item) { return '#' + item.id === location.hash; });
      if (!project) return;
      filter.value = gradeFilter.value = 'all';
      applyFilters();
      project.querySelector('.es-library-entry').open = true;
      project.scrollIntoView({ block: 'start' });
    }
    window.addEventListener('hashchange', openLinkedProject);
    openLinkedProject();
    all('[data-select-build]').forEach(function (button) {
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', function () {
        all('[data-select-build]').forEach(function (other) {
          other.setAttribute('aria-pressed', String(other === button));
        });
        var title = button.closest('.es-project').querySelector('h3').textContent;
        $('es-build-selection').textContent = 'Selected: ' + title + '. Start with the parts list and three predictions; follow the assignment rubric below. Selection lasts while this page is open.';
      });
    });
  })();

  /* ── Quick check ── */
  (function quiz() {
    var qs = all('.sm-question'), out = $('es-quiz-score');
    var done = 0, right = 0;
    qs.forEach(function (q) {
      var answer = q.dataset.answer, why = q.dataset.explanation, fb = q.querySelector('.sm-q-feedback');
      var options = all('.sm-option', q);
      options.forEach(function (opt) {
        opt.addEventListener('click', function () {
          if (opt.disabled) return;
          var ok = opt.dataset.choice === answer;
          options.forEach(function (o) {
            o.disabled = true;
            if (o.dataset.choice === answer) o.classList.add('is-correct');
          });
          if (!ok) opt.classList.add('is-wrong');
          fb.textContent = (ok ? 'Correct. ' : 'Not quite. ') + why;
          fb.classList.add(ok ? 'is-right' : 'is-wrong');
          done++; if (ok) right++;
          if (out) out.textContent = done < qs.length ? done + ' of ' + qs.length + ' answered · ' + right + ' correct' : 'Final: ' + right + ' of ' + qs.length + ' correct';
        });
      });
    });
  })();
})();
