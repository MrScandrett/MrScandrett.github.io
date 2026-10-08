// Print-layout audit: prints every lesson to a real PDF (the same Chromium print
// path as the lesson's Print / Save PDF button) and inspects the paper result:
//
//   ink    — share of each page covered by ink (dark fills waste toner/ink)
//   blank  — pages with (almost) nothing on them
//   gap    — pages that stop well short of the bottom because the next block was
//            pushed over by break-inside: avoid
//   runt   — a last page holding only a line or two
//   heading— a heading stranded as the last thing on a page
//   split  — a text block broken so 1–2 lines sit alone on one side of the break
//
//   shrink — something wider than the paper, so Chrome shrinks every page to fit
//
// Usage: node scripts/audit-print-layout.mjs [--lesson=a,b] [--jobs=4] [--keep-pdf]
//        [--theme=night] [--out=tmp/dir]
// Report: tmp/print-layout-audit/report.json (+ summary on stdout)

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { findChromium } from "../lib/find-chromium.mjs";

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.resolve(ROOT, process.argv.find((value) => value.startsWith("--out="))?.split("=")[1] || "tmp/print-layout-audit");
const argValue = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=")[1];
const keepPdf = process.argv.includes("--keep-pdf");
const jobs = Number(argValue("jobs") || 4);
const DPI = 24;

// Thresholds (fractions of a letter page).
const INK_PAGE = 0.22;       // a page more than 22% inked is heavy
const INK_DOC = 0.12;        // a document averaging >12% ink is heavy overall
const GAP_FILL = 0.55;       // a mid-document page ending above 55% of its height
const RUNT_FILL = 0.12;      // a last page with content in only its top 12%

let lessons = walk(path.join(ROOT, "lessons")).filter((file) => file.endsWith(".html"));
const only = argValue("lesson");
if (only) {
  const wanted = only.split(",");
  lessons = lessons.filter((file) => wanted.some((w) => file.includes(w)));
}
lessons = lessons.map((file) => path.relative(ROOT, file)).sort();

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "pdf"), { recursive: true });
fs.mkdirSync(path.join(OUT, "png"), { recursive: true });

const server = await startServer();
const browser = await chromium.launch({ headless: true, executablePath: findChromium() });
const results = [];
let next = 0;

await Promise.all(Array.from({ length: jobs }, async () => {
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  // --theme=night: print as a visitor who picked a dark site theme.
  const theme = argValue("theme");
  if (theme) {
    await context.addInitScript((value) => {
      localStorage.setItem("classroomos-lighting-mode", "manual");
      localStorage.setItem("classroomos-lighting-phase", value);
    }, theme);
  }
  while (next < lessons.length) {
    const url = lessons[next++];
    const page = await context.newPage();
    try {
      results.push(await auditLesson(page, url));
    } catch (error) {
      results.push({ url, error: String(error?.message || error).split("\n")[0] });
    } finally {
      await page.close().catch(() => {});
    }
    process.stdout.write(`[${results.length}/${lessons.length}] ${url}\n`);
  }
  await context.close();
}));

await browser.close();
server.instance.close();

results.sort((a, b) => a.url.localeCompare(b.url));
const flagged = results.filter((r) => r.error || r.issues?.length);
const counts = {};
for (const r of results) for (const issue of r.issues || []) counts[issue.type] = (counts[issue.type] || 0) + 1;
const summary = {
  lessons: results.length,
  errors: results.filter((r) => r.error).length,
  flaggedLessons: flagged.length,
  issueCounts: counts,
  totalPages: results.reduce((sum, r) => sum + (r.pages || 0), 0),
};
fs.writeFileSync(path.join(OUT, "report.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));

async function auditLesson(page, url) {
  const slug = url.replace(/^lessons\//, "").replace(/\.html$/, "").replaceAll("/", "__");
  const t0 = Date.now();
  await page.goto(`${server.origin}/${url}`, { waitUntil: "load", timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(900);
  // Freeze animation loops: the printout is a still frame, and dozens of running
  // sims make the audit CPU-bound.
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
    const top = setTimeout(() => {}, 0);
    for (let id = 0; id <= top; id += 1) { clearInterval(id); }
  });
  const tLoad = Date.now();
  // Chrome loads lazy images when a person prints; page.pdf() does not, so force it.
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = "eager"; });
    await Promise.race([
      Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })))),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
  });
  // page.pdf() skips the beforeprint event a real print fires; lessons plan page
  // breaks in it. After that the page goes from screen to print media exactly
  // once, as in a real print (toggling media back and forth restarts CSS
  // transitions such as scroll fade-ins and prints them mid-fade).
  if (!process.env.AUDIT_NO_BEFOREPRINT) await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));

  // Measured inside the print layout page.pdf() builds:
  //  - layout width: anything wider than the paper makes Chrome lay the page out
  //    wider and shrink every page to fit
  //  - heading texts, so a heading stranded at the foot of a page can be found
  //  - the biggest dark-filled boxes, so heavy-ink pages trace back to selectors
  await page.evaluate(() => {
    const name = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${[...el.classList].slice(0, 2).map((c) => `.${c}`).join("")}`;
    const lum = (rgb) => {
      const m = rgb.match(/[\d.]+/g);
      if (!m || (m[3] !== undefined && Number(m[3]) < 0.5)) return null;
      return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
    };
    const query = matchMedia("print");
    window.__printLayout = null;
    query.addEventListener("change", () => {
      if (!query.matches || window.__printLayout) return;
      const all = [...document.body.querySelectorAll("*")];
      const over = all.filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.right > 696 && !(el.closest("svg") && el.tagName !== "svg");
      });
      const headings = [...document.querySelectorAll("h1,h2,h3,h4")]
        .filter((h) => h.getClientRects().length && getComputedStyle(h).visibility !== "hidden")
        .map((h) => h.textContent.replace(/\s+/g, " ").trim())
        .filter((t) => t.length > 2);
      const darkBoxes = [];
      for (const el of all) {
        if (["IMG", "CANVAS", "VIDEO"].includes(el.tagName)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width * rect.height < 20000) continue;
        const style = getComputedStyle(el);
        const l = lum(style.backgroundColor);
        const gradient = /gradient/.test(style.backgroundImage);
        if ((l !== null && l < 0.55) || (gradient && /rgb\((?:[0-9]{1,2}|1[0-3][0-9]), /.test(style.backgroundImage))) {
          darkBoxes.push({ el: name(el), area: Math.round(rect.width * rect.height), bg: gradient ? style.backgroundImage.slice(0, 80) : style.backgroundColor });
        }
      }
      window.__printLayout = {
        width: document.documentElement.clientWidth,
        roots: over.filter((el) => !over.includes(el.parentElement)).slice(0, 4).map(name),
        headings,
        darkBoxes: darkBoxes.sort((x, y) => y.area - x.area).slice(0, 6),
      };
    });
  });
  const pdf = path.join(OUT, "pdf", `${slug}.pdf`);
  await page.pdf({ path: pdf, format: "Letter", printBackground: true, preferCSSPageSize: true, timeout: 60_000 });
  const layout = await page.evaluate(() => window.__printLayout) || { width: 694, roots: [], headings: [], darkBoxes: [] };
  const wide = { scale: Math.min(1, 694 / layout.width), elements: layout.roots };
  const { headings, darkBoxes } = layout;

  const tPdf = Date.now();
  const raster = await rasterize(pdf, slug);
  const text = await textLayout(pdf);
  const issues = [];
  const n = raster.length;

  raster.forEach((p, i) => {
    const num = i + 1;
    if (p.ink > INK_PAGE) issues.push({ type: "ink", page: num, detail: `${pct(p.ink)} of page inked` });
    if (p.bottom < 0.06) issues.push({ type: "blank", page: num, detail: "page is empty" });
    else if (i === n - 1 && n > 1 && p.bottom < RUNT_FILL) issues.push({ type: "runt", page: num, detail: `last page used to ${pct(p.bottom)} of its height` });
    else if (i < n - 1 && p.bottom < GAP_FILL) issues.push({ type: "gap", page: num, detail: `content stops at ${pct(p.bottom)} of the page; next block pushed to p${num + 1}` });
  });
  if (wide.scale < 0.98) issues.push({ type: "shrink", detail: `printout shrunk to ~${pct(wide.scale)} by ${wide.elements.join(", ")}` });
  const docInk = raster.reduce((s, p) => s + p.ink, 0) / Math.max(1, n);
  if (docInk > INK_DOC) issues.push({ type: "ink-doc", detail: `average ${pct(docInk)} ink per page` });

  const headingSet = new Set(headings.map(norm));
  text.forEach((lines, i) => {
    if (i === text.length - 1 || !lines.length) return;
    const last = lines[lines.length - 1];
    if (headingSet.has(norm(last.text)) && last.yMax < 0.95) {
      issues.push({ type: "heading", page: i + 1, detail: `"${last.text.slice(0, 60)}" is the last line on the page` });
    }
    // A paragraph cut so only one line ends up on one side of the break.
    const nextLines = text[i + 1];
    if (!nextLines?.length) return;
    const tail = runLength(lines, -1);
    const head = runLength(nextLines, 1);
    const continues = !/[.!?:;"”)\]]$/.test(last.text) && /^[a-z(,;–—-]/.test(nextLines[0].text);
    if (continues && (tail === 1 || head === 1)) {
      issues.push({ type: "split", page: i + 1, detail: `"…${last.text.slice(-40)}" / "${nextLines[0].text.slice(0, 40)}…" (${tail} line(s) before the break, ${head} after)` });
    }
  });

  if (!keepPdf) fs.rmSync(pdf);
  if (process.env.AUDIT_TIMING) console.log(url, { load: tLoad - t0, pdf: tPdf - tLoad, analyse: Date.now() - tPdf });
  return { url, pages: n, ink: Number(docInk.toFixed(3)), issues, darkBoxes: issues.some((x) => x.type.startsWith("ink")) ? darkBoxes : undefined };
}

async function rasterize(pdf, slug) {
  const prefix = path.join(OUT, "png", slug);
  await run("pdftoppm", ["-r", String(DPI), "-gray", pdf, prefix], { maxBuffer: 1 << 26 });
  const files = fs.readdirSync(path.join(OUT, "png")).filter((f) => f.startsWith(`${slug}-`) && f.endsWith(".pgm")).sort();
  return files.map((file) => {
    const full = path.join(OUT, "png", file);
    const { width, height, data } = readPgm(full);
    fs.rmSync(full);
    let ink = 0;
    let bottom = 0;
    for (let y = 0; y < height; y += 1) {
      let rowInk = 0;
      for (let x = 0; x < width; x += 1) rowInk += 255 - data[y * width + x];
      ink += rowInk;
      if (rowInk / width > 3) bottom = y + 1;
    }
    return { ink: ink / (width * height * 255), bottom: bottom / height };
  });
}

function readPgm(file) {
  const buf = fs.readFileSync(file);
  let offset = 0;
  const fields = [];
  while (fields.length < 4) {
    while (/\s/.test(String.fromCharCode(buf[offset]))) offset += 1;
    let start = offset;
    while (!/\s/.test(String.fromCharCode(buf[offset]))) offset += 1;
    fields.push(buf.toString("ascii", start, offset));
  }
  offset += 1;
  return { width: Number(fields[1]), height: Number(fields[2]), data: buf.subarray(offset) };
}

// Per page: text lines with their block id and vertical position (0..1).
async function textLayout(pdf) {
  const { stdout } = await run("pdftotext", ["-bbox-layout", pdf, "-"], { maxBuffer: 1 << 28 });
  const pages = [];
  for (const pageXml of stdout.split(/<page /).slice(1)) {
    const height = Number(/height="([\d.]+)"/.exec(pageXml)?.[1] || 792);
    const lines = [];
    let block = 0;
    for (const blockXml of pageXml.split(/<block /).slice(1)) {
      block += 1;
      for (const lineXml of blockXml.split(/<line /).slice(1)) {
        const box = /xMin="([\d.]+)" yMin="([\d.]+)" xMax="[\d.]+" yMax="([\d.]+)"/.exec(lineXml);
        const words = [...lineXml.matchAll(/<word [^>]*>([^<]*)<\/word>/g)];
        if (!box || !words.length) continue;
        lines.push({
          block,
          text: decode(words.map((w) => w[1]).join(" ")),
          xMin: Number(box[1]) / 612,
          yMin: Number(box[2]) / height,
          yMax: Number(box[3]) / height,
        });
      }
    }
    pages.push(lines);
  }
  return pages;
}

// Lines in the same paragraph as the page's last (dir -1) or first (dir 1) line:
// consecutive lines, same left edge, no taller-than-usual gap between them.
function runLength(lines, dir) {
  const ordered = dir < 0 ? [...lines].reverse() : lines;
  let count = 1;
  for (let k = 1; k < ordered.length; k += 1) {
    const [upper, lower] = dir < 0 ? [ordered[k], ordered[k - 1]] : [ordered[k - 1], ordered[k]];
    const lineHeight = upper.yMax - upper.yMin;
    const gap = lower.yMin - upper.yMax;
    if (gap < -0.002 || gap > lineHeight * 0.7 || Math.abs(upper.xMin - lower.xMin) > 0.03) break;
    count += 1;
  }
  return count;
}

function decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function norm(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function pct(x) { return `${Math.round(x * 100)}%`; }

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

async function startServer() {
  const mime = {
    ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
    ".woff2": "font/woff2", ".vtt": "text/vtt", ".glb": "model/gltf-binary",
  };
  const instance = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const filename = path.resolve(ROOT, pathname === "/" ? "index.html" : pathname.replace(/^\/+/, ""));
    if (!filename.startsWith(`${ROOT}${path.sep}`)) return response.writeHead(403).end();
    fs.stat(filename, (error, stat) => {
      const target = !error && stat.isDirectory() ? path.join(filename, "index.html") : filename;
      fs.readFile(target, (readError, data) => {
        if (readError) return response.writeHead(404).end();
        response.writeHead(200, { "Content-Type": mime[path.extname(target).toLowerCase()] || "application/octet-stream" });
        response.end(data);
      });
    });
  });
  await new Promise((resolve) => instance.listen(0, "127.0.0.1", resolve));
  return { instance, origin: `http://127.0.0.1:${instance.address().port}` };
}
