#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const DEFAULTS = {
  projectPath: process.cwd(),
  repoName: "march-showcase",
  githubOwner: "",
  visibility: "public",
  branch: "main",
  siteSubpath: "/",
  studentSlug: "",
  teacherMode: false,
};

function printHelp() {
  console.log(`
publish_to_pages.js

Usage:
  node publish_to_pages.js [options]

Options:
  --projectPath <path>   Local project folder (must contain index.html)
  --repoName <name>      GitHub repo name (default: march-showcase)
  --githubOwner <owner>  GitHub owner/login (default: current gh auth user)
  --visibility <value>   public | private (default: public)
  --branch <name>        Branch name (default: main)
  --siteSubpath <path>   Pages source path (default: /)
  --studentSlug <slug>   Optional tutorial label (default: Your Project)
  --teacherMode          Skip "create account" tutorial content
  --help                 Show this message

Example:
  node publish_to_pages.js --projectPath "/path/to/project-folder" --repoName "march-showcase"
`);
}

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;
    const eqIndex = raw.indexOf("=");
    const key = raw.slice(2, eqIndex === -1 ? undefined : eqIndex);
    const inlineValue = eqIndex === -1 ? null : raw.slice(eqIndex + 1);

    if (key === "help") {
      options.help = true;
      continue;
    }
    if (key === "teacherMode") {
      if (inlineValue === null) {
        options.teacherMode = true;
      } else {
        options.teacherMode = /^(1|true|yes)$/i.test(inlineValue);
      }
      continue;
    }

    const next = inlineValue === null ? argv[i + 1] : inlineValue;
    if (next === undefined || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    if (inlineValue === null) i += 1;

    if (Object.prototype.hasOwnProperty.call(options, key)) {
      options[key] = next;
    } else {
      throw new Error(`Unknown option: --${key}`);
    }
  }
  return options;
}

function run(cmd, args, runOptions = {}) {
  const result = spawnSync(cmd, args, {
    cwd: runOptions.cwd,
    input: runOptions.input,
    encoding: "utf8",
  });
  if (result.error) {
    throw new Error(`Failed to run ${cmd}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    const detail = stderr || stdout || `exit code ${result.status}`;
    const err = new Error(`${cmd} ${args.join(" ")} failed: ${detail}`);
    err.status = result.status;
    err.stdout = stdout;
    err.stderr = stderr;
    throw err;
  }
  return (result.stdout || "").trim();
}

function runMaybe(cmd, args, runOptions = {}) {
  const result = spawnSync(cmd, args, {
    cwd: runOptions.cwd,
    input: runOptions.input,
    encoding: "utf8",
  });
  if (result.error) {
    return { ok: false, status: -1, stdout: "", stderr: result.error.message };
  }
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function commandExists(cmd) {
  const result = runMaybe(cmd, ["--version"]);
  return result.ok;
}

function logStep(title) {
  console.log(`\n[STEP] ${title}`);
}

function warn(message) {
  console.log(`[WARN] ${message}`);
}

function info(message) {
  console.log(`[INFO] ${message}`);
}

function fail(message) {
  throw new Error(message);
}

function sanitizeSiteSubpath(value) {
  if (!value || value === "/") return "/";
  if (!value.startsWith("/")) return `/${value}`;
  return value;
}

function ensureTrailingSlash(url) {
  return url.endsWith("/") ? url : `${url}/`;
}

function joinUrl(base, segment) {
  return `${ensureTrailingSlash(base)}${segment.replace(/^\/+/, "")}`;
}

function stripQueryHash(value) {
  return value.split("#")[0].split("?")[0];
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function collectFiles(rootDir) {
  const files = [];
  const ignoredDirs = new Set([".git", "node_modules", ".next", "dist", "build"]);

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (ignoredDirs.has(entry.name)) continue;
        walk(full);
      } else {
        files.push(full);
      }
    }
  }

  walk(rootDir);
  return files;
}

function collectReferences(filePath, text) {
  const refs = [];
  const pushRef = (value, index, kind) => {
    if (!value) return;
    refs.push({ value: value.trim(), line: lineNumberForIndex(text, index), kind, filePath });
  };

  const htmlAttr = /\b(?:src|href|poster)\s*=\s*(['"])(.*?)\1/gi;
  let match;
  while ((match = htmlAttr.exec(text)) !== null) {
    pushRef(match[2], match.index, "html-attr");
  }

  const cssUrl = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  while ((match = cssUrl.exec(text)) !== null) {
    pushRef(match[2], match.index, "css-url");
  }

  return refs;
}

function isIgnorableRef(ref) {
  if (!ref) return true;
  const value = ref.trim();
  if (!value || value.startsWith("#")) return true;
  if (/^(https?:|mailto:|tel:|javascript:|data:|ftp:|sms:)/i.test(value)) return true;
  if (value.startsWith("//")) return true;
  if (value.includes("{{") || value.includes("<%")) return true;
  return false;
}

function isLikelyLocalAbsolute(ref) {
  return /^(file:\/\/|[a-zA-Z]:[\\/]|\/Users\/|\/home\/|\/var\/|\\\\)/.test(ref);
}

function resolveReferencePath(projectPath, sourceFile, ref) {
  const clean = stripQueryHash(ref);
  if (!clean || clean === "/") return null;
  if (clean.startsWith("/")) return path.join(projectPath, clean.slice(1));
  return path.resolve(path.dirname(sourceFile), clean);
}

function validateProject(projectPath) {
  const issues = {
    localAbsoluteRefs: [],
    missingAssets: [],
  };

  const indexPath = path.join(projectPath, "index.html");
  if (!fs.existsSync(indexPath)) {
    fail(`Missing required file: ${indexPath}. Put index.html at the project root.`);
  }

  const allFiles = collectFiles(projectPath);
  const scanFiles = allFiles.filter((file) => /\.(html?|css)$/i.test(file));

  for (const file of scanFiles) {
    const text = fs.readFileSync(file, "utf8");
    const refs = collectReferences(file, text);

    for (const refMeta of refs) {
      if (isIgnorableRef(refMeta.value)) continue;
      const clean = stripQueryHash(refMeta.value);
      if (isLikelyLocalAbsolute(clean)) {
        issues.localAbsoluteRefs.push({ ...refMeta, value: clean });
      }

      const candidatePath = resolveReferencePath(projectPath, file, clean);
      if (!candidatePath) continue;
      if (!fs.existsSync(candidatePath)) {
        issues.missingAssets.push({
          ...refMeta,
          value: clean,
          resolved: candidatePath,
        });
      }
    }
  }

  return issues;
}

function reportValidation(issues) {
  if (issues.localAbsoluteRefs.length === 0 && issues.missingAssets.length === 0) {
    info("Validation checks passed: no obvious path problems found.");
    return;
  }

  if (issues.localAbsoluteRefs.length > 0) {
    warn("Found local absolute paths that usually break on GitHub Pages:");
    for (const issue of issues.localAbsoluteRefs.slice(0, 25)) {
      console.log(`  - ${issue.filePath}:${issue.line} -> ${issue.value}`);
    }
    if (issues.localAbsoluteRefs.length > 25) {
      console.log(`  ...and ${issues.localAbsoluteRefs.length - 25} more`);
    }
  }

  if (issues.missingAssets.length > 0) {
    warn("Missing referenced files (best effort scan):");
    for (const issue of issues.missingAssets.slice(0, 25)) {
      console.log(`  - ${issue.filePath}:${issue.line} -> ${issue.value}`);
    }
    if (issues.missingAssets.length > 25) {
      console.log(`  ...and ${issues.missingAssets.length - 25} more`);
    }
  }

  info("Publishing will continue, but fix warnings for best results.");
}

function tryInsertFooter(indexPath) {
  const original = fs.readFileSync(indexPath, "utf8");
  if (original.includes("How this was published")) {
    return { added: false, reason: "already_present" };
  }
  const hasBodyTag = /<\/body>/i.test(original);
  if (!hasBodyTag) {
    return { added: false, reason: "missing_body_tag" };
  }

  const footer = `
<footer style="margin-top:2rem;padding:0.9rem 1rem;border-top:1px solid #d9d9d9;font-size:0.95rem;">
  How this was published: <a href="./tutorial/">Open tutorial</a>
</footer>
`;
  const updated = original.replace(/<\/body>/i, `${footer}</body>`);
  fs.writeFileSync(indexPath, updated, "utf8");
  return { added: true, reason: "" };
}

function tutorialHtmlTemplate(data) {
  const accountSection = data.teacherMode
    ? `
    <section class="panel step">
      <h2><span class="step-num">1</span>Account Setup (Skipped)</h2>
      <p>This tutorial was generated in Teacher Mode, so account setup is skipped.</p>
      <div class="shot">Screenshot placeholder: GitHub account already ready</div>
    </section>
`
    : `
    <section class="panel step">
      <h2><span class="step-num">1</span>Create a GitHub Account</h2>
      <p>Go to <a href="https://github.com/" target="_blank" rel="noreferrer">github.com</a> and make a free account.</p>
      <div class="shot">Screenshot placeholder: GitHub sign up page</div>
    </section>
`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${data.projectLabel} - Publish Tutorial</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="./style.css" />
</head>
<body>
  <main class="wrap">
    <header class="panel hero">
      <p class="eyebrow">Publish Playbook</p>
      <h1>Publish Your Website to GitHub Pages</h1>
      <p class="subtitle">Fast, clean, and beginner-friendly GitHub Pages workflow.</p>
      <p>This page shows the same steps the automation used for <strong>${data.projectLabel}</strong>.</p>
      <p><strong>Live project:</strong> <a href="${data.liveUrl}">${data.liveUrl}</a></p>
      <p><strong>Share link for LMS/class page:</strong> <code>${data.liveUrl}</code></p>
    </header>

    ${accountSection}

    <section class="panel step">
      <h2><span class="step-num">2</span>Create a Repository</h2>
      <p>Repository name: <code>${data.repoName}</code> (visibility: <code>${data.visibility}</code>).</p>
      <p>Set branch to <code>${data.branch}</code> and publish from root folder.</p>
      <div class="shot">Screenshot placeholder: Create new repository form</div>
    </section>

    <section class="panel step">
      <h2><span class="step-num">3</span>Upload Your Files</h2>
      <p>Put your project files in the repo root. Make sure <code>index.html</code> is at the top level.</p>
      <div class="shot">Screenshot placeholder: Files list showing index.html at root</div>
    </section>

    <section class="panel step">
      <h2><span class="step-num">4</span>Enable GitHub Pages</h2>
      <p>Open <strong>Settings → Pages</strong>, set source to <code>${data.branch}</code> and folder to <code>/${data.siteSubpath === "/" ? "" : data.siteSubpath.replace(/^\//, "")}</code>.</p>
      <div class="shot">Screenshot placeholder: Pages source settings</div>
    </section>

    <section class="panel step">
      <h2><span class="step-num">5</span>Get Your Link</h2>
      <p>After GitHub finishes building, your site link appears in Pages settings.</p>
      <p><strong>Expected link:</strong> <code>${data.liveUrl}</code></p>
      <p><strong>Tutorial link:</strong> <code>${data.tutorialUrl}</code></p>
      <div class="shot">Screenshot placeholder: Live site opened in browser</div>
    </section>

    <section class="panel">
      <h2>Checklist</h2>
      <ul class="checklist">
        <li><input type="checkbox" /> <span><code>index.html</code> is in the project root</span></li>
        <li><input type="checkbox" /> <span>Paths are relative (not C:, file://, /Users/...)</span></li>
        <li><input type="checkbox" /> <span>All images/CSS/JS files exist</span></li>
        <li><input type="checkbox" /> <span>Repo is public (for free Pages)</span></li>
        <li><input type="checkbox" /> <span>Pages source is ${data.branch} + root</span></li>
      </ul>
    </section>

    <section class="panel warning">
      <h2>Common Mistakes and Fixes</h2>
      <ul>
        <li><strong>Missing index.html:</strong> move <code>index.html</code> to the top project folder.</li>
        <li><strong>Wrong folder depth:</strong> avoid nested folders like <code>project/project/index.html</code>.</li>
        <li><strong>Broken asset paths:</strong> replace local absolute paths with relative paths like <code>./images/pic.png</code>.</li>
      </ul>
    </section>

    <section class="panel">
      <h2>Need Help?</h2>
      <p>If the footer link is missing on your homepage, open <code>/tutorial/</code> directly from your live URL.</p>
      <p>Footer update status: <strong>${data.footerNote}</strong></p>
    </section>
  </main>
</body>
</html>
`;
}

function tutorialCssTemplate() {
  return `:root {
  --bg: #eef4fb;
  --ink: #102138;
  --muted: #4f6882;
  --panel: rgba(255, 255, 255, 0.84);
  --line: #c9d9ea;
  --accent: #0d72cf;
  --accent-soft: #e3f0ff;
  --warn: #b46a16;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  color: var(--ink);
  font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
  background:
    radial-gradient(1200px 600px at 90% -10%, #c8e4ff 0%, transparent 55%),
    radial-gradient(1000px 500px at -20% 100%, #daedff 0%, transparent 52%),
    linear-gradient(180deg, #eaf2fc 0%, #f8fbff 50%, #ffffff 100%);
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.35;
  background-image:
    linear-gradient(to right, rgba(16, 33, 56, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(16, 33, 56, 0.05) 1px, transparent 1px);
  background-size: 38px 38px;
}

.wrap {
  width: min(980px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 26px 0 48px;
  position: relative;
  z-index: 1;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 18px;
  margin-bottom: 14px;
  box-shadow: 0 12px 30px rgba(19, 43, 72, 0.06);
  backdrop-filter: blur(6px);
}

.hero {
  border-color: #b8d6f0;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(238, 247, 255, 0.85));
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.76rem;
  color: var(--accent);
  font-weight: 700;
}

h1 {
  margin: 8px 0 10px;
  font-size: clamp(1.8rem, 2.8vw, 2.5rem);
  line-height: 1.15;
}

.subtitle {
  margin-top: 0;
  margin-bottom: 8px;
  color: var(--muted);
}

h2 {
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.2rem;
}

.step-num {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  font-size: 0.9rem;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid #bbd7f5;
}

p {
  margin: 8px 0;
}

a {
  color: var(--accent);
  text-decoration-thickness: 2px;
  text-underline-offset: 2px;
}

code {
  background: #edf5ff;
  border: 1px solid #d7e8fb;
  border-radius: 8px;
  padding: 2px 8px;
  font-size: 0.95em;
}

ul {
  margin: 8px 0 0;
  padding-left: 20px;
}

.checklist {
  list-style: none;
  padding-left: 0;
}

.checklist li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 8px 0;
}

.checklist input {
  margin-top: 2px;
}

.shot {
  margin-top: 12px;
  padding: 12px 14px;
  border: 1.5px dashed #93bbe4;
  border-radius: 12px;
  color: #36577d;
  background:
    linear-gradient(135deg, rgba(223, 239, 255, 0.7), rgba(237, 246, 255, 0.95));
  font-size: 0.94rem;
}

.warning {
  border-left: 4px solid var(--warn);
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero {
  animation: rise-in 0.45s ease-out both;
}

.panel {
  opacity: 0;
  animation: rise-in 0.55s ease-out both;
}

.hero + .panel { animation-delay: 0.06s; }
.hero + .panel + .panel { animation-delay: 0.11s; }
.hero + .panel + .panel + .panel { animation-delay: 0.16s; }
.hero + .panel + .panel + .panel + .panel { animation-delay: 0.21s; }
.hero + .panel + .panel + .panel + .panel + .panel { animation-delay: 0.26s; }
.hero + .panel + .panel + .panel + .panel + .panel + .panel { animation-delay: 0.31s; }

@media (max-width: 720px) {
  .wrap {
    width: calc(100% - 1rem);
    padding-top: 16px;
  }

  .panel {
    padding: 14px;
    border-radius: 14px;
  }

  h2 {
    font-size: 1.08rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero,
  .panel {
    animation: none;
    opacity: 1;
  }
}
`;
}

function ensureTutorialFiles(projectPath, tutorialData) {
  const tutorialDir = path.join(projectPath, "tutorial");
  fs.mkdirSync(tutorialDir, { recursive: true });
  fs.writeFileSync(path.join(tutorialDir, "style.css"), tutorialCssTemplate(), "utf8");
  fs.writeFileSync(
    path.join(tutorialDir, "index.html"),
    tutorialHtmlTemplate(tutorialData),
    "utf8"
  );
}

function ensureGitInitialized(projectPath, branch) {
  const gitDir = path.join(projectPath, ".git");
  if (!fs.existsSync(gitDir)) {
    const initBranch = runMaybe("git", ["init", "-b", branch], { cwd: projectPath });
    if (!initBranch.ok) {
      run("git", ["init"], { cwd: projectPath });
      run("git", ["checkout", "-B", branch], { cwd: projectPath });
    }
    return;
  }
  run("git", ["checkout", "-B", branch], { cwd: projectPath });
}

function ensureCommit(projectPath) {
  run("git", ["add", "-A"], { cwd: projectPath });
  const stagedDiff = runMaybe("git", ["diff", "--cached", "--quiet"], { cwd: projectPath });
  if (stagedDiff.ok) {
    info("No file changes to commit.");
    return;
  }
  try {
    run("git", ["commit", "-m", "Publish project"], { cwd: projectPath });
  } catch (error) {
    if (String(error.message).includes("Please tell me who you are")) {
      fail(
        "Git user name/email is not configured. Run: git config --global user.name \"Your Name\" and git config --global user.email \"you@example.com\""
      );
    }
    throw error;
  }
}

function ensureRemoteAndPush(projectPath, owner, repoName, visibility, branch) {
  const targetRepo = `${owner}/${repoName}`;
  const targetUrlChunk = `/${targetRepo}`;
  const origin = runMaybe("git", ["remote", "get-url", "origin"], { cwd: projectPath });
  const remoteUrl = origin.ok ? origin.stdout : "";

  const repoView = runMaybe("gh", ["repo", "view", targetRepo], { cwd: projectPath });
  const repoExists = repoView.ok;

  if (remoteUrl) {
    if (!remoteUrl.includes(targetUrlChunk)) {
      fail(
        `Current origin remote points elsewhere (${remoteUrl}). Use a different --repoName or update remote manually.`
      );
    }
  } else if (repoExists) {
    run("git", ["remote", "add", "origin", `https://github.com/${targetRepo}.git`], {
      cwd: projectPath,
    });
  } else {
    run("gh", ["repo", "create", targetRepo, `--${visibility}`, "--source", ".", "--remote", "origin"], {
      cwd: projectPath,
    });
  }

  run("git", ["push", "-u", "origin", branch], { cwd: projectPath });
}

function enablePages(owner, repoName, branch, siteSubpath) {
  const endpoint = `repos/${owner}/${repoName}/pages`;
  const pathValue = siteSubpath === "/" ? "/" : siteSubpath;

  let result = runMaybe(
    "gh",
    ["api", "--method", "PUT", endpoint, "-f", `source[branch]=${branch}`, "-f", `source[path]=${pathValue}`]
  );
  if (!result.ok) {
    result = runMaybe(
      "gh",
      ["api", "--method", "POST", endpoint, "-f", `source[branch]=${branch}`, "-f", `source[path]=${pathValue}`]
    );
  }
  if (!result.ok) {
    fail(`Unable to enable GitHub Pages automatically. ${result.stderr || result.stdout}`);
  }
}

function buildLikelyPagesUrl(owner, repoName, siteSubpath) {
  const ownerLower = owner.toLowerCase();
  const repoLower = repoName.toLowerCase();
  const isUserSite = repoLower === `${ownerLower}.github.io`;
  const root = isUserSite
    ? `https://${owner}.github.io/`
    : `https://${owner}.github.io/${repoName}/`;
  if (siteSubpath === "/") return ensureTrailingSlash(root);
  return ensureTrailingSlash(joinUrl(root, siteSubpath));
}

function fetchPagesUrl(owner, repoName, fallbackUrl) {
  const result = runMaybe("gh", ["api", `repos/${owner}/${repoName}/pages`, "--jq", ".html_url"]);
  if (!result.ok || !result.stdout) return fallbackUrl;
  return ensureTrailingSlash(result.stdout.trim());
}

function copyToClipboard(text) {
  if (process.platform === "darwin") {
    const r = runMaybe("pbcopy", [], { input: text });
    return r.ok;
  }
  if (process.platform === "win32") {
    const r = runMaybe("cmd", ["/c", "clip"], { input: text });
    return r.ok;
  }
  if (commandExists("xclip")) {
    const r = runMaybe("xclip", ["-selection", "clipboard"], { input: text });
    return r.ok;
  }
  if (commandExists("xsel")) {
    const r = runMaybe("xsel", ["--clipboard", "--input"], { input: text });
    return r.ok;
  }
  return false;
}

function ensureGhAvailable() {
  if (!commandExists("git")) {
    fail("git is required but not installed.");
  }
  if (!commandExists("gh")) {
    const installHelp = [
      "GitHub CLI (`gh`) is required but not installed.",
      "Install instructions:",
      "  macOS: brew install gh",
      "  Windows (PowerShell): winget install --id GitHub.cli -e",
      "  Windows (Chocolatey): choco install gh",
      "After install, run: gh auth login",
    ].join("\n");
    fail(installHelp);
  }
  const auth = runMaybe("gh", ["auth", "status"]);
  if (!auth.ok) {
    fail("GitHub CLI is installed but not authenticated. Run: gh auth login");
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  options.projectPath = path.resolve(options.projectPath || process.cwd());
  options.siteSubpath = sanitizeSiteSubpath(options.siteSubpath || "/");
  options.visibility = String(options.visibility || "public").toLowerCase();
  if (!["public", "private"].includes(options.visibility)) {
    fail('visibility must be "public" or "private".');
  }
  if (options.visibility !== "public") {
    warn("Private repos may not support free GitHub Pages on all plans.");
  }

  if (!fs.existsSync(options.projectPath) || !fs.statSync(options.projectPath).isDirectory()) {
    fail(`projectPath is not a directory: ${options.projectPath}`);
  }

  logStep("Checking prerequisites");
  ensureGhAvailable();

  const owner = options.githubOwner || run("gh", ["api", "user", "--jq", ".login"]);
  if (!owner) {
    fail("Unable to detect GitHub owner. Set --githubOwner explicitly.");
  }
  const projectLabel = options.studentSlug || "Your Project";

  logStep("Validating project files");
  const validation = validateProject(options.projectPath);
  reportValidation(validation);

  const repoRootUrlEstimate = buildLikelyPagesUrl(owner, options.repoName, options.siteSubpath);
  const tutorialUrlEstimate = joinUrl(repoRootUrlEstimate, "tutorial/");

  logStep("Updating homepage footer and generating tutorial files");
  const footerResult = tryInsertFooter(path.join(options.projectPath, "index.html"));
  const footerNote = footerResult.added
    ? "Footer added to index.html"
    : `Footer skipped (${footerResult.reason}).`;
  ensureTutorialFiles(options.projectPath, {
    projectLabel,
    teacherMode: options.teacherMode,
    repoName: options.repoName,
    branch: options.branch,
    visibility: options.visibility,
    liveUrl: repoRootUrlEstimate,
    tutorialUrl: tutorialUrlEstimate,
    siteSubpath: options.siteSubpath,
    footerNote,
  });
  info(footerNote);

  logStep("Initializing git, committing, and pushing");
  ensureGitInitialized(options.projectPath, options.branch);
  ensureCommit(options.projectPath);
  ensureRemoteAndPush(
    options.projectPath,
    owner,
    options.repoName,
    options.visibility,
    options.branch
  );

  logStep("Enabling GitHub Pages");
  enablePages(owner, options.repoName, options.branch, options.siteSubpath);

  logStep("Fetching live URL");
  const liveUrl = fetchPagesUrl(owner, options.repoName, repoRootUrlEstimate);
  const tutorialUrl = joinUrl(liveUrl, "tutorial/");
  const copied = copyToClipboard(liveUrl);
  if (copied) {
    info("Live link copied to clipboard.");
  } else {
    info("Clipboard copy not available on this machine.");
  }

  console.log(`LIVE LINK: ${liveUrl}`);
  console.log(`TUTORIAL LINK: ${tutorialUrl}`);
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
