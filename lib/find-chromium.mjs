// Locate a full Chromium build for Playwright/Puppeteer checks.
import { spawnSync } from "node:child_process";
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

// Playwright's headless shell: for automated headless checks.
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

// Chromium registers this per-process Mach service before opening its first page.
let machRegistrationDenied;
function checkMacBrowserLaunch() {
  if (process.platform !== "darwin" || !process.env.CODEX_SESSION_ID) return;
  if (machRegistrationDenied === undefined) {
    const probe = spawnSync("python3", ["-c", `
import ctypes, os, sys
system = ctypes.CDLL("/usr/lib/libSystem.B.dylib")
bootstrap = ctypes.c_uint.in_dll(system, "bootstrap_port")
service = f"org.chromium.Chromium.MachPortRendezvousServer.{os.getpid()}".encode()
result = system.bootstrap_check_in(bootstrap, service, ctypes.byref(ctypes.c_uint()))
sys.exit(42 if result == 1100 else 0)  # BOOTSTRAP_NOT_PRIVILEGED
`], { stdio: "ignore", timeout: 3000 });
    machRegistrationDenied = probe.status === 42;
  }
  if (machRegistrationDenied) {
    throw new Error("macOS denied Chromium startup in this test session. Run the browser check from Terminal or CI.");
  }
}

/**
 * Returns the first usable Chromium executable, or null. An explicit path in any
 * of `envVars` wins; then the newest cached Playwright build; then the cached
 * headless shell for automated checks; then an installed Chrome.
 */
export function findChromium(envVars = []) {
  checkMacBrowserLaunch();
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
  for (const dir of cacheDirs) {
    const found = newestCachedChromium(dir, "chromium_headless_shell", SHELL_BINARIES);
    if (found) return found;
  }
  return SYSTEM_BROWSERS.find((candidate) => fs.existsSync(candidate)) || null;
}
