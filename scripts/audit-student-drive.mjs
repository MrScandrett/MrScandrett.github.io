#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_DRIVE = "/media/evanscandrett/MrScandrett";
const DRIVE = path.resolve(process.argv.slice(2).find((arg) => !arg.startsWith("--")) || DEFAULT_DRIVE);
const JSON_MODE = process.argv.includes("--json");

const MAX_TEXT_FILE_BYTES = 200_000;
const MAX_TEXT_BYTES_PER_PROJECT = 600_000;
const SKIP_DIRS = new Set([
  "$RECYCLE.BIN",
  "System Volume Information",
  ".git",
  ".godot",
  ".arcade-tool",
  "node_modules",
  "pxt_modules",
]);
const TEXT_EXTENSIONS = new Set([".css", ".gd", ".html", ".htm", ".js", ".jsx", ".json", ".md", ".py", ".ts", ".txt"]);
const PROJECT_MARKERS = /^(index\.html?|project\.godot|pxt\.json|package\.json)$/i;
const HIGH_RISK_TERMS = [
  "among us",
  "block blast",
  "disney",
  "eevee",
  "flareon",
  "flappy bird",
  "fortnite",
  "geometry dash",
  "godzilla",
  "hamilton",
  "hollow knight",
  "king kong",
  "lebron",
  "marvel",
  "mario",
  "minecraft",
  "pikachu",
  "pokemon",
  "pokémon",
  "roblox",
  "sonic",
  "star wars",
  "subway surfers",
  "tamagotchi",
  "paper.io",
  "stephen curry",
];
const SCRAPED_ASSET_HOSTS = ["freepngimg.com", "pokeapi.co", "raw.githubusercontent.com"];

const KNOWN_BRANCHES = new Map([
  ["Computer 2/doms folder", "doms-folder"],
  ["Computer 2/jumper", "jumper"],
  ["Computer 3/horse", "horse-v1"],
  ["Computer 3/Horse Game", "horse-v1"],
  ["Computer 3/matthew", "matthew"],
  ["Computer 3/matthew 2.0", "matthew"],
  ["Computer 3/mermaidgame", "mermaidgame"],
  ["Zspace1/thomas", "thomas"],
]);
const CURATED_IMPORTS = new Map([
  ["Computer 1/eason", "one-more-rally"],
  ["Computer 1/JohnathanSpore", "oddkin-wild-worlds"],
  ["Computer 1/lucas", "math-soccer-league"],
  ["Computer 1/Lucas M", "street-cup-tactics"],
  ["Computer 1/playground 624206", "physics-doodle-lab"],
  ["Computer 1/William", "retro-dungeon-quest"],
  ["Computer 2/aiden", "simple-paint-studio"],
  ["Computer 2/carnival games", "carnival-mini-games"],
  ["Computer 2/eric", "classic-snake"],
  ["Computer 2/MPC Dance", "pad-clash"],
  ["Computer 2/william f", "street-sync-showdown"],
  ["Computer 3/Luke A", "mechaterra"],
  ["Computer 3/Rochelle A", "dream-town-life"],
  ["Zspace1/eason", "interactive-virtual-fishtank"],
  ["Zspace1/sharks n minnows", "red-shark-escape"],
  ["Zspace2/ivan", "farmland-fury"],
  ["Zspace2/moriah", "3d-speedway"],
  ["Zspace3/gio", "dino-jump"],
  ["Zspace3/selena", "my-virtual-pet"],
]);

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function safeReadDir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function projectRoots() {
  const roots = [];
  const stations = ["Computer 2", "Computer 3", "Zspace1", "Zspace2", "Zspace3", "Zspace4"];
  for (const station of stations) {
    const stationDir = path.join(DRIVE, station);
    for (const entry of safeReadDir(stationDir)) {
      if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
        roots.push({ station, dir: path.join(stationDir, entry.name) });
      }
    }
  }

  const computerOne = path.join(DRIVE, "Computer 1", "Student Projects");
  for (const entry of safeReadDir(computerOne)) {
    if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
      roots.push({ station: "Computer 1", dir: path.join(computerOne, entry.name) });
    }
  }
  return roots.sort((a, b) => a.dir.localeCompare(b.dir));
}

function inspectProject({ station, dir }) {
  const entries = safeReadDir(dir);
  const files = entries.filter((entry) => entry.isFile());
  const directories = entries
    .filter((entry) => entry.isDirectory() && !SKIP_DIRS.has(entry.name))
    .map((entry) => entry.name);
  let text = path.basename(dir);
  let bytesRead = 0;
  let directBytes = 0;
  const entryHashes = {};

  for (const entry of files) {
    const fullPath = path.join(dir, entry.name);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }
    directBytes += stat.size;
    if (PROJECT_MARKERS.test(entry.name) && stat.size <= MAX_TEXT_FILE_BYTES) {
      try {
        entryHashes[entry.name] = sha256(fs.readFileSync(fullPath));
      } catch {
        // A transient read error should not stop the rest of the audit.
      }
    }
    if (
      !TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ||
      stat.size > MAX_TEXT_FILE_BYTES ||
      bytesRead + stat.size > MAX_TEXT_BYTES_PER_PROJECT
    ) continue;
    try {
      text += `\n${fs.readFileSync(fullPath, "utf8")}`;
      bytesRead += stat.size;
    } catch {
      // Continue with the metadata already gathered.
    }
  }

  const title = text.match(/<title[^>]*>([^<]{1,160})/i)?.[1]?.trim() || "";
  const h1 = text.match(/<h1[^>]*>([^<]{1,160})/i)?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
  const hosts = [...text.matchAll(/https?:\/\/([^\s"'<>/)]+)/gi)]
    .map((match) => match[1].toLowerCase().replace(/[:`].*$/, ""))
    .filter((host, index, all) => all.indexOf(host) === index);
  const lowerText = text.toLowerCase();
  const riskTerms = HIGH_RISK_TERMS.filter((term) => lowerText.includes(term));
  const suspiciousHosts = hosts.filter((host) => SCRAPED_ASSET_HOSTS.includes(host));
  const markers = files.filter((entry) => PROJECT_MARKERS.test(entry.name) || /\.sb3$/i.test(entry.name)).map((entry) => entry.name);
  const relativePath = `${station}/${path.basename(dir)}`;
  const branchOf = KNOWN_BRANCHES.get(relativePath) || null;
  const importedAs = CURATED_IMPORTS.get(relativePath) || null;
  const hasUsableHtml = files.some((entry) => /^index\.html?$/i.test(entry.name) && fs.statSync(path.join(dir, entry.name)).size > 1)
    || files.filter((entry) => /\.html?$/i.test(entry.name) && fs.statSync(path.join(dir, entry.name)).size > 1).length === 1;
  const hasGodot = markers.some((marker) => marker.toLowerCase() === "project.godot");
  const hasPxt = markers.some((marker) => marker.toLowerCase() === "pxt.json");

  let status = "review-web-candidate";
  let reason = "Contains a bounded, non-empty browser entry and needs a visual/licensing review.";
  if (branchOf) {
    status = "preserve-site-branch";
    reason = `Likely branch of existing ${branchOf}; never replace the patched site source automatically.`;
  } else if (importedAs) {
    status = "imported-curated";
    reason = `Imported as ${importedAs}; the site copy may include completeness or branding fixes.`;
  } else if (riskTerms.length || suspiciousHosts.length) {
    status = "hold-copyright-review";
    reason = "Recognizable franchise/clone branding or a suspicious third-party asset source was detected.";
  } else if (!hasUsableHtml && hasGodot) {
    status = "hold-needs-web-export";
    reason = "Godot source is present, but the static site needs an HTML5/Web export.";
  } else if (!hasUsableHtml && hasPxt) {
    status = "hold-needs-web-export";
    reason = "MakeCode/PXT source is present, but no bounded browser entry was found.";
  } else if (!hasUsableHtml) {
    status = "hold-empty-or-incomplete";
    reason = "No non-empty browser entry was found at the project root.";
  }

  return {
    station,
    folder: path.basename(dir),
    relativePath,
    title,
    h1,
    status,
    reason,
    branchOf,
    importedAs,
    riskTerms,
    suspiciousHosts,
    externalHosts: hosts,
    markers,
    directFileCount: files.length,
    directDirectoryCount: directories.length,
    directBytes,
    textBytesRead: bytesRead,
    entryHashes,
  };
}

function summary(projects) {
  const statuses = {};
  for (const project of projects) statuses[project.status] = (statuses[project.status] || 0) + 1;
  return {
    drive: DRIVE,
    generatedAt: new Date().toISOString(),
    boundedAudit: {
      recursion: "Known station folders plus one project-directory level",
      maxTextFileBytes: MAX_TEXT_FILE_BYTES,
      maxTextBytesPerProject: MAX_TEXT_BYTES_PER_PROJECT,
      skippedDirectories: [...SKIP_DIRS].sort(),
    },
    projectCount: projects.length,
    statuses,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# Student drive audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Projects inspected: ${report.projectCount}`,
    "",
    "This is a bounded, read-only audit. It inspects known station/project roots and small root-level text files; it skips dependency, cache, recycle-bin, and system trees.",
    "",
    "| Status | Count |",
    "| --- | ---: |",
    ...Object.entries(report.statuses).sort().map(([status, count]) => `| ${status} | ${count} |`),
    "",
    "| Station / folder | Detected title | Status | Notes |",
    "| --- | --- | --- | --- |",
  ];
  for (const project of report.projects) {
    const notes = [
      project.branchOf ? `branch of ${project.branchOf}` : "",
      project.riskTerms.length ? `terms: ${project.riskTerms.join(", ")}` : "",
      project.suspiciousHosts.length ? `hosts: ${project.suspiciousHosts.join(", ")}` : "",
      project.reason,
    ].filter(Boolean).join("; ").replaceAll("|", "\\|");
    lines.push(`| ${project.relativePath.replaceAll("|", "\\|")} | ${(project.title || "—").replaceAll("|", "\\|")} | ${project.status} | ${notes} |`);
  }
  return `${lines.join("\n")}\n`;
}

if (!fs.existsSync(DRIVE)) {
  console.error(`Student drive not found: ${DRIVE}`);
  process.exit(1);
}

const projects = projectRoots().map(inspectProject);
const report = { ...summary(projects), projects };
if (JSON_MODE) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
else process.stdout.write(renderMarkdown(report));
