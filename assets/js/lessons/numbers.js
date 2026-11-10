/* Numbers lesson (lessons/mathematics/foundations/numbers.html).
 * Moved out of the page's inline <script>, unchanged. */
    /* ── Number type details ── */
    const typeInfo = {};

    const integerModes = {
      numberPath: 'Number Path',
      objects: 'Object Groups',
      hops: 'Hop Line'
    };
    const countSteps = [1, 2, 3, 4, 5, 10, 20, 25];
    const advancedCountSteps = [6, 7, 8, 9];
    const integerPrompts = {
      1: 'Count by 1s. Every number goes up by one, one step at a time.',
      2: 'Count by 2s. Which numbers do you land on? They are all even.',
      3: 'Count by 3s. Can you hear the steady rhythm: 3, 6, 9, 12?',
      4: 'Count by 4s. What shape do the totals make as they grow?',
      5: 'Try counting by 5s. What pattern do you notice in the ones place?',
      6: 'Count by 6s. Can you spot doubles and threes working together?',
      7: 'Count by 7s. This one is trickier. Listen for the rhythm.',
      8: 'Count by 8s. Which values feel close to counting by 4s twice?',
      9: 'Count by 9s. What happens to the digits as the totals climb?',
      10: 'Count by 10s. The tens digit grows while the ones digit stays zero.',
      20: 'Count by 20s. This is like adding two tens each time.',
      25: 'Count by 25s. Think quarters, coins, and groups of five fives.'
    };
    const integerLabState = {
      mode: 'numberPath',
      step: 1,
      start: 0,
      jumps: 10,
      visibleCount: 11,
      playing: false,
      timer: null
    };
    const fractionModes = {
      shape: 'Shape Split',
      bar: 'Fraction Bar',
      line: 'Number Line'
    };
    const fractionShapes = {
      circle: 'Circle',
      rectangle: 'Rectangle',
      bar: 'Bar'
    };
    const fractionLabState = {
      mode: 'shape',
      shape: 'circle',
      numerator: 3,
      denominator: 4,
      displayNumerator: 3,
      displayDenominator: 4,
      fillCount: 3,
      fillTimer: null,
      equivalentBase: null
    };
    const decimalModes = {
      grid: 'Blocks',
      line: 'Number Line',
      bridge: 'Fraction Bridge'
    };
    const decimalSnapModes = {
      hundredths: { label: 'Hundredths', step: 0.01 },
      tenths: { label: 'Tenths', step: 0.1 }
    };
    const decimalLabState = {
      mode: 'grid',
      snap: 'hundredths',
      value: 0.25
    };
    const ratioModes = {
      objects: 'Objects',
      bars: 'Bars',
      real: 'Real World'
    };
    const ratioThemes = {
      colors: { label: 'Colors', nounA: 'red blocks', nounB: 'blue blocks' },
      fruit: { label: 'Fruit', nounA: 'apples', nounB: 'oranges' },
      blocks: { label: 'Blocks', nounA: 'red towers', nounB: 'blue towers' }
    };
    const ratioPresets = {
      screen: { a: 16, b: 9, labelA: 'wide', labelB: 'tall', title: 'Screen', sentence: 'For every 16 wide units, there are 9 tall units.' },
      recipe: { a: 2, b: 1, labelA: 'cups flour', labelB: 'cups sugar', title: 'Recipe', sentence: 'For every 2 cups of flour, there is 1 cup of sugar.' },
      blocks: { a: 3, b: 5, labelA: 'red blocks', labelB: 'blue blocks', title: 'Lego Colors', sentence: 'For every 3 red blocks, there are 5 blue blocks.' }
    };
    const ratioLabState = {
      mode: 'objects',
      theme: 'colors',
      a: 3,
      b: 5,
      preset: 'blocks',
      showSimplified: false
    };




    function integerObjectGroupMarkup(size) {
      return Array.from({ length: size }, () => '<span class="num-object-dot"></span>').join('');
    }

    function renderNumberPath(sequence, visibleCount) {
      return `
        <div class="num-path-grid">
          ${sequence.slice(0, visibleCount).map((value, index) => `
            <div class="num-path-cell ${index === visibleCount - 1 ? 'current' : ''}">
              <span class="num-path-number num-data">${value}</span>
              <span class="num-path-word">${integerNumberWord(value)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    function renderObjectGroups(sequence, visibleCount, step) {
      return `
        <div class="num-object-grid">
          ${sequence.slice(0, visibleCount).map((value, index) => {
            if (index === 0) {
              return `
                <div class="num-object-row">
                  <div class="num-object-groups"><div class="num-object-group"><span style="font-size:0.78rem;color: var(--text-muted, #64748b);font-weight:700;">Start at zero</span></div></div>
                  <div class="num-object-label num-data">0</div>
                </div>
              `;
            }
            const groups = Array.from({ length: index }, () => `<div class="num-object-group">${integerObjectGroupMarkup(step)}</div>`).join('');
            return `
              <div class="num-object-row">
                <div class="num-object-groups">${groups}</div>
                <div class="num-object-label num-data">${value}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    function renderHopLine(sequence, visibleCount) {
      const width = 720;
      const height = 220;
      const left = 48;
      const right = width - 48;
      const y = 110;
      const denom = Math.max(sequence.length - 1, 1);
      const xFor = (index) => left + ((right - left) * index) / denom;
      const active = sequence.slice(0, visibleCount);
      const segments = active.slice(1).map((value, index) => {
        const x1 = xFor(index);
        const x2 = xFor(index + 1);
        return `<path class="num-hop-segment" d="M ${x1} ${y} Q ${(x1 + x2) / 2} ${y - 36} ${x2} ${y}" />`;
      }).join('');
      const points = sequence.map((value, index) => {
        const x = xFor(index);
        const activePoint = index < visibleCount;
        return `
          <circle class="num-hop-point ${activePoint ? 'active' : ''}" cx="${x}" cy="${y}" r="10"></circle>
          <text class="num-hop-label" x="${x}" y="${y + 34}">${value}</text>
          <text class="num-hop-word" x="${x}" y="${y + 52}">${integerNumberWord(value)}</text>
        `;
      }).join('');
      return `
        <div class="num-hop-wrap">
          <svg class="num-hop-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Hop number line">
            <line class="num-hop-line" x1="${left}" y1="${y}" x2="${right}" y2="${y}"></line>
            ${segments}
            ${points}
          </svg>
        </div>
      `;
    }

    function stopIntegerAnimation(resetVisible = false) {
      if (integerLabState.timer) {
        clearInterval(integerLabState.timer);
        integerLabState.timer = null;
      }
      integerLabState.playing = false;
      if (resetVisible) integerLabState.visibleCount = integerLabState.jumps + 1;
      const playBtn = document.getElementById('num-count-play');
      if (playBtn) playBtn.textContent = 'Play';
    }

    function renderIntegerLab() {
      const sequence = generateSequence(integerLabState.step, integerLabState.start, integerLabState.jumps + 1);
      integerLabState.visibleCount = Math.max(1, Math.min(integerLabState.visibleCount, sequence.length));
      const visibleSequence = sequence.slice(0, integerLabState.visibleCount);
      const currentValue = visibleSequence[visibleSequence.length - 1];
      document.getElementById('num-count-big-value').textContent = String(currentValue);
      document.getElementById('num-count-big-word').textContent = integerNumberWord(currentValue);
      document.getElementById('num-count-level-pill').textContent = integerStepLevel(integerLabState.step);
      document.getElementById('num-count-rule-pill').textContent = `Counting by ${integerLabState.step}s`;
      document.getElementById('num-count-progress-pill').textContent = `Showing ${visibleSequence.length} values`;
      document.getElementById('num-count-prompt').textContent = integerPrompts[integerLabState.step] || 'Notice how the same amount is added each time.';

      document.querySelectorAll('[data-num-mode]').forEach((btn) => btn.classList.toggle('active', btn.dataset.numMode === integerLabState.mode));
      document.querySelectorAll('[data-num-step]').forEach((btn) => btn.classList.toggle('active', Number(btn.dataset.numStep) === integerLabState.step));
      document.getElementById('num-count-jumps-value').textContent = String(integerLabState.jumps);
      document.getElementById('num-count-jumps').value = String(integerLabState.jumps);
      document.getElementById('num-count-start').value = String(integerLabState.start);

      const visual = document.getElementById('num-count-visual');
      if (integerLabState.mode === 'numberPath') {
        visual.innerHTML = renderNumberPath(sequence, integerLabState.visibleCount);
      } else if (integerLabState.mode === 'objects') {
        visual.innerHTML = renderObjectGroups(sequence, integerLabState.visibleCount, integerLabState.step);
      } else {
        visual.innerHTML = renderHopLine(sequence, integerLabState.visibleCount);
      }
    }

    function updateIntegerLab(partial = {}) {
      Object.assign(integerLabState, partial);
      if (partial.step !== undefined || partial.start !== undefined || partial.jumps !== undefined || partial.mode !== undefined) {
        stopIntegerAnimation();
        integerLabState.visibleCount = integerLabState.jumps + 1;
      }
      renderIntegerLab();
    }

    function toggleIntegerAnimation() {
      const sequenceLength = integerLabState.jumps + 1;
      const playBtn = document.getElementById('num-count-play');
      if (integerLabState.playing) {
        stopIntegerAnimation();
        renderIntegerLab();
        return;
      }
      integerLabState.playing = true;
      integerLabState.visibleCount = 1;
      playBtn.textContent = 'Pause';
      renderIntegerLab();
      integerLabState.timer = setInterval(() => {
        if (integerLabState.visibleCount >= sequenceLength) {
          stopIntegerAnimation();
          renderIntegerLab();
          return;
        }
        integerLabState.visibleCount += 1;
        renderIntegerLab();
      }, 650);
    }

    function buildIntegerLabControls() {
      const modeRow = document.getElementById('num-count-mode-row');
      const stepRow = document.getElementById('num-count-step-row');
      Object.entries(integerModes).forEach(([key, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'num-chip-btn';
        button.dataset.numMode = key;
        button.textContent = label;
        button.addEventListener('click', () => updateIntegerLab({ mode: key }));
        modeRow.appendChild(button);
      });
      [...countSteps, ...advancedCountSteps].forEach((step) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'num-chip-btn';
        button.dataset.numStep = String(step);
        button.textContent = `${step}s`;
        if (advancedCountSteps.includes(step)) button.title = 'Advanced peek';
        button.addEventListener('click', () => updateIntegerLab({ step }));
        stepRow.appendChild(button);
      });

      document.getElementById('num-count-start').addEventListener('input', (event) => {
        const next = Math.max(-20, Math.min(50, parseInt(event.target.value || '0', 10) || 0));
        updateIntegerLab({ start: next });
      });
      document.getElementById('num-count-jumps').addEventListener('input', (event) => {
        updateIntegerLab({ jumps: parseInt(event.target.value, 10) || 10 });
      });
      document.getElementById('num-count-play').addEventListener('click', toggleIntegerAnimation);
      renderIntegerLab();
    }




    function describeFractionPrompt(numerator, denominator) {
      if (numerator === 0) return 'The whole is split, but no parts are filled yet.';
      if (numerator === denominator) return 'All the equal parts are filled, so this fraction makes one whole.';
      if (numerator > denominator) return 'You filled more than one whole. This is an advanced peek at an improper fraction.';
      return 'How many equal parts is the whole split into? How many are filled?';
    }

    function stopFractionFill() {
      if (fractionLabState.fillTimer) {
        clearInterval(fractionLabState.fillTimer);
        fractionLabState.fillTimer = null;
      }
      const playBtn = document.getElementById('num-fraction-fill');
      if (playBtn) playBtn.textContent = 'Play Fill';
    }

    function fractionDisplayData() {
      return generateFraction(fractionLabState.displayNumerator, fractionLabState.displayDenominator);
    }

    function renderFractionCircle(numerator, denominator, fillCount) {
      const cx = 100;
      const cy = 100;
      const r = 84;
      const slices = Array.from({ length: denominator }, (_, index) => {
        const start = (index / denominator) * Math.PI * 2 - Math.PI / 2;
        const end = ((index + 1) / denominator) * Math.PI * 2 - Math.PI / 2;
        const x1 = cx + r * Math.cos(start);
        const y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end);
        const y2 = cy + r * Math.sin(end);
        const large = end - start > Math.PI ? 1 : 0;
        return `<path class="num-fraction-shape-slice ${index < fillCount ? 'filled' : ''}" d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z"></path>`;
      }).join('');
      return `
        <div class="num-fraction-shape-wrap">
          <svg class="num-fraction-svg" viewBox="0 0 200 200" role="img" aria-label="Fraction circle">
            ${slices}
          </svg>
          <div class="num-fraction-whole-label">The denominator makes ${denominator} equal slices. The numerator fills ${fillCount}.</div>
        </div>
      `;
    }

    function renderFractionRectangle(numerator, denominator, fillCount, isBar = false) {
      const width = 320;
      const height = isBar ? 90 : 180;
      const segWidth = width / denominator;
      const segments = Array.from({ length: denominator }, (_, index) => `
        <rect class="num-fraction-rect-segment ${index < fillCount ? 'filled' : ''}" x="${index * segWidth}" y="0" width="${segWidth}" height="${height}" rx="${isBar ? 0 : 0}" ry="${isBar ? 0 : 0}"></rect>
      `).join('');
      return `
        <div class="num-fraction-shape-wrap">
          <svg class="num-fraction-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Fraction rectangle">
            ${segments}
          </svg>
          <div class="num-fraction-whole-label">Equal cuts show the denominator. Color shows how many parts are taken.</div>
        </div>
      `;
    }

    function renderFractionShape() {
      const { displayNumerator, displayDenominator, fillCount, shape } = fractionLabState;
      if (shape === 'rectangle') return renderFractionRectangle(displayNumerator, displayDenominator, fillCount, false);
      if (shape === 'bar') return renderFractionRectangle(displayNumerator, displayDenominator, fillCount, true);
      return renderFractionCircle(displayNumerator, displayDenominator, fillCount);
    }

    function renderFractionBar(numerator, denominator, fillCount) {
      const segments = Array.from({ length: denominator }, (_, index) => `
        <div class="num-fraction-bar-segment ${index < fillCount ? 'filled' : ''}"></div>
      `).join('');
      return `
        <div class="num-fraction-bar-wrap">
          <div class="num-fraction-bar" style="grid-template-columns: repeat(${denominator}, 1fr);">
            ${segments}
          </div>
          <div class="num-fraction-whole-label">A full bar is one whole. ${fillCount} of the ${denominator} equal lengths are shaded.</div>
        </div>
      `;
    }

    function renderFractionLine(numerator, denominator) {
      const width = 600;
      const left = 54;
      const right = width - 54;
      const y = 88;
      const isImproper = numerator > denominator;
      const span = isImproper ? numerator + 1 : denominator;
      const xFor = (step) => left + ((right - left) * step) / span;
      const tickCount = isImproper ? numerator + 1 : denominator + 1;
      const ticks = Array.from({ length: tickCount }, (_, index) => {
        const x = xFor(index);
        const isMajor = index === 0 || index % denominator === 0 || index === numerator;
        const label = index === 0 ? '0' : index % denominator === 0 ? String(index / denominator) : `${index}/${denominator}`;
        return `
          <line class="num-fraction-line-tick ${isMajor ? 'major' : ''}" x1="${x}" y1="${y - (isMajor ? 20 : 12)}" x2="${x}" y2="${y + (isMajor ? 20 : 12)}"></line>
          ${isMajor ? `<text class="num-fraction-line-label" x="${x}" y="${y + 42}">${label}</text>` : ''}
        `;
      }).join('');
      const targetX = xFor(numerator);
      return `
        <div class="num-fraction-line-wrap">
          <svg class="num-fraction-line-svg" viewBox="0 0 ${width} 180" role="img" aria-label="Fraction number line">
            <line class="num-fraction-line-base" x1="${left}" y1="${y}" x2="${right}" y2="${y}"></line>
            <line class="num-fraction-line-fill" x1="${left}" y1="${y}" x2="${targetX}" y2="${y}"></line>
            ${ticks}
            <circle class="num-fraction-line-dot" cx="${targetX}" cy="${y}" r="10"></circle>
            <text class="num-fraction-line-caption" x="${targetX}" y="${y - 28}">${numerator}/${denominator}${isImproper ? ` = ${(numerator/denominator).toFixed(2)}` : ''}</text>
          </svg>
        </div>
      `;
    }

    function renderFractionOverflowWholes(numerator, denominator) {
      if (numerator <= denominator) return '';
      const wholes = Math.floor(numerator / denominator);
      const rem = numerator % denominator;
      return `
        <div class="num-fraction-whole-group">
          ${Array.from({ length: wholes }, () => '<div class="num-fraction-whole-mini"></div>').join('')}
          ${rem ? `<span class="num-fraction-whole-label">and ${rem}/${denominator} more</span>` : ''}
        </div>
      `;
    }

    function renderFractionLab() {
      const { numerator, denominator, displayNumerator, displayDenominator, fillCount, mode } = fractionLabState;
      const frac = fractionDisplayData();
      document.getElementById('num-fraction-symbol').textContent = `${displayNumerator}/${displayDenominator}`;
      document.getElementById('num-fraction-name').textContent = fractionName(displayNumerator, displayDenominator);
      document.getElementById('num-fraction-level-pill').textContent = fractionLevel(denominator, numerator);
      document.getElementById('num-fraction-whole-pill').textContent = `${fillCount} of ${displayDenominator} parts`;
      document.getElementById('num-fraction-value-pill').textContent = `Value ${frac.value.toFixed(2)}`;
      document.getElementById('num-fraction-prompt').textContent = describeFractionPrompt(displayNumerator, displayDenominator);
      document.getElementById('num-fraction-denominator-value').textContent = String(denominator);
      document.getElementById('num-fraction-numerator-value').textContent = String(numerator);
      document.getElementById('num-fraction-denominator').value = String(denominator);
      document.getElementById('num-fraction-numerator').max = String(denominator);
      document.getElementById('num-fraction-numerator').value = String(numerator);

      document.querySelectorAll('[data-fraction-mode]').forEach((btn) => btn.classList.toggle('active', btn.dataset.fractionMode === mode));
      document.querySelectorAll('[data-fraction-shape]').forEach((btn) => btn.classList.toggle('active', btn.dataset.fractionShape === fractionLabState.shape));
      const shapeRow = document.getElementById('num-fraction-shape-row');
      if (shapeRow) shapeRow.style.display = mode === 'shape' ? '' : 'none';
      const fillBtn = document.getElementById('num-fraction-fill');
      if (fillBtn) fillBtn.closest('.num-mini-control').style.display = mode === 'line' ? 'none' : '';

      const visual = document.getElementById('num-fraction-visual');
      if (mode === 'shape') {
        visual.innerHTML = `${renderFractionShape()}${renderFractionOverflowWholes(displayNumerator, displayDenominator)}`;
      } else if (mode === 'bar') {
        visual.innerHTML = `${renderFractionBar(displayNumerator, displayDenominator, fillCount)}${renderFractionOverflowWholes(displayNumerator, displayDenominator)}`;
      } else {
        visual.innerHTML = renderFractionLine(displayNumerator, displayDenominator);
      }
    }

    function updateFractionLab(partial = {}) {
      Object.assign(fractionLabState, partial);
      stopFractionFill();
      if (partial.denominator !== undefined && fractionLabState.numerator > fractionLabState.denominator) {
        fractionLabState.numerator = fractionLabState.denominator;
      }
      if (partial.numerator !== undefined || partial.denominator !== undefined) {
        fractionLabState.displayNumerator = fractionLabState.numerator;
        fractionLabState.displayDenominator = fractionLabState.denominator;
        fractionLabState.equivalentBase = null;
      }
      fractionLabState.fillCount = Math.min(fractionLabState.fillCount, fractionLabState.displayNumerator);
      fractionLabState.fillCount = fractionLabState.displayNumerator;
      renderFractionLab();
    }

    function playFractionFill() {
      const playBtn = document.getElementById('num-fraction-fill');
      if (fractionLabState.fillTimer) {
        stopFractionFill();
        renderFractionLab();
        return;
      }
      fractionLabState.fillCount = 0;
      playBtn.textContent = 'Pause';
      renderFractionLab();
      fractionLabState.fillTimer = setInterval(() => {
        if (fractionLabState.fillCount >= fractionLabState.displayNumerator) {
          stopFractionFill();
          renderFractionLab();
          return;
        }
        fractionLabState.fillCount += 1;
        renderFractionLab();
      }, 420);
    }

    function showEquivalentFraction() {
      stopFractionFill();
      const base = fractionLabState.equivalentBase || {
        numerator: fractionLabState.numerator,
        denominator: fractionLabState.denominator
      };
      fractionLabState.equivalentBase = base;
      const multiplier = Math.min(3, Math.max(2, Math.floor(10 / base.denominator)));
      fractionLabState.displayNumerator = base.numerator * multiplier;
      fractionLabState.displayDenominator = base.denominator * multiplier;
      fractionLabState.fillCount = fractionLabState.displayNumerator;
      document.getElementById('num-fraction-eq-note').textContent = `${base.numerator}/${base.denominator} and ${fractionLabState.displayNumerator}/${fractionLabState.displayDenominator} name the same amount.`;
      renderFractionLab();
    }

    function resetEquivalentFraction() {
      stopFractionFill();
      fractionLabState.equivalentBase = null;
      fractionLabState.displayNumerator = fractionLabState.numerator;
      fractionLabState.displayDenominator = fractionLabState.denominator;
      fractionLabState.fillCount = fractionLabState.displayNumerator;
      document.getElementById('num-fraction-eq-note').textContent = 'Same amount, same whole, just a different cut.';
      renderFractionLab();
    }

    function buildFractionLabControls() {
      const modeRow = document.getElementById('num-fraction-mode-row');
      const shapeRow = document.getElementById('num-fraction-shape-row');
      Object.entries(fractionModes).forEach(([key, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'num-chip-btn';
        button.dataset.fractionMode = key;
        button.textContent = label;
        button.addEventListener('click', () => updateFractionLab({ mode: key }));
        modeRow.appendChild(button);
      });
      Object.entries(fractionShapes).forEach(([key, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'num-chip-btn';
        button.dataset.fractionShape = key;
        button.textContent = label;
        button.addEventListener('click', () => updateFractionLab({ shape: key }));
        shapeRow.appendChild(button);
      });
      document.getElementById('num-fraction-denominator').addEventListener('input', (event) => {
        const denominator = parseInt(event.target.value, 10) || 2;
        const nextNumerator = Math.min(fractionLabState.numerator, denominator);
        updateFractionLab({ denominator, numerator: nextNumerator });
      });
      document.getElementById('num-fraction-numerator').addEventListener('input', (event) => {
        updateFractionLab({ numerator: parseInt(event.target.value, 10) || 0 });
      });
      document.getElementById('num-fraction-fill').addEventListener('click', playFractionFill);
      document.getElementById('num-fraction-equivalent').addEventListener('click', showEquivalentFraction);
      document.getElementById('num-fraction-reset-equivalent').addEventListener('click', resetEquivalentFraction);
      renderFractionLab();
    }


    function renderDecimalGrid(data) {
      return `
        <div class="num-decimal-grid">
          ${Array.from({ length: 100 }, (_, index) => `
            <div class="num-decimal-cell ${index < data.hundredths ? 'filled' : ''}"></div>
          `).join('')}
        </div>
        <div class="num-decimal-grid-caption">${data.hundredths} of the 100 tiny squares are filled.</div>
      `;
    }

    function renderDecimalLine(data) {
      const width = 600;
      const left = 54;
      const right = width - 54;
      const y = 88;
      const xFor = (step) => left + ((right - left) * step) / 10;
      const targetX = left + ((right - left) * data.value);
      return `
        <div class="num-decimal-line-wrap">
          <svg class="num-decimal-line-svg" viewBox="0 0 ${width} 180" role="img" aria-label="Decimal number line">
            <line class="num-decimal-line-base" x1="${left}" y1="${y}" x2="${right}" y2="${y}"></line>
            <line class="num-decimal-line-fill" x1="${left}" y1="${y}" x2="${targetX}" y2="${y}"></line>
            ${Array.from({ length: 11 }, (_, index) => `
              <line class="num-decimal-line-tick ${index === Math.round(data.value * 10) ? 'major' : ''}" x1="${xFor(index)}" y1="${y - 18}" x2="${xFor(index)}" y2="${y + 18}"></line>
              <text class="num-decimal-line-label" x="${xFor(index)}" y="${y + 40}">${(index / 10).toFixed(1)}</text>
            `).join('')}
            <circle class="num-decimal-line-dot" cx="${targetX}" cy="${y}" r="10"></circle>
            <text class="num-decimal-line-label" x="${targetX}" y="${y - 28}">${data.value.toFixed(2)}</text>
          </svg>
        </div>
      `;
    }

    function renderDecimalBridge(data) {
      const g = gcd(data.fraction.numerator, 100);
      const simpN = data.fraction.numerator / g;
      const simpD = 100 / g;
      const isAlreadySimple = g === data.fraction.numerator || simpD === 100;
      const simplifiedNote = g > 1 && simpN !== data.fraction.numerator
        ? `<span style="font-size:1rem;color: var(--text-muted, #64748b);">= <strong style="color:#24a148;">${simpN}/${simpD}</strong></span>` : '';
      return `
        <div class="num-decimal-bridge">
          <div class="num-decimal-bridge-eq num-data">
            <span>${data.value.toFixed(2)}</span>
            <span>=</span>
            <span>${data.fraction.numerator}/100</span>
            ${simplifiedNote}
          </div>
          <div class="num-decimal-bridge-note">${g > 1 && simpN !== data.fraction.numerator ? `Both fractions name the same amount. Divide numerator and denominator by ${g} to simplify.` : 'The decimal and fraction name the same amount of one whole.'}</div>
        </div>
      `;
    }

    function renderDecimalLab() {
      const data = getDecimalData(decimalLabState.value);
      document.getElementById('num-decimal-symbol').textContent = data.value.toFixed(2);
      document.getElementById('num-decimal-name').textContent = decimalWordLabel(data);
      document.getElementById('num-decimal-hundredths-pill').textContent = `${data.hundredths} hundredths`;
      document.getElementById('num-decimal-tenths-pill').textContent = `${data.tenths} tenths`;
      document.getElementById('num-decimal-fraction-pill').textContent = `${data.fraction.numerator}/100`;
      document.getElementById('num-decimal-value-label').textContent = data.value.toFixed(2);
      document.getElementById('num-decimal-prompt').textContent = data.hundredths % 10 === 0 ? 'How many tenths are shaded?' : 'How many hundredths are filled?';
      const slider = document.getElementById('num-decimal-value');
      slider.value = String(decimalLabState.value);
      slider.step = String(decimalSnapModes[decimalLabState.snap].step);
      document.querySelectorAll('[data-decimal-mode]').forEach((btn) => btn.classList.toggle('active', btn.dataset.decimalMode === decimalLabState.mode));
      document.querySelectorAll('[data-decimal-snap]').forEach((btn) => btn.classList.toggle('active', btn.dataset.decimalSnap === decimalLabState.snap));
      const visual = document.getElementById('num-decimal-visual');
      if (decimalLabState.mode === 'grid') visual.innerHTML = renderDecimalGrid(data);
      else if (decimalLabState.mode === 'line') visual.innerHTML = renderDecimalLine(data);
      else visual.innerHTML = renderDecimalBridge(data);
    }

    function updateDecimalLab(partial = {}) {
      Object.assign(decimalLabState, partial);
      const step = decimalSnapModes[decimalLabState.snap].step;
      decimalLabState.value = Math.max(0, Math.min(1, Math.round(decimalLabState.value / step) * step));
      decimalLabState.value = Number(decimalLabState.value.toFixed(2));
      renderDecimalLab();
    }

    function buildDecimalLabControls() {
      const modeRow = document.getElementById('num-decimal-mode-row');
      const snapRow = document.getElementById('num-decimal-snap-row');
      Object.entries(decimalModes).forEach(([key, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'num-chip-btn';
        button.dataset.decimalMode = key;
        button.textContent = label;
        button.addEventListener('click', () => updateDecimalLab({ mode: key }));
        modeRow.appendChild(button);
      });
      Object.entries(decimalSnapModes).forEach(([key, config]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'num-chip-btn';
        button.dataset.decimalSnap = key;
        button.textContent = config.label;
        button.addEventListener('click', () => updateDecimalLab({ snap: key }));
        snapRow.appendChild(button);
      });
      document.getElementById('num-decimal-value').addEventListener('input', (event) => {
        updateDecimalLab({ value: parseFloat(event.target.value) || 0 });
      });
      renderDecimalLab();
    }


    function renderRatioObjects(a, b, theme) {
      const config = ratioThemes[theme];
      return `
        <div class="num-ratio-objects">
          <div class="num-ratio-group">
            ${Array.from({ length: a }, () => '<span class="num-ratio-dot a"></span>').join('')}
            <span class="num-ratio-group-label">${a} ${config.nounA}</span>
          </div>
          <div class="num-ratio-group">
            ${Array.from({ length: b }, () => '<span class="num-ratio-dot b"></span>').join('')}
            <span class="num-ratio-group-label">${b} ${config.nounB}</span>
          </div>
        </div>
      `;
    }

    function renderRatioBars(a, b, theme) {
      const config = ratioThemes[theme];
      return `
        <div class="num-ratio-bars">
          <div class="num-ratio-bar-row">
            <div class="num-ratio-bar a" style="width:${a * 24}px"></div>
            <span class="num-ratio-bar-value">${a} ${config.nounA}</span>
          </div>
          <div class="num-ratio-bar-row">
            <div class="num-ratio-bar b" style="width:${b * 24}px"></div>
            <span class="num-ratio-bar-value">${b} ${config.nounB}</span>
          </div>
        </div>
      `;
    }

    function renderRatioRealWorld() {
      const preset = ratioPresets[ratioLabState.preset];
      const { a, b, labelA, labelB, title, sentence } = preset;
      const cardVisual = ratioLabState.preset === 'screen'
        ? `<div class="num-ratio-screen num-data">${a}:${b}</div>`
        : `
          <div class="num-ratio-real-bars">
            <div class="num-ratio-bar-row">
              <div class="num-ratio-bar a" style="width:${Math.min(320, a * 28)}px"></div>
              <span class="num-ratio-bar-value">${a} ${labelA}</span>
            </div>
            <div class="num-ratio-bar-row">
              <div class="num-ratio-bar b" style="width:${Math.min(320, b * 28)}px"></div>
              <span class="num-ratio-bar-value">${b} ${labelB}</span>
            </div>
          </div>
        `;
      return `
        <div class="num-ratio-real">
          <div class="num-ratio-real-card">
            <div class="num-ratio-name">${title}</div>
            ${cardVisual}
            <div class="num-ratio-real-caption">${sentence}</div>
          </div>
        </div>
      `;
    }

    function updateRatioSentence(a, b, theme) {
      const config = ratioThemes[theme];
      return `For every ${a} ${config.nounA}, there ${b === 1 ? 'is' : 'are'} ${b} ${config.nounB}.`;
    }

    function renderRatioLab() {
      const ratio = getRatioData(ratioLabState.a, ratioLabState.b);
      const displayA = ratioLabState.showSimplified ? ratio.simplifiedA : ratio.a;
      const displayB = ratioLabState.showSimplified ? ratio.simplifiedB : ratio.b;
      const config = ratioThemes[ratioLabState.theme];
      document.getElementById('num-ratio-a-value').textContent = String(ratioLabState.a);
      document.getElementById('num-ratio-b-value').textContent = String(ratioLabState.b);
      document.getElementById('num-ratio-symbol').textContent = `${displayA} : ${displayB}`;
      document.getElementById('num-ratio-name').textContent = `${integerNumberWord(displayA)} to ${integerNumberWord(displayB)}`;
      document.getElementById('num-ratio-level-pill').textContent = ratioLevel(ratioLabState.a, ratioLabState.b);
      document.getElementById('num-ratio-simple-pill').textContent = `Simple form ${ratio.simplifiedA} : ${ratio.simplifiedB}`;
      document.getElementById('num-ratio-theme-pill').textContent = ratioLabState.mode === 'real' ? ratioPresets[ratioLabState.preset].title : config.label;
      document.getElementById('num-ratio-sentence').textContent = ratioLabState.mode === 'real'
        ? ratioPresets[ratioLabState.preset].sentence
        : updateRatioSentence(displayA, displayB, ratioLabState.theme);
      document.getElementById('num-ratio-prompt').textContent = ratioLabState.mode === 'bars'
        ? 'Which bar is bigger, and by how much?'
        : ratioLabState.mode === 'real'
          ? 'What does “for every” mean in this real-world example?'
          : 'How many red for every blue?';
      document.getElementById('num-ratio-a').value = String(ratioLabState.a);
      document.getElementById('num-ratio-b').value = String(ratioLabState.b);
      document.querySelectorAll('[data-ratio-mode]').forEach((btn) => btn.classList.toggle('active', btn.dataset.ratioMode === ratioLabState.mode));
      document.querySelectorAll('[data-ratio-theme]').forEach((btn) => btn.classList.toggle('active', btn.dataset.ratioTheme === ratioLabState.theme));
      document.querySelectorAll('[data-ratio-preset]').forEach((btn) => btn.classList.toggle('active', btn.dataset.ratioPreset === ratioLabState.preset));
      const visual = document.getElementById('num-ratio-visual');
      if (ratioLabState.mode === 'objects') {
        visual.innerHTML = renderRatioObjects(displayA, displayB, ratioLabState.theme);
      } else if (ratioLabState.mode === 'bars') {
        visual.innerHTML = renderRatioBars(displayA, displayB, ratioLabState.theme);
      } else {
        visual.innerHTML = renderRatioRealWorld();
      }
    }

    function updateRatioLab(partial = {}) {
      Object.assign(ratioLabState, partial);
      if (partial.a !== undefined || partial.b !== undefined || partial.theme !== undefined || partial.mode !== undefined || partial.preset !== undefined) {
        if (partial.mode !== undefined && partial.mode !== 'real') ratioLabState.showSimplified = false;
      }
      renderRatioLab();
    }

    function simplifyRatioDisplay() {
      ratioLabState.showSimplified = true;
      renderRatioLab();
    }

    function buildRatioLabControls() {
      const modeRow = document.getElementById('num-ratio-mode-row');
      const themeRow = document.getElementById('num-ratio-theme-row');
      const presetRow = document.getElementById('num-ratio-preset-row');
      Object.entries(ratioModes).forEach(([key, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'num-chip-btn';
        button.dataset.ratioMode = key;
        button.textContent = label;
        button.addEventListener('click', () => {
          const nextMode = key;
          updateRatioLab({ mode: nextMode });
          themeRow.style.display = nextMode === 'real' ? 'none' : '';
          presetRow.style.display = nextMode === 'real' ? '' : 'none';
        });
        modeRow.appendChild(button);
      });
      Object.entries(ratioThemes).forEach(([key, config]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'num-chip-btn';
        button.dataset.ratioTheme = key;
        button.textContent = config.label;
        button.addEventListener('click', () => updateRatioLab({ theme: key }));
        themeRow.appendChild(button);
      });
      Object.entries(ratioPresets).forEach(([key, preset]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'num-chip-btn';
        button.dataset.ratioPreset = key;
        button.textContent = preset.title;
        button.addEventListener('click', () => updateRatioLab({ mode: 'real', preset: key, a: preset.a, b: preset.b }));
        presetRow.appendChild(button);
      });
      document.getElementById('num-ratio-a').addEventListener('input', (event) => {
        updateRatioLab({ a: parseInt(event.target.value, 10) || 1, showSimplified: false });
      });
      document.getElementById('num-ratio-b').addEventListener('input', (event) => {
        updateRatioLab({ b: parseInt(event.target.value, 10) || 1, showSimplified: false });
      });
      document.getElementById('num-ratio-simplify').addEventListener('click', simplifyRatioDisplay);
      renderRatioLab();
    }

    function selectType(el, type) {
      document.querySelectorAll('.num-type-grid[role="tablist"] .num-type-card').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      el.classList.add('active');
      el.setAttribute('aria-selected', 'true');
      const d = document.getElementById('num-type-detail');
      const integerLab = document.getElementById('num-integer-lab');
      const fractionLab = document.getElementById('num-fraction-lab');
      const decimalLab = document.getElementById('num-decimal-lab');
      const ratioLab = document.getElementById('num-ratio-lab');
      if (type === 'integer') {
        d.classList.remove('visible');
        integerLab.classList.add('visible');
        fractionLab.classList.remove('visible');
        decimalLab.classList.remove('visible');
        ratioLab.classList.remove('visible');
        renderIntegerLab();
        return;
      }
      if (type === 'fraction') {
        d.classList.remove('visible');
        integerLab.classList.remove('visible');
        fractionLab.classList.add('visible');
        decimalLab.classList.remove('visible');
        ratioLab.classList.remove('visible');
        renderFractionLab();
        return;
      }
      if (type === 'decimal') {
        d.classList.remove('visible');
        integerLab.classList.remove('visible');
        fractionLab.classList.remove('visible');
        decimalLab.classList.add('visible');
        ratioLab.classList.remove('visible');
        renderDecimalLab();
        return;
      }
      if (type === 'ratio') {
        d.classList.remove('visible');
        integerLab.classList.remove('visible');
        fractionLab.classList.remove('visible');
        decimalLab.classList.remove('visible');
        ratioLab.classList.add('visible');
        renderRatioLab();
        return;
      }
      integerLab.classList.remove('visible');
      fractionLab.classList.remove('visible');
      decimalLab.classList.remove('visible');
      ratioLab.classList.remove('visible');
      d.innerHTML = typeInfo[type];
      d.classList.add('visible');
    }

    buildIntegerLabControls();
    buildFractionLabControls();
    buildDecimalLabControls();
    buildRatioLabControls();

    /* Open Integers lab by default so the section is immediately interactive */
    (function() {
      const firstCard = document.querySelector('.num-type-card[onclick*="integer"]');
      if (firstCard) selectType(firstCard, 'integer');
    })();

    /* Keyboard support for the number-type tablist (Enter/Space to activate, arrow keys to move) */
    (function() {
      const tabs = Array.from(document.querySelectorAll('.num-type-grid[role="tablist"] .num-type-card'));
      tabs.forEach((tab, idx) => {
        tab.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            tab.click();
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            tabs[(idx + 1) % tabs.length].focus();
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            tabs[(idx - 1 + tabs.length) % tabs.length].focus();
          }
        });
      });
    })();

    /* ── Prime helpers ── */
    let primeCells = [];
    let sieveRunId = 0;


    /* ── Build prime grid ── */
    (function() {
      const grid = document.getElementById('num-prime-grid');
      for (let i = 1; i <= 100; i++) {
        const cell = document.createElement('div');
        cell.className = 'num-prime-cell';
        cell.dataset.number = String(i);
        cell.textContent = i;
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');
        if (i === 1) cell.classList.add('is-one');
        else if (isPrime(i)) cell.classList.add('is-prime');
        cell.setAttribute('aria-label', i === 1 ? '1, neither prime nor composite' : isPrime(i) ? `${i}, prime` : `${i}, composite`);
        cell.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cell.click(); }
        });
        cell.addEventListener('click', () => {
          document.querySelectorAll('.num-prime-cell.selected').forEach(c => c.classList.remove('selected'));
          cell.classList.add('selected');
          const info = document.getElementById('num-prime-info');
          if (i === 1) {
            info.innerHTML = '<strong>1</strong> is special — neither prime nor composite. If 1 were prime, the Fundamental Theorem of Arithmetic would break (factorisation wouldn\'t be unique).';
          } else if (isPrime(i)) {
            info.innerHTML = `<strong>${i} is PRIME.</strong> Only divisible by 1 and ${i}. It's an atomic number — cannot be broken down further.`;
          } else {
            const pf = primeFactors(i);
            info.innerHTML = `<strong>${i} is composite.</strong> Factors: ${getFactors(i).join(', ')}. Prime factorisation: <strong style="color:#ff9500;">${i} = ${pf.join(' × ')}</strong>.`;
          }
        });
        grid.appendChild(cell);
        primeCells.push(cell);
      }
    })();

    function resetPrimeGrid(cancelRun = true) {
      if (cancelRun) sieveRunId += 1;
      primeCells.forEach((cell) => {
        cell.classList.remove('is-crossed', 'is-sieve-focus', 'selected');
      });
      document.getElementById('num-sieve-status').textContent = 'Ready to filter multiples.';
      document.getElementById('num-prime-info').innerHTML = 'Click any number above to see its factors.';
    }

    async function runSieve() {
      const runId = ++sieveRunId;
      resetPrimeGrid(false);
      const status = document.getElementById('num-sieve-status');
      const info = document.getElementById('num-prime-info');
      const limit = 100;
      const crossed = new Set([1]);

      for (let base = 2; base * base <= limit; base += 1) {
        if (runId !== sieveRunId || crossed.has(base)) return;
        const baseCell = primeCells[base - 1];
        baseCell.classList.add('is-sieve-focus');
        status.textContent = `Filtering multiples of ${base}...`;
        info.innerHTML = `<strong class="num-data">${base}</strong> survives the sieve, so it is prime. Now cross out every larger multiple of ${base}.`;
        await new Promise((resolve) => setTimeout(resolve, 520));

        for (let multiple = base * 2; multiple <= limit; multiple += base) {
          if (runId !== sieveRunId) return;
          if (crossed.has(multiple)) continue;
          crossed.add(multiple);
          const cell = primeCells[multiple - 1];
          cell.classList.add('is-crossed');
          await new Promise((resolve) => setTimeout(resolve, 70));
        }

        baseCell.classList.remove('is-sieve-focus');
      }

      status.textContent = 'Sieve complete: the uncrossed numbers are prime.';
      info.innerHTML = '<strong>Prime survivors:</strong> the numbers left standing are the atoms of the grid. Every crossed-out number was a multiple of something smaller.';
    }

    /* ── Factor finder ── */
    function findFactors() {
      const n = parseInt(document.getElementById('num-factor-in').value, 10);
      const out = document.getElementById('num-factor-result');
      if (isNaN(n) || n < 2 || n > 10000) {
        out.innerHTML = '<span style="color:#ff3b30;">Enter a whole number between 2 and 10,000.</span>';
        return;
      }
      const factors = getFactors(n);
      const pf = primeFactors(n);
      const prime = isPrime(n);
      const chips = factors.map(f => {
        const cls = isPrime(f) && f > 1 ? 'num-chip prime-chip' : 'num-chip';
        return `<span class="${cls}">${f}${isPrime(f) && f > 1 ? ' ★' : ''}</span>`;
      }).join('');
      out.innerHTML = `<div style="margin-bottom:0.4rem;"><strong>${n}</strong> is <strong style="color:${prime ? '#ff9500' : 'inherit'}">${prime ? '⭐ PRIME' : 'composite'}</strong> — ${factors.length} factor${factors.length !== 1 ? 's' : ''}.</div>
<div class="num-chips">${chips}</div>
${!prime ? `<div style="margin-top:0.45rem;font-size:0.82rem;color: var(--text-muted, #64748b);">Prime factorisation: ${n} = ${pf.map(f=>`<strong style="color:#ff9500;">${f}</strong>`).join(' × ')}</div>` : ''}`;
    }
    findFactors();

    /* ── Modular string art ── */
    const modState = {
      n: 180,
      multiplier: 2,
      targetMultiplier: 2,
      speed: 0.35
    };

    function updateModControls() {
      modState.n = parseInt(document.getElementById('num-mod-points').value, 10);
      modState.speed = parseFloat(document.getElementById('num-mod-speed').value);
      document.getElementById('num-mod-points-val').textContent = String(modState.n);
      document.getElementById('num-mod-speed-val').textContent = `${modState.speed.toFixed(2)}x`;
    }


    function setManualMultiplier(value) {
      modState.targetMultiplier = parseFloat(value);
      document.getElementById('num-mod-multiplier-val').textContent = modState.targetMultiplier.toFixed(2);
    }

    const modCanvas = document.getElementById('num-mod-canvas');
    let modCtx, modWidth = 720, modHeight = 420;
    SimKit.canvas2d(modCanvas, { onResize: function (rCtx, w, h) {
      modCtx = rCtx; modWidth = w; modHeight = h;
    } });

    function drawModPattern(dt, time) {
      const ctx = modCtx;
      const width = modWidth;
      const height = modHeight;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#090b10';
      ctx.fillRect(0, 0, width, height);

      modState.multiplier += (modState.targetMultiplier - modState.multiplier) * 0.08;
      const n = modState.n;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.37;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,149,0,0.2)';
      ctx.lineWidth = 1.25;
      ctx.stroke();

      for (let i = 0; i < n; i += 1) {
        const angle1 = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x1 = cx + radius * Math.cos(angle1);
        const y1 = cy + radius * Math.sin(angle1);
        const target = (i * modState.multiplier) % n;
        const angle2 = (target / n) * Math.PI * 2 - Math.PI / 2;
        const x2 = cx + radius * Math.cos(angle2);
        const y2 = cy + radius * Math.sin(angle2);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(255,149,0,0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      document.getElementById('num-mod-multiplier-val').textContent = modState.targetMultiplier.toFixed(2);
      document.getElementById('num-mod-eq').textContent = `x → (x × ${modState.multiplier.toFixed(2)}) mod ${n}`;
      document.getElementById('num-mod-family').textContent = describeModFamily(modState.multiplier);
      document.getElementById('num-mod-explain').textContent =
        `With ${n} points on the circle, each point connects to its multiplied remainder. Multiplier ${modState.multiplier.toFixed(2)} bends the web into a ${describeModFamily(modState.multiplier).replace('Family: ', '').toLowerCase()}.`;

      if (modState.speed > 0) {
        const base = 2 + Math.sin(time * 0.00022 * (0.3 + modState.speed)) * (1.8 + modState.speed * 4.2);
        modState.targetMultiplier = Math.max(1, Math.min(20, base + 1));
        document.getElementById('num-mod-multiplier').value = modState.targetMultiplier.toFixed(2);
      }
    }

    updateModControls();
    setManualMultiplier(document.getElementById('num-mod-multiplier').value);
    SimKit.loop(drawModPattern, { el: SimKit.stage('#num-mod-canvas') });

    /* ── Infinite number line ── */
    const numberLineState = { level: 0, center: 0.5 };

    const lineCanvas = document.getElementById('num-line-canvas');
    let lineCtx, lineWidth = 900;
    const lineStage = SimKit.canvas2d(lineCanvas, { height: 180, onResize: function (rCtx, w) {
      lineCtx = rCtx; lineWidth = w;
      renderNumberLine();
    } });

    function renderNumberLine() {
      const ctx = lineCtx;
      const width = lineWidth;
      const height = 180;
      ctx.clearRect(0, 0, width, height);

      const span = 1 / Math.pow(2, numberLineState.level);
      let min = numberLineState.center - span / 2;
      let max = numberLineState.center + span / 2;
      if (min < 0) { max -= min; min = 0; }
      if (max > 1) { min -= (max - 1); max = 1; }
      min = Math.max(0, min);
      max = Math.min(1, max);

      const y = 96;
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 40, y);
      ctx.stroke();

      const stepDenom = Math.pow(2, Math.min(numberLineState.level + 1, 8));
      for (let i = 0; i <= stepDenom; i += 1) {
        const value = i / stepDenom;
        if (value < min - 1e-9 || value > max + 1e-9) continue;
        const ratio = (value - min) / (max - min || 1);
        const x = 40 + ratio * (width - 80);
        const major = i % 2 === 0 || numberLineState.level >= 3;
        ctx.strokeStyle = major ? '#ff9500' : 'rgba(255,149,0,0.35)';
        ctx.lineWidth = major ? 2.4 : 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y - (major ? 24 : 12));
        ctx.lineTo(x, y + (major ? 24 : 12));
        ctx.stroke();

        if (major) {
          const getGcd = (a, b) => b === 0 ? a : getGcd(b, a % b);
          const div = getGcd(i, stepDenom);
          const label = value === 0 || value === 1
            ? String(value)
            : `${i / div}/${stepDenom / div}`;
          ctx.fillStyle = '#ff9500';
          ctx.font = '600 12px "IBM Plex Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(label, x, y - 32);
        }
      }

      document.getElementById('num-line-range-pill').textContent = `Window: ${min.toFixed(4)} → ${max.toFixed(4)}`;
      document.getElementById('num-line-step-pill').textContent = `Resolution: 1/${stepDenom}`;
    }

    function zoomNumberLine(direction) {
      numberLineState.level = Math.max(0, Math.min(7, numberLineState.level + direction));
      renderNumberLine();
    }

    /* ── Divide by zero demo ── */
    function updateZero() {
      const d = parseFloat(document.getElementById('num-zero-range').value);
      const result = 10 / d;
      const display = document.querySelector('.num-zero-display');
      document.getElementById('num-zero-dval').textContent = d.toFixed(2);
      document.getElementById('num-zero-eq').textContent = `10 ÷ ${d.toFixed(2)}`;
      document.getElementById('num-zero-res').textContent =
        result > 99999 ? '→ ∞  (undefined)' : `= ${result.toFixed(2)}`;
      document.getElementById('num-zero-fill').style.width =
        Math.min((result / 1000) * 100, 100) + '%';
      const pct = ((d - 0.01) / 4.99) * 100;
      document.getElementById('num-zero-range').style.background =
        `linear-gradient(90deg,#ff3b30 0%,#ff9500 ${pct}%,rgba(0,0,0,0.12) ${pct}%)`;
      if (display) {
        display.classList.remove('is-unstable');
        if (d <= 0.35) {
          void display.offsetWidth;
          display.classList.add('is-unstable');
        }
      }
    }
    updateZero();

    /* ── Practice checker ── */
    const practiceAnswered = {};
    function updateScoreBar() {
      const correct = Object.values(practiceAnswered).filter(Boolean).length;
      const total = 5;
      document.getElementById('num-score-val').textContent = `${correct} / ${total}`;
      document.getElementById('num-score-fill').style.width = `${(correct / total) * 100}%`;
    }
    function chk(qId, answer, fbId, hintId) {
      const val = document.getElementById(qId).value.trim();
      const fb   = document.getElementById(fbId);
      const hint = document.getElementById(hintId);
      if (val === String(answer)) {
        fb.textContent = '✓ Correct!'; fb.className = 'num-fb ok';
        hint.classList.remove('show');
        if (!practiceAnswered[qId]) { practiceAnswered[qId] = true; updateScoreBar(); }
      } else {
        fb.textContent = '✗ Try again'; fb.className = 'num-fb bad';
        hint.classList.add('show');
        practiceAnswered[qId] = false; updateScoreBar();
      }
    }
    document.querySelectorAll('.num-ans').forEach((input) => {
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const btn = input.closest('.num-problem-row')?.querySelector('.num-check');
        if (btn) btn.click();
      });
    });
