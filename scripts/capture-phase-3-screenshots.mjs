import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const out = path.resolve("screenshots/phase-3");
fs.mkdirSync(out, { recursive: true });

const pages = [
  "lessons/rainbows.html",
  "lessons/water-cycle.html",
  "lessons/seasons-and-the-heavens.html",
  "lessons/event-horizon-telescope.html",
  "lessons/archimedes-principle.html",
];
const themes = ["day", "night", "sakura", "diamond", "emerald", "topaz", "vaporwave"];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(12000);
await page.route(/https?:\/\/(?!localhost:8080).*/, (route) => route.abort());

const results = [];
for (const pagePath of pages) {
  for (const theme of themes) {
    await page.goto(`http://localhost:8080/${pagePath}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.evaluate((nextTheme) => {
      if (window.ClassroomOSThemeLighting) {
        window.ClassroomOSThemeLighting.setTheme(nextTheme);
      } else {
        const lighting = (nextTheme === "night" || nextTheme === "diamond" || nextTheme === "vaporwave") ? "night" : "day";
        document.documentElement.dataset.theme = nextTheme;
        document.documentElement.dataset.lighting = lighting;
        document.documentElement.setAttribute("data-site-theme", nextTheme);
        document.body.dataset.theme = nextTheme;
        document.body.dataset.lighting = lighting;
      }
    }, theme);
    await page.waitForTimeout(350);

    const state = await page.evaluate(() => {
      const bodyStyle = getComputedStyle(document.body);
      return {
        htmlTheme: document.documentElement.dataset.theme || "",
        siteTheme: document.documentElement.getAttribute("data-site-theme") || "",
        bodyTheme: document.body.dataset.theme || "",
        bodyColor: bodyStyle.color,
        bodyBackground: bodyStyle.backgroundColor,
      };
    });

    const name = `${pagePath.replace(/^lessons\//, "").replace(/\.html$/, "")}-${theme}.png`;
    await page.screenshot({ path: path.join(out, name), fullPage: false });
    results.push({ page: pagePath, theme, state, screenshot: `screenshots/phase-3/${name}` });
  }
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
