// Screenshot every showcase app so each card shows the real project, not a stand-in.
// Usage: node scripts/capture-showcase-thumbs.mjs <baseUrl> [slug ...]
// Writes assets/thumbs/showcase/shots/<slug>.webp (960x600).
import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "assets/thumbs/showcase/shots");
const [base = "http://localhost:8080", ...only] = process.argv.slice(2);

// Per-project tweaks. `clip` screenshots one element; `click` gets past a start screen.
// Projects in SKIP keep their hand-made thumbnail because the app can't render a useful
// frame headlessly (Scratch player error, a blank paint canvas, a text-only landing page).
export const SKIP = new Set(["josh-b-beat-jumper-v0-1", "simple-paint-studio", "ayden"]);
const RULES = {
  "luke-d": { click: "#startButton", wait: 4000 },
  "ascii-city": { click: "body", wait: 4000 },
};
const ruleFor = (p) => RULES[p.slug] || (p.category === "3D" ? { clip: "#stl-viewport", hide: "#stl-status" } : {});

const manifest = JSON.parse(await fs.readFile(path.join(ROOT, "apps/manifest.json"), "utf8"));
const projects = (manifest.projects || manifest).filter((p) => !SKIP.has(p.slug) && (!only.length || only.includes(p.slug)));

const cache = path.join(os.homedir(), ".cache/ms-playwright");
const build = (await fs.readdir(cache)).find((d) => /^chromium-\d+$/.test(d));
const browser = await chromium.launch({
  executablePath: path.join(cache, build, "chrome-linux64/chrome"),
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
});
await fs.mkdir(OUT, { recursive: true });

for (const project of projects) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(new URL(project.url.replace(/^\.\//, "/"), base).href, { waitUntil: "load", timeout: 20000 });
    await page.waitForTimeout(Number(process.env.WAIT || 3500));
    const rule = ruleFor(project);
    if (rule.click) {
      await page.click(rule.click, { position: rule.click === "body" ? { x: 640, y: 400 } : undefined }).catch(() => {});
      await page.waitForTimeout(rule.wait || 2000);
    }
    if (rule.hide) await page.addStyleTag({ content: `${rule.hide} { display: none !important; }` });
    const target = rule.clip ? page.locator(rule.clip) : page;
    const png = await target.screenshot();
    await sharp(png).resize(960, 600, { fit: "cover", position: "top" }).webp({ quality: 78 }).toFile(path.join(OUT, `${project.slug}.webp`));
    console.log("ok", project.slug);
  } catch (error) {
    console.log("FAIL", project.slug, error.message.split("\n")[0]);
  }
  await page.close();
}
await browser.close();
