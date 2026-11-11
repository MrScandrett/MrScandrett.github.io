import {build} from 'esbuild';
import JSZip from 'jszip';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({entryPoints:[path.join(root,'scripts/nxt-compiler-bridge.mjs')],bundle:true,platform:'node',format:'esm',target:'node24',write:false,legalComments:'inline'});
const zip=new JSZip(),folder=zip.folder('NXT-Compiler-Windows');
const date=new Date('2026-01-01T00:00:00.000Z');
zip.files['NXT-Compiler-Windows/'].date=date;
folder.file('nxt-compiler.mjs',bundle.outputFiles[0].contents,{date});
for(const file of ['Start-NXT-Compiler.cmd','Start-NXT-Compiler.ps1','README.txt'])folder.file(file,await readFile(path.join(root,'scripts/nxt-windows',file)),{date});
await mkdir(path.join(root,'downloads'),{recursive:true});
const output=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9}});
const target=path.join(root,'downloads/nxt-compiler-windows.zip');
if(process.argv.includes('--check')){if(!output.equals(await readFile(target)))throw Error('Windows companion is stale. Run npm run build:nxt-companion.');}
else await writeFile(target,output);
console.log(`Windows companion: downloads/nxt-compiler-windows.zip (${output.length} bytes); bridge dependencies bundled, runtimes verified at setup.`);
