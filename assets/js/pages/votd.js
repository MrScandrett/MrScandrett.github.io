// bible-api.com — no key, public domain translations (KJV, WEB, ASV, BBE, YLT…)
// Source: https://bible-api.com  License: public domain translations
const BIBLE_API = "https://bible-api.com";

const DEFAULT_VERSE = {
  text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
  reference: "John 3:16 (NIV)",
  deeplink: "https://www.bible.com/verse-of-the-day",
  sourceLabel: "YouVersion fallback",
};

const LOCAL_VOTD_URL = "assets/data/votd.json";

// Translation options offered in the switcher.
// "local" = use the cached text from votd.json (no fetch).
// Others fetch from bible-api.com (public domain only — KJV 1769, WEB 2020, ASV 1901).
const TRANSLATIONS = [
  { code: "local", label: "NIV",  title: "New International Version (cached)" },
  { code: "kjv",   label: "KJV",  title: "King James Version, 1769 — public domain" },
  { code: "web",   label: "WEB",  title: "World English Bible, 2020 — public domain" },
  { code: "asv",   label: "ASV",  title: "American Standard Version, 1901 — public domain" },
];

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

function formatVotdDate() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
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
  chapterBtn.href = `https://www.bible.com/search/bible?q=${encodeURIComponent(chapterRef || reference)}`;
  aiBtn.href      = `https://www.google.com/search?q=${encodeURIComponent(`Bible ${reference} meaning and commentary`)}`;
  yvBtn.href      = deeplink || DEFAULT_VERSE.deeplink;
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
      return;
    }
    const verseEl = document.getElementById("votd-verse");
    const liveText = verseEl ? verseEl.textContent : text;
    const utterance = new SpeechSynthesisUtterance(`${liveText}. ${reference}`);
    utterance.rate = 0.88;
    utterance.onend = () => {
      btn.innerHTML = '<span aria-hidden="true">▶</span> Listen';
      btn.classList.remove("votd-btn--listening");
    };
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
      await navigator.clipboard.writeText(`"${liveText}" — ${reference}`);
      btn.textContent = "Copied!";
      btn.classList.add("votd-btn--copied");
      setTimeout(() => {
        btn.innerHTML = '<span aria-hidden="true">✦</span> Copy';
        btn.classList.remove("votd-btn--copied");
      }, 1800);
    } catch { /* clipboard denied — silent */ }
  });
}

function initTranslationSwitcher(originalText, reference) {
  const container = document.getElementById("votd-translations");
  const verseEl   = document.getElementById("votd-verse");
  if (!container || !verseEl) return;

  // Seed cache with the local (NIV) text so the first tab never fetches
  const passage = buildApiPassage(reference);
  verseCache.set(`local-${passage}`, originalText);

  let activeCode = "local";

  container.innerHTML = TRANSLATIONS.map(t =>
    `<button class="votd-trans-btn${t.code === "local" ? " votd-trans-btn--active" : ""}" data-code="${t.code}" title="${t.title}" type="button">${t.label}</button>`
  ).join("");

  container.addEventListener("click", async (e) => {
    const btn = e.target.closest(".votd-trans-btn");
    if (!btn || btn.dataset.code === activeCode) return;

    const code = btn.dataset.code;

    // Mark loading state
    container.querySelectorAll(".votd-trans-btn").forEach(b => {
      b.classList.toggle("votd-trans-btn--active", false);
      b.disabled = true;
    });
    btn.classList.add("votd-trans-btn--loading");
    verseEl.classList.add("votd-verse--fading");

    try {
      const newText = code === "local"
        ? originalText
        : await fetchBibleApiVerse(reference, code);

      verseEl.textContent = newText;
      activeCode = code;
      btn.classList.add("votd-trans-btn--active");
    } catch (err) {
      console.warn("[votd] Translation fetch failed:", err);
      btn.classList.add("votd-trans-btn--error");
      setTimeout(() => btn.classList.remove("votd-trans-btn--error"), 2000);
    } finally {
      verseEl.classList.remove("votd-verse--fading");
      btn.classList.remove("votd-trans-btn--loading");
      container.querySelectorAll(".votd-trans-btn").forEach(b => { b.disabled = false; });
      container.querySelector(`[data-code="${activeCode}"]`)?.classList.add("votd-trans-btn--active");
    }
  });
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

  if (dateEl) dateEl.textContent = formatVotdDate();

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
  initTranslationSwitcher(text, reference);
  initListenBtn(text, reference);
  initCopyBtn(text, reference);
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
