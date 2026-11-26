(function () {
  'use strict';

  /* ── Shared Math & Theme Helpers ── */
  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a;
  }

  function lcm(a, b) {
    if (!a || !b) return 0;
    return Math.abs((a * b) / gcd(a, b));
  }

  function isPrime(n) {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i * i <= n; i += 2) {
      if (n % i === 0) return false;
    }
    return true;
  }

  function getFactors(n) {
    const f = [];
    for (let i = 1; i * i <= n; i += 1) {
      if (n % i === 0) {
        f.push(i);
        if (i !== n / i) f.push(n / i);
      }
    }
    return f.sort((a, b) => a - b);
  }

  function primeFactors(n) {
    const r = [];
    let d = 2;
    let rem = n;
    while (d * d <= rem) {
      while (rem % d === 0) {
        r.push(d);
        rem /= d;
      }
      d += 1;
    }
    if (rem > 1) r.push(rem);
    return r;
  }

  function formatPrimeExponents(pf) {
    const counts = new Map();
    pf.forEach((p) => counts.set(p, (counts.get(p) || 0) + 1));
    const supMap = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    const toSup = (num) => String(num).split('').map((ch) => supMap[ch] || ch).join('');
    return Array.from(counts.entries())
      .map(([p, c]) => (c > 1 ? `${p}${toSup(c)}` : String(p)))
      .join(' × ');
  }

  function getMathTheme() {
    const vp = document.querySelector('.ll-viewport') || document.documentElement;
    const cs = getComputedStyle(vp);
    return {
      ink: cs.getPropertyValue('--math-ink').trim() || '#102a43',
      muted: cs.getPropertyValue('--math-muted').trim() || '#4b6178',
      blue: cs.getPropertyValue('--math-blue').trim() || '#205c8f',
      gold: cs.getPropertyValue('--math-gold-bright').trim() || '#d49a25',
      red: cs.getPropertyValue('--math-red').trim() || '#b9382d',
      sheet: cs.getPropertyValue('--math-sheet').trim() || '#fcfdfb',
      rule: cs.getPropertyValue('--math-rule').trim() || 'rgba(16,42,67,0.2)'
    };
  }

  function integerNumberWord(n) {
    if (n < 0) return `negative ${integerNumberWord(-n)}`;
    const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const one = n % 10;
      return one ? `${tens[ten]}-${ones[one]}` : tens[ten];
    }
    if (n < 1000) {
      const hundred = Math.floor(n / 100);
      const rem = n % 100;
      return rem ? `${ones[hundred]} hundred ${integerNumberWord(rem)}` : `${ones[hundred]} hundred`;
    }
    return String(n);
  }

  /* ── Exhibit Shelf Controller ── */
  const exhibitDetails = Array.from(document.querySelectorAll('details.num-card'));
  let resizeCallbacks = [];

  function updateExhibitCount() {
    const badge = document.getElementById('num-exhibit-count');
    if (!badge) return;
    const openCount = exhibitDetails.filter((d) => d.open).length;
    badge.textContent = `${openCount} of ${exhibitDetails.length} exhibits open`;
  }

  function refreshCanvases() {
    requestAnimationFrame(() => {
      resizeCallbacks.forEach((fn) => {
        try { fn(); } catch (e) { /* ignore */ }
      });
    });
  }

  function openExhibitForTarget(targetOrId, shouldScroll = true) {
    const el = typeof targetOrId === 'string'
      ? document.getElementById(targetOrId.replace(/^#/, ''))
      : targetOrId;
    if (!el) return null;

    let node = el;
    while (node && node !== document.body) {
      if (node.tagName === 'DETAILS' && !node.open) {
        node.open = true;
      }
      node = node.parentElement;
    }
    updateExhibitCount();
    refreshCanvases();

    if (shouldScroll) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    return el;
  }

  exhibitDetails.forEach((det) => {
    det.addEventListener('toggle', () => {
      updateExhibitCount();
      if (det.open) refreshCanvases();
    });
  });

  document.getElementById('num-expand-all')?.addEventListener('click', () => {
    exhibitDetails.forEach((d) => { d.open = true; });
    updateExhibitCount();
    refreshCanvases();
  });

  document.getElementById('num-collapse-all')?.addEventListener('click', () => {
    exhibitDetails.forEach((d) => { d.open = false; });
    updateExhibitCount();
  });

  document.querySelectorAll('.ll-lesson-steps a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      openExhibitForTarget(target, true);
      history.replaceState(null, '', `#${id}`);
    });
  });

  document.querySelectorAll('[data-jump-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.jumpTarget;
      openExhibitForTarget(id, true);
    });
  });

  window.addEventListener('hashchange', () => {
    if (location.hash) openExhibitForTarget(location.hash, false);
  });

  updateExhibitCount();

  /* ── 1. Five-Civilisations Numeral Translator ── */
  const translatorState = { value: 71 };

  function toRoman(n) {
    if (n <= 0) return 'No symbol';
    const pairs = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let rem = n;
    let out = '';
    for (const [val, sym] of pairs) {
      while (rem >= val) {
        out += sym;
        rem -= val;
      }
    }
    return out;
  }

  function renderTallySVG(n) {
    if (n === 0) {
      return '<div class="num-trans-value num-data">Empty bone</div>';
    }
    const groupsOfFive = Math.floor(n / 5);
    const remainder = n % 5;
    if (n > 60) {
      return `
        <div class="num-trans-value num-data">${groupsOfFive} × (||||/) + ${remainder}</div>
      `;
    }
    const totalGates = groupsOfFive + (remainder > 0 ? 1 : 0);
    const perRow = 6;
    const rows = Math.ceil(totalGates / perRow);
    const width = Math.min(totalGates, perRow) * 44 + 8;
    const height = rows * 32 + 4;
    let shapes = '';
    for (let g = 0; g < totalGates; g += 1) {
      const col = g % perRow;
      const row = Math.floor(g / perRow);
      const x0 = 6 + col * 44;
      const y0 = 6 + row * 32;
      const count = g < groupsOfFive ? 5 : remainder;
      const bars = Math.min(count, 4);
      for (let b = 0; b < bars; b += 1) {
        const x = x0 + b * 7;
        shapes += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y0 + 20}" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>`;
      }
      if (count === 5) {
        shapes += `<line x1="${x0 - 3}" y1="${y0 + 17}" x2="${x0 + 24}" y2="${y0 + 3}" stroke="#d49a25" stroke-width="2.6" stroke-linecap="round"/>`;
      }
    }
    return `<svg class="num-tally-svg" viewBox="0 0 ${Math.max(width, 60)} ${Math.max(height, 36)}" role="img" aria-label="${n} tally marks">${shapes}</svg>`;
  }

  function renderBabylonSVG(n) {
    const digits = [];
    const c3600 = Math.floor(n / 3600);
    const c60 = Math.floor((n % 3600) / 60);
    const c1 = n % 60;
    if (c3600 > 0) digits.push({ place: '3600s', val: c3600 });
    if (c3600 > 0 || c60 > 0) digits.push({ place: '60s', val: c60 });
    digits.push({ place: '1s', val: c1 });

    const cols = digits.length;
    const colW = 110;
    const width = cols * colW;
    const height = 82;

    let body = `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="8" fill="#d4aa72" stroke="#8b6030" stroke-width="1.5"/>`;
    digits.forEach((d, idx) => {
      const xStart = idx * colW;
      if (idx > 0) {
        body += `<line x1="${xStart}" y1="6" x2="${xStart}" y2="${height - 6}" stroke="#8b6030" stroke-width="1" opacity="0.45"/>`;
      }
      body += `<text x="${xStart + colW / 2}" y="16" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.5" font-weight="700" fill="#5a3800">${d.place}: ${d.val}</text>`;
      if (d.val === 0) {
        body += `<text x="${xStart + colW / 2}" y="52" text-anchor="middle" font-family="Georgia, serif" font-size="11" font-style="italic" fill="#6d4718">[blank]</text>`;
        return;
      }
      const tens = Math.floor(d.val / 10);
      const ones = d.val % 10;
      const tensStart = xStart + 12;
      for (let t = 0; t < tens; t += 1) {
        const tx = tensStart + (t % 3) * 14;
        const ty = 28 + Math.floor(t / 3) * 20;
        body += `<polygon points="${tx},${ty} ${tx + 12},${ty + 7} ${tx},${ty + 14}" fill="#3b2000"/>`;
      }
      const onesStart = xStart + (tens > 0 ? 58 : 24);
      for (let o = 0; o < ones; o += 1) {
        const ox = onesStart + (o % 3) * 14;
        const oy = 27 + Math.floor(o / 3) * 16;
        body += `<polygon points="${ox},${oy} ${ox + 8},${oy} ${ox + 4},${oy + 12}" fill="#3b2000"/>`;
      }
    });

    return `<svg class="num-cuneiform-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Babylonian base-60 cuneiform for ${n}">${body}</svg>`;
  }

  function renderTranslator() {
    const n = Math.max(0, Math.min(3600, Math.round(translatorState.value)));
    translatorState.value = n;

    const inputEl = document.getElementById('num-trans-input');
    const rangeEl = document.getElementById('num-trans-range');
    if (inputEl && document.activeElement !== inputEl) inputEl.value = String(n);
    if (rangeEl) rangeEl.value = String(n);

    document.querySelectorAll('[data-trans-preset]').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.transPreset) === n);
    });

    // 1. Tally
    const tallyEl = document.getElementById('num-trans-tally');
    const tallyNote = document.getElementById('num-trans-tally-note');
    if (tallyEl) tallyEl.innerHTML = renderTallySVG(n);
    if (tallyNote) {
      tallyNote.textContent = n === 0
        ? 'No notch means nothing carved.'
        : n > 60
          ? `${n} individual marks — tallies break down fast past ~30.`
          : `${n} notch${n === 1 ? '' : 'es'} grouped in 5s.`;
    }

    // 2. Babylonian
    const babEl = document.getElementById('num-trans-babylon');
    const babNote = document.getElementById('num-trans-babylon-note');
    if (babEl) babEl.innerHTML = renderBabylonSVG(n);
    if (babNote) {
      const c3600 = Math.floor(n / 3600);
      const c60 = Math.floor((n % 3600) / 60);
      const c1 = n % 60;
      if (n === 0) {
        babNote.textContent = 'Early Babylonians left a blank space instead of a zero symbol.';
      } else {
        const parts = [];
        if (c3600) parts.push(`${c3600}×3600`);
        if (c3600 || c60) parts.push(`${c60}×60`);
        parts.push(`${c1}×1`);
        babNote.textContent = `${parts.join(' + ')} = ${n}`;
      }
    }

    // 3. Roman
    const romEl = document.getElementById('num-trans-roman');
    const romNote = document.getElementById('num-trans-roman-note');
    if (romEl) romEl.textContent = toRoman(n);
    if (romNote) {
      romNote.textContent = n === 0
        ? 'Romans had no numeral for zero ("nulla").'
        : 'Additive & subtractive symbols (no place-value zero).';
    }

    // 4. Hindu-Arabic Base-10
    const b10El = document.getElementById('num-trans-base10');
    const b10Note = document.getElementById('num-trans-base10-note');
    if (b10El) {
      const str = String(n);
      const len = str.length;
      const placeNames = ['1s', '10s', '100s', '1000s'];
      b10El.innerHTML = str.split('').map((digit, i) => {
        const pos = len - 1 - i;
        const isZero = digit === '0';
        return `<span class="num-place-chip ${isZero ? 'is-zero' : ''}"><strong class="num-data">${digit}</strong><small>${placeNames[pos] || ''}</small></span>`;
      }).join('');
    }
    if (b10Note) {
      const hasZero = String(n).includes('0');
      b10Note.textContent = hasZero
        ? 'Gold chip marks 0 holding an empty place — unambiguous!'
        : '10 digits (0–9) where position multiplies by powers of 10.';
    }

    // 5. Binary 12-bit
    const bitsEl = document.getElementById('num-trans-bits');
    const binValEl = document.getElementById('num-trans-binary');
    const binNoteEl = document.getElementById('num-trans-binary-note');
    if (bitsEl) {
      const weights = [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1];
      bitsEl.innerHTML = weights.map((w) => {
        const on = (n & w) !== 0;
        return `<button type="button" class="num-bit-btn ${on ? 'is-on' : ''}" data-bit-weight="${w}" aria-pressed="${on}" aria-label="Bit ${w}, currently ${on ? 1 : 0}"><span class="bit-val">${on ? 1 : 0}</span><span class="bit-wt">${w}</span></button>`;
      }).join('');
      bitsEl.querySelectorAll('.num-bit-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const w = Number(btn.dataset.bitWeight);
          const next = n ^ w;
          if (next <= 3600) {
            translatorState.value = next;
            renderTranslator();
          } else {
            translatorState.value = 3600;
            renderTranslator();
          }
        });
      });
    }
    if (binValEl) binValEl.textContent = `${n.toString(2)}₂`;
    if (binNoteEl) {
      const weights = [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1];
      const activeWeights = weights.filter((w) => (n & w) !== 0);
      binNoteEl.textContent = activeWeights.length
        ? `${activeWeights.join(' + ')} = ${n} (capped at 3600 for this explorer).`
        : 'All 12 switches off = 0.';
    }
  }

  document.getElementById('num-trans-input')?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    if (!Number.isNaN(val)) {
      translatorState.value = val;
      renderTranslator();
    }
  });
  document.getElementById('num-trans-range')?.addEventListener('input', (e) => {
    translatorState.value = parseInt(e.target.value, 10) || 0;
    renderTranslator();
  });
  document.querySelectorAll('[data-trans-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      translatorState.value = Number(btn.dataset.transPreset);
      renderTranslator();
    });
  });
  renderTranslator();

  /* ── 2. Nested Number Family Classifier ── */
  const familySamples = {
    '7': {
      rings: ['N', 'W', 'Z', 'Q', 'R'],
      text: '<strong>7</strong> is a positive counting number, so it sits inside every nested ring from ℕ all the way out to ℝ.'
    },
    '0': {
      rings: ['W', 'Z', 'Q', 'R'],
      text: '<strong>0</strong> joins at Whole numbers (𝕎), and also belongs to ℤ, ℚ (0/1), and ℝ — though traditional counting numbers ℕ start at 1.'
    },
    '-4': {
      rings: ['Z', 'Q', 'R'],
      text: '<strong>−4</strong> is negative, so it lives in Integers (ℤ) and Rationals (ℚ = −4/1) and Reals (ℝ), outside ℕ and 𝕎.'
    },
    '3/4': {
      rings: ['Q', 'R'],
      text: '<strong>3/4</strong> is a ratio of integers (0.75). It is Rational (ℚ) and Real (ℝ), not a whole integer.'
    },
    '0.333...': {
      rings: ['Q', 'R'],
      text: '<strong>0.333…</strong> repeats forever, which means it equals 1/3 — still Rational (ℚ) and Real (ℝ)!'
    },
    'sqrt2': {
      rings: ['I', 'R'],
      text: '<strong>√2</strong> (≈ 1.41421…) cannot be written as any integer fraction (see Proof P2). It lives in the Irrational wing of ℝ.'
    },
    'pi': {
      rings: ['I', 'R'],
      text: '<strong>π</strong> (≈ 3.14159…) never terminates and never repeats, so it is Irrational (ℝ \\ ℚ) yet sits on the Real number line (ℝ).'
    }
  };

  function selectFamilySample(key) {
    const data = familySamples[key];
    if (!data) return;
    document.querySelectorAll('[data-family-sample]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.familySample === key);
    });
    document.querySelectorAll('[data-family-ring]').forEach((ring) => {
      ring.classList.toggle('is-member', data.rings.includes(ring.dataset.familyRing));
    });
    const exp = document.getElementById('num-family-explain');
    if (exp) exp.innerHTML = data.text;
  }

  document.querySelectorAll('[data-family-sample]').forEach((btn) => {
    btn.addEventListener('click', () => selectFamilySample(btn.dataset.familySample));
  });
  selectFamilySample('7');

  /* ── 3. Four Number System Labs ── */
  const integerModes = {
    numberPath: 'Number Path',
    objects: 'Object Groups',
    hops: 'Hop Line'
  };
  const countSteps = [1, 2, 3, 4, 5, 10, 20, 25];
  const advancedCountSteps = [6, 7, 8, 9];
  const integerPrompts = {
    1: 'Count by 1s. Every number goes up by one, one step at a time.',
    2: 'Count by 2s. Which numbers do you land on? Notice how parity stays locked.',
    3: 'Count by 3s. Can you hear the steady rhythm: 3, 6, 9, 12?',
    4: 'Count by 4s. Notice how every jump skips two even numbers.',
    5: 'Try counting by 5s. What pattern do you notice in the ones place?',
    6: 'Count by 6s. Can you spot doubles and threes working together?',
    7: 'Count by 7s. This one is trickier. Listen for the rhythm.',
    8: 'Count by 8s. Which values feel close to counting by 4s twice?',
    9: 'Count by 9s. Watch the tens digit rise by 1 as the ones digit drops by 1.',
    10: 'Count by 10s. The tens digit grows while the ones digit stays untouched.',
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

  function generateSequence(step = 1, start = 0, length = 11) {
    return Array.from({ length }, (_, i) => start + i * step);
  }

  function integerStepLevel(step) {
    if ([1, 2, 5, 10].includes(step)) return 'Level 1';
    if ([3, 4, 20, 25].includes(step)) return 'Level 2';
    return 'Level 3';
  }

  function integerObjectGroupMarkup(size, isNeg = false) {
    return Array.from({ length: size }, () => `<span class="num-object-dot ${isNeg ? 'is-neg' : ''}"></span>`).join('');
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

  function renderObjectGroups(sequence, visibleCount, step, start) {
    return `
      <div class="num-object-grid">
        ${sequence.slice(0, visibleCount).map((value, index) => {
          const startChip = start === 0
            ? `<div class="num-object-group is-start">Start: 0</div>`
            : `<div class="num-object-group is-start">Start: ${start} ${start < 0 ? '(debt)' : ''}</div>`;
          if (index === 0) {
            const absStart = Math.abs(start);
            const dots = absStart > 0 && absStart <= 25
              ? `<div class="num-object-group">${integerObjectGroupMarkup(absStart, start < 0)}</div>`
              : '';
            return `
              <div class="num-object-row">
                <div class="num-object-groups">${startChip}${dots}</div>
                <div class="num-object-label num-data">${value}</div>
              </div>
            `;
          }
          const groups = Array.from({ length: index }, () => `<div class="num-object-group">${integerObjectGroupMarkup(step, false)}</div>`).join('');
          return `
            <div class="num-object-row">
              <div class="num-object-groups">${start !== 0 ? startChip : ''}${groups}</div>
              <div class="num-object-label num-data">${value}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderHopLine(sequence, visibleCount, step) {
    const width = 720;
    const height = 225;
    const left = 48;
    const right = width - 48;
    const y = 116;
    const denom = Math.max(sequence.length - 1, 1);
    const xFor = (index) => left + ((right - left) * index) / denom;
    const active = sequence.slice(0, visibleCount);
    const segments = active.slice(1).map((value, index) => {
      const x1 = xFor(index);
      const x2 = xFor(index + 1);
      const mid = (x1 + x2) / 2;
      return `
        <path class="num-hop-segment" d="M ${x1} ${y} Q ${mid} ${y - 42} ${x2} ${y}" />
        <text class="num-hop-arc-label" x="${mid}" y="${y - 28}">+${step}</text>
      `;
    }).join('');
    let zeroLine = '';
    const minV = sequence[0];
    const maxV = sequence[sequence.length - 1];
    if (minV < 0 && maxV > 0) {
      const zeroRatio = (0 - minV) / (maxV - minV);
      const zx = left + (right - left) * zeroRatio;
      zeroLine = `
        <line class="num-hop-zero" x1="${zx}" y1="${y - 54}" x2="${zx}" y2="${y + 62}"></line>
        <text class="num-hop-word" x="${zx}" y="${y - 58}">0</text>
      `;
    }
    const points = sequence.map((value, index) => {
      const x = xFor(index);
      const activePoint = index < visibleCount;
      return `
        <circle class="num-hop-point ${activePoint ? 'active' : ''}" cx="${x}" cy="${y}" r="9"></circle>
        <text class="num-hop-label" x="${x}" y="${y + 34}">${value}</text>
        <text class="num-hop-word" x="${x}" y="${y + 52}">${integerNumberWord(value)}</text>
      `;
    }).join('');
    return `
      <div class="num-hop-wrap">
        <svg class="num-hop-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Hop number line">
          <line class="num-hop-line" x1="${left}" y1="${y}" x2="${right}" y2="${y}"></line>
          ${zeroLine}
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

    const seqPill = document.getElementById('num-count-seq');
    if (seqPill) {
      seqPill.textContent = `${sequence.slice(0, 6).join(', ')}…`;
    }

    document.querySelectorAll('[data-num-mode]').forEach((btn) => btn.classList.toggle('active', btn.dataset.numMode === integerLabState.mode));
    document.querySelectorAll('[data-num-step]').forEach((btn) => btn.classList.toggle('active', Number(btn.dataset.numStep) === integerLabState.step));
    document.getElementById('num-count-jumps-value').textContent = String(integerLabState.jumps);
    document.getElementById('num-count-jumps').value = String(integerLabState.jumps);
    document.getElementById('num-count-start').value = String(integerLabState.start);

    const visual = document.getElementById('num-count-visual');
    if (integerLabState.mode === 'numberPath') {
      visual.innerHTML = renderNumberPath(sequence, integerLabState.visibleCount);
    } else if (integerLabState.mode === 'objects') {
      visual.innerHTML = renderObjectGroups(sequence, integerLabState.visibleCount, integerLabState.step, integerLabState.start);
    } else {
      visual.innerHTML = renderHopLine(sequence, integerLabState.visibleCount, integerLabState.step);
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
    }, 600);
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
      button.addEventListener('click', () => updateIntegerLab({ step }));
      stepRow.appendChild(button);
    });
    document.getElementById('num-count-start').addEventListener('input', (event) => {
      const parsed = parseInt(event.target.value, 10);
      if (Number.isNaN(parsed)) return;
      const next = Math.max(-20, Math.min(50, parsed));
      updateIntegerLab({ start: next });
    });
    document.getElementById('num-count-jumps').addEventListener('input', (event) => {
      updateIntegerLab({ jumps: parseInt(event.target.value, 10) || 10 });
    });
    document.getElementById('num-count-play').addEventListener('click', toggleIntegerAnimation);
    renderIntegerLab();
  }

  /* ── Fractions Lab ── */
  const fractionModes = { shape: 'Shape Split', bar: 'Fraction Bar', line: 'Number Line' };
  const fractionShapes = { circle: 'Circle', rectangle: 'Rectangle', bar: 'Bar' };
  const fractionLabState = {
    mode: 'shape',
    shape: 'circle',
    numerator: 3,
    denominator: 4,
    displayNumerator: 3,
    displayDenominator: 4,
    fillCount: 3,
    fillTimer: null,
    allowImproper: false,
    eqMultiplier: 1
  };

  function fractionLevel(denominator, numerator) {
    if ([2, 3, 4].includes(denominator) && numerator <= 1) return 'Level 1';
    if (denominator <= 5 && numerator <= denominator) return 'Level 2';
    return 'Level 3';
  }

  function denomOrdinalWord(d, plural) {
    const map = {
      2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['fourth', 'fourths'],
      5: ['fifth', 'fifths'], 6: ['sixth', 'sixths'], 7: ['seventh', 'sevenths'],
      8: ['eighth', 'eighths'], 9: ['ninth', 'ninths'], 10: ['tenth', 'tenths'],
      12: ['twelfth', 'twelfths'], 15: ['fifteenth', 'fifteenths'],
      16: ['sixteenth', 'sixteenths'], 18: ['eighteenth', 'eighteenths'],
      20: ['twentieth', 'twentieths'], 21: ['twenty-first', 'twenty-firsts'],
      24: ['twenty-fourth', 'twenty-fourths'], 25: ['twenty-fifth', 'twenty-fifths'],
      27: ['twenty-seventh', 'twenty-sevenths'], 28: ['twenty-eighth', 'twenty-eighths'],
      30: ['thirtieth', 'thirtieths']
    };
    if (map[d]) return map[d][plural ? 1 : 0];
    return `${d}th${plural ? 's' : ''}`;
  }

  function fractionName(numerator, denominator) {
    if (numerator === 0) return `zero ${denomOrdinalWord(denominator, true)}`;
    if (numerator === denominator) return 'one whole';
    if (numerator > denominator) {
      const wholes = Math.floor(numerator / denominator);
      const rem = numerator % denominator;
      return rem ? `${wholes} and ${fractionName(rem, denominator)}` : `${wholes} wholes`;
    }
    if (numerator === 1) return `one ${denomOrdinalWord(denominator, false)}`;
    return `${integerNumberWord(numerator)} ${denomOrdinalWord(denominator, true)}`;
  }

  function describeFractionPrompt(numerator, denominator) {
    if (numerator === 0) return 'The whole is split, but no parts are filled yet.';
    if (numerator === denominator) return 'All equal parts are filled, so this fraction equals 1 whole.';
    if (numerator > denominator) {
      const wholes = Math.floor(numerator / denominator);
      const rem = numerator % denominator;
      return `Improper fraction! ${numerator}/${denominator} fills ${wholes} whole${wholes > 1 ? 's' : ''}${rem ? ` plus ${rem}/${denominator}` : ''}.`;
    }
    return 'Click any slice or bar segment to adjust the numerator directly.';
  }

  function stopFractionFill() {
    if (fractionLabState.fillTimer) {
      clearInterval(fractionLabState.fillTimer);
      fractionLabState.fillTimer = null;
    }
    const playBtn = document.getElementById('num-fraction-fill');
    if (playBtn) playBtn.textContent = 'Play Fill';
  }

  function renderFractionCircle(denominator, fillCount, wholeOffset) {
    const cx = 100;
    const cy = 100;
    const r = 82;
    const slices = Array.from({ length: denominator }, (_, index) => {
      const globalIdx = wholeOffset * denominator + index;
      const start = (index / denominator) * Math.PI * 2 - Math.PI / 2;
      const end = ((index + 1) / denominator) * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const large = end - start > Math.PI ? 1 : 0;
      return `<path class="num-fraction-shape-slice ${globalIdx < fillCount ? 'filled' : ''}" data-frac-pick="${globalIdx + 1}" d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z"></path>`;
    }).join('');
    return `<svg class="num-fraction-svg" viewBox="0 0 200 200" role="img" aria-label="Fraction circle">${slices}</svg>`;
  }

  function renderFractionRectangle(denominator, fillCount, isBar, wholeOffset) {
    const width = 320;
    const height = isBar ? 86 : 160;
    const segWidth = width / denominator;
    const segments = Array.from({ length: denominator }, (_, index) => {
      const globalIdx = wholeOffset * denominator + index;
      return `<rect class="num-fraction-rect-segment ${globalIdx < fillCount ? 'filled' : ''}" data-frac-pick="${globalIdx + 1}" x="${index * segWidth}" y="0" width="${segWidth}" height="${height}"></rect>`;
    }).join('');
    return `<svg class="num-fraction-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Fraction rectangle">${segments}</svg>`;
  }

  function renderFractionShape() {
    const { displayNumerator, displayDenominator, fillCount, shape } = fractionLabState;
    const wholesNeeded = Math.max(1, Math.ceil(Math.max(displayNumerator, fillCount) / displayDenominator));
    const svgs = Array.from({ length: wholesNeeded }, (_, w) => {
      if (shape === 'rectangle') return renderFractionRectangle(displayDenominator, fillCount, false, w);
      if (shape === 'bar') return renderFractionRectangle(displayDenominator, fillCount, true, w);
      return renderFractionCircle(displayDenominator, fillCount, w);
    }).join('');
    return `
      <div class="num-fraction-shape-wrap">
        <div class="num-fraction-wholes-row ${wholesNeeded > 1 ? 'is-multi' : ''}">${svgs}</div>
        <div class="num-fraction-whole-label">Denominator = ${displayDenominator} equal parts per whole · Numerator = ${fillCount} filled.</div>
      </div>
    `;
  }

  function renderFractionBar(displayNumerator, displayDenominator, fillCount) {
    const wholesNeeded = Math.max(1, Math.ceil(Math.max(displayNumerator, fillCount) / displayDenominator));
    const bars = Array.from({ length: wholesNeeded }, (_, w) => {
      const segments = Array.from({ length: displayDenominator }, (__, index) => {
        const globalIdx = w * displayDenominator + index;
        return `<button type="button" class="num-fraction-bar-segment ${globalIdx < fillCount ? 'filled' : ''}" data-frac-pick="${globalIdx + 1}" aria-label="Set numerator to ${globalIdx + 1}"></button>`;
      }).join('');
      return `<div class="num-fraction-bar" style="grid-template-columns: repeat(${displayDenominator}, 1fr);">${segments}</div>`;
    }).join('');
    return `
      <div class="num-fraction-bar-wrap">
        ${bars}
        <div class="num-fraction-whole-label">Each full bar is 1 whole. ${fillCount} of ${displayDenominator}-sized parts are shaded.</div>
      </div>
    `;
  }

  function renderFractionLine(numerator, denominator) {
    const width = 600;
    const left = 54;
    const right = width - 54;
    const y = 88;
    const maxWholes = numerator > denominator ? 2 : 1;
    const totalTicks = maxWholes * denominator;
    const xFor = (step) => left + ((right - left) * step) / totalTicks;
    const ticks = Array.from({ length: totalTicks + 1 }, (_, index) => {
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
          <text class="num-fraction-line-caption" x="${targetX}" y="${y - 28}">${numerator}/${denominator}${numerator > denominator ? ` = ${(numerator / denominator).toFixed(2)}` : ''}</text>
        </svg>
      </div>
    `;
  }

  function renderFractionLab() {
    const { numerator, denominator, displayNumerator, displayDenominator, fillCount, mode, allowImproper, eqMultiplier } = fractionLabState;
    const value = displayDenominator ? displayNumerator / displayDenominator : 0;
    const maxNum = allowImproper ? denominator * 2 : denominator;
    document.getElementById('num-fraction-symbol').textContent = `${displayNumerator}/${displayDenominator}`;
    document.getElementById('num-fraction-name').textContent = fractionName(displayNumerator, displayDenominator);
    document.getElementById('num-fraction-level-pill').textContent = fractionLevel(denominator, numerator);
    document.getElementById('num-fraction-whole-pill').textContent = `${fillCount} of ${displayDenominator} parts`;
    document.getElementById('num-fraction-value-pill').textContent = `Value ${value.toFixed(2)}`;
    document.getElementById('num-fraction-prompt').textContent = describeFractionPrompt(displayNumerator, displayDenominator);
    document.getElementById('num-fraction-denominator-value').textContent = String(denominator);
    document.getElementById('num-fraction-numerator-value').textContent = String(numerator);
    document.getElementById('num-fraction-denominator').value = String(denominator);
    document.getElementById('num-fraction-numerator').max = String(maxNum);
    document.getElementById('num-fraction-numerator').value = String(numerator);

    const eqBtn = document.getElementById('num-fraction-equivalent');
    if (eqBtn) {
      const nextMult = eqMultiplier >= 4 ? 2 : eqMultiplier + 1;
      eqBtn.textContent = `Equivalent ×${nextMult}`;
    }

    document.querySelectorAll('[data-fraction-mode]').forEach((btn) => btn.classList.toggle('active', btn.dataset.fractionMode === mode));
    document.querySelectorAll('[data-fraction-shape]').forEach((btn) => btn.classList.toggle('active', btn.dataset.fractionShape === fractionLabState.shape));
    const shapeRow = document.getElementById('num-fraction-shape-row');
    if (shapeRow) shapeRow.style.display = mode === 'shape' ? '' : 'none';
    const fillBtn = document.getElementById('num-fraction-fill');
    if (fillBtn) fillBtn.closest('.num-mini-control').style.display = mode === 'line' ? 'none' : '';

    const visual = document.getElementById('num-fraction-visual');
    if (mode === 'shape') {
      visual.innerHTML = renderFractionShape();
    } else if (mode === 'bar') {
      visual.innerHTML = renderFractionBar(displayNumerator, displayDenominator, fillCount);
    } else {
      visual.innerHTML = renderFractionLine(displayNumerator, displayDenominator);
    }

    visual.querySelectorAll('[data-frac-pick]').forEach((el) => {
      el.addEventListener('click', () => {
        const picked = parseInt(el.dataset.fracPick, 10);
        const mapped = Math.max(0, Math.min(maxNum, Math.ceil(picked / eqMultiplier)));
        updateFractionLab({ numerator: mapped });
      });
    });
  }

  function updateFractionLab(partial = {}) {
    Object.assign(fractionLabState, partial);
    stopFractionFill();
    const maxNum = fractionLabState.allowImproper ? fractionLabState.denominator * 2 : fractionLabState.denominator;
    if (fractionLabState.numerator > maxNum) {
      fractionLabState.numerator = maxNum;
    }
    if (partial.numerator !== undefined || partial.denominator !== undefined || partial.allowImproper !== undefined) {
      fractionLabState.eqMultiplier = 1;
      fractionLabState.displayNumerator = fractionLabState.numerator;
      fractionLabState.displayDenominator = fractionLabState.denominator;
      const note = document.getElementById('num-fraction-eq-note');
      if (note) note.textContent = 'Same amount, same whole, just a different cut.';
    }
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
    }, 360);
  }

  function showEquivalentFraction() {
    stopFractionFill();
    let nextMult = fractionLabState.eqMultiplier >= 4 ? 2 : fractionLabState.eqMultiplier + 1;
    while (nextMult > 1 && fractionLabState.denominator * nextMult > 30) {
      nextMult -= 1;
    }
    if (nextMult < 2) nextMult = 2;
    fractionLabState.eqMultiplier = nextMult;
    fractionLabState.displayNumerator = fractionLabState.numerator * nextMult;
    fractionLabState.displayDenominator = fractionLabState.denominator * nextMult;
    fractionLabState.fillCount = fractionLabState.displayNumerator;
    document.getElementById('num-fraction-eq-note').textContent =
      `${fractionLabState.numerator}/${fractionLabState.denominator} × ${nextMult}/${nextMult} = ${fractionLabState.displayNumerator}/${fractionLabState.displayDenominator} — same amount, finer cuts.`;
    renderFractionLab();
  }

  function resetEquivalentFraction() {
    stopFractionFill();
    fractionLabState.eqMultiplier = 1;
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
      const maxNum = fractionLabState.allowImproper ? denominator * 2 : denominator;
      const nextNumerator = Math.min(fractionLabState.numerator, maxNum);
      updateFractionLab({ denominator, numerator: nextNumerator });
    });
    document.getElementById('num-fraction-numerator').addEventListener('input', (event) => {
      updateFractionLab({ numerator: parseInt(event.target.value, 10) || 0 });
    });
    document.getElementById('num-fraction-improper')?.addEventListener('change', (event) => {
      updateFractionLab({ allowImproper: event.target.checked });
    });
    document.getElementById('num-fraction-fill').addEventListener('click', playFractionFill);
    document.getElementById('num-fraction-equivalent').addEventListener('click', showEquivalentFraction);
    document.getElementById('num-fraction-reset-equivalent').addEventListener('click', resetEquivalentFraction);
    renderFractionLab();
  }

  /* ── Decimals Lab ── */
  const decimalModes = { grid: 'Blocks', line: 'Number Line', bridge: 'Fraction Bridge' };
  const decimalSnapModes = {
    hundredths: { label: 'Hundredths', step: 0.01 },
    tenths: { label: 'Tenths', step: 0.1 }
  };
  const decimalLabState = { mode: 'grid', snap: 'hundredths', value: 0.25 };

  function getDecimalData(value) {
    const hundredths = Math.round(value * 100);
    const ones = Math.floor(hundredths / 100);
    const rem = hundredths % 100;
    const tenths = Math.floor(rem / 10);
    const remHundredths = rem % 10;
    const g = gcd(hundredths, 100);
    return {
      value: hundredths / 100,
      ones,
      hundredths,
      tenths,
      remHundredths,
      simpN: hundredths / g,
      simpD: 100 / g
    };
  }

  function decimalWordLabel(data) {
    if (data.hundredths === 0) return 'zero hundredths';
    if (data.hundredths === 100) return 'one whole';
    if (data.hundredths % 10 === 0) {
      return `${integerNumberWord(data.tenths)} tenth${data.tenths === 1 ? '' : 's'}`;
    }
    return `${integerNumberWord(data.hundredths)} hundredth${data.hundredths === 1 ? '' : 's'}`;
  }

  function renderDecimalGrid(data) {
    return `
      <div class="num-decimal-grid" role="group" aria-label="10 by 10 hundredths grid">
        ${Array.from({ length: 100 }, (_, index) => {
          const val = ((index + 1) / 100).toFixed(2);
          return `<button type="button" class="num-decimal-cell ${index < data.hundredths ? 'filled' : ''}" data-dec-cell="${index + 1}" aria-label="Set decimal to ${val}"></button>`;
        }).join('')}
      </div>
      <div class="num-decimal-grid-caption">${data.hundredths} of the 100 tiny squares are filled (${data.tenths} full column${data.tenths === 1 ? '' : 's'} of ten + ${data.remHundredths} extra).</div>
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
            <line class="num-decimal-line-tick ${index === data.tenths ? 'major' : ''}" x1="${xFor(index)}" y1="${y - 18}" x2="${xFor(index)}" y2="${y + 18}"></line>
            <text class="num-decimal-line-label" x="${xFor(index)}" y="${y + 40}">${(index / 10).toFixed(1)}</text>
          `).join('')}
          <circle class="num-decimal-line-dot" cx="${targetX}" cy="${y}" r="10"></circle>
          <text class="num-decimal-line-label" x="${targetX}" y="${y - 28}">${data.value.toFixed(2)}</text>
        </svg>
      </div>
    `;
  }

  function renderDecimalBridge(data) {
    const g = gcd(data.hundredths, 100);
    const simplifiedNote = data.hundredths > 0 && data.simpD < 100
      ? `<span>=</span><strong>${data.simpN}/${data.simpD}</strong>`
      : '';
    return `
      <div class="num-decimal-bridge">
        <div class="num-decimal-bridge-eq num-data">
          <span>${data.value.toFixed(2)}</span>
          <span>=</span>
          <span>${data.hundredths}/100</span>
          ${simplifiedNote}
          <span>=</span>
          <span>${data.hundredths}%</span>
        </div>
        <div class="num-decimal-bridge-note">${g > 1 && data.hundredths > 0 && data.simpD < 100 ? `Divide numerator and denominator by ${g} to reach ${data.simpN}/${data.simpD}.` : 'The decimal, fraction, and percent all name the exact same quantity.'}</div>
      </div>
    `;
  }

  function renderDecimalLab() {
    const data = getDecimalData(decimalLabState.value);
    document.getElementById('num-decimal-symbol').textContent = data.value.toFixed(2);
    document.getElementById('num-decimal-name').textContent = decimalWordLabel(data);
    document.getElementById('num-decimal-hundredths-pill').textContent = `${data.hundredths} hundredths`;
    document.getElementById('num-decimal-tenths-pill').textContent = `${data.tenths} tenths + ${data.remHundredths} hundredths`;
    document.getElementById('num-decimal-fraction-pill').textContent = data.simpD < 100 && data.hundredths > 0
      ? `${data.hundredths}/100 = ${data.simpN}/${data.simpD}`
      : `${data.hundredths}/100`;
    document.getElementById('num-decimal-value-label').textContent = data.value.toFixed(2);
    document.getElementById('num-decimal-prompt').textContent = data.hundredths % 10 === 0
      ? 'Notice the hundredths digit is 0 — this lands cleanly on a tenths column.'
      : `Built from ${data.tenths} tenth${data.tenths === 1 ? '' : 's'} and ${data.remHundredths} extra hundredth${data.remHundredths === 1 ? '' : 's'}.`;

    const placeBar = document.getElementById('num-decimal-place-bar');
    if (placeBar) {
      placeBar.innerHTML = `
        <span class="num-place-chip"><strong>${data.ones}</strong><small>ones</small></span>
        <span class="num-place-chip"><strong>${data.tenths}</strong><small>tenths (0.1)</small></span>
        <span class="num-place-chip"><strong>${data.remHundredths}</strong><small>hundredths (0.01)</small></span>
        <span class="num-place-chip"><strong>${data.hundredths}%</strong><small>percent</small></span>
      `;
    }

    const slider = document.getElementById('num-decimal-value');
    slider.value = String(data.value);
    slider.step = String(decimalSnapModes[decimalLabState.snap].step);
    document.querySelectorAll('[data-decimal-mode]').forEach((btn) => btn.classList.toggle('active', btn.dataset.decimalMode === decimalLabState.mode));
    document.querySelectorAll('[data-decimal-snap]').forEach((btn) => btn.classList.toggle('active', btn.dataset.decimalSnap === decimalLabState.snap));
    document.querySelectorAll('[data-decimal-preset]').forEach((btn) => btn.classList.toggle('active', Math.abs(parseFloat(btn.dataset.decimalPreset) - data.value) < 0.001));

    const visual = document.getElementById('num-decimal-visual');
    if (decimalLabState.mode === 'grid') {
      visual.innerHTML = renderDecimalGrid(data);
      visual.querySelectorAll('[data-dec-cell]').forEach((cell) => {
        cell.addEventListener('click', () => {
          const val = parseInt(cell.dataset.decCell, 10) / 100;
          updateDecimalLab({ value: val, snap: 'hundredths' });
        });
      });
    } else if (decimalLabState.mode === 'line') {
      visual.innerHTML = renderDecimalLine(data);
    } else {
      visual.innerHTML = renderDecimalBridge(data);
    }
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
    document.querySelectorAll('[data-decimal-preset]').forEach((btn) => {
      btn.addEventListener('click', () => updateDecimalLab({ value: parseFloat(btn.dataset.decimalPreset), snap: 'hundredths' }));
    });
    document.getElementById('num-decimal-value').addEventListener('input', (event) => {
      updateDecimalLab({ value: parseFloat(event.target.value) || 0 });
    });
    renderDecimalLab();
  }

  /* ── Ratios Lab ── */
  const ratioModes = { objects: 'Objects', bars: 'Bars', real: 'Real World' };
  const ratioThemes = {
    colors: { label: 'Colors', nounA: 'red blocks', nounB: 'blue blocks', singA: 'red block', singB: 'blue block' },
    fruit: { label: 'Fruit', nounA: 'apples', nounB: 'oranges', singA: 'apple', singB: 'orange' },
    blocks: { label: 'Blocks', nounA: 'red towers', nounB: 'blue towers', singA: 'red tower', singB: 'blue tower' }
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
    scale: 1,
    showSimplified: false
  };

  function getRatioData(a, b) {
    const g = gcd(a, b);
    return { a, b, simplifiedA: a / g, simplifiedB: b / g };
  }

  function ratioLevel(a, b) {
    if (a <= 5 && b <= 5) return 'Level 1';
    if (a <= 12 && b <= 12) return 'Level 2';
    return 'Level 3';
  }

  function renderRatioObjects(a, b, theme) {
    const config = ratioThemes[theme];
    return `
      <div class="num-ratio-objects">
        <div class="num-ratio-group">
          ${Array.from({ length: a }, () => '<span class="num-ratio-dot a"></span>').join('')}
          <span class="num-ratio-group-label">${a} ${a === 1 ? config.singA : config.nounA}</span>
        </div>
        <div class="num-ratio-group">
          ${Array.from({ length: b }, () => '<span class="num-ratio-dot b"></span>').join('')}
          <span class="num-ratio-group-label">${b} ${b === 1 ? config.singB : config.nounB}</span>
        </div>
      </div>
    `;
  }

  function renderRatioBars(a, b, theme) {
    const config = ratioThemes[theme];
    const maxVal = Math.max(a, b, 1);
    const pctA = Math.round((a / maxVal) * 100);
    const pctB = Math.round((b / maxVal) * 100);
    return `
      <div class="num-ratio-bars">
        <div class="num-ratio-bar-row">
          <div class="num-ratio-bar-track"><div class="num-ratio-bar a" style="width:${pctA}%"></div></div>
          <span class="num-ratio-bar-value">${a} ${a === 1 ? config.singA : config.nounA}</span>
        </div>
        <div class="num-ratio-bar-row">
          <div class="num-ratio-bar-track"><div class="num-ratio-bar b" style="width:${pctB}%"></div></div>
          <span class="num-ratio-bar-value">${b} ${b === 1 ? config.singB : config.nounB}</span>
        </div>
      </div>
    `;
  }

  function renderRatioRealWorld() {
    const preset = ratioPresets[ratioLabState.preset];
    const a = preset.a * ratioLabState.scale;
    const b = preset.b * ratioLabState.scale;
    const { labelA, labelB, title, sentence } = preset;
    const maxVal = Math.max(a, b, 1);
    const cardVisual = ratioLabState.preset === 'screen'
      ? `<div class="num-ratio-screen num-data">${a}:${b}</div>`
      : `
        <div class="num-ratio-real-bars">
          <div class="num-ratio-bar-row">
            <div class="num-ratio-bar-track"><div class="num-ratio-bar a" style="width:${Math.round((a / maxVal) * 100)}%"></div></div>
            <span class="num-ratio-bar-value">${a} ${labelA}</span>
          </div>
          <div class="num-ratio-bar-row">
            <div class="num-ratio-bar-track"><div class="num-ratio-bar b" style="width:${Math.round((b / maxVal) * 100)}%"></div></div>
            <span class="num-ratio-bar-value">${b} ${labelB}</span>
          </div>
        </div>
      `;
    return `
      <div class="num-ratio-real">
        <div class="num-ratio-real-card">
          <div class="num-ratio-name">${title} ${ratioLabState.scale > 1 ? `(Scaled ×${ratioLabState.scale})` : ''}</div>
          ${cardVisual}
          <div class="num-ratio-real-caption">${ratioLabState.scale === 1 ? sentence : `Scaled ×${ratioLabState.scale}: ${a} ${labelA} to ${b} ${labelB} — exact same ratio!`}</div>
        </div>
      </div>
    `;
  }

  function updateRatioSentence(a, b, theme) {
    const config = ratioThemes[theme];
    const nA = a === 1 ? config.singA : config.nounA;
    const nB = b === 1 ? config.singB : config.nounB;
    return `For every ${a} ${nA}, there ${b === 1 ? 'is' : 'are'} ${b} ${nB}.`;
  }

  function renderRatioLab() {
    const baseA = ratioLabState.a;
    const baseB = ratioLabState.b;
    const ratio = getRatioData(baseA, baseB);
    const displayA = ratioLabState.showSimplified ? ratio.simplifiedA : baseA * ratioLabState.scale;
    const displayB = ratioLabState.showSimplified ? ratio.simplifiedB : baseB * ratioLabState.scale;
    const config = ratioThemes[ratioLabState.theme];

    document.getElementById('num-ratio-a-value').textContent = String(baseA);
    document.getElementById('num-ratio-b-value').textContent = String(baseB);
    document.getElementById('num-ratio-symbol').textContent = `${displayA} : ${displayB}`;
    document.getElementById('num-ratio-name').textContent = `${integerNumberWord(displayA)} to ${integerNumberWord(displayB)}`;
    document.getElementById('num-ratio-level-pill').textContent = ratioLevel(baseA, baseB);
    document.getElementById('num-ratio-simple-pill').textContent = `Simple form ${ratio.simplifiedA} : ${ratio.simplifiedB}`;
    document.getElementById('num-ratio-theme-pill').textContent = ratioLabState.mode === 'real' ? ratioPresets[ratioLabState.preset].title : config.label;
    document.getElementById('num-ratio-sentence').textContent = ratioLabState.mode === 'real'
      ? (ratioLabState.scale === 1 ? ratioPresets[ratioLabState.preset].sentence : `Scaled ×${ratioLabState.scale}: ${displayA} : ${displayB} keeps the exact same proportion.`)
      : updateRatioSentence(displayA, displayB, ratioLabState.theme);
    document.getElementById('num-ratio-prompt').textContent = ratioLabState.mode === 'bars'
      ? 'Which bar is longer, and how does scaling both bars preserve their ratio?'
      : ratioLabState.mode === 'real'
        ? 'What does “for every” mean in this real-world example?'
        : `How many ${config.nounA} for every ${config.singB}?`;

    const simBtn = document.getElementById('num-ratio-simplify');
    if (simBtn) simBtn.textContent = ratioLabState.showSimplified ? 'Show Current Scale' : 'Show Simplest Form';

    document.getElementById('num-ratio-a').value = String(baseA);
    document.getElementById('num-ratio-b').value = String(baseB);
    document.querySelectorAll('[data-ratio-mode]').forEach((btn) => btn.classList.toggle('active', btn.dataset.ratioMode === ratioLabState.mode));
    document.querySelectorAll('[data-ratio-theme]').forEach((btn) => btn.classList.toggle('active', btn.dataset.ratioTheme === ratioLabState.theme));
    document.querySelectorAll('[data-ratio-preset]').forEach((btn) => btn.classList.toggle('active', btn.dataset.ratioPreset === ratioLabState.preset));
    document.querySelectorAll('[data-ratio-scale]').forEach((btn) => btn.classList.toggle('active', Number(btn.dataset.ratioScale) === ratioLabState.scale));

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
        updateRatioLab({ mode: key, showSimplified: false });
        themeRow.style.display = key === 'real' ? 'none' : '';
        presetRow.style.display = key === 'real' ? '' : 'none';
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
      button.addEventListener('click', () => updateRatioLab({ mode: 'real', preset: key, a: preset.a, b: preset.b, scale: 1, showSimplified: false }));
      presetRow.appendChild(button);
    });
    document.querySelectorAll('[data-ratio-scale]').forEach((btn) => {
      btn.addEventListener('click', () => updateRatioLab({ scale: Number(btn.dataset.ratioScale), showSimplified: false }));
    });
    document.getElementById('num-ratio-a').addEventListener('input', (event) => {
      updateRatioLab({ a: parseInt(event.target.value, 10) || 1, showSimplified: false });
    });
    document.getElementById('num-ratio-b').addEventListener('input', (event) => {
      updateRatioLab({ b: parseInt(event.target.value, 10) || 1, showSimplified: false });
    });
    document.getElementById('num-ratio-simplify').addEventListener('click', () => {
      updateRatioLab({ showSimplified: !ratioLabState.showSimplified });
    });
    renderRatioLab();
  }

  function selectType(el, type) {
    document.querySelectorAll('.num-type-grid[role="tablist"] .num-type-card').forEach((c) => {
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
    d.classList.remove('visible');
    integerLab.classList.toggle('visible', type === 'integer');
    fractionLab.classList.toggle('visible', type === 'fraction');
    decimalLab.classList.toggle('visible', type === 'decimal');
    ratioLab.classList.toggle('visible', type === 'ratio');
    if (type === 'integer') renderIntegerLab();
    else if (type === 'fraction') renderFractionLab();
    else if (type === 'decimal') renderDecimalLab();
    else if (type === 'ratio') renderRatioLab();
  }
  window.selectType = selectType;

  buildIntegerLabControls();
  buildFractionLabControls();
  buildDecimalLabControls();
  buildRatioLabControls();

  (function () {
    const firstCard = document.querySelector('.num-type-card[onclick*="integer"]');
    if (firstCard) selectType(firstCard, 'integer');

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

  /* ── 4. Prime Grid & Sieve of Eratosthenes ── */
  const primeCells = [];
  let sieveRunId = 0;
  const sievePrimes = [2, 3, 5, 7];
  let sieveStepIdx = 0;
  let stepCrossed = new Set();

  function updatePrimeCounter() {
    const badge = document.getElementById('num-prime-count');
    if (!badge) return;
    const remaining = primeCells.filter((cell, idx) => idx > 0 && !cell.classList.contains('is-crossed')).length;
    badge.textContent = `${remaining} uncrossed`;
  }

  function inspectGridNumber(i) {
    primeCells.forEach((c) => c.classList.remove('selected', 'is-factor-hl'));
    const cell = primeCells[i - 1];
    if (!cell) return;
    cell.classList.add('selected');
    const info = document.getElementById('num-prime-info');
    if (i === 1) {
      info.innerHTML = '<strong>1</strong> is special — neither prime nor composite. If 1 were prime, prime factorisations would not be unique.';
      return;
    }
    const factors = getFactors(i);
    factors.forEach((f) => {
      if (primeCells[f - 1]) primeCells[f - 1].classList.add('is-factor-hl');
    });
    if (isPrime(i)) {
      info.innerHTML = `<strong>${i} is PRIME.</strong> Only divisible by 1 and ${i}. <button type="button" class="num-btn is-compact" data-open-factor="${i}">Open in Factor Tree →</button>`;
    } else {
      const pf = primeFactors(i);
      info.innerHTML = `<strong>${i} is composite.</strong> Factors highlighted on grid: ${factors.join(', ')}. Prime factorisation: <strong>${i} = ${pf.join(' × ')}</strong>. <button type="button" class="num-btn is-compact" data-open-factor="${i}">Open in Factor Tree →</button>`;
    }
    info.querySelector('[data-open-factor]')?.addEventListener('click', () => {
      const val = parseInt(info.querySelector('[data-open-factor]').dataset.openFactor, 10);
      document.getElementById('num-factor-in').value = String(val);
      findFactors();
      openExhibitForTarget('num-sec-factors', true);
    });
  }

  (function buildPrimeGrid() {
    const grid = document.getElementById('num-prime-grid');
    for (let i = 1; i <= 100; i += 1) {
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
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cell.click();
        }
      });
      cell.addEventListener('click', () => inspectGridNumber(i));
      grid.appendChild(cell);
      primeCells.push(cell);
    }
    updatePrimeCounter();
  })();

  function resetPrimeGrid(cancelRun = true) {
    if (cancelRun) sieveRunId += 1;
    sieveStepIdx = 0;
    stepCrossed = new Set();
    primeCells.forEach((cell) => {
      cell.classList.remove('is-crossed', 'is-sieve-focus', 'selected', 'is-factor-hl');
      delete cell.dataset.sievePass;
    });
    document.getElementById('num-sieve-status').textContent = 'Ready to filter multiples.';
    document.getElementById('num-prime-info').innerHTML = 'Click any number above to see its factors highlighted on the grid.';
    updatePrimeCounter();
  }
  window.resetPrimeGrid = resetPrimeGrid;

  async function runSieve() {
    const runId = ++sieveRunId;
    resetPrimeGrid(false);
    const status = document.getElementById('num-sieve-status');
    const info = document.getElementById('num-prime-info');
    const limit = 100;
    const crossed = new Set([1]);
    primeCells[0].classList.add('is-crossed');
    primeCells[0].dataset.sievePass = '1';
    updatePrimeCounter();

    for (let base = 2; base * base <= limit; base += 1) {
      if (runId !== sieveRunId) return;
      if (crossed.has(base)) continue;

      const baseCell = primeCells[base - 1];
      baseCell.classList.add('is-sieve-focus');
      status.textContent = `Filtering multiples of ${base}…`;
      info.innerHTML = `<strong class="num-data">${base}</strong> survives the sieve, so it is prime. Crossing out larger multiples of ${base}.`;
      await new Promise((resolve) => setTimeout(resolve, 420));

      for (let multiple = base * 2; multiple <= limit; multiple += base) {
        if (runId !== sieveRunId) return;
        if (crossed.has(multiple)) continue;
        crossed.add(multiple);
        const cell = primeCells[multiple - 1];
        cell.classList.add('is-crossed');
        cell.dataset.sievePass = String(base);
        updatePrimeCounter();
        await new Promise((resolve) => setTimeout(resolve, 45));
      }

      baseCell.classList.remove('is-sieve-focus');
    }

    if (runId !== sieveRunId) return;
    status.textContent = 'Sieve complete: 25 primes found from 1 to 100.';
    info.innerHTML = '<strong>Sieve complete: 25 primes found from 1 to 100.</strong> Every crossed-out number had a smaller prime factor (2, 3, 5, or 7).';
    updatePrimeCounter();
  }
  window.runSieve = runSieve;

  function stepSieve() {
    sieveRunId += 1;
    const status = document.getElementById('num-sieve-status');
    const info = document.getElementById('num-prime-info');
    if (sieveStepIdx === 0) {
      resetPrimeGrid(false);
      stepCrossed = new Set([1]);
      primeCells[0].classList.add('is-crossed');
      primeCells[0].dataset.sievePass = '1';
    }
    if (sieveStepIdx >= sievePrimes.length) {
      status.textContent = 'All 4 sieve passes complete (2, 3, 5, 7) — 25 primes remain.';
      return;
    }
    primeCells.forEach((c) => c.classList.remove('is-sieve-focus'));
    const base = sievePrimes[sieveStepIdx];
    primeCells[base - 1].classList.add('is-sieve-focus');
    let newlyCrossed = 0;
    for (let multiple = base * 2; multiple <= 100; multiple += base) {
      if (stepCrossed.has(multiple)) continue;
      stepCrossed.add(multiple);
      const cell = primeCells[multiple - 1];
      cell.classList.add('is-crossed');
      cell.dataset.sievePass = String(base);
      newlyCrossed += 1;
    }
    sieveStepIdx += 1;
    updatePrimeCounter();
    status.textContent = `Pass ${sieveStepIdx}/4: multiples of ${base} crossed (${newlyCrossed} new).`;
    info.innerHTML = sieveStepIdx === sievePrimes.length
      ? `Crossed out multiples of <strong>${base}</strong>. Since 11² = 121 &gt; 100, the sieve is finished — all <strong>25 survivors</strong> are prime!`
      : `Crossed out <strong>${newlyCrossed}</strong> new multiples of <strong>${base}</strong>. Click <strong>Step Sieve</strong> again for the next prime.`;
  }
  document.getElementById('num-sieve-step')?.addEventListener('click', stepSieve);

  /* ── 5. Factor Finder, SVG Factor Tree & GCF/LCM ── */
  function buildFactorTreeNode(n) {
    if (isPrime(n)) {
      return { val: n, prime: true, left: null, right: null };
    }
    let a = Math.floor(Math.sqrt(n));
    while (a > 1 && n % a !== 0) a -= 1;
    if (a <= 1) return { val: n, prime: true, left: null, right: null };
    const b = n / a;
    return {
      val: n,
      prime: false,
      left: buildFactorTreeNode(a),
      right: buildFactorTreeNode(b)
    };
  }

  function treeLeafCount(node) {
    if (!node.left && !node.right) return 1;
    return (node.left ? treeLeafCount(node.left) : 0) + (node.right ? treeLeafCount(node.right) : 0);
  }

  function treeDepth(node) {
    if (!node.left && !node.right) return 1;
    return 1 + Math.max(node.left ? treeDepth(node.left) : 0, node.right ? treeDepth(node.right) : 0);
  }

  function renderFactorTree(n) {
    const wrap = document.getElementById('num-factor-tree-wrap');
    if (!wrap) return;
    const root = buildFactorTreeNode(n);
    const leaves = treeLeafCount(root);
    const depth = treeDepth(root);
    const leafSpacing = 58;
    const levelH = 54;
    const padX = 36;
    const padY = 30;
    const width = Math.max(280, leaves * leafSpacing + padX * 2);
    const height = Math.max(96, depth * levelH + padY);
    const theme = getMathTheme();

    const edges = [];
    const nodes = [];
    let nextLeafX = padX + leafSpacing / 2;

    function layout(node, lvl) {
      const y = padY + lvl * levelH;
      if (!node.left && !node.right) {
        const x = nextLeafX;
        nextLeafX += leafSpacing;
        nodes.push({ x, y, val: node.val, prime: true });
        return { x, y };
      }
      const leftPos = layout(node.left, lvl + 1);
      const rightPos = layout(node.right, lvl + 1);
      const x = (leftPos.x + rightPos.x) / 2;
      edges.push({ x1: x, y1: y, x2: leftPos.x, y2: leftPos.y });
      edges.push({ x1: x, y1: y, x2: rightPos.x, y2: rightPos.y });
      nodes.push({ x, y, val: node.val, prime: false });
      return { x, y };
    }

    layout(root, 0);

    const edgeSvg = edges.map((e) =>
      `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="${theme.blue}" stroke-width="2" opacity="0.55"/>`
    ).join('');
    const nodeSvg = nodes.map((nd) => {
      if (nd.prime) {
        return `
          <g>
            <circle cx="${nd.x}" cy="${nd.y}" r="18" fill="${theme.gold}" stroke="${theme.ink}" stroke-width="1.5"/>
            <text x="${nd.x}" y="${nd.y + 5}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="12.5" font-weight="800" fill="#102a43">${nd.val}</text>
          </g>
        `;
      }
      return `
        <g>
          <rect x="${nd.x - 22}" y="${nd.y - 14}" width="44" height="28" rx="6" fill="${theme.sheet}" stroke="${theme.blue}" stroke-width="1.8"/>
          <text x="${nd.x}" y="${nd.y + 5}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="12.5" font-weight="700" fill="${theme.ink}">${nd.val}</text>
        </g>
      `;
    }).join('');

    wrap.innerHTML = `
      <svg class="num-tree-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Prime factor tree for ${n}">
        ${edgeSvg}
        ${nodeSvg}
      </svg>
    `;
  }

  function findFactors() {
    const input = document.getElementById('num-factor-in');
    const n = parseInt(input.value, 10);
    const out = document.getElementById('num-factor-result');
    const panelOut = document.getElementById('num-panel-factor-out');
    const panelIn = document.getElementById('num-panel-factor-in');
    if (panelIn && !Number.isNaN(n)) panelIn.value = String(n);

    if (Number.isNaN(n) || n < 2 || n > 10000) {
      out.innerHTML = '<span style="color:var(--math-red);">Enter a whole number between 2 and 10,000.</span>';
      if (panelOut) panelOut.textContent = 'Enter 2–10,000';
      return;
    }
    const factors = getFactors(n);
    const pf = primeFactors(n);
    const expStr = formatPrimeExponents(pf);
    const prime = isPrime(n);
    const chips = factors.map((f) => {
      const cls = isPrime(f) && f > 1 ? 'num-chip prime-chip' : 'num-chip';
      return `<span class="${cls}">${f}${isPrime(f) && f > 1 ? ' ★' : ''}</span>`;
    }).join('');
    out.innerHTML = `
      <div><strong>${n}</strong> is <strong>${prime ? '⭐ PRIME' : 'composite'}</strong> — ${factors.length} factor${factors.length !== 1 ? 's' : ''}.</div>
      <div class="num-chips">${chips}</div>
      ${!prime ? `<div style="margin-top:0.5rem;">Prime factorisation: <strong class="num-data">${n} = ${pf.join(' × ')}</strong>${pf.length > new Set(pf).size ? ` = <strong class="num-data">${expStr}</strong>` : ''}</div>` : ''}
    `;
    if (panelOut) {
      panelOut.textContent = prime
        ? `${n} is PRIME (${factors.length} factors)`
        : `${n} = ${expStr} (${factors.length} factors)`;
    }
    renderFactorTree(n);
  }
  window.findFactors = findFactors;
  findFactors();

  document.getElementById('num-panel-factor-btn')?.addEventListener('click', () => {
    const val = document.getElementById('num-panel-factor-in').value;
    document.getElementById('num-factor-in').value = val;
    findFactors();
    openExhibitForTarget('num-sec-factors', true);
  });
  document.getElementById('num-panel-factor-in')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('num-panel-factor-btn')?.click();
  });

  /* GCF & LCM Explorer */
  function updateGcfLcm() {
    const aEl = document.getElementById('num-gcf-a');
    const bEl = document.getElementById('num-gcf-b');
    const out = document.getElementById('num-gcflcm-result');
    if (!aEl || !bEl || !out) return;
    const a = Math.max(2, Math.min(200, parseInt(aEl.value, 10) || 12));
    const b = Math.max(2, Math.min(200, parseInt(bEl.value, 10) || 18));
    const g = gcd(a, b);
    const l = lcm(a, b);
    const fa = getFactors(a);
    const fb = getFactors(b);
    const common = fa.filter((x) => fb.includes(x));
    const multA = Array.from({ length: 6 }, (_, i) => a * (i + 1));
    const multB = Array.from({ length: 6 }, (_, i) => b * (i + 1));

    out.innerHTML = `
      <div><strong>GCF(${a}, ${b}) = <span class="num-data">${g}</span></strong> · <strong>LCM(${a}, ${b}) = <span class="num-data">${l}</span></strong>${g === 1 ? ' <em>(coprime — no shared factor &gt; 1!)</em>' : ''}</div>
      <div class="num-data">Common factors: ${common.join(', ')}</div>
      <div class="num-data">Multiples of ${a}: ${multA.map((m) => (m === l ? `<mark>${m}</mark>` : m)).join(', ')}…</div>
      <div class="num-data">Multiples of ${b}: ${multB.map((m) => (m === l ? `<mark>${m}</mark>` : m)).join(', ')}…</div>
    `;
  }
  document.getElementById('num-gcf-a')?.addEventListener('input', updateGcfLcm);
  document.getElementById('num-gcf-b')?.addEventListener('input', updateGcfLcm);
  document.querySelectorAll('[data-gcf-pair]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [a, b] = btn.dataset.gcfPair.split(',').map(Number);
      document.getElementById('num-gcf-a').value = String(a);
      document.getElementById('num-gcf-b').value = String(b);
      updateGcfLcm();
    });
  });
  updateGcfLcm();

  /* ── 6. Euclid's Prime Machine (Proof P1) ── */
  function updateEuclidMachine() {
    const out = document.getElementById('num-euclid-out');
    if (!out) return;
    const active = Array.from(document.querySelectorAll('[data-euclid-prime].active')).map((b) => Number(b.dataset.euclidPrime));
    if (active.length === 0) {
      out.textContent = 'Select at least one prime above to build N.';
      return;
    }
    const prod = active.reduce((acc, p) => acc * p, 1);
    const N = prod + 1;
    const pf = primeFactors(N);
    const nIsPrime = pf.length === 1;
    out.innerHTML = `
      <div><strong>N</strong> = (${active.join(' × ')}) + 1 = <strong>${N.toLocaleString()}</strong></div>
      <div>Remainder when dividing by ${active.join(', ')}: always <strong>1</strong>.</div>
      <div>${nIsPrime
        ? `${N.toLocaleString()} is itself a <strong>brand-new prime</strong> not in the list!`
        : `${N.toLocaleString()} is composite: <strong>${pf.join(' × ')}</strong> — every factor is a brand-new prime outside your list!`}</div>
    `;
  }
  document.querySelectorAll('[data-euclid-prime]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      updateEuclidMachine();
    });
  });
  document.getElementById('num-euclid-composite-preset')?.addEventListener('click', () => {
    document.querySelectorAll('[data-euclid-prime]').forEach((b) => b.classList.add('active'));
    updateEuclidMachine();
  });
  updateEuclidMachine();

  /* ── 7. Modular String Art ── */
  const modState = {
    n: 180,
    multiplier: 2,
    targetMultiplier: 2,
    speed: 0.35,
    paused: false,
    traceEnabled: true,
    traceX: 37,
    lastUiKey: ''
  };

  function describeModFamily(multiplier) {
    if (Math.abs(multiplier - 2) < 0.16) return 'Family: Cardioid threshold';
    if (Math.abs(multiplier - 3) < 0.16) return 'Family: Nephroid threshold';
    if (Math.abs(multiplier - 4) < 0.16) return 'Family: 3-cusped epicycloid';
    if (multiplier < 2) return 'Family: Star lattice';
    if (multiplier < 6) return 'Family: Petal curve';
    if (multiplier < 15) return 'Family: Orbital web';
    return 'Family: Resonant mesh';
  }

  function syncModPanel() {
    const pPt = document.getElementById('num-panel-mod-points');
    const pMult = document.getElementById('num-panel-mod-multiplier');
    const pSpd = document.getElementById('num-panel-mod-speed');
    if (pPt) pPt.value = String(modState.n);
    if (pMult) pMult.value = modState.targetMultiplier.toFixed(2);
    if (pSpd) pSpd.value = String(modState.speed);
  }

  function updateModControls() {
    modState.n = parseInt(document.getElementById('num-mod-points').value, 10);
    modState.speed = parseFloat(document.getElementById('num-mod-speed').value);
    document.getElementById('num-mod-points-val').textContent = String(modState.n);
    document.getElementById('num-mod-speed-val').textContent = `${modState.speed.toFixed(2)}x`;
    const traceSlider = document.getElementById('num-mod-trace-x');
    if (traceSlider) {
      traceSlider.max = String(modState.n - 1);
      if (modState.traceX >= modState.n) {
        modState.traceX = modState.n - 1;
        traceSlider.value = String(modState.traceX);
      }
    }
    syncModPanel();
  }
  window.updateModControls = updateModControls;

  function setManualMultiplier(value) {
    modState.targetMultiplier = parseFloat(value);
    document.getElementById('num-mod-multiplier-val').textContent = modState.targetMultiplier.toFixed(2);
    syncModPanel();
  }
  window.setManualMultiplier = setManualMultiplier;

  document.getElementById('num-panel-mod-points')?.addEventListener('input', (e) => {
    document.getElementById('num-mod-points').value = e.target.value;
    updateModControls();
  });
  document.getElementById('num-panel-mod-multiplier')?.addEventListener('input', (e) => {
    modState.paused = true;
    document.getElementById('num-mod-play').textContent = 'Play';
    document.getElementById('num-mod-multiplier').value = e.target.value;
    setManualMultiplier(e.target.value);
  });
  document.getElementById('num-panel-mod-speed')?.addEventListener('input', (e) => {
    document.getElementById('num-mod-speed').value = e.target.value;
    updateModControls();
  });

  document.getElementById('num-mod-play')?.addEventListener('click', () => {
    modState.paused = !modState.paused;
    document.getElementById('num-mod-play').textContent = modState.paused ? 'Play' : 'Pause';
  });

  document.querySelectorAll('[data-mod-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const m = parseFloat(btn.dataset.modPreset);
      modState.paused = true;
      modState.speed = 0;
      document.getElementById('num-mod-speed').value = '0';
      document.getElementById('num-mod-play').textContent = 'Play';
      document.getElementById('num-mod-multiplier').value = String(m);
      updateModControls();
      setManualMultiplier(m);
    });
  });

  document.getElementById('num-mod-trace-toggle')?.addEventListener('change', (e) => {
    modState.traceEnabled = e.target.checked;
  });
  document.getElementById('num-mod-trace-x')?.addEventListener('input', (e) => {
    modState.traceX = parseInt(e.target.value, 10) || 0;
  });

  const modCanvas = document.getElementById('num-mod-canvas');
  let modCtx;
  let modWidth = 720;
  let modHeight = 420;
  const modStage = SimKit.canvas2d(modCanvas, {
    onResize: function (rCtx, w, h) {
      modCtx = rCtx;
      modWidth = w;
      modHeight = h;
      if (w >= 10 && h >= 10) drawModPattern(0, performance.now());
    }
  });
  resizeCallbacks.push(() => modStage.resize());

  function drawModPattern(dt, time) {
    if (!modCtx || modWidth < 10 || modHeight < 10) return;
    const ctx = modCtx;
    const width = modWidth;
    const height = modHeight;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#090b10';
    ctx.fillRect(0, 0, width, height);

    modState.multiplier += (modState.targetMultiplier - modState.multiplier) * 0.1;
    const n = modState.n;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.37;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 149, 0, 0.24)';
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
      ctx.strokeStyle = 'rgba(255, 149, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (modState.traceEnabled) {
      const tx = Math.min(modState.traceX, n - 1);
      const target = (tx * modState.multiplier) % n;
      const a1 = (tx / n) * Math.PI * 2 - Math.PI / 2;
      const a2 = (target / n) * Math.PI * 2 - Math.PI / 2;
      const px1 = cx + radius * Math.cos(a1);
      const py1 = cy + radius * Math.sin(a1);
      const px2 = cx + radius * Math.cos(a2);
      const py2 = cy + radius * Math.sin(a2);
      ctx.beginPath();
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2.8;
      ctx.stroke();

      ctx.fillStyle = '#50d5a0';
      ctx.beginPath();
      ctx.arc(px1, py1, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff6b7a';
      ctx.beginPath();
      ctx.arc(px2, py2, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    const uiKey = `${n}|${modState.multiplier.toFixed(2)}|${modState.targetMultiplier.toFixed(2)}|${modState.traceX}|${modState.traceEnabled}`;
    if (uiKey !== modState.lastUiKey) {
      modState.lastUiKey = uiKey;
      document.getElementById('num-mod-multiplier-val').textContent = modState.targetMultiplier.toFixed(2);
      document.getElementById('num-mod-eq').textContent = `x → (x × ${modState.multiplier.toFixed(2)}) mod ${n}`;
      const fam = describeModFamily(modState.multiplier);
      document.getElementById('num-mod-family').textContent = fam;
      document.getElementById('num-mod-explain').textContent =
        `With ${n} points on the circle, each point connects to its multiplied remainder. Multiplier ${modState.multiplier.toFixed(2)} creates a ${fam.replace('Family: ', '').toLowerCase()}.`;
      const traceReadout = document.getElementById('num-mod-trace-readout');
      if (traceReadout) {
        const res = ((modState.traceX * modState.multiplier) % n).toFixed(1);
        traceReadout.textContent = modState.traceEnabled
          ? `${modState.traceX} → (${modState.traceX} × ${modState.multiplier.toFixed(2)}) mod ${n} = ${res}`
          : 'Trace off';
      }
    }

    if (!modState.paused && modState.speed > 0) {
      const base = 2 + Math.sin(time * 0.00022 * (0.3 + modState.speed)) * (1.8 + modState.speed * 4.2);
      modState.targetMultiplier = Math.max(1, Math.min(55, base + 1));
      document.getElementById('num-mod-multiplier').value = modState.targetMultiplier.toFixed(2);
      const pMult = document.getElementById('num-panel-mod-multiplier');
      if (pMult) pMult.value = modState.targetMultiplier.toFixed(2);
    }
  }

  updateModControls();
  setManualMultiplier(document.getElementById('num-mod-multiplier').value);
  SimKit.loop(drawModPattern, { el: SimKit.stage('#num-mod-canvas') });

  /* ── 8. Infinite Zoom Number Line ── */
  const lineLandmarks = {
    half: { value: 0.5, label: '1/2 (terminates)' },
    third: { value: 1 / 3, label: '1/3 = 0.333… (rational)' },
    sqrt2half: { value: Math.SQRT1_2, label: '√2/2 ≈ 0.707107… (irrational)' },
    piquarter: { value: Math.PI / 4, label: 'π/4 ≈ 0.785398… (irrational)' },
    reset: { value: 0.5, label: '0.500000 (1/2)', reset: true }
  };
  const numberLineState = {
    level: 0,
    center: 0.5,
    landmarkKey: 'half',
    targetValue: 0.5
  };

  const lineCanvas = document.getElementById('num-line-canvas');
  let lineCtx;
  let lineWidth = 900;
  const lineStage = SimKit.canvas2d(lineCanvas, {
    height: 180,
    onResize: function (rCtx, w) {
      lineCtx = rCtx;
      lineWidth = w;
      renderNumberLine();
    }
  });
  resizeCallbacks.push(() => lineStage.resize());

  function getLineWindow() {
    const span = 1 / Math.pow(2, numberLineState.level);
    let min = numberLineState.center - span / 2;
    let max = numberLineState.center + span / 2;
    if (min < 0) { max -= min; min = 0; }
    if (max > 1) { min -= (max - 1); max = 1; }
    return { min: Math.max(0, min), max: Math.min(1, max), span };
  }

  function renderNumberLine() {
    if (!lineCtx || lineWidth < 10) return;
    const ctx = lineCtx;
    const width = lineWidth;
    const height = 180;
    const theme = getMathTheme();
    ctx.clearRect(0, 0, width, height);

    const { min, max, span } = getLineWindow();
    const y = 102;
    const padX = 42;
    const usableW = width - padX * 2;

    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(width - padX, y);
    ctx.stroke();

    if (numberLineState.level <= 8) {
      const stepDenom = Math.pow(2, Math.min(numberLineState.level + 1, 9));
      const startIdx = Math.max(0, Math.floor(min * stepDenom));
      const endIdx = Math.min(stepDenom, Math.ceil(max * stepDenom));
      for (let i = startIdx; i <= endIdx; i += 1) {
        const value = i / stepDenom;
        if (value < min - 1e-12 || value > max + 1e-12) continue;
        const ratio = (value - min) / (max - min || 1);
        const x = padX + ratio * usableW;
        const major = i % 2 === 0 || numberLineState.level >= 3;
        ctx.strokeStyle = major ? theme.blue : theme.rule;
        ctx.lineWidth = major ? 2.4 : 1.3;
        ctx.beginPath();
        ctx.moveTo(x, y - (major ? 22 : 11));
        ctx.lineTo(x, y + (major ? 22 : 11));
        ctx.stroke();

        if (major) {
          const div = gcd(i, stepDenom);
          const label = value === 0 || value === 1 ? String(value) : `${i / div}/${stepDenom / div}`;
          ctx.fillStyle = theme.blue;
          ctx.font = '700 11.5px "IBM Plex Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(label, x, y - 30);
        }
      }
      document.getElementById('num-line-step-pill').textContent = `Resolution: 1/${stepDenom}`;
    } else {
      const ticks = 8;
      for (let i = 0; i <= ticks; i += 1) {
        const value = min + (span * i) / ticks;
        const x = padX + (i / ticks) * usableW;
        const major = i % 2 === 0;
        ctx.strokeStyle = major ? theme.blue : theme.rule;
        ctx.lineWidth = major ? 2.4 : 1.3;
        ctx.beginPath();
        ctx.moveTo(x, y - (major ? 22 : 11));
        ctx.lineTo(x, y + (major ? 22 : 11));
        ctx.stroke();
        if (major) {
          ctx.fillStyle = theme.blue;
          ctx.font = '700 11px "IBM Plex Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(value.toFixed(5), x, y - 30);
        }
      }
      document.getElementById('num-line-step-pill').textContent = `Zoom: ${Math.pow(2, numberLineState.level).toLocaleString()}×`;
    }

    // Target pin
    if (numberLineState.targetValue >= min && numberLineState.targetValue <= max) {
      const tx = padX + ((numberLineState.targetValue - min) / (max - min || 1)) * usableW;
      ctx.strokeStyle = theme.gold;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(tx, y - 42);
      ctx.lineTo(tx, y + 34);
      ctx.stroke();

      ctx.fillStyle = theme.gold;
      ctx.beginPath();
      ctx.arc(tx, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    const decimals = numberLineState.level > 8 ? 6 : 4;
    document.getElementById('num-line-range-pill').textContent = `Window: ${min.toFixed(decimals)} → ${max.toFixed(decimals)}`;
    const landmarkPill = document.getElementById('num-line-landmark-pill');
    if (landmarkPill) {
      landmarkPill.textContent = `Target: ${lineLandmarks[numberLineState.landmarkKey]?.label || numberLineState.targetValue.toFixed(6)}`;
    }
  }

  function zoomNumberLine(direction) {
    numberLineState.level = Math.max(0, Math.min(16, numberLineState.level + direction));
    renderNumberLine();
  }
  window.zoomNumberLine = zoomNumberLine;

  document.querySelectorAll('[data-line-landmark]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.lineLandmark;
      const cfg = lineLandmarks[key];
      if (!cfg) return;
      numberLineState.landmarkKey = cfg.reset ? 'half' : key;
      numberLineState.targetValue = cfg.value;
      numberLineState.center = cfg.value;
      if (cfg.reset) numberLineState.level = 0;
      else if (numberLineState.level < 3) numberLineState.level = 4;
      document.querySelectorAll('[data-line-landmark]').forEach((b) => b.classList.toggle('active', b.dataset.lineLandmark === numberLineState.landmarkKey));
      renderNumberLine();
    });
  });

  (function wireLinePan() {
    const frame = document.getElementById('num-line-frame');
    if (!frame) return;
    let dragging = false;
    let startX = 0;
    let startCenter = 0.5;
    let moved = false;

    frame.addEventListener('pointerdown', (e) => {
      dragging = true;
      moved = false;
      startX = e.clientX;
      startCenter = numberLineState.center;
      frame.classList.add('is-dragging');
      frame.setPointerCapture?.(e.pointerId);
    });
    frame.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      const span = 1 / Math.pow(2, numberLineState.level);
      const usableW = Math.max(100, lineWidth - 84);
      numberLineState.center = Math.max(0, Math.min(1, startCenter - (dx / usableW) * span));
      renderNumberLine();
    });
    frame.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      frame.classList.remove('is-dragging');
      if (!moved) {
        const rect = frame.getBoundingClientRect();
        const padX = 42;
        const usableW = Math.max(100, rect.width - padX * 2);
        const rel = Math.max(0, Math.min(1, (e.clientX - rect.left - padX) / usableW));
        const { min, max } = getLineWindow();
        numberLineState.center = min + rel * (max - min);
        numberLineState.targetValue = numberLineState.center;
        renderNumberLine();
      }
    });
  })();

  /* ── 9. Two-Sided Divide by Zero & y = 10/x Plot ── */
  const zeroCanvas = document.getElementById('num-zero-canvas');
  let zeroCtx;
  let zeroWidth = 760;
  let zeroHeight = 170;
  const zeroStage = zeroCanvas
    ? SimKit.canvas2d(zeroCanvas, {
        height: 170,
        onResize: function (rCtx, w, h) {
          zeroCtx = rCtx;
          zeroWidth = w;
          zeroHeight = h;
          drawZeroPlot();
        }
      })
    : null;
  if (zeroStage) resizeCallbacks.push(() => zeroStage.resize());

  function drawZeroPlot() {
    if (!zeroCtx || zeroWidth < 10) return;
    const ctx = zeroCtx;
    const w = zeroWidth;
    const h = zeroHeight;
    const theme = getMathTheme();
    const d = parseFloat(document.getElementById('num-zero-range').value);
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const maxX = 5;
    const maxY = 40;
    const toX = (x) => cx + (x / maxX) * (w / 2 - 28);
    const toY = (y) => cy - (y / maxY) * (h / 2 - 18);

    // Axes
    ctx.strokeStyle = theme.rule;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(16, cy);
    ctx.lineTo(w - 16, cy);
    ctx.stroke();

    // Vertical asymptote x = 0
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = theme.red;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx, 8);
    ctx.lineTo(cx, h - 8);
    ctx.stroke();
    ctx.restore();

    // Hyperbola branches
    const drawBranch = (xStart, xEnd) => {
      ctx.beginPath();
      let started = false;
      const steps = 140;
      for (let i = 0; i <= steps; i += 1) {
        const x = xStart + ((xEnd - xStart) * i) / steps;
        const y = 10 / x;
        if (Math.abs(y) > maxY * 1.4) {
          started = false;
          continue;
        }
        const px = toX(x);
        const py = toY(y);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.strokeStyle = theme.blue;
      ctx.lineWidth = 2.6;
      ctx.stroke();
    };
    drawBranch(-5, -0.05);
    drawBranch(0.05, 5);

    ctx.fillStyle = theme.muted;
    ctx.font = '700 11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('x = 0 asymptote', cx + 8, 18);
    ctx.fillText('y = 10 / x', 18, 18);

    if (Math.abs(d) >= 0.005) {
      const yVal = 10 / d;
      const clampedY = Math.max(-maxY + 4, Math.min(maxY - 4, yVal));
      const px = toX(d);
      const py = toY(clampedY);
      ctx.fillStyle = theme.red;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function updateZero() {
    const range = document.getElementById('num-zero-range');
    const raw = parseFloat(range.value);
    const d = Math.abs(raw) < 0.005 ? 0 : raw;
    const display = document.querySelector('.num-zero-display');
    const eqEl = document.getElementById('num-zero-eq');
    const resEl = document.getElementById('num-zero-res');
    const checkEl = document.getElementById('num-zero-check');
    const fillEl = document.getElementById('num-zero-fill');

    document.getElementById('num-zero-dval').textContent = d.toFixed(2);
    eqEl.textContent = `10 ÷ ${d.toFixed(2)}`;

    if (d === 0) {
      resEl.textContent = '= UNDEFINED (breaks!)';
      if (checkEl) checkEl.textContent = 'Check: 0 × ? = 10 — impossible! No number multiplied by 0 equals 10.';
      fillEl.style.width = '100%';
    } else {
      const result = 10 / d;
      if (result > 999) {
        resEl.textContent = `= ${result.toFixed(0)}  (→ +∞)`;
      } else if (result < -999) {
        resEl.textContent = `= ${result.toFixed(0)}  (→ −∞)`;
      } else {
        resEl.textContent = `= ${result.toFixed(2)}`;
      }
      if (checkEl) checkEl.textContent = `Check: ${d.toFixed(2)} × ${result.toFixed(2)} = 10.00 ✓`;
      fillEl.style.width = `${Math.min((Math.abs(result) / 1000) * 100, 100)}%`;
    }

    if (display) {
      display.classList.remove('is-unstable');
      if (Math.abs(d) <= 0.35) {
        void display.offsetWidth;
        display.classList.add('is-unstable');
      }
    }

    document.querySelectorAll('[data-zero-val]').forEach((btn) => {
      btn.classList.toggle('active', Math.abs(parseFloat(btn.dataset.zeroVal) - d) < 0.005);
    });
    drawZeroPlot();
  }
  window.updateZero = updateZero;

  document.querySelectorAll('[data-zero-val]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('num-zero-range').value = btn.dataset.zeroVal;
      updateZero();
    });
  });
  updateZero();

  SimKit.theme.onChange(() => {
    renderNumberLine();
    drawZeroPlot();
    findFactors();
  });

  /* ── 10. Practice Checker & Dynamic Problem Sets ── */
  const defaultProblems = [
    {
      prompt: '1. What is the smallest prime number?',
      answer: '2',
      hint: 'Hint: remember — 1 is <em>not</em> prime. The smallest prime is the first number divisible only by 1 and itself.',
      placeholder: '?'
    },
    {
      prompt: '2. How many factors does 24 have? (count them all)',
      answer: '8',
      hint: 'Hint: factors of 24 are 1, 2, 3, 4, 6, 8, 12, 24 — count them.',
      placeholder: '?'
    },
    {
      prompt: '3. What is 17 mod 5?',
      answer: '2',
      hint: 'Hint: 5 goes into 17 three times (= 15). What\'s left over?',
      placeholder: '?'
    },
    {
      prompt: '4. Convert the fraction ¾ to a decimal.',
      answer: '0.75',
      hint: 'Hint: divide 3 by 4.',
      placeholder: '0.??'
    },
    {
      prompt: '5. It is 9 o\'clock. What time will it be in 50 hours? (give a number 1–12)',
      answer: '11',
      hint: 'Hint: (9 + 50) mod 12 = 59 mod 12. 12 × 4 = 48, so 59 − 48 = ?',
      placeholder: '?'
    }
  ];

  let activeProblems = defaultProblems.map((p) => ({ ...p }));
  const practiceAnswered = {};

  function updateScoreBar() {
    const correct = Object.values(practiceAnswered).filter(Boolean).length;
    const total = 5;
    document.getElementById('num-score-val').textContent = `${correct} / ${total}`;
    document.getElementById('num-score-fill').style.width = `${(correct / total) * 100}%`;
  }

  function chk(qId, fallbackAnswer, fbId, hintId) {
    const idx = parseInt(qId.replace(/\D/g, ''), 10) - 1;
    const expected = activeProblems[idx] ? activeProblems[idx].answer : String(fallbackAnswer);
    const val = document.getElementById(qId).value.trim();
    const fb = document.getElementById(fbId);
    const hint = document.getElementById(hintId);

    const numVal = Number(val);
    const numExp = Number(expected);
    const isMatch = val !== '' && (val === expected || (!Number.isNaN(numVal) && !Number.isNaN(numExp) && Math.abs(numVal - numExp) < 1e-6));

    if (isMatch) {
      fb.textContent = '✓ Correct!';
      fb.className = 'num-fb ok';
      hint.classList.remove('show');
      if (!practiceAnswered[qId]) {
        practiceAnswered[qId] = true;
        updateScoreBar();
      }
    } else {
      fb.textContent = '✗ Try again';
      fb.className = 'num-fb bad';
      hint.classList.add('show');
      practiceAnswered[qId] = false;
      updateScoreBar();
    }
  }
  window.chk = chk;

  function applyPracticeProblems(list) {
    activeProblems = list;
    list.forEach((p, idx) => {
      const qNum = idx + 1;
      const qId = `q${qNum}`;
      const label = document.getElementById(`q${qNum}-label`);
      const input = document.getElementById(qId);
      const fb = document.getElementById(`f${qNum}`);
      const hint = document.getElementById(`h${qNum}`);
      if (label) label.textContent = p.prompt;
      if (input) {
        input.value = '';
        input.placeholder = p.placeholder || '?';
      }
      if (fb) {
        fb.textContent = '';
        fb.className = 'num-fb';
      }
      if (hint) {
        hint.innerHTML = p.hint;
        hint.classList.remove('show');
      }
      practiceAnswered[qId] = false;
    });
    updateScoreBar();
  }

  function generatePracticeSet() {
    const primes = [11, 13, 17, 19, 23, 29, 31, 37];
    const pChoice = primes[Math.floor(Math.random() * (primes.length - 1))];
    const nextP = primes[primes.indexOf(pChoice) + 1];

    const factorTargets = [12, 16, 18, 20, 28, 30, 36];
    const fTarget = factorTargets[Math.floor(Math.random() * factorTargets.length)];
    const fList = getFactors(fTarget);

    const modBase = 15 + Math.floor(Math.random() * 30);
    const modDiv = 4 + Math.floor(Math.random() * 6);
    const modAns = modBase % modDiv;

    const decPairs = [
      { label: '½', ans: '0.5', hint: 'Divide 1 by 2.' },
      { label: '¼', ans: '0.25', hint: 'Divide 1 by 4.' },
      { label: '⅖', ans: '0.4', hint: 'Divide 2 by 5.' },
      { label: '⅗', ans: '0.6', hint: 'Divide 3 by 5.' },
      { label: '⅜', ans: '0.375', hint: 'Divide 3 by 8.' },
      { label: '⅝', ans: '0.625', hint: 'Divide 5 by 8.' }
    ];
    const decPick = decPairs[Math.floor(Math.random() * decPairs.length)];

    const startHr = 1 + Math.floor(Math.random() * 11);
    const addHrs = 20 + Math.floor(Math.random() * 45);
    const endHr = ((startHr + addHrs - 1) % 12) + 1;

    applyPracticeProblems([
      {
        prompt: `1. What is the next prime number right after ${pChoice}?`,
        answer: String(nextP),
        hint: `Hint: check odd numbers after ${pChoice} to see which has no factors besides 1 and itself.`,
        placeholder: '?'
      },
      {
        prompt: `2. How many factors does ${fTarget} have? (count them all)`,
        answer: String(fList.length),
        hint: `Hint: factors of ${fTarget} are ${fList.join(', ')}.`,
        placeholder: '?'
      },
      {
        prompt: `3. What is ${modBase} mod ${modDiv}?`,
        answer: String(modAns),
        hint: `Hint: divide ${modBase} by ${modDiv} and keep only the remainder.`,
        placeholder: '?'
      },
      {
        prompt: `4. Convert the fraction ${decPick.label} to a decimal.`,
        answer: decPick.ans,
        hint: `Hint: ${decPick.hint}`,
        placeholder: '0.??'
      },
      {
        prompt: `5. It is ${startHr} o'clock. What time will it be in ${addHrs} hours? (give a number 1–12)`,
        answer: String(endHr),
        hint: `Hint: (${startHr} + ${addHrs}) mod 12 (with 0 counting as 12).`,
        placeholder: '?'
      }
    ]);
  }

  document.getElementById('num-practice-new')?.addEventListener('click', generatePracticeSet);
  document.getElementById('num-practice-reset')?.addEventListener('click', () => applyPracticeProblems(defaultProblems.map((p) => ({ ...p }))));

  document.querySelectorAll('.num-ans').forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const btn = input.closest('.num-problem-row')?.querySelector('.num-check');
      if (btn) btn.click();
    });
  });

  if (location.hash) {
    openExhibitForTarget(location.hash, false);
  }
})();
