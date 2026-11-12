/* Short, first-position violin studies. No microphone assessment is implied. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const host = document.getElementById('violinTechnique');
    if (!host) return;
    const T = window.ViolinTheory;
    const get = id => document.getElementById('vt' + id);
    const status = get('Status'), notes = get('Notes');
    let sequence = [], cursor = 0, timer = null;
    function stop() {
      clearTimeout(timer); timer = null;
      get('Play').textContent = 'Play exercise';
      window.dispatchEvent(new Event('violin-technique-stop'));
      notes.querySelectorAll('[aria-current]').forEach(n => n.removeAttribute('aria-current'));
      status.textContent = 'Paused. Choose a note, continue, or change the activity.';
    }
    function location(midi) {
      // Highest available open string avoids unnecessary fourth-finger crossings.
      const string = [...T.STRINGS].reverse().find(s => midi >= s.openMidi && midi <= s.openMidi + 7);
      if (!string) throw new Error('Exercise exceeds first position');
      return { midi, label: string.label, offset: midi - string.openMidi };
    }
    function build() {
      stop(); cursor = 0;
      const root = Number(get('Root').value), minor = get('Mode').value === 'minor';
      const pattern = T.PATTERNS.find(p => p.id === (minor ? 'natminor' : 'major'));
      const tonic = T.ROOTS.find(r => r.pc === root % 12);
      const spellings = T.spellPattern(tonic, pattern);
      const scale = i => root + 12 * Math.floor(i / 7) + pattern.intervals[i % 7];
      const activity = get('Activity').value;
      let indices = [], pitches, advice;
      if (activity === 'scale') {
        indices = [...Array(8).keys(), 6, 5, 4, 3, 2, 1, 0];
        advice = 'Listen for whole and half steps. Keep the hand balanced as you cross strings.';
      } else if (activity === 'sequence') {
        for (let i = 0; i <= 4; i++) indices.push(i, i + 1, i + 2, i + 3);
        for (let i = 7; i >= 3; i--) indices.push(i, i - 1, i - 2, i - 3);
        advice = 'Move a four-note cell up the scale, then down. Prepare the next finger without squeezing.';
      } else if (activity === 'thirds') {
        for (let i = 0; i <= 5; i++) indices.push(i, i + 2);
        for (let i = 7; i >= 2; i--) indices.push(i, i - 2);
        advice = 'Skip one scale note each time. Hear each third before placing the finger.';
      } else if (activity === 'triad') {
        indices = [0, 2, 4, 7, 4, 2, 0];
        advice = 'Say root, third, fifth, octave. Compare the major third with the minor third.';
      } else if (activity === 'ladder') {
        // Fold each triad into the tonic octave to keep every key in first position.
        for (let i = 0; i < 7; i++) indices.push(i, (i + 2) % 7, (i + 4) % 7, i);
        advice = 'Play each four-note group as root–third–fifth–root. Notes above the octave fold down to stay in first position. Major: I ii iii IV V vi vii°. Natural minor: i ii° III iv v VI VII.';
      } else if (activity === 'lifts') {
        pitches = [0, 2, minor ? 3 : 4, 5, 7, 5, minor ? 3 : 4, 2, 0].map(n => root + n);
        advice = 'Stay on the tonic string: 0–1–2–3–4–3–2–1–0 (low 2 in minor). Lift lightly; compare finger 4 with the next open string.';
      } else {
        pitches = [55, 62, 55, 62, 62, 69, 62, 69, 69, 76, 69, 76, 76, 69, 62, 55];
        advice = 'Use only open strings. Change the bow’s level with a quiet arm motion; listen for clean crossings.';
      }
      if (!pitches) pitches = indices.map(scale);
      sequence = pitches.map((midi, i) => {
        let n = location(midi);
        if (activity === 'lifts') n = { midi, label: tonic.label, offset: midi - root };
        let degree = pattern.intervals.indexOf((midi - root + 12) % 12);
        let name = activity === 'crossing' ? T.noteName(midi) : spellings[degree] + (Math.floor(midi / 12) - 1);
        return { ...n, name, number: i + 1 };
      });
      get('Root').disabled = get('Mode').disabled = activity === 'crossing';
      get('Coach').textContent = advice;
      notes.replaceChildren();
      const group = Number(get('Bowing').value);
      sequence.forEach((n, i) => {
        const b = document.createElement('button'); b.type = 'button';
        b.dataset.midi = n.midi; b.dataset.string = n.label; b.dataset.offset = n.offset;
        const finger = T.fingerForOffset(n.offset);
        const bow = Math.floor(i / group) % 2 ? '↑' : '↓';
        b.innerHTML = '<span>' + n.name + '</span><small>' + n.label + ' string · ' + finger + '</small><small>' + bow + ' group ' + (Math.floor(i / group) + 1) + '</small>';
        b.setAttribute('aria-label', 'Note ' + (i + 1) + ': ' + n.name + ', ' + n.label + ' string, finger ' + finger + ', ' + (bow === '↓' ? 'down bow' : 'up bow'));
        b.addEventListener('click', () => { stop(); show(i); cursor = (i + 1) % sequence.length; });
        notes.append(b);
      });
      status.textContent = sequence.length + ' notes ready. Choose Play exercise or Next note. ↓ down bow · ↑ up bow.';
    }
    function tempo() {
      const value = Math.max(30, Math.min(160, Number(get('Tempo').value) || 60));
      get('Tempo').value = value; return 60000 / value;
    }
    function show(i) {
      const n = sequence[i];
      window.dispatchEvent(new CustomEvent('violin-technique-note', { detail: n }));
      notes.querySelectorAll('button').forEach((b, j) => {
        if (i === j) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      if (!document.getElementById('vlnMute').checked) window.ViolinFingerboard.Audio.blip(T.freqOfMidi(n.midi), tempo() * .8);
      status.textContent = 'Note ' + (i + 1) + ' / ' + sequence.length + ': ' + n.name + ' · ' + n.label + ' string · finger ' + T.fingerForOffset(n.offset);
    }
    function tick() {
      show(cursor++);
      timer = setTimeout(() => {
        if (cursor === sequence.length) {
          cursor = 0;
          if (!get('Loop').checked) { stop(); status.textContent = 'Complete. Check tone, intonation and a relaxed hand before repeating.'; return; }
        }
        tick();
      }, tempo());
    }
    get('Play').addEventListener('click', () => {
      if (timer !== null) { stop(); return; }
      window.AudioKit?.stopAll();
      window.dispatchEvent(new Event('violin-user-action'));
      get('Play').textContent = 'Pause exercise'; tick();
    });
    get('Stop').addEventListener('click', () => { window.AudioKit?.stopAll(); stop(); cursor = 0; });
    get('Next').addEventListener('click', () => { stop(); show(cursor); cursor = (cursor + 1) % sequence.length; });
    ['Activity', 'Root', 'Mode', 'Bowing'].forEach(id => get(id).addEventListener('change', build));
    get('Tempo').addEventListener('change', tempo);
    window.AudioKit?.onStop(stop);
    ['violin-user-action', 'violin-triad-start'].forEach(name => window.addEventListener(name, stop));
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    build();
  });
})();
