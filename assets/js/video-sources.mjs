// Single source of truth for which videos the ClassroomOS player may play.
// Imported by the player (assets/js/video-player.mjs, the client-side gate), by
// watch.html's "paste a link" box, and by scripts/check-videos.mjs. Same idea
// as book-sources.mjs: every rule is narrow, and anything that doesn't match
// is refused rather than embedded.
//
// Three kinds of source:
//   youtube  played through youtube-nocookie.com in a sandboxed iframe that the
//            player drives over postMessage; YouTube's own UI is covered.
//   vimeo    player.vimeo.com in a sandboxed iframe (do-not-track on).
//   file     an .mp4/.webm/.ogv file played by a native <video> element, either
//            on this site (assets/videos/) or on an allow-listed archive host.
//
// A parsed source looks like { kind, id, url, start? } where `url` is the
// canonical address (used as the storage key and the "credit" link) and
// `start` is a start time carried in the pasted link (?t=90, #t=1m30s).

// Sandbox for provider iframes. Deliberately missing: allow-popups and
// allow-top-navigation (so the provider's logo, title and "watch on" links can't
// open a tab or navigate the page away) and allow-forms. If a provider ever refuses
// to play sandboxed, this is the one place to change.
export const EMBED_SANDBOX = "allow-scripts allow-same-origin allow-presentation";

export const YOUTUBE_ORIGIN = "https://www.youtube-nocookie.com";
export const VIMEO_ORIGIN = "https://player.vimeo.com";

export const PROVIDERS = {
  youtube: { label: "YouTube", origin: YOUTUBE_ORIGIN },
  vimeo: { label: "Vimeo", origin: VIMEO_ORIGIN },
  file: { label: "Video file", origin: null },
};

// Hosts we play raw video files from. Path patterns only match media files.
export const FILE_HOSTS = [
  {
    id: "wikimedia",
    label: "Wikimedia Commons",
    host: "upload.wikimedia.org",
    path: /^\/wikipedia\/commons\/(?:transcoded\/)?[0-9a-f]\/[0-9a-f]{2}\/[^/?#]+\.(?:webm|ogv|mp4)(?:\/[^/?#]+\.(?:webm|mp4))?$/i,
  },
  {
    id: "nasa-images",
    label: "NASA Image and Video Library",
    host: "images-assets.nasa.gov",
    path: /^\/video\/[^/?#]+\/[^/?#]+\.(?:mp4|webm)$/i,
  },
  {
    id: "nasa-svs",
    label: "NASA Scientific Visualization Studio",
    host: "svs.gsfc.nasa.gov",
    path: /^\/vis\/a0\d{5}\/a\d{6}\/a\d{6}\/[^/?#]+\.(?:mp4|webm)$/i,
  },
  {
    id: "internet-archive",
    label: "Internet Archive",
    host: "archive.org",
    path: /^\/download\/[^/?#]+\/[^?#]+\.(?:mp4|webm|ogv)$/i,
  },
];

// Files that live on this site. Written site-root-relative in the catalog and
// in lessons ("assets/videos/foo.mp4"); the player resolves them against the
// site root, so a lesson at any depth can use the same string.
export const LOCAL_VIDEO = /^\/?assets\/videos\/[A-Za-z0-9_./-]+\.(?:mp4|webm)$/;

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);

/** "90", "90s", "1m30s", "1:30", "01:02:03" → seconds, or null. */
export function parseTime(value) {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  if (/^\d+(?:\.\d+)?s?$/.test(s)) return parseFloat(s);
  const hms = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$/.exec(s);
  if (hms && s) return (+hms[1] || 0) * 3600 + (+hms[2] || 0) * 60 + (+hms[3] || 0);
  if (/^\d+(?::\d{1,2}){1,2}(?:\.\d+)?$/.test(s)) return s.split(":").reduce((t, n) => t * 60 + parseFloat(n), 0);
  return null;
}

/** 83.4 → "1:23", 3725 → "1:02:05". */
export function formatTime(seconds) {
  const t = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

function startFrom(url) {
  const raw = url.searchParams.get("t") ?? url.searchParams.get("start") ?? (/(?:^|&)t=([^&]+)/.exec(url.hash.slice(1)) || [])[1];
  const t = parseTime(raw);
  return t > 0 ? t : undefined;
}

/**
 * Parses a pasted link or catalog `src` into a playable source, or returns
 * null when it isn't on the allow-list. Accepts watch/share/shorts/embed
 * YouTube links, Vimeo page/player links, allow-listed file URLs and
 * "assets/videos/…" paths on this site.
 */
export function parseVideo(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  if (LOCAL_VIDEO.test(raw)) {
    const path = raw.replace(/^\//, "");
    return { kind: "file", id: path, url: path, host: "local", label: "ClassroomOS" };
  }
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  const start = startFrom(url);
  const out = (o) => (start ? { ...o, start } : o);

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return YT_ID.test(id) ? out(youtube(id)) : null;
  }
  if (YT_HOSTS.has(host)) {
    const parts = url.pathname.split("/").filter(Boolean);
    let id = null;
    if (parts[0] === "watch" && parts.length === 1) id = url.searchParams.get("v");
    else if (["embed", "shorts", "live", "v"].includes(parts[0]) && parts.length === 2) id = parts[1];
    return id && YT_ID.test(id) ? out(youtube(id)) : null;
  }
  if (host === "vimeo.com" || host === "www.vimeo.com" || host === "player.vimeo.com") {
    const m = host === "player.vimeo.com"
      ? /^\/video\/(\d{5,12})\/?$/.exec(url.pathname)
      : /^\/(\d{5,12})(?:\/([0-9a-f]{6,20}))?\/?$/.exec(url.pathname);
    if (!m) return null;
    const hash = m[2] || url.searchParams.get("h") || "";
    if (hash && !/^[0-9a-f]{6,20}$/.test(hash)) return null;
    return out({
      kind: "vimeo", id: m[1], hash,
      url: `https://vimeo.com/${m[1]}${hash ? "/" + hash : ""}`, label: PROVIDERS.vimeo.label,
    });
  }
  const rule = FILE_HOSTS.find((r) => r.host === host && r.path.test(url.pathname));
  if (!rule || url.search) return null;
  const clean = `https://${host}${url.pathname}`;
  return out({ kind: "file", id: clean, url: clean, host: rule.id, label: rule.label });
}

function youtube(id) {
  return { kind: "youtube", id, url: `https://www.youtube.com/watch?v=${id}`, label: PROVIDERS.youtube.label };
}

/** Explains why a link was refused, for the paste box and the checker. */
export function whyRefused(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return "Paste a video link.";
  let url;
  try { url = new URL(raw); } catch { return "That isn't a web address."; }
  if (url.protocol !== "https:") return "Only https:// links can be played.";
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be" || YT_HOSTS.has(host)) return "That YouTube link doesn't point at a single video (playlists, channels and search pages can't be embedded).";
  if (host.endsWith("vimeo.com")) return "That Vimeo link doesn't point at a single video.";
  if (FILE_HOSTS.some((r) => r.host === host)) return "That file isn't a video the player accepts (.mp4, .webm or .ogv, no query string).";
  return `${host} isn't on the player's allow-list. Supported: YouTube, Vimeo, Wikimedia Commons, NASA and Internet Archive video files, or a file in assets/videos/.`;
}

/** The iframe address for an embedded provider. `origin` is this page's origin. */
export function embedUrl(source, { origin, captions = true } = {}) {
  if (source.kind === "youtube") {
    const q = new URLSearchParams({
      enablejsapi: "1", controls: "0", disablekb: "1", fs: "0", rel: "0", iv_load_policy: "3",
      playsinline: "1", cc_lang_pref: "en", hl: "en",
    });
    if (captions) q.set("cc_load_policy", "1");
    if (origin) { q.set("origin", origin); q.set("widget_referrer", origin); }
    return `${YOUTUBE_ORIGIN}/embed/${source.id}?${q}`;
  }
  if (source.kind === "vimeo") {
    const q = new URLSearchParams({ dnt: "1", title: "0", byline: "0", portrait: "0", pip: "0", playsinline: "1", api: "1" });
    if (source.hash) q.set("h", source.hash);
    if (captions) q.set("texttrack", "en");
    return `${VIMEO_ORIGIN}/video/${source.id}?${q}`;
  }
  return null;
}
