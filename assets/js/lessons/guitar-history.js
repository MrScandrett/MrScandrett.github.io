/* guitar-history.js — "Hear the guitar grow" demo for the guitar's history section.
   Strums the open strings each era had: the four-course guitar's spacing (the
   top four strings, D–G–B–E), the Baroque five-course (A added below), and the
   six-string guitar (low E added). Uses GuitarAudio's plucked-string synth. */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var GT = window.GuitarTheory, GA = window.GuitarAudio;
  var status = document.getElementById('gtrHistoryStatus');
  var buttons = document.querySelectorAll('[data-gtr-grow]');
  if (!GT || !GA || !buttons.length) return;

  var NAMES = ['E', 'A', 'D', 'G', 'B', 'E'];
  var ERAS = {
    4: 'Four courses (1500s): ',
    5: 'Five courses (1600s): ',
    6: 'Six strings (c. 1800 → today): '
  };

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var count = Number(btn.dataset.gtrGrow);
      var strings = [0, 1, 2, 3, 4, 5].slice(6 - count); // low-to-high string indices
      GA.stop();
      GA.strum(strings.map(function (i) { return GT.noteFreq(i, 0); }), { spread: 0.045, duration: 2.4 });
      if (status) status.textContent = ERAS[count] + strings.map(function (i) { return NAMES[i]; }).join('–') + '. Early guitars were often tuned higher or with mixed octaves; the spacing between strings is what carried over.';
    });
  });
});
