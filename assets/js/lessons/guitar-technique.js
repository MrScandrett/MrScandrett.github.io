/* Guitar technique patterns: frets and fretting fingers are separate data. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const GT = window.GuitarTheory;
  if (!$('guitarTechnique') || !GT) return;
  let notes = [], cursor = 0, timer = null, restTimer = null, playing = false, score = null;
  const opens = [40, 45, 50, 55, 59, 64];
  const clamp = (id, min, max) => {
    const value = Math.max(min, Math.min(max, Number($(id).value) || min));
    $(id).value = value;
    return value;
  };
  function stop() {
    clearTimeout(timer); clearTimeout(restTimer); timer = null; playing = false; cursor = 0;
    $('techPlay').textContent = '▶ Play exercise';
    $('techStatus').textContent = 'Ready. Start again from note 1.';
    score?.highlight(-1, false);
  }
  window.addEventListener('guitar-studio-stop', stop);
  window.AudioKit?.onStop(stop);
  function silence() { $('studioStop').click(); }
  function render() {
    silence();
    const base = clamp('techFret', 1, 9), activity = $('techActivity').value;
    const scalePattern = ['thirds', 'groups3', 'groups4'].includes(activity);
    notes = [];
    const add = (string, finger) => notes.push({ string, fret: base + finger - 1, finger });
    if (scalePattern) {
      const root = [...$('gcScaleRootPicker').children].findIndex(b => b.classList.contains('is-active'));
      const scale = GT.SCALE_TYPES.find(s => s.key === $('gcScaleTypePicker').value);
      const candidates = [];
      opens.forEach((open, string) => {
        for (let fret = base; fret < base + 4; fret++) {
          const midi = open + fret;
          if (scale.intervals.includes(GT.mod12(midi - root))) candidates.push({ string, fret, finger: fret - base + 1, midi });
        }
      });
      candidates.sort((a, b) => a.midi - b.midi || a.fret - b.fret);
      const route = candidates.filter((n, i, all) => !i || n.midi !== all[i - 1].midi);
      const first = route.findIndex(n => GT.mod12(n.midi) === root);
      const tonic = route[first]?.midi;
      const octave = route.slice(first).filter(n => n.midi <= tonic + 12);
      const width = activity === 'thirds' ? 3 : Number(activity.slice(-1));
      for (let i = 0; i + width <= octave.length; i++) {
        const indexes = activity === 'thirds' ? [i, i + 2] : Array.from({ length: width }, (_, j) => i + j);
        notes.push(...indexes.map(j => octave[j]));
      }
      $('techGuide').textContent = `${GT.PITCHES[root]} ${scale.name}: repeat ${activity === 'thirds' ? 'a note and the scale tone two steps above it' : `groups of ${width} scale notes`}, moving the start up one scale step. Stay in frets ${base}–${base + 3}; finger 1 stays at fret ${base}.`;
    } else {
      const order = activity === 'skip' ? [0, 2, 4, 1, 3, 5] : [0, 1, 2, 3, 4, 5];
      if (activity === 'spider') {
        for (let s = 0; s < 5; s++) [[s, 1], [s + 1, 2], [s, 3], [s + 1, 4]].forEach(n => add(...n));
      } else {
        const fingers = /^\d{4}$/.test(activity) ? activity.split('').map(Number) : [1, 2, 3, 4];
        order.forEach(s => fingers.forEach(f => add(s, f)));
      }
      $('techGuide').textContent = `Keep finger 1 at fret ${base}, 2 at ${base + 1}, 3 at ${base + 2}, and 4 at ${base + 3}. ${activity === 'spider' ? 'Alternate between each adjacent string pair, then move the pair toward the thin strings.' : 'Play the selected finger order on each string, moving from thick to thin.'}`;
    }
    if ($('techDirection').value === 'down') notes.reverse();
    if ($('techDirection').value === 'both') notes = notes.concat(notes.slice(0, -1).reverse());
    const root = [...$('gcScaleRootPicker').children].findIndex(b => b.classList.contains('is-active'));
    score = window.GuitarScore.render($('techTab'), notes, {
      title: $('techActivity').selectedOptions[0].textContent,
      subdivision: $('techSubdivision').value,
      root: scalePattern ? root : null,
      scale: scalePattern ? GT.SCALE_TYPES.find(s => s.key === $('gcScaleTypePicker').value) : null,
      preferFlat: $('techDirection').value === 'down',
      onSelect: index => { silence(); cursor = index; sound(); }
    });
  }

  function sound() {
    const n = notes[cursor];
    if (!n) return;
    score?.highlight(cursor);
    window.GuitarAudio.pluck(GT.noteFreq(n.string, n.fret), { duration: .65 });
    $('techStatus').textContent = `Note ${cursor + 1} of ${notes.length} · string ${6 - n.string} · fret ${n.fret} · finger ${n.finger} · pick ${cursor % 2 ? '↑' : '↓'}`;
    cursor++;
  }
  function tick() {
    if (!playing) return;
    if (cursor >= notes.length) {
      if ($('techLoop').checked) cursor = 0;
      else { playing = false; $('techPlay').textContent = '▶ Play exercise'; $('techStatus').textContent += ' · Complete.'; return; }
    }
    sound();
    const subdivision = Number($('techSubdivision').value);
    const stepMs = 60000 / clamp('techTempo', 30, 160) / subdivision;
    const rests = cursor === notes.length ? (4 * subdivision - notes.length % (4 * subdivision)) % (4 * subdivision) : 0;
    if (rests) restTimer = setTimeout(() => {
      score?.highlight(-1, false);
      $('techStatus').textContent = `Rest for ${rests / subdivision} beat(s) to finish the measure.`;
    }, stepMs);
    timer = setTimeout(tick, stepMs * (1 + rests));
  }
  $('techPlay').onclick = () => { silence(); playing = true; $('techPlay').textContent = 'Playing…'; tick(); };
  $('techStep').onclick = () => { const next = cursor % notes.length; silence(); cursor = next; sound(); };
  $('techStop').onclick = silence;
  ['techActivity', 'techFret', 'techDirection', 'techSubdivision'].forEach(id => $(id).addEventListener('change', render));
  $('gcScaleRootPicker').addEventListener('click', render);
  $('gcScaleTypePicker').addEventListener('change', render);
  render();
  const scaleShortcuts = document.createElement('div'); scaleShortcuts.className = 'gc-pick-row';
  [['C major',0,'ionian'], ['A minor pentatonic',9,'minorPent'], ['E blues',4,'blues'], ['D Dorian',2,'dorian']].forEach(([name, root, key]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'gc-btn'; b.textContent = name;
    b.onclick = () => { $('gcScaleRootPicker').children[root].click(); $('gcScaleTypePicker').value = key; $('gcScaleTypePicker').dispatchEvent(new Event('change')); };
    scaleShortcuts.append(b);
  });
  $('gcScaleRootPicker').closest('.gc-enc-wrap').prepend(scaleShortcuts);

  // Quick starts retain the existing library's playback, fingering and builder integration.
  const presets = document.createElement('div'); presets.className = 'gc-pick-row guitar-library-presets';
  const label = document.createElement('strong'); label.textContent = 'Quick starts: '; presets.append(label);
  [['Em',4,'m'],['Am',9,'m'],['C',0,''],['G',7,''],['D',2,''],['E7',4,'7'],['Bm barre',11,'m']].forEach(([name, root, suffix]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'gc-btn'; b.textContent = name;
    b.onclick = () => { $('gcRootPicker').children[root].click(); $('gcTypePicker').children[GT.CHORD_TYPES.findIndex(c => c.suffix === suffix)].click(); };
    presets.append(b);
  });
  $('gcRootPicker').closest('.gc-enc-wrap').prepend(presets);
  for (const id of ['gcRootPicker','gcTypePicker','gcInversionPicker','gcFormPicker']) {
    const host = $(id);
    const sync = () => host.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.classList.contains('is-active'))));
    new MutationObserver(sync).observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); sync();
  }
})();
