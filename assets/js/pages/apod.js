const NASA_APOD = "https://science.nasa.gov/wp-json/wp/v2/apod-basic?per_page=7&_fields=date,title,media_type,hdurl,permalink,alt,explanation,credit,copyright";
const NASA_EPIC = "https://epic.gsfc.nasa.gov";
const CLEVELAND_ART_API = "https://openaccess-api.clevelandart.org/api/artworks";
// A fixed set of classroom-friendly landscapes and nature studies.
const ARTWORK_IDS = [169767, 125249, 142734, 171296, 154264];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SOURCE_KEY = "home-picture-source";
const CACHE_PREFIX = "home-picture-v1:";

const FALLBACK = {
  title: "Pale Blue Dot",
  explanation: "Voyager 1 took this portrait of Earth from about 3.7 billion miles away. Look for our planet as a tiny point of light in the sunbeam.",
  url: "assets/thumbs/pale-blue-dot.png",
  date: "1990-02-14",
  credit: "NASA / JPL-Caltech",
  sourceUrl: "https://science.nasa.gov/resource/voyager-1s-pale-blue-dot/",
};

function readStorage(name, key) {
  try { return window[name].getItem(key); } catch { return null; }
}

function writeStorage(name, key, value) {
  try { window[name].setItem(key, value); } catch { /* Storage may be disabled. */ }
}

function calendarDay() {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

function httpsUrl(value, hosts) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && hosts.includes(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

function plainText(html) {
  // Template contents are inert. Render only extracted text, never feed markup.
  const template = document.createElement("template");
  template.innerHTML = String(html ?? "").replace(/<br\s*\/?\s*>/gi, " ");
  return template.content.textContent.replace(/\s+/g, " ").trim();
}

async function getJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Picture feed HTTP ${response.status}`);
  return response.json();
}

async function astronomy(signal) {
  const posts = await getJson(NASA_APOD, signal);
  // On video days show the latest still image with its original date.
  for (const post of posts) {
    if (post.media_type !== "image" || !DATE_PATTERN.test(post.date)) continue;
    const url = httpsUrl(post.hdurl, ["assets.science.nasa.gov", "apod.nasa.gov", "science.nasa.gov"]);
    const sourceUrl = httpsUrl(post.permalink, ["science.nasa.gov"]);
    if (!url || !sourceUrl || !post.title) continue;
    return {
      title: plainText(post.title),
      explanation: plainText(post.explanation).replace(/^Explanation:\s*/i, "").split(/\s+Tomorrow.s picture:/i)[0],
      alt: plainText(post.alt),
      credit: plainText(post.credit || post.copyright) || "NASA Astronomy Picture of the Day",
      date: post.date,
      url,
      sourceUrl,
    };
  }
}

async function earth(signal) {
  const images = await getJson(`${NASA_EPIC}/api/natural`, signal);
  const photo = images.find(item => DATE_PATTERN.test(item.date?.slice(0, 10)) && /^epic_1b_\d+$/.test(item.image));
  if (!photo) return;
  const date = photo.date.slice(0, 10);
  return {
    title: "Earth from Space",
    alt: "The sunlit disk of Earth photographed from space",
    explanation: "NASA’s EPIC camera aboard NOAA’s DSCOVR spacecraft photographed the sunlit side of Earth. Where can you spot clouds, oceans, and land?",
    credit: "NASA EPIC / NOAA DSCOVR",
    date,
    url: `${NASA_EPIC}/archive/natural/${date.replaceAll("-", "/")}/jpg/${photo.image}.jpg`,
    sourceUrl: `${NASA_EPIC}/?date=${date}`,
    contain: true,
  };
}

async function artwork(signal, day) {
  const id = ARTWORK_IDS[(day / MS_PER_DAY) % ARTWORK_IDS.length];
  const { data } = await getJson(`${CLEVELAND_ART_API}/${id}`, signal);
  const imageHosts = ["openaccess-cdn.clevelandart.org"];
  const url = httpsUrl(data?.images?.web?.url, imageHosts);
  const sourceUrl = httpsUrl(data?.url, ["www.clevelandart.org", "clevelandart.org"]);
  if (data?.share_license_status !== "CC0" || !data.title || !url || !sourceUrl) return;
  return {
    title: data.title,
    explanation: [data.technique, data.creation_date].filter(Boolean).join(" · "),
    credit: [data.creators?.[0]?.description, "Cleveland Museum of Art", "CC0"].filter(Boolean).join(" · "),
    url,
    fullUrl: httpsUrl(data.images.print?.url, imageHosts),
    sourceUrl,
    contain: true,
  };
}

const sources = { astronomy, earth, artwork };
const byId = id => document.getElementById(`apod-${id}`);
const select = byId("source");
const status = byId("status");
const date = byId("date");
const imageWrap = byId("image-wrap");
const title = byId("title");
const explanation = byId("explanation");
const credit = byId("copyright");
const imageLink = byId("hd");
const sourceLink = byId("source-link");
const expand = byId("expand");
let activeRequest;

function formatDate(value) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: "long", day: "numeric", year: "numeric",
  }) : "";
}

function showLoading() {
  status.hidden = false;
  status.textContent = "Loading picture…";
  title.textContent = "";
  explanation.textContent = "";
  date.textContent = "";
  credit.textContent = "";
  expand.hidden = imageLink.hidden = sourceLink.hidden = true;
  const skeleton = document.createElement("span");
  skeleton.className = "skeleton apod-img-skeleton";
  imageWrap.replaceChildren(skeleton);
}

function render(picture, message = "", onFailure, onLoad) {
  status.textContent = message;
  status.hidden = !message;
  title.textContent = picture.title;
  date.textContent = formatDate(picture.date);
  credit.textContent = picture.credit;
  imageLink.href = picture.fullUrl || picture.url;
  sourceLink.href = picture.sourceUrl;
  imageLink.hidden = sourceLink.hidden = false;

  const full = picture.explanation;
  const limit = 260;
  const cut = full.lastIndexOf(" ", limit);
  const short = full.length > limit ? full.slice(0, cut > 0 ? cut : limit) + "…" : full;
  explanation.textContent = short;
  expand.hidden = short === full;
  expand.textContent = "Read More";
  expand.setAttribute("aria-expanded", "false");
  expand.onclick = () => {
    const expanded = expand.getAttribute("aria-expanded") === "false";
    expand.setAttribute("aria-expanded", String(expanded));
    expand.textContent = expanded ? "Show Less" : "Read More";
    explanation.textContent = expanded ? full : short;
  };

  const link = document.createElement("a");
  link.href = imageLink.href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  const photo = document.createElement("img");
  photo.className = "apod-img";
  photo.classList.toggle("apod-img--contain", Boolean(picture.contain));
  photo.alt = picture.alt || picture.title;
  if (onFailure) photo.addEventListener("error", onFailure, { once: true });
  if (onLoad) photo.addEventListener("load", onLoad, { once: true });
  photo.src = picture.url;
  link.append(photo);
  imageWrap.replaceChildren(link);
}

async function loadPicture() {
  activeRequest?.abort();
  const request = new AbortController();
  activeRequest = request;
  const source = select.value;
  const cacheKey = CACHE_PREFIX + source;
  const day = calendarDay();
  showLoading();

  const showFallback = () => {
    if (activeRequest !== request) return;
    writeStorage("sessionStorage", cacheKey, "");
    render(FALLBACK, "Source unavailable · Showing an offline picture");
  };

  try {
    const cached = JSON.parse(readStorage("sessionStorage", cacheKey) || "null");
    const picture = cached?.day === day
      ? cached.picture
      : await sources[source](AbortSignal.any([request.signal, AbortSignal.timeout(8000)]), day);
    if (activeRequest !== request) return;
    if (!picture) return showFallback();
    render(picture, "", showFallback, () => {
      if (activeRequest === request) writeStorage("sessionStorage", cacheKey, JSON.stringify({ day, picture }));
    });
  } catch {
    showFallback();
  }
}

const saved = readStorage("localStorage", SOURCE_KEY);
if (Object.hasOwn(sources, saved)) select.value = saved;
select.disabled = false;
select.addEventListener("change", () => {
  writeStorage("localStorage", SOURCE_KEY, select.value);
  loadPicture();
});
loadPicture();
