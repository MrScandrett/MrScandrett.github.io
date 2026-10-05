/* Visual estimate → reveal → explain, using the lesson's shared artwork. */
(() => {
  'use strict';
  const host = document.getElementById('ml-visual-quiz');
  if (!host || !window.LessonFigures) return;
  const rounds = [
    ['Adult human', 'human', 1.7, 'Height', 'A person is metre-sized.'],
    ['Honeybee', 'honeybee', 0.013, 'Body length', 'Centimetres are hundredths of a metre.'],
    ['Blue whale', 'blue-whale', 30, 'Body length', 'Tens of metres: one band above a person.'],
    ['Hydrogen atom', 'hydrogen-atom', 1.06e-10, 'Approximate diameter', 'An atom is about a tenth of a nanometre across.'],
    ['DNA helix', 'dna', 2e-9, 'Width, not total length', 'Two nanometres wide; its uncoiled length is a different measurement.'],
    ['Earth', 'earth', 1.274e7, 'Diameter', 'About 12,740 kilometres. Convert kilometres to metres before choosing.'],
    ['The Sun', 'sun', 1.39e9, 'Diameter', 'About 109 Earth diameters fit across the Sun.'],
    ['Eiffel Tower', 'eiffel-tower', 330, 'Height including antenna', 'Hundreds of metres, rather than thousands.'],
    ['Proton', 'proton', 1.7e-15, 'Approximate diameter', 'A femtometre is one quadrillionth of a metre.'],
    ['Milky Way', 'milky-way', 9.46e20, 'Approximate stellar disk diameter', 'About 100,000 light-years; this drawing is an illustration.']
  ];
  let index = 0, score = 0, answered = false;
  const power = n => `10<sup>${n}</sup>`;
  host.innerHTML = '<p id="ml-vq-progress"></p><div class="ml-vq-grid"><div class="ml-vq-picture" id="ml-vq-picture" aria-hidden="true"></div><div><h3 id="ml-vq-name"></h3><p id="ml-vq-dimension"></p><p>Which metre band contains this length?</p><div class="ml-vq-options" id="ml-vq-options"></div></div></div><div id="ml-vq-feedback" role="status" aria-live="polite"></div><div id="ml-vq-reveal" hidden></div><div class="ml-vq-actions"><button type="button" class="ml-check-btn" id="ml-vq-next" hidden>Next picture</button><button type="button" class="ml-check-btn" id="ml-vq-reset">Restart quiz</button></div>';
  const el = id => document.getElementById('ml-vq-' + id);
  function render() {
    answered = false;
    const [name, fig, metres, dimension] = rounds[index];
    const exponent = Math.floor(Math.log10(metres));
    el('progress').textContent = `Picture ${index + 1} of ${rounds.length} · ${score} correct first estimates`;
    el('picture').innerHTML = LessonFigures.markup(fig, { accent: '#2563eb' });
    el('name').textContent = name;
    el('dimension').textContent = dimension;
    el('feedback').textContent = '';
    el('reveal').hidden = true;
    el('next').hidden = true;
    el('options').replaceChildren();
    // Different correct positions, with neighbouring powers as distractors.
    const start = exponent - [1, 3, 0, 2][index % 4];
    for (let n = start; n < start + 4; n++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ml-vq-option';
      button.innerHTML = `${power(n)} ≤ length &lt; ${power(n + 1)} m`;
      button.addEventListener('click', () => reveal(n));
      el('options').append(button);
    }
  }
  function reveal(guess) {
    if (answered) return;
    answered = true;
    const [name, , metres, , explanation] = rounds[index];
    const exponent = Math.floor(Math.log10(metres));
    const correct = guess === exponent;
    if (correct) score++;
    el('feedback').textContent = correct ? 'Correct estimate!' : `Your estimate was ${Math.abs(guess - exponent)} decade band${Math.abs(guess - exponent) === 1 ? '' : 's'} ${guess > exponent ? 'too large' : 'too small'}.`;
    el('options').querySelectorAll('button').forEach(button => { button.disabled = true; });
    el('progress').textContent = `Picture ${index + 1} of ${rounds.length} · ${score} correct first estimates`;
    const mantissa = metres / 10 ** exponent;
    el('reveal').hidden = false;
    el('reveal').innerHTML = `<p><strong>${name}: ${Number(mantissa.toPrecision(4))} × ${power(exponent)} m.</strong> ${explanation}</p><p>Count three ×10 steps: the last tick is 1,000 times the first.</p><div class="ml-vq-ladder">${[exponent - 1, exponent, exponent + 1, exponent + 2].map(n => `<span class="${n === exponent ? 'is-answer' : ''}">${power(n)} m${n === exponent ? '<br>this band' : ''}</span>`).join('')}</div><p>${power(exponent)} ≤ ${Number(mantissa.toPrecision(4))} × ${power(exponent)} &lt; ${power(exponent + 1)}. The coefficient lies between 1 and 10.</p>`;
    el('next').hidden = false;
    el('next').textContent = index === rounds.length - 1 ? 'See result' : 'Next picture';
  }
  el('next').addEventListener('click', () => {
    if (index < rounds.length - 1) { index++; render(); el('options').querySelector('button').focus(); }
    else { el('feedback').textContent = `Quiz complete: ${score} of ${rounds.length} first estimates correct. Explore these scales above, then try again.`; el('next').hidden = true; el('reset').focus(); }
  });
  el('reset').addEventListener('click', () => { index = 0; score = 0; render(); el('options').querySelector('button').focus(); });
  render();
})();
