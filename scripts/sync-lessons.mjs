#!/usr/bin/env node
/**
 * sync-lessons.mjs
 *
 * Single source of truth: data/lessons.json
 *
 * Modes:
 *   node scripts/sync-lessons.mjs          -- validate only, report drift
 *   node scripts/sync-lessons.mjs --fix    -- patch search-index.json lesson entries
 *                                             from data/lessons.json and report
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MODULE_SECTION_IDS } from "../lib/compendium-sections.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LESSONS_PATH = path.join(ROOT, "data", "lessons.json");
const INDEX_PATH = path.join(ROOT, "assets", "data", "search-index.json");
const COMPENDIUM_PLAN_PATH = path.join(ROOT, "data", "compendium-plan.json");
const FIX = process.argv.includes("--fix");

const errors = [];
const warnings = [];
const infos = [];

function err(msg)  { errors.push(msg);   console.error(`[sync-lessons] ERROR:   ${msg}`); }
function warn(msg) { warnings.push(msg); console.warn( `[sync-lessons] WARNING: ${msg}`); }
function info(msg) { infos.push(msg);    console.log(  `[sync-lessons] INFO:    ${msg}`); }

// ── Load source of truth ──────────────────────────────────────────────────────

if (!fs.existsSync(LESSONS_PATH)) {
  err(`data/lessons.json not found — run build to regenerate`);
  process.exit(1);
}

let lessonsData;
try {
  lessonsData = JSON.parse(fs.readFileSync(LESSONS_PATH, "utf8"));
} catch (e) {
  err(`data/lessons.json is invalid JSON: ${e.message}`);
  process.exit(1);
}

if (!Array.isArray(lessonsData.lessons)) {
  err(`data/lessons.json must have a top-level "lessons" array`);
  process.exit(1);
}

const lessons = lessonsData.lessons;
info(`Loaded ${lessons.length} lesson records from data/lessons.json`);

// ── Validate: required fields ─────────────────────────────────────────────────

const requiredFields = ["id", "title", "url", "status", "primaryModule", "summary"];
for (const l of lessons) {
  for (const f of requiredFields) {
    if (!l[f]) warn(`lessons/${l.id || "?"}: missing required field "${f}"`);
  }
}

// ── Validate: files exist on disk ─────────────────────────────────────────────

let missingFiles = 0;
for (const l of lessons) {
  const filePath = path.join(ROOT, l.url);
  if (!fs.existsSync(filePath)) {
    err(`File missing for "${l.id}": ${l.url}`);
    missingFiles++;
  }
}
if (missingFiles === 0) info("All lesson files exist on disk ✓");

// ── Validate: no duplicate IDs ────────────────────────────────────────────────

const idCounts = {};
for (const l of lessons) {
  idCounts[l.id] = (idCounts[l.id] || 0) + 1;
}
for (const [id, count] of Object.entries(idCounts)) {
  if (count > 1) err(`Duplicate lesson id: "${id}" (${count} entries)`);
}

// ── Validate: lessons on disk not in lessons.json ────────────────────────────

const knownIds = new Set(lessons.map((l) => l.id));
const lessonsDir = path.join(ROOT, "lessons");

function walkLessons(dir, prefix = "") {
  const missing = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const sub = walkLessons(path.join(dir, entry.name), `${prefix}${entry.name}/`);
      missing.push(...sub);
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;
    const id = (prefix + entry.name.replace(".html", "")).replace(/\/index$/, "");
    if (!knownIds.has(id)) missing.push(id);
  }
  return missing;
}

const untracked = walkLessons(lessonsDir);
if (untracked.length === 0) {
  info("No untracked lesson files ✓");
} else {
  for (const id of untracked) {
    warn(`Lesson file exists but not in data/lessons.json: "${id}"`);
  }
}

// ── Cross-check against search-index.json ────────────────────────────────────

let indexData;
try {
  indexData = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
} catch (e) {
  err(`search-index.json is invalid JSON: ${e.message}`);
  process.exit(1);
}

const indexLessonUrls = new Set(
  indexData.filter((x) => x.url && x.url.startsWith("lessons/")).map((x) => x.url)
);

let notInIndex = 0;
for (const l of lessons) {
  if (l.status === "live" && !indexLessonUrls.has(l.url)) {
    warn(`Live lesson not in search-index.json: "${l.id}" (${l.url})`);
    notInIndex++;
  }
}
if (notInIndex === 0) info("All live lessons present in search-index.json ✓");

// Banner count drift check ────────────────────────────────────────────────────
//
// steam-lessons.html hand-writes each module banner's "N live" count; the only
// authority for which lessons actually belong to a module is data/compendium-plan.json
// (data/lessons.json's primaryModule is a coarser, independent categorization used
// for search-index.json and doesn't correspond 1:1 with the compendium's modules).
// Match banners by their stable `id="module-xxx"` attribute, not title text, so a
// future title reword doesn't silently stop this check the way it did before.

const steamPath = path.join(ROOT, "steam-lessons.html");
if (fs.existsSync(steamPath) && fs.existsSync(COMPENDIUM_PLAN_PATH)) {
  const html = fs.readFileSync(steamPath, "utf8");
  const plan = JSON.parse(fs.readFileSync(COMPENDIUM_PLAN_PATH, "utf8"));
  const statusByUrl = new Map(lessons.map((l) => [l.url, l.status]));

  const sectionIdToModuleId = Object.fromEntries(
    Object.entries(MODULE_SECTION_IDS).map(([moduleId, sectionId]) => [sectionId, moduleId])
  );

  const liveCountByModuleId = {};
  for (const volume of plan.volumes) {
    for (const module of volume.modules) {
      const urls = module.units.flatMap((unit) => unit.lessons);
      liveCountByModuleId[module.id] = urls.filter((url) => statusByUrl.get(url) === "live").length;
    }
  }

  const bannerPattern = /id="(module-[\w-]+)"[\s\S]*?module-banner-title[^>]*>([^<&]+(?:&amp;[^<]*)?)<\/h2>[\s\S]*?module-banner-count[^>]*>(\d+)\s*live/g;
  for (const match of html.matchAll(bannerPattern)) {
    const sectionId = match[1];
    const bannerTitle = match[2].replace(/&amp;/g, "&").trim();
    const bannerCount = parseInt(match[3], 10);
    const moduleId = sectionIdToModuleId[sectionId];
    if (!moduleId) {
      warn(`Banner section id not in MODULE_SECTION_IDS: "${sectionId}" ("${bannerTitle}")`);
      continue;
    }
    const liveCount = liveCountByModuleId[moduleId] ?? 0;
    if (liveCount !== bannerCount) {
      warn(
        `Banner count mismatch for "${bannerTitle}" (${sectionId}): banner says ${bannerCount}, compendium plan has ${liveCount} live`
      );
    }
  }
}

// ── --fix mode: patch search-index.json ──────────────────────────────────────

if (FIX) {
  info("--fix mode: patching search-index.json lesson entries from data/lessons.json …");

  // Build a map of url → lessons.json entry
  const lessonByUrl = new Map(lessons.map((l) => [l.url, l]));

  // Preserve non-lesson entries, replace/add lesson entries
  const nonLessonEntries = indexData.filter(
    (x) => !x.url || !x.url.startsWith("lessons/")
  );

  const ICON_BY_MODULE = {
    "Mathematics":                        "📐",
    "Physics":                            "⚡",
    "Applied Physics & Materials Science":"⚡",
    "Chemistry":                          "🧪",
    "Life Sciences":                      "🌿",
    "Earth Science":                      "🌍",
    "Cosmology":                          "🔭",
    "Engineering":                        "⚙️",
    "Technical Elements":                 "🎚️",
    "Computer Science":                   "💻",
    "Visual Perception & Design":         "🎨",
    "Language & Literature":              "📚",
    "Complex Systems & Humanities":       "🌐",
    "Bible Studies":                      "✦",
  };

  // Build new lesson entries — one per unique url for primary module,
  // plus one extra entry per alsoAppearsIn module (cross-listing)
  const lessonEntries = [];
  for (const l of lessons) {
    if (l.status !== "live") continue;

    const base = {
      title: l.title,
      description: l.summary,
      url: l.url,
      category: l.primaryModule,
      icon: ICON_BY_MODULE[l.primaryModule] || "📖",
      keywords: l.keywords || [],
    };
    lessonEntries.push(base);

    for (const also of l.alsoAppearsIn || []) {
      lessonEntries.push({
        ...base,
        category: also,
        icon: ICON_BY_MODULE[also] || "📖",
        description: l.summary,
      });
    }
  }

  const newIndex = [...nonLessonEntries, ...lessonEntries];
  fs.writeFileSync(INDEX_PATH, JSON.stringify(newIndex, null, 2), "utf8");
  info(`search-index.json updated: ${newIndex.length} total entries (${lessonEntries.length} lessons)`);
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log("");
console.log(`[sync-lessons] ── Summary ──────────────────────────────`);
console.log(`[sync-lessons]   Lessons tracked: ${lessons.length}`);
console.log(`[sync-lessons]   Errors:          ${errors.length}`);
console.log(`[sync-lessons]   Warnings:        ${warnings.length}`);
console.log(`[sync-lessons]   Mode:            ${FIX ? "--fix (search-index patched)" : "validate only"}`);
console.log("");

if (errors.length > 0) process.exit(1);
