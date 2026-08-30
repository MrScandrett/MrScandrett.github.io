import fs from "node:fs";

const filenames = process.argv.slice(2);

if (!filenames.length) {
  console.error("Usage: node scripts/strip-trailing-whitespace.mjs <file> [...files]");
  process.exit(2);
}

for (const filename of filenames) {
  const source = fs.readFileSync(filename, "utf8");
  const normalized = source
    .replace(/^[\t ]+/gm, (indentation) => indentation.replace(/ +\t/g, "\t"))
    .replace(/[\t ]+$/gm, "");
  fs.writeFileSync(filename, normalized, "utf8");
}
