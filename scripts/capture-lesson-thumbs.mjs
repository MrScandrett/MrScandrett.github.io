// Give every STEAM Lessons catalog tile a real thumbnail: screenshot the lesson's
// opening view and register it in steam-lessons.html's LOCAL_LESSON_THUMBS map.
// Usage: node scripts/capture-lesson-thumbs.mjs [baseUrl] [--dry-run] [lesson-url ...]
// A tile counts as having a thumbnail if it's already in the map or its tile class
// sets a url() background in the catalog CSS. Tiles in DRAWN_ART are left alone
// because their CSS draws real art without an image.
// Writes assets/thumbs/lessons/<name>.webp (640x400).
import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CATALOG = path.join(ROOT, "steam-lessons.html");
const CATALOG_CSS = path.join(ROOT, "assets/css/pages/steam-lessons.css");
const OUT = path.join(ROOT, "assets/thumbs/lessons");
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const positional = args.filter((a) => !a.startsWith("--"));
const base = positional[0]?.startsWith("http") ? positional.shift() : "http://localhost:8080";
const only = positional;

const UTILITY = new Set(["tile", "tile-hero", "tile-coming-soon"]);
const DRAWN_ART = new Set(["go-tile", "fabrication-vr-tile", "fabrication-xr-tile", "ten-eighty-ten-tile"]);
let html = await fs.readFile(CATALOG, "utf8");
const mapMatch = html.match(/var LOCAL_LESSON_THUMBS = \{\n([\s\S]*?)\n(\s*)\};/);
if (!mapMatch) throw new Error("LOCAL_LESSON_THUMBS not found in steam-lessons.html");
const mapped = new Set([...mapMatch[1].matchAll(/'([^']+)':/g)].map((m) => m[1]));

const css = (await fs.readFile(CATALOG_CSS, "utf8")) + (html.match(/<style[\s\S]*?<\/style>/g) || []).join("\n");
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1], m[2]]);
const hasImage = (cls) => rules.some(([sel, body]) => new RegExp(`\\.${cls}(?![\\w-])`).test(sel) && /url\(/.test(body));

const missing = [];
for (const [, cls, attrs, href] of html.matchAll(/<a class="(tile[^"]*)"([^>]*)href="([^"]+)"/g)) {
  const page = href.split("#")[0];
  const custom = cls.split(/\s+/).filter((c) => !UTILITY.has(c));
  if (mapped.has(href) || missing.includes(href) || cls.includes("tile-coming-soon")) continue;
  if (/url\(/.test(attrs) || custom.some((c) => DRAWN_ART.has(c) || hasImage(c))) continue;
  if (!/^lessons\/.+\.html$/.test(page) || !fssync.existsSync(path.join(ROOT, page))) continue;
  if (only.length && !only.includes(href)) continue;
  missing.push(href);
}
console.log(`${missing.length} catalog tiles without a thumbnail`);
if (DRY || !missing.length) { missing.forEach((h) => console.log(" ", h)); process.exit(0); }

const nameFor = (href) => href.replace(/^lessons\//, "").replace(/\.html(#|$)/, "$1").replace(/[\/#]/g, "--");
const cache = path.join(os.homedir(), ".cache/ms-playwright");
const build = (await fs.readdir(cache)).find((d) => /^chromium-\d+$/.test(d));
const browser = await chromium.launch({
  executablePath: path.join(cache, build, "chrome-linux64/chrome"),
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
await fs.mkdir(OUT, { recursive: true });

const added = [];
for (const href of missing) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(new URL("/" + href, base).href, { waitUntil: "load", timeout: 20000 });
    await page.waitForTimeout(Number(process.env.WAIT || 2500));
    const png = await page.screenshot();
    const file = `assets/thumbs/lessons/${nameFor(href)}.webp`;
    // Blurred and darkened so the lesson's own headline doesn't fight the tile's title text.
    await sharp(png).resize(640, 400, { fit: "cover", position: "top" }).blur(6).modulate({ brightness: 0.55 }).webp({ quality: 72 }).toFile(path.join(ROOT, file));
    added.push([href, file]);
    console.log("ok", href);
  } catch (error) {
    console.log("FAIL", href, error.message.split("\n")[0]);
  }
  await page.close();
}
await browser.close();

if (added.length) {
  const indent = mapMatch[2] + "  ";
  const entries = added.map(([href, file]) => `${indent}'${href}': '${file}'`).join(",\n");
  html = html.replace(mapMatch[0], `var LOCAL_LESSON_THUMBS = {\n${mapMatch[1]},\n${entries}\n${mapMatch[2]}};`);
  await fs.writeFile(CATALOG, html);
  console.log(`Added ${added.length} entries to LOCAL_LESSON_THUMBS`);
}
