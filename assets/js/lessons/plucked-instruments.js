(() => {
  'use strict';

  const studio = document.querySelector('[data-plucked-studio]');
  const ukulele = studio.dataset.pluckedStudio === 'ukulele';
  const board = studio.querySelector('[data-board]');
  const status = studio.querySelector('[data-status]');
  const exercise = studio.querySelector('[data-exercise]');
  const path = studio.querySelector('[data-sequence]');
  const listen = studio.querySelector('[data-listen]');
  const stop = studio.querySelector('[data-stop]');
  const tempo = studio.querySelector('[data-tempo]');
  const practice = studio.querySelector('[data-practice]');
  const frets = [0, 0, 0, 0];
  const tuning = [67, 60, 64, 69];
  const shapes = { C: [0, 0, 0, 3], F: [2, 0, 1, 0], G7: [0, 2, 1, 2], Am: [2, 0, 0, 0] };
  const scale = [60, 62, 64, 65, 67, 69, 71, 72];
  const exercises = ukulele ? [
    ['C', 'F', 'G7', 'C'],
    ['C', 'Am', 'F', 'G7', 'C']
  ] : [
    [0, 1, 2, 3, 4, 5, 6, 7],
    [7, 6, 5, 4, 3, 2, 1, 0],
    [2, 3, 4, 2, 2, 1, 0, 0]
  ];
  const noteName = midi => ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][midi % 12] + (Math.floor(midi / 12) - 1);
  const noteLabel = degree => degree === 7 ? '1′' : String(degree + 1);
  let step = 0;
  let timer;
  let playing = false;

  function button(label, description, action) {
    const control = document.createElement('button');
    control.type = 'button';
    control.textContent = label;
    control.setAttribute('aria-label', description);
    control.addEventListener('click', action);
    return control;
  }

  function pulseKey(el) {
    if (!el) return;
    el.classList.remove('is-plucked');
    void el.offsetWidth;
    el.classList.add('is-plucked');
    clearTimeout(el._pluckTimer);
    el._pluckTimer = setTimeout(() => el.classList.remove('is-plucked'), 180);
  }

  function playNote(midi) {
    AudioKit.note({ midi, instrument: ukulele ? 'pluck' : 'ePiano', duration: .55, velocity: .55 });
  }

  function playStrum() {
    for (let string = 0; string < tuning.length; string++) {
      pulseKey(board.querySelector(`[data-string="${string}"][data-fret="${frets[string]}"]`));
    }
    AudioKit.chord({
      midi: tuning.map((midi, string) => midi + frets[string]),
      instrument: 'pluck', spread: .032, duration: .65, velocity: .42
    });
  }

  function showFrets() {
    for (const key of board.querySelectorAll('[data-fret]')) {
      key.setAttribute('aria-pressed', String(frets[key.dataset.string] === Number(key.dataset.fret)));
    }
  }

  function loadShape(shape) {
    frets.splice(0, frets.length, ...shape);
    showFrets();
  }

  function label(item) {
    return ukulele ? item : `${noteLabel(item)} (${noteName(scale[item])})`;
  }

  function sequence() {
    return exercises[Number(exercise.value)];
  }

  function showStep(index, message) {
    for (const [position, item] of [...path.children].entries()) {
      if (position === index) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    }
    status.textContent = message;
  }

  function promptStep() {
    const item = sequence()[step];
    showStep(step, ukulele ? `Shape ${item} and strum. Fret numbers: ${shapes[item].join('–')}.` : `Play ${label(item)}.`);
  }

  function resetPractice() {
    step = 0;
    path.replaceChildren(...sequence().map(item => {
      const token = document.createElement('li');
      token.textContent = label(item);
      return token;
    }));
    promptStep();
  }

  function checkStep(correct) {
    if (practice.hidden) return;
    if (step === sequence().length) resetPractice();
    if (!correct(sequence()[step])) {
      status.textContent = `Try ${label(sequence()[step])} again. The current step is outlined above.`;
      return;
    }
    step++;
    if (step === sequence().length) showStep(-1, 'Phrase complete. Start again or choose another exercise.');
    else promptStep();
  }

  function clearDemo() {
    clearTimeout(timer);
    playing = false;
    listen.disabled = false;
    stop.disabled = true;
    board.querySelector('[data-demo]')?.removeAttribute('data-demo');
  }

  function stopDemo() {
    if (!playing) return;
    clearDemo();
    AudioKit.stopAll();
    resetPractice();
  }

  if (ukulele) {
    for (const [string, midi] of tuning.entries()) {
      const row = document.createElement('div');
      row.className = 'plucked-string';
      const name = document.createElement('span');
      name.textContent = noteName(midi);
      row.append(name);
      for (let fret = 0; fret <= 4; fret++) {
        const key = button(fret === 0 ? 'Open' : String(fret), `${noteName(midi)} string, ${fret === 0 ? 'open' : 'fret ' + fret}, ${noteName(midi + fret)}`, () => {
          stopDemo();
          frets[string] = fret;
          showFrets();
          pulseKey(key);
          playNote(midi + fret);
          if (practice.hidden) status.textContent = `${noteName(midi + fret)} · ${fret === 0 ? 'Open string' : 'Fret ' + fret}`;
        });
        key.dataset.string = string;
        key.dataset.fret = fret;
        row.append(key);
      }
      board.append(row);
    }
    for (const preset of studio.querySelectorAll('[data-shape]')) {
      preset.addEventListener('click', () => {
        stopDemo();
        const chord = preset.dataset.shape;
        loadShape(shapes[chord]);
        if (practice.hidden) status.textContent = `${chord} · ${frets.join('–')} in G–C–E–A order`;
      });
    }
    studio.querySelector('[data-strum]').addEventListener('click', () => {
      stopDemo();
      playStrum();
      checkStep(chord => shapes[chord].every((fret, string) => frets[string] === fret));
      if (practice.hidden) status.textContent = `Strummed ${tuning.map((midi, string) => noteName(midi + frets[string])).join(' · ')}`;
    });
    showFrets();
  } else {
    for (const degree of [7, 5, 3, 1, 0, 2, 4, 6]) {
      const key = button(label(degree), `Tine ${label(degree)}`, () => {
        stopDemo();
        pulseKey(key);
        playNote(scale[degree]);
        checkStep(target => target === degree);
        if (practice.hidden) status.textContent = `${noteName(scale[degree])} · Tine ${noteLabel(degree)}`;
      });
      key.dataset.tine = degree;
      key.style.setProperty('--tine-height', `${9.1 - .55 * degree}rem`);
      board.append(key);
    }
  }

  for (const mode of studio.querySelectorAll('[data-mode]')) {
    mode.addEventListener('click', () => {
      stopDemo();
      practice.hidden = mode.dataset.mode !== 'practice';
      for (const option of studio.querySelectorAll('[data-mode]')) {
        option.setAttribute('aria-pressed', String(option === mode));
      }
      if (practice.hidden) status.textContent = studio.dataset.ready;
      else resetPractice();
    });
  }

  exercise.addEventListener('change', () => {
    stopDemo();
    resetPractice();
  });

  listen.addEventListener('click', () => {
    const items = sequence();
    const beatLength = 60000 / Number(tempo.value);
    const beatsPerItem = ukulele ? 4 : 1;
    let beat = 0;
    AudioKit.context();
    playing = true;
    listen.disabled = true;
    stop.disabled = false;

    function tick() {
      if (beat === items.length * beatsPerItem) {
        clearDemo();
        resetPractice();
        return;
      }
      const index = Math.floor(beat / beatsPerItem);
      const item = items[index];
      if (ukulele) {
        loadShape(shapes[item]);
        playStrum();
      } else {
        board.querySelector('[data-demo]')?.removeAttribute('data-demo');
        const key = board.querySelector(`[data-tine="${item}"]`);
        key.setAttribute('data-demo', '');
        key.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        playNote(scale[item]);
      }
      showStep(index, ukulele ? `${item} · Beat ${beat % beatsPerItem + 1} of 4` : `Listen for ${label(item)}.`);
      beat++;
      timer = setTimeout(tick, beatLength);
    }

    tick();
  });

  stop.addEventListener('click', stopDemo);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopDemo();
  });
})();
