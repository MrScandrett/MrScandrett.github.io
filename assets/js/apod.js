// NASA Astronomy Picture of the Day — api.nasa.gov/planetary/apod
// DEMO_KEY: 30 req/hour, 50/day — fine for classroom use.
// Get a free personal key at https://api.nasa.gov if you hit limits.
const APOD_API_KEY = "DEMO_KEY";
const APOD_API_URL = `https://api.nasa.gov/planetary/apod?api_key=${APOD_API_KEY}`;
const APOD_CACHE_KEY = "apod_cache";

const APOD_FALLBACK = {
  title: "Pale Blue Dot",
  explanation: "Look again at that dot. That's here. That's home. That's us. On it everyone you love, everyone you know, everyone you ever heard of, every human being who ever was, lived out their lives.",
  url: "https://upload.wikimedia.org/wikipedia/commons/7/73/Pale_Blue_Dot.png",
  hdurl: "https://upload.wikimedia.org/wikipedia/commons/7/73/Pale_Blue_Dot.png",
  date: "1990-02-14",
  media_type: "image",
  copyright: "NASA / JPL / Carl Sagan",
};

function withTimeout(ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadCache() {
  try {
    const raw = sessionStorage.getItem(APOD_CACHE_KEY);
    if (!raw) return null;
    const { key, data } = JSON.parse(raw);
    if (key === todayKey() && data?.url) return data;
  } catch { /* ignore */ }
  return null;
}

function saveCache(data) {
  try {
    sessionStorage.setItem(APOD_CACHE_KEY, JSON.stringify({ key: todayKey(), data }));
  } catch { /* ignore */ }
}

async function fetchApod() {
  const cached = loadCache();
  if (cached) return cached;

  const { signal, clear } = withTimeout();
  try {
    const res = await fetch(APOD_API_URL, { signal });
    if (!res.ok) throw new Error(`APOD HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.url) throw new Error("Malformed APOD response");
    saveCache(data);
    return data;
  } finally {
    clear();
  }
}

function formatApodDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function truncate(text, limit = 260) {
  if (!text || text.length <= limit) return { short: text, full: text, truncated: false };
  const cut = text.lastIndexOf(" ", limit);
  return { short: text.slice(0, cut > 0 ? cut : limit) + "…", full: text, truncated: true };
}

function renderApod(data) {
  const d = data || APOD_FALLBACK;

  const dateEl    = document.getElementById("apod-date");
  const imageWrap = document.getElementById("apod-image-wrap");
  const titleEl   = document.getElementById("apod-title");
  const explEl    = document.getElementById("apod-explanation");
  const copyEl    = document.getElementById("apod-copyright");
  const hdLink    = document.getElementById("apod-hd");
  const expandBtn = document.getElementById("apod-expand");

  if (dateEl)  dateEl.textContent = formatApodDate(d.date);
  if (titleEl) titleEl.textContent = d.title || "Today's Image";
  if (copyEl)  copyEl.textContent = d.copyright ? `© ${d.copyright.trim()}` : "NASA / Public Domain";
  if (hdLink)  { hdLink.href = d.hdurl || d.url; }

  if (imageWrap) {
    if (d.media_type === "video") {
      // YouTube embed — extract video ID
      const ytMatch = (d.url || "").match(/(?:youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      if (ytMatch) {
        imageWrap.innerHTML = `<iframe class="apod-video" src="https://www.youtube.com/embed/${ytMatch[1]}" title="${d.title || 'APOD Video'}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      } else {
        imageWrap.innerHTML = `<a class="apod-video-link" href="${d.url}" target="_blank" rel="noreferrer noopener">Watch Today's Video ↗</a>`;
      }
      if (hdLink) hdLink.hidden = true;
    } else {
      imageWrap.innerHTML = `<a href="${d.hdurl || d.url}" target="_blank" rel="noreferrer noopener" aria-label="View full resolution: ${d.title}"><img class="apod-img" src="${d.url}" alt="${d.title || 'Astronomy Picture of the Day'}" loading="lazy" /></a>`;
    }
  }

  if (explEl) {
    const { short, full, truncated } = truncate(d.explanation);
    explEl.textContent = short;
    explEl.removeAttribute("aria-busy");

    if (truncated && expandBtn) {
      expandBtn.hidden = false;
      let expanded = false;
      expandBtn.addEventListener("click", () => {
        expanded = !expanded;
        explEl.textContent = expanded ? full : short;
        expandBtn.textContent = expanded ? "Show Less" : "Read More";
      });
    } else if (expandBtn) {
      expandBtn.hidden = true;
    }
  }
}

async function initApod() {
  try {
    const data = await fetchApod();
    renderApod(data);
  } catch (err) {
    console.warn("[apod] Falling back to static image:", err);
    renderApod(APOD_FALLBACK);
  }
}

initApod();
