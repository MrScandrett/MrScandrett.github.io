// Timeline visual audit: renders a fixed set of timelines in Track view (inline
// desktop, projector full screen, phone; Day and Night) through the real engine,
// screenshots each one and measures what a student actually sees:
//
//   events    — events shown on the track
//   compact   — events too crowded to label (a bare dot on the axis)
//   cut       — labelled events whose label is cut off ("…" or CSS ellipsis)
//   lanes     — label rows stacked above the axis
//   dotHits   — neighbouring compact dots closer than 10px (they smear together)
//   overlaps  — labels that overlap another label (should always be 0)
//   ticks     — date labels visible on the axis
//   trackPct  — track height as a share of the window
//   datePx / labelPx — rendered font sizes of mark dates and labels
//   bandCut   — era band labels hidden for lack of room or cut off at the view's edge
//   unusedPct — full screen only: share of the screen holding nothing
//   searchBg  — the search field paints an opaque background (main.css overriding .tl-search)
//   minor / grid — unlabelled minor ticks and vertical gridlines drawn in view
//   stripes   — Deep time: shaded powers-of-ten stripes in view
//   spans     — range events drawn as a span on the axis (bars    = old bars inside the label)
//   hues      — distinct colours among the era band labels on screen
//   bandLost  — era bands on screen (at least 60px of them) whose label is not
//   cursor    — the date shown where the selected event's reading line meets the axis
//   tickHits  — axis labels (ticks, the cursor's date) that overlap each other
//   zero      — the BC|AD line is drawn (True scale across year 0)
//
// Usage: node scripts/audit-timeline-visual.mjs [--case=hopper,ages] [--size=desktop,phone]
//        [--theme=day,night] [--out=tmp/dir] [--save-baseline]
// Report: tmp/timeline-audit/report.json and one PNG per case. Pass --save-baseline to
// record docs/timeline-audit-baseline.json, which later runs are compared against.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import { findChromium } from "../lib/find-chromium.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const argValue = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=")[1];
const pick = (name, all) => {
  const wanted = argValue(name)?.split(",");
  return wanted ? all.filter((item) => wanted.includes(item.name || item)) : all;
};
const OUT = path.resolve(ROOT, argValue("out") || "tmp/timeline-audit");
const BASELINE = path.join(ROOT, "docs/timeline-audit-baseline.json");

// title picks one timeline on pages that have several; era zooms to the first era matching it
// (labels stuck at the edges only show up zoomed in); sizes limits a case to some sizes.
const CASES = pick("case", [
  { name: "hopper", path: "lessons/computer-science/pioneers/grace-hopper.html" },
  { name: "bach", path: "lessons/music/bach.html" },
  { name: "jeremiah", path: "lessons/bible-studies/jeremiah.html" },
  { name: "ages", path: "lessons/humanities/the-ages.html", title: "story so far" },
  { name: "python", path: "lessons/computer-science/foundations/python-foundations.html", title: "python" },
  { name: "bible", path: "lessons/bible-studies/bible-foundations-pathway.html", title: "scholars" },
  { name: "ages-bronze", path: "lessons/humanities/the-ages.html", title: "story so far", era: "bronze", sizes: ["desktop", "phone"] },
]);
const SIZES = pick("size", [
  { name: "desktop", viewport: { width: 1280, height: 900 } },
  { name: "projector", viewport: { width: 1920, height: 1080 }, full: true },
  { name: "phone", viewport: { width: 390, height: 844 }, mobile: true },
]);
const THEMES = pick("theme", ["day", "night"]);
const METRICS = ["events", "compact", "cut", "lanes", "dotHits", "overlaps", "ticks", "trackPct", "datePx", "labelPx", "bandCut", "unusedPct", "searchBg",
  "minor", "grid", "stripes", "spans", "bars", "hues", "bandLost", "cursor", "tickHits", "zero"];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const jobs = [];
for (const c of CASES) for (const size of SIZES) for (const theme of THEMES) {
  if (!c.sizes || c.sizes.includes(size.name)) jobs.push({ c, size, theme });
}

const server = await startServer();
const browser = await chromium.launch({ headless: true, executablePath: findChromium() });
const results = [];
let next = 0;
await Promise.all(Array.from({ length: Number(argValue("jobs") || 4) }, async () => {
  while (next < jobs.length) {
    const job = jobs[next++];
    const id = `${job.c.name}-${job.size.name}-${job.theme}`;
    try {
      results.push({ id, ...(await audit(job, id)) });
    } catch (error) {
      results.push({ id, error: String(error?.message || error).split("\n")[0] });
    }
    process.stdout.write(`[${results.length}/${jobs.length}] ${id}\n`);
  }
}));
await browser.close();
server.instance.close();

results.sort((a, b) => jobs.findIndex((j) => id(j) === a.id) - jobs.findIndex((j) => id(j) === b.id));
fs.writeFileSync(path.join(OUT, "report.json"), `${JSON.stringify(results, null, 2)}\n`);
const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")) : null;
printTable(results, baseline && !process.argv.includes("--save-baseline") ? new Map(baseline.map((r) => [r.id, r])) : null);
if (process.argv.includes("--save-baseline")) {
  fs.writeFileSync(BASELINE, `${JSON.stringify(results.map(({ shot, ...rest }) => rest), null, 2)}\n`);
  console.log(`\nBaseline saved: ${path.relative(ROOT, BASELINE)}`);
}
console.log(`\nScreenshots and report: ${path.relative(ROOT, OUT)}/`);

function id(job) { return `${job.c.name}-${job.size.name}-${job.theme}`; }

async function audit({ c, size, theme }, name) {
  const context = await browser.newContext({
    viewport: size.viewport,
    isMobile: !!size.mobile,
    hasTouch: !!size.mobile,
    deviceScaleFactor: size.mobile ? 2 : 1,
    colorScheme: theme === "night" ? "dark" : "light",
    reducedMotion: "reduce", // no flights mid-measure, no pulsing dots in screenshots
  });
  await context.addInitScript((phase) => {
    try {
      localStorage.setItem("classroomos-lighting-mode", "manual");
      localStorage.setItem("classroomos-lighting-phase", phase);
      localStorage.setItem("classroomos:timeline:v1", JSON.stringify({ view: "track" }));
    } catch (error) { /* storage blocked */ }
  }, theme);
  const page = await context.newPage();
  try {
    await page.goto(`${server.origin}/${c.path}`, { waitUntil: "load" });
    await page.waitForFunction(() => window.ClassroomOSTimeline && ClassroomOSTimeline.instances.length, null, { timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    const found = await page.evaluate(({ title, full, era }) => {
      const re = title ? new RegExp(title, "i") : null;
      const t = ClassroomOSTimeline.instances.find((x) => !re || re.test(x.opts.title));
      if (!t) return false;
      window.__auditTimeline = t;
      t.setView("track", { save: false });
      if (full) t.setPseudoFull(true);
      else {
        t.root.style.scrollMarginTop = "110px"; // clear the lesson's sticky header
        t.root.scrollIntoView({ block: "start", behavior: "instant" }); // some lessons scroll smoothly
        t.root.style.scrollMarginTop = "";
      }
      t.fit();
      if (era) t.zoomToEra(t.eras.find((e) => new RegExp(era, "i").test(e.label)));
      return true;
    }, { title: c.title || "", full: !!size.full, era: c.era || "" });
    if (!found) throw new Error(`no timeline${c.title ? ` titled /${c.title}/` : ""}`);
    // A font weight the track uses first can start loading now; the engine re-measures when it lands.
    await page.waitForTimeout(400);
    await page.evaluate(() => document.fonts.ready.then(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))));

    const metrics = await page.evaluate(measure);
    const shot = path.join(OUT, `${name}.png`);
    // What's on screen from the timeline's top down. (Element screenshots of a timeline taller
    // than the window come out blank in lessons that scroll inside their own container.)
    const clip = size.full ? null : await page.evaluate(() => {
      const r = window.__auditTimeline.root.getBoundingClientRect();
      const top = Math.max(0, r.top);
      return { x: 0, y: top, width: window.innerWidth, height: Math.min(r.bottom, window.innerHeight) - top };
    });
    await page.screenshot(clip && clip.height > 0 ? { path: shot, clip } : { path: shot });
    return { ...metrics, shot: path.relative(ROOT, shot) };
  } finally {
    await context.close();
  }
}

// Runs in the page against window.__auditTimeline.
function measure() {
  const t = window.__auditTimeline;
  const root = t.root;
  const vp = t.viewport;
  const vpRect = vp.getBoundingClientRect();
  const shown = t.events.filter((it) => !it.mark.hidden);
  const marks = shown.map((it) => it.mark);
  const labelled = marks.filter((m) => !m.classList.contains("tl-compact"));
  const compact = marks.filter((m) => m.classList.contains("tl-compact"));
  const round = (n) => Math.round(n * 10) / 10;

  // Cut sideways (ellipsis: the text is wider than its box, measured exactly since scrollWidth
  // rounds), at the end of a wrapped line (line clamp), or shortened with "…".
  const textWidth = (node) => { const r = document.createRange(); r.selectNodeContents(node); return r.getBoundingClientRect().width; };
  const clipped = (node) => node && (textWidth(node) > node.getBoundingClientRect().width + 0.25 || node.scrollHeight > node.clientHeight + 1 || /…$/.test(node.textContent.trim()));
  const cut = labelled.filter((m) => clipped(m.querySelector(".tl-mark-label")) || clipped(m.querySelector(".tl-mark-date"))).length;
  const lanes = new Set(labelled.map((m) => m.style.top)).size;

  const xs = compact.map((m) => m.getBoundingClientRect()).map((r) => r.left + r.width / 2).sort((a, b) => a - b);
  let dotHits = 0;
  for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] < 10) dotHits++;

  const rects = labelled.map((m) => m.getBoundingClientRect());
  let overlaps = 0;
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlaps++;
    }
  }

  const fontPx = (selector) => {
    const node = root.querySelector(`.tl-mark:not(.tl-compact):not(.tl-major) ${selector}`); // headline marks are larger on purpose
    return node ? parseFloat(getComputedStyle(node).fontSize) : null;
  };

  const bandLabels = t.eras.filter((era) => era.band && !era.band.hidden).map((era) => era.band.firstChild);
  const bandCut = bandLabels.filter((label) => {
    if (label.hidden) return true;
    const r = label.getBoundingClientRect();
    const onScreen = r.right > vpRect.left && r.left < vpRect.right;
    return onScreen && (r.left < vpRect.left - 1 || r.right > vpRect.right + 1);
  }).length;

  // Full screen: what's left after the toolbar, the card and the track's content (from its
  // highest label or band down to the axis labels). Empty track box counts as unused.
  let unusedPct = null;
  if (root.classList.contains("tl-is-full")) {
    const height = (selector) => root.querySelector(selector)?.getBoundingClientRect().height || 0;
    const tops = [...labelled, ...bandLabels.filter((label) => !label.hidden)].map((node) => node.getBoundingClientRect().top);
    const axisBottom = t.canvas.getBoundingClientRect().top + parseFloat(t.canvas.style.getPropertyValue("--axis-y")) + 30;
    const content = Math.max(0, axisBottom - Math.min(axisBottom - 40, ...tops));
    unusedPct = round(Math.max(0, 1 - (height(".tl-bar") + height(".tl-detail") + content) / root.clientHeight) * 100);
  }

  const search = root.querySelector(".tl-search");
  let searchBg = null;
  if (search) {
    const m = getComputedStyle(search).backgroundColor.match(/rgba?\(([^)]+)\)/);
    const parts = m ? m[1].split(/[,\s/]+/).filter(Boolean) : [];
    searchBg = parts.length === 4 ? parseFloat(parts[3]) > 0.05 : parts.length === 3;
  }

  return {
    title: t.opts.title || "",
    events: shown.length,
    compact: compact.length,
    cut,
    lanes,
    dotHits,
    overlaps,
    ticks: root.querySelectorAll(".tl-tick").length,
    trackPct: round(vpRect.height / window.innerHeight * 100),
    datePx: fontPx(".tl-mark-date"),
    labelPx: fontPx(".tl-mark-label"),
    bandCut,
    unusedPct,
    searchBg,
    ...phase2(),
  };

  // Axis context: gridlines, stripes, spans, band colours, the reading cursor.
  function phase2() {
    const inView = (node) => {
      if (node.hidden || node.closest("[hidden]") || getComputedStyle(node).visibility === "hidden") return false;
      const r = node.getBoundingClientRect();
      return r.width + r.height > 0 && r.right > vpRect.left && r.left < vpRect.right;
    };
    const count = (selector) => [...root.querySelectorAll(selector)].filter(inView).length;
    const hues = new Set(bandLabels.filter((l) => !l.hidden && inView(l)).map((l) => getComputedStyle(l).borderLeftColor));
    const cursorDate = root.querySelector(".tl-cursor-date");
    const cursor = cursorDate && inView(cursorDate) ? cursorDate.textContent.trim() : null;
    const axisLabels = [...root.querySelectorAll(".tl-tick, .tl-cursor-date")].filter((n) => inView(n) && n.textContent.trim())
      .map((n) => n.getBoundingClientRect());
    let tickHits = 0;
    for (let i = 0; i < axisLabels.length; i++) {
      for (let j = i + 1; j < axisLabels.length; j++) {
        const a = axisLabels[i], b = axisLabels[j];
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) tickHits++;
      }
    }
    return {
      minor: count(".tl-minor"),
      grid: count(".tl-gridline"),
      stripes: count(".tl-decade"),
      spans: count(".tl-span"),
      bars: count(".tl-range"),
      hues: hues.size,
      bandLost: t.eras.filter((era) => {
        if (!era.band || era.band.hidden) return false;
        const r = era.band.getBoundingClientRect();
        const shown = Math.min(r.right, vpRect.right) - Math.max(r.left, vpRect.left);
        return shown >= 60 && !inView(era.band.firstChild);
      }).length,
      cursor,
      tickHits,
      zero: count(".tl-gridline.tl-zero") > 0,
    };
  }
}

function printTable(rows, before) {
  const cols = ["id", ...METRICS];
  const cell = (row, key) => {
    if (row.error) return key === "id" ? row.id : key === "events" ? `ERROR: ${row.error}` : "";
    const value = row[key];
    const text = value == null ? "–" : String(value);
    const old = before?.get(row.id)?.[key];
    if (key === "id" || old == null || old === value) return text;
    return `${text} (${old})`;
  };
  const table = rows.map((row) => cols.map((key) => cell(row, key)));
  const widths = cols.map((key, i) => Math.max(key.length, ...table.map((r) => r[i].length)));
  const line = (cells) => cells.map((text, i) => text.padEnd(widths[i])).join("  ");
  console.log(`\n${line(cols)}`);
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  table.forEach((r) => console.log(line(r)));
  if (before) console.log("\n(n) = baseline value, shown where it changed");
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
