/* Original listening studies, deliberately separate from published composer scores. */
(function () {
  'use strict';
  var main = document.querySelector('[data-composer-idea]');
  if (!main) return;
  var play = document.getElementById('study-play');
  var status = document.getElementById('study-status');
  var timer;
  function stop() {
    clearTimeout(timer);
    window.AudioKit.stopAll();
    play.disabled = false;
    status.textContent = 'Stopped. Choose either version to compare again.';
  }
  document.getElementById('study-stop').addEventListener('click', stop);
  document.getElementById('study-version').addEventListener('change', stop);
  window.addEventListener('pagehide', stop);
  play.addEventListener('click', async function () {
    stop();
    try {
      await window.AudioKit.resume();
      var b = document.getElementById('study-version').value === 'b';
      var slug = main.dataset.composerIdea;
      var notes = [60, 64, 67, 65, 64, 62, 60, 60];
      var step = slug === 'liszt' && b ? 0.65 : 0.35;
      var duration = slug === 'schumann' && b ? 0.1 : step * 0.88;
      var ctx = window.AudioKit.context();
      // Oscillator voices give a quick, deterministic comparison without network samples.
      function note(midi, delay, length, type, gain) {
        var osc = ctx.createOscillator();
        var amp = ctx.createGain();
        var at = ctx.currentTime + 0.03 + delay;
        osc.type = type;
        osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
        amp.gain.setValueAtTime(0, at);
        amp.gain.linearRampToValueAtTime(gain, at + 0.015);
        amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
        osc.connect(amp); amp.connect(window.AudioKit.output());
        osc.start(at); osc.stop(at + length + 0.02);
        var remove = window.AudioKit.onStop(function () { try { osc.stop(); } catch (_) {} });
        osc.onended = function () { osc.disconnect(); amp.disconnect(); if (typeof remove === 'function') remove(); };
      }
      if (slug === 'scriabin') {
        (b ? [48, 54, 58, 64, 69, 74] : [48, 64, 67]).forEach(function (midi) { note(midi, 0, 2.8, 'sine', 0.09); });
      } else {
        if (slug === 'brahms' && b) notes = [60, 64, 67, 65, 64, 65, 62, 60];
        notes.forEach(function (midi, i) {
          note(midi + 12, i * step, duration, slug === 'ravel' && b ? 'triangle' : 'sine', 0.15);
          if (b && slug === 'rachmaninoff') note([48, 55, 60, 64][i % 4], i * step, step * 1.5, 'sine', 0.07);
          if (b && slug === 'schubert') note(48, i * step, 0.16, 'triangle', 0.07);
        });
      }
      play.disabled = true;
      status.textContent = 'Playing version ' + (b ? 'B' : 'A') + ' — listen for the feature described above.';
      timer = setTimeout(function () { play.disabled = false; status.textContent = 'Finished. Compare with the other version.'; }, (slug === 'scriabin' ? 3 : notes.length * step + 0.5) * 1000);
    } catch (error) {
      play.disabled = false;
      status.textContent = 'Sound could not start. Press Play to try again.';
      console.error(error);
    }
  });
})();
