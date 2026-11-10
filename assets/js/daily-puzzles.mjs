// Home-page daily puzzles (#home-puzzles): crossword, sudoku, Daily Double, chess, and
// Sokoban, new every day, generated in the browser from the date (see daily-puzzles-core.mjs
// and daily-sokoban-core.mjs).
// Progress lives in one localStorage key; nothing leaves the browser.

import {
  dayKey, parseDayKey, shiftDayKey, makeSudoku, makeCrossword, sudokuConflicts, entryCells, PEERS,
  makeDailyDouble, makeDailyChess, STEAM_CATEGORIES, DOUBLE_JEOPARDY_VALUES
} from './daily-puzzles-core.mjs';
import { Chess } from '../vendor/chess.min.mjs';
import * as Soko from './daily-sokoban-core.mjs';

const STORE_KEY = 'classroomos:puzzles:v1';
const CONTENT_VERSION = 2;
const KEEP_DAYS = 60;
const BACK_DAYS = 30;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// ── storage ──────────────────────────────────────────────────────────────
function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if (raw && typeof raw === 'object' && raw.days) {
      if (raw.contentVersion !== CONTENT_VERSION) {
        // The question rotation changed. Keep Sudoku, whose grid did not.
        for (const day of Object.values(raw.days)) {
          delete day.cross;
          delete day.double;
        }
        raw.contentVersion = CONTENT_VERSION;
        saveStore(raw);
      }
      return raw;
    }
  } catch { /* private mode or corrupt: start fresh */ }
  return { days: {}, tab: 'crossword', contentVersion: CONTENT_VERSION };
}

function saveStore(store) {
  try {
    const keys = Object.keys(store.days).sort();
    for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete store.days[k];
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch { /* storage full or blocked: play on without saving */ }
}

const el = (tag, attrs = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids) if (kid != null) node.append(kid);
  return node;
};

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function longDate(key) {
  return parseDayKey(key).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// Fixed, trusted icon markup for the game switcher (never user text).
const ICONS = {
  crossword: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18" stroke="currentColor" stroke-width="1.4"/><path d="M3.9 3.9h5.1v5.1H3.9zM15 15h5.1v5.1H15zM9 9h6v6H9z" fill="currentColor"/></svg>',
  sudoku: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18" stroke="currentColor" stroke-width="1" opacity=".55"/><text x="12" y="16.1" text-anchor="middle" font-size="9" font-weight="700" font-family="IBM Plex Sans, system-ui, sans-serif" fill="currentColor">7</text></svg>',
  'daily-double': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2 4.5 13.6h6.3L9.6 22l9.9-12.4h-6.6z" fill="currentColor"/></svg>',
  sokoban: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.8 4.8l14.4 14.4M19.2 4.8 4.8 19.2" stroke="currentColor" stroke-width="1.6"/><path d="M4 9.5h16M4 14.5h16" stroke="currentColor" stroke-width="1" opacity=".5"/></svg>',
  chess: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 20.5h11.5v-1.8c0-4.3-1.2-8-3.3-10.6l.9-3.1-2.8 1.5C11.7 5.2 9.6 6 8.2 7.7L5.4 11c-.6.8-.4 1.9.4 2.4l.7.4c.7.4 1.6.3 2.1-.3l1.3-1.4c.4 1.5-.4 3.1-1.8 4.5C7.2 17.5 7 18.8 7 20.5z" fill="currentColor"/><circle cx="10.3" cy="9.3" r="1" fill="var(--dp-icon-eye, #fff)"/></svg>'
};
const icon = (name) => { const s = el('span', { class: 'dp-ico', 'aria-hidden': 'true' }); s.innerHTML = ICONS[name]; return s; };

// A slim bar under each game's meta row; `set(done, total)` updates it.
function progressBar(label) {
  const fill = el('i');
  const node = el('div', { class: 'dp-progress', role: 'progressbar', 'aria-label': label, 'aria-valuemin': '0' }, fill);
  return {
    node,
    set(done, total) {
      node.setAttribute('aria-valuemax', String(total));
      node.setAttribute('aria-valuenow', String(done));
      fill.style.setProperty('--p', total ? (done / total).toFixed(4) : 0);
    }
  };
}

// Status line with a tone: '' (info), 'good', 'bad'.
function sayTo(node, msg, tone = '') {
  node.textContent = msg;
  node.dataset.tone = msg ? tone : '';
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// One-shot confetti over the widget when a puzzle is solved. Removes itself after ~2 s.
function celebrate(host) {
  if (!host || reducedMotion()) return;
  const box = host.getBoundingClientRect();
  if (!box.width) return;
  const canvas = el('canvas', { class: 'dp-confetti', 'aria-hidden': 'true' });
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(box.height * dpr);
  host.append(canvas);
  const ctx = canvas.getContext('2d');
  const accent = getComputedStyle(host).getPropertyValue('--dp-accent').trim() || '#0071e3';
  const colors = [accent, '#f59e0b', '#10b981', '#ec4899', '#38bdf8', '#a855f7'];
  const bits = Array.from({ length: 90 }, (_, i) => ({
    x: box.width * (0.2 + Math.random() * 0.6), y: box.height * 0.32,
    vx: (Math.random() - 0.5) * 520, vy: -260 - Math.random() * 420,
    w: 5 + Math.random() * 6, h: 3 + Math.random() * 5,
    a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 14,
    c: colors[i % colors.length]
  }));
  let last = performance.now(); const end = last + 2000;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.width, box.height);
    ctx.globalAlpha = Math.max(0, Math.min(1, (end - now) / 600));
    for (const b of bits) {
      b.vy += 900 * dt; b.vx *= 0.985; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
      ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.a * 1.7)) + 1);
      ctx.restore();
    }
    if (now < end && canvas.isConnected) requestAnimationFrame(frame); else canvas.remove();
  };
  requestAnimationFrame(frame);
}

// Re-trigger a CSS animation class on a node (letter/digit pop, solve cascade).
function replay(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

// ── the widget ───────────────────────────────────────────────────────────
function mount(root, bank, doubleBank, chessBank) {
  const app = root.querySelector('[data-dp-app]');
  const store = loadStore();
  const today = dayKey(new Date());
  const validTabs = ['crossword', 'sudoku', 'daily-double', 'chess', 'sokoban'];
  const state = { key: today, tab: validTabs.includes(store.tab) ? store.tab : 'crossword' };
  const cache = new Map();

  const dayState = (key) => (store.days[key] ||= {});
  const persist = () => saveStore(store);

  function puzzlesFor(key) {
    if (!cache.has(key)) {
      cache.set(key, {
        cw: makeCrossword(key, bank),
        su: makeSudoku(key),
        dd: makeDailyDouble(key, doubleBank),
        ch: makeDailyChess(key, chessBank),
        // The warehouse search is the slowest generator (up to ~150 ms on a Saturday), so it
        // only runs when someone opens the Sokoban tab.
        get sk() { return (this._sk ||= Soko.makeSokoban(key)); }
      });
    }
    return cache.get(key);
  }

  const isDone = (key, which) => !!(store.days[key] && store.days[key][which] && store.days[key][which].done);
  // A day counts toward the streak when a puzzle was solved without "Reveal all".
  const counts = (key, which) => isDone(key, which) && !store.days[key][which].gaveUp;
  const played = (key) => counts(key, 'cross') || counts(key, 'sudoku') || counts(key, 'double') || counts(key, 'chess') || counts(key, 'soko');
  function streak() {
    let n = 0, k = played(today) ? today : shiftDayKey(today, -1);
    while (played(k)) { n++; k = shiftDayKey(k, -1); }
    return n;
  }

  // chrome: date nav + tabs + streak
  const dateLabel = el('strong', { class: 'dp-date', 'aria-live': 'polite' });
  const prevBtn = el('button', { type: 'button', class: 'dp-daybtn', 'aria-label': 'Previous day', text: '‹' });
  const nextBtn = el('button', { type: 'button', class: 'dp-daybtn', 'aria-label': 'Next day', text: '›' });
  const todayBtn = el('button', { type: 'button', class: 'dp-btn dp-btn--text', text: 'Today' });
  const streakEl = el('span', { class: 'dp-streak', hidden: true });
  const makeTab = (id, full, short, sub) => el('button', { type: 'button', role: 'tab', id: `dp-tab-${id}`, class: `dp-tab dp-tab--${id}`, 'aria-controls': 'dp-panel' },
    el('span', { class: 'dp-tab-icon' }, icon(id), el('i', { class: 'dp-tick', 'aria-hidden': 'true', text: '✓' })),
    el('span', { class: 'dp-tab-text' },
      el('span', { class: 'dp-tab-full', text: full }),
      el('span', { class: 'dp-tab-short', text: short }),
      el('small', { class: 'dp-tab-sub', text: sub })));
  const tabCross = makeTab('crossword', 'Mini Crossword', 'Mini', 'Word grid');
  const tabSudoku = makeTab('sudoku', 'Sudoku', 'Sudoku', '9 × 9');
  const tabDouble = makeTab('daily-double', 'Daily Double', 'Double', 'STEAM trivia');
  const tabChess = makeTab('chess', 'Chess Quest', 'Chess', 'Find the mate');
  const tabSoko = makeTab('sokoban', 'Sokoban', 'Sokoban', 'Push the crates');
  const bar = el('div', { class: 'dp-bar' },
    el('div', { class: 'dp-tabs', role: 'tablist', 'aria-label': 'Puzzle' }, tabCross, tabSudoku, tabDouble, tabChess, tabSoko),
    el('div', { class: 'dp-nav', role: 'group', 'aria-label': 'Choose a day' },
      el('div', { class: 'dp-daypick' }, prevBtn, dateLabel, nextBtn), todayBtn, streakEl));
  const panel = el('div', { class: 'dp-panel', id: 'dp-panel', role: 'tabpanel' });
  app.replaceChildren(bar, panel);

  let teardown = () => {};

  function refreshChrome() {
    dateLabel.textContent = state.key === today ? `Today · ${longDate(state.key)}` : longDate(state.key);
    prevBtn.disabled = state.key <= shiftDayKey(today, -BACK_DAYS);
    nextBtn.disabled = state.key >= today;
    todayBtn.hidden = state.key === today;
    const n = streak();
    streakEl.hidden = n === 0;
    streakEl.textContent = `🔥 ${n}-day streak`;
    tabCross.setAttribute('aria-selected', String(state.tab === 'crossword'));
    tabSudoku.setAttribute('aria-selected', String(state.tab === 'sudoku'));
    tabDouble.setAttribute('aria-selected', String(state.tab === 'daily-double'));
    tabChess.setAttribute('aria-selected', String(state.tab === 'chess'));
    tabSoko.setAttribute('aria-selected', String(state.tab === 'sokoban'));
    tabCross.tabIndex = state.tab === 'crossword' ? 0 : -1;
    tabSudoku.tabIndex = state.tab === 'sudoku' ? 0 : -1;
    tabDouble.tabIndex = state.tab === 'daily-double' ? 0 : -1;
    tabChess.tabIndex = state.tab === 'chess' ? 0 : -1;
    tabSoko.tabIndex = state.tab === 'sokoban' ? 0 : -1;
    tabCross.classList.toggle('is-done', isDone(state.key, 'cross'));
    tabSudoku.classList.toggle('is-done', isDone(state.key, 'sudoku'));
    tabDouble.classList.toggle('is-done', isDone(state.key, 'double'));
    tabChess.classList.toggle('is-done', isDone(state.key, 'chess'));
    tabSoko.classList.toggle('is-done', isDone(state.key, 'soko'));
    panel.setAttribute('aria-labelledby', `dp-tab-${state.tab}`);
  }

  function show() {
    teardown();
    refreshChrome();
    const p = puzzlesFor(state.key);
    teardown = state.tab === 'crossword'
      ? buildCrossword(panel, p.cw, dayState(state.key), persist, refreshChrome)
      : state.tab === 'sudoku'
        ? buildSudoku(panel, p.su, dayState(state.key), persist, refreshChrome)
        : state.tab === 'daily-double'
          ? buildDailyDouble(panel, p.dd, dayState(state.key), persist, refreshChrome)
          : state.tab === 'chess'
            ? buildChess(panel, p.ch, dayState(state.key), persist, refreshChrome)
            : buildSokoban(panel, p.sk, dayState(state.key), persist, refreshChrome);
    if (!reducedMotion()) replay(panel, 'is-enter');
  }

  const goDay = (key) => { state.key = key; show(); };
  prevBtn.addEventListener('click', () => goDay(shiftDayKey(state.key, -1)));
  nextBtn.addEventListener('click', () => goDay(shiftDayKey(state.key, 1)));
  todayBtn.addEventListener('click', () => goDay(today));

  const tabButtons = { 'crossword': tabCross, 'sudoku': tabSudoku, 'daily-double': tabDouble, chess: tabChess, sokoban: tabSoko };
  const setTab = (tab, focus) => {
    state.tab = tab; store.tab = tab; persist(); show();
    if (focus && tabButtons[tab]) tabButtons[tab].focus();
  };
  tabCross.addEventListener('click', () => setTab('crossword'));
  tabSudoku.addEventListener('click', () => setTab('sudoku'));
  tabDouble.addEventListener('click', () => setTab('daily-double'));
  tabChess.addEventListener('click', () => setTab('chess'));
  tabSoko.addEventListener('click', () => setTab('sokoban'));

  bar.querySelector('[role="tablist"]').addEventListener('keydown', (ev) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
    ev.preventDefault();
    const currIdx = validTabs.indexOf(state.tab);
    let nextIdx = currIdx;
    if (ev.key === 'Home') nextIdx = 0;
    else if (ev.key === 'End') nextIdx = validTabs.length - 1;
    else if (ev.key === 'ArrowLeft') nextIdx = (currIdx - 1 + validTabs.length) % validTabs.length;
    else if (ev.key === 'ArrowRight') nextIdx = (currIdx + 1) % validTabs.length;
    setTab(validTabs[nextIdx], true);
  });

  show();

  // Full screen (creation-app.js): the game takes the keyboard on the way in, and F works
  // from inside a game, where creation-app.js leaves keys alone. The crossword's input
  // keeps F as a letter.
  let staged = false;
  document.addEventListener('creation-app-resize', () => {
    const now = root.matches(':fullscreen, .creation-app-expanded');
    if (now && !staged) panel.querySelector('.dp-xinput, .dp-scell[tabindex="0"], .dp-dcell[tabindex="0"], .dp-chess-square, .dp-soko-board')?.focus({ preventScroll: true });
    staged = now;
  });
  root.addEventListener('keydown', (ev) => {
    if (ev.key.toLowerCase() !== 'f' || ev.ctrlKey || ev.metaKey || ev.altKey || ev.defaultPrevented) return;
    if (ev.target.closest('input, textarea, select')) return;
    ev.preventDefault();
    root.querySelector('.creation-app-fullscreen')?.click();
  });
  root.classList.add('is-ready');
}

// ── crossword ────────────────────────────────────────────────────────────
function buildCrossword(panel, cw, saved, persist, onChange) {
  const { width, height } = cw;
  const cellKey = (r, c) => r * width + c;
  const isLetter = (r, c) => r >= 0 && c >= 0 && r < height && c < width && cw.grid[r][c] !== '.';
  const total = cw.grid.join('').replace(/\./g, '').length;

  const st = saved.cross && Array.isArray(saved.cross.l) && saved.cross.l.length === width * height
    ? saved.cross : (saved.cross = { l: new Array(width * height).fill(''), done: false, gaveUp: false, secs: 0 });
  st.secs |= 0;
  const wrong = new Set();
  const view = { r: 0, c: 0, dir: 'across' };

  const entryAt = (r, c, dir) => cw.entries.find((e) => e.dir === dir && entryCells(e).some(([er, ec]) => er === r && ec === c));
  const current = () => entryAt(view.r, view.c, view.dir);

  // start on the first across entry
  const first = cw.entries[0];
  view.r = first.row; view.c = first.col; view.dir = first.dir;

  const gridEl = el('div', { class: 'dp-xgrid', role: 'grid', 'aria-label': 'Crossword grid. Type letters; arrow keys move; space switches across and down.', style: `--n:${width};--m:${height}` });
  // inputmode=none: hardware keyboards still work, but phones don't raise the system keyboard over the grid
  // (the on-screen keys below take over there).
  const input = el('input', { class: 'dp-xinput', type: 'text', inputmode: 'none', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'Type your answer' });
  const cells = new Map();
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (!isLetter(r, c)) continue;
      const num = cw.numbers[`${r},${c}`];
      const node = el('div', { class: 'dp-xcell', role: 'gridcell', 'data-r': r, 'data-c': c, style: `grid-row:${r + 1};grid-column:${c + 1}` },
        num ? el('span', { class: 'dp-xnum', text: num }) : null, el('span', { class: 'dp-xch' }));
      cells.set(cellKey(r, c), node);
      gridEl.append(node);
    }
  }

  const clueChip = el('span', { class: 'dp-cluechip' });
  const clueText = el('p', { class: 'dp-cluetext', 'aria-live': 'polite' });
  const prevClue = el('button', { type: 'button', class: 'dp-cluenav', 'aria-label': 'Previous clue', text: '‹' });
  const nextClue = el('button', { type: 'button', class: 'dp-cluenav', 'aria-label': 'Next clue', text: '›' });
  const clueBar = el('div', { class: 'dp-cluebar' }, prevClue, clueChip, clueText, nextClue);
  const status = el('p', { class: 'dp-status', role: 'status' });
  const lists = { across: el('ol', { class: 'dp-clues' }), down: el('ol', { class: 'dp-clues' }) };
  const clueBtn = new Map();
  for (const e of cw.entries) {
    const b = el('button', { type: 'button', class: 'dp-clue' }, el('b', { text: e.num }), el('span', { text: e.clue }), el('small', { text: e.len }));
    b.addEventListener('click', () => {
      view.dir = e.dir;
      const empty = entryCells(e).find(([r, c]) => !st.l[cellKey(r, c)]);
      const [r, c] = empty || [e.row, e.col];
      view.r = r; view.c = c;
      body.classList.remove('show-clues'); cluesBtn.textContent = '☰ Clues';
      paint(); input.focus({ preventScroll: true });
    });
    clueBtn.set(e, b);
    lists[e.dir].append(el('li', { 'data-num': e.num }, b));
  }

  const btn = (label, fn, cls = '') => { const b = el('button', { type: 'button', class: `dp-btn dp-btn--text ${cls}`, text: label }); b.addEventListener('click', fn); return b; };
  const tools = el('div', { class: 'dp-tools' },
    btn('✓ Check', check, 'dp-btn--primary'), btn('Reveal word', revealWord), btn('Reveal all', revealAll), btn('Clear', clearAll));

  // Phone layout: slim top bar (timer, clue list, tools), grid, clue bar, on-screen keys.
  const timerEl = el('span', { class: 'dp-timer', 'aria-label': 'Time' });
  const cluesBtn = el('button', { type: 'button', class: 'dp-btn dp-btn--text dp-xonly-small', text: '☰ Clues', 'aria-expanded': 'false' });
  const menuBtn = el('button', { type: 'button', class: 'dp-btn dp-btn--text dp-xonly-small', text: '⋯ Tools', 'aria-expanded': 'false' });
  const prog = progressBar('Letters filled in');
  const xtop = el('div', { class: 'dp-xtop' }, timerEl, prog.node, cluesBtn, menuBtn);
  const keys = el('div', { class: 'dp-keys', role: 'group', 'aria-label': 'On-screen keyboard' });
  for (const row of ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM⌫']) {
    keys.append(el('div', { class: 'dp-keyrow' }, ...[...row].map((ch) => {
      const k = el('button', { type: 'button', class: `dp-key${ch === '⌫' ? ' dp-key--wide' : ''}`, 'aria-label': ch === '⌫' ? 'Backspace' : ch, text: ch });
      k.addEventListener('pointerdown', (ev) => ev.preventDefault()); // keep focus where it is
      k.addEventListener('click', () => (ch === '⌫' ? backspace() : typeLetter(ch)));
      return k;
    })));
  }

  const body = el('div', { class: 'dp-body dp-body--cross' },
    el('div', { class: 'dp-xwrap' }, xtop, tools, clueBar, el('div', { class: 'dp-xframe', 'data-skin-keep': '' }, gridEl, input), status, keys),
    el('div', { class: 'dp-cluecols' },
      el('section', {}, el('h4', { text: 'Across' }), lists.across),
      el('section', {}, el('h4', { text: 'Down' }), lists.down)));
  panel.replaceChildren(body);

  cluesBtn.addEventListener('click', () => {
    const on = body.classList.toggle('show-clues');
    cluesBtn.textContent = on ? '▦ Grid' : '☰ Clues';
    cluesBtn.setAttribute('aria-expanded', String(on));
  });
  menuBtn.addEventListener('click', () => {
    const on = tools.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(on));
  });
  prevClue.addEventListener('click', () => { jumpEntry(-1); paint(); });
  nextClue.addEventListener('click', () => { jumpEntry(1); paint(); });

  const say = (msg, tone) => sayTo(status, msg, tone);
  let painted = false;

  function paint() {
    timerEl.textContent = fmtTime(st.secs);
    const entry = current();
    const inEntry = new Set(entry ? entryCells(entry).map(([r, c]) => cellKey(r, c)) : []);
    const crossing = entryAt(view.r, view.c, view.dir === 'across' ? 'down' : 'across');
    let filled = 0;
    for (const [k, node] of cells) {
      const r = Math.floor(k / width), c = k % width;
      const ch = node.querySelector('.dp-xch');
      if (ch.textContent !== st.l[k]) {
        ch.textContent = st.l[k];
        if (painted && st.l[k]) replay(ch, 'is-pop');
      }
      if (st.l[k]) filled++;
      node.classList.toggle('is-sel', r === view.r && c === view.c);
      node.classList.toggle('is-word', inEntry.has(k));
      node.classList.toggle('is-wrong', wrong.has(k));
      node.classList.toggle('is-solved', st.done);
      node.setAttribute('aria-selected', String(r === view.r && c === view.c));
      node.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}${st.l[k] ? `, ${st.l[k]}` : ', empty'}`);
    }
    prog.set(filled, total);
    for (const [e, b] of clueBtn) {
      b.classList.toggle('is-active', e === entry);
      b.classList.toggle('is-cross', e === crossing);
      b.classList.toggle('is-filled', entryCells(e).every(([r, c]) => st.l[cellKey(r, c)]));
    }
    clueChip.replaceChildren(entry ? `${entry.num}` : '', el('small', { text: entry ? entry.dir : '' }));
    clueText.replaceChildren(entry ? entry.clue : '', entry ? el('small', { text: ` (${entry.len})` }) : '');
    const li = clueBtn.get(entry) && clueBtn.get(entry).parentElement;
    if (li && li.parentElement.scrollHeight > li.parentElement.clientHeight) {
      li.parentElement.scrollTop = li.offsetTop - li.parentElement.clientHeight / 3; // keep the active clue in view without scrolling the page
    }
  }

  function finishIfSolved() {
    if (st.done) return;
    for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) if (isLetter(r, c) && st.l[cellKey(r, c)] !== cw.grid[r][c]) return;
    st.done = true;
    persist(); paint(); onChange();
    say(st.gaveUp ? 'Every answer is filled in. Try tomorrow’s on your own!' : `🎉 Solved in ${fmtTime(st.secs)}! Every answer is right.`, st.gaveUp ? '' : 'good');
    if (!st.gaveUp) {
      for (const [k, node] of cells) node.style.setProperty('--d', `${(Math.floor(k / width) + (k % width)) * 45}ms`);
      replay(gridEl, 'is-cascade');
      celebrate(panel.closest('.home-puzzles'));
    }
  }

  function setLetter(r, c, ch) {
    const k = cellKey(r, c);
    st.l[k] = ch; wrong.delete(k);
    persist();
  }

  function move(dr, dc) {
    let r = view.r + dr, c = view.c + dc;
    while (r >= 0 && c >= 0 && r < height && c < width && !isLetter(r, c)) { r += dr; c += dc; }
    if (isLetter(r, c)) { view.r = r; view.c = c; }
    const e = current();
    if (!e) view.dir = view.dir === 'across' ? 'down' : 'across';
  }

  function stepInWord(delta) {
    const e = current(); if (!e) return;
    const list = entryCells(e);
    const i = list.findIndex(([r, c]) => r === view.r && c === view.c) + delta;
    if (i >= 0 && i < list.length) { view.r = list[i][0]; view.c = list[i][1]; }
  }

  function jumpEntry(delta) {
    const order = cw.entries.slice().sort((a, b) => (a.dir === b.dir ? a.num - b.num : a.dir === 'across' ? -1 : 1));
    const i = order.indexOf(current());
    const next = order[(i + delta + order.length) % order.length];
    const [r, c] = entryCells(next).find(([er, ec]) => !st.l[cellKey(er, ec)]) || [next.row, next.col];
    view.dir = next.dir; view.r = r; view.c = c;
  }

  function typeLetter(ch) {
    if (st.done) return;
    setLetter(view.r, view.c, ch);
    const e = current(), last = e && entryCells(e)[e.len - 1];
    if (last && last[0] === view.r && last[1] === view.c) {
      // End of the word: if it's complete, hop to the next clue; otherwise stay and fill the gaps.
      if (entryCells(e).every(([r, c]) => st.l[cellKey(r, c)])) jumpEntry(1);
    } else stepInWord(1);
    say(''); paint(); finishIfSolved();
  }

  function backspace() {
    if (st.done) return;
    if (st.l[cellKey(view.r, view.c)]) setLetter(view.r, view.c, '');
    else { stepInWord(-1); setLetter(view.r, view.c, ''); }
    say(''); paint();
  }

  function check() {
    wrong.clear();
    let bad = 0, filled = 0;
    for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) {
      if (!isLetter(r, c)) continue;
      const v = st.l[cellKey(r, c)];
      if (!v) continue;
      filled++;
      if (v !== cw.grid[r][c]) { wrong.add(cellKey(r, c)); bad++; }
    }
    paint();
    say(!filled ? 'Nothing to check yet. Fill in a few letters first.'
      : bad ? `${bad} letter${bad === 1 ? ' is' : 's are'} off. They’re marked in red.`
        : filled === total ? '' : 'Everything so far is right. Keep going!', bad ? 'bad' : filled ? 'good' : '');
    finishIfSolved();
  }

  function reveal(list) {
    for (const [r, c] of list) { st.l[cellKey(r, c)] = cw.grid[r][c]; wrong.delete(cellKey(r, c)); }
    persist();
  }

  function revealWord() {
    const e = current(); if (!e) return;
    reveal(entryCells(e));
    paint(); finishIfSolved(); say(`Revealed ${e.num} ${e.dir === 'across' ? 'Across' : 'Down'}: ${e.answer}.`);
  }

  function revealAll() {
    if (!window.confirm('Fill in every answer? Today’s puzzle won’t count toward your streak.')) return;
    st.gaveUp = true;
    reveal(Array.from(cells.keys(), (k) => [Math.floor(k / width), k % width]));
    paint(); finishIfSolved();
  }

  function clearAll() {
    if (!window.confirm('Clear every letter and start this puzzle over?')) return;
    st.l.fill(''); st.done = false; st.gaveUp = false; wrong.clear();
    persist(); paint(); onChange(); say('');
  }

  gridEl.addEventListener('click', (ev) => {
    const node = ev.target.closest('.dp-xcell'); if (!node) return;
    const r = +node.dataset.r, c = +node.dataset.c;
    if (r === view.r && c === view.c) view.dir = view.dir === 'across' ? 'down' : 'across';
    else view.r = r, view.c = c;
    if (!current()) view.dir = view.dir === 'across' ? 'down' : 'across';
    paint();
    input.focus({ preventScroll: true });
  });

  input.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    if (/^[a-z]$/i.test(k)) { ev.preventDefault(); typeLetter(k.toUpperCase()); return; }
    const axis = { ArrowLeft: ['across', 0, -1], ArrowRight: ['across', 0, 1], ArrowUp: ['down', -1, 0], ArrowDown: ['down', 1, 0] }[k];
    if (axis) {
      ev.preventDefault();
      if (view.dir !== axis[0] && entryAt(view.r, view.c, axis[0])) view.dir = axis[0];
      else { if (view.dir !== axis[0]) view.dir = axis[0]; move(axis[1], axis[2]); }
      paint(); return;
    }
    if (k === 'Backspace' || k === 'Delete') { ev.preventDefault(); backspace(); return; }
    if (k === ' ' || k === 'Spacebar') { ev.preventDefault(); const d = view.dir === 'across' ? 'down' : 'across'; if (entryAt(view.r, view.c, d)) view.dir = d; paint(); return; }
    if (k === 'Tab' || k === 'Enter') { ev.preventDefault(); jumpEntry(ev.shiftKey ? -1 : 1); paint(); }
  });
  // Soft keyboards often send "Unidentified" keydowns; read the text instead.
  input.addEventListener('input', () => {
    const typed = input.value.toUpperCase().replace(/[^A-Z]/g, '');
    input.value = '';
    for (const ch of typed) typeLetter(ch);
  });
  input.addEventListener('focus', () => gridEl.classList.add('has-focus'));
  input.addEventListener('blur', () => gridEl.classList.remove('has-focus'));

  paint();
  painted = true;
  if (st.done) say(st.gaveUp ? 'Every answer is filled in. Try tomorrow’s on your own!' : `🎉 Solved in ${fmtTime(st.secs)}! Every answer is right.`, st.gaveUp ? '' : 'good');

  let lastSave = 0;
  const tick = setInterval(() => {
    if (st.done || document.hidden || !gridEl.isConnected) return;
    st.secs++;
    timerEl.textContent = fmtTime(st.secs);
    if (st.secs - lastSave >= 5) { lastSave = st.secs; persist(); }
  }, 1000);
  return () => { clearInterval(tick); persist(); };
}

// ── sudoku ───────────────────────────────────────────────────────────────
function buildSudoku(panel, su, saved, persist, onChange) {
  const st = saved.sudoku && Array.isArray(saved.sudoku.g) && saved.sudoku.g.length === 81
    ? saved.sudoku : (saved.sudoku = { g: new Array(81).fill(0), notes: {}, secs: 0, hints: 0, done: false });
  st.notes ||= {};
  const wrong = new Set();
  const view = { sel: su.puzzle.findIndex((d) => !d), pencil: false };
  if (view.sel < 0) view.sel = 0;

  const given = (i) => su.puzzle[i] !== 0;
  const value = (i) => su.puzzle[i] || st.g[i];
  const merged = () => Array.from({ length: 81 }, (_, i) => value(i));

  const gridEl = el('div', { class: 'dp-sgrid', 'data-skin-keep': '', role: 'grid', 'aria-label': 'Sudoku grid. Arrow keys move; type 1 to 9; N toggles pencil notes.' });
  const cellEls = [];
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9), c = i % 9;
    const node = el('div', { class: `dp-scell${c % 3 === 2 && c < 8 ? ' bx-r' : ''}${r % 3 === 2 && r < 8 ? ' bx-b' : ''}`, role: 'gridcell', 'data-i': i, tabindex: -1 }, el('span', { class: 'dp-sin' }));
    cellEls.push(node);
    gridEl.append(node);
  }

  const status = el('p', { class: 'dp-status', role: 'status' });
  const timerEl = el('span', { class: 'dp-timer', 'aria-label': 'Time' });
  const pad = el('div', { class: 'dp-pad', role: 'group', 'aria-label': 'Number pad' });
  const padBtns = DIGITS.map((d) => {
    const b = el('button', { type: 'button', class: 'dp-padbtn', 'aria-label': `Enter ${d}` }, el('span', { text: d }), el('small', { text: '' }));
    b.addEventListener('click', () => enter(d));
    pad.append(b);
    return b;
  });
  const pencilBtn = el('button', { type: 'button', class: 'dp-btn dp-btn--text dp-btn--toggle', 'aria-pressed': 'false' },
    el('span', { text: '✎ Notes' }), el('i', { class: 'dp-switch', 'aria-hidden': 'true' }));
  pencilBtn.addEventListener('click', () => { view.pencil = !view.pencil; paint(); });
  const btn = (label, fn) => { const b = el('button', { type: 'button', class: 'dp-btn dp-btn--text', text: label }); b.addEventListener('click', fn); return b; };
  const tools = el('div', { class: 'dp-tools' }, pencilBtn, btn('⌫ Erase', erase), btn('💡 Hint', hint), btn('✓ Check', check), btn('Restart', restart));
  const prog = progressBar('Cells filled in');
  const open = su.puzzle.filter((d) => !d).length;

  panel.replaceChildren(el('div', { class: 'dp-body dp-body--sudoku' },
    el('div', { class: 'dp-swrap' },
      el('div', { class: 'dp-smeta' }, el('span', { class: `dp-level dp-level--${su.level.toLowerCase()}`, text: su.level }), prog.node, timerEl),
      el('div', { class: 'dp-sframe' }, gridEl), status),
    el('div', { class: 'dp-sside' }, pad, tools,
      el('p', { class: 'dp-hint-text', text: 'Fill every row, column and 3×3 box with 1–9, no repeats. Repeats glow red as you play.' }))));

  let painted = false;
  const shown = new Array(81).fill(0);

  function paint() {
    const grid = merged();
    const conflicts = sudokuConflicts(grid);
    const sel = view.sel, selVal = grid[sel];
    const counts = new Array(10).fill(0);
    grid.forEach((d) => { counts[d]++; });
    cellEls.forEach((node, i) => {
      const inner = node.firstChild;
      const v = grid[i];
      if (v) {
        inner.className = 'dp-sin dp-sval'; inner.textContent = v;
        if (painted && shown[i] !== v) replay(inner, 'is-pop');
      } else {
        const mask = st.notes[i] | 0;
        inner.className = 'dp-sin dp-snotes';
        inner.replaceChildren(...DIGITS.map((d) => el('i', { class: selVal === d && mask & (1 << d) ? 'is-match' : null, text: mask & (1 << d) ? d : '' })));
      }
      shown[i] = v;
      node.classList.toggle('is-given', given(i));
      node.classList.toggle('is-sel', i === sel);
      node.classList.toggle('is-peer', i !== sel && PEERS[sel].includes(i));
      node.classList.toggle('is-same', !!selVal && i !== sel && v === selVal);
      node.classList.toggle('is-conflict', conflicts.has(i));
      node.classList.toggle('is-wrong', wrong.has(i));
      node.classList.toggle('is-solved', st.done);
      node.tabIndex = i === sel ? 0 : -1;
      node.setAttribute('aria-selected', String(i === sel));
      node.setAttribute('aria-label', `Row ${Math.floor(i / 9) + 1}, column ${(i % 9) + 1}, ${v ? `${v}${given(i) ? ', given' : ''}` : 'empty'}`);
    });
    padBtns.forEach((b, k) => {
      const left = 9 - counts[k + 1];
      b.disabled = left <= 0 || st.done;
      b.classList.toggle('is-complete', left <= 0);
      b.classList.toggle('is-current', !!selVal && selVal === k + 1);
      b.lastChild.textContent = left > 0 ? left : '✓';
    });
    prog.set(st.g.filter((d, i) => d && !given(i)).length, open);
    pencilBtn.setAttribute('aria-pressed', String(view.pencil));
    pencilBtn.classList.toggle('is-on', view.pencil);
    gridEl.classList.toggle('is-pencil', view.pencil);
    timerEl.textContent = fmtTime(st.secs);
  }

  const say = (msg, tone) => sayTo(status, msg, tone);
  const solvedMsg = () => `🎉 Solved in ${fmtTime(st.secs)}${st.hints ? ` with ${st.hints} hint${st.hints === 1 ? '' : 's'}` : ''}!`;

  function afterChange() {
    const grid = merged();
    if (!st.done && grid.every((d, i) => d === su.solution[i])) {
      st.done = true;
      say(solvedMsg(), 'good');
      onChange();
      cellEls.forEach((node, i) => node.style.setProperty('--d', `${(Math.floor(i / 9) + (i % 9)) * 35}ms`));
      replay(gridEl, 'is-cascade');
      celebrate(panel.closest('.home-puzzles'));
    }
    persist(); paint();
  }

  function enter(d) {
    const i = view.sel;
    if (given(i) || st.done) return;
    wrong.delete(i);
    if (view.pencil && !st.g[i]) {
      st.notes[i] = (st.notes[i] | 0) ^ (1 << d);
    } else if (st.g[i] === d) {
      st.g[i] = 0;
    } else {
      st.g[i] = d; delete st.notes[i];
      for (const j of PEERS[i]) if (st.notes[j]) st.notes[j] &= ~(1 << d); // tidy the neighbours' notes
    }
    say(''); afterChange();
  }

  function erase() {
    const i = view.sel;
    if (given(i) || st.done) return;
    st.g[i] = 0; delete st.notes[i]; wrong.delete(i);
    say(''); afterChange();
  }

  function hint() {
    if (st.done) return;
    let i = view.sel;
    if (given(i) || st.g[i] === su.solution[i]) {
      i = su.puzzle.findIndex((d, k) => !d && st.g[k] !== su.solution[k]);
      if (i < 0) return;
      view.sel = i;
    }
    st.g[i] = su.solution[i]; delete st.notes[i]; wrong.delete(i); st.hints++;
    for (const j of PEERS[i]) if (st.notes[j]) st.notes[j] &= ~(1 << su.solution[i]);
    say('Hint used: that cell is filled in for you.'); afterChange();
    replay(cellEls[i], 'is-hinted');
  }

  function check() {
    wrong.clear();
    let filled = 0;
    st.g.forEach((d, i) => { if (d) { filled++; if (d !== su.solution[i]) wrong.add(i); } });
    say(!filled ? 'Nothing to check yet. Place a few digits first.'
      : wrong.size ? `${wrong.size} cell${wrong.size === 1 ? ' is' : 's are'} off. They’re marked in red.`
        : 'Every digit you’ve placed is right. Nice work!', wrong.size ? 'bad' : filled ? 'good' : '');
    paint();
  }

  function restart() {
    if (!window.confirm('Clear your entries and start this sudoku over?')) return;
    st.g.fill(0); st.notes = {}; st.secs = 0; st.hints = 0; st.done = false; wrong.clear();
    say(''); persist(); onChange(); paint();
  }

  function select(i) { view.sel = Math.max(0, Math.min(80, i)); paint(); cellEls[view.sel].focus({ preventScroll: true }); }

  gridEl.addEventListener('click', (ev) => {
    const node = ev.target.closest('.dp-scell'); if (!node) return;
    select(+node.dataset.i);
  });
  gridEl.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key, i = view.sel;
    if (/^[1-9]$/.test(k)) { ev.preventDefault(); enter(+k); return; }
    const to = { ArrowLeft: i % 9 ? i - 1 : i, ArrowRight: i % 9 < 8 ? i + 1 : i, ArrowUp: i >= 9 ? i - 9 : i, ArrowDown: i < 72 ? i + 9 : i }[k];
    if (to != null) { ev.preventDefault(); select(to); return; }
    if (k === 'Backspace' || k === 'Delete' || k === '0') { ev.preventDefault(); erase(); return; }
    if (k === 'n' || k === 'N') { ev.preventDefault(); view.pencil = !view.pencil; paint(); }
  });

  // Timer ticks only while this sudoku is on screen, unsolved and the tab is visible.
  let lastSave = 0;
  const tick = setInterval(() => {
    if (st.done || document.hidden || !gridEl.isConnected) return;
    st.secs++;
    timerEl.textContent = fmtTime(st.secs);
    if (st.secs - lastSave >= 5) { lastSave = st.secs; persist(); }
  }, 1000);

  paint();
  painted = true;
  if (st.done) say(solvedMsg(), 'good');
  return () => { clearInterval(tick); persist(); };
}

// ── daily double ─────────────────────────────────────────────────────────
function buildDailyDouble(panel, dd, saved, persist, onChange) {
  const st = saved.double && typeof saved.double === 'object' && saved.double.answers
    ? saved.double
    : (saved.double = { answers: {}, wagers: {}, score: 0, secs: 0, done: false, gaveUp: false });
  st.answers ||= {};
  st.wagers ||= {};
  st.score |= 0;
  st.secs |= 0;

  let soundEnabled = true;
  let audioCtx = null;
  function playSound(type) {
    if (!soundEnabled) return;
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      if (!audioCtx) audioCtx = new AudioCtor();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      if (type === 'select') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now); osc.stop(now + 0.08);
      } else if (type === 'final') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(329.63, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now); osc.stop(now + 0.35);
      } else if (type === 'correct') {
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const o = audioCtx.createOscillator(), g = audioCtx.createGain();
          o.connect(g); g.connect(audioCtx.destination);
          o.type = 'sine'; o.frequency.setValueAtTime(freq, now + idx * 0.07);
          g.gain.setValueAtTime(0.1, now + idx * 0.07);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
          o.start(now + idx * 0.07); o.stop(now + idx * 0.07 + 0.25);
        });
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(130, now + 0.25);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
      } else if (type === 'triple-double') {
        [392.00, 523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const o = audioCtx.createOscillator(), g = audioCtx.createGain();
          o.connect(g); g.connect(audioCtx.destination);
          o.type = 'triangle'; o.frequency.setValueAtTime(freq, now + idx * 0.09);
          g.gain.setValueAtTime(0.12, now + idx * 0.09);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
          o.start(now + idx * 0.09); o.stop(now + idx * 0.09 + 0.35);
        });
      }
    } catch { /* audio not available or blocked */ }
  }

  // Find first unanswered tile or default to 0,0
  let firstUnanswered = null;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (!st.answers[`${c},${r}`] && !firstUnanswered) firstUnanswered = { c, r };
    }
  }
  const view = {
    col: firstUnanswered ? firstUnanswered.c : 0,
    row: firstUnanswered ? firstUnanswered.r : 0,
    pendingWager: null,
    lockingIn: false
  };

  const CATEGORY_META = {
    Science: { icon: '🔬', short: 'Science' },
    Technology: { icon: '💻', short: 'Tech' },
    Engineering: { icon: '⚙️', short: 'Eng' },
    Art: { icon: '🎨', short: 'Art' },
    Math: { icon: '📐', short: 'Math' }
  };

  const OPT_LETTERS = ['A', 'B', 'C', 'D'];

  const scoreEl = el('strong', { class: 'dp-dscore-val' });
  const progEl = el('span', { class: 'dp-dprog' });
  const timerEl = el('span', { class: 'dp-timer', 'aria-label': 'Time' });
  const prog = progressBar('Tiles answered');
  const metaBar = el('div', { class: 'dp-dmeta' },
    el('span', { class: 'dp-dscore' }, el('small', { text: 'Bank' }), scoreEl),
    el('span', { class: 'dp-dprogwrap' }, progEl, prog.node), timerEl);

  const gridEl = el('div', { class: 'dp-dgrid', role: 'grid', 'aria-label': '5 by 5 STEAM Jeopardy board. Arrow keys move; Enter or Space opens tile.' });
  const cellNodes = new Map(); // `${c},${r}` -> node

  // Append 5 category headers
  for (let c = 0; c < 5; c++) {
    const cat = dd.categories[c];
    const info = CATEGORY_META[cat] || { icon: '★', short: cat };
    const h = el('div', { class: 'dp-dhead', role: 'columnheader', 'aria-label': cat },
      el('span', { class: 'dp-dhead-icon', 'aria-hidden': 'true', text: info.icon }),
      el('span', { text: info.short }));
    gridEl.append(h);
  }

  // Append 25 tiles in row-major order (row 0 to 4 across columns 0 to 4)
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const tile = dd.grid[c][r];
      const node = el('button', {
        type: 'button',
        class: 'dp-dcell',
        role: 'gridcell',
        'data-c': c,
        'data-r': r,
        'aria-label': `${tile.category} for $${tile.value}`
      }, el('span', { class: 'dp-dcell-val', text: `$${tile.value}` }));

      node.addEventListener('click', () => {
        selectCell(c, r);
      });
      cellNodes.set(`${c},${r}`, node);
      gridEl.append(node);
    }
  }

  const soundBtn = el('button', { type: 'button', class: 'dp-btn dp-btn--text', 'aria-label': 'Toggle sound', text: '🔊 Sound: On' });
  soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? '🔊 Sound: On' : '🔇 Sound: Off';
  });

  const restartBtn = el('button', { type: 'button', class: 'dp-btn dp-btn--text', text: 'Restart' });
  restartBtn.addEventListener('click', () => {
    if (!window.confirm('Clear all your answers and restart today’s Daily Double?')) return;
    st.answers = {};
    st.wagers = {};
    st.score = 0;
    st.secs = 0;
    st.done = false;
    st.gaveUp = false;
    view.pendingWager = null;
    view.lockingIn = false;
    closeClue();
    persist();
    paint();
    onChange();
  });

  const openClueBtn = el('button', {
    type: 'button',
    class: 'dp-btn dp-btn--primary dp-dopen-clue dp-donly-small',
    text: '⚡ Play Clue ($400) →'
  });
  openClueBtn.addEventListener('click', () => {
    openClue();
  });

  const status = el('p', { class: 'dp-status', role: 'status' });
  const tools = el('div', { class: 'dp-tools' }, soundBtn, restartBtn);

  const leftWrap = el('div', { class: 'dp-dwrap' }, metaBar, el('div', { class: 'dp-dboard', 'data-skin-keep': '' }, gridEl), openClueBtn, tools, status);
  const sideConsole = el('div', { class: 'dp-dside' });
  const body = el('div', { class: 'dp-body dp-body--double' }, leftWrap, sideConsole);
  panel.replaceChildren(body);

  const say = (msg, tone) => sayTo(status, msg, tone);

  function openClue() {
    body.classList.add('show-clue');
  }

  function closeClue() {
    body.classList.remove('show-clue');
  }

  function selectCell(c, r, opts = {}) {
    view.col = c;
    view.row = r;
    view.pendingWager = null;
    view.lockingIn = false;
    paint();
    playSound('select');
    if (opts.openClue !== false) {
      openClue();
    }
  }

  function nextUnanswered() {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (!st.answers[`${c},${r}`]) {
          selectCell(c, r, { openClue: true });
          return;
        }
      }
    }
  }

  function paintGrid() {
    timerEl.textContent = fmtTime(st.secs);
    const answeredCount = Object.keys(st.answers).length;
    scoreEl.textContent = `$${st.score.toLocaleString()}`;
    progEl.textContent = `${answeredCount}/25`;
    prog.set(answeredCount, 25);

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const k = `${c},${r}`;
        const node = cellNodes.get(k);
        const tile = dd.grid[c][r];
        const ans = st.answers[k];
        const isSel = (c === view.col && r === view.row);

        node.classList.toggle('is-sel', isSel);
        node.classList.toggle('is-correct', !!(ans && ans.correct));
        node.classList.toggle('is-wrong', !!(ans && !ans.correct));
        node.classList.toggle('is-td-solved', !!(ans && tile.isTripleDouble));
        node.setAttribute('aria-selected', String(isSel));
        node.tabIndex = isSel ? 0 : -1;

        const valSpan = node.querySelector('.dp-dcell-val');
        if (ans) {
          valSpan.replaceChildren(
            el('b', { class: 'dp-dcell-mark', 'aria-hidden': 'true', text: ans.correct ? (tile.isTripleDouble ? '⚡' : '✓') : '✗' }),
            el('small', { text: ans.correct ? `+$${ans.points.toLocaleString()}` : '$0' }));
          node.setAttribute('aria-label', `${tile.category} for $${tile.value}, ${ans.correct ? 'answered correctly' : 'missed'}`);
        } else {
          valSpan.textContent = `$${tile.value}`;
        }
      }
    }

    const activeTile = dd.grid[view.col][view.row];
    const activeKey = `${view.col},${view.row}`;
    const activeAns = st.answers[activeKey];
    if (activeTile.isTripleDouble && !st.wagers[activeKey] && !activeAns) {
      openClueBtn.textContent = `⚡ Play Triple Double (${activeTile.category}) →`;
    } else if (activeAns) {
      openClueBtn.textContent = `⚡ View Clue (${activeTile.category} $${activeTile.value}) →`;
    } else {
      openClueBtn.textContent = `⚡ Play Clue: ${activeTile.category} $${activeTile.value} →`;
    }
  }

  function paintConsole() {
    sideConsole.replaceChildren();
    const answeredCount = Object.keys(st.answers).length;
    if (answeredCount === 25 && st.done) {
      let correctN = 0;
      for (const a of Object.values(st.answers)) if (a.correct) correctN++;
      const viewBoardBtn = el('button', {
        type: 'button',
        class: 'dp-btn dp-btn--text dp-donly-small',
        text: '▦ View Completed Board'
      });
      viewBoardBtn.addEventListener('click', () => { closeClue(); });

      const grandCard = el('div', { class: 'dp-dcleared' },
        el('div', { class: 'dp-dcleared-title', text: '🏆 BOARD CLEARED! 🏆' }),
        el('p', { text: `Final Bank: $${st.score.toLocaleString()} · Time: ${fmtTime(st.secs)}` }),
        el('p', { text: `Accuracy: ${correctN} of 25 answered correctly.` }),
        el('p', { class: 'dp-hint-text', text: 'Come back tomorrow for a brand new set of STEAM lesson questions!' }),
        viewBoardBtn
      );
      sideConsole.append(grandCard);
    }

    const c = view.col, r = view.row;
    const tile = dd.grid[c][r];
    const k = `${c},${r}`;
    const ans = st.answers[k];
    const hasWager = (st.wagers[k] != null);

    // TRIPLE DOUBLE Stage (if special tile and wager not yet confirmed and not yet answered)
    if (tile.isTripleDouble && !hasWager && !ans) {
      const standardWager = tile.value;
      const doubleWager = tile.value * 2;
      const piWager = Math.round(tile.value * Math.PI);
      const allInWager = Math.max(st.score, 1000);

      if (view.pendingWager == null) view.pendingWager = doubleWager;

      const wagerBtns = [
        { label: `Standard ($${standardWager})`, val: standardWager },
        { label: `Double ($${doubleWager})`, val: doubleWager },
        { label: `π-Power ($${piWager})`, val: piWager },
        { label: `True Triple Double ($${allInWager})`, val: allInWager }
      ];

      const wContainer = el('div', { class: 'dp-td-wagers' });
      const wBtnNodes = wagerBtns.map((wb) => {
        const btnNode = el('button', {
          type: 'button',
          class: `dp-td-wbtn${view.pendingWager === wb.val ? ' is-active' : ''}`,
          text: wb.label
        });
        btnNode.addEventListener('click', () => {
          view.pendingWager = wb.val;
          wBtnNodes.forEach((b) => b.classList.remove('is-active'));
          btnNode.classList.add('is-active');
          playSound('select');
        });
        wContainer.append(btnNode);
        return btnNode;
      });

      const confirmBtn = el('button', {
        type: 'button',
        class: 'dp-btn dp-btn--text dp-td-confirm',
        text: 'Lock Wager & See Clue →'
      });
      confirmBtn.addEventListener('click', () => {
        st.wagers[k] = view.pendingWager || doubleWager;
        persist();
        playSound('triple-double');
        paint();
      });

      const tdBackBtn = el('button', {
        type: 'button',
        class: 'dp-btn dp-btn--text dp-dback-btn dp-donly-small',
        'aria-label': 'Back to board',
        text: '← Board'
      });
      tdBackBtn.addEventListener('click', () => { closeClue(); });

      const tdTopBar = el('div', { class: 'dp-td-top' },
        tdBackBtn,
        el('span', { class: 'dp-td-tag', text: tile.category }));

      const tdCard = el('div', { class: 'dp-td-stage' },
        tdTopBar,
        el('div', { class: 'dp-td-banner', text: '⚡ TRIPLE DOUBLE to the power of π! ⚡' }),
        el('div', { class: 'dp-td-formula', text: '(3 × 2)^π ≈ 279× Multiplier Bonus!' }),
        el('p', { text: 'You discovered a secret Triple Double tile! Place your wager before opening this STEAM clue:' }),
        wContainer,
        confirmBtn
      );
      sideConsole.append(tdCard);
      return;
    }

    // Active Clue Card in Millionaire style
    const activeVal = st.wagers[k] || tile.value;
    const catLabel = tile.isTripleDouble ? `⚡ TRIPLE DOUBLE · ${tile.category}` : `${tile.category}`;
    const backBtn = el('button', {
      type: 'button',
      class: 'dp-btn dp-btn--text dp-dback-btn dp-donly-small',
      'aria-label': 'Back to board',
      text: '← Board'
    });
    backBtn.addEventListener('click', () => { closeClue(); });

    const headBar = el('div', { class: 'dp-dcard-top' },
      backBtn,
      el('span', { class: 'dp-dcard-cat', text: catLabel }),
      el('span', { class: 'dp-dcard-val', text: `$${activeVal.toLocaleString()}` })
    );

    const questionBox = el('div', { class: 'dp-m-question', text: tile.clue });
    const choicesGrid = el('div', { class: 'dp-m-grid', role: 'group', 'aria-label': 'Answer options' });

    tile.choices.forEach((choiceText, optIdx) => {
      const optBtn = el('button', {
        type: 'button',
        class: 'dp-m-opt',
        'data-opt': optIdx,
        'aria-label': `Option ${OPT_LETTERS[optIdx]}: ${choiceText}`
      },
        el('span', { class: 'dp-m-badge', text: OPT_LETTERS[optIdx] }),
        el('span', { class: 'dp-m-text', text: choiceText })
      );

      if (ans) {
        optBtn.disabled = true;
        if (optIdx === tile.correctIndex) optBtn.classList.add('is-correct');
        else if (optIdx === ans.chosen && !ans.correct) optBtn.classList.add('is-wrong');
      } else {
        optBtn.addEventListener('click', () => {
          if (view.lockingIn) return;
          submitChoice(optIdx, optBtn);
        });
      }
      choicesGrid.append(optBtn);
    });

    const card = el('div', { class: 'dp-dcard' }, headBar, questionBox, choicesGrid);

    // If answered, show educational feedback and lesson link
    if (ans) {
      const fbClass = ans.correct ? 'dp-m-feedback is-correct' : 'dp-m-feedback is-wrong';
      const heading = ans.correct
        ? (tile.isTripleDouble ? `⚡ TRIPLE DOUBLE WON! +$${ans.points.toLocaleString()}!` : `🎉 Correct! +$${ans.points.toLocaleString()}`)
        : `✗ Incorrect. (Correct answer: ${tile.answer})`;

      const fbActions = el('div', { class: 'dp-m-actions' });
      if (answeredCount < 25) {
        const nextBtn = el('button', { type: 'button', class: 'dp-btn dp-btn--primary', text: 'Next Clue →' });
        nextBtn.addEventListener('click', () => { nextUnanswered(); });
        fbActions.append(nextBtn);
      }
      const toBoardBtn = el('button', {
        type: 'button',
        class: 'dp-btn dp-btn--text dp-donly-small',
        text: '← Back to Board'
      });
      toBoardBtn.addEventListener('click', () => { closeClue(); });
      fbActions.append(toBoardBtn);

      const fb = el('div', { class: fbClass },
        el('strong', { text: heading }),
        el('span', { text: tile.explanation }),
        el('a', {
          class: 'dp-lesson-link',
          href: tile.lesson,
          target: '_blank',
          rel: 'noopener noreferrer'
        }, el('span', { text: `📖 Open Lesson: ${tile.lessonTitle} →` })),
        fbActions
      );
      card.append(fb);
    }

    sideConsole.append(card);
  }

  function submitChoice(optIdx, btnNode) {
    view.lockingIn = true;
    btnNode.classList.add('is-final');
    playSound('final');

    setTimeout(() => {
      const c = view.col, r = view.row;
      const tile = dd.grid[c][r];
      const isCorrect = (optIdx === tile.correctIndex);
      const wager = st.wagers[`${c},${r}`] || tile.value;
      const pointsWon = isCorrect ? wager : 0;
      st.score += pointsWon;
      st.answers[`${c},${r}`] = { chosen: optIdx, correct: isCorrect, points: pointsWon };

      const allDone = (Object.keys(st.answers).length === 25);
      if (allDone) {
        st.done = true;
        say(`🎉 Board Cleared! Final Score: $${st.score.toLocaleString()}!`, 'good');
        celebrate(panel.closest('.home-puzzles'));
      } else {
        say(isCorrect ? `Correct! +$${pointsWon.toLocaleString()}` : `Incorrect. The correct answer was ${tile.answer}.`, isCorrect ? 'good' : 'bad');
      }

      playSound(tile.isTripleDouble ? 'triple-double' : (isCorrect ? 'correct' : 'wrong'));
      persist();
      view.lockingIn = false;
      paint();
      onChange();
    }, 500);
  }

  function paint() {
    paintGrid();
    paintConsole();
  }

  // Keyboard navigation on grid
  gridEl.addEventListener('keydown', (ev) => {
    const moves = {
      ArrowLeft: [view.row, (view.col - 1 + 5) % 5],
      ArrowRight: [view.row, (view.col + 1) % 5],
      ArrowUp: [(view.row - 1 + 5) % 5, view.col],
      ArrowDown: [(view.row + 1) % 5, view.col]
    }[ev.key];

    if (moves) {
      ev.preventDefault();
      selectCell(moves[1], moves[0], { openClue: false });
      const node = cellNodes.get(`${moves[1]},${moves[0]}`);
      if (node) node.focus({ preventScroll: true });
      return;
    }

    // Number keys 1-4 or A-D to pick choice when a question is active
    const choiceKey = { '1': 0, '2': 1, '3': 2, '4': 3, 'a': 0, 'A': 0, 'b': 1, 'B': 1, 'c': 2, 'C': 2, 'd': 3, 'D': 3 }[ev.key];
    if (choiceKey != null && !view.lockingIn) {
      const k = `${view.col},${view.row}`;
      const tile = dd.grid[view.col][view.row];
      if (!st.answers[k] && (!tile.isTripleDouble || st.wagers[k] != null)) {
        ev.preventDefault();
        const optBtns = sideConsole.querySelectorAll('.dp-m-opt');
        if (optBtns[choiceKey]) submitChoice(choiceKey, optBtns[choiceKey]);
      }
    }
  });

  paint();

  let lastSave = 0;
  const tick = setInterval(() => {
    if (st.done || document.hidden || !gridEl.isConnected) return;
    st.secs++;
    timerEl.textContent = fmtTime(st.secs);
    if (st.secs - lastSave >= 5) { lastSave = st.secs; persist(); }
  }, 1000);

  return () => { clearInterval(tick); persist(); };
}

// ── chess ────────────────────────────────────────────────────────────────
const CHESS_NAMES = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const CHESS_FILE_NAMES = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: 'P' };

function chessPiece(piece) {
  if (!piece) return null;
  return el('img', {
    class: 'dp-chess-piece',
    src: `assets/images/chess/chessnut/${piece.color}${CHESS_FILE_NAMES[piece.type]}.svg`,
    alt: '',
    'aria-hidden': 'true',
    draggable: 'false'
  });
}

function buildChess(panel, puzzle, saved, persist, onChange) {
  const st = saved.chess && saved.chess.id === puzzle.id
    ? saved.chess : (saved.chess = { id: puzzle.id, moves: [], done: false, gaveUp: false });
  const game = new Chess(puzzle.fen);
  for (const move of st.moves) {
    try { game.move(move); } catch { st.moves = []; st.done = false; st.gaveUp = false; game.load(puzzle.fen); break; }
  }
  let selected = null;
  let hintSquare = null;
  const turnEl = el('span', { class: 'dp-chess-turn' });
  const title = el('h4', { class: 'dp-chess-title' }, turnEl, el('span', { class: 'dp-chess-mate', text: `Mate in ${puzzle.mate}` }));
  const instruction = el('p', { class: 'dp-chess-instruction', text: 'Select a white piece, then its destination. Find the checkmate.' });
  const board = el('div', { class: 'dp-chess-board', role: 'grid', 'aria-label': `Chess board, white at the bottom. Mate in ${puzzle.mate}.` });
  const status = el('p', { class: 'dp-status dp-chess-status', role: 'status', 'aria-live': 'polite' });
  const movesPlayed = el('ol', { class: 'dp-chess-moves', 'aria-label': 'Moves played' });
  const hint = el('button', { type: 'button', class: 'dp-btn', text: '💡 Hint' });
  const reveal = el('button', { type: 'button', class: 'dp-btn', text: 'Show solution' });
  const restart = el('button', { type: 'button', class: 'dp-btn dp-btn--primary', text: '↺ Try again' });
  const tools = el('div', { class: 'dp-tools' }, hint, reveal, restart);
  const body = el('div', { class: 'dp-body dp-body--chess' },
    el('div', { class: 'dp-chess-main' }, el('div', { class: 'dp-chess-frame', 'data-skin-keep': '' }, board)),
    el('div', { class: 'dp-chess-side' }, title, instruction, status, movesPlayed, tools,
      el('p', { class: 'dp-chess-note', text: 'Only legal moves are accepted. In a two-move puzzle, Black replies automatically after your first move.' })));
  panel.replaceChildren(body);

  function paint() {
    board.replaceChildren();
    const history = game.history({ verbose: true });
    const lastMove = history[history.length - 1];
    movesPlayed.replaceChildren(...history.map((m, i) => el('li', { class: m.color === 'w' ? 'is-white' : 'is-black' },
      i % 2 === 0 ? el('small', { text: `${Math.floor(i / 2) + 1}.` }) : null, m.san)));
    movesPlayed.hidden = !history.length;
    turnEl.className = `dp-chess-turn is-${game.turn()}`;
    turnEl.textContent = st.done ? 'Checkmate' : game.turn() === 'w' ? 'White to move' : 'Black to move';
    const legal = selected ? game.moves({ square: selected, verbose: true }).map((move) => move.to) : [];
    for (let rank = 8; rank >= 1; rank--) {
      for (const file of 'abcdefgh') {
        const square = `${file}${rank}`;
        const piece = game.get(square);
        const button = el('button', {
          type: 'button', role: 'gridcell',
          class: `dp-chess-square ${((file.charCodeAt(0) - 97 + rank) % 2) ? 'is-light' : 'is-dark'}${piece ? ' has-piece' : ''}${square === selected ? ' is-selected' : ''}${legal.includes(square) ? ' is-target' : ''}${square === hintSquare ? ' is-hint' : ''}${lastMove && (square === lastMove.from || square === lastMove.to) ? ' is-last' : ''}${st.done && !st.gaveUp && piece?.type === 'k' && piece.color === 'b' ? ' is-mated' : ''}`,
          'aria-label': `${square}, ${piece ? `${piece.color === 'w' ? 'white' : 'black'} ${CHESS_NAMES[piece.type]}` : 'empty'}${legal.includes(square) ? ', legal destination' : ''}`,
          'aria-pressed': square === selected ? 'true' : 'false',
          'data-square': square
        }, chessPiece(piece),
        file === 'a' ? el('span', { 'aria-hidden': 'true', class: 'dp-chess-rank', text: String(rank) }) : null,
        rank === 1 ? el('span', { 'aria-hidden': 'true', class: 'dp-chess-file', text: file }) : null);
        button.addEventListener('click', () => choose(square));
        board.append(button);
      }
    }
    hint.disabled = st.done;
    reveal.disabled = st.done;
    restart.hidden = !st.done && st.moves.length === 0;
    status.dataset.tone = st.done && !st.gaveUp ? 'good' : '';
    if (st.done) status.textContent = st.gaveUp ? 'Solution shown. Try another day for a fresh position.' : '🎉 Checkmate! Puzzle solved.';
    else if (st.moves.length === 2) status.textContent = 'Black has replied. Find the final checkmating move.';
    else if (!status.textContent) status.textContent = 'White to move. Find the winning move.';
  }

  function play(move) {
    const played = game.move(move);
    st.moves.push(played.lan);
    selected = null;
    hintSquare = null;
    if (game.isCheckmate()) {
      st.done = true;
      if (!st.gaveUp) celebrate(panel.closest('.home-puzzles'));
    } else if (puzzle.mate === 2 && st.moves.length === 1) {
      const [defense] = Object.entries(puzzle.lines).sort((a, b) => a[1].length - b[1].length || a[0].localeCompare(b[0]))[0];
      game.move(defense);
      st.moves.push(defense);
      status.textContent = 'Black replies. Your next move must be checkmate.';
    }
    persist();
    onChange();
    paint();
  }

  function choose(square) {
    if (st.done || game.turn() !== 'w') return;
    const piece = game.get(square);
    if (piece?.color === 'w') {
      selected = square;
      hintSquare = null;
      status.textContent = `${CHESS_NAMES[piece.type]} selected on ${square}. Choose a highlighted destination.`;
      paint();
      return;
    }
    if (!selected) return;
    const move = game.moves({ square: selected, verbose: true }).find((candidate) => candidate.to === square && (!candidate.promotion || candidate.promotion === 'q'));
    if (!move) { sayTo(status, 'That is not a legal move from the selected square.', 'bad'); return; }
    if ((st.moves.length === 0 && move.lan !== puzzle.first) || (st.moves.length === 2 && !puzzle.lines[st.moves[1]].includes(move.lan))) {
      sayTo(status, 'Legal move, but it does not force the required checkmate. Try again.', 'bad');
      return;
    }
    play(move);
  }

  hint.addEventListener('click', () => {
    hintSquare = st.moves.length === 2 ? puzzle.lines[st.moves[1]][0].slice(0, 2) : puzzle.first.slice(0, 2);
    status.textContent = `Look at the piece on ${hintSquare}.`;
    paint();
  });
  reveal.addEventListener('click', () => {
    if (st.done) return;
    game.load(puzzle.fen);
    st.moves = [];
    st.gaveUp = true;
    play(puzzle.first);
    if (!st.done) play(puzzle.lines[st.moves[1]][0]);
    persist();
    onChange();
    paint();
  });
  restart.addEventListener('click', () => {
    game.load(puzzle.fen);
    st.moves = [];
    st.done = false;
    st.gaveUp = false;
    selected = null;
    hintSquare = null;
    status.textContent = 'White to move. Find the winning move.';
    persist();
    onChange();
    paint();
  });
  paint();
  return () => persist();
}

// ── sokoban ──────────────────────────────────────────────────────────────
const SOKO_KEYS = {
  ArrowLeft: 'l', ArrowUp: 'u', ArrowRight: 'r', ArrowDown: 'd',
  a: 'l', w: 'u', d: 'r', s: 'd', A: 'l', W: 'u', D: 'r', S: 'd'
};
const SOKO_ARROWS = { l: '←', u: '↑', r: '→', d: '↓' };
const SOKO_WORDS = { l: 'left', u: 'up', r: 'right', d: 'down' };

function buildSokoban(panel, pz, saved, persist, onChange) {
  const { board } = pz;
  const total = pz.boxes.length;
  const st = saved.soko && saved.soko.id === pz.id
    ? saved.soko : (saved.soko = { id: pz.id, moves: '', done: false, gaveUp: false, best: null });
  // A saved line that no longer replays (the generator changed) starts the day over.
  let pos = Soko.replay(board, pz.boxes, pz.player, st.moves);
  if (!pos) { st.moves = ''; pos = Soko.replay(board, pz.boxes, pz.player, ''); }
  let { boxes, player } = pos;
  let face = 'd';
  let hint = null;        // { stand, crate, dir } for the next push of a solution
  let timer = 0;          // queued walk / solution playback
  let queue = '';
  let playing = false;    // the par solution is being shown

  const xy = (c) => [c % board.w, Math.floor(c / board.w)];
  const home = () => boxes.filter((b) => board.goal[b]).length;
  const pushesOf = (lurd) => (lurd.match(/[LURD]/g) || []).length;

  // ── DOM ──
  const tiles = el('div', { class: 'dp-soko-tiles', 'aria-hidden': 'true' });
  for (let c = 0; c < board.grid.length; c++) {
    const t = board.grid[c];
    tiles.append(el('div', {
      class: `dp-soko-tile ${t === Soko.WALL ? 'is-wall' : t === Soko.VOID ? 'is-void' : 'is-floor'}${board.goal[c] ? ' is-goal' : ''}`,
      'data-cell': String(c)
    }));
  }
  const crateEls = pz.boxes.map(() => el('div', { class: 'dp-soko-piece dp-soko-crate', 'aria-hidden': 'true' }));
  const workerEl = el('div', { class: 'dp-soko-piece dp-soko-worker', 'aria-hidden': 'true' });
  const boardEl = el('div', {
    class: 'dp-soko-board', tabindex: '0', role: 'application',
    'aria-roledescription': 'Sokoban board',
    'aria-label': `Sokoban warehouse, ${board.w} by ${board.h}. Push all ${total} crates onto the goals. Arrow keys or W A S D move, Z undoes.`
  }, tiles, ...crateEls, workerEl);
  boardEl.style.setProperty('--n', board.w);
  boardEl.style.setProperty('--m', board.h);

  const levelEl = el('span', { class: 'dp-soko-level', text: pz.level });
  const title = el('h4', { class: 'dp-soko-title' }, el('span', { text: 'Warehouse' }), levelEl);
  const instruction = el('p', { class: 'dp-soko-instruction', text: `Push every crate onto a goal. You can push one crate at a time, and never pull, so a crate in a corner is stuck there.` });
  const movesEl = el('strong'), pushesEl = el('strong'), homeEl = el('strong'), parEl = el('strong', { text: String(pz.par) });
  const stat = (label, val) => el('div', { class: 'dp-soko-stat' }, val, el('small', { text: label }));
  const stats = el('div', { class: 'dp-soko-stats' }, stat('moves', movesEl), stat('pushes', pushesEl), stat('par pushes', parEl), stat('crates home', homeEl));
  const progress = progressBar('Crates on goals');
  const status = el('p', { class: 'dp-status dp-soko-status', role: 'status', 'aria-live': 'polite' });
  // Short labels take over on the narrowest phones (CSS), with the full words as the name.
  const toolBtn = (long, short, title) => el('button', { type: 'button', class: 'dp-btn', title, 'aria-label': long.replace(/^\W+/u, '') },
    el('span', { class: 'dp-soko-long', text: long }), el('span', { class: 'dp-soko-short', 'aria-hidden': 'true', text: short }));
  const undoBtn = toolBtn('↶ Undo', '↶ Undo', 'Undo (Z)');
  const restartBtn = toolBtn('↺ Restart', '↺ Reset');
  const hintBtn = toolBtn('💡 Hint', '💡 Hint');
  const solveBtn = toolBtn('Show solution', 'Solve');
  const setSolveLabel = (text, short) => {
    solveBtn.firstChild.textContent = text; solveBtn.lastChild.textContent = short; solveBtn.setAttribute('aria-label', text.replace(/^\W+/u, ''));
  };
  const tools = el('div', { class: 'dp-tools' }, undoBtn, restartBtn, hintBtn, solveBtn);
  const padBtn = (dir) => el('button', { type: 'button', class: `dp-soko-padbtn is-${dir}`, 'data-dir': dir, 'aria-label': `Move ${SOKO_WORDS[dir]}`, text: SOKO_ARROWS[dir] });
  const pad = el('div', { class: 'dp-soko-pad', role: 'group', 'aria-label': 'Move' }, padBtn('u'), padBtn('l'), padBtn('d'), padBtn('r'));
  const note = el('p', { class: 'dp-soko-note', text: 'Tap a square to walk there, or tap a crate beside you to push it. Every level is built backwards from the solved position, so it always has a solution, and par is the fewest pushes possible.' });
  const body = el('div', { class: 'dp-body dp-body--soko' },
    el('div', { class: 'dp-soko-main' }, el('div', { class: 'dp-soko-frame', 'data-night-keep': '', 'data-skin-keep': '' }, boardEl)),
    el('div', { class: 'dp-soko-side' }, title, instruction, stats, progress.node, status, pad, tools, note));
  body.style.setProperty('--n', board.w);
  body.style.setProperty('--m', board.h);
  panel.replaceChildren(body);

  const place = (node, c) => { const [x, y] = xy(c); node.style.setProperty('--x', x); node.style.setProperty('--y', y); };

  function paint() {
    boxes.forEach((b, k) => {
      place(crateEls[k], b);
      crateEls[k].classList.toggle('is-home', !!board.goal[b]);
      crateEls[k].classList.toggle('is-hint', !!hint && hint.crate === b);
      if (hint && hint.crate === b) crateEls[k].dataset.arrow = SOKO_ARROWS[hint.dir]; else delete crateEls[k].dataset.arrow;
    });
    place(workerEl, player);
    workerEl.dataset.face = face;
    for (const t of tiles.children) t.classList.toggle('is-stand', !!hint && hint.stand === Number(t.dataset.cell));
    const n = home();
    movesEl.textContent = String(st.moves.length);
    pushesEl.textContent = String(pushesOf(st.moves));
    homeEl.textContent = `${n}/${total}`;
    progress.set(n, total);
    boardEl.classList.toggle('is-solved', Soko.isSolved(board, boxes));
    const busy = !!timer;
    undoBtn.disabled = busy || !st.moves.length;
    restartBtn.disabled = busy || (!st.moves.length && !st.gaveUp);
    hintBtn.disabled = busy || Soko.isSolved(board, boxes);
    if (playing) setSolveLabel('⏭ Skip to end', '⏭ Skip'); else setSolveLabel('Show solution', 'Solve');
    solveBtn.disabled = !busy && Soko.isSolved(board, boxes);
  }

  function finish() {
    const pushes = pushesOf(st.moves);
    const firstSolve = !st.done;
    st.done = true;
    if (playing || st.gaveUp) {
      playing = false;
      sayTo(status, `That's the par solution: ${pz.par} pushes, ${st.moves.length} moves. Restart to try it yourself.`);
    } else {
      if (!st.best || pushes < st.best.pushes || (pushes === st.best.pushes && st.moves.length < st.best.moves)) st.best = { pushes, moves: st.moves.length };
      sayTo(status, pushes <= pz.par
        ? `🎉 All crates home in ${st.moves.length} moves and ${pushes} pushes. ⭐ That's par: no solution uses fewer pushes.`
        : `🎉 All crates home in ${st.moves.length} moves and ${pushes} pushes. Par is ${pz.par} pushes. Restart to chase it.`, 'good');
      if (firstSolve || pushes <= pz.par) celebrate(panel.closest('.home-puzzles'));
      if (!reducedMotion()) replay(boardEl, 'is-cascade');
    }
    persist();
    onChange();
  }

  // One step; returns false when blocked. `record` is false while replaying a saved line.
  function move(dir) {
    if (Soko.isSolved(board, boxes)) return false;
    face = dir;
    const next = Soko.step(board, boxes, player, dir);
    if (!next) { replay(workerEl, 'is-bump'); paint(); return false; }
    const pushed = next.pushed >= 0;
    st.moves += pushed ? dir.toUpperCase() : dir;
    boxes = next.boxes; player = next.player;
    hint = null;
    if (pushed) {
      const b = boxes[next.pushed];
      if (board.goal[b]) {
        replay(crateEls[next.pushed], 'is-landed');
        if (!Soko.isSolved(board, boxes)) sayTo(status, `Crate on a goal: ${home()} of ${total} home.`);
      } else if (status.dataset.tone !== 'bad') sayTo(status, '');
    }
    paint();
    if (Soko.isSolved(board, boxes)) finish();
    else persist();
    return true;
  }

  function stopQueue() { clearTimeout(timer); timer = 0; queue = ''; }
  function runQueue(lurd, { pace = 70, pushPace = 130 } = {}) {
    stopQueue();
    queue = lurd;
    const tick = () => {
      if (!queue) { timer = 0; paint(); return; }
      const ch = queue[0];
      queue = queue.slice(1);
      if (!move(ch.toLowerCase())) { stopQueue(); paint(); return; }
      timer = setTimeout(tick, reducedMotion() ? 0 : ch === ch.toUpperCase() ? pushPace : pace);
    };
    timer = setTimeout(tick, 0);
    paint();
  }

  function rebuild() {
    const p = Soko.replay(board, pz.boxes, pz.player, st.moves);
    boxes = p.boxes; player = p.player;
    hint = null;
  }

  function undo() {
    if (!st.moves.length || timer) return;
    const last = st.moves[st.moves.length - 1];
    st.moves = st.moves.slice(0, -1);
    rebuild();
    face = last.toLowerCase();
    sayTo(status, last === last.toUpperCase() ? 'Undid a push.' : '');
    persist();
    paint();
  }

  function restart() {
    stopQueue();
    playing = false;
    st.moves = '';
    if (st.gaveUp) { st.gaveUp = false; st.done = false; }
    rebuild();
    face = 'd';
    sayTo(status, st.done ? `Solved already. Best: ${st.best.pushes} pushes. Par is ${pz.par}.` : '');
    persist();
    onChange();
    paint();
  }

  // ── input ──
  body.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.target.closest('[role="tablist"]')) return;
    const dir = SOKO_KEYS[ev.key];
    if (dir) {
      ev.preventDefault();
      if (!timer) move(dir);
    } else if (['z', 'Z', 'u', 'U', 'Backspace'].includes(ev.key)) {
      ev.preventDefault();
      undo();
    }
  });
  pad.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-dir]');
    if (b && !timer) move(b.dataset.dir);
  });
  boardEl.addEventListener('click', (ev) => {
    if (timer) return;
    const r = boardEl.getBoundingClientRect(); // zoom-safe (sim-present)
    const x = Math.floor(((ev.clientX - r.left) / r.width) * board.w);
    const y = Math.floor(((ev.clientY - r.top) / r.height) * board.h);
    if (x < 0 || y < 0 || x >= board.w || y >= board.h) return;
    const c = y * board.w + x;
    const [px, py] = xy(player);
    if (Math.abs(px - x) + Math.abs(py - y) === 1) { move(x < px ? 'l' : x > px ? 'r' : y < py ? 'u' : 'd'); return; }
    if (boxes.includes(c)) { sayTo(status, 'Stand right beside a crate, then tap it to push it away from you.'); return; }
    if (board.grid[c] !== Soko.FLOOR) return;
    const path = Soko.walkPath(board, boxes, player, c);
    if (path) runQueue(path, { pace: 45 });
    else sayTo(status, 'Crates block the way there.', 'bad');
  });

  undoBtn.addEventListener('click', undo);
  restartBtn.addEventListener('click', restart);
  hintBtn.addEventListener('click', () => {
    const line = Soko.solve(board, boxes, player);
    if (line == null) {
      sayTo(status, 'Stuck: from here at least one crate can never reach a goal. Undo a few moves or restart.', 'bad');
      return;
    }
    const i = line.search(/[LURD]/);
    const dir = line[i].toLowerCase();
    // Walk the hint's path silently to find where the worker stands for the push.
    const at = Soko.replay(board, boxes, player, line.slice(0, i));
    const crate = Soko.step(board, at.boxes, at.player, dir).player;
    hint = { stand: at.player, crate, dir };
    const left = pushesOf(line);
    sayTo(status, `${at.player === player ? 'From where you stand' : 'Walk to the glowing square, then'} push that crate ${SOKO_WORDS[dir]}. ${left} push${left === 1 ? '' : 'es'} to go from here.`);
    paint();
  });
  solveBtn.addEventListener('click', () => {
    if (playing) { // skip to the end
      stopQueue();
      st.moves = pz.solution;
      rebuild();
      paint();
      finish();
      return;
    }
    stopQueue();
    playing = true;
    if (!st.done) st.gaveUp = true; // a day already solved fairly keeps its credit
    st.moves = '';
    rebuild();
    sayTo(status, `Playing the par solution: ${pz.par} pushes.`);
    onChange();
    runQueue(pz.solution, { pace: 55, pushPace: 120 });
  });

  if (Soko.isSolved(board, boxes)) {
    sayTo(status, st.gaveUp ? 'Solution shown. Restart to try it yourself.' : `Solved in ${st.moves.length} moves and ${pushesOf(st.moves)} pushes. Par is ${pz.par}.`, st.gaveUp ? '' : 'good');
  } else if (st.done && st.best) {
    sayTo(status, `Solved already. Best: ${st.best.pushes} pushes. Par is ${pz.par}.`);
  }
  paint();
  return () => { stopQueue(); persist(); };
}

// ── boot ─────────────────────────────────────────────────────────────────
if (typeof document !== 'undefined') {
  const root = document.getElementById('home-puzzles');
  if (root) {
    Promise.all([
      fetch('data/crossword-bank.json').then((r) => (r.ok ? r.json() : { words: [] })).catch(() => ({ words: [] })),
      fetch('data/daily-double-bank.json').then((r) => (r.ok ? r.json() : { questions: [] })).catch(() => ({ questions: [] })),
      fetch('data/daily-chess-bank.json').then((r) => (r.ok ? r.json() : { puzzles: [] })).catch(() => ({ puzzles: [] }))
    ]).then(([crossData, doubleData, chessData]) => {
      if (!crossData.words || crossData.words.length < 40 || !doubleData.questions || doubleData.questions.length < 25 || !chessData.puzzles?.length) return;
      const start = () => mount(root, crossData.words, doubleData, chessData.puzzles);
      // Generation takes up to a couple hundred ms; let the first paint finish first.
      if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1500 });
      else setTimeout(start, 50);
    });
  }
}

