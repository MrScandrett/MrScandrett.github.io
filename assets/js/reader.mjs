// ClassroomOS Reader — reader.html?src=<book url>
//
// Opens an allow-listed EPUB or PDF from another site and renders it inside
// ClassroomOS: the file is fetched into memory for this visit only (nothing is
// stored on the site), either straight from a CORS-enabled host or through the
// book proxy (workers/book-proxy) for hosts like Project Gutenberg.
//
//   src     the library link — a Gutenberg catalog page, or a direct .epub/.pdf
//   title   optional display title for books not in data/reader-library.json
//   author  optional display author
//
// EPUB chapters are re-built element by element from an allow-list (no scripts,
// styles, forms, or event attributes survive), so the book takes on the
// reader's own typography. PDFs render with the vendored PDF.js.
import { BOOK_PROXY, matchSource, gutenbergIdFromUrl, gutenbergEpubUrl } from "./book-sources.mjs";

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const params = new URLSearchParams(location.search);
const src = (params.get("src") || "").trim();
const PROXY = BOOK_PROXY.trim();
const MAX_BYTES = 100 * 1024 * 1024;
const POS_KEY = "reader:pos:" + src;

const ui = {
  bar: $("rdBar"), back: $("rdBack"), title: $("rdTitle"), author: $("rdAuthor"),
  tocBtn: $("rdTocBtn"), setBtn: $("rdSetBtn"), settings: $("rdSettings"),
  toc: $("rdToc"), tocList: $("rdTocList"), tocClose: $("rdTocClose"), scrim: $("rdScrim"),
  fill: $("rdProgressFill"), loading: $("rdLoading"), loadingText: $("rdLoadingText"), meter: $("rdMeterFill"),
  page: $("rdPage"), chapterNav: $("rdChapterNav"), prev: $("rdPrev"), next: $("rdNext"), chapterPos: $("rdChapterPos"),
  error: $("rdError"), errorTitle: $("rdErrorTitle"), errorText: $("rdErrorText"), errorOut: $("rdErrorOut"),
  credit: $("rdCredit"), sizeOut: $("rdSizeOut"), zoomOut: $("rdZoomOut"),
};

const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } },
  raw(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch { return null; }
  },
};

const isHttp = (u) => { try { return /^https?:$/.test(new URL(u).protocol); } catch { return false; } };

/* ── Chrome: back link, settings, contents drawer ─────────────────── */

(function wireBackLink() {
  // Arriving from the library: go *back* so the browser restores the open shelf
  // and scroll position. Otherwise link to the shelf the book lives on.
  let fromSite = false;
  try { fromSite = new URL(document.referrer).origin === location.origin; } catch { /* no referrer */ }
  ui.back.addEventListener("click", (e) => {
    if (fromSite && history.length > 1) {
      e.preventDefault();
      history.back();
    }
  });
})();

function setHeading(title, author) {
  ui.title.textContent = title || "Untitled";
  ui.author.textContent = author || "";
  ui.author.hidden = !author;
  document.title = `${title || "Reader"} · ClassroomOS Reader`;
}

function togglePanel(panel, button, open) {
  const show = open ?? panel.hidden;
  panel.hidden = !show;
  button.setAttribute("aria-expanded", String(show));
  if (panel === ui.toc) {
    ui.scrim.hidden = !show;
    if (show) (ui.tocList.querySelector('[aria-current="true"]') || ui.tocList.querySelector("a"))?.focus();
    else button.focus();
  }
}
ui.tocBtn.addEventListener("click", () => togglePanel(ui.toc, ui.tocBtn));
ui.tocClose.addEventListener("click", () => togglePanel(ui.toc, ui.tocBtn, false));
ui.scrim.addEventListener("click", () => togglePanel(ui.toc, ui.tocBtn, false));
ui.setBtn.addEventListener("click", () => togglePanel(ui.settings, ui.setBtn));
document.addEventListener("click", (e) => {
  if (!ui.settings.hidden && !ui.settings.contains(e.target) && !ui.setBtn.contains(e.target)) {
    togglePanel(ui.settings, ui.setBtn, false);
  }
});

const SIZES = [0.95, 1.05, 1.18, 1.3, 1.45, 1.62, 1.8];
let sizeIndex = Math.min(SIZES.length - 1, Math.max(0, Number(store.raw("reader:size") ?? 2)));
function applyDisplay() {
  const mode = root.dataset.readerMode || "";
  ui.settings.querySelectorAll("[data-mode]").forEach((b) => {
    const auto = !mode && (b.dataset.mode === (matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "paper"));
    b.setAttribute("aria-pressed", String(b.dataset.mode === mode || auto));
  });
  const face = root.dataset.readerFace || "serif";
  ui.settings.querySelectorAll("[data-face]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.face === face)));
  root.style.setProperty("--rd-size", SIZES[sizeIndex] + "rem");
  ui.sizeOut.textContent = Math.round((SIZES[sizeIndex] / SIZES[2]) * 100) + "%";
}
if (store.raw("reader:face")) root.dataset.readerFace = store.raw("reader:face");
ui.settings.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.mode) {
    root.dataset.readerMode = b.dataset.mode;
    store.raw("reader:mode", b.dataset.mode);
  } else if (b.dataset.face) {
    root.dataset.readerFace = b.dataset.face;
    store.raw("reader:face", b.dataset.face);
  } else if (b.dataset.size) {
    const anchor = readingAnchor();
    sizeIndex = Math.min(SIZES.length - 1, Math.max(0, sizeIndex + Number(b.dataset.size)));
    store.raw("reader:size", String(sizeIndex));
    applyDisplay();
    restoreAnchor(anchor);
    return;
  } else if (b.dataset.zoom && viewer?.zoom) {
    viewer.zoom(Number(b.dataset.zoom));
    return;
  }
  applyDisplay();
});
applyDisplay();

// Keep the reader's place when text size changes: remember the first visible block.
function readingAnchor() {
  if (viewer?.kind !== "epub") return null;
  for (const el of ui.page.children) if (el.getBoundingClientRect().bottom > 80) return el;
  return null;
}
function restoreAnchor(el) {
  if (el) requestAnimationFrame(() => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 80));
}

// Tuck the bar away while reading forward, bring it back on scroll up.
let lastY = scrollY;
let ticking = false;
addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = scrollY;
    const tuck = y > lastY && y > 120 && ui.settings.hidden && ui.toc.hidden;
    ui.bar.classList.toggle("is-tucked", tuck);
    lastY = y;
    viewer?.onScroll?.();
    ticking = false;
  });
}, { passive: true });

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!ui.toc.hidden) togglePanel(ui.toc, ui.tocBtn, false);
    else if (!ui.settings.hidden) togglePanel(ui.settings, ui.setBtn, false);
    return;
  }
  if (e.target.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    viewer?.step?.(e.key === "ArrowRight" ? 1 : -1, e);
  }
});

function setProgress(fraction) {
  ui.fill.style.width = (Math.max(0, Math.min(1, fraction)) * 100).toFixed(2) + "%";
}

/* ── Loading + errors ─────────────────────────────────────────────── */

function setLoading(text, fraction) {
  ui.loadingText.textContent = text;
  if (fraction != null) ui.meter.style.width = Math.round(fraction * 100) + "%";
}

function showError(kind, detail, entry) {
  if (!entry) setHeading(params.get("title") || "ClassroomOS Reader", params.get("author") || "");
  ui.loading.hidden = true;
  ui.page.hidden = true;
  ui.chapterNav.hidden = true;
  ui.error.hidden = false;
  const messages = {
    missing: ["No book selected", "Open a book from the library to read it here."],
    "not-allowed": [
      "This book isn’t on the reader’s shelf",
      "The ClassroomOS Reader only opens public-domain books from sources the library has checked. You can still read it on the original site.",
    ],
    "needs-proxy": [
      "This edition needs the book proxy",
      "Project Gutenberg doesn’t let other websites load its files directly, and the ClassroomOS book proxy hasn’t been set up yet. You can read it on Project Gutenberg in the meantime.",
    ],
    fetch: [
      "This book couldn’t be downloaded",
      "The source site didn’t respond, or the connection dropped. Try again in a moment, or read it on the original site.",
    ],
    parse: ["This file couldn’t be opened", "The download finished, but the reader couldn’t understand the file."],
  };
  const [title, text] = messages[kind] || messages.fetch;
  ui.errorTitle.textContent = title;
  ui.errorText.textContent = text;
  const out = entry?.home || (isHttp(src) ? src : "");
  ui.errorOut.hidden = !out;
  if (out) ui.errorOut.href = out;
  if (detail) console.warn("[reader]", kind, detail);
}

/* ── Source planning + download ───────────────────────────────────── */

function planSources(entry) {
  if (entry) {
    return entry.sources
      .map((s) => ({ ...s, rule: matchSource(s.url) }))
      .filter((s) => s.rule)
      .map((s) => ({ url: s.url, label: s.label, via: s.rule.cors ? "direct" : "proxy", format: s.rule.format }));
  }
  const rule = matchSource(src);
  if (rule) return [{ url: src, label: rule.label, via: rule.cors ? "direct" : "proxy", format: rule.format }];
  const gid = gutenbergIdFromUrl(src);
  if (gid) return [{ url: gutenbergEpubUrl(gid), label: "Project Gutenberg", via: "proxy", format: "epub" }];
  return [];
}

async function download(source) {
  const url = source.via === "direct" ? source.url : PROXY + (PROXY.includes("?") ? "&" : "?") + "url=" + encodeURIComponent(source.url);
  const res = await fetch(url, { credentials: "omit", referrerPolicy: "strict-origin" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const total = Number(res.headers.get("Content-Length")) || 0;
  if (total > MAX_BYTES) throw new Error("file too large");
  if (!res.body) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    if (got > MAX_BYTES) throw new Error("file too large");
    const mb = (n) => (n / 1048576).toFixed(1);
    setLoading(`Fetching from ${source.label}… ${mb(got)}${total ? " of " + mb(total) : ""} MB`, total ? got / total : null);
  }
  const out = new Uint8Array(got);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

function sniff(bytes) {
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return "epub";
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf";
  return null;
}

/* ── EPUB ─────────────────────────────────────────────────────────── */

const XLINK = "http://www.w3.org/1999/xlink";
const OPS = "http://www.idpf.org/2007/ops";
const DC = "http://purl.org/dc/elements/1.1/";
const DROP = new Set([
  "script", "style", "link", "meta", "title", "head", "iframe", "frame", "object", "embed", "form", "input", "button",
  "textarea", "select", "option", "audio", "video", "source", "track", "canvas", "template", "noscript", "base", "applet",
]);
const KEEP = new Set([
  "p", "div", "span", "section", "article", "header", "footer", "aside", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "em", "i", "strong", "b", "u", "s", "del", "ins", "sub", "sup", "small", "br", "hr", "ul", "ol", "li",
  "dl", "dt", "dd", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col", "figure",
  "figcaption", "img", "a", "pre", "code", "cite", "abbr", "q", "var", "kbd", "samp", "mark", "time", "address", "wbr",
]);
const RENAME = { tt: "code", center: "div", font: "span", big: "span", strike: "s", nav: "section", main: "section", body: "div" };
const KEEP_ATTRS = ["title", "lang", "dir", "colspan", "rowspan", "scope", "start", "reversed", "value", "abbr", "alt"];

const zipPath = (base, href) => {
  const u = new URL(href, "https://book.invalid/" + base);
  return { path: decodeURIComponent(u.pathname.slice(1)), frag: decodeURIComponent(u.hash.slice(1)) };
};
const dirOf = (p) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/") + 1) : "");
const parseXml = (text, type = "application/xml") => new DOMParser().parseFromString(text, type);

async function openEpub(bytes, source, entry) {
  setLoading("Opening the book…", 1);
  const zip = await window.JSZip.loadAsync(bytes);
  const read = async (p) => {
    const f = zip.file(p);
    if (!f) throw new Error("missing " + p);
    return f.async("string");
  };

  const container = parseXml(await read("META-INF/container.xml"));
  const opfPath = container.getElementsByTagName("rootfile")[0]?.getAttribute("full-path");
  const opf = parseXml(await read(opfPath));
  const opfDir = dirOf(opfPath);

  const manifest = new Map();
  for (const item of opf.getElementsByTagName("item")) {
    manifest.set(item.getAttribute("id"), {
      path: zipPath(opfDir, item.getAttribute("href")).path,
      type: item.getAttribute("media-type") || "",
      props: item.getAttribute("properties") || "",
    });
  }
  const spine = [...opf.getElementsByTagName("itemref")]
    .map((ref) => manifest.get(ref.getAttribute("idref")))
    .filter((m) => m && /html/.test(m.type));
  if (!spine.length) throw new Error("empty spine");
  const spineIndex = new Map(spine.map((s, i) => [s.path, i]));
  const weights = spine.map((s) => zip.files[s.path]?._data?.uncompressedSize || 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const before = weights.map((_, i) => weights.slice(0, i).reduce((a, b) => a + b, 0));

  const dcTitle = opf.getElementsByTagNameNS(DC, "title")[0]?.textContent.trim();
  const dcAuthor = opf.getElementsByTagNameNS(DC, "creator")[0]?.textContent.trim();
  const lang = opf.getElementsByTagNameNS(DC, "language")[0]?.textContent.trim();
  if (!entry) setHeading(params.get("title") || dcTitle, params.get("author") || dcAuthor);
  if (lang) ui.page.lang = lang;

  /* Table of contents: EPUB3 nav document, falling back to the EPUB2 NCX. */
  const toc = [];
  const navItem = [...manifest.values()].find((m) => /\bnav\b/.test(m.props));
  const ncxItem = [...manifest.values()].find((m) => m.type === "application/x-dtbncx+xml");
  if (navItem) {
    const navDoc = parseXml(await read(navItem.path), "application/xhtml+xml");
    const navs = [...navDoc.getElementsByTagName("nav")];
    const tocNav = navs.find((n) => (n.getAttributeNS(OPS, "type") || n.getAttribute("epub:type") || "").includes("toc")) || navs[0];
    const walk = (ol, into) => {
      for (const li of ol?.children || []) {
        if (li.localName !== "li") continue;
        const a = [...li.children].find((c) => c.localName === "a" || c.localName === "span");
        const node = { label: a?.textContent.replace(/\s+/g, " ").trim() || "", children: [] };
        if (a?.getAttribute("href")) Object.assign(node, zipPath(dirOf(navItem.path), a.getAttribute("href")));
        walk([...li.children].find((c) => c.localName === "ol"), node.children);
        if (node.label) into.push(node);
      }
    };
    if (tocNav) walk([...tocNav.children].find((c) => c.localName === "ol"), toc);
  } else if (ncxItem) {
    const ncx = parseXml(await read(ncxItem.path));
    const walk = (parent, into) => {
      for (const np of parent.children) {
        if (np.localName !== "navPoint") continue;
        const label = np.getElementsByTagName("text")[0]?.textContent.trim() || "";
        const href = np.getElementsByTagName("content")[0]?.getAttribute("src") || "";
        const node = { label, children: [], ...zipPath(dirOf(ncxItem.path), href) };
        walk(np, node.children);
        if (label) into.push(node);
      }
    };
    const navMap = ncx.getElementsByTagName("navMap")[0];
    if (navMap) walk(navMap, toc);
  }

  /* Images become blob: URLs from the zip, made once per file. */
  const blobs = new Map();
  async function blobFor(path) {
    if (blobs.has(path)) return blobs.get(path);
    const f = zip.file(path);
    if (!f) return null;
    const type = [...manifest.values()].find((m) => m.path === path)?.type || "";
    if (!/^image\/(png|jpe?g|gif|webp|svg\+xml|avif)$/.test(type)) return null;
    const url = URL.createObjectURL(new Blob([await f.async("uint8array")], { type }));
    blobs.set(path, url);
    return url;
  }
  addEventListener("pagehide", () => blobs.forEach((u) => URL.revokeObjectURL(u)));

  /* Rebuild a chapter element-by-element from the allow-list above. */
  async function sanitize(node, out, chapterPath) {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        out.appendChild(document.createTextNode(child.data));
        continue;
      }
      if (child.nodeType !== 1) continue;
      const name = child.localName.toLowerCase();
      if (DROP.has(name)) continue;

      if (name === "svg") {
        const image = child.getElementsByTagName("image")[0];
        const href = image && (image.getAttributeNS(XLINK, "href") || image.getAttribute("href"));
        if (href) {
          const url = await blobFor(zipPath(chapterPath, href).path);
          if (url) {
            const img = document.createElement("img");
            img.src = url;
            img.alt = "";
            out.appendChild(img);
          }
        }
        continue;
      }

      const tag = RENAME[name] || name;
      if (!KEEP.has(tag)) {
        await sanitize(child, out, chapterPath); // unknown wrapper (math, ruby, …): keep its text
        continue;
      }
      const el = document.createElement(tag);
      for (const attr of KEEP_ATTRS) {
        const v = child.getAttribute(attr);
        if (v != null) el.setAttribute(attr, v);
      }
      const xmlLang = child.getAttributeNS("http://www.w3.org/XML/1998/namespace", "lang");
      if (xmlLang && !el.lang) el.lang = xmlLang;
      if (child.id) el.id = "bk-" + child.id;
      const cls = child.getAttribute("class") || "";
      if (name === "center" || /\b(center|centered|c)\b/.test(cls) || /text-align:\s*center/.test(child.getAttribute("style") || "")) {
        el.dataset.align = "center";
      } else if (/\b(right|align-right)\b/.test(cls)) {
        el.dataset.align = "right";
      }

      if (tag === "img") {
        const s = child.getAttribute("src");
        const url = s && (await blobFor(zipPath(chapterPath, s).path));
        if (!url) continue;
        el.src = url;
        el.loading = "lazy";
        el.decoding = "async";
        if (!el.hasAttribute("alt")) el.alt = "";
      } else if (tag === "a") {
        const href = child.getAttribute("href") || child.getAttributeNS(XLINK, "href");
        if (href && /^https?:\/\//i.test(href)) {
          el.href = href;
          el.target = "_blank";
          el.rel = "noopener noreferrer";
        } else if (href && !/^[a-z][a-z0-9+.-]*:/i.test(href)) {
          const t = zipPath(chapterPath, href);
          if (spineIndex.has(t.path)) {
            el.href = "#" + (t.frag ? "bk-" + t.frag : "");
            el.dataset.path = t.path;
            el.dataset.frag = t.frag;
          }
        }
        const noteType = child.getAttributeNS(OPS, "type") || child.getAttribute("epub:type") || "";
        if (/noteref/.test(noteType)) el.setAttribute("role", "doc-noteref");
      }
      await sanitize(child, el, chapterPath);
      out.appendChild(el);
    }
  }

  let current = -1;
  let showToken = 0; // only the latest navigation may paint
  const tocLinks = [];

  async function show(index, { frag = "", fraction = 0, focus = false } = {}) {
    index = Math.max(0, Math.min(spine.length - 1, index));
    const token = ++showToken;
    if (index !== current) {
      const item = spine[index];
      const text = await read(item.path);
      let doc = parseXml(text, "application/xhtml+xml");
      if (doc.getElementsByTagName("parsererror").length) doc = parseXml(text, "text/html");
      const body = doc.body || doc.getElementsByTagName("body")[0] || doc.documentElement;
      const built = document.createDocumentFragment();
      await sanitize(body, built, item.path);
      if (token !== showToken) return;
      ui.page.replaceChildren(built);
      current = index;
      ui.prev.disabled = index === 0;
      ui.next.disabled = index === spine.length - 1;
      const here = tocLabelFor(item.path);
      ui.chapterPos.textContent = here ? here : `Section ${index + 1} of ${spine.length}`;
      tocLinks.forEach((a) => a.setAttribute("aria-current", String(a.dataset.path === item.path && !a.dataset.frag)));
    }
    requestAnimationFrame(() => {
      const target = frag && document.getElementById("bk-" + frag);
      if (target) {
        target.scrollIntoView({ block: "start" });
        target.classList.add("rd-flash");
        setTimeout(() => target.classList.remove("rd-flash"), 1700);
      } else {
        const max = document.documentElement.scrollHeight - innerHeight;
        window.scrollTo(0, Math.max(0, max * fraction));
      }
      if (focus) ui.page.focus({ preventScroll: true });
      onScroll();
    });
  }

  function tocLabelFor(path) {
    const flat = [];
    const walk = (nodes) => nodes.forEach((n) => { flat.push(n); walk(n.children); });
    walk(toc);
    return flat.find((n) => n.path === path)?.label || "";
  }

  function chapterFraction() {
    const max = document.documentElement.scrollHeight - innerHeight;
    return max > 0 ? Math.min(1, scrollY / max) : 1;
  }

  let saveTimer = 0;
  function onScroll() {
    if (current < 0) return;
    const f = chapterFraction();
    setProgress((before[current] + weights[current] * f) / totalWeight);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.set(POS_KEY, { i: current, f: Number(f.toFixed(4)), at: Date.now() }), 400);
  }

  /* Build the contents drawer. */
  const buildToc = (nodes, list) => {
    for (const n of nodes) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.textContent = n.label;
      a.href = "#";
      if (n.path != null && spineIndex.has(n.path)) {
        a.dataset.path = n.path;
        a.dataset.frag = n.frag || "";
        tocLinks.push(a);
      }
      li.appendChild(a);
      if (n.children.length) {
        const ol = document.createElement("ol");
        buildToc(n.children, ol);
        li.appendChild(ol);
      }
      list.appendChild(li);
    }
  };
  const tocSource = toc.length ? toc : spine.map((s, i) => ({ label: `Section ${i + 1}`, path: s.path, frag: "", children: [] }));
  buildToc(tocSource, ui.tocList);
  ui.tocBtn.disabled = false;
  ui.tocList.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-path]");
    if (!a) return;
    e.preventDefault();
    togglePanel(ui.toc, ui.tocBtn, false);
    show(spineIndex.get(a.dataset.path), { frag: a.dataset.frag, focus: true });
  });

  ui.page.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-path]");
    if (!a) return;
    e.preventDefault();
    show(spineIndex.get(a.dataset.path), { frag: a.dataset.frag });
  });
  ui.prev.addEventListener("click", () => show(current - 1, { focus: true }));
  ui.next.addEventListener("click", () => show(current + 1, { focus: true }));

  viewer = {
    kind: "epub",
    onScroll,
    step(dir) { show(current + dir, { focus: true }); },
  };

  root.dataset.readerKind = "epub";
  ui.settings.querySelectorAll('[data-for="pdf"]').forEach((f) => (f.hidden = true));
  ui.loading.hidden = true;
  ui.page.hidden = false;
  ui.chapterNav.hidden = spine.length < 2;

  const saved = store.get(POS_KEY);
  await show(saved && saved.i < spine.length ? saved.i : 0, { fraction: saved?.f || 0 });
}

/* ── PDF ──────────────────────────────────────────────────────────── */

async function openPdf(bytes, source, entry) {
  setLoading("Opening the PDF…", 1);
  const pdfjs = await import("../vendor/pdfjs/pdf.min.mjs");
  const base = new URL("../vendor/pdfjs/", import.meta.url).href;
  pdfjs.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({
    data: bytes,
    cMapUrl: base + "cmaps/",
    cMapPacked: true,
    standardFontDataUrl: base + "standard_fonts/",
    wasmUrl: base + "wasm/",
    isEvalSupported: false,
  }).promise;

  if (!entry) {
    const info = (await pdf.getMetadata().catch(() => null))?.info || {};
    setHeading(params.get("title") || info.Title || "PDF", params.get("author") || info.Author || "");
  }

  root.dataset.readerKind = "pdf";
  ui.settings.querySelectorAll('[data-for="epub"]').forEach((f) => (f.hidden = true));
  ui.page.classList.add("is-pdf");
  ui.page.setAttribute("aria-label", "PDF pages");
  ui.loading.hidden = true;
  ui.page.hidden = false;

  const ZOOMS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 2.5];
  let zoomIndex = 3;
  const first = await pdf.getPage(1);
  const firstVp = first.getViewport({ scale: 1 });
  const pages = [];
  const fitWidth = () => Math.min(ui.page.clientWidth || innerWidth - 32, 920);

  for (let n = 1; n <= pdf.numPages; n++) {
    const box = document.createElement("section");
    box.className = "rd-pdf-page";
    box.setAttribute("aria-label", `Page ${n}`);
    box.style.aspectRatio = `${firstVp.width} / ${firstVp.height}`;
    const num = document.createElement("span");
    num.className = "rd-pdf-num";
    num.textContent = n;
    num.setAttribute("aria-hidden", "true");
    box.appendChild(num);
    ui.page.appendChild(box);
    pages.push({ n, box, renderedAt: 0, task: null });
  }

  function layout() {
    const w = Math.round(fitWidth() * ZOOMS[zoomIndex]);
    pages.forEach((p) => (p.box.style.width = w + "px"));
    ui.zoomOut.textContent = ZOOMS[zoomIndex] === 1 ? "Fit" : Math.round(ZOOMS[zoomIndex] * 100) + "%";
  }

  let live = [];
  async function render(p) {
    const width = p.box.clientWidth;
    if (!width || p.renderedAt === width) return;
    p.task?.cancel();
    p.renderedAt = width;
    const page = await pdf.getPage(p.n);
    const unscaled = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: width / unscaled.width });
    p.box.style.aspectRatio = `${unscaled.width} / ${unscaled.height}`;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(vp.width * dpr);
    canvas.height = Math.floor(vp.height * dpr);
    canvas.setAttribute("aria-hidden", "true");
    const ctx = canvas.getContext("2d");
    p.task = page.render({ canvasContext: ctx, canvas, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null });
    try {
      await p.task.promise;
    } catch (err) {
      if (err?.name === "RenderingCancelledException") return;
      throw err;
    }
    const text = document.createElement("div");
    text.className = "textLayer";
    p.box.style.setProperty("--total-scale-factor", vp.scale);
    p.box.querySelectorAll("canvas, .textLayer").forEach((el) => el.remove());
    p.box.prepend(canvas);
    p.box.appendChild(text);
    new pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: text, viewport: vp }).render().catch(() => {});
    live = live.filter((q) => q !== p).concat(p);
    if (live.length > 14) {
      const far = live.shift();
      far.box.querySelectorAll("canvas, .textLayer").forEach((el) => el.remove());
      far.renderedAt = 0;
    }
  }

  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => en.isIntersecting && render(pages[Number(en.target.dataset.i)]).catch(console.warn)),
    { rootMargin: "120% 0px" }
  );
  pages.forEach((p, i) => { p.box.dataset.i = i; io.observe(p.box); });
  layout();

  function currentPage() {
    const mid = innerHeight / 2;
    for (const p of pages) {
      const r = p.box.getBoundingClientRect();
      if (r.bottom > mid) return p.n;
    }
    return pdf.numPages;
  }
  function goTo(n, smooth) {
    const p = pages[Math.max(0, Math.min(pages.length - 1, n - 1))];
    window.scrollTo({ top: p.box.getBoundingClientRect().top + scrollY - 72, behavior: smooth ? "smooth" : "auto" });
  }

  let saveTimer = 0;
  function onScroll() {
    const n = currentPage();
    const max = document.documentElement.scrollHeight - innerHeight;
    setProgress(max > 0 ? scrollY / max : 1);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.set(POS_KEY, { page: n, at: Date.now() }), 400);
    tocLinks.forEach((a) => a.setAttribute("aria-current", String(Number(a.dataset.page) === activeTocPage(n))));
  }

  function rerender() {
    const n = currentPage();
    layout();
    pages.forEach((p) => { if (p.renderedAt) render(p).catch(console.warn); });
    goTo(n);
  }
  let resizeTimer = 0;
  addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(rerender, 200); });

  /* Contents: the PDF outline if it has one, otherwise one entry per page. */
  const tocLinks = [];
  let outline = (await pdf.getOutline().catch(() => null)) || [];
  async function pageOf(dest) {
    try {
      const d = typeof dest === "string" ? await pdf.getDestination(dest) : dest;
      if (!d) return null;
      return typeof d[0] === "number" ? d[0] + 1 : (await pdf.getPageIndex(d[0])) + 1;
    } catch { return null; }
  }
  const list = [];
  async function walk(items, into) {
    for (const it of items) {
      const node = { label: (it.title || "").trim(), page: await pageOf(it.dest), children: [] };
      await walk(it.items || [], node.children);
      if (node.label && (node.page || node.children.length)) into.push(node);
    }
  }
  await walk(outline, list);
  const tocNodes = list.length ? list : pages.map((p) => ({ label: `Page ${p.n}`, page: p.n, children: [] }));
  const tocPages = [];
  const build = (nodes, ol) => nodes.forEach((n) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = n.label;
    if (n.page) { a.dataset.page = n.page; tocLinks.push(a); tocPages.push(n.page); }
    li.appendChild(a);
    if (n.children.length) { const sub = document.createElement("ol"); build(n.children, sub); li.appendChild(sub); }
    ol.appendChild(li);
  });
  build(tocNodes, ui.tocList);
  const sortedTocPages = [...new Set(tocPages)].sort((a, b) => a - b);
  function activeTocPage(n) {
    let best = sortedTocPages[0];
    for (const p of sortedTocPages) if (p <= n) best = p;
    return best;
  }
  ui.tocBtn.disabled = false;
  ui.tocList.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-page]");
    if (!a) return;
    e.preventDefault();
    togglePanel(ui.toc, ui.tocBtn, false);
    goTo(Number(a.dataset.page));
  });

  viewer = {
    kind: "pdf",
    onScroll,
    zoom(dir) {
      zoomIndex = Math.max(0, Math.min(ZOOMS.length - 1, zoomIndex + dir));
      rerender();
    },
    step(dir, e) {
      e.preventDefault();
      goTo(currentPage() + dir, true);
    },
  };

  const saved = store.get(POS_KEY);
  requestAnimationFrame(() => {
    if (saved?.page > 1) goTo(saved.page);
    onScroll();
  });
}

/* ── Main ─────────────────────────────────────────────────────────── */

let viewer = null;

function showCredit(source, entry) {
  ui.credit.replaceChildren();
  const parts = [`From ${source.label}`];
  if (entry?.rights) parts.push(entry.rights.replace(/\.$/, ""));
  ui.credit.append(parts.join(" · ") + ". ");
  if (source.label === "Standard Ebooks") {
    ui.credit.append("Standard Ebooks editions are dedicated to the public domain (CC0). ");
  }
  const a = document.createElement("a");
  a.href = entry?.home || source.url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = "View the source page ↗";
  ui.credit.append(a);
  ui.credit.hidden = false;
}

async function main() {
  if (!src) return showError("missing");
  const catalog = await fetch("data/reader-library.json")
    .then((r) => (r.ok ? r.json() : { books: {} }))
    .catch(() => ({ books: {} }));
  const entry = catalog.books?.[src] || null;
  if (entry?.format === "pdf") ui.back.href = "recipe-book.html#section-nasa";
  setHeading(entry?.title || params.get("title") || "Opening book…", entry?.author || params.get("author") || "");

  const sources = planSources(entry);
  if (!sources.length) return showError("not-allowed", src, entry);

  let failure = null;
  for (const source of sources) {
    if (source.via === "proxy" && !PROXY) {
      failure = failure || { kind: "needs-proxy" };
      continue;
    }
    let bytes;
    try {
      setLoading(`Fetching from ${source.label}…`, 0);
      bytes = await download(source);
    } catch (err) {
      failure = { kind: "fetch", err };
      continue;
    }
    try {
      const kind = sniff(bytes);
      if (kind === "epub") await openEpub(bytes, source, entry);
      else if (kind === "pdf") await openPdf(bytes, source, entry);
      else throw new Error("not an EPUB or PDF");
      showCredit(source, entry);
      root.dataset.readerSource = source.label;
      return;
    } catch (err) {
      failure = { kind: "parse", err };
    }
  }
  showError(failure?.kind || "fetch", failure?.err, entry);
}

main();
