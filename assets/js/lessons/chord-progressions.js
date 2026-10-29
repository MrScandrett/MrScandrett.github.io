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
    ['library','lab'].forEach(function (kind) { $(kind + '-play').textContent = '▶ Play example'; $(kind + '-play').setAttribute('aria-pressed', 'false'); });
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
  ['loop','library','lab'].forEach(function (kind) { $(kind + '-tempo').addEventListener('input', function () {
    var value = this.value; ['loop','library','lab'].forEach(function (panel) { $(panel + '-tempo').value = value; $(panel + '-bpm').textContent = value + ' BPM'; });
  }); });
  document.querySelectorAll('[data-progression]').forEach(function (button) { button.addEventListener('click', function () { stopLoop(); loop = this.dataset.progression.split(',').map(Number); renderLoop(); $('loop-status').textContent = 'Pattern loaded. Tap Play, or add your own ending.'; }); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') stopLoop(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopLoop(); });
  window.addEventListener('pagehide', stopLoop);
  renderLoop();
  // Hand-authored functional analyses add context to the shared engine's pitch labels.
  // Each event lasts one 4/4 bar. Pitches, chord spellings and voicings come from FakeBook.
  function studyEvent(chord, roman, key, note) { return { chord: chord, roman: roman, key: key, note: note || '' }; }
  function study(title, key, chords, romans, description) {
    return { title: title, description: description, events: chords.split(' ').map(function (chord, i) { return studyEvent(chord, romans.split(' ')[i], key); }) };
  }
  var studies = { library: [
    study('Home & back · I–IV–V–I', 'C', 'C F G C', 'I IV V I', 'C major: tonic → departure → dominant → tonic. Sing C before the final arrival.'),
    study('Pop loop · I–V–vi–IV', 'C', 'C G Am F', 'I V vi IV', 'C major: the last IV connects back to I on the repeat. A loop can avoid a final cadence.'),
    study('Doo-wop · I–vi–IV–V', 'C', 'C Am F G', 'I vi IV V', 'C major: familiar major and minor colors, ending on a dominant that invites another round.'),
    study('Jazz arrival · ii7–V7–Imaj7', 'C', 'Dm7 G7 Cmaj7 Cmaj7', 'ii7 V7 Imaj7 Imaj7', 'C major: follow F → F → E and C → B → B. The repeated tonic gives the arrival room.'),
    study('Turnaround · Imaj7–vi7–ii7–V7', 'C', 'Cmaj7 Am7 Dm7 G7', 'Imaj7 vi7 ii7 V7', 'C major: a turnaround leads back toward the beginning. Compare its open ending with the jazz arrival.'),
    study('Descending fifths · diatonic circle', 'C', 'C F Bdim Em Am Dm G C', 'I IV vii° iii vi ii V I', 'C major: follow the letter roots around a fifths sequence. F–B is a diminished fifth; all chords here remain diatonic.'),
    study('Authentic ending · V–I', 'C', 'C F G C', 'I IV V I', 'C major: hear G resolve to C at the phrase ending. Compare this with the deceptive ending next.'),
    study('Deceptive ending · V–vi', 'C', 'C F G Am', 'I IV V vi', 'C major: the expected final C is replaced by Am. Shared tones soften the surprise while the bass changes.'),
    study('Plagal ending · IV–I', 'C', 'C G F C', 'I V IV I', 'C major: this phrase closes with F–C, the IV–I plagal motion.'),
    study('Minor arrival · i–iv–V7–i', 'Am', 'Am Dm E7 Am', 'i iv V7 i', 'A minor: E7 contains G♯, the raised leading tone that pulls toward A. A major dominant is common in minor keys.'),
    study('Andalusian pattern · i–VII–VI–V', 'Am', 'Am G F E', 'i VII VI V', 'A minor: roots descend A–G–F–E. VII and VI use our natural-minor reference (also written ♭VII and ♭VI with a major reference). The final major V supplies G♯.'),
    study('12-bar blues · dominant-seventh colors', 'C', 'C7 C7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7', 'I7 I7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7', 'C blues: count three four-bar phrases. I7 and IV7 are characteristic blues colors; a dominant-seventh quality does not by itself prove a secondary-dominant function. The last V7 turns the form around.'),
    study('Borrowed minor iv · I–IV–iv–I', 'C', 'C F Fm C', 'I IV iv I', 'C major: borrowing Fm from parallel C minor introduces A♭. Trace A → A♭ → G without leaving C as home.')
  ], lab: [] };
  function journey(title, events, description, question, explanation) {
    studies.lab.push({ title: title, events: events, description: description, question: question, explanation: explanation });
  }
  [['Dm','A7','ii','C♯ → D; the seventh G can fall to F.'], ['Em','B7','iii','D♯ → E; the seventh A can fall to G.'], ['F','C7','IV','E → F; the added seventh B♭ can fall to A.'], ['G','D7','V','F♯ → G; the seventh C can fall to B.'], ['Am','E7','vi','G♯ → A; the seventh D can fall to C.']].forEach(function (target) {
    journey('Secondary dominant · ' + target[1] + ' → ' + target[0] + ' (V7/' + target[2] + ')', [
      studyEvent('C', 'I', 'C', 'Establish the original home, C major.'),
      studyEvent(target[1], 'V7/' + target[2], 'C', 'Listen for ' + target[3]),
      studyEvent(target[0], target[2], 'C', 'The target receives a temporary spotlight.'),
      studyEvent('G7', 'V7', 'C', 'The original dominant points back to C.'), studyEvent('C', 'I', 'C', 'C is home again.')
    ], 'C major: give ' + target[0] + ' its own dominant, then return to the original tonic.', 'Predict: which note changes, and which chord does it pull toward?', 'The applied dominant points to ' + target[0] + '. ' + target[3] + ' The later G7–C supports C as the overall tonic. This is a tonicization, rather than a sustained move to the target key.');
  });
  journey('Stay in G · pivot-chord modulation', [
    studyEvent('C','I','C','Start in C major.'), studyEvent('F','IV','C','F natural belongs to the original key.'),
    studyEvent('C','I','C','Return to C before the transition.'), studyEvent('Am','vi in C = ii in G','C → G','Pivot: A–C–E belongs to both keys.'),
    studyEvent('D7','V7','G','F♯ supplies the new leading tone.'), studyEvent('G','I','G','G receives a dominant-to-tonic arrival.'),
    studyEvent('C','IV','G','C now acts as IV of G.'), studyEvent('Am','ii','G','Continue in the new key.'),
    studyEvent('D7','V7','G','Repeat the new dominant.'), studyEvent('G','I','G','A second arrival reinforces G as tonic.')
  ], 'C major → G major: Am is shared, but its job changes. Compare this longer stay with D7 → G in the secondary-dominant examples.', 'Predict: where can one chord carry two labels? What after it makes G sound like home?', 'Am is vi in C and ii in G. D7 introduces F♯ and resolves to G. Continued IV–ii–V7–I in G supports the new tonal center. The pivot itself does not prove modulation; the following phrase supplies the evidence.');
  journey('Relative minor · C major → A minor', [
    studyEvent('C','I','C'), studyEvent('F','IV','C'), studyEvent('Dm','ii in C = iv in Am','C → Am','Pivot: D–F–A is shared.'),
    studyEvent('E7','V7','Am','G♯ leads upward to A.'), studyEvent('Am','i','Am'), studyEvent('Dm','iv','Am'), studyEvent('E7','V7','Am'), studyEvent('Am','i','Am')
  ], 'A shared key signature offers a smooth route, but the new tonic still needs support.', 'Predict: which accidental helps A become home?', 'Dm changes from ii in C to iv in A minor. E7 brings G♯, the leading tone to A; the repeated iv–V7–i confirms the minor destination. G♯ is a normal raised leading tone in A minor, not evidence of yet another key change.');
  journey('Direct modulation · C major → D major', [
    studyEvent('C','I','C'), studyEvent('F','IV','C'), studyEvent('G7','V7','C'), studyEvent('C','I','C','End the original phrase here.'),
    studyEvent('D','I','D','New phrase: jump straight to D major.'), studyEvent('G','IV','D'), studyEvent('A7','V7','D','C♯ leads to D.'), studyEvent('D','I','D')
  ], 'Finish a phrase in C, then begin the next one a whole step higher in D. No common-chord pivot connects these phrases.', 'Predict: where is the phrase boundary, and what confirms D?', 'The second phrase starts directly on D, then follows IV–V7–I in D. F♯ and C♯ belong to the new key. Repeating this phrase or bringing the melody back in D can make the shift still clearer.');
  journey('Common tone · C major → A♭ major', [
    studyEvent('C','I','C','Remember the pitch C.'), studyEvent('Ab','I','Ab','C is shared: C–E–G becomes A♭–C–E♭.'),
    studyEvent('Bbm','ii','Ab'), studyEvent('Eb7','V7','Ab'), studyEvent('Ab','I','Ab')
  ], 'Use C as a common-tone bridge, then support A♭ with its own ii–V7–I. Select smooth voicing to compare the smaller movements.', 'Predict: which pitch can a singer hold while C major becomes A♭ major?', 'C belongs to both chords. In performance, sustain or repeat C across the change; our block-chord playback reattacks it. B♭m–E♭7–A♭ supplies the destination cadence. A common tone connects the sonorities but does not alone establish the new key.');
  journey('Dominant chain · E7–A7–D7–G7–C', [
    studyEvent('C','I','C'), studyEvent('E7','V7 of A7','C','G♯ points toward the next root, A.'),
    studyEvent('A7','V7 of D7','C','C♯ points toward D.'), studyEvent('D7','V7/V','C','F♯ points toward G.'),
    studyEvent('G7','V7','C'), studyEvent('C','I','C')
  ], 'Descending-fifth roots keep redirecting the tension. Each dominant resolves to another dominant until C arrives.', 'Predict: does each new accidental force a permanent key change?', 'No. The chain creates local pulls but eventually resolves to the original C tonic. E7 points to A7, not the diatonic Am; the first two labels therefore name the next chord explicitly rather than claiming a simple V7/vi → vi resolution.');
  journey('Borrow a color · F–Fm–C', [
    studyEvent('C','I','C'), studyEvent('F','IV','C','F contains A natural.'), studyEvent('Fm','iv (borrowed)','C','A♭ replaces A.'), studyEvent('C','I','C','A → A♭ → G connects the upper voices.')
  ], 'Modal mixture borrows iv from parallel C minor. The tonic remains C.', 'Predict: is A♭ a new tonic or a chord tone that colors the return to C?', 'A♭ is the third of Fm. The chromatic line A–A♭–G leads into C; this example supports modal mixture within C major, with no new tonic established.');
  journey('Another approach · vii°/V → V', [
    studyEvent('C','I','C'), studyEvent('F#dim','vii°/V','C','F♯–A–C shares D7’s upper three tones.'), studyEvent('G','V','C','F♯ rises to G.'), studyEvent('G7','V7','C'), studyEvent('C','I','C')
  ], 'A secondary leading-tone triad can approach the same target as a secondary dominant.', 'Predict: which note of D7 is absent from F♯dim?', 'D, the root of D7, is absent. F♯–A–C keeps the leading tone and the tritone. Its resolution highlights G before G7 brings us back to C.');

  var studyState = { library: { index: -1, events: [] }, lab: { index: -1, events: [] } };
  function textNode(tag, value, className) {
    var node = document.createElement(tag); node.textContent = value;
    if (className) node.className = className;
    return node;
  }
  function studyDefinition(kind) { return studies[kind][Number($(kind + '-select').value) || 0]; }
  function selectStudyChord(kind, index, announce) {
    var state = studyState[kind], event = state.events[index]; state.index = index;
    $(kind + '-trail').querySelectorAll('button').forEach(function (node, i) { node.setAttribute('aria-pressed', String(i === index)); node.classList.toggle('cp-selected', i === index); });
    var box = $(kind + '-inspect'); box.replaceChildren();
    box.append(textNode('h4', 'Bar ' + (index + 1) + ' · ' + event.chord + ' · ' + event.roman));
    box.append(textNode('p', 'Chord tones: ' + event.tones.join(' – ') + '. ' + (event.note || 'Listen to how this chord connects to its neighbors.')));
    var labels = textNode('p', 'Local key: ' + event.key + '. Nashville (major-scale reference on ' + event.nashKey.replace(/m$/, '') + '): ', 'cp-small');
    var nashville = document.createElement('span'); displayLabel(nashville, event.nashville); labels.append(nashville, '. Functional analysis: ' + event.roman + '.'); box.append(labels);
    if (announce) $(kind + '-status').textContent = 'Bar ' + (index + 1) + ' of ' + state.events.length + ': ' + event.chord + ' · ' + event.roman + '. ' + event.note;
  }
  function renderStudy(kind) {
    var definition = studyDefinition(kind), state = studyState[kind];
    $(kind + '-title').textContent = definition.title;
    $(kind + '-description').textContent = definition.description;
    if (kind === 'lab') {
      $('lab-question').textContent = definition.question;
      $('lab-explanation').textContent = definition.explanation;
      $('lab-answer').open = false;
    }
    var parsed = engine.parseTune({ id: 'progression-' + kind, key: 'C', mode: 'major', meter: [4,4], melody: definition.events.map(function () { return 'rw'; }).join(' | '), chords: definition.events.map(function (event) { return event.chord; }).join(' | ') });
    var voicings = engine.voiceChords(parsed.chords, $(kind + '-voicing').value);
    state.events = definition.events.map(function (event, index) {
      var tones = engine.chordTones(parsed.chords[index]), localKey = event.key.indexOf('→') >= 0 ? event.key.split(' → ')[1] : event.key;
      var key = engine.parseKey(localKey.replace(/m$/, ''), /m$/.test(localKey));
      // Nashville always measures roots from the local major scale, including in minor.
      var root = parsed.chords[index].root, natural = [0,2,4,5,7,9,11];
      var distance = ((natural[root.l] + root.a - natural[key.l] - key.a) % 12 + 12) % 12;
      var degrees = ['1','♭2','2','♭3','3','4','♯4','5','♭6','6','♭7','7'];
      var nash = degrees[distance] + ({m:'m',m7:'m7',dim:'°',dim7:'°7',maj7:'maj7','7':'7'}[parsed.chords[index].q] || '');
      return Object.assign({}, event, { tones: tones.map(function (tone) { return 'CDEFGAB'[tone.l] + (tone.a < 0 ? '♭'.repeat(-tone.a) : '♯'.repeat(tone.a)); }), nashville: nash, nashKey: localKey, degree: Number(nash.match(/[1-7]/)[0]), notes: [36 + tones[0].pc].concat(voicings[index]) });
    });
    $(kind + '-trail').replaceChildren();
    state.events.forEach(function (event, index) {
      var card = textNode('button', '', 'cp-study-chord cp-degree-' + event.degree); card.type = 'button';
      card.append(textNode('small', 'BAR ' + (index + 1) + ' · ' + event.key), textNode('strong', event.chord.replace(/b/g,'♭').replace(/#/g,'♯')), textNode('span', event.roman), textNode('small', event.tones.join(' · ')));
      card.setAttribute('aria-label', 'Bar ' + (index + 1) + ': ' + event.chord + ', ' + event.roman + ', key ' + event.key + '. Hear and inspect chord.');
      card.addEventListener('click', function () { stopLoop(); selectStudyChord(kind, index, true); sound(event.notes, 1.1); });
      $(kind + '-trail').append(card);
    });
    selectStudyChord(kind, 0, false);
    $(kind + '-status').textContent = 'Ready. Predict the next chord, then play or step through the example. Use Speed to change the tempo, or compare individual cards.';
  }
  ['library','lab'].forEach(function (kind) {
    studies[kind].forEach(function (definition, index) { $(kind + '-select').add(new Option(definition.title, String(index))); });
    ['select','voicing'].forEach(function (suffix) { $(kind + '-' + suffix).addEventListener('change', function () { stopLoop(); if (engine) renderStudy(kind); }); });
    $(kind + '-step').addEventListener('click', function () {
      stopLoop(); var state = studyState[kind], next = (state.index + 1) % state.events.length;
      selectStudyChord(kind, next, true); sound(state.events[next].notes, 1.1);
    });
    $(kind + '-play').addEventListener('click', function () {
      stopLoop(); var state = studyState[kind], index = 0;
      this.setAttribute('aria-pressed','true'); this.textContent = '♫ Playing example';
      function step() {
        var seconds = 240 / Number($('loop-tempo').value);
        selectStudyChord(kind, index, true);
        $(kind + '-trail').children[index].classList.add('cp-playing');
        sound(state.events[index].notes, seconds * .9); index++;
        loopTimer = setTimeout(function () {
          document.querySelectorAll('.cp-playing').forEach(function (node) { node.classList.remove('cp-playing'); });
          if (index < state.events.length) step();
          else { stopLoop(); $(kind + '-status').textContent = 'Example finished. ' + (kind === 'lab' ? 'Explain the ending, then reveal the listening explanation.' : 'Which chord sounded like home? Try another ending or voicing.'); }
        }, seconds * 1000);
      } step();
    });
    $(kind + '-stop').addEventListener('click', function () { stopLoop(); $(kind + '-status').textContent = 'Stopped. Play restarts at bar 1; Next chord continues from the selected card.'; });
  });
  document.querySelectorAll('[data-cp-study]').forEach(function (button) { button.addEventListener('click', function () { stopLoop(); $('lab-select').value = this.dataset.cpStudy; renderStudy('lab'); }); });
  document.querySelectorAll('[data-cp-answer]').forEach(function (button) { button.addEventListener('click', function () {
    var feedback = { visit: 'Yes. D7 is V7/V and gives G a temporary spotlight; G7–C brings the phrase back to C.', stay: 'Listen beyond D7. G7–C supports the original tonic; one applied dominant alone does not establish a new key.', bass: 'In V7/V, the slash means “of”: dominant seventh of V. A letter slash chord such as D7/F♯ specifies a bass note.' };
    $('knowledge-feedback').textContent = feedback[this.dataset.cpAnswer];
  }); });

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
      ['library','lab'].forEach(function (kind) { $(kind + '-controls').disabled = false; renderStudy(kind); });
      $('status').textContent = library.length + ' songs ready to explore. Pick one and follow its colors.';
    } else if (++attempts >= 120) {
      clearInterval(timer); $('status').textContent = 'The player could not load. Open the full Fake Book below, or reload to retry.';
    }
  }, 500);
})();
