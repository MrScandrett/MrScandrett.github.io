#!/usr/bin/env node

const fs = require("fs/promises");
const fssync = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const esbuild = require("esbuild");
const { minify } = require("html-minifier-terser");

const ROOT = process.cwd();
const STUDENT_PROJECTS_DIR = path.join(ROOT, "student-projects");
const APPS_DIR = path.join(ROOT, "apps");
const MANIFEST_PATH = path.join(APPS_DIR, "manifest.json");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);
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
  const first = rel.split(path.sep)[0];
  if (!first) return "Student";
  if (/[A-Z]/.test(first)) return first;
  return first
    .split(/[\s_-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function rewriteCssPaths(css) {
  return css.replace(/url\(\s*(["']?)(\/[^"')]+)\1\s*\)/gi, (match, quote, value) => {
    const next = normalizeRelativeUrl(value);
    return `url(${quote}${next}${quote})`;
  });
}

function listSubdirs(dirPath) {
  const out = [];
  const stack = [dirPath];

  while (stack.length) {
    const current = stack.pop();
    const entries = fssync.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === ".git" || entry.name === "node_modules") continue;
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

function findScratchSources(rootDir) {
  const scratchProjects = [];
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fssync.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "node_modules") continue;
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
  const sourceStylePath = path.join(projectDir, "style.css");
  const sourceScriptPath = path.join(projectDir, "script.js");
  const hasStyle = exists(sourceStylePath);
  const hasScript = exists(sourceScriptPath);

  await fs.rm(outputDir, { recursive: true, force: true });
  await ensureDir(outputDir);

  // Copy everything except root index/style/script; those are rebuilt below.
  await copyDirectoryRecursive(projectDir, outputDir, {
    skipFiles: new Set([entryHtml, "style.css", "script.js"])
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
  }

  if (hasStyle) {
    await minifyCssFile(sourceStylePath, path.join(outputDir, "style.min.css"));
  }

  const sourceHtml = await fs.readFile(sourceIndexPath, "utf8");
  const projectTitle = getHtmlTitle(sourceHtml) || `${toTitleFromSlug(slug)} Project`;

  const rewrittenHtml = rewriteHtmlPaths(sourceHtml, { hasStyle, hasScript });
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

  return {
    name: projectTitle,
    slug,
    url: `./apps/${slug}/`,
    thumbnail: thumbnailRel ? `./apps/${thumbnailRel}` : null,
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
    }
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
    thumbnail: null,
    student: source.student,
    category: "Scratch",
    tech: ["Scratch"],
    tags: ["student-upload", "sb3", "scratch"],
    date_added: new Date().toISOString().slice(0, 10),
  };
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

async function main() {
  const strictMode = process.argv.includes("--strict");
  logStep("Starting showcase build.");

  if (!exists(STUDENT_PROJECTS_DIR)) {
    fail(`Missing directory: ${STUDENT_PROJECTS_DIR}. Create it and add student folders with index.html.`);
  }

  await ensureDir(APPS_DIR);

  const webSources = findWebProjectSources(STUDENT_PROJECTS_DIR);
  const scratchSources = findScratchSources(STUDENT_PROJECTS_DIR);
  const projectSources = webSources.concat(scratchSources);

  if (projectSources.length === 0) {
    await fs.writeFile(MANIFEST_PATH, JSON.stringify([], null, 2) + "\n", "utf8");
    logStep("No student projects were found. Wrote empty /apps/manifest.json.");
    return;
  }

  const uniqueProjects = ensureUniqueSlugs(projectSources);
  logStep(`Found ${uniqueProjects.length} project(s).`);

  const manifest = [];
  const failures = [];

  for (const { source, slug } of uniqueProjects) {
    const sourcePath = source.projectDir || source.filePath || "unknown";
    logStep(`Building ${slug} from ${sourcePath}`);

    try {
      let entry;
      if (source.kind === "scratch") {
        entry = await processScratchProject(source, slug);
      } else {
        entry = await processProject(source, slug);
      }
      manifest.push(entry);
      logStep(`Built /apps/${slug}/`);
    } catch (error) {
      await fs.rm(path.join(APPS_DIR, slug), { recursive: true, force: true });
      failures.push({ slug, projectDir: sourcePath, message: error.message });
      logStep(`Skipped /apps/${slug}/ due to error: ${error.message}`);
    }
  }

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
