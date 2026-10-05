import { chromium } from 'playwright';
import { findChromium } from './lib/find-chromium.mjs';

const out = process.argv[2] || 'shot';
const actions = process.argv[3] || '';
const width = Number(process.argv[4] || 1400);
const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage({ viewport: { width, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(new URL('./lessons/physics/mechanics/newtons-laws.html', import.meta.url).href, { waitUntil: 'load' });
const sel = (await page.$('#nl-lab')) ? '#nl-lab' : '.nl-sandbox';
await page.locator(sel).scrollIntoViewIfNeeded();
for (const step of actions.split(';').filter(Boolean)) {
  const [kind, arg, arg2] = step.split('|');
  if (kind === 'click') await page.click(arg);
  else if (kind === 'wait') await page.waitForTimeout(Number(arg));
  else if (kind === 'fill') { await page.fill(arg, arg2); await page.dispatchEvent(arg, 'input'); }
  else if (kind === 'select') await page.selectOption(arg, arg2);
  else if (kind === 'eval') console.log(await page.evaluate(arg));
}
await page.locator(sel).screenshot({ path: `${out}.png` });
console.log('errors:', JSON.stringify(errors));
await browser.close();
