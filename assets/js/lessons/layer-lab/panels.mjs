/* panels.mjs — Layer Lab's options bar, Layers panel, side panels and status bar. */
import { BLEND_MODES, BLEND_LABELS, FONTS, makeCanvas, getPixels } from './doc.mjs';
import { ADJUSTMENTS, histogram, defaultParams } from './pixels.mjs';
import { TOOLS } from './tools.mjs';
import { SAMPLES, formatBytes, FORMATS } from './io.mjs';
import { MISSIONS } from './missions.mjs';
import { icon } from './icons.mjs';

export const PANEL_TABS = [['properties', 'Properties'], ['history', 'History'], ['files', 'Files'], ['missions', 'Missions'], ['info', 'Info']];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let uid = 0;
const id = (p) => `lls-${p}-${++uid}`;

const ADJ_HELP = {
  'brightness-contrast': 'Brightness slides every value up or down. Contrast pushes values away from middle gray, so darks get darker and lights get lighter.',
  'hue-saturation': 'Hue spins every color around the color wheel. Saturation turns color up or toward gray. Lightness mixes toward white or black.',
  levels: 'Values below the black point become pure black, values above the white point pure white; everything between is stretched. Gamma moves the midtones.',
  temperature: 'Adds red and takes away blue (warm), or the reverse (cool), like a colored filter on a camera lens.',
  'black-white': 'Replaces each color with its brightness: 30% red, 59% green, 11% blue, because our eyes are most sensitive to green.',
  invert: 'Every value becomes 255 minus itself: a photographic negative.',
  posterize: 'Rounds each channel to a few levels, so smooth gradients turn into flat bands, like a screen print.',
  threshold: 'Every pixel becomes pure black or pure white depending on whether its brightness is above the level.',
};

/* ── options bar ─────────────────────────────────────────────────────── */

export function renderOptions(s) {
  const t = s.tool, o = s.opts, el = s.el.options;
  const range = (k, label, min, max, scale = 1, unit = '') => {
    const i = id(k);
    const v = Math.round(o[k] * scale);
    return `<label class="lls-opt" for="${i}">${label}<input id="${i}" type="range" min="${min}" max="${max}" value="${v}" data-opt="${k}" data-scale="${scale}"><output>${v}${unit}</output></label>`;
  };
  const num = (k, label, min, max) => { const i = id(k); return `<label class="lls-opt" for="${i}">${label}<input id="${i}" type="number" min="${min}" max="${max}" value="${o[k]}" data-opt="${k}" data-scale="1"></label>`; };
  const check = (k, label) => { const i = id(k); return `<label class="lls-opt lls-check" for="${i}"><input id="${i}" type="checkbox" data-opt="${k}" ${o[k] ? 'checked' : ''}>${label}</label>`; };
  const seg = (k, label, opts) => `<span class="lls-opt lls-seg" role="group" aria-label="${label}">${opts.map(([v, txt, tip]) => `<button type="button" data-optv="${k}" data-v="${v}" aria-pressed="${o[k] === v}" title="${tip || txt}">${txt}</button>`).join('')}</span>`;
  const parts = {
    autoSelect: () => check('autoSelect', 'Auto-select layer'),
    showTransform: () => check('showTransform', 'Transform controls'),
    align: () => `<span class="lls-opt lls-seg" role="group" aria-label="Align to canvas or selection">${[['left', '⇤', 'Align left'], ['hcenter', '↔', 'Align horizontal centers'], ['right', '⇥', 'Align right'], ['top', '⤒', 'Align top'], ['vcenter', '↕', 'Align vertical centers'], ['bottom', '⤓', 'Align bottom']].map(([a, txt, tip]) => `<button type="button" data-cmd="align" data-arg="${a}" title="${tip} (to the canvas, or to the selection if there is one)" aria-label="${tip}">${txt}</button>`).join('')}</span>`,
    selMode: () => seg('selMode', 'Selection mode', [['new', 'New', 'New selection'], ['add', '+ Add', 'Add (or hold Shift)'], ['subtract', '− Sub', 'Subtract (or hold Alt)'], ['intersect', '∩', 'Intersect (Shift+Alt)']]),
    feather: () => num('feather', 'Feather px', 0, 100),
    tolerance: () => range('tolerance', 'Tolerance', 0, 255),
    contiguous: () => check('contiguous', 'Contiguous'),
    sampleAll: () => check('sampleAll', 'Sample all layers'),
    size: () => range('size', 'Size', 1, 400, 1, ' px'),
    hardness: () => range('hardness', 'Hardness', 0, 100, 100, '%'),
    opacity: () => range('opacity', 'Opacity', 1, 100, 100, '%'),
    cropApply: () => '<button type="button" class="lls-btn" data-cmd="cropApply">✓ Apply crop</button><button type="button" class="lls-btn ghost" data-cmd="cropCancel">Cancel</button>',
    gradientType: () => seg('gradientType', 'Gradient type', [['linear', 'Linear'], ['radial', 'Radial']]),
    gradientToClear: () => check('gradientToClear', 'Fade to transparent'),
    font: () => { const i = id('font'); return `<label class="lls-opt" for="${i}">Font<select id="${i}" data-opt="font">${FONTS.map(([v, l]) => `<option value="${esc(v)}" ${o.font === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`; },
    fontSize: () => num('fontSize', 'Size px', 6, 600),
    shapeType: () => seg('shapeType', 'Shape', [['rect', '▭ Rectangle'], ['ellipse', '◯ Ellipse']]),
    radius: () => num('radius', 'Corners', 0, 500),
    strokeWidth: () => num('strokeWidth', 'Stroke px', 0, 60),
  };
  el.innerHTML = `<span class="lls-opt-tool">${icon(t.id)}<b>${t.label}</b>${t.smart ? '<i class="lls-smart" title="Smart tool: the computer analyses the pixels for you">smart</i>' : ''}</span>`
    + (t.options || []).map((k) => parts[k]?.() || '').join('')
    + `<span class="lls-opt-tip">${esc(t.tip || '')}</span>`;
  el.querySelectorAll('[data-opt]').forEach((inp) => {
    const k = inp.dataset.opt, scale = +inp.dataset.scale || 1;
    const read = () => (inp.type === 'checkbox' ? inp.checked : inp.tagName === 'SELECT' ? inp.value : Math.max(+inp.min, Math.min(+inp.max, +inp.value)) / scale);
    inp.addEventListener('input', () => {
      s.setOpt(k, read(), false);
      const out = inp.parentElement.querySelector('output');
      if (out) out.textContent = inp.value + (k === 'size' ? ' px' : scale === 100 ? '%' : '');
      if (k === 'size') s.drawOverlay();
    });
  });
  el.querySelectorAll('[data-optv]').forEach((b) => b.addEventListener('click', () => s.setOpt(b.dataset.optv, b.dataset.v)));
}

/* ── status bar ──────────────────────────────────────────────────────── */

export function renderStatus(s) {
  const d = s.doc, el = s.el.status;
  if (!d) { el.innerHTML = '<span>No document open</span>'; return; }
  let pos = '', color = '';
  const p = s.hover;
  if (p && p.x >= 0 && p.y >= 0 && p.x < d.width && p.y < d.height) {
    pos = `x ${Math.floor(p.x)}, y ${Math.floor(p.y)}`;
    const c = s.colorAt(p.x, p.y, true);
    if (c) {
      const hex = '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
      color = `<span class="lls-chip" style="background:${c[3] ? hex : 'transparent'}"></span>${c[3] ? `R ${c[0]} G ${c[1]} B ${c[2]} · ${hex}` : 'transparent'}`;
    }
  }
  el.innerHTML = `<span><button type="button" data-cmd="zoomOut" aria-label="Zoom out">−</button><b>${Math.round(s.view.zoom * 100)}%</b><button type="button" data-cmd="zoomIn" aria-label="Zoom in">+</button><button type="button" data-cmd="fit">Fit</button></span>
    <span>${d.width} × ${d.height} px</span><span>${pos}</span><span class="lls-status-color">${color}</span>
    <span class="lls-status-active">${d.active ? `Editing: <b>${esc(d.active.name)}</b>${d.active.editMask && d.active.mask ? ' (mask)' : ''}` : ''}</span>`;
}

/* ── layers panel ────────────────────────────────────────────────────── */

function thumb(s, L, w = 44, h = 34) {
  const c = makeCanvas(w * 2, h * 2), ctx = c.getContext('2d');
  const d = s.doc;
  const k = Math.min(c.width / d.width, c.height / d.height);
  const ox = (c.width - d.width * k) / 2, oy = (c.height - d.height * k) / 2;
  ctx.fillStyle = '#e4e4e7'; ctx.fillRect(ox, oy, d.width * k, d.height * k);
  ctx.fillStyle = '#fafafa';
  for (let y = 0; y < c.height; y += 8) for (let x = (y / 8) % 2 ? 8 : 0; x < c.width; x += 16) ctx.fillRect(x, y, 8, 8);
  ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, d.width * k, d.height * k); ctx.clip();
  const surf = d.surface(L);
  if (surf) ctx.drawImage(surf.canvas, ox + surf.x * k, oy + surf.y * k, surf.canvas.width * k, surf.canvas.height * k);
  ctx.restore();
  return c;
}

function maskThumb(s, L, w = 44, h = 34) {
  const c = makeCanvas(w * 2, h * 2), ctx = c.getContext('2d'), d = s.doc;
  const k = Math.min(c.width / d.width, c.height / d.height);
  const ox = (c.width - d.width * k) / 2, oy = (c.height - d.height * k) / 2;
  ctx.fillStyle = '#fff'; ctx.fillRect(ox, oy, d.width * k, d.height * k);
  ctx.fillStyle = '#000'; ctx.fillRect(ox + L.mask.x * k, oy + L.mask.y * k, L.mask.canvas.width * k, L.mask.canvas.height * k);
  const m = makeCanvas(c.width, c.height), mc = m.getContext('2d');
  mc.drawImage(L.mask.canvas, ox + L.mask.x * k, oy + L.mask.y * k, L.mask.canvas.width * k, L.mask.canvas.height * k);
  ctx.drawImage(m, 0, 0);
  if (L.mask.enabled === false) { ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(c.width, c.height); ctx.moveTo(c.width, 0); ctx.lineTo(0, c.height); ctx.stroke(); }
  return c;
}

export function renderLayers(s) {
  const el = s.el.layers, d = s.doc;
  if (!d) { el.innerHTML = '<h3 class="lls-ptitle">Layers</h3><p class="lls-empty">No document open.</p>'; return; }
  const A = d.active;
  const bid = id('blend'), oid = id('opacity');
  el.innerHTML = `<h3 class="lls-ptitle">Layers <small>${d.layers.length}</small></h3>
    <div class="lls-lhead">
      <label for="${bid}" class="lls-sr">Blend mode</label>
      <select id="${bid}" class="lls-blend" ${!A || A.kind === 'adjust' ? 'disabled' : ''} title="Blend mode: how this layer's colors mix with the layers below">${BLEND_MODES.map((m) => `<option value="${m}" ${A?.blend === m ? 'selected' : ''}>${BLEND_LABELS[m]}</option>`).join('')}</select>
      <label for="${oid}" class="lls-opac">Opacity <input id="${oid}" type="range" min="0" max="100" value="${Math.round((A?.opacity ?? 1) * 100)}" ${A ? '' : 'disabled'}><output>${Math.round((A?.opacity ?? 1) * 100)}%</output></label>
    </div>
    <ul class="lls-llist" role="listbox" aria-label="Layers, top to bottom"></ul>
    <div class="lls-lfoot">
      <button type="button" data-cmd="newLayer" title="New layer" aria-label="New layer">${icon('plus')}</button>
      <button type="button" data-cmd="newAdjust" title="New adjustment layer" aria-label="New adjustment layer">${icon('adjust')}</button>
      <button type="button" data-cmd="addMask" title="Add layer mask" aria-label="Add layer mask">${icon('mask')}</button>
      <button type="button" data-cmd="fx" title="Layer effects" aria-label="Layer effects">${icon('fx')}</button>
      <button type="button" data-cmd="dup" title="Duplicate layer (or Layer via Copy if something is selected)" aria-label="Duplicate layer">${icon('dup')}</button>
      <button type="button" data-cmd="raise" title="Move layer up" aria-label="Move layer up">${icon('up')}</button>
      <button type="button" data-cmd="lower" title="Move layer down" aria-label="Move layer down">${icon('down')}</button>
      <button type="button" data-cmd="deleteLayer" title="Delete layer" aria-label="Delete layer">${icon('trash')}</button>
    </div>`;
  const list = el.querySelector('.lls-llist');
  [...d.layers].reverse().forEach((L) => {
    const li = document.createElement('li');
    const on = L.id === d.activeId;
    li.className = `lls-lrow${on ? ' on' : ''}${L.visible ? '' : ' hidden'}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(on));
    li.draggable = true;
    li.dataset.id = L.id;
    const fx = L.fx && (L.fx.shadow.on || L.fx.stroke.on || L.fx.glow.on);
    const badge = { text: 'T', shape: '▭', adjust: '◑', pixel: '' }[L.kind];
    li.innerHTML = `<button type="button" class="lls-eye" data-act="eye" aria-pressed="${L.visible}" aria-label="${L.visible ? 'Hide' : 'Show'} ${esc(L.name)}" title="Show/hide">${icon(L.visible ? 'eye' : 'eyeOff')}</button>
      <span class="lls-thumb${on && !(L.editMask && L.mask) ? ' target' : ''}" data-act="pixels" title="${L.kind === 'adjust' ? 'Adjustment layer' : 'Layer content: click to edit pixels'}"></span>
      ${L.mask ? `<span class="lls-thumb lls-mthumb${on && L.editMask ? ' target' : ''}" data-act="mask" title="Layer mask: click to paint on it (black hides, white shows). Shift-click turns it off."></span>` : ''}
      <span class="lls-lname" data-act="select">${badge ? `<i class="lls-kind">${badge}</i>` : ''}<span>${esc(L.name)}</span>${fx ? '<i class="lls-fxb" title="Has layer effects">fx</i>' : ''}${L.blend !== 'normal' ? `<i class="lls-mode">${BLEND_LABELS[L.blend]}</i>` : ''}</span>
      <button type="button" class="lls-lock${L.locked ? ' on' : ''}" data-act="lock" aria-pressed="${L.locked}" aria-label="${L.locked ? 'Unlock' : 'Lock'} ${esc(L.name)}" title="Lock">${icon(L.locked ? 'lock' : 'unlock')}</button>`;
    const t = li.querySelector('[data-act="pixels"]');
    if (L.kind === 'adjust') t.innerHTML = `<span class="lls-adj-ico">${icon('adjust')}</span>`; else t.append(thumb(s, L));
    if (L.mask) li.querySelector('[data-act="mask"]').append(maskThumb(s, L));
    list.append(li);
  });

  list.addEventListener('click', (e) => {
    const row = e.target.closest('.lls-lrow'); if (!row) return;
    const L = d.layers.find((l) => l.id === +row.dataset.id);
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'eye') { L.visible = !L.visible; s.commit(L.visible ? 'Show Layer' : 'Hide Layer'); return; }
    if (act === 'lock') { L.locked = !L.locked; s.commit(L.locked ? 'Lock Layer' : 'Unlock Layer'); return; }
    if (act === 'mask' && e.shiftKey) { d.activeId = L.id; s.run('toggleMask'); return; }
    d.activeId = L.id;
    if (act === 'mask') L.editMask = true;
    if (act === 'pixels') L.editMask = false;
    s.changed();
    s.refreshPanels();
  });
  list.addEventListener('dblclick', (e) => {
    const nameEl = e.target.closest('.lls-lname'); if (!nameEl) return;
    const row = nameEl.closest('.lls-lrow');
    const L = d.layers.find((l) => l.id === +row.dataset.id);
    const inp = document.createElement('input');
    inp.value = L.name; inp.className = 'lls-rename'; inp.setAttribute('aria-label', 'Layer name');
    nameEl.replaceWith(inp); inp.focus(); inp.select();
    let done = false;
    const finish = (save) => {
      if (done) return; done = true;
      if (save && inp.value.trim() && inp.value.trim() !== L.name) { L.name = inp.value.trim().slice(0, 60); L.renamed = true; s.commit('Rename Layer', { event: 'rename' }); }
      else renderLayers(s);
    };
    inp.addEventListener('keydown', (k) => { if (k.key === 'Enter') finish(true); if (k.key === 'Escape') finish(false); k.stopPropagation(); });
    inp.addEventListener('blur', () => finish(true));
  });
  list.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const i = d.indexOf(A), j = e.key === 'ArrowUp' ? i + 1 : i - 1;
    if (d.layers[j]) { d.activeId = d.layers[j].id; s.refreshPanels(); s.el.layers.querySelector('.lls-lrow.on .lls-lname')?.focus(); }
  });
  list.querySelectorAll('.lls-lname').forEach((n) => { n.tabIndex = 0; n.addEventListener('keydown', (e) => { if (e.key === 'Enter') n.click(); if (e.key === 'F2') n.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); }); });
  let dragId = null;
  list.addEventListener('dragstart', (e) => { dragId = +e.target.closest('.lls-lrow')?.dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'layer'); });
  list.addEventListener('dragover', (e) => { if (dragId) { e.preventDefault(); list.querySelectorAll('.drop').forEach((x) => x.classList.remove('drop')); e.target.closest('.lls-lrow')?.classList.add('drop'); } });
  list.addEventListener('drop', (e) => {
    e.preventDefault();
    const row = e.target.closest('.lls-lrow');
    if (!dragId || !row) return;
    const from = d.layers.findIndex((l) => l.id === dragId), to = d.layers.findIndex((l) => l.id === +row.dataset.id);
    dragId = null;
    if (from !== to) s.run('moveLayer', [from, to]); else renderLayers(s);
  });
  list.addEventListener('dragend', () => { dragId = null; list.querySelectorAll('.drop').forEach((x) => x.classList.remove('drop')); });

  el.querySelector('.lls-blend').addEventListener('change', (e) => { if (A) { A.blend = e.target.value; s.commit(`Blend: ${BLEND_LABELS[A.blend]}`, { event: 'blend' }); } });
  const op = el.querySelector(`#${oid}`);
  op.addEventListener('input', () => { if (!A) return; A.opacity = op.value / 100; op.nextElementSibling.textContent = `${op.value}%`; s.changed(); });
  op.addEventListener('change', () => { if (A) s.commit(`Opacity ${op.value}%`, { event: 'opacity' }); });
}

/* ── side panels ─────────────────────────────────────────────────────── */

export function renderPanels(s) {
  for (const b of s.el.ptabs.querySelectorAll('[data-ptab]')) {
    const on = b.dataset.ptab === s.panelTab;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', String(on));
    if (b.dataset.ptab === 'missions') b.innerHTML = `Missions <small>${s.missions.done.size}/${MISSIONS.length}</small>`;
  }
  const body = s.el.pbody;
  const keepScroll = body.dataset.tab === s.panelTab ? body.scrollTop : 0;
  body.dataset.tab = s.panelTab;
  ({ properties, history, files, missions, info })[s.panelTab](s, body);
  body.scrollTop = keepScroll;
}

function field(label, html, cls = '') { return `<label class="lls-field ${cls}"><span>${label}</span>${html}</label>`; }

function properties(s, body) {
  const d = s.doc, L = d?.active;
  if (!L) { body.innerHTML = '<p class="lls-empty">Pick a layer to see its properties.</p>'; return; }
  const kindName = { pixel: 'Pixel layer', text: 'Text layer (live)', shape: 'Shape layer (live)', adjust: 'Adjustment layer' }[L.kind];
  let html = `<div class="lls-prop-head"><b>${esc(L.name)}</b><small>${kindName}</small></div>`;
  if (L.kind === 'text') {
    const t = L.text;
    html += `<label class="lls-field lls-wide"><span>Text</span><textarea data-t="content" rows="3">${esc(t.content)}</textarea></label>
      <div class="lls-grid2">
        ${field('Font', `<select data-t="font">${FONTS.map(([v, l]) => `<option value="${esc(v)}" ${t.font === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
        ${field('Size', `<input type="number" min="4" max="1000" data-t="size" value="${t.size}">`)}
        ${field('Color', `<input type="color" data-t="color" value="${t.color}">`)}
        ${field('Line height', `<input type="number" min="0.6" max="3" step="0.05" data-t="lineHeight" value="${t.lineHeight}">`)}
        ${field('Letter spacing', `<input type="number" min="-20" max="80" data-t="tracking" value="${t.tracking || 0}">`)}
        ${field('Align', `<select data-t="align">${['left', 'center', 'right'].map((a) => `<option ${t.align === a ? 'selected' : ''}>${a}</option>`).join('')}</select>`)}
      </div>
      <div class="lls-row"><label class="lls-check"><input type="checkbox" data-t="bold" ${t.bold ? 'checked' : ''}> Bold</label><label class="lls-check"><input type="checkbox" data-t="italic" ${t.italic ? 'checked' : ''}> Italic</label></div>
      <p class="lls-note">Live text is drawn fresh from these settings every time, so it stays sharp at any size. Exporting to PSD, ORA, PNG or JPEG turns it into pixels.</p>`;
  }
  if (L.kind === 'shape') {
    const sh = L.shape;
    html += `<div class="lls-grid2">
      ${field('Shape', `<select data-sh="type"><option value="rect" ${sh.type === 'rect' ? 'selected' : ''}>Rectangle</option><option value="ellipse" ${sh.type === 'ellipse' ? 'selected' : ''}>Ellipse</option></select>`)}
      ${field('Corners', `<input type="number" min="0" max="999" data-sh="radius" value="${sh.radius || 0}">`)}
      ${field('Width', `<input type="number" min="1" max="20000" data-sh="w" value="${sh.w}">`)}
      ${field('Height', `<input type="number" min="1" max="20000" data-sh="h" value="${sh.h}">`)}
      ${field('Fill', `<input type="color" data-sh="fill" value="${sh.fill === 'none' ? '#ffffff' : sh.fill}">`)}
      ${field('Stroke', `<input type="color" data-sh="stroke" value="${sh.stroke}">`)}
      ${field('Stroke width', `<input type="number" min="0" max="200" data-sh="strokeWidth" value="${sh.strokeWidth}">`)}
      </div><label class="lls-check"><input type="checkbox" data-sh-nofill ${sh.fill === 'none' ? 'checked' : ''}> No fill (outline only)</label>`;
  }
  if (L.kind === 'adjust') {
    const a = ADJUSTMENTS[L.adjust.kind];
    html += `<p class="lls-note">${ADJ_HELP[L.adjust.kind]}</p>`;
    for (const [k, [def, min, max, step = 1]] of Object.entries(a.params)) {
      const v = L.adjust.params[k] ?? def;
      html += `<label class="lls-field lls-wide lls-slider"><span>${k[0].toUpperCase() + k.slice(1)}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-adj="${k}"><output>${v}</output></label>`;
    }
    if (!Object.keys(a.params).length) html += '<p class="lls-note">No settings: paint its mask, lower its opacity, or hide it with the eye to compare.</p>';
    else html += '<button type="button" class="lls-btn ghost" data-adj-reset>Reset</button>';
    html += '<p class="lls-note">This layer changes how everything <em>below</em> it looks, but no pixels are changed. Hide it and the original is back.</p>';
  }
  if (L.kind === 'pixel') {
    html += `<p class="lls-note">A grid of ${L.canvas.width} × ${L.canvas.height} pixels. Paint, erase and adjust it directly; Undo is the only way back, so consider a mask or an adjustment layer instead.</p>`;
  }
  if (L.kind !== 'adjust') {
    html += `<div class="lls-grid2">${field('X', `<input type="number" data-pos="x" value="${Math.round(L.x)}">`)}${field('Y', `<input type="number" data-pos="y" value="${Math.round(L.y)}">`)}</div>`;
  }
  if (L.mask) {
    html += `<fieldset class="lls-fs"><legend>Layer mask</legend>
      <div class="lls-seg" role="group" aria-label="Paint target"><button type="button" data-target="pixels" aria-pressed="${!L.editMask}" ${L.kind !== 'pixel' ? 'disabled' : ''}>Edit pixels</button><button type="button" data-target="mask" aria-pressed="${!!L.editMask}">Edit mask</button></div>
      <label class="lls-check"><input type="checkbox" data-mask-on ${L.mask.enabled !== false ? 'checked' : ''}> Mask on</label>
      <div class="lls-row"><button type="button" class="lls-btn ghost" data-cmd="invertMask">Invert</button>${L.kind === 'pixel' ? '<button type="button" class="lls-btn ghost" data-cmd="applyMask">Apply</button>' : ''}<button type="button" class="lls-btn ghost" data-cmd="deleteMask">Delete</button></div>
      <p class="lls-note">Black hides, white shows, gray is see-through. The pixels underneath are untouched.</p></fieldset>`;
  } else if (L.kind !== 'adjust') {
    html += '<button type="button" class="lls-btn ghost" data-cmd="addMask">◐ Add a mask</button>';
  }
  if (L.kind !== 'adjust') {
    const f = L.fx;
    const color = (g, k) => `<input type="color" data-fx="${g}.${k}" value="${f[g][k]}" aria-label="${g} color">`;
    const n = (g, k, min, max, step = 1) => `<input type="number" min="${min}" max="${max}" step="${step}" data-fx="${g}.${k}" value="${f[g][k]}" aria-label="${g} ${k}">`;
    html += `<fieldset class="lls-fs lls-fx"><legend>Layer effects</legend>
      <div class="lls-fxrow"><label class="lls-check"><input type="checkbox" data-fx="shadow.on" ${f.shadow.on ? 'checked' : ''}> Drop shadow</label>${color('shadow', 'color')}<span>x</span>${n('shadow', 'dx', -200, 200)}<span>y</span>${n('shadow', 'dy', -200, 200)}<span>blur</span>${n('shadow', 'blur', 0, 200)}<span>opacity</span>${n('shadow', 'opacity', 0, 1, 0.05)}</div>
      <div class="lls-fxrow"><label class="lls-check"><input type="checkbox" data-fx="stroke.on" ${f.stroke.on ? 'checked' : ''}> Stroke</label>${color('stroke', 'color')}<span>width</span>${n('stroke', 'width', 1, 60)}</div>
      <div class="lls-fxrow"><label class="lls-check"><input type="checkbox" data-fx="glow.on" ${f.glow.on ? 'checked' : ''}> Outer glow</label>${color('glow', 'color')}<span>size</span>${n('glow', 'blur', 1, 200)}<span>opacity</span>${n('glow', 'opacity', 0, 1, 0.05)}</div>
      <p class="lls-note">Effects are recipes, not pixels: change the text and its shadow follows.</p></fieldset>`;
  }
  body.innerHTML = html;

  const live = (label, event) => ({ input: () => s.changed(), change: () => s.commit(label, { event }) });
  body.querySelectorAll('[data-t]').forEach((inp) => {
    const k = inp.dataset.t;
    const read = () => (inp.type === 'checkbox' ? inp.checked : inp.type === 'number' ? +inp.value : inp.value);
    inp.addEventListener('input', () => { L.text[k] = read(); s.changed(); });
    inp.addEventListener('change', () => { L.text[k] = read(); if (k === 'content') L.name = (L.text.content.split('\n')[0] || 'Text').slice(0, 40); s.commit('Edit Text', { event: 'text-edit' }); });
  });
  body.querySelectorAll('[data-sh]').forEach((inp) => {
    const k = inp.dataset.sh;
    const h = live('Edit Shape', 'shape-edit');
    inp.addEventListener('input', () => { L.shape[k] = inp.type === 'number' ? +inp.value : inp.value; h.input(); });
    inp.addEventListener('change', h.change);
  });
  body.querySelector('[data-sh-nofill]')?.addEventListener('change', (e) => { L.shape.fill = e.target.checked ? 'none' : s.colors.fg; s.commit('Edit Shape'); });
  body.querySelectorAll('[data-adj]').forEach((inp) => {
    const k = inp.dataset.adj;
    inp.addEventListener('input', () => { L.adjust.params[k] = +inp.value; inp.nextElementSibling.textContent = inp.value; s.changed(); });
    inp.addEventListener('change', () => s.commit(`Edit ${ADJUSTMENTS[L.adjust.kind].label}`, { event: 'adjust-edit' }));
  });
  body.querySelector('[data-adj-reset]')?.addEventListener('click', () => { L.adjust.params = defaultParams(L.adjust.kind); s.commit('Reset adjustment'); });
  body.querySelectorAll('[data-pos]').forEach((inp) => inp.addEventListener('change', () => {
    const k = inp.dataset.pos, dv = Math.round(+inp.value) - L[k];
    L[k] += dv;
    if (L.mask) L.mask[k] += dv;
    s.commit('Move', { event: 'move' });
  }));
  body.querySelectorAll('[data-target]').forEach((b) => b.addEventListener('click', () => { L.editMask = b.dataset.target === 'mask'; s.refreshPanels(); }));
  body.querySelector('[data-mask-on]')?.addEventListener('change', () => s.run('toggleMask'));
  body.querySelectorAll('[data-fx]').forEach((inp) => {
    const [g, k] = inp.dataset.fx.split('.');
    const read = () => (inp.type === 'checkbox' ? inp.checked : inp.type === 'number' ? +inp.value : inp.value);
    inp.addEventListener('input', () => { L.fx[g][k] = read(); s.changed(); });
    inp.addEventListener('change', () => { L.fx[g][k] = read(); s.commit('Layer Effects', { event: 'fx' }); });
  });
}

function history(s, body) {
  const d = s.doc;
  if (!d) { body.innerHTML = '<p class="lls-empty">No document open.</p>'; return; }
  body.innerHTML = `<ol class="lls-hist">${d.history.map((h, i) => `<li><button type="button" data-cmd="history" data-arg="${i}" class="${i === d.historyIndex ? 'on' : i > d.historyIndex ? 'future' : ''}" aria-current="${i === d.historyIndex ? 'step' : 'false'}">${esc(h.label)}</button></li>`).join('')}</ol>
    <p class="lls-note">Click a step to travel back. Make a new change from there and the grayed-out future is discarded. Layer Lab keeps the last 40 steps; each one stores only the layers it changed.</p>`;
  body.querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'nearest' });
}

const TYPE_ICON = { png: 'photo', jpeg: 'photo', jpg: 'photo', webp: 'photo', gif: 'photo', psd: 'layers', ora: 'layers', layerlab: 'layers' };

function files(s, body) {
  body.innerHTML = `<div class="lls-files-head"><b>Workshop Drive</b><small>Saved in this browser only</small></div>
    <div class="lls-row"><button type="button" class="lls-btn" data-files="upload">${icon('open')} Add from computer</button><button type="button" class="lls-btn ghost" data-cmd="export">Export current…</button></div>
    <ul class="lls-files" aria-label="Your files"><li class="lls-empty">Loading…</li></ul>
    <h4 class="lls-sub">Sample files</h4>
    <ul class="lls-files lls-samples">${SAMPLES.map((x) => `<li><span class="lls-fico">${icon(x.kind === 'build' && x.id === 'poster' ? 'layers' : 'photo')}</span><span class="lls-fname"><b>${esc(x.name)}</b><small>${esc(x.about)} <i>${esc(x.credit)}</i></small></span>
      <span class="lls-factions"><button type="button" data-sample="${x.id}">Open</button>${x.kind === 'url' ? `<button type="button" data-place-sample="${x.id}" title="Add to the open document as a new layer">Place</button>` : ''}</span></li>`).join('')}</ul>`;
  body.querySelector('[data-files="upload"]').onclick = () => { s.fileMode = 'drive'; s.el.file.click(); };
  body.querySelectorAll('[data-sample]').forEach((b) => (b.onclick = () => s.openSample(b.dataset.sample)));
  body.querySelectorAll('[data-place-sample]').forEach((b) => (b.onclick = () => s.openSample(b.dataset.placeSample, { place: true })));
  s.drive.list().then((rows) => {
    const ul = body.querySelector('.lls-files');
    if (!ul) return;
    if (!rows.length) { ul.innerHTML = '<li class="lls-empty">Nothing here yet. Export or save a project and it appears here, with its file size.</li>'; return; }
    ul.innerHTML = rows.map((r) => `<li data-file="${r.id}"><span class="lls-fico">${icon(TYPE_ICON[r.type] || 'photo')}</span>
      <span class="lls-fname"><b>${esc(r.name)}</b><small>${formatBytes(r.size)} · ${FORMATS[r.type]?.label || r.type.toUpperCase()} · ${r.source === 'export' ? 'exported' : r.source === 'upload' ? 'uploaded' : r.source} ${new Date(r.created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></span>
      <span class="lls-factions"><button type="button" data-fopen>Open</button><button type="button" data-fplace title="Add to the open document as a new layer">Place</button><button type="button" data-fdl aria-label="Download ${esc(r.name)}" title="Download to your computer">${icon('download')}</button><button type="button" data-fdel aria-label="Delete ${esc(r.name)}" title="Delete">${icon('trash')}</button></span></li>`).join('');
    ul.querySelectorAll('[data-file]').forEach((li) => {
      const rid = +li.dataset.file;
      const rec = rows.find((r) => r.id === rid);
      li.querySelector('[data-fopen]').onclick = () => s.openBlob(rec.blob, rec.name, { source: rec.source, driveId: rid });
      li.querySelector('[data-fplace]').onclick = () => s.placeBlob(rec.blob, rec.name);
      li.querySelector('[data-fdl]').onclick = async () => { const { download } = await import('./io.mjs'); download(rec.blob, rec.name); };
      li.querySelector('[data-fdel]').onclick = () => { if (confirm(`Delete ${rec.name} from the Workshop Drive?`)) s.drive.remove(rid); };
    });
  });
}

function missions(s, body) {
  const done = s.missions.done;
  body.innerHTML = `<div class="lls-files-head"><b>Workshop missions</b><small>${done.size} of ${MISSIONS.length} done · they check themselves</small></div>
    <div class="lls-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${MISSIONS.length}" aria-valuenow="${done.size}"><span style="width:${(done.size / MISSIONS.length) * 100}%"></span></div>
    <ol class="lls-missions">${MISSIONS.map((m) => `<li class="${done.has(m.id) ? 'done' : ''}"><span class="lls-mcheck" aria-hidden="true">${done.has(m.id) ? '✓' : ''}</span><div><b>${esc(m.title)}</b><span class="lls-sr">${done.has(m.id) ? ' (done)' : ''}</span><p>${esc(m.goal)}</p><details><summary>How?</summary><p>${esc(m.how)}</p></details></div></li>`).join('')}</ol>
    <button type="button" class="lls-btn ghost" data-mreset>Reset missions</button>`;
  body.querySelector('[data-mreset]').onclick = () => { if (confirm('Clear all mission check marks?')) { s.missions.reset(); s.refreshPanels(); } };
}

function info(s, body) {
  const d = s.doc;
  if (!d) { body.innerHTML = '<p class="lls-empty">No document open.</p>'; return; }
  d.render();
  const h = histogram(getPixels(d.composite));
  const px = d.width * d.height;
  const pixelLayers = d.layers.filter((l) => l.kind === 'pixel');
  const mem = pixelLayers.reduce((a, l) => a + l.canvas.width * l.canvas.height * 4, 0) + d.layers.filter((l) => l.mask).length * px * 4;
  const selCount = d.selection ? s.selectionAlpha().reduce((a, v) => a + (v >= 128 ? 1 : 0), 0) : 0;
  body.innerHTML = `<h4 class="lls-sub">Histogram</h4><canvas class="lls-histo" width="512" height="200" aria-label="Histogram of the whole image: how many pixels have each brightness from 0 (left) to 255 (right)."></canvas>
    <p class="lls-note">How many pixels have each brightness, dark on the left, light on the right. A pile at either end means clipped shadows or highlights; Levels and Auto Tone stretch a squashed histogram.</p>
    <dl class="lls-stats">
      <dt>Canvas</dt><dd>${d.width} × ${d.height} px = ${(px / 1e6).toFixed(2)} megapixels</dd>
      <dt>Layers</dt><dd>${d.layers.length} (${pixelLayers.length} pixel, ${d.layers.filter((l) => l.kind === 'text').length} text, ${d.layers.filter((l) => l.kind === 'shape').length} shape, ${d.layers.filter((l) => l.kind === 'adjust').length} adjustment)</dd>
      <dt>Memory</dt><dd>${formatBytes(mem)} uncompressed (4 bytes per pixel: red, green, blue, alpha)</dd>
      <dt>Selection</dt><dd>${d.selection ? `${selCount.toLocaleString()} pixels (${((selCount / px) * 100).toFixed(1)}%)` : 'none'}</dd>
      <dt>Print size</dt><dd>${(d.width / 300).toFixed(1)} × ${(d.height / 300).toFixed(1)} in at 300 ppi · ${(d.width / 150).toFixed(1)} × ${(d.height / 150).toFixed(1)} in at 150 ppi</dd>
    </dl>`;
  const c = body.querySelector('.lls-histo'), ctx = c.getContext('2d');
  const max = Math.max(1, ...[...h.l].slice(1, 255), ...[...h.r].slice(1, 255), ...[...h.g].slice(1, 255), ...[...h.b].slice(1, 255));
  ctx.fillStyle = '#16181d'; ctx.fillRect(0, 0, 512, 200);
  ctx.globalCompositeOperation = 'lighter';
  for (const [ch, col] of [['r', '#ef4444'], ['g', '#22c55e'], ['b', '#3b82f6']]) {
    ctx.fillStyle = col; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(0, 200);
    for (let i = 0; i < 256; i++) ctx.lineTo(i * 2, 200 - Math.min(1, h[ch][i] / max) * 195);
    ctx.lineTo(512, 200); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.strokeStyle = '#f5f5f5'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < 256; i++) { const y = 200 - Math.min(1, h.l[i] / max) * 195; i ? ctx.lineTo(i * 2, y) : ctx.moveTo(0, y); }
  ctx.stroke();
}

export { TOOLS };
