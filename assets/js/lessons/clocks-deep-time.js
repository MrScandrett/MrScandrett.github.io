(() => {
  const span = document.getElementById('ct-deep-span');
  const event = document.getElementById('ct-deep-event');
  const result = document.getElementById('ct-deep-result');
  const marker = document.getElementById('ct-deep-marker');
  const format = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });
  function update() {
    const windowYears = Number(span.value);
    const ago = Number(event.value);
    document.getElementById('ct-deep-start').textContent = `${format.format(windowYears)} years ago`;
    marker.hidden = ago > windowYears;
    if (marker.hidden) {
      result.textContent = `${event.selectedOptions[0].textContent} is outside this window. Choose a wider window to place it on the line.`;
      return;
    }
    const secondsBeforeEnd = ago / windowYears * 86400;
    const elapsed = 86400 - secondsBeforeEnd;
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor(elapsed % 3600 / 60);
    const seconds = elapsed % 60;
    const clock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${seconds.toFixed(3).padStart(6, '0')}`;
    marker.style.left = `${elapsed / 86400 * 100}%`;
    result.textContent = `${event.selectedOptions[0].textContent}: model clock ${clock}; ${format.format(secondsBeforeEnd)} model seconds before today. This is ${format.format(ago / windowYears * 100)}% of the selected window before its end. Times are rounded.`;
  }
  span.addEventListener('change', update);
  event.addEventListener('change', update);
  update();
  const answers = [1000, 172800, 12];
  const explanations = ['1,000,000,000 ÷ 1,000,000 = 1,000.', '2 × 24 × 60 × 60 = 172,800 seconds.', '1,000,000 ÷ 86,400 ≈ 11.57 days, which rounds to 12.'];
  const form = document.getElementById('ct-deep-challenges');
  form.addEventListener('submit', e => {
    e.preventDefault();
    form.querySelectorAll('[data-deep-check]').forEach(button => button.click());
  });
  form.querySelectorAll('[data-deep-check]').forEach(button => {
    button.addEventListener('click', () => {
      const n = Number(button.dataset.deepCheck);
      const raw = document.getElementById(`ct-deep-answer-${n}`).value.trim().replaceAll(',', '');
      const correct = raw !== '' && Number(raw) === answers[n - 1];
      document.getElementById(`ct-deep-feedback-${n}`).textContent = correct ? `Correct! ${explanations[n - 1]}` : `Try again. ${explanations[n - 1]}`;
    });
  });
  form.addEventListener('reset', () => form.querySelectorAll('output').forEach(output => { output.textContent = ''; }));
})();
