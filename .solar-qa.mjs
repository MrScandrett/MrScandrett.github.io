import { chromium } from 'playwright';
import { findChromium } from './lib/find-chromium.mjs';
const browser=await chromium.launch({executablePath:findChromium(),headless:true});
const page=await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const slugs=['mercury','venus','earth','mars','asteroid-belt','jupiter','saturn','uranus','neptune','kuiper-belt'];
for(const width of [1440,390]){
 await page.setViewportSize({width,height:900});
 for(const slug of slugs){
  await page.goto(`http://localhost:8080/lessons/cosmology/solar-system/${slug}.html`);
  await page.locator('#sv-au').waitFor();
  const initial=await page.locator('#sv-au').innerText();
  await page.locator('#sv-home').click();
  if(await page.locator('#sv-au').innerText()!=='1.00 AU')throw Error('Earth compare');
  await page.locator('#sv-reset').click();
  if(await page.locator('#sv-au').innerText()!==initial)throw Error('Reset');
  await page.locator('#sv-range').focus();await page.keyboard.press('ArrowRight');
  await page.locator('.sv-question summary').click();
  if(!await page.locator('.sv-question details').evaluate(e=>e.open))throw Error('Disclosure');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth || [...document.querySelectorAll('.cl-page,.earth-page,.belt-page,.kb-page')].some(e=>e.scrollWidth>e.clientWidth+2));
  if(overflow)throw Error(`overflow ${slug} ${width}`);
  const missing=await page.locator('.sv-world img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src));
  console.log(width,slug,initial,'missing',missing.length);
  if(slug==='mars'){
   await page.locator('.sv-route').scrollIntoViewIfNeeded();
   await page.screenshot({path:`/tmp/solar-${width}.png`});
   await page.locator('.sv-world img').click();
   await page.screenshot({path:`/tmp/solar-lightbox-${width}.png`});
   await page.keyboard.press('Escape');
  }
 }
}
console.log('Page errors:',errors);await browser.close();
