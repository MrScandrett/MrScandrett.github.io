import { ACTIONS, DIRECTIONS, validateProject, clipMetadata } from './model.mjs';
export const STORAGE_KEY = 'classroomos-sprite-studio-v1';
export function readProject() {
  const text = localStorage.getItem(STORAGE_KEY);
  return text ? validateProject(JSON.parse(text)) : null;
}
export function writeProject(project) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  window.dispatchEvent(new CustomEvent('sprite-studio-projectchange'));
}
export function bakePixels(project, pixels) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = project.size;
  const ctx = canvas.getContext('2d'), img = ctx.createImageData(project.size, project.size);
  for (let i = 0; i < pixels.length; i++) {
    const slot = parseInt(pixels[i], 16); if (!slot) continue;
    const hex = project.palette[slot];
    for (let channel = 0; channel < 3; channel++) img.data[i * 4 + channel] = parseInt(hex.slice(1 + channel * 2, 3 + channel * 2), 16);
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return canvas;
}
export function sheetCanvas(project, frames) {
  const canvas = document.createElement('canvas'); canvas.width = project.size * frames.length; canvas.height = project.size;
  frames.forEach((f, i) => canvas.getContext('2d').drawImage(bakePixels(project, f.pixels), i * project.size, 0)); return canvas;
}
export const pngBlob = canvas => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed.'))));
export function download(name, data, type = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function assetZip(project) {
  if (!window.JSZip) throw new Error('ZIP library did not load. Reload and try again, or save project JSON.');
  const zip = new window.JSZip(), metadata = [];
  zip.file('project.sprite.json', JSON.stringify(project, null, 2));
  for (const action of Object.keys(ACTIONS)) for (const direction of DIRECTIONS[project.view]) {
    const key = `${action}-${direction}`;
    zip.file(`${key}.png`, await pngBlob(sheetCanvas(project, project.clips[key].frames)));
    metadata.push(clipMetadata(project, action, direction));
  }
  zip.file('animations.json', JSON.stringify(metadata, null, 2)); return zip;
}
export function coverage(project) {
  return Object.entries(project.clips).map(([key, clip]) => ({ key, frames: clip.frames.length, drawn: clip.frames.filter(f => /[1-9a-f]/.test(f.pixels)).length, ms: clip.frames.reduce((sum, f) => sum + f.ms, 0) }));
}
