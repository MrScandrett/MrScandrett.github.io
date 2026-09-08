(() => {
  'use strict';
  const choices = document.querySelectorAll('[data-repair]');
  if (choices.length) {
    const demo = document.querySelector('[data-repaired-button]');
    const output = document.querySelector('[data-repaired-output]');
    const feedback = document.querySelector('[data-repair-feedback]');
    choices.forEach(button => button.addEventListener('click', () => {
      const correct = button.dataset.repair === 'selector';
      demo.disabled = !correct;
      choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
      feedback.textContent = correct ? 'Repaired: #show-projects now matches the button ID. Test the button below.' : 'That does not make the selector match an element. Compare both strings, including the final s.';
      output.textContent = correct ? 'The event listener can now attach. Press Show projects.' : 'The demo cannot run until its selector is repaired.';
    }));
    demo.addEventListener('click', () => { output.textContent = 'Three projects ready.'; });
    document.querySelector('[data-repair-reset]').addEventListener('click', () => {
      demo.disabled = true;
      choices.forEach(choice => choice.setAttribute('aria-pressed', 'false'));
      feedback.textContent = 'Choose an edit and explain what it changes.';
      output.textContent = 'The demo cannot run until its selector is repaired.';
    });
  }
  const select = document.querySelector('#studio-choice');
  if (select) select.addEventListener('change', () => {
    let count = 0;
    document.querySelectorAll('[data-studio-card]').forEach(card => {
      card.hidden = select.value !== 'all' && card.dataset.studioCard !== select.value;
      if (!card.hidden) count += 1;
    });
    document.querySelector('#studio-status').textContent = `${count} ${count === 1 ? 'studio' : 'studios'} shown. All studio guides remain below.`;
  });
})();
