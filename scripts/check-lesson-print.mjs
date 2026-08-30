import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPORT_DIR = path.join(ROOT, "tmp", "lesson-print-audit");
const args = new Set(process.argv.slice(2));
const render = args.has("--render") || args.has("--pdf");
const makePdfs = args.has("--pdf");
const lessonArg = process.argv.find((value) => value.startsWith("--lesson="))?.split("=")[1];
const limitArg = process.argv.find((value) => value.startsWith("--limit="))?.split("=")[1];
const limit = limitArg ? Number.parseInt(limitArg, 10) : Infinity;

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "lessons.json"), "utf8"));
const catalogByUrl = new Map(catalog.lessons.map((lesson) => [lesson.url, lesson]));
const compendiumPlanPath = path.join(ROOT, "data", "compendium-plan.json");
let lessons = fs.existsSync(compendiumPlanPath)
  ? JSON.parse(fs.readFileSync(compendiumPlanPath, "utf8")).volumes.flatMap((volume) =>
      volume.modules.flatMap((module) => module.units.flatMap((unit) => unit.lessons.map((url) =>
        catalogByUrl.get(url) || {
          id: url.replace(/^lessons\//, "").replace(/\.html$/, ""),
          title: url,
          url,
          status: "live",
          lessonType: "unclassified",
        }))))
  : catalog.lessons.filter((lesson) => lesson.status === "live");
if (lessonArg) {
  const requested = new Set(lessonArg.split(",").map((value) => value.trim()).filter(Boolean));
  lessons = lessons.filter((lesson) => requested.has(lesson.id) || requested.has(lesson.url));
}
lessons = lessons.slice(0, Number.isFinite(limit) ? limit : lessons.length);

if (!lessons.length) {
  console.error("No live lessons matched the requested filters.");
  process.exit(2);
}

const staticResults = lessons.map((lesson) => {
  const filename = path.join(ROOT, lesson.url);
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(filename)) {
    errors.push("catalog URL does not exist");
    return { ...lesson, errors, warnings };
  }

  const html = fs.readFileSync(filename, "utf8");
  const usesSharedLayout = /lesson-layout\.css/i.test(html);
  const usesPrintStyles = usesSharedLayout || /lesson-print\.css/i.test(html);
  const usesPrintButton = /lesson-print-button\.js/i.test(html);
  const canvasCount = (html.match(/<canvas\b/gi) || []).length;
  const svgCount = (html.match(/<svg\b/gi) || []).length;
  const iframeCount = (html.match(/<iframe\b/gi) || []).length;
  const modelCount = (html.match(/<model-viewer\b/gi) || []).length;

  if (!usesPrintStyles) errors.push("missing shared print stylesheet");
  if (!usesPrintButton) errors.push("missing lesson print button");
  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push("missing document title");
  if (!/<h1(?:\s|>)/i.test(html)) warnings.push("missing visible h1");
  if (lesson.lessonType === "interactive lab" && canvasCount + svgCount + iframeCount + modelCount === 0) {
    warnings.push("interactive lab has no statically detectable simulation surface");
  }

  return {
    id: lesson.id,
    title: lesson.title,
    url: lesson.url,
    type: lesson.lessonType,
    usesSharedLayout,
    media: { canvas: canvasCount, svg: svgCount, iframe: iframeCount, model: modelCount },
    errors,
    warnings,
  };
});

let renderResults = [];

if (render) {
  fs.rmSync(REPORT_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(REPORT_DIR, "first-pages"), { recursive: true });
  if (makePdfs) fs.mkdirSync(path.join(REPORT_DIR, "pdf"), { recursive: true });

  const server = await startServer();
  let browser;
  try {
    browser = await launchChromium();
    const page = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 1 });
    page.setDefaultTimeout(12_000);
    await page.route(/https?:\/\/(?!127\.0\.0\.1:)/, (route) => route.abort());

    for (const [index, lesson] of lessons.entries()) {
      const consoleErrors = [];
      const onConsole = (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      };
      page.on("console", onConsole);

      const result = { id: lesson.id, url: lesson.url, errors: [], warnings: [] };
      try {
        await page.emulateMedia({ media: "screen" });
        const response = await page.goto(`${server.origin}/${lesson.url}?printAudit=1`, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        });
        if (!response?.ok()) result.errors.push(`page returned HTTP ${response?.status() ?? "unknown"}`);
        await page.waitForTimeout(450);
        const printControl = await page.evaluate(() => {
          const button = document.querySelector('.lesson-print-button');
          const menu = document.querySelector('.lesson-print-menu');
          if (!button || !menu) return { exists: false, visible: false, options: [] };
          const visible = getComputedStyle(button).display !== 'none' && button.getBoundingClientRect().width > 1;
          button.click();
          const menuOpened = !menu.hidden;
          const options = [...menu.querySelectorAll('[data-print-action]')].map((item) => item.dataset.printAction);
          button.click();
          return { exists: true, visible, menuOpened, options };
        });
        result.printControl = printControl;
        if (!printControl.exists || !printControl.visible) result.errors.push("print/PDF control is missing or hidden on screen");
        if (!printControl.menuOpened || !printControl.options.includes("print") || !printControl.options.includes("pdf")) {
          result.errors.push("print/PDF menu actions are incomplete");
        }
        await page.emulateMedia({ media: "print" });
        await page.waitForTimeout(100);

        const metrics = await page.evaluate(() => {
          const visible = (element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 1 && rect.height > 1;
          };
          const name = (element) => {
            const id = element.id ? `#${element.id}` : "";
            const classes = [...element.classList].slice(0, 2).map((value) => `.${value}`).join("");
            return `${element.tagName.toLowerCase()}${id}${classes}`;
          };
          const viewportWidth = document.documentElement.clientWidth;
          const overflow = [...document.body.querySelectorAll("*")]
            .filter(visible)
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              return rect.left < -2 || rect.right > viewportWidth + 2;
            })
            .filter((element) => !element.closest("svg"))
            .slice(0, 20)
            .map(name);
          const clipped = [...document.body.querySelectorAll("*")]
            .filter(visible)
            .filter((element) => {
              const style = getComputedStyle(element);
              return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 4;
            })
            .slice(0, 20)
            .map(name);
          const fixed = [...document.body.querySelectorAll("*")]
            .filter(visible)
            .filter((element) => ["fixed", "sticky"].includes(getComputedStyle(element).position))
            .slice(0, 20)
            .map(name);
          const hiddenPanes = [...document.querySelectorAll(".ll-pane")].filter((element) => !visible(element)).map(name);
          const canvases = [...document.querySelectorAll("canvas")].map((canvas) => {
            let variance = null;
            try {
              const sample = document.createElement("canvas");
              sample.width = 24;
              sample.height = 24;
              const context = sample.getContext("2d", { willReadFrequently: true });
              context.drawImage(canvas, 0, 0, 24, 24);
              const pixels = context.getImageData(0, 0, 24, 24).data;
              let min = 255;
              let max = 0;
              for (let index = 0; index < pixels.length; index += 4) {
                const value = pixels[index] + pixels[index + 1] + pixels[index + 2];
                min = Math.min(min, value);
                max = Math.max(max, value);
              }
              variance = max - min;
            } catch {
              variance = null;
            }
            const rect = canvas.getBoundingClientRect();
            return { name: name(canvas), width: Math.round(rect.width), height: Math.round(rect.height), variance };
          });
          return {
            title: document.title,
            pageWidth: viewportWidth,
            documentHeight: Math.ceil(document.documentElement.scrollHeight),
            overflow,
            clipped,
            fixed,
            hiddenPanes,
            canvases,
          };
        });

        result.metrics = metrics;
        if (metrics.overflow.length) result.warnings.push(`horizontal overflow: ${metrics.overflow.join(", ")}`);
        if (metrics.clipped.length) result.warnings.push(`clipped/scrolling content: ${metrics.clipped.join(", ")}`);
        if (metrics.fixed.length) result.warnings.push(`fixed or sticky print elements: ${metrics.fixed.join(", ")}`);
        if (metrics.hiddenPanes.length) result.errors.push(`instructional panes hidden in print: ${metrics.hiddenPanes.join(", ")}`);
        const blankCanvases = metrics.canvases.filter((canvas) => canvas.width > 20 && canvas.height > 20 && canvas.variance === 0);
        if (blankCanvases.length) result.warnings.push(`possibly blank canvas: ${blankCanvases.map((canvas) => canvas.name).join(", ")}`);
        if (metrics.documentHeight > 1056 * 30) result.warnings.push("printout exceeds approximately 30 pages");

        const screenshot = path.join(REPORT_DIR, "first-pages", `${lesson.id}.png`);
        await page.screenshot({ path: screenshot, clip: { x: 0, y: 0, width: 816, height: 1056 } });
        result.screenshot = path.relative(ROOT, screenshot);
        if (makePdfs) {
          const pdf = path.join(REPORT_DIR, "pdf", `${lesson.id}.pdf`);
          await page.pdf({ path: pdf, format: "Letter", printBackground: true, preferCSSPageSize: true });
          result.pdf = path.relative(ROOT, pdf);
        }
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : String(error));
      } finally {
        page.off("console", onConsole);
      }
      if (consoleErrors.length) result.consoleErrors = [...new Set(consoleErrors)].slice(0, 10);
      renderResults.push(result);
      process.stdout.write(`[${index + 1}/${lessons.length}] ${lesson.id}\n`);
    }
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.instance.close(resolve));
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  scope: { liveLessons: lessons.length, rendered: renderResults.length },
  summary: summarize(staticResults, renderResults),
  staticResults,
  renderResults,
};

if (render) {
  fs.writeFileSync(path.join(REPORT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(REPORT_DIR, "index.html"), buildGallery(report));
}

console.log(JSON.stringify(report.summary, null, 2));
if (render) console.log(`Print audit: ${path.relative(ROOT, path.join(REPORT_DIR, "index.html"))}`);
if (report.summary.errors > 0) process.exitCode = 1;

function summarize(staticChecks, renderedChecks) {
  return {
    lessons: staticChecks.length,
    rendered: renderedChecks.length,
    errors: [...staticChecks, ...renderedChecks].reduce((sum, item) => sum + item.errors.length, 0),
    warnings: [...staticChecks, ...renderedChecks].reduce((sum, item) => sum + item.warnings.length, 0),
    lessonsWithCanvas: staticChecks.filter((item) => item.media?.canvas).length,
    lessonsUsingSharedLayout: staticChecks.filter((item) => item.usesSharedLayout).length,
  };
}

async function launchChromium() {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    const cacheRoot = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), ".cache", "ms-playwright");
    const candidates = fs.existsSync(cacheRoot)
      ? fs.readdirSync(cacheRoot)
        .filter((entry) => entry.startsWith("chromium-") && !entry.includes("headless"))
        .sort()
        .reverse()
        .map((entry) => path.join(cacheRoot, entry, "chrome-linux64", "chrome"))
      : [];
    const executablePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!executablePath) throw error;
    return chromium.launch({ headless: true, executablePath });
  }
}

async function startServer() {
  const mime = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
  };
  const instance = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filename = path.resolve(ROOT, relative);
    if (!filename.startsWith(`${ROOT}${path.sep}`) && filename !== path.join(ROOT, "index.html")) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    fs.stat(filename, (error, stat) => {
      const target = !error && stat.isDirectory() ? path.join(filename, "index.html") : filename;
      fs.readFile(target, (readError, data) => {
        if (readError) {
          response.writeHead(404).end("Not Found");
          return;
        }
        response.writeHead(200, { "Content-Type": mime[path.extname(target).toLowerCase()] || "application/octet-stream" });
        response.end(data);
      });
    });
  });
  await new Promise((resolve) => instance.listen(0, "127.0.0.1", resolve));
  const address = instance.address();
  return { instance, origin: `http://127.0.0.1:${address.port}` };
}

function buildGallery(reportData) {
  const rows = reportData.renderResults.map((item) => {
    const status = item.errors.length ? "error" : item.warnings.length ? "warning" : "pass";
    const notes = [...item.errors.map((value) => `ERROR: ${value}`), ...item.warnings].join("\n") || "No automated findings";
    return `<article class="${status}"><img src="first-pages/${item.id}.png" alt="First printed page of ${escapeHtml(item.id)}"><h2>${escapeHtml(item.id)}</h2><pre>${escapeHtml(notes)}</pre></article>`;
  }).join("\n");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Lesson print audit</title><style>body{font:14px system-ui;margin:24px;background:#eef2f7;color:#172033}header{max-width:70ch;margin:auto auto 24px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px}article{background:white;border:3px solid #22c55e;border-radius:12px;padding:10px;box-shadow:0 5px 18px #1f29371a}article.warning{border-color:#f59e0b}article.error{border-color:#dc2626}img{width:100%;aspect-ratio:8.5/11;object-fit:cover;object-position:top;border:1px solid #cbd5e1}h2{font-size:15px;margin:8px 0}pre{font:11px/1.35 ui-monospace;white-space:pre-wrap;margin:0}</style><header><h1>Lesson print audit</h1><p>${reportData.scope.rendered} rendered lessons. Green passed automated checks, amber needs visual review, and red has a blocking problem.</p></header><main class="grid">${rows}</main></html>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}
