// Writes assets/images/lessons/saxophone/key-map.svg (the no-JS fallback for the key guide), showing written G.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const KM = require('../assets/js/lessons/sax-key-map.js');
const svg = KM.svg(['L1', 'L2', 'L3']) + '\n';
fs.writeFileSync(new URL('../assets/images/lessons/saxophone/key-map.svg', import.meta.url), svg);
console.log('wrote key-map.svg', svg.length, 'bytes');
