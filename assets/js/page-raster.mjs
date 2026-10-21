// page-raster.mjs — draws a same-origin document into an <img> that can be copied to a
// canvas or a WebGL texture. Used by the 360° page sphere (vr/page-sphere.html), because
// WebXR can't take a live DOM as a texture.
//
//   const shot = await rasterizeDocument(iframe.contentDocument, { width: 1280, viewportHeight: 720 });
//   ctx.drawImage(shot.image, 0, -y);   // shot.width × shot.height CSS px
//
// How: clone the <html> element, wrap it in <svg><foreignObject>, and let the browser lay it
// out as an SVG image. An SVG image may not fetch anything, so everything it needs is inlined
// first: the page's own stylesheets (rewritten so :root still matches), the @font-face files
// it actually uses, background images, <img> sources. Canvases become images; video and
// iframes become flat placeholders. Scripts never run in the copy.
//
// Limits (also in the lesson text): no live video/WebGL, no hover states, `position: fixed`
// things draw once at the top of the tall copy, and vh units are pinned to viewportHeight.

const dataCache = new Map();

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Fetch a URL as a data: URL. Cached; resolves null when it can't be fetched. */
export function toDataURL(url) {
  if (url.startsWith('data:')) return Promise.resolve(url);
  if (!dataCache.has(url)) {
    dataCache.set(url, fetch(url)
      .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.blob(); })
      .then(blobToDataURL)
      .catch(() => null));
  }
  return dataCache.get(url);
}

const URL_RE = /url\(\s*(['"]?)(?!data:|#)([^'")]+?)\1\s*\)/g;

/** Replace every url(...) in CSS text with a data: URL (resolved against `base`). */
async function inlineUrls(css, base) {
  const found = new Map();
  for (const m of css.matchAll(URL_RE)) {
    try { found.set(m[2], new URL(m[2], base).href); } catch { /* leave as is */ }
  }
  const resolved = new Map(await Promise.all([...found].map(async ([raw, abs]) => [raw, await toDataURL(abs)])));
  return css.replace(URL_RE, (all, quote, raw) => {
    const data = resolved.get(raw);
    return data ? `url("${data}")` : 'none';
  });
}

/** vh units resolve against the SVG image's own height, which is the whole page. Pin them. */
function pinViewportUnits(css, viewportHeight) {
  return css.replace(/(-?\d*\.?\d+)(?:d|s|l)?vh\b/g, (all, n) => `${(parseFloat(n) * viewportHeight) / 100}px`);
}

/** The copy keeps <html>/<body> as nested elements, so :root has to point at the nested html. */
function rewriteSelector(selector) {
  return selector.replace(/html:root/g, 'html[data-vr-snap]').replace(/:root/g, 'html[data-vr-snap]');
}

function collectFamilies(doc) {
  const win = doc.defaultView;
  const families = new Set();
  const seen = new Set();
  for (const el of doc.querySelectorAll('body, body *')) {
    const stack = win.getComputedStyle(el).fontFamily;
    if (seen.has(stack)) continue;
    seen.add(stack);
    for (const name of stack.split(',')) families.add(name.trim().replace(/^["']|["']$/g, '').toLowerCase());
  }
  return families;
}

async function ruleToCSS(rule, base, ctx) {
  const win = ctx.win;
  switch (rule.constructor.name) {
    case 'CSSStyleRule': {
      const body = rule.cssText.slice(rule.cssText.indexOf('{'));
      return `${rewriteSelector(rule.selectorText)} ${body}`;
    }
    case 'CSSImportRule': {
      if (rule.media && rule.media.mediaText && !win.matchMedia(rule.media.mediaText).matches) return '';
      return sheetToCSS(rule.styleSheet, ctx);
    }
    case 'CSSFontFaceRule': {
      const family = rule.style.getPropertyValue('font-family').trim().replace(/^["']|["']$/g, '').toLowerCase();
      return ctx.families.has(family) ? rule.cssText : '';
    }
    case 'CSSKeyframesRule':
    case 'CSSPageRule':
      return '';
    default: {
      if (!rule.cssRules) return rule.cssText; // @layer a, b; @charset …
      const head = rule.cssText.slice(0, rule.cssText.indexOf('{'));
      const inner = [];
      for (const child of rule.cssRules) inner.push(await ruleToCSS(child, base, ctx));
      return `${head}{${inner.join('\n')}}`;
    }
  }
}

async function sheetToCSS(sheet, ctx) {
  let rules;
  try { rules = sheet.cssRules; } catch { return ''; } // cross-origin sheet: unreadable
  const media = sheet.media && sheet.media.mediaText;
  if (media && media !== 'all' && !ctx.win.matchMedia(media).matches) return '';
  const base = sheet.href || ctx.doc.baseURI;
  const parts = [];
  for (const rule of rules) parts.push(await ruleToCSS(rule, base, ctx));
  return inlineUrls(parts.join('\n'), base);
}

async function collectCSS(doc, win, viewportHeight) {
  const ctx = { doc, win, families: collectFamilies(doc) };
  const sheets = [...doc.styleSheets];
  const css = (await Promise.all(sheets.map(sheet => sheetToCSS(sheet, ctx)))).join('\n');
  return pinViewportUnits(css, viewportHeight);
}

const DROP = new Set(['SCRIPT', 'NOSCRIPT', 'LINK', 'STYLE', 'META', 'TEMPLATE', 'BASE', 'TITLE']);

function placeholder(doc, from, rect, label) {
  const box = doc.createElement('div');
  box.className = from.className;
  if (from.id) box.id = from.id;
  box.setAttribute('style', `${from.getAttribute('style') || ''};display:flex;align-items:center;justify-content:center;width:${rect.width}px;height:${rect.height}px;background:#101722;color:#9fb3cc;font:14px sans-serif;overflow:hidden`);
  box.textContent = label;
  return box;
}

// Walk the live tree and its clone in lockstep, fixing up what a plain clone loses.
function fixUp(live, copy, doc, ctx) {
  for (let i = live.children.length - 1; i >= 0; i--) {
    const l = live.children[i];
    const c = copy.children[i];
    if (!c) continue;
    const tag = l.tagName;
    // The animated backdrop canvases are decoration (VR mode hides them too) and cost legibility.
    if (DROP.has(tag) || l.classList.contains('vr-ui') || l.id === 'site-canvas-bg' || l.id === 'hero-canvas') { c.remove(); continue; }
    const rect = l.getBoundingClientRect();
    // Inline styles can carry vh units and url() backgrounds, same as stylesheets.
    const inline = c.getAttribute('style');
    if (inline && /vh\b|url\(/.test(inline)) {
      const pinned = pinViewportUnits(inline, ctx.vh);
      c.setAttribute('style', pinned);
      if (/url\(/.test(pinned)) ctx.jobs.push(inlineUrls(pinned, doc.baseURI).then(v => c.setAttribute('style', v)));
    }
    if (tag === 'IMG') {
      // Lazy images below the fold never load in the hidden frame, so currentSrc can be empty:
      // fall back to the attribute (or a data-src a lazy loader would have swapped in).
      const attr = l.getAttribute('src') || l.getAttribute('data-src');
      let src = l.currentSrc;
      if (!src && attr) { try { src = new URL(attr, doc.baseURI).href; } catch { src = ''; } }
      c.removeAttribute('srcset');
      c.removeAttribute('sizes');
      c.removeAttribute('loading');
      c.removeAttribute('crossorigin');
      if (src) {
        ctx.jobs.push(toDataURL(src).then(data => {
          // A photo-heavy page must not turn into a hundred-megabyte SVG.
          if (data && (ctx.budget -= data.length) >= 0) c.setAttribute('src', data);
          else c.removeAttribute('src');
        }));
      } else c.removeAttribute('src');
    } else if (tag === 'PICTURE') {
      for (const s of [...c.querySelectorAll('source')]) s.remove();
      fixUp(l, c, doc, ctx);
    } else if (tag === 'CANVAS') {
      let url = null;
      try { url = l.toDataURL(); } catch { /* tainted */ }
      // Keep every attribute (id and class both feed CSS rules), then pin the drawn size.
      const img = doc.createElement('img');
      for (const attr of l.attributes) if (attr.name !== 'width' && attr.name !== 'height') img.setAttribute(attr.name, attr.value);
      img.setAttribute('style', `${l.getAttribute('style') || ''};width:${rect.width}px;height:${rect.height}px`);
      if (url) img.setAttribute('src', url);
      c.replaceWith(img);
    } else if (tag === 'VIDEO' || tag === 'IFRAME' || tag === 'EMBED' || tag === 'OBJECT') {
      c.replaceWith(placeholder(doc, l, rect, tag === 'VIDEO' ? '▶ video' : 'embedded content'));
    } else {
      if (tag === 'INPUT') {
        c.setAttribute('value', l.value);
        if (l.checked) c.setAttribute('checked', ''); else c.removeAttribute('checked');
      } else if (tag === 'TEXTAREA') {
        c.textContent = l.value;
      } else if (tag === 'OPTION') {
        if (l.selected) c.setAttribute('selected', ''); else c.removeAttribute('selected');
      }
      if (l.classList.contains('reveal')) c.classList.add('is-visible');
      if (l === ctx.scroller) c.setAttribute('data-vr-scroller', '');
      fixUp(l, c, doc, ctx);
    }
  }
}

function canvasColor(doc) {
  const win = doc.defaultView;
  const clear = v => !v || v === 'transparent' || /rgba\(.*,\s*0\)$/.test(v);
  const root = win.getComputedStyle(doc.documentElement).backgroundColor;
  if (!clear(root)) return root;
  const body = win.getComputedStyle(doc.body).backgroundColor;
  return clear(body) ? '#ffffff' : body;
}

/**
 * Lesson pages built as an app shell (html/body fixed at one screen, an inner panel that
 * scrolls) look one screen tall to the document. Find that inner scroller, if there is one,
 * so the copy can lay it out in full and clicks can be mapped back into it.
 * Returns the live element or null (including when the document itself scrolls).
 */
export function findMainScroller(doc) {
  const win = doc.defaultView;
  const view = win.innerHeight;
  const de = doc.documentElement;
  if (de.scrollHeight > view + 40 || doc.body.scrollHeight > view + 40) return null;
  let best = null;
  let bestExtra = 0;
  for (const el of doc.body.querySelectorAll('*')) {
    const extra = el.scrollHeight - el.clientHeight;
    if (extra <= 40 || extra <= bestExtra || el.clientHeight < 200 || el.clientWidth < win.innerWidth * 0.4) continue;
    if (!/auto|scroll/.test(win.getComputedStyle(el).overflowY)) continue;
    best = el;
    bestExtra = extra;
  }
  return best;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The browser could not draw this page.'));
    img.src = src;
  });
}

/**
 * Rasterize `doc` at `width` CSS px wide and as tall as its content (capped at maxHeight).
 * Resolves { image, width, height, background }. `image` is an HTMLImageElement.
 */
export async function rasterizeDocument(doc, { width = 1280, viewportHeight = 720, maxHeight = 16000, maxImageBytes = 36e6 } = {}) {
  const win = doc.defaultView;
  if (doc.fonts && doc.fonts.ready) await doc.fonts.ready;
  const body = doc.body;
  const scroller = findMainScroller(doc);
  let content = Math.max(doc.documentElement.scrollHeight, body.scrollHeight, body.getBoundingClientRect().bottom + win.scrollY);
  if (scroller) content += scroller.scrollHeight - scroller.clientHeight; // laid out in full below
  const height = Math.min(maxHeight, Math.max(viewportHeight, Math.ceil(content)));
  const background = canvasColor(doc);

  const copy = doc.documentElement.cloneNode(true);
  const jobs = [];
  const ctx = { jobs, vh: viewportHeight, scroller, budget: maxImageBytes };
  for (const child of [...copy.children]) if (child.tagName === 'HEAD') child.remove();
  const liveBody = doc.body;
  const copyBody = copy.querySelector('body');
  copy.setAttribute('data-vr-snap', '');
  copy.setAttribute('style', `${copy.getAttribute('style') || ''};display:block;width:${width}px;min-height:${height}px;margin:0`);
  if (copyBody) fixUp(liveBody, copyBody, doc, ctx);
  if (scroller) {
    // Let the inner scroller and everything holding it grow to the full content height.
    const grown = copy.querySelector('[data-vr-scroller]');
    for (let el = grown; el; el = el.parentElement) el.setAttribute('data-vr-expand', '');
  }

  const [css] = await Promise.all([collectCSS(doc, win, viewportHeight), ...jobs]);
  const style = doc.createElement('style');
  style.textContent = `${css}\n*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}.reveal{opacity:1!important;transform:none!important}[data-vr-expand]{height:auto!important;max-height:none!important;overflow:visible!important}`;
  copy.insertBefore(style, copy.firstChild);

  // The nested <html> doesn't paint its own background, so a wrapper carries the page colour.
  const xml = new XMLSerializer().serializeToString(copy);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject x="0" y="0" width="${width}" height="${height}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;background:${background}">${xml}</div></foreignObject></svg>`;
  // A data: URL, not a blob: URL: Chrome taints a canvas that draws a foreignObject from a blob.
  const url = await blobToDataURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  const image = await loadImage(url);
  return { image, width, height, background };
}
