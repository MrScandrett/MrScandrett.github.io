const lessons = [
  ['pathway', 'Modeling field guide'],
  ['interface-basics', 'Transforms'],
  ['windows-doors', 'Windows & doors'],
  ['furniture-design', 'Furniture'],
  ['props-tools', 'Hard-surface props'],
  ['environments', 'Modular environments'],
  ['character-modeling', 'Characters'],
  ['sculpting', 'Terrain & props'],
  ['geometry-nodes', 'Geometry nodes'],
  ['materials-render', 'Materials & lighting'],
  ['compositing', 'Compositing'],
  ['workspaces-pathway', 'Workflow field guide'],
];

const studio = document.querySelector('.blender-studio');
const switcher = document.createElement('details');
switcher.className = 'bl-studio-switcher';
const summary = document.createElement('summary');
summary.textContent = 'Workspaces';
const nav = document.createElement('nav');
nav.setAttribute('aria-label', 'Blender workspaces');
for (const [slug, label] of lessons) {
  const link = document.createElement('a');
  link.href = 'blender-' + slug + '.html';
  link.textContent = label;
  if (new URL(link.href).pathname === location.pathname) link.setAttribute('aria-current', 'page');
  nav.append(link);
}
switcher.append(summary, nav);
studio.querySelector('.creation-app-toolbar').prepend(switcher);
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

const shortcuts = { z: 'undo', y: 'redo', s: 'save' };
studio.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey)) return;
  if (event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
  const key = event.key.toLowerCase();
  const action = event.shiftKey ? (key === 'z' ? 'redo' : null) : shortcuts[key];
  if (!action) return;
  const button = studio.querySelector('[data-action="' + action + '"]');
  if (!button) return;
  event.preventDefault();
  if (!event.repeat && !button.disabled) button.click();
});
