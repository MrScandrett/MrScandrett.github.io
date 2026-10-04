#!/usr/bin/env node
// Vendors the book reader's engines (PDF.js + JSZip) into assets/vendor/ so
// reader.html never depends on a CDN. Rerun after bumping pdfjs-dist or jszip:
//   npm run build:reader
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nm = (...p) => path.join(root, "node_modules", ...p);
const out = (...p) => path.join(root, "assets", "vendor", ...p);

const pdfDir = out("pdfjs");
await fs.rm(pdfDir, { recursive: true, force: true });
await fs.mkdir(pdfDir, { recursive: true });

await fs.copyFile(nm("pdfjs-dist", "build", "pdf.min.mjs"), path.join(pdfDir, "pdf.min.mjs"));
await fs.copyFile(nm("pdfjs-dist", "build", "pdf.worker.min.mjs"), path.join(pdfDir, "pdf.worker.min.mjs"));
await fs.copyFile(nm("pdfjs-dist", "LICENSE"), path.join(pdfDir, "LICENSE"));
for (const dir of ["standard_fonts", "cmaps", "wasm"]) {
  await fs.cp(nm("pdfjs-dist", dir), path.join(pdfDir, dir), { recursive: true });
}

await fs.copyFile(nm("jszip", "dist", "jszip.min.js"), out("jszip.min.js"));

const pdfVersion = JSON.parse(await fs.readFile(nm("pdfjs-dist", "package.json"), "utf8")).version;
const zipVersion = JSON.parse(await fs.readFile(nm("jszip", "package.json"), "utf8")).version;
await fs.writeFile(
  path.join(pdfDir, "VERSION"),
  `pdfjs-dist ${pdfVersion}\njszip ${zipVersion}\n`
);
console.log(`Vendored pdfjs-dist ${pdfVersion} and jszip ${zipVersion} into assets/vendor/`);
