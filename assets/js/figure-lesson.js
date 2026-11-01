(function () {
  'use strict';

  document.getElementById('fl-hints-toggle')?.addEventListener('change', function (e) {
    document.body.classList.toggle('fl-show-hints', e.target.checked);
  });

  function updateScore() {
    var problems = document.querySelectorAll('.fl-problem');
    if (!problems.length) return;
    var ok = document.querySelectorAll('.fl-feedback.ok').length;
    var scoreEl = document.getElementById('fl-score') || document.getElementById('piv-practice-score');
    var fillEl = document.getElementById('fl-score-fill') || document.getElementById('piv-practice-fill');
    if (scoreEl) scoreEl.textContent = ok + ' / ' + problems.length;
    if (fillEl) fillEl.style.width = Math.round((ok / problems.length) * 100) + '%';
  }

  window.flCheck = function (n, correct, tol) {
    var val = parseFloat(document.getElementById('flans-' + n).value);
    var fb = document.getElementById('flfb-' + n);
    var hint = document.getElementById('flhint-' + n);
    if (isNaN(val)) { fb.textContent = 'Enter a number.'; fb.className = 'fl-feedback err'; return; }
    if (Math.abs(val - correct) <= tol) {
      fb.textContent = '✓ Correct!'; fb.className = 'fl-feedback ok';
      window.LessonContent?.toast('✓ Correct!');
    } else {
      fb.textContent = '✗ Try again.'; fb.className = 'fl-feedback err';
      if (hint) hint.style.display = 'block';
      window.LessonContent?.toast('Not quite — check the hint below.');
    }
    updateScore();
  };

  window.flCheckNum = window.flCheck;

  window.flCheckText = function (n, correct) {
    var el = document.getElementById('flans-' + n);
    var val = el.value.toString().toLowerCase().trim();
    var fb = document.getElementById('flfb-' + n);
    var hint = document.getElementById('flhint-' + n);
    if (val === correct.toLowerCase()) {
      fb.textContent = '✓ Correct!'; fb.className = 'fl-feedback ok';
      window.LessonContent?.toast('✓ Correct!');
    } else {
      fb.textContent = '✗ Try again.'; fb.className = 'fl-feedback err';
      if (hint) hint.style.display = 'block';
      window.LessonContent?.toast('Not quite — check the hint below.');
    }
    updateScore();
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target && e.target.matches && e.target.matches('.fl-ans-input')) {
      var row = e.target.closest('.fl-problem-row');
      if (row) {
        var btn = row.querySelector('.fl-check-btn');
        if (btn) {
          e.preventDefault();
          btn.click();
        }
      }
    }
  });
})();
