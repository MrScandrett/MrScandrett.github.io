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
        relation: roles(make('div', 'gas-eq', 'PQ = nJT')),
        power: roles(make('div', 'sq-eq', 'k = (u + 3)²')),
        powerSup: roles(make('div', 'sq-eq', 'k = (u + 3)<sup>2</sup> / h')),
        powerNeg: roles(make('div', 'cl-formula-box', '<span class="cl-formula-sym">k = c · (1 − u / w)<sup>−2.5</sup></span>')),
        rt60: roles(make('div', 'ac-eq', 'RT60 = 0.161 × V / A')),
        q60: roles(make('div', 'ac-eq', 'Q60 = 0.161 × V / A')),
        words: roles(make('div', 'equation-box', 'model = real ÷ scale')),
        wordFn: roles(make('div', 'equation-box', 'height = distance × tan(angle)')),
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
    // A power on a bracket is its own symbol and covers the whole bracket.
    assert.equal(generic.power['^2'], 'Operator');
    assert.equal(generic.power['u'], 'Inside a bracket that is squared');
    assert.equal(generic.power[')'], 'Operator', 'the closing bracket stays a bracket');
    assert.equal(generic.powerSup['^2'], 'Operator');
    assert.equal(generic.powerSup['u'], 'Inside a bracket that is squared');
    assert.equal(generic.powerSup['h'], 'On the bottom: lowers the result');
    assert.equal(generic.powerNeg['^−2.5'], 'Operator');
    assert.equal(generic.powerNeg['w'], 'Inside a bracket that is raised to a power');
    // Names that merely start like a function or contain digits stay whole (with and without catalog match).
    assert.equal(generic.rt60['RT60'], 'Reverberation time');
    assert.equal(generic.rt60['R'], undefined);
    assert.equal(generic.q60['Q60'], 'The result');
    assert.equal(generic.q60['Q'], undefined);
    assert.ok('model' in generic.words && !('mod' in generic.words) && !('el' in generic.words));
    assert.equal(generic.wordFn['tan'], 'Function');
    assert.ok('angle' in generic.wordFn);
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

test('Formula packs: common physics, maths and electronics formulas get hand-written explanations, real-unit sliders and a computed graph', async (t) => {
  const browser = await launchBrowser(t);
  if (!browser) return;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    // As lessons write them: spacing, multiplication signs and <sub> markup all vary.
    const cases = {
      'newton-second': 'F = ma',
      'kinetic-energy': 'KE = ½mv²',
      'potential-energy': 'PE = mgh',
      'momentum': 'p = mv',
      'kinematics-v': 'v = v₀ + at',
      'kinematics-x': 'x = x₀ + v₀t + ½at²',
      'kinematics-v2': 'v² = v₀² + 2aΔx',
      'pendulum-period': 'T = 2π √(L / g)',
      'ohm-v': 'V = I × R',
      'ohm-i': 'I = V ÷ R',
      'ohm-r': 'R = V ÷ I',
      'power-vi': 'P = V × I',
      'power-i2r': 'P = I² × R',
      'power-v2r': 'P = V² ÷ R',
      'coulomb': 'F = k · q₁q₂ / r²',
      'density': 'ρ = m ÷ V',
      'mass-energy': 'E = mc²',
      'frequency-period': 'f = 1 ÷ T',
      'wave-frequency': 'f = v / lambda',
      'work': 'W = F · d · cos(θ)',
      'torque': 'τ = F · r · sin(θ)',
      'drag-equation': 'F<sub>d</sub> = ½ · ρ · v² · C<sub>d</sub> · A',
      'first-law': 'ΔU = Q - W',
      'lorentz-factor': 'γ = 1 / √(1 − v²/c²)',
      'hubble-law': 'v = H₀ × d',
      'boltzmann-entropy': 'S = k ln W',
      'wheel-axle-ma': 'MA = R / r',
      'orbital-speed': 'v = √(GM / r)',
      'faraday-law': 'EMF = −N × ΔΦ / Δt',
      'de-broglie': 'lambda = h / p',
      'photon-energy': 'E = hf',
      'light-wave-speed': 'c = λf',
      'projectile-x': 'x = v₀·cos(θ)·t',
      'projectile-y': 'y = v₀·sin(θ)·t − ½g·t²',
      'gravitation': 'F = GMm/r²',
      // Maths, chemistry and electronics
      'circle-area': 'A = πr<sup>2</sup>',
      'circumference': 'C = 2πr',
      'pythagoras': 'a<sup>2</sup> + b<sup>2</sup> = c<sup>2</sup>',
      'line-slope-intercept': 'y = mx + b',
      'rectangle-area': 'A = l × w',
      'simple-interest': 'I = P × r × t',
      'average-speed': 'v = d ÷ t',
      'percent': 'p = (part ÷ whole) × 100',
      'distance-formula': 'd = √((x₂−x₁)² + (y₂−y₁)²)',
      'ideal-gas': 'PV = nRT',
      'dilution': 'M<sub>1</sub>V<sub>1</sub> = M<sub>2</sub>V<sub>2</sub>',
      'exponential-growth': 'N(t) = N₀ · e^(kt)',
      'radioactive-decay': 'N(t) = N₀ · e<sup>−λt</sup>',
      'continuous-compounding': 'A = Pe<sup>rt</sup>',
      'fibonacci': 'F(n) = F(n - 1) + F(n - 2)',
      'division-check': 'divisor × quotient + remainder = dividend',
      'catenary': 'y = a·cosh(x/a)',
      'voltage-divider': 'V<sub>out</sub> = V<sub>in</sub> × R2 ÷ (R1 + R2)',
      'kirchhoff-voltage': 'V<sub>battery</sub> = V<sub>1</sub> + V<sub>2</sub> + V<sub>3</sub>',
      'kirchhoff-current': 'I<sub>in</sub> = I<sub>a</sub> + I<sub>b</sub> + I<sub>c</sub>',
      'ac-peak': 'Vpeak = Vrms × √2',
      'ac-rms': 'Vrms = Vpeak ÷ √2',
      'spring-energy': 'E = ½kx²',
      'rocket-equation': 'Δv = v<sub>e</sub> × ln(m<sub>0</sub> / m<sub>f</sub>)',
      'terminal-velocity': 'v<sub>t</sub> = √( 2 · m · g / ( ρ · C<sub>d</sub> · A ) )'
    };
    await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>' +
      Object.entries(cases).map(([id, html]) => `<div class="cl-formula-box" data-case="${id}"><span class="cl-formula-sym">${html}</span></div>`).join('') +
      '</body></html>');
    await page.addStyleTag({ path: CSS_PATH });
    await page.addScriptTag({ path: SCRIPT_PATH });
    await page.evaluate(() => window.ClassroomOSFormulaExplainer.upgradeAll());

    const report = await page.evaluate(async () => {
      const generic = /^(On top|On the bottom|In a part|Inside|Under the|Part of the formula|What the result)/;
      const out = [];
      for (const box of document.querySelectorAll('[data-case]')) {
        const entry = { id: box.dataset.case, tokens: box.querySelectorAll('.cos-fx-token').length, generic: [], sliders: 0, bad: [] };
        for (const tok of box.querySelectorAll('.cos-fx-token')) {
          tok.click();
          const panel = box.querySelector('.cos-fx-panel');
          const role = panel.querySelector('.cos-fx-role-badge').textContent;
          if (generic.test(role)) entry.generic.push(tok.dataset.fxKey + ': ' + role);
          // Hand-built 3D formulas keep their one-symbol slider.
          const whatIf = panel.querySelector('.cos-fx-whatif');
          if (!whatIf.hidden && role !== 'Operator') {
            entry.sliders++;
            const one = panel.querySelector('.cos-fx-whatif-slider');
            for (const v of [one.min, one.max]) {
              one.value = v;
              one.dispatchEvent(new Event('input', { bubbles: true }));
              const text = panel.querySelector('.cos-fx-whatif-readout').textContent + ' ' + panel.querySelector('.cos-fx-whatif-val').textContent;
              if (/NaN|undefined|_/.test(text)) entry.bad.push(tok.dataset.fxKey + ': ' + text);
            }
          }
        }
        // The lab: every quantity has its own slider, and the worked answer and the
        // Lower / Now / Raise cards stay clean at both ends of each one.
        const panel = box.querySelector('.cos-fx-panel');
        for (const slider of panel.querySelectorAll('.cos-fx-lab-row input[type="range"]')) {
          entry.sliders++;
          const start = slider.value;
          for (const v of [slider.min, slider.max, start]) {
            slider.value = v;
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            const text = panel.querySelector('.cos-fx-lab').textContent + ' ' + panel.querySelector('.cos-fx-next').textContent;
            if (/NaN|undefined|_|Infinity/.test(text)) entry.bad.push(slider.closest('.cos-fx-lab-row').dataset.param + ' at ' + v + ': ' + text);
            if (panel.querySelectorAll('.cos-fx-next-card').length !== 3) entry.bad.push('expected Lower, Now and Raise cards');
          }
          for (const view of panel.querySelectorAll('.cos-fx-mode-btn[data-view]')) view.click();
        }
        out.push(entry);
      }
      await new Promise(r => setTimeout(r, 100));
      return out;
    });

    assert.equal(report.length, Object.keys(cases).length);
    for (const entry of report) {
      assert.ok(entry.tokens >= 3, `${entry.id} was taken apart`);
      assert.deepEqual(entry.generic, [], `${entry.id}: every variable has a hand-written explanation`);
      assert.deepEqual(entry.bad, [], `${entry.id}: slider readouts are clean numbers`);
      if (entry.id !== 'boltzmann-entropy' && entry.id !== 'fibonacci') assert.ok(entry.sliders >= 1, `${entry.id} has a slider in real units`);
    }

    // The readout is the formula worked out with units, and it follows the slider.
    const newton = page.locator('[data-case="newton-second"]');
    const setSlider = (param, value) => newton.locator(`.cos-fx-lab-row[data-param="${param}"] input`).evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, value);
    await setSlider('a', '3');
    await newton.locator('.cos-fx-token[data-fx-key="m"]').click();
    await setSlider('m', '2');
    assert.equal(await newton.locator('.cos-fx-title').textContent(), 'Mass');
    assert.equal(await newton.locator('.cos-fx-lab-result').textContent(), 'F = 2 kg × 3 m/s² = 6 N');
    // Lower and Raise show the outcome before you commit to it, then apply it on a click.
    const cards = () => newton.locator('.cos-fx-next-card').allInnerTexts().then(list => list.map(text => text.replace(/\s+/g, ' ').trim()));
    assert.deepEqual(await cards(), ['▼ Halve m to 1 kg F = 3 N × 0.5, smaller', 'Now: m = 2 kg F = 6 N', '▲ Double m to 4 kg F = 12 N × 2, bigger']);
    await newton.locator('button.cos-fx-next-card[data-dir="1"]').click();
    assert.equal(await newton.locator('.cos-fx-lab-result').textContent(), 'F = 4 kg × 3 m/s² = 12 N');
    assert.equal(await newton.locator('.cos-fx-lab-row[data-param="m"] input').inputValue(), '4');
    await newton.locator('.cos-fx-lab-reset').click();
    assert.equal(await newton.locator('.cos-fx-lab-result').textContent(), 'F = 2 kg × 3 m/s² = 6 N');
    assert.deepEqual(await newton.locator('.cos-fx-mode-btn').allInnerTexts(), ['Graph', 'Sizes'], 'computed formulas offer the graph and the bars, no 3D toggle');
    await newton.locator('.cos-fx-mode-btn[data-view="graph"]').click();
    const painted = await newton.locator('canvas').evaluate((c) => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 150) lit++;
      return lit;
    });
    assert.ok(painted > 50, 'the graph is drawn');
    assert.deepEqual(errors, []);
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

test('The lab: beat rate, absolute values, word names and plain arithmetic formulas can all be worked out and nudged', async (t) => {
  const browser = await launchBrowser(t);
  if (!browser) return;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>
      <p class="music-formula" id="beats"><strong>Beat rate = |f<sub>right</sub> − f<sub>left</sub>|</strong><br>Example: |224 − 220| = 4 Hz. This predicts the fluctuation rate, not a brain state.</p>
      <div class="equation-box" id="textbook">f<sub>beat</sub> = |f<sub>1</sub> − f<sub>2</sub>|</div>
      <div class="equation-box" id="auto-area">A = ½ b h</div>
      <div class="equation-box" id="auto-words">Speed = distance ÷ time</div>
      <div class="equation-box" id="auto-root">c = √(a² + b²)</div>
      <div class="equation-box" id="auto-frac">R = ρL / A</div>
      <div class="equation-box" id="no-trig">h = L sin θ</div>
      <div class="equation-box" id="no-ambiguous">y = a / b × c</div>
      <div class="equation-box" id="no-relation">ab = cd</div>
      <div class="equation-box" id="no-times-x">f = n / (2L) x sqrt(T / m)</div>
      <div class="equation-box" id="auto-squared">E<sup>2</sup> = (pc)<sup>2</sup> + (mc<sup>2</sup>)<sup>2</sup></div>
      <div class="equation-box" id="two">v = g·t | y = ½·g·t²</div>
    </body></html>`);
    await page.addStyleTag({ path: CSS_PATH });
    await page.addScriptTag({ path: SCRIPT_PATH });
    await page.evaluate(() => window.ClassroomOSFormulaExplainer.upgradeAll());

    const set = (id, n, value) => page.locator(`#${id} .cos-fx-lab-row input`).nth(n).evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, value);
    const result = (id) => page.locator(`#${id} .cos-fx-lab-result`).textContent();
    const cards = (id) => page.locator(`#${id} .cos-fx-next-card`).allInnerTexts().then(list => list.map(text => text.replace(/\s+/g, ' ').trim()));
    const lit = (id) => page.locator(`#${id} canvas`).evaluate((c) => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 300) n++;
      return n;
    });

    // The lesson's own markup: formula line, <br>, then an example sentence that stays as written.
    const beats = page.locator('#beats');
    assert.deepEqual(await beats.locator('.cos-fx-token').evaluateAll(list => list.map(b => b.dataset.fxKey)),
      ['Beat rate', '=', '|', 'f_right', '−', 'f_left', '|']);
    assert.match(await beats.textContent(), /Example: \|224 − 220\| = 4 Hz\. This predicts/);
    await beats.locator('.cos-fx-toggle-btn').click();
    assert.equal(await beats.locator('.cos-fx-title').textContent(), 'Right-ear tone');
    assert.equal(await result('beats'), 'Beat rate = |224 − 220| = 4 Hz');
    assert.deepEqual(await beats.locator('.cos-fx-mode-btn').allInnerTexts(), ['Picture', 'Graph', 'Sizes']);
    assert.deepEqual(await cards('beats'), [
      '▼ Lower fright to 220 Hz Beat rate = 0 Hz drops to zero',
      'Now: fright = 224 Hz Beat rate = 4 Hz',
      '▲ Raise fright to 228 Hz Beat rate = 8 Hz × 2, bigger'
    ]);
    // Lower twice: through zero and out the other side, and the bars keep the answer positive.
    await beats.locator('button.cos-fx-next-card[data-dir="-1"]').click();
    assert.equal(await result('beats'), 'Beat rate = |220 − 220| = 0 Hz (no beat)');
    await beats.locator('button.cos-fx-next-card[data-dir="-1"]').click();
    assert.equal(await result('beats'), 'Beat rate = |216 − 220| = 4 Hz');
    // Every picture draws, and moving a slider changes the picture.
    for (const view of ['beats', 'graph', 'bars']) {
      await beats.locator(`.cos-fx-mode-btn[data-view="${view}"]`).click();
      assert.ok(await lit('beats') > 200, `${view} scene is drawn`);
    }
    await beats.locator('.cos-fx-mode-btn[data-view="beats"]').click();
    const before = await beats.locator('canvas').evaluate(c => c.toDataURL());
    await set('beats', 1, '208');
    assert.equal(await result('beats'), 'Beat rate = |216 − 208| = 8 Hz');
    assert.notEqual(await beats.locator('canvas').evaluate(c => c.toDataURL()), before);
    // Picking up the other slider selects its symbol.
    await beats.locator('.cos-fx-lab-row input').nth(1).focus();
    assert.equal(await beats.locator('.cos-fx-title').textContent(), 'Left-ear tone');
    assert.match((await cards('beats'))[1], /^Now: fleft = 208 Hz/);

    await page.locator('#textbook .cos-fx-toggle-btn').click();
    assert.equal(await result('textbook'), 'f_beat = |224 − 220| = 4 Hz'.replace('f_beat', 'fbeat'));

    // Formulas with no catalog entry are read as arithmetic and get the same lab.
    const auto = {
      'auto-area': ['A = ½ × 2 × 3 = 3', 'A = ½ × 4 × 3 = 6'],
      'auto-words': ['Speed = 2 ÷ 3 = 0.667', 'Speed = 4 ÷ 3 = 1.33'],
      'auto-root': ['c = √(2² + 3²) = 3.61', 'c = √(4² + 3²) = 5'],
      'auto-frac': ['R = 2 × 3 ÷ 4 = 1.5', 'R = 4 × 3 ÷ 4 = 3']
    };
    for (const [id, [first, second]] of Object.entries(auto)) {
      await page.locator(`#${id} .cos-fx-toggle-btn`).click();
      assert.equal(await result(id), first, id);
      await set(id, 0, '4');
      assert.equal(await result(id), second, id);
      assert.equal((await cards(id)).length, 3, id);
      assert.ok(await lit(id) > 200, `${id} draws`);
    }
    // The result keeps the lesson's own markup: "E²", never "E^2".
    await page.locator('#auto-squared .cos-fx-toggle-btn').click();
    assert.equal(await result('auto-squared'), 'E2 = (2 × 3)² + (4 × 3²)² = 1332');
    assert.equal(await page.locator('#auto-squared .cos-fx-lab-result sup').first().textContent(), '2');
    // Dividing by zero is said in words, never shown as Infinity or NaN.
    await set('auto-words', 1, '0');
    assert.match(await result('auto-words'), /no answer/);
    assert.doesNotMatch(await page.locator('#auto-words .cos-fx-panel').textContent(), /NaN|Infinity/);

    // Nothing is guessed: unknown angle units, "a / b × c", relations and multi-equation boxes get no lab.
    for (const id of ['no-trig', 'no-ambiguous', 'no-relation', 'no-times-x', 'two']) {
      assert.ok(await page.locator(`#${id} .cos-fx-token`).count() >= 3, `${id} is still taken apart`);
      await page.locator(`#${id} .cos-fx-toggle-btn`).click();
      assert.equal(await page.locator(`#${id} .cos-fx-lab`).isVisible(), false, `${id} has no lab`);
    }
    assert.deepEqual(await page.locator('#two .cos-fx-token').evaluateAll(list => list.map(b => b.dataset.fxKey).filter(k => k === '|')), [], '" | " between equations is not an absolute value');

    // Lessons can add their own formula and picture.
    await page.evaluate(() => {
      const fx = window.ClassroomOSFormulaExplainer;
      fx.registerScene('test-scene', { label: 'Mine', draw(ctx, w, h, env) { window.__sceneEnv = { st: { ...env.st }, focus: env.focus.param, low: env.low, high: env.high }; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); } });
      fx.define({ id: 'test-double', title: 'Doubling', match: ['q=2z'], y: 'q', first: 'z', init: { z: 3 }, out: ['q', 'units'], scenes: ['test-scene'],
        f: s => 2 * s.z, line: s => 'q = ' + 2 * s.z,
        tokens: { q: { t: 'Result', c: 'lhs', is: 'x', does: 'y' }, z: { t: 'Input', c: 'drive', is: 'x', does: 'y', s: ['z', 0, 10, 1, 'units'] } } });
      const box = document.createElement('div');
      box.className = 'equation-box';
      box.id = 'custom';
      box.textContent = 'q = 2z';
      document.body.appendChild(box);
      fx.upgrade(box);
    });
    await page.locator('#custom .cos-fx-toggle-btn').click();
    assert.deepEqual(await page.locator('#custom .cos-fx-mode-btn').allInnerTexts(), ['Mine', 'Graph', 'Sizes']);
    assert.deepEqual(await page.evaluate(() => window.__sceneEnv), { st: { z: 3 }, focus: 'z', low: 2, high: 6 });
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('Regression: preserved entries, ambiguous symbols, tricky syntax, and new interactive labs', async (t) => {
  const browser = await launchBrowser(t);
  if (!browser) return;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setContent(`<!doctype html><html><body></body></html>`);
    await page.addStyleTag({ path: CSS_PATH });
    await page.addScriptTag({ path: SCRIPT_PATH });

    const out = await page.evaluate(() => {
      const fx = window.ClassroomOSFormulaExplainer;
      const runCase = (html, df) => {
        const wrap = document.createElement('div');
        wrap.innerHTML = html.trim();
        const box = wrap.firstElementChild;
        if (df) box.setAttribute('data-formula', df);
        document.body.appendChild(box);
        fx.upgrade(box);
        const panelId = box.getAttribute('data-fx-panel');
        const panel = (panelId && document.getElementById(panelId)) || box.querySelector('.cos-fx-panel');
        const map = {};
        box.querySelectorAll('.cos-fx-token').forEach((btn) => {
          btn.click();
          const k = btn.getAttribute('data-fx-key');
          map[k] = {
            title: panel.querySelector('.cos-fx-title').textContent.trim(),
            role: panel.querySelector('.cos-fx-role-badge').textContent.trim(),
            meaning: panel.querySelector('.cos-fx-meaning').textContent.trim(),
            effect: panel.querySelector('.cos-fx-eq-role').textContent.trim(),
            sym: panel.querySelector('.cos-fx-symbol-pill').textContent.trim()
          };
        });
        const labResult = () => panel ? ((panel.querySelector('.cos-fx-lab-result')?.textContent || '').trim() || (panel.querySelector('.cos-fx-whatif-readout')?.textContent || '').trim()) : '';
        const setSlider = (idx, val) => {
          const sliders = panel.querySelectorAll('.cos-fx-lab input[type="range"]');
          if (!sliders[idx]) return '';
          sliders[idx].value = String(val);
          sliders[idx].dispatchEvent(new Event('input', { bubbles: true }));
          return labResult();
        };
        return {
          upgraded: box.classList.contains('cos-fx-box'),
          panelLabel: panel ? panel.getAttribute('aria-label') : '',
          keys: [...box.querySelectorAll('.cos-fx-token:not(.is-operator)')].map((b) => b.getAttribute('data-fx-key')),
          map,
          hasLab: !!(panel && panel.querySelector('.cos-fx-lab input[type="range"]')),
          initialLab: labResult(),
          setSlider
        };
      };

      // 1. Preserved entries
      const preserved = {
        sabine: runCase('<div class="equation-box">RT60 = 0.161 × V / A</div>'),
        compressor: runCase('<div class="equation-box" data-formula="compressor-level">output = threshold + (input − threshold) / ratio</div>'),
        latent: runCase('<div class="equation-box" data-formula="latent-heat">Q = m · L</div>'),
        euler: runCase('<div class="equation-box" data-formula="mesh-euler">V − E + F = 2</div>'),
        snap: runCase('<div class="equation-box" data-formula="snap-fit-strain">ε = 1.5 · y · h / L²</div>'),
        orbit: runCase('<div class="equation-box" data-formula="orbit-radius">r = a(1 − e²) / (1 + e·cos(θ))</div>'),
        kepler: runCase('<div class="equation-box" data-formula="kepler-period-ratio">T² = a³</div>')
      };

      // 2. Ambiguous symbols (V, A, r)
      const pv = runCase('<div class="equation-box">PV = nRT</div>');
      const ohm = runCase('<div class="equation-box">V = I × R</div>');
      const dens = runCase('<div class="equation-box">ρ = m / V</div>');
      const area = runCase('<div class="equation-box">A = l × w</div>');
      const ci = runCase('<div class="equation-box">A = P(1 + r ⁄ n)ⁿᵗ</div>', 'compound-interest');
      const grav = runCase('<div class="equation-box">F = G·m₁·m₂ / r²</div>');

      // 3. Tricky syntax & multi-word tokens
      const syntax = {
        robotJac: runCase('<div class="equation-box" data-formula="robot-jacobian-vel">ẋ = J(θ) θ̇ | J = [[−L₁s₁ − L₂s₁₂, −L₂s₁₂], [L₁c₁ + L₂c₁₂, L₂c₁₂]]</div>'),
        beta: runCase('<div class="equation-box" data-formula="beta-decay">n → p + e⁻ + ν̅ₑ</div>'),
        eulerLim: runCase('<div class="equation-box">𝑒 = lim<sub>𝑛→∞</sub> (1 + 1/𝑛)<sup>𝑛</sup></div>'),
        heat: runCase('<div class="equation-box">∂u⁄∂t = α∇²u</div>'),
        kin: runCase('<div class="equation-box" data-formula="kinematics-derivatives">v(t) = dx/dt | a(t) = dv/dt</div>'),
        buoy: runCase('<div class="equation-box">ΔP_buoy = (ρ_crust − ρ_magma) · g · z</div>'),
        plinian: runCase('<div class="equation-box">H<sub>t</sub> = 1.67 · Ṁ<sup>0.259</sup> ≈ 8.2 · Q<sup>0.25</sup></div>'),
        dotProd: runCase('<div class="equation-box" data-formula="dot-product">A · B = |A||B|cos(θ) = AₓBₓ + A_yB_y + A_zB_z</div>'),
        stoich: runCase('<div class="equation-box" data-formula="stoichiometry-mass">mass of B = mass of A × (1 mol A ÷ M<sub>A</sub>) × (coef B ÷ coef A) × M<sub>B</sub></div>'),
        crossMag: runCase('<div class="equation-box">|A × B| = |A||B|sin(θ)</div>'),
        zeta: runCase('<div class="equation-box" data-formula="riemann-zeta-series">ζ(s) = Σ 1/nˢ</div>')
      };

      // 4. Numerical lab checks
      const gear = runCase('<div class="equation-box" data-formula="gear-ratio">Gear ratio = Teeth out / Teeth in</div>');
      const flt = runCase('<div class="equation-box" data-formula="floating-depth">% sub = (ρ<sub>obj</sub> ÷ ρ<sub>fluid</sub>) × 100</div>');
      const astar = runCase('<div class="equation-box" data-formula="astar-priority">Priority = Cost so far + Estimate left</div>');
      const wave = runCase('<div class="equation-box" data-formula="wave-height-update">h<sub>new</sub> = (Σneighbors / 2 − h<sub>old</sub>) × d</div>');

      return {
        preserved,
        ambiguous: { pv: pv.map, ohm: ohm.map, dens: dens.map, area: area.map, ci: ci.map, grav: grav.map },
        syntax,
        labs: {
          ci: { init: ci.initialLab, doubledP: ci.setSlider(0, 2000) },
          crossMag: crossMagLab(),
          gear: { init: gear.initialLab, mod: gear.setSlider(0, 48) },
          flt: { init: flt.initialLab, mod: flt.setSlider(0, 0.9) },
          astar: { init: astar.initialLab, mod: astar.setSlider(1, 10) },
          buoy: { init: syntax.buoy.initialLab, mod: syntax.buoy.setSlider(1, 2200) },
          wave: { init: wave.initialLab, mod: wave.setSlider(0, 1.2) }
        }
      };

      function crossMagLab() {
        const cm = runCase('<div class="equation-box">|A × B| = |A||B|sin(θ)</div>');
        return { init: cm.initialLab, zeroDeg: cm.setSlider(2, 0), ninetyDeg: cm.setSlider(2, 90) };
      }
    });

    // Assert preserved entries
    assert.equal(out.preserved.sabine.map['RT60'].title, 'Reverberation time');
    assert.equal(out.preserved.compressor.map['ratio'].title, 'Compression ratio');
    assert.equal(out.preserved.latent.map['L'].title, 'Specific latent heat');
    assert.equal(out.preserved.euler.map['F'].title, 'Faces');
    assert.equal(out.preserved.snap.map['ε'].title, 'Strain at the root');
    assert.equal(out.preserved.orbit.map['e'].title, 'Orbital eccentricity');
    assert.equal(out.preserved.kepler.map['a^3'].title, 'Semi-major axis cubed');

    // Assert ambiguous symbol disambiguation
    assert.match(out.ambiguous.pv['V'].title, /Volume/i);
    assert.match(out.ambiguous.dens['V'].title, /Volume/i);
    assert.match(out.ambiguous.ohm['V'].title, /Voltage/i);
    assert.equal(out.ambiguous.area['A'].title, 'Area');
    assert.equal(out.ambiguous.ci['A'].title, 'Final amount');
    assert.equal(out.preserved.sabine.map['A'].title, 'Equivalent absorption area');
    assert.equal(out.ambiguous.ci['r'].title, 'Annual interest rate');
    assert.match(out.ambiguous.grav['r^2'].title, /Distance/i);

    // Assert zero generic titles / meanings / raw underscores across all syntax cases
    for (const [name, res] of Object.entries(out.syntax)) {
      assert.equal(res.upgraded, true, `${name} upgraded`);
      for (const [k, card] of Object.entries(res.map)) {
        assert.doesNotMatch(card.title, /^Variable\s/i, `${name}[${k}] generic title: ${card.title}`);
        assert.doesNotMatch(card.meaning, /stands for one of the quantities/i, `${name}[${k}] generic meaning`);
        const combined = `${card.sym} ${card.title} ${card.role} ${card.meaning} ${card.effect}`;
        assert.doesNotMatch(combined, /_/, `${name}[${k}] raw underscore in: ${combined}`);
      }
    }
    assert.ok('s_12' in out.syntax.robotJac.map, 's₁₂ kept together as s_12');
    assert.ok('e^−' in out.syntax.beta.map, 'e⁻ kept together as e^−');
    assert.ok('lim_n→∞' in out.syntax.eulerLim.map, 'italic limit subscript normalized');
    assert.ok('∇^2u' in out.syntax.heat.map, '∇²u merged');
    assert.ok('dx' in out.syntax.kin.map && 'dt' in out.syntax.kin.map, 'dx/dt kept intact');
    assert.ok('ΔP_buoy' in out.syntax.buoy.map, 'ΔP_buoy kept intact');
    assert.ok('Ṁ^0.259' in out.syntax.plinian.map, 'decimal exponent matched Ṁ');
    assert.ok('A_y' in out.syntax.dotProd.map && 'B_y' in out.syntax.dotProd.map, 'A_yB_y split cleanly');
    assert.ok('mass of B' in out.syntax.stoich.map && 'coef B' in out.syntax.stoich.map, 'multi-word tokens merged');
    assert.equal(out.syntax.crossMag.panelLabel, 'Cross product magnitude explorer');
    assert.ok('n^s' in out.syntax.zeta.map, '1/nˢ normalized to n^s');

    // Assert numerical lab calculations
    assert.match(out.labs.gear.init, /36\s*÷\s*12\s*=\s*3/);
    assert.match(out.labs.gear.mod, /48\s*÷\s*12\s*=\s*4/);
    assert.match(out.labs.flt.init, /60%/);
    assert.match(out.labs.flt.mod, /90%/);
    assert.match(out.labs.astar.init, /10/);
    assert.match(out.labs.astar.mod, /14/);
    assert.match(out.labs.crossMag.zeroDeg, /=\s*0$/);
    assert.match(out.labs.crossMag.ninetyDeg, /=\s*12$/);
    assert.doesNotMatch(JSON.stringify(out.labs), /NaN|Infinity|undefined/);

    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
  }
});

test('Real lesson pages: student clicks, keyboard navigation, and sliders work cleanly', async (t) => {
  const browser = await launchBrowser(t);
  if (!browser) return;
  const { server, port } = await startStaticServer(ROOT);
  try {
    const pagesToCheck = [
      'lessons/mathematics/algebra/equations-iceberg.html',
      'lessons/physics/mechanics/vectors.html',
      'lessons/cosmology/keplers-laws.html',
      'lessons/earth-science/volcano-simulator.html',
      'lessons/chemistry/stoichiometry.html',
      'lessons/physics/pioneers/james-clerk-maxwell.html'
    ];
    for (const rel of pagesToCheck) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.route('**/*', (route) => {
        const u = route.request().url();
        if (u.startsWith(`http://127.0.0.1:${port}/`) || u.startsWith('data:') || u.startsWith('blob:')) {
          return route.continue();
        }
        return route.abort();
      });
      await page.goto(`http://127.0.0.1:${port}/${rel}`, { waitUntil: 'domcontentloaded' });
      const formulaTarget = page.locator('[data-formula], .iceq-card, .v-eq, .eq-formula, .equation, .jcm-eq-card').locator('visible=true').first();
      await formulaTarget.scrollIntoViewIfNeeded();
      await page.waitForSelector('.cos-fx-box[data-fx-upgraded]', { state: 'attached', timeout: 10000 });

      const boxes = page.locator('.cos-fx-box[data-fx-upgraded]');
      const boxCount = await boxes.count();
      assert.ok(boxCount >= 1, `${rel} has upgraded equation boxes`);

      // Keyboard navigation on the first visible upgraded box
      const visibleBox = page.locator('.cos-fx-box[data-fx-upgraded]').locator('visible=true').first();
      const firstToken = visibleBox.locator('.cos-fx-token').first();
      await firstToken.scrollIntoViewIfNeeded();
      await firstToken.focus();
      await page.keyboard.press('Enter');

      const panelId = await visibleBox.getAttribute('data-fx-panel');
      const panel = page.locator(`#${panelId}`);
      await panel.waitFor({ state: 'visible', timeout: 5000 });
      const initialTitle = (await panel.locator('.cos-fx-title').textContent()).trim();
      assert.ok(initialTitle.length > 0 && !/^Variable\s/i.test(initialTitle), `${rel} first card has real title`);

      // Step forward with Next -> button and back with <- Prev
      const nextBtn = panel.locator('.cos-fx-step-btn[data-dir="1"]');
      if (await nextBtn.isVisible()) {
        await nextBtn.focus();
        await page.keyboard.press('Enter');
        const nextTitle = (await panel.locator('.cos-fx-title').textContent()).trim();
        assert.ok(nextTitle.length > 0 && !/^Variable\s/i.test(nextTitle), `${rel} next card has real title`);
        await panel.locator('.cos-fx-step-btn[data-dir="-1"]').click();
        assert.equal((await panel.locator('.cos-fx-title').textContent()).trim(), initialTitle);
      }

      // Close with keyboard
      const closeBtn = panel.locator('.cos-fx-close-btn');
      await closeBtn.focus();
      await page.keyboard.press('Enter');
      assert.equal(await panel.isHidden(), true, `${rel} panel closes on keyboard Enter`);

      assert.deepEqual(errors.filter((m) => !m.includes('Failed to fetch')), [], `${rel} had page errors`);
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
});
