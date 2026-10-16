// Home-page daily puzzles (#home-puzzles): a mini crossword and a sudoku, new every
// day, generated in the browser from the date (see daily-puzzles-core.mjs).
// Progress lives in one localStorage key; nothing leaves the browser.

import {
  dayKey, parseDayKey, shiftDayKey, makeSudoku, makeCrossword, sudokuConflicts, entryCells, PEERS
} from './daily-puzzles-core.mjs';

const STORE_KEY = 'classroomos:puzzles:v1';
const KEEP_DAYS = 60;
const BACK_DAYS = 30;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// ── storage ──────────────────────────────────────────────────────────────
function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if (raw && typeof raw === 'object' && raw.days) return raw;
  } catch { /* private mode or corrupt: start fresh */ }
  return { days: {}, tab: 'crossword' };
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

// ── the widget ───────────────────────────────────────────────────────────
function mount(root, bank) {
  const app = root.querySelector('[data-dp-app]');
  const store = loadStore();
  const today = dayKey(new Date());
  const state = { key: today, tab: store.tab === 'sudoku' ? 'sudoku' : 'crossword' };
  const cache = new Map();

  const dayState = (key) => (store.days[key] ||= {});
  const persist = () => saveStore(store);

  function puzzlesFor(key) {
    if (!cache.has(key)) cache.set(key, { cw: makeCrossword(key, bank), su: makeSudoku(key) });
    return cache.get(key);
  }

  const isDone = (key, which) => !!(store.days[key] && store.days[key][which] && store.days[key][which].done);
  // A day counts toward the streak when a puzzle was solved without "Reveal all".
  const counts = (key, which) => isDone(key, which) && !store.days[key][which].gaveUp;
  const played = (key) => counts(key, 'cross') || counts(key, 'sudoku');
  function streak() {
    let n = 0, k = played(today) ? today : shiftDayKey(today, -1);
    while (played(k)) { n++; k = shiftDayKey(k, -1); }
    return n;
  }

  // chrome: date nav + tabs + streak
  const dateLabel = el('strong', { class: 'dp-date', 'aria-live': 'polite' });
  const prevBtn = el('button', { type: 'button', class: 'dp-btn dp-btn--icon', 'aria-label': 'Previous day', text: '‹' });
  const nextBtn = el('button', { type: 'button', class: 'dp-btn dp-btn--icon', 'aria-label': 'Next day', text: '›' });
  const todayBtn = el('button', { type: 'button', class: 'dp-btn dp-btn--text', text: 'Today' });
  const streakEl = el('span', { class: 'dp-streak', hidden: true });
  const tabCross = el('button', { type: 'button', role: 'tab', id: 'dp-tab-crossword', class: 'dp-tab', 'aria-controls': 'dp-panel' }, el('span', { text: '🧩 Mini Crossword' }), el('i', { class: 'dp-tick', 'aria-hidden': 'true', text: '✓' }));
  const tabSudoku = el('button', { type: 'button', role: 'tab', id: 'dp-tab-sudoku', class: 'dp-tab', 'aria-controls': 'dp-panel' }, el('span', { text: '🔢 Sudoku' }), el('i', { class: 'dp-tick', 'aria-hidden': 'true', text: '✓' }));
  const bar = el('div', { class: 'dp-bar' },
    el('div', { class: 'dp-tabs', role: 'tablist', 'aria-label': 'Puzzle' }, tabCross, tabSudoku),
    el('div', { class: 'dp-nav', role: 'group', 'aria-label': 'Choose a day' }, prevBtn, dateLabel, nextBtn, todayBtn, streakEl));
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
    tabCross.tabIndex = state.tab === 'crossword' ? 0 : -1;
    tabSudoku.tabIndex = state.tab === 'sudoku' ? 0 : -1;
    tabCross.classList.toggle('is-done', isDone(state.key, 'cross'));
    tabSudoku.classList.toggle('is-done', isDone(state.key, 'sudoku'));
    panel.setAttribute('aria-labelledby', `dp-tab-${state.tab}`);
  }

  function show() {
    teardown();
    refreshChrome();
    const p = puzzlesFor(state.key);
    teardown = state.tab === 'crossword'
      ? buildCrossword(panel, p.cw, dayState(state.key), persist, refreshChrome)
      : buildSudoku(panel, p.su, dayState(state.key), persist, refreshChrome);
  }

  const goDay = (key) => { state.key = key; show(); };
  prevBtn.addEventListener('click', () => goDay(shiftDayKey(state.key, -1)));
  nextBtn.addEventListener('click', () => goDay(shiftDayKey(state.key, 1)));
  todayBtn.addEventListener('click', () => goDay(today));
  const setTab = (tab, focus) => {
    state.tab = tab; store.tab = tab; persist(); show();
    if (focus) (tab === 'crossword' ? tabCross : tabSudoku).focus();
  };
  tabCross.addEventListener('click', () => setTab('crossword'));
  tabSudoku.addEventListener('click', () => setTab('sudoku'));
  bar.querySelector('[role="tablist"]').addEventListener('keydown', (ev) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
    ev.preventDefault();
    setTab(ev.key === 'ArrowLeft' || ev.key === 'Home' ? 'crossword' : 'sudoku', true);
  });

  show();
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

  const clueText = el('p', { class: 'dp-cluetext', 'aria-live': 'polite' });
  const prevClue = el('button', { type: 'button', class: 'dp-cluenav', 'aria-label': 'Previous clue', text: '‹' });
  const nextClue = el('button', { type: 'button', class: 'dp-cluenav', 'aria-label': 'Next clue', text: '›' });
  const clueBar = el('div', { class: 'dp-cluebar' }, prevClue, clueText, nextClue);
  const status = el('p', { class: 'dp-status', role: 'status' });
  const lists = { across: el('ol', { class: 'dp-clues' }), down: el('ol', { class: 'dp-clues' }) };
  const clueBtn = new Map();
  for (const e of cw.entries) {
    const b = el('button', { type: 'button', class: 'dp-clue' }, el('b', { text: e.num }), el('span', { text: ` ${e.clue} (${e.len})` }));
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
    btn('Check', check), btn('Reveal word', revealWord), btn('Reveal all', revealAll), btn('Clear', clearAll));

  // Phone layout: slim top bar (timer, clue list, tools), grid, clue bar, on-screen keys.
  const timerEl = el('span', { class: 'dp-timer', 'aria-label': 'Time' });
  const cluesBtn = el('button', { type: 'button', class: 'dp-btn dp-btn--text dp-xonly-small', text: '☰ Clues', 'aria-expanded': 'false' });
  const menuBtn = el('button', { type: 'button', class: 'dp-btn dp-btn--text dp-xonly-small', text: '⋯ Tools', 'aria-expanded': 'false' });
  const xtop = el('div', { class: 'dp-xtop' }, timerEl, el('span', { class: 'dp-xtop-gap' }), cluesBtn, menuBtn);
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
    el('div', { class: 'dp-xwrap' }, xtop, tools, clueBar, el('div', { class: 'dp-xframe' }, gridEl, input), status, keys),
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

  function say(msg) { status.textContent = msg; }

  function paint() {
    timerEl.textContent = `⏱ ${fmtTime(st.secs)}`;
    const entry = current();
    const inEntry = new Set(entry ? entryCells(entry).map(([r, c]) => cellKey(r, c)) : []);
    for (const [k, node] of cells) {
      const r = Math.floor(k / width), c = k % width;
      node.querySelector('.dp-xch').textContent = st.l[k];
      node.classList.toggle('is-sel', r === view.r && c === view.c);
      node.classList.toggle('is-word', inEntry.has(k));
      node.classList.toggle('is-wrong', wrong.has(k));
      node.classList.toggle('is-solved', st.done);
      node.setAttribute('aria-selected', String(r === view.r && c === view.c));
      node.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}${st.l[k] ? `, ${st.l[k]}` : ', empty'}`);
    }
    for (const [e, b] of clueBtn) {
      b.classList.toggle('is-active', e === entry);
      b.classList.toggle('is-filled', entryCells(e).every(([r, c]) => st.l[cellKey(r, c)]));
    }
    clueText.replaceChildren(entry
      ? el('strong', { text: `${entry.num}${entry.dir === 'across' ? 'A' : 'D'}` })
      : '', entry ? ` ${entry.clue} (${entry.len})` : '');
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
    say(st.gaveUp ? 'Every answer is filled in. Try tomorrow’s on your own!' : '🎉 Solved! Every answer is right.');
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
      : bad ? `${bad} letter${bad === 1 ? ' is' : 's are'} off. They’re outlined in red.`
        : filled === total ? '' : 'Everything so far is right. Keep going!');
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
  if (st.done) say(st.gaveUp ? 'Every answer is filled in. Try tomorrow’s on your own!' : '🎉 Solved! Every answer is right.');

  let lastSave = 0;
  const tick = setInterval(() => {
    if (st.done || document.hidden || !gridEl.isConnected) return;
    st.secs++;
    timerEl.textContent = `⏱ ${fmtTime(st.secs)}`;
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

  const gridEl = el('div', { class: 'dp-sgrid', role: 'grid', 'aria-label': 'Sudoku grid. Arrow keys move; type 1 to 9; N toggles pencil notes.' });
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
  const pencilBtn = el('button', { type: 'button', class: 'dp-btn dp-btn--text', 'aria-pressed': 'false', text: '✎ Notes' });
  pencilBtn.addEventListener('click', () => { view.pencil = !view.pencil; paint(); });
  const btn = (label, fn) => { const b = el('button', { type: 'button', class: 'dp-btn dp-btn--text', text: label }); b.addEventListener('click', fn); return b; };
  const tools = el('div', { class: 'dp-tools' }, pencilBtn, btn('⌫ Erase', erase), btn('Hint', hint), btn('Check', check), btn('Restart', restart));

  panel.replaceChildren(el('div', { class: 'dp-body dp-body--sudoku' },
    el('div', { class: 'dp-swrap' },
      el('div', { class: 'dp-smeta' }, el('span', { class: 'dp-level', text: `${su.level} · ${su.givens} given` }), timerEl),
      gridEl, status),
    el('div', { class: 'dp-sside' }, pad, tools,
      el('p', { class: 'dp-hint-text', text: 'Fill every row, column and 3×3 box with 1–9, no repeats. Repeats glow red as you play.' }))));

  function paint() {
    const grid = merged();
    const conflicts = sudokuConflicts(grid);
    const sel = view.sel, selVal = grid[sel];
    const counts = new Array(10).fill(0);
    grid.forEach((d) => { counts[d]++; });
    cellEls.forEach((node, i) => {
      const inner = node.firstChild;
      const v = grid[i];
      if (v) { inner.className = 'dp-sin dp-sval'; inner.textContent = v; }
      else {
        const mask = st.notes[i] | 0;
        inner.className = 'dp-sin dp-snotes';
        inner.replaceChildren(...DIGITS.map((d) => el('i', { text: mask & (1 << d) ? d : '' })));
      }
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
      b.lastChild.textContent = left > 0 ? left : '';
    });
    pencilBtn.setAttribute('aria-pressed', String(view.pencil));
    pencilBtn.classList.toggle('is-on', view.pencil);
    timerEl.textContent = `⏱ ${fmtTime(st.secs)}`;
  }

  function say(msg) { status.textContent = msg; }

  function afterChange() {
    const grid = merged();
    if (!st.done && grid.every((d, i) => d === su.solution[i])) {
      st.done = true;
      say(`🎉 Solved in ${fmtTime(st.secs)}${st.hints ? ` with ${st.hints} hint${st.hints === 1 ? '' : 's'}` : ''}!`);
      onChange();
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
  }

  function check() {
    wrong.clear();
    let filled = 0;
    st.g.forEach((d, i) => { if (d) { filled++; if (d !== su.solution[i]) wrong.add(i); } });
    say(!filled ? 'Nothing to check yet. Place a few digits first.'
      : wrong.size ? `${wrong.size} cell${wrong.size === 1 ? ' is' : 's are'} off. They’re outlined in red.`
        : 'Every digit you’ve placed is right. Nice work!');
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
    timerEl.textContent = `⏱ ${fmtTime(st.secs)}`;
    if (st.secs - lastSave >= 5) { lastSave = st.secs; persist(); }
  }, 1000);

  paint();
  if (st.done) say(`🎉 Solved in ${fmtTime(st.secs)}${st.hints ? ` with ${st.hints} hint${st.hints === 1 ? '' : 's'}` : ''}!`);
  return () => { clearInterval(tick); persist(); };
}

// ── boot ─────────────────────────────────────────────────────────────────
if (typeof document !== 'undefined') {
  const root = document.getElementById('home-puzzles');
  if (root) {
    fetch('data/crossword-bank.json')
      .then((r) => (r.ok ? r.json() : { words: [] }))
      .catch(() => ({ words: [] }))
      .then((data) => {
        if (!data.words || data.words.length < 40) return; // leave the static fallback in place
        const start = () => mount(root, data.words);
        // Generation takes up to a couple hundred ms; let the first paint finish first.
        if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1500 });
        else setTimeout(start, 50);
      });
  }
}
