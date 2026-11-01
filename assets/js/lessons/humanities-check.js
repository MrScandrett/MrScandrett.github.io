(function () {
  'use strict';
  document.querySelectorAll('form.lesson-check').forEach(function (form) {
    var summary = form.querySelector('[data-check-summary]');
    var groups = Array.from(form.querySelectorAll('fieldset[data-answer]'));
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var correct = 0, answered = 0;
      groups.forEach(function (group) {
        var selected = group.querySelector('input:checked');
        var feedback = group.querySelector('[data-check-feedback]');
        if (!selected) {
          feedback.textContent = 'Choose an answer, then check again.';
          return;
        }
        answered++;
        var right = selected.value === group.dataset.answer;
        if (right) correct++;
        feedback.textContent = (right ? 'Correct. ' : 'Reconsider. ') + group.dataset.explanation;
      });
      summary.textContent = correct + ' of ' + groups.length + ' correct. ' +
        (answered < groups.length ? (groups.length - answered) + ' unanswered. ' : '') +
        'Read the explanations and try again.';
    });
    form.addEventListener('reset', function () {
      summary.textContent = '';
      form.querySelectorAll('[data-check-feedback]').forEach(function (el) { el.textContent = ''; });
    });
  });
}());
