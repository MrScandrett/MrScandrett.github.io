(function () {
  'use strict';

  var lockVisual = document.getElementById('lock-visual');
  var lockStep = document.getElementById('lock-step');
  var lockInstruction = document.getElementById('lock-instruction');
  var lockFeedback = document.getElementById('lock-feedback');
  var lockMeterFill = document.getElementById('lock-meter-fill');
  var lockMeterLabel = document.getElementById('lock-meter-label');
  var lockButtons = Array.prototype.slice.call(document.querySelectorAll('[data-lock-action]'));
  var lockViewButtons = Array.prototype.slice.call(document.querySelectorAll('[data-lock-view-button]'));
  var lockReset = document.getElementById('lock-reset');

  var sequence = [
    { action: 'lower', instruction: 'Open the lower gate so the ship can enter.', feedback: 'The lower gate opens because the chamber and Atlantic approach are at the same level.' },
    { action: 'ship', instruction: 'Move the ship into the low chamber.', feedback: 'The ship enters. It cannot rise safely until the chamber is sealed.' },
    { action: 'lower', instruction: 'Close the lower gate behind the ship.', feedback: 'The chamber is sealed from the low side.' },
    { action: 'valves', instruction: 'Open the fill valves to admit water from above.', feedback: 'Gravity sends lake water through culverts. The ship rises with the chamber water.' },
    { action: 'upper', instruction: 'Open the upper gate now that the levels match.', feedback: 'With equal water levels, the pressure difference across the upper gate is small.' },
    { action: 'ship', instruction: 'Move the ship into Gatun Lake.', feedback: 'Lockage complete: the ship is now about 26 meters above sea level.' }
  ];
  var lockIndex = 0;

  function lockActionButton(name) {
    return document.querySelector('[data-lock-action="' + name + '"]');
  }

  function updateLockGuide() {
    if (lockIndex >= sequence.length) {
      lockStep.textContent = 'Transit complete';
      lockInstruction.textContent = 'The ship has reached Gatun Lake.';
      lockFeedback.className = 'lock-feedback is-success';
      lockButtons.forEach(function (button) { button.disabled = true; });
      return;
    }
    lockStep.textContent = 'Step ' + (lockIndex + 1) + ' of ' + sequence.length;
    lockInstruction.textContent = sequence[lockIndex].instruction;
  }

  function performLockAction(action) {
    showLockView('model');
    var expected = sequence[lockIndex];
    if (!expected || action !== expected.action) {
      var reason = 'That move would not be safe yet. ';
      if (action === 'upper' && lockVisual.dataset.water !== 'high') reason += 'The high-side gate still has unequal water pressure across it.';
      else if (action === 'valves' && lockVisual.dataset.ship !== 'chamber') reason += 'First move the ship in and seal the chamber.';
      else reason += 'Follow the chamber status and complete the highlighted instruction.';
      lockFeedback.textContent = reason;
      lockFeedback.className = 'lock-feedback is-error';
      return;
    }

    if (lockIndex === 0) {
      lockVisual.dataset.lower = 'open';
      lockActionButton('lower').dataset.state = 'open';
    } else if (lockIndex === 1) {
      lockVisual.dataset.ship = 'chamber';
    } else if (lockIndex === 2) {
      lockVisual.dataset.lower = 'closed';
      lockActionButton('lower').dataset.state = 'closed';
    } else if (lockIndex === 3) {
      lockVisual.dataset.water = 'high';
      lockMeterFill.style.width = '100%';
      lockMeterLabel.textContent = '26 m';
    } else if (lockIndex === 4) {
      lockVisual.dataset.upper = 'open';
      lockActionButton('upper').dataset.state = 'open';
    } else if (lockIndex === 5) {
      lockVisual.dataset.ship = 'lake';
    }

    lockFeedback.textContent = expected.feedback;
    lockFeedback.className = lockIndex === sequence.length - 1 ? 'lock-feedback is-success' : 'lock-feedback';
    lockIndex += 1;
    updateLockGuide();
  }

  lockButtons.forEach(function (button) {
    button.addEventListener('click', function () { performLockAction(button.dataset.lockAction); });
  });

  function showLockView(view) {
    lockVisual.dataset.view = view;
    lockViewButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.lockViewButton === view));
    });
  }

  lockViewButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      showLockView(button.dataset.lockViewButton);
      if (button.dataset.lockViewButton === 'plan') {
        lockFeedback.textContent = 'Archive view: trace the large culvert through the center wall, then find the smaller floor openings that spread water through the chamber.';
      } else if (button.dataset.lockViewButton === 'photo') {
        lockFeedback.textContent = 'Archive view: use the workers as a scale reference for the gate leaves and concrete chamber.';
      } else {
        lockFeedback.textContent = lockIndex ? 'Working model restored. Continue the current lock sequence.' : 'The chamber is low and empty. Which barrier should move first?';
      }
      lockFeedback.className = 'lock-feedback';
    });
  });

  lockReset.addEventListener('click', function () {
    lockIndex = 0;
    lockVisual.dataset.water = 'low';
    lockVisual.dataset.ship = 'approach';
    lockVisual.dataset.lower = 'closed';
    lockVisual.dataset.upper = 'closed';
    showLockView('model');
    lockMeterFill.style.width = '0%';
    lockMeterLabel.textContent = '0 m';
    lockButtons.forEach(function (button) { button.disabled = false; delete button.dataset.state; });
    lockFeedback.textContent = 'The chamber is low and empty. Which barrier should move first?';
    lockFeedback.className = 'lock-feedback';
    updateLockGuide();
  });

  var interventionButtons = Array.prototype.slice.call(document.querySelectorAll('[data-intervention]'));
  var correctInterventions = ['drain', 'screen', 'larvicide', 'quarantine'];
  var riskValue = document.getElementById('risk-value');
  var riskBar = document.getElementById('risk-bar');
  var riskMessage = document.getElementById('risk-message');
  var transmissionModel = document.getElementById('transmission-model');
  var sanitationEvidence = document.getElementById('sanitation-evidence');

  interventionButtons.forEach(function (button) {
    if (correctInterventions.indexOf(button.dataset.intervention) === -1) button.dataset.kind = 'wrong';
    button.addEventListener('click', function () {
      var pressed = button.getAttribute('aria-pressed') === 'true';
      button.setAttribute('aria-pressed', String(!pressed));
      updateRisk();
    });
  });

  function updateRisk() {
    var selected = interventionButtons.filter(function (button) { return button.getAttribute('aria-pressed') === 'true'; });
    var correctCount = selected.filter(function (button) { return correctInterventions.indexOf(button.dataset.intervention) !== -1; }).length;
    var wrong = selected.filter(function (button) { return correctInterventions.indexOf(button.dataset.intervention) === -1; });
    var risk = Math.max(12, 100 - correctCount * 22);
    riskValue.textContent = risk + '%';
    riskBar.style.width = risk + '%';
    riskBar.style.background = risk <= 20 ? '#65dc8e' : risk <= 56 ? '#f3c45e' : '#c83d2e';

    if (correctCount === 0 && wrong.length === 0) {
      riskMessage.textContent = 'Select an intervention, then explain which link it changes.';
      transmissionModel.removeAttribute('data-break');
    } else if (wrong.length) {
      riskMessage.textContent = 'Smell and excavation speed do not change the mosquito transmission mechanism. Keep testing the links in the chain.';
    } else if (correctCount === 4) {
      riskMessage.textContent = 'Strong layered control: fewer mosquitoes develop, fewer enter buildings, and fewer reach infected patients. No single measure had to work alone.';
    } else {
      riskMessage.textContent = correctCount + ' useful measure' + (correctCount === 1 ? '' : 's') + ' selected. Add layers that reduce breeding or block bites.';
    }

    var hasBreedControl = ['drain', 'larvicide'].some(function (name) {
      return document.querySelector('[data-intervention="' + name + '"]').getAttribute('aria-pressed') === 'true';
    });
    var hasBiteControl = ['screen', 'quarantine'].some(function (name) {
      return document.querySelector('[data-intervention="' + name + '"]').getAttribute('aria-pressed') === 'true';
    });
    var larvicideSelected = document.querySelector('[data-intervention="larvicide"]').getAttribute('aria-pressed') === 'true';
    sanitationEvidence.classList.toggle('is-matched', larvicideSelected);
    if (hasBreedControl) transmissionModel.dataset.break = 'breed';
    else if (hasBiteControl) transmissionModel.dataset.break = 'bite';
    else transmissionModel.removeAttribute('data-break');
  }

  var claimButtons = Array.prototype.slice.call(document.querySelectorAll('[data-claim]'));
  var claimFeedback = document.getElementById('claim-feedback');
  claimButtons.forEach(function (button) {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', function () {
      claimButtons.forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); });
      if (button.dataset.claim === 'b') {
        claimFeedback.textContent = 'Yes. This keeps both useful numbers, attributes each source, and makes the disagreement visible.';
        claimFeedback.className = 'claim-feedback good';
      } else if (button.dataset.claim === 'a') {
        claimFeedback.textContent = 'Try again. The estimate needs attribution because another official source publishes a different count.';
        claimFeedback.className = 'claim-feedback try';
      } else {
        claimFeedback.textContent = 'Try again. Imperfect records can still support careful claims when we name their limits.';
        claimFeedback.className = 'claim-feedback try';
      }
    });
  });

  var exitForm = document.getElementById('exit-form');
  var exitFeedback = document.getElementById('exit-feedback');
  exitForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var data = new FormData(exitForm);
    var score = 0;
    if (data.get('q1') === 'b') score += 1;
    if (data.get('q2') === 'a') score += 1;
    if (data.get('q3') === 'b') score += 1;
    var reflection = document.getElementById('exit-reflection').value.trim();
    if (score === 3 && reflection.length >= 40) {
      exitFeedback.textContent = '3/3 checks correct, and your systems claim is ready to discuss.';
      exitFeedback.className = 'exit-feedback good';
    } else if (score === 3) {
      exitFeedback.textContent = '3/3 checks correct. Add a specific piece of evidence to complete the written claim.';
      exitFeedback.className = 'exit-feedback try';
    } else {
      exitFeedback.textContent = score + '/3 checks correct. Revisit the lock principle, transmission chain, or number boundary, then try again.';
      exitFeedback.className = 'exit-feedback try';
    }
  });
})();
