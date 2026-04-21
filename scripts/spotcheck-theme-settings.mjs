import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const out = path.resolve("screenshots/phase-2-spotcheck");
fs.mkdirSync(out, { recursive: true });

const themeJs = fs.readFileSync(path.join(root, "assets/js/theme-lighting.js"), "utf8");

const themeCss = `
*{box-sizing:border-box}html,body{margin:0;min-height:100%}
body{background:var(--page-wash),var(--bg);color:var(--text);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.6}
.site-header{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem 1.5rem;background:var(--header-bg);border-bottom:1px solid var(--header-border);color:var(--nav-ink-strong)}
.brand,.site-nav a{color:var(--nav-ink-strong);text-decoration:none}.site-nav ul{display:flex;align-items:center;gap:.8rem;margin:0;padding:0;list-style:none}
.nav-settings{position:relative}.nav-settings-toggle,.nav-theme-chip,.nav-mode-pill,.nav-tone-pill{border:1px solid var(--line);border-radius:8px;background:var(--surface-1);color:var(--text);padding:.55rem .7rem;font:inherit;cursor:pointer}
.nav-settings-panel{position:absolute;right:0;top:calc(100% + .5rem);width:min(360px,calc(100vw - 2rem));padding:1rem;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;box-shadow:var(--shadow,0 18px 36px rgba(0,0,0,.18));color:var(--text)}
.nav-settings-panel[hidden]{display:none}.nav-settings-mode,.nav-tone-rail,.nav-theme-grid{display:flex;flex-wrap:wrap;gap:.5rem}.nav-theme-chip.is-active{outline:2px solid var(--theme-accent);outline-offset:2px}
main{padding:3rem 1.5rem;display:grid;gap:1rem}.hero,.home-widget,.module-banner,.vl-card{padding:1.25rem;border:1px solid var(--line);border-radius:10px;background:var(--surface-1);color:var(--text);box-shadow:var(--shadow,none)}
.home-launch-desc,.module-banner-sub,.vl-desc{color:var(--muted)}
html[data-site-theme="vaporwave"]{--bg:#050505;--text:#f8f8ff;--muted:#d9b6ff;--line:rgba(0,255,255,.34);--header-bg:rgba(5,5,12,.82);--header-border:rgba(255,0,255,.28);--nav-ink:#9ffcff;--nav-ink-strong:#fff8ff;--surface-1:rgba(22,10,42,.9);--surface-2:rgba(10,5,24,.96);--theme-accent:#ff00ff;--page-wash:radial-gradient(950px 540px at -10% -10%,rgba(255,0,255,.24),transparent 52%),radial-gradient(780px 430px at 110% 10%,rgba(0,255,255,.18),transparent 42%)}
html[data-site-theme="diamond"]{--bg:#050a18;--text:#edf6ff;--muted:#c6dcf2;--line:rgba(119,176,232,.28);--header-bg:rgba(8,16,34,.78);--header-border:rgba(111,190,255,.18);--nav-ink:#b9d6f3;--nav-ink-strong:#f6fbff;--surface-1:rgba(15,29,52,.9);--surface-2:rgba(10,21,40,.96);--theme-accent:#00f3ff;--page-wash:radial-gradient(900px 520px at 50% -12%,rgba(44,98,210,.42),transparent 52%),radial-gradient(760px 420px at 0% 100%,rgba(10,37,92,.52),transparent 46%),radial-gradient(680px 360px at 100% 12%,rgba(0,243,255,.12),transparent 38%)}
html[data-site-theme="topaz"]{--bg:#fff9e3;--text:#342300;--muted:#73551a;--line:rgba(244,169,0,.55);--header-bg:rgba(255,252,235,.9);--header-border:rgba(244,169,0,.48);--nav-ink:#765100;--nav-ink-strong:#342300;--surface-1:rgba(255,255,255,.92);--surface-2:rgba(255,250,229,.96);--theme-accent:#b16800;--page-wash:radial-gradient(1000px 560px at 50% -8%,rgba(255,247,173,.3),transparent 58%),radial-gradient(820px 460px at 84% 12%,rgba(255,185,0,.18),transparent 56%)}
body.theme-liquid-woodland[data-theme="diamond"].theme-steam,body.theme-liquid-woodland[data-theme="diamond"].theme-video-library{background:radial-gradient(1100px 600px at 50% -8%,rgba(44,98,210,.34),transparent 58%),radial-gradient(920px 560px at 88% 8%,rgba(0,243,255,.08),transparent 58%),linear-gradient(180deg,#050a18 0%,#081122 44%,#0b162a 100%)}
body.theme-liquid-woodland[data-theme="vaporwave"].theme-steam,body.theme-liquid-woodland[data-theme="vaporwave"].theme-video-library{background:repeating-linear-gradient(180deg,rgba(255,255,255,.04) 0 1px,transparent 1px 3px),radial-gradient(980px 520px at -10% -10%,rgba(255,0,255,.18),transparent 50%),linear-gradient(180deg,#050505 0%,#10051c 46%,#070010 100%)}
body.theme-liquid-woodland[data-theme="topaz"].theme-steam,body.theme-liquid-woodland[data-theme="topaz"].theme-video-library{background:radial-gradient(1000px 560px at 50% -8%,rgba(255,247,173,.26),transparent 58%),radial-gradient(820px 460px at 84% 12%,rgba(255,185,0,.14),transparent 56%),linear-gradient(180deg,#fffaf0 0%,#fff6d9 44%,#fff9e3 100%)}
`;

const cases = [
  ["applications.html", "applications-page", "vaporwave"],
  ["applications.html", "applications-page", "diamond"],
  ["video-library.html", "theme-liquid-woodland theme-video-library", "vaporwave"],
  ["video-library.html", "theme-liquid-woodland theme-video-library", "diamond"],
  ["video-library.html", "theme-liquid-woodland theme-video-library", "topaz"],
  ["steam-lessons.html", "theme-liquid-woodland theme-steam", "topaz"],
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
page.setDefaultTimeout(10000);

const results = [];
for (const [file, bodyClass, theme] of cases) {
  await page.goto("http://localhost:8080/__spotcheck__.html", { waitUntil: "commit", timeout: 5000 });
  await page.evaluate(() => localStorage.clear());
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${themeCss}</style></head><body class="${bodyClass}"><header class="site-header"><a class="brand" href="#">STEAM</a><nav class="site-nav" aria-label="Primary"><ul><li><a href="#">Home</a></li></ul></nav></header><main><section class="hero"><h1>${file}</h1><p>Readable theme sample text for ${theme}.</p></section><section class="home-widget"><h2>Sample card</h2><p class="home-launch-desc">Muted body copy remains legible.</p></section><article class="vl-card"><p class="vl-desc">Video card copy remains readable.</p></article></main></body></html>`);
  await page.evaluate((source) => (0, eval)(source), themeJs);
  await page.evaluate((nextTheme) => window.ClassroomOSThemeLighting.setTheme(nextTheme), theme);
  await page.waitForTimeout(350);

  const state = await page.evaluate(() => {
    const bodyStyle = getComputedStyle(document.body);
    const cardStyle = getComputedStyle(document.querySelector(".home-widget"));
    return {
      htmlTheme: document.documentElement.dataset.theme || "",
      siteTheme: document.documentElement.getAttribute("data-site-theme") || "",
      bodyTheme: document.body.dataset.theme || "",
      bodyLighting: document.body.dataset.lighting || "",
      bodyBackgroundColor: bodyStyle.backgroundColor,
      bodyBackgroundImage: bodyStyle.backgroundImage.slice(0, 200),
      bodyColor: bodyStyle.color,
      cardBackground: cardStyle.backgroundColor,
      cardColor: cardStyle.color,
    };
  });

  const name = `${file.replace(/\.html$/, "")}-${theme}`;
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: false });
  results.push({ file, theme, state, screenshot: `screenshots/phase-2-spotcheck/${name}.png` });
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
