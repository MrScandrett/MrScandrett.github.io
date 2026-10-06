// Vendors the runtime pieces Forge (forge.html) loads, so the site never pulls
// them from a CDN:
//   assets/vendor/manifold/  — manifold-3d's ESM loader + WebAssembly (Apache-2.0)
//   assets/vendor/fonts/droid-sans-bold.typeface.json — Droid Sans Bold
//     (Apache-2.0, via three/examples/fonts), cut down to printable ASCII
//
// Rebuild with: npm run build:forge-vendor   (after bumping manifold-3d or three)
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = (...p) => join(root, 'node_modules', ...p);
const out = (...p) => join(root, 'assets', 'vendor', ...p);

await mkdir(out('manifold'), { recursive: true });
for (const file of ['manifold.js', 'manifold.wasm', 'LICENSE']) {
  await copyFile(nm('manifold-3d', file), out('manifold', file));
}
const { version } = JSON.parse(await readFile(nm('manifold-3d', 'package.json'), 'utf8'));
await writeFile(out('manifold', 'VERSION'), `manifold-3d ${version}\n`);

await mkdir(out('fonts'), { recursive: true });
const font = JSON.parse(await readFile(nm('three', 'examples', 'fonts', 'droid', 'droid_sans_bold.typeface.json'), 'utf8'));
const glyphs = {};
for (let code = 32; code <= 126; code++) {
  const ch = String.fromCharCode(code);
  if (font.glyphs[ch]) glyphs[ch] = font.glyphs[ch];
}
const { resolution, ascender, descender, lineHeight, boundingBox, familyName } = font;
await writeFile(out('fonts', 'droid-sans-bold.typeface.json'), JSON.stringify({ familyName, resolution, ascender, descender, lineHeight, boundingBox, glyphs }));
await copyFile(nm('three', 'examples', 'fonts', 'droid', 'NOTICE'), out('fonts', 'droid-sans-NOTICE'));
console.log(`[forge-vendor] manifold-3d ${version}, Droid Sans Bold (${Object.keys(glyphs).length} glyphs)`);
