/* The embedded Fake Book owns all chord parsing, transposition and degree labels. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById('cp-' + id); };
  var engine, library, chart, drafts = {}, storageKey = 'chord-progressions:v1';
  try { drafts = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch (_) { /* optional storage */ }
  function draftKey() { return $('song').value + ':' + $('key').value + ':' + $('system').value; }
  function save() {
    drafts[draftKey()] = $('draft').value;
    drafts.plan = $('plan').value;
    try { localStorage.setItem(storageKey, JSON.stringify(drafts)); } catch (_) { /* download remains available */ }
  }
  function grouped(system) {
    return Array.from({ length: chart.bars }, function (_, i) {
      return chart.chords.filter(function (c) { return c.bar === i + 1; }).map(function (c) { return c[system]; }).join(' ');
    });
  }
  var audio, voices = [], loopTimer, loopIndex = 0, loop = [0, 4, 5, 3];
  var offsets = [0, 2, 4, 5, 7, 9, 11], numerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  var jobs = ['Home', 'Away', 'Color', 'Away', 'Pull', 'Color', 'Pull'];
  var qualities = ['', 'm', 'm', '', '', 'm', 'dim'];
  function scale() {
    var key = $('loop-key').value, letters = 'CDEFGAB', natural = [0, 2, 4, 5, 7, 9, 11];
    var first = letters.indexOf(key[0]), tonic = natural[first] + (key[1] === 'b' ? -1 : key[1] === '#' ? 1 : 0);
    return offsets.map(function (offset, i) {
      var letter = (first + i) % 7, accidental = ((tonic + offset - natural[letter] + 18) % 12) - 6;
      return letters[letter] + (accidental < 0 ? 'b' : accidental > 0 ? '#' : '') + qualities[i];
    });
  }
  function sound(notes, duration) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { $('loop-status').textContent = 'Audio is unavailable in this browser.'; return; }
    if (!audio) audio = new AC();
    audio.resume().catch(function () { $('loop-status').textContent = 'Tap Play again to enable sound.'; });
    var now = audio.currentTime;
    voices = voices.filter(function (voice) { return voice.end > now; });
    notes.forEach(function (midi) {
      var oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = 'triangle'; oscillator.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.075, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(now + duration + 0.03);
      oscillator.onended = function () { oscillator.disconnect(); gain.disconnect(); };
      voices.push({ oscillator: oscillator, end: now + duration + 0.03 });
    });
  }
  function loopNotes(index) {
    var names = scale(), parsed = engine.parseTune({ id: 'chord-playground', key: $('loop-key').value, mode: 'major', meter: [4, 4], melody: 'rw', chords: names[index] });
    return engine.voiceChords(parsed.chords, 'smooth')[0];
  }
  function stopLoop() {
    clearTimeout(loopTimer); loopTimer = null;
    voices.forEach(function (voice) { try { voice.oscillator.stop(); } catch (_) {} }); voices = [];
    document.querySelectorAll('.cp-playing').forEach(function (node) { node.classList.remove('cp-playing'); });
    $('loop-play').textContent = '▶ Play loop'; $('loop-play').setAttribute('aria-pressed', 'false');
  }
  function chip(degree, name) {
    var button = document.createElement('button'); button.type = 'button'; button.className = 'cp-chord cp-degree-' + (degree + 1);
    var big = document.createElement('strong'); big.textContent = numerals[degree];
    var chord = document.createElement('span'); chord.textContent = name;
    var number = document.createElement('small'); number.textContent = (degree + 1) + (qualities[degree] === 'm' ? 'm' : qualities[degree] === 'dim' ? '°' : '') + ' · ' + jobs[degree];
    button.append(big, chord, number); return button;
  }
  function renderLoop() {
    var names = scale(); $('palette').replaceChildren(); $('loop').replaceChildren();
    names.forEach(function (name, index) {
      var button = chip(index, name); button.disabled = !engine;
      button.setAttribute('aria-label', name + ', ' + numerals[index] + ', ' + jobs[index] + '. Hear and add to loop.');
      button.addEventListener('click', function () {
        if (loop.length >= 16) { $('loop-status').textContent = 'Your loop has 16 chords. Undo or clear to make room.'; return; }
        stopLoop(); loop.push(index); sound(loopNotes(index), 0.8); renderLoop();
        $('loop-status').textContent = 'Added ' + name + ' · ' + numerals[index] + '. ' + loop.length + ' chords in your loop.';
      }); $('palette').appendChild(button);
    });
    loop.forEach(function (degree, index) {
      var button = chip(degree, names[degree]); button.disabled = !engine;
      button.setAttribute('aria-label', 'Position ' + (index + 1) + ': ' + names[degree] + '. Tap to hear.');
      button.addEventListener('click', function () { stopLoop(); sound(loopNotes(degree), 1); }); $('loop').appendChild(button);
    });
    if (!loop.length) $('loop').textContent = 'Your stage is empty. Tap a chord above to start.';
    $('loop-play').disabled = !engine || !loop.length;
  }
  $('loop-play').addEventListener('click', function () {
    stopLoop(); if (!engine || !loop.length) return; loopIndex = 0;
    this.textContent = '♫ Loop playing'; this.setAttribute('aria-pressed', 'true');
    function step() {
      var seconds = 240 / Number($('loop-tempo').value), degree = loop[loopIndex];
      $('loop').querySelectorAll('button').forEach(function (node, i) { node.classList.toggle('cp-playing', i === loopIndex); });
      sound(loopNotes(degree), seconds * 0.9);
      $('loop-status').textContent = 'Chord ' + (loopIndex + 1) + ' of ' + loop.length + ': ' + scale()[degree] + ' · ' + numerals[degree] + ' · ' + jobs[degree];
      loopIndex = (loopIndex + 1) % loop.length; loopTimer = setTimeout(step, seconds * 1000);
    } step();
  });
  $('loop-stop').addEventListener('click', function () { stopLoop(); $('loop-status').textContent = 'Stopped. Try another order or a different key.'; });
  $('loop-undo').addEventListener('click', function () { stopLoop(); loop.pop(); renderLoop(); });
  $('loop-clear').addEventListener('click', function () { stopLoop(); loop = []; renderLoop(); });
  $('loop-key').addEventListener('change', function () { stopLoop(); renderLoop(); $('loop-status').textContent = 'New key, same pattern. Tap Play to hear the difference.'; });
  $('loop-tempo').addEventListener('input', function () { $('loop-bpm').textContent = this.value + ' BPM'; });
  document.querySelectorAll('[data-progression]').forEach(function (button) { button.addEventListener('click', function () { stopLoop(); loop = this.dataset.progression.split(',').map(Number); renderLoop(); $('loop-status').textContent = 'Pattern loaded. Tap Play, or add your own ending.'; }); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') stopLoop(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopLoop(); });
  window.addEventListener('pagehide', stopLoop);
  renderLoop();
  function displayLabel(node, value) {
    // Separate degree 5 from its added seventh: 5⁷ is clearer than “57”.
    var match = value.match(/^([♭♯]?[1-7](?:m|maj|°|ø)?)(7|9)(.*)$/);
    node.textContent = match ? match[1] : value;
    if (match) { var extension = document.createElement('sup'); extension.textContent = match[2]; node.append(extension, match[3]); }
  }
  function songTrail() {
    $('song-trail').replaceChildren();
    for (var bar = 1; bar <= chart.bars; bar++) {
      var group = document.createElement('div'); group.className = 'cp-song-bar';
      var caption = document.createElement('small'); caption.textContent = 'BAR ' + bar; group.appendChild(caption);
      var track = document.createElement('div'); track.className = 'cp-bar-track';
      chart.chords.filter(function (c) { return c.bar === bar; }).forEach(function (c) {
        var match = c.nashville.match(/^[♭♯]?(\d)/), degree = match ? Number(match[1]) : 1;
        var button = document.createElement('button'); button.type = 'button'; button.className = 'cp-song-chord cp-degree-' + degree;
        button.style.flexGrow = c.beats; button.style.flexBasis = '0';
        var main = document.createElement('strong'); displayLabel(main, c[$('system').value]);
        var sub = document.createElement('span'); sub.textContent = c.letters + ' · ' + c.beats + ' beats';
        button.append(main, sub); button.setAttribute('aria-label', c.letters + ', ' + c.roman + ', Nashville ' + c.nashville + ', ' + c.beats + ' quarter-note beats. Hear chord.');
        button.addEventListener('click', function () { stopLoop(); sound(c.notes, 1); }); track.appendChild(button);
      }); group.appendChild(track); $('song-trail').appendChild(group);
    }
  }
  function render() {
    chart = engine.lessonChart($('song').value, $('key').value);
    $('meta').textContent = chart.title + ' · ' + chart.key + ' · ' + chart.meter.join('/') + ' · ' + chart.bars + ' bars' + (chart.pickup ? ' · pickup: ' + chart.pickup + ' quarter-note beats' : '') + '. ' + chart.source;
    $('draft').value = drafts[draftKey()] || '';
    $('reference').hidden = true;
    $('reveal').setAttribute('aria-expanded', 'false');
    $('reveal').textContent = 'Show all three names';
    $('feedback').textContent = '';
    $('rows').replaceChildren();
    for (var i = 1; i <= chart.bars; i++) {
      var chords = chart.chords.filter(function (c) { return c.bar === i; });
      var row = document.createElement('tr');
      [String(i), chords.map(function (c) { return c.letters + ' · ' + c.beats; }).join(' / '), chords.map(function (c) { return c.roman; }).join(' → '), chords.map(function (c) { return c.nashville; }).join(' → ')].forEach(function (text, index) {
        var cell = document.createElement(index ? 'td' : 'th');
        if (!index) cell.scope = 'row';
        cell.textContent = text; row.appendChild(cell);
      });
      $('rows').appendChild(row);
    }
    songTrail();
    $('open').href = 'fake-book.html#tune=' + encodeURIComponent($('song').value);
  }
  function selectSong() {
    var tune = library.find(function (t) { return t.id === $('song').value; });
    $('key').value = tune.key;
    $('player').contentWindow.location.hash = 'tune=' + tune.id;
    render();
  }
  function normalize(s) { return s.trim().replace(/♯/g, '#').replace(/♭/g, 'b').replace(/\s+/g, ' '); }
  $('compare').addEventListener('click', function () {
    save();
    var actual = $('draft').value.split('|').map(normalize), expected = grouped($('system').value).map(normalize);
    var different = expected.map(function (bar, i) { return actual[i] === bar ? null : i + 1; }).filter(Boolean);
    $('feedback').textContent = !different.length && actual.length === expected.length ? 'Your chart matches the registered harmony. Now verify the timing by playing it.' : 'Reference comparison: ' + (different.length ? 'review bars ' + different.join(', ') + '. ' : '') + (actual.length !== expected.length ? 'You entered ' + actual.length + ' bars; the chart has ' + expected.length + '. ' : '') + 'This compares symbols, not musical validity; spelling or another supported harmonization may differ. Reveal the chart to discuss.';
  });
  $('reveal').addEventListener('click', function () {
    $('reference').hidden = !$('reference').hidden;
    this.setAttribute('aria-expanded', String(!$('reference').hidden));
    this.textContent = $('reference').hidden ? 'Show all three names' : 'Hide name table';
  });
  $('export').addEventListener('click', function () {
    save();
    var content = chart.title + '\n' + chart.key + ' · ' + chart.meter.join('/') + '\n\nMy chart (' + $('system').value + '):\n' + $('draft').value + '\n\nRegistered reference (quarter-note beats in parentheses):\n' + Array.from({ length: chart.bars }, function (_, i) { return (i + 1) + ': ' + chart.chords.filter(function (c) { return c.bar === i + 1; }).map(function (c) { return c.letters + ' / ' + c.roman + ' / ' + c.nashville + ' (' + c.beats + ')'; }).join(', '); }).join('\n') + '\n\nPickup: ' + chart.pickup + ' quarter-note beats\nSource: ' + chart.source + '\n\nArrangement plan:\n' + $('plan').value;
    var url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    var link = document.createElement('a'); link.href = url; link.download = 'rehearsal-' + $('song').value + '.txt'; link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });
  $('draft').addEventListener('input', save); $('plan').addEventListener('input', save);
  $('song').addEventListener('change', selectSong);
  $('key').addEventListener('change', render); $('system').addEventListener('change', render);
  var attempts = 0;
  var timer = setInterval(function () {
    var win = $('player').contentWindow;
    if (win.FakeBook && win.document.getElementById('fakebook').classList.contains('is-ready')) {
      clearInterval(timer); engine = win.FakeBook; library = engine.lessonLibrary();
      library.forEach(function (tune) { $('song').add(new Option(tune.title + ' (' + tune.key + (tune.mode === 'minor' ? ' minor' : ' major') + ')', tune.id)); });
      ['C','Db','C#','D','Eb','E','F','F#','G','Ab','G#','A','Bb','B'].forEach(function (key) { $('key').add(new Option(key, key)); });
      $('song').value = library.some(function (t) { return t.id === 'twinkle'; }) ? 'twinkle' : library[0].id;
      $('plan').value = drafts.plan || '';
      $('controls').disabled = false; selectSong(); renderLoop();
      $('status').textContent = library.length + ' songs ready to explore. Pick one and follow its colors.';
    } else if (++attempts >= 120) {
      clearInterval(timer); $('status').textContent = 'The player could not load. Open the full Fake Book below, or reload to retry.';
    }
  }, 500);
})();
