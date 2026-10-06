/* Electronics Capstone: design briefs, engineering notebook, power budget,
   predict-vs-measure log, rubric, and before/after skills check.
   Everything a student types is kept in this browser only (localStorage). */
(function () {
  'use strict';

  var KEY = 'ee-capstone-v1';
  var fmt = EELab.fmt;

  var BRIEFS = [
    {
      id: 'night', title: 'Automatic Night-Light', short: 'Turns itself on when the room gets dark.',
      problem: 'A younger sibling is scared of a dark hallway, but a light left on all day wastes battery.',
      requirements: ['Turns on within 2 seconds when the room light drops below a level you choose', 'Stays off in normal room light', 'Doesn’t flicker at the switching point', 'Runs at least 3 nights on batteries'],
      constraints: ['Battery powered', 'Fits in a box the size of a phone', 'Uses a voltage divider you designed'],
      skills: [['voltage-dividers-kirchhoff.html', 'Dividers'], ['transistor-to-logic-gate.html', 'MOSFET switch'], ['capacitors-rc-time.html', 'RC smoothing']],
      stretch: 'Build it with no Arduino at all: a light-sensor divider driving a MOSFET directly. Then add an RC filter so a passing shadow doesn’t trigger it.'
    },
    {
      id: 'plant', title: 'Plant Thirst Alarm', short: 'Beeps when the soil is dry.',
      problem: 'Classroom plants die over long weekends because nobody notices the soil drying out.',
      requirements: ['Detects dry soil vs. damp soil reliably', 'Gives a sound and light alert when dry', 'Checks at least once an hour', 'Runs for a week on batteries'],
      constraints: ['Battery powered', 'The sensor probes must survive in damp soil', 'The alert must be noticeable but not annoying'],
      skills: [['voltage-dividers-kirchhoff.html', 'Sensor dividers'], ['sensor-modules.html', 'Sensor modules'], ['arduino-programming-foundations.html', 'Arduino programming']],
      stretch: 'Make it last a month: power the sensor from a digital pin only while reading, and put the Arduino to sleep in between.'
    },
    {
      id: 'reaction', title: 'Reaction-Time Game', short: 'Two players, one light, who’s faster?',
      problem: 'Design a fair, fun game for the class that measures reaction time in milliseconds.',
      requirements: ['Waits a random 2–5 seconds, then lights a “GO” LED', 'Detects which player pressed first with no false presses', 'Catches and penalizes early presses', 'Reports both times to the nearest millisecond'],
      constraints: ['Buttons must be debounced (in hardware or code)', 'Must be fair: identical wiring for both players'],
      skills: [['inputs-beyond-the-button.html', 'Inputs & debouncing'], ['capacitors-rc-time.html', 'RC debounce'], ['outputs-beyond-the-led.html', 'Outputs']],
      stretch: 'Show results on an LCD or 7-segment display, and keep a high score.'
    },
    {
      id: 'fan', title: 'Smart Desk Fan', short: 'Spins faster as it gets warmer.',
      problem: 'A small fan wastes battery running at full speed even when it’s cool.',
      requirements: ['Off below a temperature you choose', 'Speed rises smoothly with temperature (PWM)', 'Motor is switched safely with a transistor', 'No Arduino resets when the motor starts'],
      constraints: ['Motor must not draw current through an Arduino pin', 'Must include a flyback diode across the motor', 'Separate or decoupled motor supply'],
      skills: [['transistor-to-logic-gate.html', 'MOSFET switch'], ['outputs-beyond-the-led.html', 'Flyback diodes & PWM'], ['capacitors-rc-time.html', 'Decoupling']],
      stretch: 'Add a hysteresis band so the fan doesn’t click on and off at the threshold.'
    },
    {
      id: 'noise', title: 'Classroom Noise Meter', short: 'A traffic light for volume.',
      problem: 'Group work gets loud. The class needs a fair, visible signal when noise climbs too high.',
      requirements: ['Green, yellow, and red levels with adjustable thresholds', 'Ignores single short noises like a dropped pencil', 'Visible from across the room', 'Runs from USB all day'],
      constraints: ['Uses a sound sensor module', 'Thresholds must be set from measured data, not guesses'],
      skills: [['sensor-modules.html', 'Sensor modules'], ['capacitors-rc-time.html', 'Filtering'], ['sensor-to-webpage.html', 'Logging data']],
      stretch: 'Log the levels over a class period and graph them on a webpage.'
    },
    {
      id: 'own', title: 'Pitch your own', short: 'Your problem, your device.',
      problem: 'Find a real problem that a person you know has. Describe who it’s for and why it matters.',
      requirements: ['At least four requirements, each one testable with a number or a yes/no', 'Uses at least one sensor (input) and one actuator (output)', 'Uses at least three ideas from the electronics module'],
      constraints: ['Low voltage only: batteries or USB', 'Buildable with the classroom kit plus at most two new parts', 'Teacher approval before Phase 2'],
      skills: [['electronic-schematics.html', 'Schematics'], ['multimeter-lab.html', 'Measurement'], ['soldering.html', 'Soldering']],
      stretch: 'Interview your user before you start and again after they try your prototype.'
    }
  ];

  var PHASES = [
    {
      title: 'Define the problem', time: '1 period',
      items: ['Wrote a one-sentence problem statement: who has the problem, and why it matters', 'Listed at least four requirements, each one measurable or yes/no', 'Listed the constraints (power, size, cost, safety)', 'Chose how each requirement will be tested'],
      prompt: 'Problem statement, requirements (numbered), constraints, and how you will test each requirement…',
      checkpoint: 'Requirements are specific and testable.'
    },
    {
      title: 'Design the circuit', time: '2 periods',
      items: ['Drew a block diagram: input → processing → output', 'Drew a full schematic with values and reference designators', 'Calculated every resistor (LED current, dividers, pull-ups)', 'Calculated any timing (RC or code delays)', 'Wrote a parts list with quantities'],
      prompt: 'Calculations with units: show the formula, the numbers, and the answer. Note any part you need to order…',
      checkpoint: 'Schematic checked before any building starts.'
    },
    {
      title: 'Plan the power', time: '1 period',
      items: ['Listed every part’s current in the power budget below', 'Checked the peak current against the supply’s limit', 'Estimated battery life (or justified USB power)', 'Planned decoupling and a flyback diode where needed'],
      prompt: 'Which supply did you choose and why? What was your peak and average current?…',
      checkpoint: 'Supply can handle the peak current.'
    },
    {
      title: 'Prototype on a breadboard', time: '3 periods',
      items: ['Built and tested one block at a time, not everything at once', 'Recorded predicted vs. measured values for at least five test points', 'Explained every difference bigger than 10%', 'Got the whole system working on the breadboard'],
      prompt: 'What worked first time? What didn’t, and how did you find out why?…',
      checkpoint: 'Working breadboard with measurements logged.'
    },
    {
      title: 'Make it permanent', time: '2 periods',
      items: ['Planned the perfboard or solder layout on paper first', 'Soldered with shiny, cone-shaped joints', 'Checked for solder bridges and broken joints with continuity mode', 'Checked the supply for shorts before the first power-up', 'Mounted it in an enclosure that a user can handle'],
      prompt: 'Photos or sketches of the layout. Which joints did you redo, and why?…',
      checkpoint: 'Continuity and short checks passed before power-up.'
    },
    {
      title: 'Test and iterate', time: '2 periods',
      items: ['Tested every requirement and recorded pass or fail with evidence', 'Logged at least two failures and what you changed', 'Retested after each change', 'Had a real user try it and recorded their feedback'],
      prompt: 'Requirement-by-requirement results. Failure log: what happened → why → what you changed → result…',
      checkpoint: 'Every requirement tested with evidence.'
    },
    {
      title: 'Present', time: '1 period',
      items: ['Demonstrated the device working live', 'Explained one design decision using numbers', 'Showed the predicted-vs-measured table', 'Said honestly what you would change in version 2'],
      prompt: 'Presentation notes: the one decision you’ll explain, and what version 2 would change…',
      checkpoint: 'Presented and reflected.'
    }
  ];

  var RUBRIC = [
    ['Requirements', 'Vague goals; not testable', 'Some requirements are testable', 'Four or more clear, measurable requirements', 'Requirements trace to user needs, with numbers and test methods'],
    ['Circuit design & calculations', 'Schematic missing or incorrect', 'Schematic with some values; few calculations', 'Complete schematic; every value calculated with units', 'Compares design options and justifies choices with calculations'],
    ['Power & safety', 'No power plan', 'Supply chosen without numbers', 'Power budget done; decoupling and flyback where needed', 'Optimizes power and explains battery life with evidence'],
    ['Build quality', 'Loose, unreliable connections', 'Works but fragile', 'Solid joints, tidy wiring, usable enclosure', 'Robust, serviceable build that someone else could repair'],
    ['Testing & measurement', 'Little or no testing', 'Some tests; predictions missing', 'Every requirement tested; predictions vs. measurements logged', 'Explains every discrepancy using tolerance, loading, or design error'],
    ['Iteration & communication', 'No changes made; unclear presentation', 'One change; notebook incomplete', 'Failures logged and fixed; clear demo and notebook', 'Thoughtful version-2 plan; could teach the design to others']
  ];

  var SKILLS = [
    ['Use Ohm’s Law to size an LED resistor', 'ohms-law.html'],
    ['Find the voltage at any point in a series loop (KVL)', 'voltage-dividers-kirchhoff.html'],
    ['Design a voltage divider for a sensor', 'voltage-dividers-kirchhoff.html'],
    ['Identify components and their polarity', 'electronic-components.html'],
    ['Read a resistor and a capacitor’s value from its markings', 'resistor-color-code.html'],
    ['Predict how long an RC circuit takes to charge', 'capacitors-rc-time.html'],
    ['Read a schematic and build it on a breadboard', 'electronic-schematics.html'],
    ['Measure volts, amps, and ohms safely', 'multimeter-lab.html'],
    ['Make a reliable solder joint', 'soldering.html'],
    ['Use a transistor to switch a large load', 'transistor-to-logic-gate.html'],
    ['Write an Arduino sketch that reads an input and drives an output', 'arduino-programming-foundations.html'],
    ['Troubleshoot a dead circuit by measuring, not rebuilding', 'multimeter-lab.html']
  ];

  var SUPPLIES = {
    usb: { name: 'USB port', max: 500, cap: null },
    aa4: { name: '4 × AA', max: 1000, cap: 2000 },
    nine: { name: '9 V battery', max: 300, cap: 500 },
    bank: { name: 'power bank', max: 2000, cap: 10000 },
    lipo: { name: '1-cell LiPo', max: 1000, cap: 1000 }
  };

  // ── State ─────────────────────────────────────────────────────────────
  function blank() {
    return { brief: null, names: '', checks: {}, notes: {}, budget: [], supply: 'aa4', predictions: [{ what: '', pred: '', meas: '' }], rubric: {}, skills: {} };
  }
  var state = blank();
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') for (var k in state) if (k in saved) state[k] = saved[k];
  } catch (e) { /* storage unavailable: work in memory */ }
  var savedNote = document.getElementById('nb-saved');
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
        savedNote.textContent = 'Saved in this browser at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '.';
      } catch (e) {
        savedNote.textContent = 'This browser won’t save the notebook here. Download it before you leave the page.';
      }
    }, 300);
  }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ── Briefs ────────────────────────────────────────────────────────────
  var pick = document.getElementById('brief-pick');
  var detail = document.getElementById('brief-detail');
  function renderBriefs() {
    pick.innerHTML = BRIEFS.map(function (b) {
      return '<button type="button" data-brief="' + b.id + '" aria-pressed="' + (state.brief === b.id) + '"><strong>' + esc(b.title) + '</strong><small>' + esc(b.short) + '</small></button>';
    }).join('');
    var b = BRIEFS.filter(function (x) { return x.id === state.brief; })[0];
    if (!b) { detail.innerHTML = '<p class="ee-signoff">Choose a brief to see its requirements.</p>'; return; }
    detail.innerHTML = '<h3>' + esc(b.title) + '</h3><dl>' +
      '<dt>Problem</dt><dd>' + esc(b.problem) + '</dd>' +
      '<dt>Must</dt><dd><ul>' + b.requirements.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></dd>' +
      '<dt>Constraints</dt><dd><ul>' + b.constraints.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></dd>' +
      '<dt>Review</dt><dd>' + b.skills.map(function (s) { return '<a href="' + s[0] + '">' + esc(s[1]) + '</a>'; }).join(' · ') + '</dd>' +
      '<dt>Stretch</dt><dd>' + esc(b.stretch) + '</dd></dl>';
  }
  pick.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-brief]');
    if (!btn) return;
    state.brief = btn.dataset.brief;
    renderBriefs(); save();
  });

  // ── Notebook phases ───────────────────────────────────────────────────
  var phasesEl = document.getElementById('phases');
  function renderPhases() {
    phasesEl.innerHTML = PHASES.map(function (p, i) {
      return '<div class="ee-phase"><h3><span>' + (i + 1) + ' · ' + esc(p.title) + '</span><small>' + esc(p.time) + '</small></h3>' +
        '<ul class="ee-checklist">' + p.items.map(function (item, j) {
          var id = 'nb-' + i + '-' + j;
          return '<li><label><input type="checkbox" data-check="' + i + '-' + j + '" id="' + id + '"' + (state.checks[i + '-' + j] ? ' checked' : '') + ' /><span>' + esc(item) + '</span></label></li>';
        }).join('') + '</ul>' +
        '<label class="ee-sr" for="nb-note-' + i + '">Phase ' + (i + 1) + ' notes</label>' +
        '<textarea class="ee-notes" id="nb-note-' + i + '" data-note="' + i + '" placeholder="' + esc(p.prompt) + '">' + esc(state.notes[i] || '') + '</textarea>' +
        '<p class="ee-signoff">Checkpoint: ' + esc(p.checkpoint) + ' · Teacher initials: ________ Date: ________</p></div>';
    }).join('');
    progress();
  }
  function progress() {
    var total = 0, done = 0;
    PHASES.forEach(function (p, i) { p.items.forEach(function (_, j) { total++; if (state.checks[i + '-' + j]) done++; }); });
    document.getElementById('nb-progress').style.width = Math.round(done / total * 100) + '%';
    document.getElementById('nb-progress-text').textContent = done + ' of ' + total + ' notebook items complete.';
  }
  phasesEl.addEventListener('change', function (e) {
    var key = e.target.dataset.check;
    if (key == null) return;
    state.checks[key] = e.target.checked;
    progress(); save();
  });
  phasesEl.addEventListener('input', function (e) {
    var i = e.target.dataset.note;
    if (i == null) return;
    state.notes[i] = e.target.value;
    save();
  });
  var names = document.getElementById('nb-names');
  names.value = state.names || '';
  names.addEventListener('input', function () { state.names = names.value; save(); });

  // ── Power budget ──────────────────────────────────────────────────────
  var budgetBody = document.querySelector('#budget tbody');
  var supplySel = document.getElementById('budget-supply');
  function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : 0; }
  function renderBudget() {
    budgetBody.innerHTML = state.budget.map(function (r, i) {
      var avg = num(r.ma) * num(r.qty) * num(r.duty) / 100;
      return '<tr data-row="' + i + '">' +
        '<td><input aria-label="Part ' + (i + 1) + ' name" data-f="name" value="' + esc(r.name) + '" /></td>' +
        '<td><input aria-label="Part ' + (i + 1) + ' current in milliamps" data-f="ma" inputmode="decimal" value="' + esc(r.ma) + '" /></td>' +
        '<td><input aria-label="Part ' + (i + 1) + ' quantity" data-f="qty" inputmode="numeric" value="' + esc(r.qty) + '" /></td>' +
        '<td><input aria-label="Part ' + (i + 1) + ' percent of time on" data-f="duty" inputmode="decimal" value="' + esc(r.duty) + '" /></td>' +
        '<td data-avg>' + avg.toFixed(1) + '</td>' +
        '<td><button type="button" class="ee-btn" data-remove aria-label="Remove part ' + (i + 1) + '">✕</button></td></tr>';
    }).join('');
    supplySel.value = state.supply;
    budgetTotals();
  }
  function budgetTotals() {
    var peak = 0, avg = 0;
    state.budget.forEach(function (r) {
      peak += num(r.ma) * num(r.qty);
      avg += num(r.ma) * num(r.qty) * num(r.duty) / 100;
    });
    var sup = SUPPLIES[state.supply];
    document.getElementById('budget-peak').textContent = fmt(peak / 1000, 'A');
    document.getElementById('budget-avg').textContent = fmt(avg / 1000, 'A');
    var lifeEl = document.getElementById('budget-life');
    var coach = document.getElementById('budget-coach');
    var hours = sup.cap && avg > 0 ? sup.cap * 0.8 / avg : null;
    lifeEl.textContent = !sup.cap ? 'unlimited' : hours == null ? '—' : hours >= 48 ? (hours / 24).toFixed(1) + ' days' : hours.toFixed(1) + ' h';
    if (!state.budget.length) {
      coach.dataset.tone = '';
      coach.innerHTML = '<strong>Add your parts</strong>Start with the Arduino board itself, then every LED, sensor, and motor.';
    } else if (peak > sup.max) {
      coach.dataset.tone = 'bad';
      coach.innerHTML = '<strong>Over the limit</strong>At peak your project asks for ' + fmt(peak / 1000, 'A') + ', but a ' + sup.name + ' can only supply about ' + fmt(sup.max / 1000, 'A') + '. Expect the voltage to sag and the Arduino to reset. Give motors and servos their own supply (with a shared ground) or choose a bigger one.';
    } else if (peak > sup.max * 0.8) {
      coach.dataset.tone = 'warn';
      coach.innerHTML = '<strong>Cutting it close</strong>The peak is over 80% of what the supply can deliver. Add a big electrolytic capacitor across the supply near the motor to cover the surges.';
    } else if (!sup.cap) {
      coach.dataset.tone = 'ok';
      coach.innerHTML = '<strong>USB works</strong>USB won’t run out, so the only question is the peak current, and you’re under the 500 mA limit.';
    } else {
      coach.dataset.tone = hours < 24 ? 'warn' : 'ok';
      coach.innerHTML = '<strong>' + (hours < 24 ? 'Short battery life' : 'Looks good') + '</strong>' + (sup.cap * 0.8).toLocaleString() + ' usable mAh ÷ ' + avg.toFixed(1) + ' mA average ≈ ' + lifeEl.textContent + '.' +
        (hours < 24 ? ' Biggest savings: turn LEDs and sensors off when not needed, or put the Arduino to sleep. The UNO board alone uses about 45 mA even when idle.' : '');
    }
  }
  budgetBody.addEventListener('input', function (e) {
    var tr = e.target.closest('[data-row]');
    if (!tr) return;
    var r = state.budget[Number(tr.dataset.row)];
    r[e.target.dataset.f] = e.target.value;
    tr.querySelector('[data-avg]').textContent = (num(r.ma) * num(r.qty) * num(r.duty) / 100).toFixed(1);
    budgetTotals(); save();
  });
  budgetBody.addEventListener('click', function (e) {
    if (!e.target.closest('[data-remove]')) return;
    state.budget.splice(Number(e.target.closest('[data-row]').dataset.row), 1);
    renderBudget(); save();
  });
  document.getElementById('budget-add').addEventListener('click', function () {
    state.budget.push({ name: '', ma: '', qty: '1', duty: '100' });
    renderBudget(); save();
    var inputs = budgetBody.querySelectorAll('input[data-f="name"]');
    if (inputs.length) inputs[inputs.length - 1].focus();
  });
  document.getElementById('budget-example').addEventListener('click', function () {
    state.budget = [
      { name: 'Arduino UNO board', ma: '45', qty: '1', duty: '100' },
      { name: 'Red LED + 220 Ω', ma: '15', qty: '2', duty: '50' },
      { name: 'Soil moisture sensor', ma: '5', qty: '1', duty: '100' },
      { name: 'Piezo buzzer', ma: '5', qty: '1', duty: '5' },
      { name: 'SG90 servo (moving)', ma: '250', qty: '1', duty: '2' }
    ];
    renderBudget(); save();
  });
  supplySel.addEventListener('change', function () { state.supply = supplySel.value; budgetTotals(); save(); });

  // ── Predict vs measure ────────────────────────────────────────────────
  var predBody = document.querySelector('#predictions tbody');
  function diffCell(r) {
    var p = num(r.pred), m = num(r.meas);
    if (!String(r.pred).trim() || !String(r.meas).trim() || p === 0) return '<td data-diff>—</td>';
    var d = (m - p) / Math.abs(p) * 100;
    var cls = Math.abs(d) <= 10 ? 'is-good' : 'is-bad';
    return '<td data-diff><span class="' + cls + '" style="font-weight:800;color:var(' + (cls === 'is-good' ? '--ee-ok' : '--ee-bad') + ')">' + (d >= 0 ? '+' : '') + d.toFixed(1) + '%</span>' + (Math.abs(d) > 10 ? ' explain it' : '') + '</td>';
  }
  function renderPredictions() {
    predBody.innerHTML = state.predictions.map(function (r, i) {
      return '<tr data-row="' + i + '">' +
        '<td><input aria-label="Measurement ' + (i + 1) + ' description" data-f="what" placeholder="e.g. V across R1" value="' + esc(r.what) + '" /></td>' +
        '<td><input aria-label="Measurement ' + (i + 1) + ' predicted" data-f="pred" placeholder="e.g. 3.2 V" value="' + esc(r.pred) + '" /></td>' +
        '<td><input aria-label="Measurement ' + (i + 1) + ' measured" data-f="meas" placeholder="e.g. 3.08 V" value="' + esc(r.meas) + '" /></td>' +
        diffCell(r) +
        '<td><button type="button" class="ee-btn" data-remove aria-label="Remove measurement ' + (i + 1) + '">✕</button></td></tr>';
    }).join('');
  }
  predBody.addEventListener('input', function (e) {
    var tr = e.target.closest('[data-row]');
    if (!tr) return;
    var r = state.predictions[Number(tr.dataset.row)];
    r[e.target.dataset.f] = e.target.value;
    tr.querySelector('[data-diff]').outerHTML = diffCell(r);
    save();
  });
  predBody.addEventListener('click', function (e) {
    if (!e.target.closest('[data-remove]')) return;
    state.predictions.splice(Number(e.target.closest('[data-row]').dataset.row), 1);
    renderPredictions(); save();
  });
  document.getElementById('predict-add').addEventListener('click', function () {
    state.predictions.push({ what: '', pred: '', meas: '' });
    renderPredictions(); save();
  });

  // ── Rubric ────────────────────────────────────────────────────────────
  var rubricBody = document.querySelector('#rubric-table tbody');
  function renderRubric() {
    rubricBody.innerHTML = RUBRIC.map(function (row, i) {
      return '<tr><th scope="row">' + esc(row[0]) + '</th>' + row.slice(1).map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') +
        '<td><div class="ee-rate" role="group" aria-label="Self-score for ' + esc(row[0]) + '">' + [1, 2, 3, 4].map(function (n) {
          return '<button type="button" data-rubric="' + i + '" data-level="' + n + '" aria-pressed="' + (state.rubric[i] === n) + '">' + n + '</button>';
        }).join('') + '</div></td></tr>';
    }).join('');
    var scored = Object.keys(state.rubric).length;
    var sum = Object.keys(state.rubric).reduce(function (a, k) { return a + state.rubric[k]; }, 0);
    document.getElementById('rubric-total').textContent = scored ? 'Self-score: ' + sum + ' of ' + (RUBRIC.length * 4) + (scored < RUBRIC.length ? ' (' + (RUBRIC.length - scored) + ' rows not scored yet)' : '') + '.' : 'Not scored yet.';
  }
  rubricBody.addEventListener('click', function (e) {
    var b = e.target.closest('[data-rubric]');
    if (!b) return;
    var i = b.dataset.rubric, n = Number(b.dataset.level);
    if (state.rubric[i] === n) delete state.rubric[i]; else state.rubric[i] = n;
    renderRubric(); save();
  });

  // ── Skills check ──────────────────────────────────────────────────────
  var skillsBody = document.querySelector('#skills-table tbody');
  function renderSkills() {
    skillsBody.innerHTML = SKILLS.map(function (sk, i) {
      var cur = state.skills[i] || {};
      function rate(col) {
        return '<div class="ee-rate" role="group" aria-label="' + col + ': ' + esc(sk[0]) + '">' + [1, 2, 3, 4].map(function (n) {
          return '<button type="button" data-skill="' + i + '" data-col="' + col + '" data-level="' + n + '" aria-pressed="' + (cur[col] === n) + '">' + n + '</button>';
        }).join('') + '</div>';
      }
      return '<tr><th scope="row" style="white-space:normal">' + esc(sk[0]) + '</th><td>' + rate('before') + '</td><td>' + rate('after') + '</td><td><a href="' + sk[1] + '">Review</a></td></tr>';
    }).join('');
    var b = 0, a = 0, both = 0;
    SKILLS.forEach(function (_, i) {
      var c = state.skills[i];
      if (c && c.before && c.after) { b += c.before; a += c.after; both++; }
    });
    document.getElementById('skills-total').textContent = both
      ? 'Across the ' + both + ' skills rated both times: average ' + (b / both).toFixed(1) + ' before → ' + (a / both).toFixed(1) + ' after.'
      : 'Rate each skill in the Before column now; come back for the After column at the end.';
  }
  skillsBody.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-skill]');
    if (!btn) return;
    var i = btn.dataset.skill, col = btn.dataset.col, n = Number(btn.dataset.level);
    var c = state.skills[i] = state.skills[i] || {};
    if (c[col] === n) delete c[col]; else c[col] = n;
    renderSkills(); save();
  });

  // ── Download / print / clear ──────────────────────────────────────────
  function asText() {
    var b = BRIEFS.filter(function (x) { return x.id === state.brief; })[0];
    var L = [];
    L.push('ELECTRONICS CAPSTONE NOTEBOOK');
    L.push('Name(s): ' + (state.names || ''));
    L.push('Brief: ' + (b ? b.title : '(not chosen)'));
    L.push('Saved: ' + new Date().toLocaleString());
    L.push('');
    PHASES.forEach(function (p, i) {
      L.push('== ' + (i + 1) + '. ' + p.title.toUpperCase() + ' ==');
      p.items.forEach(function (item, j) { L.push((state.checks[i + '-' + j] ? '[x] ' : '[ ] ') + item); });
      L.push('Notes:');
      L.push(state.notes[i] || '(none)');
      L.push('');
    });
    L.push('== POWER BUDGET (' + SUPPLIES[state.supply].name + ') ==');
    state.budget.forEach(function (r) { L.push('- ' + r.name + ': ' + r.ma + ' mA x ' + r.qty + ' at ' + r.duty + '%'); });
    L.push('Peak: ' + document.getElementById('budget-peak').textContent + '  Average: ' + document.getElementById('budget-avg').textContent + '  Battery life: ' + document.getElementById('budget-life').textContent);
    L.push('');
    L.push('== PREDICTED VS MEASURED ==');
    state.predictions.forEach(function (r) {
      if (!r.what && !r.pred && !r.meas) return;
      var p = num(r.pred), m = num(r.meas);
      L.push('- ' + r.what + ': predicted ' + r.pred + ', measured ' + r.meas + (p ? ' (' + ((m - p) / Math.abs(p) * 100).toFixed(1) + '%)' : ''));
    });
    L.push('');
    L.push('== RUBRIC SELF-SCORE ==');
    RUBRIC.forEach(function (row, i) { L.push('- ' + row[0] + ': ' + (state.rubric[i] || '-')); });
    L.push('');
    L.push('== SKILLS CHECK (before -> after) ==');
    SKILLS.forEach(function (sk, i) { var c = state.skills[i] || {}; L.push('- ' + sk[0] + ': ' + (c.before || '-') + ' -> ' + (c.after || '-')); });
    return L.join('\n');
  }
  document.getElementById('nb-download').addEventListener('click', function () {
    var blob = new Blob([asText()], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'capstone-notebook' + (state.names ? '-' + state.names.replace(/[^a-z0-9]+/gi, '-').toLowerCase() : '') + '.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  document.getElementById('nb-print').addEventListener('click', function () { window.print(); });
  document.getElementById('nb-clear').addEventListener('click', function () {
    if (!window.confirm('Erase the whole notebook in this browser? Download a copy first if you need it.')) return;
    state = blank();
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    names.value = '';
    renderAll();
    savedNote.textContent = 'Notebook cleared.';
  });

  function renderAll() { renderBriefs(); renderPhases(); renderBudget(); renderPredictions(); renderRubric(); renderSkills(); }
  renderAll();
  window.Capstone = { state: function () { return state; }, asText: asText };
})();
