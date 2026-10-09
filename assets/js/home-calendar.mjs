// Home-page class calendar: Mon/Wed/Fri classes, holidays, and lesson anniversaries.
// Pure date logic is exported for tests/home-calendar.test.mjs; the DOM part only
// runs when #home-calendar exists. Curated entries live in data/calendar-events.json.

export const CLASS_DAYS = {
  1: { key: 'steam', label: 'STEAM', short: 'STEAM', what: 'Hands-on builds, coding, and experiments.' },
  3: { key: 'micro', label: 'Microschool', short: 'Micro', what: 'Collaborative projects and future-focused learning.' },
  5: { key: 'study', label: 'Study Hall', short: 'Study', what: 'Share progress, get feedback, and finish strong.' }
};

export const CATEGORIES = {
  holiday: { label: 'Holidays', icon: '🎉' },
  birthday: { label: 'Birthdays', icon: '🎂' },
  history: { label: 'History', icon: '📜' },
  science: { label: 'Science & sky', icon: '🔭' }
};

const CAT_ORDER = ['holiday', 'science', 'birthday', 'history'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pad = (n) => String(n).padStart(2, '0');

export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th'}`;
}

// ── Date math ────────────────────────────────────────────────────────────
/** Day-of-month of the nth (1-based) given weekday in a month. */
export function nthWeekday(year, m0, weekday, n) {
  const first = new Date(year, m0, 1).getDay();
  return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
}

export function lastWeekday(year, m0, weekday) {
  const last = new Date(year, m0 + 1, 0);
  return last.getDate() - ((last.getDay() - weekday + 7) % 7);
}

/** Western (Gregorian) Easter Sunday, anonymous Gregorian algorithm. */
export function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const SEASON_TERMS = [
  [485, 324.96, 1934.136], [203, 337.23, 32964.467], [199, 342.08, 20.186], [182, 27.85, 445267.112],
  [156, 73.14, 45036.886], [136, 171.52, 22518.443], [77, 222.54, 65928.934], [74, 296.72, 3034.906],
  [70, 243.58, 9037.513], [58, 119.81, 33718.147], [52, 297.17, 150.678], [50, 21.02, 2281.226],
  [45, 247.54, 29929.562], [44, 325.15, 31555.956], [29, 60.93, 4443.417], [18, 155.12, 67555.328],
  [17, 288.79, 4562.452], [16, 198.04, 62894.029], [14, 199.76, 31436.921], [12, 95.39, 14577.848],
  [12, 287.11, 31931.756], [12, 320.81, 34777.259], [9, 227.73, 1222.114], [8, 15.45, 16859.074]
];

const SEASON_MEANS = [
  { name: 'March equinox', note: 'Spring begins in the Northern Hemisphere.', c: [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057] },
  { name: 'June solstice', note: 'The longest day of the year in the Northern Hemisphere.', c: [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.0003] },
  { name: 'September equinox', note: 'Autumn begins in the Northern Hemisphere.', c: [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078] },
  { name: 'December solstice', note: 'The shortest day of the year in the Northern Hemisphere.', c: [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032] }
];

/** Equinoxes and solstices (Meeus, Astronomical Algorithms ch. 27) as local Dates. */
export function seasonMoments(year) {
  const y = (year - 2000) / 1000;
  const rad = Math.PI / 180;
  return SEASON_MEANS.map(({ name, note, c }) => {
    const jde0 = c[0] + c[1] * y + c[2] * y ** 2 + c[3] * y ** 3 + c[4] * y ** 4;
    const T = (jde0 - 2451545) / 36525;
    const W = (35999.373 * T - 2.47) * rad;
    const dl = 1 + 0.0334 * Math.cos(W) + 0.0007 * Math.cos(2 * W);
    const S = SEASON_TERMS.reduce((sum, [A, B, C]) => sum + A * Math.cos((B + C * T) * rad), 0);
    const jde = jde0 + (0.00001 * S) / dl;
    return { name, note, date: new Date((jde - 2440587.5) * 86400000 - 69000) };
  });
}

// Hebrew-calendar feasts via Intl (days begin at sundown; the civil date shown is the daytime date).
const HEBREW_FEASTS = [
  { month: /^tishr/, day: 1, title: 'Rosh Hashanah', note: 'Feast of Trumpets. Begins at sundown the evening before.' },
  { month: /^tishr/, day: 10, title: 'Yom Kippur', note: 'Day of Atonement. Begins at sundown the evening before.' },
  { month: /^tishr/, day: 15, title: 'Sukkot', note: 'Feast of Tabernacles. Begins at sundown the evening before.' },
  { month: /^nisan/, day: 15, title: 'Passover', note: 'Begins at sundown the evening before.' },
  { month: /^kislev/, day: 25, title: 'Hanukkah begins', note: 'Eight days. Begins at sundown the evening before.' }
];

function hebrewFeasts(year) {
  let fmt;
  try {
    fmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  } catch (e) { return []; }
  const out = [];
  for (let t = Date.UTC(year, 0, 1, 12); new Date(t).getUTCFullYear() === year; t += 86400000) {
    const parts = fmt.formatToParts(new Date(t));
    const day = Number((parts.find((p) => p.type === 'day') || {}).value);
    const month = ((parts.find((p) => p.type === 'month') || {}).value || '').toLowerCase();
    const feast = HEBREW_FEASTS.find((f) => f.day === day && f.month.test(month));
    if (feast) {
      const d = new Date(t);
      out.push({ m0: d.getUTCMonth(), d: d.getUTCDate(), cat: 'holiday', title: feast.title, note: feast.note, lesson: feast.title === 'Hanukkah begins' ? '' : 'lessons/bible-studies/feasts-of-israel.html' });
    }
  }
  return out;
}

/** Holidays and sky events that follow rules instead of a fixed date. */
export function computedItems(year) {
  const items = [];
  const add = (m0, d, cat, title, extra = {}) => items.push({ m0, d, cat, title, ...extra });
  const addDate = (date, cat, title, extra) => add(date.getMonth(), date.getDate(), cat, title, extra);
  const shift = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  const HOLY = 'lessons/bible-studies/holy-week.html';

  add(0, 1, 'holiday', "New Year's Day");
  add(0, nthWeekday(year, 0, 1, 3), 'holiday', 'Martin Luther King Jr. Day', { note: 'Third Monday of January.' });
  add(1, 14, 'holiday', "Valentine's Day");
  add(1, nthWeekday(year, 1, 1, 3), 'holiday', "Presidents' Day");
  const e = easter(year);
  addDate(shift(e, -7), 'holiday', 'Palm Sunday', { lesson: HOLY });
  addDate(shift(e, -3), 'holiday', 'Maundy Thursday', { lesson: HOLY });
  addDate(shift(e, -2), 'holiday', 'Good Friday', { lesson: HOLY });
  addDate(e, 'holiday', 'Easter', { lesson: HOLY });
  addDate(shift(e, 49), 'holiday', 'Pentecost', { lesson: 'lessons/bible-studies/acts-jerusalem-to-nations.html', note: 'Fifty days after Easter. The church is born in Acts 2.' });
  add(4, nthWeekday(year, 4, 0, 2), 'holiday', "Mother's Day");
  add(4, lastWeekday(year, 4, 1), 'holiday', 'Memorial Day');
  add(5, 19, 'holiday', 'Juneteenth', { y: 1865 });
  add(5, nthWeekday(year, 5, 0, 3), 'holiday', "Father's Day");
  add(6, 4, 'holiday', 'Independence Day', { y: 1776, note: 'The Declaration of Independence is adopted.' });
  add(8, nthWeekday(year, 8, 1, 1), 'holiday', 'Labor Day');
  add(9, nthWeekday(year, 9, 1, 2), 'holiday', "Columbus Day / Indigenous Peoples' Day");
  add(9, nthWeekday(year, 9, 2, 2), 'science', 'Ada Lovelace Day', { lesson: 'lessons/computer-science/pioneers/ada-lovelace.html', note: 'Second Tuesday of October, celebrating women in STEM.' });
  add(9, 31, 'holiday', 'Halloween');
  add(10, 11, 'holiday', 'Veterans Day');
  add(10, nthWeekday(year, 10, 4, 4), 'holiday', 'Thanksgiving');
  add(11, 24, 'holiday', 'Christmas Eve');
  add(11, 25, 'holiday', 'Christmas');
  add(11, 31, 'holiday', "New Year's Eve");

  const SEASON_LESSON = 'lessons/cosmology/seasons-and-the-heavens.html';
  for (const s of seasonMoments(year)) {
    const time = s.date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    addDate(s.date, 'science', s.name, { lesson: SEASON_LESSON, note: `${s.note} Exact moment: ${time} local time.` });
  }
  items.push(...hebrewFeasts(year));
  return items;
}

const ACTIVE_CAT_ORDER = (a, b) => CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat);
const yearCache = new Map();

/** Map of "m0-d" → sorted items for one year, with anniversary text filled in. */
export function itemsForYear(year, data = {}) {
  const cacheKey = data.events || null;
  const hit = yearCache.get(year);
  if (hit && hit.src === cacheKey) return hit.map;
  const map = new Map();
  const push = (m0, d, item) => {
    const k = `${m0}-${d}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  };
  for (const c of computedItems(year)) push(c.m0, c.d, decorate({ ...c }, year));
  for (const ev of data.events || []) {
    const [mm, dd] = ev.md.split('-').map(Number);
    push(mm - 1, dd, decorate({ ...ev, m0: mm - 1, d: dd }, year));
  }
  for (const list of map.values()) list.sort(ACTIVE_CAT_ORDER);
  yearCache.set(year, { src: cacheKey, map });
  return map;
}

function decorate(item, year) {
  const n = item.y ? year - item.y : 0;
  item.years = n;
  if (item.y && n > 0) {
    item.milestone = n % 25 === 0;
    if (item.cat === 'birthday') item.when = `${ordinal(n)} birthday · born ${item.y}`;
    else if (item.cat === 'history') item.when = `${n} years ago (${item.y})`;
    else item.when = `${ordinal(n)} anniversary · ${item.y}`;
  }
  return item;
}

export function itemsOn(date, data) {
  return itemsForYear(date.getFullYear(), data).get(`${date.getMonth()}-${date.getDate()}`) || [];
}

export function noClassFor(date, data) {
  const k = dateKey(date);
  return ((data && data.noClass) || []).find((r) => r.from <= k && k <= (r.to || r.from)) || null;
}

// ── DOM ──────────────────────────────────────────────────────────────────
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function mount(root, data) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const state = { view: new Date(today.getFullYear(), today.getMonth(), 1), sel: today, off: new Set() };

  const grid = root.querySelector('[data-hcal-grid]');
  const monthLabel = root.querySelector('[data-hcal-month]');
  const detail = root.querySelector('[data-hcal-detail]');
  const upcoming = root.querySelector('[data-hcal-upcoming]');
  const fullDate = (d) => d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const visible = (list) => list.filter((i) => !state.off.has(i.cat));

  function chip(item) {
    const c = el('span', `hcal-chip hcal-chip--${item.cat}`);
    c.append(el('i', 'hcal-dot'), el('span', 'hcal-chip-text', item.short || item.title));
    if (item.milestone) c.classList.add('is-milestone');
    return c;
  }

  function renderGrid() {
    const y = state.view.getFullYear(), m0 = state.view.getMonth();
    monthLabel.textContent = `${MONTHS[m0]} ${y}`;
    grid.textContent = '';
    const lead = new Date(y, m0, 1).getDay();
    const days = new Date(y, m0 + 1, 0).getDate();
    const weeks = Math.ceil((lead + days) / 7);
    const selInView = state.sel.getFullYear() === y && state.sel.getMonth() === m0;
    for (let w = 0; w < weeks; w++) {
      const row = el('div', 'hcal-row');
      row.setAttribute('role', 'row');
      for (let c = 0; c < 7; c++) {
        const date = new Date(y, m0, 1 - lead + w * 7 + c);
        const inMonth = date.getMonth() === m0;
        const cls = CLASS_DAYS[date.getDay()];
        const closed = cls && noClassFor(date, data);
        const items = visible(itemsOn(date, data));
        const cell = el('div', 'hcal-cell');
        cell.setAttribute('role', 'gridcell');
        const btn = el('button', 'hcal-day');
        btn.type = 'button';
        btn.dataset.date = dateKey(date);
        if (!inMonth) btn.classList.add('is-outside');
        if (c === 0 || c === 6) btn.classList.add('is-weekend');
        if (cls && !closed) { btn.classList.add('is-class', `is-${cls.key}`); }
        if (closed) btn.classList.add('is-closed');
        const isToday = date.getTime() === today.getTime();
        const isSel = date.getTime() === state.sel.getTime();
        if (isToday) { btn.classList.add('is-today'); btn.setAttribute('aria-current', 'date'); }
        if (isSel) btn.classList.add('is-selected');
        cell.setAttribute('aria-selected', isSel ? 'true' : 'false');
        btn.tabIndex = isSel && selInView ? 0 : (!selInView && inMonth && date.getDate() === 1 ? 0 : -1);

        const num = el('span', 'hcal-num', String(date.getDate()));
        btn.append(num);
        if (cls) {
          const tag = el('span', 'hcal-class');
          tag.append(el('span', 'hcal-class-long', closed ? 'No class' : cls.label), el('span', 'hcal-class-short', closed ? 'Off' : cls.short));
          btn.append(tag);
        }
        if (items.length) {
          const chips = el('span', 'hcal-chips');
          items.slice(0, 2).forEach((i) => chips.append(chip(i)));
          if (items.length > 2) chips.append(el('span', 'hcal-more', `+${items.length - 2}`));
          const dots = el('span', 'hcal-dots');
          items.slice(0, 4).forEach((i) => dots.append(el('i', `hcal-dot hcal-dot--${i.cat}`)));
          btn.append(chips, dots);
        }
        const bits = [fullDate(date)];
        if (cls) bits.push(closed ? `${cls.label}, no class: ${closed.label}` : cls.label);
        if (items.length) bits.push(items.map((i) => i.title).join('; '));
        btn.setAttribute('aria-label', bits.join('. '));
        cell.append(btn);
        row.append(cell);
      }
      grid.append(row);
    }
  }

  function itemNode(item) {
    const li = el('li', `hcal-item hcal-item--${item.cat}`);
    li.append(el('i', 'hcal-dot'));
    const body = el('div', 'hcal-item-body');
    const title = el('div', 'hcal-item-title');
    if (item.lesson) {
      const a = el('a', null, item.title);
      a.href = item.lesson;
      title.append(a);
    } else {
      title.textContent = item.title;
    }
    if (item.milestone) title.append(el('span', 'hcal-star', ` ★ ${ordinal(item.years)}`));
    body.append(title);
    if (item.when) body.append(el('div', 'hcal-item-when', item.when));
    if (item.note) body.append(el('div', 'hcal-item-note', item.note));
    li.append(body);
    return li;
  }

  function renderDetail() {
    detail.textContent = '';
    const head = el('h4', 'hcal-side-title', fullDate(state.sel));
    detail.append(head);
    const cls = CLASS_DAYS[state.sel.getDay()];
    if (cls) {
      const closed = noClassFor(state.sel, data);
      const box = el('div', `hcal-class-note is-${cls.key}`);
      box.append(el('strong', null, closed ? `${cls.label} · no class` : cls.label));
      box.append(el('span', null, closed ? closed.label : cls.what));
      detail.append(box);
    } else {
      detail.append(el('p', 'hcal-quiet', 'No class today. Independent study, reading, or exploration.'));
    }
    const items = visible(itemsOn(state.sel, data));
    if (items.length) {
      const ul = el('ul', 'hcal-list');
      items.forEach((i) => ul.append(itemNode(i)));
      detail.append(ul);
    } else if (cls) {
      // class box already says what's happening
    } else {
      detail.append(el('p', 'hcal-quiet', 'Nothing marked on this date.'));
    }
  }

  function renderUpcoming() {
    upcoming.textContent = '';
    upcoming.append(el('h4', 'hcal-side-title', 'Coming up'));
    const ul = el('ul', 'hcal-list hcal-list--compact');
    const found = [];
    for (let off = 1; off <= 200 && found.length < 6; off++) {
      const d = new Date(state.sel.getFullYear(), state.sel.getMonth(), state.sel.getDate() + off);
      for (const item of visible(itemsOn(d, data))) {
        if (found.length < 6) found.push({ d, item, off });
      }
    }
    found.forEach(({ d, item }) => {
      const li = itemNode(item);
      const when = li.querySelector('.hcal-item-title');
      const stamp = el('span', 'hcal-stamp', d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
      when.prepend(stamp);
      const note = li.querySelector('.hcal-item-note');
      if (note) note.remove();
      ul.append(li);
    });
    if (!found.length) ul.append(el('li', 'hcal-quiet', 'Nothing coming up with these filters.'));
    upcoming.append(ul);
  }

  function renderAll(focusDate) {
    renderGrid();
    renderDetail();
    renderUpcoming();
    if (focusDate) {
      const b = grid.querySelector(`[data-date="${dateKey(focusDate)}"]`);
      if (b) b.focus();
    }
  }

  function select(date, { focus = false } = {}) {
    state.sel = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    state.view = new Date(state.sel.getFullYear(), state.sel.getMonth(), 1);
    renderAll(focus ? state.sel : null);
  }

  function shiftMonth(delta) {
    const v = new Date(state.view.getFullYear(), state.view.getMonth() + delta, 1);
    const last = new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate();
    select(new Date(v.getFullYear(), v.getMonth(), Math.min(state.sel.getDate(), last)));
  }

  grid.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.hcal-day');
    if (!btn) return;
    const [y, m, d] = btn.dataset.date.split('-').map(Number);
    select(new Date(y, m - 1, d), { focus: true });
  });

  grid.addEventListener('keydown', (ev) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[ev.key];
    const s = state.sel;
    let next = null;
    if (step) next = new Date(s.getFullYear(), s.getMonth(), s.getDate() + step);
    else if (ev.key === 'PageUp' || ev.key === 'PageDown') {
      const v = new Date(s.getFullYear(), s.getMonth() + (ev.key === 'PageUp' ? -1 : 1), 1);
      next = new Date(v.getFullYear(), v.getMonth(), Math.min(s.getDate(), new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate()));
    } else if (ev.key === 'Home') next = new Date(s.getFullYear(), s.getMonth(), s.getDate() - s.getDay());
    else if (ev.key === 'End') next = new Date(s.getFullYear(), s.getMonth(), s.getDate() + (6 - s.getDay()));
    if (!next) return;
    ev.preventDefault();
    select(next, { focus: true });
  });

  root.querySelector('[data-hcal-prev]').addEventListener('click', () => shiftMonth(-1));
  root.querySelector('[data-hcal-next]').addEventListener('click', () => shiftMonth(1));
  root.querySelector('[data-hcal-today]').addEventListener('click', () => select(today));
  root.querySelectorAll('[data-hcal-filter]').forEach((b) => {
    b.addEventListener('click', () => {
      const cat = b.dataset.hcalFilter;
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      if (on) state.off.delete(cat); else state.off.add(cat);
      renderAll();
    });
  });

  renderAll();
  root.classList.add('is-ready');
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('home-calendar');
  if (root) {
    fetch('data/calendar-events.json')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((data) => mount(root, data));
  }
}

export { MONTHS, WEEKDAYS };
