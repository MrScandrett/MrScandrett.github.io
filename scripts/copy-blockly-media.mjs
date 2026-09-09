import { mkdir, copyFile } from 'node:fs/promises';
const files = ['sprites.svg', 'delete-icon.svg', 'dropdown-arrow.svg', 'foldout-icon.svg', 'resize-handle.svg', 'handclosed.cur', 'handdelete.cur', 'handopen.cur', '1x1.gif'];
await mkdir('assets/vendor/blockly-media', { recursive: true });
for (const file of files) await copyFile(`node_modules/blockly/media/${file}`, `assets/vendor/blockly-media/${file}`);
console.log(`Copied ${files.length} Blockly UI assets.`);
