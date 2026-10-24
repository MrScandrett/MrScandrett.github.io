/* Beethoven lesson: "Hear it fade" hearing-loss simulator.
   Plays a real recording through a Web Audio low-pass filter and gain whose
   settings follow a year slider (1796-1827), so students hear high sounds go
   first, the way Beethoven described. Optional ringing models his tinnitus. */
(function () {
  'use strict';

  var root = document.querySelector('[data-beethoven-hearing]');
  if (!root) return;

  var audio = root.querySelector('audio');
  var trackSelect = root.querySelector('[data-bh-track]');
  var yearInput = root.querySelector('[data-bh-year]');
  var yearOut = root.querySelector('[data-bh-year-out]');
  var noteOut = root.querySelector('[data-bh-note]');
  var cutoffOut = root.querySelector('[data-bh-cutoff]');
  var meter = root.querySelector('[data-bh-meter]');
  var ringToggle = root.querySelector('[data-bh-ring]');
  var compareBtn = root.querySelector('[data-bh-compare]');
  var status = root.querySelector('[data-bh-status]');

  // What Beethoven heard at each stage, and what he did about it, from his own
  // letters and what witnesses wrote down.
  var MILESTONES = [
    { year: 1796, text: 'Full hearing: the young virtuoso in Vienna, famous for improvising.' },
    { year: 1798, text: 'First signs: high, soft sounds start to slip away. He keeps it private and keeps performing.' },
    { year: 1801, text: 'He tells his friend Wegeler that his ears “whistle and buzz continually,” sees doctors, and writes the “Moonlight” Sonata.' },
    { year: 1802, text: 'The Heiligenstadt Testament: he writes down his despair, then decides to keep composing. The bold “Eroica” follows.' },
    { year: 1808, text: 'Speech is getting hard to follow, but the Fifth Symphony premieres. He hears it in his head as he writes.' },
    { year: 1814, text: 'He stops performing in public as a pianist and puts his energy into composing instead.' },
    { year: 1818, text: 'New tools: visitors write in “conversation books” and he answers aloud. He feels the piano through a rod and through touch.' },
    { year: 1824, text: 'He shares the stage for the Ninth Symphony, setting the tempos while a second conductor keeps the players together.' },
    { year: 1827, text: 'Air brings him almost nothing now, but he has just written his late string quartets, some of his most daring music.' }
  ];

  var FIRST = 1796;
  var LAST = 1827;

  function loss(year) {
    var t = Math.min(1, Math.max(0, (year - 1797) / (LAST - 1797)));
    return Math.pow(t, 0.8);
  }
  // Interpolate on a log scale, the way pitch is heard: 18 kHz down to 220 Hz.
  function cutoffFor(year) { return 18000 * Math.pow(220 / 18000, loss(year)); }
  function gainFor(year) { return Math.pow(10, (-38 * loss(year)) / 20); }

  var ctx = null;
  var filter = null;
  var filter2 = null;
  var gain = null;
  var ringGain = null;
  var ringOsc = null;
  var bypass = false;

  function ensureGraph() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      status.textContent = 'This browser can’t run the filter. The recording will play unchanged.';
      return false;
    }
    try {
      ctx = new AC();
      var source = ctx.createMediaElementSource(audio);
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.7;
      filter2 = ctx.createBiquadFilter();
      filter2.type = 'lowpass';
      filter2.Q.value = 0.7;
      gain = ctx.createGain();
      source.connect(filter).connect(filter2).connect(gain).connect(ctx.destination);

      ringOsc = ctx.createOscillator();
      ringOsc.type = 'sine';
      ringOsc.frequency.value = 3900;
      ringGain = ctx.createGain();
      ringGain.gain.value = 0;
      ringOsc.connect(ringGain).connect(ctx.destination);
      ringOsc.start();
      return true;
    } catch (err) {
      status.textContent = 'The filter could not start here, so the recording plays unchanged.';
      ctx = null;
      return false;
    }
  }

  function milestoneFor(year) {
    var found = MILESTONES[0];
    MILESTONES.forEach(function (m) { if (m.year <= year) found = m; });
    return found;
  }

  function apply() {
    var year = Number(yearInput.value);
    var cutoff = cutoffFor(year);
    yearOut.textContent = String(year);
    noteOut.textContent = milestoneFor(year).text;
    cutoffOut.textContent = cutoff >= 1000 ? (cutoff / 1000).toFixed(1) + ' kHz' : Math.round(cutoff) + ' Hz';
    // Bar shows how much of the 20 Hz-20 kHz range (log scale) still gets through.
    var share = Math.log(cutoff / 20) / Math.log(20000 / 20);
    meter.style.setProperty('--bh-share', (Math.max(0, Math.min(1, share)) * 100).toFixed(1) + '%');
    yearInput.setAttribute('aria-valuetext', year + ': through the air he hears up to about ' + cutoffOut.textContent + '. ' + milestoneFor(year).text);

    if (!ctx) return;
    var now = ctx.currentTime;
    var f = bypass ? 20000 : cutoff;
    var g = bypass ? 1 : gainFor(year);
    filter.frequency.setTargetAtTime(f, now, 0.05);
    filter2.frequency.setTargetAtTime(f, now, 0.05);
    gain.gain.setTargetAtTime(g, now, 0.05);
    var ring = ringToggle.checked && !bypass && !audio.paused ? 0.012 * Math.min(1, loss(year) * 2) : 0;
    ringGain.gain.setTargetAtTime(ring, now, 0.1);
  }

  audio.addEventListener('play', function () {
    if (ensureGraph() && ctx.state === 'suspended') ctx.resume();
    apply();
  });
  audio.addEventListener('pause', apply);
  audio.addEventListener('ended', apply);
  yearInput.addEventListener('input', apply);
  ringToggle.addEventListener('change', apply);

  trackSelect.addEventListener('change', function () {
    var wasPlaying = !audio.paused;
    audio.src = trackSelect.value;
    if (wasPlaying) audio.play();
  });

  // Hold to hear the year 1796 again, release to drop back to the chosen year.
  function startCompare(e) { e.preventDefault(); bypass = true; compareBtn.setAttribute('aria-pressed', 'true'); apply(); }
  function endCompare() { if (!bypass) return; bypass = false; compareBtn.setAttribute('aria-pressed', 'false'); apply(); }
  compareBtn.addEventListener('pointerdown', startCompare);
  compareBtn.addEventListener('pointerup', endCompare);
  compareBtn.addEventListener('pointerleave', endCompare);
  compareBtn.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') startCompare(e); });
  compareBtn.addEventListener('keyup', endCompare);
  compareBtn.addEventListener('blur', endCompare);

  yearInput.min = String(FIRST);
  yearInput.max = String(LAST);
  apply();
})();
