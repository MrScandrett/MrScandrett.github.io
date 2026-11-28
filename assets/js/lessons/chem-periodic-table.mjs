import { ELEMENT_PROPERTIES } from './periodic-table-data.mjs';
import {
  CATS,
  HEATMAPS,
  COMMANDS,
  SOURCE_DEFS,
  SOURCE_ICONS,
  ELEMENT_STORIES,
  PRACTICE_QUESTIONS,
  catColor,
  readableInkColor,
  rgba,
  escapeHtml,
  formatValue,
  formatScaleValue,
  simplifyRemoteData,
  buildElements,
  getState,
  getStateLabel,
  getStateSubtitle,
  formatStateText,
  countStates,
  getHeatmapBounds,
  getHeatmapIntensity,
  getCellBackground,
  getCellBottomText,
  matchesFilters,
  searchCommands,
  periodOf,
  groupOf,
  getFinderDefs,
  buildBohrMarkup,
  buildQuantumMarkup,
  buildCompareTableHtml,
  projectDiscoveryPoint,
  buildPhotoFigureHtml
} from './periodic-table-model.mjs';

const PROPERTY_SOURCE_URL = 'https://raw.githubusercontent.com/Bowserinator/Periodic-Table-JSON/master/PeriodicTableJSON.json';
const PROPERTY_CACHE_KEY = 'classroomos-periodic-ref-v2';

function isDarkTheme() {
  const html = document.documentElement;
  const lighting = html.dataset.lighting || '';
  const theme = html.dataset.theme || '';
  if (lighting === 'night') return true;
  if (window.ClassroomOSThemeRegistry && theme) {
    return window.ClassroomOSThemeRegistry.isDark(theme);
  }
  return ['vaporwave', 'bark', 'mandelbrot', 'lavalamp'].includes(theme);
}

function runWhenIdle(fn, timeout = 200) {
  if (typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(fn, { timeout });
  }
  return window.setTimeout(fn, 0);
}

/* ── On-demand module & geodata loaders (cached promises) ── */
let historyDataPromise = null;
function loadHistoryData() {
  if (!historyDataPromise) {
    historyDataPromise = import('./periodic-table-history.mjs')
      .then((m) => m.ELEMENT_HISTORY)
      .catch((err) => { historyDataPromise = null; throw err; });
  }
  return historyDataPromise;
}

let imagesDataPromise = null;
function loadImagesData() {
  if (!imagesDataPromise) {
    imagesDataPromise = import('./periodic-table-images.mjs')
      .then((m) => m.ELEMENT_IMAGES)
      .catch((err) => { imagesDataPromise = null; throw err; });
  }
  return imagesDataPromise;
}

let supplyDataPromise = null;
function loadSupplyData() {
  if (!supplyDataPromise) {
    supplyDataPromise = import('./periodic-table-supply.mjs')
      .catch((err) => { supplyDataPromise = null; throw err; });
  }
  return supplyDataPromise;
}

let crystalViewerPromise = null;
function loadCrystalViewer() {
  if (!crystalViewerPromise) {
    crystalViewerPromise = import('../crystal-viewer.mjs')
      .catch((err) => { crystalViewerPromise = null; throw err; });
  }
  return crystalViewerPromise;
}

let worldLandPromise = null;
function loadWorldLandPath() {
  if (!worldLandPromise) {
    const url = new URL('../../geodata/world/world-land-path-simple.json', import.meta.url).href;
    worldLandPromise = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('World map HTTP ' + res.status);
        return res.json();
      })
      .then((json) => json.d)
      .catch((err) => { worldLandPromise = null; throw err; });
  }
  return worldLandPromise;
}

/* ── DOM Handles ─────────────────────────────────────── */
const pageEl = document.querySelector('.pt-page');
const dashboard = document.getElementById('pt-dash');
const grid = document.getElementById('pt-grid');
const legend = document.getElementById('pt-legend');
const ctrl = document.getElementById('pt-controls');
const tempInput = document.getElementById('pt-temp');
const tempReadout = document.getElementById('pt-temp-readout');
const tempStateReadout = document.getElementById('pt-temp-state-readout');
const tempEquiv = document.getElementById('pt-temp-equiv');
const tempCounts = document.getElementById('pt-temp-counts');
const tempChips = Array.from(document.querySelectorAll('.pt-temp-chip'));
const quickSearch = document.getElementById('pt-quick-search');
const quickLens = document.getElementById('pt-quick-lens');
const quickTemp = document.getElementById('pt-quick-temp');
const quickTempBtn = document.getElementById('pt-quick-temp-btn');
const quickCmd = document.getElementById('pt-quick-cmd');
const quickControls = document.getElementById('pt-quick-controls');
const stateCounts = document.getElementById('pt-state-counts');
const activeFilterBar = document.getElementById('pt-active-filter');
const heatmapWrap = document.getElementById('pt-heatmap');
const heatLegend = document.getElementById('pt-heat-legend');
const heatBar = document.getElementById('pt-heat-bar');
const heatMin = document.getElementById('pt-heat-min');
const heatMid = document.getElementById('pt-heat-mid');
const heatMax = document.getElementById('pt-heat-max');
const lensBanner = document.getElementById('pt-lens-banner');
const lensTitle = document.getElementById('pt-lens-title');
const lensScaleInline = document.getElementById('pt-lens-scale-inline');
const lensReset = document.getElementById('pt-lens-reset');
const searchInput = document.getElementById('pt-search');
const dataNote = document.getElementById('pt-data-note');
const commandStatus = document.getElementById('pt-command-status');
const commandOpen = document.getElementById('pt-command-open');
const commandRoot = document.getElementById('pt-command');
const commandBackdrop = document.getElementById('pt-command-backdrop');
const commandInput = document.getElementById('pt-command-input');
const commandClose = document.getElementById('pt-command-close');
const commandList = document.getElementById('pt-command-list');
const detailPanel = document.getElementById('el-panel');
const atomModelButtons = Array.from(document.querySelectorAll('[data-atom-model]'));
const atomMotionBtn = document.getElementById('ep-atom-motion');
const bohrSvg = document.getElementById('bohr-svg');
const epPrev = document.getElementById('ep-prev');
const epNext = document.getElementById('ep-next');
const epCompareBtn = document.getElementById('ep-compare-btn');
const epCompareTray = document.getElementById('ep-compare-tray');
const epCompareSelect = document.getElementById('ep-compare-select');
const epCompareSwap = document.getElementById('ep-compare-swap');
const epCompareClose = document.getElementById('ep-compare-close');
const epCompareView = document.getElementById('ep-compare-view');
const finderTabs = document.getElementById('pt-finder-tabs');
const finderItems = document.getElementById('pt-finder-items');
const finderOut = document.getElementById('pt-finder-out');

/* ── State ───────────────────────────────────────────── */
let propertyRefBySymbol = {};
try {
  const cached = localStorage.getItem(PROPERTY_CACHE_KEY);
  if (cached) propertyRefBySymbol = JSON.parse(cached) || {};
} catch (error) {}

let elements = buildElements(ELEMENT_PROPERTIES, propertyRefBySymbol);
const elementsBySymbol = new Map();
const elementsByNumber = new Map();
function indexElements() {
  elementsBySymbol.clear();
  elementsByNumber.clear();
  elements.forEach((el) => {
    elementsBySymbol.set(el.symbol, el);
    elementsByNumber.set(el.number, el);
  });
}
indexElements();

let selectedSymbol = null;
let compareSymbol = null;
let compareMode = false;
let activeCat = 'all';
let isolatedCat = null;
let searchQ = '';
let activeHeatmap = 'none';
let currentTemp = Number((tempInput && tempInput.value) || 295);
let commandMatches = new Set();
let commandSelectedIndex = -1;
let lastRenderedCommandItems = [];
let atomModel = 'bohr';
let atomPaused = false;
let patternFilter = null;

let finderLens = null;
let finderItem = null;
let practiceIndex = 0;
let practiceScore = 0;
let practiceTotal = 0;
let practiceFeedback = null;
let practiceShowHint = false;

const cellBySymbol = new Map();
const groupAxisBtns = new Map();
const periodAxisBtns = new Map();
const catControlBtns = [];
const legendItemNodes = [];
let gridBuilt = false;
let secondaryUiReady = false;
let compareSelectReady = false;
let crystalViewer = null;
let historyDom = null;
let renderToken = 0;
const tabRenderKey = new Map();

function setTextIfChanged(el, text) {
  if (!el) return;
  const s = String(text);
  if (el.textContent !== s) el.textContent = s;
}

function setAttrIfChanged(el, name, value) {
  if (!el) return;
  const s = String(value);
  if (el.getAttribute(name) !== s) el.setAttribute(name, s);
}

function isSideBySide() {
  if (pageEl && pageEl.clientWidth > 0) return pageEl.clientWidth >= 1040;
  return dashboard ? getComputedStyle(dashboard).display === 'grid' : window.innerWidth >= 1040;
}

/* ── Grid & Legend ───────────────────────────────────── */
function buildGridOnce() {
  if (gridBuilt) return;
  const frag = document.createDocumentFragment();

  for (let g = 1; g <= 18; g++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pt-axis-btn pt-axis-group';
    btn.textContent = String(g);
    btn.style.gridColumn = String(g + 1);
    btn.style.gridRow = '1';
    btn.setAttribute('aria-label', 'Highlight Group ' + g);
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      ensureSecondaryUi();
      const same = finderLens === 'group' && finderItem === String(g);
      finderLens = same ? null : 'group';
      finderItem = same ? null : String(g);
      applyFinder();
    });
    frag.appendChild(btn);
    groupAxisBtns.set(g, btn);
  }

  [[1, 2, '1'], [2, 3, '2'], [3, 4, '3'], [4, 5, '4'], [5, 6, '5'], [6, 7, '6'], [7, 8, '7'], [6, 10, '6*'], [7, 11, '7*']].forEach(([p, r, label]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pt-axis-btn pt-axis-period';
    btn.textContent = label;
    btn.style.gridColumn = '1';
    btn.style.gridRow = String(r);
    btn.setAttribute('aria-label', 'Highlight Period ' + p);
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      ensureSecondaryUi();
      const same = finderLens === 'period' && finderItem === String(p);
      finderLens = same ? null : 'period';
      finderItem = same ? null : String(p);
      applyFinder();
    });
    frag.appendChild(btn);
    if (!periodAxisBtns.has(p)) periodAxisBtns.set(p, []);
    periodAxisBtns.get(p).push(btn);
  });

  const frow = document.createElement('div');
  frow.className = 'pt-frow';
  frow.setAttribute('aria-hidden', 'true');
  frow.innerHTML = '<div class="pt-frow-line"></div><span class="pt-frow-label">f-block (Lanthanides &amp; Actinides)</span><div class="pt-frow-line"></div>';
  frag.appendChild(frow);

  [[4, 7, '57–71', 'lanthanide', 'Highlight Lanthanides (57–71)'], [4, 8, '89–103', 'actinide', 'Highlight Actinides (89–103)']].forEach(([col, row, label, fam, aria]) => {
    const ph = document.createElement('button');
    ph.type = 'button';
    ph.className = 'pt-ph';
    ph.style.gridColumn = String(col);
    ph.style.gridRow = String(row);
    ph.textContent = label;
    ph.setAttribute('aria-label', aria);
    ph.addEventListener('click', () => {
      ensureSecondaryUi();
      const same = finderLens === 'family' && finderItem === fam;
      finderLens = same ? null : 'family';
      finderItem = same ? null : fam;
      applyFinder();
    });
    frag.appendChild(ph);
  });

  elements.forEach((base) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'el';
    cell.dataset.z = String(base.number);
    cell.dataset.cat = base.cat;
    cell.dataset.col = String(base.col);
    cell.dataset.row = String(base.row);
    cell.style.gridColumn = String(base.col + 1);
    cell.style.gridRow = String(base.row + 1);
    cell.title = base.name + ' (' + base.symbol + ', Z=' + base.number + ')';

    const numEl = document.createElement('span');
    numEl.className = 'el-num';
    numEl.textContent = String(base.number);

    const symEl = document.createElement('span');
    symEl.className = 'el-sym';
    symEl.textContent = base.symbol;

    const nameEl = document.createElement('span');
    nameEl.className = 'el-name';
    nameEl.textContent = base.name;

    const phaseEl = document.createElement('span');
    phaseEl.className = 'el-phase';

    const massEl = document.createElement('span');
    massEl.className = 'el-mass';

    cell.append(numEl, symEl, nameEl, phaseEl, massEl);
    cell.addEventListener('click', () => {
      ensureSecondaryUi();
      const element = elementsBySymbol.get(base.symbol);
      if (!element) return;
      if (compareMode && selectedSymbol && selectedSymbol !== element.symbol) {
        compareSymbol = element.symbol;
        if (epCompareSelect) epCompareSelect.value = element.symbol;
        updateGrid();
        const curr = elementsBySymbol.get(selectedSymbol);
        if (curr) renderStats(curr);
        return;
      }
      if (finderLens === 'practice') {
        handlePracticeGuess(element);
      }
      showElement(element, false);
      cell.focus({ preventScroll: true });
    });
    frag.appendChild(cell);
    cellBySymbol.set(base.symbol, {
      cell, phaseEl, massEl,
      lastState: '', lastHeat: '', lastDark: null, lastTemp: null
    });
  });

  grid.textContent = '';
  grid.appendChild(frag);
  gridBuilt = true;
}

function updateActiveFilterChip() {
  if (!activeFilterBar) return;
  const hasCat = activeCat !== 'all';
  const hasSearch = !!searchQ;
  const hasPattern = !!patternFilter;
  const hasCmd = commandMatches.size > 0;
  if (!hasCat && !hasSearch && !hasPattern && !hasCmd) {
    if (!activeFilterBar.hidden) {
      activeFilterBar.hidden = true;
      activeFilterBar.textContent = '';
    }
    return;
  }
  const filterOpts = { activeCat, searchQ, patternFilter };
  const matchCount = elements.filter((e) => matchesFilters(e, filterOpts) && (!hasCmd || commandMatches.has(e.symbol))).length;
  const visibleCount = hasCmd ? commandMatches.size : elements.filter((e) => matchesFilters(e, filterOpts)).length;
  const parts = [];
  if (hasCat) parts.push(CATS[activeCat].label);
  if (hasSearch) parts.push('search “' + searchQ + '”');
  if (hasPattern) parts.push('pattern lens');
  if (hasCmd) parts.push('command topic');
  activeFilterBar.hidden = false;
  activeFilterBar.innerHTML = '<span>Showing ' + (hasCmd && !hasCat && !hasSearch && !hasPattern ? visibleCount : matchCount) + ' / 118 (' + parts.join(' · ') + ')</span>'
    + '<button type="button" class="pt-active-filter-reset" id="pt-clear-all-filters">Clear filters</button>';
  const btn = document.getElementById('pt-clear-all-filters');
  if (btn) btn.addEventListener('click', clearAllFilters);
}

function updateGrid() {
  buildGridOnce();
  const dark = isDarkTheme();
  const bounds = getHeatmapBounds(elements, activeHeatmap);
  const filterOpts = { activeCat, searchQ, patternFilter };

  groupAxisBtns.forEach((btn, g) => {
    const active = finderLens === 'group' && finderItem === String(g);
    setAttrIfChanged(btn, 'aria-pressed', active ? 'true' : 'false');
  });
  periodAxisBtns.forEach((btns, p) => {
    const active = finderLens === 'period' && finderItem === String(p);
    btns.forEach((btn) => setAttrIfChanged(btn, 'aria-pressed', active ? 'true' : 'false'));
  });

  elements.forEach((element) => {
    const entry = cellBySymbol.get(element.symbol);
    if (!entry) return;
    const { cell, phaseEl, massEl } = entry;
    const color = catColor(element.cat, dark);
    const state = getState(element, currentTemp);

    if (entry.lastState !== state || entry.lastHeat !== activeHeatmap || entry.lastDark !== dark || entry.lastTemp !== currentTemp) {
      const intensity = getHeatmapIntensity(element, activeHeatmap, bounds);
      cell.style.background = getCellBackground(element, state, intensity, { activeHeatmap, dark });
      cell.style.color = state === 'gas' ? (dark ? '#cbd5e1' : '#395366') : color;
      cell.style.borderColor = state === 'liquid'
        ? (dark ? 'rgba(56,189,248,0.52)' : 'rgba(2,132,199,0.42)')
        : rgba(color, dark ? 0.44 : 0.34);

      const stateLabel = getStateLabel(state);
      setAttrIfChanged(cell, 'aria-label', element.name + ', element ' + element.number + ', ' + stateLabel + ' at ' + currentTemp + ' Kelvin');

      const shortPhase = { predicted: 'Pred.', liquid: 'Liq.' };
      setTextIfChanged(phaseEl, shortPhase[stateLabel] || stateLabel);
      if (phaseEl.title !== stateLabel) phaseEl.title = stateLabel;

      const bottom = getCellBottomText(element, activeHeatmap);
      setTextIfChanged(massEl, bottom.text);
      massEl.classList.toggle('is-property-value', bottom.isProp);

      entry.lastState = state;
      entry.lastHeat = activeHeatmap;
      entry.lastDark = dark;
      entry.lastTemp = currentTemp;
    }

    cell.classList.toggle('el-selected', selectedSymbol === element.symbol);
    cell.classList.toggle('el-compare-selected', compareMode && compareSymbol === element.symbol);
    cell.classList.toggle('el-dimmed', !matchesFilters(element, filterOpts));
    cell.classList.toggle('el-isolated-out', !!isolatedCat && element.cat !== isolatedCat);
    cell.classList.toggle('el-command-match', commandMatches.has(element.symbol));
  });

  updateActiveFilterChip();
}

function renderCategoryControls() {
  if (!ctrl) return;
  const dark = isDarkTheme();
  if (!catControlBtns.length) {
    ctrl.textContent = '';
    const frag = document.createDocumentFragment();
    const defs = [['all', { label: 'All 118', color: dark ? '#cbd5e1' : '#475569' }]].concat(Object.entries(CATS));
    defs.forEach(([key, meta]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pt-filter-btn';
      btn.dataset.cat = key;
      btn.textContent = meta.label;
      btn.addEventListener('mouseenter', () => { if (key !== 'all') { isolatedCat = key; updateGrid(); } });
      btn.addEventListener('mouseleave', () => { if (isolatedCat === key) { isolatedCat = null; updateGrid(); } });
      btn.addEventListener('click', () => { activeCat = (activeCat === key && key !== 'all') ? 'all' : key; renderAll(); });
      frag.appendChild(btn);
      catControlBtns.push({ key, meta, btn });
    });
    ctrl.appendChild(frag);
  }
  catControlBtns.forEach(({ key, meta, btn }) => {
    const inkColor = key === 'all' ? (dark ? '#cbd5e1' : '#475569') : (dark ? meta.darkColor : meta.color);
    const active = activeCat === key;
    btn.style.borderColor = key === 'all' ? (dark ? '#64748b' : '#94a3b8') : inkColor;
    btn.classList.toggle('pt-btn-active', active && key !== 'all');
    btn.classList.toggle('pt-btn-dimmed', activeCat !== 'all' && !active);
    setAttrIfChanged(btn, 'aria-pressed', active ? 'true' : 'false');
    if (active && key !== 'all') {
      btn.style.background = meta.color;
      btn.style.color = '#fff';
    } else {
      btn.style.background = '';
      btn.style.color = inkColor;
    }
  });
}

function renderLegend() {
  if (!legend) return;
  const dark = isDarkTheme();
  if (!legendItemNodes.length) {
    legend.textContent = '';
    const frag = document.createDocumentFragment();
    Object.entries(CATS).forEach(([key, meta]) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'pt-legend-item';
      const dot = document.createElement('span');
      dot.className = 'pt-legend-dot';
      item.appendChild(dot);
      item.appendChild(document.createTextNode(meta.label));
      item.addEventListener('mouseenter', () => { isolatedCat = key; updateGrid(); });
      item.addEventListener('mouseleave', () => { isolatedCat = null; updateGrid(); });
      item.addEventListener('click', () => { activeCat = (activeCat === key) ? 'all' : key; renderAll(); });
      frag.appendChild(item);
      legendItemNodes.push({ key, dot });
    });
    legend.appendChild(frag);
  }
  legendItemNodes.forEach(({ key, dot }) => {
    const c = catColor(key, dark);
    dot.style.background = rgba(c, 0.22);
    dot.style.border = '1.5px solid ' + c;
  });
}

const heatButtons = [];
function renderHeatmapControls() {
  if (!heatmapWrap) return;
  if (!heatButtons.length) {
    heatmapWrap.textContent = '';
    const frag = document.createDocumentFragment();
    Object.entries(HEATMAPS).forEach(([key, meta]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pt-heat-btn';
      btn.textContent = meta.label;
      btn.addEventListener('click', () => {
        activeHeatmap = activeHeatmap === key ? 'none' : key;
        renderAll();
      });
      frag.appendChild(btn);
      heatButtons.push({ key, btn });
    });
    heatmapWrap.appendChild(frag);
  }

  heatButtons.forEach(({ key, btn }) => {
    btn.classList.toggle('is-active', activeHeatmap === key);
    setAttrIfChanged(btn, 'aria-pressed', activeHeatmap === key ? 'true' : 'false');
  });

  if (quickLens) quickLens.value = activeHeatmap;

  if (activeHeatmap !== 'none' && HEATMAPS[activeHeatmap]) {
    const meta = HEATMAPS[activeHeatmap];
    const bounds = getHeatmapBounds(elements, activeHeatmap);
    if (bounds) {
      const mid = (bounds.min + bounds.max) / 2;
      const unit = meta.unit ? (meta.unit.startsWith('/') ? meta.unit : ' ' + meta.unit) : '';
      const grad = 'linear-gradient(90deg, ' + meta.tint.replace('VAR', '0.18') + ', ' + meta.tint.replace('VAR', '0.88') + ')';
      if (heatLegend) {
        heatLegend.hidden = false;
        setTextIfChanged(heatMin, formatScaleValue(bounds.min) + unit);
        setTextIfChanged(heatMid, formatScaleValue(mid) + unit);
        setTextIfChanged(heatMax, formatScaleValue(bounds.max) + unit);
        if (heatBar) heatBar.style.background = grad;
      }
      if (lensBanner) {
        lensBanner.hidden = false;
        setTextIfChanged(lensTitle, 'Property Lens: ' + meta.label + (meta.unit ? ' (' + meta.unit + ')' : ''));
        if (lensScaleInline) {
          lensScaleInline.innerHTML = '<span>' + formatScaleValue(bounds.min) + unit + '</span>'
            + '<span class="pt-lens-scale-swatch" style="background:' + grad + '"></span>'
            + '<span>' + formatScaleValue(bounds.max) + unit + '</span>';
        }
      }
    }
  } else {
    if (heatLegend) heatLegend.hidden = true;
    if (lensBanner) lensBanner.hidden = true;
  }
}

/* ── Pattern Finder & Practice ───────────────────────── */
function handlePracticeGuess(element) {
  const q = PRACTICE_QUESTIONS[practiceIndex];
  if (!q) return;
  const ok = q.test(element);
  practiceTotal++;
  if (ok) {
    practiceScore++;
    practiceFeedback = { ok: true, text: 'Correct! ' + element.name + ' (' + element.symbol + ') — ' + q.explain };
  } else {
    practiceFeedback = { ok: false, text: 'Not quite — ' + element.name + ' (' + element.symbol + ', Period ' + periodOf(element) + ', Group ' + (groupOf(element) || 'f-block') + ') doesn’t match. Try another element or tap Hint.' };
  }
  renderFinder();
}

function renderFinder() {
  if (!finderTabs || !finderItems || !finderOut) return;
  const lenses = [
    ['period', 'Periods (rows)'],
    ['group', 'Groups (columns)'],
    ['block', 'Blocks'],
    ['family', 'Families'],
    ['trend', 'Trends'],
    ['practice', 'Practice']
  ];
  finderTabs.innerHTML = '';
  lenses.forEach(([key, label]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pt-finder-btn'; b.textContent = label;
    b.setAttribute('aria-pressed', finderLens === key ? 'true' : 'false');
    b.addEventListener('click', () => {
      finderLens = finderLens === key ? null : key;
      finderItem = null;
      practiceFeedback = null;
      practiceShowHint = false;
      applyFinder();
    });
    finderTabs.appendChild(b);
  });

  finderItems.innerHTML = '';
  if (finderLens === 'practice') {
    patternFilter = null;
    const q = PRACTICE_QUESTIONS[practiceIndex];
    finderOut.innerHTML =
      '<div class="pt-quiz-head">'
      + '<h3>Periodic Detective (' + (practiceIndex + 1) + ' / ' + PRACTICE_QUESTIONS.length + ')</h3>'
      + '<span class="pt-quiz-score">Score: ' + practiceScore + ' / ' + practiceTotal + '</span>'
      + '</div>'
      + '<p class="pt-quiz-prompt">' + q.prompt + '</p>'
      + '<div class="pt-quiz-actions">'
      + '<button type="button" class="pt-finder-btn" id="pt-quiz-hint">' + (practiceShowHint ? 'Hide hint' : 'Hint') + '</button>'
      + '<button type="button" class="pt-finder-btn" id="pt-quiz-next">Next question →</button>'
      + '</div>'
      + (practiceShowHint ? '<p class="pt-quiz-feedback is-hint">Hint: ' + q.hint + '</p>' : '')
      + (practiceFeedback ? '<p class="pt-quiz-feedback ' + (practiceFeedback.ok ? 'is-correct' : 'is-wrong') + '">' + practiceFeedback.text + '</p>' : '<p>Click any element on the periodic table above to answer.</p>');

    const hintBtn = document.getElementById('pt-quiz-hint');
    if (hintBtn) hintBtn.addEventListener('click', () => { practiceShowHint = !practiceShowHint; renderFinder(); });
    const nextBtn = document.getElementById('pt-quiz-next');
    if (nextBtn) nextBtn.addEventListener('click', () => {
      practiceIndex = (practiceIndex + 1) % PRACTICE_QUESTIONS.length;
      practiceFeedback = null;
      practiceShowHint = false;
      renderFinder();
    });
    return;
  }

  const defs = finderLens ? getFinderDefs(finderLens, elements) : [];
  defs.forEach((d) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pt-finder-btn'; b.textContent = d.label;
    b.setAttribute('aria-pressed', finderItem === d.key ? 'true' : 'false');
    b.addEventListener('click', () => { finderItem = finderItem === d.key ? null : d.key; applyFinder(); });
    finderItems.appendChild(b);
  });
  const cur = defs.find((d) => d.key === finderItem);
  patternFilter = cur ? cur.test : null;
  if (cur) {
    const count = elements.filter(cur.test).length;
    finderOut.innerHTML = '<h3>' + cur.title + '</h3><p>' + cur.body + '</p><p><span class="pt-finder-how">How to identify it:</span> ' + cur.how + '</p><p>' + count + ' element' + (count === 1 ? '' : 's') + ' highlighted on the table.</p>';
  } else {
    finderOut.innerHTML = '<p>' + (finderLens ? 'Choose an item above (or click any row/column header on the table).' : 'Start with a lens above or click any Group (1–18) or Period (1–7) header on the table. <strong>Practice</strong> challenges you to locate elements using table patterns.') + '</p>';
  }
}

function applyFinder() { renderFinder(); updateGrid(); }

/* ── Element Panel Renderers (per-tab, batched) ──────── */
function renderAtomExplain(element) {
  const host = document.getElementById('ep-atom-explain');
  if (!host) return;
  const quantum = atomModel === 'quantum';
  host.innerHTML = '<summary>A teaching model, not a picture of a real atom</summary>'
    + '<h4>What you are viewing</h4><ul>'
    + '<li>' + (quantum
      ? 'Fuzzy <strong>probability clouds</strong> arranged by shell and by block (s, p, d, f). A cloud shows where an electron is <em>likely</em> to be found, not where it is.'
      : 'A <strong>nucleus</strong> (' + element.number + ' protons) and rings showing how many electrons sit in each energy shell: ' + element.shells.join(' · ') + '. The highlighted outer ring marks the valence shell.') + '</li>'
    + '<li>The electron counts per shell are real data for the ground state. Everything else about the drawing is a convenient picture.</li></ul>'
    + '<h4>What is simplified</h4><ul>'
    + (quantum
      ? '<li>Shapes and spread are schematic. Real orbitals come from solving the Schrödinger equation, have distinct lobes and nodes, and have no hard edge.</li>'
      : '<li>Electrons do <strong>not</strong> orbit on circular tracks like planets. Niels Bohr’s 1913 picture works well for hydrogen only and fails for multi-electron atoms.</li>')
    + '<li>Not to scale: the nucleus is about 100,000 times smaller than the atom. If the atom were a stadium, the nucleus would be a pea.</li>'
    + '<li>Electrons are not dots: they behave as waves and particles, and they cannot be pinned to an exact position and speed at once.</li></ul>'
    + '<h4>Why it matters</h4><p>The shell count tells you the <strong>period</strong>, and the electrons in the outermost shell (the valence electrons) set the <strong>group</strong>, bonding and reactivity. That is why ' + element.name + ' behaves like its column neighbours.</p>';
}

function renderAtomModel(element, color) {
  const title = document.getElementById('ep-model-title');
  const note = document.getElementById('ep-shell-note');
  const summary = document.getElementById('ep-atom-summary');
  atomModelButtons.forEach((button) => setAttrIfChanged(button, 'aria-pressed', button.dataset.atomModel === atomModel ? 'true' : 'false'));
  renderAtomExplain(element);
  const valence = element.shells[element.shells.length - 1] || 0;
  const period = element.shells.length;
  const block = (element.cat === 'ln' || element.cat === 'ac') ? 'f' : (element.col <= 2 || element.symbol === 'He') ? 's' : element.col >= 13 ? 'p' : 'd';
  const grpLabel = (element.cat === 'ln' || element.cat === 'ac') ? 'f-block' : 'Group ' + element.col;
  if (summary) {
    summary.innerHTML = [
      ['Period ' + period, period + ' shell' + (period > 1 ? 's' : '')],
      [grpLabel, block + '-block'],
      ['Outer shell', valence + ' e⁻'],
      ['Shells', element.shells.join(' · ')]
    ].map(([k, v]) => '<span class="ep-atom-chip">' + k + ': ' + v + '</span>').join('');
  }
  if (bohrSvg) bohrSvg.classList.toggle('is-paused', atomPaused);
  if (atomModel === 'quantum') {
    setTextIfChanged(title, 'Quantum Cloud Model');
    bohrSvg.innerHTML = buildQuantumMarkup(element, color, isDarkTheme());
    setTextIfChanged(note, 'Simplified quantum mode: electron clouds show probability regions by shell count and periodic-table block, not fixed circular paths.');
    return;
  }
  setTextIfChanged(title, 'Electron Shell Model');
  bohrSvg.innerHTML = buildBohrMarkup(element.shells, color, element.electronegativity);
  setTextIfChanged(note, 'Simplified Bohr model: rings organize electrons by energy level (dashed ring = outer valence shell).');
}

function renderCrystal(element, color, token) {
  loadCrystalViewer().then((mod) => {
    if (token !== renderToken || selectedSymbol !== element.symbol) return;
    const host = document.getElementById('crystal-host');
    if (!host) return;
    if (!crystalViewer) crystalViewer = mod.mount(host);
    crystalViewer.setElement({
      symbol: element.symbol,
      name: element.name,
      number: element.number,
      color,
      mass: Number(element.mass),
      density: element.density,
      melt: element.melt,
      temp: currentTemp
    });
  }).catch(() => {});
}

function renderStats(element) {
  const state = getState(element, currentTemp);
  const stats = [
    { label: 'Current state', value: getStateLabel(state), sub: currentTemp + ' K · ' + formatStateText(element, currentTemp) },
    { label: 'Density', value: formatValue(element.density, ' g/cm³'), sub: 'Mass packed into a given volume.' },
    { label: 'Melting point', value: formatValue(element.melt, ' K', 0), sub: element.symbol === 'C' || element.symbol === 'As' ? 'Sublimes at 1 atm.' : 'Where the solid begins to loosen.' },
    { label: 'Boiling point', value: formatValue(element.boil, ' K', 0), sub: 'Where particles escape into gas.' },
    { label: 'Atomic radius', value: formatValue(element.radius, ' pm', 0), sub: 'Covalent radius in picometers.' },
    { label: '1st Ionization', value: formatValue(element.ionization, ' kJ/mol', 0), sub: 'Energy to remove an outer electron.' },
    { label: 'Electronegativity', value: formatValue(element.electronegativity, '', 2), sub: 'Higher values pull shared electrons harder.' },
    { label: 'Oxidation states', value: element.oxidation || '—', sub: 'Common bonding charges.' },
    { label: 'Scarcity index', value: Math.round(element.rarity * 100) + ' / 100', sub: 'Higher scores mean rarer or synthetic.' },
    { label: 'Electron shells', value: element.shells.join(' · '), sub: element.electronConfig || 'Shell population model' }
  ];

  const statsEl = document.getElementById('ep-stats');
  if (statsEl) {
    statsEl.innerHTML = stats.map((stat) =>
      '<div class="ep-stat"><span class="ep-stat-label">' + stat.label + '</span><span class="ep-stat-value">' + stat.value + '</span><span class="ep-stat-sub">' + stat.sub + '</span></div>'
    ).join('');
  }

  if (epCompareView) {
    if (compareMode && compareSymbol) {
      const other = elementsBySymbol.get(compareSymbol);
      if (other) {
        epCompareView.hidden = false;
        epCompareView.innerHTML = buildCompareTableHtml(element, other, currentTemp);
      } else {
        epCompareView.hidden = true;
        epCompareView.textContent = '';
      }
    } else {
      epCompareView.hidden = true;
      epCompareView.textContent = '';
    }
  }
}

function renderPortrait(element, token) {
  const host = document.getElementById('ep-portrait');
  if (!host) return;
  const rows = element.shells.map((count, index) =>
    '<div class="ep-shell-row"><span>Shell ' + (index + 1) + '</span>'
    + '<i aria-hidden="true" style="width:' + (100 * count / 32) + '%"></i>'
    + '<strong>' + count + '</strong></div>'
  ).join('');
  host.innerHTML = '<h3>Electrons by shell</h3>' + rows;

  loadImagesData().then((allImages) => {
    if (token !== renderToken || selectedSymbol !== element.symbol) return;
    const items = (allImages && allImages[element.symbol]) || [];
    const realItem = items.find((item) => item.k === 'real');
    if (!realItem) return;
    const oldFig = host.querySelector('figure');
    if (oldFig) oldFig.remove();
    host.insertAdjacentHTML('afterbegin', buildPhotoFigureHtml(realItem, 'ep-portrait'));
  }).catch(() => {});
}

function renderUsage(element) {
  const usageHost = document.getElementById('ep-usage');
  if (usageHost) {
    usageHost.innerHTML = element.applications.map((item) =>
      '<article class="ep-usage-item"><span class="ep-usage-icon">' + item.icon + '</span><span class="ep-usage-title">' + item.title + '</span><span class="ep-usage-copy">' + item.copy + '</span></article>'
    ).join('');
  }

  const storyHost = document.getElementById('ep-story');
  if (storyHost) {
    const story = ELEMENT_STORIES[element.symbol];
    if (!story) {
      storyHost.hidden = true;
      storyHost.textContent = '';
    } else {
      storyHost.hidden = false;
      storyHost.innerHTML = '<span class="ep-story-kicker">' + story.kicker + '</span>'
        + '<h3>' + story.title + '</h3>'
        + '<p>' + story.copy + '</p>'
        + '<a href="' + story.url + '" target="_blank" rel="noopener noreferrer">' + story.source + '</a>';
    }
  }

  const decayHost = document.getElementById('ep-decay');
  if (decayHost) {
    const z = element.number;
    const allUnstable = z === 43 || z === 61 || z >= 84;
    const special = {
      6: 'Carbon-14 is radioactive and is the basis of radiocarbon dating.',
      19: 'Potassium-40 is a naturally radioactive isotope inside your body and in bananas.'
    };
    if (!allUnstable && !special[z]) {
      decayHost.hidden = true;
      decayHost.textContent = '';
    } else {
      decayHost.hidden = false;
      decayHost.innerHTML = '<strong>☢ Radioactive decay</strong><br>'
        + (allUnstable ? 'Every isotope of ' + element.name + ' is unstable. ' : special[z] + ' ')
        + 'See how alpha, beta and gamma decay move an atom around this table in <a href="radioactive-decay.html">Radioactive Decay</a>.';
    }
  }
}

function ensureWorldLandSymbol(landPath) {
  if (document.getElementById('ep-world-land-sym')) return;
  let gridSvg = '';
  for (let lo = -150; lo <= 180; lo += 30) {
    const gx = (lo + 180) / 360 * 720;
    gridSvg += '<line x1="' + gx + '" y1="0" x2="' + gx + '" y2="360"/>';
  }
  for (let la = -60; la <= 60; la += 30) {
    const gy = (90 - la) / 180 * 360;
    gridSvg += '<line x1="0" y1="' + gy + '" x2="720" y2="' + gy + '"' + (la === 0 ? ' class="ep-map-eq"' : '') + '/>';
  }
  const defsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defsSvg.id = 'ep-world-defs';
  defsSvg.setAttribute('aria-hidden', 'true');
  defsSvg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  defsSvg.innerHTML = '<defs><symbol id="ep-world-land-sym" viewBox="0 0 720 360">'
    + '<g class="ep-map-grid">' + gridSvg + '</g>'
    + '<path class="ep-map-land" d="' + landPath + '"/>'
    + '</symbol></defs>';
  document.body.appendChild(defsSvg);
}

function ensureHistoryDom(host, landPath) {
  ensureWorldLandSymbol(landPath);
  if (historyDom) return historyDom;

  host.innerHTML =
    '<h3 class="ep-history-title">Where it was first discovered</h3>'
    + '<div class="ep-map-wrap">'
    + '<svg class="ep-map" viewBox="0 0 720 360" role="img" aria-label="World discovery map">'
    + '<metadata>Natural Earth v5.1.2, 1:50 million land, public domain.</metadata>'
    + '<use href="#ep-world-land-sym"/>'
    + '<g class="ep-ping-group">'
    + '<circle class="ep-ping-ring" cx="360" cy="180" r="7"/>'
    + '<circle class="ep-ping-ring r2" cx="360" cy="180" r="7"/>'
    + '<circle class="ep-ping-core" cx="360" cy="180" r="5.5"/>'
    + '</g>'
    + '<text class="ep-map-label" x="372" y="184" text-anchor="start"></text>'
    + '</svg>'
    + '</div>'
    + '<div class="ep-history-facts">'
    + '<div class="ep-history-fact"><span></span><strong></strong></div>'
    + '<div class="ep-history-fact"><span></span><strong></strong></div>'
    + '<div class="ep-history-fact"><span></span><strong></strong></div>'
    + '</div>'
    + '<div class="ep-history-text">'
    + '<h4>Before it had a name: ancient history and uses</h4><p></p>'
    + '<h4>Discovery and classification</h4><p></p>'
    + '</div>'
    + '<p class="ep-history-note"></p>';

  const facts = host.querySelectorAll('.ep-history-fact');
  const paras = host.querySelectorAll('.ep-history-text p');
  historyDom = {
    svg: host.querySelector('.ep-map'),
    pingGroup: host.querySelector('.ep-ping-group'),
    circles: Array.from(host.querySelectorAll('.ep-ping-group circle')),
    label: host.querySelector('.ep-map-label'),
    factLabels: Array.from(facts).map((f) => f.querySelector('span')),
    factValues: Array.from(facts).map((f) => f.querySelector('strong')),
    beforeP: paras[0],
    storyP: paras[1],
    noteP: host.querySelector('.ep-history-note')
  };
  return historyDom;
}

function renderHistory(element, token) {
  const host = document.getElementById('ep-history');
  if (!host) return;
  Promise.all([loadHistoryData(), loadWorldLandPath()]).then(([historyMap, landPath]) => {
    if (token !== renderToken || selectedSymbol !== element.symbol) return;
    const h = historyMap && historyMap[element.symbol];
    if (!h || !landPath) {
      host.hidden = true;
      return;
    }
    host.hidden = false;
    const dom = ensureHistoryDom(host, landPath);
    const [year, who, place, lat, lon, approx, before, story] = h;
    const pt = projectDiscoveryPoint(lat, lon);
    const color = catColor(element.cat, isDarkTheme());

    dom.svg.setAttribute('aria-label', 'World map with a marker at ' + place);
    dom.pingGroup.setAttribute('class', approx ? 'ep-ping-group ep-ping-approx' : 'ep-ping-group');
    dom.pingGroup.style.setProperty('--ping', color);
    dom.circles.forEach((c) => {
      c.setAttribute('cx', pt.x);
      c.setAttribute('cy', pt.y);
    });
    dom.label.setAttribute('x', String(pt.labelX));
    dom.label.setAttribute('y', String(pt.labelY));
    dom.label.setAttribute('text-anchor', pt.textAnchor);
    dom.label.textContent = element.symbol + ' · ' + year;

    const factData = [[approx ? 'Earliest use' : 'First found', year], ['By', who], ['Where', place]];
    factData.forEach(([k, v], i) => {
      dom.factLabels[i].textContent = k;
      dom.factValues[i].textContent = v;
    });
    dom.beforeP.textContent = before;
    dom.storyP.textContent = story;
    dom.noteP.textContent = approx
      ? 'Known since antiquity, so no single discovery moment exists. The ping marks a famous early source or the earliest well-documented use.'
      : 'The ping marks where the element was first identified or isolated as a distinct substance.';
  }).catch(() => {
    if (token === renderToken && selectedSymbol === element.symbol) host.hidden = true;
  });
}

function renderEarthAndSupply(element, token) {
  const earthHost = document.getElementById('ep-earth');
  if (earthHost) {
    const earth = element.earth;
    const activeSources = new Set(earth.sources || []);
    const sourceHtml = Object.entries(SOURCE_DEFS).map(([key, meta]) => {
      const active = activeSources.has(key);
      return '<span class="ep-source-pill' + (active ? ' is-active' : '') + '"><span class="ep-source-icon">' + SOURCE_ICONS[meta.icon] + '</span>' + meta.label + '</span>';
    }).join('');
    const flow = [
      ['Earth source', earth.occurrence],
      ['Common forms', (earth.forms || []).join('; ')],
      ['Production', earth.extraction],
      ['Role & context', earth.role || CATS[element.cat].label]
    ].map(([label, value]) => '<div class="ep-flow-step"><span class="ep-flow-label">' + label + '</span><span class="ep-flow-value">' + value + '</span></div>').join('');
    earthHost.innerHTML = '<h3 class="ep-earth-title">Where it is found on Earth</h3><div class="ep-source-grid">' + sourceHtml + '</div><div class="ep-flow">' + flow + '</div>';

    loadImagesData().then((allImages) => {
      if (token !== renderToken || selectedSymbol !== element.symbol) return;
      const items = (allImages && allImages[element.symbol]) || [];
      if (!items.length) return;
      const existing = earthHost.querySelector('.ep-media-note');
      if (existing) existing.remove();
      earthHost.insertAdjacentHTML('beforeend',
        '<div class="ep-media-note"><span>' + items.length + ' verified photo' + (items.length === 1 ? '' : 's') + ' available for ' + element.name + '.</span><button type="button" class="ep-photo-jump" id="ep-jump-photos">View photos →</button></div>'
      );
      const jumpBtn = document.getElementById('ep-jump-photos');
      if (jumpBtn) jumpBtn.addEventListener('click', () => setInspectorTab('photos'));
    }).catch(() => {});
  }

  const supplyHost = document.getElementById('ep-supply');
  if (supplyHost) {
    loadSupplyData().then(({ ELEMENT_SUPPLY, ELEMENT_SUPPLY_ASOF }) => {
      if (token !== renderToken || selectedSymbol !== element.symbol) return;
      const d = (ELEMENT_SUPPLY && ELEMENT_SUPPLY[element.symbol]) || {};
      const valid = (v) => v !== undefined && v !== null && v !== '' && (!Array.isArray(v) || v.length > 0);
      const fmtNum = (v, suffix) => (typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 7 }) : String(v)) + (suffix || '');
      const candidates = [
        ['Crustal abundance (ppm)', valid(d.crust) ? fmtNum(d.crust) : null],
        ['Recycling rate (%)', valid(d.recycling) ? fmtNum(d.recycling, '%') : null],
        ['Top 3 producers', valid(d.producers) ? d.producers.join(', ') : null],
        ['Production concentration', valid(d.prodConcentration) ? fmtNum(d.prodConcentration, '%') : null],
        ['Top 3 reserve holders', valid(d.reserveHolders) ? d.reserveHolders.join(', ') : null],
        ['Reserve concentration', valid(d.reserveDistribution) ? fmtNum(d.reserveDistribution, '%') : null]
      ].filter(([, v]) => v !== null);

      let bodyHtml = '';
      if (candidates.length) {
        bodyHtml += '<div class="ep-flow">' + candidates.map(([k, v]) => '<div class="ep-flow-step"><span class="ep-flow-label">' + k + '</span><span class="ep-flow-value">' + v + '</span></div>').join('') + '</div>';
      } else {
        const msg = (element.number >= 93 || element.number === 43 || element.number === 61)
          ? element.name + ' is synthesized in reactors or accelerators rather than mined as a natural commodity.'
          : 'No industrial mining commodity breakdown applies to ' + element.name + ' at crustal scale.';
        bodyHtml += '<div class="ep-media-note">' + msg + '</div>';
      }
      if (d.history) {
        bodyHtml += '<div class="ep-media-note"><strong>Through history:</strong> ' + d.history + '</div>';
      }
      if (candidates.length && ELEMENT_SUPPLY_ASOF) {
        bodyHtml += '<div class="ep-media-note">' + ELEMENT_SUPPLY_ASOF + '</div>';
      }
      supplyHost.innerHTML = '<h3 class="ep-earth-title">Supply and sustainability</h3>' + bodyHtml;
    }).catch(() => {});
  }
}

function renderGallery(element, token) {
  const host = document.getElementById('ep-gallery');
  if (!host) return;
  loadImagesData().then((allImages) => {
    if (token !== renderToken || selectedSymbol !== element.symbol) return;
    const items = (allImages && allImages[element.symbol]) || [];
    if (!items.length) {
      let reason = 'No verified photographic sample is on file for ' + element.name + ' yet.';
      if (element.number >= 93) {
        reason = 'Transuranic and superheavy elements are synthetic — created inside particle accelerators and nuclear reactors only atoms at a time. Many decay in fractions of a second, making direct macro photography impossible.';
      } else if ([43, 61, 84, 85, 87].includes(element.number)) {
        reason = element.name + ' is extremely rare and intensely radioactive with a short half-life, so visible bulk samples are rarely photographed safely.';
      } else if (element.cat === 'ng') {
        reason = element.name + ' is a colorless, odorless gas under ordinary room conditions and is typically observed in sealed discharge tubes or cryogenic tanks.';
      }
      host.hidden = false;
      host.innerHTML = '<h3 class="ep-gallery-title">Photos and pictures</h3>'
        + '<div class="ep-empty-card">'
        + '<span class="ep-empty-icon">📷</span>'
        + '<p><strong>' + element.name + ' (' + element.symbol + ')</strong></p>'
        + '<p>' + reason + '</p></div>';
      return;
    }
    host.hidden = false;
    host.innerHTML = '<h3 class="ep-gallery-title">Photos and pictures</h3><div class="ep-gallery-grid">'
      + items.map((it) => buildPhotoFigureHtml(it, 'ep-gallery')).join('')
      + '</div>';
  }).catch(() => {});
}

function getTabVersionKey(element, tabKey) {
  const dark = isDarkTheme() ? '1' : '0';
  if (tabKey === 'stats') return [element.symbol, currentTemp, compareMode ? compareSymbol : '', 'v1'].join('|');
  if (tabKey === 'atom') return [element.symbol, atomModel, dark].join('|');
  if (tabKey === 'crystal') return [element.symbol, currentTemp, dark].join('|');
  if (tabKey === 'history') return [element.symbol, dark].join('|');
  return element.symbol;
}

function renderActiveTab(element, force = false) {
  const tabKey = detailPanel.dataset.tabActive || 'stats';
  const version = getTabVersionKey(element, tabKey);
  if (!force && tabRenderKey.get(tabKey) === version) return;
  tabRenderKey.set(tabKey, version);

  const dark = isDarkTheme();
  const color = catColor(element.cat, dark);
  const token = renderToken;

  if (tabKey === 'stats') {
    setTextIfChanged(document.getElementById('ep-config'), element.electronConfig || element.shells.map((count, index) => 'Shell ' + (index + 1) + ': ' + count + 'e⁻').join(' · '));
    setTextIfChanged(document.getElementById('ep-desc'), element.summary || element.description);
    renderStats(element);
    renderPortrait(element, token);
  } else if (tabKey === 'atom') {
    renderAtomModel(element, color);
  } else if (tabKey === 'crystal') {
    renderCrystal(element, color, token);
  } else if (tabKey === 'uses') {
    renderUsage(element);
  } else if (tabKey === 'earth') {
    renderEarthAndSupply(element, token);
  } else if (tabKey === 'history') {
    renderHistory(element, token);
  } else if (tabKey === 'photos') {
    renderGallery(element, token);
  }
}

function showElement(element, shouldScroll) {
  ensureSecondaryUi();
  const prevSymbol = selectedSymbol;
  selectedSymbol = element.symbol;
  if (prevSymbol !== element.symbol) {
    renderToken++;
    tabRenderKey.clear();
  }

  const dark = isDarkTheme();
  const state = getState(element, currentTemp);
  const color = catColor(element.cat, dark);
  const badgeBg = catColor(element.cat, dark, true);

  setTextIfChanged(document.getElementById('ep-crystal-tag'), element.crystal.label);
  const symEl = document.getElementById('ep-sym');
  setTextIfChanged(symEl, element.symbol);
  if (symEl) symEl.style.color = color;
  setTextIfChanged(document.getElementById('ep-name'), element.name);
  setTextIfChanged(document.getElementById('ep-num'), element.number);
  setTextIfChanged(document.getElementById('ep-mass'), element.mass);

  const badgeEl = document.getElementById('ep-badge');
  setTextIfChanged(badgeEl, CATS[element.cat].label);
  if (badgeEl) {
    badgeEl.style.background = badgeBg;
    badgeEl.style.color = readableInkColor(badgeBg);
  }
  setTextIfChanged(document.getElementById('ep-state'), getStateLabel(state) + ' at ' + currentTemp + ' K');

  if (epPrev && epNext) {
    const prevEl = elementsByNumber.get(element.number - 1);
    const nextEl = elementsByNumber.get(element.number + 1);
    if (prevEl) {
      epPrev.disabled = false;
      setTextIfChanged(epPrev, '← ' + prevEl.symbol + ' (' + prevEl.number + ')');
      epPrev.title = 'Previous element: ' + prevEl.name + ' (' + prevEl.number + ')';
    } else {
      epPrev.disabled = true;
      setTextIfChanged(epPrev, '← Prev');
      epPrev.title = 'First element';
    }
    if (nextEl) {
      epNext.disabled = false;
      setTextIfChanged(epNext, nextEl.symbol + ' (' + nextEl.number + ') →');
      epNext.title = 'Next element: ' + nextEl.name + ' (' + nextEl.number + ')';
    } else {
      epNext.disabled = true;
      setTextIfChanged(epNext, 'Next →');
      epNext.title = 'Last element';
    }
  }

  if (!detailPanel.classList.contains('ep-open')) {
    detailPanel.classList.add('ep-open');
  }
  renderActiveTab(element, true);
  updateGrid();
  if (shouldScroll) detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closePanel() {
  selectedSymbol = null;
  detailPanel.classList.remove('ep-open');
  updateGrid();
}

/* ── Temperature & State Counts ──────────────────────── */
function updateStateCounts() {
  const counts = countStates(elements, currentTemp);
  if (stateCounts) {
    setTextIfChanged(stateCounts, counts.solid + 'S · ' + counts.liquid + 'L · ' + counts.gas + 'G');
    stateCounts.title = counts.solid + ' solid, ' + counts.liquid + ' liquid, ' + counts.gas + ' gas, ' + counts.unknown + ' predicted';
  }
  if (tempCounts) {
    tempCounts.innerHTML =
      '<span class="pt-temp-count-chip is-solid"><i></i>' + counts.solid + ' Solid</span>'
      + '<span class="pt-temp-count-chip is-liquid"><i></i>' + counts.liquid + ' Liquid</span>'
      + '<span class="pt-temp-count-chip is-gas"><i></i>' + counts.gas + ' Gas</span>'
      + (counts.unknown ? '<span class="pt-temp-count-chip is-unknown"><i></i>' + counts.unknown + ' Predicted</span>' : '');
  }
}

function renderTemperatureReadout() {
  setTextIfChanged(tempReadout, currentTemp + ' K');
  if (tempInput) tempInput.value = String(currentTemp);
  if (quickTemp) quickTemp.value = String(currentTemp);
  setTextIfChanged(quickTempBtn, currentTemp + ' K');
  setTextIfChanged(tempStateReadout, getStateSubtitle(currentTemp));

  if (tempEquiv) {
    const c = Math.round(currentTemp - 273.15);
    const f = Math.round((currentTemp - 273.15) * 9 / 5 + 32);
    setTextIfChanged(tempEquiv, c + ' °C · ' + f + ' °F');
  }

  tempChips.forEach((chip) => {
    const target = Number(chip.dataset.temp);
    chip.classList.toggle('is-active', Math.abs(currentTemp - target) <= 1);
  });
  updateStateCounts();
}

function onTemperatureChange(nextTemp) {
  ensureSecondaryUi();
  currentTemp = Math.max(0, Math.min(4000, Number(nextTemp) || 0));
  renderTemperatureReadout();
  updateGrid();
  if (selectedSymbol) {
    const el = elementsBySymbol.get(selectedSymbol);
    if (el) {
      const state = getState(el, currentTemp);
      setTextIfChanged(document.getElementById('ep-state'), getStateLabel(state) + ' at ' + currentTemp + ' K');
      renderActiveTab(el);
    }
  }
}

/* ── Command Palette ─────────────────────────────────── */
function updateCommandSelection() {
  const domItems = commandList.querySelectorAll('.pt-command-item');
  domItems.forEach((btn, idx) => {
    const isSel = idx === commandSelectedIndex;
    btn.classList.toggle('is-focused', isSel);
    if (isSel) btn.scrollIntoView({ block: 'nearest' });
  });
}

function renderCommandList(filter) {
  const needle = String(filter || '').trim().toLowerCase();
  const items = searchCommands(elements, filter, currentTemp);

  lastRenderedCommandItems = items;
  commandSelectedIndex = items.length ? 0 : -1;

  if (!items.length) {
    commandList.innerHTML = '<div class="pt-command-empty">No results found for “' + escapeHtml(needle) + '”. Try an element name, symbol (Fe), atomic number (26), or topic (batteries, chips).</div>';
    return;
  }

  commandList.innerHTML = items.map((item, idx) => {
    if (item.type === 'element') {
      return '<button class="pt-command-item is-element' + (idx === 0 ? ' is-focused' : '') + '" type="button" data-cmd-idx="' + idx + '">'
        + '<span class="pt-cmd-badge" style="background:' + item.color + '">' + item.symbol + '</span>'
        + '<div><strong>' + item.title + '</strong><small>' + item.subtitle + '</small></div></button>';
    }
    return '<button class="pt-command-item' + (idx === 0 ? ' is-focused' : '') + '" type="button" data-cmd-idx="' + idx + '">'
      + '<strong>' + (item.type === 'category' ? '🏷️ ' : '🔬 ') + item.title + '</strong><small>' + item.subtitle + '</small></button>';
  }).join('');
}

function openCommandPalette() {
  ensureSecondaryUi();
  commandRoot.classList.add('is-open');
  commandRoot.setAttribute('aria-hidden', 'false');
  commandInput.value = '';
  renderCommandList('');
  setTimeout(() => commandInput.focus(), 0);
}

function closeCommandPalette() {
  commandRoot.classList.remove('is-open');
  commandRoot.setAttribute('aria-hidden', 'true');
}

function applyCommand(label) {
  const command = COMMANDS.find((entry) => entry.label === label);
  if (!command) return;
  commandMatches = new Set(command.symbols);
  setTextIfChanged(commandStatus, 'Command "' + command.label + '" highlighting ' + command.symbols.join(', ') + '.');
  const lead = elements.find((entry) => commandMatches.has(entry.symbol));
  closeCommandPalette();
  updateGrid();
  if (lead) showElement(lead, true);
}

function clearCommandHighlight() {
  commandMatches = new Set();
  setTextIfChanged(commandStatus, 'Try “batteries”, “balloons”, or “chips”.');
  updateGrid();
}

function executeCommandItem(item) {
  if (!item) return;
  closeCommandPalette();
  if (item.type === 'element') {
    const el = elementsBySymbol.get(item.symbol);
    if (el) {
      showElement(el, true);
      const entry = cellBySymbol.get(el.symbol);
      if (entry) entry.cell.focus({ preventScroll: true });
    }
  } else if (item.type === 'category') {
    activeCat = item.cat;
    renderAll();
  } else if (item.type === 'topic') {
    applyCommand(item.command);
  }
}

/* ── Inspector Tabs & Compare Mode ───────────────────── */
function setInspectorTab(key) {
  detailPanel.dataset.tabActive = key;
  detailPanel.querySelectorAll('.ep-tab-btn').forEach((btn) => {
    setAttrIfChanged(btn, 'aria-selected', btn.dataset.tabKey === key ? 'true' : 'false');
  });
  if (selectedSymbol) {
    const cur = elementsBySymbol.get(selectedSymbol);
    if (cur) renderActiveTab(cur);
  }
}

function buildInspectorTabs() {
  const tabs = [['stats', 'Stats'], ['crystal', 'Crystal'], ['atom', 'Atom'], ['uses', 'Uses'], ['earth', 'Earth & supply'], ['history', 'History'], ['photos', 'Photos']];
  const bar = document.createElement('div');
  bar.className = 'ep-tabs'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'Element detail sections');
  tabs.forEach(([key, label]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ep-tab-btn'; b.textContent = label; b.dataset.tabKey = key;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', key === 'stats' ? 'true' : 'false');
    b.addEventListener('click', () => setInspectorTab(key));
    bar.appendChild(b);
  });
  bar.addEventListener('keydown', (event) => {
    const buttons = Array.from(bar.querySelectorAll('.ep-tab-btn'));
    const index = buttons.indexOf(document.activeElement);
    if (index === -1) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const next = buttons[(index + 1) % buttons.length];
      next.focus(); next.click();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const prev = buttons[(index - 1 + buttons.length) % buttons.length];
      prev.focus(); prev.click();
    } else if (event.key === 'Home') {
      event.preventDefault();
      buttons[0].focus(); buttons[0].click();
    } else if (event.key === 'End') {
      event.preventDefault();
      buttons[buttons.length - 1].focus(); buttons[buttons.length - 1].click();
    }
  });
  detailPanel.insertBefore(bar, detailPanel.firstChild);
}

function populateCompareSelect() {
  if (!epCompareSelect || compareSelectReady) return;
  epCompareSelect.innerHTML = '<option value="">Choose an element to compare…</option>'
    + elements.map((e) => '<option value="' + e.symbol + '">' + e.number + '. ' + e.name + ' (' + e.symbol + ')</option>').join('');
  compareSelectReady = true;
}

function initCompareMode() {
  if (!epCompareSelect) return;

  if (epCompareBtn) {
    epCompareBtn.addEventListener('click', () => {
      ensureSecondaryUi();
      populateCompareSelect();
      compareMode = !compareMode;
      epCompareBtn.classList.toggle('is-active', compareMode);
      setAttrIfChanged(epCompareBtn, 'aria-expanded', compareMode ? 'true' : 'false');
      if (epCompareTray) epCompareTray.hidden = !compareMode;
      if (compareMode) {
        setInspectorTab('stats');
        if (!compareSymbol && selectedSymbol) {
          const cur = elementsBySymbol.get(selectedSymbol);
          const partner = elements.find((e) => e.col === cur.col && e.number !== cur.number)
            || elementsByNumber.get(cur.number === 118 ? 1 : cur.number + 1);
          if (partner) {
            compareSymbol = partner.symbol;
            epCompareSelect.value = partner.symbol;
          }
        }
      }
      updateGrid();
      if (selectedSymbol) {
        const cur = elementsBySymbol.get(selectedSymbol);
        if (cur) renderStats(cur);
      }
    });
  }

  epCompareSelect.addEventListener('change', (event) => {
    compareSymbol = event.target.value || null;
    updateGrid();
    if (selectedSymbol) {
      const cur = elementsBySymbol.get(selectedSymbol);
      if (cur) renderStats(cur);
    }
  });

  if (epCompareSwap) {
    epCompareSwap.addEventListener('click', () => {
      if (!selectedSymbol || !compareSymbol) return;
      const prevPrimary = selectedSymbol;
      const nextPrimary = elementsBySymbol.get(compareSymbol);
      if (!nextPrimary) return;
      compareSymbol = prevPrimary;
      epCompareSelect.value = prevPrimary;
      showElement(nextPrimary, false);
    });
  }

  if (epCompareClose) {
    epCompareClose.addEventListener('click', () => {
      compareMode = false;
      compareSymbol = null;
      if (epCompareBtn) {
        epCompareBtn.classList.remove('is-active');
        setAttrIfChanged(epCompareBtn, 'aria-expanded', 'false');
      }
      if (epCompareTray) epCompareTray.hidden = true;
      updateGrid();
      if (selectedSymbol) {
        const cur = elementsBySymbol.get(selectedSymbol);
        if (cur) renderStats(cur);
      }
    });
  }
}

/* ── Filters, Controls & RenderAll ───────────────────── */
function clearAllFilters() {
  activeCat = 'all';
  isolatedCat = null;
  searchQ = '';
  if (searchInput) searchInput.value = '';
  if (quickSearch) quickSearch.value = '';
  commandMatches = new Set();
  if (commandStatus) setTextIfChanged(commandStatus, 'Try “batteries”, “balloons”, or “chips”.');
  if (finderLens !== 'practice') {
    finderLens = null;
    finderItem = null;
  }
  patternFilter = null;
  renderAll();
}

function renderAll() {
  ensureSecondaryUi();
  renderCategoryControls();
  renderLegend();
  renderHeatmapControls();
  renderTemperatureReadout();
  renderFinder();
  updateGrid();
  if (selectedSymbol) {
    const element = elementsBySymbol.get(selectedSymbol);
    if (element) showElement(element, false);
  }
}

function ensureSecondaryUi() {
  if (secondaryUiReady) return;
  secondaryUiReady = true;
  renderCategoryControls();
  renderHeatmapControls();
  renderTemperatureReadout();
  renderFinder();
}

function ensureDefaultSelection() {
  if (isSideBySide() && !selectedSymbol && elements.length) {
    showElement(elementsBySymbol.get('Fe') || elements[0], false);
  }
}

function syncSearchQuery(value, sourceEl) {
  ensureSecondaryUi();
  searchQ = String(value || '').toLowerCase().trim();
  if (searchInput && sourceEl !== searchInput) searchInput.value = value;
  if (quickSearch && sourceEl !== quickSearch) quickSearch.value = value;
  if (!searchQ && commandMatches.size) clearCommandHighlight();
  updateGrid();
}

/* ── Event Listeners ─────────────────────────────────── */
if (lensReset) {
  lensReset.addEventListener('click', () => {
    activeHeatmap = 'none';
    renderAll();
  });
}

grid.addEventListener('keydown', (event) => {
  const target = event.target.closest('.el');
  if (!target) return;
  const currentZ = Number(target.dataset.z);
  const currentEl = elementsByNumber.get(currentZ);
  if (!currentEl) return;

  let nextEl = null;
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    const rowNext = elements.filter((e) => e.row === currentEl.row && e.col > currentEl.col).sort((a, b) => a.col - b.col);
    nextEl = rowNext[0] || elementsByNumber.get(currentZ + 1);
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    const rowPrev = elements.filter((e) => e.row === currentEl.row && e.col < currentEl.col).sort((a, b) => b.col - a.col);
    nextEl = rowPrev[0] || elementsByNumber.get(currentZ - 1);
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    const colDown = elements.filter((e) => e.col === currentEl.col && e.row > currentEl.row).sort((a, b) => a.row - b.row);
    nextEl = colDown[0];
    if (!nextEl) {
      const candidates = elements.filter((e) => e.row > currentEl.row);
      if (candidates.length) {
        nextEl = candidates.reduce((best, cur) => {
          const dCur = Math.abs(cur.col - currentEl.col) + (cur.row - currentEl.row) * 2;
          const dBest = Math.abs(best.col - currentEl.col) + (best.row - currentEl.row) * 2;
          return dCur < dBest ? cur : best;
        });
      }
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    const colUp = elements.filter((e) => e.col === currentEl.col && e.row < currentEl.row).sort((a, b) => b.row - a.row);
    nextEl = colUp[0];
    if (!nextEl) {
      const candidates = elements.filter((e) => e.row < currentEl.row);
      if (candidates.length) {
        nextEl = candidates.reduce((best, cur) => {
          const dCur = Math.abs(cur.col - currentEl.col) + (currentEl.row - cur.row) * 2;
          const dBest = Math.abs(best.col - currentEl.col) + (currentEl.row - best.row) * 2;
          return dCur < dBest ? cur : best;
        });
      }
    }
  } else if (event.key === 'Home') {
    event.preventDefault();
    const rowEls = elements.filter((e) => e.row === currentEl.row).sort((a, b) => a.col - b.col);
    nextEl = rowEls[0];
  } else if (event.key === 'End') {
    event.preventDefault();
    const rowEls = elements.filter((e) => e.row === currentEl.row).sort((a, b) => b.col - a.col);
    nextEl = rowEls[0];
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    showElement(currentEl, true);
    return;
  }

  if (nextEl) {
    showElement(nextEl, false);
    const entry = cellBySymbol.get(nextEl.symbol);
    if (entry) entry.cell.focus({ preventScroll: true });
  }
});

if (epPrev) {
  epPrev.addEventListener('click', () => {
    const curr = elementsBySymbol.get(selectedSymbol);
    if (curr && curr.number > 1) {
      const prev = elementsByNumber.get(curr.number - 1);
      if (prev) {
        showElement(prev, false);
        const entry = cellBySymbol.get(prev.symbol);
        if (entry) entry.cell.focus({ preventScroll: true });
      }
    }
  });
}

if (epNext) {
  epNext.addEventListener('click', () => {
    const curr = elementsBySymbol.get(selectedSymbol);
    if (curr && curr.number < 118) {
      const next = elementsByNumber.get(curr.number + 1);
      if (next) {
        showElement(next, false);
        const entry = cellBySymbol.get(next.symbol);
        if (entry) entry.cell.focus({ preventScroll: true });
      }
    }
  });
}

tempChips.forEach((chip) => {
  chip.addEventListener('click', () => onTemperatureChange(Number(chip.dataset.temp)));
});
if (tempInput) tempInput.addEventListener('input', (e) => onTemperatureChange(e.target.value));
if (quickTemp) quickTemp.addEventListener('input', (e) => onTemperatureChange(e.target.value));
if (quickTempBtn) quickTempBtn.addEventListener('click', () => onTemperatureChange(295));

[searchInput, quickSearch].forEach((inputEl) => {
  if (!inputEl) return;
  inputEl.addEventListener('input', (event) => syncSearchQuery(event.target.value, inputEl));
  inputEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const filterOpts = { activeCat, searchQ, patternFilter };
      const firstMatch = elements.find((e) => matchesFilters(e, filterOpts));
      if (firstMatch) {
        showElement(firstMatch, true);
        const entry = cellBySymbol.get(firstMatch.symbol);
        if (entry) entry.cell.focus({ preventScroll: true });
      }
    } else if (event.key === 'Escape') {
      syncSearchQuery('', null);
    }
  });
});

if (quickLens) {
  quickLens.addEventListener('change', (event) => {
    activeHeatmap = event.target.value || 'none';
    renderAll();
  });
}
if (quickCmd) quickCmd.addEventListener('click', openCommandPalette);
if (quickControls) {
  quickControls.addEventListener('click', () => {
    ensureSecondaryUi();
    if (window.LessonLayout && typeof window.LessonLayout.openPanel === 'function') {
      window.LessonLayout.openPanel(true);
    }
  });
}

atomModelButtons.forEach((button) => {
  button.addEventListener('click', () => {
    atomModel = button.dataset.atomModel || 'bohr';
    if (selectedSymbol) {
      const element = elementsBySymbol.get(selectedSymbol);
      if (element) renderAtomModel(element, catColor(element.cat, isDarkTheme()));
    } else {
      atomModelButtons.forEach((entry) => setAttrIfChanged(entry, 'aria-pressed', entry === button ? 'true' : 'false'));
    }
  });
});

if (atomMotionBtn) {
  atomMotionBtn.addEventListener('click', () => {
    atomPaused = !atomPaused;
    setAttrIfChanged(atomMotionBtn, 'aria-pressed', atomPaused ? 'true' : 'false');
    setTextIfChanged(atomMotionBtn, atomPaused ? 'Play' : 'Pause');
    if (bohrSvg) bohrSvg.classList.toggle('is-paused', atomPaused);
  });
}

const epCloseBtn = document.getElementById('ep-close');
if (epCloseBtn) epCloseBtn.addEventListener('click', closePanel);
commandOpen.addEventListener('click', openCommandPalette);
commandClose.addEventListener('click', closeCommandPalette);
commandBackdrop.addEventListener('click', closeCommandPalette);
commandInput.addEventListener('input', (event) => renderCommandList(event.target.value));
commandInput.addEventListener('keydown', (event) => {
  if (!lastRenderedCommandItems.length) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    commandSelectedIndex = (commandSelectedIndex + 1) % lastRenderedCommandItems.length;
    updateCommandSelection();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    commandSelectedIndex = (commandSelectedIndex - 1 + lastRenderedCommandItems.length) % lastRenderedCommandItems.length;
    updateCommandSelection();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (commandSelectedIndex >= 0 && commandSelectedIndex < lastRenderedCommandItems.length) {
      executeCommandItem(lastRenderedCommandItems[commandSelectedIndex]);
    }
  }
});
commandList.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-cmd-idx]');
  if (btn) {
    const idx = Number(btn.dataset.cmdIdx);
    if (lastRenderedCommandItems[idx]) executeCommandItem(lastRenderedCommandItems[idx]);
  }
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    event.stopImmediatePropagation();
    openCommandPalette();
  }
}, true);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (event.defaultPrevented || document.querySelector('.plb.plb-open')) return;
    if (commandRoot.classList.contains('is-open')) closeCommandPalette();
    else if (selectedSymbol && !isSideBySide()) closePanel();
    return;
  }
  const tag = (event.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (event.key === '[' || event.key === ']') {
    event.preventDefault();
    const curr = elementsBySymbol.get(selectedSymbol) || elements[0];
    const nextZ = event.key === ']' ? curr.number + 1 : curr.number - 1;
    const targetEl = elementsByNumber.get(nextZ);
    if (targetEl) {
      showElement(targetEl, false);
      const entry = cellBySymbol.get(targetEl.symbol);
      if (entry) entry.cell.focus({ preventScroll: true });
    }
  }
});

/* ── Breakpoint & Theme Observers (debounced, loop-free) ─ */
let lastSideBySide = null;
if (pageEl && typeof ResizeObserver === 'function') {
  new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect?.width ?? pageEl.clientWidth;
    const next = width >= 1040;
    if (next === lastSideBySide) return;
    lastSideBySide = next;
    if (next && !selectedSymbol) ensureDefaultSelection();
  }).observe(pageEl);
}

let lastDark = isDarkTheme();
let themeRaf = 0;
function applyThemeRefresh() {
  themeRaf = 0;
  const dark = isDarkTheme();
  if (dark === lastDark) return;
  lastDark = dark;

  if (secondaryUiReady) renderCategoryControls();
  renderLegend();
  updateGrid();

  if (selectedSymbol && detailPanel.classList.contains('ep-open')) {
    const cur = elementsBySymbol.get(selectedSymbol);
    if (cur) {
      const color = catColor(cur.cat, dark);
      const symEl = document.getElementById('ep-sym');
      if (symEl) symEl.style.color = color;
      const activeTab = detailPanel.dataset.tabActive || 'stats';
      if (activeTab === 'atom') {
        renderAtomModel(cur, color);
      } else if (activeTab === 'crystal') {
        renderCrystal(cur, color, renderToken);
      } else if (activeTab === 'history' && historyDom) {
        historyDom.pingGroup.style.setProperty('--ping', color);
      }
    }
  }
}

function scheduleThemeRefresh() {
  if (themeRaf) return;
  themeRaf = window.requestAnimationFrame(applyThemeRefresh);
}

window.addEventListener('classroomos:lightingchange', scheduleThemeRefresh);
window.addEventListener('classroomos:themechange', scheduleThemeRefresh);
new MutationObserver(scheduleThemeRefresh).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-lighting', 'data-theme']
});

if (detailPanel && typeof IntersectionObserver === 'function') {
  new IntersectionObserver((entries) => {
    detailPanel.classList.toggle('is-offscreen', !entries[0].isIntersecting);
  }, { rootMargin: '200px 0px' }).observe(detailPanel);
}

async function loadReferenceData() {
  const hasLocal = Object.keys(ELEMENT_PROPERTIES || {}).length >= 118;
  if (hasLocal && dataNote) {
    setTextIfChanged(dataNote, 'Verified property tables active (offline-ready).');
    dataNote.classList.add('is-ready');
  }
  try {
    const response = await fetch(PROPERTY_SOURCE_URL, { cache: 'force-cache' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const json = await response.json();
    propertyRefBySymbol = simplifyRemoteData(json);
    try { localStorage.setItem(PROPERTY_CACHE_KEY, JSON.stringify(propertyRefBySymbol)); } catch (error) {}
    if (dataNote) {
      setTextIfChanged(dataNote, hasLocal
        ? 'Verified property tables active (with extended lab descriptions).'
        : 'Lab property data loaded.');
      dataNote.classList.add('is-ready');
    }
    elements = buildElements(ELEMENT_PROPERTIES, propertyRefBySymbol);
    indexElements();
    if (selectedSymbol) {
      const cur = elementsBySymbol.get(selectedSymbol);
      if (cur) {
        tabRenderKey.delete('stats');
        if ((detailPanel.dataset.tabActive || 'stats') === 'stats') {
          setTextIfChanged(document.getElementById('ep-desc'), cur.summary || cur.description);
        }
      }
    }
  } catch (error) {
    if (!hasLocal && !Object.keys(propertyRefBySymbol).length && dataNote) {
      setTextIfChanged(dataNote, 'Core lesson mode active.');
      dataNote.classList.remove('is-ready');
    }
  }
}

/* ── Boot sequence: grid first, default panel & remote sync at idle ── */
buildInspectorTabs();
initCompareMode();
buildGridOnce();
updateGrid();
updateStateCounts();
renderLegend();

runWhenIdle(() => {
  ensureSecondaryUi();
  ensureDefaultSelection();
}, 150);

runWhenIdle(() => {
  loadReferenceData();
}, 2500);
