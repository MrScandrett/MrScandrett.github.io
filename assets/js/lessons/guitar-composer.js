/* Original teaching patterns shared by the two guitar-composer lessons. */
(() => {
  'use strict';
  const root = document.querySelector('[data-guitar-composer]');
  if (!root) return;
  const version = document.getElementById('guitarVersion');
  const tempo = document.getElementById('guitarTempo');
  const status = document.getElementById('guitarStatus');
  const notes = document.getElementById('guitarNotes');
  const django = root.dataset.guitarComposer === 'django-reinhardt';
  let voices = [], timer, generation = 0;
  function events() {
    const changed = version.value === '1';
    const result = [];
    for (let beat = 0; beat < 4; beat++) {
      if (django) {
        [45, 52, 57, 60].forEach(pitch => result.push({ pitch, beat, duration: .22, velocity: .22, role: 'Chord' }));
        [69, 72, 76, 81, 76, 72, 69, 76].slice(beat * 2, beat * 2 + 2).forEach((pitch, i) => {
          result.push({ pitch, beat: beat + (i ? (changed ? 2 / 3 : .5) : 0), duration: .28, velocity: .6, role: 'Melody' });
        });
      } else {
        result.push({ pitch: [45, 52, 48, 52][beat], beat, duration: .8, velocity: .32, role: 'Thumb / accompaniment' });
        const pitch = [76, 77, 76, 74][beat];
        (changed ? [.25, .5, .75] : [.25]).forEach((offset, i) => result.push({ pitch, beat: beat + offset, duration: changed ? .22 : .7, velocity: .6, role: changed ? ['Ring / melody', 'Middle / melody', 'Index / melody'][i] : 'Melody' }));
      }
    }
    return result.sort((a, b) => a.beat - b.beat);
  }
  function render() {
    document.getElementById('guitarBpm').value = tempo.value;
    const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
    notes.replaceChildren(...events().map(e => {
      const li = document.createElement('li');
      li.textContent = `${e.role}: ${names[e.pitch % 12]}${Math.floor(e.pitch / 12) - 1} · beat ${(e.beat + 1).toFixed(2)}`;
      return li;
    }));
  }
  function stop(message = 'Stopped.') {
    generation++;
    clearTimeout(timer);
    voices.forEach(v => { try { v.kill(AudioKit.now()); } catch {} });
    voices = [];
    status.textContent = message;
  }
  document.getElementById('guitarPlay').addEventListener('click', async () => {
    stop('Preparing audio…');
    const run = generation;
    try {
      await AudioKit.resume();
      if (run !== generation) return;
      const start = AudioKit.now() + .06, beat = 60 / Number(tempo.value);
      events().forEach(e => {
        const voice = AudioKit.note({ instrument: 'pluck', midi: e.pitch, velocity: e.velocity, at: start + e.beat * beat, duration: e.duration * beat });
        if (voice) voices.push(voice);
      });
      status.textContent = `Playing: ${version.selectedOptions[0].textContent} at ${tempo.value} BPM.`;
      timer = setTimeout(() => stop('Finished. Compare the other pattern.'), (4 * beat + .8) * 1000);
    } catch { stop('Audio unavailable. Open the notes and timing list to clap or tap the pattern.'); }
  });
  document.getElementById('guitarStop').addEventListener('click', () => stop());
  version.addEventListener('change', () => { stop('Pattern changed. Press Play to compare.'); render(); });
  tempo.addEventListener('input', () => { stop('Tempo changed. Press Play to hear it.'); render(); });
  document.getElementById('guitarReset').addEventListener('click', () => { stop('Reset. Ready to play.'); version.value = '0'; tempo.value = '90'; render(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', () => stop());
  render();
})();
