// Run node serve-local.js first. Real screen and print coverage for the shared planner.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';
const browser = await chromium.launch({ executablePath: findChromium() });
try {
  for (const width of [1754, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1100 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/fingering-test', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/assets/css/music-notation.css"><link rel="stylesheet" href="/assets/css/score-engine.css"><script src="/assets/js/music-notation.js"></script><script src="/assets/js/music-synth.js"></script><script src="/assets/js/score-navigation.js"></script><script src="/assets/js/score-engine.js"></script><body></body>` }));
    await page.goto('http://127.0.0.1:8080/fingering-test');
    await page.waitForFunction(() => window.ScoreEngine && window.MusicNotation);
    await page.evaluate(async () => {
      const lib = (await (await fetch('/data/score-library.json')).json()).scores;
      localStorage.setItem('classroomos-score-fingering', 'on');
      localStorage.setItem('classroomos-score-fingering-reach', '12');
      document.body.innerHTML = '<main><figure id="raindrop"></figure><figure id="mozart"></figure></main>';
      document.body.style.cssText = 'margin:0;padding:8px';
      MusicNotation.setPreferences({ pitchNames: true, noteColors: true });
      for (const [name, id] of [['raindrop', 'chopin-prelude-15'], ['mozart', 'mozart-turkish-march']]) {
        ScoreEngine.render(document.getElementById(name), { ...lib[id], id });
      }
      window.print = () => {};
    });
    await page.waitForFunction(() => document.querySelectorAll('.se-fingering-toggle').length === 2 &&
      document.querySelectorAll('#mozart .se-finger-number').length > 0);
    for (const name of ['raindrop', 'mozart']) {
      const fig = page.locator('#' + name);
      assert.equal(await fig.locator('.se-fingering-toggle').count(), 1);
      assert.ok(await fig.locator('.se-finger-number').count());
      await fig.locator('.se-settings > summary').click();
      assert.equal(await fig.locator('.se-fingering-reach select').inputValue(), '12');
      const outside = await fig.evaluate(f => {
        const svg = f.querySelector('.se-score'), vb = svg.viewBox.baseVal;
        return [...svg.querySelectorAll('.se-finger-number')].filter(n => {
          const b = n.getBBox(); return b.y < vb.y - 1 || b.y + b.height > vb.y + vb.height + 1;
        }).length;
      });
      assert.equal(outside, 0, name + ': marks outside paper');
    }
    await page.locator('#raindrop .se-settings').evaluate(d => { d.open = true; });
    const initial = await page.locator('#raindrop .se-finger-number[aria-label]').count();
    await page.locator('#raindrop .se-fingering-reach select').selectOption('7');
    await page.waitForFunction(() => document.querySelector('#mozart .se-fingering-reach select').value === '7');
    assert.ok(await page.locator('#raindrop .se-finger-number[aria-label]').count() >= initial);
    await page.locator('#mozart .se-settings').evaluate(d => { d.open = true; });
    await page.locator('#mozart .se-print-score-button').click();
    assert.ok(await page.locator('.se-print-score-pages').count(), 'Print failed: ' + errors.join('; '));
    assert.ok(await page.locator('.se-print-score-pages .se-finger-number').count());
    assert.match(await page.locator('.se-print-score-pages').innerText(), /Comfortable reach: fifth/);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await page.locator('#raindrop .se-settings').evaluate(d => { d.open = true; });
    await page.locator('#raindrop .se-fingering-reach select').selectOption('12');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    // Review the system containing the original example without toolbar overlays.
    await page.locator('#raindrop').evaluate(f => {
      const ev = f.scoreLayout.events.find(e => e.bar === 7 && e.kind === 'note');
      const system = f.scoreLayout.systems[ev.sys];
      const svg = f.querySelector('.se-score').cloneNode(true);
      svg.setAttribute('viewBox', `0 ${system.top} ${f.scoreLayout.width} ${system.bottom - system.top}`);
      svg.setAttribute('width', f.scoreLayout.width);
      svg.setAttribute('height', system.bottom - system.top);
      svg.style.cssText = 'width:100%;height:auto;display:block';
      document.body.replaceChildren(svg);
      window.scrollTo(0, 0);
    });
    await page.screenshot({ path: `/tmp/score-fingering-${width}.png` });
    assert.deepEqual(errors, []);
    console.log(`Fingering ${width}px: Raindrop Prelude and Mozart, shared settings, reach warnings, screen bounds and print passed`);
    await page.close();
  }
} finally { await browser.close(); }
