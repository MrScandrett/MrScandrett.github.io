import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import pa11y from "pa11y";
import puppeteer from "puppeteer";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THEMES = [
  "day",
  "night",
  "sakura",
  "diamond",
  "emerald",
  "topaz",
  "vaporwave",
  "goldfish",
  "cobblestone",
  "bark",
];
const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".claude",
  "dist",
  "node_modules",
  "screenshots",
  "tmp",
]);
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".glb": "model/gltf-binary",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function collectThemePages(directory = ROOT) {
  const pages = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      pages.push(...collectThemePages(absolutePath));
      continue;
    }
    if (!entry.isFile() || path.extname(entry.name) !== ".html") continue;

    const html = fs.readFileSync(absolutePath, "utf8");
    const hasThemeRuntime = /(?:theme-lighting|nav-mobile)\.js(?:[?"'])/.test(html);
    const isThemeIndependent = /data-theme-scope\s*=\s*["']independent["']/.test(html);
    if (hasThemeRuntime && !isThemeIndependent) {
      pages.push(path.relative(ROOT, absolutePath).split(path.sep).join("/"));
    }
  }

  return pages.sort();
}

function startStaticServer() {
  const server = http.createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    } catch {
      response.writeHead(400).end("Bad request");
      return;
    }

    const requestedPath = pathname === "/" ? "/index.html" : pathname;
    const absolutePath = path.resolve(ROOT, `.${requestedPath}`);
    if (!absolutePath.startsWith(`${ROOT}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    fs.stat(absolutePath, (statError, stats) => {
      const filePath = !statError && stats.isDirectory() ? path.join(absolutePath, "index.html") : absolutePath;
      fs.readFile(filePath, (readError, data) => {
        if (readError) {
          response.writeHead(readError.code === "ENOENT" ? 404 : 500).end("Not found");
          return;
        }
        response.writeHead(200, {
          "Cache-Control": "public, max-age=3600",
          "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        });
        response.end(data);
      });
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

function isContrastIssue(issue) {
  return issue.type === "error" && (
    /Guideline1_4\.1_4_3\.(?:G18|G145)\.Fail/.test(issue.code) ||
    /insufficient contrast/i.test(issue.message)
  );
}

async function auditCase(browser, browserContext, baseUrl, pagePath, theme) {
  const page = await browserContext.newPage();
  const url = `${baseUrl}/${pagePath}`;
  await page.evaluateOnNewDocument((selectedTheme) => {
    localStorage.setItem("classroomos-lighting-mode", "manual");
    localStorage.setItem("classroomos-lighting-phase", selectedTheme);
  }, theme);

  try {
    await page.goto(url, { timeout: 30_000, waitUntil: "domcontentloaded" });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const result = await pa11y(url, {
      browser,
      ignoreUrl: true,
      page,
      standard: "WCAG2AA",
      timeout: 30_000,
      viewport: { width: 1280, height: 1024 },
      wait: 750,
    });
    const appliedTheme = await page.evaluate(() => document.documentElement.dataset.theme || document.body?.dataset.theme || "");

    return {
      page: pagePath,
      theme,
      appliedTheme,
      issues: result.issues.filter(isContrastIssue).map(({ code, message, selector, type }) => ({
        code,
        message,
        selector,
        type,
      })),
    };
  } finally {
    await page.close();
  }
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  let completed = 0;

  async function runWorker(workerIndex) {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = await worker(items[index], workerIndex);
      } catch (error) {
        results[index] = { ...items[index], auditError: error.message, issues: [] };
        console.error(`Audit error for ${items[index].pagePath} [${items[index].theme}]: ${error.message}`);
      }
      completed += 1;
      if (completed % 50 === 0 || completed === items.length) {
        console.log(`Audited ${completed}/${items.length} page-theme combinations...`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, (_, index) => runWorker(index)));
  return results;
}

const pageFilter = process.env.THEME_AUDIT_PAGE;
const themeFilter = process.env.THEME_AUDIT_THEME;
const pageFilters = pageFilter?.split(",").map((value) => value.trim()).filter(Boolean) || [];
const pages = collectThemePages().filter((pagePath) => !pageFilters.length || pageFilters.some((filter) => pagePath.includes(filter)));
const selectedThemes = THEMES.filter((theme) => !themeFilter || theme === themeFilter);

if (!pages.length) throw new Error(`No theme-enabled pages matched THEME_AUDIT_PAGE=${pageFilter}`);
if (!selectedThemes.length) throw new Error(`Unknown THEME_AUDIT_THEME=${themeFilter}`);

const cases = pages.flatMap((pagePath) => selectedThemes.map((theme) => ({ pagePath, theme })));
const { server, baseUrl } = await startStaticServer();
const browser = await puppeteer.launch({
  args: ["--disable-dev-shm-usage", "--no-sandbox"],
  executablePath: chromium.executablePath(),
  headless: true,
});

let results;
try {
  console.log(`Running Pa11y color-contrast checks on ${pages.length} pages across ${selectedThemes.length} themes (${cases.length} combinations).`);
  const browserContexts = await Promise.all(Array.from({ length: 4 }, () => browser.createIncognitoBrowserContext()));
  results = await runPool(cases, browserContexts.length, ({ pagePath, theme }, workerIndex) => (
    auditCase(browser, browserContexts[workerIndex], baseUrl, pagePath, theme)
  ));
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

const applicationFailures = results.filter(({ auditError, appliedTheme, theme }) => !auditError && appliedTheme !== theme);
const contrastFailures = results.filter(({ issues }) => issues.length > 0);
const auditErrors = results.filter(({ auditError }) => auditError);
const reportPath = path.join(ROOT, "tmp", "pa11y-theme-readability.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify({ pages, themes: selectedThemes, auditErrors, applicationFailures, contrastFailures }, null, 2)}\n`);

if (auditErrors.length) {
  console.error(`Pa11y could not complete ${auditErrors.length} page-theme combinations.`);
}

if (applicationFailures.length) {
  console.error(`Theme application failed in ${applicationFailures.length} cases.`);
  for (const failure of applicationFailures.slice(0, 20)) {
    console.error(`- ${failure.page}: requested ${failure.theme}, applied ${failure.appliedTheme || "none"}`);
  }
}

if (contrastFailures.length) {
  const issueCount = contrastFailures.reduce((total, result) => total + result.issues.length, 0);
  console.error(`Pa11y found ${issueCount} text contrast issues in ${contrastFailures.length} page-theme combinations:`);
  for (const failure of contrastFailures.slice(0, 100)) {
    console.error(`\n${failure.page} [${failure.theme}]`);
    for (const issue of failure.issues) {
      console.error(`- ${issue.selector}: ${issue.message}`);
    }
  }
  if (contrastFailures.length > 100) {
    console.error(`\n...and ${contrastFailures.length - 100} more failing page-theme combinations in the full report.`);
  }
}

if (auditErrors.length || applicationFailures.length || contrastFailures.length) {
  console.error(`\nFull report: ${path.relative(ROOT, reportPath)}`);
  process.exitCode = 1;
} else {
  console.log(`Theme readability check passed. All ${cases.length} Pa11y audits meet WCAG 2.1 AA text contrast.`);
}
