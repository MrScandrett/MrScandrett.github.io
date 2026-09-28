const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  const browser = await chromium.launch({
    executablePath: path.join(os.homedir(), '.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'),
    headless: true
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  console.log("Navigating to volcano-simulator...");
  await page.goto('http://localhost:8080/lessons/earth-science/volcano-simulator.html', { waitUntil: 'networkidle' });
  
  await page.waitForTimeout(2000);
  
  if (errors.length > 0) {
    console.error("Sanity check failed with errors:");
    errors.forEach(e => console.error(" - " + e));
    process.exit(1);
  } else {
    console.log("Sanity check passed! No errors.");
  }
  
  await browser.close();
})();
