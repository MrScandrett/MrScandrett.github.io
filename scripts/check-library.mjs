#!/usr/bin/env node
// Library check-up for recipe-book.html.
//
// For every book on the shelves it confirms the link still resolves, that a
// Gutenberg id points at the title the shelf claims, what the rights status is,
// and whether the ClassroomOS Reader (reader.html) can open it — directly
// (host sends CORS), via the Cloudflare proxy, or not at all.
//
// Writes:
//   data/reader-library.json   catalog reader.html uses to resolve ?src=
//   reports/library-checkup.md human-readable report
//
//   npm run check:library            (network; ~3 min, polite pacing)
//   npm run check:library -- --quick (skip the Standard Ebooks lookup)
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchSource, gutenbergIdFromUrl, gutenbergEpubUrl } from "../assets/js/book-sources.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUICK = process.argv.includes("--quick");
const ORIGIN = "https://mrscandrett.github.io";
const UA = "MrScandrett-ClassroomOS-library-check/1.0 (+https://mrscandrett.github.io/recipe-book.html)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const decode = (s) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&rsquo;|&#8217;/g, "’")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/* ── 1. Read the shelves ─────────────────────────────────────────── */
async function readShelves() {
  const html = await fs.readFile(path.join(root, "recipe-book.html"), "utf8");
  const books = [];
  const sectionRe = /<section[^>]*id="section-([a-z]+)"[\s\S]*?<\/section>/g;
  let sec;
  while ((sec = sectionRe.exec(html))) {
    const room = sec[1];
    for (const chunk of sec[0].split(/<div class="book"/).slice(1)) {
      const pick = (cls) => {
        const m = chunk.match(new RegExp(`<p class="${cls}">([\\s\\S]*?)<\\/p>`));
        return m ? decode(m[1]) : "";
      };
      const href = (chunk.match(/<a class="book-popup-cta"[^>]*href="([^"]+)"/) || [])[1] || null;
      const title = pick("book-popup-title");
      if (title) books.push({ room, title, author: pick("book-popup-author"), href });
    }
  }
  return books;
}

/* ── 2. Network helpers ──────────────────────────────────────────── */
async function probe(url, opts = {}) {
  const first = await probeOnce(url, opts, UA);
  // Some docs sites (help.heavym.net) 403 anything that isn't a browser.
  return first.status === 403 ? probeOnce(url, opts, "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36") : first;
}

async function probeOnce(url, { range = true, method = "GET" } = {}, ua) {
  const headers = { "User-Agent": ua, Origin: ORIGIN };
  if (range && method === "GET") headers.Range = "bytes=0-1023";
  try {
    const res = await fetch(url, { method, headers, redirect: "follow", signal: AbortSignal.timeout(30000) });
    const buf = method === "GET" ? new Uint8Array(await res.arrayBuffer()).slice(0, 8) : new Uint8Array();
    const total =
      Number((res.headers.get("content-range") || "").split("/")[1]) || Number(res.headers.get("content-length")) || null;
    return {
      ok: res.ok,
      status: res.status,
      finalUrl: res.url,
      type: (res.headers.get("content-type") || "").split(";")[0],
      cors: res.headers.get("access-control-allow-origin"),
      bytes: total,
      magic: String.fromCharCode(...buf),
    };
  } catch (err) {
    return { ok: false, status: 0, error: err.name === "TimeoutError" ? "timeout" : err.message };
  }
}

async function getText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
  return { status: res.status, text: res.ok ? await res.text() : "" };
}

const tokens = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !["the", "and", "for", "from", "with"].includes(t))
    .map((t) => (t.length > 4 ? t.replace(/s$/, "") : t));

function titleMatch(expected, found) {
  const want = tokens(expected.split(/[:;]/)[0]);
  const have = new Set(tokens(found));
  if (!want.length) return 1;
  return want.filter((t) => have.has(t)).length / want.length;
}

const surname = (author) => {
  const name = author.split(/\s+—\s+|,\s*edited/)[0].trim();
  const parts = tokens(name);
  return parts[parts.length - 1] || "";
};

/* ── 3. Gutenberg ────────────────────────────────────────────────── */
async function checkGutenberg(book, id) {
  const page = await getText(`https://www.gutenberg.org/ebooks/${id}`);
  const h1 = decode((page.text.match(/<h1[^>]*itemprop="name"[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "");
  const rights = decode((page.text.match(/property="dcterms:rights">([\s\S]*?)<\/td>/) || [])[1] || "");
  await sleep(400);
  const epubUrl = gutenbergEpubUrl(id);
  const epub = await probe(epubUrl, { method: "HEAD" });
  await sleep(400);
  return {
    catalogStatus: page.status,
    catalogTitle: h1,
    titleScore: h1 ? titleMatch(book.title, h1) : 0,
    rights,
    publicDomain: /public domain in the usa/i.test(rights),
    epubUrl,
    epubOk: epub.ok && /epub/.test(epub.type),
    epubBytes: epub.bytes,
    epubCors: epub.cors,
  };
}

/* ── 4. Standard Ebooks (CORS-enabled, CC0) ──────────────────────── */
async function findStandardEbook(book) {
  const query = book.title.split(/[:;]/)[0].replace(/^(the|a|an)\s+/i, "");
  const search = await getText(`https://standardebooks.org/ebooks?query=${encodeURIComponent(query)}`);
  await sleep(500);
  const hrefs = [...new Set([...search.text.matchAll(/href="(\/ebooks\/[a-z0-9-]+\/[a-z0-9-]+(?:\/[a-z0-9-]+)*)"/g)].map((m) => m[1]))];
  const want = surname(book.author);
  let best = null;
  for (const href of hrefs) {
    const [, authorSlug, titleSlug] = href.split("/").slice(1);
    if (!titleSlug || !authorSlug.includes(want)) continue;
    const score = titleMatch(book.title, titleSlug.replace(/-/g, " "));
    const lenGap = Math.abs(tokens(titleSlug.replace(/-/g, " ")).length - tokens(book.title.split(/[:;]/)[0]).length);
    if (score >= 0.75 && lenGap <= 1 && (!best || lenGap < best.lenGap)) best = { href, lenGap };
  }
  if (!best) return null;
  const page = await getText(`https://standardebooks.org${best.href}`);
  await sleep(500);
  const file = (page.text.match(/href="([^"]+\/downloads\/[a-z0-9_-]+\.epub)"/) || [])[1];
  if (!file || /kepub|_advanced/.test(file)) return null;
  const url = `https://standardebooks.org${file}?source=download`;
  const res = await probe(url);
  await sleep(500);
  if (!res.ok || res.magic.slice(0, 2) !== "PK") return null;
  return { url, page: `https://standardebooks.org${best.href}`, cors: res.cors, bytes: res.bytes };
}

/* ── 5. Rights for non-Gutenberg entries ─────────────────────────── */
function rightsFor(book, url) {
  const host = url ? new URL(url).hostname : "";
  if (/nasa\.gov$/.test(host)) return { rights: "U.S. Government work (NASA) — no U.S. copyright", publicDomain: true };
  if (/Asimov/.test(book.author))
    return { rights: "In copyright (Isaac Asimov estate); third-party upload, licence unverified", publicDomain: false };
  if (host === "craphound.com") return { rights: "CC BY-NC-SA, author-hosted", publicDomain: false };
  if (host === "www.galactanet.com") return { rights: "In copyright, author-hosted for free reading", publicDomain: false };
  if (book.room === "manuals") return { rights: "Official documentation (link out)", publicDomain: false };
  if (host === "intra.engr.ucr.edu") return { rights: "Course handout, licence unverified", publicDomain: false };
  return { rights: "—", publicDomain: false };
}

/* ── 6. Run ──────────────────────────────────────────────────────── */
const shelves = await readShelves();
const rows = [];
const catalog = {};

for (const book of shelves) {
  if (!book.href || book.href.startsWith("#") || !/^https?:/.test(book.href)) {
    if (book.href) rows.push({ ...book, status: "internal", reader: "—", notes: "Internal page" });
    continue;
  }
  process.stdout.write(`· ${book.title.slice(0, 60)}\n`);
  const gid = gutenbergIdFromUrl(book.href);
  const row = { ...book, notes: [] };

  if (gid) {
    const g = await checkGutenberg(book, gid);
    Object.assign(row, { status: g.catalogStatus, rights: g.rights || "unknown", publicDomain: g.publicDomain });
    if (g.catalogStatus !== 200) row.notes.push(`catalog page HTTP ${g.catalogStatus}`);
    if (g.titleScore < 0.6) row.notes.push(`⚠ id ${gid} is “${g.catalogTitle}” — check the link`);
    if (!g.epubOk) row.notes.push("no EPUB3 file on Gutenberg");
    const se = QUICK || !g.publicDomain ? null : await findStandardEbook(book);
    const sources = [];
    if (se) sources.push({ url: se.url, label: "Standard Ebooks", via: se.cors ? "direct" : "proxy", info: se.page });
    if (g.epubOk) sources.push({ url: g.epubUrl, label: "Project Gutenberg", via: g.epubCors ? "direct" : "proxy" });
    row.reader = !g.publicDomain ? "not public domain" : sources.length ? sources.map((s) => `${s.label} (${s.via})`).join(" → ") : "no source";
    if (g.publicDomain && sources.length && g.titleScore >= 0.6) {
      catalog[book.href] = { title: book.title, author: book.author.split(" — ")[0], format: "epub", rights: g.rights, home: book.href, sources };
    }
  } else {
    const isPdf = /\.pdf(?:$|\?)/i.test(book.href);
    const res = await probe(book.href, { range: isPdf });
    await sleep(300);
    const r = rightsFor(book, book.href);
    Object.assign(row, { status: res.status || res.error, rights: r.rights, publicDomain: r.publicDomain });
    if (!res.ok) row.notes.push(res.error ? `unreachable (${res.error})` : `HTTP ${res.status}`);
    if (res.ok && res.finalUrl && res.finalUrl.replace(/\/$/, "") !== book.href.replace(/\/$/, "")) row.notes.push(`redirects to ${res.finalUrl}`);
    if (isPdf && res.ok && res.magic.slice(0, 4) !== "%PDF") row.notes.push("response is not a PDF");
    if (isPdf && res.bytes) row.notes.push(`${(res.bytes / 1048576).toFixed(1)} MB`);
    const rule = matchSource(book.href);
    if (isPdf && res.ok && r.publicDomain && rule) {
      const via = res.cors ? "direct" : "proxy";
      row.reader = `${rule.label} PDF (${via})`;
      catalog[book.href] = { title: book.title, author: book.author.replace(/^Source:\s*/, ""), format: "pdf", rights: r.rights, home: book.href, sources: [{ url: book.href, label: rule.label, via }] };
    } else {
      row.reader = isPdf ? (r.publicDomain ? "PDF host not allow-listed" : "link out (rights)") : "link out";
    }
  }
  row.notes = row.notes.join("; ");
  rows.push(row);
}

/* ── 7. Write outputs ────────────────────────────────────────────── */
const generated = new Date().toISOString().slice(0, 10);
await fs.writeFile(
  path.join(root, "data", "reader-library.json"),
  JSON.stringify({ generated, note: "Generated by npm run check:library — do not hand-edit.", books: catalog }, null, 2) + "\n"
);

const inReader = Object.keys(catalog).length;
const direct = Object.values(catalog).filter((b) => b.sources[0].via === "direct").length;
const flagged = rows.filter((r) => /⚠|HTTP [45]|unreachable|not a PDF|no EPUB/.test(r.notes));
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|");
const md = [
  `# Library check-up — ${generated}`,
  "",
  `Generated by \`npm run check:library\` from \`recipe-book.html\`.`,
  "",
  `- **${rows.length}** shelf entries with links checked`,
  `- **${inReader}** open in the ClassroomOS Reader — **${direct}** load directly today, **${inReader - direct}** need the book proxy`,
  `- **${flagged.length}** need attention`,
  "",
  "## Needs attention",
  "",
  flagged.length ? flagged.map((r) => `- **${esc(r.title)}** (${r.room}) — ${esc(r.notes)} — ${r.href}`).join("\n") : "Nothing flagged.",
  "",
  "## Not in the reader for rights reasons",
  "",
  rows
    .filter((r) => r.room === "classics" && !r.publicDomain)
    .map((r) => `- **${esc(r.title)}** — ${esc(r.rights)}`)
    .join("\n"),
  "",
  "## Every entry",
  "",
  "| Room | Title | HTTP | Rights | Reader | Notes |",
  "|---|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.room} | [${esc(r.title)}](${r.href}) | ${esc(r.status)} | ${esc(r.rights)} | ${esc(r.reader)} | ${esc(r.notes)} |`),
  "",
].join("\n");
await fs.mkdir(path.join(root, "reports"), { recursive: true });
await fs.writeFile(path.join(root, "reports", "library-checkup.md"), md);

console.log(`\n${rows.length} entries · ${inReader} in reader (${direct} direct) · ${flagged.length} flagged`);
for (const r of flagged) console.log(`  ⚠ ${r.title}: ${r.notes}`);
