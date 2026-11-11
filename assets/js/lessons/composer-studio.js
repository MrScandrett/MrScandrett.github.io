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
  const violinControls = document.createElement('div');
  violinControls.className = 'bv-fields bv-violin-controls';
  violinControls.innerHTML = '<label><input type="checkbox" id="bv-violin-show"> Show violin positions</label><label>Violin hand position <select id="bv-violin-position"><option value="auto">Automatic · fewest shifts</option><option value="1">First position</option><option value="2">Second position</option><option value="3">Third position</option><option value="4">Fourth position</option><option value="5">Fifth position</option><option value="6">Sixth position</option><option value="7">Seventh position</option></select></label>';
  workspace.querySelector('.bv-fields').after(violinControls);
  const violinShow = $('violin-show'), violinPosition = $('violin-position');
  const violinPrefs = {};
  function rememberViolin() { violinPrefs[work.value] = { show: violinShow.checked, position: violinPosition.value }; }
  function restoreViolin() { const p = violinPrefs[work.value] || {}; violinShow.checked = !!p.show; violinPosition.value = p.position || 'auto'; }
  function violinGuide(score) {
    const model = ScoreEngine.prepare(score), bars = model.staves[0].bars;
    const events = bars.flatMap((bar, bi) => bar.events.filter(e => e.kind === 'note').map(e => ({ bar: bi, pitch: e.pitches[e.pitches.length - 1] })));
    const midis = events.map(e => e.pitch.midi);
    const fixed = violinPosition.value === 'auto' ? null : Number(violinPosition.value);
    const route = fixed ? midis.map(m => FakeBookMelody.violinInPosition(m, fixed)) : FakeBookMelody.violinRoute(midis, 'auto');
    const heading = document.createElement('h3'); heading.textContent = 'Violin positions · selected voice'; tab.append(heading);
    const explanation = document.createElement('p'); explanation.textContent = 'Read the notes in score order. 0 means an open string; low and high describe finger placement. Automatic suggests shifts; × means the note is outside the selected position or supported range. Grace notes and ornaments are not included. These are suggestions to review with your teacher.'; tab.append(explanation);
    const grid = document.createElement('div'); grid.className = 'bv-violin-grid'; tab.append(grid);
    bars.forEach((bar, bi) => {
      const card = document.createElement('section'); card.className = 'bv-violin-bar';
      const title = document.createElement('h4'); title.textContent = 'Bar ' + ScoreEngine.barNumber(model, bi); card.append(title);
      const line = document.createElement('p');
      const items = events.map((event, i) => ({ event, spot: route[i] })).filter(x => x.event.bar === bi);
      line.textContent = items.length ? items.map(({event, spot}) => {
        const m = event.pitch.midi, pitch = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][m % 12] + (Math.floor(m / 12) - 1);
        return pitch + ': ' + (spot ? ['G','D','A','E'][spot.s] + ' string, ' + (spot.finger ? (spot.place ? spot.place + ' ' : '') + 'finger ' + spot.finger : 'open') + ', position ' + spot.pos + (spot.shift ? ' (shift)' : '') : '×');
      }).join(' · ') : 'Rest';
      card.append(line); grid.append(card);
    });
  }
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
    host.after(tab);
    host.replaceChildren(); tab.replaceChildren();
    const src = source(), m = mode.value, fullGuitar = m === 'guitar' && (composer === 'francisco-tarrega' || !!src.guitarArrangement), isolated = !fullGuitar && !['original','piano','chords'].includes(m);
    violinControls.hidden = m !== 'melody';
    violinPosition.disabled = !violinShow.checked;
    staff.disabled = !isolated && m !== 'piano'; voice.disabled = staff.disabled;
    octave.disabled = !isolated;
    let result = ComposerArrangement.arrange(src,{mode:fullGuitar && !src.guitarArrangement ? 'original' : m,staff:staff.value,voice:voice.value,octave:octave.value,id:composer}), message;
    if (fullGuitar) {
      message = src.guitarArrangement ? src.guitarArrangement.arrangementNote + ' Notation, tablature and playback follow both voices together.' : 'Complete guitar tablature with melody, inner voices and bass preserved. Standard notation and tablature share each line of the player. Frets align directly beneath their notes; playback follows both together.';
    } else if (m === 'original' || m === 'chords') {
      message = 'Source scoring preserved. Recorded instruments load when you press Play; unsupported sounds use synthesis. Use the part controls to isolate voices.';
    } else if (m === 'piano') {
      message = src.staves.length <= 2 ? 'Source notes played on piano. Review hand division and register before performing.' : 'Two-part piano study: selected upper voice and a source bass. Inner voices are omitted; redistribute large stretches before performing.';
    } else {
      message = 'Extracted ' + result.staves[0].label + ', voice ' + (+voice.value + 1) + '. Chords become ' + (m === 'bass' ? 'their lowest' : 'their highest') + ' note; this is a source line, not an automatic melody analysis.';
      if (m === 'alto' || m === 'tenor') message += ' Written ' + (m === 'alto' ? 'E♭ alto' : 'B♭ tenor') + ' part; audio sounds at concert pitch. Check register and breathing.';
      if (m === 'violin') {
        const fit = result.violinFit || { shift: 0, raised: 0 };
        message += ' Violin part at concert pitch, kept between the open G string (G3) and E7.';
        if (fit.shift) message += ' Moved ' + (fit.shift > 0 ? 'up ' : 'down ') + (Math.abs(fit.shift) / 12 === 1 ? 'one octave' : Math.abs(fit.shift) / 12 + ' octaves') + ' to fit the instrument.';
        if (fit.raised) message += ' ' + fit.raised + (fit.raised === 1 ? ' note sat' : ' notes sat') + ' below the G string and ' + (fit.raised === 1 ? 'was' : 'were') + ' lifted an octave; check ' + (fit.raised === 1 ? 'that leap.' : 'those leaps.');
        message += ' Bowings and fingerings are yours to mark.';
      }
    }
    if (src.composer === 'ClassroomOS teaching materials') message += ' Original classroom study, not a composition by the featured musician.';
    const chordOption = [...mode.options].find(o => o.value === 'chords');
    chordOption.disabled = work.value !== 'beethoven-ode-to-joy';
    mode.querySelector('option[value="guitar"]').textContent = src.guitarArrangement ? 'Guitar · solo arrangement with bass and harmony' : composer === 'francisco-tarrega' ? 'Guitar · complete tablature' : 'Guitar · melody tablature';
    result.subtitle = src.guitarArrangement && m === 'guitar' ? result.subtitle : mode.selectedOptions[0].textContent + ' · ' + (src.subtitle || '') + (result.playbackTranspose ? ' · written saxophone pitch' : '');
    if (fullGuitar) {
      // Guitar notation reads one octave above sounding pitch.
      result.staves.forEach(st => (st.voices || [st]).forEach(v => { v.notes = ComposerArrangement.transpose(v.notes,12,7,0); }));
      result.playbackTranspose = -12;
      result.tablature = { ...result.tablature, pitchShift: -12, tuning: [64,59,55,50,45,work.value === 'tarrega-capricho-arabe' ? 38 : 40], label: work.value === 'tarrega-capricho-arabe' ? 'Drop D · D–A–D–G–B–e' : 'Standard · E–A–D–G–B–e' };
    }
    if (!fullGuitar && (m === 'guitar' || m === 'bass')) {
      const bass = m === 'bass';
      // Extracted lines are in concert pitch. Guitar and bass notation both
      // read an octave higher; keep playback and fret assignment sounding as before.
      result.staves.forEach(st => (st.voices || [st]).forEach(v => { v.notes = ComposerArrangement.transpose(v.notes,12,7,0); }));
      result.playbackTranspose = -12;
      result.tablature = {
        pitchShift: -12,
        tuning: bass ? [43,38,33,28] : [64,59,55,50,45,40],
        label: bass ? 'Bass · G–D–A–E (high to low)' : 'Guitar · e–B–G–D–A–E (high to low)'
      };
      message += ' Notation and tablature share each line and follow playback together. Numbers are frets; 0 means an open string; × marks a note outside the available strings or frets. Use the Octave control to adjust the register. Suggested fingerings need player review; this selected voice is not a complete solo arrangement.';
    }
    current = result; note.textContent = message;
    try {
      player = ScoreEngine.render(host,result);
      if (m === 'melody' && violinShow.checked) violinGuide(result);
      if (m === 'chords') {
        if (work.value === 'beethoven-ode-to-joy') chordStudy();
        else tab.textContent = 'Prepared chord accompaniment is available for Ode to Joy. Choose that theme to study chord shapes and bass roots; other works retain their source notation.';
      }
      if (!player) throw new Error('The score could not be prepared.');
    } catch (error) { note.textContent = 'This arrangement could not be displayed: ' + error.message; }
  }
  work.addEventListener('change',() => { if (mode.value === 'chords' && work.value !== 'beethoven-ode-to-joy') mode.value = 'original'; fillStaves(); restoreViolin(); update(); });
  [violinShow, violinPosition].forEach(control => control.addEventListener('change', () => { rememberViolin(); update(); }));
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
    const data = { format: 'composer-study-1', composer, work: work.value, mode: mode.value, staff: staff.value, voice: voice.value, octave: octave.value, violin: { show: violinShow.checked, position: violinPosition.value } };
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
      voice.value = data.voice; mode.value = data.mode; octave.value = data.octave;
      const v = data.violin || {}; violinShow.checked = v.show === true; violinPosition.value = valid(violinPosition, v.position) ? v.position : 'auto'; rememberViolin(); update();
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
    if (composer === 'francisco-tarrega') mode.value = 'guitar';
    fillStaves(); update();
  }).catch(error => { note.textContent = 'Unable to open the studio: ' + error.message + '. Reload to try again.'; });
})();
