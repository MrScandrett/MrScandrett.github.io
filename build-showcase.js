#!/usr/bin/env node

const fs = require("fs/promises");
const fssync = require("fs");
const path = require("path");
const zlib = require("zlib");
const { spawnSync } = require("child_process");
const esbuild = require("esbuild");
const { minify } = require("html-minifier-terser");
const pivEngine = require("./lib/piv-engine.js");
const { buildPivotFrameThumbSvg } = require("./lib/piv-thumb.js");

const ROOT = process.cwd();
const STUDENT_PROJECTS_DIR = path.join(ROOT, "student-projects");
const APPS_DIR = path.join(ROOT, "apps");
const MANIFEST_PATH = path.join(APPS_DIR, "manifest.json");
const MANIFEST_OVERRIDES_PATH = path.join(ROOT, "data", "manifest-overrides.json");
const SHOWCASE_THUMBS_DIR = path.join(ROOT, "assets", "thumbs", "showcase");
const PIV_ENGINE_PATH = path.join(ROOT, "lib", "piv-engine.js");
const PIV_PLAYER_PATH = path.join(ROOT, "lib", "piv-player.js");
const TOUCH_CONTROLS_PATH = path.join(ROOT, "lib", "touch-controls.js");
const TOUCH_CONTROLS_CONFIG_PATH = path.join(ROOT, "data", "touch-controls.json");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);
const MODEL_EXTENSIONS = new Set([".stl", ".obj"]);
const PIVOT_SOURCE_EXTENSIONS = new Set([".piv", ".stk"]);
const PIVOT_PREVIEW_EXTENSIONS = [".webm", ".mp4", ".gif", ".mov"];
const MARKER_FILE_NAME = "showcase.json";
const MARKER_KINDS = new Set(["photo", "link", "file"]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"]);
const MODEL_RESOURCE_EXTENSIONS = new Set([
  ".stl",
  ".obj",
  ".mtl",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".webp",
  ".svg",
  ".tga",
]);
const THUMB_EXTENSIONS = new Set([".webp", ".png", ".jpg", ".jpeg", ".svg", ".gif"]);
const POSSIBLE_THUMB_NAMES = ["thumb.webp", "thumbnail.webp", "cover.webp", "hero.webp"];
let imageToolsPromise = null;

function logStep(message) {
  console.log(`[build-showcase] ${message}`);
}

function fail(message) {
  console.error(`[build-showcase] ERROR: ${message}`);
  process.exit(1);
}

function exists(targetPath) {
  return fssync.existsSync(targetPath);
}

function findFileNameCaseInsensitive(dirPath, desiredName) {
  if (!exists(dirPath)) return null;
  const desiredLower = desiredName.toLowerCase();
  const entries = fssync.readdirSync(dirPath, { withFileTypes: true });
  const exact = entries.find((entry) => entry.isFile() && entry.name === desiredName);
  if (exact) return exact.name;
  const match = entries.find((entry) => entry.isFile() && entry.name.toLowerCase() === desiredLower);
  return match ? match.name : null;
}

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

function toSlug(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "student-project";
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toTitleFromSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function displayTitleFromFileName(fileName) {
  return toTitleFromSlug(String(fileName || "").replace(/\.[^/.]+$/g, "").replace(/[_]+/g, "-"));
}

function studentFromPath(targetPath) {
  const rel = path.relative(STUDENT_PROJECTS_DIR, targetPath);
  if (!rel || rel.startsWith("..")) return "Student";
  const parts = rel.split(path.sep).filter(Boolean);
  if (parts.length === 0) return "Student";
  let first = parts[0];
  if (parts.length === 1) {
    const ext = path.extname(first);
    if (ext) first = path.basename(first, ext);
  }
  if (!first) return "Student";
  if (/[A-Z]/.test(first)) return first;
  return first
    .split(/[\s_-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function gradeFromPath(targetPath) {
  const rel = path.relative(STUDENT_PROJECTS_DIR, targetPath);
  if (!rel || rel.startsWith("..")) return "";
  const parts = rel.split(path.sep).filter(Boolean);
  if (parts.length < 2) return "";
  const candidate = String(parts[1] || "").trim();
  if (!candidate) return "";
  if (/kindergarten|grade|[0-9](st|nd|rd|th)/i.test(candidate)) return candidate;
  return "";
}

function normalizeRelativeUrl(url) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return url;
  if (url.startsWith("mailto:") || url.startsWith("tel:") || url.startsWith("data:") || url.startsWith("javascript:")) return url;
  if (url.startsWith("#")) return url;
  if (url.startsWith("/")) return `.${url}`;
  return url;
}

function rewriteHtmlPaths(html, options = {}) {
  const { hasStyle = false, hasScript = false } = options;
  let out = html;

  // Rewrite explicit minified targets.
  if (hasStyle) {
    out = out.replace(/\bhref\s*=\s*(["'])(?:\.\/)?style\.css\1/gi, "href=$1style.min.css$1");
  }
  if (hasScript) {
    out = out.replace(/\bsrc\s*=\s*(["'])(?:\.\/)?script\.js\1/gi, "src=$1app.min.js$1");
  }

  // Rewrite absolute paths to relative paths.
  out = out.replace(/\b(src|href|poster)\s*=\s*(["'])([^"']+)\2/gi, (match, attr, quote, value) => {
    const next = normalizeRelativeUrl(value.trim());
    return `${attr}=${quote}${next}${quote}`;
  });

  // Rewrite CSS url(/...) found inline in html.
  out = out.replace(/url\(\s*(["']?)(\/[^"')]+)\1\s*\)/gi, (match, quote, value) => {
    const next = normalizeRelativeUrl(value);
    return `url(${quote}${next}${quote})`;
  });

  return out;
}

// Without this a phone lays the page out at ~980px and zooms out, which makes
// every game unreadable. Several student pages predate anyone testing on a
// phone, so guarantee it at build time rather than chasing each one.
function ensureViewportMeta(html) {
  if (/<meta[^>]+name\s*=\s*["']viewport["']/i.test(html)) return html;
  const meta = '<meta name="viewport" content="width=device-width, initial-scale=1" />';
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => `${m}\n${meta}`);
  return `${meta}\n${html}`;
}

let touchControlsSourcePromise = null;
function touchControlsSource() {
  if (!touchControlsSourcePromise) {
    touchControlsSourcePromise = fs
      .readFile(TOUCH_CONTROLS_PATH, "utf8")
      .then((code) => esbuild.transform(code, { minify: true, loader: "js" }))
      .then((result) => result.code);
  }
  return touchControlsSourcePromise;
}

let touchControlsConfigPromise = null;
function touchControlsConfig() {
  if (!touchControlsConfigPromise) {
    touchControlsConfigPromise = fs
      .readFile(TOUCH_CONTROLS_CONFIG_PATH, "utf8")
      .then((raw) => JSON.parse(raw))
      .catch(() => ({}));
  }
  return touchControlsConfigPromise;
}

// Appends the on-screen gamepad for slugs that declare one. Config first, then
// the layer, so the script sees window.__TOUCH_CONTROLS__ already set.
async function injectTouchControls(html, slug) {
  const config = (await touchControlsConfig())[slug];
  if (!config) return html;
  const payload = JSON.stringify(config).replace(/</g, "\\u003c");
  const block =
    `<script>window.__TOUCH_CONTROLS__=${payload}</script>` +
    `<script>${await touchControlsSource()}</script>`;
  return /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, `${block}</body>`)
    : html + block;
}

function rewriteCssPaths(css) {
  return css.replace(/url\(\s*(["']?)(\/[^"')]+)\1\s*\)/gi, (match, quote, value) => {
    const next = normalizeRelativeUrl(value);
    return `url(${quote}${next}${quote})`;
  });
}

const SKIP_DIR_NAMES = new Set([
  ".git", "node_modules",
  // macOS/Windows system folders
  ".Spotlight-V100", ".fseventsd", ".Trashes", "$RECYCLE.BIN",
  "System Volume Information",
  // Consolidated alias folders (individual student folders already cover these)
  "pivotstickfigure",
]);

function listSubdirs(dirPath) {
  const out = [];
  const stack = [dirPath];

  while (stack.length) {
    const current = stack.pop();
    const entries = fssync.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      out.push(full);
      stack.push(full);
    }
  }

  return out;
}

function findWebProjectSources(rootDir) {
  const subdirs = listSubdirs(rootDir);
  const projects = [];

  for (const dir of subdirs) {
    const entries = fssync.readdirSync(dir, { withFileTypes: true });
    const htmlFiles = entries.filter((entry) => entry.isFile() && /\.html$/i.test(entry.name)).map((entry) => entry.name);

    if (htmlFiles.length === 0) continue;

    const indexLike = htmlFiles.find((name) => name.toLowerCase() === "index.html");
    const entryHtml = indexLike || (htmlFiles.length === 1 ? htmlFiles[0] : null);
    if (!entryHtml) continue;

    projects.push({
      kind: "web",
      projectDir: dir,
      entryHtml,
      student: studentFromPath(dir),
      slugBase: path.basename(dir),
    });
  }

  return projects;
}

function isNestedInside(parentDir, childDir) {
  const rel = path.relative(parentDir, childDir);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function isInsideAnyDir(targetPath, directories) {
  return directories.some((dir) => {
    const rel = path.relative(dir, targetPath);
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  });
}

function pruneNestedWebSources(sources) {
  const sorted = sources
    .slice()
    .sort((a, b) => a.projectDir.split(path.sep).length - b.projectDir.split(path.sep).length);

  const kept = [];

  for (const source of sorted) {
    const duplicateNested = kept.some(
      (existing) => existing.student === source.student && isNestedInside(existing.projectDir, source.projectDir)
    );

    if (duplicateNested) {
      logStep(`Skipping nested duplicate project for ${source.student}: ${source.projectDir}`);
      continue;
    }

    kept.push(source);
  }

  return kept;
}

function findScratchSources(rootDir) {
  const scratchProjects = [];
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fssync.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) continue;
        stack.push(full);
        continue;
      }

      if (!entry.isFile()) continue;
      if (path.extname(entry.name).toLowerCase() !== ".sb3") continue;

      const student = studentFromPath(full);
      scratchProjects.push({
        kind: "scratch",
        filePath: full,
        student,
        slugBase: `${student}-${displayTitleFromFileName(entry.name)}`,
      });
    }
  }

  return scratchProjects;
}

function findModelSources(rootDir, ignoreDirectories = []) {
  const modelProjects = [];
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fssync.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) continue;
        if (isInsideAnyDir(full, ignoreDirectories)) continue;
        stack.push(full);
        continue;
      }

      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!MODEL_EXTENSIONS.has(ext)) continue;
      if (isInsideAnyDir(full, ignoreDirectories)) continue;

      const student = studentFromPath(full);
      const grade = gradeFromPath(full);
      const modelTitle = displayTitleFromFileName(entry.name) || "3D Model";
      modelProjects.push({
        kind: "model",
        format: ext === ".obj" ? "obj" : "stl",
        filePath: full,
        student,
        grade,
        title: modelTitle,
        slugBase: `${student}-${modelTitle}`,
      });
    }
  }

  return modelProjects;
}

function resolvePivotPreviewPath(sourceFilePath) {
  const sourceDir = path.dirname(sourceFilePath);
  const sourceBase = path.basename(sourceFilePath, path.extname(sourceFilePath)).toLowerCase();
  const entries = fssync.readdirSync(sourceDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);

  for (const previewExt of PIVOT_PREVIEW_EXTENSIONS) {
    const exact = files.find(
      (name) => path.extname(name).toLowerCase() === previewExt && path.basename(name, path.extname(name)).toLowerCase() === sourceBase
    );
    if (exact) return path.join(sourceDir, exact);
  }

  for (const previewExt of PIVOT_PREVIEW_EXTENSIONS) {
    const fallback = files.find((name) => path.extname(name).toLowerCase() === previewExt);
    if (fallback) return path.join(sourceDir, fallback);
  }

  return "";
}

function findPivotSources(rootDir, ignoreDirectories = []) {
  const pivotProjects = [];
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fssync.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) continue;
        if (isInsideAnyDir(full, ignoreDirectories)) continue;
        stack.push(full);
        continue;
      }

      if (!entry.isFile()) continue;
      if (isInsideAnyDir(full, ignoreDirectories)) continue;

      const ext = path.extname(entry.name).toLowerCase();
      if (!PIVOT_SOURCE_EXTENSIONS.has(ext)) continue;

      const student = studentFromPath(full);
      const title = displayTitleFromFileName(entry.name) || "Pivot Animation";
      const previewPath = resolvePivotPreviewPath(full);

      pivotProjects.push({
        kind: "pivot",
        filePath: full,
        previewPath,
        student,
        title,
        slugBase: `${student}-${title}`,
      });
    }
  }

  return pivotProjects;
}

function findMarkerSources(rootDir, ignoreDirectories = []) {
  const sources = [];
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop();
    if (isInsideAnyDir(current, ignoreDirectories)) continue;

    const entries = fssync.readdirSync(current, { withFileTypes: true });
    const markerEntry = entries.find((entry) => entry.isFile() && entry.name === MARKER_FILE_NAME);

    if (markerEntry) {
      try {
        const raw = fssync.readFileSync(path.join(current, MARKER_FILE_NAME), "utf8");
        const meta = JSON.parse(raw);
        const kind = String(meta.kind || "").toLowerCase();
        if (MARKER_KINDS.has(kind)) {
          const student = String(meta.student || studentFromPath(current)).trim() || "Student";
          const title = String(meta.title || toTitleFromSlug(path.basename(current))).trim() || "Project";
          sources.push({
            kind: `marker-${kind}`,
            dir: current,
            meta,
            student,
            title,
            slugBase: `${student}-${title}`,
          });
        } else {
          logStep(`Skipping marker file with unknown kind "${kind}" at ${current}`);
        }
      } catch (error) {
        logStep(`Skipping invalid marker file at ${current}: ${error.message}`);
      }
      // Marker directories are leaf project directories; do not descend further.
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (isInsideAnyDir(full, ignoreDirectories)) continue;
      stack.push(full);
    }
  }

  return sources;
}

async function copyDirectoryRecursive(sourceDir, destinationDir, options = {}) {
  const { skipFiles = new Set(), skipDirectories = new Set() } = options;

  await ensureDir(destinationDir);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      if (skipDirectories.has(entry.name)) continue;
      await copyDirectoryRecursive(sourcePath, destinationPath, options);
      continue;
    }

    if (skipFiles.has(entry.name)) continue;
    await fs.copyFile(sourcePath, destinationPath);
  }
}

function resolveCleanCssBin() {
  const binName = process.platform === "win32" ? "cleancss.cmd" : "cleancss";
  const localBin = path.join(ROOT, "node_modules", ".bin", binName);
  if (exists(localBin)) return localBin;
  return binName;
}

async function minifyCssFile(sourcePath, destinationPath) {
  const sourceCss = await fs.readFile(sourcePath, "utf8");
  const normalizedCss = rewriteCssPaths(sourceCss);

  const tempInput = path.join(path.dirname(destinationPath), `.tmp-${Date.now()}-style.css`);
  await fs.writeFile(tempInput, normalizedCss, "utf8");

  const cleancss = resolveCleanCssBin();
  const run = spawnSync(cleancss, ["-O2", "-o", destinationPath, tempInput], { encoding: "utf8" });
  await fs.rm(tempInput, { force: true });

  if (run.status !== 0) {
    throw new Error(`CSS minification failed: ${run.stderr || run.stdout || "unknown error"}`);
  }
}

async function optimizeImagesToWebp(assetsDir) {
  if (!exists(assetsDir)) return [];
  const { imagemin, imageminWebp } = await loadImageTools();

  const converted = [];
  const stack = [assetsDir];

  while (stack.length) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) continue;

      try {
        const inputBuffer = await fs.readFile(fullPath);
        const outputBuffer = await imagemin.buffer(inputBuffer, {
          plugins: [imageminWebp({ quality: 80 })]
        });

        const outputPath = fullPath.replace(new RegExp(`${ext}$`, "i"), ".webp");
        await fs.writeFile(outputPath, outputBuffer);
        converted.push(outputPath);
      } catch (error) {
        logStep(`Image optimization skipped for ${fullPath}: ${error.message}`);
      }
    }
  }

  return converted;
}

async function loadImageTools() {
  if (imageToolsPromise) return imageToolsPromise;
  imageToolsPromise = Promise.all([import("imagemin"), import("imagemin-webp")]).then(([imageminMod, webpMod]) => ({
    imagemin: imageminMod.default || imageminMod,
    imageminWebp: webpMod.default || webpMod
  }));
  return imageToolsPromise;
}

function getHtmlTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  return match[1].replace(/\s+/g, " ").trim() || null;
}

function toPosixPath(p) {
  return p.split(path.sep).join("/");
}

async function findShowcaseThumb(slug, student) {
  // Look in assets/thumbs/showcase/ for a file whose name contains the slug or student name.
  if (!exists(SHOWCASE_THUMBS_DIR)) return null;
  const candidates = await fs.readdir(SHOWCASE_THUMBS_DIR);
  const normalize = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const slugN = normalize(slug);
  const studentN = normalize(student);
  for (const file of candidates) {
    const fileN = normalize(path.basename(file, path.extname(file)));
    if (fileN.includes(slugN) || (studentN.length > 2 && fileN.includes(studentN))) {
      return `./assets/thumbs/showcase/${file}`;
    }
  }
  return null;
}

async function chooseThumbnail(projectOutputDir, convertedWebps) {
  const assetsDir = path.join(projectOutputDir, "assets");
  if (!exists(assetsDir)) return null;

  for (const fileName of POSSIBLE_THUMB_NAMES) {
    const fullPath = path.join(assetsDir, fileName);
    if (exists(fullPath)) {
      return toPosixPath(path.relative(APPS_DIR, fullPath));
    }
  }

  if (convertedWebps.length > 0) {
    return toPosixPath(path.relative(APPS_DIR, convertedWebps[0]));
  }
  const stack = [assetsDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!THUMB_EXTENSIONS.has(ext)) continue;
      return toPosixPath(path.relative(APPS_DIR, full));
    }
  }

  return null;
}

async function processProject(source, slug) {
  const { projectDir, entryHtml, student } = source;
  const outputDir = path.join(APPS_DIR, slug);
  const sourceIndexPath = path.join(projectDir, entryHtml);
  const sourceStyleName = findFileNameCaseInsensitive(projectDir, "style.css");
  const sourceScriptName = findFileNameCaseInsensitive(projectDir, "script.js");
  const sourceStylePath = sourceStyleName ? path.join(projectDir, sourceStyleName) : null;
  const sourceScriptPath = sourceScriptName ? path.join(projectDir, sourceScriptName) : null;
  const hasStyle = Boolean(sourceStylePath);
  const hasScript = Boolean(sourceScriptPath);

  await fs.rm(outputDir, { recursive: true, force: true });
  await ensureDir(outputDir);

  // Copy everything except root index/style/script; those are rebuilt below.
  const skipFiles = new Set([entryHtml]);
  if (sourceStyleName) skipFiles.add(sourceStyleName);
  if (sourceScriptName) skipFiles.add(sourceScriptName);
  await copyDirectoryRecursive(projectDir, outputDir, {
    skipFiles
  });

  if (hasScript) {
    await esbuild.build({
      entryPoints: [sourceScriptPath],
      outfile: path.join(outputDir, "app.min.js"),
      bundle: true,
      minify: true,
      sourcemap: false,
      platform: "browser",
      target: ["es2018"]
    });

    // Keep a compatibility copy for multi-page student projects that still link script.js.
    await fs.copyFile(sourceScriptPath, path.join(outputDir, "script.js"));
  }

  if (hasStyle) {
    await minifyCssFile(sourceStylePath, path.join(outputDir, "style.min.css"));

    // Keep a compatibility copy for secondary pages that still link style.css.
    const sourceCss = await fs.readFile(sourceStylePath, "utf8");
    await fs.writeFile(path.join(outputDir, "style.css"), rewriteCssPaths(sourceCss), "utf8");
  }

  const sourceHtml = await fs.readFile(sourceIndexPath, "utf8");
  const projectTitle = getHtmlTitle(sourceHtml) || `${toTitleFromSlug(slug)} Project`;

  let rewrittenHtml = rewriteHtmlPaths(sourceHtml, { hasStyle, hasScript });
  rewrittenHtml = ensureViewportMeta(rewrittenHtml);
  rewrittenHtml = await injectTouchControls(rewrittenHtml, slug);
  const minifiedHtml = await minify(rewrittenHtml, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    minifyCSS: true,
    minifyJS: false,
    keepClosingSlash: true
  });

  await fs.writeFile(path.join(outputDir, "index.html"), minifiedHtml, "utf8");

  const assetsDir = path.join(outputDir, "assets");
  const convertedWebps = await optimizeImagesToWebp(assetsDir);
  const thumbnailRel = await chooseThumbnail(outputDir, convertedWebps);
  // Fall back to dedicated showcase thumbs folder if no thumb found inside the app
  const thumbnail = thumbnailRel
    ? `./apps/${thumbnailRel}`
    : await findShowcaseThumb(slug, student);

  return {
    name: projectTitle,
    slug,
    url: `./apps/${slug}/`,
    thumbnail,
    student,
    category: "Web",
    tech: ["HTML", "CSS", "JavaScript"],
    tags: ["student-upload"],
    date_added: new Date().toISOString().slice(0, 10),
  };
}

async function processScratchProject(source, slug) {
  const outputDir = path.join(APPS_DIR, slug);
  const scratchFileOut = path.join(outputDir, "project.sb3");
  const sourceFileName = path.basename(source.filePath);
  const title = displayTitleFromFileName(sourceFileName) || "Scratch Project";

  await fs.rm(outputDir, { recursive: true, force: true });
  await ensureDir(outputDir);
  await fs.copyFile(source.filePath, scratchFileOut);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · Scratch Player</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Segoe UI", Arial, sans-serif;
      background: #0f1724;
      color: #eef4ff;
      display: grid;
      grid-template-rows: auto 1fr auto;
      /* Grid items won't shrink past their content without this, which on a
         narrow phone widened the page and produced a sideways scroll. */
      overflow-x: hidden;
    }
    body > * { min-width: 0; }

    .head, .foot {
      padding: 0.8rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.14);
      background: #111c2e;
    }
    .foot {
      border-top: 1px solid rgba(255,255,255,0.14);
      border-bottom: 0;
      font-size: 0.9rem;
      color: #d2dff5;
    }
    .head h1 {
      margin: 0;
      font-size: 1rem;
      letter-spacing: 0.01em;
    }
    .stage {
      padding: 0.8rem;
      display: grid;
      gap: 0.7rem;
      align-items: start;
      justify-items: center;
    }
    iframe {
      width: min(96vw, 980px);
      height: min(72vh, 760px);
      border: 0;
      border-radius: 10px;
      background: #0a0a0a;
    }
    .actions {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    a {
      color: #eef4ff;
      text-decoration: none;
      border: 1px solid rgba(255,255,255,0.28);
      border-radius: 8px;
      padding: 0.5rem 0.8rem;
      background: #19283f;
      font-weight: 600;
      font-size: 0.9rem;
    }
    a:hover {
      background: #243b5e;
    }
  </style>
</head>
<body>
  <header class="head">
    <h1>${title} · Scratch (.sb3)</h1>
  </header>
  <main class="stage">
    <iframe id="player" title="Scratch project player" allowfullscreen loading="eager"></iframe>
    <div class="actions">
      <a id="open-editor" target="_blank" rel="noopener noreferrer">Open in TurboWarp Editor</a>
      <a href="./project.sb3" download>Download .sb3</a>
    </div>
  </main>
  <footer class="foot">
    If the embed does not load, use "Open in TurboWarp Editor" or download the .sb3 file.
  </footer>
  <script>
    (function () {
      var fileUrl = new URL("./project.sb3", window.location.href).href;
      var embedUrl = "https://turbowarp.org/embed?autoplay&settings-button&project_url=" + encodeURIComponent(fileUrl);
      var editorUrl = "https://turbowarp.org/editor?project_url=" + encodeURIComponent(fileUrl);
      document.getElementById("player").src = embedUrl;
      document.getElementById("open-editor").href = editorUrl;
    })();
  </script>
</body>
</html>`;

  await fs.writeFile(path.join(outputDir, "index.html"), html, "utf8");

  return {
    name: title,
    slug,
    url: `./apps/${slug}/`,
    thumbnail: await findShowcaseThumb(slug, source.student),
    student: source.student,
    category: "Scratch",
    tech: ["Scratch"],
    tags: ["student-upload", "sb3", "scratch"],
    date_added: new Date().toISOString().slice(0, 10),
  };
}

function buildPivotThumbSvg({ title, student }) {
  const safeTitle = String(title || "Pivot Animation").replace(/[<&>"]/g, "");
  const safeStudent = String(student || "Student").replace(/[<&>"]/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-label="Pivot animation thumbnail">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#0f3b4c"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <g transform="translate(120 140)" stroke="#eaf6ff" stroke-width="20" fill="none" stroke-linecap="round">
    <circle cx="180" cy="140" r="56"/>
    <line x1="180" y1="196" x2="180" y2="420"/>
    <line x1="180" y1="250" x2="92" y2="330"/>
    <line x1="180" y1="250" x2="268" y2="330"/>
    <line x1="180" y1="420" x2="110" y2="550"/>
    <line x1="180" y1="420" x2="248" y2="550"/>
  </g>
  <text x="520" y="350" fill="#f4fbff" font-size="64" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${safeTitle}</text>
  <text x="520" y="430" fill="#cfe4ef" font-size="40" font-family="Segoe UI, Arial, sans-serif">Pivot Animation · ${safeStudent}</text>
</svg>
`;
}

// Reads a .piv and returns the parsed document, or null when the file is a
// variant this engine doesn't understand (a .stk figure, say). Callers fall back
// to the "export a preview video" page in that case.
function readPivotDocument(filePath) {
  // .stk holds a single figure rather than an animation — nothing to play.
  if (path.extname(filePath).toLowerCase() !== ".piv") return null;
  try {
    const raw = fssync.readFileSync(filePath);
    return pivEngine.parsePiv(new Uint8Array(zlib.inflateSync(raw)));
  } catch (error) {
    console.warn(`  ! ${path.basename(filePath)}: ${error.message}`);
    return null;
  }
}

let pivotScriptPromise = null;
// The engine and player are shared source; each Pivot page inlines a minified
// copy so the viewer stays a single self-contained file.
function pivotInlineScript() {
  if (!pivotScriptPromise) {
    pivotScriptPromise = (async () => {
      const source = [
        await fs.readFile(PIV_ENGINE_PATH, "utf8"),
        await fs.readFile(PIV_PLAYER_PATH, "utf8"),
      ].join("\n");
      const result = await esbuild.transform(source, { minify: true, loader: "js" });
      return result.code;
    })();
  }
  return pivotScriptPromise;
}

async function processPivotProject(source, slug) {
  const outputDir = path.join(APPS_DIR, slug);
  const sourceFileName = path.basename(source.filePath);
  const pivotExt = path.extname(sourceFileName).slice(1).toUpperCase() || "PIV";
  const title = source.title || displayTitleFromFileName(sourceFileName) || "Pivot Animation";
  const studentLabel = source.student || "Student";

  await fs.rm(outputDir, { recursive: true, force: true });
  const mediaOutDir = path.join(outputDir, "assets", "media");
  await ensureDir(mediaOutDir);

  const sourcePivotOutName = sourceFileName;
  await fs.copyFile(source.filePath, path.join(mediaOutDir, sourcePivotOutName));

  const hasPreview = Boolean(source.previewPath);
  let previewOutName = "";
  let previewRel = "";
  let previewExt = "";
  if (hasPreview) {
    previewOutName = path.basename(source.previewPath);
    previewExt = path.extname(previewOutName).toLowerCase();
    await fs.copyFile(source.previewPath, path.join(mediaOutDir, previewOutName));
    previewRel = `./assets/media/${encodeURIComponent(previewOutName)}`;
  }

  const pivotRel = `./assets/media/${encodeURIComponent(sourcePivotOutName)}`;
  const isVideoPreview = hasPreview && previewExt !== ".gif";

  // Play the .piv itself where we can. A preview video is only a fallback now,
  // and the "export a video first" placeholder is the last resort.
  const pivDoc = readPivotDocument(source.filePath);
  const inlineScript = pivDoc ? await pivotInlineScript() : "";

  let embed;
  if (pivDoc) {
    embed = `<div class="piv" data-piv-src="${pivotRel}" data-piv-title="${title}">
      <canvas data-piv-canvas width="${pivDoc.width}" height="${pivDoc.height}" role="img" aria-label="${title}"></canvas>
      <p class="piv-status" data-piv-status>Loading animation…</p>
      <div class="piv-controls" data-piv-controls hidden>
        <button type="button" data-piv-toggle aria-pressed="false">Play</button>
        <button type="button" data-piv-step="-1" aria-label="Previous frame">&#9664;</button>
        <button type="button" data-piv-step="1" aria-label="Next frame">&#9654;</button>
        <input type="range" data-piv-scrub aria-label="Frame" value="0" min="0" max="0" />
        <span class="piv-counter" data-piv-counter aria-live="off"></span>
      </div>
    </div>`;
  } else if (hasPreview) {
    embed = isVideoPreview
      ? `<video controls autoplay loop muted playsinline preload="metadata"><source src="${previewRel}" /></video>`
      : `<img src="${previewRel}" alt="${title} animation preview" loading="eager" decoding="async" />`;
  } else {
    embed = `<div class="empty">No preview media found yet. Add a .webm, .mp4, .gif, or .mov with the same filename as the Pivot file to enable in-browser playback.</div>`;
  }

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · Pivot Viewer</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: #0f172a;
      color: #eff6ff;
      font-family: "Segoe UI", Arial, sans-serif;
      display: grid;
      grid-template-rows: auto 1fr auto;
      /* Grid items won't shrink past their content without this, which on a
         narrow phone widened the page and produced a sideways scroll. */
      overflow-x: hidden;
    }
    body > * { min-width: 0; }

    .head, .foot {
      padding: 0.9rem 1rem;
      background: #12213b;
      border-bottom: 1px solid rgba(255,255,255,0.14);
    }
    .foot {
      border-top: 1px solid rgba(255,255,255,0.14);
      border-bottom: 0;
      color: #cddcf0;
      font-size: 0.92rem;
    }
    .head h1 {
      margin: 0;
      font-size: 1.1rem;
    }
    .head p {
      margin: 0.35rem 0 0 0;
      color: #c6d7ef;
      font-size: 0.92rem;
    }
    .stage {
      display: grid;
      gap: 0.8rem;
      padding: 0.9rem;
      align-content: start;
      justify-items: center;
    }
    video, img {
      width: min(96vw, 1200px);
      max-height: 78vh;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.2);
      background: #0a0f1c;
      object-fit: contain;
    }
    .empty {
      width: min(96vw, 1000px);
      border-radius: 12px;
      border: 1px dashed rgba(255,255,255,0.35);
      background: rgba(17, 32, 60, 0.8);
      padding: 1rem;
      color: #d8e7f9;
      line-height: 1.5;
    }
    .actions {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .actions a {
      color: #eff6ff;
      text-decoration: none;
      border: 1px solid rgba(255,255,255,0.28);
      border-radius: 8px;
      padding: 0.5rem 0.8rem;
      background: #1b3156;
      font-weight: 600;
      font-size: 0.92rem;
    }
    .actions a:hover {
      background: #284679;
    }
    .piv {
      display: grid;
      gap: 0.7rem;
      justify-items: center;
      width: min(96vw, 1200px);
    }
    .piv canvas {
      width: 100%;
      max-height: 72vh;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.2);
      background: #ffffff;
    }
    .piv-status {
      margin: 0;
      color: #cddcf0;
      font-size: 0.92rem;
    }
    .piv-status.is-error {
      color: #ffd7d7;
    }
    .piv-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
      justify-content: center;
    }
    .piv-controls button {
      font: inherit;
      font-size: 0.92rem;
      font-weight: 600;
      color: #eff6ff;
      background: #1b3156;
      border: 1px solid rgba(255,255,255,0.28);
      border-radius: 8px;
      padding: 0.45rem 0.8rem;
      cursor: pointer;
      min-width: 3rem;
    }
    .piv-controls button:hover {
      background: #284679;
    }
    .piv-controls input[type="range"] {
      flex: 1 1 14rem;
      max-width: 30rem;
      accent-color: #7fb2ff;
    }
    .piv-counter {
      font-variant-numeric: tabular-nums;
      color: #cddcf0;
      font-size: 0.92rem;
      min-width: 6ch;
      text-align: center;
    }
    :focus-visible {
      outline: 3px solid #9fd0ff;
      outline-offset: 2px;
    }
  </style>
</head>
<body>
  <header class="head">
    <h1>${title}</h1>
    <p>${studentLabel} · Pivot ${pivotExt}</p>
  </header>
  <main class="stage">
    ${embed}
    <div class="actions">
      <a href="${pivotRel}" download>Download Original .${pivotExt.toLowerCase()}</a>
    </div>
  </main>
  <footer class="foot">
    ${
      pivDoc
        ? `${pivDoc.frames.length} frames at ${pivDoc.fps} fps, drawn straight from the original Pivot file — no video export needed.`
        : hasPreview
          ? "Playback uses the exported preview media file stored with this Pivot project."
          : "Export a preview video or GIF to watch this animation directly in the browser."
    }
  </footer>
  ${inlineScript ? `<script>${inlineScript}</script>` : ""}
</body>
</html>`;

  const minifiedHtml = await minify(html, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    minifyCSS: true,
    minifyJS: false,
    keepClosingSlash: true,
  });

  await fs.writeFile(path.join(outputDir, "index.html"), minifiedHtml, "utf8");

  let thumbnail = null;
  if (hasPreview) {
    thumbnail = `./apps/${slug}/assets/media/${encodeURIComponent(previewOutName)}`;
  } else {
    // Check showcase thumbs folder first (named screenshots take priority over auto-generated SVG)
    const showcaseThumb = await findShowcaseThumb(slug, studentLabel);
    if (showcaseThumb) {
      thumbnail = showcaseThumb;
    } else {
      const thumbSvg = pivDoc
        ? buildPivotFrameThumbSvg({ title, student: studentLabel, doc: pivDoc })
        : buildPivotThumbSvg({ title, student: studentLabel });
      await ensureDir(path.join(outputDir, "assets"));
      await fs.writeFile(path.join(outputDir, "assets", "thumb.svg"), thumbSvg, "utf8");
      thumbnail = `./apps/${slug}/assets/thumb.svg`;
    }
  }

  return {
    name: `${title} (Pivot Animation)`,
    slug,
    url: `./apps/${slug}/`,
    thumbnail,
    student: studentLabel,
    category: "Animation",
    program: "Student Upload",
    tech: pivDoc
      ? ["Pivot Animator", pivotExt, "Canvas"]
      : ["Pivot Animator", hasPreview ? path.extname(previewOutName).slice(1).toUpperCase() : pivotExt],
    tags: pivDoc
      ? ["student-upload", "pivot-animation", "playable"]
      : ["student-upload", "pivot-animation"],
    difficulty: "Beginner",
    date_added: new Date().toISOString().slice(0, 10),
  };
}

function viewerPageShell({ title, headline, subline, bodyHtml, footNote }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: #0f172a;
      color: #eff6ff;
      font-family: "Segoe UI", Arial, sans-serif;
      display: grid;
      grid-template-rows: auto 1fr auto;
      /* Grid items won't shrink past their content without this, which on a
         narrow phone widened the page and produced a sideways scroll. */
      overflow-x: hidden;
    }
    body > * { min-width: 0; }

    .head, .foot {
      padding: 0.9rem 1rem;
      background: #12213b;
      border-bottom: 1px solid rgba(255,255,255,0.14);
    }
    .foot {
      border-top: 1px solid rgba(255,255,255,0.14);
      border-bottom: 0;
      color: #cddcf0;
      font-size: 0.92rem;
    }
    .head h1 { margin: 0; font-size: 1.1rem; }
    .head p { margin: 0.35rem 0 0 0; color: #c6d7ef; font-size: 0.92rem; }
    main {
      display: grid;
      gap: 0.8rem;
      padding: 0.9rem;
      align-content: start;
      justify-items: center;
    }
    main img, main video, main iframe {
      width: min(96vw, 1100px);
      max-height: 78vh;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.2);
      background: #0a0f1c;
      object-fit: contain;
    }
    main iframe { height: min(72vh, 700px); background: #fff; }
    main audio { width: min(96vw, 700px); }
    .empty {
      width: min(96vw, 900px);
      border-radius: 12px;
      border: 1px dashed rgba(255,255,255,0.35);
      background: rgba(17, 32, 60, 0.8);
      padding: 1rem;
      color: #d8e7f9;
      line-height: 1.5;
      text-align: center;
    }
    p.desc {
      color: #d8e7f9;
      max-width: 900px;
      text-align: center;
      line-height: 1.5;
    }
    .actions {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .actions a {
      color: #eff6ff;
      text-decoration: none;
      border: 1px solid rgba(255,255,255,0.28);
      border-radius: 8px;
      padding: 0.5rem 0.8rem;
      background: #1b3156;
      font-weight: 600;
      font-size: 0.92rem;
    }
    .actions a:hover { background: #284679; }
  </style>
</head>
<body>
  <header class="head">
    <h1>${headline}</h1>
    <p>${subline}</p>
  </header>
  <main>
    ${bodyHtml}
  </main>
  <footer class="foot">${footNote}</footer>
</body>
</html>`;
}

async function minifyViewerHtml(html) {
  return minify(html, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    minifyCSS: true,
    minifyJS: false,
    keepClosingSlash: true,
  });
}

async function processPhotoProject(source, slug) {
  const { dir, meta } = source;
  const outputDir = path.join(APPS_DIR, slug);
  const studentLabel = source.student || "Student";
  const title = source.title || "Photo";
  const caption = String(meta.caption || meta.description || "").trim();

  await fs.rm(outputDir, { recursive: true, force: true });
  const mediaDir = path.join(outputDir, "assets", "media");
  await ensureDir(mediaDir);

  const requestedImages = Array.isArray(meta.images) ? meta.images : [];
  const copied = [];
  for (const imageName of requestedImages) {
    const safeName = path.basename(String(imageName || ""));
    if (!safeName) continue;
    const srcPath = path.join(dir, safeName);
    if (!exists(srcPath)) continue;
    await fs.copyFile(srcPath, path.join(mediaDir, safeName));
    copied.push(safeName);
  }

  if (copied.length === 0) {
    throw new Error(`No valid image files found for photo project in ${dir}`);
  }

  const convertedWebps = await optimizeImagesToWebp(mediaDir);
  const galleryHtml = copied
    .map((name) => `<img src="./assets/media/${encodeURIComponent(name)}" alt="${escapeHtml(title)}" loading="lazy" />`)
    .join("\n    ");

  const html = viewerPageShell({
    title: `${escapeHtml(title)} · Photo`,
    headline: escapeHtml(title),
    subline: `${escapeHtml(studentLabel)} &middot; Photo`,
    bodyHtml: `${galleryHtml}${caption ? `\n    <p class="desc">${escapeHtml(caption)}</p>` : ""}`,
    footNote: "Photo submitted to the classroom showcase.",
  });

  await fs.writeFile(path.join(outputDir, "index.html"), await minifyViewerHtml(html), "utf8");

  const thumbnail = convertedWebps.length > 0
    ? `./apps/${toPosixPath(path.relative(APPS_DIR, convertedWebps[0]))}`
    : `./apps/${slug}/assets/media/${encodeURIComponent(copied[0])}`;

  return {
    name: title,
    slug,
    url: `./apps/${slug}/`,
    thumbnail,
    student: studentLabel,
    category: "Photo",
    program: "Student Upload",
    tech: ["Photo"],
    tags: ["student-upload", "photo"],
    difficulty: "Beginner",
    date_added: new Date().toISOString().slice(0, 10),
  };
}

function extractTinkercadEmbedUrl(url) {
  const match = String(url || "").match(/tinkercad\.com\/(?:things|circuits)\/([a-zA-Z0-9]+)/i);
  if (!match) return "";
  return `https://www.tinkercad.com/embed/${match[1]}?editbtn=1`;
}

async function processLinkProject(source, slug) {
  const { dir, meta } = source;
  const outputDir = path.join(APPS_DIR, slug);
  const studentLabel = source.student || "Student";
  const title = source.title || "Project Link";
  const description = String(meta.description || "").trim();
  const url = String(meta.url || "").trim();
  const provider = String(meta.provider || "").trim() || "Web";

  if (!/^https:\/\//i.test(url) && !/^http:\/\//i.test(url)) {
    throw new Error(`Invalid or missing url for link project in ${dir}`);
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await ensureDir(outputDir);

  let screenshotRel = "";
  if (meta.screenshot) {
    const safeName = path.basename(String(meta.screenshot));
    const srcPath = path.join(dir, safeName);
    if (exists(srcPath)) {
      const assetsDir = path.join(outputDir, "assets");
      await ensureDir(assetsDir);
      await fs.copyFile(srcPath, path.join(assetsDir, safeName));
      screenshotRel = `./assets/${encodeURIComponent(safeName)}`;
    }
  }

  const embedUrl = /tinkercad\.com/i.test(url) ? extractTinkercadEmbedUrl(url) : "";
  const embedHtml = embedUrl
    ? `<iframe src="${embedUrl}" title="${escapeHtml(title)}" allowfullscreen loading="lazy"></iframe>`
    : screenshotRel
    ? `<img src="${screenshotRel}" alt="${escapeHtml(title)} preview" />`
    : `<div class="empty">Preview not available for this link. Use the button below to open the project.</div>`;

  const html = viewerPageShell({
    title: `${escapeHtml(title)} · ${escapeHtml(provider)}`,
    headline: escapeHtml(title),
    subline: `${escapeHtml(studentLabel)} &middot; ${escapeHtml(provider)}`,
    bodyHtml: `${embedHtml}${description ? `\n    <p class="desc">${escapeHtml(description)}</p>` : ""}\n    <div class="actions"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open in ${escapeHtml(provider)}</a></div>`,
    footNote: "Linked project submitted to the classroom showcase.",
  });

  await fs.writeFile(path.join(outputDir, "index.html"), await minifyViewerHtml(html), "utf8");

  const thumbnail = screenshotRel ? `./apps/${slug}/${screenshotRel.replace(/^\.\//, "")}` : await findShowcaseThumb(slug, studentLabel);

  return {
    name: title,
    slug,
    url: `./apps/${slug}/`,
    thumbnail,
    student: studentLabel,
    category: /tinkercad/i.test(provider) ? "Circuits" : "Link",
    program: "Student Upload",
    tech: [provider],
    tags: ["student-upload", "link", provider.toLowerCase().replace(/[^a-z0-9]+/g, "-")].filter(Boolean),
    difficulty: "Beginner",
    date_added: new Date().toISOString().slice(0, 10),
  };
}

async function processFileProject(source, slug) {
  const { dir, meta } = source;
  const outputDir = path.join(APPS_DIR, slug);
  const studentLabel = source.student || "Student";
  const title = source.title || "Project File";
  const description = String(meta.description || "").trim();
  const filename = meta.filename ? path.basename(String(meta.filename)) : "";

  if (!filename || !exists(path.join(dir, filename))) {
    throw new Error(`Missing referenced file for file project in ${dir}`);
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  const mediaDir = path.join(outputDir, "assets", "media");
  await ensureDir(mediaDir);
  await fs.copyFile(path.join(dir, filename), path.join(mediaDir, filename));

  const ext = path.extname(filename).toLowerCase();
  const mediaRel = `./assets/media/${encodeURIComponent(filename)}`;

  let embedHtml;
  let thumbnail = null;
  if (VIDEO_EXTENSIONS.has(ext)) {
    embedHtml = `<video controls preload="metadata" src="${mediaRel}"></video>`;
  } else if (AUDIO_EXTENSIONS.has(ext)) {
    embedHtml = `<audio controls src="${mediaRel}"></audio>`;
  } else if (ext === ".pdf") {
    embedHtml = `<iframe src="${mediaRel}" title="${escapeHtml(title)}"></iframe>`;
  } else if (IMAGE_EXTENSIONS.has(ext) || ext === ".gif" || ext === ".webp") {
    embedHtml = `<img src="${mediaRel}" alt="${escapeHtml(title)}" />`;
    thumbnail = `./apps/${slug}/${mediaRel.replace(/^\.\//, "")}`;
  } else {
    embedHtml = `<div class="empty">No inline preview for .${escapeHtml(ext.slice(1) || "this")} files. Use the download button below.</div>`;
  }

  const html = viewerPageShell({
    title: `${escapeHtml(title)}`,
    headline: escapeHtml(title),
    subline: `${escapeHtml(studentLabel)} &middot; ${escapeHtml(ext.slice(1).toUpperCase() || "File")}`,
    bodyHtml: `${embedHtml}${description ? `\n    <p class="desc">${escapeHtml(description)}</p>` : ""}\n    <div class="actions"><a href="${mediaRel}" download>Download ${escapeHtml(filename)}</a></div>`,
    footNote: "File submitted to the classroom showcase.",
  });

  await fs.writeFile(path.join(outputDir, "index.html"), await minifyViewerHtml(html), "utf8");

  return {
    name: title,
    slug,
    url: `./apps/${slug}/`,
    thumbnail: thumbnail || (await findShowcaseThumb(slug, studentLabel)),
    student: studentLabel,
    category: "Other",
    program: "Student Upload",
    tech: [ext.replace(".", "").toUpperCase() || "File"],
    tags: ["student-upload", "file"],
    difficulty: "Beginner",
    date_added: new Date().toISOString().slice(0, 10),
  };
}

function buildModelViewerScript({ modelUrl, mtlUrl, modelFormat, title, student, grade }) {
  return `import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";

const MODEL_URL = ${JSON.stringify(modelUrl)};
const MTL_URL = ${JSON.stringify(mtlUrl || "")};
const MODEL_FORMAT = ${JSON.stringify(modelFormat)};
const TITLE = ${JSON.stringify(title)};
const STUDENT = ${JSON.stringify(student)};
const GRADE = ${JSON.stringify(grade || "")};

const viewport = document.getElementById("stl-viewport");
const statusEl = document.getElementById("stl-status");
const subtitleEl = document.getElementById("stl-subtitle");
const projectionBtn = document.getElementById("projection-btn");
const rotateBtn = document.getElementById("rotate-btn");
const resetBtn = document.getElementById("reset-btn");
const fullscreenBtn = document.getElementById("fullscreen-btn");

subtitleEl.textContent = GRADE ? STUDENT + " · " + GRADE : STUDENT;
statusEl.textContent = "Loading model...";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f5fb);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
viewport.appendChild(renderer.domElement);

const perspectiveCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10000, 10000);
let activeCamera = perspectiveCamera;

const controls = new OrbitControls(activeCamera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.9;
controls.target.set(0, 0, 0);

const hemi = new THREE.HemisphereLight(0xffffff, 0x90a2bf, 1.0);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 1.05);
key.position.set(3, 5, 4);
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.45);
fill.position.set(-4, 2, -3);
scene.add(fill);

const grid = new THREE.GridHelper(240, 24, 0x8fa0bc, 0xc8d2e2);
grid.position.y = -32;
scene.add(grid);

let modelRoot = null;
let modelRadius = 60;
let projectionMode = "Perspective";
let homePosition = new THREE.Vector3(120, 120, 120);
let homeTarget = new THREE.Vector3(0, 0, 0);

function updateProjectionLabel() {
  projectionBtn.textContent = "Projection: " + projectionMode;
}

function setStatus(message) {
  statusEl.textContent = message;
}

function resize() {
  const w = Math.max(1, viewport.clientWidth);
  const h = Math.max(1, viewport.clientHeight);
  renderer.setSize(w, h, false);
  perspectiveCamera.aspect = w / h;
  perspectiveCamera.updateProjectionMatrix();
  const halfHeight = Math.max(modelRadius * 1.45, 36);
  const halfWidth = halfHeight * (w / h);
  orthoCamera.left = -halfWidth;
  orthoCamera.right = halfWidth;
  orthoCamera.top = halfHeight;
  orthoCamera.bottom = -halfHeight;
  orthoCamera.updateProjectionMatrix();
}

function fitCameraFromObject(root) {
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);
  const fittedBox = new THREE.Box3().setFromObject(root);
  const size = fittedBox.getSize(new THREE.Vector3());
  const safeRadius = Math.max(size.length() * 0.5, 40);
  modelRadius = safeRadius;
  const fov = (perspectiveCamera.fov * Math.PI) / 180;
  const distance = safeRadius / Math.tan(fov / 2) * 1.05;
  perspectiveCamera.position.set(distance * 0.9, distance * 0.65, distance * 0.9);
  perspectiveCamera.lookAt(0, 0, 0);
  controls.target.set(0, 0, 0);
  controls.update();
  homePosition.copy(perspectiveCamera.position);
  homeTarget.copy(controls.target);
  resize();
}

function setModelRoot(root) {
  if (modelRoot) scene.remove(modelRoot);
  modelRoot = root;
  scene.add(modelRoot);
  fitCameraFromObject(modelRoot);
  setStatus("Loaded: " + TITLE);
}

function switchProjection() {
  const previous = activeCamera;
  if (projectionMode === "Perspective") {
    projectionMode = "Orthographic";
    activeCamera = orthoCamera;
  } else {
    projectionMode = "Perspective";
    activeCamera = perspectiveCamera;
  }
  activeCamera.position.copy(previous.position);
  controls.object = activeCamera;
  controls.update();
  updateProjectionLabel();
}

resetBtn.addEventListener("click", () => {
  activeCamera.position.copy(homePosition);
  controls.target.copy(homeTarget);
  controls.update();
});

rotateBtn.addEventListener("click", () => {
  controls.autoRotate = !controls.autoRotate;
  rotateBtn.textContent = controls.autoRotate ? "Auto-Rotate: On" : "Auto-Rotate: Off";
});

projectionBtn.addEventListener("click", switchProjection);

fullscreenBtn.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch (err) {
    setStatus("Fullscreen is unavailable in this browser.");
  }
});

window.addEventListener("resize", resize);
updateProjectionLabel();
resize();

function loadStl() {
  const loader = new STLLoader();
  loader.load(
    MODEL_URL,
    (geometry) => {
      geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({
        color: 0x96a9c8,
        roughness: 0.45,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      setModelRoot(mesh);
    },
    (event) => {
      if (!event.total) return;
      const pct = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      setStatus("Loading model... " + pct + "%");
    },
    (error) => {
      console.error(error);
      setStatus("Could not load STL model. Check file format and path.");
    }
  );
}

function applyObjFallbackMaterials(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    if (child.material) return;
    child.material = new THREE.MeshStandardMaterial({
      color: 0x96a9c8,
      roughness: 0.45,
      metalness: 0.1,
    });
  });
}

function loadObj() {
  const objLoader = new OBJLoader();
  const onObject = (object) => {
    applyObjFallbackMaterials(object);
    setModelRoot(object);
  };

  if (MTL_URL) {
    const mtlLoader = new MTLLoader();
    mtlLoader.load(
      MTL_URL,
      (materials) => {
        materials.preload();
        objLoader.setMaterials(materials);
        objLoader.load(
          MODEL_URL,
          onObject,
          undefined,
          (error) => {
            console.error(error);
            setStatus("Could not load OBJ model. Check file format and path.");
          }
        );
      },
      undefined,
      () => {
        objLoader.load(
          MODEL_URL,
          onObject,
          undefined,
          (error) => {
            console.error(error);
            setStatus("Could not load OBJ model. Check file format and path.");
          }
        );
      }
    );
    return;
  }

  objLoader.load(
    MODEL_URL,
    onObject,
    undefined,
    (error) => {
      console.error(error);
      setStatus("Could not load OBJ model. Check file format and path.");
    }
  );
}

if (MODEL_FORMAT === "obj") {
  loadObj();
} else {
  loadStl();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, activeCamera);
}

animate();
`;
}

function buildStlThumbSvg({ title, student }) {
  const safeTitle = String(title || "3D Model").replace(/[<&>"]/g, "");
  const safeStudent = String(student || "Student").replace(/[<&>"]/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-label="3D model thumbnail">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#101c34"/>
      <stop offset="100%" stop-color="#1f3f62"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <g transform="translate(280 180)">
    <polygon points="220,60 420,170 220,280 20,170" fill="#9eb7d8" opacity="0.92"/>
    <polygon points="420,170 420,410 220,520 220,280" fill="#7f95b3" opacity="0.95"/>
    <polygon points="20,170 20,410 220,520 220,280" fill="#c2d3ea" opacity="0.9"/>
  </g>
  <text x="780" y="350" fill="#e9f2ff" font-size="64" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${safeTitle}</text>
  <text x="780" y="430" fill="#cddbf0" font-size="40" font-family="Segoe UI, Arial, sans-serif">3D Model · ${safeStudent}</text>
</svg>
`;
}

async function findObjMaterialFile(sourceObjPath) {
  try {
    const objText = await fs.readFile(sourceObjPath, "utf8");
    const match = objText.match(/^\s*mtllib\s+([^\r\n]+)$/im);
    if (!match) return "";
    const raw = String(match[1] || "").trim();
    if (!raw) return "";
    return path.basename(raw);
  } catch {
    return "";
  }
}

async function copyModelResources(sourceFilePath, destinationModelsDir) {
  const sourceDir = path.dirname(sourceFilePath);
  const copied = [];
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!MODEL_RESOURCE_EXTENSIONS.has(ext)) continue;
    const src = path.join(sourceDir, entry.name);
    const dst = path.join(destinationModelsDir, entry.name);
    await fs.copyFile(src, dst);
    copied.push(entry.name);
  }

  return copied;
}

async function processModelProject(source, slug) {
  const outputDir = path.join(APPS_DIR, slug);
  const modelFileName = path.basename(source.filePath);
  const modelFormat = source.format === "obj" ? "obj" : "stl";
  const modelRelPath = `./assets/models/${encodeURIComponent(modelFileName)}`;
  const studentLabel = source.student || "Student";
  const gradeLabel = source.grade || "";
  const title = source.title || displayTitleFromFileName(modelFileName) || "3D Model";

  await fs.rm(outputDir, { recursive: true, force: true });
  const modelsOutDir = path.join(outputDir, "assets", "models");
  await ensureDir(modelsOutDir);
  const copiedFiles = await copyModelResources(source.filePath, modelsOutDir);

  if (!copiedFiles.includes(modelFileName)) {
    await fs.copyFile(source.filePath, path.join(modelsOutDir, modelFileName));
  }

  let mtlRelPath = "";
  if (modelFormat === "obj") {
    const declaredMtl = await findObjMaterialFile(source.filePath);
    if (declaredMtl && copiedFiles.includes(declaredMtl)) {
      mtlRelPath = `./assets/models/${encodeURIComponent(declaredMtl)}`;
    } else {
      const fallbackMtl = copiedFiles.find((name) => path.extname(name).toLowerCase() === ".mtl");
      if (fallbackMtl) {
        mtlRelPath = `./assets/models/${encodeURIComponent(fallbackMtl)}`;
      }
    }
  }

  const viewerEntryPath = path.join(outputDir, ".stl-viewer-entry.js");
  await fs.writeFile(
    viewerEntryPath,
    buildModelViewerScript({
      modelUrl: modelRelPath,
      mtlUrl: mtlRelPath,
      modelFormat,
      title,
      student: studentLabel,
      grade: gradeLabel,
    }),
    "utf8"
  );

  await esbuild.build({
    entryPoints: [viewerEntryPath],
    outfile: path.join(outputDir, "app.min.js"),
    bundle: true,
    minify: true,
    sourcemap: false,
    platform: "browser",
    target: ["es2018"],
  });

  await fs.rm(viewerEntryPath, { force: true });

  const style = `*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#0f1726;color:#f3f6fb;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;display:grid;grid-template-rows:auto 1fr auto;overflow-x:hidden}body>*{min-width:0}.top,.foot{display:flex;justify-content:space-between;gap:.8rem;align-items:center;padding:.7rem 1rem;background:#132039;border-bottom:1px solid rgba(255,255,255,.15)}.foot{border-top:1px solid rgba(255,255,255,.15);border-bottom:0;font-size:.9rem;color:#d4deef}.title{font-size:1.05rem;font-weight:700}.sub{font-size:.9rem;color:#c5d4ec}.actions{display:flex;gap:.45rem;flex-wrap:wrap}.actions button{border:1px solid rgba(255,255,255,.25);background:#1b2e4f;color:#f4f8ff;border-radius:8px;padding:.5rem .7rem;font:600 .84rem/1.2 "Segoe UI",Arial,sans-serif;cursor:pointer}.actions button:hover{background:#24406f}main{padding:.7rem}.viewport{width:min(100%,1200px);height:min(78vh,760px);margin:0 auto;border:1px solid rgba(255,255,255,.2);border-radius:12px;overflow:hidden;background:#edf2fa}.status{padding:.55rem .9rem;color:#dbe5f6;font-size:.9rem;text-align:center}@media (max-width:900px){.top{flex-direction:column;align-items:flex-start}.actions{width:100%}}`;
  await fs.writeFile(path.join(outputDir, "style.min.css"), style, "utf8");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · 3D Viewer</title>
  <link rel="stylesheet" href="style.min.css" />
</head>
<body>
  <header class="top">
    <div>
      <div class="title">${title}</div>
      <div id="stl-subtitle" class="sub"></div>
    </div>
    <div class="actions" aria-label="Viewer controls">
      <button id="reset-btn" type="button">Reset View</button>
      <button id="rotate-btn" type="button">Auto-Rotate: Off</button>
      <button id="projection-btn" type="button">Projection: Perspective</button>
      <button id="fullscreen-btn" type="button">Fullscreen</button>
    </div>
  </header>
  <main>
    <div id="stl-viewport" class="viewport" aria-label="Interactive 3D model viewer"></div>
    <p id="stl-status" class="status">Loading model...</p>
  </main>
  <footer class="foot">
    Drag to rotate. Scroll to zoom. Right-click (or two-finger drag) to pan.
  </footer>
  <script src="app.min.js"></script>
</body>
</html>`;

  const minifiedHtml = await minify(html, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    minifyCSS: true,
    minifyJS: false,
    keepClosingSlash: true,
  });

  await fs.writeFile(path.join(outputDir, "index.html"), minifiedHtml, "utf8");

  const thumbSvg = buildStlThumbSvg({ title, student: studentLabel });
  await ensureDir(path.join(outputDir, "assets"));
  await fs.writeFile(path.join(outputDir, "assets", "thumb.svg"), thumbSvg, "utf8");

  // Prefer a real screenshot from showcase thumbs folder over the auto-generated SVG
  const showcaseThumb = await findShowcaseThumb(slug, studentLabel);
  return {
    name: `${title} (3D Model)`,
    slug,
    url: `./apps/${slug}/`,
    thumbnail: showcaseThumb || `./apps/${slug}/assets/thumb.svg`,
    student: studentLabel,
    category: "3D",
    program: gradeLabel || "3D Lab",
    tech: [modelFormat.toUpperCase(), "Three.js"],
    tags: ["student-upload", "3d-model", modelFormat],
    difficulty: "Beginner",
    date_added: new Date().toISOString().slice(0, 10),
  };
}

// build-showcase.js fully regenerates every manifest entry from student-projects/ on each run,
// which would otherwise silently reset hand-curated display names/categories/tags/thumbnails
// (set via manual manifest edits, not through the portal) back to generic auto-derived values.
// data/manifest-overrides.json holds those curated fields per slug so they survive rebuilds.
function applyManifestOverrides(manifest) {
  if (!exists(MANIFEST_OVERRIDES_PATH)) return;
  let overrides;
  try {
    overrides = JSON.parse(fssync.readFileSync(MANIFEST_OVERRIDES_PATH, "utf8"));
  } catch (error) {
    logStep(`Skipping manifest overrides because ${MANIFEST_OVERRIDES_PATH} could not be read: ${error.message}`);
    return;
  }
  for (const item of manifest) {
    if (item && overrides[item.slug]) Object.assign(item, overrides[item.slug]);
  }
}

function ensureUniqueSlugs(projectSources) {
  const used = new Set();
  const pairs = [];

  for (const source of projectSources) {
    const base = toSlug(source.slugBase || (source.projectDir ? path.basename(source.projectDir) : "student-project"));
    let slug = base;
    let count = 2;

    while (used.has(slug)) {
      slug = `${base}-${count}`;
      count += 1;
    }

    used.add(slug);
    pairs.push({ source, slug });
  }

  return pairs;
}

async function readManifestSlugs() {
  if (!exists(MANIFEST_PATH)) return [];
  try {
    const raw = await fs.readFile(MANIFEST_PATH, "utf8");
    const manifest = JSON.parse(raw);
    if (!Array.isArray(manifest)) return [];
    return manifest.map((item) => item && item.slug).filter(Boolean);
  } catch (error) {
    logStep(`Skipping stale app cleanup because ${MANIFEST_PATH} could not be read: ${error.message}`);
    return [];
  }
}

async function readExistingManifest() {
  if (!exists(MANIFEST_PATH)) return [];
  try {
    const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
    return Array.isArray(manifest) ? manifest : [];
  } catch (error) {
    logStep(`Could not preserve the existing manifest during a targeted build: ${error.message}`);
    return [];
  }
}

async function removeStaleAppDirs(validSlugs) {
  const keep = new Set(validSlugs);
  const previousGeneratedSlugs = await readManifestSlugs();

  for (const slug of previousGeneratedSlugs) {
    if (keep.has(slug)) continue;
    const appDir = path.join(APPS_DIR, slug);
    if (!exists(appDir)) continue;
    const stat = await fs.stat(appDir);
    if (!stat.isDirectory()) continue;
    await fs.rm(appDir, { recursive: true, force: true });
    logStep(`Removed stale generated app directory: /apps/${slug}/`);
  }
}

async function main() {
  const strictMode = process.argv.includes("--strict");
  const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
  const onlySlug = onlyArg ? toSlug(onlyArg.slice("--only=".length)) : null;
  logStep("Starting showcase build.");

  if (!exists(STUDENT_PROJECTS_DIR)) {
    fail(`Missing directory: ${STUDENT_PROJECTS_DIR}. Create it and add student folders with index.html.`);
  }

  await ensureDir(APPS_DIR);

  const webSources = pruneNestedWebSources(findWebProjectSources(STUDENT_PROJECTS_DIR));
  const scratchSources = findScratchSources(STUDENT_PROJECTS_DIR);
  const markerSources = findMarkerSources(
    STUDENT_PROJECTS_DIR,
    webSources.map((item) => item.projectDir)
  );
  const ignoreForModelsAndPivot = webSources
    .map((item) => item.projectDir)
    .concat(markerSources.map((item) => item.dir));
  const modelSources = findModelSources(STUDENT_PROJECTS_DIR, ignoreForModelsAndPivot);
  const pivotSources = findPivotSources(STUDENT_PROJECTS_DIR, ignoreForModelsAndPivot);
  const projectSources = webSources.concat(scratchSources, modelSources, pivotSources, markerSources);

  if (projectSources.length === 0) {
    await fs.writeFile(MANIFEST_PATH, JSON.stringify([], null, 2) + "\n", "utf8");
    logStep("No student projects were found. Wrote empty /apps/manifest.json.");
    return;
  }

  const uniqueProjects = ensureUniqueSlugs(projectSources);
  const selectedProjects = onlySlug
    ? uniqueProjects.filter(({ slug }) => slug === onlySlug)
    : uniqueProjects;
  if (onlySlug && selectedProjects.length === 0) {
    fail(`No student project resolves to slug "${onlySlug}".`);
  }
  logStep(`Found ${uniqueProjects.length} project(s); building ${onlySlug || "all projects"}.`);

  const manifest = onlySlug ? await readExistingManifest() : [];
  const failures = [];

  for (const { source, slug } of selectedProjects) {
    const sourcePath = source.projectDir || source.filePath || "unknown";
    logStep(`Building ${slug} from ${sourcePath}`);

    try {
      let entry;
      if (source.kind === "scratch") {
        entry = await processScratchProject(source, slug);
      } else if (source.kind === "pivot") {
        entry = await processPivotProject(source, slug);
      } else if (source.kind === "model") {
        entry = await processModelProject(source, slug);
      } else if (source.kind === "marker-photo") {
        entry = await processPhotoProject(source, slug);
      } else if (source.kind === "marker-link") {
        entry = await processLinkProject(source, slug);
      } else if (source.kind === "marker-file") {
        entry = await processFileProject(source, slug);
      } else {
        entry = await processProject(source, slug);
      }
      const existingIndex = manifest.findIndex((item) => item && item.slug === slug);
      if (existingIndex >= 0) manifest[existingIndex] = entry;
      else manifest.push(entry);
      logStep(`Built /apps/${slug}/`);
    } catch (error) {
      await fs.rm(path.join(APPS_DIR, slug), { recursive: true, force: true });
      failures.push({ slug, projectDir: sourcePath, message: error.message });
      logStep(`Skipped /apps/${slug}/ due to error: ${error.message}`);
    }
  }

  if (!onlySlug) await removeStaleAppDirs(manifest.map((item) => item.slug));
  applyManifestOverrides(manifest);
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  logStep(`Wrote manifest with ${manifest.length} project(s): ${MANIFEST_PATH}`);

  if (failures.length > 0) {
    logStep(`Build finished with ${failures.length} skipped project(s).`);
    for (const item of failures) {
      logStep(`- ${item.slug}: ${item.message}`);
    }
    if (strictMode) {
      fail("Strict mode enabled and at least one project failed. Re-run without --strict to skip broken projects.");
    }
  }

  logStep("Build complete.");
}

main().catch((error) => {
  fail(error.message || String(error));
});
