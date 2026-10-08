(() => {
  'use strict';
  const root = document.querySelector('[data-prophet]');
  if (!root) return;
  const d = window.MajorProphets[root.dataset.prophet];
  const $ = id => document.getElementById(id);
  const visited = new Set();
  const key = 'classroomos:prophet:' + d.slug;
  const button = (label, action) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', action); return b; };
  d.choices.forEach((c, i) => {
    const b = button(c, () => {
      $('prediction-options').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      $('prediction-feedback').textContent = (i === d.answer ? 'Your prediction matches the passage. ' : 'Compare your prediction with the passage. ') + d.feedback;
    });
    b.setAttribute('aria-pressed', 'false'); $('prediction-options').append(b);
  });
  function step(i) {
    $('sequence').querySelectorAll('button').forEach((b, n) => b.setAttribute('aria-pressed', String(n === i)));
    $('step-detail').textContent = d.steps[i][1] + ' Read ' + d.name + ' ' + d.steps[i][2] + '.';
  }
  d.steps.forEach((s, i) => $('sequence').append(button((i + 1) + ' · ' + s[0], () => step(i))));
  step(0);
  $('reset-investigation').addEventListener('click', () => {
    $('prediction-options').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false'));
    $('prediction-feedback').textContent = 'Choose a prediction, then compare it with the passage.'; step(0);
  });
  function open(i, mark = true) {
    const r = d.route[i]; if (mark) visited.add(i);
    $('route-range').textContent = d.name + ' ' + r[0] + ' · Focus: ' + r[2];
    $('route-heading').textContent = r[1]; $('route-summary').textContent = r[3]; $('route-question').textContent = r[4];
    // First focus passage; a chapter range ("36–37") opens at its first chapter.
    $('route-read').href = '../../bible.html#/go/' + encodeURIComponent(d.name + ' ' + r[2].split(';')[0].trim().replace(/^(\d+)[–-]\d+$/, '$1'));
    $('route-progress').textContent = visited.size + ' of ' + d.route.length + ' sections explored.';
    $('route-buttons').querySelectorAll('button').forEach((b, n) => b.setAttribute('aria-pressed', String(n === i)));
  }
  d.route.forEach((r, i) => $('route-buttons').append(button(r[0] + ' · ' + r[1], () => open(i)))); open(0, false);
  d.quiz.forEach((q, i) => {
    const field = document.createElement('fieldset'); const legend = document.createElement('legend'); legend.textContent = q[0]; field.append(legend);
    q[1].forEach((a, n) => { const label = document.createElement('label'); const input = document.createElement('input'); input.type = 'radio'; input.name = 'q' + i; input.value = n; input.required = true; label.append(input, document.createTextNode(' ' + a)); field.append(label); });
    $('quiz-questions').append(field);
  });
  $('prophet-check').addEventListener('submit', e => {
    e.preventDefault(); const answers = new FormData(e.target); let score = 0;
    const explanations = d.quiz.map((q, i) => { const right = Number(answers.get('q' + i)) === q[2]; if (right) score++; return 'Question ' + (i + 1) + ': ' + (right ? 'Correct. ' : 'Review. ') + q[3]; });
    $('quiz-feedback').textContent = score + ' of ' + d.quiz.length + ' correct. ' + explanations.join(' ');
  });
  try { $('prophet-notes').value = localStorage.getItem(key) || ''; } catch (_) { $('notes-status').textContent = 'Storage unavailable; copy your notes before leaving.'; }
  function save() { try { localStorage.setItem(key, $('prophet-notes').value); $('notes-status').textContent = 'Notes saved in this browser.'; } catch (_) { $('notes-status').textContent = 'Storage unavailable; copy your notes before leaving.'; } }
  $('prophet-notes').addEventListener('input', save);
  $('clear-notes').addEventListener('click', () => { $('prophet-notes').value = ''; save(); });
})();
