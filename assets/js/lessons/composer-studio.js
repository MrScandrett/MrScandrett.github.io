/* Source-based classical studies: preserve rhythm, voices, repeats and source attribution. */
(() => {
  'use strict';
  const workspace = document.querySelector('[data-composer-studio]');
  if (!workspace) return;
  const composer = location.pathname.split('/').pop().replace('.html','');
  let allowed = [];
  const $ = id => document.getElementById('bv-' + id);
  const work = $('work'), mode = $('mode'), staff = $('staff'), voice = $('voice'), octave = $('octave');
  const soloOption=document.createElement('option');soloOption.value='guitar-solo';soloOption.textContent='Guitar · solo study with source bass';
  mode.querySelector('option[value="guitar"]').before(soloOption);
  mode.querySelector('option[value="piano"]').textContent='Piano · solo score / reduction';
  const host = $('score'), tab = $('tab'), note = $('note');
  host.setAttribute('data-score-windowed', '');
  document.querySelectorAll('figure[data-score]').forEach(figure => figure.setAttribute('data-score-windowed', ''));
  const script = document.currentScript.src;
  let titles, sourceScore, player, current, showWork;
  let selection = 0;
  const openFile = $('open');
  openFile.disabled = true;
  const violinControls = document.createElement('div');
  violinControls.className = 'bv-set bv-violin-controls';
  violinControls.innerHTML = '<p class="bv-set-title">3 · Finger numbers <span>(optional)</span></p><label class="bv-check"><input type="checkbox" id="bv-violin-show"> Show violin finger numbers and positions</label><label>Violin hand position <select id="bv-violin-position"><option value="auto">Automatic · fewest shifts</option><option value="1">First position</option><option value="2">Second position</option><option value="3">Third position</option><option value="4">Fourth position</option><option value="5">Fifth position</option><option value="6">Sixth position</option><option value="7">Seventh position</option></select></label>';
  workspace.querySelector('.bv-fields').after(violinControls);
  const violinShow = $('violin-show'), violinPosition = $('violin-position');
  const pianoControls = document.createElement('div');
  pianoControls.className = 'bv-set bv-piano-controls';
  pianoControls.innerHTML = '<p class="bv-set-title">3 · Finger numbers <span>(optional)</span></p><label class="bv-check"><input type="checkbox" id="bv-piano-show"> Add my own piano finger numbers</label><div class="bv-piano-entry" id="bv-piano-entry" hidden><p class="bv-help"><b>1</b> thumb · <b>2</b> index · <b>3</b> middle · <b>4</b> ring · <b>5</b> little. Type one per note, in order, with spaces: <code>1 2 3 1</code>. Chord: <code>1/3/5</code> (low to high). Skip a note: <code>–</code>. They print with the score.</p><div id="bv-piano-inputs" class="bv-piano-inputs"></div><p role="status" id="bv-piano-status"></p></div>';
  violinControls.after(pianoControls);
  // Keep the score immediately below a small selection row on every composer page.
  const primaryFields = workspace.querySelector('.bv-fields');
  primaryFields.classList.add('bv-primary-fields');
  const settings = document.createElement('details'); settings.className = 'bv-settings';
  const settingsTitle = document.createElement('summary'); settingsTitle.textContent = 'Print Here!';
  const settingsBody = document.createElement('div'); settingsBody.className = 'bv-settings-body';
  // One numbered step per box: print first (why most people open this), then which part, then fingering.
  const step = (title, ...children) => {
    const box = document.createElement('div'); box.className = 'bv-set';
    const head = document.createElement('p'); head.className = 'bv-set-title'; head.textContent = title;
    box.append(head, ...children); return box;
  };
  const actions = workspace.querySelector('.bv-actions');
  const printHint = document.createElement('p'); printHint.className = 'bv-help';
  printHint.textContent = 'Prints the piece and arrangement chosen above. Save keeps your choices as a file you can open later.';
  const partFields = document.createElement('div'); partFields.className = 'bv-fields bv-part-fields';
  [staff, voice, octave].forEach(select => partFields.append(select.closest('label')));
  note.classList.add('bv-help');
  settingsBody.append(step('1 · Print or save', actions, printHint), step('2 · Choose the part', partFields), violinControls, pianoControls, note);
  settings.append(settingsTitle, settingsBody); primaryFields.append(settings);
  work.closest('label').firstChild.textContent = 'Piece';
  workspace.classList.add('bv-compact');
  const pianoShow = $('piano-show'), pianoInputs = $('piano-inputs');
  // Students' fingerings and violin choices survive a reload (one key per composer page).
  const PREFS_KEY = 'classroomos:composer-studio:' + composer;
  const savedPrefs = (() => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch { return {}; } })();
  const pianoPrefs = savedPrefs.piano || {};
  const violinPrefs = savedPrefs.violin || {};
  function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify({ piano: pianoPrefs, violin: violinPrefs })); } catch { /* storage full or blocked */ } }
  const pianoKey = () => [work.value, mode.value, staff.value, voice.value, octave.value].join(':');
  let builtPianoKey = null;
  function pianoGuide(score) {
    const prefs = pianoPrefs[pianoKey()] || { show: false, values: [] };
    pianoShow.checked = prefs.show;
    $('piano-entry').hidden = !prefs.show;
    // Rebuilding the boxes on every change would drop the cursor when a student tabs to the next staff.
    if (builtPianoKey !== pianoKey() || !pianoInputs.childElementCount) {
      builtPianoKey = pianoKey();
      pianoInputs.replaceChildren();
      const model = ScoreEngine.prepare(score);
      model.staves.forEach((st, i) => {
        const label = document.createElement('label');
        label.textContent = (st.label || 'Staff ' + (i + 1)) + ' · ' + st.bars.flatMap(b => b.events).filter(e => e.kind === 'note' && !e.hidden).length + ' note events ';
        const input = document.createElement('textarea'); input.rows = 2; input.value = prefs.values[i] || '';
        input.dataset.staff = i; label.append(input); pianoInputs.append(label);
      });
    }
    const values = prefs.values.map(value => value.trim().split(/\s+/).filter(Boolean));
    const invalid = values.flat().some(value => !/^(?:[1-5](?:\/[1-5]){0,4}|[-–])$/.test(value));
    $('piano-status').textContent = invalid ? 'Use fingers 1–5, / between chord fingers, and – for blanks. Invalid entries are left blank.' : '';
    if (prefs.show) score.fingerings = values;
  }
  function rememberPiano() {
    pianoPrefs[pianoKey()] = { show: pianoShow.checked, values: [...pianoInputs.querySelectorAll('textarea')].map(input => input.value) };
    savePrefs();
    update();
  }
  pianoShow.addEventListener('change', rememberPiano);
  pianoInputs.addEventListener('change', rememberPiano);
  function rememberViolin() { violinPrefs[work.value] = { show: violinShow.checked, position: violinPosition.value }; savePrefs(); }
  function restoreViolin() { const p = violinPrefs[work.value] || {}; violinShow.checked = !!p.show; violinPosition.value = p.position || 'auto'; }
  function violinGuide(model, plan, legend) {
    const heading = document.createElement('h3'); heading.textContent = 'Violin positions · selected voice'; tab.append(heading);
    const explanation = document.createElement('p'); explanation.textContent = legend; tab.append(explanation);
    const grid = document.createElement('div'); grid.className = 'bv-violin-grid'; tab.append(grid);
    model.staves[0].bars.forEach((bar, bi) => {
      const card = document.createElement('section'); card.className = 'bv-violin-bar';
      const title = document.createElement('h4'); title.textContent = 'Bar ' + ScoreEngine.barNumber(model, bi); card.append(title);
      const line = document.createElement('p');
      const items = bar.events.filter(event => plan.has(event)).map(event => {
        const pitch = event.pitches.find(note => !note.tiedFrom);
        const name = 'CDEFGAB'[pitch.l] + (pitch.a < 0 ? '♭'.repeat(-pitch.a) : '♯'.repeat(pitch.a)) + pitch.o;
        return name + ' · ' + plan.get(event).description;
      });
      line.textContent = items.join(' / ') || 'No new notes';
      card.append(line); grid.append(card);
    });
  }
  function options(select, entries) {
    select.replaceChildren(...entries.map(([value, label]) => {
      const option = document.createElement('option'); option.value = value; option.textContent = label; return option;
    }));
  }
  function organizeWorks(groups) {
    const categories = groups.map(group => ({ ...group, ids: group.scores }));
    const label = document.createElement('label'); label.className = 'bv-form-filter';
    label.textContent = 'Work type / collection';
    const filter = document.createElement('select'); filter.id = 'bv-form';
    label.append(filter); primaryFields.prepend(label);
    const hint = document.createElement('p'); hint.className = 'bv-catalog-hint'; hint.id = 'bv-catalog-hint';
    primaryFields.after(hint); filter.setAttribute('aria-describedby', hint.id);
    options(filter, [{key: 'all', label: 'All selections', ids: allowed}, ...categories]
      .map(group => [group.key, group.label + ' · ' + group.ids.length]));
    function describe() {
      const group = categories.find(group => group.ids.includes(work.value));
      hint.textContent = group ? group.label + ' — ' + group.hint : '';
    }
    function render(dispatchChange = true) {
      const selected = work.value;
      options(work, [['', 'Choose a piece']]);
      categories.filter(group => filter.value === 'all' || group.key === filter.value).forEach(group => {
        const optgroup = document.createElement('optgroup'); optgroup.label = group.label + ' · ' + group.ids.length;
        group.ids.forEach(id => { const option = document.createElement('option'); option.value = id; option.textContent = titles[id]; optgroup.append(option); });
        work.append(optgroup);
      });
      if ([...work.options].some(option => option.value === selected)) work.value = selected;
      label.dataset.category = filter.value;
      describe();
      if (dispatchChange && work.value !== selected) work.dispatchEvent(new Event('change'));
    }
    filter.addEventListener('change', () => render());
    work.addEventListener('change', describe);
    render(false);
    return id => {
      if (![...work.options].some(option => option.value === id)) {
        filter.value = 'all';
        render(false);
      }
      work.value = id;
      describe();
    };
  }

  function fillVoices() {
    const st = sourceScore.staves[+staff.value];
    options(voice, (st.voices || [st]).map((_, i) => [i, 'Voice ' + (i + 1)]));
  }
  function fillStaves() {
    options(staff, sourceScore.staves.map((st, i) => [i, st.label || 'Staff ' + (i + 1)]));
    // Start from first violin in orchestral works, rather than a wind rest.
    const violin = sourceScore.staves.findIndex(st => st.label === 'Violin I');
    if (violin >= 0) staff.value = violin;
    fillVoices();
  }
  function resultNeedsPianoReduction(src) {
    return !(src.instrument === 'piano' && (src.staves.length <= 2 || src.staves.every(st => /^(Right|Left) hand/i.test(st.label || ''))));
  }
  function update() {
    if (!sourceScore) return;
    if (player) player.destroy(); player = null;
    host.after(tab);
    host.replaceChildren(); tab.replaceChildren();
    const src = sourceScore, m = mode.value, fullGuitar = ['guitar','guitar-solo'].includes(m) && (composer === 'francisco-tarrega' || !!src.guitarArrangement || (m === 'guitar-solo' && src.instrument === 'pluck')), isolated = !fullGuitar && !['original','piano'].includes(m);
    pianoControls.hidden = m !== 'piano';
    violinControls.hidden = !['melody','violin'].includes(m);
    if (!violinPrefs[work.value]) violinShow.checked = m === 'violin';
    violinPosition.disabled = !violinShow.checked;
    staff.disabled = !isolated && (m !== 'piano' || !resultNeedsPianoReduction(src)); voice.disabled = staff.disabled;
    octave.disabled = !isolated;
    let result = ComposerArrangement.arrange(src,{mode:fullGuitar && !src.guitarArrangement ? 'original' : m,staff:staff.value,voice:voice.value,octave:octave.value,id:composer}), message;
    if (fullGuitar) {
      message = src.guitarArrangement ? src.guitarArrangement.arrangementNote + ' Notation, tablature and playback follow both voices together.' : 'Complete guitar tablature with melody, inner voices and bass preserved. Standard notation and tablature share each line of the player. Frets align directly beneath their notes; playback follows both together.';
    } else if (m === 'original') {
      message = 'Source scoring preserved. Recorded instruments load when you press Play; unsupported sounds use synthesis. Use the part controls to isolate voices.';
    } else if (m === 'piano') {
      message = result.arrangementNote || 'Complete solo-piano scoring preserved, including all voices and hand assignments. Source difficulty is unchanged; review fingering and stretches before performing.';
    } else if (m === 'guitar-solo') {
      message = result.arrangementNote;
    } else {
      message = 'Extracted ' + result.staves[0].label + ', voice ' + (+voice.value + 1) + '. Chords become ' + (m === 'bass' ? 'their lowest' : 'their highest') + ' note; this is a source line, not an automatic melody analysis.';
      if (m === 'alto' || m === 'tenor') message += ' Written ' + (m === 'alto' ? 'E♭ alto' : 'B♭ tenor') + ' part; audio sounds at concert pitch. Check register and breathing.';
      if (m === 'violin') {
        message += ' Violin part at concert pitch, kept between the open G string (G3) and E7.';
        message += ' Adjust suggested fingerings and positions under Print Here!';
      }
    }
    if (result.registerFit) {
      const fit = result.registerFit;
      if (fit.shift) message += ' Register moved ' + (fit.shift > 0 ? 'up ' : 'down ') + Math.abs(fit.shift) / 12 + (Math.abs(fit.shift) === 12 ? ' octave' : ' octaves') + ' to fit the instrument.';
      if (fit.raised || fit.lowered) message += ' Remaining out-of-range notes moved by octaves: ' + fit.raised + ' raised, ' + fit.lowered + ' lowered. Review the altered leaps.';
    }
    if (src.composer === 'ClassroomOS teaching materials') message += ' Original classroom study, not a composition by the featured musician.';
    mode.querySelector('option[value="guitar"]').textContent = src.guitarArrangement ? 'Guitar · solo arrangement with bass and harmony' : composer === 'francisco-tarrega' ? 'Guitar · complete tablature' : 'Guitar · melody tablature';
    result.subtitle = src.guitarArrangement && ['guitar','guitar-solo'].includes(m) ? result.subtitle : mode.selectedOptions[0].textContent + ' · ' + (src.subtitle || '') + (['alto','tenor'].includes(m) ? ' · written saxophone pitch' : '');
    if (fullGuitar) {
      // Guitar notation reads one octave above sounding pitch.
      result.staves.forEach(st => (st.voices || [st]).forEach(v => { v.notes = ComposerArrangement.transpose(v.notes,12,7,0); }));
      result.playbackTranspose = -12;
      result.tablature = { ...result.tablature, pitchShift: -12, tuning: [64,59,55,50,45,work.value === 'tarrega-capricho-arabe' ? 38 : 40], label: work.value === 'tarrega-capricho-arabe' ? 'Drop D · D–A–D–G–B–e' : 'Standard · E–A–D–G–B–e' };
    }
    if (!fullGuitar && ['guitar','guitar-solo','bass'].includes(m)) {
      const bass = m === 'bass';
      // Extracted lines are in concert pitch. Guitar and bass notation both
      // read an octave higher; keep playback and fret assignment sounding as before.
      result.staves.forEach(st => (st.voices || [st]).forEach(v => { v.notes = ComposerArrangement.transpose(v.notes,12,7,0); }));
      result.playbackTranspose = -12;
      result.tablature = {
        ...result.tablature,
        pitchShift: -12,
        tuning: bass ? [43,38,33,28] : [64,59,55,50,45,40],
        label: bass ? 'Bass · G–D–A–E (high to low)' : 'Guitar · e–B–G–D–A–E (high to low)'
      };
      message += ' Notation reads one octave above sounding pitch. Notation and tablature share each line and follow playback together. Numbers are frets; 0 means an open string; × marks a note outside the available strings or frets. Use the Octave control to adjust the register. Suggested fingerings need player review.';
      if(m === 'guitar')message += ' This selected voice is not a complete solo arrangement.';
    }
    if (m === 'piano') pianoGuide(result);
    current = result; note.textContent = message;
    try {
      const violinFingering = ['melody', 'violin'].includes(m) ? {
        enabled: violinShow.checked,
        position: Number(violinPosition.value) || undefined,
        onPlan: violinGuide
      } : undefined;
      player = ScoreEngine.render(host, result, {
        practiceId: src.id + (src.guitarArrangement && ['guitar', 'guitar-solo'].includes(m) ? ':guitar' : ''),
        defaultLayout: 'lines',
        violinFingering
      });
      if (!player) throw new Error('The score could not be prepared.');
      if (workspace.hasAttribute('data-creation-fit')) {
        host.querySelector('.se-workspace').setAttribute('data-creation-primary', '');
      }
    } catch (error) { note.textContent = 'This arrangement could not be displayed: ' + error.message; }
  }
  function clearScore() {
    if (player) player.destroy();
    player = null; current = null; sourceScore = null; host.scoreData = null;
    host.replaceChildren(); tab.replaceChildren();
  }
  async function selectWork(restore) {
    const token = ++selection;
    const id = work.value;
    clearScore();
    if (!id) return;
    const loading = ScoreEngine.showScoreLoading(host, id, titles[id]);
    try {
      const [score] = await Promise.all([ScoreEngine.loadScore(id), ScoreEngine.afterScorePaint()]);
      if (token !== selection) return;
      sourceScore = score;
      if (restore) mode.value = restore.mode;
      fillStaves(); restoreViolin();
      if (restore) {
        staff.value = restore.staff; fillVoices();
        voice.value = restore.voice; octave.value = restore.octave;
        if (restore.piano && Array.isArray(restore.piano.values)) {
          pianoPrefs[pianoKey()] = { show: restore.piano.show === true, values: restore.piano.values.map(value => typeof value === 'string' ? value : '') };
        } else delete pianoPrefs[pianoKey()];
        const v = restore.violin || {};
        violinShow.checked = !!v.show;
        violinPosition.value = [...violinPosition.options].some(option => option.value === v.position) ? v.position : 'auto';
        rememberViolin();
      }
      update();
    } catch (error) {
      if (token !== selection) return;
      const failure = document.createElement('p');
      failure.className = 'se-error'; failure.role = 'status';
      failure.textContent = 'The score could not load. ';
      const retry = document.createElement('button');
      retry.type = 'button'; retry.textContent = 'Retry';
      retry.addEventListener('click', () => selectWork(restore));
      failure.append(retry);
      host.replaceChildren(failure);
    } finally {
      loading.remove();
    }
  }
  work.addEventListener('change', () => selectWork());
  [violinShow, violinPosition].forEach(control => control.addEventListener('change', () => { rememberViolin(); update(); }));
  staff.addEventListener('change',() => { if (sourceScore) { fillVoices(); update(); } });
  [mode,voice,octave].forEach(select => select.addEventListener('change',update));
  $('print').addEventListener('click',() => {
    if (!current || !ScoreEngine.preparePrintScore(current, player?.printOptions())) return;
    if (tab.childNodes.length) {
      const appendix = document.createElement('section'); appendix.className = 'se-print-score-page bv-print-tab';
      appendix.append(...[...tab.childNodes].map(node => node.cloneNode(true)));
      document.querySelector('.se-print-score-pages').append(appendix);
    }
    window.print();
  });
  $('save').addEventListener('click',() => {
    if (!current) return;
    const data = { format: 'composer-study-1', composer, work: work.value, mode: mode.value, staff: staff.value, voice: voice.value, octave: octave.value, violin: { show: violinShow.checked, position: violinPosition.value }, piano: pianoPrefs[pianoKey()] };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = work.value + '-arrangement.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  });
  openFile.addEventListener('change', async () => {
    const file = openFile.files[0];
    if (!file) return;
    openFile.value = '';
    openFile.disabled = true;
    try {
      let data;
      try { data = JSON.parse(await file.text()); }
      catch { throw new Error('Choose a JSON file created with Save arrangement.'); }
      if (!data || !['beethoven-study-1','composer-study-1'].includes(data.format) || !allowed.includes(data.work)) {
        throw new Error('Choose an arrangement saved for this composer lesson.');
      }
      const valid = (select, value) => [...select.options].some(option => option.value === String(value));
      if (!valid(mode, data.mode) || !valid(octave, data.octave)) {
        throw new Error('Unknown arrangement setting.');
      }
      const request = selection;
      const staves = (await ScoreEngine.loadScore(data.work)).staves;
      if (request !== selection) return;
      const validIndex = (value, items) => /^(0|[1-9]\d*)$/.test(String(value)) && Number(value) < items.length;
      if (!validIndex(data.staff, staves)) throw new Error('Unknown source staff.');
      const savedStaff = staves[Number(data.staff)];
      if (!validIndex(data.voice, savedStaff.voices || [savedStaff])) throw new Error('Unknown source voice.');

      showWork(data.work);
      await selectWork(data);
    } catch (error) { note.textContent = error.message; }
    finally { openFile.disabled = false; }
  });
  work.disabled = true;
  options(work, [['', 'Loading piece list…']]);
  Promise.all([
    ScoreEngine.loadScoreTitles(),
    fetch(new URL('../../../data/composer-workspaces.json',script)).then(response => { if (!response.ok) throw new Error('Composer index unavailable'); return response.json(); })
  ]).then(([data,index]) => {
    titles = data; allowed = index[composer].scores;
    showWork = organizeWorks(index[composer].groups);
    if (composer === 'francisco-tarrega') mode.value = 'guitar';
    work.disabled = false;
    openFile.disabled = false;
    const initialScore = workspace.dataset.initialScore;
    if (allowed.includes(initialScore)) {
      showWork(initialScore);
      selectWork();
    }
  }).catch(error => {
    primaryFields.after(note);
    note.textContent = 'Unable to open the studio: ' + error.message + '. Reload to try again.';
  });
})();
