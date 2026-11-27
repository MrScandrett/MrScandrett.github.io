/* Skill-based piano practice; uses the shared piano audio and workspace. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const levels = {
    beginner: { scale: 'C major · five-note preparation', notes: ['C4','D4','E4','F4','G4'], rh: '1 2 3 4 5', lh: '5 4 3 2 1', goal: 'One hand at a time. Name each note; play up and back with an even pulse.', tempo: 60,
      works: [['beethoven','Ode to Joy · 1824 · melody study','Read one short phrase; this is a theme from a symphony, arranged for keyboard.']],
      songs: [['mary-had-a-little-lamb','Mary Had a Little Lamb','1 · Find three neighboring notes; play melody alone.'],['ode-to-joy','Ode to Joy','2 · Read stepwise motion and count the longer notes.'],['twinkle','Twinkle, Twinkle, Little Star','3 · Add a single left-hand root on each chord change.']] },
    intermediate: { scale: 'C major · one octave', notes: ['C4','D4','E4','F4','G4','A4','B4','C5'], rh: '1 2 3 1 2 3 4 5', lh: '5 4 3 2 1 3 2 1', goal: 'Practice the thumb crossing slowly, hands separately, then together. Reverse the fingering on the descent.', tempo: 66,
      works: [['bach','Prelude in C major, BWV 846 · 1722','Follow broken-chord shapes; keep the pulse steady.'],['satie','Gymnopédie No. 1 · 1888','Plan bass-to-chord jumps; bring out the melody.']],
      songs: [['amazing-grace','Amazing Grace','1 · Shape a melody in triple meter; add bass roots.'],['greensleeves','Greensleeves','2 · Balance the minor melody over broken chords.'],['autumn-leaves','Autumn Leaves','3 · Play melody with left-hand thirds and sevenths, one change at a time.']] },
    advanced: { scale: 'G major · one octave', notes: ['G4','A4','B4','C5','D5','E5','F#5','G5'], rh: '1 2 3 1 2 3 4 5', lh: '5 4 3 2 1 3 2 1', goal: 'Hear F-sharp leading to G. Transfer to two octaves: use RH 4 and LH 1 at the intermediate tonic, then continue the crossing pattern.', tempo: 76,
      works: [['bach','Invention No. 1 · 1723','Learn each voice alone, then keep both lines audible.'],['chopin','Prelude No. 4, Op. 28 · 1839','Shape a singing line over quiet repeated chords.'],['joplin','The Entertainer · 1902','Separate syncopated melody from the steady bass.']],
      songs: [['the-entertainer','The Entertainer','1 · Use the chart to build a steady bass-and-chord accompaniment.'],['all-the-things-you-are','All the Things You Are','2 · Connect guide tones through changing tonal centers.'],['body-and-soul','Body and Soul','3 · Voice melody above close-position harmony; avoid doubling every chart symbol.']] },
    expert: { scale: 'A harmonic minor · one octave', notes: ['A4','B4','C5','D5','E5','F5','G#5','A5'], rh: '1 2 3 1 2 3 4 5', lh: '5 4 3 2 1 3 2 1', goal: 'Hear the augmented second F–G-sharp. Transfer to multiple octaves and varied articulations with deliberate fingering; keep equal tone before increasing tempo.', tempo: 84,
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
      if (section.id === 'repertoire-coach') {
        content.innerHTML = '<h3>Pioneer works · listen, read, then study</h3><p>These links open the hosted scores in each pioneer lesson. A listening or excerpt task does not imply readiness for the whole original.</p><ol>' + d.works.map(([slug,title,goal]) => `<li><a href="../pioneers/${slug}.html#fl-sec-score">${title}</a><p>${goal}</p></li>`).join('') + '</ol><h3>Fake-book songs · practice in this order</h3><p>Levels here describe the piano task. Lead sheets and simplified charts are starting points for arrangements, not complete original piano scores.</p><ol>' + d.songs.map(([id,title,goal]) => `<li><a href="../theory/fake-book.html#tune=${id}">${title}</a><p>${goal}</p></li>`).join('') + '</ol><p><strong>Move on when:</strong> you can repeat a short phrase three times with steady time, relaxed movement, and a clear melody.</p>';
        return;
      }
      const notes = d.notes;
      const model = notes.concat(notes.slice(0,-1).reverse());
      content.innerHTML = `<h3>${d.scale}</h3><div class="pc-coach-line"><p>${d.goal}</p></div><p>Ascending fingering · RH: ${d.rh} · LH: ${d.lh}</p><div class="coach-anchor"></div><div class="pc-builder-controls pc-recall-bar"><strong>Recall</strong><label>Notes per minute <input data-tempo type="number" min="40" max="120" value="${d.tempo}"></label><button class="pc-btn" type="button" data-model>Hear model</button><button class="pc-btn" type="button" data-stop>Stop</button><button class="pc-btn" type="button" data-restart>Restart</button></div><div class="pc-builder-controls pc-recall-keys" data-note-buttons><span role="status" aria-live="polite" data-feedback>Tap the notes in order, up and back down: note 1 of ${model.length}.</span></div>`;
      const fingerControl = document.createElement('label');
      const fingerToggle = document.createElement('input'); fingerToggle.type = 'checkbox'; fingerToggle.checked = showFingers;
      fingerControl.append(fingerToggle, ' Show finger numbers (1 = thumb, 5 = little finger)');
      content.querySelector('.pc-coach-line').append(fingerControl);
      fingerToggle.addEventListener('change', () => { showFingers = fingerToggle.checked; render(level); });
      const rh = d.rh.split(' ');
      const lh = d.lh.split(' ');
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
    render('beginner');
  });
});
