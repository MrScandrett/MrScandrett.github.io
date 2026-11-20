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
  "chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  "chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium",
  "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  "chrome-win/chrome.exe",
  "chrome-win64/chrome.exe",
];

// Playwright's headless shell: headless only, so it is the last resort.
const SHELL_BINARIES = [
  "chrome-headless-shell-mac-arm64/chrome-headless-shell",
  "chrome-headless-shell-mac-x64/chrome-headless-shell",
  "chrome-headless-shell-linux64/chrome-headless-shell",
  "chrome-headless-shell-win64/chrome-headless-shell.exe",
  "chrome-linux/headless_shell",
  "chrome-mac/headless_shell",
];

const SYSTEM_BROWSERS = [
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  path.join(os.homedir(), "Applications", "Google Chrome.app", "Contents", "MacOS", "Google Chrome"),
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function newestCachedChromium(cacheDir, prefix = "chromium", binaries = BINARIES) {
  let entries;
  try {
    entries = fs.readdirSync(cacheDir);
  } catch {
    return null;
  }
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  const builds = entries
    .map((name) => ({ name, build: Number(pattern.exec(name)?.[1]) }))
    .filter((entry) => entry.build)
    .sort((a, b) => b.build - a.build);
  for (const { name } of builds) {
    for (const binary of binaries) {
      const candidate = path.join(cacheDir, name, binary);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * Returns the first usable Chromium executable, or null. An explicit path in any
 * of `envVars` wins; then the newest cached Playwright build; then an installed
 * Chrome (Linux, macOS, Windows); then Playwright's headless shell, which only
 * runs headless but is all `npx playwright install` leaves on some machines.
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
  const system = SYSTEM_BROWSERS.find((candidate) => fs.existsSync(candidate));
  if (system) return system;
  for (const dir of cacheDirs) {
    const found = newestCachedChromium(dir, "chromium_headless_shell", SHELL_BINARIES);
    if (found) return found;
  }
  return null;
}
