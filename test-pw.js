const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/home/evanscandrett/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  await page.goto('http://127.0.0.1:8081/lessons/earth-science/volcano-simulator.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await browser.close();
})();
