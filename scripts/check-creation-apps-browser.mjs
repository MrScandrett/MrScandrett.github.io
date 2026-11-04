import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const root = path.resolve(import.meta.dirname, '..');
const base = process.env.CREATION_APPS_BASE_URL || 'http://127.0.0.1:8080/';
const lessons = JSON.parse(fs.readFileSync(path.join(root, 'data/creation-app-pages.json'), 'utf8'));
const standalone = ['workbench.html', 'forge.html', 'music-lab.html', 'OSeditor.html', 'code-bridge.html', 'apps/simple-paint-studio/', 'index.html#sandbox'];
const browser = await chromium.launch({ executablePath: findChromium(['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']) || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const failures = [];
try {
  for (const file of [...lessons.map(page => page.file), ...standalone]) {
    const page = await browser.newPage();
    try {
      await page.goto(new URL(file, base).href, { waitUntil: 'domcontentloaded' });
      const app = page.locator('[data-creation-app]');
      await app.waitFor({ state: 'visible' });
      if (!standalone.includes(file)) {
        const first = await app.evaluate(node => node.parentElement.tagName === 'MAIN' && node.parentElement.firstElementChild === node);
        if (!first) throw new Error('Application must precede the lesson.');
      }
      const button = app.locator('.creation-app-fullscreen').first();
      await button.click();
      await page.waitForFunction(() => document.fullscreenElement || document.querySelector('.creation-app-expanded'));
      await button.click();
      await page.waitForFunction(() => !document.fullscreenElement && !document.querySelector('.creation-app-expanded'));
      console.log(`PASS ${file}`);
    } catch (error) { failures.push(`${file}: ${error.message}`); }
    finally { await page.close(); }
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { get: () => false }));
  await page.goto(new URL('lessons/2d-design/vector-drawing-studio.html', base).href);
  await page.locator('.creation-app-fullscreen').click();
  await page.locator('.creation-app-expanded').waitFor();
  await page.locator('.creation-app-fullscreen').click();
  if (await page.locator('.creation-app-expanded').count()) failures.push('Mobile fallback failed to exit with its button.');
  await page.locator('.creation-app-fullscreen').click();
  await page.keyboard.press('Escape');
  if (await page.locator('.creation-app-expanded').count()) failures.push('Mobile fallback failed to exit with Escape.');
  await page.close();
} finally { await browser.close(); }
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`Passed ${lessons.length + standalone.length} creation workspaces and mobile fullscreen fallback.`);
