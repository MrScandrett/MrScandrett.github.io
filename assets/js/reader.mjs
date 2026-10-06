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
//   file    a book the reader imported from the user's own device (see below)
//
// With no src or file, the page is the "Read your own book" shelf. Imported
// EPUB, PDF and plain-text files are kept in this browser's IndexedDB (never
// uploaded); plain text is turned into a small EPUB in memory so it gets the
// same chapters, search, bookmarks and read-aloud as any other book.
//
// EPUB chapters are re-built element by element from an allow-list (no scripts,
// styles, forms, or event attributes survive), so the book takes on the
// reader's own typography. PDFs render with the vendored PDF.js.
//
// Each format exposes the same `viewer` interface to the shared chrome:
//   here()        current position {…, label}   go(pos)       jump to a position
//   search(re)    async iterator of hits         goHit(hit)    jump to a hit
//   onScroll()    progress/position bookkeeping  step(dir, e)  arrow-key paging
// plus, for EPUB only, speakBlocks()/speakFrom()/nextChapter() for read-aloud.
// Reading position, bookmarks and display settings live in localStorage only.
import { BOOK_PROXY, matchSource, viaFor, gutenbergIdFromUrl, gutenbergEpubUrl } from "./book-sources.mjs";

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const params = new URLSearchParams(location.search);
const src = (params.get("src") || "").trim();
const localId = (params.get("file") || "").trim();
const PROXY = BOOK_PROXY.trim();
const MAX_BYTES = 100 * 1024 * 1024;
// Position and bookmarks are kept per book: the library link, or "local:<id>" for an imported file.
let POS_KEY = "";
let MARKS_KEY = "";
let ANNOTATIONS_KEY = "";
const WPM = 200; // a student reading pace, for "minutes left"
const TOP = 80; // px under the sticky bar that counts as "the top of the page"

const ui = {
  bar: $("rdBar"), back: $("rdBack"), title: $("rdTitle"), author: $("rdAuthor"),
  tocBtn: $("rdTocBtn"), searchBtn: $("rdSearchBtn"), markBtn: $("rdMarkBtn"), listenBtn: $("rdListenBtn"),
  setBtn: $("rdSetBtn"), settings: $("rdSettings"),
  toc: $("rdToc"), tocList: $("rdTocList"), tocClose: $("rdTocClose"), scrim: $("rdScrim"), where: $("rdWhere"),
  markList: $("rdMarkList"), marksEmpty: $("rdMarksEmpty"),
  annotationList: $("rdAnnotationList"), annotationsEmpty: $("rdAnnotationsEmpty"), exportAnnotations: $("rdExportAnnotations"),
  searchForm: $("rdSearchForm"), searchInput: $("rdSearchInput"), searchStatus: $("rdSearchStatus"), searchList: $("rdSearchList"),
  fill: $("rdProgressFill"), loading: $("rdLoading"), loadingText: $("rdLoadingText"), meter: $("rdMeterFill"),
  page: $("rdPage"), chapterNav: $("rdChapterNav"), prev: $("rdPrev"), next: $("rdNext"), chapterPos: $("rdChapterPos"),
  error: $("rdError"), errorTitle: $("rdErrorTitle"), errorText: $("rdErrorText"), errorOut: $("rdErrorOut"), errorPick: $("rdErrorPick"),
  openBtn: $("rdOpenBtn"), fileInput: $("rdFileInput"), dropCover: $("rdDropCover"),
  shelf: $("rdShelf"), pick: $("rdPick"), drop: $("rdDrop"), mineList: $("rdMineList"), mineEmpty: $("rdMineEmpty"),
  credit: $("rdCredit"), sizeOut: $("rdSizeOut"), zoomOut: $("rdZoomOut"),
  note: $("rdNote"), noteHead: $("rdNoteHead"), noteBody: $("rdNoteBody"), noteGo: $("rdNoteGo"), noteClose: $("rdNoteClose"),
  selectionAction: $("rdSelectionAction"), annotationEditor: $("rdAnnotationEditor"), annotationScrim: $("rdAnnotationScrim"), annotationQuote: $("rdAnnotationQuote"), annotationText: $("rdAnnotationText"), annotationSave: $("rdAnnotationSave"), annotationCancel: $("rdAnnotationCancel"),
  player: $("rdPlayer"), speakPrev: $("rdSpeakPrev"), speakPlay: $("rdSpeakPlay"), speakNext: $("rdSpeakNext"),
  speakRate: $("rdSpeakRate"), speakVoice: $("rdSpeakVoice"), speakClose: $("rdSpeakClose"),
  ruler: $("rdRuler"), status: $("rdStatus"), toast: $("rdToast"),
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
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const squash = (s) => s.replace(/\s+/g, " ").trim();
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

/* CSS Custom Highlight API: marks search hits and the spoken sentence without
   touching the chapter DOM. Browsers without it fall back to a text selection. */
const canHighlight = typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight === "function";
function paint(name, ranges) {
  if (!canHighlight) return;
  if (ranges?.length) CSS.highlights.set(name, new Highlight(...ranges));
  else CSS.highlights.delete(name);
}

let toastTimer = 0;
function toast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove("is-on"), 2200);
}

/* ── Chrome: back link, settings, drawer ───────────────────────────── */

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

/* The drawer holds three tabs: contents, bookmarks, search. */
let drawerOpener = null;
function openDrawer(tab, opener) {
  selectTab(tab);
  const wasOpen = !ui.toc.hidden;
  ui.toc.hidden = false;
  ui.scrim.hidden = false;
  if (!wasOpen) drawerOpener = opener || drawerOpener;
  ui.tocBtn.setAttribute("aria-expanded", String(tab !== "search"));
  ui.searchBtn.setAttribute("aria-expanded", String(tab === "search"));
  ui.where.textContent = !viewer ? "" : viewer.kind === "pdf" ? viewer.here().label : `${viewer.here().label} · ${ui.status.textContent}`;
  if (tab === "search") {
    ui.searchInput.focus();
    ui.searchInput.select();
  } else if (tab === "marks") {
    (ui.markList.querySelector("button") || $("rdTabMarks")).focus();
  } else if (tab === "annotations") {
    (ui.annotationList.querySelector("button") || $("rdExportAnnotations")).focus();
  } else {
    const cur = ui.tocList.querySelector('[aria-current="true"]');
    cur?.scrollIntoView({ block: "center" });
    (cur || ui.tocList.querySelector("a"))?.focus();
  }
}
function closeDrawer() {
  if (ui.toc.hidden) return;
  ui.toc.hidden = true;
  ui.scrim.hidden = true;
  ui.tocBtn.setAttribute("aria-expanded", "false");
  ui.searchBtn.setAttribute("aria-expanded", "false");
  (drawerOpener || ui.page).focus({ preventScroll: true });
  drawerOpener = null;
}
function selectTab(tab) {
  ui.toc.querySelectorAll('[role="tab"]').forEach((t) => {
    const on = t.dataset.tab === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    $(t.getAttribute("aria-controls")).hidden = !on;
  });
  if (tab === "marks") renderMarks();
  if (tab === "annotations") renderAnnotations();
}
ui.toc.querySelector('[role="tablist"]').addEventListener("click", (e) => {
  const t = e.target.closest('[role="tab"]');
  if (t) openDrawer(t.dataset.tab);
});
ui.toc.querySelector('[role="tablist"]').addEventListener("keydown", (e) => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  e.preventDefault();
  e.stopPropagation();
  const tabs = [...ui.toc.querySelectorAll('[role="tab"]')];
  const i = tabs.indexOf(document.activeElement);
  const t = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
  selectTab(t.dataset.tab);
  t.focus();
});
ui.tocBtn.addEventListener("click", () => (ui.toc.hidden ? openDrawer("contents", ui.tocBtn) : closeDrawer()));
ui.searchBtn.addEventListener("click", () => openDrawer("search", ui.searchBtn));
ui.tocClose.addEventListener("click", closeDrawer);
ui.scrim.addEventListener("click", closeDrawer);

function toggleSettings(open) {
  const show = open ?? ui.settings.hidden;
  ui.settings.hidden = !show;
  ui.setBtn.setAttribute("aria-expanded", String(show));
}
ui.setBtn.addEventListener("click", () => toggleSettings());
document.addEventListener("click", (e) => {
  if (!ui.settings.hidden && !ui.settings.contains(e.target) && !ui.setBtn.contains(e.target)) toggleSettings(false);
  if (!ui.note.hidden && !ui.note.contains(e.target) && !e.target.closest("a[data-path]")) closeNote();
});

const SIZES = [0.95, 1.05, 1.18, 1.3, 1.45, 1.62, 1.8];
let sizeIndex = clamp(Number(store.raw("reader:size") ?? 2), 0, SIZES.length - 1);
function applyDisplay() {
  const mode = root.dataset.readerMode || "";
  ui.settings.querySelectorAll("[data-mode]").forEach((b) => {
    const auto = !mode && (b.dataset.mode === (matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "paper"));
    b.setAttribute("aria-pressed", String(b.dataset.mode === mode || auto));
  });
  for (const key of ["face", "leading", "width"]) {
    const ds = "reader" + key[0].toUpperCase() + key.slice(1);
    const value = root.dataset[ds] || { face: "serif", leading: "normal", width: "medium" }[key];
    ui.settings.querySelectorAll(`[data-${key}]`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset[key] === value)));
  }
  ui.settings.querySelector('[data-toggle="ruler"]').setAttribute("aria-pressed", String(!ui.ruler.hidden));
  ui.settings.querySelector('[data-toggle="fullscreen"]').setAttribute("aria-pressed", String(!!document.fullscreenElement));
  root.style.setProperty("--rd-size", SIZES[sizeIndex] + "rem");
  ui.sizeOut.textContent = Math.round((SIZES[sizeIndex] / SIZES[2]) * 100) + "%";
}
if (store.raw("reader:face")) root.dataset.readerFace = store.raw("reader:face");
if (store.raw("reader:ruler") === "1") ui.ruler.hidden = false;
if (document.fullscreenEnabled) ui.settings.querySelector('[data-toggle="fullscreen"]').hidden = false;
document.addEventListener("fullscreenchange", applyDisplay);

// Anything that reflows the text keeps the reader on the same paragraph.
// Rapid clicks share one anchor, taken before the first change.
let reflowAnchor = null;
let reflowFrame = 0;
function reflow(change) {
  if (viewer?.kind === "epub") reflowAnchor ||= viewer.here();
  change();
  applyDisplay();
  if (!reflowAnchor) return;
  cancelAnimationFrame(reflowFrame);
  reflowFrame = requestAnimationFrame(async () => {
    await viewer.go(reflowAnchor);
    reflowAnchor = null;
  });
}

ui.settings.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.mode) {
    root.dataset.readerMode = b.dataset.mode;
    store.raw("reader:mode", b.dataset.mode);
  } else if (b.dataset.face || b.dataset.leading || b.dataset.width) {
    const key = b.dataset.face ? "face" : b.dataset.leading ? "leading" : "width";
    return reflow(() => {
      root.dataset["reader" + key[0].toUpperCase() + key.slice(1)] = b.dataset[key];
      store.raw("reader:" + key, b.dataset[key]);
    });
  } else if (b.dataset.size) {
    return reflow(() => {
      sizeIndex = clamp(sizeIndex + Number(b.dataset.size), 0, SIZES.length - 1);
      store.raw("reader:size", String(sizeIndex));
    });
  } else if (b.dataset.zoom && viewer?.zoom) {
    return viewer.zoom(Number(b.dataset.zoom));
  } else if (b.dataset.toggle === "ruler") {
    ui.ruler.hidden = !ui.ruler.hidden;
    store.raw("reader:ruler", ui.ruler.hidden ? "0" : "1");
  } else if (b.dataset.toggle === "fullscreen") {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else root.requestFullscreen?.().catch(() => toast("Full screen isn’t available here"));
  }
  applyDisplay();
});
applyDisplay();

/* Reading ruler: a clear band that follows the pointer (or the spoken sentence). */
function moveRuler(y) { root.style.setProperty("--rd-ruler-y", Math.round(y) + "px"); }
moveRuler(innerHeight * 0.4);
addEventListener("pointermove", (e) => { if (!ui.ruler.hidden && e.pointerType === "mouse") moveRuler(e.clientY); }, { passive: true });
addEventListener("pointerdown", (e) => { if (!ui.ruler.hidden && e.pointerType !== "mouse" && e.target.closest("#rdPage")) moveRuler(e.clientY); }, { passive: true });

// Tuck the bar away while reading forward, bring it back on scroll up.
let lastY = scrollY;
let ticking = false;
let statusTimer = 0;
addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = scrollY;
    const tuck = y > lastY && y > 120 && ui.settings.hidden && ui.toc.hidden;
    ui.bar.classList.toggle("is-tucked", tuck);
    lastY = y;
    viewer?.onScroll?.();
    if (viewer) {
      ui.status.classList.add("is-on");
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => ui.status.classList.remove("is-on"), 1800);
    }
    ticking = false;
  });
}, { passive: true });

ui.bar.addEventListener("focusin", () => ui.bar.classList.remove("is-tucked"));

let resizeTimer = 0;
let resizeAnchor = null;
addEventListener("resize", () => {
  if (viewer?.kind !== "epub") return;
  resizeAnchor ||= viewer.here();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { viewer.go(resizeAnchor); resizeAnchor = null; }, 200);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!ui.annotationEditor.hidden) closeAnnotationEditor();
    else if (!ui.note.hidden) closeNote();
    else if (!ui.toc.hidden) closeDrawer();
    else if (!ui.settings.hidden) toggleSettings(false);
    return;
  }
  if (e.target.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "o" || e.key === "O") return pickFile();
  if (!viewer) return;
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    if (e.target.closest('[role="tablist"]')) return;
    viewer.step?.(e.key === "ArrowRight" ? 1 : -1, e);
  } else if (e.key === "/") {
    e.preventDefault();
    openDrawer("search", document.activeElement);
  } else if (e.key === "b" || e.key === "B") {
    toggleMark();
  }
});

function setProgress(fraction) {
  ui.fill.style.width = (clamp(fraction, 0, 1) * 100).toFixed(2) + "%";
}
function minutesLeft(words) {
  const m = Math.round(words / WPM);
  return m < 1 ? "under a minute left" : `${m} min left`;
}

/* ── Bookmarks ────────────────────────────────────────────────────── */

let marks = [];
let annotations = [];
let pendingAnnotation = null;
let annotationColor = "yellow";
function setBookKey(key) {
  POS_KEY = "reader:pos:" + key;
  MARKS_KEY = "reader:marks:" + key;
  ANNOTATIONS_KEY = "reader:annotations:" + key;
  marks = (store.get(MARKS_KEY) || []).filter((m) => m && typeof m === "object");
  annotations = (store.get(ANNOTATIONS_KEY) || []).filter((a) => a && typeof a === "object" && a.quote && a.scope);
}
setBookKey(localId ? "local:" + localId : src);
function saveMarks() { store.set(MARKS_KEY, marks); }
function saveAnnotations() { store.set(ANNOTATIONS_KEY, annotations); }

const ANNOTATION_COLORS = ["yellow", "blue", "green", "pink"];
function annotationRangeIn(scope, a) {
  const text = scope?.textContent || "";
  if (!text || !a?.quote) return null;
  let at = text.indexOf(a.quote);
  let best = -1;
  let bestScore = -1;
  while (at >= 0) {
    const before = text.slice(Math.max(0, at - a.prefix.length), at);
    const after = text.slice(at + a.quote.length, at + a.quote.length + a.suffix.length);
    const score = (a.prefix && before.endsWith(a.prefix) ? 2 : 0) + (a.suffix && after.startsWith(a.suffix) ? 2 : 0);
    if (score > bestScore) { best = at; bestScore = score; }
    at = text.indexOf(a.quote, at + 1);
  }
  if (best < 0) return null;
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  let node, offset = 0, start = null, end = null;
  while ((node = walker.nextNode())) {
    const next = offset + node.data.length;
    if (!start && best >= offset && best <= next) start = [node, best - offset];
    if (start && best + a.quote.length >= offset && best + a.quote.length <= next) { end = [node, best + a.quote.length - offset]; break; }
    offset = next;
  }
  if (!start || !end) return null;
  const range = document.createRange();
  range.setStart(...start); range.setEnd(...end);
  return range;
}
function paintAnnotations() {
  for (const color of ANNOTATION_COLORS) paint("rd-annotation-" + color, null);
  if (!viewer?.annotationScope) return;
  const scope = viewer.annotationScope();
  for (const color of ANNOTATION_COLORS) {
    const ranges = annotations.filter((a) => a.color === color && viewer.annotationMatches?.(a))
      .map((a) => annotationRangeIn(scope, a)).filter(Boolean);
    paint("rd-annotation-" + color, ranges);
  }
}
function renderAnnotations() {
  ui.annotationList.replaceChildren();
  ui.annotationsEmpty.hidden = annotations.length > 0;
  $("rdTabAnnotations").textContent = annotations.length ? `Annotations (${annotations.length})` : "Annotations";
  annotations.slice().sort((a, b) => b.at - a.at).forEach((a) => {
    const li = document.createElement("li");
    const go = document.createElement("button");
    go.type = "button"; go.className = "rd-annotation-go";
    go.style.setProperty("--rd-annotation", `var(--rd-annotation-${a.color}, var(--rd-accent))`);
    const quote = document.createElement("q"); quote.textContent = a.quote;
    const meta = document.createElement("small"); meta.textContent = [a.label, a.note].filter(Boolean).join(" · ");
    go.append(quote, meta); go.addEventListener("click", () => { closeDrawer(); viewer?.goAnnotation?.(a); });
    const actions = document.createElement("div"); actions.className = "rd-annotation-item-actions";
    const del = document.createElement("button"); del.type = "button"; del.className = "rd-btn"; del.textContent = "Delete";
    del.setAttribute("aria-label", "Delete annotation: " + a.quote.slice(0, 80));
    del.addEventListener("click", () => { annotations = annotations.filter((x) => x !== a); saveAnnotations(); renderAnnotations(); paintAnnotations(); toast("Annotation deleted"); });
    actions.append(del); li.append(go, actions); ui.annotationList.append(li);
  });
}
function selectionAnchor(range) {
  const scope = viewer?.annotationScope?.();
  if (!scope || !scope.contains(range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement)) return null;
  const quote = range.toString().trim();
  if (!quote || quote.length > 4000) return null;
  const before = document.createRange(); before.selectNodeContents(scope); before.setEnd(range.startContainer, range.startOffset);
  const after = document.createRange(); after.selectNodeContents(scope); after.setStart(range.endContainer, range.endOffset);
  return { quote, prefix: before.toString().slice(-80), suffix: after.toString().slice(0, 80) };
}
function hideSelectionAction() { ui.selectionAction.hidden = true; }
function selectionChanged() {
  if (ui.annotationEditor.hidden === false) return;
  const range = getSelection()?.rangeCount ? getSelection().getRangeAt(0) : null;
  const anchor = range && selectionAnchor(range);
  if (!anchor || !viewer?.annotationData?.()) return hideSelectionAction();
  pendingAnnotation = { ...anchor, ...viewer.annotationData() };
  const box = range.getBoundingClientRect();
  if (!box.width && !box.height) return hideSelectionAction();
  ui.selectionAction.style.left = clamp(box.left + box.width / 2 - 72, 10, innerWidth - 154) + "px";
  ui.selectionAction.style.top = clamp(box.bottom + 8, 8, innerHeight - 48) + "px";
  ui.selectionAction.hidden = false;
}
document.addEventListener("selectionchange", () => requestAnimationFrame(selectionChanged));
ui.selectionAction.addEventListener("click", () => {
  if (!pendingAnnotation) return;
  hideSelectionAction(); ui.annotationQuote.textContent = `“${pendingAnnotation.quote}”`; ui.annotationText.value = "";
  ui.annotationEditor.hidden = false; ui.annotationScrim.hidden = false; ui.annotationText.focus();
});
function closeAnnotationEditor() { ui.annotationEditor.hidden = true; ui.annotationScrim.hidden = true; pendingAnnotation = null; getSelection()?.removeAllRanges(); }
ui.annotationCancel.addEventListener("click", closeAnnotationEditor);
ui.annotationScrim.addEventListener("click", closeAnnotationEditor);
ui.annotationEditor.querySelector(".rd-color-picks").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-annotation-color]"); if (!b) return;
  annotationColor = b.dataset.annotationColor;
  ui.annotationEditor.querySelectorAll("[data-annotation-color]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
});
ui.annotationSave.addEventListener("click", () => {
  if (!pendingAnnotation) return closeAnnotationEditor();
  annotations.push({ ...pendingAnnotation, color: annotationColor, note: ui.annotationText.value.trim(), at: Date.now() });
  saveAnnotations(); closeAnnotationEditor(); renderAnnotations(); paintAnnotations(); toast("Annotation saved");
});
ui.exportAnnotations.addEventListener("click", () => {
  if (!annotations.length) return toast("There are no annotations to export yet");
  const title = ui.title.textContent || "Reader annotations";
  const lines = [`# ${title} — annotations`, ""];
  annotations.slice().sort((a, b) => a.at - b.at).forEach((a) => { lines.push(`## ${a.label || "Passage"}`, "", `> ${a.quote.replace(/\n/g, "\n> ")}`, "", a.note || "", ""); });
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = `${title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "reader"}-annotations.md`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
function markHere() {
  const here = viewer?.here();
  return here ? marks.findIndex((m) => viewer.samePlace(m, here)) : -1;
}
function syncMarkBtn() {
  const on = markHere() >= 0;
  ui.markBtn.setAttribute("aria-pressed", String(on));
  ui.markBtn.title = on ? "Remove this bookmark (B)" : "Bookmark this spot (B)";
}
function toggleMark() {
  if (!viewer) return;
  const i = markHere();
  if (i >= 0) {
    marks.splice(i, 1);
    toast("Bookmark removed");
  } else {
    const here = viewer.here();
    marks.push({ ...here, at: Date.now() });
    marks.sort((a, b) => viewer.order(a) - viewer.order(b));
    toast("Bookmarked · find it under Contents → Bookmarks");
  }
  saveMarks();
  syncMarkBtn();
  if (!ui.toc.hidden) renderMarks();
}
ui.markBtn.addEventListener("click", toggleMark);

function renderMarks() {
  ui.markList.replaceChildren();
  ui.marksEmpty.hidden = marks.length > 0;
  $("rdTabMarks").textContent = marks.length ? `Bookmarks (${marks.length})` : "Bookmarks";
  marks.forEach((m, i) => {
    const li = document.createElement("li");
    const go = document.createElement("button");
    go.type = "button";
    go.className = "rd-mark-go";
    go.dataset.i = i;
    const where = document.createElement("strong");
    where.textContent = m.label || "Bookmark";
    go.append(where);
    if (m.snippet) {
      const snip = document.createElement("span");
      snip.textContent = m.snippet;
      go.append(snip);
    }
    const del = document.createElement("button");
    del.type = "button";
    del.className = "rd-btn rd-mark-del";
    del.dataset.del = i;
    del.setAttribute("aria-label", "Delete bookmark: " + (m.label || ""));
    del.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>';
    li.append(go, del);
    ui.markList.append(li);
  });
}
ui.markList.addEventListener("click", (e) => {
  const del = e.target.closest("[data-del]");
  if (del) {
    marks.splice(Number(del.dataset.del), 1);
    saveMarks();
    renderMarks();
    syncMarkBtn();
    (ui.markList.querySelector("button") || $("rdTabMarks")).focus();
    return;
  }
  const go = e.target.closest("[data-i]");
  if (!go) return;
  const m = marks[Number(go.dataset.i)];
  closeDrawer();
  viewer.go(m, { focus: true });
});

/* ── Search ───────────────────────────────────────────────────────── */

// Old texts mix straight and curly quotes, so ' matches ’ and " matches “ ”.
function queryRegex(q) {
  const body = squash(q)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/ /g, "\\s+")
    .replace(/['‘’]/g, "['‘’]")
    .replace(/["“”]/g, '["“”]');
  return body ? new RegExp(body, "gi") : null;
}

const MAX_HITS = 500;
let searchToken = 0;
let activeQuery = null; // RegExp painted across the open chapter/page
async function runSearch(q) {
  const token = ++searchToken;
  ui.searchList.replaceChildren();
  const re = q.trim().length >= 2 ? queryRegex(q) : null;
  activeQuery = re;
  viewer?.paintHits?.();
  if (!re) {
    ui.searchStatus.textContent = q.trim() ? "Keep typing…" : "Type a word or phrase to find it anywhere in the book.";
    return;
  }
  ui.searchStatus.textContent = "Searching…";
  let count = 0;
  let batch = document.createDocumentFragment();
  const flush = () => { ui.searchList.append(batch); batch = document.createDocumentFragment(); };
  for await (const item of viewer.search(re)) {
    if (token !== searchToken) return;
    if (item.progress) {
      ui.searchStatus.textContent = `Searching… ${item.progress}`;
      flush();
      continue;
    }
    count++;
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.hit = item;
    const where = document.createElement("strong");
    where.textContent = item.label;
    const snip = document.createElement("span");
    const mark = document.createElement("mark");
    mark.textContent = item.snippet[1];
    snip.append(item.snippet[0], mark, item.snippet[2]);
    b.append(where, snip);
    li.append(b);
    batch.append(li);
    if (count >= MAX_HITS) break;
  }
  if (token !== searchToken) return;
  flush();
  ui.searchStatus.textContent = count === 0
    ? `No matches for “${q.trim()}”.`
    : count >= MAX_HITS
      ? `${MAX_HITS}+ matches — add another word to narrow it down.`
      : `${count} match${count === 1 ? "" : "es"} for “${q.trim()}”.`;
}
let searchDebounce = 0;
ui.searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => runSearch(ui.searchInput.value), 350);
});
ui.searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearTimeout(searchDebounce);
  runSearch(ui.searchInput.value);
});
ui.searchList.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b?.hit) return;
  ui.searchList.querySelectorAll('[aria-current="true"]').forEach((x) => x.removeAttribute("aria-current"));
  b.setAttribute("aria-current", "true");
  if (matchMedia("(max-width: 900px)").matches) closeDrawer();
  viewer.goHit(b.hit);
});

function snippetAround(text, start, end) {
  const ws = (t) => t.replace(/\s+/g, " ");
  let pre = ws(text.slice(Math.max(0, start - 50), start));
  if (start > 50) pre = "…" + pre.replace(/^\S*\s/, "");
  let post = ws(text.slice(end, end + 70));
  if (end + 70 < text.length) post = post.replace(/\s\S*$/, "") + "…";
  return [pre.trimStart(), ws(text.slice(start, end)), post.trimEnd()];
}

/* ── Footnote pop-ups ─────────────────────────────────────────────── */

let noteTarget = null;
function openNote(link, nodes, label) {
  ui.noteBody.replaceChildren(...nodes);
  ui.noteHead.textContent = label || "Note";
  ui.note.hidden = false;
  const r = link.getBoundingClientRect();
  const w = ui.note.offsetWidth;
  const left = clamp(r.left + r.width / 2 - w / 2, 12, document.documentElement.clientWidth - w - 12);
  const below = r.bottom + 10 + ui.note.offsetHeight < innerHeight || r.top < innerHeight / 2;
  ui.note.style.left = left + scrollX + "px";
  ui.note.style.top = (below ? r.bottom + 10 : r.top - 10 - ui.note.offsetHeight) + scrollY + "px";
  noteTarget = link;
  ui.noteGo.focus({ preventScroll: true });
}
function closeNote() {
  if (ui.note.hidden) return;
  ui.note.hidden = true;
  noteTarget?.focus({ preventScroll: true });
  noteTarget = null;
}
ui.noteClose.addEventListener("click", closeNote);

/* ── Read aloud (EPUB) ────────────────────────────────────────────── */

const speech = (() => {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance !== "function") return null;
  const segmenter = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: "sentence" }) : null;
  let blocks = [];
  let bi = 0;
  let segs = [];
  let si = 0;
  let playing = false;
  let token = 0;
  let voices = [];

  // Sentences of one block as {text, start, end} offsets into its textContent.
  // Long sentences are split at commas: some engines stop mid-utterance after ~15 s.
  function sentences(el) {
    // Line breaks in the source are just wrapping; same-length swap keeps offsets valid.
    const text = el.textContent.replace(/[\r\n\u2028\u2029]/g, " ");
    const out = [];
    const push = (start, end) => {
      while (end - start > 260) {
        const cut = text.slice(start, start + 260).search(/[,;:—]\s(?!.*[,;:—]\s)/);
        const at = cut > 60 ? start + cut + 2 : start + 260;
        out.push({ start, end: at });
        start = at;
      }
      out.push({ start, end });
    };
    if (segmenter) for (const s of segmenter.segment(text)) push(s.index, s.index + s.segment.length);
    else {
      const re = /[^.!?]+(?:[.!?]+["’”)\]]*|$)\s*/g;
      let m;
      while ((m = re.exec(text)) && m[0]) push(m.index, m.index + m[0].length);
    }
    return out.map((s) => ({ ...s, text: text.slice(s.start, s.end) })).filter((s) => /[\p{L}\p{N}]/u.test(s.text));
  }
  function rangeOf(el, start, end) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let at = 0;
    let begun = false;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const len = n.data.length;
      if (!begun && start <= at + len) { range.setStart(n, Math.max(0, start - at)); begun = true; }
      if (begun && end <= at + len) { range.setEnd(n, Math.max(0, end - at)); return range; }
      at += len;
    }
    range.selectNodeContents(el);
    return range;
  }

  function loadVoices() {
    voices = synth.getVoices();
    const lang = (ui.page.lang || document.documentElement.lang || "en").slice(0, 2).toLowerCase();
    const fit = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
    const list = fit.length ? fit : voices;
    const saved = store.raw("reader:voice");
    ui.speakVoice.replaceChildren(...list.map((v) => new Option(`${v.name}${v.localService ? "" : " (online)"}`, v.voiceURI)));
    const pick = list.find((v) => v.voiceURI === saved) || list.find((v) => v.default && v.localService) || list.find((v) => v.localService) || list[0];
    if (pick) ui.speakVoice.value = pick.voiceURI;
    ui.speakVoice.closest("label").hidden = list.length < 2;
  }
  synth.addEventListener?.("voiceschanged", loadVoices);
  ui.speakRate.value = store.raw("reader:rate") || "1";
  ui.speakRate.addEventListener("change", () => { store.raw("reader:rate", ui.speakRate.value); if (playing) restart(); });
  ui.speakVoice.addEventListener("change", () => { store.raw("reader:voice", ui.speakVoice.value); if (playing) restart(); });

  function setPlaying(on) {
    playing = on;
    ui.player.classList.toggle("is-paused", !on);
    ui.speakPlay.setAttribute("aria-label", on ? "Pause" : "Resume reading aloud");
  }
  function current() { return segs[si] && blocks[bi] ? rangeOf(blocks[bi], segs[si].start, segs[si].end) : null; }
  function showCurrent() {
    const range = current();
    if (!range) return;
    if (canHighlight) paint("rd-speak", [range]);
    else {
      blocks.forEach((b) => b.classList.remove("rd-speaking"));
      blocks[bi].classList.add("rd-speaking");
    }
    const r = range.getBoundingClientRect();
    if (r.top < TOP || r.bottom > innerHeight - 110) {
      window.scrollTo({ top: scrollY + r.top - innerHeight * 0.35, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      moveRuler(innerHeight * 0.35 + r.height / 2);
    } else moveRuler(r.top + r.height / 2);
  }
  function speak() {
    const my = ++token;
    synth.cancel();
    if (!segs[si]) return;
    showCurrent();
    // Chrome drops an utterance queued in the same task as cancel().
    setTimeout(() => {
      if (my !== token) return;
      const u = new SpeechSynthesisUtterance(segs[si].text);
      const voice = voices.find((v) => v.voiceURI === ui.speakVoice.value);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else if (ui.page.lang) u.lang = ui.page.lang;
      u.rate = Number(ui.speakRate.value) || 1;
      u.onend = () => { if (my === token && playing) advance(1).then((ok) => ok && speak()); };
      u.onerror = (e) => {
        if (my !== token || e.error === "interrupted" || e.error === "canceled") return;
        setPlaying(false);
        toast("Read aloud stopped: this browser’s voice isn’t available");
      };
      synth.speak(u);
    }, 40);
  }
  function restart() { if (playing) speak(); }

  // Move one sentence forward/back across blocks, and on into the next chapter.
  async function advance(dir) {
    si += dir;
    while (si < 0 || si >= segs.length) {
      if (si < 0) {
        if (bi === 0) { si = 0; return segs.length > 0; }
        segs = sentences(blocks[--bi]);
        si = segs.length - 1;
      } else if (++bi < blocks.length) {
        segs = sentences(blocks[bi]);
        si = 0;
      } else {
        if (!(await viewer.nextChapter())) {
          stop();
          toast("The end — that was the last page");
          return false;
        }
        blocks = viewer.speakBlocks();
        bi = -1; // the loop steps into block 0 (or on past an empty chapter)
        segs = [];
        si = 0;
      }
    }
    return true;
  }

  async function start() {
    loadVoices();
    blocks = viewer.speakBlocks();
    if (!blocks.length) return toast("There’s no text to read on this page");
    bi = viewer.speakFrom(blocks);
    segs = sentences(blocks[bi]);
    si = 0;
    // Start at the first sentence that is actually on screen.
    while (si < segs.length - 1 && rangeOf(blocks[bi], segs[si].start, segs[si].end).getBoundingClientRect().bottom < TOP) si++;
    if (!segs.length) { si = -1; if (!(await advance(1))) return; }
    ui.player.hidden = false;
    ui.listenBtn.setAttribute("aria-expanded", "true");
    root.classList.add("is-speaking");
    setPlaying(true);
    speak();
  }
  function stop() {
    token++;
    synth.cancel();
    setPlaying(false);
    paint("rd-speak", null);
    blocks.forEach((b) => b.classList.remove("rd-speaking"));
    ui.player.hidden = true;
    ui.listenBtn.setAttribute("aria-expanded", "false");
    root.classList.remove("is-speaking");
  }
  ui.speakPlay.addEventListener("click", () => {
    if (playing) { token++; synth.cancel(); setPlaying(false); }
    else { setPlaying(true); speak(); }
  });
  ui.speakPrev.addEventListener("click", async () => { token++; synth.cancel(); await advance(-1); playing ? speak() : showCurrent(); });
  ui.speakNext.addEventListener("click", async () => { token++; synth.cancel(); if (await advance(1)) playing ? speak() : showCurrent(); });
  ui.speakClose.addEventListener("click", () => { stop(); ui.listenBtn.focus(); });
  ui.listenBtn.addEventListener("click", () => (ui.player.hidden ? start() : stop()));
  addEventListener("pagehide", () => synth.cancel());
  synth.cancel(); // a previous page's speech can outlive navigation

  return { stop, get active() { return !ui.player.hidden; } };
})();

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
    parse: localId
      ? ["This file couldn’t be opened", "The reader couldn’t make sense of this file. It may be damaged, or not really an EPUB, PDF or text file."]
      : ["This file couldn’t be opened", "The download finished, but the reader couldn’t understand the file."],
    drm: [
      "This book is copy-protected",
      "It has DRM (digital rights management), which locks it to the app or store it came from. Read it there, or open a DRM-free EPUB, PDF or text file.",
    ],
    locked: ["This PDF needs a password", "It was saved with a password, so the reader can’t open it. Remove the password in the app that made it, then try again."],
    "local-missing": [
      "This file isn’t on this device",
      "Books you open from your own files are kept only in the browser you opened them in, and it may have been removed or cleared. Open the file again to keep reading.",
    ],
  };
  const [title, text] = messages[kind] || messages.fetch;
  ui.errorTitle.textContent = title;
  ui.errorText.textContent = text;
  const out = entry?.home || (isHttp(src) ? src : "");
  ui.errorOut.hidden = !out;
  ui.errorPick.hidden = !(localId || kind === "drm" || kind === "locked");
  if (out) ui.errorOut.href = out;
  if (detail) console.warn("[reader]", kind, detail);
}

/* ── Source planning + download ───────────────────────────────────── */

function planSources(entry) {
  if (entry) {
    return entry.sources
      .map((s) => ({ ...s, rule: matchSource(s.url) }))
      .filter((s) => s.rule)
      .map((s) => ({ url: s.url, label: s.label, via: viaFor(s.rule), format: s.rule.format }));
  }
  const rule = matchSource(src);
  if (rule) return [{ url: src, label: rule.label, via: viaFor(rule), format: rule.format }];
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
// Leaf text blocks: the unit for "where am I", bookmarks and read-aloud.
const BLOCKS = "p,h1,h2,h3,h4,h5,h6,li,dt,dd,blockquote,pre,figcaption,caption,th,td,div,section,article,header,footer,aside,address,table,figure,ul,ol,dl";

const zipPath = (base, href) => {
  const u = new URL(href, "https://book.invalid/" + base);
  return { path: decodeURIComponent(u.pathname.slice(1)), frag: decodeURIComponent(u.hash.slice(1)) };
};
const dirOf = (p) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/") + 1) : "");
const parseXml = (text, type = "application/xml") => new DOMParser().parseFromString(text, type);

/* Text nodes exactly as sanitize() will copy them, in order — so a search hit's
   "nth match in this chapter" means the same thing in the source and on screen. */
function* sourceText(node) {
  for (const child of node.childNodes) {
    if (child.nodeType === 3) yield child.data;
    else if (child.nodeType === 1) {
      const name = child.localName.toLowerCase();
      if (!DROP.has(name) && name !== "svg") yield* sourceText(child);
    }
  }
}

// encryption.xml also lists obfuscated fonts, which are fine; anything else is DRM.
async function hasDrm(zip) {
  const encryption = zip.file("META-INF/encryption.xml");
  if (!encryption) return false;
  const methods = [...parseXml(await encryption.async("string")).getElementsByTagName("*")].filter((el) => el.localName === "EncryptionMethod");
  return methods.some((m) => !/idpf\.org\/2008\/embedding|ns\.adobe\.com\/pdf\/enc#RC/.test(m.getAttribute("Algorithm") || ""));
}

async function openEpub(bytes, source, entry) {
  setLoading("Opening the book…", 1);
  const zip = await window.JSZip.loadAsync(bytes);
  const read = async (p) => {
    const f = zip.file(p);
    if (!f) throw new Error("missing " + p);
    return f.async("string");
  };

  const container = parseXml(await read("META-INF/container.xml"));
  if (await hasDrm(zip)) throw Object.assign(new Error("encrypted EPUB"), { code: "drm" });
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
  if (!entry) setHeading(params.get("title") || dcTitle || fallbackHeading.title, params.get("author") || dcAuthor || fallbackHeading.author);
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
        const node = { label: squash(a?.textContent || ""), children: [] };
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
  const flatToc = [];
  (function flatten(nodes) { nodes.forEach((n) => { flatToc.push(n); flatten(n.children); }); })(toc);
  // A spine file with no TOC entry of its own takes the label of the last one before it.
  const chapterLabels = spine.map((s) => flatToc.find((n) => n.path === s.path)?.label || "");
  for (let i = 0, last = ""; i < spine.length; i++) {
    if (chapterLabels[i]) last = chapterLabels[i];
    else chapterLabels[i] = last ? `${last} (cont.)` : `Section ${i + 1}`;
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

  /* Parsed chapter documents, kept for search and footnote look-ups. */
  const docs = new Map();
  async function chapterDoc(path) {
    if (docs.has(path)) return docs.get(path);
    const text = await read(path);
    let doc = parseXml(text, "application/xhtml+xml");
    if (doc.getElementsByTagName("parsererror").length) doc = parseXml(text, "text/html");
    docs.set(path, doc);
    return doc;
  }
  const bodyOf = (doc) => doc.body || doc.getElementsByTagName("body")[0] || doc.documentElement;

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
        if (/noteref/.test(noteType) || /\b(fnanchor|noteref|footnote-?ref)\b/i.test(cls)) el.setAttribute("role", "doc-noteref");
        if (/backlink/.test(noteType)) el.dataset.backlink = "";
      }
      await sanitize(child, el, chapterPath);
      out.appendChild(el);
    }
  }

  let current = -1;
  let showToken = 0; // only the latest navigation may paint
  let blockCache = null;
  let chapterWords = 0;
  const tocLinks = [];

  const leafBlocks = () =>
    (blockCache ||= [...ui.page.querySelectorAll(BLOCKS)].filter((el) => !el.querySelector(BLOCKS) && /\S/.test(el.textContent)));
  // Index of the first leaf block whose bottom is below the bar (binary search: blocks run top to bottom).
  function firstVisible(blocks = leafBlocks()) {
    let lo = 0;
    let hi = blocks.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (blocks[mid].getBoundingClientRect().bottom > TOP) hi = mid;
      else lo = mid + 1;
    }
    return Math.max(0, lo);
  }

  // Every match of `re` in the rendered chapter, as Ranges, in text-node order.
  function rangesFor(re) {
    const out = [];
    const walker = document.createTreeWalker(ui.page, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      re.lastIndex = 0;
      for (let m = re.exec(n.data); m; m = re.exec(n.data)) {
        if (!m[0]) { re.lastIndex++; continue; }
        const r = document.createRange();
        r.setStart(n, m.index);
        r.setEnd(n, m.index + m[0].length);
        out.push(r);
      }
    }
    return out;
  }
  function paintHits() { paint("rd-hits", activeQuery && current >= 0 ? rangesFor(activeQuery) : null); if (!activeQuery) paint("rd-hit", null); }

  async function show(index, { frag = "", fraction = 0, block = null, hit = null, focus = false, keepSpeech = false } = {}) {
    index = clamp(index, 0, spine.length - 1);
    const token = ++showToken;
    closeNote();
    if (index !== current) {
      if (!keepSpeech) speech?.stop();
      const item = spine[index];
      const built = document.createDocumentFragment();
      await sanitize(bodyOf(await chapterDoc(item.path)), built, item.path);
      if (token !== showToken) return;
      ui.page.replaceChildren(built);
      current = index;
      blockCache = null;
      chapterWords = (ui.page.textContent.match(/\S+/g) || []).length;
      ui.prev.disabled = index === 0;
      ui.next.disabled = index === spine.length - 1;
      ui.chapterPos.textContent = spine.length > 1 ? `${chapterLabels[index]} · ${index + 1} of ${spine.length}` : "";
      tocLinks.forEach((a) => a.setAttribute("aria-current", String(a.dataset.path === item.path && !a.dataset.frag)));
      if (!tocLinks.some((a) => a.getAttribute("aria-current") === "true")) {
        tocLinks.find((a) => a.dataset.path === item.path)?.setAttribute("aria-current", "true");
      }
      paintHits();
      paintAnnotations();
    }
    await nextFrame();
    if (token !== showToken) return;
    const target = frag && document.getElementById("bk-" + frag);
    if (hit) {
      const ranges = rangesFor(hit.re);
      const r = ranges[hit.occ] || ranges[0];
      if (r) {
        const box = r.getBoundingClientRect();
        window.scrollTo(0, scrollY + box.top - innerHeight * 0.35);
        if (canHighlight) paint("rd-hit", [r]);
        else { getSelection().removeAllRanges(); getSelection().addRange(r); }
      }
    } else if (target) {
      target.scrollIntoView({ block: "start" });
      target.classList.add("rd-flash");
      setTimeout(() => target.classList.remove("rd-flash"), 1700);
    } else if (block != null && leafBlocks()[block]) {
      window.scrollTo(0, leafBlocks()[block].getBoundingClientRect().top + scrollY - TOP);
    } else {
      const max = document.documentElement.scrollHeight - innerHeight;
      window.scrollTo(0, Math.max(0, max * fraction));
    }
    if (focus) ui.page.focus({ preventScroll: true });
    onScroll();
  }

  function chapterFraction() {
    const max = document.documentElement.scrollHeight - innerHeight;
    return max > 0 ? Math.min(1, scrollY / max) : 1;
  }

  function here() {
    const blocks = leafBlocks();
    const b = firstVisible(blocks);
    const text = squash(blocks[b]?.textContent || "");
    return {
      i: current,
      b,
      f: Number(chapterFraction().toFixed(4)),
      label: chapterLabels[current],
      snippet: text.length > 90 ? text.slice(0, 90).replace(/\s\S*$/, "") + "…" : text,
    };
  }

  let saveTimer = 0;
  function onScroll() {
    if (current < 0) return;
    const f = chapterFraction();
    const overall = (before[current] + weights[current] * f) / totalWeight;
    setProgress(overall);
    ui.status.textContent = `${Math.round(overall * 100)}% · ${minutesLeft(chapterWords * (1 - f))} in ${spine.length > 1 ? "this section" : "the book"}`;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const h = here();
      store.set(POS_KEY, { i: h.i, b: h.b, f: h.f, p: Number(overall.toFixed(4)), title: ui.title.textContent, at: Date.now() });
      syncMarkBtn();
    }, 300);
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
  ui.tocList.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-path]");
    if (!a) return;
    e.preventDefault();
    closeDrawer();
    show(spineIndex.get(a.dataset.path), { frag: a.dataset.frag, focus: true });
  });

  /* Footnotes open in a pop-up instead of jumping away from the sentence. */
  async function noteFor(a) {
    const doc = await chapterDoc(a.dataset.path);
    let el = doc.getElementById(a.dataset.frag) || doc.querySelector(`[id="${CSS.escape(a.dataset.frag)}"]`);
    if (!el) return null;
    if (!/^(li|aside|p|dd|div|section|blockquote)$/i.test(el.localName)) el = el.closest("li, aside, p, dd, div") || el;
    if (squash(el.textContent).length > 1500) return null; // a whole section, not a note: just go there
    const out = document.createDocumentFragment();
    await sanitize({ childNodes: [el] }, out, a.dataset.path);
    // Drop the note's own way back: marked backlinks, links to this noteref, bare arrows.
    const self = a.id.replace(/^bk-/, "");
    out.querySelectorAll("a").forEach((x) => {
      if (x.hasAttribute("data-backlink") || (self && x.dataset.frag === self) || /^\s*[↑↩⤴^]+\s*$|^\s*(back|return)\s*$/i.test(x.textContent)) x.remove();
    });
    out.querySelectorAll("a[data-path]").forEach((x) => x.replaceWith(...x.childNodes));
    out.querySelectorAll("[id]").forEach((x) => x.removeAttribute("id"));
    return squash(out.textContent) ? [...out.childNodes] : null;
  }
  const isNoteLink = (a) =>
    a.getAttribute("role") === "doc-noteref" ||
    (/^\s*[[(]?(\d{1,3}|[*†‡§¶]|[a-z])[\])]?\s*$/i.test(a.textContent) && (a.closest("sup") || a.querySelector("sup") || /^\s*[[(]/.test(a.textContent)));

  ui.page.addEventListener("click", async (e) => {
    const a = e.target.closest("a[data-path]");
    if (!a) return;
    e.preventDefault();
    if (isNoteLink(a)) {
      const nodes = await noteFor(a).catch(() => null);
      if (nodes) {
        ui.noteGo.onclick = () => { ui.note.hidden = true; noteTarget = null; show(spineIndex.get(a.dataset.path), { frag: a.dataset.frag }); };
        return openNote(a, nodes, `Note ${squash(a.textContent).replace(/[[\]()]/g, "")}`);
      }
    }
    show(spineIndex.get(a.dataset.path), { frag: a.dataset.frag });
  });
  ui.prev.addEventListener("click", () => show(current - 1, { focus: true }));
  ui.next.addEventListener("click", () => show(current + 1, { focus: true }));

  viewer = {
    kind: "epub",
    onScroll,
    here,
    paintHits,
    annotationScope: () => ui.page,
    annotationData: () => ({ scope: "epub", chapter: current, label: chapterLabels[current] }),
    annotationMatches: (a) => a.scope === "epub" && a.chapter === current,
    async goAnnotation(a) {
      await show(a.chapter, { focus: true });
      const range = annotationRangeIn(ui.page, a);
      if (range) window.scrollTo(0, scrollY + range.getBoundingClientRect().top - innerHeight * 0.35);
    },
    step(dir) { show(current + dir, { focus: true }); },
    go(pos, opts = {}) { return show(pos.i, { block: pos.b, fraction: pos.f || 0, ...opts }); },
    samePlace: (a, b) => a.i === b.i && a.b === b.b,
    order: (m) => m.i * 1e6 + (m.b || 0),
    async *search(query) {
      const re = new RegExp(query.source, query.flags); // never share lastIndex with painting
      for (let i = 0; i < spine.length; i++) {
        if (i % 4 === 0) {
          yield { progress: `${chapterLabels[i]} (${i + 1} of ${spine.length})` };
          await new Promise((r) => setTimeout(r));
        }
        let text = "";
        let occ = 0;
        for (const data of sourceText(bodyOf(await chapterDoc(spine[i].path)))) {
          re.lastIndex = 0;
          for (let m = re.exec(data); m; m = re.exec(data)) {
            if (!m[0]) { re.lastIndex++; continue; }
            const start = text.length + m.index;
            const full = text + data;
            yield { label: chapterLabels[i], snippet: snippetAround(full, start, start + m[0].length), i, occ: occ++, re: new RegExp(re.source, re.flags) };
          }
          text += data;
        }
      }
    },
    goHit(hit) { return show(hit.i, { hit }); },
    speakBlocks: () => leafBlocks().filter((el) => !el.closest("table") || /^(td|th|caption)$/i.test(el.localName)),
    speakFrom: (blocks) => {
      const top = leafBlocks()[firstVisible()];
      const i = blocks.indexOf(top);
      return i >= 0 ? i : 0;
    },
    async nextChapter() {
      if (current >= spine.length - 1) return false;
      await show(current + 1, { keepSpeech: true });
      return true;
    },
  };

  root.dataset.readerKind = "epub";
  ui.settings.querySelectorAll('[data-for="pdf"]').forEach((f) => (f.hidden = true));
  ui.loading.hidden = true;
  ui.page.hidden = false;
  ui.chapterNav.hidden = spine.length < 2;
  if (speech) ui.listenBtn.hidden = false;

  const saved = store.get(POS_KEY);
  if (saved && saved.i < spine.length) await show(saved.i, { block: saved.b ?? null, fraction: saved.f || 0 });
  else await show(0);
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
  }).promise.catch((err) => {
    throw err?.name === "PasswordException" ? Object.assign(new Error("password-protected PDF"), { code: "locked" }) : err;
  });

  if (!entry) {
    const info = (await pdf.getMetadata().catch(() => null))?.info || {};
    // Authoring tools often leave a placeholder or the source file's name as the title.
    const title = /^\s*(about:blank|untitled|document\d*|microsoft \w+ - .*|.*\.(docx?|pptx?|pdf|indd|odt|pages))\s*$/i.test(info.Title || "") ? "" : info.Title;
    setHeading(params.get("title") || title || fallbackHeading.title || "PDF", params.get("author") || info.Author || fallbackHeading.author || "");
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
    pages.push({ n, box, renderedAt: 0, task: null, text: null });
  }

  function layout() {
    const w = Math.round(fitWidth() * ZOOMS[zoomIndex]);
    pages.forEach((p) => (p.box.style.width = w + "px"));
    ui.zoomOut.textContent = ZOOMS[zoomIndex] === 1 ? "Fit" : Math.round(ZOOMS[zoomIndex] * 100) + "%";
  }

  // Search hits on a rendered page: tint the (otherwise transparent) text-layer spans.
  let hitPage = 0;
  function markPage(p) {
    const layer = p.box.querySelector(".textLayer");
    if (!layer) return;
    layer.querySelectorAll(".rd-hit, .rd-hit-current").forEach((s) => s.classList.remove("rd-hit", "rd-hit-current"));
    if (!activeQuery) return;
    for (const span of layer.querySelectorAll("span")) {
      activeQuery.lastIndex = 0;
      if (span.childElementCount === 0 && activeQuery.test(span.textContent)) span.classList.add(p.n === hitPage ? "rd-hit-current" : "rd-hit");
    }
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
    new pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: text, viewport: vp })
      .render()
      .then(() => { markPage(p); paintAnnotations(); })
      .catch(() => {});
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
    const p = pages[clamp(n - 1, 0, pages.length - 1)];
    window.scrollTo({ top: p.box.getBoundingClientRect().top + scrollY - 72, behavior: smooth ? "smooth" : "auto" });
  }

  let saveTimer = 0;
  function onScroll() {
    const n = currentPage();
    const max = document.documentElement.scrollHeight - innerHeight;
    const overall = max > 0 ? scrollY / max : 1;
    setProgress(overall);
    ui.status.textContent = `Page ${n} of ${pdf.numPages}`;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      store.set(POS_KEY, { page: n, p: Number(overall.toFixed(4)), title: ui.title.textContent, at: Date.now() });
      syncMarkBtn();
    }, 300);
    tocLinks.forEach((a) => a.setAttribute("aria-current", String(Number(a.dataset.page) === activeTocPage(n))));
    paintAnnotations();
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
  ui.tocList.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-page]");
    if (!a) return;
    e.preventDefault();
    closeDrawer();
    goTo(Number(a.dataset.page));
  });

  async function pageText(p) {
    if (p.text == null) {
      const tc = await (await pdf.getPage(p.n)).getTextContent();
      p.text = tc.items.map((it) => (it.str || "") + (it.hasEOL ? "\n" : "")).join("");
    }
    return p.text;
  }

  viewer = {
    kind: "pdf",
    onScroll,
    here: () => {
      const n = currentPage();
      return { page: n, label: `Page ${n} of ${pdf.numPages}` };
    },
    go(pos) { goTo(pos.page); },
    samePlace: (a, b) => a.page === b.page,
    order: (m) => m.page,
    paintHits() { pages.forEach(markPage); },
    annotationScope: () => {
      const selected = getSelection()?.anchorNode?.parentElement?.closest?.(".rd-pdf-page");
      const box = selected || pages[currentPage() - 1]?.box;
      return box?.querySelector(".textLayer") || null;
    },
    annotationData: () => {
      const selected = getSelection()?.anchorNode?.parentElement?.closest?.(".rd-pdf-page");
      const n = Number(selected?.dataset.i) + 1 || currentPage();
      return { scope: "pdf", page: n, label: `Page ${n}` };
    },
    annotationMatches: (a) => a.scope === "pdf" && a.page === currentPage(),
    goAnnotation(a) {
      goTo(a.page, true);
      requestAnimationFrame(() => {
        const range = annotationRangeIn(pages[a.page - 1]?.box?.querySelector(".textLayer"), a);
        if (range) window.scrollTo(0, scrollY + range.getBoundingClientRect().top - innerHeight * 0.35);
      });
    },
    zoom(dir) {
      zoomIndex = clamp(zoomIndex + dir, 0, ZOOMS.length - 1);
      rerender();
    },
    step(dir, e) {
      e.preventDefault();
      goTo(currentPage() + dir, true);
    },
    async *search(query) {
      const re = new RegExp(query.source, query.flags);
      for (const p of pages) {
        if (p.n % 10 === 1) yield { progress: `page ${p.n} of ${pdf.numPages}` };
        const text = await pageText(p);
        re.lastIndex = 0;
        for (let m = re.exec(text); m; m = re.exec(text)) {
          if (!m[0]) { re.lastIndex++; continue; }
          yield { label: `Page ${p.n}`, snippet: snippetAround(text, m.index, m.index + m[0].length), page: p.n };
        }
      }
    },
    goHit(hit) {
      hitPage = hit.page;
      pages.forEach(markPage);
      goTo(hit.page);
    },
  };

  const saved = store.get(POS_KEY);
  requestAnimationFrame(() => {
    if (saved?.page > 1) goTo(saved.page);
    onScroll();
  });
}

/* ── Your own files ───────────────────────────────────────────────── */

// Imported books live in IndexedDB: "meta" (small, listed on the shelf) and
// "blobs" (the file itself, read only when the book is opened).
const myFiles = (() => {
  let opening = null;
  const db = () => (opening ||= new Promise((resolve, reject) => {
    const req = indexedDB.open("classroomos-reader", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("meta", { keyPath: "id" });
      req.result.createObjectStore("blobs");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("database blocked"));
  }));
  async function run(stores, mode, fn) {
    const t = (await db()).transaction(stores, mode);
    const req = fn(t);
    return new Promise((resolve, reject) => {
      t.oncomplete = () => resolve(req?.result);
      t.onerror = t.onabort = () => reject(t.error || new Error("transaction failed"));
    });
  }
  return {
    list: () => run("meta", "readonly", (t) => t.objectStore("meta").getAll()),
    meta: (id) => run("meta", "readonly", (t) => t.objectStore("meta").get(id)),
    blob: (id) => run("blobs", "readonly", (t) => t.objectStore("blobs").get(id)),
    save: (meta, blob) => run(["meta", "blobs"], "readwrite", (t) => {
      if (blob) t.objectStore("blobs").put(blob, meta.id);
      return t.objectStore("meta").put(meta);
    }),
    touch: async (id, changes) => {
      const meta = await myFiles.meta(id);
      if (meta) await run("meta", "readwrite", (t) => t.objectStore("meta").put({ ...meta, ...changes }));
    },
    remove: (id) => run(["meta", "blobs"], "readwrite", (t) => {
      t.objectStore("blobs").delete(id);
      return t.objectStore("meta").delete(id);
    }),
  };
})();

const FORMAT_NAMES = { epub: "EPUB", pdf: "PDF", txt: "Text" };
const MIME = { epub: "application/epub+zip", pdf: "application/pdf", txt: "text/plain" };
let fallbackHeading = { title: "", author: "" };

function pickFile() {
  ui.fileInput.value = "";
  ui.fileInput.click();
}
ui.openBtn.addEventListener("click", pickFile);
ui.pick.addEventListener("click", pickFile);
ui.errorPick.addEventListener("click", pickFile);
ui.fileInput.addEventListener("change", () => importFile(ui.fileInput.files[0]));

// Drop a file anywhere on the page to open it.
let dragDepth = 0;
const carriesFiles = (e) => [...(e.dataTransfer?.types || [])].includes("Files");
document.addEventListener("dragenter", (e) => {
  if (!carriesFiles(e)) return;
  e.preventDefault();
  if (dragDepth++ === 0) ui.dropCover.hidden = false;
});
document.addEventListener("dragover", (e) => {
  if (!carriesFiles(e)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
});
document.addEventListener("dragleave", (e) => {
  if (!carriesFiles(e)) return;
  if (--dragDepth <= 0) { dragDepth = 0; ui.dropCover.hidden = true; }
});
document.addEventListener("drop", (e) => {
  if (!carriesFiles(e)) return;
  e.preventDefault();
  dragDepth = 0;
  ui.dropCover.hidden = true;
  importFile(e.dataTransfer.files[0]);
});

// The file's own bytes name it, so opening the same book again finds your place.
async function fileId(bytes) {
  try {
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    return [...hash.slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
}

function looksLikeText(bytes) {
  if ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)) return true; // UTF-16
  const head = bytes.subarray(0, 8192);
  return !head.includes(0);
}

async function formatOf(file, bytes) {
  const kind = sniff(bytes);
  if (kind === "pdf") return "pdf";
  if (kind === "epub") {
    // Word files, ZIPs and EPUBs all start "PK"; only an EPUB has a container.xml.
    try {
      const zip = await window.JSZip.loadAsync(bytes);
      if (!zip.file("META-INF/container.xml")) return null;
      return (await hasDrm(zip)) ? "drm" : "epub";
    } catch { return null; }
  }
  if ((/\.(txt|text|md)$/i.test(file.name) || /^text\/(plain|markdown)/.test(file.type)) && looksLikeText(bytes)) return "txt";
  return null;
}

let importing = false;
async function importFile(file) {
  if (!file || importing) return;
  if (file.size > MAX_BYTES) return toast("That file is over 100 MB, too big for the reader");
  if (/\.(mobi|azw\d?|kfx|prc|ibooks|acsm)$/i.test(file.name)) {
    return toast("That’s a store e-book format that can’t open here. Try an EPUB, PDF or .txt file");
  }
  importing = true;
  try {
    toast("Opening " + file.name + "…");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = await formatOf(file, bytes);
    if (!kind) return toast("The reader opens EPUB, PDF and plain-text (.txt) files");
    if (kind === "drm") return toast("That e-book is copy-protected (DRM), so it can only open in the app it came from");
    const id = await fileId(bytes);
    const now = Date.now();
    try {
      const old = await myFiles.meta(id);
      await myFiles.save({
        id, kind, name: file.name, size: file.size,
        title: old?.title || file.name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim() || "Untitled",
        author: old?.author || "",
        added: old?.added || now,
        opened: now,
      }, old ? null : new Blob([bytes], { type: MIME[kind] }));
    } catch (err) {
      // Private windows and locked-down browsers may refuse storage: read it for this visit only.
      console.warn("[reader] couldn’t save the file", err);
      if (viewer) return toast("This browser won’t let the reader save files. Open it from the reader’s home page to read it once");
      ui.shelf.hidden = true;
      ui.loading.hidden = false;
      setBookKey("local:" + id);
      fallbackHeading = { title: file.name.replace(/\.[^.]+$/, ""), author: "" };
      setHeading(fallbackHeading.title, "");
      wireLocalBack();
      return openBookBytes(bytes, kind, { label: "Your file", name: file.name, local: true }, null)
        .catch((err2) => failOpen(err2));
    }
    location.assign("reader.html?" + new URLSearchParams({ file: id }));
  } catch (err) {
    console.warn("[reader] import failed", err);
    toast("That file couldn’t be read");
  } finally {
    importing = false;
  }
}

function wireLocalBack() {
  ui.back.href = "reader.html";
  ui.back.setAttribute("aria-label", "Back to your files");
  ui.back.querySelector("span").textContent = "My files";
}

const fmtSize = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");

async function showShelf() {
  document.title = "Read your own book · ClassroomOS Reader";
  ui.title.textContent = "ClassroomOS Reader";
  ui.author.textContent = "Your files";
  ui.loading.hidden = true;
  ui.shelf.hidden = false;
  let list;
  try {
    list = await myFiles.list();
  } catch {
    ui.mineEmpty.textContent = "This browser isn’t letting the reader save files (a private window, perhaps). You can still open a file to read it now.";
    return;
  }
  list.sort((a, b) => (b.opened || 0) - (a.opened || 0));
  ui.mineList.replaceChildren();
  ui.mineEmpty.hidden = list.length > 0;
  for (const f of list) {
    const pos = store.get("reader:pos:local:" + f.id);
    const p = pos && typeof pos.p === "number" ? pos.p : 0;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "rd-mine-go";
    a.href = "reader.html?" + new URLSearchParams({ file: f.id });
    const title = document.createElement("strong");
    title.textContent = f.title || f.name;
    const meta = document.createElement("span");
    const progress = p >= 0.99 ? "Finished" : p > 0.005 ? `${Math.max(1, Math.round(p * 100))}% read` : "Not started";
    meta.textContent = [f.author, FORMAT_NAMES[f.kind], fmtSize(f.size), progress].filter(Boolean).join(" · ");
    const meter = document.createElement("span");
    meter.className = "rd-mine-meter";
    meter.setAttribute("aria-hidden", "true");
    meter.style.setProperty("--read", Math.min(1, p).toFixed(3));
    a.append(title, meta, meter);
    const del = document.createElement("button");
    del.type = "button";
    del.className = "rd-btn rd-mine-del";
    del.setAttribute("aria-label", "Remove " + (f.title || f.name) + " from this device");
    del.title = "Remove from this device";
    del.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg>';
    del.addEventListener("click", async () => {
      if (!confirm(`Remove “${f.title || f.name}” from this device? Your place and bookmarks in it go too.`)) return;
      try {
        await myFiles.remove(f.id);
        try {
          localStorage.removeItem("reader:pos:local:" + f.id);
          localStorage.removeItem("reader:marks:local:" + f.id);
          localStorage.removeItem("reader:annotations:local:" + f.id);
        } catch { /* private mode */ }
        toast("Removed from this device");
      } catch {
        toast("That file couldn’t be removed");
      }
      await showShelf();
      (ui.mineList.querySelector("a") || ui.pick).focus();
    });
    li.append(a, del);
    ui.mineList.append(li);
  }
}

async function openLocal(id) {
  wireLocalBack();
  setLoading("Opening your file…", 0);
  let meta = null;
  let blob = null;
  try {
    [meta, blob] = await Promise.all([myFiles.meta(id), myFiles.blob(id)]);
  } catch (err) {
    console.warn("[reader] couldn’t read saved files", err);
  }
  if (!meta || !blob) return showError("local-missing");
  fallbackHeading = { title: meta.title, author: meta.author };
  setHeading(meta.title, meta.author);
  try {
    await openBookBytes(new Uint8Array(await blob.arrayBuffer()), meta.kind, { label: "Your file", name: meta.name, local: true }, null);
  } catch (err) {
    return failOpen(err);
  }
  myFiles.touch(id, { title: ui.title.textContent, author: ui.author.textContent, opened: Date.now() }).catch(() => {});
}

function failOpen(err) {
  viewer = null;
  ui.tocList.replaceChildren();
  showError(err?.code || "parse", err);
}

/* Plain text → a small in-memory EPUB, split into chapters at its headings. */

const NUMBER = "(?:\\d+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty(?:[- ]\\w+)?|thirty(?:[- ]\\w+)?|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|last)";
// "CHAPTER IV.", "Chapter 3 — The Storm", "Part Two", "# Heading", "Preface". A tail needs punctuation
// before it, so a line of prose like "Part of the reason…" doesn't count.
const HEADING = new RegExp(
  `^(?:#{1,3}\\s+\\S.*|(?:chapter|book|part|act|scene|letter|canto|stave|volume|section)\\s+${NUMBER}\\b\\.?(?:\\s*[.:—–-]\\s*.{1,60})?|(?:prologue|epilogue|preface|introduction|foreword|afterword|appendix|contents)\\.?)$`,
  "i",
);
const xml = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function decodeText(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  let text = new TextDecoder("utf-8").decode(bytes);
  if ((text.match(/�/g) || []).length > 8) text = new TextDecoder("windows-1252").decode(bytes);
  return text.replace(/^﻿/, "");
}

async function textToEpub(raw) {
  let text = raw.replace(/\r\n?/g, "\n");
  const field = (name) => text.slice(0, 6000).match(new RegExp(`^${name}:\\s*(.+)$`, "im"))?.[1].trim() || "";
  const title = field("Title");
  const author = field("Author");
  // Project Gutenberg texts: keep the book between the START and END markers.
  const start = text.match(/^\*{3}\s*START OF (?:THE|THIS) PROJECT GUTENBERG.*$/im);
  if (start) text = text.slice(start.index + start[0].length);
  const end = text.match(/^\*{3}\s*END OF (?:THE|THIS) PROJECT GUTENBERG.*$/im);
  if (end) text = text.slice(0, end.index);

  const paras = text.split(/\n[ \t]*\n+/).map((p) => p.replace(/^\n+|\s+$/g, "")).filter((p) => /\S/.test(p));
  const isHeading = (p) => {
    const lines = p.split("\n");
    return lines.length <= 2 && p.length <= 100 && HEADING.test(lines[0].trim());
  };
  const label = (p) => squash(p.split("\n").map((l) => l.trim().replace(/^#+\s*/, "").replace(/[.:]$/, "")).join(": "));

  // One chapter per heading; a "chapter" with almost no text (a contents list) folds into the one before.
  let chapters = [{ label: "", heading: null, body: [] }];
  for (const p of paras) {
    if (isHeading(p)) chapters.push({ label: label(p), heading: p, body: [] });
    else chapters.at(-1).body.push(p);
  }
  const bodyLength = (c) => c.body.reduce((n, p) => n + (typeof p === "string" ? p.length : 0), 0);
  const merged = [];
  for (const c of chapters) {
    const prev = merged.at(-1);
    if (prev && bodyLength(c) < 300) prev.body.push(...(c.heading ? [{ heading: c.heading }] : []), ...c.body);
    else if (c.heading || c.body.length) merged.push(c);
  }
  chapters = merged;
  // A first "chapter" that is only a contents list keeps its heading as text and becomes the opening pages.
  if (chapters.length > 1 && chapters[0].heading && bodyLength(chapters[0]) < 300) {
    chapters[0].body.unshift({ heading: chapters[0].heading });
    chapters[0].heading = null;
  }
  if (chapters[0] && !chapters[0].heading) chapters[0].label = chapters.length > 1 ? "Opening pages" : "";
  // No headings to go on: cut long texts into parts so pages stay quick.
  if (chapters.length < 2) {
    const all = chapters[0]?.body || [];
    chapters = [];
    let part = null;
    for (const p of all) {
      if (!part || bodyLength(part) > 40000) chapters.push((part = { label: "", heading: null, body: [] }));
      part.body.push(p);
    }
    chapters.forEach((c, i) => (c.label = chapters.length > 1 ? `Part ${i + 1}` : title || "Text"));
  }
  if (!chapters.length) throw new Error("empty text file");

  const block = (p) => {
    if (typeof p === "object") return `<h3>${xml(label(p.heading))}</h3>`;
    const lines = p.split("\n").map((l) => l.trim());
    // Short lines kept as written (verse, addresses, lists); otherwise the breaks are just wrapping.
    const verse = lines.length >= 3 && lines.every((l) => l.length < 60);
    return `<p>${verse ? lines.map(xml).join("<br/>") : xml(lines.join(" "))}</p>`;
  };
  const zip = new window.JSZip();
  zip.file("mimetype", "application/epub+zip");
  zip.file("META-INF/container.xml",
    '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  chapters.forEach((c, i) => {
    const head = c.heading ? `<h2>${xml(c.label)}</h2>` : "";
    zip.file(`c${i + 1}.xhtml`,
      `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${xml(c.label)}</title></head><body>${head}${c.body.map(block).join("\n")}</body></html>`);
  });
  zip.file("nav.xhtml",
    `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol>${chapters.map((c, i) => `<li><a href="c${i + 1}.xhtml">${xml(c.label || `Part ${i + 1}`)}</a></li>`).join("")}</ol></nav></body></html>`);
  zip.file("content.opf",
    `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">local-text</dc:identifier>${title ? `<dc:title>${xml(title)}</dc:title>` : ""}${author ? `<dc:creator>${xml(author)}</dc:creator>` : ""}</metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${chapters.map((_, i) => `<item id="c${i + 1}" href="c${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join("")}</manifest><spine>${chapters.map((_, i) => `<itemref idref="c${i + 1}"/>`).join("")}</spine></package>`);
  return zip.generateAsync({ type: "uint8array" });
}

/* ── Main ─────────────────────────────────────────────────────────── */

let viewer = null;

function showCredit(source, entry) {
  ui.credit.replaceChildren();
  if (source.local) {
    ui.credit.append(`Your file${source.name ? " · " + source.name : ""}. It stays in this browser and was never uploaded.`);
    ui.credit.hidden = false;
    return;
  }
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

async function openBookBytes(bytes, kind, source, entry) {
  if (kind === "txt") {
    setLoading("Laying out the text…", 1);
    bytes = await textToEpub(decodeText(bytes));
    kind = "epub";
  }
  if (kind === "epub") await openEpub(bytes, source, entry);
  else if (kind === "pdf") await openPdf(bytes, source, entry);
  else throw new Error("not an EPUB or PDF");
  showCredit(source, entry);
  root.dataset.readerSource = source.label;
  for (const b of [ui.tocBtn, ui.searchBtn, ui.markBtn]) b.disabled = false;
  renderMarks();
  syncMarkBtn();
}

async function main() {
  if (localId) return openLocal(localId);
  if (!src) return showShelf();
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
      await openBookBytes(bytes, sniff(bytes), source, entry);
      return;
    } catch (err) {
      viewer = null;
      ui.tocList.replaceChildren();
      failure = { kind: err?.code || "parse", err };
    }
  }
  showError(failure?.kind || "fetch", failure?.err, entry);
}

main();
