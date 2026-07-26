// Produces a minified copy of the site in dist/ for GitHub Pages deploy.
// Source files stay untouched and readable; only the dist/ copy is minified.
import { cp, rm, mkdir, rename, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { minify as minifyHtml } from "html-minifier-terser";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, "dist");
// Node's fs.cp refuses to copy a directory into its own subdirectory, so stage
// outside ROOT first and move the result into place.
const STAGING = path.join(os.tmpdir(), `mrscandrett-dist-${Date.now()}`);

// Dev-only / non-published directories. Everything else ships to Pages.
const EXCLUDE_DIRS = new Set([
  "node_modules", ".git", ".github", "dist", "screenshots", "test-results",
  "tmp", ".claude", ".vscode", "portal/uploads", "portal/work", "portal/data",
]);

async function copySite() {
  await rm(STAGING, { recursive: true, force: true });
  await mkdir(STAGING, { recursive: true });
  await cp(ROOT, STAGING, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(ROOT, src);
      if (rel === "") return true;
      const posixRel = rel.split(path.sep).join("/");
      for (const excluded of EXCLUDE_DIRS) {
        if (posixRel === excluded || posixRel.startsWith(`${excluded}/`)) return false;
      }
      return true;
    },
  });
  await rm(DIST, { recursive: true, force: true });
  try {
    await rename(STAGING, DIST);
  } catch (error) {
    if (error.code !== "EXDEV") throw error;
    // Staging dir is on a different filesystem (e.g. some CI runners) — fall back to copy.
    await cp(STAGING, DIST, { recursive: true });
    await rm(STAGING, { recursive: true, force: true });
  }
}

async function walk(dir, extension, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, extension, files);
    } else if (entry.name.toLowerCase().endsWith(extension)) {
      files.push(full);
    }
  }
  return files;
}

function resolveCleanCssBin() {
  const binName = process.platform === "win32" ? "cleancss.cmd" : "cleancss";
  return path.join(ROOT, "node_modules", ".bin", binName);
}

async function minifyCssFiles() {
  const cssFiles = await walk(DIST, ".css");
  const cleancss = resolveCleanCssBin();
  let before = 0;
  let after = 0;
  for (const file of cssFiles) {
    const originalSize = (await stat(file)).size;
    // --inline none: minify each file standalone, don't inline @import targets
    // (several stylesheets @import a huge shared file; inlining would duplicate it).
    //
    // Run from the stylesheet's own directory and pass a bare filename. clean-css
    // rebases relative url()/@import targets against its working directory, so
    // invoking it from the repo root rewrote "./classroom-fonts.css" to
    // "dist/assets/css/classroom-fonts.css" — a path that 404s once deployed, and
    // that grew another prefix on every rebuild.
    const run = spawnSync(cleancss, ["-O2", "--inline", "none", path.basename(file)], {
      cwd: path.dirname(file),
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 64,
    });
    if (run.status !== 0) {
      console.warn(`  CSS minify skipped for ${path.relative(DIST, file)}: ${run.stderr || "unknown error"}`);
      continue;
    }
    await writeFile(file, run.stdout, "utf8");
    before += originalSize;
    after += run.stdout.length;
  }
  console.log(`CSS: ${cssFiles.length} files, ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`);
}

async function minifyJsFiles() {
  const jsFiles = await walk(DIST, ".js");
  let before = 0;
  let after = 0;
  for (const file of jsFiles) {
    const source = await readFile(file, "utf8");
    before += Buffer.byteLength(source);
    try {
      const result = await esbuild.transform(source, { minify: true, target: "es2019", loader: "js" });
      await writeFile(file, result.code, "utf8");
      after += Buffer.byteLength(result.code);
    } catch (error) {
      console.warn(`  JS minify skipped for ${path.relative(DIST, file)}: ${error.message.split("\n")[0]}`);
      after += Buffer.byteLength(source);
    }
  }
  console.log(`JS: ${jsFiles.length} files, ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`);
}

async function minifyHtmlFiles() {
  const htmlFiles = await walk(DIST, ".html");
  let before = 0;
  let after = 0;
  for (const file of htmlFiles) {
    const source = await readFile(file, "utf8");
    before += Buffer.byteLength(source);
    try {
      const result = await minifyHtml(source, {
        collapseWhitespace: true,
        conservativeCollapse: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: true,
        keepClosingSlash: true,
      });
      await writeFile(file, result, "utf8");
      after += Buffer.byteLength(result);
    } catch (error) {
      console.warn(`  HTML minify skipped for ${path.relative(DIST, file)}: ${error.message.split("\n")[0]}`);
      after += Buffer.byteLength(source);
    }
  }
  console.log(`HTML: ${htmlFiles.length} files, ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`);
}

async function main() {
  console.log("Copying site into dist/ ...");
  await copySite();
  await minifyCssFiles();
  await minifyJsFiles();
  await minifyHtmlFiles();
  console.log("dist/ ready.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
