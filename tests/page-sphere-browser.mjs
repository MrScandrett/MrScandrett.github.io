/* Drives the 360° page sphere in a real browser (software WebGL).
 * Run with a local server:  node serve-local.js  then
 *   SPHERE_URL=http://localhost:8080 node tests/page-sphere-browser.mjs */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { findChromium } from '../lib/find-chromium.mjs';

const base = process.env.SPHERE_URL || 'http://localhost:8080';
const browser = await chromium.launch({
  headless: true,
  executablePath: findChromium(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});
const problems = [];
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && /Tainted|WebGL|THREE/.test(m.text())) problems.push(`console: ${m.text()}`); });

  const sphere = src => page.goto(`${base}/vr/page-sphere.html?src=${encodeURIComponent(src)}`);
  const drawn = () => page.waitForFunction(() => /screens? around you/.test(document.getElementById('vr-status').textContent), null, { timeout: 30000 });
  // How many distinct colours a screen holds: a blank or failed draw has one or two.
  const colours = index => page.evaluate(async i => {
    const url = window.ClassroomOSPageSphere.tileImage(i);
    const img = await new Promise(ok => { const el = new Image(); el.onload = () => ok(el); el.src = url; });
    const c = document.createElement('canvas'); c.width = 320; c.height = 180;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, 320, 180);
    const d = g.getImageData(0, 0, 320, 180).data; const seen = new Set();
    for (let k = 0; k < d.length; k += 4) seen.add((d[k] >> 3) + ',' + (d[k + 1] >> 3) + ',' + (d[k + 2] >> 3));
    return seen.size;
  }, index);

  // 1. The home page is drawn: several screens, the first one full of real content.
  await sphere('index.html');
  await drawn();
  assert.equal(await page.locator('#vr-immersive-launch #vr-enter').count(), 1, 'the immersive entry button is prominent over the preview');
  assert.match(await page.locator('#vr-immersive-launch').innerText(), /second press.*leave the browser panel/is);
  // The first draw can catch a half-loaded page; the sphere redraws as it settles.
  await page.waitForFunction(() => window.ClassroomOSPageSphere.tileCount() >= 2, null, { timeout: 20000 })
    .catch(() => assert.fail('the home page needs more than one screen'));
  assert.ok(await colours(0) > 40, 'screen 0 holds a drawn page, not a blank');
  assert.match(await page.textContent('#vr-status'), /ClassroomOS/);

  // 2. A click on a same-site link navigates inside the sphere and redraws it.
  const link = await page.evaluate(() => {
    const doc = document.querySelector('iframe').contentDocument;
    const r = doc.querySelector('.site-nav a[href="steam-lessons.html"], nav a[href="steam-lessons.html"]').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.evaluate(p => window.ClassroomOSPageSphere.clickPage(p.x, p.y), link);
  await page.waitForFunction(() => /STEAM Lessons/.test(document.getElementById('sphere-page').textContent), null, { timeout: 15000 });
  assert.match(page.url(), /src=steam-lessons\.html/, 'the address follows the page');
  await drawn();
  assert.ok(await colours(0) > 40, 'the new page is drawn');

  // 3. Only this site can be shown.
  await sphere('https://example.com/');
  await page.waitForFunction(() => /only open pages from this site/.test(document.getElementById('vr-status').textContent));
  assert.equal(await page.locator('iframe').count(), 0, 'no frame is created for a foreign page');

  // 4. VR mode stays out of the hidden frame, even with the preference forced on.
  await context.addInitScript(() => { try { localStorage.setItem('classroomos-vr-mode', 'on'); } catch { /* ok */ } });
  await sphere('index.html');
  await drawn();
  // nav-mobile.js injects vr-mode.js when the browser is idle, so wait for it to arrive.
  await page.waitForFunction(() => {
    const win = document.querySelector('iframe').contentWindow;
    return !!win.ClassroomOSVR;
  }, null, { timeout: 15000 });
  const inFrame = await page.evaluate(() => {
    const win = document.querySelector('iframe').contentWindow;
    return { on: win.ClassroomOSVR && win.ClassroomOSVR.enabled(), menu: !!win.document.querySelector('.vr-menu'), zoom: win.document.documentElement.style.zoom };
  });
  assert.deepEqual(inFrame, { on: false, menu: false, zoom: '' });

  // 5. The VR menu on an ordinary page offers the sphere for that page; the sphere's own menu doesn't.
  await page.goto(`${base}/steam-lessons.html`);
  await page.waitForSelector('.vr-menu');
  const href = await page.locator('.vr-menu-panel a[href*="page-sphere"]').getAttribute('href', { timeout: 5000 });
  assert.match(decodeURIComponent(href), /page-sphere\.html\?src=steam-lessons\.html/);
  await sphere('index.html');
  await page.waitForSelector('.vr-menu');
  assert.equal(await page.locator('.vr-menu-panel a[href*="page-sphere"]').count(), 0);

  // 6. The theme is the world: Lava Lamp fills the dome with wax, and a theme changed elsewhere
  //    (another tab, or Settings inside the sphere) re-colours it live.
  const themed = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await themed.addInitScript(() => { try { localStorage.setItem('classroomos-lighting-mode', 'manual'); localStorage.setItem('classroomos-lighting-phase', 'lavalamp'); } catch { /* ok */ } });
  const lava = await themed.newPage();
  lava.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  lava.on('console', m => { if (m.type() === 'error' && /shader|THREE|WebGL/i.test(m.text())) problems.push(`console: ${m.text().slice(0, 300)}`); });
  await lava.goto(`${base}/vr/page-sphere.html?src=index.html`);
  await lava.waitForFunction(() => /screens? around you/.test(document.getElementById('vr-status').textContent), null, { timeout: 30000 });
  const world = () => lava.evaluate(() => ({ look: window.ClassroomOSPageSphereEnv.env.look, name: document.getElementById('sphere-theme').textContent, wax: window.ClassroomOSPageSphereEnv.env.uniforms.uCount.value }));
  const first = await world();
  assert.deepEqual([first.look, first.name], [5, 'Lava Lamp'], 'Lava Lamp is wax in 360°');
  assert.ok(first.wax > 4, 'there is wax (blobs merge, so the count varies) as well as the heater lumps');

  const elsewhere = await themed.newPage();
  await elsewhere.goto(`${base}/index.html`);
  await elsewhere.evaluate(() => localStorage.setItem('classroomos-lighting-phase', 'vaporwave'));
  await lava.waitForFunction(() => window.ClassroomOSPageSphereEnv.env.look === 3, null, { timeout: 10000 });
  assert.equal((await world()).name, 'Vaporwave', 'a theme changed in another tab re-colours the sphere');
  await elsewhere.evaluate(() => localStorage.setItem('classroomos-lighting-phase', 'day'));
  await lava.waitForFunction(() => window.ClassroomOSPageSphereEnv.env.look === 0, null, { timeout: 10000 });

  // 7. Motion: Still freezes the world, Full runs it, and Auto obeys reduced motion.
  const clock = () => lava.evaluate(() => window.ClassroomOSPageSphereEnv.env.uniforms.uTime.value);
  const settle = ms => lava.waitForTimeout(ms);
  await lava.selectOption('#sphere-motion', 'full');
  // (Software WebGL manages only a few frames a second, so test "it moves", not how far.)
  const t0 = await clock();
  await lava.waitForFunction(t => window.ClassroomOSPageSphereEnv.env.uniforms.uTime.value > t, t0, { timeout: 10000 })
    .catch(() => assert.fail('Full motion runs the world'));
  await lava.selectOption('#sphere-motion', 'still');
  await settle(500); // let any frame already in flight land
  const frozen = await clock(); await settle(1500);
  assert.equal(await clock(), frozen, 'Still freezes it');
  await lava.selectOption('#sphere-motion', 'auto');
  assert.equal(await lava.evaluate(() => window.ClassroomOSPageSphereEnv.motionScale()), 1, 'Auto runs at full speed on a flat screen');
  await elsewhere.evaluate(() => localStorage.setItem('classroomos-reduced-motion', 'on'));
  await lava.waitForFunction(() => window.ClassroomOSPageSphereEnv.motionScale() === 0, null, { timeout: 5000 });
  await themed.close();

  assert.deepEqual(problems, [], problems.join('\n'));
  console.log('page sphere: all browser checks passed');
} finally {
  await browser.close();
}
