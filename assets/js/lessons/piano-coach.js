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
    function render(level) {
      window.PianoAudio.stop();
      const d = levels[level];
      section.querySelectorAll('[data-coach-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.coachLevel === level)));
      const content = section.querySelector('[data-coach-content]');
      content.querySelector('[data-hanon-score]')?.scorePlayer?.destroy?.();
      if (section.id === 'repertoire-coach') {
        content.innerHTML = '<h3>Pioneer works · listen, read, then study</h3><p>These links open the hosted scores in each pioneer lesson. A listening or excerpt task does not imply readiness for the whole original.</p><ol>' + d.works.map(([slug,title,goal]) => `<li><a href="../pioneers/${slug}.html#fl-sec-score">${title}</a><p>${goal}</p></li>`).join('') + '</ol><h3>Fake-book songs · practice in this order</h3><p>Levels here describe the piano task. Lead sheets and simplified charts are starting points for arrangements, not complete original piano scores.</p><ol>' + d.songs.map(([id,title,goal]) => `<li><a href="../theory/fake-book.html#tune=${id}">${title}</a><p>${goal}</p></li>`).join('') + '</ol><p><strong>Move on when:</strong> you can repeat a short phrase three times with steady time, relaxed movement, and a clear melody.</p>';
        return;
      }
      const scale = section.id === 'scale-coach';
      const natural = ['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5','A5','B5'];
      const notes = scale ? d.notes : Array.from({length:d.cells}, (_, i) => [0,2,3,4,5,4,3,2].map(n => natural[i+n])).flat();
      const model = scale ? notes.concat(notes.slice(0,-1).reverse()) : notes;
      content.innerHTML = `<h3>${scale ? d.scale : 'Hanon No. 1 · ascending excerpt'}</h3><p>${scale ? d.goal : d.hanon}</p><p>${scale ? 'Ascending fingering · RH: '+d.rh+' · LH: '+d.lh : 'Each cell: 1–3–4–5–6–5–4–3 in C major; shift up one scale step. RH: 1–2–3–4–5–4–3–2; LH: 5–4–3–2–1–2–3–4. Model plays the upper hand; left hand can practice an octave lower.'}</p><p class="coach-notes">${notes.join(' · ')}</p><div class="pc-builder-controls"><label>Notes per minute <input data-tempo type="number" min="40" max="120" value="${d.tempo}"></label><button class="pc-btn" type="button" data-model>Hear model</button><button class="pc-btn" type="button" data-stop>Stop</button><button class="pc-btn" type="button" data-restart>Restart recall</button></div><p>After listening, tap the note names in order ${scale ? 'up and back down' : 'through the excerpt'}. This checks note order, not timing or physical technique. Finger 1 = thumb; 5 = little finger.</p><div class="pc-builder-controls" data-note-buttons></div><p role="status" aria-live="polite" data-feedback>Ready for note 1 of ${model.length}.</p>${scale ? '' : '<p>Based on C.-L. Hanon, <cite>The Virtuoso Pianist</cite>, Exercise 1. This is a short ascending excerpt; the complete exercise also returns downward.</p>'}`;
      const fingerControl = document.createElement('label');
      const fingerToggle = document.createElement('input'); fingerToggle.type = 'checkbox'; fingerToggle.checked = showFingers;
      fingerControl.append(fingerToggle, ' Show finger numbers on the notes');
      content.querySelector('.coach-notes').before(fingerControl);
      fingerToggle.addEventListener('change', () => { showFingers = fingerToggle.checked; render(level); });
      const rh = scale ? d.rh.split(' ') : notes.map((_, i) => [1,2,3,4,5,4,3,2][i % 8]);
      const lh = scale ? d.lh.split(' ') : notes.map((_, i) => [5,4,3,2,1,2,3,4][i % 8]);
      if (scale) {
        ['Right hand', 'Left hand'].forEach((hand, i) => {
          const heading = document.createElement('h4'); heading.textContent = hand;
          const staff = document.createElement('div'); staff.style.overflowX = 'auto';
          content.querySelector('.coach-notes').before(heading, staff);
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
        figure.setAttribute('aria-label', `${level} Hanon No. 1 generated piano sheet music`);
        const caption = document.createElement('figcaption');
        caption.textContent = 'Generated from the same note sequence as the recall activity. Each cell is one bar of eight eighth notes in 4/4. Both hands move in parallel, one octave apart. Use the score player to hear both hands, or Print score to save a PDF.';
        figure.append(caption);
        content.querySelector('.coach-notes').before(figure);
        const bars = pitches => Array.from({length: d.cells}, (_, i) =>
          pitches.slice(i * 8, i * 8 + 8).map(note => `${note}/8`).join(' ')).join(' | ');
        window.ScoreEngine.render(figure, {
          title: `Hanon No. 1 · ${level[0].toUpperCase() + level.slice(1)} excerpt`,
          subtitle: `${d.cells} ascending ${d.cells === 1 ? 'cell' : 'cells'} · RH 1–2–3–4–5–4–3–2 · LH 5–4–3–2–1–2–3–4`,
          fingerings: showFingers ? [rh, lh] : [],
          composer: 'C.-L. Hanon · classroom excerpt',
          key: 0, keyName: 'C major', time: '4/4', instrument: 'piano',
          tempo: d.tempo / 2, tempoText: `Even eighth notes · ♪ = ${d.tempo}`,
          staves: [
            {clef: 'treble', name: 'Right hand', notes: bars(notes)},
            {clef: 'bass', name: 'Left hand', notes: bars(notes.map(note => note.replace(/\d$/, octave => Number(octave) - 1)))}
          ],
          source: {label: 'The Virtuoso Pianist, Exercise 1 · opening ascending cells, generated classroom engraving', license: 'Public-domain composition'}
        });
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
        content.querySelector('[data-note-buttons]').append(button);
      });
      content.querySelector('[data-model]').onclick = () => {
        const input = content.querySelector('[data-tempo]');
        input.value = Math.max(40, Math.min(120, Number(input.value) || d.tempo));
        play(model, Number(input.value));
      };
      content.querySelector('[data-stop]').onclick = () => window.PianoAudio.stop();
      content.querySelector('[data-restart]').onclick = () => { position = 0; feedback.textContent = `Ready for note 1 of ${model.length}.`; };
    }
    section.querySelectorAll('[data-coach-level]').forEach(button => button.addEventListener('click', () => render(button.dataset.coachLevel)));
    render('beginner');
  });
});
