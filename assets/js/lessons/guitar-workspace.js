/* Keep the two live instruments in one fullscreen workspace without resetting them. */
(() => {
  'use strict';
  const workspace = document.getElementById('guitarWorkspace');
  if (!workspace) return;
  const chord = document.getElementById('builder');
  const scale = document.getElementById('scales');
  const buttons = [...workspace.querySelectorAll('[data-guitar-mode]')];
  const descriptions = {
    chord: 'Chord: place notes on the fretboard, identify your chord, and hear it strummed or arpeggiated.',
    scale: 'Scale: choose a root and scale, explore positions, and hear a melody route.',
    hybrid: 'Hybrid: build a chord and explore a scale together. Compare their notes, then strum a chord and play a melody.'
  };
  function setMode(mode) {
    workspace.dataset.mode = mode;
    chord.hidden = mode === 'scale';
    scale.hidden = mode === 'chord';
    buttons.forEach(button => {
      const active = button.dataset.guitarMode === mode;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('gc-btn-primary', active);
    });
    document.getElementById('guitarModeStatus').textContent = descriptions[mode];
    window.dispatchEvent(new Event('resize'));
  }
  buttons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.guitarMode)));
  // Reveal a hidden instrument before the lesson's navigation scrolls to it.
  function reveal(id) {
    if (id === 'builder' && chord.hidden) setMode('chord');
    if (id === 'scales' && scale.hidden) setMode('scale');
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) reveal(link.hash.slice(1));
  }, true);
  document.getElementById('musicSection')?.addEventListener('change', event => reveal(event.target.value), true);
  window.addEventListener('hashchange', () => reveal(location.hash.slice(1)));
  setMode('hybrid');
})();
