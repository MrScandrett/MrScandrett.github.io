/* expert-game.js — Robot Repair Clinic game layer
   Works standalone; does not import expert-system-lab.js              */
(function () {
  'use strict';

  /* ─── Mini forward-chaining rule engine ─────────────────────────── */
  const RULES = [
    // Low battery
    { conds: ['battery_low'],                              fault: 'low_battery',        cf: 0.82 },
    { conds: ['power_led_blinking', 'motor_stuttering'],   fault: 'low_battery',        cf: 0.65 },
    { conds: ['power_led_blinking'],                       fault: 'low_battery',        cf: 0.45 },
    { conds: ['motor_stuttering', 'wheels_slipping'],      fault: 'low_battery',        cf: 0.48 },
    // Loose connection
    { conds: ['power_led_off', 'motor_not_spinning'],      fault: 'loose_connection',   cf: 0.78 },
    { conds: ['sensor_no_signal', 'power_led_off'],        fault: 'loose_connection',   cf: 0.72 },
    { conds: ['motor_not_spinning'],                       fault: 'loose_connection',   cf: 0.38 },
    { conds: ['power_led_off'],                            fault: 'loose_connection',   cf: 0.42 },
    // Motor driver fault
    { conds: ['motor_stuttering', 'overheating'],          fault: 'motor_driver_fault', cf: 0.88 },
    { conds: ['motor_not_spinning', 'overheating'],        fault: 'motor_driver_fault', cf: 0.72 },
    { conds: ['servo_jitter', 'overheating'],              fault: 'motor_driver_fault', cf: 0.68 },
    { conds: ['motor_stuttering'],                         fault: 'motor_driver_fault', cf: 0.40 },
    // Calibration needed
    { conds: ['distance_sensor_erratic', 'line_sensor_inconsistent'], fault: 'calibration_needed', cf: 0.88 },
    { conds: ['distance_sensor_erratic'],                  fault: 'calibration_needed', cf: 0.58 },
    { conds: ['line_sensor_inconsistent'],                 fault: 'calibration_needed', cf: 0.52 },
    // Safety stop (overheating)
    { conds: ['overheating'],                              fault: 'safety_stop',        cf: 0.92 },
    { conds: ['motor_not_spinning', 'overheating'],        fault: 'safety_stop',        cf: 0.82 },
  ];

  function runEngine(revealed) {
    const scores = {};
    for (const rule of RULES) {
      if (rule.conds.every(c => revealed.includes(c))) {
        const prev = scores[rule.fault] || 0;
        // MYCIN combination: P(A∨B) = P(A) + P(B)·(1−P(A))
        scores[rule.fault] = prev + rule.cf * (1 - prev);
      }
    }
    return Object.entries(scores)
      .map(([fault, cf]) => ({ fault, cf }))
      .sort((a, b) => b.cf - a.cf);
  }

  /* ─── Fault display metadata ──────────────────────────────────────── */
  const FAULT_META = {
    low_battery:        { label: '🔋 Low Battery',          color: '#f59e0b' },
    loose_connection:   { label: '🔌 Loose Connection',     color: '#6366f1' },
    motor_driver_fault: { label: '⚙️ Motor Driver Fault',   color: '#ef4444' },
    calibration_needed: { label: '📐 Calibration Needed',   color: '#3b82f6' },
    safety_stop:        { label: '🔥 Overheating — Stop!',  color: '#dc2626' },
  };

  const FAULT_KEYS = Object.keys(FAULT_META);

  /* ─── Symptom display labels ────────────────────────────────────── */
  const SYMPTOM_LABELS = {
    battery_low:                { icon: '🔋', text: 'Battery seems low' },
    power_led_blinking:         { icon: '💡', text: 'Power LED is blinking' },
    power_led_off:              { icon: '🔴', text: 'Power LED is off' },
    motor_stuttering:           { icon: '🤖', text: 'Motor is stuttering' },
    motor_not_spinning:         { icon: '⚙️', text: 'Motor not spinning' },
    wheels_slipping:            { icon: '🛞', text: 'Wheels are slipping' },
    servo_jitter:               { icon: '💪', text: 'Servo is jittering' },
    sensor_no_signal:           { icon: '📡', text: 'Sensor has no signal' },
    distance_sensor_erratic:    { icon: '📶', text: 'Distance sensor is erratic' },
    line_sensor_inconsistent:   { icon: '〰️', text: 'Line sensor is inconsistent' },
    overheating:                { icon: '🔥', text: 'Robot is overheating' },
    bluetooth_wont_pair:        { icon: '🔵', text: 'Bluetooth won\'t pair' },
  };

  /* ─── Scenarios ────────────────────────────────────────────────────
     Each area's symptoms list may contain red herrings.
     trueFault is the correct diagnosis key.                           */
  const SCENARIOS = [
    {
      id:          'flat-freddie',
      name:        'Flat Freddie',
      emoji:       '🤖',
      flavour:     'Freddie keeps slowing to a crawl and stops mid-route. The power indicator is flashing rapidly and he barely makes it a metre before giving up.',
      trueFault:   'low_battery',
      areas: [
        { key: 'power',   label: '🔋 Power System',  symptoms: ['battery_low', 'power_led_blinking'] },
        { key: 'motors',  label: '⚙️ Motors',         symptoms: ['motor_stuttering'] },
        { key: 'sensors', label: '📡 Sensors',         symptoms: [] },
        { key: 'wiring',  label: '🔌 Wiring',          symptoms: ['bluetooth_wont_pair'] }, // red herring
      ],
      revealNote: 'A blinking LED and slowed motors are classic signs the battery can\'t sustain load.',
    },
    {
      id:          'silent-sam',
      name:        'Silent Sam',
      emoji:       '🤖',
      flavour:     'Sam is completely dead on arrival. No lights, no motors, no sound — nothing works. It was fine yesterday.',
      trueFault:   'loose_connection',
      areas: [
        { key: 'power',   label: '🔋 Power System',  symptoms: ['power_led_off'] },
        { key: 'motors',  label: '⚙️ Motors',         symptoms: ['motor_not_spinning'] },
        { key: 'sensors', label: '📡 Sensors',         symptoms: ['sensor_no_signal'] },
        { key: 'wiring',  label: '🔌 Wiring',          symptoms: ['power_led_off', 'motor_not_spinning'] },
      ],
      revealNote: 'Multiple systems dead at once — power, motors, sensors — points to a shared path: the wiring.',
    },
    {
      id:          'jittery-jerry',
      name:        'Jittery Jerry',
      emoji:       '🤖',
      flavour:     'Jerry vibrates violently when moving and gets burning hot within seconds of running. He also stops randomly mid-task.',
      trueFault:   'motor_driver_fault',
      areas: [
        { key: 'power',   label: '🔋 Power System',  symptoms: ['power_led_blinking'] }, // red herring → suggests battery but it's actually the driver drawing too much power
        { key: 'motors',  label: '⚙️ Motors',         symptoms: ['motor_stuttering', 'overheating'] },
        { key: 'sensors', label: '📡 Sensors',         symptoms: ['servo_jitter'] },
        { key: 'wiring',  label: '🔌 Wiring',          symptoms: [] },
      ],
      revealNote: 'Stuttering + heat together are the motor driver\'s signature. The blinking LED is a red herring — it\'s the driver drawing excess current.',
    },
    {
      id:          'wobbly-wendy',
      name:        'Wobbly Wendy',
      emoji:       '🤖',
      flavour:     'Wendy can\'t follow a line and keeps crashing into walls even though her obstacle sensors should be working. Her driving itself seems fine.',
      trueFault:   'calibration_needed',
      areas: [
        { key: 'power',   label: '🔋 Power System',  symptoms: [] },
        { key: 'motors',  label: '⚙️ Motors',         symptoms: ['wheels_slipping'] }, // red herring
        { key: 'sensors', label: '📡 Sensors',         symptoms: ['distance_sensor_erratic', 'line_sensor_inconsistent'] },
        { key: 'wiring',  label: '🔌 Wiring',          symptoms: [] },
      ],
      revealNote: 'Erratic and inconsistent sensor readings almost always mean miscalibration, not hardware failure.',
    },
    {
      id:          'hot-harold',
      name:        'Hot Harold',
      emoji:       '🤖',
      flavour:     'Harold smells like burning plastic and shut himself off. Parts of the chassis are painful to touch. He needs immediate attention.',
      trueFault:   'safety_stop',
      areas: [
        { key: 'power',   label: '🔋 Power System',  symptoms: ['battery_low'] }, // red herring — battery drained by heat event
        { key: 'motors',  label: '⚙️ Motors',         symptoms: ['motor_not_spinning', 'overheating'] },
        { key: 'sensors', label: '📡 Sensors',         symptoms: [] },
        { key: 'wiring',  label: '🔌 Wiring',          symptoms: ['overheating'] },
      ],
      revealNote: 'Overheating anywhere means safety stop first. The low battery is a consequence, not the cause — heat events drain cells fast.',
    },
  ];

  /* ─── Game state ───────────────────────────────────────────────── */
  let state = {
    scenarioIndex:  0,
    inspectionsLeft: 4,
    revealed:       [],        // symptom keys revealed so far
    inspectedAreas: new Set(), // area keys already clicked
    diagnosed:      false,
    totalScore:     0,
    roundScores:    [],
  };

  /* ─── DOM refs (populated on init) ─────────────────────────────── */
  let elRound, elScore, elInspLeft, elPatientName, elPatientFlavour,
      elAreaBtns, elRevealedList, elAnalysis, elDiagBtns,
      elResultBanner, elNextBtn, elFinalScreen, elFinalScore, elPlayAgain;

  /* ─── Init ─────────────────────────────────────────────────────── */
  function init() {
    elRound          = document.getElementById('eg-round');
    elScore          = document.getElementById('eg-score');
    elInspLeft       = document.getElementById('eg-insp-left');
    elPatientName    = document.getElementById('eg-patient-name');
    elPatientFlavour = document.getElementById('eg-patient-flavour');
    elAreaBtns       = document.getElementById('eg-area-btns');
    elRevealedList   = document.getElementById('eg-revealed');
    elAnalysis       = document.getElementById('eg-analysis');
    elDiagBtns       = document.getElementById('eg-diag-btns');
    elResultBanner   = document.getElementById('eg-result');
    elNextBtn        = document.getElementById('eg-next');
    elFinalScreen    = document.getElementById('eg-final');
    elFinalScore     = document.getElementById('eg-final-score');
    elPlayAgain      = document.getElementById('eg-play-again');

    if (!elRound) return; // game section not in DOM

    elNextBtn.addEventListener('click', nextRound);
    elPlayAgain.addEventListener('click', resetGame);

    resetGame();
  }

  function resetGame() {
    state = {
      scenarioIndex:   0,
      inspectionsLeft: 4,
      revealed:        [],
      inspectedAreas:  new Set(),
      diagnosed:        false,
      totalScore:       0,
      roundScores:      [],
    };
    elFinalScreen.hidden = true;
    loadScenario();
  }

  /* ─── Load a scenario ──────────────────────────────────────────── */
  function loadScenario() {
    const sc = SCENARIOS[state.scenarioIndex];
    state.revealed        = [];
    state.inspectedAreas  = new Set();
    state.diagnosed       = false;
    state.inspectionsLeft = 4;

    elRound.textContent     = `Round ${state.scenarioIndex + 1} / ${SCENARIOS.length}`;
    elScore.textContent     = `Score: ${state.totalScore}`;
    elInspLeft.textContent  = `${state.inspectionsLeft} inspect${state.inspectionsLeft !== 1 ? 's' : ''} left`;
    elPatientName.textContent   = `${sc.emoji} ${sc.name}`;
    elPatientFlavour.textContent = sc.flavour;

    // Area buttons
    elAreaBtns.innerHTML = '';
    sc.areas.forEach(area => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'eg-area-btn';
      btn.dataset.areaKey = area.key;
      btn.textContent = area.label;
      btn.addEventListener('click', () => inspectArea(area));
      elAreaBtns.appendChild(btn);
    });

    // Revealed list
    elRevealedList.innerHTML = '<li class="eg-no-clues">No clues yet — inspect an area above.</li>';

    // Analysis
    elAnalysis.innerHTML = '<p class="eg-analysis-empty">Inspect the robot to gather evidence. The AI will update here.</p>';

    // Diagnosis buttons
    renderDiagButtons(false);

    // Result banner
    elResultBanner.hidden = true;
    elResultBanner.innerHTML = '';

    // Next button
    elNextBtn.hidden = true;
  }

  /* ─── Inspect an area ──────────────────────────────────────────── */
  function inspectArea(area) {
    if (state.diagnosed) return;
    if (state.inspectedAreas.has(area.key)) return;
    if (state.inspectionsLeft <= 0) return;

    state.inspectedAreas.add(area.key);
    state.inspectionsLeft--;

    // Reveal new symptoms (dedup)
    area.symptoms.forEach(s => {
      if (!state.revealed.includes(s)) state.revealed.push(s);
    });

    // Disable that area button
    const btn = elAreaBtns.querySelector(`[data-area-key="${area.key}"]`);
    if (btn) { btn.disabled = true; btn.classList.add('is-used'); }

    // Update inspect count
    elInspLeft.textContent = `${state.inspectionsLeft} inspect${state.inspectionsLeft !== 1 ? 's' : ''} left`;

    // If no symptoms found in this area
    if (area.symptoms.length === 0) {
      addRevealedItem(null, area.label);
    } else {
      area.symptoms.forEach(s => addRevealedItem(s));
    }

    // Run engine and update analysis
    updateAnalysis();

    // Enable diagnosis once any symptom is found
    renderDiagButtons(state.revealed.length > 0);
  }

  function addRevealedItem(symptomKey, areaLabel) {
    // Remove the "no clues" placeholder
    const placeholder = elRevealedList.querySelector('.eg-no-clues');
    if (placeholder) placeholder.remove();

    const li = document.createElement('li');
    if (symptomKey) {
      const meta = SYMPTOM_LABELS[symptomKey] || { icon: '•', text: symptomKey };
      li.className = 'eg-clue';
      li.innerHTML = `<span class="eg-clue-icon">${meta.icon}</span>${meta.text}`;
    } else {
      li.className = 'eg-clue eg-clue-empty';
      li.innerHTML = `<span class="eg-clue-icon">🔍</span>Nothing unusual in <em>${areaLabel}</em>`;
    }
    elRevealedList.appendChild(li);
  }

  /* ─── Update AI analysis panel ─────────────────────────────────── */
  function updateAnalysis() {
    const results = runEngine(state.revealed);

    if (results.length === 0) {
      elAnalysis.innerHTML = '<p class="eg-analysis-empty">The engine hasn\'t fired any rules yet — gather more evidence.</p>';
      return;
    }

    const topResults = results.slice(0, 4);
    elAnalysis.innerHTML = topResults.map(({ fault, cf }) => {
      const meta  = FAULT_META[fault] || { label: fault, color: '#888' };
      const pct   = Math.round(cf * 100);
      const width = Math.max(pct, 4);
      return `
        <div class="eg-bar-row">
          <span class="eg-bar-label">${meta.label}</span>
          <div class="eg-bar-track">
            <div class="eg-bar-fill" style="width:${width}%;background:${meta.color}" aria-valuenow="${pct}" role="progressbar" aria-label="${meta.label} confidence"></div>
          </div>
          <span class="eg-bar-pct">${pct}%</span>
        </div>`;
    }).join('');
  }

  /* ─── Diagnosis buttons ─────────────────────────────────────────── */
  function renderDiagButtons(enabled) {
    elDiagBtns.innerHTML = '';
    FAULT_KEYS.forEach(faultKey => {
      const meta = FAULT_META[faultKey];
      const btn  = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'eg-diag-btn';
      btn.textContent = meta.label;
      btn.disabled  = !enabled;
      btn.addEventListener('click', () => diagnose(faultKey));
      elDiagBtns.appendChild(btn);
    });
  }

  /* ─── Make a diagnosis ──────────────────────────────────────────── */
  function diagnose(chosenFault) {
    if (state.diagnosed) return;
    state.diagnosed = true;

    const sc       = SCENARIOS[state.scenarioIndex];
    const correct  = chosenFault === sc.trueFault;
    const inspUsed = 4 - state.inspectionsLeft;

    // Score: 100 if correct, stars based on inspections used
    let pts   = correct ? 100 : 0;
    let stars = 0;
    if (correct) {
      if (inspUsed <= 1) stars = 3;
      else if (inspUsed <= 2) stars = 2;
      else stars = 1;
    }
    state.totalScore += pts;
    state.roundScores.push({ pts, stars, correct });

    elScore.textContent = `Score: ${state.totalScore}`;

    // Highlight chosen diagnosis button
    elDiagBtns.querySelectorAll('.eg-diag-btn').forEach(btn => {
      btn.disabled = true;
      if (btn.textContent === FAULT_META[chosenFault]?.label) {
        btn.classList.add(correct ? 'is-correct' : 'is-wrong');
      }
      if (!correct && btn.textContent === FAULT_META[sc.trueFault]?.label) {
        btn.classList.add('is-answer');
      }
    });

    // Result banner
    const starsStr = '⭐'.repeat(stars);
    const aiResults = runEngine(state.revealed);
    const aiTop     = aiResults[0]?.fault;
    const engineAgreed = aiTop === sc.trueFault;

    elResultBanner.hidden = false;
    elResultBanner.className = `eg-result-banner ${correct ? 'is-correct' : 'is-wrong'}`;
    elResultBanner.innerHTML = `
      <div class="eg-result-top">
        <span class="eg-result-icon">${correct ? '✓' : '✗'}</span>
        <div>
          <strong>${correct ? `Correct! ${starsStr}` : 'Not quite.'}</strong>
          <p>${correct
            ? `+${pts} points. ${inspUsed <= 1 ? 'Ace diagnosis — minimal evidence needed!' : inspUsed <= 2 ? 'Solid reasoning.' : 'Got there in the end.'}`
            : `The fault was <strong>${FAULT_META[sc.trueFault]?.label}</strong>.`
          }</p>
        </div>
      </div>
      <p class="eg-result-note">${sc.revealNote}</p>
      ${engineAgreed ? `<p class="eg-engine-agreed">🤖 The rule engine's top result agreed with the answer.</p>` : ''}
    `;

    // Next / finish
    elNextBtn.hidden = false;
    if (state.scenarioIndex >= SCENARIOS.length - 1) {
      elNextBtn.textContent = 'See Final Score →';
    } else {
      elNextBtn.textContent = `Next Patient →`;
    }
  }

  /* ─── Advance round ─────────────────────────────────────────────── */
  function nextRound() {
    state.scenarioIndex++;
    if (state.scenarioIndex >= SCENARIOS.length) {
      showFinalScreen();
    } else {
      loadScenario();
    }
  }

  /* ─── Final screen ──────────────────────────────────────────────── */
  function showFinalScreen() {
    elFinalScreen.hidden = false;
    elFinalScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const correct = state.roundScores.filter(r => r.correct).length;
    const perfect = state.roundScores.filter(r => r.stars === 3).length;

    let title, note;
    if (correct === 5 && perfect >= 3) {
      title = '🏆 Expert Diagnostician!';
      note  = 'You diagnosed every robot correctly and used minimal evidence. You think like the MYCIN engineers did — efficient, rule-driven, traceable.';
    } else if (correct >= 4) {
      title = '🥇 Senior Technician';
      note  = 'Strong work. One misdiagnosis is common even for experienced engineers — the red herrings are there to remind you that symptoms can mislead.';
    } else if (correct >= 3) {
      title = '🔧 Junior Technician';
      note  = 'You diagnosed most of the robots. Review the failed cases — which symptoms pointed you the wrong way?';
    } else {
      title = '📚 Keep Practising';
      note  = 'Rule-based reasoning takes time to learn. Try again and pay close attention to which symptoms the engine weighs most heavily.';
    }

    elFinalScore.innerHTML = `
      <div class="eg-final-title">${title}</div>
      <div class="eg-final-pts">${state.totalScore} / 500 pts</div>
      <div class="eg-final-breakdown">
        ${state.roundScores.map((r, i) => `
          <div class="eg-final-row">
            <span>${SCENARIOS[i].emoji} ${SCENARIOS[i].name}</span>
            <span>${r.correct ? '⭐'.repeat(r.stars) || '✓' : '✗ Misdiagnosed'}</span>
            <span>${r.pts} pts</span>
          </div>`).join('')}
      </div>
      <p class="eg-final-note">${note}</p>
    `;
  }

  /* ─── Boot ──────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', init);
})();
