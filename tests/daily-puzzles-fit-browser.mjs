/* The full-screen crossword must fit every phone and iPad: whole grid, clue bar and all
 * three rows of keys on screen with nothing to scroll, at a cell size you can tap.
 * Run with a local server:  node serve-local.js  then
 *   PUZZLES_URL=http://localhost:8080 node tests/daily-puzzles-fit-browser.mjs */
import { chromium, devices } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const base = process.env.PUZZLES_URL || 'http://localhost:8080';
const ipad = devices['iPad Pro 11'];
const size = (d, width, height) => ({ ...d, viewport: { width, height } });

// [name, device, smallest acceptable cell in CSS px, layout]
// `stack`: grid above the clue bar and keys. `side`: grid beside them (touch, sideways).
const CASES = [
  ['iPhone SE (1st gen)', devices['iPhone SE'], 16, 'stack'],
  ['iPhone 8 / SE 3', devices['iPhone 8'], 24, 'stack'],
  ['iPhone 13 mini', devices['iPhone 13 Mini'], 22, 'stack'],
  ['iPhone 13', devices['iPhone 13'], 24, 'stack'],
  ['iPhone 15 Pro Max', devices['iPhone 15 Pro Max'], 30, 'stack'],
  ['Pixel 7', devices['Pixel 7'], 30, 'stack'],
  ['iPhone 13 sideways', devices['iPhone 13 landscape'], 16, 'side'],
  ['iPad mini', devices['iPad Mini'], 44, 'stack'],
  ['iPad mini sideways', devices['iPad Mini landscape'], 40, 'side'],
  ['iPad 10.2"', devices['iPad (gen 7)'], 44, 'stack'],
  ['iPad 10.2" sideways', devices['iPad (gen 7) landscape'], 40, 'side'],
  ['iPad Pro 11"', ipad, 50, 'stack'],
  ['iPad Pro 11" sideways', devices['iPad Pro 11 landscape'], 44, 'side'],
  ['iPad Pro 12.9"', size(ipad, 1024, 1366), 60, 'stack'],
  ['iPad Pro 12.9" sideways', size(ipad, 1366, 1024), 50, 'side'],
  ['iPad Split View half', size(ipad, 507, 1024), 40, 'stack'],
  ['iPad Slide Over', size(ipad, 375, 1024), 30, 'stack'],
];

const measure = () => {
  const root = document.querySelector('#home-puzzles');
  const box = (el) => el.getBoundingClientRect();
  const keys = [...root.querySelectorAll('.dp-key')].filter((k) => k.offsetParent).map(box);
  const panel = root.querySelector('.dp-panel');
  const grid = box(root.querySelector('.dp-xgrid'));
  const cell = box(root.querySelector('.dp-xcell'));
  const bar = box(root.querySelector('.dp-cluebar'));
  return {
    vw: innerWidth, vh: innerHeight,
    expanded: root.matches(':fullscreen, .creation-app-expanded'),
    keys: keys.length,
    keysTop: Math.min(...keys.map((k) => k.top)),
    keysBottom: Math.max(...keys.map((k) => k.bottom)),
    keysRight: Math.max(...keys.map((k) => k.right)),
    keyH: Math.min(...keys.map((k) => k.height)),
    gridBottom: grid.bottom, gridRight: grid.right, gridLeft: grid.left,
    cell: cell.height, barBottom: bar.bottom,
    panelOverflow: panel.scrollHeight - panel.clientHeight,
  };
};

const browser = await chromium.launch({ headless: true, executablePath: findChromium() });
const failures = [];
const fail = (name, msg) => failures.push(`${name}: ${msg}`);

async function open(device) {
  const context = await browser.newContext({ ...device });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/index.html`, { waitUntil: 'load' });
  await page.evaluate(() => document.querySelector('#home-puzzles').scrollIntoView());
  await page.waitForSelector('#home-puzzles .dp-xgrid .dp-xcell', { state: 'attached', timeout: 20000 });
  await page.evaluate(() => document.querySelector('#home-puzzles .creation-app-fullscreen').click());
  await page.waitForTimeout(500);
  return { context, page, errors };
}

try {
  for (const [name, device, minCell, layout] of CASES) {
    const { context, page, errors } = await open(device);
    const m = await page.evaluate(measure);
    const r = (n) => Math.round(n);
    if (!m.expanded) fail(name, 'full screen did not open');
    if (m.keys !== 27) fail(name, `expected 27 visible keys, saw ${m.keys}`);
    if (m.keysBottom > m.vh + 0.5) fail(name, `keys end at ${r(m.keysBottom)}px, below the ${m.vh}px screen`);
    if (m.keysRight > m.vw + 0.5) fail(name, `keys run off the right edge (${r(m.keysRight)} > ${m.vw})`);
    if (m.gridRight > m.vw + 0.5 || m.gridLeft < -0.5) fail(name, 'grid runs off the side of the screen');
    if (m.panelOverflow > 1) fail(name, `panel needs ${m.panelOverflow}px of scrolling`);
    if (m.cell < minCell) fail(name, `cells are ${r(m.cell)}px, want at least ${minCell}px`);
    if (m.keyH < 34) fail(name, `keys are ${r(m.keyH)}px tall, below a tappable 34px`);
    const stacked = m.keysTop >= m.gridBottom - 0.5;
    if (layout === 'stack' && !stacked) fail(name, 'expected the keys under the grid (upright layout)');
    if (layout === 'side' && stacked) fail(name, 'expected the keys beside the grid (sideways layout)');

    // Opening Tools adds a row; the grid gives up the room, the keys stay on screen.
    if (layout === 'stack') {
      await page.locator('#home-puzzles .dp-xtop .dp-btn', { hasText: 'Tools' }).click();
      const t = await page.evaluate(measure);
      if (t.keysBottom > t.vh + 0.5 || t.panelOverflow > 1) fail(name, 'keys pushed off screen with Tools open');
    }
    // Sudoku: the board, number pad and tools all on screen.
    await page.click('#dp-tab-sudoku');
    await page.waitForTimeout(300);
    const s = await page.evaluate(() => {
      const root = document.querySelector('#home-puzzles');
      const panel = root.querySelector('.dp-panel');
      const tools = [...root.querySelectorAll('.dp-sside .dp-btn')].filter((b) => b.offsetParent);
      return { overflow: panel.scrollHeight - panel.clientHeight, toolsBottom: Math.max(...tools.map((b) => b.getBoundingClientRect().bottom)), vh: innerHeight };
    });
    if (s.overflow > 1 || s.toolsBottom > s.vh + 0.5) fail(name, `sudoku tools pushed off screen (${s.overflow}px to scroll)`);

    if (errors.length) fail(name, `page errors: ${errors.join('; ')}`);
    console.log(`${name.padEnd(26)} cell ${String(r(m.cell)).padStart(2)}px  key ${r(m.keyH)}px  keys end ${r(m.keysBottom)}/${m.vh}`);
    await context.close();
  }

  // The clue list is its own screen on touch; it scrolls inside the panel, never the page.
  {
    const { context, page } = await open(devices['iPhone 13']);
    await page.locator('#home-puzzles .dp-xtop .dp-btn', { hasText: 'Clues' }).click();
    const ok = await page.evaluate(() => {
      const root = document.querySelector('#home-puzzles');
      const clues = root.querySelector('.dp-cluecols');
      return clues.offsetParent !== null && root.getBoundingClientRect().bottom <= innerHeight + 0.5;
    });
    if (!ok) fail('iPhone 13 clue list', 'clue list did not open inside the full-screen view');
    await context.close();
  }

  // Desktop (mouse and keyboard) keeps its own layout: no on-screen keys.
  {
    const { context, page } = await open({ viewport: { width: 1500, height: 950 } });
    const keys = await page.evaluate(() => [...document.querySelectorAll('#home-puzzles .dp-key')].filter((k) => k.offsetParent).length);
    if (keys) fail('desktop', `on-screen keys showed with a mouse (${keys})`);
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('\nFull-screen crossword and sudoku fit every phone and iPad checked.');
