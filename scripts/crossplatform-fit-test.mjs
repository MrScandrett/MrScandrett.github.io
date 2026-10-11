#!/usr/bin/env node

/**
 * Cross-platform Design and Optimization Test
 * Tests formatting, fit-to-screen responsiveness, minimalism fitting,
 * console errors, resource integrity, and responsive layout across
 * mobile (320px, 375px, 390px, 412px), tablet (768px, 1024px),
 * and desktop (1366px, 1920px) viewports.
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import { findChromium } from "../lib/find-chromium.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

const VIEWPORTS = [
  { name: "Mobile Extra-Small (iPhone SE 1st gen)", width: 320, height: 568, category: "mobile" },
  { name: "Mobile Small (iPhone 8/SE2)", width: 375, height: 667, category: "mobile" },
  { name: "Mobile Standard (iPhone 14/15)", width: 390, height: 844, category: "mobile" },
  { name: "Mobile Android (Pixel/Galaxy)", width: 412, height: 915, category: "mobile" },
  { name: "Tablet Portrait (iPad 9.7\")", width: 768, height: 1024, category: "tablet" },
  { name: "Tablet Landscape / Chromebook", width: 1024, height: 768, category: "tablet" },
  { name: "Laptop Standard", width: 1366, height: 768, category: "desktop" },
  { name: "Desktop Full HD", width: 1920, height: 1080, category: "desktop" },
];

const DEFAULT_PAGES = [
  // High-priority recently modified / new pages
  "lessons/godot/godot-basics.html",
  "lessons/blender/blender-pathway.html",
  "lessons/blender/blender-workspaces-pathway.html",
  "lessons/web-design/web-css.html",
  "lessons/humanities/quadrivium.html",
  "lessons/bible-studies/job.html",
  "lessons/mathematics/advanced-and-calculus/time-derivatives-snap-crackle-pop.html",
  // Site hubs & core apps
  "index.html",
  "steam-lessons.html",
  "applications.html",
  "showcase.html",
  "library.html",
  "bible.html",
  "forge.html",
  "music-lab.html",
  "paths.html",
  "vr.html",
  // Key interactive hubs
  "lessons/humanities/the-ages.html",
  "lessons/computer-science/graphics-and-games/tool-rosetta.html",
  "lessons/computer-science/graphics-and-games/rosetta-2d.html",
];

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
    ".gif": "image/gif",
    ".woff2": "font/woff2",
    ".vtt": "text/vtt",
    ".glb": "model/gltf-binary",
    ".wasm": "application/wasm",
  };
  const instance = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const filename = path.resolve(ROOT, pathname === "/" ? "index.html" : pathname.replace(/^\/+/, ""));
    if (!filename.startsWith(`${ROOT}${path.sep}`)) return response.writeHead(403).end();
    fs.stat(filename, (error, stat) => {
      const target = !error && stat.isDirectory() ? path.join(filename, "index.html") : filename;
      fs.readFile(target, (readError, data) => {
        if (readError) {
          response.writeHead(404, { "Content-Type": "text/plain" });
          return response.end(`404 Not Found: ${pathname}`);
        }
        response.writeHead(200, {
          "Content-Type": mime[path.extname(target).toLowerCase()] || "application/octet-stream",
          "Access-Control-Allow-Origin": "*",
        });
        response.end(data);
      });
    });
  });
  await new Promise((resolve) => instance.listen(0, "127.0.0.1", resolve));
  return { instance, origin: `http://127.0.0.1:${instance.address().port}` };
}

async function run() {
  const argPages = process.argv.find((a) => a.startsWith("--pages="))?.split("=")[1];
  const pagesToTest = argPages ? argPages.split(",") : DEFAULT_PAGES;

  console.log("==================================================================");
  console.log("   CROSS-PLATFORM DESIGN, OPTIMIZATION & FIT-TO-SCREEN TEST");
  console.log("==================================================================");
  console.log(`Pages under test: ${pagesToTest.length}`);
  console.log(`Viewports tested: ${VIEWPORTS.length} (${VIEWPORTS.map((v) => `${v.width}px`).join(", ")})`);

  const server = await startServer();
  const chromePath = findChromium(["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"]);
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const pageReports = [];
  let totalIssues = 0;
  let totalOverflows = 0;

  for (const pagePath of pagesToTest) {
    const fullUrl = `${server.origin}/${pagePath}`;
    const pageReport = {
      path: pagePath,
      errors: [],
      failedRequests: [],
      viewportResults: [],
      minimalismNotes: [],
      domStats: null,
    };

    console.log(`\nTesting: ${pagePath}`);

    // Create browser context
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on("pageerror", (err) => {
      pageReport.errors.push(err.message);
    });
    page.on("requestfailed", (req) => {
      const url = req.url();
      // Ignore favicon or optional third-party telemetry/fonts if any
      if (!url.endsWith("favicon.ico")) {
        pageReport.failedRequests.push(`${req.method()} ${url} (${req.failure()?.errorText || "failed"})`);
      }
    });

    try {
      await page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(400);

      // Collect DOM Stats
      pageReport.domStats = await page.evaluate(() => {
        const allElements = document.querySelectorAll("*");
        const images = document.querySelectorAll("img");
        const svgs = document.querySelectorAll("svg");
        const buttons = document.querySelectorAll("button, [role='button'], a.btn, .btn");
        const inputs = document.querySelectorAll("input, select, textarea");
        return {
          totalElements: allElements.length,
          imageCount: images.length,
          svgCount: svgs.length,
          buttonCount: buttons.length,
          inputCount: inputs.length,
        };
      });

      // Test across viewports
      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(150);

        const check = await page.evaluate((vpWidth) => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(docEl.scrollWidth, body ? body.scrollWidth : 0);
          const clientW = window.innerWidth;
          const hasOverflow = scrollW > clientW + 1; // 1px threshold for sub-pixel anti-aliasing

          const overflowingElements = [];
          if (hasOverflow) {
            const elements = document.querySelectorAll("body *");
            for (const el of elements) {
              const rect = el.getBoundingClientRect();
              // Check if element spills past the viewport right edge
              if (rect.right > clientW + 1.5) {
                // Avoid capturing parent wrappers if children are the real cause, but note selector
                const style = window.getComputedStyle(el);
                if (style.display !== "none" && style.visibility !== "hidden") {
                  const tag = el.tagName.toLowerCase();
                  const id = el.id ? `#${el.id}` : "";
                  const classes = el.className && typeof el.className === "string"
                    ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
                    : "";
                  const desc = `${tag}${id}${classes}`;
                  overflowingElements.push({
                    selector: desc,
                    right: Math.round(rect.right),
                    excess: Math.round(rect.right - clientW),
                    width: Math.round(rect.width),
                  });
                }
              }
            }
          }

          // Check small touch target ergonomics on mobile (<= 412px)
          const smallTargets = [];
          if (clientW <= 412) {
            const interactives = document.querySelectorAll("button, a[href], input[type='button'], input[type='submit']");
            for (const btn of interactives) {
              const r = btn.getBoundingClientRect();
              const style = window.getComputedStyle(btn);
              if (style.display !== "none" && style.visibility !== "hidden" && r.width > 0 && r.height > 0) {
                if (r.width < 28 || r.height < 28) {
                  // Only flag if it's not an inline inline text link or skip link
                  if (btn.tagName === "BUTTON" || btn.classList.contains("btn") || btn.classList.contains("tile")) {
                    const tag = btn.tagName.toLowerCase();
                    const id = btn.id ? `#${btn.id}` : "";
                    const cls = btn.className && typeof btn.className === "string"
                      ? "." + btn.className.trim().split(/\s+/).slice(0, 2).join(".")
                      : "";
                    smallTargets.push({
                      target: `${tag}${id}${cls}`,
                      text: (btn.textContent || "").trim().slice(0, 20),
                      width: Math.round(r.width),
                      height: Math.round(r.height),
                    });
                  }
                }
              }
            }
          }

          // Measure layout whitespace & fit efficiency
          const mainEl = document.querySelector("main") || body;
          const mainStyle = window.getComputedStyle(mainEl);
          const paddingLeft = parseFloat(mainStyle.paddingLeft) || 0;
          const paddingRight = parseFloat(mainStyle.paddingRight) || 0;
          const marginLeft = parseFloat(mainStyle.marginLeft) || 0;
          const marginRight = parseFloat(mainStyle.marginRight) || 0;
          const totalHorizontalGutter = paddingLeft + paddingRight + marginLeft + marginRight;

          return {
            scrollWidth: scrollW,
            clientWidth: clientW,
            hasOverflow,
            overflowingElements: overflowingElements.slice(0, 5), // top 5
            smallTargets: smallTargets.slice(0, 3),
            totalGutter: Math.round(totalHorizontalGutter),
          };
        }, vp.width);

        if (check.hasOverflow) {
          totalOverflows += 1;
          totalIssues += 1;
        }

        pageReport.viewportResults.push({
          viewport: vp.name,
          width: vp.width,
          hasOverflow: check.hasOverflow,
          overflowDelta: check.scrollWidth - vp.width,
          overflowingElements: check.overflowingElements,
          smallTargets: check.smallTargets,
          totalGutter: check.totalGutter,
        });

        const statusIcon = check.hasOverflow ? "❌ OVERFLOW" : "✅ FIT";
        const gutterNote = `gutter: ${check.totalGutter}px`;
        const delta = check.hasOverflow ? `(+${check.scrollWidth - vp.width}px)` : "";
        console.log(`   ${statusIcon.padEnd(12)} [${vp.width}px] ${vp.name.padEnd(32)} ${delta} ${gutterNote}`);
        if (check.hasOverflow && check.overflowingElements.length > 0) {
          console.log(`      Offending: ${check.overflowingElements.map((e) => `${e.selector} (+${e.excess}px)`).join(", ")}`);
        }
      }

      // Check Dark/Night theme compatibility and formatting
      await page.evaluate(() => {
        document.documentElement.dataset.theme = "night";
        document.body.dataset.theme = "night";
      });
      await page.waitForTimeout(100);
      const themeAudit = await page.evaluate(() => {
        const bodyStyle = window.getComputedStyle(document.body);
        const bg = bodyStyle.backgroundColor;
        const color = bodyStyle.color;
        return { bg, color };
      });
      pageReport.themeAudit = themeAudit;

    } catch (err) {
      pageReport.errors.push(`Page loading/testing error: ${err.message}`);
      totalIssues += 1;
      console.log(`   ❌ ERROR: ${err.message}`);
    } finally {
      await context.close();
    }

    pageReports.push(pageReport);
  }

  await browser.close();
  server.instance.close();

  // Summary
  console.log("\n==================================================================");
  console.log("                      TEST RUN SUMMARY");
  console.log("==================================================================");
  console.log(`Total Pages Audited:    ${pagesToTest.length}`);
  console.log(`Total Viewport Runs:    ${pagesToTest.length * VIEWPORTS.length}`);
  console.log(`Total Overflow Flaws:   ${totalOverflows}`);
  console.log(`Total Uncaught Errors:  ${pageReports.reduce((sum, r) => sum + r.errors.length, 0)}`);
  console.log(`Total 404/Failed Reqs:  ${pageReports.reduce((sum, r) => sum + r.failedRequests.length, 0)}`);

  const failedPages = pageReports.filter((r) => r.errors.length > 0 || r.viewportResults.some((v) => v.hasOverflow));
  if (failedPages.length > 0) {
    console.log("\nPages with fitting or overflow issues:");
    for (const p of failedPages) {
      console.log(`- ${p.path}:`);
      for (const v of p.viewportResults.filter((vr) => vr.hasOverflow)) {
        console.log(`    ${v.width}px: scrollWidth=${v.width + v.overflowDelta}px (+${v.overflowDelta}px)`);
        for (const el of v.overflowingElements) {
          console.log(`       -> ${el.selector} (w=${el.width}px, excess=${el.excess}px)`);
        }
      }
      for (const err of p.errors) {
        console.log(`    error: ${err}`);
      }
    }
  } else {
    console.log("\n🎉 ALL PAGES PASSED: Zero horizontal overflow across all tested viewports!");
  }

  // Save report to tmp/
  const reportDir = path.join(ROOT, "tmp", "crossplatform-fitting");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, "report.json"),
    JSON.stringify({ timestamp: new Date().toISOString(), totalIssues, totalOverflows, pageReports }, null, 2)
  );
  console.log(`\nDetailed report written to: tmp/crossplatform-fitting/report.json`);
}

run().catch((err) => {
  console.error("Fatal error running cross-platform tests:", err);
  process.exit(1);
});
