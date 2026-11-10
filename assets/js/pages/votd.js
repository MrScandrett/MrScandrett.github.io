// bible-api.com — no key, public domain translations (KJV, WEB, ASV, BBE, YLT…)
// Source: https://bible-api.com  License: public domain translations
const BIBLE_API = "https://bible-api.com";

const DEFAULT_VERSE = {
  text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
  reference: "John 3:16 (NIV)",
  deeplink: "https://www.bible.com/verse-of-the-day",
  sourceLabel: "Saved copy (today's verse could not load)",
};

const LOCAL_VOTD_URL = "assets/data/votd.json";
const PREF_KEY = "classroomos:votd-translation";
// The verse is chosen on Eastern time (the daily job runs after midnight ET).
const VOTD_TZ = "America/New_York";
const STALE_AFTER_MS = 36 * 60 * 60 * 1000;

// Translation options offered in the switcher.
// "local" = use the cached text from votd.json (no fetch).
// Others fetch from bible-api.com (public domain only — KJV 1769, WEB 2020, ASV 1901).
// `source` is the credit line shown under the verse for that text.
const TRANSLATIONS = [
  { code: "local", label: "NIV",  title: "New International Version (cached)", name: "New International Version" },
  { code: "kjv",   label: "KJV",  title: "King James Version, 1769 — public domain", name: "King James Version (1769)", source: "bible-api.com · public domain" },
  { code: "web",   label: "WEB",  title: "World English Bible, 2020 — public domain", name: "World English Bible (2020)", source: "bible-api.com · public domain" },
  { code: "asv",   label: "ASV",  title: "American Standard Version, 1901 — public domain", name: "American Standard Version (1901)", source: "bible-api.com · public domain" },
];

// USFM book codes, indexed by the book ids in BOOK_CONTEXT (1–66), for deep links to a verse.
const USFM = [
  "", "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH", "2CH",
  "EZR", "NEH", "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS",
  "JOL", "AMO", "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL", "MAT", "MRK", "LUK",
  "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT",
  "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
];
// YouVersion's Bible id for each translation we link to (NIV only; the others stay on the verse of the day).
const YOUVERSION_IDS = { NIV: 111 };

// One extra question per kind of book, so the reflection fits what the student just read.
const REFLECTION_BY_CATEGORY = {
  Torah:    "This is part of the story of how God formed a people. Where do you see his promises or his instructions to them?",
  History:  "Who are the people here, and what is happening around them? What does this moment show about them, or about God?",
  Poetry:   "Poems speak from the heart. What feeling is behind these words, and when might someone need to say them?",
  Wisdom:   "Wisdom writing is practical. Where could this show up in an ordinary day at school, at home, or with friends?",
  Prophets: "A prophet spoke to people in a particular time and place. What was happening then, and what hope or warning is in these words?",
  Gospel:   "Where is Jesus in this scene: who is he with, and what is he doing or teaching? What stands out about how he treats people?",
  Epistle:  "This was a letter to real people. Who is the writer speaking to, and what do they most need to hear?",
  Prophecy: "This is written in vivid, symbolic language. What picture do you see, and what comfort or challenge does it carry?",
};

const BOOK_CONTEXT = {
  Genesis:          { t: "Old Testament", cat: "Torah",    id: 1  },
  Exodus:           { t: "Old Testament", cat: "Torah",    id: 2  },
  Leviticus:        { t: "Old Testament", cat: "Torah",    id: 3  },
  Numbers:          { t: "Old Testament", cat: "Torah",    id: 4  },
  Deuteronomy:      { t: "Old Testament", cat: "Torah",    id: 5  },
  Joshua:           { t: "Old Testament", cat: "History",  id: 6  },
  Judges:           { t: "Old Testament", cat: "History",  id: 7  },
  Ruth:             { t: "Old Testament", cat: "History",  id: 8  },
  "1 Samuel":       { t: "Old Testament", cat: "History",  id: 9  },
  "2 Samuel":       { t: "Old Testament", cat: "History",  id: 10 },
  "1 Kings":        { t: "Old Testament", cat: "History",  id: 11 },
  "2 Kings":        { t: "Old Testament", cat: "History",  id: 12 },
  "1 Chronicles":   { t: "Old Testament", cat: "History",  id: 13 },
  "2 Chronicles":   { t: "Old Testament", cat: "History",  id: 14 },
  Ezra:             { t: "Old Testament", cat: "History",  id: 15 },
  Nehemiah:         { t: "Old Testament", cat: "History",  id: 16 },
  Esther:           { t: "Old Testament", cat: "History",  id: 17 },
  Job:              { t: "Old Testament", cat: "Poetry",   id: 18 },
  Psalms:           { t: "Old Testament", cat: "Poetry",   id: 19 },
  Psalm:            { t: "Old Testament", cat: "Poetry",   id: 19 },
  Proverbs:         { t: "Old Testament", cat: "Wisdom",   id: 20 },
  Ecclesiastes:     { t: "Old Testament", cat: "Wisdom",   id: 21 },
  "Song of Solomon":{ t: "Old Testament", cat: "Poetry",   id: 22 },
  "Song of Songs":  { t: "Old Testament", cat: "Poetry",   id: 22 },
  Isaiah:           { t: "Old Testament", cat: "Prophets", id: 23 },
  Jeremiah:         { t: "Old Testament", cat: "Prophets", id: 24 },
  Lamentations:     { t: "Old Testament", cat: "Prophets", id: 25 },
  Ezekiel:          { t: "Old Testament", cat: "Prophets", id: 26 },
  Daniel:           { t: "Old Testament", cat: "Prophets", id: 27 },
  Hosea:            { t: "Old Testament", cat: "Prophets", id: 28 },
  Joel:             { t: "Old Testament", cat: "Prophets", id: 29 },
  Amos:             { t: "Old Testament", cat: "Prophets", id: 30 },
  Obadiah:          { t: "Old Testament", cat: "Prophets", id: 31 },
  Jonah:            { t: "Old Testament", cat: "Prophets", id: 32 },
  Micah:            { t: "Old Testament", cat: "Prophets", id: 33 },
  Nahum:            { t: "Old Testament", cat: "Prophets", id: 34 },
  Habakkuk:         { t: "Old Testament", cat: "Prophets", id: 35 },
  Zephaniah:        { t: "Old Testament", cat: "Prophets", id: 36 },
  Haggai:           { t: "Old Testament", cat: "Prophets", id: 37 },
  Zechariah:        { t: "Old Testament", cat: "Prophets", id: 38 },
  Malachi:          { t: "Old Testament", cat: "Prophets", id: 39 },
  Matthew:          { t: "New Testament", cat: "Gospel",   id: 40 },
  Mark:             { t: "New Testament", cat: "Gospel",   id: 41 },
  Luke:             { t: "New Testament", cat: "Gospel",   id: 42 },
  John:             { t: "New Testament", cat: "Gospel",   id: 43 },
  Acts:             { t: "New Testament", cat: "History",  id: 44 },
  Romans:           { t: "New Testament", cat: "Epistle",  id: 45 },
  "1 Corinthians":  { t: "New Testament", cat: "Epistle",  id: 46 },
  "2 Corinthians":  { t: "New Testament", cat: "Epistle",  id: 47 },
  Galatians:        { t: "New Testament", cat: "Epistle",  id: 48 },
  Ephesians:        { t: "New Testament", cat: "Epistle",  id: 49 },
  Philippians:      { t: "New Testament", cat: "Epistle",  id: 50 },
  Colossians:       { t: "New Testament", cat: "Epistle",  id: 51 },
  "1 Thessalonians":{ t: "New Testament", cat: "Epistle",  id: 52 },
  "2 Thessalonians":{ t: "New Testament", cat: "Epistle",  id: 53 },
  "1 Timothy":      { t: "New Testament", cat: "Epistle",  id: 54 },
  "2 Timothy":      { t: "New Testament", cat: "Epistle",  id: 55 },
  Titus:            { t: "New Testament", cat: "Epistle",  id: 56 },
  Philemon:         { t: "New Testament", cat: "Epistle",  id: 57 },
  Hebrews:          { t: "New Testament", cat: "Epistle",  id: 58 },
  James:            { t: "New Testament", cat: "Epistle",  id: 59 },
  "1 Peter":        { t: "New Testament", cat: "Epistle",  id: 60 },
  "2 Peter":        { t: "New Testament", cat: "Epistle",  id: 61 },
  "1 John":         { t: "New Testament", cat: "Epistle",  id: 62 },
  "2 John":         { t: "New Testament", cat: "Epistle",  id: 63 },
  "3 John":         { t: "New Testament", cat: "Epistle",  id: 64 },
  Jude:             { t: "New Testament", cat: "Epistle",  id: 65 },
  Revelation:       { t: "New Testament", cat: "Prophecy", id: 66 },
};

// In-memory cache: "{code}-{passage}" → verse text string
const verseCache = new Map();

function withTimeout(ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function fetchDailyVerse() {
  const timeout = withTimeout();
  try {
    const res = await fetch(LOCAL_VOTD_URL, { signal: timeout.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`Local VOTD HTTP ${res.status}`);
    const data = await res.json();
    if (!data || !data.text || !data.reference) throw new Error("Malformed local VOTD response");
    return {
      text: String(data.text).trim(),
      reference: String(data.reference).trim(),
      deeplink: String(data.deeplink || DEFAULT_VERSE.deeplink).trim(),
      sourceLabel: String(data.sourceLabel || "YouVersion").trim(),
      fetchedAt: data.fetchedAt,
    };
  } finally {
    timeout.clear();
  }
}

function bookFromReference(reference) {
  return String(reference || "").replace(/\s+\d+:\d+.*$/, "").trim();
}

function chapterFromReference(reference) {
  return String(reference || "").replace(/:\d+.*$/, "").trim();
}

function getBookContext(reference) {
  return BOOK_CONTEXT[bookFromReference(reference)] || null;
}

function formatLongDate(date) {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: VOTD_TZ });
}

function versionFromReference(reference) {
  const m = String(reference || "").match(/\(([^)]+)\)\s*$/);
  return m ? m[1].trim().toUpperCase() : "";
}

// "Ephesians 2:19 (NIV)" → https://www.bible.com/bible/111/EPH.2.19 (null when we can't be exact).
function youVersionVerseUrl(reference) {
  const bibleId = YOUVERSION_IDS[versionFromReference(reference)];
  const ctx = getBookContext(reference);
  const m = String(reference).replace(/\s*\(.*\)\s*$/, "").match(/(\d+):(\d+)(?:\s*[-–]\s*(\d+))?\s*$/);
  if (!bibleId || !ctx || !m) return null;
  const verses = m[3] ? `${m[2]}-${m[3]}` : m[2];
  return `https://www.bible.com/bible/${bibleId}/${USFM[ctx.id]}.${m[1]}.${verses}`;
}

function readPref() {
  try { return localStorage.getItem(PREF_KEY) || ""; } catch { return ""; }
}
function savePref(code) {
  try { code === "local" ? localStorage.removeItem(PREF_KEY) : localStorage.setItem(PREF_KEY, code); } catch { /* private mode */ }
}

// Build the bible-api.com passage string: "1 John 3:16 (NIV)" → "1+john+3:16"
function buildApiPassage(reference) {
  return String(reference).replace(/\s*\(.*\).*$/, "").trim().toLowerCase().replace(/\s+/g, "+");
}

async function fetchBibleApiVerse(reference, translationCode) {
  const passage = buildApiPassage(reference);
  const cacheKey = `${translationCode}-${passage}`;
  if (verseCache.has(cacheKey)) return verseCache.get(cacheKey);

  const url = `${BIBLE_API}/${passage}?translation=${translationCode}`;
  const timeout = withTimeout(6000);
  try {
    const res = await fetch(url, { signal: timeout.signal });
    if (!res.ok) throw new Error(`bible-api.com ${res.status}`);
    const data = await res.json();
    const text = data?.text ? String(data.text).replace(/\n+/g, " ").trim() : null;
    if (!text) throw new Error("Empty verse from bible-api.com");
    verseCache.set(cacheKey, text);
    return text;
  } finally {
    timeout.clear();
  }
}

function setLinks(reference, deeplink) {
  const chapterBtn = document.getElementById("votd-chapter");
  const aiBtn      = document.getElementById("votd-ai");
  const yvBtn      = document.getElementById("votd-youversion");
  if (!chapterBtn || !aiBtn || !yvBtn) return;
  const chapterRef = chapterFromReference(reference);
  // Opens in the site's own Bible reader, at the verse, so students stay in ClassroomOS.
  const verseRef = String(reference).replace(/\s*\(.*\).*$/, "").trim();
  chapterBtn.href = `bible.html#/go/${encodeURIComponent(verseRef || chapterRef)}`;
  aiBtn.href      = `https://www.google.com/search?q=${encodeURIComponent(`Bible ${reference} meaning and commentary`)}`;
  // Straight to this verse on YouVersion when we know it exactly; otherwise their verse-of-the-day page.
  yvBtn.href      = youVersionVerseUrl(reference) || deeplink || DEFAULT_VERSE.deeplink;
}

// Reflection questions: a steady first prompt, then one that fits the kind of book.
function setReflection(reference) {
  const el = document.getElementById("votd-prompt");
  if (!el) return;
  const ctx = getBookContext(reference);
  el.textContent = (ctx && REFLECTION_BY_CATEGORY[ctx.cat]) || "What might this passage invite you to think about or do today?";
}

function status(message) {
  const el = document.getElementById("votd-status");
  if (el) el.textContent = message;
}

function currentReference(reference) {
  return document.getElementById("votd-ref")?.textContent || reference;
}

function initListenBtn(text, reference) {
  const btn = document.getElementById("votd-listen");
  if (!btn) return;
  if (!window.speechSynthesis) { btn.hidden = true; return; }

  btn.addEventListener("click", () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      btn.innerHTML = '<span aria-hidden="true">▶</span> Listen';
      btn.classList.remove("votd-btn--listening");
      btn.setAttribute("aria-label", "Listen to verse");
      return;
    }
    const verseEl = document.getElementById("votd-verse");
    const liveText = verseEl ? verseEl.textContent : text;
    const utterance = new SpeechSynthesisUtterance(`${liveText}. ${currentReference(reference)}`);
    utterance.rate = 0.88;
    utterance.onend = utterance.onerror = () => {
      btn.innerHTML = '<span aria-hidden="true">▶</span> Listen';
      btn.classList.remove("votd-btn--listening");
      btn.setAttribute("aria-label", "Listen to verse");
    };
    btn.setAttribute("aria-label", "Stop reading verse");
    window.speechSynthesis.speak(utterance);
    btn.innerHTML = '<span aria-hidden="true">◼</span> Stop';
    btn.classList.add("votd-btn--listening");
  });
}

function initCopyBtn(text, reference) {
  const btn = document.getElementById("votd-copy");
  if (!btn) return;
  if (!navigator.clipboard) { btn.hidden = true; return; }

  btn.addEventListener("click", async () => {
    try {
      const verseEl = document.getElementById("votd-verse");
      const liveText = verseEl ? verseEl.textContent : text;
      await navigator.clipboard.writeText(`"${liveText}" — ${currentReference(reference)}`);
      btn.textContent = "Copied!";
      status("Verse and translation copied.");
      btn.classList.add("votd-btn--copied");
      setTimeout(() => {
        btn.innerHTML = '<span aria-hidden="true">⧉</span> Copy';
        btn.classList.remove("votd-btn--copied");
      }, 1800);
    } catch { status("Copy unavailable. Select the verse text to copy it."); }
  });
}

function initShareBtn(text, reference) {
  const btn = document.getElementById("votd-share");
  if (!btn) return;
  if (!navigator.share) { btn.hidden = true; return; }
  btn.hidden = false;
  btn.addEventListener("click", async () => {
    const verseEl = document.getElementById("votd-verse");
    try {
      await navigator.share({
        title: "Verse of the day",
        text: `"${verseEl ? verseEl.textContent : text}" — ${currentReference(reference)}`,
        url: document.getElementById("votd-chapter")?.href,
      });
    } catch { /* closed the share sheet */ }
  });
}

function initTranslationSwitcher(originalText, reference, defaultSource) {
  const container = document.getElementById("votd-translations");
  const verseEl   = document.getElementById("votd-verse");
  const sourceEl  = document.getElementById("votd-source");
  if (!container || !verseEl) return;

  // Seed cache with the local (NIV) text so the first tab never fetches
  const passage = buildApiPassage(reference);
  verseCache.set(`local-${passage}`, originalText);

  let activeCode = "local";
  const baseRef = reference.replace(/\s*\(.*\)\s*$/, "");

  container.setAttribute("role", "group");
  container.innerHTML = TRANSLATIONS.map(t =>
    `<button class="votd-trans-btn${t.code === "local" ? " votd-trans-btn--active" : ""}" aria-pressed="${t.code === "local"}" data-code="${t.code}" title="${t.title}" aria-label="${t.name}" type="button">${t.label}</button>`
  ).join("");

  // Show `code` (fetching it if needed). Returns true when the verse on screen changed.
  async function show(code, { announce = true } = {}) {
    const btn = container.querySelector(`[data-code="${code}"]`);
    if (!btn || code === activeCode) return false;
    const translation = TRANSLATIONS.find(t => t.code === code);

    window.speechSynthesis?.cancel();
    const listen = document.getElementById("votd-listen");
    if (listen) { listen.innerHTML = '<span aria-hidden="true">▶</span> Listen'; listen.classList.remove("votd-btn--listening"); listen.setAttribute("aria-label", "Listen to verse"); }
    if (announce) status("Loading translation…");
    verseEl.setAttribute("aria-busy", "true");
    container.querySelectorAll(".votd-trans-btn").forEach(b => { b.classList.remove("votd-trans-btn--active"); b.disabled = true; });
    btn.classList.add("votd-trans-btn--loading");
    verseEl.classList.add("votd-verse--fading");

    let changed = false;
    try {
      const newText = code === "local" ? originalText : await fetchBibleApiVerse(reference, code);
      verseEl.textContent = newText;
      activeCode = code;
      document.getElementById("votd-ref").textContent = code === "local" ? reference : `${baseRef} (${translation.label})`;
      if (sourceEl) sourceEl.textContent = code === "local" ? defaultSource : `${translation.name} · ${translation.source}`;
      if (announce) status(`${translation.name} selected.`);
      savePref(code);
      changed = true;
    } catch (err) {
      console.warn("[votd] Translation fetch failed:", err);
      status(announce
        ? "That translation could not load. Your current verse is still available; try again."
        : "Your saved translation could not load, so the NIV is showing.");
      btn.classList.add("votd-trans-btn--error");
      setTimeout(() => btn.classList.remove("votd-trans-btn--error"), 2000);
    } finally {
      verseEl.setAttribute("aria-busy", "false");
      verseEl.classList.remove("votd-verse--fading");
      btn.classList.remove("votd-trans-btn--loading");
      container.querySelectorAll(".votd-trans-btn").forEach(b => {
        b.disabled = false;
        b.setAttribute("aria-pressed", String(b.dataset.code === activeCode));
        b.classList.toggle("votd-trans-btn--active", b.dataset.code === activeCode);
      });
    }
    return changed;
  }

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".votd-trans-btn");
    if (btn) show(btn.dataset.code);
  });

  // Arrow keys move between translations, like a toolbar.
  container.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step || container.querySelector(":disabled")) return;
    const btns = [...container.querySelectorAll(".votd-trans-btn")];
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    btns[(i + step + btns.length) % btns.length].focus();
  });

  // Come back to the translation the student last chose (only a public-domain one, fetched on demand).
  const saved = readPref();
  if (saved && saved !== "local" && originalText) show(saved, { announce: false });
}

function renderVerse(payload) {
  const verseEl   = document.getElementById("votd-verse");
  const refEl     = document.getElementById("votd-ref");
  const sourceEl  = document.getElementById("votd-source");
  const dateEl    = document.getElementById("votd-date");
  const contextEl = document.getElementById("votd-context");
  if (!verseEl || !refEl) return;

  const text        = payload?.text        || DEFAULT_VERSE.text;
  const reference   = payload?.reference   || DEFAULT_VERSE.reference;
  const deeplink    = payload?.deeplink    || DEFAULT_VERSE.deeplink;
  const sourceLabel = payload?.sourceLabel || DEFAULT_VERSE.sourceLabel;

  verseEl.removeAttribute("aria-busy");
  verseEl.textContent = text;
  refEl.textContent   = reference;
  if (sourceEl) sourceEl.textContent = sourceLabel;

  // Show the verse's own day. If the daily update hasn't run in a while, say so instead of
  // dressing an old verse up as today's.
  const fetched = payload?.fetchedAt ? new Date(payload.fetchedAt) : null;
  const hasDate = fetched && !Number.isNaN(fetched.getTime());
  const stale = !hasDate || Date.now() - fetched.getTime() > STALE_AFTER_MS;
  if (dateEl) {
    dateEl.textContent = hasDate ? formatLongDate(fetched) : "A verse to read today";
    if (hasDate) dateEl.setAttribute("datetime", fetched.toISOString());
  }
  if (stale && payload !== DEFAULT_VERSE && hasDate) {
    status(`Today's verse hasn't been updated yet, so this is the latest saved one (${formatLongDate(fetched)}).`);
  }

  if (contextEl) {
    const ctx = getBookContext(reference);
    if (ctx) {
      const isOT = ctx.t === "Old Testament";
      contextEl.innerHTML =
        `<span class="votd-badge votd-badge--${isOT ? "ot" : "nt"}">${ctx.t}</span>` +
        `<span class="votd-badge-sep" aria-hidden="true">·</span>` +
        `<span class="votd-badge votd-badge--category">${ctx.cat}</span>`;
    } else {
      contextEl.innerHTML = "";
    }
  }

  setLinks(reference, deeplink);
  setReflection(reference);
  initTranslationSwitcher(text, reference, sourceLabel);
  initListenBtn(text, reference);
  initCopyBtn(text, reference);
  initShareBtn(text, reference);
}

async function initVotd() {
  try {
    const verse = await fetchDailyVerse();
    renderVerse(verse);
  } catch (error) {
    console.warn("[votd] Falling back to static verse:", error);
    renderVerse(DEFAULT_VERSE);
  }
}

initVotd();
