import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { findChromium } from '../lib/find-chromium.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT_PATH = path.join(ROOT, 'assets/js/formula-explainer.js');
const CSS_PATH = path.join(ROOT, 'assets/css/components/formula-explainer.css');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8'
};

// A cached Playwright Chromium if there is one, else the installed Google Chrome.
// Returns null (and the test skips) when neither can start, instead of hanging.
async function launchBrowser(t) {
  const executablePath = findChromium(['CHROMIUM_PATH', 'CHROME_PATH']);
  const attempts = executablePath ? [{ executablePath }] : [{ channel: 'chrome' }];
  for (const options of attempts) {
    try {
      return await chromium.launch({ ...options, headless: true });
    } catch (err) {
      t.diagnostic(`browser launch failed: ${String(err.message).split('\n')[0]}`);
    }
  }
  t.skip('no Chromium or Chrome available');
  return null;
}

function startStaticServer(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        const cleanUrl = (req.url || '/').split('?')[0];
        let filePath = path.join(rootDir, decodeURIComponent(cleanUrl));
        const stat = await fs.stat(filePath).catch(() => null);
        if (stat && stat.isDirectory()) filePath = path.join(filePath, 'index.html');
        const data = await fs.readFile(filePath);
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

test('Stokes formula highlights every variable and element with synced legend, panel, slider, and 2D/3D canvas', async (t) => {
  const browser = await launchBrowser(t);
  if (!browser) return;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.setContent(`
      <!doctype html>
      <html>
        <head><meta charset="utf-8"></head>
        <body>
          <div class="cl-formula-box" role="img" data-formula="stokes-vt" data-formula-open aria-label="Stokes terminal velocity">
            <span class="cl-formula-sym">v<sub>t</sub> = 2r²(ρ<sub>s</sub> − ρ<sub>f</sub>)g / 9η</span>
            <div class="cl-formula-vars">
              <div><strong>v<sub>t</sub></strong> = terminal velocity (m/s)</div>
              <div><strong>r</strong> = sphere radius (m)</div>
              <div><strong>ρ<sub>s</sub></strong> = sphere density (kg/m³)</div>
              <div><strong>ρ<sub>f</sub></strong> = fluid density (kg/m³)</div>
              <div><strong>g</strong> = 9.8 m/s²</div>
              <div><strong>η</strong> = dynamic viscosity (Pa·s)</div>
            </div>
          </div>
          <div class="fl-formula-box" id="generic-gravity">
            <span class="fl-formula-sym">F = G · m₁m₂ / r²</span>
            <div class="fl-formula-vars">
              <div><strong>F</strong> = gravitational force (N)</div>
              <div><strong>r</strong> = distance between centers (m)</div>
            </div>
          </div>
          <div class="equation-box" id="word-eq">Force = Mass × Acceleration</div>
        </body>
      </html>
    `);
    await page.addStyleTag({ path: CSS_PATH });
    await page.addScriptTag({ path: SCRIPT_PATH });

    const closedPanel = page.locator('#word-eq .cos-fx-panel');
    assert.equal(await closedPanel.isVisible(), false);
    assert.ok((await closedPanel.locator('.cos-fx-title').textContent()).trim());

    const stokesTokens = page.locator('[data-formula="stokes-vt"] .cos-fx-token');
    const keys = await stokesTokens.evaluateAll(els => els.map(el => el.getAttribute('data-fx-key')));
    assert.deepEqual(keys, ['v_t', '=', '2', 'r^2', '(', 'ρ_s', '−', 'ρ_f', ')', 'g', '/', '9', 'η']);

    // ARIA upgrade: no nested buttons inside role="img"
    const boxRole = await page.locator('[data-formula="stokes-vt"]').getAttribute('role');
    assert.equal(boxRole, 'region');

    // Panel protections for print, glossary, and projector overlay
    const panel = page.locator('[data-formula="stokes-vt"] .cos-fx-panel');
    assert.equal(await panel.isVisible(), true);
    assert.equal(await panel.getAttribute('data-present'), 'off');
    assert.notEqual(await panel.getAttribute('data-no-print'), null);
    assert.notEqual(await panel.getAttribute('data-no-glossary'), null);

    // The single top-level division is drawn as a stacked fraction; the bar is the "/" button
    const box = page.locator('[data-formula="stokes-vt"]');
    assert.equal(await box.locator('.cos-fx-frac .cos-fx-num .cos-fx-token').count(), 8);
    assert.equal(await box.locator('.cos-fx-frac .cos-fx-den .cos-fx-token').count(), 2);
    assert.equal(await box.locator('.cos-fx-frac > .cos-fx-bar').getAttribute('data-fx-key'), '/');
    const numBox = await box.locator('.cos-fx-num').boundingBox();
    const denBox = await box.locator('.cos-fx-den').boundingBox();
    assert.ok(numBox.y + numBox.height <= denBox.y + 1, 'numerator sits above denominator');

    // Colour key explains the role colours
    const keyLabels = await box.locator('.cos-fx-key-item').allInnerTexts();
    assert.deepEqual(keyLabels, ['The result', 'Raises the result', 'Lowers the result', 'Size and shape', 'Fixed number']);

    // Hovering names the symbol in the hint line but does not change the selection
    const titleBefore = await panel.locator('.cos-fx-title').innerText();
    await stokesTokens.nth(0).hover();
    assert.match(await box.locator('.cos-fx-hint-text').innerText(), /Terminal velocity/);
    assert.equal(await panel.locator('.cos-fx-title').innerText(), titleBefore);

    // Click every single variable, constant, parenthesis, and operator
    const seenTitles = new Set();
    for (let i = 0; i < keys.length; i++) {
      await stokesTokens.nth(i).click();
      const isActive = await stokesTokens.nth(i).evaluate(el => el.classList.contains('is-active'));
      assert.equal(isActive, true, `Token ${keys[i]} should be highlighted when selected`);
      const title = await panel.locator('.cos-fx-title').innerText();
      const meaning = await panel.locator('.cos-fx-meaning').innerText();
      const eqRole = await panel.locator('.cos-fx-eq-role').innerText();
      assert.ok(title.length > 0 && meaning.length > 10 && eqRole.length > 10, `Missing copy for ${keys[i]}`);
      assert.equal(await panel.locator('.cos-fx-step-count').innerText(), `${i + 1} of ${keys.length}`);
      seenTitles.add(title);
    }

    // Students never see a raw underscore: subscripts are real <sub> elements
    assert.equal((await panel.innerText()).includes('_'), false, 'panel text should not contain raw underscores');
    await stokesTokens.nth(7).click();
    assert.equal(await panel.locator('.cos-fx-symbol-pill sub').innerText(), 'f');
    assert.ok(seenTitles.size >= 11, 'Each token should provide a tailored explanation');

    // Clicking a legend row selects the matching formula token
    await page.locator('[data-formula="stokes-vt"] .cos-fx-var-item').filter({ hasText: 'fluid density' }).click();
    assert.equal(
      await page.locator('[data-formula="stokes-vt"] .cos-fx-token[data-fx-key="ρ_f"]').evaluate(el => el.classList.contains('is-active')),
      true
    );

    // Interactive "What If?" slider updates live equation readout
    await page.locator('[data-formula="stokes-vt"] .cos-fx-token[data-fx-key="r^2"]').click();
    const slider = panel.locator('.cos-fx-whatif-slider');
    const beforeReadout = await panel.locator('.cos-fx-whatif-readout').innerText();
    await slider.fill('4');
    await slider.dispatchEvent('input');
    const afterReadout = await panel.locator('.cos-fx-whatif-readout').innerText();
    assert.notEqual(beforeReadout, afterReadout);

    // Verify 3D canvas has painted content and switch to 2D Diagram also renders
    const nonBlank3D = await panel.locator('.cos-fx-canvas').evaluate(canvas => {
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let bright = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 30 || data[i + 1] > 30 || data[i + 2] > 50) bright++;
      }
      return bright;
    });
    assert.ok(nonBlank3D > 200, '3D canvas should draw visible geometry/vectors');

    await panel.locator('.cos-fx-mode-btn[data-mode="2d"]').click();
    assert.equal(await panel.locator('.cos-fx-mode-btn[data-mode="2d"]').getAttribute('aria-pressed'), 'true');
    const nonBlank2D = await panel.locator('.cos-fx-canvas').evaluate(canvas => {
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let bright = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 30 || data[i + 1] > 30 || data[i + 2] > 50) bright++;
      }
      return bright;
    });
    assert.ok(nonBlank2D > 120, '2D canvas should draw scaling plot');

    // Generic equation & word equation tests
    const gravKeys = await page.locator('#generic-gravity .cos-fx-token').evaluateAll(els => els.map(e => e.getAttribute('data-fx-key')));
    assert.deepEqual(gravKeys, ['F', '=', 'G', '·', 'm_1', 'm_2', '/', 'r^2']);
    await page.locator('#generic-gravity .cos-fx-token[data-fx-key="r^2"]').hover();
    assert.equal(await page.locator('#generic-gravity .cos-fx-panel').isVisible(), false, 'hover alone must not open the panel');
    await page.locator('#generic-gravity .cos-fx-token[data-fx-key="r^2"]').click();
    assert.equal(await page.locator('#generic-gravity .cos-fx-panel').isVisible(), true);

    // A sum after a fraction is not part of the denominator
    const sides = await page.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'equation-box';
      el.id = 'mixed';
      el.textContent = 'y = a / b + c';
      document.body.appendChild(el);
      window.ClassroomOSFormulaExplainer.upgrade(el);
      el.querySelector('[data-fx-key="c"]').click();
      return { role: el.querySelector('.cos-fx-role-badge').textContent, stacked: !!el.querySelector('.cos-fx-frac') };
    });
    assert.equal(sides.stacked, false, 'a / b + c must stay on one line');
    assert.equal(sides.role, 'In a part that is added');

    const wordTokens = await page.locator('#word-eq .cos-fx-token').evaluateAll(els => els.map(e => e.textContent));
    assert.deepEqual(wordTokens, ['Force', '=', 'Mass', '×', 'Acceleration']);

    // Formulas named by pattern (kin-eq, te-formula ...) are picked up, with honest generic text
    const generic = await page.evaluate(() => {
      const fx = window.ClassroomOSFormulaExplainer;
      const make = (tag, cls, html, parent) => {
        const el = document.createElement(tag);
        el.className = cls;
        el.innerHTML = html;
        (parent || document.body).appendChild(el);
        fx.upgrade(el);
        return el;
      };
      const roles = (el) => {
        const out = {};
        for (const t of el.querySelectorAll('.cos-fx-token')) {
          t.click();
          const panel = el.querySelector('.cos-fx-panel');
          out[t.getAttribute('data-fx-key')] = panel.querySelector('.cos-fx-role-badge').textContent;
        }
        return out;
      };
      const para = document.createElement('p');
      para.innerHTML = 'A spring stores <span class="se-formula">E = ½kx²</span> of energy.';
      document.body.appendChild(para);
      const inline = para.querySelector('.se-formula');
      fx.upgrade(inline);
      inline.querySelector('.cos-fx-token').click();
      const live = make('div', 'num-zero-eq', 'y = 2x'); // would be a script target in a lesson
      live.id = 'live-eq';
      const liveEl = document.createElement('div');
      liveEl.className = 'x-eq';
      liveEl.id = 'has-id';
      liveEl.textContent = 'y = 2x';
      document.body.appendChild(liveEl);
      fx.upgrade(liveEl);
      return {
        sum: roles(make('div', 'kin-eq', 'v₁ = v₀ + at')),
        subtract: roles(make('div', 'kin-eq', 'h = v₀·sin(θ)·t − ½g·t²')),
        nested: roles(make('div', 'wa-eq', 'F_load = F_effort × (R / r)')),
        root: roles(make('div', 'pn-eq', 'T₀ = 2π √(L / g)')),
        relation: roles(make('div', 'gas-eq', 'PV = nRT')),
        several: roles(make('div', 'equation-box', 'v = g · t | y = ½ · g · t²')),
        inlineIsInline: inline.classList.contains('cos-fx-inline') && !inline.querySelector('.cos-fx-panel'),
        inlinePanelAfterParagraph: para.nextElementSibling.classList.contains('cos-fx-panel') && !para.nextElementSibling.hidden,
        skipped: {
          id: liveEl.classList.contains('cos-fx-box'),
          chain: make('div', 'a-eq', '2x + 5 = 15 = 3 × 5').classList.contains('cos-fx-box'),
          reaction: make('div', 'b-equation', 'C + O₂ → CO₂').classList.contains('cos-fx-box'),
          numbers: make('div', 'c-eq', '200 + 30 = 230').classList.contains('cos-fx-box'),
          withButton: make('div', 'd-formula', 'y = mx <button>go</button>').classList.contains('cos-fx-box'),
          sumSign: make('div', 'e-eq', 'H = − ∑ p log p').classList.contains('cos-fx-box')
        }
      };
    });
    // For formulas outside the catalog, only the equation becomes buttons, and
    // the accompanying sentence supplies what each symbol means.
    const boxed = await page.evaluate(() => {
      const fx = window.ClassroomOSFormulaExplainer;
      const add = (html) => {
        const holder = document.createElement('div');
        holder.innerHTML = html;
        const el = holder.firstElementChild;
        document.body.appendChild(el);
        fx.upgrade(el);
        return el;
      };
      const pick = (el, key) => {
        el.querySelector(`.cos-fx-token[data-fx-key="${key}"]`).click();
        const panel = el.querySelector('.cos-fx-panel');
        return { title: panel.querySelector('.cos-fx-title').textContent, meaning: panel.querySelector('.cos-fx-meaning').textContent };
      };
      const entropy = add('<div class="en-formula"><div class="en-formula-line"><span class="en-symbol">S ∝ ln W</span><span class="en-note">Boltzmann\'s idea: entropy S grows with W, the number of microstates.</span></div></div>');
      const acdc = add('<article class="acd-equation"><code>T = 1 ÷ f</code><p>Frequency <em>f</em> is measured in hertz. Period <em>T</em> is the time for one full cycle in seconds.</p></article>');
      const defs = add('<div class="music-formula">f = v / L<small>v = wave speed, L = string length</small></div>');
      return {
        entropyTokens: [...entropy.querySelectorAll('.cos-fx-token')].map((t) => t.textContent),
        noteIntact: entropy.querySelector('.en-note').textContent,
        S: pick(entropy, 'S'),
        W: pick(entropy, 'W'),
        acdcTokens: [...acdc.querySelectorAll('.cos-fx-token')].map((t) => t.textContent),
        T: pick(acdc, 'T'),
        L: pick(defs, 'L'),
        notFormulas: [
          add('<div class="fl-formula-box">Three ways a sheet can move: sideways, up or down, and rotate</div>'),
          add('<div class="fl-formula-box">&lt;a href="People.html"&gt;People&lt;/a&gt;</div>'),
          add('<div class="cl-formula-box"><span class="cl-formula-sym">Reactant + catalyst → product + catalyst</span></div>'),
          add('<div class="equation-box">FSM = (States, Inputs, Transitions, Start State)</div>'),
          add('<div class="four-formula">bₙ = (1/π) ∫ f(x) · sin(nx) dx</div>')
        ].map((el) => el.classList.contains('cos-fx-box'))
      };
    });
    assert.deepEqual(boxed.entropyTokens, ['S', '∝', 'ln', 'W']);
    assert.match(boxed.noteIntact, /^Boltzmann's idea/);
    assert.equal(boxed.S.title, 'Entropy');
    assert.match(boxed.S.meaning, /entropy S grows with W/);
    assert.equal(boxed.W.title, 'Number of microstates');
    assert.deepEqual(boxed.acdcTokens, ['T', '=', '1', '÷', 'f']);
    assert.equal(boxed.T.title, 'Period');
    assert.match(boxed.T.meaning, /time for one full cycle/);
    assert.equal(boxed.L.title, 'String length');
    assert.deepEqual(boxed.notFormulas, [false, false, false, false, false]);

    assert.equal(generic.sum['v_0'], 'In a part that is added');
    assert.equal(generic.sum['a'], 'In a part that is added');
    assert.equal(generic.subtract['g'], 'In a part that is subtracted');
    assert.equal(generic.subtract['θ'], 'Inside a function');
    assert.equal(generic.nested['F_load'], 'The result');
    assert.equal(generic.nested['R'], 'On top: raises the result');
    assert.equal(generic.nested['r'], 'On the bottom: lowers the result');
    assert.equal(generic.root['L'], 'Under the square root');
    assert.equal(generic.root['π'], 'Fixed number');
    assert.equal(generic.relation['P'], 'Part of the formula');
    assert.equal(generic.several['y'], 'The result', 'second equation in a box has its own result');
    assert.equal(generic.inlineIsInline, true);
    assert.equal(generic.inlinePanelAfterParagraph, true);
    assert.deepEqual(generic.skipped, { id: false, chain: false, reaction: false, numbers: false, withButton: false, sumSign: false });

    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
  }
});

test('Auto-loads on real viscosimeter and navier-stokes lesson pages without errors', async (t) => {
  const browser = await launchBrowser(t);
  if (!browser) return;
  const { server, port } = await startStaticServer(ROOT);
  try {
    for (const rel of [
      '/lessons/applied-physics-materials/viscosimeter.html',
      '/lessons/physics/modern-and-thermal/navier-stokes.html'
    ]) {
      for (const width of [1280, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 844 } });
        page.setDefaultTimeout(7000);
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(`http://127.0.0.1:${port}${rel}`, { waitUntil: 'domcontentloaded' });
        if (rel.endsWith('/viscosimeter.html') && width === 1280) {
          assert.equal(await page.locator('script[data-page-module="formula-explainer"]').count(), 0,
            'formulas below the fold do not load the explorer at startup');
        }
        await page.locator('.cl-formula-box').first().scrollIntoViewIfNeeded();
        await page.waitForSelector('.cos-fx-box .cos-fx-token', { timeout: 6000 });
        const tokenCount = await page.locator('.cos-fx-box .cos-fx-token').count();
        assert.ok(tokenCount >= 8, `Expected tokens on ${rel} (${width}px), got ${tokenCount}`);

        // Toggle night mode and check the first explorer opens cleanly without widening the page
        await page.evaluate(() => document.documentElement.setAttribute('data-lighting', 'night'));
        await page.locator('.cos-fx-box .cos-fx-token').first().click();
        assert.equal(await page.locator('.cos-fx-box .cos-fx-panel').first().isVisible(), true);
        // Every symbol of every formula on the page selects and draws without throwing, in both pictures
        const clicked = await page.evaluate(async () => {
          let n = 0;
          for (const box of document.querySelectorAll('.cos-fx-box')) {
            for (const token of box.querySelectorAll('.cos-fx-token')) {
              token.click();
              for (const mode of box.querySelectorAll('.cos-fx-mode-btn')) mode.click();
              n++;
            }
          }
          await new Promise(resolve => setTimeout(resolve, 150));
          return n;
        });
        assert.ok(clicked >= tokenCount, 'clicked every token');
        const overflow = await page.locator('.cos-fx-box').first().evaluate(el => el.scrollWidth - el.clientWidth);
        assert.ok(overflow <= 1, `Formula box overflows by ${overflow}px on ${rel} (${width}px)`);
        assert.deepEqual(errors, [], `Page errors on ${rel}: ${errors.join('; ')}`);

        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
});
