import {chromium} from 'playwright';import {findChromium} from './lib/find-chromium.mjs';
const b=await chromium.launch({executablePath:findChromium()});const p=await b.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
await p.goto('http://localhost:8080/lessons/cosmology/solar-system/mars.html');await p.screenshot({path:'/tmp/solar-final-desktop.png'});
await p.setViewportSize({width:390,height:900});await p.screenshot({path:'/tmp/solar-final-mobile.png'});
await p.setViewportSize({width:1440,height:900});
for(const [slug,focus] of [['asteroid-belt','ceres'],['kuiper-belt','pluto']]){
 await p.goto(`http://localhost:8080/lessons/cosmology/solar-system/${slug}.html`);
 await p.locator(`[data-focus="${focus}"]`).click();
 console.log(slug, 'focus', await p.locator(`[data-focus="${focus}"]`).getAttribute('aria-pressed'));
 await p.screenshot({path:`/tmp/solar-final-${slug}.png`});
}
await p.goto('http://localhost:8080/lessons/cosmology/solar-system/earth.html');await p.locator('#earth-spin').click();console.log('earth rotation',await p.locator('#earth-spin').getAttribute('aria-pressed'));await p.locator('[role=tab][data-system=rock]').click();console.log('earth rock',await p.locator('[role=tab][data-system=rock]').getAttribute('aria-selected'));await b.close();
