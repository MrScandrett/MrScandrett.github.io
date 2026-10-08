// Builds assets/vendor/three-extras.min.js from scripts/three-extras-entry.js.
// Every `import ... from "three"` inside the loaders is rewritten to read from the
// THREE namespace that three-bundle.min.js already exports, so the page only ever
// runs one copy of Three.js.
import { build } from 'esbuild';
import fs from 'node:fs';
import * as THREE from 'three';

const names = Object.keys(THREE).filter((name) => /^[A-Za-z_$][\w$]*$/.test(name) && name !== 'default');

await build({
  entryPoints: ['scripts/three-extras-entry.js'],
  outfile: 'assets/vendor/three-extras.min.js',
  bundle: true,
  format: 'esm',
  minify: true,
  legalComments: 'none',
  plugins: [{
    name: 'shared-three',
    setup(b) {
      b.onResolve({ filter: /^three$/ }, () => ({ path: 'three', namespace: 'shared-three' }));
      b.onResolve({ filter: /^\.\/three-bundle\.min\.js$/ }, (args) => ({ path: args.path, external: true }));
      const bundleTarget = './' + 'three-bundle.min.js';
      b.onLoad({ filter: /.*/, namespace: 'shared-three' }, () => ({
        contents: `import { THREE } from '${bundleTarget}';\nexport const { ${names.join(', ')} } = THREE;\n`,
        loader: 'js'
      }));
    }
  }]
});
console.log(`three-extras.min.js built against shared THREE (${names.length} names).`);

// Draco decoder (glTF-only build, wasm) for compressed .glb files; the Bench loads it on demand.
fs.mkdirSync('assets/vendor/draco', { recursive: true });
for (const f of ['draco_wasm_wrapper.js', 'draco_decoder.wasm']) fs.copyFileSync(`node_modules/three/examples/jsm/libs/draco/gltf/${f}`, `assets/vendor/draco/${f}`);
console.log('Copied the Draco glTF decoder to assets/vendor/draco/.');
