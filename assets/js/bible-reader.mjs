// The Bible reader (bible.html): all 66 books in three public-domain translations,
// chapter-by-chapter progress, a daily reading streak, and the homepage's verse of the day.
//
// Text: assets/data/bible/ (npm run build:bible). Progress stays in this browser:
//   bible:progress:v1      chapters read, last place, translation, days read
//   reader:pos:bible.html  mirror in the reader's shape ({ title, p, at, label }) so the
//                          library's reading shelves and My Stuff list the Bible like any book
//
// Routes: #/  ·  #/book/<slug>  ·  #/read/<slug>/<chapter>[/<verse>[-<verse>]]  ·  #/go/<reference>

const DATA = "assets/data/bible/";
const KEY = "bible:progress:v1";
const POS_KEY = "reader:pos:bible.html";
const VOTD_URL = "assets/data/votd.json";
// Links carry the page name so they read as page links (not dangling #anchors); same-document, no reload.
const PAGE = "bible.html";

const main = document.getElementById("bbMain");
const statusEl = document.getElementById("bbStatus");
const root = document.documentElement;

/* ── Storage ─────────────────────────────────────────────────────── */
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } },
};

function load() {
  let data = null;
  try { data = JSON.parse(store.get(KEY)); } catch { data = null; }
  if (!data || typeof data !== "object") data = {};
  return {
    v: 1,
    tr: typeof data.tr === "string" ? data.tr : "bsb",
    read: data.read && typeof data.read === "object" ? data.read : {},
    last: data.last && typeof data.last === "object" ? data.last : null,
    days: Array.isArray(data.days) ? data.days : [],
  };
}

let state = load();
let meta = null;      // books.json
let books = [];
const bySlug = new Map();
const aliases = new Map();
let TOTAL = 0;

function save() {
  if (!store.set(KEY, JSON.stringify(state))) announce("Your browser could not save reading progress. Allow site storage to keep your place.");
  if (state.last) {
    const b = bySlug.get(state.last.slug);
    store.set(POS_KEY, JSON.stringify({
      title: "The Bible",
      p: Math.round((chaptersRead() / TOTAL) * 10000) / 10000,
      at: state.last.at || Date.now(),
      label: b ? `${b.name} ${state.last.ch}` : "",
    }));
  }
}

const readSet = (slug) => new Set(state.read[slug] || []);
const isRead = (slug, ch) => (state.read[slug] || []).includes(ch);
const chaptersRead = () => Object.values(state.read).reduce((n, list) => n + list.length, 0);
const booksFinished = () => books.filter((b) => readSet(b.slug).size >= b.verses.length).length;

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function setRead(slug, ch, on) {
  const set = readSet(slug);
  if (on === set.has(ch)) return false;
  on ? set.add(ch) : set.delete(ch);
  if (set.size) state.read[slug] = [...set].sort((a, b) => a - b);
  else delete state.read[slug];
  if (on) {
    const today = dayKey();
    if (!state.days.includes(today)) state.days = [...state.days, today].slice(-400);
  }
  save();
  return true;
}

function streak() {
  const days = new Set(state.days);
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not read yet: yesterday keeps it alive
  let n = 0;
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ── Small DOM helper ────────────────────────────────────────────── */
function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style") el.setAttribute("style", v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) if (c != null && c !== false) el.append(c);
  return el;
}

function announce(text) {
  statusEl.textContent = "";
  requestAnimationFrame(() => { statusEl.textContent = text; });
}

const meter = (value, label) =>
  h("span", { class: "bb-meter", role: "progressbar", "aria-label": label, "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(Math.round(value * 100)) },
    h("span", { style: `width:${(value * 100).toFixed(1)}%` }));

const plural = (n, word) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;

/* ── Text loading ────────────────────────────────────────────────── */
const textCache = new Map();
function loadBook(code, slug) {
  const key = code + "/" + slug;
  if (!textCache.has(key)) {
    const p = fetch(`${DATA}${key}.json`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    p.catch(() => textCache.delete(key));
    textCache.set(key, p);
  }
  return textCache.get(key);
}

const translation = () => meta.translations.find((t) => t.code === state.tr) || meta.translations[0];

/* ── References: "John 3:16", "1 jn 4", "Ps 23", "gen" ───────────── */
const norm = (s) => String(s).toLowerCase().replace(/([a-z])\./g, "$1").replace(/[^a-z0-9: \-–]/g, " ").replace(/\s+/g, " ").trim();

function buildAliases() {
  const roman = { 1: "i", 2: "ii", 3: "iii" };
  for (const b of books) {
    for (const raw of [b.name, b.slug.replace(/-/g, " "), b.short, ...b.aliases]) {
      const k = norm(raw);
      aliases.set(k, b);
      const m = k.match(/^([123]) (.+)$/);
      if (m) { aliases.set(m[1] + m[2], b); aliases.set(roman[m[1]] + " " + m[2], b); }
    }
  }
}

function findBook(text) {
  const k = norm(text);
  if (aliases.has(k)) return aliases.get(k);
  const flat = k.replace(/ /g, "");
  const hits = books.filter((b) => norm(b.name).replace(/ /g, "").startsWith(flat));
  return hits.length === 1 ? hits[0] : null;
}

function parseRef(text) {
  const m = norm(text).match(/^((?:[123] ?)?[a-z][a-z ]*?) ?(?:(\d+)(?: ?: ?(\d+)(?: ?[-–] ?(\d+))?)?)?$/);
  if (!m) return null;
  const book = findBook(m[1]);
  if (!book) return null;
  const ch = m[2] ? Math.min(Math.max(1, Number(m[2])), book.verses.length) : 0;
  return { book, ch, v1: m[3] ? Number(m[3]) : 0, v2: m[4] ? Number(m[4]) : 0 };
}

const readHref = (slug, ch, v1, v2) => `${PAGE}#/read/${slug}/${ch}` + (v1 ? `/${v1}${v2 && v2 > v1 ? "-" + v2 : ""}` : "");

/* ── Speech ──────────────────────────────────────────────────────── */
let speaking = null;
function stopSpeaking() {
  if (!speaking) return;
  speaking = null;
  window.speechSynthesis?.cancel();
  document.querySelectorAll(".bb-v.is-speaking").forEach((v) => v.classList.remove("is-speaking"));
  const btn = document.getElementById("bbListen");
  if (btn) {
    btn.setAttribute("aria-pressed", "false");
    btn.classList.remove("is-active");
    if (btn.lastChild) btn.lastChild.textContent = "Listen";
  }
  const selListen = document.getElementById("bbSelListen");
  if (selListen) {
    selListen.setAttribute("aria-pressed", "false");
    selListen.classList.remove("is-active");
    const label = selListen.querySelector(".bb-sel-btn-label");
    if (label) label.textContent = "Listen";
    const svg = selListen.querySelector("svg");
    if (svg) svg.innerHTML = '<polygon points="5 3 19 12 5 21 5 3" />';
  }
}

function speakVerses(nodes, btn) {
  if (speaking) { stopSpeaking(); return; }
  const token = {};
  speaking = token;
  btn.setAttribute("aria-pressed", "true");
  btn.classList.add("is-active");
  const selLabel = btn.querySelector?.(".bb-sel-btn-label");
  if (selLabel) {
    selLabel.textContent = "Stop";
    const svg = btn.querySelector("svg");
    if (svg) svg.innerHTML = '<rect x="6" y="6" width="12" height="12" rx="1.5" />';
  } else if (btn.lastChild) {
    btn.lastChild.textContent = "Stop";
  }
  let i = 0;
  const next = () => {
    if (speaking !== token) return;
    document.querySelectorAll(".bb-v.is-speaking").forEach((v) => v.classList.remove("is-speaking"));
    if (i >= nodes.length) { stopSpeaking(); return; }
    const node = nodes[i++];
    const text = node.querySelector(".bb-vt")?.textContent.trim();
    if (!text) { next(); return; }
    node.classList.add("is-speaking");
    node.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;
    u.onend = next;
    u.onerror = () => stopSpeaking();
    window.speechSynthesis.speak(u);
  };
  next();
}

/* ── Views ───────────────────────────────────────────────────────── */
function setView(title, ...nodes) {
  stopSpeaking();
  clearSelection();
  document.title = `${title} · Mr. Scandrett's ClassroomOS`;
  main.replaceChildren(...nodes);
}

function focusHeading() {
  const heading = main.querySelector("h1, h2");
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
}

/* Home: greeting + verse of the day, continue reading, stats, go-to box, the shelf of 66 books. */
function renderHome() {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const votd = h("article", { class: "bb-card bb-votd", "aria-label": "Verse of the Day" },
    h("p", { class: "bb-kicker", text: "Verse of the Day" }),
    h("p", { class: "bb-votd-text", text: "…" }));

  setView("The Bible",
    h("section", { class: "bb-hello" },
      h("p", { class: "bb-date", text: new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) }),
      h("h1", { text: hello })),
    h("div", { class: "bb-home-grid" }, votd, continueCard()),
    statsRow(),
    gotoForm(),
    shelf("OT", "Old Testament"),
    shelf("NT", "New Testament"),
    h("p", { class: "bb-credit" },
      `Text: ${meta.translations.map((t) => `${t.name} (${t.label}, ${t.year})`).join(" · ")}. All public domain. `,
      "Your progress is saved only in this browser."));
  fillVotd(votd);
  if (restoreHomeScroll != null) { window.scrollTo(0, restoreHomeScroll); restoreHomeScroll = null; }
}

async function fillVotd(card) {
  let data = null;
  try {
    const res = await fetch(VOTD_URL, { cache: "no-store" });
    if (res.ok) data = await res.json();
  } catch { data = null; }
  if (!card.isConnected) return;
  const text = data?.text || "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.";
  const reference = data?.reference || "John 3:16 (NIV)";
  const ref = parseRef(reference.replace(/\s*\(.*\)\s*$/, ""));
  const listen = window.speechSynthesis
    ? h("button", { type: "button", class: "bb-btn", onclick: () => {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(`${text} ${reference.replace(/\s*\(.*\)$/, "")}`), { rate: 0.9 }));
      } }, "▶ Listen")
    : null;
  card.replaceChildren(
    h("p", { class: "bb-kicker", text: "Verse of the Day" }),
    h("blockquote", { class: "bb-votd-text" }, h("p", { text })),
    h("p", { class: "bb-votd-ref", text: reference }),
    h("div", { class: "bb-actions" },
      ref?.ch ? h("a", { class: "bb-btn bb-primary", href: readHref(ref.book.slug, ref.ch, ref.v1, ref.v2) }, `Read ${ref.book.name} ${ref.ch}`) : null,
      listen),
    h("p", { class: "bb-fine", text: data?.sourceLabel ? `${data.sourceLabel} · the same verse as the ClassroomOS home page` : "" }));
}

function nextPlace() {
  const last = state.last && bySlug.get(state.last.slug);
  if (!last) return null;
  if (!isRead(last.slug, state.last.ch)) return { book: last, ch: state.last.ch };
  return neighbor(last, state.last.ch, 1) || { book: last, ch: state.last.ch };
}

function continueCard() {
  const place = nextPlace();
  if (!place) {
    return h("article", { class: "bb-card bb-continue" },
      h("p", { class: "bb-kicker", text: "Start reading" }),
      h("h2", { text: "Where would you like to begin?" }),
      h("ul", { class: "bb-starts" },
        [["genesis", 1, "In the beginning: creation"], ["mark", 1, "The shortest Gospel"], ["psalms", 23, "The Lord is my shepherd"], ["proverbs", 1, "Short sayings of wisdom"]]
          .map(([slug, ch, note]) => h("li", null, h("a", { href: readHref(slug, ch) }, h("strong", { text: `${bySlug.get(slug).name} ${ch}` }), h("span", { text: note }))))));
  }
  const done = readSet(place.book.slug).size;
  const total = place.book.verses.length;
  return h("article", { class: "bb-card bb-continue" },
    h("p", { class: "bb-kicker", text: "Continue reading" }),
    h("h2", { text: `${place.book.name} ${place.ch}` }),
    h("p", { class: "bb-fine", text: `${done} of ${plural(total, "chapter")} in ${place.book.name} read` }),
    meter(done / total, `${place.book.name} progress`),
    h("div", { class: "bb-actions" },
      h("a", { class: "bb-btn bb-primary", href: readHref(place.book.slug, place.ch) }, "Continue →"),
      h("a", { class: "bb-btn", href: `${PAGE}#/book/${place.book.slug}` }, "All chapters")));
}

function statsRow() {
  const n = chaptersRead();
  const s = streak();
  const tile = (value, label, extra) => h("div", { class: "bb-stat" }, h("strong", { text: value }), h("span", { text: label }), extra);
  return h("section", { class: "bb-stats", "aria-label": "Your reading" },
    tile(n.toLocaleString(), `of ${TOTAL.toLocaleString()} chapters read`, meter(n / TOTAL, "Whole Bible progress")),
    tile(String(booksFinished()), `of ${books.length} books finished`),
    tile(String(s), s === 1 ? "day in a row" : "days in a row"));
}

function gotoForm() {
  const input = h("input", { type: "search", id: "bbGoto", placeholder: "John 3:16, Psalm 23, Genesis…", autocomplete: "off", enterkeyhint: "go", "aria-describedby": "bbGotoMsg" });
  const msg = h("p", { class: "bb-fine", id: "bbGotoMsg", "aria-live": "polite" });
  const list = h("datalist", { id: "bbBooksList" }, books.map((b) => h("option", { value: b.name })));
  input.setAttribute("list", "bbBooksList");
  return h("form", { class: "bb-goto", role: "search", onsubmit: (e) => {
      e.preventDefault();
      const ref = parseRef(input.value);
      if (!ref) { msg.textContent = `Couldn't find "${input.value}". Try a book name, like Romans 8 or Ps 23.`; return; }
      location.hash = ref.ch ? readHref(ref.book.slug, ref.ch, ref.v1, ref.v2).split("#")[1] : `/book/${ref.book.slug}`;
    } },
    h("label", { for: "bbGoto", text: "Go to a passage" }),
    h("div", { class: "bb-goto-row" }, input, h("button", { type: "submit", class: "bb-btn bb-primary" }, "Go")),
    list, msg);
}

function shelf(testament, title) {
  const list = books.filter((b) => b.t === testament);
  const cats = [...new Set(list.map((b) => b.cat))];
  const done = list.reduce((n, b) => n + readSet(b.slug).size, 0);
  const total = list.reduce((n, b) => n + b.verses.length, 0);
  return h("section", { class: "bb-shelf", id: `bb-${testament.toLowerCase()}`, "aria-labelledby": `bb-${testament}-h` },
    h("div", { class: "bb-shelf-head" },
      h("h2", { id: `bb-${testament}-h`, text: title }),
      h("span", { class: "bb-fine", text: `${list.length} books · ${done} of ${total} chapters read` }),
      meter(done / total, `${title} progress`)),
    cats.map((cat) => h("div", { class: "bb-cat", "data-cat": cat },
      h("h3", { text: cat }),
      h("ul", { class: "bb-tiles" }, list.filter((b) => b.cat === cat).map(tile)))));
}

function tile(b) {
  const done = readSet(b.slug).size;
  const total = b.verses.length;
  const finished = done >= total;
  return h("li", null,
    h("a", { class: "bb-tile" + (finished ? " is-done" : done ? " is-started" : ""), href: `${PAGE}#/book/${b.slug}`, "data-cat": b.cat,
        "aria-label": `${b.name}, ${plural(total, "chapter")}${finished ? ", finished" : done ? `, ${done} read` : ""}` },
      h("span", { class: "bb-tile-name", text: b.name }),
      h("span", { class: "bb-tile-meta", text: finished ? "✓ Finished" : done ? `${done} / ${total}` : plural(total, "chapter") }),
      done && !finished ? meter(done / total, `${b.name} progress`) : null));
}

/* Book: intro, progress, and every chapter as a numbered square. */
function renderBook(b) {
  const read = readSet(b.slug);
  const total = b.verses.length;
  const firstUnread = b.verses.findIndex((_, i) => !read.has(i + 1)) + 1;
  const start = firstUnread || 1;
  const label = !read.size ? `Start ${b.name} 1` : firstUnread ? `Continue at chapter ${firstUnread}` : "Read again from chapter 1";

  setView(b.name,
    h("nav", { class: "bb-crumbs", "aria-label": "Breadcrumb" }, h("a", { href: `${PAGE}#/` }, "‹ All books")),
    h("header", { class: "bb-book-head", "data-cat": b.cat },
      h("p", { class: "bb-kicker", text: `${b.t === "OT" ? "Old" : "New"} Testament · ${b.cat}` }),
      h("h1", { text: b.name }),
      h("p", { class: "bb-about", text: b.about }),
      h("p", { class: "bb-fine", text: `${read.size} of ${plural(total, "chapter")} read` }),
      meter(read.size / total, `${b.name} progress`),
      h("div", { class: "bb-actions" },
        h("a", { class: "bb-btn bb-primary", href: readHref(b.slug, start) }, label),
        read.size ? h("button", { type: "button", class: "bb-btn", onclick: () => {
          if (!confirm(`Clear your progress in ${b.name}?`)) return;
          delete state.read[b.slug];
          save();
          renderBook(b);
          announce(`Progress in ${b.name} cleared.`);
        } }, "Clear progress") : null)),
    h("h2", { class: "bb-sub", text: "Chapters" }),
    h("ol", { class: "bb-chapters" }, b.verses.map((count, i) => {
      const ch = i + 1;
      const done = read.has(ch);
      return h("li", null, h("a", {
        class: "bb-ch" + (done ? " is-read" : "") + (state.last?.slug === b.slug && state.last.ch === ch ? " is-last" : ""),
        href: readHref(b.slug, ch),
        "aria-label": `Chapter ${ch}${done ? ", read" : ""}`,
        title: `${count} verses`,
      }, String(ch)));
    })));
  focusHeading();
}

function neighbor(b, ch, dir) {
  if (dir > 0 && ch < b.verses.length) return { book: b, ch: ch + 1 };
  if (dir < 0 && ch > 1) return { book: b, ch: ch - 1 };
  const i = books.indexOf(b) + dir;
  if (i < 0 || i >= books.length) return null;
  const nb = books[i];
  return { book: nb, ch: dir > 0 ? 1 : nb.verses.length };
}

let currentRead = null; // { book, ch } while a chapter is open

/* Chapter: the text, verse numbers, mark-as-read, previous/next. */
async function renderChapter(b, ch, v1, v2, keepVerse) {
  const tr = translation();
  currentRead = { book: b, ch };
  state.last = { slug: b.slug, ch, at: Date.now() };
  save();

  const prev = neighbor(b, ch, -1);
  const next = neighbor(b, ch, 1);
  const text = h("div", { class: "bb-text", lang: "en" },
    h("div", { class: "bb-skel", role: "status", "aria-label": `Loading ${b.name} ${ch}` }, ...[0, 1, 2, 3, 4, 5, 6].map(() => h("span"))));
  const listen = window.speechSynthesis
    ? h("button", { type: "button", class: "bb-btn", id: "bbListen", "aria-pressed": "false", onclick: (e) => speakVerses([...text.querySelectorAll(".bb-v")], e.currentTarget) },
        h("span", { "aria-hidden": "true", text: "▶ " }), "Listen")
    : null;
  const mark = h("button", { type: "button", class: "bb-mark", "aria-pressed": String(isRead(b.slug, ch)), onclick: () => {
      const on = !isRead(b.slug, ch);
      setRead(b.slug, ch, on);
      syncMark(mark, on);
      if (on && readSet(b.slug).size === b.verses.length) announce(`Chapter marked as read. You've finished every chapter of ${b.name}!`);
      else announce(on ? `${b.name} ${ch} marked as read.` : `${b.name} ${ch} marked as unread.`);
    } });
  syncMark(mark, isRead(b.slug, ch));

  const navLink = (place, dir) => place
    ? h("a", { class: "bb-btn bb-step", href: readHref(place.book.slug, place.ch), rel: dir > 0 ? "next" : "prev",
        onclick: dir > 0 ? () => setRead(b.slug, ch, true) : null },
        dir < 0 ? `‹ ${place.book.name} ${place.ch}` : `${place.book.name} ${place.ch} ›`)
    : h("span");

  setView(`${b.name} ${ch}`,
    h("nav", { class: "bb-crumbs", "aria-label": "Breadcrumb" },
      h("a", { href: `${PAGE}#/` }, "Books"), h("span", { "aria-hidden": "true", text: " / " }),
      h("a", { href: `${PAGE}#/book/${b.slug}` }, b.name)),
    h("header", { class: "bb-chap-head" },
      h("h1", null, h("span", { class: "bb-chap-book", text: b.name }), " ", h("span", { class: "bb-chap-num", text: String(ch) })),
      h("div", { class: "bb-actions" },
        h("a", { class: "bb-btn", href: `${PAGE}#/book/${b.slug}`, title: "Choose a chapter" }, `Chapters (${b.verses.length})`),
        listen)),
    text,
    h("footer", { class: "bb-chap-foot" },
      mark,
      h("nav", { class: "bb-steps", "aria-label": "Chapters" }, navLink(prev, -1), navLink(next, 1)),
      h("p", { class: "bb-fine", text: `${tr.name} (${tr.label}) · ${tr.note}` })));
  if (!keepVerse) window.scrollTo(0, 0);
  focusHeading();
  paintPager(b, ch, prev, next);

  let chapters;
  try {
    chapters = await loadBook(tr.code, b.slug);
  } catch {
    if (currentRead?.book !== b || currentRead.ch !== ch) return;
    text.replaceChildren(h("p", { class: "bb-error" }, `${b.name} couldn't load. Check your connection and `,
      h("button", { type: "button", class: "bb-linkbtn", onclick: () => route() }, "try again"), "."));
    return;
  }
  if (currentRead?.book !== b || currentRead.ch !== ch || !text.isConnected) return;

  const verses = chapters[ch - 1] || [];
  const lines = root.dataset.bibleLayout === "lines" || (root.dataset.bibleLayout !== "flow" && b.cat === "Poetry & Wisdom");
  text.classList.toggle("bb-text--lines", lines);
  text.replaceChildren(h("p", { class: "bb-verses" }, verses.map((v, i) => {
    const n = i + 1;
    if (!v) {
      return h("span", { class: "bb-v bb-v--missing", id: `v${n}`, "data-v": String(n) },
        h("sup", { class: "bb-vn", text: String(n) }),
        h("span", { class: "bb-missing" }, "This verse isn't in the earliest manuscripts, so this translation leaves it out. ",
          tr.code !== "kjv" ? h("button", { type: "button", class: "bb-linkbtn", onclick: () => switchTranslation("kjv") }, "Read it in the KJV") : null),
        " ");
    }
    return h("span", { class: "bb-v", id: `v${n}`, "data-v": String(n) },
      h("sup", { class: "bb-vn", text: String(n) }),
      h("span", { class: "bb-vt", text: v }), " ");
  })));

  if (v1) {
    const last = Math.max(v1, v2 || v1);
    const hits = [];
    for (let n = v1; n <= last; n++) { const el = text.querySelector(`#v${n}`); if (el) hits.push(el); }
    hits.forEach((el) => el.classList.add("is-target"));
    if (hits[0]) {
      if (keepVerse) hits[0].scrollIntoView({ block: "start" });
      else hits[0].scrollIntoView({ block: "center" });
      if (!keepVerse) selectVerses(b, ch, hits.map((el) => Number(el.dataset.v)));
    }
  }
}

function syncMark(btn, on) {
  btn.setAttribute("aria-pressed", String(on));
  btn.classList.toggle("is-on", on);
  btn.textContent = on ? "✓ Read · tap to undo" : "Mark chapter as read";
}

/* ── Verse selection: tap verses, then copy, link, listen, or share. ─ */
const selbar = document.getElementById("bbSelbar");
const selRef = document.getElementById("bbSelRef");
const selCount = document.getElementById("bbSelCount");
const selColors = document.getElementById("bbSelColors");
const selCopy = document.getElementById("bbSelCopy");
const selLink = document.getElementById("bbSelLink");
const selListen = document.getElementById("bbSelListen");
const selShare = document.getElementById("bbSelShare");
const selClear = document.getElementById("bbSelClear");

let selection = null; // { book, ch, verses: Set }
let lastClickedVerse = null;
let highlightColor = store.get("bible:highlight") || "gold";
root.dataset.highlight = highlightColor;

function setHighlightColor(color) {
  highlightColor = color;
  root.dataset.highlight = color;
  store.set("bible:highlight", color);
  syncColorDots();
}

function syncColorDots() {
  document.querySelectorAll("#bbSelColors .bb-color-dot").forEach((dot) => {
    const active = dot.dataset.color === highlightColor;
    dot.setAttribute("aria-checked", String(active));
  });
  document.querySelectorAll("#bbDisplay [data-hl]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.hl === highlightColor));
  });
}

function selectVerses(b, ch, list) {
  selection = { book: b, ch, verses: new Set(list) };
  paintSelection();
}

function selectionRef(useEnDash = true) {
  if (!selection) return "";
  const nums = [...selection.verses].sort((a, b) => a - b);
  const dash = useEnDash ? "–" : "-";
  const parts = [];
  for (let i = 0; i < nums.length; i++) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    parts.push(i === j ? `${nums[i]}` : `${nums[i]}${dash}${nums[j]}`);
    i = j;
  }
  return `${selection.book.name} ${selection.ch}:${parts.join(",")} (${translation().label})`;
}

function selectionUrl() {
  if (!selection || !selection.verses.size) return "";
  const nums = [...selection.verses].sort((a, b) => a - b);
  const minV = nums[0];
  const maxV = nums[nums.length - 1];
  const hash = readHref(selection.book.slug, selection.ch, minV, maxV > minV ? maxV : 0);
  return new URL(hash, location.href).href;
}

function paintSelection() {
  document.querySelectorAll(".bb-v.is-selected").forEach((v) => v.classList.remove("is-selected"));
  if (!selection || !selection.verses.size) {
    if (selbar) selbar.hidden = true;
    selection = null;
    lastClickedVerse = null;
    return;
  }
  selection.verses.forEach((n) => document.getElementById(`v${n}`)?.classList.add("is-selected"));
  if (selRef) selRef.textContent = selectionRef(true);
  if (selCount) selCount.textContent = plural(selection.verses.size, "verse");
  syncColorDots();
  if (navigator.share && selShare) {
    selShare.hidden = false;
  }
  if (!window.speechSynthesis && selListen) {
    selListen.hidden = true;
  }
  if (selbar) selbar.hidden = false;
}

function clearSelection() {
  selection = null;
  lastClickedVerse = null;
  paintSelection();
}

main.addEventListener("click", (e) => {
  // If user has actively dragged native text selection, don't trigger verse selection
  if (window.getSelection && window.getSelection().toString().trim().length > 0) return;
  const v = e.target.closest(".bb-v");
  if (!v || !currentRead || e.target.closest("button, a")) return;
  if (!selection || selection.book !== currentRead.book || selection.ch !== currentRead.ch) {
    selection = { book: currentRead.book, ch: currentRead.ch, verses: new Set() };
  }
  const n = Number(v.dataset.v);
  if (e.shiftKey && lastClickedVerse != null) {
    const start = Math.min(lastClickedVerse, n);
    const end = Math.max(lastClickedVerse, n);
    for (let i = start; i <= end; i++) {
      selection.verses.add(i);
    }
  } else {
    selection.verses.has(n) ? selection.verses.delete(n) : selection.verses.add(n);
  }
  lastClickedVerse = n;
  paintSelection();
});

selClear?.addEventListener("click", clearSelection);

selColors?.addEventListener("click", (e) => {
  const dot = e.target.closest(".bb-color-dot");
  if (!dot) return;
  setHighlightColor(dot.dataset.color);
});

function flashButton(btn, text) {
  const label = btn?.querySelector(".bb-sel-btn-label");
  if (!label) return;
  const original = label.textContent;
  btn.classList.add("is-success");
  label.textContent = text;
  setTimeout(() => {
    btn.classList.remove("is-success");
    label.textContent = original;
  }, 2000);
}

selCopy?.addEventListener("click", async () => {
  if (!selection) return;
  const text = [...selection.verses].sort((a, b) => a - b)
    .map((n) => document.querySelector(`#v${n} .bb-vt`)?.textContent.trim()).filter(Boolean).join(" ");
  const quote = `"${text}" — ${selectionRef(true)}`;
  try {
    await navigator.clipboard.writeText(quote);
    flashButton(selCopy, "Copied!");
    announce("Copied the verses and their reference.");
  } catch {
    announce("Copy isn't available here. Select the text to copy it instead.");
  }
});

selLink?.addEventListener("click", async () => {
  if (!selection) return;
  const url = selectionUrl();
  try {
    await navigator.clipboard.writeText(url);
    flashButton(selLink, "Link copied!");
    announce("Copied passage link.");
  } catch {
    announce("Link copy not supported.");
  }
});

selListen?.addEventListener("click", () => {
  if (!selection) return;
  if (speaking) {
    stopSpeaking();
    return;
  }
  const nodes = [...selection.verses].sort((a, b) => a - b)
    .map((n) => document.getElementById(`v${n}`)).filter(Boolean);
  if (nodes.length) speakVerses(nodes, selListen);
});

selShare?.addEventListener("click", async () => {
  if (!selection || !navigator.share) return;
  const text = [...selection.verses].sort((a, b) => a - b)
    .map((n) => document.querySelector(`#v${n} .bb-vt`)?.textContent.trim()).filter(Boolean).join(" ");
  const ref = selectionRef(true);
  try {
    await navigator.share({
      title: ref,
      text: `"${text}" — ${ref}`,
      url: selectionUrl(),
    });
  } catch {}
});

/* ── Router ──────────────────────────────────────────────────────── */
let restoreHomeScroll = null;
let homeScroll = 0;

function route(keepVerse) {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const rb = bySlug.get(parts[1]);
  const view = parts[0] === "read" && rb ? "read" : parts[0] === "book" && rb ? "book" : "home";
  root.dataset.view = view;
  setRefLabel(view === "read" ? `${rb.name} ${Math.min(Math.max(1, parseInt(parts[2], 10) || 1), rb.verses.length)}` : view === "book" ? rb.name : "Books");
  const wasHome = main.querySelector(".bb-hello");
  if (wasHome) homeScroll = window.scrollY;
  if (parts[0] === "go") { // #/go/Hebrews 12:14 — used by the homepage verse of the day
    const ref = parseRef(parts.slice(1).join(" "));
    history.replaceState(null, "", ref ? (ref.ch ? readHref(ref.book.slug, ref.ch, ref.v1, ref.v2) : `${PAGE}#/book/${ref.book.slug}`) : `${PAGE}#/`);
    return route();
  }
  if (parts[0] === "book" && bySlug.has(parts[1])) { currentRead = null; return renderBook(bySlug.get(parts[1])); }
  if (parts[0] === "read" && bySlug.has(parts[1])) {
    const b = bySlug.get(parts[1]);
    const ch = Math.min(Math.max(1, parseInt(parts[2], 10) || 1), b.verses.length);
    const [v1, v2] = String(parts[3] || "").split("-").map((n) => parseInt(n, 10) || 0);
    return renderChapter(b, ch, v1, v2, keepVerse === true);
  }
  currentRead = null;
  restoreHomeScroll = homeScroll;
  renderHome();
  if (!wasHome) focusHeading();
}

window.addEventListener("hashchange", () => route());

document.addEventListener("keydown", (e) => {
  if (!currentRead || e.altKey || e.ctrlKey || e.metaKey || e.target.closest("input, textarea, select, [contenteditable]")) return;
  if (e.key === "Escape" && selection) { clearSelection(); return; }
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const dir = e.key === "ArrowRight" ? 1 : -1;
  const place = neighbor(currentRead.book, currentRead.ch, dir);
  if (!place) return;
  if (dir > 0) setRead(currentRead.book.slug, currentRead.ch, true);
  location.hash = readHref(place.book.slug, place.ch).split("#")[1];
});

/* ── Translation switcher and display settings ───────────────────── */
function topVisibleVerse() {
  for (const v of document.querySelectorAll(".bb-v")) if (v.getBoundingClientRect().bottom > 80) return Number(v.dataset.v);
  return 0;
}

function switchTranslation(code) {
  if (code === state.tr) return;
  state.tr = code;
  save();
  paintTranslations();
  announce(`${translation().name} selected.`);
  if (currentRead) {
    const keep = topVisibleVerse();
    const { book, ch } = currentRead;
    const target = keep > 1 ? readHref(book.slug, ch, keep) : readHref(book.slug, ch);
    history.replaceState(null, "", target);
    renderChapter(book, ch, keep > 1 ? keep : 0, 0, true);
  }
}

function paintTranslations() {
  const bar = document.getElementById("bbTr");
  bar.replaceChildren(...meta.translations.map((t) =>
    h("button", { type: "button", "aria-pressed": String(t.code === state.tr), title: `${t.name} (${t.year})`, onclick: () => switchTranslation(t.code) }, t.label)));
}

function initDisplay() {
  const panel = document.getElementById("bbDisplay");
  const btn = document.getElementById("bbDisplayBtn");
  const sizeOut = document.getElementById("bbSizeOut");
  const slider = document.getElementById("bbSizeRange");
  const focusBtn = document.getElementById("bbFocusBtn");
  let size = Math.min(200, Math.max(80, Number(store.get("bible:size")) || 100));
  let lh = store.get("bible:lh") || "1.75";
  let width = store.get("bible:width") || "40";
  const applySize = (v) => {
    size = Math.min(200, Math.max(80, v));
    root.style.setProperty("--bb-scale", size / 100);
    store.set("bible:size", String(size));
  };
  const applyLh = (v) => { lh = v; root.style.setProperty("--bb-lh", v); store.set("bible:lh", v); };
  const applyWidth = (v) => { width = v; root.style.setProperty("--bb-measure", v + "rem"); store.set("bible:width", v); };
  const setLayout = (v) => {
    root.dataset.bibleLayout = v;
    store.set("bible:layout", v);
    if (currentRead) { const keep = topVisibleVerse(); renderChapter(currentRead.book, currentRead.ch, keep > 1 ? keep : 0, 0, true); }
  };
  const paint = () => {
    const mode = root.dataset.readerMode || "";
    panel.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    panel.querySelectorAll("[data-layout]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.layout === root.dataset.bibleLayout)));
    panel.querySelectorAll("[data-face]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.face === (root.dataset.bibleFace || "serif"))));
    panel.querySelectorAll("[data-hl]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.hl === highlightColor)));
    sizeOut.textContent = size + "%";
    slider.value = size;
    panel.querySelectorAll("[data-lh]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lh === lh)));
    panel.querySelectorAll("[data-width]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.width === width)));
    focusBtn.setAttribute("aria-pressed", String(root.dataset.focus === "on"));
  };
  const closePanel = () => { panel.hidden = true; btn.setAttribute("aria-expanded", "false"); };
  btn.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    btn.setAttribute("aria-expanded", String(!panel.hidden));
    paint();
  });
  slider.addEventListener("input", () => { applySize(Number(slider.value)); paint(); });
  document.addEventListener("click", (e) => {
    if (!panel.hidden && !e.target.closest("#bbDisplay, #bbDisplayBtn")) closePanel();
  });
  document.getElementById("bbFocusExit").addEventListener("click", () => { delete root.dataset.focus; paint(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) { closePanel(); btn.focus(); }
    else if (e.key === "Escape" && root.dataset.focus === "on") { delete root.dataset.focus; paint(); }
  });
  panel.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.mode) {
      root.dataset.readerMode = b.dataset.mode;
      store.set("reader:mode", b.dataset.mode); // shared with reader.html
    } else if (b.dataset.lh) {
      applyLh(b.dataset.lh);
    } else if (b.dataset.width) {
      applyWidth(b.dataset.width);
    } else if (b.id === "bbFocusBtn") {
      root.dataset.focus = root.dataset.focus === "on" ? "off" : "on";
      if (root.dataset.focus === "on") { closePanel(); document.getElementById("bbFocusExit").focus(); }
    } else if (b.id === "bbReset") {
      applySize(100); applyLh("1.75"); applyWidth("40");
      delete root.dataset.bibleFace;
      store.set("bible:face", "");
      setLayout("auto");
      announce("Text settings reset.");
    } else if (b.dataset.face) {
      root.dataset.bibleFace = b.dataset.face;
      store.set("bible:face", b.dataset.face);
    } else if (b.dataset.layout) {
      setLayout(b.dataset.layout);
    } else if (b.dataset.hl) {
      setHighlightColor(b.dataset.hl);
    }
    paint();
  });
  paint();
}

/* ── Chrome: current-reference label, book/chapter picker, pager, reading progress ── */
function setRefLabel(text) {
  const el = document.getElementById("bbRefLabel");
  if (el) el.textContent = text;
}

const pager = document.getElementById("bbPager");
function paintPager(b, ch, prev, next) {
  const link = (place, dir) => place
    ? h("a", { class: `bb-pg ${dir > 0 ? "bb-pg-next" : "bb-pg-prev"}`, href: readHref(place.book.slug, place.ch), rel: dir > 0 ? "next" : "prev",
        title: `${place.book.name} ${place.ch}`, "aria-label": `${dir > 0 ? "Next" : "Previous"} chapter, ${place.book.name} ${place.ch}`,
        onclick: dir > 0 ? () => setRead(b.slug, ch, true) : null }, dir < 0 ? "‹ Prev" : "Next ›")
    : h("span", { class: "bb-pg bb-pg-off", "aria-hidden": "true" });
  pager.replaceChildren(link(prev, -1), h("span", { class: "bb-pg-ref", text: `${b.name} ${ch}` }), link(next, 1));
  paintProgress();
}

const progressBar = document.querySelector("#bbProgress span");
let progressQueued = false;
function paintProgress() {
  progressQueued = false;
  const t = main.querySelector(".bb-text");
  if (root.dataset.view !== "read" || !t) { progressBar.style.width = "0"; return; }
  const r = t.getBoundingClientRect();
  const p = (window.innerHeight - r.top) / Math.max(r.height, 1);
  progressBar.style.width = `${Math.round(Math.min(1, Math.max(0, p)) * 100)}%`;
}
window.addEventListener("scroll", () => { if (!progressQueued) { progressQueued = true; requestAnimationFrame(paintProgress); } }, { passive: true });
if (window.ResizeObserver) new ResizeObserver(paintProgress).observe(main);

const picker = document.getElementById("bbPicker");
const pickBody = document.getElementById("bbPickBody");
const pickTabs = document.getElementById("bbPickTabs");
const pickMsg = document.getElementById("bbPickMsg");
const pickInput = document.getElementById("bbPickInput");
let pickT = "OT";

function pickBooks() {
  pickTabs.hidden = false;
  pickTabs.querySelectorAll("[data-t]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === pickT)));
  pickBody.replaceChildren(h("ul", { class: "bb-pick-books" }, books.filter((b) => b.t === pickT).map((b) => {
    const done = readSet(b.slug).size;
    return h("li", null, h("button", { type: "button", class: "bb-pick-book", "data-cat": b.cat, onclick: () => pickChapters(b) },
      h("span", { text: b.name }), h("small", { text: done ? `${done}/${b.verses.length}` : String(b.verses.length) })));
  })));
}

function pickChapters(b) {
  pickTabs.hidden = true;
  const read = readSet(b.slug);
  const back = h("button", { type: "button", class: "bb-linkbtn bb-pick-back", onclick: () => { pickT = b.t; pickBooks(); } }, "‹ All books");
  pickBody.replaceChildren(back,
    h("h3", { class: "bb-pick-title", text: b.name }),
    h("ol", { class: "bb-chapters" }, b.verses.map((_, i) => h("li", null, h("a", {
      class: "bb-ch" + (read.has(i + 1) ? " is-read" : "") + (currentRead?.book === b && currentRead.ch === i + 1 ? " is-last" : ""),
      href: readHref(b.slug, i + 1), "aria-label": `Chapter ${i + 1}${read.has(i + 1) ? ", read" : ""}`,
      onclick: () => picker.close(),
    }, String(i + 1))))));
  pickBody.querySelector(".bb-ch.is-last, .bb-ch")?.scrollIntoView({ block: "nearest" });
}

function openPicker() {
  pickMsg.textContent = "";
  pickInput.value = "";
  if (currentRead) pickChapters(currentRead.book); else pickBooks();
  if (picker.showModal) picker.showModal(); else picker.setAttribute("open", "");
}
document.getElementById("bbPickBtn").addEventListener("click", openPicker);
document.getElementById("bbPickClose").addEventListener("click", () => picker.close());
picker.addEventListener("click", (e) => { if (e.target === picker) picker.close(); });
pickTabs.addEventListener("click", (e) => {
  const b = e.target.closest("[data-t]");
  if (b) { pickT = b.dataset.t; pickBooks(); }
});
document.getElementById("bbPickSearch").addEventListener("submit", (e) => {
  e.preventDefault();
  const ref = parseRef(pickInput.value);
  if (!ref) { pickMsg.textContent = `Couldn't find "${pickInput.value}". Try a book name, like Romans 8 or Ps 23.`; return; }
  picker.close();
  location.hash = ref.ch ? readHref(ref.book.slug, ref.ch, ref.v1, ref.v2).split("#")[1] : `/book/${ref.book.slug}`;
});

/* ── Start ───────────────────────────────────────────────────────── */
async function start() {
  try {
    const res = await fetch(DATA + "books.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    meta = await res.json();
  } catch {
    main.replaceChildren(h("p", { class: "bb-error", text: "The Bible couldn't load. Check your connection and reload the page." }));
    return;
  }
  books = meta.books;
  books.forEach((b) => bySlug.set(b.slug, b));
  TOTAL = books.reduce((n, b) => n + b.verses.length, 0);
  if (!meta.translations.some((t) => t.code === state.tr)) state.tr = meta.translations[0].code;
  // Drop anything that no longer matches the canon (renamed slug, out-of-range chapter).
  for (const slug of Object.keys(state.read)) {
    const b = bySlug.get(slug);
    if (!b) { delete state.read[slug]; continue; }
    state.read[slug] = state.read[slug].filter((n) => Number.isInteger(n) && n >= 1 && n <= b.verses.length);
  }
  buildAliases();
  paintTranslations();
  initDisplay();
  route();
}

start();
