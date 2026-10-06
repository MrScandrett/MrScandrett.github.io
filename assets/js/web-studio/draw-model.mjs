/* ClassroomOS Web Studio — Draw mode model and code generator.
 *
 * A drawing is a tree of items placed on 12-column CSS Grids. The page is one grid,
 * and every box is a grid as well, so whatever is drawn inside a box is placed on
 * the box's own twelve columns. Positions are grid lines, never pixels:
 *   grid-column: <col> / span <colSpan>;   grid-row: <row> / span <rowSpan>;
 * The editor renders exactly the CSS these functions generate (with the page grid
 * on a wrapper and a container query standing in for the phone media query), so
 * what a student draws is what they export. No DOM access here: runs in Node too. */

export const COLUMNS = 12;
export const MAX_ITEMS = 400;
export const KINDS = ['box', 'text', 'image', 'button', 'link'];
export const TAGS = {
  box: ['section', 'header', 'nav', 'main', 'article', 'aside', 'footer', 'div'],
  text: ['h1', 'h2', 'h3', 'p'],
  image: ['img'],
  button: ['button'],
  link: ['a'],
};
export const FONTS = {
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: '"Trebuchet MS", Verdana, sans-serif',
  mono: 'ui-monospace, Consolas, "Courier New", monospace',
};
export const PHONE_WIDTH = 700;
const ALIGN = ['', 'left', 'center', 'right'];
const VALIGN = ['', 'start', 'center', 'end'];
const WEIGHTS = ['', '400', '700'];
const COLOR = /^#[0-9a-f]{6}$/;
const NAME = /^[a-z][a-z0-9-]{0,39}$/;

const DEFAULTS = {
  box: { tag: 'section', size: [6, 3], style: { background: '#ffffff', padding: 16, radius: 12 } },
  text: { tag: 'p', size: [6, 1], text: 'Write something worth reading.', style: { size: 18 } },
  image: { tag: 'img', size: [4, 4], style: { radius: 8 } },
  button: { tag: 'button', size: [3, 1], text: 'Try it', style: { background: '#c2431c', color: '#ffffff', padding: 12, radius: 8, weight: '700', align: 'center' } },
  link: { tag: 'a', size: [3, 1], text: 'See my projects', href: '#projects', style: { color: '#1f5fa8', size: 18 } },
};
const HEADING = { h1: { text: 'Your big idea', size: 44, weight: '700', span: [8, 2] }, h2: { text: 'A section heading', size: 30, weight: '700', span: [6, 1] }, h3: { text: 'A smaller heading', size: 22, weight: '700', span: [6, 1] } };

export function emptyDrawing() {
  return { version: 1, page: { background: '#f6f4ef', color: '#1d2733', font: 'system', maxWidth: 1100, gap: 16, row: 40, padding: 24 }, items: [], next: 1 };
}

export function blankStyle() {
  return { background: '', color: '', size: 0, weight: '', align: '', valign: '', padding: 0, radius: 0, borderWidth: 0, borderColor: '#1d2733', shadow: false, image: '' };
}

// ---------- tree helpers ----------
export const byId = (drawing, id) => drawing.items.find((item) => item.id === id) || null;

// Reading order: top-to-bottom, then left-to-right. It is also the HTML source order,
// which is the order a screen reader reads and the order boxes stack on a phone.
export function children(drawing, parentId) {
  return drawing.items.filter((item) => item.parent === parentId).sort((a, b) => a.row - b.row || a.col - b.col || a.id.localeCompare(b.id));
}

export function descendants(drawing, id) {
  const out = [];
  const visit = (parentId) => children(drawing, parentId).forEach((child) => { out.push(child); visit(child.id); });
  visit(id);
  return out;
}

export function depth(drawing, item) {
  let d = 0;
  for (let p = byId(drawing, item.parent); p; p = byId(drawing, p.parent)) d++;
  return d;
}

export function sanitizeName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^[^a-z]+/, '').replace(/-+/g, '-').replace(/-$/, '').slice(0, 40);
}

export function uniqueName(drawing, base, ignoreId = null) {
  const clean = sanitizeName(base) || 'item';
  const taken = new Set(drawing.items.filter((item) => item.id !== ignoreId).map((item) => item.name));
  if (!taken.has(clean)) return clean;
  for (let n = 2; ; n++) if (!taken.has(`${clean}-${n}`)) return `${clean}-${n}`;
}

export function clampPlacement({ col, row, colSpan, rowSpan }) {
  const c = Math.min(COLUMNS, Math.max(1, Math.round(col) || 1));
  return {
    col: c,
    row: Math.min(400, Math.max(1, Math.round(row) || 1)),
    colSpan: Math.min(COLUMNS - c + 1, Math.max(1, Math.round(colSpan) || 1)),
    rowSpan: Math.min(60, Math.max(1, Math.round(rowSpan) || 1)),
  };
}

// The first empty row below everything already in this container.
export function nextRow(drawing, parentId) {
  return children(drawing, parentId).reduce((max, item) => Math.max(max, item.row + item.rowSpan), 1);
}

export function createItem(drawing, kind, placement = {}, tag) {
  if (!KINDS.includes(kind)) throw new Error(`Unknown item kind: ${kind}`);
  if (drawing.items.length >= MAX_ITEMS) throw new Error(`A drawing can hold ${MAX_ITEMS} items.`);
  const def = DEFAULTS[kind];
  const chosenTag = TAGS[kind].includes(tag) ? tag : def.tag;
  const heading = kind === 'text' ? HEADING[chosenTag] : null;
  const parent = placement.parent && byId(drawing, placement.parent)?.kind === 'box' ? placement.parent : null;
  const [w, h] = heading ? heading.span : def.size;
  const item = {
    id: `i${drawing.next++}`,
    kind,
    tag: chosenTag,
    name: '',
    parent,
    // A standard-size item shifts left rather than shrinking when it is placed near the right edge.
    ...clampPlacement({ col: placement.colSpan ? placement.col ?? 1 : Math.min(placement.col ?? 1, COLUMNS - w + 1), row: placement.row ?? nextRow(drawing, parent), colSpan: placement.colSpan ?? w, rowSpan: placement.rowSpan ?? h }),
    text: heading ? heading.text : def.text || '',
    src: '',
    alt: '',
    decorative: false,
    href: def.href || '',
    style: { ...blankStyle(), ...def.style, ...(heading ? { size: heading.size, weight: heading.weight } : {}) },
  };
  item.name = uniqueName(drawing, { box: chosenTag === 'div' ? 'box' : chosenTag, text: chosenTag === 'p' ? 'text' : chosenTag === 'h1' ? 'title' : 'heading', image: 'picture', button: 'button', link: 'link' }[kind]);
  drawing.items.push(item);
  return item;
}

export function removeItem(drawing, id) {
  const gone = new Set([id, ...descendants(drawing, id).map((item) => item.id)]);
  drawing.items = drawing.items.filter((item) => !gone.has(item.id));
}

export function canParent(drawing, id, parentId) {
  if (parentId === null) return true;
  if (parentId === id) return false;
  const parent = byId(drawing, parentId);
  return Boolean(parent && parent.kind === 'box' && !descendants(drawing, id).some((item) => item.id === parentId));
}

export function placeItem(drawing, id, placement) {
  const item = byId(drawing, id);
  if (!item) return null;
  if ('parent' in placement && canParent(drawing, id, placement.parent)) item.parent = placement.parent;
  Object.assign(item, clampPlacement({ col: placement.col ?? item.col, row: placement.row ?? item.row, colSpan: placement.colSpan ?? item.colSpan, rowSpan: placement.rowSpan ?? item.rowSpan }));
  return item;
}

export function duplicateItem(drawing, id) {
  const source = byId(drawing, id);
  if (!source) return null;
  if (drawing.items.length + 1 + descendants(drawing, id).length > MAX_ITEMS) throw new Error(`A drawing can hold ${MAX_ITEMS} items.`);
  const map = new Map();
  const copy = (item, parent, offset) => {
    const clone = structuredClone(item);
    clone.id = `i${drawing.next++}`;
    clone.parent = parent;
    clone.row += offset;
    clone.name = uniqueName(drawing, item.name.replace(/-\d+$/, ''));
    map.set(item.id, clone.id);
    drawing.items.push(clone);
    children(drawing, item.id).filter((child) => !map.has(child.id) && child.id !== clone.id).forEach((child) => copy(child, clone.id, 0));
    return clone;
  };
  return copy(source, source.parent, nextRow(drawing, source.parent) - source.row);
}

// ---------- validation (drawings come back from files and browser storage) ----------
export function validateDrawing(value) {
  if (!value || typeof value !== 'object' || value.version !== 1 || !Array.isArray(value.items) || value.items.length > MAX_ITEMS) throw new Error('The drawing in this file is not valid.');
  const drawing = emptyDrawing();
  const p = value.page || {};
  const pick = (v, list, fallback) => (list.includes(v) ? v : fallback);
  const num = (v, min, max, fallback) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Math.round(Number(v)))) : fallback);
  const color = (v, fallback = '') => (typeof v === 'string' && COLOR.test(v) ? v : fallback);
  drawing.page = {
    background: color(p.background, drawing.page.background), color: color(p.color, drawing.page.color),
    font: pick(p.font, Object.keys(FONTS), 'system'), maxWidth: num(p.maxWidth, 480, 1600, 1100),
    gap: num(p.gap, 0, 48, 16), row: num(p.row, 16, 120, 40), padding: num(p.padding, 0, 64, 24),
  };
  const ids = new Set();
  const names = new Set();
  let highest = 0;
  for (const raw of value.items) {
    if (!raw || typeof raw.id !== 'string' || !/^i\d{1,6}$/.test(raw.id) || ids.has(raw.id) || !KINDS.includes(raw.kind)) throw new Error('The drawing contains an unknown item.');
    ids.add(raw.id);
    highest = Math.max(highest, Number(raw.id.slice(1)));
    const s = raw.style || {};
    let name = typeof raw.name === 'string' && NAME.test(raw.name) && !names.has(raw.name) ? raw.name : '';
    const item = {
      id: raw.id, kind: raw.kind, tag: pick(raw.tag, TAGS[raw.kind], TAGS[raw.kind][0]), name,
      parent: typeof raw.parent === 'string' ? raw.parent : null,
      ...clampPlacement(raw),
      text: typeof raw.text === 'string' ? raw.text.slice(0, 2000) : '',
      src: typeof raw.src === 'string' && safeSrc(raw.src) ? raw.src : '',
      alt: typeof raw.alt === 'string' ? raw.alt.slice(0, 300) : '',
      decorative: raw.decorative === true,
      href: typeof raw.href === 'string' && safeHref(raw.href) ? raw.href : '',
      style: {
        background: color(s.background), color: color(s.color), size: num(s.size, 0, 160, 0),
        weight: pick(String(s.weight ?? ''), WEIGHTS, ''), align: pick(s.align, ALIGN, ''), valign: pick(s.valign, VALIGN, ''),
        padding: num(s.padding, 0, 96, 0), radius: num(s.radius, 0, 200, 0), borderWidth: num(s.borderWidth, 0, 20, 0),
        borderColor: color(s.borderColor, '#1d2733'), shadow: s.shadow === true,
        image: typeof s.image === 'string' && safeSrc(s.image) ? s.image : '',
      },
    };
    drawing.items.push(item);
    if (item.name) names.add(item.name);
  }
  // Parents must exist, be boxes, and never loop.
  for (const item of drawing.items) {
    const parent = byId(drawing, item.parent);
    if (!parent || parent.kind !== 'box') item.parent = null;
  }
  for (const item of drawing.items) {
    const seen = new Set([item.id]);
    for (let p = byId(drawing, item.parent); p; p = byId(drawing, p.parent)) {
      if (seen.has(p.id)) { item.parent = null; break; }
      seen.add(p.id);
    }
  }
  for (const item of drawing.items) if (!item.name) item.name = uniqueName(drawing, item.kind, item.id);
  drawing.next = Math.max(highest + 1, Number(value.next) || 0);
  return drawing;
}

// Images: an uploaded file (images/…) or a full https:// address.
export function safeSrc(value) {
  return value === '' || /^images\/[a-z0-9][a-z0-9-]{0,60}\.(png|jpg|gif|webp)$/.test(value) || /^https:\/\/[^\s"'<>()\\]+$/i.test(value);
}

// Links: another site, an email address, a #section on this page, or a page in this site.
export function safeHref(value) {
  return value === '' || /^(https?:\/\/|mailto:)[^\s"'<>\\]+$/i.test(value) || /^#[A-Za-z][\w-]*$/.test(value) || /^[a-z0-9][a-z0-9-_/]*\.html(#[\w-]+)?$/i.test(value);
}

// ---------- code generation ----------
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rem = (px) => `${Number((px / 16).toFixed(3))}rem`;

function gridLines(lines, pad) {
  lines.push(`${pad}display: grid;`);
  lines.push(`${pad}grid-template-columns: repeat(${COLUMNS}, 1fr);`);
  lines.push(`${pad}grid-auto-rows: minmax(var(--row), auto);`);
  lines.push(`${pad}gap: var(--gap);`);
  lines.push(`${pad}align-content: start;   /* rows stay their own height instead of stretching */`);
}

function itemRule(item, options) {
  const s = item.style;
  const lines = [];
  lines.push(`  grid-column: ${item.col} / span ${item.colSpan};`);
  lines.push(`  grid-row: ${item.row} / span ${item.rowSpan};`);
  if (item.kind === 'box') gridLines(lines, '  ');
  else if (s.valign) lines.push(`  align-self: ${s.valign};   /* sit at the ${s.valign === 'start' ? 'top' : s.valign === 'end' ? 'bottom' : 'middle'} of its rows */`);
  if (s.padding) lines.push(`  padding: ${s.padding}px;`);
  if (s.background) lines.push(`  background-color: ${s.background};`);
  if (s.image && item.kind === 'box') {
    lines.push(`  background-image: url("${options.assetUrl(s.image)}");`);
    lines.push('  background-size: cover;');
    lines.push('  background-position: center;');
  }
  if (s.color) lines.push(`  color: ${s.color};`);
  if (s.size) lines.push(`  font-size: ${rem(s.size)};`);
  if (s.weight) lines.push(`  font-weight: ${s.weight};`);
  if (s.align) lines.push(`  text-align: ${s.align};`);
  if (s.borderWidth) lines.push(`  border: ${s.borderWidth}px solid ${s.borderColor};`);
  if (s.radius) lines.push(`  border-radius: ${s.radius}px;`);
  if (s.shadow) lines.push('  box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);');
  return lines;
}

/* options.root      selector for the page grid ('body' when exported)
 * options.phone     'media' for @media (exported) or 'container' for the editor's @container
 * options.assetUrl  maps images/… to the URL used in this context
 * options.varsOn    where the custom properties live (':host' inside the editor's shadow root) */
export function generateCSS(drawing, options = {}) {
  const root = options.root || 'body';
  const phone = options.phone || 'media';
  const assetUrl = options.assetUrl || ((src) => src);
  const p = drawing.page;
  const out = [];
  out.push('/* Made in ClassroomOS Web Studio, Draw mode.');
  out.push('   The page is a 12-column CSS Grid, and so is every box.');
  out.push('   Each item says which grid lines it covers:');
  out.push('     grid-column: <first column> / span <how many columns>;');
  out.push('     grid-row:    <first row>    / span <how many rows>; */');
  out.push('');
  out.push(`${options.varsOn || ':root'} {`);
  out.push(`  --gap: ${p.gap}px;   /* space between columns and rows */`);
  out.push(`  --row: ${p.row}px;   /* the shortest a row can be */`);
  out.push('}');
  out.push('');
  out.push('* {');
  out.push('  box-sizing: border-box;');
  out.push('}');
  out.push('');
  out.push(`${root} {`);
  out.push('  margin: 0 auto;');
  out.push(`  max-width: ${p.maxWidth}px;`);
  out.push(`  padding: ${p.padding}px;`);
  gridLines(out, '  ');
  out.push(`  font-family: ${FONTS[p.font]};`);
  out.push('  line-height: 1.5;');
  out.push(`  color: ${p.color};`);
  out.push(`  background: ${p.background};`);
  out.push('}');
  out.push('');
  out.push(`${root} h1, ${root} h2, ${root} h3, ${root} p {`);
  out.push('  margin: 0;');
  out.push('  line-height: 1.2;');
  out.push('}');
  out.push('');
  out.push(`${root} p {`);
  out.push('  line-height: 1.5;');
  out.push('}');
  out.push('');
  out.push(`${root} img {`);
  out.push('  display: block;');
  out.push('  width: 100%;');
  out.push('  height: 100%;');
  out.push('  object-fit: cover;   /* fill the area, cropping instead of stretching */');
  out.push('}');
  out.push('');
  out.push(`${root} button {`);
  out.push('  font: inherit;');
  out.push('  border: 0;');
  out.push('  cursor: pointer;');
  out.push('}');
  out.push('');
  out.push(`${root} a {`);
  out.push('  color: inherit;');
  out.push('}');
  const ordered = [];
  const walk = (parentId) => children(drawing, parentId).forEach((item) => { ordered.push(item); walk(item.id); });
  walk(null);
  for (const item of ordered) {
    out.push('');
    out.push(`.${item.name} {`);
    out.push(...itemRule(item, { assetUrl }));
    out.push('}');
  }
  if (ordered.length) {
    const grids = [root, ...ordered.filter((item) => item.kind === 'box').map((item) => `.${item.name}`)];
    out.push('');
    out.push(phone === 'media' ? `@media (max-width: ${PHONE_WIDTH}px) {` : `@container page (max-width: ${PHONE_WIDTH}px) {`);
    out.push('  /* Phones: one column. Every item stacks in reading order and keeps its height. */');
    out.push(`  ${grids.join(', ')} {`);
    out.push('    grid-template-columns: 1fr;');
    out.push('  }');
    for (const item of ordered) out.push(`  .${item.name} { grid-column: 1 / -1; grid-row: span ${item.rowSpan}; }`);
    out.push('}');
  }
  return `${out.join('\n')}\n`;
}

/* options.indent     starting indent (exported body content uses two spaces)
 * options.assetUrl   maps images/… for this context
 * options.editor     adds data-ws-* hooks and image placeholders for the Draw editor */
export function generateHTML(drawing, options = {}) {
  const assetUrl = options.assetUrl || ((src) => src);
  const out = [];
  const render = (item, level) => {
    const pad = '  '.repeat(level);
    const hook = options.editor ? ` data-ws-id="${item.id}" data-ws-kind="${item.kind}"` : '';
    const cls = `class="${item.name}"`;
    const textHTML = esc(item.text).replace(/\n/g, '<br>\n' + pad + '  ');
    switch (item.kind) {
      case 'box': {
        const kids = children(drawing, item.id);
        if (!kids.length) { out.push(`${pad}<${item.tag} ${cls}${hook}></${item.tag}>`); return; }
        out.push(`${pad}<${item.tag} ${cls}${hook}>`);
        kids.forEach((child) => render(child, level + 1));
        out.push(`${pad}</${item.tag}>`);
        return;
      }
      case 'text':
        out.push(`${pad}<${item.tag} ${cls}${hook}>${textHTML}</${item.tag}>`);
        return;
      case 'image': {
        const alt = item.decorative ? '' : item.alt;
        if (!item.src && options.editor) { out.push(`${pad}<div ${cls}${hook} data-ws-placeholder>Choose an image</div>`); return; }
        out.push(`${pad}<img ${cls}${hook} src="${esc(item.src ? assetUrl(item.src) : '')}" alt="${esc(alt)}">`);
        return;
      }
      case 'button':
        out.push(`${pad}<button ${cls}${hook} type="button">${textHTML}</button>`);
        return;
      case 'link':
        out.push(`${pad}<a ${cls}${hook} href="${esc(item.href || '#')}">${textHTML}</a>`);
        return;
    }
  };
  children(drawing, null).forEach((item) => render(item, options.indent ?? 1));
  return out.join('\n');
}

// ---------- design checks (the same habits the lessons teach) ----------
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// The colors an item's text is actually drawn in and on, after inheritance.
export function effectiveColors(drawing, item) {
  let color = '';
  let background = '';
  let overImage = false;
  for (let node = item; node; node = byId(drawing, node.parent)) {
    if (!color && node.style.color) color = node.style.color;
    if (!background && node.style.image && node.kind === 'box') overImage = true;
    if (!background && node.style.background) background = node.style.background;
  }
  return { color: color || drawing.page.color, background: background || drawing.page.background, overImage };
}

export function checks(drawing) {
  const results = [];
  const all = drawing.items;
  const h1s = all.filter((item) => item.kind === 'text' && item.tag === 'h1');
  if (!all.length) return [{ level: 'note', text: 'Choose a tool and drag on the page to draw your first box.' }];
  if (h1s.length !== 1) results.push({ level: 'fix', text: h1s.length ? `${h1s.length} items use <h1>. Keep one main title and make the others <h2>.` : 'No <h1> yet. Give the page one main title: a Text item set to h1.' });
  if (!all.some((item) => item.kind === 'box' && item.tag === 'main')) results.push({ level: 'note', text: 'No <main> box yet. Set the box that holds your page’s own content to main.' });
  for (const item of all) {
    if (item.kind === 'image' && !item.src) results.push({ level: 'fix', id: item.id, text: `${item.name} has no image chosen.` });
    if (item.kind === 'image' && !item.alt.trim() && !item.decorative) results.push({ level: 'fix', id: item.id, text: `${item.name} needs alt text, or tick “decoration only”.` });
    if (item.kind === 'link' && (!item.href || item.href === '#')) results.push({ level: 'note', id: item.id, text: `${item.name} does not go anywhere yet.` });
    if (item.kind === 'link' && /^(click here|here|read more|more|link)$/i.test(item.text.trim())) results.push({ level: 'fix', id: item.id, text: `${item.name}: “${item.text.trim()}” makes no sense on its own. Say where the link goes.` });
    if (['text', 'button', 'link'].includes(item.kind) && !item.text.trim()) results.push({ level: 'fix', id: item.id, text: `${item.name} is empty.` });
    if (['text', 'button', 'link'].includes(item.kind)) {
      const { color, background, overImage } = effectiveColors(drawing, item);
      const ratio = contrastRatio(color, background);
      const large = item.style.size >= 24 || (item.style.size >= 19 && item.style.weight === '700');
      if (ratio < (large ? 3 : 4.5)) results.push({ level: 'fix', id: item.id, text: `${item.name}: contrast ${ratio.toFixed(1)} : 1 is too low (needs ${large ? '3' : '4.5'} : 1). Darken the text or lighten the background.` });
      else if (overImage) results.push({ level: 'note', id: item.id, text: `${item.name} sits on a background image. Check it is readable everywhere on the photo.` });
    }
  }
  if (!results.length) results.push({ level: 'pass', text: 'Every check passes: one h1, alt text, readable contrast, and links that say where they go.' });
  return results;
}
