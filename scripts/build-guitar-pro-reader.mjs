import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
await mkdir('assets/vendor/alphatab', { recursive: true });
await copyFile('node_modules/@coderline/alphatab/LICENSE', 'assets/vendor/alphatab/LICENSE.txt');
await build({
  entryPoints: ['scripts/guitar-pro-reader-entry.mjs'], bundle: true,
  format: 'esm', minify: true, legalComments: 'inline',
  outfile: 'assets/vendor/alphatab/guitar-pro-reader.min.mjs',
  banner: { js: '/*! alphaTab 1.8.4, MPL-2.0. Source and notices: https://github.com/CoderLine/alphaTab/tree/v1.8.4 ; see NOTICE.md and LICENSE.txt alongside this file. */' }
});
