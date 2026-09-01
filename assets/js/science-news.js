// Classroom science briefing — official Science News Explores WordPress API.
// The source is published by the nonprofit Society for Science for readers ages 9–14.
const NEWS_API_URL = "https://www.snexplores.org/wp-json/wp/v2/posts?per_page=6&_embed=wp:term";
const NEWS_CACHE_KEY = "classroom_science_news_v1";
const NEWS_CACHE_TTL = 30 * 60 * 1000;

const feed = document.getElementById("science-news-feed");
const refreshButton = document.getElementById("science-news-refresh");

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

function renderStories(stories, savedEdition = false) {
  if (!feed) return;
  feed.replaceChildren(...stories.slice(0, 4).map(buildStory));
  feed.setAttribute("aria-busy", "false");
  feed.dataset.edition = savedEdition ? "saved" : "live";
}

function renderError() {
  if (!feed) return;
  const panel = document.createElement("div");
  panel.className = "science-news-error";
  const title = document.createElement("strong");
  title.textContent = "The science desk could not connect.";
  const copy = document.createElement("span");
  copy.textContent = "Check your connection or read the latest stories at the source.";
  const link = document.createElement("a");
  link.href = "https://www.snexplores.org/";
  link.target = "_blank";
  link.rel = "noreferrer noopener";
  link.textContent = "Open Science News Explores ↗";
  panel.append(title, copy, link);
  feed.replaceChildren(panel);
  feed.setAttribute("aria-busy", "false");
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

  try {
    const stories = await fetchStories();
    saveCache(stories);
    renderStories(stories);
  } catch (error) {
    console.warn("[science-news] Live feed unavailable:", error);
    const savedStories = readCache(true);
    if (savedStories) renderStories(savedStories, true);
    else renderError();
  } finally {
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.removeAttribute("aria-label");
    }
  }
}

refreshButton?.addEventListener("click", () => loadStories(true));
loadStories();
