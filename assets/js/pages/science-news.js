// Classroom science briefing — official Science News Explores WordPress API.
// The source is published by the nonprofit Society for Science for readers ages 9–14.
const NEWS_API_URL = "https://www.snexplores.org/wp-json/wp/v2/posts?per_page=6&_embed=wp:term";
const NEWS_CACHE_KEY = "classroom_science_news_v1";
const NEWS_CACHE_TTL = 30 * 60 * 1000;

const feed = document.getElementById("science-news-feed");
const refreshButton = document.getElementById("science-news-refresh");
const editionBadge = document.getElementById("science-news-edition-badge");

// Shown instantly if a classroom has no connection and no prior cache yet —
// evergreen enough to stay useful, and honest that it isn't today's headlines.
const CURATED_FALLBACK = [
  {
    title: "Why do vaccines need booster shots?",
    summary: "Immunity can fade as antibody levels drop over time. Boosters remind the immune system what to watch for, which is why some vaccines call for more than one dose.",
    url: "https://www.snexplores.org/",
    date: "",
    topic: "Health",
  },
  {
    title: "What actually happens inside a black hole?",
    summary: "Nobody has seen inside one directly, but gravity's pull grows so strong that not even light can escape past the event horizon — the boundary where our physics runs out of answers.",
    url: "https://www.snexplores.org/",
    date: "",
    topic: "Space",
  },
  {
    title: "How do scientists know Earth's climate is warming?",
    summary: "Independent records — ocean buoys, ice cores, satellite readings, weather stations — all point the same direction, which is why climate scientists treat the trend as settled.",
    url: "https://www.snexplores.org/",
    date: "",
    topic: "Earth",
  },
  {
    title: "Why can octopuses change color so fast?",
    summary: "Their skin is packed with pigment sacs called chromatophores, controlled directly by nerves rather than hormones — letting an octopus shift its look in a fraction of a second.",
    url: "https://www.snexplores.org/",
    date: "",
    topic: "Life",
  },
];

function plainText(html = "") {
  const documentFragment = new DOMParser().parseFromString(html, "text/html");
  return (documentFragment.body.textContent || "").replace(/\s+/g, " ").trim();
}

function shorten(text, limit = 155) {
  if (text.length <= limit) return text;
  const breakAt = text.lastIndexOf(" ", limit);
  return `${text.slice(0, breakAt > 0 ? breakAt : limit)}…`;
}

function safeStoryUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && ["snexplores.org", "www.snexplores.org"].includes(url.hostname)) {
      return url.href;
    }
  } catch { /* malformed source URL */ }
  return "https://www.snexplores.org/";
}

function storyTopic(post) {
  const groups = post?._embedded?.["wp:term"] || [];
  const topic = groups.flat().find((term) => term.taxonomy === "topic");
  return plainText(topic?.name || "Science");
}

function normalizeStory(post) {
  return {
    title: plainText(post?.title?.rendered || "Untitled science story"),
    summary: shorten(plainText(post?.excerpt?.rendered || "Open the story to investigate the latest evidence.")),
    url: safeStoryUrl(post?.link),
    date: post?.date || "",
    topic: storyTopic(post),
  };
}

function formatDate(value) {
  if (!value) return "Reference";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Latest report";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function readCache(allowStale = false) {
  try {
    const cached = JSON.parse(localStorage.getItem(NEWS_CACHE_KEY));
    if (!Array.isArray(cached?.stories) || !cached.stories.length) return null;
    if (!allowStale && Date.now() - cached.savedAt > NEWS_CACHE_TTL) return null;
    return cached.stories;
  } catch {
    return null;
  }
}

function saveCache(stories) {
  try {
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), stories }));
  } catch { /* storage may be unavailable in private browsing */ }
}

function buildStory(story, index) {
  const article = document.createElement("article");
  article.className = "science-news-story";

  const number = document.createElement("span");
  number.className = "science-news-number";
  number.setAttribute("aria-hidden", "true");
  number.textContent = String(index + 1).padStart(2, "0");

  const content = document.createElement("div");
  content.className = "science-news-story-copy";

  const meta = document.createElement("p");
  meta.className = "science-news-meta";
  const topic = document.createElement("span");
  topic.textContent = story.topic;
  const time = document.createElement("time");
  time.dateTime = story.date;
  time.textContent = formatDate(story.date);
  meta.append(topic, time);

  const heading = document.createElement("h4");
  const link = document.createElement("a");
  link.href = story.url;
  link.target = "_blank";
  link.rel = "noreferrer noopener";
  link.textContent = story.title;
  link.setAttribute("aria-label", `${story.title} — read at Science News Explores (opens in a new tab)`);
  heading.append(link);

  const summary = document.createElement("p");
  summary.className = "science-news-summary";
  summary.textContent = story.summary;

  const arrow = document.createElement("span");
  arrow.className = "science-news-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";

  content.append(meta, heading, summary);
  article.append(number, content, arrow);
  return article;
}

const EDITION_LABELS = { saved: "Saved edition", offline: "Offline edition" };

function renderStories(stories, edition = "live") {
  if (!feed) return;
  feed.replaceChildren(...stories.slice(0, 4).map(buildStory));
  feed.setAttribute("aria-busy", "false");
  feed.dataset.edition = edition;
  if (editionBadge) {
    const label = EDITION_LABELS[edition];
    editionBadge.textContent = label || "";
    editionBadge.hidden = !label;
  }
}

async function fetchStories() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(NEWS_API_URL, { signal: controller.signal, credentials: "omit" });
    if (!response.ok) throw new Error(`Science news HTTP ${response.status}`);
    const posts = await response.json();
    const stories = posts.map(normalizeStory).filter((story) => story.title && story.url);
    if (stories.length < 4) throw new Error("Science news returned too few stories");
    return stories;
  } finally {
    window.clearTimeout(timeout);
  }
}

// Show something useful fast: a fresh cache renders immediately, but a live
// fetch only gets SKELETON_BUDGET before stale cache (or the curated set) is
// shown in its place. The fetch keeps running underneath and, if it succeeds
// after that point, quietly upgrades the feed to the live edition.
const SKELETON_BUDGET = 1800;

async function loadStories(forceRefresh = false) {
  if (!feed) return;
  const cached = forceRefresh ? null : readCache();
  if (cached) {
    renderStories(cached);
    return;
  }

  feed.setAttribute("aria-busy", "true");
  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.setAttribute("aria-label", "Checking for new science stories");
  }

  let settled = false;
  const fallbackTimer = window.setTimeout(() => {
    if (settled) return;
    const savedStories = readCache(true);
    renderStories(savedStories || CURATED_FALLBACK, savedStories ? "saved" : "offline");
  }, SKELETON_BUDGET);

  try {
    const stories = await fetchStories();
    settled = true;
    window.clearTimeout(fallbackTimer);
    saveCache(stories);
    renderStories(stories);
  } catch (error) {
    console.warn("[science-news] Live feed unavailable:", error);
    settled = true;
    window.clearTimeout(fallbackTimer);
    const savedStories = readCache(true);
    renderStories(savedStories || CURATED_FALLBACK, savedStories ? "saved" : "offline");
  } finally {
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.removeAttribute("aria-label");
    }
  }
}

refreshButton?.addEventListener("click", () => loadStories(true));
loadStories();
