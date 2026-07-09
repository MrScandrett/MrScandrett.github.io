#!/usr/bin/env node
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const PORT = Number(process.env.PORT || "8787");
const ROOT_DIR = path.resolve(__dirname, "..");
const PORTAL_DIR = __dirname;
const STATIC_DIR = path.join(PORTAL_DIR, "static");
const WORK_DIR = path.join(PORTAL_DIR, "work");
const UPLOADS_DIR = path.join(PORTAL_DIR, "uploads");
const HUB_DATA_FILE = path.join(ROOT_DIR, "data", "projects.json");
const PUBLISH_SCRIPT = path.join(ROOT_DIR, "publish_to_pages.js");

const GITHUB_OWNER = process.env.GITHUB_OWNER || "MrScandrett";
const REPO_PREFIX = process.env.REPO_PREFIX || "student-showcase-";
const DEFAULT_VISIBILITY = (process.env.DEFAULT_VISIBILITY || "public").toLowerCase();
const PORTAL_HOST = process.env.PORTAL_HOST || "127.0.0.1";
const ALLOW_REMOTE_PORTAL = /^(1|true|yes)$/i.test(String(process.env.ALLOW_REMOTE_PORTAL || ""));
const ACCESS_MODE = ALLOW_REMOTE_PORTAL ? "remote-enabled" : "local-only";

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
const MAX_MODEL_BYTES = 50 * 1024 * 1024;
const MUSEUM_MODELS_DIR = path.join(path.join(ROOT_DIR, "apps"), "virtual-reality-museum", "models");
const MUSEUM_DATA_FILE = path.join(ROOT_DIR, "data", "museum-models.json");
const OPEN_SESSION = Object.freeze({
  username: "portal",
  role: "teacher",
});

const PENDING_DIR = path.join(PORTAL_DIR, "pending");
const STUDENT_PROJECTS_DIR = path.join(ROOT_DIR, "student-projects");
const BUILD_SHOWCASE_SCRIPT = path.join(ROOT_DIR, "build-showcase.js");
const SHOWCASE_MANIFEST_PATH = path.join(ROOT_DIR, "apps", "manifest.json");
const MAX_STUDENT_UPLOAD_BYTES = 60 * 1024 * 1024;

const KIND_LABELS = {
  game: "Game / App",
  model: "3D Model",
  animation: "Pivot Animation",
  photo: "Photo",
  link: "Online Project Link",
  other: "Something Else Cool",
};

const KIND_EXTENSIONS = {
  game: new Set([".zip", ".sb3", ".html", ".htm"]),
  model: new Set([".stl", ".obj", ".mtl", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg", ".tga"]),
  animation: new Set([".piv", ".stk", ".webm", ".mp4", ".gif", ".mov"]),
  photo: new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]),
  link: new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]),
  other: new Set([
    ".pdf", ".mp3", ".wav", ".ogg", ".m4a",
    ".mp4", ".webm", ".mov",
    ".txt", ".md", ".csv",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
    ".mcworld", ".ino", ".gcode",
  ]),
};

const KIND_MAX_FILES = {
  game: 1,
  model: 6,
  animation: 2,
  photo: 6,
  link: 1,
  other: 1,
};

// Broader allowlist for direct folder-picker uploads (kind "game"), which can contain a full
// web project rather than a single archive.
const WEB_FOLDER_EXTENSIONS = new Set([
  ".html", ".htm", ".css", ".js", ".mjs", ".json",
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico",
  ".mp3", ".wav", ".ogg",
  ".ttf", ".woff", ".woff2",
  ".txt", ".map",
]);
const MAX_FOLDER_FILES = 300;

function normalizeRelativePath(rawPath) {
  const posixPath = String(rawPath || "").replace(/\\/g, "/");
  const segments = posixPath.split("/").filter((seg) => seg && seg !== ".");
  if (segments.some((seg) => seg === "..")) return null;
  return segments.join("/");
}

// Browsers report webkitRelativePath starting with the picked folder's own name
// (e.g. "MyGame/index.html"). Strip that shared top segment so index.html lands
// directly at the project root, matching how build-showcase.js expects web projects.
function stripCommonTopFolder(relativePaths) {
  const withSegments = relativePaths.filter((p) => p.includes("/"));
  if (withSegments.length !== relativePaths.length || relativePaths.length === 0) return relativePaths;
  const firstSegments = new Set(relativePaths.map((p) => p.split("/")[0]));
  if (firstSegments.size !== 1) return relativePaths;
  return relativePaths.map((p) => p.split("/").slice(1).join("/"));
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "CHAMPIONS4CHRIST";
const ADMIN_SESSION_COOKIE = "portal_admin";
const ADMIN_GATED_PATHS = ["/dashboard", "/review", "/upload", "/upload-model", "/pending-file/"];
const adminSessions = new Set();

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  });
  return out;
}

function isAdminAuthenticated(req) {
  const token = parseCookies(req)[ADMIN_SESSION_COOKIE];
  return Boolean(token && adminSessions.has(token));
}

function isAdminGatedPath(url) {
  return ADMIN_GATED_PATHS.some((prefix) => url === prefix || url.startsWith(prefix));
}

function requireAdmin(req, res) {
  if (isAdminAuthenticated(req)) return false;
  redirect(res, `/admin/login?next=${encodeURIComponent(req.url)}`);
  return true;
}

function ensureDirs() {
  fs.mkdirSync(WORK_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(path.join(ROOT_DIR, "assets", "thumbs"), { recursive: true });
  fs.mkdirSync(path.join(ROOT_DIR, "assets", "heroes"), { recursive: true });
  fs.mkdirSync(MUSEUM_MODELS_DIR, { recursive: true });
  fs.mkdirSync(PENDING_DIR, { recursive: true });
  fs.mkdirSync(STUDENT_PROJECTS_DIR, { recursive: true });

  if (!fs.existsSync(HUB_DATA_FILE)) {
    fs.mkdirSync(path.dirname(HUB_DATA_FILE), { recursive: true });
    fs.writeFileSync(HUB_DATA_FILE, JSON.stringify({ projects: [] }, null, 2));
  }

  if (!fs.existsSync(MUSEUM_DATA_FILE)) {
    fs.mkdirSync(path.dirname(MUSEUM_DATA_FILE), { recursive: true });
    fs.writeFileSync(MUSEUM_DATA_FILE, JSON.stringify({ models: [] }, null, 2));
  }

  if (!fs.existsSync(PUBLISH_SCRIPT)) {
    throw new Error(`Missing publish script at ${PUBLISH_SCRIPT}`);
  }
  if (!fs.existsSync(BUILD_SHOWCASE_SCRIPT)) {
    throw new Error(`Missing build script at ${BUILD_SHOWCASE_SCRIPT}`);
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function normalizeRemoteAddress(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw === "::1") return "127.0.0.1";
  if (raw.startsWith("::ffff:")) return raw.slice(7);
  return raw;
}

function isLoopbackAddress(value) {
  const address = normalizeRemoteAddress(value);
  return address === "127.0.0.1" || address === "localhost";
}

function forwardedAddresses(headerValue) {
  return String(headerValue || "")
    .split(",")
    .map((entry) => normalizeRemoteAddress(entry))
    .filter(Boolean);
}

function rejectIfRemote(req, res) {
  if (ALLOW_REMOTE_PORTAL) return false;

  const remoteAddress = normalizeRemoteAddress(
    (req.socket && req.socket.remoteAddress) || (req.connection && req.connection.remoteAddress) || ""
  );
  const forwarded = forwardedAddresses(req.headers["x-forwarded-for"]);
  const remoteViaProxy = forwarded.some((address) => !isLoopbackAddress(address));

  if (isLoopbackAddress(remoteAddress) && !remoteViaProxy) return false;

  sendHtml(
    res,
    403,
    pageShell(
      "Portal Locked",
      `<section class="panel error"><p>This publish portal only accepts requests from this machine.</p><p>Keep the public site on GitHub Pages; use the portal locally at <code>http://127.0.0.1:${PORT}/dashboard</code>.</p></section>`
    )
  );
  return true;
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error(`Upload too large. Limit is ${Math.floor(maxBytes / (1024 * 1024))}MB.`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function splitBuffer(buf, sep) {
  const parts = [];
  let start = 0;
  let idx = buf.indexOf(sep, start);
  while (idx !== -1) {
    parts.push(buf.slice(start, idx));
    start = idx + sep.length;
    idx = buf.indexOf(sep, start);
  }
  parts.push(buf.slice(start));
  return parts;
}

function parseContentDisposition(value) {
  const out = {};
  value.split(";").map((s) => s.trim()).forEach((seg, i) => {
    if (i === 0) {
      out.type = seg;
      return;
    }
    const eq = seg.indexOf("=");
    if (eq === -1) return;
    const key = seg.slice(0, eq).trim();
    let val = seg.slice(eq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    out[key] = val;
  });
  return out;
}

function parseMultipart(bodyBuffer, boundary) {
  const fields = {};
  const files = {};
  const fileLists = {};
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const sections = splitBuffer(bodyBuffer, boundaryBuf).slice(1, -1);

  sections.forEach((sectionRaw) => {
    let section = sectionRaw;
    if (section.length === 0) return;
    if (section.subarray(0, 2).toString("binary") === "\r\n") section = section.subarray(2);
    if (section.subarray(section.length - 2).toString("binary") === "\r\n") section = section.subarray(0, section.length - 2);

    const headerEnd = section.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) return;

    const headerText = section.subarray(0, headerEnd).toString("utf8");
    let content = section.subarray(headerEnd + 4);
    if (content.subarray(content.length - 2).toString("binary") === "\r\n") content = content.subarray(0, content.length - 2);

    const headers = {};
    headerText.split("\r\n").forEach((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return;
      headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
    });

    const disp = parseContentDisposition(headers["content-disposition"] || "");
    const name = disp.name;
    if (!name) return;

    if (disp.filename) {
      // Skip empty file inputs (browsers submit an empty-filename part for unfilled optional file fields).
      if (!disp.filename.trim()) return;
      const fileObj = {
        filename: path.basename(disp.filename),
        // Preserves any "/" path segments (e.g. folder-picker uploads send "MyGame/index.html" as
        // the filename). Only opt-in consumers should read this; everyone else uses the safe
        // basename-only `filename` above.
        rawFilename: disp.filename,
        contentType: headers["content-type"] || "application/octet-stream",
        data: content,
      };
      files[name] = fileObj;
      if (!fileLists[name]) fileLists[name] = [];
      fileLists[name].push(fileObj);
    } else {
      fields[name] = content.toString("utf8");
    }
  });

  return { fields, files, fileLists };
}

async function readUrlEncodedFields(req, maxBytes) {
  const body = await readBody(req, maxBytes);
  const params = new URLSearchParams(body.toString("utf8"));
  const out = {};
  for (const [key, value] of params.entries()) out[key] = value;
  return out;
}

function sanitizeSlug(value, fallback) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return slug || fallback;
}

function normalizeUsername(value) {
  return sanitizeSlug(String(value || "").replace(/[_.]/g, "-"), "").slice(0, 24);
}

function normalizeModelSlug(value) {
  return sanitizeSlug(String(value || ""), "model");
}

function toFileSlug(value) {
  return (
    String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

function sanitizeDirName(value, fallback) {
  const cleaned = String(value || "")
    .replace(/[\/\\:*?"<>|\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return cleaned || fallback;
}

function copyDirRecursiveSync(sourceDir, destinationDir) {
  fs.mkdirSync(destinationDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const srcPath = path.join(sourceDir, entry.name);
    const destPath = path.join(destinationDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursiveSync(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (_) {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function pageShell(title, body, banner = "") {
  const subtitle = ALLOW_REMOTE_PORTAL
    ? `Publish portal for <code>${escapeHtml(GITHUB_OWNER)}</code>.`
    : `Local publish portal for <code>${escapeHtml(GITHUB_OWNER)}</code>.`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/static/style.css" />
</head>
<body>
  <main class="wrap">
    <header class="panel hero">
      <p class="eyebrow">Classroom Portal</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="subtitle">${subtitle}</p>
      ${banner}
    </header>
    ${body}
  </main>
</body>
</html>`;
}

function renderUploadForm(session) {
  const currentYear = new Date().getFullYear();
  return `<section class="panel">
  <h2>Upload Project ZIP</h2>
  <p><strong>Mode:</strong> ${escapeHtml(ACCESS_MODE)} (${escapeHtml(session.role)})</p>
  <form method="post" action="/upload" enctype="multipart/form-data" class="stack">
    <label>Project owner alias
      <input name="ownerAlias" placeholder="team-01" required />
    </label>

    <label>Project title
      <input name="projectTitle" placeholder="My Project" required />
    </label>

    <label>Repository name (optional)
      <input name="repoName" placeholder="${escapeHtml(REPO_PREFIX)}project-name" />
    </label>

    <label>Category
      <select name="category">
        <option>Games</option>
        <option>Robotics</option>
        <option>3D</option>
        <option>Music</option>
        <option>Web</option>
        <option>VR</option>
      </select>
    </label>

    <label>Program
      <select name="program">
        <option>Microschool</option>
        <option>Monday Lab</option>
        <option>Camp</option>
        <option>Independent</option>
      </select>
    </label>

    <div class="stack" style="grid-template-columns: repeat(auto-fit,minmax(180px,1fr));">
      <label>Year
        <input name="year" type="number" min="2020" max="2100" value="${currentYear}" required />
      </label>
      <label>Term
        <select name="term">
          <option>Q1</option>
          <option>Q2</option>
          <option>Q3</option>
          <option>Q4</option>
        </select>
      </label>
      <label>Difficulty
        <select name="difficulty">
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
        </select>
      </label>
      <label>Project type
        <select name="type">
          <option>Solo</option>
          <option>Team</option>
        </select>
      </label>
    </div>

    <label class="checkline"><input type="checkbox" name="jam" /><span>Game jam build</span></label>
    <label class="checkline"><input type="checkbox" name="featured" /><span>Mark as featured</span></label>

    <label>Tech list (comma separated)
      <input name="tech" placeholder="Godot, VS Code" />
    </label>

    <label>Tags (comma separated)
      <input name="tags" placeholder="puzzle, horror, synth" />
    </label>

    <label>Short description
      <input name="shortDescription" maxlength="180" placeholder="One-line hook" required />
    </label>

    <label>Long description
      <textarea name="longDescription" rows="5" required></textarea>
    </label>

    <label>Visibility
      <select name="visibility">
        <option value="public" ${DEFAULT_VISIBILITY === "public" ? "selected" : ""}>public</option>
        <option value="private" ${DEFAULT_VISIBILITY === "private" ? "selected" : ""}>private</option>
      </select>
    </label>

    <label class="checkline"><input type="checkbox" name="teacherMode" checked /><span>Teacher mode for generated tutorial</span></label>

    <label>Project ZIP file
      <input type="file" name="projectZip" accept=".zip,application/zip" required />
    </label>

    <button type="submit">Publish + Add to Hub</button>
  </form>
</section>`;
}

function renderDashboard(session, flash = "") {
  const flashBlock = flash ? `<section class="panel"><p>${flash}</p></section>` : "";
  const pendingCount = loadPendingItems().length;
  const showcasePanel = `<section class="panel">
    <h2>Student Showcase Uploads</h2>
    <p>Share <code>/student-upload</code> with your class on the classroom WiFi so students can submit games, 3D models, Pivot animations, photos, TinkerCAD links, and more.</p>
    <p><a href="/review">Review Queue${pendingCount ? ` <span class="pill warn">${pendingCount} pending</span>` : ""}</a> &middot; <a href="/student-upload">Open Student Upload Form</a> &middot; ${LOGOUT_LINK_HTML}</p>
  </section>`;
  return pageShell("Upload Dashboard", `${flashBlock}${showcasePanel}${renderUploadForm(session)}`);
}

function renderResult(title, lines, links) {
  const logLines = lines.map((line) => escapeHtml(line)).join("\n");
  const linkHtml = links.length
    ? `<section class="panel"><h2>Links</h2><ul>${links
        .map(
          (item) =>
            `<li><strong>${escapeHtml(item.label)}:</strong> <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.url)}</a></li>`
        )
        .join("")}</ul></section>`
    : "";
  return pageShell(
    title,
    `${linkHtml}<section class="panel"><h2>Log</h2><pre>${logLines}</pre></section><section class="panel"><p><a href="/dashboard">Back to dashboard</a></p></section>`
  );
}

function renderAdminLogin(nextUrl, error) {
  const safeNext = nextUrl && nextUrl.startsWith("/") ? nextUrl : "/review";
  return pageShell(
    "Teacher Sign-In",
    `<section class="panel">
      <h2>Enter the teacher password</h2>
      ${error ? `<p style="color:var(--error);font-weight:600;">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="/admin/login" class="stack">
        <input type="hidden" name="next" value="${escapeHtml(safeNext)}" />
        <label>Password
          <input type="password" name="password" autofocus required autocomplete="current-password" />
        </label>
        <button type="submit">Sign In</button>
      </form>
    </section>`
  );
}

async function handleAdminLoginPost(req, res) {
  const fields = await readUrlEncodedFields(req, 4096);
  const password = String(fields.password || "");
  const next = String(fields.next || "/review");

  if (password !== ADMIN_PASSWORD) {
    sendHtml(res, 401, renderAdminLogin(next, "Incorrect password. Try again."));
    return;
  }

  const token = crypto.randomBytes(24).toString("hex");
  adminSessions.add(token);
  res.writeHead(302, {
    Location: next.startsWith("/") ? next : "/review",
    "Set-Cookie": `${ADMIN_SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Strict`,
  });
  res.end();
}

async function handleAdminLogout(req, res) {
  const token = parseCookies(req)[ADMIN_SESSION_COOKIE];
  if (token) adminSessions.delete(token);
  res.writeHead(302, {
    Location: "/admin/login",
    "Set-Cookie": `${ADMIN_SESSION_COOKIE}=; Path=/; Max-Age=0`,
  });
  res.end();
}

const LOGOUT_LINK_HTML = `<form method="post" action="/admin/logout" style="display:inline;"><button type="submit" style="background:none;border:none;color:var(--accent);text-decoration:underline;cursor:pointer;padding:0;font:inherit;">Log out</button></form>`;

function renderStudentUploadForm(flash = "") {
  const flashBlock = flash ? `<section class="panel"><p>${flash}</p></section>` : "";
  const body = `${flashBlock}<section class="panel">
  <h2>Submit Your Project to the Showcase</h2>
  <p>Pick what kind of project you made, fill in a few details, and attach your file(s). Mr. Scandrett will review it before it goes live.</p>
  <form method="post" action="/student-upload" enctype="multipart/form-data" class="stack" id="student-upload-form">
    <label>Your name
      <input name="studentName" placeholder="Ava R" required maxlength="60" />
    </label>

    <label>Class / period (optional)
      <input name="classPeriod" placeholder="3rd Period" maxlength="40" />
    </label>

    <label>What did you make?
      <select name="kind" id="kind-select" required>
        <option value="">Choose one...</option>
        <option value="game">Game or App (pick your folder, zip it, or upload a .sb3 / .html)</option>
        <option value="model">3D Model (.stl or .obj)</option>
        <option value="animation">Pivot Stick-Figure Animation (.piv or .stk)</option>
        <option value="photo">Photo of My Invention</option>
        <option value="link">TinkerCAD Circuit or Other Online Project (paste a link)</option>
        <option value="other">Something Else Cool</option>
      </select>
    </label>

    <label>Project title
      <input name="title" placeholder="My Robot Arm" required maxlength="80" />
    </label>

    <label>Tell us about it (optional)
      <textarea name="description" rows="3" maxlength="600" placeholder="What does it do? How did you make it?"></textarea>
    </label>

    <label id="url-field" hidden>Link to your project
      <input name="url" type="url" placeholder="https://www.tinkercad.com/things/..." maxlength="500" />
    </label>

    <label id="files-field">
      <span id="files-label">File(s)</span>
      <input type="file" name="files" id="files-input" />
    </label>
    <p id="files-hint" class="hint"></p>

    <label id="folder-field" hidden>
      <span>...or pick your whole project folder (no zip needed)</span>
      <input type="file" id="folder-input" webkitdirectory directory multiple />
    </label>
    <p id="folder-hint" class="hint" hidden>Works in Chrome / Edge on a computer or Chromebook. On an iPad, use the zip option above instead (Files app can compress a folder for you).</p>

    <button type="submit" id="submit-btn">Submit for Review</button>
  </form>
</section>
<script>
  (function () {
    var HINTS = {
      game: { accept: ".zip,.sb3,.html,.htm", multiple: false, label: "Zip your project folder, or upload a .sb3 / .html file", hint: "One file only. If your game has multiple files (HTML + CSS + JS + images), zip the whole folder first." },
      model: { accept: ".stl,.obj,.mtl,.png,.jpg,.jpeg,.gif,.bmp,.webp,.svg,.tga", multiple: true, label: "3D model file(s)", hint: "Upload your .stl or .obj. If it's an .obj with a texture, also select the .mtl and image files (up to 6 files)." },
      animation: { accept: ".piv,.stk,.webm,.mp4,.gif,.mov", multiple: true, label: "Pivot file + preview video (optional)", hint: "Upload your .piv/.stk file. Export a video or GIF from Pivot too, so it can play in the browser (up to 2 files)." },
      photo: { accept: "image/*", multiple: true, label: "Photo(s)", hint: "Up to 6 photos of your invention." },
      link: { accept: "image/*", multiple: false, label: "Screenshot (optional)", hint: "A screenshot helps your project look good on the showcase, but is not required." },
      other: { accept: "", multiple: false, label: "File", hint: "PDF, audio, video, Minecraft world, Arduino sketch, and more are welcome. Ask your teacher if you're not sure." },
    };
    var form = document.getElementById("student-upload-form");
    var kindSelect = document.getElementById("kind-select");
    var urlField = document.getElementById("url-field");
    var urlInput = urlField.querySelector("input");
    var filesInput = document.getElementById("files-input");
    var filesLabel = document.getElementById("files-label");
    var filesHint = document.getElementById("files-hint");
    var filesField = document.getElementById("files-field");
    var folderField = document.getElementById("folder-field");
    var folderInput = document.getElementById("folder-input");
    var folderHint = document.getElementById("folder-hint");
    var submitBtn = document.getElementById("submit-btn");

    function sync() {
      var kind = kindSelect.value;
      var cfg = HINTS[kind];
      var isLink = kind === "link";
      urlField.hidden = !isLink;
      urlInput.required = isLink;

      var isGame = kind === "game";
      folderField.hidden = !isGame;
      folderHint.hidden = !isGame;
      if (!isGame) {
        folderInput.value = "";
      }

      if (!cfg) {
        filesField.hidden = true;
        filesInput.required = false;
        return;
      }
      filesField.hidden = false;
      filesInput.required = !isLink && folderInput.files.length === 0;
      filesInput.accept = cfg.accept;
      if (cfg.multiple) filesInput.setAttribute("multiple", "multiple");
      else filesInput.removeAttribute("multiple");
      filesLabel.textContent = cfg.label;
      filesHint.textContent = cfg.hint;
    }
    kindSelect.addEventListener("change", sync);

    // Picking a folder and picking a zip/file are alternatives — clear the other one so
    // there's no ambiguity about which the student meant to submit.
    folderInput.addEventListener("change", function () {
      if (folderInput.files.length > 0) filesInput.value = "";
      sync();
    });
    filesInput.addEventListener("change", function () {
      if (filesInput.files.length > 0) folderInput.value = "";
      sync();
    });

    form.addEventListener("submit", function (event) {
      if (folderInput.files.length === 0) return; // normal file/zip path: let the browser submit natively
      event.preventDefault();

      var formData = new FormData();
      Array.from(form.elements).forEach(function (el) {
        if (!el.name || el.type === "file") return;
        if ((el.type === "radio" || el.type === "checkbox") && !el.checked) return;
        formData.append(el.name, el.value);
      });
      Array.from(folderInput.files).forEach(function (file) {
        formData.append("files", file, file.webkitRelativePath || file.name);
      });

      submitBtn.disabled = true;
      submitBtn.textContent = "Uploading...";
      fetch(form.action, { method: "POST", body: formData })
        .then(function (res) { return res.text(); })
        .then(function (html) {
          document.open();
          document.write(html);
          document.close();
        })
        .catch(function () {
          alert("Upload failed. Check your connection and try again.");
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit for Review";
        });
    });

    sync();
  })();
</script>`;
  return pageShell("Submit to the Showcase", body);
}

function renderStudentThankYou() {
  return pageShell(
    "Thanks!",
    `<section class="panel"><p>Your project was submitted. Mr. Scandrett will check it out and add it to the showcase soon.</p>
    <p><a href="/student-upload">Submit another project</a></p></section>`
  );
}

function formatTimestamp(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch (_) {
    return iso;
  }
}

function renderPendingCard(item) {
  const meta = item.meta;
  const label = KIND_LABELS[meta.kind] || meta.kind;
  const previewFile = (meta.files || []).find((f) => /\.(png|jpe?g|gif|webp)$/i.test(f.storedName));
  const previewHtml = previewFile
    ? `<img src="/pending-file/${encodeURIComponent(item.id)}/${encodeURIComponent(previewFile.storedName)}" alt="" style="max-width:220px;max-height:160px;border-radius:10px;border:1px solid var(--line);display:block;margin-bottom:8px;" />`
    : "";
  const fileListHtml = (meta.files || [])
    .map((f) => `<li>${escapeHtml(f.originalName)}</li>`)
    .join("");

  return `<section class="panel">
    <p class="pill">${escapeHtml(label)}</p>
    <p><em>Submitted as</em> <strong>${escapeHtml(meta.title)}</strong> by ${escapeHtml(meta.studentName)}${meta.classPeriod ? ` &middot; ${escapeHtml(meta.classPeriod)}` : ""} &middot; ${escapeHtml(formatTimestamp(meta.submittedAt))}</p>
    ${previewHtml}
    ${fileListHtml ? `<ul>${fileListHtml}</ul>` : ""}

    <form method="post" action="/review/approve" enctype="multipart/form-data" class="stack">
      <input type="hidden" name="id" value="${escapeHtml(item.id)}" />
      <label>Title
        <input name="title" value="${escapeHtml(meta.title)}" required maxlength="80" />
      </label>
      <div class="stack" style="grid-template-columns: 1fr 1fr;">
        <label>Student name
          <input name="studentName" value="${escapeHtml(meta.studentName)}" required maxlength="60" />
        </label>
        <label>Class / period
          <input name="classPeriod" value="${escapeHtml(meta.classPeriod || "")}" maxlength="40" />
        </label>
      </div>
      <label>Description
        <textarea name="description" rows="3" maxlength="600">${escapeHtml(meta.description || "")}</textarea>
      </label>
      ${meta.kind === "link" ? `<label>Link URL
        <input name="url" type="url" value="${escapeHtml(meta.url || "")}" maxlength="500" />
      </label>` : ""}
      <label>Custom thumbnail (optional — overrides the auto-generated one)
        <input type="file" name="thumbnail" accept="image/*" />
      </label>
      <div style="display:flex;gap:10px;">
        <button type="submit">Approve &amp; Publish</button>
      </div>
    </form>
    <form method="post" action="/review/reject" onsubmit="return confirm('Reject and delete this submission?');" style="margin-top:8px;">
      <input type="hidden" name="id" value="${escapeHtml(item.id)}" />
      <button type="submit" style="background:linear-gradient(180deg,#d9503f 0%,#b42318 100%);border-color:#8f1c13;">Reject</button>
    </form>
  </section>`;
}

function loadPendingItems() {
  const ids = fs.existsSync(PENDING_DIR) ? fs.readdirSync(PENDING_DIR) : [];
  const items = [];
  for (const id of ids) {
    const metaPath = path.join(PENDING_DIR, id, "meta.json");
    if (!fs.existsSync(metaPath)) continue;
    const meta = readJson(metaPath, null);
    if (!meta) continue;
    items.push({ id, meta });
  }
  items.sort((a, b) => new Date(a.meta.submittedAt) - new Date(b.meta.submittedAt));
  return items;
}

function renderReviewQueue(flash = "") {
  const items = loadPendingItems();
  const flashBlock = flash ? `<section class="panel"><p>${flash}</p></section>` : "";
  const toolbar = `<section class="panel"><p><a href="/dashboard">Dashboard</a> &middot; ${LOGOUT_LINK_HTML}</p></section>`;
  const list = items.length
    ? items.map(renderPendingCard).join("")
    : `<section class="panel"><p>No pending submissions. Share <code>/student-upload</code> with your class.</p></section>`;
  return pageShell("Showcase Review Queue", `${flashBlock}${toolbar}${list}`);
}

function commandExists(cmd) {
  // unzip has no --version flag (exits non-zero), only -v; check both.
  for (const flag of ["--version", "-v"]) {
    const result = spawnSync(cmd, [flag], { encoding: "utf8" });
    if (!result.error && result.status === 0) return true;
  }
  return false;
}

function ensureBinaryChecks() {
  if (!commandExists("git")) throw new Error("git is not installed.");
  if (!commandExists("gh")) throw new Error("GitHub CLI (gh) is not installed. Install with: brew install gh");
  if (!commandExists("unzip")) throw new Error("unzip is required to extract ZIP files.");
  const auth = spawnSync("gh", ["auth", "status"], { encoding: "utf8" });
  if (auth.status !== 0) throw new Error("GitHub CLI not authenticated. Run: gh auth login");
}

function hasZipSignature(buf) {
  return buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b;
}

function hasGlbSignature(buf) {
  // GLB files start with 'glTF' magic number (0x46546C67)
  return buf.length >= 12 &&
         buf[0] === 0x67 && buf[1] === 0x6c &&
         buf[2] === 0x54 && buf[3] === 0x46;
}

function findProjectRoot(dir) {
  const rootIndex = path.join(dir, "index.html");
  if (fs.existsSync(rootIndex)) {
    return { projectRoot: dir, note: "index.html found at ZIP root" };
  }

  const topEntries = fs.readdirSync(dir, { withFileTypes: true });
  const topDirs = topEntries.filter((e) => e.isDirectory()).map((e) => path.join(dir, e.name));
  if (topDirs.length === 1 && fs.existsSync(path.join(topDirs[0], "index.html"))) {
    return { projectRoot: topDirs[0], note: "index.html found in single top-level folder" };
  }

  const hits = [];
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "node_modules") continue;
        walk(full);
      } else if (entry.name.toLowerCase() === "index.html") {
        hits.push(path.dirname(full));
      }
    }
  }
  walk(dir);

  if (hits.length === 1) return { projectRoot: hits[0], note: "index.html found in nested folder" };
  throw new Error("Could not identify a single project root containing index.html");
}

function runPublish(projectRoot, opts) {
  const args = [
    PUBLISH_SCRIPT,
    "--projectPath",
    projectRoot,
    "--repoName",
    opts.repoName,
    "--githubOwner",
    opts.githubOwner,
    "--visibility",
    opts.visibility,
    "--branch",
    "main",
  ];
  if (opts.teacherMode) args.push("--teacherMode");

  const result = spawnSync("node", args, { cwd: ROOT_DIR, encoding: "utf8" });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  const lines = output.split(/\r?\n/).filter(Boolean);
  if (result.status !== 0) {
    const err = new Error("Publishing failed.");
    err.lines = lines;
    throw err;
  }

  let live = "";
  let tutorial = "";
  lines.forEach((line) => {
    if (line.startsWith("LIVE LINK:")) live = line.replace("LIVE LINK:", "").trim();
    if (line.startsWith("TUTORIAL LINK:")) tutorial = line.replace("TUTORIAL LINK:", "").trim();
  });

  return { lines, live, tutorial };
}

function parseCsvList(value) {
  const parts = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).slice(0, 12);
}

function ensurePlaceholderSvg(absPath, title, subtitle, width, height, a, b, c) {
  if (fs.existsSync(absPath)) return;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">\n  <defs>\n    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">\n      <stop offset="0%" stop-color="${a}"/>\n      <stop offset="60%" stop-color="${b}"/>\n      <stop offset="100%" stop-color="${c}"/>\n    </linearGradient>\n  </defs>\n  <rect width="${width}" height="${height}" fill="url(#g)"/>\n  <rect x="${Math.round(width * 0.07)}" y="${Math.round(height * 0.67)}" width="${Math.round(width * 0.68)}" height="${Math.round(height * 0.19)}" rx="14" fill="rgba(8,15,25,0.42)"/>\n  <text x="${Math.round(width * 0.1)}" y="${Math.round(height * 0.76)}" fill="#f4f8ff" font-size="${Math.round(height * 0.07)}" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${escapeHtml(title)}</text>\n  <text x="${Math.round(width * 0.1)}" y="${Math.round(height * 0.83)}" fill="#d3e8ff" font-size="${Math.round(height * 0.045)}" font-family="Segoe UI, Arial, sans-serif">${escapeHtml(subtitle)}</text>\n</svg>\n`;
  fs.writeFileSync(absPath, svg, "utf8");
}

function safeGit(args) {
  return spawnSync("git", args, { cwd: ROOT_DIR, encoding: "utf8" });
}

function appendProjectAndPublishHubEntry(meta, publishResult) {
  const hub = readJson(HUB_DATA_FILE, { projects: [] });
  if (!Array.isArray(hub.projects)) hub.projects = [];

  let id = sanitizeSlug(meta.repoName || meta.projectTitle, "project");
  const taken = new Set(hub.projects.map((p) => p.id));
  if (taken.has(id)) id = `${id}-${String(Date.now()).slice(-6)}`;

  const thumbRel = `assets/thumbs/${id}.svg`;
  const heroRel = `assets/heroes/${id}.svg`;
  ensurePlaceholderSvg(path.join(ROOT_DIR, thumbRel), meta.projectTitle, meta.category, 640, 360, "#1c3557", "#2c6f9f", "#7ecbff");
  ensurePlaceholderSvg(path.join(ROOT_DIR, heroRel), meta.projectTitle, meta.ownerAlias, 1200, 675, "#31204d", "#4c4d98", "#8ac4ff");

  const entry = {
    id,
    title: meta.projectTitle,
    student: meta.ownerAlias,
    year: meta.year,
    term: meta.term,
    program: meta.program,
    category: meta.category,
    type: meta.type,
    jam: meta.jam,
    difficulty: meta.difficulty,
    tech: meta.tech.length ? meta.tech : ["VS Code"],
    tags: meta.tags,
    thumbnail: thumbRel,
    hero: heroRel,
    short_description: meta.shortDescription,
    long_description: meta.longDescription,
    links: {
      repo: `https://github.com/${GITHUB_OWNER}/${meta.repoName}`,
      play: publishResult.live || "",
      video: "",
    },
    gallery: [],
    featured: meta.featured,
    date_added: new Date().toISOString().slice(0, 10),
  };

  hub.projects.unshift(entry);
  writeJson(HUB_DATA_FILE, hub);

  const warnings = [];
  const add = safeGit(["add", "data/projects.json", thumbRel, heroRel]);
  if (add.status !== 0) {
    warnings.push("Could not stage hub files with git.");
    return { entry, warnings };
  }

  const diff = safeGit(["diff", "--cached", "--quiet"]);
  if (diff.status !== 1) return { entry, warnings };

  const commit = safeGit([
    "-c",
    "user.name=MrScandrett",
    "-c",
    "user.email=mrscandrett@users.noreply.github.com",
    "commit",
    "-m",
    `Add project listing: ${id}`,
  ]);
  if (commit.status !== 0) {
    warnings.push("Could not commit hub listing automatically.");
    return { entry, warnings };
  }

  const push = safeGit(["push", "origin", "main"]);
  if (push.status !== 0) {
    warnings.push("Could not push hub listing to origin/main.");
  }

  return { entry, warnings };
}

function serveStatic(req, res) {
  const file = req.url === "/static/style.css" ? "style.css" : "";
  if (!file) return false;
  const abs = path.join(STATIC_DIR, file);
  if (!fs.existsSync(abs)) {
    res.writeHead(404);
    res.end("Not found");
    return true;
  }
  res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
  res.end(fs.readFileSync(abs));
  return true;
}

function buildRepoName(ownerAlias, repoNameInput) {
  if (String(repoNameInput || "").trim()) {
    return sanitizeSlug(repoNameInput, `${REPO_PREFIX}project`);
  }
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return sanitizeSlug(`${REPO_PREFIX}${ownerAlias}-${stamp}`, `${REPO_PREFIX}project-${stamp}`);
}

async function handleUpload(req, res) {
  ensureBinaryChecks();

  const contentType = req.headers["content-type"] || "";
  if (!/multipart\/form-data/i.test(contentType)) {
    throw new Error("Expected multipart form upload.");
  }
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = ((boundaryMatch && (boundaryMatch[1] || boundaryMatch[2])) || "").trim();
  if (!boundary) throw new Error("Missing upload boundary.");

  const body = await readBody(req, MAX_UPLOAD_BYTES);
  const parsed = parseMultipart(body, boundary);

  const ownerAlias = normalizeUsername(parsed.fields.ownerAlias || "") || "project";
  const projectTitle = String(parsed.fields.projectTitle || "").trim();
  if (!projectTitle) throw new Error("Project title is required.");

  const visibility = String(parsed.fields.visibility || DEFAULT_VISIBILITY).toLowerCase();
  if (!["public", "private"].includes(visibility)) {
    throw new Error("Visibility must be public or private.");
  }

  const year = Number(parsed.fields.year || new Date().getFullYear());
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new Error("Year must be between 2020 and 2100.");
  }

  const zipFile = parsed.files.projectZip;
  if (!zipFile) throw new Error("Missing project ZIP file.");
  if (!hasZipSignature(zipFile.data)) throw new Error("Uploaded file is not a valid ZIP.");

  const repoName = buildRepoName(ownerAlias, parsed.fields.repoName || "");

  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const zipPath = path.join(UPLOADS_DIR, `${ownerAlias}-${stamp}.zip`);
  const extractDir = path.join(WORK_DIR, `${ownerAlias}-${stamp}`);

  try {
    fs.mkdirSync(extractDir, { recursive: true });
    fs.writeFileSync(zipPath, zipFile.data);

    const unzip = spawnSync("unzip", ["-o", zipPath, "-d", extractDir], { encoding: "utf8" });
    if (unzip.status !== 0) {
      throw new Error(`Failed to unzip project: ${(unzip.stderr || unzip.stdout || "").trim()}`);
    }

    const scan = findProjectRoot(extractDir);
    const publishResult = runPublish(scan.projectRoot, {
      repoName,
      githubOwner: GITHUB_OWNER,
      visibility,
      teacherMode: parsed.fields.teacherMode === "on",
    });

    const entryResult = appendProjectAndPublishHubEntry(
      {
        ownerAlias,
        repoName,
        projectTitle,
        year,
        term: String(parsed.fields.term || "Q1").trim(),
        program: String(parsed.fields.program || "Independent").trim(),
        category: String(parsed.fields.category || "Web").trim(),
        type: String(parsed.fields.type || "Solo").trim(),
        jam: parsed.fields.jam === "on",
        difficulty: String(parsed.fields.difficulty || "Beginner").trim(),
        tech: parseCsvList(parsed.fields.tech || ""),
        tags: parseCsvList(parsed.fields.tags || ""),
        shortDescription: String(parsed.fields.shortDescription || "").trim() || "New project upload.",
        longDescription: String(parsed.fields.longDescription || "").trim() || "Uploaded via classroom portal.",
        featured: parsed.fields.featured === "on",
      },
      publishResult
    );

    const notes = [
      `[PORTAL] Mode: ${ACCESS_MODE}`,
      `[PORTAL] Owner alias: ${ownerAlias}`,
      `[PORTAL] Repo: ${GITHUB_OWNER}/${repoName}`,
      `[PORTAL] Root detection: ${scan.note}`,
      `[PORTAL] Hub entry id: ${entryResult.entry.id}`,
    ];
    entryResult.warnings.forEach((warn) => notes.push(`[PORTAL WARN] ${warn}`));

    const links = [];
    if (publishResult.live) links.push({ label: "Live Link", url: publishResult.live });
    if (publishResult.tutorial) links.push({ label: "Tutorial Link", url: publishResult.tutorial });
    links.push({ label: "Hub Home", url: `https://${GITHUB_OWNER.toLowerCase()}.github.io/` });

    sendHtml(res, 200, renderResult("Publish Complete", [...notes, ...publishResult.lines], links));
  } finally {
    fs.rmSync(zipPath, { force: true });
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
}

async function handleUploadModel(req, res) {
  const contentType = req.headers["content-type"] || "";
  if (!/multipart\/form-data/i.test(contentType)) {
    throw new Error("Expected multipart form upload.");
  }
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = ((boundaryMatch && (boundaryMatch[1] || boundaryMatch[2])) || "").trim();
  if (!boundary) throw new Error("Missing upload boundary.");

  const body = await readBody(req, MAX_MODEL_BYTES);
  const parsed = parseMultipart(body, boundary);

  const studentName = normalizeUsername(parsed.fields.studentName || "") || "student";
  const modelTitle = String(parsed.fields.modelTitle || "").trim();
  if (!modelTitle) throw new Error("Model title is required.");

  const description = String(parsed.fields.description || "").trim() || "Uploaded via Virtual Reality Museum.";
  const artifactType = String(parsed.fields.artifact || "artifact").trim();
  if (!["artifact", "landmark", "animal", "other"].includes(artifactType)) {
    throw new Error("Invalid artifact type.");
  }
  const source = String(parsed.fields.source || "").trim() || "Student upload";
  const sourceUrl = String(parsed.fields.sourceUrl || "").trim();
  const license = String(parsed.fields.license || "").trim() || "Not specified";
  const scaleMultiplier = Number(parsed.fields.scaleMultiplier || "1");
  if (!Number.isFinite(scaleMultiplier) || scaleMultiplier < 0.1 || scaleMultiplier > 5) {
    throw new Error("Scale multiplier must be between 0.1 and 5.");
  }

  const glbFile = parsed.files.glbFile;
  if (!glbFile) throw new Error("Missing GLB file.");
  if (!hasGlbSignature(glbFile.data)) throw new Error("Uploaded file is not a valid GLB.");
  if (glbFile.data.length > MAX_MODEL_BYTES) throw new Error("Model file exceeds 50MB limit.");

  const timestamp = Date.now();
  const titleSlug = normalizeModelSlug(modelTitle);
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const filename = `${timestamp}-${studentName}-${titleSlug}.glb`;
  const modelPath = path.join(MUSEUM_MODELS_DIR, filename);
  const modelUrl = `apps/virtual-reality-museum/models/${filename}`;

  try {
    fs.writeFileSync(modelPath, glbFile.data);

    const museumData = JSON.parse(fs.readFileSync(MUSEUM_DATA_FILE, "utf8"));
    const modelId = `${artifactType}-${timestamp}-${randomSuffix}`;
    const entry = {
      id: modelId,
      title: modelTitle,
      student: studentName,
      description,
      artifact_type: artifactType,
      file: modelUrl,
      source,
      source_url: sourceUrl,
      license,
      scaleMultiplier,
      date_uploaded: new Date().toISOString().split("T")[0],
    };
    museumData.models.push(entry);
    fs.writeFileSync(MUSEUM_DATA_FILE, JSON.stringify(museumData, null, 2));

    const notes = [
      `[MUSEUM] Model uploaded successfully`,
      `[MUSEUM] Student: ${studentName}`,
      `[MUSEUM] Title: ${modelTitle}`,
      `[MUSEUM] Type: ${artifactType}`,
      `[MUSEUM] File: ${filename}`,
      `[MUSEUM] Model ID: ${modelId}`,
    ];

    const links = [
      { label: "Virtual Reality Museum", url: "/apps/virtual-reality-museum/" },
      { label: "Upload Another", url: "/lessons/virtual-reality-museum-upload.html" },
    ];

    sendHtml(res, 200, renderResult("Museum Model Uploaded", notes, links));
  } catch (err) {
    fs.rmSync(modelPath, { force: true });
    throw err;
  }
}

async function handleStudentUpload(req, res) {
  const contentType = req.headers["content-type"] || "";
  if (!/multipart\/form-data/i.test(contentType)) {
    throw new Error("Expected multipart form upload.");
  }
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = ((boundaryMatch && (boundaryMatch[1] || boundaryMatch[2])) || "").trim();
  if (!boundary) throw new Error("Missing upload boundary.");

  const body = await readBody(req, MAX_STUDENT_UPLOAD_BYTES);
  const parsed = parseMultipart(body, boundary);

  const studentName = String(parsed.fields.studentName || "").trim().slice(0, 60);
  if (!studentName) throw new Error("Please enter your name.");

  const classPeriod = String(parsed.fields.classPeriod || "").trim().slice(0, 40);
  const kind = String(parsed.fields.kind || "").trim().toLowerCase();
  if (!KIND_LABELS[kind]) throw new Error("Please choose a project type.");

  const title = String(parsed.fields.title || "").trim().slice(0, 80);
  if (!title) throw new Error("Please enter a project title.");

  const description = String(parsed.fields.description || "").trim().slice(0, 600);
  const url = String(parsed.fields.url || "").trim().slice(0, 500);

  const uploadedFiles = parsed.fileLists.files || [];
  const isFolderMode = kind === "game" && uploadedFiles.some((f) => f.rawFilename && f.rawFilename.includes("/"));

  if (kind === "link") {
    if (!/^https?:\/\//i.test(url)) {
      throw new Error("Please paste a valid link starting with http:// or https://");
    }
  } else if (uploadedFiles.length === 0) {
    throw new Error("Please attach at least one file, or pick your project folder.");
  }

  let folderRelativePaths = null;
  if (isFolderMode) {
    if (uploadedFiles.length > MAX_FOLDER_FILES) {
      throw new Error(`That folder has too many files (max ${MAX_FOLDER_FILES}). Remove extra files and try again.`);
    }
    const normalized = uploadedFiles.map((f) => normalizeRelativePath(f.rawFilename));
    if (normalized.some((p) => !p)) {
      throw new Error("One of the selected files has an invalid path. Please try again.");
    }
    folderRelativePaths = stripCommonTopFolder(normalized);
    for (let i = 0; i < uploadedFiles.length; i++) {
      const ext = path.extname(folderRelativePaths[i]).toLowerCase();
      if (!WEB_FOLDER_EXTENSIONS.has(ext)) {
        throw new Error(`"${uploadedFiles[i].filename}" isn't an allowed file type for a game folder. Ask your teacher if you think this is a mistake.`);
      }
    }
    const hasIndex = folderRelativePaths.some((p) => p.toLowerCase() === "index.html" || p.toLowerCase().endsWith("/index.html"));
    if (!hasIndex) {
      throw new Error("Your folder needs an index.html file at its top level so the browser knows what to open.");
    }
  } else {
    const maxFiles = KIND_MAX_FILES[kind] || 1;
    if (uploadedFiles.length > maxFiles) {
      throw new Error(`Too many files for this project type (max ${maxFiles}).`);
    }

    const allowedExtensions = KIND_EXTENSIONS[kind];
    for (const file of uploadedFiles) {
      const ext = path.extname(file.filename).toLowerCase();
      if (!allowedExtensions.has(ext)) {
        throw new Error(`"${file.filename}" isn't an allowed file type for ${KIND_LABELS[kind]}. Ask your teacher if you think this is a mistake.`);
      }
    }

    if (kind === "animation") {
      const sourceCount = uploadedFiles.filter((f) => [".piv", ".stk"].includes(path.extname(f.filename).toLowerCase())).length;
      if (sourceCount !== 1) throw new Error("Attach exactly one .piv or .stk animation file (plus an optional preview video).");
    }
    if (kind === "model") {
      const modelCount = uploadedFiles.filter((f) => [".stl", ".obj"].includes(path.extname(f.filename).toLowerCase())).length;
      if (modelCount !== 1) throw new Error("Attach exactly one .stl or .obj model file (other files like textures are optional).");
    }
  }

  const id = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const pendingDir = path.join(PENDING_DIR, id);
  fs.mkdirSync(pendingDir, { recursive: true });

  const fileMetas = uploadedFiles.map((file, index) => {
    const ext = path.extname(file.filename).toLowerCase();
    const storedName = `file-${index}${ext}`;
    fs.writeFileSync(path.join(pendingDir, storedName), file.data);
    return isFolderMode
      ? { originalName: file.filename, storedName, relativePath: folderRelativePaths[index] }
      : { originalName: file.filename, storedName };
  });

  const meta = {
    id,
    kind,
    studentName,
    classPeriod,
    title,
    description,
    url: kind === "link" ? url : "",
    files: fileMetas,
    submittedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(pendingDir, "meta.json"), JSON.stringify(meta, null, 2));

  sendHtml(res, 200, renderStudentThankYou());
}

const PENDING_FILE_MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
};

function servePendingFile(req, res) {
  const match = req.url.match(/^\/pending-file\/([^/]+)\/([^/?]+)/);
  if (!match) return false;
  const id = path.basename(decodeURIComponent(match[1]));
  const filename = path.basename(decodeURIComponent(match[2]));
  const filePath = path.join(PENDING_DIR, id, filename);
  if (!filePath.startsWith(PENDING_DIR) || !fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return true;
  }
  const ext = path.extname(filename).toLowerCase();
  res.writeHead(200, { "Content-Type": PENDING_FILE_MIME_TYPES[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

async function placeGameFiles(meta, pendingDir, projectDir) {
  const files = meta.files || [];
  if (files.length === 0) throw new Error("Missing game file.");

  // Folder-picker uploads: every file carries a relativePath computed at submit time. Reconstruct
  // the tree directly — no unzip needed, since the browser already sent the file structure.
  if (files.every((f) => f.relativePath)) {
    fs.mkdirSync(projectDir, { recursive: true });
    for (const file of files) {
      const destPath = path.join(projectDir, file.relativePath);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(path.join(pendingDir, file.storedName), destPath);
    }
    return;
  }

  const file = files[0];
  const ext = path.extname(file.originalName).toLowerCase();
  const srcPath = path.join(pendingDir, file.storedName);

  if (ext === ".zip") {
    if (!commandExists("unzip")) throw new Error("unzip is required to extract ZIP files.");
    const extractDir = path.join(WORK_DIR, `student-${Date.now()}`);
    fs.mkdirSync(extractDir, { recursive: true });
    try {
      const unzip = spawnSync("unzip", ["-o", srcPath, "-d", extractDir], { encoding: "utf8" });
      if (unzip.status !== 0) {
        throw new Error(`Failed to unzip project: ${(unzip.stderr || unzip.stdout || "").trim()}`);
      }
      const scan = findProjectRoot(extractDir);
      copyDirRecursiveSync(scan.projectRoot, projectDir);
    } finally {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
  } else if (ext === ".sb3") {
    fs.mkdirSync(projectDir, { recursive: true });
    fs.copyFileSync(srcPath, path.join(projectDir, `${toFileSlug(meta.title)}.sb3`));
  } else if (ext === ".html" || ext === ".htm") {
    fs.mkdirSync(projectDir, { recursive: true });
    fs.copyFileSync(srcPath, path.join(projectDir, "index.html"));
  } else {
    throw new Error(`Unsupported game file type: ${ext}`);
  }
}

function placeModelFiles(meta, pendingDir, projectDir) {
  fs.mkdirSync(projectDir, { recursive: true });
  const files = meta.files || [];
  const primary = files.find((f) => [".stl", ".obj"].includes(path.extname(f.originalName).toLowerCase()));
  if (!primary) throw new Error("Missing .stl/.obj model file.");

  // Rename only the primary model file to carry the student's title (build-showcase.js derives
  // the display title from this filename). Companion .mtl/texture files keep their original
  // names since the .obj's internal `mtllib` reference must still resolve to them.
  const primaryExt = path.extname(primary.originalName).toLowerCase();
  const primaryName = `${toFileSlug(meta.title)}${primaryExt}`;
  fs.copyFileSync(path.join(pendingDir, primary.storedName), path.join(projectDir, primaryName));

  for (const file of files) {
    if (file === primary) continue;
    fs.copyFileSync(path.join(pendingDir, file.storedName), path.join(projectDir, file.originalName));
  }
}

function placeAnimationFiles(meta, pendingDir, projectDir) {
  fs.mkdirSync(projectDir, { recursive: true });
  const files = meta.files || [];
  const sourceFile = files.find((f) => [".piv", ".stk"].includes(path.extname(f.originalName).toLowerCase()));
  if (!sourceFile) throw new Error("Missing .piv/.stk animation file.");
  const previewFile = files.find((f) => f !== sourceFile);

  // Source and preview share a basename (derived from the title) so build-showcase.js's
  // preview-pairing logic (which matches files by identical basename) finds them.
  const baseName = toFileSlug(meta.title);
  const sourceExt = path.extname(sourceFile.originalName).toLowerCase();
  fs.copyFileSync(path.join(pendingDir, sourceFile.storedName), path.join(projectDir, `${baseName}${sourceExt}`));

  if (previewFile) {
    const previewExt = path.extname(previewFile.originalName).toLowerCase();
    fs.copyFileSync(path.join(pendingDir, previewFile.storedName), path.join(projectDir, `${baseName}${previewExt}`));
  }
}

function placePhotoFiles(meta, pendingDir, projectDir) {
  fs.mkdirSync(projectDir, { recursive: true });
  const images = [];
  (meta.files || []).forEach((file, index) => {
    const ext = path.extname(file.originalName).toLowerCase();
    const destName = `photo-${index}${ext}`;
    fs.copyFileSync(path.join(pendingDir, file.storedName), path.join(projectDir, destName));
    images.push(destName);
  });
  const showcaseMeta = {
    kind: "photo",
    title: meta.title,
    student: meta.studentName,
    grade: meta.classPeriod,
    caption: meta.description,
    images,
  };
  fs.writeFileSync(path.join(projectDir, "showcase.json"), JSON.stringify(showcaseMeta, null, 2));
}

function placeLinkFiles(meta, pendingDir, projectDir) {
  fs.mkdirSync(projectDir, { recursive: true });
  const screenshotFile = (meta.files || [])[0];
  let screenshotName = "";
  if (screenshotFile) {
    const ext = path.extname(screenshotFile.originalName).toLowerCase();
    screenshotName = `screenshot${ext}`;
    fs.copyFileSync(path.join(pendingDir, screenshotFile.storedName), path.join(projectDir, screenshotName));
  }
  const provider = /tinkercad\.com/i.test(meta.url) ? "Tinkercad" : "Web";
  const showcaseMeta = {
    kind: "link",
    title: meta.title,
    student: meta.studentName,
    grade: meta.classPeriod,
    description: meta.description,
    url: meta.url,
    provider,
    screenshot: screenshotName || undefined,
  };
  fs.writeFileSync(path.join(projectDir, "showcase.json"), JSON.stringify(showcaseMeta, null, 2));
}

function placeOtherFile(meta, pendingDir, projectDir) {
  fs.mkdirSync(projectDir, { recursive: true });
  const file = (meta.files || [])[0];
  if (!file) throw new Error("Missing file.");
  fs.copyFileSync(path.join(pendingDir, file.storedName), path.join(projectDir, file.originalName));
  const showcaseMeta = {
    kind: "file",
    title: meta.title,
    student: meta.studentName,
    grade: meta.classPeriod,
    description: meta.description,
    filename: file.originalName,
  };
  fs.writeFileSync(path.join(projectDir, "showcase.json"), JSON.stringify(showcaseMeta, null, 2));
}

const MAX_APPROVE_BYTES = 15 * 1024 * 1024;

// build-showcase.js derives each app's slug from a `slugBase` that differs by kind:
//   - "game" web projects (zip/folder/html) -> the project folder's own basename
//   - "game" Scratch (.sb3), model, animation, and marker (photo/link/file) kinds -> "student-title"
// Both are deterministic from what we already know at approve time, so we can find the exact
// manifest row build-showcase.js just wrote without guessing from fuzzy title text.
function candidateManifestSlugs(kind, meta, projectDirName) {
  const studentTitleSlug = toFileSlug(`${meta.studentName}-${meta.title}`);
  if (kind === "game") return [toFileSlug(projectDirName), studentTitleSlug];
  return [studentTitleSlug];
}

function findManifestIndexBySlug(manifest, candidateSlugs) {
  if (!Array.isArray(manifest)) return -1;
  return manifest.findIndex((item) => item && candidateSlugs.includes(item.slug));
}

async function handleApprove(req, res) {
  if (!commandExists("git")) throw new Error("git is not installed.");

  const contentType = req.headers["content-type"] || "";
  if (!/multipart\/form-data/i.test(contentType)) {
    throw new Error("Expected multipart form submission.");
  }
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = ((boundaryMatch && (boundaryMatch[1] || boundaryMatch[2])) || "").trim();
  if (!boundary) throw new Error("Missing form boundary.");

  const body = await readBody(req, MAX_APPROVE_BYTES);
  const parsed = parseMultipart(body, boundary);

  const id = path.basename(String(parsed.fields.id || ""));
  const pendingDir = path.join(PENDING_DIR, id);
  const metaPath = path.join(pendingDir, "meta.json");
  if (!fs.existsSync(metaPath)) throw new Error("That submission no longer exists.");
  const originalMeta = readJson(metaPath, null);
  if (!originalMeta) throw new Error("Could not read submission metadata.");

  // Teacher edits from the review form override what the student originally typed.
  const editedTitle = String(parsed.fields.title || "").trim();
  const editedStudentName = String(parsed.fields.studentName || "").trim();
  const meta = {
    ...originalMeta,
    title: editedTitle || originalMeta.title,
    studentName: editedStudentName || originalMeta.studentName,
    classPeriod: String(parsed.fields.classPeriod || "").trim(),
    description: String(parsed.fields.description || "").trim(),
    url: originalMeta.kind === "link" ? (String(parsed.fields.url || "").trim() || originalMeta.url) : originalMeta.url,
  };
  if (!meta.title) throw new Error("Title cannot be blank.");
  if (!meta.studentName) throw new Error("Student name cannot be blank.");
  if (meta.kind === "link" && !/^https?:\/\//i.test(meta.url || "")) {
    throw new Error("Link URL must start with http:// or https://");
  }

  const studentDir = sanitizeDirName(meta.studentName, "Student");
  const projectDirName = `${sanitizeDirName(meta.title, "project")}-${id.slice(-6)}`;
  const projectDir = path.join(STUDENT_PROJECTS_DIR, studentDir, projectDirName);
  const notes = [];

  try {
    fs.rmSync(projectDir, { recursive: true, force: true });

    if (meta.kind === "game") {
      await placeGameFiles(meta, pendingDir, projectDir);
    } else if (meta.kind === "model") {
      placeModelFiles(meta, pendingDir, projectDir);
    } else if (meta.kind === "animation") {
      placeAnimationFiles(meta, pendingDir, projectDir);
    } else if (meta.kind === "photo") {
      placePhotoFiles(meta, pendingDir, projectDir);
    } else if (meta.kind === "link") {
      placeLinkFiles(meta, pendingDir, projectDir);
    } else if (meta.kind === "other") {
      placeOtherFile(meta, pendingDir, projectDir);
    } else {
      throw new Error(`Unknown submission kind: ${meta.kind}`);
    }

    notes.push(`[REVIEW] Placed files at student-projects/${path.relative(STUDENT_PROJECTS_DIR, projectDir)}`);

    const build = spawnSync("node", [BUILD_SHOWCASE_SCRIPT], { cwd: ROOT_DIR, encoding: "utf8" });
    const buildOutput = `${build.stdout || ""}${build.stderr || ""}`;
    notes.push(...buildOutput.split(/\r?\n/).filter(Boolean));
    if (build.status !== 0) {
      throw new Error("Showcase build failed. The submission was kept in the review queue so you can fix and retry.");
    }

    const gitPaths = ["student-projects", "apps"];
    const manifest = readJson(SHOWCASE_MANIFEST_PATH, []);
    const manifestIdx = findManifestIndexBySlug(manifest, candidateManifestSlugs(meta.kind, meta, projectDirName));
    let live = "";

    if (manifestIdx === -1) {
      notes.push("[REVIEW WARN] Could not find the manifest entry for this submission (title/thumbnail edits were not applied).");
    } else {
      live = manifest[manifestIdx].url;
      // The approved title always wins over whatever the build derived (e.g. an HTML <title>
      // tag baked into an uploaded game that doesn't match what's on the review form).
      if (manifest[manifestIdx].name !== meta.title) {
        manifest[manifestIdx].name = meta.title;
        notes.push(`[REVIEW] Showcase title set to "${meta.title}".`);
      }

      const thumbnailFile = parsed.files.thumbnail;
      if (thumbnailFile && thumbnailFile.data && thumbnailFile.data.length) {
        const thumbExt = path.extname(thumbnailFile.filename).toLowerCase() || ".png";
        const thumbDir = path.join(ROOT_DIR, "assets", "thumbs", "showcase");
        fs.mkdirSync(thumbDir, { recursive: true });
        const thumbFileName = `custom-${id}${thumbExt}`;
        fs.writeFileSync(path.join(thumbDir, thumbFileName), thumbnailFile.data);
        manifest[manifestIdx].thumbnail = `./assets/thumbs/showcase/${thumbFileName}`;
        gitPaths.push("assets/thumbs/showcase");
        notes.push("[REVIEW] Custom thumbnail applied.");
      }

      fs.writeFileSync(SHOWCASE_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
    }

    const add = safeGit(["add", "-A", "--", ...gitPaths]);
    if (add.status !== 0) notes.push("[REVIEW WARN] Could not stage files with git.");

    const diff = safeGit(["diff", "--cached", "--quiet"]);
    if (diff.status === 1) {
      const commit = safeGit([
        "-c", "user.name=MrScandrett",
        "-c", "user.email=mrscandrett@users.noreply.github.com",
        "commit", "-m", `Add student showcase project: ${meta.title} (${meta.studentName})`,
      ]);
      if (commit.status !== 0) {
        notes.push("[REVIEW WARN] Could not commit automatically.");
      } else {
        const push = safeGit(["push", "origin", "main"]);
        if (push.status !== 0) {
          notes.push("[REVIEW WARN] Could not push to origin/main. Push manually when ready.");
          live = "";
        }
      }
    } else {
      notes.push("[REVIEW] Nothing new to commit.");
    }

    fs.rmSync(pendingDir, { recursive: true, force: true });

    const links = [{ label: "Review Queue", url: "/review" }];
    if (live) links.push({ label: "Live Project", url: `https://${GITHUB_OWNER.toLowerCase()}.github.io/${live.replace(/^\.\//, "")}` });
    sendHtml(res, 200, renderResult("Published!", notes, links));
  } catch (error) {
    fs.rmSync(projectDir, { recursive: true, force: true });
    throw error;
  }
}

async function handleReject(req, res) {
  const fields = await readUrlEncodedFields(req, 4096);
  const id = path.basename(String(fields.id || ""));
  fs.rmSync(path.join(PENDING_DIR, id), { recursive: true, force: true });
  redirect(res, "/review");
}

async function handle(req, res) {
  if (rejectIfRemote(req, res)) return;

  if (req.url.startsWith("/static/")) {
    if (serveStatic(req, res)) return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ ok: true, studentUploadUrl: "/student-upload", time: new Date().toISOString() }));
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/admin/login")) {
    const params = new URL(req.url, "http://portal.local").searchParams;
    sendHtml(res, 200, renderAdminLogin(params.get("next") || "/review", ""));
    return;
  }

  if (req.method === "POST" && req.url === "/admin/login") {
    await handleAdminLoginPost(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/admin/logout") {
    await handleAdminLogout(req, res);
    return;
  }

  if (isAdminGatedPath(req.url)) {
    if (requireAdmin(req, res)) return;
  }

  if (req.method === "GET" && req.url.startsWith("/pending-file/")) {
    if (servePendingFile(req, res)) return;
  }

  if (req.method === "GET" && req.url === "/") {
    redirect(res, "/dashboard");
    return;
  }

  if (req.url === "/login" || req.url === "/register" || req.url === "/logout") {
    redirect(res, "/dashboard");
    return;
  }

  if (req.method === "GET" && req.url === "/dashboard") {
    sendHtml(res, 200, renderDashboard(OPEN_SESSION));
    return;
  }

  if (req.method === "POST" && req.url === "/upload") {
    await handleUpload(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/upload-model") {
    await handleUploadModel(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/student-upload") {
    sendHtml(res, 200, renderStudentUploadForm());
    return;
  }

  if (req.method === "POST" && req.url === "/student-upload") {
    await handleStudentUpload(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/review") {
    sendHtml(res, 200, renderReviewQueue());
    return;
  }

  if (req.method === "POST" && req.url === "/review/approve") {
    await handleApprove(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/review/reject") {
    await handleReject(req, res);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

ensureDirs();

const server = http.createServer((req, res) => {
  handle(req, res).catch((error) => {
    sendHtml(
      res,
      500,
      pageShell(
        "Server Error",
        `<section class="panel error"><pre>${escapeHtml(error.message)}</pre></section>`
      )
    );
  });
});

server.listen(PORT, PORTAL_HOST, () => {
  console.log(`Portal running on http://${PORTAL_HOST}:${PORT}`);
  console.log("Open dashboard: /dashboard");
  console.log(`GitHub owner target: ${GITHUB_OWNER}`);
  console.log(`Portal access mode: ${ACCESS_MODE}`);
});
