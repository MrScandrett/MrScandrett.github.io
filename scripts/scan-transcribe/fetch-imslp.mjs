#!/usr/bin/env node
// Download an IMSLP file by its index number (the number in "IMSLP #589177").
// IMSLP only hands out the PDF after a JavaScript redirect and a disclaimer click, so curl gets an
// HTML stub. This drives the real page in Playwright, accepts the disclaimer, waits for the
// ks*.imslp.org link (it appears ~20-30 s later), and fetches it with the same browser session.
//
//   node scripts/scan-transcribe/fetch-imslp.mjs 589177 tmp/scan-transcribe/blues-and-stomps.pdf
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { findChromium } from '../../lib/find-chromium.mjs';

const [index, out] = process.argv.slice(2);
if (!/^\d+$/.test(index || '') || !out) {
  console.error('usage: fetch-imslp.mjs <imslp-index> <out.pdf>');
  process.exit(2);
}

const browser = await chromium.launch({ executablePath: findChromium() });
try {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto('https://imslp.org/wiki/Special:ImagefromIndex/' + index, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  const accept = await page.$('a[href*="IMSLPDisclaimerAccept"]');
  if (accept) await accept.click().catch(() => {});

  let url = null;
  for (let i = 0; i < 45 && !url; i++) {
    await page.waitForTimeout(1000);
    url = await page.$$eval('a', as => (as.map(a => a.href).find(h => /imslp\.[a-z]+\/files\/.+\.pdf$/i.test(h)) || null)).catch(() => null);
  }
  if (!url) throw new Error('no PDF link appeared on ' + page.url() + ' (IMSLP may want a login for this file)');

  const res = await ctx.request.get(url);
  if (!res.ok()) throw new Error('HTTP ' + res.status() + ' for ' + url);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, await res.body());
  console.log('saved', out, 'from', url);
} finally {
  await browser.close();
}
