// Produces a minified copy of the site in dist/ for GitHub Pages deploy.
// Source files stay untouched and readable; only the dist/ copy is minified.
import { cp, rm, mkdir, rename, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { createHash } from "node:crypto";
import { minify as minifyHtml } from "html-minifier-terser";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, "dist");
// Node's fs.cp refuses to copy a directory into its own subdirectory, so stage
// outside ROOT first and move the result into place.
const STAGING = path.join(os.tmpdir(), `mrscandrett-dist-${Date.now()}`);

// Dev-only / non-published directories. Everything else ships to Pages.
const EXCLUDE_DIRS = new Set([
  "node_modules", ".git", ".github", "dist", "screenshots", "test-results",
  "tmp", ".claude", ".vscode", "student-projects", "student-projects-review",
  "portal", "scripts",
]);

// The repository root also contains authoring tools and internal documentation.
// Keep public HTML, PDFs, and the standalone Music Lab bundle, but do not ship
// implementation details that cannot be used by the static site.
// OSeditor is a local teacher tool (it needs serve-local.js's /api). It must never be published,
// and app-sources.json maps generated apps back to private student-projects paths.
const PRIVATE_FILES = new Set([
  "OSeditor.html", "assets/js/OSeditor-app.js", "assets/css/OSeditor.css", "data/app-sources.json",
]);

const PUBLIC_ROOT_SCRIPTS = new Set(["music-lab.js"]);

function isPrivateRootFile(relativePath) {
  if (relativePath.includes(path.sep)) return false;
  const extension = path.extname(relativePath).toLowerCase();
  if (relativePath.startsWith(".")) return true;
  if ([".md", ".json", ".csv"].includes(extension)) return true;
  if (extension === ".js" && !PUBLIC_ROOT_SCRIPTS.has(relativePath)) return true;
  return false;
}

async function copySite() {
  await rm(STAGING, { recursive: true, force: true });
  await mkdir(STAGING, { recursive: true });
  await cp(ROOT, STAGING, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(ROOT, src);
      if (rel === "") return true;
      if (isPrivateRootFile(rel)) return false;
      const posixRel = rel.split(path.sep).join("/");
      if (PRIVATE_FILES.has(posixRel)) return false;
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

const SITE_ORIGIN = "https://mrscandrett.github.io";
const PUBLIC_ROOT_PAGES = [
  "", "about.html", "applications.html", "class-downloads.html", "music-lab.html",
  "paths.html", "project.html", "quizzes.html", "library.html", "showcase.html",
  "steam-lessons.html", "video-library.html", "bible.html",
];

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function writeDiscoveryFiles() {
  const lessonData = JSON.parse(await readFile(path.join(ROOT, "data", "lessons.json"), "utf8"));
  const appData = JSON.parse(await readFile(path.join(ROOT, "apps", "manifest.json"), "utf8"));
  const lessonUrls = (lessonData.lessons || [])
    .filter((lesson) => lesson.status === "live" && lesson.url)
    .map((lesson) => lesson.url);
  const appUrls = (appData.projects || appData || [])
    .map((project) => project.links?.play || project.url || (project.slug ? `apps/${project.slug}/` : ""))
    .filter((url) => url && !/^https?:\/\//i.test(url))
    .map((url) => url.replace(/^\.\//, "").replace(/^\//, ""));
  const urls = [...new Set([...PUBLIC_ROOT_PAGES, ...lessonUrls, ...appUrls])]
    .map((relativeUrl) => `${SITE_ORIGIN}/${relativeUrl}`)
    .sort();
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");
  await writeFile(path.join(DIST, "sitemap.xml"), sitemap, "utf8");
  await writeFile(
    path.join(DIST, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
    "utf8",
  );
  console.log(`Discovery: sitemap.xml with ${urls.length} public URLs + robots.txt`);
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

// A stylesheet that @imports another one can't start downloading the import until
// the parent has arrived, so every page paid an extra round trip before first paint.
// Inline the small, shared ones into their parent in dist/ (sources keep the @import).
const INLINE_IMPORTS = ["./classroom-fonts.css", "./components/lesson-shell.css"];

async function inlineSharedImports(cssFiles) {
  const cssDir = path.join(DIST, "assets", "css");
  for (const file of cssFiles) {
    if (path.dirname(file) !== cssDir) continue; // relative url()s below assume assets/css/
    let source = await readFile(file, "utf8");
    let changed = false;
    for (const target of INLINE_IMPORTS) {
      const statement = `@import url("${target}");`;
      if (!source.includes(statement)) continue;
      const body = await readFile(path.join(cssDir, target), "utf8");
      if (/url\(\s*["']?\.\.?\/(?!fonts\/)/.test(body)) {
        console.warn(`  not inlining ${target}: relative url() would break`);
        continue;
      }
      source = source.replace(statement, () => body);
      changed = true;
    }
    if (changed) await writeFile(file, source, "utf8");
  }
}

async function minifyCssFiles() {
  const cssFiles = await walk(DIST, ".css");
  await inlineSharedImports(cssFiles);
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
  // .mjs (home calendar, timeline helpers, ES-module page scripts) shipped unminified before.
  const jsFiles = [...(await walk(DIST, ".js")), ...(await walk(DIST, ".mjs"))];
  let before = 0;
  let after = 0;
  for (const file of jsFiles) {
    const source = await readFile(file, "utf8");
    before += Buffer.byteLength(source);
    // LGPL legacy reader: ship its preferred source and notices unchanged.
    // Fake Book links this exact URL as the replaceable library source.
    if (path.relative(DIST, file).split(path.sep).join('/') === 'assets/js/lessons/fake-book-gtp.js') {
      after += Buffer.byteLength(source);
      continue;
    }
    try {
      const result = await esbuild.transform(source, { minify: true, target: "es2022", loader: "js" });
      await writeFile(file, result.code, "utf8");
      after += Buffer.byteLength(result.code);
    } catch (error) {
      console.warn(`  JS minify skipped for ${path.relative(DIST, file)}: ${error.message.split("\n")[0]}`);
      after += Buffer.byteLength(source);
    }
  }
  console.log(`JS: ${jsFiles.length} files, ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`);
}

// Big lesson photos (some 2-3 MB PNGs) get a WebP beside them, at most 1920 px wide, and the
// page's <img src>/data-full point at it. Originals stay, so JS, CSS and JSON references keep working.
// A WebP is only used when it saves at least a quarter; PNGs also try lossless so diagrams stay crisp.
const IMAGE_MIN_BYTES = 150 * 1024;
const IMAGE_MAX_WIDTH = 1920;
const webpFor = new Set();

async function optimizeImages() {
  const { default: sharp } = await import("sharp");
  const files = [];
  for (const ext of [".png", ".jpg", ".jpeg"]) {
    for (const dir of ["assets/images", "lessons"]) files.push(...(await walk(path.join(DIST, dir), ext)));
  }
  let before = 0;
  let after = 0;
  for (const file of files) {
    const { size } = await stat(file);
    const webp = file.replace(/\.(png|jpe?g)$/i, ".webp");
    if (size < IMAGE_MIN_BYTES || (await stat(webp).catch(() => null))) continue;
    try {
      const resize = { width: IMAGE_MAX_WIDTH, withoutEnlargement: true };
      const candidates = [await sharp(file).resize(resize).webp({ quality: 82, smartSubsample: true }).toBuffer()];
      if (/\.png$/i.test(file)) candidates.push(await sharp(file).resize(resize).webp({ lossless: true, effort: 4 }).toBuffer());
      const best = candidates.sort((a, b) => a.length - b.length)[0];
      if (best.length > size * 0.75) continue;
      await writeFile(webp, best);
      webpFor.add(path.relative(DIST, file).split(path.sep).join("/"));
      before += size;
      after += best.length;
    } catch (error) {
      console.warn(`  Image skipped for ${path.relative(DIST, file)}: ${error.message.split("\n")[0]}`);
    }
  }
  console.log(`Images: ${webpFor.size} large PNG/JPG got a WebP, ${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(1)}MB`);
}

// Once pages point at the WebP, an original that no published page, script, stylesheet or data
// file still names is dead weight (dist/ has a 400 MiB cap). Matching is by file name, anywhere
// in any text file, so a script that builds the path itself still keeps its original.
async function pruneImageOriginals() {
  const texts = [];
  for (const ext of [".html", ".js", ".mjs", ".css", ".json", ".webmanifest", ".svg", ".xml", ".txt"]) {
    for (const file of await walk(DIST, ext)) texts.push(await readFile(file, "utf8"));
  }
  const corpus = texts.join("\n");
  let removed = 0;
  let bytes = 0;
  for (const rel of webpFor) {
    const name = path.posix.basename(rel);
    if (corpus.includes(name) || corpus.includes(encodeURI(name))) continue;
    const file = path.join(DIST, rel);
    bytes += (await stat(file)).size;
    await rm(file);
    removed += 1;
  }
  console.log(`Images: ${removed} originals no longer referenced, removed (${(bytes / 1048576).toFixed(1)}MB)`);
}

// Point <img src>/data-full at the WebP, and lazy-load images after the first two on the page
// (those are usually the logo and the hero, which should load straight away).
function rewriteImages(html, file) {
  const dir = path.posix.dirname(path.relative(DIST, file).split(path.sep).join("/"));
  html = html.replace(/\b(src|data-full)="([^"?#:]+\.(?:png|jpe?g))"/gi, (match, attr, url) => {
    const target = url.startsWith("/") ? url.slice(1) : path.posix.normalize(path.posix.join(dir, url));
    return webpFor.has(target) ? `${attr}="${url.replace(/\.(png|jpe?g)$/i, ".webp")}"` : match;
  });
  let seen = 0;
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    seen += 1;
    if (seen <= 2 || /\bloading\s*=/i.test(tag)) return tag;
    return tag.replace(/^<img\b/i, '<img loading="lazy" decoding="async"');
  });
}

async function minifyHtmlFiles() {
  const htmlFiles = await walk(DIST, ".html");
  let before = 0;
  let after = 0;
  for (const file of htmlFiles) {
    const source = rewriteImages(await readFile(file, "utf8"), file);
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

// Data files (glossary, score library, lesson catalog) were shipped pretty-printed;
// re-serialising drops the indentation, typically 40% of the bytes every lesson fetches.
async function minifyJsonFiles() {
  const jsonFiles = await walk(DIST, ".json");
  let before = 0;
  let after = 0;
  for (const file of jsonFiles) {
    const source = await readFile(file, "utf8");
    before += Buffer.byteLength(source);
    try {
      const compact = JSON.stringify(JSON.parse(source));
      if (Buffer.byteLength(compact) < Buffer.byteLength(source)) {
        await writeFile(file, compact, "utf8");
        after += Buffer.byteLength(compact);
      } else {
        after += Buffer.byteLength(source);
      }
    } catch (error) {
      console.warn(`  JSON minify skipped for ${path.relative(DIST, file)}: ${error.message.split("\n")[0]}`);
      after += Buffer.byteLength(source);
    }
  }
  console.log(`JSON: ${jsonFiles.length} files, ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`);
}

// score-engine.js fetches data/scores/<id>.json for each piece on the page and only
// falls back to the whole library (500 KB) when that file is missing.
async function splitScoreLibrary() {
  const library = JSON.parse(await readFile(path.join(DIST, "data", "score-library.json"), "utf8"));
  const outDir = path.join(DIST, "data", "scores");
  await mkdir(outDir, { recursive: true });
  const ids = Object.keys(library.scores || {}).filter((id) => /^[a-z0-9-]+$/.test(id));
  for (const id of ids) await writeFile(path.join(outDir, `${id}.json`), JSON.stringify(library.scores[id]), "utf8");
  console.log(`Scores: ${ids.length} pieces split into data/scores/`);
}

// Models whose geometry is most of their size get meshopt compression in dist/ only, so the
// repo keeps the editable originals (and downloads stay readable by Blender). Only list models
// whose viewer has a meshopt decoder: pale-blue-dot.html passes MeshoptDecoder to GLTFLoader, and
// cambrian-explosion.html sets model-viewer's meshoptDecoderLocation.
const MESHOPT_MODELS = ["assets/models/anomalocaris_3d_model.glb", "assets/models/saturno_v1.1.glb"];

async function compressModels() {
  const [{ NodeIO }, { ALL_EXTENSIONS }, { meshopt }, { MeshoptEncoder, MeshoptDecoder }] = await Promise.all([
    import("@gltf-transform/core"), import("@gltf-transform/extensions"),
    import("@gltf-transform/functions"), import("meshoptimizer"),
  ]);
  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
  let before = 0;
  let after = 0;
  for (const rel of MESHOPT_MODELS) {
    const file = path.join(DIST, rel);
    const size = (await stat(file)).size;
    const doc = await io.read(file);
    doc.setLogger({ debug() {}, info() {}, warn() {}, error: console.error });
    await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "medium" }));
    await io.write(file, doc);
    before += size;
    after += (await stat(file)).size;
  }
  console.log(`Models: ${MESHOPT_MODELS.length} meshopt-compressed, ${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(1)}MB`);
}

// dist/sw.js answers repeat requests for assets/ and data/ from its cache, keyed by content hash
// (see scripts/sw-template.js). Runs last so the hashes are of the files as published.
const SW_SKIP = /\.(html?|mp4|webm|mov|m4v|mp3|wav|ogg|m4a|flac|map)$/i;
const SW_MAX_BYTES = 15 * 1024 * 1024;

async function writeServiceWorker() {
  // { "assets/js/": { "nav-mobile.js": "1a2b3c4d" } }: grouping by folder halves the size.
  const manifest = {};
  let count = 0;
  for (const dir of ["assets", "data"]) {
    for (const file of await walk(path.join(DIST, dir), "")) {
      const rel = path.relative(DIST, file).split(path.sep).join("/");
      if (SW_SKIP.test(rel) || path.basename(rel).startsWith(".")) continue;
      const bytes = await readFile(file);
      if (bytes.length > SW_MAX_BYTES) continue;
      const folder = rel.slice(0, rel.lastIndexOf("/") + 1);
      (manifest[folder] ||= {})[rel.slice(folder.length)] = createHash("sha1").update(bytes).digest("hex").slice(0, 8);
      count += 1;
    }
  }
  const template = await readFile(path.join(ROOT, "scripts", "sw-template.js"), "utf8");
  const code = template.replace("__MANIFEST__", JSON.stringify(manifest));
  const result = await esbuild.transform(code, { minify: true, target: "es2017", loader: "js" });
  await writeFile(path.join(DIST, "sw.js"), result.code, "utf8");
  console.log(`Service worker: ${count} cacheable files, sw.js ${(result.code.length / 1024).toFixed(0)}KB`);
}

async function main() {
  console.log("Copying site into dist/ ...");
  await copySite();
  await minifyCssFiles();
  await minifyJsFiles();
  await minifyJsonFiles();
  await optimizeImages();
  await compressModels();
  await splitScoreLibrary();
  await minifyHtmlFiles();
  await pruneImageOriginals();
  await writeDiscoveryFiles();
  await writeServiceWorker();
  console.log("dist/ ready.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
