import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: findChromium(), headless: true, args: ['--no-sandbox'] });
const output = '/tmp/goldfish-theme-qa';
await fs.mkdir(output, { recursive: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('status of 429') && !msg.text().includes('Failed to load resource')) {
      errors.push(msg.text());
    }
  });

  // Start with clean state
  await page.addInitScript(() => {
    localStorage.removeItem('classroomos-canvas-bg');
    localStorage.setItem('classroomos-reduced-motion', 'off');
    localStorage.setItem('classroomos-lighting-mode', 'manual');
  });

  await page.goto('http://127.0.0.1:8080/');
  await page.waitForTimeout(1000);

  // Switch to goldfish theme
  console.log('Switching to goldfish theme...');
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'goldfish';
    window.dispatchEvent(new CustomEvent('classroomos:lightingchange', { detail: { theme: 'goldfish' } }));
  });
  await page.waitForTimeout(1000);

  // Check current background is 'goldfish'
  const currentBg = await page.evaluate(() => window.ClassroomOSCanvasBg.get());
  console.log('Current background for goldfish theme:', currentBg);
  if (currentBg !== 'goldfish') throw new Error(`Expected background 'goldfish' but got '${currentBg}'`);

  // Verify canvas is mounted and animating
  const canvasExists = await page.evaluate(() => !!document.querySelector('#site-canvas-bg, #hero-canvas'));
  if (!canvasExists) throw new Error('Canvas element not found on page');

  // Verify canvas frames change (pixel movement / animation)
  const snap1 = await page.evaluate(() => document.querySelector('#site-canvas-bg, #hero-canvas').toDataURL());
  await page.waitForTimeout(600);
  const snap2 = await page.evaluate(() => document.querySelector('#site-canvas-bg, #hero-canvas').toDataURL());
  if (snap1 === snap2) throw new Error('No pixel movement on goldfish canvas animation');
  console.log('Verified goldfish canvas animation has live pixel movement.');

  await page.screenshot({ path: `${output}/goldfish-home.png` });

  // Open settings panel and verify goldfish background option
  console.log('Checking settings panel...');
  await page.locator('.nav-settings-toggle').click();
  await page.waitForTimeout(500);

  // Go to background tab
  const bgTab = page.locator('[data-tab="background"], [data-settings-tab="background"]').first();
  if (await bgTab.count()) await bgTab.click();
  else await page.getByRole('tab', { name: 'Background', exact: true }).click();
  await page.waitForTimeout(400);

  // Check goldfish chip exists
  const goldfishChip = page.locator('.nav-canvas-chip[data-canvas-bg="goldfish"]');
  const chipCount = await goldfishChip.count();
  if (!chipCount) throw new Error('Goldfish background chip missing in settings panel');
  console.log('Goldfish background chip found in settings panel.');

  // Test interactive mouse movement over canvas
  await page.mouse.move(300, 300);
  await page.waitForTimeout(200);
  await page.mouse.move(350, 320);
  await page.waitForTimeout(200);

  // Test resize
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const snapMobile = await page.evaluate(() => document.querySelector('#site-canvas-bg, #hero-canvas').toDataURL());
  await page.waitForTimeout(400);
  const snapMobile2 = await page.evaluate(() => document.querySelector('#site-canvas-bg, #hero-canvas').toDataURL());
  if (snapMobile === snapMobile2) throw new Error('No animation on mobile viewport after resize');
  await page.screenshot({ path: `${output}/goldfish-mobile.png` });
  console.log('Mobile viewport resize verified.');

  // Test reduce motion
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('classroomos:reducedmotionchange', { detail: { reducedMotion: true } })));
  await page.waitForTimeout(300);

  if (errors.length) throw new Error('Page errors encountered:\n' + errors.join('\n'));
  console.log('All goldfish theme checks passed successfully!');
  await page.close();
} finally {
  await browser.close();
}
