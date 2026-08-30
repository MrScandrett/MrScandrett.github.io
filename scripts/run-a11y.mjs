#!/usr/bin/env node

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pa11y = require("pa11y");
const puppeteer = require("puppeteer");

const root = process.cwd();
const configPath = path.join(root, ".pa11yci.json");
const baselinePath = path.join(root, "data", "a11y-baseline.json");
const reportPath = path.join(root, "reports", "accessibility", "latest.json");
const updateBaseline = process.argv.includes("--update-baseline");
const ignoreBaseline = process.argv.includes("--no-baseline");
const matchIndex = process.argv.indexOf("--match");
const matchPattern = matchIndex >= 0 ? process.argv[matchIndex + 1] : "";

const config = JSON.parse(await fs.readFile(configPath, "utf8"));
const configuredUrls = config.urls.map((entry) => typeof entry === "string" ? { url: entry } : entry);
const urls = matchPattern ? configuredUrls.filter((entry) => entry.url.includes(matchPattern)) : configuredUrls;
const concurrency = Math.min(urls.length, Math.max(1, Number(process.env.A11Y_CONCURRENCY || config.defaults?.concurrency || 3)));
const localChromium = "/home/evanscandrett/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome";
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
  (existsSync(localChromium) ? localChromium : await puppeteer.executablePath());

const launchOptions = {
  executablePath,
  headless: true,
  args: [
    ...(config.defaults?.chromeLaunchConfig?.args || []),
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-software-rasterizer",
  ],
};

const pa11yDefaults = { ...config.defaults };
delete pa11yDefaults.concurrency;
delete pa11yDefaults.useIncognitoBrowserContext;
delete pa11yDefaults.chromeLaunchConfig;

const startedAt = new Date().toISOString();
const pageResults = new Array(urls.length);
let completed = 0;

if (!urls.length) throw new Error(`No configured accessibility URL matches "${matchPattern}".`);
if (updateBaseline && matchPattern) throw new Error("Refusing to update the baseline from a filtered audit.");

function pageKey(url) {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
}

function rootCause(code = "") {
  if (/1_4_3|G18|G145/.test(code)) return "color-contrast";
  if (/H91\.(Input|Select|Textarea)|F68/.test(code)) return "form-accessible-name";
  if (/1_3_1|H42|H69/.test(code)) return "structure-and-semantics";
  if (/4_1_2|ARIA/i.test(code)) return "name-role-value-and-aria";
  if (/2_1|keyboard|focus/i.test(code)) return "keyboard-and-focus";
  if (/1_1_1|H37|H30/.test(code)) return "text-alternatives";
  return "other";
}

function issueBuckets(results) {
  const buckets = {};
  for (const result of results) {
    for (const issue of result.issues) {
      buckets[result.path] ||= {};
      buckets[result.path][issue.code] = (buckets[result.path][issue.code] || 0) + 1;
    }
  }
  return buckets;
}

function groupIssues(results) {
  const groups = {};
  for (const result of results) {
    for (const issue of result.issues) {
      const group = rootCause(issue.code);
      groups[group] ||= { count: 0, pages: new Set(), codes: {} };
      groups[group].count += 1;
      groups[group].pages.add(result.path);
      groups[group].codes[issue.code] = (groups[group].codes[issue.code] || 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(groups).map(([name, value]) => [name, {
    count: value.count,
    pages: [...value.pages].sort(),
    codes: Object.fromEntries(Object.entries(value.codes).sort((a, b) => b[1] - a[1])),
  }]));
}

async function writeReport() {
  const finished = pageResults.filter(Boolean);
  const technicalFailures = finished.filter((result) => result.error);
  const issueCount = finished.reduce((sum, result) => sum + result.issues.length, 0);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    startedAt,
    configuration: {
      standard: config.defaults?.standard,
      configuredUrls: urls.length,
      concurrency,
      reducedMotion: true,
      webglDisabled: true,
    },
    summary: {
      completed: finished.length,
      cleanPages: finished.filter((result) => !result.error && result.issues.length === 0).length,
      pagesWithIssues: finished.filter((result) => result.issues.length > 0).length,
      issueCount,
      technicalFailures: technicalFailures.length,
    },
    groupedRootCauses: groupIssues(finished),
    results: finished,
  };
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function launchBrowser() {
  return puppeteer.launch(launchOptions);
}

async function auditPage(browser, entry) {
  const page = await browser.newPage();
  try {
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.setViewport(pa11yDefaults.viewport || { width: 1280, height: 1024 });
    await page.goto(entry.url, { waitUntil: "domcontentloaded", timeout: pa11yDefaults.timeout || 30000 });
    // Let redirects and client-rendered controls settle before Pa11y binds its
    // evaluation context. Waiting inside Pa11y lets a late redirect destroy that
    // context and turns an accessible page into a misleading technical failure.
    if (pa11yDefaults.wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, pa11yDefaults.wait));
    }
    const result = await pa11y(entry.url, {
      ...pa11yDefaults,
      ...entry,
      browser,
      page,
      ignoreUrl: true,
      wait: 0,
    });
    return {
      url: entry.url,
      path: pageKey(entry.url),
      title: result.documentTitle,
      issues: result.issues,
      error: null,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

async function worker(workerNumber) {
  let browser = await launchBrowser();
  try {
    for (let index = workerNumber; index < urls.length; index += concurrency) {
      const entry = urls[index];
      let result;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          result = await auditPage(browser, entry);
          break;
        } catch (error) {
          if (attempt === 2) {
            result = {
              url: entry.url,
              path: pageKey(entry.url),
              title: null,
              issues: [],
              error: error?.message || String(error),
            };
            break;
          }
          await browser.close().catch(() => {});
          browser = await launchBrowser();
        }
      }
      pageResults[index] = result;
      completed += 1;
      const label = result.error ? `ERROR: ${result.error}` : `${result.issues.length} issue(s)`;
      console.log(`[${completed}/${urls.length}] ${result.path} — ${label}`);
      await writeReport();
    }
  } finally {
    await browser.close().catch(() => {});
  }
}

await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index)));
const report = await writeReport();
const currentBuckets = issueBuckets(report.results);

if (updateBaseline) {
  const baseline = {
    schemaVersion: 1,
    updatedAt: report.generatedAt,
    note: "Maximum existing Pa11y issue counts by page and rule. New pages/rules and count increases fail the audit.",
    configuredUrlCount: urls.length,
    allowed: currentBuckets,
  };
  await fs.writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Updated accessibility baseline: ${path.relative(root, baselinePath)}`);
}

let regressions = [];
if (!ignoreBaseline && !updateBaseline) {
  let baseline;
  try {
    baseline = JSON.parse(await fs.readFile(baselinePath, "utf8"));
  } catch (error) {
    console.error(`Accessibility baseline is missing or invalid: ${error.message}`);
    process.exitCode = 1;
  }
  if (baseline) {
    if (urls.length < (baseline.configuredUrlCount || 0)) {
      regressions.push({
        page: ".pa11yci.json",
        code: "configured-url-count",
        count: urls.length,
        allowed: `at least ${baseline.configuredUrlCount}`,
      });
    }
    for (const [page, codes] of Object.entries(currentBuckets)) {
      for (const [code, count] of Object.entries(codes)) {
        const allowed = baseline.allowed?.[page]?.[code] || 0;
        if (count > allowed) regressions.push({ page, code, count, allowed });
      }
    }
  }
}

console.log(`\nAudited ${report.summary.completed}/${urls.length} pages: ${report.summary.cleanPages} clean, ${report.summary.issueCount} issue(s), ${report.summary.technicalFailures} technical failure(s).`);
console.log(`Machine-readable report: ${path.relative(root, reportPath)}`);
if (regressions.length) {
  console.error(`Accessibility ratchet found ${regressions.length} regression(s):`);
  for (const item of regressions) console.error(`- ${item.page}: ${item.code} (${item.count}; expected ${item.allowed})`);
}

if (report.summary.technicalFailures > 0 || regressions.length > 0 || (ignoreBaseline && report.summary.issueCount > 0)) {
  process.exitCode = 2;
}
