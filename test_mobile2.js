const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

(async () => {
  const browser = await chromium.launch({
    executablePath: path.join(os.homedir(), '.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'),
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }
  });
  const page = await context.newPage();
  
  await page.goto('http://localhost:8080/lessons/earth-science/volcano-simulator.html', { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'mobile_screenshot2.png', fullPage: false });
  console.log("Saved mobile_screenshot2.png");
  
  await browser.close();
})();
