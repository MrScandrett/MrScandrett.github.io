const pa11y = require('pa11y');
const puppeteer = require('puppeteer');
const { chromium } = require('playwright');
const base = process.env.WEB_BLOCKS_URL || 'http://localhost:8094';
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox'] });
  let failures = 0;
  try {
    for (const slug of ['web-first-site', 'build-your-student-page']) {
      for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 900 }]) {
        const result = await pa11y(`${base}/lessons/${slug}.html`, { browser, rootElement: '#website-blocks', viewport, actions: ['click element [data-wb-open]', 'wait for element [data-wb-app] to be visible'], wait: 500, timeout: 30000 });
        failures += result.issues.length;
        console.log(`${slug} at ${viewport.width}px: ${result.issues.length} accessibility issues`);
        if (result.issues.length) console.log(JSON.stringify(result.issues, null, 2));
      }
    }
  } finally { await browser.close(); }
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
