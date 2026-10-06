/* piano-history.js — "Hear the problem" demo for the piano's history section.
   Plays one phrase two ways: plucked at a single loudness (a harpsichord can't
   shape one note louder than the next), then struck with a crescendo through
   PianoAudio (Cristofori's "piano e forte"). */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var PT = window.PianoTheory, PA = window.PianoAudio;
  var pluckBtn = document.getElementById('pnoHearPluck');
  var forteBtn = document.getElementById('pnoHearPianoForte');
  var status = document.getElementById('pnoHistoryStatus');
  if (!PT || !PA || !pluckBtn || !forteBtn) return;

  // C–E–G–C–G–E–C, as semitones above middle C (the keyboard's absIndex 0).
  var PHRASE = [0, 4, 7, 12, 7, 4, 0];
  var STEP = 0.32;

  function volume() {
    var slider = document.getElementById('pcVolume');
    return slider ? Number(slider.value) / 100 : 0.75;
  }

  /* A quill pluck: a bright sawtooth whose filter closes fast, at one fixed
     level no matter which note it is. */
  function pluck(freq, delay) {
    var ctx = PA.getContext();
    if (!ctx) return;
    var t = ctx.currentTime + delay;
    var osc = ctx.createOscillator();
    var filter = ctx.createBiquadFilter();
    var gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 9, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 2, t + 0.5);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.13 * volume(), t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.95);
  }

  pluckBtn.addEventListener('click', function () {
    PA.stop();
    PHRASE.forEach(function (n, i) { pluck(PT.noteFreq(n), i * STEP); });
    status.textContent = 'Plucked: every note comes out at the same loudness, however you press the key.';
  });

  forteBtn.addEventListener('click', function () {
    PA.stop();
    var last = PHRASE.length - 1;
    PHRASE.forEach(function (n, i) {
      PA.tone(PT.noteFreq(n), { delay: i * STEP, duration: 1.6, gain: 0.04 + 0.36 * (i / last) });
    });
    status.textContent = 'Struck soft → loud: each key is pressed a little harder than the one before. That is “piano e forte.”';
  });
});
