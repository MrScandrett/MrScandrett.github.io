/* Source-based classical studies: preserve rhythm, voices, repeats and source attribution. */
(() => {
  'use strict';
  const workspace = document.querySelector('[data-composer-studio]');
  if (!workspace) return;
  const composer = location.pathname.split('/').pop().replace('.html','');
  let allowed = [];
  const $ = id => document.getElementById('bv-' + id);
  const work = $('work'), mode = $('mode'), staff = $('staff'), voice = $('voice'), octave = $('octave');
  const host = $('score'), tab = $('tab'), note = $('note');
  const script = document.currentScript.src;
  let library, player, current;
  function options(select, entries) {
    select.replaceChildren(...entries.map(([value, label]) => {
      const option = document.createElement('option'); option.value = value; option.textContent = label; return option;
    }));
  }
  function source() { return library.scores[work.value]; }
  function fillVoices() {
    const st = source().staves[+staff.value];
    options(voice, (st.voices || [st]).map((_, i) => [i, 'Voice ' + (i + 1)]));
  }
  function fillStaves() {
    options(staff, source().staves.map((st, i) => [i, st.label || 'Staff ' + (i + 1)]));
    // Start from first violin in orchestral works, rather than a wind rest.
    const violin = source().staves.findIndex(st => st.label === 'Violin I');
    if (violin >= 0) staff.value = violin;
    fillVoices();
  }
  function tablature(score) {
    const model = ScoreEngine.prepare(score); ScoreEngine.analyse(model);
    const tuning = mode.value === 'bass' ? [43,38,33,28] : [64,59,55,50,45,40];
    const names = mode.value === 'bass' ? ['G','D','A','E'] : ['e','B','G','D','A','E'];
    const heading = document.createElement('h3'); heading.textContent = 'Pitch-preserving tablature · standard tuning'; tab.append(heading);
    const explanation = document.createElement('p'); explanation.textContent = 'Read durations and rests in the staff above. Each column below is one note attack; tied continuations are omitted. “×” means outside frets 0–19: change the concert octave. String 1 is the highest string.'; tab.append(explanation);
    const rows = model.staves[0].bars.map((bar, index) => {
      const lines = tuning.map(() => []);
      bar.events.filter(e => e.kind === 'note').forEach(e => e.pitches.filter(p => !p.tiedFrom).forEach(p => {
        const choices = tuning.map((open, string) => ({ string, fret: p.midi - open })).filter(p => p.fret >= 0 && p.fret <= 19).sort((a,b) => a.fret - b.fret);
        const best = choices[0];
        lines.forEach((row, string) => row.push(best ? (best.string === string ? String(best.fret).padStart(2,'-') : '--') : '××'));
      }));
      return 'Bar ' + ScoreEngine.barNumber(model,index) + '\n' + lines.map((row,i) => names[i] + ' |' + row.join('-') + '|').join('\n');
    });
    const pre = document.createElement('pre'); pre.textContent = rows.join('\n\n'); tab.append(pre);
  }
  function chordStudy() {
    const chords = ['D','A','D','A','D','A','D','D','A','D','A','A','D','A','D','D'];
    const shapes = { D: 'xx0232', A: 'x02220' };
    const heading = document.createElement('h3'); heading.textContent = 'Ode to Joy · classroom harmonization'; tab.append(heading);
    const p = document.createElement('p'); p.textContent = 'An introductory I–V accompaniment in concert D major, one chord per written bar. These are teaching choices, not Beethoven’s complete orchestral harmony. Shapes run from low E to high e; x means mute. Play a bass note on beat 1 and a gentle chord on beats 2–4; follow the written repeat.'; tab.append(p);
    const table = document.createElement('table');
    const header = table.createTHead().insertRow(); ['Bar','Chord','Guitar frets','Bass note'].forEach(text => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = text; header.append(th); });
    chords.forEach((chord,i) => { const row = table.insertRow(); [i+1,chord,shapes[chord],chord === 'D' ? 'D3 · A string fret 5' : 'A2 · open A string'].forEach(value => { row.insertCell().textContent = value; }); }); tab.append(table);
  }
  function update() {
    if (!library) return;
    if (player) player.destroy(); player = null;
    host.replaceChildren(); tab.replaceChildren();
    const src = source(), m = mode.value, isolated = !['original','piano','chords'].includes(m);
    staff.disabled = !isolated && m !== 'piano'; voice.disabled = staff.disabled;
    octave.disabled = !isolated;
    let result = ComposerArrangement.arrange(src,{mode:m,staff:staff.value,voice:voice.value,octave:octave.value,id:composer}), message;
    if (m === 'original' || m === 'chords') {
      message = 'Source scoring preserved. Recorded instruments load when you press Play; unsupported sounds use synthesis. Use the part controls to isolate voices.';
    } else if (m === 'piano') {
      message = src.staves.length <= 2 ? 'Source notes played on piano. Review hand division and register before performing.' : 'Two-part piano study: selected upper voice and a source bass. Inner voices are omitted; redistribute large stretches before performing.';
    } else {
      message = 'Extracted ' + result.staves[0].label + ', voice ' + (+voice.value + 1) + '. Chords become ' + (m === 'bass' ? 'their lowest' : 'their highest') + ' note; this is a source line, not an automatic melody analysis.';
      if (m === 'alto' || m === 'tenor') message += ' Written ' + (m === 'alto' ? 'E♭ alto' : 'B♭ tenor') + ' part; audio sounds at concert pitch. Check register and breathing.';
    }
    if (src.composer === 'ClassroomOS teaching materials') message += ' Original classroom study, not a composition by the featured musician.';
    const chordOption = [...mode.options].find(o => o.value === 'chords');
    chordOption.disabled = work.value !== 'beethoven-ode-to-joy';
    result.subtitle = mode.selectedOptions[0].textContent + ' · ' + (src.subtitle || '') + (result.playbackTranspose ? ' · written saxophone pitch' : '');
    current = result; note.textContent = message;
    try {
      player = ScoreEngine.render(host,result);
      if (m === 'guitar' || m === 'bass') tablature(result);
      if (m === 'chords') {
        if (work.value === 'beethoven-ode-to-joy') chordStudy();
        else tab.textContent = 'Prepared chord accompaniment is available for Ode to Joy. Choose that theme to study chord shapes and bass roots; other works retain their source notation.';
      }
      if (!player) throw new Error('The score could not be prepared.');
    } catch (error) { note.textContent = 'This arrangement could not be displayed: ' + error.message; }
  }
  work.addEventListener('change',() => { if (mode.value === 'chords' && work.value !== 'beethoven-ode-to-joy') mode.value = 'original'; fillStaves(); update(); });
  staff.addEventListener('change',() => { fillVoices(); update(); });
  [mode,voice,octave].forEach(select => select.addEventListener('change',update));
  $('print').addEventListener('click',() => {
    if (!current || !ScoreEngine.preparePrintScore(current)) return;
    if (tab.childNodes.length) {
      const appendix = document.createElement('section'); appendix.className = 'se-print-score-page bv-print-tab';
      appendix.append(...[...tab.childNodes].map(node => node.cloneNode(true)));
      document.querySelector('.se-print-score-pages').append(appendix);
    }
    window.print();
  });
  $('save').addEventListener('click',() => {
    const data = { format: 'composer-study-1', composer, work: work.value, mode: mode.value, staff: staff.value, voice: voice.value, octave: octave.value };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = work.value + '-arrangement.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  });
  $('open').addEventListener('change',async event => {
    try {
      const file = event.target.files[0]; if (!file) return;
      if (file.size > 10000) throw new Error('Choose a saved studio arrangement.');
      const data = JSON.parse(await file.text());
      if (!['beethoven-study-1','composer-study-1'].includes(data.format) || !allowed.includes(data.work)) throw new Error('Choose an arrangement saved for this composer lesson.');
      const valid = (select,value) => [...select.options].some(o => o.value === String(value));
      if (!valid(mode,data.mode) || !valid(octave,data.octave)) throw new Error('Unknown arrangement setting.');
      work.value = data.work; fillStaves();
      if (!valid(staff,data.staff)) throw new Error('Unknown source staff.');
      staff.value = data.staff; fillVoices();
      if (!valid(voice,data.voice)) throw new Error('Unknown source voice.');
      voice.value = data.voice; mode.value = data.mode; octave.value = data.octave; update();
    } catch (error) { note.textContent = error.message; }
    event.target.value = '';
  });
  document.addEventListener('visibilitychange',() => { if (document.hidden && player) player.stop(); });
  Promise.all([
    fetch(new URL('../../../data/score-library.json',script)).then(response => { if (!response.ok) throw new Error('Score library unavailable'); return response.json(); }),
    fetch(new URL('../../../data/composer-workspaces.json',script)).then(response => { if (!response.ok) throw new Error('Composer index unavailable'); return response.json(); })
  ]).then(([data,index]) => {
    library = data; allowed = index[composer].scores;
    options(work,allowed.map(id => [id,data.scores[id].title]));
    if (composer === 'beethoven') work.value = 'beethoven-ode-to-joy';
    fillStaves(); update();
  }).catch(error => { note.textContent = 'Unable to open the studio: ' + error.message + '. Reload to try again.'; });
})();
