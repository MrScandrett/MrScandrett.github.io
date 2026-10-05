// Single source of truth for which remote book files the ClassroomOS Reader may
// open. Imported by reader.html (client-side gate), by the Cloudflare Worker
// proxy in workers/book-proxy/ (server-side gate, bundled by wrangler), and by
// scripts/check-library.mjs. Keep every rule narrow: a path pattern that only
// matches book files, never a whole host.
//
// `cors: true` means the host already sends Access-Control-Allow-Origin, so the
// reader can fetch it directly. Everything else needs the proxy.


// URL of the deployed workers/book-proxy Worker, e.g.
// "https://classroomos-book-proxy.<account>.workers.dev/". Empty = proxy not
// deployed yet: only direct sources open in the reader, and the library keeps
// linking out for the rest.
export const BOOK_PROXY = "https://classroomos-book-proxy.book-proxy.workers.dev/";

export const SOURCES = [
  {
    id: "gutenberg",
    label: "Project Gutenberg",
    host: "www.gutenberg.org",
    path: /^\/(?:cache\/epub\/\d+\/pg\d+(?:-images)?(?:-3)?\.epub|ebooks\/\d+\.epub3?\.(?:images|noimages))$/,
    query: /^$/,
    format: "epub",
    cors: false,
  },
  {
    id: "standard-ebooks",
    label: "Standard Ebooks",
    host: "standardebooks.org",
    path: /^\/ebooks\/[a-z0-9-]+(?:\/[a-z0-9-]+){1,4}\/downloads\/[a-z0-9_-]+\.epub$/,
    query: /^(?:\?source=download)?$/,
    format: "epub",
    cors: true,
    // Rate-limited per IP (429) and blocks Cloudflare Workers (403), so it is
    // always fetched directly; the reader falls back to Gutenberg on failure.
  },
  {
    id: "nasa",
    label: "NASA",
    host: "assets.science.nasa.gov",
    path: /^\/content\/dam\/science\/[A-Za-z0-9_./-]+\.pdf$/,
    query: /^$/,
    format: "pdf",
    cors: true,
  },
  {
    id: "nasa",
    label: "NASA",
    host: "science.nasa.gov",
    path: /^\/wp-content\/uploads\/\d{4}\/\d{2}\/[A-Za-z0-9_.-]+\.pdf$/,
    query: /^$/,
    format: "pdf",
    cors: true,
  },
];

/** Returns the matching SOURCES rule for an https URL, or null. */
export function matchSource(input) {
  let url;
  try {
    url = input instanceof URL ? input : new URL(String(input));
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password) return null;
  return (
    SOURCES.find(
      (rule) => rule.host === url.hostname && rule.path.test(url.pathname) && rule.query.test(url.search)
    ) || null
  );
}

/** Gutenberg catalog page (https://www.gutenberg.org/ebooks/35) → numeric id, or null. */
export function gutenbergIdFromUrl(input) {
  try {
    const url = new URL(String(input));
    if (url.hostname !== "www.gutenberg.org" && url.hostname !== "gutenberg.org") return null;
    const m = url.pathname.match(/^\/ebooks\/(\d+)\/?$/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

/** The EPUB3-with-images file Gutenberg serves for a catalog id. */
export function gutenbergEpubUrl(id) {
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}-images-3.epub`;
}

/** "direct" when the host sends CORS headers, otherwise "proxy". */
export function viaFor(rule) {
  return rule.cors ? "direct" : "proxy";
}
