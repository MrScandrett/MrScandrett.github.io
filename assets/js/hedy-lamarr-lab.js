(function () {
  'use strict';
  const strategy = document.getElementById('hl-strategy');
  if (!strategy) return;
  const noise = document.getElementById('hl-noise');
  const timing = document.getElementById('hl-timing');
  const step = document.getElementById('hl-step');
  const status = document.getElementById('hl-lab-status');
  const log = document.getElementById('hl-log');
  const pattern = [3, 5, 2, 4, 1, 3, 5, 2];
  let turn = 0;
  let received = 0;

  function reset() {
    turn = 0;
    received = 0;
    log.replaceChildren();
    step.disabled = false;
    status.textContent = 'Ready. Predict how many of eight pieces will arrive, then send the first piece.';
  }

  step.addEventListener('click', function () {
    if (turn >= pattern.length) return;
    const hopping = strategy.value === 'hop';
    const sender = hopping ? pattern[turn] : 3;
    const receiver = hopping ? pattern[(turn + (timing.value === 'late' ? 7 : 0)) % 8] : 3;
    const blocked = sender === Number(noise.value);
    const matched = sender === receiver;
    const success = matched && !blocked;
    if (success) received++;
    turn++;
    const result = success ? 'Received' : blocked && !matched ? 'Missed: noise and different channels' : blocked ? 'Missed: noisy channel' : 'Missed: different channels';
    const row = document.createElement('tr');
    [turn, sender, receiver, result].forEach(function (value) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    log.appendChild(row);
    status.textContent = 'Turn ' + turn + ' of 8. Sender: channel ' + sender + '; receiver: channel ' + receiver + '. ' + result + '. Received ' + received + ' of ' + turn + ' pieces.' + (turn === 8 ? ' Trial complete. Record your evidence, then change one setting or start over.' : '');
    step.disabled = turn === 8;
  });
  [strategy, noise, timing].forEach(function (control) { control.addEventListener('change', reset); });
  document.getElementById('hl-reset').addEventListener('click', reset);
})();
