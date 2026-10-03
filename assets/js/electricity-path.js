/*
 * Electronics curriculum navigator.
 *
 * The single source of truth for the order of the electricity → electronics →
 * Arduino → control sequence. Every lesson in CURRICULUM (core units and
 * extensions) loads this script; it injects a "you are here" bar under the
 * lesson hero and a full unit map with previous/next links at the end of
 * <main>. Paths are site-root-relative and resolved against this script's own
 * URL, so the same file works from lessons/engineering/..., lessons/physics/...,
 * and lessons/physics/pioneers/... alike.
 *
 * Keep paths.html ("circuits-sensors-control" and "arduino-building-programming")
 * and data/compendium-plan.json ("electronics-workshop") in the same order.
 */
(function () {
  'use strict';

  var main = document.querySelector('main');
  if (!main || document.querySelector('.electricity-path')) return;

  var E = 'lessons/engineering/arduino-and-electronics/';
  var P = 'lessons/physics/electricity-and-magnetism/';

  var UNITS = [
    {
      title: 'What electricity is',
      goal: 'Charge, voltage, current, resistance, and the two kinds of current.',
      lessons: [
        [P + 'what-is-electricity.html', 'What is electricity?'],
        [P + 'coulombs-law.html', 'Charge & force'],
        [E + 'ohms-law.html', 'Ohm’s Law'],
        [P + 'ac-vs-dc.html', 'AC vs. DC']
      ]
    },
    {
      title: 'Parts & drawings',
      goal: 'Name every part in the kit, read its value, and read a circuit map.',
      lessons: [
        [E + 'electronic-components.html', 'Components'],
        [E + 'resistor-color-code.html', 'Resistor color code'],
        [E + 'electronic-schematics.html', 'Schematics']
      ]
    },
    {
      title: 'Build & measure',
      goal: 'Turn a schematic into a working circuit, prove it with a meter, then make it permanent.',
      lessons: [
        [E + 'breadboard-basics.html', 'Breadboard basics'],
        [E + 'multimeter-lab.html', 'Multimeter lab'],
        [E + 'soldering.html', 'Soldering']
      ]
    },
    {
      title: 'The microcontroller',
      goal: 'Upload code, know the board’s pins and voltage limits, and write real sketches.',
      lessons: [
        [E + 'arduino-robot-brain.html', 'Arduino: first sketch'],
        [E + 'arduino-choosing-your-board.html', 'Board anatomy'],
        [E + 'arduino-programming-foundations.html', 'Programming foundations']
      ]
    },
    {
      title: 'Sense & act',
      goal: 'Read the physical world, drive things that move and glow, and show data on a screen.',
      lessons: [
        [E + 'inputs-beyond-the-button.html', 'Creative inputs'],
        [E + 'outputs-beyond-the-led.html', 'Driving outputs'],
        [E + 'sensor-modules.html', 'Sensor modules'],
        [E + 'sensor-to-webpage.html', 'Sensor to webpage']
      ]
    },
    {
      title: 'Systems & control',
      goal: 'Close the loop with feedback, then connect devices to a network.',
      lessons: [
        [E + 'pid-control.html', 'PID feedback control'],
        [E + 'internet-of-things.html', 'Internet of Things']
      ]
    }
  ];

  var EXTENSIONS = {
    title: 'Fields, induction & the people behind them',
    goal: 'Optional depth after Unit 1: static charge, magnetism, and how generators and transformers work.',
    lessons: [
      [P + 'van-de-graaff-balloon.html', 'Van de Graaff balloon'],
      [P + 'van-de-graaff-generator.html', 'Van de Graaff generator'],
      [P + 'faraday-cage.html', 'Faraday cage'],
      [P + 'faradays-law.html', 'Faraday’s Law'],
      [P + 'falling-coil.html', 'The falling coil'],
      [P + 'cathode-ray-tube.html', 'Cathode ray tube'],
      ['lessons/engineering/mechanical-and-civil-design/maglev-train.html', 'Maglev train'],
      ['lessons/physics/pioneers/benjamin-franklin.html', 'Benjamin Franklin'],
      ['lessons/physics/pioneers/nikola-tesla.html', 'Nikola Tesla'],
      ['lessons/physics/pioneers/james-clerk-maxwell.html', 'James Clerk Maxwell']
    ]
  };

  // Resolve the site root from this script's URL (…/assets/js/electricity-path.js).
  var self = document.currentScript || document.querySelector('script[src*="electricity-path.js"]');
  var root = new URL('../../', self ? self.src : location.href).href;
  function href(path) { return new URL(path, root).href; }
  function samePage(path) { return new URL(path, root).pathname === location.pathname; }

  // Flatten the core units into one numbered sequence.
  var core = [];
  UNITS.forEach(function (unit, u) {
    unit.lessons.forEach(function (lesson) {
      core.push({ path: lesson[0], label: lesson[1], unit: u, number: core.length + 1 });
    });
  });

  var here = -1;
  core.forEach(function (item, i) { if (samePage(item.path)) here = i; });
  var inExtension = here < 0 && EXTENSIONS.lessons.some(function (l) { return samePage(l[0]); });

  function esc(text) {
    return String(text).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function link(path, label, number) {
    var current = samePage(path) ? ' aria-current="page"' : '';
    var num = number ? '<span aria-hidden="true">' + number + '</span>' : '';
    return '<a class="electricity-path__link" href="' + href(path) + '"' + current + '>' +
      num + '<span>' + esc(label) + '</span></a>';
  }

  function unitBlock(unit, u) {
    var items = core.filter(function (item) { return item.unit === u; });
    var active = here >= 0 && core[here].unit === u ? ' is-current' : '';
    return '<li class="electricity-path__unit' + active + '">' +
      '<p class="electricity-path__unit-title"><span>Unit ' + (u + 1) + '</span> ' + esc(unit.title) + '</p>' +
      '<p class="electricity-path__unit-goal">' + esc(unit.goal) + '</p>' +
      '<div class="electricity-path__links">' +
      items.map(function (item) { return link(item.path, item.label, item.number); }).join('') +
      '</div></li>';
  }

  function stepLink(item, dir) {
    if (!item) return '<span class="electricity-path__step is-empty" aria-hidden="true"></span>';
    return '<a class="electricity-path__step electricity-path__step--' + dir + '" href="' + href(item.path) + '">' +
      '<small>' + (dir === 'prev' ? '← Previous' : 'Next →') + ' · Unit ' + (item.unit + 1) + '</small>' +
      '<strong>' + item.number + '. ' + esc(item.label) + '</strong></a>';
  }

  // ── "You are here" bar under the hero ─────────────────────────────────────
  var lead = '';
  if (here >= 0) {
    var cur = core[here];
    var next = core[here + 1];
    lead = '<span class="electricity-path__crumb-label">Electronics curriculum</span>' +
      '<span>Unit ' + (cur.unit + 1) + ' · ' + esc(UNITS[cur.unit].title) + '</span>' +
      '<span>Lesson ' + cur.number + ' of ' + core.length + '</span>' +
      (next ? '<a href="' + href(next.path) + '">Next: ' + esc(next.label) + ' →</a>' : '') +
      '<a href="#electricity-path-title">Full map ↓</a>';
  } else if (inExtension) {
    lead = '<span class="electricity-path__crumb-label">Electronics curriculum</span>' +
      '<span>Extension · ' + esc(EXTENSIONS.title) + '</span>' +
      '<a href="#electricity-path-title">See where this fits ↓</a>';
  }
  if (lead) {
    var crumb = document.createElement('nav');
    crumb.className = 'electricity-path__crumb';
    crumb.setAttribute('aria-label', 'Position in the electronics curriculum');
    crumb.innerHTML = lead;
    var hero = main.querySelector('.hero, [class*="hero"]');
    while (hero && hero.parentElement !== main && main.contains(hero.parentElement)) hero = hero.parentElement;
    if (hero && hero.parentElement === main) main.insertBefore(crumb, hero.nextSibling);
    else main.insertBefore(crumb, main.firstChild);
  }

  // ── Full map + previous/next at the end of <main> ────────────────────────
  var section = document.createElement('section');
  section.className = 'electricity-path';
  section.setAttribute('aria-labelledby', 'electricity-path-title');
  section.setAttribute('data-no-glossary', '');  // keep the site glossary from underlining nav text

  var steps = here >= 0
    ? '<nav class="electricity-path__steps" aria-label="Previous and next lesson">' +
      stepLink(core[here - 1], 'prev') + stepLink(core[here + 1], 'next') + '</nav>'
    : '';

  var intro = inExtension
    ? 'This lesson is an optional extension. It goes deepest after Unit 1. When you are ready to build, return to the core sequence below.'
    : 'Six units take you from electric charge to machines that sense, decide, and act. Follow the numbers in order, or jump to the idea you need.';

  section.innerHTML =
    '<p class="electricity-path__eyebrow">Electronics curriculum</p>' +
    '<h2 id="electricity-path-title">From electric charge to working electronics</h2>' +
    '<p class="electricity-path__intro">' + intro + '</p>' +
    steps +
    '<ol class="electricity-path__units">' + UNITS.map(unitBlock).join('') + '</ol>' +
    '<div class="electricity-path__extensions">' +
    '<p class="electricity-path__unit-title"><span>Extensions</span> ' + esc(EXTENSIONS.title) + '</p>' +
    '<p class="electricity-path__unit-goal">' + esc(EXTENSIONS.goal) + '</p>' +
    '<div class="electricity-path__links">' +
    EXTENSIONS.lessons.map(function (l) { return link(l[0], l[1]); }).join('') +
    '</div></div>';

  var footer = main.querySelector('footer');
  if (footer && footer.parentElement === main) main.insertBefore(section, footer);
  else main.appendChild(section);
})();
