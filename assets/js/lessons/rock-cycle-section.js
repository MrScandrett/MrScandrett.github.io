(() => {
  'use strict';
  const section = document.querySelector('.rc-section');
  const play = document.getElementById('rc-play');
  const expand = document.getElementById('rc-expand');
  const speed = document.getElementById('rc-speed');
  const svg = document.getElementById('rc-svg');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let running = !reduced.matches;
  const descriptions = {
    cooling: 'Cooling → igneous rock. At the ocean ridge, rising mantle partially melts as pressure falls. Magma rises and cools into new oceanic crust. At the continent, magma can crystallize underground or erupt as lava and cool at the surface.',
    weathering: 'Weathering → sediment. Water, ice, roots, and chemical reactions break down exposed rock of any type. Erosion transports those pieces downhill; rivers carry sediment toward the coast and ocean.',
    burial: 'Deposition + compaction + cementation → sedimentary rock. Sediment settles into layers on the seafloor or on land. As more sediment accumulates, burial compacts the grains; minerals cement them together.',
    metamorphism: 'Heat + pressure → metamorphic rock. Burial, plate collision, and nearby magma can change minerals and textures in existing rocks. The rock remains solid: if it melts, that is a different process.',
    melting: 'Partial melting → magma. The descending oceanic plate releases water-rich fluids. Water lowers the melting temperature of the hot mantle above it; some of that mantle melts. Buoyant magma rises toward the volcano.',
    all: 'These processes operate together in different places. There is no single required loop: any exposed rock can weather, buried rocks can metamorphose, and suitable conditions can cause rock to melt. Use a process button to trace one route.'
  };
  function select(key) {
    section.querySelectorAll('[data-rc]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.rc === key)));
    section.querySelectorAll('[data-process]').forEach(group => group.classList.toggle('is-selected', key === 'all' || group.dataset.process === key));
    document.getElementById('rc-explanation').textContent = descriptions[key];
  }
  function renderPlayback() {
    section.classList.toggle('is-paused', !running || document.hidden);
    section.classList.toggle('motion-enabled', running);
    play.textContent = running ? 'Pause animation' : 'Play animation';
    play.setAttribute('aria-pressed', String(running));
  }
  function enlarged(value) {
    section.classList.toggle('is-expanded', value);
    expand.setAttribute('aria-expanded', String(value));
    expand.textContent = value ? 'Close enlarged diagram' : 'Enlarge diagram';
    if (value) expand.focus();
  }
  section.querySelectorAll('[data-rc]').forEach(button => button.addEventListener('click', () => select(button.dataset.rc)));
  play.addEventListener('click', () => { running = !running; renderPlayback(); });
  speed.addEventListener('change', () => svg.style.setProperty('--rc-duration', `${2 * Number(speed.value)}s`));
  expand.addEventListener('click', () => enlarged(!section.classList.contains('is-expanded')));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && section.classList.contains('is-expanded')) { enlarged(false); expand.focus(); } });
  document.addEventListener('visibilitychange', renderPlayback);
  reduced.addEventListener('change', () => { running = !reduced.matches; renderPlayback(); });
  document.getElementById('rc-reset').addEventListener('click', () => {
    select('cooling'); speed.value = '1'; svg.style.removeProperty('--rc-duration');
    section.querySelectorAll('.rc-flow').forEach(path => { path.style.animation = 'none'; });
    void svg.getBoundingClientRect();
    section.querySelectorAll('.rc-flow').forEach(path => { path.style.animation = ''; });
    running = !reduced.matches; renderPlayback();
  });
  select('cooling'); renderPlayback();
})();
