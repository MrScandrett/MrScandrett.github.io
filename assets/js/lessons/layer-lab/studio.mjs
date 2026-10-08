/* studio.mjs — Layer Lab, the in-lesson photo editor.
 *
 * Mount with:  import { Studio } from './studio.mjs'; new Studio(el, { assetBase: '../../' })
 * The studio owns the window chrome (menus, toolbox, options bar, panels,
 * status bar), the view (zoom/pan), input, and every command. Tools live in
 * tools.mjs, pixels math in pixels.mjs, the layer model in doc.mjs, files in
 * io.mjs, panels in panels.mjs and dialogs in dialogs.mjs. adaptive.mjs fits it to the
 * device: layout by the editor's own size, full screen, touch gestures, menu-bar keys.
 */
import { LayerDoc, makeCanvas, cloneCanvas, getPixels, alphaOf, canvasFromAlpha, newLayer, applyMask, BLEND_MODES } from './doc.mjs';
import { TOOLS, TOOLBOX } from './tools.mjs';
import { selectSubject, contentAwareFill, expandMask, featherMask, autoTone, alphaBounds, defaultParams, ADJUSTMENTS, blurMask } from './pixels.mjs';
import { Drive, openFile, openAsCanvas, exportDoc, download, SAMPLES } from './io.mjs';
import { buildPoster, buildBeach } from './samples.mjs';
import { MissionTracker } from './missions.mjs';
import { renderPanels, renderLayers, renderOptions, renderStatus, PANEL_TABS } from './panels.mjs';
import * as dialogs from './dialogs.mjs';
import { ICONS, icon } from './icons.mjs';
import { watchLayout, setMaximized, showPanels, wireMenubarKeys, wireLongPress, wireGestures, wireTouchGuard } from './adaptive.mjs';

const OPT_KEY = 'classroomos:layerlab:opts:v1';
const DEFAULT_OPTS = {
  size: 30, hardness: 0.8, opacity: 1, tolerance: 32, contiguous: true, sampleAll: false, feather: 0, selMode: 'new',
  autoSelect: true, showTransform: false, snap: true, pixelGrid: true, gradientType: 'linear', gradientToClear: false,
  font: 'Inter, "Segoe UI", system-ui, sans-serif', fontSize: 72, shapeType: 'rect', radius: 0, strokeWidth: 0,
};
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const mod = isMac ? '⌘' : 'Ctrl';

export class Studio {
  static count = 0;

  constructor(root, { assetBase = '' } = {}) {
    this.root = root;
    this.assetBase = assetBase;
    this.docs = [];
    this.doc = null;
    this.toolId = 'move';
    this.colors = { fg: '#111827', bg: '#ffffff' };
    this.guides = [];
    this.clipboard = null;
    this.panelTab = 'properties';
    this.listeners = new Set();
    try { this.opts = { ...DEFAULT_OPTS, ...JSON.parse(localStorage.getItem(OPT_KEY) || '{}') }; } catch { this.opts = { ...DEFAULT_OPTS }; }
    this.drive = new Drive();
    this.missions = new MissionTracker((newly) => {
      for (const m of newly) this.toast(`✓ Mission complete: ${m.title}`, { tone: 'win' });
      if (this.panelTab === 'missions') this.refreshPanels();
      this.emitOutside('missions');
    });
    this.selCache = new WeakMap();
    this.uid = `lls${++Studio.count}`;
    this.sheetView = 'layers';
    this.build();
    this.drive.onChange(() => { if (this.panelTab === 'files') this.refreshPanels(); });
    this.openDoc(buildPoster(), { label: 'Open starter poster' });
  }

  get tool() { return TOOLS[this.toolId]; }
  get view() { return this.doc?.view; }

  /* ── DOM ────────────────────────────────────────────────────────────── */

  build() {
    const r = this.root;
    r.classList.add('lls');
    r.setAttribute('data-memory-ignore', '');
    r.innerHTML = `
      <div class="lls-menubar" role="toolbar" aria-label="Layer Lab menus and actions">
        <span class="lls-logo" aria-hidden="true">${icon('logo')}<b>Layer Lab</b></span>
        <button type="button" aria-haspopup="menu" aria-expanded="false" class="lls-mb lls-mb-all" data-menu="*" aria-label="Menus">${icon('menu')}<span>Menu</span></button>
        ${Object.keys(this.menus()).map((m) => `<button type="button" aria-haspopup="menu" aria-expanded="false" class="lls-mb" data-menu="${m}">${m}</button>`).join('')}
        <span class="lls-spacer"></span>
        <button type="button" class="lls-icon-btn" data-cmd="undo" title="Undo (${mod}+Z)" aria-label="Undo">${icon('undo')}</button>
        <button type="button" class="lls-icon-btn" data-cmd="redo" title="Redo (Shift+${mod}+Z)" aria-label="Redo">${icon('redo')}</button>
        <button type="button" class="lls-icon-btn lls-panels-btn" data-cmd="togglePanels" aria-controls="${this.uid}-panels" aria-expanded="true" title="Show or hide the panels" aria-label="Panels">${icon('panels')}</button>
        <button type="button" class="lls-max" data-cmd="maximize" aria-pressed="false" title="Full screen (F)">${icon('expand')}<span>Full screen</span></button>
      </div>
      <div class="lls-options" role="toolbar" aria-label="Tool options"></div>
      <div class="lls-main">
        <div class="lls-toolbox" role="toolbar" aria-label="Tools" aria-orientation="vertical">
          ${TOOLBOX.map((g) => `<button type="button" class="lls-tool" data-group="${g[0]}" data-tool="${g[0]}">${icon(g[0])}${g.length > 1 ? '<i class="lls-more" aria-hidden="true"></i>' : ''}</button>`).join('')}
          <div class="lls-swatches">
            <button type="button" class="lls-swatch lls-fg" title="Foreground color (click to change)" aria-label="Foreground color"></button>
            <button type="button" class="lls-swatch lls-bg" title="Background color" aria-label="Background color"></button>
            <button type="button" class="lls-swap" title="Swap colors (X)" aria-label="Swap colors">⇄</button>
            <button type="button" class="lls-reset" title="Default black and white (D)" aria-label="Default colors">◩</button>
            <input type="color" class="lls-color-input" tabindex="-1" aria-hidden="true">
          </div>
          <button type="button" class="lls-dock-layers" data-cmd="showLayers" aria-controls="${this.uid}-panels" aria-expanded="false">${icon('layers')}<span>Layers</span></button>
        </div>
        <div class="lls-center">
          <div class="lls-tabs" role="group" aria-label="Open documents"></div>
          <div class="lls-viewport" tabindex="0" aria-label="Canvas. Use the tools to edit; arrow keys nudge with the Move tool.">
            <canvas class="lls-view"></canvas>
            <canvas class="lls-overlay"></canvas>
            <div class="lls-welcome" hidden></div>
            <div class="lls-veil" hidden><div class="lls-veil-card">
              <b>Swipe to keep scrolling</b>
              <div class="lls-veil-row"><button type="button" class="lls-btn">${icon('brush')}Tap to edit here</button><button type="button" class="lls-btn ghost" data-cmd="maximize">${icon('expand')}Full screen</button></div>
              <small>Two fingers pinch to zoom and drag to pan.</small>
            </div></div>
            <div class="lls-drop" hidden><span>Drop to open</span></div>
          </div>
        </div>
        <aside class="lls-panels" id="${this.uid}-panels" aria-label="Panels">
          <section class="lls-panel lls-top">
            <div class="lls-phead">
              <div class="lls-ptabs" role="tablist" aria-label="Panels"><button type="button" role="tab" class="lls-ptab-layers" data-ptab="layers">Layers</button>${PANEL_TABS.map(([id, label]) => `<button type="button" role="tab" data-ptab="${id}">${label}</button>`).join('')}</div>
              <button type="button" class="lls-sheet-x" data-cmd="togglePanels" aria-label="Close panels" title="Close panels (Esc)">×</button>
            </div>
            <div class="lls-pbody" role="tabpanel"></div>
          </section>
          <section class="lls-panel lls-layers" aria-label="Layers"></section>
        </aside>
      </div>
      <div class="lls-status" aria-live="off"></div>
      <div class="lls-menu-pop" role="menu" hidden></div>
      <div class="lls-toast" role="status" aria-live="polite"></div>
      <input type="file" class="lls-file" hidden multiple accept="image/*,.psd,.ora,.layerlab,.json,.svg">
      <dialog class="lls-dialog"></dialog>`;
    const $ = (s) => r.querySelector(s);
    this.el = {
      options: $('.lls-options'), toolbox: $('.lls-toolbox'), tabs: $('.lls-tabs'), viewport: $('.lls-viewport'),
      view: $('.lls-view'), overlay: $('.lls-overlay'), welcome: $('.lls-welcome'), drop: $('.lls-drop'),
      ptabs: $('.lls-ptabs'), pbody: $('.lls-pbody'), layers: $('.lls-layers'), status: $('.lls-status'),
      menuPop: $('.lls-menu-pop'), toast: $('.lls-toast'), file: $('.lls-file'), dialog: $('.lls-dialog'),
      fg: $('.lls-fg'), bg: $('.lls-bg'), colorInput: $('.lls-color-input'),
    };
    this.el.panels = $('.lls-panels');
    this.el.veil = $('.lls-veil');
    this.wireChrome();
    this.wireCanvas();
    this.wireKeys();
    wireMenubarKeys(this);
    wireLongPress(this);
    wireTouchGuard(this);
    watchLayout(this);
    new ResizeObserver(() => { if (this.doc && this.isFitted()) this.fit(); else this.redraw(); }).observe(this.el.viewport);
    this.antsTimer = setInterval(() => { if (this.doc?.selection) { this.ants = (this.ants || 0) + 1; this.drawOverlay(); } }, 140);
    this.updateColors();
    this.setTool('move');
  }

  wireChrome() {
    const r = this.root;
    r.addEventListener('click', (e) => {
      const cmd = e.target.closest('[data-cmd]');
      if (cmd && r.contains(cmd) && !cmd.closest('.lls-menu-pop') && !cmd.closest('.lls-dialog')) { this.run(cmd.dataset.cmd, cmd.dataset.arg); return; }
      const m = e.target.closest('[data-menu]');
      if (m) { this.openMenu(m.dataset.menu, m); return; }
      const t = e.target.closest('.lls-tool');
      if (t) {
        const group = TOOLBOX.find((g) => g[0] === t.dataset.group);
        if (t.dataset.tool === this.toolId && group.length > 1) this.setTool(group[(group.indexOf(this.toolId) + 1) % group.length]);
        else this.setTool(t.dataset.tool);
        return;
      }
      const pt = e.target.closest('[data-ptab]');
      if (pt) {
        if (pt.dataset.ptab === 'layers') this.sheetView = 'layers';
        else { this.sheetView = 'panels'; this.panelTab = pt.dataset.ptab; }
        this.refreshPanels();
      }
    });
    r.addEventListener('contextmenu', (e) => {
      const t = e.target.closest('.lls-tool');
      if (!t) return;
      e.preventDefault();
      const group = TOOLBOX.find((g) => g[0] === t.dataset.group);
      if (group.length > 1) this.popup(t, group.map((id) => ({ label: TOOLS[id].label, shortcut: TOOLS[id].key, action: () => this.setTool(id) })));
    });
    this.el.ptabs.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      const tabs = [...this.el.ptabs.querySelectorAll('[role=tab]')].filter((b) => b.offsetParent);
      const i = tabs.indexOf(document.activeElement);
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : i + (e.key === 'ArrowRight' ? 1 : -1);
      const next = tabs[(j + tabs.length) % tabs.length];
      e.preventDefault();
      next.click();
      this.el.ptabs.querySelector(`[data-ptab="${next.dataset.ptab}"]`).focus();
    });
    this.el.fg.addEventListener('click', () => this.pickColor('fg'));
    this.el.bg.addEventListener('click', () => this.pickColor('bg'));
    r.querySelector('.lls-swap').addEventListener('click', () => this.swapColors());
    r.querySelector('.lls-reset').addEventListener('click', () => this.resetColors());
    this.el.colorInput.addEventListener('input', () => this.setColor(this.pickingColor || 'fg', this.el.colorInput.value));
    this.el.file.addEventListener('change', async () => {
      const files = [...this.el.file.files];
      this.el.file.value = '';
      for (const f of files) {
        if (this.fileMode === 'place') await this.placeBlob(f, f.name);
        else if (this.fileMode === 'drive') { await this.drive.put({ name: f.name, type: f.name.split('.').pop().toLowerCase(), blob: f, source: 'upload' }); this.toast(`Added ${f.name} to the Workshop Drive.`); }
        else await this.openBlob(f, f.name, { source: 'computer' });
      }
    });
    document.addEventListener('pointerdown', (e) => {
      this.engaged = r.contains(e.target);
      if (!e.target.closest('.lls-menu-pop') && !e.target.closest('[data-menu]')) this.closeMenu();
    }, true);
    r.addEventListener('focusin', () => { this.engaged = true; });
    r.addEventListener('paste', (e) => this.onPaste(e));
  }

  wireCanvas() {
    const vp = this.el.viewport, ov = this.el.overlay;
    let active = null;
    // wireGestures routes mouse and pen straight through, holds a touch back
    // for a moment so a second finger can turn it into pinch-zoom / pan.
    wireGestures(this, {
      down: (e) => {
        if (!this.doc) return false;
        vp.focus({ preventScroll: true });
        this.closeMenu();
        if (e.button === 2) return false;
        const t = (e.button === 1 || this.spaceDown ? TOOLS.hand : null) || this.tool;
        active = t;
        t.down?.(this, this.toDoc(e), e);
        this.drawOverlay();
        return true;
      },
      move: (e) => {
        if (!this.doc) return;
        const p = this.toDoc(e);
        this.cursor = p;
        this.hoverInfo(p);
        if (active) active.move?.(this, p, e);
        else if (this.tool.brush || this.tool.id === 'clone') this.drawOverlay();
      },
      up: (e) => {
        if (!active) return;
        const t = active; active = null;
        t.up?.(this, this.toDoc(e), e);
        this.drawOverlay();
      },
    });
    ov.addEventListener('pointerleave', () => { this.cursor = null; this.drawOverlay(); });
    ov.addEventListener('dblclick', () => { if (this.toolId === 'hand') this.fit(); });
    vp.addEventListener('wheel', (e) => {
      if (!this.doc) return;
      // Until someone clicks into the editor, the wheel scrolls the lesson
      // (pinch-zoom on a trackpad arrives as Ctrl+wheel and still zooms).
      if (!this.engaged && !this.maximized && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) this.zoomAt(Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY);
      else { this.view.panX -= e.deltaX; this.view.panY -= e.deltaY; this.redraw(); }
    }, { passive: false });
    vp.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); this.el.drop.hidden = false; } });
    vp.addEventListener('dragleave', (e) => { if (!vp.contains(e.relatedTarget)) this.el.drop.hidden = true; });
    vp.addEventListener('drop', async (e) => {
      e.preventDefault();
      this.el.drop.hidden = true;
      for (const f of e.dataTransfer.files) await this.openBlob(f, f.name, { source: 'computer' });
    });
  }

  wireKeys() {
    document.addEventListener('keydown', (e) => {
      if (!this.engaged && !this.maximized) return;
      if (this.el.dialog.open) return;
      const tag = e.target.tagName;
      const typing = /INPUT|TEXTAREA|SELECT/.test(tag) || e.target.isContentEditable;
      if (e.key === ' ' && !typing) { if (!this.spaceDown) { this.spaceDown = true; this.el.overlay.style.cursor = 'grab'; } e.preventDefault(); return; }
      if (typing) { if (e.key === 'Escape') e.target.blur(); return; }
      const combo = (e.ctrlKey || e.metaKey ? 'Mod+' : '') + (e.altKey ? 'Alt+' : '') + (e.shiftKey ? 'Shift+' : '') + (e.key.length === 1 ? e.key.toUpperCase() : e.key);
      const cmd = this.shortcutMap()[combo];
      if (cmd) { e.preventDefault(); this.run(cmd); return; }
      if (!this.doc) return;
      if (this.tool.onKey?.(this, e)) { e.preventDefault(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toUpperCase();
      if (k === 'X') return this.swapColors();
      if (k === 'D') return this.resetColors();
      if (k === 'F') return this.run('maximize');
      if (e.key === '[' || e.key === ']') { this.setOpt('size', Math.max(1, Math.min(400, Math.round(this.opts.size * (e.key === ']' ? 1.2 : 1 / 1.2))))); this.drawOverlay(); return; }
      if (e.key === 'Escape') { if (this.panelsOverlay && this.panelsShown) this.run('togglePanels'); else if (this.maximized) this.run('maximize'); return; }
      const group = TOOLBOX.find((g) => g.some((id) => TOOLS[id].key === k));
      if (group) {
        e.preventDefault();
        const cur = group.indexOf(this.toolId);
        this.setTool(e.shiftKey && cur >= 0 ? group[(cur + 1) % group.length] : cur >= 0 ? this.toolId : group[0]);
      }
    });
    document.addEventListener('keyup', (e) => { if (e.key === ' ') { this.spaceDown = false; this.el.overlay.style.cursor = ''; } });
  }

  /* ── tools, options, colors ─────────────────────────────────────────── */

  setTool(id) {
    if (!TOOLS[id]) return;
    this.toolId = id;
    for (const b of this.el.toolbox.querySelectorAll('.lls-tool')) {
      const group = TOOLBOX.find((g) => g[0] === b.dataset.group);
      const on = group.includes(id);
      if (on) { b.dataset.tool = id; b.innerHTML = icon(id) + (group.length > 1 ? '<i class="lls-more" aria-hidden="true"></i>' : ''); }
      const t = TOOLS[b.dataset.tool];
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.title = `${t.label} (${t.key})${group.length > 1 ? ' · click again or Shift+' + t.key + ' for ' + group.filter((g) => g !== b.dataset.tool).map((g) => TOOLS[g].label).join(', ') : ''}`;
      b.setAttribute('aria-label', t.label);
    }
    this.el.overlay.style.cursor = this.tool.cursor === 'none' ? 'none' : this.tool.cursor || 'default';
    renderOptions(this);
    renderStatus(this);
    this.drawOverlay();
  }

  setOpt(k, v, rerender = true) {
    this.opts[k] = v;
    try { localStorage.setItem(OPT_KEY, JSON.stringify(this.opts)); } catch { /* ignore */ }
    if (k === 'showTransform' || k === 'pixelGrid') this.redraw();
    if (rerender) renderOptions(this);
  }

  pickColor(which) {
    this.pickingColor = which;
    this.el.colorInput.value = this.colors[which];
    this.el.colorInput.click();
  }
  setColor(which, hex) { this.colors[which] = hex; this.updateColors(); }
  swapColors() { [this.colors.fg, this.colors.bg] = [this.colors.bg, this.colors.fg]; this.updateColors(); }
  resetColors() { this.colors = { fg: '#000000', bg: '#ffffff' }; this.updateColors(); }
  updateColors() {
    this.el.fg.style.background = this.colors.fg;
    this.el.bg.style.background = this.colors.bg;
    this.el.fg.title = `Foreground ${this.colors.fg} (click to change)`;
    this.el.bg.title = `Background ${this.colors.bg}`;
  }

  /* ── documents & view ───────────────────────────────────────────────── */

  openDoc(doc, { label = 'Open', event } = {}) {
    doc.view = { zoom: 1, panX: 0, panY: 0 };
    doc.commit(label);
    doc.dirty = false;
    this.docs.push(doc);
    this.switchDoc(doc);
    this.fit();
    if (event) this.emit(event.type, event.detail);
    return doc;
  }

  switchDoc(doc) {
    this.doc = doc;
    this.el.welcome.hidden = !!doc;
    this.renderTabs();
    this.changed();
    this.refreshPanels();
  }

  closeDoc(doc = this.doc) {
    if (!doc) return;
    if (doc.dirty && !confirm(`Close "${doc.name}"? Changes you haven't saved or exported will be lost.`)) return;
    const i = this.docs.indexOf(doc);
    this.docs.splice(i, 1);
    this.switchDoc(this.docs[Math.min(i, this.docs.length - 1)] || null);
    if (!this.doc) this.showWelcome();
  }

  renderTabs() {
    this.el.tabs.innerHTML = this.docs.map((d) => `<div class="lls-tab${d === this.doc ? ' on' : ''}">
      <button type="button" data-doc="${d.id}"${d === this.doc ? ' aria-current="true"' : ''}>${escapeHtml(d.name)}${d.dirty ? ' •' : ''}<small>${d.width}×${d.height}</small></button>
      <button type="button" class="lls-tab-x" data-close="${d.id}" aria-label="Close ${escapeHtml(d.name)}">×</button></div>`).join('')
      + '<button type="button" class="lls-tab-new" data-cmd="new" title="New document" aria-label="New document">+</button>';
    for (const b of this.el.tabs.querySelectorAll('[data-doc]')) b.onclick = () => this.switchDoc(this.docs.find((d) => d.id === +b.dataset.doc));
    for (const b of this.el.tabs.querySelectorAll('[data-close]')) b.onclick = () => this.closeDoc(this.docs.find((d) => d.id === +b.dataset.close));
  }

  showWelcome() {
    const w = this.el.welcome;
    w.hidden = false;
    w.innerHTML = `<div class="lls-welcome-card"><h3>Start a project</h3>
      <div class="lls-welcome-grid">
        <button type="button" data-cmd="new">${icon('new')}<b>New canvas</b><small>Pick a size</small></button>
        <button type="button" data-cmd="sample" data-arg="poster">${icon('layers')}<b>Starter poster</b><small>Layered, ready to explore</small></button>
        <button type="button" data-cmd="sample" data-arg="moon">${icon('photo')}<b>Sample photo</b><small>NASA Moon, public domain</small></button>
        <button type="button" data-cmd="open">${icon('open')}<b>Open from computer</b><small>PNG, JPEG, PSD, ORA…</small></button>
      </div><p>Or drop an image here.</p></div>`;
    this.refreshPanels();
    this.redraw();
  }

  fit() {
    if (!this.doc) return;
    const vp = this.el.viewport.getBoundingClientRect();
    const pad = Math.min(vp.width, vp.height) < 500 ? 16 : 40;
    const z = Math.min((vp.width - pad) / this.doc.width, (vp.height - pad) / this.doc.height, 4);
    this.setZoom(z > 0 ? z : 1);
    const v = this.view;
    v.fitted = { zoom: v.zoom, panX: v.panX, panY: v.panY };
  }

  /** Show the panels ('layers' or 'panels' picks the page on a phone's sheet), or hide them with false. */
  showPanels(view) { showPanels(this, view); }

  /** True while the view is still exactly where fit() left it, so a resize or rotation can refit. */
  isFitted() {
    const v = this.view, f = v?.fitted;
    return !!f && f.zoom === v.zoom && f.panX === v.panX && f.panY === v.panY;
  }

  setZoom(z, cx, cy) {
    const v = this.view;
    const vp = this.el.viewport.getBoundingClientRect();
    z = Math.min(64, Math.max(0.02, z));
    if (cx == null) {
      v.zoom = z;
      v.panX = (vp.width - this.doc.width * z) / 2;
      v.panY = (vp.height - this.doc.height * z) / 2;
    } else {
      const px = cx - vp.left, py = cy - vp.top;
      const dx = (px - v.panX) / v.zoom, dy = (py - v.panY) / v.zoom;
      v.zoom = z; v.panX = px - dx * z; v.panY = py - dy * z;
    }
    this.redraw();
    renderStatus(this);
  }

  zoomAt(k, cx, cy) { this.setZoom(this.view.zoom * k, cx, cy); }

  toDoc(e) {
    const r = this.el.viewport.getBoundingClientRect(), v = this.view;
    return { x: (e.clientX - r.left - v.panX) / v.zoom, y: (e.clientY - r.top - v.panY) / v.zoom };
  }
  toScreen(x, y) { const v = this.view; return [v.panX + x * v.zoom, v.panY + y * v.zoom]; }

  /* ── rendering ──────────────────────────────────────────────────────── */

  changed() { this.needComposite = true; this.schedule(); }
  redraw() { this.schedule(); }
  schedule() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (this.doc && this.needComposite) { this.needComposite = false; this.doc.render(); }
      this.drawView();
      this.drawOverlay();
    });
  }

  sizeCanvas(c) {
    const r = this.el.viewport.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return dpr;
  }

  drawView() {
    const c = this.el.view, dpr = this.sizeCanvas(c), ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#23262e';
    ctx.fillRect(0, 0, c.width, c.height);
    if (!this.doc) return;
    const v = this.view, d = this.doc;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const x = v.panX, y = v.panY, w = d.width * v.zoom, h = d.height * v.zoom;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = this.checker(ctx); ctx.fillRect(x, y, w, h);
    ctx.imageSmoothingEnabled = v.zoom < 2;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(d.composite, x, y, w, h);
    if (this.opts.pixelGrid && v.zoom >= 8) {
      const vp = this.el.viewport.getBoundingClientRect();
      const x0 = Math.max(0, Math.floor(-v.panX / v.zoom)), x1 = Math.min(d.width, Math.ceil((vp.width - v.panX) / v.zoom));
      const y0 = Math.max(0, Math.floor(-v.panY / v.zoom)), y1 = Math.min(d.height, Math.ceil((vp.height - v.panY) / v.zoom));
      ctx.strokeStyle = 'rgba(128,128,128,.45)'; ctx.lineWidth = 1 / dpr; ctx.beginPath();
      for (let gx = x0; gx <= x1; gx++) { const sx = Math.round((v.panX + gx * v.zoom) * dpr) / dpr; ctx.moveTo(sx, v.panY + y0 * v.zoom); ctx.lineTo(sx, v.panY + y1 * v.zoom); }
      for (let gy = y0; gy <= y1; gy++) { const sy = Math.round((v.panY + gy * v.zoom) * dpr) / dpr; ctx.moveTo(v.panX + x0 * v.zoom, sy); ctx.lineTo(v.panX + x1 * v.zoom, sy); }
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x) - 0.5, Math.round(y) - 0.5, Math.round(w) + 1, Math.round(h) + 1);
  }

  checker(ctx) {
    if (!this._checker) {
      const t = makeCanvas(16, 16), c = t.getContext('2d');
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#d4d4d8'; c.fillRect(0, 0, 8, 8); c.fillRect(8, 8, 8, 8);
      this._checker = t;
    }
    return ctx.createPattern(this._checker, 'repeat');
  }

  drawOverlay() {
    const c = this.el.overlay, dpr = this.sizeCanvas(c), ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    if (!this.doc) return;
    const v = this.view, d = this.doc;
    if (d.selection) {
      const edges = this.selectionEdges();
      ctx.setTransform(dpr * v.zoom, 0, 0, dpr * v.zoom, dpr * v.panX, dpr * v.panY);
      ctx.lineWidth = 1 / v.zoom;
      ctx.beginPath();
      for (let i = 0; i < edges.length; i += 4) { ctx.moveTo(edges[i], edges[i + 1]); ctx.lineTo(edges[i + 2], edges[i + 3]); }
      ctx.setLineDash([]); ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.setLineDash([4 / v.zoom, 4 / v.zoom]); ctx.lineDashOffset = -((this.ants || 0) % 8) / v.zoom; ctx.strokeStyle = '#000'; ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.guides.length) {
      ctx.strokeStyle = '#ff2fd1'; ctx.lineWidth = 1; ctx.beginPath();
      for (const g of this.guides) {
        if (g.x != null) { const [sx] = this.toScreen(g.x, 0); ctx.moveTo(Math.round(sx) + 0.5, 0); ctx.lineTo(Math.round(sx) + 0.5, c.height); }
        if (g.y != null) { const [, sy] = this.toScreen(0, g.y); ctx.moveTo(0, Math.round(sy) + 0.5); ctx.lineTo(c.width, Math.round(sy) + 0.5); }
      }
      ctx.stroke();
    }
    this.tool.overlay?.(this, ctx);
    if (this.tool.brush && this.cursor && !this.spaceDown) {
      const [sx, sy] = this.toScreen(this.cursor.x, this.cursor.y);
      const rad = Math.max(1.5, (this.opts.size * v.zoom) / 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.beginPath(); ctx.arc(sx, sy, rad, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(sx, sy, rad + 1, 0, Math.PI * 2); ctx.stroke();
    }
  }

  /** Marching-ants outline: merged pixel-edge segments, cached per selection canvas. */
  selectionEdges() {
    const sel = this.doc.selection;
    let hit = this.selCache.get(sel);
    if (hit?.edges) return hit.edges;
    const a = this.selectionAlpha();
    const W = this.doc.width, H = this.doc.height, out = [];
    const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && a[y * W + x] >= 128;
    for (let y = 0; y <= H; y++) {
      let run = -1;
      for (let x = 0; x <= W; x++) {
        const edge = x < W && on(x, y) !== on(x, y - 1);
        if (edge && run < 0) run = x;
        if (!edge && run >= 0) { out.push(run, y, x, y); run = -1; }
      }
    }
    for (let x = 0; x <= W; x++) {
      let run = -1;
      for (let y = 0; y <= H; y++) {
        const edge = y < H && on(x, y) !== on(x - 1, y);
        if (edge && run < 0) run = y;
        if (!edge && run >= 0) { out.push(x, run, x, y); run = -1; }
      }
    }
    hit = { ...(hit || {}), edges: out };
    this.selCache.set(sel, hit);
    return out;
  }

  /* ── panels & feedback ──────────────────────────────────────────────── */

  refreshPanels() {
    this.el.panels.dataset.view = this.sheetView;
    renderPanels(this);
    renderLayers(this);
    renderStatus(this);
    this.renderTabs();
    this.root.querySelector('[data-cmd="undo"]').disabled = !this.doc?.canUndo();
    this.root.querySelector('[data-cmd="redo"]').disabled = !this.doc?.canRedo();
  }

  commit(label, { event, ...detail } = {}) {
    if (!this.doc) return;
    this.doc.commit(label);
    this.changed();
    this.refreshPanels();
    this.emit('commit', { label });
    if (event) this.emit(event, detail);
  }

  emit(type, detail = {}) {
    const e = { type, detail, doc: this.doc };
    this.missions.check(e);
    for (const fn of this.listeners) fn(e);
  }
  on(fn) { this.listeners.add(fn); }
  emitOutside(type) { this.root.dispatchEvent(new CustomEvent('layerlab:' + type, { bubbles: true })); }

  toast(msg, { tone, action } = {}) {
    const t = this.el.toast;
    t.innerHTML = '';
    t.className = 'lls-toast show' + (tone ? ' ' + tone : '');
    t.append(document.createTextNode(msg));
    if (action) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = action.label;
      b.onclick = () => { action.run(); t.classList.remove('show'); };
      t.append(b);
    }
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('show'), action ? 7000 : 3800);
  }

  hoverInfo(p) {
    this.hover = p;
    renderStatus(this);
  }

  focusTextEditor(select) {
    this.panelTab = 'properties';
    this.refreshPanels();
    const ta = this.el.pbody.querySelector('textarea');
    if (ta) { ta.focus(); if (select) ta.select(); }
  }

  /* ── selection helpers used by tools ────────────────────────────────── */

  selectionAlpha() {
    const sel = this.doc.selection;
    if (!sel) return null;
    let hit = this.selCache.get(sel);
    if (!hit?.alpha) { hit = { ...(hit || {}), alpha: alphaOf(sel) }; this.selCache.set(sel, hit); }
    return hit.alpha;
  }

  selectionCanvasFor(w, h, ox, oy) {
    if (!this.doc.selection) return null;
    const c = makeCanvas(w, h);
    c.getContext('2d').drawImage(this.doc.selection, -ox, -oy);
    return c;
  }

  setSelection(shape, mode = 'new', label = 'Select', { smart } = {}) {
    const d = this.doc, W = d.width, H = d.height;
    if (this.opts.feather > 0 && /Marquee|Lasso/.test(label)) shape = canvasFromAlpha(featherMask(alphaOf(shape), W, H, this.opts.feather), W, H);
    const cur = d.selection;
    const out = makeCanvas(W, H), ctx = out.getContext('2d');
    if (mode !== 'new' && cur) ctx.drawImage(cur, 0, 0);
    ctx.globalCompositeOperation = mode === 'subtract' ? 'destination-out' : mode === 'intersect' && cur ? 'destination-in' : 'source-over';
    ctx.drawImage(shape, 0, 0);
    const a = alphaOf(out);
    d.selection = a.some((v) => v > 0) ? out : null;
    this.lastSelectionSmart = smart || null;
    this.commit(label, { event: 'select', smart });
  }

  deselect() {
    if (!this.doc?.selection) return;
    this.doc.selection = null;
    this.commit('Deselect');
  }

  /**
   * The canvas the painting tools should draw on: the active layer's pixels, or
   * its mask when the mask thumbnail is selected. Makes it writable (copy-on-write).
   */
  paintTarget({ pixelsOnly = false } = {}) {
    const d = this.doc, L = d?.active;
    if (!L) { this.toast('Make or pick a layer first.'); return null; }
    if (L.locked) { this.toast(`"${L.name}" is locked. Click its lock in the Layers panel to unlock it.`); return null; }
    if (!L.visible) { this.toast(`"${L.name}" is hidden. Turn its eye on before you edit it.`); return null; }
    if (L.mask && L.editMask && !pixelsOnly) {
      const canvas = d.writable(L, 'mask');
      return { kind: 'mask', L, canvas, ox: L.mask.x, oy: L.mask.y, writable: () => canvas };
    }
    if (L.kind === 'adjust') { this.toast('Adjustment layers have no pixels. Click its mask thumbnail to paint where the adjustment shows.'); return null; }
    if (L.kind !== 'pixel') {
      this.toast(`"${L.name}" is a live ${L.kind} layer. Rasterize it to paint on it (it will stop being editable).`, { action: { label: 'Rasterize', run: () => this.run('rasterize') } });
      return null;
    }
    const canvas = d.coverDocument(L);
    return { kind: 'pixels', L, canvas, ox: L.x, oy: L.y, writable: () => canvas };
  }

  /** Pixels to sample (doc coordinates): all layers, or just the active one. */
  sampleImage(all = this.opts.sampleAll) {
    const d = this.doc;
    if (all) { d.render(); return getPixels(d.composite); }
    const L = d.active;
    if (!L || L.kind === 'adjust') { d.render(); return getPixels(d.composite); }
    const c = makeCanvas(d.width, d.height), s = d.finished(L, { skipFx: true });
    if (s) c.getContext('2d').drawImage(s.canvas, s.x, s.y);
    return getPixels(c);
  }

  colorAt(x, y, all = true) {
    const d = this.doc;
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= d.width || y >= d.height) return null;
    if (all) return [...getPixels(d.composite, x, y, 1, 1).data];
    const L = d.active, s = L && d.finished(L, { skipFx: true });
    if (!s) return null;
    const lx = x - s.x, ly = y - s.y;
    if (lx < 0 || ly < 0 || lx >= s.canvas.width || ly >= s.canvas.height) return [0, 0, 0, 0];
    return [...getPixels(s.canvas, lx, ly, 1, 1).data];
  }

  cropTo(x, y, w, h, label = 'Crop') {
    const d = this.doc;
    for (const L of d.layers) { L.x -= x; L.y -= y; if (L.mask) { L.mask.x -= x; L.mask.y -= y; } }
    d.width = w; d.height = h; d.composite = makeCanvas(w, h); d.selection = null;
    this.commit(label, { event: 'crop' });
    this.fit();
  }

  /* ── files ──────────────────────────────────────────────────────────── */

  async openBlob(blob, name, { source = 'computer', driveId } = {}) {
    try {
      const { doc, kind, notes } = await openFile(blob, name);
      this.openDoc(doc, { label: `Open ${kind.toUpperCase()}`, event: { type: 'open', detail: { source, kind, driveId } } });
      if (notes.length > 1 || ['psd', 'ora'].includes(kind)) dialogs.importReport(this, name, kind, notes);
      else this.toast(notes[0] || `Opened ${name}`);
    } catch (err) {
      this.toast(`Could not open ${name}: ${err.message}`, { tone: 'err' });
    }
  }

  async placeBlob(blob, name) {
    if (!this.doc) return this.openBlob(blob, name);
    try {
      const { canvas, notes, name: n } = await openAsCanvas(blob, name);
      const d = this.doc;
      const k = Math.min(1, d.width / canvas.width, d.height / canvas.height);
      let c = canvas;
      if (k < 1) { c = makeCanvas(canvas.width * k, canvas.height * k); const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(canvas, 0, 0, c.width, c.height); }
      const L = newLayer('pixel', { name: n, canvas: c, x: Math.round((d.width - c.width) / 2), y: Math.round((d.height - c.height) / 2) });
      d.add(L);
      this.commit('Place', { event: 'place' });
      this.toast(`Placed ${name} as a new layer${k < 1 ? ` (scaled to ${Math.round(k * 100)}% to fit)` : ''}.${notes.length > 1 ? ' ' + notes.slice(1).join(' ') : ''}`);
    } catch (err) {
      this.toast(`Could not place ${name}: ${err.message}`, { tone: 'err' });
    }
  }

  async openSample(id, { place = false } = {}) {
    const s = SAMPLES.find((x) => x.id === id);
    if (!s) return;
    if (s.kind === 'build') {
      const doc = id === 'poster' ? buildPoster() : buildBeach();
      return this.openDoc(doc, { label: 'Open sample', event: { type: 'open', detail: { source: 'sample', kind: 'sample', id } } });
    }
    try {
      const res = await fetch(this.assetBase + s.url);
      if (!res.ok) throw new Error(res.status);
      const blob = await res.blob();
      if (place) return this.placeBlob(blob, s.name);
      const { doc } = await openFile(blob, s.name);
      this.openDoc(doc, { label: 'Open sample', event: { type: 'open', detail: { source: 'sample', kind: 'jpeg', id } } });
      this.toast(`${s.name} · ${s.credit}`);
    } catch {
      this.toast('That sample could not be loaded (are you offline?).', { tone: 'err' });
    }
  }

  async exportAs(format, opts = {}) {
    const { blob, filename, notes } = await exportDoc(this.doc, format, opts);
    if (opts.toDrive !== false) await this.drive.put({ name: filename, type: format, blob, source: 'export', note: notes.join(' ') });
    if (opts.download) download(blob, filename);
    if (format === 'layerlab') { this.doc.dirty = false; this.renderTabs(); }
    this.emit('export', { format, size: blob.size });
    return { blob, filename, notes };
  }

  onPaste(e) {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
    if (!item) return;
    e.preventDefault();
    const f = item.getAsFile();
    if (f) this.placeBlob(f, 'Pasted image');
  }

  /* ── commands ───────────────────────────────────────────────────────── */

  menus() {
    const S = (k) => k.replace('Mod', mod);
    return {
      File: [
        ['New…', 'new', S('Mod+Alt+N')], ['Open from computer…', 'open', S('Mod+O')], ['Open from Workshop Drive', 'files', S('Shift+Mod+O')],
        ['Place image as layer…', 'place'], ['Sample files', 'files'], '-',
        ['Save project to Drive', 'save', S('Mod+S')], ['Export As…', 'export', S('Shift+Mod+E')], ['Quick export PNG', 'quickPng'], '-',
        ['Close document', 'close'],
      ],
      Edit: [
        ['Undo', 'undo', S('Mod+Z')], ['Redo', 'redo', S('Shift+Mod+Z')], '-',
        ['Cut', 'cut', S('Mod+X')], ['Copy', 'copy', S('Mod+C')], ['Copy merged', 'copyMerged', S('Shift+Mod+C')], ['Paste', 'paste', S('Mod+V')], ['Clear', 'clear', 'Delete'], '-',
        ['Fill with foreground', 'fill', 'Alt+Backspace'], ['Content-Aware Fill', 'caf', 'Shift+Backspace'], '-',
        ['Free Transform', 'transform', S('Mod+Alt+T')], ['Rotate layer 90° clockwise', 'rotLayer'], ['Flip layer horizontal', 'flipLayerH'], ['Flip layer vertical', 'flipLayerV'],
      ],
      Image: [
        ...Object.entries(ADJUSTMENTS).map(([k, a]) => [`Adjust pixels: ${a.label}…`, 'adjustPixels', '', k]),
        ['Auto Tone', 'autoTone', S('Shift+Mod+L')], '-',
        ['Image Size…', 'imageSize', S('Mod+Alt+I')], ['Canvas Size…', 'canvasSize', S('Mod+Alt+C')],
        ['Crop to Selection', 'cropSel'], ['Trim transparent edges', 'trim'], '-',
        ['Rotate canvas 90° clockwise', 'rotCanvas', '', 'cw'], ['Rotate canvas 90° counter-clockwise', 'rotCanvas', '', 'ccw'], ['Flip canvas horizontal', 'rotCanvas', '', 'fh'],
      ],
      Layer: [
        ['New Layer', 'newLayer', 'Alt+Shift+N'], ['New Adjustment Layer…', 'newAdjust'], ['Duplicate Layer / Layer via Copy', 'dup', S('Mod+J')], ['Delete Layer', 'deleteLayer'], '-',
        ['Add Mask (reveal all)', 'addMask'], ['Add Mask from Selection', 'maskFromSel'], ['Invert Mask', 'invertMask'], ['Apply Mask', 'applyMask'], ['Delete Mask', 'deleteMask'], '-',
        ['Remove Background ✦', 'removeBg'], ['Layer Effects…', 'fx'], ['Rasterize', 'rasterize'], '-',
        ['Merge Down', 'mergeDown', S('Mod+E')], ['Flatten Image', 'flatten'], '-',
        ['Bring Forward', 'raise', S('Mod+]')], ['Send Backward', 'lower', S('Mod+[')],
        ['Align left edges', 'align', '', 'left'], ['Align horizontal centers', 'align', '', 'hcenter'], ['Align right edges', 'align', '', 'right'],
        ['Align top edges', 'align', '', 'top'], ['Align vertical centers', 'align', '', 'vcenter'], ['Align bottom edges', 'align', '', 'bottom'],
      ],
      Select: [
        ['All', 'selectAll', S('Mod+A')], ['Deselect', 'deselect', S('Mod+D')], ['Inverse', 'invertSel', S('Shift+Mod+I')], '-',
        ['Subject ✦', 'subject'], ['Color Range…', 'colorRange'], ['Layer Pixels', 'layerPixels'], '-',
        ['Expand…', 'modSel', '', 'expand'], ['Contract…', 'modSel', '', 'contract'], ['Feather…', 'modSel', 'Shift+F6', 'feather'],
      ],
      Filter: [
        ['Gaussian Blur…', 'filter', '', 'blur'], ['Sharpen (Unsharp Mask)…', 'filter', '', 'sharpen'], ['Add Noise…', 'filter', '', 'noise'], ['Pixelate…', 'filter', '', 'pixelate'],
      ],
      View: [
        ['Zoom In', 'zoomIn', S('Mod+=')], ['Zoom Out', 'zoomOut', S('Mod+-')], ['Fit on Screen', 'fit', S('Mod+0')], ['Actual Pixels (100%)', 'actual', S('Mod+1')], '-',
        [`${this.opts.pixelGrid ? '✓ ' : ''}Pixel grid (zoom past 800%)`, 'toggleGrid'], [`${this.opts.snap ? '✓ ' : ''}Smart guides`, 'toggleSnap'], ['Full screen', 'maximize', 'F'],
      ],
      Help: [['Keyboard shortcuts', 'shortcuts'], ['Missions', 'missions'], ['About Layer Lab', 'about']],
    };
  }

  shortcutMap() {
    const m = {};
    for (const items of Object.values(this.menus())) for (const it of items) {
      if (!Array.isArray(it) || !it[2]) continue;
      const key = it[2].replace('⌘', 'Mod').replace('Ctrl', 'Mod').split('+').map((p) => (p.length === 1 ? p.toUpperCase() : p));
      const order = ['Mod', 'Alt', 'Shift'];
      const mods = order.filter((o) => key.includes(o));
      const k = key.filter((p) => !order.includes(p)).join('+');
      m[[...mods, k].join('+')] = it[3] ? `${it[1]}:${it[3]}` : it[1];
    }
    Object.assign(m, { 'Backspace': 'clear', 'Mod+Shift+Z': 'redo', 'Mod+Y': 'redo', 'Mod+=': 'zoomIn', 'Mod++': 'zoomIn', 'Mod+Shift++': 'zoomIn', 'Mod+_': 'zoomOut', 'Mod+Shift+_': 'zoomOut' });
    return m;
  }

  openMenu(name, anchor, { fromAll = false } = {}) {
    if (this.openMenuName === name && !fromAll) return this.closeMenu();
    const menus = this.menus();
    // "*" is the single Menu button narrow layouts use: a list of menus, each opening in place.
    const items = name === '*'
      ? Object.keys(menus).map((m) => ({ label: m, shortcut: '›', keep: true, action: () => this.openMenu(m, anchor, { fromAll: true }) }))
      : [...(fromAll ? [{ label: '‹ All menus', keep: true, action: () => this.openMenu('*', anchor, { fromAll: true }) }, '-'] : []),
        ...menus[name].map((it) => (it === '-' ? '-' : { label: it[0], shortcut: it[2], action: () => this.run(it[1], it[3]) }))];
    this.popup(anchor, items, name === '*' ? 'Menus' : name);
    this.openMenuName = fromAll ? '*' : name;
    anchor.setAttribute('aria-expanded', 'true');
  }

  popup(anchor, items, label = '') {
    const pop = this.el.menuPop;
    if (this.menuAnchor && this.menuAnchor !== anchor) this.menuAnchor.setAttribute('aria-expanded', 'false');
    this.menuAnchor = anchor;
    pop.innerHTML = '';
    pop.setAttribute('aria-label', label);
    for (const it of items) {
      if (it === '-') { pop.append(Object.assign(document.createElement('hr'), {})); continue; }
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'menuitem'); b.tabIndex = -1;
      b.innerHTML = `<span>${escapeHtml(it.label)}</span>${it.shortcut ? `<kbd>${escapeHtml(it.shortcut)}</kbd>` : ''}`;
      b.onclick = () => { if (!it.keep) { this.closeMenu(); anchor.focus({ preventScroll: true }); } it.action(); };
      pop.append(b);
    }
    // Open below the anchor, or above it when the anchor sits low (the phone tool bar), and stay inside the editor.
    const rr = this.root.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
    pop.hidden = false;
    pop.style.maxHeight = '';
    const below = rr.bottom - ar.bottom - 6, above = ar.top - rr.top - 6;
    const up = below < Math.min(pop.offsetHeight, 320) && above > below;
    pop.style.maxHeight = `${Math.max(160, up ? above : below)}px`;
    pop.style.left = `${Math.max(4, Math.min(ar.left - rr.left, rr.width - pop.offsetWidth - 4))}px`;
    pop.style.top = up ? `${Math.max(4, ar.top - rr.top - pop.offsetHeight)}px` : `${ar.bottom - rr.top}px`;
    pop.querySelector('button')?.focus();
    pop.onkeydown = (e) => {
      const bs = [...pop.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
      const go = (j) => { e.preventDefault(); bs[(j + bs.length) % bs.length].focus(); };
      if (e.key === 'ArrowDown') go(i + 1);
      else if (e.key === 'ArrowUp') go(i - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(bs.length - 1);
      else if (e.key === 'Escape') { e.preventDefault(); this.closeMenu(); anchor.focus(); }
      else if (e.key === 'Tab') this.closeMenu();
      else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && anchor.matches('.lls-mb:not(.lls-mb-all)')) {
        // Left/right walks across the menu bar like a desktop app.
        e.preventDefault();
        const mbs = [...this.root.querySelectorAll('.lls-mb:not(.lls-mb-all)')], k = mbs.indexOf(anchor);
        const next = mbs[(k + (e.key === 'ArrowRight' ? 1 : -1) + mbs.length) % mbs.length];
        this.closeMenu();
        this.openMenu(next.dataset.menu, next);
      } else if (e.key.length === 1 && /\S/.test(e.key)) {
        // Type-ahead: jump to the next item starting with that letter.
        const k = e.key.toLowerCase(), order = [...bs.slice(i + 1), ...bs.slice(0, i + 1)];
        order.find((b) => b.textContent.trim().replace(/^[✓‹]\s*/, '').toLowerCase().startsWith(k))?.focus();
      }
    };
  }

  closeMenu() {
    this.el.menuPop.hidden = true;
    this.openMenuName = null;
    this.menuAnchor?.setAttribute('aria-expanded', 'false');
    this.menuAnchor = null;
  }

  needDoc() { if (!this.doc) { this.toast('Open or create a document first.'); return false; } return true; }
  needLayer(kinds) {
    const L = this.doc?.active;
    if (!L) { this.toast('Pick a layer first.'); return null; }
    if (kinds && !kinds.includes(L.kind)) {
      this.toast(L.kind === 'adjust' ? 'That only works on layers with pixels, not adjustment layers.' : `"${L.name}" is a live ${L.kind} layer. Rasterize it first (Layer › Rasterize).`,
        L.kind !== 'adjust' ? { action: { label: 'Rasterize', run: () => this.run('rasterize') } } : {});
      return null;
    }
    return L;
  }

  async run(cmd, arg) {
    if (cmd.includes(':')) [cmd, arg] = cmd.split(':');
    const d = this.doc;
    const always = ['new', 'open', 'files', 'maximize', 'shortcuts', 'about', 'missions', 'sample', 'place', 'togglePanels', 'showLayers', 'tip'];
    if (!always.includes(cmd) && !this.needDoc()) return;
    switch (cmd) {
      case 'new': return dialogs.newDoc(this);
      case 'open': this.fileMode = 'open'; return this.el.file.click();
      case 'place': this.fileMode = 'place'; return this.el.file.click();
      case 'files': this.panelTab = 'files'; return this.showPanels('panels');
      case 'missions': this.panelTab = 'missions'; return this.showPanels('panels');
      case 'togglePanels': return this.showPanels(this.panelsShown ? false : this.sheetView);
      case 'showLayers': return this.showPanels(this.panelsShown && this.sheetView === 'layers' && this.panelsOverlay ? false : 'layers');
      case 'tip': return this.toast(`${this.tool.label}: ${this.tool.tip || ''}`);
      case 'sample': return this.openSample(arg);
      case 'save': { const { filename } = await this.exportAs('layerlab'); return this.toast(`Saved ${filename} to the Workshop Drive.`); }
      case 'export': return dialogs.exportDialog(this);
      case 'quickPng': { const { filename } = await this.exportAs('png', { download: true }); return this.toast(`Exported ${filename} (also in Files).`); }
      case 'close': return this.closeDoc();
      case 'undo': d.undo(); this.changed(); return this.refreshPanels();
      case 'redo': d.redo(); this.changed(); return this.refreshPanels();
      case 'history': d.restore(+arg); this.changed(); return this.refreshPanels();
      case 'maximize': return setMaximized(this, !this.maximized);
      case 'zoomIn': return this.setZoom(this.view.zoom * 1.25);
      case 'zoomOut': return this.setZoom(this.view.zoom / 1.25);
      case 'fit': return this.fit();
      case 'actual': return this.setZoom(1);
      case 'toggleGrid': return this.setOpt('pixelGrid', !this.opts.pixelGrid);
      case 'toggleSnap': return this.setOpt('snap', !this.opts.snap);
      case 'shortcuts': return dialogs.shortcuts(this);
      case 'about': return dialogs.about(this);
      case 'transform': this.setTool('move'); return this.setOpt('showTransform', !this.opts.showTransform);
      case 'cropApply': return TOOLS.crop.apply(this);
      case 'cropCancel': TOOLS.crop.rect = null; return this.redraw();
      default: return this.runDocCommand(cmd, arg);
    }
  }

  runDocCommand(cmd, arg) {
    const d = this.doc, W = d.width, H = d.height;
    switch (cmd) {
      case 'newLayer': {
        const n = d.layers.filter((l) => /^Layer \d+$/.test(l.name)).length + 1;
        d.addPixelLayer(`Layer ${n}`);
        return this.commit('New Layer', { event: 'new-layer' });
      }
      case 'newAdjust': return dialogs.adjustmentPicker(this);
      case 'addAdjust': {
        const a = ADJUSTMENTS[arg];
        const L = newLayer('adjust', { name: a.label, adjust: { kind: arg, params: defaultParams(arg) } });
        const m = d.selection ? cloneCanvas(d.selection) : (() => { const c = makeCanvas(W, H), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); return c; })();
        L.mask = { x: 0, y: 0, canvas: m, enabled: true };
        d.add(L);
        this.panelTab = 'properties';
        return this.commit(`New ${a.label} layer`, { event: 'adjust-layer' });
      }
      case 'dup': {
        const L = d.active;
        if (!L) return;
        if (d.selection && L.kind === 'pixel') {
          const s = d.finished(L, { skipFx: true });
          const c = makeCanvas(W, H), ctx = c.getContext('2d');
          ctx.drawImage(s.canvas, s.x, s.y);
          ctx.globalCompositeOperation = 'destination-in';
          ctx.drawImage(d.selection, 0, 0);
          d.add(newLayer('pixel', { name: `${L.name} (copy)`, canvas: c }));
          return this.commit('Layer via Copy', { event: this.lastSelectionSmart ? 'cutout' : 'layer-copy' });
        }
        const copy = { ...structuredCloneLayer(L), id: newLayer('pixel').id, name: `${L.name} copy` };
        d.add(copy);
        return this.commit('Duplicate Layer');
      }
      case 'deleteLayer': {
        const L = d.active;
        if (!L) return;
        const i = d.indexOf(L);
        d.layers.splice(i, 1);
        d.activeId = (d.layers[i] || d.layers[i - 1])?.id ?? null;
        return this.commit('Delete Layer');
      }
      case 'raise': case 'lower': {
        const L = d.active; if (!L) return;
        const i = d.indexOf(L), j = cmd === 'raise' ? i + 1 : i - 1;
        if (j < 0 || j >= d.layers.length) return;
        [d.layers[i], d.layers[j]] = [d.layers[j], d.layers[i]];
        return this.commit(cmd === 'raise' ? 'Bring Forward' : 'Send Backward');
      }
      case 'moveLayer': {
        const [from, to] = arg;
        const [L] = d.layers.splice(from, 1);
        d.layers.splice(to, 0, L);
        return this.commit('Reorder Layers');
      }
      case 'addMask': case 'maskFromSel': {
        const L = d.active; if (!L) return;
        if (L.mask) return this.toast('This layer already has a mask. Click its thumbnail to paint on it.');
        if (cmd === 'maskFromSel' && !d.selection) return this.toast('Make a selection first: the mask will show only what is selected.');
        const m = cmd === 'maskFromSel' || d.selection ? cloneCanvas(d.selection) : (() => { const c = makeCanvas(W, H), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); return c; })();
        L.mask = { x: 0, y: 0, canvas: m, enabled: true };
        L.editMask = true;
        if (d.selection) d.selection = null;
        this.toast('Mask added and selected. Paint black to hide, white to bring back.');
        return this.commit('Add Layer Mask', { event: cmd === 'maskFromSel' && this.lastSelectionSmart ? 'cutout' : 'mask' });
      }
      case 'invertMask': {
        const L = d.active; if (!L?.mask) return this.toast('This layer has no mask.');
        const c = makeCanvas(L.mask.canvas.width, L.mask.canvas.height), x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.globalCompositeOperation = 'destination-out'; x.drawImage(L.mask.canvas, 0, 0);
        L.mask = { ...L.mask, canvas: c };
        return this.commit('Invert Mask', { event: 'mask-hide' });
      }
      case 'applyMask': {
        const L = this.needLayer(['pixel']); if (!L) return;
        if (!L.mask) return this.toast('This layer has no mask.');
        const s = applyMask({ canvas: L.canvas, x: L.x, y: L.y }, L.mask);
        L.canvas = s.canvas; L.mask = null; L.editMask = false;
        return this.commit('Apply Layer Mask');
      }
      case 'deleteMask': {
        const L = d.active; if (!L?.mask) return;
        L.mask = null; L.editMask = false;
        return this.commit('Delete Layer Mask');
      }
      case 'toggleMask': {
        const L = d.active; if (!L?.mask) return;
        L.mask = { ...L.mask, enabled: L.mask.enabled === false };
        return this.commit(L.mask.enabled ? 'Enable Mask' : 'Disable Mask');
      }
      case 'removeBg': {
        const L = this.needLayer(['pixel']); if (!L) return;
        const img = getPixels(L.canvas);
        const m = blurMask(selectSubject(img, { tolerance: 60 }), img.width, img.height, 1);
        const c = makeCanvas(W, H);
        c.getContext('2d').drawImage(canvasFromAlpha(m, img.width, img.height), L.x, L.y);
        if (L.mask) { const x = c.getContext('2d'); x.globalCompositeOperation = 'destination-in'; x.drawImage(L.mask.canvas, L.mask.x, L.mask.y); }
        L.mask = { x: 0, y: 0, canvas: c, enabled: true };
        L.editMask = true;
        this.toast('Background hidden with a mask. Nothing was deleted: paint white on the mask to bring parts back.');
        return this.commit('Remove Background', { event: 'cutout' });
      }
      case 'fx': this.panelTab = 'properties'; this.refreshPanels(); return this.el.pbody.querySelector('.lls-fx')?.scrollIntoView({ block: 'nearest' });
      case 'rasterize': {
        const L = d.active; if (!L || L.kind === 'pixel' || L.kind === 'adjust') return;
        d.rasterize(L);
        return this.commit('Rasterize Layer');
      }
      case 'mergeDown': {
        const L = d.active, i = d.indexOf(L);
        if (!L || i < 1) return this.toast('There is no layer below to merge into.');
        const below = d.layers[i - 1];
        if (below.kind === 'adjust') return this.toast('The layer below is an adjustment layer; it has no pixels to merge into.');
        const tmp = new LayerDoc(W, H);
        tmp.layers = [{ ...below, opacity: below.opacity, blend: 'normal' }, L];
        const c = tmp.render(makeCanvas(W, H));
        const merged = newLayer('pixel', { name: below.name, canvas: c, blend: below.blend, visible: true });
        d.layers.splice(i - 1, 2, merged);
        d.activeId = merged.id;
        return this.commit('Merge Down');
      }
      case 'flatten': {
        const c = makeCanvas(W, H), x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
        x.drawImage(d.render(makeCanvas(W, H)), 0, 0);
        const L = newLayer('pixel', { name: 'Background', canvas: c });
        d.layers = [L]; d.activeId = L.id;
        return this.commit('Flatten Image');
      }
      case 'align': {
        const L = d.active, b = L && d.bounds(L);
        if (!b) return this.toast('Pick a layer with something on it.');
        let t = { x: 0, y: 0, width: W, height: H };
        if (d.selection) { const sb = alphaBounds(getPixels(d.selection).data, W, H); if (sb) t = sb; }
        let dx = 0, dy = 0;
        if (arg === 'left') dx = t.x - b.x; if (arg === 'right') dx = t.x + t.width - (b.x + b.width); if (arg === 'hcenter') dx = Math.round(t.x + t.width / 2 - (b.x + b.width / 2));
        if (arg === 'top') dy = t.y - b.y; if (arg === 'bottom') dy = t.y + t.height - (b.y + b.height); if (arg === 'vcenter') dy = Math.round(t.y + t.height / 2 - (b.y + b.height / 2));
        L.x += dx; L.y += dy;
        if (L.mask) { L.mask.x += dx; L.mask.y += dy; }
        return this.commit('Align', { event: 'align' });
      }
      case 'selectAll': { const c = makeCanvas(W, H), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); return this.setSelection(c, 'new', 'Select All'); }
      case 'deselect': return this.deselect();
      case 'invertSel': {
        const c = makeCanvas(W, H), x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
        if (d.selection) { x.globalCompositeOperation = 'destination-out'; x.drawImage(d.selection, 0, 0); }
        const smart = this.lastSelectionSmart;
        this.setSelection(c, 'new', 'Inverse', { smart });
        return;
      }
      case 'subject': {
        const m = selectSubject(this.sampleImage(), { tolerance: 60 });
        if (!m.some(Boolean)) return this.toast('No subject found: the picture looks like all background.');
        return this.setSelection(canvasFromAlpha(m, W, H), 'new', 'Select Subject', { smart: 'subject' });
      }
      case 'colorRange': return dialogs.colorRange(this);
      case 'layerPixels': {
        const L = d.active, s = L && d.finished(L, { skipFx: true });
        if (!s) return;
        const c = makeCanvas(W, H); c.getContext('2d').drawImage(s.canvas, s.x, s.y);
        return this.setSelection(c, 'new', 'Select Layer Pixels');
      }
      case 'modSel': if (!d.selection) return this.toast('Make a selection first.'); return dialogs.modifySelection(this, arg);
      case 'clear': {
        if (!d.selection) return this.toast('Select an area first. (To delete a whole layer, use the trash button in Layers.)');
        const t = this.paintTarget(); if (!t) return;
        const x = t.canvas.getContext('2d');
        x.globalCompositeOperation = 'destination-out';
        x.drawImage(d.selection, -t.ox, -t.oy);
        x.globalCompositeOperation = 'source-over';
        return this.commit(t.kind === 'mask' ? 'Clear (mask)' : 'Clear', { event: t.kind === 'mask' ? 'mask-hide' : this.lastSelectionSmart ? 'cutout' : 'clear' });
      }
      case 'fill': {
        const t = this.paintTarget(); if (!t) return;
        const x = t.canvas.getContext('2d');
        const f = makeCanvas(t.canvas.width, t.canvas.height), fx = f.getContext('2d');
        fx.fillStyle = t.kind === 'mask' ? '#fff' : this.colors.fg; fx.fillRect(0, 0, f.width, f.height);
        if (d.selection) { fx.globalCompositeOperation = 'destination-in'; fx.drawImage(d.selection, -t.ox, -t.oy); }
        if (t.kind === 'mask' && lumHex(this.colors.fg) < 128) { x.globalCompositeOperation = 'destination-out'; }
        x.drawImage(f, 0, 0); x.globalCompositeOperation = 'source-over';
        return this.commit('Fill', { event: t.kind === 'mask' && lumHex(this.colors.fg) < 128 ? 'mask-hide' : 'paint' });
      }
      case 'caf': {
        if (!d.selection) return this.toast('Select the thing to remove first (Lasso works well), then choose Content-Aware Fill.');
        const t = this.paintTarget({ pixelsOnly: true }); if (!t) return;
        const sel = getPixels(this.selectionCanvasFor(t.canvas.width, t.canvas.height, t.ox, t.oy));
        const a = new Uint8Array(t.canvas.width * t.canvas.height);
        for (let i = 0; i < a.length; i++) a[i] = sel.data[i * 4 + 3];
        const grown = expandMask(a, t.canvas.width, t.canvas.height, 2);
        const img = getPixels(t.canvas);
        contentAwareFill(img, grown);
        t.canvas.getContext('2d').putImageData(img, 0, 0);
        d.selection = null;
        return this.commit('Content-Aware Fill', { event: 'heal' });
      }
      case 'copy': case 'cut': case 'copyMerged': {
        let src;
        if (cmd === 'copyMerged') { d.render(); src = { canvas: d.composite, x: 0, y: 0 }; }
        else { const L = d.active; src = L && d.finished(L, { skipFx: true }); }
        if (!src) return;
        const c = makeCanvas(W, H), x = c.getContext('2d');
        x.drawImage(src.canvas, src.x, src.y);
        if (d.selection) { x.globalCompositeOperation = 'destination-in'; x.drawImage(d.selection, 0, 0); }
        const b = alphaBounds(getPixels(c).data, W, H);
        if (!b) return this.toast('Nothing to copy there.');
        const clip = makeCanvas(b.width, b.height);
        clip.getContext('2d').drawImage(c, -b.x, -b.y);
        this.clipboard = { canvas: clip, x: b.x, y: b.y };
        try { clip.toBlob((blob) => blob && navigator.clipboard?.write?.([new ClipboardItem({ 'image/png': blob })]).catch(() => {})); } catch { /* optional */ }
        if (cmd === 'cut') return this.run('clear');
        return this.toast('Copied.');
      }
      case 'paste': {
        if (!this.clipboard) return this.toast('Nothing copied yet. (Images copied from other apps paste with Ctrl+V too.)');
        const { canvas, x, y } = this.clipboard;
        const fits = x + canvas.width <= W && y + canvas.height <= H;
        d.add(newLayer('pixel', { name: 'Pasted', canvas: cloneCanvas(canvas), x: fits ? x : Math.round((W - canvas.width) / 2), y: fits ? y : Math.round((H - canvas.height) / 2) }));
        return this.commit('Paste');
      }
      case 'adjustPixels': return dialogs.pixelAdjust(this, arg);
      case 'filter': return dialogs.filterDialog(this, arg);
      case 'autoTone': {
        const t = this.paintTarget({ pixelsOnly: true }); if (!t) return;
        const img = getPixels(t.canvas);
        const { ranges } = autoTone(img);
        t.canvas.getContext('2d').putImageData(img, 0, 0);
        this.toast(ranges.length ? `Auto Tone stretched red ${ranges[0].join('–')}, green ${ranges[1].join('–')}, blue ${ranges[2].join('–')} to the full 0–255.` : 'Nothing to tone.');
        return this.commit('Auto Tone', { event: 'auto-tone' });
      }
      case 'imageSize': return dialogs.imageSize(this);
      case 'canvasSize': return dialogs.canvasSize(this);
      case 'cropSel': {
        if (!d.selection) return this.toast('Make a selection first.');
        const b = alphaBounds(getPixels(d.selection).data, W, H);
        return b && this.cropTo(b.x, b.y, b.width, b.height, 'Crop to Selection');
      }
      case 'trim': {
        d.render();
        const b = alphaBounds(getPixels(d.composite).data, W, H);
        if (!b) return this.toast('The image is completely empty.');
        if (b.width === W && b.height === H) return this.toast('Nothing to trim: no transparent edges.');
        return this.cropTo(b.x, b.y, b.width, b.height, 'Trim');
      }
      case 'rotLayer': case 'flipLayerH': case 'flipLayerV': {
        const L = this.needLayer(['pixel']); if (!L) return;
        const op = { rotLayer: 'cw', flipLayerH: 'fh', flipLayerV: 'fv' }[cmd];
        const c = transformCanvas(L.canvas, op);
        const cx = L.x + L.canvas.width / 2, cy = L.y + L.canvas.height / 2;
        L.canvas = c; L.x = Math.round(cx - c.width / 2); L.y = Math.round(cy - c.height / 2);
        return this.commit({ cw: 'Rotate Layer 90°', fh: 'Flip Layer Horizontal', fv: 'Flip Layer Vertical' }[op]);
      }
      case 'rotCanvas': {
        const op = arg;
        let rasterized = 0;
        for (const L of d.layers) {
          if (L.kind === 'text' || L.kind === 'shape') { d.rasterize(L); rasterized++; }
          if (L.kind === 'pixel') Object.assign(L, placeRotated(L.canvas, L.x, L.y, op, W, H, 'canvas'));
          if (L.mask) L.mask = { ...L.mask, ...placeRotated(L.mask.canvas, L.mask.x, L.mask.y, op, W, H, 'canvas', true) };
        }
        if (op !== 'fh') { d.width = H; d.height = W; d.composite = makeCanvas(H, W); }
        d.selection = null;
        if (rasterized) this.toast(`${rasterized} text/shape layer${rasterized > 1 ? 's were' : ' was'} rasterized to rotate.`);
        this.commit({ cw: 'Rotate Canvas 90° CW', ccw: 'Rotate Canvas 90° CCW', fh: 'Flip Canvas Horizontal' }[op]);
        return this.fit();
      }
      default:
        console.warn('[layer-lab] unknown command', cmd);
    }
  }
}

/* ── helpers ──────────────────────────────────────────────────────────── */

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function lumHex(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}

function structuredCloneLayer(L) {
  return {
    ...L,
    canvas: L.canvas && cloneCanvas(L.canvas),
    mask: L.mask && { ...L.mask, canvas: cloneCanvas(L.mask.canvas) },
    text: L.text && { ...L.text }, shape: L.shape && { ...L.shape },
    adjust: L.adjust && { ...L.adjust, params: { ...L.adjust.params } },
    fx: L.fx && { shadow: { ...L.fx.shadow }, stroke: { ...L.fx.stroke }, glow: { ...L.fx.glow } },
    editMask: false,
  };
}

export function transformCanvas(src, op) {
  const swap = op === 'cw' || op === 'ccw';
  const c = makeCanvas(swap ? src.height : src.width, swap ? src.width : src.height), x = c.getContext('2d');
  if (op === 'cw') { x.translate(src.height, 0); x.rotate(Math.PI / 2); }
  if (op === 'ccw') { x.translate(0, src.width); x.rotate(-Math.PI / 2); }
  if (op === 'fh') { x.translate(src.width, 0); x.scale(-1, 1); }
  if (op === 'fv') { x.translate(0, src.height); x.scale(1, -1); }
  x.drawImage(src, 0, 0);
  return c;
}

/** Rotate/flip a canvas placed at (x, y) inside a W×H document; returns its new canvas and position. */
function placeRotated(canvas, x, y, op, W, H, _scope, isMask) {
  const c = transformCanvas(canvas, op), w = canvas.width, h = canvas.height;
  let nx = x, ny = y;
  if (op === 'cw') { nx = H - (y + h); ny = x; }
  if (op === 'ccw') { nx = y; ny = W - (x + w); }
  if (op === 'fh') { nx = W - (x + w); ny = y; }
  return isMask ? { canvas: c, x: nx, y: ny } : { canvas: c, x: nx, y: ny };
}

export { BLEND_MODES, ICONS };
