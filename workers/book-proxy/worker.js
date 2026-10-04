// ClassroomOS book proxy — a Cloudflare Worker that lets reader.html fetch
// allow-listed book files from hosts that don't send CORS headers
// (Project Gutenberg). It stores nothing: each request streams the remote file
// through, with Cloudflare's edge cache absorbing repeat reads.
//
//   GET https://<worker>/?url=<encoded book URL>
//
// Guard rails:
//   - only URLs matching assets/js/book-sources.mjs (same rules the reader uses)
//   - redirects are followed by hand and every hop is re-checked
//   - GET/HEAD/OPTIONS only, no cookies or auth forwarded either way
//   - only the site's own origins get a CORS grant
//   - response size capped
import { matchSource } from "../../assets/js/book-sources.mjs";

const ALLOWED_ORIGINS = [
  /^https:\/\/mrscandrett\.github\.io$/,
  /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/,
];
const MAX_BYTES = 80 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const CACHE_SECONDS = 7 * 24 * 3600;

function corsHeaders(origin) {
  const ok = origin && ALLOWED_ORIGINS.some((re) => re.test(origin));
  return ok
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Expose-Headers": "Content-Length, Content-Type, X-Book-Source",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      }
    : { Vary: "Origin" };
}

function fail(status, message, origin) {
  return new Response(message + "\n", {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method !== "GET" && request.method !== "HEAD") return fail(405, "Method not allowed", origin);
    if (origin && !ALLOWED_ORIGINS.some((re) => re.test(origin))) return fail(403, "Origin not allowed", origin);

    const target = new URL(request.url).searchParams.get("url");
    if (!target) return fail(400, "Missing ?url=", origin);

    let url;
    try {
      url = new URL(target);
    } catch {
      return fail(400, "Bad url", origin);
    }
    let rule = matchSource(url);
    if (!rule) return fail(403, "That file is not on the reader allow-list", origin);

    let upstream;
    for (let hop = 0; ; hop++) {
      upstream = await fetch(url.toString(), {
        method: request.method,
        redirect: "manual",
        headers: { "User-Agent": "ClassroomOS-Reader-Proxy (+https://mrscandrett.github.io/reader.html)" },
        cf: { cacheEverything: true, cacheTtl: CACHE_SECONDS },
      });
      if (upstream.status < 300 || upstream.status >= 400) break;
      const next = upstream.headers.get("Location");
      if (!next || hop >= MAX_REDIRECTS) return fail(502, "Too many redirects", origin);
      url = new URL(next, url);
      rule = matchSource(url);
      if (!rule) return fail(403, "Redirected off the allow-list", origin);
    }

    if (!upstream.ok) return fail(upstream.status === 404 ? 404 : 502, `Upstream returned ${upstream.status}`, origin);
    const length = Number(upstream.headers.get("Content-Length") || 0);
    if (length > MAX_BYTES) return fail(413, "Book file too large", origin);

    const type = rule.format === "pdf" ? "application/pdf" : "application/epub+zip";
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": type,
        ...(length ? { "Content-Length": String(length) } : {}),
        "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
        "X-Book-Source": rule.id,
        "X-Content-Type-Options": "nosniff",
        ...corsHeaders(origin),
      },
    });
  },
};
