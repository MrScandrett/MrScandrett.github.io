/* Local-only microphone tuner. YIN difference function detects the fundamental,
 * rather than mistaking a strong guitar overtone for the played string. */
(function () {
  'use strict';
  var stage = document.querySelector('.fs-strings .fs-stage');
  if (!stage) return;
  var strings = [{ name: 'E2', midi: 40 }, { name: 'A2', midi: 45 }, { name: 'D3', midi: 50 },
    { name: 'G3', midi: 55 }, { name: 'B3', midi: 59 }, { name: 'E4', midi: 64 }];
  var box = document.createElement('section');
  box.className = 'guitar-tuner';
  box.setAttribute('aria-label', 'Microphone guitar tuner');
  box.innerHTML = '<h3>Listen to your guitar</h3><p>Pluck your selected string and let it ring.</p>' +
    '<label>String <select class="gt-tuner-target"><option value="auto">Auto — nearest string</option></select></label>' +
    '<div class="gt-tuner-reading"><strong class="gt-tuner-note">—</strong><span class="gt-tuner-frequency">Microphone off</span></div>' +
    '<div class="gt-tuner-meter" aria-hidden="true"><span class="gt-tuner-center"></span><span class="gt-tuner-needle" hidden></span></div>' +
    '<div class="gt-tuner-labels" aria-hidden="true"><span>Too low ♭</span><span>In tune</span><span>Too high ♯</span></div>' +
    '<p class="gt-tuner-status" role="status">Start the microphone to tune a real guitar.</p>' +
    '<button type="button" class="fs-action gt-tuner-start" aria-pressed="false">Start microphone</button>' +
    '<p class="gt-tuner-privacy">Allow microphone access when asked. Audio is processed on your device; it is never recorded or uploaded. Use headphones or stop lesson playback while tuning.</p>';
  var panel = stage.closest('.fs');
  panel.classList.add('fs-tuning-workspace');
  panel.querySelector('.fs-summary-words strong').textContent = "Let’s Tune!";
  panel.querySelector('.fs-summary-words small').textContent = 'Six strings. One good sound at a time.';
  var checker = document.createElement('section');
  checker.className = 'gt-string-checker';
  checker.innerHTML = '<p class="gt-eyebrow">01 / Choose & listen</p><h3>Meet your strings</h3><p>Tap a string to hear it. Match it on your guitar — no frets pressed.</p><div class="gt-string-list" role="group" aria-label="Open-string reference pitches"></div><p class="gt-check-progress" role="status">0 of 6 strings checked in tune</p><button type="button" class="fs-action gt-check-reset">Check all again</button>';
  stage.appendChild(checker);
  stage.appendChild(box);
  box.insertAdjacentHTML('afterbegin', '<p class="gt-eyebrow">02 / Pluck & check</p>');
  var side = panel.querySelector('.fs-side');
  var routeDetails = document.createElement('details');
  routeDetails.className = 'gt-route-details';
  routeDetails.innerHTML = '<summary>Keep learning · choose your next step</summary>';
  side.parentNode.insertBefore(routeDetails, side);
  routeDetails.appendChild(side);
  box.querySelector('.gt-tuner-privacy').textContent = 'A = 440 Hz · Use headphones for reference tones. Microphone audio stays on your device; never recorded or uploaded.';
  var progress = checker.querySelector('.gt-check-progress');
  var checked = new Set(), referenceUntil = 0, stableSince = 0, stableTarget = null;
  var referenceButtons = strings.map(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'gt-string-pick';
    b.style.setProperty('--string-gauge', (3.5 - i * .5) + 'px');
    b.innerHTML = '<span class="gt-string-number">' + (6 - i) + '</span><strong>' + s.name + '</strong><small>' + (i === 0 ? 'Thickest' : i === 5 ? 'Thinnest' : 'Open string') + '</small><span class="gt-string-result">Hear pitch</span>';
    b.setAttribute('aria-label', 'String ' + (6 - i) + ', ' + s.name + ': hear reference and select tuner target');
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      select.value = String(i); clearReading(); syncTarget();
      referenceUntil = performance.now() + 2800;
      if (window.AudioKit) window.AudioKit.note({ instrument: 'pluck', midi: s.midi, duration: 2.2, velocity: .8 });
      message('Listen to ' + s.name + ', then pluck string ' + (6 - i) + ' on your guitar.');
    });
    b.insertAdjacentHTML('beforeend', '<i class="gt-real-string" aria-hidden="true"></i>');
    checker.querySelector('.gt-string-list').appendChild(b);
    return b;
  });
  function syncTarget() {
    referenceButtons.forEach(function (b, i) { b.setAttribute('aria-pressed', select.value === String(i) ? 'true' : 'false'); });
  }
  checker.querySelector('.gt-check-reset').addEventListener('click', function () {
    checked.clear(); stableSince = 0; stableTarget = null;
    referenceButtons.forEach(function (b) { b.removeAttribute('data-checked'); b.querySelector('.gt-string-result').textContent = 'Hear pitch'; });
    progress.textContent = '0 of 6 strings checked in tune';
  });
  var select = box.querySelector('select'), toggle = box.querySelector('button');
  var note = box.querySelector('.gt-tuner-note'), frequency = box.querySelector('.gt-tuner-frequency');
  var status = box.querySelector('.gt-tuner-status'), needle = box.querySelector('.gt-tuner-needle');
  strings.forEach(function (s, i) {
    var option = document.createElement('option');
    option.value = i;
    option.textContent = s.name + (i === 0 ? ' — thickest' : i === 5 ? ' — thinnest' : '');
    select.appendChild(option);
  });
  var context, stream, source, analyser, timer, active = false, generation = 0;
  var previous = null;
  function message(text) { if (status.textContent !== text) status.textContent = text; }
  function clearReading() {
    stableSince = 0; stableTarget = null;
    previous = null; note.textContent = '—'; frequency.textContent = active ? 'Listening…' : 'Microphone off';
    needle.hidden = true; box.removeAttribute('data-tuning');
  }
  // Downsampling keeps work bounded on high-sample-rate microphones.
  function detect(input, rate) {
    var stride = Math.max(1, Math.floor(rate / 12000));
    var size = Math.floor(input.length / stride), data = new Float32Array(size), power = 0;
    for (var i = 0; i < size; i++) {
      var sum = 0;
      for (var j = 0; j < stride; j++) sum += input[i * stride + j];
      data[i] = sum / stride; power += data[i] * data[i];
    }
    if (Math.sqrt(power / size) < .008) return null;
    rate /= stride;
    var max = Math.min(Math.floor(rate / 60), Math.floor(size / 2));
    var min = Math.floor(rate / 400), length = size - max;
    var diff = new Float32Array(max + 1), total = 0;
    for (var lag = 1; lag <= max; lag++) {
      var value = 0;
      for (i = 0; i < length; i++) { var delta = data[i] - data[i + lag]; value += delta * delta; }
      total += value;
      diff[lag] = total ? value * lag / total : 1;
    }
    for (lag = min; lag < max - 1; lag++) {
      if (diff[lag] >= .15) continue;
      while (lag + 1 < max && diff[lag + 1] < diff[lag]) lag++;
      var a = diff[lag - 1], b = diff[lag], c = diff[lag + 1];
      var offset = (a - c) / (2 * (a - 2 * b + c)) || 0;
      return rate / (lag + offset);
    }
    return null;
  }
  function update() {
    if (performance.now() < referenceUntil) { clearReading(); message('Reference playing… wait, then pluck your real string.'); return; }
    var data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    var hz = detect(data, context.sampleRate);
    if (!hz) { clearReading(); message('Listening… pluck one open string near the microphone.'); return; }
    var midi = 69 + 12 * Math.log2(hz / 440);
    var target = select.value === 'auto' ? strings.reduce(function (best, s) {
      return Math.abs(s.midi - midi) < Math.abs(best.midi - midi) ? s : best;
    }) : strings[Number(select.value)];
    var cents = 100 * (midi - target.midi);
    if (previous && previous.target === target && Math.abs(previous.cents - cents) < 35) cents = .65 * previous.cents + .35 * cents;
    previous = { target: target, cents: cents };
    note.textContent = target.name;
    frequency.textContent = hz.toFixed(1) + ' Hz · ' + (cents > 0 ? '+' : '') + Math.round(cents) + ' cents';
    needle.hidden = false;
    needle.style.left = (50 + Math.max(-50, Math.min(50, cents))) + '%';
    var state = Math.abs(cents) <= 5 ? 'in' : cents < 0 ? 'low' : 'high';
    box.setAttribute('data-tuning', state);
    if (state === 'in') {
      if (stableTarget !== target) { stableTarget = target; stableSince = performance.now(); }
      if (performance.now() - stableSince >= 800) {
        checked.add(target.name);
        var b = referenceButtons[strings.indexOf(target)];
        b.setAttribute('data-checked', 'true'); b.querySelector('.gt-string-result').textContent = '✓ In tune';
        progress.textContent = checked.size === 6 ? '6 of 6 checked — now play each string once more and listen.' : checked.size + ' of 6 strings checked in tune';
      }
    } else { stableTarget = null; stableSince = 0; }
    message(target.name + ': ' + (state === 'in' ? 'In tune ✓' : state === 'low' ? 'Too low — tighten gently to raise the pitch.' : 'Too high — loosen gently to lower the pitch.'));
  }
  function stop(text) {
    generation++; active = false;
    clearInterval(timer);
    if (stream) stream.getTracks().forEach(function (track) { track.stop(); });
    if (source) source.disconnect();
    if (context) context.close().catch(function () {});
    stream = source = analyser = context = null;
    toggle.textContent = 'Start microphone'; toggle.setAttribute('aria-pressed', 'false');
    clearReading(); message(text || 'Microphone stopped.');
  }
  toggle.addEventListener('click', async function () {
    if (active) { stop(); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) {
      message('Microphone tuning needs HTTPS or localhost and a browser with microphone support.'); return;
    }
    active = true;
    var request = ++generation;
    toggle.textContent = 'Cancel microphone'; toggle.setAttribute('aria-pressed', 'true');
    message('Waiting for microphone permission…');
    try {
      context = new (window.AudioContext || window.webkitAudioContext)();
      await context.resume();
      if (request !== generation) return;
      var acquired = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (request !== generation) { acquired.getTracks().forEach(function (track) { track.stop(); }); return; }
      stream = acquired;
      source = context.createMediaStreamSource(stream); analyser = context.createAnalyser(); analyser.fftSize = 4096;
      source.connect(analyser); // Never connect the microphone to speakers.
      stream.getAudioTracks().forEach(function (track) { track.onended = function () { if (active) stop('Microphone disconnected. Start again to reconnect.'); }; });
      toggle.textContent = 'Stop microphone'; clearReading();
      timer = setInterval(update, 90);
    } catch (error) {
      if (request !== generation) return;
      stop(error.name === 'NotAllowedError' ? 'Microphone access was denied. Allow it in your browser settings, then try again.' : 'Could not open the microphone. Check that it is connected and available, then try again.');
    }
  });
  select.addEventListener('change', function () { clearReading(); syncTarget(); });
  window.AudioKit?.onStop(function () { if (active) stop(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && active) stop(); });
  var view;
  // Activity navigation is installed after this script; observe its wrapper once ready.
  window.addEventListener('load', function () {
    view = stage.closest('.iw-panel');
    if (view) new MutationObserver(function () { if (view.hidden && active) stop(); }).observe(view, { attributes: true, attributeFilter: ['hidden'] });
  });
  window.addEventListener('pagehide', function () { if (active) stop(); });
  stage.closest('details').addEventListener('toggle', function (event) { if (!event.target.open && active) stop(); });
})();
