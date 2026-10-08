/* Photo Editing Workshop lesson: mounts Layer Lab and runs the small teaching
 * widgets around it (raster vs vector zoom, blend-mode calculator, "Try it"
 * buttons, mission checklist mirror). */
import { Studio } from './layer-lab/studio.mjs';
import { blendChannel } from './layer-lab/pixels.mjs';
import { MISSIONS } from './layer-lab/missions.mjs';

const host = document.getElementById('pe-studio');
const studio = new Studio(host, { assetBase: '../../' });
window.LayerLab = studio;

/* ── "Try it" buttons: data-pe-try="sample:moon tool:wand cmd:subject ptab:info zoom:12" ── */
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-pe-try]');
  if (!b) return;
  host.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  for (const step of b.dataset.peTry.split(/\s+/)) {
    const [kind, arg] = step.split(':');
    if (kind === 'sample') await studio.openSample(arg);
    else if (kind === 'tool') studio.setTool(arg);
    else if (kind === 'cmd') await studio.run(arg);
    else if (kind === 'ptab') { studio.panelTab = arg; studio.refreshPanels(); }
    else if (kind === 'zoom' && studio.doc) studio.setZoom(+arg);
  }
  studio.engaged = true;
  host.querySelector('.lls-viewport')?.focus({ preventScroll: true });
});

/* ── mission mirror under the client brief ── */
const mirror = document.getElementById('pe-mission-mirror');
function renderMirror() {
  if (!mirror) return;
  mirror.innerHTML = MISSIONS.map((m) => `<li class="${studio.missions.done.has(m.id) ? 'done' : ''}"><b>${m.title}</b>${studio.missions.done.has(m.id) ? '<span class="lls-sr"> (done)</span>' : ''}</li>`).join('');
}
host.addEventListener('layerlab:missions', renderMirror);
renderMirror();

/* ── raster vs vector ── */
const raster = document.getElementById('pe-raster');
const vector = document.getElementById('pe-vector');
const zoom = document.getElementById('pe-rv-zoom');
if (raster && vector && zoom) {
  const src = document.createElement('canvas');
  src.width = src.height = 32;
  const s = src.getContext('2d');
  s.fillStyle = '#ffffff'; s.fillRect(0, 0, 32, 32);
  s.fillStyle = '#2563eb'; s.beginPath(); s.arc(16, 16, 11, 0, Math.PI * 2); s.fill();
  s.fillStyle = '#ffffff'; s.font = '800 15px Inter, system-ui, sans-serif'; s.textAlign = 'center'; s.fillText('A', 16, 21.5);
  const draw = () => {
    // zoom toward the circle's edge beside the letter, where the stair-steps show
    const z = +zoom.value, size = 32 / z;
    const ox = Math.min(32 - size, Math.max(0, 22 - size / 2)), oy = Math.min(32 - size, Math.max(0, 12 - size / 2));
    const ctx = raster.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 256, 256);
    ctx.drawImage(src, ox, oy, size, size, 0, 0, 256, 256);
    vector.setAttribute('viewBox', `${ox} ${oy} ${size} ${size}`);
    document.getElementById('pe-rv-out').textContent = `${z}×`;
  };
  zoom.addEventListener('input', draw);
  draw();
}

/* ── blend-mode calculator ── */
const A = document.getElementById('pe-bl-a'), B = document.getElementById('pe-bl-b'), M = document.getElementById('pe-bl-mode');
if (A && B && M) {
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const RULES = {
    multiply: ['bottom × top', 'Always darker (or equal). White does nothing; black makes black.'],
    screen: ['1 − (1 − bottom) × (1 − top)', 'Always lighter (or equal). Black does nothing; white makes white.'],
    overlay: ['bottom ≤ 0.5 ? 2 × bottom × top : 1 − 2(1 − bottom)(1 − top)', 'Multiply in the darks, Screen in the lights: adds contrast. The bottom layer decides which.'],
    darken: ['min(bottom, top)', 'Keeps whichever is darker, channel by channel.'],
    lighten: ['max(bottom, top)', 'Keeps whichever is lighter, channel by channel.'],
    difference: ['|bottom − top|', 'Identical colors make black: a quick way to spot what changed between two versions.'],
    exclusion: ['bottom + top − 2 × bottom × top', 'Like Difference, but softer in the middle tones.'],
    'color-dodge': ['bottom ÷ (1 − top)', 'Brightens the bottom to reflect the top: a strong glow.'],
    'color-burn': ['1 − (1 − bottom) ÷ top', 'Darkens the bottom with extra contrast: a deep burn.'],
    'hard-light': ['top ≤ 0.5 ? 2 × bottom × top : screen(bottom, 2 × top − 1)', 'Overlay with the layers swapped: the top layer decides.'],
    'soft-light': ['a gentler, curved Overlay', 'Like shining a soft colored light on the bottom layer.'],
    normal: ['top', 'The top color covers the bottom completely.'],
  };
  const update = () => {
    const a = rgb(A.value), b = rgb(B.value), mode = M.value;
    const r = a.map((v, i) => blendChannel(mode, v / 255, b[i] / 255) * 255);
    document.getElementById('pe-sw-a').style.background = A.value;
    document.getElementById('pe-sw-b').style.background = B.value;
    document.getElementById('pe-sw-r').style.background = hex(r);
    const [rule, words] = RULES[mode];
    document.getElementById('pe-bl-words').textContent = words;
    document.getElementById('pe-bl-math').innerHTML = `result = <b>${rule}</b><br>`
      + ['Red', 'Green', 'Blue'].map((n, i) => `${n.padEnd(5, ' ')} ${(a[i] / 255).toFixed(2)} and ${(b[i] / 255).toFixed(2)} → <b>${(r[i] / 255).toFixed(2)}</b> (${Math.round(r[i])} of 255)`).join('<br>')
      + `<br>result color = <b>${hex(r)}</b>`;
  };
  [A, B, M].forEach((el) => el.addEventListener('input', update));
  update();
}
