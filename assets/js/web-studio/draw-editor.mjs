/* ClassroomOS Web Studio — Draw mode editor.
 *
 * Draw boxes and containers, drop in text, images, buttons and links, then move and
 * resize them like layers in a paint program. Everything snaps to CSS Grid lines,
 * and the canvas is rendered from the very CSS that gets exported (inside a shadow
 * root, so the student's styles never leak into the studio). Pointer positions are
 * turned into grid lines by reading the browser's own resolved track sizes.
 *
 * Keyboard: V select · B box · T text · I image · U button · L link · arrows move a
 * selected item one cell (Shift+arrows resize) · Delete removes · Ctrl/Cmd+D duplicates
 * · Ctrl/Cmd+Z undo · Ctrl/Cmd+Shift+Z or Ctrl+Y redo · Enter edits text · Esc deselects.
 * Every pointer action also has a form control in the Layers and Properties panels. */
import {
  COLUMNS, TAGS, FONTS, emptyDrawing, byId, children, descendants, depth, createItem, removeItem,
  placeItem, duplicateItem, uniqueName, sanitizeName, clampPlacement, nextRow, generateCSS, generateHTML,
  checks, contrastRatio, effectiveColors, safeHref, safeSrc,
} from './draw-model.mjs';

const TOOLS = [
  { id: 'select', key: 'v', label: 'Select and move', short: 'Select', icon: '<path d="M5 3l14 8-6 2-3 6z"/>' },
  { id: 'box', key: 'b', label: 'Draw a box or container', short: 'Box', icon: '<rect x="4" y="5" width="16" height="14" rx="2"/>' },
  { id: 'text', key: 't', label: 'Draw text', short: 'Text', icon: '<path d="M5 6h14M12 6v13"/>' },
  { id: 'image', key: 'i', label: 'Draw an image', short: 'Image', icon: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 16l5-5 4 4 3-3 4 4"/>' },
  { id: 'button', key: 'u', label: 'Draw a button', short: 'Button', icon: '<rect x="3" y="8" width="18" height="8" rx="4"/>' },
  { id: 'link', key: 'l', label: 'Draw a link', short: 'Link', icon: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>' },
];
const KIND_LABEL = { box: 'Box', text: 'Text', image: 'Image', button: 'Button', link: 'Link' };
const TAG_LABEL = {
  section: 'section — a themed part of the page', header: 'header — the top band', nav: 'nav — main links', main: 'main — this page’s own content',
  article: 'article — a self-contained card or post', aside: 'aside — a side note', footer: 'footer — credits and contact', div: 'div — a plain box with no meaning',
  h1: 'Heading 1 — the page title', h2: 'Heading 2 — a section title', h3: 'Heading 3 — a smaller title', p: 'Paragraph',
};
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

const CHROME = `
:host { all: initial; display: block; }
.ws-frame { position: relative; container-type: inline-size; container-name: page; margin: 0 auto; min-height: 100%; touch-action: none; -webkit-user-select: none; user-select: none; }
.ws-frame:not(.is-phone) { min-width: 760px; }
.ws-frame.is-phone { width: 390px; box-shadow: 0 0 0 1px #8a97a0, 0 10px 30px rgb(0 0 0 / .2); }
.ws-page { min-height: 520px; }
.ws-frame [data-ws-id] { outline: 1px dashed rgb(29 39 51 / .28); outline-offset: -1px; cursor: default; }
.ws-frame.tool-select [data-ws-id] { cursor: move; }
.ws-frame:not(.tool-select) { cursor: crosshair; }
.ws-frame [data-ws-placeholder] { display: grid; place-items: center; text-align: center; background: repeating-linear-gradient(45deg, #e9eef0 0 10px, #f6f8f9 10px 20px); color: #45575f; font: 600 14px system-ui, sans-serif; border: 2px dashed #8a97a0; }
.ws-frame [contenteditable] { outline: 2px solid #c2431c !important; cursor: text; -webkit-user-select: text; user-select: text; }
.ws-overlay { position: absolute; inset: 0; pointer-events: none; }
.ws-col { position: absolute; background: rgb(194 67 28 / .07); border-left: 1px solid rgb(194 67 28 / .25); border-right: 1px solid rgb(194 67 28 / .25); }
.ws-target { position: absolute; outline: 3px solid rgb(194 67 28 / .65); outline-offset: -1px; }
.ws-sel { position: absolute; outline: 2px solid #1f6feb; }
.ws-ghost { position: absolute; background: rgb(31 111 235 / .14); border: 2px dashed #1f6feb; }
.ws-label { position: absolute; transform: translateY(-100%); font: 600 11px/1.4 system-ui, sans-serif; background: #1f6feb; color: #fff; padding: 2px 6px; border-radius: 3px 3px 0 0; white-space: nowrap; }
.ws-ghost .ws-label { transform: none; top: 4px; left: 4px; border-radius: 3px; }
.ws-handle { position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; background: #fff; border: 2px solid #1f6feb; border-radius: 2px; pointer-events: auto; box-sizing: border-box; }
.ws-handle[data-handle=n], .ws-handle[data-handle=s] { cursor: ns-resize; }
.ws-handle[data-handle=e], .ws-handle[data-handle=w] { cursor: ew-resize; }
.ws-handle[data-handle=ne], .ws-handle[data-handle=sw] { cursor: nesw-resize; }
.ws-handle[data-handle=nw], .ws-handle[data-handle=se] { cursor: nwse-resize; }
.ws-empty { position: absolute; left: 50%; top: 120px; transform: translateX(-50%); max-width: 80%; text-align: center; font: 500 16px/1.5 system-ui, sans-serif; color: #45575f; background: rgb(255 255 255 / .85); padding: 14px 18px; border-radius: 8px; }
`;

function el(tag, props = {}, kids = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key in node && !['list', 'form'].includes(key)) node[key] = value;
    else node.setAttribute(key, value);
  }
  node.append(...kids.filter((kid) => kid !== null && kid !== undefined && kid !== false));
  return node;
}

const svgIcon = (paths) => {
  const span = document.createElement('span');
  span.className = 'ds-icon';
  span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return span;
};

export function createDrawEditor(container, options) {
  const assetUrl = (src) => (src && src.startsWith('images/') ? options.assetUrl(src) || src : src);
  let drawing = emptyDrawing();
  let selected = null;
  let tool = 'select';
  let phone = false;
  let showGrid = true;
  let drag = null;
  let editing = null;
  let undoStack = [];
  let redoStack = [];
  let lastPush = { at: 0, key: '' };
  let changeTimer = 0;

  // ---------- studio-side panels ----------
  const toolButtons = new Map();
  const toolTag = el('select', { class: 'ds-tool-tag', 'aria-label': 'Element for new items', hidden: true, onchange: () => setStatus(`New ${KIND_LABEL[tool].toLowerCase()} items will be <${toolTag.value}>.`) });
  const toolbar = el('div', { class: 'ds-toolbar', role: 'toolbar', 'aria-label': 'Drawing tools' });
  for (const t of TOOLS) {
    const button = el('button', { type: 'button', class: 'ds-tool', title: `${t.label} (${t.key.toUpperCase()})`, 'aria-pressed': 'false', onclick: () => setTool(t.id) }, [svgIcon(t.icon), el('span', { textContent: t.short })]);
    toolButtons.set(t.id, button);
    toolbar.append(button);
  }
  toolbar.append(toolTag, el('span', { class: 'ds-sep' }));
  const undoButton = el('button', { type: 'button', textContent: 'Undo', title: 'Undo (Ctrl+Z)', onclick: () => undo() });
  const redoButton = el('button', { type: 'button', textContent: 'Redo', title: 'Redo (Ctrl+Shift+Z)', onclick: () => redo() });
  const viewDesktop = el('button', { type: 'button', textContent: 'Desktop', 'aria-pressed': 'true', onclick: () => setPhone(false) });
  const viewPhone = el('button', { type: 'button', textContent: 'Phone', 'aria-pressed': 'false', onclick: () => setPhone(true) });
  const gridToggle = el('input', { type: 'checkbox', checked: true, onchange: () => { showGrid = gridToggle.checked; drawOverlay(); } });
  toolbar.append(undoButton, redoButton, el('span', { class: 'ds-sep' }), el('span', { class: 'ds-view', role: 'group', 'aria-label': 'Preview width' }, [viewDesktop, viewPhone]), el('label', { class: 'ds-check' }, [gridToggle, ' Show columns']));

  const status = el('p', { class: 'ds-status', role: 'status' });
  const layersList = el('ul', { class: 'ds-layer-list' });
  const addKind = el('select', { 'aria-label': 'Kind of item to add' });
  for (const [value, label] of [['box:section', 'Box (section)'], ['box:header', 'Box (header)'], ['box:main', 'Box (main)'], ['box:footer', 'Box (footer)'], ['text:h1', 'Heading 1'], ['text:h2', 'Heading 2'], ['text:p', 'Paragraph'], ['image:img', 'Image'], ['button:button', 'Button'], ['link:a', 'Link']]) addKind.add(new Option(label, value));
  const addButton = el('button', { type: 'button', textContent: 'Add', onclick: () => addFromPanel() });
  const layers = el('aside', { class: 'ds-layers', 'aria-label': 'Layers' }, [
    el('h3', { textContent: 'Layers' }),
    el('p', { class: 'ds-small', textContent: 'Top to bottom is reading order: the order of your HTML, of a screen reader, and of the phone layout. Move items on the page to change it.' }),
    layersList,
    el('div', { class: 'ds-add' }, [addKind, addButton]),
    el('p', { class: 'ds-small', textContent: 'Adds below everything else, inside the selected box.' }),
  ]);
  const props = el('aside', { class: 'ds-props', 'aria-label': 'Properties' });
  const checkList = el('ul', { class: 'ds-checks' });
  const stage = el('div', { class: 'ds-stage', tabIndex: 0, 'aria-label': 'Drawing page. Choose a tool, then drag to draw. Arrow keys move the selected item; Shift and arrows resize it; Enter edits its text.' });
  const host = el('div', { class: 'ds-host' });
  stage.append(host);
  const codeWhich = el('select', { 'aria-label': 'File to show', onchange: () => renderCode() }, [new Option('style.css', 'css'), new Option('index.html (body)', 'html')]);
  const codeOut = el('code');
  const codePanel = el('details', { class: 'ds-code', ontoggle: () => renderCode() }, [
    el('summary', { textContent: 'See the code this drawing writes' }),
    el('p', { class: 'ds-small', textContent: 'This is the real code. Send the drawing to Code to keep editing it as text.' }),
    codeWhich, el('pre', {}, [codeOut]),
  ]);
  container.append(el('div', { class: 'ds' }, [toolbar, status, el('div', { class: 'ds-work' }, [layers, stage, props]), el('div', { class: 'ds-below' }, [el('div', {}, [el('h3', { textContent: 'Design checks' }), checkList]), codePanel])]));

  // ---------- the canvas (shadow root) ----------
  const shadow = host.attachShadow({ mode: 'open' });
  const chrome = el('style', { textContent: CHROME });
  const generated = el('style');
  const page = el('div', { class: 'ws-page' });
  const overlay = el('div', { class: 'ws-overlay' });
  const frame = el('div', { class: 'ws-frame tool-select' }, [page, overlay]);
  shadow.append(chrome, generated, frame);

  const nodeOf = (id) => (id ? page.querySelector(`[data-ws-id="${id}"]`) : page);
  const setStatus = (message) => { status.textContent = message; };

  // Resolved grid tracks of a container, in client coordinates. Rows past the last
  // real track are extrapolated at the minimum row height so there is room to draw.
  function tracks(node) {
    const cs = getComputedStyle(node);
    const r = node.getBoundingClientRect();
    const px = (v) => parseFloat(v) || 0;
    const left = r.left + px(cs.borderLeftWidth) + px(cs.paddingLeft);
    const top = r.top + px(cs.borderTopWidth) + px(cs.paddingTop);
    const parse = (v) => (v && v !== 'none' ? v.split(/\s+/).map(parseFloat).filter(Number.isFinite) : []);
    const cols = parse(cs.gridTemplateColumns);
    const rows = parse(cs.gridTemplateRows);
    const colGap = px(cs.columnGap);
    const rowGap = px(cs.rowGap);
    const minRow = drawing.page.row;
    const sum = (list, n) => list.slice(0, n).reduce((a, b) => a + b, 0);
    const colStart = (i) => left + sum(cols, i) + i * colGap;
    const rowStart = (i) => (i <= rows.length ? top + sum(rows, i) + i * rowGap : top + sum(rows, rows.length) + rows.length * rowGap + (i - rows.length) * (minRow + rowGap));
    const rowSize = (i) => (i < rows.length ? rows[i] : minRow);
    return { cols, colGap, rowGap, colStart, rowStart, rowSize, left, top };
  }

  function cellAt(t, x, y) {
    let col = t.cols.length || 1;
    for (let i = 0; i < t.cols.length; i++) if (x < t.colStart(i) + t.cols[i] + t.colGap / 2) { col = i + 1; break; }
    let row = 0;
    while (row < 399 && y >= t.rowStart(row) + t.rowSize(row) + t.rowGap / 2) row++;
    return { col: Math.min(COLUMNS, col), row: row + 1 };
  }

  function cellRect(t, { col, row, colSpan, rowSpan }) {
    const fr = frame.getBoundingClientRect();
    const c0 = col - 1;
    const c1 = Math.min(t.cols.length, col + colSpan - 1) - 1;
    const x = t.colStart(c0);
    const right = t.colStart(c1) + (t.cols[c1] || 0);
    const y = t.rowStart(row - 1);
    const bottom = t.rowStart(row + rowSpan - 2) + t.rowSize(row + rowSpan - 2);
    return { x: x - fr.left, y: y - fr.top, w: right - x, h: bottom - y };
  }

  function relRect(node) {
    const fr = frame.getBoundingClientRect();
    const r = node.getBoundingClientRect();
    return { x: r.left - fr.left, y: r.top - fr.top, w: r.width, h: r.height };
  }

  // The deepest box under a point that may hold `movingId` (null = the page itself).
  function boxAt(x, y, movingId = null) {
    const blocked = new Set(movingId ? [movingId, ...descendants(drawing, movingId).map((item) => item.id)] : []);
    for (const node of shadow.elementsFromPoint(x, y)) {
      if (node.dataset?.wsKind === 'box' && !blocked.has(node.dataset.wsId)) return node.dataset.wsId;
    }
    return null;
  }

  // ---------- history ----------
  function remember(key = '') {
    const now = Date.now();
    if (key && key === lastPush.key && now - lastPush.at < 900) { lastPush.at = now; return; }
    undoStack.push(JSON.stringify(drawing));
    if (undoStack.length > 120) undoStack.shift();
    redoStack = [];
    lastPush = { at: now, key };
    updateUndo();
  }
  function updateUndo() { undoButton.disabled = !undoStack.length; redoButton.disabled = !redoStack.length; }
  function restoreFrom(from, to, word) {
    if (!from.length) return;
    finishEdit(false);
    to.push(JSON.stringify(drawing));
    drawing = JSON.parse(from.pop());
    if (selected && !byId(drawing, selected)) selected = null;
    lastPush = { at: 0, key: '' };
    updateUndo(); render(); changed();
    setStatus(`${word}.`);
  }
  const undo = () => restoreFrom(undoStack, redoStack, 'Undone');
  const redo = () => restoreFrom(redoStack, undoStack, 'Redone');

  function changed() {
    clearTimeout(changeTimer);
    changeTimer = setTimeout(() => options.onChange?.(drawing), 250);
  }

  // ---------- rendering ----------
  function render({ keepProps = false } = {}) {
    generated.textContent = generateCSS(drawing, { root: '.ws-page', phone: 'container', varsOn: ':host', assetUrl });
    page.innerHTML = generateHTML(drawing, { editor: true, assetUrl, indent: 0 });
    frame.style.background = drawing.page.background;
    frame.classList.toggle('is-phone', phone);
    renderLayers();
    if (!keepProps) renderProps();
    renderChecks();
    renderCode();
    drawOverlay();
  }

  function drawOverlay(extra = {}) {
    overlay.replaceChildren();
    if (!drawing.items.length && !extra.ghost) {
      overlay.append(el('div', { class: 'ws-empty', textContent: phone ? 'Nothing to preview yet. Switch to Desktop and draw.' : 'Choose Box, Text or Image above, then drag on the page. Everything snaps to 12 columns.' }));
    }
    const guideFor = extra.guide !== undefined ? extra.guide : (() => {
      const item = byId(drawing, selected);
      if (!item) return null;
      return item.kind === 'box' ? item.id : item.parent;
    })();
    if (showGrid && !phone) {
      const node = nodeOf(guideFor);
      if (node) {
        const t = tracks(node);
        const fr = frame.getBoundingClientRect();
        const r = node.getBoundingClientRect();
        const cs = getComputedStyle(node);
        const inner = r.bottom - (parseFloat(cs.paddingBottom) || 0) - (parseFloat(cs.borderBottomWidth) || 0);
        const bottom = node === page ? Math.max(inner, t.top + 4 * (drawing.page.row + t.rowGap)) : inner;
        t.cols.forEach((w, i) => overlay.append(el('div', { class: 'ws-col', style: `left:${t.colStart(i) - fr.left}px;top:${t.top - fr.top}px;width:${w}px;height:${Math.max(0, bottom - t.top)}px` })));
      }
    }
    if (extra.target !== undefined && extra.target !== null) {
      const r = relRect(nodeOf(extra.target));
      overlay.append(el('div', { class: 'ws-target', style: `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px` }));
    }
    const item = byId(drawing, selected);
    if (item && !extra.ghost) {
      const node = nodeOf(item.id);
      if (node) {
        const r = relRect(node);
        const box = el('div', { class: 'ws-sel', style: `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px` });
        overlay.append(box, el('div', { class: 'ws-label', style: `left:${r.x}px;top:${r.y}px`, textContent: `.${item.name}  <${item.tag}>  columns ${item.col}–${item.col + item.colSpan - 1}` }));
        if (!phone && !editing) {
          const points = { nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5] };
          for (const handle of HANDLES) {
            const [fx, fy] = points[handle];
            overlay.append(el('div', { class: 'ws-handle', dataset: { handle }, style: `left:${r.x + r.w * fx}px;top:${r.y + r.h * fy}px` }));
          }
        }
      }
    }
    if (extra.ghost) {
      const g = extra.ghost;
      overlay.append(el('div', { class: 'ws-ghost', style: `left:${g.x}px;top:${g.y}px;width:${g.w}px;height:${g.h}px` }, [el('span', { class: 'ws-label', textContent: extra.label || '' })]));
    }
  }

  function renderLayers() {
    layersList.replaceChildren();
    const walk = (parentId) => children(drawing, parentId).forEach((item) => {
      const button = el('button', {
        type: 'button', class: 'ds-layer', 'aria-current': item.id === selected ? 'true' : 'false',
        style: `padding-left:${8 + depth(drawing, item) * 16}px`, onclick: () => select(item.id, true),
      }, [el('span', { class: 'ds-layer-kind', textContent: KIND_LABEL[item.kind] }), ` .${item.name} `, el('code', { textContent: `<${item.tag}>` })]);
      layersList.append(el('li', {}, [button]));
      walk(item.id);
    });
    walk(null);
    if (!drawing.items.length) layersList.append(el('li', { class: 'ds-small', textContent: 'Nothing drawn yet.' }));
  }

  function renderChecks() {
    checkList.replaceChildren(...checks(drawing).map((result) => {
      const li = el('li', { class: `is-${result.level}` });
      if (result.id) li.append(el('button', { type: 'button', class: 'ds-link', textContent: result.text, onclick: () => select(result.id, true) }));
      else li.textContent = result.text;
      return li;
    }));
  }

  function renderCode() {
    if (!codePanel.open) return;
    codeOut.textContent = codeWhich.value === 'css'
      ? generateCSS(drawing)
      : generateHTML(drawing, { indent: 1 });
  }

  // ---------- properties panel ----------
  function field(label, control, hint) {
    return el('label', { class: 'ds-field' }, [el('span', { textContent: label }), control, hint ? el('small', { textContent: hint }) : null]);
  }

  function mutate(key, fn, { rerenderProps = false } = {}) {
    const item = byId(drawing, selected);
    remember(`${selected}:${key}`);
    fn(item);
    render({ keepProps: !rerenderProps });
    changed();
  }

  function colorField(label, current, onSet) {
    const enabled = el('input', { type: 'checkbox', checked: Boolean(current), 'aria-label': `Use a ${label.toLowerCase()}` });
    const picker = el('input', { type: 'color', value: current || '#ffffff', disabled: !current, 'aria-label': label });
    enabled.addEventListener('change', () => { picker.disabled = !enabled.checked; onSet(enabled.checked ? picker.value : ''); });
    picker.addEventListener('input', () => onSet(picker.value));
    return el('div', { class: 'ds-field ds-color' }, [el('span', { textContent: label }), el('span', { class: 'ds-color-row' }, [enabled, picker])]);
  }

  function numberField(label, value, min, max, onSet, hint) {
    const input = el('input', { type: 'number', value, min, max, step: 1 });
    input.addEventListener('input', () => { if (input.validity.valid && input.value !== '') onSet(Number(input.value)); });
    return field(label, input, hint);
  }

  function selectField(label, value, entries, onSet) {
    const select = el('select', {}, entries.map(([v, text]) => new Option(text, v)));
    select.value = value;
    select.addEventListener('change', () => onSet(select.value));
    return field(label, select);
  }

  function imagePicker(label, value, onSet) {
    const select = el('select', {}, [new Option('No image', ''), ...options.assets().map((path) => new Option(path.replace('images/', ''), path))]);
    if (value && !value.startsWith('images/')) select.add(new Option('Web address below', value));
    select.value = value;
    select.addEventListener('change', () => onSet(select.value));
    const upload = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp', class: 'ds-file' });
    upload.addEventListener('change', async () => {
      const file = upload.files[0];
      if (!file) return;
      try { const path = await options.addAsset(file); onSet(path); renderProps(); setStatus(`${path} added to your project.`); }
      catch (error) { setStatus(error.message); }
      upload.value = '';
    });
    const url = el('input', { type: 'url', placeholder: 'https://…', value: value && !value.startsWith('images/') ? value : '' });
    url.addEventListener('change', () => {
      if (url.value && !(safeSrc(url.value) && url.value.startsWith('https://'))) { setStatus('Use a full https:// address for an image on another site.'); return; }
      onSet(url.value);
    });
    return el('div', { class: 'ds-field' }, [el('span', { textContent: label }), select, el('label', { class: 'ds-upload' }, ['Upload an image ', upload]), el('label', { class: 'ds-small' }, ['…or an image address ', url])]);
  }

  function renderProps() {
    props.replaceChildren();
    const item = byId(drawing, selected);
    if (!item) {
      const p = drawing.page;
      const setPage = (key, value) => { remember(`page:${key}`); p[key] = value; render({ keepProps: true }); changed(); };
      props.append(
        el('h3', { textContent: 'Page' }),
        el('p', { class: 'ds-small', textContent: 'Nothing is selected, so these settings style the whole page (the body in your CSS).' }),
        colorField('Background', p.background, (v) => setPage('background', v || '#ffffff')),
        colorField('Text color', p.color, (v) => setPage('color', v || '#1d2733')),
        selectField('Font', p.font, Object.keys(FONTS).map((key) => [key, { system: 'System (clean sans-serif)', serif: 'Serif (bookish)', rounded: 'Rounded (friendly)', mono: 'Monospace (code)' }[key]]), (v) => setPage('font', v)),
        numberField('Widest the page gets (px)', p.maxWidth, 480, 1600, (v) => setPage('maxWidth', v), 'max-width: wider screens get empty margins.'),
        numberField('Gap between columns (px)', p.gap, 0, 48, (v) => setPage('gap', v)),
        numberField('Shortest row (px)', p.row, 16, 120, (v) => setPage('row', v), 'Rows grow taller when their content needs it.'),
        numberField('Page padding (px)', p.padding, 0, 64, (v) => setPage('padding', v)),
      );
      return;
    }
    const s = item.style;
    props.append(el('h3', { textContent: `${KIND_LABEL[item.kind]} · <${item.tag}>` }));
    const name = el('input', { value: item.name, spellcheck: false, maxLength: 40 });
    name.addEventListener('change', () => {
      const clean = uniqueName(drawing, sanitizeName(name.value) || item.kind, item.id);
      mutate('name', (target) => { target.name = clean; });
      name.value = clean;
      setStatus(`This item’s CSS rule is now .${clean}.`);
    });
    props.append(field('Class name', name, `Your CSS styles it as .${item.name}. Lowercase, hyphens, no spaces.`));
    if (TAGS[item.kind].length > 1) props.append(selectField('Element', item.tag, TAGS[item.kind].map((tag) => [tag, TAG_LABEL[tag] || tag]), (v) => mutate('tag', (target) => { target.tag = v; }, { rerenderProps: true })));
    if (['text', 'button', 'link'].includes(item.kind)) {
      const words = el('textarea', { value: item.text, rows: item.tag === 'p' ? 4 : 2 });
      words.addEventListener('input', () => mutate('text', (target) => { target.text = words.value; }));
      props.append(field('Words', words, 'Or double-click the item on the page and type.'));
    }
    if (item.kind === 'link') {
      const href = el('input', { value: item.href, placeholder: '#projects, about.html or https://…', spellcheck: false });
      href.addEventListener('change', () => {
        if (!safeHref(href.value)) { setStatus('Links can go to https://…, mailto:…, a #section of this page, or a page like about.html.'); href.value = item.href; return; }
        mutate('href', (target) => { target.href = href.value; });
      });
      props.append(field('Goes to', href, 'href: where the link takes the visitor.'));
    }
    if (item.kind === 'image') {
      props.append(imagePicker('Image', item.src, (v) => mutate('src', (target) => { target.src = v; })));
      const alt = el('textarea', { value: item.alt, rows: 2, disabled: item.decorative });
      alt.addEventListener('input', () => mutate('alt', (target) => { target.alt = alt.value; }));
      const decorative = el('input', { type: 'checkbox', checked: item.decorative });
      decorative.addEventListener('change', () => mutate('decorative', (target) => { target.decorative = decorative.checked; }, { rerenderProps: true }));
      props.append(field('Alt text', alt, 'What would a reader need to know if the picture vanished?'), el('label', { class: 'ds-check' }, [decorative, ' Decoration only (alt="")']));
    }
    props.append(el('h4', { textContent: 'Place on the grid' }));
    const place = (key, max) => numberField({ col: 'First column', colSpan: 'Columns wide', row: 'First row', rowSpan: 'Rows tall' }[key], item[key], 1, max, (v) => mutate(`place-${key}`, (target) => Object.assign(target, clampPlacement({ ...target, [key]: v }))));
    props.append(el('div', { class: 'ds-grid2' }, [place('col', COLUMNS), place('colSpan', COLUMNS), place('row', 400), place('rowSpan', 60)]));
    props.append(el('h4', { textContent: 'Style' }));
    const setStyle = (key, value) => mutate(`style-${key}`, (target) => { target.style[key] = value; });
    props.append(colorField('Background', s.background, (v) => setStyle('background', v)));
    if (item.kind === 'box') props.append(imagePicker('Background image', s.image, (v) => setStyle('image', v)));
    if (item.kind !== 'image') {
      props.append(colorField('Text color', s.color, (v) => setStyle('color', v)));
      props.append(el('div', { class: 'ds-grid2' }, [
        numberField('Text size (px)', s.size, 0, 160, (v) => setStyle('size', v), '0 = same as its box'),
        selectField('Weight', s.weight, [['', 'Same as its box'], ['400', 'Regular'], ['700', 'Bold']], (v) => setStyle('weight', v)),
        selectField('Align text', s.align, [['', 'Same as its box'], ['left', 'Left'], ['center', 'Center'], ['right', 'Right']], (v) => setStyle('align', v)),
        item.kind === 'box' ? null : selectField('Sit in its rows', s.valign, [['', 'Fill the rows'], ['start', 'Top'], ['center', 'Middle'], ['end', 'Bottom']], (v) => setStyle('valign', v)),
      ]));
    }
    props.append(el('div', { class: 'ds-grid2' }, [
      numberField('Padding (px)', s.padding, 0, 96, (v) => setStyle('padding', v)),
      numberField('Rounded corners (px)', s.radius, 0, 200, (v) => setStyle('radius', v)),
      numberField('Border (px)', s.borderWidth, 0, 20, (v) => setStyle('borderWidth', v)),
    ]));
    if (s.borderWidth) props.append(colorField('Border color', s.borderColor, (v) => setStyle('borderColor', v || '#1d2733')));
    const shadowBox = el('input', { type: 'checkbox', checked: s.shadow });
    shadowBox.addEventListener('change', () => setStyle('shadow', shadowBox.checked));
    props.append(el('label', { class: 'ds-check' }, [shadowBox, ' Soft shadow']));
    if (['text', 'button', 'link'].includes(item.kind)) {
      const { color, background, overImage } = effectiveColors(drawing, item);
      const ratio = contrastRatio(color, background);
      props.append(el('p', { class: `ds-contrast ${ratio >= 4.5 ? 'is-pass' : 'is-fix'}`, textContent: `Contrast ${ratio.toFixed(1)} : 1 ${ratio >= 4.5 ? '— readable' : '— too faint for normal text (needs 4.5 : 1)'}${overImage ? '. Check over the photo too.' : ''}` }));
    }
    props.append(el('div', { class: 'ds-actions' }, [
      el('button', { type: 'button', textContent: 'Duplicate', onclick: () => duplicateSelected() }),
      el('button', { type: 'button', textContent: 'Delete', onclick: () => deleteSelected() }),
    ]));
    const rule = generateCSS({ ...drawing, items: [{ ...item, parent: null }] }).match(new RegExp(`\\.${item.name} \\{[\\s\\S]*?\\n\\}`));
    if (rule) props.append(el('h4', { textContent: 'This item’s CSS' }), el('pre', { class: 'ds-rule' }, [el('code', { textContent: rule[0] })]));
  }

  // ---------- actions ----------
  function setTool(id) {
    finishEdit(true);
    tool = id;
    for (const [key, button] of toolButtons) button.setAttribute('aria-pressed', String(key === id));
    frame.classList.toggle('tool-select', id === 'select');
    const tags = id === 'box' ? TAGS.box : id === 'text' ? TAGS.text : null;
    toolTag.hidden = !tags;
    if (tags) {
      const keep = tags.includes(toolTag.value) ? toolTag.value : (id === 'text' ? 'p' : 'section');
      toolTag.replaceChildren(...tags.map((tag) => new Option(TAG_LABEL[tag] || tag, tag)));
      toolTag.value = keep;
    }
    if (phone && id !== 'select') setPhone(false);
    setStatus(id === 'select' ? 'Select: click an item to choose it, drag to move it, drag a handle to resize it.' : `${TOOLS.find((t) => t.id === id).label}: drag across the columns. A single click makes a standard size.`);
  }

  function setPhone(value) {
    finishEdit(true);
    phone = value;
    viewDesktop.setAttribute('aria-pressed', String(!value));
    viewPhone.setAttribute('aria-pressed', String(value));
    if (value && tool !== 'select') setTool('select');
    render({ keepProps: true });
    setStatus(value ? 'Phone view: one column, in reading order. This is your @media rule at work. Switch back to Desktop to move things.' : 'Desktop view.');
  }

  function select(id, focusStage = false) {
    if (editing && editing !== id) finishEdit(true);
    selected = id && byId(drawing, id) ? id : null;
    renderLayers(); renderProps(); drawOverlay();
    if (focusStage) stage.focus({ preventScroll: true });
    const item = byId(drawing, selected);
    if (item) {
      nodeOf(item.id)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      setStatus(`Selected .${item.name}, a <${item.tag}> covering columns ${item.col}–${item.col + item.colSpan - 1} and rows ${item.row}–${item.row + item.rowSpan - 1}.`);
    }
  }

  function addFromPanel() {
    const [kind, tag] = addKind.value.split(':');
    const current = byId(drawing, selected);
    const parent = current ? (current.kind === 'box' ? current.id : current.parent) : null;
    remember();
    try {
      const item = createItem(drawing, kind, { parent, col: 1, row: nextRow(drawing, parent) }, tag);
      if (kind === 'box' && !parent) item.colSpan = COLUMNS;
      render(); changed(); select(item.id);
      setStatus(`Added .${item.name} at the bottom of ${parent ? `.${byId(drawing, parent).name}` : 'the page'}. Use the grid numbers to place it.`);
    } catch (error) { setStatus(error.message); }
  }

  function deleteSelected() {
    const item = byId(drawing, selected);
    if (!item) return;
    remember();
    const count = descendants(drawing, item.id).length;
    removeItem(drawing, item.id);
    selected = null;
    render(); changed();
    setStatus(`Deleted .${item.name}${count ? ` and the ${count} item${count === 1 ? '' : 's'} inside it` : ''}. Undo brings it back.`);
    stage.focus({ preventScroll: true });
  }

  function duplicateSelected() {
    if (!selected) return;
    remember();
    try { const copy = duplicateItem(drawing, selected); render(); changed(); select(copy.id); setStatus(`Duplicated as .${copy.name}, placed below.`); }
    catch (error) { setStatus(error.message); }
  }

  function nudge(dx, dy, resize) {
    const item = byId(drawing, selected);
    if (!item) return;
    remember(`nudge:${item.id}:${resize}`);
    if (resize) Object.assign(item, clampPlacement({ ...item, colSpan: item.colSpan + dx, rowSpan: item.rowSpan + dy }));
    else Object.assign(item, clampPlacement({ ...item, col: Math.min(COLUMNS - item.colSpan + 1, item.col + dx), row: item.row + dy }));
    render(); changed();
    setStatus(`.${item.name}: columns ${item.col}–${item.col + item.colSpan - 1}, rows ${item.row}–${item.row + item.rowSpan - 1}.`);
  }

  // ---------- inline text editing ----------
  function startEdit(id) {
    const item = byId(drawing, id);
    if (!item || !['text', 'button', 'link'].includes(item.kind) || phone) return;
    finishEdit(true);
    selected = id;
    const node = nodeOf(id);
    editing = id;
    try { node.contentEditable = 'plaintext-only'; } catch { node.contentEditable = 'true'; }
    if (node.contentEditable !== 'plaintext-only') node.contentEditable = 'true';
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = shadow.getSelection ? shadow.getSelection() : getSelection();
    sel.removeAllRanges(); sel.addRange(range);
    drawOverlay();
    setStatus('Type the new words. Enter or a click elsewhere finishes; Esc cancels.');
    node.addEventListener('blur', () => finishEdit(true), { once: true });
  }

  function finishEdit(keep) {
    if (!editing) return;
    const id = editing;
    editing = null;
    const node = nodeOf(id);
    const item = byId(drawing, id);
    if (node && item && keep) {
      const value = node.innerText.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
      if (value !== item.text) { remember(); item.text = value; changed(); }
    }
    render();
  }

  // ---------- pointer: draw, move, resize ----------
  frame.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const target = event.composedPath()[0];
    if (editing && target.closest?.('[contenteditable]')) return;
    if (phone && tool !== 'select') return;
    event.preventDefault();
    stage.focus({ preventScroll: true });
    const { clientX: x, clientY: y } = event;
    if (tool !== 'select') {
      const parent = boxAt(x, y);
      const t = tracks(nodeOf(parent));
      const start = cellAt(t, x, y);
      drag = { mode: 'create', parent, t, start, cur: start, x, y, moved: false, kind: tool, tag: toolTag.hidden ? undefined : toolTag.value };
    } else if (target.dataset?.handle) {
      const item = byId(drawing, selected);
      drag = { mode: 'resize', id: item.id, handle: target.dataset.handle, t: tracks(nodeOf(item.parent)), x, y, moved: false, place: { ...item } };
    } else {
      const hit = target.closest?.('[data-ws-id]');
      if (!hit) { finishEdit(true); select(null); setStatus('Nothing selected: the panel on the right now styles the whole page.'); return; }
      const item = byId(drawing, hit.dataset.wsId);
      if (selected !== item.id) select(item.id);
      if (phone) return;
      const t = tracks(nodeOf(item.parent));
      const grab = cellAt(t, x, y);
      drag = { mode: 'move', id: item.id, x, y, moved: false, dCol: Math.max(0, grab.col - item.col), dRow: Math.max(0, grab.row - item.row), place: { ...item } };
    }
    frame.setPointerCapture(event.pointerId);
  });

  frame.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const { clientX: x, clientY: y } = event;
    if (!drag.moved && Math.hypot(x - drag.x, y - drag.y) < 4) return;
    drag.moved = true;
    if (drag.mode === 'create') {
      drag.cur = cellAt(drag.t, x, y);
      const p = { col: Math.min(drag.start.col, drag.cur.col), row: Math.min(drag.start.row, drag.cur.row), colSpan: Math.abs(drag.cur.col - drag.start.col) + 1, rowSpan: Math.abs(drag.cur.row - drag.start.row) + 1 };
      drag.place = p;
      drawOverlay({ ghost: cellRect(drag.t, p), guide: drag.parent, target: drag.parent, label: `grid-column: ${p.col} / span ${p.colSpan}; grid-row: ${p.row} / span ${p.rowSpan}` });
    } else if (drag.mode === 'move') {
      const parent = boxAt(x, y, drag.id);
      const t = tracks(nodeOf(parent));
      const cell = cellAt(t, x, y);
      const item = byId(drawing, drag.id);
      const span = Math.min(item.colSpan, COLUMNS);
      drag.place = { parent, col: Math.max(1, Math.min(COLUMNS - span + 1, cell.col - drag.dCol)), row: Math.max(1, cell.row - drag.dRow), colSpan: span, rowSpan: item.rowSpan };
      drawOverlay({ ghost: cellRect(t, drag.place), guide: parent, target: parent, label: `${parent ? `inside .${byId(drawing, parent).name}` : 'on the page'} · column ${drag.place.col}, row ${drag.place.row}` });
    } else if (drag.mode === 'resize') {
      const cell = cellAt(drag.t, x, y);
      const item = byId(drawing, drag.id);
      let { col, row } = item;
      let colEnd = item.col + item.colSpan - 1;
      let rowEnd = item.row + item.rowSpan - 1;
      if (drag.handle.includes('e')) colEnd = Math.max(col, cell.col);
      if (drag.handle.includes('w')) col = Math.min(cell.col, colEnd);
      if (drag.handle.includes('s')) rowEnd = Math.max(row, cell.row);
      if (drag.handle.includes('n')) row = Math.min(cell.row, rowEnd);
      drag.place = { col, row, colSpan: colEnd - col + 1, rowSpan: rowEnd - row + 1 };
      drawOverlay({ ghost: cellRect(drag.t, drag.place), guide: item.parent, label: `span ${drag.place.colSpan} columns × ${drag.place.rowSpan} rows` });
    }
  });

  function endDrag(event, cancelled = false) {
    if (!drag) return;
    const d = drag;
    drag = null;
    try { frame.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    if (cancelled) { drawOverlay(); return; }
    if (d.mode === 'create') {
      remember();
      try {
        const placement = d.moved ? d.place : { col: d.start.col, row: d.start.row };
        const item = createItem(drawing, d.kind, { parent: d.parent, ...placement }, d.tag);
        render(); changed();
        select(item.id);
        setTool('select');
        setStatus(`Drew .${item.name} <${item.tag}>${d.parent ? ` inside .${byId(drawing, d.parent).name}` : ''}. Its CSS: grid-column: ${item.col} / span ${item.colSpan}.`);
        if (['text', 'button', 'link'].includes(item.kind)) startEdit(item.id);
      } catch (error) { setStatus(error.message); drawOverlay(); }
    } else if (d.mode === 'move' && d.moved) {
      remember();
      const item = placeItem(drawing, d.id, d.place);
      render(); changed(); select(item.id);
    } else if (d.mode === 'resize' && d.moved) {
      remember();
      placeItem(drawing, d.id, d.place);
      render(); changed(); select(d.id);
    } else drawOverlay();
  }
  frame.addEventListener('pointerup', (event) => endDrag(event));
  frame.addEventListener('pointercancel', (event) => endDrag(event, true));
  frame.addEventListener('dblclick', (event) => {
    const hit = event.composedPath()[0].closest?.('[data-ws-id]');
    if (hit && tool === 'select') startEdit(hit.dataset.wsId);
  });

  // ---------- keyboard ----------
  stage.addEventListener('keydown', (event) => {
    const origin = event.composedPath()[0];
    if (editing) {
      if (event.key === 'Escape') { event.preventDefault(); const id = editing; editing = null; render(); select(id, true); setStatus('Edit cancelled.'); }
      else if (event.key === 'Enter' && !(event.shiftKey && byId(drawing, editing)?.tag === 'p')) { event.preventDefault(); const id = editing; finishEdit(true); select(id, true); }
      else if (event.key === ' ' && byId(drawing, editing)?.kind === 'button') {
        // Space would "press" a <button> instead of typing into it.
        event.preventDefault();
        const sel = shadow.getSelection ? shadow.getSelection() : getSelection();
        if (sel.rangeCount) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const space = document.createTextNode(' ');
          range.insertNode(space);
          range.setStartAfter(space);
          range.collapse(true);
          sel.removeAllRanges(); sel.addRange(range);
        }
      }
      return;
    }
    if (origin !== stage && origin.isContentEditable) return;
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
    if (mod && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); return; }
    if (mod && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelected(); return; }
    if (mod || event.altKey) return;
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[event.key] && selected && !phone) { event.preventDefault(); nudge(...arrows[event.key], event.shiftKey); return; }
    if ((event.key === 'Delete' || event.key === 'Backspace') && selected) { event.preventDefault(); deleteSelected(); return; }
    if (event.key === 'Enter' && selected) { event.preventDefault(); startEdit(selected); return; }
    if (event.key === 'Escape') { event.preventDefault(); if (drag) endDrag(event, true); else if (tool !== 'select') setTool('select'); else select(null); return; }
    const t = TOOLS.find((entry) => entry.key === event.key.toLowerCase());
    if (t) { event.preventDefault(); setTool(t.id); }
  });

  new ResizeObserver(() => { if (!drag) drawOverlay(); }).observe(stage);
  stage.addEventListener('scroll', () => { if (!drag) drawOverlay(); });

  setTool('select');
  updateUndo();
  render();

  return {
    load(value) {
      finishEdit(false);
      drawing = structuredClone(value || emptyDrawing());
      selected = null; undoStack = []; redoStack = []; updateUndo();
      render();
    },
    get drawing() { return drawing; },
    refresh() { render({ keepProps: false }); },
    relayout() { drawOverlay(); },
    flush() { finishEdit(true); clearTimeout(changeTimer); options.onChange?.(drawing); },
  };
}
