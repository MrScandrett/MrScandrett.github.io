(function () {
  'use strict';

  document.getElementById('fl-hints-toggle')?.addEventListener('change', function (e) {
    document.body.classList.toggle('fl-show-hints', e.target.checked);
  });

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
  };

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
  };
})();
