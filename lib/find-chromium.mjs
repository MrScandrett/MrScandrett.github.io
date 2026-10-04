// Locate a full Chromium build for Playwright/Puppeteer checks.
//
// Only the full Chromium build is cached (not Playwright's headless shell, not
// Puppeteer's own Chrome), and its folder name (chromium-NNNN) changes with every
// Playwright upgrade, so search for the newest one instead of pinning a build.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BINARIES = [
  "chrome-linux64/chrome",
  "chrome-linux/chrome",
  "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
  "chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium",
  "chrome-win/chrome.exe",
  "chrome-win64/chrome.exe",
];

const SYSTEM_BROWSERS = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];

function newestCachedChromium(cacheDir) {
  let entries;
  try {
    entries = fs.readdirSync(cacheDir);
  } catch {
    return null;
  }
  const builds = entries
    .map((name) => ({ name, build: Number(/^chromium-(\d+)$/.exec(name)?.[1]) }))
    .filter((entry) => entry.build)
    .sort((a, b) => b.build - a.build);
  for (const { name } of builds) {
    for (const binary of BINARIES) {
      const candidate = path.join(cacheDir, name, binary);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * Returns the first usable Chromium executable, or null. An explicit path in any
 * of `envVars` wins; then the newest cached Playwright build; then system Chrome.
 */
export function findChromium(envVars = []) {
  for (const name of envVars) {
    const value = process.env[name];
    if (value && fs.existsSync(value)) return value;
  }
  const cacheDirs = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), ".cache", "ms-playwright"),
    path.join(os.homedir(), "Library", "Caches", "ms-playwright"),
  ].filter(Boolean);
  for (const dir of cacheDirs) {
    const found = newestCachedChromium(dir);
    if (found) return found;
  }
  return SYSTEM_BROWSERS.find((candidate) => fs.existsSync(candidate)) || null;
}
