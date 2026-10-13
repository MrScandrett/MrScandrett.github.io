// Build faithful reproductions and documented detail crops; no generative redraws.
// Usage: node scripts/build-hokusai-art.mjs /path/to/downloaded-source-images
// Input names and original download URLs are recorded in sources.json.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const input = process.argv[2];
if (!input) throw new Error('Provide a directory containing the source JPEGs listed in sources.json.');
const out = 'assets/images/lessons/hokusai';
await fs.mkdir(out, { recursive: true });
const assets = [
  ['hoku-wave.jpg', 'great-wave.webp', 2400],
  ['hoku-wave.jpg', 'great-wave-full.webp', 3859],
  ['hoku-fuji.jpg', 'red-fuji.webp', 2400],
  ['hoku-portrait.jpg', 'hokusai-portrait.webp', 680],
  ['hoku-page-15.jpg', 'ryakuga-birds.webp', 1600],
  ['hoku-page-31.jpg', 'ryakuga-fish.webp', 1600],
];
for (const [source, target, width] of assets) {
  await sharp(path.join(input, source)).resize({ width, withoutEnlargement: true }).webp(target === 'great-wave-full.webp' ? { lossless: true } : { quality: 94 }).toFile(path.join(out, target));
}
// Rectangles measured against 700px-wide scan previews. Keep original printed
// lines, notations, age marks and texture. The paired crops are independent
// illustrations on a page, not historically registered animation frames.
const crops = [
  ['hoku-page-15.jpg', 'bird-guide.webp', [350, 135, 290, 235]],
  ['hoku-page-15.jpg', 'bird-ink.webp', [63, 145, 295, 260]],
  ['hoku-page-31.jpg', 'fish-guide.webp', [85, 112, 550, 264]],
  ['hoku-page-31.jpg', 'fish-ink.webp', [85, 392, 550, 264]],
];
for (const [source, target, rect] of crops) {
  const file = path.join(input, source); const { width } = await sharp(file).metadata(); const scale = width / 700;
  const [left, top, cropWidth, height] = rect.map(n => Math.round(n * scale));
  await sharp(file).extract({ left, top, width: cropWidth, height }).resize({ width: 1200 }).webp({ quality: 94 }).toFile(path.join(out, target));
}
// Classroom composition overlay on the same Met impression used by the canvas.
const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="672" viewBox="0 0 1000 672">
  <g fill="none" stroke="#a62820" stroke-width="4" stroke-dasharray="10 6">
    <path d="M 50 647 L 351 61 L 499 646 Z"/><path d="M 580 489 L 634 435 L 695 489 Z"/>
    <circle cx="476" cy="212" r="50"/><circle cx="392" cy="124" r="41"/><circle cx="285" cy="168" r="35"/>
  </g>
</svg>`;
await sharp(path.join(out, 'great-wave.webp')).resize({ width: 1000, height: 672 }).composite([{ input: Buffer.from(overlay) }]).webp({ lossless: true }).toFile(path.join(out, 'great-wave-geometry.webp'));
console.log('Built original-art reproductions, detail crops and composition overlay.');
