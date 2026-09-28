const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  const browser = await chromium.launch({
    executablePath: path.join(os.homedir(), '.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'),
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  console.log("Navigating to volcano-simulator...");
  await page.goto('http://localhost:8080/lessons/earth-science/volcano-simulator.html', { waitUntil: 'networkidle' });
  
  await page.waitForTimeout(3000); // let it render and images load
  
  await page.screenshot({ path: 'screenshot.png', fullPage: true });
  console.log("Saved screenshot.png");
  
  await browser.close();
})();
