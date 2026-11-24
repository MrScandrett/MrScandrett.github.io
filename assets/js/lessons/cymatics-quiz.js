/* Cymatics lesson quiz handlers & experiment notes persistence */
(function () {
  'use strict';

  var NOTES_KEY = 'steam_cymatics_exp_notes_v1';

  function checkProblem(btn) {
    var n = btn.dataset.cyProblem;
    var fb = document.getElementById('cyfb-' + n);
    var hint = document.getElementById('cyhint-' + n);
    var input = document.getElementById('cyans-' + n);
    if (!fb || !input) return;

    if (btn.dataset.cyAns !== undefined) {
      var val = parseFloat(input.value);
      var ans = parseFloat(btn.dataset.cyAns);
      var tol = parseFloat(btn.dataset.cyTol || '0.01');
      if (isNaN(val)) {
        fb.textContent = 'Enter a number.';
        fb.className = 'cy-feedback err';
        return;
      }
      if (Math.abs(val - ans) <= tol) {
        fb.textContent = '✓ Correct!';
        fb.className = 'cy-feedback ok';
        if (hint) hint.style.display = 'none';
      } else {
        fb.textContent = '✗ Try again.';
        fb.className = 'cy-feedback err';
        if (hint) hint.style.display = 'block';
      }
      return;
    }

    if (btn.dataset.cyText !== undefined) {
      if (input.value === btn.dataset.cyText) {
        fb.textContent = '✓ Correct!';
        fb.className = 'cy-feedback ok';
        if (hint) hint.style.display = 'none';
      } else {
        fb.textContent = '✗ Try again.';
        fb.className = 'cy-feedback err';
        if (hint) hint.style.display = 'block';
      }
    }
  }

  document.querySelectorAll('.cy-check-btn[data-cy-problem]').forEach(function (btn) {
    btn.addEventListener('click', function () { checkProblem(btn); });
    var n = btn.dataset.cyProblem;
    var input = document.getElementById('cyans-' + n);
    if (input && input.tagName === 'INPUT') {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          checkProblem(btn);
        }
      });
    }
  });

  // Persist Experiment 1-7 reflection notes locally
  var areas = Array.prototype.slice.call(document.querySelectorAll('.cy-exp textarea'));
  if (areas.length) {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); } catch (e) {}
    areas.forEach(function (ta, idx) {
      var k = 'exp_' + (idx + 1);
      if (typeof saved[k] === 'string') ta.value = saved[k];
      ta.addEventListener('input', function () {
        saved[k] = ta.value;
        try { localStorage.setItem(NOTES_KEY, JSON.stringify(saved)); } catch (e) {}
      });
    });
  }
})();
