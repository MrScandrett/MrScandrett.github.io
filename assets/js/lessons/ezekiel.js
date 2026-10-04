(() => {
  'use strict';
  const form = document.getElementById('ez-evidence-form');
  if (!form) return;
  const categories = ['Observation', 'Passage’s explanation', 'Later interpretation'];
  const claims = [
    ['Bodies have formed, but they have no breath.', 0, '37:8 describes what Ezekiel sees before the breath enters.'],
    ['The bones represent the whole house of Israel.', 1, '37:11 explicitly identifies the bones and names the people’s lost hope.'],
    ['This vision foreshadows resurrection.', 2, 'Jewish and Christian commentators have made this connection. Distinguish it from the explanation about Israel in 37:11–14.'],
    ['God promises to settle the people in their land and give them his spirit.', 1, '37:14 explains the restoration promised to the people.']
  ];
  const host = document.getElementById('ez-evidence-items');
  claims.forEach(([claim], i) => {
    const field = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = `${i + 1}. ${claim}`;
    field.append(legend);
    categories.forEach((category, n) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio'; input.name = `evidence-${i}`; input.value = n; input.required = true;
      label.append(input, document.createTextNode(` ${category}`)); field.append(label);
    });
    const feedback = document.createElement('p');
    feedback.className = 'ez-item-feedback'; feedback.hidden = true;
    field.append(feedback); host.append(field);
  });
  const status = document.getElementById('ez-evidence-status');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const answers = new FormData(form); let score = 0;
    claims.forEach(([, answer, explanation], i) => {
      const correct = Number(answers.get(`evidence-${i}`)) === answer;
      if (correct) score++;
      const feedback = host.children[i].querySelector('p'); feedback.hidden = false;
      feedback.textContent = `${correct ? 'Correct' : 'Revisit'} · ${categories[answer]}. ${explanation}`;
    });
    status.textContent = `${score} of ${claims.length} matched. Read each explanation, then revise any answer you want to reconsider.`;
  });
  form.addEventListener('reset', () => {
    host.querySelectorAll('.ez-item-feedback').forEach(p => { p.hidden = true; p.textContent = ''; });
    status.textContent = 'Choose a category for each claim. You can revise and check again.';
  });
})();
