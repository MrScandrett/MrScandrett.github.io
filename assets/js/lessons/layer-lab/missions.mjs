/* missions.mjs — workshop missions that check themselves. Each mission looks
 * at the studio's events (and the document they happened in) and ticks off
 * when the skill has really been used, not when a button was merely opened.
 * Progress is kept in this browser only.
 */

const anyLayer = (doc, fn) => !!doc && doc.layers.some(fn);
const fxOn = (L) => L.fx && (L.fx.shadow.on || L.fx.stroke.on || L.fx.glow.on);

export const MISSIONS = [
  { id: 'layers', title: 'Stack it', goal: 'Make a new layer, rename it (double-click the name), then paint on it.',
    how: 'Layer › New Layer, or the + button under the Layers panel. Then press B for the Brush.',
    done: (e) => e.type === 'paint' && e.doc.active?.renamed },
  { id: 'mask', title: 'Hide, don\'t erase', goal: 'Add a layer mask and paint black on it to hide part of a layer.',
    how: 'Select a layer, press the mask button (◐) in the Layers panel, check the mask thumbnail is outlined, then paint with black.',
    done: (e) => e.type === 'mask-hide' },
  { id: 'cutout', title: 'Cut out a planet', goal: 'Open the Moon, Earth or Jupiter photo and remove its black background.',
    how: 'Try Layer › Remove Background, or Select › Subject (or the Magic Wand, W) and then Delete.',
    done: (e) => e.type === 'cutout' },
  { id: 'blend', title: 'Blend it', goal: 'Give a layer a blend mode other than Normal and an opacity below 100%.',
    how: 'Use the blend menu and the Opacity slider at the top of the Layers panel. Multiply darkens, Screen lightens.',
    done: (e) => anyLayer(e.doc, (L) => L.blend !== 'normal' && L.opacity < 1 && L.kind !== 'adjust') },
  { id: 'adjust', title: 'Non-destructive color', goal: 'Add an adjustment layer and change its settings.',
    how: 'Press the adjustment button (◑) in the Layers panel, pick one, then move its sliders in Properties.',
    done: (e) => e.type === 'adjust-edit' },
  { id: 'type', title: 'Type with style', goal: 'Add a text layer and give it a layer effect (drop shadow, stroke or glow).',
    how: 'Press T and click the canvas. In Properties, type your words, then switch on an effect under Layer effects.',
    done: (e) => anyLayer(e.doc, (L) => L.kind === 'text' && fxOn(L)) },
  { id: 'heal', title: 'Clean the beach', goal: 'Open "Beach litter" and remove litter with the Spot Healing Brush or Content-Aware Fill.',
    how: 'Press J and paint over the can. Or lasso the bottle (L) and choose Edit › Content-Aware Fill.',
    done: (e) => e.type === 'heal' },
  { id: 'roundtrip', title: 'Round trip', goal: 'Export a layered PSD or OpenRaster file, then open it again from the Workshop Drive.',
    how: 'File › Export As… › PSD. Then go to the Files tab and press Open on the file you exported. Read the import report.',
    done: (e) => e.type === 'open' && e.detail?.source === 'export' && ['psd', 'ora'].includes(e.detail?.kind) },
  { id: 'compare', title: 'Size it up', goal: 'Export the same picture as both a PNG and a JPEG, then compare their sizes in Files.',
    how: 'File › Export As… twice. Try JPEG quality 90 and then 30: when does the image start to look blocky?',
    done: (e, st) => e.type === 'export' && st.exported.has('png') && st.exported.has('jpeg') },
  { id: 'brief', title: 'Client brief: STEAM Night poster', goal: 'Make a poster at least 1000 px tall with 4+ layers, live text, a mask and an adjustment layer. Export it as PNG or JPEG.',
    how: 'Start from File › New › Portrait poster, or customise the starter poster. Export As… when it is ready.',
    done: (e) => e.type === 'export' && ['png', 'jpeg', 'webp'].includes(e.detail?.format) && e.doc.height >= 1000 && e.doc.layers.length >= 4
      && anyLayer(e.doc, (L) => L.kind === 'text') && anyLayer(e.doc, (L) => L.kind === 'adjust') && anyLayer(e.doc, (L) => L.mask && L.kind !== 'adjust') },
];

const KEY = 'classroomos:layerlab:missions:v1';

export class MissionTracker {
  constructor(onChange) {
    this.onChange = onChange;
    this.exported = new Set();
    try { this.done = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { this.done = new Set(); }
  }
  check(event) {
    if (event.type === 'export') this.exported.add(event.detail?.format);
    const newly = [];
    for (const m of MISSIONS) {
      if (this.done.has(m.id)) continue;
      let ok = false;
      try { ok = m.done(event, this); } catch { ok = false; }
      if (ok) { this.done.add(m.id); newly.push(m); }
    }
    if (newly.length) {
      try { localStorage.setItem(KEY, JSON.stringify([...this.done])); } catch { /* private mode */ }
      this.onChange?.(newly);
    }
    return newly;
  }
  reset() {
    this.done.clear();
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    this.onChange?.([]);
  }
}
