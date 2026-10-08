/* dialogs.mjs — Layer Lab's modal dialogs: new document, export, import
 * report, adjustments and filters with live preview, image/canvas size,
 * selection tools, shortcuts and about.
 */
import { LayerDoc, makeCanvas, getPixels, alphaOf, canvasFromAlpha } from './doc.mjs';
import { ADJUSTMENTS, defaultParams, applyAdjustment, blur, sharpen, addNoise, pixelate, colorRange as colorRangeMask, expandMask, featherMask } from './pixels.mjs';
import { FORMATS, exportDoc, formatBytes, download } from './io.mjs';
import { TOOLS, TOOLBOX } from './tools.mjs';
import { icon } from './icons.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function openDialog(s, { title, body, buttons = [['ok', 'OK', true], ['cancel', 'Cancel']], wide, onOpen, onClose }) {
  const dlg = s.el.dialog;
  dlg.className = 'lls-dialog' + (wide ? ' wide' : '');
  dlg.innerHTML = `<form method="dialog" class="lls-dlg">
    <header><h3>${title}</h3><button type="submit" value="cancel" class="lls-x" aria-label="Close">×</button></header>
    <div class="lls-dlg-body">${body}</div>
    <footer>${buttons.map(([v, label, primary]) => `<button type="submit" value="${v}" class="lls-btn${primary ? '' : ' ghost'}">${label}</button>`).join('')}</footer></form>`;
  dlg.returnValue = '';
  dlg.onclose = () => onClose?.(dlg.returnValue || 'cancel');
  dlg.showModal();
  onOpen?.(dlg);
  return dlg;
}

/* ── new document ────────────────────────────────────────────────────── */

const PRESETS = [
  ['Portrait poster', 1080, 1350], ['Square post', 1080, 1080], ['Slide / video (16:9)', 1920, 1080], ['Web banner', 1200, 630],
  ['Letter page at 150 ppi', 1275, 1650], ['Phone wallpaper', 1080, 1920], ['Pixel art', 64, 64],
];

export function newDoc(s) {
  openDialog(s, {
    title: 'New document',
    body: `<div class="lls-presets" role="radiogroup" aria-label="Size presets">${PRESETS.map(([n, w, h], i) => `<label><input type="radio" name="preset" value="${i}" ${i === 0 ? 'checked' : ''}><b>${n}</b><small>${w} × ${h}</small></label>`).join('')}</div>
      <div class="lls-grid3">
        <label class="lls-field"><span>Name</span><input name="name" value="Untitled"></label>
        <label class="lls-field"><span>Width px</span><input name="w" type="number" min="1" max="8000" value="1080"></label>
        <label class="lls-field"><span>Height px</span><input name="h" type="number" min="1" max="8000" value="1350"></label>
      </div>
      <label class="lls-field"><span>Background</span><select name="bg"><option value="white">White</option><option value="clear">Transparent</option><option value="fg">Foreground color</option></select></label>
      <p class="lls-note lls-mem"></p>`,
    buttons: [['ok', 'Create', true], ['cancel', 'Cancel']],
    onOpen(dlg) {
      const f = dlg.querySelector('form');
      const mem = () => { f.querySelector('.lls-mem').textContent = `${(+f.w.value * +f.h.value / 1e6).toFixed(2)} megapixels · each pixel layer needs ${formatBytes(+f.w.value * +f.h.value * 4)} of memory.`; };
      f.querySelectorAll('[name=preset]').forEach((r) => r.addEventListener('change', () => { const [, w, h] = PRESETS[+r.value]; f.w.value = w; f.h.value = h; mem(); }));
      f.w.addEventListener('input', mem); f.h.addEventListener('input', mem); mem();
    },
    onClose(v) {
      if (v !== 'ok') return;
      const f = s.el.dialog.querySelector('form');
      const w = Math.max(1, Math.min(8000, +f.w.value | 0)), h = Math.max(1, Math.min(8000, +f.h.value | 0));
      const doc = new LayerDoc(w, h, f.name.value.trim() || 'Untitled');
      const c = makeCanvas(w, h);
      if (f.bg.value !== 'clear') { const x = c.getContext('2d'); x.fillStyle = f.bg.value === 'fg' ? s.colors.fg : '#ffffff'; x.fillRect(0, 0, w, h); }
      doc.addPixelLayer('Background', c);
      s.openDoc(doc, { label: 'New document', event: { type: 'new-doc', detail: { w, h } } });
    },
  });
}

/* ── export ──────────────────────────────────────────────────────────── */

const KEEPS = [['layers', 'Layers'], ['transparency', 'Transparency'], ['text', 'Editable text'], ['masks', 'Masks'], ['adjust', 'Adjustment layers'], ['lossy', 'Lossless (no detail thrown away)']];

export function exportDialog(s) {
  const d = s.doc;
  openDialog(s, {
    title: 'Export As',
    wide: true,
    body: `<div class="lls-export">
      <div class="lls-formats" role="radiogroup" aria-label="Format">${Object.entries(FORMATS).map(([k, f], i) => `<label><input type="radio" name="fmt" value="${k}" ${i === 0 ? 'checked' : ''}><b>${f.label}</b><small>.${f.ext}</small></label>`).join('')}</div>
      <div class="lls-export-side">
        <p class="lls-fmt-use"></p>
        <table class="lls-keeps"><tbody></tbody></table>
        <div class="lls-grid3">
          <label class="lls-field"><span>File name</span><input name="fname" value="${esc(d.name)}"></label>
          <label class="lls-field lls-q"><span>Quality <output>85</output></span><input name="q" type="range" min="5" max="100" value="85"></label>
          <label class="lls-field lls-scale"><span>Scale</span><select name="scale"><option value="0.25">25%</option><option value="0.5">50%</option><option value="1" selected>100%</option><option value="2">200%</option></select></label>
        </div>
        <div class="lls-estimate"><canvas class="lls-qprev" width="240" height="160" aria-label="Close-up of the exported pixels at 200%"></canvas><div><b class="lls-size">…</b><small>Estimated file size. Opens in: <span class="lls-opens"></span></small><ul class="lls-notes"></ul></div></div>
      </div></div>`,
    buttons: [['download', `${icon('download')} Download + save to Drive`, true], ['drive', 'Save to Workshop Drive'], ['cancel', 'Cancel']],
    onOpen(dlg) {
      const f = dlg.querySelector('form');
      let timer, token = 0;
      const update = () => {
        const fmt = f.fmt.value, F = FORMATS[fmt];
        f.querySelector('.lls-fmt-use').textContent = F.use;
        f.querySelector('.lls-opens').textContent = F.opens;
        f.querySelector('.lls-keeps tbody').innerHTML = KEEPS.map(([k, label]) => {
          const ok = k === 'lossy' ? !F.lossy : F[k];
          return `<tr class="${ok ? 'yes' : 'no'}"><td>${ok ? '✓' : '✗'}</td><td>${label}</td></tr>`;
        }).join('');
        f.querySelector('.lls-q').hidden = !F.quality;
        f.querySelector('.lls-scale').hidden = F.layers;
        f.querySelector('.lls-q output').textContent = f.q.value;
        f.querySelector('.lls-size').textContent = '…';
        clearTimeout(timer);
        const my = ++token;
        timer = setTimeout(async () => {
          try {
            const { blob, notes } = await exportDoc(d, fmt, { quality: f.q.value / 100, scale: +f.scale.value, filename: f.fname.value });
            if (my !== token) return;
            const raw = d.width * d.height * 4 * (F.layers ? d.layers.length : 1) * (F.layers ? 1 : (+f.scale.value) ** 2);
            f.querySelector('.lls-size').textContent = `${formatBytes(blob.size)}  (${Math.max(1, Math.round((blob.size / raw) * 100))}% of the raw pixels)`;
            f.querySelector('.lls-notes').innerHTML = notes.map((n) => `<li>${esc(n)}</li>`).join('');
            previewPixels(f.querySelector('.lls-qprev'), F.layers ? null : blob, d);
          } catch (err) { if (my === token) f.querySelector('.lls-size').textContent = `Error: ${err.message}`; }
        }, 250);
      };
      f.addEventListener('input', update);
      update();
    },
    async onClose(v) {
      if (v !== 'download' && v !== 'drive') return;
      const f = s.el.dialog.querySelector('form');
      try {
        const { filename, blob } = await s.exportAs(f.fmt.value, { quality: f.q.value / 100, scale: +f.scale.value, filename: f.fname.value, download: v === 'download' });
        s.toast(`Exported ${filename} (${formatBytes(blob.size)}). It's in the Files tab.`);
        if (s.panelTab === 'files') s.refreshPanels();
      } catch (err) { s.toast(`Export failed: ${err.message}`, { tone: 'err' }); }
    },
  });
}

/** Draw the middle of the exported image at 200% so compression damage is visible. */
async function previewPixels(canvas, blob, doc) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#16181d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  let src;
  if (blob) {
    const url = URL.createObjectURL(blob);
    const img = new Image(); img.src = url;
    try { await img.decode(); src = img; } catch { return; } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  } else src = doc.render(makeCanvas(doc.width, doc.height));
  const w = canvas.width / 2, h = canvas.height / 2;
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  ctx.drawImage(src, Math.max(0, sw / 2 - w / 2), Math.max(0, sh / 2 - h / 2), w, h, 0, 0, canvas.width, canvas.height);
}

/* ── import report ───────────────────────────────────────────────────── */

export function importReport(s, name, kind, notes) {
  const [first, ...rest] = notes;
  openDialog(s, {
    title: `Opened ${esc(name)}`,
    body: `<p class="lls-report-lead">${esc(first)}</p>
      ${rest.length ? `<h4 class="lls-sub">What changed on the trip</h4><ul class="lls-report">${rest.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '<p>Nothing was lost on the way in.</p>'}
      <p class="lls-note">Every format is a promise about what it keeps. Compare this list with the Layers panel: which layers are still live text, masks or adjustments?</p>`,
    buttons: [['ok', 'Got it', true]],
  });
}

/* ── adjustments & filters (destructive, with live preview) ──────────── */

export function adjustmentPicker(s) {
  openDialog(s, {
    title: 'New adjustment layer',
    body: `<p class="lls-note">An adjustment layer changes the look of every layer under it without touching their pixels. It comes with a mask, so you can paint where it applies.</p>
      <div class="lls-adj-grid">${Object.entries(ADJUSTMENTS).map(([k, a]) => `<button type="submit" value="${k}" class="lls-adj-btn">${icon('adjust')}<b>${a.label}</b></button>`).join('')}</div>`,
    buttons: [['cancel', 'Cancel']],
    onClose(v) { if (ADJUSTMENTS[v]) s.runDocCommand('addAdjust', v); },
  });
}

function previewDialog(s, { title, controls, compute, event, pixelsOnly = false }) {
  const t = s.paintTarget({ pixelsOnly });
  if (!t) return;
  const W = t.canvas.width, H = t.canvas.height;
  const orig = getPixels(t.canvas);
  const selC = s.selectionCanvasFor(W, H, t.ox, t.oy);
  const sel = selC ? alphaOf(selC) : null;
  let raf = 0;
  const html = controls.map(([k, label, min, max, step, val]) => `<label class="lls-field lls-wide lls-slider"><span>${label}</span><input type="range" name="${k}" min="${min}" max="${max}" step="${step}" value="${val}"><output>${val}</output></label>`).join('');
  openDialog(s, {
    title,
    body: `${html}<label class="lls-check"><input type="checkbox" name="preview" checked> Preview</label>
      <p class="lls-note">This changes the pixels of <b>${esc(t.L.name)}</b>${t.kind === 'mask' ? "'s mask" : ''}${sel ? ' inside the selection' : ''}. For a change you can undo any time, use an adjustment layer instead.</p>`,
    onOpen(dlg) {
      const f = dlg.querySelector('form');
      const read = () => Object.fromEntries(controls.map(([k]) => [k, +f[k].value]));
      const run = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const img = new ImageData(orig.data.slice(), W, H);
          if (f.preview.checked) compute(img, sel, read());
          t.canvas.getContext('2d').putImageData(img, 0, 0);
          s.changed();
        });
      };
      f.addEventListener('input', (e) => { if (e.target.nextElementSibling?.tagName === 'OUTPUT') e.target.nextElementSibling.textContent = e.target.value; run(); });
      run();
    },
    onClose(v) {
      cancelAnimationFrame(raf);
      const f = s.el.dialog.querySelector('form');
      if (v === 'ok') {
        const img = new ImageData(orig.data.slice(), W, H);
        compute(img, sel, Object.fromEntries(controls.map(([k]) => [k, +f[k].value])));
        t.canvas.getContext('2d').putImageData(img, 0, 0);
        s.commit(title.replace(/…$/, ''), { event });
      } else {
        t.canvas.getContext('2d').putImageData(orig, 0, 0);
        s.changed();
      }
    },
  });
}

export function pixelAdjust(s, kind) {
  const a = ADJUSTMENTS[kind];
  const controls = Object.entries(a.params).map(([k, [def, min, max, step = 1]]) => [k, k[0].toUpperCase() + k.slice(1), min, max, step, def]);
  previewDialog(s, { title: `${a.label}…`, controls, event: 'adjust-pixels', compute: (img, sel, p) => applyAdjustment(img, kind, p, sel) });
}

export function filterDialog(s, kind) {
  const defs = {
    blur: ['Gaussian Blur…', [['radius', 'Radius px', 1, 60, 1, 6]], (img, sel, p) => blur(img, p.radius, sel)],
    sharpen: ['Unsharp Mask…', [['amount', 'Amount', 0.1, 3, 0.1, 0.8], ['radius', 'Radius px', 1, 10, 1, 2]], (img, sel, p) => sharpen(img, p.amount, p.radius, sel)],
    noise: ['Add Noise…', [['amount', 'Amount', 1, 100, 1, 18]], (img, sel, p) => addNoise(img, p.amount, 7, sel)],
    pixelate: ['Pixelate…', [['size', 'Cell size px', 2, 80, 1, 12]], (img, sel, p) => pixelate(img, p.size, sel)],
  };
  const [title, controls, compute] = defs[kind];
  previewDialog(s, { title, controls, compute, event: 'filter' });
}

/* ── selections ──────────────────────────────────────────────────────── */

export function colorRange(s) {
  const d = s.doc, W = d.width, H = d.height;
  const img = s.sampleImage(true);
  const rgb = [1, 3, 5].map((i) => parseInt(s.colors.fg.slice(i, i + 2), 16));
  let mask = null;
  openDialog(s, {
    title: 'Color Range',
    body: `<p>Selects every pixel close to the foreground color <span class="lls-chip" style="background:${s.colors.fg}"></span> <code>${s.colors.fg}</code>. Use the Eyedropper (I) first to pick the color from the picture.</p>
      <label class="lls-field lls-wide lls-slider"><span>Fuzziness</span><input type="range" name="fuzz" min="0" max="200" value="40"><output>40</output></label>
      <canvas class="lls-range-prev" aria-label="Preview: white is selected, black is not"></canvas><p class="lls-note lls-range-count"></p>`,
    onOpen(dlg) {
      const f = dlg.querySelector('form'), c = f.querySelector('.lls-range-prev');
      const k = Math.min(1, 360 / W, 220 / H);
      c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k));
      const update = () => {
        f.fuzz.nextElementSibling.textContent = f.fuzz.value;
        mask = colorRangeMask(img, rgb, +f.fuzz.value);
        const m = makeCanvas(W, H), mc = m.getContext('2d'), id = mc.createImageData(W, H);
        let n = 0;
        for (let i = 0; i < mask.length; i++) { id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = mask[i]; id.data[i * 4 + 3] = 255; if (mask[i] > 127) n++; }
        mc.putImageData(id, 0, 0);
        c.getContext('2d').drawImage(m, 0, 0, c.width, c.height);
        f.querySelector('.lls-range-count').textContent = `${n.toLocaleString()} pixels (${((n / (W * H)) * 100).toFixed(1)}%) are within ${f.fuzz.value} of the color.`;
      };
      f.fuzz.addEventListener('input', update);
      update();
    },
    onClose(v) { if (v === 'ok' && mask) s.setSelection(canvasFromAlpha(mask, W, H), 'new', 'Color Range', { smart: 'range' }); },
  });
}

export function modifySelection(s, how) {
  const label = { expand: 'Expand', contract: 'Contract', feather: 'Feather' }[how];
  openDialog(s, {
    title: `${label} selection`,
    body: `<label class="lls-field"><span>${label} by (px)</span><input type="number" name="px" min="1" max="200" value="${how === 'feather' ? 8 : 4}"></label>
      <p class="lls-note">${how === 'feather' ? 'Feathering blurs the selection edge so edits fade out instead of stopping at a hard line.' : 'Grows or shrinks the selection outline evenly in every direction.'}</p>`,
    onClose(v) {
      if (v !== 'ok') return;
      const px = Math.max(1, +s.el.dialog.querySelector('[name=px]').value | 0);
      const d = s.doc, a = s.selectionAlpha();
      const out = how === 'feather' ? featherMask(a, d.width, d.height, px) : expandMask(a, d.width, d.height, how === 'expand' ? px : -px);
      s.setSelection(canvasFromAlpha(out, d.width, d.height), 'new', `${label} Selection`, { smart: s.lastSelectionSmart });
    },
  });
}

/* ── image & canvas size ─────────────────────────────────────────────── */

export function imageSize(s) {
  const d = s.doc;
  openDialog(s, {
    title: 'Image Size',
    body: `<div class="lls-grid3">
        <label class="lls-field"><span>Width px</span><input type="number" name="w" min="1" max="8000" value="${d.width}"></label>
        <label class="lls-field"><span>Height px</span><input type="number" name="h" min="1" max="8000" value="${d.height}"></label>
        <label class="lls-check"><input type="checkbox" name="lock" checked> Keep proportions</label>
      </div>
      <label class="lls-field"><span>Resample</span><select name="method"><option value="smooth">Smooth (blends neighbors: photos)</option><option value="nearest">Nearest neighbor (hard edges: pixel art)</option></select></label>
      <div class="lls-row">${[25, 50, 200, 400].map((p) => `<button type="button" class="lls-btn ghost" data-pct="${p}">${p}%</button>`).join('')}</div>
      <p class="lls-note lls-mem"></p>
      <p class="lls-note">Shrinking throws pixels away for good. Enlarging can't add real detail: the computer guesses the new pixels from their neighbors, so the image gets softer (smooth) or blockier (nearest).</p>`,
    onOpen(dlg) {
      const f = dlg.querySelector('form'), ratio = d.width / d.height;
      const mem = () => { f.querySelector('.lls-mem').textContent = `${d.width} × ${d.height} → ${f.w.value} × ${f.h.value}: ${formatBytes(d.width * d.height * 4)} → ${formatBytes(+f.w.value * +f.h.value * 4)} per layer.`; };
      f.w.addEventListener('input', () => { if (f.lock.checked) f.h.value = Math.max(1, Math.round(f.w.value / ratio)); mem(); });
      f.h.addEventListener('input', () => { if (f.lock.checked) f.w.value = Math.max(1, Math.round(f.h.value * ratio)); mem(); });
      f.querySelectorAll('[data-pct]').forEach((b) => b.addEventListener('click', () => { f.w.value = Math.max(1, Math.round(d.width * b.dataset.pct / 100)); f.h.value = Math.max(1, Math.round(d.height * b.dataset.pct / 100)); mem(); }));
      mem();
    },
    onClose(v) {
      if (v !== 'ok') return;
      const f = s.el.dialog.querySelector('form');
      const w = Math.max(1, Math.min(8000, +f.w.value | 0)), h = Math.max(1, Math.min(8000, +f.h.value | 0));
      if (w === d.width && h === d.height) return;
      const kx = w / d.width, ky = h / d.height, smooth = f.method.value === 'smooth';
      const scale = (c) => {
        const out = makeCanvas(Math.max(1, Math.round(c.width * kx)), Math.max(1, Math.round(c.height * ky))), x = out.getContext('2d');
        x.imageSmoothingEnabled = smooth; x.imageSmoothingQuality = 'high';
        x.drawImage(c, 0, 0, out.width, out.height);
        return out;
      };
      for (const L of d.layers) {
        if (L.kind === 'pixel') L.canvas = scale(L.canvas);
        if (L.kind === 'text') L.text = { ...L.text, size: Math.max(4, Math.round(L.text.size * ky)) };
        if (L.kind === 'shape') L.shape = { ...L.shape, w: Math.round(L.shape.w * kx), h: Math.round(L.shape.h * ky), strokeWidth: Math.round(L.shape.strokeWidth * ky), radius: Math.round((L.shape.radius || 0) * ky) };
        L.x = Math.round(L.x * kx); L.y = Math.round(L.y * ky);
        if (L.mask) L.mask = { ...L.mask, canvas: scale(L.mask.canvas), x: Math.round(L.mask.x * kx), y: Math.round(L.mask.y * ky) };
      }
      d.width = w; d.height = h; d.composite = makeCanvas(w, h); d.selection = null;
      s.commit('Image Size', { event: 'resize', smooth });
      s.fit();
    },
  });
}

export function canvasSize(s) {
  const d = s.doc;
  openDialog(s, {
    title: 'Canvas Size',
    body: `<div class="lls-grid3">
        <label class="lls-field"><span>Width px</span><input type="number" name="w" min="1" max="8000" value="${d.width}"></label>
        <label class="lls-field"><span>Height px</span><input type="number" name="h" min="1" max="8000" value="${d.height}"></label>
      </div>
      <fieldset class="lls-anchor"><legend>Anchor</legend>${[0, 0.5, 1].map((ay) => [0, 0.5, 1].map((ax) => `<label><input type="radio" name="anchor" value="${ax},${ay}" ${ax === 0.5 && ay === 0.5 ? 'checked' : ''} aria-label="Anchor ${['top', 'middle', 'bottom'][ay * 2]} ${['left', 'center', 'right'][ax * 2]}"><span></span></label>`).join('')).join('')}</fieldset>
      <p class="lls-note">Canvas Size changes the paper, not the picture: nothing is stretched. Layers keep their pixels even if they now hang off the edge.</p>`,
    onClose(v) {
      if (v !== 'ok') return;
      const f = s.el.dialog.querySelector('form');
      const w = Math.max(1, Math.min(8000, +f.w.value | 0)), h = Math.max(1, Math.min(8000, +f.h.value | 0));
      const [ax, ay] = f.anchor.value.split(',').map(Number);
      const dx = Math.round((w - d.width) * ax), dy = Math.round((h - d.height) * ay);
      for (const L of d.layers) { L.x += dx; L.y += dy; if (L.mask) { L.mask.x += dx; L.mask.y += dy; } }
      d.width = w; d.height = h; d.composite = makeCanvas(w, h); d.selection = null;
      s.commit('Canvas Size', { event: 'canvas-size' });
      s.fit();
    },
  });
}

/* ── help ────────────────────────────────────────────────────────────── */

export function shortcuts(s) {
  const rows = [];
  for (const g of TOOLBOX) for (const id of g) rows.push([TOOLS[id].label, `${TOOLS[id].key}${g.length > 1 && g.indexOf(id) > 0 ? ` (Shift+${TOOLS[id].key} cycles)` : ''}`]);
  const cmds = [];
  for (const [menu, items] of Object.entries(s.menus())) for (const it of items) if (Array.isArray(it) && it[2]) cmds.push([`${menu} › ${it[0]}`, it[2]]);
  const extra = [['Hand tool while held', 'Space'], ['Brush smaller / bigger', '[  ]'], ['Swap / reset colors', 'X / D'], ['Zoom at the cursor', 'Ctrl + scroll'], ['Add / subtract selection', 'Shift / Alt while selecting'], ['Nudge layer (Move tool)', 'Arrow keys (Shift = 10 px)'], ['Set clone source', 'Alt-click']];
  const table = (r) => `<table class="lls-keys"><tbody>${r.map(([a, b]) => `<tr><td>${esc(a)}</td><td><kbd>${esc(b)}</kbd></td></tr>`).join('')}</tbody></table>`;
  openDialog(s, {
    title: 'Keyboard shortcuts', wide: true,
    body: `<div class="lls-keys-grid"><div><h4 class="lls-sub">Tools</h4>${table(rows)}</div><div><h4 class="lls-sub">Commands</h4>${table(cmds)}<h4 class="lls-sub">While working</h4>${table(extra)}</div></div>
      <p class="lls-note">Shortcuts work while the editor is active (after you click in it). Browsers keep a few for themselves, such as Ctrl+N, Ctrl+T and Ctrl+W, so Layer Lab uses Alt combinations for those commands.</p>`,
    buttons: [['ok', 'Close', true]],
  });
}

export function about(s) {
  openDialog(s, {
    title: 'About Layer Lab',
    body: `<p><b>Layer Lab</b> is the classroom photo editor built into this lesson. It works like the professional apps (layers, masks, blend modes, adjustment layers, smart selections and retouching) so your habits transfer to Photoshop, Photopea, GIMP, Krita or Affinity Photo.</p>
      <p>It opens and saves real files: layered <b>PSD</b> and <b>OpenRaster</b> that other apps can open, flat <b>PNG/JPEG/WebP</b>, and its own <b>.layerlab</b> project that keeps everything editable.</p>
      <p>Everything happens in your browser. Pictures you open and files you save in the Workshop Drive stay on this device; nothing is uploaded.</p>`,
    buttons: [['ok', 'Close', true]],
  });
}
