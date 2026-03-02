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
const MODEL_EXTENSIONS = new Set([".stl", ".obj"]);
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

function findModelSources(rootDir, ignoreDirectories = []) {
  const modelProjects = [];
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fssync.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "node_modules") continue;
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

  const style = `*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#0f1726;color:#f3f6fb;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;display:grid;grid-template-rows:auto 1fr auto}.top,.foot{display:flex;justify-content:space-between;gap:.8rem;align-items:center;padding:.7rem 1rem;background:#132039;border-bottom:1px solid rgba(255,255,255,.15)}.foot{border-top:1px solid rgba(255,255,255,.15);border-bottom:0;font-size:.9rem;color:#d4deef}.title{font-size:1.05rem;font-weight:700}.sub{font-size:.9rem;color:#c5d4ec}.actions{display:flex;gap:.45rem;flex-wrap:wrap}.actions button{border:1px solid rgba(255,255,255,.25);background:#1b2e4f;color:#f4f8ff;border-radius:8px;padding:.5rem .7rem;font:600 .84rem/1.2 "Segoe UI",Arial,sans-serif;cursor:pointer}.actions button:hover{background:#24406f}main{padding:.7rem}.viewport{width:min(98vw,1200px);height:min(78vh,760px);margin:0 auto;border:1px solid rgba(255,255,255,.2);border-radius:12px;overflow:hidden;background:#edf2fa}.status{padding:.55rem .9rem;color:#dbe5f6;font-size:.9rem;text-align:center}@media (max-width:900px){.top{flex-direction:column;align-items:flex-start}.actions{width:100%}}`;
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

  return {
    name: `${title} (3D Model)`,
    slug,
    url: `./apps/${slug}/`,
    thumbnail: `./apps/${slug}/assets/thumb.svg`,
    student: studentLabel,
    category: "3D",
    program: gradeLabel || "3D Lab",
    tech: [modelFormat.toUpperCase(), "Three.js"],
    tags: ["student-upload", "3d-model", modelFormat],
    difficulty: "Beginner",
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

async function removeStaleAppDirs(validSlugs) {
  const entries = await fs.readdir(APPS_DIR, { withFileTypes: true });
  const keep = new Set(validSlugs);

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (keep.has(entry.name)) continue;
    await fs.rm(path.join(APPS_DIR, entry.name), { recursive: true, force: true });
    logStep(`Removed stale app directory: /apps/${entry.name}/`);
  }
}

async function main() {
  const strictMode = process.argv.includes("--strict");
  logStep("Starting showcase build.");

  if (!exists(STUDENT_PROJECTS_DIR)) {
    fail(`Missing directory: ${STUDENT_PROJECTS_DIR}. Create it and add student folders with index.html.`);
  }

  await ensureDir(APPS_DIR);

  const webSources = pruneNestedWebSources(findWebProjectSources(STUDENT_PROJECTS_DIR));
  const scratchSources = findScratchSources(STUDENT_PROJECTS_DIR);
  const stlSources = findStlSources(
    STUDENT_PROJECTS_DIR,
    webSources.map((item) => item.projectDir)
  );
  const projectSources = webSources.concat(scratchSources, stlSources);

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
      } else if (source.kind === "stl") {
        entry = await processStlProject(source, slug);
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

  await removeStaleAppDirs(manifest.map((item) => item.slug));
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
