/* Original listening studies, deliberately separate from published composer scores. */
(function () {
  'use strict';
  var main = document.querySelector('[data-composer-idea]');
  if (!main) return;
  var play = document.getElementById('study-play');
  var status = document.getElementById('study-status');
  var timer, stopping = false;
  function stopLocal() {
    clearTimeout(timer);
    play.disabled = false;
    status.textContent = 'Stopped. Choose either version to compare again.';
  }
  function stop() {
    stopLocal();
    if (!stopping && window.AudioKit && window.AudioKit.stopAll) {
      stopping = true;
      try { window.AudioKit.stopAll(); } finally { stopping = false; }
    }
  }
  if (window.AudioKit && window.AudioKit.onStop) {
    window.AudioKit.onStop(function () { if (!stopping) stopLocal(); });
  }
  document.getElementById('study-stop').addEventListener('click', stop);
  document.getElementById('study-version').addEventListener('change', stop);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
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
      } else if (slug === 'pachelbel') {
        // A: the tune once. B: the same tune over a repeating eight-note ground bass.
        notes = [62, 66, 69, 66, 67, 66, 64, 62];
        notes.forEach(function (midi, i) { note(midi + 12, i * step, duration, 'sine', 0.15); });
        if (b) [38, 33, 35, 30, 31, 26, 31, 33].forEach(function (midi, i) { note(midi + 12, i * step, step * 0.95, 'triangle', 0.09); });
      } else if (slug === 'handel') {
        // A: four voices sing the tune together in block chords. B: the tune passes up through the voices, lowest first.
        step = 0.4; notes = [74, 76, 78, 79, 81, 79, 78, 76];
        if (b) {
          // Bass, tenor, alto (a fifth lower, as a fugue's answer) and soprano enter half a tune apart.
          [-24, -12, -5, 0].forEach(function (shift, v) {
            notes.forEach(function (midi, i) { note(midi + shift, (v * 4 + i) * step, step * 0.9, 'sine', 0.1); });
          });
          notes = notes.concat([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        } else {
          // Soprano tune with alto, tenor and bass in D-major block chords (D A D G D G D A).
          [[69, 66, 50], [73, 57, 45], [74, 57, 50], [74, 59, 43], [78, 57, 50], [74, 59, 43], [74, 57, 50], [73, 57, 45]].forEach(function (chord, i) {
            [notes[i]].concat(chord).forEach(function (midi) { note(midi, i * step, step * 0.9, 'sine', 0.09); });
          });
        }
      } else if (slug === 'saint-saens') {
        // A: a slow melody alone. B: the same melody over rippling sixteenth-note arpeggios.
        step = 0.7; notes = [67, 71, 74, 72, 71, 69];
        notes.forEach(function (midi, i) { note(midi, i * step, step * 0.95, 'sine', 0.16); });
        if (b) for (var k = 0; k < notes.length * 4; k++) note([43, 50, 55, 59][k % 4], k * step / 4, step / 4, 'triangle', 0.06);
      } else if (slug === 'faure') {
        // A: the major-key leading tone rises to the tonic. B: the lowered seventh of the old mode.
        notes = b ? [62, 64, 65, 67, 65, 64, 60, 62] : [62, 64, 65, 67, 65, 64, 61, 62];
        notes.forEach(function (midi, i) { note(midi + 12, i * step, duration, 'sine', 0.15); });
      } else if (slug === 'massenet' || slug === 'elgar') {
        // Massenet B: an octave higher and slower, like a singer's climax. Elgar B: slow, with a bass.
        if (b) step = 0.6;
        notes.forEach(function (midi, i) {
          note(midi + (b && slug === 'massenet' ? 24 : 12), i * step, step * 0.9, 'sine', 0.15);
          if (b && slug === 'elgar') note([48, 43, 45, 41][Math.floor(i / 2) % 4], i * step, step * 0.95, 'triangle', 0.07);
        });
      } else if (slug === 'grieg') {
        // B adds a held open-fifth drone, as on a folk fiddle.
        notes = [67, 64, 62, 60, 62, 64, 67, 64];
        notes.forEach(function (midi, i) { note(midi + 12, i * step, duration, 'sine', 0.15); });
        if (b) { note(48, 0, notes.length * step, 'triangle', 0.06); note(55, 0, notes.length * step, 'triangle', 0.05); }
      } else if (slug === 'mascagni') {
        // B doubles the melody in octaves, as massed strings do.
        notes.forEach(function (midi, i) {
          note(midi + 12, i * step, duration, 'sine', b ? 0.12 : 0.15);
          if (b) note(midi, i * step, duration, 'triangle', 0.08);
        });
      } else if (slug === 'barber') {
        // A: a stepwise line, note by note. B: each note held into the next, so they clash and resolve.
        step = 0.6; notes = [65, 67, 69, 70, 69, 67, 65, 64];
        notes.forEach(function (midi, i) { note(midi, i * step, b ? step * 1.9 : step * 0.85, 'sine', 0.12); });
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
