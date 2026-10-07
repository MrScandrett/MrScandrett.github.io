// index.mjs — one entry point for exporting a Rosetta 2D game to another engine.
//   const { files, report } = exportProject(game, 'godot', { sources, images });
//   const zip = makeZip(files);
import { exportGodot } from './godot.mjs';
import { exportPhaser } from './phaser.mjs';

export { exportGodot, exportPhaser };
export { makeZip } from './zip.mjs';
export { freshGame } from './common.mjs';

export const TARGETS = {
  godot: { label: 'Godot 4', run: exportGodot },
  phaser: { label: 'Phaser 3', run: exportPhaser }
};

export function exportProject(game, target, options) {
  const t = TARGETS[target];
  if (!t) throw new Error(`Rosetta 2D: no exporter for "${target}". Choose one of: ${Object.keys(TARGETS).join(', ')}.`);
  return t.run(game, options);
}

/**
 * Turn images a game already loaded (Image or canvas) into PNG bytes for exporters.
 * Browser only. Returns { key: { bytes, ext: 'png', width, height } }.
 */
export async function imagesFrom(game) {
  const out = {};
  for (const [key, img] of Object.entries(game.assets.items)) {
    if (!img || !img.width || typeof document === 'undefined') continue;
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (blob) out[key] = { bytes: new Uint8Array(await blob.arrayBuffer()), ext: 'png', width: img.width, height: img.height };
  }
  return out;
}
