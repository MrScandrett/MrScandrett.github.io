// Beyond the Printer lesson UI (lessons/3d-design/cad-and-printing/beyond-the-printer.html).
// Three template generators (slice-form, folded net, flat-pack tray) built on the pure geometry in
// beyond-the-printer-core.mjs, a 3D preview of the assembled model, letter-size sheets that print
// at 100 %, SVG downloads for a laser cutter, and a kerf calculator.
import * as B from './beyond-the-printer-core.mjs';

const $ = (sel, root = document) => root.querySelector(sel);
const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const fmt = (n, d = 1) => Number(n).toFixed(d);
const svgUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

/* ── 3D preview: flat polygons in space, painter-sorted ─────────── */

function preview3d(box, { label }) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', label);
  box.appendChild(canvas);
  let polys = [];
  let yaw = -0.65, pitch = 0.42;
  let sk = null;
  const ctx0 = { ctx: null };
  function colors() {
    const c = window.SimKit && window.SimKit.theme ? window.SimKit.theme.colors() : {};
    return { bg: '#fbfaf6', ink: '#1f2937', muted: '#6b7280', accent: c.accent || '#0f766e' };
  }
  function draw() {
    const ctx = ctx0.ctx;
    if (!ctx || !sk) return;
    const W = sk.width, H = sk.height, col = colors();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
    if (!polys.length) return;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const proj = ([x, y, z]) => {
      const xr = x * cy - y * sy, yr = x * sy + y * cy;
      return [xr, z * cp + yr * sp, yr * cp - z * sp];
    };
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const shapes = polys.map((p) => {
      const loops = p.loops.map((l) => l.map(proj));
      let depth = 0, n = 0;
      for (const l of loops) for (const q of l) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); depth += q[2]; n++; }
      return { loops, depth: depth / n, fill: p.fill, stroke: p.stroke };
    });
    const k = Math.min((W - 40) / Math.max(1, x1 - x0), (H - 50) / Math.max(1, y1 - y0));
    const ox = W / 2 - k * (x0 + x1) / 2, oy = H / 2 + 8 + k * (y0 + y1) / 2;
    shapes.sort((a, b) => b.depth - a.depth);
    for (const s of shapes) {
      ctx.beginPath();
      for (const l of s.loops) {
        l.forEach((q, i) => { const X = ox + q[0] * k, Y = oy - q[1] * k; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
        ctx.closePath();
      }
      ctx.fillStyle = s.fill; ctx.fill('evenodd');
      ctx.strokeStyle = s.stroke; ctx.lineWidth = 1.4; ctx.lineJoin = 'round'; ctx.stroke();
    }
    ctx.fillStyle = col.muted; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Drag to turn it', 12, H - 10);
  }
  sk = window.SimKit ? window.SimKit.canvas2d(canvas, { height: 300, onResize: (ctx) => { ctx0.ctx = ctx; draw(); } }) : null;
  if (sk) ctx0.ctx = sk.ctx;
  let drag = null;
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    yaw = drag.yaw + (e.clientX - drag.x) * 0.01;
    pitch = Math.max(0.05, Math.min(1.35, drag.pitch + (e.clientY - drag.y) * 0.006));
    draw();
  });
  const end = () => { drag = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  if (window.SimKit && window.SimKit.theme) window.SimKit.theme.onChange(draw);
  return { set(p) { polys = p; draw(); }, canvas };
}

/* ── Sheets: thumbnails, download links, print ──────────────────── */

function showSheets(host, sheets, { name, laserSheets }) {
  host.innerHTML = '';
  sheets.forEach((svg, i) => {
    const fig = document.createElement('figure');
    fig.className = 'btp-page';
    fig.setAttribute('data-zoomable', '');
    fig.setAttribute('data-lightbox-group', name);
    const img = document.createElement('img');
    img.src = svgUrl(svg);
    img.alt = `Template page ${i + 1} of ${sheets.length}: cutting lines on letter paper.`;
    img.width = 216; img.height = 279;
    const cap = document.createElement('figcaption');
    cap.innerHTML = `Page ${i + 1} of ${sheets.length} · <a href="#" data-btp-dl="${i}">SVG</a>` + (laserSheets ? ` · <a href="#" data-btp-dl-laser="${i}">laser SVG</a>` : '');
    fig.append(img, cap);
    host.appendChild(fig);
  });
  $all('[data-btp-dl]', host).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); download(sheets[+a.dataset.btpDl], `${name}-page-${+a.dataset.btpDl + 1}.svg`); }));
  $all('[data-btp-dl-laser]', host).forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); download(laserSheets[+a.dataset.btpDlLaser], `${name}-laser-page-${+a.dataset.btpDlLaser + 1}.svg`); }));
}

function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

let printRoot = null;
function printSheets(sheets) {
  if (!printRoot) {
    printRoot = document.createElement('div');
    printRoot.id = 'btp-print-root';
    printRoot.setAttribute('aria-hidden', 'true');
    printRoot.setAttribute('data-night-keep', '');
    document.body.appendChild(printRoot);
  }
  printRoot.innerHTML = sheets.map((svg) => `<div class="btp-print-sheet">${svg}</div>`).join('');
  document.documentElement.classList.add('btp-print-templates');
  const done = () => {
    document.documentElement.classList.remove('btp-print-templates');
    printRoot.innerHTML = '';
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  window.print();
}

/* ── Controls built from a parameter list ───────────────────────── */

function sliderRow(p, value) {
  const id = 'btp-' + Math.random().toString(36).slice(2, 8);
  const row = document.createElement('label');
  row.className = 'btp-slider';
  row.setAttribute('for', id);
  row.innerHTML = `<span>${p.label}</span><input type="range" id="${id}" min="${p.min}" max="${p.max}" step="${p.step}" value="${value}" data-param="${p.id}"><output>${value}${p.unit ? ' ' + p.unit : ''}</output>`;
  const input = $('input', row), out = $('output', row);
  input.addEventListener('input', () => { out.textContent = input.value + (p.unit ? ' ' + p.unit : ''); });
  return row;
}

function readParams(host) {
  const out = {};
  $all('input[data-param]', host).forEach((el) => { out[el.dataset.param] = +el.value; });
  return out;
}

const num = (el, fallback) => { const v = parseFloat(String(el.value).replace(',', '.')); return Number.isFinite(v) ? v : fallback; };
const debounce = (fn, ms) => { let t = null; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };

/* ── Slice-form generator ───────────────────────────────────────── */

function initSlice(root) {
  const shapeSel = $('[data-btp-shape]', root);
  const paramsHost = $('[data-btp-params]', root);
  const thick = $('[data-btp-thickness]', root);
  const allow = $('[data-btp-allowance]', root);
  const kerf = $('[data-btp-kerf]', root);
  const countA = $('[data-btp-count-a]', root), countB = $('[data-btp-count-b]', root);
  const note = $('[data-btp-shape-note]', root);
  const stats = $('[data-btp-stats]', root);
  const sheetsHost = $('[data-btp-sheets]', root);
  const view = preview3d($('[data-btp-view]', root), { label: 'The assembled slice-form, seen from above at an angle. Drag to turn it.' });
  let sheets = [], laser = [];

  for (const [id, s] of Object.entries(B.SHAPES)) shapeSel.add(new Option(s.name, id));
  function buildParams() {
    const s = B.SHAPES[shapeSel.value];
    paramsHost.innerHTML = '';
    for (const p of s.params) paramsHost.appendChild(sliderRow(p, p.value));
    countA.value = s.counts[0]; countB.value = s.counts[1];
    note.innerHTML = `<b>${s.trait}.</b> ${s.note}`;
  }

  function run() {
    const t = Math.max(0.3, num(thick, 3));
    const k = Math.max(0, num(kerf, 0));
    const form = B.computeSliceForm({ shape: shapeSel.value, params: readParams(paramsHost), thickness: t, allowance: num(allow, 0), kerf: k, countA: +countA.value, countB: +countB.value });
    root.dataset.btpPieces = form.pieces.length;
    const polys = form.pieces.map((p) => ({
      loops: p.loops.map((l) => l.map(([u, v]) => (p.kind === 'A' ? [p.at, u, v] : [u, p.at, v]))),
      fill: p.kind === 'A' ? 'rgba(222,184,135,0.88)' : 'rgba(191,219,254,0.88)',
      stroke: p.kind === 'A' ? '#92400e' : '#1d4ed8'
    }));
    view.set(polys);
    const layout = B.layoutSliceForm(form, { kerf: k });
    const title = B.SHAPES[form.shape].name.replace(/\s*\(.*\)$/, '') + ' slice-form';
    sheets = B.sliceSheets(form, layout, { title, kerf: k });
    laser = B.sliceSheets(form, layout, { title, kerf: k, style: 'laser' });
    showSheets(sheetsHost, sheets, { name: 'slice-form', laserSheets: laser });
    const nA = form.pieces.filter((p) => p.kind === 'A').length, nB = form.pieces.length - nA;
    const items = [
      `<li><b>Model</b> ${Math.round(form.size.w)} × ${Math.round(form.size.d)} × ${Math.round(form.size.h)} mm (wide × deep × tall)</li>`,
      `<li><b>Pieces</b> ${nA} A + ${nB} B slices, ${form.slotCount} crossings, on ${layout.pages.length} letter page${layout.pages.length > 1 ? 's' : ''} (+ fit strip)</li>`,
      `<li><b>Slots drawn</b> ${fmt(form.slot, 2)} mm wide = ${fmt(t, 2)} board${num(allow, 0) ? ` ${num(allow, 0) > 0 ? '+' : '−'} ${fmt(Math.abs(num(allow, 0)), 2)} allowance` : ''}${k ? ` − ${fmt(k, 2)} kerf` : ''}</li>`,
      `<li><b>Gaps between slices</b> ${fmt(form.cellGap.a)} mm (between A) × ${fmt(form.cellGap.b)} mm (between B)</li>`
    ];
    if (layout.oversize.length) items.push(`<li class="btp-warn">${layout.oversize.join(', ')} ${layout.oversize.length > 1 ? 'are' : 'is'} bigger than a letter page. Make the model smaller or tile it by hand.</li>`);
    for (const w of form.warnings) items.push(`<li class="btp-warn">${w}</li>`);
    stats.innerHTML = items.join('');
  }
  const later = debounce(run, 120);
  shapeSel.addEventListener('change', () => { buildParams(); run(); });
  root.addEventListener('input', (e) => { if (e.target.closest('[data-btp-params], [data-btp-settings]')) later(); });
  $('[data-btp-print]', root).addEventListener('click', () => printSheets(sheets));
  buildParams();
  run();
  return { setKerf(v) { kerf.value = fmt(v, 2); run(); }, setThickness(v) { thick.value = fmt(v, 2); run(); } };
}

/* ── Net generator ──────────────────────────────────────────────── */

function polyArea(poly) { return Math.abs(B.loopArea(poly)); }

function netVolume(net) {
  const p = net.params;
  if (net.type === 'box') return p.length * p.width * p.height;
  if (net.type === 'prism') { const n = Math.round(p.sides); return n * p.edge * p.edge / (4 * Math.tan(Math.PI / n)) * p.length; }
  if (net.type === 'pyramid') { const n = Math.round(p.sides); return n * p.edge * p.edge / (4 * Math.tan(Math.PI / n)) * p.height / 3; }
  return p.edge ** 3 / (6 * Math.SQRT2);
}

function initNet(root) {
  const typeSel = $('[data-btp-net-type]', root);
  const paramsHost = $('[data-btp-params]', root);
  const shrink = $('[data-btp-shrink]', root);
  const stats = $('[data-btp-stats]', root);
  const sheetsHost = $('[data-btp-sheets]', root);
  let sheets = [];
  for (const [id, n] of Object.entries(B.NETS)) typeSel.add(new Option(n.name, id));
  function buildParams() {
    paramsHost.innerHTML = '';
    for (const p of B.NETS[typeSel.value].params) paramsHost.appendChild(sliderRow(p, p.value));
  }
  function run() {
    const net = B.computeNet(typeSel.value, readParams(paramsHost));
    const place = B.layoutNet(net, { shrink: shrink.checked });
    sheets = [B.netSheet(net, place, { title: B.NETS[net.type].name.replace(/\s*\(.*\)$/, '') + ' net' })];
    showSheets(sheetsHost, sheets, { name: 'net-' + net.type, laserSheets: [B.netSheet(net, place, { style: 'laser', title: B.NETS[net.type].name + ' net' })] });
    const F = net.faces.length, E = net.faces.reduce((n, f) => n + f.poly.length, 0) / 2;
    const V = E - F + 2;
    const area = net.faces.reduce((a, f) => a + polyArea(f.poly), 0);
    const items = [
      `<li><b>Faces</b> ${F} · <b>edges</b> ${E} · <b>corners</b> ${V} (V − E + F = ${V - E + F})</li>`,
      `<li><b>Folds</b> ${net.folds.length - net.tabs.length} between faces + ${net.tabs.length} tab folds · <b>glue tabs</b> ${net.tabs.length}, one per seam</li>`,
      `<li><b>Surface area</b> ${Math.round(area).toLocaleString('en-US')} mm² · <b>volume</b> ${Math.round(netVolume(net)).toLocaleString('en-US')} mm³ (${fmt(netVolume(net) / 1000, 1)} cm³)</li>`,
      place.fits ? `<li><b>Fits on one letter page</b> at full size.</li>`
        : `<li class="btp-warn">At full size the net is ${Math.round(net.bbox.w)} × ${Math.round(net.bbox.h)} mm, bigger than the page. ${shrink.checked ? `Shrunk to ${Math.round(place.scale * 100)}%: the model will be that much smaller.` : 'Tick “shrink to fit”, make it smaller, or tape two sheets.'}</li>`
    ];
    stats.innerHTML = items.join('');
  }
  const later = debounce(run, 100);
  typeSel.addEventListener('change', () => { buildParams(); run(); });
  root.addEventListener('input', (e) => { if (e.target.closest('[data-btp-params]')) later(); });
  shrink.addEventListener('change', run);
  $('[data-btp-print]', root).addEventListener('click', () => printSheets(sheets));
  buildParams();
  run();
}

/* ── Flat-pack tray generator ───────────────────────────────────── */

function initTray(root) {
  const field = (name) => $(`[data-btp-tray="${name}"]`, root);
  const stats = $('[data-btp-stats]', root);
  const sheetsHost = $('[data-btp-sheets]', root);
  const view = preview3d($('[data-btp-view]', root), { label: 'The assembled tray with its finger joints. Drag to turn it.' });
  let sheets = [];
  function run() {
    const tray = B.computeTray({ width: num(field('w'), 120), depth: num(field('d'), 80), height: num(field('h'), 40), thickness: num(field('t'), 3), finger: num(field('finger'), 12), kerf: num(field('kerf'), 0) });
    const { w, d } = tray.size, t = tray.thickness;
    const P = Object.fromEntries(tray.pieces.map((p) => [p.name, p.loops[0]]));
    const ink = { fill: 'rgba(222,184,135,0.92)', stroke: '#92400e' }, wall = { fill: 'rgba(191,219,254,0.9)', stroke: '#1d4ed8' };
    view.set([
      Object.assign({ loops: [P.Base.map(([u, v]) => [u, v, t / 2])] }, ink),
      Object.assign({ loops: [P.Front.map(([u, v]) => [u, t / 2, v])] }, wall),
      Object.assign({ loops: [P.Back.map(([u, v]) => [u, d - t / 2, v])] }, wall),
      Object.assign({ loops: [P['Left side'].map(([u, v]) => [t / 2, u, v])] }, ink),
      Object.assign({ loops: [P['Right side'].map(([u, v]) => [w - t / 2, u, v])] }, ink)
    ]);
    const layout = B.layoutPieces(tray.pieces);
    sheets = B.traySheets(tray, layout);
    showSheets(sheetsHost, sheets, { name: 'tray', laserSheets: B.traySheets(tray, layout, { style: 'laser' }) });
    const items = [
      `<li><b>Outside</b> ${fmt(tray.size.w, 0)} × ${fmt(tray.size.d, 0)} × ${fmt(tray.size.h, 0)} mm · <b>inside</b> ${fmt(tray.inside.w)} × ${fmt(tray.inside.d)} × ${fmt(tray.inside.h)} mm</li>`,
      `<li><b>Fingers</b> ${tray.counts.w} along the width (${fmt(tray.fingerSize.w)} mm), ${tray.counts.d} along the depth (${fmt(tray.fingerSize.d)} mm), ${tray.counts.h} up each corner (${fmt(tray.fingerSize.h)} mm)</li>`,
      `<li><b>Kerf</b> ${tray.kerf ? `${fmt(tray.kerf, 2)} mm: every outline drawn ${fmt(tray.kerf / 2, 2)} mm bigger all round` : '0 (craft knife): outlines drawn at exact size'}</li>`,
      `<li><b>Pages</b> ${layout.pages.length}${layout.oversize.length ? ` · <span class="btp-warn">${layout.oversize.join(', ')} too big for letter paper</span>` : ''}</li>`
    ];
    stats.innerHTML = items.join('');
  }
  const later = debounce(run, 120);
  root.addEventListener('input', (e) => { if (e.target.matches('[data-btp-tray]')) later(); });
  $('[data-btp-print]', root).addEventListener('click', () => printSheets(sheets));
  run();
  return { setKerf(v) { field('kerf').value = fmt(v, 2); run(); }, setThickness(v) { field('t').value = fmt(v, 2); run(); } };
}

/* ── Kerf calculator ────────────────────────────────────────────── */

function initKerf(root, targets) {
  const drawn = $('[data-btp-kerf-drawn]', root), measured = $('[data-btp-kerf-measured]', root);
  const out = $('[data-btp-kerf-out]', root), use = $('[data-btp-kerf-use]', root);
  let value = null;
  function calc() {
    const d = num(drawn, NaN), m = num(measured, NaN);
    if (!Number.isFinite(d) || !Number.isFinite(m)) { out.textContent = 'Type both widths.'; use.disabled = true; value = null; return; }
    value = Math.max(0, m - d);
    out.innerHTML = m < d ? 'The slot came out <b>smaller</b> than drawn: the board probably squeezed in or the line was cut inside. Re-measure.'
      : `Kerf = ${fmt(m, 2)} − ${fmt(d, 2)} = <b>${fmt(value, 2)} mm</b>. Draw slots ${fmt(value, 2)} mm narrower and outlines ${fmt(value / 2, 2)} mm bigger all round.`;
    use.disabled = m < d;
  }
  root.addEventListener('input', calc);
  use.addEventListener('click', () => { if (value == null) return; targets.forEach((t) => t && t.setKerf(value)); use.textContent = 'Sent to both generators ✓'; setTimeout(() => { use.textContent = 'Use this kerf in the generators'; }, 2200); });
  calc();
}

function start() {
  const slices = $all('[data-btp-slice]').map(initSlice);
  $all('[data-btp-net]').forEach(initNet);
  const trays = $all('[data-btp-tray-gen]').map(initTray);
  $all('[data-btp-kerf-calc]').forEach((el) => initKerf(el, slices.concat(trays)));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
