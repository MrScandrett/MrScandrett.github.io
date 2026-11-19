(function () {
  const timer = document.getElementById('classroom-timer');
  if (!timer) return;

  const digits = timer.querySelector('#timer-digits');
  const activity = timer.querySelector('#timer-activity');
  const status = timer.querySelector('#timer-status');
  const arc = timer.querySelector('#timer-arc');
  const start = timer.querySelector('#timer-start');
  const startLabel = timer.querySelector('#timer-start-label');
  const pause = timer.querySelector('#timer-pause');
  const reset = timer.querySelector('#timer-reset');
  const custom = timer.querySelector('#timer-custom');
  const set = custom.querySelector('#timer-set');
  const minutes = timer.querySelector('#tcm');
  const seconds = timer.querySelector('#tcs');
  const presets = timer.querySelectorAll('.timer-preset-btn');

  let duration = 300000;
  let remaining = duration;
  let deadline = 0;
  let timeout;
  let audio;

  function render() {
    const wholeSeconds = Math.ceil(remaining / 1000);
    const formatted = Math.floor(wholeSeconds / 60) + ':' + String(wholeSeconds % 60).padStart(2, '0');
    if (digits.textContent !== formatted) digits.textContent = formatted;
    arc.style.strokeDashoffset = 100 * (1 - remaining / duration);

    const state = timer.dataset.state;
    let urgency = '';
    let message;
    switch (state) {
      case 'running':
        urgency = wholeSeconds <= 15 ? 'danger' : wholeSeconds <= 60 ? 'warning' : '';
        message = { danger: 'Final seconds', warning: 'Last minute', '': 'Running' }[urgency];
        break;
      case 'paused': message = 'Paused'; break;
      case 'done': message = 'Time’s up'; break;
      default: message = 'Ready';
    }
    if (timer.dataset.urgency !== urgency) timer.dataset.urgency = urgency;
    if (status.textContent !== message) status.textContent = message;
  }

  function setState(state) {
    timer.dataset.state = state;
    start.disabled = state === 'running';
    pause.disabled = state !== 'running';
    startLabel.textContent = state === 'paused' ? 'Resume' : state === 'done' ? 'Start again' : 'Start';
    render();
  }

  function beep() {
    if (!audio || audio.state !== 'running') return;
    [880, 1100, 1320].forEach(function (frequency, index) {
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      const begin = audio.currentTime + index * 0.22;
      const end = begin + (index === 2 ? 0.38 : 0.18);
      tone.connect(gain);
      gain.connect(audio.destination);
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(0.28, begin);
      gain.gain.exponentialRampToValueAtTime(0.001, end);
      tone.start(begin);
      tone.stop(end + 0.05);
    });
  }

  function tick() {
    clearTimeout(timeout);
    remaining = Math.max(0, deadline - Date.now());
    if (!remaining) {
      const restoreFocus = document.activeElement === pause;
      setState('done');
      if (restoreFocus) start.focus({ preventScroll: true });
      beep();
      return;
    }
    render();
    timeout = setTimeout(tick, remaining % 1000 || 1000);
  }

  function resetTimer() {
    clearTimeout(timeout);
    remaining = duration;
    setState('ready');
  }

  function setTimer(totalSeconds, label, selectedPreset) {
    duration = totalSeconds * 1000;
    activity.textContent = label;
    minutes.value = Math.floor(totalSeconds / 60);
    seconds.value = totalSeconds % 60;
    presets.forEach(button => button.setAttribute('aria-pressed', button === selectedPreset));
    resetTimer();
  }

  start.addEventListener('click', function () {
    // Unlock the chime while the Start or Resume gesture is still active.
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (Audio) {
        audio ||= new Audio();
        audio.resume().catch(() => {});
      }
    } catch {
      // The timer can still finish visibly if sound is unavailable.
    }

    const moveFocus = document.activeElement === start;
    if (!remaining) remaining = duration;
    deadline = Date.now() + remaining;
    setState('running');
    tick();
    if (moveFocus && !pause.disabled) pause.focus({ preventScroll: true });
  });

  pause.addEventListener('click', function () {
    const moveFocus = document.activeElement === pause;
    tick();
    if (!remaining) return;
    clearTimeout(timeout);
    setState('paused');
    if (moveFocus) start.focus({ preventScroll: true });
  });

  reset.addEventListener('click', resetTimer);
  custom.addEventListener('submit', function (event) {
    event.preventDefault();
    const m = Math.max(0, Math.min(99, parseInt(minutes.value, 10) || 0));
    const s = Math.max(0, Math.min(59, parseInt(seconds.value, 10) || 0));
    setTimer(Math.max(1, m * 60 + s), 'Custom Timer');
  });
  set.disabled = false;
  presets.forEach(button => {
    button.addEventListener('click', () => setTimer(Number(button.dataset.s), button.dataset.lbl, button));
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && timer.dataset.state === 'running') tick();
  });

  function syncReducedMotion() {
    try {
      timer.toggleAttribute('data-reduced-motion', localStorage.getItem('classroomos-reduced-motion') === 'on');
    } catch {
      // The CSS media query still reflects the system preference.
    }
  }
  window.addEventListener('classroomos:reducedmotionchange', syncReducedMotion);
  window.addEventListener('storage', event => {
    if (event.key === 'classroomos-reduced-motion') syncReducedMotion();
  });
  syncReducedMotion();
  render();
})();
