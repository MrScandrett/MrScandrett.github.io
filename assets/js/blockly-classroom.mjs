// Classroom defaults for every Blockly editor on the site.
//
// Bundled into assets/vendor/blockly.min.js (scripts/blockly-browser-entry.js), so
// every block IDE gets them without loading anything else: the web blocks
// workbench and Web Studio, the game tutorials, From Scratch, Godot, the NXT lab,
// Robot Car Studio and Arduino Studio. Blockly's own defaults (12px field text,
// lessons starting at 0.68–0.85 zoom) put block text at 8–10px, which can't be
// read from the back of a classroom. This wraps Blockly.inject so that:
//   - text is 14px semibold in a system font (block labels, fields, toolbox);
//   - no editor opens smaller than READABLE_SCALE, and every editor has + / − / fit
//     zoom buttons (if it scrolls) so a teacher can go bigger on the projector;
//   - the workspace keeps one high-contrast light look in every site theme, and the
//     site's contrast guard and skins leave it alone (data-night-keep, data-skin-keep).
// Pass `classroom: false` in the inject options to opt an editor out.

export const READABLE_SCALE = 0.9;
export const MIN_SCALE = 0.4;
export const FIT_FLOOR = 0.75;
export const MAX_SCALE = 2.5;
export const FONT_SIZE = 14;
export const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const COMPONENT_STYLES = {
  workspaceBackgroundColour: '#f8fbff',
  toolboxBackgroundColour: '#e7eef7',
  toolboxForegroundColour: '#14283d',
  flyoutBackgroundColour: '#dce6f2',
  flyoutForegroundColour: '#14283d',
  flyoutOpacity: 1,
  scrollbarColour: '#6b7f97',
  scrollbarOpacity: 0.55,
  insertionMarkerColour: '#000000',
  insertionMarkerOpacity: 0.3,
  cursorColour: '#1d4f8f',
  selectedGlowColour: '#ffb000',
};

// Pure: the inject options with classroom defaults merged in. Anything the lesson
// set explicitly wins, except that start/min/max zoom are clamped to readable values
// and every scrolling editor shows the zoom buttons.
export function classroomOptions(options = {}, theme) {
  if (options.classroom === false) {
    const { classroom, ...rest } = options;
    return rest;
  }
  const zoom = { ...(options.zoom || {}) };
  // Zoom buttons on a workspace that can't scroll make Blockly re-centre the content,
  // so fixed-view demos (scrollbars: false) keep whatever the lesson chose.
  const fixedView = options.scrollbars === false || options.move?.scrollbars === false;
  if (!fixedView) zoom.controls = true;
  zoom.startScale = Math.max(Number(zoom.startScale) || 1, READABLE_SCALE);
  zoom.minScale = Math.min(Math.max(Number(zoom.minScale) || MIN_SCALE, MIN_SCALE), zoom.startScale);
  zoom.maxScale = Math.max(Number(zoom.maxScale) || MAX_SCALE, MAX_SCALE);
  if (zoom.scaleSpeed == null) zoom.scaleSpeed = 1.15;
  const out = { ...options, zoom };
  delete out.classroom;
  if (!out.theme && theme) out.theme = theme;
  return out;
}

export const CLASSROOM_CSS = `
.blocklySvg text, .blocklyText { font-family: ${FONT_FAMILY}; }
.blocklyToolbox { font-family: ${FONT_FAMILY}; }
.blocklyToolboxCategoryLabel { font: 600 16px/1.3 ${FONT_FAMILY}; color: ${COMPONENT_STYLES.toolboxForegroundColour}; }
.blocklyToolboxCategory { padding: 4px 6px; }
.blocklyToolboxSelected .blocklyToolboxCategoryLabel { color: #fff; }
.blocklyFlyoutLabelText { font: 600 ${FONT_SIZE}px ${FONT_FAMILY}; fill: ${COMPONENT_STYLES.flyoutForegroundColour}; }
.blocklyZoom > image, .blocklyZoom > svg > image { opacity: .6; }
.blocklyZoom > image:hover, .blocklyZoom > svg > image:hover { opacity: 1; }
.blocklyWidgetDiv .blocklyHtmlInput { font-family: ${FONT_FAMILY}; font-weight: 600; }
.blocklyDropDownDiv .blocklyMenuItem, .blocklyWidgetDiv .blocklyMenuItem { font: 500 15px/1.4 ${FONT_FAMILY}; padding: 6px 14px; }
`;

export function installClassroomBlockly(Blockly) {
  if (!Blockly || Blockly.__classroom) return Blockly;
  let theme;
  try {
    theme = Blockly.Theme.defineTheme('classroom', {
      base: Blockly.Themes.Classic,
      fontStyle: { family: FONT_FAMILY, weight: '600', size: FONT_SIZE },
      componentStyles: COMPONENT_STYLES,
    });
  } catch { theme = undefined; }
  try { Blockly.Css.register(CLASSROOM_CSS); } catch { /* already registered */ }

  const inject = Blockly.inject;
  const wrapped = function classroomInject(container, options) {
    const host = typeof container === 'string' ? document.getElementById(container) : container;
    const opted = options?.classroom !== false;
    const ws = inject.call(this, container, classroomOptions(options, theme));
    if (opted && host?.setAttribute) {
      host.setAttribute('data-night-keep', '');
      host.setAttribute('data-skin-keep', '');
      host.setAttribute('data-blockly-classroom', '');
    }
    if (opted && host && typeof ResizeObserver === 'function' && typeof Blockly.svgResize === 'function') {
      // Editors injected before their layout settles (grids, tabs, lazy panels) keep a
      // stale SVG size and leave an empty strip; follow the container instead.
      let frame = 0;
      new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => { if (host.isConnected) Blockly.svgResize(ws); });
      }).observe(host);
    }
    if (opted && typeof ws?.zoomToFit === 'function') {
      // "Fit" on a long script would shrink the text back below readable size. Stop at
      // FIT_FLOOR and show the top of the script; the − button still zooms further out.
      const fit = ws.zoomToFit.bind(ws);
      ws.zoomToFit = () => {
        fit();
        if (ws.scale >= FIT_FLOOR) return;
        ws.setScale(FIT_FLOOR);
        const top = ws.getTopBlocks(true)[0];
        if (top) {
          const xy = top.getRelativeToSurfaceXY();
          ws.scroll(12 - xy.x * ws.scale, 12 - xy.y * ws.scale);
        }
      };
    }
    return ws;
  };
  return { ...Blockly, inject: wrapped, __classroom: true };
}
