const DEFAULT_VERSE = {
  text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
  reference: "John 3:16 (NIV)",
  deeplink: "https://www.bible.com/verse-of-the-day",
  sourceLabel: "YouVersion fallback",
};

const LOCAL_VOTD_URL = "assets/data/votd.json";

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

function chapterFromReference(reference) {
  return String(reference || "")
    .replace(/:\d+.*$/, "")
    .trim();
}

function setLinks(reference, deeplink) {
  const chapterBtn = document.getElementById("votd-chapter");
  const aiBtn = document.getElementById("votd-ai");
  const yvBtn = document.getElementById("votd-youversion");
  if (!chapterBtn || !aiBtn || !yvBtn) return;

  const chapterRef = chapterFromReference(reference);
  chapterBtn.href = `https://www.bible.com/search/bible?q=${encodeURIComponent(chapterRef || reference)}`;
  aiBtn.href = `https://www.google.com/search?q=${encodeURIComponent(`Bible ${reference} meaning and commentary`)}`;
  yvBtn.href = deeplink || DEFAULT_VERSE.deeplink;
}

function renderVerse(payload) {
  const verseEl = document.getElementById("votd-verse");
  const refEl = document.getElementById("votd-ref");
  const sourceEl = document.getElementById("votd-source");
  if (!verseEl || !refEl) return;

  const text = payload && payload.text ? payload.text : DEFAULT_VERSE.text;
  const reference = payload && payload.reference ? payload.reference : DEFAULT_VERSE.reference;
  const deeplink = payload && payload.deeplink ? payload.deeplink : DEFAULT_VERSE.deeplink;
  const sourceLabel = payload && payload.sourceLabel ? payload.sourceLabel : DEFAULT_VERSE.sourceLabel;

  verseEl.textContent = `"${text}"`;
  verseEl.removeAttribute("aria-busy");
  refEl.textContent = `— ${reference}`;
  if (sourceEl) sourceEl.textContent = sourceLabel;
  setLinks(reference, deeplink);
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
