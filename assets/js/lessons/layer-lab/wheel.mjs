/* wheel.mjs — the phone tool wheel.
 *
 * On phones (portrait: along the bottom, landscape: down the left side) every tool lives on one
 * revolving, snap-scrolling wheel instead of a long toolbar with hidden sub-tools. Spin it and the
 * tool under the lens becomes the active tool; tap any tile to jump to it. Chips filter the wheel by
 * job (Select, Paint, Retouch, Create, View), "Recent" shows the tools you actually use, and the
 * magnifier finds a tool by name. adaptive.mjs turns it on via data-wheel="x|y" and calls setAxis().
 */
import { TOOLS } from './tools.mjs';
import { icon } from './icons.mjs';

const RECENT_KEY = 'classroomos:layerlab:recent:v1';
const FILTER_KEY = 'classroomos:layerlab:wheel-filter:v1';

/** Wheel order = grouped by job, so spinning through a filter feels predictable. */
export const CATEGORIES = {
  select: ['move', 'marquee', 'ellipse', 'lasso', 'wand', 'crop'],
  paint: ['brush', 'eraser', 'bucket', 'gradient', 'eyedropper'],
  retouch: ['heal', 'clone'],
  create: ['type', 'shape'],
  view: ['hand', 'zoom'],
};
export const FILTERS = [['all', 'All'], ['recent', 'Recent'], ['select', 'Select'], ['paint', 'Paint'], ['retouch', 'Retouch'], ['create', 'Create'], ['view', 'View']];
const ALL = Object.values(CATEGORIES).flat();
const SHORT = { marquee: 'Box', ellipse: 'Oval', wand: 'Wand', eyedropper: 'Picker', heal: 'Heal', clone: 'Clone', bucket: 'Bucket' };
const label = (id) => SHORT[id] || TOOLS[id].label;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

export class ToolWheel {
  constructor(s) {
    this.s = s;
    this.axis = null;
    this.filter = FILTERS.some(([k]) => k === load(FILTER_KEY, 'all')) ? load(FILTER_KEY, 'all') : 'all';
    this.query = '';
    this.recent = (load(RECENT_KEY, []) || []).filter((id) => TOOLS[id]).slice(0, 6);
    this.ids = [];
    this.copies = 1;
    this.user = false;
    const dock = (this.dock = document.createElement('div'));
    dock.className = 'lls-dock';
    dock.innerHTML = `
      <div class="lls-wd-filters" role="toolbar" aria-label="Filter tools"></div>
      <input class="lls-wd-search" type="search" placeholder="Find a tool…" aria-label="Find a tool" autocomplete="off" hidden>
      <button type="button" class="lls-wd-pill" aria-haspopup="menu" aria-expanded="false" aria-label="Filter tools">${icon('filter')}<i aria-hidden="true"></i></button>
      <div class="lls-wd-colors">
        <button type="button" class="lls-wd-fg" aria-label="Foreground color"></button>
        <button type="button" class="lls-wd-bg" aria-label="Background color"></button>
        <button type="button" class="lls-wd-swap" aria-label="Swap colors">⇄</button>
      </div>
      <div class="lls-wd-wheel">
        <div class="lls-wd-track" role="toolbar" aria-label="Tool wheel. Spin to choose a tool."></div>
        <span class="lls-wd-lens" aria-hidden="true"></span>
      </div>
      <button type="button" class="lls-wd-layers" data-cmd="showLayers" aria-controls="${s.uid}-panels" aria-expanded="false">${icon('layers')}<span>Layers</span></button>`;
    s.root.querySelector('.lls-main').append(dock);
    this.q = (sel) => dock.querySelector(sel);
    this.track = this.q('.lls-wd-track');
    this.search = this.q('.lls-wd-search');
    this.wire();
    this.renderFilters();
    this.render();
    this.syncPill();
  }

  wire() {
    const { s, track, dock } = this;
    const mark = () => { this.user = true; };
    track.addEventListener('pointerdown', mark);
    track.addEventListener('touchstart', mark, { passive: true });
    track.addEventListener('wheel', (e) => {
      mark();
      // A mouse wheel only turns vertically; let it spin a horizontal wheel too.
      if (this.axis === 'x' && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); track.scrollLeft += e.deltaY; }
    }, { passive: false });
    track.addEventListener('scroll', () => this.onScroll(), { passive: true });
    track.addEventListener('click', (e) => {
      const b = e.target.closest('.lls-wt');
      if (!b) return;
      this.user = false;
      s.setTool(b.dataset.wtool);
      this.center(this.tiles().indexOf(b), true);
    });
    track.addEventListener('keydown', (e) => {
      const next = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!next) return;
      e.preventDefault();
      const tiles = this.tiles(), i = Math.max(0, this.index()) + next;
      const t = tiles[Math.max(0, Math.min(tiles.length - 1, i))];
      this.user = false;
      s.setTool(t.dataset.wtool);
      this.center(tiles.indexOf(t), true);
      t.focus({ preventScroll: true });
    });
    dock.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-wfilter]');
      if (chip) { this.setFilter(chip.dataset.wfilter); return; }
      if (e.target.closest('.lls-wd-find')) { this.toggleSearch(); return; }
      if (e.target.closest('.lls-wd-pill')) { this.openPill(); return; }
      if (e.target.closest('.lls-wd-fg')) s.pickColor('fg');
      else if (e.target.closest('.lls-wd-bg')) s.pickColor('bg');
      else if (e.target.closest('.lls-wd-swap')) s.swapColors();
    });
    this.search.addEventListener('input', () => { this.query = this.search.value.trim().toLowerCase(); this.render(); });
    this.search.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.toggleSearch(false); } });
    new ResizeObserver(() => { if (this.axis) this.measure(); }).observe(this.q('.lls-wd-wheel'));
  }

  tiles() { return [...this.track.children]; }

  /* ── filtering ──────────────────────────────────────────────────────── */

  list() {
    let ids = this.filter === 'all' ? ALL : this.filter === 'recent' ? this.recent : CATEGORIES[this.filter] || ALL;
    if (this.query) {
      ids = ALL.filter((id) => label(id).toLowerCase().includes(this.query) || TOOLS[id].label.toLowerCase().includes(this.query) || TOOLS[id].key.toLowerCase() === this.query);
    }
    return ids;
  }

  setFilter(f) {
    this.filter = f;
    save(FILTER_KEY, f);
    this.renderFilters();
    this.render();
    this.syncPill();
  }

  renderFilters() {
    const box = this.q('.lls-wd-filters');
    const filters = FILTERS.filter(([k]) => k !== 'recent' || this.recent.length > 1 || this.filter === 'recent');
    box.innerHTML = filters.map(([k, name]) => `<button type="button" class="lls-wd-chip" data-wfilter="${k}" aria-pressed="${k === this.filter}">${name}</button>`).join('')
      + `<button type="button" class="lls-wd-chip lls-wd-find" aria-label="Find a tool" aria-pressed="${!this.search.hidden}">${icon('search')}</button>`;
    box.querySelector('[aria-pressed=true]')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }

  syncPill() {
    const pill = this.q('.lls-wd-pill'), name = FILTERS.find(([k]) => k === this.filter)[1];
    pill.setAttribute('aria-label', `Filter tools (showing ${name})`);
    pill.classList.toggle('active', this.filter !== 'all');
  }

  openPill() {
    const items = FILTERS.filter(([k]) => k !== 'recent' || this.recent.length > 1)
      .map(([k, name]) => ({ label: `${k === this.filter ? '✓ ' : ''}${name}`, action: () => this.setFilter(k) }));
    this.s.popup(this.q('.lls-wd-pill'), items, 'Filter tools');
  }

  toggleSearch(on = this.search.hidden) {
    this.search.hidden = !on;
    if (on) this.search.focus();
    else { this.search.value = ''; this.query = ''; this.render(); }
    this.renderFilters();
  }

  /* ── building the wheel ─────────────────────────────────────────────── */

  render() {
    const ids = this.list();
    this.ids = ids;
    // Enough tiles to go around? Then repeat the set so the wheel turns endlessly.
    this.copies = ids.length >= 7 ? 5 : 1;
    let html = '';
    for (let c = 0; c < this.copies; c++) {
      for (const id of ids) {
        const t = TOOLS[id], dup = c !== Math.floor(this.copies / 2) ? ' tabindex="-1" aria-hidden="true"' : '';
        html += `<button type="button" class="lls-wt" data-wtool="${id}" aria-label="${esc(t.label)} (${t.key})"${dup}>${icon(id)}<span>${esc(label(id))}</span></button>`;
      }
    }
    this.track.innerHTML = ids.length ? html : '<p class="lls-wd-none">No tool matches</p>';
    this.styled = new Set();
    this.sync(true);
    this.measure();
  }

  measure() {
    const tiles = this.tiles().filter((t) => t.matches('.lls-wt'));
    const y = this.axis === 'y';
    const size = y ? this.track.clientHeight : this.track.clientWidth;
    if (!size || !tiles.length) return;
    const first = tiles[0], tile = y ? first.offsetHeight : first.offsetWidth;
    this.pitch = tiles.length > 1 ? (y ? tiles[1].offsetTop - first.offsetTop : tiles[1].offsetLeft - first.offsetLeft) : tile + 4;
    this.track.style.setProperty('--wd-pad', `${Math.max(0, (size - tile) / 2)}px`);
    this.center(this.activeIndex(), false);
    this.paint();
  }

  setAxis(axis) {
    this.axis = axis;
    this.track.dataset.axis = axis || '';
    if (axis) requestAnimationFrame(() => this.measure());
  }

  /* ── scrolling ──────────────────────────────────────────────────────── */

  pos() { return this.axis === 'y' ? this.track.scrollTop : this.track.scrollLeft; }
  index() { return this.pitch ? Math.round(this.pos() / this.pitch) : -1; }
  idAt(i) { return this.tiles()[i]?.dataset.wtool; }
  /** The tile for the active tool nearest the current position (the middle copy when idle). */
  activeIndex() {
    const tiles = this.tiles(), id = this.s.toolId;
    const mid = Math.floor(this.copies / 2) * this.ids.length;
    const i = tiles.findIndex((t, k) => k >= mid && t.dataset.wtool === id);
    return i >= 0 ? i : Math.min(mid, Math.max(0, tiles.length - 1));
  }

  center(i, smooth) {
    if (i < 0 || !this.pitch) return;
    const top = this.axis === 'y';
    this.track.scrollTo({ [top ? 'top' : 'left']: i * this.pitch, behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
  }

  onScroll() {
    if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.paint(); });
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.settle(), 120);
  }

  /** Curve the tiles around the lens: bigger and flatter in the middle, tipping away and fading toward the rims. */
  paint() {
    const tiles = this.tiles();
    if (!this.pitch || !this.axis || !tiles.length || tiles[0].classList.contains('lls-wd-none')) return;
    const f = this.pos() / this.pitch, near = Math.round(f), y = this.axis === 'y';
    const lo = Math.max(0, near - 4), hi = Math.min(tiles.length - 1, near + 4);
    for (const t of this.styled) { const k = tiles.indexOf(t); if (k < lo || k > hi) { t.style.transform = ''; t.style.opacity = ''; this.styled.delete(t); } }
    for (let i = lo; i <= hi; i++) {
      const t = tiles[i], d = i - f, a = Math.abs(d);
      const scale = 1.14 - Math.min(a, 3) * 0.17, rot = Math.max(-64, Math.min(64, d * 30)), arc = a * a * 3;
      t.style.transform = y ? `translateX(${-arc}px) rotateX(${-rot}deg) scale(${scale})` : `translateY(${arc}px) rotateY(${rot}deg) scale(${scale})`;
      t.style.opacity = String(Math.max(0.18, 1 - Math.min(a, 3.5) * 0.24));
      this.styled.add(t);
    }
    this.dock.classList.toggle('lls-wd-armed', tiles[near]?.dataset.wtool === this.s.toolId);
  }

  /** The wheel came to rest: a spin picks the tool under the lens, and an endless wheel re-centres itself. */
  settle() {
    if (!this.pitch) return;
    const n = this.ids.length;
    let i = this.index();
    if (this.copies > 1 && (i < n || i >= (this.copies - 1) * n)) {
      i = (i % n + n) % n + Math.floor(this.copies / 2) * n;
      this.center(i, false);
    }
    const id = this.idAt(i);
    if (this.user && id && id !== this.s.toolId) this.s.setTool(id);
    this.user = false;
    this.paint();
  }

  /** Called by Studio.setTool: highlight the active tile, remember it, and turn the wheel to it. */
  sync(initial = false) {
    const id = this.s.toolId;
    for (const t of this.tiles()) {
      const on = t.dataset.wtool === id;
      t.classList.toggle('on', on);
      if (t.matches('.lls-wt')) t.setAttribute('aria-pressed', String(on));
    }
    if (!initial && id !== this.recent[0]) {
      this.recent = [id, ...this.recent.filter((r) => r !== id)].slice(0, 6);
      save(RECENT_KEY, this.recent);
      if (this.recent.length === 2) this.renderFilters();
    }
    if (!initial && this.pitch && this.idAt(this.index()) !== id && this.ids.includes(id)) this.center(this.activeIndex(), true);
    this.paint();
  }

  colors() {
    const { fg, bg } = this.s.colors;
    this.q('.lls-wd-fg').style.background = fg;
    this.q('.lls-wd-bg').style.background = bg;
  }
}
