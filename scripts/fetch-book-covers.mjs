#!/usr/bin/env node
// Cover thumbnails for the library's cover view (library.html).
//
// For each book in the reading room and the NASA room it saves a small WebP
// cover to assets/images/covers/ and records it in data/book-covers.json,
// keyed by the book's link (the same href the shelf and reader use):
//
//   Standard Ebooks edition   → its CC0 cover (public-domain art, typeset by SE)
//   other Project Gutenberg   → Gutenberg's cover image
//   NASA PDF                  → page 1 of the PDF (pdftoppm)
//   NASA web page             → page 1 of the e-book PDF it links, else its og:image
//
// Gutenberg's auto-generated covers (a white title band over a bright geometric
// pattern) are skipped, like books with no cover at all: the page draws a
// typeset cover for those itself.
// Covers already on disk are kept; pass --refresh to fetch them all again.
//
//   npm run build:covers            (or: node scripts/fetch-book-covers.mjs --refresh)
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import sharp from "sharp";
import { gutenbergIdFromUrl } from "../assets/js/book-sources.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(root, "assets/images/covers");
const OUT_JSON = path.join(root, "data/book-covers.json");
const REFRESH = process.argv.includes("--refresh");
const UA = "MrScandrett-ClassroomOS-covers/1.0 (+https://mrscandrett.github.io/library.html)";
const WIDTH = 320;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = promisify(execFile);

// Gutenberg "covers" that are really a pale pattern or an inline illustration.
const SKIP = new Set(["The Canterbury Puzzles", "Among the Pond People"]);
const slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res;
}

async function coverBytes(book, catalog) {
  const gid = gutenbergIdFromUrl(book.href);
  if (gid) {
    const se = catalog[book.href]?.sources.find((s) => s.label === "Standard Ebooks" && s.info);
    if (se) return { bytes: await (await get(se.info + "/downloads/cover-thumbnail.jpg")).arrayBuffer(), credit: "Cover: Standard Ebooks (CC0)" };
    return { bytes: await (await get(`https://www.gutenberg.org/cache/epub/${gid}/pg${gid}.cover.medium.jpg`)).arrayBuffer(), credit: "Cover: Project Gutenberg" };
  }
  if (!/nasa\.gov/.test(new URL(book.href).hostname)) return null;
  if (/\.pdf($|\?)/i.test(book.href)) return pdfCover(book.href);
  const html = await (await get(book.href)).text();
  const doc = new JSDOM(html).window.document;
  const pdf = [...doc.querySelectorAll("a[href]")].map((a) => new URL(a.getAttribute("href"), book.href)).find((u) => /\.pdf$/i.test(u.pathname));
  if (pdf) return pdfCover(pdf.href);
  const og = doc.querySelector('meta[property="og:image"], meta[name="twitter:image"]')?.getAttribute("content");
  if (!og) return null;
  return { bytes: await (await get(new URL(og, book.href).href)).arrayBuffer(), credit: "Image: NASA" };
}

async function pdfCover(url) {
  {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cover-"));
    const pdf = path.join(dir, "book.pdf");
    await fs.writeFile(pdf, Buffer.from(await (await get(url)).arrayBuffer()));
    await run("pdftoppm", ["-f", "1", "-l", "1", "-scale-to", String(WIDTH * 2), "-png", pdf, path.join(dir, "p")]);
    const png = (await fs.readdir(dir)).find((f) => f.endsWith(".png"));
    const bytes = await fs.readFile(path.join(dir, png));
    await fs.rm(dir, { recursive: true, force: true });
    return { bytes, credit: "Cover: NASA" };
  }
}

// Gutenberg's generated covers: the top fifth is near-white (title band) and the
// rest is mostly fully saturated colour. Scanned covers and title pages are neither.
async function isGeneratedCover(bytes) {
  const { data, info } = await sharp(Buffer.from(bytes)).resize(60, 90, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let topWhite = 0, topCount = 0, vivid = 0, lowCount = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (y < info.height * 0.18) { topCount++; if (min > 225) topWhite++; }
      else if (y > info.height * 0.4) { lowCount++; if (max > 150 && max - min > 120) vivid++; }
    }
  }
  return topWhite / topCount > 0.55 && vivid / lowCount > 0.45;
}

const html = await fs.readFile(path.join(root, "library.html"), "utf8");
const doc = new JSDOM(html).window.document;
const catalog = JSON.parse(await fs.readFile(path.join(root, "data/reader-library.json"), "utf8")).books;
let previous = {};
try { previous = JSON.parse(await fs.readFile(OUT_JSON, "utf8")).covers || {}; } catch { /* first run */ }

const books = [...doc.querySelectorAll("#section-classics .book, #section-nasa .book")]
  .map((el) => ({
    href: el.querySelector(".book-popup-cta[href]")?.getAttribute("href"),
    title: el.querySelector(".book-popup-title")?.textContent.trim() || "",
  }))
  .filter((b) => b.href);

const covers = {};
for (const book of books) {
  const name = slug(book.title) + ".webp";
  const file = path.join(OUT_DIR, name);
  const old = previous[book.href];
  if (!REFRESH && old && (await fs.stat(path.join(root, old.src)).catch(() => null))) {
    covers[book.href] = old;
    continue;
  }
  try {
    const got = await coverBytes(book, catalog);
    if (!got) { console.log("  no cover  ", book.title); continue; }
    if (got.credit === "Cover: Project Gutenberg" && (SKIP.has(book.title) || (await isGeneratedCover(got.bytes)))) {
      await fs.rm(file, { force: true });
      console.log("  generated ", book.title, "(typeset cover instead)");
      continue;
    }
    const img = sharp(Buffer.from(got.bytes)).resize({ width: WIDTH, withoutEnlargement: true });
    const { width, height } = await img.webp({ quality: 78 }).toFile(file);
    covers[book.href] = { src: path.relative(root, file), width, height, credit: got.credit };
    console.log("  ok        ", book.title, `${width}×${height}`);
  } catch (err) {
    console.log("  failed    ", book.title, String(err.message || err));
  }
  await sleep(700);
}

await fs.writeFile(OUT_JSON, JSON.stringify({
  note: "Written by scripts/fetch-book-covers.mjs. Cover thumbnails for the library's cover view, keyed by each book's link.",
  covers,
}, null, 1) + "\n");
console.log(`${Object.keys(covers).length} of ${books.length} books have a cover.`);
