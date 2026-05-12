#!/usr/bin/env node

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
  ".git",
  ".claude",
  "node_modules",
  "test-results",
  "tmp",
]);

const TEXT_EXTENSIONS = new Set([
  ".css",
  ".csv",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".mjs",
  ".md",
  ".mtl",
  ".ps1",
  ".py",
  ".txt",
  ".xml",
]);

const REFERENCE_KEYS = new Set([
  "file",
  "hero",
  "href",
  "poster",
  "src",
  "thumbnail",
  "url",
]);

const MAGIC_CHECKS = [
  { extensions: [".png"], label: "PNG", test: (b) => b.length >= 8 && b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG" },
  { extensions: [".jpg", ".jpeg"], label: "JPEG", test: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { extensions: [".gif"], label: "GIF", test: (b) => b.toString("ascii", 0, 4) === "GIF8" },
  { extensions: [".webp"], label: "WEBP", test: (b) => b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
  { extensions: [".pdf"], label: "PDF", test: (b) => b.toString("ascii", 0, 4) === "%PDF" },
  { extensions: [".zip", ".sb3"], label: "ZIP", test: (b) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b },
  { extensions: [".glb"], label: "GLB", test: (b) => b.toString("ascii", 0, 4) === "glTF" },
  { extensions: [".wav"], label: "WAV", test: (b) => b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WAVE" },
];

const magicByExtension = new Map();
for (const check of MAGIC_CHECKS) {
  for (const extension of check.extensions) magicByExtension.set(extension, check);
}

const errors = [];
const warnings = [];
let fileCount = 0;
let referenceCount = 0;

function rel(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function isExternalReference(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);
}

function stripUrlDecorations(value) {
  const trimmed = value.trim();
  const hashIndex = trimmed.indexOf("#");
  const queryIndex = trimmed.indexOf("?");
  const cutAt = [hashIndex, queryIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0];
  return cutAt === undefined ? trimmed : trimmed.slice(0, cutAt);
}

function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function shouldCheckReference(value) {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#")) return false;
  if (isExternalReference(trimmed)) return false;
  if (/^(?:data|mailto|tel|javascript):/i.test(trimmed)) return false;
  if (trimmed.includes("{{") || trimmed.includes("${")) return false;
  return true;
}

async function pathHasExactCase(absPath) {
  const relative = path.relative(ROOT, absPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return true;
  let current = ROOT;
  for (const part of relative.split(path.sep)) {
    if (!part) continue;
    const entries = await fsp.readdir(current);
    if (!entries.includes(part)) return false;
    current = path.join(current, part);
  }
  return true;
}

async function checkLocalReference(sourceFile, value, baseDirs = [path.dirname(sourceFile)]) {
  if (!shouldCheckReference(value)) return;

  const stripped = stripUrlDecorations(value);
  if (!stripped || stripped.startsWith("#") || stripped.toLowerCase().startsWith("%23")) return;

  let target = decodePath(stripped);
  let candidates;
  if (target.startsWith("/")) {
    candidates = [path.join(ROOT, target.slice(1))];
    let current = path.dirname(sourceFile);
    while (current && current.startsWith(ROOT) && current !== ROOT) {
      candidates.push(path.join(current, target.slice(1)));
      current = path.dirname(current);
    }
  } else {
    candidates = baseDirs.map((baseDir) => path.resolve(baseDir, target));
  }

  referenceCount += 1;

  const displayTarget = `${rel(sourceFile)} -> ${value}`;
  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  if (!existing) {
    errors.push(`Missing local reference: ${displayTarget}`);
    return;
  }

  const exactCase = await pathHasExactCase(existing);
  if (!exactCase) {
    errors.push(`Case mismatch in local reference: ${displayTarget}`);
  }
}

async function walk(dirPath, files = []) {
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
  const seenNames = new Map();

  for (const entry of entries) {
    const lower = entry.name.toLowerCase();
    if (seenNames.has(lower) && seenNames.get(lower) !== entry.name) {
      errors.push(`Case-colliding names in ${rel(dirPath)}: ${seenNames.get(lower)} and ${entry.name}`);
    }
    seenNames.set(lower, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(path.join(dirPath, entry.name), files);
      continue;
    }

    if (entry.isFile()) files.push(path.join(dirPath, entry.name));
  }

  return files;
}

function collectJsonReferences(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonReferences(item, out);
    return out;
  }
  if (!value || typeof value !== "object") return out;

  for (const [key, nested] of Object.entries(value)) {
    if (REFERENCE_KEYS.has(key) && typeof nested === "string") out.push(nested);
    collectJsonReferences(nested, out);
  }
  return out;
}

function stripJsonComments(text) {
  return text
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

async function checkJson(filePath, text) {
  try {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      if (!rel(filePath).includes("/.vscode/")) throw error;
      parsed = JSON.parse(stripJsonComments(text));
    }
    const refs = collectJsonReferences(parsed);
    for (const ref of refs) {
      await checkLocalReference(filePath, ref, [ROOT, path.dirname(filePath)]);
    }
  } catch (error) {
    errors.push(`Invalid JSON in ${rel(filePath)}: ${error.message}`);
  }
}

async function checkHtml(filePath, text) {
  const attrPattern = /\b(?:src|href|poster)\s*=\s*(["'])([^"']+)\1/gi;
  for (const match of text.matchAll(attrPattern)) {
    await checkLocalReference(filePath, match[2]);
  }

  const srcsetPattern = /\bsrcset\s*=\s*(["'])([^"']+)\1/gi;
  for (const match of text.matchAll(srcsetPattern)) {
    const candidates = match[2].split(",").map((part) => part.trim().split(/\s+/)[0]).filter(Boolean);
    for (const candidate of candidates) await checkLocalReference(filePath, candidate);
  }

  const stylePattern = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  for (const match of text.matchAll(stylePattern)) {
    await checkCssUrls(filePath, match[1]);
  }

  const styleAttrPattern = /\bstyle\s*=\s*(["'])([^"']+)\1/gi;
  for (const match of text.matchAll(styleAttrPattern)) {
    await checkCssUrls(filePath, match[2]);
  }
}

async function checkCssUrls(filePath, text) {
  const urlPattern = /url\(\s*(["']?)([^"')]+)\1\s*\)/g;
  for (const match of text.matchAll(urlPattern)) {
    await checkLocalReference(filePath, match[2]);
  }
}

async function checkJsReferences(filePath, text) {
  const patterns = [
    /\bfetch\(\s*(["'])([^"']+)\1/gi,
    /\bimport\(\s*(["'])([^"']+)\1\s*\)/gi,
    /\bfrom\s+(["'])([^"']+)\1/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[2];
      if (value.startsWith(".") || value.startsWith("/")) {
        await checkLocalReference(filePath, value);
      }
    }
  }
}

async function checkTextFile(filePath, extension) {
  const text = await fsp.readFile(filePath, "utf8");
  if (text.includes("\u0000")) {
    errors.push(`Unexpected NUL byte in text file: ${rel(filePath)}`);
  }

  if (extension === ".json") await checkJson(filePath, text);
  if (extension === ".html") await checkHtml(filePath, text);
  if (extension === ".css") await checkCssUrls(filePath, text);
  if (extension === ".js" || extension === ".mjs" || extension === ".jsx") await checkJsReferences(filePath, text);
}

async function checkMagic(filePath, extension) {
  const check = magicByExtension.get(extension);
  if (!check) return;
  const handle = await fsp.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (!check.test(buffer.subarray(0, bytesRead))) {
      errors.push(`Invalid ${check.label} signature: ${rel(filePath)}`);
    }
  } finally {
    await handle.close();
  }
}

async function main() {
  const files = await walk(ROOT);
  fileCount = files.length;

  for (const filePath of files) {
    const extension = path.extname(filePath).toLowerCase();
    if (TEXT_EXTENSIONS.has(extension)) {
      await checkTextFile(filePath, extension);
    }
    await checkMagic(filePath, extension);
  }

  console.log(`[integrity] Checked ${fileCount} project files.`);
  console.log(`[integrity] Verified ${referenceCount} local references and asset signatures.`);

  for (const warning of warnings) console.warn(`[integrity] WARNING: ${warning}`);
  if (errors.length > 0) {
    for (const error of errors) console.error(`[integrity] ERROR: ${error}`);
    process.exit(1);
  }

  console.log("[integrity] Integrity check passed.");
}

main().catch((error) => {
  console.error(`[integrity] ERROR: ${error.stack || error.message || String(error)}`);
  process.exit(1);
});
