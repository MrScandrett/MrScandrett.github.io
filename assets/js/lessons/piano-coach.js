/* Skill-based piano practice; uses the shared piano audio and workspace. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const levels = {
    beginner: { scale: 'C major · five-note preparation', notes: ['C4','D4','E4','F4','G4'], rh: '1 2 3 4 5', lh: '5 4 3 2 1', goal: 'One hand at a time. Name each note; play up and back with an even pulse.', hanon: 'Play only the first cell, right hand first. This skips D: do not substitute a scale.', cells: 1, tempo: 60,
      works: [['beethoven','Ode to Joy · 1824 · melody study','Read one short phrase; this is a theme from a symphony, arranged for keyboard.']],
      songs: [['mary-had-a-little-lamb','Mary Had a Little Lamb','1 · Find three neighboring notes; play melody alone.'],['ode-to-joy','Ode to Joy','2 · Read stepwise motion and count the longer notes.'],['twinkle','Twinkle, Twinkle, Little Star','3 · Add a single left-hand root on each chord change.']] },
    intermediate: { scale: 'C major · one octave', notes: ['C4','D4','E4','F4','G4','A4','B4','C5'], rh: '1 2 3 1 2 3 4 5', lh: '5 4 3 2 1 3 2 1', goal: 'Practice the thumb crossing slowly, hands separately, then together. Reverse the fingering on the descent.', cells: 3, tempo: 66, hanon: 'Sequence three ascending cells. Learn each hand separately before combining in parallel octaves.',
      works: [['bach','Prelude in C major, BWV 846 · 1722','Follow broken-chord shapes; keep the pulse steady.'],['satie','Gymnopédie No. 1 · 1888','Plan bass-to-chord jumps; bring out the melody.']],
      songs: [['amazing-grace','Amazing Grace','1 · Shape a melody in triple meter; add bass roots.'],['greensleeves','Greensleeves','2 · Balance the minor melody over broken chords.'],['autumn-leaves','Autumn Leaves','3 · Play melody with left-hand thirds and sevenths, one change at a time.']] },
    advanced: { scale: 'G major · one octave', notes: ['G4','A4','B4','C5','D5','E5','F#5','G5'], rh: '1 2 3 1 2 3 4 5', lh: '5 4 3 2 1 3 2 1', goal: 'Hear F-sharp leading to G. Transfer to two octaves: use RH 4 and LH 1 at the intermediate tonic, then continue the crossing pattern.', cells: 5, tempo: 76, hanon: 'Connect five cells evenly, then repeat softly. Keep fingers close to the keys; do not force high lifts.',
      works: [['bach','Invention No. 1 · 1723','Learn each voice alone, then keep both lines audible.'],['chopin','Prelude No. 4, Op. 28 · 1839','Shape a singing line over quiet repeated chords.'],['joplin','The Entertainer · 1902','Separate syncopated melody from the steady bass.']],
      songs: [['the-entertainer','The Entertainer','1 · Use the chart to build a steady bass-and-chord accompaniment.'],['all-the-things-you-are','All the Things You Are','2 · Connect guide tones through changing tonal centers.'],['body-and-soul','Body and Soul','3 · Voice melody above close-position harmony; avoid doubling every chart symbol.']] },
    expert: { scale: 'A harmonic minor · one octave', notes: ['A4','B4','C5','D5','E5','F5','G#5','A5'], rh: '1 2 3 1 2 3 4 5', lh: '5 4 3 2 1 3 2 1', goal: 'Hear the augmented second F–G-sharp. Transfer to multiple octaves and varied articulations with deliberate fingering; keep equal tone before increasing tempo.', cells: 7, tempo: 84, hanon: 'Connect seven ascending cells. Then repeat with long–short and short–long rhythms on your keyboard; finish with an even version.',
      works: [['mozart','Rondo alla turca · c. 1783','Control repeated notes and contrasts across the complete movement.'],['beethoven','Moonlight Sonata · movement III · 1801','Study a small passage of arpeggios and contrasting voices before joining sections.'],['debussy','Clair de lune · published 1905','Balance layered textures, flexible phrases, and clear pedal changes.']],
      songs: [['tea-for-two','Tea for Two','1 · Create a solo arrangement with melody, bass, and inner guide tones.'],['i-got-rhythm','I Got Rhythm','2 · Improvise through the form; vary voicings and rhythmic placement.'],['stardust','Stardust','3 · Build a solo introduction and reharmonize a phrase while preserving its melody.']] }
  };
  /* Hanon-type exercises. Each is one 8-note cell (steps of the C-major scale, 0 = middle C) that
     moves up one scale step per cell. LH plays the same notes an octave lower with finger 6 - f. */
  const exercises = {
    hanon1: { name: 'No. 1 · Evenness', skill: 'Equal tone in all five fingers',
      idx: [0,2,3,4,5,4,3,2], fing: [1,2,3,4,5,4,3,2], shift: 1,
      how: 'The classic pattern: a quiet, level line while the fingers move one at a time. Listen for no accents on 4 and 5.',
      vary: ['Staccato (fingertip, wrist loose), then legato', 'Long–short, then short–long rhythm', 'Soft (p), then crescendo up the cells and diminuendo down'] },
    five: { name: 'Five-finger steps', skill: 'Finger numbers and stepwise reading (warm-up)',
      idx: [0,1,2,3,4,3,2,1], fing: [1,2,3,4,5,4,3,2], shift: 1,
      how: 'Neighbour notes only, one finger per key, the easiest pattern to read. Say the note names aloud as you play.',
      vary: ['Play the first cell on every white key', 'Close your eyes for the second cell', 'Echo: teacher plays a cell, you answer it'] },
    thirds: { name: 'Skipping & stepping', skill: 'Finger independence: 1-3-2-4-3-5-4-3',
      idx: [0,2,1,3,2,4,3,2], fing: [1,3,2,4,3,5,4,3], shift: 1,
      how: 'Each finger jumps over its neighbour then steps back. This trains the fingers to separate cleanly, a skill scales and Czerny rely on.',
      vary: ['Group in twos (slur pairs, lift on the second)', 'Accent every third note', 'Play on the edge of the keys, then deeper'] },
    weak: { name: 'Weak fingers 3-4-5', skill: 'Strengthen the ring and little finger',
      idx: [0,1,0,1,0,2,1,0], fing: [3,4,3,4,3,5,4,3], shift: 1,
      base: 2,
      how: 'The ring and little fingers are the weakest because they share tendons. Play gently, in small movements, and stop if the hand tires or the forearm aches.',
      vary: ['Slow, with a relaxed hand (never press harder)', 'Hold the quiet 4 and 5 equal to the 3', 'Short sets of two cells, then shake out the hands'] },
    anchor: { name: 'Hold the 5th', skill: 'Independence: one finger still, others move',
      idx: [0,4,1,4,2,4,3,4], fing: [1,5,2,5,3,5,4,5], shift: 1,
      how: 'The little finger stays quiet and steady while 1-2-3-4 each take a turn. Keep the whole hand balanced and the 5th as light as the others.',
      vary: ['Hold the 5th down and play only 1–2–3–4', 'Swap: keep the thumb on a held note', 'Make the moving fingers soft and the 5th even softer'] },
    triads: { name: 'Broken triads', skill: 'Hand shape and chord spelling',
      idx: [0,2,4,2,0,2,4,2], fing: [1,3,5,3,1,3,5,3], shift: 1,
      how: 'Fingers 1-3-5 outline a chord (C-E-G, then D-F-A, and so on up the scale). Feel the hand open evenly; do not tilt the wrist.',
      vary: ['Block the triad first, then break it', 'Name the chord for each cell', 'Play the same shapes starting on black keys'] },
    alberti: { name: 'Alberti bass', skill: 'Wrist rotation, classical accompaniment',
      idx: [0,4,2,4,0,4,2,4], fing: [1,5,3,5,1,5,3,5], shift: 1,
      how: 'Low–high–middle–high, the pattern under many Mozart and Haydn melodies. A small rocking turn of the forearm does the work, not the fingers alone.',
      vary: ['Emphasise the low note, keep the rest light', 'LH alone while you hum a melody', 'Add a tune on top with the other hand'] }
  };
  const generalVary = ['Slow first: 🐢 = metronome 50, then raise by 4 only after three clean repeats', 'Play it in G major or F major (move the starting note)'];
  const levelHow = {
    beginner: 'Play only the first cell, right hand first.',
    intermediate: 'Sequence three ascending cells. Learn each hand separately before combining in parallel octaves.',
    advanced: 'Connect five cells evenly, then repeat softly. Keep fingers close to the keys; do not force high lifts.',
    expert: 'Connect seven ascending cells. Then repeat with long–short and short–long rhythms on your keyboard; finish with an even version.'
  };
  const natName = i => 'CDEFGAB'[((i % 7) + 7) % 7] + (4 + Math.floor(i / 7));
  const hz = note => {
    const m = note.match(/^([A-G])(#?)(\d)$/);
    const midi = 12 * (+m[3] + 1) + {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]] + (m[2] ? 1 : 0);
    return 440 * 2 ** ((midi - 69) / 12);
  };
  function play(notes, bpm) {
    window.PianoAudio.stop();
    window.PianoAudio.broken(notes.map(hz), { interval: 60 / bpm, duration: 60 / bpm * .85 });
  }
  document.querySelectorAll('.piano-coach').forEach(section => {
    let showFingers = false;
    let exId = 'hanon1', curLevel = 'beginner';
    function render(level) {
      window.PianoAudio.stop();
      curLevel = level;
      const d = levels[level];
      const ex = exercises[exId];
      section.querySelectorAll('[data-coach-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.coachLevel === level)));
      const content = section.querySelector('[data-coach-content]');
      content.querySelector('[data-hanon-score]')?.scorePlayer?.destroy?.();
      if (section.id === 'repertoire-coach') {
        content.innerHTML = '<h3>Pioneer works · listen, read, then study</h3><p>These links open the hosted scores in each pioneer lesson. A listening or excerpt task does not imply readiness for the whole original.</p><ol>' + d.works.map(([slug,title,goal]) => `<li><a href="../pioneers/${slug}.html#fl-sec-score">${title}</a><p>${goal}</p></li>`).join('') + '</ol><h3>Fake-book songs · practice in this order</h3><p>Levels here describe the piano task. Lead sheets and simplified charts are starting points for arrangements, not complete original piano scores.</p><ol>' + d.songs.map(([id,title,goal]) => `<li><a href="../theory/fake-book.html#tune=${id}">${title}</a><p>${goal}</p></li>`).join('') + '</ol><p><strong>Move on when:</strong> you can repeat a short phrase three times with steady time, relaxed movement, and a clear melody.</p>';
        return;
      }
      const scale = section.id === 'scale-coach';
      const notes = scale ? d.notes : Array.from({length:d.cells}, (_, i) => ex.idx.map(n => natName((ex.base || 0) + n + i * ex.shift))).flat();
      const model = scale ? notes.concat(notes.slice(0,-1).reverse()) : notes;
      content.innerHTML = `${scale ? '<h3>' + d.scale + '</h3>' : ''}<div class="pc-coach-line"><p>${scale ? d.goal : '<strong>' + ex.name + ':</strong> ' + ex.how + ' ' + (exId === 'hanon1' ? d.hanon : levelHow[level])}</p></div>${scale ? '' : '<p><strong>Trains:</strong> ' + ex.skill + '</p>'}${scale ? '<p>Ascending fingering · RH: ' + d.rh + ' · LH: ' + d.lh + '</p>' : ''}<div class="coach-anchor"></div><div class="pc-builder-controls pc-recall-bar"><strong>Recall</strong><label>Notes per minute <input data-tempo type="number" min="40" max="120" value="${d.tempo}"></label><button class="pc-btn" type="button" data-model>Hear model</button><button class="pc-btn" type="button" data-stop>Stop</button><button class="pc-btn" type="button" data-restart>Restart</button></div><div class="pc-builder-controls pc-recall-keys" data-note-buttons><span role="status" aria-live="polite" data-feedback>Tap the notes in order${scale ? ', up and back down' : ''}: note 1 of ${model.length}.</span></div>`;
      const fingerControl = document.createElement('label');
      const fingerToggle = document.createElement('input'); fingerToggle.type = 'checkbox'; fingerToggle.checked = showFingers;
      fingerControl.append(fingerToggle, ' Show finger numbers (1 = thumb, 5 = little finger)');
      content.querySelector('.pc-coach-line').append(fingerControl);
      fingerToggle.addEventListener('change', () => { showFingers = fingerToggle.checked; render(level); });
      const rh = scale ? d.rh.split(' ') : notes.map((_, i) => ex.fing[i % 8]);
      const lh = scale ? d.lh.split(' ') : notes.map((_, i) => 6 - ex.fing[i % 8]);
      if (scale) {
        ['Right hand', 'Left hand'].forEach((hand, i) => {
          const heading = document.createElement('h4'); heading.textContent = hand;
          const staff = document.createElement('div'); staff.style.overflowX = 'auto';
          content.querySelector('.coach-anchor').before(heading, staff);
          const fingers = i ? lh : rh;
          const handNotes = i ? notes.map(note => note.replace(/\d$/, octave => Number(octave) - 1)) : notes;
          const sequence = handNotes.concat(handNotes.slice(0, -1).reverse());
          const route = fingers.concat(fingers.slice(0, -1).reverse());
          window.PianoTheory.renderStaff(staff, sequence.map((note, j) => ({ spelling: note, absIndex: window.MusicNotation.parsePitch(note).midi - 60, finger: showFingers ? route[j] : null })), {showLabels: true});
        });
      }
      if (!scale) {
        const figure = document.createElement('figure');
        figure.dataset.hanonScore = '';
        figure.setAttribute('data-score-readable', ''); // large-print staff: the exercise is short, give it the room
        figure.setAttribute('aria-label', `${level} ${ex.name} generated piano sheet music`);
        content.querySelector('.coach-anchor').before(figure);
        const bars = pitches => Array.from({length: d.cells}, (_, i) =>
          pitches.slice(i * 8, i * 8 + 8).map(note => `${note}/8`).join(' ')).join(' | ');
        window.ScoreEngine.render(figure, {
          title: `${ex.name} · ${level[0].toUpperCase() + level.slice(1)} excerpt`,
          subtitle: `${d.cells} ascending ${d.cells === 1 ? 'cell' : 'cells'} · RH ${ex.fing.join('–')} · LH ${ex.fing.map(f => 6 - f).join('–')}`,
          fingerings: showFingers ? [rh, lh] : [],
          composer: exId === 'hanon1' ? 'C.-L. Hanon · classroom excerpt' : 'Hanon-type pattern · classroom exercise',
          key: 0, keyName: 'C major', time: '4/4', instrument: 'piano',
          tempo: d.tempo / 2, tempoText: `Even eighth notes · ♪ = ${d.tempo}`,
          staves: [
            {clef: 'treble', name: 'Right hand', notes: bars(notes)},
            {clef: 'bass', name: 'Left hand', notes: bars(notes.map(note => note.replace(/\d$/, octave => Number(octave) - 1)))}
          ],
          justifyLast: true, // stretch even a one-bar excerpt across the pane
          source: exId === 'hanon1' ? {label: 'The Virtuoso Pianist, Exercise 1 · opening ascending cells, generated classroom engraving', license: 'Public-domain composition'} : {label: 'Generated classroom engraving of a standard technical pattern (Hanon / Czerny / Schmitt tradition)', license: 'Original pattern, no copyright'}
        });
      }
      if (!scale) {
        const vary = document.createElement('details'); vary.className = 'pc-plan';
        vary.innerHTML = '<summary>Ways to vary this exercise</summary><ul>' + ex.vary.concat(generalVary).map(v => '<li>' + v + '</li>').join('') + '</ul>';
        content.querySelector('.coach-anchor').before(vary);
      }
      let position = 0;
      const feedback = content.querySelector('[data-feedback]');
      [...new Set(notes)].forEach(note => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'pc-btn'; button.textContent = note;
        button.addEventListener('click', () => {
          window.PianoAudio.tone(hz(note), {duration:.35});
          if (position === model.length) position = 0;
          if (note === model[position]) {
            position++;
            feedback.textContent = position === model.length ? 'Complete! Now try it on a keyboard with relaxed, even movement.' : `Correct. Next: note ${position + 1} of ${model.length}.`;
          } else feedback.textContent = `Try again. Note ${position + 1} is ${model[position]}.`;
        });
        feedback.before(button);
      });
      content.querySelector('[data-model]').onclick = () => {
        const input = content.querySelector('[data-tempo]');
        input.value = Math.max(40, Math.min(120, Number(input.value) || d.tempo));
        play(model, Number(input.value));
      };
      content.querySelector('[data-stop]').onclick = () => window.PianoAudio.stop();
      content.querySelector('[data-restart]').onclick = () => { position = 0; feedback.textContent = `Tap the notes in order: note 1 of ${model.length}.`; };
    }
    section.querySelectorAll('[data-coach-level]').forEach(button => button.addEventListener('click', () => render(button.dataset.coachLevel)));
    const exBar = section.querySelector('[data-coach-exercises]');
    if (exBar) {
      Object.entries(exercises).forEach(([id, e]) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'pc-btn'; b.dataset.coachEx = id;
        b.textContent = e.name; b.setAttribute('aria-pressed', String(id === exId));
        b.addEventListener('click', () => {
          exId = id;
          exBar.querySelectorAll('[data-coach-ex]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.coachEx === id)));
          render(curLevel);
        });
        exBar.append(b);
      });
      const wantedEx = new URLSearchParams(location.search).get('ex');
      if (exercises[wantedEx]) { exId = wantedEx; exBar.querySelectorAll('[data-coach-ex]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.coachEx === exId))); }
    }
    const hint = section.querySelector('#hanonLevelHint');
    const copy = section.querySelector('#hanonCopyLink');
    const names = { beginner: 'Beginner · 1 cell, about 2 minutes', intermediate: 'Intermediate · 3 cells, about 4 minutes', advanced: 'Advanced · 5 cells, about 6 minutes', expert: 'Expert · 7 cells, about 8 minutes' };
    const note = level => {
      if (hint) hint.textContent = `${names[level]}. Target speed: ♪ = ${levels[level].tempo}. Start slower.`;
      section.dataset.level = level;
    };
    section.querySelectorAll('[data-coach-level]').forEach(button => button.addEventListener('click', () => note(button.dataset.coachLevel)));
    copy?.addEventListener('click', async () => {
      const url = new URL(location.href); url.searchParams.set('hanon', section.dataset.level || 'beginner'); if (exBar) url.searchParams.set('ex', exId); url.hash = section.id;
      try { await navigator.clipboard.writeText(url.href); copy.textContent = 'Link copied ✓'; } catch { copy.textContent = url.href; }
      setTimeout(() => { copy.textContent = 'Copy link to this exercise'; }, 2500);
    });
    const wanted = new URLSearchParams(location.search).get('hanon');
    const start = hint && levels[wanted] ? wanted : 'beginner';
    render(start); note(start);
  });
});
