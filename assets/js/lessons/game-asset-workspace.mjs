const studios = [
  ['studio-pathway', 'Pathway & brief'],
  ['textures', '01 · Textures'],
  ['furniture', '02 · Furniture'],
  ['modular-rooms', '03 · Modular rooms'],
  ['uv-export', '04 · UV & export'],
  ['character-rigging', '05 · Rigging'],
  ['character-animation', '06 · Animation'],
];

const studio = document.querySelector('.gas-studio');
const toolbar = studio?.querySelector('.creation-app-toolbar');
if (studio && toolbar) {
  const switcher = document.createElement('details');
  switcher.className = 'gas-studio-switcher';
  const summary = document.createElement('summary');
  summary.textContent = 'Studios';
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Game Asset Studio lessons');
  for (const [slug, label] of studios) {
    const link = document.createElement('a');
    link.href = 'game-asset-' + slug + '.html';
    link.textContent = label;
    if (new URL(link.href).pathname === location.pathname) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }
  switcher.append(summary, nav);
  toolbar.prepend(switcher);
  document.addEventListener('pointerdown', event => {
    if (!switcher.contains(event.target)) switcher.open = false;
  });
  switcher.addEventListener('focusout', event => {
    if (!switcher.contains(event.relatedTarget)) switcher.open = false;
  });
  switcher.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !switcher.open) return;
    event.preventDefault();
    event.stopPropagation();
    switcher.open = false;
    summary.focus();
  });
}
