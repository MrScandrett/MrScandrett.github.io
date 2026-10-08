// VR Lab hub (vr.html): lists data/xr-experiences.json and says what this device can do.
import { xrSupport } from '../xr-kit.mjs';

const grid = document.getElementById('vr-grid');
const device = document.getElementById('vr-device');
const modeToggle = document.getElementById('vr-mode-toggle');
const KIND_LABEL = { experience: 'Headset experience', lesson: 'Lesson', app: 'App' };

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
}

function card(item, ready) {
  const tags = el('ul', { className: 'vr-tags', ariaLabel: 'Details' });
  if (item.exclusive) tags.append(el('li', { className: 'is-exclusive', textContent: 'Made for headsets' }));
  tags.append(el('li', { textContent: KIND_LABEL[item.kind] || item.kind }));
  if (item.minutes) tags.append(el('li', { textContent: `${item.minutes} min` }));
  if (item.comfort) tags.append(el('li', { textContent: item.comfort }));

  const label = item.kind === 'lesson' ? 'Open lesson'
    : item.exclusive ? (ready ? 'Enter' : 'Open preview')
    : 'Open';
  const actions = el('p', { className: 'vr-card-actions' }, [
    el('a', { className: 'vr-button', href: item.url, textContent: label, ariaLabel: `${label}: ${item.title}` })
  ]);

  const related = (item.related || []).length
    ? el('p', { className: 'vr-related' }, ['Goes with: ', ...item.related.flatMap((r, i) => [
      i ? ', ' : '', el('a', { href: r.url, textContent: r.title })
    ])])
    : null;

  return el('li', { className: 'vr-card' }, [
    el('div', { className: 'vr-card-art', ariaHidden: 'true', textContent: item.icon || '✦' }),
    el('h3', { textContent: item.title }),
    tags,
    el('p', { textContent: item.summary }),
    related,
    actions
  ]);
}

async function boot() {
  const [support, data] = await Promise.all([
    xrSupport(),
    fetch('data/xr-experiences.json').then(r => r.json()).catch(() => ({ experiences: [] }))
  ]);
  device.dataset.state = support.supported ? 'ready' : 'flat';
  device.textContent = support.supported
    ? 'This device can run VR. Pick an experience and press Enter VR inside it.'
    : `Flat preview on this device. ${support.reason}`;
  grid.replaceChildren(...data.experiences.map(item => card(item, support.supported)));
  if (!data.experiences.length) grid.append(el('li', { textContent: 'Could not load the experience list. Try reloading the page.' }));
}

function syncToggle() {
  const vr = window.ClassroomOSVR;
  if (!vr) return;
  const on = vr.enabled();
  modeToggle.setAttribute('aria-pressed', String(on));
  modeToggle.textContent = on ? 'Turn VR mode off' : 'Try VR mode on this screen';
}
modeToggle.addEventListener('click', () => {
  const vr = window.ClassroomOSVR;
  if (!vr) return;
  // In a headset, "off" then back to "auto"; on a laptop, toggle on/off explicitly.
  vr.set(vr.enabled() ? 'off' : (vr.headset ? 'auto' : 'on'));
});
window.addEventListener('classroomos:vrmodechange', syncToggle);
syncToggle();

boot();
